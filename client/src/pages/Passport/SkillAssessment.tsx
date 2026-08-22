import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { SkillAssessment as Paper, SkillAssessmentItem } from '../../api/passportApi';
import {
  AnswerQueue, enqueueAnswer, drainQueue, requeueFailed, hasPending,
} from './answerQueue';
import './skillAssessment.css';

/**
 * Sitting the personalised CareerPilot assessment.
 *
 * THE SERVER OWNS THE PAPER. Every question, its order and its options arrive from Module 6
 * already decided. Nothing here shuffles, filters, re-weights or generates — two students
 * get different papers because the generator gave them different papers, not because this
 * screen did anything.
 *
 * ANSWERS ARE SAVED AS THEY ARE GIVEN. A diagnostic is twenty-odd questions long, and a
 * student who loses it to a refresh does not sit it again — which means no Skill DNA, no
 * readiness and no roadmap for that person, ever. React state and localStorage both fail on
 * the shared lab machine; the server is the only place worth trusting.
 *
 * NO SCORING SIGNALS WHILE THEY WORK. No correct/incorrect, no running total, no per-skill
 * hint. This measures where somebody stands, and telling them how they are doing changes how
 * they answer the rest.
 */

const AUTOSAVE_MS = 900;
/** Longer than the debounce: a failed save is usually a network blip, not a fast typist. */
const RETRY_MS = 4000;

