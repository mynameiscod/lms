import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { passportPublicApi, PassportCard } from '../../api/passportApi';
import './shareCard.css';

/**
 * Public, read-only CareerPilot card (shareable link `/careerpilot/card/:slug`).
 * No auth — anyone with the link can view the learner's verified career score, level and pathway.
 * It is the first thing a friend sees of CareerPilot, so it carries the brand rather than a bare
 * panel of inline styles: the logo navy, the logo teal, and one clear way in at the bottom.
 */
const PATHWAY_LABEL: Record<string, string> = {
  software_dev: 'Software Development Foundation',
  data_analytics: 'Data Analytics Foundation',
  ai_ready: 'AI-Ready Student',
  it_bridge: 'IT Career Bridge',
};

const Card: React.FC = () => {
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

  const logo = <img className="spc-logo" src="/assets/careerpilot/careerpilot-logo.png" alt="CareerPilot by CodeBegun"
    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />;

  if (loading) return <main className="spc-page"><div className="spc-note">Loading this CareerPilot card…</div></main>;
  if (notFound || !card) return <main className="spc-page">
    <div className="spc-note">
      <span className="spc-note-ic"><i className="bi bi-link-45deg" /></span>
      <b>This CareerPilot link is not valid</b>
      <span>It may have been changed or removed. Ask for a fresh link.</span>
      <a className="spc-cta" href="/careerpilot/join">Start your own CareerPilot <i className="bi bi-arrow-right" /></a>
    </div>
  </main>;

  const score = card.careerScore ?? 0;
  const memberSince = card.memberSince ? new Date(card.memberSince).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : null;
  const pathway = card.pathway ? (PATHWAY_LABEL[card.pathway] || card.pathway) : null;

  return (
    <main className="spc-page">
      <article className="spc-card">
        <header className="spc-head">
          {logo}
          <span className="spc-verified"><i className="bi bi-patch-check-fill" /> Verified progress</span>
        </header>

        <div className="spc-body">
          <div className="spc-who">
            <span className="spc-av">{(card.name?.[0] || 'C').toUpperCase()}</span>
            <div>
              <b>{card.name}</b>
              {pathway && <small>{pathway}</small>}
            </div>
          </div>

          <div className="spc-score">
            <div className="spc-ring" style={{ ['--spc-deg' as any]: `${Math.min(100, score) * 3.6}deg` }}>
              <div><strong>{card.careerScore ?? '—'}</strong><span>Career score</span></div>
            </div>
            <div className="spc-facts">
              {card.level && <p><i className="bi bi-award-fill" /> {card.level}</p>}
              {card.careerGoal && <p><i className="bi bi-bullseye" /> Working towards {card.careerGoal}</p>}
              {memberSince && <p><i className="bi bi-calendar3" /> Member since {memberSince}</p>}
            </div>
          </div>
        </div>

        <footer className="spc-foot">
          <span>Built on real assessments, practice and projects.</span>
          <a className="spc-cta" href="/careerpilot/join">Get your own CareerPilot <i className="bi bi-arrow-right" /></a>
        </footer>
      </article>
    </main>
  );
};

export default Card;
