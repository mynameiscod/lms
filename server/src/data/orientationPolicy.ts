/**
 * The days every student meets before Day 1 — and what they are for.
 *
 * ── WHY ORIENTATION SITS OUTSIDE THE PROGRAMME ────────────────────────────────────────────
 *
 * "Ninety days" is a promise about learning days. If orientation were days 1 to 5 of it, the
 * promise would quietly become eighty-five, and it would change again every time an admin edited
 * the welcome. So orientation is its own short run that comes BEFORE Day 1, and the programme's
 * length means exactly what it says at every setting an admin picks.
 *
 * ── IT MEASURES NOTHING ───────────────────────────────────────────────────────────────────
 *
 * Watching a founder video is not evidence of a skill. Orientation earns XP and keeps a streak,
 * and it writes NO skill evidence: nothing here may move Skill DNA, a plan, or a readiness figure.
 * That is why these days carry no checkpoint and no quiz — see orientationService.
 *
 * ── MANDATORY FOR A NEW MEMBER, OPTIONAL FOR SOMEBODY MID-JOURNEY ─────────────────────────
 *
 * A member who joins now completes orientation before their first learning day. A member already
 * past Day 1 when orientation arrived is offered it and never blocked by it: the product changing
 * under somebody's feet must not lock them out of a programme they have already started.
 *
 * ── THE RECORDINGS DO NOT GATE ────────────────────────────────────────────────────────────
 *
 * Day one asks for a spoken introduction and a spoken goal. They are the most valuable minutes in
 * orientation and the easiest to be blocked by: no microphone, a shared room, plain shyness. They
 * are therefore `required: false` — encouraged, never a locked door on somebody's first day.
 *
 * ── THIS FILE IS THE DEFAULT, NOT THE CONTENT ─────────────────────────────────────────────
 *
 * An admin edits orientation in CareerPilot, and their edit is what students see. This is what a
 * tenant starts with, and what "reset to default" restores. Video URLs are deliberately empty: a
 * placeholder that plays nothing is honest, and the day tells the admin what is missing.
 */

export type OrientationItemKind = 'video' | 'notes' | 'image' | 'checklist' | 'recording';

export interface OrientationItem {
  /** Stable within its day, so progress survives an admin reordering or retitling items. */
  key: string;
  kind: OrientationItemKind;
  title: string;
  /** Shown under the title, in the student's words rather than the admin's. */
  blurb?: string;
  /** video: the source to play. Empty means "not recorded yet" and is shown as such. */
  url?: string;
  /** notes: rich text. image: a caption. recording: the prompt the student answers. */
  body?: string;
  /** checklist: the things to tick off. */
  items?: string[];
  /** recording: how long a student should speak for, in seconds. */
  targetSeconds?: number;
  /** Whether the day can be finished without it. */
  required: boolean;
  estimatedMinutes: number;
}

export interface OrientationDay {
  dayNumber: number;
  title: string;
  blurb: string;
  items: OrientationItem[];
}

export const ORIENTATION_XP_EVENT = 'ORIENTATION_DAY_COMPLETED';

