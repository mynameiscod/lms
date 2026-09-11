import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import passportApi, { ConceptJourney as Journey, ConceptJourneyStep } from '../../api/passportApi';
import './conceptJourney.css';

/**
 * The whole course for one skill, as the student sees it.
 *
 * WHY IT EXISTS. A mission shows one step. A student working through fourteen of them had no
 * way to know whether they were near the end of for loops or near the end of loops, what was
 * still ahead, or why any of it came in that order — and the endpoint that could have told
 * them had no screen calling it. Being shown one thing at a time forever is how a course feels
 * like a treadmill, and it is the opposite of what the topic/subtopic structure was built for.
 *
 * IT IS A MAP, NOT A SECOND PLAN. Nothing here decides what a student should do — the roadmap
 * does that, and this reads the same authored sequence the daily mission reads, filtered the
 * same way, routed to the same destinations. A student who opens "Counting with range" here and
 * meets it again as tomorrow's mission lands in exactly the same place.
 *
 * OPENING IT IS NOT DOING IT. There is no "mark done" on this screen. Completion belongs to
 * the mission that asked for the work; a second writer on that record would let somebody finish
 * a course by scrolling it.
 */

/** The seven phases in a student's words. The enum names are for the resolver, not for them. */
const PHASE_LABEL: Record<string, string> = {
  UNDERSTAND: 'Why this matters',
  LEARN: 'Learn it',
  TRY: 'Try it with help',
  PRACTICE: 'Practise on your own',
  CHECK: 'Check yourself',
  APPLY: 'Put it together',
  REVIEW: 'Come back to it',
};

const mins = (n: number) => (n >= 60 ? `${Math.floor(n / 60)}h ${n % 60 ? `${n % 60}m` : ''}`.trim() : `${n} min`);

const isExternal = (route: string) => /^https?:\/\//i.test(route);

