import React, { useEffect, useState } from 'react';
import passportApi, { PassportContentDoc, PassportPathway, ContentPreview } from '../../api/passportApi';
import './member.css';

/**
 * Admin › Passport Pathways — edit the career pathways a member's 90-day roadmap is
 * generated from: label, description, focus categories and the per-week themes.
 * "Preview" runs the real generator so an admin sees the output before saving.
 */
const AdminPathways: React.FC = () => {
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
        setContent(r.content); setCategories(r.categories);
      } catch (e: any) { setMsg({ kind: 'err', text: e?.response?.data?.message || 'Could not load pathways.' }); }
    })();
  }, []);

  const patch = (fn: (c: PassportContentDoc) => void) => {
    setContent(prev => { if (!prev) return prev; const next = JSON.parse(JSON.stringify(prev)); fn(next); return next; });
  };

  const save = async () => {
    if (!content) return;
    setBusy(true); setMsg(null);
    try {
      const r = await passportApi.saveContent({ pathways: content.pathways, journeyDays: content.journeyDays });
      setContent(r.content);
      setMsg({ kind: 'ok', text: 'Saved. New roadmaps use these pathways immediately.' });
    } catch (e: any) { setMsg({ kind: 'err', text: e?.response?.data?.message || 'Could not save.' }); }
    setBusy(false);
  };

  const reset = async () => {
    if (!window.confirm('Restore the shipped default pathways? Your edits to pathways will be lost.')) return;
    setBusy(true); setMsg(null);
    try {
      const r = await passportApi.resetContent('pathways');
      setContent(r.content);
      setMsg({ kind: 'ok', text: 'Defaults restored.' });
    } catch (e: any) { setMsg({ kind: 'err', text: e?.response?.data?.message || 'Could not reset.' }); }
    setBusy(false);
  };

  const runPreview = async () => {
    if (!content) return;
    setBusy(true); setMsg(null);
    try {
      setPreview(await passportApi.previewContent({
        pathways: content.pathways, journeyDays: content.journeyDays,
        pathway: content.pathways[active]?.key,
      }));
    } catch (e: any) { setMsg({ kind: 'err', text: e?.response?.data?.message || 'Preview failed.' }); }
    setBusy(false);
  };

  if (!content) return <div className="pa-wrap"><div className="pm-loading">{msg?.text || 'Loading pathways…'}</div></div>;

  const pw: PassportPathway | undefined = content.pathways[active];

  return (
    <div className="pa-wrap">
      <div className="pa-crumb">Career Passport <span style={{ color: '#cbd5e1' }}>›</span> <b>Pathways</b></div>
      <div className="pa-head">
        <div>
          <h1>Passport Pathways</h1>
          <p>Each member is matched to one pathway from their assessment (career goal, or technical strength when they haven't picked one). The pathway sets the roadmap's week-by-week themes and which categories get emphasised.</p>
        </div>
        <div className="pa-actions">
          <button className="pm-btn" onClick={runPreview} disabled={busy}>Preview</button>
          <button className="pm-btn" onClick={reset} disabled={busy}>Restore defaults</button>
          <button className="pm-btn primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>

      {msg && <div className={`pm-msg ${msg.kind}`} style={{ marginBottom: 14 }}>{msg.text}</div>}

      <div className="pa-card">
        <h3>Journey length</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <input
            className="pa-inp" style={{ width: 120 }} type="number" min={7} max={365}
            value={content.journeyDays}
            onChange={e => patch(c => { c.journeyDays = Number(e.target.value) || 90; })}
          />
          <span style={{ fontSize: 13, color: '#64748b' }}>
            days — the full journey every member buys. Weeks are derived from this ({Math.ceil((content.journeyDays || 90) / 7)} weeks). Changing it does not disturb members already mid-journey; their day count just runs against the new total.
          </span>
        </div>
      </div>

      <div className="pa-tabs">
        {content.pathways.map((p, i) => (
          <button key={p.key} className={`pr-chip${i === active ? ' on' : ''}`} onClick={() => setActive(i)}>{p.label}</button>
        ))}
      </div>

      {pw && (
        <div className="pa-card">
          <h3>
            {pw.label}
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#94a3b8' }}>key: {pw.key}</span>
          </h3>

          <div className="pa-grid2" style={{ marginBottom: 12 }}>
            <div>
              <label className="pa-lbl">Label (shown to the member)</label>
              <input className="pa-inp" value={pw.label} onChange={e => patch(c => { c.pathways[active].label = e.target.value; })} />
            </div>
            <div>
              <label className="pa-lbl">Focus categories</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 4 }}>
                {categories.map(cat => {
                  const on = pw.focus.includes(cat.key);
                  return (
                    <button
                      key={cat.key}
                      className={`pr-chip${on ? ' on' : ''}`}
                      style={{ fontSize: 12, padding: '5px 11px' }}
                      onClick={() => patch(c => {
                        const f = c.pathways[active].focus;
                        const idx = f.indexOf(cat.key);
                        if (idx >= 0) f.splice(idx, 1); else f.push(cat.key);
                      })}
                    >{cat.label}</button>
                  );
                })}
              </div>
            </div>
          </div>

          <label className="pa-lbl">Description</label>
          <textarea
            className="pa-inp" style={{ minHeight: 70, marginBottom: 14 }}
            value={pw.description}
            onChange={e => patch(c => { c.pathways[active].description = e.target.value; })}
          />

          <label className="pa-lbl">Week themes — one per week of the journey</label>
          <div style={{ display: 'grid', gap: 8 }}>
            {Array.from({ length: Math.ceil((content.journeyDays || 90) / 7) }).map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 62, fontSize: 11.5, fontWeight: 800, color: '#94a3b8', flexShrink: 0 }}>WEEK {i + 1}</span>
                <input
                  className="pa-inp sm"
                  value={pw.weekThemes[i] || ''}
                  placeholder={`Theme for week ${i + 1}`}
                  onChange={e => patch(c => {
                    const t = c.pathways[active].weekThemes;
                    while (t.length <= i) t.push('');
                    t[i] = e.target.value;
                  })}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {preview && (
        <div className="pa-card">
          <h3>Preview — what this generates</h3>
          <div style={{ fontSize: 12.5, color: '#64748b', marginBottom: 12 }}>
            {preview.sampleFromRealStudent ? 'Using a real student’s latest assessment.' : 'No assessments yet — using a synthetic mid-range profile.'}
            {' '}· {preview.totalDaysGenerated} days · {preview.totalXp.toLocaleString()} XP total
          </div>
          <div className="pa-preview">
            {preview.weeks.slice(0, 13).map(w => (
              <div className="day" key={w.week}>
                <b>WEEK {w.week}</b>
                <div><b style={{ color: '#0f172a' }}>{w.theme}</b> — {w.goal}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{w.focusLabels.join(' · ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPathways;
