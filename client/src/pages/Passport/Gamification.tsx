import React, { useCallback, useEffect, useState } from 'react';
import passportApi, {
  GamificationSummary, ScopedLeaderboardResponse, ScopedLeaderboardRow,
} from '../../api/passportApi';
import './gamification.css';

/**
 * Progress, streak, badges and rank.
 *
 * THIS IS ENGAGEMENT, NOT ABILITY. Everything here says how much somebody has shown up and
 * how much they have done. None of it says what they can do — that lives on the skills and
 * readiness screens, measured from evidence, and the copy is careful never to blur the two.
 *
 * XP IS NOT MONEY. It is labelled as an engagement score and never shown beside a rupee
 * value or a coin balance in a way that implies conversion, because there is none.
 *
 * IT DOES NOT INVENT A RANK. Where the data cannot support a ranking — district and state
 * have no verified source in this product — the card says so instead of showing a number.
 * A fabricated "#0" or a guessed position is worse than an honest gap.
 */

const PERIODS: { key: string; label: string }[] = [
  { key: 'ALL_TIME', label: 'All time' },
  { key: 'MONTHLY', label: 'This month' },
  { key: 'WEEKLY', label: 'This week' },
];

const SCOPES: { key: string; label: string }[] = [
  { key: 'COLLEGE', label: 'My college' },
  { key: 'GLOBAL', label: 'Global' },
];

const RANK_LABEL: Record<string, string> = {
  college: 'College', global: 'Global', district: 'District', state: 'State',
};

const Gamification: React.FC = () => {
  const [summary, setSummary] = useState<GamificationSummary | null>(null);
  const [board, setBoard] = useState<ScopedLeaderboardResponse | null>(null);
  const [scope, setScope] = useState('COLLEGE');
  const [period, setPeriod] = useState('ALL_TIME');
  const [loading, setLoading] = useState(true);
  const [boardLoading, setBoardLoading] = useState(false);
  const [showAllBadges, setShowAllBadges] = useState(false);

  useEffect(() => {
    passportApi.getMyGamification()
      .then(setSummary)
      .catch(() => { /* the page still renders the leaderboard */ })
      .finally(() => setLoading(false));
  }, []);

  const loadBoard = useCallback(async () => {
    setBoardLoading(true);
    try { setBoard(await passportApi.getMyLeaderboard(scope, period)); }
    catch { setBoard(null); }
    setBoardLoading(false);
  }, [scope, period]);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  if (loading) return <div className="gam"><div className="gam-load">Loading your progress…</div></div>;

  const earned = summary?.badges.filter(b => b.earned) || [];
  const locked = summary?.badges.filter(b => !b.earned) || [];
  const shownBadges = showAllBadges ? [...earned, ...locked] : earned.slice(0, 6);

  // The nearest streak milestone, phrased as something to reach rather than something to
  // lose. "Keep going or you'll lose your streak" is a threat, and threats do not motivate.
  const nextMilestone = summary && [7, 30].find(d => d > summary.streak);

  return (
    <div className="gam">
      <div className="gam-hd">
        <h1>Your progress</h1>
        <p>
          How much you have engaged with CareerPilot. This is separate from your skills —
          what you can do is measured by your assessments, not by points.
        </p>
      </div>

      {summary && (
        <>
          <div className="gam-top">
            <div className="fig main">
              <b>{summary.xp.toLocaleString()}</b>
              <span>XP</span>
              <em>Engagement score</em>
            </div>
            <div className="fig">
              <b>🔥 {summary.streak}</b>
              <span>Day streak</span>
              <em>Longest: {summary.longestStreak}</em>
            </div>
            <div className="fig">
              <b>{summary.level?.level ?? 1}</b>
              <span>{summary.level?.title || 'Level'}</span>
              <em>Next: {summary.level?.nextTitle || '—'}</em>
            </div>
          </div>

          {nextMilestone && (
            <div className="gam-note">
              {nextMilestone - summary.streak} more day
              {nextMilestone - summary.streak === 1 ? '' : 's'} to your {nextMilestone}-day streak badge.
            </div>
          )}

          {/* Ranks, including the ones we cannot honestly provide. */}
          <div className="gam-ranks">
            {Object.entries(summary.ranks || {}).map(([key, r]) => (
              <div className={`rk${r.available ? '' : ' off'}`} key={key}>
                <span className="lb">{RANK_LABEL[key] || key}</span>
                {r.available && r.rank ? (
                  <b>#{r.rank.toLocaleString()}</b>
                ) : (
                  <b className="na">—</b>
                )}
                {!r.available && <em title={r.reason}>Not available</em>}
                {r.available && r.participants ? <em>of {r.participants.toLocaleString()}</em> : null}
              </div>
            ))}
          </div>

          <div className="gam-badges">
            <div className="bh">
              <b>Badges</b>
              <span>{earned.length} of {summary.badges.length} earned</span>
              {summary.badges.length > 6 && (
                <button className="gam-link" onClick={() => setShowAllBadges(v => !v)}>
                  {showAllBadges ? 'Show fewer' : 'View all'}
                </button>
              )}
            </div>
            {shownBadges.length === 0 ? (
              <p className="gam-empty">Complete your first mission to earn your first badge.</p>
            ) : (
              <div className="bl">
                {shownBadges.map(b => (
                  <div className={`bg${b.earned ? ' on' : ''}`} key={b.key} title={b.description}>
                    <i className={`bi ${b.iconKey}`} />
                    <span>{b.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── leaderboard ── */}
      <div className="gam-board">
        <div className="tabs">
          {SCOPES.map(s => (
            <button key={s.key} className={scope === s.key ? 'on' : ''} onClick={() => setScope(s.key)}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="tabs sub">
          {PERIODS.map(p => (
            <button key={p.key} className={period === p.key ? 'on' : ''} onClick={() => setPeriod(p.key)}>
              {p.label}
            </button>
          ))}
        </div>

        {boardLoading ? (
          <div className="gam-load">Loading…</div>
        ) : !board ? (
          <div className="gam-empty">Could not load the leaderboard.</div>
        ) : !board.available ? (
          // Narrowed explicitly rather than by discriminant — this tsconfig does not narrow
          // the union, the same way readiness and the roadmap have to cast.
          <div className="gam-note warn">{(board as { reason: string }).reason}</div>
        ) : (
          <>
            <div className="mine">
              <span>
                {board.myRank
                  ? <>You are <b>#{board.myRank.toLocaleString()}</b> of {board.participantCount.toLocaleString()}</>
                  : <>Earn some XP to join this leaderboard</>}
              </span>
              <em>{board.myXp.toLocaleString()} XP</em>
            </div>

            <div className="rows">
              {board.entries.map((r: ScopedLeaderboardRow) => (
                <div className={`row${r.me ? ' me' : ''}`} key={r.studentId}>
                  <span className="rn">#{r.rank}</span>
                  <div className="who">
                    <b>{r.name}{r.me ? ' (you)' : ''}</b>
                    {r.college && <em>{r.college}</em>}
                  </div>
                  <span className="xp">{r.xp.toLocaleString()}</span>
                </div>
              ))}
              {!board.entries.length && <p className="gam-empty">Nobody has earned XP here yet.</p>}
            </div>
          </>
        )}
      </div>

      <p className="gam-foot">
        Ranking is based on XP earned through CareerPilot activity. It does not reflect your
        skill level or how ready you are for a role.
      </p>
    </div>
  );
};

export default Gamification;
