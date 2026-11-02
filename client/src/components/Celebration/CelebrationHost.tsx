import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import passportApi from '../../api/passportApi';
import { useUndoZoom } from '../../utils/useUndoZoom';
import { Celebration, CelebrationKind, CelebrationStat, celebrate, celebrateMembership, onCelebrate } from './celebrate';
import './celebration.css';

/**
 * Draws every celebration (see celebrate.ts): confetti on a canvas and one card with the news.
 *
 * Mounted once, inside the router and above the routes. Closes on Continue, Escape, a tap on the
 * backdrop, or by itself after a few seconds — unless the member is reading it (pointer or focus
 * on the card), because a card that vanishes under the mouse is a card nobody finished reading.
 *
 * Members who asked their device for less motion get the card without confetti or count-up.
 */
const COLOURS = ['#051D64', '#359AAD', '#7FD3E0', '#F5B83D', '#17885D', '#F2789F', '#FFFFFF'];
const AUTO_CLOSE_MS = 7000;

const reducedMotion = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

/** How much confetti each moment earns: paying is the biggest, a day the smallest. */
const BURSTS: Record<CelebrationKind, { pieces: number; waves: number }> = {
  membership: { pieces: 170, waves: 3 },
  assessment: { pieces: 140, waves: 2 },
  day: { pieces: 90, waves: 1 },
};

const ICONS: Record<CelebrationKind, string> = {
  membership: 'bi-stars',
  assessment: 'bi-award-fill',
  day: 'bi-patch-check-fill',
};

const EYEBROWS: Record<CelebrationKind, string> = {
  membership: 'Membership active',
  assessment: 'Assessment complete',
  day: 'Day complete',
};

interface Piece { x: number; y: number; vx: number; vy: number; rot: number; vr: number; w: number; h: number; c: string; round: boolean; life: number }

/** Confetti thrown from the two bottom corners and the top, falling under gravity until it is off-screen. */
function useConfetti(canvasRef: React.RefObject<HTMLCanvasElement>, kind: CelebrationKind | null) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !kind || reducedMotion()) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0; let H = 0;
    const size = () => {
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    window.addEventListener('resize', size);

    const pieces: Piece[] = [];
    const scale = Math.min(1, Math.max(0.55, W / 1100)); // fewer, smaller pieces on a phone
    const add = (n: number, from: 'left' | 'right' | 'top') => {
      for (let i = 0; i < n; i++) {
        const speed = (9 + Math.random() * 9) * (H / 800 + 0.4);
        const angle = from === 'left' ? -Math.PI / 3 - Math.random() * 0.45
          : from === 'right' ? -Math.PI * 2 / 3 + Math.random() * 0.45
          : Math.PI / 2;
        pieces.push({
          x: from === 'left' ? -10 : from === 'right' ? W + 10 : Math.random() * W,
          y: from === 'top' ? -20 - Math.random() * H * 0.4 : H * 0.92,
          vx: from === 'top' ? (Math.random() - 0.5) * 2 : Math.cos(angle) * speed,
          vy: from === 'top' ? 1 + Math.random() * 2 : Math.sin(angle) * speed,
          rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
          w: (6 + Math.random() * 6) * scale, h: (9 + Math.random() * 8) * scale,
          c: COLOURS[(Math.random() * COLOURS.length) | 0], round: Math.random() < 0.25, life: 0,
        });
      }
    };
    const { pieces: count, waves } = BURSTS[kind];
    const n = Math.round(count * scale);
    const timers: number[] = [];
    for (let w = 0; w < waves; w++) {
      timers.push(window.setTimeout(() => {
        add(Math.round(n * 0.4), 'left'); add(Math.round(n * 0.4), 'right'); add(Math.round(n * 0.2), 'top');
      }, w * 650));
    }

    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i];
        p.life++;
        p.vy += 0.28; p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx + Math.sin(p.life / 9) * 0.6; p.y += p.vy; p.rot += p.vr;
        if (p.y > H + 30) { pieces.splice(i, 1); continue; }
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        // The white pieces need an edge to show on the light card.
        if (p.c === '#FFFFFF') { ctx.strokeStyle = 'rgba(5,29,100,.25)'; ctx.lineWidth = 1; }
        if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); }
        else {
          // Flip the rectangle's height as it turns, so it reads as paper spinning in the air.
          const h = p.h * Math.abs(Math.cos(p.life / 7));
          ctx.fillRect(-p.w / 2, -h / 2, p.w, h);
          if (p.c === '#FFFFFF') ctx.strokeRect(-p.w / 2, -h / 2, p.w, h);
        }
        ctx.restore();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf); timers.forEach(t => clearTimeout(t));
      window.removeEventListener('resize', size);
    };
  }, [canvasRef, kind]);
}

