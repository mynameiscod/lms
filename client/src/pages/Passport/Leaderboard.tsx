import React, { useEffect, useState } from 'react';
import passportApi, { GamificationSummary, ScopedLeaderboardResponse, ScopedLeaderboardRow } from '../../api/passportApi';
import PassportShell from './PassportShell';
import './leaderboard.css';

/**
 * The XP leaderboard: a GLOBAL rank for every CareerPilot member in every tenant, and a COLLEGE rank
 * for members of a college tenant. Both count every registered member, so "#12 of 340" means 340
 * students, not 340 who happened to earn XP this week.
 *
 * The member's own row is pinned under the list when they sit outside it, so the page always answers
 * "where am I?" without scrolling.
 */

const PERIODS = [{ k: 'ALL_TIME', l: 'All time' }, { k: 'MONTHLY', l: 'This month' }, { k: 'WEEKLY', l: 'This week' }];
const n = (v: number) => (v || 0).toLocaleString('en-IN');

const Leaderboard: React.FC = () => {
  const [me, setMe] = useState<GamificationSummary | null>(null);
  const [scope, setScope] = useState<'GLOBAL' | 'COLLEGE'>('GLOBAL');
  const [period, setPeriod] = useState('ALL_TIME');
  const [board, setBoard] = useState<ScopedLeaderboardResponse | null>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');
  /** Rows shown; the board loads the top 100 and shows them 25 at a time. */
  const [shown, setShown] = useState(25);

  useEffect(() => {
    passportApi.getMyGamification().then(setMe).catch(() => { /* the rank cards stay empty; the board still loads */ });
  }, []);

  useEffect(() => {
    let live = true;
    setBusy(true); setErr(''); setShown(25);
    passportApi.getMyLeaderboard(scope, period, 100)
      .then(b => { if (live) setBoard(b); })
      .catch(e => { if (live) { setBoard(null); setErr(e?.response?.data?.message || 'Could not load the leaderboard.'); } })
      .finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, [scope, period]);

  const college = me?.ranks?.college;
  const global = me?.ranks?.global;
  const hasCollege = !!college?.available;
  const ok = board && board.available ? board : null;
  const all: ScopedLeaderboardRow[] = ok?.entries || [];
  const rows = all.slice(0, shown);
  const meVisible = rows.some(r => r.me);
  const top = (rank: number) => (rank <= 3 ? ` top t${rank}` : '');

  return (
    <PassportShell>
      <div className="lbx">
        <header className="lbx-head">
          <span className="lbx-kicker"><i className="bi bi-bar-chart-steps" /> CareerPilot leaderboard</span>
          <h1>Leaderboard</h1>
          <p>Ranked by XP. Your global rank counts every CareerPilot student{hasCollege ? '; your college rank counts your classmates' : ''}.</p>
        </header>

        <section className="lbx-ranks">
          <button type="button" className={`lbx-rank${scope === 'GLOBAL' ? ' on' : ''}`} onClick={() => setScope('GLOBAL')}>
            <span className="ic g"><i className="bi bi-globe2" /></span>
            <span><small>Global rank</small><b>{global?.rank ? `#${n(global.rank)}` : '—'}</b><em>{global?.participants ? `of ${n(global.participants)} students` : 'All CareerPilot students'}</em></span>
          </button>
          {hasCollege && <button type="button" className={`lbx-rank${scope === 'COLLEGE' ? ' on' : ''}`} onClick={() => setScope('COLLEGE')}>
            <span className="ic c"><i className="bi bi-building" /></span>
            <span><small>College rank</small><b>{college?.rank ? `#${n(college.rank)}` : '—'}</b><em>{college?.participants ? `of ${n(college.participants)} students` : 'Your college'}</em></span>
          </button>}
          <div className="lbx-rank plain">
            <span className="ic x"><i className="bi bi-lightning-charge-fill" /></span>
            <span><small>Your XP</small><b>{n(me?.xp || 0)}</b><em>{me ? `Level ${me.level?.level ?? ''} · ${me.streak} day streak` : ' '}</em></span>
          </div>
        </section>

        <section className="lbx-card">
          <div className="lbx-bar">
            {hasCollege
              ? <div className="lbx-seg" role="tablist" aria-label="Board">
                {(['COLLEGE', 'GLOBAL'] as const).map(k => <button key={k} type="button" role="tab" aria-selected={scope === k} className={scope === k ? 'on' : ''} onClick={() => setScope(k)}>
                  <i className={`bi ${k === 'GLOBAL' ? 'bi-globe2' : 'bi-building'}`} /> {k === 'GLOBAL' ? 'Global' : 'College'}</button>)}
              </div>
              : <b className="lbx-title"><i className="bi bi-globe2" /> Global</b>}
            <div className="lbx-seg" role="tablist" aria-label="Period">
              {PERIODS.map(p => <button key={p.k} type="button" role="tab" aria-selected={period === p.k} className={period === p.k ? 'on' : ''} onClick={() => setPeriod(p.k)}>{p.l}</button>)}
            </div>
          </div>

          {/* Where the member stands on THIS board and period — it moves with the filters above. */}
          {ok && <div className="lbx-you">
            <span className="ic"><i className={`bi ${scope === 'COLLEGE' ? 'bi-building' : 'bi-globe2'}`} /></span>
            <div className="rh-t">
              <small>Your {scope === 'COLLEGE' ? 'college' : 'global'} rank · {PERIODS.find(p => p.k === period)?.l}</small>
              <b>{ok.myRank ? `#${n(ok.myRank)}` : '—'}</b>
              <span>of {n(ok.participantCount)} students{scope === 'GLOBAL' ? ' across CareerPilot' : ' in your college'}</span>
            </div>
            <div className="xp"><b>{n(ok.myXp)}</b><small>XP{period === 'ALL_TIME' ? '' : period === 'MONTHLY' ? ' this month' : ' this week'}</small></div>
          </div>}

          {busy && !board ? <div className="lbx-empty">Loading the leaderboard…</div>
            : err ? <div className="lbx-empty err">{err}</div>
            : board && !board.available ? <div className="lbx-empty">{(board as any).reason}</div>
            : !all.length ? <div className="lbx-empty"><i className="bi bi-trophy" /> Nobody has earned XP {period === 'WEEKLY' ? 'this week' : period === 'MONTHLY' ? 'this month' : ''} yet. Finish a task to be first.</div>
            : <ol className={`lbx-list${busy ? ' busy' : ''}`}>
              {rows.map(r => <Row key={r.studentId} r={r} cls={top(r.rank)} />)}
              {!meVisible && ok?.myRank && <>
                <li className="lbx-gap" aria-hidden>⋯</li>
                <Row r={{ rank: ok.myRank, studentId: 'me', name: 'You', college: null, xp: ok.myXp, me: true }} cls="" />
              </>}
            </ol>}
          {all.length > shown && <button type="button" className="lbx-more" onClick={() => setShown(v => v + 25)}>
            Show more <span>{Math.min(25, all.length - shown)} of {all.length - shown} more</span></button>}
        </section>
        <p className="lbx-note"><i className="bi bi-info-circle" /> XP shows how consistently you work, not your skill level. Students at other institutions are shown by first name and initial.</p>
      </div>
    </PassportShell>
  );
};

const Row: React.FC<{ r: ScopedLeaderboardRow; cls: string }> = ({ r, cls }) => (
  <li className={`lbx-row${r.me ? ' me' : ''}${cls}`}>
    <span className="rk">{r.rank <= 3 ? <i className="bi bi-trophy-fill" /> : null}{r.rank.toLocaleString('en-IN')}</span>
    <span className="av">{(r.name?.[0] || '?').toUpperCase()}</span>
    <span className="nm"><b>{r.name}{r.me && r.name !== 'You' ? ' (you)' : ''}</b>{r.college && <small>{r.college}</small>}</span>
    <b className="xp">{r.xp.toLocaleString('en-IN')} <small>XP</small></b>
  </li>
);

export default Leaderboard;
