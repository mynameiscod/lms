import { PassportCard } from '../../api/passportApi';
import { CODER_MAX, aimOf, initialsOf, photoUrl, statTiles, subtitleOf } from './Card';

/**
 * The CareerPilot card as a PNG, drawn on a canvas — for "Download image" in the share dialog.
 *
 * Drawn by hand rather than by screenshotting the DOM, so there is no new dependency, and the
 * picture is a fixed 1080×1350 (the portrait size WhatsApp status, Instagram and LinkedIn all
 * show uncropped) whatever the screen it was made on.
 */
const W = 1080;
const H = 1350;
const NAVY = '#051D64';
const TEAL = '#359AAD';
const TEAL2 = '#7FD3E0';
const INK = '#102A4F';
const MUTED = '#5B6B80';
const FONT = 'Inter, "Segoe UI", system-ui, -apple-system, sans-serif';
const TONE: Record<string, string> = { amber: '#B86B00', navy: NAVY, red: '#C93737', teal: '#1B7D91', green: '#17885D' };

const loadImage = (src: string, cors = false): Promise<HTMLImageElement | null> => new Promise(resolve => {
  const img = new Image();
  if (cors) img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = () => resolve(null);
  img.src = src;
});

const rr = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const fit = (ctx: CanvasRenderingContext2D, text: string, max: number): string => {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
};

