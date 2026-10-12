import mongoose from 'mongoose';
import * as settings from './settingsService';

export const OUTCOMES = ['interested', 'callback', 'demo', 'no_answer', 'not_interested', 'wrong_number', 'opt_out', 'needs_review'] as const;
export type OutperoOutcome = typeof OUTCOMES[number];
export interface OutperoPolicy {
  enabled: boolean;
  assignmentTiming: 'on_creation' | 'after_call';
  maxCallAttempts: number;
  retryGapMinutes: number;
  stageMapping: Partial<Record<OutperoOutcome, string>>;
}
export function getPolicy(tenantId: string): OutperoPolicy {
  let stageMapping: OutperoPolicy['stageMapping'] = {};
  try { const parsed = JSON.parse(settings.getStr('OUTPERO_STAGE_MAPPING', '{}', tenantId)); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) stageMapping = parsed; } catch { /* old invalid setting */ }
  return {
    enabled: settings.getStr('OUTPERO_FEEDBACK_ENABLED', 'false', tenantId) === 'true',
    assignmentTiming: settings.getStr('OUTPERO_ASSIGNMENT_TIMING', 'on_creation', tenantId) === 'after_call' ? 'after_call' : 'on_creation',
    maxCallAttempts: Math.max(1, Math.min(5, Number(settings.getStr('OUTPERO_MAX_CALL_ATTEMPTS', '3', tenantId)) || 3)),
    retryGapMinutes: Math.max(30, Math.min(1440, Number(settings.getStr('OUTPERO_RETRY_GAP_MINUTES', '120', tenantId)) || 120)),
    stageMapping,
  };
}
/** Only leads actually eligible for automatic calling wait for feedback. */
export function waitsForOutpero(lead: any, tenantId: string): boolean {
  const p = getPolicy(tenantId);
  if (!p.enabled || p.assignmentTiming !== 'after_call') return false;
  if (lead.outpero?.status === 'pending' || lead.outpero?.status === 'sent') return true;
  if (settings.getStr('OUTPERO_MODE', 'off', tenantId) !== 'auto') return false;
  if (!settings.getStr('OUTPERO_ENDPOINT_URL', '', tenantId) || !settings.getStr('OUTPERO_LEAD_SECRET', '', tenantId)) return false;
  const sources = settings.getStr('OUTPERO_SOURCES', '', tenantId).split(',').filter(Boolean);
  const courses = settings.getStr('OUTPERO_COURSES', '', tenantId).split(',').filter(Boolean);
  const interests = Array.isArray(lead.courseInterest) ? lead.courseInterest : [lead.courseInterest];
  return (!sources.length || sources.includes(lead.source)) && (!courses.length || interests.some((c: string) => courses.some(filter => String(c || '').toLowerCase().includes(filter.toLowerCase()))));
}
export function classifyOutcome(call: any): OutperoOutcome | null {
  const v = call.variables || {};
  const text = String(call.outcome || v.outcome || v.disposition || '').trim().toLowerCase().replace(/[ -]+/g, '_');
  const aliases: Record<string, OutperoOutcome> = {
    interested: 'interested', qualified: 'interested', wants_counselling: 'interested',
    callback: 'callback', callback_requested: 'callback', follow_up: 'callback',
    demo: 'demo', demo_requested: 'demo', demo_booked: 'demo',
    not_interested: 'not_interested', wrong_number: 'wrong_number', invalid_number: 'wrong_number',
    opt_out: 'opt_out', do_not_call: 'opt_out', do_not_contact: 'opt_out',
    no_answer: 'no_answer', not_answered: 'no_answer', busy: 'no_answer', voicemail: 'no_answer', failed: 'no_answer', not_connected: 'no_answer',
  };
  if (aliases[text] === 'opt_out' || aliases[text] === 'wrong_number' || aliases[text] === 'not_interested') return aliases[text];
  const present = (x: any) => x && !/^(null|none|no|unknown|n\/a|-)$/i.test(String(x));
  if (present(v.not_interested_reason)) return 'not_interested';
  if (present(v.demo_date) || present(v.demo_time)) return 'demo';
  if (present(v.callback_date) || present(v.callback_time) || /^(yes|true|1)$/i.test(String(v.counsellor_callback))) return 'callback';
  if (aliases[text]) return aliases[text];
  if (text) return 'needs_review';
  const status = String(call.status || '').toLowerCase().replace(/[ -]+/g, '_');
  if (aliases[status] === 'no_answer') return 'no_answer';
  // An unclassified completion may be followed by a classified delivery.
  if (call.summary) return 'needs_review';
  return null;
}
export async function savePolicy(tenantId: string, userId: string, input: any) {
  if (!input || typeof input.enabled !== 'boolean' || !['on_creation', 'after_call'].includes(input.assignmentTiming)) throw new Error('Choose a valid feedback policy and assignment timing.');
  if (!Number.isInteger(input.maxCallAttempts) || input.maxCallAttempts < 1 || input.maxCallAttempts > 5 || !Number.isInteger(input.retryGapMinutes) || input.retryGapMinutes < 30 || input.retryGapMinutes > 1440) throw new Error('Choose 1-5 call attempts and a retry gap of 30-1440 minutes.');
  const mapping: Record<string, string> = {};
  const LeadStage = (await import('../models/LeadStage')).default;
  for (const key of OUTCOMES) {
    const id = input.stageMapping?.[key];
    if (!id) continue;
    if (!mongoose.isValidObjectId(id) || !await LeadStage.exists({ _id: id, tenantId, isActive: true })) throw new Error(`Choose an active stage for ${key}.`);
    mapping[key] = String(id);
  }
  await settings.setMany([
    { key: 'OUTPERO_MAX_CALL_ATTEMPTS', value: String(input.maxCallAttempts) },
    { key: 'OUTPERO_RETRY_GAP_MINUTES', value: String(input.retryGapMinutes) },
    { key: 'OUTPERO_FEEDBACK_ENABLED', value: String(input.enabled) },
    { key: 'OUTPERO_ASSIGNMENT_TIMING', value: input.assignmentTiming },
    { key: 'OUTPERO_STAGE_MAPPING', value: JSON.stringify(mapping) },
  ], userId, tenantId);
  return getPolicy(tenantId);
}
