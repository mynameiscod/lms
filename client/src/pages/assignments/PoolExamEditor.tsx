import React, { useEffect, useMemo, useState } from 'react';
import { PoolExamSection, PoolExamSettings } from '../../api/assignmentApi';
import { questionPoolApi, PoolSummary, ExamCheck } from '../../api/questionPoolApi';

/**
 * The "Exam Paper" tab of an EXAM assignment: which pools each student's paper is drawn from, how
 * many questions of each level, what each is worth, and the exam's rules.
 *
 * The check under the sections asks the server whether the pools can fill every student's paper,
 * adding up sections that share a pool. Publishing asks the same question and refuses a "no".
 */

export const DEFAULT_POOL_EXAM: PoolExamSettings = {
  sections: [],
  durationMinutes: 60,
  maxAttempts: 1,
  preferUnseen: true,
  tabSwitch: { enabled: true, maxWarnings: 3, autoSubmit: true },
  blockCopyPaste: true,
  showResultsImmediately: false,
};

export const sectionQuestions = (s: PoolExamSection) => (s.easy || 0) + (s.medium || 0) + (s.hard || 0) + (s.any || 0);
export const poolExamTotal = (p: PoolExamSettings) =>
  Math.round(p.sections.reduce((n, s) => n + sectionQuestions(s) * (s.marksPerQuestion || 0), 0) * 100) / 100;

