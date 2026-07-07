import { Request, Response } from 'express';
import ProjectPlan from '../models/ProjectPlan';
import StudentProfile from '../models/StudentProfile';
import { recommendProjects } from '../services/projectBuilderService';

const tId = (req: Request) => (req as any).tenantId as string;
const uId = (req: Request) => (req as any).user?.id as string;

// GET /projects/recommend?role=... — AI project recommendations (not persisted).
export const getRecommendations = async (req: Request, res: Response) => {
  try {
    let role = String(req.query.role || '').trim();
    const profile: any = await StudentProfile.findOne({ userId: uId(req), tenantId: tId(req) }).lean();
    if (!role) role = profile?.courseInterest?.interestedCourse || 'Full-Stack Developer';
    const known = [
      ...(profile?.technicalBackground?.programmingLanguages || []),
      ...(profile?.technicalBackground?.technologies || []),
    ];
    const projects = await recommendProjects(role, known);
    res.json({ role, projects });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get recommendations', error: String(err) });
  }
};

// GET /projects — the student's saved projects.
export const listProjects = async (req: Request, res: Response) => {
  try {
    const projects = await ProjectPlan.find({ tenantId: tId(req), studentId: uId(req) }).sort({ createdAt: -1 }).lean();
    res.json({ projects });
  } catch (err) {
    res.status(500).json({ message: 'Failed to list projects', error: String(err) });
  }
};

// POST /projects — save/start a project (from a recommendation or manual).
export const createProject = async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    if (!b.title) return res.status(400).json({ message: 'title is required' });
    const project = await ProjectPlan.create({
      tenantId: tId(req),
      studentId: uId(req),
      targetRole: b.targetRole,
      title: b.title,
      description: b.description,
      difficulty: b.difficulty,
      techStack: Array.isArray(b.techStack) ? b.techStack : [],
      features: Array.isArray(b.features) ? b.features : [],
      dbSchema: b.dbSchema,
      apiList: Array.isArray(b.apiList) ? b.apiList : [],
      frontendScreens: Array.isArray(b.frontendScreens) ? b.frontendScreens : [],
      readme: b.readme,
      deploymentSteps: Array.isArray(b.deploymentSteps) ? b.deploymentSteps : [],
      tasks: (Array.isArray(b.tasks) ? b.tasks : []).map((t: any) => ({ title: typeof t === 'string' ? t : t.title, done: false })),
      status: 'in_progress',
    });
    res.status(201).json({ project });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save project', error: String(err) });
  }
};

// GET /projects/:id
export const getProject = async (req: Request, res: Response) => {
  try {
    const project = await ProjectPlan.findOne({ _id: req.params.id, tenantId: tId(req), studentId: uId(req) }).lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json({ project });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load project', error: String(err) });
  }
};

// PATCH /projects/:id/task — toggle a task; recompute status.
export const toggleTask = async (req: Request, res: Response) => {
  try {
    const { index, done } = req.body || {};
    const project = await ProjectPlan.findOne({ _id: req.params.id, tenantId: tId(req), studentId: uId(req) });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (index == null || index < 0 || index >= project.tasks.length) return res.status(400).json({ message: 'Invalid task index' });
    project.tasks[index].done = !!done;
    const doneCount = project.tasks.filter(t => t.done).length;
    project.status = doneCount === 0 ? 'planned' : doneCount === project.tasks.length ? 'completed' : 'in_progress';
    await project.save();
    res.json({ project });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update task', error: String(err) });
  }
};

// PATCH /projects/:id — update githubUrl / status.
export const updateProject = async (req: Request, res: Response) => {
  try {
    const patch: any = {};
    if (typeof req.body?.githubUrl === 'string') patch.githubUrl = req.body.githubUrl.trim();
    if (['planned', 'in_progress', 'completed'].includes(req.body?.status)) patch.status = req.body.status;
    const project = await ProjectPlan.findOneAndUpdate(
      { _id: req.params.id, tenantId: tId(req), studentId: uId(req) }, { $set: patch }, { new: true }
    );
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json({ project });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update project', error: String(err) });
  }
};

// DELETE /projects/:id
export const deleteProject = async (req: Request, res: Response) => {
  try {
    await ProjectPlan.deleteOne({ _id: req.params.id, tenantId: tId(req), studentId: uId(req) });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete project', error: String(err) });
  }
};
