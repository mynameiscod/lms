import { IResumeSections } from '../models/Resume';

/**
 * The resume score, computed from the resume itself.
 *
 * WHY NOT THE AI. The old score was whatever the model said at temperature 0.3: the same resume scored differently
 * twice in a row, it was judged on JSON cut off at 5,000 characters (so later sections "did not exist"), and a
 * fresher lost 20 points for having no job. A score a student is told to raise has to move only when the resume
 * does, and every point has to come from a check they can see and fix.
 *
 * SO. Every point comes from a named check below. The total is the same every time for the same resume. A fresher
 * with no experience is not penalised: the experience weight moves to projects, which is where a fresher's evidence
 * is. The AI may add wording suggestions on top; it never moves the number.
 */

export interface RubricCheck { section: Section; label: string; got: number; max: number; fix?: string }
export type Section = 'contact' | 'summary' | 'education' | 'skills' | 'experience' | 'projects' | 'ats';

const BASE_MAX: Record<Section, number> = { contact: 10, summary: 10, education: 10, skills: 15, experience: 15, projects: 20, ats: 20 };

// ── Text helpers ────────────────────────────────────────────────────────────

export const stripHtml = (s: string) => String(s || '').replace(/<li[^>]*>/gi, '\n').replace(/<\/(p|div|li)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/[ \t]+/g, ' ').trim();
const words = (s: string) => stripHtml(s).split(/\s+/).filter(Boolean);
/** A project description's bullets: list items, or its sentences/lines when written as a paragraph. */
export const descriptionBullets = (html: string): string[] => {
  const t = stripHtml(html);
  const lines = t.split('\n').map(x => x.replace(/^[•\-*]\s*/, '').trim()).filter(Boolean);
  if (lines.length > 1) return lines;
  return t.split(/(?<=[.!?])\s+(?=[A-Z])/).map(x => x.trim()).filter(Boolean);
};

