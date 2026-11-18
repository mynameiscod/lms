import { Step, StepType, TriggerType, Path, Options, Workflow } from '../../api/workflowApi';

/* The catalogue the builder draws from: triggers, steps, placeholders, condition fields, recipes. */

export const uid = () => Math.random().toString(36).slice(2, 10);

export const TRIGGERS: Record<TriggerType, { label: string; icon: string; app: string; what: string }> = {
  lead_created: { label: 'New lead arrives', icon: 'fa-user-plus', app: 'Leads', what: 'Any new lead — Meta, website, Google Ads, sheet, WhatsApp, manual. Filter by source if you like.' },
  stage_changed: { label: 'Lead moves to a stage', icon: 'fa-stairs', app: 'Leads', what: 'A counsellor (or the AI call) moves a lead into one of the stages you pick.' },
  message_received: { label: 'WhatsApp message received', icon: 'fa-comment-dots', app: 'WhatsApp', what: 'Any message, or only messages containing your keywords. Can be limited to outside office hours.' },
  demo_booked: { label: 'Demo booked', icon: 'fa-calendar-check', app: 'Demos', what: 'A demo or campus visit is booked (or moved). Use "Wait until demo time" steps for reminders.' },
  demo_outcome: { label: 'Demo attended / no-show', icon: 'fa-user-check', app: 'Demos', what: 'A counsellor marks a demo Attended, No-show or Cancelled.' },
  call_result: { label: 'AI call result', icon: 'fa-phone-volume', app: 'Outpero', what: 'The AI call (Outpero) reports how the call went.' },
  manual: { label: 'Only when tested', icon: 'fa-hand-pointer', app: 'Manual', what: 'Starts only from "Test run". Useful to try steps out.' },
};

export interface StepMeta { label: string; icon: string; app: string; tone: string; group: string; what: string }
export const STEPS: Record<StepType, StepMeta> = {
  send_message: { label: 'Send message', icon: 'fa-comment', app: 'WhatsApp', tone: 'green', group: 'WhatsApp', what: 'Free text. Only reaches people who messaged in the last 24 hours (Meta rule) — add a fallback template for everyone else.' },
  send_template: { label: 'Send template', icon: 'fa-file-lines', app: 'WhatsApp', tone: 'green', group: 'WhatsApp', what: 'An approved WhatsApp template. Works any time, also for brand-new leads.' },
  send_media: { label: 'Send file / brochure', icon: 'fa-file-pdf', app: 'WhatsApp', tone: 'green', group: 'WhatsApp', what: 'A PDF or image from a public link (inside the 24-hour window).' },
  ask_question: { label: 'Ask a question', icon: 'fa-circle-question', app: 'WhatsApp', tone: 'green', group: 'WhatsApp', what: 'Buttons, a list or free text. Waits for the answer and can save it on the lead.' },
  ai_reply: { label: 'AI reply', icon: 'fa-wand-magic-sparkles', app: 'AI', tone: 'violet', group: 'WhatsApp', what: 'Answers their message from your knowledge sheet. Hands over to a person when it is not sure.' },
  wait: { label: 'Wait', icon: 'fa-hourglass-half', app: 'Delay', tone: 'amber', group: 'Timing', what: 'Minutes, hours or days.' },
  wait_until: { label: 'Wait until demo time', icon: 'fa-clock', app: 'Delay', tone: 'amber', group: 'Timing', what: 'e.g. 1 day before the demo, 10 minutes before, 1 hour after.' },
  paths: { label: 'Paths (if / else)', icon: 'fa-code-branch', app: 'Paths', tone: 'orange', group: 'Logic', what: 'Split into branches by answers, source, stage, course, office hours…' },
  stop: { label: 'Stop', icon: 'fa-circle-stop', app: 'Logic', tone: 'grey', group: 'Logic', what: 'End the workflow here.' },
  update_lead: { label: 'Update lead', icon: 'fa-pen-to-square', app: 'Leads', tone: 'blue', group: 'Lead', what: 'Change stage or priority, set a field, add a note.' },
  assign: { label: 'Assign lead', icon: 'fa-user-check', app: 'Leads', tone: 'blue', group: 'Lead', what: 'Round robin / rules from Lead Assignment, or one person.' },
  follow_up: { label: 'Create follow-up', icon: 'fa-calendar-plus', app: 'Leads', tone: 'blue', group: 'Lead', what: 'A task in the counsellor\'s follow-up queue.' },
  notify: { label: 'Notify staff', icon: 'fa-bell', app: 'Team', tone: 'sky', group: 'Team', what: 'A bell notification for the owner, admins or chosen people.' },
  handoff: { label: 'Hand over to a person', icon: 'fa-headset', app: 'Team', tone: 'sky', group: 'Team', what: 'Pauses the bot for this chat, tells the counsellor, and ends the workflow.' },
  webhook: { label: 'Send to webhook', icon: 'fa-plug', app: 'Webhook', tone: 'grey', group: 'Other', what: 'POST the lead and answers to another system.' },
};
export const STEP_GROUPS = ['WhatsApp', 'Timing', 'Logic', 'Lead', 'Team', 'Other'];

