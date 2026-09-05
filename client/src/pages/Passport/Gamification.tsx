import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { GamificationSummary, ScopedLeaderboardResponse, ScopedLeaderboardRow } from '../../api/passportApi';
import './gamification.css';

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
      if (g.status === 'fulfilled') setSummary(g.value);
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
  const levelProgress = Math.max(0, Math.min(100, summary?.level?.pct ?? 0));
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

  return <div className="gam">
    <header className="gam-hd"><div><span className="gam-eyebrow"><i className="bi bi-stars" /> Coins & Rewards</span><h1>Progress that keeps you moving.</h1><p>Track your XP, coins, streaks, achievements and verified CareerPilot rankings.</p></div></header>

    <section className="gam-hero-new">
      <div className="gam-level-badge"><i className="bi bi-star-fill"/><strong>{summary.level?.level ?? 1}</strong><span>Level</span></div>
      <div className="gam-level-main"><h2>Level {summary.level?.level ?? 1}</h2><h3>{summary.level?.title || 'Career Builder'} <i className="bi bi-patch-check-fill"/></h3><p>Keep completing meaningful career activities to reach your next level.</p><div className="gam-xp-line"><b>{summary.xp.toLocaleString()} XP</b><span>{levelProgress}%</span></div><div className="gam-level-progress"><span style={{width:`${levelProgress}%`}}/></div><small>Next: Level {summary.level?.nextLevel ?? ((summary.level?.level ?? 1)+1)} · {summary.level?.nextTitle || 'Next level'}</small></div>
      <div className="gam-hero-wallet"><div><span className="coin-ico"><i className="bi bi-coin"/></span><small>CareerPilot Coins</small><b>{Number(coins).toLocaleString()}</b></div><button onClick={()=>nav('/careerpilot/rewards')}>View Rewards Store</button><div className="gam-lifetime"><i className="bi bi-award"/><span><small>Lifetime XP</small><b>{summary.xp.toLocaleString()}</b></span></div></div>
    </section>

    <div className="gam-five-metrics">
      <div className="gam-metric"><span className="gam-mi orange"><i className="bi bi-fire"/></span><small>Current Streak</small><b>{summary.streak}</b><em>days · Best {summary.longestStreak}</em></div>
      <div className="gam-metric"><span className="gam-mi teal"><i className="bi bi-lightning-charge"/></span><small>Total XP</small><b>{summary.xp.toLocaleString()}</b><em>activity earned</em></div>
      <div className="gam-metric"><span className="gam-mi purple"><i className="bi bi-award"/></span><small>Badges Earned</small><b>{earned.length}</b><em>of {summary.badges.length} badges</em></div>
      <div className="gam-metric"><span className="gam-mi orange"><i className="bi bi-trophy"/></span><small>College Rank</small><b>{collegeRank?.available&&collegeRank.rank?`#${collegeRank.rank}`:'—'}</b><em>{collegeRank?.available&&collegeRank.participants?`of ${collegeRank.participants}`:'Not available'}</em></div>
      <div className="gam-metric"><span className="gam-mi blue"><i className="bi bi-globe2"/></span><small>Global Rank</small><b>{globalRank?.available&&globalRank.rank?`#${globalRank.rank}`:'—'}</b><em>{globalRank?.available&&globalRank.participants?`of ${globalRank.participants}`:'Not available'}</em></div>
    </div>

    <div className="gam-split">
      <section className="gam-card gam-next"><div className="gam-card-hd"><div><h3><i className="bi bi-flag"/> Next Milestone</h3></div></div>{nextMilestone?<><div className="gam-next-body"><div className="gam-next-orb">{nextMilestone}</div><div><b>{nextMilestone}-Day Consistency</b><p>{nextMilestone-summary.streak} more day{nextMilestone-summary.streak===1?'':'s'} to unlock your next streak milestone.</p></div></div><div className="gam-mile-bar"><span style={{width:`${milestonePct}%`}}/></div><div className="gam-mile-label"><span>{summary.streak} days</span><span>{nextMilestone} days</span></div></>:<div className="gam-empty">You have reached every current streak milestone.</div>}</section>
      <section className="gam-card"><div className="gam-card-hd"><div><h3><i className="bi bi-shield-check"/> Ranking Scope (Verified)</h3></div></div><div className="gam-scope-strip"><button className={scope==='COLLEGE'?'on':''} onClick={()=>setScope('COLLEGE')}>College</button><button className={scope==='GLOBAL'?'on':''} onClick={()=>setScope('GLOBAL')}>Global</button><button disabled>District</button><button disabled>State</button></div><div className="gam-verified"><i className="bi bi-check-circle"/> Rankings use verified CareerPilot activity and real XP.</div><small className="gam-coming">District and State rankings are not available yet.</small></section>
    </div>

    <div className="gam-split gam-lower">
      <section className="gam-card"><div className="gam-card-hd"><div><h3>Recent Achievements</h3></div>{summary.badges.length>4&&<button onClick={()=>setShowAllBadges(v=>!v)}>{showAllBadges?'Show fewer':'View all'} →</button>}</div>{shownBadges.length?<div className="gam-ach-list">{shownBadges.map(b=><div className={`gam-ach ${b.earned?'':'locked'}`} key={b.key}><span><i className={`bi ${b.earned?b.iconKey:'bi-lock-fill'}`}/></span><div><b>{b.name}</b><small>{b.description}</small></div><em>{b.earned?'Earned':'Locked'}</em></div>)}</div>:<div className="gam-empty">Complete your first mission to earn a badge.</div>}</section>
      <section className="gam-card"><div className="gam-board-top"><div><h3>Leaderboard</h3><span>Based only on CareerPilot XP activity</span></div><button className="gam-link" onClick={()=>nav('/careerpilot/leaderboard')}>View full leaderboard →</button></div><div className="gam-tabs gam-periods">{PERIODS.map(p=><button key={p.key} className={period===p.key?'on':''} onClick={()=>setPeriod(p.key)}>{p.label}</button>)}</div>{boardLoading?<div className="gam-load">Loading leaderboard…</div>:!board?<div className="gam-empty">Could not load leaderboard.</div>:!board.available?<div className="gam-note warn">{(board as any).reason}</div>:<><div className="gam-mine"><span>{board.myRank?<>You are <b>#{board.myRank}</b> of {board.participantCount.toLocaleString()}</>:<>Earn XP to join this leaderboard</>}</span><b>{board.myXp.toLocaleString()} XP</b></div><div className="gam-rows">{board.entries.slice(0,5).map((r:ScopedLeaderboardRow)=><div className={`gam-row${r.me?' me':''}`} key={r.studentId}><span className="gam-rn">#{r.rank}</span><span className="gam-avatar">{(r.name?.[0]||'?').toUpperCase()}</span><div className="gam-who"><b>{r.name}{r.me?' (You)':''}</b>{r.college&&<em>{r.college}</em>}</div><span className="gam-row-xp">{r.xp.toLocaleString()} XP</span></div>)}</div></>}</section>
    </div>

    <section className="gam-card gam-earn"><h3>Ways to Earn XP</h3><div className="gam-earn-grid"><button onClick={()=>nav('/careerpilot/practice')}><i className="bi bi-code-square"/><b>Practice Questions</b><span>Build skill evidence</span></button><button onClick={()=>nav('/careerpilot/mock-interview')}><i className="bi bi-mic"/><b>Mock Interviews</b><span>Practice interview skills</span></button><button onClick={()=>nav('/careerpilot/missions')}><i className="bi bi-bullseye"/><b>Daily Missions</b><span>Complete career actions</span></button><button onClick={()=>nav('/careerpilot/roadmap')}><i className="bi bi-map"/><b>Learn & Improve</b><span>Follow your roadmap</span></button><button onClick={()=>nav('/careerpilot/skill-assessment')}><i className="bi bi-clipboard-check"/><b>Assessments</b><span>Measure your progress</span></button></div></section>
    <footer className="gam-reminder"><div><i className="bi bi-lightbulb"/><span><b>Remember: XP shows your activity, not your skill readiness.</b><small>Keep learning consistently and build real skills with CareerPilot.</small></span></div><button onClick={()=>nav('/careerpilot/missions')}><i className="bi bi-rocket-takeoff"/> Start a Mission</button></footer>
  </div>;
};
export default Gamification;
