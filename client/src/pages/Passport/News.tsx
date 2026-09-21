import React, { useEffect, useState } from 'react';
import passportApi, { NewsItem } from '../../api/passportApi';
import PassportShell from './PassportShell';
import SectionLock from './SectionLock';
import './newsRedesign.css';

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

/**
 * The publisher's name, from the story or failing that its address.
 *
 * `new URL(...)` throws on anything that is not an absolute address, and an admin pasting a
 * bare "example.com/story" would have taken the whole page down with it — a missing byline is
 * not worth a blank screen.
 */
const sourceOf = (n: NewsItem): string => {
  if (n.source) return n.source;
  try { return new URL(n.url).hostname.replace(/^www\./, ''); }
  catch { return 'Source'; }
};

const News: React.FC = () => {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [locked, setLocked] = useState<{ priceInr?: number } | null>(null);
  const [err, setErr] = useState('');
  /**
   * Stories whose picture would not load, tracked rather than hidden in the DOM.
   *
   * The old handler set `display: none` on the image, which left its grid column standing as a
   * white gap — it read as a broken card. Knowing which ones failed lets the card draw the same
   * placeholder a story with no image gets.
   */
  const [noShot, setNoShot] = useState<string[]>([]);

  useEffect(() => {
    passportApi.getNews()
      .then(r => { if (r.locked) setLocked({ priceInr: r.priceInr }); else setItems(r.items || []); })
      .catch(e => setErr(e?.response?.data?.message || 'Could not load the news'));
  }, []);

  /**
   * This rendered a LockedPanel with NO `onUnlock`, so the one button on the one screen whose
   * entire job is to sell was a dead click. The shared lock owns the checkout, which is why it
   * exists: six hand-rolled locks meant six places for the payment flow to rot, and it had
   * already rotted here.
   */
  if (locked) return <PassportShell><SectionLock section="news" /></PassportShell>;
  if (err) return <PassportShell><div className="pm-msg err">{err}</div></PassportShell>;
  if (!items) return <PassportShell><div className="nws"><div className="nws-load"><i className="bi bi-arrow-repeat" /> Loading today’s briefing…</div></div></PassportShell>;

  const groups: { label: string; rows: NewsItem[] }[] = [];
  for (const n of items) {
    const label = dayLabel(n.publishedAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.rows.push(n);
    else groups.push({ label, rows: [n] });
  }

  /**
   * The banner figures, all counted from the stories already on screen.
   *
   * `latest` is the newest date in the payload rather than the first row, because the ordering
   * is the server's business and a banner that disagrees with the list under it is worse than
   * no banner at all.
   */
  const latest = items.reduce<string>((a, n) => (!a || n.publishedAt > a ? n.publishedAt : a), '');
  const sources = new Set(items.map(sourceOf)).size;

  return <PassportShell>
    <div className="nws">
      <header className="nws-banner">
        <div className="nws-banner-copy">
          <span className="nws-eyebrow"><i className="bi bi-newspaper" /> Industry briefing</span>
          <h1>Tech <span>News</span></h1>
          <p>What happened in tech, and why it matters when you’re job hunting. Every story is summarised, tagged and linked straight back to the people who published it.</p>
        </div>
        {/* Figures only once there is something to count — three zeroes would say nothing. */}
        {!!items.length && <div className="nws-figs">
          <div className="nws-fig"><i className="bi bi-collection-fill" /><b>{items.length}</b><small>Briefing{items.length === 1 ? '' : 's'} posted</small></div>
          <div className="nws-fig teal"><i className="bi bi-clock-history" /><b>{dayLabel(latest)}</b><small>Latest update</small></div>
          <div className="nws-fig"><i className="bi bi-broadcast-pin" /><b>{sources}</b><small>Source{sources === 1 ? '' : 's'} covered</small></div>
        </div>}
      </header>

      {!items.length && <div className="nws-quiet">
        <span className="ic"><i className="bi bi-newspaper" /></span>
        <b>No briefings yet</b>
        <span>Your mentors post the day’s tech stories here — come back tomorrow for the first one.</span>
      </div>}

      {groups.map(g => <section className="nws-group" key={g.label}>
        <div className="nws-day"><span>{g.label}</span><i /></div>
        <div className="nws-list">
          {g.rows.map(n => <a className="nws-card" key={n.id} href={n.url} target="_blank" rel="noreferrer noopener">
            {n.imageUrl && !noShot.includes(n.id)
              ? <img className="nws-shot" src={n.imageUrl} alt="" onError={() => setNoShot(s => (s.includes(n.id) ? s : [...s, n.id]))} />
              : <span className="nws-shot nws-shot-fb"><i className="bi bi-newspaper" /></span>}
            <div className="nws-body">
              <span className="nws-src"><i className="bi bi-broadcast" /> {sourceOf(n)}</span>
              <b>{n.title}</b>
              <p>{n.summary}</p>
              {n.note && <p className="nws-why"><i className="bi bi-lightbulb-fill" /><span>{n.note}</span></p>}
              <div className="nws-foot">
                {n.tags.map(t => <span className="nws-tag" key={t}>#{t}</span>)}
                <span className="nws-go">Read article <i className="bi bi-arrow-up-right" /></span>
              </div>
            </div>
          </a>)}
        </div>
      </section>)}
    </div>
  </PassportShell>;
};

export default News;
