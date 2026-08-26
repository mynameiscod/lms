import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import passportApi, { PracticeListItem } from '../../api/passportApi';
import PassportShell, { LockedPanel } from './PassportShell';

const KINDS: { key: string; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'coding', label: '💻 Coding' },
  { key: 'sql', label: '🗄️ SQL' },
  { key: 'mcq', label: '📝 MCQ Sets' },
];

const CAT_LABEL: Record<string, string> = {
  technical: 'Technical', aptitude: 'Aptitude', logical_reasoning: 'Reasoning',
  communication: 'Communication', employability: 'Employability', career_clarity: 'Career Clarity',
};

/** Practice Lab — the `practice` entitlement. Coding + SQL run on the same self-hosted
 *  Piston the LMS uses; MCQ sets grade instantly. Never leaves /passport. */
const Practice: React.FC = () => {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const kind = params.get('kind') || '';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await passportApi.listPractice(kind ? { kind } : {})); } catch { /* ignore */ }
    setLoading(false);
  }, [kind]);

  useEffect(() => { load(); }, [load]);

  const unlock = async () => {
    setPaying(true);
    const res = await passportApi.membershipCheckout();
    setPaying(false);
    if (res.ok) load();
  };

  if (loading && !data) return <PassportShell><div className="pm-loading">Loading the Practice Lab…</div></PassportShell>;

  if (data?.locked) {
    return (
      <PassportShell>
        <LockedPanel
          title="Practice Lab is part of your membership"
          blurb="Real coding problems that compile and run, SQL against a live database, and timed aptitude sets — all scored instantly and all counting toward your XP."
          priceInr={data.priceInr}
          busy={paying}
          onUnlock={unlock}
        />
      </PassportShell>
    );
  }

  const problems: PracticeListItem[] = data?.problems || [];
  const solved: string[] = data?.solved || [];

  return (
    <PassportShell
      meta={
        <>
          <span className="pm-pill"><i>✅</i><b>{solved.length}</b> solved</span>
          <span className="pm-pill"><i>⭐</i><b>{data?.xp ?? 0}</b> XP</span>
        </>
      }
    >
      <div className="pm-head">
        <h1>Practice Lab</h1>
        <p>Your code actually compiles and runs here — same engine your assessments use. Solve a problem for the first time and its XP is added to your journey.</p>
      </div>

      <div className="pr-filters">
        {KINDS.map(k => (
          <button
            key={k.key}
            className={`pr-chip${kind === k.key ? ' on' : ''}`}
            onClick={() => { if (k.key) setParams({ kind: k.key }); else setParams({}); }}
          >
            {k.label}
          </button>
        ))}
      </div>

      {!problems.length ? (
        <div className="pm-empty">No problems in this category yet.</div>
      ) : (
        <div className="pr-grid">
          {problems.map(p => (
            <button key={p.id} className="pr-item" onClick={() => nav(`/careerpilot/practice/${p.id}`)}>
              <div className="top">
                <span className={`kind ${p.kind}`}>{p.kind}</span>
                <span className={`pr-diff d-${p.difficulty}`}>{p.difficulty}</span>
                {/* `solved` comes from the attempt row; the older solved[] list still covers
                    problems finished before attempts were recorded, so both are consulted. */}
                {(p.solved || solved.includes(p.id)) && <span className="solved">✓ Solved</span>}
              </div>
              <h3>{p.title}</h3>
              <div className="meta">
                <span>{CAT_LABEL[p.category] || p.category}</span>
                <span>· {p.count} {p.kind === 'mcq' ? 'questions' : 'tests'}</span>
                <span>· +{p.xp} XP</span>
                {p.estimatedMinutes ? <span>· ~{p.estimatedMinutes} min</span> : null}
              </div>
              {/* Progress, only once there is some. A row of zeroes on an untouched problem
                  reads as failure rather than as "not started". */}
              {(p.attempts || p.testsTotal || p.solvedCount) ? (
                <div className="pr-progress">
                  {p.testsTotal ? (
                    <span className={`pr-tests${p.testsPassed === p.testsTotal ? ' all' : ''}`}>
                      {p.testsPassed}/{p.testsTotal} tests
                    </span>
                  ) : null}
                  {p.attempts ? <span>· {p.attempts} attempt{p.attempts === 1 ? '' : 's'}</span> : null}
                  {p.solvedCount ? <span>· {p.solvedCount} solved this</span> : null}
                </div>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </PassportShell>
  );
};

export default Practice;
