import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  demoAdminApi, demoErr, DemoSlot, Attendee, DemoSettings, Host, DemoReport, ReportRow,
  istDayKey, fmtTime, fmtDayLong, fmtWhen,
} from '../../api/demoBookingApi';
import { Dialog, Toast, useToast, Empty, Loading } from '../SalesTeams/shared';
import '../SalesTeams/salesTeams.css';
import './demoBooking.css';

/**
 * LEADS · BOOK A DEMO — the admin page.
 *   Slots     demo sessions people can book from the website: one, or repeating on chosen weekdays.
 *             Each runs in our own live room or on an outside Meet / Zoom link. Attendees per slot.
 *   Report    bookings, show-up and enrolments by course, source and time of day.
 *   Settings  defaults, the Demo-stage move, the booking page text, and the links for the website.
 */
type Tab = 'slots' | 'report' | 'settings';

export default function DemoSlots() {
  const [tab, setTab] = useState<Tab>('slots');
  const [toast, setToast] = useToast();
  return (
    <div className="stm dmo">
      <header className="stm-head">
        <div className="stm-head-main">
          <span className="stm-eyebrow">Leads · Book a demo</span>
          <h1>Demo Slots</h1>
          <p>Visitors pick a slot on your website, verify their phone and book a seat. Each booking becomes a lead with a demo on it, and they get a personal link to join.</p>
        </div>
      </header>
      <nav className="stm-tabs big" role="tablist">
        {([['slots', 'bi-calendar-week', 'Slots', ''], ['report', 'bi-bar-chart', 'Report', ''], ['settings', 'bi-gear', 'Settings', ' & website']] as const).map(([k, ic, l, more]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}><i className={`bi ${ic}`} /> <span>{l}{more && <span className="dmo-wide">{more}</span>}</span></button>
        ))}
      </nav>
      {tab === 'slots' && <SlotsTab onToast={setToast} />}
      {tab === 'report' && <ReportTab />}
      {tab === 'settings' && <SettingsTab onToast={setToast} />}
      <Toast text={toast} />
    </div>
  );
}

/* ───────────────────────────── Slots ───────────────────────────── */

