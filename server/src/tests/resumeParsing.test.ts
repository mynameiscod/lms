/**
 * Resume import and scoring.
 *
 * The import must read a resume into the right sections without rewording anything, and the score must be the
 * same every time for the same resume, with a fresher not penalised for having no job.
 */
import { parseResumeTextByRules, __test } from '../services/resumeParserService';
import { scoreByRubric } from '../services/resumeRubric';

const SINGLE_COLUMN = `
Priya Sharma
Java Full Stack Developer
Hyderabad, Telangana | +91 98765 43210 | priya.sharma21@gmail.com | linkedin.com/in/priya-sharma-dev |
github.com/priyasharma
PROFESSIONAL SUMMARY
Final-year B.Tech CSE student with hands-on experience building REST APIs in Spring Boot and React front
ends. Built 3 full-stack projects and completed a 3-month internship at a fintech startup.
EDUCATION
B.Tech, Computer Science and Engineering — Vardhaman College of Engineering, Hyderabad | 2022 –
2026 | CGPA: 8.4
Intermediate (MPC) — Sri Chaitanya Junior College | 2020 – 2022 | 94.6%
TECHNICAL SKILLS
Languages: Java, Python, JavaScript, SQL
Frameworks: Spring Boot, React, Hibernate, Bootstrap
Tools: Git, Docker, Postman, IntelliJ IDEA
Databases: MySQL, MongoDB
EXPERIENCE
Software Engineering Intern — PayKart Technologies, Hyderabad | May 2025 – Jul 2025
Built 6 REST endpoints in Spring Boot for the merchant onboarding flow used by 1,200 merchants.
Reduced API response time by 35% by adding Redis caching to the KYC lookup service.
Wrote 40+ JUnit tests, raising coverage of the payments module from 52% to 81%.
PROJECTS
ShopEase – E-commerce Web App | Spring Boot, React, MySQL | github.com/priyasharma/shopease
Developed a full-stack store with cart, JWT login and Razorpay test payments.
Designed 9 normalized MySQL tables and indexed product search, cutting query time from 800 ms to
120 ms.
StudyBuddy – Doubt Sharing Platform | React, Node.js, MongoDB
Built a Q&A platform used by 150 students in my college with real-time answers using Socket.IO.
CERTIFICATIONS
Oracle Certified Associate, Java SE 8 Programmer — Oracle, 2024
ACHIEVEMENTS
Finalist, Smart India Hackathon 2024
`;

const LABELLED = `
K. SAI KIRAN
Email: saikiran.k2003@gmail.com | Mobile: 9988776655
Vijayawada, Andhra Pradesh
CAREER OBJECTIVE
To work in a challenging environment where I can apply my skills in Python and web development.
ACADEMIC DETAILS
Qualification | Institution | Year | Percentage/CGPA
B.Tech (ECE) | PVP Siddhartha Institute of Technology | 2025 | 7.9 CGPA
SSC | Sri Chaitanya School | 2019 | 9.8 GPA
TECHNICAL SKILLS
• Programming Languages: Python, C
• Database: MySQL
PROJECTS
Project Title: Online Bus Ticket Booking System
Technologies Used: Django, MySQL, Bootstrap
Description: A web application that lets passengers search buses, choose seats and book tickets online.
INTERNSHIP
Company: Technical Hub, Surampalem
Role: Python Developer Intern
Duration: June 2024 – August 2024
• Developed REST APIs for a student portal using Django REST Framework.
LANGUAGES
English, Telugu
`;

