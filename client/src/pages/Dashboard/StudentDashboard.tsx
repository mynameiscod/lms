import React from 'react';
import './StudentDashboard.css';

interface Props {
  firstName: string;
  data: any;
  attendance: any;
  todayPlan: any;
  allDeadlines: any[];
  quizAvg: number;
  totalPending: number;
  navigate: (to: string) => void;
}

const CT_LABEL: Record<string, string> = {
  video: 'Video', notes: 'Notes', interactive_lesson: 'Interactive Lesson', interactive_activity: 'Activity',
  tech_qa: 'Tech Q&A', behavioral_qa: 'Behavioral Q&A', practice_coding: 'Practice', practice_theory: 'Practice', aptitude: 'Aptitude',
};

const KIND_META: Record<string, { icon: string; color: string; verb: string }> = {
  content:       { icon: '🎬', color: '#7c3aed', verb: 'Open' },
  video:         { icon: '🎬', color: '#7c3aed', verb: 'Open' },
  quiz:          { icon: '❓', color: '#7c3aed', verb: 'Start Quiz' },
  assignment:    { icon: '📋', color: '#2563eb', verb: 'Open Assignment' },
  codeSnippet:   { icon: '⌨️', color: '#0ea5e9', verb: 'Solve' },
  mockInterview: { icon: '🎤', color: '#f59e0b', verb: 'Review' },
};

const isToday = (s: string) => { const d = new Date(s); const n = new Date(); return d.toDateString() === n.toDateString(); };
const fmtRel = (days: number) => days <= 0 ? 'Today' : days === 1 ? '1 day' : `${days} days`;