function SlotsTab({ onToast }: { onToast: (s: string) => void }) {
  const [scope, setScope] = useState<'upcoming' | 'past'>('upcoming');
  const [slots, setSlots] = useState<DemoSlot[] | null>(null);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState<DemoSlot | 'new' | null>(null);
  const [viewing, setViewing] = useState<DemoSlot | null>(null);
  const [cancelling, setCancelling] = useState<DemoSlot | null>(null);

  const load = useCallback(() => {
    demoAdminApi.slots(scope).then((s) => { setSlots(s); setErr(''); }).catch((e) => setErr(demoErr(e, 'Could not load the slots.')));
  }, [scope]);
  useEffect(() => { setSlots(null); load(); }, [load]);

  const days = useMemo(() => {
    const m = new Map<string, DemoSlot[]>();
    for (const s of slots || []) { const k = istDayKey(s.startsAt); m.set(k, [...(m.get(k) || []), s]); }
    return [...m];
  }, [slots]);

  const upcoming = (slots || []).filter((s) => s.status === 'open' && new Date(s.startsAt) > new Date());
  const totals = upcoming.reduce((a, s) => ({ seats: a.seats + s.seats, booked: a.booked + s.booked }), { seats: 0, booked: 0 });

  const remove = async (s: DemoSlot) => {
    if (!window.confirm(`Delete the slot on ${fmtWhen(s.startsAt)}? Nobody has booked it.`)) return;
    try { await demoAdminApi.remove(s._id); onToast('Slot deleted'); load(); } catch (e) { onToast(demoErr(e)); }
  };

  return (
    <>
      <div className="stm-toolbar dmo-toolbar">
        <div className="dmo-seg" role="tablist" aria-label="Which slots">
          {(['upcoming', 'past'] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={scope === k} className={scope === k ? 'on' : ''} onClick={() => setScope(k)}>{k === 'upcoming' ? 'Upcoming' : 'Past'}</button>
          ))}
        </div>
        <button type="button" className="stm-btn primary" onClick={() => setEditing('new')}><i className="bi bi-plus-lg" /> New slot</button>
      </div>

      {scope === 'upcoming' && slots && slots.length > 0 && (
        <section className="stm-tiles compact" aria-label="Upcoming">
          <div className="stm-tile"><span className="stm-tile-ic"><i className="bi bi-calendar-event" /></span><div><span className="stm-tile-label">Open slots</span><b>{upcoming.length}</b><small>coming up</small></div></div>
          <div className="stm-tile good"><span className="stm-tile-ic"><i className="bi bi-person-check" /></span><div><span className="stm-tile-label">Seats booked</span><b>{totals.booked}</b><small>of {totals.seats} seats</small></div></div>
          <div className="stm-tile"><span className="stm-tile-ic"><i className="bi bi-broadcast" /></span><div><span className="stm-tile-label">In our live room</span><b>{upcoming.filter((s) => s.joinMethod === 'room').length}</b><small>{upcoming.filter((s) => s.joinMethod === 'link').length} on Meet / Zoom</small></div></div>
          <div className={`stm-tile ${upcoming.some((s) => s.booked >= s.seats) ? 'warn' : ''}`}><span className="stm-tile-ic"><i className="bi bi-exclamation-circle" /></span><div><span className="stm-tile-label">Full</span><b>{upcoming.filter((s) => s.booked >= s.seats).length}</b><small>add more slots if many are full</small></div></div>
        </section>
      )}

      {err && <div className="stm-alert">{err}</div>}
      {!slots && !err ? <Loading /> : slots && slots.length === 0 ? (
        <Empty icon="bi-calendar-plus">{scope === 'upcoming' ? <>No upcoming demo slots. <button type="button" className="stm-linkbtn" onClick={() => setEditing('new')}>Create the first one</button>, for example every weekday at 7 pm.</> : 'No past demos yet.'}</Empty>
      ) : (
        <div className="dmo-days">
          {days.map(([day, list]) => (
            <section key={day} className="dmo-day">
              <h2 className="dmo-day-h">{fmtDayLong(list[0].startsAt)}</h2>
              <div className="dmo-slot-list">
                {list.map((s) => <SlotRow key={s._id} s={s} onView={() => setViewing(s)} onEdit={() => setEditing(s)} onCancel={() => setCancelling(s)} onDelete={() => remove(s)} />)}
              </div>
            </section>
          ))}
        </div>
      )}

      {editing && <SlotDialog slot={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={(msg) => { setEditing(null); onToast(msg); load(); }} />}
      {viewing && <AttendeesDialog slot={viewing} onClose={() => { setViewing(null); load(); }} onToast={onToast} />}
      {cancelling && <CancelDialog slot={cancelling} onClose={() => setCancelling(null)} onDone={() => { setCancelling(null); onToast('Slot cancelled. Everyone booked has been told.'); load(); }} />}
    </>
  );
}

