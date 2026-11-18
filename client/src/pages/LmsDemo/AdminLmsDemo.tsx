import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { lmsDemoApi, demoErr, DemoConfig, DemoPlanOption, DemoStudentRow } from '../../api/lmsDemoApi';
import './adminLmsDemo.css';

/**
 * LMS DEMO — admin screen (super admin, or a role given manage_lms_demo).
 *   Demo students  everyone who took a demo: give a demo, copy the link, extend, end, reset.
 *   Demo courses   which Learning Plans every demo student gets. The days, videos and notes are
 *                  built in Curriculum Builder, the same way as any plan.
 *   Settings       demo length, AI questions per day, the counsellor's number.
 * Demo students are kept off the Users screen; this is their tab.
 */

type Tab = 'students' | 'courses' | 'settings';
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');
const ago = (d?: string | null) => {
  if (!d) return 'never';
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 2) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
};
const COLORS = ['#051D64', '#359AAD', '#6246C9', '#C87808', '#17885D', '#C93737'];

export default function AdminLmsDemo() {
  const [tab, setTab] = useState<Tab>('students');
  const [cfg, setCfg] = useState<DemoConfig | null>(null);
  const [plans, setPlans] = useState<DemoPlanOption[]>([]);
  const [tenantOk, setTenantOk] = useState(true);
  const [loadErr, setLoadErr] = useState('');
  const [toast, setToast] = useState('');

  const loadConfig = useCallback(() => {
    lmsDemoApi.getConfig()
      .then(d => { setCfg(d.config); setPlans(d.plans); setTenantOk(!!d.tenantId); setLoadErr(''); })
      .catch(e => setLoadErr(demoErr(e, 'Could not load the demo settings.')));
  }, []);
  useEffect(() => { loadConfig(); }, [loadConfig]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3200); return () => clearTimeout(t); }, [toast]);

  const activeCourses = (cfg?.courses || []).filter(c => c.active).length;

  return (
    <div className="ldm">
      <header className="ldm-head">
        <div>
          <span className="ldm-eyebrow">LMS · Free demo</span>
          <h1>LMS Demo</h1>
          <p>Prospective students try the LMS for {cfg?.lengthDays ?? 3} days with every demo course open. They sign up themselves at <a href="/demo" target="_blank" rel="noreferrer">/demo</a>, or you give them a demo here.</p>
        </div>
        <div className="ldm-head-stats">
          <span className={`ldm-pill ${cfg?.enabled ? 'ok' : 'off'}`}><i className={`bi ${cfg?.enabled ? 'bi-check-circle-fill' : 'bi-pause-circle-fill'}`} /> {cfg?.enabled ? 'Demo open' : 'Demo closed'}</span>
          <span className="ldm-pill"><i className="bi bi-collection-play" /> {activeCourses} course{activeCourses === 1 ? '' : 's'}</span>
        </div>
      </header>

      {!tenantOk && <div className="ldm-alert">No CodeBegun institute was found, so demo accounts cannot be made. Set PLATFORM_OWNER_TENANT_ID in Platform Settings.</div>}
      {loadErr && <div className="ldm-alert">{loadErr}</div>}
      {cfg && activeCourses === 0 && <div className="ldm-alert warn">No demo courses yet. Add them on the <button type="button" onClick={() => setTab('courses')}>Demo courses</button> tab, or demo students will see an empty plan.</div>}

      <nav className="ldm-tabs" role="tablist">
        {([['students', 'bi-people', 'Demo students'], ['courses', 'bi-collection-play', 'Demo courses'], ['settings', 'bi-sliders', 'Settings']] as const).map(([k, ic, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}><i className={`bi ${ic}`} /> {l}</button>
        ))}
      </nav>

      {tab === 'students' && <StudentsTab cfg={cfg} onToast={setToast} />}
      {tab === 'courses' && cfg && <CoursesTab cfg={cfg} plans={plans} onSaved={c => { setCfg(c); setToast('Demo courses saved'); }} />}
      {tab === 'settings' && cfg && <SettingsTab cfg={cfg} onSaved={c => { setCfg(c); setToast('Settings saved'); }} />}

      {toast && <div className="ldm-toast" role="status"><i className="bi bi-check-circle-fill" /> {toast}</div>}
    </div>
  );
}

