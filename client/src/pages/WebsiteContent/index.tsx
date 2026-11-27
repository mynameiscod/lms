import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { websiteContentApi, WcStat, WcCompany, WcStudent, WcOffer, WcList, WcCompanyType, WcHistory } from '../../api';
import { Modal } from '../../components/common';
import './WebsiteContent.css';

/**
 * Website Content (2026-11-27): what the public website shows — this first stage is Placements:
 * placement numbers, hiring companies and placed students. Nothing is calculated; the website shows
 * exactly what is typed here, published items only, within about a minute.
 */

type Data = Awaited<ReturnType<typeof websiteContentApi.placements>>;
type Tab = 'numbers' | 'companies' | 'students';
type Msg = { type: 'ok' | 'err'; text: string } | null;

const TYPE_LABEL: Record<WcCompanyType, string> = { product: 'Product', service: 'Service', startup: 'Startup', other: 'Other' };
const fmtWhen = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const initials = (name: string) => name.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const monthText = (ym: string) => (ym ? new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '');
const lpaText = (n: number | null | undefined) => (n === null || n === undefined || Number.isNaN(n) ? '' : `₹ ${Number.isInteger(n) ? n : n.toFixed(1).replace(/\.0$/, '')} LPA`);

/* ── small pieces ──────────────────────────────────────────────────────────────────────────── */

const History: React.FC<{ items?: WcHistory[] }> = ({ items }) => (items && items.length ? (
  <details className="wct-history">
    <summary>Changes ({items.length})</summary>
    <ul>{items.map((h, i) => <li key={i}><span>{fmtWhen(h.at)}{h.byName ? ` · ${h.byName}` : ''}</span> {h.change}</li>)}</ul>
  </details>
) : null);

const StatusPill: React.FC<{ on: boolean }> = ({ on }) => <span className={`wct-pill ${on ? 'pub' : 'draft'}`}>{on ? 'Published' : 'Draft'}</span>;

/** Drag to reorder (desktop) plus earlier/later buttons (touch and keyboard). */
function useReorder<T extends { id: string }>(items: T[], save: (ids: string[]) => Promise<void>) {
  const [order, setOrder] = useState<T[]>(items);
  const drag = useRef<string | null>(null);
  useEffect(() => setOrder(items), [items]);
  const commit = async (next: T[]) => { setOrder(next); await save(next.map((x) => x.id)); };
  const move = (id: string, delta: number) => {
    const i = order.findIndex((x) => x.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  };
  const props = (id: string) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => { drag.current = id; e.dataTransfer.effectAllowed = 'move'; },
    onDragOver: (e: React.DragEvent) => { if (drag.current && drag.current !== id) e.preventDefault(); },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const from = order.findIndex((x) => x.id === drag.current);
      const to = order.findIndex((x) => x.id === id);
      drag.current = null;
      if (from < 0 || to < 0 || from === to) return;
      const next = [...order];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      commit(next);
    },
    onDragEnd: () => { drag.current = null; },
  });
  return { order, move, props };
}

const ImagePick: React.FC<{
  kind: 'photo' | 'logo'; url: string | null; fallback: string; onUploaded: (id: string, url: string) => void; onClear: () => void; onError: (m: string) => void;
}> = ({ kind, url, fallback, onUploaded, onClear, onError }) => {
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const pick = async (f?: File) => {
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) return onError('The image is larger than 8 MB.');
    setBusy(true);
    try { const r = await websiteContentApi.upload(kind, f); onUploaded(r.id, r.url); }
    catch (e: any) { onError(e.message || 'Could not upload the image'); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  };
  return (
    <div className={`wct-imgpick ${kind}`}>
      <div className="wct-imgpick-preview">{url ? <img src={url} alt="" /> : <span>{fallback}</span>}</div>
      <div className="wct-imgpick-side">
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" hidden onChange={(e) => pick(e.target.files?.[0])} />
        <button type="button" className="wct-btn ghost sm" disabled={busy} onClick={() => input.current?.click()}>
          <i className="fa-solid fa-upload" /> {busy ? 'Uploading…' : url ? 'Change' : `Upload ${kind}`}
        </button>
        {url && !busy && <button type="button" className="wct-link" onClick={onClear}>Remove</button>}
        <small>{kind === 'photo' ? 'Cropped to a square around the face. JPG, PNG or WebP, up to 8 MB.' : 'Fitted inside the logo strip; transparent backgrounds are kept.'}</small>
      </div>
    </div>
  );
};

