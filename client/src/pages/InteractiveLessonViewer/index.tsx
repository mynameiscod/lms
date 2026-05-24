import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  interactiveLessonApi,
  runCode,
  InteractiveLesson,
  LessonProgress,
  Scene,
  SCENE_TYPE_ICONS,
  LANGUAGE_LABELS,
} from '../../api/interactiveLessonApi';

// ─── Syntax highlighting via lightweight approach ─────────────────────────────
function CodeBlock({ code, language }: { code: string; language?: string }) {
  return (
    <pre style={{
      background: '#1e293b',
      color: '#e2e8f0',
      padding: '14px 16px',
      borderRadius: 10,
      fontFamily: 'monospace',
      fontSize: 13,
      lineHeight: 1.6,
      overflow: 'auto',
      margin: 0,
    }}>
      <code>{code}</code>
    </pre>
  );
}

// ─── Scene renderers ──────────────────────────────────────────────────────────

function StorySceneView({ scene, onComplete }: { scene: Scene; onComplete: (passed?: boolean) => void }) {
  const data = scene.story!;
  const [visible, setVisible] = useState(false);
  const [textIdx, setTextIdx] = useState(0);

  useEffect(() => {
    setVisible(false);
    setTextIdx(0);
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, [scene]);

  useEffect(() => {
    if (!visible) return;
    if (data.animationType === 'typewriter') {
      const timer = setInterval(() => {
        setTextIdx(prev => {
          if (prev >= data.text.length) { clearInterval(timer); return prev; }
          return prev + 1;
        });
      }, 30);
      return () => clearInterval(timer);
    } else {
      setTextIdx(data.text.length);
    }
  }, [visible, data]);

  const displayText = data.animationType === 'typewriter' ? data.text.slice(0, textIdx) : data.text;

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : data.animationType === 'slide' ? 'translateY(20px)' : 'scale(0.95)',
      transition: 'all 0.4s ease',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '20px 0',
    }}>
      {/* Avatar */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 64,
          animation: data.animationType === 'bounce' ? 'bounce 1s infinite' : undefined,
          marginBottom: 8,
        }}>{data.avatarEmoji}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#6366f1' }}>{data.avatarName}</div>
      </div>

      {/* Speech bubble */}
      <div style={{
        background: '#fff',
        borderRadius: 16,
        padding: '20px 24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        maxWidth: 560,
        width: '100%',
        position: 'relative',
        fontSize: 16,
        lineHeight: 1.7,
        color: '#1e293b',
      }}>
        <div style={{
          position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
          width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderBottom: '10px solid #fff',
        }} />
        {displayText}
        {data.animationType === 'typewriter' && textIdx < data.text.length && (
          <span style={{ borderRight: '2px solid #6366f1', animation: 'blink 0.7s infinite' }} />
        )}
      </div>

      {/* Optional code illustration */}
      {data.codeSnippet && (
        <div style={{ width: '100%', maxWidth: 560 }}>
          <CodeBlock code={data.codeSnippet} language={data.codeLanguage} />
        </div>
      )}

      <button onClick={() => onComplete()} style={primaryBtn}>Continue →</button>
    </div>
  );
}

