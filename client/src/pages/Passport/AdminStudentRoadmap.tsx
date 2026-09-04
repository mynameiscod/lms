import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import passportApi from '../../api/passportApi';
import './studentRoadmap.css';

/**
 * One member's plan, and why it says what it says.
 *
 * WHY THIS EXISTS. A member's day is generated, never authored — an objective is stamped
 * `origin: GENERATED` and nobody types "Programming Fundamentals — Check". So when an admin
 * asked where a mission came from there was nothing to open: the endpoint had existed all
 * along and no screen called it, leaving the only route to an answer a database query.
 *
 * The three inputs are all editable elsewhere — Role Blueprint decides which skills a role
 * needs, the Skill Graph decides what comes before what, and the member's measured scores
 * decide whether a skill is checked or taught. This screen is where they are seen TOGETHER,
 * against one student, which is the only place the interaction between them is visible.
 *
 * READ-ONLY ON PURPOSE. Editing an objective here would put a hand-written row inside a
 * generated plan, and the next replan would silently discard it — worse than not offering
 * it. Changes belong in the three inputs, which is where the links go.
 */

const WORK_LABEL: Record<string, string> = {
  LEARN: 'Learn', PRACTICE: 'Practice', ASSESS: 'Check', REVIEW: 'Review',
};

/**
 * The planner's own vocabulary, said in words an admin can act on.
 *
 * Both maps cover every value the types actually define (ReasonCode in roadmapPolicy,
 * GapStatus in roleReadinessPolicy) rather than the ones that came to mind — a partial map
 * falls through to raw codes like LIMITED_EVIDENCE on most rows, which is worse than no
 * translation at all because it looks deliberate.
 */
const REASON_LABEL: Record<string, string> = {
  PRIORITY_GAP: 'A gap the role cares about most',
  NEEDS_WORK: 'Measured below the target',
  PREREQUISITE: 'Something else needs it first',
  ASSESSMENT_NEEDED: 'Never measured — check before teaching',
  LIMITED_EVIDENCE: 'Measured, but not on enough evidence to trust',
  MAINTENANCE: 'Keeping a strong skill warm',
  VALIDATION: 'Proving it at the end of the plan',
};

/**
 * NOT_ASSESSED and LIMITED_EVIDENCE are deliberately different, and the policy that defines
 * them says why: one means we asked a little and are not sure, the other means we never
 * asked. Collapsing them would tell a student to work on something they may already know.
 */
const GAP_LABEL: Record<string, string> = {
  NOT_ASSESSED: 'Never measured',
  LIMITED_EVIDENCE: 'Too little evidence',
  PRIORITY_GAP: 'Priority gap',
  NEEDS_WORK: 'Below target',
  ON_TRACK: 'On track',
  STRONG: 'Strong',
};

