import { Request, Response } from 'express';
import mongoose from 'mongoose';
import InterviewPlan, { IInterviewPlan, PLAN_BOUNDS, ROUND_TYPES, ROUND_TYPE_LABEL, DEFAULT_PLAN_SHAPE } from '../models/InterviewPlan';
import PassportInterview from '../models/PassportInterview';
import AiUsage from '../models/AiUsage';
import User from '../models/User';
import { AudienceMember } from '../models/memberAudience';
import { normalizePlanInput, resolvePlan, validatePlans, planTotals } from '../services/interviewPlanService';
import { istToday, ymd } from '../utils/planSchedule';

/**
 * Admin CRUD for interview plans, plus the two things that make the screen trustworthy:
 * how many members each plan actually governs, and what it will cost.
 *
 * NOTHING HERE CHANGES A LIVE INTERVIEW YET. The runtime still uses its own constants; this
 * is the configuration surface and the preview of what those plans would do. resolvePlan()
 * is the same function the runtime will call when it is wired in, so what an admin sees here
 * is what they will get.
 */

const tenantOf = (req: Request): string => String((req as any).user?.tenantId || (req as any).tenantId || '');

/** The canonical "is a CareerPilot member" filter, same as the members screen. */
const MEMBER_FILTER = (tenantId: string) => ({ tenantId, 'passport.product': { $exists: true, $ne: null } });

/**
 * The AiUsage modules that make up one mock interview's bill.
 *
 * MATCHED WITH `product: 'careerpilot'`, WHICH IS NOT OPTIONAL. interviewTemplateService
 * drives the LMS's own scheduled interviews through the SAME interviewAIService functions,
 * so `interview_turn` and `interview_evaluation` rows exist for both products. Without the
 * product filter this would divide two products' spend by one product's sitting count and
 * report a cost per interview that is simply too high.
 */
const INTERVIEW_SPEND_MODULES = ['interview_turn', 'interview_evaluation', 'careerpilot_interview_tts'];
const INTERVIEW_SPEND_PRODUCT = 'careerpilot';
const SPEND_WINDOW_DAYS = 30;
/** Below this, an average is noise rather than a measurement, so we decline to state one. */
const MIN_SPEND_SAMPLE = 3;

const audienceMemberOf = (u: any): AudienceMember => ({
  yearOfStudy:   u?.passport?.yearOfStudy,
  degree:        u?.passport?.degree,
  program:       u?.passport?.program,
  branch:        u?.passport?.branch,
  primaryRole:   u?.passport?.primaryRole,
  secondaryRole: u?.passport?.secondaryRole,
  stage:         u?.passport?.stage,
});

const publicPlan = (p: any) => ({
  id: String(p._id),
  name: p.name,
  active: p.active,
  fallback: p.fallback,
  priority: p.priority,
  audience: {
    years:    p.audience?.years || [],
    courses:  p.audience?.courses || [],
    branches: p.audience?.branches || [],
    roles:    p.audience?.roles || [],
    stages:   p.audience?.stages || [],
  },
  rounds: (p.rounds || []).map((r: any) => ({ type: r.type, label: r.label || '', questions: r.questions, minutes: r.minutes })),
  quota: { perThirtyDays: p.quota?.perThirtyDays ?? 0, cooldownHours: p.quota?.cooldownHours ?? 0 },
  notes: p.notes || '',
  totals: planTotals(p.rounds),
});

const loadPlans = (tenantId: string) =>
  InterviewPlan.find({ tenantId }).sort({ priority: -1, createdAt: 1 }).lean() as any as Promise<IInterviewPlan[]>;

/**
 * What one interview has actually cost over the last 30 days, from the ledger.
 *
 * MEASURED, NOT ESTIMATED. A quota is a spending decision, and the number an admin needs to
 * make it is what this tenant's interviews really cost — not a figure someone worked out
 * once from a price list that has since moved. Returns null when too few sittings have
 * happened to average over, so the screen can say "not enough data" rather than quote noise.
 */
async function observedCostPerInterview(tenantId: string): Promise<{ costInr: number | null; sample: number }> {
  const to = istToday();
  const from = new Date(to);
  from.setDate(from.getDate() - (SPEND_WINDOW_DAYS - 1));

  // AiUsage.tenantId is an ObjectId; PassportInterview.tenantId is a string. Both are the
  // same tenant, and getting that wrong returns a confident zero.
  const usageTenant = mongoose.isValidObjectId(tenantId) ? new mongoose.Types.ObjectId(tenantId) : null;
  if (!usageTenant) return { costInr: null, sample: 0 };

  const [spend, sittings] = await Promise.all([
    AiUsage.aggregate([
      { $match: {
        tenantId: usageTenant, product: INTERVIEW_SPEND_PRODUCT,
        module: { $in: INTERVIEW_SPEND_MODULES }, date: { $gte: ymd(from), $lte: ymd(to) },
      } },
      { $group: { _id: null, costInr: { $sum: '$costInr' } } },
    ]),
    // The same definition the quota uses: a sitting the member actually engaged with. An
    // opened-and-abandoned session cost a turn call and belongs in the average.
    PassportInterview.countDocuments({
      tenantId,
      createdAt: { $gte: from },
      'transcript.role': 'candidate',
    }),
  ]);

  const total = spend[0]?.costInr || 0;
  if (sittings < MIN_SPEND_SAMPLE || total <= 0) return { costInr: null, sample: sittings };
  return { costInr: +(total / sittings).toFixed(2), sample: sittings };
}

/**
 * GET /passport/interview-plans — every plan, plus what it governs and what it costs.
 *
 * `members` is how many members each plan WINS, not how many match its audience. Those are
 * different numbers whenever plans overlap, and the second one is the misleading one: three
 * plans could each claim 400 of 500 members and an admin would have no idea which one a
 * given student actually gets.
 */
