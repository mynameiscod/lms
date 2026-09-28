import React, { useEffect, useMemo, useState } from 'react';
import { problemBankApi, pbError, PbMeta } from '../../api/problemBankApi';
import { apiClientApi, ApiClientInput, ApiClientRow, ApiScope, problemSetAdminApi, ProblemSetAdmin } from '../../api/problemSetApi';
import { BankTabs } from './Sets';
import { Modal, relTime, useToast } from './shared';
import './ProblemBank.css';

/**
 * API access — keys for partner colleges, customers' hiring tools and CodeBegun's Interview
 * Pilot. Each key sees published problems only (never hidden tests or solutions), narrowed by
 * its entitlement, and is rate-limited per minute and capped per day on judge calls.
 */

const SCOPES: { key: ApiScope; label: string; help: string }[] = [
  { key: 'problems:read', label: 'Read problems', help: 'List, search and fetch problems (statement, samples, starter code).' },
  { key: 'judge:run', label: 'Run code', help: 'Run code against samples or custom input. Not recorded.' },
  { key: 'judge:submit', label: 'Submit for grading', help: 'Grade against every hidden test and record the result.' },
  { key: 'submissions:read', label: 'Read submissions', help: "Fetch this client's own recorded submissions." },
];

const BASE = `${window.location.origin}/api/v1/external`;

