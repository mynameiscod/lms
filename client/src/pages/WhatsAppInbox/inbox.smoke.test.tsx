/**
 * Smoke test: the WhatsApp Inbox shows who needs a reply, who owns each chat, what automation is
 * running, the filters, the details panel and who sent each message — without crashing.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import WhatsAppInbox from './index';

jest.mock('axios', () => ({ __esModule: true, default: { create: () => ({ interceptors: { request: { use: () => 0 } } }) } }));
jest.mock('../../components/WhatsAppChat/useWaLive', () => ({ useWaLive: () => {} }));

const mockInboxCalls: any[] = [];
const mockRows = [
  { phone: '919182701438', name: 'Geetha', links: { leadId: 'l1' }, lastPreview: 'Year of graduation - 2027', lastMessageAt: new Date().toISOString(), lastInboundAt: new Date(Date.now() - 22.5 * 3600_000).toISOString(), unreadCount: 2, assignedTo: { _id: 'u1', name: 'Siva Prasad' }, ownerFrom: 'lead', status: 'needs_reply', waitingSince: new Date(Date.now() - 2 * 3600_000).toISOString(), lead: { stage: { name: 'Demo Booked', color: '#F59E0B' }, source: 'facebook', priority: 'hot' } },
  { phone: '919000000003', name: '', contactName: 'Chintu', links: {}, lastPreview: 'Which course?', lastMessageAt: new Date().toISOString(), unreadCount: 0, assignedTo: null, ownerFrom: null, status: 'automation', lead: null },
  { phone: '919000000004', name: 'Ravi', links: { leadId: 'l2' }, lastPreview: 'ok', lastMessageAt: new Date().toISOString(), unreadCount: 0, assignedTo: null, ownerFrom: null, status: 'waiting_lead', lead: { stage: null, source: 'website', priority: '' } },
];
const mockThread = {
  phone: '919182701438', hasMore: false, window: { open: true, closesAt: new Date(Date.now() + 3600_000).toISOString() }, botPaused: true, unreadCount: 0,
  contactName: 'geethaa', lastStaffReply: null, assignedTo: { _id: 'u1', name: 'Siva Prasad' }, ownerFrom: 'lead', links: { leadId: 'l1' },
  messages: [
    { _id: 'm1', direction: 'in', kind: 'text', body: 'Interested', hasMedia: false, status: 'received', source: 'person', createdAt: '2026-11-18T15:03:00Z' },
    { _id: 'm2', direction: 'out', kind: 'text', body: "What's your full name?", hasMedia: false, status: 'read', source: 'bot', createdAt: '2026-11-18T15:03:00Z' },
    { _id: 'm3', direction: 'out', kind: 'text', body: 'our team will contact you', hasMedia: false, status: 'read', source: 'chat', sentBy: 'Siva Prasad', createdAt: '2026-11-18T15:03:00Z' },
    { _id: 'm4', direction: 'out', kind: 'note', body: '🤖 Old bot stopped after question 2 — Siva Prasad took over this chat', hasMedia: false, status: 'sent', source: 'system', createdAt: '2026-11-18T15:03:00Z' },
    { _id: 'm5', direction: 'out', kind: 'template', templateName: 'welcome_1', body: 'Hi Geetha', hasMedia: false, status: 'delivered', source: 'automation', createdAt: '2026-11-18T15:04:00Z' },
  ],
};
const mockContext = {
  owner: { _id: 'u1', name: 'Siva Prasad', from: 'lead' },
  lead: { _id: 'l1', name: 'Geetha', email: '', source: 'facebook', stage: { name: 'Demo Booked', color: '#F59E0B' }, subStage: '', priority: 'hot', score: 12, courses: ['Java Full Stack'], nextFollowUp: null, lastContactedAt: null, lastCallOutcome: '', createdAt: '2026-11-18T15:00:00Z', savedOnLead: [{ label: 'Passout Year', value: '2027' }] },
  placement: null, student: null,
  automation: { workflows: [{ name: 'New lead: welcome + questions', workflowId: 'w1', status: 'stopped', waitingFor: null, note: 'Siva Prasad took over the chat', at: '2026-11-18T15:05:00Z' }], bot: { step: 'in_progress', asked: 2, total: 5, paused: true, live: false } },
  answers: [{ question: "What's your full name?", answer: 'Kundrapu Geetha divya sri', from: 'Old bot' }],
};

jest.mock('../../api/whatsAppChatApi', () => ({
  chatErr: (e: any) => String(e?.message || e),
  whatsAppChatApi: {
    inbox: async (q: any) => { mockInboxCalls.push(q); return { rows: mockRows, total: 3, page: 1, limit: 30, counts: { all: 641, needs_reply: 12, automation: 4, unread: 213, mine: 36, unassigned: 40 } }; },
    inboxOptions: async () => ({ staff: [{ _id: 'u1', name: 'Siva Prasad' }], stages: [{ _id: 's1', name: 'Demo Booked', color: '#F59E0B' }], sources: ['facebook', 'website'] }),
    thread: async () => mockThread,
    context: async () => mockContext,
    staff: async () => ({ staff: [{ _id: 'u1', name: 'Siva Prasad' }], canReassign: true, me: 'u1' }),
    markRead: async () => ({}),
    markHandled: async () => ({}),
    templates: async () => [],
  },
}));

async function render(path: string) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => {
    root.render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/whatsapp-inbox" element={<WhatsAppInbox />} /></Routes></MemoryRouter>);
  });
  await act(async () => { await new Promise(r => setTimeout(r, 30)); });
  return { el, done: () => { act(() => root.unmount()); el.remove(); } };
}

beforeAll(() => { (Element.prototype as any).scrollIntoView = () => {}; });

it('list: status per chat, one owner, stage and source, and the filters', async () => {
  const { el, done } = await render('/whatsapp-inbox');
  const t = el.textContent || '';
  for (const s of ['Needs reply', 'No counsellor', 'Automation', 'Automation running', 'Waiting for them', 'Demo Booked', 'Facebook', 'Siva Prasad', 'Not in CRM', 'All counsellors', 'All stages', 'All sources', 'Any reply window']) expect(t).toContain(s);
  expect(t).toMatch(/m to reply/); // 22.5h since they wrote → closing soon

  const stage = el.querySelector('select[aria-label="Lead stage"]') as HTMLSelectElement;
  await act(async () => {
    const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!;
    set.call(stage, 's1');
    stage.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await act(async () => { await new Promise(r => setTimeout(r, 10)); });
  expect(mockInboxCalls[mockInboxCalls.length - 1]).toMatchObject({ stageId: 's1', filter: 'all' });
  expect(el.textContent).toContain('Clear filters (1)');
  done();
});

it('conversation: who sent each message, system notes, counsellor, details panel', async () => {
  const { el, done } = await render('/whatsapp-inbox?phone=919182701438');
  const t = el.textContent || '';
  for (const s of ['Old bot', 'Workflow · template welcome_1', 'Old bot stopped after question 2', 'Counsellor', 'Old bot: off for this chat', 'Mark handled', 'Details',
    "Same person as the lead's counsellor in CRM", 'Answers they gave', 'Kundrapu Geetha divya sri', 'Passout Year', 'Message labels', 'New lead: welcome + questions', 'stopped at question 2 of 5'])
    expect(t.toLowerCase()).toContain(s.toLowerCase());
  expect(el.querySelector('.wac-tag.team')?.textContent).toContain('Siva Prasad');
  done();
});
