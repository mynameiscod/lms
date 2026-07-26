import React, { useEffect, useState } from 'react';
import passportApi, { AssessQuestionFull } from '../../api/passportApi';

/**
 * Admin editor for the deterministic Career Readiness question bank (one per tenant).
 * Add/edit/remove MCQs, set the correct option (or mark self-report), category & weight.
 * Reset restores the seeded starter bank.
 */
const CATEGORIES = [
  { key: 'career_clarity', label: 'Career Clarity' },
  { key: 'aptitude', label: 'Aptitude' },
  { key: 'logical_reasoning', label: 'Logical Reasoning' },
  { key: 'technical', label: 'Technical Foundation' },
  { key: 'communication', label: 'Communication' },
  { key: 'employability', label: 'Employability' },
];

const blank = (): AssessQuestionFull => ({ category: 'technical', text: '', options: ['', '', '', ''], correctIndex: 0, weight: 1, selfReport: false });

const AdminAssessment: React.FC = () => {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<AssessQuestionFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { assessment } = await passportApi.getAssessmentAdmin();
      setTitle(assessment.title || '');
      setQuestions(assessment.questions || []);
    } catch (e: any) { setMsg(e?.response?.data?.message || 'Failed to load'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const update = (i: number, patch: Partial<AssessQuestionFull>) =>
    setQuestions(qs => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const updateOption = (i: number, oi: number, val: string) =>
    setQuestions(qs => qs.map((q, j) => (j === i ? { ...q, options: q.options.map((o, k) => (k === oi ? val : o)) } : q)));

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      await passportApi.saveAssessment({ title, questions });
      setMsg('Saved ✓');
    } catch (e: any) { setMsg(e?.response?.data?.message || 'Save failed'); }
    setSaving(false);
    setTimeout(() => setMsg(''), 2500);
  };

  const reset = async () => {
    if (!window.confirm('Reset to the seeded starter bank? This replaces all current questions.')) return;
    setSaving(true);
    try { const { assessment } = await passportApi.resetAssessment(); setQuestions(assessment.questions); setMsg('Reset to defaults ✓'); }
    catch (e: any) { setMsg(e?.response?.data?.message || 'Reset failed'); }
    setSaving(false);
    setTimeout(() => setMsg(''), 2500);
  };

  if (loading) return <div style={{ padding: 30, color: '#64748b' }}>Loading question bank…</div>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '8px 4px 60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>🧭 Career Readiness Assessment</h1>
          <p style={{ color: '#64748b', fontSize: 13.5, margin: '4px 0 0' }}>The deterministic question bank scored for every student's free assessment. {questions.length} questions.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={reset} disabled={saving} style={ghostBtn}>Reset to defaults</button>
          <button onClick={save} disabled={saving} style={primaryBtn}>{saving ? 'Saving…' : 'Save bank'}</button>
        </div>
      </div>

      {msg && <div style={{ margin: '12px 0', padding: '8px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: 8, fontSize: 13.5 }}>{msg}</div>}

      <label style={lbl}>Assessment title</label>
      <input value={title} onChange={e => setTitle(e.target.value)} style={{ ...input, marginBottom: 20 }} />

      {questions.map((q, i) => (
        <div key={i} style={{ background: '#fff', border: '1px solid #eef1f6', borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select value={q.category} onChange={e => update(i, { category: e.target.value })} style={select}>
                {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569' }}>
                <input type="checkbox" checked={!!q.selfReport} onChange={e => update(i, { selfReport: e.target.checked, correctIndex: e.target.checked ? -1 : 0 })} />
                Self-rating (no right answer)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569' }}>
                Weight
                <input type="number" min={0.5} step={0.5} value={q.weight} onChange={e => update(i, { weight: Number(e.target.value) })} style={{ ...input, width: 60, padding: '5px 8px' }} />
              </label>
            </div>
            <button onClick={() => setQuestions(qs => qs.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>
          <input value={q.text} onChange={e => update(i, { text: e.target.value })} placeholder="Question text" style={{ ...input, marginBottom: 10, fontWeight: 600 }} />
          <div style={{ display: 'grid', gap: 8 }}>
            {q.options.map((opt, oi) => (
              <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {!q.selfReport && (
                  <input type="radio" name={`correct-${i}`} checked={q.correctIndex === oi} onChange={() => update(i, { correctIndex: oi })} title="Correct answer" />
                )}
                {q.selfReport && <span style={{ width: 22, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>{oi === 0 ? 'low' : oi === q.options.length - 1 ? 'high' : ''}</span>}
                <input value={opt} onChange={e => updateOption(i, oi, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + oi)}`} style={input} />
                {q.options.length > 2 && (
                  <button onClick={() => update(i, { options: q.options.filter((_, k) => k !== oi), correctIndex: Math.min(q.correctIndex, q.options.length - 2) })} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}>✕</button>
                )}
              </div>
            ))}
          </div>
          {q.options.length < 6 && <button onClick={() => update(i, { options: [...q.options, ''] })} style={{ ...ghostBtn, marginTop: 8, fontSize: 12.5, padding: '5px 12px' }}>+ Add option</button>}
          {!q.selfReport && <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 8 }}>● Select the radio next to the correct option.</div>}
          {q.selfReport && <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 8 }}>Self-rating: later options score higher (order low → high).</div>}
        </div>
      ))}

      <button onClick={() => setQuestions(qs => [...qs, blank()])} style={{ ...ghostBtn, width: '100%', padding: '12px', borderStyle: 'dashed' }}>+ Add question</button>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
        <button onClick={save} disabled={saving} style={primaryBtn}>{saving ? 'Saving…' : 'Save bank'}</button>
      </div>
    </div>
  );
};

const lbl: React.CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 700, color: '#475569', marginBottom: 6 };
const input: React.CSSProperties = { flex: 1, width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '9px 12px', fontSize: 14, color: '#0f172a', boxSizing: 'border-box' };
const select: React.CSSProperties = { border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: '#0f172a', background: '#fff' };
const primaryBtn: React.CSSProperties = { background: 'linear-gradient(90deg,#6650d8,#14a89c)', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 20px', fontWeight: 800, fontSize: 14, cursor: 'pointer' };
const ghostBtn: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 9, padding: '10px 16px', fontWeight: 700, fontSize: 13.5, color: '#475569', cursor: 'pointer' };

export default AdminAssessment;
