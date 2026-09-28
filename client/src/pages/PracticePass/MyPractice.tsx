import React, { useEffect, useState } from 'react';
import { practicePassApi, MyPractice as MyPracticeData, TaskCounts } from '../../api/practicePassApi';
import PracticeTodayCard from '../../components/practice/PracticeTodayCard';
import '../../components/practice/practice.css';

const TASK_SHORT: Record<string, string> = { communication: 'Comm', coding_problem: 'Code', assignment: 'Assign', thinking_lab: 'Think' };
const EXCUSE: Record<string, string> = { weekly_off: 'Weekly off', holiday: 'Holiday', leave: 'Leave', before_start: 'Not started', exempt: 'Exempt' };

export const PracticeCalendar: React.FC<{ days: { date: string; met: boolean; excused?: string | null; done: TaskCounts; required: TaskCounts }[]; today?: string }> = ({ days, today }) => {
  if (!days.length) return <div style={{ color: '#64748b' }}>No days yet.</div>;
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const first = new Date(`${sorted[0].date}T00:00:00Z`).getUTCDay();
  return (
    <div className="pp-cal">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="pp-cal-h">{d}</div>)}
      {Array.from({ length: first }).map((_, i) => <div key={`e${i}`} className="pp-day empty" />)}
      {sorted.map((d) => {
        const isToday = d.date === today;
        const cls = d.excused ? 'off' : d.met ? 'met' : isToday ? '' : 'miss';
        const need = Object.entries(d.required || {}).filter(([, v]) => (v as number) > 0);
        return (
          <div key={d.date} className={`pp-day ${cls} ${isToday ? 'today' : ''}`} title={d.date}>
            <b>{Number(d.date.slice(8))}</b>
            {d.excused ? <small>{EXCUSE[d.excused] || d.excused}</small> : need.map(([k, v]) => (
              <small key={k}>{((d.done as any)?.[k] || 0) >= (v as number) ? '✓' : '✗'} {TASK_SHORT[k]}</small>
            ))}
          </div>
        );
      })}
    </div>
  );
};

/** A student's own practice page: today's card plus the calendar of the rolling window. */
const MyPractice: React.FC = () => {
  const [p, setP] = useState<MyPracticeData | null>(null);
  useEffect(() => { practicePassApi.me().then(setP).catch(() => setP({ enabled: false })); }, []);
  return (
    <div style={{ padding: '22px 20px', maxWidth: 1000, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px' }}>My Practice</h1>
      <p style={{ color: '#64748b', margin: '0 0 16px' }}>Every working day, complete the tasks your institute sets. Your practice attendance decides placement support.</p>
      {!p ? <div style={{ color: '#64748b' }}>Loading…</div> : !p.enabled ? (
        <div className="pp-card">Daily practice tracking is not switched on for your institute yet.</div>
      ) : <>
        <PracticeTodayCard compact />
        <div className="pp-card">
          <div className="pp-kicker" style={{ marginBottom: 10 }}>Last {p.policy?.windowDays} days</div>
          <PracticeCalendar days={p.calendar || []} today={p.today} />
          <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#64748b', marginTop: 10, flexWrap: 'wrap' }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#d1fae5', borderRadius: 3 }} /> Practice day</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#fee2e2', borderRadius: 3 }} /> Missed</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#f1f5f9', borderRadius: 3 }} /> Off / holiday / leave</span>
          </div>
        </div>
      </>}
    </div>
  );
};

export default MyPractice;
