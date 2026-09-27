import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
  emptyProblem, problemBankApi, pbError, PbCustomResult, PbJudgeResult, PbLanguage, PbMeta, PbProblemInput, PbTest, PbVerification,
} from '../../api/problemBankApi';
import {
  DifficultyPill, LANG_SHORT, Markdown, Menu, ScopePill, StatusPill, VERDICT_LABEL, VerifyBadge, useToast,
} from './shared';
import { MONACO_LANG, STARTER_TEMPLATES } from './templates';
import './ProblemBank.css';

/**
 * Problem Studio — author, test and publish one problem.
 *
 * Left: the problem itself (statement, tests, code per language, settings, a learner preview).
 * Right: the Test Lab, which runs code against the problem AS CURRENTLY EDITED — unsaved changes
 * included — so an author can check a test before saving it. Verification (every language's
 * reference solution against every test) runs on the saved problem, in the background.
 *
 * Modelled on how problem setters work on HackerRank (stubs, weighted hidden tests) and
 * Codeforces Polygon (outputs generated from the reference solution, the invocation matrix).
 */

type Tab = 'statement' | 'tests' | 'code' | 'settings' | 'preview';

const CodeBox: React.FC<{ language: string; value: string; onChange?: (v: string) => void; height: number | string; readOnly?: boolean }> =
  ({ language, value, onChange, height, readOnly }) => (
    <Editor
      height={height}
      language={MONACO_LANG[language] || 'plaintext'}
      value={value}
      theme="light"
      onChange={(v) => onChange?.(v || '')}
      options={{
        minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, readOnly,
        tabSize: language === 'python' ? 4 : 2, automaticLayout: true, lineNumbersMinChars: 3, wordWrap: 'on',
      }}
    />
  );

