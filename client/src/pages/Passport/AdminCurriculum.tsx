import React, { useCallback, useEffect, useState } from 'react';
import passportApi, { CurriculumTrack, CurriculumDay, CurriculumItem } from '../../api/passportApi';
import './adminCurriculum.css';

/**
 * Authoring a pathway's day-by-day curriculum.
 *
 * The roadmap is generated from a member's own scores, which is right for personalising
 * emphasis and wrong for teaching a syllabus in order. This is the override: a day
 * written here is served verbatim to everyone on the pathway, and a day left unwritten
 * still generates. That is what lets a 30-day curriculum sit on a 365-day journey
 * without leaving a hole — and why nobody has to author 7,300 days before this is useful.
 *
 * Content is authored per TRACK. The four stage variants inherit it, so the real job is
 * five curricula rather than twenty.
 */

const TYPES = [
  { key: 'learn', label: 'Learn' },
  { key: 'practice', label: 'Practice' },
  { key: 'aptitude', label: 'Aptitude' },
  { key: 'communication', label: 'Communication' },
  { key: 'resume', label: 'Resume' },
  { key: 'mock', label: 'Mock interview' },
];
const CATS = [
  { key: 'technical', label: 'Technical' },
  { key: 'aptitude', label: 'Aptitude' },
  { key: 'logical_reasoning', label: 'Logical Reasoning' },
  { key: 'communication', label: 'Communication' },
  { key: 'employability', label: 'Employability' },
  { key: 'career_clarity', label: 'Career Clarity' },
];

const blankItem = (): CurriculumItem =>
  ({ title: '', detail: '', type: 'learn', xp: 20, link: '', category: 'technical' });

