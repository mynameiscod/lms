import React, { useEffect, useMemo, useState } from 'react';
import passportApi, { AdminJobOpening, JobKind, JobOpeningInput, WorkMode } from '../../api/passportApi';
import { Skeleton } from './AdminRewardsTabs';
import './adminXpRewards.css';
import './adminJobOpenings.css';

/**
 * CareerPilot → Job openings.
 *
 * Openings in the market, posted once and shown on the Job Board of every CareerPilot member in
 * every institute. Students apply on the company's own site. Who can post is decided by the super
 * admin, who gives the "post job openings" permission to a role in Roles.
 */

type Draft = {
  id: string | null; company: string; companyLogo: string; role: string; kind: JobKind; workMode: WorkMode;
  locations: string; payMin: string; payMax: string; experience: string; batches: string; skills: string;
  description: string; applyUrl: string; lastDate: string; status: AdminJobOpening['status'];
};

const MODE_LABEL: Record<WorkMode, string> = { onsite: 'On-site', hybrid: 'Hybrid', remote: 'Remote' };

const toDraft = (o: AdminJobOpening | null): Draft => ({
  id: o?.id || null,
  company: o?.company || '', companyLogo: o?.companyLogo || '', role: o?.role || '',
  kind: o?.kind || 'job', workMode: o?.workMode || 'onsite',
  locations: (o?.locations || []).join(', '),
  payMin: o?.payMin != null ? String(o.payMin) : '', payMax: o?.payMax != null ? String(o.payMax) : '',
  experience: o?.experience || '', batches: (o?.batches || []).join(', '), skills: (o?.skills || []).join(', '),
  description: o?.description || '', applyUrl: o?.applyUrl || '',
  lastDate: o?.lastDate ? o.lastDate.slice(0, 10) : '',
  status: o?.status || 'DRAFT',
});

const split = (v: string) => v.split(',').map((x) => x.trim()).filter(Boolean);
const numOrNull = (v: string) => (v.trim() === '' || !Number.isFinite(Number(v)) ? null : Number(v));

/** "8–12 LPA" for a job, "₹15,000–20,000 / month" for an internship. */
export const payText = (kind: JobKind, min: number | null, max: number | null) => {
  if (min == null && max == null) return '';
  if (kind === 'internship') {
    const f = (n: number) => `₹${n.toLocaleString('en-IN')}`;
    const r = min != null && max != null && min !== max ? `${f(min)}–${max.toLocaleString('en-IN')}` : f((min ?? max) as number);
    return `${min == null ? 'Up to ' : ''}${r} / month`;
  }
  if (min != null && max != null) return min === max ? `${min} LPA` : `${min}–${max} LPA`;
  return min != null ? `${min}+ LPA` : `Up to ${max} LPA`;
};

const dateText = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

type Show = 'live' | 'drafts' | 'ended';
const stateOf = (o: AdminJobOpening): Show => (o.status === 'DRAFT' ? 'drafts' : o.status === 'CLOSED' || o.expired ? 'ended' : 'live');

