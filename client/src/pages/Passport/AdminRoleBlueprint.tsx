import React, { useEffect, useMemo, useState } from 'react';
import passportApi, { BlueprintRoleRow, ResolvedBlueprint, BlueprintRequirement, SkillNode } from '../../api/passportApi';
import './adminRoleBlueprint.css';

/**
 * What each career role expects a job-ready candidate to know.
 *
 * Role first, then a table: an admin thinks "what should a backend engineer know?", not
 * "which roles want Java OOP?". Everything is editable inline and saved once, because
 * opening a modal twenty times to set twenty weights is the difference between a screen
 * somebody uses and one they avoid.
 *
 * This is configuration about a ROLE. Nothing here concerns any student — whether somebody
 * has these skills is a question this product cannot yet answer, and deliberately so.
 */

const IMPORTANCE_ORDER = ['ESSENTIAL', 'IMPORTANT', 'SUPPORTING', 'OPTIONAL'];
const title = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

const AdminRoleBlueprint: React.FC = () => {
  const [roles, setRoles] = useState<BlueprintRoleRow[]>([]);
  const [roleKey, setRoleKey] = useState('');
  const [bp, setBp] = useState<ResolvedBlueprint | null>(null);
  const [rows, setRows] = useState<BlueprintRequirement[]>([]);
  const [tree, setTree] = useState<SkillNode[]>([]);
  const [vocab, setVocab] = useState<any>(null);
  /**
   * Years come from the tenant's own onboarding configuration, not a constant here — an admin
   * who renamed "1st Year" would otherwise get a picker offering a value no student can hold.
   */
  const [yearOptions, setYearOptions] = useState<string[]>([]);
  /** Which requirement has its year panel open. The row is dense; this keeps it out of it. */
  const [yearsOpen, setYearsOpen] = useState<string | null>(null);
  const [gaps, setGaps] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);
  const [filter, setFilter] = useState('');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    passportApi.listRoleBlueprints()
      .then(r => {
        setRoles(r.roles);
        setGaps(r.suggestedTaxonomyAdditions || []);
        if (r.roles.length && !roleKey) setRoleKey(r.roles[0].key);
      })
      .catch(e => setErr(e?.response?.data?.message || 'Could not load roles.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!roleKey) return;
    setErr(''); setMsg('');
    passportApi.getRoleBlueprint(roleKey)
      .then(r => {
        setBp(r.blueprint); setRows(r.blueprint.requirements); setTree(r.skillTree);
        setVocab(r.vocabulary); setDirty(false); setPicking(false);
        passportApi.audienceOptions()
          .then(o => setYearOptions(o.years || []))
          // A picker with no options is a worse failure than one with the usual four, and the
          // blueprint itself must still load if the options call fails.
          .catch(() => setYearOptions(['1st Year', '2nd Year', '3rd Year', '4th Year']));
      })
      .catch(e => setErr(e?.response?.data?.message || 'Could not load that blueprint.'));
  }, [roleKey]);

  const mapped = useMemo(() => new Set(rows.map(r => r.skillKey)), [rows]);

  const patch = (skillKey: string, p: Partial<BlueprintRequirement>) => {
    setRows(rs => rs.map(r => (r.skillKey === skillKey ? { ...r, ...p } : r)));
    setDirty(true);
  };

  const remove = (skillKey: string) => {
    // Removes the REQUIREMENT only. The skill itself belongs to the shared graph and is
    // untouched, as is any other role expecting it.
    setRows(rs => rs.filter(r => r.skillKey !== skillKey));
    setDirty(true);
  };

  const add = (node: SkillNode) => {
    if (mapped.has(node.key)) { remove(node.key); return; }
    setRows(rs => [...rs, {
      skillKey: node.key, skillName: node.name, skillDescription: node.description,
      skillNodeType: node.nodeType, skillDifficulty: node.difficulty, parentKey: node.parentKey,
      skillActive: true, missing: false,
      importance: 'IMPORTANT', weight: vocab?.defaultWeights?.IMPORTANT ?? 7,
      targetLevel: 'WORKING', active: true, displayOrder: (rs.length + 1) * 10,
    } as BlueprintRequirement]);
    setDirty(true);
  };

  /** Importance drags the weight with it, unless the admin has already tuned that row. */
  const setImportance = (r: BlueprintRequirement, importance: string) => {
    const suggested = vocab?.defaultWeights?.[importance];
    const untouched = r.weight === vocab?.defaultWeights?.[r.importance];
    patch(r.skillKey, { importance, ...(untouched && suggested ? { weight: suggested } : {}) });
  };

  const save = async () => {
    setBusy('save'); setErr(''); setMsg('');
    try {
      const r = await passportApi.saveRoleBlueprint(roleKey, rows);
      setBp(r.blueprint); setRows(r.blueprint.requirements); setDirty(false);
      setMsg('Blueprint saved. No student data changed.');
      setTimeout(() => setMsg(''), 4000);
      passportApi.listRoleBlueprints().then(x => setRoles(x.roles)).catch(() => {});
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not save.'); }
    setBusy('');
  };

  const togglePublish = async () => {
    setBusy('pub'); setErr('');
    try {
      const r = await passportApi.publishRoleBlueprint(roleKey, !bp?.published);
      setBp(r.blueprint);
      passportApi.listRoleBlueprints().then(x => setRoles(x.roles)).catch(() => {});
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not change the status.'); }
    setBusy('');
  };

  const runSeed = async () => {
    setBusy('seed'); setErr(''); setMsg('');
    try {
      const preview = await passportApi.seedRoleBlueprints(true);
      if (!preview.inserted.length) { setMsg('Every role already has a blueprint.'); setBusy(''); setTimeout(() => setMsg(''), 4000); return; }
      const missing = Object.keys(preview.missingSkills || {}).length;
      if (!window.confirm(
        `Install default blueprints for ${preview.inserted.length} role(s)?\n\n` +
        `Roles that already have one are left exactly as they are.` +
        (missing ? `\n\n${missing} skill(s) in the defaults are not in the skill graph and will be skipped.` : ''),
      )) { setBusy(''); return; }
      const r = await passportApi.seedRoleBlueprints(false);
      setMsg(`Installed ${r.inserted.length} blueprint(s) as drafts.`);
      const list = await passportApi.listRoleBlueprints(); setRoles(list.roles);
      if (roleKey) { const b = await passportApi.getRoleBlueprint(roleKey); setBp(b.blueprint); setRows(b.blueprint.requirements); }
      setTimeout(() => setMsg(''), 5000);
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not install defaults.'); }
    setBusy('');
  };

  /** Flattened tree for the picker, keeping the group heading above its skills. */
  const pickerGroups = useMemo(() => {
    const out: { label: string; skills: SkillNode[] }[] = [];
    const walk = (n: SkillNode, path: string) => {
      const kids = n.children.filter(c => c.nodeType !== 'GROUP');
      if (kids.length) out.push({ label: path ? `${path} › ${n.name}` : n.name, skills: kids });
      n.children.filter(c => c.nodeType === 'GROUP').forEach(c => walk(c, path ? `${path} › ${n.name}` : n.name));
    };
    tree.forEach(n => walk(n, ''));
    if (!filter) return out;
    const f = filter.toLowerCase();
    return out
      .map(g => ({ ...g, skills: g.skills.filter(s => s.name.toLowerCase().includes(f) || s.key.includes(filter.toUpperCase())) }))
      .filter(g => g.skills.length);
  }, [tree, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const i of IMPORTANCE_ORDER) c[i] = rows.filter(r => r.active && r.importance === i).length;
    return c;
  }, [rows]);

  const current = roles.find(r => r.key === roleKey);

  return (
    <div className="rbp">
      <div className="rbp-hd">
        <div>
          <h1>Role Skill Blueprint</h1>
          <p>
            What a job-ready candidate for each role should know. This describes the
            destination — not what any particular student has, and not what they study next.
          </p>
        </div>
        <div className="acts">
          <button className="pm-btn ghost" disabled={!!busy} onClick={runSeed}>
            {busy === 'seed' ? 'Checking…' : 'Install defaults'}
          </button>
          <button className="pm-btn primary" disabled={!dirty || !!busy} onClick={save}>
            {busy === 'save' ? 'Saving…' : dirty ? 'Save blueprint' : 'Saved'}
          </button>
        </div>
      </div>

      {err && <div className="pm-msg err">{err}</div>}
      {msg && <div className="pm-msg ok">{msg}</div>}

      {/* ── role picker ── */}
      <div className="rbp-roles">
        {roles.map(r => (
          <button key={r.key} className={`rbp-role${roleKey === r.key ? ' on' : ''}`} onClick={() => setRoleKey(r.key)}>
            <b>{r.name}</b>
            <span>
              {r.blueprint.total ? `${r.blueprint.total} skills` : 'not configured'}
              {r.blueprint.published && <em> · live</em>}
            </span>
          </button>
        ))}
      </div>

      {bp && (
        <>
          <div className="rbp-sum">
            <div className="s"><b>{bp.summary.active}</b><span>skills expected</span></div>
            {IMPORTANCE_ORDER.map(i => (
              <div className="s" key={i}><b>{counts[i] || 0}</b><span>{title(i)}</span></div>
            ))}
            <div className="s"><b>{bp.summary.totalWeight}</b><span>total weight</span></div>
            <div className="s act">
              <span className={`badge${bp.published ? ' live' : ''}`}>{bp.published ? 'Published' : 'Draft'}</span>
              <button className="pm-btn ghost" disabled={!!busy || !rows.length} onClick={togglePublish}>
                {bp.published ? 'Return to draft' : 'Publish'}
              </button>
            </div>
          </div>

          {!!bp.summary.stale && (
            <div className="rbp-warn">
              <i className="bi bi-exclamation-triangle" />
              {bp.summary.stale} requirement{bp.summary.stale === 1 ? '' : 's'} point at a skill that has been
              deactivated or removed from the skill graph. They still work and can be edited — remove them when convenient.
            </div>
          )}

          {/* ── the table ── */}
          {rows.length === 0 && !picking && (
            <div className="rbp-empty">
              <b>{current?.name} has no skill blueprint yet.</b>
              <span>Add skills to define what a job-ready {current?.name} should know.</span>
              <button className="pm-btn primary" onClick={() => setPicking(true)}>+ Add skills</button>
            </div>
          )}

          {rows.length > 0 && (
            <div className="rbp-table">
              <div className="rbp-row head">
                <span className="sk">Skill</span>
                <span className="im">Importance</span>
                <span className="wt">Weight</span>
                <span className="tg">Target</span>
                <span className="rm" />
              </div>

              {rows.map(r => (
                <div className={`rbp-row${!r.active ? ' off' : ''}${!r.skillActive || r.missing ? ' stale' : ''}`} key={r.skillKey}>
                  <span className="sk">
                    <b>{r.skillName}</b>
                    <em>{r.skillKey}</em>
                    {r.missing && <i className="tag gone">not in graph</i>}
                    {!r.missing && !r.skillActive && <i className="tag off">deactivated</i>}
                  </span>

                  <span className="im">
                    <select value={r.importance} onChange={e => setImportance(r, e.target.value)}>
                      {IMPORTANCE_ORDER.map(i => <option key={i} value={i}>{title(i)}</option>)}
                    </select>
                  </span>

                  <span className="wt">
                    <input type="number" min={1} max={10} value={r.weight}
                      onChange={e => patch(r.skillKey, { weight: Number(e.target.value) })} />
                  </span>

                  <span className="yr">
                    <button className="rbp-years-btn" onClick={() => setYearsOpen(yearsOpen === r.skillKey ? null : r.skillKey)}
                            title="Which years this applies to, and at what level">
                      {!(r.years || []).length ? 'All years' : (r.years || []).join(', ')}
                      {(r.yearTargets || []).length ? ' ·' : ''}
                      <i className="bi bi-chevron-down" />
                    </button>
                  </span>

                  <span className="tg">
                    <select value={r.targetLevel} onChange={e => patch(r.skillKey, { targetLevel: e.target.value })}>
                      {(vocab?.targetLevels || []).map((t: string) => <option key={t} value={t}>{title(t)}</option>)}
                    </select>
                  </span>

                  <span className="rm">
                    <button title="Remove from this role" onClick={() => remove(r.skillKey)}>
                      <i className="bi bi-x-lg" />
                    </button>
                  </span>

                  {yearsOpen === r.skillKey && (
                    <div className="rbp-years">
                      <p>
                        Leave every year unticked and this applies to <b>all</b> of them — which is
                        what every requirement did before years existed. Tick some to narrow it, and
                        set a level beside a year to expect more or less of that year specifically.
                      </p>
                      {yearOptions.map(y => {
                        const on = (r.years || []).includes(y);
                        const override = (r.yearTargets || []).find(t => t.year === y);
                        return (
                          <div className="rbp-year-row" key={y}>
                            <label>
                              <input type="checkbox" checked={on} onChange={e => {
                                const next = e.target.checked
                                  ? [...(r.years || []), y]
                                  : (r.years || []).filter(v => v !== y);
                                patch(r.skillKey, { years: next });
                              }} />
                              {y}
                            </label>
                            <select value={override?.targetLevel || ''} onChange={e => {
                              const rest = (r.yearTargets || []).filter(t => t.year !== y);
                              patch(r.skillKey, {
                                yearTargets: e.target.value ? [...rest, { year: y, targetLevel: e.target.value }] : rest,
                              });
                            }}>
                              <option value="">same as role ({title(r.targetLevel)})</option>
                              {(vocab?.targetLevels || []).map((t: string) => <option key={t} value={t}>{title(t)}</option>)}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              <button className="rbp-add" onClick={() => setPicking(p => !p)}>
                <i className="bi bi-plus-lg" /> {picking ? 'Done adding' : 'Add skills'}
              </button>
            </div>
          )}

          {/* ── picker ── */}
          {picking && (
            <div className="rbp-pick">
              <div className="hd">
                <b>Add skills to {current?.name}</b>
                <span>Grouped as they sit in the skill graph. Already-added skills are ticked.</span>
              </div>
              <input className="find" value={filter} placeholder="Search skills…" autoFocus
                onChange={e => setFilter(e.target.value)} />

              <div className="groups">
                {pickerGroups.map(g => (
                  <div className="grp" key={g.label}>
                    <div className="gl">{g.label}</div>
                    <div className="items">
                      {g.skills.map(s => (
                        <button key={s.key} className={mapped.has(s.key) ? 'on' : ''} onClick={() => add(s)}>
                          <i className={`bi bi-${mapped.has(s.key) ? 'check-square-fill' : 'square'}`} />
                          <span>{s.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {!pickerGroups.length && <div className="none">Nothing matches.</div>}
              </div>
            </div>
          )}

          {!!gaps.length && (
            <details className="rbp-gaps">
              <summary>Skills these defaults could not use ({gaps.length})</summary>
              <p>
                The defaults were written against the current skill graph. These would improve
                them and do not exist yet — adding them is a Skill Graph decision, not one this
                screen should make on its own.
              </p>
              <ul>{gaps.map((g, i) => <li key={i}>{g}</li>)}</ul>
            </details>
          )}
        </>
      )}
    </div>
  );
};

export default AdminRoleBlueprint;
