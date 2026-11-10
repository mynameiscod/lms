import React, { useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { playgroundApi } from '../../api/playgroundApi';
import { NotesContent } from '../content/NotesContent';
import './codingPracticeQuestion.css';

/**
 * One coding question inside a "Code practice" lesson.
 *
 * This used to print the starter code as a picture: nothing could be typed, nothing could be run, and
 * "Show Answer" opened the question's explanation, which no coding question had, so it showed nothing.
 * Now the starter code is in an editor; Run executes it on an input the learner can change, Check runs
 * it against every test (the hidden ones on the server, answering pass/fail only), and Show answer
 * shows the written answer when there is one and the worked examples either way.
 */

const BASE = process.env.REACT_APP_API_URL || '/api/v1';
const MONACO_LANG: Record<string, string> = {
  python: 'python', javascript: 'javascript', typescript: 'typescript', java: 'java', cpp: 'cpp', c: 'c',
  csharp: 'csharp', go: 'go', rust: 'rust',
};
const LANG_NAME: Record<string, string> = {
  python: 'Python', javascript: 'JavaScript', typescript: 'TypeScript', java: 'Java', cpp: 'C++', c: 'C',
  csharp: 'C#', go: 'Go', rust: 'Rust',
};

interface TestCase { input: string; expectedOutput: string; isHidden?: boolean }
interface CheckResult {
  passed: number; total: number; allPassed: boolean; graderUnavailable?: boolean;
  results: { hidden: boolean; pass: boolean; input?: string; expected?: string; output?: string; error?: string }[];
}

const draftKey = (contentId: string, qid: string, lang: string) => `cp-draft:${contentId}:${qid}:${lang}`;
const readDraft = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const writeDraft = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private window */ } };
const dropDraft = (k: string) => { try { localStorage.removeItem(k); } catch { /* private window */ } };

