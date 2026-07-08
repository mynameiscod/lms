import { Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import mongoose from 'mongoose';
import SpeakingTask from '../models/SpeakingTask';
import SpeakingSubmission from '../models/SpeakingSubmission';
import User from '../models/User';
import CurriculumEnrollment from '../models/CurriculumEnrollment';
import * as bunny from '../services/bunnyStorageService';
import { computeOccurrences, transcribeFile, evaluateSpeaking, promptForOccurrence, weekKey } from '../services/speakingService';

const tId = (req: Request) => (req as any).tenantId as string;
const uId = (req: Request) => (req as any).user?.id as string;

async function studentBatchIds(userId: string, tenantId: string): Promise<mongoose.Types.ObjectId[]> {
  const [user, enrolments] = await Promise.all([
    User.findById(userId).select('batchId').lean() as any,
    CurriculumEnrollment.find({ tenantId, studentId: userId }).select('batchId').lean() as any,
  ]);
  const ids = new Set<string>();
  if (user?.batchId) ids.add(String(user.batchId));
  (enrolments || []).forEach((e: any) => { if (e.batchId) ids.add(String(e.batchId)); });
  return [...ids].map((s) => new mongoose.Types.ObjectId(s));
}

// ─── Admin ───────────────────────────────────────────────────────────────────
export const createTask = async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    if (!b.title || !b.prompt) return res.status(400).json({ message: 'title and prompt are required' });
    const arr = (v: any) => (Array.isArray(v) ? v : typeof v === 'string' && v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);
    const task = await SpeakingTask.create({
      tenantId: tId(req), title: b.title, prompt: b.prompt, topics: arr(b.topics), instructions: b.instructions,
      batchIds: arr(b.batchIds).filter((s: string) => mongoose.isValidObjectId(s)).map((s: string) => new mongoose.Types.ObjectId(s)),
      days: arr(b.days).length ? arr(b.days) : ['Mon', 'Thu'],
      startDate: b.startDate ? new Date(b.startDate) : new Date(),
      endDate: b.endDate ? new Date(b.endDate) : undefined,
      minSeconds: Number(b.minSeconds) || 30, maxSeconds: Number(b.maxSeconds) || 120,
      status: 'active', createdBy: uId(req),
    });
    res.status(201).json({ task });
  } catch (err: any) { res.status(500).json({ message: err.message || 'Failed to create task' }); }
};

