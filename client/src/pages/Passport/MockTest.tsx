import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import passportApi, { MockAttempt, MockResult } from '../../api/passportApi';
import PassportShell from './PassportShell';
import useExamGuards from '../../hooks/useExamGuards';

/**
 * Sitting a company mock test.
 *
 * Three things drive the design:
 *
 *  - The CLOCK IS THE SERVER'S. endsAt came from the server and this only counts down to
 *    it, so a tab left open, a slow machine or a fiddled system clock cannot buy time.
 *    On reaching zero it submits rather than merely stopping — a test that silently
 *    expires loses the student's work.
 *  - EVERY ANSWER SAVES AS IT IS GIVEN. A refresh, a dropped connection or a flat battery
 *    mid-test should cost nothing, so there is no "save" step to forget.
 *  - GENERATED QUESTIONS SAY SO. A student is entitled to know which items came from what
 *    this company actually asks and which were written for practice.
 */

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s % 60)).padStart(2, '0')}`;

const MockTest: React.FC = () => {
  const { id } = useParams();
  const nav = useNavigate();
  useExamGuards(true);

  const [a, setA] = useState<MockAttempt | null>(null);
  const [result, setResult] = useState<MockResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submitting = useRef(false);

  /** Flattened, because the paper is one continuous run even though it has sections. */
  const flat = useMemo(
    () => (a?.sections || []).flatMap(s => s.questions.map(q => ({ ...q, section: s.name }))),
    [a]);

  useEffect(() => {
    if (!id) return;
    passportApi.getMockTest(id)
      .then(r => {
        setA(r.attempt);
        setResult(r.result);
        setAnswers(Object.fromEntries((r.attempt.answers || []).map(x => [x.questionId, x.chosen])));
      })
      .catch(e => setErr(e?.response?.data?.message || 'Could not load this test'));
  }, [id]);

  const submit = useCallback(async (auto = false) => {
    if (!id || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      const r = await passportApi.submitMockTest(id);
      setResult(r.result);
      setA(prev => (prev ? { ...prev, status: 'submitted' } : prev));
      if (auto) setErr('Time is up — your test was submitted automatically.');
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not submit');
      submitting.current = false;
    }
    setBusy(false);
  }, [id]);

  // Counts down to the server's deadline; submits on reaching it rather than just stopping.
  useEffect(() => {
    if (!a || a.status !== 'in_progress') return;
    const tick = () => {
      const secs = Math.round((new Date(a.endsAt).getTime() - Date.now()) / 1000);
      setLeft(secs);
      if (secs <= 0) submit(true);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [a, submit]);

  const pick = async (qid: string, choice: number) => {
    setAnswers(p => ({ ...p, [qid]: choice }));
    // Fire and forget: the answer is already on screen, and a failed save is recovered by
    // the next one rather than by blocking the student mid-test.
    if (id) passportApi.saveMockAnswer(id, qid, choice).catch(() => { /* retried by the next pick */ });
  };

  if (err && !a) return <PassportShell><div className="pm-msg err">{err}</div></PassportShell>;
  if (!a) return <PassportShell><div className="pm-card">Loading…</div></PassportShell>;

  // ── Result ──
  if (result) {
    return (
      <PassportShell>
        <button className="pm-btn ghost" onClick={() => nav(`/careerpilot/companies/${a.companySlug}`)} style={{ marginBottom: 12 }}>
          ← Back to {a.companyName}
        </button>
        {err && <div className="pm-msg info">{err}</div>}

        <div className={`mt-score ${result.passed ? 'pass' : 'fail'}`}>
          <div className="pct">{result.score}%</div>
          <div className="tx">
            <b>{result.passed ? 'Passed' : 'Not this time'}</b>
            <span>{result.correct} of {result.total} correct · pass mark {result.passingPct}%</span>
          </div>
        </div>

        {result.generatedCount > 0 && (
          <div className="pm-msg info">
            {result.bankedCount} question{result.bankedCount === 1 ? '' : 's'} came from what {a.companyName} has
            actually asked; {result.generatedCount} were written for practice.
          </div>
        )}

        <h3 style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', margin: '18px 0 10px' }}>Review</h3>
        {result.review.map((q, i) => (
          <div className={`mt-rev ${q.right ? 'ok' : 'no'}`} key={q.id}>
            <div className="hd">
              <span className="n">{i + 1}</span>
              <span className="tx">{q.text}</span>
              <span className="mark">{q.right ? '✓' : '✕'}</span>
            </div>
            <div className="opts">
              {q.options.map((o, oi) => (
                <div key={oi} className={`o${oi === q.correctIndex ? ' right' : ''}${oi === q.chosen && oi !== q.correctIndex ? ' wrong' : ''}`}>
                  <b>{String.fromCharCode(65 + oi)}</b> {o}
                  {oi === q.correctIndex && <em>correct</em>}
                  {oi === q.chosen && oi !== q.correctIndex && <em>you chose this</em>}
                </div>
              ))}
              {q.chosen === null && <div className="skipped">You left this one blank.</div>}
            </div>
            {q.explanation && <p className="why">{q.explanation}</p>}
            {q.generated && <span className="gen">practice question</span>}
          </div>
        ))}
      </PassportShell>
    );
  }

  // ── Sitting the test ──
  const q = flat[idx];
  const answered = Object.keys(answers).length;

  return (
    <PassportShell hideNav>
      <div className="mt-bar">
        <div>
          <b>{a.companyName} — Mock Test</b>
          <span>{q?.section} · question {idx + 1} of {flat.length}</span>
        </div>
        <div className={`mt-clock${left < 120 ? ' crit' : ''}`}>⏱ {mmss(left)}</div>
      </div>

      <div className="mt-body">
        <div>
          {q && (
            <div className="mt-q" data-noselect>
              <div className="qh">
                <span className="n">{idx + 1}</span>
                <p>{q.text}</p>
              </div>
              {/* Said plainly. A student should know which items are modelled on what this
                  company asks and which were written to give them practice. */}
              {q.generated && <span className="mt-gen">Practice question — written for this topic, not a recorded question</span>}
              <div className="mt-opts">
                {q.options.map((o, oi) => (
                  <label key={oi} className={`mt-opt${answers[q.id] === oi ? ' on' : ''}`}>
                    <input type="radio" name={q.id} checked={answers[q.id] === oi} onChange={() => pick(q.id, oi)} />
                    <b>{String.fromCharCode(65 + oi)}</b><span>{o}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="mt-acts">
            <button className="pm-btn ghost" disabled={idx === 0} onClick={() => setIdx(i => i - 1)}>← Previous</button>
            <button className="pm-btn ghost" onClick={() => { const n = { ...answers }; delete n[q.id]; setAnswers(n); }}>Clear</button>
            {idx < flat.length - 1
              ? <button className="pm-btn primary" onClick={() => setIdx(i => i + 1)}>Next →</button>
              : <button className="pm-btn teal" disabled={busy} onClick={() => {
                  const blank = flat.length - Object.keys(answers).length;
                  if (blank && !window.confirm(`${blank} question${blank === 1 ? '' : 's'} still blank. Submit anyway?`)) return;
                  submit();
                }}>{busy ? 'Submitting…' : 'Submit test'}</button>}
          </div>
        </div>

        <aside className="mt-side">
          <div className="pm-card">
            <h3 style={{ fontSize: 13.5, fontWeight: 900, margin: '0 0 10px' }}>Questions</h3>
            <div className="mt-grid">
              {flat.map((x, i) => (
                <button key={x.id}
                  className={`mt-n${answers[x.id] !== undefined ? ' done' : ''}${i === idx ? ' cur' : ''}`}
                  onClick={() => setIdx(i)}>{i + 1}</button>
              ))}
            </div>
            <div className="mt-prog">
              <div className="bar"><i style={{ width: `${(answered / (flat.length || 1)) * 100}%` }} /></div>
              <span>{answered} of {flat.length} answered</span>
            </div>
            <button className="pm-btn teal" style={{ width: '100%', marginTop: 12 }} disabled={busy}
              onClick={() => {
                const blank = flat.length - answered;
                if (blank && !window.confirm(`${blank} question${blank === 1 ? '' : 's'} still blank. Submit anyway?`)) return;
                submit();
              }}>Submit test</button>
          </div>
        </aside>
      </div>
    </PassportShell>
  );
};

export default MockTest;
