import React, { useCallback, useEffect, useState } from 'react';
import passportApi, {
  StageCurriculumView, StageModuleNode, StageTopicNode, StageSkillNode, StageTopicInput,
} from '../../api/passportApi';
import './adminStageCurriculum.css';

/**
 * One stage, whole: what it teaches and what it can actually measure.
 *
 * THE QUESTION THIS SCREEN ANSWERS. The curriculum and the stage skill set lived on separate
 * screens with nothing joining them, so "Web Fundamentals teaches six skills and none of them
 * can be assessed" was a fact you could only reach by opening both and comparing by hand. That
 * gap is where the product silently stops working: a module whose skills carry no questions is
 * taught and never measured, the plan cannot personalise around it, and nothing says so.
 *
 * QUESTION COUNTS ARE PER DIFFICULTY. A skill with eighteen medium questions and no easy ones
 * cannot fill an easy slot, and a total of eighteen hides that completely — so every skill shows
 * its bands, which is what the generator actually draws on.
 *
 * DAYS ARE NOT EDITABLE HERE, DELIBERATELY. Every topic occupies a span the planner reads, and
 * they are recomputed from module and topic order on every save. Letting them be typed means one
 * transposed number produces a plan with a gap or an overlap that nothing reports.
 */

const DEPTHS = ['FOUNDATION', 'GUIDED', 'STANDARD', 'REVISION', 'CHALLENGE'];

/** A skill's question bands, and whether there are enough of them to measure it. */
const SkillChip: React.FC<{ skill: StageSkillNode; floor: number }> = ({ skill, floor }) => {
  const q = skill.questions;
  const why = !skill.active ? 'switched off in the taxonomy'
    : !skill.assessable ? 'not assessable — no paper can ask about it'
      : q.total === 0 ? 'no questions at all'
        : `only ${q.total} question${q.total === 1 ? '' : 's'}, this stage needs ${floor}`;

  return (
    <div className={`asc-skill${skill.measurable ? '' : ' gap'}`}>
      <div className="asc-skill-id">
        <b>{skill.skillName}</b>
        <code>{skill.skillKey}</code>
      </div>
      <div className="asc-bands" title={skill.measurable ? `${q.total} distinct questions` : why}>
        <span className={q.easy ? '' : 'zero'}>easy {q.easy}</span>
        <span className={q.medium ? '' : 'zero'}>med {q.medium}</span>
        <span className={q.hard ? '' : 'zero'}>hard {q.hard}</span>
      </div>
      {!skill.measurable && <em className="asc-why">{why}</em>}
      {skill.measurable && !skill.inStageSet && (
        <em className="asc-why">has questions but is not in the stage's skill set</em>
      )}
    </div>
  );
};