const newKey = () => `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

const Toggle: React.FC<{ on: boolean; onChange: (v: boolean) => void; label: string; hint: string; children?: React.ReactNode }> = ({ on, onChange, label, hint, children }) => (
  <div className="pex-toggle">
    <div className="pex-toggle-row">
      <div>
        <div className="pex-toggle-label">{label}</div>
        <div className="pex-hint">{hint}</div>
      </div>
      <label className="pex-switch">
        <input type="checkbox" checked={on} onChange={e => onChange(e.target.checked)} aria-label={label} />
        <span className={on ? 'on' : ''}><i /></span>
      </label>
    </div>
    {on && children}
  </div>
);

const LEVELS: { key: 'easy' | 'medium' | 'hard' | 'any'; label: string }[] = [
  { key: 'easy', label: 'Easy' }, { key: 'medium', label: 'Medium' }, { key: 'hard', label: 'Hard' }, { key: 'any', label: 'Any level' },
];

const PoolExamEditor: React.FC<{ value: PoolExamSettings; onChange: (v: PoolExamSettings) => void }> = ({ value, onChange }) => {
  const [pools, setPools] = useState<PoolSummary[] | null>(null);
  const [poolErr, setPoolErr] = useState('');
  const [check, setCheck] = useState<ExamCheck | null>(null);

  useEffect(() => { questionPoolApi.list().then(setPools).catch(() => setPoolErr('Could not load your question pools.')); }, []);

  const set = (patch: Partial<PoolExamSettings>) => onChange({ ...value, ...patch });
  const setSection = (i: number, patch: Partial<PoolExamSection>) =>
    set({ sections: value.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const addSection = () => set({
    sections: [...value.sections, {
      key: newKey(), title: `Section ${String.fromCharCode(65 + value.sections.length)}`,
      poolId: pools?.[0]?.id || '', easy: 0, medium: 0, hard: 0, any: 0, marksPerQuestion: 1,
    }],
  });
  const removeSection = (i: number) => set({ sections: value.sections.filter((_, j) => j !== i) });

  // Asked again half a second after the admin stops changing the sections.
  const sectionsKey = JSON.stringify(value.sections);
  useEffect(() => {
    if (!value.sections.length) { setCheck(null); return; }
    const t = setTimeout(() => { questionPoolApi.checkExam(value.sections).then(setCheck).catch(() => setCheck(null)); }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionsKey]);

  const byPool = useMemo(() => new Map((pools || []).map(p => [p.id, p])), [pools]);
  const problemFor = (key: string) => check?.sections.find(c => c.key === key)?.problem || '';
  const total = poolExamTotal(value);
  const questions = value.sections.reduce((n, s) => n + sectionQuestions(s), 0);

  return (
    <div className="form-section pex" style={{ padding: 24 }}>
      <h3 className="section-title" style={{ marginTop: 0 }}>Exam Paper</h3>
      <p className="section-description">
        Each section draws questions at random from one Question Pool. Every student gets their own paper, with the same number of questions at each level.
      </p>

      {poolErr && <div className="alert alert-error">{poolErr}</div>}
      {pools && !pools.length && (
        <div className="pex-note">You have no question pools yet. <a href="/admin/assignments/pools" target="_blank" rel="noreferrer">Create one</a>, then come back — this list refreshes when you reopen the tab.</div>
      )}

      {value.sections.map((s, i) => {
        const pool = byPool.get(s.poolId);
        const problem = problemFor(s.key);
        return (
          <div key={s.key} className={`pex-section${problem ? ' bad' : ''}`}>
            <div className="pex-section-head">
              <input className="form-control pex-title" value={s.title} onChange={e => setSection(i, { title: e.target.value })} aria-label="Section title" maxLength={120} />
              <button type="button" className="pex-remove" onClick={() => removeSection(i)} aria-label={`Remove ${s.title}`}>✕ Remove</button>
            </div>
            <div className="pex-grid">
              <div className="form-group pex-pool">
                <label className="form-label">Pool</label>
                <select className="form-control" value={s.poolId} onChange={e => setSection(i, { poolId: e.target.value })}>
                  <option value="">Choose a pool…</option>
                  {(pools || []).map(p => <option key={p.id} value={p.id}>{p.name} ({p.kind === 'coding' ? 'coding' : 'MCQ'})</option>)}
                </select>
                {pool && <small className="pex-hint">Available: {pool.counts.easy} easy · {pool.counts.medium} medium · {pool.counts.hard} hard</small>}
              </div>
              {LEVELS.map(l => (
                <div className="form-group pex-num" key={l.key}>
                  <label className="form-label">{l.label}</label>
                  <input type="number" className="form-control" min={0} max={200} value={s[l.key]}
                    onChange={e => setSection(i, { [l.key]: Math.max(0, Math.floor(Number(e.target.value) || 0)) } as Partial<PoolExamSection>)} />
                </div>
              ))}
              <div className="form-group pex-num">
                <label className="form-label">Marks each</label>
                <input type="number" className="form-control" min={0} step={0.5} value={s.marksPerQuestion}
                  onChange={e => setSection(i, { marksPerQuestion: Math.max(0, Number(e.target.value) || 0) })} />
              </div>
            </div>
            <div className="pex-section-foot">
              <span>{sectionQuestions(s)} question{sectionQuestions(s) === 1 ? '' : 's'} · {sectionQuestions(s) * (s.marksPerQuestion || 0)} marks</span>
              {problem && <span className="pex-problem">⚠ {problem}</span>}
            </div>
          </div>
        );
      })}

      <button type="button" className="btn btn-secondary" onClick={addSection} disabled={!pools?.length}>+ Add section</button>

      <div className={`pex-summary${check && !check.ok ? ' bad' : check?.ok ? ' ok' : ''}`}>
        <b>Each student gets {questions} question{questions === 1 ? '' : 's'} · {total} marks</b>
        {check?.ok && <span>✓ The pools can fill every student's paper.</span>}
        {check && !check.ok && <span>This exam cannot be published until every section can be filled.</span>}
        {!value.sections.length && <span>Add a section to start.</span>}
      </div>

      <h4 className="pex-h4">Rules</h4>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Duration (minutes)</label>
          <input type="number" className="form-control" min={0} value={value.durationMinutes}
            onChange={e => set({ durationMinutes: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} />
          <small className="pex-hint">Counts down from Start; the paper is submitted when it runs out. 0 = no time limit.</small>
        </div>
        <div className="form-group">
          <label className="form-label">Attempts allowed</label>
          <input type="number" className="form-control" min={0} value={value.maxAttempts}
            onChange={e => set({ maxAttempts: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} />
          <small className="pex-hint">Each attempt is a fresh random paper. 0 = unlimited.</small>
        </div>
      </div>

      <Toggle on={value.preferUnseen} onChange={v => set({ preferUnseen: v })} label="Prefer questions the student has not seen"
        hint="When a pool is reused across exams, draw questions this student has not had before, as far as the pool allows." />
      <Toggle on={value.tabSwitch.enabled} onChange={v => set({ tabSwitch: { ...value.tabSwitch, enabled: v } })} label="Warn on leaving the exam tab"
        hint="Every switch to another tab or window is recorded and the student is warned.">
        <div className="pex-sub">
          <label>Warnings before action
            <input type="number" className="form-control" min={1} max={50} value={value.tabSwitch.maxWarnings}
              onChange={e => set({ tabSwitch: { ...value.tabSwitch, maxWarnings: Math.max(1, Math.floor(Number(e.target.value) || 1)) } })} />
          </label>
          <label className="pex-check">
            <input type="checkbox" checked={value.tabSwitch.autoSubmit} onChange={e => set({ tabSwitch: { ...value.tabSwitch, autoSubmit: e.target.checked } })} />
            Submit the paper automatically after the last warning
          </label>
        </div>
      </Toggle>
      <Toggle on={value.blockCopyPaste} onChange={v => set({ blockCopyPaste: v })} label="Block copy and paste"
        hint="Stops pasting into the answers and copying out of the questions." />
      <Toggle on={value.showResultsImmediately} onChange={v => set({ showResultsImmediately: v })} label="Show results as soon as a student submits"
        hint="Off: students see only “submitted” until you release results, so answers cannot spread while others are still sitting it." />

      <div className="pex-note" style={{ marginTop: 16 }}>
        To give this exam to students, save it, publish it, then use <b>Assign to Batches</b> from the Assignments list — by batch or to individual students, each with its own start and end date.
      </div>
    </div>
  );
};

export default PoolExamEditor;
