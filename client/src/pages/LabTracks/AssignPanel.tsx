import React, { useEffect, useState } from 'react';
import * as api from '../../api/labTrackApi';
import { Track, Lab } from '../../api/labTrackApi';
import { Spinner } from '../../components/common';

/**
 * Attach a track to a batch.
 *
 * This is the step that makes a plan real — until a batch points at a track, the
 * derivation has nothing to derive and students still see "no challenge scheduled".
 *
 * Every field here was previously only reachable by hand-assembling JSON, which is
 * exactly the kind of config that goes subtly wrong and is not noticed until a batch
 * gets nothing on a Monday. Preview is shown inline for that reason: you see what the
 * batch would get today, before you save.
 */

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const GATE_MODES: { key: string; label: string; help: string }[] = [
  { key: 'off', label: 'Off', help: 'Nothing is blocked. Start here and watch completion rates.' },
  { key: 'banner', label: 'Banner', help: 'A reminder only — nothing is blocked.' },
  { key: 'interstitial', label: 'Interstitial', help: 'A full-screen prompt they must dismiss. Still nothing blocked.' },
  { key: 'block', label: 'Block', help: 'Holds learning content until today is done. Exams, live classes, submissions, fees and support are never blocked.' },
];

const AssignPanel: React.FC = () => {
  const [batches, setBatches] = useState<any[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<any>(null);

  const [f, setF] = useState<any>({
    batchId: '', trackId: '', lab: 'thinking' as Lab,
    startDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),  // tomorrow
    workingDays: [1, 2, 3, 4, 5],
    cadence: 'daily', cadenceDays: [],
    startTime: '07:00', endTime: '23:59',
    gateMode: 'off',
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const base = (process.env.REACT_APP_API_URL || '/api/v1');
      const h: Record<string, string> = { 'Content-Type': 'application/json' };
      const tok = localStorage.getItem('token'); if (tok) h.Authorization = `Bearer ${tok}`;
      const ten = localStorage.getItem('tenantId'); if (ten) h['X-Tenant-Id'] = ten;

      const [bRes, t, a] = await Promise.all([
        fetch(`${base}/batches`, { headers: h }).then(r => r.json()).catch(() => null),
        api.listTracks(),
        api.listAssignments(),
      ]);
      const list = bRes?.data?.batches || bRes?.batches || bRes?.data || [];
      setBatches(Array.isArray(list) ? list : []);
      setTracks(t.filter(x => x.status === 'published'));
      setRows(a);
      setErr('');
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { loadAll(); }, []);

  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const toggleDay = (key: 'workingDays' | 'cadenceDays', d: number) =>
    set(key, f[key].includes(d) ? f[key].filter((x: number) => x !== d) : [...f[key], d].sort());

  const save = async () => {
    setBusy(true); setErr(''); setMsg('');
    try {
      await api.upsertAssignment({
        batchId: f.batchId, trackId: f.trackId, lab: f.lab, startDate: f.startDate,
        workingDays: f.workingDays,
        cadence: f.cadence, cadenceDays: f.cadence === 'custom' ? f.cadenceDays : [],
        window: { startTime: f.startTime, endTime: f.endTime, tz: 'Asia/Kolkata' },
        gate: { mode: f.gateMode },
      });
      setMsg('Saved. The batch will resolve its day automatically from now on.');
      await loadAll();
      doPreview();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const doPreview = async () => {
    if (!f.batchId) return;
    try { setPreview(await api.previewToday(f.batchId, f.lab)); }
    catch (e: any) { setPreview({ error: e.message }); }
  };

  const trackChoices = tracks.filter(t => t.lab === f.lab);
  const ready = f.batchId && f.trackId && f.startDate;

  if (loading) return <div className="lt-loading"><Spinner /></div>;

  return (
    <div className="lt-assign">
      {err && <div className="lt-err">{err}</div>}
      {msg && <div className="lt-ok">{msg}</div>}

      <div className="lt-form">
        <h4>Attach a track to a batch</h4>

        <div className="lt-form-grid">
          <label>Lab
            <select value={f.lab} onChange={e => { set('lab', e.target.value); set('trackId', ''); }}>
              <option value="thinking">Thinking Lab</option>
              <option value="communication">Communication Lab</option>
            </select>
          </label>

          <label>Batch
            <select value={f.batchId} onChange={e => set('batchId', e.target.value)}>
              <option value="">Select a batch…</option>
              {batches.map((b: any) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </label>

          <label>Track
            <select value={f.trackId} onChange={e => set('trackId', e.target.value)}>
              <option value="">Select a track…</option>
              {trackChoices.map(t => <option key={t._id} value={t._id}>{t.name} ({t.totalDays} days)</option>)}
            </select>
          </label>

          <label>Start date
            <input type="date" value={f.startDate} onChange={e => set('startDate', e.target.value)} />
          </label>

          <label>Window opens
            <input type="time" value={f.startTime} onChange={e => set('startTime', e.target.value)} />
          </label>
          <label>Window closes
            <input type="time" value={f.endTime} onChange={e => set('endTime', e.target.value)} />
          </label>
        </div>

        {trackChoices.length === 0 && (
          <p className="lt-hint">
            No published {f.lab === 'thinking' ? 'Thinking' : 'Communication'} track yet. A track must have
            every day filled and be published before a batch can use it.
          </p>
        )}

        <div className="lt-field">
          <span className="lt-field-label">Working days</span>
          <div className="lt-daypick">
            {DAY_LABELS.map((d, i) => (
              <button key={d} type="button"
                className={`lt-daybtn ${f.workingDays.includes(i) ? 'on' : ''}`}
                onClick={() => toggleDay('workingDays', i)} aria-pressed={f.workingDays.includes(i)}>
                {d}
              </button>
            ))}
          </div>
          <small>A skipped day does not consume a plan day — a 41-day track spans about 8 working weeks.</small>
        </div>

        <div className="lt-field">
          <span className="lt-field-label">Cadence</span>
          <div className="lt-radio">
            <label><input type="radio" checked={f.cadence === 'daily'} onChange={() => set('cadence', 'daily')} /> Every working day</label>
            <label><input type="radio" checked={f.cadence === 'custom'} onChange={() => set('cadence', 'custom')} /> Only on chosen days</label>
          </div>
          {f.cadence === 'custom' && (
            <>
              <div className="lt-daypick">
                {DAY_LABELS.map((d, i) => (
                  <button key={d} type="button"
                    className={`lt-daybtn ${f.cadenceDays.includes(i) ? 'on' : ''}`}
                    onClick={() => toggleDay('cadenceDays', i)} aria-pressed={f.cadenceDays.includes(i)}>
                    {d}
                  </button>
                ))}
              </div>
              <small>Use this to alternate the two labs — thinking Mon/Wed/Fri, communication Tue/Thu.</small>
            </>
          )}
        </div>

        <div className="lt-field">
          <span className="lt-field-label">Gating</span>
          <select value={f.gateMode} onChange={e => set('gateMode', e.target.value)}>
            {GATE_MODES.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
          </select>
          <small>{GATE_MODES.find(g => g.key === f.gateMode)?.help}</small>
        </div>

        <div className="lt-form-actions">
          <button className="lt-btn" onClick={doPreview} disabled={!f.batchId}>Preview today</button>
          <button className="lt-btn primary" onClick={save} disabled={!ready || busy}>
            {busy ? 'Saving…' : 'Save assignment'}
          </button>
        </div>

        {preview && (
          <div className="lt-preview">
            <b>Preview — what this batch gets today</b>
            {preview.error ? <p className="lt-preview-bad">{preview.error}</p>
              : preview.contentId ? (
                <p>Day <b>{preview.dayIndex}</b> · window <b>{preview.windowState}</b>
                  {preview.item?.concept ? ` · ${preview.item.concept}` : ''}</p>
              ) : (
                <p className="lt-preview-bad">
                  Nothing today — {preview.reason === 'non_learning_day' ? 'not a working day for this batch'
                    : preview.reason === 'not_started' ? 'the plan has not started yet'
                    : preview.reason === 'track_unpublished' ? 'the track is still a draft'
                    : preview.reason === 'no_item' ? 'that day has no content assigned'
                    : 'no track is attached to this batch'}
                </p>
              )}
          </div>
        )}
      </div>

      <h4 className="lt-sub">Current assignments</h4>
      {rows.length === 0 ? (
        <p className="lt-hint">No batch has a track attached yet — so no student is receiving a daily challenge.</p>
      ) : (
        <div className="lt-table-wrap">
          <table className="lt-table">
            <thead><tr><th>Batch</th><th>Lab</th><th>Track</th><th>Start</th><th>Day now</th><th>Gate</th><th></th></tr></thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r._id}>
                  <td>{batches.find((b: any) => String(b._id) === String(r.batchId))?.name || '—'}</td>
                  <td>{r.lab}</td>
                  <td>{r.trackId?.name || '—'}</td>
                  <td>{new Date(r.startDate).toLocaleDateString()}</td>
                  <td>{r.currentDay ?? <span className="lt-muted">—</span>}</td>
                  <td><span className={`lt-gate ${r.gate?.mode}`}>{r.gate?.mode || 'off'}</span></td>
                  <td>
                    <button className="lt-btn ghost" onClick={async () => {
                      if (!window.confirm('Remove this assignment? The batch stops receiving daily challenges.')) return;
                      try { await api.deleteAssignment(r._id); loadAll(); } catch (e: any) { setErr(e.message); }
                    }}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AssignPanel;
