const threadDoc: any = { _id: 't1', assignedTo: null, lastInboundAt: null };
const updates: any[] = [];
jest.mock('../models/WhatsAppThread', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(() => ({ select: () => ({ lean: async () => threadDoc }) })),
    updateOne: jest.fn(async (_f: any, u: any) => { updates.push(u); return { modifiedCount: 1 }; }),
  },
}));
jest.mock('../models/WhatsAppQuickReply', () => ({ __esModule: true, default: { countDocuments: jest.fn(async () => 0), create: jest.fn(async (d: any) => d) } }));
jest.mock('../models/PlacementCandidate', () => ({ __esModule: true, default: {} }));
jest.mock('../models/Lead', () => ({ __esModule: true, default: {} }));
const staffUsers = [
  { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', firstName: 'Arun', role: 'STAFF', customRoleId: 'r1' },
  { _id: 'bbbbbbbbbbbbbbbbbbbbbbbb', firstName: 'Bina', role: 'STAFF', customRoleId: 'r2' },
];
jest.mock('../models/User', () => ({ __esModule: true, default: { find: jest.fn(() => ({ select: () => ({ limit: () => ({ lean: async () => staffUsers }) }) })) } }));
jest.mock('../middleware/roleGuard', () => ({
  permissionsOf: jest.fn(async (u: any) => (u.customRoleId === 'r1' ? ['chat_whatsapp'] : ['view_leads'])),
}));
jest.mock('../notifications/notificationService', () => ({ createNotifications: jest.fn(async () => {}) }));
jest.mock('../realtime/whatsAppChatRealtime', () => ({ emitWaThread: jest.fn(), emitWaUser: jest.fn() }));
jest.mock('../services/assessmentOtpService', () => ({
  getWhatsAppCredentialCandidates: jest.fn(async () => [{ phoneNumberId: '1', accessToken: 't' }]),
  waPost: jest.fn(async () => ({ ok: true, messageId: 'w1' })),
  normalizeTo: (p: string) => { const d = String(p).replace(/\D/g, ''); return d.length === 10 ? `91${d}` : d; },
}));

import { assignThread, saveQuickReply, InboxError } from '../services/whatsAppChatInbox';
import { sendMedia, ChatError } from '../services/whatsAppChatService';

const T = '69c7723868202a8e4616ef3d';
const ARUN = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const BINA = 'bbbbbbbbbbbbbbbbbbbbbbbb';

describe('assigning a conversation', () => {
  beforeEach(() => { threadDoc.assignedTo = null; updates.length = 0; });

  it('lets anyone who can chat take an unowned conversation', async () => {
    await assignThread(T, { id: ARUN, isAdmin: false }, '919876543210', ARUN);
    expect(String(updates[0].$set.assignedTo)).toBe(ARUN);
  });

  it('stops a non-admin taking a conversation someone else owns', async () => {
    threadDoc.assignedTo = BINA;
    await expect(assignThread(T, { id: ARUN, isAdmin: false }, '919876543210', ARUN)).rejects.toBeInstanceOf(InboxError);
  });

  it('lets the owner release it', async () => {
    threadDoc.assignedTo = ARUN;
    await assignThread(T, { id: ARUN, isAdmin: false }, '919876543210', null);
    expect(updates[0].$set.assignedTo).toBeNull();
  });

  it('refuses to assign to someone without the chat permission, even for an admin', async () => {
    await expect(assignThread(T, { id: ARUN, isAdmin: true }, '919876543210', BINA)).rejects.toThrow(/cannot use WhatsApp chat/);
  });
});

describe('quick replies', () => {
  it('needs a title and a message', async () => {
    await expect(saveQuickReply(T, ARUN, null, { title: '', body: 'x' })).rejects.toBeInstanceOf(InboxError);
    await expect(saveQuickReply(T, ARUN, null, { title: 'Fees', body: '  ' })).rejects.toBeInstanceOf(InboxError);
  });
  it('saves a valid one', async () => {
    await expect(saveQuickReply(T, ARUN, null, { title: 'Fees', body: 'Hi {name}, the fee is ₹25,000.' })).resolves.toMatchObject({ title: 'Fees' });
  });
});

describe('sending a file', () => {
  const pdf = { buffer: Buffer.from('%PDF'), mimetype: 'application/pdf', originalname: 'brochure.pdf', size: 4 };

  it('rejects types WhatsApp cannot send', async () => {
    threadDoc.lastInboundAt = new Date();
    await expect(sendMedia(T, ARUN, '9876543210', { ...pdf, mimetype: 'application/zip', originalname: 'a.zip' })).rejects.toThrow(/cannot send this kind of file/);
  });

  it('rejects photos over 5 MB', async () => {
    threadDoc.lastInboundAt = new Date();
    await expect(sendMedia(T, ARUN, '9876543210', { ...pdf, mimetype: 'image/jpeg', originalname: 'a.jpg', size: 6 * 1024 * 1024 })).rejects.toThrow(/5 MB/);
  });

  it('refuses when the 24-hour window is closed', async () => {
    threadDoc.lastInboundAt = new Date(Date.now() - 30 * 3600_000);
    await expect(sendMedia(T, ARUN, '9876543210', pdf)).rejects.toBeInstanceOf(ChatError);
  });
});
