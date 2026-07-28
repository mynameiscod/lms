import React, { useEffect, useState } from 'react';
import passportApi, { PassportContentDoc, ContentPreview } from '../../api/passportApi';
import './member.css';

const TYPES = ['learn', 'practice', 'aptitude', 'communication', 'resume', 'mock'];
const LINKS = [
  { v: '', label: '— none (self-directed) —' },
  { v: '/passport/practice?kind=coding', label: 'Practice Lab · Coding' },
  { v: '/passport/practice?kind=sql', label: 'Practice Lab · SQL' },
  { v: '/passport/practice?kind=mcq', label: 'Practice Lab · MCQ' },
  { v: '/passport/interview', label: 'Mock Interview' },
  { v: '/passport/resume', label: 'Resume Center' },
  { v: '/passport/roadmap', label: '90-Day Roadmap' },
];

/**
 * Admin › Passport Missions — edit the per-category mission pools that daily missions
 * AND the roadmap are generated from. Generation stays deterministic: each day picks
 * from these pools by a stable hash, biased to the member's two weakest categories.
 */
const AdminMissions: React.FC = () => {
  const [content, setContent] = useState<PassportContentDoc | null>(null);
  const [categories, setCategories] = useState<{ key: string; label: string }[]>([]);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [preview, setPreview] = useState<ContentPreview | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await passportApi.getContent();
        // Guarantee a pool row per known category so an admin can fill an empty one.
        const pools = [...r.content.missionPools];
        for (const c of r.categories) if (!pools.find(p => p.category === c.key)) pools.push({ category: c.key, items: [] });
        setContent({ ...r.content, missionPools: pools });
        setCategories(r.categories);
      } catch (e: any) { setMsg({ kind: 'err', text: e?.response?.data?.message || 'Could not load missions.' }); }
    })();
  }, []);

  const patch = (fn: (c: PassportContentDoc) => void) => {
    setContent(prev => { if (!prev) return prev; const next = JSON.parse(JSON.stringify(prev)); fn(next); return next; });
  };

  const save = async () => {
    if (!content) return;
    setBusy(true); setMsg(null);
    try {
      const r = await passportApi.saveContent({ missionPools: content.missionPools });
      setContent(r.content);
      setMsg({ kind: 'ok', text: 'Saved. Today’s missions regenerate from these pools on next load.' });
    } catch (e: any) { setMsg({ kind: 'err', text: e?.response?.data?.message || 'Could not save.' }); }
    setBusy(false);
  };

  const reset = async () => {
    if (!window.confirm('Restore the shipped default mission pools? Your edits to missions will be lost.')) return;
    setBusy(true); setMsg(null);
    try {
      const r = await passportApi.resetContent('missions');
      setContent(r.content);
      setMsg({ kind: 'ok', text: 'Defaults restored.' });
    } catch (e: any) { setMsg({ kind: 'err', text: e?.response?.data?.message || 'Could not reset.' }); }
    setBusy(false);
  };

  const runPreview = async () => {
    if (!content) return;
    setBusy(true); setMsg(null);
    try { setPreview(await passportApi.previewContent({ missionPools: content.missionPools })); }
    catch (e: any) { setMsg({ kind: 'err', text: e?.response?.data?.message || 'Preview failed.' }); }
    setBusy(false);
  };

  if (!content) return <div className="pa-wrap"><div className="pm-loading">{msg?.text || 'Loading missions…'}</div></div>;

  const pool = content.missionPools[active];
  const catLabel = (k: string) => categories.find(c => c.key === k)?.label || k;

  return (
    <div className="pa-wrap">
      <div className="pa-crumb">Career Passport <span style={{ color: '#cbd5e1' }}>›</span> <b>Missions</b></div>
      <div className="pa-head">
        <div>
          <h1>Passport Missions</h1>
          <p>Daily missions are generated deterministically — no AI cost per member. Each day picks 3 items: two from the member's weakest categories and one rotating. Edit the pools here and both daily missions and the 90-day roadmap change.</p>
        </div>
        <div className="pa-actions">
          <button className="pm-btn" onClick={runPreview} disabled={busy}>Preview 7 days</button>
          <button className="pm-btn" onClick={reset} disabled={busy}>Restore defaults</button>
          <button className="pm-btn primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>

      {msg && <div className={`pm-msg ${msg.kind}`} style={{ marginBottom: 14 }}>{msg.text}</div>}

      <div className="pa-tabs">
        {content.missionPools.map((p, i) => (
          <button key={p.category} className={`pr-chip${i === active ? ' on' : ''}`} onClick={() => setActive(i)}>
            {catLabel(p.category)} <span style={{ opacity: .7 }}>({p.items.length})</span>
          </button>
        ))}
      </div>

      {pool && (
        <div className="pa-card">
          <h3>{catLabel(pool.category)} pool</h3>
          {!pool.items.length && (
            <div className="pm-msg info" style={{ marginBottom: 12 }}>
              This pool is empty — the shipped defaults are used instead so members never get a blank day. Add items to override.
            </div>
          )}

          <div className="pa-pool-item" style={{ marginBottom: 6 }}>
            <span className="pa-lbl">Title</span>
            <span className="pa-lbl">Detail</span>
            <span className="pa-lbl">Type</span>
            <span className="pa-lbl">XP</span>
            <span className="pa-lbl">Opens</span>
            <span />
          </div>

          {pool.items.map((it, i) => (
            <div className="pa-pool-item" key={i}>
              <input className="pa-inp sm" value={it.title} placeholder="Mission title"
                onChange={e => patch(c => { c.missionPools[active].items[i].title = e.target.value; })} />
              <input className="pa-inp sm" value={it.detail} placeholder="What the member actually does"
                onChange={e => patch(c => { c.missionPools[active].items[i].detail = e.target.value; })} />
              <select className="pa-inp sm" value={it.type}
                onChange={e => patch(c => { c.missionPools[active].items[i].type = e.target.value; })}>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input className="pa-inp sm" type="number" min={0} max={200} value={it.xp}
                onChange={e => patch(c => { c.missionPools[active].items[i].xp = Number(e.target.value) || 0; })} />
              <select className="pa-inp sm" value={it.link || ''}
                onChange={e => patch(c => { c.missionPools[active].items[i].link = e.target.value || undefined; })}>
                {LINKS.map(l => <option key={l.v} value={l.v}>{l.label}</option>)}
              </select>
              <button className="rs-del" style={{ position: 'static' }} onClick={() => patch(c => { c.missionPools[active].items.splice(i, 1); })}>✕</button>
            </div>
          ))}

          <button
            className="rs-add" style={{ marginTop: 8 }}
            onClick={() => patch(c => { c.missionPools[active].items.push({ title: '', detail: '', type: 'learn', xp: 20 }); })}
          >+ Add mission to this pool</button>
        </div>
      )}

      {preview && (
        <div className="pa-card">
          <h3>Preview — the first 7 days a member would get</h3>
          <div style={{ fontSize: 12.5, color: '#64748b', marginBottom: 12 }}>
            {preview.sampleFromRealStudent ? 'Using a real student’s latest assessment.' : 'No assessments yet — using a synthetic mid-range profile.'}
          </div>
          <div className="pa-preview">
            {preview.days.map(d => (
              <div className="day" key={d.day}>
                <b>DAY {d.day}</b>
                {d.missions.map(m => (
                  <div key={m.key}>• {m.title} <span style={{ color: '#94a3b8' }}>({catLabel(m.category)} · +{m.xp} XP{m.link ? ` · ${m.link}` : ''})</span></div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMissions;
