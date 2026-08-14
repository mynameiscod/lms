import React, { useCallback, useEffect, useState } from 'react';
import passportApi, {
  PassportPathway, PathwayMatch, PathwayScoreRule,
  RuleVocabulary, RulePreview, ReevaluateResult,
} from '../../api/passportApi';
import './adminPathwayRules.css';

/**
 * Who each pathway serves.
 *
 * Assignment used to be four hard-coded substring tests, so a pathway an admin created
 * could never be given to anyone. This is where that decision now lives.
 *
 * The preview panel is not a convenience — it is the reason this is safe to use. Rules
 * over six categories, four stages and a goal list interact in ways nobody holds in their
 * head, and a rule matching nobody looks exactly like a rule that works until a member
 * complains weeks later. So every edit re-runs against the real roster before it saves.
 */

const BLANK: PathwayMatch = {
  enabled: false, priority: 10, goals: [], stages: [], backgrounds: [], scores: [], fallback: false,
};

const AdminPathwayRules: React.FC = () => {
  const [pathways, setPathways] = useState<PassportPathway[]>([]);
  const [active, setActive] = useState(false);
  const [vocab, setVocab] = useState<RuleVocabulary | null>(null);
  const [preview, setPreview] = useState<RulePreview | null>(null);
  const [open, setOpen] = useState<string>('');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // AI drafting, per pathway
  const [aiFor, setAiFor] = useState('');
  const [aiText, setAiText] = useState('');

  // Re-evaluation runs in two steps — see the diff, then decide.
  const [diff, setDiff] = useState<ReevaluateResult | null>(null);

  useEffect(() => {
    Promise.all([passportApi.getContent(), passportApi.ruleVocabulary()])
      .then(([c, v]) => {
        setPathways(c.content.pathways || []);
        setActive(c.content.pathwayRulesActive === true);
        setVocab(v);
      })
      .catch(e => setErr(e?.response?.data?.message || 'Could not load pathways.'));
  }, []);

  /** Only tracks route members; stage variants inherit whatever their track matched. */
  const tracks = pathways.filter(p => !p.stage && !p.key.includes(':'));
  const rulesOn = tracks.some(p => p.match?.enabled);
  const hasFallback = tracks.some(p => p.match?.fallback && p.match?.enabled);

  const runPreview = useCallback(async (list: PassportPathway[]) => {
    try { setPreview(await passportApi.previewRules(list)); }
    catch { /* the editor stays usable without a preview */ }
  }, []);

  // Debounced so typing a score band does not fire a request per keystroke.
  useEffect(() => {
    if (!pathways.length) return;
    const t = setTimeout(() => runPreview(pathways), 400);
    return () => clearTimeout(t);
  }, [pathways, runPreview]);

  const setMatch = (key: string, patch: Partial<PathwayMatch>) => {
    setPathways(ps => ps.map(p =>
      (p.key === key && !p.stage)
        ? { ...p, match: { ...BLANK, ...(p.match || {}), ...patch } }
        : p));
    setDirty(true);
  };

  const toggleIn = (key: string, field: 'goals' | 'stages' | 'backgrounds', value: string) => {
    const cur = (pathways.find(p => p.key === key && !p.stage)?.match?.[field] || []) as string[];
    setMatch(key, { [field]: cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value] } as any);
  };

  /** Exactly one fallback, enforced here as well as on the server. */
  const makeFallback = (key: string) => {
    setPathways(ps => ps.map(p => (p.stage ? p : {
      ...p,
      match: { ...BLANK, ...(p.match || {}), fallback: p.key === key, enabled: p.key === key ? true : (p.match?.enabled ?? false) },
    })));
    setDirty(true);
  };

  const setScore = (key: string, i: number, patch: Partial<PathwayScoreRule>) => {
    const cur = pathways.find(p => p.key === key && !p.stage)?.match?.scores || [];
    setMatch(key, { scores: cur.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  };
  const addScore = (key: string) => {
    const cur = pathways.find(p => p.key === key && !p.stage)?.match?.scores || [];
    setMatch(key, { scores: [...cur, { category: vocab?.categories[0]?.key || 'overall', min: null, max: null }] });
  };
  const removeScore = (key: string, i: number) => {
    const cur = pathways.find(p => p.key === key && !p.stage)?.match?.scores || [];
    setMatch(key, { scores: cur.filter((_, j) => j !== i) });
  };

  const save = async (nextActive = active) => {
    setBusy('save'); setErr(''); setMsg('');
    try {
      const r = await passportApi.saveContent({ pathways, pathwayRulesActive: nextActive });
      setPathways(r.content.pathways || []);
      setActive(r.content.pathwayRulesActive === true);
      setDirty(false);
      setMsg(nextActive
        ? 'Saved and live. Members are sorted by your rules from their next assessment.'
        : 'Saved as a draft. Nothing changes for members until you switch these on.');
      setTimeout(() => setMsg(''), 5000);
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not save.'); }
    setBusy('');
  };

  /**
   * Going live is its own act. Turning rules ON saves at the same moment, so the state an
   * admin was looking at is the state that takes effect — a switch that goes live against
   * rules still sitting unsaved in the editor would be worse than no switch at all.
   */
  const toggleActive = async () => {
    if (!active && preview?.errors.length) return;   // the button is disabled; belt and braces
    if (active && !window.confirm('Turn your rules off? New members go back to the built-in sorting. Nobody already sorted will move.')) return;
    await save(!active);
  };

  const draft = async (key: string) => {
    if (!aiText.trim()) return;
    setBusy('ai'); setErr(''); setMsg('');
    try {
      const r = await passportApi.draftRule(key, aiText.trim());
      setMatch(key, r.match);
      setAiFor(''); setAiText('');
      setMsg('Drafted into the rule below — check it against the preview before saving.');
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not draft a rule.'); }
    setBusy('');
  };

  const showDiff = async () => {
    setBusy('diff'); setErr('');
    try { setDiff(await passportApi.reevaluatePathways()); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Could not work out the changes.'); }
    setBusy('');
  };
  const applyDiff = async () => {
    setBusy('apply'); setErr('');
    try {
      const r = await passportApi.applyReevaluation();
      setDiff(null);
      setMsg(`${r.changeCount} member${r.changeCount === 1 ? '' : 's'} moved.`);
      runPreview(pathways);
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not apply.'); }
    setBusy('');
  };

  const rowFor = (key: string) => preview?.rows.find(r => r.key === key);

  return (
    <div className="rul">
      <div className="rul-hd">
        <div>
          <h1>Pathway Rules</h1>
          <p>
            Decide who each pathway is for. Build the rules here in draft, check who they
            catch, and switch them on when you are happy — nothing reaches a member before that.
          </p>
        </div>
        <button className="pm-btn primary" disabled={!dirty || !!busy} onClick={() => save()}>
          {busy === 'save' ? 'Saving…' : dirty ? 'Save' : 'Saved'}
        </button>
      </div>

      {/* ── Live or draft. The single thing that decides whether any of this matters. ── */}
      <div className={`rul-live${active ? ' on' : ''}`}>
        <div className="ic"><i className={`bi bi-${active ? 'broadcast' : 'pencil-square'}`} /></div>
        <div className="tx">
          <b>{active ? 'Your rules are sorting members' : 'Draft — the built-in sorting is still in use'}</b>
          <span>
            {active
              ? 'Every member who finishes the assessment from now on is sorted by the rules below.'
              : 'Edit freely. Nothing here affects a single member until you switch it on.'}
          </span>
        </div>
        <button
          className={`pm-btn ${active ? 'ghost' : 'primary'}`}
          disabled={!!busy || (!active && (!!preview?.errors.length || !rulesOn))}
          title={
            active ? 'Go back to the built-in sorting'
              : !rulesOn ? 'Switch on at least one pathway rule first'
              : preview?.errors.length ? preview.errors[0]
              : 'Start sorting members with these rules'
          }
          onClick={toggleActive}
        >
          {busy === 'save' ? 'Working…' : active ? 'Switch off' : 'Switch on'}
        </button>
      </div>

      {err && <div className="pm-msg err">{err}</div>}
      {msg && <div className="pm-msg ok">{msg}</div>}

      {/* The missing fallback is the one error every admin hits, because turning on a
          first rule causes it. Telling them to "mark one pathway as the fallback" while
          the control to do it sits inside a collapsed card two screens down is an error
          that names its fix and then hides it — so the fix lives in the message. */}
      {rulesOn && !hasFallback && (
        <div className="rul-fix">
          <div className="t">
            <i className="bi bi-exclamation-octagon" />
            <div>
              <b>Pick a fallback before you switch these on.</b>
              <span>
                Some members will match none of your rules, and they still need a pathway.
                Choose the one they should land on.
              </span>
            </div>
          </div>
          <div className="picks">
            {tracks.map(p => (
              <button key={p.key} onClick={() => makeFallback(p.key)}>{p.label}</button>
            ))}
          </div>
        </div>
      )}

      {preview?.errors
        .filter(e => !/fallback pathway/i.test(e) || hasFallback)
        .map((e, i) => <div className="pm-msg err" key={i}><i className="bi bi-exclamation-octagon" /> {e}</div>)}
      {preview?.warnings.map((w, i) => <div className="rul-warn" key={i}><i className="bi bi-exclamation-triangle" /> {w}</div>)}

      {/* ── What these rules would do to the people already here ── */}
      {preview && (
        <div className="rul-summary">
          <div className="s">
            <b>{preview.total}</b>
            <span>assessed members</span>
          </div>
          <div className={`s${preview.viaFallback ? ' warn' : ''}`}>
            <b>{preview.viaFallback}</b>
            <span>{active ? 'caught by the fallback' : 'would hit the fallback'}</span>
          </div>
          <div className={`s${preview.moved ? ' move' : ''}`}>
            <b>{preview.moved}</b>
            <span>on a different pathway today</span>
          </div>
          <div className="s act">
            <button className="pm-btn ghost"
              disabled={!!busy || !preview.moved || !active}
              title={active ? 'Move existing members onto the pathway these rules give them'
                : 'Switch your rules on first'}
              onClick={showDiff}>
              {busy === 'diff' ? 'Checking…' : 'Re-evaluate existing members…'}
            </button>
          </div>
        </div>
      )}

      {/* ── The diff, before anybody moves ── */}
      {diff && (
        <div className="rul-diff">
          <div className="hd">
            <b>{diff.changeCount} of {diff.total} members would change pathway</b>
            <span>
              Existing members keep their pathway unless you apply this. Their roadmap and
              any authored days follow the pathway, so moving someone rewrites what they
              are part-way through.
            </span>
          </div>
          <div className="list">
            {(diff.changes || []).slice(0, 40).map(c => (
              <div className="row" key={c.id}>
                <b>{c.name}</b>
                <span className="e">{c.email}</span>
                <span className="mv">{c.from || 'none'} <i className="bi bi-arrow-right" /> {c.toLabel}</span>
              </div>
            ))}
            {diff.changeCount > 40 && <div className="more">…and {diff.changeCount - 40} more</div>}
          </div>
          <div className="acts">
            <button className="pm-btn ghost" onClick={() => setDiff(null)}>Cancel</button>
            <button className="pm-btn danger" disabled={busy === 'apply'} onClick={applyDiff}>
              {busy === 'apply' ? 'Moving…' : `Move ${diff.changeCount} member${diff.changeCount === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      )}

      {/* ── One card per track ── */}
      <div className="rul-list">
        {tracks.map(p => {
          const m: PathwayMatch = { ...BLANK, ...(p.match || {}) };
          const row = rowFor(p.key);
          const isOpen = open === p.key;
          return (
            <div className={`rul-card${isOpen ? ' open' : ''}${m.fallback ? ' fb' : ''}`} key={p.key}>
              <div className="rul-card-hd">
                <label className="sw" title={m.enabled ? 'Rule is on' : 'Rule is off'}>
                  <input type="checkbox" checked={m.enabled}
                    onChange={e => setMatch(p.key, { enabled: e.target.checked })} />
                  <span />
                </label>

                <button className="ttl" onClick={() => setOpen(isOpen ? '' : p.key)}>
                  <b>{p.label}</b>
                  <span className="k">{p.key}</span>
                </button>

                {m.fallback && <span className="tag fb">Fallback</span>}
                {row && (
                  <span className={`cnt${row.members === 0 && m.enabled && !m.fallback ? ' zero' : ''}`}
                    title="Members who would land here, out of everyone assessed">
                    {row.members} member{row.members === 1 ? '' : 's'}
                  </span>
                )}
                <span className="pri" title="Higher wins when two rules both match">P{m.priority}</span>
                <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'}`} />
              </div>

              {isOpen && (
                <div className="rul-card-body">
                  {m.fallback ? (
                    <p className="fb-note">
                      <i className="bi bi-shield-check" /> This is the fallback. Every member
                      no other rule claims lands here, so it needs no conditions of its own.
                    </p>
                  ) : (
                    <>
                      {/* AI drafting */}
                      <div className="rul-ai">
                        {aiFor === p.key ? (
                          <div className="row">
                            <input autoFocus value={aiText} placeholder="e.g. final-year non-CS students who want data roles but have weak technical scores"
                              onChange={e => setAiText(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') draft(p.key); }} />
                            <button className="pm-btn teal" disabled={busy === 'ai' || !aiText.trim()} onClick={() => draft(p.key)}>
                              {busy === 'ai' ? 'Drafting…' : 'Draft rule'}
                            </button>
                            <button className="pm-btn ghost" onClick={() => { setAiFor(''); setAiText(''); }}>Cancel</button>
                          </div>
                        ) : (
                          <button className="link" onClick={() => { setAiFor(p.key); setAiText(''); }}>
                            <i className="bi bi-stars" /> Describe who this is for and let AI write the rule
                          </button>
                        )}
                      </div>

                      <div className="rul-grp">
                        <label>Career goal <em>any of</em></label>
                        <div className="chips">
                          {(vocab?.goals || []).map(g => (
                            <button key={g} className={`chip${m.goals.includes(g) ? ' on' : ''}`}
                              onClick={() => toggleIn(p.key, 'goals', g)}>{g}</button>
                          ))}
                          {!vocab?.goals.length && <span className="none">No goal options on the signup form yet.</span>}
                        </div>
                      </div>

                      <div className="rul-grp">
                        <label>Stage <em>any of</em></label>
                        <div className="chips">
                          {(vocab?.stages || []).map(s => (
                            <button key={s.key} className={`chip${m.stages.includes(s.key) ? ' on' : ''}`}
                              title={s.who} onClick={() => toggleIn(p.key, 'stages', s.key)}>{s.label}</button>
                          ))}
                        </div>
                      </div>

                      <div className="rul-grp">
                        <label>Background <em>any of</em></label>
                        <div className="chips">
                          {(vocab?.backgrounds || []).map(b => (
                            <button key={b.key} className={`chip${m.backgrounds.includes(b.key) ? ' on' : ''}`}
                              onClick={() => toggleIn(p.key, 'backgrounds', b.key)}>{b.label}</button>
                          ))}
                        </div>
                      </div>

                      <div className="rul-grp">
                        <label>Scores <em>all of these must hold</em></label>
                        {m.scores.map((s, i) => (
                          <div className="score" key={i}>
                            <select value={s.category} onChange={e => setScore(p.key, i, { category: e.target.value })}>
                              {(vocab?.categories || []).map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                            </select>
                            <span>from</span>
                            <input type="number" min={0} max={100} value={s.min ?? ''} placeholder="0"
                              onChange={e => setScore(p.key, i, { min: e.target.value === '' ? null : Number(e.target.value) })} />
                            <span>to</span>
                            <input type="number" min={0} max={100} value={s.max ?? ''} placeholder="100"
                              onChange={e => setScore(p.key, i, { max: e.target.value === '' ? null : Number(e.target.value) })} />
                            <button className="del" onClick={() => removeScore(p.key, i)}><i className="bi bi-x-lg" /></button>
                          </div>
                        ))}
                        <button className="pm-btn ghost sm" onClick={() => addScore(p.key)}>+ Add a score condition</button>
                      </div>

                      <div className="rul-foot">
                        <label className="pri-in">
                          Priority
                          <input type="number" min={0} max={100} value={m.priority}
                            onChange={e => setMatch(p.key, { priority: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} />
                          <em>Higher wins when two rules both match. Give narrow rules a higher number.</em>
                        </label>
                        <button className="link" onClick={() => makeFallback(p.key)}>Make this the fallback</button>
                      </div>
                    </>
                  )}

                  {/* Who this actually catches, from the real roster */}
                  {row && !!row.samples.length && (
                    <div className="rul-who">
                      <b>Members who would land here</b>
                      {row.samples.map((s, i) => (
                        <div className="w" key={i}><span>{s.name}</span><em>{s.why}</em></div>
                      ))}
                      {row.members > row.samples.length && <div className="w more">…and {row.members - row.samples.length} more</div>}
                    </div>
                  )}
                  {row && row.members === 0 && m.enabled && !m.fallback && (
                    <div className="rul-zero">
                      <i className="bi bi-info-circle" /> No current member matches this rule. That is
                      fine for a pathway you are setting up ahead of time — worth a second look otherwise.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminPathwayRules;
