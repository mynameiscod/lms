import React from 'react';

interface Props {
  firstName: string;
  todayPlan: any;
  navigate: (path: string) => void;
}

const PURPLE = '#6366f1';
const TEAL = '#14a89c';

const TOOLS = [
  { label: 'My Learning Plan', desc: 'Your personalised day-by-day roadmap', icon: '📅', path: '/my-learning', color: '#6366f1' },
  { label: 'Mock Interview', desc: 'Practice with the AI interviewer', icon: '🎤', path: '/my-interviews', color: '#0ea5a4' },
  { label: 'Project Builder', desc: 'Build portfolio projects with AI', icon: '🚀', path: '/project-builder', color: '#7c3aed' },
  { label: 'Resume Optimizer', desc: 'ATS score + tailor to any job', icon: '📄', path: '/resume-builder', color: '#2563eb' },
  { label: 'Career Profile', desc: 'GitHub & LinkedIn review + fixes', icon: '🪪', path: '/career-profile', color: '#d97706' },
  { label: 'Job Tracker', desc: 'Track applications wishlist → offer', icon: '💼', path: '/job-tracker', color: '#16a34a' },
  { label: 'AI Mentor', desc: 'Ask anything about your career', icon: '🧭', path: '/ai-mentor', color: '#db2777' },
  { label: 'Code Playground', desc: 'Write, run & save code', icon: '⌨️', path: '/playground', color: '#0891b2' },
];

const CareerPilotDashboard: React.FC<Props> = ({ firstName, todayPlan, navigate }) => {
  const planItems: any[] = todayPlan?.items || [];
  const hasPlan = !!todayPlan && planItems.length > 0;

  const card: React.CSSProperties = { background: '#fff', border: '1px solid #e6e8f0', borderRadius: 16, padding: 20 };

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '8px 4px 40px' }}>
      {/* Hero */}
      <div style={{ background: `linear-gradient(120deg, ${PURPLE}, ${TEAL})`, borderRadius: 18, padding: '26px 28px', color: '#fff', marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', opacity: 0.85 }}>CareerPilot</div>
        <h1 style={{ margin: '6px 0 4px', fontSize: 26, fontWeight: 800 }}>Welcome back, {firstName}! 👋</h1>
        <p style={{ margin: 0, fontSize: 14.5, opacity: 0.92, maxWidth: 620 }}>
          Your path from learning to earning. Follow your plan, sharpen your profile, practise interviews, and track your job hunt — all in one place.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 18, alignItems: 'start' }}>
        {/* Today's plan */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>📌</span>
            <span style={{ fontWeight: 750, fontSize: 16, color: '#0f172a', flex: 1 }}>Today&apos;s Plan</span>
            {todayPlan && <span style={{ fontSize: 12.5, color: '#94a3b8', fontWeight: 600 }}>Day {todayPlan.dayNumber}</span>}
          </div>

          {!hasPlan ? (
            <div style={{ padding: '22px 6px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
              Your personalised plan is being prepared. Open your Learning Plan to get started.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {planItems.slice(0, 6).map((it, i) => {
                const title = it.content?.title || it.contentTitle || 'Activity';
                const mins = it.content?.estimatedMinutes || it.estimatedMinutes;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', border: '1px solid #eef0f6', borderRadius: 12 }}>
                    <span style={{ width: 30, height: 30, borderRadius: 8, background: '#eef0fe', display: 'grid', placeItems: 'center', fontSize: 15 }}>🎬</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 650, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>{it.itemType || it.type || 'Lesson'}{mins ? ` · ${mins} min` : ''}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button onClick={() => navigate('/my-learning')}
            style={{ marginTop: 16, width: '100%', background: PURPLE, color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            {hasPlan ? 'Continue today’s plan →' : 'Open my Learning Plan →'}
          </button>
        </div>

        {/* Career toolkit */}
        <div style={card}>
          <div style={{ fontWeight: 750, fontSize: 16, color: '#0f172a', marginBottom: 14 }}>Your career toolkit</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {TOOLS.map(t => (
              <button key={t.path} onClick={() => navigate(t.path)}
                style={{ textAlign: 'left', background: '#fff', border: '1px solid #e6e8f0', borderRadius: 12, padding: '12px 12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ width: 32, height: 32, borderRadius: 9, background: `${t.color}18`, display: 'grid', placeItems: 'center', fontSize: 16 }}>{t.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{t.label}</span>
                <span style={{ fontSize: 11.5, color: '#94a3b8', lineHeight: 1.35 }}>{t.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 13, color: '#64748b', background: '#f6f7fb', border: '1px solid #eef0f6', borderRadius: 12, padding: '12px 16px' }}>
        💡 <b>Tip:</b> Ask your <button onClick={() => navigate('/ai-mentor')} style={{ background: 'none', border: 'none', color: PURPLE, fontWeight: 700, cursor: 'pointer', padding: 0 }}>AI Mentor</button> what to focus on this week — it knows your scores and skill gaps.
      </div>
    </div>
  );
};

export default CareerPilotDashboard;
