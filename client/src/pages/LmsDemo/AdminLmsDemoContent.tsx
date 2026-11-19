import React, { useEffect, useState } from 'react';
import { lmsDemoApi, demoErr, DemoConfig, DemoPick, DemoListKind, LIST_FIELD } from '../../api/lmsDemoApi';
import { DEMO_FEATURE_META } from '../../components/lmsDemo/demoFeatures';

/**
 * LMS Demo screen — the Features and Content tabs.
 *   Features  which platform features a demo student can use (My Learning Plan is always on).
 *   Content   exactly which problems, questions, quizzes, assignments, books, speaking tasks and
 *             interviews each feature shows, in order. Nothing else from the libraries is shown.
 */

/* ───────────────────────────── Features ───────────────────────────── */

export function FeaturesTab({ cfg, onSaved, onContent, onDirty }: { cfg: DemoConfig; onSaved: (c: DemoConfig) => void; onContent: () => void; onDirty?: (d: boolean) => void }) {
  const [on, setOn] = useState<Record<string, boolean>>(() => ({ ...(cfg.features || {}) }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const dirty = DEMO_FEATURE_META.some(f => !!on[f.key] !== !!(cfg.features as any)?.[f.key]);
  useEffect(() => { onDirty?.(dirty); }, [dirty, onDirty]);
  const counts = (cfg.content || {}) as Record<string, string[]>;
  const save = async () => {
    setBusy(true); setErr('');
    try { onSaved(await lmsDemoApi.saveConfig({ features: on })); } catch (e) { setErr(demoErr(e)); } finally { setBusy(false); }
  };
  const limitOf = (u?: string) => (u === 'ai' ? `${cfg.aiPerDay} AI questions a day` : u === 'mock' ? `${cfg.mockPerDay ?? 2} a day` : u === 'comm' ? `${cfg.commPerDay ?? 2} sessions a day` : '');
  return (
    <section className="ldm-card">
      <div className="ldm-card-head">
        <div>
          <h2>Features</h2>
          <p className="ldm-sub">What a demo student can use besides My Learning Plan (always on). A switched-off feature is not in their menu and the server refuses it. Pick what each one shows on the <button type="button" className="ldm-inline-link" onClick={onContent}>Content</button> tab.</p>
        </div>
        <span className="ldm-save-wrap">{dirty && <span className="ldm-unsaved"><i className="bi bi-exclamation-circle" /> Unsaved changes</span>}<button type="button" className="ldm-btn primary" onClick={save} disabled={busy || !dirty}>{busy ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}</button></span>
      </div>
      {err && <div className="ldm-alert">{err}</div>}
      <div className="ldm-feat-grid">
        <div className="ldm-feat on locked">
          <span className="ldm-feat-ic"><i className="bi bi-mortarboard" /></span>
          <div><b>My Learning Plan</b><span>The demo courses, every day open.</span><em>Always on</em></div>
        </div>
        {DEMO_FEATURE_META.map(f => {
          const n = f.list ? (counts[LIST_FIELD[f.list]] || []).length : null;
          return (
            <label key={f.key} className={`ldm-feat${on[f.key] ? ' on' : ''}`}>
              <span className="ldm-feat-ic"><i className={`bi ${f.icon}`} /></span>
              <div>
                <b>{f.label}</b>
                <span>{f.blurb}</span>
                <em>
                  {n !== null && (n ? `${n} chosen` : <span className="warn">Nothing chosen yet</span>)}
                  {n !== null && f.uses ? ' · ' : ''}
                  {f.uses ? limitOf(f.uses) : ''}
                </em>
              </div>
              <span className="ldm-switch"><input type="checkbox" checked={!!on[f.key]} onChange={e => setOn(o => ({ ...o, [f.key]: e.target.checked }))} aria-label={f.label} /><span /></span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

/* ───────────────────────────── Content ───────────────────────────── */

interface ListDef { kind: DemoListKind; title: string; what: string; max: number; filters?: 'difficulty' | 'thinking' }
const LISTS: ListDef[] = [
  { kind: 'problems', title: 'Coding Practice problems', what: 'problems', max: 200, filters: 'difficulty' },
  { kind: 'thinking', title: 'Thinking Lab questions', what: 'questions', max: 200, filters: 'thinking' },
  { kind: 'quizzes', title: 'Quizzes', what: 'quizzes', max: 50 },
  { kind: 'assignments', title: 'Assignments', what: 'assignments', max: 50 },
  { kind: 'books', title: 'Interview Question Books', what: 'books', max: 40 },
  { kind: 'speaking', title: 'Communication Lab tasks', what: 'tasks', max: 50 },
  { kind: 'interviews', title: 'Mock interviews', what: 'interviews', max: 20 },
];
const FEATURE_OF: Record<DemoListKind, string> = {
  problems: 'codingPractice', thinking: 'thinkingLab', quizzes: 'quizzes', assignments: 'assignments',
  books: 'questionBooks', speaking: 'communicationLab', interviews: 'mockInterview',
};
const idsOf = (p: Record<DemoListKind, DemoPick[]>) => JSON.stringify(Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v.map(x => x.id)])));

export function ContentTab({ cfg, onSaved, onDirty }: { cfg: DemoConfig; onSaved: (c: DemoConfig) => void; onDirty?: (d: boolean) => void }) {
  const [picked, setPicked] = useState<Record<DemoListKind, DemoPick[]> | null>(null);
  const [orig, setOrig] = useState('');
  const [open, setOpen] = useState<DemoListKind>('problems');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    lmsDemoApi.content().then(p => { setPicked(p); setOrig(idsOf(p)); }).catch(e => setErr(demoErr(e, 'Could not load the chosen content.')));
  }, []);
  const dirty = !!picked && idsOf(picked) !== orig;
  useEffect(() => { onDirty?.(dirty); }, [dirty, onDirty]);
  const save = async () => {
    if (!picked) return;
    setBusy(true); setErr('');
    try {
      const content: Record<string, string[]> = {};
      (Object.keys(picked) as DemoListKind[]).forEach(k => { content[LIST_FIELD[k]] = picked[k].map(x => x.id); });
      onSaved(await lmsDemoApi.saveConfig({ content }));
      setOrig(idsOf(picked));
    } catch (e) { setErr(demoErr(e)); } finally { setBusy(false); }
  };
  if (!picked) return <section className="ldm-card">{err ? <div className="ldm-alert">{err}</div> : <div className="ldm-empty"><div className="ldm-spin" /></div>}</section>;
  const L = LISTS.find(x => x.kind === open)!;
  return (
    <section className="ldm-card">
      <div className="ldm-card-head">
        <div><h2>Content</h2><p className="ldm-sub">Exactly what each feature shows a demo student — only these items, in this order. Quizzes and assignments placed on the demo courses' days open as well.</p></div>
        <span className="ldm-save-wrap">{dirty && <span className="ldm-unsaved"><i className="bi bi-exclamation-circle" /> Unsaved changes</span>}<button type="button" className="ldm-btn primary" onClick={save} disabled={busy || !dirty}>{busy ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}</button></span>
      </div>
      {err && <div className="ldm-alert">{err}</div>}
      <div className="ldm-content">
        <nav className="ldm-lists" aria-label="Lists">
          {LISTS.map(x => {
            const featOn = !!(cfg.features as any)?.[FEATURE_OF[x.kind]];
            return (
              <button key={x.kind} type="button" className={open === x.kind ? 'on' : ''} onClick={() => setOpen(x.kind)}>
                <span>{x.title}</span>
                <em>{picked[x.kind].length}{!featOn && <i className="bi bi-eye-slash" title="This feature is switched off" />}</em>
              </button>
            );
          })}
        </nav>
        <Picker key={L.kind} list={L} picked={picked[L.kind]} featureOn={!!(cfg.features as any)?.[FEATURE_OF[L.kind]]}
          onChange={p => setPicked(x => ({ ...(x as Record<DemoListKind, DemoPick[]>), [L.kind]: p }))} />
      </div>
    </section>
  );
}

function Picker({ list, picked, featureOn, onChange }: { list: ListDef; picked: DemoPick[]; featureOn: boolean; onChange: (p: DemoPick[]) => void }) {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [diff, setDiff] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<DemoPick[]>([]);
  const [more, setMore] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { const t = setTimeout(() => setQuery(q.trim()), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => { setPage(1); }, [query, diff, type]);
  useEffect(() => {
    let live = true;
    setLoading(true); setErr('');
    lmsDemoApi.options(list.kind, query, { page, difficulty: diff || undefined, type: type || undefined })
      .then(r => {
        if (!live) return;
        setRows(prev => (page === 1 ? r.items : [...prev, ...r.items]));
        setMore(!!r.hasMore);
        setTotal(typeof r.total === 'number' ? r.total : null);
      })
      .catch(e => { if (live) setErr(demoErr(e, 'Could not search.')); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [list.kind, query, diff, type, page]);
  const has = new Set(picked.map(p => p.id));
  const add = (r: DemoPick) => { if (!has.has(r.id) && picked.length < list.max) onChange([...picked, r]); };
  const remove = (id: string) => onChange(picked.filter(p => p.id !== id));
  const move = (i: number, d: number) => {
    const n = [...picked]; const j = i + d;
    if (j < 0 || j >= n.length) return;
    [n[i], n[j]] = [n[j], n[i]];
    onChange(n);
  };
  const meta = (r: DemoPick) => [r.number ? `#${r.number}` : '', r.category, r.difficulty].filter(Boolean).join(' · ');
  return (
    <div className="ldm-picker">
      {!featureOn && <div className="ldm-alert warn">This feature is switched off on the Features tab, so demo students will not see these yet.</div>}
      <div className="ldm-picker-cols">
        <div className="ldm-picker-col">
          <div className="ldm-picker-head"><b>Find {list.what}</b>{total !== null && <span className="ldm-sub">{total} found</span>}</div>
          <div className="ldm-picker-tools">
            <label className="ldm-search"><i className="bi bi-search" /><input value={q} onChange={e => setQ(e.target.value)} placeholder={`Search ${list.what}`} aria-label={`Search ${list.what}`} /></label>
            {list.filters && (
              <select value={diff} onChange={e => setDiff(e.target.value)} aria-label="Difficulty">
                <option value="">Any level</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
              </select>
            )}
            {list.filters === 'thinking' && (
              <select value={type} onChange={e => setType(e.target.value)} aria-label="Type">
                <option value="">Any type</option><option value="math">Maths</option><option value="logical">Logical</option><option value="critical">Critical</option><option value="coding">Coding</option>
              </select>
            )}
          </div>
          {err && <div className="ldm-alert">{err}</div>}
          <ul className="ldm-results">
            {rows.map(r => (
              <li key={r.id} className={has.has(r.id) ? 'in' : ''}>
                <div><b>{r.title}</b>{meta(r) && <span>{meta(r)}</span>}</div>
                {has.has(r.id)
                  ? <button type="button" className="ldm-btn sm ghost" onClick={() => remove(r.id)}><i className="bi bi-check2" /> Added</button>
                  : <button type="button" className="ldm-btn sm" onClick={() => add(r)} disabled={picked.length >= list.max}><i className="bi bi-plus-lg" /> Add</button>}
              </li>
            ))}
            {!loading && !rows.length && <li className="none">Nothing found{query ? ` for "${query}"` : ''}.</li>}
          </ul>
          {more && <button type="button" className="ldm-btn wide-soft" onClick={() => setPage(p => p + 1)} disabled={loading}>{loading ? 'Loading…' : 'Show more'}</button>}
          {loading && page === 1 && <div className="ldm-empty small"><div className="ldm-spin" /></div>}
        </div>
        <div className="ldm-picker-col chosen">
          <div className="ldm-picker-head">
            <b>Chosen ({picked.length} of {list.max})</b>
            {picked.length > 0 && <button type="button" className="ldm-inline-link" onClick={() => { if (window.confirm(`Remove all ${picked.length}?`)) onChange([]); }}>Clear all</button>}
          </div>
          {!picked.length ? (
            <div className="ldm-empty small"><i className="bi bi-inbox" /><span>Nothing chosen. Demo students will see an empty {list.title.toLowerCase()} page.</span></div>
          ) : (
            <ol className="ldm-chosen">
              {picked.map((p, i) => (
                <li key={p.id} className={p.live ? '' : 'dead'}>
                  <span className="n">{i + 1}</span>
                  <div><b>{p.title}</b>{!p.live ? <span className="warn">Deleted or unpublished — remove it</span> : (meta(p) ? <span>{meta(p)}</span> : null)}</div>
                  <span className="ldm-chosen-act">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"><i className="bi bi-chevron-up" /></button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === picked.length - 1} aria-label="Move down"><i className="bi bi-chevron-down" /></button>
                    <button type="button" onClick={() => remove(p.id)} aria-label="Remove"><i className="bi bi-x-lg" /></button>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
