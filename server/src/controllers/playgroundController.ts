import { Request, Response } from 'express';
import axios from 'axios';
import PlaygroundProgram from '../models/PlaygroundProgram';
import StudentProfile from '../models/StudentProfile';
import codeRunner from '../services/codeRunnerService';
import { ProgrammingLanguage } from '../models/Assignment';

// Default filename per language for the GitHub commit
const FILENAME: Record<string, string> = {
  python: 'main.py', javascript: 'index.js', typescript: 'index.ts', java: 'Main.java',
  cpp: 'main.cpp', c: 'main.c', csharp: 'Program.cs', go: 'main.go', rust: 'main.rs',
  web: 'index.html', sql: 'query.sql',
};
const slug = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'playground';

// Languages we can actually execute on Piston (single-file).
const RUNNABLE = new Set<string>([
  ProgrammingLanguage.JAVASCRIPT, ProgrammingLanguage.TYPESCRIPT, ProgrammingLanguage.PYTHON,
  ProgrammingLanguage.JAVA, ProgrammingLanguage.CPP, ProgrammingLanguage.C,
  ProgrammingLanguage.CSHARP, ProgrammingLanguage.GO, ProgrammingLanguage.RUST,
]);

// POST /playground/run — execute code and return stdout/stderr
export const run = async (req: Request, res: Response) => {
  try {
    const { language, code, stdin } = req.body;
    if (!code?.trim() || !language) return res.status(400).json({ success: false, message: 'language and code are required' });
    if (!RUNNABLE.has(language)) {
      return res.status(400).json({ success: false, message: `"${language}" can't be run here. Use the Web preview or a framework sandbox instead.` });
    }
    const r = await codeRunner.execute({
      code, language: language as ProgrammingLanguage, input: stdin || '',
      expectedOutput: '', timeLimit: 10000, memoryLimit: 256,
    });
    res.json({
      success: true,
      data: { output: r.output || '', error: r.compilationError || r.error || '', executionTime: r.executionTime },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Execution failed' });
  }
};

// GET /playground — my saved programs
export const listPrograms = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const data = await PlaygroundProgram.find({ tenantId, userId }).sort({ updatedAt: -1 }).lean();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProgram = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const prog = await PlaygroundProgram.findOne({ _id: req.params.id, tenantId, userId }).lean();
    if (!prog) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: prog });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createProgram = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { title, language, code, stdin, kind, framework } = req.body;
    if (!language) return res.status(400).json({ success: false, message: 'language is required' });
    const prog = await PlaygroundProgram.create({
      tenantId, userId, title: (title || 'Untitled').trim(), language,
      code: code || '', stdin: stdin || '', kind: kind || 'single', framework,
    });
    res.status(201).json({ success: true, data: prog });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateProgram = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const allowed = ['title', 'language', 'code', 'stdin', 'kind', 'framework', 'isPublic'];
    const update: any = {};
    for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];
    const prog = await PlaygroundProgram.findOneAndUpdate(
      { _id: req.params.id, tenantId, userId }, { $set: update }, { new: true }
    );
    if (!prog) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: prog });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// POST /playground/:id/push-github — create/update a repo file with the program
export const pushToGithub = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const prog = await PlaygroundProgram.findOne({ _id: req.params.id, tenantId, userId });
    if (!prog) return res.status(404).json({ success: false, message: 'Program not found' });

    const profile = await StudentProfile.findOne({ userId }).select('oauthConnections.github').lean();
    const gh = (profile as any)?.oauthConnections?.github;
    if (!gh?.accessToken || !gh?.username) {
      return res.status(400).json({ success: false, message: 'Connect your GitHub account first (Profile → Connect GitHub).' });
    }
    const owner = gh.username as string;
    const repo = slug(req.body?.repoName || prog.title);
    const path = FILENAME[prog.language] || 'main.txt';
    const isPrivate = req.body?.private !== false;

    const api = axios.create({
      baseURL: 'https://api.github.com',
      headers: { Authorization: `token ${gh.accessToken}`, Accept: 'application/vnd.github+json', 'User-Agent': 'codebegun-lms' },
    });

    // Ensure the repo exists (create with a README so the default branch exists)
    try { await api.get(`/repos/${owner}/${repo}`); }
    catch { await api.post('/user/repos', { name: repo, private: isPrivate, auto_init: true, description: 'Created from Codebegun Code Playground' }); }

    // Commit (create or update) the file
    let sha: string | undefined;
    try { const f = await api.get(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`); sha = (f.data as any)?.sha; } catch { /* new file */ }
    const put = await api.put(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
      message: `${sha ? 'Update' : 'Add'} ${path} from Code Playground`,
      content: Buffer.from(prog.code || '', 'utf8').toString('base64'),
      ...(sha ? { sha } : {}),
    });

    const fileUrl = (put.data as any)?.content?.html_url || `https://github.com/${owner}/${repo}`;
    prog.githubRepo = `${owner}/${repo}`;
    prog.githubUrl = `https://github.com/${owner}/${repo}`;
    await prog.save();
    res.json({ success: true, data: { url: fileUrl, repo: `${owner}/${repo}`, repoUrl: prog.githubUrl } });
  } catch (error: any) {
    const msg = error?.response?.data?.message || error.message || 'GitHub push failed';
    res.status(400).json({ success: false, message: msg });
  }
};

export const deleteProgram = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const r = await PlaygroundProgram.deleteOne({ _id: req.params.id, tenantId, userId });
    if (!r.deletedCount) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
