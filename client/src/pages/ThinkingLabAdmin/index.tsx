import React, { useEffect, useState } from 'react';
import { thinkingLabApi, TLAdminProblem, TL_LANGS, DIFF_COLORS } from '../../api/thinkingLabApi';
import { batchApi } from '../../api';

const INK = '#0f172a', SUB = '#64748b', BLUE = '#2563eb';

const inp: React.CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 11px', fontSize: 13.5, width: '100%', boxSizing: 'border-box' };
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 };
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e6e8f0', borderRadius: 14, padding: 18, marginBottom: 16 };

const ThinkingLabAdmin: React.FC = () => {
  const [categories, setCategories] = useState<string[]>([]);
  const [difficulties, setDifficulties] = useState<string[]>([]);
  const [problems, setProblems] = useState<TLAdminProblem[]>([]);
  const [total, setTotal] = useState(0);
  const [batches, setBatches] = useState<{ _id: string; name: string }[]>([]);
  const [filter, setFilter] = useState({ category: '', difficulty: '' });

  const [form, setForm] = useState({ category: '', difficulty: 'easy', language: 'javascript', brief: '', count: 3 });
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState('');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [bulk, setBulk] = useState<{ category: string; difficulty: string; count: number }[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  const [sched, setSched] = useState({ batchId: '', date: '', problemId: '', startTime: '', endTime: '' });
  const [schedList, setSchedList] = useState<any[]>([]);

  const loadProblems = async () => {
    const r = await thinkingLabApi.listProblems({ category: filter.category || undefined, difficulty: filter.difficulty || undefined });
    setProblems(r.problems); setTotal(r.total);
  };
  const loadSchedule = async () => { try { setSchedList((await thinkingLabApi.listSchedule()).schedule); } catch { /* ignore */ } };

  useEffect(() => {
    thinkingLabApi.meta().then(m => { setCategories(m.categories); setDifficulties(m.difficulties); setForm(f => ({ ...f, category: m.categories[0] || '' })); }).catch(() => {});
    batchApi.getBatches().then((b: any) => setBatches((Array.isArray(b) ? b : (b?.data || b?.batches || [])).map((x: any) => ({ _id: x._id, name: x.name })))).catch(() => {});
    loadProblems().catch(() => {}); loadSchedule();
  }, []);
  useEffect(() => { loadProblems().catch(() => {}); /* eslint-disable-next-line */ }, [filter.category, filter.difficulty]);

  const generate = async () => {
    if (!form.category) { setMsg('Pick a category'); return; }
    try {
      setGenerating(true); setMsg('');
      const r = await thinkingLabApi.generate({ category: form.category, difficulty: form.difficulty, language: form.language, brief: form.brief || undefined, count: form.count });
      setMsg(`✅ Generated ${r.created} problem${r.created === 1 ? '' : 's'}.`); setForm(f => ({ ...f, brief: '' })); loadProblems();
    } catch (e: any) { setMsg(e?.response?.data?.message || 'Generation failed — try again.'); }
    finally { setGenerating(false); }
  };

  const runBulk = async () => {
    const items = bulk.filter(b => b.category && b.difficulty && b.count > 0);
    if (!items.length) { setMsg('Add at least one bulk row'); return; }
    try { setBulkBusy(true); setMsg('');
      const r = await thinkingLabApi.generateBulk({ items, language: form.language, brief: form.brief || undefined });
      setMsg(`✅ Bulk generated ${r.created}/${r.requested}.`); setBulk([]); loadProblems();
    } catch (e: any) { setMsg(e?.response?.data?.message || 'Bulk generation failed.'); }
    finally { setBulkBusy(false); }
  };

  const toggle = async (p: TLAdminProblem) => { await thinkingLabApi.toggleProblem(p.id, !p.active); loadProblems(); };
  const del = async (p: TLAdminProblem) => { if (!window.confirm(`Delete "${p.title}"?`)) return; await thinkingLabApi.deleteProblem(p.id); loadProblems(); };

  const saveSchedule = async () => {
    if (!sched.batchId || !sched.date || !sched.problemId) { setMsg('Pick batch, date and problem to schedule'); return; }
    if (sched.startTime && sched.endTime && sched.endTime <= sched.startTime) { setMsg('End time must be after start time.'); return; }
    try { await thinkingLabApi.scheduleChallenge(sched); setMsg('✅ Scheduled.'); setSched({ batchId: '', date: '', problemId: '', startTime: '', endTime: '' }); loadSchedule(); }
    catch (e: any) { setMsg(e?.response?.data?.message || 'Failed to schedule.'); }
  };
  const removeSchedule = async (id: string) => { await thinkingLabApi.deleteSchedule(id); loadSchedule(); };

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, color: INK, fontWeight: 800 }}>Logical Thinking Lab — Question Bank</h1>
          <p style={{ color: SUB, fontSize: 13.5 }}>Build the bank students draw from as their daily challenge. Generate with AI, author manually, and schedule specific problems for batches.</p>
        </div>
        <button onClick={() => { setEditId(null); setEditorOpen(true); }} style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 16px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>＋ New problem (manual)</button>
      </div>

      {msg && <div style={{ margin: '12px 0', fontSize: 13, fontWeight: 600, color: msg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>{msg}</div>}

      {/* AI generate */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 800, color: INK, marginBottom: 12 }}>✨ Generate with AI</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
          <label><span style={lbl}>Category</span><select style={inp} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
          <label><span style={lbl}>Difficulty</span><select style={inp} value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })}>{difficulties.map(d => <option key={d} value={d}>{d}</option>)}</select></label>
          <label><span style={lbl}>Language</span><select style={inp} value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}>{TL_LANGS.map(l => <option key={l.v} value={l.v}>{l.l}</option>)}</select></label>
          <label><span style={lbl}>How many</span><input style={inp} type="number" min={1} max={10} value={form.count} onChange={e => setForm({ ...form, count: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) })} /></label>
        </div>
        <label style={{ display: 'block', marginTop: 12 }}><span style={lbl}>AI brief (optional)</span><input style={inp} placeholder="e.g. real-life word problems about money" value={form.brief} onChange={e => setForm({ ...form, brief: e.target.value })} /></label>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
          <button onClick={generate} disabled={generating} style={{ background: BLUE, color: '#fff', border: 'none', borderRadius: 9, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>{generating ? 'Generating…' : '✨ Generate into bank'}</button>
          <button onClick={() => setBulk(b => [...b, { category: categories[0] || '', difficulty: 'easy', count: 3 }])} style={{ background: '#fff', color: BLUE, border: `1.5px solid ${BLUE}`, borderRadius: 9, padding: '10px 16px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>＋ Bulk row</button>
        </div>

        {bulk.length > 0 && (
          <div style={{ marginTop: 14, borderTop: '1px dashed #e6e8f0', paddingTop: 12 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: INK, marginBottom: 8 }}>Bulk generate (across categories)</div>
            {bulk.map((row, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select style={{ ...inp, width: 'auto' }} value={row.category} onChange={e => setBulk(b => b.map((r, j) => j === i ? { ...r, category: e.target.value } : r))}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
                <select style={{ ...inp, width: 'auto' }} value={row.difficulty} onChange={e => setBulk(b => b.map((r, j) => j === i ? { ...r, difficulty: e.target.value } : r))}>{difficulties.map(d => <option key={d} value={d}>{d}</option>)}</select>
                <input style={{ ...inp, width: 80 }} type="number" min={1} max={10} value={row.count} onChange={e => setBulk(b => b.map((r, j) => j === i ? { ...r, count: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) } : r))} />
                <button onClick={() => setBulk(b => b.filter((_, j) => j !== i))} style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer' }}>✕</button>
              </div>
            ))}
            <button onClick={runBulk} disabled={bulkBusy} style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 18px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', marginTop: 4 }}>{bulkBusy ? 'Generating all… (may take a while)' : `Generate all (${bulk.reduce((s, r) => s + r.count, 0)})`}</button>
          </div>
        )}
      </div>

      {/* Schedule */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 800, color: INK, marginBottom: 12 }}>📅 Schedule a challenge for a batch</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ flex: 1, minWidth: 160 }}><span style={lbl}>Batch</span><select style={inp} value={sched.batchId} onChange={e => setSched({ ...sched, batchId: e.target.value })}><option value="">Select…</option>{batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}</select></label>
          <label style={{ minWidth: 150 }}><span style={lbl}>Date</span><input style={inp} type="date" value={sched.date} onChange={e => setSched({ ...sched, date: e.target.value })} /></label>
          <label style={{ flex: 2, minWidth: 200 }}><span style={lbl}>Problem</span><select style={inp} value={sched.problemId} onChange={e => setSched({ ...sched, problemId: e.target.value })}><option value="">Select…</option>{problems.map(p => <option key={p.id} value={p.id}>{p.title} · {p.difficulty}</option>)}</select></label>
          <label style={{ minWidth: 120 }}><span style={lbl}>Opens (IST)</span><input style={inp} type="time" value={sched.startTime} onChange={e => setSched({ ...sched, startTime: e.target.value })} /></label>
          <label style={{ minWidth: 120 }}><span style={lbl}>Closes (IST)</span><input style={inp} type="time" value={sched.endTime} onChange={e => setSched({ ...sched, endTime: e.target.value })} /></label>
          <button onClick={saveSchedule} style={{ background: BLUE, color: '#fff', border: 'none', borderRadius: 9, padding: '10px 18px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>Schedule</button>
        </div>
        <div style={{ fontSize: 12, color: SUB, marginTop: 6 }}>Leave times empty for all-day availability. With a window set, students can only attempt between Opens and Closes (IST); missed ones will show in the weekly report.</div>
        {schedList.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {schedList.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: '#475569', background: '#f8fafc', borderRadius: 8, padding: '6px 10px' }}>
                <b>{s.date}</b><span>· {batches.find(b => b._id === s.batchId)?.name || 'Batch'}</span><span>· {s.problem?.title || '—'}</span>{(s.startTime || s.endTime) && <span style={{ color: '#7c3aed', fontWeight: 700 }}>· 🕐 {s.startTime || '00:00'}–{s.endTime || '23:59'} IST</span>}
                <button onClick={() => removeSchedule(s.id)} style={{ marginLeft: 'auto', border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer' }}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bank */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
        <b style={{ fontSize: 13.5, color: INK }}>Bank ({total})</b>
        <select value={filter.category} onChange={e => setFilter({ ...filter, category: e.target.value })} style={{ ...inp, width: 'auto' }}><option value="">All categories</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
        <select value={filter.difficulty} onChange={e => setFilter({ ...filter, difficulty: e.target.value })} style={{ ...inp, width: 'auto' }}><option value="">All levels</option>{difficulties.map(d => <option key={d} value={d}>{d}</option>)}</select>
      </div>
      <div style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 12, overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13, minWidth: 780 }}>
          <thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}>{['Title', 'Category', 'Level', 'Lang', 'XP', 'Audience', 'Attempted', 'Solved', 'Active', ''].map(h => <th key={h} style={{ padding: '9px 12px', fontSize: 11, textTransform: 'uppercase', color: SUB }}>{h}</th>)}</tr></thead>
          <tbody>
            {problems.map(p => (
              <tr key={p.id} style={{ borderTop: '1px solid #eef1f6' }}>
                <td style={{ padding: '9px 12px', fontWeight: 600, color: INK }}>{p.title}</td>
                <td style={{ padding: '9px 12px', color: '#475569' }}>{p.category}</td>
                <td style={{ padding: '9px 12px' }}><span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: DIFF_COLORS[p.difficulty] || BLUE, borderRadius: 999, padding: '2px 9px', textTransform: 'capitalize' }}>{p.difficulty}</span></td>
                <td style={{ padding: '9px 12px', color: SUB }}>{p.language}</td>
                <td style={{ padding: '9px 12px', fontWeight: 700 }}>{p.xp}</td>
                {/* Who it reaches. "LMS" is also what an untagged problem resolves to, so the
                    column never renders a blank that could be read as "everyone". */}
                <td style={{ padding: '9px 12px' }}>
                  {((p as any).audiences?.length ? (p as any).audiences : ['lms']).map((a: string) => (
                    <span key={a} style={{ display: 'inline-block', marginRight: 4, borderRadius: 999, padding: '2px 8px', fontSize: 10.5, fontWeight: 700, background: a === 'careerpilot' ? '#e8f1fd' : '#eef7f0', color: a === 'careerpilot' ? '#1d4f91' : '#1a7a4a' }}>
                      {a === 'careerpilot' ? 'CareerPilot' : 'LMS'}
                    </span>
                  ))}
                </td>
                <td style={{ padding: '9px 12px', color: SUB }}>{(p as any).attemptCount ?? p.timesAssigned}</td>
                <td style={{ padding: '9px 12px', color: '#16a34a', fontWeight: 700 }}>{p.timesSolved}</td>
                <td style={{ padding: '9px 12px' }}><button onClick={() => toggle(p)} style={{ border: 'none', background: p.active ? '#dcfce7' : '#f1f5f9', color: p.active ? '#15803d' : '#94a3b8', borderRadius: 999, padding: '3px 10px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>{p.active ? '● Active' : '○ Off'}</button></td>
                <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                  <button onClick={() => { setEditId(p.id); setEditorOpen(true); }} style={{ border: 'none', background: 'none', color: BLUE, cursor: 'pointer', fontSize: 13, marginRight: 8 }}>Edit</button>
                  <button onClick={() => del(p)} style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 13 }}>Delete</button>
                </td>
              </tr>
            ))}
            {problems.length === 0 && <tr><td colSpan={10} style={{ padding: 26, color: SUB, textAlign: 'center' }}>No problems yet — generate or author some above.</td></tr>}
          </tbody>
        </table>
      </div>

      {editorOpen && <ProblemEditor id={editId} categories={categories} difficulties={difficulties} onClose={() => setEditorOpen(false)} onSaved={() => { setEditorOpen(false); loadProblems(); }} />}
    </div>
  );
};