const ProblemStudio: React.FC = () => {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const nav = useNavigate();
  const location = useLocation() as any;
  const toast = useToast();

  const [meta, setMeta] = useState<PbMeta | null>(null);
  const [p, setP] = useState<PbProblemInput>(() => (isNew && location.state?.draft) ? location.state.draft : emptyProblem());
  const [info, setInfo] = useState<{ number?: number; status: string; scope: 'global' | 'tenant'; editable: boolean; verification?: PbVerification; version?: number }>(
    { status: 'draft', scope: 'tenant', editable: true },
  );
  const [loading, setLoading] = useState(!isNew);
  const [loadErr, setLoadErr] = useState('');
  const [dirty, setDirty] = useState(isNew && !!location.state?.draft);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>('statement');
  const [check, setCheck] = useState<{ errors: string[]; warnings: string[]; publishErrors: string[] }>({ errors: [], warnings: [], publishErrors: [] });

  useEffect(() => { problemBankApi.meta().then(setMeta).catch(() => undefined); }, []);

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    problemBankApi.get(id!).then((r) => {
      setP({
        title: r.title, kind: r.kind, statement: r.statement, inputFormat: r.inputFormat, outputFormat: r.outputFormat,
        constraints: r.constraints, hints: r.hints || [], editorial: r.editorial || '', difficulty: r.difficulty, marks: r.marks,
        topics: r.topics || [], tags: r.tags || [], companies: r.companies || [], languages: r.languages || [], sqlSetup: r.sqlSetup || '',
        limits: r.limits || { timeMs: 2000, memoryMb: 256 }, comparisonMode: r.comparisonMode || 'lenient',
        tests: (r.tests || []).map((t: any) => ({ input: t.input, expectedOutput: t.expectedOutput, isSample: t.isSample, weight: t.weight ?? 1, explanation: t.explanation || '' })),
      });
      setInfo({ number: r.number, status: r.status, scope: r.scope, editable: r.editable, verification: r.verification, version: r.version });
      setDirty(false);
    }).catch((e) => setLoadErr(pbError(e, 'Could not load this problem.'))).finally(() => setLoading(false));
  }, [id, isNew]);

  // Keep the readiness checklist current while typing.
  useEffect(() => {
    const t = setTimeout(() => { problemBankApi.validate(p).then(setCheck).catch(() => undefined); }, 700);
    return () => clearTimeout(t);
  }, [p]);

  // Warn before losing unsaved work.
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const edit = useCallback((patch: Partial<PbProblemInput>) => { setP((x) => ({ ...x, ...patch })); setDirty(true); }, []);
  const readOnly = !info.editable;

  const save = useCallback(async (nextStatus?: 'draft' | 'published') => {
    if (readOnly) return;
    setSaving(true);
    try {
      const body = { ...p, ...(nextStatus ? { status: nextStatus } : {}) };
      if (isNew) {
        const r = await problemBankApi.create({ ...body, scope: info.scope });
        setDirty(false);
        toast.show(nextStatus === 'published' ? 'Published.' : 'Saved as draft.');
        nav(`/problem-bank/${r.id}`, { replace: true });
      } else {
        const r = await problemBankApi.update(id!, body);
        setDirty(false);
        setInfo((i) => ({ ...i, status: nextStatus || i.status, verification: r.verification, version: r.version }));
        toast.show(nextStatus === 'published' ? 'Published.' : nextStatus === 'draft' ? 'Moved back to draft.' : 'Saved.');
      }
    } catch (e) { toast.show(pbError(e, 'Could not save.'), true); }
    setSaving(false);
  }, [p, isNew, id, info.scope, readOnly, nav, toast]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (dirty) save(); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [dirty, save]);

  const doAction = async (fn: () => Promise<any>, ok: string, then?: (r: any) => void) => {
    try { const r = await fn(); toast.show(ok); then?.(r); } catch (e) { toast.show(pbError(e), true); }
  };

  if (loading) return <div className="pb-root"><div className="pb-page pb-muted"><span className="pb-spinner" /> Loading problem…</div></div>;
  if (loadErr) return <div className="pb-root"><div className="pb-page"><div className="pb-alert pb-alert-bad">{loadErr}</div>
    <button className="pb-btn" onClick={() => nav('/problem-bank')}><i className="fa-solid fa-arrow-left" /> Back to the bank</button></div></div>;

  const blockers = check.errors.length + check.publishErrors.length;
  const langKeys = p.kind === 'sql' ? ['sql'] : p.languages.map((l) => l.language);

  return (
    <div className="pb-root">
      <div className="pb-studio">
        {/* ── Top bar ── */}
        <div className="pb-studio-bar">
          <button className="pb-btn pb-btn-ghost pb-btn-icon" onClick={() => { if (!dirty || window.confirm('Leave without saving your changes?')) nav('/problem-bank'); }} aria-label="Back">
            <i className="fa-solid fa-arrow-left" />
          </button>
          <span className="pb-muted pb-mono">{info.number ? `#${info.number}` : 'New'}</span>
          <span className="ttl">{p.title || 'Untitled problem'}</span>
          <DifficultyPill d={p.difficulty} />
          <StatusPill s={info.status} />
          {!isNew && <VerifyBadge s={info.verification?.status} />}
          <ScopePill scope={info.scope} />
          {dirty && <span className="pb-pill pb-badge-warn"><span className="pb-dot" /> Unsaved</span>}
          {readOnly && <span className="pb-pill pb-badge-neutral"><i className="fa-solid fa-lock" /> Read-only</span>}
          <span className="pb-spacer" />
          <Menu trigger={
            <button className={`pb-btn pb-btn-sm ${blockers ? '' : 'pb-btn-ghost'}`}>
              {blockers ? <><i className="fa-solid fa-list-check" style={{ color: 'var(--pb-warn)' }} /> {blockers} to fix before publishing</>
                : <><i className="fa-solid fa-circle-check" style={{ color: 'var(--pb-ok)' }} /> Ready to publish</>}
            </button>}>
            {() => (
              <div style={{ padding: 8, maxWidth: 360 }}>
                <b style={{ fontSize: 13 }}>Publishing checklist</b>
                <ul className="pb-checklist" style={{ marginTop: 6 }}>
                  {[...check.errors, ...check.publishErrors].map((m, i) => <li key={`b${i}`}><i className="fa-solid fa-circle-xmark" style={{ color: 'var(--pb-bad)' }} />{m}</li>)}
                  {check.warnings.map((m, i) => <li key={`w${i}`}><i className="fa-solid fa-triangle-exclamation" style={{ color: 'var(--pb-warn)' }} />{m}</li>)}
                  {!blockers && !check.warnings.length && <li><i className="fa-solid fa-circle-check" style={{ color: 'var(--pb-ok)' }} />Everything a learner needs is in place.</li>}
                </ul>
              </div>
            )}
          </Menu>
          {readOnly ? (
            <button className="pb-btn pb-btn-primary" onClick={() => doAction(() => problemBankApi.duplicate(id!), 'Copied to your institute — you can edit the copy.', (r) => nav(`/problem-bank/${r.id}`))}>
              <i className="fa-solid fa-copy" /> Duplicate to edit
            </button>
          ) : <>
            <button className="pb-btn" disabled={saving || (!dirty && !isNew)} onClick={() => save()}>
              {saving ? <span className="pb-spinner" /> : <i className="fa-solid fa-floppy-disk" />} Save{info.status === 'published' ? '' : ' draft'}
            </button>
            {info.status === 'published'
              ? <button className="pb-btn" disabled={saving} onClick={() => save('draft')}><i className="fa-solid fa-eye-slash" /> Unpublish</button>
              : <button className="pb-btn pb-btn-success" disabled={saving || blockers > 0} title={blockers ? 'Fix the checklist items first' : ''} onClick={() => save('published')}>
                  <i className="fa-solid fa-upload" /> Publish</button>}
            {!isNew && (
              <Menu trigger={<button className="pb-btn pb-btn-icon" aria-label="More"><i className="fa-solid fa-ellipsis" /></button>}>
                {(close) => <>
                  <button onClick={() => { close(); doAction(() => problemBankApi.duplicate(id!), 'Duplicated as a draft.', (r) => nav(`/problem-bank/${r.id}`)); }}><i className="fa-solid fa-copy" /> Duplicate</button>
                  {meta?.canEditGlobal && info.scope === 'tenant' && (
                    <button onClick={() => { close(); doAction(() => problemBankApi.promote(id!), 'Moved to the CodeBegun library.', () => setInfo((i) => ({ ...i, scope: 'global' }))); }}><i className="fa-solid fa-globe" /> Move to CodeBegun library</button>
                  )}
                  <hr />
                  <button onClick={() => {
                    close();
                    if (window.confirm('Delete this problem? If it was ever published it is archived instead.')) {
                      doAction(() => problemBankApi.remove(id!), 'Removed.', () => nav('/problem-bank'));
                    }
                  }}><i className="fa-solid fa-trash" style={{ color: 'var(--pb-bad)' }} /> Delete / archive</button>
                </>}
              </Menu>
            )}
          </>}
        </div>

        <div className="pb-studio-body">
          {/* ── Left: the problem ── */}
          <div className="pb-studio-left">
            <div className="pb-tabs" role="tablist">
              {([
                ['statement', 'Statement', null],
                ['tests', 'Test cases', p.tests.length],
                ['code', p.kind === 'sql' ? 'SQL' : 'Code & solutions', p.kind === 'sql' ? null : p.languages.length],
                ['settings', 'Settings', null],
                ['preview', 'Learner preview', null],
              ] as [Tab, string, number | null][]).map(([k, label, cnt]) => (
                <button key={k} role="tab" className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
                  {label}{cnt !== null && <span className="cnt">{cnt}</span>}
                </button>
              ))}
            </div>
            <div className="pb-pane">
              <fieldset disabled={readOnly} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                {tab === 'statement' && <StatementTab p={p} edit={edit} meta={meta} />}
                {tab === 'tests' && <TestsTab p={p} edit={edit} toast={toast.show} />}
                {tab === 'code' && <CodeTab p={p} edit={edit} meta={meta} />}
                {tab === 'settings' && <SettingsTab p={p} edit={edit} meta={meta} isNew={isNew} scope={info.scope} setScope={(s) => setInfo((i) => ({ ...i, scope: s }))} />}
              </fieldset>
              {tab === 'preview' && <PreviewTab p={p} meta={meta} />}
            </div>
          </div>

          {/* ── Right: the Test Lab ── */}
          <TestLab
            p={p} edit={edit} langKeys={langKeys} readOnly={readOnly} problemId={isNew ? undefined : id}
            verification={info.verification} dirty={dirty}
            setVerification={(v) => setInfo((i) => ({ ...i, verification: v }))}
            toast={toast.show}
          />
        </div>
      </div>
      {toast.node}
    </div>
  );
};

/* ═══ Statement ═════════════════════════════════════════════════════════════════════════════ */

const MdField: React.FC<{ label: string; hint?: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }> =
  ({ label, hint, value, onChange, rows = 4, placeholder }) => {
    const [mode, setMode] = useState<'write' | 'preview'>('write');
    return (
      <div>
        <div className="pb-row" style={{ marginTop: 14 }}>
          <label className="pb-label" style={{ margin: 0 }}>{label}{hint && <small>{hint}</small>}</label>
          <span className="pb-spacer" />
          <div className="pb-md-tabs">
            <button type="button" className={mode === 'write' ? 'on' : ''} onClick={() => setMode('write')}>Write</button>
            <button type="button" className={mode === 'preview' ? 'on' : ''} onClick={() => setMode('preview')}>Preview</button>
          </div>
        </div>
        <div style={{ marginTop: 6 }}>
          {mode === 'write'
            ? <textarea className="pb-textarea" rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
            : <div className="pb-card" style={{ padding: '10px 12px', minHeight: 60 }}><Markdown text={value} /></div>}
        </div>
      </div>
    );
  };