export function newStep(type: StepType): Step {
  const id = uid();
  switch (type) {
    case 'send_message': return { id, type, config: { text: '' } };
    case 'send_template': return { id, type, config: { templateId: '', values: [] } };
    case 'send_media': return { id, type, config: { kind: 'document', url: '', caption: '' } };
    case 'ask_question': return { id, type, config: { question: '', key: '', answerType: 'buttons', options: ['', ''], timeoutHours: 24, onTimeout: 'continue', saveTo: '' } };
    case 'ai_reply': return { id, type, config: { knowledge: '', instructions: '', handoffMessage: 'Let me connect you with our counsellor — they will reply shortly. 🙂', pauseBot: true } };
    case 'wait': return { id, type, config: { amount: 1, unit: 'days', officeHoursOnly: false } };
    case 'wait_until': return { id, type, config: { offsetMinutes: -60 } };
    case 'paths': return { id, type, config: {}, paths: [newPath('Path A', true), newPath('Everyone else', false)] };
    case 'update_lead': return { id, type, config: { stageId: '', priority: '', note: '' } };
    case 'assign': return { id, type, config: { mode: 'auto' } };
    case 'follow_up': return { id, type, config: { title: 'Call {{first_name}}', inHours: 2, type: 'call', priority: 'medium' } };
    case 'notify': return { id, type, config: { to: 'owner', message: '' } };
    case 'handoff': return { id, type, config: { to: 'owner', message: '' } };
    case 'webhook': return { id, type, config: { url: '' } };
    default: return { id, type, config: {} };
  }
}
export function newPath(name: string, withCondition: boolean): Path {
  return { id: uid(), name, match: 'all', conditions: withCondition ? [{ field: '', op: 'is', value: '' }] : [], steps: [] };
}

/* ── Placeholders ─────────────────────────────────────────────────────── */
export const BASE_VARS: { key: string; label: string }[] = [
  { key: 'first_name', label: 'First name' }, { key: 'name', label: 'Full name' }, { key: 'phone', label: 'Phone' },
  { key: 'course', label: 'Course' }, { key: 'counsellor', label: 'Counsellor' }, { key: 'counsellor_phone', label: 'Counsellor phone' },
  { key: 'institute', label: 'Institute' }, { key: 'next_opening', label: 'When we open' }, { key: 'message', label: 'Their message' },
];
export const DEMO_VARS = [
  { key: 'demo_time', label: 'Demo date & time' }, { key: 'demo_date', label: 'Demo date' }, { key: 'demo_clock', label: 'Demo time' }, { key: 'demo_link', label: 'Demo link' },
];

/** Every ask_question key in the workflow (for {{answer.x}} and conditions). */
export function answerKeys(steps: Step[]): string[] {
  const out: string[] = [];
  const walk = (list: Step[]) => list.forEach(s => {
    if (s.type === 'ask_question' && s.config.key) out.push(String(s.config.key));
    (s.paths || []).forEach(p => walk(p.steps));
  });
  walk(steps);
  return Array.from(new Set(out));
}

