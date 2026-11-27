import mongoose from 'mongoose';
import {
  ProjectTemplate, ProjectEnrollment, IProjectTemplate, IProjectEnrollment, ITaskState, PROOF_TYPES, ProofType,
} from '../models/ProjectStudio';
import User from '../models/User';
import Batch from '../models/Batch';
import { clinicAppointmentSystem } from '../seeds/projectStudio/clinicAppointmentSystem';

/**
 * Project Studio (docs/design/project-studio.md), Phase 1.
 *
 * Admin: write projects (sprints → days → tasks), release them to batches, watch progress, review
 * submissions, reset a student. Student: pick one released project (once), set the GitHub repo,
 * submit proof per task, self-check the interview questions.
 */

export class ProjectError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

const isId = (s: any) => mongoose.isValidObjectId(String(s));
const newId = () => new mongoose.Types.ObjectId();
const keepId = (s: any) => (isId(s) ? new mongoose.Types.ObjectId(String(s)) : newId());
const str = (v: any, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const strList = (v: any, max: number, maxItems: number) =>
  (Array.isArray(v) ? v : []).map((x) => str(x, max)).filter(Boolean).slice(0, maxItems);

/* ── Template shape ───────────────────────────────────────────────────────────────────────── */

type FlatTask = { taskId: string; title: string; weight: number; sprintTitle: string; dayTitle: string; proofType: ProofType };

/** Every task in order, with where it sits. */
export function flattenTasks(t: Pick<IProjectTemplate, 'sprints'>): FlatTask[] {
  const out: FlatTask[] = [];
  for (const s of t.sprints || []) for (const d of s.days || []) for (const k of d.tasks || []) {
    out.push({ taskId: String(k._id), title: k.title, weight: k.weight || 1, sprintTitle: s.title, dayTitle: d.title, proofType: k.proofType });
  }
  return out;
}

/** Clean an admin's builder payload. Existing ids are kept so student progress stays attached. */
function cleanSprints(raw: any): any[] {
  return (Array.isArray(raw) ? raw : []).slice(0, 30).map((s: any, si: number) => ({
    _id: keepId(s?._id),
    title: str(s?.title, 200) || `Sprint ${si + 1}`,
    goal: str(s?.goal, 1000),
    days: (Array.isArray(s?.days) ? s.days : []).slice(0, 40).map((d: any, di: number) => ({
      _id: keepId(d?._id),
      title: str(d?.title, 200) || `Day ${di + 1}`,
      tasks: (Array.isArray(d?.tasks) ? d.tasks : []).slice(0, 20).map((k: any, ki: number) => ({
        _id: keepId(k?._id),
        title: str(k?.title, 200) || `Task ${ki + 1}`,
        story: str(k?.story, 500),
        brief: typeof k?.brief === 'string' ? k.brief.slice(0, 20000) : '',
        acceptance: strList(k?.acceptance, 500, 30),
        proofType: (PROOF_TYPES as readonly string[]).includes(k?.proofType) ? k.proofType : 'commit',
        weight: Math.min(10, Math.max(1, Math.round(Number(k?.weight) || 1))),
        questions: (Array.isArray(k?.questions) ? k.questions : []).slice(0, 15)
          .map((q: any) => ({ q: str(q?.q, 1000), a: str(q?.a, 5000) })).filter((q: any) => q.q),
      })),
    })),
  }));
}

function cleanTemplate(body: any) {
  const level = ['beginner', 'intermediate', 'advanced'].includes(body?.level) ? body.level : 'beginner';
  return {
    title: str(body?.title, 200),
    summary: typeof body?.summary === 'string' ? body.summary.slice(0, 20000) : '',
    domain: str(body?.domain, 100),
    techStack: strList(body?.techStack, 60, 20),
    level,
    reviewMode: body?.reviewMode === 'auto' ? 'auto' : 'mentor',
    releasedBatchIds: strList(body?.releasedBatchIds, 40, 500).filter(isId),
    sprints: cleanSprints(body?.sprints),
  };
}

/* ── Completion ───────────────────────────────────────────────────────────────────────────── */

function score(t: Pick<IProjectTemplate, 'sprints'>, states: ITaskState[]) {
  const tasks = flattenTasks(t);
  const byId = new Map(states.map((s) => [s.taskId, s]));
  const totalWeight = tasks.reduce((n, k) => n + k.weight, 0);
  const doneWeight = tasks.reduce((n, k) => n + (byId.get(k.taskId)?.status === 'done' ? k.weight : 0), 0);
  const completionPct = totalWeight ? Math.round((doneWeight / totalWeight) * 100) : 0;
  return { totalWeight, doneWeight, completionPct };
}

function applyScore(e: IProjectEnrollment, t: Pick<IProjectTemplate, 'sprints'>) {
  const s = score(t, e.tasks);
  e.totalWeight = s.totalWeight;
  e.doneWeight = s.doneWeight;
  e.completionPct = s.completionPct;
  if (s.completionPct >= 100 && !e.completedAt) e.completedAt = new Date();
  if (s.completionPct < 100) e.completedAt = undefined;
}

/** After an admin edits a project, every student on it is re-scored against the new weights. */
async function rescoreTemplate(t: IProjectTemplate) {
  const list = await ProjectEnrollment.find({ tenantId: t.tenantId, templateId: t._id, active: true });
  for (const e of list) { applyScore(e, t); await e.save(); }
  return list.length;
}

/* ── Admin: projects ──────────────────────────────────────────────────────────────────────── */

export async function listTemplates(tenantId: string) {
  const [templates, counts] = await Promise.all([
    ProjectTemplate.find({ tenantId }).sort({ status: 1, updatedAt: -1 }).lean(),
    ProjectEnrollment.aggregate([
      { $match: { tenantId, active: true } },
      { $group: { _id: '$templateId', students: { $sum: 1 }, avgPct: { $avg: '$completionPct' }, completed: { $sum: { $cond: [{ $gte: ['$completionPct', 100] }, 1, 0] } } } },
    ]),
  ]);
  const byT = new Map(counts.map((c: any) => [String(c._id), c]));
  return templates.map((t: any) => {
    const c: any = byT.get(String(t._id));
    const tasks = flattenTasks(t);
    return {
      _id: t._id, title: t.title, domain: t.domain, techStack: t.techStack, level: t.level, status: t.status,
      reviewMode: t.reviewMode, releasedBatchIds: t.releasedBatchIds, updatedAt: t.updatedAt,
      sprintCount: (t.sprints || []).length,
      dayCount: (t.sprints || []).reduce((n: number, s: any) => n + (s.days || []).length, 0),
      taskCount: tasks.length,
      students: c?.students || 0, avgPct: c ? Math.round(c.avgPct) : 0, completed: c?.completed || 0,
    };
  });
}

export async function getTemplate(tenantId: string, id: string) {
  if (!isId(id)) throw new ProjectError('Project not found', 404);
  const t = await ProjectTemplate.findOne({ _id: id, tenantId }).lean();
  if (!t) throw new ProjectError('Project not found', 404);
  return t;
}

export async function createTemplate(tenantId: string, userId: string, body: any) {
  const clean = cleanTemplate(body);
  if (!clean.title) throw new ProjectError('Give the project a title');
  const t = await ProjectTemplate.create({ ...clean, tenantId, status: 'draft', createdBy: userId, updatedBy: userId });
  return t.toObject();
}

export async function saveTemplate(tenantId: string, userId: string, id: string, body: any) {
  if (!isId(id)) throw new ProjectError('Project not found', 404);
  const t = await ProjectTemplate.findOne({ _id: id, tenantId });
  if (!t) throw new ProjectError('Project not found', 404);
  const clean = cleanTemplate(body);
  if (!clean.title) throw new ProjectError('Give the project a title');
  const status = ['draft', 'published', 'archived'].includes(body?.status) ? body.status : t.status;
  if (status === 'published' && flattenTasks(clean as any).length === 0) throw new ProjectError('Add at least one task before publishing');
  t.set({ ...clean, status, updatedBy: userId });
  await t.save();
  const rescored = await rescoreTemplate(t);
  return { template: t.toObject(), rescored };
}

export async function duplicateTemplate(tenantId: string, userId: string, id: string) {
  const src: any = await getTemplate(tenantId, id);
  // Fresh ids everywhere: a copy is a new project (e.g. another domain variant), not the same tasks.
  const sprints = cleanSprints((src.sprints || []).map((s: any) => ({
    ...s, _id: undefined, days: (s.days || []).map((d: any) => ({ ...d, _id: undefined, tasks: (d.tasks || []).map((k: any) => ({ ...k, _id: undefined })) })),
  })));
  const t = await ProjectTemplate.create({
    tenantId, title: `${src.title} (copy)`.slice(0, 200), summary: src.summary, domain: src.domain, techStack: src.techStack,
    level: src.level, reviewMode: src.reviewMode, status: 'draft', releasedBatchIds: [], sprints, createdBy: userId, updatedBy: userId,
  });
  return t.toObject();
}

export async function deleteTemplate(tenantId: string, id: string) {
  if (!isId(id)) throw new ProjectError('Project not found', 404);
  const t = await ProjectTemplate.findOne({ _id: id, tenantId });
  if (!t) throw new ProjectError('Project not found', 404);
  const used = await ProjectEnrollment.countDocuments({ tenantId, templateId: t._id });
  if (used > 0) {
    // Students' work points at it, so it is hidden from new picks rather than deleted.
    t.status = 'archived';
    await t.save();
    return { archived: true, students: used };
  }
  await t.deleteOne();
  return { deleted: true };
}

/* ── Starter projects: ready-made drafts an admin can add and then edit ───────────────────── */

const STARTERS: Record<string, any> = { 'clinic-appointment-system': clinicAppointmentSystem };

export async function listStarters(tenantId: string) {
  const titles = Object.values(STARTERS).map((p) => p.title);
  const have = new Set((await ProjectTemplate.find({ tenantId, title: { $in: titles } }).select('title').lean()).map((t: any) => t.title));
  return Object.entries(STARTERS).map(([key, p]) => {
    const tasks = flattenTasks(p);
    return {
      key, title: p.title, domain: p.domain, techStack: p.techStack, level: p.level,
      sprintCount: p.sprints.length, dayCount: p.sprints.reduce((n: number, s: any) => n + s.days.length, 0), taskCount: tasks.length,
      added: have.has(p.title),
    };
  });
}

/** Adds the starter as a DRAFT, released to no batch — no student sees it until an admin publishes it. */
export async function installStarter(tenantId: string, userId: string, key: string) {
  const p = STARTERS[key];
  if (!p) throw new ProjectError('Starter project not found', 404);
  if (await ProjectTemplate.exists({ tenantId, title: p.title })) throw new ProjectError(`"${p.title}" is already in your projects`, 409);
  const t = await ProjectTemplate.create({ ...cleanTemplate(p), tenantId, status: 'draft', releasedBatchIds: [], createdBy: userId, updatedBy: userId });
  return t.toObject();
}

export async function listBatches(tenantId: string) {
  const batches = await Batch.find({ tenantId, isActive: true } as any).select('name').sort({ name: 1 }).lean();
  return batches.map((b: any) => ({ _id: String(b._id), name: b.name }));
}

/* ── Admin: progress, review, reset ───────────────────────────────────────────────────────── */

const studentName = (u: any) => [u?.firstName, u?.lastName].filter(Boolean).join(' ') || u?.email || 'Student';

export async function progress(tenantId: string, q: { batchId?: string; templateId?: string }) {
  const match: any = { tenantId, active: true };
  if (q.templateId && isId(q.templateId)) match.templateId = new mongoose.Types.ObjectId(q.templateId);
  const enrollments = await ProjectEnrollment.find(match).lean();

  // With a batch chosen, also list its students who have not picked a project yet.
  let students: any[] = [];
  if (q.batchId && isId(q.batchId)) {
    students = await User.find({ tenantId, role: 'STUDENT', isActive: true, $or: [{ batchId: q.batchId }, { placementBatchIds: q.batchId }] } as any)
      .select('firstName lastName email batchId').lean();
  }
  const ids = new Set<string>([...enrollments.map((e) => e.studentId), ...students.map((s) => String(s._id))]);
  const users = await User.find({ _id: { $in: [...ids].filter(isId) } }).select('firstName lastName email batchId placementBatchIds').lean();
  const userBy = new Map(users.map((u: any) => [String(u._id), u]));
  const templates = await ProjectTemplate.find({ tenantId }).select('title sprints').lean();
  const tBy = new Map(templates.map((t: any) => [String(t._id), t]));
  const batchIds = [...new Set(users.map((u: any) => String(u.batchId || '')).filter(isId))];
  const batches = await Batch.find({ _id: { $in: batchIds } }).select('name').lean();
  const bBy = new Map(batches.map((b: any) => [String(b._id), b.name]));

  const inBatch = (u: any) => !q.batchId || String(u?.batchId) === q.batchId || (u?.placementBatchIds || []).map(String).includes(q.batchId);
  const rows: any[] = [];
  const enrolled = new Set<string>();
  for (const e of enrollments) {
    const u = userBy.get(e.studentId);
    if (!u || !inBatch(u)) continue;
    enrolled.add(e.studentId);
    const t: any = tBy.get(String(e.templateId));
    const total = t ? flattenTasks(t).length : 0;
    rows.push({
      enrollmentId: e._id, studentId: e.studentId, name: studentName(u), email: u.email, batch: bBy.get(String(u.batchId)) || '',
      project: t?.title || '(deleted project)', templateId: e.templateId, repoUrl: e.repoUrl || '',
      completionPct: e.completionPct, doneTasks: e.tasks.filter((s) => s.status === 'done').length, totalTasks: total,
      awaitingReview: e.tasks.filter((s) => s.status === 'submitted').length,
      startedAt: e.startedAt, lastActivityAt: e.lastActivityAt, completedAt: e.completedAt,
    });
  }
  if (!q.templateId) {
    for (const s of students) {
      const sid = String(s._id);
      if (enrolled.has(sid)) continue;
      rows.push({ studentId: sid, name: studentName(s), email: s.email, batch: bBy.get(String(s.batchId)) || '', project: '', completionPct: 0, notStarted: true });
    }
  }
  rows.sort((a, b) => (b.completionPct - a.completionPct) || a.name.localeCompare(b.name));
  return rows;
}

export async function reviewQueue(tenantId: string) {
  const list = await ProjectEnrollment.find({ tenantId, active: true, 'tasks.status': 'submitted' }).lean();
  if (!list.length) return [];
  const users = await User.find({ _id: { $in: list.map((e) => e.studentId).filter(isId) } }).select('firstName lastName email').lean();
  const uBy = new Map(users.map((u: any) => [String(u._id), u]));
  const templates = await ProjectTemplate.find({ _id: { $in: list.map((e) => e.templateId) } }).lean();
  const tBy = new Map(templates.map((t: any) => [String(t._id), t]));
  const out: any[] = [];
  for (const e of list) {
    const t: any = tBy.get(String(e.templateId));
    const tasks = t ? new Map(flattenTasks(t).map((k) => [k.taskId, k])) : new Map();
    for (const s of e.tasks) {
      if (s.status !== 'submitted') continue;
      const k: any = tasks.get(s.taskId);
      out.push({
        enrollmentId: e._id, taskId: s.taskId, studentId: e.studentId, name: studentName(uBy.get(e.studentId)),
        project: t?.title || '', task: k?.title || '(removed task)', where: k ? `${k.sprintTitle} · ${k.dayTitle}` : '',
        proofType: k?.proofType, proofUrl: s.proofUrl, note: s.note, repoUrl: e.repoUrl, submittedAt: s.submittedAt,
        attempts: s.submissions.length,
      });
    }
  }
  out.sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
  return out;
}

async function loadEnrollment(tenantId: string, id: string) {
  if (!isId(id)) throw new ProjectError('Not found', 404);
  const e = await ProjectEnrollment.findOne({ _id: id, tenantId });
  if (!e) throw new ProjectError('Not found', 404);
  const t = await ProjectTemplate.findOne({ _id: e.templateId, tenantId });
  if (!t) throw new ProjectError('This project was deleted', 404);
  return { e, t };
}

export async function reviewTask(tenantId: string, userId: string, enrollmentId: string, taskId: string, body: any) {
  const { e, t } = await loadEnrollment(tenantId, enrollmentId);
  const s = e.tasks.find((x) => x.taskId === taskId);
  if (!s) throw new ProjectError('Nothing submitted for this task yet');
  const action = body?.action;
  const note = str(body?.note, 2000);
  if (action === 'approve') { s.status = 'done'; s.doneAt = new Date(); }
  else if (action === 'changes') {
    if (!note) throw new ProjectError('Tell the student what to change');
    s.status = 'changes'; s.doneAt = undefined;
  } else throw new ProjectError('Choose approve or ask for changes');
  s.reviewedAt = new Date(); s.reviewedBy = userId; s.reviewNote = note || undefined;
  applyScore(e, t);
  e.markModified('tasks');
  await e.save();
  return { status: s.status, completionPct: e.completionPct };
}

export async function enrollmentDetail(tenantId: string, id: string) {
  const { e, t } = await loadEnrollment(tenantId, id);
  const u: any = await User.findById(e.studentId).select('firstName lastName email').lean();
  return { enrollment: e.toObject(), template: t.toObject(), student: { name: studentName(u), email: u?.email } };
}

export async function resetEnrollment(tenantId: string, userId: string, id: string, reason: string) {
  const { e } = await loadEnrollment(tenantId, id);
  if (!e.active) throw new ProjectError('Already reset');
  e.active = false; e.resetAt = new Date(); e.resetBy = userId; e.resetReason = str(reason, 300) || undefined;
  await e.save();
  return { reset: true };
}

/* ── Student ──────────────────────────────────────────────────────────────────────────────── */

async function studentBatches(tenantId: string, studentId: string) {
  const u: any = await User.findOne({ _id: studentId, tenantId }).select('role batchId placementBatchIds isActive').lean();
  if (!u || u.role !== 'STUDENT') throw new ProjectError('Projects are for students', 403);
  return { user: u, batchIds: [u.batchId, ...(u.placementBatchIds || [])].filter(Boolean).map(String) };
}

/** Hide the model answers until the student has submitted that task — it is a self-check. */
function studentTemplate(t: any, states: ITaskState[]) {
  const submitted = new Set(states.map((s) => s.taskId));
  return {
    _id: t._id, title: t.title, summary: t.summary, domain: t.domain, techStack: t.techStack, level: t.level, reviewMode: t.reviewMode,
    sprints: (t.sprints || []).map((s: any) => ({
      ...s, days: (s.days || []).map((d: any) => ({
        ...d, tasks: (d.tasks || []).map((k: any) => ({
          ...k, questions: submitted.has(String(k._id)) ? k.questions : [], questionCount: (k.questions || []).length,
        })),
      })),
    })),
  };
}

export async function myProject(tenantId: string, studentId: string) {
  const { batchIds } = await studentBatches(tenantId, studentId);
  const e = await ProjectEnrollment.findOne({ tenantId, studentId, active: true }).lean();
  if (e) {
    const t = await ProjectTemplate.findOne({ _id: e.templateId, tenantId }).lean();
    if (t) return { enrollment: e, template: studentTemplate(t, e.tasks) };
  }
  const catalog = await ProjectTemplate.find({ tenantId, status: 'published', releasedBatchIds: { $in: batchIds } }).lean();
  return {
    enrollment: null,
    catalog: catalog.map((t: any) => ({
      _id: t._id, title: t.title, summary: t.summary, domain: t.domain, techStack: t.techStack, level: t.level,
      sprintCount: (t.sprints || []).length,
      dayCount: (t.sprints || []).reduce((n: number, s: any) => n + (s.days || []).length, 0),
      taskCount: flattenTasks(t).length,
      sprints: (t.sprints || []).map((s: any) => ({ title: s.title, goal: s.goal, days: (s.days || []).length })),
    })),
  };
}

export async function pickProject(tenantId: string, studentId: string, templateId: string) {
  const { user, batchIds } = await studentBatches(tenantId, studentId);
  if (!isId(templateId)) throw new ProjectError('Project not found', 404);
  const t = await ProjectTemplate.findOne({ _id: templateId, tenantId, status: 'published', releasedBatchIds: { $in: batchIds } });
  if (!t) throw new ProjectError('This project is not open to your batch', 404);
  if (await ProjectEnrollment.exists({ tenantId, studentId, active: true })) throw new ProjectError('You have already picked your project. Ask your mentor if it must change.', 409);
  try {
    const e = new ProjectEnrollment({ tenantId, studentId, batchId: String(user.batchId || ''), templateId: t._id, tasks: [] });
    applyScore(e, t);
    await e.save();
    return { picked: true };
  } catch (err: any) {
    if (err?.code === 11000) throw new ProjectError('You have already picked your project.', 409);
    throw err;
  }
}

const GH_REPO = /^https:\/\/github\.com\/([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})\/?$/;

export async function setRepo(tenantId: string, studentId: string, repoUrl: string) {
  const url = str(repoUrl, 500).replace(/\.git$/, '').replace(/\/$/, '');
  if (!GH_REPO.test(url)) throw new ProjectError('Paste your repository link, like https://github.com/your-name/project-name');
  const e = await ProjectEnrollment.findOne({ tenantId, studentId, active: true });
  if (!e) throw new ProjectError('Pick a project first');
  // Two students cannot hand in the same repository.
  const clash = await ProjectEnrollment.exists({ tenantId, active: true, _id: { $ne: e._id }, repoUrl: new RegExp(`^${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
  if (clash) throw new ProjectError('Another student already uses this repository. Create your own.');
  e.repoUrl = url; e.lastActivityAt = new Date();
  await e.save();
  return { repoUrl: url };
}

function checkProof(type: ProofType, proofUrl: string, note: string, repoUrl?: string) {
  const inRepo = (u: string) => !!repoUrl && u.toLowerCase().startsWith(`${repoUrl.toLowerCase()}/`);
  if (type === 'commit') {
    if (!repoUrl) throw new ProjectError('Add your GitHub repository link first');
    if (!/^https:\/\/github\.com\/[^/]+\/[^/]+\/commit\/[0-9a-f]{7,40}\/?$/i.test(proofUrl)) throw new ProjectError('Paste the link to your commit (…/commit/<id>)');
    if (!inRepo(proofUrl)) throw new ProjectError('The commit must be in your project repository');
  } else if (type === 'pr') {
    if (!repoUrl) throw new ProjectError('Add your GitHub repository link first');
    if (!/^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+\/?$/i.test(proofUrl)) throw new ProjectError('Paste the link to your pull request (…/pull/<number>)');
    if (!inRepo(proofUrl)) throw new ProjectError('The pull request must be in your project repository');
  } else if (type === 'url') {
    if (!/^https?:\/\/\S+$/i.test(proofUrl)) throw new ProjectError('Paste a link (starting with https://)');
  } else if (type === 'text') {
    if (note.length < 20) throw new ProjectError('Write a short explanation (at least 20 characters)');
    if (proofUrl && !/^https?:\/\/\S+$/i.test(proofUrl)) throw new ProjectError('The link must start with https://');
  }
}

export async function submitTask(tenantId: string, studentId: string, taskId: string, body: any) {
  const e = await ProjectEnrollment.findOne({ tenantId, studentId, active: true });
  if (!e) throw new ProjectError('Pick a project first');
  const t = await ProjectTemplate.findOne({ _id: e.templateId, tenantId });
  if (!t) throw new ProjectError('This project was removed. Ask your mentor.', 404);
  const task = flattenTasks(t).find((k) => k.taskId === taskId);
  if (!task) throw new ProjectError('Task not found', 404);
  const proofUrl = str(body?.proofUrl, 1000);
  const note = str(body?.note, 2000);
  checkProof(task.proofType, proofUrl, note, e.repoUrl);

  let s = e.tasks.find((x) => x.taskId === taskId);
  if (s?.status === 'done') throw new ProjectError('This task is already approved');
  const now = new Date();
  if (!s) { e.tasks.push({ taskId, status: 'submitted', submissions: [], selfCheck: [] } as any); s = e.tasks[e.tasks.length - 1]; }
  s.submissions = [...(s.submissions || []), { at: now, proofUrl: proofUrl || undefined, note: note || undefined }].slice(-20);
  s.proofUrl = proofUrl || undefined; s.note = note || undefined; s.submittedAt = now;
  if (t.reviewMode === 'auto') { s.status = 'done'; s.doneAt = now; } else s.status = 'submitted';
  e.lastActivityAt = now;
  applyScore(e, t);
  e.markModified('tasks');
  await e.save();
  return { status: s.status, completionPct: e.completionPct };
}

export async function selfCheck(tenantId: string, studentId: string, taskId: string, body: any) {
  const e = await ProjectEnrollment.findOne({ tenantId, studentId, active: true });
  if (!e) throw new ProjectError('Pick a project first');
  const s = e.tasks.find((x) => x.taskId === taskId);
  if (!s) throw new ProjectError('Submit the task first');
  const i = Math.round(Number(body?.i));
  if (!Number.isFinite(i) || i < 0 || i > 50) throw new ProjectError('Bad question');
  s.selfCheck = [...(s.selfCheck || []).filter((x) => x.i !== i), { i, knew: !!body?.knew }];
  e.markModified('tasks');
  await e.save();
  return { selfCheck: s.selfCheck };
}
