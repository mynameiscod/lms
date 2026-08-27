import React, { useCallback, useEffect, useMemo, useState } from 'react';
import passportApi, {
  ConceptRow, ConceptSummary, AudienceOptions, MaterialRow,
  MaterialAudience, emptyAudience, emptyBody,
} from '../../api/passportApi';
import MaterialForm, { Draft, blankDraft } from './ConceptMaterialForm';
import './concepts.css';
import './conceptsLayoutFixes.css';

const WORK_TYPES = ['LEARN', 'PRACTICE', 'ASSESS', 'REVIEW'] as const;

export const TYPE_LABEL: Record<string, string> = {
  note: 'Notes', video: 'Video', link: 'Link', research: 'Research',
  practice: 'Practice Lab', problem: 'Coding problem', mock_interview: 'Mock interview',
};

const AdminConcepts: React.FC = () => {
  const [concepts, setConcepts] = useState<ConceptRow[]>([]);
  const [summary, setSummary] = useState<ConceptSummary | null>(null);
  const [options, setOptions] = useState<AudienceOptions | null>(null);
  const [sel, setSel] = useState<string>('');
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [q, setQ] = useState('');
  const [onlyGaps, setOnlyGaps] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const loadConcepts = useCallback(async () => {
    const r = await passportApi.listConcepts();
    setConcepts(r.concepts); setSummary(r.summary);
    return r.concepts;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const cs = await loadConcepts();
        if (cs.length) setSel(cs[0].key);
        try { setOptions(await passportApi.audienceOptions()); } catch { setOptions(null); }
      } catch (e: any) {
        setMsg({ kind: 'err', text: e?.response?.data?.message || 'Could not load concepts.' });
      }
      setLoading(false);
    })();
  }, [loadConcepts]);

  const loadMaterials = useCallback(async (key: string) => {
    if (!key) { setMaterials([]); return; }
    try {
      const r = await passportApi.listMaterials(key);
      setMaterials(r.resources);
    } catch { setMaterials([]); }
  }, []);

  useEffect(() => { loadMaterials(sel); setDraft(null); }, [sel, loadMaterials]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return concepts.filter(c =>
      (!onlyGaps || c.missingLearn)
      && (!needle || c.name.toLowerCase().includes(needle) || c.key.toLowerCase().includes(needle)));
  }, [concepts, q, onlyGaps]);

  const current = concepts.find(c => c.key === sel);
  const coveredPct = summary?.total ? Math.round((summary.withAnyMaterial / summary.total) * 100) : 0;
  const missingPct = summary?.total ? Math.round((summary.missingLearn / summary.total) * 100) : 0;
  const totalMaterials = concepts.reduce((n, c) => n + c.materialCount, 0);

  const patch = useCallback((fn: (d: Draft) => void) => {
    setDraft(prev => {
      if (!prev) return prev;
      const n = JSON.parse(JSON.stringify(prev)) as Draft;
      fn(n);
      return n;
    });
  }, []);

  const edit = (m: MaterialRow) => setDraft({
    id: m.id, resourceType: m.resourceType, resourceId: m.resourceId,
    title: m.title, description: m.description, url: m.url, fileKey: m.fileKey,
    language: m.language, workTypes: [...m.workTypes],
    audience: { ...emptyAudience(), ...(m.audience || {}) },
    scoreWindow: { min: m.scoreWindow?.min ?? null, max: m.scoreWindow?.max ?? null },
    body: { ...emptyBody(), ...(m.body || {}) },
    priority: m.priority, active: m.active,
  });

  const save = async () => {
    if (!draft || !sel) return;
    setBusy(true); setMsg(null);
    try {
      const payload = { ...draft, skillKey: sel };
      if (draft.id) await passportApi.updateMaterial(draft.id, payload);
      else await passportApi.createMaterial(payload);
      await Promise.all([loadMaterials(sel), loadConcepts()]);
      setDraft(null);
      setMsg({ kind: 'ok', text: draft.id ? 'Content updated successfully.' : 'Content added successfully.' });
    } catch (e: any) {
      setMsg({ kind: 'err', text: e?.response?.data?.message || 'Could not save content.' });
    }
    setBusy(false);
  };

  const remove = async (m: MaterialRow) => {
    if (!window.confirm(`Delete "${m.title || m.resourceType}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await passportApi.deleteMaterial(m.id);
      await Promise.all([loadMaterials(sel), loadConcepts()]);
      setMsg({ kind: 'ok', text: 'Content deleted.' });
    } catch (e: any) {
      setMsg({ kind: 'err', text: e?.response?.data?.message || 'Could not delete content.' });
    }
    setBusy(false);
  };

  if (loading) return <div className="cb-loading"><span className="cb-spinner" /> Loading concepts…</div>;

  if (draft && current) {
    return (
      <div className="cb cb-editor-page">
        <button className="cb-back" onClick={() => setDraft(null)}>
          <i className="bi bi-arrow-left" /> Back to Concepts
        </button>

        <div className="cb-editor-head">
          <div className="cb-title-icon"><i className="bi bi-journal-plus" /></div>
          <div>
            <span className="cb-eyebrow">CareerPilot · Concepts</span>
            <h1>{draft.id ? 'Edit Content' : 'Add Content'}</h1>
            <p>Add learning material for <b>{current.name}</b> and control how it is served in a member's plan.</p>
          </div>
          <div className="cb-editor-concept">
            <span>Selected concept</span>
            <b>{current.name}</b>
            <small>{current.key} · {current.domainKey}</small>
          </div>
        </div>

        {msg && <div className={`cb-msg ${msg.kind}`}>{msg.text}</div>}

        <MaterialForm
          draft={draft} patch={patch} options={options}
          busy={busy} onSave={save} onCancel={() => setDraft(null)} />
      </div>
    );
  }

  return (
    <div className="cb">
      <div className="cb-head">
        <div className="cb-head-copy">
          <div className="cb-title-icon"><i className="bi bi-book" /></div>
          <div>
            <span className="cb-eyebrow">CareerPilot · Knowledge Graph</span>
            <h1>Concepts</h1>
            <p>Manage the learning content attached to each CareerPilot skill so every roadmap action opens something useful.</p>
          </div>
        </div>
        <button className="cb-head-action" disabled={!current} onClick={() => setDraft(blankDraft())}>
          <i className="bi bi-plus-lg" /> Add Content
        </button>
      </div>

      {summary && (
        <div className="cb-kpis">
          <div className="cb-kpi kpi-blue"><span className="ic"><i className="bi bi-journals" /></span><div><small>Total Concepts</small><b>{summary.total}</b><em>Across CareerPilot</em></div></div>
          <div className="cb-kpi kpi-green"><span className="ic"><i className="bi bi-check-circle" /></span><div><small>With Content</small><b>{summary.withAnyMaterial}</b><em>{coveredPct}% coverage</em></div></div>
          <div className="cb-kpi kpi-orange"><span className="ic"><i className="bi bi-exclamation-circle" /></span><div><small>Missing LEARN</small><b>{summary.missingLearn}</b><em>{missingPct}% need attention</em></div></div>
          <div className="cb-kpi kpi-violet"><span className="ic"><i className="bi bi-collection-play" /></span><div><small>Total Content</small><b>{totalMaterials}</b><em>All mapped materials</em></div></div>
        </div>
      )}

      {msg && <div className={`cb-msg ${msg.kind}`}>{msg.text}</div>}

      <div className="cb-toolbar">
        <div className="cb-search-wrap"><i className="bi bi-search" /><input className="cb-search" placeholder="Search concepts by name or key…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <label className="cb-toggle">
          <input type="checkbox" checked={onlyGaps} onChange={e => setOnlyGaps(e.target.checked)} />
          <span>Only concepts missing LEARN content</span>
        </label>
        <span className="cb-result-count">{visible.length} of {concepts.length} concepts</span>
      </div>

      <div className="cb-body">
        <aside className="cb-list">
          <div className="cb-list-head"><span>Concept library</span><small>Select one to manage content</small></div>
          <div className="cb-rows">
            {visible.map(c => (
              <button key={c.key} className={`cb-row${c.key === sel ? ' on' : ''}`} onClick={() => setSel(c.key)}>
                <span className="cb-row-icon"><i className="bi bi-braces" /></span>
                <span className="cb-row-copy">
                  <span className="nm">{c.name}</span>
                  <span className="sub">{c.domainKey}{c.difficulty ? ` · ${c.difficulty}` : ''}</span>
                  <span className="tags">
                    {c.materialCount > 0
                      ? WORK_TYPES.filter(w => c.byWorkType[w]).map(w => <em key={w} className={`w-${w.toLowerCase()}`}>{w}: {c.byWorkType[w]}</em>)
                      : <em className="none">No content yet</em>}
                    {c.missingLearn && c.materialCount > 0 && <em className="gap">Missing LEARN</em>}
                  </span>
                </span>
                <i className="bi bi-chevron-right cb-row-arrow" />
              </button>
            ))}
            {!visible.length && <div className="cb-empty">No concepts match your filters.</div>}
          </div>
        </aside>

        <section className="cb-main">
          {!current ? <div className="cb-empty">Select a concept to manage its content.</div> : (
            <>
              <div className="cb-concept">
                <div className="cb-concept-title">
                  <span className="cb-concept-icon"><i className="bi bi-diagram-3" /></span>
                  <div><span className="cb-eyebrow">Selected concept</span><h2>{current.name}</h2><span className="key">{current.key} · {current.domainKey}{current.difficulty ? ` · ${current.difficulty}` : ''}</span></div>
                </div>
                <div className="cb-concept-stats">
                  <div><b>{current.materialCount}</b><span>Content items</span></div>
                  <div><b>{WORK_TYPES.filter(w => current.byWorkType[w]).length}</b><span>Work types</span></div>
                </div>
              </div>

              {current.missingLearn && (
                <div className="cb-warn"><i className="bi bi-exclamation-triangle" /><div><b>LEARN content is missing</b><span>If a roadmap asks a member to learn this concept, there is currently nothing useful to open.</span></div><button onClick={() => setDraft(blankDraft())}>Fix now</button></div>
              )}

              <div className="cb-section-head"><div><h3>Mapped Content</h3><p>Materials currently available for this concept.</p></div><span>{materials.length} item{materials.length === 1 ? '' : 's'}</span></div>

              <div className="cb-materials">
                {materials.map(m => (
                  <div className={`cb-mat${m.active ? '' : ' off'}`} key={m.id}>
                    <span className="cb-mat-icon"><i className={`bi ${m.resourceType === 'video' ? 'bi-play-btn' : m.resourceType === 'problem' ? 'bi-code-square' : m.resourceType === 'link' ? 'bi-link-45deg' : 'bi-file-earmark-text'}`} /></span>
                    <div className="tx">
                      <div className="cb-mat-title"><b>{m.title || m.resourceTitle || '(untitled)'}</b>{m.active ? <span className="status active">Active</span> : <span className="status inactive">Inactive</span>}</div>
                      {m.description && <p>{m.description}</p>}
                      <span className="meta">
                        <em className="ty">{TYPE_LABEL[m.resourceType] || m.resourceType}</em>
                        {m.workTypes.map(w => <em key={w} className={`w-${w.toLowerCase()}`}>{w}</em>)}
                        {m.language && <em>{m.language}</em>}
                        {m.resourceMissing && <em className="bad">Target missing</em>}
                      </span>
                      <AudienceSummary audience={m.audience} scoreWindow={m.scoreWindow} />
                    </div>
                    <div className="ax">
                      <button onClick={() => edit(m)}><i className="bi bi-pencil" /> Edit</button>
                      <button className="danger" onClick={() => remove(m)}><i className="bi bi-trash" /> Delete</button>
                    </div>
                  </div>
                ))}
                {!materials.length && (
                  <div className="cb-empty cb-empty-content"><i className="bi bi-folder2-open" /><b>No content mapped yet</b><span>Use the Add Content button above to add notes, video, practice, problems or links for this concept.</span></div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

const AudienceSummary: React.FC<{
  audience: MaterialAudience; scoreWindow: { min: number | null; max: number | null };
}> = ({ audience, scoreWindow }) => {
  const bits: string[] = [];
  const add = (label: string, list?: string[]) => {
    if (list && list.length) bits.push(`${label}: ${list.join(', ')}`);
  };
  add('Year', audience?.years); add('Course', audience?.courses);
  add('Branch', audience?.branches); add('Role', audience?.roles);
  add('Language', audience?.languages); add('Stage', audience?.stages);

  if (typeof scoreWindow?.min === 'number' || typeof scoreWindow?.max === 'number') {
    const lo = typeof scoreWindow.min === 'number' ? scoreWindow.min : 0;
    const hi = typeof scoreWindow.max === 'number' ? scoreWindow.max : 100;
    bits.push(`Score ${lo}–${hi}`);
  }
  return <span className="aud"><i className="bi bi-people" /> {bits.length ? bits.join('  ·  ') : 'Everyone'}</span>;
};

export default AdminConcepts;
