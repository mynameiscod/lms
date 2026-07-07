import { getAnthropic, getOpenAI, isAnthropicEnabled } from './aiClients';
import * as settings from './settingsService';

/**
 * AI Project Builder (Module 4) — recommends 3-4 portfolio projects for a target role,
 * each with a full plan (tech stack, features, DB schema, API list, screens, README,
 * deployment steps and a task checklist). Falls back to a small built-in catalogue so
 * something always returns.
 */

export interface ProjectRecommendation {
  title: string;
  description: string;
  difficulty: string;
  techStack: string[];
  features: string[];
  dbSchema: string;
  apiList: string[];
  frontendScreens: string[];
  readme: string;
  deploymentSteps: string[];
  tasks: string[];
}

const stripJson = (s: string) => s.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();

async function ai(prompt: string, maxTokens = 3200): Promise<string> {
  if (isAnthropicEnabled()) {
    const anth = getAnthropic();
    if (anth) {
      const model = settings.getStr('ASSESSMENT_ROADMAP_MODEL', 'claude-sonnet-4-6');
      const r: any = await anth.messages.create({ model, max_tokens: maxTokens, temperature: 0.5, messages: [{ role: 'user', content: prompt }] });
      return (r.content || []).find((b: any) => b.type === 'text')?.text || '';
    }
  }
  const openai = getOpenAI();
  if (!openai) return '';
  const model = settings.getStr('OPENAI_MODEL', 'gpt-4o-mini');
  const resp = await openai.chat.completions.create({ model, temperature: 0.5, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] });
  return resp.choices[0]?.message?.content || '';
}

const asArr = (v: any): string[] => (Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : []);

function normalize(p: any): ProjectRecommendation | null {
  if (!p || !p.title) return null;
  return {
    title: String(p.title).slice(0, 120),
    description: String(p.description || '').slice(0, 600),
    difficulty: ['Beginner', 'Intermediate', 'Advanced'].includes(p.difficulty) ? p.difficulty : 'Intermediate',
    techStack: asArr(p.techStack).slice(0, 12),
    features: asArr(p.features).slice(0, 10),
    dbSchema: String(p.dbSchema || '').slice(0, 2000),
    apiList: asArr(p.apiList).slice(0, 20),
    frontendScreens: asArr(p.frontendScreens).slice(0, 15),
    readme: String(p.readme || '').slice(0, 4000),
    deploymentSteps: asArr(p.deploymentSteps).slice(0, 12),
    tasks: asArr(p.tasks).slice(0, 20),
  };
}

export async function recommendProjects(role: string, knownSkills: string[] = []): Promise<ProjectRecommendation[]> {
  const prompt = `You are a senior engineer and mentor. Recommend 3 portfolio-worthy projects for someone targeting the role of "${role || 'Software Developer'}". ${knownSkills.length ? `They already know: ${knownSkills.slice(0, 15).join(', ')}.` : ''} Make them progress Beginner → Intermediate → Advanced, resume-worthy and realistic to build solo.

Return ONLY valid JSON (no markdown) in this exact shape:
{
  "projects": [
    {
      "title": "string",
      "description": "2-3 sentences on what it does and why it's impressive",
      "difficulty": "Beginner|Intermediate|Advanced",
      "techStack": ["..."],
      "features": ["6-8 concrete features"],
      "dbSchema": "plain text — list the main tables and their key columns",
      "apiList": ["METHOD /path — what it does", "..."],
      "frontendScreens": ["screen names"],
      "readme": "a short GitHub README in markdown (title, overview, features, tech, setup steps)",
      "deploymentSteps": ["ordered deployment steps"],
      "tasks": ["8-12 ordered build tasks the student can check off"]
    }
  ]
}`;

  try {
    // Needs a high token ceiling: 3-4 full projects (schema + APIs + README + tasks)
    // easily exceed a small budget and truncate the JSON, forcing the fallback.
    const raw = await ai(prompt, 8000);
    if (raw) {
      const j = JSON.parse(stripJson(raw));
      const list = (Array.isArray(j.projects) ? j.projects : []).map(normalize).filter(Boolean) as ProjectRecommendation[];
      if (list.length) return list.slice(0, 4);
    }
  } catch { /* fall through */ }
  return fallback(role);
}

