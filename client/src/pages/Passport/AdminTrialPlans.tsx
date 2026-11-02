import React, { useEffect, useState } from 'react';
import passportApi, { TrialCatalogueItem, TrialItemSetting, TrialPlan } from '../../api/passportApi';
import { Skeleton } from './AdminRewardsTabs';
import './adminXpRewards.css';
import './adminTrials.css';

/**
 * CareerPilot → Trial plans.
 *
 * A plan is a few days of limited access an admin gives a chosen student from Members: which parts
 * of CareerPilot open, and how much of each (the first N journey days, N practice problems, N mock
 * interviews…). When it ends everything locks again, and what the student did stays theirs.
 * Editing a plan changes trials given from then on; a trial already running keeps its copy.
 */

type Draft = { id: string | null; name: string; description: string; days: string; active: boolean; items: Record<string, { on: boolean; limit: string }> };

const toDraft = (p: TrialPlan | null, cat: TrialCatalogueItem[]): Draft => ({
  id: p?.id || null,
  name: p?.name || '',
  description: p?.description || '',
  days: String(p?.days || 7),
  active: p ? p.active : true,
  items: Object.fromEntries(cat.map(c => {
    const s = p?.items?.[c.key];
    // A new plan starts with the core of CareerPilot on and small limits, so it is a taste, not the whole thing.
    const fresh: Record<string, { on: boolean; limit: string }> = { journey: { on: true, limit: '3' }, practice: { on: true, limit: '10' }, interview: { on: true, limit: '1' } };
    return [c.key, s ? { on: !!s.on, limit: s.limit === null || s.limit === undefined ? '' : String(s.limit) } : (p ? { on: false, limit: '' } : fresh[c.key] || { on: false, limit: '' })];
  })),
});

/** "First 3 days", "10 problems", "On". */
export const describeItem = (c: { key: string; unit: string | null }, s: TrialItemSetting | undefined): string => {
  if (!s?.on) return 'Off';
  if (!c.unit || s.limit === null) return c.unit ? 'No limit' : 'On';
  if (c.key === 'journey') return `First ${s.limit} ${s.limit === 1 ? 'day' : 'days'}`;
  return `${s.limit} ${s.limit === 1 ? c.unit.replace(/s$/, '') : c.unit}`;
};

