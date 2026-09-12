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
  MegaCurriculumOptions, UnitContent, UnitAssessments,
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
  unitCode: 'attached to this unit',
  topicCode: 'inherited from the topic',
  skillKeys: 'inherited by skill',
  none: 'nothing resolves yet',
};

const TYPE_LABEL: Record<string, string> = {
  video: 'Video', notes: 'Notes', worked_example: 'Worked example',
  interactive_lesson: 'Interactive lesson', interactive_activity: 'Activity',
  tech_qa: 'Q&A', behavioral_qa: 'Q&A',
  practice_theory: 'Theory practice', practice_coding: 'Coding practice', aptitude: 'Aptitude',
};

/**
 * Readiness, in the author's words rather than as a state name.
 *
 * PARTIAL is the one that matters and the one that is easiest to mis-read as "nearly there": it
 * means the unit inherits its topic's material and has nothing written for it, so twelve sibling
 * units would each open the same lesson.
 */
const READINESS_LABEL: Record<string, string> = {
  EMPTY: 'Nothing yet',
  PARTIAL: 'Topic content only',
  TEACHABLE: 'Teachable',
  ASSESSABLE: 'Teachable + practice',
  READY: 'Ready',
};

/** What a row is for, shown as a rail rather than restated on every line. */
const ROLE_LABEL: Record<string, string> = {
  TEACH: 'Teach', REINFORCE: 'Reinforce', PRACTISE: 'Practise', OTHER: 'Other',
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

/**
 * Pick skills from the registry, rather than typing them and hoping.
 *
 * A free-text box was the previous answer and it was quietly the worst field on the screen: a
 * mistyped key saves, publishes, composes, and then never matches a student's profile. The unit
 * is unteachable rather than broken, and nothing anywhere says so. Topics have always validated
 * their skills; units did not, so two halves of the same hierarchy disagreed about whether a
 * skill had to exist.
 *
 * Search is over key AND name, because an author thinks "recursion" and the key is
 * RECURSION_BASICS. Selected skills are chips with the human name underneath, so a wrong pick is
 * visible at a glance instead of hiding inside an uppercase string.
 */
const SkillPicker: React.FC<{
  value: string[];
  options: { key: string; name: string }[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}> = ({ value, options, onChange, placeholder }) => {
  const [query, setQuery] = useState('');
  const chosen = new Set(value);

  const matches = query.trim().length < 1 ? [] : options
    .filter(o => !chosen.has(o.key))
    .filter(o => {
      const q = query.trim().toLowerCase();
      return o.key.toLowerCase().includes(q) || (o.name || '').toLowerCase().includes(q);
    })
    .slice(0, 8);

  const nameOf = (key: string) => options.find(o => o.key === key)?.name;

  return (
    <div className="mgc-skills">
      <div className="mgc-chips">
        {value.length === 0 && <span className="mgc-chips-empty">none yet</span>}
        {value.map(k => {
          const known = nameOf(k);
          return (
            <span key={k} className={`mgc-chip${known ? '' : ' mgc-chip-unknown'}`}>
              <span className="mgc-chip-key">{k}</span>
              {/* An unrecognised key is shown as such rather than silently accepted. */}
              <span className="mgc-chip-name">{known || 'not in the registry'}</span>
              <button type="button" onClick={() => onChange(value.filter(x => x !== k))}
                      aria-label={`Remove ${k}`}>×</button>
            </span>
          );
        })}
      </div>
      <input value={query} onChange={e => setQuery(e.target.value)}
             placeholder={placeholder || 'search skills…'} />
      {matches.length > 0 && (
        <ul className="mgc-skill-matches">
          {matches.map(o => (
            <li key={o.key}>
              <button type="button" onClick={() => { onChange([...value, o.key]); setQuery(''); }}>
                <strong>{o.name || o.key}</strong><span>{o.key}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim() && matches.length === 0 && (
        <p className="mgc-hint">Nothing in the registry matches that. Skills cannot be invented here.</p>
      )}
    </div>
  );
};

/**
 * Pick from a short, closed vocabulary the SERVER supplies.
 *
 * Used for directions, and shaped so nothing about the list is known here. The states and the
 * directions were both hardcoded copies of server policy — seven states restated beside a
 * taxonomy of nine, and directions not constrained at all — and a client-side copy of a
 * server-side rule drifts silently, because nothing fails when it does.
 */
const ChipToggle: React.FC<{
  value: string[];
  options: { key: string; name?: string }[];
  onChange: (next: string[]) => void;
  empty?: string;
}> = ({ value, options, onChange, empty }) => (
  <div className="mgc-state-grid">
    {options.length === 0 && <span className="mgc-chips-empty">{empty || 'nothing to choose'}</span>}
    {options.map(o => {
      const on = value.includes(o.key);
      return (
        <button key={o.key} type="button" className={on ? 'on' : ''}
                onClick={() => onChange(on ? value.filter(x => x !== o.key) : [...value, o.key])}>
          {o.name || o.key.replace(/_/g, ' ').toLowerCase()}
        </button>
      );
    })}
  </div>
);

/**
 * Choose prerequisite units by searching the curriculum, rather than typing codes.
 *
 * A mistyped code is now refused by the backend, which is right but arrives late — the author
 * has already written the unit. Searching the real list means the invalid case mostly cannot be
 * expressed, and the refusal is a backstop rather than the primary defence.
 */
const UnitPicker: React.FC<{
  value: string[];
  options: { unitCode: string; title: string }[];
  onChange: (next: string[]) => void;
}> = ({ value, options, onChange }) => {
  const [query, setQuery] = useState('');
  const chosen = new Set(value);
  const titleOf = (code: string) => options.find(o => o.unitCode === code)?.title;

  const matches = query.trim().length < 1 ? [] : options
    .filter(o => !chosen.has(o.unitCode))
    .filter(o => {
      const q = query.trim().toLowerCase();
      return o.unitCode.toLowerCase().includes(q) || o.title.toLowerCase().includes(q);
    })
    .slice(0, 8);

  return (
    <div className="mgc-skills">
      <div className="mgc-chips">
        {value.length === 0 && <span className="mgc-chips-empty">none</span>}
        {value.map(code => {
          const known = titleOf(code);
          return (
            <span key={code} className={`mgc-chip${known ? '' : ' mgc-chip-unknown'}`}>
              <span className="mgc-chip-key">{code}</span>
              <span className="mgc-chip-name">{known || 'no such unit'}</span>
              <button type="button" onClick={() => onChange(value.filter(x => x !== code))}
                      aria-label={`Remove ${code}`}>x</button>
            </span>
          );
        })}
      </div>
      <input value={query} onChange={e => setQuery(e.target.value)}
             placeholder="search units in this curriculum..." />
      {matches.length > 0 && (
        <ul className="mgc-skill-matches">
          {matches.map(o => (
            <li key={o.unitCode}>
              <button type="button"
                      onClick={() => { onChange([...value, o.unitCode]); setQuery(''); }}>
                <strong>{o.title}</strong><span>{o.unitCode}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim() && matches.length === 0 && (
        <p className="mgc-hint">No unit matches that. A prerequisite must name a unit that exists.</p>
      )}
    </div>
  );
};

const AdminMegaCurriculum: React.FC = () => {
  const [rows, setRows] = useState<MegaCurriculumTopicRow[]>([]);
  const [orphaned, setOrphaned] = useState<CurriculumLearningUnit[]>([]);
  const [summary, setSummary] = useState<MegaCurriculumSummary | null>(null);
  const [opts, setOpts] = useState<MegaCurriculumOptions | null>(null);
  const [open, setOpen] = useState<string>('');
  const [editing, setEditing] = useState<CurriculumLearningUnit | null>(null);
  /** Set when editing an existing unit: the code is identity and must not move. */
  const [editingCode, setEditingCode] = useState<string>('');
  const [content, setContent] = useState<UnitContent | null>(null);
  const [contentBusy, setContentBusy] = useState(false);
  const [exams, setExams] = useState<UnitAssessments | null>(null);
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

  /**
   * Every unit in the stage, flattened, for the prerequisite picker.
   *
   * Orphans are included deliberately: a unit whose topic was deleted still EXISTS, so it is
   * still a legal prerequisite, and leaving it out would make the picker disagree with the
   * backend about what can be referenced.
   */
  const allUnits = useMemo(
    () => [...rows.flatMap(r => r.units), ...orphaned]
      .map(u => ({ unitCode: u.unitCode, title: u.title }))
      .sort((a, b) => a.unitCode.localeCompare(b.unitCode)),
    [rows, orphaned],
  );

  const startNew = (row: MegaCurriculumTopicRow) => {
    setEditingCode(''); setContent(null); setNote('');
    setEditing(blankUnit(
      opts?.stageKey || 'foundation', row.moduleCode, row.topicCode, (row.units.length + 1) * 10,
    ));
  };

  /** The unit's content, reloaded on its own so attaching does not redraw the whole page. */
  const loadContent = useCallback(async (unitCode: string) => {
    try { setContent(await passportApi.unitContent(unitCode)); }
    catch { setContent(null); }
  }, []);

  /** What the unit measures with. Separate call, same reason: binding must not redraw the page. */
  const loadExams = useCallback(async (unitCode: string) => {
    try { setExams(await passportApi.unitAssessments(unitCode)); }
    catch { setExams(null); }
  }, []);

  const startEdit = async (u: CurriculumLearningUnit) => {
    setEditingCode(u.unitCode); setEditing({ ...u }); setNote('');
    setContent(null); setExams(null);
    await Promise.all([loadContent(u.unitCode), loadExams(u.unitCode)]);
  };

  /**
   * Bind, unbind or create an assessment, then reload the stage.
   *
   * The full reload is the point: readiness is computed server-side from what is bound, so a
   * CHECKPOINT that was EMPTY a moment ago becomes READY in the same click. Refreshing only the
   * panel would leave the readiness badge next to it stale and wrong.
   */
  const withExams = async (fn: () => Promise<any>, fallback: string) => {
    if (!editingCode) return;
    setContentBusy(true); setErr(''); setNote('');
    try {
      await fn();
      await Promise.all([loadExams(editingCode), load()]);
    } catch (e: any) {
      setErr(e?.response?.data?.message || fallback);
    } finally { setContentBusy(false); }
  };

  const attach = async (contentId: string) => {
    if (!editingCode) return;
    setContentBusy(true); setErr('');
    try {
      await passportApi.attachUnitContent(editingCode, contentId);
      await loadContent(editingCode);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not attach this content.');
    } finally { setContentBusy(false); }
  };

  const detach = async (contentId: string) => {
    if (!editingCode) return;
    setContentBusy(true); setErr('');
    try {
      await passportApi.detachUnitContent(editingCode, contentId);
      await loadContent(editingCode);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not detach this content.');
    } finally { setContentBusy(false); }
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
      await Promise.all([load(), loadContent(code)]);
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

  /**
   * Move a module or a topic one place, by sending the WHOLE new order.
   *
   * The server renumbers from the sequence rather than from numbers sent with it, so two
   * adjacent moves cannot leave a gap or a collision. Sending one changed position instead
   * would make the client responsible for keeping every other number consistent, which is
   * exactly the hand-renumbering this replaced.
   */
  const moveModule = async (moduleCode: string, delta: number) => {
    const order = modules.map(([code]) => code);
    const i = order.indexOf(moduleCode);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    setErr(''); setNote('');
    try {
      await passportApi.reorderStageModules(opts?.stageKey || 'foundation', order);
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not reorder the modules.');
    }
  };

  const moveTopic = async (moduleCode: string, topicCode: string, delta: number) => {
    const mod = modules.find(([code]) => code === moduleCode);
    if (!mod) return;
    const order = mod[1].topics.map(t => t.topicCode);
    const i = order.indexOf(topicCode);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    setErr(''); setNote('');
    try {
      await passportApi.reorderStageTopics(opts?.stageKey || 'foundation', moduleCode, order);
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not reorder the topics.');
    }
  };

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
          <div className={`mgc-kpi ${(summary.readiness?.PARTIAL || 0) ? 'warn' : ''}`}>
            <span>Topic content only</span><b>{summary.readiness?.PARTIAL || 0}</b>
            <small>inherit their topic — nothing written for them</small></div>
          <div className="mgc-kpi good"><span>Ready</span><b>{summary.readiness?.READY || 0}</b>
            <small>own everything their type needs</small></div>
          {/* Published and Ready are different claims and are constantly mistaken for each
              other. The gap between this number and "Live" is the actual backlog. */}
          <div className={`mgc-kpi ${summary.composerReady ? 'good' : 'warn'}`}>
            <span>Composer eligible</span><b>{summary.composerReady ?? 0}</b>
            <small>published AND ready — all a plan may use</small></div>
        </div>
      )}

      {summary && (
        <p className="mgc-legend">
          <b>T</b> teaching · <b>P</b> practice · <b>C</b> checkpoint — all counted from content
          written FOR the unit. <b>inh</b> is what it inherits from its topic, shared with every
          sibling unit, and never counts towards readiness.
        </p>
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

      {modules.map(([moduleCode, mod], mi) => (
        <section className="mgc-module" key={moduleCode}>
          <h2>
            {mod.name} <code>{moduleCode}</code>
            <span className="mgc-move">
              <button type="button" disabled={mi === 0} title="Move this module up"
                      onClick={() => moveModule(moduleCode, -1)}>
                <i className="bi bi-arrow-up" />
              </button>
              <button type="button" disabled={mi === modules.length - 1} title="Move this module down"
                      onClick={() => moveModule(moduleCode, 1)}>
                <i className="bi bi-arrow-down" />
              </button>
            </span>
          </h2>

          {mod.topics.map((row, ti) => {
            const isOpen = open === row.topicCode;
            return (
              <div className={`mgc-topic ${isOpen ? 'open' : ''}`} key={row.topicCode}>
                {/* Outside the disclosure button, because a button inside a button is not
                    valid markup and the click would reach both. */}
                <span className="mgc-move topic">
                  <button type="button" disabled={ti === 0} title="Move this topic up"
                          onClick={() => moveTopic(moduleCode, row.topicCode, -1)}>
                    <i className="bi bi-arrow-up" />
                  </button>
                  <button type="button" disabled={ti === mod.topics.length - 1}
                          title="Move this topic down"
                          onClick={() => moveTopic(moduleCode, row.topicCode, 1)}>
                    <i className="bi bi-arrow-down" />
                  </button>
                </span>
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
                              <span className="mgc-cov" title={(u.coverage?.missing || []).join('; ') || 'Everything this unit type needs'}>
                                {u.coverage && (
                                  <>
                                    {/* Own counts only. Inherited is shown separately and never
                                        added in — summing them is exactly the false signal that
                                        made 310 units look fully covered. */}
                                    <em className={u.coverage.ownTeaching ? 'on' : ''}>T{u.coverage.ownTeaching}</em>
                                    <em className={u.coverage.ownPractice ? 'on' : ''}>P{u.coverage.ownPractice}</em>
                                    <em className={u.coverage.ownAssessment ? 'on' : ''}>C{u.coverage.ownAssessment}</em>
                                    {/* Only shown where it decides something: a PROJECT is not
                                        READY without an assignment, however many quizzes it has. */}
                                    {u.unitType === 'PROJECT' && (
                                      <em className={u.coverage.ownSubmission ? 'on' : ''}
                                          title="Bound assignments — the only thing that can receive submitted work">
                                        S{u.coverage.ownSubmission}
                                      </em>
                                    )}
                                    {u.coverage.inheritedCount > 0 && (
                                      <em className="inh" title={`${u.coverage.inheritedCount} inherited from the topic — shared with sibling units`}>
                                        +{u.coverage.inheritedCount} inh
                                      </em>
                                    )}
                                    {u.coverage.unpublishedAttached > 0 && (
                                      <em className="unpub" title="Attached but unpublished — resolves for nothing">
                                        {u.coverage.unpublishedAttached} draft
                                      </em>
                                    )}
                                    <b className={`r-${u.coverage.readiness.toLowerCase()}`}>
                                      {READINESS_LABEL[u.coverage.readiness]}
                                    </b>
                                    {u.coverage.composerReady && (
                                      <em className="mgc-ce" title="Published and READY — a plan may use this unit">
                                        composer
                                      </em>
                                    )}
                                  </>
                                )}
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
            <button className="mgc-x" onClick={() => { setEditing(null); setEditingCode(''); setContent(null); }}>
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

            <label>Skills it teaches <em>from the registry</em>
              <SkillPicker value={editing.skillKeys} options={opts?.skills || []}
                           onChange={next => patch({ skillKeys: next })}
                           placeholder="search skills this unit teaches…" />
            </label>

            <label>Skills required first <em>blank means none</em>
              <SkillPicker value={editing.prerequisiteSkillKeys} options={opts?.skills || []}
                           onChange={next => patch({ prerequisiteSkillKeys: next })}
                           placeholder="search prerequisite skills…" />
            </label>

            <label className="mgc-states">Serves which states
              <em>blank derives from the unit type — only override with a reason</em>
              {/* The vocabulary is the server's. See MegaCurriculumOptions.suitableStates. */}
              <ChipToggle value={editing.suitableStates || []}
                          options={(opts?.suitableStates || []).map(k => ({ key: k }))}
                          onChange={next => patch({ suitableStates: next })} />
              {(editing.suitableStates || []).length > 0 && (
                <p className="mgc-hint">
                  Overridden. This unit will be offered at these states regardless of what
                  “{editing.unitType}” would normally imply.{' '}
                  <button type="button" className="mgc-linkish"
                          onClick={() => patch({ suitableStates: [] })}>
                    back to the default
                  </button>
                </p>
              )}
            </label>

            <label>Units required first <em>a loop is refused, so is a unit that does not exist</em>
              <UnitPicker value={editing.prerequisiteUnitCodes} options={allUnits}
                          onChange={next => patch({ prerequisiteUnitCodes: next })} />
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
              {/* SOFTWARE_BACKEND is the frozen name. Offering the list rather than a text box
                  is what stops SOFTWARE_DEVELOPMENT being invented a second time. */}
              <ChipToggle value={editing.applicableDirections}
                          options={opts?.directions || []}
                          onChange={next => patch({ applicableDirections: next })} />
            </label>

            <label className="mgc-check">
              <input type="checkbox" checked={editing.mandatory}
                     onChange={e => patch({ mandatory: e.target.checked })} />
              <span>Mandatory — never filtered away by direction</span>
            </label>

            {editingCode && content && (
              <div className="mgc-content">
                <div className={`mgc-bundle ${content.resolved.hasTeaching ? '' : 'thin'}`}>
                  <span>What this unit teaches from</span>
                  <b>
                    {content.resolved.items.length} item
                    {content.resolved.items.length === 1 ? '' : 's'} · {content.resolved.resolvedMinutes} min
                  </b>
                  <small>
                    {VIA_NOTE[content.resolved.via]}
                    {!content.resolved.hasTeaching && <> · nothing here teaches, so it cannot be published</>}
                  </small>
                </div>

                {content.attachedButUnpublished.length > 0 && (
                  <div className="mgc-msg warn" style={{ margin: 0 }}>
                    <b>Attached but not published:</b> {content.attachedButUnpublished.join(', ')}.
                    Unpublished content resolves for nothing, so these teach no one until they are
                    published in the Content Library.
                  </div>
                )}

                {/* In teaching order: watch, read, see it done, practise. The order comes from the
                    server so the screen and the student's day agree about sequence. */}
                {content.resolved.items.length > 0 && (
                  <ol className="mgc-clist">
                    {content.resolved.items.map(it => (
                      <li key={it._id} className={it.attached ? 'bound' : ''}>
                        <span className="mgc-crole">{ROLE_LABEL[it.role]}</span>
                        <span className="mgc-cbody">
                          <b>{it.title}</b>
                          <small>
                            {TYPE_LABEL[it.type] || it.type}
                            {it.learningDepth && <> · {it.learningDepth}</>}
                            {it.estimatedDuration > 0 && <> · {it.estimatedDuration} min</>}
                            {!it.attached && <> · inherited</>}
                          </small>
                        </span>
                        {it.attached && (
                          <button className="mgc-cbtn" disabled={contentBusy}
                                  onClick={() => detach(it._id)} title="Detach — it goes back to serving the topic">
                            <i className="bi bi-x-lg" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ol>
                )}

                {content.candidates.length > 0 && (
                  <>
                    <span className="mgc-lbl">
                      Attach to this unit <em>already serves this topic or skill</em>
                    </span>
                    <ol className="mgc-clist cand">
                      {content.candidates.map(it => (
                        <li key={it._id}>
                          <span className="mgc-crole">{ROLE_LABEL[it.role]}</span>
                          <span className="mgc-cbody">
                            <b>{it.title}</b>
                            <small>
                              {TYPE_LABEL[it.type] || it.type}
                              {it.learningDepth && <> · {it.learningDepth}</>}
                              {!it.isPublished && <> · <b className="mgc-unpub">not published</b></>}
                            </small>
                          </span>
                          <button className="mgc-cbtn add" disabled={contentBusy}
                                  onClick={() => attach(it._id)} title="Attach to this unit">
                            <i className="bi bi-plus-lg" />
                          </button>
                        </li>
                      ))}
                    </ol>
                  </>
                )}

                {!content.candidates.length && !content.attached.length && (
                  <p className="mgc-hint">
                    No unclaimed content matches this unit yet. Author it in the Content Library
                    and tag it with this topic or skill — it will appear here to attach.
                  </p>
                )}
              </div>
            )}

            {editingCode && exams && (
              <div className="mgc-content">
                <div className={`mgc-bundle ${exams.hasAssessment ? '' : 'thin'}`}>
                  <span>What measures this unit</span>
                  <b>
                    {exams.bound.length} bound
                    {exams.hasSubmission ? ' · can receive submitted work' : ''}
                  </b>
                  <small>
                    {/* Said plainly, because the distinction decides whether a PROJECT can ever
                        be READY and nothing else on the screen explains it. */}
                    A quiz measures recall; only an assignment can receive what a student built.
                    {exams.unitType === 'CHECKPOINT' && !exams.hasAssessment
                      && ' A checkpoint with nothing bound cannot be published at all.'}
                    {exams.unitType === 'PROJECT' && !exams.hasSubmission
                      && ' A project needs a bound assignment before it can be READY.'}
                  </small>
                </div>

                {exams.bound.length > 0 && (
                  <ol className="mgc-clist">
                    {exams.bound.map(a => (
                      <li key={a._id} className="bound">
                        <span className="mgc-crole">{a.kind === 'QUIZ' ? 'QUIZ' : 'SUBMIT'}</span>
                        <span className="mgc-cbody">
                          <b>{a.title}</b>
                          <small>
                            {a.kind === 'QUIZ' ? 'Quiz' : `Assignment${a.type ? ` · ${a.type}` : ''}`}
                            {!a.live && <> · <b className="mgc-unpub">not live yet</b></>}
                            {a.countsAsSubmission && <> · counts as submission</>}
                          </small>
                        </span>
                        <button className="mgc-cbtn" disabled={contentBusy}
                                title="Unbind — the quiz or assignment itself is kept"
                                onClick={() => withExams(
                                  () => passportApi.unbindUnitAssessment(editingCode, a.kind, a._id),
                                  'Could not unbind this assessment.')}>
                          <i className="bi bi-x-lg" />
                        </button>
                      </li>
                    ))}
                  </ol>
                )}

                {exams.candidates.length > 0 && (
                  <>
                    <span className="mgc-lbl">
                      Bind an existing one <em>only ones no other unit has claimed</em>
                    </span>
                    <ol className="mgc-clist cand">
                      {exams.candidates.slice(0, 12).map(a => (
                        <li key={a._id}>
                          <span className="mgc-crole">{a.kind === 'QUIZ' ? 'QUIZ' : 'SUBMIT'}</span>
                          <span className="mgc-cbody">
                            <b>{a.title}</b>
                            <small>
                              {a.kind === 'QUIZ' ? 'Quiz' : 'Assignment'}
                              {!a.live && <> · not live</>}
                            </small>
                          </span>
                          <button className="mgc-cbtn add" disabled={contentBusy}
                                  title="Bind to this unit"
                                  onClick={() => withExams(
                                    () => passportApi.bindUnitAssessment(editingCode, a.kind, a._id),
                                    'Could not bind this assessment.')}>
                            <i className="bi bi-plus-lg" />
                          </button>
                        </li>
                      ))}
                    </ol>
                  </>
                )}

                {/* Creating one from here answers the question the quiz and assignment builders
                    cannot see: WHICH unit is the one still missing its checkpoint. Both shells
                    are created inactive, and are finished in the screens that own them. */}
                <div className="mgc-actions" style={{ marginTop: 4 }}>
                  <button className="mgc-btn" disabled={contentBusy}
                          onClick={() => withExams(
                            () => passportApi.createUnitAssessment(editingCode, 'QUIZ'),
                            'Could not create a quiz.')}>
                    <i className="bi bi-patch-question" /> New quiz for this unit
                  </button>
                  <button className="mgc-btn" disabled={contentBusy}
                          onClick={() => withExams(
                            () => passportApi.createUnitAssessment(editingCode, 'ASSIGNMENT'),
                            'Could not create an assignment.')}>
                    <i className="bi bi-upload" /> New assignment for this unit
                  </button>
                </div>
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
                      onClick={() => {
                        setEditing(null); setEditingCode(''); setContent(null); setExams(null);
                      }}>
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