export const DEFAULT_ORIENTATION: OrientationDay[] = [
  {
    dayNumber: 1,
    title: 'Say hello, and say where you are going',
    blurb: 'Two short recordings you will be glad to have later, and why CareerPilot exists.',
    items: [
      {
        key: 'self_intro', kind: 'recording', required: false, estimatedMinutes: 5,
        title: 'Introduce yourself',
        blurb: 'Sixty seconds, as you would to an interviewer. Nobody is marking it.',
        body: 'Tell us your name, your course and year, and one thing you enjoy building or solving.',
        targetSeconds: 60,
      },
      {
        key: 'goals', kind: 'recording', required: false, estimatedMinutes: 5,
        title: 'Record your goal for this year',
        blurb: 'You will be shown this again at the end of your programme.',
        body: 'What do you want to be able to do by the end of this year, and why does it matter to you?',
        targetSeconds: 60,
      },
      {
        key: 'founder_video', kind: 'video', required: true, estimatedMinutes: 6,
        title: 'A word from the founder',
        blurb: 'Why CodeBegun built CareerPilot, and what it expects of you.',
        url: '',
      },
    ],
  },
  {
    dayNumber: 2,
    title: 'What CareerPilot is, and what companies are hiring for',
    blurb: 'How your plan works, and what the market is asking for right now.',
    items: [
      {
        key: 'platform_overview', kind: 'video', required: true, estimatedMinutes: 8,
        title: 'How CareerPilot works',
        blurb: 'Your plan, your Skill DNA, and how the days adapt to what you prove.',
        url: '',
      },
      {
        key: 'hiring_trends', kind: 'video', required: true, estimatedMinutes: 8,
        title: 'What companies are hiring for today',
        blurb: 'The roles, the skills behind them, and what has changed this year.',
        url: '',
      },
    ],
  },
  {
    dayNumber: 3,
    title: 'Be findable: your LinkedIn',
    blurb: 'Most first opportunities arrive through a profile somebody else read.',
    items: [
      {
        key: 'linkedin_session', kind: 'video', required: true, estimatedMinutes: 12,
        title: 'Building a profile people reply to',
        blurb: 'What recruiters actually read, in the order they read it.',
        url: '',
      },
      {
        key: 'linkedin_notes', kind: 'notes', required: true, estimatedMinutes: 8,
        title: 'The parts of a profile, and what each one is for',
        body: `**Photo.** A clear, friendly face. A phone camera and daylight is enough; no logo, no group photo.

**Headline.** What you are and what you are heading for — "CSE 2nd year · learning backend development · Python, SQL" says more than "Student at ...".

**About.** Three or four lines, written as you speak: what you study, what you are building, what you are looking for.

**Education.** Your course, college and year. Keep it accurate; recruiters filter on it.

**Skills.** Only what you could answer a question about. Five honest skills beat twenty claimed ones.

**Projects.** One is enough to start. Say what it does, what you built it with, and link the repository.

**A note on honesty.** Everything on a profile is something you can be asked about in an interview. Write only what you would be happy to be questioned on.`,
      },
      {
        key: 'linkedin_examples', kind: 'image', required: false, estimatedMinutes: 3,
        title: 'Before and after: a first-year profile',
        body: 'A real profile, tidied up. Placeholder — replace in CareerPilot.',
        url: '',
      },
      {
        key: 'linkedin_todo', kind: 'checklist', required: true, estimatedMinutes: 25,
        title: 'Set your profile up today',
        blurb: 'Tick each one off as you do it. Twenty-five minutes, once.',
        items: [
          'Create your LinkedIn account, or open the one you already have',
          'Add a clear photo of your face in good light',
          'Write a headline: your course and year, and what you are learning',
          'Write three or four lines in About, in your own words',
          'Add your college, course and expected year of graduation',
          'Add five skills you could answer a question about',
          'Add one project, with what it does and what you built it with',
          'Set your profile URL to your name (linkedin.com/in/yourname)',
          'Turn on "Open to work" for internships, if you are looking',
          'Follow five companies you would like to work for',
          'Connect with ten classmates, seniors or teachers you actually know',
          'Send one connection a short message saying why you connected',
        ],
      },
    ],
  },
  {
    dayNumber: 4,
    title: 'What software is, and what a programming language does',
    blurb: 'The ground everything else in your plan stands on.',
    items: [
      {
        key: 'programming_language', kind: 'video', required: true, estimatedMinutes: 10,
        title: 'What a programming language actually is',
        blurb: 'Instructions, translation, and why there are so many languages.',
        url: '',
      },
      {
        key: 'what_is_software', kind: 'video', required: true, estimatedMinutes: 10,
        title: 'What software is, from your phone to a bank',
        blurb: 'What gets built, who builds it, and what "shipping" means.',
        url: '',
      },
    ],
  },
  {
    dayNumber: 5,
    title: 'The roles in IT, and which ones might fit you',
    blurb: 'Before choosing a direction, know what the choices actually do all day.',
    items: [
      {
        key: 'it_roles', kind: 'video', required: true, estimatedMinutes: 14,
        title: 'Every major IT role, explained',
        blurb: 'Frontend, backend, mobile, data, AI, cloud, security, testing — what each does, and what it needs.',
        url: '',
      },
      {
        key: 'roles_notes', kind: 'notes', required: false, estimatedMinutes: 6,
        title: 'A short guide to the roles',
        body: `You do not have to choose today. Your plan starts with the fundamentals every role needs, and your direction can change as you learn what you enjoy.

| Role | Spends the day | Suits somebody who |
|---|---|---|
| Frontend | Building what people see and click | Likes visible results and design |
| Backend | Building what runs behind it: data, rules, APIs | Likes systems and correctness |
| Mobile | Building apps for phones | Likes devices and interfaces |
| Data / Analytics | Turning data into answers | Likes questions, patterns and evidence |
| AI / ML | Teaching models from data | Likes maths and experimentation |
| Cloud / DevOps | Running and deploying systems reliably | Likes automation and reliability |
| Cybersecurity | Finding and closing weaknesses | Likes taking things apart |
| Testing / QA | Proving software works before users do | Likes thoroughness and edge cases |`,
      },
    ],
  },
];

/** Every key in the shipped default, for a migration or an admin reset to check itself against. */
export const DEFAULT_ORIENTATION_DAYS = DEFAULT_ORIENTATION.length;
