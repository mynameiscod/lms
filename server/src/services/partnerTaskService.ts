import axios from 'axios';
import mongoose from 'mongoose';
import * as settings from './settingsService';
import PartnerTask, { PartnerTaskKind } from '../models/PartnerTask';
import { IPlacementPartner } from '../models/PlacementPartner';

/**
 * Creates reminders for placement partners and mirrors them to Todoist.
 * Gracefully degrades: with no TODOIST_API_TOKEN it still records the task
 * locally (todoistId empty) so nothing breaks and dedupe still works.
 */

async function createTodoistTask(tenantId: string, content: string, description?: string, dueDate?: string): Promise<string> {
  const token = settings.getStr('TODOIST_API_TOKEN', '', tenantId);
  if (!token) return '';
  try {
    const body: any = { content };
    if (description) body.description = description;
    if (dueDate) body.due_date = dueDate; // YYYY-MM-DD
    const r = await axios.post('https://api.todoist.com/rest/v2/tasks', body, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      timeout: 10_000,
    });
    return String(r.data?.id || '');
  } catch (err: any) {
    console.error('[TODOIST] create task failed:', err?.response?.data || err?.message);
    return '';
  }
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Create a partner reminder (deduped by partner+kind among still-open tasks).
 * `dueInDays` defaults to "today".
 */
export async function createPartnerTask(
  partner: IPlacementPartner,
  kind: PartnerTaskKind,
  content: string,
  opts: { description?: string; dueInDays?: number; userId?: string; dedupeWindowDays?: number } = {}
): Promise<void> {
  const tenantId = partner.tenantId.toString();
  // Dedupe: by recent createdAt window (for recurring reminders), else by open task.
  if (opts.dedupeWindowDays) {
    const since = new Date(Date.now() - opts.dedupeWindowDays * 24 * 60 * 60 * 1000);
    const recent = await PartnerTask.findOne({ tenantId: partner.tenantId, partnerId: partner._id, kind, createdAt: { $gte: since } });
    if (recent) return;
  } else {
    const existing = await PartnerTask.findOne({ tenantId: partner.tenantId, partnerId: partner._id, kind, open: true });
    if (existing) return;
  }

  const due = new Date();
  due.setDate(due.getDate() + (opts.dueInDays ?? 0));
  const todoistId = await createTodoistTask(tenantId, content, opts.description, ymd(due));

  await PartnerTask.create({
    tenantId: partner.tenantId,
    partnerId: partner._id,
    kind,
    content,
    todoistId,
    dueAt: due,
    open: true,
    createdBy: opts.userId ? new mongoose.Types.ObjectId(opts.userId) : undefined,
  });
}
