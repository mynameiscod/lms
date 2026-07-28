import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { Roadmap as RoadmapT, RoadmapWeek } from '../../api/passportApi';
import PassportShell from './PassportShell';

/**
 * The 90-day journey the ₹499 unlock actually promises. Free members still see a real
 * roadmap trimmed to the 7-day preview, with an unlock bar where the rest would be —
 * so the CTA shows exactly what's behind it instead of an empty page.
 */
const Roadmap: React.FC = () => {
  const nav = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [paying, setPaying] = useState(false);
  const [payMsg, setPayMsg] = useState('');

  const load = useCallback(async () => {
    try { setData(await passportApi.getRoadmap()); } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Open the week that contains today so a returning member lands where they are.
  useEffect(() => {
    const rm: RoadmapT | undefined = data?.roadmap;
    if (!rm) return;
    const cur = rm.phases.flatMap(p => p.weeks).find(w => rm.currentDay >= w.fromDay && rm.currentDay <= w.toDay);
    if (cur) setOpen(o => (o[cur.week] === undefined ? { ...o, [cur.week]: true } : o));
  }, [data]);

  const unlock = async () => {
    setPaying(true); setPayMsg('');
    const res = await passportApi.membershipCheckout();
    setPaying(false);
    if (res.ok) { setLoading(true); await load(); }
    else setPayMsg(res.message || 'Payment did not complete.');
  };

  if (loading) return <PassportShell><div className="pm-loading">Loading your roadmap…</div></PassportShell>;

  if (data?.needsAssessment) {
    return (
      <PassportShell>
        <div className="pm-head">
          <h1>Your 90-Day Roadmap</h1>
          <p>Your roadmap is built from your Career Readiness Assessment — take it first (it's free, about 5 minutes) and your personalised journey appears here.</p>
        </div>
        <div className="pm-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>🧭</div>
          <button className="pm-btn primary" onClick={() => nav('/passport/assessment')}>Start Free Assessment →</button>
        </div>
      </PassportShell>
    );
  }

  const rm: RoadmapT = data?.roadmap;
  if (!rm) return <PassportShell><div className="pm-empty">Roadmap unavailable right now.</div></PassportShell>;

  const entitled = !!data?.entitled;
  const pct = rm.totalDays ? Math.round((rm.completedDays / rm.totalDays) * 100) : 0;

  const Week: React.FC<{ w: RoadmapWeek }> = ({ w }) => {
    const isCurrent = rm.currentDay >= w.fromDay && rm.currentDay <= w.toDay;
    const isOpen = open[w.week] ?? false;
    return (
      <div className={`rm-week${isCurrent && entitled ? ' current' : ''}`}>
        <button className="rm-week-head" onClick={() => setOpen(o => ({ ...o, [w.week]: !isOpen }))}>
          <span className="wk"><small>WEEK</small>{w.week}</span>
          <span className="tt">
            <b>{w.theme}</b>
            <span>{w.goal} · Days {w.fromDay}–{w.toDay} · {w.focusLabels.join(' · ')}</span>
          </span>
          {entitled && w.completedDays > 0 && <span className="dn">{w.completedDays}/{w.days.length} days done</span>}
          <span className="cr">{isOpen ? '▲' : '▼'}</span>
        </button>
        {isOpen && (
          <div className="rm-days">
            {w.days.map(d => (
              <div key={d.day} className={`rm-day${d.done ? ' done' : ''}${d.isToday && entitled ? ' today' : ''}`}>
                <div className="dnum">
                  DAY {d.day}
                  {d.isToday && entitled && <div style={{ color: '#6650d8', fontWeight: 900 }}>TODAY</div>}
                </div>
                <div className="titles">
                  {d.titles.map((t, i) => <div key={i}>• {t}</div>)}
                  {!d.titles.length && <div style={{ color: '#94a3b8' }}>Rest / review day</div>}
                </div>
                <span className="xp">+{d.xp} XP</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <PassportShell
      meta={entitled ? (
        <>
          <span className="pm-pill"><i>📅</i>Day <b>{rm.currentDay}</b> / {rm.totalDays}</span>
          <span className="pm-pill"><i>⭐</i><b>{rm.earnedXp}</b> XP</span>
        </>
      ) : undefined}
    >
      <div className="pm-head">
        <h1>Your {rm.totalDays}-Day Roadmap</h1>
        <p><b>{rm.pathwayLabel}</b> — {rm.pathwayDescription}</p>
      </div>

      <div className="rm-summary">
        <div className="rm-stat">
          <div className="lbl">Career Score</div>
          <div className="val">{data?.careerScore ?? '—'}</div>
          <div className="hint">{data?.level || ''}</div>
        </div>
        <div className="rm-stat">
          <div className="lbl">{entitled ? 'Journey progress' : 'Journey length'}</div>
          <div className="val">{entitled ? `${pct}%` : `${rm.totalDays} days`}</div>
          {entitled && <div className="rm-progress"><i style={{ width: `${Math.max(pct, 2)}%` }} /></div>}
          {entitled && <div className="hint">{rm.completedDays} of {rm.totalDays} days complete</div>}
        </div>
        <div className="rm-stat">
          <div className="lbl">XP available</div>
          <div className="val">{rm.totalXp.toLocaleString()}</div>
          <div className="hint">{entitled ? `${rm.earnedXp} earned so far` : 'Across the full journey'}</div>
        </div>
        <div className="rm-stat">
          <div className="lbl">Phases</div>
          <div className="val">{rm.phases.length}</div>
          <div className="hint">Foundation → Build → Placement</div>
        </div>
      </div>

      {rm.phases.map(p => (
        <div className="rm-phase" key={p.key}>
          <div className="rm-phase-head">
            <h2>{p.label}</h2>
            <span className="rng">Days {p.fromDay}–{p.toDay}</span>
            <p>{p.blurb}</p>
          </div>
          {p.weeks.length
            ? p.weeks.map(w => <Week key={w.week} w={w} />)
            : (
              <div className="rm-week" style={{ padding: '18px 20px', color: '#94a3b8', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 17 }}>🔒</span>
                {Math.ceil((p.toDay - p.fromDay + 1) / 7)} weeks in this phase unlock with your membership.
              </div>
            )}
        </div>
      ))}

      {!entitled && (
        <div className="rm-lockbar">
          <h3>🔒 That's your first week — there are {rm.totalDays - (rm.previewDays || 7)} more days waiting</h3>
          <p>Unlock the full journey: daily missions, the Practice Lab, AI mock interviews, the Resume Center and your shareable Career Passport.</p>
          <button className="pm-btn primary" onClick={unlock} disabled={paying}>
            {paying ? 'Opening payment…' : `Unlock My ${rm.totalDays}-Day Career Passport — ₹${data?.priceInr ?? 499}`}
          </button>
          {payMsg && <div className="pm-msg err" style={{ maxWidth: 420, margin: '12px auto 0' }}>{payMsg}</div>}
        </div>
      )}
    </PassportShell>
  );
};

export default Roadmap;
