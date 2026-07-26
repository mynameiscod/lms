import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { battleAdminApi, TechBattle } from '../../api/battleApi';

const toIso = (local: string) => (local ? new Date(local).toISOString() : undefined);
const badge = (s?: string) => s === 'live' ? { bg: '#dcfce7', c: '#15803d' } : s === 'closed' ? { bg: '#f1f5f9', c: '#64748b' } : { bg: '#fef3c7', c: '#b45309' };

const BattlesAdmin: React.FC = () => {
  const nav = useNavigate();
  const [battles, setBattles] = useState<TechBattle[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [f, setF] = useState<any>({ title: '', quizId: '', prize: '', description: '', startAt: '', endAt: '', registerClosesAt: '', joinCutoffMins: 15, status: 'live', registrationMode: 'approval', proofNote: '' });

  const load = async () => {
    setLoading(true);
    try { const [b, q] = await Promise.all([battleAdminApi.list(), battleAdminApi.availableQuizzes()]); setBattles(b); setQuizzes(q); } catch { /* */ }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    setSaving(true); setMsg('');
    try {
      const b = await battleAdminApi.create({
        title: f.title, quizId: f.quizId, prize: f.prize, description: f.description,
        startAt: toIso(f.startAt)!, endAt: toIso(f.endAt)!, registerClosesAt: toIso(f.registerClosesAt),
        joinCutoffMins: Number(f.joinCutoffMins), status: f.status,
        registrationMode: f.registrationMode, proofNote: f.proofNote,
      } as any);
      setShowCreate(false);
      nav(`/admin/battles/${b._id}`);
    } catch (e: any) { setMsg(e?.response?.data?.message || 'Create failed'); }
    setSaving(false);
  };

  const set = (k: string, v: any) => setF((s: any) => ({ ...s, [k]: v }));

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '4px 4px 60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 23, fontWeight: 800, color: '#0f172a', margin: 0 }}>⚔️ Tech Battles</h1>
          <p style={{ color: '#64748b', fontSize: 13.5, margin: '4px 0 0' }}>Public & college competitions. Create once — registration, links, reminders and grading are automatic.</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={primary}>+ Create Battle</button>
      </div>

      {loading ? <div style={{ padding: 40, color: '#64748b' }}>Loading…</div> : (
        <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>
          {battles.length === 0 && <div style={card}>No battles yet. Create your first one.</div>}
          {battles.map(b => {
            const bd = badge(b.status);
            return (
              <div key={b._id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, cursor: 'pointer' }} onClick={() => nav(`/admin/battles/${b._id}`)}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{b.title}</span>
                    <span style={{ background: bd.bg, color: bd.c, fontSize: 11, fontWeight: 800, padding: '2px 9px', borderRadius: 99 }}>{(b.status || 'draft').toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 3 }}>Starts {new Date(b.startAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} · {b.registrations || 0} registered · {b.submissions || 0} submitted</div>
                </div>
                <span style={{ color: '#1d4ed8', fontWeight: 700, fontSize: 13 }}>Manage →</span>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <div style={overlay} onClick={() => setShowCreate(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Create Tech Battle</div>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', fontSize: 24, color: '#94a3b8', cursor: 'pointer' }}>×</button>
            </div>
            <label style={lbl}>Title *</label>
            <input style={input} value={f.title} onChange={e => set('title', e.target.value)} placeholder="Java Battle – Week 12" />
            <label style={lbl}>Quiz *</label>
            <select style={input} value={f.quizId} onChange={e => set('quizId', e.target.value)}>
              <option value="">Select a quiz…</option>
              {quizzes.map(q => <option key={q._id} value={q._id}>{q.title} ({q.totalQuestions}Q · {q.totalMarks}m · {q.totalTime}min)</option>)}
            </select>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={lbl}>Exam starts *</label><input style={input} type="datetime-local" value={f.startAt} onChange={e => set('startAt', e.target.value)} /></div>
              <div><label style={lbl}>Exam ends *</label><input style={input} type="datetime-local" value={f.endAt} onChange={e => set('endAt', e.target.value)} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={lbl}>Registration closes</label><input style={input} type="datetime-local" value={f.registerClosesAt} onChange={e => set('registerClosesAt', e.target.value)} /></div>
              <div><label style={lbl}>Late-join cutoff (min)</label><input style={input} type="number" value={f.joinCutoffMins} onChange={e => set('joinCutoffMins', e.target.value)} /></div>
            </div>
            <label style={lbl}>Registration mode</label>
            <select style={input} value={f.registrationMode} onChange={e => set('registrationMode', e.target.value)}>
              <option value="approval">Approval — collect proofs, admin approves, then link is emailed</option>
              <option value="auto">Auto — self-serve OTP, link issued instantly (no approval)</option>
            </select>
            {f.registrationMode === 'approval' && (
              <><label style={lbl}>Proof instructions (shown on the form)</label>
              <input style={input} value={f.proofNote} onChange={e => set('proofNote', e.target.value)} placeholder="Upload your college ID card" /></>
            )}
            <label style={lbl}>Prize</label>
            <input style={input} value={f.prize} onChange={e => set('prize', e.target.value)} placeholder="₹5,000 + certificate" />
            <label style={lbl}>Short description</label>
            <input style={input} value={f.description} onChange={e => set('description', e.target.value)} />
            {msg && <div style={{ color: '#b91c1c', fontSize: 13, marginTop: 8 }}>{msg}</div>}
            <button style={{ ...primary, width: '100%', marginTop: 16, opacity: (saving || !f.title || !f.quizId || !f.startAt || !f.endAt) ? 0.6 : 1 }} disabled={saving || !f.title || !f.quizId || !f.startAt || !f.endAt} onClick={create}>{saving ? 'Creating…' : 'Create & open'}</button>
          </div>
        </div>
      )}
    </div>
  );
};

const card: React.CSSProperties = { background: '#fff', border: '1px solid #eef1f6', borderRadius: 14, padding: '16px 18px' };
const primary: React.CSSProperties = { background: 'linear-gradient(90deg,#1d4ed8,#4f46e5)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', fontWeight: 800, fontSize: 14, cursor: 'pointer' };
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' };
const modal: React.CSSProperties = { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, padding: 22, boxShadow: '0 24px 70px rgba(0,0,0,.3)' };
const lbl: React.CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 700, color: '#475569', margin: '12px 0 5px' };
const input: React.CSSProperties = { width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '10px 12px', fontSize: 14, color: '#0f172a', boxSizing: 'border-box' };

export default BattlesAdmin;
