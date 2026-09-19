import fs from 'fs';
import path from 'path';
import { getOpenAI } from './aiClients';
import { IResumeSections } from '../models/Resume';

// Extract raw text from PDF or DOCX file
export async function extractTextFromFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf') {
    // pdf-parse v1 exports a function directly; guard for any wrapped export
    const mod = require('pdf-parse');
    const pdfParse = typeof mod === 'function' ? mod : (mod.default || mod.pdf);
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text || '';
  }

  if (ext === '.docx' || ext === '.doc') {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || '';
  }

  throw new Error('Unsupported file type. Please upload a PDF or DOCX file.');
}

// Use OpenAI to structure raw resume text into our schema
export async function parseResumeText(rawText: string): Promise<IResumeSections> {
  const prompt = `You are a resume parser. Extract structured data from the following resume text.

Return ONLY a valid JSON object matching this exact schema (no markdown, no explanation):
{
  "contact": {
    "name": "Full Name",
    "email": "email@example.com",
    "phone": "+91 9999999999",
    "linkedin": "https://linkedin.com/in/...",
    "github": "https://github.com/...",
    "portfolio": "",
    "location": "City, State"
  },
  "summary": "Professional summary text here",
  "experience": [
    {
      "company": "Company Name",
      "role": "Job Title",
      "from": "Jan 2022",
      "to": "Dec 2023",
      "current": false,
      "bullets": ["Achievement or responsibility 1", "Achievement or responsibility 2"]
    }
  ],
  "education": [
    {
      "degree": "B.Tech in Computer Science",
      "college": "College Name",
      "university": "University Name",
      "year": "2023",
      "cgpa": "8.5"
    }
  ],
  "skills": [
    { "category": "Languages", "items": ["JavaScript", "Python"] },
    { "category": "Frameworks", "items": ["React", "Node.js"] },
    { "category": "Tools", "items": ["Git", "Docker"] }
  ],
  "projects": [
    {
      "name": "Project Name",
      "tech": ["React", "Node.js"],
      "description": "Brief description of the project and its impact",
      "link": "https://github.com/..."
    }
  ],
  "certifications": [
    { "name": "AWS Solutions Architect", "issuer": "Amazon", "year": "2023" }
  ]
}

If a field is not found, use an empty string or empty array. Do not invent data.
Group skills logically (Languages, Frameworks, Tools, Databases, Cloud, etc.).

Resume text:
${rawText.slice(0, 6000)}`;

  // Without an AI key the text is still worth having: a rule-based read fills what it can, and the member edits the
  // rest, instead of being told the file could not be read.
  const openai = getOpenAI();
  if (!openai) return parseResumeTextByRules(rawText);
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content || '{}';

  // Strip markdown code fences if present
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(cleaned) as IResumeSections;
  } catch {
    return getEmptySections();
  }
}

export function getEmptySections(): IResumeSections {
  return {
    contact: { name: '', email: '', phone: '', linkedin: '', github: '', portfolio: '', location: '' },
    summary: '',
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
  };
}


/**
 * A rule-based read of a resume's text — used when no AI provider is configured.
 *
 * Contact details come from their shapes (email, phone, LinkedIn/GitHub URLs; the name is the first short line).
 * The rest is split by the usual section headings, and each section is filled simply: the summary as a paragraph,
 * skills as one comma-separated list, and one entry per line for education, experience, projects and certifications.
 * It never invents anything; what it cannot place is left for the member to type.
 */
const HEADINGS: Array<{ key: string; re: RegExp }> = [
  { key: 'summary', re: /^(professional\s+)?(summary|profile|objective|about(\s+me)?|career\s+objective)\b/i },
  { key: 'skills', re: /^(technical\s+)?skills?\b|^core\s+competenc|^technologies\b/i },
  { key: 'experience', re: /^(work\s+|professional\s+)?experience\b|^internships?\b|^employment\b/i },
  { key: 'projects', re: /^(academic\s+|personal\s+)?projects?\b/i },
  { key: 'education', re: /^education\b|^academic(s|\s+details|\s+background)?\b|^qualifications?\b/i },
  { key: 'certifications', re: /^certifications?\b|^certificates?\b|^courses?\b|^achievements?\b/i },
];

const yearIn = (s: string) => (s.match(/\b(19|20)\d{2}\b/) || [''])[0];

export function parseResumeTextByRules(rawText: string): IResumeSections {
  const out = getEmptySections();
  const text = String(rawText || '').replace(/\r/g, '');
  const lines = text.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);

  out.contact.email = (text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [''])[0];
  out.contact.phone = ((text.match(/\+?\d[\d\s-]{8,}\d/) || [''])[0]).trim();
  out.contact.linkedin = (text.match(/(https?:\/\/)?(www\.)?linkedin\.com\/[^\s,|]+/i) || [''])[0];
  out.contact.github = (text.match(/(https?:\/\/)?(www\.)?github\.com\/[^\s,|]+/i) || [''])[0];
  const nameLine = lines.find(l => l.length <= 40 && /^[A-Za-z][A-Za-z .'-]+$/.test(l) && !HEADINGS.some(h => h.re.test(l)));
  out.contact.name = nameLine || '';

  const buckets: Record<string, string[]> = {};
  let current = '';
  for (const line of lines) {
    const head = line.length <= 40 ? HEADINGS.find(h => h.re.test(line)) : undefined;
    if (head) {
      current = head.key;
      buckets[current] = buckets[current] || [];
      const rest = line.replace(head.re, '').replace(/^[\s:–-]+/, '');
      if (rest) buckets[current].push(rest);
      continue;
    }
    if (current) buckets[current].push(line);
  }

  out.summary = (buckets.summary || []).join(' ');
  const skills = (buckets.skills || []).join(', ').split(/[,|•·;]/)
    .map(x => x.replace(/^[^:]*:\s*/, '').trim()).filter(x => x && x.length <= 40);
  if (skills.length) out.skills = [{ category: 'Skills', items: Array.from(new Set(skills)) }] as any;
  // "B.Tech CSE, ABC College, 2027, CGPA 8.1" → degree, college, year and CGPA, each where it belongs.
  out.education = (buckets.education || []).map(l => {
    const parts = l.split(/\s*[,|]\s*/).filter(Boolean);
    const cgpa = (l.match(/(?:cgpa|gpa|percentage)\s*[:-]?\s*([\d.]+%?)/i) || [])[1] || '';
    const rest = parts.filter(x => !/^(19|20)\d{2}$/.test(x) && !/(cgpa|gpa|percentage)/i.test(x));
    return { degree: rest[0] || l, college: rest.slice(1).join(', '), university: '', year: yearIn(l), cgpa };
  }) as any;
  out.experience = (buckets.experience || []).map(l => ({ company: '', role: l, from: '', to: '', current: false, bullets: [] })) as any;
  out.projects = (buckets.projects || []).map(l => {
    const [name, ...rest] = l.split(/\s[–—-]\s|:\s/);
    return { name: name.trim(), tech: [], description: rest.join(' - ').trim(), link: '' };
  }) as any;
  out.certifications = (buckets.certifications || []).map(l => ({ name: l, issuer: '', year: yearIn(l) })) as any;
  return out;
}
