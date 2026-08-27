import React from 'react';
import {
  AudienceOptions, MaterialAudience, MaterialBody, emptyAudience, emptyBody,
} from '../../api/passportApi';

/**
 * The material editor.
 *
 * Split out of AdminConcepts because it is the long half, and because "what a material
 * contains" and "which concept am I looking at" are two different questions an admin asks
 * at different moments.
 *
 * THE FORM IS LONG ON PURPOSE. A material has to carry enough for a student to act without
 * asking anybody: what it is, why it matters, the steps with their commands and expected
 * output, the terms broken down, and a check with its answer. The alternative — a title and
 * one line of detail — is exactly what the mission pool already had, and it is why a
 * mission saying "Install Postman" had nowhere to explain how.
 *
 * SECTIONS COLLAPSE, TARGETING DOES NOT. Everything about content is optional and folded
 * away; who the material reaches is always visible, because an audience left wrong is
 * silent — nobody reports material they were never shown.
 */

const TYPES: { v: string; label: string; hint: string }[] = [
  { v: 'note',     label: 'Notes',           hint: 'Written material with steps, breakdowns and checks.' },
  { v: 'video',    label: 'Video',           hint: 'A video URL, plus any notes around it.' },
  { v: 'link',     label: 'Link',            hint: 'Points at something outside the product.' },
  { v: 'research',  label: 'Research',        hint: 'Reading to go deeper. Same body as notes.' },
  { v: 'practice', label: 'Practice Lab',    hint: 'An existing Practice Lab item, by its id.' },
  { v: 'problem',  label: 'Coding problem',  hint: 'A problem from the shared bank, by its id.' },
  { v: 'mock_interview', label: 'Mock interview', hint: 'Sends the member to an interview round.' },
];

/** Types whose content is written here rather than picked from a catalogue. */
const MATERIAL_TYPES = ['note', 'video', 'link', 'research'];
/** Types that name an existing item instead of carrying content. */
const CATALOGUE_TYPES = ['practice', 'problem'];

const WORK_TYPES: { v: string; help: string }[] = [
  { v: 'LEARN',    help: 'Teaches it. A plan asking a member to LEARN with none of these strands them.' },
  { v: 'PRACTICE', help: 'Applies it — something to do, build or solve.' },
  { v: 'ASSESS',   help: 'Measures it. Skill checks are built in, so this is rarely needed here.' },
  { v: 'REVIEW',   help: 'Refreshes it later, once it has been learned.' },
];

export interface Draft {
  id: string;
  resourceType: string;
  resourceId: string;
  title: string;
  description: string;
  url: string;
  fileKey: string;
  language: string;
  workTypes: string[];
  audience: MaterialAudience;
  scoreWindow: { min: number | null; max: number | null };
  body: MaterialBody;
  priority: number;
  active: boolean;
}

export const blankDraft = (): Draft => ({
  id: '', resourceType: 'note', resourceId: '', title: '', description: '',
  url: '', fileKey: '', language: '', workTypes: ['LEARN'],
  audience: emptyAudience(),
  scoreWindow: { min: null, max: null },
  body: emptyBody(), priority: 100, active: true,
});

const num = (v: string): number | null => (v === '' ? null : (Number.isFinite(Number(v)) ? Number(v) : null));

interface Props {
  draft: Draft;
  patch: (fn: (d: Draft) => void) => void;
  options: AudienceOptions | null;
  busy: boolean;
  onSave: () => void;
  onCancel: () => void;
}

