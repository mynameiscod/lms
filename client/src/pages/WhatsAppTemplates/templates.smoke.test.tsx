/**
 * Smoke test: WhatsApp Templates — the four tabs render with realistic data: stat cards, the
 * template table with filters and paging, Where Used groups, the delivery log with the
 * "why messages failed" explanation, and sent history with what Meta reported afterwards.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import WhatsAppTemplates from './index';

jest.mock('axios', () => ({ __esModule: true, default: { create: () => ({ interceptors: { request: { use: () => 0 } } }) } }));

const shape = (n: number) => ({ bodyVarCount: n, urlButtonIndex: -1, headerFormat: 'NONE', headerHasVars: false });
const mockTemplates = Array.from({ length: 12 }, (_, i) => ({
  _id: `t${i}`, name: i === 0 ? 'cb_batch_update_announcement' : i === 1 ? 'cb_otp' : `template_${i}`, language: 'en',
  category: i === 0 ? 'MARKETING' : i === 1 ? 'AUTHENTICATION' : 'UTILITY', status: i === 11 ? 'REJECTED' : i === 10 ? 'PENDING' : 'APPROVED',
  metaId: `m${i}`, header: { format: 'NONE' }, body: i === 0 ? '🎉 *Important Announcement – New Batch Update!*\nHi {{1}}' : `Hello {{1}}, message ${i}`,
  bodyExamples: ['Ravi'], buttons: [], source: i % 2 ? 'meta' : 'lms', updatedAt: new Date(2026, 10, 18 - i).toISOString(), shape: shape(1),
  usedBy: i === 1 ? ['Login OTP'] : [],
}));
const mockUsage = [
  { key: 'LOGIN_OTP', label: 'Login OTP', module: 'Login & sign-up', settingsKey: 'x', variables: ['code'], help: 'Sent when someone logs in with WhatsApp', assigned: { name: 'cb_otp', language: 'en', source: 'setting' } },
  { key: 'EXAM_RESULT', label: 'Exam result', module: 'Tech Battles', settingsKey: 'y', variables: ['name', 'score'], help: 'After the exam', assigned: { name: 'gone_template', language: 'en', source: 'setting' } },
  { key: 'FEE_DUE', label: 'Fee reminder', module: 'Fees', settingsKey: 'z', variables: ['name'], help: 'Before the due date', assigned: null },
];
const mockSummary = {
  days: 7, total: 188, prevTotal: 150, delivered: 226 - 75, read: 120, failed: 37, pending: 0, badNumbers: 4,
  reasons: [
    { code: 131049, count: 22, last: '2026-11-18T10:00:00Z', reason: 'Meta held this marketing message back to protect the recipient (per-person marketing limit).', advice: 'Send results, reminders and notices as UTILITY templates.', templates: ['cb_batch_update_announcement'] },
    { code: 131026, count: 10, last: '2026-11-18T10:00:00Z', reason: 'Not deliverable: the number is not on WhatsApp.', advice: 'Check the number first.', templates: ['cb_batch_update_announcement'] },
  ],
};
const mockMessages = [
  { _id: 'd1', to: '919182701438', templateName: 'cb_batch_update_announcement', source: 'broadcast', status: 'failed', errorCode: 131049, reason: 'Meta held this marketing message back', createdAt: '2026-11-18T10:33:00Z' },
  { _id: 'd2', to: '917543821296', templateName: 'cb_otp', source: 'system', status: 'read', statusAt: '2026-11-18T10:34:00Z', createdAt: '2026-11-18T10:33:00Z' },
];
const mockHistory = [{ _id: 'b1', templateName: 'cb_batch_update_announcement', audience: 'CRM leads: all stages · passout 2027 (93)', total: 93, sent: 93, failed: 0, status: 'done', failures: [], createdAt: '2026-11-18T10:33:00Z', outcome: { delivered: 50, read: 30, failed: 43, pending: 0 } }];
const mockMessageCalls: any[] = [];

jest.mock('../../api/whatsAppTemplateApi', () => ({
  errMsg: (e: any) => String(e?.message || e),
  waTemplateApi: {
    connection: async () => ({ wabaId: '123', source: 'setting' }),
    list: async () => mockTemplates,
    usage: async () => mockUsage,
    compatibility: async () => ({ LOGIN_OTP: { t1: { ok: true, errors: [], warnings: [] } }, EXAM_RESULT: {}, FEE_DUE: {} }),
    broadcasts: async () => mockHistory,
    messages: async (q: any) => { mockMessageCalls.push(q); return mockMessages; },
    messagesSummary: async () => mockSummary,
  },
}));

async function render() {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => { root.render(<MemoryRouter><WhatsAppTemplates /></MemoryRouter>); });
  await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
  const tab = async (name: string) => {
    const b = Array.from(el.querySelectorAll('[role=tab]')).find((x) => x.textContent?.startsWith(name)) as HTMLElement;
    await act(async () => { b.click(); });
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
  };
  return { el, tab, done: () => { act(() => root.unmount()); el.remove(); } };
}

it('Templates tab: stat cards, table, filters and paging', async () => {
  const { el, done } = await render();
  const t = el.textContent || '';
  for (const s of ['Templates (12)', 'Total Templates', 'Approved', '83.3%', 'In Review', 'Rejected / Paused', 'Status:', 'Category:', 'Source:', 'Export', 'cb_batch_update_announcement', 'Marketing', 'Authentication', 'Showing 1 – 10 of 12 templates']) expect(t).toContain(s);
  expect(el.querySelectorAll('.wat-table tbody tr').length).toBe(10);
  await act(async () => {
    const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!;
    set.call(el.querySelectorAll('.wat-select select')[1], 'MARKETING');
    el.querySelectorAll('.wat-select select')[1].dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect(el.querySelectorAll('.wat-table tbody tr').length).toBe(1);
  done();
});

it('Where Used: groups by module with in use / not set / issue', async () => {
  const { el, tab, done } = await render();
  await tab('Where Used');
  const t = el.textContent || '';
  for (const s of ['In Use', 'Not In Use', 'With Issues', 'Login & sign-up', 'Expand All', 'Collapse All']) expect(t).toContain(s);
  await act(async () => { (Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Expand All')) as HTMLElement).click(); });
  const t2 = el.textContent || '';
  expect(t2).toContain('Login OTP');
  expect(t2).toContain('Template not found');
  expect(t2).toContain('Not Set');
  done();
});

it('Delivery Log: totals, why messages failed with advice, filters, chat link', async () => {
  const { el, tab, done } = await render();
  await tab('Delivery Log');
  const t = el.textContent || '';
  for (const s of ['Total Sends', '25% vs previous', 'Delivered', 'Read', 'Failed', 'Why 37 of 188 messages failed', 'code 131049', 'Send results, reminders and notices as UTILITY templates.', '4 failed numbers are not a valid Indian mobile', 'Read at', '+91 91827 01438']) expect(t).toContain(s);
  expect(el.querySelector('a[href="/whatsapp-inbox?phone=919182701438"]')).toBeTruthy();
  await act(async () => { (Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Show failed only')) as HTMLElement).click(); });
  await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
  expect(mockMessageCalls[mockMessageCalls.length - 1]).toMatchObject({ status: 'failed', days: 7 });
  done();
});

it('Sent History: shows what Meta reported after the broadcast', async () => {
  const { el, tab, done } = await render();
  await tab('Sent History');
  const t = el.textContent || '';
  for (const s of ['93 to send', '50 delivered', '30 read', '43 failed', 'Meta accepted all of them, then reported 43 as not delivered']) expect(t).toContain(s);
  done();
});
