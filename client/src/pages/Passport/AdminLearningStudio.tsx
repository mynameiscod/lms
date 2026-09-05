/**
 * Learning Studio — every concept, and whether it can actually teach.
 *
 * WHY A SECOND SCREEN BESIDE CONCEPT BANK. The Concept Bank answers "what material exists for
 * this skill", which is a content question. This answers a different one: "is this concept
 * ready to be taught, in an order that makes sense" — and the honest answer for most concepts
 * is no, which was previously invisible. A skill with six unordered resources and a skill with
 * a finished journey looked identical.
 *
 * READINESS IS COMPUTED, NEVER STORED. A concept that reads 92% today reads less tomorrow if
 * somebody retires a resource it points at, which is exactly what an author needs to know.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { StudioConcept } from '../../api/passportApi';
import './learningStudio.css';

const STATUS_LABEL: Record<string, string> = {
  PUBLISHED: 'Published', READY: 'Ready to publish', INCOMPLETE: 'Incomplete',
  NOT_CONFIGURED: 'Not started', ARCHIVED: 'Archived',
};

const AdminLearningStudio: React.FC = () => {
  const nav = useNavigate();
  const [rows, setRows] = useState<StudioConcept[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const r = await passportApi.studioConcepts();
      setRows(r.concepts); setSummary(r.summary);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not load the studio.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => rows.filter(r => {
    if (status && r.status !== status) return false;
    if (!q) return true;
    const hay = `${r.skillName} ${r.skillKey} ${r.category}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  }), [rows, q, status]);

  /** Grouped by the skill graph's own categories, so the list reads like the curriculum does. */
  const grouped = useMemo(() => {
    const m = new Map<string, StudioConcept[]>();
    for (const r of filtered) {
      const k = r.category || 'Other';
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <div className="lst-page">
      <header className="lst-head">
        <div>
          <span className="lst-kicker">CAREERPILOT</span>
          <h1>Learning Studio</h1>
          <p>What a student actually does when a mission opens a concept — in order, and only
             once each. A concept is taught from its published journey; without one, missions
             fall back to the first mapped resource.</p>
        </div>
        <button className="lst-btn" onClick={load} disabled={loading}>
          <i className="bi bi-arrow-clockwise" /> {loading ? 'Loading…' : 'Refresh'}
        </button>
      </header>

      {err && <div className="lst-msg err">{err}</div>}

      {summary && (
        <div className="lst-kpis">
          <div className="lst-kpi"><span>Concepts</span><b>{summary.total}</b><small>with a journey or content</small></div>
          <div className="lst-kpi good"><span>Published</span><b>{summary.published}</b><small>teaching students now</small></div>
          <div className="lst-kpi"><span>Ready</span><b>{summary.ready}</b><small>pass every check, not yet live</small></div>
          <div className="lst-kpi warn"><span>Incomplete</span><b>{summary.incomplete}</b><small>cannot be published yet</small></div>
        </div>
      )}

      <div className="lst-filters">
        <label className="lst-grow">Search
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="concept name or key" />
        </label>
        <label>Status
          <select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>

      {loading ? <div className="lst-empty">Loading…</div>
        : !filtered.length ? (
          <div className="lst-empty">
            <i className="bi bi-journal-x" />
            <h3>Nothing to show</h3>
            <p>A concept appears here once it has a learning journey or at least one mapped
               resource. Map content in the Concept Bank first.</p>
          </div>
        ) : grouped.map(([category, items]) => (
          <section className="lst-group" key={category}>
            <h2>{category}</h2>
            <div className="lst-rows">
              {items.map(r => (
                <button key={r.skillKey} className="lst-row"
                        onClick={() => nav(`/admin/passport/learning-studio/${encodeURIComponent(r.skillKey)}`)}>
                  <span className="lst-name">
                    <b>{r.skillName}</b>
                    <small>{r.skillKey}</small>
                  </span>
                  <span className="lst-meta">
                    {r.stepCount > 0 ? `${r.stepCount} step${r.stepCount === 1 ? '' : 's'}` : 'No journey'}
                    {r.resources > 0 && <> · {r.resources} resource{r.resources === 1 ? '' : 's'}</>}
                    {r.estimatedMinutes > 0 && <> · {Math.round(r.estimatedMinutes / 6) / 10}h</>}
                  </span>
                  <span className="lst-bar" title={`${r.readiness}% of every check`}>
                    <i style={{ width: `${r.readiness}%` }} className={r.readiness >= 100 ? 'full' : ''} />
                  </span>
                  <span className="lst-pct">{r.readiness}%</span>
                  <span className={`lst-status s-${r.status.toLowerCase()}`}>{STATUS_LABEL[r.status] || r.status}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
    </div>
  );
};

export default AdminLearningStudio;
