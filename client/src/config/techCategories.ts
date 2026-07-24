// Primary language/tech categories for organizing & reusing assignments/quizzes.
// Values MUST match the server-side TechCategory enum (models/Assignment.ts).
export interface TechCategoryDef { value: string; label: string; icon: string; color: string; }

export const TECH_CATEGORIES: TechCategoryDef[] = [
  { value: 'java',       label: 'Java',        icon: '☕', color: '#b91c1c' },
  { value: 'javascript', label: 'JavaScript',  icon: '🟨', color: '#ca8a04' },
  { value: 'typescript', label: 'TypeScript',  icon: '🔷', color: '#2563eb' },
  { value: 'html_css',   label: 'HTML / CSS',  icon: '🌐', color: '#ea580c' },
  { value: 'react',      label: 'React',       icon: '⚛️', color: '#0891b2' },
  { value: 'python',     label: 'Python',      icon: '🐍', color: '#16a34a' },
  { value: 'sql',        label: 'SQL',         icon: '🗄️', color: '#7c3aed' },
  { value: 'cpp',        label: 'C++',         icon: '⚡', color: '#1d4ed8' },
  { value: 'c',          label: 'C',           icon: '🔧', color: '#475569' },
  { value: 'csharp',     label: 'C#',          icon: '🎯', color: '#6d28d9' },
  { value: 'go',         label: 'Go',          icon: '🐹', color: '#0ea5e9' },
  { value: 'rust',       label: 'Rust',        icon: '🦀', color: '#b45309' },
  { value: 'dsa',        label: 'DSA',         icon: '🧠', color: '#be185d' },
  { value: 'other',      label: 'Other',       icon: '📦', color: '#64748b' },
];

export const techDef = (v?: string): TechCategoryDef | undefined => TECH_CATEGORIES.find(t => t.value === v);
