import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import visualizerApi, { VzListItem, vzError } from '../../api/visualizerApi';
import { useVzBase } from './Workspace';
import './CodeVisualizer.css';

/**
 * The library: concepts first (they are the foundation), then problems, filterable by topic and
 * difficulty. Filters run on the server, so this stays fast when the bank reaches thousands.
 */

const DIFFS = ['beginner', 'easy', 'medium', 'hard'];

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

  useEffect(() => { const t = window.setTimeout(() => setQ(search.trim()), 300); return () => window.clearTimeout(t); }, [search]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    visualizerApi.list({ topic: topic || undefined, difficulty: difficulty || undefined, search: q || undefined })
      .then(r => { if (!alive) return; setItems(r.items); setTopics(r.topics); setTotal(r.total); setError(''); })
      .catch(e => alive && setError(vzError(e)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [topic, difficulty, q]);

  const concepts = useMemo(() => items.filter(i => i.kind === 'concept'), [items]);
  const problems = useMemo(() => items.filter(i => i.kind === 'problem'), [items]);

  if (error) {
    return <div className="vz-root"><div className="vz-empty"><h2><i className="fa-solid fa-lock" aria-hidden /> Code Visualizer</h2><p>{error}</p></div></div>;
  }

  const card = (it: VzListItem) => (
    <Link key={it._id} to={`${base}/${it.slug}`} className={`vz-lib-card ${it.kind}`}>
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
    <div className="vz-root vz-lib">
      {/* One top card: what this is, how much there is, and every filter. */}
      <section className="vz-hero2">
        <div className="vz-hero2-top">
          <span className="vz-hero2-ic"><i className="fa-solid fa-chart-simple" aria-hidden /></span>
          <div className="vz-hero2-copy">
            <h1>Code <span>Visualizer</span></h1>
            <p>Understand the problem, write the code, then watch it run — line by line, with every variable, comparison and swap shown.</p>
          </div>
          <div className="vz-hero2-counts">
            <span><b>{concepts.length}</b> concept{concepts.length === 1 ? '' : 's'}</span>
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
      </section>

      {loading ? <div className="vz-empty">Loading…</div> : items.length === 0 ? (
        <div className="vz-empty">Nothing matches these filters yet.</div>
      ) : (
        <>
          {concepts.length > 0 && (<><h2 className="vz-section">Concepts <span>Start here: what Big-O and memory mean</span></h2><div className="vz-lib-grid">{concepts.map(card)}</div></>)}
          {problems.length > 0 && (<><h2 className="vz-section">Problems <span>{total} item{total === 1 ? '' : 's'} in the library</span></h2><div className="vz-lib-grid">{problems.map(card)}</div></>)}
        </>
      )}
    </div>
  );
};

export default CodeVisualizerLibrary;