const ConceptJourney: React.FC = () => {
  const { skillKey = '' } = useParams();
  const nav = useNavigate();

  const [journey, setJourney] = useState<Journey | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try { setJourney(await passportApi.getMyConceptJourney(skillKey)); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Could not open this course.'); }
    finally { setLoading(false); }
  }, [skillKey]);

  useEffect(() => { load(); }, [load]);

  /**
   * An absolute URL is somebody else's site and opens in a new tab. Handing it to the router
   * builds an in-app path out of a URL and lands the student on a blank screen.
   */
  const open = (step: ConceptJourneyStep) => {
    if (!step.route || !step.hasContent) return;
    if (isExternal(step.route)) window.open(step.route, '_blank', 'noopener');
    else nav(step.route, { state: { fromJourney: skillKey } });
  };

  /**
   * The steps cut into the sections the author wrote, IN ORDER.
   *
   * A run, not a grouping. A journey may teach for loops, teach while loops, then return to
   * nested loops, and regathering those into one block would show the student an order nobody
   * authored and nothing will follow.
   */
  const sections = useMemo(() => {
    const out: { topic: string; subtopic: string; steps: ConceptJourneyStep[] }[] = [];
    for (const s of journey?.steps || []) {
      const last = out[out.length - 1];
      if (last && last.topic === s.topic && last.subtopic === s.subtopic) last.steps.push(s);
      else out.push({ topic: s.topic, subtopic: s.subtopic, steps: [s] });
    }
    return out;
  }, [journey]);

  const next = useMemo(
    () => (journey?.steps || []).find(s => s.stepId === journey?.nextStepId) || null,
    [journey],
  );

  if (loading) return <div className="cj"><div className="cj-state">Loading your course…</div></div>;

  if (err) return (
    <div className="cj">
      <div className="cj-state err">
        <b>{err}</b>
        <button className="cj-btn" onClick={() => nav('/careerpilot')}>Back to my missions</button>
      </div>
    </div>
  );

  if (!journey) return (
    /**
     * The ordinary case, not a failure. Most skills have no authored course yet, and a student
     * who followed a link here deserves to be told that plainly rather than shown an error.
     */
    <div className="cj">
      <button className="cj-back" onClick={() => nav('/careerpilot')}>← Back to my missions</button>
      <div className="cj-state">
        <b>No course for this skill yet</b>
        <p>
          Your missions will still teach it — you will get material for {skillKey.replace(/_/g, ' ').toLowerCase()} as
          your plan reaches it. When your mentors write the full course, it will appear here.
        </p>
        <button className="cj-btn primary" onClick={() => nav('/careerpilot')}>Back to my missions</button>
      </div>
    </div>
  );

  const { progress } = journey;
  const finished = progress.totalRequired > 0 && progress.completed >= progress.totalRequired;

  return (
    <div className="cj">
      <button className="cj-back" onClick={() => nav('/careerpilot')}>← Back to my missions</button>

      <header className="cj-hd">
        <span className="cj-kicker">Your course</span>
        <h1>{journey.title}</h1>
        {!!journey.description && <p className="cj-blurb">{journey.description}</p>}
      </header>

      {/* Where they are, and the one action worth taking. A progress figure with nothing to do
          next is a scoreboard; this is meant to be a way back in. */}
      <section className="cj-progress">
        <div className="cj-progress-text">
          <b>
            {finished
              ? 'You have finished this course'
              : `${progress.completed} of ${progress.totalRequired} done`}
          </b>
          <span>
            {journey.steps.length} step{journey.steps.length === 1 ? '' : 's'} · about {mins(journey.estimatedMinutes)} in total
          </span>
        </div>
        <div className="cj-bar" role="img" aria-label={`${progress.percent}% complete`}>
          <i className={finished ? 'full' : ''} style={{ width: `${Math.max(2, progress.percent)}%` }} />
        </div>
        {next && (
          <button
            className="cj-btn primary cj-continue"
            onClick={() => open(next)}
            disabled={!next.hasContent || !next.route}
          >
            {progress.completed ? 'Continue' : 'Start'} — {next.title || PHASE_LABEL[next.phase] || next.phase}
          </button>
        )}
      </section>

      {journey.learningOutcomes.length > 0 && (
        <section className="cj-outcomes">
          <h2>By the end of this you can</h2>
          <ul>{journey.learningOutcomes.map((o, i) => <li key={i}>{o}</li>)}</ul>
        </section>
      )}

      <section className="cj-course">
        <h2 className="cj-course-h">The course</h2>

        {sections.length === 0 && (
          /* A published course can still have nothing in it for THIS student — every step
             narrowed away by audience or score. Saying so beats an empty heading. */
          <p className="cj-none">
            Nothing in this course is aimed at you right now. Your plan will bring you back to
            it if that changes.
          </p>
        )}

        {sections.map((sec, si) => (
          <div className="cj-section" key={si}>
            {/* A step with no labels simply flows on — the headings are the author's structure,
                not a frame every step has to sit inside. */}
            {!!sec.topic && <h3 className="cj-topic">{sec.topic}</h3>}
            {!!sec.subtopic && <h4 className="cj-subtopic">{sec.subtopic}</h4>}

            <ol className="cj-steps">
              {sec.steps.map(s => {
                const isNext = s.stepId === journey.nextStepId;
                const openable = s.hasContent && !!s.route;
                return (
                  <li
                    key={s.stepId}
                    className={[
                      'cj-step',
                      s.done ? 'is-done' : '',
                      isNext ? 'is-next' : '',
                      openable ? '' : 'is-blocked',
                      s.required ? '' : 'is-optional',
                    ].join(' ')}
                  >
                    <button
                      className="cj-step-open"
                      onClick={() => open(s)}
                      disabled={!openable}
                      aria-label={`${s.title || s.phase}, ${s.done ? 'done' : 'not done'}`}
                    >
                      <span className="cj-tick" aria-hidden="true">
                        {s.done ? '✓' : String(s.sequence).padStart(2, '0')}
                      </span>
                      <span className="cj-step-text">
                        <span className="cj-step-title">
                          {s.title || PHASE_LABEL[s.phase] || s.phase}
                        </span>
                        <span className="cj-step-meta">
                          {PHASE_LABEL[s.phase] || s.phase}
                          {' · '}{mins(s.estimatedMinutes)}
                          {s.required ? '' : ' · optional'}
                          {!openable && ' · not ready yet'}
                        </span>
                      </span>
                      {isNext && <span className="cj-next-flag">Next</span>}
                      {openable && !isNext && <span className="cj-go" aria-hidden="true">→</span>}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </section>

      <footer className="cj-foot">
        <p>
          You tick work off on your missions screen, not here — this is the map. Your plan decides
          how much of it you do on any given day.
        </p>
        <button className="cj-btn" onClick={() => nav('/careerpilot')}>Back to my missions</button>
      </footer>
    </div>
  );
};

export default ConceptJourney;
