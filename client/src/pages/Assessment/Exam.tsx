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

  return (
    <div className="as-root">
      <div className="as-exam-top">
        <div><b>{meta.title || 'Assessment'}</b><div className="as-note" style={{ marginTop: 2 }}>Stage {stage + 1}/{totalStages} · Question {idx + 1} of {items.length}</div></div>
        <div className={`as-timer ${timeLeft < 60 ? 'low' : ''}`}>⏱ {mmss}</div>
      </div>
      <div className="as-wrap">
        <div className="as-progress-bar"><div className="as-progress-fill" style={{ width: `${(answered / items.length) * 100}%` }} /></div>

        <div className="as-card" style={{ marginTop: 16 }}>
          <div className="as-qmeta">
            <span className="as-tag">{DIMENSION_LABELS[current.dimension] || current.dimension}</span>
            <span className="as-tag">{current.type.replace('_', ' ')}</span>
            {current.optional && <span className="as-tag bonus">★ Bonus</span>}
          </div>

          {current.optional && (current.type === 'live_code' || current.type === 'sql') && (
            <div className="as-bonus-banner">Optional bonus — boost your score. Skip freely on mobile; finish the full coding challenge on a laptop anytime.</div>
          )}

          <p className="as-qprompt">{current.prompt}</p>

          {/* MCQ */}
          {current.type === 'mcq' && current.options && (
            <div className="as-opts">
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

          {/* Predict output */}
          {current.type === 'predict_output' && (
            <>
              {current.codeSnippet && <CodeBlock code={current.codeSnippet} />}
              <div className="as-field" style={{ marginTop: 12 }}>
                <label>Your predicted output</label>
                <textarea className="as-input" rows={3} value={resp.predictedOutput || ''} onChange={(e) => setResp({ predictedOutput: e.target.value })} placeholder="Type exactly what the code prints" />
              </div>
            </>
          )}

          {/* Debug — pick the buggy line */}
          {current.type === 'debug' && current.codeSnippet && (
            <>
              <div className="as-note" style={{ marginBottom: 8 }}>Tap the line that contains the bug.</div>
              <CodeBlock code={current.codeSnippet} picked={resp.identifiedLine} onPick={(line) => setResp({ identifiedLine: line })} />
            </>
          )}

          {/* Complete code — fill blanks */}
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

          {/* Live code / SQL — Monaco */}
          {(current.type === 'live_code' || current.type === 'sql') && (
            <>
              {current.sampleTestCases && current.sampleTestCases.length > 0 && (
                <div className="as-note" style={{ marginBottom: 8 }}>
                  Example: input <code>{current.sampleTestCases[0].input}</code> → output <code>{current.sampleTestCases[0].expectedOutput}</code>
                </div>
              )}
              <div className="as-editor">
                <Editor
                  height="280px"
                  theme="vs-dark"
                  language={current.type === 'sql' ? 'sql' : (current.language || 'java')}
                  value={resp.code ?? current.starterCode ?? ''}
                  onChange={(v) => setResp({ code: v ?? '' })}
                  options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false, lineNumbers: 'on' }}
                />
              </div>
            </>
          )}
        </div>

        <div className="as-exam-foot">
          {idx > 0 && <button className="as-btn ghost" onClick={() => go(-1)}>← Previous</button>}
          {idx < items.length - 1
            ? <button className="as-btn" onClick={() => go(1)}>Next →</button>
            : <button className="as-btn" disabled={submitting} onClick={() => advance()}>{submitting ? (isLast ? 'Scoring…' : 'Loading next stage…') : (isLast ? 'Submit & See My Score' : 'Submit Stage →')}</button>}
        </div>
        {err && <div className="as-err">{err}</div>}
      </div>
    </div>
  );
};

export default Exam;
