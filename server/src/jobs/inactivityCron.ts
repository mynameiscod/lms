import mongoose from 'mongoose';
import * as svc from '../services/studentRulesService';
import * as lifecycle from '../services/studentLifecycleService';
import { StudentRules } from '../models/StudentRules';

/**
 * Inactivity alerts (Student Rules): once a day, at each institute's chosen hour (IST), WhatsApp the
 * students, trainers and parents whose inactivity crossed a threshold. Each person is told once per
 * spell of inactivity (InactivityAlert), so a restart or a second run the same day sends nothing new.
 */

const lastRunDay = new Map<string, string>();
const istNow = () => new Date(Date.now() + 5.5 * 3600_000);

const accessRunDay = new Map<string, string>();
let pinnedDay = '';

/**
 * Access window upkeep, same schedule: pin first-join dates once a day (a student added by any path
 * gets lmsJoinedAt before a batch move can reset batchJoinedDate), and send "access ending"
 * WhatsApps for institutes that switched them on (Student Rules → Access; off by default).
 */
async function accessTick(now: Date, day: string) {
  if (pinnedDay !== day) {
    pinnedDay = day;
    try { const n = await lifecycle.pinJoinDates(); if (n) console.log(`[access] pinned first-join date for ${n} student(s)`); } catch (e: any) { console.error('[access] pin', e?.message); }
  }
  const rows = await StudentRules.find({ 'access.reminderEnabled': true }).select('tenantId inactivity.sendHourIst').lean<any[]>();
  for (const r of rows) {
    const tenantId = String(r.tenantId);
    if (accessRunDay.get(tenantId) === day) continue;
    if (now.getUTCHours() < (r.inactivity?.sendHourIst ?? 10)) continue;
    accessRunDay.set(tenantId, day);
    try {
      const res = await lifecycle.runAccessReminders(tenantId);
      if (res.sent || res.failed) console.log(`[access] ${tenantId}: reminders sent ${res.sent}, failed ${res.failed}, no phone ${res.skipped}`);
    } catch (e: any) { console.error('[access] reminders failed', tenantId, e?.message); }
  }
}

async function tick() {
  if (mongoose.connection.readyState !== 1) return;
  const now = istNow();
  const day = now.toISOString().slice(0, 10);
  await accessTick(now, day).catch((e) => console.error('[access] tick', e?.message));
  for (const tenantId of await svc.inactivityTenants()) {
    if (lastRunDay.get(tenantId) === day) continue;
    try {
      const r = await svc.getRules(tenantId, true);
      if (!r.inactivity.enabled) continue;
      if (now.getUTCHours() < r.inactivity.sendHourIst) continue;
      if (r.inactivity.skipSundays && now.getUTCDay() === 0) { lastRunDay.set(tenantId, day); continue; }
      lastRunDay.set(tenantId, day);
      const res = await svc.runInactivity(tenantId);
      console.log(`[inactivity] ${tenantId}: student ${res.student}, trainer ${res.trainer}, parent ${res.parent}, failed ${res.failed}`);
    } catch (e: any) {
      console.error('[inactivity] run failed', tenantId, e?.message);
    }
  }
}

export function startInactivityScheduler() {
  setTimeout(() => { tick().catch(() => undefined); }, 90_000);
  setInterval(() => { tick().catch((e) => console.error('[inactivity] tick', e?.message)); }, 10 * 60_000);
  console.log('📅 Inactivity alert scheduler started (daily, institute-chosen hour IST)');
}
