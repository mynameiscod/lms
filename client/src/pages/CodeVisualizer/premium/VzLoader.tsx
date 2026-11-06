import React, { useEffect, useState } from 'react';

/**
 * The branded 3D loader for the LMS Code Visualizer.
 *
 * Shown only while something is genuinely loading (the library's first fetch, or a problem's
 * details). It never holds the page back: the parent unmounts it the moment data arrives.
 * Pure CSS 3D: no WebGL, nothing to clean up but one interval. Reduced-motion readers get a
 * still logo and the message.
 */

const MESSAGES = [
  'Initializing CodeBegun…',
  'Preparing your learning workspace…',
  'Loading DSA visualizer…',
  'Setting up your coding environment…',
];

const PARTICLES = Array.from({ length: 14 }, (_, i) => i);

const VzLoader: React.FC<{ label?: string }> = ({ label = 'Loading the Code Visualizer' }) => {
  const [i, setI] = useState(0);
  const [logoOk, setLogoOk] = useState(true);
  useEffect(() => {
    const t = window.setInterval(() => setI(n => (n + 1) % MESSAGES.length), 1600);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="vzp-loader" role="status" aria-live="polite" aria-label={label}>
      <div className="vzp-loader-field" aria-hidden="true">
        {PARTICLES.map(p => <span key={p} className="vzp-particle" style={{ ['--p' as any]: p }} />)}
      </div>
      <div className="vzp-loader-scene" aria-hidden="true">
        <div className="vzp-orbit" />
        <div className="vzp-logo3d">
          <div className="vzp-logo-depth" />
          <div className="vzp-logo-face">
            {logoOk
              ? <img src={`${process.env.PUBLIC_URL}/assets/logo.png`} alt="" onError={() => setLogoOk(false)} />
              : <span className="vzp-logo-text">CodeBegun</span>}
          </div>
        </div>
        <div className="vzp-logo-reflect" />
      </div>
      <div className="vzp-loader-bar" aria-hidden="true"><span /></div>
      <p className="vzp-loader-msg" key={i}>{MESSAGES[i]}</p>
    </div>
  );
};

export default VzLoader;
