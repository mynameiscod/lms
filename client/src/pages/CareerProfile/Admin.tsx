import React, { useEffect, useState } from 'react';
import { careerProfileApi, CareerProfile, Pillar } from '../../api/careerProfileApi';
import { ScoreCards, IssuesList, ImprovedView, PILLAR_LABEL } from './parts';
import './CareerProfile.css';

const STATUSES = ['draft', 'submitted', 'in_review', 'reviewed', 'completed'];

export default function CareerProfileAdmin() {
  const [rows, setRows] = useState<CareerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CareerProfile | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await careerProfileApi.list({ status: statusFilter || undefined, search: search || undefined });
      setRows(data.data);
    } finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [statusFilter]);

  const open = async (id: string) => {
    const { data } = await careerProfileApi.getById(id);
    setSelected(data.data);
  };

  if (selected) return <Editor profile={selected} onBack={() => { setSelected(null); load(); }} onChange={setSelected} />;

  return (
    <div className="cp-wrap" style={{ maxWidth: 1200 }}>
      <div className="cp-head">
        <h1>Career Profiles — Review</h1>
        <p>Review students' AI-generated career profiles, edit the improved content, and mark them complete.</p>
      </div>

      <div className="cp-card">
        <div className="cp-row" style={{ marginBottom: 14 }}>
          <input className="cp-field" style={{ flex: 1, minWidth: 200, padding: 0 }}
            placeholder="Search by student name…" value={search}
            onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', fontSize: 14 }}>
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <button className="cp-btn cp-btn-ghost" onClick={load}>Search</button>
        </div>

        {loading ? <div className="cp-empty">Loading…</div> : rows.length === 0 ? (
          <div className="cp-empty">No career profiles yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '8px 6px' }}>Student</th>
                  <th style={{ padding: '8px 6px' }}>Batch</th>
                  <th style={{ padding: '8px 6px' }}>Target role</th>
                  <th style={{ padding: '8px 6px' }}>Resume</th>
                  <th style={{ padding: '8px 6px' }}>GitHub</th>
                  <th style={{ padding: '8px 6px' }}>LinkedIn</th>
                  <th style={{ padding: '8px 6px' }}>Status</th>
                  <th style={{ padding: '8px 6px' }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 6px', fontWeight: 600, color: '#0f172a' }}>{r.studentName || '—'}<div style={{ fontWeight: 400, color: '#94a3b8', fontSize: 12 }}>{r.studentEmail}</div></td>
                    <td style={{ padding: '10px 6px' }}>{r.batchName || '—'}</td>
                    <td style={{ padding: '10px 6px' }}>{r.targetRole || '—'}</td>
                    <td style={{ padding: '10px 6px' }}>{r.resume?.score || 0}</td>
                    <td style={{ padding: '10px 6px' }}>{r.github?.score || 0}</td>
                    <td style={{ padding: '10px 6px' }}>{r.linkedin?.score || 0}</td>
                    <td style={{ padding: '10px 6px' }}><span className={`cp-status ${r.status}`}>{r.status.replace('_', ' ')}</span></td>
                    <td style={{ padding: '10px 6px' }}><button className="cp-btn cp-btn-ghost cp-btn-sm" onClick={() => open(r._id)}>Review</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Editor({ profile, onBack, onChange }: { profile: CareerProfile; onBack: () => void; onChange: (p: CareerProfile) => void }) {
  const [tab, setTab] = useState<Pillar>('resume');
  const [draft, setDraft] = useState(JSON.stringify(profile[tab]?.improved || {}, null, 2));
  const [notes, setNotes] = useState(profile.reviewerNotes || '');
  const [status, setStatus] = useState(profile.status);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: 'err' | 'ok'; m: string } | null>(null);

  const switchTab = (p: Pillar) => { setTab(p); setDraft(JSON.stringify(profile[p]?.improved || {}, null, 2)); };

  const savePillar = async () => {
    setBusy(true); setMsg(null);
    try {
      const improved = JSON.parse(draft);
      const { data } = await careerProfileApi.updatePillar(profile._id, tab, improved);
      onChange(data.data);
      setMsg({ t: 'ok', m: 'Saved improved content.' });
    } catch (e: any) {
      setMsg({ t: 'err', m: e?.message?.includes('JSON') ? 'Invalid JSON — fix formatting.' : (e?.response?.data?.message || 'Save failed') });
    } finally { setBusy(false); }
  };

  const regenerate = async () => {
    setBusy(true); setMsg(null);
    try {
      const { data } = await careerProfileApi.regeneratePillar(profile._id, tab);
      onChange(data.data);
      setDraft(JSON.stringify(data.data[tab]?.improved || {}, null, 2));
      setMsg({ t: 'ok', m: 'Regenerated.' });
    } catch (e: any) {
      setMsg({ t: 'err', m: e?.response?.data?.message || 'Regenerate failed' });
    } finally { setBusy(false); }
  };

  const saveReview = async () => {
    setBusy(true); setMsg(null);
    try {
      const { data } = await careerProfileApi.updateReview(profile._id, { status, reviewerNotes: notes });
      onChange(data.data);
      setMsg({ t: 'ok', m: 'Review updated.' });
    } catch (e: any) {
      setMsg({ t: 'err', m: e?.response?.data?.message || 'Update failed' });
    } finally { setBusy(false); }
  };

  const active = profile[tab];

  return (
    <div className="cp-wrap" style={{ maxWidth: 1200 }}>
      <button className="cp-btn cp-btn-ghost cp-btn-sm" onClick={onBack} style={{ marginBottom: 14 }}>← Back to list</button>

      <div className="cp-head">
        <h1>{profile.studentName || 'Student'}</h1>
        <p>{profile.studentEmail} · {profile.batchName || 'No batch'} · Target: {profile.targetRole || '—'}</p>
      </div>

      {msg && <div className={`cp-banner ${msg.t}`}>{msg.m}</div>}

      <div className="cp-card"><ScoreCards resume={profile.resume} github={profile.github} linkedin={profile.linkedin} /></div>

      <div className="cp-card">
        <div className="cp-tabs">
          {(['resume', 'github', 'linkedin'] as Pillar[]).map(p => (
            <button key={p} className={`cp-tab ${tab === p ? 'active' : ''}`} onClick={() => switchTab(p)}>
              {PILLAR_LABEL[p]} · {profile[p]?.score || 0}
            </button>
          ))}
        </div>

        <div className="cp-twocol">
          <div>
            <p className="cp-subhead">Issues</p>
            <IssuesList issues={active?.issues || []} />
            <p className="cp-subhead" style={{ marginTop: 18 }}>Current AI-improved preview</p>
            <ImprovedView improved={active?.improved} />
          </div>
          <div>
            <p className="cp-subhead">Edit improved content (JSON)</p>
            <textarea value={draft} onChange={e => setDraft(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', minHeight: 320, fontFamily: 'monospace', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 8, padding: 12 }} />
            <div className="cp-row" style={{ marginTop: 10 }}>
              <button className="cp-btn cp-btn-primary cp-btn-sm" onClick={savePillar} disabled={busy}>Save edits</button>
              <button className="cp-btn cp-btn-ghost cp-btn-sm" onClick={regenerate} disabled={busy}>Regenerate with AI</button>
            </div>
          </div>
        </div>
      </div>

      <div className="cp-card">
        <h2>Review decision</h2>
        <div className="cp-field">
          <label>Trainer notes (shown to student)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Overall feedback for the student…" />
        </div>
        <div className="cp-row">
          <select value={status} onChange={e => setStatus(e.target.value as any)}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', fontSize: 14 }}>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <button className="cp-btn cp-btn-primary" onClick={saveReview} disabled={busy}>Save review</button>
        </div>
      </div>
    </div>
  );
}