describe('reading a resume (no AI)', () => {
  const r = parseResumeTextByRules(SINGLE_COLUMN);

  it('reads the contact block, including the headline and the city', () => {
    expect(r.contact).toMatchObject({
      name: 'Priya Sharma', title: 'Java Full Stack Developer', email: 'priya.sharma21@gmail.com',
      phone: '+91 98765 43210', linkedin: 'linkedin.com/in/priya-sharma-dev', github: 'github.com/priyasharma',
      location: 'Hyderabad, Telangana', portfolio: '',
    });
  });

  it('joins lines the PDF wrapped, so a sentence is not split into two entries', () => {
    expect(r.summary).toBe('Final-year B.Tech CSE student with hands-on experience building REST APIs in Spring Boot and React front ends. Built 3 full-stack projects and completed a 3-month internship at a fintech startup.');
  });

  it('keeps one job with its role, company, dates and its own bullets — not one entry per bullet', () => {
    expect(r.experience).toHaveLength(1);
    expect(r.experience[0]).toMatchObject({ role: 'Software Engineering Intern', company: 'PayKart Technologies, Hyderabad', from: 'May 2025', to: 'Jul 2025' });
    expect(r.experience[0].bullets).toHaveLength(3);
  });

  it('splits education into degree, college, year and grade', () => {
    expect(r.education[0]).toMatchObject({ degree: 'B.Tech, Computer Science and Engineering', college: 'Vardhaman College of Engineering, Hyderabad', year: '2026', cgpa: '8.4' });
    expect(r.education[1]).toMatchObject({ degree: 'Intermediate (MPC)', college: 'Sri Chaitanya Junior College', year: '2022', cgpa: '94.6%' });
  });

  it('keeps the resume’s own skill groups — "Languages:" inside Skills is not the spoken-languages section', () => {
    expect(r.skills.map(g => g.category)).toEqual(['Languages', 'Frameworks', 'Tools', 'Databases']);
    expect(r.skills[0].items).toEqual(['Java', 'Python', 'JavaScript', 'SQL']);
  });

  it('reads each project with its tech, link and bullets, and does not mistake "Socket.IO" for a link', () => {
    expect(r.projects).toHaveLength(2);
    expect(r.projects[0]).toMatchObject({ name: 'ShopEase – E-commerce Web App', tech: ['Spring Boot', 'React', 'MySQL'], link: 'github.com/priyasharma/shopease' });
    expect(r.projects[0].description).toContain('<li>Designed 9 normalized MySQL tables and indexed product search, cutting query time from 800 ms to 120 ms.</li>');
    expect(r.projects[1].link).toBe('');
  });

  it('keeps an achievement whole', () => {
    expect(r.certifications.map(c => c.name)).toContain('Finalist, Smart India Hackathon');
  });

  it('reads the labelled format ("Project Title:", "Company:", "Role:") and table rows', () => {
    const l = parseResumeTextByRules(LABELLED);
    expect(l.contact).toMatchObject({ name: 'K. Sai Kiran', phone: '9988776655', location: 'Vijayawada, Andhra Pradesh' });
    expect(l.education[0]).toMatchObject({ degree: 'B.Tech (ECE)', college: 'PVP Siddhartha Institute of Technology', year: '2025', cgpa: '7.9' });
    expect(l.education).toHaveLength(2); // the table's header row is not an entry
    expect(l.projects[0]).toMatchObject({ name: 'Online Bus Ticket Booking System', tech: ['Django', 'MySQL', 'Bootstrap'] });
    expect(l.projects[0].description).toBe('A web application that lets passengers search buses, choose seats and book tickets online.');
    expect(l.experience[0]).toMatchObject({ company: 'Technical Hub, Surampalem', role: 'Python Developer Intern', from: 'June 2024', to: 'August 2024' });
    // Spoken languages are not skills.
    expect(l.skills.flatMap(g => g.items)).not.toContain('English');
  });
});

