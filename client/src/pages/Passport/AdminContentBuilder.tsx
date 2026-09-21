import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import passportApi, { CurriculumLearningUnit, DirectionCoverageReport, MegaCurriculumTopicRow, UnitStudentPreview } from '../../api/passportApi';
import { learningContentLibraryApi } from '../../api/learningContentLibraryApi';
import './adminContentBuilder.css';

/**
 * Content Builder — one screen for "what does a learner do on this day, and let me change it".
 *
 * Authoring used to mean leaving the curriculum for the Content Library, filling a form built for every
 * content type at once, saving, and finding your way back. Three round trips to give a day a video, notes
 * and a practice set. Here the curriculum is the left rail, the day a learner actually sees is the right
 * pane, and adding something opens a drawer over the page with only the fields that type needs.
 *
 * The right pane is the member's own day: it comes from the unit's student preview, which runs the same
 * composer code the day player runs, so what an admin approves here is what a member gets.
 */

/** The XP table the journey pays, mirrored so a unit can show its worth before anybody takes it. */
const XP_BY_TYPE: Record<string, number> = {
  video: 5, notes: 5, worked_example: 5, interactive_lesson: 5, interactive_activity: 5,
  practice_theory: 10, tech_qa: 10, behavioral_qa: 10, aptitude: 10,
  practice_coding: 15, quiz: 20, assignment: 30,
};
const DAY_BONUS_XP = 25;

type DrawerKind = 'video' | 'notes' | 'tech_qa' | 'practice_theory' | null;

const KIND_META: Record<Exclude<DrawerKind, null>, { label: string; icon: string; blurb: string }> = {
  video: { label: 'Video', icon: 'bi-play-circle-fill', blurb: 'A YouTube or Vimeo link the learner watches.' },
  notes: { label: 'Notes', icon: 'bi-file-text-fill', blurb: 'Written notes the learner reads.' },
  tech_qa: { label: 'Q&A', icon: 'bi-patch-question-fill', blurb: 'Questions with model answers.' },
  practice_theory: { label: 'Practice', icon: 'bi-pencil-square', blurb: 'Short questions the learner answers in their own words.' },
};

const ICON_FOR: Record<string, string> = {
  video: 'bi-play-circle', notes: 'bi-file-text', worked_example: 'bi-journal-code',
  tech_qa: 'bi-patch-question', behavioral_qa: 'bi-chat-left-quote', practice_theory: 'bi-pencil-square',
  practice_coding: 'bi-code-slash', aptitude: 'bi-ui-checks-grid', interactive_activity: 'bi-puzzle',
  interactive_lesson: 'bi-easel', quiz: 'bi-question-circle', assignment: 'bi-clipboard-check',
};

/** The two link hosts the player can embed; anything else belongs to an upload. */
const VIDEO_LINK = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\//i;