/* ───────────────────────────── Students ───────────────────────────── */

function StudentsTab({ cfg, onToast }: { cfg: DemoConfig | null; onToast: (s: string) => void }) {
  const [rows, setRows] = useState<DemoStudentRow[]>([]);
  const [counts, setCounts] = useState({ all: 0, active: 0, ended: 0, talk: 0 });
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [giving, setGiving] = useState(false);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    lmsDemoApi.students({ status, search: q })
      .then(d => { setRows(d.rows); setCounts(d.counts); setErr(''); })
      .catch(e => setErr(demoErr(e, 'Could not load demo students.')))
      .finally(() => setLoading(false));
  }, [status, q]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setTimeout(() => setQ(search.trim()), 350); return () => clearTimeout(t); }, [search]);

  const act = async (id: string, fn: () => Promise<any>, done: string) => {
    setBusyId(id);
    try { await fn(); onToast(done); load(); } catch (e) { onToast(demoErr(e)); } finally { setBusyId(''); }
  };
  const copyLink = async (id: string) => {
    setBusyId(id);
    try {
      const link = await lmsDemoApi.link(id);
      await navigator.clipboard.writeText(link);
      onToast('Demo link copied');
    } catch (e) { onToast(demoErr(e, 'Could not copy the link')); } finally { setBusyId(''); }
  };

  return (
    <section className="ldm-card">
      <div className="ldm-toolbar">
        <div className="ldm-seg" role="tablist">
          {([['all', 'All', counts.all], ['active', 'Active', counts.active], ['ended', 'Ended', counts.ended], ['talk', 'Wants a call', counts.talk]] as const).map(([k, l, n]) => (
            <button key={k} type="button" className={status === k ? 'on' : ''} onClick={() => setStatus(k)}>{l} <b>{n}</b></button>
          ))}
        </div>
        <div className="ldm-toolbar-r">
          <label className="ldm-search"><i className="bi bi-search" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, phone, email" aria-label="Search demo students" /></label>
          <button type="button" className="ldm-btn primary" onClick={() => setGiving(true)}><i className="bi bi-person-plus" /> Give a demo</button>
        </div>
      </div>

      {err && <div className="ldm-alert">{err}</div>}
      {loading && !rows.length ? <div className="ldm-empty"><div className="ldm-spin" /></div>
        : !rows.length ? (
          <div className="ldm-empty"><i className="bi bi-people" /><b>{q || status !== 'all' ? 'No demo students match' : 'No demo students yet'}</b><span>Share <a href="/demo" target="_blank" rel="noreferrer">the demo page</a>, or give a demo to a lead.</span></div>
        ) : (
          <div className="ldm-table-wrap">
            <table className="ldm-table">
              <thead><tr><th>Student</th><th>Demo</th><th>Progress</th><th>Last seen</th><th aria-label="Actions" /></tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r._id} className={busyId === r._id ? 'busy' : ''}>
                    <td data-label="Student">
                      <b className="ldm-name">{r.name}</b>
                      <span className="ldm-sub">{r.phone}{r.email ? ` · ${r.email}` : ''}</span>
                      <span className="ldm-tags">
                        <em className={r.source === 'given' ? 'given' : 'self'}>{r.source === 'given' ? `Given${r.givenBy ? ` by ${r.givenBy}` : ''}` : 'Signed up'}</em>
                        {r.status && <em>{r.status}</em>}
                        {(r.talkRequestedAt || r.moreTimeRequestedAt) && <em className="hot"><i className="bi bi-telephone-fill" /> {r.talkRequestedAt ? 'Wants a call' : 'Wants more time'}</em>}
                      </span>
                    </td>
                    <td data-label="Demo">
                      <span className={`ldm-state ${r.active ? 'on' : 'off'}`}>{r.active ? (r.daysLeft <= 1 ? 'Last day' : `${r.daysLeft} days left`) : r.endedEarly ? 'Ended by admin' : 'Ended'}</span>
                      <span className="ldm-sub">Started {fmt(r.startedAt)}</span>
                      <span className="ldm-sub">{r.active ? 'Ends' : 'Ended'} {fmt(r.expiresAt)}</span>
                    </td>
                    <td data-label="Progress">
                      <b className="ldm-num">{r.itemsDone}</b> <span className="ldm-sub inline">lessons</span>
                      <span className="ldm-sub">{r.daysDone} day{r.daysDone === 1 ? '' : 's'} done · {r.minutes} min</span>
                    </td>
                    <td data-label="Last seen"><span className="ldm-sub dark">{ago(r.lastSeenAt)}</span></td>
                    <td className="ldm-actions">
                      <button type="button" className="ldm-btn sm" onClick={() => copyLink(r._id)} title="Copy a one-tap login link"><i className="bi bi-link-45deg" /> Link</button>
                      <ExtendMenu onPick={d => act(r._id, () => lmsDemoApi.extend(r._id, d), `Extended by ${d} day${d === 1 ? '' : 's'}`)} />
                      {r.active && <button type="button" className="ldm-btn sm" onClick={() => window.confirm(`End ${r.name}'s demo now? They will only see the end screen.`) && act(r._id, () => lmsDemoApi.end(r._id), 'Demo ended')}><i className="bi bi-stop-circle" /> End</button>}
                      <button type="button" className="ldm-btn sm ghost" onClick={() => window.confirm(`Clear ${r.name}'s progress in the demo courses? The account and dates stay.`) && act(r._id, () => lmsDemoApi.reset(r._id), 'Progress cleared')} title="Clear progress"><i className="bi bi-arrow-counterclockwise" /></button>
                      {r.leadId && <Link className="ldm-btn sm ghost" to={`/leads/${r.leadId}`} title="Open the lead in the CRM"><i className="bi bi-box-arrow-up-right" /> Lead</Link>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      {giving && <GiveDialog lengthDays={cfg?.lengthDays || 3} onClose={changed => { setGiving(false); if (changed) load(); }} />}
    </section>
  );
}

function ExtendMenu({ onPick }: { onPick: (days: number) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="ldm-menu-wrap" onMouseLeave={() => setOpen(false)}>
      <button type="button" className="ldm-btn sm" onClick={() => setOpen(o => !o)} aria-haspopup="menu" aria-expanded={open}><i className="bi bi-plus-circle" /> Extend</button>
      {open && (
        <span className="ldm-menu" role="menu">
          {[1, 2, 3, 7].map(d => <button key={d} type="button" role="menuitem" onClick={() => { setOpen(false); onPick(d); }}>+{d} day{d === 1 ? '' : 's'}</button>)}
        </span>
      )}
    </span>
  );
}

function GiveDialog({ lengthDays, onClose }: { lengthDays: number; onClose: (changed: boolean) => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [days, setDays] = useState(lengthDays);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<{ link: string; returning: boolean; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      setDone(await lmsDemoApi.give({ name: name.trim(), phone, email: email.trim() || undefined, lengthDays: days }));
    } catch (e2) { setErr(demoErr(e2)); } finally { setBusy(false); }
  };
  const wa = phone.replace(/\D/g, '').slice(-10);
  const msg = done ? encodeURIComponent(`Hi ${name.split(' ')[0]}, here is your free CodeBegun LMS demo. Tap to start (no password needed): ${done.link}`) : '';

  return (
    <div className="ldm-modal" role="dialog" aria-modal="true" aria-labelledby="ldm-give-t" onClick={() => onClose(!!done)}>
      <div className="ldm-modal-card" onClick={e => e.stopPropagation()}>
        <button type="button" className="ldm-modal-x" onClick={() => onClose(!!done)} aria-label="Close"><i className="bi bi-x-lg" /></button>
        {!done ? (
          <form onSubmit={submit} noValidate>
            <h2 id="ldm-give-t">Give a demo</h2>
            <p className="ldm-sub">Makes a demo account with every demo course open and gives you a one-tap link to send. The student is added to the CRM.</p>
            <label className="ldm-field"><span>Name</span><input value={name} onChange={e => setName(e.target.value)} maxLength={80} autoFocus /></label>
            <label className="ldm-field"><span>Mobile number</span><input value={phone} onChange={e => setPhone(e.target.value)} inputMode="numeric" placeholder="10-digit number" /></label>
            <label className="ldm-field"><span>Email <small>(optional)</small></span><input value={email} onChange={e => setEmail(e.target.value)} type="email" /></label>
            <label className="ldm-field"><span>Demo length</span>
              <select value={days} onChange={e => setDays(Number(e.target.value))}>
                {Array.from(new Set([1, 2, 3, 5, 7, 14, lengthDays])).sort((a, b) => a - b).map(d => <option key={d} value={d}>{d} day{d === 1 ? '' : 's'}{d === lengthDays ? ' (default)' : ''}</option>)}
              </select>
            </label>
            {err && <div className="ldm-alert">{err}</div>}
            <button className="ldm-btn primary wide" disabled={busy}>{busy ? 'Creating…' : 'Create demo'}</button>
          </form>
        ) : (
          <div className="ldm-given">
            <div className="ldm-given-ic"><i className="bi bi-check2-circle" /></div>
            <h2 id="ldm-give-t">{done.returning ? 'Demo ready (existing demo account)' : 'Demo ready'}</h2>
            <p className="ldm-sub">Open until {fmt(done.expiresAt)}. Send this link — it signs {name.split(' ')[0] || 'them'} in with one tap.</p>
            <div className="ldm-linkbox"><input readOnly value={done.link} onFocus={e => e.target.select()} aria-label="Demo link" /></div>
            <div className="ldm-given-actions">
              <button type="button" className="ldm-btn primary" onClick={async () => { try { await navigator.clipboard.writeText(done.link); setCopied(true); } catch { /* manual copy still works */ } }}><i className="bi bi-clipboard" /> {copied ? 'Copied' : 'Copy link'}</button>
              {wa.length === 10 && <a className="ldm-btn wa" href={`https://wa.me/91${wa}?text=${msg}`} target="_blank" rel="noreferrer"><i className="bi bi-whatsapp" /> Send on WhatsApp</a>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────── Courses ───────────────────────────── */

function CoursesTab({ cfg, plans, onSaved }: { cfg: DemoConfig; plans: DemoPlanOption[]; onSaved: (c: DemoConfig) => void }) {
  const [list, setList] = useState(() => [...(cfg.courses || [])].sort((a, b) => a.order - b.order).map(c => ({ ...c, curriculumId: String(c.curriculumId) })));
  const [pick, setPick] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const byId = useMemo(() => new Map(plans.map(p => [p._id, p])), [plans]);
  const available = plans.filter(p => !list.some(c => c.curriculumId === p._id));
  const dirty = JSON.stringify(list) !== JSON.stringify([...(cfg.courses || [])].sort((a, b) => a.order - b.order).map(c => ({ ...c, curriculumId: String(c.curriculumId) })));

  const patch = (i: number, p: any) => setList(l => l.map((c, j) => (j === i ? { ...c, ...p } : c)));
  const move = (i: number, d: number) => setList(l => { const n = [...l]; const j = i + d; if (j < 0 || j >= n.length) return l; [n[i], n[j]] = [n[j], n[i]]; return n.map((c, k) => ({ ...c, order: k })); });
  const add = () => {
    if (!pick) return;
    setList(l => [...l, { curriculumId: pick, title: '', blurb: '', color: COLORS[l.length % COLORS.length], order: l.length, active: true }]);
    setPick('');
  };
  const save = async () => {
    setBusy(true); setErr('');
    try { onSaved(await lmsDemoApi.saveConfig({ courses: list.map((c, i) => ({ ...c, order: i })) as any })); } catch (e) { setErr(demoErr(e)); } finally { setBusy(false); }
  };

  return (
    <section className="ldm-card">
      <div className="ldm-card-head">
        <div><h2>Demo courses</h2><p className="ldm-sub">Every demo student gets all the active courses below, every day open. Build each course's days, videos and notes in <Link to="/curriculum-builder">Curriculum Builder</Link>, then pick it here.</p></div>
        <button type="button" className="ldm-btn primary" onClick={save} disabled={busy || !dirty}>{busy ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}</button>
      </div>
      {err && <div className="ldm-alert">{err}</div>}

      <div className="ldm-courses">
        {list.map((c, i) => {
          const p = byId.get(c.curriculumId);
          return (
            <div key={c.curriculumId} className={`ldm-course${c.active ? '' : ' off'}`} style={{ ['--acc' as any]: c.color || COLORS[i % COLORS.length] }}>
              <div className="ldm-course-order">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"><i className="bi bi-chevron-up" /></button>
                <span>{i + 1}</span>
                <button type="button" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="Move down"><i className="bi bi-chevron-down" /></button>
              </div>
              <div className="ldm-course-body">
                <div className="ldm-course-plan">
                  <b>{p?.title || 'Learning Plan not found'}</b>
                  {p && <span className="ldm-sub">{p.daysWithContent} of {p.totalDays} days have content · {p.items} item{p.items === 1 ? '' : 's'}{!p.isPublished ? ' · not published' : ''}</span>}
                  {p && p.items === 0 && <span className="ldm-warn"><i className="bi bi-exclamation-triangle" /> No videos or notes yet — students will see empty days.</span>}
                </div>
                <div className="ldm-course-fields">
                  <label className="ldm-field"><span>Name on the card</span><input value={c.title || ''} onChange={e => patch(i, { title: e.target.value })} placeholder={p?.title || 'e.g. Java Full Stack'} maxLength={120} /></label>
                  <label className="ldm-field grow"><span>One line about it</span><input value={c.blurb || ''} onChange={e => patch(i, { blurb: e.target.value })} placeholder="What a student will learn" maxLength={300} /></label>
                  <div className="ldm-field"><span>Colour</span>
                    <div className="ldm-swatches">{COLORS.map(col => <button key={col} type="button" className={c.color === col ? 'on' : ''} style={{ background: col }} onClick={() => patch(i, { color: col })} aria-label={`Colour ${col}`} />)}</div>
                  </div>
                </div>
              </div>
              <div className="ldm-course-side">
                <label className="ldm-switch"><input type="checkbox" checked={c.active} onChange={e => patch(i, { active: e.target.checked })} /><span />{c.active ? 'Shown' : 'Hidden'}</label>
                {p && <Link className="ldm-btn sm" to={`/curriculum-builder/${c.curriculumId}`}><i className="bi bi-pencil-square" /> Edit days</Link>}
                <button type="button" className="ldm-btn sm ghost" onClick={() => setList(l => l.filter((_, j) => j !== i))}><i className="bi bi-trash" /> Remove</button>
              </div>
            </div>
          );
        })}
        {!list.length && <div className="ldm-empty"><i className="bi bi-collection-play" /><b>No demo courses yet</b><span>Pick a Learning Plan below — for example Java Full Stack, Python Full Stack, Data Analytics with AI and Data Science with AI.</span></div>}
      </div>

      <div className="ldm-add">
        <select value={pick} onChange={e => setPick(e.target.value)} aria-label="Learning Plan to add">
          <option value="">Add a Learning Plan…</option>
          {available.map(p => <option key={p._id} value={p._id}>{p.title} — {p.totalDays} days{p.items ? `, ${p.items} items` : ', empty'}</option>)}
        </select>
        <button type="button" className="ldm-btn" onClick={add} disabled={!pick}><i className="bi bi-plus-lg" /> Add</button>
        <Link className="ldm-btn ghost" to="/curriculum-builder/create"><i className="bi bi-plus-square" /> New Learning Plan</Link>
      </div>
    </section>
  );
}

/* ───────────────────────────── Settings ───────────────────────────── */

function SettingsTab({ cfg, onSaved }: { cfg: DemoConfig; onSaved: (c: DemoConfig) => void }) {
  const [f, setF] = useState({ enabled: cfg.enabled, lengthDays: cfg.lengthDays, aiPerDay: cfg.aiPerDay, counsellorPhone: cfg.counsellorPhone || '', counsellorWhatsApp: cfg.counsellorWhatsApp || '', endMessage: cfg.endMessage || '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (p: Partial<typeof f>) => setF(x => ({ ...x, ...p }));
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try { onSaved(await lmsDemoApi.saveConfig(f)); } catch (e2) { setErr(demoErr(e2)); } finally { setBusy(false); }
  };

  return (
    <form className="ldm-card ldm-settings" onSubmit={save}>
      <div className="ldm-card-head"><div><h2>Settings</h2><p className="ldm-sub">Apply to new demos. A demo already running keeps its end date; use Extend on the students tab to change one.</p></div></div>
      <label className="ldm-row">
        <div><b>Demo open</b><span className="ldm-sub">When off, the /demo page stops taking sign-ups. Running demos carry on.</span></div>
        <span className="ldm-switch"><input type="checkbox" checked={f.enabled} onChange={e => set({ enabled: e.target.checked })} /><span /></span>
      </label>
      <div className="ldm-row">
        <div><b>Demo length</b><span className="ldm-sub">Days a demo stays open. Separate from how many days a course has — every course day is open throughout.</span></div>
        <div className="ldm-num-in"><input type="number" min={1} max={60} value={f.lengthDays} onChange={e => set({ lengthDays: Number(e.target.value) })} aria-label="Demo length in days" /><span>days</span></div>
      </div>
      <div className="ldm-row">
        <div><b>AI questions per day</b><span className="ldm-sub">How many times a demo student can use the AI study helper each day. 0 turns it off.</span></div>
        <div className="ldm-num-in"><input type="number" min={0} max={200} value={f.aiPerDay} onChange={e => set({ aiPerDay: Number(e.target.value) })} aria-label="AI questions per day" /><span>a day</span></div>
      </div>
      <div className="ldm-row col">
        <div><b>Talk to a counsellor</b><span className="ldm-sub">Shown in the demo and on the end screen. Every click also marks the lead hot in the CRM.</span></div>
        <div className="ldm-grid2">
          <label className="ldm-field"><span>Phone</span><input value={f.counsellorPhone} onChange={e => set({ counsellorPhone: e.target.value })} placeholder="+91 …" /></label>
          <label className="ldm-field"><span>WhatsApp <small>(if different)</small></span><input value={f.counsellorWhatsApp} onChange={e => set({ counsellorWhatsApp: e.target.value })} placeholder="+91 …" /></label>
        </div>
        <label className="ldm-field"><span>Message on the end screen</span><textarea rows={2} value={f.endMessage} onChange={e => set({ endMessage: e.target.value })} maxLength={300} placeholder="Our counsellor will help you pick the right course, the batch timings and the fee plan that suits you." /></label>
      </div>
      {err && <div className="ldm-alert">{err}</div>}
      <div className="ldm-foot">
        {cfg.updatedByName && <span className="ldm-sub">Last changed by {cfg.updatedByName}{cfg.updatedAt ? `, ${fmt(cfg.updatedAt)}` : ''}</span>}
        <button className="ldm-btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
      </div>
    </form>
  );
}
