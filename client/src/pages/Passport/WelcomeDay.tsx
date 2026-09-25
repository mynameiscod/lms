import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import passportApi, { OrientationDay, OrientationView } from '../../api/passportApi';
import { Item, ICON, mins } from './Orientation';
import './journeyDay.css';
import './journeyDayMember.css';
import './orientation.css';

/**
 * ONE WELCOME DAY, AS A PAGE OF ITS OWN.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────────────────────
 *
 * A welcome day only ever rendered as a card inside the plan screen, while a learning day has a
 * page: a navy hero, a task rail on the left, one task at a time on the right. So the five days
 * every student is required to do first were the five that looked least like the product, and
 * the request — repeatedly — was that day 0.1 should open the way day 1 does.
 *
 * It reuses journeyDay.css and journeyDayMember.css rather than restating them, so the two pages
 * are the same page by construction. If the learning day's look changes, this changes with it.
 *
 * ── WHY ITS OWN ROUTE AND NOT /journey/day/0.1 ────────────────────────────────────────────
 *
 * JourneyDay reads its day with parseInt, so "0.1" arrives there as 1 — silently the wrong day,
 * and the exact reason a member kept landing on Day 1. Welcome days are numbered 1..5 internally
 * and called 0.1..0.5, and keeping them on their own route means neither numbering has to
 * pretend to be the other.
 *
 * ── WHAT IT DOES NOT COPY ─────────────────────────────────────────────────────────────────
 *
 * XP, and the day-bonus. A welcome day awards none, and showing "+0 XP" beside every task would
 * be inventing a currency to look consistent. The rail, the stage, the progress bar and the
 * ordering are the same; the scoring is not, because it is not there.
 */

