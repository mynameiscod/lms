import React, { useCallback, useEffect, useRef, useState } from 'react';
import { libraryApi, libError, KIND_LABEL, LibKind, LibItem, LibItemInput, SearchResult, Bundle } from '../../api/contentLibraryApi';
import { Modal, useToast } from '../ProblemBank/shared';
import '../ProblemBank/ProblemBank.css';

const KINDS = Object.keys(KIND_LABEL) as LibKind[];
const DIFF = ['easy', 'medium', 'hard'];
const diffPill = (d: string) => <span className="pb-pill" style={{ background: `var(--pb-${d}-soft)`, color: `var(--pb-${d})` }}>{d}</span>;

/* ── CSV import: kind,title,body,options,correct,answer,difficulty,subject,topic,tags ───────── */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim()));
}
function csvToItems(text: string): any[] {
  const [head, ...rest] = parseCsv(text);
  if (!head) return [];
  const col = head.map(x => x.trim().toLowerCase());
  return rest.map(r => {
    const g = (k: string) => (r[col.indexOf(k)] || '').trim();
    const opts = g('options') ? g('options').split('|').map(s => s.trim()).filter(Boolean) : [];
    const correct = g('correct').split('|').map(s => s.trim()).filter(Boolean);
    return {
      kind: g('kind') || 'mcq_single', title: g('title'), body: g('body'), answer: g('answer'),
      options: opts.map((t, i) => ({ text: t, isCorrect: correct.includes(String(i + 1)) || correct.includes(t) })),
      difficulty: g('difficulty') || 'medium', subject: g('subject'), topic: g('topic'), tags: g('tags').split('|').filter(Boolean),
    };
  });
}
const CSV_TEMPLATE = 'kind,title,body,options,correct,answer,difficulty,subject,topic,tags\n'
  + 'mcq_single,"Which keyword stops a loop?",,"break|skip|halt|exit",1,,easy,Java,Loops,java|loops\n'
  + 'short_answer,"What is a deadlock?",,,,"Two threads waiting on each other forever",medium,Java,Threads,java\n';

/* ── Item editor ──────────────────────────────────────────────────────────────────────────────── */
const blank = (): LibItemInput => ({ kind: 'mcq_single', title: '', body: '', options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }], answer: '', explanation: '', difficulty: 'medium', subject: '', topic: '', tags: [], marks: 1 });

