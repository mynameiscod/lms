import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { assessmentApi, AssessmentItemView, ItemResponse, DIMENSION_LABELS } from '../../api/assessmentApi';
import './assessment.css';

// Code block with line numbers; lines are clickable in debug mode.
const CodeBlock: React.FC<{ code: string; onPick?: (line: number) => void; picked?: number }> = ({ code, onPick, picked }) => {
  const lines = (code || '').replace(/\r\n/g, '\n').split('\n');
  return (
    <div className="as-code">
      {lines.map((l, i) => {
        const n = i + 1;
        if (onPick) {
          return (
            <div key={n} className={`as-line ${picked === n ? 'active' : ''}`} onClick={() => onPick(n)}>
              <span className="num">{n}</span><span>{l || ' '}</span>
            </div>
          );
        }
        return <span key={n} className="as-code-line"><span className="num">{n}</span>{l || ' '}</span>;
      })}
    </div>
  );
};

// Renders a question prompt: plain text, but any ```fenced code``` (or a stray
// markdown fence the AI left in) is pulled out and shown as a real code block.
const QuestionPrompt: React.FC<{ text?: string }> = ({ text }) => {
  if (!text) return null;
  const parts: React.ReactNode[] = [];
  const re = /```(?:[a-zA-Z0-9]+)?[ \t]*\n?([\s\S]*?)```/g;
  let last = 0; let m: RegExpExecArray | null; let key = 0;
  while ((m = re.exec(text)) !== null) {
    const before = text.slice(last, m.index).trim();
    if (before) parts.push(<p key={key++} className="as-qprompt">{before}</p>);
    const code = m[1].trim();
    if (code) parts.push(<CodeBlock key={key++} code={code} />);
    last = m.index + m[0].length;
  }
  const tail = text.slice(last).trim();
  if (tail) parts.push(<p key={key++} className="as-qprompt">{tail}</p>);
  if (!parts.length) parts.push(<p key={0} className="as-qprompt">{text}</p>);
  return <>{parts}</>;
};

