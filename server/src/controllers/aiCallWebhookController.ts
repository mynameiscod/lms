/**
 * aiCallWebhookController.ts
 * Handles Exotel webhook callbacks after a call completes.
 *
 * Flow:
 *   1. Exotel POST → parse callSid, status, recordingUrl
 *   2. Find lead by callSid in aiCallLogs
 *   3. Update lead call log with outcome/duration/recordingUrl
 *   4. If answered + recordingUrl → process transcript with OpenAI
 *   5. Score lead (0-100), classify (HOT/WARM/COLD/JUNK)
 *   6. If score ≥ threshold → assign to counselor via existing leadScoringService
 *   7. Schedule retry if not answered and attempts < max
 */
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { getOpenAI } from '../services/aiClients';
import axios from 'axios';
import Lead from '../models/Lead';
import AICallConfig from '../models/AICallConfig';
import { mapExotelStatus, ExotelCallbackPayload } from '../services/exotelService';
import { enqueueAICallRetry } from '../services/aiCallQueueService';
import { autoAssignLead } from '../services/leadDistributionService';


/**
 * POST /api/v1/ai-calls/webhook/exotel
 * Public — called directly by Exotel servers.
 */
export const handleExotelWebhook = async (req: Request, res: Response): Promise<void> => {
  // Always ACK immediately to prevent Exotel timeout
  res.status(200).send('OK');

  try {
    const payload = req.body as ExotelCallbackPayload;
    const callSid = payload.CallSid;
    const exotelStatus = payload.CallStatus || payload.Direction;
    const recordingUrl = payload.RecordingUrl;
    const durationStr = payload.RecordingDuration || payload.DialCallDuration || payload.Duration;
    const duration = durationStr ? parseInt(durationStr, 10) : undefined;

    if (!callSid) {
      console.warn('[AIWebhook] Received webhook without CallSid');
      return;
    }

    // Extract leadId/tenantId from CustomField
    let leadId: string | undefined;
    let tenantId: string | undefined;
    let attemptNumber = 1;
    try {
      const cf = payload.CustomField || '';
      if (cf.includes('|')) {
        // New pipe format: leadId|tenantId|attemptNumber
        const parts = cf.split('|');
        leadId = parts[0];
        tenantId = parts[1];
        attemptNumber = parseInt(parts[2] || '1', 10);
      } else {
        // Legacy JSON format
        const custom = JSON.parse(cf || '{}');
        leadId = custom.leadId;
        tenantId = custom.tenantId;
        attemptNumber = parseInt(custom.attemptNumber || '1', 10);
      }
    } catch {
      // Fallback: search by callSid
    }

    console.log(`[AIWebhook] CallSid=${callSid} status=${exotelStatus} duration=${duration} leadId=${leadId}`);

    // Find the lead
    const lead = leadId
      ? await Lead.findById(leadId)
      : await Lead.findOne({ 'aiCallLogs.callSid': callSid });

    if (!lead) {
      console.warn(`[AIWebhook] Lead not found for callSid=${callSid}`);
      return;
    }

    if (!tenantId) tenantId = lead.tenantId.toString();

    const outcome = mapExotelStatus(exotelStatus);
    const config = await AICallConfig.findOne({ tenantId });

    // Update the call log entry
    await Lead.findOneAndUpdate(
      { _id: lead._id, 'aiCallLogs.callSid': callSid },
      {
        $set: {
          'aiCallLogs.$.endedAt': new Date(),
          'aiCallLogs.$.outcome': outcome,
          'aiCallLogs.$.duration': duration,
          'aiCallLogs.$.recordingUrl': recordingUrl || null
        }
      }
    );

    if (outcome === 'answered' && recordingUrl) {
      // ── TRANSCRIPT + SCORING ──
      await processCallTranscript(lead._id.toString(), tenantId, callSid, recordingUrl, config);

    } else if (outcome === 'not_answered' || outcome === 'busy') {
      // ── SCHEDULE RETRY ──
      const maxAttempts = config?.retry.maxAttempts ?? 3;
      const retryGapMinutes = config?.retry.retryGapMinutes ?? 30;

      if (attemptNumber < maxAttempts) {
        const delayMs = retryGapMinutes * 60 * 1000;
        await Lead.findByIdAndUpdate(lead._id, {
          aiCallStatus: 'not_answered',
          nextAICallAt: new Date(Date.now() + delayMs)
        });
        await enqueueAICallRetry(lead._id.toString(), tenantId, attemptNumber + 1, delayMs);
        console.log(`[AIWebhook] Retry scheduled for lead=${lead._id} attempt=${attemptNumber + 1}`);
      } else {
        await Lead.findByIdAndUpdate(lead._id, { aiCallStatus: 'failed' });
        // WhatsApp fallback
        if (config?.whatsappFallback.enabled) {
          console.log(`[AIWebhook] Max retries reached for lead=${lead._id} — WhatsApp fallback`);
        }
      }

      // Log activity
      await Lead.findByIdAndUpdate(lead._id, {
        $push: {
          activities: {
            type: 'call',
            description: `AI call — ${outcome} (attempt ${attemptNumber}/${maxAttempts})`,
            createdBy: new mongoose.Types.ObjectId(),
            createdAt: new Date(),
            callOutcome: outcome === 'not_answered' ? 'not_answered' : 'not_connected',
            metadata: { aiCall: true }
          }
        }
      });

    } else {
      // Failed / other
      await Lead.findByIdAndUpdate(lead._id, { aiCallStatus: 'failed' });
    }

  } catch (err: any) {
    console.error('[AIWebhook] Processing error:', err.message);
  }
};

