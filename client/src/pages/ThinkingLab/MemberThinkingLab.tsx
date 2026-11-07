import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { memberLabApi, TQQuestion, TQReward, TQToday, TQType } from '../../api/thinkingLabApi';
import { useMember } from '../Passport/MemberLayout';
import SectionLock from '../Passport/SectionLock';
import './memberThinkingLab.css';

/**
 * CareerPilot → Thinking Lab, for members.
 *
 * The day's questions from the shared bank (math puzzles, logical and critical thinking, and coding from
 * Year 2 once the basics are done). A member gives a final answer AND explains their thinking; half the
 * day's XP is for the answer and half for the reasoning, checked against the question's key steps. One
 * question a day pays; the rest is practice. The answer and model reasoning appear once a question is
 * finished (right, or out of attempts).
 */

const TYPE: Record<TQType, { label: string; icon: string }> = {
  math: { label: 'Math puzzle', icon: 'bi-calculator' },
  logical: { label: 'Logical thinking', icon: 'bi-puzzle' },
  critical: { label: 'Critical thinking', icon: 'bi-lightbulb' },
  coding: { label: 'Coding', icon: 'bi-code-slash' },
};
const SHORT: Record<TQType, string> = { math: 'Math', logical: 'Logical', critical: 'Critical', coding: 'Coding' };
const STEP_ICON = { covered: 'bi-check-circle-fill', partial: 'bi-dash-circle-fill', missing: 'bi-x-circle' } as const;
const STEP_LABEL = { covered: 'Covered', partial: 'Partly', missing: 'Missing' } as const;
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const MIN_WORDS = 8;
const errOf = (e: any, d: string) => e?.response?.data?.message || d;

