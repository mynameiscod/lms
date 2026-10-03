import React, { useEffect, useState } from 'react';
import { placementAdminApi, Interviewer, WeeklyWindow, errMsg } from '../../api/placementProgramApi';
import { userApi } from '../../api';

/**
 * The interview team: each person's weekly hours (IST), days off, and one permanent meeting link.
 * Linking the LMS login lets them see "My interviews" and mark attendance.
 */

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const EMPTY: Interviewer = { name: '', email: '', meetingUrl: '', active: true, weekly: [], daysOff: [] };

const Editor: React.FC<{ initial: Interviewer; staff: { _id: string; name: string; email: string }[]; onClose: () => void; onSaved: () => void }> = ({ initial, staff, onClose, onSaved }) => {
  const [iv, setIv] = useState<Interviewer>(initial);
  const [dayOff, setDayOff] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const windowsOf = (day: number) => iv.weekly.map((w, i) => ({ ...w, i })).filter(w => w.day === day);
  const setWin = (i: number, patch: Partial<WeeklyWindow>) => setIv({ ...iv, weekly: iv.weekly.map((w, j) => j === i ? { ...w, ...patch } : w) });
  const addWin = (day: number) => setIv({ ...iv, weekly: [...iv.weekly, { day, start: '10:00', end: '13:00' }] });
  const delWin = (i: number) => setIv({ ...iv, weekly: iv.weekly.filter((_, j) => j !== i) });
  const copyMon = () => {
    const mon = iv.weekly.filter(w => w.day === 1);
    setIv({ ...iv, weekly: [...iv.weekly.filter(w => ![2, 3, 4, 5].includes(w.day)), ...[2, 3, 4, 5].flatMap(d => mon.map(w => ({ ...w, day: d })))] });
  };

  const save = async () => {
    setBusy(true); setErr('');
    try { await placementAdminApi.saveInterviewer(iv); onSaved(); }
    catch (e) { setErr(errMsg(e)); }
    setBusy(false);
  };

  return (
    <div className="ppa-drawer-wrap" onClick={onClose}>
      <aside className="ppa-drawer" onClick={e => e.stopPropagation()}>
        <button className="ppa-x" onClick={onClose} aria-label="Close"><i className="bi bi-x-lg" /></button>
        <h2>{iv._id ? 'Edit interviewer' : 'Add interviewer'}</h2>
        {err && <div className="ppa-err">{err}</div>}
        <div className="ppa-form one">
          <label>Name<input value={iv.name} onChange={e => setIv({ ...iv, name: e.target.value })} /></label>
          <label>Email (gets the calendar invite)<input type="email" value={iv.email || ''} onChange={e => setIv({ ...iv, email: e.target.value })} /></label>
          <label>Meeting link
            <input value={iv.meetingUrl} placeholder="https://meet.google.com/abc-defg-hij" onChange={e => setIv({ ...iv, meetingUrl: e.target.value })} />
            <small>One permanent room: in Google Meet use "Create a meeting for later" from your Gmail, or your Zoom personal room. Turn on "host must admit guests". No link = no slots offered.</small>
          </label>
          <label>LMS login (optional)
            <select value={iv.userId || ''} onChange={e => { const u = staff.find(s => s._id === e.target.value); setIv({ ...iv, userId: e.target.value || undefined, ...(u && !iv.email ? { email: u.email } : {}), ...(u && !iv.name ? { name: u.name } : {}) }); }}>
              <option value="">Not linked</option>
              {staff.map(s => <option key={s._id} value={s._id}>{s.name} — {s.email}</option>)}
            </select>
            <small>Linked interviewers see their interviews under "My interviews" and can mark attendance.</small>
          </label>
          <label className="ppa-switch-row">
            <span><b>Taking interviews</b><small>{iv.active ? 'On — their free times are offered.' : 'Off — no new bookings.'}</small></span>
            <button type="button" role="switch" aria-checked={iv.active} className={`ppa-sw${iv.active ? ' on' : ''}`} onClick={() => setIv({ ...iv, active: !iv.active })} />
          </label>
        </div>

        <h3>Weekly hours (IST) <button className="ppa-link" type="button" onClick={copyMon}>Copy Monday to Tue–Fri</button></h3>
        <div className="ppa-week">
          {ORDER.map(d => (
            <div key={d} className="ppa-week-row">
              <span className="d">{DAYS[d]}</span>
              <div className="wins">
                {windowsOf(d).map(w => (
                  <span key={w.i} className="win">
                    <input type="time" value={w.start} onChange={e => setWin(w.i, { start: e.target.value })} />
                    –
                    <input type="time" value={w.end} onChange={e => setWin(w.i, { end: e.target.value })} />
                    <button type="button" aria-label="Remove" onClick={() => delWin(w.i)}><i className="bi bi-x" /></button>
                  </span>
                ))}
                {!windowsOf(d).length && <span className="off">Not available</span>}
              </div>
              <button className="ppa-link" type="button" onClick={() => addWin(d)}>+ hours</button>
            </div>
          ))}
        </div>

        <h3>Days off</h3>
        <div className="ppa-row">
          <input type="date" value={dayOff} onChange={e => setDayOff(e.target.value)} />
          <button className="ppa-btn ghost" type="button" disabled={!dayOff} onClick={() => { if (!iv.daysOff.includes(dayOff)) setIv({ ...iv, daysOff: [...iv.daysOff, dayOff].sort() }); setDayOff(''); }}>Add</button>
        </div>
        <div className="ppa-chips">
          {iv.daysOff.map(d => <span key={d} className="ppa-chip">{d}<button aria-label="Remove" onClick={() => setIv({ ...iv, daysOff: iv.daysOff.filter(x => x !== d) })}><i className="bi bi-x" /></button></span>)}
        </div>

        <div className="ppa-save-row"><button className="ppa-btn" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></div>
      </aside>
    </div>
  );
};

