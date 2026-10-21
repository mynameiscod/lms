import React, { useEffect, useState } from 'react';
import { communicationApi } from '../../api/communicationApi';

/** Trainer view of the Communication Coach: who has never started, who went quiet, who sounds frozen, who is ready. */

const FLAG: Record<string, { label: string; color: string; bg: string }> = {
  never_started: { label: 'Never started', color: '#b91c1c', bg: '#fef2f2' },
  inactive: { label: 'Gone quiet (3+ days)', color: '#b45309', bg: '#fffbeb' },
  high_hesitation: { label: 'High hesitation', color: '#b45309', bg: '#fffbeb' },
  low_score: { label: 'Low score', color: '#b45309', bg: '#fffbeb' },
};
const th: React.CSSProperties = { textAlign: 'left', fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: '#6b7280', padding: '10px 12px', borderBottom: '1px solid #e5e7eb' };
const td: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontSize: 13.5, color: '#374151' };
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,.05)' };

const Detail: React.FC<{ id: string; onClose: () => void }> = ({ id, onClose }) => {
  const [d, setD] = useState<any>(null);
  const [play, setPlay] = useState<{ id: string; url: string } | null>(null);
  useEffect(() => { communicationApi.adminCoachStudent(id).then(setD).catch(() => setD({ error: true })); }, [id]);
  const listen = async (rid: string) => { try { setPlay({ id: rid, url: await communicationApi.playUrl(rid) }); } catch { /* nothing plays */ } };
  const bar = (v: number, c: string) => <div style={{ height: 7, background: '#e2e8f0', borderRadius: 4 }}><div style={{ width: `${v}%`, height: '100%', background: c, borderRadius: 4 }} /></div>;
  const hesColor = (h: number) => (h >= 50 ? '#dc2626' : h >= 25 ? '#d97706' : '#16a34a');
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div style={{ width: 'min(620px,100%)', background: '#fff', height: '100%', overflowY: 'auto', padding: 22 }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={{ float: 'right', border: 'none', background: 'none', fontSize: 22, cursor: 'pointer' }} aria-label="Close">×</button>
        {!d ? <p style={{ color: '#9ca3af' }}>Loading…</p> : d.error ? <p style={{ color: '#b91c1c' }}>Could not load this student.</p> : <>
          <h3 style={{ margin: 0 }}>{d.student.name}</h3>
          <p style={{ margin: '2px 0 14px', color: '#6b7280', fontSize: 13 }}>{d.student.email} · Level {d.level}: {d.levelName} · {d.totalRecordings} recordings · baseline {d.baselineAreasDone}/4</p>
          <div style={{ ...card, padding: 14, marginBottom: 12 }}>
            <b style={{ fontSize: 28, color: d.readiness.ready ? '#16a34a' : '#b45309' }}>{d.readiness.score}</b> <span style={{ color: '#6b7280' }}>readiness · needs {d.readiness.threshold} · {d.readiness.ready ? 'READY' : 'not ready'}</span>
            {!d.readiness.ready && <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: '#475569', fontSize: 13.5 }}>{d.readiness.reasons.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul>}
          </div>
          <div style={{ ...card, padding: 14, marginBottom: 12 }}>
            <b>Skills</b>{d.weakestSkill && <span style={{ color: '#b45309', marginLeft: 8, fontSize: 13 }}>weakest: {d.weakestSkill}</span>}
            {d.skills.map((k: any) => <div key={k.key} style={{ marginTop: 8, fontSize: 13.5 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{k.label}</span><span>{k.start ? `${k.start} → ` : ''}<b>{k.now || '—'}</b></span></div>{bar(k.now, k.now >= 65 ? '#16a34a' : k.now >= 45 ? '#d97706' : '#dc2626')}</div>)}
          </div>
          <div style={{ ...card, padding: 14, marginBottom: 12 }}>
            <b>Steadiness over time</b> <span style={{ color: '#6b7280', fontSize: 12.5 }}>(lower is calmer)</span>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 56, marginTop: 8 }}>{d.hesitation.trend.map((t: any, i: number) => <div key={i} title={`${t.date}: ${t.hesitation}`} style={{ flex: 1, minWidth: 6, height: `${Math.max(6, t.hesitation)}%`, background: hesColor(t.hesitation), borderRadius: 3 }} />)}</div>
          </div>
          <b>Recent recordings</b>
          {d.recordings.map((r: any) => (
            <div key={r.id} style={{ ...card, padding: 12, marginTop: 8, fontSize: 13.5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><b>{r.title}</b><span>{r.date} · <b>{r.score}</b>/100</span></div>
              <div style={{ color: '#6b7280', margin: '4px 0' }}>{r.signals ? `${r.signals.pauseCount} silences · longest ${r.signals.longestPauseSec}s · first word ${r.signals.timeToFirstWordSec}s · ${r.signals.restarts} restarts · hesitation ${r.hesitation}` : 'No timing data'}</div>
              {!!r.tips.length && <div style={{ color: '#475569' }}>{r.tips[0]}</div>}
              <div style={{ marginTop: 6 }}>{play?.id === r.id ? <audio controls autoPlay src={play.url} style={{ width: '100%' }} /> : <button onClick={() => listen(r.id)} style={{ border: '1px solid #d1d5db', background: '#fff', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12.5 }}>▶ Listen</button>}</div>
              {r.transcript && <details style={{ marginTop: 6 }}><summary style={{ cursor: 'pointer', color: '#1a5490' }}>Transcript</summary><p style={{ whiteSpace: 'pre-wrap', margin: '6px 0 0', color: '#334155' }}>{r.transcript}</p></details>}
            </div>
          ))}
          {!d.recordings.length && <p style={{ color: '#9ca3af' }}>No recordings yet.</p>}
        </>}
      </div>
    </div>
  );
};

const CoachOverviewPanel: React.FC<{ batches: { _id: string; name: string }[] }> = ({ batches }) => {
  const [open, setOpen] = useState<string | null>(null);
  const [batchId, setBatchId] = useState('');
  const [data, setData] = useState<any>(null);
  const [only, setOnly] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => { setData(null); setErr(''); communicationApi.adminCoachOverview(batchId || undefined).then(setData).catch(() => setErr('Could not load the coach overview.')); }, [batchId]);

  if (err) return <div style={{ color: '#b91c1c', padding: 24 }}>{err}</div>;
  if (!data) return <div style={{ color: '#9ca3af', padding: 40, textAlign: 'center' }}>Loading…</div>;
  const s = data.summary;
  const stat = (label: string, value: number, color: string, key = '') => (
    <button key={label} onClick={() => setOnly(only === key ? '' : key)} style={{ ...card, padding: '14px 16px', textAlign: 'left', cursor: key ? 'pointer' : 'default', outline: only === key && key ? '2px solid #1a5490' : 'none' }}>
      <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div><div style={{ fontSize: 12.5, color: '#6b7280' }}>{label}</div>
    </button>
  );
  const rows = data.students.filter((r: any) => !only || (only === 'ready' ? r.ready : r.flags.includes(only)));
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={batchId} onChange={(e) => setBatchId(e.target.value)} style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13.5, width: 220 }}>
          <option value="">All batches</option>
          {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
        <span style={{ color: '#6b7280', fontSize: 13 }}>Ready = baseline done, steady, scoring well, practising most days. Needs a readiness of {data.threshold}.</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 16 }}>
        {stat('Students', s.students, '#111827')}
        {stat('Practised today', s.practisedToday, '#16a34a')}
        {stat('Never started', s.neverStarted, '#dc2626', 'never_started')}
        {stat('Gone quiet', s.inactive, '#d97706', 'inactive')}
        {stat('High hesitation', s.highHesitation, '#d97706', 'high_hesitation')}
        {stat('Ready for companies', s.ready, '#16a34a', 'ready')}
      </div>
      <div style={{ ...card, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Student</th><th style={th}>Last practised</th><th style={th}>Recordings</th><th style={th}>Level</th><th style={th}>Avg score</th><th style={th}>Hesitation</th><th style={th}>Readiness</th><th style={th}>Needs attention</th></tr></thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.studentId}>
                <td style={td}><button onClick={() => setOpen(r.studentId)} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: '#1a5490', fontWeight: 700, fontSize: 13.5, textAlign: 'left' }}>{r.name}</button></td>
                <td style={td}>{r.lastPracticeDate ? (r.daysSincePractice === 0 ? 'Today' : `${r.daysSincePractice}d ago`) : '—'}</td>
                <td style={td}>{r.recordings}{r.baselineAreas < 4 && r.recordings > 0 ? <span style={{ color: '#b45309' }}> · baseline {r.baselineAreas}/4</span> : null}</td>
                <td style={td}>{r.recordings ? r.level : '—'}</td>
                <td style={td}>{r.recordings ? r.avgScore : '—'}</td>
                <td style={td}>{r.recordings ? r.avgHesitation : '—'}</td>
                <td style={td}><b style={{ color: r.ready ? '#16a34a' : '#374151' }}>{r.recordings ? r.readiness : '—'}</b>{r.ready ? ' ✓' : ''}</td>
                <td style={td}>{r.flags.length ? r.flags.map((f: string) => <span key={f} style={{ display: 'inline-block', margin: '0 4px 4px 0', padding: '2px 8px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, color: FLAG[f].color, background: FLAG[f].bg }}>{FLAG[f].label}</span>) : <span style={{ color: '#16a34a' }}>On track</span>}</td>
              </tr>
            ))}
            {!rows.length && <tr><td style={{ ...td, textAlign: 'center', color: '#9ca3af' }} colSpan={8}>No students here.</td></tr>}
          </tbody>
        </table>
      </div>
      {open && <Detail id={open} onClose={() => setOpen(null)} />}
    </div>
  );
};

export default CoachOverviewPanel;