const AdminStageCurriculum: React.FC = () => {
  const [stages, setStages] = useState<{ key: string; label: string; who: string }[]>([]);
  const [stage, setStage] = useState('foundation');
  const [view, setView] = useState<StageCurriculumView | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  /** Which topic is open for editing, and the draft being edited. */
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<StageTopicInput>({});
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newModule, setNewModule] = useState<{ code: string; name: string } | null>(null);

  const say = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 5000); };

  const load = useCallback((s: string) => {
    setErr('');
    passportApi.getStageCurriculum(s)
      .then(setView)
      .catch(e => setErr(e?.response?.data?.message || 'Could not load this stage.'));
  }, []);

  // The tabs come from the server's own stage list, so they can never name a stage it does not
  // know about — and a stage added in code appears here without this screen being touched.
  useEffect(() => {
    passportApi.listStageCurriculumStages()
      .then(d => setStages(d.stages || []))
      .catch(() => setStages([]));
  }, []);

  useEffect(() => { load(stage); }, [stage, load]);

  /** Every write returns the whole rebuilt view, so nothing here has to guess at the new state. */
  const run = async (fn: () => Promise<StageCurriculumView>, ok: string) => {
    setBusy(true); setErr('');
    try {
      setView(await fn());
      say(ok);
      setEditing(null); setAddingTo(null); setNewModule(null);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'That did not save.');
    }
    setBusy(false);
  };

  const openTopic = (t: StageTopicNode) => {
    setEditing(t.id);
    setDraft({
      title: t.title,
      description: t.description || '',
      moduleCode: undefined,
      skillKeys: t.skills.map(s => s.skillKey).concat(t.unknownSkillKeys),
      prerequisiteSkillKeys: t.prerequisiteSkillKeys,
      defaultDepth: t.defaultDepth || 'FOUNDATION',
      mandatory: t.mandatory,
      learningOutcomes: t.learningOutcomes,
    });
  };

  const removeTopic = (t: StageTopicNode) => {
    // Named in the prompt: "are you sure" tells somebody nothing about what they are losing.
    if (!window.confirm(
      `Delete "${t.title}"?\n\nIt teaches ${t.skills.length} skill(s) and covers days `
      + `${t.startDay}–${t.endDay}. Later topics shift earlier. Student history is kept.`,
    )) return;
    run(() => passportApi.deleteStageTopic(stage, t.id), `Deleted "${t.title}".`);
  };

  const removeModule = (m: StageModuleNode) => {
    if (!window.confirm(`Delete the module "${m.moduleName}" (${m.moduleCode})?`)) return;
    run(() => passportApi.deleteStageModule(stage, m.moduleCode), `Deleted "${m.moduleName}".`);
  };

  const t = view?.totals;

  return (
    <div className="asc">
      <div className="asc-hd">
        <div>
          <h1>Stage Curriculum</h1>
          <p>
            What each stage teaches, and what it can measure. Modules, topics, the skills behind
            them, and how many questions each skill actually has.
          </p>
        </div>
      </div>

      <div className="asc-tabs">
        {(stages.length ? stages : [{ key: 'foundation', label: 'Foundation', who: '' }]).map(s => (
          <button key={s.key} className={s.key === stage ? 'on' : ''} onClick={() => setStage(s.key)}>
            {s.label}
            {s.who && <em>{s.who}</em>}
          </button>
        ))}
      </div>

      {err && <div className="asc-err">{err}</div>}
      {msg && <div className="asc-ok">{msg}</div>}

      {!view ? <div className="asc-empty">Loading…</div> : !view.curriculum ? (
        <div className="asc-empty">
          <b>No curriculum is marked as the {view.stageLabel} stage curriculum.</b>
          <p>
            Students at this stage resolve to it and find nothing to be taught or measured against.
            Mark a curriculum with this stage in the Curriculum Builder, then come back.
          </p>
          {!!view.measuredButNotTaught.length && (
            <p>
              Its skill set already measures {view.measuredButNotTaught.length} skills that nothing
              teaches: <code>{view.measuredButNotTaught.join(', ')}</code>
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="asc-summary">
            <div className="asc-stat">
              <b>{view.curriculum.title}</b>
              <em>{view.curriculum.isPublished ? 'published' : 'draft'} · {view.curriculum.totalDays} days · <code>{view.curriculum.id}</code></em>
            </div>
            <div className="asc-stat"><b>{t!.modules}</b><em>modules</em></div>
            <div className="asc-stat"><b>{t!.topics}</b><em>topics</em></div>
            <div className="asc-stat"><b>{t!.skills}</b><em>skills taught</em></div>
            <div className={`asc-stat${t!.measurable < t!.skills ? ' warn' : ''}`}>
              <b>{t!.measurable}</b><em>can be measured</em>
            </div>
            <div className="asc-stat">
              <b>{view.policy.skillSlots}</b>
              <em>questions · {view.policy.maxSkills} skills × {view.policy.itemsPerSkill}</em>
            </div>
          </div>

          {t!.measurable < t!.skills && (
            <div className="asc-gap">
              <b>{t!.skills - t!.measurable} of {t!.skills} skills this stage teaches cannot be measured.</b>
              {' '}A paper can never ask about them, so the plan cannot tell a student who already
              knows one from a student who does not — everyone is taught it from scratch. Each needs
              at least {view.policy.itemsPerSkill} questions.
            </div>
          )}

          {!!view.measuredButNotTaught.length && (
            <div className="asc-gap">
              <b>Measured but never taught:</b> <code>{view.measuredButNotTaught.join(', ')}</code>.
              {' '}The paper asks about these and no topic covers them, so a student can only be
              told they are weak at something with no lesson behind it.
            </div>
          )}

          {view.modules.map(m => (
            <div className="asc-mod" key={m.moduleCode}>
              <div className="asc-mod-hd">
                <div className="asc-mod-id">
                  <input
                    className="asc-mod-name"
                    defaultValue={m.moduleName}
                    disabled={busy}
                    onBlur={e => {
                      const moduleName = e.target.value.trim();
                      if (!moduleName || moduleName === m.moduleName) return;
                      run(() => passportApi.saveStageModule(stage, { moduleCode: m.moduleCode, moduleName }),
                        `Renamed to "${moduleName}".`);
                    }}
                  />
                  <code>{m.moduleCode}</code>
                </div>
                <div className="asc-mod-meta">
                  <span className={m.measurableCount < m.skillCount ? 'warn' : ''}>
                    {m.measurableCount}/{m.skillCount} skills measurable
                  </span>
                  <button className="asc-link" disabled={busy} onClick={() => setAddingTo(m.moduleCode)}>
                    + topic
                  </button>
                  <button className="asc-link danger" disabled={busy} onClick={() => removeModule(m)}>
                    delete
                  </button>
                </div>
              </div>

              {m.topics.map(tp => (
                <div className="asc-topic" key={tp.id}>
                  <div className="asc-topic-hd">
                    <div className="asc-topic-id">
                      <b>{tp.title}</b>
                      <code>{tp.topicCode}</code>
                      <span className="asc-days">days {tp.startDay}–{tp.endDay}</span>
                      {!tp.mandatory && <i className="asc-tag">optional</i>}
                      {tp.defaultDepth && <i className="asc-tag">{tp.defaultDepth.toLowerCase()}</i>}
                    </div>
                    <div>
                      <button className="asc-link" disabled={busy}
                        onClick={() => (editing === tp.id ? setEditing(null) : openTopic(tp))}>
                        {editing === tp.id ? 'close' : 'edit'}
                      </button>
                      <button className="asc-link danger" disabled={busy} onClick={() => removeTopic(tp)}>
                        delete
                      </button>
                    </div>
                  </div>

                  {tp.description && <p className="asc-topic-desc">{tp.description}</p>}

                  <div className="asc-skills">
                    {tp.skills.length === 0 && tp.unknownSkillKeys.length === 0 && (
                      <em className="asc-why">
                        Teaches no skills yet — the plan can schedule it, but no measurement can
                        steer it.
                      </em>
                    )}
                    {tp.skills.map(s => (
                      <SkillChip key={s.skillKey} skill={s} floor={view.policy.itemsPerSkill} />
                    ))}
                    {tp.unknownSkillKeys.map(k => (
                      <div className="asc-skill gap" key={k}>
                        <div className="asc-skill-id"><b>Unknown skill</b><code>{k}</code></div>
                        <em className="asc-why">not in the taxonomy — renamed or retired</em>
                      </div>
                    ))}
                  </div>

                  {!!tp.learningOutcomes.length && (
                    <ul className="asc-outcomes">
                      {tp.learningOutcomes.map((o, i) => <li key={i}>{o}</li>)}
                    </ul>
                  )}

                  {editing === tp.id && (
                    <div className="asc-edit">
                      <label>
                        Title
                        <input value={draft.title || ''}
                          onChange={e => setDraft({ ...draft, title: e.target.value })} />
                      </label>
                      <label>
                        Description
                        <input value={draft.description || ''}
                          onChange={e => setDraft({ ...draft, description: e.target.value })} />
                      </label>
                      <label>
                        Skills it teaches — canonical keys, comma separated
                        <input value={(draft.skillKeys || []).join(', ')}
                          onChange={e => setDraft({
                            ...draft,
                            skillKeys: e.target.value.split(',').map(x => x.trim()).filter(Boolean),
                          })} />
                        <em>A key that does not exist is refused rather than silently dropped.</em>
                      </label>
                      <label>
                        Depth when nothing has been measured
                        <select value={draft.defaultDepth || 'FOUNDATION'}
                          onChange={e => setDraft({ ...draft, defaultDepth: e.target.value })}>
                          {DEPTHS.map(d => <option key={d} value={d}>{d.toLowerCase()}</option>)}
                        </select>
                      </label>
                      <label className="asc-check">
                        <input type="checkbox" checked={draft.mandatory !== false}
                          onChange={e => setDraft({ ...draft, mandatory: e.target.checked })} />
                        Mandatory — never removed when a student picks a direction
                      </label>
                      <div className="asc-edit-actions">
                        <button className="pm-btn primary" disabled={busy}
                          onClick={() => run(() => passportApi.updateStageTopic(stage, tp.id, draft), 'Saved.')}>
                          Save topic
                        </button>
                        <button className="asc-link" onClick={() => setEditing(null)}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {addingTo === m.moduleCode && (
                <div className="asc-edit asc-new">
                  <label>
                    New topic title
                    <input autoFocus value={draft.title || ''}
                      onChange={e => setDraft({ ...draft, title: e.target.value })} />
                  </label>
                  <label>
                    Skills it teaches — comma separated
                    <input value={(draft.skillKeys || []).join(', ')}
                      onChange={e => setDraft({
                        ...draft,
                        skillKeys: e.target.value.split(',').map(x => x.trim()).filter(Boolean),
                      })} />
                  </label>
                  <div className="asc-edit-actions">
                    <button className="pm-btn primary" disabled={busy || !((draft.title || '').trim())}
                      onClick={() => run(
                        () => passportApi.createStageTopic(stage, { ...draft, moduleCode: m.moduleCode }),
                        'Topic added.',
                      )}>
                      Add to {m.moduleName}
                    </button>
                    <button className="asc-link" onClick={() => { setAddingTo(null); setDraft({}); }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {newModule ? (
            <div className="asc-edit asc-new">
              <label>
                Module code — stable, referenced by every topic
                <input autoFocus value={newModule.code} placeholder="M15_TESTING"
                  onChange={e => setNewModule({ ...newModule, code: e.target.value.toUpperCase() })} />
              </label>
              <label>
                Module name
                <input value={newModule.name} placeholder="Testing and Quality"
                  onChange={e => setNewModule({ ...newModule, name: e.target.value })} />
              </label>
              <div className="asc-edit-actions">
                <button className="pm-btn primary" disabled={busy || !newModule.code.trim()}
                  onClick={() => run(
                    () => passportApi.saveStageModule(stage, {
                      moduleCode: newModule.code.trim(), moduleName: newModule.name.trim() || newModule.code.trim(),
                    }),
                    'Module added.',
                  )}>
                  Add module
                </button>
                <button className="asc-link" onClick={() => setNewModule(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="asc-add-mod" disabled={busy} onClick={() => setNewModule({ code: '', name: '' })}>
              + Add module
            </button>
          )}

          <p className="asc-foot">
            Days are recomputed from module and topic order every time you save, so a topic added
            in the middle shifts the rest rather than colliding with them. Topic codes cannot be
            changed — student history and plan items reference them.
          </p>
        </>
      )}
    </div>
  );
};

export default AdminStageCurriculum;
