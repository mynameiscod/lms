import { Request, Response } from 'express';
import AiUsage from '../models/AiUsage';
import { istToday, ymd } from '../utils/planSchedule';
import * as settings from '../services/settingsService';

const MODULE_LABEL: Record<string, string> = {
  careerpilot_mission_answer: 'CareerPilot — mission answer coaching',
  thinking_lab_eval: 'Thinking Lab — feedback',
  thinking_lab_voice: 'Thinking Lab — voice eval',
  thinking_lab_voice_stt: 'Thinking Lab — voice transcription',
  thinking_lab_profile: 'Thinking Lab — profile',
  thinking_lab_gen: 'Thinking Lab — problem gen',
  thinking_lab_explain: 'Thinking Lab — explainer',
  thinking_lab: 'Thinking Lab',
  question_gen: 'Question generation (quiz/drill/assessment)',
  drill: 'Logic Building drills',
  whisper: 'Speech-to-text',
  speaking_stt: 'Speaking Practice — transcription',
};

// GET /ai-usage/summary?days=30
export const summary = async (req: Request, res: Response) => {
  try {
    const days = Math.max(1, Math.min(180, Number(req.query.days) || 30));
    const start = istToday(); start.setDate(start.getDate() - (days - 1));
    const fromStr = ymd(start);
    const todayStr = ymd(istToday());
    const match: any = { date: { $gte: fromStr } };

    const round = (n: number) => Math.round((n || 0) * 100) / 100;

    const [totals, todayAgg, byDay, byModule, byProvider, byModel, recent, byProduct] = await Promise.all([
      AiUsage.aggregate([{ $match: match }, { $group: { _id: null, inr: { $sum: '$costInr' }, usd: { $sum: '$costUsd' }, calls: { $sum: 1 }, inTok: { $sum: '$inputTokens' }, outTok: { $sum: '$outputTokens' } } }]),
      AiUsage.aggregate([{ $match: { date: todayStr } }, { $group: { _id: null, inr: { $sum: '$costInr' }, calls: { $sum: 1 } } }]),
      AiUsage.aggregate([{ $match: match }, { $group: { _id: '$date', inr: { $sum: '$costInr' }, calls: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      AiUsage.aggregate([{ $match: match }, { $group: { _id: '$module', inr: { $sum: '$costInr' }, calls: { $sum: 1 }, inTok: { $sum: '$inputTokens' }, outTok: { $sum: '$outputTokens' } } }, { $sort: { inr: -1 } }]),
      AiUsage.aggregate([{ $match: match }, { $group: { _id: '$provider', inr: { $sum: '$costInr' }, calls: { $sum: 1 } } }, { $sort: { inr: -1 } }]),
      AiUsage.aggregate([{ $match: match }, { $group: { _id: '$aiModel', inr: { $sum: '$costInr' }, calls: { $sum: 1 } } }, { $sort: { inr: -1 } }]),
      AiUsage.find(match).sort({ createdAt: -1 }).limit(40).lean(),
      // Spend split by PRODUCT. Rows written before this field existed have no product;
      // $ifNull folds them into 'lms' rather than showing an "unknown" bucket that only
      // means "older than the feature".
      AiUsage.aggregate([
        { $match: match },
        { $group: { _id: { $ifNull: ['$product', 'lms'] }, inr: { $sum: '$costInr' }, calls: { $sum: 1 }, inTok: { $sum: '$inputTokens' }, outTok: { $sum: '$outputTokens' } } },
        { $sort: { inr: -1 } },
      ]),
    ]);

    // Fill missing days with zero so the chart is continuous.
    const dayMap: Record<string, { inr: number; calls: number }> = {};
    byDay.forEach((d: any) => { dayMap[d._id] = { inr: round(d.inr), calls: d.calls }; });
    const series: { date: string; inr: number; calls: number }[] = [];
    for (let i = 0; i < days; i++) { const dt = new Date(start); dt.setDate(start.getDate() + i); const k = ymd(dt); series.push({ date: k, inr: dayMap[k]?.inr || 0, calls: dayMap[k]?.calls || 0 }); }

    const t = totals[0] || {};
    res.json({
      success: true,
      data: {
        days, fromDate: fromStr, usdToInr: settings.getNum('USD_TO_INR', 85),
        totalInr: round(t.inr), totalUsd: round(t.usd), totalCalls: t.calls || 0, totalTokens: (t.inTok || 0) + (t.outTok || 0),
        todayInr: round(todayAgg[0]?.inr), todayCalls: todayAgg[0]?.calls || 0,
        avgPerDayInr: round((t.inr || 0) / days),
        series,
        byModule: byModule.map((m: any) => ({ module: m._id, label: MODULE_LABEL[m._id] || m._id, inr: round(m.inr), calls: m.calls, tokens: (m.inTok || 0) + (m.outTok || 0) })),
        byProduct: byProduct.map((p: any) => ({
          product: p._id,
          label: p._id === 'careerpilot' ? 'CareerPilot' : 'LMS',
          inr: round(p.inr), calls: p.calls, tokens: (p.inTok || 0) + (p.outTok || 0),
        })),
        byProvider: byProvider.map((p: any) => ({ provider: p._id, inr: round(p.inr), calls: p.calls })),
        byModel: byModel.map((m: any) => ({ model: m._id, inr: round(m.inr), calls: m.calls })),
        recent: recent.map((r: any) => ({ date: r.date, module: MODULE_LABEL[r.module] || r.module, provider: r.provider, model: r.aiModel, inr: round(r.costInr), inTok: r.inputTokens, outTok: r.outputTokens, audioSeconds: r.audioSeconds, fellBack: r.fellBack, at: r.createdAt })),
      },
    });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};
