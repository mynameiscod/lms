import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { enrollmentPlanApi } from '../../api/enrollmentPlanApi';
import { useAuth } from '../../contexts/AuthContext';
import { useLmsDemo, isDemoUser, demoFeaturesOn } from '../../components/lmsDemo/DemoShell';
import './myLearningHome.css';

/**
 * My Learning Plan — the student's learning home, in the CareerPilot look: a navy greeting hero with the totals,
 * then one card per plan with its progress, today's day and the way in. Same data and the same two doors as
 * before (the plan's days, and today's day). An LMS demo student sees their demo courses here.
 */

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
const ACCENTS = ['#051D64', '#359AAD', '#6246C9', '#C87808', '#17885D', '#C93737'];
const ICONS = ['bi-cup-hot', 'bi-filetype-py', 'bi-bar-chart-line', 'bi-cpu', 'bi-code-slash', 'bi-diagram-3'];

export default function MyLearningPlan() {
  const navigate = useNavigate();
  const { user } = useAuth() as any;
  const demo = isDemoUser(user);
  const { me: demoMe, openTalk } = useLmsDemo();
  const firstName = (user as any)?.firstName || 'there';
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    enrollmentPlanApi.getMyEnrollments().then(setEnrollments).catch(() => {}).finally(() => setLoading(false));
    // A demo student's courses are enrolled when the demo shell first loads; read again once it has.
  }, [demoMe?.courses?.length]);

  if (loading) return <div className="mlh"><div className="mlh-loading"><div className="mlh-spin" /></div></div>;

  // Demo courses come in the admin's order, with the admin's names and colours.
  const demoCourses = demoMe?.courses || [];
  const byCurriculum = new Map(demoCourses.map((c, i) => [c.curriculumId, { ...c, i }]));
  const list = demo
    ? [...enrollments].filter(e => byCurriculum.has(String(e.curriculumId))).sort((a, b) => (byCurriculum.get(String(a.curriculumId))!.i - byCurriculum.get(String(b.curriculumId))!.i))
    : enrollments;

  const totalDone = list.reduce((a, e) => a + (e.completedDays?.length || 0), 0);
  const todayMins = list.reduce((a, e) => a + (e.todayPlan?.items || []).reduce((s: number, i: any) => s + (i.estimatedDuration || 0), 0), 0);
  const avgPct = list.length ? Math.round(list.reduce((a, e) => a + Math.max(0, Math.min(100, e.progressPct || 0)), 0) / list.length) : 0;

  return (
    <div className="mlh">
      <header className="mlh-hero">
        <div className="mlh-hero-copy">
          <span className="mlh-eyebrow">{demo ? 'Your free demo' : 'My Learning Plan'}</span>
          <h1>Hi {firstName} 👋</h1>
          <p>{demo
            ? `Every course below is open for you${demoMe?.daysLeft ? ` for the next ${demoMe.daysLeft <= 1 ? 'day' : `${demoMe.daysLeft} days`}` : ''}. Watch the classes, read the notes and try the practice.`
            : 'Your plan to learn, practise and grow — one focused day at a time.'}</p>
          <div className="mlh-chips">
            <span><i className="bi bi-collection-play" /> {list.length} {list.length === 1 ? 'course' : 'courses'}</span>
            <span><i className="bi bi-check2-circle" /> {totalDone} {totalDone === 1 ? 'day' : 'days'} completed</span>
            {!demo && todayMins > 0 && <span><i className="bi bi-clock" /> {todayMins} min today</span>}
            {demo && demoMe?.ai && demoMe.ai.limit > 0 && <span><i className="bi bi-robot" /> {demoMe.ai.left} AI questions left today</span>}
          </div>
        </div>
        <div className="mlh-hero-ring" style={{ ['--p' as any]: `${avgPct * 3.6}deg` }} aria-label={`${avgPct}% complete`}>
          <div><b>{avgPct}%</b><span>{list.length > 1 ? 'average' : 'complete'}</span></div>
        </div>
      </header>

      {!list.length ? (
        <div className="mlh-empty">
          <div className="mlh-empty-ic"><i className="bi bi-mortarboard" /></div>
          <h2>{demo ? 'Your demo courses are on their way' : 'No active learning plan yet'}</h2>
          <p>{demo ? 'Our team is preparing the demo classes. Please check back shortly, or talk to a counsellor.' : 'Your instructor will enroll you in a curriculum. Once assigned, your daily journey will appear here.'}</p>
          {demo && <button type="button" className="mlh-btn navy" onClick={openTalk}><i className="bi bi-headset" /> Talk to a counsellor</button>}
        </div>
      ) : (
        <div className={`mlh-grid${list.length === 1 ? ' one' : ''}`}>
          {list.map((e: any, idx: number) => {
            const dc = byCurriculum.get(String(e.curriculumId));
            const accent = dc?.color || ACCENTS[idx % ACCENTS.length];
            const title = dc?.title || e.curriculumTitle;
            const totalDays = e.totalDays || 145;
            const pct = Math.max(0, Math.min(100, e.progressPct || 0));
            const doneCount = e.completedDays?.length || 0;
            // A demo has every day open and no calendar: carry on from where the student is.
            const today = demo ? Math.min(totalDays, Math.max(1, (e.completedDays?.length ? Math.max(...e.completedDays) + 1 : 1))) : e.todayPlanDay;
            const items = demo ? [] : (e.todayPlan?.items || []);
            const estMins = items.reduce((sum: number, i: any) => sum + (i.estimatedDuration || 0), 0);
            return (
              <article className="mlh-card" key={e._id} style={{ ['--acc' as any]: accent }}>
                <div className="mlh-card-top">
                  <span className="mlh-card-ic"><i className={`bi ${ICONS[idx % ICONS.length]}`} /></span>
                  <div className="mlh-card-title">
                    {dc?.start && <span className="mlh-start-tag"><i className="bi bi-flag-fill" /> Start here</span>}
                    <h2>{title}</h2>
                    <div className="mlh-meta">
                      {demo ? <span>{totalDays} demo {totalDays === 1 ? 'day' : 'days'}</span> : <><span className="mlh-active"><i className="bi bi-check-circle-fill" /> Active</span>{e.batchName && <span>{e.batchName}</span>}<span>Started {fmtDate(e.startDate)}</span></>}
                    </div>
                  </div>
                  <div className="mlh-ring" style={{ ['--p' as any]: `${pct * 3.6}deg` }}><div><b>{pct}%</b></div></div>
                </div>
                {dc?.blurb && <p className="mlh-blurb">{dc.blurb}</p>}

                <div className="mlh-stats">
                  <div><small>{demo ? 'Up next' : "Today's day"}</small><b>{today ? `Day ${today}` : '—'}<em> / {totalDays}</em></b></div>
                  <div><small>Completed</small><b>{doneCount} <em>{doneCount === 1 ? 'day' : 'days'}</em></b></div>
                  <div><small>{demo ? 'Lessons done' : "Today's study"}</small><b>{demo ? (dc?.itemsDone ?? 0) : estMins ? `${estMins} min` : '—'}</b></div>
                </div>
                <div className="mlh-bar"><i style={{ width: `${pct}%` }} /></div>

                {items.length > 0 && (
                  <ul className="mlh-today">
                    {items.slice(0, 3).map((item: any, i: number) => (
                      <li key={item._id || i}><span>{i + 1}</span><b>{item.title || item.contentTitle || item.name || `Activity ${i + 1}`}</b>{item.estimatedDuration ? <em>{item.estimatedDuration} min</em> : null}</li>
                    ))}
                    {items.length > 3 && <li className="more">+{items.length - 3} more today</li>}
                  </ul>
                )}

                <div className="mlh-actions">
                  {today && <button type="button" className="mlh-btn navy" onClick={() => navigate(`/my-learning/${e._id}/day/${today}`)}><i className="bi bi-play-circle" /> {doneCount ? `Continue Day ${today}` : `Start Day ${today}`}</button>}
                  <button type="button" className="mlh-btn ghost" onClick={() => navigate(`/my-learning/${e._id}/journey`)}><i className="bi bi-grid-3x3-gap" /> All days</button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {demo && demoFeaturesOn(demoMe).length > 0 && (
        <section className="mlh-explore" aria-label="Explore the platform">
          <div className="mlh-explore-head"><h2>Explore the platform</h2><span>Everything our students use — try any of it.</span></div>
          <div className="mlh-explore-grid">
            {demoFeaturesOn(demoMe).map(f => {
              const u = f.uses ? demoMe?.use?.[f.uses] : undefined;
              return (
                <button type="button" key={f.key} className="mlh-feature" onClick={() => navigate(f.href)}>
                  <span className="mlh-feature-ic"><i className={`bi ${f.icon}`} /></span>
                  <span className="mlh-feature-tx"><b>{f.label}</b><small>{f.blurb}</small>{u && u.limit > 0 && <em>{u.left} of {u.limit} left today</em>}</span>
                  <i className="bi bi-arrow-right mlh-feature-go" />
                </button>
              );
            })}
          </div>
        </section>
      )}

      {demo && list.length > 0 && (
        <section className="mlh-talk">
          <i className="bi bi-headset" />
          <div><b>Have questions about joining?</b><span>A counsellor can help you pick the right course, batch and fee plan.</span></div>
          <button type="button" className="mlh-btn navy" onClick={openTalk}>Talk to a counsellor</button>
        </section>
      )}
    </div>
  );
}
