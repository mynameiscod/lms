import React from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import './App.css';
import './pages/MyLearningPlan/DayView.system.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { captureCareerPilotAttribution } from './utils/careerPilotAttribution';

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

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

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
