/**
 * The Learning Studio — where a skill stops being one video and becomes a course.
 *
 * WHY THIS SCREEN EXISTS. CONCEPT_LEARNING_V1 shipped with a model, a service, a resolver, a
 * mission bridge and nine endpoints, and no way for a human to reach any of it. A concept
 * journey could only be authored by writing JSON against the API, which means in practice that
 * no journey was ever authored: the feature flag sat off because there was nothing behind it.
 * A curriculum an admin cannot edit is not a curriculum, it is a schema.
 *
 * WHAT AN ADMIN IS ACTUALLY DOING HERE. Picking a skill and writing out the way it should be
 * taught — Loops divides into for loops, while loops and nested loops; for loops divides again
 * into an explanation, a worked example and some practice. The skill stays one skill, measured
 * once, blueprinted once, with one question pool. Only the teaching is broken up.
 *
 * THE LIST IS ABOUT READINESS, NOT INVENTORY. Rows are ordered by category and named by status,
 * because the question an author arrives with is "what is stopping the next concept from going
 * live", not "how many concepts are there". A row that says INCOMPLETE says why.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { passportApi, ConceptJourneyRow, ConceptJourneyList } from '../../api/passportApi';
import './learningStudio.css';

const STATUS_LABEL: Record<string, string> = {
  PUBLISHED: 'Live',
  READY: 'Ready to publish',
  INCOMPLETE: 'Needs work',
  NOT_CONFIGURED: 'Not started',
};

const statusClass = (s: string) => `is-${String(s || '').toLowerCase().replace(/_/g, '')}`;

const LearningStudio: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<ConceptJourneyList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      setData(await passportApi.listConceptJourneys());
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not load the Learning Studio.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const concepts = data?.concepts || [];

  const categories = useMemo(
    () => Array.from(new Set(concepts.map(c => c.category).filter(Boolean))).sort(),
    [concepts],
  );

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return concepts.filter(c =>
      (!status || c.status === status) &&
      (!category || c.category === category) &&
      (!q || c.skillName.toLowerCase().includes(q) || c.skillKey.toLowerCase().includes(q)));
  }, [concepts, search, status, category]);

  /**
   * What a row says about itself, in an author's terms rather than the model's.
   *
   * A concept with resources and no unit is the common starting state and the most useful thing
   * to say about it is how much material is already waiting — that is the difference between
   * "start from nothing" and "arrange what you have".
   */
  const describe = (c: ConceptJourneyRow): string => {
    if (!c.unitId) {
      return c.resources
        ? `${c.resources} resource${c.resources === 1 ? '' : 's'} mapped, no journey yet`
        : 'No journey and no content yet';
    }
    const parts = [
      `${c.stepCount} step${c.stepCount === 1 ? '' : 's'}`,
      `${c.estimatedMinutes} min`,
      `v${c.version}`,
    ];
    if (c.unitStatus && c.unitStatus !== 'PUBLISHED') parts.push(c.unitStatus.toLowerCase());
    return parts.join(' · ');
  };

  const s = data?.summary;

  return (
    <div className="ls-wrap">
      <header className="ls-head">
        <div className="ls-head-text">
          <h1 className="ls-title">Learning Studio</h1>
          <p className="ls-sub">
            How each skill is taught: its topics, its subtopics, and the order a student meets them in.
          </p>
        </div>
        <div className="ls-actions">
          <button className="ls-btn" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </header>

      {s && (
        <div className="ls-summary">
          <span><strong>{s.published}</strong> live</span>
          <span><strong>{s.ready}</strong> ready to publish</span>
          <span><strong>{s.incomplete}</strong> need work</span>
          <span><strong>{s.notConfigured}</strong> not started</span>
          <span className="ls-muted">
            Only a live journey reaches a student. Everything else is invisible to them.
          </span>
        </div>
      )}

      {error && <div className="ls-error">{error}</div>}

      <div className="ls-filters">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search a skill…"
          aria-label="Search a skill"
        />
        <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">Any status</option>
          {Object.keys(STATUS_LABEL).map(k => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}
        </select>
        <select value={category} onChange={e => setCategory(e.target.value)} aria-label="Filter by category">
          <option value="">Any category</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading && !data && <p className="ls-muted">Loading…</p>}

      {!loading && concepts.length === 0 && !error && (
        /**
         * The list only shows skills that have a unit or some mapped content, so an empty list
         * means the content library has not been mapped to skills at all — which is a different
         * problem from an empty studio, and is fixed on a different screen.
         */
        <div className="ls-empty">
          <p>No skill has a journey or any mapped content yet.</p>
          <p className="ls-muted">
            Map content to skills first — a journey is assembled from resources that already
            point at the skill it teaches.
          </p>
        </div>
      )}

      {shown.length > 0 && (
        <ul className="ls-list">
          {shown.map(c => (
            <li key={c.skillKey}>
              <button
                className={`ls-item ${statusClass(c.status)}`}
                onClick={() => navigate(`/admin/learning-studio/${c.skillKey}`)}
              >
                <span className="ls-item-text">
                  <span className="ls-item-title">{c.unitTitle || c.skillName}</span>
                  <span className="ls-item-meta">
                    {c.skillKey}{c.category ? ` · ${c.category}` : ''} · {describe(c)}
                  </span>
                  {c.blocking.length > 0 && (
                    // Named, not counted: "2 problems" is a number somebody ignores, the list is
                    // a task somebody can pick up.
                    <span className="ls-item-blocking">{c.blocking.join(' · ')}</span>
                  )}
                </span>
                <span className="ls-item-right">
                  {c.unitId && <span className="ls-muted">{c.readiness}%</span>}
                  <span className={`ls-chip ${statusClass(c.status)}`}>
                    {STATUS_LABEL[c.status] || c.status}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && concepts.length > 0 && shown.length === 0 && (
        <p className="ls-muted">Nothing matches those filters.</p>
      )}
    </div>
  );
};

export default LearningStudio;