const AdminTrialPlans: React.FC = () => {
  const [plans, setPlans] = useState<TrialPlan[] | null>(null);
  const [cat, setCat] = useState<TrialCatalogueItem[]>([]);
  const [maxDays, setMaxDays] = useState(90);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDel, setConfirmDel] = useState<TrialPlan | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => passportApi.listTrialPlans()
    .then(d => { setPlans(d.plans); setCat(d.catalogue); setMaxDays(d.maxDays); setErr(''); })
    .catch(e => setErr(e?.response?.data?.message || 'Could not load the trial plans.'));
  useEffect(() => { load(); }, []);
  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(''), 3600); };

  const remove = async () => {
    if (!confirmDel) return;
    setBusy(true);
    try { await passportApi.deleteTrialPlan(confirmDel.id); flash(`“${confirmDel.name}” deleted.`); setConfirmDel(null); await load(); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Could not delete the plan.'); }
    setBusy(false);
  };

  return <div className="xr">
    <header className="xr-head">
      <div>
        <span className="xr-eyebrow">CareerPilot</span>
        <h1>Trial plans</h1>
        <p>A few days of limited access for a chosen student: what opens, and how much of it.</p>
      </div>
      <button type="button" className="xr-btn primary" disabled={!cat.length} onClick={() => setDraft(toDraft(null, cat))}><i className="bi bi-plus-lg" /> New plan</button>
    </header>

    {err && <div className="xr-err"><i className="bi bi-exclamation-circle" /> {err}</div>}
    {msg && <div className="xr-ok" role="status"><i className="bi bi-check-circle-fill" /> {msg}</div>}

    <section className="tp-how" aria-label="How trials work">
      <div><i className="bi bi-1-circle-fill" /><span><b>Make a plan here.</b> Choose how many days it runs and what it opens.</span></div>
      <div><i className="bi bi-2-circle-fill" /><span><b>Give it to a student</b> from <a href="/admin/passport/students">CareerPilot Members</a> → <i className="bi bi-three-dots" /> → Start trial.</span></div>
      <div><i className="bi bi-3-circle-fill" /><span><b>When it ends, everything locks again.</b> What they did stays theirs, and paying opens it all.</span></div>
    </section>

    {!plans ? (err ? null : <Skeleton />)
      : !plans.length
        ? <div className="xr-card"><div className="xr-blank"><i className="bi bi-hourglass-split" /> No trial plans yet. Make the first one, then give it to a student from Members.</div></div>
        : <div className="tp-grid">
          {plans.map(p => (
            <article key={p.id} className={`xr-card tp-card${p.active ? '' : ' off'}`}>
              <div className="tp-card-hd">
                <span className="tp-days"><b>{p.days}</b><small>{p.days === 1 ? 'day' : 'days'}</small></span>
                <div className="tp-card-tx">
                  <h2>{p.name}</h2>
                  {p.description && <p>{p.description}</p>}
                  <span className="tp-meta">
                    {!p.active && <span className="xr-pill tp-off">Switched off</span>}
                    <span><i className="bi bi-people-fill" /> {p.running} on this trial now</span>
                  </span>
                </div>
              </div>
              <ul className="tp-items">
                {cat.map(c => {
                  const s = p.items?.[c.key];
                  return <li key={c.key} className={s?.on ? 'on' : ''}>
                    <i className={`bi ${s?.on ? c.icon : 'bi-lock'}`} /><span>{c.label}</span><b>{describeItem(c, s)}</b>
                  </li>;
                })}
              </ul>
              <div className="tp-card-ft">
                <button type="button" className="xr-btn sm danger" onClick={() => setConfirmDel(p)}><i className="bi bi-trash3" /> Delete</button>
                <button type="button" className="xr-btn sm" onClick={() => setDraft(toDraft(p, cat))}><i className="bi bi-pencil" /> Edit</button>
              </div>
            </article>
          ))}
        </div>}

    {draft && <PlanEditor draft={draft} cat={cat} maxDays={maxDays} onClose={() => setDraft(null)}
      onSaved={async name => { setDraft(null); flash(`“${name}” saved.`); await load(); }} />}

    {confirmDel && <div className="xr-drawer-bg center" onMouseDown={e => { if (e.target === e.currentTarget && !busy) setConfirmDel(null); }}>
      <div className="xr-modal" role="dialog" aria-modal="true">
        <h3>Delete “{confirmDel.name}”?</h3>
        <p>{confirmDel.running
          ? `${confirmDel.running} student${confirmDel.running === 1 ? ' is' : 's are'} on this trial now. They keep it until it ends; only new trials can no longer use this plan.`
          : 'Nobody is on this trial now. This cannot be undone.'}</p>
        <div className="xr-modal-ft">
          <button type="button" className="xr-btn" disabled={busy} onClick={() => setConfirmDel(null)}>Back</button>
          <button type="button" className="xr-btn danger" disabled={busy} onClick={remove}>{busy ? 'Deleting…' : 'Delete plan'}</button>
        </div>
      </div>
    </div>}
  </div>;
};

