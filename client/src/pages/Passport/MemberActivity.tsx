import React, { useCallback, useEffect, useState } from 'react';
import passportApi, { MemberActivity as Activity, MemberActivityRow } from '../../api/passportApi';

/**
 * Super admin → a member's profile → everything they have done.
 *
 * Newest first, grouped by day: every screen they opened, what they did (videos watched to which
 * point, lessons completed, practice and assignments submitted, quizzes), the server calls behind it,
 * and anything that failed on them. Includes the visits from the same browser before they signed up.
 */

const FILTERS: { key: string; label: string; kinds: string }[] = [
  { key: 'story', label: 'What they did', kinds: 'page,action,error' },
  { key: 'all', label: 'Everything', kinds: '' },
  { key: 'page', label: 'Screens', kinds: 'page' },
  { key: 'action', label: 'Actions', kinds: 'action' },
  { key: 'api', label: 'Server calls', kinds: 'api' },
  { key: 'error', label: 'Problems', kinds: 'error' },
];
const ICON: Record<string, string> = { page: 'bi-window', action: 'bi-hand-index-thumb', api: 'bi-hdd-network', error: 'bi-exclamation-triangle' };

const dayKey = (d: string) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const time = (d: string) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const mins = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min ${s % 60}s` : `${s}s`);

/** Screen addresses in words. Unknown paths fall back to the address itself. */
const SCREENS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^\/careerpilot\/?$/, () => 'Opened Mission Control'],
  [/^\/careerpilot\/journey\/day\/(\d+)/, m => `Opened roadmap day ${m[1]}`],
  [/^\/careerpilot\/journey\/welcome\/(\d+)/, m => `Opened welcome day ${m[1]}`],
  [/^\/careerpilot\/(journey|roadmap|plan)/, () => 'Opened the roadmap'],
  [/^\/careerpilot\/assignments\/[^/]+\/workspace/, () => 'Opened an assignment to work on'],
  [/^\/careerpilot\/assignments\/[^/]+\/result/, () => 'Opened an assignment result'],
  [/^\/careerpilot\/practice\/[^/]+/, () => 'Opened a practice problem'],
  [/^\/careerpilot\/practice/, () => 'Opened coding practice'],
  [/^\/careerpilot\/material\//, () => 'Opened lesson material'],
  [/^\/careerpilot\/learn\//, () => 'Opened a skill course'],
  [/^\/careerpilot\/(readiness|skills)/, () => 'Opened role readiness / Skill DNA'],
  [/^\/careerpilot\/interview/, () => 'Opened mock interviews'],
  [/^\/careerpilot\/companies/, () => 'Opened company prep'],
  [/^\/careerpilot\/mentor/, () => 'Opened the AI mentor'],
  [/^\/careerpilot\/question-books/, () => 'Opened question books'],
  [/^\/careerpilot\/profile/, () => 'Opened their profile'],
  [/^\/careerpilot\/resume/, () => 'Opened the resume builder'],
  [/^\/careerpilot\/(rewards|store|coins)/, () => 'Opened rewards'],
  [/^\/careerpilot\/(join|login)/, m => m[1] === 'join' ? 'Opened the join page' : 'Opened the sign-in page'],
];
const label = (r: MemberActivityRow): string => {
  if (r.kind === 'page') {
    const path = (r.name.startsWith('Opened /') ? r.name.slice(7) : r.route) || '';
    for (const [re, f] of SCREENS) { const m = path.match(re); if (m) return f(m); }
  }
  return r.name;
};

/** The one line of detail an admin needs from an event's meta — never the raw object. */
function detail(r: MemberActivityRow): string {
  const m = r.meta || {};
  const parts: string[] = [];
  if (m.title) parts.push(`“${m.title}”`);
  if (typeof m.watchedSeconds === 'number' && m.watchedSeconds > 0) parts.push(`${mins(m.watchedSeconds)} watched`);
  if (typeof m.durationSeconds === 'number') parts.push(`of ${mins(m.durationSeconds)}`);
  if (m.source && !m.title) parts.push(String(m.source));
  if (m.lastField) parts.push(`last field: ${m.lastField}`);
  if (r.errorMessage) parts.push(r.errorMessage);
  return parts.join(' · ');
}

const MemberActivityCard: React.FC<{ studentId: string }> = ({ studentId }) => {
  const [filter, setFilter] = useState('story');
  const [data, setData] = useState<Activity | null>(null);
  const [rows, setRows] = useState<MemberActivityRow[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');

  const kinds = FILTERS.find(f => f.key === filter)?.kinds || '';
  const load = useCallback(async (before?: string) => {
    setBusy(true); setErr('');
    try {
      const d = await passportApi.getMemberActivity(studentId, { ...(before ? { before } : {}), ...(kinds ? { kinds } : {}) });
      if (!before) { setData(d); setRows(d.rows); } else setRows(prev => [...prev, ...d.rows]);
      setNext(d.nextBefore);
    } catch (e: any) {
      setErr(e?.response?.status === 403 ? 'Only the super admin can see a member\'s full activity.' : (e?.response?.data?.message || 'Could not load activity.'));
    } finally { setBusy(false); }
  }, [studentId, kinds]);
  useEffect(() => { load(); }, [load]);

  const s = data?.summary;
  // Back-to-back repeats (a screen polled, the same page re-opened) collapse into one line with a count.
  type Item = MemberActivityRow & { times: number; firstAt: string };
  const groups: { day: string; items: Item[] }[] = [];
  for (const r of rows) {
    const k = dayKey(r.createdAt);
    let g = groups[groups.length - 1];
    if (!g || g.day !== k) { g = { day: k, items: [] }; groups.push(g); }
    const prev = g.items[g.items.length - 1];
    if (prev && prev.kind === r.kind && label(prev) === label(r) && prev.route === r.route && prev.status === r.status && !r.meta?.title) {
      prev.times += 1; prev.firstAt = r.createdAt;
    } else g.items.push({ ...r, times: 1, firstAt: r.createdAt });
  }

  return <section className="amp-card wide amp-activity">
    <header className="amp-card-head">
      <h2><i className="bi bi-clock-history" aria-hidden="true" /> Everything they did <span className="amp-super">Super admin</span></h2>
    </header>
    {err ? <p className="amp-error"><i className="bi bi-exclamation-circle" /> {err}</p> : <>
      {s ? <div className="amp-act-sum">
        <div><span>First seen</span><b>{fmt(s.firstSeen)}</b></div>
        <div><span>Last seen</span><b>{fmt(s.lastSeen)}</b></div>
        <div><span>Sessions</span><b>{s.sessions}</b></div>
        <div><span>Screens</span><b>{s.pages}</b></div>
        <div><span>Actions</span><b>{s.actions}</b></div>
        <div><span>Problems</span><b className={s.failures ? 'bad' : ''}>{s.failures}</b></div>
      </div> : !busy && <p className="amp-muted">No activity recorded for this member yet. Activity is kept for 90 days.</p>}
      {!!data?.devices?.length && <p className="amp-act-devices"><i className="bi bi-laptop" /> {data.devices.map(d => [d.deviceType, d.browser, d.os].filter(Boolean).join(' · ')).filter(Boolean).join('   |   ')}</p>}

      <div className="amp-act-filters" role="tablist" aria-label="Filter activity">
        {FILTERS.map(f => <button key={f.key} type="button" role="tab" aria-selected={filter === f.key} className={filter === f.key ? 'on' : ''} onClick={() => setFilter(f.key)}>{f.label}</button>)}
      </div>

      {groups.map(g => <div key={g.day} className="amp-act-day">
        <h3>{g.day}</h3>
        <ol>
          {g.items.map(r => {
            const d = detail(r);
            return <li key={r._id} className={`k-${r.kind}${r.outcome === 'failure' ? ' fail' : ''}${!r.userId ? ' anon' : ''}`}>
              <span className="amp-act-t">{time(r.createdAt)}{r.times > 1 && time(r.firstAt) !== time(r.createdAt) && <small>from {time(r.firstAt)}</small>}</span>
              <span className="amp-act-ic"><i className={`bi ${ICON[r.kind] || 'bi-dot'}`} /></span>
              <span className="amp-act-txt">
                <b>{label(r)}{r.times > 1 && <span className="amp-act-x"> ×{r.times}</span>}</b>
                {(d || r.route) && <small>{d}{d && r.route ? ' · ' : ''}{r.route && <code>{r.method && r.kind !== 'page' ? `${r.method} ` : ''}{r.route}</code>}</small>}
              </span>
              {!r.userId && <span className="amp-act-anon" title="Before they signed in, on the same browser">before sign-in</span>}
              {typeof r.status === 'number' && r.kind !== 'page' && <span className={`amp-act-st ${r.status >= 400 ? 'bad' : ''}`}>{r.status}</span>}
            </li>;
          })}
        </ol>
      </div>)}

      {busy && <p className="amp-muted">Loading…</p>}
      {!busy && next && <button type="button" className="amp-act-more" onClick={() => load(next)}><i className="bi bi-arrow-down" /> Load older activity</button>}
    </>}
  </section>;
};

export default MemberActivityCard;