describe('an AI read is checked against the resume', () => {
  const rules = parseResumeTextByRules(SINGLE_COLUMN);
  const ai = {
    contact: { name: 'Priya Sharma', email: 'priya.sharma21@gmail.com', title: 'Senior Java Architect' },
    summary: 'Passionate engineer with 5 years of experience leading teams.',
    experience: [{
      company: 'PayKart Technologies', role: 'Software Engineering Intern', from: 'May 2025', to: 'Jul 2025',
      bullets: [
        'Built 6 REST endpoints in Spring Boot for the merchant onboarding flow used by 1,200 merchants.',
        'Reduced API latency by 35% through Redis caching for the KYC lookup service.', // reworded
        'Led a team of 10 engineers to launch a new payments product.',                  // invented
      ],
    }],
    skills: [{ category: 'Languages', items: ['Java', 'Kubernetes'] }], // Kubernetes is not in the resume
  };
  const v = __test.verifyAgainstSource(ai, rules, SINGLE_COLUMN);

  it('keeps a value that is really in the resume', () => {
    expect(v.experience[0].bullets[0]).toBe('Built 6 REST endpoints in Spring Boot for the merchant onboarding flow used by 1,200 merchants.');
  });
  it('replaces a reworded line with the line the resume actually has', () => {
    expect(v.experience[0].bullets[1]).toBe('Reduced API response time by 35% by adding Redis caching to the KYC lookup service.');
  });
  it('drops what the resume never said', () => {
    expect(v.experience[0].bullets.join(' ')).not.toContain('team of 10');
    expect(v.skills.flatMap(g => g.items)).not.toContain('Kubernetes');
    expect(v.contact.title).toBe('Java Full Stack Developer');
    expect(v.summary).not.toContain('5 years');
  });
});

describe('the resume score', () => {
  const r = parseResumeTextByRules(SINGLE_COLUMN);

  it('is the same every time for the same resume', () => {
    expect(scoreByRubric(r).total).toBe(scoreByRubric(JSON.parse(JSON.stringify(r))).total);
  });

  it('adds up: the total is the sum of the sections, each within its maximum', () => {
    const s = scoreByRubric(r);
    const sum = Object.values(s.breakdown).reduce((a, b) => a + b, 0);
    expect(s.total).toBe(Math.min(100, sum));
    for (const [k, v] of Object.entries(s.breakdown)) expect(v).toBeLessThanOrEqual((s.maxes as any)[k]);
    expect(Object.values(s.maxes).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('scores a complete, specific resume well and an empty one near zero', () => {
    expect(scoreByRubric(r).total).toBeGreaterThanOrEqual(75);
    expect(scoreByRubric({ contact: { name: '', email: '', phone: '' }, summary: '', experience: [], education: [], skills: [], projects: [], certifications: [] } as any).total).toBeLessThan(15);
  });

  it('does not penalise a fresher for having no job: experience weight moves to projects', () => {
    const fresher = { ...r, experience: [] };
    const s = scoreByRubric(fresher);
    expect(s.fresher).toBe(true);
    expect(s.maxes.experience).toBe(0);
    expect(s.maxes.projects).toBe(35);
  });

  it('rewards specific, measured bullets over vague ones', () => {
    const vague = JSON.parse(JSON.stringify(r));
    vague.experience[0].bullets = ['Responsible for working on various APIs.', 'Worked on the payments module.', 'Helped with testing.'];
    expect(scoreByRubric(vague).total).toBeLessThan(scoreByRubric(r).total);
  });

  it('names the keywords a target role expects and which are missing', () => {
    const s = scoreByRubric(r);
    expect(s.keywordsFound).toEqual(expect.arrayContaining(['Java', 'Spring Boot', 'MySQL']));
    expect(s.keywordsMissing.length).toBeGreaterThan(0);
    expect(s.suggestions.length).toBeGreaterThan(0);
  });
});

describe('a member with no target role yet', () => {
  it('is measured against general software keywords, not a role called "NOT SURE"', () => {
    const r = parseResumeTextByRules(SINGLE_COLUMN);
    const s = scoreByRubric({ ...r, contact: { ...r.contact, title: '' } }, { targetRole: 'NOT SURE' });
    expect(s.checks.find(c => c.section === 'skills' && /Keywords/.test(c.label))!.label).toBe('Keywords for software roles');
  });
});
