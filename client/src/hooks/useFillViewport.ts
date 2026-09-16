import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Size an element to the space actually left below it on screen.
 *
 * ── WHY NOT calc(100vh - N) ───────────────────────────────────────────────────────────────
 *
 * A viewport calculation has to know the height of everything above the element, so N is a
 * different number in every place the page can mount and goes stale whenever any of that chrome
 * changes. Worse, inside the CareerPilot member shell the viewport is the wrong reference at
 * all: the sidebar carries the daily-goal panel, so the shell is TALLER than the viewport and
 * the page scrolls — an element sized to the viewport while sitting in something bigger is
 * clipped at the bottom and leaves dead space under itself at the same time.
 *
 * The element's own distance from the top of the viewport answers the question directly, and
 * answers it correctly wherever it is mounted.
 *
 * ── WHAT IT WATCHES ───────────────────────────────────────────────────────────────────────
 *
 * Resize, plus a ResizeObserver on the element's parent — chrome above it can change height
 * without the window changing size at all (a banner appearing, a header wrapping onto two lines
 * at a narrow width), and a page that only listened to resize would stay wrong until the next
 * one.
 *
 * @param gap    space to leave below the element, in px.
 * @param floor  smallest height worth rendering, so a short laptop screen does not collapse it.
 */
export function useFillViewport<T extends HTMLElement = HTMLDivElement>(gap = 26, floor = 430) {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState<number>();

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // getBoundingClientRect().top is relative to the viewport, which is exactly the question:
    // how much room is left below this element on screen right now.
    const top = el.getBoundingClientRect().top;
    setHeight(Math.max(floor, Math.round(window.innerHeight - top - gap)));
  }, [gap, floor]);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);

    let ro: ResizeObserver | undefined;
    const parent = ref.current?.parentElement;
    if (parent && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(parent);
    }

    return () => {
      window.removeEventListener('resize', measure);
      ro?.disconnect();
    };
  }, [measure]);

  return { ref, height, measure };
}
