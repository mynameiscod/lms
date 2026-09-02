import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { Roadmap as RoadmapT, RoadmapWeek, RoadmapPhase } from '../../api/passportApi';
import { useMember } from './MemberLayout';
import SkillPlan, { SkillPlanState } from './SkillPlan';
import './roadmap.css';

/**
 * The 90-day journey the ₹499 unlock promises, in two views:
 *   compact — today's week expanded, the phase you're in, progress at a glance
 *   full    — every phase and week, filterable, exportable
 *
 * Free members still get a real roadmap trimmed to the 7-day preview with an unlock
 * bar where the rest would be, so the CTA shows exactly what's behind it.
 */

const PHASE_TINT: Record<string, string> = { foundation: '#6d4bd8', build: '#2563eb', launch: '#16a34a' };

/** Distinct mission titles in a week, with whether every day carrying them is done. */
function weekItems(w: RoadmapWeek, limit = 4) {
  const seen = new Map<string, boolean>();
  for (const d of w.days) {
    for (const t of d.titles) {
      seen.set(t, (seen.get(t) ?? true) && !!d.done);
    }
  }
  return Array.from(seen.entries()).slice(0, limit).map(([title, done]) => ({ title, done }));
}

const Roadmap: React.FC = () => {
  const nav = useNavigate();
  const { data: member } = useMember();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [phaseOpen, setPhaseOpen] = useState<Record<string, boolean>>({});
  const [full, setFull] = useState(false);
  const [skillState, setSkillState] = useState<SkillPlanState>('loading');

  /**
   * A remount must not un-decide the layout.
   *
   * "View full journey" unmounts SkillPlan, so coming back mounts it fresh and it reports
   * 'loading' again before its request lands. Taking that at face value would expand the
   * journey to full width for a moment and then collapse it back — the exact flash this
   * layout exists to avoid. Once a real answer is known, ignore the reset.
   */
  const reportSkillState = useCallback((next: SkillPlanState) => {
    setSkillState(prev => (next === 'loading' && prev !== 'loading' ? prev : next));
  }, []);
  const [phaseFilter, setPhaseFilter] = useState<string>('all');
  const [view, setView] = useState<'timeline' | 'list'>('timeline');
  const [paying, setPaying] = useState(false);
  const [payMsg, setPayMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try { setData(await passportApi.getRoadmap()); } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const rm: RoadmapT | undefined = data?.roadmap;

  // Land on the week that contains today, and open the phase it belongs to.
  useEffect(() => {
    if (!rm) return;
    const cur = rm.phases.flatMap(p => p.weeks).find(w => rm.currentDay >= w.fromDay && rm.currentDay <= w.toDay);
    if (cur) setOpen(o => (o[cur.week] === undefined ? { ...o, [cur.week]: true } : o));
    const curPhase = rm.phases.find(p => rm.currentDay >= p.fromDay && rm.currentDay <= p.toDay);
    if (curPhase) setPhaseOpen(o => (o[curPhase.key] === undefined ? { ...o, [curPhase.key]: true } : o));
  }, [rm]);

  const unlock = async () => {
    setPaying(true); setPayMsg('');
    const res = await passportApi.membershipCheckout();
    setPaying(false);
    if (res.ok) { setLoading(true); await load(); }
    else setPayMsg(res.message || 'Payment did not complete.');
  };

  const share = async () => {
    const slug = member?.shareSlug;
    const url = slug ? `${window.location.origin}/careerpilot/card/${slug}` : window.location.href;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { window.prompt('Copy your roadmap link:', url); }
  };

  // Milestones = the next unearned badges. Real progress, no invented reward numbers.
  const milestones = useMemo(
    () => (member?.badges || []).filter(b => !b.earned).slice(0, 3),
    [member?.badges],
  );

  /**
   * ONE FULL ROADMAP AT A TIME.
   *
   * This page used to stack two of them — a skill plan and the mission journey — each with
   * its own heading, phases and length. Even once both read the same number of days, a
   * member still had to work out which of the two was "their" roadmap.
   *
   * So whichever one is authoritative for this member gets the full page and the other
   * becomes a strip. The skill plan wins when it exists, because it is built from that
   * member's own measured gaps; the journey wins otherwise, which is the case that stops an
   * unassessed member landing on an empty screen.
   */
  const compact = skillState === 'plan';

  /**
   * When access ends, but ONLY when it ends before the programme does.
   *
   * A paying member has twelve months for a 90-day plan; telling them their access runs to
   * next August is noise, and a banner that appears for everybody is one people stop
   * reading. It earns its place exactly when the two disagree — a demo granted 30 days
   * being shown a 90-day roadmap they cannot finish.
   */
  const accessNote = useMemo(() => {
    const iso = data?.accessExpiresAt;
    const total = data?.roadmap?.totalDays;
    if (!iso || !total) return null;

    const ends = new Date(iso);
    if (Number.isNaN(ends.getTime())) return null;

    const daysLeft = Math.ceil((ends.getTime() - Date.now()) / 86400000);
    // Already lapsed is a different message, and the unlock panel already carries it.
    if (daysLeft <= 0) return null;

    const dayNow = data?.roadmap?.currentDay || 1;
    // Days of plan still ahead of them. Compared against days of access left, because a
    // member on day 80 of 90 with 30 days left has no problem to be told about.
    if (daysLeft >= total - dayNow + 1) return null;

    return {
      daysLeft,
      on: ends.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    };
  }, [data]);

  if (loading) return <div className="pm-loading">Loading your roadmap…</div>;

  if (data?.needsAssessment) {
    return (
      <>
        {/* A member can reach Skill DNA through the personalised assessment without ever
            taking the legacy one, so their plan still belongs here. Renders nothing when
            they have none. */}
        <SkillPlan />
        <div className="pm-head">
          <h1>Your 90-Day Roadmap</h1>
          <p>Your roadmap is built from your Career Readiness Assessment — take it first (it's free, about 5 minutes) and your personalised journey appears here.</p>
        </div>
        <div className="pm-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>🧭</div>
          <button className="pm-btn primary" onClick={() => nav('/careerpilot/assessment')}>Start Free Assessment →</button>
        </div>
      </>
    );
  }

  if (!rm) return <div className="pm-empty">Roadmap unavailable right now.</div>;

  const entitled = !!data?.entitled;
  const pct = rm.totalDays ? Math.round((rm.completedDays / rm.totalDays) * 100) : 0;
  const allWeeks = rm.phases.flatMap(p => p.weeks);
  const todayDone = allWeeks.flatMap(w => w.days).find(d => d.isToday)?.done ?? false;
  const inProgress = entitled && !todayDone ? 1 : 0;
  const remaining = Math.max(0, rm.totalDays - rm.completedDays - inProgress);
  const currentPhase = rm.phases.find(p => rm.currentDay >= p.fromDay && rm.currentDay <= p.toDay) || rm.phases[0];

  // ── Shared header ──
  const Stat: React.FC<{ ic: string; bg: string; label: string; value: React.ReactNode; sub?: React.ReactNode }> =
    ({ ic, bg, label, value, sub }) => (
      <div className="rq-stat">
        <span className="ic" style={{ background: bg }}>{ic}</span>
        <div className="tx">
          <div className="lbl">{label}</div>
          <div className="val">{value}</div>
          {sub && <div className="sub">{sub}</div>}
        </div>
      </div>
    );

  const Donut: React.FC<{ pctVal: number }> = ({ pctVal }) => {
    const r = 42, c = 2 * Math.PI * r;
    return (
      <div className="rq-donut">
        <svg width="110" height="110">
          <circle cx="55" cy="55" r={r} fill="none" stroke="#eef0f7" strokeWidth="11" />
          <circle cx="55" cy="55" r={r} fill="none" stroke="#6d4bd8" strokeWidth="11" strokeLinecap="round"
            strokeDasharray={`${(c * pctVal) / 100} ${c}`} transform="rotate(-90 55 55)" />
        </svg>
        <div className="mid"><b>{pctVal}%</b><span>Completed</span></div>
      </div>
    );
  };

  const Aside = (
    <aside className="rq-aside">
      <div className="rq-card">
        <h3>Roadmap Overview</h3>
        <div className="rq-overview">
          <Donut pctVal={pct} />
          <div className="rq-legend">
            <div><span className="dot g" />Completed<b>{rm.completedDays} {rm.completedDays === 1 ? 'Day' : 'Days'}</b></div>
            <div><span className="dot b" />In Progress<b>{inProgress} {inProgress === 1 ? 'Day' : 'Days'}</b></div>
            <div><span className="dot n" />Remaining<b>{remaining} Days</b></div>
          </div>
        </div>
      </div>

      <div className="rq-card">
        <h3>Phase Breakdown</h3>
        {rm.phases.map((p, i) => {
          const days = p.toDay - p.fromDay + 1;
          const done = p.weeks.flatMap(w => w.days).filter(d => d.done).length;
          const ppct = days ? Math.round((done / days) * 100) : 0;
          return (
            <div className="rq-phase-row" key={p.key}>
              <span className="n" style={{ background: `${PHASE_TINT[p.key] || '#6d4bd8'}1f`, color: PHASE_TINT[p.key] || '#6d4bd8' }}>{i + 1}</span>
              <div className="tx">
                <b>{p.label.replace(/^Phase \d+ · /, `Phase ${i + 1} - `)}</b>
                <span>Days {p.fromDay}–{p.toDay}</span>
              </div>
              <span className="pc">{ppct}%</span>
            </div>
          );
        })}
      </div>

      <div className="rq-motivate">
        <span className="star">⭐</span>
        <b>Stay Consistent, Win Big!</b>
        <span>Small steps every day lead to big breakthroughs.</span>
        <button onClick={() => nav('/careerpilot/practice')}>Earn XP now</button>
      </div>

      {!!milestones.length && (
        <div className="rq-card">
          <h3>Upcoming Milestones</h3>
          {milestones.map(m => (
            <div className="rq-mile" key={m.key}>
              <span className="ic" style={{ background: `${m.color}1f`, color: m.color }}>{m.icon}</span>
              <div className="tx"><b>{m.label}</b><span>{m.hint}</span></div>
              <span className="pc">{Math.round(m.progress * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </aside>
  );

  // ══ FULL VIEW ══
  if (full) {
    const visible = phaseFilter === 'all' ? rm.phases : rm.phases.filter(p => p.key === phaseFilter);
    return (
      <div className="rq">
        <div className="rq-bar">
          <button className="rq-back" onClick={() => setFull(false)}>← Back to Learning Path</button>
          <div className="rq-bar-actions">
            <button className="rq-ghost" onClick={() => window.print()}>⭳ Export Roadmap</button>
            <button className="rq-primary" onClick={share}>{copied ? '✓ Link copied' : '↗ Share Roadmap'}</button>
          </div>
        </div>

        <div className="rq-title">
          <h1>Your {rm.totalDays}-Day Roadmap 🚀</h1>
          <p>A structured {rm.totalDays}-day plan to build strong foundations, skills and confidence.</p>
        </div>

        <div className="rq-stats five">
          <Stat ic="📅" bg="#eef0ff" label="Total Duration" value={`${rm.totalDays} Days`} sub="Your learning journey" />
          <Stat ic="📈" bg="#e6f2ff" label="Overall Progress" value={`${pct}%`} sub={<div className="rq-mini"><i style={{ width: `${Math.max(pct, 2)}%` }} /></div>} />
          <Stat ic="⚡" bg="#fef3c7" label="XP Available" value={rm.totalXp.toLocaleString()} sub={`${rm.earnedXp} earned so far`} />
          <Stat ic="🧱" bg="#fdeaea" label="Phases" value={`${rm.phases.length} Phases`} sub="Foundation → Build → Placement" />
          <Stat ic="🗓️" bg="#efeaff" label="Current Day" value={`Day ${rm.currentDay} / ${rm.totalDays}`} sub="Keep going!" />
        </div>

        {/* Phase timeline */}
        <div className="rq-timeline">
          <span className="lb">ROADMAP<br />OVERVIEW</span>
          <div className="track">
            <div className="line"><i style={{ width: `${pct}%` }} /></div>
            {rm.phases.map((p, i) => (
              <div className="node" key={p.key} style={{ left: `${((p.fromDay - 1) / rm.totalDays) * 100}%` }}>
                <span className="n" style={{ background: PHASE_TINT[p.key] || '#6d4bd8' }}>{i + 1}</span>
                <div className="tx"><b>{p.label.replace(/^Phase \d+ · /, `Phase ${i + 1} - `)}</b><span>Days {p.fromDay}–{p.toDay}</span></div>
              </div>
            ))}
            <span className="flag">🏁</span>
          </div>
        </div>

        <div className="rq-filters">
          <div className="chips">
            <button className={phaseFilter === 'all' ? 'on' : ''} onClick={() => setPhaseFilter('all')}>All Phases</button>
            {rm.phases.map((p, i) => (
              <button key={p.key} className={phaseFilter === p.key ? 'on' : ''} onClick={() => setPhaseFilter(p.key)}>
                <span className="d" style={{ background: PHASE_TINT[p.key] }} />Phase {i + 1}
              </button>
            ))}
          </div>
          <div className="viewas">
            <span>View as:</span>
            <button className={view === 'timeline' ? 'on' : ''} onClick={() => setView('timeline')}>Timeline</button>
            <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>List</button>
          </div>
        </div>

        <div className="rq-full">
          <div className="rq-phases">
            {visible.map((p, pi) => {
              const idx = rm.phases.findIndex(x => x.key === p.key);
              const days = p.toDay - p.fromDay + 1;
              const done = p.weeks.flatMap(w => w.days).filter(d => d.done).length;
              const ppct = days ? Math.round((done / days) * 100) : 0;
              const xp = p.weeks.flatMap(w => w.days).reduce((s, d) => s + d.xp, 0);
              const isOpen = phaseOpen[p.key] ?? true;
              const tint = PHASE_TINT[p.key] || '#6d4bd8';
              return (
                <div className="rq-phase" key={p.key}>
                  <div className="hd">
                    <span className="badge" style={{ background: `${tint}14`, color: tint }}>
                      <small>PHASE</small>{idx + 1}<em>Days {p.fromDay}–{p.toDay}</em>
                    </span>
                    <div className="tx">
                      <b>{p.label.replace(/^Phase \d+ · /, '')}</b>
                      <span>{p.blurb}</span>
                    </div>
                    <div className="pr">
                      <span className="pc">{ppct}% Complete</span>
                      <div className="bar"><i style={{ width: `${Math.max(ppct, 2)}%`, background: tint }} /></div>
                    </div>
                    <span className="xp" style={{ color: tint }}>+{xp.toLocaleString()} XP</span>
                    <button className="cr" onClick={() => setPhaseOpen(o => ({ ...o, [p.key]: !isOpen }))}>{isOpen ? '▲' : '▼'}</button>
                  </div>

                  {isOpen && (
                    <div className={`weeks ${view}`}>
                      {p.weeks.map(w => (
                        <div className="wk" key={w.week}>
                          <div className="wh">
                            <b>Week {w.week}</b>
                            <span>Days {w.fromDay}–{w.toDay}</span>
                          </div>
                          <div className="wt">{w.theme}</div>
                          {weekItems(w).map(it => (
                            <div className={`wi${it.done ? ' done' : ''}`} key={it.title}>
                              <span className="ck">{it.done ? '✓' : '○'}</span>{it.title}
                            </div>
                          ))}
                          {w.completedDays > 0 && <div className="wd">{w.completedDays}/{w.days.length} days done</div>}
                        </div>
                      ))}
                      {!p.weeks.length && <div className="locked">🔒 Unlocks with your membership.</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <aside className="rq-aside">
            <div className="rq-card">
              <h3>Roadmap Legend</h3>
              <div className="rq-legend2">
                <div><span className="dot n" />Not started</div>
                <div><span className="dot b" />In progress</div>
                <div><span className="dot g" />Completed</div>
                <div><span className="dot p" />Milestone week</div>
              </div>
            </div>
            <div className="rq-motivate">
              <span className="star">🚀</span>
              <b>Stay Consistent!</b>
              <span>Small steps every day lead to big breakthroughs.</span>
            </div>
            <div className="rq-card">
              <h3>Tips for Success</h3>
              <div className="rq-tips">
                <div>☑ Follow the plan, one day at a time.</div>
                <div>☑ Solve problems daily.</div>
                <div>☑ Revise and take assessments.</div>
                <div>☑ Track your progress.</div>
              </div>
              <div className="rq-tip-end">You've got this! 💪</div>
            </div>
          </aside>
        </div>

        {!entitled && (
          <div className="rq-lock">
            <h3>🔒 {rm.totalDays - (rm.previewDays || 7)} more days unlock with membership</h3>
            <button className="rq-primary" onClick={unlock} disabled={paying}>
              {paying ? 'Opening payment…' : `Unlock — ₹${data?.priceInr ?? 499}`}
            </button>
            {payMsg && <div className="pm-msg err" style={{ maxWidth: 420, margin: '12px auto 0' }}>{payMsg}</div>}
          </div>
        )}
      </div>
    );
  }

  // ══ COMPACT VIEW ══
  return (
    <div className="rq">
      {accessNote && (
        <div className="rq-access">
          <span className="ic">🗓️</span>
          <div>
            <b>Your access runs to {accessNote.on}</b>
            <span>
              That is {accessNote.daysLeft} {accessNote.daysLeft === 1 ? 'day' : 'days'} of the
              {' '}{rm.totalDays}-day programme below. The plan does not shorten — you simply
              pick up where you left off if your access is extended.
            </span>
          </div>
        </div>
      )}

      <SkillPlan onState={reportSkillState} />

      {/*
        Held back until the skill plan has reported, so a member who has one does not watch
        the full journey render and then collapse into the strip a moment later.
      */}
      {skillState === 'loading' && <div className="rq-strip rq-strip-wait" aria-hidden="true" />}

      {compact && (
        <div className="rq-strip">
          <div className="rq-strip-main">
            <div className="rq-strip-top">
              <b>{rm.pathwayLabel}</b>
              <span className="rq-strip-day">Day {rm.currentDay} of {rm.totalDays}</span>
              <span className="chip gold">⭐ {rm.earnedXp} XP</span>
            </div>
            <div className="rq-mini"><i style={{ width: `${Math.max(pct, 2)}%` }} /></div>
            <div className="rq-strip-phases">
              {rm.phases.map(ph => (
                <em key={ph.key} className={ph.key === currentPhase.key ? 'on' : ''}>
                  {ph.label.replace(/^Phase (\d+) · /, '')}
                </em>
              ))}
            </div>
          </div>
          <div className="rq-strip-actions">
            <button className="rq-primary" onClick={() => nav('/careerpilot')}>Today's missions →</button>
            <button className="rq-ghost" onClick={() => setFull(true)}>View full journey</button>
          </div>
        </div>
      )}

      {/*
        The unlock still shows in compact mode. It is the only paywall on this page, and
        hiding it behind "View full journey" would put a conversion step one click further
        away for exactly the members who have not paid yet.
      */}
      {compact && !entitled && (
        <div className="rq-lock">
          <h3>🔒 That's your first week — {rm.totalDays - (rm.previewDays || 7)} more days are waiting</h3>
          <p>Unlock daily missions, the Practice Lab, AI mock interviews, the Resume Center and your shareable CareerPilot.</p>
          <button className="rq-primary" onClick={unlock} disabled={paying}>
            {paying ? 'Opening payment…' : `Unlock My ${rm.totalDays}-Day CareerPilot — ₹${data?.priceInr ?? 499}`}
          </button>
          {payMsg && <div className="pm-msg err" style={{ maxWidth: 420, margin: '12px auto 0' }}>{payMsg}</div>}
        </div>
      )}

      {!compact && skillState !== 'loading' && (<>
      <div className="rq-title row">
        <div>
          <h1>Your {rm.totalDays}-Day Roadmap 🚀</h1>
          <p><b>{rm.pathwayLabel}</b> — {rm.pathwayDescription}</p>
        </div>
        <div className="rq-title-chips">
          <span className="chip">📅 Day {rm.currentDay} / {rm.totalDays}</span>
          <span className="chip gold">⭐ {rm.earnedXp} XP</span>
        </div>
      </div>

      <div className="rq-body">
        <div className="rq-main">
          <div className="rq-stats four">
            <Stat ic="🏆" bg="#efeaff" label="Career Score" value={data?.careerScore ?? '—'} sub={<span className="v">{data?.level || ''}</span>} />
            <Stat ic="📈" bg="#e6f2ff" label="Journey Progress" value={`${pct}%`} sub={<><div className="rq-mini"><i style={{ width: `${Math.max(pct, 2)}%` }} /></div>{rm.completedDays} of {rm.totalDays} days complete</>} />
            <Stat ic="⚡" bg="#fef3c7" label="XP Available" value={rm.totalXp.toLocaleString()} sub={`${rm.earnedXp} earned so far`} />
            <Stat ic="🧱" bg="#fdeaea" label="Phases" value={rm.phases.length} sub="Foundation → Build → Placement" />
          </div>

          <div className="rq-phase-head">
            <h2>{currentPhase.label.replace(/^Phase (\d+) · /, 'Phase $1 - ')}</h2>
            <span className="rq-days">Days {currentPhase.fromDay}–{currentPhase.toDay}</span>
            <p>{currentPhase.blurb}</p>
          </div>

          {currentPhase.weeks.map(w => {
            const isOpen = open[w.week] ?? false;
            const isCurrent = rm.currentDay >= w.fromDay && rm.currentDay <= w.toDay;
            return (
              <div className={`rq-week${isCurrent ? ' current' : ''}`} key={w.week}>
                <button className="wh" onClick={() => setOpen(o => ({ ...o, [w.week]: !isOpen }))}>
                  <span className="wk"><small>WEEK</small>{w.week}</span>
                  <span className="tx">
                    <b>{w.theme}</b>
                    <span>{w.goal}</span>
                    <span className="tags">
                      <em>Days {w.fromDay}–{w.toDay}</em>
                      {w.focusLabels.map(f => <em key={f}>{f}</em>)}
                    </span>
                  </span>
                  <span className="dn">{w.completedDays}/{w.days.length} days done</span>
                  <span className="cr">{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div className="rq-days-list">
                    {w.days.map(d => (
                      <div className={`rq-day${d.done ? ' done' : ''}${d.isToday ? ' today' : ''}`} key={d.day}>
                        <div className="dn">
                          DAY {d.day}
                          {d.isToday && <span className="t">TODAY</span>}
                        </div>
                        <span className="rail"><i /></span>
                        <div className="titles">
                          {d.titles.length
                            ? d.titles.map((t, i) => <div key={i}>{d.done ? <s>{t}</s> : <>• {t}</>}</div>)
                            : <div className="rest">Rest / review day</div>}
                        </div>
                        <span className="xp">+{d.xp} XP</span>
                        {/*
                          Only today's row can be opened. The arrow always navigated to
                          today's missions regardless of which day it sat on, so on day 47
                          it silently took you somewhere else — and on today's row it
                          completed a loop back to the screen you arrived from. There is no
                          per-day view to send the other rows to, so they get no arrow
                          rather than a misleading one.
                        */}
                        {d.isToday && (
                          <button className="go" onClick={() => nav('/careerpilot')} aria-label="Go to today's missions">›</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="rq-viewfull">
            <button onClick={() => setFull(true)}>View Full Roadmap ▾</button>
          </div>

          {!entitled && (
            <div className="rq-lock">
              <h3>🔒 That's your first week — {rm.totalDays - (rm.previewDays || 7)} more days are waiting</h3>
              <p>Unlock daily missions, the Practice Lab, AI mock interviews, the Resume Center and your shareable CareerPilot.</p>
              <button className="rq-primary" onClick={unlock} disabled={paying}>
                {paying ? 'Opening payment…' : `Unlock My ${rm.totalDays}-Day CareerPilot — ₹${data?.priceInr ?? 499}`}
              </button>
              {payMsg && <div className="pm-msg err" style={{ maxWidth: 420, margin: '12px auto 0' }}>{payMsg}</div>}
            </div>
          )}
        </div>

        {Aside}
      </div>
      </>)}
    </div>
  );
};

export default Roadmap;
