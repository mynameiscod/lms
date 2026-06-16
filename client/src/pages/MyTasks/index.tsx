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

const PAGE_SIZE = 8;
const GROUP_META: Record<string, { label: string; color: string }> = {
  overdue:  { label: 'Overdue',  color: '#dc2626' },
  today:    { label: 'Today',    color: '#2563eb' },
  upcoming: { label: 'Upcoming', color: '#64748b' },
};

export default function MyTasks() {
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    enrollmentPlanApi.myTasks().then(setTasks).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const today = startOfDay(new Date()).getTime();
  const groupOf = (t: PlanTask): 'overdue' | 'today' | 'upcoming' => {
    if (!t.dueAt) return 'upcoming';
    const due = startOfDay(new Date(t.dueAt)).getTime();
    if (t.overdue || due < today) return 'overdue';
    if (due === today) return 'today';
    return 'upcoming';
  };
  // Flat, ordered (overdue → today → upcoming) with a group tag for headers.
  const order = { overdue: 0, today: 1, upcoming: 2 } as const;
  const flat = tasks.map(t => ({ t, g: groupOf(t) })).sort((a, b) => order[a.g] - order[b.g]);
  const overdueCount = flat.filter(x => x.g === 'overdue').length;

  const totalPages = Math.max(1, Math.ceil(flat.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = flat.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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
          <div style={{ fontSize: 26, fontWeight: 800, color: overdueCount ? '#dc2626' : '#0f172a' }}>{tasks.length}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
            {overdueCount > 0 ? `${overdueCount} overdue` : 'pending'}
          </div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 56, color: '#94a3b8', background: '#f8fafc', borderRadius: 14, border: '1.5px dashed #e2e8f0' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
          <h3 style={{ color: '#0f172a', margin: '0 0 6px' }}>You're all caught up</h3>
          <p style={{ margin: 0 }}>No pending tasks right now.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pageItems.map(({ t, g }, i) => {
              const prevG = i > 0 ? pageItems[i - 1].g : null;
              const showHeader = g !== prevG;
              const gm = GROUP_META[g];
              return (
                <React.Fragment key={i}>
                  {showHeader && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: i === 0 ? '0 0 2px' : '12px 0 2px' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: gm.color }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: gm.color }}>{gm.label}</span>
                    </div>
                  )}
                  <TaskCard t={t} />
                </React.Fragment>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 22 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                style={{ padding: '7px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', color: safePage === 1 ? '#cbd5e1' : '#334155', fontSize: 13, fontWeight: 600, cursor: safePage === 1 ? 'default' : 'pointer' }}
              >‹ Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  style={{
                    minWidth: 34, padding: '7px 0', border: '1.5px solid', borderColor: n === safePage ? '#0f172a' : '#e2e8f0',
                    borderRadius: 8, background: n === safePage ? '#0f172a' : '#fff', color: n === safePage ? '#fff' : '#334155',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}
                >{n}</button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                style={{ padding: '7px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', color: safePage === totalPages ? '#cbd5e1' : '#334155', fontSize: 13, fontWeight: 600, cursor: safePage === totalPages ? 'default' : 'pointer' }}
              >Next ›</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
