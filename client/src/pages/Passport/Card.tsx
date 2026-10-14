import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { passportPublicApi, PassportCard } from '../../api/passportApi';
import './shareCard.css';

/**
 * The CareerPilot card — one design, drawn in two places:
 *   • the public page a friend opens (`/careerpilot/card/:slug`, no login), and
 *   • the preview inside the member's own "Share my CareerPilot card" dialog.
 *
 * Both read GET /public/passport/card/:slug, which the server computes on every request, so the
 * card always carries today's figures. It used to be drawn from two different stale sources —
 * the dashboard payload loaded once at login, and a score stored on the passport that only moves
 * when an assessment is submitted — which is why the score on it never seemed to update.
 */

const API_ORIGIN = (() => {
  try { return new URL(process.env.REACT_APP_API_URL || '/api/v1', window.location.origin).origin; }
  catch { return window.location.origin; }
})();
/** Uploaded photos are served by the API, which is not always this page's origin. */
export const photoUrl = (p: string | null | undefined): string | null =>
  !p ? null : /^https?:\/\//.test(p) ? p : `${API_ORIGIN}${p}`;

export const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'C';

/** Home's coder score is out of 1000 (its parts can add to a little more; the ring stops at full). */
export const CODER_MAX = 1000;

export const subtitleOf = (c: PassportCard): string | null =>
  [c.stage ? `${c.stage} stage` : null, c.track || null].filter(Boolean).join(' · ') || null;

export const aimOf = (c: PassportCard): string | null =>
  c.role ? `Aiming for ${c.role}` : c.careerGoal ? `Working towards ${c.careerGoal}` : null;

export const statTiles = (c: PassportCard) => {
  const s = c.stats;
  return [
    { ic: 'bi-lightning-charge-fill', tone: 'amber', value: s.xp.toLocaleString('en-IN'), label: 'XP earned' },
    { ic: 'bi-graph-up-arrow', tone: 'navy', value: c.careerScore === null ? '—' : `${c.careerScore}/100`, label: c.careerScore === null ? 'Career readiness · measuring' : `Career readiness${c.careerLevel ? ` · ${c.careerLevel}` : ''}` },
    { ic: 'bi-fire', tone: 'red', value: String(s.streak), label: `Day streak · best ${s.longestStreak}` },
    { ic: 'bi-coin', tone: 'amber', value: s.coins === null ? '—' : s.coins.toLocaleString('en-IN'), label: 'Coins' },
    { ic: 'bi-code-slash', tone: 'teal', value: String(s.solved), label: 'Problems solved' },
    { ic: 'bi-calendar2-check-fill', tone: 'green', value: s.totalDays ? `${s.daysCompleted}/${s.totalDays}` : String(s.daysCompleted), label: 'Plan days done' },
    { ic: 'bi-patch-check-fill', tone: 'teal', value: String(s.testsPassed), label: 'Tests passed' },
    { ic: 'bi-mic-fill', tone: 'navy', value: String(s.interviews), label: 'Mock interviews' },
  ];
};

export const CareerCard: React.FC<{ card: PassportCard; compact?: boolean }> = ({ card, compact }) => {
  const [photoOk, setPhotoOk] = useState(true);
  const photo = photoOk ? photoUrl(card.photo) : null;
  const score = Math.max(0, Math.round(card.coderScore || 0));
  const deg = Math.min(CODER_MAX, score) / CODER_MAX * 360;
  const sub = subtitleOf(card);
  const aim = aimOf(card);
  const memberSince = card.memberSince
    ? new Date(card.memberSince).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : null;

  return (
    <article className={`cpc${compact ? ' cpc-compact' : ''}`} aria-label={`${card.name}'s CareerPilot card`}>
      <header className="cpc-hero">
        <div className="cpc-top">
          <span className="cpc-logo">
            <img src="/assets/careerpilot/careerpilot-logo.png" alt="CareerPilot by CodeBegun"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          </span>
          <span className="cpc-verified"><i className="bi bi-patch-check-fill" aria-hidden /> Verified progress</span>
        </div>

        <div className="cpc-who">
          <span className="cpc-av">
            {photo ? <img src={photo} alt="" onError={() => setPhotoOk(false)} /> : initialsOf(card.name)}
          </span>
          <div className="cpc-id">
            <h3>{card.name}</h3>
            {sub && <p>{sub}</p>}
            {aim && <p className="cpc-aim"><i className="bi bi-bullseye" aria-hidden /> {aim}</p>}
          </div>
        </div>

        <div className="cpc-scores">
          <div className="cpc-ring" style={{ ['--cpc-deg' as any]: `${deg}deg` }}
            role="img" aria-label={`Coder score ${score} out of ${CODER_MAX}`}>
            <div><strong>{score}</strong><span>/ {CODER_MAX}</span></div>
          </div>
          <div className="cpc-score-copy">
            <small>Coder score</small>
            <div className="cpc-level">
              <b>Level {card.level.level}</b><span>{card.level.title}</span>
            </div>
            <div className="cpc-bar" aria-hidden><i style={{ width: `${Math.max(3, card.level.progressPct)}%` }} /></div>
            <em>{card.level.xpToNextLevel.toLocaleString('en-IN')} XP to Level {card.level.level + 1}</em>
          </div>
        </div>
      </header>

      <div className="cpc-body">
        <ul className="cpc-stats">
          {statTiles(card).map(t => (
            <li key={t.label} className={`t-${t.tone}`}>
              <i className={`bi ${t.ic}`} aria-hidden />
              <b>{t.value}</b>
              <span>{t.label}</span>
            </li>
          ))}
        </ul>

        {card.topSkills.length > 0 && (
          <section className="cpc-skills">
            <h4><i className="bi bi-diagram-3-fill" aria-hidden /> Top skills · Skill DNA</h4>
            {card.topSkills.map(s => (
              <div key={s.key} className="cpc-skill">
                <span>{s.name}</span>
                <div className="cpc-skill-bar" aria-hidden><i style={{ width: `${Math.max(4, Math.min(100, s.score))}%` }} /></div>
                <b>{s.score}</b>
              </div>
            ))}
          </section>
        )}
      </div>

      <footer className="cpc-foot">
        <span>{memberSince ? `Member since ${memberSince}` : 'CareerPilot member'}</span>
        <span>Updated {new Date(card.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
      </footer>
    </article>
  );
};

/** The public page (`/careerpilot/card/:slug`). No auth — anyone with the link can view it. */
const CardPage: React.FC = () => {
  const { slug } = useParams();
  const [card, setCard] = useState<PassportCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { card } = await passportPublicApi.getCard(String(slug));
        setCard(card);
      } catch { setNotFound(true); }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <main className="spc-page"><div className="spc-note">Loading this CareerPilot card…</div></main>;
  if (notFound || !card) return <main className="spc-page">
    <div className="spc-note">
      <span className="spc-note-ic"><i className="bi bi-link-45deg" /></span>
      <b>This CareerPilot link is not valid</b>
      <span>It may have been changed or removed. Ask for a fresh link.</span>
      <a className="spc-cta" href="/careerpilot/join">Start your own CareerPilot <i className="bi bi-arrow-right" /></a>
    </div>
  </main>;

  return (
    <main className="spc-page">
      <div className="spc-wrap">
        <CareerCard card={card} />
        <div className="spc-foot">
          <span>Built on real assessments, practice and projects.</span>
          <a className="spc-cta" href="/careerpilot/join">Get your own CareerPilot <i className="bi bi-arrow-right" /></a>
        </div>
      </div>
    </main>
  );
};

export default CardPage;