const ListInput: React.FC<{ value: string[]; onChange: (v: string[]) => void; placeholder: string }> = ({ value, onChange, placeholder }) => {
  const [draft, setDraft] = useState('');
  const add = () => {
    const parts = draft.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length) onChange(Array.from(new Set([...value, ...parts])));
    setDraft('');
  };
  return (
    <div>
      <div className="pb-chips" style={{ marginBottom: value.length ? 6 : 0 }}>
        {value.map((v) => <span key={v} className="pb-chip on">{v} <i className="fa-solid fa-xmark" style={{ cursor: 'pointer', marginLeft: 4 }} onClick={() => onChange(value.filter((x) => x !== v))} /></span>)}
      </div>
      <input className="pb-input" value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)} onBlur={add}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }} />
    </div>
  );
};

const StatementTab: React.FC<{ p: PbProblemInput; edit: (x: Partial<PbProblemInput>) => void; meta: PbMeta | null }> = ({ p, edit, meta }) => {
  const [showTopics, setShowTopics] = useState(false);
  const topicLabel = useMemo(() => Object.fromEntries((meta?.topics || []).map((t) => [t.key, t.label])), [meta]);
  const groups = useMemo(() => {
    const g: Record<string, { key: string; label: string }[]> = {};
    (meta?.topics || []).forEach((t) => { (g[t.group] = g[t.group] || []).push(t); });
    return g;
  }, [meta]);
  const toggleTopic = (k: string) => edit({ topics: p.topics.includes(k) ? p.topics.filter((x) => x !== k) : [...p.topics, k] });
  const defaultMarks = meta?.defaultMarks?.[p.difficulty];

  return (
    <div>
      <label className="pb-label">Title</label>
      <input className="pb-input" style={{ fontSize: 16, fontWeight: 650 }} value={p.title} maxLength={200} placeholder="e.g. Longest Substring Without Repeating Characters"
        onChange={(e) => edit({ title: e.target.value })} />

      <div className="pb-field-row">
        <div>
          <label className="pb-label">Difficulty</label>
          <div className="pb-seg">{(['easy', 'medium', 'hard'] as const).map((d) => (
            <button type="button" key={d} className={p.difficulty === d ? 'on' : ''}
              onClick={() => edit({ difficulty: d, ...(p.marks === meta?.defaultMarks?.[p.difficulty] ? { marks: meta?.defaultMarks?.[d] ?? p.marks } : {}) })}>
              {d[0].toUpperCase() + d.slice(1)}</button>
          ))}</div>
        </div>
        <div>
          <label className="pb-label">Marks <small>default {defaultMarks ?? '—'} for {p.difficulty}</small></label>
          <input className="pb-input" type="number" min={0} value={p.marks} onChange={(e) => edit({ marks: Number(e.target.value) })} />
        </div>
      </div>

      <label className="pb-label">Topics</label>
      <div className="pb-chips">
        {p.topics.map((t) => <button type="button" key={t} className="pb-chip on" onClick={() => toggleTopic(t)}>{topicLabel[t] || t} <i className="fa-solid fa-xmark" /></button>)}
        <button type="button" className="pb-chip" onClick={() => setShowTopics((s) => !s)}><i className={`fa-solid ${showTopics ? 'fa-chevron-up' : 'fa-plus'}`} /> {showTopics ? 'Done' : 'Add topics'}</button>
      </div>
      {showTopics && (
        <div className="pb-card" style={{ padding: 12, marginTop: 8 }}>
          {Object.entries(groups).map(([g, ts]) => (
            <div key={g} style={{ marginBottom: 8 }}>
              <div className="pb-faint" style={{ fontSize: 11.5, fontWeight: 750, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 5 }}>{g}</div>
              <div className="pb-chips">{ts.map((t) => <button type="button" key={t.key} className={`pb-chip ${p.topics.includes(t.key) ? 'on' : ''}`} onClick={() => toggleTopic(t.key)}>{t.label}</button>)}</div>
            </div>
          ))}
        </div>
      )}

      <div className="pb-field-row">
        <div><label className="pb-label">Tags <small>free text</small></label><ListInput value={p.tags} onChange={(v) => edit({ tags: v })} placeholder="Type and press Enter" /></div>
        <div><label className="pb-label">Companies <small>asked at</small></label><ListInput value={p.companies} onChange={(v) => edit({ companies: v })} placeholder="e.g. TCS, Infosys, Amazon" /></div>
      </div>

      <MdField label="Problem statement" hint="markdown · `code`, **bold**, lists, ```blocks```" rows={9} value={p.statement} onChange={(v) => edit({ statement: v })}
        placeholder="Describe the task. Keep input/output details for the sections below." />
      <div className="pb-field-row">
        <MdField label="Input format" rows={3} value={p.inputFormat} onChange={(v) => edit({ inputFormat: v })} placeholder="The first line contains n…" />
        <MdField label="Output format" rows={3} value={p.outputFormat} onChange={(v) => edit({ outputFormat: v })} placeholder="Print a single integer…" />
      </div>
      <MdField label="Constraints" rows={3} value={p.constraints} onChange={(v) => edit({ constraints: v })} placeholder={'- 1 <= n <= 10^5\n- -10^9 <= a[i] <= 10^9'} />

      <label className="pb-label">Hints <small>revealed one at a time to learners</small></label>
      {p.hints.map((h, i) => (
        <div key={i} className="pb-row" style={{ marginBottom: 6 }}>
          <span className="pb-muted" style={{ width: 22 }}>{i + 1}.</span>
          <input className="pb-input" value={h} onChange={(e) => edit({ hints: p.hints.map((x, k) => k === i ? e.target.value : x) })} />
          <button type="button" className="pb-btn pb-btn-ghost pb-btn-icon" onClick={() => edit({ hints: p.hints.filter((_, k) => k !== i) })} aria-label="Remove hint"><i className="fa-solid fa-trash" /></button>
        </div>
      ))}
      {p.hints.length < 10 && <button type="button" className="pb-btn pb-btn-sm" onClick={() => edit({ hints: [...p.hints, ''] })}><i className="fa-solid fa-plus" /> Add hint</button>}

      <MdField label="Editorial" hint="approach & complexity · shown after solving" rows={5} value={p.editorial} onChange={(v) => edit({ editorial: v })} />
    </div>
  );
};

