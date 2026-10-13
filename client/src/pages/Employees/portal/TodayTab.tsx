import React, { useEffect, useState } from 'react';
import { portalApi, empErr, DayMode, PortalMe } from '../../../api/employeesApi';
import DayEditor from './DayEditor';
import { DAY_MODES, fmtTime, isOffDay, modeLabel } from './portalUtils';
import '../employees.css';
import './portal.css';

interface Props { me: PortalMe; reload: () => void }

const elapsed = (fromIso: string, now: number): string => {
  const mins = Math.max(0, Math.floor((now - new Date(fromIso).getTime()) / 60000));
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
};

const TodayTab: React.FC<Props> = ({ me, reload }) => {
  const today = me.today;
  const date = me.todayDate;
  const policy = me.config.activityPolicy;
  const [mode, setMode] = useState<DayMode>(today.workMode || 'office');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(t);
  }, []);

  const checkedIn = !!today.checkInAt;
  const checkedOut = !!today.checkOutAt;

  const checkIn = async () => {
    setBusy(true); setMsg(null);
    try {
      await portalApi.checkIn(mode);
      setMsg({ kind: 'ok', text: isOffDay(mode) ? `Marked as ${modeLabel(mode)}.` : 'You are checked in. Have a good day!' });
      setVersion((v) => v + 1);
      reload();
    } catch (e) { setMsg({ kind: 'err', text: empErr(e) }); } finally { setBusy(false); }
  };

  const checkOut = async () => {
    setBusy(true); setMsg(null);
    try {
      await portalApi.checkOut();
      setMsg({ kind: 'ok', text: 'Checked out. Do not forget to fill in your tasks and submit the day.' });
      reload();
    } catch (e) { setMsg({ kind: 'err', text: empErr(e) }); } finally { setBusy(false); }
  };

  let banner: { cls: string; title: string; text: string; note?: string };
  if (today.status === 'approved') banner = { cls: 'green', title: 'Approved ✓', text: `Your day was approved${today.reviewerName ? ` by ${today.reviewerName}` : ''}. Nothing more to do.` };
  else if (today.status === 'submitted') banner = { cls: 'violet', title: 'Submitted, waiting for review', text: 'Your reviewer will look at it soon.' };
  else if (today.status === 'returned') banner = { cls: 'amber', title: 'Returned. Please fix and submit again', text: `${today.reviewerName || 'Your reviewer'} sent this day back.`, note: today.reviewNote || 'No note was left. Please check your tasks and hours.' };
  else if (checkedOut) banner = { cls: 'blue', title: 'Checked out', text: `Worked ${fmtTime(today.checkInAt)} to ${fmtTime(today.checkOutAt)}. Fill in your tasks and submit the day.` };
  else if (checkedIn) banner = { cls: 'blue', title: `Working since ${fmtTime(today.checkInAt)}`, text: `${modeLabel(today.workMode)} today.` };
  else banner = { cls: 'grey', title: 'Day not started', text: 'Check in to start your day.' };

  const lockedStatus = today.status === 'submitted' || today.status === 'approved';

  return (
    <div>
      <div className={`emp-banner ${banner.cls}`} role="status">
        <b>{banner.title}</b>
        <span>{banner.text}</span>
        {banner.note && <div className="note">{banner.note}</div>}
      </div>

      {msg && <div className={`emp-msg ${msg.kind}`} role="status">{msg.text}</div>}

      {!checkedIn && !lockedStatus && (
        <div className="emp-card">
          <h2>Start your day</h2>
          <span className="emp-label">Where are you working today?</span>
          <div className="emp-modes">
            {DAY_MODES.map((m) => (
              <button key={m.k} type="button" className={`emp-chip${mode === m.k ? ' on' : ''}`} onClick={() => setMode(m.k)}>{m.label}</button>
            ))}
          </div>
          <button type="button" className="emp-btn good" style={{ width: '100%', fontSize: 16 }} disabled={busy} onClick={checkIn}>
            {busy ? 'Please wait…' : isOffDay(mode) ? `Mark as ${modeLabel(mode)}` : 'Check in'}
          </button>
          {!isOffDay(mode) && <p className="emp-hint">Office hours start at {policy.lateCheckInAfter}. Check-in is self-reported; your location is not recorded.</p>}
          {policy.requireCheckIn && <p className="emp-hint">Check-in is needed before you can submit your day.</p>}
        </div>
      )}

      {checkedIn && !checkedOut && !lockedStatus && (
        <div className="emp-card">
          <h2>You are working</h2>
          <div className="emp-big">{elapsed(today.checkInAt as string, now)}</div>
          <p className="emp-hint">Checked in at {fmtTime(today.checkInAt)} · {modeLabel(today.workMode)}</p>
          {today.late && <div className="emp-msg info">You checked in a little after {policy.lateCheckInAfter}. That is fine, just keep your tasks updated.</div>}
          <button type="button" className="emp-btn" style={{ width: '100%', fontSize: 16 }} disabled={busy} onClick={checkOut}>
            {busy ? 'Please wait…' : 'Check out'}
          </button>
        </div>
      )}

      <div className="emp-card">
        <h2>Today's work</h2>
        <DayEditor date={date} config={me.config} version={version} onChanged={reload} />
      </div>
    </div>
  );
};

export default TodayTab;