const MemberThinkingLab: React.FC = () => {
  const { data: member } = useMember();
  const locked = (member?.locked || []).some((l: any) => l.section === 'thinkingLab');
  const [day, setDay] = useState<TQToday | null>(null);
  const [err, setErr] = useState('');
  const [blocked, setBlocked] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);

  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 4500); };
  const load = useCallback(() => memberLabApi.today()
    .then((d) => { setDay(d); setErr(''); })
    .catch((e) => { if (e?.response?.data?.reason === 'trial_limit') setBlocked(errOf(e, '')); else setErr(errOf(e, 'Could not load today’s questions.')); }), []);
  useEffect(() => { if (!locked) load(); }, [load, locked]);

  const all = useMemo(() => [...(day?.items || []), ...(day?.practice || [])], [day]);
  const open = all.find((q) => q.id === openId) || null;
  const setDone = !!day && day.items.length > 0 && day.items.every((q) => q.state === 'solved' || q.state === 'finished');

  const replace = (q: TQQuestion) => setDay((d) => d && ({ ...d,
    items: d.items.map((x) => (x.id === q.id ? q : x)), practice: d.practice.map((x) => (x.id === q.id ? q : x)),
    done: d.items.map((x) => (x.id === q.id ? q : x)).filter((x) => x.state === 'solved' || x.state === 'finished').length }));

  const onReward = (r: TQReward | null) => {
    if (!r) return;
    const bits = [r.xpNow ? `+${r.xpNow} XP` : r.alreadyPaid ? 'Today’s XP was already earned' : '', `Lab streak ${r.labStreak.current} day${r.labStreak.current === 1 ? '' : 's'}`];
    if (r.labStreak.usedFreezes) bits.push(`${r.labStreak.usedFreezes} freeze${r.labStreak.usedFreezes === 1 ? '' : 's'} saved your streak`);
    if (r.labStreak.earnedFreeze) bits.push('you earned a streak freeze');
    if (r.streakBonus) bits.push(`+${r.streakBonus} XP streak bonus`);
    flash(bits.filter(Boolean).join(' · '));
    memberLabApi.today().then(setDay).catch(() => { /* the card already shows the result */ });
  };

  const practice = async (type?: TQType) => {
    setBusy(true);
    try { const d = await memberLabApi.practice(type); setDay((x) => (x ? { ...d, summary: x.summary, calendar: x.calendar } : x)); setOpenId(d.practice[d.practice.length - 1]?.id || null); }
    catch (e) { flash(errOf(e, 'Could not add a practice question.')); }
    setBusy(false);
  };

  if (locked) return <SectionLock section="thinkingLab" />;
  if (blocked) return <div className="tl2"><div className="tl2-card tl2-state"><i className="bi bi-hourglass-split" /><h2>Your trial’s Thinking Lab questions are used</h2><p>{blocked}</p></div></div>;
  if (err) return <div className="tl2"><div className="tl2-card tl2-state"><i className="bi bi-exclamation-circle" /><h2>Could not load the Thinking Lab</h2><p>{err}</p><button className="tl2-btn primary" onClick={() => { setErr(''); load(); }}>Try again</button></div></div>;
  if (!day) return <div className="tl2"><div className="tl2-card tl2-state"><span className="tl2-spin" /> Loading today’s questions…</div></div>;

  const s = day.summary;
  return (
    <div className="tl2">
      <header className="tl2-hero">
        <div className="tl2-hero-copy">
          <span className="tl2-kicker">Think, then answer</span>
          <h1>Thinking <span>Lab</span></h1>
          <p>{day.perDay === 1 ? 'One question a day' : `${day.perDay} questions a day`}: give your answer and explain how you got there. Half the XP is for the answer, half for your reasoning.</p>
        </div>
        <div className="tl2-tiles">
          <div className={`tl2-tile${s.streakAtRisk ? ' risk' : ''}`}>
            <i className="bi bi-fire" />
            <div><b>{s.streak}<small> day{s.streak === 1 ? '' : 's'}</small></b><span>{s.streakAtRisk ? 'Answer today to keep it' : 'Lab streak'}</span></div>
          </div>
          <div className="tl2-tile">
            <i className="bi bi-snow2" />
            <div><b>{s.freezes}<small> / {s.freezeMax}</small></b><span>{s.freezeEvery ? `Freezes · 1 per ${s.freezeEvery} days` : 'Freezes off'}</span></div>
          </div>
          <div className="tl2-tile">
            <i className="bi bi-check2-circle" />
            <div><b>{day.done}<small> / {day.items.length || day.perDay}</small></b><span>Done today</span></div>
          </div>
          <div className={`tl2-tile${s.paidToday ? ' good' : ''}`}>
            <i className="bi bi-lightning-charge-fill" />
            <div><b>{s.paidToday ? `+${s.paidToday}` : s.dayXp}<small> XP</small></b><span>{s.paidToday ? 'Earned today' : 'Today’s question pays'}</span></div>
          </div>
        </div>
      </header>

      {toast && <div className="tl2-toast" role="status"><i className="bi bi-stars" /> {toast}</div>}

      <div className="tl2-layout">
        <main className="tl2-main">
          {open ? (
            <Solve key={open.id} q={open} practice={day.practice.some((p) => p.id === open.id)} demo={day.demo}
              onBack={() => setOpenId(null)} onUpdate={(q, r) => { replace(q); onReward(r); }}
              onNext={() => { const next = day.items.find((q) => q.id !== open.id && (q.state === 'new' || q.state === 'trying')); setOpenId(next ? next.id : null); }}
              hasNext={day.items.some((q) => q.id !== open.id && (q.state === 'new' || q.state === 'trying'))} />
          ) : <>
            <section className="tl2-card">
              <div className="tl2-card-hd">
                <div><h2>Today’s {day.items.length === 1 ? 'question' : 'questions'}</h2><p>{setDone ? 'All done for today. Come back tomorrow, or practise more below.' : day.demo ? 'Demo: every question of the plan is open.' : 'Your first finished question earns today’s XP and keeps your streak going.'}</p></div>
                <CodingBadge c={day.coding} stage={day.stage} />
              </div>
              {day.bankEmpty
                ? <div className="tl2-empty"><i className="bi bi-inboxes" /><b>No new questions for you right now</b><span>You have answered everything we have for your year. New questions are added regularly.</span></div>
                : <ul className="tl2-list">{day.items.map((q, i) => <QuestionRow key={q.id} q={q} first={i === 0 && !s.paidToday} dayXp={s.dayXp} onOpen={() => setOpenId(q.id)} />)}</ul>}
            </section>

            {day.practice.length > 0 && (
              <section className="tl2-card">
                <div className="tl2-card-hd"><div><h2>Practice</h2><p>Extra questions. No XP, just more thinking.</p></div></div>
                <ul className="tl2-list">{day.practice.map((q) => <QuestionRow key={q.id} q={q} onOpen={() => setOpenId(q.id)} />)}</ul>
              </section>
            )}
          </>}
        </main>

        <aside className="tl2-aside">
          <section className="tl2-card">
            <div className="tl2-card-hd"><div><h2>Your streak</h2><p>Last 5 weeks · best {s.longestStreak} day{s.longestStreak === 1 ? '' : 's'}</p></div></div>
            <div className="tl2-cal" role="img" aria-label={`Thinking Lab days in the last five weeks: ${day.calendar.filter((c) => c.state === 'done').length} done`}>
              {day.calendar.map((c) => <span key={c.date} className={c.state} title={`${new Date(c.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}${c.state === 'done' ? ' · done' : c.state === 'frozen' ? ' · saved by a freeze' : ''}`} />)}
            </div>
            <div className="tl2-legend"><span><i className="done" /> Done</span><span><i className="frozen" /> Freeze used</span><span><i className="none" /> Missed</span></div>
          </section>

          <section className="tl2-card">
            <div className="tl2-card-hd"><div><h2>Practise more</h2><p>{setDone ? 'Pick a kind of question. Practice is for you; it earns no XP.' : 'Opens once today’s questions are done.'}</p></div></div>
            <div className="tl2-practice">
              {(['math', 'logical', 'critical', 'coding'] as TQType[]).filter((t) => t !== 'coding' || day.coding.open).map((t) => (
                <button key={t} className="tl2-btn" title={TYPE[t].label} disabled={!setDone || busy || day.demo} onClick={() => practice(t)}><i className={`bi ${TYPE[t].icon}`} /> {SHORT[t]}</button>
              ))}
            </div>
          </section>

          <section className="tl2-card tl2-howto">
            <h2>How it is scored</h2>
            <ol>
              <li><b>Answer</b> half the XP for the right final answer.</li>
              <li><b>Reasoning</b> half for explaining the key steps. A wrong answer with good reasoning still earns some.</li>
              <li><b>Attempts</b> up to 3 tries a question (5 for coding). The model answer opens when you finish.</li>
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
};

