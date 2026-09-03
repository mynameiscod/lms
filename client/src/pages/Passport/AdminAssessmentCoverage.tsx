import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './assessmentCoverage.css';

/**
 * Admin › Assessment Coverage — where a paper can and cannot be built.
 *
 * WHY THIS EXISTS. A member picked Fullstack Engineer and was told "your assessment is not
 * ready yet". That message is correct and deliberately says nothing actionable, because it
 * is shown to a student — but there was nowhere for an admin to find out WHICH skill was
 * short. The answer only existed in a log line.
 *
 * OWNED vs BORROWED is the second question, and the one that decides how much work moving
 * CareerPilot onto its own bank actually is. Approving a draft writes into the shared
 * Question collection, so the two banks are the same store told apart by provenance; without
 * this split nobody could say whether the pool was 7% or 90% CareerPilot's own.
 *
 * A ZERO IS THE POINT OF THE PAGE. Empty cells are styled to be findable at a glance rather
 * than read off a wall of numbers — a paper fails on the one slot it cannot fill, not on the
 * average.
 */

const BASE = (process.env.REACT_APP_API_URL || '/api/v1') + '/passport';
const DIFFS = ['EASY', 'MEDIUM', 'HARD'] as const;

const auth = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};

interface SkillRow {
  skillKey: string;
  skillName: string;
  importance: string;
  pending: number;
  byDifficulty: Record<string, { owned: number; borrowed: number }>;
  hasHole: boolean;
}
interface RoleRow { roleKey: string; skills: SkillRow[]; blocking: string[] }
interface Totals { owned: number; borrowed: number; pending: number; skills: number; blockingSkills: number }

/** What one generated question costs, for the warning below. Sonnet-class list pricing. */
const RUPEES_PER_QUESTION = 0.9;

