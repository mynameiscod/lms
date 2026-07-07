import { Request, Response } from 'express';
import MentorChat from '../models/MentorChat';
import { buildStudentContext, mentorReply, MENTOR_SUGGESTIONS } from '../services/aiMentorService';

const tId = (req: Request) => (req as any).tenantId as string;
const uId = (req: Request) => (req as any).user?.id as string;

// GET /ai-mentor — the student's running conversation (creates an empty one if none).
export const getChat = async (req: Request, res: Response) => {
  try {
    let chat = await MentorChat.findOne({ tenantId: tId(req), studentId: uId(req) }).lean();
    if (!chat) {
      const created = await MentorChat.create({ tenantId: tId(req), studentId: uId(req), messages: [] });
      chat = created.toObject();
    }
    res.json({ messages: chat.messages || [], suggestions: MENTOR_SUGGESTIONS });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load mentor chat', error: String(err) });
  }
};

// POST /ai-mentor/message { message } — append, generate a grounded reply, persist.
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const message = String(req.body?.message || '').trim();
    if (!message) return res.status(400).json({ message: 'message is required' });
    if (message.length > 4000) return res.status(400).json({ message: 'message too long' });

    let chat = await MentorChat.findOne({ tenantId: tId(req), studentId: uId(req) });
    if (!chat) chat = await MentorChat.create({ tenantId: tId(req), studentId: uId(req), messages: [] });

    const context = await buildStudentContext(uId(req), tId(req));
    const reply = await mentorReply(context, chat.messages as any, message);

    chat.messages.push({ role: 'user', content: message, at: new Date() } as any);
    chat.messages.push({ role: 'assistant', content: reply, at: new Date() } as any);
    // Keep the stored history bounded.
    if (chat.messages.length > 100) chat.messages = chat.messages.slice(-100) as any;
    await chat.save();

    res.json({ reply, messages: chat.messages });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || 'Mentor reply failed', error: String(err) });
  }
};

// DELETE /ai-mentor — clear the conversation.
export const clearChat = async (req: Request, res: Response) => {
  try {
    await MentorChat.findOneAndUpdate(
      { tenantId: tId(req), studentId: uId(req) },
      { $set: { messages: [] } },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to clear chat', error: String(err) });
  }
};
