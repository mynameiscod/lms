/**
 * A Foundation journey day, worked through INSIDE CareerPilot.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────────────────────
 *
 * "Start today's work" used to navigate to /my-learning/:enrollmentId/day/:day — the LMS
 * student day player, wrapped in the LMS Layout. A CareerPilot member pressed one button and
 * landed in a different product: different rail, different navigation, no way back to their
 * roadmap. Members and LMS students are not the same audience, and the day a member's roadmap
 * sends them to belongs to the roadmap.
 *
 * ── WHAT IS REUSED, AND WHY NOTHING NEW WAS BUILT ─────────────────────────────────────────
 *
 * The data is the SAME endpoint the LMS player calls: enrollment day plans already return each
 * item with its `content` fully populated, and the server's membership guard already refuses
 * days beyond the preview. Inventing a second content API would have meant two places that
 * decide what a member may open, which is how one of them ends up wrong.
 *
 * The viewers are the same four components too. They take a single `content` prop and are
 * already mounted outside the LMS day page by the content library's preview modal, so they
 * carry no LMS chrome with them. What this file supplies is only the frame: the CareerPilot
 * rail stays, the day reads as part of the ninety, and every item opens in the page.
 *
 * ── THE CHECKPOINT IS THE ONE DELIBERATE JUMP ─────────────────────────────────────────────
 *
 * A quiz opens at /quiz/:id/take, which is registered with NO layout at all — a bare
 * full-screen paper. That is correct for an exam: a navigation rail beside a timed checkpoint
 * is an invitation to wander off mid-question. It returns here when it is done.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import passportApi, { FoundationJourney as Journey } from '../../api/passportApi';
import { enrollmentPlanApi } from '../../api/enrollmentPlanApi';
import { VideoPlayer, NotesViewer, QAViewer, PracticeViewer } from '../MyLearningPlan/DayView';
import InteractiveActivityViewer from '../MyLearningPlan/InteractiveActivityViewer';
import SectionLock from './SectionLock';
import { withReturn } from '../../utils/careerpilotReturn';
import './journeyDay.css';

/** Content types, in words a first-year recognises. Mirrors the roadmap screen. */
export const TYPE_LABEL: Record<string, string> = {
  video: 'Watch',
  notes: 'Read',
  worked_example: 'Worked example',
  interactive_lesson: 'Interactive',
  interactive_activity: 'Activity',
  tech_qa: 'Q&A',
  behavioral_qa: 'Q&A',
  practice_theory: 'Practice',
  practice_coding: 'Code practice',
  aptitude: 'Aptitude',
  quiz: 'Checkpoint',
  assignment: 'Project',
};

export const ICON: Record<string, string> = {
  video: 'bi-play-circle',
  notes: 'bi-file-text',
  worked_example: 'bi-lightbulb',
  interactive_activity: 'bi-puzzle',
  tech_qa: 'bi-chat-square-text',
  behavioral_qa: 'bi-chat-square-text',
  practice_theory: 'bi-pencil-square',
  practice_coding: 'bi-code-slash',
  aptitude: 'bi-123',
  quiz: 'bi-patch-question',
  assignment: 'bi-upload',
};

export const mins = (n: number) =>
  (n >= 60 ? `${Math.floor(n / 60)}h${n % 60 ? ` ${n % 60}m` : ''}` : `${n} min`);

/** The label an item carries, whichever shape the day plan used. */
export const titleOf = (item: any): string =>
  item?.content?.title || item?.contentTitle || item?.title || 'Untitled';

export const typeOf = (item: any): string =>
  item?.contentType || item?.content?.type || item?.kind || 'notes';

/**
 * Render one item's body.
 *
 * A module activity (checkpoint, project) has no `content` — it is launched, not read — so it
 * gets the launch panel instead of a viewer. Anything whose content failed to resolve says so
 * plainly rather than rendering an empty white box the member will read as a broken page.
 */