const PlanEditor: React.FC<{ draft: Draft; cat: TrialCatalogueItem[]; maxDays: number; onClose: () => void; onSaved: (name: string) => void }> = ({ draft, cat, maxDays, onClose, onSaved }) => {
  const [d, setD] = useState<Draft>(draft);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const setItem = (k: string, p: Partial<{ on: boolean; limit: string }>) => setD(x => ({ ...x, items: { ...x.items, [k]: { ...x.items[k], ...p } } }));

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [busy, onClose]);

  const days = Number(d.days);
  const daysOk = Number.isInteger(days) && days >= 1 && days <= maxDays;
  const limitOk = (v: string) => v === '' || (Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 10000);
  const anyOn = Object.values(d.items).some(s => s.on);
  const problem = !d.name.trim() ? 'Give the plan a name.'
    : !daysOk ? `A trial runs for 1 to ${maxDays} days.`
    : cat.some(c => c.unit && d.items[c.key]?.on && !limitOk(d.items[c.key].limit)) ? 'Limits are whole numbers from 1, or empty for no limit.'
    : !anyOn ? 'Switch on at least one thing the trial opens.' : '';

  const save = async () => {
    if (problem) { setErr(problem); return; }
    setBusy(true); setErr('');
    try {
      await passportApi.saveTrialPlan(d.id, {
        name: d.name.trim(), description: d.description.trim(), days, active: d.active,
        items: Object.fromEntries(cat.map(c => {
          const s = d.items[c.key];
          return [c.key, { on: s.on, limit: c.unit && s.on && s.limit !== '' ? Number(s.limit) : null }];
        })),
      });
      onSaved(d.name.trim());
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not save the plan.'); }
    setBusy(false);
  };

  return <div className="xr-drawer-bg" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
    <aside className="xr-drawer tp-drawer" role="dialog" aria-modal="true" aria-label={d.id ? `Edit ${draft.name}` : 'New trial plan'}>
      <header className="xr-drawer-hd">
        <div><span className="xr-eyebrow">{d.id ? 'Edit trial plan' : 'New trial plan'}</span><h2>{d.name.trim() || 'Untitled plan'}</h2></div>
        <button type="button" className="xr-icon-btn" onClick={onClose} aria-label="Close"><i className="bi bi-x-lg" /></button>
      </header>

      <div className="xr-drawer-body">
        <div className="xr-f2">
          <label className="xr-f"><span className="xr-lbl">Name</span>
            <input value={d.name} maxLength={60} autoFocus={!d.id} placeholder="7-day college trial" onChange={e => setD({ ...d, name: e.target.value })} />
          </label>
          <label className="xr-f"><span className="xr-lbl">Runs for</span>
            <span className={`xr-type-in wide${daysOk ? '' : ' bad'}`}>
              <input type="number" min={1} max={maxDays} inputMode="numeric" value={d.days} onChange={e => setD({ ...d, days: e.target.value })} aria-label="Days" />
              <em>days</em>
            </span>
          </label>
        </div>
        <label className="xr-f"><span className="xr-lbl">Note <em>optional · for admins only</em></span>
          <input value={d.description} maxLength={300} placeholder="For the colleges we are piloting with" onChange={e => setD({ ...d, description: e.target.value })} />
        </label>

        <fieldset className="xr-fs">
          <legend>What the trial opens <em>everything off stays locked</em></legend>
          <ul className="tp-edit">
            {cat.map(c => {
              const s = d.items[c.key];
              const bad = c.unit && s.on && !limitOk(s.limit);
              return <li key={c.key} className={`${s.on ? 'on' : ''}${bad ? ' bad' : ''}`}>
                <span className="tp-edit-ic"><i className={`bi ${c.icon}`} /></span>
                <span className="tp-edit-tx"><b>{c.label}</b>{c.hint && <small>{c.hint}</small>}</span>
                <span className="tp-edit-ctl">
                  {c.unit && s.on && (
                    <span className={`xr-type-in${bad ? ' bad' : ''}`} title="Leave empty for no limit">
                      <input type="number" min={1} inputMode="numeric" placeholder="No limit" value={s.limit} onChange={e => setItem(c.key, { limit: e.target.value })} aria-label={`${c.label} limit`} />
                      <em>{c.key === 'journey' ? 'days' : c.unit}</em>
                    </span>
                  )}
                  <label className="xr-switch sm"><input type="checkbox" checked={s.on} onChange={e => setItem(c.key, { on: e.target.checked })} aria-label={`${c.label} in the trial`} /><span>{s.on ? 'On' : 'Off'}</span></label>
                </span>
              </li>;
            })}
          </ul>
        </fieldset>

        <label className="xr-check"><input type="checkbox" checked={d.active} onChange={e => setD({ ...d, active: e.target.checked })} /> Can be given to students <em>(untick to retire it; running trials are not affected)</em></label>
        {d.id && <p className="xr-hint">Changes apply to trials you give from now on. Students already on this trial keep what they were given.</p>}
        {err && <div className="xr-err"><i className="bi bi-exclamation-circle" /> <span>{err}</span></div>}
      </div>

      <footer className="xr-drawer-ft">
        <button type="button" className="xr-btn" disabled={busy} onClick={onClose}>Cancel</button>
        <button type="button" className="xr-btn primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : d.id ? 'Save' : 'Create plan'}</button>
      </footer>
    </aside>
  </div>;
};

export default AdminTrialPlans;
