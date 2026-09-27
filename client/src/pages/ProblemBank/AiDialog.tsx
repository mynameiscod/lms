import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { emptyProblem, problemBankApi, pbError, PbAiDraft, PbDifficulty, PbMeta, PbProblemInput } from '../../api/problemBankApi';
import { DifficultyPill, LANG_SHORT, Modal } from './shared';

/** Fill an AI draft out to a complete problem the studio and the API accept. */
export const draftToProblem = (d: Partial<PbProblemInput>, meta?: PbMeta): PbProblemInput => {
  const base = emptyProblem();
  const difficulty = (d.difficulty as PbDifficulty) || base.difficulty;
  return {
    ...base, ...d,
    difficulty,
    marks: d.marks ?? meta?.defaultMarks?.[difficulty] ?? base.marks,
    hints: d.hints || [], topics: d.topics || [], tags: d.tags || [], companies: d.companies || [],
    languages: (d.languages || []).map((l: any) => ({ language: l.language, starterCode: l.starterCode || '', solutionCode: l.solutionCode || '', headerCode: l.headerCode || '', footerCode: l.footerCode || '' })),
    tests: (d.tests || []).map((t: any) => ({ input: t.input || '', expectedOutput: t.expectedOutput || '', isSample: !!t.isSample, weight: t.weight ?? 1, explanation: t.explanation || '' })),
  };
};

/**
 * AI drafting. The model writes; the judge decides the answers. Each draft shows which
 * languages were verified against the reference solution before the author sees it.
 */
