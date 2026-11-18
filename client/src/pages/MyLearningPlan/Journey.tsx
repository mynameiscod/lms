import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { enrollmentPlanApi } from '../../api/enrollmentPlanApi';
import { unlockPlanCheckout } from '../../api/paymentApi';
import { concernApi } from '../../api/concernApi';
import RaiseConcern from '../../components/RaiseConcern';
import './journeyDays.css';
import { useAuth } from '../../contexts/AuthContext';
import { isDemoUser } from '../../components/lmsDemo/DemoShell';

const milestoneIcon = (kind: string) => kind === 'mock' ? 'bi-mic' : kind === 'project' ? 'bi-trophy' : 'bi-star';

const MyJourney: React.FC = () => {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth() as any;
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

  if (loading) return <div className="jny"><div className="jny-state"><div className="jny-spin" /> Loading your days…</div></div>;
  if (err) return <div className="jny"><div className="jny-state err">{err}</div></div>;
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

  const demo = isDemoUser(user);
  const allDays: any[] = (plan.weeks || []).flatMap((w: any) => w.days || []);

  return (
    <div className="jny">
      <header className="jny-hero">
        <div className="jny-hero-main">
          <button type="button" className="jny-crumb" onClick={() => navigate('/my-learning')}><i className="bi bi-arrow-left" /> My Learning Plan</button>
          <span className="jny-eyebrow">All days</span>
          <h1>{plan.title}</h1>
          <div className="jny-chips">
            <span><i className="bi bi-calendar3" /> Day {currentDay} of {totalDays}</span>
            <span><i className="bi bi-check2-circle" /> {completed} {completed === 1 ? 'day' : 'days'} done</span>
            {!demo && <span><i className="bi bi-flag" /> Ends {endDate}</span>}
            {!demo && plan.targetRole && <span><i className="bi bi-bullseye" /> {role}</span>}
          </div>
          <div className="jny-bar"><i style={{ width: `${percent}%` }} /></div>
        </div>
        <div className="jny-hero-side">
          <div className="jny-ring" style={{ ['--p' as any]: `${percent * 3.6}deg` }}><div><b>{percent}%</b><span>complete</span></div></div>
          <button type="button" className="jny-continue" onClick={() => openDay(currentDay, false)}><i className="bi bi-play-fill" /> {completed ? 'Continue' : 'Start'} Day {currentDay}</button>
        </div>
      </header>

      {access.previewOnly && (
        <section className="jny-preview">
          <div className="jny-preview-copy"><i className="bi bi-stars" /><span><b>You're on the free preview</b><small>Days 1–{access.previewDays} are unlocked. Unlock every lesson, mock interview, project, mentor support and placement journey.</small></span></div>
          <div className="jny-preview-actions">
            {access.paymentAvailable && <button type="button" className="jny-btn navy" onClick={handleUnlock} disabled={paying}>{paying ? 'Opening…' : access.priceInr ? `Unlock Full Journey · ₹${Number(access.priceInr).toLocaleString('en-IN')}` : 'Unlock Full Journey'}</button>}
            <button type="button" className="jny-btn ghost" onClick={handleTalkToMentor} disabled={mentorSent}>{mentorSent ? '✓ Mentor will reach out' : 'Talk to a mentor'}</button>
          </div>
          {payMsg && <p className="jny-err">{payMsg}</p>}
        </section>
      )}

      <div className="jny-layout">
        <main className="jny-weeks">
          <div className="jny-legend">
            <span><i className="dot done" /> Completed</span><span><i className="dot cur" /> Up next</span><span><i className="dot next" /> Upcoming</span>{allDays.some((d: any) => d.locked) && <span><i className="dot lock" /> Locked</span>}
          </div>
          {plan.weeks.map((wk: any) => {
            const weekDone = wk.days.filter((d: any) => d.status === 'completed').length;
            const weekPct = wk.days.length ? Math.round((weekDone / wk.days.length) * 100) : 0;
            const isOpen = plan.weeks.length <= 3 || expandedWeek === wk.week;
            return (
              <section className={`jny-week${isOpen ? ' open' : ''}`} key={wk.week}>
                <button type="button" className="jny-week-head" onClick={() => setExpandedWeek(expandedWeek === wk.week ? null : wk.week)} aria-expanded={isOpen}>
                  <span className={`jny-week-ic${weekPct === 100 ? ' done' : ''}`}><i className={`bi ${weekPct === 100 ? 'bi-check2-circle' : 'bi-layers'}`} /></span>
                  <span className="jny-week-tx"><small>Week {wk.week}{wk.days?.length ? ` · Days ${wk.days[0].day}–${wk.days[wk.days.length - 1].day}` : ''}</small><b>{wk.title}</b></span>
                  <span className="jny-week-pct"><b>{weekPct}%</b><small>{weekDone}/{wk.days.length} days</small></span>
                  {plan.weeks.length > 3 && <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'}`} />}
                </button>
                {isOpen && (
                  <div className="jny-days">
                    {wk.days.map((d: any) => {
                      const st = d.locked ? 'lock' : d.status === 'completed' ? 'done' : d.day === currentDay || d.status === 'current' ? 'cur' : 'next';
                      return (
                        <button type="button" key={d.day} disabled={d.locked} onClick={() => openDay(d.day, d.locked)} className={`jny-day ${st}`}>
                          <span className="jny-day-top"><small>Day</small><b>{d.day}</b><i className={`bi ${st === 'done' ? 'bi-check-circle-fill' : st === 'lock' ? 'bi-lock-fill' : st === 'cur' ? 'bi-play-circle-fill' : 'bi-circle'}`} /></span>
                          {d.title && <span className="jny-day-title">{d.title}</span>}
                          <span className="jny-day-foot">{st === 'done' ? 'Completed' : st === 'lock' ? 'Locked' : st === 'cur' ? (completed ? 'Continue' : 'Start here') : 'Open'}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </main>

        <aside className="jny-aside">
          <section className="jny-card jny-next">
            <span className="jny-next-ic"><i className="bi bi-book" /></span>
            <span className="jny-eyebrow dark">Up next</span>
            <h3>Day {currentDay}{currentDayData?.title ? `: ${currentDayData.title}` : ''}</h3>
            <p>Pick up where you left off and keep your momentum going.</p>
            <button type="button" className="jny-btn navy" onClick={() => openDay(currentDay, false)}>{completed ? 'Continue' : 'Start'} Day {currentDay} <i className="bi bi-arrow-right" /></button>
          </section>
          {!demo && (
            <section className="jny-card">
              <span className="jny-eyebrow dark">Snapshot</span>
              <dl className="jny-dl">
                <div><dt><i className="bi bi-calendar-check" /> Expected completion</dt><dd>{endDate}</dd></div>
                <div><dt><i className="bi bi-clock" /> Daily goal</dt><dd>{plan.pace?.hoursPerDay || 1.5} hrs / day</dd></div>
                <div><dt><i className="bi bi-check2-circle" /> Completed</dt><dd>{completed} days</dd></div>
                <div><dt><i className="bi bi-flag" /> Next milestone</dt><dd>{nextMilestone?.title || 'Job Ready'}</dd></div>
              </dl>
            </section>
          )}
          {!demo && plan.milestones?.length > 0 && (
            <section className="jny-card">
              <span className="jny-eyebrow dark">Milestones</span>
              <div className="jny-miles">
                {plan.milestones.map((mi: any, i: number) => (
                  <div key={i} className={Number(mi.day) < currentDay ? 'done' : Number(mi.day) === currentDay ? 'active' : ''}>
                    <span><i className={`bi ${milestoneIcon(mi.kind)}`} /></span><p><b>{mi.title}</b><small>Day {mi.day}</small></p>
                  </div>
                ))}
              </div>
            </section>
          )}
          {!demo && <div className="jny-concern"><RaiseConcern context={{ enrollmentId: enrollmentId!, curriculumTitle: plan.title }} /></div>}
        </aside>
      </div>
    </div>
  );
};

export default MyJourney;
