/**
 * The journey editor for one concept.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It does not edit content. The Concept Bank's material form
 * already handles notes, videos, attachments, steps, term breakdowns and self-checks, and
 * rebuilding any of that here would fork the editor — two places to fix a bug, and authors
 * wondering which one is authoritative. A step points at a resource; editing that resource is
 * a link away.
 *
 * SAVING NEVER TOUCHES A LIVE JOURNEY. The server forks a DRAFT when the concept is published,
 * so reordering steps at four in the afternoon does not reorder them underneath the students
 * working through them. Publishing is the separate, deliberate act that makes a draft live.
 *
 * REORDERING IS MOVE UP / MOVE DOWN. Drag-and-drop would need a dependency this app does not
 * carry, for an interaction used on lists of six.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import passportApi, { LearningUnit, LearningStep, UnitReadiness, StudioResource } from '../../api/passportApi';
import './learningStudio.css';

const PHASES = ['UNDERSTAND', 'LEARN', 'TRY', 'PRACTICE', 'CHECK', 'APPLY', 'REVIEW'] as const;
const PHASE_HINT: Record<string, string> = {
  UNDERSTAND: 'First contact — why this matters',
  LEARN: 'The substance',
  TRY: 'Guided, with the answer visible',
  PRACTICE: 'On their own',
  CHECK: 'Measured — becomes evidence',
  APPLY: 'A larger piece using several ideas',
  REVIEW: 'Consolidation, later',
};
const PHASE_WORK: Record<string, string> = {
  UNDERSTAND: 'LEARN', LEARN: 'LEARN', TRY: 'PRACTICE', PRACTICE: 'PRACTICE',
  CHECK: 'ASSESS', APPLY: 'PRACTICE', REVIEW: 'REVIEW',
};

/**
 * A new step inherits the grouping of the one above it.
 *
 * Adding the practice that follows a worked example is the common case, and retyping both
 * labels each time is how free-text grouping ends up split across three spellings.
 */
const blankStep = (sequence: number, topic = '', subtopic = ''): LearningStep => ({
  stepId: '', sequence, phase: 'LEARN', resourceId: '', titleOverride: '',
  estimatedMinutes: 15, required: true, topic, subtopic,
});

