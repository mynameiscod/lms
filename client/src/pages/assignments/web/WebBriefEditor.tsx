import React, { useRef, useState } from 'react';
import { assignmentApi, RubricItem } from '../../../api/assignmentApi';
import WebPreview from './WebPreview';
import {
  WebAssignmentConfig, WebStack, WebAsset, WebRequirement, CheckKind, STACKS, CHECK_KINDS,
  filesForStack, starterFiles, googleFontsLink, absoluteAssetUrl, defaultWebRubric,
} from './webStack';

let seq = 0;
const newId = (p: string) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

/**
 * The author's side of a web assignment: which stack, the design brief, mockups, the images the
 * student must use, colours, fonts, the checklist that is marked automatically, how the mark is split
 * between that checklist and the trainer's rubric, and the files the student starts with.
 */
const WebBriefEditor: React.FC<{
  value: WebAssignmentConfig;
  onChange: (next: WebAssignmentConfig) => void;
  title: string;
  totalPoints: number;
  rubric: RubricItem[];
  onRubric: (r: RubricItem[]) => void;
}> = ({ value: web, onChange, title, totalPoints, rubric, onRubric }) => {
  const set = (patch: Partial<WebAssignmentConfig>) => onChange({ ...web, ...patch });
  const [busy, setBusy] = useState<'' | 'ref' | 'asset'>('');
  const [err, setErr] = useState('');
  const [file, setFile] = useState(0);
  const refInput = useRef<HTMLInputElement>(null);
  const assetInput = useRef<HTMLInputElement>(null);

  const upload = async (list: FileList | null, into: 'referenceImages' | 'assets') => {
    if (!list?.length) return;
    setBusy(into === 'assets' ? 'asset' : 'ref'); setErr('');
    const added: WebAsset[] = [];
    try {
      for (const f of Array.from(list).slice(0, 10)) {
        const res = await assignmentApi.uploadAsset(f);
        added.push({ url: absoluteAssetUrl(res.data.data.path), name: f.name.replace(/\.[^.]+$/, '') });
      }
    } catch (e: any) {
      setErr(e.response?.data?.message || 'That image could not be uploaded.');
    } finally {
      setBusy('');
      if (added.length) set({ [into]: [...web[into], ...added] } as any);
    }
  };
  const addLink = (into: 'referenceImages' | 'assets') => {
    const url = window.prompt('Paste the image link (https://…)');
    if (!url) return;
    if (!/^https?:\/\//i.test(url.trim())) { setErr('A link must start with http:// or https://'); return; }
    set({ [into]: [...web[into], { url: url.trim(), name: '' }] } as any);
  };
  const editAsset = (into: 'referenceImages' | 'assets', i: number, patch: Partial<WebAsset>) =>
    set({ [into]: web[into].map((a, j) => (j === i ? { ...a, ...patch } : a)) } as any);
  const removeAsset = (into: 'referenceImages' | 'assets', i: number) => {
    const gone = web[into][i];
    const next: Partial<WebAssignmentConfig> = { [into]: web[into].filter((_, j) => j !== i) } as any;
    if (into === 'assets') next.requirements = web.requirements.filter(r => !(r.kind === 'image' && r.value === gone.url));
    set(next);
  };
  const mustUse = (a: WebAsset) => web.requirements.some(r => r.kind === 'image' && r.value === a.url);
  const toggleMustUse = (a: WebAsset, on: boolean) => set({
    requirements: on
      ? [...web.requirements, { id: newId('img'), text: `Uses the image "${a.name || 'image'}"`, kind: 'image', value: a.url, points: 1 }]
      : web.requirements.filter(r => !(r.kind === 'image' && r.value === a.url)),
  });

  const setReq = (i: number, patch: Partial<WebRequirement>) =>
    set({ requirements: web.requirements.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const addReq = (r?: Partial<WebRequirement>) =>
    set({ requirements: [...web.requirements, { id: newId('r'), text: '', kind: 'element', selector: '', points: 1, ...r } as WebRequirement] });
  const hasCheck = (kind: CheckKind, value?: string) => web.requirements.some(r => r.kind === kind && (value === undefined || (r.value || '').toLowerCase() === value.toLowerCase()));
  const addDesignChecks = () => {
    const extra: WebRequirement[] = [];
    web.colors.forEach(c => { if (c.hex && !hasCheck('color', c.hex)) extra.push({ id: newId('c'), text: `Uses the ${c.name || 'brand'} colour ${c.hex}`, kind: 'color', value: c.hex, points: 1 }); });
    if (web.fonts[0] && !hasCheck('font', web.fonts[0].family)) extra.push({ id: newId('f'), text: `Uses the ${web.fonts[0].family} font`, kind: 'font', value: web.fonts[0].family, points: 1 });
    if (!hasCheck('responsive')) extra.push({ id: newId('m'), text: 'Works on a phone (viewport tag and a media query)', kind: 'responsive', points: 2 });
    set({ requirements: [...web.requirements, ...extra] });
  };

  const changeStack = (stack: WebStack) => {
    if (stack === web.stack) return;
    set({ stack, files: filesForStack(stack, web.files, web.fonts, title) });
    setFile(0);
  };
  const resetFiles = () => {
    if (!window.confirm('Replace the starter files with fresh ones for this stack (with the fonts linked)?')) return;
    set({ files: starterFiles(web.stack, web.fonts, title || 'My page') });
  };
  const files = filesForStack(web.stack, web.files, web.fonts, title);
  const editFile = (code: string) => set({ files: files.map((f, i) => (i === file ? { ...f, code } : f)) });

  const autoPts = Math.round(totalPoints * web.autoWeight / 100);
  const manualPts = totalPoints - autoPts;
  const rubricSum = rubric.reduce((s, r) => s + (Number(r.maxPoints) || 0), 0);
  const fontLink = googleFontsLink(web.fonts);

  const assetList = (into: 'referenceImages' | 'assets') => (
    <div className="wbe-assets">
      {web[into].map((a, i) => (
        <div key={`${a.url}-${i}`} className="wbe-asset">
          <img src={a.url} alt="" />
          <input className="wbe-input" value={a.name} placeholder={into === 'assets' ? 'Name, e.g. Logo' : 'Name, e.g. Desktop'} onChange={e => editAsset(into, i, { name: e.target.value })} aria-label="Image name" />
          <input className="wbe-input" value={a.note || ''} placeholder={into === 'assets' ? 'Where it goes (optional)' : 'Note (optional)'} onChange={e => editAsset(into, i, { note: e.target.value })} aria-label="Image note" />
          {into === 'assets' && (
            <label className="wbe-must"><input type="checkbox" checked={mustUse(a)} onChange={e => toggleMustUse(a, e.target.checked)} /> Must be used</label>
          )}
          <button type="button" className="wbe-btn danger wbe-icon" onClick={() => removeAsset(into, i)} aria-label="Remove image"><i className="bi bi-trash" /></button>
        </div>
      ))}
    </div>
  );

  return (
    <div className="wbe">
      {err && <div className="wbe-warn" role="alert">{err}</div>}

      <div className="wbe-card">
        <h4><i className="bi bi-stack" aria-hidden /> Stack</h4>
        <p className="wbe-sub">What the student builds with. It sets their files and what the preview loads for them.</p>
        <div className="wbe-stacks">
          {STACKS.map(s => (
            <button key={s.value} type="button" className={`wbe-stack${web.stack === s.value ? ' on' : ''}`} onClick={() => changeStack(s.value)} aria-pressed={web.stack === s.value}>
              <strong>{s.label}</strong><span>{s.hint}</span><span>{s.files.join(' · ')}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="wbe-card">
        <h4><i className="bi bi-card-text" aria-hidden /> Design brief</h4>
        <p className="wbe-sub">What a designer would hand a developer: the sections from top to bottom, what each holds, and how it behaves on a phone.</p>
        <textarea className="wbe-input wbe-text" value={web.brief} onChange={e => set({ brief: e.target.value })}
          placeholder={'Header: logo on the left, links Home · Courses · Contact on the right.\nHero: big heading, one line of text, a "Join now" button.\n…\nOn a phone the links fold into a menu button.'} />
      </div>

      <div className="wbe-card">
        <h4><i className="bi bi-image" aria-hidden /> Reference designs</h4>
        <p className="wbe-sub">Mockups or screenshots the page should look like (desktop and phone). Students see them beside their editor and can lay one over their page to compare.</p>
        {assetList('referenceImages')}
        <div className="wbe-row" style={{ marginTop: 8 }}>
          <input ref={refInput} type="file" accept="image/*" multiple hidden onChange={e => { upload(e.target.files, 'referenceImages'); e.target.value = ''; }} />
          <button type="button" className="wbe-btn" onClick={() => refInput.current?.click()} disabled={!!busy}><i className="bi bi-upload" /> {busy === 'ref' ? 'Uploading…' : 'Upload images'}</button>
          <button type="button" className="wbe-btn" onClick={() => addLink('referenceImages')}><i className="bi bi-link-45deg" /> Add a link</button>
        </div>
      </div>

      <div className="wbe-card">
        <h4><i className="bi bi-images" aria-hidden /> Images to use</h4>
        <p className="wbe-sub">The logo, photos and icons the page uses. Each gets a link the student copies into their code. Tick <b>Must be used</b> to check it automatically.</p>
        {assetList('assets')}
        <div className="wbe-row" style={{ marginTop: 8 }}>
          <input ref={assetInput} type="file" accept="image/*" multiple hidden onChange={e => { upload(e.target.files, 'assets'); e.target.value = ''; }} />
          <button type="button" className="wbe-btn" onClick={() => assetInput.current?.click()} disabled={!!busy}><i className="bi bi-upload" /> {busy === 'asset' ? 'Uploading…' : 'Upload images'}</button>
          <button type="button" className="wbe-btn" onClick={() => addLink('assets')}><i className="bi bi-link-45deg" /> Add a link</button>
        </div>
      </div>

      <div className="wbe-card">
        <h4><i className="bi bi-palette" aria-hidden /> Colours</h4>
        <p className="wbe-sub">The palette, shown to students as swatches they can copy.</p>
        {web.colors.map((c, i) => (
          <div key={i} className="wbe-row wbe-color">
            <input type="color" value={/^#[0-9a-f]{6}$/i.test(c.hex) ? c.hex : '#000000'} onChange={e => set({ colors: web.colors.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)) })} aria-label="Pick colour" />
            <input className="wbe-input" style={{ width: 110 }} value={c.hex} onChange={e => set({ colors: web.colors.map((x, j) => (j === i ? { ...x, hex: e.target.value.trim() } : x)) })} placeholder="#1e40af" aria-label="Colour code" />
            <input className="wbe-input" style={{ flex: '1 1 140px' }} value={c.name} onChange={e => set({ colors: web.colors.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} placeholder="Name, e.g. Primary" aria-label="Colour name" />
            <button type="button" className="wbe-btn danger wbe-icon" onClick={() => set({ colors: web.colors.filter((_, j) => j !== i) })} aria-label="Remove colour"><i className="bi bi-trash" /></button>
          </div>
        ))}
        <button type="button" className="wbe-btn" onClick={() => set({ colors: [...web.colors, { name: '', hex: '#051d64' }] })}><i className="bi bi-plus-lg" /> Add colour</button>
      </div>

      <div className="wbe-card">
        <h4><i className="bi bi-fonts" aria-hidden /> Fonts</h4>
        <p className="wbe-sub">Google Fonts names exactly as on fonts.google.com. Students get the <code>&lt;link&gt;</code> line to paste.</p>
        {web.fonts.map((f, i) => (
          <div key={i} className="wbe-row">
            <input className="wbe-input" style={{ flex: '1 1 160px' }} value={f.family} onChange={e => set({ fonts: web.fonts.map((x, j) => (j === i ? { ...x, family: e.target.value } : x)) })} placeholder="Poppins" aria-label="Font family" />
            <input className="wbe-input" style={{ width: 150 }} value={f.weights} onChange={e => set({ fonts: web.fonts.map((x, j) => (j === i ? { ...x, weights: e.target.value } : x)) })} placeholder="400;600;700" aria-label="Font weights" />
            <button type="button" className="wbe-btn danger wbe-icon" onClick={() => set({ fonts: web.fonts.filter((_, j) => j !== i) })} aria-label="Remove font"><i className="bi bi-trash" /></button>
          </div>
        ))}
        {web.fonts.length < 3 && <button type="button" className="wbe-btn" onClick={() => set({ fonts: [...web.fonts, { family: '', weights: '400;700' }] })}><i className="bi bi-plus-lg" /> Add font</button>}
        {fontLink && <p className="wbe-note"><code>{fontLink}</code></p>}
      </div>

      <div className="wbe-card">
        <h4><i className="bi bi-list-check" aria-hidden /> Checklist (marked automatically)</h4>
        <p className="wbe-sub">Each line is what the student reads; the check behind it is run on their page when they submit. Selectors can use tag, #id, .class, [attr=value], spaces and &gt;.</p>
        {web.requirements.length > 0 && (
          <div className="wbe-req-head"><span>Student reads</span><span>Check</span><span>Selector / value</span><span>Min</span><span>Points</span><span /></div>
        )}
        {web.requirements.map((r, i) => {
          const k = CHECK_KINDS.find(x => x.value === r.kind) || CHECK_KINDS[0];
          return (
            <div key={r.id} className="wbe-req">
              <input className="wbe-input" value={r.text} onChange={e => setReq(i, { text: e.target.value })} placeholder="A login form with an email field" aria-label="What the student reads" />
              <select className="wbe-input" value={r.kind} onChange={e => setReq(i, { kind: e.target.value as CheckKind })} aria-label="Check type">
                {CHECK_KINDS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              {k.needs === 'none' ? <span className="wbe-note" style={{ margin: 0 }}>Viewport tag + media query</span> : k.needs === 'both' ? (
                <div style={{ display: 'flex', gap: 6, minWidth: 0 }}>
                  <input className="wbe-input" value={r.value || ''} onChange={e => setReq(i, { value: e.target.value })} placeholder={k.placeholder} aria-label="Text" />
                  <input className="wbe-input" value={r.selector || ''} onChange={e => setReq(i, { selector: e.target.value })} placeholder="in (optional): button" aria-label="Inside selector" />
                </div>
              ) : k.value === 'image' ? (
                <select className="wbe-input" value={r.value || ''} onChange={e => setReq(i, { value: e.target.value })} aria-label="Image">
                  <option value="">Choose an image</option>
                  {web.assets.map((a, j) => <option key={j} value={a.url}>{a.name || `Image ${j + 1}`}</option>)}
                </select>
              ) : (
                <input className="wbe-input" value={(k.needs === 'selector' ? r.selector : r.value) || ''} placeholder={k.placeholder}
                  onChange={e => setReq(i, k.needs === 'selector' ? { selector: e.target.value } : { value: e.target.value })} aria-label="Selector or value" />
              )}
              <input className="wbe-input" type="number" min={1} value={r.kind === 'element' ? (r.min ?? '') : ''} disabled={r.kind !== 'element'} placeholder={r.kind === 'element' ? '1' : '–'}
                onChange={e => setReq(i, { min: e.target.value ? Math.max(1, Number(e.target.value)) : undefined })} aria-label="At least" />
              <input className="wbe-input" type="number" min={0} max={100} value={r.points} onChange={e => setReq(i, { points: Math.max(0, Number(e.target.value)) })} aria-label="Points" />
              <button type="button" className="wbe-btn danger wbe-icon" onClick={() => set({ requirements: web.requirements.filter((_, j) => j !== i) })} aria-label="Remove check"><i className="bi bi-trash" /></button>
            </div>
          );
        })}
        <div className="wbe-row">
          <button type="button" className="wbe-btn" onClick={() => addReq()}><i className="bi bi-plus-lg" /> Add check</button>
          <button type="button" className="wbe-btn" onClick={addDesignChecks} disabled={!web.colors.length && !web.fonts.length && hasCheck('responsive')}>
            <i className="bi bi-magic" /> Add checks for the colours, font and mobile layout
          </button>
        </div>
      </div>

      <div className="wbe-card">
        <h4><i className="bi bi-sliders" aria-hidden /> Marking</h4>
        <p className="wbe-sub">The checklist gives its share as soon as the student submits; the trainer's rubric gives the rest.</p>
        <div className="wbe-split">
          <input type="range" min={0} max={100} step={5} value={web.autoWeight} onChange={e => set({ autoWeight: Number(e.target.value) })} aria-label="Checklist share" />
          <span className="wbe-split-label">Checklist <b>{web.autoWeight}%</b> ({autoPts} pts) · Trainer rubric <b>{100 - web.autoWeight}%</b> ({manualPts} pts)</span>
        </div>
        {!web.requirements.length && web.autoWeight > 0 && (
          <p className="wbe-note">With no checklist lines, the rubric marks the whole assignment.</p>
        )}
        {manualPts > 0 && rubricSum !== manualPts && (
          <div className="wbe-warn" style={{ marginTop: 10 }}>
            The rubric adds up to {rubricSum} points; the trainer's share is {manualPts}.
            <button type="button" className="wbe-btn" style={{ marginLeft: 8 }} onClick={() => onRubric(rubric.length ? scaleRubric(rubric, manualPts) : defaultWebRubric(manualPts))}>
              {rubric.length ? `Scale the rubric to ${manualPts}` : 'Use the standard web rubric'}
            </button>
          </div>
        )}
        <label className="wbe-toggle" style={{ marginTop: 12 }}>
          <input type="checkbox" checked={web.aiFeedback} onChange={e => set({ aiFeedback: e.target.checked })} />
          AI comments on each submission (feedback only, never changes the mark)
        </label>
      </div>

      <div className="wbe-card">
        <h4><i className="bi bi-file-earmark-code" aria-hidden /> Starter files</h4>
        <p className="wbe-sub">What the student opens. Keep it to the boilerplate; the checklist is marked on what they add.</p>
        <div className="wbe-files">
          {files.map((f, i) => <button key={f.name} type="button" className={i === file ? 'on' : ''} onClick={() => setFile(i)}>{f.name}</button>)}
          <button type="button" onClick={resetFiles} title="Fresh starter files for this stack"><i className="bi bi-arrow-counterclockwise" /> Reset</button>
        </div>
        <textarea className="wbe-code" spellCheck={false} value={files[file]?.code || ''} onChange={e => editFile(e.target.value)} aria-label={`Starter ${files[file]?.name}`} />
        <div className="wbe-preview"><WebPreview stack={web.stack} files={files} title="Starter preview" /></div>
      </div>
    </div>
  );
};

function scaleRubric(r: RubricItem[], target: number): RubricItem[] {
  const sum = r.reduce((s, x) => s + (Number(x.maxPoints) || 0), 0) || r.length;
  let left = target;
  return r.map((x, i) => {
    const pts = i === r.length - 1 ? left : Math.round(((Number(x.maxPoints) || 1) / sum) * target);
    left -= pts;
    return { ...x, maxPoints: Math.max(0, pts) };
  });
}

export default WebBriefEditor;
