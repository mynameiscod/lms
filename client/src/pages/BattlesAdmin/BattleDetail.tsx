import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { battleAdminApi, fileOrigin } from '../../api/battleApi';

type Tab = 'links' | 'registrations' | 'leaderboard';

const BattleDetail: React.FC = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const [battle, setBattle] = useState<any>(null);
  const [publicBase, setPublicBase] = useState('');
  const [tab, setTab] = useState<Tab>('links');
  const [regs, setRegs] = useState<any[]>([]);
  const [lb, setLb] = useState<any[]>([]);
  const [filter, setFilter] = useState<any>({ door: '', status: '' });
  const [copied, setCopied] = useState('');
  const [tenantSlug, setTenantSlug] = useState('codebegun');

  // door editor
  const [newDoor, setNewDoor] = useState<any>({ label: '', type: 'college', accessCode: '' });

  const load = async () => {
    const { battle, publicBase } = await battleAdminApi.get(String(id));
    setBattle(battle); setPublicBase(publicBase);
    setTenantSlug(localStorage.getItem('tenantSlug') || 'codebegun');
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  useEffect(() => {
    if (tab === 'registrations') battleAdminApi.registrations(String(id), filter).then(setRegs).catch(() => {});
    if (tab === 'leaderboard') battleAdminApi.leaderboard(String(id), filter).then(setLb).catch(() => {});
  }, [tab, id, filter]);

  const doorUrl = (code: string) => {
    const base = `${publicBase}/battles/${battle.slug}?tenant=${tenantSlug}`;
    return code === 'public' ? base : `${base}&door=${code}`;
  };
  const copy = async (url: string) => { try { await navigator.clipboard.writeText(url); setCopied(url); setTimeout(() => setCopied(''), 1500); } catch { window.prompt('Copy link:', url); } };

  const addDoor = async () => {
    if (!newDoor.label) return;
    const doors = [...(battle.doors || []), { label: newDoor.label, type: newDoor.type, code: newDoor.label.toLowerCase().replace(/[^a-z0-9]+/g, '-'), accessCode: newDoor.accessCode || undefined }];
    const b = await battleAdminApi.update(String(id), { doors } as any);
    setBattle(b); setNewDoor({ label: '', type: 'college', accessCode: '' });
  };
  const removeDoor = async (code: string) => {
    const doors = (battle.doors || []).filter((d: any) => d.code !== code || d.code === 'public');
    const b = await battleAdminApi.update(String(id), { doors } as any);
    setBattle(b);
  };
  const setStatus = async (status: string) => { const b = await battleAdminApi.update(String(id), { status } as any); setBattle(b); };
  const reloadRegs = () => battleAdminApi.registrations(String(id), filter).then(setRegs).catch(() => {});
  const approve = async (regId: string) => { await battleAdminApi.approve(String(id), regId); reloadRegs(); };
  const reject = async (regId: string) => { const reason = window.prompt('Reason for rejection (optional):') || ''; await battleAdminApi.reject(String(id), regId, reason); reloadRegs(); };

  if (!battle) return <div style={{ padding: 30, color: '#64748b' }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '4px 4px 60px' }}>
      <button onClick={() => nav('/admin/battles')} style={{ background: 'none', border: 'none', color: '#1d4ed8', fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: 0 }}>← All battles</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, margin: '8px 0 16px' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>{battle.title}</h1>
          <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 3 }}>
            {new Date(battle.startAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} → {new Date(battle.endAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · {battle.status.toUpperCase()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {battle.status !== 'live' && <button onClick={() => setStatus('live')} style={ghost}>Go live</button>}
          {battle.status !== 'closed' && <button onClick={() => setStatus('closed')} style={ghost}>Close</button>}
          <a href={battleAdminApi.exportUrl(String(id))} style={{ ...ghost, textDecoration: 'none' }}>⬇ Export CSV</a>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {(['links', 'registrations', 'leaderboard'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ ...tabBtn, ...(tab === t ? tabActive : {}) }}>{t === 'links' ? '🔗 Registration links' : t === 'registrations' ? '👥 Registrations' : '🏆 Leaderboard'}</button>
        ))}
      </div>

      {tab === 'links' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={card}>
            <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Doors (registration pages)</div>
            {(battle.doors || []).map((d: any) => (
              <div key={d.code} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ minWidth: 140 }}><b style={{ fontSize: 14 }}>{d.label}</b><span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6 }}>{d.type}{d.accessCode ? ' · code' : ''}</span></div>
                <input readOnly value={doorUrl(d.code)} style={{ ...input, flex: 1, fontSize: 12.5, color: '#475569' }} />
                <button onClick={() => copy(doorUrl(d.code))} style={ghost}>{copied === doorUrl(d.code) ? '✓ Copied' : 'Copy'}</button>
                {d.code !== 'public' && <button onClick={() => removeDoor(d.code)} style={{ ...ghost, color: '#ef4444' }}>✕</button>}
              </div>
            ))}
          </div>
          <div style={card}>
            <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Add a college / group door</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 160 }}><label style={lbl}>College / group name</label><input style={input} value={newDoor.label} onChange={e => setNewDoor({ ...newDoor, label: e.target.value })} placeholder="ABC Engineering College" /></div>
              <div><label style={lbl}>Type</label><select style={input} value={newDoor.type} onChange={e => setNewDoor({ ...newDoor, type: e.target.value })}><option value="college">College</option><option value="group">Group</option></select></div>
              <div><label style={lbl}>Access code (optional)</label><input style={input} value={newDoor.accessCode} onChange={e => setNewDoor({ ...newDoor, accessCode: e.target.value })} placeholder="ABC2026" /></div>
              <button onClick={addDoor} style={primary}>Add door</button>
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>Each door gets its own link + page, tagging every registrant to that college.</div>
          </div>
        </div>
      )}

      {tab === 'registrations' && (
        <div style={card}>
          {battle.registrationMode === 'approval' && (
            <div style={{ background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 10, padding: '9px 13px', fontSize: 13, color: '#1e40af', marginBottom: 12 }}>
              🔎 Approval mode — review each registrant's proof, then <b>Approve</b> to auto-email their exam link.
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {battle.registrationMode === 'approval' && (
              <select style={{ ...input, maxWidth: 170 }} value={filter.review || ''} onChange={e => setFilter({ ...filter, review: e.target.value })}>
                <option value="">All reviews</option><option value="pending">⏳ Pending</option><option value="approved">✓ Approved</option><option value="rejected">✕ Rejected</option>
              </select>
            )}
            <select style={{ ...input, maxWidth: 180 }} value={filter.door} onChange={e => setFilter({ ...filter, door: e.target.value })}>
              <option value="">All doors</option>{(battle.doors || []).map((d: any) => <option key={d.code} value={d.code}>{d.label}</option>)}
            </select>
            <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: 13, alignSelf: 'center' }}>{regs.length} shown</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={table}>
              <thead><tr>{['Name', 'Mobile', 'Email', 'College', 'Door', 'Proof', 'Review', 'Score', 'Action'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {regs.map(r => {
                  const rc = r.reviewStatus === 'approved' ? '#15803d' : r.reviewStatus === 'rejected' ? '#b91c1c' : '#b45309';
                  return (
                    <tr key={r._id}>
                      <td style={td}>{r.name}</td>
                      <td style={td}>{r.mobile}</td><td style={td}>{r.email}</td><td style={td}>{r.college || '—'}</td>
                      <td style={td}>{r.doorLabel}</td>
                      <td style={td}>{(r.uploadedFiles || []).length ? (r.uploadedFiles).map((f: any, i: number) => <a key={i} href={`${fileOrigin()}${f.filePath}`} target="_blank" rel="noreferrer" style={{ color: '#1d4ed8', marginRight: 6 }}>📎{i + 1}</a>) : '—'}</td>
                      <td style={td}><span style={{ fontSize: 11, fontWeight: 800, color: rc }}>{(r.reviewStatus || 'pending').toUpperCase()}</span></td>
                      <td style={td}>{r.score != null ? `${r.score}/${r.totalMarks}${r.rank ? ` · #${r.rank}` : ''}` : '—'}</td>
                      <td style={td}>
                        {r.reviewStatus === 'pending' ? (
                          <span style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => approve(r._id)} style={{ ...ghost, color: '#15803d', borderColor: '#bbf7d0', padding: '5px 10px' }}>✓ Approve</button>
                            <button onClick={() => reject(r._id)} style={{ ...ghost, color: '#b91c1c', borderColor: '#fecaca', padding: '5px 10px' }}>✕</button>
                          </span>
                        ) : r.reviewStatus === 'approved' ? <button onClick={() => approve(r._id)} style={{ ...ghost, padding: '5px 10px' }}>Resend link</button> : <span style={{ color: '#94a3b8', fontSize: 12 }}>{r.rejectionReason || 'rejected'}</span>}
                      </td>
                    </tr>
                  );
                })}
                {regs.length === 0 && <tr><td style={td} colSpan={9}>No registrations.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'leaderboard' && (
        <div style={card}>
          <table style={table}>
            <thead><tr>{['#', 'Name', 'College', 'Score', 'Time'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {lb.map(r => (
                <tr key={r.position}><td style={{ ...td, fontWeight: 800, color: '#1d4ed8' }}>{r.position <= 3 ? ['🥇', '🥈', '🥉'][r.position - 1] : r.position}</td><td style={td}>{r.name}</td><td style={td}>{r.college || '—'}</td><td style={td}><b>{r.score}</b>/{r.totalMarks} ({r.percentage}%)</td><td style={td}>{Math.floor((r.timeSpentSec || 0) / 60)}m {(r.timeSpentSec || 0) % 60}s</td></tr>
              ))}
              {lb.length === 0 && <tr><td style={td} colSpan={5}>No submissions yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const card: React.CSSProperties = { background: '#fff', border: '1px solid #eef1f6', borderRadius: 14, padding: '16px 18px' };
const primary: React.CSSProperties = { background: 'linear-gradient(90deg,#1d4ed8,#4f46e5)', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 16px', fontWeight: 800, fontSize: 13.5, cursor: 'pointer' };
const ghost: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 9, padding: '8px 14px', fontWeight: 700, fontSize: 13, color: '#475569', cursor: 'pointer' };
const tabBtn: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 9, padding: '9px 14px', fontWeight: 700, fontSize: 13.5, color: '#475569', cursor: 'pointer' };
const tabActive: React.CSSProperties = { background: '#1d4ed8', color: '#fff', borderColor: '#1d4ed8' };
const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 };
const input: React.CSSProperties = { border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '9px 11px', fontSize: 13.5, color: '#0f172a', boxSizing: 'border-box', width: '100%' };
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13.5 };
const th: React.CSSProperties = { textAlign: 'left', color: '#64748b', fontSize: 11.5, fontWeight: 700, padding: '8px 10px', borderBottom: '1px solid #eef1f6' };
const td: React.CSSProperties = { padding: '9px 10px', borderBottom: '1px solid #f4f6fa', color: '#334155' };

export default BattleDetail;