/* ── Condition fields ─────────────────────────────────────────────────── */
export type FieldKind = 'text' | 'number' | 'stage' | 'source' | 'priority' | 'yesno' | 'outcome' | 'demo' | 'user' | 'course';
export interface FieldDef { key: string; label: string; group: string; kind: FieldKind }
export function conditionFields(steps: Step[], custom: string[] = []): FieldDef[] {
  return [
    ...answerKeys(steps).map(k => ({ key: `answer.${k}`, label: `Answer: ${k}`, group: 'Answers', kind: 'text' as FieldKind })),
    { key: 'lead.source', label: 'Source', group: 'Lead', kind: 'source' },
    { key: 'lead.stage', label: 'Stage', group: 'Lead', kind: 'stage' },
    { key: 'lead.priority', label: 'Priority', group: 'Lead', kind: 'priority' },
    { key: 'lead.course', label: 'Course interest', group: 'Lead', kind: 'course' },
    { key: 'lead.passout_year', label: 'Passout year', group: 'Lead', kind: 'number' },
    { key: 'lead.owner', label: 'Counsellor', group: 'Lead', kind: 'user' },
    { key: 'lead.email', label: 'Email', group: 'Lead', kind: 'text' },
    { key: 'lead.language', label: 'Language', group: 'Lead', kind: 'text' },
    ...custom.map(k => ({ key: `custom.${k}`, label: `Field: ${k}`, group: 'Lead', kind: 'text' as FieldKind })),
    { key: 'message.text', label: 'Their last message', group: 'WhatsApp', kind: 'text' },
    { key: 'office.open', label: 'Office is open now', group: 'Time', kind: 'yesno' },
    { key: 'demo.status', label: 'Demo status', group: 'Demo', kind: 'demo' },
    { key: 'call.outcome', label: 'AI call outcome', group: 'AI call', kind: 'outcome' },
  ];
}
export const OPS: Record<string, string> = {
  is: 'is', is_not: 'is not', contains: 'contains', not_contains: 'does not contain', starts_with: 'starts with',
  gt: 'is more than', gte: 'is at least', lt: 'is less than', lte: 'is at most', empty: 'is empty', not_empty: 'is not empty',
};
export const opsFor = (kind: FieldKind): string[] => {
  if (kind === 'number') return ['is', 'is_not', 'gt', 'gte', 'lt', 'lte', 'empty', 'not_empty'];
  if (['stage', 'source', 'priority', 'yesno', 'outcome', 'demo', 'user'].includes(kind)) return ['is', 'is_not', 'empty', 'not_empty'];
  return ['is', 'is_not', 'contains', 'not_contains', 'starts_with', 'empty', 'not_empty'];
};

export const PRIORITIES = ['hot', 'warm', 'cold'];
export const CALL_OUTCOMES: Record<string, string> = {
  interested: 'Interested', callback: 'Call back later', demo: 'Wants a demo', no_answer: 'No answer',
  not_interested: 'Not interested', wrong_number: 'Wrong number', opt_out: 'Asked not to be called', needs_review: 'Needs review',
};
export const DEMO_OUTCOMES: Record<string, string> = { completed: 'Attended', no_show: 'No-show', cancelled: 'Cancelled' };
export const MEETING_TYPES: Record<string, string> = { online_demo: 'Online demo', campus_visit: 'Campus visit' };
export const SAVE_TO: Record<string, string> = { '': "Don't save on the lead", name: 'Name', email: 'Email', course: 'Course interest', passout_year: 'Passout year' };

