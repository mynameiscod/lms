import React, { useEffect, useMemo, useState } from 'react';
import passportApi, { SkillNode, AdminSkill } from '../../api/passportApi';
import './adminSkillGraph.css';

/**
 * The canonical skill taxonomy.
 *
 * A tree on the left, a form on the right. Deliberately not a node-and-edge canvas: the
 * work here is reading a hierarchy and editing one node's fields, and a drag-and-drop
 * graph would be far more to build and considerably worse at both.
 *
 * The two relationships are shown separately because they answer different questions.
 * The tree is WHERE a skill lives; prerequisites are WHAT MUST COME FIRST, and they
 * frequently point across branches — Java OOP needs the language-agnostic OOP Concepts
 * from a different part of the tree entirely.
 *
 * This catalogue is shared by every tenant, which the header says plainly. An edit here is
 * not a local change, and an admin should not have to infer that.
 */

const BLANK = {
  key: '', name: '', description: '', parentKey: '', nodeType: 'SKILL',
  difficulty: 'FOUNDATION', aliases: '', displayOrder: 100,
  active: true, assessable: true, learnable: true, prerequisiteKeys: [] as string[],
};

const AdminSkillGraph: React.FC = () => {
  const [tree, setTree] = useState<SkillNode[]>([]);
  const [flat, setFlat] = useState<AdminSkill[]>([]);
  const [counts, setCounts] = useState({ total: 0, active: 0, assessable: 0, groups: 0 });
  const [difficulties, setDifficulties] = useState<string[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<string | null>(null);   // skill id, or 'new'
  const [form, setForm] = useState({ ...BLANK });
  const [prereqFilter, setPrereqFilter] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = () =>
    passportApi.listSkills()
      .then(r => {
        setTree(r.tree); setFlat(r.skills); setCounts(r.counts); setDifficulties(r.difficulties);
        // Top level expanded on arrival: the shape of the taxonomy is the first thing
        // somebody needs, and a fully collapsed tree shows nothing at all.
        setOpen(o => (Object.keys(o).length ? o : Object.fromEntries(r.tree.map(n => [n.key, true]))));
      })
      .catch(e => setErr(e?.response?.data?.message || 'Could not load the skill graph.'));

  useEffect(() => { load(); }, []);

  const byKey = useMemo(() => new Map(flat.map(s => [s.key, s])), [flat]);
  const editing = selected && selected !== 'new' ? flat.find(s => s.id === selected) : null;

  const openNew = (parentKey = '') => {
    setForm({ ...BLANK, parentKey });
    setSelected('new'); setErr('');
  };

  const openEdit = (key: string) => {
    const s = byKey.get(key);
    if (!s) return;
    setForm({
      key: s.key, name: s.name, description: s.description, parentKey: s.parentKey || '',
      nodeType: s.nodeType, difficulty: s.difficulty, aliases: (s.aliases || []).join(', '),
      displayOrder: s.displayOrder, active: s.active, assessable: s.assessable,
      learnable: s.learnable, prerequisiteKeys: [...(s.prerequisiteKeys || [])],
    });
    setSelected(s.id); setErr(''); setPrereqFilter('');
  };

  const suggest = (n: string) =>
    n.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  const onName = (name: string) =>
    setForm(f => ({
      ...f, name,
      key: selected === 'new' && (!f.key || f.key === suggest(f.name)) ? suggest(name) : f.key,
    }));

  const save = async () => {
    setBusy('save'); setErr(''); setMsg('');
    const body = {
      key: form.key, name: form.name, description: form.description,
      parentKey: form.parentKey || null, nodeType: form.nodeType, difficulty: form.difficulty,
      aliases: form.aliases.split(',').map(s => s.trim()).filter(Boolean),
      displayOrder: Number(form.displayOrder) || 100,
      active: form.active, assessable: form.assessable, learnable: form.learnable,
      prerequisiteKeys: form.prerequisiteKeys,
    };
    try {
      if (selected === 'new') await passportApi.createSkill(body);
      else await passportApi.updateSkill(selected!, body);
      await load();
      setSelected(null);
      setMsg(selected === 'new' ? 'Skill added.' : 'Saved.');
      setTimeout(() => setMsg(''), 3500);
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not save.'); }
    setBusy('');
  };

  const remove = async () => {
    if (!editing) return;
    if (!window.confirm(`Delete "${editing.name}"? Deactivating is usually safer.`)) return;
    setBusy('del'); setErr('');
    try { await passportApi.deleteSkill(editing.id); await load(); setSelected(null); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Could not delete.'); }
    setBusy('');
  };

  const runSeed = async () => {
    setBusy('seed'); setErr(''); setMsg('');
    try {
      const preview = await passportApi.seedSkills(true);
      if (!preview.inserted.length) { setMsg('Everything in the canonical taxonomy is already installed.'); setBusy(''); setTimeout(() => setMsg(''), 4000); return; }
      if (!window.confirm(`Install ${preview.inserted.length} missing skill(s)?\n\nNothing already here is changed — renamed and deactivated skills are left exactly as they are.`)) { setBusy(''); return; }
      const r = await passportApi.seedSkills(false);
      await load();
      setMsg(`Installed ${r.inserted.length} skill(s).`);
      setTimeout(() => setMsg(''), 4000);
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not install the taxonomy.'); }
    setBusy('');
  };

  const togglePrereq = (key: string) =>
    setForm(f => ({
      ...f,
      prerequisiteKeys: f.prerequisiteKeys.includes(key)
        ? f.prerequisiteKeys.filter(k => k !== key)
        : [...f.prerequisiteKeys, key],
    }));

  /** Candidates for parent/prerequisite: active, not the skill being edited. */
  const candidates = flat.filter(s => s.active && s.key !== form.key);
  const prereqMatches = candidates.filter(s =>
    !prereqFilter || s.name.toLowerCase().includes(prereqFilter.toLowerCase()) || s.key.includes(prereqFilter.toUpperCase()));

  const renderNode = (n: SkillNode, depth = 0): React.ReactNode => (
    <div key={n.key}>
      <div className={`sg-node${selected && byKey.get(n.key)?.id === selected ? ' on' : ''}${!n.active ? ' off' : ''}`}
        style={{ paddingLeft: 10 + depth * 18 }}>
        {n.children.length > 0 ? (
          <button className="tw" onClick={() => setOpen(o => ({ ...o, [n.key]: !o[n.key] }))}>
            <i className={`bi bi-chevron-${open[n.key] ? 'down' : 'right'}`} />
          </button>
        ) : <span className="tw" />}

        <button className="nm" onClick={() => openEdit(n.key)}>
          <span className={`ty ${n.nodeType === 'GROUP' ? 'grp' : ''}`}>{n.nodeType === 'GROUP' ? 'G' : 'S'}</span>
          <b>{n.name}</b>
          {!n.active && <em>inactive</em>}
          {!!n.prerequisiteKeys.length && (
            <i className="bi bi-diagram-2 pq" title={`Requires: ${n.prerequisiteKeys.join(', ')}`} />
          )}
        </button>
      </div>
      {open[n.key] && n.children.map(c => renderNode(c, depth + 1))}
    </div>
  );

  return (
    <div className="sg">
      <div className="sg-hd">
        <div>
          <h1>Skill Graph</h1>
          <p>
            The canonical skills CareerPilot understands, how they are grouped, and what
            depends on what. <b>Shared across every tenant</b> — a skill means the same
            thing everywhere, so an edit here applies platform-wide.
          </p>
        </div>
        <div className="acts">
          <button className="pm-btn ghost" disabled={!!busy} onClick={runSeed}>
            {busy === 'seed' ? 'Checking…' : 'Install missing'}
          </button>
          <button className="pm-btn primary" onClick={() => openNew()}>+ Add skill</button>
        </div>
      </div>

      {err && <div className="pm-msg err">{err}</div>}
      {msg && <div className="pm-msg ok">{msg}</div>}

      <div className="sg-sum">
        <div className="s"><b>{counts.total}</b><span>skills</span></div>
        <div className="s"><b>{counts.active}</b><span>active</span></div>
        <div className="s"><b>{counts.assessable}</b><span>measurable</span></div>
        <div className="s"><b>{counts.groups}</b><span>groups</span></div>
      </div>

      <div className="sg-body">
        {/* ── tree ── */}
        <div className="sg-tree">
          {tree.length === 0 && (
            <div className="sg-empty">
              <b>No skills yet.</b>
              <span>Use “Install missing” to add the canonical taxonomy.</span>
            </div>
          )}
          {tree.map(n => renderNode(n))}
        </div>

        {/* ── detail ── */}
        <div className="sg-detail">
          {!selected && (
            <div className="sg-hint">
              <i className="bi bi-diagram-3" />
              <b>Select a skill</b>
              <span>Pick one from the tree to edit it, or add a new one.</span>
            </div>
          )}

          {selected && (
            <>
              <h2>{selected === 'new' ? 'New skill' : form.name}</h2>

              <label>Name
                <input value={form.name} autoFocus onChange={e => onName(e.target.value)} />
              </label>

              <label>Key
                <input value={form.key} readOnly={selected !== 'new'} placeholder="JAVA_GENERICS"
                  onChange={e => setForm(f => ({ ...f, key: e.target.value.toUpperCase() }))} />
                <em>{selected === 'new'
                  ? 'Uppercase with underscores. Permanent once created.'
                  : 'Fixed — other configuration references it.'}</em>
              </label>

              <label>Description
                <input value={form.description} placeholder="What this skill actually covers."
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </label>

              <div className="row">
                <label className="grow">Sits under
                  <select value={form.parentKey} onChange={e => setForm(f => ({ ...f, parentKey: e.target.value }))}>
                    <option value="">— top level —</option>
                    {candidates.map(s => <option key={s.key} value={s.key}>{s.name}</option>)}
                  </select>
                </label>
                <label>Type
                  <select value={form.nodeType} onChange={e => setForm(f => ({ ...f, nodeType: e.target.value }))}>
                    <option value="SKILL">Skill</option>
                    <option value="GROUP">Group</option>
                  </select>
                  <em>Groups organise; skills are measured.</em>
                </label>
              </div>

              <div className="row">
                <label className="grow">Difficulty
                  <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}>
                    {difficulties.map(d => <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>)}
                  </select>
                  <em>Of the skill itself — not of any student.</em>
                </label>
                <label className="ord">Order
                  <input type="number" value={form.displayOrder}
                    onChange={e => setForm(f => ({ ...f, displayOrder: Number(e.target.value) }))} />
                </label>
              </div>

              <label>Aliases <em>comma separated, for search</em>
                <input value={form.aliases} onChange={e => setForm(f => ({ ...f, aliases: e.target.value }))} />
              </label>

              <div className="checks">
                <label className="chk"><input type="checkbox" checked={form.active}
                  onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} /> Active</label>
                <label className="chk"><input type="checkbox" checked={form.assessable}
                  onChange={e => setForm(f => ({ ...f, assessable: e.target.checked }))} /> Measurable</label>
                <label className="chk"><input type="checkbox" checked={form.learnable}
                  onChange={e => setForm(f => ({ ...f, learnable: e.target.checked }))} /> Learnable</label>
              </div>

              {/* ── prerequisites ── */}
              <div className="sg-pq">
                <div className="hd">
                  <b>Prerequisites</b>
                  <span>What must come first. Separate from where the skill sits above — a
                    prerequisite often lives in another branch.</span>
                </div>

                {!!form.prerequisiteKeys.length && (
                  <div className="chosen">
                    {form.prerequisiteKeys.map(k => (
                      <button key={k} className="pill" onClick={() => togglePrereq(k)}>
                        {byKey.get(k)?.name || k} <i className="bi bi-x" />
                      </button>
                    ))}
                  </div>
                )}

                <input className="find" value={prereqFilter} placeholder="Search skills to add…"
                  onChange={e => setPrereqFilter(e.target.value)} />

                {!!prereqFilter && (
                  <div className="opts">
                    {prereqMatches.slice(0, 12).map(s => (
                      <button key={s.key} className={form.prerequisiteKeys.includes(s.key) ? 'on' : ''}
                        onClick={() => togglePrereq(s.key)}>
                        {s.name} <em>{s.key}</em>
                      </button>
                    ))}
                    {!prereqMatches.length && <div className="none">Nothing matches.</div>}
                  </div>
                )}
              </div>

              <div className="sg-acts">
                <button className="pm-btn ghost" onClick={() => setSelected(null)}>Cancel</button>
                {editing && !editing.systemSkill && (
                  <button className="pm-btn danger" disabled={!!busy} onClick={remove}>Delete</button>
                )}
                <button className="pm-btn primary" disabled={!!busy || !form.name.trim() || !form.key.trim()} onClick={save}>
                  {busy === 'save' ? 'Saving…' : selected === 'new' ? 'Add skill' : 'Save'}
                </button>
              </div>

              {editing?.systemSkill && (
                <p className="sg-sys">
                  <i className="bi bi-shield-check" /> Part of the canonical taxonomy. It can be
                  edited and deactivated, but not deleted.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSkillGraph;
