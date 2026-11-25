import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { demoPublicApi, demoErr, BookingView, PublicSlot, istDayKey, fmtTime, fmtDayLong, fmtDayShort, fmtWhen } from '../../api/demoBookingApi';
import './demoBooking.css';

/**
 * /demo-booking/<token> — a visitor's own booking, from the confirmation and every message.
 * Before the demo: a countdown, add to calendar, reschedule, cancel. From 10 minutes before: Join.
 * After: "this demo has ended" and a link to pick another time.
 */
const left = (ms: number) => {
  if (ms <= 0) return '';
  const m = Math.floor(ms / 60_000);
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  return d > 0 ? `${d} day${d > 1 ? 's' : ''} ${h} hr` : h > 0 ? `${h} hr ${mm} min` : `${Math.max(1, mm)} min`;
};

export default function MyDemoBooking() {
  const { token = '' } = useParams<{ token: string }>();
  const [params] = useSearchParams();
  const [v, setV] = useState<BookingView | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState(params.get('new') ? 'booked' : params.get('moved') ? 'moved' : '');
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'' | 'reschedule' | 'cancel'>('');

  const load = useCallback(() => demoPublicApi.booking(token).then((b) => { setV(b); setErr(''); }).catch((e) => setErr(demoErr(e, 'This booking link is not valid.'))), [token]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15_000); return () => clearInterval(t); }, []);
  // Refresh when the join window opens, so the button appears without a reload.
  useEffect(() => {
    if (!v || v.canJoin || v.ended) return;
    const ms = new Date(v.joinOpensAt).getTime() - Date.now();
    if (ms <= 0 || ms > 6 * 3600_000) return;
    const t = setTimeout(load, ms + 1000);
    return () => clearTimeout(t);
  }, [v, load]);
  useEffect(() => { if (v?.institute.name) document.title = `Your demo · ${v.institute.name}`; }, [v]);

  const join = async () => {
    setBusy(true);
    try { const r = await demoPublicApi.join(token); window.location.href = r.url; } catch (e) { setErr(demoErr(e)); load(); setBusy(false); }
  };
  const cancel = async () => {
    setBusy(true);
    try { setV(await demoPublicApi.cancel(token)); setMode(''); setMsg('cancelled'); } catch (e) { setErr(demoErr(e)); } finally { setBusy(false); }
  };

  if (err && !v) return <Shell><div className="dmp-card dmp-center"><i className="bi bi-link-45deg dmp-big-ic" /><h1>Link not valid</h1><p>{err}</p></div></Shell>;
  if (!v) return <Shell><div className="dmp-card dmp-center"><span className="dmp-spin" /> Loading…</div></Shell>;

  const s = v.slot;
  const startMs = new Date(s.startsAt).getTime();
  const active = v.status === 'booked' && s.status === 'open';
  const cancelled = v.status === 'cancelled' || s.status === 'cancelled';
  const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(s.title)}&dates=${toGcal(s.startsAt)}/${toGcal(s.endsAt)}&details=${encodeURIComponent(`Join, reschedule or cancel: ${window.location.origin}/demo-booking/${token}`)}`;

  return (
    <Shell institute={v.institute}>
      {msg === 'booked' && active && <div className="dmp-ok" role="status"><i className="bi bi-check-circle-fill" /> You're booked! Save this page: it's your seat, and we'll remind you before the start.</div>}
      {msg === 'moved' && active && <div className="dmp-ok" role="status"><i className="bi bi-check-circle-fill" /> Your demo has been moved to the new time.</div>}
      {msg === 'cancelled' && <div className="dmp-ok neutral" role="status"><i className="bi bi-info-circle-fill" /> Your booking is cancelled.</div>}
      {err && <div className="dmp-alert" role="alert"><i className="bi bi-exclamation-circle" /> {err}</div>}

      <section className="dmp-card dmp-ticket">
        <div className="dmp-ticket-top">
          <span className={`dmp-state ${cancelled ? 'off' : v.ended || v.status !== 'booked' ? 'done' : v.canJoin ? 'live' : ''}`}>
            {cancelled ? 'Cancelled' : v.status === 'attended' ? 'Attended' : v.ended ? 'Ended' : v.canJoin ? '● Open now' : 'Booked'}
          </span>
          <h1>{s.title}</h1>
          <p className="dmp-hello">Hi {v.name.split(' ')[0]}{s.hostName ? `, your demo is with ${s.hostName}` : ''}.</p>
        </div>
        <dl className="dmp-facts">
          <div><dt><i className="bi bi-calendar3" /> Date</dt><dd>{fmtDayLong(s.startsAt)}</dd></div>
          <div><dt><i className="bi bi-clock" /> Time</dt><dd>{fmtTime(s.startsAt)} IST · {s.durationMin} min</dd></div>
          <div><dt><i className="bi bi-laptop" /> Where</dt><dd>{s.joinMethod === 'room' ? 'Online, in your browser (no app needed)' : 'Online (Google Meet / Zoom)'}</dd></div>
        </dl>

        {active && !v.ended && (
          <div className="dmp-join">
            {v.canJoin ? (
              <button type="button" className="dmp-btn big" onClick={join} disabled={busy}><i className="bi bi-camera-video-fill" /> {busy ? 'Opening…' : 'Join the demo'}</button>
            ) : (
              <>
                <div className="dmp-count"><span>Starts in</span><b>{left(startMs - now)}</b></div>
                <p className="dmp-muted">The join button appears here 10 minutes before the start. Keep this page; it is your seat.</p>
              </>
            )}
          </div>
        )}
        {v.ended && v.status !== 'attended' && !cancelled && <p className="dmp-muted">This demo has ended. You can book another time below.</p>}

        {active && !v.ended && !v.canJoin && (
          <div className="dmp-cal">
            <a className="dmp-btn ghost" href={gcal} target="_blank" rel="noreferrer"><i className="bi bi-google" /> Google Calendar</a>
            <a className="dmp-btn ghost" href={demoPublicApi.icsUrl(token)}><i className="bi bi-calendar-plus" /> Other calendar</a>
          </div>
        )}
      </section>

      {active && (v.canChange || v.canCancel) && mode === '' && (
        <div className="dmp-manage">
          {v.canChange && <button type="button" className="dmp-link" onClick={() => setMode('reschedule')}><i className="bi bi-arrow-repeat" /> Reschedule</button>}
          {v.canCancel && <button type="button" className="dmp-link danger" onClick={() => setMode('cancel')}><i className="bi bi-x-circle" /> Cancel booking</button>}
        </div>
      )}
      {mode === 'cancel' && (
        <section className="dmp-card">
          <h2 className="dmp-h">Cancel this booking?</h2>
          <p className="dmp-muted">Your seat will be given to someone else. You can book again any time.</p>
          <div className="dmp-row"><button type="button" className="dmp-btn ghost" onClick={() => setMode('')}>Keep my seat</button><button type="button" className="dmp-btn danger" onClick={cancel} disabled={busy}>{busy ? 'Cancelling…' : 'Yes, cancel'}</button></div>
        </section>
      )}
      {mode === 'reschedule' && <Reschedule token={token} current={s} onClose={() => setMode('')} onDone={(b) => { setV(b); setMode(''); setMsg('moved'); }} />}

      {(cancelled || v.ended || v.status === 'no_show') && v.rebookUrl && (
        <a className="dmp-btn" href={v.rebookUrl}><i className="bi bi-calendar-plus" /> Book another time</a>
      )}
    </Shell>
  );
}

const toGcal = (d: string) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

function Reschedule({ token, current, onClose, onDone }: { token: string; current: PublicSlot; onClose: () => void; onDone: (b: BookingView) => void }) {
  const [slots, setSlots] = useState<PublicSlot[] | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  useEffect(() => { demoPublicApi.otherSlots(token).then((r) => setSlots(r.slots.filter((x) => x.courseKey === r.courseKey))).catch((e) => setErr(demoErr(e))); }, [token]);
  const byDay = useMemo(() => {
    const m = new Map<string, PublicSlot[]>();
    for (const s of slots || []) { const k = istDayKey(s.startsAt); m.set(k, [...(m.get(k) || []), s]); }
    return [...m];
  }, [slots]);
  const move = async (s: PublicSlot) => {
    setBusy(s._id); setErr('');
    try { onDone(await demoPublicApi.reschedule(token, s._id)); } catch (e) { setErr(demoErr(e)); setBusy(''); }
  };
  return (
    <section className="dmp-card">
      <div className="dmp-row space"><h2 className="dmp-h">Pick a new time</h2><button type="button" className="dmp-link" onClick={onClose}>Close</button></div>
      <p className="dmp-muted">Now: {fmtWhen(current.startsAt)} IST</p>
      {err && <div className="dmp-alert" role="alert">{err}</div>}
      {!slots && !err ? <p className="dmp-muted"><span className="dmp-spin" /> Loading…</p> : slots && slots.length === 0 ? <p className="dmp-muted">No other times are open for this course right now.</p> : (
        byDay.map(([d, list]) => (
          <div key={d} className="dmp-block">
            <h3 className="dmp-sub">{fmtDayShort(list[0].startsAt)}</h3>
            <div className="dmp-slots">
              {list.map((s) => (
                <button key={s._id} type="button" className="dmp-slot" onClick={() => move(s)} disabled={!!busy}>
                  <span className="dmp-slot-time">{fmtTime(s.startsAt)}</span>
                  <span className="dmp-slot-info"><b>{s.title}</b><small>{s.durationMin} min</small></span>
                  <span className="dmp-seats">{busy === s._id ? 'Moving…' : 'Move here'}</span>
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  );
}

function Shell({ children, institute }: { children: React.ReactNode; institute?: { name: string; logo: string } }) {
  return (
    <div className="dmp">
      <div className="dmp-wrap">
        <header className="dmp-brand">
          {institute?.logo ? <img src={institute.logo} alt={institute.name} /> : institute?.name ? <span className="dmp-mark" aria-hidden="true">{institute.name.charAt(0)}</span> : null}
          <span>{institute?.name || ''}</span>
        </header>
        {children}
      </div>
    </div>
  );
}