/** A number that climbs from 0 to its value over about a second. */
const CountUp: React.FC<{ stat: CelebrationStat }> = ({ stat }) => {
  const [v, setV] = useState(() => (reducedMotion() ? stat.value : 0));
  useEffect(() => {
    if (reducedMotion()) { setV(stat.value); return undefined; }
    let raf = 0; const start = performance.now(); const dur = 1100;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      setV(Math.round(stat.value * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    // Starts once the card has popped in.
    const delay = window.setTimeout(() => { raf = requestAnimationFrame(step); }, 300);
    return () => { clearTimeout(delay); cancelAnimationFrame(raf); };
  }, [stat.value]);
  return (
    <div className="cbc-stat">
      <b>{stat.prefix || ''}{v.toLocaleString('en-IN')}</b>
      <small>{stat.label}</small>
    </div>
  );
};

const CelebrationHost: React.FC = () => {
  const [queue, setQueue] = useState<Celebration[]>([]);
  const current = queue[0] || null;
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const held = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => onCelebrate(c => setQueue(q => [...q, c])), []);
  // Development only: lets a screenshot script or a console call play one without doing the work.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return undefined;
    (window as any).__celebrate = celebrate;
    return () => { delete (window as any).__celebrate; };
  }, []);

  /*
   * The redirect leg of checkout (mobile, popup blocked) returns to /careerpilot?paid=1 in a fresh
   * page load, where the in-page "payment done" moment never ran. The flag only asks the question;
   * the server's answer decides — a member whose payment did not settle sees no party.
   */
  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    if (qs.get('paid') !== '1') return;
    qs.delete('paid');
    const rest = qs.toString();
    navigate({ pathname: location.pathname, search: rest ? `?${rest}` : '' }, { replace: true });
    passportApi.me().then((me: any) => { if (me?.active) celebrateMembership(); }).catch(() => { /* no party */ });
  }, [location.pathname, location.search, navigate]);

  // The app is zoomed to 0.75 on desktop; the overlay and its canvas are drawn at true size.
  useUndoZoom(rootRef, !!current);
  useConfetti(canvasRef, current ? current.kind : null);

  const close = useCallback(() => { held.current = false; setQueue(q => q.slice(1)); }, []);

  useEffect(() => {
    if (!current) return undefined;
    primaryRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    const timer = window.setInterval(() => { if (!held.current) close(); }, AUTO_CLOSE_MS);
    return () => { window.removeEventListener('keydown', onKey); clearInterval(timer); };
  }, [current, close]);

  if (!current) return null;

  const go = () => {
    const to = current.action?.to;
    close();
    if (to) navigate(to);
  };

  return (
    <div ref={rootRef} className={`cbc-root k-${current.kind}`} onClick={close}>
      <canvas ref={canvasRef} className="cbc-canvas" aria-hidden="true" />
      <div
        className="cbc-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cbc-title"
        onClick={e => e.stopPropagation()}
        onPointerEnter={() => { held.current = true; }}
        onPointerLeave={() => { held.current = false; }}
        onFocus={() => { held.current = true; }}
      >
        <div className="cbc-head">
          <span className="cbc-medal" aria-hidden="true"><i className={`bi ${ICONS[current.kind]}`} /></span>
          <span className="cbc-eyebrow">{EYEBROWS[current.kind]}</span>
          <h2 id="cbc-title">{current.title}</h2>
          {current.message && <p>{current.message}</p>}
        </div>
        {!!current.stats?.length && (
          <div className="cbc-stats">
            {current.stats.slice(0, 3).map(s => <CountUp key={s.label} stat={s} />)}
          </div>
        )}
        <div className="cbc-actions">
          {current.action ? (
            <>
              <button ref={primaryRef} type="button" className="cbc-btn primary" onClick={go}>
                {current.action.label} <i className="bi bi-arrow-right" aria-hidden="true" />
              </button>
              <button type="button" className="cbc-btn ghost" onClick={close}>Close</button>
            </>
          ) : (
            <button ref={primaryRef} type="button" className="cbc-btn primary" onClick={close}>Continue</button>
          )}
        </div>
        <button type="button" className="cbc-x" aria-label="Close" onClick={close}><i className="bi bi-x-lg" /></button>
      </div>
    </div>
  );
};

export default CelebrationHost;
