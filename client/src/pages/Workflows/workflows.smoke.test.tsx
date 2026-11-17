/**
 * Smoke test: the Workflows list, Runs, Office hours and the builder canvas render with realistic
 * data (every recipe, every step type, nested paths) without crashing.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import WorkflowsPage from './index';
import Builder from './Builder';
import { RECIPES, newStep, STEPS } from './meta';
import { StepType } from '../../api/workflowApi';

jest.mock('axios', () => ({ __esModule: true, default: { create: () => ({ interceptors: { request: { use: () => 0 } } }) } }));

const mockOptions = {
  stages: [{ _id: 's1', name: 'New', isActive: true }, { _id: 's2', name: 'Interested', isActive: true }],
  sources: ['meta_form', 'website'],
  templates: [{ _id: 't1', name: 'welcome_1', language: 'en', category: 'UTILITY', status: 'APPROVED', body: 'Hi {{1}}, welcome!', variables: 1, hasUrlButton: false }],
  users: [{ _id: 'u1', name: 'Asha K', role: 'TENANT_ADMIN' }],
  courses: ['Java Full Stack'],
};
// Every step type once, plus every recipe's steps, inside a paths branch too.
const allSteps = (Object.keys(STEPS) as StepType[]).filter(t => t !== 'stop').map(t => newStep(t));
const recipeSteps = RECIPES.flatMap(r => r.build().steps || []);
const paths = newStep('paths');
paths.paths![0].steps = [newStep('send_message'), newStep('wait')];
paths.paths![0].conditions = [{ field: 'lead.stage', op: 'is', value: 's1' }];
const mockWf = {
  _id: 'w1', name: 'Welcome flow', status: 'active', trigger: { type: 'lead_created', config: { sources: ['meta_form'] } },
  steps: [...allSteps, ...recipeSteps, paths, newStep('stop')],
  settings: { sendWindow: 'any', allowReentry: false, cooldownMinutes: 0, stopOnReply: false, runWhenHumanTakenOver: false, stopStageIds: [] },
  stats: { started: 3, completed: 1, stopped: 0, failed: 0 }, liveRuns: 2, problems: [{ stepId: allSteps[0].id, message: 'Step 1: Type the message' }],
};
const mockRun = {
  _id: 'r1', workflowId: 'w1', workflowName: 'Welcome flow', lead: { _id: 'l1', name: 'Ravi', phone: '919000000001' }, status: 'waiting', waitingFor: 'reply',
  resumeAt: '2030-01-01T00:00:00Z', currentStep: { id: 'x', number: '2', type: 'ask_question' }, answers: { year: '2025' }, test: false,
  log: [{ at: '2026-11-17T00:00:00Z', ok: true, note: 'Started' }], createdAt: '2026-11-17T00:00:00Z',
};

jest.mock('../../api/workflowApi', () => ({
  workflowApi: {
    list: async () => [{ _id: 'w1', name: 'Welcome flow', status: 'active', trigger: { type: 'message_received', config: { match: 'keywords', keywords: ['fee'] } }, stepCount: 3, stats: { started: 3, completed: 1, stopped: 0, failed: 0 }, liveRuns: 2, updatedAt: '2026-11-17' }],
    get: async () => mockWf,
    options: async () => mockOptions,
    runs: async () => [mockRun],
    settings: async () => ({ timezone: 'Asia/Kolkata', days: Object.fromEntries(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map(d => [d, { open: d !== 'sun', start: '09:30', end: '18:30' }])), holidays: [{ date: '2026-12-25', name: 'Christmas' }], openNow: false, nextOpening: 'tomorrow at 9:30 AM' }),
  },
}));

async function render(path: string) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/workflows" element={<WorkflowsPage />} />
          <Route path="/workflows/:id" element={<Builder />} />
        </Routes>
      </MemoryRouter>,
    );
  });
  await act(async () => { await new Promise(r => setTimeout(r, 0)); });
  return { el, done: () => { act(() => root.unmount()); el.remove(); } };
}

it('lists workflows with their trigger', async () => {
  const { el, done } = await render('/workflows');
  expect(el.textContent).toContain('Welcome flow');
  expect(el.textContent).toContain('WhatsApp message received');
  expect(el.textContent).toContain('“fee”');
  done();
});

it('shows runs and office hours', async () => {
  let r = await render('/workflows?tab=runs');
  expect(r.el.textContent).toContain('Ravi');
  expect(r.el.textContent).toContain('waiting for their reply');
  r.done();
  r = await render('/workflows?tab=hours');
  expect(r.el.textContent).toContain('opens tomorrow at 9:30 AM');
  expect(r.el.textContent).toContain('Christmas');
  r.done();
});

it('draws every step type, recipe and branch on the canvas, and opens each editor', async () => {
  const { el, done } = await render('/workflows/w1');
  expect(el.textContent).toContain('New lead arrives');
  for (const t of Object.keys(STEPS)) expect(el.textContent).toContain(STEPS[t as StepType].label);
  expect(el.textContent).toContain('A. Path A');
  expect(el.querySelectorAll('.wf-node.bad').length).toBe(1);
  // Open every card's editor.
  const cards = Array.from(el.querySelectorAll('.wf-node')) as HTMLElement[];
  for (const c of cards) await act(async () => { c.click(); });
  // And a path's conditions.
  await act(async () => { (el.querySelector('.wf-path-head') as HTMLElement).click(); });
  expect(el.textContent).toContain('Go this way when');
  done();
});
