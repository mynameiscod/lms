import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './AdminJourney.css';

/**
 * CareerPilot Journey: where people drop, step by step, from the first look at the sign-up page to
 * "still here in week two". Every number comes from the server (careerPilotJourneyService); this page
 * only draws it. Click a step to see who stopped there and where they were last seen.
 *
 * Two kinds of step, because the data has two halves:
 *  - before an account exists the steps count VISITORS, each against the step before it;
 *  - from the verified OTP on, the steps count PEOPLE out of the accounts created in the period, because
 *    people do not take them in one order. "Dropped" there means "accounts that have not reached it",
 *    which is exactly the list a click shows.
 */

const BASE = (process.env.REACT_APP_API_URL || '/api/v1') + '/careerpilot/admin/journey';
const auth = () => {
  const token = localStorage.getItem('token'); const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};

interface Step { key: string; group: 'visitor' | 'member'; label: string; count: number; pctOfPrev?: number | null; pctOfTop?: number | null; pctOfAccounts?: number | null; medianMinutes?: number | null }
interface Row { name: string; visitors?: number; gotOtp?: number; verified?: number; pctVerified?: number | null; accounts?: number; paid?: number; pctPaid?: number | null }
interface Kpi { value: number; previous: number | null; change: number | null }
interface Journey {
  range: { from: string; to: string };
  steps: Step[]; kpis: Record<'signups' | 'accounts' | 'orientation' | 'assessStarted' | 'week2', Kpi>;
  tracking: { accounts: number; verifiedSeen: number; coverage: number | null };
  formLeaks: { leftAfterField: { what: string; visitors: number }[]; blockedByErrors: { what: string; visitors: number }[]; rejectedByServer: { what: string; visitors: number }[]; wrongOtpVisitors: number; resentOtpVisitors: number };
  bySource: Row[]; byDevice: Row[]; accountsBySource: Row[];
}
interface Dropped { total: number; lastSeen: { name: string; count: number }[]; people: { id: string; name: string; email: string; phone: string; joinedAt: string; lastSeen: string; lastSeenAt: string | null; daysSince: number }[] }

