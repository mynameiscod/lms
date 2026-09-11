import React, { useState } from 'react';
import passportApi, { LockedSection, MemberSection } from '../../api/passportApi';
import { useMember } from './MemberLayout';
import './sectionLock.css';

/**
 * One lock, used everywhere something is behind membership.
 *
 * WHY ONE. Every locked surface had grown its own: Practice, Interview, Resume and News each
 * rendered `LockedPanel` with different copy, Roadmap hand-rolled three `.rq-lock` blocks,
 * MissionControl wrote its own markup, and News's unlock button was wired to nothing at all —
 * a dead click on the one screen whose entire job was to sell. Six implementations of one idea
 * is six places for the payment flow to rot, and it had already rotted in one of them.
 *
 * A LOCK IS AN ARGUMENT, NOT A WALL. "Members only" on an empty page tells a student nothing
 * they did not already know and gives them no reason to act. So a lock says what is behind it,
 * and — where the caller can supply them — shows the real figures from this student's own data:
 * how many gaps their plan would close, how many problems are mapped to their weak skills. That
 * is the summary, not the content, and it is the difference between a preview and a tease.
 *
 * IT IS DECORATION. The server refuses the data; this only explains the refusal. Nothing here
 * is load-bearing, which is why it is safe for it to be this cheerful.
 */

interface Props {
  /** Which part of the product this is. Used to look the lock up in the dashboard payload. */
  section: MemberSection;
  /** Overrides the server's copy — for a screen that wants to say something more specific. */
  title?: string;
  blurb?: string;
  /**
   * This student's own numbers, and what each would mean once unlocked.
   * Shown above the button, because a figure they recognise is the whole argument.
   */
  facts?: { value: React.ReactNode; label: string }[];
  /** Rendered under the facts — a real, non-interactive glimpse of the thing itself. */
  children?: React.ReactNode;
  /** Full-height treatment for a whole screen; the compact one sits inside a dashboard panel. */
  variant?: 'page' | 'panel';
}

const SectionLock: React.FC<Props> = ({ section, title, blurb, facts, children, variant = 'page' }) => {
  const { data, reload } = useMember();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const lock: LockedSection | undefined = (data?.locked || []).find(l => l.section === section);
  const priceInr = data?.priceInr;

  const unlock = async () => {
    setBusy(true); setMsg('');
    try {
      const r = await passportApi.membershipCheckout();
      // Every locked surface reloads the same way, so unlocking on one opens all of them
      // without a refresh — the old screens each decided this differently and two forgot.
      if (r?.ok) reload();
      else if (r?.message) setMsg(r.message);
    } catch {
      setMsg('The payment window could not open. Check your connection and try again.');
    } finally { setBusy(false); }
  };

  return (
    <div className={`slk slk-${variant}`}>
      <div className="slk-card">
        <span className="slk-badge"><i className="bi bi-lock-fill" /> Membership</span>

        <h2>{title || lock?.title || 'Part of membership'}</h2>
        <p className="slk-blurb">{blurb || lock?.blurb || ''}</p>

        {!!facts?.length && (
          /* Their own numbers. "12 priority gaps" is an argument; "unlock premium" is a slogan. */
          <div className="slk-facts">
            {facts.map((f, i) => (
              <div key={i}><b>{f.value}</b><span>{f.label}</span></div>
            ))}
          </div>
        )}

        {children && <div className="slk-preview">{children}</div>}

        <button className="slk-btn" onClick={unlock} disabled={busy}>
          {busy ? 'Opening payment…'
            : priceInr ? `Unlock CareerPilot — ₹${priceInr}` : 'Unlock CareerPilot'}
        </button>
        {!!msg && <p className="slk-msg">{msg}</p>}
        <p className="slk-foot">
          Everything your assessment measured stays yours either way.
        </p>
      </div>
    </div>
  );
};

export default SectionLock;