const check = async (contentId: string, qid: string, language: string, code: string): Promise<CheckResult> => {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('token'); const tenantId = localStorage.getItem('tenantId');
  if (token) h.Authorization = `Bearer ${token}`;
  if (tenantId) h['X-Tenant-Id'] = tenantId;
  const r = await fetch(`${BASE}/learning-library/${contentId}/practice/${encodeURIComponent(qid)}/check`, {
    method: 'POST', headers: h, body: JSON.stringify({ language, code }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || `Could not check the code (${r.status}).`);
  return d.data;
};

const Block: React.FC<{ label: string; text: string; tone?: 'bad' }> = ({ label, text, tone }) => (
  <div className={`cpq-io${tone ? ` ${tone}` : ''}`}>
    <span>{label}</span>
    <pre>{text === '' ? '(nothing)' : text}</pre>
  </div>
);

const CodingPracticeQuestion: React.FC<{ q: any; index: number; contentId?: string }> = ({ q, index, contentId }) => {
  const starters: Record<string, string> = useMemo(() => {
    const s = q.starterCode || {};
    return s instanceof Map ? Object.fromEntries(s as any) : s;
  }, [q.starterCode]);
  const langs: string[] = useMemo(() => {
    const list = [...(q.allowedLanguages || []), ...Object.keys(starters)].map(l => String(l).toLowerCase()).filter(l => MONACO_LANG[l]);
    return list.length ? Array.from(new Set(list)) : ['python'];
  }, [q.allowedLanguages, starters]);
  const visible: TestCase[] = (q.testCases || []).filter((t: TestCase) => !t.isHidden);
  const qid = String(q._id || index);

  const [lang, setLang] = useState(langs[0]);
  const key = draftKey(String(contentId || 'x'), qid, lang);
  const [code, setCode] = useState<string>(() => readDraft(key) ?? starters[langs[0]] ?? '');
  const [stdin, setStdin] = useState<string>(visible[0]?.input ?? '');
  const [busy, setBusy] = useState<'' | 'run' | 'check'>('');
  const [run, setRun] = useState<{ output: string; error: string } | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [problem, setProblem] = useState('');
  const [answer, setAnswer] = useState(false);
  const first = useRef(true);

  // Another language opens on its own draft, or its starter.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setCode(readDraft(key) ?? starters[lang] ?? '');
    setRun(null); setResult(null); setProblem('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const edit = (v: string) => { setCode(v); writeDraft(key, v); };
  const reset = () => { setCode(starters[lang] ?? ''); dropDraft(key); setRun(null); setResult(null); setProblem(''); };

  const doRun = async () => {
    if (!code.trim()) { setProblem('Write some code first.'); return; }
    setBusy('run'); setProblem(''); setResult(null);
    try {
      const r = await playgroundApi.run({ language: lang, code, stdin });
      setRun({ output: r.data?.output || '', error: r.data?.error || '' });
    } catch (e: any) { setProblem(e.message || 'Could not run the code.'); }
    finally { setBusy(''); }
  };

  const doCheck = async () => {
    if (!code.trim()) { setProblem('Write some code first.'); return; }
    if (!contentId) { setProblem('This question cannot be checked here.'); return; }
    setBusy('check'); setProblem(''); setRun(null);
    try { setResult(await check(contentId, qid, lang, code)); }
    catch (e: any) { setProblem(e.message || 'Could not check the code.'); }
    finally { setBusy(''); }
  };

  const lines = Math.max(8, Math.min(22, code.split('\n').length + 2));
  const explanation = String(q.explanation || '').trim();
  const hasAnswer = !!explanation || visible.length > 0;
  const canCheck = !!contentId && (q.testCases || []).length > 0;

  return <div className="cpq">
    <div className="cpq-bar">
      {langs.length > 1
        ? <select className="cpq-lang" value={lang} onChange={e => setLang(e.target.value)} aria-label="Language">
            {langs.map(l => <option key={l} value={l}>{LANG_NAME[l] || l}</option>)}
          </select>
        : <span className="cpq-langtag">{LANG_NAME[lang] || lang}</span>}
      <span className="cpq-hint">Edit the code, then run it or check it against the tests.</span>
      <button type="button" className="cpq-link" onClick={reset} disabled={!!busy}><i className="bi bi-arrow-counterclockwise" /> Reset code</button>
    </div>

    <div className="cpq-editor">
      <Editor
        height={`${lines * 20 + 24}px`}
        language={MONACO_LANG[lang] || 'plaintext'}
        theme="vs-dark"
        value={code}
        onChange={v => edit(v ?? '')}
        options={{
          minimap: { enabled: false }, fontSize: 13.5, lineNumbers: 'on', scrollBeyondLastLine: false,
          tabSize: 4, automaticLayout: true, padding: { top: 12, bottom: 12 },
          fontFamily: 'ui-monospace, Menlo, Consolas, monospace', scrollbar: { alwaysConsumeMouseWheel: false },
          ...(window.innerWidth <= 640 ? { wordWrap: 'on' as const, fontSize: 16, lineNumbersMinChars: 2 } : {}),
        }}
      />
    </div>

    <label className="cpq-stdin">
      <span>Input for Run <small>(what your program reads)</small></span>
      <textarea value={stdin} onChange={e => setStdin(e.target.value)} rows={Math.min(4, Math.max(1, stdin.split('\n').length))} spellCheck={false} />
    </label>

    <div className="cpq-actions">
      <button type="button" className="cpq-btn" onClick={doRun} disabled={!!busy}>
        <i className="bi bi-play-fill" /> {busy === 'run' ? 'Running…' : 'Run'}
      </button>
      {canCheck && <button type="button" className="cpq-btn primary" onClick={doCheck} disabled={!!busy}>
        <i className="bi bi-check2-circle" /> {busy === 'check' ? 'Checking…' : 'Check my code'}
      </button>}
      {hasAnswer && <button type="button" className="cpq-btn ghost" onClick={() => setAnswer(a => !a)} aria-expanded={answer}>
        <i className={`bi ${answer ? 'bi-eye-slash' : 'bi-lightbulb'}`} /> {answer ? 'Hide answer' : 'Show answer'}
      </button>}
    </div>

    {problem && <p className="cpq-problem" role="alert">{problem}</p>}

    {run && <div className="cpq-out" aria-live="polite">
      <Block label="Output" text={run.output} />
      {!!run.error && <Block label="Error" text={run.error} tone="bad" />}
    </div>}

    {result && <div className="cpq-out" aria-live="polite">
      <div className={`cpq-score ${result.allPassed ? 'ok' : 'bad'}`}>
        <i className={`bi ${result.allPassed ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`} />
        {result.allPassed ? `All ${result.total} tests passed.` : `${result.passed} of ${result.total} tests passed.`}
      </div>
      {result.graderUnavailable && <p className="cpq-note">The code runner is not available right now, so this is not a real result. Try again in a while.</p>}
      <ol className="cpq-tests">
        {result.results.map((r, i) => <li key={i} className={r.pass ? 'ok' : 'bad'}>
          <b><i className={`bi ${r.pass ? 'bi-check-lg' : 'bi-x-lg'}`} /> Test {i + 1}{r.hidden ? ' (hidden)' : ''}: {r.pass ? 'passed' : 'failed'}</b>
          {!r.hidden && !r.pass && <div className="cpq-grid">
            <Block label="Input" text={r.input || ''} />
            <Block label="Expected" text={r.expected || ''} />
            <Block label="Your output" text={r.output || ''} tone="bad" />
          </div>}
          {!!r.error && <Block label="Error" text={r.error} tone="bad" />}
        </li>)}
      </ol>
    </div>}

    {answer && <div className="cpq-answer">
      {explanation
        ? <NotesContent text={explanation} compact />
        : <p className="cpq-note">No written answer has been added for this question yet. Your program is right when it prints exactly these results:</p>}
      {visible.length > 0 && <table className="cpq-examples">
        <thead><tr><th>Input</th><th>Expected output</th></tr></thead>
        <tbody>{visible.map((t, i) => <tr key={i}><td><code>{t.input || '(none)'}</code></td><td><code>{t.expectedOutput}</code></td></tr>)}</tbody>
      </table>}
    </div>}
  </div>;
};

export default CodingPracticeQuestion;