const StudentDashboard: React.FC<Props> = ({ firstName, data, attendance, todayPlan, allDeadlines, quizAvg, totalPending, navigate }) => {
  const stats = data?.stats || {};
  const present = attendance?.totalPresent || 0;
  const absent = attendance?.totalAbsent || 0;
  const totalAtt = present + absent;
  const attPct = attendance?.attendancePercentage || 0;
  const attLabel = attPct >= 85 ? 'Good' : attPct >= 75 ? 'Average' : attPct >= 50 ? 'Low' : 'Needs work';

  const todaySubs = (data?.recentActivity || []).filter((a: any) => a.timestamp && isToday(a.timestamp)).length;
  const dueTomorrow = allDeadlines.filter(d => d.daysLeft === 1).length;
  const dueThisWeek = allDeadlines.filter(d => d.daysLeft <= 7).length;

  const planItems: any[] = todayPlan?.items || [];

  const cards = [
    { icon: '✓', bg: '#22c55e', label: 'Assignments Done', value: stats.completedAssignments ?? 0, sub: `of ${stats.totalAssignments ?? 0} total · ${stats.pendingAssignments ?? 0} pending`, badge: todaySubs > 0 ? `+${todaySubs} today` : 'On track', badgeCls: 'good' },
    { icon: '⏰', bg: '#f59e0b', label: 'Pending Tasks', value: totalPending, sub: `${dueTomorrow} due tomorrow · ${dueThisWeek} this week`, badge: 'Due soon', badgeCls: 'warn' },
    { icon: '★', bg: '#7c3aed', label: 'Quiz Avg Score', value: `${quizAvg}%`, sub: `${stats.completedQuizzes ?? 0} quizzes taken · ${quizAvg >= 50 ? 'Good' : 'Needs work'}`, badge: quizAvg >= 50 ? 'Good' : 'Needs work', badgeCls: quizAvg >= 50 ? 'good' : 'purple' },
    { icon: '📈', bg: '#2563eb', label: 'Attendance', value: `${attPct}%`, sub: `${present} Present · ${absent} Absent · ${totalAtt} Total`, badge: attLabel, badgeCls: 'blue' },
  ];

  return (
    <div className="sd2">
      <div className="sd2-welcome">
        <h1>Welcome back, {firstName}! 👋</h1>
        <p>Let's continue your learning journey. Stay consistent and achieve your goals.</p>
      </div>

      {/* Stat cards */}
      <div className="sd2-stats">
        {cards.map((c, i) => (
          <div className="sd2-stat" key={i}>
            <div className="sd2-stat-top">
              <div className="sd2-stat-ic" style={{ background: c.bg }}>{c.icon}</div>
              <span className={`sd2-badge ${c.badgeCls}`}>{c.badge}</span>
            </div>
            <div className="sd2-stat-val">{c.value}</div>
            <div className="sd2-stat-label">{c.label}</div>
            <div className="sd2-stat-sub">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Main two-column */}
      <div className="sd2-main">
        <div className="sd2-col">
          {/* Today's Plan */}
          <div className="sd2-card">
            <div className="sd2-card-head">
              <span className="sd2-card-title">Today's Plan</span>
              {todayPlan && <span className="sd2-day-label">Day {todayPlan.dayNumber} · {todayPlan.dayDate ? new Date(todayPlan.dayDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</span>}
            </div>
            <div className="sd2-plan">
              {!todayPlan || planItems.length === 0 ? (
                <div className="sd2-empty">No plan for today. {todayPlan ? '' : 'You are not enrolled in a learning plan yet.'}</div>
              ) : planItems.map((it, idx) => {
                const kind = it.kind || 'content';
                const m = KIND_META[kind] || KIND_META.content;
                const title = it.content?.title || it.contentTitle || 'Activity';
                const typeLabel = kind === 'content' ? (CT_LABEL[it.contentType] || 'Lesson')
                  : kind === 'codeSnippet' ? 'Code Snippet' : kind === 'mockInterview' ? 'Mock Interview' : kind.charAt(0).toUpperCase() + kind.slice(1);
                const slot = it.slot && it.slot !== 'anytime' ? it.slot.charAt(0).toUpperCase() + it.slot.slice(1) : '';
                const dueToday = it.dueAt && new Date(it.dueAt).toDateString() === new Date().toDateString();
                const go = () => navigate(kind === 'content' ? `/my-learning/${todayPlan.enrollmentId}/day/${todayPlan.dayNumber}` : (it.launchPath || '/my-tasks'));
                return (
                  <div className="sd2-prow" key={idx}>
                    <span className="sd2-prow-dot" style={it.isCompleted ? { background: '#22c55e', borderColor: '#22c55e' } : { borderColor: m.color }}>
                      {it.isCompleted ? <span style={{ color: '#fff', fontSize: 9 }}>✓</span> : null}
                    </span>
                    <div className="sd2-prow-ic" style={{ background: `${m.color}15` }}>{m.icon}</div>
                    <div className="sd2-prow-main">
                      <div className="sd2-prow-title">{title}</div>
                      <div className="sd2-prow-meta">
                        {slot && <span>{slot} · </span>}
                        <span>{typeLabel}</span>
                        {kind === 'content' && it.estimatedDuration ? <span> · {it.estimatedDuration} min</span> : null}
                        {dueToday && <span className="due"> · Due today</span>}
                      </div>
                    </div>
                    {it.isCompleted
                      ? <span className="sd2-done2">✓ Done</span>
                      : <button className="sd2-act2" style={{ color: m.color, borderColor: `${m.color}55` }} onClick={go}>{m.verb} →</button>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="sd2-card">
            <div className="sd2-card-head">
              <span className="sd2-card-title">🗂 Recent Activity</span>
              <button className="sd2-link" onClick={() => navigate('/my-tasks')}>View all</button>
            </div>
            <div className="sd2-acts">
              {(data?.recentActivity || []).length === 0 ? (
                <div className="sd2-empty">No recent activity.</div>
              ) : (data.recentActivity.slice(0, 5)).map((a: any, i: number) => (
                <div className="sd2-act-row" key={i}>
                  <span className="sd2-act-dot">{a.status === 'completed' || a.status === 'submitted' ? '✓' : '•'}</span>
                  <span className="sd2-act-title">{a.title}</span>
                  <span className="sd2-act-tag">{a.type}</span>
                  <span className="sd2-act-time">{a.timestamp ? new Date(a.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) + ' · ' + new Date(a.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="sd2-col">
          {/* Upcoming Deadlines */}
          <div className="sd2-card">
            <div className="sd2-card-head">
              <span className="sd2-card-title">Upcoming Deadlines</span>
              <button className="sd2-link" onClick={() => navigate('/my-tasks')}>View all</button>
            </div>
            <div className="sd2-deads">
              {allDeadlines.length === 0 ? (
                <div className="sd2-empty">Nothing due soon. 🎉</div>
              ) : allDeadlines.map((d, i) => (
                <div className="sd2-dead" key={i}>
                  <span className="sd2-dead-bar" style={{ background: d.daysLeft <= 1 ? '#ef4444' : d.daysLeft <= 3 ? '#f59e0b' : '#0ea5b7' }} />
                  <div className="sd2-dead-main">
                    <div className="sd2-dead-title">{d.title}</div>
                    {d.due && <div className="sd2-dead-due">Due {new Date(d.due).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</div>}
                  </div>
                  <span className="sd2-dead-badge" style={{ color: d.daysLeft <= 1 ? '#dc2626' : '#b45309', background: d.daysLeft <= 1 ? '#fee2e2' : '#fef3c7' }}>{fmtRel(d.daysLeft)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pro Tip */}
      <div className="sd2-tip">💡 <b>Pro Tip</b>&nbsp; Break your tasks into small steps and complete them one by one. You're doing great!</div>
    </div>
  );
};

export default StudentDashboard;
