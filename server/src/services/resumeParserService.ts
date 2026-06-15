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

  const openai = getOpenAI();
  if (!openai) throw new Error('OPENAI_API_KEY is not configured on the server.');
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
