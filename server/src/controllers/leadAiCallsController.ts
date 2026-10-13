import { Response } from 'express';
import mongoose from 'mongoose';
import Lead from '../models/Lead';
import OutperoCall from '../models/OutperoCall';
import { AuthenticatedRequest } from '../types';
import { buildLeadScopeFilter } from '../middleware/leadScope';
import * as bunny from '../services/bunnyStorageService';
import { linkIsLive } from '../services/outperoCallAnalysisService';

/**
 * The AI calls made to one lead, and their recordings, for the lead page. Only people who may open
 * that lead (the same rule the lead page itself uses) can see them.
 */

async function visibleLead(req: AuthenticatedRequest) {
  if (!mongoose.isValidObjectId(req.params.leadId)) return null;
  const scope = await buildLeadScopeFilter(req);
  return Lead.findOne({ _id: req.params.leadId, tenantId: req.tenantId, ...scope }).select('_id').lean();
}

export const listLeadAiCalls = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!(await visibleLead(req))) return res.status(404).json({ success: false, message: 'Lead not found' });
    const rows: any[] = await OutperoCall.find({ tenantId: req.tenantId, leadId: req.params.leadId }).sort({ startedAt: -1, createdAt: -1 }).limit(50)
      .select('callId startedAt createdAt durationSec status outcome summary transcript analysis analysisError recordingUrl recordingKey variables').lean();
    const data = rows.map((c) => {
      const captured = Object.fromEntries(Object.entries(c.variables || {}).filter(([, v]) => v !== '' && v !== null && v !== undefined));
      return {
        callId: c.callId, at: c.startedAt || c.createdAt, durationSec: c.durationSec, status: c.status, outcome: c.outcome,
        summary: c.summary, transcript: c.transcript ? String(c.transcript).slice(0, 30_000) : undefined, analysis: c.analysis || undefined,
        captured: Object.keys(captured).length ? captured : undefined,
        // Can it be played? Our own copy always; Outpero's link only while it still works.
        recording: c.recordingKey ? 'stored' : (c.recordingUrl && linkIsLive(c.recordingUrl) ? 'link' : (c.recordingUrl ? 'expired' : 'none')),
      };
    });
    res.json({ success: true, data });
  } catch (e: any) {
    console.error('[lead-ai-calls]', e?.message);
    res.status(500).json({ success: false, message: 'Could not load the AI calls' });
  }
};

export const streamLeadAiCallRecording = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!(await visibleLead(req))) return res.status(404).json({ success: false, message: 'Lead not found' });
    const call: any = await OutperoCall.findOne({ tenantId: req.tenantId, leadId: req.params.leadId, callId: req.params.callId }).select('recordingKey recordingUrl').lean();
    if (!call) return res.status(404).json({ success: false, message: 'Call not found' });
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    if (call.recordingKey && bunny.isBunnyStorageConfigured()) {
      const { stream, size } = await bunny.getFileStream(call.recordingKey);
      if (size) res.setHeader('Content-Length', String(size));
      stream.pipe(res);
      return;
    }
    if (call.recordingUrl && /^https:\/\//i.test(call.recordingUrl) && linkIsLive(call.recordingUrl)) {
      const r = await fetch(call.recordingUrl, { signal: AbortSignal.timeout(60_000) });
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer());
        res.setHeader('Content-Length', String(buf.length));
        return void res.end(buf);
      }
    }
    res.removeHeader('Content-Type');
    res.status(410).json({ success: false, message: 'The recording link from Outpero has expired and no copy was saved.' });
  } catch (e: any) {
    console.error('[lead-ai-calls] recording', e?.message);
    if (!res.headersSent) res.status(500).json({ success: false, message: 'Could not load the recording' });
  }
};
