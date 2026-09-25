import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import passportApi, { SkillAssessment as Paper, SkillAssessmentItem, AssessmentAvailability, PlacementResult } from '../../api/passportApi';
import { AnswerQueue, enqueueAnswer, drainQueue, requeueFailed, hasPending } from './answerQueue';
import { useMember } from './MemberLayout';
import './skillAssessment.css';

const AUTOSAVE_MS = 900;
const RETRY_MS = 4000;

/**
 * The result of a placement check, in days.
 *
 * The count is read from the plan after it was rebuilt, never predicted from the score: "you saved
 * nine days" has to be nine days that actually left it. A check that moved nothing says so plainly,
 * because that is also true and the student can do something with it.
 */
const PlacementDone: React.FC<{ result: PlacementResult; topic: string; onBack: () => void }> = ({ result, topic, onBack }) => {
  const before = result.daysBefore ?? 0;
  const after = result.daysAfter ?? before;
  const saved = Math.max(0, before - after);
  const name = topic || 'this topic';
  const skills = result.skillScores || [];
  const ACRONYM = new Set(['sql', 'db', 'api', 'html', 'css', 'js', 'oop', 'http', 'dsa', 'os', 'ui', 'ai', 'ml']);
  const label = (k: string) => k.toLowerCase().split('_').filter(Boolean)
    .map(w => (ACRONYM.has(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1))).join(' ');

  if (!result.ok) {
    return (
      <main className="ska-wrap skp">
        <section className="skp-card">
          <h1>That check could not be recorded</h1>
          <p>{result.message || 'Please try again from your plan.'}</p>
          <button className="skc-cta" onClick={onBack}>Back to my plan <i className="bi bi-arrow-right" /></button>
        </section>
      </main>
    );
  }

  return (
    <main className="ska-wrap skp">
      <section className="skp-card">
        <span className={`skp-badge${saved ? ' ok' : ''}`}><i className={`bi ${saved ? 'bi-lightning-charge-fill' : 'bi-check-lg'}`} /></span>
        <span className="skp-eyebrow">Placement check · {name}</span>
        {saved > 0 ? <>
          <h1>{saved} {saved === 1 ? 'day' : 'days'} came out of your plan</h1>
          <p>
            {name} had {before} {before === 1 ? 'day' : 'days'} ahead of you; it now has {after}. The lessons you
            proved are gone.{after > 0 ? ' What is left is the practice and building — knowing the answer is not yet the same as having written it.' : ''}
          </p>
        </> : <>
          <h1>Your plan stays as it is</h1>
          <p>
            You scored {result.score ?? 0}%. That is not yet enough to take lessons out, so {name} keeps
            its {before} {before === 1 ? 'day' : 'days'} — and you will meet it knowing where to look.
          </p>
        </>}

        <div className="skp-figs">
          <div><b>{result.score ?? 0}%</b><small>Score</small></div>
          <div><b>{before}<i className="bi bi-arrow-right" />{after}</b><small>Days of {name}</small></div>
          <div><b>{saved}</b><small>Days saved</small></div>
        </div>

        {skills.length > 0 && (
          <ul className="skp-skills">
            {skills.map(k => (
              <li key={k.skillKey}>
                <span>{label(k.skillKey)}</span>
                <i><em style={{ width: `${Math.max(3, k.percentage)}%` }} /></i>
                <b>{k.earned}/{k.max}</b>
              </li>
            ))}
          </ul>
        )}

        <button className="skc-cta" onClick={onBack}>Back to my plan <i className="bi bi-arrow-right" /></button>
      </section>
    </main>
  );
};