const AdminJobOpenings: React.FC = () => {
  const [rows, setRows] = useState<AdminJobOpening[] | null>(null);
  const [show, setShow] = useState<Show>('live');
  const [find, setFind] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDel, setConfirmDel] = useState<AdminJobOpening | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');

  const load = () => passportApi.adminJobOpenings()
    .then((d) => { setRows(d.openings); setErr(''); })
    .catch((e) => setErr(e?.response?.data?.message || 'Could not load the job openings.'));
  useEffect(() => { load(); }, []);
  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(''), 4000); };

  const counts = useMemo(() => {
    const c = { live: 0, drafts: 0, ended: 0 };
    (rows || []).forEach((o) => { c[stateOf(o)]++; });
    return c;
  }, [rows]);
  const listed = (rows || []).filter((o) => stateOf(o) === show
    && (!find.trim() || `${o.company} ${o.role} ${o.locations.join(' ')}`.toLowerCase().includes(find.trim().toLowerCase())));

  /** Publish, close or reopen without opening the form. */
  const setStatus = async (o: AdminJobOpening, status: AdminJobOpening['status']) => {
    setBusy(o.id); setErr('');
    try {
      const { id, status: _s, expired: _e, applied: _a, createdByName: _c, updatedAt: _u, appliedAt: _ap, publishedAt: _p, ...rest } = o;
      await passportApi.saveJobOpening(id, { ...rest, status });
      flash(status === 'PUBLISHED' ? `${o.role} at ${o.company} is live on the Job Board.` : status === 'CLOSED' ? `${o.role} at ${o.company} is closed.` : 'Moved to drafts.');
      await load();
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not change the opening.'); }
    setBusy('');
  };

  const remove = async () => {
    if (!confirmDel) return;
    setBusy(confirmDel.id);
    try { await passportApi.deleteJobOpening(confirmDel.id); flash(`${confirmDel.role} at ${confirmDel.company} deleted.`); setConfirmDel(null); await load(); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Could not delete the opening.'); setConfirmDel(null); }
    setBusy('');
  };

  return <div className="xr jo">
    <header className="xr-head">
      <div>
        <span className="xr-eyebrow">CareerPilot · Job Board</span>
        <h1>Job openings</h1>
        <p>Current openings in the market, shown to every CareerPilot member. Students apply on the company’s site.</p>
      </div>
      <button type="button" className="xr-btn primary" onClick={() => setDraft(toDraft(null))}><i className="bi bi-plus-lg" /> New opening</button>
    </header>

    {err && <div className="xr-err"><i className="bi bi-exclamation-circle" /> {err}</div>}
    {msg && <div className="xr-ok" role="status"><i className="bi bi-check-circle-fill" /> {msg}</div>}

    {!rows ? (err ? null : <Skeleton />) : <>
      <div className="xr-toolbar">
        <div className="xr-seg" role="tablist" aria-label="Show">
          {([['live', 'Live', 'On the Job Board now'], ['drafts', 'Drafts', 'Not shown to students yet'], ['ended', 'Closed', 'Closed, or past the last date']] as const).map(([k, l, t]) => (
            <button key={k} type="button" role="tab" title={t} aria-selected={show === k} className={show === k ? 'on' : ''} onClick={() => setShow(k)}>{l}<span className="xr-n">{counts[k]}</span></button>
          ))}
        </div>
        <label className="xr-search"><i className="bi bi-search" /><input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find a company or role" aria-label="Find a company or role" /></label>
      </div>

      {!listed.length
        ? <div className="xr-card"><div className="xr-blank"><i className="bi bi-briefcase" /> {
            find.trim() ? 'Nothing matches.'
              : show === 'live' ? 'No live openings. Add one, or publish a draft.'
              : show === 'drafts' ? 'No drafts.' : 'Nothing closed yet. Openings move here when closed or after their last date.'
          }</div></div>
        : <ul className="jo-list">
          {listed.map((o) => {
            const pay = payText(o.kind, o.payMin, o.payMax);
            const st = stateOf(o);
            return <li key={o.id} className="xr-card jo-row">
              <span className="jo-logo">{o.companyLogo ? <img src={o.companyLogo} alt="" /> : o.company.slice(0, 2).toUpperCase()}</span>
              <div className="jo-body">
                <div className="jo-title">
                  <h2>{o.role}</h2>
                  <span className={`xr-pill jo-st ${st}`}>{o.status === 'DRAFT' ? 'Draft' : o.status === 'CLOSED' ? 'Closed' : o.expired ? 'Past last date' : 'Live'}</span>
                </div>
                <span className="jo-co">{o.company}</span>
                <span className="jo-meta">
                  <span><i className="bi bi-briefcase" /> {o.kind === 'internship' ? 'Internship' : 'Job'} · {MODE_LABEL[o.workMode]}</span>
                  {!!o.locations.length && <span><i className="bi bi-geo-alt" /> {o.locations.join(', ')}</span>}
                  {pay && <span><i className="bi bi-cash-stack" /> {pay}</span>}
                  {o.lastDate && <span><i className="bi bi-clock" /> Last date {dateText(o.lastDate)}</span>}
                  <span><i className="bi bi-check2-square" /> {o.applied} marked applied</span>
                </span>
              </div>
              <div className="jo-acts">
                <a className="xr-btn sm" href={o.applyUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open the apply link for ${o.role}`}><i className="bi bi-box-arrow-up-right" /></a>
                <button type="button" className="xr-btn sm" onClick={() => setDraft(toDraft(o))}><i className="bi bi-pencil" /> Edit</button>
                {o.status === 'DRAFT' && <button type="button" className="xr-btn sm primary" disabled={busy === o.id} onClick={() => setStatus(o, 'PUBLISHED')}><i className="bi bi-send" /> Publish</button>}
                {o.status === 'PUBLISHED' && !o.expired && <button type="button" className="xr-btn sm" disabled={busy === o.id} onClick={() => setStatus(o, 'CLOSED')}><i className="bi bi-x-circle" /> Close</button>}
                {o.status === 'CLOSED' && <button type="button" className="xr-btn sm" disabled={busy === o.id} onClick={() => setStatus(o, 'PUBLISHED')}><i className="bi bi-arrow-counterclockwise" /> Reopen</button>}
                <button type="button" className="xr-btn sm danger" onClick={() => setConfirmDel(o)} aria-label={`Delete ${o.role}`}><i className="bi bi-trash3" /></button>
              </div>
            </li>;
          })}
        </ul>}
    </>}

    {draft && <OpeningEditor draft={draft} onClose={() => setDraft(null)}
      onSaved={async (o) => { setDraft(null); setShow(stateOf(o)); flash(o.status === 'PUBLISHED' ? `${o.role} at ${o.company} is live on the Job Board.` : `${o.role} at ${o.company} saved as a draft.`); await load(); }} />}

    {confirmDel && <div className="xr-drawer-bg center" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setConfirmDel(null); }}>
      <div className="xr-modal" role="dialog" aria-modal="true">
        <h3>Delete {confirmDel.role} at {confirmDel.company}?</h3>
        <p>It disappears from every member’s Job Board{confirmDel.applied ? `, along with the ${confirmDel.applied} “applied” ${confirmDel.applied === 1 ? 'mark' : 'marks'} students made` : ''}. To keep it on record, close it instead.</p>
        <div className="xr-modal-ft">
          <button type="button" className="xr-btn" disabled={!!busy} onClick={() => setConfirmDel(null)}>Back</button>
          <button type="button" className="xr-btn danger" disabled={!!busy} onClick={remove}>{busy ? 'Deleting…' : 'Delete opening'}</button>
        </div>
      </div>
    </div>}
  </div>;
};

const OpeningEditor: React.FC<{ draft: Draft; onClose: () => void; onSaved: (o: AdminJobOpening) => void }> = ({ draft, onClose, onSaved }) => {
  const [d, setD] = useState<Draft>(draft);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [busy, onClose]);

  const save = async (status: JobOpeningInput['status']) => {
    if (!d.company.trim()) { setErr('Enter the company name.'); return; }
    if (!d.role.trim()) { setErr('Enter the role.'); return; }
    if (!/^https?:\/\/\S+\.\S+/i.test(d.applyUrl.trim())) { setErr('Enter the company’s apply link, starting with https://'); return; }
    setBusy(true); setErr('');
    try {
      const r = await passportApi.saveJobOpening(d.id, {
        company: d.company.trim(), companyLogo: d.companyLogo.trim(), role: d.role.trim(), kind: d.kind, workMode: d.workMode,
        locations: split(d.locations), payMin: numOrNull(d.payMin), payMax: numOrNull(d.payMax), experience: d.experience.trim(),
        batches: split(d.batches).map(Number).filter((n) => Number.isFinite(n)), skills: split(d.skills),
        description: d.description.trim(), applyUrl: d.applyUrl.trim(), lastDate: d.lastDate || null, status,
      });
      onSaved(r.opening);
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not save the opening.'); }
    setBusy(false);
  };

  const intern = d.kind === 'internship';
  return <div className="xr-drawer-bg" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
    <aside className="xr-drawer jo-drawer" role="dialog" aria-modal="true" aria-label={d.id ? `Edit ${draft.role}` : 'New job opening'}>
      <header className="xr-drawer-hd">
        <div><span className="xr-eyebrow">{d.id ? 'Edit opening' : 'New opening'}</span><h2>{d.role.trim() || 'Untitled role'}{d.company.trim() ? ` · ${d.company.trim()}` : ''}</h2></div>
        <button type="button" className="xr-icon-btn" onClick={onClose} aria-label="Close"><i className="bi bi-x-lg" /></button>
      </header>

      <div className="xr-drawer-body">
        <div className="xr-f2">
          <label className="xr-f"><span className="xr-lbl">Company</span>
            <input value={d.company} maxLength={80} autoFocus={!d.id} placeholder="Infosys" onChange={(e) => set({ company: e.target.value })} />
          </label>
          <label className="xr-f"><span className="xr-lbl">Role</span>
            <input value={d.role} maxLength={100} placeholder="Systems Engineer" onChange={(e) => set({ role: e.target.value })} />
          </label>
        </div>

        <label className="xr-f"><span className="xr-lbl">Apply link <em>the company’s own page</em></span>
          <input value={d.applyUrl} maxLength={1000} inputMode="url" placeholder="https://careers.company.com/job/12345" onChange={(e) => set({ applyUrl: e.target.value })} />
        </label>

        <div className="xr-f2">
          <div className="xr-f"><span className="xr-lbl">Type</span>
            <div className="xr-seg" role="radiogroup" aria-label="Type">
              {(['job', 'internship'] as const).map((k) => <button key={k} type="button" role="radio" aria-checked={d.kind === k} className={d.kind === k ? 'on' : ''} onClick={() => set({ kind: k })}>{k === 'job' ? 'Job' : 'Internship'}</button>)}
            </div>
          </div>
          <div className="xr-f"><span className="xr-lbl">Work mode</span>
            <div className="xr-seg" role="radiogroup" aria-label="Work mode">
              {(['onsite', 'hybrid', 'remote'] as const).map((k) => <button key={k} type="button" role="radio" aria-checked={d.workMode === k} className={d.workMode === k ? 'on' : ''} onClick={() => set({ workMode: k })}>{MODE_LABEL[k]}</button>)}
            </div>
          </div>
        </div>

        <div className="xr-f2">
          <label className="xr-f"><span className="xr-lbl">Locations <em>comma separated</em></span>
            <input value={d.locations} placeholder="Hyderabad, Bengaluru" onChange={(e) => set({ locations: e.target.value })} />
          </label>
          <label className="xr-f"><span className="xr-lbl">Last date to apply <em>optional</em></span>
            <input type="date" value={d.lastDate} onChange={(e) => set({ lastDate: e.target.value })} />
          </label>
        </div>

        <div className="xr-f2">
          <label className="xr-f"><span className="xr-lbl">{intern ? 'Stipend from (₹ / month)' : 'Pay from (LPA)'} <em>optional</em></span>
            <input type="number" min={0} step={intern ? 500 : 0.1} inputMode="decimal" value={d.payMin} placeholder={intern ? '15000' : '3.6'} onChange={(e) => set({ payMin: e.target.value })} />
          </label>
          <label className="xr-f"><span className="xr-lbl">{intern ? 'Stipend up to (₹ / month)' : 'Pay up to (LPA)'} <em>optional</em></span>
            <input type="number" min={0} step={intern ? 500 : 0.1} inputMode="decimal" value={d.payMax} placeholder={intern ? '25000' : '6'} onChange={(e) => set({ payMax: e.target.value })} />
          </label>
        </div>

        <div className="xr-f2">
          <label className="xr-f"><span className="xr-lbl">Experience <em>optional</em></span>
            <input value={d.experience} maxLength={60} placeholder="Freshers" onChange={(e) => set({ experience: e.target.value })} />
          </label>
          <label className="xr-f"><span className="xr-lbl">Batches <em>graduation years, optional</em></span>
            <input value={d.batches} placeholder="2025, 2026" onChange={(e) => set({ batches: e.target.value })} />
          </label>
        </div>

        <label className="xr-f"><span className="xr-lbl">Skills <em>comma separated, optional</em></span>
          <input value={d.skills} placeholder="Java, SQL, Spring Boot" onChange={(e) => set({ skills: e.target.value })} />
        </label>

        <label className="xr-f"><span className="xr-lbl">About the role <em>optional</em></span>
          <textarea rows={5} maxLength={4000} value={d.description} placeholder="What the job involves and what the company asks for." onChange={(e) => set({ description: e.target.value })} />
        </label>

        <label className="xr-f"><span className="xr-lbl">Company logo link <em>optional</em></span>
          <input value={d.companyLogo} maxLength={500} inputMode="url" placeholder="https://…/logo.png" onChange={(e) => set({ companyLogo: e.target.value })} />
        </label>

        <p className="xr-hint">Live openings show on every CareerPilot member’s Job Board and leave it on their own after the last date.</p>
        {err && <div className="xr-err"><i className="bi bi-exclamation-circle" /> <span>{err}</span></div>}
      </div>

      <footer className="xr-drawer-ft">
        <button type="button" className="xr-btn" disabled={busy} onClick={onClose}>Cancel</button>
        {d.status === 'PUBLISHED'
          ? <button type="button" className="xr-btn primary" disabled={busy} onClick={() => save('PUBLISHED')}>{busy ? 'Saving…' : 'Save'}</button>
          : <>
            <button type="button" className="xr-btn" disabled={busy} onClick={() => save(d.status)}>{d.status === 'CLOSED' ? 'Save' : 'Save draft'}</button>
            <button type="button" className="xr-btn primary" disabled={busy} onClick={() => save('PUBLISHED')}>{busy ? 'Saving…' : d.status === 'CLOSED' ? 'Save and reopen' : 'Publish'}</button>
          </>}
      </footer>
    </aside>
  </div>;
};

export default AdminJobOpenings;