export const ItemBody: React.FC<{ item: any; onLaunch: (path: string) => void }> = ({ item, onLaunch }) => {
  const c = item?.content;

  if (!c) {
    const kind = item?.kind || 'activity';
    return (
      <div className="jd-launch">
        <div className="jd-launch-icon" aria-hidden>
          <i className={`bi ${ICON[typeOf(item)] || 'bi-journal-text'}`} />
        </div>
        <p>
          {kind === 'quiz'
            ? 'This checkpoint opens as a full-screen paper, so nothing distracts you while it is timed.'
            : kind === 'assignment'
              ? 'This project opens in its own workspace, where you can submit your work.'
              : 'This activity opens in its own screen.'}
        </p>
        {item?.launchPath
          ? (
            <button type="button" className="jd-btn primary" onClick={() => onLaunch(item.launchPath)}>
              Open {TYPE_LABEL[typeOf(item)]?.toLowerCase() || kind}
            </button>
          )
          : <p className="jd-muted">This activity is not ready to open yet.</p>}
      </div>
    );
  }

  switch (c.type) {
    case 'video': return <VideoPlayer content={c} onWatchEnough={() => { /* completion is explicit here */ }} />;
    case 'notes':
    case 'worked_example': return <NotesViewer content={c} />;
    case 'tech_qa':
    case 'behavioral_qa': return <QAViewer content={c} />;
    case 'practice_coding':
    case 'practice_theory':
    case 'aptitude': return <PracticeViewer content={c} />;
    case 'interactive_activity':
      return c.htmlContent
        ? <InteractiveActivityViewer htmlContent={c.htmlContent} completed={false} onComplete={() => { /* explicit below */ }} />
        : <p className="jd-muted">This activity has no content yet.</p>;
    default:
      return <p className="jd-muted">This lesson type cannot be shown here yet.</p>;
  }
};