const ItemEditor: React.FC<{ initial?: LibItem; canGlobal: boolean; onClose: () => void; onSaved: () => void; toast: (t: string, bad?: boolean) => void }> = ({ initial, canGlobal, onClose, onSaved, toast }) => {
  const [f, setF] = useState<LibItemInput>(initial ? { ...initial } : blank());
  const [tags, setTags] = useState((initial?.tags || []).join(', '));
  const [global, setGlobal] = useState(false);
  const [busy, setBusy] = useState(false);
  const mcq = f.kind === 'mcq_single' || f.kind === 'mcq_multiple';
  const set = (p: Partial<LibItemInput>) => setF(prev => ({ ...prev, ...p }));
  const setOpt = (i: number, p: any) => set({ options: (f.options || []).map((o, j) => {
    if (j === i) return { ...o, ...p };
    return p.isCorrect && f.kind === 'mcq_single' ? { ...o, isCorrect: false } : o;
  }) });

  const save = async () => {
    setBusy(true);
    try {
      const body = { ...f, tags: tags.split(',').map(s => s.trim()).filter(Boolean), ...(global ? { scope: 'global' as const } : {}) };
      if (initial) await libraryApi.update(initial._id, body); else await libraryApi.create(body);
      toast(initial ? 'Saved' : 'Added to your library'); onSaved(); onClose();
    } catch (e) { toast(libError(e), true); } finally { setBusy(false); }
  };

  return (
    <Modal wide title={initial ? 'Edit item' : 'Add item'} onClose={onClose}
      footer={<><button className="pb-btn" onClick={onClose}>Cancel</button><button className="pb-btn pb-btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <label>Type<select className="pb-select" disabled={!!initial} value={f.kind} onChange={e => set({ kind: e.target.value as LibKind })}>{KINDS.map(k => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select></label>
          <label>Difficulty<select className="pb-select" value={f.difficulty} onChange={e => set({ difficulty: e.target.value as any })}>{DIFF.map(d => <option key={d}>{d}</option>)}</select></label>
          <label>Marks<input className="pb-input" type="number" min={0} value={f.marks ?? 1} onChange={e => set({ marks: Number(e.target.value) })} /></label>
        </div>
        <label>Title / question<input className="pb-input" value={f.title || ''} onChange={e => set({ title: e.target.value })} /></label>
        <label>Details (optional)<textarea className="pb-textarea" rows={3} value={f.body || ''} onChange={e => set({ body: e.target.value })} /></label>
        {mcq && (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Options — tick the correct one{f.kind === 'mcq_multiple' ? 's' : ''}</div>
            {(f.options || []).map((o, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                <input type={f.kind === 'mcq_single' ? 'radio' : 'checkbox'} checked={o.isCorrect} onChange={e => setOpt(i, { isCorrect: e.target.checked })} aria-label={`Option ${i + 1} is correct`} />
                <input className="pb-input" value={o.text} onChange={e => setOpt(i, { text: e.target.value })} placeholder={`Option ${i + 1}`} />
                <button className="pb-btn pb-btn-ghost pb-btn-icon" onClick={() => set({ options: (f.options || []).filter((_, j) => j !== i) })} aria-label="Remove option"><i className="fa-solid fa-xmark" /></button>
              </div>
            ))}
            <button className="pb-btn pb-btn-sm" onClick={() => set({ options: [...(f.options || []), { text: '', isCorrect: false }] })}>+ Add option</button>
          </div>
        )}
        {!mcq && <label>{f.kind === 'coding' ? 'Expected solution / notes' : 'Answer'}<textarea className="pb-textarea" rows={3} value={f.answer || ''} onChange={e => set({ answer: e.target.value })} /></label>}
        <label>Explanation (optional)<textarea className="pb-textarea" rows={2} value={f.explanation || ''} onChange={e => set({ explanation: e.target.value })} /></label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <label>Subject<input className="pb-input" value={f.subject || ''} onChange={e => set({ subject: e.target.value })} placeholder="Java" /></label>
          <label>Topic<input className="pb-input" value={f.topic || ''} onChange={e => set({ topic: e.target.value })} placeholder="Arrays" /></label>
          <label>Tags (comma separated)<input className="pb-input" value={tags} onChange={e => setTags(e.target.value)} /></label>
        </div>
        {canGlobal && !initial && <label><input type="checkbox" checked={global} onChange={e => setGlobal(e.target.checked)} /> Publish as CodeBegun shared content (all institutes can clone it)</label>}
      </div>
    </Modal>
  );
};

/* ── Import dialog ────────────────────────────────────────────────────────────────────────────── */
const ImportDialog: React.FC<{ canGlobal: boolean; onClose: () => void; onDone: () => void; toast: (t: string, bad?: boolean) => void }> = ({ canGlobal, onClose, onDone, toast }) => {
  const [items, setItems] = useState<any[]>([]);
  const [global, setGlobal] = useState(false);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof libraryApi.importItems>> | null>(null);
  const [busy, setBusy] = useState(false);
  const scope = global ? 'global' as const : undefined;

  const load = async (file?: File) => {
    if (!file) return;
    const text = await file.text();
    let rows: any[] = [];
    try { rows = file.name.toLowerCase().endsWith('.json') ? JSON.parse(text) : csvToItems(text); } catch { toast('That file could not be read', true); return; }
    setItems(rows); setPreview(null);
    try { setPreview(await libraryApi.importItems(rows, true, scope)); } catch (e) { toast(libError(e), true); }
  };
  const commit = async () => {
    setBusy(true);
    try { const r = await libraryApi.importItems(items, false, scope); toast(`Imported ${r.imported} item(s)`); onDone(); onClose(); }
    catch (e) { toast(libError(e), true); } finally { setBusy(false); }
  };
  const download = () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: 'text/csv' })); a.download = 'problem-bundles-template.csv'; a.click();
  };
  return (
    <Modal title="Import items" onClose={onClose}
      footer={<><button className="pb-btn" onClick={onClose}>Close</button><button className="pb-btn pb-btn-primary" disabled={busy || !preview || !preview.total || preview.imported === 0} onClick={commit}>{busy ? 'Importing…' : `Import ${preview?.imported ?? 0} item(s)`}</button></>}>
      <p className="pb-muted">Upload a CSV or JSON file. Duplicates are skipped and every problem is shown before anything is saved.</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input type="file" accept=".csv,.json" onChange={e => load(e.target.files?.[0])} />
        <button className="pb-btn pb-btn-sm" onClick={download}>Download CSV template</button>
      </div>
      {canGlobal && <label style={{ display: 'block', marginBottom: 10 }}><input type="checkbox" checked={global} onChange={e => { setGlobal(e.target.checked); setPreview(null); }} /> Import as CodeBegun shared content</label>}
      {preview && (
        <div className="pb-card" style={{ padding: 12 }}>
          <div><b>{preview.total}</b> rows · <b style={{ color: 'var(--pb-ok)' }}>{preview.imported}</b> ready · {preview.duplicates} duplicate · <b style={{ color: preview.errorCount ? 'var(--pb-bad)' : undefined }}>{preview.errorCount}</b> with problems</div>
          {preview.errors.slice(0, 10).map(e => <div key={e.row} className="pb-muted" style={{ fontSize: 13 }}>Row {e.row}: {e.message}</div>)}
        </div>
      )}
    </Modal>
  );
};

