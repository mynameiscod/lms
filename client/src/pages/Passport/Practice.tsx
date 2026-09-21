import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import passportApi, { PracticeListItem } from '../../api/passportApi';
import PassportShell from './PassportShell';
import SectionLock from './SectionLock';
import './practiceLab.css';

const KINDS: { key: string; label: string; icon: string }[] = [
  { key: '', label: 'All', icon: 'bi-grid' },
  { key: 'coding', label: 'Coding', icon: 'bi-code-slash' },
  { key: 'sql', label: 'SQL', icon: 'bi-database' },
  { key: 'mcq', label: 'MCQ Sets', icon: 'bi-ui-checks-grid' },
];

/* Easiest first, whatever order the server happened to send the problems in. Anything the admin
   names outside these three still shows — it simply sits after them. */
const DIFF_RANK: Record<string, number> = { easy: 1, medium: 2, hard: 3 };

const CAT_LABEL: Record<string, string> = {
  technical: 'Technical', aptitude: 'Aptitude', logical_reasoning: 'Reasoning',
  communication: 'Communication', employability: 'Employability', career_clarity: 'Career Clarity',
};

interface PracticeProps {
  source?: 'all' | 'builtin' | 'bank';
  heading?: string;
  blurb?: string;
}

const Practice: React.FC<PracticeProps> = ({ source = 'all', heading, blurb }) => {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const kind = params.get('kind') || '';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // Narrowing within what the server sent: by words, difficulty and whether it is done yet.
  const [query, setQuery] = useState('');
  const [diff, setDiff] = useState('');
  const [status, setStatus] = useState<'' | 'todo' | 'solved'>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await passportApi.listPractice({
        ...(kind ? { kind } : {}),
        ...(source !== 'all' ? { source } : {}),
      }));
    } catch { /* keep current state */ }
    setLoading(false);
  }, [kind, source]);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) return <PassportShell><div className="pm-loading">Loading the Practice Lab…</div></PassportShell>;

  if (data?.locked) {
    return (
      <PassportShell>
        {/* The problem count comes back even while locked, so the lock can say how much is
            actually waiting rather than describing the feature in the abstract. */}
        <SectionLock
          section="practice"
          blurb="Real coding problems that compile and run, SQL against a live database, and timed aptitude sets — all scored instantly."
          facts={(data.problems || []).length
            ? [{ value: (data.problems || []).length, label: 'problems ready for you' }]
            : undefined}
        />
      </PassportShell>
    );
  }

  const problems: PracticeListItem[] = data?.problems || [];
  const solved: string[] = data?.solved || [];
  const isThinkingLab = source === 'bank';
  const isSolved = (p: PracticeListItem) => !!(p.solved || solved.includes(p.id));
  const solvedHere = problems.filter(isSolved).length;
  const xpAvailable = problems.filter(p => !isSolved(p)).reduce((t, p) => t + (p.xp || 0), 0);
  const pct = problems.length ? Math.round((solvedHere / problems.length) * 100) : 0;
  const diffs = Array.from(new Set(problems.map(p => String(p.difficulty || '').toLowerCase()).filter(Boolean)));

  /* A level is behind the member once nothing is left in it; the first level with work left is
     where they stand. Read off the same list the cards below are drawn from, so the two agree. */
  const levels = diffs
    .slice()
    .sort((a, b) => (DIFF_RANK[a] || 9) - (DIFF_RANK[b] || 9))
    .map(d => {
      const at = problems.filter(p => String(p.difficulty || '').toLowerCase() === d);
      return { key: d, label: d[0].toUpperCase() + d.slice(1), done: at.filter(isSolved).length, total: at.length };
    });
  const currentLevel = levels.findIndex(l => l.done < l.total);
  /* One tap, no hunting through the grid: the first problem this member has not solved. */
  const nextProblem = problems.find(p => !isSolved(p)) || null;

  const q = query.trim().toLowerCase();
  const shown = problems.filter(p =>
    (!q || [p.title, CAT_LABEL[p.category] || p.category || '', p.kind, p.difficulty].join(' ').toLowerCase().includes(q))
    && (!diff || String(p.difficulty || '').toLowerCase() === diff)
    && (!status || (status === 'solved' ? isSolved(p) : !isSolved(p))));

  return (
    <PassportShell>
      <div className="pl2">
        <section className="pl2-hero">
          <div className="pl2-hero-copy">
            <span className="pl2-eyebrow">{isThinkingLab ? 'Thinking Lab' : 'Practice Lab'}</span>
            <h1>{heading || <>Practice <span>Lab</span></>}</h1>
            <p>{blurb || 'Your code actually compiles and runs here — the same engine your assessments use. Solve a problem for the first time and its XP is added to your journey.'}</p>
            <div className="pl2-chips">
              <span><i className="bi bi-collection" /> {problems.length} {kind ? KINDS.find(k => k.key === kind)?.label : 'problems'}</span>
              <span><i className="bi bi-check2-circle" /> {solved.length} solved</span>
              <span><i className="bi bi-lightning-charge-fill" /> {data?.xp ?? 0} XP total</span>
            </div>
          </div>
          {/* The middle of the banner is this member's own practice record, not decoration: how far
              through the list they are, which levels are behind them, and the problem to open next. */}
          {!!problems.length && (
            <div className="pl2-momentum">
              <span className="pl2-eyebrow">Your progress</span>
              <div className={`pl2-strip${solvedHere > 0 ? ' on' : ''}`}>
                <span className="ic"><i className="bi bi-check2-circle" aria-hidden="true" /></span>
                <div>
                  <b>{solvedHere} of {problems.length} solved</b>
                  <span>{problems.length - solvedHere > 0
                    ? `${problems.length - solvedHere} still to go — a first solve pays its XP.`
                    : 'Every problem here is solved. Well done.'}</span>
                  <i className="pl2-strip-bar" aria-hidden="true"><em style={{ width: `${Math.max(solvedHere > 0 ? 4 : 0, pct)}%` }} /></i>
                </div>
              </div>
              {levels.length > 1 && (
                <ol className="pl2-steps2">
                  {levels.map((l, i) => (
                    <li key={l.key} className={l.done >= l.total ? 'done' : i === currentLevel ? 'current' : ''}>
                      <i /><span>{l.label} {l.done}/{l.total}</span>
                    </li>
                  ))}
                </ol>
              )}
              {nextProblem && (
                <button type="button" className="pl2-next" onClick={() => nav(`/careerpilot/practice/${nextProblem.id}`)}>
                  <span className="ic"><i className="bi bi-play-fill" aria-hidden="true" /></span>
                  <div>
                    <b>Next up</b>
                    <span>{nextProblem.title}</span>
                    <em>{[nextProblem.difficulty, nextProblem.xp ? `+${nextProblem.xp} XP` : ''].filter(Boolean).join(' · ')}</em>
                  </div>
                  <i className="bi bi-chevron-right" aria-hidden="true" />
                </button>
              )}
            </div>
          )}
          <div className="pl2-score">
            <div className="pl2-ring" style={{ ['--pl2-deg' as any]: `${pct * 3.6}deg` }}>
              <div><strong>{solvedHere}<em>/{problems.length}</em></strong><span>solved</span></div>
            </div>
            <div className="pl2-score-copy">
              <small>Still to earn</small>
              <b>+{xpAvailable} XP</b>
              <span>from the problems you have not solved yet</span>
            </div>
          </div>
        </section>

        {/* The Thinking Lab is one bank of mentor-set problems — it has no coding/SQL/MCQ split, so it
            shows the search on the left and the two filters on the right instead of category tabs. */}
        <section className={`pl2-tools${isThinkingLab ? ' solo' : ''}`}>
          {!isThinkingLab && <div className="pl2-tabs" role="tablist" aria-label="Practice type">
            {KINDS.map(k => (
              <button key={k.key} role="tab" aria-selected={kind === k.key} className={kind === k.key ? 'on' : ''}
                      onClick={() => { if (k.key) setParams({ kind: k.key }); else setParams({}); }}>
                <i className={`bi ${k.icon}`} aria-hidden="true" /> {k.label}
              </button>
            ))}
          </div>}
          <div className="pl2-filters">
            <label className="pl2-search"><i className="bi bi-search" aria-hidden="true" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search problems" aria-label="Search problems" />
            </label>
            <select value={diff} onChange={e => setDiff(e.target.value)} aria-label="Difficulty">
              <option value="">Any difficulty</option>
              {diffs.map(d => <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>)}
            </select>
            <select value={status} onChange={e => setStatus(e.target.value as any)} aria-label="Status">
              <option value="">All problems</option>
              <option value="todo">To do</option>
              <option value="solved">Solved</option>
            </select>
          </div>
        </section>

        {!problems.length ? (
          <div className="pl2-empty"><i className="bi bi-inbox" aria-hidden="true" /> No problems in this category yet.</div>
        ) : !shown.length ? (
          <div className="pl2-empty"><i className="bi bi-search" aria-hidden="true" /> Nothing matches those filters.
            <button type="button" onClick={() => { setQuery(''); setDiff(''); setStatus(''); }}>Clear filters</button></div>
        ) : (
          <div className="pl2-grid">
            {shown.map(p => {
              const done = isSolved(p);
              const d = String(p.difficulty || '').toLowerCase();
              return (
                <button key={p.id} className={`pl2-card k-${p.kind}${done ? ' done' : ''}`} onClick={() => nav(`/careerpilot/practice/${p.id}`)}>
                  <div className="pl2-card-top">
                    <span className="pl2-kind"><i className={`bi ${p.kind === 'coding' ? 'bi-code-slash' : p.kind === 'sql' ? 'bi-database' : 'bi-ui-checks-grid'}`} aria-hidden="true" /></span>
                    <span className={`pl2-diff d-${d}`}>{p.difficulty}</span>
                    {done && <span className="pl2-solved"><i className="bi bi-check-circle-fill" aria-hidden="true" /> Solved</span>}
                  </div>
                  <h3>{p.title}</h3>
                  <div className="pl2-meta">
                    <span>{CAT_LABEL[p.category] || p.category}</span>
                    <span><i className="bi bi-list-check" aria-hidden="true" /> {p.count} {p.kind === 'mcq' ? (p.count === 1 ? 'question' : 'questions') : (p.count === 1 ? 'test' : 'tests')}</span>
                    {p.estimatedMinutes ? <span><i className="bi bi-clock" aria-hidden="true" /> ~{p.estimatedMinutes} min</span> : null}
                  </div>
                  {p.testsTotal ? (
                    <div className="pl2-tests" aria-label={`${p.testsPassed || 0} of ${p.testsTotal} tests passed`}>
                      <i style={{ width: `${Math.round(((p.testsPassed || 0) / p.testsTotal) * 100)}%` }} />
                    </div>
                  ) : null}
                  <div className="pl2-card-foot">
                    <span className="pl2-xp">+{p.xp} XP</span>
                    <span className="pl2-go">
                      {p.attempts ? `${p.attempts} attempt${p.attempts === 1 ? '' : 's'} · ` : ''}{done ? 'Review' : p.attempts ? 'Continue' : 'Solve'} <i className="bi bi-arrow-right" aria-hidden="true" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </PassportShell>
  );
};

export default Practice;
