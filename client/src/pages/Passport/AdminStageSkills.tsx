import React, { useCallback, useEffect, useMemo, useState } from 'react';
import passportApi from '../../api/passportApi';
import './stageSkills.css';

/**
 * What a student is measured against when they have not chosen a role.
 *
 * WHY THIS SCREEN EXISTS. Everything downstream — the assessment paper, Skill DNA, role
 * readiness, the roadmap — is built from a list of required skills, and the only source of
 * that list was the Role Blueprint. A first-year who honestly answered "I'm not sure yet"
 * had no list, so no assessment and no plan: the product refused the cohort least able to
 * name a job title and most in need of being told where to start.
 *
 * Their stage was known all along — derived from degree and year — and the foundation
 * policy already restricted them to FOUNDATION-difficulty skills. It simply had no list of
 * its own to filter. This is where that list is written.
 */

const IMPORTANCE = ['ESSENTIAL', 'IMPORTANT', 'SUPPORTING', 'OPTIONAL'];
const TARGETS = ['FOUNDATION', 'WORKING', 'PROFICIENT', 'ADVANCED'];

type Req = {
  skillKey: string; importance: string; weight: number;
  targetLevel: string; active: boolean; displayOrder: number; note?: string;
};

const AdminStageSkills: React.FC = () => {
  const [stages, setStages] = useState<any[]>([]);
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [stage, setStage] = useState('foundation');

  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState('');
  const [reqs, setReqs] = useState<Req[]>([]);
  const [skills, setSkills] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [pick, setPick] = useState('');
  const [search, setSearch] = useState('');

  const loadIndex = useCallback(async () => {
    try {
      const r = await passportApi.listStageSkillSets();
      setStages(r.stages); setCatalogue(r.stageCatalogue);
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not load the stages.'); }
  }, []);

  const loadStage = useCallback(async (key: string) => {
    setLoading(true); setErr(''); setMsg('');
    try {
      const r = await passportApi.getStageSkillSet(key);
      setEnabled(!!r.enabled);
      setLabel(r.label || '');
      setReqs((r.requirements || []).map((x: any, i: number) => ({ ...x, displayOrder: x.displayOrder ?? (i + 1) * 10 })));
      setSkills(r.skills || []);
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not load that stage.'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadIndex(); }, [loadIndex]);
  useEffect(() => { loadStage(stage); }, [stage, loadStage]);

  const used = useMemo(() => new Set(reqs.map(r => r.skillKey)), [reqs]);
  const available = useMemo(
    () => skills.filter(s => !used.has(s.key)
      && (!search || `${s.name} ${s.key}`.toLowerCase().includes(search.toLowerCase()))),
    [skills, used, search],
  );

  const add = (key: string) => {
    if (!key || used.has(key)) return;
    const s = skills.find(x => x.key === key);
    setReqs(list => [...list, {
      skillKey: key,
      importance: 'IMPORTANT',
      weight: 7,
      // The skill's own difficulty is the honest default target — a FOUNDATION skill is not
      // something a beginner should be held to PROFICIENT on.
      targetLevel: TARGETS.includes(s?.difficulty) ? s.difficulty : 'WORKING',
      active: true,
      displayOrder: (list.length + 1) * 10,
    }]);
    setPick('');
  };

  const patch = (key: string, p: Partial<Req>) =>
    setReqs(list => list.map(r => (r.skillKey === key ? { ...r, ...p } : r)));

  const save = async () => {
    setBusy(true); setErr(''); setMsg('');
    try {
      const r = await passportApi.saveStageSkillSet(stage, { label, enabled, requirements: reqs });
      setMsg(r.enabled
        ? `Saved. Students in this stage with no chosen role are now measured against these ${reqs.filter(x => x.active).length} skills.`
        : 'Saved, and left switched off — nothing changes for students until you enable it.');
      await loadIndex();
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not save.'); }
    setBusy(false);
  };

  const activeCount = reqs.filter(r => r.active).length;
  const current = stages.find(s => s.stage === stage);

  return (
    <div className="ss">
      <header className="ss-hd">
        <div>
          <span className="ss-eyebrow">CareerPilot</span>
          <h1>Skills by stage</h1>
          <p>
            What a student is measured and taught against when they have <b>not chosen a
            role</b> — a first year who says “I’m not sure yet”. A student who has chosen one
            is always measured against that role instead; this never overrides it.
          </p>
        </div>
      </header>

      {err && <div className="ss-banner err">{err}</div>}
      {msg && <div className="ss-banner ok">{msg}</div>}

      <div className="ss-stages">
        {catalogue.map(c => {
          const row = stages.find(s => s.stage === c.key);
          return (
            <button
              key={c.key}
              className={`ss-stage${stage === c.key ? ' on' : ''}`}
              onClick={() => setStage(c.key)}
            >
              <b>{c.label}</b>
              <span>{row?.enabled ? `${row.activeCount} skills · live` : row?.count ? `${row.count} skills · off` : 'not set up'}</span>
            </button>
          );
        })}
      </div>

      {loading ? <div className="ss-state">Loading…</div> : (
        <>
          <section className="ss-controls">
            <label className="ss-toggle">
              <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
              <span>
                <b>Use this list for students in this stage with no role</b>
                {/* Off is the safe state and says so, because switching it on changes what
                    real students are assessed on the next time they open the app. */}
                <em>{enabled
                  ? 'Live — a student with no role is measured against these skills.'
                  : 'Off — students with no role still get nothing. Turn this on when the list is ready.'}</em>
              </span>
            </label>

            <label className="ss-label">
              <span>Name shown to admins</span>
              <input value={label} placeholder="e.g. First-year foundation"
                onChange={e => setLabel(e.target.value)} />
            </label>
          </section>

          <section className="ss-add">
            <input
              className="ss-search"
              placeholder="Search skills to add…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select value={pick} onChange={e => add(e.target.value)}>
              <option value="">Add a skill… ({available.length} available)</option>
              {available.map(s => (
                <option key={s.key} value={s.key}>
                  {s.name} · {s.difficulty || 'unrated'}
                </option>
              ))}
            </select>
          </section>

          {!reqs.length ? (
            <div className="ss-state">
              <b>No skills in this list yet.</b>
              <p>
                Add the skills every student at this stage should be measured on, regardless
                of the job they end up wanting. For a first year that is usually the
                language-agnostic basics — programming fundamentals, problem solving, a
                little DSA and communication.
              </p>
            </div>
          ) : (
            <div className="ss-tablewrap">
              <table className="ss-table">
                <thead>
                  <tr>
                    <th>Skill</th><th>Importance</th><th className="c">Weight</th>
                    <th>Target level</th><th className="c">Order</th><th className="c">In use</th><th />
                  </tr>
                </thead>
                <tbody>
                  {reqs.slice().sort((a, b) => a.displayOrder - b.displayOrder).map(r => {
                    const s = skills.find(x => x.key === r.skillKey);
                    return (
                      <tr key={r.skillKey} className={r.active ? '' : 'off'}>
                        <td>
                          <b>{s?.name || r.skillKey}</b>
                          <span className="key">{r.skillKey}{s?.difficulty ? ` · ${s.difficulty}` : ''}</span>
                          {/* A key that resolves to nothing is an admin problem, not a row
                              to hide — the list would otherwise be quietly shorter than it looks. */}
                          {!s && <span className="warn">this skill no longer exists</span>}
                        </td>
                        <td>
                          <select value={r.importance} onChange={e => patch(r.skillKey, { importance: e.target.value })}>
                            {IMPORTANCE.map(i => <option key={i} value={i}>{i[0] + i.slice(1).toLowerCase()}</option>)}
                          </select>
                        </td>
                        <td className="c">
                          <input type="number" min={1} max={10} value={r.weight}
                            onChange={e => patch(r.skillKey, { weight: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })} />
                        </td>
                        <td>
                          <select value={r.targetLevel} onChange={e => patch(r.skillKey, { targetLevel: e.target.value })}>
                            {TARGETS.map(t => <option key={t} value={t}>{t[0] + t.slice(1).toLowerCase()}</option>)}
                          </select>
                        </td>
                        <td className="c">
                          <input type="number" value={r.displayOrder}
                            onChange={e => patch(r.skillKey, { displayOrder: Number(e.target.value) || 0 })} />
                        </td>
                        <td className="c">
                          <input type="checkbox" checked={r.active}
                            onChange={e => patch(r.skillKey, { active: e.target.checked })} />
                        </td>
                        <td className="c">
                          <button className="ss-rm" onClick={() => setReqs(l => l.filter(x => x.skillKey !== r.skillKey))}>✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <footer className="ss-foot">
            <span>
              {activeCount} skill{activeCount === 1 ? '' : 's'} in use
              {current?.version ? ` · version ${current.version}` : ''}
            </span>
            <button className="ss-btn primary" disabled={busy} onClick={save}>
              {busy ? 'Saving…' : 'Save this stage'}
            </button>
          </footer>
        </>
      )}
    </div>
  );
};

export default AdminStageSkills;
