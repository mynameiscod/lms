import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { enrollmentPlanApi } from '../../api/enrollmentPlanApi';
import RaiseConcern from '../../components/RaiseConcern';

/**
 * "My Journey" — the sell-focused student plan view (Slice 3).
 * Renders the structured plan from GET /enrollment-plans/:id/journey:
 * outcome hero, progress, milestone timeline, week-by-week with locked teasers,
 * and (for preview enrollments) the unlock CTAs. Replaces the bare day list.
 */

const PURPLE = '#6650d8', TEAL = '#14a89c', NAVY = '#0a2a5e', INK = '#1f2937', MUTED = '#6b7280';

const statusStyle = (s: string): React.CSSProperties => {
  switch (s) {
    case 'completed': return { background: '#e7f8f4', color: '#0a8d7a', borderColor: '#bfeee5' };
    case 'current':   return { background: '#efeaff', color: PURPLE, borderColor: '#d9d2fb', fontWeight: 800 };
    case 'locked':    return { background: '#f1f5f9', color: '#94a3b8', borderColor: '#e2e8f0' };
    default:          return { background: '#fff', color: INK, borderColor: '#e8ecf3' };
  }
};
const milestoneEmoji = (k: string) => (k === 'mock' ? '🎤' : k === 'project' ? '🏆' : '⭐');

const MyJourney: React.FC = () => {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const navigate = useNavigate();
  const [j, setJ] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try { setJ(await enrollmentPlanApi.getJourney(enrollmentId!)); }
      catch (e: any) { setErr(e?.response?.data?.message || e.message || 'Failed to load your journey'); }
      finally { setLoading(false); }
    })();
  }, [enrollmentId]);

  if (loading) return <div style={{ padding: 40, color: MUTED }}>Loading your journey…</div>;
  if (err) return <div style={{ padding: 40, color: '#b91c1c' }}>{err}</div>;
  if (!j) return null;

  const { plan, progress, access } = j;
  const role = plan.targetRole || 'your target role';
  const openDay = (d: number, locked: boolean) => { if (!locked) navigate(`/my-learning/${enrollmentId}/day/${d}`); };

  return (
    <div style={{ maxWidth: 1060, margin: '0 auto', padding: '18px 20px 60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={() => navigate('/my-learning')} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 13 }}>← All plans</button>
        <RaiseConcern context={{ enrollmentId: enrollmentId!, curriculumTitle: plan.title }} />
      </div>

      {/* Hero */}
      <div style={{ borderRadius: 18, padding: '26px 28px', color: '#fff', background: `linear-gradient(120deg, ${NAVY} 0%, ${PURPLE} 60%, ${TEAL} 120%)`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ fontSize: 12.5, opacity: .85, fontWeight: 600, letterSpacing: .3 }}>YOUR PERSONALIZED PATH</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: '6px 0 4px' }}>{plan.title}</h1>
        <div style={{ fontSize: 14.5, opacity: .92 }}>{plan.totalWeeks} weeks · {plan.totalDays} days to become job-ready for a <b>{role}</b> role</div>
        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ height: 9, background: 'rgba(255,255,255,.25)', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ width: `${progress.percent}%`, height: '100%', background: '#fff', borderRadius: 6 }} />
            </div>
            <div style={{ fontSize: 12, opacity: .9, marginTop: 6 }}>{progress.percent}% complete · {progress.completedDays}/{plan.totalDays} days · you're on Day {progress.currentDay}</div>
          </div>
          <button onClick={() => openDay(progress.currentDay, false)} style={{ background: '#fff', color: PURPLE, border: 'none', borderRadius: 10, padding: '11px 20px', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
            Continue → Day {progress.currentDay}
          </button>
        </div>
      </div>

      {/* Preview / unlock banner */}
      {access.previewOnly && (
        <div style={{ marginTop: 16, borderRadius: 14, padding: '16px 18px', background: '#fff7ed', border: '1px solid #fed7aa', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontWeight: 800, color: '#9a3412', fontSize: 14.5 }}>✨ You're on the free preview</div>
            <div style={{ fontSize: 12.8, color: '#9a3412', marginTop: 3 }}>Days 1–{access.previewDays} are unlocked. Unlock your full {plan.totalWeeks}-week plan — every lesson, mock interview, project, mentor support &amp; placement.</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => alert('Online payment (Razorpay) — coming in the paywall slice.')} style={{ background: `linear-gradient(90deg,${PURPLE},${TEAL})`, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 18px', fontWeight: 800, fontSize: 13.5, cursor: 'pointer' }}>Unlock full plan</button>
            <button onClick={() => alert('A mentor will reach out — routed to our team.')} style={{ background: '#fff', color: PURPLE, border: `1.5px solid ${PURPLE}`, borderRadius: 10, padding: '11px 18px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>Talk to a mentor</button>
          </div>
        </div>
      )}

      {/* Milestone timeline */}
      {plan.milestones?.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <h3 style={{ fontSize: 15, fontWeight: 750, color: NAVY, marginBottom: 10 }}>🎯 Milestones</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {plan.milestones.map((mi: any, i: number) => (
              <div key={i} style={{ background: 'linear-gradient(135deg,#f6f4ff,#eafaf7)', border: '1px solid #e6e2fb', borderRadius: 11, padding: '9px 13px', fontSize: 12.5 }}>
                <span style={{ fontSize: 16, marginRight: 6 }}>{milestoneEmoji(mi.kind)}</span>
                <b style={{ color: NAVY }}>{mi.title}</b><span style={{ color: MUTED }}> · Day {mi.day}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weeks */}
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {plan.weeks.map((wk: any) => (
          <div key={wk.week} style={{ background: '#fff', border: '1px solid #e8ecf3', borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(15,23,42,.05)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: PURPLE, letterSpacing: .5 }}>WEEK {wk.week}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: INK }}>{wk.title}</span>
              {wk.milestones?.length > 0 && <span style={{ marginLeft: 'auto', fontSize: 12 }}>{wk.milestones.map((mm: any) => milestoneEmoji(mm.kind)).join(' ')}</span>}
            </div>
            <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
              {wk.days.map((d: any) => (
                <button
                  key={d.day}
                  onClick={() => openDay(d.day, d.locked)}
                  title={d.title}
                  style={{
                    width: 132, textAlign: 'left', border: '1px solid', borderRadius: 11, padding: '10px 11px',
                    cursor: d.locked ? 'default' : 'pointer', ...statusStyle(d.status),
                  }}
                >
                  <div style={{ fontSize: 10.5, fontWeight: 800, opacity: .8, display: 'flex', justifyContent: 'space-between' }}>
                    <span>DAY {d.day}</span>
                    <span>{d.locked ? '🔒' : d.status === 'completed' ? '✓' : d.milestone ? milestoneEmoji(d.milestone.kind) : ''}</span>
                  </div>
                  <div style={{ fontSize: 11.5, marginTop: 4, lineHeight: 1.3, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.title}</div>
                  {d.milestone && <div style={{ fontSize: 10, marginTop: 3, opacity: .85 }}>{d.milestone.title}</div>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18, fontSize: 12, color: MUTED, textAlign: 'center' }}>
        {plan.totalDays} days · estimated completion {new Date(j.estimatedEndDate).toLocaleDateString()} at {plan.pace?.hoursPerDay || 1.5} hrs/day
      </div>
    </div>
  );
};

export default MyJourney;
