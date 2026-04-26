import { Response } from 'express';
import path from 'path';
import mongoose from 'mongoose';
import multer from 'multer';
import fs from 'fs';
import { AuthenticatedRequest } from '../types';
import SalesCallRecording from '../models/SalesCallRecording';
import { processCallRecording } from '../services/salesCallRecordingService';

// ── Multer config ─────────────────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = [
  'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/wav', 'audio/x-wav',
  'audio/ogg', 'audio/webm', 'video/mp4', 'video/webm',
  'audio/m4a', 'audio/x-m4a',
];
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(process.cwd(), 'uploads', 'sales-calls');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp3';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
}).single('audio');

// ── Helpers ───────────────────────────────────────────────────────────────────
function relPath(absPath: string): string {
  return absPath.replace(process.cwd(), '').replace(/\\/g, '/').replace(/^\//, '');
}

// ── Controllers ───────────────────────────────────────────────────────────────

// POST /api/v1/sales-call-recordings
export const uploadRecording = async (req: AuthenticatedRequest, res: Response) => {
  uploadMiddleware(req as any, res as any, async (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    const file = (req as any).file;
    if (!file) return res.status(400).json({ success: false, message: 'No audio file provided' });

    const { leadId, notes } = req.body;
    if (!leadId) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ success: false, message: 'leadId is required' });
    }

    try {
      const recording = await SalesCallRecording.create({
        tenantId: new mongoose.Types.ObjectId(req.tenantId!),
        leadId: new mongoose.Types.ObjectId(leadId),
        recordedBy: new mongoose.Types.ObjectId(req.user!.id),
        audioUrl: relPath(file.path),
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        notes,
        status: 'uploaded',
        processingProgress: 0,
      });

      // Fire-and-forget transcription + analysis
      processCallRecording(recording._id.toString()).catch((e) =>
        console.error('[SALES-CALL] Async processing error:', e.message)
      );

      res.status(201).json({ success: true, data: recording, message: 'Recording uploaded and queued for analysis' });
    } catch (error: any) {
      fs.unlinkSync(file.path);
      res.status(500).json({ success: false, message: error.message });
    }
  });
};

// GET /api/v1/sales-call-recordings?leadId=xxx
export const getRecordingsForLead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { leadId } = req.query;
    if (!leadId) return res.status(400).json({ success: false, message: 'leadId is required' });

    const recordings = await SalesCallRecording.find({
      tenantId: new mongoose.Types.ObjectId(req.tenantId!),
      leadId: new mongoose.Types.ObjectId(leadId as string),
    })
      .populate('recordedBy', 'name email')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: recordings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/v1/sales-call-recordings/:id
export const getRecordingById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const recording = await SalesCallRecording.findOne({
      _id: req.params.id,
      tenantId: new mongoose.Types.ObjectId(req.tenantId!),
    })
      .populate('recordedBy', 'name email')
      .populate('reviewedBy', 'name email');

    if (!recording) return res.status(404).json({ success: false, message: 'Recording not found' });
    res.json({ success: true, data: recording });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/v1/sales-call-recordings/:id/reanalyze
export const reanalyzeRecording = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const recording = await SalesCallRecording.findOne({
      _id: req.params.id,
      tenantId: new mongoose.Types.ObjectId(req.tenantId!),
    });
    if (!recording) return res.status(404).json({ success: false, message: 'Recording not found' });
    if (recording.status === 'processing') {
      return res.status(409).json({ success: false, message: 'Already processing' });
    }

    await SalesCallRecording.findByIdAndUpdate(req.params.id, {
      status: 'uploaded',
      processingProgress: 0,
      errorMessage: undefined,
    });

    processCallRecording(req.params.id).catch((e) =>
      console.error('[SALES-CALL] Re-analyze error:', e.message)
    );

    res.json({ success: true, message: 'Re-analysis started' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/v1/sales-call-recordings/:id/notes
export const updateNotes = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { notes } = req.body;
    const recording = await SalesCallRecording.findOneAndUpdate(
      { _id: req.params.id, tenantId: new mongoose.Types.ObjectId(req.tenantId!) },
      { $set: { notes, reviewedBy: new mongoose.Types.ObjectId(req.user!.id), reviewedAt: new Date() } },
      { new: true }
    );
    if (!recording) return res.status(404).json({ success: false, message: 'Recording not found' });
    res.json({ success: true, data: recording });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/v1/sales-call-recordings/:id
export const deleteRecording = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const recording = await SalesCallRecording.findOne({
      _id: req.params.id,
      tenantId: new mongoose.Types.ObjectId(req.tenantId!),
    });
    if (!recording) return res.status(404).json({ success: false, message: 'Recording not found' });

    // Remove file from disk
    const filePath = path.join(process.cwd(), recording.audioUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await recording.deleteOne();
    res.json({ success: true, message: 'Recording deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