const AiDialog: React.FC<{ meta: PbMeta; onClose: () => void; onSaved: (n: number) => void }> = ({ meta, onClose, onSaved }) => {
  const nav = useNavigate();
  const [topic, setTopic] = useState('array');
  const [difficulty, setDifficulty] = useState<PbDifficulty>('easy');
  const [languages, setLanguages] = useState<string[]>(['python', 'java', 'cpp']);
  const [count, setCount] = useState(1);
  const [instructions, setInstructions] = useState('');
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [err, setErr] = useState('');
  const [drafts, setDrafts] = useState<PbAiDraft[]>([]);
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const poll = useRef<any>();
  useEffect(() => () => clearInterval(poll.current), []);

  const generate = async () => {
    setBusy(true); setErr(''); setDrafts([]); setSaved(new Set()); setElapsed(0);
    try {
      const { jobId } = await problemBankApi.aiGenerate({ topic, difficulty, languages, count, instructions });
      poll.current = setInterval(async () => {
        try {
          const j = await problemBankApi.aiJob(jobId);
          setElapsed(j.elapsedSec);
          if (j.status === 'running') return;
          clearInterval(poll.current);
          setBusy(false);
          if (j.status === 'failed') setErr(j.error || 'Generation failed.');
          else setDrafts(j.drafts || []);
        } catch (e) { clearInterval(poll.current); setBusy(false); setErr(pbError(e)); }
      }, 3000);
    } catch (e) { setBusy(false); setErr(pbError(e, 'Could not start generation.')); }
  };

  const save = async (i: number) => {
    try {
      await problemBankApi.create({ ...draftToProblem(drafts[i].draft, meta), status: 'draft' });
      setSaved((s) => new Set(s).add(i));
      onSaved(1);
    } catch (e) { setErr(pbError(e, 'Could not save the draft.')); }
  };
  const saveAll = async () => { for (let i = 0; i < drafts.length; i++) if (!drafts[i].error && !saved.has(i)) await save(i); };

  const toggleLang = (k: string) => setLanguages((x) => x.includes(k) ? x.filter((y) => y !== k) : x.length >= 5 ? x : [...x, k]);
  const good = drafts.filter((d) => !d.error).length;

  return (
    <Modal title={<><i className="fa-solid fa-wand-magic-sparkles" style={{ color: 'var(--pb-accent)' }} /> Generate problems with AI</>} onClose={onClose} wide
      footer={drafts.length ? <>
        <button className="pb-btn" onClick={() => setDrafts([])}>Generate more</button>
        <span className="pb-spacer" />
        <button className="pb-btn pb-btn-primary" disabled={!good || saved.size >= good} onClick={saveAll}><i className="fa-solid fa-floppy-disk" /> Save all as drafts</button>
      </> : <>
        <button className="pb-btn" onClick={onClose}>Cancel</button>
        <button className="pb-btn pb-btn-primary" disabled={busy || !languages.length} onClick={generate}>
          {busy ? <span className="pb-spinner" /> : <i className="fa-solid fa-wand-magic-sparkles" />} {busy ? 'Generating…' : `Generate ${count} problem${count > 1 ? 's' : ''}`}
        </button>
      </>}>
      {!drafts.length && <>
        <div className="pb-field-row">
          <div>
            <label className="pb-label">Topic</label>
            <select className="pb-select" value={topic} onChange={(e) => setTopic(e.target.value)} disabled={busy}>
              {meta.topics.map((t) => <option key={t.key} value={t.key}>{t.group} · {t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="pb-label">Difficulty</label>
            <div className="pb-seg">{(['easy', 'medium', 'hard'] as const).map((d) => (
              <button key={d} className={difficulty === d ? 'on' : ''} disabled={busy} onClick={() => setDifficulty(d)}>{d[0].toUpperCase() + d.slice(1)}</button>
            ))}</div>
          </div>
          <div>
            <label className="pb-label">How many</label>
            <select className="pb-select" value={count} onChange={(e) => setCount(Number(e.target.value))} disabled={busy}>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <label className="pb-label">Languages <small>up to 5 · solutions in each are verified</small></label>
        <div className="pb-chips">
          {meta.languages.map((l) => <button key={l.key} disabled={busy} className={`pb-chip ${languages.includes(l.key) ? 'on' : ''}`} onClick={() => toggleLang(l.key)}>{l.label}</button>)}
        </div>
        <label className="pb-label">Instructions <small>optional</small></label>
        <textarea className="pb-textarea" rows={3} disabled={busy} value={instructions} onChange={(e) => setInstructions(e.target.value)}
          placeholder="e.g. A story about a college canteen queue; focus on prefix sums; inputs up to 10^5." />
        {busy && <div className="pb-alert pb-alert-info" style={{ marginTop: 14 }}>
          <span className="pb-spinner" /> Writing the problem, then running the reference solution to produce the answers and checking every language… {elapsed}s
          <div className="pb-help">Usually 1–2 minutes per problem. You can keep this open.</div>
        </div>}
      </>}

      {!!drafts.length && drafts.map((d, i) => (
        <div key={i} className="pb-card" style={{ padding: 14, marginBottom: 10 }}>
          {d.error ? <div className="pb-alert pb-alert-bad" style={{ margin: 0 }}><b>Draft {i + 1} failed:</b> {d.error}</div> : <>
            <div className="pb-row pb-wrap">
              <b style={{ fontSize: 15 }}>{d.draft.title}</b>
              <DifficultyPill d={String(d.draft.difficulty || difficulty)} />
              <span className="pb-tag">{(d.draft.tests || []).length} tests</span>
              <span className="pb-spacer" />
              <button className="pb-btn pb-btn-sm" onClick={() => nav('/problem-bank/new', { state: { draft: draftToProblem(d.draft, meta) } })}><i className="fa-solid fa-pen" /> Open in studio</button>
              <button className="pb-btn pb-btn-sm pb-btn-primary" disabled={saved.has(i)} onClick={() => save(i)}>
                {saved.has(i) ? <><i className="fa-solid fa-check" /> Saved</> : <><i className="fa-solid fa-floppy-disk" /> Save draft</>}
              </button>
            </div>
            <div className="pb-muted" style={{ fontSize: 13, margin: '8px 0', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {String(d.draft.statement || '').replace(/[#*`]/g, '')}
            </div>
            <div className="pb-row pb-wrap" style={{ gap: 6 }}>
              {d.report.map((r) => (
                <span key={r.language} title={r.message} className={`pb-pill ${r.status === 'failed' ? 'pb-badge-bad' : 'pb-badge-ok'}`}>
                  <i className={`fa-solid ${r.status === 'failed' ? 'fa-xmark' : 'fa-check'}`} /> {LANG_SHORT[r.language] || r.language}
                  {r.status === 'reference' ? ' · reference' : r.status === 'failed' ? ' · solution dropped' : ''}
                </span>
              ))}
            </div>
            {d.warnings.map((w, k) => <div key={k} className="pb-help" style={{ color: 'var(--pb-warn)' }}><i className="fa-solid fa-triangle-exclamation" /> {w}</div>)}
          </>}
        </div>
      ))}
      {err && <div className="pb-alert pb-alert-bad">{err}</div>}
    </Modal>
  );
};

export default AiDialog;
