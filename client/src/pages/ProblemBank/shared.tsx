import React, { useEffect, useRef, useState } from 'react';

/* ── Markdown ────────────────────────────────────────────────────────────────────────────────
 * Problem statements are markdown. A small renderer, not a library: escape EVERYTHING first,
 * then add back the handful of constructs statements use. Nothing an author types can inject
 * markup, because no raw input is ever passed through unescaped. */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(s: string): string {
  const codes: string[] = [];
  let out = s.replace(/`([^`]+)`/g, (_m, c) => { codes.push(c); return `@@PBCODE${codes.length - 1}@@`; });
  out = esc(out)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\^(\d+|\{[^}]+\})/g, (_m, p) => `<sup>${String(p).replace(/[{}]/g, '')}</sup>`)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  return out.replace(/@@PBCODE(\d+)@@/g, (_m, i) => `<code>${esc(codes[Number(i)])}</code>`);
}

export function renderMarkdown(src: string): string {
  const lines = String(src || '').replace(/\r\n?/g, '\n').split('\n');
  const html: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      html.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) { html.push(`<h${h[1].length + 1}>${inline(h[2])}</h${h[1].length + 1}>`); i++; continue; }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(`<li>${inline(lines[i++].replace(/^\s*[-*]\s+/, ''))}</li>`);
      html.push(`<ul>${items.join('')}</ul>`);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) items.push(`<li>${inline(lines[i++].replace(/^\s*\d+\.\s+/, ''))}</li>`);
      html.push(`<ol>${items.join('')}</ol>`);
      continue;
    }
    if (/^>\s?/.test(line)) { html.push(`<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>`); i++; continue; }
    if (!line.trim()) { i++; continue; }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(```|#{1,4}\s|\s*[-*]\s|\s*\d+\.\s|>)/.test(lines[i])) para.push(lines[i++]);
    html.push(`<p>${para.map(inline).join('<br/>')}</p>`);
  }
  return html.join('');
}

export const Markdown: React.FC<{ text: string; empty?: string }> = ({ text, empty }) =>
  text && text.trim()
    ? <div className="pb-md" dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />
    : <div className="pb-faint">{empty || 'Nothing written yet.'}</div>;

/* ── Small pieces ─────────────────────────────────────────────────────────────────────────── */

export const DifficultyPill: React.FC<{ d: string }> = ({ d }) => (
  <span className={`pb-pill pb-diff-${d}`}>{d ? d[0].toUpperCase() + d.slice(1) : '—'}</span>
);

const VERIFY: Record<string, { cls: string; label: string; icon: string }> = {
  verified: { cls: 'pb-badge-ok', label: 'Verified', icon: 'fa-circle-check' },
  failed: { cls: 'pb-badge-bad', label: 'Failing', icon: 'fa-circle-xmark' },
  stale: { cls: 'pb-badge-warn', label: 'Re-verify', icon: 'fa-rotate' },
  queued: { cls: 'pb-badge-accent', label: 'Queued', icon: 'fa-clock' },
  running: { cls: 'pb-badge-accent', label: 'Verifying', icon: 'fa-spinner fa-spin' },
  unverified: { cls: 'pb-badge-neutral', label: 'Not verified', icon: 'fa-circle-minus' },
};
export const VerifyBadge: React.FC<{ s?: string }> = ({ s }) => {
  const v = VERIFY[s || 'unverified'] || VERIFY.unverified;
  return <span className={`pb-pill ${v.cls}`}><i className={`fa-solid ${v.icon}`} /> {v.label}</span>;
};

const STATUS: Record<string, string> = { published: 'pb-badge-ok', draft: 'pb-badge-neutral', archived: 'pb-badge-warn' };
export const StatusPill: React.FC<{ s: string }> = ({ s }) => (
  <span className={`pb-pill ${STATUS[s] || 'pb-badge-neutral'}`}><span className="pb-dot" /> {s[0].toUpperCase() + s.slice(1)}</span>
);

export const ScopePill: React.FC<{ scope: string }> = ({ scope }) => scope === 'global'
  ? <span className="pb-pill pb-badge-accent" title="CodeBegun library — available to every institute"><i className="fa-solid fa-globe" /> CodeBegun</span>
  : <span className="pb-pill pb-badge-neutral" title="Private to your institute"><i className="fa-solid fa-building" /> Institute</span>;

export const VERDICT_LABEL: Record<string, string> = {
  AC: 'Accepted', WA: 'Wrong Answer', TLE: 'Time Limit Exceeded', RE: 'Runtime Error', CE: 'Compilation Error',
  BUSY: 'Runner busy — try again', SKIPPED: 'Not run', OK: 'Finished',
};

export const LANG_SHORT: Record<string, string> = {
  python: 'Py', java: 'Java', cpp: 'C++', c: 'C', javascript: 'JS', typescript: 'TS', csharp: 'C#', go: 'Go', rust: 'Rust', sql: 'SQL',
};

export const Modal: React.FC<{ title: React.ReactNode; onClose: () => void; wide?: boolean; footer?: React.ReactNode; children: React.ReactNode }> =
  ({ title, onClose, wide, footer, children }) => {
    useEffect(() => {
      const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
      window.addEventListener('keydown', k);
      return () => window.removeEventListener('keydown', k);
    }, [onClose]);
    return (
      <div className="pb-modal-back pb-root" onMouseDown={onClose}>
        <div className={`pb-modal ${wide ? 'wide' : ''}`} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <div className="pb-modal-head"><h2 className="pb-grow">{title}</h2>
            <button className="pb-btn pb-btn-ghost pb-btn-icon" onClick={onClose} aria-label="Close"><i className="fa-solid fa-xmark" /></button>
          </div>
          <div className="pb-modal-body">{children}</div>
          {footer && <div className="pb-modal-foot">{footer}</div>}
        </div>
      </div>
    );
  };

/** A dropdown that closes on outside click. */
export const Menu: React.FC<{ trigger: React.ReactNode; children: (close: () => void) => React.ReactNode; className?: string }> = ({ trigger, children, className }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div className="pb-menu-wrap" ref={ref}>
      <span onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} className={className}>{trigger}</span>
      {open && <div className="pb-menu" onClick={(e) => e.stopPropagation()}>{children(() => setOpen(false))}</div>}
    </div>
  );
};

/** Transient message at the bottom of the screen. */
export function useToast() {
  const [t, setT] = useState<{ text: string; bad?: boolean } | null>(null);
  const timer = useRef<any>();
  const show = (text: string, bad = false) => {
    setT({ text, bad });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setT(null), bad ? 7000 : 3500);
  };
  const node = t ? <div className={`pb-toast ${t.bad ? 'bad' : ''}`} role="status">{t.text}</div> : null;
  return { show, node };
}

export const relTime = (iso?: string) => {
  if (!iso) return '';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
};
