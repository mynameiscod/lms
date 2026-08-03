import React, { useEffect, useMemo, useState } from 'react';
import { Spinner } from '../../components/common';
import './staging.css';

/**
 * Career-stage tagging, in one screen.
 *
 * Tagging is deliberately not spread across the assessment and mission editors, because
 * the question an admin actually has is cross-cutting — "does Foundation have enough to
 * work with?" — and that cannot be answered from inside one question's edit form.
 *
 * Untagged means "every stage", so an empty row is valid and common. The coverage bar
 * exists because a stage holding four questions still produces a score out of 100, and
 * nothing else in the product would tell you that score means very little.
 */

const API = (process.env.REACT_APP_API_URL || '/api/v1') + '/careerpilot/staging';

const headers = () => {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = localStorage.getItem('token'); if (t) h.Authorization = `Bearer ${t}`;
  const x = localStorage.getItem('tenantId'); if (x) h['X-Tenant-Id'] = x;
  return h;
};

const BG_LABEL: Record<string, string> = {
  any: 'Any background',
  cs: 'CS / IT only',
  non_cs: 'Non-CS only',
};

const AdminStaging: React.FC = () => {
  const [d, setD] = useState<any>(null);
  const [tab, setTab] = useState<'questions' | 'missions'>('questions');
  const [dirty, setDirty] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');

  const load = () => fetch(API, { headers: headers() })
    .then(r => r.json())
    .then(b => { if (b.success) { setD(b.data); setDirty({}); } else setErr(b.message); })
    .catch(e => setErr(e.message));

  useEffect(() => { load(); }, []);

  const rows = useMemo(() => {
    if (!d) return [];
    return tab === 'questions'
      ? d.questions.map((q: any) => ({ ...q, key: 'q:' + q.id, label: q.text, sub: q.category }))
      : d.missions.map((m: any) => ({ ...m, key: 'm:' + m.category + ':' + m.title, label: m.title, sub: m.category }));
  }, [d, tab]);

  // Filtering matters at this size: the bank is past 60 questions, and tagging one of
  // them otherwise means scrolling for it.
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r: any) =>
      r.label.toLowerCase().includes(needle) || String(r.sub || '').toLowerCase().includes(needle));
  }, [rows, q]);

  const stagesOf = (r: any): string[] => dirty[r.key]?.stages ?? r.stages;
  const goalsOf  = (r: any): string[] => dirty[r.key]?.goals ?? (r.goals || []);
  const bgOf = (r: any): string => dirty[r.key]?.background ?? r.background;

  const toggle = (r: any, stage: string) => {
    const cur = stagesOf(r);
    const next = cur.includes(stage) ? cur.filter((s: string) => s !== stage) : [...cur, stage];
    setDirty({ ...dirty, [r.key]: { ...(dirty[r.key] || {}), row: r, stages: next } });
  };

  const toggleGoal = (r: any, goal: string) => {
    const cur = goalsOf(r);
    const next = cur.includes(goal) ? cur.filter((g: string) => g !== goal) : [...cur, goal];
    setDirty({ ...dirty, [r.key]: { ...(dirty[r.key] || {}), row: r, goals: next } });
  };

  const setBg = (r: any, v: string) =>
    setDirty({ ...dirty, [r.key]: { ...(dirty[r.key] || {}), row: r, background: v } });

  const save = async () => {
    setBusy(true); setErr(''); setMsg('');
    try {
      const questions: any[] = [];
      const missions: any[] = [];
      Object.entries(dirty).forEach(([k, patch]: any) => {
        const r = patch.row;
        const body = { stages: patch.stages ?? r.stages, goals: patch.goals ?? (r.goals || []), background: patch.background ?? r.background };
        if (k.indexOf('q:') === 0) questions.push({ id: r.id, ...body });
        else missions.push({ category: r.category, title: r.title, ...body });
      });
      const res = await fetch(API, { method: 'PUT', headers: headers(), body: JSON.stringify({ questions, missions }) });
      const b = await res.json();
      if (!res.ok || !b.success) throw new Error(b.message || 'Save failed');
      setMsg('Saved ' + b.data.touched + ' item(s).');
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally { setBusy(false); }
  };

  if (!d) return <div className="stg-load"><Spinner /></div>;

  const cov = tab === 'questions' ? d.coverage.questions : d.coverage.missions;
  const thin: string[] = tab === 'questions' ? d.coverage.thinQuestionStages : d.coverage.thinMissionStages;
  const pending = Object.keys(dirty).length;

  return (
    <div className="stg">
      <div className="stg-head">
        <div>
          <h2>Career Stage Tagging</h2>
          <p>Untagged content reaches every stage. Narrow only what genuinely does not apply.</p>
        </div>
        <button className="stg-save" onClick={save} disabled={!pending || busy}>
          {busy ? 'Saving…' : pending ? 'Save ' + pending + ' change(s)' : 'No changes'}
        </button>
      </div>

      {err && <div className="stg-err">{err}</div>}
      {msg && <div className="stg-ok">{msg}</div>}

      <div className="stg-cov">
        {d.stages.map((s: any) => (
          <div className={'stg-cov-c ' + (thin.includes(s.key) ? 'thin' : '')} key={s.key}>
            <span>{s.label}</span>
            <b>{cov[s.key] ?? 0}</b>
            <small>{thin.includes(s.key) ? 'below ' + d.coverage.threshold + ' — too thin' : s.blurb}</small>
            {s.who && <em className="stg-who">{s.who}</em>}
          </div>
        ))}
      </div>

      {thin.length > 0 && (
        <div className="stg-warn">
          {thin.length} stage(s) hold fewer than {d.coverage.threshold} items. A student in that stage still
          receives a score out of 100 — it just will not mean much. Either tag more content into those
          stages, or leave items untagged so they serve everyone.
        </div>
      )}

      {tab === 'questions' && (d.goalCoverage || []).length > 0 && (
        <div className="stg-goalcov">
          <div className="stg-goalcov-h">
            <b>Questions a student actually sits, by goal and stage</b>
            <span>Tag by goal below to change these. Untagged questions count towards every goal.</span>
          </div>
          <div className="stg-goalcov-scroll">
            <table>
              <thead>
                <tr><th>Career goal</th>{d.stages.map((s: any) => <th key={s.key}>{s.label}</th>)}</tr>
              </thead>
              <tbody>
                {d.goalCoverage.map((row: any) => (
                  <tr key={row.goal}>
                    <td>{row.goal}</td>
                    {d.stages.map((s: any) => (
                      <td key={s.key} className={row.byStage[s.key] < d.coverage.threshold ? 'thin' : ''}>
                        {row.byStage[s.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="stg-tabs">
        <button className={tab === 'questions' ? 'on' : ''} onClick={() => setTab('questions')}>
          Assessment questions ({d.questions.length})
        </button>
        <button className={tab === 'missions' ? 'on' : ''} onClick={() => setTab('missions')}>
          Mission pool ({d.missions.length})
        </button>
      </div>

      <input
        className="stg-search"
        placeholder="Filter by text or category…"
        value={q}
        onChange={e => setQ(e.target.value)}
      />

      <div className="stg-rows">
        {shown.length === 0 && <div className="stg-empty">Nothing matches “{q}”.</div>}
        {shown.map((r: any) => {
          const st = stagesOf(r);
          return (
            <div className={'stg-row ' + (dirty[r.key] ? 'dirty' : '')} key={r.key}>
              <div className="stg-label">
                <b>{r.label}</b>
                <span>{r.sub}</span>
              </div>
              <div className="stg-stages">
                {d.stages.map((s: any) => (
                  <button
                    key={s.key} type="button" title={s.blurb}
                    className={'stg-pill ' + (st.includes(s.key) ? 'on' : '')}
                    aria-pressed={st.includes(s.key)}
                    onClick={() => toggle(r, s.key)}
                  >
                    {s.label}
                  </button>
                ))}
                {st.length === 0 && <span className="stg-all">all stages</span>}
              </div>
              <div className="stg-goals">
                {(d.goalOptions || []).map((g: string) => (
                  <button
                    key={g} type="button"
                    title={'Only students aiming for ' + g}
                    className={'stg-goal ' + (goalsOf(r).includes(g) ? 'on' : '')}
                    aria-pressed={goalsOf(r).includes(g)}
                    onClick={() => toggleGoal(r, g)}
                  >
                    {g}
                  </button>
                ))}
                {goalsOf(r).length === 0 && <span className="stg-all">all goals</span>}
              </div>
              <select value={bgOf(r)} onChange={e => setBg(r, e.target.value)} aria-label="Background">
                {['any', 'cs', 'non_cs'].map(b => <option key={b} value={b}>{BG_LABEL[b]}</option>)}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminStaging;