/* ═══ Tests ═════════════════════════════════════════════════════════════════════════════════ */

const TestsTab: React.FC<{ p: PbProblemInput; edit: (x: Partial<PbProblemInput>) => void; toast: (m: string, bad?: boolean) => void }> = ({ p, edit, toast }) => {
  const [bulk, setBulk] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [genLang, setGenLang] = useState('');
  const [generating, setGenerating] = useState(false);
  const withSolution = p.languages.filter((l) => l.solutionCode.trim()).map((l) => l.language);
  useEffect(() => { if (!withSolution.includes(genLang)) setGenLang(withSolution[0] || ''); }, [withSolution.join(','), genLang]); // eslint-disable-line react-hooks/exhaustive-deps

  const setTest = (i: number, patch: Partial<PbTest>) => edit({ tests: p.tests.map((t, k) => k === i ? { ...t, ...patch } : t) });
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= p.tests.length) return;
    const next = [...p.tests];
    [next[i], next[j]] = [next[j], next[i]];
    edit({ tests: next });
  };
  const add = (isSample: boolean) => edit({ tests: [...p.tests, { input: '', expectedOutput: '', isSample, weight: 1, explanation: '' }] });

  const addBulk = () => {
    // Blocks separated by a line of ---; within a block, input and output separated by a line of ===
    const blocks = bulkText.replace(/\r\n?/g, '\n').split(/\n-{3,}\n/).map((b) => b.trim()).filter(Boolean);
    const tests = blocks.map((b) => {
      const [inp, out] = b.split(/\n={3,}\n/);
      return { input: (inp || '').trim(), expectedOutput: (out || '').trim(), isSample: false, weight: 1, explanation: '' };
    });
    if (!tests.length) { toast('Nothing to add — see the format above the box.', true); return; }
    edit({ tests: [...p.tests, ...tests] });
    setBulk(false); setBulkText('');
    toast(`Added ${tests.length} test${tests.length === 1 ? '' : 's'}.`);
  };

  const generate = async (onlyEmpty: boolean) => {
    if (!genLang) { toast('Add a reference solution in the Code tab first.', true); return; }
    setGenerating(true);
    try {
      const r = await problemBankApi.fillOutputs(p, genLang, onlyEmpty);
      edit({ tests: r.tests });
      toast(r.failures.length ? `Filled ${r.filled}; ${r.failures.length} failed (see test ${r.failures[0].index + 1}).` : `Filled ${r.filled} expected output${r.filled === 1 ? '' : 's'}.`, !!r.failures.length);
    } catch (e) { toast(pbError(e), true); }
    setGenerating(false);
  };

  const samples = p.tests.filter((t) => t.isSample).length;
  const totalWeight = p.tests.reduce((s, t) => s + (t.weight || 0), 0) || 1;

  return (
    <div>
      <div className="pb-row pb-wrap" style={{ marginTop: 14 }}>
        <span className="pb-muted"><b style={{ color: 'var(--pb-ink)' }}>{p.tests.length}</b> tests · {samples} sample · {p.tests.length - samples} hidden</span>
        <span className="pb-spacer" />
        <button type="button" className="pb-btn pb-btn-sm" onClick={() => add(true)}><i className="fa-solid fa-eye" /> Add sample</button>
        <button type="button" className="pb-btn pb-btn-sm" onClick={() => add(false)}><i className="fa-solid fa-eye-slash" /> Add hidden</button>
        <button type="button" className="pb-btn pb-btn-sm" onClick={() => setBulk((b) => !b)}><i className="fa-solid fa-paste" /> Bulk add</button>
      </div>

      <div className="pb-card" style={{ padding: 12, marginTop: 10, background: 'var(--pb-soft)' }}>
        <div className="pb-row pb-wrap">
          <i className="fa-solid fa-wand-magic-sparkles" style={{ color: 'var(--pb-accent)' }} />
          <b style={{ fontSize: 13 }}>Expected outputs from the reference solution</b>
          <span className="pb-spacer" />
          <select className="pb-select" style={{ width: 'auto' }} value={genLang} onChange={(e) => setGenLang(e.target.value)} disabled={!withSolution.length}>
            {!withSolution.length && <option value="">No solution yet</option>}
            {withSolution.map((l) => <option key={l} value={l}>{LANG_SHORT[l] || l} solution</option>)}
          </select>
          <button type="button" className="pb-btn pb-btn-sm" disabled={generating || !genLang} onClick={() => generate(true)}>
            {generating ? <span className="pb-spinner" /> : <i className="fa-solid fa-fill" />} Fill empty</button>
          <button type="button" className="pb-btn pb-btn-sm" disabled={generating || !genLang} onClick={() => generate(false)}>Regenerate all</button>
        </div>
        <div className="pb-help">Write only the inputs; the judge runs your solution to produce the answers — the way Codeforces problem setters work.</div>
      </div>

      {bulk && (
        <div className="pb-card" style={{ padding: 12, marginTop: 10 }}>
          <div className="pb-help" style={{ marginTop: 0 }}>One test per block. Separate blocks with a line of <code>---</code>; inside a block put the input, a line of <code>===</code>, then the output (leave the output out to generate it).</div>
          <textarea className="pb-textarea pb-mono" rows={8} value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder={'5\n1 2 3 4 5\n===\n15\n---\n3\n-1 0 1\n===\n0'} />
          <div className="pb-row" style={{ marginTop: 8 }}>
            <span className="pb-spacer" />
            <button type="button" className="pb-btn pb-btn-sm" onClick={() => setBulk(false)}>Cancel</button>
            <button type="button" className="pb-btn pb-btn-sm pb-btn-primary" onClick={addBulk}>Add tests</button>
          </div>
        </div>
      )}

      {p.tests.map((t, i) => (
        <div key={i} className={`pb-test ${t.isSample ? 'sample' : ''}`}>
          <div className="pb-test-head">
            <b>#{i + 1}</b>
            <label className="pb-switch"><input type="checkbox" checked={t.isSample} onChange={(e) => setTest(i, { isSample: e.target.checked })} />
              {t.isSample ? <span style={{ color: 'var(--pb-accent-ink)' }}>Sample — shown to learners</span> : <span className="pb-muted">Hidden</span>}</label>
            <span className="pb-spacer" />
            <span className="pb-faint" style={{ fontSize: 12 }}>{Math.round(((t.weight || 0) / totalWeight) * 100)}% of marks</span>
            <label className="pb-row" style={{ gap: 5, fontSize: 12.5 }}>Weight
              <input className="pb-input" type="number" min={0} step={1} style={{ width: 64, padding: '4px 7px' }} value={t.weight} onChange={(e) => setTest(i, { weight: Number(e.target.value) })} /></label>
            <button type="button" className="pb-btn pb-btn-ghost pb-btn-icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><i className="fa-solid fa-arrow-up" /></button>
            <button type="button" className="pb-btn pb-btn-ghost pb-btn-icon" disabled={i === p.tests.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><i className="fa-solid fa-arrow-down" /></button>
            <button type="button" className="pb-btn pb-btn-ghost pb-btn-icon" onClick={() => edit({ tests: p.tests.filter((_, k) => k !== i) })} aria-label="Delete test"><i className="fa-solid fa-trash" /></button>
          </div>
          <div className="pb-test-grid">
            <div><div className="pb-faint" style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>{p.kind === 'sql' ? 'DATASET (SQL run before the query)' : 'INPUT (stdin)'}</div>
              <textarea className="pb-textarea pb-mono" value={t.input} onChange={(e) => setTest(i, { input: e.target.value })} spellCheck={false} /></div>
            <div><div className="pb-faint" style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>EXPECTED OUTPUT</div>
              <textarea className="pb-textarea pb-mono" value={t.expectedOutput} onChange={(e) => setTest(i, { expectedOutput: e.target.value })} spellCheck={false}
                placeholder="Leave empty to generate from the solution" /></div>
          </div>
          {t.isSample && (
            <div style={{ padding: '0 12px 10px' }}>
              <input className="pb-input" value={t.explanation} placeholder="Explanation shown under this example (optional)" onChange={(e) => setTest(i, { explanation: e.target.value })} />
            </div>
          )}
        </div>
      ))}
      {!p.tests.length && <div className="pb-empty pb-muted">No tests yet. Add a sample so learners see an example, then hidden tests for the edge cases.</div>}
    </div>
  );
};