const AdminStudentRoadmap: React.FC = () => {
  const { studentId = '' } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [showWorkings, setShowWorkings] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try { setData(await passportApi.getStudentSkillRoadmap(studentId)); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Could not load that member’s roadmap.'); }
    setLoading(false);
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="sr"><div className="sr-state">Loading the plan…</div></div>;
  if (err) return <div className="sr"><div className="sr-state err">{err}</div></div>;

  const rm = data?.roadmap;

  // No plan is a real state with a real explanation, not an error. A member who has not
  // generated one yet is the common case, and saying so beats an empty table.
  if (!data?.available) {
    return (
      <div className="sr">
        <button className="sr-back" onClick={() => nav('/admin/passport/students')}>← Back to members</button>
        <div className="sr-state">
          <b>This member has no active roadmap.</b>
          <p>
            Daily missions come from the roadmap, so this member has none either. A plan is
            built when they press “Generate my 90-day plan”, which needs a target role, a
            time commitment and a completed assessment.
          </p>
          {!!data?.history?.length && (
            <p className="sr-muted">{data.history.length} earlier plan{data.history.length === 1 ? '' : 's'} on record.</p>
          )}
        </div>
      </div>
    );
  }

  const objectives: any[] = rm.objectives || [];
  const weeks = [...new Set(objectives.map(o => o.week))].sort((a, b) => a - b);

  return (
    <div className="sr">
      <button className="sr-back" onClick={() => nav('/admin/passport/students')}>← Back to members</button>

      <header className="sr-hd">
        <div>
          <span className="sr-eyebrow">Member plan</span>
          <h1>{rm.roleName || rm.roleKey}</h1>
          <p>
            Every mission this member sees is generated from the plan below. Nothing here was
            written by hand — change it through the Role Blueprint, the Skill Graph, or by
            re-measuring the member.
          </p>
        </div>
        <div className="sr-facts">
          <div><small>Objectives</small><b>{objectives.length}</b></div>
          <div><small>Weeks</small><b>{rm.weekCount}</b></div>
          <div><small>Confidence</small><b>{rm.planningConfidence || '—'}</b></div>
          <div><small>Status</small><b>{rm.status}</b></div>
        </div>
      </header>

      {/* Staleness is the thing an admin most needs told, because the member cannot see it. */}
      {!!data.outdatedReasons?.length && (
        <div className="sr-note warn">
          <b>This plan is out of date.</b>
          <ul>{data.outdatedReasons.map((r: string) => <li key={r}>{r}</li>)}</ul>
          <span>It keeps working — the member is not blocked — but a replan would build from what is true now.</span>
        </div>
      )}

      <section className="sr-meta">
        <div><small>Generated</small><b>{rm.generatedAt ? new Date(rm.generatedAt).toLocaleString() : '—'}</b></div>
        <div><small>Reason</small><b>{rm.generationReason || '—'}</b></div>
        <div><small>Capacity</small><b>{rm.input?.minutesPerDay} min × {rm.input?.daysPerWeek} days</b></div>
        <div><small>Planned</small><b>{rm.capacity?.plannedMinutes} of {rm.capacity?.plannableMinutes} min</b></div>
        <div><small>Policy</small><b>{rm.policyVersion}</b></div>
      </section>

      <div className="sr-links">
        <span>Change what drives this plan:</span>
        <button onClick={() => nav('/admin/passport/role-blueprints')}>Role Blueprint — which skills the role needs</button>
        <button onClick={() => nav('/admin/passport/skills')}>Skill Graph — what comes before what</button>
        <button onClick={() => nav('/admin/passport/question-bank')}>Question Bank — what a Check asks</button>
      </div>

      {weeks.map(w => {
        const inWeek = objectives.filter(o => o.week === w).sort((a, b) => a.sequence - b.sequence);
        const mins = inWeek.reduce((n, o) => n + (o.plannedMinutes || 0), 0);
        return (
          <section className="sr-week" key={w}>
            <div className="sr-week-hd">
              <h2>Week {w}</h2>
              <span>{inWeek[0]?.phase} · {inWeek.length} objective{inWeek.length === 1 ? '' : 's'} · {mins} min</span>
            </div>

            <div className="sr-tablewrap">
              <table className="sr-table">
                <thead>
                  <tr>
                    <th>#</th><th>Skill</th><th>Work</th><th>Why it is here</th>
                    <th className="c">Measured</th><th className="c">Target</th><th className="c">Minutes</th>
                  </tr>
                </thead>
                <tbody>
                  {inWeek.map(o => (
                    <tr key={o.sequence}>
                      <td className="c seq">{o.sequence}</td>
                      <td>
                        <b>{o.skillName}</b>
                        <span className="key">{o.skillKey}</span>
                      </td>
                      <td><span className={`w w-${String(o.workType).toLowerCase()}`}>{WORK_LABEL[o.workType] || o.workType}</span></td>
                      <td className="why">
                        <span className={`rc rc-${String(o.reasonCode).toLowerCase()}`}>
                          {REASON_LABEL[o.reasonCode] || o.reasonCode}
                        </span>
                        {/* The dependency is the single most useful thing on the row: it is
                            what explains the ORDER, which is the question admins actually ask. */}
                        {o.prerequisiteFor && (
                          <span className="prereq">needed before <b>{o.prerequisiteFor}</b></span>
                        )}
                        <p>{o.explanation}</p>
                      </td>
                      <td className="c">
                        <span className={`gap g-${String(o.sourceGapStatus || '').toLowerCase()}`}>
                          {GAP_LABEL[o.sourceGapStatus] || o.sourceGapStatus || '—'}
                        </span>
                        {/* null is not zero. A member who has never been measured and one
                            measured at zero need different work, and the planner treats them
                            differently, so the table must not blur them into one number. */}
                        <em>{o.studentScore === null || o.studentScore === undefined ? 'no score' : `scored ${o.studentScore}`}</em>
                      </td>
                      <td className="c">{o.targetScore ?? '—'}<em>{o.targetLevel || ''}</em></td>
                      <td className="c num">{o.plannedMinutes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {!!rm.deferred?.length && (
        <section className="sr-deferred">
          <h2>Left out of this plan ({rm.deferred.length})</h2>
          <p>The role asks for these, but they did not fit the member’s time in this window.</p>
          <div className="sr-chips">
            {rm.deferred.map((d: any) => (
              <span key={d.skillKey} title={d.reason || ''}>{d.skillName || d.skillKey}</span>
            ))}
          </div>
        </section>
      )}

      <section className="sr-workings">
        <button onClick={() => setShowWorkings(v => !v)}>
          {showWorkings ? 'Hide' : 'Show'} the planner’s workings
        </button>
        {showWorkings && (
          <>
            <p className="sr-muted">
              Exactly what the planner recorded when it built this. Useful when a plan looks
              wrong and the objectives alone do not explain it.
            </p>
            <pre>{(data.workings || []).join('\n')}</pre>
          </>
        )}
      </section>

      {!!data.history?.length && (
        <section className="sr-history">
          <h2>Earlier plans ({data.history.length})</h2>
          <p className="sr-muted">
            A replan supersedes rather than deletes — what a member was asked to do in March
            stays part of their record.
          </p>
          <div className="sr-tablewrap">
            <table className="sr-table">
              <thead><tr><th>Generated</th><th>Role</th><th>Status</th><th>Reason</th><th>Confidence</th></tr></thead>
              <tbody>
                {data.history.map((h: any) => (
                  <tr key={String(h._id)}>
                    <td>{h.generatedAt ? new Date(h.generatedAt).toLocaleDateString() : '—'}</td>
                    <td>{h.roleName || h.roleKey}</td>
                    <td><span className={`st st-${String(h.status).toLowerCase()}`}>{h.status}</span></td>
                    <td>{h.generationReason || '—'}</td>
                    <td>{h.planningConfidence || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

export default AdminStudentRoadmap;
