import React, { useEffect, useState } from 'react';
import { thinkingLabApi, TLAdminProblem, TL_LANGS, DIFF_COLORS } from '../../api/thinkingLabApi';

const INK = '#0f172a', SUB = '#64748b', BLUE = '#2563eb';

const ThinkingLabAdmin: React.FC = () => {
  const [categories, setCategories] = useState<string[]>([]);
  const [difficulties, setDifficulties] = useState<string[]>([]);
  const [problems, setProblems] = useState<TLAdminProblem[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState({ category: '', difficulty: '' });
  const [form, setForm] = useState({ category: '', difficulty: 'easy', language: 'javascript', brief: '', count: 3 });
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState('');

  const loadProblems = async () => {
    const r = await thinkingLabApi.listProblems({ category: filter.category || undefined, difficulty: filter.difficulty || undefined });
    setProblems(r.problems); setTotal(r.total);
  };

  useEffect(() => {
    thinkingLabApi.meta().then(m => { setCategories(m.categories); setDifficulties(m.difficulties); setForm(f => ({ ...f, category: m.categories[0] || '' })); }).catch(() => {});
    loadProblems().catch(() => {});
  }, []);
  useEffect(() => { loadProblems().catch(() => {}); /* eslint-disable-next-line */ }, [filter.category, filter.difficulty]);

  const generate = async () => {
    if (!form.category) { setMsg('Pick a category'); return; }
    try {
      setGenerating(true); setMsg('');
      const r = await thinkingLabApi.generate({ category: form.category, difficulty: form.difficulty, language: form.language, brief: form.brief || undefined, count: form.count });
      setMsg(`✅ Generated ${r.created} problem${r.created === 1 ? '' : 's'} into the bank.`);
      setForm(f => ({ ...f, brief: '' }));
      loadProblems();
    } catch (e: any) { setMsg(e?.response?.data?.message || 'Generation failed — try again.'); }
    finally { setGenerating(false); }
  };

  const toggle = async (p: TLAdminProblem) => { await thinkingLabApi.toggleProblem(p.id, !p.active); loadProblems(); };
  const del = async (p: TLAdminProblem) => { if (!window.confirm(`Delete "${p.title}"?`)) return; await thinkingLabApi.deleteProblem(p.id); loadProblems(); };

  const inp: React.CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 11px', fontSize: 13.5, width: '100%', boxSizing: 'border-box' };
  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 };

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: 22 }}>
      <h1 style={{ margin: 0, fontSize: 24, color: INK, fontWeight: 800 }}>Logical Thinking Lab — Question Bank</h1>
      <p style={{ color: SUB, fontSize: 13.5 }}>Build the bank of problems students get as their daily challenge. Generate with AI once; students draw from it every day (no per-student AI cost).</p>

      {/* Generate */}
      <div style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 14, padding: 18, margin: '14px 0' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: INK, marginBottom: 12 }}>✨ Generate problems with AI</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
          <label><span style={lbl}>Category</span><select style={inp} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
          <label><span style={lbl}>Difficulty</span><select style={inp} value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })}>{difficulties.map(d => <option key={d} value={d} style={{ textTransform: 'capitalize' }}>{d}</option>)}</select></label>
          <label><span style={lbl}>Language</span><select style={inp} value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}>{TL_LANGS.map(l => <option key={l.v} value={l.v}>{l.l}</option>)}</select></label>
          <label><span style={lbl}>How many</span><input style={inp} type="number" min={1} max={10} value={form.count} onChange={e => setForm({ ...form, count: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) })} /></label>
        </div>
        <label style={{ display: 'block', marginTop: 12 }}><span style={lbl}>AI brief (optional) — steer the kind of problem</span>
          <input style={inp} placeholder="e.g. real-life word problems about money and percentages" value={form.brief} onChange={e => setForm({ ...form, brief: e.target.value })} /></label>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 14 }}>
          <button onClick={generate} disabled={generating} style={{ background: BLUE, color: '#fff', border: 'none', borderRadius: 9, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>{generating ? 'Generating… (verifying test cases)' : '✨ Generate into bank'}</button>
          {msg && <span style={{ fontSize: 13, color: msg.startsWith('✅') ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{msg}</span>}
        </div>
      </div>

      {/* Bank */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <b style={{ fontSize: 13.5, color: INK }}>Bank ({total})</b>
        <select value={filter.category} onChange={e => setFilter({ ...filter, category: e.target.value })} style={{ ...inp, width: 'auto' }}><option value="">All categories</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
        <select value={filter.difficulty} onChange={e => setFilter({ ...filter, difficulty: e.target.value })} style={{ ...inp, width: 'auto' }}><option value="">All levels</option>{difficulties.map(d => <option key={d} value={d}>{d}</option>)}</select>
      </div>
      <div style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 12, overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13, minWidth: 720 }}>
          <thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}>{['Title', 'Category', 'Level', 'Lang', 'XP', 'Assigned', 'Solved', 'Active', ''].map(h => <th key={h} style={{ padding: '9px 12px', fontSize: 11, textTransform: 'uppercase', color: SUB }}>{h}</th>)}</tr></thead>
          <tbody>
            {problems.map(p => (
              <tr key={p.id} style={{ borderTop: '1px solid #eef1f6' }}>
                <td style={{ padding: '9px 12px', fontWeight: 600, color: INK }}>{p.title}</td>
                <td style={{ padding: '9px 12px', color: '#475569' }}>{p.category}</td>
                <td style={{ padding: '9px 12px' }}><span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: DIFF_COLORS[p.difficulty] || BLUE, borderRadius: 999, padding: '2px 9px', textTransform: 'capitalize' }}>{p.difficulty}</span></td>
                <td style={{ padding: '9px 12px', color: SUB }}>{p.language}</td>
                <td style={{ padding: '9px 12px', fontWeight: 700 }}>{p.xp}</td>
                <td style={{ padding: '9px 12px', color: SUB }}>{p.timesAssigned}</td>
                <td style={{ padding: '9px 12px', color: '#16a34a', fontWeight: 700 }}>{p.timesSolved}</td>
                <td style={{ padding: '9px 12px' }}><button onClick={() => toggle(p)} style={{ border: 'none', background: p.active ? '#dcfce7' : '#f1f5f9', color: p.active ? '#15803d' : '#94a3b8', borderRadius: 999, padding: '3px 10px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>{p.active ? '● Active' : '○ Off'}</button></td>
                <td style={{ padding: '9px 12px' }}><button onClick={() => del(p)} style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 13 }}>Delete</button></td>
              </tr>
            ))}
            {problems.length === 0 && <tr><td colSpan={9} style={{ padding: 26, color: SUB, textAlign: 'center' }}>No problems yet — generate some above to power students' daily challenges.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ThinkingLabAdmin;
