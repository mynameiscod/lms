import React, { useCallback, useEffect, useState } from 'react';
import { communicationApi, CommChallenge } from '../../api/communicationApi';
import { batchApi } from '../../api';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const scoreColor = (s: number) => (s >= 80 ? '#16a34a' : s >= 60 ? '#d97706' : s >= 40 ? '#ea580c' : '#dc2626');
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,.05)' };
const btn = (bg: string): React.CSSProperties => ({ padding: '8px 14px', background: bg, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' });
const sBtn = (bg: string): React.CSSProperties => ({ padding: '3px 9px', background: bg, color: '#fff', border: 'none', borderRadius: 6, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' });
const input: React.CSSProperties = { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13.5, width: '100%', outline: 'none' };
const th: React.CSSProperties = { textAlign: 'left', fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: '#6b7280', padding: '10px 12px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc', whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontSize: 13.5, color: '#374151' };

const RISK: Record<string, { label: string; color: string; bg: string }> = {
  ok: { label: 'On track', color: '#166534', bg: '#f0fdf4' },
  low_score: { label: 'Low score', color: '#b45309', bg: '#fffbeb' },
  streak_broken: { label: 'Streak broken', color: '#b45309', bg: '#fffbeb' },
  no_activity: { label: 'No activity', color: '#b91c1c', bg: '#fef2f2' },
};

const Stat: React.FC<{ label: string; value: React.ReactNode; color?: string }> = ({ label, value, color }) => (
  <div style={{ ...card, padding: '16px 18px' }}>
    <div style={{ fontSize: 26, fontWeight: 800, color: color || '#111827' }}>{value}</div>
    <div style={{ fontSize: 12.5, color: '#6b7280', marginTop: 2 }}>{label}</div>
  </div>
);

const CommunicationLabAdmin: React.FC = () => {
  const [tab, setTab] = useState<'dashboard' | 'challenges' | 'students'>('dashboard');
  const [batches, setBatches] = useState<{ _id: string; name: string }[]>([]);

  // dashboard
  const [dash, setDash] = useState<any>(null);
  // challenges
  const [challenges, setChallenges] = useState<CommChallenge[]>([]);
  const [editing, setEditing] = useState<CommChallenge | 'new' | null>(null);
  // students
  const [students, setStudents] = useState<any[]>([]);
  const [batchFilter, setBatchFilter] = useState('');
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try { const r: any = await batchApi.getBatches(); const list = r?.data || r?.batches || r || []; setBatches((Array.isArray(list) ? list : []).map((b: any) => ({ _id: b._id, name: b.name || b.batchName || 'Batch' }))); } catch { /* */ }
    })();
  }, []);

  useEffect(() => { if (tab === 'dashboard') communicationApi.adminDashboard(todayStr()).then(setDash).catch(() => {}); }, [tab]);
  const loadChallenges = useCallback(() => communicationApi.listChallenges().then(setChallenges).catch(() => {}), []);
  // Per-batch scheduling with availability window
  const [sched, setSched] = useState({ batchId: '', date: '', challengeId: '', startTime: '', endTime: '' });
  const [schedList, setSchedList] = useState<any[]>([]);
  const [schedMsg, setSchedMsg] = useState('');
  const loadSchedule = useCallback(() => communicationApi.listSchedule().then((r) => setSchedList(r.schedule || [])).catch(() => {}), []);
  const saveSchedule = async () => {
    if (!sched.batchId || !sched.date || !sched.challengeId) { setSchedMsg('Pick batch, date and challenge.'); return; }
    if (sched.startTime && sched.endTime && sched.endTime <= sched.startTime) { setSchedMsg('End time must be after start time.'); return; }
    try { await communicationApi.scheduleChallenge(sched); setSchedMsg('✅ Scheduled.'); setSched({ batchId: '', date: '', challengeId: '', startTime: '', endTime: '' }); loadSchedule(); }
    catch (e: any) { setSchedMsg(e?.response?.data?.message || 'Failed to schedule.'); }
  };
  const removeSchedule = async (id: string) => { await communicationApi.deleteSchedule(id); loadSchedule(); };
  const schedInp: React.CSSProperties = { padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13.5, background: '#fff', color: '#0f172a' };
  useEffect(() => { if (tab === 'challenges') { loadChallenges(); loadSchedule(); } }, [tab, loadChallenges, loadSchedule]);
  const loadStudents = useCallback(() => communicationApi.adminStudents(batchFilter || undefined).then((r) => setStudents(r.students)).catch(() => {}), [batchFilter]);
  useEffect(() => { if (tab === 'students') loadStudents(); }, [tab, loadStudents]);

  const batchName = (id: string | null) => (id ? batches.find((b) => b._id === id)?.name || '—' : '—');

  const move = async (i: number, dir: -1 | 1) => {
    const arr = [...challenges];
    const j = i + dir; if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setChallenges(arr);
    await communicationApi.reorderChallenges(arr.map((c) => c._id));
  };
  const toggleActive = async (c: CommChallenge) => { await communicationApi.updateChallenge(c._id, { active: !c.active }); loadChallenges(); };
  const remove = async (c: CommChallenge) => { if (window.confirm(`Delete "${c.title}"?`)) { await communicationApi.deleteChallenge(c._id); loadChallenges(); } };

  const tabBtn = (k: typeof tab, label: string) => (
    <button onClick={() => setTab(k)} style={{ padding: '8px 16px', border: 'none', borderBottom: tab === k ? '2px solid #1a5490' : '2px solid transparent', background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: tab === k ? '#1a5490' : '#6b7280' }}>{label}</button>
  );

  return (
    <div style={{ padding: 24, maxWidth: 1120, margin: '0 auto' }}>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>🎙 Communication Lab — Manage</h2>
      <p style={{ margin: '4px 0 16px', color: '#6b7280', fontSize: 14 }}>Control challenges, assign by batch, and monitor daily practice.</p>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e5e7eb', marginBottom: 20, flexWrap: 'wrap' }}>
        {tabBtn('dashboard', 'Dashboard')}{tabBtn('challenges', 'Challenges')}{tabBtn('students', 'Students')}
      </div>

      {tab === 'dashboard' && (!dash ? <div style={{ color: '#9ca3af', padding: 40, textAlign: 'center' }}>Loading…</div> : (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
            <Stat label="Total students" value={dash.totalStudents} />
            <Stat label="Completed today" value={dash.completedToday} color="#16a34a" />
            <Stat label="Pending today" value={dash.pendingToday} color="#d97706" />
            <Stat label="Active (30d)" value={dash.activeStudents30d} />
            <Stat label="Avg score (30d)" value={`${dash.avgScore}`} color={scoreColor(dash.avgScore)} />
            <Stat label="Attempts (30d)" value={dash.totalAttempts30d} />
          </div>
          <div style={{ ...card, padding: 18 }}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Batch performance (30 days)</div>
            {(!dash.byBatch || dash.byBatch.length === 0) ? <div style={{ color: '#9ca3af', fontSize: 13 }}>No attempts yet.</div> : (
              <div style={{ display: 'grid', gap: 8 }}>
                {dash.byBatch.map((b: any) => (
                  <div key={b.batchId} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 160, fontSize: 13, color: '#374151' }}>{batchName(b.batchId === 'none' ? null : b.batchId)}</div>
                    <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 6, height: 18, overflow: 'hidden' }}>
                      <div style={{ width: `${b.avg}%`, background: scoreColor(b.avg), height: '100%' }} />
                    </div>
                    <div style={{ width: 90, fontSize: 12.5, color: '#6b7280', textAlign: 'right' }}>{b.avg} avg · {b.attempts}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      {tab === 'challenges' && (
        <div>
          {/* Per-batch schedule with availability window */}
          <div style={{ ...card, padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0b2e63', marginBottom: 10 }}>📅 Schedule a challenge for a batch (with time window)</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label style={{ flex: 1, minWidth: 150, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#475569' }}>Batch
                <select value={sched.batchId} onChange={(e) => setSched({ ...sched, batchId: e.target.value })} style={schedInp}><option value="">Select…</option>{batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}</select></label>
              <label style={{ minWidth: 140, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#475569' }}>Date
                <input type="date" value={sched.date} onChange={(e) => setSched({ ...sched, date: e.target.value })} style={schedInp} /></label>
              <label style={{ flex: 2, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#475569' }}>Challenge
                <select value={sched.challengeId} onChange={(e) => setSched({ ...sched, challengeId: e.target.value })} style={schedInp}><option value="">Select…</option>{challenges.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}</select></label>
              <label style={{ minWidth: 110, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#475569' }}>Opens (IST)
                <input type="time" value={sched.startTime} onChange={(e) => setSched({ ...sched, startTime: e.target.value })} style={schedInp} /></label>
              <label style={{ minWidth: 110, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#475569' }}>Closes (IST)
                <input type="time" value={sched.endTime} onChange={(e) => setSched({ ...sched, endTime: e.target.value })} style={schedInp} /></label>
              <button onClick={saveSchedule} style={{ background: '#1a5490', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 18px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>Schedule</button>
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>Leave times empty for all-day. With a window, students can only record between Opens and Closes (IST); missed ones show in the weekly report. {schedMsg && <b style={{ color: schedMsg.startsWith('✅') ? '#059669' : '#dc2626' }}>{schedMsg}</b>}</div>
            {schedList.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {schedList.map((s) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: '#475569', background: '#f8fafc', borderRadius: 8, padding: '6px 10px', flexWrap: 'wrap' }}>
                    <b>{s.date}</b><span>· {batches.find((b) => b._id === s.batchId)?.name || 'Batch'}</span><span>· {s.challenge?.title || '—'}</span>
                    {(s.startTime || s.endTime) && <span style={{ color: '#7c3aed', fontWeight: 700 }}>· 🕐 {s.startTime || '00:00'}–{s.endTime || '23:59'} IST</span>}
                    <button onClick={() => removeSchedule(s.id)} style={{ marginLeft: 'auto', border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer' }}>Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button onClick={() => setEditing('new')} style={btn('#1a5490')}>+ New Challenge</button>
          </div>
          <div style={{ ...card, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                <thead><tr><th style={th}>#</th><th style={th}>Title</th><th style={th}>Duration</th><th style={th}>Batches</th><th style={th}>Active</th><th style={th}>Order</th><th style={th}></th></tr></thead>
                <tbody>
                  {challenges.map((c, i) => (
                    <tr key={c._id}>
                      <td style={td}>{c.sequenceNumber}</td>
                      <td style={{ ...td, fontWeight: 600, color: '#111827' }}>{c.title}</td>
                      <td style={td}>{Math.round(c.targetSeconds / 60)}m</td>
                      <td style={td}>
                        {(c as any).batchIds?.length ? `${(c as any).batchIds.length} batch(es)` : 'All'}
                        {((c as any).audiences || ['lms']).includes('careerpilot') && (
                          <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: '#7c3aed', background: '#f3ecff', borderRadius: 99, padding: '2px 7px' }}>
                            CareerPilot
                          </span>
                        )}
                      </td>
                      <td style={td}>
                        <button onClick={() => toggleActive(c)} style={sBtn(c.active ? '#16a34a' : '#94a3b8')}>{c.active ? 'ON' : 'OFF'}</button>
                      </td>
                      <td style={td}>
                        <button onClick={() => move(i, -1)} style={{ ...sBtn('#e5e7eb'), color: '#374151' }}>↑</button>{' '}
                        <button onClick={() => move(i, 1)} style={{ ...sBtn('#e5e7eb'), color: '#374151' }}>↓</button>
                      </td>
                      <td style={td}>
                        <button onClick={() => setEditing(c)} style={{ ...sBtn('#eff6ff'), color: '#1a5490' }}>Edit</button>{' '}
                        <button onClick={() => remove(c)} style={{ ...sBtn('#fef2f2'), color: '#dc2626' }}>Del</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {editing && <ChallengeModal challenge={editing} batches={batches} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); loadChallenges(); }} />}
        </div>
      )}

      {tab === 'students' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)} style={{ ...input, width: 220 }}>
              <option value="">All batches</option>
              {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
            <span style={{ fontSize: 13, color: '#6b7280' }}>{students.length} students</span>
          </div>
          <div style={{ ...card, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                <thead><tr><th style={th}>Student</th><th style={th}>Batch</th><th style={th}>Today</th><th style={th}>Streak</th><th style={th}>Weekly avg</th><th style={th}>Last</th><th style={th}>Days</th><th style={th}>Status</th><th style={th}></th></tr></thead>
                <tbody>
                  {students.map((s) => {
                    const r = RISK[s.risk] || RISK.ok;
                    return (
                      <tr key={s.studentId}>
                        <td style={{ ...td, fontWeight: 600, color: '#111827' }}>{s.name}<div style={{ fontWeight: 400, fontSize: 11.5, color: '#9ca3af' }}>{s.email}</div></td>
                        <td style={td}>{batchName(s.batchId)}</td>
                        <td style={td}><span style={{ color: s.todayStatus === 'completed' ? '#16a34a' : '#d97706', fontWeight: 600 }}>{s.todayStatus === 'completed' ? '✓ Done' : 'Pending'}</span></td>
                        <td style={td}>🔥 {s.currentStreak}</td>
                        <td style={{ ...td, color: scoreColor(s.weeklyAvg), fontWeight: 600 }}>{s.weeklyAvg || '—'}</td>
                        <td style={{ ...td, color: scoreColor(s.lastScore), fontWeight: 600 }}>{s.lastScore || '—'}</td>
                        <td style={td}>{s.totalDays}</td>
                        <td style={td}><span style={{ fontSize: 11.5, padding: '2px 8px', borderRadius: 20, background: r.bg, color: r.color, fontWeight: 600 }}>{r.label}</span></td>
                        <td style={td}><button onClick={() => communicationApi.adminStudentDetail(s.studentId).then(setDetail)} style={{ ...sBtn('#eff6ff'), color: '#1a5490' }}>View</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {detail && <StudentDetailModal detail={detail} onClose={() => setDetail(null)} />}
        </div>
      )}
    </div>
  );
};

// ── Challenge create/edit modal ───────────────────────────────────────────────
const ChallengeModal: React.FC<{ challenge: CommChallenge | 'new'; batches: { _id: string; name: string }[]; onClose: () => void; onSaved: () => void }> = ({ challenge, batches, onClose, onSaved }) => {
  const isNew = challenge === 'new';
  const c = isNew ? null : (challenge as CommChallenge);
  const [f, setF] = useState<any>({
    title: c?.title || '', description: c?.description || '', instructions: c?.instructions || '',
    suggestedPoints: (c?.suggestedPoints || []).join(', '),
    minSeconds: c?.minSeconds || 120, targetSeconds: c?.targetSeconds || 180, maxSeconds: c?.maxSeconds || 210,
    maxAttempts: c?.maxAttempts || 2, recordingModes: (c?.recordingModes || ['audio', 'video']),
    batchIds: (c as any)?.batchIds || [],
    audiences: (c as any)?.audiences?.length ? (c as any).audiences : ['lms'],
    active: c?.active !== false,
  });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const toggleMode = (m: string) => set('recordingModes', f.recordingModes.includes(m) ? f.recordingModes.filter((x: string) => x !== m) : [...f.recordingModes, m]);
  const toggleBatch = (id: string) => set('batchIds', f.batchIds.includes(id) ? f.batchIds.filter((x: string) => x !== id) : [...f.batchIds, id]);
  /** Clearing every tick would hide the challenge from everyone, so LMS is restored. */
  const toggleAudience = (a: string) => {
    const next = f.audiences.includes(a) ? f.audiences.filter((x: string) => x !== a) : [...f.audiences, a];
    set('audiences', next.length ? next : ['lms']);
  };
  const save = async () => {
    if (!f.title) return;
    setBusy(true);
    try {
      const body = { ...f, suggestedPoints: f.suggestedPoints.split(',').map((s: string) => s.trim()).filter(Boolean) };
      if (isNew) await communicationApi.createChallenge(body); else await communicationApi.updateChallenge(c!._id, body);
      onSaved();
    } finally { setBusy(false); }
  };
  const lbl: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '28px 16px' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...card, width: '100%', maxWidth: 560, padding: 22, display: 'grid', gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{isNew ? 'New Challenge' : 'Edit Challenge'}</h3>
        <div><label style={lbl}>Title *</label><input style={input} value={f.title} onChange={(e) => set('title', e.target.value)} /></div>
        <div><label style={lbl}>Description</label><input style={input} value={f.description} onChange={(e) => set('description', e.target.value)} /></div>
        <div><label style={lbl}>Suggested points (comma-separated)</label><input style={input} value={f.suggestedPoints} onChange={(e) => set('suggestedPoints', e.target.value)} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
          <div><label style={lbl}>Min (s)</label><input style={input} type="number" value={f.minSeconds} onChange={(e) => set('minSeconds', +e.target.value)} /></div>
          <div><label style={lbl}>Target (s)</label><input style={input} type="number" value={f.targetSeconds} onChange={(e) => set('targetSeconds', +e.target.value)} /></div>
          <div><label style={lbl}>Max (s)</label><input style={input} type="number" value={f.maxSeconds} onChange={(e) => set('maxSeconds', +e.target.value)} /></div>
          <div><label style={lbl}>Attempts</label><input style={input} type="number" value={f.maxAttempts} onChange={(e) => set('maxAttempts', +e.target.value)} /></div>
        </div>
        <div>
          <label style={lbl}>Recording modes</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['audio', 'video'].map((m) => <button key={m} onClick={() => toggleMode(m)} style={sBtn(f.recordingModes.includes(m) ? '#1a5490' : '#cbd5e1')}>{m}</button>)}
          </div>
        </div>
        <div>
          <label style={lbl}>Who gets this challenge?</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => toggleAudience('lms')} style={sBtn(f.audiences.includes('lms') ? '#1a5490' : '#cbd5e1')}>LMS students</button>
            <button onClick={() => toggleAudience('careerpilot')} style={sBtn(f.audiences.includes('careerpilot') ? '#7c3aed' : '#cbd5e1')}>CareerPilot members</button>
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6, lineHeight: 1.5 }}>
            CareerPilot members have no batch, so they get the challenges ticked here — walked
            in sequence order, one per day. Batches below apply to LMS students only.
          </div>
        </div>
        <div>
          <label style={lbl}>Assign to batches <span style={{ fontWeight: 400, color: '#9ca3af' }}>(none = all batches)</span></label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxHeight: 100, overflowY: 'auto' }}>
            {batches.map((b) => <button key={b._id} onClick={() => toggleBatch(b._id)} style={sBtn(f.batchIds.includes(b._id) ? '#16a34a' : '#cbd5e1')}>{b.name}</button>)}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <button onClick={onClose} style={{ ...btn('#f3f4f6'), color: '#374151' }}>Cancel</button>
          <button onClick={save} disabled={busy} style={btn('#1a5490')}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
};

// ── Instructor review form (per attempt) ──────────────────────────────────────
const ReviewForm: React.FC<{ attempt: any; onClose: () => void; onSaved: () => void }> = ({ attempt, onClose, onSaved }) => {
  const [f, setF] = useState<any>({ feedback: '', recommendedFocus: '', scoreOverride: '', overrideReason: '', reattemptRequired: false, interviewReady: false });
  const [busy, setBusy] = useState(false);
  useEffect(() => { communicationApi.getInstructorFeedback(attempt._id).then((r) => { if (r.feedback) setF({ feedback: r.feedback.feedback || '', recommendedFocus: r.feedback.recommendedFocus || '', scoreOverride: r.feedback.scoreOverride ?? '', overrideReason: r.feedback.overrideReason || '', reattemptRequired: !!r.feedback.reattemptRequired, interviewReady: !!r.feedback.interviewReady }); }).catch(() => {}); }, [attempt._id]);
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const save = async () => {
    if (f.scoreOverride !== '' && !f.overrideReason.trim()) { alert('A reason is required when overriding the score.'); return; }
    setBusy(true);
    try { await communicationApi.saveInstructorFeedback(attempt._id, f); onSaved(); } finally { setBusy(false); }
  };
  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 3, display: 'block' };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', zIndex: 1100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '28px 16px' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...card, width: '100%', maxWidth: 480, padding: 20, display: 'grid', gap: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Review — {attempt.challengeTitle}</div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>AI score: <strong>{attempt.evaluation?.overallScore ?? '—'}</strong>{attempt.overriddenScore != null && <> · Current override: <strong>{attempt.overriddenScore}</strong></>}</div>
        <div><label style={lbl}>Feedback to student</label><textarea style={{ ...input, minHeight: 70 }} value={f.feedback} onChange={(e) => set('feedback', e.target.value)} /></div>
        <div><label style={lbl}>Recommended focus</label><input style={input} value={f.recommendedFocus} onChange={(e) => set('recommendedFocus', e.target.value)} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10 }}>
          <div><label style={lbl}>Override score</label><input style={input} type="number" min={0} max={100} value={f.scoreOverride} onChange={(e) => set('scoreOverride', e.target.value)} placeholder="—" /></div>
          <div><label style={lbl}>Reason (required to override)</label><input style={input} value={f.overrideReason} onChange={(e) => set('overrideReason', e.target.value)} /></div>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}><input type="checkbox" checked={f.reattemptRequired} onChange={(e) => set('reattemptRequired', e.target.checked)} /> Require re-attempt</label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}><input type="checkbox" checked={f.interviewReady} onChange={(e) => set('interviewReady', e.target.checked)} /> Mark interview-ready</label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <button onClick={onClose} style={{ ...btn('#f3f4f6'), color: '#374151' }}>Cancel</button>
          <button onClick={save} disabled={busy} style={btn('#1a5490')}>{busy ? 'Saving…' : 'Save review'}</button>
        </div>
      </div>
    </div>
  );
};

// ── Student detail modal ──────────────────────────────────────────────────────
const StudentDetailModal: React.FC<{ detail: any; onClose: () => void }> = ({ detail, onClose }) => {
  const s = detail.student;
  const [reviewing, setReviewing] = useState<any>(null);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '28px 16px' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...card, width: '100%', maxWidth: 640, padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{[s.firstName, s.lastName].filter(Boolean).join(' ') || s.email}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6b7280' }}>×</button>
        </div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13 }}>🔥 Streak: <strong>{detail.streak?.currentStreak || 0}</strong></div>
          <div style={{ fontSize: 13 }}>📅 Days: <strong>{detail.streak?.totalCompletedDays || 0}</strong></div>
          <div style={{ fontSize: 13 }}>📄 Profile: <strong>{detail.profile ? 'Filled' : 'Not filled'}</strong></div>
        </div>
        <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 8 }}>Recent practice</div>
        {(!detail.attempts || detail.attempts.length === 0) ? <div style={{ color: '#9ca3af', fontSize: 13 }}>No attempts.</div> : (
          <div style={{ display: 'grid', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
            {detail.attempts.map((a: any) => (
              <div key={a._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: '1px solid #f1f5f9', borderRadius: 8 }}>
                <div style={{ width: 34, fontWeight: 800, color: a.evaluation ? scoreColor(a.overriddenScore ?? a.evaluation.overallScore) : '#9ca3af' }}>{a.overriddenScore ?? a.evaluation?.overallScore ?? '—'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#111827', fontWeight: 600 }}>{a.challengeTitle}{a.instructorReviewed && <span style={{ fontSize: 10.5, color: '#7c3aed', marginLeft: 6 }}>✓ reviewed</span>}</div>
                  <div style={{ fontSize: 11.5, color: '#9ca3af' }}>{a.practiceDate} · {a.recordingType} · {a.recordingDuration}s · {a.wordsPerMinute || 0} wpm</div>
                </div>
                <button onClick={() => setReviewing(a)} style={{ ...sBtn('#eff6ff'), color: '#1a5490' }} disabled={!a.evaluation}>Review</button>
              </div>
            ))}
          </div>
        )}
      </div>
      {reviewing && <ReviewForm attempt={reviewing} onClose={() => setReviewing(null)} onSaved={() => setReviewing(null)} />}
    </div>
  );
};

export default CommunicationLabAdmin;
