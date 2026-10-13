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
  /** Stage a lead moves to the moment it is sent to Outpero ("With Outpero"); empty = leave it where it is. */
  sentStageId: string;
  /** Hours a lead may wait for Outpero's result before it is given to a person anyway. */
  fallbackHours: number;
  /** Listen to each answered call's recording and write a full summary from it. */
  callAnalysis: boolean;
}
/** Outpero calls between 9 AM and 8 PM India time. */
export const CALL_FROM_HOUR = 9;
export const CALL_TO_HOUR = 20;
export function inCallingWindow(now: number = Date.now()): boolean {
  const hour = new Date(now + 330 * 60_000).getUTCHours();
  return hour >= CALL_FROM_HOUR && hour < CALL_TO_HOUR;
}
export function getPolicy(tenantId: string): OutperoPolicy {
  let stageMapping: OutperoPolicy['stageMapping'] = {};
  try { const parsed = JSON.parse(settings.getStr('OUTPERO_STAGE_MAPPING', '{}', tenantId)); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) stageMapping = parsed; } catch { /* old invalid setting */ }
  return {
    // On unless an admin switched it off: a lead sent to Outpero waits for the call result before it gets an owner.
    enabled: settings.getStr('OUTPERO_FEEDBACK_ENABLED', 'true', tenantId) !== 'false',
    assignmentTiming: settings.getStr('OUTPERO_ASSIGNMENT_TIMING', 'after_call', tenantId) === 'on_creation' ? 'on_creation' : 'after_call',
    maxCallAttempts: Math.max(1, Math.min(5, Number(settings.getStr('OUTPERO_MAX_CALL_ATTEMPTS', '3', tenantId)) || 3)),
    retryGapMinutes: Math.max(30, Math.min(1440, Number(settings.getStr('OUTPERO_RETRY_GAP_MINUTES', '120', tenantId)) || 120)),
    stageMapping,
    sentStageId: settings.getStr('OUTPERO_SENT_STAGE', '', tenantId),
    fallbackHours: Math.max(1, Math.min(168, Number(settings.getStr('OUTPERO_FALLBACK_HOURS', '24', tenantId)) || 24)),
    callAnalysis: settings.getStr('OUTPERO_CALL_ANALYSIS', 'true', tenantId) !== 'false',
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
    no_answer: 'no_answer', missed: 'no_answer', no_response: 'no_answer', noresponse: 'no_answer', call_failed: 'no_answer', not_answered: 'no_answer', busy: 'no_answer', voicemail: 'no_answer', failed: 'no_answer', not_connected: 'no_answer',
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
  const fallbackHours = input.fallbackHours === undefined ? 24 : input.fallbackHours;
  if (!Number.isInteger(fallbackHours) || fallbackHours < 1 || fallbackHours > 168) throw new Error('Choose 1-168 hours to wait for Outpero before assigning.');
  const sentStageId = input.sentStageId ? String(input.sentStageId) : '';
  const mapping: Record<string, string> = {};
  const LeadStage = (await import('../models/LeadStage')).default;
  for (const key of OUTCOMES) {
    const id = input.stageMapping?.[key];
    if (!id) continue;
    if (!mongoose.isValidObjectId(id) || !await LeadStage.exists({ _id: id, tenantId, isActive: true })) throw new Error(`Choose an active stage for ${key}.`);
    mapping[key] = String(id);
  }
  if (sentStageId && (!mongoose.isValidObjectId(sentStageId) || !await LeadStage.exists({ _id: sentStageId, tenantId, isActive: true }))) throw new Error('Choose an active stage for leads sent to Outpero.');
  await settings.setMany([
    { key: 'OUTPERO_MAX_CALL_ATTEMPTS', value: String(input.maxCallAttempts) },
    { key: 'OUTPERO_RETRY_GAP_MINUTES', value: String(input.retryGapMinutes) },
    { key: 'OUTPERO_FEEDBACK_ENABLED', value: String(input.enabled) },
    { key: 'OUTPERO_ASSIGNMENT_TIMING', value: input.assignmentTiming },
    { key: 'OUTPERO_STAGE_MAPPING', value: JSON.stringify(mapping) },
    { key: 'OUTPERO_SENT_STAGE', value: sentStageId },
    { key: 'OUTPERO_FALLBACK_HOURS', value: String(fallbackHours) },
    ...(typeof input.callAnalysis === 'boolean' ? [{ key: 'OUTPERO_CALL_ANALYSIS', value: String(input.callAnalysis) }] : []),
  ], userId, tenantId);
  return getPolicy(tenantId);
}
