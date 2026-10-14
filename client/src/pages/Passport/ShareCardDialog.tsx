import React, { useCallback, useEffect, useState } from 'react';
import { DashboardData, PassportCard, passportPublicApi } from '../../api/passportApi';
import { copyText, toast } from '../../components/feedback/appFeedback';
import { CareerCard } from './Card';
import { renderCardImage } from './shareCardImage';
import './shareCardDialog.css';

/**
 * Share your CareerPilot card: the card first, exactly as a friend will see it, then the ways to share.
 *
 * WHY IT FETCHES ON EVERY OPEN. The dialog used to draw from the dashboard payload the member layout
 * loads once, when the member arrives — so the card showed whatever was true at login, however much
 * they had done since, and never matched the public page (which read a score stored on the passport).
 * Now both read the same endpoint, computed on every request, and this one asks again each time it opens.
 */
const ShareCardDialog: React.FC<{ data: DashboardData; onClose: () => void }> = ({ data, onClose }) => {
  const slug = data.shareSlug || '';
  const url = `${window.location.origin}/careerpilot/card/${slug}`;
  const [card, setCard] = useState<PassportCard | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try { setCard((await passportPublicApi.getCard(slug)).card); }
    catch { setFailed(true); }
  }, [slug]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const name = card?.name || data.name || data.firstName || 'My CareerPilot';
  const message = card
    ? `${name} on CareerPilot — Level ${card.level.level} ${card.level.title}, coder score ${card.coderScore}, ${card.stats.xp.toLocaleString('en-IN')} XP and a ${card.stats.streak}-day streak. See my card:`
    : `${name} on CareerPilot. See my card:`;

  const download = async () => {
    if (!card) return;
    setSaving(true);
    try {
      const blob = await renderCardImage(card, url);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `careerpilot-card-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'me'}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast('Card image downloaded');
    } catch {
      toast('Could not create the image. Try again.', 'error');
    } finally { setSaving(false); }
  };

  return <div className="shc-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="shc" role="dialog" aria-modal="true" aria-labelledby="shc-title">
      <div className="shc-hd">
        <div>
          <h2 id="shc-title">Share your CareerPilot card</h2>
          <p>This is exactly what your friends see — your live progress, nothing private.</p>
        </div>
        <button className="shc-x" aria-label="Close" onClick={onClose}><i className="bi bi-x-lg" /></button>
      </div>

      <div className="shc-body">
        <div className="shc-preview">
          {card ? <CareerCard card={card} compact />
            : failed ? <div className="shc-state">
                <i className="bi bi-wifi-off" aria-hidden />
                <b>Your card could not be loaded</b>
                <button className="shc-btn" onClick={load}><i className="bi bi-arrow-clockwise" /> Try again</button>
              </div>
            : <div className="shc-state" aria-busy="true"><span className="shc-spin" aria-hidden /> Loading your latest figures…</div>}
        </div>

        <div className="shc-actions">
          <h3>Share it</h3>
          <a className="shc-btn wa" href={`https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`} target="_blank" rel="noreferrer">
            <i className="bi bi-whatsapp" /> Share on WhatsApp
          </a>
          <a className="shc-btn li" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer">
            <i className="bi bi-linkedin" /> Share on LinkedIn
          </a>
          <button className="shc-btn copy" onClick={() => copyText(url, 'Link copied — paste it anywhere')}>
            <i className="bi bi-link-45deg" /> Copy link
          </button>
          <button className="shc-btn dl" onClick={download} disabled={!card || saving}>
            <i className={`bi ${saving ? 'bi-hourglass-split' : 'bi-download'}`} /> {saving ? 'Creating image…' : 'Download image'}
          </button>
          <a className="shc-btn open" href={url} target="_blank" rel="noreferrer"><i className="bi bi-box-arrow-up-right" /> Open card</a>
          <p className="shc-url">{url}</p>
        </div>
      </div>
    </div>
  </div>;
};

export default ShareCardDialog;
