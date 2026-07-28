import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import passportApi, { PracticeProblem, RunOutcome, SubmitOutcome } from '../../api/passportApi';
import PassportShell from './PassportShell';

const LANG_LABEL: Record<string, string> = {
  python: 'Python', javascript: 'JavaScript', java: 'Java',
};
const KEY = ['A', 'B', 'C', 'D', 'E', 'F'];

/** Solve one Practice Lab item — code editor + Piston runs, or an MCQ set. */
const PracticeItem: React.FC = () => {
  const { id = '' } = useParams();
  const nav = useNavigate();

  const [problem, setProblem] = useState<PracticeProblem | null>(null);
  const [alreadySolved, setAlreadySolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Coding / SQL state
  const [lang, setLang] = useState('python');
  const [code, setCode] = useState('');
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);

  // MCQ state
  const [answers, setAnswers] = useState<number[]>([]);
  const [review, setReview] = useState<SubmitOutcome['review'] | null>(null);

  const [result, setResult] = useState<SubmitOutcome | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await passportApi.getPractice(id);
      setProblem(r.problem);
      setAlreadySolved(r.solved);
      if (r.problem.kind === 'sql') {
        setLang('sql');
        setCode('-- Write your SELECT query here\n');
      } else if (r.problem.kind === 'coding') {
        const first = r.problem.languages?.[0] || 'python';
        setLang(first);
        setCode(r.problem.starter?.[first] || '');
      } else {
        setAnswers(new Array(r.problem.questions.length).fill(-1));
      }
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not load this problem.');
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const switchLang = (l: string) => {
    setLang(l);
    // Only replace the buffer when it's still the untouched starter for the old language.
    const starters = Object.values(problem?.starter || {});
    if (!code.trim() || starters.includes(code)) setCode(problem?.starter?.[l] || '');
  };

  const doRun = async () => {
    if (!problem) return;
    setRunning(true); setErr(''); setResult(null);
    try { setOutcome(await passportApi.runPractice(problem.id, code, lang)); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Run failed.'); }
    setRunning(false);
  };

  const doSubmit = async () => {
    if (!problem) return;
    setSubmitting(true); setErr(''); setOutcome(null);
    try {
      const body = problem.kind === 'mcq' ? { answers } : { code, language: lang };
      const r = await passportApi.submitPractice(problem.id, body);
      setResult(r);
      if (r.review) setReview(r.review);
      if (r.passed) setAlreadySolved(true);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Submit failed.');
    }
    setSubmitting(false);
  };

  const retry = () => { setResult(null); setReview(null); setOutcome(null); setAnswers(new Array(problem?.questions.length || 0).fill(-1)); };

  if (loading) return <PassportShell><div className="pm-loading">Loading problem…</div></PassportShell>;
  if (!problem) return <PassportShell><div className="pm-empty">{err || 'Problem not found.'}</div></PassportShell>;

  const ResultBanner = () => {
    if (!result) return null;
    const good = result.passed;
    return (
      <div className={`pm-msg ${good ? 'ok' : 'err'}`}>
        {good ? '✓ ' : '✕ '}
        {problem.kind === 'mcq'
          ? `You got ${result.correct}/${result.total} correct.`
          : `${result.passedCount ?? 0}/${result.total ?? 0} tests passed.`}
        {result.xpAwarded > 0 && <> <b>+{result.xpAwarded} XP earned!</b></>}
        {result.alreadySolved && <> Already solved earlier — no extra XP.</>}
      </div>
    );
  };

  return (
    <PassportShell meta={alreadySolved ? <span className="pm-pill"><i>✅</i>Solved</span> : undefined}>
      <button className="pm-btn ghost" onClick={() => nav('/passport/practice')} style={{ marginBottom: 10 }}>← Back to Practice Lab</button>

      {problem.kind === 'mcq' ? (
        <>
          <div className="pm-head">
            <h1>{problem.title}</h1>
            <p>{problem.prompt} · +{problem.xp} XP · Pass at 60%.</p>
          </div>

          {(review || problem.questions).map((_, i) => {
            const q = problem.questions[i];
            const rv = review?.[i];
            return (
              <div className="pr-mcq-q" key={i}>
                <div className="qt">{i + 1}. {q.q}</div>
                {q.options.map((opt, oi) => {
                  let cls = 'pr-opt';
                  if (rv) {
                    if (oi === rv.answer) cls += ' correct';
                    else if (oi === rv.chosen) cls += ' wrong';
                  } else if (answers[i] === oi) cls += ' sel';
                  return (
                    <button
                      key={oi} className={cls} disabled={!!rv}
                      onClick={() => setAnswers(a => a.map((v, idx) => (idx === i ? oi : v)))}
                    >
                      <span className="k">{KEY[oi]}</span>{opt}
                    </button>
                  );
                })}
                {rv?.explain && <div className="pr-explain">{rv.correct ? '✓ ' : '💡 '}{rv.explain}</div>}
              </div>
            );
          })}

          <ResultBanner />
          {err && <div className="pm-msg err">{err}</div>}

          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            {!review ? (
              <button className="pm-btn primary" onClick={doSubmit} disabled={submitting || answers.some(a => a < 0)}>
                {submitting ? 'Checking…' : answers.some(a => a < 0) ? `Answer all ${problem.questions.length} questions` : 'Submit answers'}
              </button>
            ) : (
              <>
                <button className="pm-btn" onClick={retry}>Try again</button>
                <button className="pm-btn primary" onClick={() => nav('/passport/practice')}>Back to Practice Lab</button>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="pr-solve">
          <div className="pr-prompt pm-card">
            <h2>{problem.title}</h2>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
              {problem.difficulty} · +{problem.xp} XP · {problem.testCount} tests
            </div>
            <div className="body">{problem.prompt}</div>

            {problem.schemaNote && (
              <>
                <div className="pr-tests" style={{ marginBottom: 0 }}><h4>Schema</h4></div>
                <div className="pr-schema">{problem.schemaNote}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8, lineHeight: 1.6 }}>
                  The tables are already created for you — write only your query. Columns come back separated by <code>|</code>.
                </div>
              </>
            )}

            {!!problem.sampleTests.length && (
              <div className="pr-tests">
                <h4>Sample tests</h4>
                {problem.sampleTests.map((t, i) => (
                  <div className="pr-test" key={i}>
                    {problem.kind !== 'sql' && <><b>Input</b><pre>{t.input || '(none)'}</pre></>}
                    <b>Expected output</b><pre>{t.expected}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pr-editor">
            <div className="pr-editor-bar">
              {problem.kind === 'coding' && (
                <select value={lang} onChange={e => switchLang(e.target.value)}>
                  {(problem.languages || []).map(l => <option key={l} value={l}>{LANG_LABEL[l] || l}</option>)}
                </select>
              )}
              <button className="pm-btn" onClick={doRun} disabled={running || submitting}>{running ? 'Running…' : '▶ Run sample tests'}</button>
              <button className="pm-btn primary" onClick={doSubmit} disabled={running || submitting}>{submitting ? 'Submitting…' : 'Submit'}</button>
            </div>

            <textarea value={code} onChange={e => setCode(e.target.value)} spellCheck={false} placeholder="Write your solution here…" />

            <ResultBanner />
            {err && <div className="pm-msg err">{err}</div>}

            {(outcome || result?.results) && (
              <div className="pr-result">
                {(outcome?.compilationError || result?.compilationError) && (
                  <div className="pr-result-row fail">
                    <span className="ic">✕</span>
                    <div style={{ flex: 1 }}>
                      <b>Compilation error</b>
                      <pre>{outcome?.compilationError || result?.compilationError}</pre>
                    </div>
                  </div>
                )}
                {(outcome?.results || result?.results || []).map(r => (
                  <div className={`pr-result-row ${r.passed ? 'pass' : 'fail'}`} key={r.index}>
                    <span className="ic" style={{ color: r.passed ? '#14a89c' : '#ef4444' }}>{r.passed ? '✓' : '✕'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b>Test {r.index + 1}{r.hidden ? ' (hidden)' : ''} — {r.passed ? 'passed' : 'failed'}</b>
                      {!r.passed && (
                        <>
                          {!r.hidden && <><pre>Input: {r.input || '(none)'}</pre><pre>Expected: {r.expected}</pre></>}
                          <pre>Got: {r.got || '(no output)'}</pre>
                          {r.error && <pre style={{ color: '#b91c1c' }}>{r.error}</pre>}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </PassportShell>
  );
};

export default PracticeItem;