const SkillAssessment: React.FC = () => {
  const { reload: reloadMember } = useMember();
  const nav = useNavigate();
  const [params] = useSearchParams();
  /**
   * `?skill=` — a daily plan item asking to confirm ONE skill rather than re-measure the
   * whole role. Carried straight to the start endpoint, which narrows the paper to it.
   */
  const skillKey = params.get('skill') || '';
  /**
   * The key is all the mission carries, so it is humanised here rather than fetched — one
   * request for a label the member reads once would be a poor trade, and SQL_JOINS reads as
   * "Sql Joins" which is close enough to name a button honestly.
   */
  const skillLabel = skillKey
    ? skillKey.toLowerCase().split('_').filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
    : '';
  /**
   * Where a placement check returns to — the day it was offered on. Only a path inside CareerPilot
   * is accepted, so a crafted link cannot send somebody off-site after they submit.
   */
  const rawReturn = params.get('return') || '';
  const returnTo = rawReturn.startsWith('/careerpilot') ? rawReturn : '';
  const topicName = params.get('topic') || '';
  const [scopeNotice, setScopeNotice] = useState('');
  const [paper, setPaper] = useState<Paper | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [at, setAt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [left, setLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState<any>(null);
  const [paying, setPaying] = useState(false);
  const [payMsg, setPayMsg] = useState('');

  /** Membership checkout, matching Mission Control and Interview rather than a second flow. */
  const unlockMembership = async () => {
    setPaying(true); setPayMsg('');
    const res = await passportApi.membershipCheckout();
    setPaying(false);
    if (res.ok) nav('/careerpilot/roadmap');
    else setPayMsg(res.message || 'Payment did not complete.');
  };
  const [err, setErr] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'retrying'>('idle');
  /** Preflight: whether they have already sat one, and whether a real attempt is open. */
  const [avail, setAvail] = useState<AssessmentAvailability | null>(null);

  const pending = useRef<AnswerQueue>({});
  const timer = useRef<any>(null);
  const keyOf = (i: SkillAssessmentItem) => `${i.sourceType}:${i.sourceId}`;

  const adopt = useCallback((p: Paper) => {
    setPaper(p);
    setLeft(typeof p.secondsRemaining === 'number' ? p.secondsRemaining : null);
    const restored: Record<string, any> = {};
    for (const i of p.items) if (i.response !== undefined && i.response !== null) restored[keyOf(i)] = i.response;
    setAnswers(restored);
    const firstOpen = p.items.findIndex(i => restored[keyOf(i)] === undefined);
    setAt(firstOpen >= 0 ? firstOpen : 0);
  }, []);

  useEffect(() => {
    passportApi.getSkillAssessment()
      .then(r => { if (r.assessment) adopt(r.assessment); })
      .catch(() => {})
      .finally(() => setLoading(false));
    // Separate call, deliberately not blocking the paper load: the intro can render while
    // this resolves, and a failure here must not stop a member resuming real work.
    passportApi.getAssessmentAvailability().then(setAvail).catch(() => {});
  }, [adopt]);

  /**
   * When the refusal is something the member CAN act on, offer the way out.
   *
   * Being told "complete your CareerPilot setup before starting the assessment" on a screen
   * with no link to setup is a dead end — the member either knows the URL or gives up. The
   * server names the reason, so the button is chosen from that rather than by matching on
   * the message text, which would break the moment the wording changed.
   *
   * Reasons that are OUR problem (an empty question pool, an unpublished blueprint) get no
   * button, because there is genuinely nothing for them to do about it.
   */
  const [fixHref, setFixHref] = useState('');

  const start = async () => {
    setStarting(true); setErr(''); setFixHref('');
    try {
      const r = await passportApi.startSkillAssessment(skillKey || undefined);
      adopt(r.assessment);
      // An open paper of a different shape was resumed instead. Said plainly, because
      // sitting a full role assessment believing it is a 15-minute check is the exact
      // substitution this change removes.
      setScopeNotice(r.mismatched
        ? 'You already had an assessment in progress, so we have brought you back to it — this is not the single-skill check you opened.'
        : '');
    } catch (e: any) {
      const d = e?.response?.data || {};
      setErr(d.message || 'Could not start your assessment.');
      if (d.reasonCode === 'CONTEXT_INCOMPLETE' || d.reasonCode === 'STAGE_UNKNOWN') {
        setFixHref('/careerpilot/setup');
      }
    }
    setStarting(false);
  };

  const flush = useCallback(async () => {
    const { batch, rest } = drainQueue(pending.current);
    pending.current = rest;
    if (!batch.length) return;
    setSaveState('saving');
    try {
      await passportApi.saveSkillAnswers(batch as any);
      setSaveState(hasPending(pending.current) ? 'saving' : 'saved');
    } catch {
      pending.current = requeueFailed(pending.current, batch);
      setSaveState('retrying');
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, RETRY_MS);
    }
  }, []);

  const queueSave = useCallback((item: SkillAssessmentItem, response: any) => {
    pending.current = enqueueAnswer(pending.current, {
      sourceType: item.sourceType, sourceId: item.sourceId, response,
    });
    setSaveState('saving');
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, AUTOSAVE_MS);
  }, [flush]);

  const answer = (item: SkillAssessmentItem, response: any) => {
    setAnswers(a => ({ ...a, [keyOf(item)]: response }));
    queueSave(item, response);
  };

  const answeredCount = useMemo(
    () => paper ? paper.items.filter(i => answers[keyOf(i)] !== undefined && answers[keyOf(i)] !== '').length : 0,
    [paper, answers],
  );

  const submit = async () => {
    if (!paper) return;
    setSubmitting(true); setErr('');
    clearTimeout(timer.current);
    try {
      const payload = paper.items.map(i => ({
        sourceType: i.sourceType,
        sourceId: i.sourceId,
        response: answers[keyOf(i)],
      }));
      setDone(await passportApi.submitPersonalizedAssessment(payload));
      // The member payload was loaded before this paper existed; without a refresh the home screen goes on saying
      // "start the free assessment" until a full page reload.
      reloadMember();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not submit. Your answers are saved — try again.');
    }
    setSubmitting(false);
    setConfirming(false);
  };

  useEffect(() => {
    if (left === null) return;
    if (left <= 0) { submit(); return; }
    const id = setTimeout(() => setLeft(n => n === null ? null : n - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

  /**
   * THE PAGE CARRIES ITS OWN HEADER.
   *
   * This used to draw no brand at all, on the reasoning that it only ever rendered inside the member shell,
   * which carries the logo. That stopped being true when the assessment became a focused route (see
   * MemberLayout FOCUSED_ROUTES): it now owns the whole window, for members and non-members alike, so without
   * this the screen had no CareerPilot mark anywhere. The header is the logo; while a paper is open it also
   * holds the way out — answers are saved as they are given, so leaving costs nothing.
   */
  const Header = ({ exit }: { exit?: boolean }) => (
    <header className="ska-head">
      <div className="ska-wrap ska-head-in">
        <a className="ska-logo" href="/careerpilot" aria-label="CareerPilot by CodeBegun">
          <img src="/assets/careerpilot/careerpilot-logo.png" alt="CareerPilot by CodeBegun" />
        </a>
        {exit
          ? <button className="ska-exit-btn" onClick={() => nav(returnTo || '/careerpilot')}><i className="bi bi-box-arrow-left" /> Save &amp; exit</button>
          : <span className="ska-safe-pill"><i className="bi bi-shield-check" /> Your answers are private</span>}
      </div>
    </header>
  );

  const Footer = () => (
    <footer className="ska-foot">
      <div className="ska-wrap ska-foot-in">
        <img src="/assets/careerpilot/careerpilot-logo.png" alt="CareerPilot by CodeBegun" />
        <span>© {new Date().getFullYear()} CodeBegun · CareerPilot. All rights reserved.</span>
        <span className="ska-foot-made">Made for ambitious careers in India</span>
      </div>
    </footer>
  );

  if (loading) return <div className="ska-page"><Header /><div className="ska-state"><div className="ska-load">Loading your assessment…</div></div><Footer /></div>;

  if (done?.placementCheck) {
    return <div className="ska-page"><Header /><PlacementDone result={done} topic={topicName} onBack={() => nav(returnTo || '/careerpilot/plan')} /><Footer /></div>;
  }

  if (done) {
    const measured = done.result?.graded ?? 0;
    const skills = done.skillDna?.skillsAffected ?? 0;
    return (
      <div className="ska-page">
        <Header />
        <main className="skc">
          {/* A celebration band in the logo's navy (as on the setup "ready" screen), then the result and the one next step. */}
          <section className="skc-band">
            <div className="ska-wrap skc-band-grid">
              <div>
                <div className="skc-badge"><i className="bi bi-check-lg" /></div>
                <div className="skc-eyebrow">Assessment complete</div>
                <h1>Well done!</h1>
                <p>
                  {done.skillDnaPending
                    ? 'You’ve completed your CareerPilot skill assessment. We’re turning your answers into your personalized Skill DNA and role-readiness insights.'
                    : 'You’ve completed your CareerPilot skill assessment. Your answers have been turned into your personalized Skill DNA — see where you stand, skill by skill.'}
                </p>
                <div className="skc-pills">
                  <span>{measured} questions measured</span>
                  <span>{skills} skills updated</span>
                </div>
              </div>
              <div className="skc-band-art" aria-hidden="true">
                <div className="skc-art-frame"><img src="/assets/careerpilot/careerpilot-hero-student.png" alt="" /></div>
              </div>
            </div>
          </section>

          <section className="ska-wrap skc-body">
            <div className="skc-card">
              <div className="skc-col">
                <h2>Your result</h2>
                <div className="skc-facts">
                  <div className="skc-fact"><span className="skc-fact-ic ok"><i className="bi bi-check-circle" /></span><div><small>Questions measured</small><b>{measured}</b></div></div>
                  <div className="skc-fact"><span className="skc-fact-ic"><i className="bi bi-stars" /></span><div><small>Skills updated</small><b>{skills}</b></div></div>
                  <div className="skc-fact"><span className="skc-fact-ic teal"><i className="bi bi-shield-check" /></span><div><small>Assessment</small><b>Complete</b></div></div>
                </div>
                {/*
                  * WHAT HAPPENS NEXT, TRUTHFULLY.
                  *
                  * This used to say "we're analyzing your responses to prepare your roadmap"
                  * unconditionally — and for a member without the paid entitlement it then did
                  * nothing, forever. Each outcome now says its own true thing.
                  */}
                {!done.skillDnaPending && done.roadmapStatus === 'READY' && (
                  <div className="skc-note ok"><i className="bi bi-check-circle-fill" /><span>Your roadmap has been rebuilt around what this paper measured.</span></div>
                )}
                {!done.skillDnaPending && done.roadmapStatus === 'MEMBERSHIP_REQUIRED' && (
                  <div className="skc-note"><i className="bi bi-stars" /><span>Your Skill DNA is ready and free to view. The full 90-day roadmap is part of membership.</span></div>
                )}
                {!done.skillDnaPending && done.roadmapStatus === 'NOT_ENOUGH_EVIDENCE' && (
                  <div className="skc-note"><i className="bi bi-lightbulb" /><span>Your Skill DNA is ready. We need a target role and a little more evidence before we can build a full roadmap.</span></div>
                )}
                {/* NOT_GENERATED: no plan yet. The next step is the score, not the plan — the Skill DNA page leads on to it. */}
                {!done.skillDnaPending && done.roadmapStatus === 'NOT_GENERATED' && (
                  <div className="skc-note ok"><i className="bi bi-check-circle-fill" /><span>Your Skill DNA is ready. Open it to see your skill scores, strengths and gaps.</span></div>
                )}
                {!done.skillDnaPending && (done.roadmapStatus === 'UNAVAILABLE' || done.roadmapStatus === 'NOT_ATTEMPTED' || !done.roadmapStatus) && (
                  <div className="skc-note"><i className="bi bi-lightbulb" /><span>Your Skill DNA is ready to view.</span></div>
                )}
                {/* Only while something really is still running; skillDnaPending is the flag that knows. */}
                {done.skillDnaPending && (
                  <div className="skc-note"><i className="bi bi-hourglass-split" /><span>Your answers are safely recorded. Your skills profile is still updating and will appear shortly.</span></div>
                )}
              </div>

              <div className="skc-col skc-next">
                <h2>What happens next</h2>
                <ol className="skc-steps">
                  <li className="done"><span><i className="bi bi-check-lg" /></span><div><b>Answer the questions</b><small>Done — {measured} questions measured.</small></div></li>
                  <li className="now"><span>2</span><div><b>See your Skill DNA</b><small>Your skill scores, strengths and gaps.</small></div></li>
                  <li><span>3</span><div><b>Follow your roadmap</b><small>A day-by-day plan built from your Skill DNA.</small></div></li>
                </ol>
                {/*
                  * ONE WAY ONWARD: the score. A member who has just finished a paper is looking at this card, not at
                  * the navigation, and a non-member has no rail at all (MemberLayout), so this button is their exit.
                  * "Build my 90-day plan" was removed on purpose — the plan comes after the member has seen their
                  * score. The roadmap links below stay only where they carry news (a rebuilt plan, a locked one).
                  */}
                <button className="skc-cta" onClick={() => nav('/careerpilot/skills')}>
                  See your Skill DNA <i className="bi bi-arrow-right" />
                </button>
                {done.roadmapStatus === 'READY' && (
                  <button className="skc-ghost" onClick={() => nav('/careerpilot/roadmap')}>View my roadmap</button>
                )}
                {done.roadmapStatus === 'MEMBERSHIP_REQUIRED' && (
                  // The same checkout every other locked surface uses.
                  <button className="skc-ghost" onClick={unlockMembership} disabled={paying}>{paying ? 'Opening…' : 'Unlock my roadmap'}</button>
                )}
                {/* Master's always-there exit to the roadmap (its preview, for a non-member), for the outcomes with no
                    roadmap button of their own. NOT_GENERATED is excluded: its next step is the Skill DNA. */}
                {done.roadmapStatus !== 'READY' && done.roadmapStatus !== 'NOT_GENERATED' && (
                  <button className="skc-ghost" onClick={() => nav('/careerpilot/roadmap')}>See your roadmap</button>
                )}
                {payMsg && <div className="skc-note">{payMsg}</div>}
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  if (!paper) {
    const canStart = !fixHref && (!!skillKey || !(avail?.alreadyCompleted && !avail?.inProgress));
    return (
      <div className="ska-page">
        <Header />
        <main className="ska-v2">
          <div className="ska-wrap ska-v2-grid">
            <section className="ska-v2-copy">
              <span className="ska-eyebrow">KNOW YOUR STRENGTHS</span>
              <h1>CareerPilot<br /><span>Skill Assessment</span></h1>
              <p className="ska-v2-lead">A short diagnostic built around your target role. It measures where you stand so your roadmap can focus on what you actually need — there is no pass mark, and skipping a question is fine.</p>
              <ol className="ska-v2-flow" aria-label="How it works">
                <li className="now"><span>1</span><div><b>Answer the questions</b><small>Picked for your stage and target role.</small></div></li>
                <li><span>2</span><div><b>Get your Skill DNA</b><small>Your strengths and gaps, measured.</small></div></li>
                <li><span>3</span><div><b>Follow your roadmap</b><small>Built from what the assessment found.</small></div></li>
              </ol>
            </section>

            {/* The illustration and the start card share one stage, as on the landing and code pages. */}
            <div className="ska-v2-stage">
              <div className="ska-v2-visual" aria-hidden="true">
                <img src="/assets/careerpilot/careerpilot-hero-student.png" alt="" />
              </div>
              <section className="ska-v2-card" aria-labelledby="ska-v2-card-title">
                <div className="ska-v2-card-head">
                  <span className="ska-v2-card-ic"><i className="bi bi-clipboard2-check" /></span>
                  <div>
                    <small>{skillKey ? 'Skill check' : 'Your assessment'}</small>
                    <h2 id="ska-v2-card-title">{skillKey ? `Check ${skillLabel}` : 'Ready when you are'}</h2>
                  </div>
                </div>
                <ul className="ska-v2-points">
                  <li><span className="tone-teal"><i className="bi bi-cloud-check" /></span><div><b>Your answers save as you go</b><small>You can stop and come back anytime.</small></div></li>
                  <li><span className="tone-blue"><i className="bi bi-eye-slash" /></span><div><b>No scores while you work</b><small>Stay focused without performance pressure.</small></div></li>
                  <li><span className="tone-amber"><i className="bi bi-bullseye" /></span><div><b>Built for your target role</b><small>Your result feeds directly into your roadmap.</small></div></li>
                </ul>
                <div className="ska-estimate"><i className="bi bi-clock" /> Short, focused assessment</div>
                {err && (
                  <div className="ska-err">
                    <p>{err}</p>
                    {fixHref && (
                      <button className="ska-btn primary" onClick={() => nav(fixHref)}>
                        Finish my setup <i className="bi bi-arrow-right" />
                      </button>
                    )}
                  </div>
                )}
                {/*
                  ALREADY DONE IS THE DEFAULT ANSWER, NOT "START AGAIN". A member who has just submitted must not create
                  a phantom second paper with one stray click; a retake is a deliberate Skill check-in. The wall is for
                  the FULL assessment only (`!skillKey`): a named single-skill check from the daily plan is not a stray
                  click, and blocking it dead-ended every ASSESS mission.
                */}
                {!fixHref && !skillKey && avail?.alreadyCompleted && !avail?.inProgress && (
                  <div className="ska-done">
                    <p><i className="bi bi-check-circle-fill" /> You have already completed your skill assessment.</p>
                    <div className="ska-done-actions">
                      <button className="ska-btn primary" onClick={() => nav('/careerpilot/readiness')}>
                        See my results <i className="bi bi-arrow-right" />
                      </button>
                      <button className="ska-btn ghost" onClick={() => nav('/careerpilot/skills')}>View my Skill DNA</button>
                    </div>
                    <small>Want to be re-measured? That happens through a Skill check-in, so your
                      progress is compared rather than overwritten.</small>
                  </div>
                )}
                {canStart && (
                  <button className="ska-v2-start" disabled={starting} onClick={start}>
                    {starting ? 'Preparing your paper…' : (avail?.inProgress ? <>Continue my assessment <i className="bi bi-arrow-right" /></> : skillKey ? <>Check {skillLabel} <i className="bi bi-arrow-right" /></> : <>Start assessment <i className="bi bi-arrow-right" /></>)}
                  </button>
                )}
              </section>
            </div>
          </div>

          <section className="ska-wrap ska-v2-why">
            <h2>Why take the CareerPilot assessment?</h2>
            <div className="ska-v2-why-grid">
              <div><span><i className="bi bi-person-check" /></span><b>Understand your level</b><small>Identify strengths and areas to improve.</small></div>
              <div><span><i className="bi bi-map" /></span><b>Personalised roadmap</b><small>Get a plan that fits your career goals.</small></div>
              <div><span><i className="bi bi-lightning-charge" /></span><b>Focused learning</b><small>Spend time on what truly matters.</small></div>
              <div><span><i className="bi bi-graph-up-arrow" /></span><b>Track progress</b><small>See your growth over time.</small></div>
              <div><span><i className="bi bi-briefcase" /></span><b>Better opportunities</b><small>Build skills that open real doors.</small></div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  const placing = paper.purpose === 'PLACEMENT_CHECK';
  const item = paper.items[at];
  const given = answers[keyOf(item)];
  /**
   * PROGRESS IS WHAT HAS BEEN ANSWERED, NOT WHERE THE CURSOR IS.
   *
   * This was `(at + 1) / items.length` — the position in the paper. So jumping from question one
   * to question ten filled the bar to forty-five per cent without a single answer in between, and
   * a student could reach the end reading every question and be told they were done. A progress
   * bar that moves when nothing has been done is worse than no bar: it is a false receipt.
   */
  const pct = Math.round((answeredCount / paper.items.length) * 100);

  /**
   * Whether THIS question has an answer — which is what the save badge is about.
   *
   * `saveState` is one flag for the whole paper and it is never cleared, so "Answer saved" stayed
   * on screen from the first answer onwards. Arrive at an untouched question and the page was
   * telling the student their answer to it had been saved. It had not; there was no answer.
   */
  const currentKey = paper.items[at] ? keyOf(paper.items[at]) : '';
  const currentAnswered = currentKey !== '' && answers[currentKey] !== undefined && answers[currentKey] !== '';

  return (
    <div className="ska-page">
      <Header exit />
      <main className="ska-assessment-shell">
        <aside className="ska-progress-panel">
          <span className="ska-progress-label">{placing ? 'PLACEMENT CHECK' : 'ASSESSMENT PROGRESS'}</span>
          <div className="ska-progress-copy"><b>Question {at + 1} of {paper.items.length}</b><small>{answeredCount} answered</small></div>
          <div className="ska-ring" style={{ '--pct': `${pct}%` } as React.CSSProperties}><div><b>{pct}%</b><small>Complete</small></div></div>
          <div className="ska-side-line" />
          <div className="ska-status-list">
            {placing ? <>
              <div className="active"><span>1</span><p><b>{topicName ? `Test out of ${topicName}` : 'Test out of a topic'}</b><small>{answeredCount} / {paper.items.length}</small></p></div>
              <div><span><i className="bi bi-map" /></span><p><b>Your plan</b><small>Rebuilt from what you prove</small></p></div>
            </> : <>
              <div className="active"><span>1</span><p><b>Skill Assessment</b><small>{answeredCount} / {paper.items.length}</small></p></div>
              <div><span><i className="bi bi-stars" /></span><p><b>Skill DNA</b><small>After submission</small></p></div>
              <div><span><i className="bi bi-map" /></span><p><b>Roadmap</b><small>Personalized next steps</small></p></div>
            </>}
          </div>
          {left !== null && <div className={`ska-side-time${left <= 60 ? ' low' : ''}`}><i className="bi bi-stopwatch" /><span><b>{clock(left)}</b><small>Time remaining</small></span></div>}
        </aside>

        <section className="ska-question-card">
          <div className="ska-question-top">
            <span>Question {at + 1} of {paper.items.length}</span>
            {/* In flight is worth saying wherever you are; "saved" is only true of a question you answered. */}
            <span className={`ska-save ${saveState}`}>
              {saveState === 'saving' ? 'Saving…'
                : saveState === 'retrying' ? 'Offline — will retry'
                  : saveState === 'saved' && currentAnswered ? 'Answer saved'
                    : ''}
            </span>
          </div>
          <div className="ska-question-progress"><i style={{ width: `${pct}%` }} /></div>
          <h1>{item.text}</h1>
          <p className="ska-helper">Choose the option that best matches your answer. You can come back and change it before submitting.</p>

          {item.codeSnippet && (
            <pre className="ska-code" aria-label={item.language ? `${item.language} code` : 'code'}>
              {item.codeSnippet.split(/\r?\n/).map((line, i) => <span className="ln" key={i}><em>{i + 1}</em>{line || ' '}</span>)}
            </pre>
          )}

          {item.options?.length ? (
            <div className="ska-opts">
              {item.options.map((o, i) => {
                const value = item.sourceType === 'passport_question' ? Number(o.id) : o.id;
                const selected = Array.isArray(given) ? given.includes(value) : given === value;
                return (
                  <button key={o.id} className={`ska-opt${selected ? ' on' : ''}`} onClick={() => answer(item, item.sourceType === 'passport_question' ? value : [value])}>
                    <span className="ska-radio" />
                    <span className="ska-letter">{String.fromCharCode(65 + i)}</span>
                    <span className="ska-option-text">{o.text}</span>
                    {selected && <i className="bi bi-check-circle-fill ska-selected-check" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="ska-free">
              <textarea rows={6} placeholder="Type your answer…" value={typeof given === 'string' ? given : ''} onChange={e => answer(item, e.target.value)} />
              <em>Written answers are recorded as evidence but are not marked right or wrong.</em>
            </div>
          )}

          <div className="ska-nav">
            <button className="ska-btn ghost" disabled={at === 0} onClick={() => setAt(n => Math.max(0, n - 1))}><i className="bi bi-arrow-left" /> Previous</button>
            {at < paper.items.length - 1 ? (
              <button className="ska-btn primary" onClick={() => setAt(n => n + 1)}>Save & next <i className="bi bi-arrow-right" /></button>
            ) : (
              <button className="ska-btn primary" onClick={() => setConfirming(true)}>Review & submit <i className="bi bi-arrow-right" /></button>
            )}
          </div>

          <div className="ska-question-palette">
            {paper.items.map((q, i) => {
              const has = answers[keyOf(q)] !== undefined && answers[keyOf(q)] !== '';
              return <button key={q.sourceId} className={`${has ? 'has ' : ''}${i === at ? 'now' : ''}`} onClick={() => setAt(i)} aria-label={`Question ${i + 1}${has ? ', answered' : ''}`}>{i + 1}</button>;
            })}
          </div>
          {err && <p className="ska-err">{err}</p>}
          {scopeNotice && <p className="ska-notice">{scopeNotice}</p>}
        </section>
      </main>

      <div className="ska-bottom-tip"><i className="bi bi-lightbulb" />{placing
        ? <span><b>Nothing to lose.</b> What you prove comes out of your plan; anything you miss simply stays in it.</span>
        : <span><b>No pass mark, no pressure.</b> Answer honestly so CareerPilot can build the right plan for you.</span>}</div>

      <Footer />

      {confirming && (
        <div className="ska-modal" role="dialog" aria-modal="true">
          <div className="bx">
            <span className="ska-modal-icon"><i className="bi bi-send-check" /></span>
            <b>{placing ? 'Submit your check?' : 'Submit your assessment?'}</b>
            <p>{answeredCount} of {paper.items.length} answered{answeredCount < paper.items.length && ` · ${paper.items.length - answeredCount} left blank`}. You cannot change your answers afterwards.</p>
            <div className="ska-actions">
              <button className="ska-btn ghost" onClick={() => setConfirming(false)}>Keep working</button>
              <button className="ska-btn primary" disabled={submitting} onClick={submit}>{submitting ? (placing ? 'Rebuilding your plan…' : 'Submitting…') : (placing ? 'Submit check' : 'Submit assessment')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillAssessment;
