import React, { useCallback, useEffect, useMemo, useState } from 'react';
import passportApi, { VideoScript, VideoScriptInput, VideoScriptScene, VideoScriptStatus } from '../../api/passportApi';
import './videoScript.css';

/**
 * The day's video shooting script, in the Content Builder.
 *
 * Written BEFORE the video is shot and followed on set, so the saved view is laid out the way a
 * presenter reads it: one numbered scene at a time, what the screen shows beside what to say, the
 * director's notes underneath, and how long it will run. Admin-only — it lives in its own collection
 * that no student endpoint reads.
 */

const WPM = 140;
const words = (t: string) => (t.trim().match(/\S+/g) || []).length;
const minutesFor = (w: number) => w / WPM;
const fmtMin = (m: number) => {
  if (m <= 0) return '0 min';
  const total = Math.round(m * 60);
  const mm = Math.floor(total / 60), ss = total % 60;
  return mm ? `${mm} min${ss ? ` ${ss}s` : ''}` : `${ss}s`;
};
const STATUS_LABEL: Record<VideoScriptStatus, string> = { DRAFT: 'Draft', READY: 'Ready to shoot', SHOT: 'Shot' };
const blankScene = (): VideoScriptScene => ({ heading: '', visual: '', narration: '', notes: '' });

/** Paragraphs and line breaks, kept exactly as written; everything is plain text. */
const Lines: React.FC<{ text: string; className?: string }> = ({ text, className }) => (
  <div className={className}>
    {text.split(/\n{2,}/).map((p, i) => <p key={i}>{p.split('\n').map((l, j) => <React.Fragment key={j}>{j > 0 && <br />}{l}</React.Fragment>)}</p>)}
  </div>
);

