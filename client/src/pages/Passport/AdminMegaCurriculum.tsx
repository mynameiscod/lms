/**
 * Mega Curriculum — the Learning Units a topic breaks into.
 *
 * WHY THIS SCREEN IS ORGANISED BY TOPIC. The previous version of it was organised by band, which
 * made sense while a "day-unit" was a slot in a ninety-day shape. It is not that any more: a
 * Learning Unit belongs to a topic of the master curriculum, and its band is one of its
 * properties rather than its home. Authoring reads the way the curriculum reads —
 * Module → Topic → Units — because that is the order somebody writes in.
 *
 * NO DAY NUMBERS APPEAR HERE, AND THERE IS NOWHERE TO TYPE ONE. A unit is what is taught; the day
 * a particular student meets it is decided later, per student, and lives in their plan. "OOP" is
 * a topic, "Inheritance" is a unit, and "day 34" is neither.
 *
 * IT ASSIGNS STRUCTURE, NOT CONTENT. The video, notes and practice live in the Content Library
 * and are resolved by unit code, then topic code, then skill. Nothing here edits a resource.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import passportApi, {
  CurriculumLearningUnit, MegaCurriculumTopicRow, MegaCurriculumSummary,
  MegaCurriculumOptions, UnitBundle,
} from '../../api/passportApi';
import './megaCurriculum.css';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft', PUBLISHED: 'Live', ARCHIVED: 'Archived',
};

const UNIT_TYPE_LABEL: Record<string, string> = {
  CONCEPT: 'Concept', WORKED_EXAMPLE: 'Worked example', PRACTICE: 'Practice',
  DEBUG: 'Debugging', PROJECT: 'Project', CHECKPOINT: 'Checkpoint', REVIEW: 'Review',
};

/** Where a bundle came from, said plainly. The narrowest hook that matched wins. */
const VIA_NOTE: Record<string, string> = {
  unitCode: 'written for this unit',
  topicCode: 'shared across this topic',
  skillKeys: 'found by skill',
  none: 'nothing resolves yet',
};

const blankUnit = (
  stageKey: string, moduleCode: string, topicCode: string, order: number,
): CurriculumLearningUnit => ({
  stageKey, moduleCode, topicCode, unitCode: '',
  title: '', description: '', displayOrder: order,
  skillKeys: [], prerequisiteSkillKeys: [], prerequisiteUnitCodes: [], learningOutcomes: [],
  category: 'UNIVERSAL', applicableDirections: [],
  audience: { languages: [], years: [], branches: [] },
  defaultDepth: 'STANDARD', estimatedMinutes: 0, unitType: 'CONCEPT', mandatory: true,
  status: 'DRAFT',
});

/** A code suggestion, so nobody invents one by hand — always overridable before first save. */
const suggestCode = (topicCode: string, title: string): string =>
  `${topicCode}_${title}`.toUpperCase().replace(/[^A-Z0-9_]+/g, '_').replace(/_+/g, '_').slice(0, 70);

const asList = (v: string): string[] =>
  v.split(',').map(x => x.trim()).filter(Boolean);

