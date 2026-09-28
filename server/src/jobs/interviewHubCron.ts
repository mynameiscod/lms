import mongoose from 'mongoose';
import { autoRemind } from '../services/interviewHubService';
import { tick as loopTick } from '../services/interviewHubLoopService';

/**
 * Interview Hub, hourly: prep packs before each placement drive, the invite to share after it,
 * and the nudge — email (free) anyone who was invited to share an
 * interview two days ago and has not. One reminder per invite; after that the admin sees it
 * as overdue. Nothing is blocked.
 */
async function tick() {
  if (mongoose.connection.readyState !== 1) return;
  const sent = await autoRemind();
  if (sent) console.log(`[interview-hub] ${sent} invite reminder(s) emailed`);
  // Prep packs before each drive and the invite to share after it.
  const r = await loopTick();
  if (r.packs || r.invites) console.log(`[interview-hub] ${r.packs} prep pack(s), ${r.invites} auto invite(s)`);
}

export function startInterviewHubScheduler() {
  setTimeout(() => { tick().catch(() => undefined); }, 90_000);
  setInterval(() => { tick().catch((e) => console.error('[interview-hub] tick', e?.message)); }, 60 * 60_000);
  console.log('📅 Interview Hub scheduler started (hourly invite reminders)');
}
