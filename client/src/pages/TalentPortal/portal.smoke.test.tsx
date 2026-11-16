/**
 * Smoke test: every Talent Portal screen renders with realistic data and without crashing,
 * and the office's company/opening/submission data shows up where it should.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import TalentPortal from './index';

jest.mock('axios', () => ({ __esModule: true, default: { create: () => ({ interceptors: { request: { use: () => 0 } } }) } }));
jest.mock('../../hooks', () => ({ useAuth: () => ({ user: { tenantId: 't1', email: 'office@x.test', firstName: 'Ofc' }, logout: () => {} }) }));

const share = {
  shareId: 's1', kind: 'student', candidateId: 'u1', fullName: 'Akash Goud Narapatla', phone: '7780119945', email: 'akash@x.test', gender: 'Male', city: 'Nirmal',
  tenthPercent: 83, tenthYear: 2019, twelfthPercent: 77.99, twelfthYear: 2021, degree: 'B.Tech/B.E.', branch: 'CSE', graduationYear: 2026, graduationPercent: 67.2,
  resumeUrl: 'https://x.test/r.pdf', status: 'viewed', sharedAt: '2026-11-10T00:00:00Z', statusHistory: [], submissions: [],
};
const company = {
  _id: 'c1', name: 'Acme Tech', stage: 'active', contactName: 'Priya', contactPhone: '999', followUps: [{ _id: 'f1', dueAt: '2020-01-01T00:00:00Z', note: 'Call Priya', done: false, createdAt: '2020-01-01' }],
  nextFollowUpAt: '2020-01-01T00:00:00Z', stats: { openings: 1, positions: 5, totalOpenings: 1, sent: 1, byStatus: { interview: 1 } },
};
const opening = { _id: 'o1', companyId: 'c1', companyName: 'Acme Tech', title: 'Java Developer', positions: 5, expMin: 0, expMax: 2, salaryMin: 3.5, salaryMax: 6, bond: '1 year', status: 'open', sent: 1, byStatus: {} };
const sub = { _id: 'x1', shareId: 's1', companyId: 'c1', companyName: 'Acme Tech', openingId: 'o1', openingTitle: 'Java Developer', fullName: 'Akash Goud Narapatla', status: 'interview', interviewAt: '2030-01-02T10:00:00Z', sentAt: '2026-11-11T00:00:00Z', note: 'Round 1' };

jest.mock('../../api/talentPoolApi', () => {
  const actual = jest.requireActual('../../api/talentPoolApi');
  return {
    ...actual,
    talentPortalApi: {
      me: async () => ({ name: 'Office 1', contactName: 'Siva Prasad', columns: [], statuses: [], fields: [] }),
      candidates: async () => [share],
      candidate: async () => share,
      companies: async () => [company],
      company: async () => company,
      openings: async () => [opening],
      submissions: async () => [sub],
      followUps: async () => [{ ...company.followUps[0], companyId: 'c1', companyName: 'Acme Tech', stage: 'active' }],
      dashboard: async () => ({
        candidates: { viewed: 1 }, submissions: { interview: 1 }, companies: { total: 1, byStage: { active: 1 } }, openings: { open: 1, positions: 5 },
        followUpsDue: [{ _id: 'f1', companyId: 'c1', companyName: 'Acme Tech', dueAt: '2020-01-01T00:00:00Z', note: 'Call Priya', overdue: true }], followUpsDueCount: 1,
        upcomingInterviews: [sub], recent: [sub],
      }),
    },
  };
});

beforeEach(() => { (global as any).fetch = async () => ({ ok: false }); window.scrollTo = (() => {}) as any; });

async function renderView(view: string) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => { root.render(<MemoryRouter initialEntries={[`/talent-portal?view=${view}`]}><TalentPortal /></MemoryRouter>); });
  await act(async () => { await new Promise(r => setTimeout(r, 0)); });
  const text = el.textContent || '';
  act(() => root.unmount());
  el.remove();
  return text;
}

(global as any).IS_REACT_ACT_ENVIRONMENT = true;

it.each([
  ['dashboard', ['Office 1', 'Follow-ups due', 'Acme Tech', 'Upcoming interviews']],
  ['candidates', ['Candidates Shared with You', 'Akash Goud Narapatla', '7780119945', '83%', 'Download Excel', 'Showing 1–1 of 1 candidate']],
  ['shortlist', ['Shortlist']],
  ['interviews', ['Interviews']],
  ['companies', ['Companies', 'Acme Tech', 'Priya', 'overdue']],
  ['openings', ['Openings', 'Java Developer', '₹3.5–6 LPA', 'Bond: 1 year']],
  ['submissions', ['Sent to Companies', 'Akash Goud Narapatla', 'Round 1']],
  ['followups', ['Follow-ups', 'Overdue', 'Call Priya']],
])('%s renders', async (view, expected) => {
  const text = await renderView(view);
  for (const t of expected) expect(text).toContain(t);
});
