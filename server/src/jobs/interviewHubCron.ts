import mongoose from 'mongoose';
import { autoRemind } from '../services/interviewHubService';

/**
 * Interview Hub nudge: once an hour, email (free) anyone who was invited to share an
 * interview two days ago and has not. One reminder per invite; after that the admin sees it
 * as overdue. Nothing is blocked.
 */
async function tick() {
  if (mongoose.connection.readyState !== 1) return;
  const sent = await autoRemind();
  if (sent) console.log(`[interview-hub] ${sent} invite reminder(s) emailed`);
}

export function startInterviewHubScheduler() {
  setTimeout(() => { tick().catch(() => undefined); }, 90_000);
  setInterval(() => { tick().catch((e) => console.error('[interview-hub] tick', e?.message)); }, 60 * 60_000);
  console.log('📅 Interview Hub scheduler started (hourly invite reminders)');
}
