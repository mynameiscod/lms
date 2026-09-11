/**
 * Author one skill's journey: its topics, its subtopics, and the order they are taught in.
 *
 * THE SHAPE THIS SCREEN EXISTS TO EXPRESS.
 *
 *   Module  Programming Fundamentals      ← the Year-1 curriculum, seeded
 *     Skill   Loops (LOOPS_BASICS)        ← a CareerSkill: measured, blueprinted, 50 questions
 *       Topic     For loops               ← authored here
 *         Subtopic  Counting with range   ← authored here
 *           steps: understand · worked example · practice
 *       Topic     While loops
 *
 * TOPIC AND SUBTOPIC ARE LABELS, NOT SKILLS. That distinction is the whole reason this is an
 * editor and not a taxonomy screen. Making "for loops" a CareerSkill would give it a blueprint
 * row, a target level, a question pool and a share of the readiness figure, and 112 skills would
 * become several hundred — each needing 50 authored questions before a student could be scored
 * on it. Grouping belongs to the journey; measurement stays at the skill.
 *
 * ORDER IS `sequence`, NEVER THE LABELS. An author may return to a topic later in a journey —
 * teach for loops, teach while loops, then come back to nested loops — and the screen must not
 * silently re-gather those into one block. So the headers are rendered as the order runs
 * through them, and a topic appearing twice is shown twice.
 *
 * SAVING NEVER TOUCHES A LIVE JOURNEY. The server forks a draft when a published unit is
 * edited; publishing is the separate, deliberate act that makes a draft the thing students
 * read. Nobody halfway through reordering fourteen steps is reordering them underneath the
 * people working through them.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  passportApi, LEARNING_PHASES, emptyJourneyStep,
  ConceptJourneyDetail, ConceptJourneyStep, ConceptJourneyReadiness, ConceptAudience,
} from '../../api/passportApi';
import './learningStudio.css';

/** Said in an author's words. The enum names are for the resolver, not for a person. */
const PHASE_HINT: Record<string, string> = {
  UNDERSTAND: 'First contact — why this matters',
  LEARN: 'The substance',
  TRY: 'Guided, answer visible',
  PRACTICE: 'On their own',
  CHECK: 'Measured',
  APPLY: 'A larger piece using several ideas',
  REVIEW: 'Consolidation, later',
};

/** A CHECK step routes to the assessment, so it is the one phase that needs no resource. */
const needsResource = (phase: string) => phase !== 'CHECK';