/* ═══ Code & solutions ══════════════════════════════════════════════════════════════════════ */

const CodeTab: React.FC<{ p: PbProblemInput; edit: (x: Partial<PbProblemInput>) => void; meta: PbMeta | null }> = ({ p, edit, meta }) => {
  const [active, setActive] = useState(p.languages[0]?.language || '');
  const [advanced, setAdvanced] = useState(false);
  useEffect(() => { if (!p.languages.some((l) => l.language === active)) setActive(p.languages[0]?.language || ''); }, [p.languages, active]);

  if (p.kind === 'sql') {
    const l = p.languages[0] || { language: 'sql', starterCode: '', solutionCode: '', headerCode: '', footerCode: '' };
    const setL = (patch: any) => edit({ languages: [{ ...l, ...patch, language: 'sql' }] });
    return (
      <div>
        <label className="pb-label">Schema <small>hidden · runs before every test's dataset</small></label>
        <div className="pb-editor-box"><CodeBox language="sql" value={p.sqlSetup} onChange={(v) => edit({ sqlSetup: v })} height={160} /></div>
        <label className="pb-label">Starter query <small>what learners see</small></label>
        <div className="pb-editor-box"><CodeBox language="sql" value={l.starterCode} onChange={(v) => setL({ starterCode: v })} height={120} /></div>
        <label className="pb-label">Reference query <small>never shown · used to generate outputs and verify</small></label>
        <div className="pb-editor-box"><CodeBox language="sql" value={l.solutionCode} onChange={(v) => setL({ solutionCode: v })} height={160} /></div>
      </div>
    );
  }

  const enabled = new Set(p.languages.map((l) => l.language));
  const toggle = (k: string) => {
    if (enabled.has(k)) edit({ languages: p.languages.filter((l) => l.language !== k) });
    else { edit({ languages: [...p.languages, { language: k, starterCode: STARTER_TEMPLATES[k] || '', solutionCode: '', headerCode: '', footerCode: '' }] }); setActive(k); }
  };
  const enableAll = () => {
    const add = (meta?.languages || []).filter((l) => !enabled.has(l.key))
      .map((l) => ({ language: l.key, starterCode: STARTER_TEMPLATES[l.key] || '', solutionCode: '', headerCode: '', footerCode: '' }));
    edit({ languages: [...p.languages, ...add] });
  };
  const cur = p.languages.find((l) => l.language === active);
  const setCur = (patch: Partial<PbLanguage>) => edit({ languages: p.languages.map((l) => l.language === active ? { ...l, ...patch } : l) });

  return (
    <div>
      <label className="pb-label">Languages learners can use</label>
      <div className="pb-chips">
        {(meta?.languages || []).map((l) => (
          <button type="button" key={l.key} className={`pb-chip ${enabled.has(l.key) ? 'on' : ''}`} onClick={() => toggle(l.key)}>
            {enabled.has(l.key) && <i className="fa-solid fa-check" />} {l.label}
          </button>
        ))}
        <button type="button" className="pb-chip" onClick={enableAll}><i className="fa-solid fa-layer-group" /> All languages</button>
      </div>

      {!p.languages.length ? <div className="pb-empty pb-muted">Enable at least one language above.</div> : <>
        <div className="pb-lang-tabs">
          {p.languages.map((l) => (
            <button type="button" key={l.language} className={active === l.language ? 'on' : ''} onClick={() => setActive(l.language)}>
              {LANG_SHORT[l.language] || l.language}
              {l.solutionCode.trim()
                ? <i className="fa-solid fa-circle-check" title="Has a reference solution" style={{ color: active === l.language ? '#a7f3d0' : 'var(--pb-ok)' }} />
                : <i className="fa-regular fa-circle" title="No reference solution" style={{ opacity: .5 }} />}
            </button>
          ))}
        </div>
        {cur && <>
          <div className="pb-editor-box">
            <div className="pb-editor-cap"><i className="fa-solid fa-eye" /> Starter code <span className="pb-faint" style={{ fontWeight: 500 }}>— what learners start from</span>
              <span className="pb-spacer" /><button type="button" className="pb-btn pb-btn-ghost pb-btn-sm" onClick={() => setCur({ starterCode: STARTER_TEMPLATES[cur.language] || '' })}>Reset to template</button></div>
            <CodeBox language={cur.language} value={cur.starterCode} onChange={(v) => setCur({ starterCode: v })} height={220} />
          </div>
          <div className="pb-editor-box" style={{ marginTop: 12 }}>
            <div className="pb-editor-cap"><i className="fa-solid fa-key" /> Reference solution <span className="pb-faint" style={{ fontWeight: 500 }}>— never shown; generates outputs & verifies</span></div>
            <CodeBox language={cur.language} value={cur.solutionCode} onChange={(v) => setCur({ solutionCode: v })} height={260} />
          </div>
          <button type="button" className="pb-btn pb-btn-ghost pb-btn-sm" style={{ marginTop: 10 }} onClick={() => setAdvanced((a) => !a)}>
            <i className={`fa-solid fa-chevron-${advanced ? 'down' : 'right'}`} /> Hidden wrapper code (function-style problems)
            {(cur.headerCode.trim() || cur.footerCode.trim()) && <span className="pb-pill pb-badge-accent">in use</span>}
          </button>
          {advanced && <>
            <div className="pb-help">For "implement this function" problems: the header (imports, the driver's class) runs before the learner's code and the footer (reading input, calling their function, printing) after it. Learners never see either. For Java, put imports and <code>public class Main</code> with <code>main()</code> in the header — the first class in the file is the one that runs.</div>
            <div className="pb-editor-box" style={{ marginTop: 8 }}>
              <div className="pb-editor-cap"><i className="fa-solid fa-arrow-up" /> Header — before the learner's code</div>
              <CodeBox language={cur.language} value={cur.headerCode} onChange={(v) => setCur({ headerCode: v })} height={140} />
            </div>
            <div className="pb-editor-box" style={{ marginTop: 10 }}>
              <div className="pb-editor-cap"><i className="fa-solid fa-arrow-down" /> Footer — after the learner's code</div>
              <CodeBox language={cur.language} value={cur.footerCode} onChange={(v) => setCur({ footerCode: v })} height={160} />
            </div>
          </>}
        </>}
      </>}
    </div>
  );
};

/* ═══ Settings ══════════════════════════════════════════════════════════════════════════════ */

const COMPARISON = [
  ['lenient', 'Lenient (recommended)', 'Ignores trailing spaces, extra spaces between tokens and trailing blank lines.'],
  ['exact', 'Exact', 'Byte-for-byte apart from trailing newlines. For formatting-sensitive problems (patterns).'],
  ['case_insensitive', 'Case-insensitive', 'Lenient, and "YES" matches "yes".'],
  ['numeric', 'Numeric tolerance', 'Numbers match within 1e-6 — for floating-point answers.'],
] as const;

const SettingsTab: React.FC<{
  p: PbProblemInput; edit: (x: Partial<PbProblemInput>) => void; meta: PbMeta | null; isNew: boolean;
  scope: 'global' | 'tenant'; setScope: (s: 'global' | 'tenant') => void;
}> = ({ p, edit, meta, isNew, scope, setScope }) => (
  <div>
    <label className="pb-label">Problem type</label>
    <div className="pb-seg">
      <button type="button" className={p.kind === 'code' ? 'on' : ''} onClick={() => edit({ kind: 'code', languages: p.kind === 'code' ? p.languages : [] })}>Program (stdin → stdout)</button>
      <button type="button" className={p.kind === 'sql' ? 'on' : ''} onClick={() => edit({ kind: 'sql', languages: [{ language: 'sql', starterCode: STARTER_TEMPLATES.sql, solutionCode: '', headerCode: '', footerCode: '' }] })}>SQL query</button>
    </div>

    <div className="pb-field-row">
      <div>
        <label className="pb-label">Time limit <small>ms per test</small></label>
        <input className="pb-input" type="number" min={250} max={20000} step={250} value={p.limits.timeMs} onChange={(e) => edit({ limits: { ...p.limits, timeMs: Number(e.target.value) } })} />
      </div>
      <div>
        <label className="pb-label">Memory limit <small>MB</small></label>
        <input className="pb-input" type="number" min={32} max={1024} step={32} value={p.limits.memoryMb} onChange={(e) => edit({ limits: { ...p.limits, memoryMb: Number(e.target.value) } })} />
      </div>
    </div>

    <label className="pb-label">Output comparison</label>
    {COMPARISON.map(([k, label, help]) => (
      <label key={k} className="pb-card" style={{ display: 'flex', gap: 10, padding: '10px 12px', marginBottom: 6, cursor: 'pointer', borderColor: p.comparisonMode === k ? 'var(--pb-accent-line)' : undefined, background: p.comparisonMode === k ? 'var(--pb-accent-soft)' : undefined }}>
        <input type="radio" name="cmp" checked={p.comparisonMode === k} onChange={() => edit({ comparisonMode: k })} style={{ accentColor: 'var(--pb-accent)', marginTop: 3 }} />
        <span><b style={{ fontSize: 13.5 }}>{label}</b><div className="pb-muted" style={{ fontSize: 12.5 }}>{help}</div></span>
      </label>
    ))}

    <label className="pb-label">Owner</label>
    {isNew ? (
      <div className="pb-seg">
        <button type="button" className={scope === 'tenant' ? 'on' : ''} onClick={() => setScope('tenant')}><i className="fa-solid fa-building" /> My institute</button>
        <button type="button" className={scope === 'global' ? 'on' : ''} disabled={!meta?.canEditGlobal} title={meta?.canEditGlobal ? '' : 'Only CodeBegun super admins add to the global library'}
          onClick={() => setScope('global')}><i className="fa-solid fa-globe" /> CodeBegun library</button>
      </div>
    ) : <div><ScopePill scope={scope} /></div>}
    <div className="pb-help">CodeBegun library problems are available to every institute and only editable by CodeBegun. Institute problems are private to your institute.</div>
  </div>
);

/* ═══ Learner preview ═══════════════════════════════════════════════════════════════════════ */

const PreviewTab: React.FC<{ p: PbProblemInput; meta: PbMeta | null }> = ({ p, meta }) => {
  const [hint, setHint] = useState(0);
  const topicLabel = Object.fromEntries((meta?.topics || []).map((t) => [t.key, t.label]));
  const samples = p.tests.filter((t) => t.isSample);
  return (
    <div className="pb-preview">
      <div className="pb-alert pb-alert-info" style={{ marginTop: 12 }}><i className="fa-solid fa-eye" /> This is what a learner sees. Hidden tests, solutions and wrapper code are not shown.</div>
      <h2>{p.title || 'Untitled problem'}</h2>
      <div className="pb-row pb-wrap" style={{ marginBottom: 12 }}>
        <DifficultyPill d={p.difficulty} /><span className="pb-tag">{p.marks} marks</span>
        {p.topics.map((t) => <span key={t} className="pb-tag">{topicLabel[t] || t}</span>)}
      </div>
      <Markdown text={p.statement} empty="No statement yet." />
      {p.inputFormat && <><h3 style={{ marginTop: 16 }}>Input</h3><Markdown text={p.inputFormat} /></>}
      {p.outputFormat && <><h3 style={{ marginTop: 16 }}>Output</h3><Markdown text={p.outputFormat} /></>}
      {samples.map((t, i) => (
        <div key={i} className="pb-sample">
          <div className="pb-sample-head">Example {i + 1}</div>
          <div className="pb-sample-body">
            <div><span className="pb-faint" style={{ fontSize: 11.5, fontWeight: 750 }}>INPUT</span><pre className="pb-mono">{t.input}</pre></div>
            <div><span className="pb-faint" style={{ fontSize: 11.5, fontWeight: 750 }}>OUTPUT</span><pre className="pb-mono">{t.expectedOutput}</pre></div>
          </div>
          {t.explanation && <div style={{ padding: '8px 12px', borderTop: '1px solid var(--pb-line)', fontSize: 13 }}><b>Explanation:</b> {t.explanation}</div>}
        </div>
      ))}
      {p.constraints && <><h3 style={{ marginTop: 16 }}>Constraints</h3><Markdown text={p.constraints} /></>}
      {!!p.hints.filter(Boolean).length && (
        <div style={{ marginTop: 16 }}>
          {p.hints.filter(Boolean).slice(0, hint).map((h, i) => <div key={i} className="pb-alert pb-alert-warn"><b>Hint {i + 1}:</b> {h}</div>)}
          {hint < p.hints.filter(Boolean).length && <button className="pb-btn pb-btn-sm" onClick={() => setHint(hint + 1)}><i className="fa-solid fa-lightbulb" /> Show hint {hint + 1}</button>}
        </div>
      )}
    </div>
  );
};

/* ═══ Test Lab ══════════════════════════════════════════════════════════════════════════════ */

const TestLab: React.FC<{
  p: PbProblemInput; edit: (x: Partial<PbProblemInput>) => void; langKeys: string[]; readOnly: boolean; problemId?: string;
  verification?: PbVerification; setVerification: (v: PbVerification) => void; dirty: boolean; toast: (m: string, bad?: boolean) => void;
}> = ({ p, edit, langKeys, readOnly, problemId, verification, setVerification, dirty, toast }) => {
  const [lang, setLang] = useState(langKeys[0] || '');
  const [buffers, setBuffers] = useState<Record<string, string>>({});
  const [running, setRunning] = useState<'' | 'samples' | 'all' | 'custom'>('');
  const [result, setResult] = useState<PbJudgeResult | null>(null);
  const [custom, setCustom] = useState<PbCustomResult | null>(null);
  const [stdin, setStdin] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [sel, setSel] = useState(0);
  const [view, setView] = useState<'run' | 'verify'>('run');
  const poll = useRef<any>();

  useEffect(() => { if (!langKeys.includes(lang)) setLang(langKeys[0] || ''); }, [langKeys, lang]);
  const langDef = p.languages.find((l) => l.language === lang);
  const code = buffers[lang] ?? (langDef?.solutionCode || langDef?.starterCode || '');
  const setCode = (v: string) => setBuffers((b) => ({ ...b, [lang]: v }));

  const run = async (mode: 'samples' | 'all') => {
    setRunning(mode); setCustom(null); setView('run');
    try { const r = await problemBankApi.run({ draft: p, language: lang, code, mode }); setResult(r); setSel(r.cases.findIndex((c) => !c.passed) >= 0 ? r.cases.findIndex((c) => !c.passed) : 0); }
    catch (e) { toast(pbError(e, 'Run failed.'), true); }
    setRunning('');
  };
  const runCustom = async () => {
    setRunning('custom'); setResult(null); setView('run');
    try { setCustom(await problemBankApi.runCustom({ draft: p, language: lang, code, stdin })); }
    catch (e) { toast(pbError(e, 'Run failed.'), true); }
    setRunning('');
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && lang && !running) { e.preventDefault(); run('samples'); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  // Follow a verification that is queued or running.
  useEffect(() => {
    clearInterval(poll.current);
    if (!problemId || !verification || !['queued', 'running'].includes(verification.status)) return;
    poll.current = setInterval(async () => {
      try {
        const v = await problemBankApi.verification(problemId);
        setVerification(v);
        if (!['queued', 'running'].includes(v.status)) clearInterval(poll.current);
      } catch { clearInterval(poll.current); }
    }, 3000);
    return () => clearInterval(poll.current);
  }, [problemId, verification?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const verify = async () => {
    if (!problemId) return;
    if (dirty) { toast('Save first — verification runs on the saved problem.', true); return; }
    setView('verify');
    try { setVerification({ ...(await problemBankApi.verify(problemId)), byLanguage: verification?.byLanguage || [] }); }
    catch (e) { toast(pbError(e), true); }
  };

  const useAsSolution = () => {
    edit({ languages: p.languages.map((l) => l.language === lang ? { ...l, solutionCode: code } : l) });
    toast(`Saved as the ${LANG_SHORT[lang] || lang} reference solution (remember to save the problem).`);
  };

  const c = result?.cases[sel];
  return (
    <div className="pb-studio-right">
      <div className="pb-lab-top">
        <b><i className="fa-solid fa-flask" style={{ color: 'var(--pb-accent)' }} /> Test lab</b>
        <span className="pb-spacer" />
        {langKeys.length ? (
          <select className="pb-select" style={{ width: 'auto' }} value={lang} onChange={(e) => setLang(e.target.value)}>
            {langKeys.map((k) => <option key={k} value={k}>{LANG_SHORT[k] || k}</option>)}
          </select>
        ) : <span className="pb-muted" style={{ fontSize: 13 }}>Enable a language in Code & solutions</span>}
        <Menu trigger={<button className="pb-btn pb-btn-sm" disabled={!langDef}><i className="fa-solid fa-code" /> Load…</button>}>
          {(close) => <>
            <button onClick={() => { close(); setCode(langDef?.starterCode || ''); }}><i className="fa-solid fa-eye" /> Starter code</button>
            <button onClick={() => { close(); setCode(langDef?.solutionCode || ''); }}><i className="fa-solid fa-key" /> Reference solution</button>
          </>}
        </Menu>
        {!readOnly && <button className="pb-btn pb-btn-sm" disabled={!langDef || !code.trim()} onClick={useAsSolution} title="Store this code as the reference solution"><i className="fa-solid fa-thumbtack" /> Use as solution</button>}
      </div>
      <div className="pb-lab-editor">
        {lang ? <CodeBox language={lang} value={code} onChange={setCode} height="100%" /> : <div className="pb-empty pb-muted">No language enabled yet.</div>}
      </div>
      <div className="pb-lab-actions">
        <button className="pb-btn pb-btn-sm" disabled={!lang || !!running} onClick={() => run('samples')} title="Ctrl+Enter">
          {running === 'samples' ? <span className="pb-spinner" /> : <i className="fa-solid fa-play" />} Run samples</button>
        <button className="pb-btn pb-btn-sm pb-btn-primary" disabled={!lang || !!running} onClick={() => run('all')}>
          {running === 'all' ? <span className="pb-spinner" /> : <i className="fa-solid fa-list-check" />} Run all tests</button>
        <button className={`pb-btn pb-btn-sm ${showCustom ? 'pb-btn-ghost' : ''}`} onClick={() => setShowCustom((s) => !s)}><i className="fa-solid fa-terminal" /> Custom input</button>
        <span className="pb-spacer" />
        {problemId && !readOnly && (
          <button className="pb-btn pb-btn-sm" onClick={verify} disabled={['queued', 'running'].includes(verification?.status || '')}>
            {['queued', 'running'].includes(verification?.status || '') ? <span className="pb-spinner" /> : <i className="fa-solid fa-shield-halved" />} Verify all languages
          </button>
        )}
      </div>
      {showCustom && (
        <div style={{ padding: '10px 14px', background: '#fff', borderBottom: '1px solid var(--pb-line)' }}>
          <textarea className="pb-textarea pb-mono" rows={3} value={stdin} onChange={(e) => setStdin(e.target.value)} placeholder={p.kind === 'sql' ? 'Dataset SQL to run before the query' : 'stdin'} />
          <div className="pb-row" style={{ marginTop: 6 }}><span className="pb-spacer" />
            <button className="pb-btn pb-btn-sm" disabled={!lang || !!running} onClick={runCustom}>{running === 'custom' ? <span className="pb-spinner" /> : <i className="fa-solid fa-play" />} Run with this input</button></div>
        </div>
      )}

      <div className="pb-lab-out">
        {problemId && (
          <div className="pb-seg" style={{ marginBottom: 10 }}>
            <button className={view === 'run' ? 'on' : ''} onClick={() => setView('run')}>Run results</button>
            <button className={view === 'verify' ? 'on' : ''} onClick={() => setView('verify')}>Verification</button>
          </div>
        )}

        {view === 'verify' && problemId ? (
          <div>
            <div className="pb-row" style={{ marginBottom: 8 }}><VerifyBadge s={verification?.status} /><span className="pb-muted" style={{ fontSize: 13 }}>{verification?.message}</span></div>
            {verification?.byLanguage?.length ? (
              <div className="pb-card"><table className="pb-matrix">
                <thead><tr><th>Language</th><th>Result</th><th>Tests</th><th>Slowest</th><th>Detail</th></tr></thead>
                <tbody>{verification.byLanguage.map((b) => (
                  <tr key={b.language}>
                    <td><b>{LANG_SHORT[b.language] || b.language}</b></td>
                    <td><span className={`pb-pill ${b.verdict === 'AC' ? 'pb-badge-ok' : b.verdict === 'BUSY' ? 'pb-badge-warn' : 'pb-badge-bad'}`}>{VERDICT_LABEL[b.verdict] || b.verdict}</span></td>
                    <td>{b.passed}/{b.total}</td>
                    <td className="pb-muted">{b.timeMs ? `${b.timeMs} ms` : '—'}</td>
                    <td className="pb-muted" style={{ fontSize: 12.5 }}>{b.message || ''}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            ) : <div className="pb-muted" style={{ fontSize: 13 }}>Runs every language's reference solution against every test — the check that every answer in this problem is right. Languages without a solution are skipped.</div>}
          </div>
        ) : running ? (
          <div className="pb-muted"><span className="pb-spinner" /> Running on the judge…</div>
        ) : custom ? (
          <div>
            <div className={`pb-verdict pb-v-${custom.verdict}`}><b>{VERDICT_LABEL[custom.verdict] || custom.verdict}</b>{!!custom.timeMs && <span>{custom.timeMs} ms</span>}</div>
            <div className="pb-io"><div className="k">Output</div><pre className="pb-mono console">{custom.output || '(no output)'}</pre></div>
            {custom.error && <div className="pb-io"><div className="k">Errors</div><pre className="pb-mono err">{custom.error}</pre></div>}
          </div>
        ) : result ? (
          <div>
            <div className={`pb-verdict pb-v-${result.verdict}`}>
              <b>{VERDICT_LABEL[result.verdict] || result.verdict}</b>
              <span>{result.passed}/{result.total} passed</span>
              <span className="pb-spacer" />
              <span>{result.score} / {result.maxScore} marks</span>
              {!!result.timeMs && <span>· {result.timeMs} ms</span>}
            </div>
            {result.compileError ? <div className="pb-io"><div className="k">Compiler</div><pre className="pb-mono err">{result.compileError}</pre></div> : <>
              <div className="pb-case-strip">
                {result.cases.map((cs, i) => (
                  <button key={i} className={`pb-case-dot ${cs.passed ? 'pass' : 'fail'} ${sel === i ? 'sel' : ''}`} onClick={() => setSel(i)} title={VERDICT_LABEL[cs.verdict]}>
                    {cs.isSample ? 'S' : ''}{i + 1} {cs.passed ? '✓' : '✗'}
                  </button>
                ))}
              </div>
              {c && <>
                <div className="pb-row" style={{ marginBottom: 8, fontSize: 13 }}>
                  <b>Test {sel + 1}</b>{c.isSample && <span className="pb-tag">sample</span>}
                  <span className={`pb-pill ${c.passed ? 'pb-badge-ok' : 'pb-badge-bad'}`}>{VERDICT_LABEL[c.verdict]}</span>
                  {!!c.timeMs && <span className="pb-muted">{c.timeMs} ms</span>}<span className="pb-muted">weight {c.weight}</span>
                </div>
                <div className="pb-io"><div className="k">Input</div><pre className="pb-mono">{c.input || '(empty)'}</pre></div>
                <div className="pb-test-grid" style={{ padding: 0 }}>
                  <div className="pb-io"><div className="k">Expected</div><pre className="pb-mono">{c.expectedOutput || '(empty)'}</pre></div>
                  <div className="pb-io"><div className="k">Your output</div><pre className="pb-mono console">{c.output || '(no output)'}</pre></div>
                </div>
                {c.error && <div className="pb-io"><div className="k">Errors</div><pre className="pb-mono err">{c.error}</pre></div>}
              </>}
            </>}
          </div>
        ) : (
          <div className="pb-muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
            Write or load code above and run it against this problem <b>as it is right now</b> — unsaved edits included.
            <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
              <li><b>Run samples</b> — what a learner's Run button does. <span className="pb-faint">Ctrl+Enter</span></li>
              <li><b>Run all tests</b> — the full judge, hidden tests included, with the marks it would score.</li>
              <li><b>Verify all languages</b> — every reference solution against every test, after saving.</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProblemStudio;