export const list = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const [plans, members, cost] = await Promise.all([
      loadPlans(tenantId),
      User.find(MEMBER_FILTER(tenantId)).select('passport.yearOfStudy passport.degree passport.program passport.branch passport.primaryRole passport.secondaryRole passport.stage').lean(),
      observedCostPerInterview(tenantId),
    ]);

    /**
     * Resolved in memory, one member at a time.
     *
     * audienceServes() compares case- and padding-insensitively against values typed by
     * admins and chosen by students, which no index can do — and getting it "efficiently"
     * wrong in the database would show an admin a plan reaching a group it does not.
     */
    const won = new Map<string, number>();
    let onDefault = 0;
    for (const m of members) {
      const r = resolvePlan(plans, audienceMemberOf(m));
      if (r.plan) won.set(String(r.plan._id), (won.get(String(r.plan._id)) || 0) + 1);
      else onDefault += 1;
    }

    res.json({
      plans: plans.map(p => ({ ...publicPlan(p), members: won.get(String(p._id)) || 0 })),
      warnings: validatePlans(plans),
      totals: { members: members.length, onDefault },
      cost: { perInterviewInr: cost.costInr, sample: cost.sample, windowDays: SPEND_WINDOW_DAYS },
      bounds: PLAN_BOUNDS,
      roundTypes: ROUND_TYPES.map(t => ({ key: t, label: ROUND_TYPE_LABEL[t] })),
      defaultShape: { rounds: DEFAULT_PLAN_SHAPE.rounds, totals: planTotals(DEFAULT_PLAN_SHAPE.rounds) },
    });
  } catch (e: any) {
    console.error('[passport] interview plans list:', e);
    res.status(500).json({ message: e.message || 'Could not load interview plans' });
  }
};

/** POST /passport/interview-plans */
export const create = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const input = normalizePlanInput(req.body);
    // New plans go on top of the stack rather than at priority 0, where they would sit
    // under everything and appear to do nothing.
    if (req.body?.priority === undefined) {
      const top = await InterviewPlan.findOne({ tenantId }).sort({ priority: -1 }).select('priority').lean() as any;
      input.priority = Math.min(PLAN_BOUNDS.priority.max, (top?.priority || 0) + 10);
    }
    const plan = await InterviewPlan.create({ tenantId, ...input });
    res.json({ plan: publicPlan(plan) });
  } catch (e: any) {
    console.error('[passport] interview plan create:', e);
    res.status(500).json({ message: e.message || 'Could not create the plan' });
  }
};

/** PUT /passport/interview-plans/:id */
export const update = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const input = normalizePlanInput(req.body);
    const plan = await InterviewPlan.findOneAndUpdate(
      { _id: req.params.id, tenantId }, { $set: input }, { new: true },
    );
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    res.json({ plan: publicPlan(plan) });
  } catch (e: any) {
    console.error('[passport] interview plan update:', e);
    res.status(500).json({ message: e.message || 'Could not save the plan' });
  }
};

/** DELETE /passport/interview-plans/:id */
export const remove = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const r = await InterviewPlan.deleteOne({ _id: req.params.id, tenantId });
    if (!r.deletedCount) return res.status(404).json({ message: 'Plan not found' });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not delete the plan' });
  }
};

/**
 * PUT /passport/interview-plans/reorder — the whole running order in one write.
 *
 * Priorities are rewritten from the submitted order rather than patched one plan at a time:
 * a drag that saved four separate priorities could leave the list half-reordered if one call
 * failed, and the half-applied order is a config nobody chose.
 */
export const reorder = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : [];
    if (!ids.length) return res.status(400).json({ message: 'No order given.' });

    // Descending, spaced by 10, so a later hand-typed priority can be slotted between two
    // without renumbering the list.
    const ops = ids.map((id, i) => ({
      updateOne: { filter: { _id: id, tenantId }, update: { $set: { priority: (ids.length - i) * 10 } } },
    }));
    await InterviewPlan.bulkWrite(ops as any);
    const plans = await loadPlans(tenantId);
    res.json({ plans: plans.map(publicPlan), warnings: validatePlans(plans) });
  } catch (e: any) {
    console.error('[passport] interview plan reorder:', e);
    res.status(500).json({ message: e.message || 'Could not save the order' });
  }
};

/**
 * GET /passport/interview-plans/preview?studentId=… — which plan one member gets, and why
 * the others lost.
 *
 * The answer to "why is this student getting three questions" without reading the priority
 * list and simulating it by hand — which is where an admin gives up and files a bug.
 */
export const preview = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = String(req.query.studentId || '');
    if (!mongoose.isValidObjectId(studentId)) return res.status(400).json({ message: 'Choose a student first.' });

    const [user, plans] = await Promise.all([
      User.findOne({ _id: studentId, tenantId }).select('firstName lastName email passport').lean() as any,
      loadPlans(tenantId),
    ]);
    if (!user) return res.status(404).json({ message: 'Student not found' });

    const member = audienceMemberOf(user);
    const r = resolvePlan(plans, member);
    res.json({
      student: {
        id: String(user._id),
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
        year: member.yearOfStudy || '', course: member.degree || member.program || '',
        branch: member.branch || '', role: member.primaryRole || '', stage: member.stage || '',
      },
      plan: r.plan ? publicPlan(r.plan) : null,
      rounds: r.rounds,
      quota: r.quota,
      totals: planTotals(r.rounds),
      trace: r.trace,
    });
  } catch (e: any) {
    console.error('[passport] interview plan preview:', e);
    res.status(500).json({ message: e.message || 'Could not preview' });
  }
};
