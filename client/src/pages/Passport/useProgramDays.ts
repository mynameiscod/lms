import { useEffect, useState } from 'react';
import passportApi from '../../api/passportApi';
import { useMember } from './MemberLayout';

/**
 * THE MEMBER'S OWN PROGRAMME LENGTH, NEVER A CONSTANT.
 *
 * Each year has a length the admin sets (first year 90 by default, second 110 …) and the server
 * sends it as `programDays`, already worked out for this member's year. Every screen that names
 * the length reads it from here, so "90-day" never reaches a second-year member and a change in
 * the admin settings shows everywhere at once.
 *
 * Inside the member layout it comes from the payload already loaded; elsewhere (the assessment
 * screen) it is asked for once and shared. `null` while unknown — a caller words its sentence
 * without the number rather than flashing a wrong one.
 */
let cached: number | null = null;
let inflight: Promise<number | null> | null = null;

export function useProgramDays(): number | null {
  const { data } = useMember();
  const fromLayout = Number((data as any)?.programDays) || null;
  const [days, setDays] = useState<number | null>(fromLayout || cached);

  useEffect(() => {
    if (fromLayout) { cached = fromLayout; setDays(fromLayout); return; }
    if (cached) { setDays(cached); return; }
    if (!inflight) {
      inflight = passportApi.getDashboard()
        .then(d => { cached = Number((d as any)?.programDays) || null; return cached; })
        .catch(() => null);
    }
    let live = true;
    inflight.then(n => { if (live && n) setDays(n); });
    return () => { live = false; };
  }, [fromLayout]);

  return fromLayout || days;
}

/** "110-day" when the length is known, otherwise a word that is true without it. */
export const daysLabel = (days: number | null, fallback = 'personalised'): string => (days ? `${days}-day` : fallback);