function SlotRow({ s, onView, onEdit, onCancel, onDelete }: { s: DemoSlot; onView: () => void; onEdit: () => void; onCancel: () => void; onDelete: () => void }) {
  const started = new Date(s.startsAt) <= new Date();
  const full = s.booked >= s.seats;
  const pct = Math.min(100, Math.round((s.booked / Math.max(1, s.seats)) * 100));
  const status = s.status === 'cancelled' ? <span className="stm-chip r-needs_work">Cancelled</span>
    : s.status === 'done' || started ? <span className="stm-chip muted">{s.status === 'done' ? 'Finished' : 'Started'}</span>
      : full ? <span className="stm-chip pending">Full</span> : <span className="stm-chip r-good">Open</span>;
  const live = s.status === 'open' && !started;
  return (
    <article className={`dmo-slot${s.status === 'cancelled' ? ' off' : ''}`}>
      <div className="dmo-slot-time">
        <b>{fmtTime(s.startsAt)}</b>
        <span>{s.durationMin} min</span>
      </div>
      <div className="dmo-slot-main">
        <div className="dmo-slot-title">
          <h3>{s.title}</h3>
          {status}
        </div>
        <div className="dmo-slot-meta">
          <span><i className="bi bi-mortarboard" /> {s.course}</span>
          <span><i className="bi bi-person-video3" /> {s.hostName || 'Host'}</span>
          <span>{s.joinMethod === 'room' ? <><i className="bi bi-broadcast" /> Our live room</> : <><i className="bi bi-link-45deg" /> Meet / Zoom link</>}</span>
        </div>
      </div>
      <div className="dmo-slot-seats" title={`${s.booked} of ${s.seats} seats booked`}>
        <div className="dmo-seat-top"><b>{s.booked}</b><span>/ {s.seats} booked</span></div>
        <div className="dmo-bar" aria-hidden="true"><span className={full ? 'full' : ''} style={{ width: `${pct}%` }} /></div>
        {(s.counts.attended > 0 || s.counts.no_show > 0) && <small>{s.counts.attended} attended · {s.counts.no_show} no-show</small>}
      </div>
      <div className="dmo-slot-actions">
        <button type="button" className="stm-btn sm" onClick={onView}><i className="bi bi-people" /> Attendees</button>
        {s.joinMethod === 'room' && s.liveClassId && s.status === 'open' && (
          <Link className="stm-btn sm ghost" to={`/hms-classes/${s.liveClassId}/room`} title="Open the live room as the host"><i className="bi bi-camera-video" /> Room</Link>
        )}
        {live && <button type="button" className="stm-icon-btn dmo-icon" aria-label="Edit slot" title="Edit" onClick={onEdit}><i className="bi bi-pencil" /></button>}
        {live && (s.booked > 0
          ? <button type="button" className="stm-icon-btn dmo-icon" aria-label="Cancel slot" title="Cancel slot" onClick={onCancel}><i className="bi bi-x-circle" /></button>
          : <button type="button" className="stm-icon-btn dmo-icon" aria-label="Delete slot" title="Delete" onClick={onDelete}><i className="bi bi-trash" /></button>)}
      </div>
    </article>
  );
}

/* ───────────────────────────── Create / edit ───────────────────────────── */

const WEEKDAYS = [['1', 'Mon'], ['2', 'Tue'], ['3', 'Wed'], ['4', 'Thu'], ['5', 'Fri'], ['6', 'Sat'], ['0', 'Sun']] as const;
const istTime = (d: string) => new Date(new Date(d).getTime() + 330 * 60_000).toISOString().slice(11, 16);