/* ── page ──────────────────────────────────────────────────────────────────────────────────── */

const WebsiteContent: React.FC = () => {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('students');
  const [msg, setMsg] = useState<Msg>(null);
  const [devOpen, setDevOpen] = useState(false);

  const load = useCallback(async () => {
    try { setData(await websiteContentApi.placements()); }
    catch (e: any) { setMsg({ type: 'err', text: e.message || 'Could not load website content' }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const ok = useCallback((text: string) => setMsg({ type: 'ok', text }), []);
  const err = useCallback((e: any, fallback = 'Something went wrong') => setMsg({ type: 'err', text: e?.message || fallback }), []);
  const reorder = (list: WcList) => async (ids: string[]) => {
    try { await websiteContentApi.reorder(list, ids); await load(); }
    catch (e) { err(e, 'Could not save the order'); await load(); }
  };
  const remove = async (list: WcList, id: string, what: string) => {
    if (!window.confirm(`Remove ${what}? It disappears from the website.`)) return;
    try { await websiteContentApi.remove(list, id); await load(); ok(`${what} removed.`); }
    catch (e) { err(e, 'Could not remove'); }
  };
  const toggle = async (list: WcList, id: string, body: any, done: string) => {
    try { await websiteContentApi.update(list, id, body); await load(); ok(done); }
    catch (e) { err(e); }
  };

  const counts = {
    numbers: data?.stats.length || 0,
    companies: data?.companies.length || 0,
    students: data?.students.length || 0,
  };
  const live = {
    numbers: data?.stats.filter((s) => s.published).length || 0,
    companies: data?.companies.filter((c) => c.published).length || 0,
    students: data?.students.filter((s) => s.published).length || 0,
  };

  return (
    <div className="wct-page">
      <div className="wct-head">
        <div>
          <h1>Website Content</h1>
          <p>What your public website shows. Nothing is calculated — the website shows exactly what you type here. Only <b>Published</b> items appear, within about a minute; the website keeps its own design.</p>
        </div>
        <button className="wct-btn ghost" onClick={() => setDevOpen(true)}><i className="fa-solid fa-code" /> For your website developer</button>
      </div>

      <div className="wct-sections" role="tablist" aria-label="Website sections">
        <span className="wct-section on" role="tab" aria-selected="true"><i className="fa-solid fa-briefcase" /> Placements</span>
        <span className="wct-section soon" title="Coming next"><i className="fa-solid fa-trophy" /> Tech Battles <em>next</em></span>
        <span className="wct-section soon" title="Coming next"><i className="fa-solid fa-book-open" /> Courses <em>soon</em></span>
        <span className="wct-section soon" title="Coming next"><i className="fa-solid fa-comment-dots" /> Testimonials &amp; trainers <em>soon</em></span>
      </div>

      {msg && <div className={`wct-alert ${msg.type}`} role="status"><span>{msg.text}</span><button onClick={() => setMsg(null)} aria-label="Close">✕</button></div>}

      <div className="wct-tabs" role="tablist" aria-label="Placements">
        {([['students', 'Placed students', 'fa-user-graduate'], ['companies', 'Companies', 'fa-building'], ['numbers', 'Placement numbers', 'fa-chart-simple']] as [Tab, string, string][]).map(([k, label, icon]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`wct-tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>
            <i className={`fa-solid ${icon}`} /> <span>{label}</span>
            {!loading && <em>{live[k]}/{counts[k]}</em>}
          </button>
        ))}
      </div>

      {loading || !data ? <div className="wct-empty">Loading…</div> : (
        <>
          {tab === 'numbers' && <Numbers data={data} reorder={reorder('stats')} remove={remove} toggle={toggle} reload={load} ok={ok} err={err} />}
          {tab === 'companies' && <Companies data={data} reorder={reorder('companies')} remove={remove} toggle={toggle} reload={load} ok={ok} err={err} />}
          {tab === 'students' && <Students data={data} reorder={reorder('students')} remove={remove} toggle={toggle} reload={load} ok={ok} err={err} />}
        </>
      )}

      <Modal isOpen={devOpen} onClose={() => setDevOpen(false)} title="For your website developer" size="medium">
        {data && (
          <div className="wct-dev">
            <p>The website reads placements from this address. It returns published items only, in the order set here, and never any phone, email or internal note.</p>
            <div className="wct-dev-url"><code>{data.apiUrl}</code>
              <button className="wct-btn ghost sm" onClick={() => { navigator.clipboard?.writeText(data.apiUrl).then(() => ok('Address copied.')).catch(() => undefined); }}><i className="fa-regular fa-copy" /> Copy</button>
            </div>
            <ul>
              <li><code>stats</code> — the placement numbers (<code>value</code>, <code>label</code>).</li>
              <li><code>companies</code> — the hiring-partner logo strip (<code>name</code>, <code>type</code>, <code>domain</code>, <code>logoUrl</code>).</li>
              <li><code>students</code> — the placed-student cards (<code>name</code>, <code>photoUrl</code>, <code>course</code>, <code>role</code>, <code>company</code>, <code>package.text</code>, <code>batch</code>, <code>year</code>, <code>college</code>, <code>quote</code>, <code>tags</code>, <code>featured</code>).</li>
              <li>Optional: <code>?course=java_full_stack&amp;year=2025&amp;companyType=product&amp;featured=1&amp;sort=package|recent&amp;limit=12</code>. <code>filters</code> lists the courses, years and company types that have cards.</li>
            </ul>
            <p className="wct-muted">Build each card from the website's existing card template, so a new student looks exactly like the others. When a company has no uploaded logo, <code>logoUrl</code> is empty and <code>domain</code> is there for the current logo service.</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

interface PaneProps {
  data: Data;
  reorder: (ids: string[]) => Promise<void>;
  remove: (list: WcList, id: string, what: string) => Promise<void>;
  toggle: (list: WcList, id: string, body: any, done: string) => Promise<void>;
  reload: () => Promise<void>;
  ok: (t: string) => void;
  err: (e: any, fallback?: string) => void;
}

/* ── Placement numbers ─────────────────────────────────────────────────────────────────────── */

const Numbers: React.FC<PaneProps> = ({ data, reorder, remove, toggle, reload, ok, err }) => {
  const { order, move, props } = useReorder<WcStat>(data.stats, reorder);
  const [form, setForm] = useState<{ id?: string; value: string; label: string; published: boolean; history?: WcHistory[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!form) return;
    if (!form.value.trim() || !form.label.trim()) return err({ message: 'Type both the number and what it means.' });
    setSaving(true);
    try {
      const body = { value: form.value, label: form.label, published: form.published };
      if (form.id) await websiteContentApi.update('stats', form.id, body); else await websiteContentApi.create('stats', body);
      setForm(null); await reload(); ok('Saved. The website shows it within about a minute.');
    } catch (e) { err(e); } finally { setSaving(false); }
  };
  return (
    <section>
      <div className="wct-bar">
        <p className="wct-muted">The counters on your placements section, e.g. <b>92%</b> Placement rate. Type them exactly as they should appear. Drag to change the order.</p>
        <button className="wct-btn primary" onClick={() => setForm({ value: '', label: '', published: true })}><i className="fa-solid fa-plus" /> Add number</button>
      </div>
      {order.length === 0 ? (
        <div className="wct-none">No numbers yet. Add your placement rate, students placed, highest package — whatever your website shows.</div>
      ) : (
        <div className="wct-stats">
          {order.map((s, i) => (
            <div key={s.id} className={`wct-stat ${s.published ? '' : 'off'}`} {...props(s.id)}>
              <div className="wct-stat-top"><i className="fa-solid fa-grip-vertical wct-grip" aria-hidden /><StatusPill on={s.published} /></div>
              <b>{s.value}</b>
              <span>{s.label}</span>
              <div className="wct-card-actions">
                <button className="wct-icon" onClick={() => move(s.id, -1)} disabled={i === 0} aria-label={`Move ${s.label} earlier`}><i className="fa-solid fa-arrow-left" /></button>
                <button className="wct-icon" onClick={() => move(s.id, 1)} disabled={i === order.length - 1} aria-label={`Move ${s.label} later`}><i className="fa-solid fa-arrow-right" /></button>
                <button className="wct-icon" onClick={() => toggle('stats', s.id, { published: !s.published }, s.published ? 'Taken off the website.' : 'Published.')} aria-label={s.published ? `Unpublish ${s.label}` : `Publish ${s.label}`} title={s.published ? 'Unpublish' : 'Publish'}>
                  <i className={`fa-solid ${s.published ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
                <button className="wct-icon" onClick={() => setForm({ id: s.id, value: s.value, label: s.label, published: s.published, history: s.history })} aria-label={`Edit ${s.label}`}><i className="fa-solid fa-pen" /></button>
                <button className="wct-icon danger" onClick={() => remove('stats', s.id, `"${s.value} ${s.label}"`)} aria-label={`Remove ${s.label}`}><i className="fa-solid fa-trash" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal isOpen={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit number' : 'Add number'} size="small">
        {form && (
          <div className="wct-form">
            <div className="wct-form-two">
              <label><span>Number</span><input value={form.value} maxLength={20} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="92%" autoFocus /></label>
              <label><span>What it means</span><input value={form.label} maxLength={60} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Placement rate" /></label>
            </div>
            <div className="wct-statpreview"><b>{form.value || '92%'}</b><span>{form.label || 'Placement rate'}</span></div>
            <label className="wct-check"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Published — show on the website</label>
            <History items={form.history} />
            <div className="wct-form-actions">
              <button className="wct-btn ghost" onClick={() => setForm(null)} disabled={saving}>Cancel</button>
              <button className="wct-btn primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
};

/* ── Companies ─────────────────────────────────────────────────────────────────────────────── */

interface CompanyForm { id?: string; name: string; type: WcCompanyType; domain: string; logoId: string | null; logoUrl: string | null; showInStrip: boolean; published: boolean; history?: WcHistory[] }

const Companies: React.FC<PaneProps> = ({ data, reorder, remove, toggle, reload, ok, err }) => {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => data.companies.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase())), [data.companies, q]);
  const { order, move, props } = useReorder<WcCompany>(filtered, reorder);
  const canReorder = !q;
  const [form, setForm] = useState<CompanyForm | null>(null);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!form) return;
    if (!form.name.trim()) return err({ message: 'Type the company name.' });
    setSaving(true);
    try {
      const body = { name: form.name, type: form.type, domain: form.domain, logoId: form.logoId, showInStrip: form.showInStrip, published: form.published };
      if (form.id) await websiteContentApi.update('companies', form.id, body); else await websiteContentApi.create('companies', body);
      setForm(null); await reload(); ok('Saved. The website shows it within about a minute.');
    } catch (e) { err(e); } finally { setSaving(false); }
  };
  return (
    <section>
      <div className="wct-bar">
        <div className="wct-search"><i className="fa-solid fa-magnifying-glass" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search companies" aria-label="Search companies" /></div>
        <button className="wct-btn primary" onClick={() => setForm({ name: '', type: 'other', domain: '', logoId: null, logoUrl: null, showInStrip: true, published: true })}><i className="fa-solid fa-plus" /> Add company</button>
      </div>
      <p className="wct-muted wct-sub">Companies appear in the hiring-partners logo strip and on their students' cards. {canReorder ? 'Drag to change the strip order.' : 'Clear the search to change the order.'}</p>
      {order.length === 0 ? (
        <div className="wct-none">{q ? 'No company matches.' : 'No companies yet. Add the companies your students joined.'}</div>
      ) : (
        <div className="wct-companies">
          {order.map((c, i) => (
            <div key={c.id} className={`wct-company ${c.published ? '' : 'off'}`} {...(canReorder ? props(c.id) : {})}>
              <div className="wct-company-logo">{c.logoUrl ? <img src={c.logoUrl} alt="" /> : <span>{initials(c.name)}</span>}</div>
              <div className="wct-company-body">
                <b title={c.name}>{c.name}</b>
                <div className="wct-company-meta">
                  <span className={`wct-type ${c.type}`}>{TYPE_LABEL[c.type]}</span>
                  <span>{c.students} student{c.students === 1 ? '' : 's'}</span>
                </div>
                <div className="wct-company-flags">
                  <StatusPill on={c.published} />
                  {!c.showInStrip && <span className="wct-pill draft">Not in logo strip</span>}
                  {!c.logoUrl && <span className="wct-pill warn" title={c.domain ? `The website can still find a logo from ${c.domain}` : 'Upload a logo'}>No logo</span>}
                </div>
              </div>
              <div className="wct-card-actions">
                {canReorder && <>
                  <button className="wct-icon" onClick={() => move(c.id, -1)} disabled={i === 0} aria-label={`Move ${c.name} earlier`}><i className="fa-solid fa-arrow-left" /></button>
                  <button className="wct-icon" onClick={() => move(c.id, 1)} disabled={i === order.length - 1} aria-label={`Move ${c.name} later`}><i className="fa-solid fa-arrow-right" /></button>
                </>}
                <span className="wct-grow" />
                <button className="wct-icon" onClick={() => setForm({ ...c, history: c.history })} aria-label={`Edit ${c.name}`}><i className="fa-solid fa-pen" /></button>
                <button className="wct-icon danger" onClick={() => remove('companies', c.id, c.name)} aria-label={`Remove ${c.name}`}><i className="fa-solid fa-trash" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal isOpen={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit company' : 'Add company'} size="medium">
        {form && (
          <div className="wct-form">
            <ImagePick kind="logo" url={form.logoUrl} fallback={initials(form.name) || 'Logo'} onError={(m) => err({ message: m })}
              onUploaded={(id, url) => setForm({ ...form, logoId: id, logoUrl: url })} onClear={() => setForm({ ...form, logoId: null, logoUrl: null })} />
            <label><span>Company name</span><input value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="EPAM Systems" autoFocus={!form.id} /></label>
            <div className="wct-form-two">
              <label><span>Type</span>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as WcCompanyType })}>
                  {data.companyTypes.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                </select>
              </label>
              <label><span>Website <em>(optional)</em></span><input value={form.domain} maxLength={200} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="epam.com" /></label>
            </div>
            <label className="wct-check"><input type="checkbox" checked={form.showInStrip} onChange={(e) => setForm({ ...form, showInStrip: e.target.checked })} /> Show in the hiring-partners logo strip</label>
            <label className="wct-check"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Published — when off, this company and its students' cards are hidden</label>
            <History items={form.history} />
            <div className="wct-form-actions">
              <button className="wct-btn ghost" onClick={() => setForm(null)} disabled={saving}>Cancel</button>
              <button className="wct-btn primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
};

/* ── Placed students ───────────────────────────────────────────────────────────────────────── */

interface StudentForm {
  id?: string; name: string; photoId: string | null; photoUrl: string | null; courseKey: string; role: string; companyId: string;
  newCompany: string; packageLpa: string; batch: string; year: string; placedOn: string; college: string; degree: string; quote: string;
  tags: string[]; featured: boolean; consent: boolean; published: boolean; userId: string | null; history?: WcHistory[];
}
const emptyStudent = (): StudentForm => ({
  name: '', photoId: null, photoUrl: null, courseKey: '', role: 'Software Engineer', companyId: '', newCompany: '', packageLpa: '',
  batch: '', year: '', placedOn: '', college: '', degree: '', quote: '', tags: [], featured: false, consent: false, published: false, userId: null,
});
type Filter = 'all' | 'published' | 'draft' | 'consent';

const Students: React.FC<PaneProps> = ({ data, reorder, remove, toggle, reload, ok, err }) => {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const filtered = useMemo(() => data.students.filter((s) => {
    if (q && !`${s.name} ${s.companyName} ${s.college}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === 'published') return s.published;
    if (filter === 'draft') return !s.published;
    if (filter === 'consent') return !s.consent;
    return true;
  }), [data.students, q, filter]);
  const canReorder = !q && filter === 'all';
  const { order, move, props } = useReorder<WcStudent>(filtered, reorder);
  const [form, setForm] = useState<StudentForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [lmsOpen, setLmsOpen] = useState(false);
  const companyName = (id: string) => data.companies.find((c) => c.id === id)?.name || '';
  const needConsent = data.students.filter((s) => !s.consent).length;

  const openEdit = (s: WcStudent) => setForm({
    id: s.id, name: s.name, photoId: s.photoId, photoUrl: s.photoUrl, courseKey: s.courseKey, role: s.role, companyId: s.companyId || '', newCompany: '',
    packageLpa: s.packageLpa === null ? '' : String(s.packageLpa), batch: s.batch, year: s.year ? String(s.year) : '', placedOn: s.placedOn,
    college: s.college, degree: s.degree, quote: s.quote, tags: s.tags, featured: s.featured, consent: s.consent, published: s.published,
    userId: s.userId, history: s.history,
  });

  const fromOffer = (o: WcOffer) => {
    const match = data.companies.find((c) => c.name.trim().toLowerCase() === o.companyName.trim().toLowerCase());
    setLmsOpen(false);
    setForm({
      ...emptyStudent(), name: o.name, role: o.role || 'Software Engineer', companyId: match?.id || (o.companyName ? '__new' : ''),
      newCompany: match ? '' : o.companyName, packageLpa: o.packageLpa === null ? '' : String(o.packageLpa), year: o.year ? String(o.year) : '',
      placedOn: o.placedOn, college: o.college, degree: o.degree, userId: o.userId,
    });
  };

  const save = async () => {
    if (!form) return;
    if (!form.name.trim()) return err({ message: "Type the student's name." });
    if (form.companyId === '__new' && !form.newCompany.trim()) return err({ message: 'Type the new company name.' });
    setSaving(true);
    try {
      let companyId = form.companyId;
      if (companyId === '__new') companyId = (await websiteContentApi.companyByName(form.newCompany)).id;
      const body = {
        name: form.name, photoId: form.photoId, courseKey: form.courseKey, role: form.role, companyId: companyId || null,
        packageLpa: form.packageLpa, batch: form.batch, year: form.year, placedOn: form.placedOn, college: form.college, degree: form.degree,
        quote: form.quote, tags: form.tags, featured: form.featured, consent: form.consent, published: form.published && form.consent,
        ...(form.id ? {} : { userId: form.userId }),
      };
      if (form.id) await websiteContentApi.update('students', form.id, body); else await websiteContentApi.create('students', body);
      setForm(null); await reload();
      ok(body.published ? 'Saved and published. The website shows it within about a minute.' : 'Saved as a draft — not on the website yet.');
    } catch (e) { err(e); await reload(); } finally { setSaving(false); }
  };

  const canPublish = !!form && form.consent && !!form.companyId && (form.companyId !== '__new' || !!form.newCompany.trim());

  return (
    <section>
      <div className="wct-bar">
        <div className="wct-search"><i className="fa-solid fa-magnifying-glass" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, company or college" aria-label="Search students" /></div>
        <select className="wct-filter" value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Show">
          <option value="all">All students</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
          <option value="consent">Consent not ticked{needConsent ? ` (${needConsent})` : ''}</option>
        </select>
        <div className="wct-bar-actions">
          <button className="wct-btn ghost" onClick={() => setLmsOpen(true)}><i className="fa-solid fa-file-import" /> Add from LMS</button>
          <button className="wct-btn primary" onClick={() => setForm(emptyStudent())}><i className="fa-solid fa-plus" /> Add student</button>
        </div>
      </div>
      <p className="wct-muted wct-sub">Each card here is a card on the website, in this order. {canReorder ? 'Drag a card to move it.' : 'Show all students with no search to change the order.'} A student can only be published once “Student agreed to be shown” is ticked.</p>

      {order.length === 0 ? (
        <div className="wct-none">{data.students.length ? 'No student matches.' : 'No placed students yet. Add one, or bring offers in from the Placement Desk with “Add from LMS”.'}</div>
      ) : (
        <div className="wct-students">
          {order.map((s, i) => (
            <article key={s.id} className={`wct-student ${s.published ? '' : 'off'}`} {...(canReorder ? props(s.id) : {})}>
              <div className="wct-student-flags">
                <StatusPill on={s.published} />
                {s.featured && <span className="wct-pill feat"><i className="fa-solid fa-star" /> Featured</span>}
                {!s.consent && <span className="wct-pill warn">No consent</span>}
              </div>
              <div className="wct-student-top">
                <div className="wct-avatar">{s.photoUrl ? <img src={s.photoUrl} alt="" /> : <span>{initials(s.name)}</span>}</div>
                <div className="wct-student-id">
                  <b>{s.name}</b>
                  <span>{[s.courseName, s.batch].filter(Boolean).join(' · ') || <em>No course set</em>}</span>
                </div>
              </div>
              {s.quote ? <p className="wct-quote">“{s.quote}”</p> : <p className="wct-quote empty">No quote</p>}
              <div className="wct-student-tags">{s.role && <span>{s.role}</span>}{s.year && <span>{s.year}</span>}</div>
              <div className="wct-student-foot">
                <div>
                  <small>Placed at</small>
                  <div className="wct-placed">{s.companyLogoUrl && <img src={s.companyLogoUrl} alt="" />}<b>{s.companyName || <em>No company</em>}</b></div>
                </div>
                {s.packageText && <div className="wct-pkg"><small>CTC</small><b>{s.packageText}</b></div>}
              </div>
              <div className="wct-card-actions">
                {canReorder && <>
                  <button className="wct-icon" onClick={() => move(s.id, -1)} disabled={i === 0} aria-label={`Move ${s.name} earlier`}><i className="fa-solid fa-arrow-left" /></button>
                  <button className="wct-icon" onClick={() => move(s.id, 1)} disabled={i === order.length - 1} aria-label={`Move ${s.name} later`}><i className="fa-solid fa-arrow-right" /></button>
                </>}
                <span className="wct-grow" />
                <button className="wct-icon" disabled={!s.published && (!s.consent || !s.companyId)} title={!s.published && !s.consent ? 'Tick consent first' : s.published ? 'Unpublish' : 'Publish'}
                  onClick={() => toggle('students', s.id, { published: !s.published }, s.published ? `${s.name} taken off the website.` : `${s.name} published.`)}
                  aria-label={s.published ? `Unpublish ${s.name}` : `Publish ${s.name}`}>
                  <i className={`fa-solid ${s.published ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
                <button className="wct-icon" onClick={() => openEdit(s)} aria-label={`Edit ${s.name}`}><i className="fa-solid fa-pen" /></button>
                <button className="wct-icon danger" onClick={() => remove('students', s.id, s.name)} aria-label={`Remove ${s.name}`}><i className="fa-solid fa-trash" /></button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal isOpen={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit placed student' : 'Add placed student'} size="large">
        {form && (
          <div className="wct-form">
            <ImagePick kind="photo" url={form.photoUrl} fallback={initials(form.name) || 'Photo'} onError={(m) => err({ message: m })}
              onUploaded={(id, url) => setForm({ ...form, photoId: id, photoUrl: url })} onClear={() => setForm({ ...form, photoId: null, photoUrl: null })} />
            <div className="wct-form-two">
              <label><span>Name</span><input value={form.name} maxLength={60} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Arvind" /></label>
              <label><span>Course</span>
                <select value={form.courseKey} onChange={(e) => setForm({ ...form, courseKey: e.target.value })}>
                  <option value="">— Not set —</option>
                  {data.courses.filter((c) => c.active || c.key === form.courseKey).map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
                </select>
              </label>
            </div>
            <div className="wct-form-two">
              <label><span>Company</span>
                <select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })}>
                  <option value="">— Pick a company —</option>
                  {data.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  <option value="__new">+ New company…</option>
                </select>
              </label>
              <label><span>Role</span><input value={form.role} maxLength={60} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Software Engineer" /></label>
            </div>
            {form.companyId === '__new' && (
              <label><span>New company name <em>(added to Companies when you save; add its logo there)</em></span>
                <input value={form.newCompany} maxLength={80} onChange={(e) => setForm({ ...form, newCompany: e.target.value })} placeholder="Mphasis" />
              </label>
            )}
            <div className="wct-form-three">
              <label><span>Package (LPA)</span><input type="number" min={0} max={500} step={0.1} inputMode="decimal" value={form.packageLpa} onChange={(e) => setForm({ ...form, packageLpa: e.target.value })} placeholder="4.2" /></label>
              <label><span>Batch <em>(optional)</em></span><input value={form.batch} maxLength={40} onChange={(e) => setForm({ ...form, batch: e.target.value })} placeholder="Batch 09" /></label>
              <label><span>Year <em>(optional)</em></span><input type="number" min={2000} max={2100} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="2025" /></label>
            </div>
            <div className="wct-form-three">
              <label><span>Placed month <em>(optional)</em></span><input type="month" value={form.placedOn} onChange={(e) => setForm({ ...form, placedOn: e.target.value })} /></label>
              <label><span>College <em>(optional)</em></span><input value={form.college} maxLength={100} onChange={(e) => setForm({ ...form, college: e.target.value })} /></label>
              <label><span>Degree <em>(optional)</em></span><input value={form.degree} maxLength={40} onChange={(e) => setForm({ ...form, degree: e.target.value })} placeholder="B.Tech" /></label>
            </div>
            <label><span>Quote <em>({form.quote.length}/140 — one short line fits the card)</em></span>
              <input value={form.quote} maxLength={140} onChange={(e) => setForm({ ...form, quote: e.target.value })} placeholder="Real projects made all the difference." />
            </label>
            <fieldset className="wct-tags">
              <legend>Tags <em>(for the success-stories filters)</em></legend>
              {data.tags.map((t) => (
                <label key={t.key} className={`wct-chip ${form.tags.includes(t.key) ? 'on' : ''}`}>
                  <input type="checkbox" checked={form.tags.includes(t.key)} onChange={(e) => setForm({ ...form, tags: e.target.checked ? [...form.tags, t.key] : form.tags.filter((x) => x !== t.key) })} />
                  {t.label}
                </label>
              ))}
            </fieldset>
            <div className="wct-publish">
              <label className="wct-check strong"><input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked, published: e.target.checked ? form.published : false })} /> Student agreed to be shown on the website (name, photo, company and package)</label>
              <label className="wct-check"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured — highlighted first where the website shows featured stories</label>
              <label className={`wct-check ${canPublish ? '' : 'dim'}`}><input type="checkbox" disabled={!canPublish} checked={form.published && canPublish} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Published — show on the website</label>
              {!canPublish && <small>{!form.consent ? 'Tick the consent box to publish.' : 'Pick the company to publish.'}</small>}
            </div>
            <div className="wct-preview">
              <div className="wct-preview-title">Card preview</div>
              <div className="wct-student mini">
                <div className="wct-student-top">
                  <div className="wct-avatar">{form.photoUrl ? <img src={form.photoUrl} alt="" /> : <span>{initials(form.name) || '?'}</span>}</div>
                  <div className="wct-student-id"><b>{form.name || 'Name'}</b><span>{[data.courses.find((c) => c.key === form.courseKey)?.name, form.batch].filter(Boolean).join(' · ') || 'Course'}</span></div>
                </div>
                <p className="wct-quote">“{form.quote || 'Quote'}”</p>
                <div className="wct-student-foot">
                  <div><small>Placed at</small><div className="wct-placed"><b>{form.companyId === '__new' ? form.newCompany || 'Company' : companyName(form.companyId) || 'Company'}</b></div></div>
                  {form.packageLpa && <div className="wct-pkg"><small>CTC</small><b>{lpaText(Number(form.packageLpa))}</b></div>}
                </div>
              </div>
              <small className="wct-muted">Shown here in the LMS style — the website uses its own card design.</small>
            </div>
            {form.placedOn && <div className="wct-muted">Placed {monthText(form.placedOn)}</div>}
            <History items={form.history} />
            <div className="wct-form-actions">
              <button className="wct-btn ghost" onClick={() => setForm(null)} disabled={saving}>Cancel</button>
              <button className="wct-btn primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : form.published && canPublish ? 'Save and publish' : 'Save as draft'}</button>
            </div>
          </div>
        )}
      </Modal>

      <LmsOffers open={lmsOpen} onClose={() => setLmsOpen(false)} onUse={fromOffer} err={err} />
    </section>
  );
};

const LmsOffers: React.FC<{ open: boolean; onClose: () => void; onUse: (o: WcOffer) => void; err: (e: any, f?: string) => void }> = ({ open, onClose, onUse, err }) => {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<WcOffer[] | null>(null);
  useEffect(() => {
    if (!open) return undefined;
    let live = true;
    const t = setTimeout(async () => {
      try { const r = await websiteContentApi.lmsOffers(q); if (live) setRows(r); }
      catch (e) { if (live) { setRows([]); err(e, 'Could not load Placement Desk offers'); } }
    }, q ? 300 : 0);
    return () => { live = false; clearTimeout(t); };
  }, [open, q, err]);
  return (
    <Modal isOpen={open} onClose={onClose} title="Add from LMS — Placement Desk offers" size="medium">
      <div className="wct-offers">
        <p className="wct-muted">Offers recorded on the Placement Desk. Pick one to start a card with the name, company, role, package and college filled in — then add the photo and quote, and tick consent.</p>
        <div className="wct-search"><i className="fa-solid fa-magnifying-glass" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" aria-label="Search offers" /></div>
        {rows === null ? <div className="wct-empty">Loading…</div> : rows.length === 0 ? (
          <div className="wct-none">{q ? 'No offer matches.' : 'No offers on the Placement Desk yet. Use “Add student” to type one in.'}</div>
        ) : (
          <ul>
            {rows.map((o) => (
              <li key={o.candidateId}>
                <div className="wct-offer-main">
                  <b>{o.name}</b>
                  <span>{[o.companyName, o.role, lpaText(o.packageLpa), monthText(o.placedOn)].filter(Boolean).join(' · ')}</span>
                </div>
                {o.hasCard ? <span className="wct-pill pub">Has a card</span> : <button className="wct-btn ghost sm" onClick={() => onUse(o)}>Use</button>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
};

export default WebsiteContent;
