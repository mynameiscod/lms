import React, { useCallback, useEffect, useState } from 'react';
import CallResults from './CallResults';
import { outperoApi, outperoErr, OutperoConfig, OutperoMode, LeadFilterOptions, BulkFilter, OutperoStats } from '../../api/outperoApi';
import './outperoSettings.css';

/**
 * Leads → Outpero AI calls. Connect the Outpero "Instant leads" endpoint and choose how leads
 * reach Jyothi: Off, Manual (an admin sends a chosen group) or Automatic (every matching new lead).
 */

const MODES: { k: OutperoMode; title: string; text: string }[] = [
  { k: 'off', title: 'Off', text: 'Nothing is sent. Use this if you connected Meta lead forms directly inside Outpero.' },
  { k: 'manual', title: 'Manual', text: 'Leads go only when an admin chooses a group below and presses Send.' },
  { k: 'auto', title: 'Automatic', text: 'Every new lead that matches the filters is sent the moment it arrives — Jyothi calls within seconds.' },
];

const Chip: React.FC<{ on: boolean; onClick: () => void; children: React.ReactNode }> = ({ on, onClick, children }) => (
  <button type="button" className={`opo-chip${on ? ' on' : ''}`} onClick={onClick}>{children}</button>
);
const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
const parseList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

