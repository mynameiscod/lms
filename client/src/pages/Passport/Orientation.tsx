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

      {item.kind === 'video' && (
        item.url
          ? <video className="ori-video" controls src={item.url} onEnded={() => { if (!item.done) markDone(); }} />
          : <p className="ori-missing"><i className="bi bi-camera-video-off" /> This video has not been added yet. You can carry on without it.</p>
      )}
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

      {item.kind !== 'checklist' && item.kind !== 'recording' && !item.done && (
        <button type="button" className="ori-btn" disabled={busy} onClick={markDone}>
          {busy ? 'Saving…' : 'Mark as done'}
        </button>
      )}
    </section>
  );
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
  /** Every save hands back the whole view, so the caller refreshes from the server's answer. */
  onChanged: (v: OrientationView) => void;
  /** Called once a day is finished, with the next day to open, or null when none is left. */
  onFinished?: (nextDay: number | null) => void;
}> = ({ day, onChanged, onFinished }) => {
  const [outstanding, setOutstanding] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

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
    onFinished?.(r.orientation?.nextDay ?? null);
  };

  return (
    <main className="ori-day">
      <div className="ori-day-head">
        <div>
          <span className="ori-day-n">Day {day.dayNumber}</span>
          <h2>{day.title}</h2>
          <p>{day.blurb}</p>
        </div>
        <span className="ori-day-mins">{mins(day.minutes || 0)}</span>
      </div>

      {day.items.map(item => (
        <Item key={item.key} day={day.dayNumber} item={item} onSaved={adopt} />
      ))}

      {outstanding.length > 0 && (
        <p className="ori-err">Still to do: {outstanding.join(', ')}.</p>
      )}

      <footer className="ori-day-foot">
        {day.done ? (
          <span className="ori-done-note"><i className="bi bi-check-circle-fill" /> Day {day.dayNumber} finished</span>
        ) : (
          <button type="button" className="ori-btn primary" disabled={busy} onClick={finishDay}>
            {busy ? 'Saving…' : <>Finish day {day.dayNumber} <i className="bi bi-arrow-right" /></>}
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
  const [outstanding, setOutstanding] = useState<string[]>([]);

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

  const adopt = (v: OrientationView) => { setView(v); setOutstanding([]); };

  const finishDay = async (dayNumber: number) => {
    setOutstanding([]);
    const r = await passportApi.completeOrientationDay(dayNumber)
      .catch((e: any) => e?.response?.data || { ok: false, message: 'That did not save.' });
    if (r?.orientation) setView(r.orientation);
    if (!r?.ok) { setOutstanding(r?.outstanding || []); return; }
    const next = r.orientation?.nextDay ?? null;
    setOpen(next);
    if (!next) nav('/careerpilot/plan');
  };

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
            <span>{d.done ? <i className="bi bi-check-lg" /> : d.dayNumber}</span>
            <b>{d.title}</b>
            {d.locked && <i className="bi bi-lock-fill ori-chip-lock" />}
          </button>
        ))}
      </nav>

      {day && (
        <OrientationDayPanel
          day={day}
          onChanged={adopt}
          onFinished={next => { setOpen(next); if (!next) nav('/careerpilot/plan'); }}
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
