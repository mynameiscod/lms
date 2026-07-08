import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { drillApi, DrillProblem, RunResult, DrillProgress, MyAssignment, LANGS } from '../../api/drillApi';

const PURPLE = '#6366f1', TEAL = '#14a89c';

const LogicGym: React.FC = () => {
  const [conceptList, setConceptList] = useState<string[]>([]);
  const [concept, setConcept] = useState('');
  const [difficulty, setDifficulty] = useState('easy');
  const [language, setLanguage] = useState('javascript');
  const [progress, setProgress] = useState<DrillProgress | null>(null);
  const [assignments, setAssignments] = useState<MyAssignment[]>([]);
  const [problem, setProblem] = useState<DrillProblem | null>(null);
  const [loadingP, setLoadingP] = useState(false);
  const [err, setErr] = useState('');

  // stage state
  const [stage, setStage] = useState<'plan' | 'code'>('plan');
  const [plan, setPlan] = useState('');
  const [planMsg, setPlanMsg] = useState<{ ok: boolean; hint: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [code, setCode] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);

  const loadProgress = async () => { try { setProgress(await drillApi.myProgress()); } catch { /* ignore */ } };
  const loadAssignments = async () => { try { setAssignments(await drillApi.myAssignments()); } catch { /* ignore */ } };
  useEffect(() => { drillApi.concepts().then(c => { setConceptList(c); setConcept(c[0] || ''); }); loadProgress(); loadAssignments(); }, []);

  // Start a problem. If `assignment` is passed, it's an admin-assigned problem — the
  // server seeds concept/difficulty/language from it and marks it in-progress.
  const newProblem = async (assignment?: MyAssignment) => {
    const c = assignment?.concept || concept;
    if (!c) return;
    setLoadingP(true); setErr(''); setProblem(null); setResult(null); setPlan(''); setPlanMsg(null); setStage('plan');
    try {
      const p = await drillApi.newProblem(c, assignment?.difficulty || difficulty, assignment?.language || language, assignment?._id);
      setProblem(p); setCode(p.starterCode || '');
      if (assignment) loadAssignments();
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not generate a problem. Try again.'); }
    finally { setLoadingP(false); }
  };

  const checkPlan = async () => {
    if (!problem) return;
    setChecking(true);
    try { const r = await drillApi.checkPlan(problem.attemptId, plan); setPlanMsg(r); if (r.ok) setStage('code'); }
    catch { setPlanMsg({ ok: false, hint: 'Could not check your plan. Try again.' }); } finally { setChecking(false); }
  };

  const runCode = async () => {
    if (!problem) return;
    setRunning(true);
    try { const r = await drillApi.run(problem.attemptId, code); setResult(r); if (r.allPassed) { loadProgress(); loadAssignments(); } }
    catch (e: any) { setResult(null); setErr(e?.response?.data?.message || 'Run failed.'); } finally { setRunning(false); }
  };

  const openAssignments = assignments.filter(a => a.status !== 'completed');

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: 22 }}>
      <h1 style={{ margin: 0, fontSize: 24, color: '#0f172a' }}>Logic Building</h1>
      <p style={{ marginTop: 4, color: '#64748b', fontSize: 13.5 }}>Build problem-solving the right way: plan in plain English first, then code. The AI coaches with hints — never the answer.</p>

      {openAssignments.length > 0 && (
        <div style={{ marginTop: 16, background: '#fff', border: '1px solid #e6e8f0', borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>🧩 Assigned to you</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 10 }}>
            {openAssignments.map(a => (
              <div key={a._id} style={{ border: '1px solid #eef1f6', borderRadius: 12, padding: 12, background: '#f8fafc' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: PURPLE, background: '#eef0fe', borderRadius: 999, padding: '2px 9px' }}>{a.concept}</span>
                  <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' }}>{a.difficulty} · {a.language}</span>
                </div>
                {a.note && <div style={{ fontSize: 12.5, color: '#475569', marginBottom: 6 }}>{a.note}</div>}
                {a.dueDate && <div style={{ fontSize: 11.5, color: '#b45309', fontWeight: 600, marginBottom: 6 }}>Due {new Date(a.dueDate).toLocaleDateString('en-IN', { dateStyle: 'medium' } as any)}</div>}
                <button onClick={() => newProblem(a)} disabled={loadingP} style={{ width: '100%', background: `linear-gradient(90deg,${PURPLE},${TEAL})`, color: '#fff', border: 'none', borderRadius: 9, padding: '9px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  {a.status === 'in_progress' ? 'Continue →' : 'Start →'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {progress && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, margin: '16px 0' }}>
          {[{ ic: '✅', v: String(progress.solvedTotal), l: 'Solved total' }, { ic: '🔥', v: `${progress.streak}d`, l: 'Day streak' }, { ic: '📅', v: String(progress.today), l: 'Solved today' }].map(s => (
            <div key={s.l} style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 14, padding: 14 }}><div style={{ fontSize: 18 }}>{s.ic}</div><div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>{s.v}</div><div style={{ fontSize: 11.5, color: '#94a3b8', fontWeight: 600 }}>{s.l}</div></div>
          ))}
        </div>
      )}

      {/* Picker */}
      <div style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 14, padding: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ flex: 1, minWidth: 180 }}><span style={lbl}>Concept</span><select style={sel} value={concept} onChange={e => setConcept(e.target.value)}>{conceptList.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
        <label><span style={lbl}>Level</span><select style={sel} value={difficulty} onChange={e => setDifficulty(e.target.value)}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
        <label><span style={lbl}>Language</span><select style={sel} value={language} onChange={e => setLanguage(e.target.value)}>{LANGS.map(l => <option key={l.v} value={l.v}>{l.l}</option>)}</select></label>
        <button onClick={() => newProblem()} disabled={loadingP} style={{ background: `linear-gradient(90deg,${PURPLE},${TEAL})`, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>{loadingP ? 'Generating…' : problem ? '↻ New problem' : '✨ Start a problem'}</button>
      </div>
      {err && <div style={{ background: '#fef2f2', color: '#b91c1c', borderRadius: 8, padding: '9px 12px', fontSize: 13, marginTop: 10 }}>{err}</div>}

      {problem && (
        <div style={{ marginTop: 16, background: '#fff', border: '1px solid #e6e8f0', borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: PURPLE, background: '#eef0fe', borderRadius: 999, padding: '2px 10px' }}>{problem.concept}</span>
            <span style={{ fontSize: 11.5, color: '#94a3b8', textTransform: 'capitalize' }}>{problem.difficulty} · {problem.language}</span>
          </div>
          <div style={{ fontSize: 15, color: '#0f172a', lineHeight: 1.55, fontWeight: 500 }}>{problem.prompt}</div>
          {problem.examples?.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12, background: '#f8fafc', border: '1px solid #eef1f6', borderRadius: 10, padding: 12 }}>
              <div><div style={exH}>Example input</div><pre style={pre}>{problem.examples[0].input || '(none)'}</pre></div>
              <div><div style={exH}>Expected output</div><pre style={pre}>{problem.examples[0].expectedOutput}</pre></div>
            </div>
          )}

          {/* Stage bar */}
          <div style={{ display: 'flex', gap: 8, margin: '18px 0 12px' }}>
            <StageChip n={1} label="Plan it (plain English)" active={stage === 'plan'} done={!!planMsg?.ok} />
            <StageChip n={2} label="Code it" active={stage === 'code'} done={!!result?.allPassed} />
          </div>

          {stage === 'plan' ? (
            <div>
              <div style={{ fontSize: 13, color: '#475569', marginBottom: 8 }}>Before coding, write your approach in a few plain-English steps. This is where problem-solving is built.</div>
              <textarea value={plan} onChange={e => setPlan(e.target.value)} placeholder={'1. Read the input\n2. ...\n3. Print the result'} style={{ width: '100%', minHeight: 120, border: '1px solid #cbd5e1', borderRadius: 10, padding: 12, fontSize: 13.5, fontFamily: 'inherit', boxSizing: 'border-box' }} />
              {planMsg && !planMsg.ok && <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: 8, padding: '9px 12px', fontSize: 13, marginTop: 8 }}>💡 {planMsg.hint}</div>}
              {planMsg?.ok && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: 8, padding: '9px 12px', fontSize: 13, marginTop: 8 }}>✅ Good plan — now code it!</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button onClick={checkPlan} disabled={checking} style={btn(PURPLE)}>{checking ? 'Checking…' : '✓ Check my plan'}</button>
                <button onClick={() => setStage('code')} style={{ ...btn('#64748b'), background: '#f1f5f9', color: '#475569', flex: 'none' }}>Skip to code →</button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ border: '1px solid #e6ebf3', borderRadius: 10, overflow: 'hidden' }}>
                <Editor height="300px" theme="light" language={problem.language === 'cpp' ? 'cpp' : problem.language} value={code} onChange={v => setCode(v ?? '')} options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false, tabSize: 2 }} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center' }}>
                <button onClick={runCode} disabled={running} style={{ ...btn(PURPLE), flex: 'none' }}>{running ? '⏳ Running…' : '▶ Run tests'}</button>
                {result && !result.allPassed && <span style={{ fontSize: 13, color: '#b45309', fontWeight: 600 }}>{result.passedCount}/{result.total} tests passing</span>}
                <button onClick={() => setStage('plan')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 12.5, cursor: 'pointer' }}>← back to plan</button>
              </div>

              {result?.allPassed ? (
                <div style={{ marginTop: 14, background: `linear-gradient(120deg,${PURPLE},${TEAL})`, color: '#fff', borderRadius: 12, padding: 18, textAlign: 'center' }}>
                  <div style={{ fontSize: 28 }}>🎉</div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>Solved! Score {result.score}/100</div>
                  <div style={{ fontSize: 13, opacity: .92, marginTop: 4 }}>Great problem-solving. Try another to keep your streak going.</div>
                  <button onClick={() => newProblem()} style={{ marginTop: 12, background: '#fff', color: PURPLE, border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 800, cursor: 'pointer' }}>Next problem →</button>
                </div>
              ) : result && (
                <div style={{ marginTop: 12 }}>
                  {result.compileError && <div style={{ background: '#fef2f2', color: '#b91c1c', borderRadius: 8, padding: '9px 12px', fontSize: 12.5, fontFamily: 'ui-monospace,monospace', marginBottom: 8, whiteSpace: 'pre-wrap' }}>{result.compileError.slice(0, 400)}</div>}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    {result.results.map(r => <span key={r.index} style={{ fontSize: 11.5, fontWeight: 700, borderRadius: 6, padding: '3px 9px', background: r.passed ? '#dcfce7' : '#fee2e2', color: r.passed ? '#15803d' : '#b91c1c' }}>{r.passed ? '✓' : '✕'} {r.hidden ? 'Hidden' : 'Test'} {r.index + 1}</span>)}
                  </div>
                  {result.hint && <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>💡 <b>Hint:</b> {result.hint}</div>}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const StageChip: React.FC<{ n: number; label: string; active: boolean; done: boolean }> = ({ n, label, active, done }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: active ? '#eef0fe' : '#f8fafc', border: `1px solid ${active ? PURPLE : '#e6e8f0'}`, borderRadius: 999, padding: '5px 12px' }}>
    <span style={{ width: 20, height: 20, borderRadius: '50%', background: done ? '#16a34a' : active ? PURPLE : '#cbd5e1', color: '#fff', fontSize: 11, fontWeight: 800, display: 'grid', placeItems: 'center' }}>{done ? '✓' : n}</span>
    <span style={{ fontSize: 12.5, fontWeight: 700, color: active ? PURPLE : '#64748b' }}>{label}</span>
  </div>
);

const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 };
const sel: React.CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 11px', fontSize: 13.5, width: '100%' };
const exH: React.CSSProperties = { fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 };
const pre: React.CSSProperties = { margin: 0, fontFamily: 'ui-monospace,monospace', fontSize: 12.5, color: '#334155', whiteSpace: 'pre-wrap' };
const btn = (bg: string): React.CSSProperties => ({ flex: 1, background: bg, color: '#fff', border: 'none', borderRadius: 10, padding: '11px', fontWeight: 700, fontSize: 14, cursor: 'pointer' });

export default LogicGym;
