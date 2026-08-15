import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, {
  DailyPlanResponse, DailyPlanAvailable, DailyPlanUnavailable, DailyMission,
} from '../../api/passportApi';
import './todayPlan.css';

/**
 * What to do today, drawn from the 90-day roadmap.
 *
 * ONE OBVIOUS NEXT ACTION. The roadmap below answers "where am I going"; this answers "what
 * do I do now", which is the only question a student has when they open the app on a
 * Tuesday. It sits above the plan for that reason.
 *
 * EVERY TASK CARRIES ITS REASON — Module 9's own words, not a new explanation invented here.
 * "Why am I practising arrays?" is answered in place, which is what stops the plan feeling
 * arbitrary and being abandoned.
 *
 * FINISHING IS NOT PROVING. Completing a task moves roadmap progress and nothing else. The
 * skills figures on the other screens come only from a graded assessment, and nothing on
 * this component can change them.
 */

const REASON_LABEL: Record<string, string> = {
  PRIORITY_GAP: 'Priority gap',
  NEEDS_WORK: 'Needs work',
  PREREQUISITE: 'Prerequisite',
  ASSESSMENT_NEEDED: 'Not measured yet',
  LIMITED_EVIDENCE: 'Limited evidence',
  MAINTENANCE: 'Keeping it sharp',
  VALIDATION: 'Re-measure',
};

const mins = (n: number) => (n >= 60 ? `${Math.floor(n / 60)}h${n % 60 ? ` ${n % 60}m` : ''}` : `${n} min`);

const TodayPlan: React.FC = () => {
  const nav = useNavigate();
  const [data, setData] = useState<DailyPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try { setData(await passportApi.getTodaysPlan()); }
    catch { /* the roadmap below still renders; this section stays quiet */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const complete = async (m: DailyMission) => {
    setBusy(m.key); setErr('');
    try {
      const r = await passportApi.completeDailyMission(m.key);
      if (r?.plan) setData(r.plan);
      else await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not record that just now.');
    }
    setBusy(null);
  };

  if (loading || !data) return null;

  // ── nothing to show ───────────────────────────────────────────────────────
  if (!data.available) {
    const un = data as DailyPlanUnavailable;
    // A missing roadmap is handled by the plan section below, which already offers to build
    // one. Repeating the prompt here would give the page two competing calls to action.
    if (un.reason === 'ROADMAP_REQUIRED') return null;

    return (
      <div className="tdp tdp-empty">
        <b>{un.reason === 'ROADMAP_COMPLETED' ? 'Your 90 days are complete' : 'Membership needed'}</b>
        <span>{un.message}</span>
      </div>
    );
  }

  const plan = data as DailyPlanAvailable;
  const doneCount = plan.missions.filter(m => m.done).length;
  const allDone = plan.missions.length > 0 && doneCount === plan.missions.length;

  return (
    <div className="tdp">
      <div className="tdp-hd">
        <div className="t">
          <h2>Today’s plan</h2>
          <span>Day {plan.roadmapDay} · Week {plan.roadmapWeek} of {plan.weekCount}</span>
        </div>
        <div className="m">
          <b>{plan.capacity.plannedMinutes}</b>
          <span>of {plan.capacity.minutesPerDay} min</span>
        </div>
      </div>

      {plan.missions.length === 0 ? (
        // §139: an empty day is an honest answer, not a reason to invent filler.
        <div className="tdp-rest">
          <i className="bi bi-check2-circle" />
          <b>You’re done for today.</b>
          <span>This week’s work is on track. Rest is part of the plan.</span>
        </div>
      ) : (
        <>
          {allDone && (
            <div className="tdp-all">
              <i className="bi bi-check2-circle" />
              All {plan.missions.length} done today. Your roadmap moved forward.
            </div>
          )}

          <div className="tdp-list">
            {plan.missions.map((m, i) => (
              <div className={`tdp-row${m.done ? ' done' : ''}`} key={m.key}>
                <span className="n">{m.done ? '✓' : i + 1}</span>

                <div className="tx">
                  <b>{m.title}</b>
                  <div className="meta">
                    <span className="mn">{mins(m.plannedMinutes)}</span>
                    <span className={`rc r-${m.reasonCode.toLowerCase()}`}>
                      {REASON_LABEL[m.reasonCode] || m.reasonCode}
                    </span>
                  </div>
                  {/* Module 9's reason, shown where the work is. */}
                  <p className="why">{m.explanation}</p>

                  {m.resourceState === 'RESOURCE_NOT_CONFIGURED' && !m.done && (
                    // No broken Start button. The student gets an honest instruction; the
                    // gap is reported to admin through the mapping screen, not here.
                    <em className="gap">
                      Work on this objective in your own time, then mark it done.
                    </em>
                  )}
                </div>

                <div className="ax">
                  {m.resourceState === 'READY' && !m.done && (
                    <button className="tdp-btn primary" onClick={() => nav(m.resource!.route)}>
                      Start
                    </button>
                  )}
                  {!m.done && (
                    <button className="tdp-btn" disabled={busy === m.key} onClick={() => complete(m)}>
                      {busy === m.key ? '…' : 'Mark done'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {err && <p className="tdp-err">{err}</p>}

      <div className="tdp-week">
        <span>This week</span>
        <div className="bar">
          <i style={{ width: `${plan.week.plannedMinutes ? Math.min(100, Math.round((plan.week.completedMinutes / plan.week.plannedMinutes) * 100)) : 0}%` }} />
        </div>
        <em>{plan.week.completedMinutes} / {plan.week.plannedMinutes} min</em>
      </div>

      {/* Plan progress, explicitly not readiness. Doing the work is not the same as being
          ready for the role, and one number for both would say it was. */}
      <p className="tdp-foot">
        {plan.progress.percent}% of your roadmap’s planned time completed. This tracks the
        plan, not your skill level — that comes from your assessments.
      </p>
    </div>
  );
};

export default TodayPlan;
