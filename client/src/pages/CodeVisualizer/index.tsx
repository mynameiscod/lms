import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import visualizerApi, { VzListItem, vzError } from '../../api/visualizerApi';
import { useVzBase } from './Workspace';
import './CodeVisualizer.css';
import './premium/vzPremium.css';
import './learn/learn.css';
import VzLoader from './premium/VzLoader';
import VzToolbar, { useVzTheme } from './premium/VzToolbar';
import { BUNDLED_MODULES } from './learn/bundled';

/**
 * The library: concepts first (they are the foundation), then problems, filterable by topic and
 * difficulty. Filters run on the server, so this stays fast when the bank reaches thousands.
 */

const DIFFS = ['beginner', 'easy', 'medium', 'hard'];

const STAGE_LABEL: Record<string, string> = {
  foundations: 'Foundations', linear: 'Linear structures', techniques: 'Techniques',
  nonlinear: 'Trees and graphs', algorithms: 'Algorithms', interview: 'Interview',
};

const CodeVisualizerLibrary: React.FC = () => {
  const base = useVzBase();
  const [params] = useSearchParams();
  const [items, setItems] = useState<VzListItem[]>([]);
  const [topics, setTopics] = useState<{ topic: string; count: number }[]>([]);
  const [total, setTotal] = useState(0);
  const [topic, setTopic] = useState(() => params.get('topic') || '');
  const [difficulty, setDifficulty] = useState('');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  /* The premium look is the LMS page only; CareerPilot's copy of this page keeps its own. */
  const premium = base === '/visualizer';
  const [theme, setTheme] = useVzTheme();
  const [loadedOnce, setLoadedOnce] = useState(false);

  useEffect(() => { const t = window.setTimeout(() => setQ(search.trim()), 300); return () => window.clearTimeout(t); }, [search]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    visualizerApi.list({ topic: topic || undefined, difficulty: difficulty || undefined, search: q || undefined })
      .then(r => { if (!alive) return; setItems(r.items); setTopics(r.topics); setTotal(r.total); setError(''); })
      .catch(e => alive && setError(vzError(e)))
      .finally(() => { if (alive) { setLoading(false); setLoadedOnce(true); } });
    return () => { alive = false; };
  }, [topic, difficulty, q]);

  const concepts = useMemo(() => items.filter(i => i.kind === 'concept'), [items]);
  const problems = useMemo(() => items.filter(i => i.kind === 'problem'), [items]);
  /*
   * LMS page only: every DSA curriculum module is also a concept card here, opening its lesson.
   * Modules are not graded by difficulty or tagged with a Visualizer topic, so they show when those
   * filters are off; the search box filters them by title and summary like everything else.
   */
  const conceptModules = useMemo(() => {
    if (!premium || topic || difficulty) return [];
    const needle = q.toLowerCase();
    return BUNDLED_MODULES.filter(m => !needle || m.title.toLowerCase().includes(needle) || m.summary.toLowerCase().includes(needle));
  }, [premium, topic, difficulty, q]);

  if (error) {
    return <div className={`vz-root${premium ? ' vzp' : ''}`} data-vz-theme={premium ? theme : undefined}><div className="vz-empty"><h2><i className="fa-solid fa-lock" aria-hidden /> Code Visualizer</h2><p>{error}</p></div></div>;
  }

  const card = (it: VzListItem, idx = 0) => (
    <Link key={it._id} to={`${base}/${it.slug}`} className={`vz-lib-card ${it.kind}`} style={premium ? { ['--i' as any]: idx } : undefined}>
      <div className="vz-lib-card-top">
        <span className="vz-lib-ic"><i className={it.kind === 'concept' ? 'fa-regular fa-lightbulb' : 'fa-solid fa-code'} aria-hidden /></span>
        <span className="vz-chip">{it.topic}</span>
        <span className={`vz-chip d-${it.difficulty}`}>{it.difficulty}</span>
      </div>
      <h3>{it.title}</h3>
      {it.summary && <p>{it.summary}</p>}
      <div className="vz-lib-foot">
        {it.kind === 'problem' && (it.timeComplexity || it.spaceComplexity) ? (
          <span className="vz-lib-cx">
            {it.timeComplexity && <span><i className="fa-regular fa-clock" aria-hidden /> {it.timeComplexity}</span>}
            {it.spaceComplexity && <span><i className="fa-solid fa-memory" aria-hidden /> {it.spaceComplexity}</span>}
          </span>
        ) : <span className="vz-lib-cx" />}
        <span className="vz-lib-go">{it.kind === 'concept' ? 'Learn' : 'Open'} <i className="fa-solid fa-arrow-right" aria-hidden /></span>
      </div>
    </Link>
  );

  return (
    <div className={`vz-root vz-lib${premium ? ' vzp' : ''}`} data-vz-theme={premium ? theme : undefined}>
      {/* One top card: what this is, how much there is, and every filter. */}
      <section className="vz-hero2">
        <div className="vz-hero2-top">
          <span className="vz-hero2-ic"><i className="fa-solid fa-chart-simple" aria-hidden /></span>
          <div className="vz-hero2-copy">
            <h1>Code <span>Visualizer</span></h1>
            <p>Understand the problem, write the code, then watch it run — line by line, with every variable, comparison and swap shown.</p>
          </div>
          {premium && <VzToolbar theme={theme} onTheme={setTheme} />}
          <div className="vz-hero2-counts">
            <span><b>{concepts.length + conceptModules.length}</b> concept{concepts.length + conceptModules.length === 1 ? '' : 's'}</span>
            <span><b>{problems.length}</b> problem{problems.length === 1 ? '' : 's'}</span>
          </div>
        </div>
        <div className="vz-filters">
          <label className="vz-search-wrap"><i className="fa-solid fa-magnifying-glass" aria-hidden />
            <input className="vz-search" placeholder="Search problems and concepts…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search" />
          </label>
          <select value={topic} onChange={e => setTopic(e.target.value)} aria-label="Topic">
            <option value="">All topics</option>
            {topics.map(t => <option key={t.topic} value={t.topic}>{t.topic} ({t.count})</option>)}
          </select>
          <div className="vz-seg" role="group" aria-label="Difficulty">
            <button className={`vz-seg-btn${!difficulty ? ' on' : ''}`} onClick={() => setDifficulty('')}>All</button>
            {DIFFS.map(d => (
              <button key={d} className={`vz-seg-btn${difficulty === d ? ' on' : ''}`} onClick={() => setDifficulty(d)}>{d}</button>
            ))}
          </div>
        </div>
        {premium && (
          <div className="vzp-hero-art" aria-hidden="true">
            {[5, 3, 8, 2, 10, 12, 6].map((h, i) => <span key={i} style={{ ['--h' as any]: h, ['--i' as any]: i }} />)}
          </div>
        )}
      </section>

      {premium && loading && !loadedOnce ? <VzLoader /> : loading && !premium ? <div className="vz-empty">Loading…</div> : items.length === 0 && conceptModules.length === 0 ? (
        <div className="vz-empty">Nothing matches these filters yet.</div>
      ) : (
        <>
          {(concepts.length > 0 || conceptModules.length > 0) && (
            <>
              <h2 className="vz-section">
                Concepts <span>{premium ? `Start with Big-O and memory, then the ${BUNDLED_MODULES.length} curriculum modules in order` : 'Start here: what Big-O and memory mean'}</span>
                {premium && <Link to="/visualizer/learn" className="vzp-section-link">Open the curriculum</Link>}
              </h2>
              <div className={`vz-lib-grid${premium && loading ? ' is-refreshing' : ''}`}>
                {concepts.map((c, i) => card(c, i))}
                {conceptModules.map((m, i) => (
                  <Link key={m.slug} to={`/visualizer/learn/${m.slug}`} className="vz-lib-card concept vzp-mcard" style={{ ['--i' as any]: concepts.length + i }}>
                    <div className="vz-lib-card-top">
                      <span className="vzp-mnum" aria-label={`Module ${m.order}`}>{String(m.order).padStart(2, '0')}</span>
                      <span className="vz-chip">{STAGE_LABEL[m.stage] || m.stage}</span>
                      <span className={`vz-chip ${m.overview ? 'is-lesson' : 'is-outline'}`}>{m.overview ? 'Full lesson' : 'Outline'}</span>
                    </div>
                    <h3>{m.title}</h3>
                    <p>{m.summary}</p>
                    <div className="vz-lib-foot">
                      <span className="vz-lib-cx">
                        {(m.javaExamples || []).length > 0 && <span title="Java examples" aria-label={`${(m.javaExamples || []).length} Java examples`}><i className="fa-brands fa-java" aria-hidden /> {(m.javaExamples || []).length} Java</span>}
                        {((m.visualizerSlugs || []).length + (m.widgets || []).length) > 0 && <span title="Visualizations" aria-label={`${(m.visualizerSlugs || []).length + (m.widgets || []).length} visualizations`}><i className="fa-solid fa-chart-simple" aria-hidden /> {(m.visualizerSlugs || []).length + (m.widgets || []).length} visual{(m.visualizerSlugs || []).length + (m.widgets || []).length === 1 ? '' : 's'}</span>}
                      </span>
                      <span className="vz-lib-go">Learn <i className="fa-solid fa-arrow-right" aria-hidden /></span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
          {problems.length > 0 && (<><h2 className="vz-section">Problems <span>{total} item{total === 1 ? '' : 's'} in the library</span></h2><div className={`vz-lib-grid${premium && loading ? ' is-refreshing' : ''}`}>{problems.map((c, i) => card(c, i))}</div></>)}
        </>
      )}
    </div>
  );
};

export default CodeVisualizerLibrary;
