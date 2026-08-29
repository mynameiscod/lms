import React, { useEffect, useState } from 'react';
import passportApi, { NewsItem } from '../../api/passportApi';
import PassportShell, { LockedPanel } from './PassportShell';

/** Daily tech news for members. Every card remains a summary plus an attributed link. */
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

  if (locked) return <PassportShell><LockedPanel title="Daily Tech News is part of your membership" blurb="A couple of things a day from the tech industry, summarised for someone job hunting — what happened, and why it matters to you." priceInr={locked.priceInr} /></PassportShell>;
  if (err) return <PassportShell><div className="pm-msg err">{err}</div></PassportShell>;
  if (!items) return <PassportShell><div className="pm-card">Loading…</div></PassportShell>;

  const groups: { label: string; rows: NewsItem[] }[] = [];
  for (const n of items) {
    const label = dayLabel(n.publishedAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.rows.push(n);
    else groups.push({ label, rows: [n] });
  }

  return <PassportShell>
    <div className="pm-head"><div className="cb-page-kicker"><i className="bi bi-newspaper" /> Industry briefing</div><h1>Tech News</h1><p>What happened in tech, and why it matters when you're job hunting.</p></div>
    {!items.length && <div className="pm-card nw-empty"><i className="bi bi-inbox" /><b>Nothing posted yet</b><span>Check back tomorrow for the next industry briefing.</span></div>}
    {groups.map(g => <section className="nw-group" key={g.label}><div className="nw-day">{g.label}</div>{g.rows.map(n => <a className="nw-card" key={n.id} href={n.url} target="_blank" rel="noreferrer noopener">{n.imageUrl && <img className="nw-img" src={n.imageUrl} alt="" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />}<div className="nw-tx"><b>{n.title}</b><p>{n.summary}</p>{n.note && <p className="nw-note"><i className="bi bi-lightbulb" /> {n.note}</p>}<div className="nw-meta"><span className="src">{n.source || new URL(n.url).hostname}</span>{n.tags.map(t => <span className="tag" key={t}>#{t}</span>)}<span className="go">Read article <i className="bi bi-arrow-up-right" /></span></div></div></a>)}</section>)}
  </PassportShell>;
};

export default News;