const Exam: React.FC = () => {
  const { token = '' } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [items, setItems] = useState<AssessmentItemView[]>([]);
  const [meta, setMeta] = useState<{ title: string; timeLimitMinutes: number }>({ title: '', timeLimitMinutes: 25 });
  const [stage, setStage] = useState(0);
  const [totalStages, setTotalStages] = useState(1);
  const [isLast, setIsLast] = useState(true);
  const [idx, setIdx] = useState(0);
  const [responses, setResponses] = useState<Record<string, ItemResponse>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const flags = useRef<Set<string>>(new Set());
  const itemStart = useRef<number>(Date.now());
  const startedRef = useRef(false);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<{ text: string; err: boolean } | null>(null);
  const [dark, setDark] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [sideView, setSideView] = useState<'question' | 'bookmarks' | 'help'>('question');
  const editorRef = useRef<any>(null);
  const [, force] = useState(0);   // re-render on bookmark toggle

  // Load & compose stage 1. Guarded so React StrictMode's double-invoke (dev)
  // doesn't fire two concurrent /start requests.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        const data = await assessmentApi.start(token);
        setItems(data.items);
        setMeta({ title: data.title, timeLimitMinutes: data.timeLimitMinutes });
        setStage(data.stage ?? 0);
        setTotalStages(data.totalStages ?? 1);
        setIsLast(data.isLast ?? true);
        setTimeLeft((data.timeLimitMinutes || 25) * 60);
      } catch (e: any) {
        setErr(e.message || 'Failed to load the assessment.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const current = items[idx];

  // Submit the current stage → advance to the next (difficulty-adapted) stage,
  // or finalize and go to the result page.
  const advance = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const stagePayload: ItemResponse[] = items.map((it) => responses[it.itemId]).filter(Boolean) as ItemResponse[];
      const data = await assessmentApi.advance(token, stagePayload, Array.from(flags.current));
      if (data.done) { navigate(`/assessment/result/${token}`); return; }
      setItems(data.items || []);
      setStage(data.stage ?? stage + 1);
      setIsLast(data.isLast ?? true);
      setIdx(0);
      itemStart.current = Date.now();
      setSubmitting(false);
    } catch (e: any) {
      setErr(e.message || 'Submission failed.');
      setSubmitting(false);
    }
  }, [items, responses, submitting, token, navigate, stage]);

  // Countdown timer → auto-advance at 0.
  useEffect(() => {
    if (loading || err) return;
    if (timeLeft <= 0) { advance(); return; }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, loading, err, advance]);

  // Anti-cheat: flag tab switches, window blur, and copy attempts; best-effort fullscreen.
  useEffect(() => {
    const onHide = () => { if (document.hidden) flags.current.add('tab_switch'); };
    const onBlur = () => flags.current.add('window_blur');
    const onCopy = () => flags.current.add('copy_attempt');
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('blur', onBlur);
    document.addEventListener('copy', onCopy);
    document.documentElement.requestFullscreen?.().catch(() => { /* gesture may be required */ });
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('copy', onCopy);
    };
  }, []);

  const setResp = (patch: Partial<ItemResponse>) => {
    if (!current) return;
    setResponses((r) => ({ ...r, [current.itemId]: { ...(r[current.itemId] || { itemId: current.itemId }), ...patch, itemId: current.itemId } }));
  };

  const go = (delta: number) => {
    // record time spent on the item being left
    if (current) {
      const spent = Math.round((Date.now() - itemStart.current) / 1000);
      setResponses((r) => ({ ...r, [current.itemId]: { ...(r[current.itemId] || { itemId: current.itemId }), itemId: current.itemId, timeSpentSeconds: (r[current.itemId]?.timeSpentSeconds || 0) + spent } }));
    }
    itemStart.current = Date.now();
    setIdx((i) => Math.max(0, Math.min(items.length - 1, i + delta)));
  };

  // Run the candidate's code (live_code / sql) against the sample input → console.
  const runCode = useCallback(async () => {
    if (!current || running) return;
    const code = responses[current.itemId]?.code ?? current.starterCode ?? '';
    if (!code.trim()) { setOutput({ text: 'Write some code first, then run.', err: true }); return; }
    const stdin = current.sampleTestCases?.[0]?.input || '';
    setRunning(true); setOutput(null);
    try {
      const r = await assessmentApi.runCode(token, current.type === 'sql' ? 'sql' : (current.language || 'java'), code, stdin);
      const text = [r.output || '', r.error || ''].filter(Boolean).join('\n') || '(no output)';
      setOutput({ text, err: !!r.error && !r.output });
    } catch (e: any) {
      setOutput({ text: e.message || 'Run failed. Please try again.', err: true });
    } finally { setRunning(false); }
  }, [current, responses, running, token]);

  const resetCode = () => { if (current) setResp({ code: current.starterCode ?? '' }); setOutput(null); };
  const formatCode = () => { try { editorRef.current?.getAction?.('editor.action.formatDocument')?.run?.(); } catch { /* noop */ } };
  const toggleBookmark = () => {
    if (!current) return;
    if (flags.current.has(`bm:${current.itemId}`)) flags.current.delete(`bm:${current.itemId}`);
    else flags.current.add(`bm:${current.itemId}`);
    force((n) => n + 1);
  };
  const exit = () => { if (window.confirm('Exit the assessment? Your progress on this stage will be lost.')) navigate('/'); };

  const mmss = useMemo(() => {
    const m = Math.floor(timeLeft / 60), s = timeLeft % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }, [timeLeft]);

  if (loading) return <div className="as-root"><div className="as-loading"><div className="as-spinner" /></div></div>;
  if (err) return <div className="as-root"><div className="as-wrap"><div className="as-card as-center"><div className="as-err">{err}</div></div></div></div>;

  const resp = responses[current.itemId] || { itemId: current.itemId };
  const answered = Object.keys(responses).filter((k) => {
    const r = responses[k];
    return r.selectedOptionIds?.length || r.predictedOutput || r.identifiedLine || r.code || (r.blankAnswers && Object.keys(r.blankAnswers).length);
  }).length;

  const isCoding = current.type === 'live_code' || current.type === 'sql';
  const codeVal = resp.code ?? current.starterCode ?? '';
  const progressPct = items.length ? Math.round((answered / items.length) * 100) : 0;
  const langExt = current.language === 'python' ? 'py' : current.language === 'javascript' ? 'js' : current.language === 'cpp' ? 'cpp' : current.type === 'sql' ? 'sql' : (current.language || 'java');
  const fileName = `Code.${langExt}`;
  const bookmarked = flags.current.has(`bm:${current.itemId}`);
  const bmList = items.map((it, i) => ({ it, i })).filter(({ it }) => flags.current.has(`bm:${it.itemId}`));

  const questionBody = (
    <>
      <QuestionPrompt text={current.prompt} />
      {current.type === 'mcq' && current.codeSnippet && <CodeBlock code={current.codeSnippet} />}
      {current.type === 'mcq' && current.options && (
        <div className="as-opts" style={{ marginTop: 12 }}>
          {current.options.map((o) => {
            const active = (resp.selectedOptionIds || []).includes(o.id);
            return (
              <div key={o.id} className={`as-opt ${active ? 'active' : ''}`} onClick={() => setResp({ selectedOptionIds: [o.id] })}>
                <span className="key">{o.id.toUpperCase()}</span><span>{o.text}</span>
              </div>
            );
          })}
        </div>
      )}
      {current.type === 'predict_output' && (
        <>
          {current.codeSnippet && <CodeBlock code={current.codeSnippet} />}
          <div className="as-field" style={{ marginTop: 12 }}>
            <label>Your predicted output</label>
            <textarea className="as-input" rows={3} value={resp.predictedOutput || ''} onChange={(e) => setResp({ predictedOutput: e.target.value })} placeholder="Type exactly what the code prints" />
          </div>
        </>
      )}
      {current.type === 'debug' && current.codeSnippet && (
        <>
          <div className="as-note" style={{ marginBottom: 8 }}>Tap the line that contains the bug.</div>
          <CodeBlock code={current.codeSnippet} picked={resp.identifiedLine} onPick={(line) => setResp({ identifiedLine: line })} />
        </>
      )}
      {current.type === 'complete_code' && (
        <>
          {current.codeSnippet && <CodeBlock code={current.codeSnippet} />}
          {(current.blanks || []).map((b, i) => (
            <div className="as-field" key={b.id} style={{ marginTop: 12 }}>
              <label>Blank {i + 1}</label>
              <input className="as-input" value={(resp.blankAnswers || {})[b.id] || ''} onChange={(e) => setResp({ blankAnswers: { ...(resp.blankAnswers || {}), [b.id]: e.target.value } })} placeholder="Your answer" />
            </div>
          ))}
        </>
      )}
    </>
  );

  return (
    <div className="ex-shell">
      <style>{`
        .ex-shell{min-height:100vh;background:#f4f6fb;color:#1f2937;display:flex;flex-direction:column;font-family:inherit;}
        .ex-top{display:flex;align-items:center;gap:16px;background:#fff;border-bottom:1px solid #e6ebf3;padding:10px 18px;}
        .ex-brand{display:flex;align-items:center;gap:9px;font-size:16px;color:#0f2350;}
        .ex-brand .tx b{font-weight:800;font-size:16px;line-height:1;}
        .ex-brand .tx small{display:block;font-size:9.5px;color:#94a3b8;font-weight:600;}
        .ex-mk{width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,#2563eb,#14a89c);}
        .ex-stagewrap{display:flex;align-items:center;gap:14px;flex:1;justify-content:center;flex-wrap:wrap;}
        .ex-stagelbl{font-size:12.5px;color:#475569;font-weight:600;white-space:nowrap;}
        .ex-steps{display:flex;align-items:center;}
        .ex-step{width:28px;height:28px;border-radius:50%;border:1.5px solid #dbe3f0;background:#fff;color:#94a3b8;font-size:12px;font-weight:700;cursor:pointer;}
        .ex-step.on{background:#2563eb;border-color:#2563eb;color:#fff;}
        .ex-step.done{border-color:#2563eb;color:#2563eb;}
        .ex-stepline{width:20px;height:2px;background:#e2e8f0;}
        .ex-topr{display:flex;align-items:center;gap:10px;}
        .ex-timer{background:#eff4ff;color:#2563eb;font-weight:800;border-radius:9px;padding:6px 12px;font-size:13.5px;font-variant-numeric:tabular-nums;}
        .ex-timer.low{background:#fef2f2;color:#dc2626;}
        .ex-icon,.ex-exit{background:#fff;border:1px solid #e2e8f0;border-radius:9px;padding:6px 12px;font-size:13px;font-weight:600;color:#475569;cursor:pointer;}
        .ex-body{display:grid;grid-template-columns:200px 1fr;flex:1;min-height:0;}
        .ex-side{background:#fff;border-right:1px solid #e6ebf3;padding:16px 12px;display:flex;flex-direction:column;gap:5px;}
        .ex-navi{display:flex;align-items:center;gap:9px;background:none;border:none;border-radius:10px;padding:10px 12px;font-size:13.5px;font-weight:600;color:#475569;cursor:pointer;text-align:left;}
        .ex-navi.on{background:#eef4ff;color:#2563eb;}
        .ex-badge{margin-left:auto;background:#2563eb;color:#fff;border-radius:6px;font-size:11px;padding:1px 7px;font-weight:700;}
        .ex-prog{text-align:center;padding:14px 0;}
        .ex-ring{width:84px;height:84px;border-radius:50%;margin:0 auto;display:grid;place-items:center;}
        .ex-ring-in{width:64px;height:64px;border-radius:50%;background:#fff;display:grid;place-items:center;font-weight:800;font-size:16px;color:#2563eb;}
        .ex-prog-lbl{font-size:11.5px;color:#94a3b8;margin-top:8px;font-weight:600;}
        .ex-user{margin-top:auto;display:flex;align-items:center;gap:9px;border-top:1px solid #eef1f6;padding-top:12px;}
        .ex-ava{width:34px;height:34px;border-radius:50%;background:#eef4ff;display:grid;place-items:center;font-size:16px;}
        .ex-uname{font-size:13px;font-weight:700;}.ex-uplan{font-size:11px;color:#94a3b8;}
        .ex-main{padding:18px 20px;overflow:auto;min-width:0;display:flex;flex-direction:column;}
        .ex-code-grid{display:grid;grid-template-columns:1fr 372px;gap:16px;align-items:start;}
        .ex-ed-col{display:flex;flex-direction:column;gap:10px;min-width:0;}
        .ex-ed-head{display:flex;align-items:center;justify-content:space-between;background:#fff;border:1px solid #e6ebf3;border-radius:12px 12px 0 0;padding:10px 14px;font-size:13px;font-weight:700;}
        .ex-lang{background:#f1f5f9;border-radius:7px;padding:3px 10px;font-size:12px;color:#475569;text-transform:capitalize;}
        .ex-editor{border:1px solid #e6ebf3;border-top:none;overflow:hidden;}
        .ex-ed-status{font-size:11.5px;color:#94a3b8;border:1px solid #e6ebf3;border-top:none;border-radius:0 0 12px 12px;padding:6px 14px;background:#fafbfe;display:flex;gap:12px;}
        .ex-saved{color:#16a34a;font-weight:700;margin-left:auto;}
        .ex-ed-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
        .ex-ed-actions button{border:1px solid #e2e8f0;background:#fff;border-radius:9px;padding:8px 14px;font-size:13px;font-weight:600;color:#475569;cursor:pointer;}
        .ex-ed-actions .run{background:#2563eb;color:#fff;border-color:#2563eb;}
        .ex-ed-actions .run:disabled{opacity:.7;}
        .ex-ed-actions .ghost{margin-left:auto;border:none;color:#2563eb;background:none;}
        .ex-console{border:1px solid #e6ebf3;border-radius:12px;overflow:hidden;background:#fff;}
        .ex-console-head{display:flex;justify-content:space-between;align-items:center;padding:9px 14px;font-size:12.5px;font-weight:700;border-bottom:1px solid #eef1f6;}
        .ex-console-head button{background:none;border:none;color:#94a3b8;font-size:12px;cursor:pointer;}
        .ex-console-body{margin:0;padding:14px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;color:#334155;white-space:pre-wrap;min-height:76px;max-height:200px;overflow:auto;}
        .ex-console-body.err{color:#b91c1c;}
        .ex-console-body.ph{color:#b6c1d6;}
        .ex-prob-col{background:#fff;border:1px solid #e6ebf3;border-radius:12px;padding:18px;overflow:auto;}
        .ex-prob-head{display:flex;align-items:center;gap:8px;margin-bottom:12px;}
        .ex-tag{font-size:11px;font-weight:800;border-radius:7px;padding:3px 9px;}
        .ex-tag.dsa{background:#eef4ff;color:#2563eb;}
        .ex-tag.live{background:#e7f7ef;color:#16a34a;}
        .ex-tag.bonus{background:#fef3c7;color:#b45309;}
        .ex-bm{margin-left:auto;background:none;border:none;font-size:16px;cursor:pointer;}
        .ex-prob-body{font-size:13.5px;line-height:1.6;color:#334155;}
        .ex-prob-body .as-qprompt{margin:0 0 10px;}
        .ex-example{background:#f8fafc;border:1px solid #eef1f6;border-radius:10px;padding:12px;margin-top:14px;}
        .ex-example-h{font-size:12.5px;font-weight:700;margin-bottom:8px;}
        .ex-example-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
        .ex-io-h{font-size:11px;color:#94a3b8;font-weight:700;margin-bottom:4px;}
        .ex-example pre{margin:0;font-family:ui-monospace,monospace;font-size:12px;color:#be185d;white-space:pre-wrap;}
        .ex-files{margin-top:14px;}
        .ex-files-h{font-size:12.5px;font-weight:700;margin-bottom:8px;}
        .ex-file-row{display:flex;align-items:center;gap:8px;font-size:12.5px;color:#475569;border:1px solid #eef1f6;border-radius:8px;padding:9px 12px;}
        .ex-card{background:#fff;border:1px solid #e6ebf3;border-radius:14px;padding:22px;max-width:840px;}
        .ex-qtags{display:flex;align-items:center;gap:8px;margin-bottom:14px;}
        .ex-foot{display:flex;align-items:center;gap:12px;margin-top:16px;background:#fff;border:1px solid #e6ebf3;border-radius:12px;padding:12px 16px;flex-wrap:wrap;}
        .ex-fbtn{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:11px 16px;font-size:13.5px;font-weight:600;color:#475569;cursor:pointer;}
        .ex-fbtn:disabled{opacity:.5;cursor:default;}
        .ex-submit{margin-left:auto;background:#2563eb;color:#fff;border:none;border-radius:10px;padding:12px 22px;font-size:14px;font-weight:800;cursor:pointer;}
        .ex-submit:disabled{opacity:.7;}
        .ex-err{color:#b91c1c;background:#fef2f2;border-radius:10px;padding:10px 14px;margin-top:12px;font-size:13px;}
        @media(max-width:1024px){.ex-code-grid{grid-template-columns:1fr;}.ex-body{grid-template-columns:1fr;}.ex-side{flex-direction:row;flex-wrap:wrap;align-items:center;gap:8px;}.ex-user{margin:0 0 0 auto;border:none;padding:0;}.ex-prog{padding:0;}.ex-ring{width:48px;height:48px;}.ex-ring-in{width:36px;height:36px;font-size:11px;}.ex-prog-lbl{display:none;}}
      `}</style>

      {/* Top bar */}
      <div className="ex-top">
        <div className="ex-brand"><span className="ex-mk" /><span className="tx"><b>CareerPilot</b><small>Developer Readiness</small></span></div>
        <div className="ex-stagewrap">
          <div className="ex-stagelbl">Stage {stage + 1}/{totalStages} · Question {idx + 1} of {items.length}</div>
          <div className="ex-steps">
            {items.map((_, i) => (
              <React.Fragment key={i}>
                <button className={`ex-step ${i === idx ? 'on' : i < idx ? 'done' : ''}`} onClick={() => { if (i !== idx) go(i - idx); }}>{i + 1}</button>
                {i < items.length - 1 && <span className="ex-stepline" />}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="ex-topr">
          <div className={`ex-timer ${timeLeft < 60 ? 'low' : ''}`}>⏱ {mmss}</div>
          <button className="ex-icon" onClick={() => setDark((d) => !d)} title="Toggle editor theme">{dark ? '🌙' : '☀️'}</button>
          <button className="ex-exit" onClick={exit}>⎋ Exit</button>
        </div>
      </div>

      {/* Body */}
      <div className="ex-body">
        <aside className="ex-side">
          <button className={`ex-navi ${sideView === 'question' ? 'on' : ''}`} onClick={() => setSideView('question')}>📝 Question <span className="ex-badge">{idx + 1}</span></button>
          <div className="ex-prog">
            <div className="ex-ring" style={{ background: `conic-gradient(#2563eb ${progressPct}%, #e6ebf5 ${progressPct}% 100%)` }}><div className="ex-ring-in">{progressPct}%</div></div>
            <div className="ex-prog-lbl">{answered} / {items.length} Completed</div>
          </div>
          <button className={`ex-navi ${sideView === 'bookmarks' ? 'on' : ''}`} onClick={() => setSideView('bookmarks')}>🔖 Bookmarks {bmList.length > 0 && <span className="ex-badge">{bmList.length}</span>}</button>
          <button className={`ex-navi ${sideView === 'help' ? 'on' : ''}`} onClick={() => setSideView('help')}>❓ Help</button>
          <div className="ex-user"><span className="ex-ava">🧑‍💻</span><div><div className="ex-uname">Candidate</div><div className="ex-uplan">Assessment</div></div></div>
        </aside>

        <main className="ex-main">
          {sideView === 'help' ? (
            <div className="ex-card">
              <h3 style={{ marginTop: 0 }}>How this works</h3>
              <ul style={{ fontSize: 14, lineHeight: 1.7, color: '#475569' }}>
                <li>Answer each question, then move with the stepper or <b>Next</b>.</li>
                <li>For coding questions, write your solution and press <b>Run Code</b> to test it against the sample input before submitting.</li>
                <li>Your work saves automatically. The <b>timer</b> auto-submits the stage when it hits 0:00.</li>
                <li>Use <b>🔖 Bookmark</b> to flag a question to revisit.</li>
                <li>Avoid switching tabs or copying — these are flagged for integrity.</li>
              </ul>
              <button className="ex-fbtn" onClick={() => setSideView('question')}>← Back to question</button>
            </div>
          ) : sideView === 'bookmarks' ? (
            <div className="ex-card">
              <h3 style={{ marginTop: 0 }}>Bookmarked questions</h3>
              {bmList.length === 0 ? <p style={{ color: '#94a3b8', fontSize: 14 }}>No bookmarks yet. Use the 🔖 icon on a question to flag it.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {bmList.map(({ it, i }) => (
                    <button key={it.itemId} className="ex-fbtn" style={{ textAlign: 'left' }} onClick={() => { go(i - idx); setSideView('question'); }}>Q{i + 1} · {(DIMENSION_LABELS[it.dimension] || it.dimension)} — {it.type.replace('_', ' ')}</button>
                  ))}
                </div>
              )}
              <button className="ex-fbtn" style={{ marginTop: 12 }} onClick={() => setSideView('question')}>← Back to question</button>
            </div>
          ) : isCoding ? (
            <div className="ex-code-grid">
              {/* Editor column */}
              <div className="ex-ed-col">
                <div className="ex-ed-head"><span>📄 {fileName}</span><span className="ex-lang">{current.language || (current.type === 'sql' ? 'sql' : 'java')}</span></div>
                <div className="ex-editor">
                  <Editor
                    height={expanded ? '520px' : '300px'}
                    theme={dark ? 'vs-dark' : 'light'}
                    language={current.type === 'sql' ? 'sql' : (current.language || 'java')}
                    value={codeVal}
                    onChange={(v) => setResp({ code: v ?? '' })}
                    onMount={(ed) => { editorRef.current = ed; }}
                    options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false, lineNumbers: 'on', tabSize: 4 }}
                  />
                </div>
                <div className="ex-ed-status"><span>Spaces: 4</span><span style={{ textTransform: 'capitalize' }}>{current.language || 'Java'}</span><span className="ex-saved">● Saved</span></div>
                <div className="ex-ed-actions">
                  <button onClick={formatCode}>{'{ }'} Format Code</button>
                  <button className="run" onClick={runCode} disabled={running}>{running ? '⏳ Running…' : '▶ Run Code'}</button>
                  <button onClick={resetCode}>⟳ Reset</button>
                  <button className="ghost" onClick={() => setExpanded((e) => !e)}>⤢ {expanded ? 'Collapse' : 'Expand'} Editor</button>
                </div>
                <div className="ex-console">
                  <div className="ex-console-head"><span>Your Output (Console)</span>{output && <button onClick={() => setOutput(null)}>🗑 Clear</button>}</div>
                  <pre className={`ex-console-body ${output ? (output.err ? 'err' : '') : 'ph'}`}>{output ? output.text : 'Run your code to see output here…'}</pre>
                </div>
              </div>

              {/* Problem column */}
              <div className="ex-prob-col">
                <div className="ex-prob-head">
                  <span className="ex-tag dsa">{DIMENSION_LABELS[current.dimension] || current.dimension}</span>
                  <span className="ex-tag live">LIVE CODE</span>
                  <button className="ex-bm" onClick={toggleBookmark} title="Bookmark">{bookmarked ? '🔖' : '🏷️'}</button>
                </div>
                <div className="ex-prob-body"><QuestionPrompt text={current.prompt} /></div>
                {current.sampleTestCases && current.sampleTestCases.length > 0 && (
                  <div className="ex-example">
                    <div className="ex-example-h">Example</div>
                    <div className="ex-example-grid">
                      <div><div className="ex-io-h">Input</div><pre>{current.sampleTestCases[0].input}</pre></div>
                      <div><div className="ex-io-h">Output</div><pre>{current.sampleTestCases[0].expectedOutput}</pre></div>
                    </div>
                  </div>
                )}
                {current.starterCode && (
                  <div className="ex-files">
                    <div className="ex-files-h">Starter Code Files</div>
                    <div className="ex-file-row"><span>📄 {fileName}</span></div>
                  </div>
                )}
                {current.optional && <div className="ex-example" style={{ background: '#fffbeb', borderColor: '#fde68a', color: '#92400e', fontSize: 12.5 }}>★ Optional bonus — boost your score. You can skip and come back to it.</div>}
              </div>
            </div>
          ) : (
            <div className="ex-card">
              <div className="ex-qtags">
                <span className="ex-tag dsa">{DIMENSION_LABELS[current.dimension] || current.dimension}</span>
                <span className="ex-tag" style={{ background: '#f1f5f9', color: '#475569', textTransform: 'capitalize' }}>{current.type.replace('_', ' ')}</span>
                {current.optional && <span className="ex-tag bonus">★ Bonus</span>}
                <button className="ex-bm" onClick={toggleBookmark} style={{ marginLeft: 'auto' }} title="Bookmark">{bookmarked ? '🔖' : '🏷️'}</button>
              </div>
              {questionBody}
            </div>
          )}

          {/* Bottom bar */}
          <div className="ex-foot">
            <button className="ex-fbtn" disabled={idx === 0} onClick={() => go(-1)}>← Previous Question</button>
            <button className="ex-fbtn" onClick={() => { flags.current.add('report_issue'); window.alert('Thanks — this question has been flagged for our team to review.'); }}>🚩 Report an issue</button>
            {idx < items.length - 1
              ? <button className="ex-submit" onClick={() => go(1)}>Next Question →</button>
              : <button className="ex-submit" disabled={submitting} onClick={() => advance()}>{submitting ? (isLast ? 'Scoring…' : 'Loading…') : (isLast ? 'Submit & See My Score →' : 'Submit Stage →')}</button>}
          </div>
          {err && <div className="ex-err">{err}</div>}
        </main>
      </div>
    </div>
  );
};

export default Exam;