/**
 * Download recording, transcribe via Whisper, score via GPT-4, update lead.
 */
async function processCallTranscript(
  leadId: string,
  tenantId: string,
  callSid: string,
  recordingUrl: string,
  config: any
): Promise<void> {
  try {
    console.log(`[AIWebhook] Processing transcript for lead=${leadId}`);

    const openai = getOpenAI();
    let transcript = '';

    // Download + transcribe if OpenAI available
    if (openai && recordingUrl) {
      try {
        // Download audio from Exotel (may require auth headers)
        const audioResponse = await axios.get(recordingUrl, {
          responseType: 'arraybuffer',
          timeout: 30000
        });
        const audioBuffer = Buffer.from(audioResponse.data);

        // Transcribe with Whisper
        const { Readable } = await import('stream');
        const audioStream = Readable.from(audioBuffer) as any;
        audioStream.name = 'recording.mp3'; // Whisper needs a name

        // Use OpenAI Whisper file upload
        const { File } = await import('node:buffer');
        const audioFile = new File([audioBuffer], 'recording.mp3', { type: 'audio/mpeg' });

        const transcription = await openai.audio.transcriptions.create({
          file: audioFile as any,
          model: 'whisper-1',
          language: 'en'
        });
        transcript = transcription.text;
        console.log(`[AIWebhook] Transcript: ${transcript.substring(0, 100)}...`);

        // Save transcript in call log
        await Lead.findOneAndUpdate(
          { _id: leadId, 'aiCallLogs.callSid': callSid },
          { $set: { 'aiCallLogs.$.transcript': transcript } }
        );
      } catch (transcriptErr: any) {
        console.error('[AIWebhook] Transcription error:', transcriptErr.message);
        transcript = '[Transcription unavailable]';
      }
    }

    // Score with LLM
    let aiScore = 0;
    let aiCategory: 'HOT' | 'WARM' | 'COLD' | 'JUNK' = 'COLD';
    let aiSummary = '';

    if (openai && transcript && transcript !== '[Transcription unavailable]') {
      const questions = config?.questions?.map((q: any) => q.text).join('\n') || '';
      const llmModel = config?.llmModel || 'gpt-4o-mini';

      const systemPrompt = config?.systemPrompt ||
        `You are an expert EdTech sales analyst. Analyze a lead qualification call transcript.
Return ONLY valid JSON with these fields:
{
  "score": <0-100 integer, how qualified/serious this lead is>,
  "category": <"HOT" | "WARM" | "COLD" | "JUNK">,
  "summary": <2-3 sentence summary of the conversation>,
  "keyPoints": [<key insights as string array>],
  "suggestedAction": <recommended next step for the sales team>
}
HOT = ready to enroll, clear intent, asked pricing.
WARM = interested, needs follow-up, some objections.
COLD = unsure, passive, not engaged.
JUNK = wrong number, not interested at all, abusive.`;

      try {
        const response = await openai.chat.completions.create({
          model: llmModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Qualification questions asked:\n${questions}\n\nCall transcript:\n${transcript}` }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
          max_tokens: 600
        });

        const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
        aiScore = Math.min(100, Math.max(0, parseInt(parsed.score || '0', 10)));
        aiCategory = (['HOT', 'WARM', 'COLD', 'JUNK'].includes(parsed.category) ? parsed.category : 'COLD') as any;
        aiSummary = parsed.summary || '';

        console.log(`[AIWebhook] Lead ${leadId} scored: ${aiScore} (${aiCategory})`);
      } catch (llmErr: any) {
        console.error('[AIWebhook] LLM scoring error:', llmErr.message);
        // Fallback: mark as WARM if call was answered
        aiScore = 30;
        aiCategory = 'WARM';
      }
    } else {
      // No transcript — still mark as answered, manual review needed
      aiScore = 20;
      aiCategory = 'WARM';
      aiSummary = 'Call was answered but transcript could not be generated.';
    }

    // Map AI score back to existing priority system
    const hotThreshold = config?.scoring?.hotThreshold ?? 75;
    const warmThreshold = config?.scoring?.warmThreshold ?? 40;
    let newPriority: 'hot' | 'warm' | 'cold' = 'cold';
    if (aiScore >= hotThreshold) newPriority = 'hot';
    else if (aiScore >= warmThreshold) newPriority = 'warm';

    // Update lead with AI results
    await Lead.findByIdAndUpdate(leadId, {
      aiCallStatus: 'completed',
      aiQualificationScore: aiScore,
      aiCategory,
      priority: newPriority,
      'aiSummary.generatedAt': new Date(),
      'aiSummary.summary': aiSummary,
      'aiSummary.seriousnessScore': Math.round(aiScore / 10),
      'aiSummary.conversionProbability': aiScore >= hotThreshold ? 'high' : aiScore >= warmThreshold ? 'medium' : 'low',
      'aiSummary.generatedBy': config?.llmModel || 'gpt-4o-mini',
      $push: {
        activities: {
          type: 'call',
          description: `AI qualification call completed — Score: ${aiScore}/100, Category: ${aiCategory}`,
          createdBy: new mongoose.Types.ObjectId(),
          createdAt: new Date(),
          callOutcome: 'connected',
          callStatus: 'completed',
          recordingUrl,
          metadata: { aiCall: true, aiScore, aiCategory, transcript: transcript?.substring(0, 500) }
        }
      }
    });

    // Update config stats
    await AICallConfig.findOneAndUpdate(
      { tenantId },
      {
        $inc: {
          'stats.totalAnswered': 1,
          ...(aiScore >= (config?.scoring?.assignOnScore ?? 40) ? { 'stats.totalQualified': 1 } : {})
        },
        $set: { 'stats.lastUpdatedAt': new Date() }
      }
    );

    // Auto-assign if qualified
    const assignOnScore = config?.scoring?.assignOnScore ?? 40;
    if (aiScore >= assignOnScore) {
      console.log(`[AIWebhook] Lead ${leadId} qualified (${aiScore}), triggering assignment`);
      autoAssignLead(tenantId, leadId).catch(err =>
        console.error('[AIWebhook] Auto-assign error:', err)
      );
    }

  } catch (err: any) {
    console.error(`[AIWebhook] processCallTranscript error for lead=${leadId}:`, err.message);
  }
}
