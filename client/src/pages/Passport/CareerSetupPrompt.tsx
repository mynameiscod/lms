import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import passportApi from '../../api/passportApi';
import './careerSetupPrompt.css';

/**
 * Invites a member to complete their CareerPilot context.
 *
 * A dismissible strip, not a blocking gate, for the same reason CareerProfilePrompt is
 * one: these are people who already joined, and several have paid. Holding their
 * dashboard hostage over questions the product only just started asking would be a poor
 * trade for answers they can give later. Until they do, every existing surface behaves
 * exactly as before — the context is additive, and nothing reads it as required yet.
 *
 * Dismissal is remembered per member for the session only. A permanent hide would need a
 * server field, and a member who dismisses this on Monday may well finish it on Tuesday.
 */

const KEY = 'cp_setup_dismissed';

const CareerSetupPrompt: React.FC = () => {
  const nav = useNavigate();
  const loc = useLocation();
  const [show, setShow] = useState(false);
  const [missing, setMissing] = useState(0);

  useEffect(() => {
    // Never over the setup screen itself, and never once dismissed this session.
    if (loc.pathname.startsWith('/careerpilot/setup')) { setShow(false); return; }
    if (sessionStorage.getItem(KEY) === '1') return;

    let alive = true;
    passportApi.getCareerContext()
      .then(r => {
        if (!alive) return;
        setMissing(r.context.status.missing.length);
        setShow(!r.context.status.onboardingCompleted);
      })
      // A member whose context cannot be loaded is shown nothing rather than an error —
      // this is an invitation, and a failed one is not worth interrupting anybody for.
      .catch(() => { /* silent by design */ });
    return () => { alive = false; };
  }, [loc.pathname]);

  if (!show) return null;

  const dismiss = () => { sessionStorage.setItem(KEY, '1'); setShow(false); };

  return (
    <div className="cpsp">
      <i className="bi bi-compass cpsp-ic" />
      <div className="cpsp-tx">
        <b>Tell CareerPilot about yourself</b>
        <span>
          {missing > 0
            ? `${missing} quick question${missing === 1 ? '' : 's'} — your course, where you are heading, and how much time you have.`
            : 'Four quick questions so your plan fits your course and the time you actually have.'}
        </span>
      </div>
      <button className="cpsp-go" onClick={() => nav('/careerpilot/setup')}>Set up</button>
      <button className="cpsp-x" onClick={dismiss} aria-label="Dismiss"><i className="bi bi-x-lg" /></button>
    </div>
  );
};

export default CareerSetupPrompt;