export async function renderCardImage(card: PassportCard, url: string): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  try { await (document as any).fonts?.ready; } catch { /* draw with whatever is loaded */ }

  // Page
  ctx.fillStyle = '#F4F8FC';
  ctx.fillRect(0, 0, W, H);

  // Hero
  const heroH = 640;
  const g = ctx.createLinearGradient(0, 0, W, heroH);
  g.addColorStop(0, NAVY); g.addColorStop(.52, '#0B2D72'); g.addColorStop(.82, '#1F6F8C'); g.addColorStop(1, TEAL);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, heroH);
  const glow = ctx.createRadialGradient(W * .92, 0, 0, W * .92, 0, 520);
  glow.addColorStop(0, 'rgba(127,211,224,.35)'); glow.addColorStop(1, 'rgba(127,211,224,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, heroH);

  // Logo pill + verified
  const logo = await loadImage('/assets/careerpilot/careerpilot-logo.png');
  ctx.fillStyle = '#fff'; rr(ctx, 60, 56, 300, 84, 20); ctx.fill();
  if (logo) {
    const lh = 60; const lw = Math.min(270, (logo.width / logo.height) * lh);
    ctx.drawImage(logo, 60 + (300 - lw) / 2, 56 + 12, lw, lh);
  }
  ctx.font = `800 24px ${FONT}`;
  const ver = 'VERIFIED PROGRESS';
  const vw = ctx.measureText(ver).width + 56;
  ctx.fillStyle = 'rgba(255,255,255,.14)'; rr(ctx, W - 60 - vw, 74, vw, 50, 25); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = TEAL2; ctx.beginPath(); ctx.arc(W - 60 - vw + 26, 99, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(ver, W - 60 - vw + 42, 100);

  // Avatar
  const ax = 120; const ay = 250; const ar = 64;
  ctx.save(); ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI * 2); ctx.closePath();
  ctx.fillStyle = '#fff'; ctx.fill(); ctx.clip();
  const src = photoUrl(card.photo);
  const photo = src ? await loadImage(src, true) : null;
  if (photo) {
    const s = Math.max((ar * 2) / photo.width, (ar * 2) / photo.height);
    ctx.drawImage(photo, ax - (photo.width * s) / 2, ay - (photo.height * s) / 2, photo.width * s, photo.height * s);
  } else {
    ctx.fillStyle = NAVY; ctx.font = `800 52px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText(initialsOf(card.name), ax, ay + 2);
    ctx.textAlign = 'left';
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI * 2); ctx.stroke();

  // Name + subtitle
  const tx = 214; const tmax = W - tx - 60;
  ctx.fillStyle = '#fff'; ctx.font = `800 50px ${FONT}`; ctx.textBaseline = 'alphabetic';
  ctx.fillText(fit(ctx, card.name, tmax), tx, 238);
  const sub = subtitleOf(card); const aim = aimOf(card);
  ctx.font = `500 28px ${FONT}`; ctx.fillStyle = '#D5E6F5';
  if (sub) ctx.fillText(fit(ctx, sub, tmax), tx, 284);
  if (aim) { ctx.font = `600 28px ${FONT}`; ctx.fillStyle = '#fff'; ctx.fillText(fit(ctx, aim, tmax), tx, sub ? 324 : 284); }

  // Score panel
  const py = 370; const ph = 230;
  ctx.fillStyle = 'rgba(255,255,255,.1)'; rr(ctx, 60, py, W - 120, ph, 32); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; ctx.stroke();
  const cx = 60 + 40 + 90; const cy = py + ph / 2; const R = 90;
  const score = Math.max(0, Math.round(card.coderScore || 0));
  ctx.lineWidth = 22; ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  const frac = Math.min(CODER_MAX, score) / CODER_MAX;
  if (frac > 0) {
    const arc = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    arc.addColorStop(0, TEAL2); arc.addColorStop(1, '#fff');
    ctx.strokeStyle = arc; ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
  }
  ctx.lineCap = 'butt';
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = `800 58px ${FONT}`; ctx.fillText(String(score), cx, cy + 14);
  ctx.font = `700 22px ${FONT}`; ctx.fillStyle = '#B9D3E8'; ctx.fillText(`/ ${CODER_MAX}`, cx, cy + 48);
  ctx.textAlign = 'left';

  const sx = cx + R + 50; const smax = W - 60 - 30 - sx;
  ctx.font = `800 22px ${FONT}`; ctx.fillStyle = TEAL2; ctx.fillText('CODER SCORE', sx, py + 54);
  ctx.font = `800 36px ${FONT}`; ctx.fillStyle = '#fff';
  const lvl = `Level ${card.level.level}`; ctx.fillText(lvl, sx, py + 100);
  const lw2 = ctx.measureText(lvl).width;
  ctx.font = `500 28px ${FONT}`; ctx.fillStyle = '#D5E6F5'; ctx.fillText(fit(ctx, card.level.title, smax - lw2 - 14), sx + lw2 + 14, py + 100);
  ctx.fillStyle = 'rgba(255,255,255,.2)'; rr(ctx, sx, py + 120, smax, 14, 7); ctx.fill();
  ctx.fillStyle = TEAL2; rr(ctx, sx, py + 120, Math.max(14, smax * card.level.progressPct / 100), 14, 7); ctx.fill();
  ctx.font = `500 22px ${FONT}`; ctx.fillStyle = '#C4D8EA';
  ctx.fillText(`${card.level.xpToNextLevel.toLocaleString('en-IN')} XP to Level ${card.level.level + 1}`, sx, py + 168);

  // Stats grid 4 × 2
  const tiles = statTiles(card);
  const gx = 60; const gy = heroH + 40; const gap = 20; const cols = 4;
  const tw = (W - 120 - gap * (cols - 1)) / cols; const th = 150;
  tiles.forEach((t, i) => {
    const x = gx + (i % cols) * (tw + gap); const y = gy + Math.floor(i / cols) * (th + gap);
    ctx.fillStyle = '#fff'; rr(ctx, x, y, tw, th, 24); ctx.fill();
    ctx.strokeStyle = '#E2EAF2'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = TONE[t.tone] || NAVY; rr(ctx, x + 22, y + 22, 34, 8, 4); ctx.fill();
    ctx.font = `800 42px ${FONT}`; ctx.fillStyle = INK; ctx.fillText(fit(ctx, t.value, tw - 44), x + 22, y + 84);
    ctx.font = `600 21px ${FONT}`; ctx.fillStyle = MUTED; ctx.fillText(fit(ctx, t.label, tw - 44), x + 22, y + 122);
  });

  // Top skills
  let y = gy + 2 * th + gap + 34;
  if (card.topSkills.length) {
    const boxH = 70 + card.topSkills.length * 56;
    ctx.fillStyle = '#fff'; rr(ctx, 60, y, W - 120, boxH, 24); ctx.fill();
    ctx.strokeStyle = '#E2EAF2'; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = `800 22px ${FONT}`; ctx.fillStyle = NAVY; ctx.fillText('TOP SKILLS · SKILL DNA', 88, y + 46);
    card.topSkills.forEach((s, i) => {
      const ry = y + 96 + i * 56;
      ctx.font = `600 26px ${FONT}`; ctx.fillStyle = '#33475B'; ctx.fillText(fit(ctx, s.name, 380), 88, ry);
      const bx = 500; const bw = W - 60 - 28 - 70 - bx;
      ctx.fillStyle = '#E6EEF6'; rr(ctx, bx, ry - 16, bw, 14, 7); ctx.fill();
      const sg = ctx.createLinearGradient(bx, 0, bx + bw, 0); sg.addColorStop(0, NAVY); sg.addColorStop(1, TEAL);
      ctx.fillStyle = sg; rr(ctx, bx, ry - 16, Math.max(14, bw * Math.min(100, s.score) / 100), 14, 7); ctx.fill();
      ctx.font = `800 26px ${FONT}`; ctx.fillStyle = INK; ctx.textAlign = 'right'; ctx.fillText(String(s.score), W - 88, ry); ctx.textAlign = 'left';
    });
    y += boxH;
  }

  // Footer
  ctx.font = `700 24px ${FONT}`; ctx.fillStyle = '#1B7D91'; ctx.textAlign = 'center';
  ctx.fillText(fit(ctx, url.replace(/^https?:\/\//, ''), W - 120), W / 2, Math.min(H - 40, Math.max(y + 60, H - 60)));
  ctx.textAlign = 'left';

  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not create the image'))), 'image/png'));
}
