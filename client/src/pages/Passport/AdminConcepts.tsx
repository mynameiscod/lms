import React, { useCallback, useEffect, useMemo, useState } from 'react';
import passportApi, {
  ConceptRow, ConceptSummary, AudienceOptions, MaterialRow,
  MaterialAudience, emptyAudience, emptyBody,
} from '../../api/passportApi';
import MaterialForm, { Draft, blankDraft } from './ConceptMaterialForm';
import './concepts.css';

/**
 * Admin › Concept Bank — the material a concept can teach with.
 *
 * A concept here IS a CareerSkill. There are 72 of them and they already carry the
 * prerequisites, difficulty and domain the planner reasons about, so attaching material to
 * them is what makes the daily plan able to teach. A parallel "concept" taxonomy would have
 * been tidier to design and would never have reached a student.
 *
 * THE COVERAGE COUNT IS THE POINT OF THE LEFT COLUMN. "72 concepts" tells an admin nothing.
 * "61 concepts have no LEARN material" tells them where an afternoon is worth spending, and
 * every one of those 61 is a member being told to work on something in their own time.
 */

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
        // Targeting options are a convenience: the form still works from free text if the
        // lookup fails, so this must not take the whole screen down with it.
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
      setMsg({ kind: 'ok', text: 'Saved.' });
    } catch (e: any) {
      setMsg({ kind: 'err', text: e?.response?.data?.message || 'Could not save.' });
    }
    setBusy(false);
  };

  const remove = async (m: MaterialRow) => {
    if (!window.confirm(`Delete "${m.title || m.resourceType}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await passportApi.deleteMaterial(m.id);
      await Promise.all([loadMaterials(sel), loadConcepts()]);
      setMsg({ kind: 'ok', text: 'Deleted.' });
    } catch (e: any) {
      setMsg({ kind: 'err', text: e?.response?.data?.message || 'Could not delete.' });
    }
    setBusy(false);
  };

  if (loading) return <div className="cb-loading">Loading concepts…</div>;

  return (
    <div className="cb">
      <div className="cb-head">
        <div>
          <h1>Concept Bank</h1>
          <p>
            Everything a concept can teach with. Material added here is what the daily plan
            serves; a concept with no LEARN material leaves a member holding an instruction
            and nothing to open.
          </p>
        </div>
        {summary && (
          <div className="cb-summary">
            <div><b>{summary.total}</b><span>concepts</span></div>
            <div><b>{summary.withAnyMaterial}</b><span>have material</span></div>
            <div className={summary.missingLearn ? 'warn' : ''}>
              <b>{summary.missingLearn}</b><span>no LEARN material</span>
            </div>
          </div>
        )}
      </div>

      {msg && <div className={`cb-msg ${msg.kind}`}>{msg.text}</div>}

      <div className="cb-body">
        <aside className="cb-list">
          <input
            className="cb-search" placeholder="Search concepts…"
            value={q} onChange={e => setQ(e.target.value)} />
          <label className="cb-toggle">
            <input type="checkbox" checked={onlyGaps} onChange={e => setOnlyGaps(e.target.checked)} />
            Only concepts missing LEARN
          </label>

          <div className="cb-rows">
            {visible.map(c => (
              <button
                key={c.key}
                className={`cb-row${c.key === sel ? ' on' : ''}`}
                onClick={() => setSel(c.key)}>
                <span className="nm">{c.name}</span>
                <span className="tags">
                  {c.materialCount > 0
                    ? WORK_TYPES.filter(w => c.byWorkType[w]).map(w => (
                      <em key={w} className={`w-${w.toLowerCase()}`}>{w[0]}{c.byWorkType[w]}</em>
                    ))
                    : <em className="none">nothing yet</em>}
                  {c.missingLearn && c.materialCount > 0 && <em className="gap">no LEARN</em>}
                </span>
              </button>
            ))}
            {!visible.length && <div className="cb-empty">No concepts match.</div>}
          </div>
        </aside>

        <section className="cb-main">
          {!current ? <div className="cb-empty">Pick a concept.</div> : (
            <>
              <div className="cb-concept">
                <div>
                  <h2>{current.name}</h2>
                  <span className="key">
                    {current.key} · {current.domainKey}
                    {current.difficulty ? ` · ${current.difficulty}` : ''}
                  </span>
                </div>
                <button className="cb-primary" onClick={() => setDraft(blankDraft())}>
                  + Add material
                </button>
              </div>

              {current.missingLearn && (
                <div className="cb-warn">
                  This concept has no LEARN material. If the plan asks a member to learn it,
                  they get an instruction and nothing to open.
                </div>
              )}

              <div className="cb-materials">
                {materials.map(m => (
                  <div className={`cb-mat${m.active ? '' : ' off'}`} key={m.id}>
                    <div className="tx">
                      <b>{m.title || m.resourceTitle || '(untitled)'}</b>
                      <span className="meta">
                        <em className="ty">{TYPE_LABEL[m.resourceType] || m.resourceType}</em>
                        {m.workTypes.map(w => <em key={w} className={`w-${w.toLowerCase()}`}>{w}</em>)}
                        {m.language && <em>{m.language}</em>}
                        {!m.active && <em className="off">inactive</em>}
                        {m.resourceMissing && <em className="bad">target missing</em>}
                      </span>
                      <AudienceSummary audience={m.audience} scoreWindow={m.scoreWindow} />
                    </div>
                    <div className="ax">
                      <button onClick={() => edit(m)}>Edit</button>
                      <button className="danger" onClick={() => remove(m)}>Delete</button>
                    </div>
                  </div>
                ))}
                {!materials.length && <div className="cb-empty">Nothing yet for this concept.</div>}
              </div>

              {draft && (
                <MaterialForm
                  draft={draft} patch={patch} options={options}
                  busy={busy} onSave={save} onCancel={() => setDraft(null)} />
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};

/** One line saying who a material reaches, so the list is readable without opening each row. */
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
  return <span className="aud">{bits.length ? bits.join('  ·  ') : 'Everyone'}</span>;
};

export default AdminConcepts;