const OutperoSettings: React.FC = () => {
  const [cfg, setCfg] = useState<OutperoConfig | null>(null);
  const [opts, setOpts] = useState<LeadFilterOptions | null>(null);
  const [secret, setSecret] = useState('');
  const [coursesText, setCoursesText] = useState('');
  const [stats, setStats] = useState<OutperoStats | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState('');
  const [testName, setTestName] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [bulk, setBulk] = useState<BulkFilter>({ stageIds: [], sources: [], courses: [], includeAlreadySent: false });
  const [bulkCourses, setBulkCourses] = useState('');
  const [preview, setPreview] = useState<{ total: number; alreadySent: number; sample: string[]; etaMinutes: number; perMinute: number } | null>(null);

  const say = (kind: 'ok' | 'err', text: string) => { setMsg({ kind, text }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const loadStats = useCallback(() => outperoApi.stats().then(setStats).catch(() => {}), []);

  useEffect(() => {
    outperoApi.config().then(({ config, options }) => { setCfg(config); setOpts(options); setCoursesText(config.courses.join(', ')); })
      .catch((e) => say('err', outperoErr(e)));
    loadStats();
    const t = setInterval(loadStats, 15_000);
    return () => clearInterval(t);
  }, [loadStats]);

  const effectiveBulk = { ...bulk, courses: parseList(bulkCourses) };
  const bulkKey = JSON.stringify(effectiveBulk);
  useEffect(() => {
    if (!cfg || cfg.mode === 'off') return;
    let live = true;
    setPreview(null);
    const t = setTimeout(() => outperoApi.preview(JSON.parse(bulkKey)).then((p) => live && setPreview(p)).catch(() => {}), 300);
    return () => { live = false; clearTimeout(t); };
  }, [bulkKey, cfg]);

  if (!cfg || !opts) return <div className="opo"><p className="opo-muted">{msg?.text || 'Loading…'}</p></div>;

  const save = async () => {
    setBusy('save');
    try {
      const next = await outperoApi.save({ ...cfg, courses: parseList(coursesText), ...(secret ? { secret } : {}) });
      setCfg(next); setSecret('');
      say('ok', next.mode === 'off' ? 'Saved. Sending is Off.' : next.mode === 'manual' ? 'Saved. Leads go only when you send them below.' : 'Saved. New matching leads are now sent to Outpero automatically.');
    } catch (e) { say('err', outperoErr(e)); }
    setBusy('');
  };

  const runTest = async () => {
    if (!window.confirm(`Jyothi will really call ${testPhone}. Continue?`)) return;
    setBusy('test');
    try { const r = await outperoApi.test(testName, testPhone); say(r.ok ? 'ok' : 'err', r.message); }
    catch (e) { say('err', outperoErr(e)); }
    setBusy('');
  };

  const sendBulk = async () => {
    if (!preview?.total) return;
    if (!window.confirm(`Send ${preview.total} leads to Outpero? Jyothi will call each of them (${preview.perMinute} per minute, about ${preview.etaMinutes} min).`)) return;
    setBusy('bulk');
    try { const r = await outperoApi.bulk(effectiveBulk); say('ok', `${r.queued} leads queued — they go out over about ${r.etaMinutes} min. Progress is below.`); loadStats(); setPreview(null); }
    catch (e) { say('err', outperoErr(e)); }
    setBusy('');
  };

  const act = async (fn: () => Promise<any>, text: (r: any) => string) => {
    setBusy('act');
    try { const r = await fn(); say('ok', text(r)); loadStats(); } catch (e) { say('err', outperoErr(e)); }
    setBusy('');
  };

  const connected = !!cfg.endpointUrl && cfg.secretSet;

  return (
    <div className="opo">
      <div className="opo-head">
        <h1><i className="fa-solid fa-robot" /> Outpero AI calls</h1>
        <p>Send leads to your Outpero AI employee (Jyothi), who calls each one within seconds.</p>
      </div>
      {msg && <div className={`opo-msg ${msg.kind}`} role="status">{msg.text}</div>}

      <section className="opo-card">
        <h2>1. Connect <span className={`opo-pill ${connected ? 'ok' : 'warn'}`}>{connected ? 'Connected' : 'Not connected'}</span></h2>
        <p className="opo-hint">In Outpero open the AI employee → <b>Instant leads</b> and copy the two values from the <b>Endpoint</b> box.</p>
        <label className="opo-label">POST TO (endpoint)</label>
        <input className="opo-input" placeholder="https://api.outpero.com/lead-intake/…" value={cfg.endpointUrl} onChange={(e) => setCfg({ ...cfg, endpointUrl: e.target.value.trim() })} />
        <label className="opo-label">X-Outpero-Lead-Secret</label>
        <input className="opo-input" type="password" autoComplete="off" placeholder={cfg.secretSet ? 'Saved — leave blank to keep it' : 'Paste the secret'} value={secret} onChange={(e) => setSecret(e.target.value)} />
        <div className="opo-test">
          <span className="opo-hint">Test call (after saving):</span>
          <input className="opo-input sm" placeholder="Name" value={testName} onChange={(e) => setTestName(e.target.value)} />
          <input className="opo-input sm" placeholder="Your mobile" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
          <button className="opo-btn ghost" disabled={!connected || !testPhone || busy === 'test'} onClick={runTest}>{busy === 'test' ? 'Sending…' : 'Send test lead'}</button>
        </div>
      </section>

      <section className="opo-card">
        <h2>2. How leads are sent</h2>
        <div className="opo-modes" role="radiogroup">
          {MODES.map((m) => (
            <label key={m.k} className={`opo-mode${cfg.mode === m.k ? ' on' : ''}`}>
              <input type="radio" name="mode" checked={cfg.mode === m.k} onChange={() => setCfg({ ...cfg, mode: m.k })} />
              <b>{m.title}</b><span>{m.text}</span>
            </label>
          ))}
        </div>
        {cfg.mode === 'auto' && (
          <div className="opo-filters">
            <label className="opo-label">Only leads from these sources <span className="opo-hint">(none picked = every source)</span></label>
            <div className="opo-chips">
              {opts.sources.map((s) => <Chip key={s.source} on={cfg.sources.includes(s.source)} onClick={() => setCfg({ ...cfg, sources: toggle(cfg.sources, s.source) })}>{s.source} · {s.count}</Chip>)}
            </div>
            <label className="opo-label">Only these courses <span className="opo-hint">(comma-separated, blank = every course)</span></label>
            <input className="opo-input" placeholder="e.g. Java Full Stack, Python" value={coursesText} onChange={(e) => setCoursesText(e.target.value)} />
            <p className="opo-warn">If Leads → AI Call Config is also on, a lead can get two AI calls. Keep only one of them calling.</p>
          </div>
        )}
        {cfg.mode !== 'off' && (
          <>
            <label className="opo-label">Leads per minute for bulk sends</label>
            <input className="opo-input xs" type="number" min={1} max={60} value={cfg.perMinute} onChange={(e) => setCfg({ ...cfg, perMinute: Number(e.target.value) || 5 })} />
          </>
        )}
        <div className="opo-actions"><button className="opo-btn" disabled={busy === 'save'} onClick={save}>{busy === 'save' ? 'Saving…' : 'Save'}</button></div>
      </section>

      {cfg.mode !== 'off' && (
        <section className="opo-card">
          <h2>3. Send existing leads</h2>
          <label className="opo-label">Stage</label>
          <div className="opo-chips">
            {opts.stages.filter((s) => s.count > 0).map((s) => <Chip key={s._id} on={bulk.stageIds.includes(s._id)} onClick={() => setBulk({ ...bulk, stageIds: toggle(bulk.stageIds, s._id) })}>{s.name} · {s.count}</Chip>)}
          </div>
          <label className="opo-label">Source</label>
          <div className="opo-chips">
            {opts.sources.map((s) => <Chip key={s.source} on={bulk.sources.includes(s.source)} onClick={() => setBulk({ ...bulk, sources: toggle(bulk.sources, s.source) })}>{s.source} · {s.count}</Chip>)}
          </div>
          <label className="opo-label">Courses <span className="opo-hint">(optional, comma-separated)</span></label>
          <input className="opo-input" value={bulkCourses} onChange={(e) => setBulkCourses(e.target.value)} />
          <label className="opo-check"><input type="checkbox" checked={bulk.includeAlreadySent} onChange={(e) => setBulk({ ...bulk, includeAlreadySent: e.target.checked })} /> Include leads already sent to Outpero before</label>
          <div className="opo-preview">
            {!preview ? 'Counting…' : <><b>{preview.total} leads</b> will be sent{preview.alreadySent > 0 && !bulk.includeAlreadySent && ` (${preview.alreadySent} skipped — already sent)`}{preview.sample.length > 0 && ` — e.g. ${preview.sample.join(', ')}`}. At {preview.perMinute}/min that takes about {preview.etaMinutes} min.</>}
          </div>
          <div className="opo-actions">
            <button className="opo-btn" disabled={!preview?.total || busy === 'bulk'} onClick={sendBulk}>{busy === 'bulk' ? 'Queuing…' : `Send ${preview?.total ?? ''} leads`}</button>
          </div>
        </section>
      )}

      <CallResults />

      <section className="opo-card">
        <h2>Status</h2>
        {!stats ? <p className="opo-muted">Loading…</p> : (
          <>
            <div className="opo-stats">
              <div><b>{stats.sentToday}</b><span>sent today</span></div>
              <div><b>{stats.counts.sent}</b><span>sent in total</span></div>
              <div><b>{stats.counts.pending}</b><span>waiting to send</span></div>
              <div className={stats.counts.failed ? 'bad' : ''}><b>{stats.counts.failed}</b><span>not sent</span></div>
            </div>
            <div className="opo-actions">
              {stats.counts.pending > 0 && <button className="opo-btn ghost" disabled={busy === 'act'} onClick={() => { if (window.confirm('Stop sending everything still waiting?')) act(outperoApi.cancelPending, (r) => `${r.cancelled} waiting leads cancelled.`); }}>Stop waiting sends</button>}
              {stats.counts.failed > 0 && <button className="opo-btn ghost" disabled={busy === 'act'} onClick={() => act(outperoApi.retryFailed, (r) => `${r.requeued} leads queued again.`)}>Retry not-sent leads</button>}
            </div>
            {stats.failures.length > 0 && (
              <ul className="opo-fails">
                {stats.failures.map((f) => <li key={f._id}><a href={`/leads/${f._id}`}>{f.name || f.phone}</a> — {f.error}</li>)}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default OutperoSettings;
