import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { enrollmentPlanApi } from '../../api/enrollmentPlanApi';
import { unlockPlanCheckout } from '../../api/paymentApi';
import { concernApi } from '../../api/concernApi';
import RaiseConcern from '../../components/RaiseConcern';
import './Journey.css';

const milestoneIcon = (kind: string) => kind === 'mock' ? 'bi-mic' : kind === 'project' ? 'bi-trophy' : 'bi-star';

const MyJourney: React.FC = () => {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const navigate = useNavigate();
  const [j, setJ] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [paying, setPaying] = useState(false);
  const [mentorSent, setMentorSent] = useState(false);
  const [payMsg, setPayMsg] = useState('');
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

  const loadJourney = async () => {
    try {
      const data = await enrollmentPlanApi.getJourney(enrollmentId!);
      setJ(data);
      const current = data?.plan?.weeks?.find((w: any) => w.days?.some((d: any) => d.status === 'current'));
      setExpandedWeek(current?.week ?? data?.plan?.weeks?.[0]?.week ?? null);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e.message || 'Failed to load your journey');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadJourney(); /* eslint-disable-next-line */ }, [enrollmentId]);

  const handleUnlock = async () => {
    setPayMsg(''); setPaying(true);
    try {
      const unlocked = await unlockPlanCheckout(enrollmentId);
      if (unlocked) await loadJourney();
    } catch (e: any) {
      setPayMsg(e?.response?.data?.message || e?.message || 'Payment could not be completed. Please try again.');
    } finally { setPaying(false); }
  };

  const handleTalkToMentor = async () => {
    try {
      await concernApi.raise({ category: 'mentor', message: 'I would like to talk to a mentor about unlocking my full plan.', context: { enrollmentId: enrollmentId!, curriculumTitle: j?.plan?.title } });
    } finally { setMentorSent(true); }
  };

  if (loading) return <div className="journey-state"><span className="spinner-border spinner-border-sm" /> Loading your journey…</div>;
  if (err) return <div className="journey-state journey-error">{err}</div>;
  if (!j) return null;

  const { plan, progress, access } = j;
  const role = plan.targetRole || 'Your target role';
  const totalDays = Number(plan.totalDays || 0);
  const completed = Number(progress.completedDays || 0);
  const currentDay = Number(progress.currentDay || 1);
  const percent = Math.max(0, Math.min(100, Number(progress.percent || 0)));
  const openDay = (day: number, locked: boolean) => !locked && navigate(`/my-learning/${enrollmentId}/day/${day}`);
  const currentWeek = plan.weeks?.find((w: any) => w.days?.some((d: any) => d.day === currentDay));
  const currentDayData = currentWeek?.days?.find((d: any) => d.day === currentDay);
  const endDate = j.estimatedEndDate ? new Date(j.estimatedEndDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const nextMilestone = plan.milestones?.find((m: any) => Number(m.day) >= currentDay);

  return (
    <div className="journey-page">
      <div className="journey-heading">
        <div>
          <button className="journey-back" onClick={() => navigate('/my-learning')}><i className="bi bi-arrow-left" /> My Learning Plan</button>
          <h1>My Journey</h1>
          <p>Track your progress and achieve your learning goals.</p>
        </div>
        <RaiseConcern context={{ enrollmentId: enrollmentId!, curriculumTitle: plan.title }} />
      </div>

      <div className="journey-grid">
        <main>
          <section className="journey-card journey-summary">
            <div className="progress-ring" style={{ '--progress': `${percent * 3.6}deg` } as React.CSSProperties}>
              <div><strong>{percent}%</strong><span>Overall Progress</span></div>
            </div>
            <div className="summary-stat"><i className="bi bi-calendar3" /><span>Current Day<strong>{currentDay}</strong><small>of {totalDays} days</small></span></div>
            <div className="summary-stat"><i className="bi bi-journal-bookmark" /><span>Total Weeks<strong>{plan.totalWeeks}</strong><small>Weeks of learning</small></span></div>
            <div className="summary-stat"><i className="bi bi-bullseye" /><span>Target Role<strong>{role}</strong><small>Your career goal</small></span></div>
            <div className="summary-progress"><div><span style={{ width: `${percent}%` }} /></div><b>{completed} / {totalDays} Days</b></div>
          </section>

          <section className="journey-card road-card">
            <div className="section-title"><div><span className="eyebrow">YOUR ROAD TO JOB-READY</span><h2>Keep moving forward</h2></div></div>
            <div className="roadmap">
              {[
                { name: 'Foundation', from: 1, to: Math.max(1, Math.round(totalDays * .2)) },
                { name: 'Build', from: Math.round(totalDays * .2) + 1, to: Math.round(totalDays * .4) },
                { name: 'Practice', from: Math.round(totalDays * .4) + 1, to: Math.round(totalDays * .67) },
                { name: 'Launch', from: Math.round(totalDays * .67) + 1, to: totalDays },
              ].map((s, idx) => {
                const done = currentDay > s.to; const active = currentDay >= s.from && currentDay <= s.to;
                return <div className={`road-step ${done ? 'done' : ''} ${active ? 'active' : ''}`} key={s.name}>
                  <div className="road-node">{done ? <i className="bi bi-check-lg" /> : active ? <span /> : <i className={idx === 3 ? 'bi bi-lock' : 'bi bi-circle'} />}</div>
                  {active && <em>You are here</em>}<strong>{s.name}</strong><small>Day {s.from} - {s.to}</small>
                </div>;
              })}
            </div>
          </section>

          {access.previewOnly && <section className="journey-card preview-banner">
            <div><i className="bi bi-stars" /><span><strong>You're on the free preview</strong><small>Days 1–{access.previewDays} are unlocked. Unlock every lesson, mock interview, project, mentor support and placement journey.</small></span></div>
            <div className="preview-actions">
              {access.paymentAvailable && <button onClick={handleUnlock} disabled={paying}>{paying ? 'Opening…' : access.priceInr ? `Unlock Full Journey · ₹${Number(access.priceInr).toLocaleString('en-IN')}` : 'Unlock Full Journey'}</button>}
              <button className="outline" onClick={handleTalkToMentor} disabled={mentorSent}>{mentorSent ? '✓ Mentor will reach out' : 'Talk to a mentor'}</button>
            </div>{payMsg && <p className="payment-error">{payMsg}</p>}
          </section>}

          <section className="journey-card curriculum-card">
            <div className="section-title"><div><span className="eyebrow">JOURNEY CURRICULUM</span><h2>Your week-by-week path</h2></div><div className="legend"><span className="complete-dot" /> Completed <span className="current-dot" /> Current <span className="locked-dot" /> Locked</div></div>
            <div className="week-list">
              {plan.weeks.map((wk: any) => {
                const weekCompleted = wk.days.filter((d: any) => d.status === 'completed').length;
                const weekPercent = wk.days.length ? Math.round((weekCompleted / wk.days.length) * 100) : 0;
                const isOpen = expandedWeek === wk.week;
                return <div className={`week-row ${isOpen ? 'open' : ''}`} key={wk.week}>
                  <button className="week-header" onClick={() => setExpandedWeek(isOpen ? null : wk.week)}>
                    <span className="week-icon"><i className={`bi ${weekPercent === 100 ? 'bi-check2-circle' : isOpen ? 'bi-code-slash' : 'bi-layers'}`} /></span>
                    <span className="week-copy"><small>Week {wk.week}</small><strong>{wk.title}</strong><em>{wk.days?.[0]?.day && wk.days?.[wk.days.length - 1]?.day ? `Days ${wk.days[0].day} - ${wk.days[wk.days.length - 1].day}` : ''}</em></span>
                    <span className="week-percent"><strong>{weekPercent}%</strong><small>{weekPercent === 100 ? 'Completed' : isOpen ? 'In Progress' : 'Upcoming'}</small></span>
                    <span className="week-bar"><i><b style={{ width: `${weekPercent}%` }} /></i><small>{weekCompleted} / {wk.days.length} Days</small></span>
                    <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'}`} />
                  </button>
                  {isOpen && <div className="day-strip">{wk.days.map((d: any) => <button key={d.day} onClick={() => openDay(d.day, d.locked)} disabled={d.locked} className={`day-chip ${d.status}`}><small>Day {d.day}</small>{d.locked ? <i className="bi bi-lock" /> : d.status === 'completed' ? <i className="bi bi-check-circle-fill" /> : d.status === 'current' ? <i className="bi bi-play-circle-fill" /> : <i className="bi bi-circle" />}</button>)}</div>}
                </div>;
              })}
            </div>
          </section>
        </main>

        <aside className="journey-aside">
          <section className="journey-card continue-card"><span className="aside-icon"><i className="bi bi-book" /></span><div><span className="eyebrow">CONTINUE LEARNING</span><h3>Day {currentDay}: {currentDayData?.title || currentWeek?.title || 'Keep learning'}</h3><p>Pick up where you left off and keep your momentum going.</p><button onClick={() => openDay(currentDay, false)}>Continue Day {currentDay} <i className="bi bi-play-fill" /></button></div></section>

          <section className="journey-card snapshot"><span className="eyebrow">JOURNEY SNAPSHOT</span>
            <dl><div><dt><i className="bi bi-calendar-check" /> Expected Completion</dt><dd>{endDate}</dd></div><div><dt><i className="bi bi-clock" /> Daily Goal</dt><dd>{plan.pace?.hoursPerDay || 1.5} hrs / day</dd></div><div><dt><i className="bi bi-check2-circle" /> Completed Days</dt><dd>{completed} days</dd></div><div><dt><i className="bi bi-flag" /> Next Milestone</dt><dd>{nextMilestone?.title || 'Job Ready'}</dd></div></dl>
          </section>

          {plan.milestones?.length > 0 && <section className="journey-card milestone-card"><span className="eyebrow">MILESTONES</span><div className="milestone-list">{plan.milestones.map((mi: any, i: number) => <div className={Number(mi.day) < currentDay ? 'done' : Number(mi.day) === currentDay ? 'active' : ''} key={i}><span><i className={`bi ${milestoneIcon(mi.kind)}`} /></span><p><strong>{mi.title}</strong><small>Day {mi.day}</small></p></div>)}</div></section>}

          <section className="journey-cheer"><i className="bi bi-trophy-fill" /><div><strong>You're doing great!</strong><span>Consistency is the key to success.</span></div></section>
        </aside>
      </div>
    </div>
  );
};

export default MyJourney;
