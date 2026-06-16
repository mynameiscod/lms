import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { enrollmentPlanApi, PlanTask } from '../../api/enrollmentPlanApi';

// Per-kind visual language — matches the My Learning Plan day view cards.
const KIND_META: Record<string, { icon: string; label: string; accent: string; btn: string; verb: string }> = {
  content:       { icon: '🎬', label: 'Lesson',         accent: '#7c3aed', btn: '#7c3aed', verb: 'Open' },
  quiz:          { icon: '❓', label: 'Quiz',           accent: '#7c3aed', btn: '#7c3aed', verb: 'Start Quiz' },
  assignment:    { icon: '📋', label: 'Assignment',     accent: '#f59e0b', btn: '#2563eb', verb: 'Open Assignment' },
  codeSnippet:   { icon: '⌨️', label: 'Code Snippet',   accent: '#0ea5e9', btn: '#0ea5e9', verb: 'Solve' },
  mockInterview: { icon: '🎤', label: 'Mock Interview', accent: '#10b981', btn: '#f59e0b', verb: 'Start Interview' },
};

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const fmt = (s: string) => new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

function TaskCard({ t }: { t: PlanTask }) {
  const navigate = useNavigate();
  const m = KIND_META[t.kind] || KIND_META.content;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      background: '#fff', border: '1px solid #eef2f7',
      borderLeft: `4px solid ${t.overdue ? '#ef4444' : m.accent}`,
      borderRadius: 12, padding: '14px 18px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
    }}>
      <div style={{ width: 46, height: 46, borderRadius: 12, background: `${m.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{m.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ background: `${m.accent}15`, color: m.accent, borderRadius: 5, padding: '2px 9px', fontSize: 11.5, fontWeight: 700 }}>{m.label}</span>
          <span style={{ background: '#f1f5f9', color: '#94a3b8', borderRadius: 5, padding: '2px 9px', fontSize: 11.5, fontWeight: 600 }}>To do</span>
          {t.source === 'adhoc'
            ? <span style={{ background: '#fef3c7', color: '#b45309', borderRadius: 5, padding: '2px 9px', fontSize: 11.5, fontWeight: 700 }}>Direct</span>
            : <span style={{ fontSize: 11.5, color: '#94a3b8' }}>{t.curriculumTitle}{t.dayNumber ? ` · Day ${t.dayNumber}` : ''}</span>}
          {t.dueAt && <span style={{ fontSize: 11.5, color: t.overdue ? '#dc2626' : '#64748b', fontWeight: 700 }}>Due {fmt(t.dueAt)}</span>}
        </div>
      </div>
      <button onClick={() => navigate(t.launchPath)} style={{
        padding: '9px 18px', border: 'none', borderRadius: 9, background: m.btn, color: '#fff',
        fontSize: 13.5, fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
      }}>{m.verb}</button>
    </div>
  );
}

export default function MyTasks() {
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    enrollmentPlanApi.myTasks().then(setTasks).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const today = startOfDay(new Date()).getTime();
  const groups: { key: string; label: string; color: string; items: PlanTask[] }[] = [
    { key: 'overdue',  label: 'Overdue',  color: '#dc2626', items: [] },
    { key: 'today',    label: 'Today',    color: '#2563eb', items: [] },
    { key: 'upcoming', label: 'Upcoming', color: '#64748b', items: [] },
  ];
  tasks.forEach(t => {
    if (!t.dueAt) { groups[2].items.push(t); return; }
    const due = startOfDay(new Date(t.dueAt)).getTime();
    if (t.overdue || due < today) groups[0].items.push(t);
    else if (due === today) groups[1].items.push(t);
    else groups[2].items.push(t);
  });

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading your tasks…</div>;

  return (
    <div style={{ padding: '22px 26px', maxWidth: 960, margin: '0 auto' }}>
      {/* Header card */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, background: '#fff',
        border: '1px solid #eef2f7', borderRadius: 16, padding: '20px 24px', marginBottom: 20,
        boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
      }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>✅</div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>My Tasks</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13.5, color: '#64748b' }}>Everything assigned to you across your learning plans — in one place.</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: groups[0].items.length ? '#dc2626' : '#0f172a' }}>{tasks.length}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
            {groups[0].items.length > 0 ? `${groups[0].items.length} overdue` : 'pending'}
          </div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 56, color: '#94a3b8', background: '#f8fafc', borderRadius: 14, border: '1.5px dashed #e2e8f0' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
          <h3 style={{ color: '#0f172a', margin: '0 0 6px' }}>You're all caught up</h3>
          <p style={{ margin: 0 }}>No pending tasks right now.</p>
        </div>
      ) : groups.filter(g => g.items.length > 0).map(g => (
        <div key={g.key} style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: g.color }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: g.color }}>{g.label}</span>
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>({g.items.length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {g.items.map((t, i) => <TaskCard key={i} t={t} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