const CodingBadge: React.FC<{ c: TQToday['coding']; stage: string }> = ({ c, stage }) => {
  if (c.open) return <span className="tl2-badge open"><i className="bi bi-unlock-fill" /> Coding open</span>;
  if (c.reason === 'year1' || stage === 'foundation') return <span className="tl2-badge"><i className="bi bi-lock-fill" /> Coding from Year 2</span>;
  return <span className="tl2-badge" title="Coding questions open once you finish the basics topics in your roadmap"><i className="bi bi-lock-fill" /> Coding after basics · {c.basicsDone}/{c.basicsTotal}</span>;
};

const StateTag: React.FC<{ q: TQQuestion }> = ({ q }) => {
  if (q.state === 'solved') return <span className="tl2-tag ok"><i className="bi bi-check-circle-fill" /> Solved</span>;
  if (q.state === 'finished') return <span className="tl2-tag done"><i className="bi bi-flag-fill" /> Finished · {Math.round(q.bestShare * 100)}%</span>;
  if (q.state === 'trying') return <span className="tl2-tag go">Try {q.attemptsUsed + 1} of {q.attemptsAllowed}</span>;
  return <span className="tl2-tag">New</span>;
};

const QuestionRow: React.FC<{ q: TQQuestion; first?: boolean; dayXp?: number; onOpen: () => void }> = ({ q, first, dayXp, onOpen }) => (
  <li>
    <button className={`tl2-q ${q.type}`} onClick={onOpen}>
      <span className="tl2-q-ic"><i className={`bi ${TYPE[q.type].icon}`} /></span>
      <span className="tl2-q-body">
        <span className="tl2-q-meta">{TYPE[q.type].label}{q.subCategory ? ` · ${q.subCategory}` : ''}<em className={`tl2-diff ${q.difficulty}`}>{q.difficulty}</em></span>
        <b>{q.title}</b>
        <span className="tl2-q-foot">
          {q.estimatedMinutes ? <span><i className="bi bi-clock" /> ~{q.estimatedMinutes} min</span> : null}
          {first && dayXp ? <span className="xp"><i className="bi bi-lightning-charge-fill" /> up to {dayXp} XP</span> : null}
          {q.xpEarned > 0 && <span className="xp"><i className="bi bi-lightning-charge-fill" /> +{q.xpEarned} XP earned</span>}
        </span>
      </span>
      <StateTag q={q} />
      <i className="bi bi-chevron-right tl2-q-go" aria-hidden />
    </button>
  </li>
);

