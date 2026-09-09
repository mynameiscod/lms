import React, { useEffect, useState } from 'react';
import passportApi, { EditablePolicy, PolicyBounds } from '../../api/passportApi';
import './adminAssessmentShape.css';

/**
 * The shape of a personalised assessment, per stage.
 *
 * WHAT AN ADMIN DECIDES: how long the paper is, how many skills it spans, how hard it
 * feels, and whether it is timed. WHAT STAYS FIXED: which skill difficulties a stage may
 * admit, how far the generator walks back into prerequisites, and whether difficulty may
 * fall back. Those decide what a stage MEANS, and a tenant changing them would make two
 * "foundation" scores describe different things.
 *
 * PER STAGE, NEVER PER STUDENT — two members at the same stage must sit papers of the same
 * shape or their scores stop being comparable, which is the only reason a Skill DNA number
 * means anything next to somebody else's.
 */

const AdminAssessmentShape: React.FC = () => {
  const [rows, setRows] = useState<EditablePolicy[]>([]);
  const [bounds, setBounds] = useState<PolicyBounds | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = () => {
    passportApi.getEditablePolicies()
      .then(r => { setRows(r.policies); setBounds(r.bounds); })
      .catch(e => setErr(e?.response?.data?.message || 'Could not load assessment policies.'));
  };
  useEffect(load, []);

  const patch = (stage: string, changes: Partial<EditablePolicy>) =>
    setRows(rs => rs.map(r => (r.stage === stage ? { ...r, ...changes } : r)));

  const setMix = (stage: string, band: 'EASY' | 'MEDIUM' | 'HARD', value: number) =>
    setRows(rs => rs.map(r => (r.stage === stage
      ? { ...r, difficultyMix: { ...r.difficultyMix, [band]: Math.max(0, Math.min(100, value)) } }
      : r)));

  const resetToDefault = (r: EditablePolicy) =>
    patch(r.stage, {
      skillSlots: r.defaults.skillSlots,
      maxSkills: r.defaults.maxSkills,
      minItemsPerSkill: r.defaults?.minItemsPerSkill ?? r.minItemsPerSkill,
      difficultyMix: { ...r.defaults.difficultyMix },
      timeLimitMinutes: 0,
    });

  const save = async () => {
    setBusy(true); setErr(''); setMsg('');
    try {
      const r = await passportApi.saveEditablePolicies(rows);
      setRows(r.policies);
      setMsg('Saved. New papers use these; papers already in progress are unaffected.');
      setTimeout(() => setMsg(''), 6000);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not save.');
    }
    setBusy(false);
  };

  const mixTotal = (r: EditablePolicy) => r.difficultyMix.EASY + r.difficultyMix.MEDIUM + r.difficultyMix.HARD;

  return (
    <div className="aps">
      <div className="aps-hd">
        <div>
          <h1>Assessment Shape</h1>
          <p>
            How long each paper is and how hard it feels, per career stage. Content comes from
            the Skill Graph and Skill Evidence — this decides the size and balance.
          </p>
        </div>
        <button className="pm-btn primary" disabled={busy} onClick={save}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      {err && <div className="aps-err">{err}</div>}
      {msg && <div className="aps-ok">{msg}</div>}

      {rows.map(r => {
        const total = mixTotal(r);
        return (
          <div className={`aps-card${r.overridden ? ' on' : ''}`} key={r.stage}>
            <div className="aps-card-hd">
              <div>
                <b>{r.label}</b>
                <span className="aps-stage">{r.stage}</span>
                {r.overridden && <i className="aps-tag">customised</i>}
              </div>
              <button className="aps-link" onClick={() => resetToDefault(r)}>Reset to default</button>
            </div>

            <div className="aps-grid">
              <label>
                Questions
                <input type="number" value={r.skillSlots}
                  min={bounds?.skillSlots?.min} max={bounds?.skillSlots?.max}
                  onChange={e => patch(r.stage, { skillSlots: Number(e.target.value) })} />
                <em>default {r.defaults.skillSlots} · allowed {bounds?.skillSlots?.min}–{bounds?.skillSlots?.max}</em>
              </label>

              <label>
                Skills covered
                <input type="number" value={r.maxSkills}
                  min={bounds?.maxSkills?.min} max={bounds?.maxSkills?.max}
                  onChange={e => patch(r.stage, { maxSkills: Number(e.target.value) })} />
                <em>default {r.defaults.maxSkills} · allowed {bounds?.maxSkills?.min}–{bounds?.maxSkills?.max}</em>
              </label>

              <label>
                Questions per skill
                <input type="number" value={r.minItemsPerSkill ?? r.defaults?.minItemsPerSkill ?? 1}
                  min={bounds?.itemsPerSkill?.min} max={bounds?.itemsPerSkill?.max}
                  onChange={e => patch(r.stage, { minItemsPerSkill: Number(e.target.value) })} />
                <em>
                  default {r.defaults?.minItemsPerSkill ?? r.minItemsPerSkill}
                  {r.effective && ` · needs ${r.effective.itemsForConfidence} to measure reliably at this difficulty mix`}
                </em>
              </label>

              <label>
                Time limit (minutes)
                <input type="number" value={r.timeLimitMinutes}
                  min={0} max={bounds?.timeLimitMinutes?.max}
                  onChange={e => patch(r.stage, { timeLimitMinutes: Number(e.target.value) })} />
                <em>0 = untimed, the shipped behaviour</em>
              </label>
            </div>

            {/*
              WHAT THE NUMBERS ACTUALLY PRODUCE.

              The three fields interact and the interaction is invisible: questions divided by
              questions-per-skill caps the skills, so asking for twelve skills on twenty-four
              questions silently returns six. And a skill asked fewer times than its mix requires
              contributes nothing to readiness however long the paper is — which used to be the
              real reason a student's skill map stayed empty. Both are stated here rather than
              left for an admin to derive.
            */}
            {r.effective && (
              <div className={`aps-effective${r.effective.measuresReliably ? '' : ' warn'}`}>
                <b>{r.effective.skills} skills</b> × {r.effective.itemsPerSkill} questions
                {' '}= <b>{r.effective.slotsUsed}</b> of {r.skillSlots} questions used
                {r.effective.skills < r.maxSkills && (
                  <span className="aps-note">
                    {' '}· asking for {r.maxSkills} skills needs at least{' '}
                    {r.maxSkills * r.effective.itemsPerSkill} questions
                  </span>
                )}
                {!r.effective.measuresReliably && (
                  <span className="aps-note">
                    {' '}· at {r.effective.itemsPerSkill} question
                    {r.effective.itemsPerSkill === 1 ? '' : 's'} per skill nothing reaches the
                    confidence needed to count toward readiness — this mix needs{' '}
                    {r.effective.itemsForConfidence}
                  </span>
                )}
              </div>
            )}

            <div className="aps-mix">
              <span className="aps-mix-lbl">Difficulty mix</span>
              {(['EASY', 'MEDIUM', 'HARD'] as const).map(band => (
                <label key={band} className="aps-band">
                  {band.toLowerCase()}
                  <input type="number" value={r.difficultyMix[band]} min={0} max={100}
                    onChange={e => setMix(r.stage, band, Number(e.target.value))} />
                  %
                </label>
              ))}
              {/* Scaled rather than refused: "roughly this" is what the numbers mean, and
                  rejecting a save over a few points would be pedantry. */}
              <span className={`aps-total${total === 100 ? '' : ' warn'}`}>
                {total}%{total !== 100 && ' — will be scaled to 100%'}
              </span>
            </div>

            <p className="aps-fixed">
              <i className="bi bi-lock" />
              Fixed for this stage: asks only <b>{r.allowedSkillDifficulty.join(', ').toLowerCase()}</b> skills,
              and how far it walks back into prerequisites. These decide what the stage means, so
              every tenant measures it the same way.
            </p>
          </div>
        );
      })}

      <p className="aps-foot">
        Changes apply to papers started from now on. Anything already in progress keeps the
        shape — and the clock — it began with.
      </p>
    </div>
  );
};

export default AdminAssessmentShape;
