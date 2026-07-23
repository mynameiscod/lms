import React, { useEffect, useMemo, useState } from 'react';
import { weeklyReportApi } from '../../api';
import './WeeklyReports.css';

interface BatchOpt { _id: string; name: string; }
interface StudentSummary {
  id: string; name: string; email: string;
  score: number; grade: string; hasData: boolean;
  lastSent: { sentAt: string; status: string } | null;
}

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

const gradeColor = (g: string) => g.startsWith('A') ? '#059669' : g.startsWith('B') ? '#2563eb' : g.startsWith('C') ? '#d97706' : '#dc2626';
const scoreColor = (s: number) => s >= 70 ? '#059669' : s >= 50 ? '#d97706' : '#dc2626';

const WeeklyReports: React.FC = () => {
  const weeks = useMemo(() => weekOptions(8), []);
  const [batches, setBatches] = useState<BatchOpt[]>([]);
  const [batchId, setBatchId] = useState('');
  const [weekStart, setWeekStart] = useState(weeks[0]?.value || '');
  const [weekLabel, setWeekLabel] = useState('');
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendingBatch, setSendingBatch] = useState(false);

  useEffect(() => {
    weeklyReportApi.getBatches()
      .then(r => { setBatches(r.data || []); if (r.data?.[0]) setBatchId(r.data[0]._id); })
      .catch(() => setMsg({ type: 'err', text: 'Failed to load batches' }));
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

  const openPreview = async (s: StudentSummary) => {
    setPreviewId(s.id); setPreviewName(s.name); setPreviewHtml(''); setPreviewLoading(true);
    try {
      const r = await weeklyReportApi.getStudentPreview(s.id, weekStart);
      setPreviewHtml(r.data.html || '');
    } catch { setPreviewHtml('<p style="padding:20px">Failed to load preview.</p>'); }
    finally { setPreviewLoading(false); }
  };

  const sendOne = async (s: StudentSummary) => {
    if (!window.confirm(`Send this week's report to ${s.name} (${s.email})?`)) return;
    setSendingId(s.id); setMsg(null);
    try {
      await weeklyReportApi.sendToStudent(s.id, weekStart);
      setMsg({ type: 'ok', text: `Report sent to ${s.name}` });
      loadSummaries();
    } catch (e: any) { setMsg({ type: 'err', text: e.message || 'Send failed' }); }
    finally { setSendingId(null); }
  };

  const sendBatch = async () => {
    const batchName = batches.find(b => b._id === batchId)?.name || 'this batch';
    if (!window.confirm(`Send the weekly report to ALL ${students.length} student(s) in ${batchName}? Each student receives their own personalized report.`)) return;
    setSendingBatch(true); setMsg(null);
    try {
      const r = await weeklyReportApi.sendToBatch(batchId, weekStart);
      setMsg({ type: 'ok', text: r.message || 'Batch send started. Reports are being emailed in the background — refresh in a minute to see delivery status.' });
    } catch (e: any) { setMsg({ type: 'err', text: e.message || 'Batch send failed' }); }
    finally { setSendingBatch(false); }
  };

  const previewSend = async () => {
    const s = students.find(x => x.id === previewId);
    if (s) { await sendOne(s); setPreviewId(null); }
  };

  return (
    <div className="wr-page">
      <div className="wr-head">
        <div>
          <h1 className="wr-title">📄 Weekly Learning Reports</h1>
          <p className="wr-sub">Preview each student's weekly progress report and email it to one student or the whole batch.</p>
        </div>
      </div>

      <div className="wr-toolbar">
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
        <button className="wr-btn primary" disabled={!students.length || sendingBatch} onClick={sendBatch}>
          {sendingBatch ? 'Starting…' : `📤 Send to Entire Batch (${students.length})`}
        </button>
      </div>

      {msg && <div className={`wr-alert ${msg.type}`}>{msg.text}<button onClick={() => setMsg(null)}>✕</button></div>}

      <div className="wr-card">
        {loading ? (
          <div className="wr-empty">Loading student reports…</div>
        ) : students.length === 0 ? (
          <div className="wr-empty">No active students in this batch.</div>
        ) : (
          <table className="wr-table">
            <thead>
              <tr>
                <th>Student</th><th>Weekly Score</th><th>Grade</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id}>
                  <td>
                    <div className="wr-name">{s.name}</div>
                    <div className="wr-email">{s.email}</div>
                  </td>
                  <td>
                    {s.hasData
                      ? <span className="wr-score" style={{ color: scoreColor(s.score) }}>{s.score}<span className="wr-score-max">/100</span></span>
                      : <span className="wr-nodata">No activity</span>}
                  </td>
                  <td><span className="wr-grade" style={{ background: gradeColor(s.grade) }}>{s.grade}</span></td>
                  <td>
                    {s.lastSent
                      ? <span className={`wr-sent ${s.lastSent.status}`}>{s.lastSent.status === 'sent' ? '✓ Sent' : '✕ Failed'} · {new Date(s.lastSent.sentAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      : <span className="wr-notsent">Not sent</span>}
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="wr-btn ghost" onClick={() => openPreview(s)}>Preview</button>
                    <button className="wr-btn primary sm" disabled={sendingId === s.id} onClick={() => sendOne(s)}>{sendingId === s.id ? 'Sending…' : 'Send'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {previewId && (
        <div className="wr-modal-overlay" onClick={() => setPreviewId(null)}>
          <div className="wr-modal" onClick={e => e.stopPropagation()}>
            <div className="wr-modal-head">
              <div><strong>Report Preview</strong> — {previewName} · {weekLabel}</div>
              <div>
                <button className="wr-btn primary" disabled={sendingId === previewId} onClick={previewSend}>{sendingId === previewId ? 'Sending…' : '📤 Send this report'}</button>
                <button className="wr-btn ghost" onClick={() => setPreviewId(null)}>Close</button>
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
