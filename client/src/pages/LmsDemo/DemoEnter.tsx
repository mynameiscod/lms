import React, { useEffect, useState } from 'react';
import { lmsDemoApi, storeDemoLogin, demoErr } from '../../api/lmsDemoApi';
import './demoLanding.css';

/** /demo/enter?t=… — the one-tap link a counsellor sends. Swaps the link for a session and opens the demo. */
export default function DemoEnter() {
  const [err, setErr] = useState('');

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('t') || '';
    if (!t) { setErr('This demo link is incomplete. Ask your counsellor to send it again.'); return; }
    lmsDemoApi.enter(t)
      .then(p => { storeDemoLogin(p); window.location.replace('/my-learning'); })
      .catch(e => setErr(demoErr(e, 'This demo link is not valid any more.')));
  }, []);

  return (
    <div className="dl">
      <header className="dl-top"><a href="/" className="dl-brand"><img src="/assets/logo.png" alt="CodeBegun" /></a></header>
      <main className="dl-main">
        <div className="dl-form-wrap"><div className="dl-form-card">
          {err ? (
            <div className="dl-closed"><i className="bi bi-link-45deg" /><h2>We couldn't open your demo</h2><p>{err}</p><a className="dl-cta" href="/demo">Start a free demo</a></div>
          ) : (
            <div className="dl-closed"><div className="dl-spin" /><h2>Opening your demo…</h2></div>
          )}
        </div></div>
      </main>
    </div>
  );
}
