import React, { useEffect, useState } from 'react';
import passportApi, { AssessmentPreview, AssessmentPolicyRow } from '../../api/passportApi';
import './adminAssessmentPreview.css';

/**
 * What a given student's personalised assessment would look like.
 *
 * Diagnostic only: it runs the same generation the student flow runs and persists nothing —
 * no attempt, no history, no effect on anybody's paper. Sharing the code path is the whole
 * point; a preview that approximated generation would eventually disagree with it, and the
 * disagreement would surface as a student complaint rather than here.
 *
 * The likeliest outcome on a fresh system is a COVERAGE FAILURE, because assessment content
 * has to be mapped to skills first. That is the screen's most useful job: showing exactly
 * which skill is short of evidence, so the gap is a task rather than a mystery.
 */

const AdminAssessmentPreview: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [studentId, setStudentId] = useState('');
  const [attemptNumber, setAttempt] = useState(1);
  const [policies, setPolicies] = useState<AssessmentPolicyRow[]>([]);
  const [result, setResult] = useState<AssessmentPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    passportApi.assessmentPolicies().then(r => setPolicies(r.policies)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      passportApi.listStudents(search).then(setStudents).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const run = async () => {
    if (!studentId) return;
    setBusy(true); setErr(''); setResult(null);
    try {
      setResult(await passportApi.previewAssessment(studentId, attemptNumber));
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not build a preview.'); }
    setBusy(false);
  };

  const chosen = students.find(s => String(s._id || s.id) === studentId);

  return (
    <div className="prv">
      <div className="prv-hd">
        <h1>Assessment Preview</h1>
        <p>
          What a member's personalised assessment would contain right now. Runs the real
          generator and saves nothing — no attempt is created and no member data changes.
        </p>
      </div>

      {err && <div className="pm-msg err">{err}</div>}

      <div className="prv-form">
        <label className="grow">Member
          <input value={search} placeholder="Search by name or email…" onChange={e => setSearch(e.target.value)} />
          <select value={studentId} onChange={e => setStudentId(e.target.value)}>
            <option value="">— choose a member —</option>
            {students.slice(0, 50).map(s => (
              <option key={s._id || s.id} value={s._id || s.id}>
                {[s.firstName, s.lastName].filter(Boolean).join(' ') || s.email}
              </option>
            ))}
          </select>
        </label>

        <label className="att">Attempt
          <input type="number" min={1} max={10} value={attemptNumber}
            onChange={e => setAttempt(Math.max(1, Number(e.target.value) || 1))} />
          <em>A retake draws a different paper.</em>
        </label>

        <button className="pm-btn primary" disabled={!studentId || busy} onClick={run}>
          {busy ? 'Generating…' : 'Preview'}
        </button>
      </div>

      {/* ── coverage failure — the common case before content is mapped ── */}
      {result && !result.ok && (
        <div className="prv-fail">
          <div className="t">
            <i className="bi bi-exclamation-octagon" />
            <div>
              <b>This assessment cannot be generated yet.</b>
              <span>{result.message}</span>
            </div>
          </div>
          {!!result.shortfalls?.length && (
            <div className="short">
              <b>Skills short of mapped questions</b>
              {result.shortfalls.map((s, i) => (
                <div className="r" key={i}>
                  <span>{s.skillKey}</span>
                  <em>{s.difficulty.toLowerCase()}</em>
                  <i>{s.wanted} more needed</i>
                </div>
              ))}
              <p>Map more assessment content to these skills in Skill Evidence, then try again.</p>
            </div>
          )}
        </div>
      )}

      {/* ── a successful generation ── */}
      {result?.ok && result.specification && (
        <>
          <div className="prv-sum">
            <div className="s"><b>{result.items?.length || 0}</b><span>questions</span></div>
            <div className="s"><b>{Object.keys(result.specification.skillCoverage).length}</b><span>skills</span></div>
            <div className="s"><b>{result.context.stage}</b><span>stage</span></div>
            <div className="s"><b>{result.context.discovery ? 'Discovery' : result.context.roleKey}</b><span>scope</span></div>
            <div className="s"><b>{result.report?.exactMatches ?? 0}</b><span>exact matches</span></div>
            <div className={`s${result.report?.difficultyFallbacks ? ' warn' : ''}`}>
              <b>{result.report?.difficultyFallbacks ?? 0}</b><span>difficulty fallbacks</span>
            </div>
          </div>

          <div className="prv-meta">
            <span>{result.context.policy}</span>
            <em>policy {result.context.policyKey} v{result.context.policyVersion}</em>
            {!result.context.discovery && <em>blueprint v{result.context.blueprintVersion}</em>}
            {chosen && <em>{[chosen.firstName, chosen.lastName].filter(Boolean).join(' ')}</em>}
          </div>

          <div className="prv-cols">
            <div className="prv-dist">
              <h2>Skill coverage</h2>
              {Object.entries(result.specification.skillCoverage)
                .sort((a, b) => b[1] - a[1])
                .map(([k, n]) => (
                  <div className="d" key={k}>
                    <span>{k}</span>
                    <i style={{ width: `${(n / (result.items?.length || 1)) * 100}%` }} />
                    <b>{n}</b>
                  </div>
                ))}

              <h2>Difficulty</h2>
              {Object.entries(result.specification.difficultyCoverage).map(([k, n]) => (
                <div className="d" key={k}>
                  <span>{k.toLowerCase()}</span>
                  <i style={{ width: `${(n / (result.items?.length || 1)) * 100}%` }} />
                  <b>{n}</b>
                </div>
              ))}
            </div>

            <div className="prv-items">
              <h2>Selected questions</h2>
              {(result.items || []).map(i => (
                <div className="q" key={i.order}>
                  <span className="n">{i.order + 1}</span>
                  <div className="tx">
                    <b>{i.text || '(no text)'}</b>
                    {/* The answer to "why did this student get this question?" */}
                    <em>
                      {i.skillKey} · {i.difficulty.toLowerCase()}
                      {i.servedDifficulty && ` (served ${i.servedDifficulty.toLowerCase()})`}
                      {i.reason === 'prerequisite' && ' · prerequisite'}
                      {i.reason === 'discovery' && ' · discovery'}
                    </em>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!!policies.length && (
        <details className="prv-pol">
          <summary>Assessment policies by stage ({policies.length})</summary>
          <table>
            <thead>
              <tr><th>Stage</th><th>Questions</th><th>Skills</th><th>Easy</th><th>Medium</th><th>Hard</th><th>Prereq depth</th></tr>
            </thead>
            <tbody>
              {policies.map(p => (
                <tr key={p.key}>
                  <td>{p.label}</td>
                  <td>{p.skillSlots}</td>
                  <td>{p.maxSkills}</td>
                  <td>{Math.round(p.difficultyMix.EASY * 100)}%</td>
                  <td>{Math.round(p.difficultyMix.MEDIUM * 100)}%</td>
                  <td>{Math.round(p.difficultyMix.HARD * 100)}%</td>
                  <td>{p.prerequisiteDepth}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            Shape is fixed per stage so two members with the same profile sit comparable
            papers. Only which question fills each slot varies.
          </p>
        </details>
      )}
    </div>
  );
};

export default AdminAssessmentPreview;
