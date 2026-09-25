import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { OrientationDay, OrientationItem, OrientationView } from '../../api/passportApi';
import './orientation.css';

/**
 * The welcome, before Day 1.
 *
 * ── WHY IT IS ITS OWN SCREEN ──────────────────────────────────────────────────────────────
 *
 * These days are not learning days: they are not in the ninety, they are not composed for anybody,
 * and they measure nothing. Putting them inside the journey screen would make them look like the
 * plan, which is the one thing they are not.
 *
 * ── IT SAYS WHAT IS MISSING ───────────────────────────────────────────────────────────────
 *
 * A video an admin has not added yet renders as exactly that, not as an empty player. A student
 * who can see the gap can carry on; a student watching a dead frame thinks the product is broken.
 *
 * ── THE RECORDINGS NEVER BLOCK ────────────────────────────────────────────────────────────
 *
 * They are the best minutes here and the easiest to be stopped by — no microphone, a shared room,
 * or simple nerves. Marked "optional" on the screen as they are on the server, so nobody thinks
 * their programme is locked behind a microphone.
 */

const mins = (n: number) => (n >= 60 ? `${Math.floor(n / 60)}h ${n % 60}m` : `${n} min`);

/** A prompt the member answers out loud, recorded in the browser. */
const Recorder: React.FC<{
  day: number; item: OrientationItem; onSaved: (v: OrientationView) => void;
}> = ({ day, item, onSaved }) => {
  const [state, setState] = useState<'idle' | 'recording' | 'saving'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const started = useRef(0);
  const tick = useRef<any>(null);

  useEffect(() => () => {
    clearInterval(tick.current);
    recorder.current?.stream.getTracks().forEach(t => t.stop());
  }, []);

  const start = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        clearInterval(tick.current);
        const length = (Date.now() - started.current) / 1000;
        setState('saving');
        const blob = new Blob(chunks.current, { type: 'video/webm' });
        const r = await passportApi.uploadOrientationRecording(day, item.key, blob, length)
          .catch((e: any) => ({ ok: false, message: e?.response?.data?.message || 'That did not save.' } as any));
        setState('idle');
        if (r.ok && r.orientation) onSaved(r.orientation);
        else setError(r.message || 'That did not save.');
      };
      rec.start();
      recorder.current = rec;
      started.current = Date.now();
      setSeconds(0);
      tick.current = setInterval(() => setSeconds(s => s + 1), 1000);
      setState('recording');
    } catch {
      setError('We could not reach your camera or microphone. You can skip this and carry on.');
    }
  };

  const stop = () => recorder.current?.stop();
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div className="ori-rec">
      {item.done && state === 'idle' && (
        <video className="ori-rec-play" controls src={passportApi.orientationRecordingUrl(day, item.key)} />
      )}
      <div className="ori-rec-actions">
        {state === 'recording' ? (
          <>
            <span className="ori-rec-live"><i /> {clock}</span>
            <button type="button" className="ori-btn primary" onClick={stop}>Stop and save</button>
          </>
        ) : (
          <button type="button" className="ori-btn" disabled={state === 'saving'} onClick={start}>
            <i className="bi bi-record-circle" /> {state === 'saving' ? 'Saving…' : item.done ? 'Record again' : 'Start recording'}
          </button>
        )}
        {item.targetSeconds ? <small>About {item.targetSeconds} seconds is plenty.</small> : null}
      </div>
      {error && <p className="ori-err">{error}</p>}
    </div>
  );
};

