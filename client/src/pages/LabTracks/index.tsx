import React, { useEffect, useMemo, useState } from 'react';
import * as api from '../../api/labTrackApi';
import { Track, TrackItem, Lab } from '../../api/labTrackApi';
import { Spinner } from '../../components/common';
import AssignPanel from './AssignPanel';
import ProgressPanel from './ProgressPanel';
import './LabTracks.css';

/**
 * Daily-lab track builder.
 *
 * A track is a plan authored once and reused by every batch, which is the point: the
 * previous model needed one row per batch per day and production ended up with three of
 * them, so students were told "no challenge scheduled yet" nearly every morning.
 *
 * The grid is weeks down, days across. Click a day, pick from the library, done.
 */

const LABS: { key: Lab; label: string }[] = [
  { key: 'thinking', label: 'Thinking Lab' },
  { key: 'communication', label: 'Communication Lab' },
];

const LabTracks: React.FC = () => {
  const [lab, setLab] = useState<Lab>('thinking');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [view, setView] = useState<'tracks' | 'assign' | 'progress'>('tracks');

  const load = () => {
    setLoading(true);
    api.listTracks(lab)
      .then(t => { setTracks(t); setErr(''); })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, [lab]);

  if (openId) return <Builder trackId={openId} onBack={() => { setOpenId(null); load(); }} />;

  return (
    <div className="lt-page">
      <div className="lt-head">
        <div>
          <h2>Daily Lab Tracks</h2>
          <p>Author a plan once, then attach it to any batch with its own start date.</p>
        </div>
        <NewTrack lab={lab} onCreated={load} />
      </div>

      <div className="lt-tabs" role="tablist">
        <button role="tab" aria-selected={view === 'tracks'}
          className={`lt-tab ${view === 'tracks' ? 'on' : ''}`} onClick={() => setView('tracks')}>Tracks</button>
        <button role="tab" aria-selected={view === 'assign'}
          className={`lt-tab ${view === 'assign' ? 'on' : ''}`} onClick={() => setView('assign')}>Batch Assignments</button>
        <button role="tab" aria-selected={view === 'progress'}
          className={`lt-tab ${view === 'progress' ? 'on' : ''}`} onClick={() => setView('progress')}>Progress</button>
      </div>

      {view === 'progress' ? <ProgressPanel /> : view === 'assign' ? <AssignPanel /> : (
      <>
      <div className="lt-tabs" role="tablist">
        {LABS.map(l => (
          <button key={l.key} role="tab" aria-selected={lab === l.key}
            className={`lt-tab ${lab === l.key ? 'on' : ''}`} onClick={() => setLab(l.key)}>
            {l.label}
          </button>
        ))}
      </div>

      {err && <div className="lt-err">{err}</div>}
      {loading ? <div className="lt-loading"><Spinner /></div> : (
        tracks.length === 0 ? (
          <div className="lt-empty">
            <h4>No tracks yet</h4>
            <p>Create a track, fill its days from the library, then publish it.</p>
          </div>
        ) : (
          <div className="lt-grid">
            {tracks.map(t => {
              const pct = t.totalDays ? Math.round(((t.filledDays || 0) / t.totalDays) * 100) : 0;
              return (
                <div className="lt-card" key={t._id}>
                  <div className="lt-card-top">
                    <span className={`lt-status ${t.status}`}>{t.status}</span>
                    <span className="lt-days">{t.filledDays || 0} / {t.totalDays} days</span>
                  </div>
                  <h4>{t.name}</h4>
                  {t.description && <p className="lt-desc">{t.description}</p>}
                  <div className="lt-bar"><div style={{ width: `${pct}%` }} /></div>
                  <div className="lt-card-actions">
                    <button className="lt-btn" onClick={() => setOpenId(t._id)}>Open builder</button>
                    <button className="lt-btn ghost" onClick={async () => {
                      if (!window.confirm(`Delete "${t.name}"?`)) return;
                      try { await api.deleteTrack(t._id); load(); }
                      catch (e: any) { setErr(e.message); }
                    }}>Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
      </>
      )}
    </div>
  );
};

const NewTrack: React.FC<{ lab: Lab; onCreated: () => void }> = ({ lab, onCreated }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [totalDays, setTotalDays] = useState(145);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    setBusy(true); setErr('');
    try {
      await api.createTrack({ name, lab, totalDays: Number(totalDays) });
      setOpen(false); setName(''); onCreated();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  if (!open) return <button className="lt-btn primary" onClick={() => setOpen(true)}>+ New Track</button>;
  return (
    <div className="lt-newtrack">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Track name, e.g. Java FS — 145 Day Plan" />
      <input type="number" min={1} value={totalDays} onChange={e => setTotalDays(Number(e.target.value))} style={{ width: 90 }} />
      <button className="lt-btn primary" onClick={save} disabled={busy || !name.trim()}>{busy ? 'Saving…' : 'Create'}</button>
      <button className="lt-btn ghost" onClick={() => setOpen(false)}>Cancel</button>
      {err && <span className="lt-inline-err">{err}</span>}
    </div>
  );
};

const TYPE_LABEL: Record<string, string> = { math: 'Math', logical: 'Logical', critical: 'Critical thinking', coding: 'Coding' };
const YEARS: [string, string][] = [['foundation', 'Year 1'], ['build', 'Year 2'], ['specialize', 'Year 3'], ['placement', 'Year 4']];

/*
 * "Fill the track for me": the year, the mix of question types and an easy-to-hard ramp; the server fills every day
 * from the shared bank without repeating a question. The admin can still change any day afterwards.
 */
const FillDialog: React.FC<{ trackId: string; totalDays: number; filled: number; onClose: () => void; onDone: () => void }> = ({ trackId, totalDays, filled, onClose, onDone }) => {
  const [year, setYear] = useState('foundation');
  const [mix, setMix] = useState<Record<string, number>>({ math: 1, logical: 1, critical: 1, coding: 0 });
  const [ramp, setRamp] = useState(true);
  const [onlyEmpty, setOnlyEmpty] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.autofill>> | null>(null);
  const y1 = year === 'foundation';
  const effective = { ...mix, coding: y1 ? 0 : mix.coding };
  const sum = Object.values(effective).reduce((a, b) => a + b, 0);
  const days = onlyEmpty ? totalDays - filled : totalDays;
  const run = async () => {
    setBusy(true); setErr('');
    try { setResult(await api.autofill(trackId, { year, mix: effective, ramp, onlyEmpty })); }
    catch (e: any) { setErr(e.message); }
    setBusy(false);
  };
  return (
    <div className="lt-modal-back" onClick={onClose} role="presentation">
      <div className="lt-modal lt-fill" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Fill the track for me">
        <div className="lt-modal-head"><h4>Fill the track for me</h4><button onClick={onClose} aria-label="Close">×</button></div>
        {result ? (
          <div className="lt-fill-done">
            <p><b>{result.filled}</b> day{result.filled === 1 ? '' : 's'} filled — {result.filledDays} of {result.totalDays} now have a question.</p>
            {result.byType && <p className="lt-fill-break">{Object.entries(result.byType).map(([k, v]) => `${TYPE_LABEL[k] || k} ${v}`).join(' · ')}{result.byLevel ? ` — ${['easy', 'medium', 'hard'].filter(l => result.byLevel![l]).map(l => `${result.byLevel![l]} ${l}`).join(', ')}` : ''}</p>}
            {result.message && <div className="lt-note">{result.message}</div>}
            <p className="lt-fill-hint">Check the days, change any you like, then publish the track.</p>
            <button className="lt-btn primary full" onClick={onDone}>See the track</button>
          </div>
        ) : (
          <>
            <label className="lt-fill-row"><span>Year this track is for</span>
              <select value={year} onChange={e => setYear(e.target.value)}>{YEARS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </label>
            <div className="lt-fill-mix">
              <span>Mix of questions <small>how many of each in every {sum || '…'} days</small></span>
              {Object.entries(TYPE_LABEL).map(([k, label]) => (
                <label key={k} className={k === 'coding' && y1 ? 'off' : ''}>
                  <em className={`lt-type t-${k}`}>{label}</em>
                  <input type="number" min={0} max={10} value={k === 'coding' && y1 ? 0 : mix[k]} disabled={k === 'coding' && y1}
                         onChange={e => setMix(m => ({ ...m, [k]: Math.max(0, Math.min(10, Number(e.target.value) || 0)) }))} aria-label={`${label} share`} />
                </label>
              ))}
              {y1 && <small className="lt-fill-hint">No coding in Year 1.</small>}
            </div>
            <label className="lt-check"><input type="checkbox" checked={ramp} onChange={e => setRamp(e.target.checked)} /> Start easy and get harder through the track</label>
            <label className="lt-check"><input type="checkbox" checked={onlyEmpty} onChange={e => setOnlyEmpty(e.target.checked)} /> Keep the days I have already filled</label>
            {err && <div className="lt-err">{err}</div>}
            <button className="lt-btn primary full" disabled={busy || !sum || days <= 0} onClick={run}>
              {busy ? 'Filling…' : days <= 0 ? 'Every day already has a question' : `Fill ${days} day${days === 1 ? '' : 's'}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

/* ── Builder: weeks down, days across ────────────────────────────────────── */

const Builder: React.FC<{ trackId: string; onBack: () => void }> = ({ trackId, onBack }) => {
  const [data, setData] = useState<{ track: Track; items: TrackItem[] } | null>(null);
  const [bank, setBank] = useState<any[]>([]);
  const [q, setQ] = useState('');
  // Thinking tracks pick from the shared Thinking Lab bank (default) or the institute's own LMS problems.
  const [filters, setFilters] = useState<api.LibraryFilters>({ source: 'bank' });
  const [filling, setFilling] = useState(false);
  const [picking, setPicking] = useState<number | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api.getTrack(trackId).then(d => setData(d as any)).catch(e => setErr(e.message));
  useEffect(() => { load(); }, [trackId]);
  useEffect(() => {
    if (!data) return;
    api.library(data.track.lab, q, data.track.lab === 'thinking' ? filters : {}).then(setBank).catch(() => setBank([]));
  }, [data?.track.lab, q, filters]);

  const byDay = useMemo(() => {
    const m = new Map<number, TrackItem>();
    (data?.items || []).forEach(i => m.set(i.dayIndex, i));
    return m;
  }, [data]);

  if (!data) return <div className="lt-loading"><Spinner /></div>;
  const { track } = data;
  const per = track.daysPerWeek || 5;
  const weeks = Math.ceil(track.totalDays / per);
  const filled = data.items.length;

  const usedIds = new Set(data.items.map(i => String(i.contentId)));
  const thinking = track.lab === 'thinking';
  const assign = async (dayIndex: number, contentId: string | null, contentKind?: 'question' | 'problem') => {
    setBusy(true); setErr('');
    try { await api.setItems(trackId, [{ dayIndex, contentId, ...(contentKind ? { contentKind } : {}) }]); await load(); setPicking(null); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const publish = async () => {
    setBusy(true); setErr('');
    try {
      await api.updateTrack(trackId, { status: track.status === 'published' ? 'draft' : 'published' });
      await load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="lt-page">
      <div className="lt-head">
        <div>
          <button className="lt-back" onClick={onBack}>← All tracks</button>
          <h2>{track.name}</h2>
          <p>{filled} of {track.totalDays} days filled · {LABS.find(l => l.key === track.lab)?.label}</p>
        </div>
        <div className="lt-head-actions">
          <span className={`lt-status ${track.status}`}>{track.status}</span>
          {thinking && <button className="lt-btn" onClick={() => setFilling(true)} disabled={busy}>Fill the track for me</button>}
          <button className="lt-btn primary" onClick={publish} disabled={busy}>
            {track.status === 'published' ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      </div>

      {/* The server refuses to publish a track with gaps; say so before they try. */}
      {filled < track.totalDays && (
        <div className="lt-note">
          {track.totalDays - filled} day(s) still empty. A track can only be published once every day is filled —
          otherwise a batch would open the app to a blank morning.
        </div>
      )}
      {err && <div className="lt-err">{err}</div>}

      <div className="lt-weeks">
        {Array.from({ length: weeks }, (_, w) => (
          <div className="lt-week" key={w}>
            <div className="lt-week-label">Week {w + 1}</div>
            <div className="lt-week-days">
              {Array.from({ length: per }, (_, d) => {
                const day = w * per + d + 1;
                if (day > track.totalDays) return <div key={d} className="lt-day spacer" />;
                const item = byDay.get(day);
                return (
                  <button
                    key={d}
                    className={`lt-day ${item ? 'filled' : ''} ${item?.missing ? 'missing' : ''}`}
                    onClick={() => setPicking(day)}
                    title={item?.content?.title || 'Empty — click to assign'}
                  >
                    <span className="lt-day-n">Day {day}{item?.content?.type && thinking && <em className={`lt-type t-${item.content.type}`}>{TYPE_LABEL[item.content.type] || item.content.type}</em>}</span>
                    <span className="lt-day-t">
                      {item?.missing ? '⚠ content deleted' : (item?.content?.title || 'Empty')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {picking !== null && (
        <div className="lt-modal-back" onClick={() => setPicking(null)} role="presentation">
          <div className="lt-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true"
               aria-label={`Choose content for day ${picking}`}>
            <div className="lt-modal-head">
              <h4>Day {picking}</h4>
              <button onClick={() => setPicking(null)} aria-label="Close">×</button>
            </div>
            <input className="lt-search" value={q} onChange={e => setQ(e.target.value)}
                   placeholder={thinking && filters.source !== 'lms' ? 'Search the question bank…' : 'Search the library…'} autoFocus />
            {thinking && (
              <div className="lt-filters">
                <div className="lt-seg" role="tablist" aria-label="Where to pick from">
                  <button role="tab" aria-selected={filters.source !== 'lms'} className={filters.source !== 'lms' ? 'on' : ''} onClick={() => setFilters({ source: 'bank' })}>Question bank</button>
                  <button role="tab" aria-selected={filters.source === 'lms'} className={filters.source === 'lms' ? 'on' : ''} onClick={() => setFilters({ source: 'lms' })}>LMS problems</button>
                </div>
                {filters.source !== 'lms' && <>
                  <select value={filters.type || ''} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))} aria-label="Type">
                    <option value="">All types</option>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <select value={filters.difficulty || ''} onChange={e => setFilters(f => ({ ...f, difficulty: e.target.value }))} aria-label="Difficulty">
                    <option value="">Any level</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                  </select>
                  <select value={filters.year || ''} onChange={e => setFilters(f => ({ ...f, year: e.target.value }))} aria-label="Year">
                    <option value="">Any year</option>{YEARS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </>}
              </div>
            )}
            <div className="lt-bank">
              {bank.length === 0 ? (
                <p className="lt-bank-empty">
                  Nothing in the library yet. Add problems to {LABS.find(l => l.key === track.lab)?.label} first.
                </p>
              ) : bank.map(b => (
                <button key={b._id} className={`lt-bank-row${usedIds.has(String(b._id)) ? ' used' : ''}`} disabled={busy}
                        onClick={() => assign(picking, b._id, thinking ? (b.kind === 'question' ? 'question' : 'problem') : undefined)}>
                  <span>{thinking && b.type && <em className={`lt-type t-${b.type}`}>{TYPE_LABEL[b.type] || b.type}</em>}{b.title}</span>
                  <small>{b.category || b.challengeType || ''}{b.difficulty ? ` · ${b.difficulty}` : ''}{usedIds.has(String(b._id)) ? ' · already in this track' : ''}</small>
                </button>
              ))}
            </div>
            {byDay.get(picking) && (
              <button className="lt-btn ghost full" disabled={busy} onClick={() => assign(picking, null)}>
                Clear this day
              </button>
            )}
          </div>
        </div>
      )}
      {filling && <FillDialog trackId={trackId} totalDays={track.totalDays} filled={filled} onClose={() => setFilling(false)} onDone={() => { setFilling(false); load(); }} />}
    </div>
  );
};

export default LabTracks;
