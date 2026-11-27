import React, { useEffect, useMemo, useState } from 'react';
import { weeklyReportApi } from '../../api';
import './WeeklyReports.css';
import CustomReport from './CustomReport';

interface BatchOpt { _id: string; name: string; }
type GlanceState = 'done' | 'partial' | 'missed' | 'pending' | 'none';
type GlanceKey = 'classes' | 'quizzes' | 'assignments' | 'interview' | 'communication' | 'thinking';
interface GlanceItem { key: GlanceKey; label: string; state: GlanceState; detail: string }
interface StudentSummary {
  id: string; name: string; email: string;
  score: number; grade: string; hasData: boolean;
  lastSent: { sentAt: string; status: string; channels?: string[] } | null;
  practiceDays?: string; practicePct?: number; onHold?: boolean;
  glance?: GlanceItem[]; isEmpty?: boolean; drivesAttended?: number;
}
type Channel = 'email' | 'whatsapp';
interface Estimate { students: number; withEmail: number; withPhone: number; whatsappTemplateReady: boolean; costPerMessageInr: number; whatsappCostInr: number }
interface AutoSettings {
  autoSend: boolean; channels: Channel[]; lastAutoWeek: string | null; lastAutoAt: string | null;
  lastAutoResult: { sent: number; failed: number; skippedEmpty: number; skippedAlreadySent: number } | null;
  whatsappTemplateReady: boolean;
}
const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// ── week helpers (client) — mirror the server's Mon–Sun / last-completed logic ──
const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtShort = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
function mondayOf(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); const day = x.getDay(); x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day)); return x; }
function weekOptions(n = 8) {
  const opts: { value: string; label: string }[] = [];
  const first = new Date(); first.setDate(first.getDate() - 7); // last completed week
  let m = mondayOf(first);
  for (let i = 0; i < n; i++) {
    const start = new Date(m); const end = new Date(m); end.setDate(end.getDate() + 6);
    opts.push({ value: toISO(start), label: `${fmtShort(start)} – ${fmtShort(end)}, ${end.getFullYear()}${i === 0 ? ' (last week)' : ''}` });
    m.setDate(m.getDate() - 7);
  }
  return opts;
}

const gradeColor = (g: string) => g.startsWith('A') ? '#047857' : g.startsWith('B') ? '#0B2D72' : g.startsWith('C') ? '#B86B00' : '#B91C1C';
const scoreColor = (s: number) => s >= 70 ? '#047857' : s >= 50 ? '#B86B00' : '#B91C1C';

const AREAS: { key: GlanceKey; label: string; short: string }[] = [
  { key: 'classes', label: 'Classes', short: 'Classes' },
  { key: 'quizzes', label: 'Quizzes', short: 'Quizzes' },
  { key: 'assignments', label: 'Assignments', short: 'Assign.' },
  { key: 'interview', label: 'Mock interview', short: 'Interview' },
  { key: 'communication', label: 'Communication Lab', short: 'Speaking' },
  { key: 'thinking', label: 'Thinking Lab', short: 'Thinking' },
];
const MARK: Record<GlanceState, string> = { done: '✓', partial: '◐', missed: '✗', pending: '•', none: '–' };
const WORD: Record<GlanceState, string> = { done: 'Done', partial: 'Partly done', missed: 'Missed', pending: 'Not due yet', none: 'Nothing set' };

const missedCount = (s: StudentSummary) => (s.glance || []).filter(g => g.state === 'missed').length;
const partialCount = (s: StudentSummary) => (s.glance || []).filter(g => g.state === 'partial').length;
const cell = (s: StudentSummary, k: GlanceKey) => (s.glance || []).find(g => g.key === k);
const driveBadge = (s: StudentSummary) => s.drivesAttended
  ? <span className="wr-drive" title="Placement drives attended this week">🏢 {s.drivesAttended} drive{s.drivesAttended > 1 ? 's' : ''}</span>
  : null;

