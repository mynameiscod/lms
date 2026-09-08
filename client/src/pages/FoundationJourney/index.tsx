/**
 * My Foundation Journey — the plan, as the student sees it.
 *
 * THE SCREEN THE WHOLE SYSTEM EXISTS TO PRODUCE. Everything measured, decided and stored ends
 * here, and if this page cannot say WHY a topic is on it then none of that work reached the
 * student. Every topic therefore renders its reason inline rather than behind a tooltip nobody
 * opens.
 *
 * NOTHING IS FRAMED AS FAILURE. "Not started yet" is not "failed"; a mastered topic is present
 * and marked rather than missing; a locked topic names the one thing to finish first instead of
 * showing a closed door. A first-year reading this should feel located, not judged.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { adaptiveApi, AdaptivePlan, PlanTopic, AssignedContent, STATE_LABEL, STATE_TONE } from '../../api/adaptiveApi';
import './journey.css';

interface Props {
  studentId: string;
  curriculumId: string;
}

const FoundationJourney: React.FC<Props> = ({ studentId, curriculumId }) => {
  const [plan, setPlan] = useState<AdaptivePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [openWhy, setOpenWhy] = useState<string | null>(null);
  const [replanNeeded, setReplanNeeded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const p = await adaptiveApi.getPlan(studentId, curriculumId);
      setPlan(p);
      if (p) {
        // Advisory only. The plan never rebuilds itself while somebody is reading it.
        const check = await adaptiveApi.checkReplan(studentId, curriculumId).catch(() => null);
        setReplanNeeded(!!check?.needed);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not load your journey.');
    } finally { setLoading(false); }
  }, [studentId, curriculumId]);

  useEffect(() => { load(); }, [load]);

  const build = async (replan: boolean) => {
    setBusy(true); setError('');
    try {
      if (replan) await adaptiveApi.replan(studentId, curriculumId);
      else await adaptiveApi.generatePlan(studentId, curriculumId, false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not build your journey.');
    } finally { setBusy(false); }
  };

  if (loading) return <div className="fj-wrap"><p className="fj-muted">Loading your journey…</p></div>;

  if (!plan) {
    return (
      <div className="fj-wrap">
        <div className="fj-empty">
          <h1 className="fj-title">Your Foundation Journey</h1>
          <p className="fj-lede">
            Take the diagnostic and we will build a plan around what you already know — not a
            plan everyone gets.
          </p>
          {error && <div className="fj-error">{error}</div>}
          <button className="fj-btn" onClick={() => build(false)} disabled={busy}>
            {busy ? 'Building…' : 'Build my journey'}
          </button>
        </div>
      </div>
    );
  }

  const counts = plan.summary || {};
  const verified = counts.VERIFIED || 0;
  const building = (counts.FOUNDATION_REQUIRED || 0) + (counts.NOT_EXPOSED || 0);
  const active = (counts.GUIDED || 0) + (counts.STANDARD || 0) + (counts.REVISION || 0);
  const locked = counts.LOCKED || 0;

  return (
    <div className="fj-wrap">
      <header className="fj-head">
        <div>
          <h1 className="fj-title">Your Foundation Journey</h1>
          <p className="fj-sub">
            {plan.direction
              ? <>Pointed at <strong>{plan.direction.replace(/_/g, ' ').toLowerCase()}</strong></>
              : <>Building the foundation while you decide where to head</>}
            {' · '}about {plan.estimatedWeeks} week{plan.estimatedWeeks === 1 ? '' : 's'} at your pace
          </p>
        </div>
        <span className="fj-version">v{plan.version}</span>
      </header>

      <div className="fj-stats">
        <Stat n={verified} label="Verified" tone="done" />
        <Stat n={active} label="In progress" tone="active" />
        <Stat n={building} label="Building up" tone="build" />
        {locked > 0 && <Stat n={locked} label="Unlocks later" tone="locked" />}
      </div>

      {replanNeeded && (
        /**
         * Offered, never applied automatically. A plan that rearranges itself under somebody
         * while they are reading it stops feeling like theirs.
         */
        <div className="fj-notice">
          <span>Your recent results changed what you need. Want your remaining plan updated?</span>
          <button className="fj-btn fj-btn-sm" onClick={() => build(true)} disabled={busy}>
            {busy ? 'Updating…' : 'Update my plan'}
          </button>
        </div>
      )}

      {error && <div className="fj-error">{error}</div>}

      {plan.modules.map(m => {
        // Irrelevant topics are collapsed rather than removed: the student can see what was set
        // aside and why, without it filling the page.
        const shown = m.topics.filter(t => t.state !== 'NOT_RELEVANT');
        const aside = m.topics.filter(t => t.state === 'NOT_RELEVANT');
        if (!shown.length && !aside.length) return null;

        return (
          <section className="fj-module" key={m.moduleCode}>
            <h2 className="fj-module-title">{m.moduleName || m.moduleCode}</h2>
            <ul className="fj-topics">
              {shown.map(t => (
                <TopicRow
                  key={t.topicCode || t.title}
                  topic={t}
                  open={openWhy === (t.topicCode || t.title)}
                  onToggle={() => setOpenWhy(openWhy === (t.topicCode || t.title) ? null : (t.topicCode || t.title))}
                />
              ))}
            </ul>
            {aside.length > 0 && (
              <details className="fj-aside">
                <summary>{aside.length} topic{aside.length === 1 ? '' : 's'} not in your path</summary>
                <ul className="fj-topics">
                  {aside.map(t => (
                    <TopicRow
                      key={t.topicCode || t.title}
                      topic={t}
                      open={openWhy === (t.topicCode || t.title)}
                      onToggle={() => setOpenWhy(openWhy === (t.topicCode || t.title) ? null : (t.topicCode || t.title))}
                    />
                  ))}
                </ul>
              </details>
            )}
          </section>
        );
      })}
    </div>
  );
};

