import { Request, Response } from 'express';
import fs from 'fs';
import Resume from '../models/Resume';
import { extractTextFromFile, parseResumeText, getEmptySections } from '../services/resumeParserService';
import { scoreResume } from '../services/resumeScoringService';

interface AuthRequest extends Request {
  user?: { id: string; role?: string };
  tenantId?: string;
}

// GET /resume/my  — get current student's resume (latest)
export async function getMyResume(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const tenantId = req.tenantId;
    if (!userId || !tenantId) return res.status(401).json({ message: 'Unauthorized' });

    const resume = await Resume.findOne({ userId, tenantId }).sort({ updatedAt: -1 });
    res.json({ success: true, data: resume });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load resume' });
  }
}

// POST /resume/upload  — upload PDF/DOCX, parse and score
export async function uploadResume(req: AuthRequest, res: Response) {
  const file = (req as any).file;
  try {
    const userId = req.user?.id;
    const tenantId = req.tenantId;
    if (!userId || !tenantId) return res.status(401).json({ message: 'Unauthorized' });
    if (!file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const rawText = await extractTextFromFile(file.path);
    if (!rawText.trim()) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ success: false, message: 'Could not extract text from file. Try a text-based PDF.' });
    }

    const sections = await parseResumeText(rawText);
    const score = await scoreResume(sections);

    const fileUrl = `/uploads/resumes/${file.filename}`;

    // Upsert — one resume per student
    const resume = await Resume.findOneAndUpdate(
      { userId, tenantId },
      { mode: 'uploaded', sections, score, uploadedFileUrl: fileUrl, scoredAt: new Date(), $inc: { version: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, data: resume, message: 'Resume uploaded and scored' });
  } catch (err: any) {
    if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    console.error('uploadResume error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to process resume' });
  }
}

// PUT /resume/sections  — save builder form data
export async function saveSections(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const tenantId = req.tenantId;
    if (!userId || !tenantId) return res.status(401).json({ message: 'Unauthorized' });

    const { sections } = req.body;
    if (!sections) return res.status(400).json({ success: false, message: 'sections required' });

    const resume = await Resume.findOneAndUpdate(
      { userId, tenantId },
      { mode: 'built', sections, $inc: { version: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, data: resume, message: 'Saved' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save' });
  }
}

// POST /resume/score  — (re)score current sections
export async function scoreMyResume(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const tenantId = req.tenantId;
    if (!userId || !tenantId) return res.status(401).json({ message: 'Unauthorized' });

    let resume = await Resume.findOne({ userId, tenantId });
    if (!resume) return res.status(404).json({ success: false, message: 'No resume found. Save your resume first.' });

    const score = await scoreResume(resume.sections as any);
    resume.score = score as any;
    resume.scoredAt = new Date();
    await resume.save();

    res.json({ success: true, data: { score }, message: 'Scored successfully' });
  } catch (err: any) {
    console.error('scoreMyResume error:', err);
    res.status(500).json({ success: false, message: err.message || 'Scoring failed' });
  }
}

// GET /resume/all  — admin: list all resumes in tenant with score summary
export async function getAllResumes(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(401).json({ message: 'Unauthorized' });

    const resumes = await Resume.find({ tenantId })
      .populate('userId', 'name email')
      .select('userId mode score.total scoredAt updatedAt version')
      .sort({ updatedAt: -1 });

    res.json({ success: true, data: resumes });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch resumes' });
  }
}
