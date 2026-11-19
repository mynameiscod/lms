import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { enrollmentPlanApi } from '../../api/enrollmentPlanApi';
import { useAuth } from '../../contexts/AuthContext';
import { useLmsDemo, isDemoUser, demoFeaturesOn } from '../../components/lmsDemo/DemoShell';
import './myLearningHome.css';

/**
 * My Learning Plan — the student's learning home, in the CareerPilot look:
 *   a navy greeting hero with the totals,
 *   a "Continue learning" card with the next day's lessons and one big way in,
 *   a card per course (coloured band, day dots, progress),
 *   and, for a demo student, the platform features to explore.
 * Same data and the same doors as before (a plan's days, and its next day).
 */

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
const ACCENTS = ['#051D64', '#359AAD', '#6246C9', '#C87808', '#17885D', '#C93737'];
const ICONS = ['bi-cup-hot', 'bi-filetype-py', 'bi-bar-chart-line', 'bi-cpu', 'bi-code-slash', 'bi-diagram-3'];
const FEATURE_TONE: Record<string, string> = {
  thinkingLab: 'violet', communicationLab: 'teal', codingPractice: 'navy', quizzes: 'amber', assignments: 'green',
  questionBooks: 'brown', mockInterview: 'violet', playground: 'navy', visualizer: 'teal', aiMentor: 'blue', resumeBuilder: 'green',
};
const typeIcon = (t: string) => (t === 'video' ? 'bi-play-btn-fill' : t === 'notes' || t === 'worked_example' ? 'bi-journal-text'
  : t === 'quiz' ? 'bi-patch-question' : t === 'assignment' ? 'bi-clipboard-check' : t?.startsWith('practice') || t === 'codeSnippet' ? 'bi-code-slash' : 'bi-hand-index-thumb');
const typeTone = (t: string) => (t === 'video' ? 'red' : t === 'notes' || t === 'worked_example' ? 'teal' : t === 'quiz' ? 'violet' : t === 'assignment' ? 'amber' : 'navy');

