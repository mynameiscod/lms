import mongoose from 'mongoose';
import Tenant from '../models/Tenant';
import LeadStage from '../models/LeadStage';
import User from '../models/User';
import Batch from '../models/Batch';
import LeadSourceConfig from '../models/LeadSourceConfig';
import * as settings from './settingsService';
import { effectiveModules } from '../config/tenantModules';

/**
 * A new institute starts ready to use instead of with empty screens, and both its admin and the
 * platform administrator can see what is still to set up.
 *
 * Nothing used to be created for a new institute: no lead stages (lead conversion looks up a stage
 * named exactly "Converted"), no checklist — the Leads screens were unusable until someone found
 * the hidden "initialize stages" endpoint. Everything here is idempotent: it only adds what is
 * missing, so it is safe to run again on an existing institute.
 */

const oid = (id: string) => new mongoose.Types.ObjectId(id);

/** A short real pipeline (the Leads review); "Converted" is the name lead conversion looks for. */
export const STARTER_STAGES = [
  { name: 'New Lead', color: '#3B82F6', category: 'new', isDefault: true },
  { name: 'Contacted', color: '#8B5CF6', category: 'engaging' },
  { name: 'Interested', color: '#06B6D4', category: 'qualified' },
  { name: 'Counselling / Demo', color: '#0EA5E9', category: 'qualified' },
  { name: 'Seat Reserved', color: '#84CC16', category: 'negotiation' },
  { name: 'Converted', color: '#059669', category: 'converted', isFinal: true },
  { name: 'Not Interested', color: '#EF4444', category: 'lost', isLostStage: true, requiresReason: true },
  { name: 'Not Eligible', color: '#9CA3AF', category: 'lost', isLostStage: true },
];

/** Default setup for an institute. Adds only what is missing. */
export async function onboardTenant(tenantId: string) {
  const tid = oid(tenantId);
  const done: string[] = [];
  if ((await LeadStage.countDocuments({ tenantId: tid })) === 0) {
    await LeadStage.insertMany(STARTER_STAGES.map((s, i) => ({ ...s, order: i, isActive: true, tenantId: tid })));
    done.push('lead stages');
  }
  if (!(await LeadSourceConfig.exists({ tenantId: tid }))) {
    await LeadSourceConfig.create({ tenantId: tid }).then(() => done.push('lead source settings')).catch(() => { /* schema may require fields — optional */ });
  }
  return { added: done };
}

export interface ChecklistItem { key: string; label: string; done: boolean; required: boolean; link?: string; hint?: string }

/** What this institute still has to set up, in the order an admin should do it. */
export async function onboardingChecklist(tenantId: string): Promise<{ items: ChecklistItem[]; percent: number }> {
  const tid = oid(tenantId);
  const t: any = await Tenant.findById(tid).select('name logo branding modules adminId').lean();
  if (!t) throw new Error('Institute not found');
  const m = effectiveModules(t.modules);
  const [stages, students, batches, staff, wa] = await Promise.all([
    LeadStage.countDocuments({ tenantId: tid }),
    User.countDocuments({ tenantId: tid, role: 'STUDENT' }),
    Batch.countDocuments({ tenantId: tid }),
    User.countDocuments({ tenantId: tid, role: { $in: ['INSTRUCTOR', 'STAFF'] } }),
    LeadSourceConfig.findOne({ tenantId: tid }).select('whatsApp.isConnected').lean(),
  ]);
  const payments = !!settings.getCredentialSet(['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'], tenantId).RAZORPAY_KEY_SECRET;
  const ownEmail = settings.source('EMAIL_FROM', tenantId) === 'tenant';
  const needsPayments = m.feeManagement || m.placementProgram || m.hackathons;
  const needsWhatsapp = m.whatsapp || m.leads || m.placementProgram;

  const items: ChecklistItem[] = [
    { key: 'modules', label: 'Modules switched on', done: Object.values(m).some(Boolean), required: true, hint: 'Platform administrator → Tenant Management' },
    { key: 'branding', label: 'Logo and institute name', done: !!(t.logo || t.branding?.portalTitle), required: false, link: '/admin/branding' },
    { key: 'staff', label: 'Instructors / staff invited', done: staff > 0, required: false, link: '/users' },
    { key: 'batch', label: 'First batch created', done: batches > 0, required: m.courses || m.attendance, link: '/batches' },
    { key: 'students', label: 'Students added', done: students > 0, required: false, link: '/users' },
    ...(m.leads ? [{ key: 'stages', label: 'Lead pipeline stages', done: stages > 0, required: true, link: '/lead-stages' }] : []),
    ...(needsPayments ? [{ key: 'payments', label: 'Your Razorpay account (online payments)', done: payments, required: true, link: '/admin/integrations', hint: 'Without it, online payment stays off for your institute.' }] : []),
    ...(needsWhatsapp ? [{ key: 'whatsapp', label: 'Your WhatsApp Business number', done: !!(wa as any)?.whatsApp?.isConnected || settings.isPlatformOwner(tenantId), required: false, link: '/lead-sources', hint: 'Without it, no WhatsApp messages go out; login codes come by email.' }] : []),
    { key: 'email', label: 'Your own email sender', done: ownEmail || settings.isPlatformOwner(tenantId), required: false, link: '/admin/integrations', hint: 'Until then emails go from the platform sender.' },
  ];
  const req = items.filter((i) => i.required);
  const percent = Math.round((items.filter((i) => i.done).length / items.length) * 100);
  return { items: [...req, ...items.filter((i) => !i.required)], percent };
}