const prettyType = (t: string) => (t || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const AdminContentBuilder: React.FC = () => {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<MegaCurriculumTopicRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [openTopics, setOpenTopics] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [unitCode, setUnitCode] = useState(params.get('unit') || '');
  const [preview, setPreview] = useState<UnitStudentPreview | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [drawer, setDrawer] = useState<DrawerKind>(null);
  const [editUnit, setEditUnit] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await passportApi.megaCurriculum('foundation');
      setRows(r.rows || []);
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not load the curriculum.'); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const loadPreview = useCallback(async (code: string) => {
    if (!code) { setPreview(null); return; }
    setPreviewBusy(true);
    try { setPreview(await passportApi.unitStudentPreview(code)); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Could not load this unit.'); setPreview(null); }
    setPreviewBusy(false);
  }, []);
  useEffect(() => { loadPreview(unitCode); }, [unitCode, loadPreview]);

  /* The first topic opens itself, so the rail is never a wall of closed rows. */
  useEffect(() => {
    if (!rows.length) return;
    const owner = rows.find(r => r.units.some(u => u.unitCode === unitCode)) || rows[0];
    setOpenTopics(o => (o[owner.topicCode] ? o : { ...o, [owner.topicCode]: true }));
    if (!unitCode && owner.units[0]) setUnitCode(owner.units[0].unitCode);
  }, [rows, unitCode]);

  const unit: CurriculumLearningUnit | undefined = useMemo(
    () => rows.flatMap(r => r.units).find(u => u.unitCode === unitCode), [rows, unitCode]);
  const topic = useMemo(() => rows.find(r => r.units.some(u => u.unitCode === unitCode)), [rows, unitCode]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows
      .map(r => ({ ...r, units: r.units.filter(u => `${u.title} ${u.unitCode}`.toLowerCase().includes(q)) }))
      .filter(r => r.units.length || r.topicTitle.toLowerCase().includes(q));
  }, [rows, search]);

  const items: any[] = preview?.items || [];
  const unitXp = items.reduce((t, it) => t + (XP_BY_TYPE[it.contentType] ?? XP_BY_TYPE[it.kind] ?? 5), 0);
  const minutes = items.reduce((t, it) => t + (Number(it.estimatedDuration) || 0), 0);

  const pick = (code: string) => { setUnitCode(code); setParams({ unit: code }); setErr(''); };
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  /** Create the row, bind it to this unit and publish it — the three steps an author always wants together. */
  const addContent = async (body: any) => {
    if (!unit) return;
    setSaving(true); setErr('');
    try {
      const created = await learningContentLibraryApi.createJson({
        ...body,
        topicTags: unit.topicCode ? [unit.topicCode] : [],
        topicCode: unit.topicCode,
        skillKeys: unit.skillKeys || [],
      } as any);
      const id = String((created as any)._id);
      await passportApi.attachUnitContent(unit.unitCode, id);
      if (!(created as any).isPublished) await learningContentLibraryApi.togglePublish(id);
      setDrawer(null);
      await loadPreview(unit.unitCode);
      await load();
      say('Added to this day.');
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not add that.'); }
    setSaving(false);
  };

  /**
   * Saving a day sends the whole unit back, not the edited fields.
   *
   * The endpoint reads a unit as one document: `mandatory` defaults to true when it is missing, and
   * `suitableStates` means three different things absent, empty or filled. A partial body would
   * quietly rewrite settings nobody touched, so the drawer edits a copy of what it was given.
   */
  const saveUnit = async (patch: Partial<CurriculumLearningUnit>) => {
    if (!unit) return;
    setSaving(true); setErr('');
    try {
      const { unit: fresh } = await passportApi.getCurriculumUnit(unit.unitCode);
      const body: any = { ...fresh, ...patch };
      delete body._id; delete body.status; delete body.coverage;
      await passportApi.saveCurriculumUnit(unit.unitCode, body);
      setEditUnit(false);
      await load(); await loadPreview(unit.unitCode);
      say('Day saved.');
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not save this day.'); }
    setSaving(false);
  };

  /** A content row edits by name and length here; its body stays where that type is authored. */
  const saveItem = async (patch: any) => {
    if (!editItem || !unit) return;
    setSaving(true); setErr('');
    try {
      await learningContentLibraryApi.updateJson(String(editItem.contentId), patch);
      setEditItem(null);
      await loadPreview(unit.unitCode);
      say('Saved.');
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not save that.'); }
    setSaving(false);
  };

  const removeItem = async (it: any) => {
    if (!unit) return;
    if (it.kind !== 'content') { say('Open the checkpoint to unbind it.'); return; }
    if (!window.confirm(`Take "${it.contentTitle}" off this day? It stays in the library.`)) return;
    setSaving(true);
    try {
      await passportApi.detachUnitContent(unit.unitCode, String(it.contentId));
      await loadPreview(unit.unitCode); await load();
      say('Taken off this day.');
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not remove that.'); }
    setSaving(false);
  };

  const addCheckpoint = async () => {
    if (!unit) return;
    setSaving(true);
    try {
      const r = await passportApi.createUnitAssessment(unit.unitCode, 'QUIZ');
      await loadPreview(unit.unitCode);
      say('Checkpoint created — add its questions next.');
      if ((r as any)?.id) nav(`/quiz/${(r as any).id}/questions`);
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not create a checkpoint.'); }
    setSaving(false);
  };

  const publishUnit = async () => {
    if (!unit) return;
    setSaving(true); setErr('');
    try {
      await passportApi.publishCurriculumUnit(unit.unitCode);
      await load(); say('This day is published.');
    } catch (e: any) { setErr(e?.response?.data?.message || 'This day is not ready to publish yet.'); }
    setSaving(false);
  };

  if (loading) return <div className="acb"><div className="acb-load">Loading the curriculum…</div></div>;

  return <div className="acb">
    <header className="acb-head">
      <div>
        <span className="acb-eyebrow">Content builder</span>
        <h1>Build the learning days</h1>
        <p>Pick a day on the left. What you see on the right is what a member sees, in their order.</p>
      </div>
      <a className="acb-btn ghost" href="/admin/passport/mega-curriculum"><i className="bi bi-sliders" /> Curriculum settings</a>
    </header>

    {err && <div className="acb-err"><i className="bi bi-exclamation-circle" /> {err}</div>}

    <CoveragePanel />

    <div className="acb-body">
      <aside className="acb-rail">
        <label className="acb-search"><i className="bi bi-search" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search days" aria-label="Search days" />
        </label>
        <div className="acb-tree">
          {shown.map(r => {
            const open = !!openTopics[r.topicCode];
            return <section key={r.topicCode} className={`acb-topic${open ? ' open' : ''}`}>
              <button type="button" className="acb-topic-hd" onClick={() => setOpenTopics(o => ({ ...o, [r.topicCode]: !open }))}>
                <i className={`bi ${open ? 'bi-chevron-down' : 'bi-chevron-right'}`} />
                <span className="acb-topic-t"><b>{r.topicTitle}</b><small>{r.moduleName}</small></span>
                <em>{r.published}/{r.units.length}</em>
              </button>
              {open && <ol className="acb-units">
                {r.units.map(u => (
                  <li key={u.unitCode}>
                    <button type="button" className={`acb-unit${u.unitCode === unitCode ? ' on' : ''}`} onClick={() => pick(u.unitCode)}>
                      <span className={`acb-dot s-${(u.status || 'DRAFT').toLowerCase()}`} />
                      <span className="acb-unit-t"><b>{u.title}</b><small>{u.unitCode}</small></span>
                    </button>
                  </li>
                ))}
                {!r.units.length && <li className="acb-none">No days in this topic yet.</li>}
              </ol>}
            </section>;
          })}
          {!shown.length && <p className="acb-none">Nothing matches that search.</p>}
        </div>
      </aside>

      <main className="acb-pane">
        {!unit ? <div className="acb-blank"><i className="bi bi-arrow-left" /> Pick a day on the left.</div> : <>
          <div className="acb-unit-head">
            <div>
              <span className="acb-crumb">{topic?.moduleName} · {topic?.topicTitle}</span>
              <h2>{unit.title}</h2>
              <div className="acb-meta">
                <span className={`acb-chip s-${(unit.status || 'DRAFT').toLowerCase()}`}>{unit.status || 'DRAFT'}</span>
                <span className="acb-chip"><i className="bi bi-list-task" /> {items.length} task{items.length === 1 ? '' : 's'}</span>
                <span className="acb-chip"><i className="bi bi-clock" /> {minutes} min</span>
                <span className="acb-chip"><i className="bi bi-lightning-charge-fill" /> {unitXp} XP + {DAY_BONUS_XP} bonus</span>
              </div>
            </div>
            <div className="acb-unit-actions">
              {unit.status !== 'PUBLISHED' && <button className="acb-btn primary" onClick={publishUnit} disabled={saving}><i className="bi bi-send-check" /> Publish this day</button>}
              <button className="acb-btn ghost" onClick={() => setEditUnit(true)}><i className="bi bi-pencil" /> Edit day details</button>
            </div>
          </div>

          <div className="acb-add">
            {(Object.keys(KIND_META) as Exclude<DrawerKind, null>[]).map(k => (
              <button key={k} type="button" className="acb-add-btn" onClick={() => setDrawer(k)} disabled={saving}>
                <i className={`bi ${KIND_META[k].icon}`} /> Add {KIND_META[k].label.toLowerCase()}
              </button>
            ))}
            <button type="button" className="acb-add-btn" onClick={addCheckpoint} disabled={saving}><i className="bi bi-question-circle-fill" /> Add checkpoint</button>
            <a className="acb-add-btn" href={`/learning-library/create?unitCode=${encodeURIComponent(unit.unitCode)}&topicCode=${encodeURIComponent(unit.topicCode)}&returnTo=${encodeURIComponent(`/admin/passport/content-builder?unit=${unit.unitCode}`)}`}>
              <i className="bi bi-upload" /> Upload a file
            </a>
          </div>

          <section className="acb-day">
            <div className="acb-day-hd"><b>The member's day</b><span>Same order the day player uses</span></div>
            {previewBusy ? <div className="acb-load">Loading…</div> : !items.length
              ? <div className="acb-blank"><i className="bi bi-journal-plus" /> Nothing on this day yet. Add a video, notes or practice above.</div>
              : <ol className="acb-items">
                {items.map((it, i) => {
                  const xp = XP_BY_TYPE[it.contentType] ?? XP_BY_TYPE[it.kind] ?? 5;
                  return <li key={`${it.contentId || it.sourceId || i}`}>
                    <span className="acb-i-n">{i + 1}</span>
                    <span className="acb-i-ic"><i className={`bi ${ICON_FOR[it.contentType] || 'bi-dot'}`} /></span>
                    <span className="acb-i-t">
                      <b>{it.contentTitle}</b>
                      <small>{prettyType(it.contentType)} · {it.estimatedDuration || 0} min{it.isGating ? ' · must be completed' : ''}</small>
                    </span>
                    <span className="acb-i-xp">+{xp} XP</span>
                    {it.editPath
                      ? <a className="acb-i-act" href={it.editPath} title="Open the editor"><i className="bi bi-box-arrow-up-right" /></a>
                      : <button className="acb-i-act" onClick={() => setEditItem(it)} title="Edit"><i className="bi bi-pencil" /></button>}
                    <button className="acb-i-act danger" onClick={() => removeItem(it)} title="Take off this day"><i className="bi bi-x-lg" /></button>
                  </li>;
                })}
              </ol>}

            {!!preview?.notShown?.length && <div className="acb-warn">
              <i className="bi bi-eye-slash" />
              <div>
                <b>{preview.notShown.length} item{preview.notShown.length === 1 ? ' is' : 's are'} attached but unpublished</b>
                <span>{preview.notShown.map(n => n.title).join(', ')} — a member cannot see {preview.notShown.length === 1 ? 'it' : 'them'} until published.</span>
              </div>
            </div>}
          </section>
        </>}
      </main>
    </div>

    {drawer && unit && <ContentDrawer kind={drawer} unitTitle={unit.title} saving={saving}
      onClose={() => setDrawer(null)} onSave={addContent} />}
    {editUnit && unit && <UnitDrawer unit={unit} saving={saving} onClose={() => setEditUnit(false)} onSave={saveUnit} />}
    {editItem && <ItemDrawer item={editItem} saving={saving} onClose={() => setEditItem(null)} onSave={saveItem} />}
    {toast && <div className="acb-toast"><i className="bi bi-check-circle-fill" /> {toast}</div>}
  </div>;
};

/** One drawer, one content type, only the fields that type needs. */
const ContentDrawer: React.FC<{
  kind: Exclude<DrawerKind, null>; unitTitle: string; saving: boolean;
  onClose: () => void; onSave: (body: any) => void;
}> = ({ kind, unitTitle, saving, onClose, onSave }) => {
  const meta = KIND_META[kind];
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState(10);
  const [url, setUrl] = useState('');
  const [body, setBody] = useState('');
  const [pairs, setPairs] = useState([{ question: '', answer: '' }]);
  const [problem, setProblem] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setProblem('Give it a title.'); return; }
    const base: any = { title: title.trim(), type: kind, estimatedDuration: Number(minutes) || 0, isPublished: true };
    if (kind === 'video') {
      if (!VIDEO_LINK.test(url.trim())) {
        setProblem('Paste a YouTube or Vimeo link. For a file, use "Upload a file".'); return;
      }
      base.videoSource = /vimeo/i.test(url) ? 'vimeo' : 'youtube';
      base.videoUrl = url.trim();
    }
    if (kind === 'notes') {
      if (!body.trim()) { setProblem('Write the notes, or use "Upload a file" for a PDF.'); return; }
      base.notesSource = 'richtext';
      base.notesContent = body;
    }
    if (kind === 'tech_qa') {
      const items = pairs.filter(p => p.question.trim() && p.answer.trim())
        .map((p, i) => ({ question: p.question.trim(), answer: p.answer.trim(), order: i }));
      if (!items.length) { setProblem('Add at least one question and its answer.'); return; }
      base.qaItems = items;
    }
    if (kind === 'practice_theory') {
      const qs = pairs.filter(p => p.question.trim())
        .map(p => ({ type: 'theory', title: p.question.trim().slice(0, 120), description: p.question.trim(), explanation: p.answer.trim(), marks: 1, gradingMode: 'self' }));
      if (!qs.length) { setProblem('Add at least one question.'); return; }
      base.practiceQuestions = qs;
    }
    setProblem('');
    onSave(base);
  };

  const setPair = (i: number, k: 'question' | 'answer', v: string) =>
    setPairs(p => p.map((row, j) => (j === i ? { ...row, [k]: v } : row)));

  const usesPairs = kind === 'tech_qa' || kind === 'practice_theory';

  return <div className="acb-drawer-back" onMouseDown={e => { if (e.target === e.currentTarget && !saving) onClose(); }}>
    <form className="acb-drawer" onSubmit={submit}>
      <header>
        <span className="acb-drawer-ic"><i className={`bi ${meta.icon}`} /></span>
        <div><b>Add {meta.label.toLowerCase()}</b><small>{meta.blurb}</small></div>
        <button type="button" className="acb-drawer-x" onClick={onClose} aria-label="Close" disabled={saving}><i className="bi bi-x-lg" /></button>
      </header>

      <div className="acb-drawer-body">
        <p className="acb-drawer-to"><i className="bi bi-signpost-2" /> Goes on <b>{unitTitle}</b></p>

        <label className="acb-field"><span>Title</span>
          <input value={title} autoFocus onChange={e => setTitle(e.target.value)} placeholder={`e.g. ${unitTitle} — ${meta.label.toLowerCase()}`} />
        </label>

        {kind === 'video' && <label className="acb-field"><span>YouTube or Vimeo link</span>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" />
        </label>}

        {kind === 'notes' && <label className="acb-field"><span>Notes</span>
          <textarea rows={10} value={body} onChange={e => setBody(e.target.value)} placeholder="Write the notes. Markdown and simple HTML both render." />
        </label>}

        {usesPairs && <div className="acb-pairs">
          {pairs.map((p, i) => <div className="acb-pair" key={i}>
            <label className="acb-field"><span>{kind === 'tech_qa' ? `Question ${i + 1}` : `Prompt ${i + 1}`}</span>
              <input value={p.question} onChange={e => setPair(i, 'question', e.target.value)} placeholder={kind === 'tech_qa' ? 'What is…?' : 'Explain in your own words…'} />
            </label>
            <label className="acb-field"><span>{kind === 'tech_qa' ? 'Answer' : 'What a good answer covers (optional)'}</span>
              <textarea rows={3} value={p.answer} onChange={e => setPair(i, 'answer', e.target.value)} />
            </label>
            {pairs.length > 1 && <button type="button" className="acb-pair-x" onClick={() => setPairs(ps => ps.filter((_, j) => j !== i))}>
              <i className="bi bi-trash" /> Remove
            </button>}
          </div>)}
          <button type="button" className="acb-btn ghost sm" onClick={() => setPairs(p => [...p, { question: '', answer: '' }])}>
            <i className="bi bi-plus-lg" /> Add another
          </button>
        </div>}

        <label className="acb-field short"><span>Minutes</span>
          <input type="number" min={1} max={180} value={minutes} onChange={e => setMinutes(Number(e.target.value))} />
        </label>

        {problem && <div className="acb-err"><i className="bi bi-exclamation-circle" /> {problem}</div>}
      </div>

      <footer>
        <button type="button" className="acb-btn ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button type="submit" className="acb-btn primary" disabled={saving}>{saving ? 'Adding…' : 'Add to this day'}</button>
      </footer>
    </form>
  </div>;
};

/**
 * What a student of each direction actually receives.
 *
 * A direction with no units of its own does not fail: the student simply gets the universal
 * curriculum and a plan identical to somebody who chose a different empty direction. That is the
 * gap between "personalised" and personalised, and it belongs where the content is authored.
 */
const CoveragePanel: React.FC = () => {
  const [report, setReport] = useState<DirectionCoverageReport | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    try { setReport(await passportApi.directionCoverage('foundation')); }
    catch { /* the panel simply stays closed; the builder is not blocked by a report */ }
    setBusy(false);
  };

  const show = () => { setOpen(o => !o); if (!report) load(); };
  const worst = report?.empty?.length || 0;

  return <section className="acb-cover">
    <button type="button" className="acb-cover-hd" onClick={show}>
      <i className={`bi ${open ? 'bi-chevron-down' : 'bi-chevron-right'}`} />
      <b>Direction coverage</b>
      <span>{report ? `${report.directions.length - worst} of ${report.directions.length} directions have days of their own` : 'How personalised a plan actually is'}</span>
      {!!worst && <em className="acb-cover-warn">{worst} empty</em>}
    </button>
    {open && <div className="acb-cover-body">
      {busy && !report && <p className="acb-cover-note">Measuring…</p>}
      {report && <>
        <table className="acb-cover-table">
          <thead><tr><th>Direction</th><th>Authored</th><th>Published</th><th>Days in a plan</th></tr></thead>
          <tbody>
            {report.directions.map(d => (
              <tr key={d.key} className={d.daysInPlan === 0 ? 'none' : ''}>
                <td>{d.name}</td>
                <td>{d.authored}</td>
                <td>{d.published}</td>
                <td><b>{d.daysInPlan}</b> of {report.programDays}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!!report.empty.length && <p className="acb-cover-note warn">
          <i className="bi bi-exclamation-triangle-fill" /> No days of their own:{' '}
          <b>{report.empty.join(', ')}</b>. A student who chooses one of these gets the universal
          curriculum only — the same plan as anybody else who chose an empty direction.
        </p>}
        {!!report.identicalPairs.length && <p className="acb-cover-note warn">
          <i className="bi bi-files" /> Identical plans:{' '}
          {report.identicalPairs.map(p => `${p.a} = ${p.b}`).join(', ')} — two names over one body of content.
        </p>}
        <p className="acb-cover-note">
          Measured by composing a plan for a beginner of each direction against this tenant's
          curriculum, so it counts days a student is actually given, not units sitting in the library.
        </p>
      </>}
    </div>}
  </section>;
};

/** The day itself: what a member reads at the top of it, and how long it should take. */
const UnitDrawer: React.FC<{
  unit: CurriculumLearningUnit; saving: boolean;
  onClose: () => void; onSave: (patch: Partial<CurriculumLearningUnit>) => void;
}> = ({ unit, saving, onClose, onSave }) => {
  const [title, setTitle] = useState(unit.title || '');
  const [description, setDescription] = useState(unit.description || '');
  const [outcomes, setOutcomes] = useState((unit.learningOutcomes || []).join('\n'));
  const [minutes, setMinutes] = useState(Number(unit.estimatedMinutes) || 0);
  const [problem, setProblem] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setProblem('A day needs a title.'); return; }
    onSave({
      title: title.trim(),
      description: description.trim(),
      learningOutcomes: outcomes.split('\n').map(l => l.trim()).filter(Boolean),
      estimatedMinutes: Number(minutes) || 0,
    });
  };

  return <div className="acb-drawer-back" onMouseDown={e => { if (e.target === e.currentTarget && !saving) onClose(); }}>
    <form className="acb-drawer" onSubmit={submit}>
      <header>
        <span className="acb-drawer-ic"><i className="bi bi-calendar2-week" /></span>
        <div><b>Edit day details</b><small>{unit.unitCode}</small></div>
        <button type="button" className="acb-drawer-x" onClick={onClose} aria-label="Close" disabled={saving}><i className="bi bi-x-lg" /></button>
      </header>
      <div className="acb-drawer-body">
        <label className="acb-field"><span>Title</span>
          <input value={title} autoFocus onChange={e => setTitle(e.target.value)} />
        </label>
        <label className="acb-field"><span>What this day is about</span>
          <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="One or two lines the member reads before they start." />
        </label>
        <label className="acb-field"><span>By the end of today they can… (one per line)</span>
          <textarea rows={4} value={outcomes} onChange={e => setOutcomes(e.target.value)} />
        </label>
        <label className="acb-field short"><span>Minutes</span>
          <input type="number" min={0} max={600} value={minutes} onChange={e => setMinutes(Number(e.target.value))} />
        </label>
        <p className="acb-drawer-to"><i className="bi bi-info-circle" /> Skills, prerequisites and where this day sits stay in <a href={`/admin/passport/mega-curriculum?unit=${encodeURIComponent(unit.unitCode)}`}>curriculum settings</a>.</p>
        {problem && <div className="acb-err"><i className="bi bi-exclamation-circle" /> {problem}</div>}
      </div>
      <footer>
        <button type="button" className="acb-btn ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button type="submit" className="acb-btn primary" disabled={saving}>{saving ? 'Saving…' : 'Save day'}</button>
      </footer>
    </form>
  </div>;
};

/** One task on the day: its name, its length, and the link or notes it carries. */
const ItemDrawer: React.FC<{ item: any; saving: boolean; onClose: () => void; onSave: (patch: any) => void }> = ({ item, saving, onClose, onSave }) => {
  const [row, setRow] = useState<any>(null);
  const [loadErr, setLoadErr] = useState('');
  const [title, setTitle] = useState(item.contentTitle || '');
  const [minutes, setMinutes] = useState(Number(item.estimatedDuration) || 0);
  const [url, setUrl] = useState('');
  const [body, setBody] = useState('');
  const [problem, setProblem] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r: any = await learningContentLibraryApi.getById(String(item.contentId));
        setRow(r); setTitle(r.title || ''); setMinutes(Number(r.estimatedDuration) || 0);
        setUrl(r.videoUrl || ''); setBody(r.notesContent || '');
      } catch (e: any) { setLoadErr(e?.response?.data?.message || 'Could not open this item.'); }
    })();
  }, [item.contentId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const type = String(row?.type || item.contentType || '');
  const isVideoLink = type === 'video' && ['youtube', 'vimeo'].includes(String(row?.videoSource || ''));
  const isRichNotes = ['notes', 'worked_example'].includes(type) && String(row?.notesSource || '') !== 'upload';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setProblem('Give it a title.'); return; }
    const patch: any = { title: title.trim(), estimatedDuration: Number(minutes) || 0 };
    if (isVideoLink) {
      if (!VIDEO_LINK.test(url.trim())) { setProblem('Paste a YouTube or Vimeo link.'); return; }
      patch.videoSource = /vimeo/i.test(url) ? 'vimeo' : 'youtube';
      patch.videoUrl = url.trim();
    }
    if (isRichNotes) { patch.notesSource = 'richtext'; patch.notesContent = body; }
    setProblem('');
    onSave(patch);
  };

  return <div className="acb-drawer-back" onMouseDown={e => { if (e.target === e.currentTarget && !saving) onClose(); }}>
    <form className="acb-drawer" onSubmit={submit}>
      <header>
        <span className="acb-drawer-ic"><i className={`bi ${ICON_FOR[type] || 'bi-pencil'}`} /></span>
        <div><b>Edit {prettyType(type).toLowerCase()}</b><small>On this day</small></div>
        <button type="button" className="acb-drawer-x" onClick={onClose} aria-label="Close" disabled={saving}><i className="bi bi-x-lg" /></button>
      </header>
      <div className="acb-drawer-body">
        {loadErr && <div className="acb-err"><i className="bi bi-exclamation-circle" /> {loadErr}</div>}
        <label className="acb-field"><span>Title</span>
          <input value={title} autoFocus onChange={e => setTitle(e.target.value)} />
        </label>
        {isVideoLink && <label className="acb-field"><span>YouTube or Vimeo link</span>
          <input value={url} onChange={e => setUrl(e.target.value)} />
        </label>}
        {isRichNotes && <label className="acb-field"><span>Notes</span>
          <textarea rows={10} value={body} onChange={e => setBody(e.target.value)} />
        </label>}
        <label className="acb-field short"><span>Minutes</span>
          <input type="number" min={0} max={180} value={minutes} onChange={e => setMinutes(Number(e.target.value))} />
        </label>
        {row && !isVideoLink && !isRichNotes && <p className="acb-drawer-to">
          <i className="bi bi-box-arrow-up-right" />
          <a href={`/learning-library/edit/${item.contentId}`}>Open the full editor</a> for this item&rsquo;s questions or file.
        </p>}
        {problem && <div className="acb-err"><i className="bi bi-exclamation-circle" /> {problem}</div>}
      </div>
      <footer>
        <button type="button" className="acb-btn ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button type="submit" className="acb-btn primary" disabled={saving || !row}>{saving ? 'Saving…' : 'Save'}</button>
      </footer>
    </form>
  </div>;
};

export default AdminContentBuilder;
