import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { MyDemo } from '../../api/passportApi';
import './demoBar.css';

/**
 * The bar a DEMO ACCOUNT shows across the top of CareerPilot (and nobody else does).
 *
 * The presenter switches between the years of the demo plan — the roadmap, track, Practice,
 * Thinking Lab, interviews and books all follow — and resets the account between college visits:
 *   - Reset progress: everything done is cleared; the skill check, Skill DNA and demo access stay.
 *   - Full reset: back to just-signed-up, so the skill check can be shown again. Demo access ends,
 *     and a super admin gives it again after the skill check.
 */
const DemoBar: React.FC = () => {
  const nav = useNavigate();
  const [demo, setDemo] = useState<MyDemo | null>(null);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [confirm, setConfirm] = useState<'' | 'progress' | 'full'>('');

  useEffect(() => { passportApi.myDemo().then(setDemo).catch(() => setDemo(null)); }, []);
  if (!demo) return null;

  const switchYear = async (year: string) => {
    if (year === demo.year) return;
    setBusy('year'); setErr('');
    try {
      await passportApi.switchMyDemoYear(year);
      const next = await passportApi.myDemo();
      // A full page load, so every screen reads the new year from the start.
      window.location.assign(`/careerpilot/journey?day=${next?.landingDay || 1}`);
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not switch the year.'); setBusy(''); }
  };

  const reset = async (kind: 'progress' | 'full') => {
    setBusy(kind); setErr(''); setConfirm('');
    try {
      await passportApi.resetMyDemo(kind);
      window.location.assign(kind === 'full' ? '/careerpilot' : `/careerpilot/journey?day=${demo.landingDay || 1}`);
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not reset the demo.'); setBusy(''); }
  };

  return (
    <div className="demo-bar" role="region" aria-label="Demo controls">
      <span className="demo-tag"><i className="bi bi-person-video3" aria-hidden /> DEMO</span>
      <span className="demo-plan" title={demo.planName}>{demo.planName}</span>
      <label className="demo-year">
        <span>Showing</span>
        <select value={demo.year} disabled={!!busy} onChange={(e) => switchYear(e.target.value)} aria-label="Year shown">
          {demo.years.map((y) => <option key={y.key} value={y.key}>{y.label}</option>)}
        </select>
      </label>
      {busy === 'year' && <span className="demo-wait"><i className="bi bi-arrow-repeat" aria-hidden /> Building the roadmap…</span>}
      <span className="demo-grow" />
      <button type="button" className="demo-btn" disabled={!!busy} onClick={() => nav(`/careerpilot/journey?day=${demo.landingDay || 1}`)}>
        <i className="bi bi-signpost-2" aria-hidden /> Demo day
      </button>
      <button type="button" className="demo-btn" disabled={!!busy} onClick={() => setConfirm('progress')}>
        <i className="bi bi-arrow-counterclockwise" aria-hidden /> Reset progress
      </button>
      <button type="button" className="demo-btn warn" disabled={!!busy} onClick={() => setConfirm('full')}>
        <i className="bi bi-arrow-repeat" aria-hidden /> Full reset
      </button>
      {err && <p className="demo-err" role="alert">{err}</p>}
      {confirm && (
        <div className="demo-confirm" role="alertdialog" aria-label="Confirm reset">
          <p>{confirm === 'progress'
            ? 'Reset progress? Days done, practice, Thinking Lab, interviews, XP and coins are cleared. The skill check, Skill DNA and demo access stay.'
            : 'Full reset? The account goes back to just-signed-up: skill check, Skill DNA, roadmaps, progress and demo access all go. Take the skill check again, then ask a super admin to give demo access.'}</p>
          <div>
            <button type="button" className="demo-btn" onClick={() => setConfirm('')}>Back</button>
            <button type="button" className="demo-btn warn solid" disabled={!!busy} onClick={() => reset(confirm)}>
              {busy ? 'Working…' : confirm === 'progress' ? 'Reset progress' : 'Full reset'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemoBar;
