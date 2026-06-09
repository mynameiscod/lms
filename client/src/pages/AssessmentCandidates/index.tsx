import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { candidatesApi, CandidateRow, DIMENSIONS } from '../../api/assessmentAdminApi';
import { SEGMENT_OPTIONS } from '../../api/assessmentApi';
import '../AssessmentAdmin/AssessmentAdmin.css';
import './AssessmentCandidates.css';

const segLabel = (v?: string) => SEGMENT_OPTIONS.find((s) => s.value === v)?.label || v || '—';
const STATUS_LABEL: Record<string, string> = { registered: 'Registered', in_progress: 'In exam', submitted: 'Completed', abandoned: 'Abandoned' };

const AssessmentCandidates: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<CandidateRow[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [filters, setFilters] = useState<{ status?: string; segment?: string; search?: string }>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

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
                    {r.leadId && <button onClick={() => navigate(`/leads/${r.leadId}`)}>Lead</button>}
                    {r.userId && <button onClick={() => unlock(r)}>Unlock</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AssessmentCandidates;
