import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  salesTeamApi, stErr, MemberDay as Data, HistoryRow, Rating, RATING_LABEL, LeadRow, fmtDay, talk, timeOf, mins, speedTone, outcomeLabel,
} from '../../api/salesTeamApi';
import { DayPicker, LivePill, Avatar, TargetBar, ReviewChip, Toast, useToast, Empty, Loading } from './shared';
import './salesTeams.css';

/**
 * One member's day, counted around LEADS (server: services/salesDayAnalysis.ts). Two doors:
 *   /my-day                       the member's own page: their day so far, end-of-day note, past reviews
 *   /my-team/member/:userId       the manager's view of the same day, with the review box
 *
 * One row per lead (never one row per timeline entry): when it was assigned, when it was first called,
 * how many minutes that took, calls and their outcome, the stage it is in now and the next follow-up.
 * Entries the system wrote on the person's behalf are hidden unless asked for.
 */
type Filter = 'all' | 'new' | 'notCalled' | 'missing' | 'connected';

export default function MemberDay() {
  const { userId } = useParams();
  const [params, setParams] = useSearchParams();
  const self = !userId;
  const day = params.get('day') || '';
  const [data, setData] = useState<Data | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState<'leads' | 'followups'>('leads');
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [showSystem, setShowSystem] = useState(false);
  const [open, setOpen] = useState<string>('');
  const [tick, setTick] = useState(Date.now());
  const [toast, setToast] = useToast();

  const load = useCallback(() => {
    const p = self ? salesTeamApi.myDay(day || undefined) : salesTeamApi.memberDay(userId!, day || undefined);
    p.then(d => { setData(d); setErr(''); setTick(Date.now()); }).catch(e => setErr(stErr(e, 'Could not load this report.')));
    if (self) salesTeamApi.myHistory().then(setHistory).catch(() => {});
  }, [self, userId, day]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!data?.live) return;
    const h = setInterval(() => { if (!document.hidden) load(); }, 120000);
    const t = setInterval(() => setTick(Date.now()), 30000); // "not called yet" keeps counting
    return () => { clearInterval(h); clearInterval(t); };
  }, [data?.live, load]);

  const setDay = (d: string) => { const p = new URLSearchParams(params); if (d && d !== data?.today) p.set('day', d); else p.delete('day'); setParams(p, { replace: true }); };
  const drift = data?.live ? Math.max(0, Math.floor((tick - Date.parse(data.now)) / 60000)) : 0;
  const waiting = (r: LeadRow) => (r.waitingMin === null ? null : r.waitingMin + drift);

  const rows = useMemo(() => {
    if (!data) return [];
    const re = q.trim().toLowerCase();
    return data.leads.filter(r => {
      if (re && !`${r.name} ${r.phone}`.toLowerCase().includes(re)) return false;
      if (filter === 'new') return r.isNew;
      if (filter === 'notCalled') return r.isNew && r.firstCallAt === null;
      if (filter === 'missing') return r.outcomeMissing > 0;
      if (filter === 'connected') return r.connectedCalls > 0;
      return true;
    });
  }, [data, filter, q]);
  const stages = useMemo(() => {
    const m = new Map<string, { name: string; color: string; n: number }>();
    for (const r of data?.leads || []) {
      const k = r.stage?.name || 'No stage';
      const cur = m.get(k) || { name: k, color: r.stage?.color || '#94a3b8', n: 0 };
      cur.n++;
      m.set(k, cur);
    }
    return [...m.values()].sort((a, b) => b.n - a.n);
  }, [data]);

  if (err && !data) return <div className="stm"><div className="stm-alert">{err}</div></div>;
  if (!data) return <div className="stm"><Loading /></div>;
  if (self && !data.team) {
    return <div className="stm"><Empty icon="bi-people">You're not in a sales team yet. Once the super admin adds you to a team, your daily report shows here.</Empty></div>;
  }

  const m = data.metrics;
  const tg = data.targets || {};
  const teamQ = params.get('team') || data.team?._id || '';
  const maxCalls = Math.max(1, ...data.trend.map(x => x.metrics?.calls || 0));
  const called = m.calledWithin5 + m.calledWithin30 + m.calledLate;
  const pct = (n: number) => (m.newAssigned ? `${(n / m.newAssigned) * 100}%` : '0%');
  const count = (f: Filter) => data.leads.filter(r => (f === 'new' ? r.isNew : f === 'notCalled' ? r.isNew && !r.firstCallAt : f === 'missing' ? r.outcomeMissing > 0 : f === 'connected' ? r.connectedCalls > 0 : true)).length;

  return (
    <div className="stm">
      {!self && <Link to={`/my-team${teamQ ? `?team=${teamQ}` : ''}${data.day !== data.today ? `${teamQ ? '&' : '?'}day=${data.day}` : ''}`} className="stm-back"><i className="bi bi-arrow-left" /> Back to team</Link>}
      <header className="stm-head">
        <div className="stm-head-main with-avatar">
          <Avatar name={data.user?.name || ''} color={data.team?.color} size={54} />
          <div>
            <span className="stm-eyebrow">{self ? 'Leads · My Day' : `Leads · ${data.team?.name || 'Report'}`}</span>
            <h1>{self ? `Your day${data.day === data.today ? ' so far' : ''}` : data.user?.name}</h1>
            <p>{data.team ? `${data.team.name}${data.team.manager ? ` · Manager ${data.team.manager.name}` : ''}` : ''} · {fmtDay(data.day, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
        </div>
        <div className="stm-head-side">
          <DayPicker day={data.day} today={data.today} onChange={setDay} />
          <LivePill live={data.live} />
        </div>
      </header>

      <div className="stm-day-grid">
        <div className="stm-day-main">
          {/* Speed to call: the first thing a manager checks */}
          <section className="stm-card stm-speed">
            <div className="stm-card-head">
              <h2><i className="bi bi-stopwatch" /> New leads and speed to call</h2>
              <span className="stm-muted">{m.newAssigned ? `${called} of ${m.newAssigned} called${m.avgFirstCallMin !== null ? ` · ${mins(m.avgFirstCallMin)} on average` : ''}` : 'No new leads assigned this day'}</span>
            </div>
            <div className="stm-speed-grid">
              <SpeedTile tone="all" label="New leads" value={m.newAssigned} onClick={() => { setTab('leads'); setFilter('new'); }} />
              <SpeedTile tone="fast" label="Called in 5 min" value={m.calledWithin5} onClick={() => { setTab('leads'); setFilter('new'); }} />
              <SpeedTile tone="ok" label="5 to 30 min" value={m.calledWithin30} onClick={() => { setTab('leads'); setFilter('new'); }} />
              <SpeedTile tone="slow" label="Over 30 min" value={m.calledLate} onClick={() => { setTab('leads'); setFilter('new'); }} />
              <SpeedTile tone="none" label="Not called yet" value={m.notCalled} onClick={() => { setTab('leads'); setFilter('notCalled'); }} />
            </div>
            {m.newAssigned > 0 && (
              <div className="stm-speed-bar" role="img" aria-label={`${m.calledWithin5} within 5 minutes, ${m.calledWithin30} within 30, ${m.calledLate} later, ${m.notCalled} not called`}>
                <i className="fast" style={{ width: pct(m.calledWithin5) }} /><i className="ok" style={{ width: pct(m.calledWithin30) }} /><i className="slow" style={{ width: pct(m.calledLate) }} /><i className="none" style={{ width: pct(m.notCalled) }} />
              </div>
            )}
          </section>

          <section className="stm-groups" aria-label="The day in numbers">
            <Group icon="bi-telephone" title="Calls" rows={[
              ['Calls', m.calls], ['Leads called', m.leadsCalled], ['Connected', m.connected], ['Not connected', m.notConnected],
              ['Outcome not recorded', m.outcomeMissing, m.outcomeMissing > 0], ['Talk time', talk(m.talkSeconds)],
            ]} foot={Object.keys(m.outcomes || {}).length ? (
              <div className="stm-outcomes">{Object.entries(m.outcomes).sort((a, b) => b[1] - a[1]).map(([o, n]) => <span key={o} className={o === 'connected' ? 'ok' : ''}>{outcomeLabel(o)} {n}</span>)}</div>
            ) : null} />
            <Group icon="bi-check2-square" title="Follow-ups" rows={[
              ['Due today', m.followUpsDue], ['Done today', m.followUpsDone], ['Missed today', m.followUpsMissed, m.followUpsMissed > 0], ['From earlier days, still open', m.carriedOver, m.carriedOver > 0],
            ]} />
            <Group icon="bi-trophy" title="Progress" rows={[
              ['Leads worked', m.leadsWorked], ['Leads moved stage', m.leadsMovedForward], ['WhatsApp (leads)', m.leadsMessaged], ['Notes written', m.notes],
              ['Demos', m.demos], ['Seats reserved', m.seats], ['Enrollments', m.enrollments],
            ]} />
            <div className="stm-group">
              <h3><i className="bi bi-diagram-3" /> Status now</h3>
              {stages.length === 0 ? <p className="stm-muted">No leads this day.</p> : (
                <ul className="stm-stages">{stages.map(s => <li key={s.name}><i style={{ background: s.color }} />{s.name}<b>{s.n}</b></li>)}</ul>
              )}
            </div>
          </section>

          {Object.keys(tg).length > 0 && (
            <section className="stm-card">
              <div className="stm-card-head"><h2><i className="bi bi-bullseye" /> Targets</h2></div>
              <div className="stm-target-grid">
                <TargetBar label="Called in 5 min" value={m.calledWithin5} target={tg.fastCalls} />
                <TargetBar label="Calls" value={m.calls} target={tg.calls} />
                <TargetBar label="Connected" value={m.connected} target={tg.connected} />
                <TargetBar label="Follow-ups done" value={m.followUpsDone} target={tg.followUpsDone} />
                <TargetBar label="Demos" value={m.demos} target={tg.demos} />
                <TargetBar label="Enrollments" value={m.enrollments} target={tg.enrollments} />
              </div>
            </section>
          )}

          <section className="stm-card">
            <nav className="stm-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={tab === 'leads'} className={tab === 'leads' ? 'on' : ''} onClick={() => setTab('leads')}>Leads this day ({data.leads.length})</button>
              <button type="button" role="tab" aria-selected={tab === 'followups'} className={tab === 'followups' ? 'on' : ''} onClick={() => setTab('followups')}>Overdue follow-ups ({data.openFollowUps.length})</button>
            </nav>
            {tab === 'leads' && (
              <>
                <div className="stm-lead-tools">
                  <div className="stm-seg" role="tablist" aria-label="Show">
                    {([['all', 'All'], ['new', 'New'], ['notCalled', 'Not called'], ['missing', 'No outcome'], ['connected', 'Connected']] as const).map(([k, l]) => (
                      <button key={k} type="button" className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l} <em>{count(k)}</em></button>
                    ))}
                  </div>
                  <label className="stm-search sm"><i className="bi bi-search" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Name or phone" aria-label="Search leads" /></label>
                  <label className="stm-check"><input type="checkbox" checked={showSystem} onChange={e => setShowSystem(e.target.checked)} /> Show system entries</label>
                </div>
                {rows.length === 0 ? <Empty icon="bi-people">{data.leads.length ? 'No leads match.' : 'No leads handled this day.'}</Empty> : (
                  <div className="stm-leads-wrap">
                    <table className="stm-leads">
                      <thead><tr><th>Lead</th><th>Assigned → first call</th><th>Time to call</th><th>Calls</th><th>Last outcome</th><th>Status now</th><th>Next follow-up</th><th aria-label="Details" /></tr></thead>
                      <tbody>
                        {rows.map(r => {
                          const w = waiting(r);
                          const entries = r.entries.filter(e => showSystem || !e.system);
                          const isOpen = open === r.leadId;
                          return (
                            <React.Fragment key={r.leadId}>
                              <tr className={isOpen ? 'open' : ''}>
                                <td className="c-lead">
                                  <Link to={`/leads/${r.leadId}`}><b>{r.name}</b></Link>
                                  <small>{[r.phone, r.source].filter(Boolean).join(' · ')}{r.isNew && <em className="stm-new">New</em>}</small>
                                </td>
                                <td data-label="Assigned → called" className="c-times">{r.assignedAt
                                  ? <span className="stm-times">{timeOf(r.assignedAt)} <i className="bi bi-arrow-right" /> {r.firstCallAt ? timeOf(r.firstCallAt) : <span className="stm-muted">not yet</span>}</span>
                                  : <span className="stm-muted">Assigned earlier</span>}</td>
                                <td data-label="Time to call" className="c-speed">
                                  {r.minutesToCall !== null ? <span className={`stm-speed-pill ${speedTone(r.minutesToCall)}`}>{mins(r.minutesToCall)}</span>
                                    : w !== null ? <span className="stm-speed-pill none">Not called · {mins(w)}</span>
                                    : <span className="stm-muted">—</span>}
                                </td>
                                <td data-label="Calls" title={r.connectedCalls ? `${r.connectedCalls} connected` : undefined}>{r.calls}</td>
                                <td data-label="Last outcome">{r.lastOutcome ? <span className={`stm-outcome ${r.lastOutcome === 'connected' ? 'ok' : r.lastOutcome === 'missing' ? 'warn' : ''}`}>{r.lastOutcome === 'missing' ? 'No outcome' : outcomeLabel(r.lastOutcome)}</span> : <span className="stm-muted">No call</span>}</td>
                                <td data-label="Status now">{r.stage ? <span className="stm-stage"><i style={{ background: r.stage.color }} />{r.stage.name}</span> : <span className="stm-muted">—</span>}</td>
                                <td data-label="Next follow-up">{r.nextFollowUp ? <span className={new Date(r.nextFollowUp).getTime() < Date.now() ? 'stm-bad' : ''}>{new Date(r.nextFollowUp).toLocaleString('en-IN', { day: 'numeric', month: 'short' })}, {timeOf(r.nextFollowUp)}</span> : <span className="stm-muted">None</span>}</td>
                                <td className="c-more"><button type="button" className="stm-icon-btn sm" aria-expanded={isOpen} aria-label={`${isOpen ? 'Hide' : 'Show'} what happened with ${r.name}`} onClick={() => setOpen(isOpen ? '' : r.leadId)}><i className={`bi ${isOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} /></button></td>
                              </tr>
                              {isOpen && (
                                <tr className="stm-lead-detail"><td colSpan={8}>
                                  {entries.length === 0 ? <p className="stm-muted">Nothing written by them on this lead this day{r.entries.length ? ' (only system entries — tick "Show system entries")' : ''}.</p> : (
                                    <ul className="stm-entries">
                                      {entries.map((e, i) => (
                                        <li key={i} className={e.system ? 'sys' : ''}>
                                          <span className={`stm-tl-ic t-${e.type}`}><i className={`bi ${ICON[e.type] || 'bi-dot'}`} /></span>
                                          <div>
                                            <div className="stm-tl-top">
                                              <time>{timeOf(e.at)}</time>
                                              {e.callOutcome && <span className={`stm-outcome ${e.callOutcome === 'connected' ? 'ok' : ''}`}>{outcomeLabel(e.callOutcome)}{e.callDuration ? ` · ${talk(e.callDuration)}` : ''}</span>}
                                              {e.system && <span className="stm-sys-tag">System</span>}
                                            </div>
                                            <p>{e.description}</p>
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </td></tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
            {tab === 'followups' && (data.openFollowUps.length === 0 ? <Empty icon="bi-check2-circle">Nothing overdue. Well done.</Empty> : (
              <ul className="stm-list">
                {data.openFollowUps.map(f => (
                  <li key={f._id}>
                    {f.lead ? <Link to={`/leads/${f.lead._id}`}><b>{f.lead.name}</b><span>{f.title}</span></Link> : <div><b>{f.title}</b></div>}
                    <em className="bad">Due {new Date(f.scheduledAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</em>
                  </li>
                ))}
              </ul>
            ))}
          </section>

          <section className="stm-card">
            <div className="stm-card-head"><h2><i className="bi bi-bar-chart" /> Last 7 days</h2><span className="stm-legend"><i className="c-all" /> Calls <i className="c-con" /> Connected</span></div>
            <div className="stm-trend" role="img" aria-label="Calls per day for the last 7 days">
              {data.trend.map(x => {
                const c = x.metrics?.calls || 0;
                const k = x.metrics?.connected || 0;
                return (
                  <button type="button" key={x.day} className={`stm-trend-col${x.day === data.day ? ' on' : ''}`} onClick={() => setDay(x.day)} title={`${fmtDay(x.day)}: ${c} calls, ${k} connected`}>
                    <span className="stm-trend-n">{x.metrics ? c : '–'}</span>
                    <span className="stm-trend-bar"><i style={{ height: `${(c / maxCalls) * 100}%` }} /><b style={{ height: `${(k / maxCalls) * 100}%` }} /></span>
                    <span className="stm-trend-d">{fmtDay(x.day, { weekday: 'short' })}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="stm-day-side">
          <NoteCard data={data} onSaved={() => { setToast('Note saved'); load(); }} />
          <ReviewCard data={data} userId={userId} onSaved={() => { setToast('Marked as reviewed'); load(); }} />
          {self && history.length > 0 && (
            <section className="stm-card">
              <div className="stm-card-head"><h2><i className="bi bi-calendar-week" /> My recent days</h2></div>
              <ul className="stm-history">
                {history.slice(0, 10).map(h => (
                  <li key={h.day}>
                    <button type="button" onClick={() => setDay(h.day)} className={h.day === data.day ? 'on' : ''}>
                      <span className="stm-history-d">{fmtDay(h.day)}</span>
                      <span className="stm-history-n">{h.metrics ? `${h.metrics.leadsCalled} leads called · ${h.metrics.calledWithin5} in 5 min` : 'Open the day to see it'}</span>
                      <ReviewChip review={h.review} open={h.day < data.today} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
      <Toast text={toast} />
    </div>
  );
}

const ICON: Record<string, string> = { call: 'bi-telephone', whatsapp: 'bi-whatsapp', note: 'bi-journal-text', email: 'bi-envelope', status_change: 'bi-signpost-split', meeting: 'bi-camera-video', assignment: 'bi-person-check', created: 'bi-plus-circle', content_shared: 'bi-share' };

function SpeedTile({ tone, label, value, onClick }: { tone: string; label: string; value: number; onClick: () => void }) {
  return (
    <button type="button" className={`stm-speed-tile ${tone}`} onClick={onClick}>
      <b>{value}</b><span>{label}</span>
    </button>
  );
}

function Group({ icon, title, rows, foot }: { icon: string; title: string; rows: [string, number | string, boolean?][]; foot?: React.ReactNode }) {
  return (
    <div className="stm-group">
      <h3><i className={`bi ${icon}`} /> {title}</h3>
      <dl>{rows.map(([k, v, bad]) => <div key={k} className={bad ? 'bad' : ''}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      {foot}
    </div>
  );
}

function NoteCard({ data, onSaved }: { data: Data; onSaved: () => void }) {
  const [f, setF] = useState({ done: data.note?.done || '', blockers: data.note?.blockers || '', tomorrow: data.note?.tomorrow || '' });
  const [editing, setEditing] = useState(!data.note && data.noteEditable);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { setF({ done: data.note?.done || '', blockers: data.note?.blockers || '', tomorrow: data.note?.tomorrow || '' }); setEditing(!data.note && data.noteEditable); }, [data.day, data.note, data.noteEditable]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try { await salesTeamApi.myNote({ day: data.day, ...f }); setEditing(false); onSaved(); } catch (x) { setErr(stErr(x)); } finally { setBusy(false); }
  };

  return (
    <section className="stm-card">
      <div className="stm-card-head">
        <h2><i className="bi bi-journal-text" /> End-of-day note</h2>
        {data.note && data.noteEditable && !editing && <button type="button" className="stm-btn sm ghost" onClick={() => setEditing(true)}><i className="bi bi-pencil" /> Edit</button>}
      </div>
      {editing ? (
        <form className="stm-form" onSubmit={save}>
          <label>What I did today<textarea value={f.done} onChange={e => setF({ ...f, done: e.target.value })} rows={3} maxLength={2000} placeholder="Calls, demos booked, admissions closed…" /></label>
          <label><span>Blockers <em>(optional)</em></span><textarea value={f.blockers} onChange={e => setF({ ...f, blockers: e.target.value })} rows={2} maxLength={2000} placeholder="Anything stopping you" /></label>
          <label><span>Plan for tomorrow <em>(optional)</em></span><textarea value={f.tomorrow} onChange={e => setF({ ...f, tomorrow: e.target.value })} rows={2} maxLength={2000} /></label>
          {err && <div className="stm-alert">{err}</div>}
          <div className="stm-form-actions">
            {data.note && <button type="button" className="stm-btn ghost" onClick={() => setEditing(false)}>Cancel</button>}
            <button type="submit" className="stm-btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save note'}</button>
          </div>
        </form>
      ) : data.note ? (
        <div className="stm-note-view">
          {data.note.done && <div><h4>Done</h4><p>{data.note.done}</p></div>}
          {data.note.blockers && <div><h4>Blockers</h4><p>{data.note.blockers}</p></div>}
          {data.note.tomorrow && <div><h4>Tomorrow</h4><p>{data.note.tomorrow}</p></div>}
        </div>
      ) : (
        <p className="stm-muted">{data.isSelf ? 'The note can be written for today or yesterday.' : 'No note for this day.'} It's optional; the numbers above are counted automatically.</p>
      )}
    </section>
  );
}

function ReviewCard({ data, userId, onSaved }: { data: Data; userId?: string; onSaved: () => void }) {
  const [rating, setRating] = useState<Rating | ''>('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { setRating(''); setComment(''); setErr(''); }, [data.day]);
  const r = data.review;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || !userId) return;
    setBusy(true); setErr('');
    try { await salesTeamApi.review(userId, { day: data.day, rating, comment }); onSaved(); } catch (x) { setErr(stErr(x)); } finally { setBusy(false); }
  };

  return (
    <section className={`stm-card stm-review ${r.status === 'reviewed' ? `done r-${r.rating}` : ''}`}>
      <div className="stm-card-head"><h2><i className="bi bi-clipboard-check" /> Manager review</h2><ReviewChip review={r} open={data.reviewOpen} /></div>
      {r.status === 'reviewed' ? (
        <div className="stm-review-done">
          <b>{RATING_LABEL[(r.rating || 'ok') as Rating]}</b>
          {r.comment && <blockquote>{r.comment}</blockquote>}
          <span className="stm-muted">{r.byName}{r.at ? ` · ${new Date(r.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}` : ''}</span>
        </div>
      ) : data.canReview ? (
        data.reviewOpen ? (
          <form className="stm-form" onSubmit={save}>
            <div className="stm-rating" role="radiogroup" aria-label="Rating">
              {(['good', 'ok', 'needs_work'] as Rating[]).map(k => (
                <button key={k} type="button" role="radio" aria-checked={rating === k} className={`r-${k}${rating === k ? ' on' : ''}`} onClick={() => setRating(k)}>
                  <i className={`bi ${k === 'good' ? 'bi-emoji-smile' : k === 'ok' ? 'bi-emoji-neutral' : 'bi-emoji-frown'}`} /> {RATING_LABEL[k]}
                </button>
              ))}
            </div>
            <label><span>Comment for {data.user?.name?.split(' ')[0] || 'them'} <em>(optional)</em></span><textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} maxLength={1000} placeholder="What went well, what to do first tomorrow" /></label>
            {err && <div className="stm-alert">{err}</div>}
            <button type="submit" className="stm-btn primary wide" disabled={!rating || busy}>{busy ? 'Saving…' : 'Mark reviewed'}</button>
          </form>
        ) : <p className="stm-muted">Today's report can be reviewed from 9 PM, once the day is saved.</p>
      ) : (
        <p className="stm-muted">{data.isSelf ? 'Your manager reviews each day and their comment shows here.' : 'Waiting for the manager.'}</p>
      )}
    </section>
  );
}
