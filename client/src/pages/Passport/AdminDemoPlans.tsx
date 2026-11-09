import React, { useEffect, useState } from 'react';
import passportApi, { DemoPickItem, DemoPlan, DemoYearInfo } from '../../api/passportApi';
import { Skeleton } from './AdminRewardsTabs';
import './adminXpRewards.css';
import './adminTrials.css';
import './adminDemoPlans.css';

/**
 * Super Admin → CareerPilot → Demo plans.
 *
 * A plan says, for each year a demo can show, exactly what the demo account sees: the track, the
 * roadmap day it opens on, and the chosen Practice problems, Thinking Lab questions, interview
 * rounds and question books — nothing else. Demo accounts LINK to their plan, so an edit here
 * reaches them at once. Demo access itself is given from the member's profile.
 */

type Year = { enabled: boolean; track: string; landingDay: string; interviewTypes: string[]; practice: DemoPickItem[]; thinking: DemoPickItem[]; books: DemoPickItem[] };
type Draft = { id: string | null; name: string; description: string; startYear: string; active: boolean; years: Record<string, Year> };

const ROUND_LABEL: Record<string, string> = { technical: 'Technical', hr: 'HR / Behavioural', communication: 'Communication' };
const DIFF_LABEL: Record<string, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard', expert: 'Expert', interview: 'Interview' };

const toDraft = (p: DemoPlan | null, years: DemoYearInfo[]): Draft => ({
  id: p?.id || null,
  name: p?.name || '',
  description: p?.description || '',
  startYear: p?.startYear || years[0]?.key || 'foundation',
  active: p ? p.active : true,
  years: Object.fromEntries(years.map((y) => {
    const v = p?.years?.[y.key];
    return [y.key, {
      enabled: !!v?.enabled, track: v?.track || '', landingDay: String(v?.landingDay || 1),
      interviewTypes: v?.interviewTypes || (p ? [] : ['technical', 'hr', 'communication']),
      practice: v?.practice || [], thinking: v?.thinking || [], books: v?.books || [],
    }];
  })),
});