function SlotDialog({ slot, onClose, onSaved }: { slot: DemoSlot | null; onClose: () => void; onSaved: (msg: string) => void }) {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [cfg, setCfg] = useState<DemoSettings | null>(null);
  const [courses, setCourses] = useState<string[]>([]);
  const today = istDayKey(new Date());
  const [f, setF] = useState<any>(() => slot ? {
    course: slot.course, title: slot.title, description: slot.description || '', date: istDayKey(slot.startsAt), time: istTime(slot.startsAt),
    durationMin: slot.durationMin, seats: slot.seats, cutoffMin: slot.cutoffMin, hostId: slot.hostId, joinMethod: slot.joinMethod, meetingLink: slot.meetingLink || '',
  } : { course: '', title: '', description: '', date: today, time: '19:00', durationMin: '', seats: '', cutoffMin: '', hostId: '', joinMethod: 'room', meetingLink: '', repeat: false, weekdays: ['1', '2', '3', '4', '5'], until: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  useEffect(() => {
    demoAdminApi.hosts().then(setHosts).catch(() => undefined);
    demoAdminApi.settings().then(setCfg).catch(() => undefined);
    if (!slot) demoAdminApi.slots('all').then((s) => setCourses([...new Set(s.map((x) => x.course))])).catch(() => undefined);
  }, [slot]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      if (slot) {
        const body: any = { title: f.title, description: f.description, seats: Number(f.seats), cutoffMin: Number(f.cutoffMin), durationMin: Number(f.durationMin), hostId: f.hostId };
        if (f.date !== istDayKey(slot.startsAt) || f.time !== istTime(slot.startsAt)) { body.date = f.date; body.time = f.time; }
        if (slot.joinMethod === 'link') body.meetingLink = f.meetingLink;
        await demoAdminApi.update(slot._id, body);
        onSaved(body.date ? 'Slot moved. Everyone booked has been told the new time.' : 'Slot saved');
      } else {
        const r = await demoAdminApi.create({
          course: f.course, title: f.title, description: f.description, date: f.date, time: f.time, hostId: f.hostId, joinMethod: f.joinMethod,
          meetingLink: f.joinMethod === 'link' ? f.meetingLink : undefined,
          ...(f.durationMin ? { durationMin: Number(f.durationMin) } : {}), ...(f.seats ? { seats: Number(f.seats) } : {}), ...(f.cutoffMin !== '' ? { cutoffMin: Number(f.cutoffMin) } : {}),
          repeat: f.repeat ? { weekdays: f.weekdays.map(Number), until: f.until } : null,
        });
        onSaved(r.created === 1 ? 'Slot created' : `${r.created} slots created`);
      }
    } catch (e2) { setErr(demoErr(e2)); } finally { setBusy(false); }
  };

  return (
    <Dialog title={slot ? 'Edit demo slot' : 'New demo slot'} onClose={onClose} wide>
      <form className="stm-form dmo-form" onSubmit={save}>
        {err && <div className="stm-alert" role="alert">{err}</div>}
        <div className="dmo-grid2">
          <label>Course
            <input list="dmo-courses" value={f.course} onChange={(e) => set('course', e.target.value)} disabled={!!slot} required maxLength={120} placeholder="e.g. Java Full Stack" />
            <datalist id="dmo-courses">{courses.map((c) => <option key={c} value={c} />)}</datalist>
          </label>
          <label><span className="dmo-lbl">Title <em>(optional)</em></span>
            <input value={f.title} onChange={(e) => set('title', e.target.value)} maxLength={160} placeholder={f.course ? `Free demo: ${f.course}` : 'Free demo: <course>'} />
          </label>
        </div>
        <div className="dmo-grid3">
          <label>{slot ? 'Date' : 'First date'}<input type="date" value={f.date} min={today} onChange={(e) => set('date', e.target.value)} required /></label>
          <label><span className="dmo-lbl">Start time <em>(IST)</em></span><input type="time" value={f.time} onChange={(e) => set('time', e.target.value)} required /></label>
          <label><span className="dmo-lbl">Duration <em>(min)</em></span><input type="number" min={10} max={480} value={f.durationMin} placeholder={String(cfg?.defaultDurationMin ?? 60)} onChange={(e) => set('durationMin', e.target.value)} required={!!slot} /></label>
        </div>

        {!slot && (
          <fieldset className="dmo-repeat">
            <label className="dmo-check"><input type="checkbox" checked={f.repeat} onChange={(e) => set('repeat', e.target.checked)} /> Repeat on these days</label>
            {f.repeat && (
              <div className="dmo-repeat-body">
                <div className="dmo-weekdays" role="group" aria-label="Weekdays">
                  {WEEKDAYS.map(([v, l]) => {
                    const on = f.weekdays.includes(v);
                    return <button key={v} type="button" aria-pressed={on} className={on ? 'on' : ''} onClick={() => set('weekdays', on ? f.weekdays.filter((x: string) => x !== v) : [...f.weekdays, v])}>{l}</button>;
                  })}
                </div>
                <label className="dmo-until">Until<input type="date" value={f.until} min={f.date} onChange={(e) => set('until', e.target.value)} required /></label>
              </div>
            )}
          </fieldset>
        )}

        <div className="dmo-grid3">
          <label>Seats<input type="number" min={slot ? Math.max(1, slot.booked) : 1} max={1000} value={f.seats} placeholder={String(cfg?.defaultSeats ?? 30)} onChange={(e) => set('seats', e.target.value)} required={!!slot} /></label>
          <label><span className="dmo-lbl">Booking closes <em>(min before)</em></span><input type="number" min={0} max={10080} value={f.cutoffMin} placeholder={String(cfg?.defaultCutoffMin ?? 30)} onChange={(e) => set('cutoffMin', e.target.value)} required={!!slot} /></label>
          <label>Who runs it
            <select value={f.hostId} onChange={(e) => set('hostId', e.target.value)} required>
              <option value="">Choose…</option>
              {hosts.map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}
            </select>
          </label>
        </div>

        <div className="stm-field">
          <span>How people join</span>
          <div className="dmo-join-pick" role="radiogroup">
            {([['room', 'bi-broadcast', 'Our own live room', 'Join in the browser with one tap. Attendance is recorded automatically.'],
              ['link', 'bi-link-45deg', 'Google Meet or Zoom link', 'Visitors are sent to your link. Mark attendance yourself.']] as const).map(([v, ic, l, d]) => (
              <button key={v} type="button" role="radio" aria-checked={f.joinMethod === v} disabled={!!slot && slot.joinMethod !== v}
                className={f.joinMethod === v ? 'on' : ''} onClick={() => !slot && set('joinMethod', v)}>
                <i className={`bi ${ic}`} /><span><b>{l}</b><small>{d}</small></span>
              </button>
            ))}
          </div>
        </div>
        {f.joinMethod === 'link' && (
          <label>Meeting link<input type="url" value={f.meetingLink} onChange={(e) => set('meetingLink', e.target.value)} required placeholder="https://meet.google.com/… or https://zoom.us/j/…" /></label>
        )}
        <label><span className="dmo-lbl">What the demo covers <em>(optional, shown on the booking page)</em></span>
          <textarea rows={2} maxLength={1000} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="e.g. A live walk-through of the course, projects and placement support, with Q&A." />
        </label>
        <div className="stm-form-actions">
          <button type="button" className="stm-btn" onClick={onClose}>Close</button>
          <button type="submit" className="stm-btn primary" disabled={busy}>{busy ? 'Saving…' : slot ? 'Save' : f.repeat ? 'Create slots' : 'Create slot'}</button>
        </div>
      </form>
    </Dialog>
  );
}

function CancelDialog({ slot, onClose, onDone }: { slot: DemoSlot; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await demoAdminApi.cancel(slot._id, reason); onDone(); } catch (e2) { setErr(demoErr(e2)); setBusy(false); }
  };
  return (
    <Dialog title="Cancel this demo?" onClose={onClose}>
      <form className="stm-form" onSubmit={go}>
        {err && <div className="stm-alert" role="alert">{err}</div>}
        <p className="dmo-p">{slot.title}, {fmtWhen(slot.startsAt)}. The {slot.booked} {slot.booked === 1 ? 'person' : 'people'} booked will get a message with a link to pick another time, and their demo is cancelled on their lead.</p>
        <label><span className="dmo-lbl">Reason <em>(optional, saved on each lead)</em></span><input value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Trainer unavailable" /></label>
        <div className="stm-form-actions">
          <button type="button" className="stm-btn" onClick={onClose}>Keep it</button>
          <button type="submit" className="stm-btn danger-solid" disabled={busy}>{busy ? 'Cancelling…' : 'Cancel the demo'}</button>
        </div>
      </form>
    </Dialog>
  );
}

