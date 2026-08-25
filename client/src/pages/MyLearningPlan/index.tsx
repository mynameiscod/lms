import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { enrollmentPlanApi } from '../../api/enrollmentPlanApi';
import { useAuth } from '../../contexts/AuthContext';
import './MyLearningPlan.css';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export default function MyLearningPlan() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const firstName = (user as any)?.firstName || 'there';
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    enrollmentPlanApi.getMyEnrollments().then(setEnrollments).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="lp-page"><div className="lp-loading"><div className="lp-spinner" /></div></div>;

  if (!enrollments.length) {
    return <div className="lp-page"><header className="lp-page-head"><div><span className="lp-eyebrow">LEARNING JOURNEY</span><h1>My Learning Plan</h1><p>Your personalized plan to learn, practice and grow every day.</p></div></header><div className="lp-empty"><div className="lp-empty-icon"><i className="bi bi-mortarboard" /></div><h3>No active learning plan yet</h3><p>Your instructor will enroll you in a curriculum. Once assigned, your daily journey will appear here.</p></div></div>;
  }

  return (
    <div className="lp-page">
      <header className="lp-page-head">
        <div><span className="lp-eyebrow">LEARNING JOURNEY</span><h1>My Learning Plan</h1><p>Your personalized plan to help you learn, practice and grow every day.</p></div>
        <div className="lp-head-message"><i className="bi bi-stars" /><span>Keep going, <strong>{firstName}</strong>!</span></div>
      </header>

      <div className="lp-list">
        {enrollments.map((e: any) => {
          const today = e.todayPlanDay;
          const totalDays = e.totalDays || 145;
          const pct = Math.max(0, Math.min(100, e.progressPct || 0));
          const doneCount = e.completedDays?.length || 0;
          const daysLeft = today ? Math.max(0, totalDays - today) : totalDays;
          const items = e.todayPlan?.items || [];
          const estMins = items.reduce((sum: number, i: any) => sum + (i.estimatedDuration || 0), 0);

          return <section className="lp-plan" key={e._id}>
            <div className="lp-plan-hero">
              <div className="lp-plan-copy">
                <div className="lp-plan-meta"><span className="lp-active"><i className="bi bi-check-circle-fill" /> Active Plan</span>{e.batchName && <span>{e.batchName}</span>}<span>Started {fmtDate(e.startDate)}</span></div>
                <h2>{e.curriculumTitle}</h2>
                <p>Stay consistent and move forward one focused day at a time.</p>
                <div className="lp-hero-actions"><button className="lp-btn primary" onClick={() => navigate(`/my-learning/${e._id}/journey`)}><i className="bi bi-map" /> View My Journey</button>{today && <button className="lp-btn secondary" onClick={() => navigate(`/my-learning/${e._id}/day/${today}`)}><i className="bi bi-play-circle" /> Continue Day {today}</button>}</div>
              </div>
              <div className="lp-progress-ring" style={{ '--progress': `${pct * 3.6}deg` } as React.CSSProperties}><div><strong>{pct}%</strong><span>Complete</span></div></div>
            </div>

            <div className="lp-metrics">
              <article><span className="lp-metric-icon teal"><i className="bi bi-calendar-check" /></span><div><small>Today's Day</small><strong>{today || '—'} <em>/ {totalDays}</em></strong></div></article>
              <article><span className="lp-metric-icon green"><i className="bi bi-check2-circle" /></span><div><small>Days Completed</small><strong>{doneCount}</strong></div></article>
              <article><span className="lp-metric-icon orange"><i className="bi bi-hourglass-split" /></span><div><small>Days Remaining</small><strong>{daysLeft}</strong></div></article>
              <article><span className="lp-metric-icon blue"><i className="bi bi-clock" /></span><div><small>Today's Study</small><strong>{estMins ? `${estMins} min` : 'Not set'}</strong></div></article>
            </div>

            <div className="lp-content-grid">
              <div className="lp-today-card">
                <div className="lp-section-head"><div><span className="lp-section-kicker">TODAY</span><h3>{today ? `Day ${today} Learning Plan` : 'Today’s Learning Plan'}</h3></div><span className="lp-count">{items.length} {items.length === 1 ? 'activity' : 'activities'}</span></div>
                {items.length ? <div className="lp-activities">{items.map((item: any, idx: number) => <div className="lp-activity" key={item._id || idx}><span className={`lp-step ${idx === 0 ? 'current' : ''}`}>{idx + 1}</span><div className="lp-activity-copy"><strong>{item.title || item.contentTitle || item.name || `Learning activity ${idx + 1}`}</strong><span>{item.estimatedDuration ? `${item.estimatedDuration} min` : 'Learning activity'}{item.type ? ` · ${item.type}` : ''}</span></div>{today && <button onClick={() => navigate(`/my-learning/${e._id}/day/${today}`)}>{idx === 0 ? 'Continue' : 'Open'} <i className="bi bi-arrow-right" /></button>}</div>)}</div> : <div className="lp-no-items"><i className="bi bi-calendar2-week" /><div><strong>No content assigned for this day yet</strong><span>Check back after your instructor updates the plan.</span></div></div>}
                {today && <button className="lp-full-plan" onClick={() => navigate(`/my-learning/${e._id}/day/${today}`)}>View full day plan <i className="bi bi-arrow-right" /></button>}
              </div>

              <aside className="lp-side-stack">
                <div className="lp-side-card"><div className="lp-side-title"><i className="bi bi-bullseye" /> Journey Progress</div><div className="lp-progress-row"><span>Course completion</span><strong>{pct}%</strong></div><div className="lp-bar"><span style={{ width: `${pct}%` }} /></div><div className="lp-progress-row muted"><span>{doneCount} days completed</span><span>{daysLeft} remaining</span></div></div>
                <div className="lp-side-card motivation"><i className="bi bi-rocket-takeoff" /><div><strong>Consistency is the key to success!</strong><p>Small steps every day build a stronger future. Keep your learning streak alive.</p></div></div>
                <div className="lp-side-card quick"><div className="lp-side-title">Quick actions</div><button onClick={() => navigate(`/my-learning/${e._id}/journey`)}><i className="bi bi-signpost-split" /> My Journey <i className="bi bi-chevron-right" /></button><button onClick={() => navigate(`/my-learning/${e._id}/day/1`)}><i className="bi bi-calendar3" /> View from Day 1 <i className="bi bi-chevron-right" /></button>{doneCount > 0 && <button onClick={() => navigate(`/my-learning/${e._id}/day/${Math.min(e.currentDay || today || 1, totalDays)}`)}><i className="bi bi-arrow-repeat" /> Resume Learning <i className="bi bi-chevron-right" /></button>}</div>
              </aside>
            </div>
          </section>;
        })}
      </div>
      <div className="lp-footer-note"><i className="bi bi-stars" /> Stay consistent and trust the process. Small steps every day lead to big results!</div>
    </div>
  );
}
