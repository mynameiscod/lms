import React, { useEffect, useState } from 'react';
import passportApi, { NewsItem } from '../../api/passportApi';
import PassportShell, { LockedPanel } from './PassportShell';

/**
 * Daily tech news for members.
 *
 * Every card is a summary plus a link out — the article itself stays with the publisher,
 * who is credited on every card. That is deliberate: republishing someone's writing on a
 * paid product is copying, and a student wants three lines and a way to read on anyway.
 */

const dayLabel = (iso: string): string => {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(today.getTime() - 86400000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'Today';
  if (same(d, y)) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const News: React.FC = () => {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [locked, setLocked] = useState<{ priceInr?: number } | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    passportApi.getNews()
      .then(r => { if (r.locked) setLocked({ priceInr: r.priceInr }); else setItems(r.items || []); })
      .catch(e => setErr(e?.response?.data?.message || 'Could not load the news'));
  }, []);

  if (locked) {
    return (
      <PassportShell>
        <LockedPanel
          title="Daily Tech News is part of your membership"
          blurb="A couple of things a day from the tech industry, summarised for someone job hunting — what happened, and why it matters to you."
          priceInr={locked.priceInr}
        />
      </PassportShell>
    );
  }
  if (err) return <PassportShell><div className="pm-msg err">{err}</div></PassportShell>;
  if (!items) return <PassportShell><div className="pm-card">Loading…</div></PassportShell>;

  // Grouped by day so the feed reads as a diary rather than an undifferentiated list.
  const groups: { label: string; rows: NewsItem[] }[] = [];
  for (const n of items) {
    const label = dayLabel(n.publishedAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.rows.push(n);
    else groups.push({ label, rows: [n] });
  }

  return (
    <PassportShell>
      <div className="pm-head">
        <h1>Tech News</h1>
        <p>What happened in tech, and why it matters when you're job hunting.</p>
      </div>

      {!items.length && (
        <div className="pm-card">Nothing posted yet — check back tomorrow.</div>
      )}

      {groups.map(g => (
        <div key={g.label}>
          <div className="nw-day">{g.label}</div>
          {g.rows.map(n => (
            <a className="nw-card" key={n.id} href={n.url} target="_blank" rel="noreferrer noopener">
              {n.imageUrl && (
                // Hidden rather than broken if the publisher moves the file.
                <img className="nw-img" src={n.imageUrl} alt=""
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              )}
              <div className="nw-tx">
                <b>{n.title}</b>
                <p>{n.summary}</p>
                {n.note && <p className="nw-note">{n.note}</p>}
                <div className="nw-meta">
                  {/* Attribution on every card, not buried in a footer. */}
                  <span className="src">{n.source || new URL(n.url).hostname}</span>
                  {n.tags.map(t => <span className="tag" key={t}>#{t}</span>)}
                  <span className="go">Read →</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      ))}
    </PassportShell>
  );
};

export default News;