const JourneyDay: React.FC = () => {
  const { day: dayParam } = useParams();
  const nav = useNavigate();
  const dayNumber = Math.max(1, parseInt(String(dayParam || '1'), 10) || 1);

  const [journey, setJourney] = useState<Journey | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [selIdx, setSelIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  /** Membership, not a fault: the server refuses days beyond the preview and this says why. */
  const [locked, setLocked] = useState(false);
  /**
   * Locked by the ladder rather than by membership, and they are different refusals.
   *
   * A membership lock is answered by paying; this one is answered by finishing yesterday. Showing
   * the membership panel here would ask somebody to buy something they already own.
   */
  const [dayLock, setDayLock] = useState<string>('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(''); setLocked(false); setDayLock('');
    try {
      const j = await passportApi.myFoundationJourney();
      setJourney(j);

      if (!j.enrollmentId) {
        // No whole journey yet — the roadmap explains the state properly, so defer to it.
        setItems([]);
        setLoading(false);
        return;
      }

      const plan = await enrollmentPlanApi.getDayPlan(j.enrollmentId, dayNumber);

      // The server withholds a locked day's items; it also says which kind of lock it is.
      if (plan?.isLocked && plan?.lockReason === 'sequential') {
        setDayLock(`Finish day ${dayNumber - 1} before starting day ${dayNumber}.`);
        setItems([]);
        return;
      }
      if (plan?.isLocked) { setLocked(true); setItems([]); return; }

      setItems(Array.isArray(plan?.items) ? plan.items : []);
      setSelIdx(0);
    } catch (e: any) {
      const reason = e?.response?.data?.reason;
      if (reason === 'DAY_LOCKED') setDayLock(e?.response?.data?.message || `Finish day ${dayNumber - 1} first.`);
      else if (e?.response?.status === 403) setLocked(true);
      else setError(e?.response?.data?.message || 'This day could not be opened.');
    } finally {
      setLoading(false);
    }
  }, [dayNumber]);

  useEffect(() => { load(); }, [load]);

  const totalDays = journey?.totalDays ?? 90;
  const dayTitle = journey?.days?.find((d: any) => d.day === dayNumber)?.title || '';
  const selected = items[selIdx];

  /**
   * Completion is an explicit press, and only for a lesson.
   *
   * A checkpoint or project is completed by attempting it, which the server derives from the
   * attempt itself — marking those "done" from here would let a member complete a paper they
   * never sat.
   */
  const markDone = async () => {
    const enrollmentId = journey?.enrollmentId;
    const contentId = selected?.contentId ? String(selected.contentId) : '';
    if (!enrollmentId || !contentId || selected?.isCompleted) return;
    setSaving(true);
    try {
      await enrollmentPlanApi.markContentComplete(enrollmentId, contentId, dayNumber);
      setItems(prev => prev.map((it, i) => (i === selIdx ? { ...it, isCompleted: true } : it)));
    } catch {
      setError('That could not be saved. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  if (locked) {
    return (
      <SectionLock
        section="roadmap"
        title="This day is part of membership"
        blurb={`Your first days are open to read. Day ${dayNumber} and the rest of your ${totalDays} unlock with membership.`}
      />
    );
  }

  /**
   * Locked by the ladder. Nothing to buy, so nothing is sold — the way out is the previous day,
   * and that is the only button offered.
   */
  if (dayLock) {
    return (
      <div className="jd-page">
        <nav className="jd-crumb">
          <button type="button" onClick={() => nav('/careerpilot/roadmap')}>
            <i className="bi bi-arrow-left" aria-hidden /> My Roadmap
          </button>
        </nav>
        <div className="jd-launch">
          <div className="jd-launch-icon" aria-hidden><i className="bi bi-lock-fill" /></div>
          <h2 style={{ margin: '0 0 6px', fontSize: 18 }}>Day {dayNumber} is not open yet</h2>
          <p>{dayLock}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {dayNumber > 1 && (
              <button type="button" className="jd-btn primary" onClick={() => nav(`/careerpilot/journey/day/${dayNumber - 1}`)}>
                Go to day {dayNumber - 1}
              </button>
            )}
            <button type="button" className="jd-btn" onClick={() => nav('/careerpilot/roadmap')}>
              Back to my roadmap
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="jd-page">
      <nav className="jd-crumb">
        <button type="button" onClick={() => nav('/careerpilot/roadmap')}>
          <i className="bi bi-arrow-left" aria-hidden /> My Roadmap
        </button>
      </nav>

      <header className="jd-head">
        <div>
          <span className="jd-kicker">DAY {dayNumber} OF {totalDays}</span>
          <h1>{dayTitle || `Day ${dayNumber}`}</h1>
        </div>
        <div className="jd-daynav">
          <button type="button" disabled={dayNumber <= 1}
                  onClick={() => nav(`/careerpilot/journey/day/${dayNumber - 1}`)}>
            <i className="bi bi-chevron-left" aria-hidden /> Previous
          </button>
          <button type="button" disabled={dayNumber >= totalDays}
                  onClick={() => nav(`/careerpilot/journey/day/${dayNumber + 1}`)}>
            Next <i className="bi bi-chevron-right" aria-hidden />
          </button>
        </div>
      </header>

      {loading && <div className="jd-skeleton">Opening day {dayNumber}…</div>}
      {!!error && !loading && <p className="jd-error">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <div className="jd-empty">
          <p>There is nothing to open for this day yet.</p>
          <button type="button" className="jd-btn" onClick={() => nav('/careerpilot/roadmap')}>
            Back to my roadmap
          </button>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="jd-grid">
          {/* The day's work, in order. Selecting never navigates: the member stays on the day. */}
          <ol className="jd-rail" aria-label="Today's activities">
            {items.map((it, i) => (
              <li key={it._id || it.contentId || it.sourceId || i}>
                <button
                  type="button"
                  className={`jd-item${i === selIdx ? ' sel' : ''}${it.isCompleted ? ' done' : ''}`}
                  onClick={() => setSelIdx(i)}
                  aria-current={i === selIdx ? 'true' : undefined}
                >
                  <span className="jd-item-icon" aria-hidden>
                    <i className={`bi ${it.isCompleted ? 'bi-check-circle-fill' : (ICON[typeOf(it)] || 'bi-journal-text')}`} />
                  </span>
                  <span className="jd-item-body">
                    <b>{titleOf(it)}</b>
                    <small>
                      {TYPE_LABEL[typeOf(it)] || typeOf(it)}
                      {it.estimatedDuration > 0 && <> · {mins(it.estimatedDuration)}</>}
                      {it.isGating && <> · must be completed</>}
                    </small>
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <section className="jd-stage" aria-live="polite">
            {selected && (
              <>
                <div className="jd-stage-head">
                  <div>
                    <span className="jd-type">{TYPE_LABEL[typeOf(selected)] || typeOf(selected)}</span>
                    <h2>{titleOf(selected)}</h2>
                  </div>
                  {selected.isCompleted && <span className="jd-done-badge"><i className="bi bi-check-lg" aria-hidden /> Done</span>}
                </div>

                <div className="jd-body">
                  {/* A checkpoint comes back to this day when it is done, instead of the LMS quiz list. */}
                  <ItemBody item={selected} onLaunch={(p) => nav(selected?.kind === 'quiz' ? withReturn(p, `/careerpilot/journey/day/${dayNumber}`) : p)} />
                </div>

                <div className="jd-actions">
                  {/* Only a lesson can be ticked off here; see markDone. */}
                  {selected.contentId && !selected.isCompleted && (
                    <button type="button" className="jd-btn primary" onClick={markDone} disabled={saving}>
                      {saving ? 'Saving…' : 'Mark as done'}
                    </button>
                  )}
                  {selIdx < items.length - 1 && (
                    <button type="button" className="jd-btn" onClick={() => setSelIdx(selIdx + 1)}>
                      Next activity <i className="bi bi-arrow-right" aria-hidden />
                    </button>
                  )}
                  {selIdx === items.length - 1 && dayNumber < totalDays && (
                    <button type="button" className="jd-btn" onClick={() => nav(`/careerpilot/journey/day/${dayNumber + 1}`)}>
                      Go to day {dayNumber + 1} <i className="bi bi-arrow-right" aria-hidden />
                    </button>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default JourneyDay;