/* ───────────────────────────── Attendees ───────────────────────────── */

const STATUS_CHIP: Record<string, [string, string]> = {
  booked: ['r-ok', 'Booked'], attended: ['r-good', 'Attended'], no_show: ['r-needs_work', 'No-show'], cancelled: ['muted', 'Cancelled'],
};

function AttendeesDialog({ slot, onClose, onToast }: { slot: DemoSlot; onClose: () => void; onToast: (s: string) => void }) {
  const [rows, setRows] = useState<Attendee[] | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => {
    demoAdminApi.attendees(slot._id).then((d) => setRows(d.attendees)).catch((e) => setErr(demoErr(e)));
  }, [slot._id]);
  useEffect(() => { load(); }, [load]);
  const started = new Date(slot.startsAt) <= new Date();
  const mark = async (a: Attendee, status: 'attended' | 'no_show') => {
    try { await demoAdminApi.mark(a._id, status); onToast(status === 'attended' ? 'Marked attended' : 'Marked no-show. A rebook follow-up is created for the counsellor.'); load(); } catch (e) { onToast(demoErr(e)); }
  };
  const active = (rows || []).filter((r) => r.status !== 'cancelled');
  return (
    <Dialog title={`${slot.title} · ${fmtWhen(slot.startsAt)}`} onClose={onClose} wide>
      <div className="dmo-att">
        <div className="dmo-att-sum">
          <span className="stm-pill">{active.length} booked</span>
          {slot.counts.attended > 0 && <span className="stm-pill live">{slot.counts.attended} attended</span>}
          {(rows || []).some((r) => r.status === 'cancelled') && <span className="stm-pill">{(rows || []).filter((r) => r.status === 'cancelled').length} cancelled</span>}
          {slot.joinMethod === 'link' && started && <span className="dmo-hint"><i className="bi bi-info-circle" /> Outside link: mark who attended.</span>}
          {slot.joinMethod === 'room' && !started && <span className="dmo-hint"><i className="bi bi-info-circle" /> Attendance is recorded from the live room when the demo ends.</span>}
        </div>
        {err && <div className="stm-alert">{err}</div>}
        {!rows && !err ? <Loading /> : rows && rows.length === 0 ? <Empty icon="bi-people">Nobody has booked this slot yet.</Empty> : (
          <div className="dmo-table-wrap">
            <table className="dmo-table">
              <thead><tr><th scope="col">Person</th><th scope="col">Counsellor</th><th scope="col">Stage</th><th scope="col">Booked</th><th scope="col">Joined</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {(rows || []).map((a) => {
                  const [cls, label] = STATUS_CHIP[a.status] || ['muted', a.status];
                  return (
                    <tr key={a._id}>
                      <th scope="row">
                        <Link to={`/leads/${a.leadId}`} className="dmo-person">{a.name}</Link>
                        <small>{a.phone}{a.email ? ` · ${a.email}` : ''}{a.source ? ` · ${a.source}` : ''}</small>
                      </th>
                      <td data-label="Counsellor">{a.owner || <span className="stm-muted">Not assigned</span>}</td>
                      <td data-label="Stage">{a.stage ? <span className="dmo-stage" style={{ ['--sc' as any]: a.stage.color || '#5F7088' }}>{a.stage.name}</span> : '—'}</td>
                      <td data-label="Booked">{fmtWhen(a.bookedAt)}</td>
                      <td data-label="Joined">{a.joinedRoomAt ? `${a.minutesInRoom ?? 0} min` : a.joinClickedAt ? 'Opened link' : '—'}</td>
                      <td data-label="Status"><span className={`stm-chip ${cls}`}>{label}{a.status === 'cancelled' && a.cancelledBy === 'visitor' ? ' by them' : ''}</span></td>
                      <td className="dmo-row-actions">
                        {started && a.status !== 'cancelled' && (
                          <>
                            <button type="button" className={`stm-btn sm${a.status === 'attended' ? ' primary' : ''}`} onClick={() => mark(a, 'attended')} disabled={a.status === 'attended'}>Attended</button>
                            <button type="button" className="stm-btn sm" onClick={() => mark(a, 'no_show')} disabled={a.status === 'no_show'}>No-show</button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Dialog>
  );
}

/* ───────────────────────────── Report ───────────────────────────── */

const pctOf = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');
const hourLabel = (h: string) => { const n = Number(h); if (n < 0) return '—'; const ap = n >= 12 ? 'pm' : 'am'; return `${n % 12 || 12} ${ap}`; };

function ReportTab() {
  const [range, setRange] = useState(30);
  const [data, setData] = useState<DemoReport | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    setData(null);
    const to = new Date();
    demoAdminApi.report(new Date(to.getTime() - range * 86_400_000).toISOString(), to.toISOString()).then(setData).catch((e) => setErr(demoErr(e)));
  }, [range]);
  if (err) return <div className="stm-alert">{err}</div>;
  if (!data) return <Loading />;
  const t = data.total;
  const held = t.attended + t.noShow;
  const table = (title: string, rows: ReportRow[], label: (k: string) => string) => (
    <section className="stm-card">
      <h2 className="dmo-card-h">{title}</h2>
      {rows.length === 0 ? <p className="stm-muted">No bookings in this period.</p> : (
        <div className="dmo-table-wrap">
          <table className="dmo-table compact">
            <thead><tr><th scope="col">{title.replace('By ', '')}</th><th scope="col">Bookings</th><th scope="col">Attended</th><th scope="col">Show-up</th><th scope="col">Enrolled</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.key}><th scope="row">{label(r.key)}</th><td data-label="Bookings">{r.bookings}</td><td data-label="Attended">{r.attended}</td><td data-label="Show-up">{pctOf(r.attended, r.attended + r.noShow)}</td><td data-label="Enrolled">{r.enrolled}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  );
  return (
    <>
      <div className="stm-toolbar dmo-toolbar">
        <div className="dmo-seg" role="tablist" aria-label="Period">
          {[7, 30, 90].map((d) => <button key={d} type="button" role="tab" aria-selected={range === d} className={range === d ? 'on' : ''} onClick={() => setRange(d)}>Last {d} days</button>)}
        </div>
      </div>
      <section className="stm-tiles compact" aria-label="Totals">
        <div className="stm-tile"><span className="stm-tile-ic"><i className="bi bi-calendar-check" /></span><div><span className="stm-tile-label">Bookings</span><b>{t.bookings}</b><small>{data.slots} slots · {t.cancelled} cancelled</small></div></div>
        <div className="stm-tile good"><span className="stm-tile-ic"><i className="bi bi-person-check" /></span><div><span className="stm-tile-label">Attended</span><b>{t.attended}</b><small>{t.noShow} no-show</small></div></div>
        <div className={`stm-tile ${held && t.attended / held < 0.4 ? 'warn' : ''}`}><span className="stm-tile-ic"><i className="bi bi-graph-up" /></span><div><span className="stm-tile-label">Show-up rate</span><b>{pctOf(t.attended, held)}</b><small>of demos that took place</small></div></div>
        <div className="stm-tile good"><span className="stm-tile-ic"><i className="bi bi-mortarboard" /></span><div><span className="stm-tile-label">Enrolled</span><b>{t.enrolled}</b><small>{pctOf(t.enrolled, t.bookings)} of bookings</small></div></div>
      </section>
      <div className="dmo-report-grid">
        {table('By course', data.byCourse, (k) => k)}
        {table('By source', data.bySource, (k) => (k === 'direct' ? 'Direct / no UTM' : k))}
        {table('By start time', data.byHour, hourLabel)}
      </div>
    </>
  );
}

/* ───────────────────────────── Settings & website ───────────────────────────── */

function SettingsTab({ onToast }: { onToast: (s: string) => void }) {
  const [cfg, setCfg] = useState<DemoSettings | null>(null);
  const [courses, setCourses] = useState<{ key: string; name: string }[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    demoAdminApi.settings().then(setCfg).catch((e) => setErr(demoErr(e)));
    demoAdminApi.slots('all').then((s) => {
      const m = new Map<string, string>(); for (const x of s) if (!m.has(x.courseKey)) m.set(x.courseKey, x.course);
      setCourses([...m].map(([key, name]) => ({ key, name })));
    }).catch(() => undefined);
  }, []);
  if (err && !cfg) return <div className="stm-alert">{err}</div>;
  if (!cfg) return <Loading />;
  const set = (k: keyof DemoSettings, v: any) => setCfg((p) => (p ? { ...p, [k]: v } : p));
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { const saved = await demoAdminApi.saveSettings(cfg); setCfg({ ...saved, bookingPage: cfg.bookingPage }); onToast('Settings saved'); } catch (e2) { setErr(demoErr(e2)); } finally { setBusy(false); }
  };
  const copy = (text: string) => { navigator.clipboard?.writeText(text).then(() => onToast('Link copied')).catch(() => window.prompt('Copy this link', text)); };
  const page = cfg.bookingPage || '';
  const button = `<a href="${page}" target="_blank" rel="noopener"\n   style="display:inline-block;background:#051D64;color:#fff;padding:12px 22px;border-radius:8px;font-weight:700;text-decoration:none">\n  Book a free demo\n</a>`;

  return (
    <div className="dmo-settings">
      <section className="stm-card">
        <h2 className="dmo-card-h"><i className="bi bi-globe2" /> Put it on your website</h2>
        <p className="dmo-p">Your booking page is ready. Link your website's <b>Book a demo</b> button to it. Nothing needs to be installed on the website.</p>
        {page ? (
          <>
            <div className="dmo-link-row">
              <code>{page}</code>
              <button type="button" className="stm-btn sm" onClick={() => copy(page)}><i className="bi bi-clipboard" /> Copy</button>
              <a className="stm-btn sm ghost" href={page} target="_blank" rel="noreferrer"><i className="bi bi-box-arrow-up-right" /> Open</a>
            </div>
            {courses.length > 0 && (
              <>
                <p className="dmo-p small">On a course page, use that course's link, so the page opens on that course:</p>
                <ul className="dmo-course-links">
                  {courses.map((c) => {
                    const url = `${page}?course=${encodeURIComponent(c.key)}`;
                    return <li key={c.key}><span>{c.name}</span><code>{url}</code><button type="button" className="stm-icon-btn dmo-icon" aria-label={`Copy ${c.name} link`} onClick={() => copy(url)}><i className="bi bi-clipboard" /></button></li>;
                  })}
                </ul>
              </>
            )}
            <ol className="dmo-steps">
              <li>Open your website editor (WordPress, Wix, Webflow, or your web developer's code).</li>
              <li>Edit the <b>Book a demo</b> button (or add one) and set its link to the address above. On course pages, use the course link.</li>
              <li>Keep ad tracking: add your campaign tags to the link, e.g. <code>?course=java-full-stack&amp;utm_source=instagram&amp;utm_campaign=dec</code>. They are saved on each lead and shown in the Report.</li>
              <li>Publish, then open your website on a phone and book a test demo to check the full flow.</li>
            </ol>
            <details className="dmo-snippet">
              <summary>Ready-made button code (for a web developer)</summary>
              <pre>{button}</pre>
              <button type="button" className="stm-btn sm" onClick={() => copy(button)}><i className="bi bi-clipboard" /> Copy code</button>
            </details>
            <p className="dmo-p small"><i className="bi bi-whatsapp" /> For WhatsApp confirmations and reminders, assign templates for <b>Book a demo</b> in Admin → WhatsApp Templates → Where used. Email goes out without any setup.</p>
          </>
        ) : <p className="stm-muted">Your institute has no web address name (slug) yet. Ask the platform administrator to set one.</p>}
      </section>

      <section className="stm-card">
        <h2 className="dmo-card-h"><i className="bi bi-sliders" /> Settings</h2>
        <form className="stm-form" onSubmit={save}>
          {err && <div className="stm-alert" role="alert">{err}</div>}
          <label className="dmo-check big"><input type="checkbox" checked={cfg.moveToDemoStage} onChange={(e) => set('moveToDemoStage', e.target.checked)} />
            <span><span className="dmo-lbl">Move the lead to the <b>Demo</b> stage when they book</span><small>Only forward: a lead already at Seat reserved or Enrolled stays where it is. Uses the stage marked with the Demo milestone in Lead Pipeline.</small></span>
          </label>
          <div className="dmo-grid2">
            <label><span className="dmo-lbl">Seats per slot <em>(default)</em></span><input type="number" min={1} max={1000} value={cfg.defaultSeats} onChange={(e) => set('defaultSeats', Number(e.target.value))} /></label>
            <label><span className="dmo-lbl">Booking closes <em>(minutes before, default)</em></span><input type="number" min={0} max={10080} value={cfg.defaultCutoffMin} onChange={(e) => set('defaultCutoffMin', Number(e.target.value))} /></label>
            <label><span className="dmo-lbl">Duration <em>(minutes, default)</em></span><input type="number" min={10} max={480} value={cfg.defaultDurationMin} onChange={(e) => set('defaultDurationMin', Number(e.target.value))} /></label>
            <label><span className="dmo-lbl">Counts as attended after <em>(minutes in our room)</em></span><input type="number" min={1} max={240} value={cfg.attendedMinutes} onChange={(e) => set('attendedMinutes', Number(e.target.value))} /></label>
          </div>
          <label>Booking page heading<input value={cfg.pageTitle} maxLength={120} onChange={(e) => set('pageTitle', e.target.value)} /></label>
          <label>Booking page line<input value={cfg.pageSubtitle} maxLength={300} onChange={(e) => set('pageSubtitle', e.target.value)} /></label>
          <div className="stm-form-actions"><button type="submit" className="stm-btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button></div>
        </form>
      </section>
    </div>
  );
}
