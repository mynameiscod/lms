/**
 * Admissions conversion report.
 *
 * DEFINITIONS (shown on the page too, so nobody guesses what a % means):
 *  - Cohort = leads CREATED in the date range (archived ones included — archiving is
 *    housekeeping, not an outcome). Every rate below is about that cohort.
 *  - A lead "reached" a milestone if Lead.milestones.<x>At is set. Those stamps are written
 *    once (first time) and never again, so a reopened lead is counted once, and a lead that
 *    jumped ahead counts for the steps it skipped (leadLifecycleService.milestoneStamps).
 *  - Step conversion = reached(next) / reached(previous). Overall = reached(x) / cohort.
 *  - Demo attended comes from a demo meeting marked attended (milestones.demoAttendedAt).
 *  - Duplicates are already one lead (dedupe by phone + re-enquiry), so not double counted.
 *  - Cost metrics use Meta spend synced for the same dates (AdSpendDaily), joined on the
 *    Meta campaign id, else the campaign name. Leads with no campaign are not costed.
 *  - Milestone dates only exist from the CRM redesign onward; leads that were moved before
 *    it show only their current stage — so older cohorts under-count earlier steps.
 */
import mongoose from 'mongoose';
import Lead from '../models/Lead';
import LeadStage from '../models/LeadStage';
import { milestoneFromLegacy } from '../config/leadMilestones';
import { getSpendByCampaign } from './metaAdSpendService';

export const FUNNEL_STEPS = [
  { key: 'created', label: 'Leads', field: null },
  { key: 'contacting', label: 'Contacted', field: 'contactingAt' },
  { key: 'connected', label: 'Connected', field: 'connectedAt' },
  { key: 'qualified', label: 'Qualified', field: 'qualifiedAt' },
  { key: 'demo', label: 'Demo', field: 'demoAt' },
  { key: 'demoAttended', label: 'Demo attended', field: 'demoAttendedAt' },
  { key: 'seatReserved', label: 'Seat reserved', field: 'seatReservedAt' },
  { key: 'enrolled', label: 'Enrolled', field: 'enrolledAt' },
] as const;

const MAX_COHORT = 50_000;
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : null);
const money = (n: number) => Math.round(n * 100) / 100;

export interface ReportInput { tenantId: string; from: Date; to: Date; scope: Record<string, any>; assignedTo?: string; source?: string }

