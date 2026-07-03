import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { candidatesApi, CandidateRow, CandidateJourney } from '../../api/assessmentAdminApi';
import { SEGMENT_OPTIONS } from '../../api/assessmentApi';
import '../AssessmentAdmin/AssessmentAdmin.css';
import './AssessmentCandidates.css';

const segLabel = (v?: string) => SEGMENT_OPTIONS.find((s) => s.value === v)?.label || v || '—';
const STATUS_LABEL: Record<string, string> = { registered: 'Registered', in_progress: 'In exam', submitted: 'Completed', abandoned: 'Abandoned' };

const STATUS_STYLE: Record<string, { dot: string; text: string }> = {
  done:    { dot: '#16a34a', text: '#166534' },
  pending: { dot: '#cbd5e1', text: '#64748b' },
  failed:  { dot: '#dc2626', text: '#b91c1c' },
  skipped: { dot: '#e2e8f0', text: '#94a3b8' },
};
const fmt = (d?: string | null) => d ? new Date(d).toLocaleString() : '';

// Per-candidate journey drawer: first touch (ad/media) → placed, with each
// step's status, time and detail so the founder can see exactly where they are.
const JourneyDrawer: React.FC<{ row: CandidateRow; onClose: () => void }> = ({ row, onClose }) => {
  const [j, setJ] = useState<CandidateJourney | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  useEffect(() => {
    (async () => { try { setJ(await candidatesApi.journey(row.id)); } catch (e: any) { setErr(e.message || 'Failed to load'); } finally { setLoading(false); } })();
  }, [row.id]);

  const a = j?.attribution;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,.45)' }} />
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(520px,100%)', background: '#f8fafc', boxShadow: '-8px 0 30px rgba(0,0,0,.2)', overflowY: 'auto' }}>
        <div style={{ background: 'linear-gradient(120deg,#0a2a5e,#6650d8)', color: '#fff', padding: '20px 22px', position: 'sticky', top: 0, zIndex: 2 }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 16, background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', fontSize: 18 }}>×</button>
          <div style={{ fontSize: 11, opacity: .82, fontWeight: 700, letterSpacing: .4 }}>CANDIDATE JOURNEY</div>
          <div style={{ fontSize: 19, fontWeight: 800, marginTop: 3 }}>{row.name || row.phone}</div>
          <div style={{ fontSize: 12.5, opacity: .9, marginTop: 2 }}>{row.phone}{row.email ? ` · ${row.email}` : ''}</div>
        </div>

        {loading ? <div style={{ padding: 30, color: '#64748b' }}>Loading…</div> : err ? <div style={{ padding: 30, color: '#b91c1c' }}>{err}</div> : j && (
          <div style={{ padding: '18px 22px 40px' }}>
            {/* Attribution */}
            <div style={{ background: '#fff', border: '1px solid #e8ecf3', borderRadius: 12, padding: '14px 16px', marginBottom: 18 }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: '#6650d8', letterSpacing: .4, textTransform: 'uppercase', marginBottom: 8 }}>Where they came from</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px', fontSize: 12.5 }}>
                <div><span style={{ color: '#94a3b8' }}>Source</span><div style={{ fontWeight: 700, color: '#0f172a' }}>{a?.source || '—'}</div></div>
                <div><span style={{ color: '#94a3b8' }}>Medium</span><div style={{ fontWeight: 700, color: '#0f172a' }}>{a?.medium || '—'}</div></div>
                <div><span style={{ color: '#94a3b8' }}>Campaign</span><div style={{ fontWeight: 700, color: '#0f172a' }}>{a?.campaign || '—'}</div></div>
                <div><span style={{ color: '#94a3b8' }}>Ad</span><div style={{ fontWeight: 700, color: '#0f172a' }}>{a?.ad || '—'}</div></div>
                <div><span style={{ color: '#94a3b8' }}>Segment</span><div style={{ fontWeight: 700, color: '#0f172a' }}>{segLabel(a?.segment || undefined)}</div></div>
                <div><span style={{ color: '#94a3b8' }}>Device</span><div style={{ fontWeight: 700, color: '#0f172a' }}>{a?.device || '—'}</div></div>
              </div>
            </div>

            {/* Timeline */}
            <div style={{ position: 'relative', paddingLeft: 4 }}>
              {j.steps.map((step, i) => {
                const st = STATUS_STYLE[step.status] || STATUS_STYLE.pending;
                const last = i === j.steps.length - 1;
                return (
                  <div key={step.key} style={{ display: 'flex', gap: 14, position: 'relative' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: st.dot, boxShadow: `0 0 0 4px ${st.dot}22`, flexShrink: 0, marginTop: 3, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 10, fontWeight: 800 }}>{step.status === 'done' ? '✓' : step.status === 'failed' ? '!' : ''}</div>
                      {!last && <div style={{ width: 2, flex: 1, minHeight: 22, background: '#e2e8f0', margin: '2px 0' }} />}
                    </div>
                    <div style={{ paddingBottom: 16, flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: st.text }}>{step.label}</span>
                        <span style={{ fontSize: 10.5, color: '#94a3b8', whiteSpace: 'nowrap' }}>{fmt(step.at)}</span>
                      </div>
                      {step.detail && <div style={{ fontSize: 12, color: step.status === 'failed' ? '#b91c1c' : '#475569', marginTop: 3, lineHeight: 1.45 }}>{step.detail}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AssessmentCandidates: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<CandidateRow[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [filters, setFilters] = useState<{ status?: string; segment?: string; search?: string }>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [journeyRow, setJourneyRow] = useState<CandidateRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const [list, st] = await Promise.all([candidatesApi.list(filters), candidatesApi.stats()]);
      setRows(list || []);
      setStats(st?.byStatus || {});
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const unlock = async (r: CandidateRow) => {
    if (!r.userId) return;
    if (!window.confirm(`Unlock full content for ${r.name}?`)) return;
    try { await candidatesApi.unlock(r.userId); await load(); } catch (e: any) { setErr(e.message); }
  };

  return (
    <div className="aa-page">
      <div className="aa-header">
        <div>
          <h1>Assessment — Candidates</h1>
          <p>Everyone who took (or started) the assessment. Call the in-exam ones to nudge; unlock full content after a sale.</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="ac-stats">
        <div className="ac-stat"><span>Registered</span><b>{stats.registered || 0}</b></div>
        <div className="ac-stat hot"><span>In exam now</span><b>{stats.in_progress || 0}</b></div>
        <div className="ac-stat ok"><span>Completed</span><b>{stats.submitted || 0}</b></div>
        <div className="ac-stat"><span>Abandoned</span><b>{stats.abandoned || 0}</b></div>
      </div>

      {/* Filters */}
      <div className="aa-filters">
        <select value={filters.status || ''} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}>
          <option value="">All statuses</option>
          <option value="registered">Registered</option>
          <option value="in_progress">In exam</option>
          <option value="submitted">Completed</option>
          <option value="abandoned">Abandoned</option>
        </select>
        <select value={filters.segment || ''} onChange={(e) => setFilters((f) => ({ ...f, segment: e.target.value || undefined }))}>
          <option value="">All segments</option>
          {SEGMENT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <input placeholder="Search name / phone / email…" value={filters.search || ''} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))} />
      </div>

      {err && <div className="aa-err">{err}</div>}

      <div className="aa-table-wrap">
        {loading ? <div className="aa-msg">Loading…</div> : rows.length === 0 ? <div className="aa-msg">No candidates yet.</div> : (
          <table className="aa-table">
            <thead><tr><th>Candidate</th><th>Segment</th><th>Status</th><th>Progress</th><th>Readiness</th><th>Plan</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.name || '—'}</b><div className="ac-sub">{r.phone}{r.email ? ` · ${r.email}` : ''}</div></td>
                  <td>{segLabel(r.segment)}{r.yearsExperience != null ? ` · ${r.yearsExperience}y` : ''}{r.primaryLanguage ? ` · ${r.primaryLanguage}` : ''}</td>
                  <td><span className={`ac-status ${r.status}`}>{STATUS_LABEL[r.status] || r.status}</span></td>
                  <td>
                    {r.status === 'in_progress'
                      ? <div className="ac-progress"><div className="ac-progress-bar"><div className="ac-progress-fill" style={{ width: `${r.progress}%` }} /></div><span>{r.answered}/{r.total}</span></div>
                      : r.status === 'submitted' ? '✓' : '—'}
                  </td>
                  <td>{r.readinessScore != null ? <b>{r.readinessScore}</b> : '—'}{r.percentile != null ? <span className="ac-sub"> top {100 - r.percentile}%</span> : ''}</td>
                  <td className="ac-plan">{r.roadmapPlan || '—'}</td>
                  <td className="actions">
                    <button onClick={() => setJourneyRow(r)}>Journey</button>
                    {r.leadId && <button onClick={() => navigate(`/leads/${r.leadId}`)}>Lead</button>}
                    {r.userId && <button onClick={() => unlock(r)}>Unlock</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {journeyRow && <JourneyDrawer row={journeyRow} onClose={() => setJourneyRow(null)} />}
    </div>
  );
};

export default AssessmentCandidates;
