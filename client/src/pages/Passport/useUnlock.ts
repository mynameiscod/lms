import { useState } from 'react';
import passportApi from '../../api/passportApi';
import { useMember } from './MemberLayout';

/**
 * The one membership checkout, in a module that carries no stylesheet.
 *
 * It lived in SectionLock.tsx, which imports `sectionLock.css`. That was harmless while only
 * locked PAGES used it — they render the lock, so they need its styles. The member rail needs
 * the checkout and none of the markup, and importing the hook from there pulled sectionLock.css
 * into the shell's chunk at a position webpack could not reconcile with memberLayoutFix.css and
 * memberCodebegun.css. The result was a build that failed under `CI=true` on a CSS ordering
 * conflict — a stylesheet nobody asked for, breaking a build over a hook.
 *
 * So the hook lives here and SectionLock re-exports it. Every caller keeps working, there is
 * still exactly one checkout, and a screen that wants the behaviour no longer has to take the
 * styling with it.
 */
export const useUnlock = () => {
  const { data, reload } = useMember();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const priceInr = data?.priceInr;

  /** `after` runs once payment succeeds, for a screen with its own data to refresh (the journey preview). */
  const unlock = async (after?: () => void) => {
    setBusy(true); setMsg('');
    try {
      const r = await passportApi.membershipCheckout();
      // Every locked surface reloads the same way, so unlocking on one opens all of them
      // without a refresh — the old screens each decided this differently and two forgot.
      if (r?.ok) { reload(); after?.(); }
      else if (r?.message) setMsg(r.message);
    } catch {
      setMsg('The payment window could not open. Check your connection and try again.');
    } finally { setBusy(false); }
  };

  const label = busy ? 'Opening payment…' : priceInr ? `Unlock CareerPilot — ₹${priceInr}` : 'Unlock CareerPilot';
  return { unlock, busy, msg, label, priceInr };
};