const ACTION_VERB = /^(achieved|analy[sz]ed|architected|automated|built|collaborated|conducted|configured|containeri[sz]ed|contributed|created|cut|debugged|decreased|defined|delivered|deployed|designed|developed|devised|documented|drove|enabled|engineered|enhanced|established|evaluated|executed|expanded|extracted|facilitated|fixed|handled|identified|implemented|improved|increased|integrated|introduced|launched|led|leveraged|maintained|managed|mentored|migrated|modeled|modelled|monitored|optimi[sz]ed|orchestrated|organi[sz]ed|owned|performed|pioneered|planned|predicted|presented|produced|programmed|prototyped|raised|ranked|redesigned|reduced|refactored|researched|resolved|restructured|reviewed|revamped|scaled|scraped|secured|shipped|simplified|spearheaded|standardi[sz]ed|streamlined|structured|tested|trained|transformed|translated|tuned|upgraded|visuali[sz]ed|won|wrote|cleaned|merged|analysed|created|added|authored|coded|deployed)\b/i;
const QUANTIFIED = /(\d+(\.\d+)?\s*(%|x\b|×|k\b|m\b|ms\b|s\b|sec|seconds|minutes|hours|days|weeks|users|students|customers|clients|merchants|rows|records|requests|queries|tests|apis|endpoints|pages|screens|members|people|teams?|lakh|crore|₹|rs\.?|inr|\$))|(\b(from|to|by)\s+\d)|(\d{2,}[,\d]*\+?)/i;
const WEAK = /\b(responsible for|worked on|helped (with|to)|assisted (in|with)|was involved in|involved in|duties included|tasked with|participated in|various|etc\.?)\b/i;
const FIRST_PERSON = /(^|\s)(i|me|my|myself|we|our)(\s|$|')/i;
const CLICHE = /\b(hard[-\s]?working|team player|go[-\s]?getter|self[-\s]?motivated|passionate|dynamic|result[-\s]?oriented|detail[-\s]?oriented|quick learner|think outside the box|synergy|best of breed|challenging (environment|position)|grow (along )?with the organi[sz]ation)\b/i;
const EMAIL = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const UNPROFESSIONAL_EMAIL = /(cute|sexy|baby|angel|killer|rockstar|cool|hot|lovely|princess|devil|smart)\w*@/i;

// ── Role keywords ───────────────────────────────────────────────────────────

const ROLE_KEYWORDS: { match: RegExp; keywords: string[] }[] = [
  { match: /java/i, keywords: ['Java', 'Spring Boot', 'Hibernate', 'REST API', 'SQL', 'MySQL', 'Microservices', 'JUnit', 'Git', 'Maven', 'React', 'Docker', 'OOP', 'Data Structures'] },
  { match: /python|django|flask|fastapi/i, keywords: ['Python', 'Django', 'Flask', 'FastAPI', 'REST API', 'SQL', 'PostgreSQL', 'Git', 'Docker', 'Pandas', 'Unit Testing', 'React', 'OOP', 'Data Structures'] },
  { match: /\.net|c#|dotnet|asp/i, keywords: ['C#', '.NET', 'ASP.NET Core', 'Entity Framework', 'SQL Server', 'REST API', 'LINQ', 'Azure', 'Git', 'React', 'OOP', 'Unit Testing'] },
  { match: /front[\s-]?end|react|angular|ui developer|web developer/i, keywords: ['JavaScript', 'TypeScript', 'React', 'HTML', 'CSS', 'Redux', 'REST API', 'Git', 'Responsive Design', 'Tailwind', 'Testing', 'Next.js'] },
  { match: /full[\s-]?stack|mern|mean/i, keywords: ['JavaScript', 'React', 'Node.js', 'Express', 'MongoDB', 'SQL', 'REST API', 'Git', 'HTML', 'CSS', 'Docker', 'TypeScript'] },
  { match: /data analyst|business analyst|analytics|bi developer|power bi/i, keywords: ['SQL', 'Excel', 'Power BI', 'Tableau', 'Python', 'Pandas', 'Statistics', 'Data Visualization', 'Dashboards', 'Data Cleaning', 'A/B Testing', 'KPIs'] },
  { match: /data scien|machine learning|ml engineer|ai engineer|deep learning|nlp|genai|generative/i, keywords: ['Python', 'Machine Learning', 'Scikit-learn', 'Pandas', 'NumPy', 'SQL', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Statistics', 'NLP', 'Model Deployment', 'LLM'] },
  { match: /devops|cloud|sre|aws|azure|platform engineer/i, keywords: ['AWS', 'Azure', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD', 'Linux', 'Jenkins', 'GitHub Actions', 'Monitoring', 'Bash', 'Networking'] },
  { match: /test|qa|sdet|quality/i, keywords: ['Manual Testing', 'Selenium', 'Test Cases', 'API Testing', 'Postman', 'JIRA', 'Automation', 'Java', 'Python', 'SQL', 'Regression Testing', 'Agile'] },
  { match: /android|mobile|flutter|react native|ios/i, keywords: ['Android', 'Kotlin', 'Java', 'Flutter', 'React Native', 'REST API', 'Firebase', 'Git', 'MVVM', 'SQLite', 'UI/UX'] },
  { match: /secur|cyber|soc|pentest/i, keywords: ['Network Security', 'SIEM', 'Linux', 'Wireshark', 'OWASP', 'Vulnerability Assessment', 'Firewalls', 'Incident Response', 'Python', 'Cryptography'] },
  { match: /data engineer/i, keywords: ['SQL', 'Python', 'Spark', 'ETL', 'Airflow', 'Data Warehouse', 'Kafka', 'AWS', 'Data Modeling', 'dbt', 'Snowflake'] },
];
const GENERIC_SOFTWARE = ['Data Structures', 'Algorithms', 'OOP', 'SQL', 'Git', 'REST API', 'Problem Solving', 'Java', 'Python', 'JavaScript', 'HTML', 'CSS'];

/** Keywords expected for a target role (the resume's own title, else the member's target role). */
export function roleKeywords(role: string): string[] {
  const r = String(role || '');
  const hits = ROLE_KEYWORDS.filter(k => k.match.test(r));
  if (!hits.length) return GENERIC_SOFTWARE;
  return Array.from(new Set(hits.flatMap(h => h.keywords))).slice(0, 14);
}
const kwNorm = (s: string) => s.toLowerCase().replace(/\.js\b/g, 'js').replace(/[^a-z0-9#+]+/g, ' ').trim();
const SYNONYMS: Record<string, string[]> = {
  'rest api': ['rest', 'restful', 'rest apis', 'apis'], 'oop': ['object oriented', 'oops', 'object-oriented'],
  'data structures': ['dsa', 'data structure'], 'ci cd': ['ci/cd', 'cicd', 'continuous integration'],
  'machine learning': ['ml'], 'data visualization': ['visualisation', 'visualization', 'dashboards'],
  'unit testing': ['junit', 'pytest', 'unit tests'], 'nodejs': ['node'], 'reactjs': ['react'],
};
function hasKeyword(text: string, kw: string): boolean {
  const t = ` ${kwNorm(text)} `; const k = kwNorm(kw);
  if (t.includes(` ${k} `)) return true;
  return (SYNONYMS[k] || []).some(s => t.includes(` ${kwNorm(s)} `));
}

// ── The rubric ──────────────────────────────────────────────────────────────

export interface RubricResult {
  total: number;
  breakdown: Record<Section, number>;
  maxes: Record<Section, number>;
  checks: RubricCheck[];
  suggestions: { section: string; issue: string; fix: string }[];
  atsWarnings: string[];
  keywordsFound: string[];
  keywordsMissing: string[];
  fresher: boolean;
}

export function scoreByRubric(s: IResumeSections, opts: { targetRole?: string } = {}): RubricResult {
  const c: any = s.contact || {};
  const exp = (s.experience || []).filter(e => (e.company || e.role || (e.bullets || []).length));
  const projects = (s.projects || []).filter(p => p.name || stripHtml(p.description));
  const edu = (s.education || []).filter(e => e.degree || e.college);
  const skillItems = Array.from(new Set((s.skills || []).flatMap(g => g.items || []).map(x => String(x).trim()).filter(Boolean)));
  const skillGroups = (s.skills || []).filter(g => (g.items || []).length);
  const fresher = exp.length === 0;
  const maxes: Record<Section, number> = { ...BASE_MAX };
  if (fresher) { maxes.projects += maxes.experience; maxes.experience = 0; }

  const checks: RubricCheck[] = [];
  const add = (section: Section, label: string, got: number, max: number, fix?: string) => checks.push({ section, label, got: Math.max(0, Math.min(max, Math.round(got * 10) / 10)), max, fix: got < max ? fix : undefined });

  const allBullets = [...exp.flatMap(e => e.bullets || []), ...projects.flatMap(p => descriptionBullets(p.description))].map(b => stripHtml(b)).filter(Boolean);
  const fullText = [c.name, c.title, s.summary, ...exp.map(e => `${e.role} ${e.company} ${(e.bullets || []).join(' ')}`), ...edu.map(e => `${e.degree} ${e.college}`), ...skillItems, ...projects.map(p => `${p.name} ${(p.tech || []).join(' ')} ${stripHtml(p.description)}`), ...(s.certifications || []).map(x => `${x.name} ${x.issuer}`)].join(' \n ');

  // Contact (10)
  add('contact', 'Full name', String(c.name || '').trim().split(/\s+/).length >= 2 ? 2 : c.name ? 1 : 0, 2, 'Write your full name (first and last) at the top.');
  const emailOk = EMAIL.test(String(c.email || '').trim());
  add('contact', 'Professional email', emailOk ? (UNPROFESSIONAL_EMAIL.test(c.email) ? 1 : 2) : 0, 2, emailOk ? 'Use a plain firstname.lastname style email address for job applications.' : 'Add a valid email address.');
  const digits = String(c.phone || '').replace(/\D/g, '');
  add('contact', 'Phone number', digits.length >= 10 && digits.length <= 13 ? 2 : 0, 2, 'Add a 10-digit mobile number recruiters can call.');
  add('contact', 'LinkedIn profile', /linkedin\.com\//i.test(c.linkedin || '') ? 2 : 0, 2, 'Add your LinkedIn profile link (linkedin.com/in/your-name).');
  add('contact', 'GitHub or portfolio', /github\.com\/|gitlab\.com\//i.test(c.github || '') || /\./.test(c.portfolio || '') ? 1 : 0, 1, 'Add your GitHub (or portfolio) link so recruiters can see your code.');
  add('contact', 'Location', String(c.location || '').trim() ? 1 : 0, 1, 'Add your city and state (e.g. Hyderabad, Telangana).');

  // Summary (10)
  const sum = stripHtml(s.summary || '');
  const sw = words(sum).length;
  if (!sw) add('summary', 'Professional summary', 0, 10, 'Add a 2–3 line summary: who you are, the role you want, and your 3–4 strongest skills with proof (a project or internship).');
  else {
    add('summary', 'Length (25–80 words)', sw >= 25 && sw <= 80 ? 4 : sw >= 15 && sw <= 110 ? 2 : 1, 4, sw < 25 ? `Your summary is ${sw} words. Expand it to 2–3 lines (25–80 words).` : `Your summary is ${sw} words. Cut it to 2–3 lines (under 80 words).`);
    // The role counts as named when its distinctive words appear ("Java", "Full Stack", "Data Analyst"), not only the exact title.
    const roleWords = String(c.title || (/not[\s_]*sure/i.test(String(opts.targetRole || '')) ? '' : opts.targetRole) || '').split(/[\s/,+&-]+/).filter(w => w.length > 2 && !/^(developer|engineer|intern|fresher|and|the|for)$/i.test(w));
    const namesRole = roleWords.length > 0 && roleWords.some(w => hasKeyword(sum, w));
    const namedSkills = skillItems.filter(k => hasKeyword(sum, k)).length;
    add('summary', 'Names the target role and key skills', (namesRole ? 1.5 : 0) + Math.min(1.5, namedSkills * 0.5), 3, 'Name the role you are applying for and 2–3 of your strongest skills in the summary.');
    add('summary', 'Written without "I / my"', FIRST_PERSON.test(sum) ? 0 : 1, 1, 'Write the summary without "I" or "my" — start with your title, e.g. "Final-year CSE student who…".');
    add('summary', 'No clichés', CLICHE.test(sum) ? 0 : 2, 2, `Replace generic phrases like "${(sum.match(CLICHE) || [''])[0]}" with something specific you have built or achieved.`);
  }

  // Education (10)
  const e0: any = edu[0] || {};
  add('education', 'Degree', e0.degree ? 3 : 0, 3, 'Add your degree and branch (e.g. B.Tech, Computer Science).');
  add('education', 'College', e0.college ? 3 : 0, 3, 'Add your college name.');
  add('education', 'Graduation year', /\b(19|20)\d{2}\b|present|pursuing/i.test(e0.year || '') ? 2 : 0, 2, 'Add your graduation year (or expected year).');
  add('education', 'CGPA / percentage', String(e0.cgpa || '').trim() ? 2 : 0, 2, 'Add your CGPA or percentage, especially if it is 7.0 / 70% or above.');

  // Skills (15)
  const n = skillItems.length;
  add('skills', 'Number of skills', n >= 12 ? 5 : n >= 8 ? 4 : n >= 5 ? 2.5 : n >= 1 ? 1 : 0, 5, n ? `You list ${n} skill${n === 1 ? '' : 's'}. List 10–15 tools and technologies you can actually use.` : 'Add a Skills section with the languages, frameworks and tools you can use.');
  add('skills', 'Grouped into categories', skillGroups.length >= 3 ? 3 : skillGroups.length === 2 ? 2 : 0, 3, 'Group skills into categories such as Languages, Frameworks, Databases and Tools.');
  // "NOT_SURE" is a real answer to "what role?", not a role: treat it like none.
  const role = String(c.title || (/not[\s_]*sure/i.test(String(opts.targetRole || '')) ? '' : opts.targetRole) || '');
  const expected = roleKeywords(role);
  const found = expected.filter(k => hasKeyword(fullText, k));
  const missing = expected.filter(k => !found.includes(k));
  const coverage = expected.length ? found.length / expected.length : 0;
  add('skills', `Keywords for ${role ? `"${role}"` : 'software roles'}`, Math.min(7, coverage * 10), 7, missing.length ? `Recruiters searching for ${role || 'this role'} look for: ${missing.slice(0, 5).join(', ')}. Add the ones you genuinely know to Skills and show them in a project.` : undefined);

  // Experience (15) — only when there is experience
  if (!fresher) {
    const withDates = exp.filter(e => e.from && (e.to || e.current)).length / exp.length;
    const withNames = exp.filter(e => e.company && e.role).length / exp.length;
    add('experience', 'Company, role and dates', withNames * 2 + withDates * 2, 4, 'Give every internship or job its company name, your role and the dates (e.g. Jun 2025 – Aug 2025).');
    const eb = exp.flatMap(e => e.bullets || []).map(stripHtml).filter(Boolean);
    const perRole = Math.min(1, eb.length / (exp.length * 2));
    add('experience', '2+ bullets per role', perRole * 3, 3, 'Add 2–4 bullets for each internship or job: what you built and what changed because of it.');
    const verbShare = eb.length ? eb.filter(b => ACTION_VERB.test(b)).length / eb.length : 0;
    add('experience', 'Bullets start with action verbs', verbShare * 4, 4, 'Start each bullet with an action verb — Built, Designed, Reduced, Automated — not "Responsible for".');
    const qShare = eb.length ? eb.filter(b => QUANTIFIED.test(b)).length / eb.length : 0;
    add('experience', 'Bullets show measurable results', qShare * 4, 4, 'Add a real number to your experience bullets where you have one — users, time saved, % improvement, records processed.');
  }

  // Projects (20, or 35 for a fresher — whole-number weights for each case, so every check reads cleanly)
  const pc = projects.length;
  const W = fresher ? { count: 7, tech: 5, desc: 7, verbs: 5, results: 7, links: 4 } : { count: 4, tech: 3, desc: 4, verbs: 3, results: 4, links: 2 };
  add('projects', 'Number of projects', (pc >= 3 ? 1 : pc === 2 ? 0.8 : pc === 1 ? 0.45 : 0) * W.count, W.count, pc ? `You have ${pc} project${pc === 1 ? '' : 's'}. Two or three solid projects is the target for a fresher resume.` : 'Add 2–3 projects: what you built, the tech you used and what it does.');
  if (pc) {
    const techShare = projects.filter(p => (p.tech || []).length).length / pc;
    add('projects', 'Tech stack named', techShare * W.tech, W.tech, 'Name the tech stack for every project (e.g. React, Spring Boot, MySQL).');
    const descShare = projects.filter(p => words(p.description).length >= 20).length / pc;
    add('projects', 'Described in detail (20+ words)', descShare * W.desc, W.desc, 'Describe each project in 2–3 bullets: the problem, what you built, and the result.');
    const pb = projects.flatMap(p => descriptionBullets(p.description)).filter(Boolean);
    const pv = pb.length ? pb.filter(b => ACTION_VERB.test(b)).length / pb.length : 0;
    add('projects', 'Bullets start with action verbs', pv * W.verbs, W.verbs, 'Start project bullets with action verbs (Built, Designed, Implemented, Deployed).');
    const pq = pb.length ? pb.filter(b => QUANTIFIED.test(b)).length / pb.length : 0;
    add('projects', 'Results or scale mentioned', Math.min(1, pq * 1.5) * W.results, W.results, 'Mention a result or scale in your projects where you have one — users, records, speed, accuracy.');
    const linkShare = projects.filter(p => /\.|github/i.test(p.link || '')).length / pc;
    add('projects', 'Links to code or demo', linkShare * W.links, W.links, 'Add a GitHub or live-demo link to each project.');
  } else {
    add('projects', 'Project details', 0, maxes.projects - W.count, 'Add 2–3 projects: what you built, the tech you used and what it does.');
  }

  // ATS & writing (20)
  const has = { contact: !!(c.name && (c.email || c.phone)), summary: !!sw, education: edu.length > 0, skills: n > 0, work: exp.length + pc > 0 };
  const present = Object.values(has).filter(Boolean).length;
  add('ats', 'Standard sections present', (present / 5) * 5, 5, `Missing section${5 - present === 1 ? '' : 's'}: ${Object.entries(has).filter(([, v]) => !v).map(([k]) => (k === 'work' ? 'Experience or Projects' : k[0].toUpperCase() + k.slice(1))).join(', ')}.`);
  const total = words(fullText).length;
  add('ats', 'Length fits one page (200–700 words)', total >= 200 && total <= 700 ? 4 : total >= 130 && total <= 900 ? 2 : 0.5, 4, total < 200 ? `Your resume has about ${total} words — thin for a full page. Add detail to your projects and skills (aim for 250–600).` : `Your resume has about ${total} words — likely more than a page. Cut older or weaker points.`);
  const weak = allBullets.filter(b => WEAK.test(b));
  add('ats', 'No weak phrases', weak.length === 0 ? 4 : weak.length <= 2 ? 2 : 0, 4, weak.length ? `Rewrite ${weak.length} bullet${weak.length === 1 ? '' : 's'} that use weak phrases like "${(weak[0].match(WEAK) || [''])[0]}" — say what you did and what changed.` : undefined);
  const fp = allBullets.filter(b => FIRST_PERSON.test(b));
  add('ats', 'Bullets without "I / my"', fp.length === 0 ? 2 : 0, 2, 'Remove "I", "my" and "we" from your bullets — start with the verb.');
  const dupes = allBullets.length - new Set(allBullets.map(b => b.toLowerCase().replace(/\W+/g, ''))).size;
  add('ats', 'No repeated bullets', dupes === 0 ? 2 : 0, 2, 'Some bullets are repeated word for word. Keep one and replace the copy with a different achievement.');
  const odd = /[☀-➿\uD83C-􏰀-\uDFFF★☆✓✔➤►]/.test(fullText);
  add('ats', 'No emoji or symbols ATS cannot read', odd ? 0 : 1.5, 1.5, 'Remove emoji and decorative symbols — many ATS tools drop or garble them.');
  const datesText = [...exp.flatMap(e => [e.from, e.to])].filter(Boolean);
  const datesOk = !datesText.length || datesText.every(d => /^(present|current)$/i.test(d) || /^[A-Za-z]{3,9}\.?\s*'?\d{2,4}$|^\d{4}$|^\d{1,2}\/\d{2,4}$/.test(String(d).trim()));
  add('ats', 'Dates written consistently', datesOk ? 1.5 : 0, 1.5, 'Write dates the same way everywhere, e.g. "Jun 2025 – Aug 2025".');

  const breakdown = Object.fromEntries((Object.keys(BASE_MAX) as Section[]).map(k => [k, 0])) as Record<Section, number>;
  for (const ch of checks) breakdown[ch.section] += ch.got;
  for (const k of Object.keys(breakdown) as Section[]) breakdown[k] = Math.min(maxes[k], Math.round(breakdown[k]));
  const totalScore = Math.min(100, Object.values(breakdown).reduce((a, b) => a + b, 0));

  // The fix list: the checks that lost the most points, most expensive first.
  const suggestions = checks.filter(ch => ch.fix && ch.max - ch.got >= 0.5)
    .sort((a, b) => (b.max - b.got) - (a.max - a.got))
    .slice(0, 8)
    .map(ch => ({ section: ch.section, issue: `${ch.label}: ${Math.round(ch.got)} of ${Math.round(ch.max)}`, fix: ch.fix! }));

  const atsWarnings: string[] = [];
  if (odd) atsWarnings.push('Emoji or decorative symbols found — ATS tools may drop them.');
  if (!has.summary) atsWarnings.push('No summary section — many recruiters read this first.');
  if (total > 900) atsWarnings.push('Likely longer than one page — freshers should keep to one page.');
  if (!emailOk) atsWarnings.push('No valid email address.');
  if (dupes) atsWarnings.push('Repeated bullets found.');

  return { total: totalScore, breakdown, maxes, checks, suggestions, atsWarnings, keywordsFound: found, keywordsMissing: missing, fresher };
}
