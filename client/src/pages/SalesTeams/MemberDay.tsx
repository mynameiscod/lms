import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  salesTeamApi, stErr, MemberDay as Data, HistoryRow, Rating, RATING_LABEL, fmtDay, talk, timeOf,
} from '../../api/salesTeamApi';
import { DayPicker, LivePill, Avatar, TargetBar, ReviewChip, Toast, useToast, Empty, Loading } from './shared';
import './salesTeams.css';

/**
 * One member's day. Two doors:
 *   /my-day                       the member's own page: numbers so far, end-of-day note, past reviews
 *   /my-team/member/:userId       the manager's view of the same day, with the review box
 */
export default function MemberDay() {
  const { userId } = useParams();
  const [params, setParams] = useSearchParams();
  const self = !userId;
  const day = params.get('day') || '';
  const [data, setData] = useState<Data | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState<'timeline' | 'leads' | 'followups'>('timeline');
  const [toast, setToast] = useToast();

  const load = useCallback(() => {
    const p = self ? salesTeamApi.myDay(day || undefined) : salesTeamApi.memberDay(userId!, day || undefined);
    p.then(d => { setData(d); setErr(''); }).catch(e => setErr(stErr(e, 'Could not load this report.')));
    if (self) salesTeamApi.myHistory().then(setHistory).catch(() => {});
  }, [self, userId, day]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!data?.live) return;
    const h = setInterval(() => { if (!document.hidden) load(); }, 120000);
    return () => clearInterval(h);
  }, [data?.live, load]);

  const setDay = (d: string) => { const p = new URLSearchParams(params); if (d && d !== data?.today) p.set('day', d); else p.delete('day'); setParams(p, { replace: true }); };

  if (err && !data) return <div className="stm"><div className="stm-alert">{err}</div></div>;
  if (!data) return <div className="stm"><Loading /></div>;
  if (self && !data.team) {
    return <div className="stm"><Empty icon="bi-people">You're not in a sales team yet. Once the super admin adds you to a team, your daily report shows here.</Empty></div>;
  }

  const m = data.metrics;
  const tg = data.targets || {};
  const teamQ = params.get('team') || data.team?._id || '';
  const maxCalls = Math.max(1, ...data.trend.map(x => x.metrics?.calls || 0));

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
          <section className="stm-card">
            <div className="stm-card-head"><h2><i className="bi bi-bullseye" /> Targets</h2>{!Object.keys(tg).length && <span className="stm-muted">No targets set</span>}</div>
            <div className="stm-target-grid">
              <TargetBar label="Calls" value={m.calls} target={tg.calls} />
              <TargetBar label="Connected calls" value={m.connected} target={tg.connected} />
              <TargetBar label="Follow-ups done" value={m.followUpsDone} target={tg.followUpsDone} />
              <TargetBar label="Demos" value={m.demos} target={tg.demos} />
              <TargetBar label="Enrollments" value={m.enrollments} target={tg.enrollments} />
            </div>
          </section>

          <section className="stm-groups" aria-label="The day in numbers">
            <Group icon="bi-telephone" title="Calls" rows={[['Total', m.calls], ['Connected', m.connected], ['Not connected', m.notConnected], ['Talk time', talk(m.talkSeconds)]]} />
            <Group icon="bi-chat-dots" title="Messages" rows={[['WhatsApp', m.whatsapp], ['Notes', m.notes], ['Emails', m.emails], ['Stage moves', m.stageMoves]]} />
            <Group icon="bi-person-plus" title="Leads" rows={[['New assigned', m.newAssigned], ['Not touched', m.untouched, m.untouched > 0], ['Worked', m.leadsWorked], ['First call (avg)', m.avgFirstCallMin === null ? '—' : `${m.avgFirstCallMin} min`]]} />
            <Group icon="bi-check2-square" title="Follow-ups" rows={[['Due', m.followUpsDue], ['Done', m.followUpsDone], ['Missed', m.followUpsMissed, m.followUpsMissed > 0], ['Overdue now', m.overdueNow, m.overdueNow > 0]]} />
            <Group icon="bi-trophy" title="Results" rows={[['Demos', m.demos], ['Seats reserved', m.seats], ['Enrollments', m.enrollments]]} />
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

          <section className="stm-card">
            <nav className="stm-tabs" role="tablist">
              {([['timeline', `Activity (${data.timeline.length})`], ['leads', `Leads worked (${data.leadsWorked.length})`], ['followups', `Open follow-ups (${data.openFollowUps.length})`]] as const).map(([k, l]) => (
                <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
              ))}
            </nav>
            {tab === 'timeline' && (data.timeline.length === 0 ? <Empty icon="bi-clock-history">No activity on leads this day.</Empty> : (
              <ul className="stm-timeline">
                {data.timeline.map((a, i) => (
                  <li key={i}>
                    <span className={`stm-tl-ic t-${a.type}`}><i className={`bi ${ICON[a.type] || 'bi-dot'}`} /></span>
                    <div className="stm-tl-body">
                      <div className="stm-tl-top"><Link to={`/leads/${a.leadId}`}>{a.leadName || 'Lead'}</Link>{a.callOutcome && <span className={`stm-outcome ${a.callOutcome === 'connected' ? 'ok' : ''}`}>{a.callOutcome.replace(/_/g, ' ')}{a.callDuration ? ` · ${talk(a.callDuration)}` : ''}</span>}<time>{timeOf(a.at)}</time></div>
                      <p>{a.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ))}
            {tab === 'leads' && (data.leadsWorked.length === 0 ? <Empty icon="bi-people">No leads worked this day.</Empty> : (
              <ul className="stm-list">
                {data.leadsWorked.map(l => (
                  <li key={l.leadId}><Link to={`/leads/${l.leadId}`}><b>{l.name || 'Lead'}</b><span>{l.phone}</span></Link><em>{l.actions} action{l.actions === 1 ? '' : 's'}</em></li>
                ))}
              </ul>
            ))}
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
                      <span className="stm-history-n">{h.metrics ? `${h.metrics.calls} calls · ${h.metrics.demos} demos` : 'Note only'}</span>
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

function Group({ icon, title, rows }: { icon: string; title: string; rows: [string, number | string, boolean?][] }) {
  return (
    <div className="stm-group">
      <h3><i className={`bi ${icon}`} /> {title}</h3>
      <dl>{rows.map(([k, v, bad]) => <div key={k} className={bad ? 'bad' : ''}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
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
