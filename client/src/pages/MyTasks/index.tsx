import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { enrollmentPlanApi, PlanTask } from '../../api/enrollmentPlanApi';

const KIND_META: Record<string, { icon: string; label: string; color: string; verb: string }> = {
  content:       { icon: '📄', label: 'Lesson',         color: '#64748b', verb: 'Open' },
  quiz:          { icon: '📝', label: 'Quiz',           color: '#7c3aed', verb: 'Start' },
  assignment:    { icon: '📋', label: 'Assignment',     color: '#2563eb', verb: 'Open' },
  codeSnippet:   { icon: '⌨️', label: 'Code Snippet',   color: '#0ea5e9', verb: 'Solve' },
  mockInterview: { icon: '🎤', label: 'Mock Interview', color: '#f59e0b', verb: 'Start' },
};

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const fmt = (s: string) => new Date(s).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

export default function MyTasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    enrollmentPlanApi.myTasks().then(setTasks).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const today = startOfDay(new Date()).getTime();
  const groups: { key: string; label: string; color: string; items: PlanTask[] }[] = [
    { key: 'overdue',  label: '⚠️ Overdue',  color: '#dc2626', items: [] },
    { key: 'today',    label: '📌 Today',    color: '#2563eb', items: [] },
    { key: 'upcoming', label: '🗓 Upcoming', color: '#64748b', items: [] },
  ];
  tasks.forEach(t => {
    const due = startOfDay(new Date(t.dueAt)).getTime();
    if (t.overdue || due < today) groups[0].items.push(t);
    else if (due === today) groups[1].items.push(t);
    else groups[2].items.push(t);
  });

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading your tasks…</div>;

  return (
    <div style={{ padding: 24, maxWidth: 820, margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>✅ My Tasks</h2>
      <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 13 }}>Everything assigned to you across your learning plans, in one place.</p>

      {tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: '#94a3b8', background: '#f8fafc', borderRadius: 12, border: '1.5px dashed #e2e8f0' }}>
          🎉 You're all caught up — no pending tasks.
        </div>
      ) : groups.filter(g => g.items.length > 0).map(g => (
        <div key={g.key} style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: g.color, marginBottom: 8 }}>{g.label} <span style={{ color: '#94a3b8' }}>({g.items.length})</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {g.items.map((t, i) => {
              const m = KIND_META[t.kind] || KIND_META.content;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: `${m.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{m.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ background: `${m.color}15`, color: m.color, borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{m.label}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{t.curriculumTitle} · Day {t.dayNumber}</span>
                      <span style={{ fontSize: 11, color: t.overdue ? '#dc2626' : '#64748b', fontWeight: 600 }}>Due {fmt(t.dueAt)}</span>
                    </div>
                  </div>
                  <button onClick={() => navigate(t.launchPath)} style={{ padding: '7px 14px', border: 'none', borderRadius: 8, background: m.color, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                    {m.verb}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