const ScriptSheet: React.FC<{ script: VideoScriptInput; dayTitle: string; unitCode: string; updated?: string }> = ({ script, dayTitle, unitCode, updated }) => {
  const total = script.scenes.reduce((n, s) => n + words(s.narration), 0);
  const est = minutesFor(total);
  return <article className="vs-sheet">
    <header className="vs-sheet-hd">
      <div className="vs-sheet-kicker">Video script · {unitCode}</div>
      <h1>{script.title || dayTitle}</h1>
      <div className="vs-sheet-facts">
        <span className={`vs-status s-${script.status.toLowerCase()}`}>{STATUS_LABEL[script.status]}</span>
        <span><i className="bi bi-film" /> {script.scenes.length} scene{script.scenes.length === 1 ? '' : 's'}</span>
        <span><i className="bi bi-stopwatch" /> about {fmtMin(est)} spoken{script.targetMinutes ? ` · target ${script.targetMinutes} min` : ''}</span>
        <span><i className="bi bi-chat-square-text" /> {total} words</span>
        {script.presenter && <span><i className="bi bi-person-video3" /> {script.presenter}</span>}
      </div>
      {script.objective && <div className="vs-objective"><b>After watching, the learner can</b><Lines text={script.objective} /></div>}
      {updated && <div className="vs-updated">Last saved {new Date(updated).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</div>}
    </header>
    <ol className="vs-scenes">
      {script.scenes.map((s, i) => {
        const w = words(s.narration);
        return <li key={i} className="vs-scene">
          <div className="vs-scene-hd">
            <span className="vs-scene-n">Scene {i + 1}</span>
            <b>{s.heading || 'Untitled scene'}</b>
            <span className="vs-scene-t">{fmtMin(minutesFor(w))}</span>
          </div>
          <div className="vs-scene-cols">
            <section className="vs-col visual">
              <h4><i className="bi bi-display" /> On screen</h4>
              {s.visual.trim() ? <Lines text={s.visual} /> : <p className="vs-empty">—</p>}
            </section>
            <section className="vs-col say">
              <h4><i className="bi bi-mic" /> Say</h4>
              {s.narration.trim() ? <Lines text={s.narration} className="vs-say" /> : <p className="vs-empty">—</p>}
            </section>
          </div>
          {s.notes.trim() && <div className="vs-notes"><i className="bi bi-lightbulb" /><Lines text={s.notes} /></div>}
        </li>;
      })}
    </ol>
  </article>;
};

const ScriptEditor: React.FC<{
  initial: VideoScriptInput; dayTitle: string; unitCode: string; exists: boolean; saving: boolean;
  onClose: () => void; onSave: (s: VideoScriptInput) => void; onDelete: () => void;
}> = ({ initial, dayTitle, unitCode, exists, saving, onClose, onSave, onDelete }) => {
  const [s, setS] = useState<VideoScriptInput>(initial);
  const [problem, setProblem] = useState('');
  const set = (patch: Partial<VideoScriptInput>) => setS(prev => ({ ...prev, ...patch }));
  const setScene = (i: number, patch: Partial<VideoScriptScene>) =>
    setS(prev => ({ ...prev, scenes: prev.scenes.map((sc, j) => (j === i ? { ...sc, ...patch } : sc)) }));
  const move = (i: number, d: number) => setS(prev => {
    const sc = [...prev.scenes]; const j = i + d;
    if (j < 0 || j >= sc.length) return prev;
    [sc[i], sc[j]] = [sc[j], sc[i]];
    return { ...prev, scenes: sc };
  });
  const total = s.scenes.reduce((n, x) => n + words(x.narration), 0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const scenes = s.scenes.filter(x => x.heading.trim() || x.visual.trim() || x.narration.trim() || x.notes.trim());
    if (!scenes.length) { setProblem('Write at least one scene — what is on screen and what to say.'); return; }
    onSave({ ...s, scenes });
  };

  return <div className="acb-drawer-back" onMouseDown={e => { if (e.target === e.currentTarget && !saving) onClose(); }}>
    <form className="acb-drawer vs-drawer" onSubmit={submit}>
      <header>
        <span className="acb-drawer-ic"><i className="bi bi-camera-reels" /></span>
        <div><b>{exists ? 'Edit video script' : 'Write the video script'}</b><small>{dayTitle} · admins only, never shown to members</small></div>
        <button type="button" className="acb-drawer-x" onClick={onClose} aria-label="Close" disabled={saving}><i className="bi bi-x-lg" /></button>
      </header>
      <div className="acb-drawer-body">
        <div className="vs-ed-row">
          <label className="acb-field"><span>Video title</span>
            <input value={s.title} autoFocus placeholder={dayTitle} onChange={e => set({ title: e.target.value })} />
          </label>
          <label className="acb-field vs-short"><span>Target minutes</span>
            <input type="number" min={0} max={180} value={s.targetMinutes} onChange={e => set({ targetMinutes: Number(e.target.value) })} />
          </label>
        </div>
        <div className="vs-ed-row">
          <label className="acb-field"><span>Presenter</span>
            <input value={s.presenter} placeholder="Who is on camera" onChange={e => set({ presenter: e.target.value })} />
          </label>
          <label className="acb-field vs-short"><span>Status</span>
            <select value={s.status} onChange={e => set({ status: e.target.value as VideoScriptStatus })}>
              {(Object.keys(STATUS_LABEL) as VideoScriptStatus[]).map(k => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}
            </select>
          </label>
        </div>
        <label className="acb-field"><span>After watching, the learner can… (optional)</span>
          <textarea rows={2} value={s.objective} onChange={e => set({ objective: e.target.value })} placeholder="Explain how files and folders are organised, and read a path." />
        </label>

        <div className="vs-ed-total">
          <i className="bi bi-stopwatch" /> {total} words spoken · about <b>{fmtMin(minutesFor(total))}</b>
          {s.targetMinutes ? <> of a {s.targetMinutes}-minute target</> : null} <span>(at {WPM} words a minute)</span>
        </div>

        {s.scenes.map((sc, i) => (
          <fieldset key={i} className="vs-ed-scene">
            <legend>
              <span>Scene {i + 1}</span>
              <span className="vs-ed-tools">
                <small>{fmtMin(minutesFor(words(sc.narration)))}</small>
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="Move up" aria-label={`Move scene ${i + 1} up`}><i className="bi bi-arrow-up" /></button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === s.scenes.length - 1} title="Move down" aria-label={`Move scene ${i + 1} down`}><i className="bi bi-arrow-down" /></button>
                <button type="button" className="danger" onClick={() => set({ scenes: s.scenes.filter((_, j) => j !== i) })} disabled={s.scenes.length === 1} title="Remove scene" aria-label={`Remove scene ${i + 1}`}><i className="bi bi-trash" /></button>
              </span>
            </legend>
            <label className="acb-field"><span>Scene heading</span>
              <input value={sc.heading} placeholder="e.g. Hook — why folders exist" onChange={e => setScene(i, { heading: e.target.value })} />
            </label>
            <div className="vs-ed-cols">
              <label className="acb-field"><span>On screen</span>
                <textarea rows={5} value={sc.visual} placeholder="Presenter to camera. Then the terminal: run ls -la in the home folder." onChange={e => setScene(i, { visual: e.target.value })} />
              </label>
              <label className="acb-field"><span>Say (word for word)</span>
                <textarea rows={5} value={sc.narration} placeholder="Every file on your laptop lives somewhere…" onChange={e => setScene(i, { narration: e.target.value })} />
              </label>
            </div>
            <label className="acb-field"><span>Director's notes (optional)</span>
              <input value={sc.notes} placeholder="Slow down here. Zoom the terminal to 150%." onChange={e => setScene(i, { notes: e.target.value })} />
            </label>
          </fieldset>
        ))}
        <button type="button" className="acb-btn vs-add-scene" onClick={() => set({ scenes: [...s.scenes, blankScene()] })}>
          <i className="bi bi-plus-lg" /> Add a scene
        </button>
        {problem && <div className="acb-err"><i className="bi bi-exclamation-circle" /> {problem}</div>}
      </div>
      <footer>
        {exists && <button type="button" className="acb-btn vs-del" onClick={onDelete} disabled={saving}><i className="bi bi-trash" /> Delete script</button>}
        <button type="button" className="acb-btn" onClick={onClose} disabled={saving}>Cancel</button>
        <button type="submit" className="acb-btn primary" disabled={saving}>{saving ? 'Saving…' : 'Save script'}</button>
      </footer>
    </form>
  </div>;
};

/** The Content Builder card, plus the editor and the read view it opens. */
export const VideoScriptPanel: React.FC<{
  unitCode: string; dayTitle: string; openEditorSignal: number; onToast: (m: string) => void;
}> = ({ unitCode, dayTitle, openEditorSignal, onToast }) => {
  const [script, setScript] = useState<VideoScript | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState(false);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try { setScript(await passportApi.getVideoScript(unitCode)); }
    catch { setErr('Could not load the script.'); }
    finally { setLoading(false); }
  }, [unitCode]);
  useEffect(() => { setScript(null); setEditing(false); setReading(false); load(); }, [load]);
  useEffect(() => { if (openEditorSignal) setEditing(true); }, [openEditorSignal]);

  const initial = useMemo<VideoScriptInput>(() => script
    ? { title: script.title, objective: script.objective, targetMinutes: script.targetMinutes, presenter: script.presenter, scenes: script.scenes.length ? script.scenes : [blankScene()], status: script.status }
    : { title: '', objective: '', targetMinutes: 10, presenter: '', scenes: [blankScene()], status: 'DRAFT' }, [script]);

  const save = async (body: VideoScriptInput) => {
    setSaving(true);
    try {
      const saved = await passportApi.saveVideoScript(unitCode, body);
      setScript(saved); setEditing(false); setReading(true);
      onToast('Script saved');
    } catch (e: any) {
      onToast(e?.response?.data?.message || 'Could not save the script');
    } finally { setSaving(false); }
  };
  const remove = async () => {
    if (!window.confirm('Delete this script? This cannot be undone.')) return;
    setSaving(true);
    try { await passportApi.deleteVideoScript(unitCode); setScript(null); setEditing(false); onToast('Script deleted'); }
    catch { onToast('Could not delete the script'); }
    finally { setSaving(false); }
  };

  const total = script ? script.scenes.reduce((n, s) => n + words(s.narration), 0) : 0;

  return <>
    {loading ? null : err ? <div className="vs-card vs-card-err"><i className="bi bi-exclamation-circle" /> {err}</div>
      : script && <section className="vs-card">
        <span className="vs-card-ic"><i className="bi bi-camera-reels" /></span>
        <div className="vs-card-txt">
          <b>Video script <span className="vs-admin">Admins only</span></b>
          <small>
            <span className={`vs-status s-${script.status.toLowerCase()}`}>{STATUS_LABEL[script.status]}</span>
            {script.scenes.length} scene{script.scenes.length === 1 ? '' : 's'} · about {fmtMin(minutesFor(total))} spoken
          </small>
        </div>
        <div className="vs-card-act">
          <button type="button" className="acb-btn sm" onClick={() => setReading(true)}><i className="bi bi-book" /> Read script</button>
          <button type="button" className="acb-btn sm ghost" onClick={() => setEditing(true)}><i className="bi bi-pencil" /> Edit</button>
        </div>
      </section>}

    {editing && <ScriptEditor initial={initial} dayTitle={dayTitle} unitCode={unitCode} exists={!!script} saving={saving}
      onClose={() => setEditing(false)} onSave={save} onDelete={remove} />}

    {reading && script && <div className="vs-reader" role="dialog" aria-label="Video script">
      <div className="vs-reader-bar">
        <b><i className="bi bi-camera-reels" /> Video script</b>
        <span className="vs-reader-sp" />
        <button type="button" className="acb-btn sm" onClick={() => window.print()}><i className="bi bi-printer" /> Print</button>
        <button type="button" className="acb-btn sm" onClick={() => { setReading(false); setEditing(true); }}><i className="bi bi-pencil" /> Edit</button>
        <button type="button" className="acb-btn sm" onClick={() => setReading(false)}><i className="bi bi-x-lg" /> Close</button>
      </div>
      <div className="vs-reader-scroll"><ScriptSheet script={script} dayTitle={dayTitle} unitCode={unitCode} updated={script.updatedAt} /></div>
    </div>}
  </>;
};

export default VideoScriptPanel;
