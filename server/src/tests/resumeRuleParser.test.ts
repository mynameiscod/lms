/** Without an AI key, a resume's text is still read into sections by rules (never invented). */
jest.mock('../services/aiClients', () => ({ getOpenAI: () => null }));
import { parseResumeText, parseResumeTextByRules } from '../services/resumeParserService';

const TEXT = `Test Student
test@example.com · +91 90000 00000 · Hyderabad
linkedin.com/in/test-student
Summary
B.Tech CSE student who builds web apps with Java and React.
Skills
Java, SQL, React, Git
Projects
Library System - Java, MySQL CRUD app for 500 books
Education
B.Tech CSE, ABC College, 2027, CGPA 8.1
Certifications
AWS Cloud Practitioner 2025`;

describe('rule-based resume parsing', () => {
  it('fills contact, summary, skills, projects, education and certifications', () => {
    const r = parseResumeTextByRules(TEXT);
    expect(r.contact.name).toBe('Test Student');
    expect(r.contact.email).toBe('test@example.com');
    expect(r.contact.phone.replace(/\D/g, '')).toBe('919000000000');
    expect(r.contact.linkedin).toContain('linkedin.com/in/test-student');
    expect(r.summary).toMatch(/Java and React/);
    expect((r.skills[0] as any).items).toEqual(['Java', 'SQL', 'React', 'Git']);
    expect((r.projects[0] as any).name).toBe('Library System');
    expect(r.education[0]).toMatchObject({ degree: 'B.Tech CSE', college: 'ABC College', year: '2027', cgpa: '8.1' });
    expect((r.certifications[0] as any).year).toBe('2025');
  });

  it('is what import uses when no AI provider is configured', async () => {
    const r = await parseResumeText(TEXT);
    expect(r.contact.email).toBe('test@example.com');
  });
});
