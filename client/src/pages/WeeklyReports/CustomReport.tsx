import React, { useEffect, useMemo, useRef, useState } from 'react';
import { weeklyReportApi } from '../../api';

/**
 * Custom report (2026-11-26): one student's full report — or a whole batch's "who did what" — for
 * any From–To dates up to 12 months, with PDF and Excel downloads. The weekly tabs are untouched.
 */

type GlanceState = 'done' | 'partial' | 'missed' | 'pending' | 'none';
type Copy = 'staff' | 'student';
interface BatchOpt { _id: string; name: string }
interface StudentHit { id: string; name: string; email: string; batchName: string }

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
const monthsAgo = (n: number) => { const d = new Date(); d.setMonth(d.getMonth() - n); d.setDate(d.getDate() + 1); return iso(d); };
const PRESETS: { key: string; label: string; from: () => string }[] = [
  { key: '30d', label: 'Last 30 days', from: () => daysAgo(29) },
  { key: '2m', label: 'Last 2 months', from: () => monthsAgo(2) },
  { key: '3m', label: 'Last 3 months', from: () => monthsAgo(3) },
  { key: '6m', label: 'Last 6 months', from: () => monthsAgo(6) },
];
const fmtDay = (ymd: string) => {
  const t = Date.parse(`${ymd}T00:00:00`);
  return isNaN(t) ? ymd : new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
const MARK: Record<GlanceState, string> = { done: '✓', partial: '◐', missed: '✗', pending: '•', none: '–' };
const WORD: Record<GlanceState, string> = { done: 'Done', partial: 'Partly done', missed: 'Missed', pending: 'Not due yet', none: 'Nothing set' };
const scoreColor = (s: number) => (s >= 70 ? '#047857' : s >= 50 ? '#B86B00' : '#B91C1C');
const AREAS: { key: string; label: string; short: string }[] = [
  { key: 'classes', label: 'Classes', short: 'Classes' }, { key: 'quizzes', label: 'Quizzes', short: 'Quizzes' },
  { key: 'assignments', label: 'Assignments', short: 'Assign.' }, { key: 'interview', label: 'Mock interview', short: 'Interview' },
  { key: 'communication', label: 'Communication Lab', short: 'Speaking' }, { key: 'thinking', label: 'Thinking Lab', short: 'Thinking' },
];
const frac = (a: number, b: number) => (b ? `${a}/${b}` : '–');

const Pill: React.FC<{ state: GlanceState; detail?: string; compact?: boolean }> = ({ state, detail, compact }) => (
  <span className={`wr-pill ${state}`} title={`${WORD[state]}${detail ? ` — ${detail}` : ''}`}><b>{MARK[state]}</b>{!compact && <span>{detail || WORD[state]}</span>}</span>
);
const Status: React.FC<{ s: string }> = ({ s }) => (
  <span className={`wr-pill ${s === 'done' ? 'done' : s === 'missed' ? 'missed' : 'pending'}`}><span>{s === 'done' ? 'Done' : s === 'missed' ? 'Missed' : 'Open'}</span></span>
);

const CustomReport: React.FC<{ batches: BatchOpt[]; defaultBatchId: string }> = ({ batches, defaultBatchId }) => {
  const [mode, setMode] = useState<'student' | 'batch'>('student');
  const [preset, setPreset] = useState('2m');
  const [from, setFrom] = useState(monthsAgo(2));
  const [to, setTo] = useState(iso(new Date()));
  const [copy, setCopy] = useState<Copy>('staff');
  const [err, setErr] = useState('');

  const [q, setQ] = useState('');
  const [hits, setHits] = useState<StudentHit[]>([]);
  const [picked, setPicked] = useState<StudentHit | null>(null);
  const [open, setOpen] = useState(false);
  const searchTimer = useRef<any>(null);

  const [batchId, setBatchId] = useState(defaultBatchId);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any | null>(null);
  const [batchRows, setBatchRows] = useState<{ label: string; students: any[] } | null>(null);
  const [downloading, setDownloading] = useState<'' | 'pdf' | 'xlsx'>('');

  useEffect(() => { if (!batchId && defaultBatchId) setBatchId(defaultBatchId); }, [defaultBatchId, batchId]);

  useEffect(() => {
    if (picked && q === picked.name) return;
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      weeklyReportApi.searchStudents(q).then((r) => { setHits(r); }).catch(() => setHits([]));
    }, 250);
    return () => clearTimeout(searchTimer.current);
  }, [q, picked]);

  const choosePreset = (k: string) => {
    const p = PRESETS.find((x) => x.key === k);
    setPreset(k);
    if (p) { setFrom(p.from()); setTo(iso(new Date())); }
  };
  const minFrom = useMemo(() => { const d = new Date(`${to}T00:00:00`); d.setDate(d.getDate() - 365); return iso(d); }, [to]);

  const run = async (student: StudentHit | null = picked, m = mode) => {
    setErr('');
    if (m === 'student' && !student) { setErr('Pick a student first.'); return; }
    if (m === 'batch' && !batchId) { setErr('Pick a batch first.'); return; }
    setLoading(true);
    try {
      if (m === 'student') { setReport(await weeklyReportApi.periodStudent(student!.id, from, to, copy)); }
      else { setBatchRows(await weeklyReportApi.periodBatch(batchId, from, to)); }
    } catch (e: any) { setErr(e.message || 'Could not build the report'); }
    finally { setLoading(false); }
  };

  const download = async (format: 'pdf' | 'xlsx') => {
    if (!report) return;
    setDownloading(format); setErr('');
    try { await weeklyReportApi.downloadPeriod(report.student.id, from, to, copy, format); }
    catch (e: any) { setErr(e.message || 'Download failed'); }
    finally { setDownloading(''); }
  };

  const openStudent = (s: any) => {
    const hit = { id: s.id, name: s.name, email: s.email, batchName: batches.find((b) => b._id === batchId)?.name || '' };
    setPicked(hit); setQ(hit.name); setMode('student'); setReport(null);
    run(hit, 'student');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const batchCsv = () => {
    if (!batchRows) return;
    const qv = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['Student', 'Email', 'Score', 'Grade', ...AREAS.flatMap((a) => [a.label, `${a.label} detail`]), 'Drives attended'];
    const lines = batchRows.students.map((s) => [s.name, s.email, s.hasData ? s.score : '', s.hasData ? s.grade : '',
      ...AREAS.flatMap((a) => { const g = (s.glance || []).find((x: any) => x.key === a.key); return [g ? WORD[g.state as GlanceState] : '', g?.detail || '']; }),
      s.drivesAttended || 0].map(qv).join(','));
    const blob = new Blob([`﻿${[head.map(qv).join(','), ...lines].join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `batch-report_${from}_to_${to}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const r = report;
  return (
    <div className="cr">
      <div className="cr-controls">
        <div className="cr-seg" role="radiogroup" aria-label="Report for">
          <button role="radio" aria-checked={mode === 'student'} className={mode === 'student' ? 'on' : ''} onClick={() => setMode('student')}>One student</button>
          <button role="radio" aria-checked={mode === 'batch'} className={mode === 'batch' ? 'on' : ''} onClick={() => setMode('batch')}>Whole batch</button>
        </div>

        <div className="cr-row">
          {mode === 'student' ? (
            <div className="wr-field cr-search">
              <span>Student</span>
              <input
                value={q} placeholder="Search by name or email"
                onChange={(e) => { setQ(e.target.value); setPicked(null); setOpen(true); }}
                onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
                aria-autocomplete="list"
              />
              {open && hits.length > 0 && (
                <ul className="cr-hits" role="listbox">
                  {hits.map((h) => (
                    <li key={h.id} role="option" aria-selected={picked?.id === h.id}
                      onMouseDown={(e) => { e.preventDefault(); setPicked(h); setQ(h.name); setOpen(false); }}>
                      <b>{h.name}</b><span>{h.email}{h.batchName ? ` · ${h.batchName}` : ''}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <label className="wr-field">
              <span>Batch</span>
              <select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
                {batches.length === 0 && <option value="">No batches</option>}
                {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </label>
          )}
          <label className="wr-field cr-date"><span>From</span>
            <input type="date" value={from} min={minFrom} max={to} onChange={(e) => { setFrom(e.target.value); setPreset(''); }} />
          </label>
          <label className="wr-field cr-date"><span>To</span>
            <input type="date" value={to} max={iso(new Date())} onChange={(e) => { setTo(e.target.value); setPreset(''); }} />
          </label>
        </div>

        <div className="cr-row cr-row-b">
          <div className="cr-presets">
            {PRESETS.map((p) => <button key={p.key} className={`cr-chip ${preset === p.key ? 'on' : ''}`} onClick={() => choosePreset(p.key)}>{p.label}</button>)}
          </div>
          {mode === 'student' && (
            <label className="cr-copy">
              <span>Copy</span>
              <select value={copy} onChange={(e) => setCopy(e.target.value as Copy)}>
                <option value="staff">Staff — with drive results</option>
                <option value="student">Student copy — no drive results</option>
              </select>
            </label>
          )}
          <button className="wr-btn primary cr-go" disabled={loading} onClick={() => run()}>{loading ? 'Building…' : 'Show report'}</button>
        </div>
        <div className="cr-hint">Up to 12 months. Long ranges take a few seconds{mode === 'batch' ? ' per student' : ''}.</div>
      </div>

      {err && <div className="wr-alert err"><span>{err}</span><button onClick={() => setErr('')} aria-label="Close">✕</button></div>}

      {mode === 'student' && r && !loading && (
        <div className="cr-report">
          <div className="cr-head">
            <div>
              <div className="cr-eyebrow">Student report · {r.copy === 'staff' ? 'staff copy' : 'student copy'}</div>
              <h2>{r.student.name}</h2>
              <div className="cr-sub">{r.period.label}{r.student.batchName ? ` · ${r.student.batchName}` : ''} · {r.days} days</div>
            </div>
            <div className="cr-head-right">
              {r.overall.hasData
                ? <div className="cr-score"><b style={{ color: scoreColor(r.overall.score) }}>{r.overall.score}</b><span>/100 · Grade {r.overall.grade}</span></div>
                : <div className="cr-score muted">No score for this period</div>}
              <div className="cr-dl">
                <button className="wr-btn outline sm" disabled={!!downloading} onClick={() => download('pdf')}>{downloading === 'pdf' ? 'Preparing…' : '⬇ PDF'}</button>
                <button className="wr-btn outline sm" disabled={!!downloading} onClick={() => download('xlsx')}>{downloading === 'xlsx' ? 'Preparing…' : '⬇ Excel'}</button>
              </div>
            </div>
          </div>

          <div className="cr-glance">
            {r.glance.map((g: any) => (
              <div key={g.key} className={`cr-tile ${g.state}`}><div className="cr-tile-label">{MARK[g.state as GlanceState]} {g.label}</div><div className="cr-tile-detail">{g.detail}</div></div>
            ))}
            <div className={`cr-tile ${r.drives.length ? 'done' : 'none'}`}><div className="cr-tile-label">{r.drives.length ? '✓' : '–'} Placement drives</div><div className="cr-tile-detail">{r.drives.length ? `${r.drives.length} attended` : 'None'}</div></div>
          </div>

          <section className="cr-sec">
            <h3>Week by week</h3>
            <div className="cr-scroll">
              <table className="cr-table cr-weeks">
                <thead><tr><th>Week</th><th className="r">Score</th><th>Classes</th><th>Quizzes</th><th>Assign.</th><th>Interview</th><th>Speaking</th><th>Thinking</th><th>Drives</th></tr></thead>
                <tbody>
                  {r.weeks.map((w: any) => (
                    <tr key={w.start}>
                      <td className="nowrap">{w.label}</td>
                      <td className="r"><b style={{ color: w.hasData ? scoreColor(w.score) : '#94A3B8' }}>{w.hasData ? w.score : '–'}</b></td>
                      <td>{frac(w.classes.present, w.classes.total)}</td>
                      <td className={w.quizzes.missed ? 'bad' : ''}>{frac(w.quizzes.done, w.quizzes.set)}</td>
                      <td className={w.assignments.missed ? 'bad' : ''}>{frac(w.assignments.done, w.assignments.set)}</td>
                      <td>{w.interviews.taken || w.interviews.absent ? `${w.interviews.taken}${w.interviews.absent ? ` · ${w.interviews.absent} absent` : ''}` : '–'}</td>
                      <td className={w.communication.expected && w.communication.done < w.communication.expected ? 'bad' : ''}>{w.communication.expected ? frac(w.communication.done, w.communication.expected) : w.communication.active ? `${w.communication.active}d` : '–'}</td>
                      <td className={w.thinking.expected && w.thinking.done < w.thinking.expected ? 'bad' : ''}>{w.thinking.expected ? frac(w.thinking.done, w.thinking.expected) : w.thinking.active ? `${w.thinking.active}d` : '–'}</td>
                      <td>{w.drives || '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="cr-two">
            <section className="cr-sec">
              <h3>Quizzes <small>{r.quizzes.assigned ? `${r.quizzes.attempted}/${r.quizzes.assigned} done · ${r.quizzes.missed} missed${r.quizzes.attempted ? ` · avg ${r.quizzes.avgScore}%` : ''}` : ''}</small></h3>
              {r.quizzes.items.length ? (
                <table className="cr-table"><tbody>
                  {r.quizzes.items.map((i: any, k: number) => (
                    <tr key={k}><td><div className="cr-item">{i.title}</div><div className="cr-muted">{fmtDay(i.date)}</div></td><td><Status s={i.status} /></td><td className="r">{i.score !== null ? `${i.score}%` : '–'}</td></tr>
                  ))}
                </tbody></table>
              ) : <div className="cr-empty">No quizzes in this period.</div>}
            </section>
            <section className="cr-sec">
              <h3>Assignments <small>{r.assignments.assigned ? `${r.assignments.submitted}/${r.assignments.assigned} submitted · ${r.assignments.missed} missed` : ''}</small></h3>
              {r.assignments.items.length ? (
                <table className="cr-table"><tbody>
                  {r.assignments.items.map((i: any, k: number) => (
                    <tr key={k}><td><div className="cr-item">{i.title}</div><div className="cr-muted">{fmtDay(i.date)}</div></td><td><Status s={i.status} /></td><td className="r">{i.score !== null ? `${i.score}%` : '–'}</td></tr>
                  ))}
                </tbody></table>
              ) : <div className="cr-empty">No assignments in this period.</div>}
            </section>
          </div>

          <div className="cr-two">
            <section className="cr-sec">
              <h3>Class attendance</h3>
              {r.attendance.totalClasses ? (
                <div className="cr-stats">
                  <div><b>{r.attendance.percentage}%</b><span>Attendance</span></div>
                  <div><b>{r.attendance.present}</b><span>Present</span></div>
                  <div><b className={r.attendance.absent ? 'bad' : ''}>{r.attendance.absent}</b><span>Absent</span></div>
                  <div><b>{r.attendance.late}</b><span>Late</span></div>
                  <div><b>{r.attendance.leave}</b><span>Leave</span></div>
                </div>
              ) : <div className="cr-empty">No classes marked in this period.</div>}
            </section>
            <section className="cr-sec">
              <h3>Mock interviews <small>{r.interview.taken ? `${r.interview.taken} taken · avg ${r.interview.avgScore}%` : ''}{r.interview.absent ? ` · ${r.interview.absent} absent` : ''}</small></h3>
              {r.interview.items.length ? (
                <table className="cr-table"><tbody>
                  {r.interview.items.map((x: any, k: number) => (
                    <tr key={k}>
                      <td><div className="cr-item">{x.title}</div><div className="cr-muted">{fmtDay(x.date)}</div>{x.remarks && <div className="cr-remark">“{x.remarks}”</div>}</td>
                      <td className="r">{x.absent ? <span className="wr-pill missed"><span>Absent</span></span> : x.score !== null ? `${x.score}%` : '–'}</td>
                    </tr>
                  ))}
                </tbody></table>
              ) : <div className="cr-empty">No mock interviews in this period.</div>}
            </section>
          </div>

          <div className="cr-two">
            {(['communication', 'thinking'] as const).map((k) => {
              const w = r[k];
              const title = k === 'communication' ? 'AI Communication Lab' : 'Thinking Lab';
              return (
                <section className="cr-sec" key={k}>
                  <h3>{title}</h3>
                  <div className="cr-muted cr-src">{w.expectedDays
                    ? (w.source === 'scheduled' ? 'Expected = days the batch had a challenge set.' : 'Expected = Daily Practice Pass working days.')
                    : w.activeDays ? 'Nothing was set; these are days practised on their own.' : 'Nothing set and nothing done in this period.'}</div>
                  {(w.expectedDays > 0 || w.activeDays > 0) && (
                    <div className="cr-stats">
                      <div><b className={w.missedDays ? 'bad' : ''}>{w.expectedDays ? `${w.doneDays}/${w.expectedDays}` : w.activeDays}</b><span>{w.expectedDays ? 'Days done' : 'Days practised'}</span></div>
                      {k === 'communication'
                        ? <><div><b>{w.recordings}</b><span>Recordings</span></div><div><b>{w.avgScore ?? '–'}</b><span>AI score</span></div></>
                        : <><div><b>{w.solved}/{w.attempted}</b><span>Solved</span></div><div><b>{w.avgScore ?? '–'}</b><span>Avg score</span></div></>}
                    </div>
                  )}
                  {k === 'communication' && w.skillsChange?.length > 0 && (
                    <table className="cr-table cr-skills">
                      <thead><tr><th>Skill</th><th className="r">Start</th><th className="r">End</th><th className="r">Change</th></tr></thead>
                      <tbody>{w.skillsChange.map((s: any) => (
                        <tr key={s.label}><td>{s.label}</td><td className="r">{s.from}</td><td className="r">{s.to}</td>
                          <td className={`r ${s.to > s.from ? 'good' : s.to < s.from ? 'bad' : ''}`}>{s.to - s.from >= 0 ? '+' : ''}{s.to - s.from}</td></tr>
                      ))}</tbody>
                    </table>
                  )}
                  {k === 'thinking' && w.attempted > 0 && <div className="cr-muted">Easy {w.difficulty.easy} · Medium {w.difficulty.medium} · Hard {w.difficulty.hard} · hints {w.hintsUsed}</div>}
                  {(w.strength || w.improve || w.weakness || w.focus) && (
                    <ul className="cr-notes">
                      {w.strength && <li><b>💪 Strength:</b> {w.strength}</li>}
                      {(w.improve || w.weakness) && <li><b>🎯 Work on:</b> {w.improve || w.weakness}</li>}
                      {w.focus && <li><b>➡️ Latest focus:</b> {w.focus}</li>}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>

          <section className="cr-sec">
            <h3>Placement drives <small>{r.copy === 'staff' ? 'every drive they were put forward for' : 'drives attended'}</small></h3>
            {r.driveLog.length ? (
              <div className="cr-scroll">
                <table className="cr-table cr-drives">
                  <thead><tr><th>Day</th><th>Company</th><th>Role</th>{r.copy === 'staff' ? <><th>Result</th><th className="r">Offer</th><th>Company feedback</th></> : <th>Held</th>}</tr></thead>
                  <tbody>{r.driveLog.map((d: any, k: number) => (
                    <tr key={k}>
                      <td className="nowrap">{fmtDay(d.day)}</td><td>{d.company}</td><td>{d.role}</td>
                      {r.copy === 'staff'
                        ? <><td className={/Offer|Joined/.test(d.status) ? 'good' : /Not selected|Did not/.test(d.status) ? 'bad' : ''}>{d.status}{d.roundReached ? ` (${d.roundReached})` : ''}</td><td className="r">{d.offerCtc ? `${d.offerCtc} LPA` : '–'}</td><td className="cr-muted">{d.companyFeedback || '—'}</td></>
                        : <td>{d.mode || '—'}</td>}
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <div className="cr-empty">No drives in this period.</div>}
          </section>

          {r.practice && (
            <section className="cr-sec">
              <h3>Daily Practice Pass</h3>
              <div className="cr-stats">
                <div><b>{r.practice.metDays}/{r.practice.countedDays}</b><span>Days met</span></div>
                <div><b>{r.practice.pct}%</b><span>Practice attendance</span></div>
                <div><b>{r.practice.streak}</b><span>Streak</span></div>
              </div>
              {r.practice.onHold && <div className="cr-remark bad">Placement support is on hold.</div>}
            </section>
          )}
        </div>
      )}

      {mode === 'student' && !r && !loading && !err && (
        <div className="wr-card"><div className="wr-empty">Pick a student and dates, then <b>Show report</b>.</div></div>
      )}
      {loading && <div className="wr-card"><div className="wr-empty">Building the report…</div></div>}

      {mode === 'batch' && batchRows && !loading && (
        <div className="cr-batch">
          <div className="wr-progress-bar">
            <div className="cr-muted">{batchRows.label} · {batchRows.students.length} students</div>
            <button className="wr-btn ghost" disabled={!batchRows.students.length} onClick={batchCsv}>⬇ Download CSV</button>
          </div>
          <div className="wr-card">
            {batchRows.students.length === 0 ? <div className="wr-empty">No active students in this batch.</div> : (
              <>
                <table className="wr-table wr-matrix">
                  <thead><tr><th>Student</th><th>Score</th>{AREAS.map((a) => <th key={a.key} title={a.label}>{a.short}</th>)}<th>Drives</th><th></th></tr></thead>
                  <tbody>{batchRows.students.map((s) => (
                    <tr key={s.id}>
                      <td><div className="wr-name">{s.name}</div><div className="wr-email">{s.email}</div></td>
                      <td>{s.hasData ? <span className="wr-score sm" style={{ color: scoreColor(s.score) }}>{s.score}</span> : <span className="wr-nodata">—</span>}</td>
                      {AREAS.map((a) => { const g = (s.glance || []).find((x: any) => x.key === a.key); return <td key={a.key}><Pill state={(g?.state || 'none') as GlanceState} detail={g?.detail} /></td>; })}
                      <td>{s.drivesAttended || '–'}</td>
                      <td style={{ textAlign: 'right' }}><button className="wr-btn ghost sm" onClick={() => openStudent(s)}>Open report</button></td>
                    </tr>
                  ))}</tbody>
                </table>
                <div className="wr-cards">
                  {batchRows.students.map((s) => (
                    <div key={s.id} className="wr-scard">
                      <div className="wr-scard-head">
                        <div><div className="wr-name">{s.name}</div><div className="wr-email">{s.email}</div></div>
                        {s.hasData && <span className="wr-score sm" style={{ color: scoreColor(s.score) }}>{s.score}<span className="wr-score-max">/100</span></span>}
                      </div>
                      <div className="wr-scard-grid">
                        {AREAS.map((a) => { const g = (s.glance || []).find((x: any) => x.key === a.key); return (
                          <div key={a.key} className="wr-scard-item"><div className="wr-scard-label">{a.label}</div><Pill state={(g?.state || 'none') as GlanceState} detail={g?.detail} /></div>
                        ); })}
                      </div>
                      <button className="wr-btn ghost sm wr-scard-btn" onClick={() => openStudent(s)}>Open report</button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {mode === 'batch' && !batchRows && !loading && !err && (
        <div className="wr-card"><div className="wr-empty">Pick a batch and dates, then <b>Show report</b>.</div></div>
      )}
    </div>
  );
};

export default CustomReport;
