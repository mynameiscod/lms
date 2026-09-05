/**
 * CareerPilot activity — what people actually did, in the order they did it.
 *
 * READ AS A LIST OF PEOPLE, NOT A LIST OF EVENTS. A raw event feed sorted by time is the
 * obvious shape and the wrong one: with thirty people on the portal it interleaves thirty
 * stories into one column and none of them can be followed. So the left is one row per visitor —
 * who, on what, for how long, and whether anything failed — and picking one shows that person's
 * trail on the right, oldest first, because that is the order it happened in.
 *
 * ANONYMOUS ROWS ARE THE POINT. Most rows have no name, because the interesting part of a funnel
 * is the people who did not finish it. A visitor who opened the landing page and left is a row
 * here; on a screen that only listed members, they would not exist.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import passportApi, { ActivitySession, ActivityEvent, ActivitySummary } from '../../api/passportApi';
import './adminActivity.css';

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => ymd(new Date(Date.now() - n * 86400_000));

/** "4m 12s" reads faster than 252000 when scanning a column of them. */
function duration(ms: number): string {
  if (!ms || ms < 1000) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

const clock = (iso: string) => {
  try { return new Date(iso).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
};
const timeOnly = (iso: string) => {
  try { return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  catch { return iso; }
};

const deviceIcon = (t?: string) =>
  t === 'mobile' ? 'bi-phone' : t === 'tablet' ? 'bi-tablet' : t === 'bot' ? 'bi-robot' : 'bi-laptop';

const kindIcon = (k: string) =>
  k === 'page' ? 'bi-window' : k === 'action' ? 'bi-cursor-fill' : k === 'error' ? 'bi-exclamation-triangle-fill' : 'bi-arrow-left-right';

const AdminActivity: React.FC = () => {
  const [from, setFrom] = useState(daysAgo(7));
  const [to, setTo] = useState(ymd(new Date()));
  const [search, setSearch] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [onlyFailures, setOnlyFailures] = useState(false);

  const [sessions, setSessions] = useState<ActivitySession[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTrail, setLoadingTrail] = useState(false);
  const [err, setErr] = useState('');

  // The end date is a day, and a person expects "to: today" to include today's afternoon.
  const range = useMemo(() => ({ from, to: `${to}T23:59:59.999Z` }), [from, to]);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const [s, sum] = await Promise.all([
        passportApi.activitySessions({ ...range, search: search || undefined,
          deviceType: deviceType || undefined, onlyFailures, limit: 60 }),
        passportApi.activitySummary({ ...range, deviceType: deviceType || undefined }),
      ]);
      setSessions(s.sessions); setTotal(s.total); setSummary(sum);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not load activity.');
    } finally { setLoading(false); }
  }, [range, search, deviceType, onlyFailures]);

  useEffect(() => { load(); }, [load]);

  const openTrail = async (visitorId: string) => {
    setPicked(visitorId); setLoadingTrail(true); setTimeline([]);
    try {
      const r = await passportApi.activityTimeline(visitorId);
      setTimeline(r.events);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not load that trail.');
    } finally { setLoadingTrail(false); }
  };

  const chosen = sessions.find(s => s.visitorId === picked) || null;

  return (
    <div className="cpa-page">
      <header className="cpa-head">
        <div>
          <span className="cpa-kicker">CAREERPILOT</span>
          <h1>Activity</h1>
          <p>Every step a person took, from opening the URL to the last thing they clicked — including
             the visits that never became an account.</p>
        </div>
        <button className="cpa-btn" onClick={load} disabled={loading}>
          <i className="bi bi-arrow-clockwise" /> {loading ? 'Loading…' : 'Refresh'}
        </button>
      </header>

      <div className="cpa-filters">
        <label>From <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} /></label>
        <label>To <input type="date" value={to} min={from} max={ymd(new Date())} onChange={e => setTo(e.target.value)} /></label>
        <label className="cpa-grow">Search
          <input type="text" placeholder="name, email, visitor id or address"
                 value={search} onChange={e => setSearch(e.target.value)} />
        </label>
        <label>Device
          <select value={deviceType} onChange={e => setDeviceType(e.target.value)}>
            <option value="">All</option>
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
            <option value="tablet">Tablet</option>
            <option value="bot">Bots</option>
          </select>
        </label>
        <label className="cpa-check">
          <input type="checkbox" checked={onlyFailures} onChange={e => setOnlyFailures(e.target.checked)} />
          Only trails with a failure
        </label>
      </div>

      {err && <div className="cpa-msg err">{err}</div>}

      {summary && (
        <div className="cpa-kpis">
          <div className="cpa-kpi"><span>Visitors</span><b>{summary.visitors}</b>
            <small>{summary.identified} signed in</small></div>
          <div className="cpa-kpi"><span>Events</span><b>{summary.events}</b>
            <small>pages, actions and API calls</small></div>
          <div className={`cpa-kpi${summary.failures ? ' bad' : ''}`}><span>Failures</span><b>{summary.failures}</b>
            <small>things that did not work</small></div>
          <div className="cpa-kpi"><span>Bots</span><b>{summary.bots}</b>
            <small>counted, never hidden</small></div>
          <div className="cpa-kpi wide"><span>Devices</span>
            <div className="cpa-chips">
              {summary.byDevice.length
                ? summary.byDevice.map(d => (
                    <i key={d.key} className="cpa-chip"><b>{d.visitors}</b> {d.key}</i>))
                : <i className="cpa-chip muted">nothing yet</i>}
            </div>
          </div>
          <div className="cpa-kpi wide"><span>Browsers</span>
            <div className="cpa-chips">
              {summary.byBrowser.length
                ? summary.byBrowser.map(b => (
                    <i key={b.key} className="cpa-chip"><b>{b.visitors}</b> {b.key}</i>))
                : <i className="cpa-chip muted">nothing yet</i>}
            </div>
          </div>
        </div>
      )}

      <div className="cpa-grid">
        <section className="cpa-list">
          <div className="cpa-list-head">
            <h2>Visitors</h2>
            <span>{total} in this range{total > sessions.length ? ` · showing ${sessions.length}` : ''}</span>
          </div>

          {loading ? <div className="cpa-empty">Loading…</div>
            : !sessions.length ? (
              <div className="cpa-empty">
                <i className="bi bi-clipboard-x" />
                <h3>Nothing recorded in this range</h3>
                <p>Activity is kept for 90 days. If this is a fresh deploy, the trail begins the next
                   time somebody opens CareerPilot.</p>
              </div>
            ) : sessions.map(s => (
              <button key={s.visitorId}
                      className={`cpa-row${picked === s.visitorId ? ' on' : ''}`}
                      onClick={() => openTrail(s.visitorId)}>
                <span className={`cpa-dev ${s.device?.deviceType || 'unknown'}`}>
                  <i className={`bi ${deviceIcon(s.device?.deviceType)}`} />
                </span>
                <span className="cpa-who">
                  <b>{s.personName || 'Anonymous visitor'}</b>
                  <small>{s.personEmail || `${s.device?.browser || 'unknown browser'} · ${s.device?.os || 'unknown OS'}`}</small>
                  <small className="cpa-last">{s.lastName || s.lastRoute || '—'}</small>
                </span>
                <span className="cpa-nums">
                  <b>{s.events}</b><small>events</small>
                  {s.failures > 0 && <em className="cpa-fail">{s.failures} failed</em>}
                </span>
                <span className="cpa-when">
                  <b>{duration(s.durationMs)}</b>
                  <small>{clock(s.lastSeen)}</small>
                </span>
              </button>
            ))}
        </section>

        <section className="cpa-trail">
          {!picked ? (
            <div className="cpa-empty">
              <i className="bi bi-signpost-split" />
              <h3>Pick a visitor</h3>
              <p>Their whole journey appears here, oldest first — which page they landed on, what they
                 tried, and where it stopped working.</p>
            </div>
          ) : (
            <>
              <div className="cpa-trail-head">
                <div>
                  <h2>{chosen?.personName || 'Anonymous visitor'}</h2>
                  <p>
                    {chosen?.personEmail && <>{chosen.personEmail} · </>}
                    {chosen?.device?.browser} {chosen?.device?.browserVersion} · {chosen?.device?.os}
                    {chosen?.device?.deviceType ? ` · ${chosen.device.deviceType}` : ''}
                    {chosen?.device?.screen ? ` · ${chosen.device.screen}` : ''}
                    {chosen?.ip ? ` · ${chosen.ip}` : ''}
                  </p>
                  {(chosen?.device?.timezone || chosen?.device?.language) && (
                    <p className="cpa-sub">
                      {chosen?.device?.timezone}{chosen?.device?.language ? ` · ${chosen.device.language}` : ''}
                    </p>
                  )}
                </div>
                <span className="cpa-vid" title="Visitor id">{picked.slice(0, 12)}…</span>
              </div>

              {loadingTrail ? <div className="cpa-empty">Loading the trail…</div>
                : !timeline.length ? <div className="cpa-empty">No events for this visitor.</div>
                : (
                  <ol className="cpa-events">
                    {timeline.map(e => (
                      <li key={e._id} className={`cpa-event ${e.outcome}`}>
                        <span className="cpa-ev-time">{timeOnly(e.createdAt)}</span>
                        <span className={`cpa-ev-dot ${e.kind}`}><i className={`bi ${kindIcon(e.kind)}`} /></span>
                        <span className="cpa-ev-body">
                          <b>{e.name}</b>
                          <small>
                            {e.method && <>{e.method} </>}
                            {e.route}
                            {typeof e.status === 'number' && <> · {e.status}</>}
                            {typeof e.durationMs === 'number' && e.durationMs > 0 && <> · {e.durationMs}ms</>}
                          </small>
                          {e.errorMessage && <em className="cpa-ev-err">{e.errorMessage}</em>}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
            </>
          )}
        </section>
      </div>

      {summary && (summary.topPages.length > 0 || summary.topFailures.length > 0) && (
        <div className="cpa-bottom">
          <section className="cpa-panel">
            <h2>Most opened screens</h2>
            {summary.topPages.length
              ? <ul className="cpa-bars">
                  {summary.topPages.map(p => (
                    <li key={p.name}>
                      <span>{p.name}</span>
                      <i style={{ width: `${Math.round((p.views / summary.topPages[0].views) * 100)}%` }} />
                      <b>{p.views}</b>
                    </li>
                  ))}
                </ul>
              : <div className="cpa-empty compact">No page views recorded yet.</div>}
          </section>
          <section className="cpa-panel">
            <h2>What failed most</h2>
            {summary.topFailures.length
              ? <ul className="cpa-fails">
                  {summary.topFailures.map((f, i) => (
                    <li key={i}>
                      <b>{f.name}</b>
                      {f.message && <small>{f.message}</small>}
                      <em>{f.count}</em>
                    </li>
                  ))}
                </ul>
              : <div className="cpa-empty compact">Nothing failed in this range.</div>}
          </section>
        </div>
      )}
    </div>
  );
};

export default AdminActivity;
