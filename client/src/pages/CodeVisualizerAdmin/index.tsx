import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import visualizerApi, { VzGrant, VzItem, VzListItem, VzUserHit, vzError } from '../../api/visualizerApi';
import { CONCEPT_WIDGETS } from '../CodeVisualizer/concepts';
import '../CodeVisualizer/CodeVisualizer.css';

/**
 * Admin for the Code Visualizer: what is in the library, and who may use it.
 *
 * Access is off until granted — students see the module only through a row on the
 * "Who can use it" tab. Staff always have it, so they can author and teach with it.
 */

type Tab = 'library' | 'access';

const BLANK: Partial<VzItem> = {
  kind: 'problem', title: '', topic: 'Arrays', difficulty: 'easy', summary: '', order: 100, language: 'java',
  statement: '', examples: [], constraints: '',
  breakdown: { plainEnglish: '', input: '', output: '', walkthrough: [], steps: [], edgeCases: [] },
  starterCode: 'public class Main {\n    public static void main(String[] args) {\n        int[] arr = {5, 3, 8, 1};\n        \n    }\n}\n',
  solutionCode: '', stdin: '', animation: 'array_bars',
  timeComplexity: '', spaceComplexity: '', complexityNote: '', conceptWidget: '', body: '', published: true,
};

const lines = (a?: string[]) => (a || []).join('\n');
const toLines = (s: string) => s.split('\n').map(x => x.trim()).filter(Boolean);
/* Examples are edited as one per line: input | output | explanation */
const examplesToText = (ex?: VzItem['examples']) => (ex || []).map(e => [e.input, e.output, e.explanation].filter(x => x !== undefined && x !== '').join(' | ')).join('\n');
const textToExamples = (s: string) => toLines(s).map(l => {
  const [input = '', output = '', ...rest] = l.split('|').map(x => x.trim());
  return { input, output, explanation: rest.join(' | ') };
});

const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};

const CodeVisualizerAdmin: React.FC = () => {
  const [tab, setTab] = useState<Tab>('library');
  const [toast, setToast] = useState('');
  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 3000); };

  return (
    <div className="vz-root">
      <div className="vz-head">
        <h1>🔬 Code Visualizer — Manage</h1>
        <div className="vz-spacer" />
        <Link className="vz-btn" to="/visualizer">Open as a student →</Link>
      </div>
      <div className="vz-seg" style={{ marginBottom: 14 }}>
        <button className={`vz-seg-btn${tab === 'library' ? ' on' : ''}`} onClick={() => setTab('library')}>📚 Library</button>
        <button className={`vz-seg-btn${tab === 'access' ? ' on' : ''}`} onClick={() => setTab('access')}>🔑 Who can use it</button>
      </div>
      {tab === 'library' ? <LibraryTab flash={flash} /> : <AccessTab flash={flash} />}
      {toast && <div className="vz-toast">{toast}</div>}
    </div>
  );
};

/* ── Library ─────────────────────────────────────────────────────────────────────────────── */

