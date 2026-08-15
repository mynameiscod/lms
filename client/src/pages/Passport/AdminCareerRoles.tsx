import React, { useEffect, useState } from 'react';
import passportApi, { AdminCareerRole } from '../../api/passportApi';
import './adminCareerRoles.css';

/**
 * The career directions students may aim at.
 *
 * Configuration, and nothing but: adding, renaming or retiring a role changes what future
 * students are OFFERED and nothing about anyone who already exists. No roadmap
 * regenerates, no pathway moves, no progress resets. The screen says so where an admin is
 * about to do something that looks destructive, because "will this break my 1,200 backend
 * students?" is the question that otherwise stops them acting at all.
 *
 * Career role is not the LMS permission role, and not the learning pathway. It is what
 * the student says they want to become.
 */

const BLANK = {
  key: '', name: '', description: '', studentDescription: '',
  aliases: '', displayOrder: 100, active: true, studentSelectable: true,
};

const AdminCareerRoles: React.FC = () => {
  const [roles, setRoles] = useState<AdminCareerRole[]>([]);
  const [counts, setCounts] = useState({ total: 0, active: 0, selectable: 0 });
  const [editing, setEditing] = useState<string | null>(null);   // role id, or 'new'
  const [form, setForm] = useState({ ...BLANK });
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = () =>
    passportApi.listCareerRoles()
      .then(r => { setRoles(r.roles); setCounts(r.counts); })
      .catch(e => setErr(e?.response?.data?.message || 'Could not load career roles.'));

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm({ ...BLANK, displayOrder: (roles.length + 1) * 10 }); setEditing('new'); setErr(''); };
  const openEdit = (r: AdminCareerRole) => {
    setForm({
      key: r.key, name: r.name, description: r.description,
      studentDescription: r.studentDescription, aliases: (r.aliases || []).join(', '),
      displayOrder: r.displayOrder, active: r.active, studentSelectable: r.studentSelectable,
    });
    setEditing(r.id); setErr('');
  };

  /** Suggested while typing a NEW role's name; never overwrites a key typed by hand. */
  const onName = (name: string) =>
    setForm(f => ({
      ...f, name,
      key: editing === 'new' && (!f.key || f.key === suggest(f.name)) ? suggest(name) : f.key,
    }));
  const suggest = (n: string) =>
    n.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  const save = async () => {
    setBusy('save'); setErr(''); setMsg('');
    const body = {
      key: form.key, name: form.name, description: form.description,
      studentDescription: form.studentDescription,
      aliases: form.aliases.split(',').map(s => s.trim()).filter(Boolean),
      displayOrder: Number(form.displayOrder) || 100,
      active: form.active, studentSelectable: form.studentSelectable,
    };
    try {
      if (editing === 'new') await passportApi.createCareerRole(body);
      else await passportApi.updateCareerRole(editing!, body);
      await load();
      setEditing(null);
      setMsg(editing === 'new' ? 'Role added. Students will see it from their next visit.' : 'Saved.');
      setTimeout(() => setMsg(''), 4000);
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not save.'); }
    setBusy('');
  };

  /**
   * Counted only at the moment it matters. An admin about to hide a role needs the number;
   * putting it in the list would cost a count per role on every render for a figure almost
   * nobody reads.
   */
  const toggleSelectable = async (r: AdminCareerRole) => {
    if (r.studentSelectable) {
      setBusy(r.id);
      const n = await passportApi.careerRoleUsage(r.key).then(u => u.memberCount).catch(() => 0);
      setUsage(u => ({ ...u, [r.key]: n }));
      setBusy('');
      const warn = n > 0
        ? `${n} member${n === 1 ? '' : 's'} already chose "${r.name}". They keep it and nothing about their plan changes — this only stops NEW students picking it.\n\nHide it?`
        : `Hide "${r.name}" from new students?`;
      if (!window.confirm(warn)) return;
    }
    setBusy(r.id);
    try {
      await passportApi.updateCareerRole(r.id, { studentSelectable: !r.studentSelectable });
      await load();
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not update.'); }
    setBusy('');
  };

  const toggleActive = async (r: AdminCareerRole) => {
    setBusy(r.id);
    try {
      await passportApi.updateCareerRole(r.id, { active: !r.active });
      await load();
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not update.'); }
    setBusy('');
  };

  const remove = async (r: AdminCareerRole) => {
    if (!window.confirm(`Delete "${r.name}" permanently? Deactivating is usually the safer choice.`)) return;
    setBusy(r.id);
    try { await passportApi.deleteCareerRole(r.id); await load(); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Could not delete.'); }
    setBusy('');
  };

  return (
    <div className="crl">
      <div className="crl-hd">
        <div>
          <h1>Career Roles</h1>
          <p>
            What students can say they want to become. Changing these affects the choices
            offered to <b>new</b> students — never the answer anyone has already given.
          </p>
        </div>
        <button className="pm-btn primary" onClick={openNew}>+ Add role</button>
      </div>

      {err && <div className="pm-msg err">{err}</div>}
      {msg && <div className="pm-msg ok">{msg}</div>}

      <div className="crl-sum">
        <div className="s"><b>{counts.total}</b><span>roles</span></div>
        <div className="s"><b>{counts.active}</b><span>active</span></div>
        <div className={`s${counts.selectable === 0 ? ' warn' : ''}`}>
          <b>{counts.selectable}</b><span>offered to students</span>
        </div>
        <div className="s dom"><span>Domain</span><b>Software Engineering</b></div>
      </div>

      {counts.selectable === 0 && (
        <div className="crl-warn">
          <i className="bi bi-exclamation-triangle" />
          No roles are available to students. Onboarding still works — everyone will land on
          “I'm not sure yet” — but nobody can state a direction until you open one up.
        </div>
      )}

      {/* ── editor ── */}
      {editing && (
        <div className="crl-form">
          <h2>{editing === 'new' ? 'New career role' : `Edit ${form.name}`}</h2>
          <div className="row">
            <label className="grow">Name
              <input value={form.name} autoFocus placeholder="e.g. Platform Engineer"
                onChange={e => onName(e.target.value)} />
            </label>
            <label>Key
              <input value={form.key} readOnly={editing !== 'new'} placeholder="PLATFORM_ENGINEER"
                onChange={e => setForm(f => ({ ...f, key: e.target.value.toUpperCase() }))} />
              <em>{editing === 'new'
                ? 'Uppercase, underscores. Permanent once created.'
                : 'Cannot change — student records reference it.'}</em>
            </label>
            <label className="ord">Order
              <input type="number" value={form.displayOrder}
                onChange={e => setForm(f => ({ ...f, displayOrder: Number(e.target.value) }))} />
            </label>
          </div>

          <label className="full">Description <em>what this career involves</em>
            <input value={form.description} placeholder="Builds and maintains internal platforms and developer infrastructure."
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </label>

          <label className="full">Student sub-label <em>short, shown on the choice card</em>
            <input value={form.studentDescription} placeholder="Infrastructure · Tooling · Developer experience"
              onChange={e => setForm(f => ({ ...f, studentDescription: e.target.value }))} />
          </label>

          <label className="full">Aliases <em>comma separated, for admin search</em>
            <input value={form.aliases} placeholder="Platform Developer, Infrastructure Engineer"
              onChange={e => setForm(f => ({ ...f, aliases: e.target.value }))} />
          </label>

          <div className="checks">
            <label><input type="checkbox" checked={form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} /> Active</label>
            <label><input type="checkbox" checked={form.studentSelectable}
              onChange={e => setForm(f => ({ ...f, studentSelectable: e.target.checked }))} /> Offered to students</label>
          </div>

          <div className="acts">
            <button className="pm-btn ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button className="pm-btn primary" disabled={busy === 'save' || !form.name.trim() || !form.key.trim()} onClick={save}>
              {busy === 'save' ? 'Saving…' : editing === 'new' ? 'Add role' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* ── list ── */}
      <div className="crl-list">
        {roles.map(r => (
          <div className={`crl-row${!r.active ? ' off' : ''}`} key={r.id}>
            <span className="ord">{r.displayOrder}</span>
            {r.iconKey && <i className={`bi ${r.iconKey} crl-ic`} />}

            <div className="tx">
              <b>{r.name} {r.systemRole && <span className="sys" title="Built in — cannot be deleted">built-in</span>}</b>
              <span className="k">{r.key}</span>
              <span className="d">{r.description}</span>
            </div>

            <div className="tags">
              <span className={`tag${r.active ? ' on' : ''}`}>{r.active ? 'Active' : 'Inactive'}</span>
              <span className={`tag${r.studentSelectable && r.active ? ' vis' : ''}`}>
                {r.studentSelectable ? 'Visible' : 'Hidden'}
              </span>
              {usage[r.key] !== undefined && <span className="tag cnt">{usage[r.key]} chose it</span>}
            </div>

            <div className="acts">
              <button disabled={busy === r.id} onClick={() => openEdit(r)}>Edit</button>
              <button disabled={busy === r.id} onClick={() => toggleSelectable(r)}>
                {r.studentSelectable ? 'Hide' : 'Show'}
              </button>
              <button disabled={busy === r.id} onClick={() => toggleActive(r)}>
                {r.active ? 'Deactivate' : 'Activate'}
              </button>
              {!r.systemRole && (
                <button className="del" disabled={busy === r.id} onClick={() => remove(r)}>Delete</button>
              )}
            </div>
          </div>
        ))}
        {!roles.length && <div className="crl-empty">No career roles yet.</div>}
      </div>
    </div>
  );
};

export default AdminCareerRoles;
