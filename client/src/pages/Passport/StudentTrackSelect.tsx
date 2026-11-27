import React, { useEffect, useState } from 'react';
import { careerTrackApi, CareerTrackRow } from '../../api/passportApi';

/**
 * Admin: which career track this Year-3/4 student is on. Any track can be set — a DRAFT one too,
 * which is how a track is piloted on a few students before it goes live. A roadmap the student has
 * not started is rebuilt at once; one already started keeps its days until it is rebuilt below.
 */
const StudentTrackSelect: React.FC<{ studentId: string; stage: string | null; current: string | null; onChanged: () => void }> = ({ studentId, stage, current, onChanged }) => {
  const [tracks, setTracks] = useState<CareerTrackRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { careerTrackApi.list().then(c => setTracks(c.tracks)).catch(() => setTracks([])); }, []);
  if (!['build', 'specialize', 'placement'].includes(String(stage)) || !tracks?.length) return null;

  const change = async (key: string) => {
    setBusy(true); setMsg(null);
    try {
      const r = await careerTrackApi.setStudentTrack(studentId, key || null);
      if (!r.ok) { setMsg({ ok: false, text: r.message || 'Not saved.' }); return; }
      setMsg({ ok: true, text: !key ? 'Track removed.' : r.rebuilt ? 'Track set, and the roadmap was rebuilt from it.'
        : 'Track set. This student has started, so use "Rebuild roadmap" below to move their remaining days to it.' });
      onChanged();
    } catch { setMsg({ ok: false, text: 'Not saved.' }); } finally { setBusy(false); }
  };

  return (
    <div className="sr-note" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
      <b>Career track</b>
      <select value={current || ''} disabled={busy} onChange={e => change(e.target.value)}
        style={{ border: '1px solid #d8e2ec', borderRadius: 8, padding: '6px 10px', font: 'inherit', maxWidth: '100%' }}>
        <option value="">No track (year curriculum)</option>
        {tracks.map(t => <option key={t.key} value={t.key}>{t.name}{t.status === 'LIVE' ? '' : ' — draft'}</option>)}
      </select>
      {msg && <span style={{ color: msg.ok ? '#106b3a' : '#b42318', fontSize: 13 }}>{msg.text}</span>}
    </div>
  );
};

export default StudentTrackSelect;
