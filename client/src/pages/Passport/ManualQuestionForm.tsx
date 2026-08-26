import React, { useState } from 'react';
import passportApi, { PoolCoverageRow } from '../../api/passportApi';
import AudiencePicker, { Audience, EMPTY_AUDIENCE } from './AudiencePicker';

/**
 * An admin writes a question themselves.
 *
 * Goes straight into the pool — no pending queue, because the author is the reviewer and a
 * queue only its own writer can clear is just a delay. The server still runs the SAME checks
 * the AI's output must survive (a blank option, two correct answers, a near-duplicate of an
 * existing stem), so this is a faster path in, not a looser one. Refusals come back verbatim
 * and are shown as written.
 *
 * Four options with the first correct is the starting shape simply because it is the
 * commonest; nothing depends on it.
 */

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const BLANK_OPTIONS = [
  { text: '', isCorrect: true },
  { text: '', isCorrect: false },
  { text: '', isCorrect: false },
  { text: '', isCorrect: false },
];

const ManualQuestionForm: React.FC<{
  pool: PoolCoverageRow[];
  audienceOptions: { roles: { key: string; label: string }[]; years: string[]; courses: string[] };
  defaultSkill?: string;
  onSaved: () => void;
  onCancel: () => void;
}> = ({ pool, audienceOptions, defaultSkill, onSaved, onCancel }) => {
  const [skillKey, setSkillKey] = useState(defaultSkill || '');
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(BLANK_OPTIONS);
  const [explanation, setExplanation] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [audience, setAudience] = useState<Audience>(EMPTY_AUDIENCE);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const poolCount = pool.find(p => p.skillKey === skillKey)?.approved;

  const setOption = (i: number, change: Partial<{ text: string; isCorrect: boolean }>) => {
    setOptions(prev => {
      const next = prev.map((o, j) => (j === i ? { ...o, ...change } : o));
      // Exactly one correct answer. Marking a new one clears the old rather than letting
      // the admin save something the server will refuse.
      if (change.isCorrect) next.forEach((o, j) => { o.isCorrect = j === i; });
      return next;
    });
  };

  const addOption = () => setOptions(prev => (prev.length >= 6 ? prev : [...prev, { text: '', isCorrect: false }]));
  const removeOption = (i: number) => setOptions(prev => {
    if (prev.length <= 3) return prev;
    const next = prev.filter((_, j) => j !== i);
    // Never leave a question with no correct answer behind.
    if (!next.some(o => o.isCorrect)) next[0].isCorrect = true;
    return next;
  });

  const save = async () => {
    setBusy(true); setErr('');
    try {
      await passportApi.createManualQuestion({
        skillKey, difficulty, question,
        options: options.map(o => ({ text: o.text, isCorrect: o.isCorrect })),
        explanation: explanation || undefined,
        codeSnippet: codeSnippet || undefined,
        ...audience,
      });
      onSaved();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not save the question.');
    }
    setBusy(false);
  };

  return (
    <div className="qd-manual">
      <div className="qd-manual-hd">
        <h3>Write a question</h3>
        <button className="qd-btn ghost" onClick={onCancel}>Cancel</button>
      </div>

      {err && <div className="qd-banner err">{err}</div>}

      <div className="qd-gen">
        <label>
          Skill
          <select value={skillKey} onChange={e => setSkillKey(e.target.value)}>
            <option value="">Choose a skill…</option>
            {pool.map(s => (
              <option key={s.skillKey} value={s.skillKey}>{s.skillName} ({s.approved})</option>
            ))}
          </select>
        </label>
        <label>
          Difficulty
          <select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
      </div>

      <label className="qd-field">
        Question
        <textarea rows={3} value={question} placeholder="What the student is asked…"
          onChange={e => setQuestion(e.target.value)} />
      </label>

      <label className="qd-field">
        Code snippet <small>optional</small>
        <textarea rows={3} className="mono" value={codeSnippet}
          placeholder="Shown above the options, in a monospace block"
          onChange={e => setCodeSnippet(e.target.value)} />
      </label>

      <div className="qd-field">
        Options <small>pick the correct one</small>
        <div className="qd-opts">
          {options.map((o, i) => (
            <label key={i} className={`qd-opt${o.isCorrect ? ' correct' : ''}`}>
              <input type="radio" name="manual-correct" checked={o.isCorrect}
                onChange={() => setOption(i, { isCorrect: true })} />
              <input className="tx" value={o.text} placeholder={`Option ${i + 1}`}
                onChange={e => setOption(i, { text: e.target.value })} />
              {options.length > 3 && (
                <button type="button" className="qd-opt-x" onClick={() => removeOption(i)} aria-label="Remove option">×</button>
              )}
            </label>
          ))}
        </div>
        {options.length < 6 && (
          <button type="button" className="qd-btn ghost sm" onClick={addOption}>+ Add option</button>
        )}
      </div>

      <label className="qd-field">
        Explanation <small>shown after answering</small>
        <textarea rows={2} value={explanation} onChange={e => setExplanation(e.target.value)} />
      </label>

      <div className="qd-field">
        Who is this for?
        <AudiencePicker
          value={audience}
          options={audienceOptions}
          onChange={setAudience}
          poolCount={poolCount}
        />
      </div>

      <div className="qd-actions end">
        <button className="qd-btn ghost" onClick={onCancel}>Cancel</button>
        <button className="qd-btn primary" disabled={busy || !skillKey || !question.trim()} onClick={save}>
          {busy ? 'Saving…' : 'Save & publish'}
        </button>
      </div>
    </div>
  );
};

export default ManualQuestionForm;
