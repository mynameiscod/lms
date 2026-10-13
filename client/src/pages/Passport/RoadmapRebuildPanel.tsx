import React, { useState } from 'react';
import { roadmapV2Api, RebuildOutcome, RebuildDay } from '../../api/passportApi';
import './roadmapRebuildPanel.css';

/**
 * "Rebuild roadmap as V2" on a member's journey page.
 *
 * Preview first — the roadmap now beside the one V2 would build — and nothing changes until the
 * admin confirms. A member who has not started gets a whole new roadmap; one who has keeps the
 * days they completed and the day they are on, and everything after is rebuilt.
 */
const PHASE_LABEL: Record<string, string> = { REVISION: 'Revision', BRIDGE: 'Bridge', YEAR: 'Year' };

const DayList: React.FC<{ days: RebuildDay[]; kept?: number[] }> = ({ days, kept = [] }) => (
  <ol className="rrp-days">
    {days.map(d => (
      <li key={d.dayNumber} className={kept.includes(d.dayNumber) ? 'kept' : ''}>
        <span className="rrp-day">Day {d.dayNumber}</span>
        <span className={`rrp-phase ph-${d.phase.toLowerCase()}`}>{kept.includes(d.dayNumber) ? 'Kept' : PHASE_LABEL[d.phase] || d.phase}</span>
        <span className="rrp-title">{d.titles.join(' · ') || '—'}</span>
      </li>
    ))}
  </ol>
);

const RoadmapRebuildPanel: React.FC<{
  studentId: string;
  isV2: boolean;
  rebuilds?: { at: string; from: string; mode: 'FULL' | 'FUTURE'; keptDays: number }[];
  onRebuilt: () => void;
}> = ({ studentId, isV2, rebuilds = [], onRebuilt }) => {
  const [preview, setPreview] = useState<RebuildOutcome | null>(null);
  const [busy, setBusy] = useState<'' | 'preview' | 'apply'>('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = async () => {
    setBusy('preview'); setMsg(null);
    try {
      const r = await roadmapV2Api.previewRebuild(studentId);
      if (r.ok) setPreview(r); else setMsg({ ok: false, text: r.reason || 'This roadmap cannot be rebuilt.' });
    } catch (e: any) {
      setMsg({ ok: false, text: e?.response?.data?.message || 'Could not preview the rebuild.' });
    } finally { setBusy(''); }
  };

  const apply = async () => {
    setBusy('apply');
    try {
      const r = await roadmapV2Api.applyRebuild(studentId);
      if (!r.ok) { setMsg({ ok: false, text: r.reason || 'The roadmap was not rebuilt — it is unchanged.' }); return; }
      setPreview(null);
      setMsg({ ok: true, text: r.mode === 'FUTURE'
        ? `Rebuilt as V2 — ${r.after?.keptDays.length ?? 0} day(s) the member had done or opened were kept.`
        : `Rebuilt as V2 — ${r.after?.totalDays ?? 0} days.` });
      onRebuilt();
    } catch (e: any) {
      setMsg({ ok: false, text: e?.response?.data?.message || 'Could not rebuild the roadmap.' });
    } finally { setBusy(''); }
  };

  const last = rebuilds[rebuilds.length - 1];

  return (
    <div className="rrp">
      <div className="rrp-bar">
        <span className={`rrp-version${isV2 ? ' v2' : ''}`}>{isV2 ? 'Roadmap V2' : 'Old roadmap (V1)'}</span>
        <span className="rrp-note">
          {last ? `Rebuilt ${new Date(last.at).toLocaleString()} from ${last.from}${last.mode === 'FUTURE' ? `, ${last.keptDays} day(s) kept` : ''}.`
            : isV2 ? 'Rebuild to pick up new priorities, days or Skill DNA.' : 'Rebuild to move this member to V2.'}
        </span>
        {!preview && (
          <button type="button" className="rrp-btn" onClick={load} disabled={!!busy}>
            {busy === 'preview' ? 'Preparing preview…' : isV2 ? 'Rebuild roadmap' : 'Rebuild roadmap as V2'}
          </button>
        )}
      </div>
      {msg && <div className={`rrp-msg ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</div>}

      {preview?.after && preview.before && (
        <div className="rrp-preview">
          <p className="rrp-summary">
            {preview.mode === 'FUTURE'
              ? <>This member has completed <b>{preview.before.completedDays}</b> day(s). Days <b>{preview.after.keptDays.join(', ')}</b> stay
                exactly as they are (done or open today); every day after is rebuilt by V2.</>
              : <>This member has not started, so the whole roadmap is rebuilt: <b>{preview.after.totalDays}</b> days.</>}
            {' '}V2 split: {preview.after.phaseDays.revision ? `${preview.after.phaseDays.revision} revision · ` : ''}
            {preview.after.phaseDays.bridge} bridge · {preview.after.phaseDays.year} year days.
            Quiz results, XP and progress are not touched.
          </p>
          <div className="rrp-cols">
            <div>
              <h4>Now ({preview.before.version}, {preview.before.totalDays} days)</h4>
              <DayList days={preview.before.days} />
            </div>
            <div>
              <h4>After rebuild (V2, {preview.after.totalDays} days)</h4>
              <DayList days={preview.after.days} kept={preview.after.keptDays} />
            </div>
          </div>
          <div className="rrp-actions">
            <button type="button" className="rrp-btn ghost" onClick={() => setPreview(null)} disabled={!!busy}>Cancel</button>
            <button type="button" className="rrp-btn" onClick={apply} disabled={!!busy}>
              {busy === 'apply' ? 'Rebuilding…' : 'Confirm rebuild'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoadmapRebuildPanel;
