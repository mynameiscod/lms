import React, { useCallback, useEffect, useMemo, useState } from 'react';
import passportApi, { VideoScript, VideoScriptInput, VideoScriptScene, VideoScriptStatus } from '../../api/passportApi';
import './videoScript.css';
import { parseVideoScript } from './videoScriptParse';

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

const MAX_SCENES = 60;
const PASTE_EXAMPLE = `Scene 1: Hook — why folders exist
On screen: Presenter to camera.
Say: Every file on your laptop lives somewhere…
Notes: Slow down here.

Scene 2: The root
On screen: Terminal — run ls /
Say: This single slash is the root…`;
const sceneHasText = (x: VideoScriptScene) => !!(x.heading.trim() || x.visual.trim() || x.narration.trim() || x.notes.trim());

/**
 * Paste the whole script at once; it is split into scenes (videoScriptParse.ts) and shown before
 * anything changes, so the admin can see it was read the way they meant.
 */
const PasteScript: React.FC<{ hasScenes: boolean; onCancel: () => void; onUse: (r: ReturnType<typeof parseVideoScript>, mode: 'replace' | 'append') => void }> = ({ hasScenes, onCancel, onUse }) => {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'replace' | 'append'>('replace');
  const parsed = useMemo(() => parseVideoScript(text), [text]);
  const n = parsed.scenes.length;
  const spoken = parsed.scenes.reduce((k, x) => k + words(x.narration), 0);
  const tooMany = n > MAX_SCENES;
  return <section className="vs-paste">
    <div className="vs-paste-hd">
      <b><i className="bi bi-clipboard-check" /> Paste the whole script</b>
      <small>From Google Docs, Word, ChatGPT or plain text. It is split into scenes for you — check them below before using.</small>
    </div>
    <textarea className="vs-paste-box" rows={14} autoFocus value={text} onChange={e => setText(e.target.value)} spellCheck={false}
      placeholder={PASTE_EXAMPLE} />
    <details className="vs-paste-help">
      <summary>What it understands</summary>
      <ul>
        <li><b>New scene:</b> “Scene 1: heading”, “SCENE 2 – heading”, “Shot 3”, or a <code>## heading</code>. With none of these, each paragraph is a scene.</li>
        <li><b>On screen:</b> lines starting “On screen:”, “Visual:”, “Screen:”, “B-roll:”, or a whole line in [brackets].</li>
        <li><b>Say:</b> “Say:”, “Narration:”, “VO:”, “Voice-over:”. Text with no label is what is said.</li>
        <li><b>Notes:</b> “Notes:”, “Director:”, “Tip:”.</li>
        <li><b>A table</b> copied from Docs/Word or Markdown — one row per scene, columns On screen | Say (a Scene and a Notes column are fine too).</li>
        <li><b>Before the first scene:</b> “Title:”, “Presenter:”, “Objective:”, “Duration: 8 min” fill the details above.</li>
      </ul>
    </details>
    {text.trim() && <div className="vs-paste-out">
      <div className={`vs-paste-sum${n ? '' : ' none'}`}>
        {n ? <><i className="bi bi-check2-circle" /> Found <b>{n} scene{n === 1 ? '' : 's'}</b> · {spoken} words · about {fmtMin(minutesFor(spoken))} spoken
          {parsed.title && <> · title “{parsed.title}”</>}</>
          : <><i className="bi bi-exclamation-circle" /> No scenes found yet.</>}
      </div>
      {tooMany && <div className="acb-err"><i className="bi bi-exclamation-circle" /> A script holds at most {MAX_SCENES} scenes — this has {n}. Split it, or merge some scenes.</div>}
      {n > 0 && <ol className="vs-paste-list">
        {parsed.scenes.map((x, i) => <li key={i}>
          <b>Scene {i + 1}{x.heading ? ` — ${x.heading}` : ''}</b>
          {x.visual && <span><i className="bi bi-display" /> {x.visual.slice(0, 110)}{x.visual.length > 110 ? '…' : ''}</span>}
          {x.narration && <span><i className="bi bi-mic" /> {x.narration.slice(0, 140)}{x.narration.length > 140 ? '…' : ''}</span>}
          {x.notes && <span className="nt"><i className="bi bi-lightbulb" /> {x.notes.slice(0, 90)}{x.notes.length > 90 ? '…' : ''}</span>}
        </li>)}
      </ol>}
    </div>}
    {hasScenes && n > 0 && <div className="vs-paste-mode" role="radiogroup" aria-label="What to do with the scenes already written">
      <label><input type="radio" name="vs-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} /> Replace the scenes already written</label>
      <label><input type="radio" name="vs-mode" checked={mode === 'append'} onChange={() => setMode('append')} /> Add after them</label>
    </div>}
    <div className="vs-paste-act">
      <button type="button" className="acb-btn" onClick={onCancel}>Cancel</button>
      <button type="button" className="acb-btn primary" disabled={!n || tooMany} onClick={() => onUse(parsed, hasScenes ? mode : 'replace')}>
        <i className="bi bi-check2" /> Use {n ? `these ${n} scene${n === 1 ? '' : 's'}` : 'the scenes'}
      </button>
    </div>
  </section>;
};

const ScriptEditor: React.FC<{
  initial: VideoScriptInput; dayTitle: string; unitCode: string; exists: boolean; saving: boolean;
  onClose: () => void; onSave: (s: VideoScriptInput) => void; onDelete: () => void;
}> = ({ initial, dayTitle, unitCode, exists, saving, onClose, onSave, onDelete }) => {
  const [s, setS] = useState<VideoScriptInput>(initial);
  const [problem, setProblem] = useState('');
  const written = initial.scenes.some(sceneHasText);
  // A new script opens on the paste box: most scripts are written elsewhere first.
  const [pasting, setPasting] = useState(!written);
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

  const applyPasted = (r: ReturnType<typeof parseVideoScript>, mode: 'replace' | 'append') => {
    setS(prev => {
      const kept = prev.scenes.filter(sceneHasText);
      const scenes = mode === 'append' ? [...kept, ...r.scenes] : r.scenes;
      return {
        ...prev,
        scenes: scenes.slice(0, MAX_SCENES),
        // The details only fill what is still empty; nothing typed above is overwritten.
        title: prev.title || r.title || '',
        presenter: prev.presenter || r.presenter || '',
        objective: prev.objective || r.objective || '',
        targetMinutes: r.targetMinutes && (!prev.targetMinutes || prev.targetMinutes === 10) ? r.targetMinutes : prev.targetMinutes,
      };
    });
    setProblem(''); setPasting(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pasting) { setProblem('Press "Use these scenes" under the pasted script first, or Cancel it.'); return; }
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

        {pasting ? <PasteScript hasScenes={s.scenes.some(sceneHasText)} onCancel={() => setPasting(false)} onUse={applyPasted} /> : <>
        <div className="vs-paste-cta">
          <span><i className="bi bi-clipboard" /> Have the whole script already? Paste it in one go — it is split into scenes for you.</span>
          <button type="button" className="acb-btn sm" onClick={() => setPasting(true)}><i className="bi bi-clipboard-plus" /> Paste the whole script</button>
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
        </>}
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