/* ── Page ─────────────────────────────────────────────────────────────────────────────────────── */
const ProblemBundles: React.FC = () => {
  const { show, node } = useToast();
  const [tab, setTab] = useState<'library' | 'bundles'>('library');
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof libraryApi.meta>> | null>(null);
  const [q, setQ] = useState('');
  const [kinds, setKinds] = useState<string[]>([]);
  const [diffs, setDiffs] = useState<string[]>([]);
  const [source, setSource] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [page, setPage] = useState(1);
  const [res, setRes] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [editor, setEditor] = useState<{ item?: LibItem } | null>(null);
  const [importing, setImporting] = useState(false);
  const [bundles, setBundles] = useState<Bundle[] | null>(null);
  const [open, setOpen] = useState<Bundle | null>(null);
  const [bundleFilter, setBundleFilter] = useState<string>('');
  const seq = useRef(0);

  const loadMeta = useCallback(() => { libraryApi.meta().then(setMeta).catch(e => show(libError(e), true)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const loadBundles = useCallback(() => { libraryApi.bundles().then(setBundles).catch(e => show(libError(e), true)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadMeta(); loadBundles(); }, [loadMeta, loadBundles]);

  const run = useCallback(() => {
    const n = ++seq.current; setLoading(true);
    libraryApi.search({ q: q || undefined, kind: kinds.join(',') || undefined, difficulty: diffs.join(',') || undefined, source: source || undefined,
      subject: subject || undefined, topic: topic || undefined, bundleId: bundleFilter || undefined, page })
      .then(r => { if (n === seq.current) setRes(r); })
      .catch(e => show(libError(e), true)).finally(() => { if (n === seq.current) setLoading(false); });
  }, [q, kinds, diffs, source, subject, topic, bundleFilter, page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(run, q ? 250 : 0); return () => clearTimeout(t); }, [run, q]);
  useEffect(() => { setPage(1); }, [q, kinds, diffs, source, subject, topic, bundleFilter]);

  const toggle = (arr: string[], v: string, set: (a: string[]) => void) => set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  const refresh = () => { run(); loadMeta(); loadBundles(); };

  const cloneSel = async (ids: string[]) => {
    try { const r = await libraryApi.clone(ids); show(`${r.copied} item(s) are now in your own library`); setPicked(new Set()); refresh(); } catch (e) { show(libError(e), true); }
  };
  const addToBundle = async (bundleId: string) => {
    try {
      const globalPicked = (res?.items || []).filter(i => picked.has(i._id) && i.scope === 'global' && !i.myCopyId).map(i => i._id);
      let ids = Array.from(picked);
      if (globalPicked.length && !meta?.canEditGlobal) {
        const c = await libraryApi.clone(globalPicked);
        ids = ids.map(id => c.map[id] || id);
      }
      await libraryApi.updateBundle(bundleId, { addIds: ids.map(id => (res?.items.find(i => i._id === id)?.myCopyId) || id) });
      show('Added to bundle'); setPicked(new Set()); loadBundles();
    } catch (e) { show(libError(e), true); }
  };
  const newBundle = async () => {
    const name = window.prompt('Name for the new bundle');
    if (!name) return;
    try {
      const ids = Array.from(picked).map(id => res?.items.find(i => i._id === id)?.myCopyId || id);
      const globals = (res?.items || []).filter(i => picked.has(i._id) && i.scope === 'global' && !i.myCopyId).map(i => i._id);
      let finalIds = ids;
      if (globals.length && !meta?.canEditGlobal) { const c = await libraryApi.clone(globals); finalIds = ids.map(id => c.map[id] || id); }
      await libraryApi.createBundle({ name, itemIds: finalIds });
      show('Bundle created'); setPicked(new Set()); loadBundles(); loadMeta();
    } catch (e) { show(libError(e), true); }
  };
  const syncOld = async (scope?: 'global') => {
    try {
      const r = await libraryApi.sync(scope);
      const added = Object.values(r.report).reduce((s, x) => s + x.added, 0);
      show(added ? `Copied ${added} item(s) from your existing banks` : 'Nothing new to copy — your library is up to date'); refresh();
    } catch (e) { show(libError(e), true); }
  };
  const archive = async (i: LibItem) => {
    if (!window.confirm(`Remove "${i.title}" from your library? Bundles keep working.`)) return;
    try { await libraryApi.archive(i._id); show('Removed'); refresh(); } catch (e) { show(libError(e), true); }
  };

  const f = res?.facets;
  const count = (arr: { value: string; count: number }[] | undefined, v: string) => arr?.find(x => x.value === v)?.count;
  const empty = meta && !meta.counts.mine && !meta.counts.shared;

  return (
    <div className="pb-root"><div className="pb-page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1>Problem Bundles</h1>
          <div className="pb-muted">One place for every question and problem. Use CodeBegun's, clone what you like, and make it yours.</div>
        </div>
        <button className="pb-btn" onClick={() => syncOld()} title="Copies your existing Question Bank, Problem Bank and Interview questions here. Nothing is moved or changed.">Bring in my existing banks</button>
        {meta?.canEditGlobal && <button className="pb-btn" onClick={() => syncOld('global')} title="Copies CodeBegun's Problem Bank into the shared library every institute can clone.">Publish Problem Bank as shared</button>}
        <button className="pb-btn" onClick={() => setImporting(true)}>Import</button>
        <button className="pb-btn pb-btn-primary" onClick={() => setEditor({})}>+ Add item</button>
      </div>

      <div className="pb-chips" style={{ marginBottom: 14 }}>
        <button className={`pb-chip ${tab === 'library' ? 'on' : ''}`} onClick={() => setTab('library')}>Library {meta ? `(${meta.counts.mine + meta.counts.shared})` : ''}</button>
        <button className={`pb-chip ${tab === 'bundles' ? 'on' : ''}`} onClick={() => setTab('bundles')}>Bundles {meta ? `(${meta.counts.bundles})` : ''}</button>
      </div>

      {tab === 'library' && (<>
        {empty && <div className="pb-card" style={{ padding: 16, marginBottom: 12 }}>Nothing here yet. Click <b>Bring in my existing banks</b> to copy what you already have, or <b>Import</b> a file, or <b>+ Add item</b>.</div>}
        <div className="pb-card" style={{ padding: 12, marginBottom: 12 }}>
          <div className="pb-search" style={{ marginBottom: 10 }}>
            <input className="pb-input" placeholder="Search questions, topics, tags, companies…" value={q} onChange={e => setQ(e.target.value)} aria-label="Search" />
          </div>
          <div className="pb-chips" style={{ marginBottom: 8 }}>
            {KINDS.map(k => <button key={k} className={`pb-chip ${kinds.includes(k) ? 'on' : ''}`} onClick={() => toggle(kinds, k, setKinds)}>{KIND_LABEL[k]}{count(f?.kind, k) != null ? ` · ${count(f?.kind, k)}` : ''}</button>)}
          </div>
          <div className="pb-chips" style={{ marginBottom: 8 }}>
            {DIFF.map(d => <button key={d} className={`pb-chip ${diffs.includes(d) ? 'on' : ''}`} onClick={() => toggle(diffs, d, setDiffs)}>{d}{count(f?.difficulty, d) != null ? ` · ${count(f?.difficulty, d)}` : ''}</button>)}
            <span style={{ width: 12 }} />
            {[['', 'All'], ['codebegun', 'CodeBegun'], ['mine', 'My copies']].map(([v, l]) => <button key={v} className={`pb-chip ${source === v ? 'on' : ''}`} onClick={() => setSource(v)}>{l}</button>)}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select className="pb-select" style={{ width: 200 }} value={subject} onChange={e => setSubject(e.target.value)} aria-label="Subject"><option value="">All subjects</option>{f?.subject.map(s => <option key={s.value} value={s.value}>{s.value} ({s.count})</option>)}</select>
            <select className="pb-select" style={{ width: 200 }} value={topic} onChange={e => setTopic(e.target.value)} aria-label="Topic"><option value="">All topics</option>{f?.topic.map(s => <option key={s.value} value={s.value}>{s.value} ({s.count})</option>)}</select>
            <select className="pb-select" style={{ width: 220 }} value={bundleFilter} onChange={e => setBundleFilter(e.target.value)} aria-label="Bundle"><option value="">Any bundle</option>{bundles?.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}</select>
            {(kinds.length || diffs.length || source || subject || topic || bundleFilter || q) ? <button className="pb-btn pb-btn-ghost pb-btn-sm" onClick={() => { setQ(''); setKinds([]); setDiffs([]); setSource(''); setSubject(''); setTopic(''); setBundleFilter(''); }}>Clear all</button> : null}
          </div>
        </div>

        {picked.size > 0 && (
          <div className="pb-card" style={{ padding: 10, marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: 'var(--pb-accent-soft)' }}>
            <b>{picked.size} selected</b>
            <button className="pb-btn pb-btn-sm" onClick={() => cloneSel(Array.from(picked))}>Clone to my library</button>
            <select className="pb-select" style={{ width: 200 }} value="" onChange={e => e.target.value && addToBundle(e.target.value)} aria-label="Add to bundle">
              <option value="">Add to bundle…</option>{bundles?.filter(b => b.canEdit).map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
            <button className="pb-btn pb-btn-sm" onClick={newBundle}>New bundle from selection</button>
            <button className="pb-btn pb-btn-ghost pb-btn-sm" onClick={() => setPicked(new Set())}>Clear</button>
          </div>
        )}

        <div className="pb-card" style={{ opacity: loading ? .7 : 1 }}>
          {!res ? <div style={{ padding: 20 }} className="pb-muted">Loading…</div>
            : !res.items.length ? <div style={{ padding: 20 }} className="pb-muted">No matches. Try fewer filters or a different word.</div>
            : res.items.map(i => (
              <div key={i._id} style={{ display: 'flex', gap: 10, padding: '11px 14px', borderBottom: '1px solid var(--pb-line)', alignItems: 'flex-start' }}>
                <input type="checkbox" checked={picked.has(i._id)} aria-label={`Select ${i.title}`} style={{ marginTop: 4 }}
                  onChange={e => setPicked(p => { const n = new Set(p); e.target.checked ? n.add(i._id) : n.delete(i._id); return n; })} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 650 }}>{i.title}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5, alignItems: 'center' }}>
                    <span className="pb-pill pb-badge-neutral">{KIND_LABEL[i.kind]}</span>{diffPill(i.difficulty)}
                    {i.subject && <span className="pb-muted">{i.subject}{i.topic ? ` · ${i.topic}` : ''}</span>}
                    {i.scope === 'global' && <span className="pb-pill" style={{ background: 'var(--pb-accent-soft)', color: 'var(--pb-accent-ink)' }}>CodeBegun</span>}
                    {i.status === 'draft' && <span className="pb-pill pb-badge-warn">Draft</span>}
                    {i.tags.slice(0, 4).map(t => <span key={t} className="pb-faint">#{t}</span>)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {i.scope === 'global' && !meta?.canEditGlobal && (i.myCopyId
                    ? <span className="pb-pill pb-badge-ok">In your library</span>
                    : <button className="pb-btn pb-btn-sm" onClick={() => cloneSel([i._id])}>Clone</button>)}
                  {i.canEdit && <button className="pb-btn pb-btn-sm" onClick={() => setEditor({ item: i })}>Edit</button>}
                  {i.canEdit && <button className="pb-btn pb-btn-ghost pb-btn-sm pb-btn-danger" onClick={() => archive(i)}>Remove</button>}
                </div>
              </div>
            ))}
          {res && res.pages > 1 && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center', padding: 12 }}>
              <button className="pb-btn pb-btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <span className="pb-muted">Page {res.page} of {res.pages} · {res.total} items</span>
              <button className="pb-btn pb-btn-sm" disabled={page >= res.pages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          )}
        </div>
      </>)}

      {tab === 'bundles' && (
        <div>
          <div style={{ marginBottom: 12 }}>
            <button className="pb-btn pb-btn-primary" onClick={async () => {
              const name = window.prompt('Name for the new bundle'); if (!name) return;
              try { await libraryApi.createBundle({ name }); loadBundles(); loadMeta(); } catch (e) { show(libError(e), true); }
            }}>+ New bundle</button>
          </div>
          {!bundles ? <div className="pb-muted">Loading…</div> : !bundles.length ? <div className="pb-card" style={{ padding: 16 }}>No bundles yet. Select items in the Library and choose "New bundle from selection".</div> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {bundles.map(b => (
                <div key={b._id} className="pb-card" style={{ padding: 14 }}>
                  <div style={{ fontWeight: 700 }}>{b.name}</div>
                  <div className="pb-muted" style={{ margin: '4px 0 10px' }}>{b.itemCount} item(s){b.scope === 'global' ? ' · CodeBegun starter' : ''}</div>
                  {b.description && <div className="pb-faint" style={{ marginBottom: 10 }}>{b.description}</div>}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="pb-btn pb-btn-sm" onClick={() => libraryApi.bundle(b._id).then(setOpen).catch(e => show(libError(e), true))}>View</button>
                    <button className="pb-btn pb-btn-sm" onClick={() => { setBundleFilter(b._id); setTab('library'); }}>Open in library</button>
                    {b.scope === 'global' && !meta?.canEditGlobal && (b.myCopyId
                      ? <span className="pb-pill pb-badge-ok">You have a copy</span>
                      : <button className="pb-btn pb-btn-sm pb-btn-primary" onClick={async () => { try { const r = await libraryApi.cloneBundle(b._id); show(r.alreadyCloned ? 'Already in your bundles' : `Cloned with ${r.items} item(s)`); refresh(); } catch (e) { show(libError(e), true); } }}>Clone to mine</button>)}
                    {b.canEdit && <button className="pb-btn pb-btn-ghost pb-btn-sm pb-btn-danger" onClick={async () => { if (!window.confirm(`Delete bundle "${b.name}"? The items stay in your library.`)) return; try { await libraryApi.deleteBundle(b._id); refresh(); } catch (e) { show(libError(e), true); } }}>Delete</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {open && (
        <Modal title={open.name} onClose={() => setOpen(null)} wide>
          {open.description && <p className="pb-muted">{open.description}</p>}
          {(open.items || []).map(i => (
            <div key={i._id} style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--pb-line)', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>{i.title}</div><span className="pb-pill pb-badge-neutral">{KIND_LABEL[i.kind]}</span>{diffPill(i.difficulty)}
              {open.canEdit && <button className="pb-btn pb-btn-ghost pb-btn-sm pb-btn-danger" onClick={async () => { try { await libraryApi.updateBundle(open._id, { removeIds: [i._id] }); setOpen(await libraryApi.bundle(open._id)); loadBundles(); } catch (e) { show(libError(e), true); } }}>Remove</button>}
            </div>
          ))}
          {!open.items?.length && <div className="pb-muted">This bundle is empty.</div>}
        </Modal>
      )}
      {editor && <ItemEditor initial={editor.item} canGlobal={!!meta?.canEditGlobal} onClose={() => setEditor(null)} onSaved={refresh} toast={show} />}
      {importing && <ImportDialog canGlobal={!!meta?.canEditGlobal} onClose={() => setImporting(false)} onDone={refresh} toast={show} />}
      {node}
    </div></div>
  );
};

export default ProblemBundles;
