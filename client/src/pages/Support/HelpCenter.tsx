import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supportApi, { FaqHit, errorText } from '../../api/supportApi';
import MyTickets from './MyTickets';
import { Loading, EmptyState } from './supportUi';
import './support.css';

/**
 * Help & Support home: search the Help Center (live suggestions while typing, a logged search
 * on Enter), browse by category, reach the assistant, report a problem, see recent tickets.
 * When a search finds nothing, the next step is offered right there — never a dead end.
 */
const HelpCenter: React.FC<{ basePath: string }> = ({ basePath }) => {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [suggestions, setSuggestions] = useState<FaqHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [results, setResults] = useState<FaqHit[] | null>(null);
  const [searched, setSearched] = useState('');
  const [searching, setSearching] = useState(false);
  const [err, setErr] = useState('');
  const [cats, setCats] = useState<{ category: string; count: number }[] | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => { supportApi.categories().then(setCats).catch(() => setCats([])); }, []);

  // Suggestions, debounced so a fast typist sends one request, not ten.
  useEffect(() => {
    window.clearTimeout(timer.current);
    const term = q.trim();
    if (term.length < 2) { setSuggestions([]); return; }
    timer.current = window.setTimeout(() => {
      supportApi.suggest(term).then(s => { setSuggestions(s); setActive(-1); }).catch(() => setSuggestions([]));
    }, 250);
    return () => window.clearTimeout(timer.current);
  }, [q]);

  const runSearch = async (term = q.trim()) => {
    if (term.length < 2) return;
    setOpen(false); setSearching(true); setErr('');
    try { setResults(await supportApi.search(term)); setSearched(term); }
    catch (e) { setErr(errorText(e, 'Search is not available right now.')); setResults(null); }
    setSearching(false);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || !suggestions.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(suggestions.length, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(-1, a - 1)); }
    else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      if (active < suggestions.length) nav(`${basePath}/articles/${suggestions[active].id}`);
      else nav(`${basePath}/assistant`, { state: { question: q.trim() } });
    } else if (e.key === 'Escape') setOpen(false);
  };

  const listId = 'sp-suggest-list';
  return (
    <div className="sp">
      <section className="sp-hero">
        <h1>How can we help you today?</h1>
        <form role="search" className="sp-search" onSubmit={e => { e.preventDefault(); runSearch(); }}>
          <label className="sp-sr" htmlFor="sp-hc-q">Search help articles</label>
          <i className="bi bi-search" aria-hidden />
          <input
            id="sp-hc-q" className="sp-search-input" value={q} autoComplete="off" maxLength={200}
            placeholder="Search for a problem, e.g. reset password"
            role="combobox" aria-expanded={open && q.trim().length >= 2} aria-controls={listId} aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `sp-sg-${active}` : undefined}
            onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKey}
            onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          />
          <button type="submit" className="sp-btn sp-btn-teal">Search</button>
          {open && q.trim().length >= 2 && (
            <ul id={listId} role="listbox" className="sp-suggest">
              {suggestions.map((s, i) => (
                <li key={s.id} id={`sp-sg-${i}`} role="option" aria-selected={active === i} className={active === i ? 'on' : ''}
                  onMouseDown={() => nav(`${basePath}/articles/${s.id}`)}>
                  <i className="bi bi-file-text" aria-hidden /> {s.question}
                </li>
              ))}
              <li id={`sp-sg-${suggestions.length}`} role="option" aria-selected={active === suggestions.length}
                className={`sp-suggest-ai${active === suggestions.length ? ' on' : ''}`}
                onMouseDown={() => nav(`${basePath}/assistant`, { state: { question: q.trim() } })}>
                <i className="bi bi-stars" aria-hidden /> Ask the AI assistant about this
              </li>
            </ul>
          )}
        </form>
      </section>

      {searching && <Loading text="Searching…" />}
      {err && <p className="sp-err" role="alert">{err}</p>}
      {results && !searching && (
        <section className="sp-card" style={{ marginBottom: 18 }} aria-live="polite">
          <h2>{results.length ? `Articles for “${searched}”` : `No articles for “${searched}”`}</h2>
          {results.length ? (
            <ul className="sp-list">
              {results.map(r => (
                <li key={r.id}>
                  <button type="button" className="sp-item" onClick={() => nav(`${basePath}/articles/${r.id}`)}>
                    <div className="sp-item-main"><div className="sp-item-subj">{r.question}</div><div className="sp-item-meta">{r.category}</div></div>
                    <i className="bi bi-chevron-right" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="sp-hint">We could not find an article for that yet.</p>
          )}
          <div className="sp-actions">
            <button type="button" className="sp-btn sp-btn-ghost" onClick={() => nav(`${basePath}/assistant`, { state: { question: searched } })}><i className="bi bi-stars" aria-hidden /> Ask the AI assistant about this</button>
            <button type="button" className="sp-btn sp-btn-ghost" onClick={() => nav(`${basePath}/new`)}><i className="bi bi-bug" aria-hidden /> Report a problem</button>
          </div>
        </section>
      )}

      <div className="sp-tiles">
        <button type="button" className="sp-tile" onClick={() => nav(`${basePath}/assistant`)}>
          <i className="bi bi-stars" aria-hidden /><b>Ask the AI assistant</b><span>Answers from our help articles, with links to where they came from.</span>
        </button>
        <button type="button" className="sp-tile" onClick={() => nav(`${basePath}/new`)}>
          <i className="bi bi-bug" aria-hidden /><b>Report a problem</b><span>Tell us what went wrong and we will look into it.</span>
        </button>
        <button type="button" className="sp-tile" onClick={() => nav(`${basePath}/tickets`)}>
          <i className="bi bi-ticket-detailed" aria-hidden /><b>My tickets</b><span>See replies and the status of what you reported.</span>
        </button>
      </div>

      <section style={{ marginTop: 22 }}>
        <h2>Browse by topic</h2>
        {cats === null ? <Loading /> : cats.length === 0 ? (
          <p className="sp-hint">Help articles will appear here as they are published.</p>
        ) : (
          <div className="sp-filters">
            {cats.map(c => (
              <button key={c.category} type="button" className="sp-chip" onClick={() => nav(`${basePath}/browse?category=${encodeURIComponent(c.category)}`)}>
                {c.category} <span className="sp-hint">({c.count})</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="sp-card" style={{ marginTop: 18 }}>
        <div className="sp-head" style={{ marginBottom: 4 }}>
          <h2 style={{ margin: 0 }}>Recent tickets</h2>
          <button type="button" className="sp-back" style={{ margin: 0 }} onClick={() => nav(`${basePath}/tickets`)}>View all</button>
        </div>
        <MyTickets basePath={basePath} compact limit={5} />
      </section>
    </div>
  );
};

export const FaqBrowse: React.FC<{ basePath: string; category: string }> = ({ basePath, category }) => {
  const nav = useNavigate();
  const [data, setData] = useState<FaqHit[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    setData(null);
    supportApi.faqs({ category }).then(r => setData(r.articles)).catch(e => setErr(errorText(e, 'Articles could not be loaded.')));
  }, [category]);
  return (
    <div className="sp">
      <button type="button" className="sp-back" onClick={() => nav(basePath)}><i className="bi bi-arrow-left" aria-hidden /> Help &amp; Support</button>
      <h1>{category}</h1>
      <div className="sp-card" style={{ marginTop: 12 }}>
        {err ? <p className="sp-err" role="alert">{err}</p> : !data ? <Loading /> : data.length === 0 ? <EmptyState title="No articles in this topic yet" /> : (
          <ul className="sp-list">
            {data.map(a => (
              <li key={a.id}>
                <button type="button" className="sp-item" onClick={() => nav(`${basePath}/articles/${a.id}`)}>
                  <div className="sp-item-main"><div className="sp-item-subj">{a.question}</div><div className="sp-item-meta">{a.snippet}</div></div>
                  <i className="bi bi-chevron-right" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default HelpCenter;