function CodeDemoSceneView({ scene, onComplete }: { scene: Scene; onComplete: (passed?: boolean) => void }) {
  const data = scene.codeDemo!;
  const [revealedLines, setRevealedLines] = useState(0);
  const [activeComment, setActiveComment] = useState('');
  const lines = data.code.split('\n');
  const speed = data.revealSpeed === 'slow' ? 800 : data.revealSpeed === 'fast' ? 200 : 450;

  useEffect(() => {
    setRevealedLines(0);
    setActiveComment('');
  }, [scene]);

  useEffect(() => {
    if (revealedLines >= lines.length) return;
    const t = setTimeout(() => {
      const next = revealedLines + 1;
      setRevealedLines(next);
      const comment = data.lines?.find((l: any) => l.lineNumber === next);
      if (comment) setActiveComment(comment.commentary);
    }, speed);
    return () => clearTimeout(t);
  }, [revealedLines, lines.length, speed, data.lines]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{ background: '#0f172a', padding: '8px 14px', display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981' }} />
          <span style={{ marginLeft: 8, fontSize: 11, color: '#64748b' }}>{LANGUAGE_LABELS[data.language] || data.language}</span>
        </div>
        {/* Code */}
        <pre style={{ margin: 0, padding: '16px', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.7, overflowX: 'auto' }}>
          {lines.map((line, i) => {
            const lineNum = i + 1;
            const isRevealed = lineNum <= revealedLines;
            const commentLine = data.lines?.find((l: any) => l.lineNumber === lineNum);
            return (
              <div key={i} style={{
                opacity: isRevealed ? 1 : 0.1,
                transition: `opacity ${speed * 0.7}ms ease`,
                background: commentLine && lineNum === revealedLines ? `${data.highlightColor || '#fef08a'}22` : 'transparent',
                padding: '0 4px', borderRadius: 4,
                display: 'flex', gap: 12,
              }}>
                <span style={{ color: '#475569', userSelect: 'none', minWidth: 24, textAlign: 'right' }}>{lineNum}</span>
                <span style={{ color: '#e2e8f0' }}>{line || ' '}</span>
              </div>
            );
          })}
        </pre>
      </div>

      {/* Commentary bubble */}
      <div style={{
        minHeight: 52,
        background: '#eef2ff',
        borderRadius: 10,
        padding: '12px 16px',
        borderLeft: '4px solid #6366f1',
        fontSize: 14,
        color: '#3730a3',
        transition: 'all 0.3s ease',
      }}>
        {activeComment || (revealedLines < lines.length ? 'Revealing code...' : 'Code complete!')}
      </div>

      {revealedLines >= lines.length && (
        <div style={{ textAlign: 'center' }}>
          <button onClick={() => onComplete()} style={primaryBtn}>Got it! Continue →</button>
        </div>
      )}
    </div>
  );
}

function DragDropSceneView({ scene, onComplete }: { scene: Scene; onComplete: (passed?: boolean) => void }) {
  const data = scene.dragDrop!;
  const [bucketContents, setBucketContents] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(data.buckets.map((b: any) => [b.id, []]))
  );
  const [unplaced, setUnplaced] = useState<string[]>(() =>
    data.items.filter((it: any) => !it.isDecoy).map((it: any) => it.id)
  );
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [result, setResult] = useState<{ correct: number; total: number } | null>(null);

  const drop = (bucketId: string) => {
    if (!dragItem) return;
    setBucketContents(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { next[k] = next[k].filter(i => i !== dragItem); });
      next[bucketId] = [...next[bucketId], dragItem];
      return next;
    });
    setUnplaced(prev => prev.filter(i => i !== dragItem));
    setDragItem(null);
  };

  const returnToPool = (itemId: string) => {
    setBucketContents(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { next[k] = next[k].filter(i => i !== itemId); });
      return next;
    });
    setUnplaced(prev => [...prev, itemId]);
  };

  const checkAnswers = () => {
    const scorable = data.items.filter((it: any) => !it.isDecoy);
    let correct = 0;
    scorable.forEach((it: any) => {
      const placedIn = Object.entries(bucketContents).find(([, ids]) => ids.includes(it.id))?.[0];
      if (placedIn === it.targetBucket) correct++;
    });
    setResult({ correct, total: scorable.length });
    setChecked(true);
  };

  const getItemLabel = (id: string) => data.items.find((it: any) => it.id === id)?.label || id;
  const getItemCorrect = (id: string, bucketId: string) => {
    const item = data.items.find((it: any) => it.id === id);
    return item?.targetBucket === bucketId;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>{data.instruction}</div>

      {/* Unplaced items pool */}
      <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, border: '2px dashed #e2e8f0' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 10, textTransform: 'uppercase' }}>Items</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {unplaced.map(id => (
            <div key={id} draggable onDragStart={() => setDragItem(id)}
              style={{
                padding: '8px 14px', background: '#fff', border: '1px solid #6366f1',
                borderRadius: 8, cursor: 'grab', fontSize: 13, fontWeight: 500, color: '#4338ca',
                userSelect: 'none', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}>
              {getItemLabel(id)}
            </div>
          ))}
          {unplaced.length === 0 && <span style={{ color: '#94a3b8', fontSize: 13 }}>All items placed</span>}
        </div>
      </div>

      {/* Buckets */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(data.buckets.length, 3)}, 1fr)`, gap: 12 }}>
        {data.buckets.map((bucket: any) => (
          <div key={bucket.id}
            onDragOver={e => e.preventDefault()}
            onDrop={() => drop(bucket.id)}
            style={{
              minHeight: 100, border: `2px dashed ${bucket.color || '#3b82f6'}`,
              borderRadius: 10, padding: 12,
              background: `${bucket.color || '#3b82f6'}11`,
            }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: bucket.color || '#3b82f6', marginBottom: 8 }}>{bucket.label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {bucketContents[bucket.id]?.map(id => {
                const correct = checked ? getItemCorrect(id, bucket.id) : null;
                return (
                  <div key={id}
                    onClick={() => !checked && returnToPool(id)}
                    style={{
                      padding: '6px 12px',
                      background: correct === null ? '#fff' : correct ? '#dcfce7' : '#fee2e2',
                      border: `1px solid ${correct === null ? '#e2e8f0' : correct ? '#10b981' : '#ef4444'}`,
                      borderRadius: 7, fontSize: 13, cursor: checked ? 'default' : 'pointer',
                    }}>
                    {getItemLabel(id)} {checked && (correct ? '✓' : '✗')}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {!checked ? (
        <div style={{ textAlign: 'center' }}>
          <button onClick={checkAnswers} disabled={unplaced.length > 0} style={primaryBtn}>Check Answers</button>
          {unplaced.length > 0 && <div style={{ color: '#64748b', fontSize: 12, marginTop: 6 }}>Place all items first</div>}
        </div>
      ) : (
        <div>
          <div style={{
            padding: 16, borderRadius: 10,
            background: result!.correct === result!.total ? '#dcfce7' : '#fef3c7',
            color: result!.correct === result!.total ? '#166534' : '#92400e',
            marginBottom: 12,
          }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              {result!.correct === result!.total ? '🎉 Perfect!' : `${result!.correct}/${result!.total} correct`}
            </div>
            {data.explanation && <div style={{ marginTop: 8, fontSize: 14 }}>{data.explanation}</div>}
          </div>
          <div style={{ textAlign: 'center' }}>
            <button onClick={() => onComplete(result!.correct === result!.total)} style={primaryBtn}>Continue →</button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuizSceneView({ scene, onComplete }: { scene: Scene; onComplete: (passed?: boolean) => void }) {
  const data = scene.quiz!;
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const submit = () => {
    if (!selected) return;
    setShowResult(true);
  };

  const correct = data.options.find((o: any) => o.isCorrect);
  const isCorrect = selected === correct?.id;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', lineHeight: 1.5 }}>
        {data.question}
      </div>

      {data.hint && !showResult && (
        <div>
          {!showHint ? (
            <button onClick={() => setShowHint(true)} style={{ ...miniBtn, fontSize: 13 }}>💡 Show Hint</button>
          ) : (
            <div style={{ padding: '10px 14px', background: '#fef3c7', borderRadius: 8, fontSize: 13, color: '#92400e' }}>
              💡 {data.hint}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.options.map((opt: any) => {
          let bg = '#fff', borderColor = '#e2e8f0', textColor = '#1e293b';
          if (showResult) {
            if (opt.isCorrect) { bg = '#dcfce7'; borderColor = '#10b981'; textColor = '#166534'; }
            else if (opt.id === selected && !opt.isCorrect) { bg = '#fee2e2'; borderColor = '#ef4444'; textColor = '#991b1b'; }
          } else if (opt.id === selected) {
            bg = '#eef2ff'; borderColor = '#6366f1'; textColor = '#4338ca';
          }
          return (
            <div key={opt.id}
              onClick={() => !showResult && setSelected(opt.id)}
              style={{
                padding: '12px 16px', borderRadius: 10, border: `2px solid ${borderColor}`,
                background: bg, color: textColor, cursor: showResult ? 'default' : 'pointer',
                fontSize: 14, fontWeight: 500, transition: 'all 0.15s', display: 'flex', gap: 10, alignItems: 'center',
              }}>
              <span style={{
                width: 22, height: 22, borderRadius: '50%', border: `2px solid ${borderColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12,
              }}>
                {showResult && opt.isCorrect ? '✓' : showResult && opt.id === selected && !opt.isCorrect ? '✗' : ''}
              </span>
              {opt.text}
            </div>
          );
        })}
      </div>

      {!showResult ? (
        <div style={{ textAlign: 'center' }}>
          <button onClick={submit} disabled={!selected} style={primaryBtn}>Submit Answer</button>
        </div>
      ) : (
        <div>
          <div style={{
            padding: 16, borderRadius: 10, marginBottom: 14,
            background: isCorrect ? '#dcfce7' : '#fee2e2',
            color: isCorrect ? '#166534' : '#991b1b',
          }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
              {isCorrect ? '🎉 Correct!' : '❌ Not quite right'}
            </div>
            {data.explanation && <div style={{ fontSize: 13 }}>{data.explanation}</div>}
          </div>
          <div style={{ textAlign: 'center' }}>
            <button onClick={() => onComplete(isCorrect)} style={primaryBtn}>Continue →</button>
          </div>
        </div>
      )}
    </div>
  );
}

