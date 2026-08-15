import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { ReassessmentStatus, ReplanStatusView } from '../../api/passportApi';
import './skillCheckIn.css';

/**
 * The skill check-in card, and the roadmap recommendation that follows one.
 *
 * IT OFFERS; IT NEVER ACTS. A check-in can change what CareerPilot knows about somebody
 * within seconds. It must not change the plan they opened this morning — so the recommendation
 * sits behind an explicit button, and the roadmap moves only when they press it.
 *
 * WAITING IS NOT AN ERROR. A student inside the cooldown sees when it opens and why the wait
 * helps, not a red box. The whole point of waiting is that their roadmap progress makes the
 * next check-in sharper.
 *
 * NOTHING HERE DECIDES ANYTHING. Eligibility, targeting and the recommendation all arrive
 * from the server; this renders them.
 */

const BLOCKER_ICON: Record<string, string> = {
  INITIAL_ASSESSMENT_REQUIRED: 'bi-clipboard-check',
  COOLDOWN_ACTIVE: 'bi-hourglass-split',
  MEMBERSHIP_REQUIRED: 'bi-lock',
  ASSESSMENT_IN_PROGRESS: 'bi-pencil-square',
  REASSESSMENT_DISABLED: 'bi-slash-circle',
  ROLE_NOT_SELECTED: 'bi-compass',
  NO_TARGET_SKILLS: 'bi-check2-circle',
};

const SkillCheckIn: React.FC = () => {
  const nav = useNavigate();
  const [status, setStatus] = useState<ReassessmentStatus | null>(null);
  const [replan, setReplan] = useState<ReplanStatusView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([
        passportApi.getReassessmentStatus(),
        passportApi.getReplanStatus().catch(() => null),
      ]);
      setStatus(s);
      setReplan(r);
    } catch { /* the rest of the page still renders */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const start = async () => {
    setBusy(true); setErr('');
    try {
      const r = await passportApi.startReassessment();
      // Reuses the existing assessment screen — there is no second quiz UI.
      nav(`/careerpilot/skill-assessment?attempt=${encodeURIComponent(r.attemptId)}`);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not start your check-in.');
      setBusy(false);
    }
  };

  const doReplan = async () => {
    setBusy(true); setErr('');
    try {
      // Module 9's own replan. The server re-derives everything from current state — whatever
      // this page showed a moment ago is informational only.
      await passportApi.replanMySkillRoadmap();
      setConfirming(false);
      await load();
      nav('/careerpilot/roadmap');
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not update your roadmap.');
      setConfirming(false);
    }
    setBusy(false);
  };

  if (loading || !status) return null;

  const suggested = replan && replan.recommendation !== 'NONE' && !replan.roadmapCompleted;

  return (
    <div className="sci">
      {/* ── the recommendation, when there is one ── */}
      {suggested && (
        <div className={`sci-replan${replan!.recommendation === 'REQUIRED' ? ' req' : ''}`}>
          <div className="tx">
            <b>{replan!.recommendation === 'REQUIRED'
              ? 'Your roadmap needs rebuilding'
              : 'Your roadmap can be improved'}</b>
            <span>{replan!.message}</span>

            {!!replan!.affectedSkills.length && (
              <ul className="why">
                {replan!.affectedSkills.slice(0, 3).map(s => (
                  <li key={s.skillKey} className={(s.delta ?? 0) < 0 ? 'down' : 'up'}>
                    {s.skillName}
                    {s.delta !== null && <> {s.delta > 0 ? '+' : ''}{s.delta}</>}
                    {s.materialReasons.includes('TARGET_REACHED') && ' · target reached'}
                    {s.materialReasons.includes('NEWLY_MEASURED') && ' · now measured'}
                  </li>
                ))}
              </ul>
            )}

            {replan!.readinessDelta !== null && (
              <em className="rd">
                Role readiness {replan!.roadmapBaselineReadiness}% → {replan!.currentReadiness}%
                {' '}({replan!.readinessDelta > 0 ? '+' : ''}{replan!.readinessDelta})
              </em>
            )}
          </div>
          <button className="sci-btn primary" onClick={() => setConfirming(true)}>
            Update my roadmap
          </button>
        </div>
      )}

      {/* ── the check-in itself ── */}
      <div className="sci-card">
        <div className="hd">
          <i className="bi bi-activity" />
          <b>Skill check-in</b>
        </div>

        {status.eligible ? (
          <>
            <p>
              We will focus on the skills you have recently worked on and the areas where we
              need stronger evidence.
            </p>
            <div className="meta">
              <span>{status.estimatedQuestions} questions</span>
              {status.lastCompletedAt && (
                <em>Last check-in {new Date(status.lastCompletedAt).toLocaleDateString()}</em>
              )}
            </div>

            {!!status.targetSkills.length && (
              <div className="focus">
                <span>Focus</span>
                <div className="tags">
                  {status.targetSkills.map(t => <i key={t.skillKey}>{t.skillName}</i>)}
                </div>
              </div>
            )}

            <button className="sci-btn primary" disabled={busy} onClick={start}>
              {busy ? 'Preparing…' : status.activeAttemptId ? 'Continue check-in' : 'Start skill check-in'}
            </button>
          </>
        ) : (
          <>
            {/* A waiting state, phrased as one. */}
            <div className="wait">
              <i className={`bi ${BLOCKER_ICON[status.blockers[0]] || 'bi-hourglass'}`} />
              <p>{status.message}</p>
            </div>
            {status.activeAttemptId && (
              <button className="sci-btn" onClick={() => nav('/careerpilot/skill-assessment')}>
                Continue your assessment
              </button>
            )}
            {status.blockers.includes('INITIAL_ASSESSMENT_REQUIRED') && (
              <button className="sci-btn primary" onClick={() => nav('/careerpilot/skill-assessment')}>
                Take my first assessment
              </button>
            )}
          </>
        )}

        {err && <p className="sci-err">{err}</p>}
      </div>

      {confirming && (
        <div className="sci-modal" role="dialog">
          <div className="bx">
            <b>Update your roadmap?</b>
            <p>
              CareerPilot will rebuild the remaining plan using your latest skills.
            </p>
            {/* Said plainly, because these are the things students actually worry about. */}
            <ul>
              <li>Your completed work, XP, coins and streak stay exactly as they are.</li>
              <li>Your assessment history is unchanged.</li>
              <li>Your membership end date does not change.</li>
            </ul>
            <div className="acts">
              <button className="sci-btn" onClick={() => setConfirming(false)}>Cancel</button>
              <button className="sci-btn primary" disabled={busy} onClick={doReplan}>
                {busy ? 'Updating…' : 'Update roadmap'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillCheckIn;