const ClientForm: React.FC<{ initial?: ApiClientRow; meta: PbMeta | null; sets: ProblemSetAdmin[]; onClose: () => void; onSaved: (r: { client: ApiClientRow; key?: string }) => void }> =
  ({ initial, meta, sets, onClose, onSaved }) => {
    const [f, setF] = useState<ApiClientInput>(() => initial ? {
      name: initial.name, description: initial.description, scopes: initial.scopes, entitlement: initial.entitlement, limits: initial.limits,
      expiresAt: initial.expiresAt ? initial.expiresAt.slice(0, 10) : '',
    } : {
      name: '', description: '', scopes: SCOPES.map((s) => s.key),
      entitlement: { mode: 'all', setIds: [], difficulties: [], topics: [], includeTenantProblems: false },
      limits: { perMinute: 60, judgePerDay: 2000 }, expiresAt: '',
    });
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const e = f.entitlement!;
    const setE = (patch: Partial<typeof e>) => setF({ ...f, entitlement: { ...e, ...patch } });
    const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

    const save = async () => {
      setBusy(true); setErr('');
      try {
        const body = { ...f, expiresAt: f.expiresAt ? new Date(`${f.expiresAt}T23:59:59`).toISOString() : null };
        if (initial) onSaved({ client: await apiClientApi.update(initial._id, body) });
        else onSaved(await apiClientApi.create(body));
      } catch (x) { setErr(pbError(x)); }
      setBusy(false);
    };

    return (
      <Modal title={initial ? `Edit ${initial.name}` : 'New API client'} onClose={onClose} wide footer={<>
        <button className="pb-btn" onClick={onClose}>Cancel</button>
        <button className="pb-btn pb-btn-primary" disabled={busy || !f.name?.trim()} onClick={save}>{busy ? <span className="pb-spinner" /> : <i className="fa-solid fa-key" />} {initial ? 'Save' : 'Create & show key'}</button>
      </>}>
        <div className="pb-field-row">
          <div><label className="pb-label" style={{ marginTop: 0 }}>Name</label>
            <input className="pb-input" value={f.name} placeholder="e.g. ABC Engineering College portal" onChange={(x) => setF({ ...f, name: x.target.value })} /></div>
          <div><label className="pb-label" style={{ marginTop: 0 }}>Expires <small>optional</small></label>
            <input className="pb-input" type="date" value={f.expiresAt || ''} onChange={(x) => setF({ ...f, expiresAt: x.target.value })} /></div>
        </div>
        <label className="pb-label">Notes</label>
        <input className="pb-input" value={f.description} placeholder="Contract, contact person, what they use it for" onChange={(x) => setF({ ...f, description: x.target.value })} />

        <label className="pb-label">Permissions</label>
        {SCOPES.map((s) => (
          <label key={s.key} className="pb-switch" style={{ display: 'flex', margin: '6px 0' }}>
            <input type="checkbox" checked={f.scopes!.includes(s.key)} onChange={() => setF({ ...f, scopes: toggle(f.scopes!, s.key) as ApiScope[] })} />
            <span><b>{s.label}</b> <span className="pb-muted" style={{ fontWeight: 400 }}>— {s.help}</span></span>
          </label>
        ))}

        <label className="pb-label">Which problems it can see <small>always published only · hidden tests & solutions never exposed</small></label>
        <div className="pb-seg">
          <button type="button" className={e.mode === 'all' ? 'on' : ''} onClick={() => setE({ mode: 'all' })}>Whole library</button>
          <button type="button" className={e.mode === 'filter' ? 'on' : ''} onClick={() => setE({ mode: 'filter' })}>By difficulty / topic</button>
          <button type="button" className={e.mode === 'sets' ? 'on' : ''} onClick={() => setE({ mode: 'sets' })}>Specific problem sets</button>
        </div>
        {e.mode === 'filter' && (
          <div className="pb-card" style={{ padding: 12, marginTop: 8 }}>
            <div className="pb-chips" style={{ marginBottom: 8 }}>{['easy', 'medium', 'hard'].map((d) => (
              <button type="button" key={d} className={`pb-chip ${e.difficulties.includes(d) ? 'on' : ''}`} onClick={() => setE({ difficulties: toggle(e.difficulties, d) })}>{d}</button>
            ))}<span className="pb-faint" style={{ fontSize: 12 }}>none = any difficulty</span></div>
            <div className="pb-chips" style={{ maxHeight: 150, overflowY: 'auto' }}>{(meta?.topics || []).map((t) => (
              <button type="button" key={t.key} className={`pb-chip ${e.topics.includes(t.key) ? 'on' : ''}`} onClick={() => setE({ topics: toggle(e.topics, t.key) })}>{t.label}</button>
            ))}</div>
          </div>
        )}
        {e.mode === 'sets' && (
          <div className="pb-card" style={{ padding: 12, marginTop: 8 }}>
            {!sets.length && <span className="pb-faint">No problem sets yet — create one under Problem sets.</span>}
            <div className="pb-chips">{sets.map((s) => (
              <button type="button" key={s._id} className={`pb-chip ${e.setIds.includes(s._id) ? 'on' : ''}`} onClick={() => setE({ setIds: toggle(e.setIds, s._id) })}>{s.title} <span className="pb-faint">({s.problemCount})</span></button>
            ))}</div>
          </div>
        )}
        <label className="pb-switch" style={{ marginTop: 10 }}>
          <input type="checkbox" checked={e.includeTenantProblems} onChange={(x) => setE({ includeTenantProblems: x.target.checked })} /> Also include my institute's own published problems
        </label>

        <div className="pb-field-row">
          <div><label className="pb-label">Requests per minute</label>
            <input className="pb-input" type="number" min={1} max={6000} value={f.limits!.perMinute} onChange={(x) => setF({ ...f, limits: { ...f.limits!, perMinute: Number(x.target.value) } })} /></div>
          <div><label className="pb-label">Runs + submissions per day <small>0 = unlimited</small></label>
            <input className="pb-input" type="number" min={0} value={f.limits!.judgePerDay} onChange={(x) => setF({ ...f, limits: { ...f.limits!, judgePerDay: Number(x.target.value) } })} /></div>
        </div>
        <div className="pb-help">Every run and submission executes code on the same judge your students use — keep the daily cap sensible.</div>
        {err && <div className="pb-alert pb-alert-bad">{err}</div>}
      </Modal>
    );
  };