// ── Manual create / edit modal ───────────────────────────────────────────────
const ProblemEditor: React.FC<{ id: string | null; categories: string[]; difficulties: string[]; onClose: () => void; onSaved: () => void }> = ({ id, categories, difficulties, onClose, onSaved }) => {
  const empty = { title: '', category: categories[0] || 'Brain Teasers', difficulty: 'easy', language: 'javascript', statement: '', constraints: '', notes: '', starterCode: '', hints: ['', '', ''], expectedTimeComplexity: '', expectedSpaceComplexity: '', imageUrl: '', videoUrl: '', referenceVideo: '', xp: 50, estimatedMinutes: 15, audiences: ['lms'], solutionUnlockAfterAttempts: 3, videoKey: '', solutionVideoKey: '', testCases: [{ input: '', expectedOutput: '', hidden: false }] as any[] };
  const [f, setF] = useState<any>(empty);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (id) thinkingLabApi.getProblem(id).then(r => { const p = r.problem; setF({ ...empty, ...p, hints: [...(p.hints || []), '', '', ''].slice(0, 3), testCases: p.testCases?.length ? p.testCases : empty.testCases }); }).catch(() => setErr('Failed to load')).finally(() => setLoading(false));
    // eslint-disable-next-line
  }, [id]);

  const save = async () => {
    setErr('');
    if (!f.title || !f.statement) { setErr('Title and statement are required.'); return; }
    const testCases = (f.testCases || []).filter((t: any) => t.expectedOutput !== '');
    if (!testCases.length) { setErr('Add at least one test case with an expected output.'); return; }
    const payload = { ...f, testCases, examples: testCases.filter((t: any) => !t.hidden).slice(0, 3), hints: f.hints.filter((h: string) => h.trim()) };
    try { setSaving(true); if (id) await thinkingLabApi.updateProblem(id, payload); else await thinkingLabApi.createProblem(payload); onSaved(); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const setTc = (i: number, k: string, v: any) => setF((p: any) => ({ ...p, testCases: p.testCases.map((t: any, j: number) => j === i ? { ...t, [k]: v } : t) }));

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', display: 'grid', placeItems: 'center', zIndex: 3000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 22, width: 720, maxWidth: '96vw', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: INK }}>{id ? 'Edit problem' : 'New problem'}</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: SUB }}>×</button>
        </div>
        {loading ? <div style={{ color: SUB }}>Loading…</div> : (
          <div style={{ display: 'grid', gap: 12 }}>
            <label><span style={lbl}>Title *</span><input style={inp} value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10 }}>
              <label><span style={lbl}>Category</span><select style={inp} value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
              <label><span style={lbl}>Difficulty</span><select style={inp} value={f.difficulty} onChange={e => setF({ ...f, difficulty: e.target.value })}>{difficulties.map(d => <option key={d} value={d}>{d}</option>)}</select></label>
              <label><span style={lbl}>Language</span><select style={inp} value={f.language} onChange={e => setF({ ...f, language: e.target.value })}>{TL_LANGS.map(l => <option key={l.v} value={l.v}>{l.l}</option>)}</select></label>
              <label><span style={lbl}>XP</span><input style={inp} type="number" value={f.xp} onChange={e => setF({ ...f, xp: parseInt(e.target.value) || 50 })} /></label>
            </div>
            <label><span style={lbl}>Problem statement *</span><textarea style={{ ...inp, minHeight: 90, fontFamily: 'inherit' }} value={f.statement} onChange={e => setF({ ...f, statement: e.target.value })} /></label>
            <label><span style={lbl}>Constraints</span><input style={inp} value={f.constraints} onChange={e => setF({ ...f, constraints: e.target.value })} /></label>
            <label><span style={lbl}>Starter code</span><textarea style={{ ...inp, minHeight: 60, fontFamily: 'ui-monospace,monospace', fontSize: 12.5 }} value={f.starterCode} onChange={e => setF({ ...f, starterCode: e.target.value })} /></label>

            <div>
              <span style={lbl}>Test cases * <span style={{ color: SUB, fontWeight: 400 }}>(reads stdin → stdout; mark some hidden)</span></span>
              {f.testCases.map((t: any, i: number) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                  <textarea placeholder="input" style={{ ...inp, minHeight: 38, fontFamily: 'ui-monospace,monospace', fontSize: 12 }} value={t.input} onChange={e => setTc(i, 'input', e.target.value)} />
                  <textarea placeholder="expected output" style={{ ...inp, minHeight: 38, fontFamily: 'ui-monospace,monospace', fontSize: 12 }} value={t.expectedOutput} onChange={e => setTc(i, 'expectedOutput', e.target.value)} />
                  <label style={{ fontSize: 11.5, color: SUB, display: 'flex', alignItems: 'center', gap: 4 }}><input type="checkbox" checked={t.hidden} onChange={e => setTc(i, 'hidden', e.target.checked)} />hidden</label>
                  <button onClick={() => setF((p: any) => ({ ...p, testCases: p.testCases.filter((_: any, j: number) => j !== i) }))} style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
              <button onClick={() => setF((p: any) => ({ ...p, testCases: [...p.testCases, { input: '', expectedOutput: '', hidden: true }] }))} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12.5, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>＋ Add test case</button>
            </div>

            <div>
              <span style={lbl}>Hints (up to 3, tiny → almost-complete)</span>
              {[0, 1, 2].map(i => <input key={i} style={{ ...inp, marginBottom: 6 }} placeholder={`Hint ${i + 1}`} value={f.hints[i] || ''} onChange={e => setF((p: any) => ({ ...p, hints: p.hints.map((h: string, j: number) => j === i ? e.target.value : h) }))} />)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label><span style={lbl}>Expected time complexity</span><input style={inp} placeholder="O(n)" value={f.expectedTimeComplexity} onChange={e => setF({ ...f, expectedTimeComplexity: e.target.value })} /></label>
              <label><span style={lbl}>Expected space complexity</span><input style={inp} placeholder="O(1)" value={f.expectedSpaceComplexity} onChange={e => setF({ ...f, expectedSpaceComplexity: e.target.value })} /></label>
              <label><span style={lbl}>Image URL (optional)</span><input style={inp} value={f.imageUrl} onChange={e => setF({ ...f, imageUrl: e.target.value })} /></label>
              <label><span style={lbl}>Problem explanation video URL</span><input style={inp} placeholder="https://…" value={f.videoUrl || ''} onChange={e => setF({ ...f, videoUrl: e.target.value })} /></label>
              <label><span style={lbl}>Solution video URL</span><input style={inp} placeholder="https://…" value={f.referenceVideo} onChange={e => setF({ ...f, referenceVideo: e.target.value })} /></label>
            </div>

            {/* WHO gets this problem. One bank feeds both products, so it has to be said
                per problem rather than inferred — and an untagged problem stays LMS-only,
                which is what every problem written before this field was. */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
              <span style={lbl}>Who can see this problem</span>
              <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
                {([['lms', 'LMS students'], ['careerpilot', 'CareerPilot members']] as const).map(([k, label]) => (
                  <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: INK, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={(f.audiences || []).includes(k)}
                      onChange={e => setF((p: any) => ({
                        ...p,
                        audiences: e.target.checked
                          ? [...new Set([...(p.audiences || []), k])]
                          : (p.audiences || []).filter((a: string) => a !== k),
                      }))}
                    />
                    {label}
                  </label>
                ))}
              </div>
              {!(f.audiences || []).length && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#b45309' }}>
                  Nobody is selected — this will be saved as LMS students only.
                </div>
              )}
              <label style={{ display: 'block', marginTop: 12 }}>
                <span style={lbl}>Unlock the solution after this many failed submissions</span>
                <input
                  style={{ ...inp, maxWidth: 120 }} type="number" min={0} max={20}
                  value={f.solutionUnlockAfterAttempts ?? 3}
                  onChange={e => setF({ ...f, solutionUnlockAfterAttempts: Math.max(0, Math.min(20, parseInt(e.target.value) || 0)) })}
                />
                <span style={{ fontSize: 11.5, color: SUB }}>
                  Counts submissions, not runs. 0 shows the solution immediately.
                </span>
              </label>
            </div>

            {err && <div style={{ color: '#dc2626', fontSize: 13, fontWeight: 600 }}>{err}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 9, padding: '10px 18px', fontWeight: 700, color: '#475569', cursor: 'pointer' }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ background: BLUE, color: '#fff', border: 'none', borderRadius: 9, padding: '10px 22px', fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Saving…' : id ? 'Save changes' : 'Create problem'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThinkingLabAdmin;
