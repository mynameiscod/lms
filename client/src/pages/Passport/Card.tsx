import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { passportPublicApi, PassportCard } from '../../api/passportApi';

/**
 * Public, read-only CareerPilot card (shareable link `/careerpilot/card/:slug`).
 * No auth — anyone with the link can view the learner's verified Career Score, level
 * and pathway. This is the "shareable v1" of the CareerPilot.
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

  const wrap: React.CSSProperties = { minHeight: '100vh', background: 'linear-gradient(135deg,#1e1b4b,#0f766e)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 };

  if (loading) return <div style={{ ...wrap, color: '#fff' }}>Loading CareerPilot…</div>;
  if (notFound || !card) return <div style={{ ...wrap, color: '#fff', flexDirection: 'column', gap: 8 }}><div style={{ fontSize: 40 }}>🎫</div><div>This CareerPilot link isn’t valid.</div></div>;

  const score = card.careerScore ?? 0;
  const scoreColor = score >= 75 ? '#14a89c' : score >= 45 ? '#6650d8' : '#f59e0b';
  const memberSince = card.memberSince ? new Date(card.memberSince).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : null;
  const pathway = card.pathway ? (PATHWAY_LABEL[card.pathway] || card.pathway) : null;

  return (
    <div style={wrap}>
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 22, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,.35)' }}>
        {/* header band */}
        <div style={{ background: 'linear-gradient(120deg,#1e1b4b,#0f766e)', color: '#fff', padding: '22px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>🎫</span>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 0.5 }}>CAREER PASSPORT</div>
          </div>
          <div style={{ fontSize: 11, opacity: 0.75 }}>by CodeBegun</div>
        </div>

        <div style={{ padding: '26px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{card.name}</div>
          {pathway && <div style={{ fontSize: 13.5, color: '#64748b', marginTop: 4 }}>{pathway}</div>}

          {/* score gauge */}
          <div style={{ position: 'relative', width: 150, height: 150, margin: '18px auto 6px' }}>
            <svg width="150" height="150">
              <circle cx="75" cy="75" r="58" fill="none" stroke="#eef1f6" strokeWidth="13" />
              <circle cx="75" cy="75" r="58" fill="none" stroke={scoreColor} strokeWidth="13" strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 2 * Math.PI * 58} ${2 * Math.PI * 58}`} transform="rotate(-90 75 75)" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 42, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{card.careerScore ?? '—'}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Career Score</div>
            </div>
          </div>

          {card.level && <div style={{ display: 'inline-block', background: scoreColor + '1a', color: scoreColor, fontWeight: 800, fontSize: 14, padding: '6px 16px', borderRadius: 99 }}>{card.level}</div>}

          {memberSince && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 16 }}>Member since {memberSince}</div>}
        </div>

        <div style={{ borderTop: '1px solid #f1f5f9', padding: '14px 24px', textAlign: 'center' }}>
          <a href="/careerpilot/join" style={{ fontSize: 12.5, color: '#6650d8', fontWeight: 700, textDecoration: 'none' }}>Get your own CareerPilot →</a>
        </div>
      </div>
    </div>
  );
};

export default Card;
