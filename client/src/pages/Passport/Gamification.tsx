import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { GamificationSummary, ScopedLeaderboardResponse, ScopedLeaderboardRow } from '../../api/passportApi';
import './gamification.css';
import './gamificationRedesign.css';

const PERIODS = [{ key: 'ALL_TIME', label: 'All time' }, { key: 'MONTHLY', label: 'This month' }, { key: 'WEEKLY', label: 'This week' }];
const SCOPES = [{ key: 'COLLEGE', label: 'College' }, { key: 'GLOBAL', label: 'Global' }];
const RANK_LABEL: Record<string, string> = { college: 'College', global: 'Global', district: 'District', state: 'State' };

const Gamification: React.FC = () => {
  const nav = useNavigate();
  const [summary, setSummary] = useState<GamificationSummary | null>(null);
  const [rewards, setRewards] = useState<any>(null);
  const [board, setBoard] = useState<ScopedLeaderboardResponse | null>(null);
  const [scope, setScope] = useState('COLLEGE');
  const [period, setPeriod] = useState('ALL_TIME');
  const [loading, setLoading] = useState(true);
  const [boardLoading, setBoardLoading] = useState(false);
  const [showAllBadges, setShowAllBadges] = useState(false);

  useEffect(() => {
    Promise.allSettled([passportApi.getMyGamification(), passportApi.getRewards()]).then(([g, r]) => {
      if (g.status === 'fulfilled') {
        setSummary(g.value);
        // Open on a board this member is actually on: no college means the college board is only an empty note.
        if (!g.value?.ranks?.college?.available && g.value?.ranks?.global?.available) setScope('GLOBAL');
      }
      if (r.status === 'fulfilled') setRewards(r.value);
    }).finally(() => setLoading(false));
  }, []);

  const loadBoard = useCallback(async () => {
    setBoardLoading(true);
    try { setBoard(await passportApi.getMyLeaderboard(scope, period)); } catch { setBoard(null); }
    setBoardLoading(false);
  }, [scope, period]);
  useEffect(() => { loadBoard(); }, [loadBoard]);

  const earned = summary?.badges.filter(b => b.earned) || [];
  const locked = summary?.badges.filter(b => !b.earned) || [];
  const shownBadges = showAllBadges ? [...earned, ...locked] : [...earned, ...locked].slice(0, 4);
  const nextMilestone = summary && [7, 21, 30, 100].find(d => d > summary.streak);
  const levelProgress = Math.max(0, Math.min(100, summary?.level?.progressPct ?? 0));
  const collegeRank = summary?.ranks?.college;
  const globalRank = summary?.ranks?.global;
  const coins = rewards?.student?.coins ?? rewards?.student?.coinBalance ?? 0;

  const milestonePct = useMemo(() => {
    if (!summary || !nextMilestone) return 100;
    const previous = [0, 7, 21, 30].reverse().find(d => d <= summary.streak) || 0;
    return Math.max(0, Math.min(100, Math.round(((summary.streak - previous) / (nextMilestone - previous)) * 100)));
  }, [summary, nextMilestone]);

  if (loading) return <div className="gam"><div className="gam-load">Loading your progress…</div></div>;
  if (!summary) return <div className="gam"><div className="gam-empty">Your progress is not available right now.</div></div>;

  /** The level block is the same curve the dashboard reads (LevelInfo, straight from the server). */
  const lvl = summary.level;
  const levelNo = lvl?.level ?? 1;
  /** Four rungs around where the member stands, so the ladder has a before and an after. */
  const ladderFrom = Math.max(1, levelNo - 1);
  const ladder = [0, 1, 2, 3].map(i => ladderFrom + i);
  /** The nearest thing still to earn: a streak milestone has a real distance, a locked badge does not. */
  const nextEarn = nextMilestone
    ? { icon: 'bi-fire', title: `${nextMilestone}-day streak`, text: `${nextMilestone - summary.streak} more day${nextMilestone - summary.streak === 1 ? '' : 's'} of activity unlocks it.`, href: '/careerpilot' }
    : locked.length
      ? { icon: 'bi-award-fill', title: locked[0].name, text: locked[0].description, href: '/careerpilot/practice' }
      : null;

  return <div className="gam gam2">
    {/* The banner, as on every redesigned CareerPilot page: the level, the member's own level progress
        in the middle, and the coins beside it. */}
    <section className="gam2-hero">
      <div className="gam2-level">
        <div className="gam2-hex"><i className="bi bi-star-fill" /><strong>{summary.level?.level ?? 1}</strong><span>Level</span></div>
        <div className="gam2-level-copy">
          <span className="gam2-eyebrow"><i className="bi bi-stars" /> My progress</span>
          <h1>{summary.level?.title || 'Career Builder'} <i className="bi bi-patch-check-fill" /></h1>
          <p>Level {summary.level?.level ?? 1} · {summary.xp.toLocaleString()} XP. Keep completing real career work to reach the next level.</p>
          <div className="gam2-xp">
            <div className="gam2-xp-top"><b>Next: Level {summary.level?.nextLevel ?? ((summary.level?.level ?? 1) + 1)} · {summary.level?.nextTitle || 'Next level'}</b><span>{levelProgress}%</span></div>
            <div className="gam2-xp-bar"><i style={{ width: `${Math.max(2, levelProgress)}%` }} /></div>
          </div>
        </div>
      </div>
      {/* Level progress: what is still owed to the next level, where this level sits on the ladder
          and the nearest thing still to earn — all from the member's own summary. */}
      <div className="gam2-momentum">
        <span className="gam2-eyebrow"><i className="bi bi-graph-up-arrow" /> Level progress</span>
        <div className={`gam2-togo${lvl?.xpToNextLevel === 0 ? ' on' : ''}`}>
          <span className="ic"><i className="bi bi-lightning-charge-fill" /></span>
          <div>
            <b>{lvl?.xpToNextLevel !== undefined ? `${lvl.xpToNextLevel.toLocaleString()} XP to go` : `Level ${levelNo} · ${summary.xp.toLocaleString()} XP`}</b>
            <span>To Level {lvl?.nextLevel ?? levelNo + 1} · {lvl?.nextTitle || 'the next title'}</span>
            {lvl?.xpIntoLevel !== undefined && lvl?.xpForThisLevel
              ? <i className="gam2-togo-bar" aria-hidden="true"><em style={{ width: `${Math.max(3, Math.min(100, Math.round((lvl.xpIntoLevel / lvl.xpForThisLevel) * 100)))}%` }} /></i>
              : null}
          </div>
        </div>
        <ol className="gam2-steps2">
          {ladder.map(n => <li key={n} className={n < levelNo ? 'done' : n === levelNo ? 'current' : ''}><i /><span>L{n}</span></li>)}
        </ol>
        {nextEarn && <button type="button" className="gam2-next" onClick={() => nav(nextEarn.href)}>
          <span className="ic"><i className={`bi ${nextEarn.icon}`} /></span>
          <div><b>Next to earn: {nextEarn.title}</b><span>{nextEarn.text}</span></div>
          <i className="bi bi-chevron-right" />
        </button>}
      </div>
      <div className="gam2-wallet">
        <div className="gam2-coin"><span><i className="bi bi-coin" /></span><div><small>CareerPilot coins</small><b>{Number(coins).toLocaleString()}</b></div></div>
        <div className="gam2-coin xp"><span><i className="bi bi-lightning-charge-fill" /></span><div><small>Lifetime XP</small><b>{summary.xp.toLocaleString()}</b></div></div>
        <button onClick={() => nav('/careerpilot/rewards')}><i className="bi bi-gift" /> Rewards store</button>
      </div>
    </section>

    <div className="gam-five-metrics">
      <div className="gam-metric"><span className="gam-mi orange"><i className="bi bi-fire"/></span><small>Current Streak</small><b>{summary.streak}</b><em>days · Best {summary.longestStreak}</em></div>
      <div className="gam-metric"><span className="gam-mi teal"><i className="bi bi-lightning-charge"/></span><small>Total XP</small><b>{summary.xp.toLocaleString()}</b><em>activity earned</em></div>
      <div className="gam-metric"><span className="gam-mi purple"><i className="bi bi-award"/></span><small>Badges Earned</small><b>{earned.length}</b><em>of {summary.badges.length} badges</em></div>
      <div className="gam-metric"><span className="gam-mi orange"><i className="bi bi-trophy"/></span><small>College Rank</small><b>{collegeRank?.available&&collegeRank.rank?`#${collegeRank.rank}`:'—'}</b><em>{collegeRank?.available&&collegeRank.participants?`of ${collegeRank.participants}`:'Not available'}</em></div>
      <div className="gam-metric"><span className="gam-mi blue"><i className="bi bi-globe2"/></span><small>Global Rank</small><b>{globalRank?.available&&globalRank.rank?`#${globalRank.rank}`:'—'}</b><em>{globalRank?.available&&globalRank.participants?`of ${globalRank.participants}`:'Not available'}</em></div>
    </div>

    <div className="gam-split">
      <section className="gam-card gam-next"><div className="gam-card-hd"><div><h3><i className="bi bi-flag"/> Next Milestone</h3></div></div>{nextMilestone?<><div className="gam-next-body"><div className="gam-next-orb">{nextMilestone}</div><div><b>{nextMilestone}-Day Consistency</b><p>{nextMilestone-summary.streak} more day{nextMilestone-summary.streak===1?'':'s'} to unlock your next streak milestone.</p></div></div><div className="gam-mile-bar"><span style={{width:`${milestonePct}%`}}/></div><div className="gam-mile-label"><span>{summary.streak} day{summary.streak === 1 ? '' : 's'}</span><span>{nextMilestone} days</span></div></>:<div className="gam-empty">You have reached every current streak milestone.</div>}</section>
      <section className="gam-card"><div className="gam-card-hd"><div><h3><i className="bi bi-shield-check"/> Ranking Scope (Verified)</h3></div></div><div className="gam-scope-strip"><button className={scope==='COLLEGE'?'on':''} onClick={()=>setScope('COLLEGE')}>College</button><button className={scope==='GLOBAL'?'on':''} onClick={()=>setScope('GLOBAL')}>Global</button><button disabled>District</button><button disabled>State</button></div><div className="gam-verified"><i className="bi bi-check-circle"/> Rankings use verified CareerPilot activity and real XP.</div><small className="gam-coming">District and State rankings are not available yet.</small></section>
    </div>

    <div className="gam-split gam-lower">
      <section className="gam-card"><div className="gam-card-hd"><div><h3>Recent Achievements</h3></div>{summary.badges.length>4&&<button onClick={()=>setShowAllBadges(v=>!v)}>{showAllBadges?'Show fewer':'View all'} →</button>}</div>{shownBadges.length?<div className="gam-ach-list">{shownBadges.map(b=><div className={`gam-ach ${b.earned?'':'locked'}`} key={b.key}><span><i className={`bi ${b.earned?b.iconKey:'bi-lock-fill'}`}/></span><div><b>{b.name}</b><small>{b.description}</small></div><em>{b.earned?'Earned':'Locked'}</em></div>)}</div>:<div className="gam-empty">Complete your first mission to earn a badge.</div>}</section>
      <section className="gam-card"><div className="gam-board-top"><div><h3>Leaderboard</h3><span>Based only on CareerPilot XP activity</span></div><button className="gam-link" onClick={()=>nav('/careerpilot/leaderboard')}>View full leaderboard →</button></div><div className="gam-tabs gam-periods">{PERIODS.map(p=><button key={p.key} className={period===p.key?'on':''} onClick={()=>setPeriod(p.key)}>{p.label}</button>)}</div>{boardLoading?<div className="gam-load">Loading leaderboard…</div>:!board?<div className="gam-empty">Could not load leaderboard.</div>:!board.available?<div className="gam-note warn">{(board as any).reason}</div>:<><div className="gam-mine"><span>{board.myRank?<>You are <b>#{board.myRank}</b> of {board.participantCount.toLocaleString()}</>:<>Earn XP to join this leaderboard</>}</span><b>{board.myXp.toLocaleString()} XP</b></div><div className="gam-rows">{board.entries.slice(0,5).map((r:ScopedLeaderboardRow)=><div className={`gam-row${r.me?' me':''}`} key={r.studentId}><span className="gam-rn">#{r.rank}</span><span className="gam-avatar">{(r.name?.[0]||'?').toUpperCase()}</span><div className="gam-who"><b>{r.name}{r.me?' (You)':''}</b>{r.college&&<em>{r.college}</em>}</div><span className="gam-row-xp">{r.xp.toLocaleString()} XP</span></div>)}</div></>}</section>
    </div>

    <section className="gam-card gam-earn"><h3>Ways to Earn XP</h3><div className="gam-earn-grid"><button onClick={()=>nav('/careerpilot/practice')}><i className="bi bi-code-square"/><b>Practice Questions</b><span>Build skill evidence</span></button><button onClick={()=>nav('/careerpilot/interview')}><i className="bi bi-mic"/><b>Mock Interviews</b><span>Practice interview skills</span></button><button onClick={()=>nav('/careerpilot')}><i className="bi bi-bullseye"/><b>Daily Missions</b><span>Complete career actions</span></button><button onClick={()=>nav('/careerpilot/roadmap')}><i className="bi bi-map"/><b>Learn & Improve</b><span>Follow your roadmap</span></button><button onClick={()=>nav('/careerpilot/skill-assessment')}><i className="bi bi-clipboard-check"/><b>Assessments</b><span>Measure your progress</span></button></div></section>
    <footer className="gam-reminder"><div><i className="bi bi-lightbulb"/><span><b>Remember: XP shows your activity, not your skill readiness.</b><small>Keep learning consistently and build real skills with CareerPilot.</small></span></div><button onClick={()=>nav('/careerpilot')}><i className="bi bi-rocket-takeoff"/> Start a Mission</button></footer>
  </div>;
};
export default Gamification;