const LibraryTab: React.FC<{ flash: (m: string) => void }> = ({ flash }) => {
  const [items, setItems] = useState<VzListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<Partial<VzItem>>(BLANK);
  const [exText, setExText] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await visualizerApi.admin.list()); } catch (e) { flash(vzError(e)); }
    setLoading(false);
  }, [flash]);
  useEffect(() => { load(); }, [load]);

  const open = async (id: string | 'new') => {
    setSelected(id); setTestMsg('');
    if (id === 'new') { setForm({ ...BLANK }); setExText(''); return; }
    try {
      const it = await visualizerApi.admin.get(id);
      setForm(it); setExText(examplesToText(it.examples));
    } catch (e) { flash(vzError(e)); }
  };

  const set = (k: keyof VzItem, v: any) => setForm(p => ({ ...p, [k]: v }));
  const setBd = (k: keyof VzItem['breakdown'], v: any) =>
    setForm(p => ({ ...p, breakdown: { ...(p.breakdown || BLANK.breakdown!), [k]: v } }));

  const save = async () => {
    if (!form.title?.trim()) { flash('Title is required.'); return; }
    setSaving(true);
    try {
      const body = { ...form, examples: textToExamples(exText) };
      if (selected === 'new') {
        const created = await visualizerApi.admin.create(body);
        setSelected(created._id); flash('Created.');
      } else if (selected) {
        await visualizerApi.admin.update(selected, body); flash('Saved.');
      }
      load();
    } catch (e) { flash(vzError(e)); }
    setSaving(false);
  };

  const remove = async () => {
    if (!selected || selected === 'new' || !window.confirm(`Delete "${form.title}"? This cannot be undone.`)) return;
    try { await visualizerApi.admin.remove(selected); setSelected(null); flash('Deleted.'); load(); } catch (e) { flash(vzError(e)); }
  };

  const seed = async () => {
    try {
      const r = await visualizerApi.admin.seed();
      flash(r.created ? `Installed ${r.created} starter item${r.created === 1 ? '' : 's'}.` : 'Starter library already installed.');
      load();
    } catch (e) { flash(vzError(e)); }
  };

  /** Run the reference solution through the real tracer, so an author knows it works before students do. */
  const testSolution = async () => {
    if (!form.solutionCode?.trim()) { setTestMsg('Add a solution first.'); return; }
    setTesting(true); setTestMsg('');
    try {
      const r = await visualizerApi.run(form.solutionCode, form.language || 'java', form.stdin || '');
      setTestMsg(r.ok
        ? `✅ Traced ${r.stats.steps} steps (${r.stats.comparisons} comparisons, ${r.stats.arrayWrites} array writes). Output: ${JSON.stringify(r.output.slice(0, 120))}`
        : `❌ ${r.message}${r.line ? ` (line ${r.line})` : ''}`);
    } catch (e) { setTestMsg(`❌ ${vzError(e)}`); }
    setTesting(false);
  };

  const isProblem = form.kind !== 'concept';
  const bd = form.breakdown || BLANK.breakdown!;

  return (
    <div className="vz-admin-grid">
      <div className="vz-card vz-admin-list">
        <div style={{ display: 'flex', gap: 8, padding: 12, borderBottom: '1px solid var(--vz-line)', flexWrap: 'wrap' }}>
          <button className="vz-btn vz-btn-primary" onClick={() => open('new')}>＋ New item</button>
          <button className="vz-btn" onClick={seed} title="Adds the built-in problems and concepts. Never overwrites your edits.">Install starter library</button>
        </div>
        {loading ? <div className="vz-empty">Loading…</div> : items.length === 0 ? (
          <div className="vz-empty">The library is empty. Click <b>Install starter library</b> to add 5 problems and 2 concepts.</div>
        ) : items.map(it => (
          <div key={it._id} className={`vz-admin-row${selected === it._id ? ' on' : ''}`} onClick={() => open(it._id)}>
            <span aria-hidden>{it.kind === 'concept' ? '💡' : '🧩'}</span>
            <div className="t"><b>{it.title}</b><small>{it.topic} · {it.difficulty}{it.published === false ? ' · hidden' : ''}</small></div>
          </div>
        ))}
      </div>

      <div className="vz-card">
        {!selected ? <div className="vz-empty">Select an item to edit, or create a new one.</div> : (
          <div className="vz-form">
            <div className="vz-form-row">
              <label className="vz-field"><span>Type</span>
                <select value={form.kind} onChange={e => set('kind', e.target.value)}>
                  <option value="problem">Problem (code to visualize)</option>
                  <option value="concept">Concept (animated lesson)</option>
                </select>
              </label>
              <label className="vz-field"><span>Title</span><input value={form.title || ''} onChange={e => set('title', e.target.value)} /></label>
              <label className="vz-field"><span>Topic</span><input value={form.topic || ''} onChange={e => set('topic', e.target.value)} placeholder="Arrays, Sorting, Searching…" /></label>
              <label className="vz-field"><span>Difficulty</span>
                <select value={form.difficulty} onChange={e => set('difficulty', e.target.value)}>
                  {['beginner', 'easy', 'medium', 'hard'].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>
              <label className="vz-field"><span>Order</span><input type="number" value={form.order ?? 0} onChange={e => set('order', Number(e.target.value))} /></label>
              <label className="vz-field"><span>Visible to students</span>
                <select value={form.published ? 'yes' : 'no'} onChange={e => set('published', e.target.value === 'yes')}>
                  <option value="yes">Published</option><option value="no">Hidden</option>
                </select>
              </label>
            </div>
            <label className="vz-field"><span>Summary</span><small>One line, shown on the library card.</small>
              <input value={form.summary || ''} onChange={e => set('summary', e.target.value)} />
            </label>

            {isProblem ? (
              <>
                <label className="vz-field"><span>Problem statement</span>
                  <textarea value={form.statement || ''} onChange={e => set('statement', e.target.value)} rows={5} />
                </label>
                <label className="vz-field"><span>Examples</span><small>One per line: input | output | explanation</small>
                  <textarea value={exText} onChange={e => setExText(e.target.value)} rows={3} />
                </label>
                <label className="vz-field"><span>Constraints</span><input value={form.constraints || ''} onChange={e => set('constraints', e.target.value)} /></label>

                <fieldset className="vz-fieldset">
                  <legend>🧩 Break it down — the ways a student can split the problem</legend>
                  <label className="vz-field"><span>Plain English</span><textarea value={bd.plainEnglish} onChange={e => setBd('plainEnglish', e.target.value)} rows={2} /></label>
                  <div className="vz-form-row">
                    <label className="vz-field"><span>Input (what you get)</span><textarea value={bd.input} onChange={e => setBd('input', e.target.value)} rows={2} /></label>
                    <label className="vz-field"><span>Output (what you return)</span><textarea value={bd.output} onChange={e => setBd('output', e.target.value)} rows={2} /></label>
                  </div>
                  <label className="vz-field"><span>Walk an example</span><small>One step per line — students reveal them one at a time.</small>
                    <textarea value={lines(bd.walkthrough)} onChange={e => setBd('walkthrough', e.target.value.split('\n'))} rows={4} /></label>
                  <label className="vz-field"><span>Plan the steps</span><small>One step per line.</small>
                    <textarea value={lines(bd.steps)} onChange={e => setBd('steps', e.target.value.split('\n'))} rows={4} /></label>
                  <label className="vz-field"><span>Edge cases</span><small>One per line.</small>
                    <textarea value={lines(bd.edgeCases)} onChange={e => setBd('edgeCases', e.target.value.split('\n'))} rows={3} /></label>
                </fieldset>

                <div className="vz-form-row">
                  <label className="vz-field"><span>Starter code (Java)</span><textarea className="code" value={form.starterCode || ''} onChange={e => set('starterCode', e.target.value)} /></label>
                  <label className="vz-field"><span>Reference solution (Java)</span><textarea className="code" value={form.solutionCode || ''} onChange={e => set('solutionCode', e.target.value)} /></label>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button className="vz-btn vz-btn-soft" onClick={testSolution} disabled={testing}>{testing ? '⏳ Tracing…' : '🧪 Test the solution in the tracer'}</button>
                  {testMsg && <span style={{ fontSize: 13 }}>{testMsg}</span>}
                </div>
                <div className="vz-form-row">
                  <label className="vz-field"><span>Array animation</span>
                    <select value={form.animation} onChange={e => set('animation', e.target.value)}>
                      <option value="array_bars">Bars (sorting — height = value)</option>
                      <option value="array_cells">Cells (searching)</option>
                      <option value="none">None</option>
                    </select>
                  </label>
                  <label className="vz-field"><span>Time complexity</span><input value={form.timeComplexity || ''} onChange={e => set('timeComplexity', e.target.value)} placeholder="O(n²)" /></label>
                  <label className="vz-field"><span>Space complexity</span><input value={form.spaceComplexity || ''} onChange={e => set('spaceComplexity', e.target.value)} placeholder="O(1)" /></label>
                </div>
                <label className="vz-field"><span>Complexity explanation</span><textarea value={form.complexityNote || ''} onChange={e => set('complexityNote', e.target.value)} rows={2} /></label>
              </>
            ) : (
              <>
                <label className="vz-field"><span>Animation</span>
                  <select value={form.conceptWidget || ''} onChange={e => set('conceptWidget', e.target.value)}>
                    <option value="">— choose —</option>
                    {Object.entries(CONCEPT_WIDGETS).map(([k, w]) => <option key={k} value={k}>{w.label}</option>)}
                  </select>
                </label>
                <label className="vz-field"><span>Explanation</span><small>Shown above the animation. Blank line = new paragraph.</small>
                  <textarea value={form.body || ''} onChange={e => set('body', e.target.value)} rows={6} />
                </label>
              </>
            )}

            <div className="vz-form-actions">
              <button className="vz-btn vz-btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              {selected !== 'new' && form.slug && <Link className="vz-btn" to={`/visualizer/${form.slug}`}>Preview →</Link>}
              <div className="vz-spacer" />
              {selected !== 'new' && <button className="vz-btn vz-btn-danger" onClick={remove}>Delete</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Access ──────────────────────────────────────────────────────────────────────────────── */

const TARGET_LABEL: Record<VzGrant['targetType'], string> = {
  all_lms: 'Everyone (LMS)', all_careerpilot: 'Everyone (CareerPilot)', batch: 'Batch', user: 'Person',
};

const AccessTab: React.FC<{ flash: (m: string) => void }> = ({ flash }) => {
  const [grants, setGrants] = useState<VzGrant[]>([]);
  const [batches, setBatches] = useState<{ _id: string; name: string }[]>([]);
  const [batchPick, setBatchPick] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<VzUserHit[]>([]);

  const load = useCallback(async () => {
    try { setGrants(await visualizerApi.admin.grants()); } catch (e) { flash(vzError(e)); }
  }, [flash]);

  useEffect(() => {
    load();
    axios.get('/api/v1/batches', { headers: authHeader() })
      .then(r => {
        const b = r.data?.data?.batches || r.data?.batches || r.data?.data || [];
        setBatches(Array.isArray(b) ? b : []);
      })
      .catch(() => setBatches([]));
  }, [load]);

  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const t = window.setTimeout(() => {
      visualizerApi.admin.searchUsers(q.trim()).then(setHits).catch(() => setHits([]));
    }, 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const grant = async (type: VzGrant['targetType'], ids: string[] = []) => {
    try {
      const r = await visualizerApi.admin.grant(type, ids);
      flash(r.created ? `Access given (${r.created}).` : 'Already had access.');
      load();
    } catch (e) { flash(vzError(e)); }
  };

  const revoke = async (g: VzGrant) => {
    if (!window.confirm(`Remove access for ${g.targetName || TARGET_LABEL[g.targetType]}?`)) return;
    try { await visualizerApi.admin.revoke(g._id); flash('Access removed.'); load(); } catch (e) { flash(vzError(e)); }
  };

  const hasAll = (t: VzGrant['targetType']) => grants.some(g => g.targetType === t);

  return (
    <div className="vz-admin-grid">
      <div>
        <div className="vz-card">
          <h3>Give access</h3>
          <p className="vz-muted" style={{ marginTop: 0 }}>Students only see the Code Visualizer once it is assigned here. Admins and instructors always have it.</p>
          <div style={{ display: 'grid', gap: 8 }}>
            <button className="vz-btn" disabled={hasAll('all_lms')} onClick={() => grant('all_lms')}>🎓 All LMS students{hasAll('all_lms') ? ' ✓' : ''}</button>
            <button className="vz-btn" disabled={hasAll('all_careerpilot')} onClick={() => grant('all_careerpilot')}>🚀 All CareerPilot members{hasAll('all_careerpilot') ? ' ✓' : ''}</button>
          </div>
        </div>

        <div className="vz-card">
          <h3>By batch</h3>
          <select multiple value={batchPick} onChange={e => setBatchPick(Array.from(e.target.selectedOptions).map(o => o.value))}
            style={{ width: '100%', minHeight: 140, border: '1px solid var(--vz-line)', borderRadius: 8, padding: 6 }}>
            {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
          <small className="vz-muted">Ctrl/Cmd-click to pick several.</small>
          <div style={{ marginTop: 8 }}>
            <button className="vz-btn vz-btn-primary" disabled={!batchPick.length} onClick={() => { grant('batch', batchPick); setBatchPick([]); }}>
              Give access to {batchPick.length || ''} batch{batchPick.length === 1 ? '' : 'es'}
            </button>
          </div>
        </div>

        <div className="vz-card">
          <h3>One person</h3>
          <input className="vz-search" style={{ width: '100%' }} placeholder="Search by name or email (LMS or CareerPilot)…" value={q} onChange={e => setQ(e.target.value)} />
          <div style={{ marginTop: 8 }}>
            {hits.map(u => (
              <div key={u.id} className="vz-hit" onClick={() => grant('user', [u.id])} role="button" tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter') grant('user', [u.id]); }}>
                <div style={{ flex: 1, minWidth: 0 }}><b>{u.name || u.email}</b><div className="vz-muted" style={{ fontSize: 12 }}>{u.email}</div></div>
                {u.lms && <span className="vz-pill lms">LMS</span>}
                {u.careerPilot && <span className="vz-pill cp">CareerPilot</span>}
                <span className="vz-btn vz-btn-soft">Give access</span>
              </div>
            ))}
            {q.trim().length >= 2 && hits.length === 0 && <div className="vz-muted">No students match.</div>}
          </div>
        </div>
      </div>

      <div className="vz-card">
        <h3>Current access ({grants.length})</h3>
        {grants.length === 0 ? <div className="vz-muted">Nobody yet — only staff can open the Code Visualizer.</div> : grants.map(g => (
          <div key={g._id} className="vz-grant">
            <span className={`vz-pill${g.targetType === 'all_careerpilot' ? ' cp' : g.targetType === 'all_lms' || g.targetType === 'batch' ? ' lms' : ''}`}>{TARGET_LABEL[g.targetType]}</span>
            <div className="t">{g.targetName || '—'}<div className="vz-muted" style={{ fontSize: 12 }}>since {new Date(g.createdAt).toLocaleDateString()}</div></div>
            <button className="vz-btn vz-btn-danger" onClick={() => revoke(g)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CodeVisualizerAdmin;