export default function MyLearningPlan() {
  const navigate = useNavigate();
  const { user } = useAuth() as any;
  const demo = isDemoUser(user);
  const { me: demoMe, openTalk } = useLmsDemo();
  const firstName = (user as any)?.firstName || 'there';
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [next, setNext] = useState<{ enrollmentId: string; day: number; data: any } | null>(null);

  useEffect(() => {
    enrollmentPlanApi.getMyEnrollments().then(setEnrollments).catch(() => {}).finally(() => setLoading(false));
    // A demo student's courses are enrolled when the demo shell first loads; read again once it has.
  }, [demoMe?.courses?.length]);

  // Demo courses come in the admin's order, with the admin's names and colours.
  const demoCourses = demoMe?.courses || [];
  const byCurriculum = new Map(demoCourses.map((c, i) => [c.curriculumId, { ...c, i }]));
  const list = demo
    ? [...enrollments].filter(e => byCurriculum.has(String(e.curriculumId))).sort((a, b) => (byCurriculum.get(String(a.curriculumId))!.i - byCurriculum.get(String(b.curriculumId))!.i))
    : enrollments;
  // The day to carry on with: a demo has no calendar, so it is the day after the last one finished.
  const nextDay = (e: any) => {
    const total = e.totalDays || 145;
    if (!demo && e.todayPlanDay) return e.todayPlanDay;
    return Math.min(total, Math.max(1, e.completedDays?.length ? Math.max(...e.completedDays) + 1 : 1));
  };
  const featured = list[0];

  // The featured day's lessons, for the Continue card.
  useEffect(() => {
    if (!featured) return;
    const day = nextDay(featured);
    let live = true;
    enrollmentPlanApi.getDayPlan(featured._id, day).then(d => { if (live) setNext({ enrollmentId: featured._id, day, data: d }); }).catch(() => {});
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featured?._id, featured?.completedDays?.length]);

  if (loading) return <div className="mlh"><div className="mlh-loading"><div className="mlh-spin" /></div></div>;

  const totalDone = list.reduce((a, e) => a + (e.completedDays?.length || 0), 0);
  const avgPct = list.length ? Math.round(list.reduce((a, e) => a + Math.max(0, Math.min(100, e.progressPct || 0)), 0) / list.length) : 0;
  const features = demo ? demoFeaturesOn(demoMe) : [];
  const nd = next && featured && next.enrollmentId === featured._id ? next : null;
  const ndItems: any[] = nd?.data?.items || [];
  const ndTitle = nd?.data?.dayTitle || nd?.data?.topic?.title || '';
  const ndMins = ndItems.reduce((a, i) => a + (i.content?.estimatedDuration || i.estimatedDuration || 0), 0);
  const fc = featured ? byCurriculum.get(String(featured.curriculumId)) : undefined;

  return (
    <div className="mlh">
      <header className="mlh-hero">
        <div className="mlh-hero-copy">
          <span className="mlh-eyebrow">{demo ? 'Your free demo' : 'My Learning Plan'}</span>
          <h1>Hi {firstName} 👋</h1>
          <p>{demo
            ? `Everything below is open for you${demoMe?.daysLeft ? ` for the next ${demoMe.daysLeft <= 1 ? 'day' : `${demoMe.daysLeft} days`}` : ''}. Watch the classes, read the notes and try the platform.`
            : 'Your plan to learn, practise and grow — one focused day at a time.'}</p>
          <div className="mlh-chips">
            <span><i className="bi bi-collection-play" /> {list.length} {list.length === 1 ? 'course' : 'courses'}</span>
            <span><i className="bi bi-check2-circle" /> {totalDone} {totalDone === 1 ? 'day' : 'days'} completed</span>
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
        <>
          {featured && (
            <section className="mlh-next" style={{ ['--acc' as any]: fc?.color || ACCENTS[0] }}>
              <div className="mlh-next-main">
                <span className="mlh-next-eyebrow"><i className="bi bi-play-circle-fill" /> Continue learning · {fc?.title || featured.curriculumTitle}</span>
                <h2>Day {nextDay(featured)}{ndTitle ? `: ${ndTitle}` : ''}</h2>
                {ndItems.length > 0 ? (
                  <ul className="mlh-next-items">
                    {ndItems.slice(0, 5).map((it: any, i: number) => {
                      const t = it.content?.type || it.contentType || it.kind;
                      const title = it.content?.title || it.contentTitle || 'Lesson';
                      const mins = it.content?.estimatedDuration || it.estimatedDuration;
                      return (
                        <li key={it._id || i} className={it.isCompleted ? 'done' : ''}>
                          <span className={`ic t-${typeTone(t)}`}><i className={`bi ${typeIcon(t)}`} /></span>
                          <b>{title}</b>
                          {mins ? <em>{mins} min</em> : null}
                          {it.isCompleted && <i className="bi bi-check-circle-fill ok" />}
                        </li>
                      );
                    })}
                    {ndItems.length > 5 && <li className="more">+{ndItems.length - 5} more</li>}
                  </ul>
                ) : <p className="mlh-next-sub">{nd ? 'Open the day to see its lessons.' : 'Loading the day…'}</p>}
              </div>
              <div className="mlh-next-side">
                <div className="mlh-next-facts">
                  <div><b>{ndItems.length || '—'}</b><span>lessons</span></div>
                  <div><b>{ndMins || '—'}</b><span>minutes</span></div>
                </div>
                <button type="button" className="mlh-btn teal big" onClick={() => navigate(`/my-learning/${featured._id}/day/${nextDay(featured)}`)}>
                  <i className="bi bi-play-fill" /> {featured.completedDays?.length ? 'Continue' : 'Start'} Day {nextDay(featured)}
                </button>
                <button type="button" className="mlh-link" onClick={() => navigate(`/my-learning/${featured._id}/journey`)}>See all days <i className="bi bi-arrow-right" /></button>
              </div>
            </section>
          )}

          <section className="mlh-section">
            <div className="mlh-section-head"><h2>{demo ? 'Your demo courses' : 'Your courses'}</h2><span>{list.length} {list.length === 1 ? 'course' : 'courses'}</span></div>
            <div className={`mlh-grid${list.length === 1 ? ' one' : ''}`}>
              {list.map((e: any, idx: number) => {
                const dc = byCurriculum.get(String(e.curriculumId));
                const accent = dc?.color || ACCENTS[idx % ACCENTS.length];
                const title = dc?.title || e.curriculumTitle;
                const totalDays = e.totalDays || 145;
                const pct = Math.max(0, Math.min(100, e.progressPct || 0));
                const done = new Set<number>((e.completedDays || []).map(Number));
                const day = nextDay(e);
                return (
                  <article className="mlh-card" key={e._id} style={{ ['--acc' as any]: accent }}>
                    <div className="mlh-card-band">
                      <span className="mlh-card-ic"><i className={`bi ${ICONS[idx % ICONS.length]}`} /></span>
                      <div className="mlh-card-title">
                        {dc?.start && <span className="mlh-start-tag"><i className="bi bi-flag-fill" /> Start here</span>}
                        <h3>{title}</h3>
                        <span className="mlh-card-sub">{demo ? `${totalDays} demo ${totalDays === 1 ? 'day' : 'days'}` : `${e.batchName ? `${e.batchName} · ` : ''}Started ${fmtDate(e.startDate)}`}</span>
                      </div>
                      <div className="mlh-ring" style={{ ['--p' as any]: `${pct * 3.6}deg` }}><div><b>{pct}%</b></div></div>
                    </div>
                    {dc?.blurb && <p className="mlh-blurb">{dc.blurb}</p>}
                    {totalDays <= 30 && (
                      <div className="mlh-pips" aria-label={`${done.size} of ${totalDays} days done`}>
                        {Array.from({ length: totalDays }).map((_, i) => (
                          <span key={i} className={done.has(i + 1) ? 'done' : i + 1 === day ? 'next' : ''} title={`Day ${i + 1}`}>{i + 1}</span>
                        ))}
                      </div>
                    )}
                    <div className="mlh-card-foot">
                      <span><b>{done.size}</b> of {totalDays} days done</span>
                      <div className="mlh-actions">
                        <button type="button" className="mlh-btn ghost" onClick={() => navigate(`/my-learning/${e._id}/journey`)}><i className="bi bi-grid-3x3-gap" /> All days</button>
                        <button type="button" className="mlh-btn navy" onClick={() => navigate(`/my-learning/${e._id}/day/${day}`)}>{done.size ? 'Continue' : 'Start'} Day {day} <i className="bi bi-arrow-right" /></button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}

      {features.length > 0 && (
        <section className="mlh-section" aria-label="Explore the platform">
          <div className="mlh-section-head"><h2>Explore the platform</h2><span>Everything our students use — try any of it.</span></div>
          <div className="mlh-explore-grid">
            {features.map(f => {
              const u = f.uses ? demoMe?.use?.[f.uses] : undefined;
              return (
                <button type="button" key={f.key} className={`mlh-feature tone-${FEATURE_TONE[f.key] || 'navy'}`} onClick={() => navigate(f.href)}>
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
