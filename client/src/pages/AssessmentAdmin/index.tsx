import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { assessmentAdminApi, AdminAssessmentItem, DIMENSIONS, ITEM_TYPES } from '../../api/assessmentAdminApi';
import './AssessmentAdmin.css';

const labelOf = (arr: { value: string; label: string }[], v: string) => arr.find((x) => x.value === v)?.label || v;

const blank = (): AdminAssessmentItem => ({
  type: 'mcq', dimension: 'fundamentals', difficulty: 2, prompt: '', points: 1, active: true,
  options: [{ id: 'a', text: '' }, { id: 'b', text: '' }], correctOptionIds: [],
});

const AssessmentAdmin: React.FC = () => {
  const [items, setItems] = useState<AdminAssessmentItem[]>([]);
  const [coverage, setCoverage] = useState<any>(null);
  const [filters, setFilters] = useState<{ dimension?: string; type?: string; active?: string; search?: string }>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminAssessmentItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [genOpen, setGenOpen] = useState(false);
  const [gen, setGen] = useState({ type: 'mcq', dimension: 'fundamentals', difficulty: 2, language: 'Java', count: 3 });
  const [genBusy, setGenBusy] = useState(false);
  const [genMsg, setGenMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, cov] = await Promise.all([assessmentAdminApi.list(filters), assessmentAdminApi.coverage()]);
      setItems(list || []);
      setCoverage(cov);
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const coverageGrid = useMemo(() => {
    const map: Record<string, number> = {};
    (coverage?.byCell || []).forEach((c: any) => { map[`${c._id.dimension}|${c._id.type}`] = c.count; });
    return map;
  }, [coverage]);

  const save = async () => {
    if (!editing) return;
    setSaving(true); setErr('');
    try {
      if (editing._id) await assessmentAdminApi.update(editing._id, editing);
      else await assessmentAdminApi.create(editing);
      setEditing(null);
      await load();
    } catch (e: any) { setErr(e.message || 'Save failed'); } finally { setSaving(false); }
  };

  const toggle = async (it: AdminAssessmentItem) => { if (it._id) { await assessmentAdminApi.toggle(it._id); await load(); } };
  const remove = async (it: AdminAssessmentItem) => { if (it._id && window.confirm('Delete this item?')) { await assessmentAdminApi.remove(it._id); await load(); } };

  const up = (patch: Partial<AdminAssessmentItem>) => setEditing((e) => (e ? { ...e, ...patch } : e));

  const runGenerate = async () => {
    setGenBusy(true); setGenMsg('');
    try {
      const items = await assessmentAdminApi.generate(gen);
      setGenMsg(`✓ Generated ${items.length} validated item(s).`);
      await load();
    } catch (e: any) { setGenMsg(e.message || 'Generation failed'); } finally { setGenBusy(false); }
  };

  return (
    <div className="aa-page">
      <div className="aa-header">
        <div>
          <h1>Assessment — Question Bank</h1>
          <p>Author and manage the skill-assessment items. {coverage ? `${coverage.activeTotal}/${coverage.total} active.` : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="aa-btn" onClick={() => { setGenOpen(true); setGenMsg(''); }}>✨ Generate with AI</button>
          <button className="aa-btn primary" onClick={() => setEditing(blank())}>+ New Item</button>
        </div>
      </div>

      {/* Coverage matrix */}
      {coverage && (
        <div className="aa-coverage">
          <table>
            <thead><tr><th>Dimension \ Type</th>{ITEM_TYPES.map((t) => <th key={t.value}>{t.label}</th>)}</tr></thead>
            <tbody>
              {DIMENSIONS.map((d) => (
                <tr key={d.value}>
                  <td className="dim">{d.label}</td>
                  {ITEM_TYPES.map((t) => {
                    const n = coverageGrid[`${d.value}|${t.value}`] || 0;
                    return <td key={t.value} className={`cell ${n === 0 ? 'empty' : n < 3 ? 'low' : 'ok'}`}>{n}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Filters */}
      <div className="aa-filters">
        <select value={filters.dimension || ''} onChange={(e) => setFilters((f) => ({ ...f, dimension: e.target.value || undefined }))}>
          <option value="">All dimensions</option>{DIMENSIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
        <select value={filters.type || ''} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value || undefined }))}>
          <option value="">All types</option>{ITEM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filters.active || ''} onChange={(e) => setFilters((f) => ({ ...f, active: e.target.value || undefined }))}>
          <option value="">Active & inactive</option><option value="true">Active only</option><option value="false">Inactive only</option>
        </select>
        <input placeholder="Search prompt…" value={filters.search || ''} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))} />
      </div>

      {err && <div className="aa-err">{err}</div>}

      {/* List */}
      <div className="aa-table-wrap">
        {loading ? <div className="aa-msg">Loading…</div> : items.length === 0 ? <div className="aa-msg">No items. Create one to get started.</div> : (
          <table className="aa-table">
            <thead><tr><th>Type</th><th>Dimension</th><th>Diff</th><th>Prompt</th><th>Pts</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {items.map((it) => (
                <tr key={it._id} className={it.active ? '' : 'inactive'}>
                  <td><span className="aa-tag">{labelOf(ITEM_TYPES, it.type)}</span></td>
                  <td>{labelOf(DIMENSIONS, it.dimension)}</td>
                  <td>{it.difficulty}</td>
                  <td className="prompt">{it.prompt}</td>
                  <td>{it.points ?? 1}</td>
                  <td><span className={`aa-dot ${it.active ? 'on' : 'off'}`} />{it.active ? 'Active' : 'Off'}</td>
                  <td className="actions">
                    <button onClick={() => setEditing(JSON.parse(JSON.stringify(it)))}>Edit</button>
                    <button onClick={() => toggle(it)}>{it.active ? 'Disable' : 'Enable'}</button>
                    <button className="danger" onClick={() => remove(it)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && <Editor item={editing} up={up} onSave={save} onCancel={() => { setEditing(null); setErr(''); }} saving={saving} err={err} />}

      {genOpen && (
        <div className="aa-overlay" onClick={() => !genBusy && setGenOpen(false)}>
          <div className="aa-modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="aa-modal-head"><h3>✨ Generate with AI</h3><button onClick={() => !genBusy && setGenOpen(false)}>×</button></div>
            <div className="aa-modal-body">
              <p className="aa-section-sub" style={{ textAlign: 'left', margin: '0 0 12px', color: '#64748b', fontSize: 13 }}>
                Claude writes the items; code questions are <b>run on Piston</b> to lock in correct outputs and drop any that don't compile. They land here as drafts you can review/disable.
              </p>
              <div className="aa-row3">
                <label>Type
                  <select value={gen.type} onChange={(e) => setGen({ ...gen, type: e.target.value })}>{ITEM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
                </label>
                <label>Dimension
                  <select value={gen.dimension} onChange={(e) => setGen({ ...gen, dimension: e.target.value })}>{DIMENSIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}</select>
                </label>
                <label>Difficulty
                  <select value={gen.difficulty} onChange={(e) => setGen({ ...gen, difficulty: Number(e.target.value) })}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select>
                </label>
              </div>
              <div className="aa-row2">
                <label>Language (for code)
                  <input value={gen.language} onChange={(e) => setGen({ ...gen, language: e.target.value })} placeholder="Java / Python / SQL" />
                </label>
                <label>How many
                  <select value={gen.count} onChange={(e) => setGen({ ...gen, count: Number(e.target.value) })}>{[1, 2, 3, 5, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}</select>
                </label>
              </div>
              {genMsg && <div className={genMsg.startsWith('✓') ? 'aa-section-sub' : 'aa-err'} style={{ textAlign: 'left' }}>{genMsg}</div>}
              {genBusy && <div className="aa-section-sub" style={{ textAlign: 'left' }}>Generating &amp; validating… this can take up to a minute for code questions.</div>}
            </div>
            <div className="aa-modal-foot">
              <button className="aa-btn" onClick={() => setGenOpen(false)} disabled={genBusy}>Close</button>
              <button className="aa-btn primary" onClick={runGenerate} disabled={genBusy}>{genBusy ? 'Generating…' : 'Generate'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Editor modal ────────────────────────────────────────────────────────────
const Editor: React.FC<{ item: AdminAssessmentItem; up: (p: Partial<AdminAssessmentItem>) => void; onSave: () => void; onCancel: () => void; saving: boolean; err: string }> = ({ item, up, onSave, onCancel, saving, err }) => {
  const isCode = ['predict_output', 'debug', 'complete_code', 'live_code', 'sql'].includes(item.type);
  const isExec = item.type === 'live_code' || item.type === 'sql';

  // option / blank / testcase helpers
  const opts = item.options || [];
  const setOpt = (i: number, text: string) => { const n = [...opts]; n[i] = { ...n[i], text }; up({ options: n }); };
  const addOpt = () => up({ options: [...opts, { id: String.fromCharCode(97 + opts.length), text: '' }] });
  const toggleCorrect = (id: string) => { const cur = item.correctOptionIds || []; up({ correctOptionIds: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] }); };

  const tcs = item.testCases || [];
  const setTc = (i: number, patch: any) => { const n = [...tcs]; n[i] = { ...n[i], ...patch }; up({ testCases: n }); };
  const addTc = () => up({ testCases: [...tcs, { input: '', expectedOutput: '', hidden: true, weight: 1 }] });

  const blanks = item.blanks || [];
  const setBlank = (i: number, csv: string) => { const n = [...blanks]; n[i] = { ...n[i], acceptedAnswers: csv.split('|').map((s) => s.trim()).filter(Boolean) }; up({ blanks: n }); };
  const addBlank = () => up({ blanks: [...blanks, { id: `b${blanks.length + 1}`, acceptedAnswers: [] }] });

  return (
    <div className="aa-overlay" onClick={onCancel}>
      <div className="aa-modal" onClick={(e) => e.stopPropagation()}>
        <div className="aa-modal-head"><h3>{item._id ? 'Edit item' : 'New item'}</h3><button onClick={onCancel}>×</button></div>
        <div className="aa-modal-body">
          <div className="aa-row3">
            <label>Type
              <select value={item.type} onChange={(e) => up({ type: e.target.value as any })}>{ITEM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
            </label>
            <label>Dimension
              <select value={item.dimension} onChange={(e) => up({ dimension: e.target.value as any })}>{DIMENSIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}</select>
            </label>
            <label>Difficulty
              <select value={item.difficulty} onChange={(e) => up({ difficulty: Number(e.target.value) })}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select>
            </label>
          </div>

          <label className="full">Prompt
            <textarea rows={2} value={item.prompt} onChange={(e) => up({ prompt: e.target.value })} placeholder="The question / task statement" />
          </label>

          {isCode && (
            <div className="aa-row2">
              <label>Language
                <input value={item.language || ''} onChange={(e) => up({ language: e.target.value })} placeholder="java / python / javascript / sql" />
              </label>
              <label>Points
                <input type="number" value={item.points ?? 1} onChange={(e) => up({ points: Number(e.target.value) })} />
              </label>
            </div>
          )}

          {(item.type === 'predict_output' || item.type === 'debug' || item.type === 'complete_code') && (
            <label className="full">Code snippet
              <textarea className="mono" rows={6} value={item.codeSnippet || ''} onChange={(e) => up({ codeSnippet: e.target.value })} />
            </label>
          )}

          {item.type === 'mcq' && (
            <div className="aa-block">
              <div className="aa-block-head">Options (check the correct one(s))</div>
              {opts.map((o, i) => (
                <div className="aa-opt-row" key={o.id}>
                  <input type="checkbox" checked={(item.correctOptionIds || []).includes(o.id)} onChange={() => toggleCorrect(o.id)} />
                  <span className="key">{o.id.toUpperCase()}</span>
                  <input value={o.text} onChange={(e) => setOpt(i, e.target.value)} placeholder={`Option ${o.id.toUpperCase()}`} />
                </div>
              ))}
              <button className="aa-btn small" onClick={addOpt}>+ Option</button>
            </div>
          )}

          {item.type === 'predict_output' && (
            <label className="full">Expected output
              <textarea className="mono" rows={2} value={item.expectedOutput || ''} onChange={(e) => up({ expectedOutput: e.target.value })} />
            </label>
          )}

          {item.type === 'debug' && (
            <div className="aa-row2">
              <label>Buggy line number
                <input type="number" value={item.buggyLineNumber ?? ''} onChange={(e) => up({ buggyLineNumber: Number(e.target.value) })} />
              </label>
              <label>Bug explanation
                <input value={item.bugExplanation || ''} onChange={(e) => up({ bugExplanation: e.target.value })} />
              </label>
            </div>
          )}

          {item.type === 'complete_code' && (
            <div className="aa-block">
              <div className="aa-block-head">Blanks (accepted answers separated by | )</div>
              {blanks.map((b, i) => (
                <div className="aa-opt-row" key={b.id}>
                  <span className="key">{b.id}</span>
                  <input value={(b.acceptedAnswers || []).join(' | ')} onChange={(e) => setBlank(i, e.target.value)} placeholder="ArrayList | new ArrayList" />
                </div>
              ))}
              <button className="aa-btn small" onClick={addBlank}>+ Blank</button>
            </div>
          )}

          {isExec && (
            <div className="aa-block">
              <label className="full">Starter code
                <textarea className="mono" rows={4} value={item.starterCode || ''} onChange={(e) => up({ starterCode: e.target.value })} />
              </label>
              <div className="aa-block-head">Test cases (run against the candidate's code)</div>
              {tcs.map((tc, i) => (
                <div className="aa-tc-row" key={i}>
                  <input value={tc.input} onChange={(e) => setTc(i, { input: e.target.value })} placeholder="stdin input" />
                  <input value={tc.expectedOutput} onChange={(e) => setTc(i, { expectedOutput: e.target.value })} placeholder="expected output" />
                  <label className="hid"><input type="checkbox" checked={tc.hidden} onChange={(e) => setTc(i, { hidden: e.target.checked })} /> hidden</label>
                </div>
              ))}
              <button className="aa-btn small" onClick={addTc}>+ Test case</button>
            </div>
          )}

          <label className="aa-check"><input type="checkbox" checked={item.active !== false} onChange={(e) => up({ active: e.target.checked })} /> Active (included in exams)</label>
          {err && <div className="aa-err">{err}</div>}
        </div>
        <div className="aa-modal-foot">
          <button className="aa-btn" onClick={onCancel}>Cancel</button>
          <button className="aa-btn primary" disabled={saving} onClick={onSave}>{saving ? 'Saving…' : 'Save item'}</button>
        </div>
      </div>
    </div>
  );
};

export default AssessmentAdmin;
