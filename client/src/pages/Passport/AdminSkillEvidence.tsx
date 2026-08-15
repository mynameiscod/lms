import React, { useCallback, useEffect, useMemo, useState } from 'react';
import passportApi, { EvidenceItem, MappableSkill, SkillCoverageRow } from '../../api/passportApi';
import './adminSkillEvidence.css';

/**
 * Mapping assessment content to the canonical skills it measures.
 *
 * Two views. MAP works through content one item at a time — the operational job, and the
 * reason the unmapped filter matters more than it looks: with hundreds of questions, "what
 * have I not done yet" is the only question that keeps the work finite. COVERAGE reads the
 * other way, per skill, and answers whether a future assessment could be built at all.
 *
 * Nothing here shows or touches a student. Mapping an item records what it measures; it
 * does not change how the item is asked, marked or scored, and the live assessment
 * generator does not read any of it.
 *
 * The skill list is fetched, never hardcoded — Module 3 remains the source of truth.
 */

const CONTRIB = ['PRIMARY', 'SECONDARY'];

const AdminSkillEvidence: React.FC = () => {
  const [view, setView] = useState<'map' | 'coverage'>('map');
  const [sourceType, setSourceType] = useState('assessment_item');
  const [sourceTypes, setSourceTypes] = useState<{ key: string; label: string }[]>([]);
  const [filter, setFilter] = useState<'all' | 'unmapped' | 'mapped' | 'stale'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [skills, setSkills] = useState<MappableSkill[]>([]);
  const [coverage, setCoverage] = useState<SkillCoverageRow[]>([]);
  const [covTotals, setCovTotals] = useState<any>(null);

  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ skillKey: string; contribution: string; active: boolean }[]>([]);
  const [pick, setPick] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    passportApi.mappableSkills().then(r => setSkills(r.skills)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setErr('');
    passportApi.listSkillEvidence({ sourceType, filter, search: search.trim(), page })
      .then(r => { setItems(r.items); setTotal(r.total); setSourceTypes(r.sourceTypes); })
      .catch(e => setErr(e?.response?.data?.message || 'Could not load content.'));
  }, [sourceType, filter, search, page]);

  useEffect(() => { if (view === 'map') load(); }, [view, load]);

  useEffect(() => {
    if (view !== 'coverage') return;
    passportApi.skillEvidenceCoverage()
      .then(r => { setCoverage(r.coverage); setCovTotals(r.totals); })
      .catch(e => setErr(e?.response?.data?.message || 'Could not load coverage.'));
  }, [view]);

  const skillByKey = useMemo(() => new Map(skills.map(s => [s.key, s])), [skills]);

  const openItem = (i: EvidenceItem) => {
    setOpen(i.sourceId);
    setDraft(i.evidence.map(e => ({ skillKey: e.skillKey, contribution: e.contribution, active: e.active })));
    setPick(''); setErr('');
  };

  const addSkill = (key: string) => {
    if (draft.some(d => d.skillKey === key)) return;
    // First skill added becomes the primary — usually right, and always changeable.
    const contribution = draft.some(d => d.contribution === 'PRIMARY') ? 'SECONDARY' : 'PRIMARY';
    setDraft(d => [...d, { skillKey: key, contribution, active: true }]);
    setPick('');
  };

  const setContribution = (key: string, contribution: string) => {
    setDraft(d => d.map(x => {
      if (x.skillKey === key) return { ...x, contribution };
      // Only one item can be primary, so promoting one demotes the other rather than
      // letting the server reject a save the screen could have prevented.
      if (contribution === 'PRIMARY' && x.contribution === 'PRIMARY') return { ...x, contribution: 'SECONDARY' };
      return x;
    }));
  };

  const save = async (i: EvidenceItem) => {
    setBusy(i.sourceId); setErr(''); setMsg('');
    try {
      await passportApi.saveSkillEvidence(i.sourceType, i.sourceId, draft);
      setOpen(null);
      setMsg('Mapping saved. No assessment or score changed.');
      setTimeout(() => setMsg(''), 3500);
      load();
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not save.'); }
    setBusy('');
  };

  const matches = pick
    ? skills.filter(s =>
        !draft.some(d => d.skillKey === s.key) && (
          s.name.toLowerCase().includes(pick.toLowerCase()) ||
          s.key.includes(pick.toUpperCase()) ||
          (s.aliases || []).some(a => a.toLowerCase().includes(pick.toLowerCase()))))
      .slice(0, 10)
    : [];

  const pages = Math.ceil(total / 25);

  return (
    <div className="sev">
      <div className="sev-hd">
        <div>
          <h1>Assessment Skill Evidence</h1>
          <p>
            Which canonical skill each piece of assessment content measures. This is
            configuration — mapping an item changes nothing about how it is asked or marked,
            and no student data is affected.
          </p>
        </div>
        <div className="tabs">
          <button className={view === 'map' ? 'on' : ''} onClick={() => setView('map')}>Map content</button>
          <button className={view === 'coverage' ? 'on' : ''} onClick={() => setView('coverage')}>Coverage</button>
        </div>
      </div>

      {err && <div className="pm-msg err">{err}</div>}
      {msg && <div className="pm-msg ok">{msg}</div>}

      {view === 'map' && (
        <>
          <div className="sev-bar">
            <select value={sourceType} onChange={e => { setSourceType(e.target.value); setPage(0); }}>
              {sourceTypes.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>

            <div className="filters">
              {(['all', 'unmapped', 'mapped', 'stale'] as const).map(f => (
                <button key={f} className={filter === f ? 'on' : ''} onClick={() => { setFilter(f); setPage(0); }}>
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            <input className="find" value={search} placeholder="Search content…"
              onChange={e => { setSearch(e.target.value); setPage(0); }} />
            <span className="count">{total} item{total === 1 ? '' : 's'}</span>
          </div>

          {!items.length && (
            <div className="sev-empty">
              <b>{filter === 'unmapped' ? 'Nothing unmapped here.' : 'No CareerPilot skill evidence has been mapped yet.'}</b>
              <span>
                Map existing assessment content to canonical skills so future personalised
                assessments can measure the right capabilities.
              </span>
            </div>
          )}

          <div className="sev-list">
            {items.map(i => (
              <div className={`sev-item${open === i.sourceId ? ' open' : ''}${i.stale ? ' stale' : ''}`} key={i.sourceId}>
                <div className="hd" onClick={() => (open === i.sourceId ? setOpen(null) : openItem(i))}>
                  <span className="tx">
                    <b>{i.text || '(no text)'}</b>
                    <em>{i.itemType}{i.difficulty ? ` · ${i.difficulty.toLowerCase()}` : ''}{i.sourceTag ? ` · ${i.sourceTag}` : ''}</em>
                  </span>

                  <span className="sk">
                    {!i.evidence.length && <i className="pill none">unmapped</i>}
                    {i.evidence.map(e => (
                      <i key={e.skillKey} className={`pill${e.contribution === 'PRIMARY' ? ' pri' : ''}${!e.skillActive || e.missing ? ' bad' : ''}`}
                        title={e.missing ? 'This skill is no longer in the graph' : !e.skillActive ? 'This skill has been deactivated' : e.contribution}>
                        {e.skillName}
                      </i>
                    ))}
                  </span>
                  <i className={`bi bi-chevron-${open === i.sourceId ? 'up' : 'down'}`} />
                </div>

                {open === i.sourceId && (
                  <div className="body">
                    <div className="rows">
                      {draft.map(d => {
                        const known = skillByKey.get(d.skillKey);
                        const stale = i.evidence.find(e => e.skillKey === d.skillKey && (e.missing || !e.skillActive));
                        return (
                          <div className="r" key={d.skillKey}>
                            <span className="n">
                              {known?.name || i.evidence.find(e => e.skillKey === d.skillKey)?.skillName || d.skillKey}
                              {stale && <em title="Kept because it was mapped before the skill was retired">retired</em>}
                            </span>
                            <select value={d.contribution} onChange={e => setContribution(d.skillKey, e.target.value)}>
                              {CONTRIB.map(c => <option key={c} value={c}>{c === 'PRIMARY' ? 'Primary' : 'Secondary'}</option>)}
                            </select>
                            <button className="rm" onClick={() => setDraft(x => x.filter(y => y.skillKey !== d.skillKey))}>
                              <i className="bi bi-x-lg" />
                            </button>
                          </div>
                        );
                      })}
                      {!draft.length && <div className="none">No skills mapped to this item yet.</div>}
                    </div>

                    <div className="add">
                      <input value={pick} placeholder="Search a skill to add…" onChange={e => setPick(e.target.value)} />
                      {!!matches.length && (
                        <div className="opts">
                          {matches.map(s => (
                            <button key={s.key} onClick={() => addSkill(s.key)}>
                              {s.name} <em>{s.key}</em>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="acts">
                      <button className="pm-btn ghost" onClick={() => setOpen(null)}>Cancel</button>
                      <button className="pm-btn primary" disabled={busy === i.sourceId} onClick={() => save(i)}>
                        {busy === i.sourceId ? 'Saving…' : 'Save mapping'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {pages > 1 && (
            <div className="sev-pager">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</button>
              <span>Page {page + 1} of {pages}</span>
              <button disabled={page + 1 >= pages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          )}
        </>
      )}

      {view === 'coverage' && (
        <>
          {covTotals && (
            <div className="sev-sum">
              <div className="s"><b>{covTotals.mappings}</b><span>mappings</span></div>
              <div className="s"><b>{covTotals.withEvidence}</b><span>skills with evidence</span></div>
              <div className={`s${covTotals.withoutEvidence ? ' warn' : ''}`}>
                <b>{covTotals.withoutEvidence}</b><span>measurable skills with none</span>
              </div>
            </div>
          )}

          <div className="sev-cov">
            <div className="cr head">
              <span className="n">Skill</span>
              <span className="t">Total</span>
              <span className="t">Primary</span>
              <span className="by">By content type</span>
            </div>
            {coverage.map(c => (
              <div className={`cr${c.total === 0 ? ' zero' : ''}${!c.active ? ' off' : ''}`} key={c.skillKey}>
                <span className="n">
                  {c.skillName}
                  {!c.active && <em>inactive</em>}
                </span>
                <span className="t">{c.total}</span>
                <span className="t">{c.primary}</span>
                <span className="by">
                  {Object.entries(c.byType).map(([k, n]) => (
                    <i className="pill" key={k}>{(sourceTypes.find(s => s.key === k)?.label || k)}: {n}</i>
                  ))}
                  {c.total === 0 && c.assessable && c.active && <i className="pill warn">no evidence yet</i>}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminSkillEvidence;
