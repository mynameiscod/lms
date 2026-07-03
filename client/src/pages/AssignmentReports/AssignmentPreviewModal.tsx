import React, { useEffect, useState } from 'react';
import { assignmentApi, Assignment } from '../../api/assignmentApi';

// Read-only preview of an assignment — what the student will see.
const AssignmentPreviewModal: React.FC<{ assignmentId: string; onClose: () => void }> = ({ assignmentId, onClose }) => {
  const [a, setA] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await assignmentApi.getById(assignmentId);
        if (alive) setA(res.data.data);
      } catch (e: any) {
        if (alive) setErr(e?.response?.data?.message || 'Failed to load assignment');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [assignmentId]);

  const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', zIndex: 5000, display: 'grid', placeItems: 'center', padding: 20 };
  const card: React.CSSProperties = { background: '#fff', borderRadius: 16, width: 'min(760px, 96vw)', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 70px rgba(15,23,42,.4)' };
  const head: React.CSSProperties = { position: 'sticky', top: 0, background: '#fff', borderBottom: '1px solid #eef1f6', padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 };
  const pill: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: '#eef2ff', color: '#4f46e5' };
  const secTitle: React.CSSProperties = { fontSize: 13, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: .5, margin: '18px 0 8px' };
  const fmtDate = (d?: string) => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={e => e.stopPropagation()}>
        <div style={head}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: .6 }}>ASSIGNMENT PREVIEW</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{a?.title || (loading ? 'Loading…' : 'Assignment')}</div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: '#f1f5f9', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: '#475569' }}>✕</button>
        </div>

        <div style={{ padding: '10px 22px 26px' }}>
          {loading && <p style={{ color: '#64748b' }}>Loading preview…</p>}
          {err && <p style={{ color: '#dc2626' }}>{err}</p>}
          {a && (
            <>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                <span style={pill}>{a.type}</span>
                <span style={{ ...pill, background: '#fef3c7', color: '#b45309' }}>{a.difficulty}</span>
                <span style={{ ...pill, background: '#dcfce7', color: '#15803d' }}>{a.totalPoints} pts</span>
                {a.dueDate && <span style={{ ...pill, background: '#fee2e2', color: '#b91c1c' }}>Due {fmtDate(a.dueDate)}</span>}
              </div>

              {a.description && (<><div style={secTitle}>Description</div><div style={{ fontSize: 14, lineHeight: 1.65, color: '#334155', whiteSpace: 'pre-wrap' }}>{a.description}</div></>)}
              {a.instructions && (<><div style={secTitle}>Instructions</div><div style={{ fontSize: 14, lineHeight: 1.65, color: '#334155', whiteSpace: 'pre-wrap' }}>{a.instructions}</div></>)}

              {!!a.topics?.length && (<><div style={secTitle}>Topics</div><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{a.topics.map((t, i) => <span key={i} style={{ ...pill, background: '#f1f5f9', color: '#475569' }}>{t}</span>)}</div></>)}

              {/* MCQ questions */}
              {!!a.mcqQuestions?.length && (
                <>
                  <div style={secTitle}>Questions ({a.mcqQuestions.length})</div>
                  {a.mcqQuestions.map((q, i) => (
                    <div key={i} style={{ border: '1px solid #eef1f6', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{i + 1}. {q.question} <span style={{ color: '#94a3b8', fontWeight: 600 }}>({q.points} pts)</span></div>
                      <div style={{ marginTop: 8, display: 'grid', gap: 5 }}>
                        {q.options.map((o, j) => (
                          <div key={j} style={{ fontSize: 13.5, color: o.isCorrect ? '#15803d' : '#475569', fontWeight: o.isCorrect ? 700 : 500 }}>
                            {o.isCorrect ? '✓' : '○'} {o.text}
                          </div>
                        ))}
                      </div>
                      {q.explanation && <div style={{ marginTop: 8, fontSize: 12.5, color: '#64748b', fontStyle: 'italic' }}>💡 {q.explanation}</div>}
                    </div>
                  ))}
                </>
              )}

              {/* Coding: languages + visible test cases */}
              {!!a.allowedLanguages?.length && (<><div style={secTitle}>Allowed Languages</div><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{a.allowedLanguages.map((l, i) => <span key={i} style={{ ...pill, background: '#eff6ff', color: '#1d4ed8' }}>{l}</span>)}</div></>)}
              {!!a.testCases?.length && (
                <>
                  <div style={secTitle}>Sample Test Cases</div>
                  {a.testCases.filter(t => !t.isHidden).slice(0, 4).map((t, i) => (
                    <div key={i} style={{ border: '1px solid #eef1f6', borderRadius: 10, padding: '10px 12px', marginBottom: 8, fontFamily: 'monospace', fontSize: 12.5 }}>
                      <div><b>Input:</b> {t.input || '—'}</div>
                      <div><b>Expected:</b> {t.expectedOutput || '—'}</div>
                    </div>
                  ))}
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{a.testCases.filter(t => t.isHidden).length} hidden test case(s) not shown.</div>
                </>
              )}

              {/* Rubric */}
              {!!a.rubric?.length && (
                <>
                  <div style={secTitle}>Grading Rubric</div>
                  {a.rubric.map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ color: '#334155' }}>{r.criterion}</span><b style={{ color: '#0f172a' }}>{r.maxPoints} pts</b>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignmentPreviewModal;