const MaterialForm: React.FC<Props> = ({ draft, patch, options, busy, onSave, onCancel }) => {
  const isMaterial = MATERIAL_TYPES.includes(draft.resourceType);
  const isCatalogue = CATALOGUE_TYPES.includes(draft.resourceType);
  const type = TYPES.find(t => t.v === draft.resourceType);

  const toggleWork = (w: string) => patch(d => {
    d.workTypes = d.workTypes.includes(w)
      ? d.workTypes.filter(x => x !== w)
      : [...d.workTypes, w];
  });

  return (
    <div className="cbf">
      <div className="cbf-head">
        <b>{draft.id ? 'Edit material' : 'New material'}</b>
        <label className="cbf-active">
          <input
            type="checkbox" checked={draft.active}
            onChange={e => patch(d => { d.active = e.target.checked; })} />
          Active
        </label>
      </div>

      {/* ── what kind ─────────────────────────────────────────────── */}
      <div className="cbf-sec">
        <span className="cbf-lbl">Type</span>
        <div className="cbf-types">
          {TYPES.map(t => (
            <button
              key={t.v} type="button"
              className={`cbf-type${draft.resourceType === t.v ? ' on' : ''}`}
              onClick={() => patch(d => { d.resourceType = t.v; })}>
              {t.label}
            </button>
          ))}
        </div>
        {type && <span className="cbf-hint">{type.hint}</span>}
      </div>

      {/* ── identity ──────────────────────────────────────────────── */}
      <div className="cbf-grid">
        <label>
          <span>Title{isMaterial ? ' *' : ''}</span>
          <input
            value={draft.title}
            placeholder="The four HTTP methods"
            onChange={e => patch(d => { d.title = e.target.value; })} />
        </label>
        <label>
          <span>Language</span>
          <input
            value={draft.language} placeholder="java, python, sql…"
            onChange={e => patch(d => { d.language = e.target.value; })} />
        </label>
      </div>

      <label className="cbf-full">
        <span>One-line description</span>
        <input
          value={draft.description}
          placeholder="What the student gets out of this."
          onChange={e => patch(d => { d.description = e.target.value; })} />
      </label>

      {isCatalogue && (
        <label className="cbf-full">
          <span>Item id *</span>
          <input
            value={draft.resourceId}
            placeholder={draft.resourceType === 'problem' ? 'db:… or a built-in id' : 'c-even-odd'}
            onChange={e => patch(d => { d.resourceId = e.target.value; })} />
          <em className="cbf-hint">
            Checked when you save — a mapping that points at something deleted is refused
            rather than becoming a Start button that opens nothing.
          </em>
        </label>
      )}

      {isMaterial && (
        <label className="cbf-full">
          <span>Link {draft.resourceType === 'link' ? '*' : '(optional)'}</span>
          <input
            value={draft.url} placeholder="https://…"
            onChange={e => patch(d => { d.url = e.target.value; })} />
        </label>
      )}

      {/* ── work types ────────────────────────────────────────────── */}
      <div className="cbf-sec">
        <span className="cbf-lbl">What kind of work is this? *</span>
        <div className="cbf-works">
          {WORK_TYPES.map(w => (
            <button
              key={w.v} type="button"
              className={`cbf-work${draft.workTypes.includes(w.v) ? ' on' : ''}`}
              onClick={() => toggleWork(w.v)}
              title={w.help}>
              {w.v}
            </button>
          ))}
        </div>
        <span className="cbf-hint">
          {WORK_TYPES.find(w => draft.workTypes.includes(w.v))?.help
            || 'Pick at least one, or the plan has no slot to serve this in.'}
        </span>
      </div>

      {/* ── content ───────────────────────────────────────────────── */}
      {isMaterial && (
        <>
          <details className="cbf-fold" open>
            <summary>Content — what the student reads</summary>

            <label className="cbf-full">
              <span>Overview</span>
              <textarea
                rows={3} value={draft.body.overview || ''}
                placeholder="Why this matters, in a paragraph."
                onChange={e => patch(d => { d.body.overview = e.target.value; })} />
            </label>

            <label className="cbf-full">
              <span>Notes</span>
              <textarea
                rows={7} value={draft.body.notes || ''}
                placeholder="The written material. Line breaks are kept."
                onChange={e => patch(d => { d.body.notes = e.target.value; })} />
            </label>

            <div className="cbf-grid">
              <label>
                <span>Video URL</span>
                <input
                  value={draft.body.videoUrl || ''} placeholder="https://…"
                  onChange={e => patch(d => { d.body.videoUrl = e.target.value; })} />
              </label>
              <label>
                <span>Uploaded video key</span>
                <input
                  value={draft.body.videoKey || ''} placeholder="(needs tenant storage)"
                  onChange={e => patch(d => { d.body.videoKey = e.target.value; })} />
              </label>
            </div>
            <span className="cbf-hint">
              A URL works today. Uploads need BUNNY_STORAGE_ZONE and BUNNY_STORAGE_ACCESSKEY
              set in Platform Settings — until then an uploaded key resolves to nothing.
            </span>
          </details>

          {/* steps */}
          <details className="cbf-fold">
            <summary>Steps to follow ({(draft.body.steps || []).length})</summary>
            <p className="cbf-hint">
              Numbered actions. Each carries its own command and what the student should see
              if it worked — the difference between &ldquo;done&rdquo; and &ldquo;I think so&rdquo;.
            </p>
            {(draft.body.steps || []).map((s, i) => (
              <div className="cbf-row" key={i}>
                <div className="cbf-grid">
                  <label>
                    <span>Step {i + 1} title</span>
                    <input
                      value={s.title} placeholder="Install Postman"
                      onChange={e => patch(d => { d.body.steps[i].title = e.target.value; })} />
                  </label>
                  <label>
                    <span>Command</span>
                    <input
                      value={s.command || ''} placeholder="curl https://api.example.com/users"
                      onChange={e => patch(d => { d.body.steps[i].command = e.target.value; })} />
                  </label>
                </div>
                <label className="cbf-full">
                  <span>What to do</span>
                  <textarea
                    rows={2} value={s.detail}
                    onChange={e => patch(d => { d.body.steps[i].detail = e.target.value; })} />
                </label>
                <label className="cbf-full">
                  <span>Expected output</span>
                  <textarea
                    rows={2} value={s.expectedOutput || ''}
                    placeholder="200 OK with a JSON array"
                    onChange={e => patch(d => { d.body.steps[i].expectedOutput = e.target.value; })} />
                </label>
                <button
                  type="button" className="cbf-del"
                  onClick={() => patch(d => { d.body.steps.splice(i, 1); })}>
                  Remove step
                </button>
              </div>
            ))}
            <button
              type="button" className="cbf-add"
              onClick={() => patch(d => {
                d.body.steps.push({ title: '', detail: '', command: '', expectedOutput: '' });
              })}>
              + Add step
            </button>
          </details>

          {/* breakdown */}
          <details className="cbf-fold">
            <summary>Term breakdown ({(draft.body.breakdown || []).length})</summary>
            <p className="cbf-hint">
              One row per term. The four HTTP methods are four of these.
            </p>
            {(draft.body.breakdown || []).map((b, i) => (
              <div className="cbf-row" key={i}>
                <div className="cbf-grid">
                  <label>
                    <span>Term</span>
                    <input
                      value={b.term} placeholder="GET"
                      onChange={e => patch(d => { d.body.breakdown[i].term = e.target.value; })} />
                  </label>
                  <label>
                    <span>Example</span>
                    <input
                      value={b.example || ''} placeholder="GET /users/42"
                      onChange={e => patch(d => { d.body.breakdown[i].example = e.target.value; })} />
                  </label>
                </div>
                <label className="cbf-full">
                  <span>Explanation</span>
                  <textarea
                    rows={2} value={b.explanation}
                    placeholder="Reads data. Safe to repeat — it changes nothing."
                    onChange={e => patch(d => { d.body.breakdown[i].explanation = e.target.value; })} />
                </label>
                <button
                  type="button" className="cbf-del"
                  onClick={() => patch(d => { d.body.breakdown.splice(i, 1); })}>
                  Remove term
                </button>
              </div>
            ))}
            <button
              type="button" className="cbf-add"
              onClick={() => patch(d => { d.body.breakdown.push({ term: '', explanation: '', example: '' }); })}>
              + Add term
            </button>
          </details>

          {/* checks */}
          <details className="cbf-fold">
            <summary>Check questions ({(draft.body.checks || []).length})</summary>
            <p className="cbf-hint">
              A question with its answer, so a student can check themselves before marking
              anything done. The answer stays hidden until they ask for it.
            </p>
            {(draft.body.checks || []).map((c, i) => (
              <div className="cbf-row" key={i}>
                <label className="cbf-full">
                  <span>Question</span>
                  <input
                    value={c.question} placeholder="Which method should never change data?"
                    onChange={e => patch(d => { d.body.checks[i].question = e.target.value; })} />
                </label>
                <label className="cbf-full">
                  <span>Answer</span>
                  <textarea
                    rows={2} value={c.answer}
                    onChange={e => patch(d => { d.body.checks[i].answer = e.target.value; })} />
                </label>
                <button
                  type="button" className="cbf-del"
                  onClick={() => patch(d => { d.body.checks.splice(i, 1); })}>
                  Remove question
                </button>
              </div>
            ))}
            <button
              type="button" className="cbf-add"
              onClick={() => patch(d => { d.body.checks.push({ question: '', answer: '' }); })}>
              + Add question
            </button>
          </details>

          {/* references */}
          <details className="cbf-fold">
            <summary>Further reading ({(draft.body.references || []).length})</summary>
            {(draft.body.references || []).map((r, i) => (
              <div className="cbf-row" key={i}>
                <div className="cbf-grid">
                  <label>
                    <span>Label</span>
                    <input
                      value={r.label} placeholder="MDN — HTTP methods"
                      onChange={e => patch(d => { d.body.references[i].label = e.target.value; })} />
                  </label>
                  <label>
                    <span>URL</span>
                    <input
                      value={r.url} placeholder="https://…"
                      onChange={e => patch(d => { d.body.references[i].url = e.target.value; })} />
                  </label>
                </div>
                <button
                  type="button" className="cbf-del"
                  onClick={() => patch(d => { d.body.references.splice(i, 1); })}>
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button" className="cbf-add"
              onClick={() => patch(d => { d.body.references.push({ label: '', url: '' }); })}>
              + Add reference
            </button>
          </details>
        </>
      )}

      {/* ── targeting ─────────────────────────────────────────────── */}
      <div className="cbf-target">
        <b>Who gets this?</b>
        <p className="cbf-hint">
          Leave an axis empty and it does not narrow anything. Values within one axis are
          OR&rsquo;d; different axes are AND&rsquo;d — so Year <i>2nd</i> plus Branch
          <i> CSE</i> means second-year CSE members only.
        </p>

        <AxisPicker
          label="Year of study" values={draft.audience.years} options={options?.years}
          onChange={v => patch(d => { d.audience.years = v; })} />
        <AxisPicker
          label="Course" values={draft.audience.courses} options={options?.courses}
          onChange={v => patch(d => { d.audience.courses = v; })} />
        <AxisPicker
          label="Branch" values={draft.audience.branches} options={options?.branches}
          onChange={v => patch(d => { d.audience.branches = v; })} />
        <AxisPicker
          label="Target role" values={draft.audience.roles} options={options?.roles}
          onChange={v => patch(d => { d.audience.roles = v; })} />
        <AxisPicker
          label="Preferred language" values={draft.audience.languages} options={options?.languages}
          onChange={v => patch(d => { d.audience.languages = v; })} />
        <AxisPicker
          label="Career stage" values={draft.audience.stages} options={options?.stages}
          onChange={v => patch(d => { d.audience.stages = v; })} />

        <div className="cbf-window">
          <span className="cbf-lbl">Only when their score on this concept is…</span>
          <div className="cbf-winrow">
            <label>
              <span>at least</span>
              <input
                type="number" min={0} max={100} value={draft.scoreWindow.min ?? ''}
                placeholder="0"
                onChange={e => patch(d => { d.scoreWindow.min = num(e.target.value); })} />
            </label>
            <label>
              <span>at most</span>
              <input
                type="number" min={0} max={100} value={draft.scoreWindow.max ?? ''}
                placeholder="100"
                onChange={e => patch(d => { d.scoreWindow.max = num(e.target.value); })} />
            </label>
          </div>
          <span className="cbf-hint">
            This is the weakness filter: a remedial explainer set to <i>at most 50</i> stops
            being offered once they improve. A member who has never been assessed on this
            concept still sees it — hiding material from someone with no score would starve
            them exactly when they have least to go on.
          </span>
        </div>
      </div>

      <div className="cbf-foot">
        <button className="cbf-save" disabled={busy} onClick={onSave}>
          {busy ? 'Saving…' : 'Save material'}
        </button>
        <button className="cbf-cancel" disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};

/**
 * One targeting axis.
 *
 * Known values are offered as toggles because an admin should not have to remember whether
 * the data says "2nd Year" or "Second Year" — a typo here does not error, it silently
 * narrows the audience to nobody. Free text stays available for a value that has no member
 * yet, which is a legitimate thing to target ahead of time.
 */
const AxisPicker: React.FC<{
  label: string;
  values: string[];
  options?: string[];
  onChange: (v: string[]) => void;
}> = ({ label, values, options, onChange }) => {
  const [text, setText] = React.useState('');

  const toggle = (v: string) =>
    onChange(values.includes(v) ? values.filter(x => x !== v) : [...values, v]);

  const addFree = () => {
    const v = text.trim();
    if (!v) return;
    if (!values.some(x => x.toLowerCase() === v.toLowerCase())) onChange([...values, v]);
    setText('');
  };

  const extras = values.filter(v => !(options || []).some(o => o.toLowerCase() === v.toLowerCase()));

  return (
    <div className="cbf-axis">
      <span className="cbf-lbl">
        {label}
        {!values.length && <em className="cbf-any">everyone</em>}
      </span>
      <div className="cbf-chips">
        {(options || []).map(o => (
          <button
            key={o} type="button"
            className={`cbf-chip${values.includes(o) ? ' on' : ''}`}
            onClick={() => toggle(o)}>
            {o}
          </button>
        ))}
        {extras.map(o => (
          <button
            key={o} type="button" className="cbf-chip on custom"
            onClick={() => toggle(o)} title="Not seen on any member yet">
            {o}
          </button>
        ))}
      </div>
      <div className="cbf-free">
        <input
          value={text} placeholder="Add another…"
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFree(); } }} />
        <button type="button" onClick={addFree}>Add</button>
      </div>
    </div>
  );
};

export default MaterialForm;
