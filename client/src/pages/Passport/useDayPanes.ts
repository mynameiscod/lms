import { RefObject, useLayoutEffect } from 'react';

/**
 * The day player's two panes - today's tasks and the lesson - each scroll on their own (see the
 * "Two panes" block in journeyDayMember.css). Both are sticky; this keeps their height equal to
 * the space actually visible below their top edge, so nothing is ever cut off under the fold:
 * with the banner on screen they are shorter, and they grow as the page scrolls it away.
 *
 * Sets --jd-pane-h on the grid, in the grid's own CSS pixels (the app zooms #root, so screen
 * pixels are divided by the measured zoom). Below 900px the panes stack and scroll with the page.
 */
export function useDayPanes(ref: RefObject<HTMLElement>, deps: any[]) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let raf = 0;
    const fit = () => {
      raf = 0;
      if (!window.matchMedia('(min-width: 900px)').matches) { el.style.removeProperty('--jd-pane-h'); el.style.minHeight = ''; return; }
      const r = el.getBoundingClientRect();
      const zoom = el.offsetWidth ? r.width / el.offsetWidth : 1;
      const scroller = el.closest<HTMLElement>('.sdp-scroll');
      const sr = scroller?.getBoundingClientRect();
      const top0 = sr ? sr.top : 0;
      const bottom = sr ? sr.bottom : window.innerHeight;
      // Whatever sits under the grid (page padding, a footer) stays below the panes: a sticky
      // pane cannot outlast its grid, so a pane taller than the grid's last visible line would
      // be pushed up under the navbar at the end of the page.
      const se = scroller || document.scrollingElement || document.documentElement;
      const sz = sr && scroller!.clientHeight ? sr.height / scroller!.clientHeight : 1;
      const below = Math.max(12, top0 + (se.scrollHeight - se.scrollTop) * sz - r.bottom);
      const stick = (parseFloat(getComputedStyle(el).getPropertyValue('--jd-top')) || 0) * zoom;
      const top = Math.max(r.top, top0 + stick);
      el.style.setProperty('--jd-pane-h', `${Math.max(380, Math.floor((bottom - top - below) / zoom))}px`);
      // Room for the panes at full height, so one scroll of the page takes the banner away.
      el.style.minHeight = `${Math.max(380, Math.floor((bottom - top0 - stick - below) / zoom))}px`;
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(fit); };
    fit();
    window.addEventListener('resize', schedule);
    document.addEventListener('scroll', schedule, true);
    return () => {
      window.removeEventListener('resize', schedule);
      document.removeEventListener('scroll', schedule, true);
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Scroll only the task list (never the page) so the chosen task is in view. */
export function keepTaskInView(grid: HTMLElement | null) {
  const list = grid?.querySelector<HTMLElement>('.jd-rail');
  const sel = list?.querySelector<HTMLElement>('.jd-item.sel');
  if (!list || !sel || list.scrollHeight <= list.clientHeight) return;
  const top = sel.offsetTop - list.offsetTop;
  if (top < list.scrollTop) list.scrollTop = top - 6;
  else if (top + sel.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = top + sel.offsetHeight - list.clientHeight + 6;
}
