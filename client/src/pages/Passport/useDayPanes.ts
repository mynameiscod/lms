import { RefObject, useLayoutEffect } from 'react';

/**
 * The day player's task list scrolls on its own beside the lesson (see the "Two panes" block in
 * journeyDayMember.css). The list is sticky; this keeps its height equal to the space actually
 * visible below its top edge, so it is never cut off under the fold: with the banner on screen it
 * is shorter, and it grows as the page scrolls the banner away. --jd-full-h is the whole height
 * below the top bar, which sizes the video player and the notebook to fit one screen.
 *
 * Sets --jd-pane-h on the grid, in the grid's own CSS pixels (the app zooms #root, so screen
 * pixels are divided by the measured zoom). Below 1100px the panes stack and scroll with the page.
 */
export function useDayPanes(ref: RefObject<HTMLElement>, deps: any[]) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let raf = 0;
    const fit = () => {
      raf = 0;
      if (!window.matchMedia('(min-width: 1100px)').matches) { el.style.removeProperty('--jd-pane-h'); el.style.removeProperty('--jd-full-h'); el.style.minHeight = ''; lastPane = lastMin = -99; return; }
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
      const pane = Math.max(380, Math.floor((bottom - top - below) / zoom));
      // Room for the panes at full height, so one scroll of the page takes the banner away.
      const min = Math.max(380, Math.floor((bottom - top0 - stick - below) / zoom));
      // Sub-pixel rounding moves the page by a pixel, which re-measures a pixel off: ignore
      // changes that small, or the panes twitch forever.
      if (Math.abs(pane - lastPane) > 2) { lastPane = pane; el.style.setProperty('--jd-pane-h', `${pane}px`); }
      if (Math.abs(min - lastMin) > 2) { lastMin = min; el.style.minHeight = `${min}px`; el.style.setProperty('--jd-full-h', `${min}px`); }
    };
    let lastPane = -99, lastMin = -99;
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

/** Stacked layout: after a task is picked from the list, bring the lesson card into view. */
export function showLessonIfStacked(grid: HTMLElement | null) {
  if (window.matchMedia('(min-width: 1100px)').matches) return;
  requestAnimationFrame(() => grid?.querySelector<HTMLElement>('.jd-stage')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

/**
 * Side by side, the lesson scrolls with the page. A task picked while the reader is far down a
 * long lesson would open somewhere in its middle, so bring the lesson's top back into view.
 */
export function showLessonTop(grid: HTMLElement | null) {
  if (!window.matchMedia('(min-width: 1100px)').matches) return;
  const stage = grid?.querySelector<HTMLElement>('.jd-stage');
  if (stage && stage.getBoundingClientRect().top < 90) stage.scrollIntoView({ block: "start" });
}