const KeyReveal: React.FC<{ name: string; apiKey: string; onClose: () => void }> = ({ name, apiKey, onClose }) => {
  const [copied, setCopied] = useState(false);
  return (
    <Modal title={<><i className="fa-solid fa-key" style={{ color: 'var(--pb-accent)' }} /> API key for {name}</>} onClose={onClose}
      footer={<button className="pb-btn pb-btn-primary" onClick={onClose}>I have stored the key</button>}>
      <div className="pb-alert pb-alert-warn"><b>Copy it now.</b> This key is shown once. CodeBegun stores only a fingerprint of it — if it is lost, rotate to issue a new one.</div>
      <div className="pb-row">
        <code className="pb-mono pb-grow" style={{ padding: '10px 12px', background: 'var(--pb-soft)', border: '1px solid var(--pb-line)', borderRadius: 10, wordBreak: 'break-all', fontSize: 13 }}>{apiKey}</code>
        <button className="pb-btn" onClick={() => { navigator.clipboard.writeText(apiKey).then(() => setCopied(true)).catch(() => undefined); }}>
          <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`} /> {copied ? 'Copied' : 'Copy'}</button>
      </div>
      <div className="pb-help">Share it over a private channel. Use it only from a server — never embed it in a web page or mobile app, where anyone can read it.</div>
    </Modal>
  );
};

/* ── API reference ────────────────────────────────────────────────────────────────────────── */

const ENDPOINTS: { m: string; path: string; scope: string; what: string }[] = [
  { m: 'GET', path: '/problems', scope: 'problems:read', what: 'List problems. Query: q, difficulty, topic, language, company, updatedSince, page, limit (≤200).' },
  { m: 'GET', path: '/problems/random', scope: 'problems:read', what: 'One random problem — for interviews. Query: difficulty, topic, language, exclude (comma-separated ids already used).' },
  { m: 'GET', path: '/problems/{id}', scope: 'problems:read', what: 'Full problem: statement, formats, constraints, hints, samples, starter code per language, limits.' },
  { m: 'POST', path: '/problems/{id}/run', scope: 'judge:run', what: 'Body: { language, code, stdin? }. Without stdin runs the samples. Not recorded.' },
  { m: 'POST', path: '/problems/{id}/submissions', scope: 'judge:submit', what: 'Body: { language, code, externalUserId, reference? }. Graded on every test; hidden cases return verdicts only.' },
  { m: 'GET', path: '/submissions', scope: 'submissions:read', what: "Your recorded submissions. Query: externalUserId, problemId, reference, limit." },
  { m: 'GET', path: '/submissions/{id}', scope: 'submissions:read', what: 'One submission, with code and score.' },
  { m: 'GET', path: '/usage', scope: '—', what: 'Your limits and usage for today and the last 30 days.' },
];

const ApiReference: React.FC = () => {
  const [lang, setLang] = useState<'curl' | 'js' | 'python'>('curl');
  const sample = {
    curl: `# List easy array problems
curl -H "X-API-Key: $CODEBEGUN_API_KEY" \\
  "${BASE}/problems?difficulty=easy&topic=array"

# Grade a candidate's answer
curl -X POST -H "X-API-Key: $CODEBEGUN_API_KEY" -H "Content-Type: application/json" \\
  -d '{"language":"python","code":"print(sum(map(int,input().split())))","externalUserId":"student-42"}' \\
  "${BASE}/problems/PROBLEM_ID/submissions"`,
    js: `const BASE = '${BASE}';
const headers = { 'X-API-Key': process.env.CODEBEGUN_API_KEY, 'Content-Type': 'application/json' };

// Interview Pilot: pick a fresh medium problem the candidate has not seen
const problem = await fetch(\`\${BASE}/problems/random?difficulty=medium&exclude=\${seen.join(',')}\`, { headers }).then(r => r.json());

// Grade the candidate's final code
const result = await fetch(\`\${BASE}/problems/\${problem.id}/submissions\`, {
  method: 'POST', headers,
  body: JSON.stringify({ language: 'java', code, externalUserId: candidateId, reference: interviewId }),
}).then(r => r.json());
console.log(result.verdict, result.score, '/', result.maxScore);`,
    python: `import os, requests
BASE = "${BASE}"
H = {"X-API-Key": os.environ["CODEBEGUN_API_KEY"]}

problems = requests.get(f"{BASE}/problems", headers=H, params={"topic": "dynamic-programming", "limit": 50}).json()
p = requests.get(f"{BASE}/problems/{problems['data'][0]['id']}", headers=H).json()
print(p["title"], p["samples"][0])

r = requests.post(f"{BASE}/problems/{p['id']}/submissions", headers=H,
                  json={"language": "python", "code": open("solution.py").read(), "externalUserId": "roll-21CS045"})
print(r.json()["verdict"])`,
  };
  return (
    <div className="pb-card" style={{ padding: 18, marginTop: 18 }}>
      <h2 style={{ marginBottom: 6 }}>API reference</h2>
      <p className="pb-muted" style={{ marginTop: 0 }}>Base URL <code className="pb-mono">{BASE}</code> · authenticate every request with the header <code className="pb-mono">X-API-Key: cbk_live_…</code> (or <code className="pb-mono">Authorization: Bearer …</code>).</p>
      <div className="pb-table-wrap"><table className="pb-table">
        <thead><tr><th style={{ width: 60 }}>Method</th><th>Path</th><th>Scope</th><th>What it does</th></tr></thead>
        <tbody>{ENDPOINTS.map((e) => (
          <tr key={e.m + e.path} style={{ cursor: 'default' }}>
            <td><span className={`pb-pill ${e.m === 'GET' ? 'pb-badge-accent' : 'pb-badge-ok'}`}>{e.m}</span></td>
            <td className="pb-mono" style={{ fontSize: 13 }}>{e.path}</td><td className="pb-muted pb-mono" style={{ fontSize: 12 }}>{e.scope}</td>
            <td style={{ fontSize: 13 }}>{e.what}</td>
          </tr>
        ))}</tbody>
      </table></div>
      <div className="pb-row" style={{ marginTop: 14 }}>
        <b className="pb-grow">Examples</b>
        <div className="pb-seg">{(['curl', 'js', 'python'] as const).map((k) => <button key={k} className={lang === k ? 'on' : ''} onClick={() => setLang(k)}>{k === 'js' ? 'Node.js' : k === 'python' ? 'Python' : 'cURL'}</button>)}</div>
      </div>
      <pre className="pb-mono" style={{ background: 'var(--pb-console)', color: '#e2e8f0', padding: 14, borderRadius: 12, fontSize: 12.5, overflowX: 'auto', marginTop: 10 }}>{sample[lang]}</pre>
      <div className="pb-field-row" style={{ fontSize: 13 }}>
        <div><b>Verdicts</b><div className="pb-muted">AC accepted · WA wrong answer · TLE time limit · RE runtime error · CE compile error · BUSY judge busy (not recorded — retry)</div></div>
        <div><b>Errors</b><div className="pb-muted"><code>{'{ "error": { "code", "message" } }'}</code> with 400, 401, 403, 404, 429 (rate limit / daily quota — see Retry-After).</div></div>
        <div><b>Privacy</b><div className="pb-muted">Send your own ID as <code>externalUserId</code>, never names or phone numbers.</div></div>
      </div>
    </div>
  );
};

/* ── Page ─────────────────────────────────────────────────────────────────────────────────── */

const ApiAccess: React.FC = () => {
  const toast = useToast();
  const [rows, setRows] = useState<ApiClientRow[] | null>(null);
  const [err, setErr] = useState('');
  const [meta, setMeta] = useState<PbMeta | null>(null);
  const [sets, setSets] = useState<ProblemSetAdmin[]>([]);
  const [editing, setEditing] = useState<ApiClientRow | 'new' | null>(null);
  const [reveal, setReveal] = useState<{ name: string; key: string } | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const load = () => apiClientApi.list().then((r) => {
    setRows(r);
    r.forEach((c) => apiClientApi.preview(c._id).then((p) => setCounts((x) => ({ ...x, [c._id]: p.problems }))).catch(() => undefined));
  }).catch((e) => setErr(pbError(e, 'Could not load API clients. This page is for institute admins.')));
  useEffect(() => {
    load();
    problemBankApi.meta().then(setMeta).catch(() => undefined);
    problemSetAdminApi.list().then(setSets).catch(() => undefined);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const topicLabel = useMemo(() => Object.fromEntries((meta?.topics || []).map((t) => [t.key, t.label])), [meta]);
  const entitlementText = (c: ApiClientRow) => {
    const e = c.entitlement;
    const base = e.mode === 'all' ? 'Whole library'
      : e.mode === 'sets' ? `${e.setIds.length} problem set(s)`
        : [e.difficulties.join('/') || 'any difficulty', e.topics.map((t) => topicLabel[t] || t).slice(0, 3).join(', ') + (e.topics.length > 3 ? '…' : '')].filter(Boolean).join(' · ');
    return `${base}${e.includeTenantProblems ? ' + institute problems' : ''}`;
  };

  const act = async (fn: () => Promise<any>, ok: string) => { try { await fn(); toast.show(ok); load(); } catch (e) { toast.show(pbError(e), true); } };

  return (
    <div className="pb-root">
      <div className="pb-page">
        <div className="pb-head">
          <div className="pb-grow">
            <h1>Problem Bank</h1>
            <p>Give colleges, partners and CodeBegun's Interview Pilot programmatic access to problems and the judge — each with its own key, permissions, visible problems and limits.</p>
          </div>
          <button className="pb-btn pb-btn-primary" onClick={() => setEditing('new')}><i className="fa-solid fa-plus" /> New API client</button>
        </div>
        <BankTabs active="api" />
        {err && <div className="pb-alert pb-alert-bad">{err}</div>}

        {!rows && !err ? <div className="pb-muted"><span className="pb-spinner" /> Loading…</div> : rows && !rows.length ? (
          <div className="pb-card pb-empty">
            <h2>No API clients yet</h2>
            <p className="pb-muted">Create one per consumer — a college portal, a hiring partner, or Interview Pilot — so each can be limited and revoked on its own.</p>
            <button className="pb-btn pb-btn-primary" style={{ marginTop: 12 }} onClick={() => setEditing('new')}><i className="fa-solid fa-plus" /> Create the first client</button>
          </div>
        ) : rows && (
          <div className="pb-card pb-table-wrap">
            <table className="pb-table">
              <thead><tr><th>Client</th><th>Key</th><th>Can see</th><th>Permissions</th><th>Limits</th><th>Today</th><th>30 days</th><th>Last used</th><th>Status</th><th /></tr></thead>
              <tbody>{rows.map((c) => (
                <tr key={c._id} style={{ cursor: 'default' }}>
                  <td className="pb-title-cell"><div className="t">{c.name}</div>{c.description && <div className="pb-faint" style={{ fontSize: 12 }}>{c.description}</div>}
                    {c.expiresAt && <div className="pb-faint" style={{ fontSize: 12 }}>Expires {new Date(c.expiresAt).toLocaleDateString()}</div>}</td>
                  <td className="pb-mono" style={{ fontSize: 12.5 }}>{c.keyPrefix}…</td>
                  <td style={{ fontSize: 13 }}>{entitlementText(c)}<div className="pb-faint" style={{ fontSize: 12 }}>{counts[c._id] !== undefined ? `${counts[c._id]} problems` : ''}</div></td>
                  <td><div className="pb-langs" style={{ maxWidth: 220 }}>{c.scopes.map((s) => <span key={s} className="pb-lang">{s}</span>)}</div></td>
                  <td className="pb-muted" style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>{c.limits.perMinute}/min<br />{c.limits.judgePerDay ? `${c.limits.judgePerDay} judge/day` : 'no daily cap'}</td>
                  <td className="pb-muted" style={{ fontSize: 12.5 }}>{c.usage?.requestsToday || 0} req<br />{c.usage?.judgeToday || 0} judge</td>
                  <td className="pb-muted" style={{ fontSize: 12.5 }}>{c.usage?.requests30 || 0} req<br />{c.usage?.judge30 || 0} judge</td>
                  <td className="pb-muted">{c.lastUsedAt ? relTime(c.lastUsedAt) : 'Never'}</td>
                  <td><span className={`pb-pill ${c.status === 'active' ? 'pb-badge-ok' : 'pb-badge-bad'}`}><span className="pb-dot" /> {c.status}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="pb-btn pb-btn-ghost pb-btn-icon" title="Edit" onClick={() => setEditing(c)}><i className="fa-solid fa-pen" /></button>
                    <button className="pb-btn pb-btn-ghost pb-btn-icon" title="Rotate key" onClick={async () => {
                      if (!window.confirm(`Issue a new key for ${c.name}? The current key stops working immediately.`)) return;
                      try { const r = await apiClientApi.rotate(c._id); setReveal({ name: c.name, key: r.key }); load(); } catch (e) { toast.show(pbError(e), true); }
                    }}><i className="fa-solid fa-rotate" /></button>
                    {c.status === 'active'
                      ? <button className="pb-btn pb-btn-ghost pb-btn-icon" title="Revoke" onClick={() => window.confirm(`Revoke ${c.name}'s key? Calls start failing at once.`) && act(() => apiClientApi.update(c._id, { status: 'revoked' }), 'Revoked.')}><i className="fa-solid fa-ban" /></button>
                      : <button className="pb-btn pb-btn-ghost pb-btn-icon" title="Re-activate" onClick={() => act(() => apiClientApi.update(c._id, { status: 'active' }), 'Re-activated.')}><i className="fa-solid fa-circle-play" /></button>}
                    <button className="pb-btn pb-btn-ghost pb-btn-icon" title="Delete" onClick={() => window.confirm(`Delete ${c.name}? If it has submissions it is revoked instead, to keep the records.`) && act(() => apiClientApi.remove(c._id), 'Removed.')}><i className="fa-solid fa-trash" /></button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        <ApiReference />
      </div>
      {editing && <ClientForm initial={editing === 'new' ? undefined : editing} meta={meta} sets={sets} onClose={() => setEditing(null)}
        onSaved={(r) => { setEditing(null); if (r.key) setReveal({ name: r.client.name, key: r.key }); else toast.show('Saved.'); load(); }} />}
      {reveal && <KeyReveal name={reveal.name} apiKey={reveal.key} onClose={() => setReveal(null)} />}
      {toast.node}
    </div>
  );
};

export default ApiAccess;