const AdminLearningUnit: React.FC = () => {
  const { skillKey = '' } = useParams();
  const nav = useNavigate();

  const [skill, setSkill] = useState<any>(null);
  const [unit, setUnit] = useState<LearningUnit | null>(null);
  const [steps, setSteps] = useState<LearningStep[]>([]);
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [resources, setResources] = useState<StudioResource[]>([]);
  const [readiness, setReadiness] = useState<UnitReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const r = await passportApi.learningUnitBySkill(skillKey);
      setSkill(r.skill);
      setUnit(r.unit);
      setResources(r.resources);
      setReadiness(r.readiness);
      setTitle(r.unit?.title || r.skill?.name || skillKey);
      setDescription(r.unit?.description || '');
      setOutcomes(r.unit?.learningOutcomes?.length ? r.unit.learningOutcomes : ['']);
      setSteps((r.unit?.steps || []).slice().sort((a, b) => a.sequence - b.sequence));
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not load this concept.');
    } finally { setLoading(false); }
  }, [skillKey]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setBusy(true); setErr(''); setMsg('');
    try {
      const r = await passportApi.saveLearningUnit(skillKey, {
        title, description,
        learningOutcomes: outcomes.filter(o => o.trim()),
        /**
         * Sent back unchanged because the server REBUILDS a unit from the request body rather
         * than merging into the stored document. Omitting a field is not "leave it alone", it
         * is "clear it" — audience was being emptied and the completion threshold reset to 1
         * on every save, silently, showing up much later as a unit that would not close.
         */
        ...(unit?.audience ? { audience: unit.audience } : {}),
        ...(typeof unit?.completionThreshold === 'number'
          ? { completionThreshold: unit.completionThreshold } : {}),
        steps: steps.map((s, i) => ({ ...s, sequence: i + 1 })),
      });
      setUnit(r.unit); setReadiness(r.readiness);
      setSteps(r.unit.steps.slice().sort((a, b) => a.sequence - b.sequence));
      setMsg('Saved as a draft. Publishing is what makes it live.');
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not save.');
    } finally { setBusy(false); }
  };

  const publish = async () => {
    if (!unit?._id) { setErr('Save the journey first.'); return; }
    setBusy(true); setErr(''); setMsg('');
    try {
      const r = await passportApi.publishLearningUnit(unit._id);
      if (!r.published) { setErr(r.message || 'Not ready to publish.'); setReadiness(r.readiness); return; }
      setMsg(`Published as version ${r.version}. Students will meet this journey from their next mission.`);
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not publish.');
    } finally { setBusy(false); }
  };

  const patchStep = (i: number, patch: Partial<LearningStep>) =>
    setSteps(list => list.map((s, n) => (n === i ? { ...s, ...patch } : s)));

  const move = (i: number, by: number) => setSteps(list => {
    const next = list.slice();
    const j = i + by;
    if (j < 0 || j >= next.length) return list;
    [next[i], next[j]] = [next[j], next[i]];
    return next.map((s, n) => ({ ...s, sequence: n + 1 }));
  });

  if (loading) return <div className="lst-page"><div className="lst-empty">Loading…</div></div>;

  return (
    <div className="lst-page">
      <button className="lst-back" onClick={() => nav('/admin/passport/learning-studio')}>
        <i className="bi bi-arrow-left" /> Learning Studio
      </button>

      <header className="lst-head">
        <div>
          <span className="lst-kicker">CONCEPT JOURNEY</span>
          <h1>{skill?.name || skillKey}</h1>
          <p>{skillKey}{unit ? ` · version ${unit.version} · ${unit.status}` : ' · no journey yet'}</p>
        </div>
        <div className="lst-head-actions">
          <button className="lst-btn" onClick={save} disabled={busy}>Save draft</button>
          <button className="lst-btn primary" onClick={publish} disabled={busy || !unit?._id}>Publish</button>
        </div>
      </header>

      {err && <div className="lst-msg err">{err}</div>}
      {msg && <div className="lst-msg ok">{msg}</div>}

      <div className="lst-editor">
        <section className="lst-main">
          <div className="lst-card">
            <h3>Overview</h3>
            <label>Title <input value={title} onChange={e => setTitle(e.target.value)} /></label>
            <label>Description
              <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
                        placeholder="What this concept covers, in a sentence." />
            </label>
          </div>

          <div className="lst-card">
            <h3>Learning outcomes</h3>
            <p className="lst-hint">What the student can do afterwards. Required before publishing.</p>
            {outcomes.map((o, i) => (
              <div className="lst-outcome" key={i}>
                <input value={o} placeholder="Explain classes and objects"
                       onChange={e => setOutcomes(l => l.map((x, n) => (n === i ? e.target.value : x)))} />
                <button onClick={() => setOutcomes(l => l.filter((_, n) => n !== i))} title="Remove">×</button>
              </div>
            ))}
            <button className="lst-add" onClick={() => setOutcomes(l => [...l, ''])}>+ Add outcome</button>
          </div>

          <div className="lst-card">
            <h3>Student journey</h3>
            <p className="lst-hint">
              The order a student meets this concept in. Each step is served once — the mission
              engine remembers what they finished and moves on. Group the steps with a
              <b> topic</b> and a <b> subtopic</b> and the skill reads as a course rather than a
              list: <i>Loops → For loops → Counting with range</i>.
            </p>

            {!steps.length && <div className="lst-empty compact">No steps yet. Add the first one below.</div>}

            {steps.map((s, i) => {
              const res = resources.find(r => r.id === s.resourceId);
              const isCheck = s.phase === 'CHECK';
              /**
               * A heading whenever the grouping changes, so a fourteen-step journey reads as
               * sections. Nothing is reordered or nested — the list stays flat and the labels
               * are only dividers, which is why steps with no topic simply flow on.
               *
               * TWO LEVELS, BECAUSE A TOPIC IS NOT THE SMALLEST THING. Loops divides into for
               * loops and while loops; for loops divides again into the explanation, the
               * worked example and the practice. One level left an author staring at fourteen
               * steps under "Loops" unable to see where one ended and the next began.
               *
               * HEADINGS FOLLOW THE ORDER, THEY DO NOT IMPOSE ONE. A journey may teach for
               * loops, teach while loops, then come back to nested loops, and a revisited
               * topic prints its heading again rather than being gathered up out of sequence.
               */
              const prev = steps[i - 1];
              const startsTopic = !!s.topic && s.topic !== (prev?.topic || '');
              const startsSub = !!s.subtopic
                && (startsTopic || s.subtopic !== (prev?.subtopic || ''));
              return (
                <React.Fragment key={s.stepId || i}>
                {startsTopic && <div className="lst-topic"><span>{s.topic}</span></div>}
                {startsSub && <div className="lst-subtopic"><span>{s.subtopic}</span></div>}
                <div className="lst-step">
                  <span className="lst-seq">{String(i + 1).padStart(2, '0')}</span>
                  <div className="lst-step-body">
                    <div className="lst-step-row">
                      <label>Phase
                        <select value={s.phase} onChange={e => patchStep(i, { phase: e.target.value })}>
                          {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </label>
                      <label>Resource
                        <select value={s.resourceId || ''} onChange={e => patchStep(i, { resourceId: e.target.value })}>
                          <option value="">{isCheck ? '— skill check (no resource needed) —' : '— pick a resource —'}</option>
                          {resources.map(r => (
                            <option key={r.id} value={r.id}>{r.title} · {r.resourceType}</option>
                          ))}
                        </select>
                      </label>
                      <label>Minutes
                        <input type="number" min={0} max={600} value={s.estimatedMinutes}
                               onChange={e => patchStep(i, { estimatedMinutes: Number(e.target.value) })} />
                      </label>
                      <label className="lst-check">
                        <input type="checkbox" checked={s.required !== false}
                               onChange={e => patchStep(i, { required: e.target.checked })} />
                        Required
                      </label>
                    </div>
                    <div className="lst-step-foot">
                      <input className="lst-topic-input" value={s.topic || ''} list="lst-topics"
                             placeholder="topic, e.g. For loops"
                             onChange={e => patchStep(i, { topic: e.target.value })} />
                      <input className="lst-topic-input" value={s.subtopic || ''} list="lst-subtopics"
                             placeholder="subtopic, e.g. Counting with range"
                             onChange={e => patchStep(i, { subtopic: e.target.value })} />
                      <span className="lst-tag">{PHASE_WORK[s.phase]}</span>
                      <span className="lst-hint-inline">{PHASE_HINT[s.phase]}</span>
                      {!isCheck && !s.resourceId && <span className="lst-warn">No resource — this step opens nothing</span>}
                      {s.resourceId && !res && <span className="lst-warn">Resource not in this concept</span>}
                    </div>
                  </div>
                  <div className="lst-step-actions">
                    <button onClick={() => move(i, -1)} disabled={i === 0} title="Move up"><i className="bi bi-chevron-up" /></button>
                    <button onClick={() => move(i, 1)} disabled={i === steps.length - 1} title="Move down"><i className="bi bi-chevron-down" /></button>
                    <button onClick={() => setSteps(l => l.filter((_, n) => n !== i))} title="Remove">×</button>
                  </div>
                </div>
                </React.Fragment>
              );
            })}

            {/* The names already in use, so the second step of a topic is chosen rather than
                retyped. Free-text grouping splits on a typo, and a split topic is invisible
                until a student meets it. */}
            <datalist id="lst-topics">
              {[...new Set(steps.map(x => (x.topic || '').trim()).filter(Boolean))]
                .map(t => <option key={t} value={t} />)}
            </datalist>
            <datalist id="lst-subtopics">
              {[...new Set(steps.map(x => (x.subtopic || '').trim()).filter(Boolean))]
                .map(t => <option key={t} value={t} />)}
            </datalist>

            <button className="lst-add" onClick={() => setSteps(l => [...l, blankStep(
              l.length + 1, l[l.length - 1]?.topic || '', l[l.length - 1]?.subtopic || '',
            )])}>
              + Add step
            </button>
          </div>
        </section>

        <aside className="lst-side">
          <div className="lst-card">
            <h3>Readiness</h3>
            {!readiness ? <p className="lst-hint">Save the journey to see its checks.</p> : (
              <>
                <div className="lst-ready">
                  <b className={readiness.publishable ? 'ok' : ''}>{readiness.percent}%</b>
                  <span>{readiness.publishable ? 'Can be published' : 'Not publishable yet'}</span>
                </div>
                <ul className="lst-checks">
                  {readiness.checks.map(c => (
                    <li key={c.key} className={c.passed ? 'pass' : c.required ? 'fail' : 'warn'}>
                      <i className={`bi ${c.passed ? 'bi-check-lg' : c.required ? 'bi-x-lg' : 'bi-dash'}`} />
                      <span><b>{c.label}</b><small>{c.detail}</small></span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="lst-card">
            <h3>Content for this concept</h3>
            <p className="lst-hint">
              Steps reference these. Add or edit material in the Concept Bank — this editor
              sequences it rather than duplicating the editor.
            </p>
            {!resources.length
              ? <p className="lst-hint">Nothing mapped yet.</p>
              : <ul className="lst-res">
                  {resources.map(r => (
                    <li key={r.id}>
                      <b>{r.title}</b>
                      <small>{r.resourceType}{r.hasContent ? '' : ' · empty'}</small>
                    </li>
                  ))}
                </ul>}
            <button className="lst-add" onClick={() => nav('/admin/passport/concepts')}>
              Open Concept Bank →
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AdminLearningUnit;
