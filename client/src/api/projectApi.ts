import axios from 'axios';

const BASE = '/api/v1/projects';
const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};

export interface ProjectPlan {
  _id?: string;
  targetRole?: string;
  title: string;
  description?: string;
  difficulty?: string;
  techStack: string[];
  features: string[];
  dbSchema?: string;
  apiList: string[];
  frontendScreens: string[];
  readme?: string;
  deploymentSteps: string[];
  tasks: { title: string; done: boolean }[];
  status?: 'planned' | 'in_progress' | 'completed';
  githubUrl?: string;
  createdAt?: string;
}

export const projectApi = {
  recommend: async (role?: string): Promise<{ role: string; projects: any[] }> => {
    const { data } = await axios.get(`${BASE}/recommend${role ? `?role=${encodeURIComponent(role)}` : ''}`, { headers: authHeader() });
    return data;
  },
  list: async (): Promise<ProjectPlan[]> => {
    const { data } = await axios.get(BASE, { headers: authHeader() });
    return data.projects || [];
  },
  get: async (id: string): Promise<ProjectPlan> => {
    const { data } = await axios.get(`${BASE}/${id}`, { headers: authHeader() });
    return data.project;
  },
  create: async (project: any): Promise<ProjectPlan> => {
    const { data } = await axios.post(BASE, project, { headers: authHeader() });
    return data.project;
  },
  toggleTask: async (id: string, index: number, done: boolean): Promise<ProjectPlan> => {
    const { data } = await axios.patch(`${BASE}/${id}/task`, { index, done }, { headers: authHeader() });
    return data.project;
  },
  update: async (id: string, patch: { githubUrl?: string; status?: string }): Promise<ProjectPlan> => {
    const { data } = await axios.patch(`${BASE}/${id}`, patch, { headers: authHeader() });
    return data.project;
  },
  remove: async (id: string): Promise<void> => {
    await axios.delete(`${BASE}/${id}`, { headers: authHeader() });
  },
};

export const PROJECT_ROLES = [
  'Java Full Stack', 'React Developer', 'Backend Developer',
  'Frontend Developer', 'MERN Developer', 'Python Developer',
];