export async function admissionsReport(input: ReportInput) {
  const { tenantId, from, to, scope } = input;
  const tid = new mongoose.Types.ObjectId(tenantId);
  const filter: any = { tenantId: tid, ...scope, createdAt: { $gte: from, $lte: to } };
  if (input.assignedTo && mongoose.Types.ObjectId.isValid(input.assignedTo)) filter.assignedTo = input.assignedTo;
  if (input.source) filter.source = String(input.source).slice(0, 60);

  const [leads, stages] = await Promise.all([
    Lead.find(filter).select('createdAt stageId assignedTo source milestones nextFollowUp telecallerMetrics.firstActionAt lastContactedAt sourceDetails.campaignName sourceDetails.metaCampaignId utmParams.campaign archivedAt')
      .populate('assignedTo', 'firstName lastName').limit(MAX_COHORT + 1).lean(),
    LeadStage.find({ tenantId: tid }).select('name milestone category isLostStage').lean(),
  ]);
  const truncated = leads.length > MAX_COHORT;
  const cohort = truncated ? leads.slice(0, MAX_COHORT) : leads;
  const stageMs = new Map(stages.map((s: any) => [String(s._id), milestoneFromLegacy(s)]));
  const reached = (l: any, field: string | null) => (field === null ? true : !!l.milestones?.[field]);

  // ── funnel ──
  const counts = FUNNEL_STEPS.map(s => ({ ...s, count: cohort.filter(l => reached(l, s.field)).length }));
  const funnel = counts.map((s, i) => ({
    key: s.key, label: s.label, count: s.count,
    ofCohort: pct(s.count, cohort.length),
    fromPrevious: i === 0 ? null : pct(s.count, counts[i - 1].count),
  }));
  const lost = cohort.filter(l => stageMs.get(String(l.stageId)) === 'lost').length;
  const nurture = cohort.filter(l => stageMs.get(String(l.stageId)) === 'nurture').length;

  // ── first contact speed (cohort) ──
  const firstContactHours = cohort
    .map(l => { const at = l.telecallerMetrics?.firstActionAt || l.milestones?.contactingAt; return at ? (new Date(at).getTime() - new Date(l.createdAt).getTime()) / 3600_000 : null; })
    .filter((h): h is number => h !== null && h >= 0)
    .sort((a, b) => a - b);
  const median = firstContactHours.length ? firstContactHours[Math.floor(firstContactHours.length / 2)] : null;
  const within1h = pct(firstContactHours.filter(h => h <= 1).length, cohort.length);

  // ── counsellors ──
  const byOwner = new Map<string, { name: string; leads: number; contacted: number; qualified: number; enrolled: number }>();
  for (const l of cohort) {
    const u: any = l.assignedTo;
    const key = u?._id ? String(u._id) : 'unassigned';
    const row = byOwner.get(key) || { name: u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown' : 'Unassigned', leads: 0, contacted: 0, qualified: 0, enrolled: 0 };
    row.leads++;
    if (reached(l, 'contactingAt')) row.contacted++;
    if (reached(l, 'qualifiedAt')) row.qualified++;
    if (reached(l, 'enrolledAt')) row.enrolled++;
    byOwner.set(key, row);
  }
  const counsellors = [...byOwner.entries()].map(([id, r]) => ({
    id, ...r, contactRate: pct(r.contacted, r.leads), qualifyRate: pct(r.qualified, r.leads), enrolRate: pct(r.enrolled, r.leads),
  })).sort((a, b) => b.leads - a.leads);

  // ── campaigns + cost ──
  type Spend = Awaited<ReturnType<typeof getSpendByCampaign>>[number];
  const spend: Spend[] = await getSpendByCampaign(tenantId, from, to).catch(() => [] as Spend[]);
  const spendById = new Map<string, Spend>(spend.map(s => [s.campaignId, s] as [string, Spend]));
  const spendByName = new Map<string, Spend>(spend.map(s => [s.campaignName.toLowerCase(), s] as [string, Spend]));
  const byCampaign = new Map<string, { campaignId?: string; name: string; leads: number; qualified: number; enrolled: number }>();
  for (const l of cohort) {
    const id = l.sourceDetails?.metaCampaignId;
    const name = l.sourceDetails?.campaignName || l.utmParams?.campaign;
    if (!id && !name) continue;
    const key = id || `name:${String(name).toLowerCase()}`;
    const row = byCampaign.get(key) || { campaignId: id, name: name || id, leads: 0, qualified: 0, enrolled: 0 };
    row.leads++;
    if (reached(l, 'qualifiedAt')) row.qualified++;
    if (reached(l, 'enrolledAt')) row.enrolled++;
    byCampaign.set(key, row);
  }
  const usedSpend = new Set<string>();
  const campaigns = [...byCampaign.values()].map(c => {
    const s = (c.campaignId && spendById.get(c.campaignId)) || spendByName.get(String(c.name).toLowerCase());
    if (s) usedSpend.add(s.campaignId);
    const sp = s?.spend ?? null;
    return {
      ...c, spend: sp,
      costPerLead: sp !== null && c.leads ? money(sp / c.leads) : null,
      costPerQualified: sp !== null && c.qualified ? money(sp / c.qualified) : null,
      costPerEnrolment: sp !== null && c.enrolled ? money(sp / c.enrolled) : null,
      qualifyRate: pct(c.qualified, c.leads),
    };
  }).sort((a, b) => b.leads - a.leads);
  // Spend on campaigns that brought no leads in this cohort still counts toward totals.
  for (const s of spend) if (!usedSpend.has(s.campaignId)) campaigns.push({ campaignId: s.campaignId, name: s.campaignName, leads: 0, qualified: 0, enrolled: 0, spend: s.spend, costPerLead: null, costPerQualified: null, costPerEnrolment: null, qualifyRate: null });
  const totalSpend = spend.reduce((a, s) => a + s.spend, 0);
  const paidLeads = campaigns.reduce((a, c) => a + (c.spend !== null ? c.leads : 0), 0);
  const paidQualified = campaigns.reduce((a, c) => a + (c.spend !== null ? c.qualified : 0), 0);
  const paidEnrolled = campaigns.reduce((a, c) => a + (c.spend !== null ? c.enrolled : 0), 0);

  // ── current state of open leads (not the cohort): aging + follow-up SLA ──
  const closedStageIds = stages.filter((s: any) => ['lost', 'enrolled'].includes(milestoneFromLegacy(s))).map((s: any) => s._id);
  const openFilter: any = { tenantId: tid, ...scope, archivedAt: null, stageId: { $nin: closedStageIds } };
  if (filter.assignedTo) openFilter.assignedTo = filter.assignedTo;
  if (filter.source) openFilter.source = filter.source;
  const now = Date.now(); const day = 86_400_000;
  const [open, overdue, noFollowUp, a1, a7, a30] = await Promise.all([
    Lead.countDocuments(openFilter),
    Lead.countDocuments({ ...openFilter, nextFollowUp: { $lt: new Date(now) } }),
    Lead.countDocuments({ ...openFilter, nextFollowUp: null }),
    Lead.countDocuments({ ...openFilter, createdAt: { $gte: new Date(now - day) } }),
    Lead.countDocuments({ ...openFilter, createdAt: { $gte: new Date(now - 7 * day), $lt: new Date(now - day) } }),
    Lead.countDocuments({ ...openFilter, createdAt: { $gte: new Date(now - 30 * day), $lt: new Date(now - 7 * day) } }),
  ]);

  return {
    range: { from, to },
    cohort: cohort.length, truncated,
    funnel, lost, nurture,
    firstContact: { medianHours: median !== null ? Math.round(median * 10) / 10 : null, within1hPct: within1h, contactedCount: firstContactHours.length },
    counsellors,
    campaigns,
    cost: {
      spend: money(totalSpend),
      costPerLead: paidLeads ? money(totalSpend / paidLeads) : null,
      costPerQualified: paidQualified ? money(totalSpend / paidQualified) : null,
      costPerEnrolment: paidEnrolled ? money(totalSpend / paidEnrolled) : null,
      hasSpend: spend.length > 0,
    },
    open: { total: open, overdue, noFollowUp, overduePct: pct(overdue, open), aging: { under1d: a1, d1to7: a7, d7to30: a30, over30: Math.max(0, open - a1 - a7 - a30) } },
  };
}
