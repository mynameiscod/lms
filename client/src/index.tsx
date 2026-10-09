import React from 'react';
import { loadHostTenant } from './config/hostTenant';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import './App.css';
import './pages/MyLearningPlan/DayView.system.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { captureCareerPilotAttribution } from './utils/careerPilotAttribution';

/**
 * DEVELOPMENT ONLY: keep opaque cross-origin errors off the dev-server overlay.
 *
 * A script from another origin that throws reaches the page as the bare string
 * "Script error." — no message, no stack, no file — because the browser withholds the
 * details. The dev server's overlay then covered the whole app with "Uncaught runtime
 * errors: Script error." on page switches. The sources are the Monaco editor (loaded from
 * cdn.jsdelivr.net) and browser extensions, neither of which the error lets anyone fix.
 *
 * The overlay's listener is registered before any app code and runs first, so the event
 * cannot be stopped. Instead the overlay is hidden while EVERY error in it is that opaque
 * one; the moment it holds anything else — an error from our own code, a compile error —
 * it shows again. The production build has no overlay, so nothing changes there.
 */
if (process.env.NODE_ENV === 'development') {
  const OVERLAY_ID = 'webpack-dev-server-client-overlay';
  const watched = new WeakSet<Document>();
  const review = () => {
    const frame = document.getElementById(OVERLAY_ID) as HTMLIFrameElement | null;
    const doc = frame?.contentDocument;
    if (!frame || !doc?.body) return;
    if (!watched.has(doc)) {
      watched.add(doc);
      new MutationObserver(review).observe(doc.body, { childList: true, subtree: true, characterData: true });
    }
    const text = doc.body.innerText || '';
    const errors = (text.match(/\bERROR\b/g) || []).length;
    const opaque = (text.match(/Script error\./g) || []).length;
    const onlyOpaque = errors > 0 && errors === opaque;
    frame.style.display = onlyOpaque ? 'none' : '';
    if (onlyOpaque) console.warn('[dev] Hid the overlay for an opaque cross-origin "Script error." (CDN script or browser extension).');
  };
  const later = () => { review(); setTimeout(review, 60); setTimeout(review, 300); };
  new MutationObserver(later).observe(document.documentElement, { childList: true, subtree: true });
}

/**
 * Campaign attribution is captured BEFORE React renders anything.
 *
 * Every later moment is too late for at least one real path: the join flow redirects, a login
 * bounce replaces the URL, and the router normalises the address — and the query string the
 * marketing site attached is gone by the time any component could read it. This runs on the raw
 * entry URL, once, before a single route is evaluated.
 *
 * It is a no-op for an untagged visit and cannot throw: see the utility.
 */
captureCareerPilotAttribution();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// On an institute's own domain, learn which institute it is before the first route renders
// (instant on platform.codebegun.com — nothing is fetched there).
loadHostTenant().finally(() => root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
));

reportWebVitals();

// The old PWA service worker (telecaller offline mode) is retired — it served a
// cache-first app shell under a fixed cache name and could pin devices to a stale
// build. We no longer register it; instead we ensure the tombstone sw.js takes
// over (it clears caches + unregisters), and proactively clean up here so any
// still-running registration on a device is removed.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((regs) => regs.forEach((r) => r.update().catch(() => {})))
    .catch(() => {});
}