const AdminMegaCurriculum: React.FC = () => {
  const [rows, setRows] = useState<MegaCurriculumTopicRow[]>([]);
  const [orphaned, setOrphaned] = useState<CurriculumLearningUnit[]>([]);
  const [summary, setSummary] = useState<MegaCurriculumSummary | null>(null);
  const [opts, setOpts] = useState<MegaCurriculumOptions | null>(null);
  const [open, setOpen] = useState<string>('');
  const [editing, setEditing] = useState<CurriculumLearningUnit | null>(null);
  /** Set when editing an existing unit: the code is identity and must not move. */
  const [editingCode, setEditingCode] = useState<string>('');
  const [bundle, setBundle] = useState<UnitBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const [list, o] = await Promise.all([
        passportApi.megaCurriculum(),
        passportApi.megaCurriculumOptions(),
      ]);
      setRows(list.rows);
      setOrphaned(list.orphaned);
      setSummary(list.summary);
      setOpts(o);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not load the mega curriculum.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /**
   * Open the first topic that has work in it, once.
   *
   * Kept out of `load` deliberately: choosing the default there would make the loader depend on
   * which topic is open, so every save would re-collapse the topic somebody was working in.
   */
  useEffect(() => {
    setOpen(o => o || rows.find(r => r.units.length > 0)?.topicCode || rows[0]?.topicCode || '');
  }, [rows]);

  /** Modules, in curriculum order, each holding its topics. */
  const modules = useMemo(() => {
    const m = new Map<string, { name: string; order: number; topics: MegaCurriculumTopicRow[] }>();
    for (const r of rows) {
      if (!m.has(r.moduleCode)) m.set(r.moduleCode, { name: r.moduleName, order: r.moduleOrder, topics: [] });
      m.get(r.moduleCode)!.topics.push(r);
    }
    return [...m.entries()].sort((a, b) => a[1].order - b[1].order);
  }, [rows]);

  const startNew = (row: MegaCurriculumTopicRow) => {
    setEditingCode(''); setBundle(null); setNote('');
    setEditing(blankUnit(
      opts?.stageKey || 'foundation', row.moduleCode, row.topicCode, (row.units.length + 1) * 10,
    ));
  };

  const startEdit = async (u: CurriculumLearningUnit) => {
    setEditingCode(u.unitCode); setEditing({ ...u }); setNote(''); setBundle(null);
    try {
      const r = await passportApi.getCurriculumUnit(u.unitCode);
      setBundle(r.bundle);
    } catch { /* the unit still edits without its bundle */ }
  };

  const save = async () => {
    if (!editing) return;
    const code = (editingCode || editing.unitCode || suggestCode(editing.topicCode, editing.title)).toUpperCase();
    if (!code) { setErr('This unit needs a code.'); return; }

    setSaving(true); setErr(''); setNote('');
    try {
      const r = await passportApi.saveCurriculumUnit(code, { ...editing, unitCode: code });
      setNote(r.warning || (r.created ? 'Unit created.' : 'Saved.'));
      setEditingCode(code);
      setEditing({ ...r.unit });
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not save this unit.');
    } finally { setSaving(false); }
  };

  const publish = async (unitCode: string) => {
    setErr(''); setNote('');
    try {
      const r = await passportApi.publishCurriculumUnit(unitCode);
      if (!r.published) { setErr(r.message || 'This unit cannot be published yet.'); return; }
      setNote('Published.');
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not publish this unit.');
    }
  };

  const setStatus = async (unitCode: string, status: 'DRAFT' | 'ARCHIVED') => {
    setErr(''); setNote('');
    try { await passportApi.setCurriculumUnitStatus(unitCode, status); await load(); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Could not change this unit.'); }
  };

  const remove = async (unitCode: string) => {
    if (!window.confirm('Delete this unit? Only one that was never published can be removed.')) return;
    setErr(''); setNote('');
    try {
      await passportApi.deleteCurriculumUnit(unitCode);
      if (editingCode === unitCode) { setEditing(null); setEditingCode(''); }
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not delete this unit.');
    }
  };

  const patch = (p: Partial<CurriculumLearningUnit>) =>
    setEditing(e => (e ? { ...e, ...p } : e));

  return (
    <div className="mgc-page">
      <header className="mgc-head">
        <div>
          <span className="mgc-kicker">CAREERPILOT</span>
          <h1>Mega Curriculum</h1>
          <p>The Learning Units each topic breaks into. A unit is the smallest thing that can be
             taught in a sitting — “OOP” is a topic, “Inheritance” is a unit. Which day a student
             meets it is decided later, per student.</p>
        </div>
        <button className="mgc-btn" onClick={load} disabled={loading}>
          <i className="bi bi-arrow-clockwise" /> {loading ? 'Loading…' : 'Refresh'}
        </button>
      </header>

      {err && <div className="mgc-msg err">{err}</div>}
      {note && <div className="mgc-msg ok">{note}</div>}

      {summary && (
        <div className="mgc-kpis">
          <div className="mgc-kpi"><span>Topics</span><b>{summary.topics}</b>
            <small>{summary.topicsWithUnits} broken into units</small></div>
          <div className="mgc-kpi"><span>Learning Units</span><b>{summary.totalUnits}</b>
            <small>across the whole stage</small></div>
          <div className="mgc-kpi good"><span>Live</span><b>{summary.published}</b>
            <small>publishable to a plan</small></div>
          <div className={`mgc-kpi ${summary.drafts ? 'warn' : ''}`}><span>Drafts</span><b>{summary.drafts}</b>
            <small>not yet teachable</small></div>
        </div>
      )}

      {!loading && summary?.totalUnits === 0 && (
        <div className="mgc-msg info">
          <b>No Learning Units yet.</b> Every topic below is still a single undivided block, which
          is why a plan can only be as long as the topic count. Open a topic and break it into the
          units it actually teaches.
        </div>
      )}

      {orphaned.length > 0 && (
        <div className="mgc-msg warn">
          <b>{orphaned.length} unit{orphaned.length === 1 ? '' : 's'} point at a topic that no longer
          exists.</b> Shown here rather than hidden, because dropping them from the list is how they
          stay orphaned: {orphaned.map(u => u.unitCode).join(', ')}
        </div>
      )}

      {modules.map(([moduleCode, mod]) => (
        <section className="mgc-module" key={moduleCode}>
          <h2>{mod.name} <code>{moduleCode}</code></h2>

          {mod.topics.map(row => {
            const isOpen = open === row.topicCode;
            return (
              <div className={`mgc-topic ${isOpen ? 'open' : ''}`} key={row.topicCode}>
                <button className="mgc-topichead" onClick={() => setOpen(isOpen ? '' : row.topicCode)}>
                  <span className="mgc-tname">
                    <b>{row.topicTitle}</b>
                    <small>{row.topicCode}{row.topicSkillKeys.length > 0 && <> · {row.topicSkillKeys.join(', ')}</>}</small>
                  </span>
                  <span className={`mgc-count ${row.units.length ? '' : 'empty'}`}>
                    {row.units.length
                      ? `${row.units.length} unit${row.units.length === 1 ? '' : 's'}`
                      : 'not divided'}
                  </span>
                  {row.published > 0 && <span className="mgc-live">{row.published} live</span>}
                  <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'}`} />
                </button>

                {isOpen && (
                  <div className="mgc-topicbody">
                    {!row.units.length ? (
                      <p className="mgc-empty">
                        This topic is still one block. Break it into the units it teaches — each one
                        a sitting’s worth of work.
                      </p>
                    ) : (
                      <ol className="mgc-units">
                        {row.units.map(u => (
                          <li key={u.unitCode} className={`mgc-unit s-${u.status.toLowerCase()}`}>
                            <button className="mgc-unitmain" onClick={() => startEdit(u)}>
                              <span className="mgc-ord">{u.displayOrder}</span>
                              <span className="mgc-uname">
                                <b>{u.title}</b>
                                <small>
                                  {UNIT_TYPE_LABEL[u.unitType] || u.unitType}
                                  {u.skillKeys.length > 0 && <> · {u.skillKeys.join(', ')}</>}
                                  {u.band && <> · {u.band}</>}
                                </small>
                              </span>
                              <span className="mgc-mins">
                                {u.estimatedMinutes > 0 ? `${u.estimatedMinutes} min` : '—'}
                              </span>
                              <span className={`mgc-status s-${u.status.toLowerCase()}`}>
                                {STATUS_LABEL[u.status]}
                              </span>
                            </button>
                            <span className="mgc-acts">
                              {u.status !== 'PUBLISHED' && (
                                <button onClick={() => publish(u.unitCode)} title="Publish">
                                  <i className="bi bi-broadcast" /></button>
                              )}
                              {u.status === 'PUBLISHED' && (
                                <button onClick={() => setStatus(u.unitCode, 'ARCHIVED')} title="Archive">
                                  <i className="bi bi-archive" /></button>
                              )}
                              {u.status === 'ARCHIVED' && (
                                <button onClick={() => setStatus(u.unitCode, 'DRAFT')} title="Back to draft">
                                  <i className="bi bi-arrow-counterclockwise" /></button>
                              )}
                              {u.status !== 'PUBLISHED' && (
                                <button className="danger" onClick={() => remove(u.unitCode)} title="Delete">
                                  <i className="bi bi-trash" /></button>
                              )}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}

                    <button className="mgc-add" onClick={() => startNew(row)}>
                      <i className="bi bi-plus-lg" /> Add a unit to {row.topicTitle}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ))}

      {editing && (
        <div className="mgc-drawer">
          <div className="mgc-drawerhead">
            <div>
              <h3>{editingCode ? 'Edit unit' : 'New unit'}</h3>
              <small>{editing.topicCode}{editingCode && <> · {editingCode}</>}</small>
            </div>
            <button className="mgc-x" onClick={() => { setEditing(null); setEditingCode(''); setBundle(null); }}>
              <i className="bi bi-x-lg" />
            </button>
          </div>

          <div className="mgc-form">
            <label>Title
              <input value={editing.title} maxLength={200}
                     onChange={e => patch({ title: e.target.value })}
                     placeholder="Inheritance" />
            </label>

            <label>Description
              <textarea value={editing.description} rows={2} maxLength={2000}
                        onChange={e => patch({ description: e.target.value })}
                        placeholder="What this unit covers, in one or two lines." />
            </label>

            <div className="mgc-row2">
              <label>Type
                <select value={editing.unitType} onChange={e => patch({ unitType: e.target.value as any })}>
                  {(opts?.unitTypes || []).map(t => (
                    <option key={t} value={t}>{UNIT_TYPE_LABEL[t] || t}</option>
                  ))}
                </select>
              </label>
              <label>Category
                <select value={editing.category} onChange={e => patch({ category: e.target.value as any })}>
                  {(opts?.categories || []).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            </div>

            <div className="mgc-row2">
              <label>Order in topic
                <input type="number" value={editing.displayOrder}
                       onChange={e => patch({ displayOrder: Number(e.target.value) })} />
              </label>
              <label>Minutes <em>a sitting’s worth</em>
                <input type="number" value={editing.estimatedMinutes}
                       onChange={e => patch({ estimatedMinutes: Number(e.target.value) })} />
              </label>
            </div>

            <label>Unit code
              <input value={editingCode || editing.unitCode} disabled={!!editingCode}
                     onChange={e => patch({ unitCode: e.target.value })}
                     placeholder={suggestCode(editing.topicCode, editing.title) || 'auto'} />
            </label>
            {editingCode && (
              <p className="mgc-hint">
                The code never changes. A student’s completed work is keyed on it, so moving it
                would make “I finished Inheritance” point at nothing.
              </p>
            )}

            <label>Skills it teaches <em>comma separated</em>
              <input value={editing.skillKeys.join(', ')}
                     onChange={e => patch({ skillKeys: asList(e.target.value).map(x => x.toUpperCase()) })}
                     placeholder="JAVA_OOP" />
            </label>

            <label>Skills required first <em>blank means none</em>
              <input value={editing.prerequisiteSkillKeys.join(', ')}
                     onChange={e => patch({ prerequisiteSkillKeys: asList(e.target.value).map(x => x.toUpperCase()) })} />
            </label>

            <label>Units required first <em>codes, within this curriculum</em>
              <input value={editing.prerequisiteUnitCodes.join(', ')}
                     onChange={e => patch({ prerequisiteUnitCodes: asList(e.target.value).map(x => x.toUpperCase()) })}
                     placeholder="T_OOP_CLASSES_AND_OBJECTS" />
            </label>

            <label>Learning outcomes <em>one per line</em>
              <textarea rows={3} value={editing.learningOutcomes.join('\n')}
                        onChange={e => patch({ learningOutcomes: e.target.value.split('\n').map(x => x.trim()).filter(Boolean) })}
                        placeholder="Explain what a subclass inherits" />
            </label>

            <div className="mgc-row2">
              <label>Default depth
                <select value={editing.defaultDepth} onChange={e => patch({ defaultDepth: e.target.value as any })}>
                  {['FOUNDATION', 'GUIDED', 'STANDARD', 'REVISION', 'CHALLENGE'].map(d =>
                    <option key={d} value={d}>{d}</option>)}
                </select>
              </label>
              <label>Band <em>a region, not a day</em>
                <select value={editing.band || ''} onChange={e => patch({ band: e.target.value || undefined })}>
                  <option value="">Not assigned</option>
                  {(opts?.bands || []).map(b => <option key={b.key} value={b.key}>{b.label}</option>)}
                </select>
              </label>
            </div>

            <label>Directions <em>blank means every direction</em>
              <input value={editing.applicableDirections.join(', ')}
                     onChange={e => patch({ applicableDirections: asList(e.target.value).map(x => x.toUpperCase()) })}
                     placeholder="WEB_DEVELOPMENT" />
            </label>

            <label className="mgc-check">
              <input type="checkbox" checked={editing.mandatory}
                     onChange={e => patch({ mandatory: e.target.checked })} />
              <span>Mandatory — never filtered away by direction</span>
            </label>

            {bundle && (
              <div className={`mgc-bundle ${bundle.hasTeaching ? '' : 'thin'}`}>
                <span>Content that resolves</span>
                <b>{bundle.items.length} item{bundle.items.length === 1 ? '' : 's'} · {bundle.resolvedMinutes} min</b>
                <small>
                  {VIA_NOTE[bundle.via]}
                  {bundle.types.length > 0 && <> — {bundle.types.join(', ')}</>}
                  {!bundle.hasTeaching && <> · nothing here teaches, so it cannot be published</>}
                </small>
              </div>
            )}

            <div className="mgc-actions">
              <button className="mgc-btn primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save unit'}
              </button>
              {editingCode && editing.status !== 'PUBLISHED' && (
                <button className="mgc-btn" onClick={() => publish(editingCode)}>Publish</button>
              )}
              <button className="mgc-btn ghost"
                      onClick={() => { setEditing(null); setEditingCode(''); setBundle(null); }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMegaCurriculum;