const AdminDemoPlans: React.FC = () => {
  const [plans, setPlans] = useState<DemoPlan[] | null>(null);
  const [years, setYears] = useState<DemoYearInfo[]>([]);
  const [rounds, setRounds] = useState<string[]>([]);
  const [maxPer, setMaxPer] = useState(200);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDel, setConfirmDel] = useState<DemoPlan | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => passportApi.listDemoPlans()
    .then((d) => { setPlans(d.plans); setYears(d.years); setRounds(d.roundTypes); setMaxPer(d.maxPerList); setErr(''); })
    .catch((e) => setErr(e?.response?.data?.message || 'Could not load the demo plans.'));
  useEffect(() => { load(); }, []);
  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(''), 4000); };

  const remove = async () => {
    if (!confirmDel) return;
    setBusy(true);
    try { await passportApi.deleteDemoPlan(confirmDel.id); flash(`“${confirmDel.name}” deleted.`); setConfirmDel(null); await load(); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Could not delete the plan.'); setConfirmDel(null); }
    setBusy(false);
  };

  return <div className="xr dp">
    <header className="xr-head">
      <div>
        <span className="xr-eyebrow">CareerPilot · Super Admin</span>
        <h1>Demo plans</h1>
        <p>What a demo account shows, year by year — chosen questions only, every gate open.</p>
      </div>
      <button type="button" className="xr-btn primary" disabled={!years.length} onClick={() => setDraft(toDraft(null, years))}><i className="bi bi-plus-lg" /> New plan</button>
    </header>

    {err && <div className="xr-err"><i className="bi bi-exclamation-circle" /> {err}</div>}
    {msg && <div className="xr-ok" role="status"><i className="bi bi-check-circle-fill" /> {msg}</div>}

    <section className="tp-how" aria-label="How demo accounts work">
      <div><i className="bi bi-1-circle-fill" /><span><b>Set up a plan here.</b> For each year: the track, the day it opens on, and the questions it shows.</span></div>
      <div><i className="bi bi-2-circle-fill" /><span><b>Show the real start.</b> Sign up, log in, take the skill check, open Skill DNA.</span></div>
      <div><i className="bi bi-3-circle-fill" /><span><b>Give demo access</b> from <a href="/admin/passport/students">CareerPilot Members</a> → the member → Demo access. Reset it after each visit.</span></div>
    </section>

    {!plans ? (err ? null : <Skeleton />)
      : !plans.length
        ? <div className="xr-card"><div className="xr-blank"><i className="bi bi-easel2" /> No demo plans yet. Make the first one, then give it to a demo account.</div></div>
        : <div className="tp-grid">
          {plans.map((p) => (
            <article key={p.id} className={`xr-card tp-card${p.active ? '' : ' off'}`}>
              <div className="tp-card-hd">
                <span className="tp-days"><b>{years.filter((y) => p.years[y.key]?.enabled).length}</b><small>years</small></span>
                <div className="tp-card-tx">
                  <h2>{p.name}</h2>
                  {p.description && <p>{p.description}</p>}
                  <span className="tp-meta">
                    {!p.active && <span className="xr-pill tp-off">Switched off</span>}
                    {p.missing.length > 0 ? <span className="xr-pill dp-bad"><i className="bi bi-exclamation-triangle-fill" /> Not ready</span>
                      : <span className="xr-pill dp-good"><i className="bi bi-check-circle-fill" /> Ready</span>}
                    <span><i className="bi bi-person-badge" /> {p.accounts} demo {p.accounts === 1 ? 'account' : 'accounts'}</span>
                  </span>
                </div>
              </div>
              <ul className="tp-items dp-years">
                {years.map((y) => {
                  const v = p.years[y.key];
                  return <li key={y.key} className={v?.enabled ? 'on' : ''}>
                    <i className={`bi ${v?.enabled ? 'bi-mortarboard-fill' : 'bi-dash-circle'}`} />
                    <span>{y.label}{p.startYear === y.key && v?.enabled ? <em className="dp-start">opens here</em> : null}</span>
                    <b>{v?.enabled ? `${v.practice.length} practice · ${v.thinking.length} thinking · ${v.interviewTypes.length} ${v.interviewTypes.length === 1 ? 'round' : 'rounds'}` : 'Off'}</b>
                  </li>;
                })}
              </ul>
              {p.missing.length > 0 && <ul className="dp-missing">{p.missing.slice(0, 3).map((m) => <li key={m}>{m}</li>)}{p.missing.length > 3 && <li>+{p.missing.length - 3} more</li>}</ul>}
              <div className="tp-card-ft">
                <button type="button" className="xr-btn sm danger" onClick={() => setConfirmDel(p)}><i className="bi bi-trash3" /> Delete</button>
                <button type="button" className="xr-btn sm" onClick={() => setDraft(toDraft(p, years))}><i className="bi bi-pencil" /> Edit</button>
              </div>
            </article>
          ))}
        </div>}

    {draft && <PlanEditor draft={draft} years={years} rounds={rounds} maxPer={maxPer} onClose={() => setDraft(null)}
      onSaved={async (name, missing) => { setDraft(null); flash(missing ? `“${name}” saved — finish it before giving it to an account (${missing}).` : `“${name}” saved and ready.`); await load(); }} />}

    {confirmDel && <div className="xr-drawer-bg center" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setConfirmDel(null); }}>
      <div className="xr-modal" role="dialog" aria-modal="true">
        <h3>Delete “{confirmDel.name}”?</h3>
        <p>{confirmDel.accounts
          ? `${confirmDel.accounts} demo ${confirmDel.accounts === 1 ? 'account uses' : 'accounts use'} this plan. End their demo access first.`
          : 'No demo account uses this plan. This cannot be undone.'}</p>
        <div className="xr-modal-ft">
          <button type="button" className="xr-btn" disabled={busy} onClick={() => setConfirmDel(null)}>Back</button>
          <button type="button" className="xr-btn danger" disabled={busy || confirmDel.accounts > 0} onClick={remove}>{busy ? 'Deleting…' : 'Delete plan'}</button>
        </div>
      </div>
    </div>}
  </div>;
};

