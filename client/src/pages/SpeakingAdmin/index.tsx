import React, { useEffect, useState } from 'react';
import { speakingApi, SpeakingTask, SpeakingSubmission, DAYS } from '../../api/speakingApi';
import { batchApi } from '../../api';

const PURPLE = '#6366f1';
const scoreColor = (n: number) => (n >= 75 ? '#16a34a' : n >= 50 ? '#d97706' : '#dc2626');
const inp: React.CSSProperties = { width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 11px', fontSize: 13.5, boxSizing: 'border-box' };
const field = (label: string, node: React.ReactNode) => <label style={{ display: 'block' }}><span style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>{label}</span>{node}</label>;
interface Batch { _id: string; name: string; }

const SpeakingAdmin: React.FC = () => {
  const [tasks, setTasks] = useState<SpeakingTask[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subs, setSubs] = useState<{ title: string; rows: SpeakingSubmission[] } | null>(null);
  const [vurl, setVurl] = useState<Record<string, string>>({});
  const blank = { title: '', prompt: '', instructions: '', days: ['Mon', 'Thu'] as string[], batchIds: [] as string[], startDate: '', endDate: '', minSeconds: 30, maxSeconds: 120 };
  const [form, setForm] = useState<any>(blank);

  const load = async () => {
    setLoading(true);
    try {
      const [t, b] = await Promise.all([speakingApi.listTasks(), batchApi.getBatches().catch(() => [])]);
      setTasks(t);
      setBatches((Array.isArray(b) ? b : (b?.data || b?.batches || [])).map((x: any) => ({ _id: x._id, name: x.name })));
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const batchName = (id: string) => batches.find(b => b._id === id)?.name || 'batch';

  const submit = async () => {
    if (!form.title.trim() || !form.prompt.trim()) return alert('Title and topic are required.');
    if (!form.days.length) return alert('Pick at least one day.');
    setSaving(true);
    try {
      await speakingApi.createTask({ ...form, days: form.days.join(','), batchIds: form.batchIds.join(',') });
      setShowForm(false); setForm(blank); await load();
    } catch (e: any) { alert(e?.response?.data?.message || 'Failed to create task.'); } finally { setSaving(false); }
  };
  const toggle = (list: string[], v: string) => list.includes(v) ? list.filter(x => x !== v) : [...list, v];
  const setStatus = async (t: SpeakingTask, status: string) => { await speakingApi.updateTask(t._id, { status }); await load(); };
  const del = async (t: SpeakingTask) => { if (window.confirm(`Delete "${t.title}"?`)) { await speakingApi.deleteTask(t._id); await load(); } };
  const openSubs = async (t: SpeakingTask) => setSubs({ title: t.title, rows: await speakingApi.listSubmissions(t._id) });
  const play = async (id: string) => { try { const u = await speakingApi.playUrl(id); setVurl(v => ({ ...v, [id]: u })); } catch { /* ignore */ } };

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 24, color: '#0f172a' }}>🎤 Speaking Tasks</h1>
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowForm(true)} style={{ background: PURPLE, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>+ New speaking task</button>
      </div>
      <p style={{ color: '#64748b', fontSize: 13.5 }}>Assign recurring speaking practice (e.g. Self Introduction, twice a week) to a batch. Students record; an AI coach scores and gives feedback.</p>

      {loading ? <div style={{ color: '#94a3b8', padding: 30 }}>Loading…</div> : (
        <div style={{ overflowX: 'auto', border: '1px solid #e6e8f0', borderRadius: 12, marginTop: 8 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13.5, minWidth: 760 }}>
            <thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}>{['Task', 'Schedule', 'Batches', 'Length', 'Submissions', 'Status', ''].map(h => <th key={h} style={{ padding: '10px 12px', fontSize: 11, textTransform: 'uppercase', color: '#64748b' }}>{h}</th>)}</tr></thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t._id} style={{ borderTop: '1px solid #eef1f6' }}>
                  <td style={{ padding: '10px 12px' }}><div style={{ fontWeight: 600, color: '#0f172a' }}>{t.title}</div><div style={{ fontSize: 12, color: '#94a3b8', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.prompt}</div></td>
                  <td style={{ padding: '10px 12px', color: '#475569' }}>{t.days.join(', ')}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12.5, color: '#475569' }}>{!t.batchIds || t.batchIds.length === 0 ? <span style={{ color: '#94a3b8' }}>All</span> : t.batchIds.map(batchName).join(', ')}</td>
                  <td style={{ padding: '10px 12px', color: '#64748b' }}>{t.minSeconds}–{t.maxSeconds}s</td>
                  <td style={{ padding: '10px 12px' }}><button onClick={() => openSubs(t)} style={{ background: 'none', border: 'none', color: PURPLE, fontWeight: 700, cursor: 'pointer' }}>{t.submissionCount || 0} ›</button></td>
                  <td style={{ padding: '10px 12px' }}><span style={{ color: t.status === 'active' ? '#16a34a' : '#94a3b8', fontWeight: 700, textTransform: 'capitalize' }}>{t.status}</span></td>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                    <button onClick={() => setStatus(t, t.status === 'active' ? 'archived' : 'active')} style={ab('#b45309')}>{t.status === 'active' ? 'Archive' : 'Activate'}</button>
                    <button onClick={() => del(t)} style={ab('#dc2626')}>Delete</button>
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && <tr><td colSpan={7} style={{ padding: 24, color: '#94a3b8', textAlign: 'center' }}>No speaking tasks yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div onClick={() => !saving && setShowForm(false)} style={backdrop}>
          <div onClick={e => e.stopPropagation()} style={{ ...card, width: 'min(600px,100%)' }}>
            <div style={{ padding: '15px 20px', background: PURPLE, color: '#fff', fontWeight: 700, borderRadius: '16px 16px 0 0' }}>New speaking task</div>
            <div style={{ padding: 20, display: 'grid', gap: 12 }}>
              {field('Title *', <input style={inp} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Self Introduction" />)}
              {field('Topic / what to speak on *', <textarea style={{ ...inp, minHeight: 56, resize: 'vertical' }} value={form.prompt} onChange={e => setForm({ ...form, prompt: e.target.value })} placeholder="Introduce yourself in 1–2 minutes: your background, skills and goals." />)}
              {field('Prep instructions (optional)', <input style={inp} value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} placeholder="Structure: greeting → background → strengths → goal" />)}
              {field('Days of the week *', (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {DAYS.map(d => { const on = form.days.includes(d); return <button key={d} type="button" onClick={() => setForm({ ...form, days: toggle(form.days, d) })} style={{ border: `1.5px solid ${on ? PURPLE : '#e2e8f0'}`, background: on ? '#eef0fe' : '#fff', color: on ? PURPLE : '#475569', borderRadius: 8, padding: '6px 11px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>{d}</button>; })}
                </div>
              ))}
              {field(`Batches ${form.batchIds.length ? `(${form.batchIds.length})` : '(all students)'}`, (
                batches.length === 0 ? <div style={{ fontSize: 12, color: '#94a3b8' }}>No batches found.</div> :
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxHeight: 110, overflow: 'auto' }}>
                  {batches.map(b => { const on = form.batchIds.includes(b._id); return <button key={b._id} type="button" onClick={() => setForm({ ...form, batchIds: toggle(form.batchIds, b._id) })} style={{ border: `1.5px solid ${on ? PURPLE : '#e2e8f0'}`, background: on ? '#eef0fe' : '#fff', color: on ? PURPLE : '#475569', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{on ? '✓ ' : ''}{b.name}</button>; })}
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {field('Start date', <input type="date" style={inp} value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />)}
                {field('End date (optional)', <input type="date" style={inp} value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {field('Min seconds', <input type="number" style={inp} value={form.minSeconds} onChange={e => setForm({ ...form, minSeconds: e.target.value })} />)}
                {field('Max seconds', <input type="number" style={inp} value={form.maxSeconds} onChange={e => setForm({ ...form, maxSeconds: e.target.value })} />)}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={submit} disabled={saving} style={{ background: PURPLE, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>{saving ? 'Saving…' : 'Create task'}</button>
                <button onClick={() => setShowForm(false)} style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 10, padding: '11px 16px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {subs && (
        <div onClick={() => setSubs(null)} style={backdrop}>
          <div onClick={e => e.stopPropagation()} style={{ ...card, width: 'min(640px,100%)' }}>
            <div style={{ padding: '15px 20px', background: '#0f172a', color: '#fff', fontWeight: 700, borderRadius: '16px 16px 0 0' }}>Submissions — {subs.title}</div>
            <div style={{ padding: 16, maxHeight: '75vh', overflow: 'auto' }}>
              {subs.rows.length === 0 ? <div style={{ color: '#94a3b8' }}>No submissions yet.</div> : subs.rows.map(s => (
                <div key={s._id} style={{ borderBottom: '1px solid #f1f5f9', padding: '10px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13, color: scoreColor(s.score?.overall || 0), background: '#f8fafc' }}>{s.score?.overall ?? '—'}</div>
                    <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 13.5 }}>{s.student?.name || s.studentName}</div><div style={{ fontSize: 11.5, color: '#94a3b8' }}>{new Date(s.createdAt).toLocaleString()} · {s.durationSec}s · due {s.dueDate}</div></div>
                    {vurl[s._id] ? null : <button onClick={() => play(s._id)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>▶ Watch</button>}
                  </div>
                  {vurl[s._id] && <video src={vurl[s._id]} controls style={{ width: '100%', maxWidth: 380, borderRadius: 10, marginTop: 8 }} />}
                  {s.feedback?.summary && <div style={{ fontSize: 12.5, color: '#475569', marginTop: 6 }}>{s.feedback.summary}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ab = (color: string): React.CSSProperties => ({ background: 'none', border: 'none', color, fontWeight: 700, fontSize: 12.5, cursor: 'pointer', marginRight: 10 });
const backdrop: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 24, overflowY: 'auto' };
const card: React.CSSProperties = { background: '#fff', borderRadius: 16, margin: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.25)', overflow: 'hidden' };

export default SpeakingAdmin;
