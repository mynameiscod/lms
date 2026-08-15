import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, {
  SkillRoadmapResponse, SkillRoadmapAvailable, SkillRoadmapUnavailable, RoadmapObjective,
} from '../../api/passportApi';
import TodayPlan from './TodayPlan';
import './skillPlan.css';

/**
 * The 90-day skill plan, shown above the mission journey on the same page.
 *
 * TWO LAYERS, ONE PAGE. The journey below answers "what do I do today"; this answers "what
 * am I working toward, and why that". They are deliberately not merged — a member who has
 * not generated a plan still has their daily missions, and a member who has one still needs
 * somewhere to see today.
 *
 * THIS WEEK COMES FIRST. Ninety days rendered at once is a wall, and the thing a member
 * actually came for is the next few hours of work. Phases collapse; the current week does
 * not.
 *
 * EVERY ITEM SAYS WHY IT IS THERE. The explanation arrives from the server already built
 * from the member's own numbers — no AI, nothing generated — so "why am I doing this?" is
 * answered in place rather than by a support conversation.
 *
 * NO PROMISES ABOUT JOBS. This plan focuses limited time on measured gaps. It does not say
 * that finishing it makes anybody employable, because we do not know that.
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

const WORK_LABEL: Record<string, string> = {
  LEARN: 'Learn', PRACTICE: 'Practise', ASSESS: 'Check', REVIEW: 'Review',
};

const CONFIDENCE_LABEL: Record<string, string> = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };

const mins = (n: number) => (n >= 60 ? `${Math.floor(n / 60)}h${n % 60 ? ` ${n % 60}m` : ''}` : `${n} min`);

/** Where an unavailable plan should send the member. Each reason has exactly one fix. */
const NEXT_ACTION: Record<string, { label: string; to: string }> = {
  CAREER_CONTEXT_INCOMPLETE: { label: 'Complete career setup', to: '/careerpilot/setup' },
  ROLE_NOT_SELECTED: { label: 'Choose my target role', to: '/careerpilot/setup' },
  ROLE_BLUEPRINT_NOT_READY: { label: 'See my skills', to: '/careerpilot/skills' },
  // A lapsed membership is the one refusal with a commercial answer. It points at the
  // journey page's existing unlock rather than a second checkout of its own.
  MEMBERSHIP_REQUIRED: { label: 'See membership options', to: '/careerpilot/roadmap' },
};

