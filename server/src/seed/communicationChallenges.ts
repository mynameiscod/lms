import mongoose from 'mongoose';
import CommunicationChallenge from '../models/CommunicationChallenge';

type Seed = { title: string; description?: string; type?: string; points?: string[] };

// 30 daily self-introduction variations across categories. Order = daily rotation.
export const SELF_INTRO_SEED: Seed[] = [
  { title: 'Complete 3-Minute Self-Introduction', description: 'Give your full self-introduction covering education, skills, project, strengths and goals.', points: ['Greeting', 'Name & location', 'Education', 'Skills', 'Project', 'Strengths', 'Career goal', 'Closing'] },
  { title: 'Self-Introduction Without Family Details', description: 'Introduce yourself focusing purely on your professional profile — no personal/family details.', points: ['Education', 'Skills', 'Project', 'Goal'] },
  { title: 'Technical Self-Introduction', description: 'Emphasize your technical skills, tools, and hands-on project work.', type: 'self_introduction', points: ['Skills depth', 'Tech stack', 'Project internals'] },
  { title: 'Self-Introduction for a Service-Based Company', description: 'Tailor your intro for a service company — highlight adaptability, learning ability, and teamwork.', points: ['Flexibility', 'Willingness to learn', 'Communication'] },
  { title: 'Self-Introduction for a Product-Based Company', description: 'Tailor your intro for a product company — emphasize problem-solving, ownership and depth.', points: ['Problem solving', 'Ownership', 'Technical depth'] },
  { title: 'Two-Minute Self-Introduction', description: 'A crisp, high-impact 2-minute version. Keep only the most important points.', points: ['Conciseness', 'Impact', 'Clarity'] },
  { title: 'Project-Focused Introduction', description: 'Introduce yourself with strong emphasis on your main project — objective, tech, and your role.', points: ['Objective', 'Technologies', 'Your contribution', 'Outcome'] },
  { title: 'Introduce Yourself for a Java Developer Role', description: 'Position yourself for a Java Developer role — Java, Spring Boot, REST, databases.', points: ['Java skills', 'Backend project', 'Role fit'] },
  { title: 'Introduce Yourself for a Frontend Developer Role', description: 'Position yourself for a Frontend role — HTML/CSS/JS, React, UI work.', points: ['Frontend skills', 'UI project', 'Role fit'] },
  { title: 'Introduction with Emphasis on Strengths', description: 'Bring your strengths to the front and back them with real examples.', points: ['Strengths', 'Evidence', 'Relevance'] },
  { title: 'Introduction Without Reading Notes', description: 'Speak naturally without reading. Focus on flow and confidence.', points: ['Natural flow', 'Eye contact', 'Confidence'] },
  { title: 'Introduction with Strong Project Explanation', description: 'Explain your project clearly enough that a non-technical person understands it.', points: ['Clarity', 'Structure', 'Impact'] },
  { title: 'Introduction for an HR Round', description: 'A friendly, well-structured intro suited to an HR round — personable and clear.', type: 'self_introduction', points: ['Warmth', 'Clarity', 'Goals'] },
  { title: 'Introduction for a Technical Round', description: 'A focused intro for a technical interviewer — depth over breadth.', points: ['Technical depth', 'Project detail', 'Precision'] },
  { title: 'Introduction with Improved Confidence & Eye Contact', description: 'Practise steady pacing, confident tone, and looking at the camera.', points: ['Confidence', 'Pacing', 'Eye contact'] },
  { title: 'Introduction Highlighting Teamwork', description: 'Show how you work in a team — collaboration, communication, and reliability.', points: ['Collaboration', 'Communication', 'Reliability'] },
  { title: 'Introduction Highlighting Problem Solving', description: 'Describe a problem you solved and how you approached it.', points: ['Problem', 'Approach', 'Result'] },
  { title: 'Introduction for a Full-Stack Role', description: 'Position yourself for a full-stack role — both frontend and backend strengths.', points: ['Frontend', 'Backend', 'End-to-end project'] },
  { title: 'One-Minute Elevator Pitch', description: 'A 60-second version — who you are, what you do, what you want.', points: ['Hook', 'Value', 'Ask'] },
  { title: 'Introduction Focusing on Career Goals', description: 'Explain your short-term and long-term goals and why they matter.', points: ['Short-term goal', 'Long-term goal', 'Motivation'] },
  { title: 'Introduction with a Strong Opening & Closing', description: 'Make the first and last 15 seconds memorable.', points: ['Opening line', 'Closing line', 'Confidence'] },
  { title: 'Introduction Emphasizing Internship Experience', description: 'Highlight what you learned and delivered during training/internship.', points: ['What you did', 'What you learned', 'Impact'] },
  { title: 'Introduction for a Data / Python Role', description: 'Position yourself for a data/Python role — Python, data handling, relevant project.', points: ['Python skills', 'Data project', 'Role fit'] },
  { title: 'Introduction Reducing Filler Words', description: 'Deliver your intro with minimal fillers (um, uh, like, basically).', points: ['Pauses over fillers', 'Clarity', 'Composure'] },
  { title: 'Introduction with Perfect Pacing', description: 'Aim for 120–150 words per minute — not too fast, not too slow.', points: ['Pacing', 'Clarity', 'Breathing'] },
  { title: 'Introduction Explaining Your Tech Stack', description: 'Walk through your tech stack and where you used each technology.', points: ['Stack', 'Usage context', 'Depth'] },
  { title: 'Introduction for a Fresher with No Internship', description: 'Confidently present academic projects and self-learning in place of internship.', points: ['Projects', 'Self-learning', 'Attitude'] },
  { title: 'Introduction Answering "Tell Me About Yourself"', description: 'The classic interview opener — structured, relevant, and concise.', points: ['Structure', 'Relevance', 'Confidence'] },
  { title: 'Introduction with a Real Example of a Strength', description: 'Pick one strength and prove it with a specific story.', points: ['Strength', 'Story', 'Result'] },
  { title: '30-Day Mastery Introduction', description: 'Your best, most polished full introduction after a month of practice.', points: ['Everything together', 'Confidence', 'Polish'] },
];

/** Idempotently ensure the seeded self-introduction challenges exist for a tenant. */
export async function ensureSeedChallenges(tenantId: string, createdBy?: string): Promise<number> {
  const existing = await CommunicationChallenge.countDocuments({ tenantId, isSeed: true, challengeType: 'self_introduction' });
  if (existing >= SELF_INTRO_SEED.length) return existing;

  const ops = SELF_INTRO_SEED.map((s, i) => ({
    updateOne: {
      filter: { tenantId: new mongoose.Types.ObjectId(tenantId), isSeed: true, challengeType: 'self_introduction', sequenceNumber: i + 1 },
      update: {
        $setOnInsert: {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          title: s.title,
          description: s.description || '',
          challengeType: 'self_introduction',
          suggestedPoints: s.points || [],
          minSeconds: 120, targetSeconds: 180, maxSeconds: 210, maxAttempts: 2,
          recordingModes: ['audio', 'video'],
          sequenceNumber: i + 1,
          active: true, isSeed: true,
          ...(createdBy ? { createdBy: new mongoose.Types.ObjectId(createdBy) } : {}),
        },
      },
      upsert: true,
    },
  }));
  await CommunicationChallenge.bulkWrite(ops);
  return CommunicationChallenge.countDocuments({ tenantId, isSeed: true, challengeType: 'self_introduction' });
}
