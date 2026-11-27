import { useEffect, useRef } from 'react';
import { leadApi } from '../api';

/**
 * Tells the server, once a minute, that this staff member is really working in the app: some input in the last two
 * minutes and the tab in front. That is what "active time" in Team Activity is made of. It sends only that fact (and
 * the lead page that is open, to show time per lead). It never reads or sends screens, text or keystrokes.
 */
const TICK_MS = 60 * 1000;
const IDLE_AFTER_MS = 2 * 60 * 1000;

export function useStaffHeartbeat(enabled: boolean, pathname: string) {
  const lastInput = useRef(Date.now());
  const path = useRef(pathname);
  path.current = pathname;

  useEffect(() => {
    if (!enabled) return undefined;
    const mark = () => { lastInput.current = Date.now(); };
    const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'];
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));

    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastInput.current > IDLE_AFTER_MS) return;
      const m = path.current.match(/^\/leads\/([a-f0-9]{24})/);
      leadApi.heartbeat(m ? m[1] : undefined).catch(() => undefined);
    };
    const timer = window.setInterval(tick, TICK_MS);
    return () => {
      window.clearInterval(timer);
      events.forEach((e) => window.removeEventListener(e, mark));
    };
  }, [enabled]);
}