export const listTasks = async (req: Request, res: Response) => {
  try {
    const tasks = await SpeakingTask.find({ tenantId: tId(req) }).sort({ createdAt: -1 }).lean();
    const counts = await SpeakingSubmission.aggregate([
      { $match: { tenantId: tId(req) } },
      { $group: { _id: '$taskId', n: { $sum: 1 } } },
    ]);
    const cmap: Record<string, number> = {};
    counts.forEach((c: any) => { cmap[String(c._id)] = c.n; });
    res.json({ tasks: tasks.map((t) => ({ ...t, submissionCount: cmap[String(t._id)] || 0 })) });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const t = await SpeakingTask.findOne({ _id: req.params.id, tenantId: tId(req) });
    if (!t) return res.status(404).json({ message: 'Task not found' });
    const b = req.body || {};
    const arr = (v: any) => (Array.isArray(v) ? v : typeof v === 'string' && v ? v.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined);
    for (const k of ['title', 'prompt', 'instructions'] as const) if (b[k] !== undefined) (t as any)[k] = b[k];
    if (b.topics !== undefined) t.topics = arr(b.topics) || [];
    if (b.days !== undefined) t.days = arr(b.days) || t.days;
    if (b.batchIds !== undefined) t.batchIds = (arr(b.batchIds) || []).filter((s: string) => mongoose.isValidObjectId(s)).map((s: string) => new mongoose.Types.ObjectId(s)) as any;
    if (b.startDate !== undefined) t.startDate = new Date(b.startDate);
    if (b.endDate !== undefined) t.endDate = b.endDate ? new Date(b.endDate) : undefined as any;
    if (b.minSeconds !== undefined) t.minSeconds = Number(b.minSeconds);
    if (b.maxSeconds !== undefined) t.maxSeconds = Number(b.maxSeconds);
    if (b.status && ['active', 'archived'].includes(b.status)) t.status = b.status;
    await t.save();
    res.json({ task: t });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    await SpeakingTask.deleteOne({ _id: req.params.id, tenantId: tId(req) });
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

export const listSubmissions = async (req: Request, res: Response) => {
  try {
    const filter: any = { tenantId: tId(req) };
    if (req.query.taskId) filter.taskId = req.query.taskId;
    const subs = await SpeakingSubmission.find(filter).sort({ createdAt: -1 }).limit(500)
      .populate('studentId', 'firstName lastName email batchId').lean();
    const out = subs.map((s: any) => ({
      ...s,
      student: { name: [s.studentId?.firstName, s.studentId?.lastName].filter(Boolean).join(' ') || s.studentName || 'Student', email: s.studentId?.email || '' },
    }));
    res.json({ submissions: out });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// Admin/student: signed-ish streamed playback of a recording (gated by tenant).
export const playRecording = async (req: Request, res: Response) => {
  try {
    const sub = await SpeakingSubmission.findOne({ _id: req.params.id, tenantId: tId(req) }).lean();
    if (!sub) return res.status(404).json({ message: 'Not found' });
    // Students may only play their own; admins pass roleGuard on the route.
    const role = (req as any).user?.role;
    if (role === 'STUDENT' && String((sub as any).studentId) !== uId(req)) return res.status(403).json({ message: 'Forbidden' });
    const { stream } = await bunny.getFileStream((sub as any).recordingKey);
    res.setHeader('Content-Type', 'video/webm');
    stream.on('error', () => { if (!res.headersSent) res.status(502).end(); });
    stream.pipe(res);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// ─── Student ─────────────────────────────────────────────────────────────────
export const myTasks = async (req: Request, res: Response) => {
  try {
    const myBatches = await studentBatchIds(uId(req), tId(req));
    const tasks = await SpeakingTask.find({
      tenantId: tId(req), status: 'active',
      $or: [{ batchIds: { $size: 0 } }, { batchIds: { $in: myBatches } }],
    }).lean();
    const doneRows = await SpeakingSubmission.find({ tenantId: tId(req), studentId: uId(req) }).select('taskId dueDate').lean();
    const done = new Set(doneRows.map((r: any) => `${r.taskId}_${r.dueDate}`));

    const pending: any[] = [];
    for (const t of tasks) {
      for (const occ of computeOccurrences(t)) {
        if (done.has(`${t._id}_${occ.date}`)) continue;
        pending.push({ taskId: t._id, title: t.title, prompt: promptForOccurrence(t as any, occ.date), instructions: t.instructions, dueDate: occ.date, overdue: occ.overdue, minSeconds: t.minSeconds, maxSeconds: t.maxSeconds });
      }
    }
    pending.sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
    res.json({ pending, pendingCount: pending.length });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

export const mySubmissions = async (req: Request, res: Response) => {
  try {
    const subs = await SpeakingSubmission.find({ tenantId: tId(req), studentId: uId(req) })
      .sort({ createdAt: -1 }).limit(50).select('-recordingKey').lean();
    res.json({ submissions: subs });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

const ymdLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// GET /speaking/leaderboard — top speakers + the caller's rank/streak.
export const leaderboard = async (req: Request, res: Response) => {
  try {
    const agg = await SpeakingSubmission.aggregate([
      { $match: { tenantId: tId(req), status: 'evaluated' } },
      { $group: { _id: '$studentId', count: { $sum: 1 }, avg: { $avg: '$score.overall' }, name: { $first: '$studentName' } } },
      { $sort: { count: -1, avg: -1 } },
    ]);
    const top = agg.slice(0, 10).map((r: any, i: number) => ({ rank: i + 1, name: r.name || 'Student', count: r.count, avg: Math.round(r.avg || 0) }));
    const meIdx = agg.findIndex((r: any) => String(r._id) === uId(req));
    const meAgg: any = meIdx >= 0 ? agg[meIdx] : null;

    // Streak = consecutive weeks (Mon-anchored) with >=1 submission, ending this or last week.
    const mine = await SpeakingSubmission.find({ tenantId: tId(req), studentId: uId(req) }).select('dueDate createdAt').lean();
    const weeks = new Set(mine.map((s: any) => weekKey(s.dueDate || ymdLocal(new Date(s.createdAt)))));
    const d = new Date();
    if (!weeks.has(weekKey(ymdLocal(d)))) d.setDate(d.getDate() - 7);
    let streak = 0;
    while (weeks.has(weekKey(ymdLocal(d)))) { streak++; d.setDate(d.getDate() - 7); }

    res.json({ top, me: { rank: meIdx >= 0 ? meIdx + 1 : null, count: meAgg?.count || 0, avg: Math.round(meAgg?.avg || 0), streak } });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// ─── Admin: compliance dashboard ─────────────────────────────────────────────
export const compliance = async (req: Request, res: Response) => {
  try {
    const tenantId = tId(req);
    const tasks = await SpeakingTask.find({ tenantId, status: 'active' }).lean();
    const curWeek = weekKey(ymdLocal(new Date()));
    const out: any[] = [];
    for (const t of tasks) {
      const thisWeekDates = computeOccurrences(t).map((o) => o.date).filter((dt) => weekKey(dt) === curWeek);
      const expected = thisWeekDates.length;
      const studentFilter: any = { tenantId, role: 'STUDENT', isActive: { $ne: false } };
      if (t.batchIds && t.batchIds.length) studentFilter.batchId = { $in: t.batchIds };
      const students = await User.find(studentFilter).select('firstName lastName').lean() as any[];
      const subs = expected ? await SpeakingSubmission.find({ tenantId, taskId: t._id, dueDate: { $in: thisWeekDates } }).select('studentId dueDate').lean() : [];
      const doneByStudent: Record<string, Set<string>> = {};
      subs.forEach((s: any) => { const k = String(s.studentId); (doneByStudent[k] = doneByStudent[k] || new Set()).add(s.dueDate); });

      let completed = 0, partial = 0;
      const behind: { name: string; done: number }[] = [];
      for (const st of students) {
        const done = doneByStudent[String(st._id)]?.size || 0;
        if (expected > 0 && done >= expected) completed++;
        else if (done > 0) { partial++; behind.push({ name: [st.firstName, st.lastName].filter(Boolean).join(' '), done }); }
        else behind.push({ name: [st.firstName, st.lastName].filter(Boolean).join(' '), done: 0 });
      }
      out.push({
        taskId: t._id, title: t.title, days: t.days, expectedThisWeek: expected,
        totalStudents: students.length, completed, partial, notStarted: students.length - completed - partial,
        pct: students.length ? Math.round((completed / students.length) * 100) : 0,
        behind: behind.slice(0, 50),
      });
    }
    res.json({ week: curWeek, tasks: out });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// POST /speaking/submit (multipart: recording + taskId + dueDate)
export const submit = async (req: Request, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  try {
    const { taskId, dueDate } = req.body || {};
    if (!file) return res.status(400).json({ message: 'A recording is required' });
    if (!taskId || !dueDate) return res.status(400).json({ message: 'taskId and dueDate are required' });
    if (!bunny.isBunnyStorageConfigured()) return res.status(400).json({ message: 'Recording storage is not configured (Bunny Storage).' });
    const task = await SpeakingTask.findOne({ _id: taskId, tenantId: tId(req) }).lean();
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // 1) Transcribe from the temp file (before it's removed).
    let transcript = ''; let durationSec = 0;
    try { const t = await transcribeFile(file.path); transcript = t.text; durationSec = t.durationSec; } catch (e: any) { /* eval will note low content */ }

    // 2) Upload the recording to Bunny.
    const key = `speaking/${tId(req)}/${uId(req)}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.webm`;
    await bunny.uploadStream(key, fs.createReadStream(file.path), file.mimetype || 'video/webm', file.size);

    // 3) AI evaluation (against the topic for this occurrence — supports rotation).
    const evalRes = await evaluateSpeaking(promptForOccurrence(task as any, dueDate), transcript, durationSec);

    const u: any = await User.findById(uId(req)).select('firstName lastName batchId').lean();
    const doc = await SpeakingSubmission.findOneAndUpdate(
      { tenantId: tId(req), taskId, studentId: uId(req), dueDate },
      {
        $set: {
          tenantId: tId(req), taskId, taskTitle: (task as any).title, studentId: uId(req),
          studentName: [u?.firstName, u?.lastName].filter(Boolean).join(' '), batchId: u?.batchId,
          dueDate, recordingKey: key, recordingName: file.originalname || 'recording.webm', sizeBytes: file.size,
          durationSec, transcript, score: evalRes.score, feedback: evalRes.feedback, status: 'evaluated', submittedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );
    const { recordingKey, ...safe } = doc.toObject() as any;
    res.status(201).json({ submission: safe });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Submission failed' });
  } finally {
    if (file?.path) fs.unlink(file.path, () => {});
  }
};