const SkillPlan: React.FC = () => {
  const nav = useNavigate();
  const [data, setData] = useState<SkillRoadmapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [openPhase, setOpenPhase] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setData(await passportApi.getMySkillRoadmap()); }
    catch { /* the journey below still renders; this section simply stays quiet */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const generate = async (replan: boolean) => {
    setBusy(true); setErr('');
    try {
      setData(replan
        ? await passportApi.replanMySkillRoadmap()
        : await passportApi.generateMySkillRoadmap());
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not build your plan just now.');
    }
    setBusy(false);
  };

  const ready = data && data.available ? (data as SkillRoadmapAvailable) : null;
  const rm = ready?.roadmap;

  /**
   * "Why this roadmap?", assembled from what the plan actually contains.
   *
   * Deterministic on purpose — the same plan always explains itself the same way, and the
   * sentence cannot drift from the objectives it describes.
   */
  const why = useMemo(() => {
    if (!rm) return null;
    const named = (codes: string[]) => {
      const keys: string[] = [];
      for (const o of rm.objectives) {
        if (codes.includes(o.reasonCode) && !keys.includes(o.skillName)) keys.push(o.skillName);
      }
      return keys;
    };
    return {
      gaps: named(['PRIORITY_GAP', 'NEEDS_WORK']).slice(0, 3),
      unknown: named(['ASSESSMENT_NEEDED', 'LIMITED_EVIDENCE']).length,
      prerequisites: named(['PREREQUISITE']).slice(0, 2),
    };
  }, [rm]);

  useEffect(() => {
    if (ready && openPhase === null) {
      const cur = ready.roadmap.phases.find(p =>
        ready.currentWeek >= p.fromWeek && ready.currentWeek <= p.toWeek);
      setOpenPhase(cur?.key || ready.roadmap.phases[0]?.key || null);
    }
  }, [ready, openPhase]);

  if (loading) return null;
  if (!data) return null;

  /* Today's work sits ABOVE the 90-day plan: "what do I do now" is the only question a
     student has when they open the app, and the plan is the context for it. TodayPlan
     renders nothing until a roadmap exists, so nothing appears twice. */

  // ── nothing to show yet ───────────────────────────────────────────────────
  if (!data.available) {
    const un = data as SkillRoadmapUnavailable;
    const canGenerate = un.reason === 'NO_READINESS_DATA';
    const action = NEXT_ACTION[un.reason];

    return (
      <div className="skp skp-cta">
        <div className="tx">
          <b>{canGenerate ? 'Your 90-day plan is ready to build' : 'Your 90-day plan needs one more thing'}</b>
          <span>{un.message}</span>
          {!!un.missing?.length && (
            <em>Still needed: {un.missing.map(m => m.split('.').pop()).join(', ')}</em>
          )}
        </div>
        {canGenerate ? (
          <button className="skp-btn primary" disabled={busy} onClick={() => generate(false)}>
            {busy ? 'Building…' : 'Generate my 90-day plan'}
          </button>
        ) : action && (
          <button className="skp-btn" onClick={() => nav(action.to)}>{action.label}</button>
        )}
        {err && <p className="skp-err">{err}</p>}
      </div>
    );
  }

  const view = ready!;
  const plan = rm!;
  const thisWeek = plan.objectives.filter(o => o.week === view.currentWeek);

  const Row: React.FC<{ o: RoadmapObjective }> = ({ o }) => (
    <div className={`skp-row r-${o.reasonCode.toLowerCase()}`}>
      <div className="hd">
        <b>{o.skillName}</b>
        <span className="wt">{WORK_LABEL[o.workType] || o.workType}</span>
        <span className="mn">{mins(o.plannedMinutes)}</span>
      </div>
      <span className="rc">{REASON_LABEL[o.reasonCode] || o.reasonCode}</span>
      <p className="ex">{o.explanation}</p>
    </div>
  );

  return (
    <div className="skp">
      <TodayPlan />

      <div className="skp-hd">
        <div className="t">
          <h2>Your {plan.roadmapDays}-day {plan.role.name} plan</h2>
          <p>
            Built from your measured skills and the time you told us you have. These are
            planning budgets, not a promise about how long anything takes.
          </p>
        </div>
        <div className="d">
          <b>Day {view.currentDay}</b>
          <span>of {plan.roadmapDays}</span>
        </div>
      </div>

      <div className="skp-chips">
        <span>🎯 {plan.role.name}</span>
        <span>⏱ {plan.capacity.minutesPerDay} min/day · {plan.capacity.daysPerWeek} days/week</span>
        <span className={`cf ${plan.planningConfidence.toLowerCase()}`}>
          Planning confidence: {CONFIDENCE_LABEL[plan.planningConfidence]}
        </span>
        {plan.basis.entitlementLimited && <span>📅 Shortened to fit your membership</span>}
      </div>

      {/* A plan built on thin evidence says so, rather than presenting a guess with the
          same confidence as a measured plan. */}
      {plan.planningConfidence === 'LOW' && (
        <div className="skp-note">
          We are still learning where you stand in some areas. The early part of this plan
          includes checks, so the next one can be more precise.
        </div>
      )}

      {view.completed && (
        <div className="skp-note done">
          This 90-day plan has finished. Your progress and everything it asked of you are kept.
        </div>
      )}

      {/* Nothing is rewritten behind the member's back — the change is offered, not applied. */}
      {view.outdated && !view.completed && (
        <div className="skp-note warn">
          <span>
            Your profile has changed since this plan was built
            {view.outdatedReasons.includes('ROLE_CHANGED') && ' — you are aiming at a different role now'}
            {view.outdatedReasons.includes('COMMITMENT_CHANGED') && ' — your available time has changed'}.
            This plan still stands until you rebuild it.
          </span>
          <button className="skp-btn small" disabled={busy} onClick={() => generate(true)}>
            {busy ? 'Rebuilding…' : 'Rebuild my plan'}
          </button>
        </div>
      )}

      {why && (why.gaps.length > 0 || why.unknown > 0) && (
        <div className="skp-why">
          <b>Why this plan?</b>
          <p>
            {why.gaps.length > 0 && (
              <>Your biggest measured gaps for this role are {why.gaps.join(', ')}, so most of
                your time goes there. Skills already at the expected level get little or none. </>
            )}
            {why.unknown > 0 && (
              <>It starts by checking {why.unknown} skill{why.unknown === 1 ? '' : 's'} we have
                not measured — we would rather find out than teach you something you can already do. </>
            )}
            {why.prerequisites.length > 0 && (
              <>{why.prerequisites.join(' and ')} {why.prerequisites.length === 1 ? 'is' : 'are'} scheduled
                first because the rest builds on {why.prerequisites.length === 1 ? 'it' : 'them'}.</>
            )}
          </p>
        </div>
      )}

      {/* THIS WEEK — the reason most members open the page. */}
      <div className="skp-week">
        <div className="wh">
          <b>This week</b>
          <span>Week {view.currentWeek} of {plan.weekCount}</span>
          <em>{mins(thisWeek.reduce((n, o) => n + o.plannedMinutes, 0))} planned</em>
        </div>
        {thisWeek.length
          ? thisWeek.map(o => <Row key={o.sequence} o={o} />)
          : <p className="skp-empty">Nothing scheduled this week — a deliberate gap for catching up.</p>}
      </div>

      {/* The rest of the plan, collapsed. Ninety days expanded at once is a wall. */}
      <div className="skp-phases">
        {plan.phases.map((p, i) => {
          const open = openPhase === p.key;
          const items = plan.objectives.filter(o => o.phase === p.key);
          const current = view.currentWeek >= p.fromWeek && view.currentWeek <= p.toWeek;

          return (
            <div className={`skp-phase${current ? ' now' : ''}`} key={p.key}>
              <button className="ph" onClick={() => setOpenPhase(open ? null : p.key)}>
                <span className="n">{i + 1}</span>
                <span className="tx">
                  <b>{p.title}</b>
                  <em>Days {p.fromDay}–{p.toDay} · {mins(p.plannedMinutes)}</em>
                </span>
                {current && <span className="badge">You are here</span>}
                <span className={`car${open ? ' o' : ''}`}>›</span>
              </button>

              {open && (
                <div className="pb">
                  <p className="bl">{p.blurb}</p>
                  {Array.from(new Set(items.map(o => o.week))).sort((a, b) => a - b).map(w => (
                    <div className="wk" key={w}>
                      <span className="wl">Week {w}</span>
                      {items.filter(o => o.week === w).map(o => <Row key={o.sequence} o={o} />)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Deferred is not ignored — it is what the next plan should pick up first. */}
      {!!plan.deferred.length && (
        <div className="skp-def">
          <b>Not in this plan</b>
          <span>
            Your available time went to higher-priority work first. These come up first next time.
          </span>
          <div className="tags">
            {plan.deferred.map(d => <i key={d.skillKey}>{d.skillName}</i>)}
          </div>
        </div>
      )}

      <p className="skp-foot">
        Planned minutes are budgets for your time, not an estimate of how long mastery takes.
        This plan focuses the hours you have on the gaps we measured for {plan.role.name}.
      </p>
    </div>
  );
};

export default SkillPlan;
