import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { practicePassApi, MyPractice } from '../../api/practicePassApi';
import './practice.css';

/**
 * "Today's practice" — the first thing a student sees. Today's required tasks as a checklist,
 * the streak, practice attendance against the threshold, and placement standing with the exact
 * way back if they are on hold. Renders nothing when the institute has not switched the pass on.
 */
const PracticeTodayCard: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const nav = useNavigate();
  const [p, setP] = useState<MyPractice | null>(null);
  useEffect(() => {
    let alive = true;
    practicePassApi.me().then((r) => { if (alive) setP(r); }).catch(() => undefined);
    return () => { alive = false; };
  }, []);
  if (!p?.enabled || !p.tasks) return null;

  const s = p.standing;
  const doneCount = p.tasks.filter((t) => t.done >= t.required).length;
  const allDone = doneCount === p.tasks.length;
  const pct = s?.pct ?? 100;
  const threshold = p.policy?.thresholdPct ?? 80;
  const status = p.policy?.exempt ? 'exempt' : s?.onHold ? 'hold' : pct < threshold ? 'risk' : 'ok';

  return (
    <div className={`pp-card pp-${allDone ? 'done' : status}`}>
      <div className="pp-head">
        <div>
          <div className="pp-kicker">Today's practice</div>
          <h2>{p.todayExcused ? 'Day off — no practice required today' : allDone ? 'All done for today ✓' : `${doneCount} of ${p.tasks.length} done`}</h2>
        </div>
        <div className="pp-streak" title="Practice days in a row">🔥 {s?.streak ?? 0}<small>day streak</small></div>
      </div>

      {!p.todayExcused && (
        <div className="pp-tasks">
          {p.tasks.map((t) => {
            const ok = t.done >= t.required;
            return (
              <button key={t.task} className={`pp-task ${ok ? 'ok' : ''}`} onClick={() => nav(t.link)}>
                <span className="pp-check">{ok ? '✓' : ''}</span>
                <span className="pp-task-l">{t.label}{t.required > 1 ? ` × ${t.required}` : ''}</span>
                <span className="pp-task-r">{ok ? 'Done' : t.required > 1 ? `${t.done}/${t.required} · Start →` : 'Start →'}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="pp-foot">
        <div className="pp-meter">
          <div className="pp-meter-top"><span>Practice attendance</span><b>{pct}%</b></div>
          <div className="pp-bar"><span style={{ width: `${Math.min(100, pct)}%` }} /><i style={{ left: `${threshold}%` }} title={`Placement support needs ${threshold}%`} /></div>
          <div className="pp-meter-sub">{s?.metDays ?? 0} of {s?.countedDays ?? 0} working days · needs {threshold}% for placement support</div>
        </div>
        <div className={`pp-status pp-s-${status}`}>
          {status === 'hold' && <>⛔ <b>Placement on hold.</b> {p.daysToRecover ? `Complete ${p.daysToRecover} more practice day${p.daysToRecover === 1 ? '' : 's'} in a row to lift it.` : 'Keep practising daily to lift it.'}</>}
          {status === 'risk' && <>⚠️ <b>Below {threshold}%.</b> {p.graceDaysLeft ? `Placement hold starts in ${p.graceDaysLeft} day${p.graceDaysLeft === 1 ? '' : 's'}.` : 'Practise today to stay eligible.'}</>}
          {status === 'ok' && <>✅ <b>Eligible for placement support.</b> {p.graceDaysLeft ? `Rules take effect in ${p.graceDaysLeft} day${p.graceDaysLeft === 1 ? '' : 's'}.` : 'Keep the streak going.'}</>}
          {status === 'exempt' && <>ℹ️ You are exempted from the daily practice rule.</>}
        </div>
      </div>
      {!compact && <button className="pp-link" onClick={() => nav('/my-practice')}>View my practice calendar →</button>}
    </div>
  );
};

export default PracticeTodayCard;