/** A list of things to go and do, ticked off as they are done. */
const Checklist: React.FC<{
  day: number; item: OrientationItem; onSaved: (v: OrientationView) => void;
}> = ({ day, item, onSaved }) => {
  const [checked, setChecked] = useState<number[]>(item.checked || []);
  const [saving, setSaving] = useState(false);
  const all = item.items || [];

  const toggle = async (i: number) => {
    const next = checked.includes(i) ? checked.filter(x => x !== i) : [...checked, i].sort((a, b) => a - b);
    setChecked(next);
    setSaving(true);
    /* Saved on every tick: a member who closes the tab mid-list keeps what they did. */
    const r = await passportApi.completeOrientationItem(day, item.key, next).catch(() => null);
    setSaving(false);
    if (r?.orientation) onSaved(r.orientation);
  };

  return (
    <div className="ori-check">
      <div className="ori-check-head">
        <b>{checked.length} of {all.length} done</b>
        {saving && <small>Saving…</small>}
      </div>
      <ul>
        {all.map((line, i) => (
          <li key={i}>
            <label>
              <input type="checkbox" checked={checked.includes(i)} onChange={() => toggle(i)} />
              <span>{line}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** Notes, written by an admin, shown as they were written. */
const Notes: React.FC<{ body?: string }> = ({ body }) => {
  const html = useMemo(() => {
    const text = String(body || '');
    const escaped = text.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
    return escaped
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .split(/\n{2,}/).map(p => {
        if (p.trim().startsWith('|')) {
          const rows = p.trim().split('\n').filter(r => !/^\|[\s|:-]+\|$/.test(r));
          const cells = rows.map((r, i) => `<tr>${r.split('|').slice(1, -1)
            .map(c => `<${i ? 'td' : 'th'}>${c.trim()}</${i ? 'td' : 'th'}>`).join('')}</tr>`).join('');
          return `<table>${cells}</table>`;
        }
        return `<p>${p.replace(/\n/g, '<br/>')}</p>`;
      }).join('');
  }, [body]);
  // The body is written by an admin of this tenant, and escaped above before any formatting.
  return <div className="ori-notes" dangerouslySetInnerHTML={{ __html: html }} />;
};

/** How much of a video counts as having watched it. */
export const WATCH_FRACTION_REQUIRED = 0.9;

/**
 * A video that is finished by WATCHING it, not by saying so.
 *
 * ── WHY THERE IS NO BUTTON ────────────────────────────────────────────────────────────────
 *
 * Every item had a "Mark as done" button, including the videos, so the whole welcome could be
 * completed by clicking five times without watching a second of it. A day that can be finished
 * without doing it is not a gate, it is a checkbox.
 *
 * ── SEEKING TO THE END IS NOT WATCHING ────────────────────────────────────────────────────
 *
 * Watched time is ACCUMULATED from playback, not read off the scrubber: each tick adds only the
 * small forward step that normal play produces, so dragging to the end adds nothing. Watching
 * ninety per cent and stopping counts; skipping to 90% does not.
 *
 * Pausing, rewinding and rewatching all behave: rewound seconds are simply watched again, and a
 * member who watches the middle twice still needs ninety per cent of the whole.
 */
const VideoItem: React.FC<{
  day: number; item: OrientationItem; onSaved: (v: OrientationView) => void;
}> = ({ day, item, onSaved }) => {
  const ref = useRef<HTMLVideoElement>(null);
  const watched = useRef(0);
  const lastTime = useRef(0);
  const saving = useRef(false);
  const [pct, setPct] = useState(item.done ? 100 : 0);

  const save = async () => {
    const r = await passportApi.completeOrientationItem(day, item.key).catch(() => null);
    if (r?.orientation) onSaved(r.orientation);
    else saving.current = false;   // let a failed save be retried by watching on
  };

  const onTimeUpdate = () => {
    const v = ref.current;
    if (!v || !v.duration || Number.isNaN(v.duration)) return;
    const step = v.currentTime - lastTime.current;
    /* A normal tick is a fraction of a second. Anything larger is a seek, and seeks are not watching. */
    if (step > 0 && step < 1.5) watched.current += step;
    lastTime.current = v.currentTime;

    const fraction = Math.min(1, watched.current / v.duration);
    setPct(Math.round(fraction * 100));
    if (!item.done && !saving.current && fraction >= WATCH_FRACTION_REQUIRED) {
      saving.current = true;
      save();
    }
  };

  /* After a seek the next tick would otherwise look like a huge jump forward. */
  const resync = () => { lastTime.current = ref.current?.currentTime ?? 0; };

  if (!item.url) {
    return <p className="ori-missing"><i className="bi bi-camera-video-off" /> This video has not been added yet. You can carry on without it.</p>;
  }

  const needed = Math.round(WATCH_FRACTION_REQUIRED * 100);
  return (
    <>
      <video
        ref={ref}
        className="ori-video"
        controls
        src={item.url}
        onTimeUpdate={onTimeUpdate}
        onSeeked={resync}
        onPlay={resync}
      />
      {!item.done && (
        <div className="ori-watch" role="status">
          <div className="ori-watch-bar"><i style={{ width: `${Math.min(100, Math.round((pct / needed) * 100))}%` }} /></div>
          <small>{pct}% watched — this opens at {needed}%</small>
        </div>
      )}
    </>
  );
};
const ICON: Record<string, string> = {
  video: 'bi-play-circle', notes: 'bi-journal-text', image: 'bi-image',
  checklist: 'bi-check2-square', recording: 'bi-mic',
};

const Item: React.FC<{
  day: number; item: OrientationItem; onSaved: (v: OrientationView) => void;
}> = ({ day, item, onSaved }) => {
  const [busy, setBusy] = useState(false);

  const markDone = async () => {
    setBusy(true);
    const r = await passportApi.completeOrientationItem(day, item.key).catch(() => null);
    setBusy(false);
    if (r?.orientation) onSaved(r.orientation);
  };

  return (
    <section className={`ori-item${item.done ? ' done' : ''}`}>
      <header>
        <span className="ori-item-ic"><i className={`bi ${ICON[item.kind] || 'bi-dot'}`} /></span>
        <div>
          <b>{item.title}</b>
          {item.blurb && <span>{item.blurb}</span>}
        </div>
        <span className="ori-item-meta">
          {!item.required && <em className="ori-optional">Optional</em>}
          <small>{mins(item.estimatedMinutes)}</small>
          {item.done && <i className="bi bi-check-circle-fill ori-tick" aria-label="Done" />}
        </span>
      </header>

      {item.kind === 'video' && <VideoItem day={day} item={item} onSaved={onSaved} />}
      {item.kind === 'image' && (
        item.url
          ? <img className="ori-image" src={item.url} alt={item.title} />
          : <p className="ori-missing"><i className="bi bi-image" /> This picture has not been added yet.</p>
      )}
      {item.kind === 'notes' && <Notes body={item.body} />}
      {item.kind === 'checklist' && <Checklist day={day} item={item} onSaved={onSaved} />}
      {item.kind === 'recording' && (
        <>
          {item.body && <p className="ori-prompt">{item.body}</p>}
          <Recorder day={day} item={item} onSaved={onSaved} />
        </>
      )}

      {/*
        * The button is for the items a member genuinely finishes by deciding they have: notes
        * they have read, a picture they have looked at. A video is finished by watching it, a
        * checklist by ticking it, a recording by making it — none of those need, or should have,
        * a way to declare them done.
        */}
      {item.kind !== 'checklist' && item.kind !== 'recording' && item.kind !== 'video' && !item.done && (
        <button type="button" className="ori-btn" disabled={busy} onClick={markDone}>
          {busy ? 'Saving…' : 'Mark as done'}
        </button>
      )}
    </section>
  );
};

/**
 * When a day opens, in words rather than a timestamp.
 *
 * The server sends an exact IST midnight; a member wants to know whether that is tonight or next
 * week, so a date nobody has to decode is the right answer and "tomorrow" is the common case.
 */
const whenItOpens = (iso?: string | null): string => {
  if (!iso) return 'tomorrow';
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return 'tomorrow';
  const days = Math.round((at.getTime() - Date.now()) / 86_400_000);
  if (days <= 1) return 'tomorrow';
  return `on ${at.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}`;
};
/**
 * ONE WELCOME DAY, WHEREVER IT IS BEING SHOWN.
 *
 * Exported because the plan screen now shows these days in its own day panel, beside the learning
 * days, and two renderings of the same day would drift: one would gain a "finish" button the other
 * lacked, or save an item by a different call. There is one day, so there is one component that
 * draws it, and `finishDay` — the thing that decides whether the next day opens — lives here with
 * it rather than at each call site.
 */
export const OrientationDayPanel: React.FC<{
  day: OrientationDay;
  /** The day after this one, when the calendar is what is holding it. Shown once this one is done. */
  nextDay?: OrientationDay | null;
  /** Every save hands back the whole view, so the caller refreshes from the server's answer. */
  onChanged: (v: OrientationView) => void;
  /**
   * Called once a day is finished.
   *
   * `nextDay` is the day to open NOW and `complete` says whether the welcome is over — and the
   * two are NOT the same question. A paced member who finishes today's day has no next day to
   * open and has not finished the welcome either; reading null as "done" sent them to Day 1,
   * which the server then refused.
   */
  onFinished?: (outcome: { nextDay: number | null; complete: boolean }) => void;
}> = ({ day, nextDay, onChanged, onFinished }) => {
  const [outstanding, setOutstanding] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const doneCount = day.items.filter(i => i.done).length;

  const adopt = (v: OrientationView) => { setOutstanding([]); onChanged(v); };

  const finishDay = async () => {
    setOutstanding([]);
    setBusy(true);
    const r = await passportApi.completeOrientationDay(day.dayNumber)
      .catch((e: any) => e?.response?.data || { ok: false, message: 'That did not save.' });
    setBusy(false);
    if (r?.orientation) onChanged(r.orientation);
    /* Refused while something required is unfinished: the server names what, and so does this. */
    if (!r?.ok) { setOutstanding(r?.outstanding || []); return; }
    onFinished?.({ nextDay: r.orientation?.nextDay ?? null, complete: !!r.orientation?.complete });
  };

  return (
    <main className="ori-day">
      {/*
        * READ LIKE A ROADMAP DAY.
        *
        * A welcome day sits in the same slot of the plan screen as Day 7 does, so it is held to
        * the same shape: a status badge, "Day N · title", the length, and how far through the
        * day's work the member is. It had none of those — a number, a heading and a blurb — so
        * the two days looked like they came from different products.
        *
        * The badge deliberately says Completed or Today and never Upcoming: a locked day is not
        * served at all (the server sends no items), so if this panel is drawing, the day is open.
        */}
      <div className="ori-day-head">
        <div>
          <span className={`ori-status s-${day.done ? 'completed' : 'current'}`}>
            {day.done ? 'Completed' : 'Today'}
          </span>
          <h2><span className="ori-day-n">Day {day.day}</span> · {day.title}</h2>
          <p>{day.blurb}</p>
        </div>
        <span className="ori-day-mins">{mins(day.minutes || 0)}</span>
      </div>

      {/* One line for the whole day, so progress is visible before scrolling through the items. */}
      {day.items.length > 0 && (
        <div className="ori-progress">
          <div className="ori-progress-bar" role="progressbar" aria-valuemin={0}
               aria-valuemax={day.items.length} aria-valuenow={doneCount}>
            <span style={{ width: `${Math.round((doneCount / day.items.length) * 100)}%` }} />
          </div>
          <small>{doneCount} of {day.items.length} done</small>
        </div>
      )}

      {day.items.map(item => (
        <Item key={item.key} day={day.dayNumber} item={item} onSaved={adopt} />
      ))}

      {outstanding.length > 0 && (
        <p className="ori-err">Still to do: {outstanding.join(', ')}.</p>
      )}

      <footer className="ori-day-foot">
        {day.done ? (
          <span className="ori-done-note">
            <i className="bi bi-check-circle-fill" /> Day {day.day} finished
            {/*
              * WHAT TO DO NOW IS PART OF FINISHING.
              *
              * A paced member who finishes today's welcome day has nothing more to open, and a
              * bare tick leaves them looking for work that does not exist. Saying when the next
              * one arrives turns a dead end into an appointment.
              */}
            {nextDay?.lockedReason === 'NOT_TODAY_YET' && (
              <em className="ori-tomorrow">Day {nextDay.day} opens {whenItOpens(nextDay.opensAt)}.</em>
            )}
          </span>
        ) : (
          <button type="button" className="ori-btn primary" disabled={busy} onClick={finishDay}>
            {busy ? 'Saving…' : <>Finish day {day.day} <i className="bi bi-arrow-right" /></>}
          </button>
        )}
      </footer>
    </main>
  );
};

const Orientation: React.FC = () => {
  const nav = useNavigate();
  const [view, setView] = useState<OrientationView | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const v = await passportApi.getMyOrientation();
      setView(v);
      setOpen(o => o ?? v.nextDay ?? v.days[0]?.dayNumber ?? null);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not load your orientation.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Finishing a day, and the outstanding list when it is refused, belong to OrientationDayPanel. */
  const adopt = (v: OrientationView) => setView(v);

  if (loading) return <div className="ori"><div className="ori-state">Loading your orientation…</div></div>;
  if (err) return <div className="ori"><div className="ori-state err">{err}</div></div>;
  if (!view || !view.enabled) return null;

  const day: OrientationDay | undefined = view.days.find(d => d.dayNumber === open) || view.days[0];
  const pct = view.totalDays ? Math.round((view.completedDays / view.totalDays) * 100) : 0;

  return (
    <div className="ori">
      <header className="ori-hero">
        <div>
          <span className="ori-eyebrow">Before day 1</span>
          <h1>Welcome to CareerPilot</h1>
          <p>
            {view.mandatory
              ? `${view.totalDays} short days to set you up. Finish them and your ${''}learning plan opens.`
              : `${view.totalDays} short days we added for new members. Your plan is already open — take these whenever you like.`}
          </p>
          <div className="ori-bar"><i style={{ width: `${Math.max(3, pct)}%` }} /></div>
          <small>{view.completedDays} of {view.totalDays} done</small>
        </div>
        {!view.mandatory && (
          <button type="button" className="ori-btn ghost" onClick={() => nav('/careerpilot/plan')}>
            Skip to my plan <i className="bi bi-arrow-right" />
          </button>
        )}
      </header>

      <nav className="ori-days" aria-label="Orientation days">
        {view.days.map(d => (
          <button
            key={d.dayNumber}
            type="button"
            className={`ori-day-chip${d.dayNumber === day?.dayNumber ? ' on' : ''}${d.done ? ' done' : ''}`}
            disabled={!!d.locked}
            onClick={() => setOpen(d.dayNumber)}
          >
            <span>{d.done ? <i className="bi bi-check-lg" /> : d.day}</span>
            <b>{d.title}</b>
            {d.locked && <i className="bi bi-lock-fill ori-chip-lock" />}
          </button>
        ))}
      </nav>

      {day && (
        <OrientationDayPanel
          day={day}
          nextDay={view.days.find(d => d.dayNumber > day.dayNumber) || null}
          onChanged={adopt}
          onFinished={({ nextDay, complete }) => {
            /* Only a finished welcome sends them to the plan; no day to open today is not that. */
            if (complete) { nav('/careerpilot/plan'); return; }
            if (nextDay) setOpen(nextDay);
          }}
        />
      )}

      {view.complete && (
        <section className="ori-complete">
          <i className="bi bi-stars" />
          <div>
            <b>Orientation finished</b>
            <span>Your learning plan is open. Day 1 is waiting.</span>
          </div>
          <button type="button" className="ori-btn primary" onClick={() => nav('/careerpilot/plan')}>
            Open my plan <i className="bi bi-arrow-right" />
          </button>
        </section>
      )}
    </div>
  );
};

export default Orientation;