/* ── One-line summaries for the cards ─────────────────────────────────── */
const cut = (s: any, n = 60) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n)}…` : t; };
export const offsetText = (m: number) => {
  const a = Math.abs(m);
  const t = a % 1440 === 0 ? `${a / 1440} day${a === 1440 ? '' : 's'}` : a % 60 === 0 ? `${a / 60} hour${a === 60 ? '' : 's'}` : `${a} min`;
  return m === 0 ? 'at demo time' : `${t} ${m < 0 ? 'before' : 'after'} the demo`;
};

export function stepSummary(s: Step, o: Options | null): string {
  const c = s.config || {};
  switch (s.type) {
    case 'send_message': return c.text ? `“${cut(c.text)}”` : 'Write the message';
    case 'send_template': return o?.templates.find(t => t._id === c.templateId)?.name || 'Choose a template';
    case 'send_media': return c.url ? cut(c.fileName || c.url, 50) : 'Add the file link';
    case 'ask_question': return c.question ? `“${cut(c.question, 50)}”${c.key ? ` → ${c.key}` : ''}` : 'Write the question';
    case 'ai_reply': return c.knowledge ? 'Answers from your knowledge sheet' : 'Add the knowledge sheet';
    case 'wait': return `Wait ${c.amount || '?'} ${c.unit || 'hours'}${c.officeHoursOnly ? ' (office hours)' : ''}`;
    case 'wait_until': return offsetText(Number(c.offsetMinutes) || 0);
    case 'paths': return `${(s.paths || []).length} paths`;
    case 'update_lead': {
      const bits = [c.stageId && `stage → ${o?.stages.find(x => x._id === c.stageId)?.name || '?'}`, c.priority && `priority → ${c.priority}`, c.field && `${c.field} → ${cut(c.value, 20)}`, c.note && 'add note'].filter(Boolean);
      return bits.length ? bits.join(', ') : 'Choose what to change';
    }
    case 'assign': return c.mode === 'user' ? `To ${o?.users.find(u => u._id === c.userId)?.name || 'someone'}` : 'Using Lead Assignment (round robin / rules)';
    case 'follow_up': return `${cut(c.title, 40)} · in ${c.inHours || 0} h`;
    case 'notify': return c.message ? `“${cut(c.message, 50)}”` : 'Write the notification';
    case 'handoff': return 'Pause bot · tell the counsellor';
    case 'webhook': return c.url ? cut(c.url, 50) : 'Add the https link';
    case 'stop': return 'End of workflow';
    default: return '';
  }
}

export function triggerSummary(t: Workflow['trigger'], o: Options | null): string {
  const c = t.config || {};
  const list = (v: any) => (Array.isArray(v) ? v : []);
  switch (t.type) {
    case 'lead_created': return list(c.sources).length ? `From ${list(c.sources).join(', ')}` : 'From any source';
    case 'stage_changed': return list(c.stageIds).length ? `To ${list(c.stageIds).map((id: string) => o?.stages.find(s => s._id === id)?.name || '?').join(', ')}` : 'Choose stages';
    case 'message_received': {
      const when = c.officeHours === 'outside' ? ' · outside office hours' : c.officeHours === 'inside' ? ' · during office hours' : '';
      return (c.match === 'keywords' ? (list(c.keywords).length ? `Contains ${list(c.keywords).slice(0, 4).map((k: string) => `“${k}”`).join(', ')}` : 'Add keywords') : 'Any message') + when;
    }
    case 'demo_booked': return list(c.meetingTypes).length ? list(c.meetingTypes).map((x: string) => MEETING_TYPES[x] || x).join(', ') : 'Demos and campus visits';
    case 'demo_outcome': return list(c.outcomes).length ? list(c.outcomes).map((x: string) => DEMO_OUTCOMES[x] || x).join(', ') : 'Any outcome';
    case 'call_result': return list(c.outcomes).length ? list(c.outcomes).map((x: string) => CALL_OUTCOMES[x] || x).join(', ') : 'Any outcome';
    default: return TRIGGERS[t.type]?.what || '';
  }
}

export const DEFAULT_SETTINGS: Workflow['settings'] = { sendWindow: 'any', allowReentry: false, cooldownMinutes: 0, stopOnReply: false, runWhenHumanTakenOver: false, stopStageIds: [] };

/* ── Recipes ──────────────────────────────────────────────────────────── */
export interface Recipe { key: string; icon: string; tone: string; title: string; what: string; build: () => Partial<Workflow> }

/** How the "Create New Workflow" window groups and labels the recipes, plus the short line on Quick Start tiles. */
export const RECIPE_LOOK: Record<string, { tag: string; short: string; section: 'recommended' | 'engage' | 'advanced'; words: string[] }> = {
  ooo: { tag: 'Auto Reply', short: 'Auto reply outside office hours', section: 'recommended', words: ['office', 'closed', 'night', 'holiday', 'weekend', 'after hours', 'sunday'] },
  welcome: { tag: 'Lead Nurture', short: 'Welcome, qualify and assign', section: 'recommended', words: ['new lead', 'welcome', 'qualify', 'question', 'ask', 'assign', 'arrive'] },
  faq: { tag: 'FAQ / Info', short: 'Reply to fee, course, timing etc.', section: 'recommended', words: ['fee', 'keyword', 'faq', 'price', 'syllabus', 'location', 'timing', 'course detail'] },
  demo: { tag: 'Reminders', short: 'Remind before the demo', section: 'engage', words: ['remind', 'demo booked', 'before the demo', 'meet link', 'confirmation'] },
  noshow: { tag: 'Recovery', short: 'Rebook missed demos', section: 'engage', words: ['no-show', 'no show', 'missed', 'rebook', 'did not come', "didn't come"] },
  attended: { tag: 'Post Demo', short: 'Thank-you + brochure after the demo', section: 'engage', words: ['attended', 'after the demo', 'brochure', 'thank'] },
  ai: { tag: 'AI Powered', short: 'Answer any question with AI', section: 'advanced', words: ['ai', 'answer', 'any question', 'chatbot', 'bot', 'knowledge'] },
  nurture: { tag: 'Sequence', short: 'Template now, again after 3 days', section: 'advanced', words: ['follow up', 'follow-up', 'sequence', 'after 3 days', 'days', 'stage', 'drip', 'no reply'] },
};

/** "follow up after 3 days" → the recipe whose words match best (null when nothing matches). */
export function suggestRecipe(goal: string): string | null {
  const g = goal.toLowerCase();
  let best: string | null = null, score = 0;
  for (const [key, look] of Object.entries(RECIPE_LOOK)) {
    const n = look.words.filter(w => g.includes(w)).reduce((a, w) => a + w.length, 0);
    if (n > score) { score = n; best = key; }
  }
  return best;
}
const s = (type: StepType, config: Record<string, any>, extra: Partial<Step> = {}): Step => ({ ...newStep(type), config: { ...newStep(type).config, ...config }, ...extra });

export const RECIPES: Recipe[] = [
  {
    key: 'ooo', icon: 'fa-moon', tone: 'violet', title: 'Out-of-office reply',
    what: 'Outside office hours, reply once: “We are closed, we will reply {{next_opening}}.”',
    build: () => ({
      name: 'Out-of-office reply',
      trigger: { type: 'message_received', config: { match: 'any', officeHours: 'outside' } },
      settings: { ...DEFAULT_SETTINGS, allowReentry: true, cooldownMinutes: 720, runWhenHumanTakenOver: true },
      steps: [s('send_message', { text: 'Hi {{first_name}}, thanks for your message! 🙏 Our office is closed right now. Our team will reply {{next_opening}}.' })],
    }),
  },
  {
    key: 'welcome', icon: 'fa-hand-sparkles', tone: 'green', title: 'New lead: welcome + questions',
    what: 'Welcome template → ask key qualification questions → assign follow-up.',
    build: () => {
      const year = s('ask_question', { question: 'Which year did you (or will you) pass out?', key: 'passout_year', answerType: 'list', options: ['2023 or before', '2024', '2025', '2026', '2027 or later'], saveTo: 'passout_year', listButton: 'Choose year' });
      const course = s('ask_question', { question: 'Which course are you interested in?', key: 'course', answerType: 'buttons', options: ['Java Full Stack', 'Python Full Stack', 'Testing'], saveTo: 'course' });
      const status = s('ask_question', { question: 'Are you currently studying or working?', key: 'status', answerType: 'buttons', options: ['Studying', 'Working', 'Looking for job'] });
      const paths = s('paths', {}, { paths: [
        { id: uid(), name: 'Ready to join', match: 'any', conditions: [{ field: 'answer.status', op: 'is', value: 'Looking for job' }, { field: 'answer.passout_year', op: 'is', value: '2025' }], steps: [s('update_lead', { priority: 'hot', note: 'WhatsApp answers: {{answer.passout_year}}, {{answer.course}}, {{answer.status}}' })] },
        { id: uid(), name: 'Everyone else', match: 'all', conditions: [], steps: [s('update_lead', { priority: 'warm', note: 'WhatsApp answers: {{answer.passout_year}}, {{answer.course}}, {{answer.status}}' })] },
      ] });
      return {
        name: 'New lead: welcome + questions',
        trigger: { type: 'lead_created', config: { sources: [] } },
        settings: { ...DEFAULT_SETTINGS },
        steps: [
          s('send_template', { templateId: '', values: ['{{first_name}}'] }),
          year, course, status, paths,
          s('assign', { mode: 'auto' }),
          s('send_message', { text: 'Thank you {{first_name}}! 🙌 {{counsellor}} from our team will call you shortly.' }),
          s('follow_up', { title: 'Call {{first_name}} — answered WhatsApp questions', inHours: 1, priority: 'high' }),
        ],
      };
    },
  },
  {
    key: 'faq', icon: 'fa-comments', tone: 'blue', title: 'Keyword reply (FAQ)',
    what: 'When a message mentions “fee” or “fees”, reply with your fee details. Copy it for location, timings, syllabus…',
    build: () => ({
      name: 'Reply: fees',
      trigger: { type: 'message_received', config: { match: 'keywords', keywords: ['fee', 'fees', 'price', 'cost'], matchMode: 'contains', officeHours: 'any' } },
      settings: { ...DEFAULT_SETTINGS, allowReentry: true, cooldownMinutes: 60 },
      steps: [s('send_message', { text: 'Hi {{first_name}}! Our course fee is ₹____ (EMI available). Shall I ask a counsellor to call you with the details?' })],
    }),
  },
  {
    key: 'demo', icon: 'fa-calendar-check', tone: 'amber', title: 'Demo reminders',
    what: 'When a demo is booked: send confirmation, reminders at 1 day, 2 hours and 10 minutes before (with Meet link).',
    build: () => ({
      name: 'Demo reminders',
      trigger: { type: 'demo_booked', config: { meetingTypes: ['online_demo', 'campus_visit'] } },
      settings: { ...DEFAULT_SETTINGS },
      steps: [
        s('send_template', { templateId: '', values: ['{{first_name}}', '{{demo_time}}'] }),
        s('wait_until', { offsetMinutes: -1440 }),
        s('send_template', { templateId: '', values: ['{{first_name}}', '{{demo_time}}'] }),
        s('wait_until', { offsetMinutes: -120 }),
        s('send_template', { templateId: '', values: ['{{first_name}}', '{{demo_clock}}', '{{demo_link}}'] }),
        s('wait_until', { offsetMinutes: -10 }),
        s('send_message', { text: 'Starting in 10 minutes, {{first_name}}! Join here: {{demo_link}}' }),
      ],
    }),
  },
  {
    key: 'noshow', icon: 'fa-user-clock', tone: 'red', title: 'Demo no-show follow-up',
    what: 'If a lead misses the demo: send “Sorry we missed you” → rebook and a high-priority call task.',
    build: () => ({
      name: 'Demo no-show follow-up',
      trigger: { type: 'demo_outcome', config: { outcomes: ['no_show'] } },
      settings: { ...DEFAULT_SETTINGS, allowReentry: true },
      steps: [
        s('send_template', { templateId: '', values: ['{{first_name}}'] }),
        s('follow_up', { title: 'Missed the demo — call {{first_name}} to rebook', inHours: 2, priority: 'high' }),
        s('wait', { amount: 2, unit: 'days' }),
        s('paths', {}, { paths: [
          { id: uid(), name: 'Still no new demo', match: 'all', conditions: [{ field: 'demo.status', op: 'is', value: 'no_show' }], steps: [s('notify', { to: 'owner', message: '{{name}} missed the demo 2 days ago and has not rebooked.' })] },
        ] }),
      ],
    }),
  },
  {
    key: 'attended', icon: 'fa-graduation-cap', tone: 'green', title: 'After the demo (attended)',
    what: 'Send thank-you + brochure, then follow-up call next day.',
    build: () => ({
      name: 'After the demo',
      trigger: { type: 'demo_outcome', config: { outcomes: ['completed'] } },
      settings: { ...DEFAULT_SETTINGS, allowReentry: true },
      steps: [
        s('send_message', { text: 'Thank you for attending the demo, {{first_name}}! 🙌 Here is the course brochure.', fallbackTemplateId: '' }),
        s('send_media', { kind: 'document', url: '', caption: 'Course brochure', fileName: 'Brochure.pdf' }),
        s('follow_up', { title: 'Post-demo call: {{first_name}}', inHours: 20, priority: 'high' }),
      ],
    }),
  },
  {
    key: 'ai', icon: 'fa-wand-magic-sparkles', tone: 'violet', title: 'AI assistant',
    what: 'Answers any WhatsApp question from your knowledge sheet; hands over to a counsellor when unsure.',
    build: () => ({
      name: 'AI assistant',
      trigger: { type: 'message_received', config: { match: 'any', officeHours: 'any' } },
      settings: { ...DEFAULT_SETTINGS, allowReentry: true },
      steps: [s('ai_reply', { knowledge: 'Courses: …\nFees: …\nBatch timings: …\nDuration: …\nPlacement support: …\nAddress / Google Maps: …\nDemo booking: …' })],
    }),
  },
  {
    key: 'nurture', icon: 'fa-seedling', tone: 'green', title: 'Follow-up sequence',
    what: 'Lead moved to a stage → template next day → another after 3 days. Stops as soon as they reply.',
    build: () => ({
      name: 'Follow-up sequence',
      trigger: { type: 'stage_changed', config: { stageIds: [] } },
      settings: { ...DEFAULT_SETTINGS, stopOnReply: true },
      steps: [
        s('wait', { amount: 1, unit: 'days', officeHoursOnly: true }),
        s('send_template', { templateId: '', values: ['{{first_name}}'] }),
        s('wait', { amount: 3, unit: 'days', officeHoursOnly: true }),
        s('send_template', { templateId: '', values: ['{{first_name}}'] }),
        s('follow_up', { title: 'No reply to follow-ups — call {{first_name}}', inHours: 0 }),
      ],
    }),
  },
];