const Solve: React.FC<{ q: TQQuestion; practice: boolean; demo: boolean; onBack: () => void; onUpdate: (q: TQQuestion, r: TQReward | null) => void; onNext: () => void; hasNext: boolean }> =
  ({ q, practice, demo, onBack, onUpdate, onNext, hasNext }) => {
    const coding = q.type === 'coding';
    const finished = q.state === 'solved' || q.state === 'finished';
    const [answer, setAnswer] = useState(q.last?.answer || '');
    const [explanation, setExplanation] = useState(q.last?.explanation || '');
    const [code, setCode] = useState(q.last?.code || q.starterCode || '');
    const [hints, setHints] = useState<string[]>(q.hints);
    const [busy, setBusy] = useState('');
    const [err, setErr] = useState('');
    const [run, setRun] = useState<Awaited<ReturnType<typeof memberLabApi.run>> | null>(null);
    const left = q.attemptsAllowed - q.attemptsUsed;
    const wc = words(explanation);

    const submit = async () => {
      if (!coding && !answer.trim()) { setErr('Give your final answer.'); return; }
      if (wc < MIN_WORDS) { setErr(`Explain your thinking in at least ${MIN_WORDS} words: what you noticed, what you worked out, and how you reached the answer.`); return; }
      setBusy('submit'); setErr('');
      try {
        const r = await memberLabApi.answer(q.id, coding ? { code, language: q.language || 'python', explanation } : { answer, explanation });
        onUpdate(r.question, r.reward);
      } catch (e) { setErr(errOf(e, 'Could not check your answer.')); }
      setBusy('');
    };
    const hint = async () => {
      setBusy('hint');
      try { const r = await memberLabApi.hint(q.id); setHints(r.hints); } catch (e) { setErr(errOf(e, 'No more hints.')); }
      setBusy('');
    };
    const runCode = async () => {
      setBusy('run'); setErr('');
      try { setRun(await memberLabApi.run(q.id, code, q.language || 'python')); } catch (e) { setErr(errOf(e, 'Could not run your code.')); }
      setBusy('');
    };

    return (
      <section className="tl2-card tl2-solve">
        <div className="tl2-solve-top">
          <button className="tl2-back" onClick={onBack}><i className="bi bi-arrow-left" /> Today’s questions</button>
          <StateTag q={q} />
        </div>
        <span className="tl2-q-meta">{TYPE[q.type].label}{q.subCategory ? ` · ${q.subCategory}` : ''}<em className={`tl2-diff ${q.difficulty}`}>{q.difficulty}</em>{practice ? <em className="tl2-diff practice">practice</em> : null}</span>
        <h2 className="tl2-title">{q.title}</h2>
        <div className="tl2-statement">{q.statement}</div>
        {q.imageUrl && <img className="tl2-img" src={q.imageUrl} alt="" />}

        {coding && (q.examples.length > 0) && (
          <div className="tl2-examples">{q.examples.map((x, i) => (
            <div key={i} className="tl2-ex"><div><small>Input</small><pre>{x.input || '(none)'}</pre></div><div><small>Output</small><pre>{x.expectedOutput}</pre></div>{x.explanation && <p>{x.explanation}</p>}</div>
          ))}</div>
        )}

        {!!hints.length && <ul className="tl2-hints">{hints.map((h, i) => <li key={i}><i className="bi bi-lightbulb-fill" /> <b>Hint {i + 1}</b> {h}</li>)}</ul>}

        {q.last && (
          <div className={`tl2-result ${q.last.correct ? 'ok' : finished ? 'done' : 'retry'}`}>
            <div className="tl2-result-hd">
              <i className={`bi ${q.last.correct ? 'bi-check-circle-fill' : 'bi-arrow-repeat'}`} />
              <div>
                <b>{q.last.correct ? (coding ? 'All tests passed' : 'Right answer') : coding ? `${q.last.passed ?? 0} of ${q.last.total ?? 0} tests passed` : finished ? 'Not quite. Here is the model answer.' : 'Not quite yet'}</b>
                <span>{coding ? '' : `Reasoning: ${q.last.steps.filter((x) => x.status === 'covered').length} of ${q.last.steps.length} key steps covered${q.last.steps.some((x) => x.status === 'partial') ? `, ${q.last.steps.filter((x) => x.status === 'partial').length} partly` : ''}. `}
                  Score {Math.round(q.last.share * 100)}%{finished ? (q.xpEarned ? ` · +${q.xpEarned} XP` : practice ? ' · practice' : '') : ` · ${left} attempt${left === 1 ? '' : 's'} left`}</span>
              </div>
            </div>
            {!coding && <ul className="tl2-steps">{q.last.steps.map((x, i) => (
              <li key={i} className={x.status}><i className={`bi ${STEP_ICON[x.status]}`} /> <span>{x.step || `Key step ${i + 1}`}</span><em>{STEP_LABEL[x.status]}</em></li>
            ))}</ul>}
            {q.last.feedback && <p className="tl2-feedback">{q.last.feedback}</p>}
          </div>
        )}

        {finished && q.reveal ? (
          <div className="tl2-reveal">
            {q.reveal.answer && <p><b>Answer:</b> {q.reveal.answer}</p>}
            {q.reveal.explanation && <><h3>How to think about it</h3><p className="tl2-pre">{q.reveal.explanation}</p></>}
            {q.reveal.referenceSolution && <><h3>A model solution</h3><pre className="tl2-code ro">{q.reveal.referenceSolution}</pre></>}
            <div className="tl2-actions">
              <button className="tl2-btn" onClick={onBack}>Back to today</button>
              {hasNext && <button className="tl2-btn primary" onClick={onNext}>Next question <i className="bi bi-arrow-right" /></button>}
            </div>
          </div>
        ) : (
          <div className="tl2-form">
            {coding ? <>
              <label className="tl2-lbl">Your code <small>{q.language}</small></label>
              <textarea className="tl2-code" rows={12} spellCheck={false} value={code} onChange={(e) => setCode(e.target.value)} aria-label="Your code" />
              {run && (
                <div className="tl2-run">
                  {run.compileError ? <pre className="bad">{run.compileError}</pre> : run.results.map((r) => (
                    <span key={r.index} className={r.passed ? 'ok' : 'bad'}><i className={`bi ${r.passed ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`} /> Example {r.index + 1}</span>
                  ))}
                  {run.firstFail && <pre className="bad">Input: {run.firstFail.input}{'\n'}Expected: {run.firstFail.expected}{'\n'}Got: {run.firstFail.actual}</pre>}
                </div>
              )}
            </> : q.answerFormat === 'choice' ? (
              <fieldset className="tl2-choices"><legend className="tl2-lbl">Your answer</legend>
                {q.choices.map((c, i) => (
                  <label key={i} className={answer === c ? 'on' : ''}><input type="radio" name={`ans-${q.id}`} checked={answer === c} onChange={() => setAnswer(c)} /><b>{String.fromCharCode(65 + i)}</b><span>{c}</span></label>
                ))}
              </fieldset>
            ) : (
              <label className="tl2-field"><span className="tl2-lbl">Your answer</span>
                <input className="tl2-input" value={answer} inputMode={q.answerFormat === 'number' ? 'decimal' : undefined} maxLength={300}
                  placeholder={q.answerFormat === 'number' ? 'A number' : 'A word or short phrase'} onChange={(e) => setAnswer(e.target.value)} />
              </label>
            )}
            <label className="tl2-field"><span className="tl2-lbl">{coding ? 'Explain your approach' : 'Explain your thinking'} <small className={wc >= MIN_WORDS ? 'ok' : ''}>{wc} / {MIN_WORDS}+ words</small></span>
              <textarea className="tl2-input" rows={5} value={explanation} maxLength={4000} onChange={(e) => setExplanation(e.target.value)}
                placeholder={coding ? 'How does your program work? What does it read, what does it compute, and why?' : 'Step by step: what you noticed, what you worked out, and how it gives the answer.'} />
            </label>
            {err && <div className="tl2-err"><i className="bi bi-exclamation-circle" /> {err}</div>}
            <div className="tl2-actions">
              {q.hintsTotal > hints.length && <button className="tl2-btn" disabled={!!busy} onClick={hint}><i className="bi bi-lightbulb" /> Hint {hints.length + 1} of {q.hintsTotal}</button>}
              {coding && <button className="tl2-btn" disabled={!!busy} onClick={runCode}>{busy === 'run' ? <span className="tl2-spin" /> : <i className="bi bi-play-fill" />} Run examples</button>}
              <button className="tl2-btn primary" disabled={!!busy} onClick={submit}>{busy === 'submit' ? <><span className="tl2-spin" /> Checking…</> : <>Submit {demo ? '' : `· ${left} ${left === 1 ? 'try' : 'tries'} left`}</>}</button>
            </div>
          </div>
        )}
      </section>
    );
  };

export default MemberThinkingLab;
