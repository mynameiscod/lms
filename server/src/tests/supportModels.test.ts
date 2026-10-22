/**
 * Help & Support models — the validation that holds whatever a controller does. No database:
 * validateSync runs the schema rules and the pre-validate hooks run through validate().
 */
import mongoose from 'mongoose';
import SupportTicket from '../models/SupportTicket';
import SupportMessage from '../models/SupportMessage';
import SupportChatSession from '../models/SupportChatSession';
import SupportFaq from '../models/SupportFaq';
import SupportConfiguration from '../models/SupportConfiguration';
import { formatTicketNumber, yearOf } from '../services/supportTicketNumber';
import { LIMITS } from '../data/supportPolicy';

const id = () => new mongoose.Types.ObjectId();
const errorsOf = async (doc: mongoose.Document) => {
  try { await doc.validate(); return {}; } catch (e: any) { return e.errors || {}; }
};

const ticket = (over: Record<string, unknown> = {}) => new SupportTicket({
  tenantId: id(), ticketNumber: 'SUP-26-00001', requesterId: id(), requesterRole: 'STUDENT',
  subject: 'Cannot open day 3', description: 'The page spins.', ...over,
});

describe('SupportTicket', () => {
  it('accepts a minimal ticket and fills the defaults', async () => {
    const t = ticket();
    expect(await errorsOf(t)).toEqual({});
    expect(t.status).toBe('open');
    expect(t.priority).toBe('medium');
    expect(t.source).toBe('help_center');
    expect(t.diagnosticsConsent).toBe(false);
    expect(t.reopenCount).toBe(0);
  });

  it('requires the identity fields and a subject', async () => {
    const e = await errorsOf(new SupportTicket({ subject: 'x' }));
    for (const f of ['tenantId', 'ticketNumber', 'requesterId', 'requesterRole', 'description']) expect(e[f]).toBeDefined();
    expect(e.subject).toBeDefined(); // too short
  });

  it('rejects values outside the lists and over the limits', async () => {
    const e = await errorsOf(ticket({ status: 'deleted', priority: 'urgent', module: 'nope', category: 'x', source: 'email', subject: 'a'.repeat(LIMITS.subject + 1), description: 'a'.repeat(LIMITS.body + 1) }));
    for (const f of ['status', 'priority', 'module', 'category', 'source', 'subject', 'description']) expect(e[f]).toBeDefined();
  });

  it('only takes ticket numbers in the generated format', async () => {
    expect((await errorsOf(ticket({ ticketNumber: '42' }))).ticketNumber).toBeDefined();
    expect((await errorsOf(ticket({ ticketNumber: 'SUP-26-123' }))).ticketNumber).toBeDefined();
    expect(await errorsOf(ticket({ ticketNumber: 'SUP-26-123456' }))).toEqual({});
  });

  it('refuses diagnostics without consent', async () => {
    expect((await errorsOf(ticket({ diagnostics: { summary: 'browser: x' } }))).diagnostics).toBeDefined();
    expect(await errorsOf(ticket({ diagnosticsConsent: true, diagnostics: { summary: 'browser: x' } }))).toEqual({});
  });
});

describe('SupportMessage', () => {
  const msg = (over: Record<string, unknown> = {}) => new SupportMessage({ tenantId: id(), ticketId: id(), authorKind: 'staff', body: 'Hello', ...over });

  it('is public unless marked internal', async () => {
    const m = msg();
    expect(await errorsOf(m)).toEqual({});
    expect(m.visibility).toBe('public');
  });

  it('a requester can never write an internal note', async () => {
    expect((await errorsOf(msg({ authorKind: 'requester', visibility: 'internal' }))).visibility).toBeDefined();
    expect(await errorsOf(msg({ authorKind: 'staff', visibility: 'internal' }))).toEqual({});
  });

  it('needs a body within the limit', async () => {
    expect((await errorsOf(msg({ body: '   ' }))).body).toBeDefined();
    expect((await errorsOf(msg({ body: 'a'.repeat(LIMITS.body + 1) }))).body).toBeDefined();
  });
});

describe('SupportFaq', () => {
  const faq = (over: Record<string, unknown> = {}) => new SupportFaq({ question: 'How do I reset my password?', answer: 'Steps…', category: 'Account', ...over });

  it('starts as a draft awaiting review', async () => {
    const f = faq();
    expect(await errorsOf(f)).toEqual({});
    expect(f.status).toBe('draft');
    expect(f.needsOwnerReview).toBe(true);
  });

  it('cannot be published until reviewed, and publishing stamps the date', async () => {
    expect((await errorsOf(faq({ status: 'published' }))).status).toBeDefined();
    const ok = faq({ status: 'published', needsOwnerReview: false });
    expect(await errorsOf(ok)).toEqual({});
    expect(ok.publishedAt).toBeInstanceOf(Date);
  });

  it('rejects unknown audiences and statuses', async () => {
    const e = await errorsOf(faq({ audiences: ['parents'], status: 'live' }));
    expect(e['audiences.0']).toBeDefined();
    expect(e.status).toBeDefined();
  });

  it('declares the weighted text index search relies on', () => {
    const text = SupportFaq.schema.indexes().find(([fields]) => Object.values(fields).includes('text'));
    expect(text).toBeDefined();
    expect(text![1]).toMatchObject({ weights: { question: 10, keywords: 6, answer: 1 } });
  });
});

describe('SupportChatSession', () => {
  it('caps the stored history', async () => {
    const turns = Array.from({ length: LIMITS.chatHistory + 1 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `t${i}` }));
    expect((await errorsOf(new SupportChatSession({ tenantId: id(), userId: id(), turns }))).turns).toBeDefined();
    expect(await errorsOf(new SupportChatSession({ tenantId: id(), userId: id(), turns: turns.slice(1) }))).toEqual({});
  });
});

describe('SupportConfiguration', () => {
  it('is empty by default: no targets at all', async () => {
    const c = new SupportConfiguration({ tenantId: id() });
    expect(await errorsOf(c)).toEqual({});
    const o: any = c.toObject();
    expect(o.firstResponseMinutes).toEqual({ low: null, medium: null, high: null, critical: null });
    expect(o.resolutionMinutes).toEqual({ low: null, medium: null, high: null, critical: null });
    expect(o.reopen).toEqual({ allowed: null, windowDays: null, maxReopens: null });
  });

  it('refuses nonsense targets', async () => {
    const e = await errorsOf(new SupportConfiguration({ firstResponseMinutes: { high: 0 }, incident: { minTickets: 1 }, retention: { chatDays: -5 } }));
    expect(e['firstResponseMinutes.high']).toBeDefined();
    expect(e['incident.minTickets']).toBeDefined();
    expect(e['retention.chatDays']).toBeDefined();
  });
});

describe('ticket number format', () => {
  it('pads to five digits and grows past them', () => {
    expect(formatTicketNumber('26', 7)).toBe('SUP-26-00007');
    expect(formatTicketNumber('26', 123456)).toBe('SUP-26-123456');
  });

  it('uses the Indian calendar year', () => {
    // 31 Dec 2026 20:00 UTC is already 1 Jan 2027 in India.
    expect(yearOf(new Date('2026-12-31T20:00:00Z'))).toBe('27');
    expect(yearOf(new Date('2026-12-31T10:00:00Z'))).toBe('26');
  });
});
