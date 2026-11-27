import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import visualizerApi, { VzListItem, vzError } from '../../api/visualizerApi';
import { useVzBase } from './Workspace';
import './CodeVisualizer.css';
import './vzLibrary.css';

/**
 * The library: concepts first (they are the foundation), then problems, filterable by topic and
 * difficulty. Filters run on the server, so this stays fast when the bank reaches thousands.
 */

const DIFFS = ['beginner', 'easy', 'medium', 'hard'];

/** Seven bar heights picked from the slug, so every card's little picture differs but never changes. */
const barsFor = (slug: string): number[] => {
  let h = 7;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return Array.from({ length: 7 }, (_, i) => 26 + ((h >>> (i * 4)) % 13) * 5);
};

/** The card's picture: bars with two being compared for a problem, a growth curve for a concept. */
const Preview: React.FC<{ it: VzListItem }> = ({ it }) => {
  if (it.kind === 'concept') {
    const space = /space|memory/i.test(`${it.slug} ${it.title}`);
    return (
      <span className="vzl-pic concept" aria-hidden>
        {space ? (
          <span className="vzl-mem">{[0, 1, 2, 3, 4].map((i) => <i key={i} className={i === 2 ? 'hot' : ''}>{i === 2 ? 'n' : i}</i>)}</span>
        ) : (
          <svg viewBox="0 0 120 64" preserveAspectRatio="none">
            <path d="M4 60 L116 58" className="c1" />
            <path d="M4 60 C40 52 80 40 116 30" className="c2" />
            <path d="M4 60 C50 58 80 40 116 4" className="c3" />
          </svg>
        )}
      </span>
    );
  }
  const bars = barsFor(it.slug);
  return (
    <span className="vzl-pic" aria-hidden>
      {bars.map((h, i) => <i key={i} className={i === 2 || i === 3 ? 'cmp' : i === 6 ? 'done' : ''} style={{ height: `${h}%` }} />)}
    </span>
  );
};