const SkillAssessment: React.FC = () => {
  const nav = useNavigate();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [at, setAt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  /** Seconds left when this stage is timed. null = untimed, which is the default. */
  const [left, setLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState<any>(null);
  const [err, setErr] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'retrying'>('idle');

  const pending = useRef<AnswerQueue>({});
  const timer = useRef<any>(null);

  const keyOf = (i: SkillAssessmentItem) => `${i.sourceType}:${i.sourceId}`;

  const adopt = useCallback((p: Paper) => {
    setPaper(p);
    // Server-computed remaining time, so a reload cannot restart the clock.
    setLeft(typeof p.secondsRemaining === 'number' ? p.secondsRemaining : null);
    const restored: Record<string, any> = {};
    for (const i of p.items) if (i.response !== undefined && i.response !== null) restored[keyOf(i)] = i.response;
    setAnswers(restored);
    // Land on the first unanswered question rather than the top — a resumed paper should
    // continue where it stopped.
    const firstOpen = p.items.findIndex(i => restored[keyOf(i)] === undefined);
    setAt(firstOpen >= 0 ? firstOpen : 0);
  }, []);

  useEffect(() => {
    passportApi.getSkillAssessment()
      .then(r => { if (r.assessment) adopt(r.assessment); })
      .catch(() => { /* falls through to the start screen */ })
      .finally(() => setLoading(false));
  }, [adopt]);

  const start = async () => {
    setStarting(true); setErr('');
    try {
      const r = await passportApi.startSkillAssessment();
      adopt(r.assessment);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not start your assessment.');
    }
    setStarting(false);
  };

  /**
   * Debounced autosave, retry-safe.
   *
   * The batch is drained before the request and handed BACK if it fails, so a save lost to
   * a dropped connection is retried rather than forgotten. Restoring it never overwrites an
   * answer the student changed while the request was in flight — see requeueFailed.
   */
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
      // Re-armed even if the student stops typing, so a temporary outage resolves itself
      // rather than waiting for the next answer to carry the backlog.
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
    () => (paper ? paper.items.filter(i => answers[keyOf(i)] !== undefined && answers[keyOf(i)] !== '').length : 0),
    [paper, answers],
  );

  const submit = async () => {
    if (!paper) return;
    setSubmitting(true); setErr('');
    clearTimeout(timer.current);
    try {
      // Everything on the paper goes up, answered or not — the server grades the whole
      // paper regardless, and a skipped question is a real observation.
      const payload = paper.items.map(i => ({
        sourceType: i.sourceType, sourceId: i.sourceId, response: answers[keyOf(i)],
      }));
      setDone(await passportApi.submitPersonalizedAssessment(payload));
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not submit. Your answers are saved — try again.');
    }
    setSubmitting(false);
    setConfirming(false);
  };

  /**
   * The clock, when a tenant has configured one.
   *
   * MUST sit above every early return: React requires hooks to run in the same order on
   * each render, and this one previously lived after the "finished" branch — so a paper
   * that reached that state changed the hook order and the production build refused to
   * compile. tsc did not catch it; only the lint stage in the real build does.
   *
   * Seeded from the SERVER's remaining time rather than the configured limit, so a reload
   * resumes where the paper actually is — restarting the countdown on refresh would be the
   * obvious way to take an untimed paper. At zero it submits what exists: a paper that ran
   * out of time is finished, and discarding the answers would be worse than scoring them.
   */
  useEffect(() => {
    if (left === null) return;
    if (left <= 0) { submit(); return; }
    const id = setTimeout(() => setLeft(n => (n === null ? null : n - 1)), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  const clock = (sec: number) =>
    `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

  if (loading) return <div className="ska"><div className="ska-load">Loading your assessment…</div></div>;

  // ── finished ──────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="ska">
        <div className="ska-done">
          <i className="bi bi-check-circle-fill" />
          <h1>Assessment complete</h1>
          <p>We’ve used your answers to update your skills profile.</p>

          <div className="ska-figs">
            <div><b>{done.result?.graded ?? 0}</b><span>questions measured</span></div>
            <div><b>{done.skillDna?.skillsAffected ?? 0}</b><span>skills updated</span></div>
          </div>

          {done.skillDnaPending && (
            <div className="ska-note">
              Your answers are safely recorded. Your skills profile is still updating and will
              appear shortly.
            </div>
          )}

          {/* No score, no verdict. What this means for a role is Module 8's answer, on its
              own screen, with coverage and confidence beside it. */}
          <div className="ska-actions">
            <button className="ska-btn primary" onClick={() => nav('/careerpilot/skills')}>View my skills</button>
            <button className="ska-btn" onClick={() => nav('/careerpilot/readiness')}>See role readiness</button>
          </div>
        </div>
      </div>
    );
  }


  // ── not started ───────────────────────────────────────────────────────────
  if (!paper) {
    return (
      <div className="ska">
        <div className="ska-intro">
          <h1>CareerPilot skill assessment</h1>
          <p>
            A short diagnostic built around your target role. It measures where you stand so
            your roadmap can focus on what you actually need — there is no pass mark, and
            skipping a question is fine.
          </p>
          <ul>
            <li>Your answers save as you go, so you can stop and come back.</li>
            <li>You will not see scores while you work.</li>
          </ul>
          {err && <p className="ska-err">{err}</p>}
          <button className="ska-btn primary lg" disabled={starting} onClick={start}>
            {starting ? 'Preparing your paper…' : 'Start assessment'}
          </button>
        </div>
      </div>
    );
  }

  const item = paper.items[at];
  const given = answers[keyOf(item)];
  const pct = Math.round(((at + 1) / paper.items.length) * 100);

  return (
    <div className="ska">
      <div className="ska-hd">
        <div className="t">
          <h1>Skill assessment</h1>
          <span>Question {at + 1} of {paper.items.length}</span>
        </div>
        <span className={`ska-save ${saveState}`}>
          {saveState === 'saving' ? 'Saving…'
            : saveState === 'saved' ? 'Saved'
            /* Said plainly rather than hidden: the answer is safe on screen and will be
               resent, and a silent failure here is how somebody loses a paper. */
            : saveState === 'retrying' ? 'Offline — will retry'
            : ''}
        </span>
      </div>

      {left !== null && (
        <div className={`ska-clock${left <= 60 ? ' low' : ''}`} role="timer" aria-live="off">
          <i className="bi bi-stopwatch" />
          <b>{clock(left)}</b>
          <span>left</span>
        </div>
      )}

      {/* Position in the paper, not performance in it. */}
      <div className="ska-bar"><i style={{ width: `${pct}%` }} /></div>

      <div className="ska-q">
        <p className="qt">{item.text}</p>

        {/* The code the question is about.
            "Which line has the bug?" with nothing to look at is unanswerable, and that is
            exactly how these reached students — the field existed on the item and was
            dropped on the way into the paper. Line numbers are shown because several of
            these questions ask about one. */}
        {item.codeSnippet && (
          <pre className="ska-code" aria-label={item.language ? `${item.language} code` : 'code'}>
            {item.codeSnippet.split(/\r?\n/).map((line, i) => (
              <span className="ln" key={i}><em>{i + 1}</em>{line || ' '}</span>
            ))}
          </pre>
        )}

        {item.options?.length ? (
          <div className="ska-opts">
            {item.options.map(o => {
              // CareerPilot's own bank answers by position; the others answer by id. The
              // server told us which ids to send back, so they are echoed unchanged.
              const value = item.sourceType === 'passport_question' ? Number(o.id) : o.id;
              const selected = Array.isArray(given) ? given.includes(value) : given === value;
              return (
                <button
                  key={o.id}
                  className={`ska-opt${selected ? ' on' : ''}`}
                  onClick={() => answer(item, item.sourceType === 'passport_question' ? value : [value])}
                >
                  <span className="mk" />
                  <span className="tx">{o.text}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="ska-free">
            <textarea
              rows={6}
              placeholder="Type your answer…"
              value={typeof given === 'string' ? given : ''}
              onChange={e => answer(item, e.target.value)}
            />
            <em>Written answers are recorded as evidence but are not marked right or wrong.</em>
          </div>
        )}
      </div>

      <div className="ska-nav">
        <button className="ska-btn" disabled={at === 0} onClick={() => setAt(n => Math.max(0, n - 1))}>
          Previous
        </button>
        {at < paper.items.length - 1 ? (
          <button className="ska-btn primary" onClick={() => setAt(n => n + 1)}>Save &amp; next</button>
        ) : (
          <button className="ska-btn primary" onClick={() => setConfirming(true)}>Review &amp; submit</button>
        )}
      </div>

      {/* A palette, so a student can go back to the two they skipped rather than clicking
          through twenty. Answered and unanswered are distinguished; nothing says correct. */}
      <div className="ska-palette">
        {paper.items.map((q, i) => {
          const has = answers[keyOf(q)] !== undefined && answers[keyOf(q)] !== '';
          return (
            <button
              key={q.sourceId}
              className={`p${has ? ' has' : ''}${i === at ? ' now' : ''}`}
              onClick={() => setAt(i)}
              aria-label={`Question ${i + 1}${has ? ', answered' : ''}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {err && <p className="ska-err">{err}</p>}

      {confirming && (
        <div className="ska-modal" role="dialog">
          <div className="bx">
            <b>Submit your assessment?</b>
            <p>
              {answeredCount} of {paper.items.length} answered
              {answeredCount < paper.items.length && ` · ${paper.items.length - answeredCount} left blank`}.
              You cannot change your answers afterwards.
            </p>
            <div className="ska-actions">
              <button className="ska-btn" onClick={() => setConfirming(false)}>Keep working</button>
              <button className="ska-btn primary" disabled={submitting} onClick={submit}>
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillAssessment;