const AdminAssessmentCoverage: React.FC = () => {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [busyCell, setBusyCell] = useState('');
  const [genMsg, setGenMsg] = useState('');
  const [perGap, setPerGap] = useState(6);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [role, setRole] = useState('');
  const [onlyGaps, setOnlyGaps] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    axios.get(`${BASE}/question-drafts/role-coverage`, { headers: auth() })
      .then(r => {
        setRoles(r.data.roles || []);
        setTotals(r.data.totals || null);
        if (r.data.roles?.length) setRole(r.data.roles[0].roleKey);
      })
      .catch(e => setErr(
        e?.response?.status === 403 ? 'You do not have permission to read assessment coverage.'
        : e?.response?.data?.message || (e?.response ? `Failed (HTTP ${e.response.status}).` : 'The server did not respond.'),
      ))
      .finally(() => setLoading(false));
  }, []);

  const current = roles.find(r => r.roleKey === role);

  const reload = () =>
    axios.get(`${BASE}/question-drafts/role-coverage`, { headers: auth() })
      .then(r => { setRoles(r.data.roles || []); setTotals(r.data.totals || null); })
      .catch(() => { /* the numbers on screen simply stay as they were */ });

  /**
   * Draft questions for one empty cell.
   *
   * The generator already took a skill, a difficulty and a count — what was missing was a
   * way to reach it from the place the gap is visible. Closing fifteen skills across three
   * difficulties meant forty-five trips through a form, which is why nobody had.
   *
   * Drafts land PENDING. Nothing generated here reaches a student until it is reviewed:
   * these questions decide a member's Skill DNA, and a wrong answer key mis-scores them
   * silently.
   */
  const generateFor = async (skillKey: string, difficulty: string) => {
    const cell = `${skillKey}:${difficulty}`;
    setBusyCell(cell); setGenMsg('');
    try {
      const r = await axios.post(`${BASE}/question-drafts/generate`,
        { skillKey, difficulty: difficulty.toLowerCase(), count: perGap },
        { headers: auth() });
      const rep = r.data?.report;
      setGenMsg(`${skillKey} · ${difficulty}: ${rep?.stored ?? 0} of ${rep?.requested ?? perGap} drafted`
        + (rep?.dropped?.length ? `, ${rep.dropped.length} dropped by the duplicate and quality checks` : '')
        + ' — review them under Question Drafts before they can be used.');
      await reload();
    } catch (e: any) {
      setGenMsg(e?.response?.data?.message
        || (e?.response?.status === 502 ? 'The AI provider did not return usable questions. Try again.'
          : `Generation failed (HTTP ${e?.response?.status ?? '—'}).`));
    }
    setBusyCell('');
  };

  /** Every empty cell for the role on screen. */
  const gaps = useMemo(() => (current?.skills || []).flatMap(sk =>
    DIFFS.filter(d => sk.byDifficulty[d].owned + sk.byDifficulty[d].borrowed === 0)
      .map(d => ({ skillKey: sk.skillKey, difficulty: d }))),
    [current]);

  const generateAllGaps = async () => {
    const cost = Math.round(gaps.length * perGap * RUPEES_PER_QUESTION);
    if (!window.confirm(
      `Draft ${perGap} questions for each of ${gaps.length} empty slots?\n\n`
      + `That is ${gaps.length * perGap} questions, roughly ₹${cost} of AI usage, and they all `
      + `land as drafts for review — nothing reaches a student until you approve it.`)) return;

    // Sequential on purpose: the endpoint is rate-limited, and a failure part-way should
    // leave the drafts already written rather than an unknown partial state.
    for (const g of gaps) {
      await generateFor(g.skillKey, g.difficulty);
    }
  };

  const rows = useMemo(() => {
    const list = current?.skills || [];
    if (!onlyGaps) return list;
    return list.filter(s => DIFFS.some(d => s.byDifficulty[d].owned + s.byDifficulty[d].borrowed === 0));
  }, [current, onlyGaps]);

  /** Difficulties with nothing for ANY skill this role needs — a whole column missing. */
  const emptyColumns = useMemo(() => DIFFS.filter(d =>
    (current?.skills || []).every(s => s.byDifficulty[d].owned + s.byDifficulty[d].borrowed === 0)),
    [current]);

  if (loading) return <div className="ac-load">Reading the question pool…</div>;
  if (err) return <div className="ac-err">{err}</div>;

  return (
    <div className="ac">
      <header className="ac-head">
        <div>
          <span className="ac-eyebrow">CareerPilot · Assessment</span>
          <h1>Coverage</h1>
          <p>
            Whether a paper can be built for each role, and how much of the pool is
            CareerPilot&rsquo;s own rather than borrowed from the LMS quiz bank.
          </p>
        </div>
      </header>

      {totals && (
        <div className="ac-kpis">
          <div className="ac-kpi"><small>Skills needed</small><b>{totals.skills}</b><em>across all roles</em></div>
          <div className="ac-kpi own"><small>Owned</small><b>{totals.owned}</b><em>written for CareerPilot</em></div>
          <div className="ac-kpi borrow"><small>Borrowed</small><b>{totals.borrowed}</b><em>from the LMS bank</em></div>
          <div className={`ac-kpi${totals.blockingSkills ? ' bad' : ''}`}>
            <small>Empty skills</small><b>{totals.blockingSkills}</b><em>no question at all</em>
          </div>
          <div className="ac-kpi"><small>Pending drafts</small><b>{totals.pending}</b><em>awaiting review</em></div>
        </div>
      )}

      <div className="ac-bar">
        <div className="ac-roles">
          {roles.map(r => (
            <button
              key={r.roleKey}
              className={`ac-role${r.roleKey === role ? ' on' : ''}${r.blocking.length ? ' has-gap' : ''}`}
              onClick={() => setRole(r.roleKey)}>
              {r.roleKey.replace(/_/g, ' ')}
              {r.blocking.length > 0 && <em>{r.blocking.length}</em>}
            </button>
          ))}
        </div>
        <label className="ac-toggle">
          <input type="checkbox" checked={onlyGaps} onChange={e => setOnlyGaps(e.target.checked)} />
          Only skills with a gap
        </label>
      </div>

      {gaps.length > 0 && (
        <div className="ac-gapbar">
          <div>
            <b>{gaps.length} empty slot{gaps.length === 1 ? '' : 's'} for {role.replace(/_/g, ' ')}</b>
            <span>
              Drafting {perGap} each is {gaps.length * perGap} questions, about
              {' '}₹{Math.round(gaps.length * perGap * RUPEES_PER_QUESTION)} of AI usage.
              All land as drafts for review.
            </span>
          </div>
          <label className="ac-per">
            Per slot
            <input
              type="number" min={1} max={20} value={perGap}
              onChange={e => setPerGap(Math.max(1, Math.min(20, Number(e.target.value) || 6)))} />
          </label>
          <button className="ac-gen" disabled={!!busyCell} onClick={generateAllGaps}>
            {busyCell ? 'Drafting…' : 'Draft for every empty slot'}
          </button>
        </div>
      )}

      {genMsg && <div className="ac-genmsg">{genMsg}</div>}

      {emptyColumns.length > 0 && (
        <div className="ac-note">
          <b>No {emptyColumns.join(' or ')} question exists for any skill this role needs.</b>
          {' '}If a paper shape asks for one of those slots it cannot be filled, and the member
          is told the assessment is not ready — the same refusal, for every role, until the
          gap is closed or the shape stops asking.
        </div>
      )}

      {current && current.blocking.length > 0 && (
        <div className="ac-note bad">
          <b>{current.blocking.length} skill{current.blocking.length === 1 ? '' : 's'} have nothing at any difficulty.</b>
          {' '}A paper for {current.roleKey.replace(/_/g, ' ')} cannot be generated while that is
          true. Either add questions, or deactivate the requirement on the role blueprint.
        </div>
      )}

      <div className="ac-tablewrap">
        <table className="ac-table">
          <thead>
            <tr>
              <th>Skill</th>
              <th className="c">Importance</th>
              {DIFFS.map(d => <th key={d} className="c">{d}</th>)}
              <th className="c">Pending</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(s => (
              <tr key={s.skillKey}>
                <td>
                  <b>{s.skillName}</b>
                  <span className="key">{s.skillKey}</span>
                </td>
                <td className="c"><span className={`imp ${s.importance.toLowerCase()}`}>{s.importance}</span></td>
                {DIFFS.map(d => {
                  const c = s.byDifficulty[d];
                  const total = c.owned + c.borrowed;
                  return (
                    <td key={d} className={`c cell${total === 0 ? ' zero' : ''}`}>
                      {total === 0 ? (
                        <button
                          className="ac-cellgen"
                          disabled={busyCell === `${s.skillKey}:${d}`}
                          title={`Draft ${perGap} ${d.toLowerCase()} questions for ${s.skillName}`}
                          onClick={() => generateFor(s.skillKey, d)}>
                          {busyCell === `${s.skillKey}:${d}` ? '…' : 'draft'}
                        </button>
                      ) : (
                        <>
                          <span className="own" title="Written for CareerPilot">{c.owned}</span>
                          <span className="slash">/</span>
                          <span className="borrow" title="Borrowed from the LMS quiz bank">{c.borrowed}</span>
                        </>
                      )}
                    </td>
                  );
                })}
                <td className="c">{s.pending > 0 ? <span className="pend">{s.pending}</span> : <span className="none">—</span>}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="ac-empty">No skill matches that filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="ac-legend">
        Each cell reads <b>owned / borrowed</b>. Owned means written for CareerPilot — approved
        from a draft, or from a CareerPilot-only item family. Borrowed means an LMS quiz question
        mapped to the skill through Skill Evidence, which would disappear from the pool if the
        LMS bank were retired.
      </p>
    </div>
  );
};

export default AdminAssessmentCoverage;
