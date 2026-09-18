import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import passportApi, { SkillAssessment as Paper, SkillAssessmentItem, AssessmentAvailability } from '../../api/passportApi';
import { AnswerQueue, enqueueAnswer, drainQueue, requeueFailed, hasPending } from './answerQueue';
import './skillAssessment.css';

const AUTOSAVE_MS = 900;
const RETRY_MS = 4000;

const SkillAssessment: React.FC = () => {
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
          ? <button className="ska-exit-btn" onClick={() => nav('/careerpilot')}><i className="bi bi-box-arrow-left" /> Save &amp; exit</button>
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

  if (done) {
    return (
      <div className="ska-page">
        <Header />
        <main className="ska-complete-wrap">
          <section className="ska-complete-card">
            <div className="ska-complete-copy">
              <span className="ska-eyebrow">ASSESSMENT COMPLETE</span>
              <h1>Well done!</h1>
              <p>
                {done.skillDnaPending
                  ? 'You’ve completed your CareerPilot skill assessment. We’re turning your answers into your personalized Skill DNA and role-readiness insights.'
                  : 'You’ve completed your CareerPilot skill assessment. Your answers have been turned into your personalized Skill DNA, and your plan is built around what it measured.'}
              </p>
              {/*
                * WHAT HAPPENS NEXT, TRUTHFULLY.
                *
                * This used to say "we're analyzing your responses to prepare your roadmap"
                * unconditionally — and for a member without the paid entitlement it then did
                * nothing, forever. They had answered sixteen questions and were left on a
                * promise that would never be kept, which reads as a broken product rather
                * than a locked feature, at the exact moment they most want to know what they
                * got. Each outcome now says its own true thing.
                */}
              {!done.skillDnaPending && done.roadmapStatus === 'READY' && (
                <div className="ska-analysis-note ska-note-ready">
                  <i className="bi bi-check-circle-fill" />
                  <span>Your roadmap has been rebuilt around what this paper measured.</span>
                </div>
              )}
              {!done.skillDnaPending && done.roadmapStatus === 'MEMBERSHIP_REQUIRED' && (
                <div className="ska-analysis-note ska-note-locked">
                  <i className="bi bi-stars" />
                  <span>
                    Your Skill DNA is ready and free to view. The full 90-day roadmap is part of
                    membership.
                  </span>
                </div>
              )}
              {!done.skillDnaPending && done.roadmapStatus === 'NOT_ENOUGH_EVIDENCE' && (
                <div className="ska-analysis-note">
                  <i className="bi bi-lightbulb" />
                  <span>
                    Your Skill DNA is ready. We need a target role and a little more evidence
                    before we can build a full roadmap.
                  </span>
                </div>
              )}
              {!done.skillDnaPending && done.roadmapStatus === 'NOT_GENERATED' && (
                /* They have never built a plan, and submitting a paper no longer builds one for
                   them. Not a failure and not a paywall — an invitation, which is what this
                   moment actually is. */
                <div className="ska-analysis-note ska-note-ready">
                  <i className="bi bi-compass" />
                  <span>
                    Your Skill DNA is ready. Build your 90-day plan whenever you are — it starts
                    from exactly what this paper measured.
                  </span>
                </div>
              )}
              {!done.skillDnaPending && (done.roadmapStatus === 'UNAVAILABLE' || done.roadmapStatus === 'NOT_ATTEMPTED' || !done.roadmapStatus) && (
                <div className="ska-analysis-note">
                  <i className="bi bi-lightbulb" />
                  <span>Your Skill DNA is ready to view.</span>
                </div>
              )}
              {/* Only while something really is still running. The figures below say "Complete",
                  so a permanent "we are analyzing" line told the member to sit and wait for a
                  screen that was never coming. skillDnaPending is the flag that knows. */}
              {done.skillDnaPending && (
                <div className="ska-analysis-note"><i className="bi bi-lightbulb" /><span>We’re analyzing your responses to prepare your personalized insights and roadmap.</span></div>
              )}
            </div>
            <div className="ska-complete-art">
              <img src="/assets/careerpilot/careerpilot-hero-student.png" alt="CareerPilot assessment completed" />
              <span className="ska-check-badge"><i className="bi bi-check-lg" /></span>
            </div>
            <div className="ska-figs">
              <div><i className="bi bi-check-circle-fill" /><span><small>Questions measured</small><b>{done.result?.graded ?? 0}</b></span></div>
              <div><i className="bi bi-stars" /><span><small>Skills updated</small><b>{done.skillDna?.skillsAffected ?? 0}</b></span></div>
              <div><i className="bi bi-shield-check" /><span><small>Assessment</small><b>Complete</b></span></div>
            </div>
            {done.skillDnaPending && <div className="ska-note">Your answers are safely recorded. Your skills profile is still updating and will appear shortly.</div>}
            {/*
              A WAY OUT - which this screen did not have for the people who most needed one.

              The buttons were left off on the reasoning that the shell's rail is already on
              screen with Home, My Roadmap and Skill DNA on it. That holds for a member. It does
              NOT hold for anybody else: MemberLayout deliberately renders non-members without
              the rail, because every destination on it is locked to them. So the one person who
              has just finished their assessment and has not paid - the exact moment the product
              asks them to - landed on a page with no rail and no buttons, under a line saying
              their results were still being analyzed. There was no way forward at all, and
              nothing was coming.

              A member keeps the rail and gets these as a shortcut; a non-member gets their only
              exit, and it points at the preview of the plan they have just earned.
            */}
            {/*
              * A way onward, always. The rail does carry these destinations, but a member who
              * has just finished a paper is looking at this card, not at the navigation — and
              * "your Skill DNA is ready" with nothing to press is a dead end dressed as good
              * news. The link goes to the thing they can actually see: their own results.
              */}
            <div className="ska-complete-actions">
              <button className="ska-cta" onClick={() => nav('/careerpilot/skills')}>
                See your Skill DNA <i className="bi bi-arrow-right" />
              </button>
              {done.roadmapStatus === 'READY' && (
                <button className="ska-cta-ghost" onClick={() => nav('/careerpilot/roadmap')}>
                  View my roadmap
                </button>
              )}
              {done.roadmapStatus === 'NOT_GENERATED' && (
                // Straight to the one screen with the Build button on it. The plan is still
                // their press; this only removes the hunt for where to press it.
                <button className="ska-cta-ghost" onClick={() => nav('/careerpilot/roadmap')}>
                  Build my 90-day plan
                </button>
              )}
              {done.roadmapStatus === 'MEMBERSHIP_REQUIRED' && (
                // The same checkout every other locked surface uses, rather than a page of
                // its own — there is no membership route, and inventing one here would give
                // this screen a different upgrade path from the rest of the product.
                <button className="ska-cta-ghost" onClick={unlockMembership} disabled={paying}>
                  {paying ? 'Opening…' : 'Unlock my roadmap'}
                </button>
              )}
              {/* Master's always-there exit to the roadmap (its preview, for a non-member), for every
                  outcome that has no roadmap button of its own above. */}
              {done.roadmapStatus !== 'READY' && done.roadmapStatus !== 'NOT_GENERATED' && (
                <button className="ska-cta-ghost" onClick={() => nav('/careerpilot/roadmap')}>
                  See your roadmap
                </button>
              )}
            </div>
            {payMsg && <div className="ska-note">{payMsg}</div>}
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

  const item = paper.items[at];
  const given = answers[keyOf(item)];
  const pct = Math.round(((at + 1) / paper.items.length) * 100);

  return (
    <div className="ska-page">
      <Header exit />
      <main className="ska-assessment-shell">
        <aside className="ska-progress-panel">
          <span className="ska-progress-label">ASSESSMENT PROGRESS</span>
          <div className="ska-progress-copy"><b>Question {at + 1} of {paper.items.length}</b><small>{answeredCount} answered</small></div>
          <div className="ska-ring" style={{ '--pct': `${pct}%` } as React.CSSProperties}><div><b>{pct}%</b><small>Complete</small></div></div>
          <div className="ska-side-line" />
          <div className="ska-status-list">
            <div className="active"><span>1</span><p><b>Skill Assessment</b><small>{answeredCount} / {paper.items.length}</small></p></div>
            <div><span><i className="bi bi-stars" /></span><p><b>Skill DNA</b><small>After submission</small></p></div>
            <div><span><i className="bi bi-map" /></span><p><b>Roadmap</b><small>Personalized next steps</small></p></div>
          </div>
          {left !== null && <div className={`ska-side-time${left <= 60 ? ' low' : ''}`}><i className="bi bi-stopwatch" /><span><b>{clock(left)}</b><small>Time remaining</small></span></div>}
        </aside>

        <section className="ska-question-card">
          <div className="ska-question-top">
            <span>Question {at + 1} of {paper.items.length}</span>
            <span className={`ska-save ${saveState}`}>{saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Answer saved' : saveState === 'retrying' ? 'Offline — will retry' : ''}</span>
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

      <div className="ska-bottom-tip"><i className="bi bi-lightbulb" /><span><b>No pass mark, no pressure.</b> Answer honestly so CareerPilot can build the right plan for you.</span></div>

      <Footer />

      {confirming && (
        <div className="ska-modal" role="dialog" aria-modal="true">
          <div className="bx">
            <span className="ska-modal-icon"><i className="bi bi-send-check" /></span>
            <b>Submit your assessment?</b>
            <p>{answeredCount} of {paper.items.length} answered{answeredCount < paper.items.length && ` · ${paper.items.length - answeredCount} left blank`}. You cannot change your answers afterwards.</p>
            <div className="ska-actions">
              <button className="ska-btn ghost" onClick={() => setConfirming(false)}>Keep working</button>
              <button className="ska-btn primary" disabled={submitting} onClick={submit}>{submitting ? 'Submitting…' : 'Submit assessment'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillAssessment;
