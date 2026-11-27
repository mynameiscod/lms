/**
 * The AI paths of the resume tools, with a model that misbehaves on purpose.
 *
 * "Improve with AI" must never add numbers or skills the member did not have, and an imported resume must come
 * back in the member's own words even when the model rewords or invents.
 */
let reply = '';
jest.mock('../services/aiClients', () => ({
  __esModule: true,
  isAnthropicEnabled: () => false,
  getAnthropic: () => null,
  getOpenAI: () => ({ chat: { completions: { create: async () => ({ choices: [{ message: { content: reply } }] }) } } }),
}));
jest.mock('../services/settingsService', () => ({ __esModule: true, getStr: (_k: string, d: string) => d }));

import { improveResume, scoreResume } from '../services/resumeScoringService';
import { parseResumeText } from '../services/resumeParserService';

const RESUME: any = {
  contact: { name: 'Asha Rao', title: 'Python Developer', email: 'asha@example.com', phone: '9876543210' },
  summary: 'Final-year student who builds web apps in Django.',
  experience: [{ company: 'Acme', role: 'Intern', from: 'Jun 2025', to: 'Aug 2025', current: false, bullets: ['Worked on the login API.', 'Fixed 12 bugs in the admin panel.'] }],
  education: [{ degree: 'B.Tech', college: 'ABC College', year: '2026', cgpa: '8.1' }],
  skills: [{ category: 'Skills', items: ['Python', 'Django', 'SQL'] }],
  projects: [{ name: 'Library App', tech: ['Django'], description: '<ul><li>Built a library app for my college.</li></ul>', link: '' }],
  certifications: [],
};

describe('Improve with AI keeps the facts', () => {
  it('drops a rewritten line that invents a number, keeping the member’s own line', async () => {
    reply = JSON.stringify({
      summary: 'Python developer who has shipped 5 production apps.', // 5 is invented
      experience: [{ bullets: ['Designed the login API used by 10,000 users.', 'Fixed 12 bugs in the admin panel, improving stability.'] }],
      projects: [{ bullets: ['Built a Django library app adopted by 300 students.'] }],
      skills: [{ category: 'Languages', items: ['Python', 'SQL'] }, { category: 'Frameworks', items: ['Django', 'Kubernetes'] }],
    });
    const out: any = await improveResume(RESUME);
    expect(out.summary).toBe(RESUME.summary);                                   // invented "5" → kept the original
    expect(out.experience[0].bullets[0]).toBe('Worked on the login API.');      // invented "10,000" → original
    expect(out.experience[0].bullets[1]).toBe('Fixed 12 bugs in the admin panel, improving stability.'); // 12 was there
    expect(out.projects[0].description).toContain('Built a library app for my college.'); // invented "300" → original
    // Kubernetes was never listed: it is not added (the member's own grouping stays, since a skill would be lost otherwise).
    expect(JSON.stringify(out.skills)).not.toContain('Kubernetes');
  });

  it('accepts a genuine rewording and a regrouping of the same skills', async () => {
    reply = JSON.stringify({
      summary: 'Final-year Python developer building Django web apps.',
      experience: [{ bullets: ['Built and tested the login API.', 'Fixed 12 bugs in the admin panel.'] }],
      projects: [{ bullets: ['Built a Django library app for my college.'] }],
      skills: [{ category: 'Languages', items: ['Python', 'SQL'] }, { category: 'Frameworks', items: ['Django'] }],
    });
    const out: any = await improveResume(RESUME);
    expect(out.summary).toBe('Final-year Python developer building Django web apps.');
    expect(out.experience[0].bullets[0]).toBe('Built and tested the login API.');
    expect(out.skills.map((g: any) => g.category)).toEqual(['Languages', 'Frameworks']);
    // Nothing outside the rewritten parts moves.
    expect(out.education).toEqual(RESUME.education);
    expect(out.contact).toEqual(RESUME.contact);
  });
});

describe('scoring does not depend on the AI', () => {
  it('gives the same score whatever the model says, and drops a tip that invents a number', async () => {
    reply = JSON.stringify({ tips: [
      { line: 'Worked on the login API.', better: 'Built the login API serving 5,000 users.', why: 'impact' },
      { line: 'Worked on the login API.', better: 'Built and tested the login API.', why: 'stronger verb' },
    ] });
    const a: any = await scoreResume(RESUME);
    reply = 'not json at all';
    const b: any = await scoreResume(RESUME);
    expect(a.total).toBe(b.total);
    const tips = a.suggestions.filter((s: any) => s.section === 'wording').map((s: any) => s.fix).join(' ');
    expect(tips).not.toContain('5,000');
    expect(tips).toContain('Built and tested the login API.');
  });
});

describe('importing with an AI model', () => {
  const TEXT = `Asha Rao
Python Developer
asha@example.com | 9876543210 | Bengaluru, Karnataka
SUMMARY
Final-year student who builds web apps in Django.
EXPERIENCE
Intern — Acme Technologies | Jun 2025 – Aug 2025
Fixed 12 bugs in the admin panel.
SKILLS
Python, Django, SQL`;

  it('keeps the resume’s own words when the model rewords, and drops what it invents', async () => {
    reply = JSON.stringify({
      contact: { name: 'Asha Rao', title: 'Senior Python Engineer', email: 'asha@example.com', phone: '9876543210', location: 'Bengaluru, Karnataka' },
      summary: 'Experienced engineer who builds scalable web apps.',
      experience: [{ company: 'Acme Technologies', role: 'Intern', from: 'Jun 2025', to: 'Aug 2025', bullets: ['Resolved 12 defects in the admin panel.', 'Led migration to AWS.'] }],
      skills: [{ category: 'Skills', items: ['Python', 'Django', 'SQL', 'AWS'] }],
    });
    const r: any = await parseResumeText(TEXT);
    expect(r.contact.title).toBe('Python Developer');
    expect(r.summary).toBe('Final-year student who builds web apps in Django.');
    expect(r.experience[0].bullets).toEqual(['Fixed 12 bugs in the admin panel.']);
    expect(r.skills.flatMap((g: any) => g.items)).toEqual(['Python', 'Django', 'SQL']);
  });

  it('falls back to its own reading when the model returns broken JSON', async () => {
    reply = '{"contact": {"name": "Asha';
    const r: any = await parseResumeText(TEXT);
    expect(r.contact.name).toBe('Asha Rao');
    expect(r.experience[0].role).toBe('Intern');
  });
});