const Stat: React.FC<{ n: number; label: string; tone: string }> = ({ n, label, tone }) => (
  <div className={`fj-stat fj-tone-${tone}`}>
    <span className="fj-stat-n">{n}</span>
    <span className="fj-stat-l">{label}</span>
  </div>
);

/**
 * One topic, and what it actually gives the student to do.
 *
 * A journey that lists topics without opening them is a table of contents, not a plan. The
 * material is fetched only when a topic is expanded — a first-year plan carries twenty-five
 * topics and loading every lesson to render a list would be slow for no benefit.
 */
const TopicRow: React.FC<{ topic: PlanTopic; open: boolean; onToggle: () => void }> = ({ topic, open, onToggle }) => {
  const [items, setItems] = useState<AssignedContent[]>([]);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState<AssignedContent | null>(null);

  useEffect(() => {
    if (!open || !topic.contentIds.length || items.length) return;
    setBusy(true);
    Promise.all(topic.contentIds.map(id => adaptiveApi.getContent(id).catch(() => null)))
      .then(rows => setItems(rows.filter(Boolean) as AssignedContent[]))
      .finally(() => setBusy(false));
  }, [open, topic.contentIds, items.length]);

  return (
    <li className={`fj-topic fj-tone-${STATE_TONE[topic.state]}`}>
      <div className="fj-topic-main">
        <div className="fj-topic-text">
          <span className="fj-topic-title">{topic.title}</span>
          <span className="fj-topic-state">
            {STATE_LABEL[topic.state]}
            {topic.contentIds.length > 0 && ` · ${topic.contentIds.length} item${topic.contentIds.length === 1 ? '' : 's'}`}
          </span>
        </div>
        <button className="fj-why-btn" onClick={onToggle} aria-expanded={open}>
          {open ? 'Hide' : topic.locked ? 'Why locked?' : 'Open'}
        </button>
      </div>

      {open && (
        <div className="fj-topic-body">
          <p className="fj-why">
            {topic.why}
            {topic.state === 'VERIFIED' && ' Nothing here is required — there is a challenge if you want it.'}
          </p>

          {busy && <p className="fj-muted fj-small">Loading your material…</p>}

          {!busy && !topic.contentIds.length && !topic.locked && (
            /* Honest rather than blank: the plan decided this topic and the library has
               nothing for it yet. A student seeing an empty panel assumes a broken page. */
            <p className="fj-muted fj-small">No material has been added for this topic yet.</p>
          )}

          {items.length > 0 && (
            <ul className="fj-materials">
              {items.map(it => (
                <li key={it.id}>
                  <button className="fj-material" onClick={() => setReading(reading?.id === it.id ? null : it)}>
                    <span className="fj-material-type">{it.type.replace(/_/g, ' ')}</span>
                    <span className="fj-material-title">{it.title}</span>
                    <span className="fj-material-mins">{it.estimatedMinutes} min</span>
                  </button>
                  {reading?.id === it.id && (
                    <div className="fj-reader">
                      {it.notesContent && <div dangerouslySetInnerHTML={{ __html: it.notesContent }} />}
                      {it.practiceQuestions.length > 0 && (
                        <ol className="fj-practice">
                          {it.practiceQuestions.map((q, i) => (
                            <li key={i}>
                              <p>{q.description || q.title}</p>
                              <ul>{q.options.map((o, n) => <li key={n}>{o.text}</li>)}</ul>
                            </li>
                          ))}
                        </ol>
                      )}
                      {!it.notesContent && !it.practiceQuestions.length && (
                        <p className="fj-muted fj-small">This item has no readable content.</p>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
};

export default FoundationJourney;
