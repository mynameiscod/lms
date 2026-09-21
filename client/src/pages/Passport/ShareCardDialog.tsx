import React, { useEffect, useState } from 'react';
import { DashboardData } from '../../api/passportApi';
import './shareCardDialog.css';

/**
 * Sharing a CareerPilot card used to copy a link and say nothing else, so nobody knew what their
 * friends would see. This shows the card first — the same figures the public page carries — and then
 * offers the ways people actually share: WhatsApp, LinkedIn, or the plain link.
 */
const ShareCardDialog: React.FC<{ data: DashboardData; onClose: () => void }> = ({ data, onClose }) => {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/careerpilot/card/${data.shareSlug}`;
  const st = data.stats;
  const lv = data.level;
  const score = data.careerScore ?? data.coderScore?.score ?? null;
  const name = data.name || data.firstName || 'My CareerPilot';
  const message = `${name} on CareerPilot${lv?.title ? ` — ${lv.title}` : ''}${score !== null ? `, career score ${score}` : ''}. See my card:`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2200); }
    catch { window.prompt('Copy your CareerPilot link:', url); }
  };

  return <div className="shc-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="shc" role="dialog" aria-modal="true" aria-labelledby="shc-title">
      <div className="shc-hd">
        <div>
          <h2 id="shc-title">Share your CareerPilot card</h2>
          <p>This is what your friends see — your verified progress, nothing private.</p>
        </div>
        <button className="shc-x" aria-label="Close" onClick={onClose}><i className="bi bi-x-lg" /></button>
      </div>

      <div className="shc-body">
        <article className="shc-card">
          <header>
            <img src="/assets/careerpilot/careerpilot-logo.png" alt="CareerPilot by CodeBegun"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            <span>Verified progress</span>
          </header>
          <div className="shc-name">
            <span className="shc-av">{(name[0] || 'C').toUpperCase()}</span>
            <div><b>{name}</b>{lv?.title && <small>Level {lv.level} · {lv.title}</small>}</div>
          </div>
          <div className="shc-score">
            <div className="shc-ring" style={{ ['--shc-deg' as any]: `${Math.min(100, score ?? 0) * 3.6}deg` }}>
              <div><strong>{score ?? '—'}</strong><span>score</span></div>
            </div>
            <ul>
              {st && <li><b>{st.xp.toLocaleString()}</b><span>XP earned</span></li>}
              {st && <li><b>{st.streak}</b><span>day streak</span></li>}
              {st && <li><b>{st.solved}</b><span>problems solved</span></li>}
            </ul>
          </div>
          <footer>careerpilot.codebegun.com</footer>
        </article>

        <div className="shc-actions">
          <a className="shc-btn wa" href={`https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`} target="_blank" rel="noreferrer">
            <i className="bi bi-whatsapp" /> Share on WhatsApp
          </a>
          <a className="shc-btn li" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer">
            <i className="bi bi-linkedin" /> Share on LinkedIn
          </a>
          <button className={`shc-btn copy${copied ? ' done' : ''}`} onClick={copy}>
            <i className={`bi ${copied ? 'bi-check-lg' : 'bi-link-45deg'}`} /> {copied ? 'Link copied' : 'Copy link'}
          </button>
          <a className="shc-btn open" href={url} target="_blank" rel="noreferrer"><i className="bi bi-box-arrow-up-right" /> Open the card</a>
          <p className="shc-url">{url}</p>
        </div>
      </div>
    </div>
  </div>;
};

export default ShareCardDialog;