const CodeVisualizerLibrary: React.FC = () => {
  const base = useVzBase();
  const [params] = useSearchParams();
  const [items, setItems] = useState<VzListItem[]>([]);
  const [topics, setTopics] = useState<{ topic: string; count: number }[]>([]);
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
      .then(r => { if (!alive) return; setItems(r.items); setTopics(r.topics); setError(''); })
      .catch(e => alive && setError(vzError(e)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [topic, difficulty, q]);

  const concepts = useMemo(() => items.filter(i => i.kind === 'concept'), [items]);
  const problems = useMemo(() => items.filter(i => i.kind === 'problem'), [items]);
  const filtered = !!(topic || difficulty || q);
  const first = concepts[0] || problems[0];

  if (error) {
    return <div className="vz-root vzl"><div className="vz-empty"><h2><i className="fa-solid fa-lock" aria-hidden /> Code Visualizer</h2><p>{error}</p></div></div>;
  }

  const card = (it: VzListItem) => (
    <Link key={it._id} to={`${base}/${it.slug}`} className={`vzl-card ${it.kind}`}>
      <span className="vzl-stage">
        <Preview it={it} />
        <span className="vzl-kind"><i className={it.kind === 'concept' ? 'fa-regular fa-lightbulb' : 'fa-solid fa-code'} aria-hidden /> {it.kind === 'concept' ? 'Concept' : 'Problem'}</span>
      </span>
      <span className="vzl-body">
        <span className="vzl-tags">
          <span className="vzl-topic">{it.topic}</span>
          <span className={`vzl-diff d-${it.difficulty}`}>{it.difficulty}</span>
        </span>
        <span className="vzl-title">{it.title}</span>
        {it.summary && <span className="vzl-sum">{it.summary}</span>}
        <span className="vzl-foot">
          {it.kind === 'problem' && (it.timeComplexity || it.spaceComplexity) ? (
            <span className="vzl-cx">
              {it.timeComplexity && <span title="Time"><i className="fa-regular fa-clock" aria-hidden /> {it.timeComplexity}</span>}
              {it.spaceComplexity && <span title="Space"><i className="fa-solid fa-memory" aria-hidden /> {it.spaceComplexity}</span>}
            </span>
          ) : <span className="vzl-cx"><span><i className="fa-solid fa-sliders" aria-hidden /> Interactive</span></span>}
          <span className="vzl-go">{it.kind === 'concept' ? 'Learn' : 'Visualize'} <i className="fa-solid fa-arrow-right" aria-hidden /></span>
        </span>
      </span>
    </Link>
  );

  return (
    <div className="vz-root vzl">
      <section className="vzl-hero">
        <div className="vzl-copy">
          <span className="vzl-eyebrow">Code Visualizer</span>
          <h1>Watch Your Code <span>Run</span></h1>
          <p>Understand the problem, write the code, then step through it line by line — every variable, comparison and swap shown as it happens.</p>
        </div>
        <div className="vzl-bar">
          {first && (
            <Link className="vzl-btn" to={`${base}/${first.slug}`}>
              <i className="fa-solid fa-play" aria-hidden /> {first.kind === 'concept' ? 'Start with the basics' : 'Start visualizing'}
            </Link>
          )}
          <div className="vzl-stats">
            <div><i className="fa-regular fa-lightbulb ic amber" aria-hidden /><span><b>{loading && !items.length ? '—' : concepts.length}</b><small>Concepts</small></span></div>
            <div><i className="fa-solid fa-code ic blue" aria-hidden /><span><b>{loading && !items.length ? '—' : problems.length}</b><small>Problems</small></span></div>
            <div><i className="fa-solid fa-layer-group ic teal" aria-hidden /><span><b>{topics.length || '—'}</b><small>Topics</small></span></div>
          </div>
        </div>
        <ol className="vzl-how" aria-label="How it works">
          <li><b>1</b><span><strong>Read</strong> the problem — stuck? break it down</span></li>
          <li><b>2</b><span><strong>Write</strong> your solution in Java</span></li>
          <li><b>3</b><span><strong>Visualize</strong> and step through every line</span></li>
        </ol>
      </section>

      <section className="vzl-panel">
        <div className="vzl-filters">
          <label className="vzl-search"><i className="fa-solid fa-magnifying-glass" aria-hidden />
            <input placeholder="Search problems and concepts…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search" />
          </label>
          <select className="vzl-select" value={topic} onChange={e => setTopic(e.target.value)} aria-label="Topic">
            <option value="">All topics</option>
            {topics.map(t => <option key={t.topic} value={t.topic}>{t.topic} ({t.count})</option>)}
          </select>
          {filtered && (
            <button type="button" className="vzl-reset" onClick={() => { setTopic(''); setDifficulty(''); setSearch(''); }}>
              <i className="fa-solid fa-rotate-left" aria-hidden /> Reset
            </button>
          )}
        </div>
        <div className="vzl-chips" role="group" aria-label="Difficulty">
          <button className={!difficulty ? 'on' : ''} aria-pressed={!difficulty} onClick={() => setDifficulty('')}>All levels</button>
          {DIFFS.map(d => (
            <button key={d} className={`d-${d}${difficulty === d ? ' on' : ''}`} aria-pressed={difficulty === d} onClick={() => setDifficulty(d)}><i aria-hidden />{d}</button>
          ))}
        </div>

        {loading && !items.length ? <div className="vz-empty"><i className="fa-solid fa-spinner fa-spin" aria-hidden /> Loading…</div> : items.length === 0 ? (
          <div className="vzl-none">
            <i className="fa-solid fa-magnifying-glass" aria-hidden />
            <h3>Nothing matches</h3>
            <p>Try another topic or level, or clear the search.</p>
          </div>
        ) : (
          <>
            {concepts.length > 0 && (<>
              <h2 className="vzl-section"><i className="fa-regular fa-lightbulb" aria-hidden /> Concepts <span>Start here: what Big-O and memory mean</span></h2>
              <div className="vzl-grid">{concepts.map(card)}</div>
            </>)}
            {problems.length > 0 && (<>
              <h2 className="vzl-section"><i className="fa-solid fa-code" aria-hidden /> Problems <span>Write the code, then watch it run</span></h2>
              <div className="vzl-grid">{problems.map(card)}</div>
            </>)}
          </>
        )}
      </section>
    </div>
  );
};

export default CodeVisualizerLibrary;