function fallback(role: string): ProjectRecommendation[] {
  const r = role || 'Full-Stack Developer';
  return [
    {
      title: 'Task Manager (To-Do) App',
      description: `A CRUD task manager with auth — the classic starter that proves you can build a full-stack ${r} app end to end.`,
      difficulty: 'Beginner',
      techStack: ['React', 'Node.js', 'Express', 'MongoDB', 'JWT'],
      features: ['User signup/login', 'Create/edit/delete tasks', 'Mark complete', 'Filter by status', 'Due dates', 'Responsive UI'],
      dbSchema: 'users(_id, name, email, passwordHash)\ntasks(_id, userId, title, status, dueDate, createdAt)',
      apiList: ['POST /auth/register', 'POST /auth/login', 'GET /tasks', 'POST /tasks', 'PUT /tasks/:id', 'DELETE /tasks/:id'],
      frontendScreens: ['Login', 'Register', 'Task List', 'Task Form'],
      readme: '# Task Manager\nA full-stack to-do app with auth.\n\n## Features\n- Auth, CRUD tasks, filters\n\n## Tech\nReact, Node, Express, MongoDB\n\n## Setup\n1. `npm install`\n2. set `.env`\n3. `npm run dev`',
      deploymentSteps: ['Push to GitHub', 'Deploy API (Render)', 'Deploy client (Vercel)', 'Set env vars', 'Point client to API URL'],
      tasks: ['Set up repo + folders', 'Auth API (register/login)', 'Task model + CRUD API', 'Login/Register UI', 'Task list UI', 'Connect API', 'Filters + due dates', 'Deploy'],
    },
    {
      title: 'Blog / Content Platform',
      description: `A multi-user blog with rich posts, comments and roles — shows real ${r} depth (relationships, auth roles, pagination).`,
      difficulty: 'Intermediate',
      techStack: ['React', 'Node.js', 'Express', 'MongoDB', 'JWT', 'Cloud storage'],
      features: ['Rich-text posts', 'Comments', 'Likes', 'User profiles', 'Roles (author/admin)', 'Search + pagination', 'Image upload'],
      dbSchema: 'users(_id, name, role)\nposts(_id, authorId, title, body, tags, createdAt)\ncomments(_id, postId, userId, text)',
      apiList: ['GET /posts?page', 'POST /posts', 'GET /posts/:id', 'POST /posts/:id/comments', 'POST /posts/:id/like'],
      frontendScreens: ['Feed', 'Post detail', 'Editor', 'Profile', 'Admin'],
      readme: '# Blog Platform\nMulti-user blog with comments and roles.',
      deploymentSteps: ['Push to GitHub', 'Deploy API', 'Deploy client', 'Configure image storage', 'Set env vars'],
      tasks: ['Schema + models', 'Auth + roles', 'Posts CRUD + pagination', 'Comments + likes', 'Editor UI', 'Feed + detail UI', 'Image upload', 'Search', 'Deploy'],
    },
    {
      title: 'Real-Time Chat / Collaboration App',
      description: `A real-time app with WebSockets — an advanced, standout project that demonstrates scalable ${r} skills.`,
      difficulty: 'Advanced',
      techStack: ['React', 'Node.js', 'Socket.IO', 'MongoDB', 'Redis', 'JWT', 'Docker'],
      features: ['Real-time messaging', 'Rooms/channels', 'Online presence', 'Typing indicators', 'Message history', 'Notifications'],
      dbSchema: 'users(_id, name)\nrooms(_id, name, members[])\nmessages(_id, roomId, userId, text, createdAt)',
      apiList: ['WS connect', 'GET /rooms', 'POST /rooms', 'GET /rooms/:id/messages', 'WS message:new'],
      frontendScreens: ['Login', 'Rooms list', 'Chat window', 'Members panel'],
      readme: '# Real-Time Chat\nWebSocket chat with rooms and presence.',
      deploymentSteps: ['Dockerize app', 'Deploy with Redis', 'Configure WebSocket scaling', 'Set env vars', 'Deploy client'],
      tasks: ['Socket server setup', 'Auth handshake', 'Rooms + membership', 'Real-time messaging', 'Presence + typing', 'Message history', 'Notifications', 'Dockerize', 'Deploy'],
    },
  ];
}
