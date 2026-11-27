import React, { useState } from 'react';
import { TrialStatus } from '../../api/passportApi';
import { useUnlock } from './useUnlock';
import './trialBanner.css';

/**
 * The strip a member on a TRIAL sees above every page: days left, what the trial includes and how
 * much of each they have used, and the way to membership. A trial is a taste, so the member should
 * never have to discover a limit by hitting it.
 */
const usedLine = (i: TrialStatus['items'][number]): string => {
  if (!i.on) return 'Not included';
  if (i.limit === null) return i.unit ? 'No limit' : 'Included';
  if (i.key === 'journey') return `Days 1–${i.limit} · ${i.used ?? 0} done`;
  if (i.key === 'practice') return `${i.limit} problems · ${i.used ?? 0} solved`;
  return `${i.used ?? 0} of ${i.limit} ${i.unit || ''} used`;
};

const TrialBanner: React.FC<{ trial: TrialStatus }> = ({ trial }) => {
  const [open, setOpen] = useState(false);
  const { unlock, busy, label, msg } = useUnlock();
  const included = trial.items.filter(i => i.on);
  const excluded = trial.items.filter(i => !i.on);
  const left = trial.daysLeft;
  const ends = new Date(trial.endsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return <section className={`trb${left <= 1 ? ' last' : ''}`} aria-label="Your trial">
    <div className="trb-row">
      <span className="trb-ic"><i className="bi bi-hourglass-split" /></span>
      <div className="trb-tx">
        <b>Free trial · {left <= 0 ? 'ends today' : `${left} ${left === 1 ? 'day' : 'days'} left`}</b>
        <span>Ends {ends}. {included.length} {included.length === 1 ? 'part' : 'parts'} of CareerPilot included; everything you do stays yours.</span>
      </div>
      <div className="trb-act">
        <button type="button" className="trb-more" aria-expanded={open} onClick={() => setOpen(o => !o)}>
          {open ? 'Hide' : 'What’s included'} <i className={`bi bi-chevron-${open ? 'up' : 'down'}`} />
        </button>
        <button type="button" className="trb-go" onClick={() => unlock()} disabled={busy}>{label}</button>
      </div>
    </div>
    {msg && <p className="trb-msg">{msg}</p>}
    {open && <div className="trb-detail">
      <ul className="trb-items">
        {included.map(i => {
          const full = i.limit !== null && (i.used ?? 0) >= i.limit && i.key !== 'journey';
          return <li key={i.key} className={full ? 'full' : ''}>
            <i className={`bi ${i.icon}`} />
            <span>{i.label}</span>
            <b>{full ? 'All used' : usedLine(i)}</b>
          </li>;
        })}
      </ul>
      {excluded.length > 0 && <p className="trb-out"><i className="bi bi-lock-fill" /> <span><b>Not in this trial:</b> {excluded.map(i => i.label).join(', ')}.</span></p>}
    </div>}
  </section>;
};

export default TrialBanner;