const PlanEditor: React.FC<{ draft: Draft; years: DemoYearInfo[]; rounds: string[]; maxPer: number; onClose: () => void; onSaved: (name: string, missing: string) => void }> = ({ draft, years, rounds, maxPer, onClose, onSaved }) => {
  const [d, setD] = useState<Draft>(draft);
  const [tab, setTab] = useState<string>(draft.startYear);
  const [tracks, setTracks] = useState<{ key: string; name: string }[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const y = d.years[tab];
  const setYear = (p: Partial<Year>) => setD((x) => ({ ...x, years: { ...x.years, [tab]: { ...x.years[tab], ...p } } }));

  useEffect(() => { passportApi.listDemoTracks().then(setTracks).catch(() => setTracks([])); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [busy, onClose]);

  const save = async () => {
    if (!d.name.trim()) { setErr('Give the plan a name.'); return; }
    setBusy(true); setErr('');
    try {
      const r = await passportApi.saveDemoPlan(d.id, {
        name: d.name.trim(), description: d.description.trim(), startYear: d.startYear, active: d.active,
        years: Object.fromEntries(years.map((yy) => {
          const v = d.years[yy.key];
          return [yy.key, {
            enabled: v.enabled, track: v.track, landingDay: Math.max(1, Math.round(Number(v.landingDay)) || 1), interviewTypes: v.interviewTypes,
            practiceIds: v.practice.map((x) => x.id), thinkingIds: v.thinking.map((x) => x.id), bookIds: v.books.map((x) => x.id),
          }];
        })),
      });
      onSaved(d.name.trim(), r.missing.length ? r.missing[0] : '');
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not save the plan.'); }
    setBusy(false);
  };

  return <div className="xr-drawer-bg" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
    <aside className="xr-drawer tp-drawer dp-drawer" role="dialog" aria-modal="true" aria-label={d.id ? `Edit ${draft.name}` : 'New demo plan'}>
      <header className="xr-drawer-hd">
        <div><span className="xr-eyebrow">{d.id ? 'Edit demo plan' : 'New demo plan'}</span><h2>{d.name.trim() || 'Untitled plan'}</h2></div>
        <button type="button" className="xr-icon-btn" onClick={onClose} aria-label="Close"><i className="bi bi-x-lg" /></button>
      </header>

      <div className="xr-drawer-body">
        <div className="xr-f2">
          <label className="xr-f"><span className="xr-lbl">Name</span>
            <input value={d.name} maxLength={60} autoFocus={!d.id} placeholder="College demo — standard" onChange={(e) => setD({ ...d, name: e.target.value })} />
          </label>
          <label className="xr-f"><span className="xr-lbl">Opens on</span>
            <select value={d.startYear} onChange={(e) => setD({ ...d, startYear: e.target.value })}>
              {years.map((yy) => <option key={yy.key} value={yy.key}>{yy.label}</option>)}
            </select>
          </label>
        </div>
        <label className="xr-f"><span className="xr-lbl">Note <em>optional · for admins only</em></span>
          <input value={d.description} maxLength={300} placeholder="For engineering colleges" onChange={(e) => setD({ ...d, description: e.target.value })} />
        </label>

        <div className="dp-tabs" role="tablist" aria-label="Years">
          {years.map((yy) => (
            <button key={yy.key} type="button" role="tab" aria-selected={tab === yy.key} className={`${tab === yy.key ? 'on' : ''}${d.years[yy.key].enabled ? ' live' : ''}`} onClick={() => setTab(yy.key)}>
              {yy.label}{d.years[yy.key].enabled ? <i className="bi bi-check-circle-fill" aria-label="on" /> : null}
            </button>
          ))}
        </div>

        <fieldset className="xr-fs dp-year">
          <legend className="dp-year-lg">
            <span>{years.find((yy) => yy.key === tab)?.label} in the demo</span>
            <label className="xr-switch sm"><input type="checkbox" checked={y.enabled} onChange={(e) => setYear({ enabled: e.target.checked })} aria-label="Show this year" /><span>{y.enabled ? 'On' : 'Off'}</span></label>
          </legend>
          {!y.enabled ? <p className="xr-hint">This year is not part of the demo. Switch it on to choose what it shows.</p> : <>
            <div className="xr-f2">
              {tab !== 'foundation' ? (
                <label className="xr-f"><span className="xr-lbl">Track</span>
                  <select value={y.track} onChange={(e) => setYear({ track: e.target.value })}>
                    <option value="">Choose a track…</option>
                    {tracks.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
                  </select>
                </label>
              ) : <div className="xr-f"><span className="xr-lbl">Track</span><p className="xr-hint dp-inline">Year 1 has no track.</p></div>}
              <label className="xr-f"><span className="xr-lbl">Opens on roadmap day</span>
                <span className="xr-type-in wide"><input type="number" min={1} inputMode="numeric" value={y.landingDay} onChange={(e) => setYear({ landingDay: e.target.value })} aria-label="Roadmap day" /><em>day</em></span>
              </label>
            </div>

            <div className="xr-f"><span className="xr-lbl">Mock interview rounds</span>
              <div className="dp-rounds">
                {rounds.map((r) => (
                  <label key={r} className={`dp-chk${y.interviewTypes.includes(r) ? ' on' : ''}`}>
                    <input type="checkbox" checked={y.interviewTypes.includes(r)} onChange={(e) => setYear({ interviewTypes: e.target.checked ? [...y.interviewTypes, r] : y.interviewTypes.filter((t) => t !== r) })} />
                    {ROUND_LABEL[r] || r}
                  </label>
                ))}
              </div>
            </div>

            <Picker kind="problems" title="Practice problems" what="problems" max={maxPer} picked={y.practice} onChange={(practice) => setYear({ practice })} />
            <Picker kind="thinking" title="Thinking Lab questions" what="questions" max={maxPer} picked={y.thinking} onChange={(thinking) => setYear({ thinking })} />
            <Picker kind="books" title="Question books" what="books" max={maxPer} picked={y.books} onChange={(books) => setYear({ books })} />
          </>}
        </fieldset>

        <label className="xr-check"><input type="checkbox" checked={d.active} onChange={(e) => setD({ ...d, active: e.target.checked })} /> Can be given to demo accounts <em>(untick to retire it)</em></label>
        {d.id && <p className="xr-hint">Changes reach every demo account on this plan straight away.</p>}
        {err && <div className="xr-err"><i className="bi bi-exclamation-circle" /> <span>{err}</span></div>}
      </div>

      <footer className="xr-drawer-ft">
        <button type="button" className="xr-btn" disabled={busy} onClick={onClose}>Cancel</button>
        <button type="button" className="xr-btn primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : d.id ? 'Save' : 'Create plan'}</button>
      </footer>
    </aside>
  </div>;
};

/** Search one kind of content and build the year's ordered list of it. */
const Picker: React.FC<{ kind: 'problems' | 'thinking' | 'books'; title: string; what: string; max: number; picked: DemoPickItem[]; onChange: (p: DemoPickItem[]) => void }> = ({ kind, title, what, max, picked, onChange }) => {
  const [q, setQ] = useState('');
  const [diff, setDiff] = useState('');
  const [type, setType] = useState('');
  const [found, setFound] = useState<DemoPickItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [more, setMore] = useState(false);
  const [err, setErr] = useState('');
  const filters = kind === 'books' ? {} : { difficulty: diff || undefined, ...(kind === 'thinking' ? { type: type || undefined } : {}) };
  // A new search or filter starts again at page 1.
  useEffect(() => {
    let live = true;
    const t = window.setTimeout(() => {
      passportApi.searchDemoOptions(kind, q.trim(), { ...filters, page: 1 })
        .then((r) => { if (live) { setFound(r.items); setTotal(r.total); setHasMore(r.hasMore); setPage(1); setErr(''); } })
        .catch((e) => { if (live) setErr(e?.response?.data?.message || 'Could not search.'); });
    }, q ? 250 : 0);
    return () => { live = false; window.clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, kind, diff, type]);
  const loadMore = () => {
    setMore(true);
    passportApi.searchDemoOptions(kind, q.trim(), { ...filters, page: page + 1 })
      .then((r) => {
        setFound((prev) => { const ids = new Set((prev || []).map((p) => p.id)); return [...(prev || []), ...r.items.filter((p) => !ids.has(p.id))]; });
        setPage(page + 1); setHasMore(r.hasMore); setTotal(r.total);
      })
      .catch((e) => setErr(e?.response?.data?.message || 'Could not load more.'))
      .finally(() => setMore(false));
  };
  const addAllShown = () => {
    const room = max - picked.length;
    const add = (found || []).filter((p) => !has.has(p.id)).slice(0, Math.max(0, room));
    if (add.length) onChange([...picked, ...add]);
  };
  const has = new Set(picked.map((p) => p.id));
  const full = picked.length >= max;
  const move = (i: number, by: number) => {
    const j = i + by; if (j < 0 || j >= picked.length) return;
    const next = [...picked]; [next[i], next[j]] = [next[j], next[i]]; onChange(next);
  };
  const row = (p: DemoPickItem) => <>
    {p.number != null && <span className="tp-pn">#{p.number}</span>}
    <span className="tp-pt" title={p.title}>{p.title}{p.category ? <small className="dp-cat"> · {p.category}</small> : null}{!p.live && <small className="dp-gone"> · no longer published</small>}</span>
    {p.difficulty && <span className={`tp-pd ${p.difficulty}`}>{DIFF_LABEL[p.difficulty] || p.difficulty}</span>}
  </>;

  return <div className="dp-pick">
    <span className="xr-lbl dp-pick-hd">{title} <em>{picked.length} chosen · shown in this order</em></span>
    <div className="tp-picker">
      <div className="tp-pk-col">
        <span className="xr-search tp-pk-search"><i className="bi bi-search" />
          <input value={q} maxLength={80} placeholder={`Find ${what}`} onChange={(e) => setQ(e.target.value)} aria-label={`Search ${title}`} />
        </span>
        {kind !== 'books' && <div className="dp-filters">
          <div className="dp-seg" role="group" aria-label="Difficulty">
            {[['', 'All'], ['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']].map(([k, l]) =>
              <button key={k || 'all'} type="button" className={diff === k ? 'on' : ''} aria-pressed={diff === k} onClick={() => setDiff(k)}>{l}</button>)}
          </div>
          {kind === 'thinking' && <select className="dp-type" value={type} onChange={(e) => setType(e.target.value)} aria-label="Question type">
            <option value="">All types</option>
            <option value="math">Math puzzle</option>
            <option value="logical">Logical thinking</option>
            <option value="critical">Critical thinking</option>
            <option value="coding">Coding</option>
          </select>}
        </div>}
        {err ? <p className="tp-pk-note bad">{err}</p>
          : !found ? <p className="tp-pk-note">Loading…</p>
          : !found.length ? <p className="tp-pk-note">{q || diff || type ? 'Nothing matches.' : `No ${what} to choose from yet.`}</p>
          : <>
            <div className="dp-count">
              <span>Showing {found.length.toLocaleString()} of {total.toLocaleString()}</span>
              <button type="button" className="dp-link" disabled={full || found.every((p) => has.has(p.id))} onClick={addAllShown}>Add all shown</button>
            </div>
            <ul className="tp-pk-list dp-found">
              {found.map((p) => <li key={p.id}>
                {row(p)}
                <button type="button" className="tp-pk-btn" disabled={has.has(p.id) || full} onClick={() => onChange([...picked, p])}
                  aria-label={has.has(p.id) ? `${p.title} is chosen` : `Add ${p.title}`}>
                  <i className={`bi ${has.has(p.id) ? 'bi-check-lg' : 'bi-plus-lg'}`} />
                </button>
              </li>)}
              {hasMore && <li className="dp-more-li"><button type="button" className="dp-more" disabled={more} onClick={loadMore}>{more ? 'Loading…' : `Load ${Math.min(50, total - found.length)} more`}</button></li>}
            </ul>
            {full && <p className="tp-pk-note">This list is full ({max}). Remove one to add another.</p>}
          </>}
      </div>
      <div className="tp-pk-col">
        {!picked.length ? <p className="tp-pk-note">Add {what} from the search. Only these show in the demo for this year.</p>
          : <ol className="tp-pk-list chosen">
            {picked.map((p, i) => <li key={p.id}>
              {row(p)}
              <span className="dp-order">
                <button type="button" className="tp-pk-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${p.title} up`}><i className="bi bi-arrow-up" /></button>
                <button type="button" className="tp-pk-btn" disabled={i === picked.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${p.title} down`}><i className="bi bi-arrow-down" /></button>
              </span>
              <button type="button" className="tp-pk-btn rm" onClick={() => onChange(picked.filter((x) => x.id !== p.id))} aria-label={`Remove ${p.title}`}><i className="bi bi-x-lg" /></button>
            </li>)}
          </ol>}
      </div>
    </div>
  </div>;
};

export default AdminDemoPlans;