function FillBlankSceneView({ scene, onComplete }: { scene: Scene; onComplete: (passed?: boolean) => void }) {
  const data = scene.fillBlank!;
  const parts = data.templateText.split('___');
  const [answers, setAnswers] = useState<string[]>(data.blanks.map(() => ''));
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);

  const check = () => {
    const res = data.blanks.map((b: any, i: number) =>
      answers[i].trim().toLowerCase() === b.answer.trim().toLowerCase()
    );
    setResults(res);
    setChecked(true);
  };

  const allCorrect = results.every(r => r);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: data.isCode ? '#1e293b' : '#f8fafc', borderRadius: 12, padding: '16px 20px' }}>
        <div style={{
          fontFamily: data.isCode ? 'monospace' : 'inherit',
          fontSize: data.isCode ? 14 : 16,
          color: data.isCode ? '#e2e8f0' : '#1e293b',
          lineHeight: 1.8,
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4,
        }}>
          {parts.map((part, i) => (
            <React.Fragment key={i}>
              <span>{part}</span>
              {i < data.blanks.length && (
                <input
                  value={answers[i]}
                  onChange={e => { const a = [...answers]; a[i] = e.target.value; setAnswers(a); }}
                  disabled={checked}
                  style={{
                    width: Math.max(60, (data.blanks[i]?.answer?.length || 4) * 10 + 20),
                    padding: '2px 8px',
                    borderRadius: 6,
                    border: `2px solid ${checked ? (results[i] ? '#10b981' : '#ef4444') : '#6366f1'}`,
                    background: checked ? (results[i] ? '#dcfce7' : '#fee2e2') : '#fff',
                    fontFamily: data.isCode ? 'monospace' : 'inherit',
                    fontSize: data.isCode ? 13 : 14,
                    color: '#1e293b',
                    textAlign: 'center',
                    outline: 'none',
                  }}
                  placeholder="___"
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Hints */}
      {!checked && data.blanks.some((b: any) => b.hint) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {data.blanks.map((b: any, i: number) => b.hint && (
            <div key={i} style={{ fontSize: 12, color: '#64748b', background: '#f8fafc', padding: '4px 10px', borderRadius: 6 }}>
              Blank {i + 1}: {b.hint}
            </div>
          ))}
        </div>
      )}

      {!checked ? (
        <div style={{ textAlign: 'center' }}>
          <button onClick={check} disabled={answers.some(a => !a.trim())} style={primaryBtn}>Check</button>
        </div>
      ) : (
        <div>
          <div style={{ padding: 16, borderRadius: 10, background: allCorrect ? '#dcfce7' : '#fef3c7', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: allCorrect ? '#166534' : '#92400e', marginBottom: 6 }}>
              {allCorrect ? '✅ Perfect!' : `${results.filter(r => r).length}/${results.length} correct`}
            </div>
            {data.explanation && <div style={{ fontSize: 13, color: '#64748b' }}>{data.explanation}</div>}
            {!allCorrect && (
              <div style={{ marginTop: 8, fontSize: 13, color: '#92400e' }}>
                Correct answers: {data.blanks.map((b: any) => b.answer).join(', ')}
              </div>
            )}
          </div>
          <div style={{ textAlign: 'center' }}>
            <button onClick={() => onComplete(allCorrect)} style={primaryBtn}>Continue →</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CodeRunSceneView({ scene, onComplete }: { scene: Scene; onComplete: (passed?: boolean) => void }) {
  const data = scene.codeRun!;
  const [code, setCode] = useState(data.starterCode);
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState('');
  const [passed, setPassed] = useState<boolean | null>(null);

  const run = async () => {
    setRunning(true);
    setRunError('');
    setOutput('');
    try {
      const result = await runCode(data.language, code);
      setOutput(result.stdout || result.stderr || '(no output)');
      if (data.expectedOutput) {
        const ok = result.stdout.trim() === data.expectedOutput.trim();
        setPassed(ok);
      }
    } catch (err: any) {
      setRunError(err.message || 'Execution failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ padding: '10px 14px', background: '#eef2ff', borderRadius: 8, color: '#4338ca', fontSize: 14 }}>
        {data.instructions}
      </div>
      {data.hint && (
        <div style={{ fontSize: 12, color: '#64748b' }}>💡 Hint: {data.hint}</div>
      )}

      {/* Editor */}
      <div>
        <div style={{ background: '#0f172a', padding: '6px 12px', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>{LANGUAGE_LABELS[data.language] || data.language}</span>
          <button onClick={run} disabled={running}
            style={{ padding: '4px 14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            {running ? '⏳ Running...' : '▶ Run'}
          </button>
        </div>
        <textarea
          value={code}
          onChange={e => setCode(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: 14, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6,
            background: '#1e293b', color: '#e2e8f0', border: 'none',
            borderRadius: '0 0 8px 8px', resize: 'vertical', minHeight: 160, outline: 'none',
          }}
        />
      </div>

      {/* Output */}
      {(output || runError) && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4, textTransform: 'uppercase' }}>Output</div>
          <pre style={{
            background: runError ? '#fee2e2' : '#f8fafc',
            color: runError ? '#dc2626' : '#1e293b',
            padding: '10px 14px', borderRadius: 8,
            fontFamily: 'monospace', fontSize: 13, margin: 0, overflow: 'auto',
          }}>
            {runError || output}
          </pre>
          {passed !== null && (
            <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: passed ? '#dcfce7' : '#fee2e2', fontSize: 13, fontWeight: 600, color: passed ? '#166534' : '#991b1b' }}>
              {passed ? '✅ Output matches expected!' : '❌ Output does not match expected. Keep trying!'}
            </div>
          )}
        </div>
      )}

      <div style={{ textAlign: 'center', display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button onClick={() => onComplete(passed ?? undefined)} style={{ ...primaryBtn, background: passed ? '#10b981' : undefined }}>
          {passed ? 'Continue →' : 'Mark as Done'}
        </button>
      </div>
    </div>
  );
}

function SummarySceneView({ scene, onComplete }: { scene: Scene; onComplete: (passed?: boolean) => void }) {
  const data = scene.summary!;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{data.title}</h2>

      {/* Key points */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.points.map((pt: any, i: number) => (
          <div key={i} style={{
            display: 'flex', gap: 12, alignItems: 'flex-start',
            padding: '12px 16px', background: '#f8fafc', borderRadius: 10,
            borderLeft: '4px solid #6366f1',
            animation: `slideIn 0.4s ease ${i * 0.1}s both`,
          }}>
            {pt.emoji && <span style={{ fontSize: 20, flexShrink: 0 }}>{pt.emoji}</span>}
            <span style={{ fontSize: 15, color: '#1e293b' }}>{pt.text}</span>
          </div>
        ))}
      </div>

      {/* Code recap */}
      {data.codeRecap && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>Code Recap</div>
          <CodeBlock code={data.codeRecap} language={data.codeLanguage} />
        </div>
      )}

      {/* Concept map */}
      {data.conceptMapItems && data.conceptMapItems.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>Concept Map</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {data.conceptMapItems.map((cm: any, i: number) => (
              <div key={i} style={{ padding: '10px 14px', background: '#eef2ff', borderRadius: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#4338ca', marginBottom: 4 }}>{cm.term}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{cm.definition}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center' }}>
        <button onClick={() => onComplete(true)} style={{ ...primaryBtn, background: '#10b981', fontSize: 16, padding: '14px 32px' }}>
          🎉 Complete Lesson
        </button>
      </div>
    </div>
  );
}

// ─── Main Viewer ──────────────────────────────────────────────────────────────
export default function InteractiveLessonViewerPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [lesson, setLesson] = useState<InteractiveLesson | null>(null);
  const [progress, setProgress] = useState<LessonProgress | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [finalResult, setFinalResult] = useState<{ score: number; passed: boolean } | null>(null);
  const sceneStartTime = useRef(Date.now());

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      interactiveLessonApi.getById(id),
      interactiveLessonApi.getProgress(id),
    ]).then(([les, prog]) => {
      setLesson(les);
      setProgress(prog);
      // Resume from where student left off
      if (prog.currentSceneIndex > 0 && prog.status === 'in_progress') {
        setCurrentIdx(Math.min(prog.currentSceneIndex, les.scenes.length - 1));
      }
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    sceneStartTime.current = Date.now();
  }, [currentIdx]);

  const handleSceneComplete = useCallback(async (passed?: boolean) => {
    if (!lesson || !id) return;
    const scene = lesson.scenes[currentIdx];
    const timeSpent = Math.round((Date.now() - sceneStartTime.current) / 1000);
    const xp = passed !== false ? (scene.xpReward || 0) : 0;

    try {
      await interactiveLessonApi.saveSceneProgress(id, {
        sceneId: scene._id || String(currentIdx),
        sceneType: scene.type,
        completed: true,
        passed,
        xpEarned: xp,
        timeSpentSeconds: timeSpent,
        currentSceneIndex: currentIdx + 1,
      });
    } catch {
      // non-blocking
    }

    const nextIdx = currentIdx + 1;
    if (nextIdx >= lesson.scenes.length) {
      // Lesson complete
      try {
        const result = await interactiveLessonApi.completeLesson(id);
        setFinalResult({ score: result.score, passed: result.passed });
        setCompleted(true);
      } catch {
        setCompleted(true);
      }
    } else {
      setCurrentIdx(nextIdx);
    }
  }, [lesson, currentIdx, id]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', flexDirection: 'column', gap: 16, color: '#64748b' }}>
      <div style={{ fontSize: 48 }}>📖</div>
      <div style={{ fontSize: 16 }}>Loading lesson...</div>
    </div>
  );

  if (!lesson) return (
    <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Lesson not found</div>
  );

  // Completion screen
  if (completed) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '40px 36px', maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
          <div style={{ fontSize: 80, marginBottom: 16 }}>{finalResult?.passed ? '🏆' : '📚'}</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', margin: '0 0 8px' }}>
            {finalResult?.passed ? 'Lesson Complete!' : 'Keep Practicing!'}
          </h2>
          <p style={{ color: '#64748b', marginBottom: 24 }}>
            {finalResult?.passed
              ? `You scored ${finalResult.score}% and earned ${lesson.totalXp} XP!`
              : `You scored ${finalResult?.score ?? 0}%. Try again to improve your score.`}
          </p>
          {finalResult && (
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 24 }}>
              <div style={{ padding: '12px 20px', background: '#f8fafc', borderRadius: 10 }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#6366f1' }}>{finalResult.score}%</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Score</div>
              </div>
              <div style={{ padding: '12px 20px', background: '#f8fafc', borderRadius: 10 }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b' }}>{lesson.totalXp}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>XP</div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            {!finalResult?.passed && (
              <button onClick={() => { setCurrentIdx(0); setCompleted(false); setFinalResult(null); }}
                style={{ ...primaryBtn, background: '#f59e0b' }}>Try Again</button>
            )}
            <button onClick={() => navigate(-1)} style={primaryBtn}>Back to Plan</button>
          </div>
        </div>
      </div>
    );
  }

  const scene = lesson.scenes[currentIdx];
  const progressPct = Math.round(((currentIdx) / lesson.scenes.length) * 100);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Top bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '12px 20px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 18 }}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>
              {lesson.title}
              <span style={{ marginLeft: 8, fontSize: 11, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 10 }}>
                {LANGUAGE_LABELS[lesson.language]}
              </span>
            </div>
            <div style={{ position: 'relative', height: 6, background: '#e2e8f0', borderRadius: 3 }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, height: '100%',
                width: `${progressPct}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                borderRadius: 3, transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
          <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
            {currentIdx + 1} / {lesson.scenes.length}
          </span>
        </div>
      </div>

      {/* Scene */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
        {/* Scene type badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 22 }}>{SCENE_TYPE_ICONS[scene.type]}</span>
          <div>
            <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Scene {currentIdx + 1}
            </div>
            {scene.title && <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{scene.title}</div>}
          </div>
          {scene.xpReward > 0 && (
            <div style={{ marginLeft: 'auto', background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
              +{scene.xpReward} XP
            </div>
          )}
        </div>

        {/* Scene content */}
        <div key={currentIdx}>
          {scene.type === 'story'      && <StorySceneView scene={scene} onComplete={handleSceneComplete} />}
          {scene.type === 'code_demo'  && <CodeDemoSceneView scene={scene} onComplete={handleSceneComplete} />}
          {scene.type === 'drag_drop'  && <DragDropSceneView scene={scene} onComplete={handleSceneComplete} />}
          {scene.type === 'quiz'       && <QuizSceneView scene={scene} onComplete={handleSceneComplete} />}
          {scene.type === 'fill_blank' && <FillBlankSceneView scene={scene} onComplete={handleSceneComplete} />}
          {scene.type === 'code_run'   && <CodeRunSceneView scene={scene} onComplete={handleSceneComplete} />}
          {scene.type === 'summary'    && <SummarySceneView scene={scene} onComplete={handleSceneComplete} />}
        </div>
      </div>

      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes blink { 50%{opacity:0} }
        @keyframes slideIn { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
      `}</style>
    </div>
  );
}

// ─── Shared Styles ────────────────────────────────────────────────────────────
const primaryBtn: React.CSSProperties = {
  padding: '12px 28px',
  background: '#6366f1',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 14,
  transition: 'all 0.15s',
};

const miniBtn: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: 12,
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  background: '#f8fafc',
  cursor: 'pointer',
};