const PRESETS: [string, string][] = [['today', 'Today'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['all', 'All time']];
const PREV_TEXT: Record<string, string> = { today: 'vs previous day', '7d': 'vs previous 7 days', '30d': 'vs previous 30 days', custom: 'vs previous period' };

/** The ten steps drawn as circles, in order. `short` is the name used in the drop-off list. */
const FUNNEL: { key: string; label: string; short: string; icon: string; color: string }[] = [
  { key: 'v1', label: 'Opened Sign-up Page', short: 'Sign-up Page', icon: 'bi-file-earmark-text-fill', color: '#2563eb' },
  { key: 'v2', label: 'Started Filling Form', short: 'Started Filling Form', icon: 'bi-ui-checks-grid', color: '#3b82f6' },
  { key: 'v3', label: 'Pressed Create Account', short: 'Pressed Create Account', icon: 'bi-person-plus-fill', color: '#2563eb' },
  { key: 'v4', label: 'Got OTP on WhatsApp', short: 'Got OTP', icon: 'bi-chat-dots-fill', color: '#16a34a' },
  { key: 'v5', label: 'Entered OTP (Verified)', short: 'Verified OTP', icon: 'bi-check-lg', color: '#15803d' },
  { key: 'account', label: 'Account Created', short: 'Account Created', icon: 'bi-person-fill', color: '#7c3aed' },
  { key: 'orientation', label: 'Started Orientation (Day 1)', short: 'Started Orientation', icon: 'bi-house-fill', color: '#f97316' },
  { key: 'assessDone', label: 'Finished Skill Assessment', short: 'Finished Skill Assessment', icon: 'bi-clipboard-check-fill', color: '#ec4899' },
  { key: 'practice', label: 'Did a Practice Task', short: 'Practice Task', icon: 'bi-check2-square', color: '#2563eb' },
  { key: 'week2', label: 'Active in Week 2', short: 'Active in Week 2', icon: 'bi-lightning-charge-fill', color: '#60a5fa' },
];
/** Steps after sign-up that are not circles above but still matter (payment above all). */
const MORE = ['setup', 'home', 'assessStart', 'checkout', 'paid', 'back'];

/**
 * What to say to someone who stopped at each step. {name} becomes their first name and {link} the sign-in page.
 * The admin can edit the text before sending; the WhatsApp button opens the person's chat with it filled in.
 */
const NUDGES: Record<string, string> = {
  setup: 'Hi {name}, this is CareerPilot by CodeBegun. Your account is ready. Finish the 2-minute setup so we can build your plan around your goal: {link}',
  home: 'Hi {name}, this is CareerPilot by CodeBegun. Your account is ready and your Mission Control is waiting. Take a look: {link}',
  orientation: 'Hi {name}, this is CareerPilot by CodeBegun. Day 1 is ready for you and takes about 10 minutes. Start here: {link}',
  assessStart: 'Hi {name}, this is CareerPilot by CodeBegun. Your free skill assessment takes about 10 minutes and shows exactly where you stand. Start it here: {link}',
  assessDone: 'Hi {name}, this is CareerPilot by CodeBegun. You started the skill assessment. Finish it to get your personal roadmap: {link}',
  practice: 'Hi {name}, this is CareerPilot by CodeBegun. Your first practice task is ready. Ten minutes a day is what changes interview results: {link}',
  checkout: 'Hi {name}, this is CareerPilot by CodeBegun. Want to unlock your full daily plan, mock interviews and readiness tracking? Here is where to start: {link}',
  paid: 'Hi {name}, this is CareerPilot by CodeBegun. Your membership unlocks your full daily plan, mock interviews and readiness tracking. Continue here: {link}',
  back: 'Hi {name}, this is CareerPilot by CodeBegun. Your next daily mission is ready. A small streak makes a big difference: {link}',
  week2: 'Hi {name}, this is CareerPilot by CodeBegun. We have not seen you for a few days. Your plan is waiting and picking up takes 10 minutes: {link}',
};
const fillNudge = (tpl: string, name: string) => tpl.replace(/\{name\}/g, (name || '').split(' ')[0] || 'there').replace(/\{link\}/g, `${window.location.origin}/careerpilot/login`);
const waLink = (phone: string, text: string) => {
  const d = phone.replace(/\D/g, '');
  return `https://wa.me/${d.length === 10 ? '91' + d : d}?text=${encodeURIComponent(text)}`;
};
const csvOf = (rows: Dropped['people']) => {
  const q = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return ['Name,Email,Phone,Last seen doing,Quiet for (days)', ...rows.map((p) => [p.name, p.email, p.phone, p.lastSeen, p.daysSince].map(q).join(','))].join('\n');
};

const when = (mins?: number | null) => {
  if (mins == null) return '—';
  if (mins < 1) return 'under a minute';
  if (mins < 90) return `${mins} min`;
  if (mins < 60 * 36) return `${Math.round(mins / 60)} h`;
  return `${Math.round(mins / 1440)} days`;
};
const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const pctText = (n: number | null | undefined) => (n == null ? '—' : `${n}%`);

const AdminJourney: React.FC = () => {
  const navigate = useNavigate();
  const [preset, setPreset] = useState('7d');
  const [custom, setCustom] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [showRange, setShowRange] = useState(false);
  const [view, setView] = useState<'users' | 'rate'>('users');
  const [data, setData] = useState<Journey | null>(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<Step | null>(null);
  const [dropped, setDropped] = useState<Dropped | null>(null);
  const [loading, setLoading] = useState(false);
  const [nudge, setNudge] = useState('');
  const [copied, setCopied] = useState(false);

  const params = useCallback(() => (preset === 'custom' && custom.from
    ? { from: new Date(`${custom.from}T00:00:00`).toISOString(), to: new Date(`${custom.to || custom.from}T23:59:59.999`).toISOString() }
    : { preset }), [preset, custom]);

  const load = useCallback(() => {
    setLoading(true); setErr('');
    axios.get(BASE, { headers: auth(), params: params() }).then((r) => setData(r.data)).catch((e) => setErr(e?.response?.data?.message || 'Could not load the journey.')).finally(() => setLoading(false));
  }, [params]);
  useEffect(() => { load(); setOpen(null); setDropped(null); }, [load]);

  const step = (key: string) => data?.steps.find((s) => s.key === key);
  const pick = (s: Step) => {
    setOpen(s); setDropped(null); setNudge(NUDGES[s.key] || '');
    if (s.group === 'member' && s.key !== 'account') axios.get(`${BASE}/dropped`, { headers: auth(), params: { ...params(), step: s.key } }).then((r) => setDropped(r.data)).catch(() => setDropped({ total: 0, lastSeen: [], people: [] }));
  };

  const accounts = data?.tracking.accounts || 0;
  const count = (k: string) => step(k)?.count ?? 0;

  /** For one circle: the share shown on it, and how many did not make it. */
  const figures = (i: number) => {
    const s = step(FUNNEL[i].key); if (!s) return { pct: null as number | null, lost: 0 };
    if (i === 0) return { pct: s.count ? 100 : null, lost: 0 };
    if (s.group === 'visitor') return { pct: s.pctOfPrev ?? null, lost: Math.max(0, count(FUNNEL[i - 1].key) - s.count) };
    if (s.key === 'account') return { pct: s.pctOfPrev ?? (count('v5') ? Math.round((s.count / count('v5')) * 1000) / 10 : null), lost: Math.max(0, count('v5') - s.count) };
    return { pct: s.pctOfAccounts ?? null, lost: Math.max(0, accounts - s.count) };
  };

  /** The biggest losses, worst first. Week 2 is left out: a brand-new account cannot have reached it yet. */
  const dropoffs = FUNNEL.map((f, i) => ({ f, i, ...figures(i) }))
    .filter((x) => x.i > 0 && x.f.key !== 'week2' && x.lost > 0)
    .sort((a, b) => b.lost - a.lost || (a.pct ?? 0) - (b.pct ?? 0))
    .slice(0, 3)
    .map((x) => {
      // Before the account each step is measured against the one before; after it, against the accounts.
      const from = x.i >= 6 ? 'Account Created' : FUNNEL[x.i - 1].short;
      const base = x.i >= 6 ? accounts : count(FUNNEL[x.i - 1].key);
      return { name: `${from} → ${x.f.short}`, lost: x.lost, lostPct: base ? Math.round((x.lost / base) * 1000) / 10 : 0, conv: x.pct };
    });

  const insights = (() => {
    if (!data) return [];
    const out: { tone: 'good' | 'bad' | 'warn'; title: string; text: string }[] = [];
    const v1 = count('v1'); const v2 = count('v2'); const v4 = count('v4'); const v5 = count('v5');
    if (v4 > 0) {
      const r = Math.round((v5 / v4) * 1000) / 10;
      out.push(r >= 95 ? { tone: 'good', title: `${r}% users verify OTP`, text: 'Great! No drop-off after OTP step.' } : { tone: 'bad', title: `${Math.round((100 - r) * 10) / 10}% drop at the OTP step`, text: 'People got the code but did not enter it. Check WhatsApp delivery and the OTP screen.' });
    }
    if (v1 > 0) {
      const d = Math.round(((v1 - v2) / v1) * 1000) / 10;
      out.push(d >= 30 ? { tone: 'bad', title: `${d}% drop-off at form start`, text: "Many users open the page but don't start filling the form." } : { tone: 'good', title: `${Math.round((100 - d) * 10) / 10}% start the form`, text: 'Most visitors begin filling the form.' });
    }
    if (accounts > 0) {
      const o = count('orientation'); const r = Math.round((o / accounts) * 1000) / 10;
      out.push(r < 80 ? { tone: 'warn', title: `Only ${r}% start orientation`, text: `${o} out of ${accounts} users start orientation after account creation.` } : { tone: 'good', title: `${r}% start orientation`, text: 'New members are getting into day 1.' });
      const p = count('practice'); const pr = Math.round((p / accounts) * 1000) / 10;
      out.push(pr < 30 ? { tone: 'bad', title: `${pr}% reach practice tasks`, text: p === 0 ? 'No users are completing practice tasks. This needs immediate attention.' : 'Few new members do a practice task. This needs attention.' } : { tone: 'good', title: `${pr}% reach practice tasks`, text: 'Members are practising.' });
    }
    return out;
  })();

  const kpi = (k: keyof Journey['kpis']) => data?.kpis?.[k];
  const KPIS: { k: keyof Journey['kpis']; label: string; icon: string; bg: string; fg: string }[] = [
    { k: 'signups', label: 'Sign-up Page Visitors', icon: 'bi-people-fill', bg: '#dbeafe', fg: '#2563eb' },
    { k: 'accounts', label: 'Accounts Created', icon: 'bi-person-check-fill', bg: '#dcfce7', fg: '#16a34a' },
    { k: 'orientation', label: 'Orientation Started', icon: 'bi-play-circle-fill', bg: '#e0f2fe', fg: '#0284c7' },
    { k: 'assessStarted', label: 'Skill Assessment Started', icon: 'bi-clipboard2-check-fill', bg: '#dcfce7', fg: '#15803d' },
    { k: 'week2', label: 'Active in Week 2', icon: 'bi-bar-chart-fill', bg: '#ffedd5', fg: '#ea580c' },
  ];

  return (
    <div className="cj">
      <div className="cj-head">
        <div>
          <div className="cj-title">
            <button className="cj-back" onClick={() => navigate(-1)} aria-label="Back"><i className="bi bi-arrow-left" /></button>
            <h1>CareerPilot Journey</h1>
          </div>
          <p className="cj-sub">See the complete user journey from sign-up to habit formation. Understand where users drop off and what's working.</p>
        </div>
        <div className="cj-controls">
          {PRESETS.map(([k, label]) => <button key={k} className={`cj-pill${preset === k ? ' on' : ''}`} onClick={() => { setPreset(k); setShowRange(false); }}>{label}</button>)}
          <button className={`cj-pill${preset === 'custom' ? ' on' : ''}`} onClick={() => setShowRange((v) => !v)} title="Pick your own dates">
            <i className="bi bi-calendar3" /> {data ? `${day(data.range.from)} - ${day(data.range.to)}` : 'Date range'}
          </button>
          <button className="cj-pill" onClick={load}><i className="bi bi-arrow-clockwise" /> {loading ? 'Loading…' : 'Refresh'}</button>
        </div>
      </div>
      {showRange && (
        <div className="cj-range" style={{ marginBottom: 14 }}>
          <input type="date" value={custom.from} max={ymd(new Date())} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
          <span>to</span>
          <input type="date" value={custom.to} max={ymd(new Date())} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
          <button className="cj-pill on" disabled={!custom.from} onClick={() => { setPreset('custom'); setShowRange(false); }}>Apply</button>
        </div>
      )}

      {err && <div className="cj-err">{err}</div>}
      {!data && !err && <div style={{ color: '#9ca3af', padding: 40, textAlign: 'center' }}>Loading…</div>}

      {data && (
        <>
          <div className="cj-kpis">
            {KPIS.map(({ k, label, icon, bg, fg }) => {
              const v = kpi(k);
              const c = v?.change;
              return (
                <div className="cj-kpi" key={k}>
                  <div className="cj-kpi-ico" style={{ background: bg, color: fg }}><i className={`bi ${icon}`} /></div>
                  <div>
                    <div className="cj-kpi-label">{label}</div>
                    <div className="cj-kpi-num">
                      <b>{v?.value ?? 0}</b>
                      {c != null && <span className={`cj-chg ${c > 0 ? 'up' : c < 0 ? 'down' : 'flat'}`}>{c > 0 ? '↑' : c < 0 ? '↓' : '–'} {Math.abs(c)}%</span>}
                    </div>
                    <small>{c == null ? 'all time' : PREV_TEXT[preset] || PREV_TEXT.custom}</small>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="cj-card">
            <div className="cj-card-head">
              <div><h2>User Journey Funnel</h2><p>From sign-up to long-term activation. Click a step to see who stopped there.</p></div>
              <div className="cj-toggle">
                <button className={view === 'users' ? 'on' : ''} onClick={() => setView('users')}>Number of Users</button>
                <button className={view === 'rate' ? 'on' : ''} onClick={() => setView('rate')}>Conversion %</button>
              </div>
            </div>
            <div className="cj-funnel">
              {FUNNEL.map((f, i) => {
                const s = step(f.key); if (!s) return null;
                const { pct, lost } = figures(i);
                return (
                  <div className="cj-node-wrap" key={f.key}>
                    <button className={`cj-node${open?.key === f.key ? ' sel' : ''}`} onClick={() => pick(s)}>
                      <div className="cj-circle" style={{ background: f.color }}><i className={`bi ${f.icon}`} /><span className="cj-step-no">{i + 1}</span></div>
                      <div className="cj-node-label">{f.label}</div>
                      <div className="cj-node-num">{view === 'users' ? s.count : pctText(pct)}</div>
                      {view === 'users' && <span className={`cj-chip${pct != null && pct < 50 ? ' bad' : ''}`} title={s.group === 'member' && s.key !== 'account' ? 'Share of the accounts created in this period' : 'Share of the step before'}>{pctText(pct)}</span>}
                      {view === 'rate' && <span className="cj-chip" style={{ background: '#eef2ff', color: '#4338ca' }}>{s.count} users</span>}
                      {i === 0 ? <span className="cj-foot plain">Visitors</span>
                        : f.key === 'week2' ? <span className="cj-foot plain">{lost > 0 ? `${s.count} of ${accounts}` : 'all of them'}</span>
                        : <span className={`cj-foot${lost === 0 ? ' ok' : ''}`}>{lost} dropped</span>}
                    </button>
                    {i < FUNNEL.length - 1 && <i className="bi bi-arrow-right cj-arrow" />}
                  </div>
                );
              })}
            </div>
            {data.tracking.coverage !== null && data.tracking.coverage < 90 && (
              <p className="cj-note">
                The sign-up page tracking saw {data.tracking.verifiedSeen} of the {data.tracking.accounts} accounts created in this period ({data.tracking.coverage}%). Older sign-ups happened before tracking started, or the visitor blocked it. Read the first five steps as a sample.
              </p>
            )}
          </div>

          {open && (
            <div className="cj-card cj-detail">
              <h2 style={{ margin: '0 0 8px', fontSize: 17 }}>{open.group === 'member' ? `Did not reach: ${open.label}` : `Where the sign-up form loses people (before "${open.label}")`}</h2>
              {open.group === 'visitor' ? (
                <>
                <p style={{ margin: '0 0 10px', fontSize: 13, color: '#6b7280' }}>These visitors have not given us a name or number yet, so there is no one to message at this step. Once someone verifies their OTP they appear on the later steps, with their details.</p>
                <div className="cj-leaks">
                  <LeakList title="Left the page after touching…" rows={data.formLeaks.leftAfterField} />
                  <LeakList title="Pressed Create but the form had errors in…" rows={data.formLeaks.blockedByErrors} />
                  <LeakList title="The server said no because…" rows={data.formLeaks.rejectedByServer} />
                  <div><b>OTP trouble</b><p style={{ margin: '6px 0 0' }}>{data.formLeaks.wrongOtpVisitors} visitors typed a wrong code · {data.formLeaks.resentOtpVisitors} asked for the code again.</p></div>
                </div>
                </>
              ) : open.key === 'account' ? <p style={{ color: '#6b7280' }}>These are the {accounts} accounts the rest of the funnel is measured against.</p>
                : !dropped ? <p style={{ color: '#9ca3af' }}>Loading…</p> : (
                  <>
                    <p style={{ margin: '0 0 4px' }}><b>{dropped.total}</b> of the {accounts} new accounts. Last thing each was seen doing:</p>
                    <div className="cj-chips">{dropped.lastSeen.map((l) => <span key={l.name}>{l.name} <b>{l.count}</b></span>)}</div>
                    {dropped.people.length > 0 && (
                      <>
                        <label style={{ fontSize: 12.5, fontWeight: 700, color: '#374151' }}>Message to send on WhatsApp (edit it if you like; {'{name}'} becomes their first name)</label>
                        <textarea className="cj-msg" value={nudge} onChange={(e) => setNudge(e.target.value)} />
                        <div className="cj-actions">
                          <button className="cj-pill" onClick={() => { navigator.clipboard?.writeText(dropped.people.map((p) => p.phone).filter(Boolean).join('\n')).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => undefined); }}>{copied ? '✓ Copied' : 'Copy all numbers'}</button>
                          <a className="cj-pill" href={`data:text/csv;charset=utf-8,${encodeURIComponent(csvOf(dropped.people))}`} download={`careerpilot-${open?.key}-stopped.csv`}>Download list (CSV)</a>
                        </div>
                      </>
                    )}
                    <div style={{ overflowX: 'auto' }}>
                      <table className="cj-table">
                        <thead><tr><th>Person</th><th>Phone</th><th>Last seen doing</th><th>Quiet for</th><th></th></tr></thead>
                        <tbody>
                          {dropped.people.map((p) => (
                            <tr key={p.id}>
                              <td><b>{p.name}</b><div style={{ color: '#9ca3af', fontSize: 12 }}>{p.email}</div></td>
                              <td>{p.phone ? <a href={`https://wa.me/${p.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">{p.phone}</a> : '—'}</td>
                              <td>{p.lastSeen}</td>
                              <td>{p.daysSince === 0 ? 'today' : `${p.daysSince} d`}</td>
                              <td>{p.phone ? <a className="cj-wa" href={waLink(p.phone, fillNudge(nudge || NUDGES[open?.key || ''] || '', p.name))} target="_blank" rel="noreferrer"><i className="bi bi-whatsapp" /> WhatsApp</a> : '—'}</td>
                            </tr>
                          ))}
                          {!dropped.people.length && <tr><td style={{ color: '#9ca3af' }} colSpan={5}>Nobody: everyone in this period reached this step.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
            </div>
          )}

          <div className="cj-two">
            <div className="cj-card cj-drop">
              <div className="cj-card-head" style={{ marginBottom: 10 }}>
                <div><h2 style={{ color: '#7f1d1d' }}><i className="bi bi-exclamation-triangle-fill" style={{ color: '#dc2626' }} /> Major Drop-off Points</h2><p>Users are leaving at the following steps. Focus on these to improve conversion.</p></div>
              </div>
              {dropoffs.map((d, i) => (
                <div className="cj-row" key={d.name}>
                  <div className="cj-rank">{i + 1}</div>
                  <div className="cj-row-main"><b>{d.name}</b><div>{d.lost} user{d.lost === 1 ? '' : 's'} ({d.lostPct}%) dropped here</div></div>
                  <div className="cj-row-rate"><b>{pctText(d.conv)}</b><span>conversion rate</span></div>
                </div>
              ))}
              {!dropoffs.length && <p style={{ color: '#6b7280', margin: 0 }}>No drop-offs in this period.</p>}
            </div>
            <div className="cj-card cj-ins">
              <div className="cj-card-head" style={{ marginBottom: 10 }}><div><h2><i className="bi bi-lightbulb-fill" style={{ color: '#f59e0b' }} /> Key Insights</h2></div></div>
              {insights.map((x) => (
                <div className="cj-insight" key={x.title}>
                  <div className={`cj-ins-ico ${x.tone}`}><i className={`bi ${x.tone === 'good' ? 'bi-arrow-up' : x.tone === 'bad' ? 'bi-arrow-down' : 'bi-exclamation-triangle-fill'}`} /></div>
                  <div><b>{x.title}</b><span>{x.text}</span></div>
                </div>
              ))}
              {!insights.length && <p style={{ color: '#6b7280', margin: 0 }}>Not enough activity in this period to say yet.</p>}
            </div>
          </div>

          <div className="cj-tables">
            <Table title="Visitors by where they came from" rows={data.bySource} cols={[['visitors', 'Visitors'], ['gotOtp', 'Got OTP'], ['verified', 'Verified'], ['pctVerified', '% Verified']]} />
            <Table title="Visitors by device" rows={data.byDevice} cols={[['visitors', 'Visitors'], ['gotOtp', 'Got OTP'], ['verified', 'Verified'], ['pctVerified', '% Verified']]} />
            <Table title="New accounts by campaign source" rows={data.accountsBySource} cols={[['accounts', 'Accounts'], ['paid', 'Paid'], ['pctPaid', '% Paid']]} />
          </div>

          <div className="cj-card cj-more">
            <div className="cj-card-head" style={{ marginBottom: 6 }}><div><h2 style={{ fontSize: 16 }}>Other steps after sign-up</h2><p>Including payment. Each is a share of the {accounts} new accounts. Click one to see who has not reached it.</p></div></div>
            {MORE.map((k) => { const s = step(k); if (!s) return null; return (
              <button key={k} className={open?.key === k ? 'sel' : ''} onClick={() => pick(s)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, gap: 8 }}>
                  <b>{s.label}</b>
                  <span><b>{s.count}</b> <span style={{ color: '#6b7280', marginLeft: 6 }}>{pctText(s.pctOfAccounts)}</span>{s.medianMinutes != null && <span style={{ color: '#9ca3af', marginLeft: 8 }}>typically {when(s.medianMinutes)} after joining</span>}</span>
                </div>
                <div className="cj-bar"><i style={{ width: `${Math.max(s.pctOfAccounts ?? 0, s.count ? 2 : 0)}%` }} /></div>
              </button>
            ); })}
          </div>
        </>
      )}
    </div>
  );
};

const LeakList: React.FC<{ title: string; rows: { what: string; visitors: number }[] }> = ({ title, rows }) => (
  <div>
    <b>{title}</b>
    {rows.length ? <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{rows.map((r) => <li key={r.what}>{r.what} <b>({r.visitors})</b></li>)}</ul> : <p style={{ margin: '6px 0 0', color: '#9ca3af' }}>Nothing recorded yet.</p>}
  </div>
);

const Table: React.FC<{ title: string; rows: Row[]; cols: [keyof Row, string][] }> = ({ title, rows, cols }) => (
  <div className="cj-card">
    <b style={{ fontSize: 14 }}>{title}</b>
    <div className="cj-table-wrap">
    <table className="cj-table" style={{ marginTop: 8 }}>
      <thead><tr><th>{title.startsWith('New') ? 'Campaign Source' : title.includes('device') ? 'Device' : 'Source'}</th>{cols.map(([, l]) => <th key={l}>{l}</th>)}</tr></thead>
      <tbody>
        {rows.map((r) => <tr key={r.name}><td><b>{r.name}</b></td>{cols.map(([k, l]) => <td key={l}>{r[k] == null ? '—' : String(r[k]) + (String(k).startsWith('pct') ? '%' : '')}</td>)}</tr>)}
        {!rows.length && <tr><td style={{ color: '#9ca3af' }} colSpan={cols.length + 1}>No data in this period yet.</td></tr>}
      </tbody>
    </table>
    </div>
  </div>
);

export default AdminJourney;
