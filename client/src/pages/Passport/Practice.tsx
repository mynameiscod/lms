import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import passportApi, { PracticeListItem } from '../../api/passportApi';
import PassportShell, { LockedPanel } from './PassportShell';

const KINDS: { key: string; label: string; icon: string }[] = [
  { key: '', label: 'All', icon: 'bi-grid' },
  { key: 'coding', label: 'Coding', icon: 'bi-code-slash' },
  { key: 'sql', label: 'SQL', icon: 'bi-database' },
  { key: 'mcq', label: 'MCQ Sets', icon: 'bi-ui-checks-grid' },
];

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
  const [paying, setPaying] = useState(false);

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
  const isThinkingLab = source === 'bank';

  return (
    <PassportShell
      meta={
        <>
          <span className="pm-pill"><i className="bi bi-check-circle" aria-hidden="true" /><b>{solved.length}</b> solved</span>
          <span className="pm-pill"><i className="bi bi-lightning-charge" aria-hidden="true" /><b>{data?.xp ?? 0}</b> XP</span>
        </>
      }
    >
      <div className="pm-head">
        <span className={`cb-icon-chip ${isThinkingLab ? 'teal' : ''}`} aria-hidden="true"><i className={`bi ${isThinkingLab ? 'bi-lightbulb' : 'bi-code-square'}`} /></span>
        <h1>{heading || 'Practice Lab'}</h1>
        <p>{blurb || 'Your code actually compiles and runs here — same engine your assessments use. Solve a problem for the first time and its XP is added to your journey.'}</p>
      </div>

      <div className="pr-filters" aria-label="Practice type filters">
        {KINDS.map(k => (
          <button
            key={k.key}
            className={`pr-chip${kind === k.key ? ' on' : ''}`}
            onClick={() => { if (k.key) setParams({ kind: k.key }); else setParams({}); }}
          >
            <i className={`bi ${k.icon}`} aria-hidden="true" /> {k.label}
          </button>
        ))}
      </div>

      {!problems.length ? (
        <div className="pm-empty"><i className="bi bi-inbox" aria-hidden="true" /> No problems in this category yet.</div>
      ) : (
        <div className="pr-grid">
          {problems.map(p => (
            <button key={p.id} className="pr-item" onClick={() => nav(`/careerpilot/practice/${p.id}`)}>
              <div className="top">
                <span className={`kind ${p.kind}`}>{p.kind}</span>
                <span className={`pr-diff d-${p.difficulty}`}>{p.difficulty}</span>
                {(p.solved || solved.includes(p.id)) && <span className="solved"><i className="bi bi-check-circle-fill" aria-hidden="true" /> Solved</span>}
              </div>
              <h3>{p.title}</h3>
              <div className="meta">
                <span>{CAT_LABEL[p.category] || p.category}</span>
                <span>· {p.count} {p.kind === 'mcq' ? 'questions' : 'tests'}</span>
                <span>· +{p.xp} XP</span>
                {p.estimatedMinutes ? <span>· ~{p.estimatedMinutes} min</span> : null}
              </div>
              {(p.attempts || p.testsTotal || p.solvedCount) ? (
                <div className="pr-progress">
                  {p.testsTotal ? <span className={`pr-tests${p.testsPassed === p.testsTotal ? ' all' : ''}`}>{p.testsPassed}/{p.testsTotal} tests</span> : null}
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
