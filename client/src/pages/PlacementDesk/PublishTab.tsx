import React, { useEffect, useState } from 'react';
import { placementDeskApi, Settings } from '../../api/placementDeskApi';

/** Public summary: company names, roles, packages and offer counts — never names or feedback. */
const PublishTab: React.FC<{ canManage: boolean }> = ({ canManage }) => {
  const [s, setS] = useState<Settings | null>(null);
  const [title, setTitle] = useState('');
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => { placementDeskApi.settings().then(x => { setS(x); setTitle(x.publicTitle || ''); }).catch(e => setErr(e.message)); }, []);
  const save = async (patch: any) => { setErr(''); try { const x = await placementDeskApi.saveSettings(patch); setS(x); setTitle(x.publicTitle || ''); } catch (e: any) { setErr(e.message); } };
  const url = s ? `${window.location.origin}/placements/${s.publicToken}` : '';
  const copy = async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* blocked */ } };

  if (!s) return <div className="pd-section">{err ? <div className="pd-err">{err}</div> : <div className="pd-empty">Loading…</div>}</div>;
  return (
    <div className="pd-section">
      {err && <div className="pd-err">{err}</div>}
      <div className="pd-card pd-publish">
        <div className="pd-publish-row">
          <div>
            <h4>Public placement summary</h4>
            <p>A page anyone with the link can open — share it with students, on WhatsApp or on the website. It shows company names, roles, packages, how many attended and how many got offers. <b>It never shows student names, feedback, contacts or officers.</b></p>
          </div>
          {canManage && <button className={`pd-switch ${s.publicEnabled ? 'on' : ''}`} onClick={() => save({ publicEnabled: !s.publicEnabled })}><span />{s.publicEnabled ? 'Published' : 'Off'}</button>}
        </div>
        <label className="pd-block"><span>Page title</span>
          <div className="pd-inline"><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Placement Updates" disabled={!canManage} />{canManage && title !== (s.publicTitle || '') && <button className="pd-btn primary" onClick={() => save({ publicTitle: title })}>Save</button>}</div>
        </label>
        <label className="pd-block"><span>Link</span>
          <div className="pd-inline">
            <input readOnly value={url} />
            <button className="pd-btn" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
            <a className="pd-btn" href={url} target="_blank" rel="noreferrer">Open</a>
            {canManage && <button className="pd-btn" onClick={() => window.confirm('Make a new link? The old link stops working.') && save({ regenerate: true })}>New link</button>}
          </div>
        </label>
        {!s.publicEnabled && <p className="pd-hint">The link shows "not published" until you switch it on.</p>}
        <p className="pd-hint">The page opens on this month. Add <code>?from=2026-11-01&amp;to=2026-11-30</code> to the link for another period.</p>
      </div>
    </div>
  );
};

export default PublishTab;
