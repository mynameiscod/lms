import { Request, Response } from 'express';
import PlaygroundProgram from '../models/PlaygroundProgram';
import codeRunner from '../services/codeRunnerService';
import { ProgrammingLanguage } from '../models/Assignment';

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
