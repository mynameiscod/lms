import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import './ActionMenu.css';

/**
 * A "More" / three-dot menu that always looks right (2026-11-28).
 *
 * WHY. The lead menus were absolutely positioned inside their row or button group. Inside the leads
 * table (a horizontally scrolling box) the menu was cut off at the edges, and on a phone a menu
 * pinned to the right of a wrapped button ran off the left of the screen.
 *
 * HOW. The menu is drawn in a portal on <body>:
 *   - phones (≤ 640px): a bottom sheet with a title, large rows and Cancel — what Android and iPhone
 *     users expect, and nothing can be cut off;
 *   - tablets and desktops: a floating menu beside its button, flipped above it when there is no room
 *     below, and kept inside the screen on both sides. It follows the button on scroll.
 * Escape, a tap outside and picking an item close it; arrow keys move between items.
 */
export interface ActionMenuItem {
  label: React.ReactNode;
  onSelect?: () => void;
  href?: string;
  icon?: string;
  /** A colour dot before the label (pipeline stages). */
  dot?: string;
  danger?: boolean;
  current?: boolean;
  hidden?: boolean;
}

const SHEET_QUERY = '(max-width: 640px)';
const rootZoom = () => {
  const z = parseFloat((getComputedStyle(document.getElementById('root') || document.body) as any).zoom || '1');
  return Number.isFinite(z) && z > 0 ? z : 1;
};

const ActionMenu: React.FC<{
  /** What the button shows. */
  trigger: React.ReactNode;
  buttonClassName?: string;
  ariaLabel?: string;
  /** Heading on the phone sheet. */
  title?: string;
  items: ActionMenuItem[];
  /** Which edge of the button the floating menu lines up with. */
  align?: 'left' | 'right';
}> = ({ trigger, buttonClassName = '', ariaLabel, title, items, align = 'right' }) => {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; zoom: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const shown = items.filter(i => !i.hidden);

  const place = useCallback(() => {
    const b = btn.current; const p = pop.current;
    if (!b || !p) return;
    const z = rootZoom();
    const r = b.getBoundingClientRect();
    const pr = p.getBoundingClientRect();
    const w = pr.width; const h = pr.height;
    const vw = window.innerWidth; const vh = window.innerHeight;
    let top = r.bottom + 6;
    if (top + h > vh - 8 && r.top - 6 - h > 8) top = r.top - 6 - h;
    top = Math.max(8, Math.min(top, vh - h - 8));
    let left = align === 'right' ? r.right - w : r.left;
    left = Math.max(8, Math.min(left, vw - w - 8));
    setPos({ top: top / z, left: left / z, zoom: z });
  }, [align]);

  const close = useCallback((focusButton = true) => {
    setOpen(false); setPos(null);
    if (focusButton) btn.current?.focus();
  }, []);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (open) return close(false);
    setSheet(window.matchMedia(SHEET_QUERY).matches);
    setOpen(true);
  };

  useLayoutEffect(() => { if (open && !sheet) place(); }, [open, sheet, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: Event) => {
      const t = e.target as Node;
      if (pop.current?.contains(t) || btn.current?.contains(t)) return;
      close(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const list = Array.from(pop.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') || []);
      if (!list.length) return;
      e.preventDefault();
      const i = list.indexOf(document.activeElement as HTMLElement);
      list[(i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length].focus();
    };
    const onMove = () => { if (!sheet) place(); };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    // First item ready for the keyboard.
    window.setTimeout(() => pop.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true }), 0);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open, sheet, place, close]);

  const pick = (it: ActionMenuItem) => { close(false); it.onSelect?.(); };

  const rows = !shown.length ? [<div key="empty" className="am-empty">Nothing to choose here yet.</div>] : shown.map((it, i) => {
    const inner = (
      <>
        {it.dot && <span className="am-dot" style={{ background: it.dot }} aria-hidden="true" />}
        {it.icon && <i className={`bi ${it.icon}`} aria-hidden="true" />}
        <span className="am-label">{it.label}</span>
        {it.current && <i className="bi bi-check2 am-check" aria-label="current" />}
      </>
    );
    const cls = `am-item${it.danger ? ' danger' : ''}${it.current ? ' current' : ''}`;
    return it.href
      ? <a key={i} role="menuitem" className={cls} href={it.href} target="_blank" rel="noreferrer" onClick={() => close(false)}>{inner}</a>
      : <button key={i} type="button" role="menuitem" className={cls} onClick={() => pick(it)}>{inner}</button>;
  });

  return (
    <>
      <button ref={btn} type="button" className={buttonClassName} aria-haspopup="menu" aria-expanded={open} aria-label={ariaLabel} onClick={toggle}>
        {trigger}
      </button>
      {open && ReactDOM.createPortal(
        sheet ? (
          <div className="am-backdrop" onClick={() => close(false)}>
            <div ref={pop} className="am-sheet" role="menu" aria-label={title || ariaLabel} onClick={e => e.stopPropagation()}>
              <div className="am-grip" aria-hidden="true" />
              {title && <div className="am-title">{title}</div>}
              <div className="am-list">{rows}</div>
              <button type="button" className="am-cancel" onClick={() => close()}>Cancel</button>
            </div>
          </div>
        ) : (
          <div
            ref={pop}
            className="am-pop"
            role="menu"
            aria-label={title || ariaLabel}
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, zoom: pos?.zoom ?? rootZoom(), visibility: pos ? 'visible' : 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            {rows}
          </div>
        ),
        document.body,
      )}
    </>
  );
};

export default ActionMenu;
