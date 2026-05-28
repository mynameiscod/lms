import OpenAI from 'openai';
import { IResumeSections, IResumeScore } from '../models/Resume';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function scoreResume(sections: IResumeSections): Promise<IResumeScore> {
  const prompt = `You are an expert resume evaluator and ATS specialist. Score this resume and provide actionable feedback.

Score each section out of the following max points:
- contact: max 10 (has name, email, phone, LinkedIn, GitHub = full marks)
- summary: max 15 (has one, mentions role/skills/years of experience, concise 2-3 lines)
- experience: max 20 (action verbs, quantified achievements like %, numbers, relevant bullets)
- education: max 15 (has degree, college, year, CGPA/percentage)
- skills: max 20 (technical skills present, logically grouped by category, 10+ skills)
- projects: max 10 (2+ projects with tech stack, outcomes mentioned, links a bonus)
- ats: max 10 (no tables/columns, parseable, has keywords for software roles)

Return ONLY a valid JSON object (no markdown):
{
  "total": 72,
  "breakdown": {
    "contact": 8,
    "summary": 10,
    "experience": 14,
    "education": 12,
    "skills": 16,
    "projects": 7,
    "ats": 5
  },
  "suggestions": [
    {
      "section": "experience",
      "issue": "Bullets lack quantified impact",
      "fix": "Add numbers — e.g. 'Reduced API response time by 40%' or 'Onboarded 5 new clients'"
    },
    {
      "section": "summary",
      "issue": "Summary is missing",
      "fix": "Add a 2-3 line professional summary mentioning your role, years of experience, and top skills"
    }
  ],
  "atsWarnings": ["Avoid using tables or columns — ATS parsers often skip them", "Remove photo if any"],
  "keywordsFound": ["React", "Node.js", "MongoDB"],
  "keywordsMissing": ["TypeScript", "REST API", "Git", "Agile", "CI/CD"]
}

Keep suggestions specific and actionable (max 6). Only flag real issues you see.

Resume data:
${JSON.stringify(sections, null, 2).slice(0, 4000)}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 1500,
  });

  const content = response.choices[0]?.message?.content || '{}';
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    // Clamp all scores to their max values
    const b = parsed.breakdown || {};
    return {
      total: Math.min(parsed.total ?? 0, 100),
      breakdown: {
        contact: Math.min(b.contact ?? 0, 10),
        summary: Math.min(b.summary ?? 0, 15),
        experience: Math.min(b.experience ?? 0, 20),
        education: Math.min(b.education ?? 0, 15),
        skills: Math.min(b.skills ?? 0, 20),
        projects: Math.min(b.projects ?? 0, 10),
        ats: Math.min(b.ats ?? 0, 10),
      },
      suggestions: parsed.suggestions ?? [],
      atsWarnings: parsed.atsWarnings ?? [],
      keywordsFound: parsed.keywordsFound ?? [],
      keywordsMissing: parsed.keywordsMissing ?? [],
    };
  } catch {
    return getZeroScore();
  }
}

function getZeroScore(): IResumeScore {
  return {
    total: 0,
    breakdown: { contact: 0, summary: 0, experience: 0, education: 0, skills: 0, projects: 0, ats: 0 },
    suggestions: [],
    atsWarnings: [],
    keywordsFound: [],
    keywordsMissing: [],
  };
}
