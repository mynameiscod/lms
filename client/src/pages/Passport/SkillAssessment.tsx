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
   * NO SECOND BRAND BAR.
   *
   * The member shell already carries the CodeBegun logo, the CareerPilot wordmark and the
   * member's own header. This page drew its own copy of all three, so a member who opened a
   * mission met the branding twice, one bar stacked under the other — two logos on one
   * screen, which reads as a page that has been pasted inside another page.
   *
   * It was never dead weight in the logged-out funnel, because there is no logged-out case:
   * the route sits under ProtectedRoute and PassportMemberLayout, so it only ever renders
   * inside the shell.
   *
   * What did earn its place is the way out of a half-finished paper, so that is all that is
   * left, and only while a paper is open. Answers are saved as they are given, so leaving
   * costs the member nothing.
   */
  const ExitBar = () => (
    <div className="ska-topbar ska-topbar-exit">
      <button className="ska-exit" onClick={() => nav('/careerpilot')}>
        <i className="bi bi-box-arrow-left" /> Save & exit
      </button>
    </div>
  );

  if (loading) return <div className="ska-page"><div className="ska-state"><div className="ska-load">Loading your assessment…</div></div></div>;

  if (done) {
    return (
      <div className="ska-page">
        <main className="ska-complete-wrap">
          <section className="ska-complete-card">
            <div className="ska-complete-copy">
              <span className="ska-eyebrow">ASSESSMENT COMPLETE</span>
              <h1>Well done!</h1>
              <p>You’ve completed your CareerPilot skill assessment. We’re turning your answers into your personalized Skill DNA and role-readiness insights.</p>
              <div className="ska-analysis-note"><i className="bi bi-lightbulb" /><span>We’re analyzing your responses to prepare your personalized insights and roadmap.</span></div>
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
            <div className="ska-complete-actions">
              <button className="ska-btn primary wide" onClick={() => nav('/careerpilot/skills')}>View my Skill DNA & roadmap <i className="bi bi-arrow-right" /></button>
              <button className="ska-btn ghost wide" onClick={() => nav('/careerpilot')}>Go to dashboard</button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="ska-page">
        <main className="ska-intro-shell">
          <section className="ska-intro-copy">
            <span className="ska-eyebrow">KNOW YOUR STRENGTHS</span>
            <h1>CareerPilot<br /><span>Skill Assessment</span></h1>
            <p>A short diagnostic built around your target role. It measures where you stand so your roadmap can focus on what you actually need — there is no pass mark, and skipping a question is fine.</p>
            <div className="ska-intro-points">
              <div><span className="tone-teal"><i className="bi bi-check-circle-fill" /></span><p><b>Your answers save as you go</b><small>You can stop and come back anytime.</small></p></div>
              <div><span className="tone-blue"><i className="bi bi-eye-slash" /></span><p><b>No scores while you work</b><small>Stay focused without performance pressure.</small></p></div>
              <div><span className="tone-amber"><i className="bi bi-bullseye" /></span><p><b>Built for your target role</b><small>Your result feeds directly into your roadmap.</small></p></div>
            </div>
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
            {/**
              * ALREADY DONE IS THE DEFAULT ANSWER, NOT "START AGAIN".
              *
              * This offered "Start assessment" to everyone, including a member who had
              * submitted one minutes earlier — with nothing on screen saying they had. One
              * stray click created a second, untouched paper, which then told them
              * "You already have an assessment open. Finish it first." about a paper they
              * had never begun. Seen in production: submitted 20/20 at 08:26, phantom
              * attempt at 08:27.
              *
              * A retake is a real feature — Skill check-in — but it is a deliberate,
              * cooldown-gated act, not the button that happens to be under the cursor.
              */}
            {/*
              THE WALL IS FOR THE FULL ASSESSMENT ONLY — note the `!skillKey`.
              Without it this blocked the single-skill check too, and every ASSESS mission in
              the daily plan is exactly that: "Programming Fundamentals — Check" opened this
              page and was told "you have already completed your skill assessment", with two
              buttons that both lead away. Since every objective in these roadmaps is an
              ASSESS, the entire daily plan dead-ended here.

              The guard below still does its real job: stopping a member who has just
              submitted from creating a phantom second full paper with one stray click. A
              named single-skill check is the opposite of a stray click, and the server has
              supported it all along — it takes skillKey, builds a SKILL_CHECK paper and
              resumes the right one.
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
            {!fixHref && (!!skillKey || !(avail?.alreadyCompleted && !avail?.inProgress)) && (
              <button className="ska-btn primary lg" disabled={starting} onClick={start}>{starting ? 'Preparing your paper…' : (avail?.inProgress ? <>Continue my assessment <i className="bi bi-arrow-right" /></> : skillKey ? <>Check {skillLabel} <i className="bi bi-arrow-right" /></> : <>Start assessment <i className="bi bi-arrow-right" /></>)}</button>
            )}
          </section>

          <section className="ska-intro-art">
            <div className="ska-art-orb" />
            <img src="/assets/careerpilot/careerpilot-hero-student.png" alt="Student taking CareerPilot skill assessment" />
            <div className="ska-floating ska-float-a"><i className="bi bi-bar-chart-line" /><span><small>Skill Readiness</small><b>Discover your level</b></span></div>
            <div className="ska-floating ska-float-b"><i className="bi bi-bullseye" /><span><small>Career Focus</small><b>Targeted assessment</b></span></div>
          </section>
        </main>

        <section className="ska-why">
          <h2>Why take the CareerPilot assessment?</h2>
          <div className="ska-why-grid">
            <div><span><i className="bi bi-person-check" /></span><b>Understand Your Current Level</b><small>Identify strengths and areas to improve.</small></div>
            <div><span><i className="bi bi-map" /></span><b>Personalized Roadmap</b><small>Get a plan that fits your career goals.</small></div>
            <div><span><i className="bi bi-lightning-charge" /></span><b>Focused Learning</b><small>Spend time on what truly matters.</small></div>
            <div><span><i className="bi bi-graph-up-arrow" /></span><b>Track Progress</b><small>See your growth over time.</small></div>
            <div><span><i className="bi bi-briefcase" /></span><b>Better Opportunities</b><small>Build skills that open real doors.</small></div>
          </div>
        </section>
      </div>
    );
  }

  const item = paper.items[at];
  const given = answers[keyOf(item)];
  const pct = Math.round(((at + 1) / paper.items.length) * 100);

  return (
    <div className="ska-page">
      <ExitBar />
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
