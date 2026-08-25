import React from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import './App.css';
import './pages/MyLearningPlan/DayView.system.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

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