const WelcomeDay: React.FC = () => {
  const nav = useNavigate();
  const { day: dayParam } = useParams<{ day: string }>();

  /* "0.3" and "3" both mean welcome day three. The URL is allowed to carry either. */
  const dayNumber = Math.max(1, Math.round(Number(String(dayParam || '1').replace(/^0\./, '')) || 1));

  const [view, setView] = useState<OrientationView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selIdx, setSelIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [outstanding, setOutstanding] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setView(await passportApi.getMyOrientation()); }
    catch (e: any) { setError(e?.response?.data?.message || 'Could not open this day.'); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const day: OrientationDay | undefined = useMemo(
    () => (view?.days || []).find(d => d.dayNumber === dayNumber), [view, dayNumber]);
  const next = useMemo(
    () => (view?.days || []).find(d => d.dayNumber === dayNumber + 1) || null, [view, dayNumber]);

  const items = day?.items || [];
  const doneCount = items.filter(i => i.done).length;
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;
  const sel = items[Math.min(selIdx, Math.max(0, items.length - 1))];

  /* Every save hands back the whole view, so the page refreshes from the server's answer. */
  const adopt = (v: OrientationView) => { setOutstanding([]); setView(v); };

  const finish = async () => {
    if (!day) return;
    setOutstanding([]); setBusy(true);
    const r = await passportApi.completeOrientationDay(day.dayNumber)
      .catch((e: any) => e?.response?.data || { ok: false, message: 'That did not save.' });
    setBusy(false);
    if (r?.orientation) setView(r.orientation);
    /* Refused while something required is unfinished: the server names what, and so does this. */
    if (!r?.ok) { setOutstanding(r?.outstanding || []); return; }
    const after = r.orientation;
    if (after?.complete) { nav('/careerpilot/plan'); return; }
    if (after?.nextDay) { nav(`/careerpilot/journey/welcome/${after.nextDay}`); setSelIdx(0); return; }
    /* Paced: there is a next day but it does not open until tomorrow. Back to the plan, which says so. */
    nav('/careerpilot/plan');
  };

  if (loading) return <div className="jd-page jdm"><div className="jd-loading">Opening your day…</div></div>;

  if (error || !view?.enabled || !day) {
    return (
      <div className="jd-page jdm">
        <div className="jd-launch">
          <h2>This day is not available</h2>
          <p>{error || 'Your welcome does not include this day.'}</p>
          <button type="button" className="jd-btn primary" onClick={() => nav('/careerpilot/plan')}>Back to my plan</button>
        </div>
      </div>
    );
  }

  /*
   * A LOCKED DAY IS NAMED, NOT SERVED — and the server already enforces that by sending no
   * items. Saying which of the two reasons it is matters: "finish 0.2 first" is something the
   * member can act on now, "opens tomorrow" is not.
   */
  if (day.locked) {
    return (
      <div className="jd-page jdm">
        <div className="jd-launch">
          <h2>Day {day.day} is not open yet</h2>
          <p>
            {day.lockedReason === 'NOT_TODAY_YET'
              ? 'One day at a time — this one opens tomorrow.'
              : `Finish the day before it first.`}
          </p>
          <button type="button" className="jd-btn primary" onClick={() => nav('/careerpilot/plan')}>Back to my plan</button>
        </div>
      </div>
    );
  }

  return (
    <div className="jd-page jdm">
      <section className="jdm-hero">
        <div className="jdm-hero-copy">
          <button type="button" className="jdm-crumb" onClick={() => nav('/careerpilot/plan')}>
            <i className="bi bi-arrow-left" aria-hidden /> My Plan
          </button>
          {/* Before Day 1, and said so plainly: these five are not part of the ninety. */}
          <span className="jdm-eyebrow">Day {day.day} · before Day 1</span>
          <h1>{day.title}</h1>
          {day.blurb && <p className="jdm-blurb">{day.blurb}</p>}
          {items.length > 0 && (
            <>
              <div className="jdm-chips">
                <span><i className="bi bi-check2-circle" /> {doneCount} of {items.length} tasks done</span>
                {day.minutes ? <span><i className="bi bi-clock" /> {mins(day.minutes)}</span> : null}
              </div>
              <div className="jdm-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
                   aria-label="Day progress">
                <i style={{ width: `${Math.max(2, pct)}%` }} />
              </div>
            </>
          )}
        </div>
      </section>

      {day.done && (
        <div className="jdm-complete">
          <span className="ic"><i className="bi bi-trophy-fill" aria-hidden /></span>
          <div>
            <b>Day {day.day} finished</b>
            <span>
              {next
                ? (next.locked && next.lockedReason === 'NOT_TODAY_YET'
                    ? `Day ${next.day} opens tomorrow.`
                    : `Day ${next.day} is open.`)
                : 'That is the whole welcome. Day 1 is open.'}
            </span>
          </div>
          {next && !next.locked && (
            <button type="button" className="jd-btn primary"
                    onClick={() => { nav(`/careerpilot/journey/welcome/${next.dayNumber}`); setSelIdx(0); }}>
              Go to day {next.day}
            </button>
          )}
          {!next && (
            <button type="button" className="jd-btn primary" onClick={() => nav('/careerpilot/plan')}>
              Go to Day 1
            </button>
          )}
        </div>
      )}

      {items.length > 0 && (
        <div className="jd-grid">
          {/* The day's work, in order. Selecting never navigates: the member stays on the day. */}
          <aside className="jdm-rail-card">
            <div className="jdm-rail-head"><b>Today’s tasks</b><span>{doneCount}/{items.length}</span></div>
            <ol className="jd-rail" aria-label="This day's tasks">
              {items.map((it, i) => (
                <li key={it.key}>
                  <button
                    type="button"
                    className={`jd-item${i === selIdx ? ' sel' : ''}${it.done ? ' done' : ''}`}
                    onClick={() => setSelIdx(i)}
                    aria-current={i === selIdx ? 'true' : undefined}
                  >
                    <span className={`jd-item-icon t-${it.kind}`} aria-hidden>
                      <i className={`bi ${it.done ? 'bi-check-lg' : (ICON[it.kind] || 'bi-journal-text')}`} />
                    </span>
                    <span className="jd-item-body">
                      <b>{it.title}</b>
                      <small>
                        {it.kind === 'recording' ? 'Recording' : it.kind[0].toUpperCase() + it.kind.slice(1)}
                        {it.estimatedMinutes > 0 && <> · {mins(it.estimatedMinutes)}</>}
                        {it.required ? <> · must be completed</> : <> · optional</>}
                      </small>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </aside>

          {/* One task at a time, exactly as a learning day shows one activity at a time. */}
          <section className="jd-stage" id="jdm-stage">
            {sel && (
              <>
                <div className="jd-stage-head">
                  <span className={`jd-type t-${sel.kind}`}>{sel.kind}</span>
                  <h2>{sel.title}</h2>
                  {sel.done && <span className="jd-done-badge"><i className="bi bi-check-lg" /> Done</span>}
                </div>
                <div className="jd-body">
                  {/*
                    * The SAME item renderer the standalone welcome screen uses, so the video's
                    * ninety-per-cent gate, the checklist's per-tick save and the recorder behave
                    * identically here. A second copy of those rules would drift from this one.
                    */}
                  <Item key={sel.key} day={day.dayNumber} item={sel} onSaved={adopt} />
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {outstanding.length > 0 && (
        <p className="ori-err">Still to do: {outstanding.join(', ')}.</p>
      )}

      {!day.done && (
        <footer className="jd-actions">
          <button type="button" className="jd-btn primary" disabled={busy} onClick={finish}>
            {busy ? 'Saving…' : <>Finish day {day.day} <i className="bi bi-arrow-right" /></>}
          </button>
        </footer>
      )}
    </div>
  );
};

export default WelcomeDay;
