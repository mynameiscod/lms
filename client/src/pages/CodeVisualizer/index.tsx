import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
  const [items, setItems] = useState<VzListItem[]>([]);
  const [topics, setTopics] = useState<{ topic: string; count: number }[]>([]);
  const [total, setTotal] = useState(0);
  const [topic, setTopic] = useState('');
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
    return <div className="vz-root"><div className="vz-empty"><h2>🔒 Code Visualizer</h2><p>{error}</p></div></div>;
  }

  const card = (it: VzListItem) => (
    <Link key={it._id} to={`${base}/${it.slug}`} className={`vz-lib-card ${it.kind}`}>
      <div className="vz-lib-card-top">
        <span className="vz-chip">{it.topic}</span>
        <span className={`vz-chip d-${it.difficulty}`}>{it.difficulty}</span>
      </div>
      <h3>{it.kind === 'concept' ? '💡 ' : ''}{it.title}</h3>
      {it.summary && <p>{it.summary}</p>}
      {(it.timeComplexity || it.spaceComplexity) && it.kind === 'problem' && (
        <div className="vz-lib-cx">
          {it.timeComplexity && <span>⏱ {it.timeComplexity}</span>}
          {it.spaceComplexity && <span>🧠 {it.spaceComplexity}</span>}
        </div>
      )}
    </Link>
  );

  return (
    <div className="vz-root">
      <div className="vz-hero">
        <div>
          <h1>🔬 Code Visualizer</h1>
          <p>Understand the problem, write the code, then watch it run — line by line, with every variable, comparison and swap shown.</p>
        </div>
      </div>

      <div className="vz-filters">
        <input className="vz-search" placeholder="Search problems and concepts…" value={search} onChange={e => setSearch(e.target.value)} />
        <select value={topic} onChange={e => setTopic(e.target.value)} aria-label="Topic">
          <option value="">All topics</option>
          {topics.map(t => <option key={t.topic} value={t.topic}>{t.topic} ({t.count})</option>)}
        </select>
        <div className="vz-seg">
          <button className={`vz-seg-btn${!difficulty ? ' on' : ''}`} onClick={() => setDifficulty('')}>All</button>
          {DIFFS.map(d => (
            <button key={d} className={`vz-seg-btn${difficulty === d ? ' on' : ''}`} onClick={() => setDifficulty(d)}>{d}</button>
          ))}
        </div>
        <span className="vz-muted">{total} item{total === 1 ? '' : 's'}</span>
      </div>

      {loading ? <div className="vz-empty">Loading…</div> : items.length === 0 ? (
        <div className="vz-empty">Nothing matches these filters yet.</div>
      ) : (
        <>
          {concepts.length > 0 && (<><h2 className="vz-section">Concepts</h2><div className="vz-lib-grid">{concepts.map(card)}</div></>)}
          {problems.length > 0 && (<><h2 className="vz-section">Problems</h2><div className="vz-lib-grid">{problems.map(card)}</div></>)}
        </>
      )}
    </div>
  );
};

export default CodeVisualizerLibrary;