const ConceptEditor: React.FC = () => {
  const { skillKey = '' } = useParams<{ skillKey: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<ConceptJourneyDetail | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [outcomes, setOutcomes] = useState('');
  const [steps, setSteps] = useState<ConceptJourneyStep[]>([]);
  const [readiness, setReadiness] = useState<ConceptJourneyReadiness | null>(null);
  /**
   * Fields the studio does not edit, held only so that saving gives them back.
   *
   * PUT rebuilds a unit from the request body rather than merging into the stored document, so
   * omitting a field is not "leave it alone", it is "clear it". Audience would have been
   * emptied and the completion threshold reset to 1 on the first save of any journey that had
   * either — silently, and visible much later as a student served a step meant for somebody
   * else, or as a unit that will not close until every last required step is ticked.
   */
  const [audience, setAudience] = useState<ConceptAudience | undefined>(undefined);
  const [threshold, setThreshold] = useState<number | undefined>(undefined);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState('');
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const adopt = useCallback((d: ConceptJourneyDetail) => {
    setDetail(d);
    setTitle(d.unit?.title || d.skill.name || skillKey);
    setDescription(d.unit?.description || '');
    setOutcomes((d.unit?.learningOutcomes || []).join('\n'));
    setSteps(d.unit?.steps || []);
    setAudience(d.unit?.audience);
    setThreshold(d.unit?.completionThreshold);
    setReadiness(d.readiness);
    setDirty(false);
  }, [skillKey]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      adopt(await passportApi.getConceptJourney(skillKey));
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not load this concept.');
    } finally { setLoading(false); }
  }, [skillKey, adopt]);

  useEffect(() => { load(); }, [load]);

  /* ── editing ────────────────────────────────────────────────────────────────────────── */

  const touch = () => { setDirty(true); setNotice(''); };

  const patch = (stepId: string, change: Partial<ConceptJourneyStep>) => {
    touch();
    setSteps(list => list.map(s => (s.stepId === stepId ? { ...s, ...change } : s)));
  };

  /** Renumber to 1..n in array order, so `sequence` always says what the screen shows. */
  const renumber = (list: ConceptJourneyStep[]) => list.map((s, i) => ({ ...s, sequence: i + 1 }));

  const addStep = (topic = '', subtopic = '', at?: number) => {
    touch();
    setSteps(list => {
      const step = { ...emptyJourneyStep(list.length + 1), topic, subtopic };
      const next = list.slice();
      next.splice(at === undefined ? list.length : at, 0, step);
      setOpen(step.stepId);
      return renumber(next);
    });
  };

  const move = (stepId: string, by: -1 | 1) => {
    touch();
    setSteps(list => {
      const i = list.findIndex(s => s.stepId === stepId);
      const j = i + by;
      if (i < 0 || j < 0 || j >= list.length) return list;
      const next = list.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return renumber(next);
    });
  };

  const remove = (stepId: string) => {
    touch();
    setSteps(list => renumber(list.filter(s => s.stepId !== stepId)));
  };

  /**
   * Rename a topic or subtopic everywhere it appears.
   *
   * Renaming from inside one step would leave the other eleven steps under the old spelling and
   * split the group in two, which is the failure mode of free-text grouping. So the header owns
   * the name, and the step fields below follow it.
   */
  const renameGroup = (from: { topic: string; subtopic?: string }, to: string, level: 'topic' | 'subtopic') => {
    touch();
    const same = (a?: string, b?: string) => (a || '').trim() === (b || '').trim();
    setSteps(list => list.map(s => {
      if (!same(s.topic, from.topic)) return s;
      if (level === 'topic') return { ...s, topic: to };
      return same(s.subtopic, from.subtopic) ? { ...s, subtopic: to } : s;
    }));
  };

  /* ── saving ─────────────────────────────────────────────────────────────────────────── */

  const save = async (): Promise<boolean> => {
    setSaving(true); setError(''); setNotice('');
    try {
      const body = {
        title: title.trim(),
        description: description.trim(),
        learningOutcomes: outcomes.split('\n').map(o => o.trim()).filter(Boolean),
        ...(audience ? { audience } : {}),
        ...(typeof threshold === 'number' ? { completionThreshold: threshold } : {}),
        steps,
      };
      const saved = await passportApi.saveConceptJourney(skillKey, body);
      // Reload rather than trusting local state: the server mints step ids, renumbers, and may
      // have forked a draft from a published unit, which changes the version and the history.
      const fresh = await passportApi.getConceptJourney(skillKey);
      adopt(fresh);
      setReadiness(saved.readiness || fresh.readiness);
      setNotice(
        fresh.unit?.status === 'DRAFT' && detail?.unit?.status === 'PUBLISHED'
          ? 'Saved as a new draft. The live journey is unchanged until you publish.'
          : 'Saved.',
      );
      return true;
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not save this journey.');
      return false;
    } finally { setSaving(false); }
  };

  const publish = async () => {
    if (dirty && !(await save())) return;
    const unitId = detail?.unit?._id;
    if (!unitId) { setError('Save the journey before publishing it.'); return; }
    setBusy('publish'); setError(''); setNotice('');
    try {
      const result = await passportApi.publishConceptJourney(unitId);
      if (result.readiness) setReadiness(result.readiness);
      if (!result.published) {
        setError(result.message || 'This journey cannot be published yet.');
      } else {
        await load();
        setNotice('Published. Students reach this journey from their next mission on this skill.');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not publish.');
    } finally { setBusy(''); }
  };

  const archive = async () => {
    const unitId = detail?.unit?._id;
    if (!unitId) return;
    // Archiving takes a journey away from students who may be partway through it, so it asks.
    if (!window.confirm('Archive this journey? Students will stop being served its steps.')) return;
    setBusy('archive'); setError(''); setNotice('');
    try {
      await passportApi.archiveConceptJourney(unitId);
      await load();
      setNotice('Archived.');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not archive.');
    } finally { setBusy(''); }
  };

  /* ── derived ────────────────────────────────────────────────────────────────────────── */

  const resourceById = useMemo(
    () => new Map((detail?.resources || []).map(r => [r.id, r])),
    [detail],
  );

  const totalMinutes = useMemo(
    () => steps.reduce((n, s) => n + (Number(s.estimatedMinutes) || 0), 0),
    [steps],
  );

  const topicCount = useMemo(
    () => new Set(steps.map(s => (s.topic || '').trim()).filter(Boolean)).size,
    [steps],
  );

  const subtopicCount = useMemo(
    () => new Set(steps.filter(s => (s.subtopic || '').trim())
      .map(s => `${s.topic || ''}›${s.subtopic}`)).size,
    [steps],
  );

  /**
   * Where each topic's block ends, so "add a step to this topic" lands inside it rather than at
   * the bottom of the journey. A run, not a group — a topic revisited later is two runs.
   */
  const runEnd = (i: number): number => {
    const topic = steps[i].topic || '';
    const sub = steps[i].subtopic || '';
    let j = i;
    while (j + 1 < steps.length && (steps[j + 1].topic || '') === topic && (steps[j + 1].subtopic || '') === sub) j++;
    return j + 1;
  };

  if (loading) return <div className="ls-wrap"><p className="ls-muted">Loading…</p></div>;

  const unit = detail?.unit || null;
  const status = unit?.status || null;

  return (
    <div className="ls-wrap">
      <header className="ls-head">
        <div className="ls-head-text">
          <h1 className="ls-title">{detail?.skill.name || skillKey}</h1>
          <p className="ls-sub">
            {skillKey}
            {detail?.skill.category ? ` · ${detail.skill.category}` : ''}
            {' · '}
            {steps.length} step{steps.length === 1 ? '' : 's'} · {topicCount} topic{topicCount === 1 ? '' : 's'}
            {subtopicCount ? ` · ${subtopicCount} subtopic${subtopicCount === 1 ? '' : 's'}` : ''}
            {' · '}{totalMinutes} min
          </p>
        </div>
        <div className="ls-actions">
          {status && <span className={`ls-chip is-${status.toLowerCase()}`}>{status}{unit ? ` v${unit.version}` : ''}</span>}
          <button className="ls-btn" onClick={() => navigate('/admin/learning-studio')}>All concepts</button>
          <button className="ls-btn is-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : dirty ? 'Save changes' : 'Save'}
          </button>
          <button className="ls-btn" onClick={publish} disabled={!!busy || saving || !steps.length}>
            {busy === 'publish' ? 'Publishing…' : 'Publish'}
          </button>
          {unit && status !== 'ARCHIVED' && (
            <button className="ls-btn is-danger" onClick={archive} disabled={!!busy || saving}>
              {busy === 'archive' ? 'Archiving…' : 'Archive'}
            </button>
          )}
        </div>
      </header>

      {error && <div className="ls-error">{error}</div>}
      {notice && <div className="ls-notice">{notice}</div>}
      {dirty && !error && <div className="ls-summary">Unsaved changes.</div>}

      <section className="ls-panel">
        <h2>The concept</h2>
        <label className="ls-field">
          <span>Title</span>
          <input value={title} onChange={e => { touch(); setTitle(e.target.value); }} placeholder="Loops" />
        </label>
        <label className="ls-field">
          <span>
            What a student is about to learn
            <em>Shown before the first step. Plain language, two or three sentences.</em>
          </span>
          <textarea value={description} onChange={e => { touch(); setDescription(e.target.value); }} />
        </label>
        <label className="ls-field">
          <span>
            Learning outcomes
            <em>One per line. What they will be able to do that they could not before.</em>
          </span>
          <textarea value={outcomes} onChange={e => { touch(); setOutcomes(e.target.value); }} rows={4} />
        </label>
      </section>

      {readiness && (
        <section className="ls-readiness">
          <h2>Readiness — {readiness.percent}%</h2>
          <div className="ls-bar"><span style={{ width: `${Math.min(100, readiness.percent)}%` }} /></div>
          <ul className="ls-checks">
            {readiness.checks.map(c => (
              <li
                key={c.key}
                className={`ls-check ${c.passed ? 'is-passed' : 'is-failed'} ${c.required ? '' : 'is-advisory'}`}
              >
                <span className="ls-mark">{c.passed ? '✓' : c.required ? '✕' : '!'}</span>
                <span>
                  {c.label}
                  {c.detail ? <> — <em>{c.detail}</em></> : null}
                  {!c.required && <em> (advisory)</em>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="ls-panel">
        <h2>The journey</h2>
        {steps.length === 0 ? (
          <div className="ls-empty">
            <p>No steps yet.</p>
            <p className="ls-muted">
              Start with a topic — the first thing a student should meet in this skill — and add
              the steps that teach it.
            </p>
            <button className="ls-btn is-primary" onClick={() => addStep()}>Add the first step</button>
          </div>
        ) : (
          <ul className="ls-steps">
            {steps.map((s, i) => {
              const prev = i > 0 ? steps[i - 1] : null;
              const topic = (s.topic || '').trim();
              const subtopic = (s.subtopic || '').trim();
              const newTopic = !prev || (prev.topic || '').trim() !== topic;
              const newSub = newTopic || (prev!.subtopic || '').trim() !== subtopic;
              const res = s.resourceId ? resourceById.get(s.resourceId) : undefined;
              const broken = needsResource(s.phase) && (!s.resourceId || !res);
              const isOpen = open === s.stepId;

              return (
                <React.Fragment key={s.stepId}>
                  {newTopic && (
                    <li className="ls-group-topic">
                      {topic
                        ? <input
                            className="ls-group-name"
                            value={s.topic || ''}
                            onChange={e => renameGroup({ topic }, e.target.value, 'topic')}
                            aria-label="Topic name"
                          />
                        : <span className="ls-group-untitled">Ungrouped steps — give them a topic below</span>}
                    </li>
                  )}
                  {newSub && subtopic && (
                    <li className="ls-group-subtopic">
                      <input
                        className="ls-group-name"
                        value={s.subtopic || ''}
                        onChange={e => renameGroup({ topic, subtopic }, e.target.value, 'subtopic')}
                        aria-label="Subtopic name"
                      />
                    </li>
                  )}

                  <li className={`ls-step ${s.required ? '' : 'is-optional'} ${broken ? 'is-broken' : ''}`}>
                    <div className="ls-step-head">
                      <button className="ls-step-open" onClick={() => setOpen(isOpen ? null : s.stepId)}>
                        <span className="ls-seq">{s.sequence}</span>
                        <span className="ls-step-text">
                          <span className="ls-step-title">
                            {s.titleOverride || res?.title || PHASE_HINT[s.phase] || s.phase}
                          </span>
                          <span className="ls-step-meta">
                            {s.phase} · {s.estimatedMinutes} min
                            {s.required ? '' : ' · optional'}
                            {broken
                              ? ' · no content attached — a student would meet an empty step'
                              : res ? ` · ${res.resourceType}` : ''}
                          </span>
                        </span>
                      </button>
                      <span className="ls-step-tools">
                        <button className="ls-btn is-small" onClick={() => move(s.stepId, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                        <button className="ls-btn is-small" onClick={() => move(s.stepId, 1)} disabled={i === steps.length - 1} aria-label="Move down">↓</button>
                        <button className="ls-btn is-small" onClick={() => addStep(s.topic || '', s.subtopic || '', runEnd(i))} aria-label="Add a step here">+</button>
                        <button className="ls-btn is-small is-danger" onClick={() => remove(s.stepId)} aria-label="Remove step">✕</button>
                      </span>
                    </div>

                    {isOpen && (
                      <div className="ls-step-body">
                        <div className="ls-row">
                          <label className="ls-field">
                            <span>
                              Topic
                              <em>The part of the skill this belongs to — “For loops”.</em>
                            </span>
                            <input
                              value={s.topic || ''}
                              onChange={e => patch(s.stepId, { topic: e.target.value })}
                              list="ls-topics"
                              placeholder="For loops"
                            />
                          </label>
                          <label className="ls-field">
                            <span>
                              Subtopic
                              <em>The idea inside it — “Counting with range”. Optional.</em>
                            </span>
                            <input
                              value={s.subtopic || ''}
                              onChange={e => patch(s.stepId, { subtopic: e.target.value })}
                              placeholder="Counting with range"
                            />
                          </label>
                        </div>

                        <div className="ls-row">
                          <label className="ls-field ls-narrow">
                            <span>Phase</span>
                            <select value={s.phase} onChange={e => patch(s.stepId, { phase: e.target.value as any })}>
                              {LEARNING_PHASES.map(p => (
                                <option key={p} value={p}>{p} — {PHASE_HINT[p]}</option>
                              ))}
                            </select>
                          </label>
                          <label className="ls-field ls-narrow">
                            <span>Minutes</span>
                            <input
                              type="number" min={0} max={600}
                              value={s.estimatedMinutes}
                              onChange={e => patch(s.stepId, { estimatedMinutes: Number(e.target.value) || 0 })}
                            />
                          </label>
                          <label className="ls-field">
                            <span>
                              Content
                              {needsResource(s.phase)
                                ? <em>A resource already mapped to {skillKey}.</em>
                                : <em>A CHECK step routes to the assessment; it needs no resource.</em>}
                            </span>
                            <select
                              value={s.resourceId || ''}
                              onChange={e => patch(s.stepId, { resourceId: e.target.value })}
                            >
                              <option value="">— none —</option>
                              {(detail?.resources || []).map(r => (
                                <option key={r.id} value={r.id}>
                                  {r.title} ({r.resourceType}){r.hasContent ? '' : ' — empty'}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <label className="ls-field">
                          <span>
                            Title shown to the student
                            <em>Leave empty to use the resource’s own title.</em>
                          </span>
                          <input
                            value={s.titleOverride || ''}
                            onChange={e => patch(s.stepId, { titleOverride: e.target.value })}
                            placeholder={res?.title || ''}
                          />
                        </label>

                        <label className="ls-check-box">
                          <input
                            type="checkbox"
                            checked={s.required !== false}
                            onChange={e => patch(s.stepId, { required: e.target.checked })}
                          />
                          <span>
                            Required to finish the skill
                            <br />
                            <em>Optional steps are offered but never block completion.</em>
                          </span>
                        </label>

                        <div className="ls-row">
                          <label className="ls-field ls-narrow">
                            <span>
                              Only if score ≥
                              <em>Leave blank for everyone.</em>
                            </span>
                            <input
                              type="number" min={0} max={100}
                              value={s.scoreWindow?.min ?? ''}
                              onChange={e => patch(s.stepId, {
                                scoreWindow: {
                                  min: e.target.value === '' ? null : Number(e.target.value),
                                  max: s.scoreWindow?.max ?? null,
                                },
                              })}
                            />
                          </label>
                          <label className="ls-field ls-narrow">
                            <span>
                              Only if score ≤
                              <em>How a strong student skips the basics.</em>
                            </span>
                            <input
                              type="number" min={0} max={100}
                              value={s.scoreWindow?.max ?? ''}
                              onChange={e => patch(s.stepId, {
                                scoreWindow: {
                                  min: s.scoreWindow?.min ?? null,
                                  max: e.target.value === '' ? null : Number(e.target.value),
                                },
                              })}
                            />
                          </label>
                        </div>

                        <label className="ls-field">
                          <span>
                            Notes for whoever edits this next
                            <em>Never shown to a student.</em>
                          </span>
                          <textarea
                            value={s.notes || ''}
                            onChange={e => patch(s.stepId, { notes: e.target.value })}
                            rows={2}
                          />
                        </label>
                      </div>
                    )}
                  </li>
                </React.Fragment>
              );
            })}
          </ul>
        )}

        {/* Existing topic names, so the second step of a topic is chosen rather than retyped —
            free-text grouping splits on a typo, and a split topic is invisible until a student
            meets it. */}
        <datalist id="ls-topics">
          {Array.from(new Set(steps.map(s => (s.topic || '').trim()).filter(Boolean)))
            .map(t => <option key={t} value={t} />)}
        </datalist>

        {steps.length > 0 && (
          <div className="ls-actions">
            <button className="ls-btn" onClick={() => addStep()}>Add a step</button>
            <button
              className="ls-btn"
              onClick={() => addStep(steps[steps.length - 1].topic || '', steps[steps.length - 1].subtopic || '')}
            >
              Add to “{(steps[steps.length - 1].topic || '').trim() || 'the last topic'}”
            </button>
          </div>
        )}
      </section>

      {(detail?.versions || []).length > 0 && (
        <div className="ls-versions">
          <span>History:</span>
          {detail!.versions.map(v => (
            <span key={v.id}>v{v.version} {v.status.toLowerCase()}</span>
          ))}
        </div>
      )}

      {(detail?.resources || []).length === 0 && (
        /**
         * A journey is assembled from resources mapped to this skill. With none, every step
         * would be empty, so the screen says where the work actually starts rather than letting
         * somebody author fourteen steps that teach nothing.
         */
        <div className="ls-empty">
          <p>No content is mapped to {skillKey} yet.</p>
          <p className="ls-muted">
            Map videos, notes and practice to this skill in the content library first — steps
            attach to what is already there.
          </p>
        </div>
      )}
    </div>
  );
};

export default ConceptEditor;