function downloadCsv(rows: StudentSummary[], weekLabel: string, batchName: string) {
  const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Student', 'Email', 'Weekly score', 'Grade', ...AREAS.flatMap(a => [a.label, `${a.label} detail`]), 'Areas missed', 'Placement drives attended'];
  const lines = rows.map(s => [
    s.name, s.email, s.hasData ? s.score : '', s.hasData ? s.grade : '',
    ...AREAS.flatMap(a => { const c = cell(s, a.key); return [c ? WORD[c.state] : '', c?.detail || '']; }),
    missedCount(s), s.drivesAttended || 0,
  ].map(q).join(','));
  const blob = new Blob([`﻿${[head.map(q).join(','), ...lines].join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `who-did-what_${batchName.replace(/[^\w-]+/g, '-')}_${weekLabel.replace(/[^\w-]+/g, '-')}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const WeeklyReports: React.FC = () => {
  const weeks = useMemo(() => weekOptions(8), []);
  const [tab, setTab] = useState<'progress' | 'send' | 'custom'>('progress');
  const [batches, setBatches] = useState<BatchOpt[]>([]);
  const [batchId, setBatchId] = useState('');
  const [weekStart, setWeekStart] = useState(weeks[0]?.value || '');
  const [weekLabel, setWeekLabel] = useState('');
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [sortBy, setSortBy] = useState<'missed' | 'score' | 'name'>('missed');
  const [onlyMissed, setOnlyMissed] = useState(false);

  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendingBatch, setSendingBatch] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);
  const [useEmail, setUseEmail] = useState(true);
  const [useWa, setUseWa] = useState(false);
  const [est, setEst] = useState<Estimate | null>(null);
  const [auto, setAuto] = useState<AutoSettings | null>(null);
  const [savingAuto, setSavingAuto] = useState(false);
  const channels: Channel[] = [...(useEmail ? ['email' as const] : []), ...(useWa ? ['whatsapp' as const] : [])];
  const chLabel = channels.map(c => c === 'email' ? 'email' : 'WhatsApp').join(' + ');
  const batchName = batches.find(b => b._id === batchId)?.name || 'this batch';

  useEffect(() => {
    weeklyReportApi.getBatches()
      .then(r => { setBatches(r.data || []); if (r.data?.[0]) setBatchId(r.data[0]._id); })
      .catch(() => setMsg({ type: 'err', text: 'Failed to load batches' }));
    weeklyReportApi.getSettings().then(setAuto).catch(() => setAuto(null));
  }, []);

  const loadSummaries = async () => {
    if (!batchId || !weekStart) return;
    setLoading(true); setMsg(null);
    try {
      const r = await weeklyReportApi.getSummaries(batchId, weekStart);
      setStudents(r.data.students || []);
      setWeekLabel(r.data.week?.label || '');
    } catch { setMsg({ type: 'err', text: 'Failed to load student summaries' }); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadSummaries(); /* eslint-disable-next-line */ }, [batchId, weekStart]);
  useEffect(() => {
    setEst(null);
    if (batchId) weeklyReportApi.estimate(batchId).then(setEst).catch(() => setEst(null));
  }, [batchId]);

  const progressRows = useMemo(() => {
    const list = onlyMissed ? students.filter(s => missedCount(s) > 0 || partialCount(s) > 0) : [...students];
    if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'score') list.sort((a, b) => (a.hasData ? a.score : -1) - (b.hasData ? b.score : -1));
    else list.sort((a, b) => missedCount(b) - missedCount(a) || partialCount(b) - partialCount(a) || a.name.localeCompare(b.name));
    return list;
  }, [students, sortBy, onlyMissed]);

  const areaTotals = useMemo(() => AREAS.map(a => {
    const cells = students.map(s => cell(s, a.key)).filter(Boolean) as GlanceItem[];
    const set = cells.filter(c => c.state !== 'none');
    return { ...a, set: set.length, done: set.filter(c => c.state === 'done').length, missed: set.filter(c => c.state === 'missed').length };
  }), [students]);
  const emptyCount = students.filter(s => s.isEmpty).length;

  const openPreview = async (s: StudentSummary) => {
    setPreviewId(s.id); setPreviewName(s.name); setPreviewHtml(''); setPreviewLoading(true);
    try {
      const r = await weeklyReportApi.getStudentPreview(s.id, weekStart);
      setPreviewHtml(r.data.html || '');
    } catch { setPreviewHtml('<p style="padding:20px">Failed to load preview.</p>'); }
    finally { setPreviewLoading(false); }
  };

  const sendOne = async (s: StudentSummary) => {
    if (!channels.length) { setMsg({ type: 'err', text: 'Tick Email or WhatsApp first.' }); return; }
    const cost = useWa && est ? ` WhatsApp costs about ${inr(est.costPerMessageInr)}.` : '';
    if (!window.confirm(`Send this week's report to ${s.name} by ${chLabel}?${cost}`)) return;
    setSendingId(s.id); setMsg(null);
    try {
      const r = await weeklyReportApi.sendToStudent(s.id, weekStart, channels);
      setMsg({ type: 'ok', text: r.message || `Report sent to ${s.name}` });
      loadSummaries();
    } catch (e: any) { setMsg({ type: 'err', text: e.message || 'Send failed' }); }
    finally { setSendingId(null); }
  };

  const sendBatch = async () => {
    if (!channels.length) { setMsg({ type: 'err', text: 'Tick Email or WhatsApp first.' }); return; }
    const lines = [`Send the weekly report to the students of ${batchName}?`, ''];
    if (useEmail) lines.push(`• Email: ${est?.withEmail ?? students.length} student(s) — free`);
    if (useWa) lines.push(`• WhatsApp: ${est?.withPhone ?? '?'} student(s) with a phone — about ${inr(est?.whatsappCostInr ?? 0)}`);
    if (emptyCount) lines.push('', `${emptyCount} student(s) had nothing this week and will be skipped.`);
    if (!window.confirm(lines.join('\n'))) return;
    setSendingBatch(true); setMsg(null);
    try {
      const r = await weeklyReportApi.sendToBatch(batchId, weekStart, channels);
      setMsg({ type: 'ok', text: r.message || 'Batch send started — refresh in a minute to see delivery status.' });
    } catch (e: any) { setMsg({ type: 'err', text: e.message || 'Batch send failed' }); }
    finally { setSendingBatch(false); }
  };

  const sendAll = async () => {
    if (!channels.length) { setMsg({ type: 'err', text: 'Tick Email or WhatsApp first.' }); return; }
    let all: Estimate | null = null;
    try { all = await weeklyReportApi.estimate('all'); } catch { /* the confirm still works without numbers */ }
    const wk = weeks.find(w => w.value === weekStart)?.label || weekLabel;
    const lines = [`Send the report for ${wk} to every student in every active batch?`, ''];
    if (useEmail) lines.push(`• Email: up to ${all?.withEmail ?? '?'} student(s) — free`);
    if (useWa) lines.push(`• WhatsApp: up to ${all?.withPhone ?? '?'} student(s) — about ${inr(all?.whatsappCostInr ?? 0)}`);
    lines.push('', 'Students with nothing this week, and those who already got this week\'s report, are skipped.');
    if (!window.confirm(lines.join('\n'))) return;
    setSendingAll(true); setMsg(null);
    try {
      const r = await weeklyReportApi.sendToAll(weekStart, channels);
      setMsg({ type: 'ok', text: r.message || 'Sending to all batches started.' });
    } catch (e: any) { setMsg({ type: 'err', text: e.message || 'Send failed' }); }
    finally { setSendingAll(false); }
  };

  const saveAuto = async (next: { autoSend?: boolean; channels?: Channel[] }) => {
    if (!auto) return;
    const autoSend = next.autoSend ?? auto.autoSend;
    const ch = next.channels ?? auto.channels;
    if (next.autoSend === true && !window.confirm('Every Monday at 8 AM, email last week\'s report to every active student in every active batch?\n\nStudents with nothing that week, and those already sent by hand, are skipped. The first ones go out next Monday.')) return;
    setSavingAuto(true); setMsg(null);
    try {
      const r = await weeklyReportApi.updateSettings(autoSend, ch.length ? ch : ['email']);
      setAuto(await weeklyReportApi.getSettings());
      setMsg({ type: 'ok', text: r.message });
    } catch (e: any) { setMsg({ type: 'err', text: e.message || 'Could not save' }); }
    finally { setSavingAuto(false); }
  };

  const previewSend = async () => {
    const s = students.find(x => x.id === previewId);
    if (s) { await sendOne(s); setPreviewId(null); }
  };

  const pill = (c: GlanceItem | undefined, compact = false) => {
    const st = c?.state || 'none';
    return (
      <span className={`wr-pill ${st}`} title={c ? `${WORD[st]} — ${c.detail}` : WORD.none}>
        <b>{MARK[st]}</b>{!compact && <span>{c?.detail || '—'}</span>}
      </span>
    );
  };

  return (
    <div className="wr-page">
      <div className="wr-head">
        <h1 className="wr-title">📄 Weekly Learning Reports</h1>
        <p className="wr-sub">See who did what this week — classes, quizzes, assignments, mock interviews and both labs — and send each student their report.</p>
      </div>

      {tab !== 'custom' && <div className="wr-toolbar">
        <label className="wr-field">
          <span>Batch</span>
          <select value={batchId} onChange={e => setBatchId(e.target.value)}>
            {batches.length === 0 && <option value="">No batches</option>}
            {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        </label>
        <label className="wr-field">
          <span>Week</span>
          <select value={weekStart} onChange={e => setWeekStart(e.target.value)}>
            {weeks.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
          </select>
        </label>
      </div>}

      <div className="wr-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'progress'} className={tab === 'progress' ? 'on' : ''} onClick={() => setTab('progress')}>Who did what</button>
        <button role="tab" aria-selected={tab === 'send'} className={tab === 'send' ? 'on' : ''} onClick={() => setTab('send')}>Send reports</button>
        <button role="tab" aria-selected={tab === 'custom'} className={tab === 'custom' ? 'on' : ''} onClick={() => setTab('custom')}>Custom report</button>
      </div>

      {msg && <div className={`wr-alert ${msg.type}`}><span>{msg.text}</span><button onClick={() => setMsg(null)} aria-label="Close">✕</button></div>}

      {tab === 'custom' && <CustomReport batches={batches} defaultBatchId={batchId} />}

      {tab === 'progress' && (
        <>
          {!loading && students.length > 0 && (
            <div className="wr-totals">
              {areaTotals.map(a => (
                <div key={a.key} className="wr-total">
                  <div className="wr-total-label">{a.label}</div>
                  {a.set
                    ? <div className="wr-total-num"><b>{a.done}</b>/{a.set} done{a.missed ? <span className="wr-total-missed"> · {a.missed} missed</span> : null}</div>
                    : <div className="wr-total-num muted">Nothing set</div>}
                </div>
              ))}
            </div>
          )}

          <div className="wr-progress-bar">
            <label className="wr-inline">
              <span>Sort</span>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
                <option value="missed">Most missed first</option>
                <option value="score">Lowest score first</option>
                <option value="name">Name</option>
              </select>
            </label>
            <label className="wr-check"><input type="checkbox" checked={onlyMissed} onChange={e => setOnlyMissed(e.target.checked)} /> Only students who missed something</label>
            <button className="wr-btn ghost" disabled={!progressRows.length} onClick={() => downloadCsv(progressRows, weekLabel, batchName)}>⬇ Download CSV</button>
          </div>

          <div className="wr-legend">
            {(['done', 'partial', 'missed', 'pending', 'none'] as GlanceState[]).map(s => <span key={s}><span className={`wr-pill ${s}`}><b>{MARK[s]}</b></span> {WORD[s]}</span>)}
          </div>

          <div className="wr-card">
            {loading ? (
              <div className="wr-empty">Loading this week…</div>
            ) : students.length === 0 ? (
              <div className="wr-empty">No active students in this batch.</div>
            ) : progressRows.length === 0 ? (
              <div className="wr-empty">Nobody missed anything this week. 🎉</div>
            ) : (
              <>
                <table className="wr-table wr-matrix">
                  <thead>
                    <tr>
                      <th>Student</th><th>Score</th>
                      {AREAS.map(a => <th key={a.key} title={a.label}>{a.short}</th>)}
                      <th style={{ textAlign: 'right' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {progressRows.map(s => (
                      <tr key={s.id}>
                        <td>
                          <div className="wr-name">{s.name}{driveBadge(s)}</div>
                          <div className="wr-email">{missedCount(s) ? <span className="wr-missed-n">{missedCount(s)} missed</span> : s.isEmpty ? 'Nothing this week' : s.email}</div>
                        </td>
                        <td>{s.hasData ? <span className="wr-score sm" style={{ color: scoreColor(s.score) }}>{s.score}</span> : <span className="wr-nodata">—</span>}</td>
                        {AREAS.map(a => <td key={a.key}>{pill(cell(s, a.key))}</td>)}
                        <td style={{ textAlign: 'right' }}><button className="wr-btn ghost sm" onClick={() => openPreview(s)}>Report</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="wr-cards">
                  {progressRows.map(s => (
                    <div key={s.id} className="wr-scard">
                      <div className="wr-scard-head">
                        <div>
                          <div className="wr-name">{s.name}{driveBadge(s)}</div>
                          <div className="wr-email">{missedCount(s) ? <span className="wr-missed-n">{missedCount(s)} missed</span> : s.isEmpty ? 'Nothing this week' : s.email}</div>
                        </div>
                        {s.hasData && <span className="wr-score sm" style={{ color: scoreColor(s.score) }}>{s.score}<span className="wr-score-max">/100</span></span>}
                      </div>
                      <div className="wr-scard-grid">
                        {AREAS.map(a => (
                          <div key={a.key} className="wr-scard-item">
                            <div className="wr-scard-label">{a.label}</div>
                            {pill(cell(s, a.key))}
                          </div>
                        ))}
                      </div>
                      <button className="wr-btn ghost sm wr-scard-btn" onClick={() => openPreview(s)}>View report</button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {tab === 'send' && (
        <>
          <div className="wr-sendbar">
            <div className="wr-field">
              <span>Send by</span>
              <div className="wr-channels">
                <label className={`wr-chip ${useEmail ? 'on' : ''}`}><input type="checkbox" checked={useEmail} onChange={e => setUseEmail(e.target.checked)} /> ✉️ Email <em>free</em></label>
                <label className={`wr-chip ${useWa ? 'on' : ''}`} title={est && !est.whatsappTemplateReady ? 'Assign a template to "Weekly learning report" in WhatsApp Templates → Where used' : ''}>
                  <input type="checkbox" checked={useWa} disabled={!!est && !est.whatsappTemplateReady} onChange={e => setUseWa(e.target.checked)} /> 💬 WhatsApp
                  <em>{est ? (est.whatsappTemplateReady ? `${inr(est.costPerMessageInr)}/msg` : 'no template') : ''}</em>
                </label>
              </div>
            </div>
            <div className="wr-send-actions">
              <button className="wr-btn primary" disabled={!students.length || sendingBatch || !channels.length} onClick={sendBatch}>
                {sendingBatch ? 'Starting…' : `📤 Send to this batch (${students.length - emptyCount})`}
              </button>
              <button className="wr-btn outline" disabled={sendingAll || !channels.length || !batches.length} onClick={sendAll}>
                {sendingAll ? 'Starting…' : '📨 Send to all batches'}
              </button>
            </div>
          </div>

          {auto && (
            <div className={`wr-auto ${auto.autoSend ? 'on' : ''}`}>
              <label className="wr-switch">
                <input type="checkbox" checked={auto.autoSend} disabled={savingAuto} onChange={e => saveAuto({ autoSend: e.target.checked })} />
                <span className="wr-switch-track" aria-hidden="true"><span /></span>
                <span className="wr-auto-title">Send automatically every Monday at 8 AM</span>
              </label>
              <div className="wr-auto-sub">
                {auto.autoSend
                  ? <>Last week's report goes to every active student by <b>{auto.channels.map(c => c === 'email' ? 'email' : 'WhatsApp').join(' + ')}</b>. Students with nothing that week, or already sent by hand, are skipped.</>
                  : <>Off — reports go out only when you send them.</>}
                {auto.autoSend && auto.whatsappTemplateReady && (
                  <label className="wr-check wr-auto-wa">
                    <input type="checkbox" checked={auto.channels.includes('whatsapp')} disabled={savingAuto}
                      onChange={e => saveAuto({ channels: e.target.checked ? ['email', 'whatsapp'] : ['email'] })} /> Also WhatsApp
                  </label>
                )}
                {auto.lastAutoResult && auto.lastAutoAt && (
                  <div className="wr-auto-last">Last automatic run {new Date(auto.lastAutoAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}: {auto.lastAutoResult.sent} sent{auto.lastAutoResult.failed ? `, ${auto.lastAutoResult.failed} failed` : ''}, {auto.lastAutoResult.skippedEmpty} with nothing that week, {auto.lastAutoResult.skippedAlreadySent} already sent.</div>
                )}
              </div>
            </div>
          )}

          {useWa && est && (
            <div className="wr-cost">💬 WhatsApp reaches <b>{est.withPhone}</b> of {est.students} student(s) with a phone number · batch send ≈ <b>{inr(est.whatsappCostInr)}</b> ({inr(est.costPerMessageInr)} per message). WhatsApp carries the headline numbers; the full report goes by email.</div>
          )}
          {est && !est.whatsappTemplateReady && (
            <div className="wr-cost muted">WhatsApp is off until a template is assigned to <b>Weekly learning report</b> in Admin → WhatsApp Templates → Where used.</div>
          )}

          <div className="wr-card">
            {loading ? (
              <div className="wr-empty">Loading student reports…</div>
            ) : students.length === 0 ? (
              <div className="wr-empty">No active students in this batch.</div>
            ) : (
              <table className="wr-table wr-sendtable">
                <thead>
                  <tr>
                    <th>Student</th><th>Weekly Score</th><th>Grade</th><th>Daily Practice</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id}>
                      <td data-label="Student">
                        <div className="wr-name">{s.name}</div>
                        <div className="wr-email">{s.email}</div>
                      </td>
                      <td data-label="Score">
                        {s.hasData
                          ? <span className="wr-score" style={{ color: scoreColor(s.score) }}>{s.score}<span className="wr-score-max">/100</span></span>
                          : <span className="wr-nodata">{s.isEmpty ? 'Nothing this week — skipped in batch sends' : 'No score'}</span>}
                      </td>
                      <td data-label="Grade">{s.hasData ? <span className="wr-grade" style={{ background: gradeColor(s.grade) }}>{s.grade}</span> : <span className="wr-nodata">—</span>}</td>
                      <td data-label="Practice">
                        {s.practiceDays
                          ? <div>
                              <span className="wr-score" style={{ fontSize: 15, color: scoreColor(s.practicePct ?? 0) }}>{s.practiceDays}</span>
                              <div className="wr-email">{s.practicePct}% attendance{s.onHold ? <span className="wr-hold"> · on hold</span> : ''}</div>
                            </div>
                          : <span className="wr-nodata">—</span>}
                      </td>
                      <td data-label="Status">
                        {s.lastSent
                          ? <span className={`wr-sent ${s.lastSent.status}`}>{s.lastSent.status === 'sent' ? '✓ Sent' : '✕ Failed'} · {new Date(s.lastSent.sentAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}{s.lastSent.channels?.length ? <div className="wr-email">{s.lastSent.channels.join(' · ')}</div> : null}</span>
                          : <span className="wr-notsent">Not sent</span>}
                      </td>
                      <td className="wr-actions">
                        <button className="wr-btn ghost sm" onClick={() => openPreview(s)}>Preview</button>
                        <button className="wr-btn primary sm" disabled={sendingId === s.id} onClick={() => sendOne(s)}>{sendingId === s.id ? 'Sending…' : 'Send'}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {previewId && (
        <div className="wr-modal-overlay" onClick={() => setPreviewId(null)}>
          <div className="wr-modal" onClick={e => e.stopPropagation()}>
            <div className="wr-modal-head">
              <div className="wr-modal-title"><strong>Report preview</strong> — {previewName} · {weekLabel}</div>
              <div className="wr-modal-actions">
                <button className="wr-btn primary sm" disabled={sendingId === previewId} onClick={previewSend}>{sendingId === previewId ? 'Sending…' : '📤 Send'}</button>
                <button className="wr-btn ghost sm" onClick={() => setPreviewId(null)}>Close</button>
              </div>
            </div>
            <div className="wr-modal-body">
              {previewLoading
                ? <div className="wr-empty">Rendering report…</div>
                : <iframe title="Report preview" srcDoc={previewHtml} className="wr-iframe" sandbox="allow-same-origin" />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyReports;
