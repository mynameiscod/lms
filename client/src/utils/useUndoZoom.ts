import { RefObject, useLayoutEffect } from 'react';

/**
 * Draw one element at true size inside the zoomed app.
 *
 * #root is zoomed to 0.75 on desktop (index.css), and some pages zoom back up a little on top of
 * that. Chrome draws a native <video>'s controls wrongly under CSS zoom: the played part of the
 * timeline is scaled by the zoom while the thumb is not, so at the end of a video the bar stops
 * three-quarters of the way along. Giving the element the inverse of its ancestors' zoom puts it
 * back at 1, where the browser's own controls line up — and the player fills its column.
 *
 * Re-measured on resize, because the app zoom is switched off below 1024px.
 */
export function useUndoZoom(ref: RefObject<HTMLElement>, enabled = true): void {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return undefined;
    const apply = () => {
      let z = 1;
      for (let p = el.parentElement; p; p = p.parentElement) {
        const own = parseFloat(getComputedStyle(p).getPropertyValue('zoom') || '1');
        if (own > 0) z *= own;
      }
      // zoom is not in the DOM typings; setProperty reaches it all the same.
      if (Math.abs(z - 1) < 0.001) el.style.removeProperty('zoom');
      else el.style.setProperty('zoom', String(1 / z));
    };
    apply();
    window.addEventListener('resize', apply);
    return () => { window.removeEventListener('resize', apply); el.style.removeProperty('zoom'); };
  });
}