const PlacementInterviewers: React.FC = () => {
  const [list, setList] = useState<Interviewer[] | null>(null);
  const [staff, setStaff] = useState<{ _id: string; name: string; email: string }[]>([]);
  const [editing, setEditing] = useState<Interviewer | null>(null);
  const [err, setErr] = useState('');

  const load = () => placementAdminApi.interviewers().then(setList).catch(e => setErr(errMsg(e)));
  useEffect(() => {
    load();
    userApi.getUsers().then((r: any) => setStaff((r?.data || []).filter((u: any) => u.role && u.role !== 'STUDENT' && u.isActive !== false)
      .map((u: any) => ({ _id: u._id, name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email, email: u.email })))).catch(() => undefined);
  }, []);

  const remove = async (iv: Interviewer) => {
    if (!iv._id || !window.confirm(`Remove ${iv.name}?`)) return;
    try { await placementAdminApi.deleteInterviewer(iv._id); load(); } catch (e) { setErr(errMsg(e)); }
  };
  const hours = (iv: Interviewer) => ORDER.filter(d => iv.weekly.some(w => w.day === d)).map(d => DAYS[d]).join(', ') || 'No hours set';

  return (
    <div>
      <div className="ppa-toolbar">
        <p className="ppa-note">Candidates are offered every time at least one interviewer is free; bookings go to the least busy.</p>
        <button className="ppa-btn" onClick={() => setEditing({ ...EMPTY })}><i className="bi bi-plus-lg" /> Add interviewer</button>
      </div>
      {err && <div className="ppa-err">{err}</div>}
      {!list ? <div className="ppa-card">Loading…</div> : !list.length ? (
        <div className="ppa-card ppa-muted">No interviewers yet. Add one with their weekly hours and meeting link — no slots are offered until then.</div>
      ) : (
        <div className="ppa-iv-grid">
          {list.map(iv => (
            <div key={iv._id} className={`ppa-card ppa-iv${iv.active ? '' : ' off'}`}>
              <div className="top"><b>{iv.name}</b><span className={`ppa-stage ${iv.active ? 's-active' : 's-withdrawn'}`}>{iv.active ? 'Active' : 'Off'}</span></div>
              <div className="meta">{iv.email || 'No email'}</div>
              <div className="meta">{hours(iv)}</div>
              <div className="meta">{iv.meetingUrl ? <a href={iv.meetingUrl} target="_blank" rel="noreferrer">Meeting link</a> : <span className="ppa-bad">No meeting link — not bookable</span>}</div>
              <div className="acts"><button className="ppa-btn ghost" onClick={() => setEditing(iv)}>Edit</button><button className="ppa-btn ghost" onClick={() => remove(iv)}>Remove</button></div>
            </div>
          ))}
        </div>
      )}
      {editing && <Editor initial={editing} staff={staff} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
};

export default PlacementInterviewers;