const AdminCurriculum: React.FC = () => {
  const [tracks, setTracks] = useState<CurriculumTrack[]>([]);
  const [key, setKey] = useState('');
  const [days, setDays] = useState<CurriculumDay[]>([]);
  const [journeyDays, setJourney] = useState(90);
  const [open, setOpen] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // AI panel
  const [aiCount, setAiCount] = useState(7);
  const [aiBrief, setAiBrief] = useState('');

  useEffect(() => {
    passportApi.listCurricula()
      .then(r => {
        setTracks(r.tracks);
        if (r.tracks.length && !key) setKey(r.tracks[0].key);
      })
      .catch(e => setErr(e?.response?.data?.message || 'Could not load pathways.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async (k: string) => {
    if (!k) return;
    setErr(''); setMsg('');
    try {
      const r = await passportApi.getCurriculum(k);
      setDays(r.days); setJourney(r.journeyDays); setDirty(false); setOpen(null);
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not load this curriculum.'); }
  }, []);
  useEffect(() => { load(key); }, [key, load]);

  const refreshCounts = () =>
    passportApi.listCurricula().then(r => setTracks(r.tracks)).catch(() => { /* the page still works */ });

  const setDay = (i: number, patch: Partial<CurriculumDay>) =>
    { setDays(d => d.map((x, j) => (j === i ? { ...x, ...patch } : x))); setDirty(true); };
  const setItem = (di: number, ii: number, patch: Partial<CurriculumItem>) =>
    { setDays(d => d.map((x, j) => (j === di
        ? { ...x, items: x.items.map((it, k2) => (k2 === ii ? { ...it, ...patch } : it)) }
        : x))); setDirty(true); };

  const addDay = () => {
    setDays(d => [...d, { day: d.length + 1, theme: '', items: [blankItem()] }]);
    setOpen(days.length); setDirty(true);
  };
  const duplicateDay = (i: number) => {
    setDays(d => {
      const copy: CurriculumDay = JSON.parse(JSON.stringify(d[i]));
      const next = [...d.slice(0, i + 1), copy, ...d.slice(i + 1)];
      return next.map((x, j) => ({ ...x, day: j + 1 }));
    });
    setDirty(true);
  };
  const removeDay = (i: number) => {
    if (!window.confirm(`Delete day ${i + 1}? Everything below shifts up.`)) return;
    setDays(d => d.filter((_, j) => j !== i).map((x, j) => ({ ...x, day: j + 1 })));
    setOpen(null); setDirty(true);
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= days.length) return;
    setDays(d => {
      const n = [...d];
      [n[i], n[j]] = [n[j], n[i]];
      return n.map((x, k2) => ({ ...x, day: k2 + 1 }));
    });
    setOpen(j); setDirty(true);
  };

  const save = async () => {
    setBusy('save'); setErr(''); setMsg('');
    try {
      const r = await passportApi.saveCurriculum(key, days);
      setDays(r.days); setDirty(false); setMsg('Saved.');
      refreshCounts();
      setTimeout(() => setMsg(''), 2500);
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not save.'); }
    setBusy('');
  };

  const draft = async () => {
    setBusy('ai'); setErr(''); setMsg('');
    try {
      const r = await passportApi.draftCurriculum(key, aiCount, aiBrief || undefined);
      setDays(r.days); setDirty(false);
      setMsg(`${r.added} day${r.added === 1 ? '' : 's'} drafted — read them before students do.`);
      refreshCounts();
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not draft.'); }
    setBusy('');
  };

  const copyFrom = async (from: string) => {
    if (!from) return;
    if (days.length && !window.confirm('This REPLACES the current days with that pathway’s. Continue?')) return;
    setBusy('copy'); setErr(''); setMsg('');
    try {
      const r = await passportApi.copyCurriculum(key, from);
      setDays(r.days); setDirty(false); setMsg(`Copied from ${r.copiedFrom}.`);
      refreshCounts();
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not copy.'); }
    setBusy('');
  };

  const track = tracks.find(t => t.key === key);
  const generated = Math.max(0, journeyDays - days.length);

  return (
    <div className="cur">
      <div className="cur-hd">
        <div>
          <h1>Pathway Curriculum <span className="cur-retired">Retired</span></h1>
          <p>
            <b>These days no longer reach students.</b> Daily work now comes from each
            member’s own roadmap, built from what their assessment measured — authored days
            handed identical items to everyone on a pathway, which is the opposite of that.
          </p>
          <p style={{ marginTop: 6 }}>
            Nothing has been deleted: what you wrote is still stored and still shown below.
            To shape what a student does, use <b>Role Blueprint</b> (which skills their plan
            covers) and <b>Concept Bank</b> (what each objective opens).
          </p>
        </div>
        <button className="pm-btn primary" disabled={!dirty || !!busy} onClick={save}>
          {busy === 'save' ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
        </button>
      </div>

      {err && <div className="pm-msg err">{err}</div>}
      {msg && <div className="pm-msg ok">{msg}</div>}

      <div className="cur-tracks">
        {tracks.map(t => (
          <button key={t.key} className={`cur-track${key === t.key ? ' on' : ''}`} onClick={() => setKey(t.key)}>
            <b>{t.label}</b>
            <span>{t.days ? `${t.days} authored` : 'all generated'}</span>
          </button>
        ))}
      </div>

      {track && (
        <div className="cur-bar">
          <div className="cur-split" title={`${days.length} authored, ${generated} generated`}>
            <i className="a" style={{ width: `${(days.length / journeyDays) * 100}%` }} />
          </div>
          <span><b>{days.length}</b> authored · <b>{generated}</b> generated · {journeyDays}-day journey</span>

          <select className="cur-copy" value="" disabled={!!busy}
            onChange={e => copyFrom(e.target.value)}>
            <option value="">Copy days from…</option>
            {tracks.filter(t => t.key !== key && t.days > 0)
              .map(t => <option key={t.key} value={t.key}>{t.label} ({t.days} days)</option>)}
          </select>
        </div>
      )}

      {/* ── AI drafting ── */}
      <div className="cur-ai">
        <div className="hd"><i className="bi bi-stars" /> Draft with AI</div>
        <p>
          Writes the next {aiCount} day{aiCount === 1 ? '' : 's'} after day {days.length}, using this
          track and what is already written so it continues rather than restarts.
          <b> It lands in the editor — nothing reaches a student until you save.</b>
        </p>
        <div className="row">
          <label>Days
            <input type="number" min={1} max={30} value={aiCount}
              onChange={e => setAiCount(Math.min(30, Math.max(1, Number(e.target.value) || 1)))} />
          </label>
          <label className="grow">Anything specific? (optional)
            <input value={aiBrief} placeholder="e.g. focus on Spring Boot, REST and unit tests"
              onChange={e => setAiBrief(e.target.value)} />
          </label>
          <button className="pm-btn teal" disabled={!!busy || !key} onClick={draft}>
            {busy === 'ai' ? 'Drafting…' : 'Draft days'}
          </button>
        </div>
      </div>

      {/* ── the days ── */}
      <div className="cur-days">
        {!days.length && (
          <div className="cur-empty">
            <b>No authored days yet.</b>
            <span>Every day of this track is generated from each member’s scores. Add a day, or draft a batch with AI.</span>
          </div>
        )}

        {days.map((d, i) => (
          <div className={`cur-day${open === i ? ' open' : ''}`} key={i}>
            <div className="cur-day-hd">
              <span className="n">{d.day}</span>
              <button className="ttl" onClick={() => setOpen(open === i ? null : i)}>
                <b>{d.theme || d.items[0]?.title || `Day ${d.day}`}</b>
                <span>{d.items.length} item{d.items.length === 1 ? '' : 's'}</span>
              </button>
              <div className="acts">
                <button title="Move up" disabled={i === 0} onClick={() => move(i, -1)}><i className="bi bi-arrow-up" /></button>
                <button title="Move down" disabled={i === days.length - 1} onClick={() => move(i, 1)}><i className="bi bi-arrow-down" /></button>
                <button title="Duplicate" onClick={() => duplicateDay(i)}><i className="bi bi-copy" /></button>
                <button title="Delete" className="del" onClick={() => removeDay(i)}><i className="bi bi-trash" /></button>
              </div>
            </div>

            {open === i && (
              <div className="cur-day-body">
                <label className="fl">Day heading (optional)
                  <input value={d.theme || ''} placeholder="e.g. Java basics — variables and types"
                    onChange={e => setDay(i, { theme: e.target.value })} />
                </label>

                {d.items.map((it, ii) => (
                  <div className="cur-item" key={ii}>
                    <div className="r1">
                      <input className="t" value={it.title} placeholder="What the student does"
                        onChange={e => setItem(i, ii, { title: e.target.value })} />
                      <select value={it.type} onChange={e => setItem(i, ii, { type: e.target.value })}>
                        {TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                      </select>
                      <select value={it.category || 'technical'} onChange={e => setItem(i, ii, { category: e.target.value })}>
                        {CATS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                      <input className="xp" type="number" min={0} max={500} value={it.xp}
                        onChange={e => setItem(i, ii, { xp: Number(e.target.value) || 0 })} />
                      <button className="del" title="Remove item"
                        onClick={() => { setDay(i, { items: d.items.filter((_, k2) => k2 !== ii) }); }}>
                        <i className="bi bi-x-lg" />
                      </button>
                    </div>
                    <input className="d" value={it.detail} placeholder="One sentence saying exactly what to do"
                      onChange={e => setItem(i, ii, { detail: e.target.value })} />
                    <input className="d" value={it.link || ''} placeholder="Where it happens, e.g. /careerpilot/practice?kind=coding"
                      onChange={e => setItem(i, ii, { link: e.target.value })} />
                  </div>
                ))}

                {d.items.length < 3 && (
                  <button className="pm-btn ghost" onClick={() => setDay(i, { items: [...d.items, blankItem()] })}>
                    + Add item <span className="hint">(max 3 a day)</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        <button className="cur-add" onClick={addDay}>
          <i className="bi bi-plus-lg" /> Add day {days.length + 1}
        </button>
      </div>
    </div>
  );
};

export default AdminCurriculum;
