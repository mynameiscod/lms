import React, { useEffect, useState } from 'react';
import { drillApi, DrillStudentRow, WeakConcept, AdminAssignment, LANGS } from '../../api/drillApi';
import { batchApi, userApi } from '../../api';

const rateColor = (n: number) => (n >= 70 ? '#16a34a' : n >= 40 ? '#d97706' : '#dc2626');
const PURPLE = '#6366f1';
const statusColor: Record<string, string> = { assigned: '#3b82f6', in_progress: '#d97706', completed: '#16a34a' };

const DrillsAdmin: React.FC = () => {
  const [students, setStudents] = useState<DrillStudentRow[]>([]);
  const [weak, setWeak] = useState<WeakConcept[]>([]);
  const [batches, setBatches] = useState<{ _id: string; name: string }[]>([]);
  const [batchId, setBatchId] = useState('');
  const [loading, setLoading] = useState(true);

  // Assign panel
  const [concepts, setConcepts] = useState<string[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<AdminAssignment[]>([]);
  const [form, setForm] = useState({ concept: '', difficulty: 'easy', language: 'javascript', batchId: '', studentIds: [] as string[], note: '', dueDate: '', customPrompt: '' });
  const [assigning, setAssigning] = useState(false);
  const [msg, setMsg] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [previewing, setPreviewing] = useState(false);

  const load = async (bId?: string) => {
    setLoading(true);
    try { const d = await drillApi.adminOverview(bId || undefined); setStudents(d.students); setWeak(d.weakConcepts); }
    finally { setLoading(false); }
  };
  const loadAssignments = async () => { try { setAssignments(await drillApi.listAssignments()); } catch { /* ignore */ } };

  useEffect(() => {
    batchApi.getBatches().then((b: any) => setBatches((Array.isArray(b) ? b : (b?.data || b?.batches || [])).map((x: any) => ({ _id: x._id, name: x.name })))).catch(() => {});
    drillApi.concepts().then(c => { setConcepts(c); setForm(f => ({ ...f, concept: c[0] || '' })); }).catch(() => {});
    userApi.getUsers().then((res: any) => setRoster((res.users || res.data || res || []).filter((u: any) => u.role === 'STUDENT' && u.isActive !== false))).catch(() => {});
    load(); loadAssignments();
  }, []);

  const rosterForBatch = form.batchId ? roster.filter(u => String(u.batchId?._id || u.batchId) === form.batchId) : roster;
  const toggleStudent = (id: string) => setForm(f => ({ ...f, studentIds: f.studentIds.includes(id) ? f.studentIds.filter(s => s !== id) : [...f.studentIds, id] }));

  // Admin-only: AI-generate the problem to review before assigning. (Students never
  // trigger generation — this keeps AI cost admin-controlled.)
  const doPreview = async () => {
    if (!form.concept) { setMsg('Pick a concept'); return; }
    try {
      setPreviewing(true); setMsg(''); setPreview(null);
      const p = await drillApi.previewProblem({ concept: form.concept, difficulty: form.difficulty, language: form.language, customPrompt: form.customPrompt || undefined });
      setPreview(p);
    } catch (e: any) { setMsg(e?.response?.data?.message || 'Could not generate a problem. Try again.'); }
    finally { setPreviewing(false); }
  };

  const submitAssign = async () => {
    if (!form.concept) { setMsg('Pick a concept'); return; }
    if (!form.batchId && form.studentIds.length === 0) { setMsg('Pick a batch or select students'); return; }
    try {
      setAssigning(true); setMsg('');
      const payload: any = { concept: form.concept, difficulty: form.difficulty, language: form.language, note: form.note || undefined, dueDate: form.dueDate || undefined, customPrompt: form.customPrompt || undefined };
      if (preview) payload.problem = preview; // reuse the previewed problem (no second AI call)
      if (form.studentIds.length) payload.studentIds = form.studentIds; else payload.batchId = form.batchId;
      const r = await drillApi.assign(payload);
      setMsg(`✅ Assigned to ${r.created} student${r.created === 1 ? '' : 's'}.`);
      setForm(f => ({ ...f, studentIds: [], note: '', dueDate: '', customPrompt: '' })); setPreview(null);
      loadAssignments();
    } catch (e: any) { setMsg(e?.response?.data?.message || 'Failed to assign'); }
    finally { setAssigning(false); }
  };

  const inp: React.CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 11px', fontSize: 13.5, width: '100%', boxSizing: 'border-box' };
  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 };

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: 22 }}>
      <h1 style={{ margin: 0, fontSize: 24, color: '#0f172a' }}>Logic Building Problems</h1>
      <p style={{ color: '#64748b', fontSize: 13.5 }}>Assign logic-building problems to students, and track who's practising, their solve rate, and which concepts the batch struggles with.</p>

      {/* Assign a problem */}
      <div style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 14, padding: 18, margin: '14px 0' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>🧩 Assign a problem</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
          <label><span style={lbl}>Concept</span><select style={inp} value={form.concept} onChange={e => { setForm({ ...form, concept: e.target.value }); setPreview(null); }}>{concepts.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
          <label><span style={lbl}>Level</span><select style={inp} value={form.difficulty} onChange={e => { setForm({ ...form, difficulty: e.target.value }); setPreview(null); }}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
          <label><span style={lbl}>Language</span><select style={inp} value={form.language} onChange={e => { setForm({ ...form, language: e.target.value }); setPreview(null); }}>{LANGS.map(l => <option key={l.v} value={l.v}>{l.l}</option>)}</select></label>
          <label><span style={lbl}>Batch</span><select style={inp} value={form.batchId} onChange={e => setForm({ ...form, batchId: e.target.value, studentIds: [] })}><option value="">— pick students below —</option>{batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}</select></label>
          <label><span style={lbl}>Due date (optional)</span><input style={inp} type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></label>
        </div>
        <label style={{ display: 'block', marginTop: 12 }}><span style={lbl}>Note to students (optional)</span><input style={inp} placeholder="e.g. Focus on loops after today's class" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} /></label>

        <label style={{ display: 'block', marginTop: 12 }}><span style={lbl}>AI brief (optional) — tell the AI what kind of problem to create</span>
          <textarea style={{ ...inp, minHeight: 60, fontFamily: 'inherit', resize: 'vertical' }} placeholder="e.g. A real-world word problem about splitting a bill among friends using division and remainder" value={form.customPrompt} onChange={e => { setForm({ ...form, customPrompt: e.target.value }); setPreview(null); }} /></label>

        {/* Admin generates & reviews the problem with AI before assigning */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
          <button onClick={doPreview} disabled={previewing} style={{ background: '#fff', color: PURPLE, border: `1.5px solid ${PURPLE}`, borderRadius: 9, padding: '9px 16px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>{previewing ? 'Generating…' : preview ? '↻ Regenerate' : '✨ Generate problem with AI'}</button>
          {preview && <span style={{ fontSize: 12.5, color: '#16a34a', fontWeight: 600 }}>✓ Problem ready — review below, then assign</span>}
        </div>

        {preview && (
          <div style={{ marginTop: 12, background: '#f8fafc', border: '1px solid #e6e8f0', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: PURPLE, marginBottom: 6 }}>{preview.concept} · {preview.difficulty} · {preview.language}</div>
            <div style={{ fontSize: 14, color: '#0f172a', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{preview.prompt}</div>
            {preview.examples?.[0] && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                <div><div style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 700 }}>EXAMPLE INPUT</div><pre style={{ margin: 0, fontFamily: 'ui-monospace,monospace', fontSize: 12, color: '#334155', whiteSpace: 'pre-wrap' }}>{preview.examples[0].input || '(none)'}</pre></div>
                <div><div style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 700 }}>EXPECTED OUTPUT</div><pre style={{ margin: 0, fontFamily: 'ui-monospace,monospace', fontSize: 12, color: '#334155', whiteSpace: 'pre-wrap' }}>{preview.examples[0].expectedOutput}</pre></div>
              </div>
            )}
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>{(preview.testCases || []).length} test cases · verified</div>
          </div>
        )}

        {!form.batchId && (
          <div style={{ marginTop: 12 }}>
            <span style={lbl}>Select students {form.studentIds.length > 0 && <b style={{ color: PURPLE }}>({form.studentIds.length} selected)</b>}</span>
            <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid #eef1f6', borderRadius: 10, padding: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 4 }}>
              {rosterForBatch.length === 0 ? <span style={{ color: '#94a3b8', fontSize: 13, padding: 6 }}>No students found.</span> :
                rosterForBatch.map(u => (
                  <label key={u._id} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, padding: '4px 6px', borderRadius: 6, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.studentIds.includes(u._id)} onChange={() => toggleStudent(u._id)} />
                    {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email}
                  </label>
                ))}
            </div>
          </div>
        )}
        {form.batchId && <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 8 }}>Will assign to all active students in this batch.</div>}

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 14 }}>
          <button onClick={submitAssign} disabled={assigning || !preview} title={!preview ? 'Generate the problem with AI first' : ''} style={{ background: preview ? PURPLE : '#cbd5e1', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: preview ? 'pointer' : 'not-allowed' }}>{assigning ? 'Assigning…' : '➤ Assign problem'}</button>
          {!preview && <span style={{ fontSize: 12.5, color: '#94a3b8' }}>Generate a problem with AI first, then assign.</span>}
          {msg && <span style={{ fontSize: 13, color: msg.startsWith('✅') ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{msg}</span>}
        </div>
      </div>

      {/* Recent assignments */}
      {assignments.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 12, marginBottom: 16, overflowX: 'auto' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', padding: '12px 14px 0' }}>Recent assignments</div>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13, minWidth: 620 }}>
            <thead><tr style={{ textAlign: 'left' }}>{['Student', 'Concept', 'Level', 'Due', 'Status', 'Score'].map(h => <th key={h} style={{ padding: '8px 14px', fontSize: 11, textTransform: 'uppercase', color: '#94a3b8' }}>{h}</th>)}</tr></thead>
            <tbody>
              {assignments.slice(0, 50).map(a => (
                <tr key={a._id} style={{ borderTop: '1px solid #eef1f6' }}>
                  <td style={{ padding: '8px 14px', fontWeight: 600, color: '#0f172a' }}>{a.studentName}</td>
                  <td style={{ padding: '8px 14px', color: '#475569' }}>{a.concept}</td>
                  <td style={{ padding: '8px 14px', color: '#64748b', textTransform: 'capitalize' }}>{a.difficulty}</td>
                  <td style={{ padding: '8px 14px', color: '#64748b' }}>{a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '—'}</td>
                  <td style={{ padding: '8px 14px' }}><span style={{ fontSize: 11.5, fontWeight: 700, color: '#fff', background: statusColor[a.status] || '#94a3b8', borderRadius: 999, padding: '2px 9px', textTransform: 'capitalize' }}>{a.status.replace('_', ' ')}</span></td>
                  <td style={{ padding: '8px 14px', fontWeight: 700 }}>{a.score != null ? a.score : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Practice overview */}
      <div style={{ margin: '14px 0' }}>
        <select value={batchId} onChange={e => { setBatchId(e.target.value); load(e.target.value); }} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 12px', fontSize: 13.5 }}>
          <option value="">All students</option>
          {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
      </div>

      {loading ? <div style={{ color: '#94a3b8', padding: 30 }}>Loading…</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
          <div style={{ overflowX: 'auto', border: '1px solid #e6e8f0', borderRadius: 12 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13.5, minWidth: 480 }}>
              <thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}>{['Student', 'Solved', 'Attempts', 'Avg score', 'Last active'].map(h => <th key={h} style={{ padding: '10px 12px', fontSize: 11, textTransform: 'uppercase', color: '#64748b' }}>{h}</th>)}</tr></thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.studentId} style={{ borderTop: '1px solid #eef1f6' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>{s.name}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#16a34a' }}>{s.solved}</td>
                    <td style={{ padding: '10px 12px', color: '#64748b' }}>{s.attempts}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>{s.avg || '—'}</td>
                    <td style={{ padding: '10px 12px', color: '#94a3b8', fontSize: 12.5 }}>{s.last ? new Date(s.last).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
                {students.length === 0 && <tr><td colSpan={5} style={{ padding: 24, color: '#94a3b8', textAlign: 'center' }}>No drill activity yet.</td></tr>}
              </tbody>
            </table>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>Concept solve rate</div>
            {weak.length === 0 ? <div style={{ color: '#94a3b8', fontSize: 13 }}>No data yet.</div> : weak.map(c => (
              <div key={c.concept} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 3 }}><span style={{ color: '#475569', fontWeight: 600 }}>{c.concept}</span><b style={{ color: rateColor(c.rate) }}>{c.rate}%</b></div>
                <div style={{ height: 6, background: '#eef1f6', borderRadius: 6, overflow: 'hidden' }}><div style={{ width: `${c.rate}%`, height: '100%', background: rateColor(c.rate) }} /></div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{c.solved}/{c.total} solved</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DrillsAdmin;
