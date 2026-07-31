import React, { useMemo, useState } from 'react';
import './AssignmentsPanel.css';

/**
 * Assignments tab.
 *
 * The previous table put the whole assignment title — often a full problem statement —
 * into one cell, so a single row could run the width of the page and rows were
 * impossible to compare. Titles are now clamped to two lines with the full text behind
 * a details drawer, and status/score/due/assigned-via are fixed-width columns that line
 * up down the page.
 *
 * All filtering and sorting is client-side over the rows the activity endpoint already
 * returns, so no extra request is made and nothing new is invented.
 */

type Row = any;

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Assigned', in_progress: 'In progress', submitted: 'Submitted',
  graded: 'Completed', late: 'Submitted late', overdue: 'Overdue', missed: 'Missed',
};
const STATUS_ORDER = ['not_started', 'in_progress', 'overdue', 'submitted', 'late', 'graded', 'missed'];

const SORTS: { key: string; label: string }[] = [
  { key: 'due_asc', label: 'Due date — soonest' },
  { key: 'due_desc', label: 'Due date — latest' },
  { key: 'submitted_desc', label: 'Recently submitted' },
  { key: 'score_desc', label: 'Highest score' },
  { key: 'score_asc', label: 'Lowest score' },
  { key: 'status', label: 'Status' },
  { key: 'title', label: 'Title (A–Z)' },
];

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** "Due tomorrow" / "3 days overdue" — never colour alone, always words too. */
function relDue(due?: string | null, done?: boolean): string {
  if (!due) return '';
  const ms = new Date(due).getTime() - Date.now();
  const days = Math.round(ms / 86400000);
  if (done) return '';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days > 1) return `Due in ${days} days`;
  if (days === -1) return '1 day overdue';
  return `${Math.abs(days)} days overdue`;
}

const scoreText = (r: Row) => {
  const total = r.assignment?.totalPoints;
  if (r.obtainedPoints === null || r.obtainedPoints === undefined) {
    return r.attempted ? 'Not graded' : '—';
  }
  return `${r.obtainedPoints} / ${total ?? '?'}`;
};

const StatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  const k = String(status || 'not_started').toLowerCase();
  return <span className={`ap-badge ${k}`}>{STATUS_LABELS[k] || k}</span>;
};

const AssignmentsPanel: React.FC<{ rows: Row[]; loading?: boolean }> = ({ rows, loading }) => {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [via, setVia] = useState('all');
  const [sort, setSort] = useState('due_asc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [detail, setDetail] = useState<Row | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const r of rows) {
      const k = r.status || 'not_started';
      c[k] = (c[k] || 0) + 1;
    }
    c.pending = (c.not_started || 0) + (c.in_progress || 0) + (c.overdue || 0);
    c.done = (c.submitted || 0) + (c.late || 0) + (c.graded || 0);
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = rows.filter(r => {
      if (needle && !String(r.assignment?.title || '').toLowerCase().includes(needle)) return false;
      if (status !== 'all') {
        if (status === 'pending' && !['not_started', 'in_progress', 'overdue'].includes(r.status)) return false;
        if (status === 'done' && !['submitted', 'late', 'graded'].includes(r.status)) return false;
        if (!['pending', 'done'].includes(status) && r.status !== status) return false;
      }
      if (via !== 'all' && (r.source || 'baked') !== via) return false;
      return true;
    });

    const num = (v: any) => (v === null || v === undefined ? -1 : Number(v));
    const t = (v: any) => (v ? new Date(v).getTime() : 0);
    out = [...out].sort((a, b) => {
      switch (sort) {
        case 'due_desc': return t(b.dueAt || b.assignment?.dueDate) - t(a.dueAt || a.assignment?.dueDate);
        case 'submitted_desc': return t(b.submittedAt) - t(a.submittedAt);
        case 'score_desc': return num(b.obtainedPoints) - num(a.obtainedPoints);
        case 'score_asc': return num(a.obtainedPoints) - num(b.obtainedPoints);
        case 'status': return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
        case 'title': return String(a.assignment?.title || '').localeCompare(String(b.assignment?.title || ''));
        default: return t(a.dueAt || a.assignment?.dueDate) - t(b.dueAt || b.assignment?.dueDate);
      }
    });
    return out;
  }, [rows, q, status, via, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const shown = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  const reset = () => { setQ(''); setStatus('all'); setVia('all'); setSort('due_asc'); setPage(1); };
  const chip = (key: string, label: string, n: number) => (
    <button
      key={key}
      className={`ap-chip ${status === key ? 'on' : ''}`}
      onClick={() => { setStatus(key); setPage(1); }}
      aria-pressed={status === key}
    >
      {label} <b>{n}</b>
    </button>
  );

  if (loading) return <div className="ap-skeleton">{Array.from({ length: 6 }, (_, i) => <div key={i} />)}</div>;

  if (!rows.length) {
    return (
      <div className="ap-empty">
        <div className="ap-empty-ic">▤</div>
        <h4>No assignments assigned</h4>
        <p>Nothing has been assigned to this student yet, directly or through a schedule.</p>
      </div>
    );
  }

  return (
    <div className="ap">
      {/* Summary chips double as the status filter. */}
      <div className="ap-chips">
        {chip('all', 'All', counts.all)}
        {chip('pending', 'Pending', counts.pending || 0)}
        {chip('done', 'Completed', counts.done || 0)}
        {chip('overdue', 'Overdue', counts.overdue || 0)}
        {chip('missed', 'Missed', counts.missed || 0)}
      </div>

      <div className="ap-toolbar">
        <div className="ap-tools-left">
          <label className="ap-search">
            <span className="ap-search-ic" aria-hidden>⌕</span>
            <input
              value={q}
              onChange={e => { setQ(e.target.value); setPage(1); }}
              placeholder="Search assignments…"
              aria-label="Search assignments by title"
            />
            {q && <button className="ap-clear" onClick={() => setQ('')} aria-label="Clear search">×</button>}
          </label>

          <select value={via} onChange={e => { setVia(e.target.value); setPage(1); }} aria-label="Filter by how it was assigned">
            <option value="all">Assigned via: All</option>
            <option value="schedule">Scheduled</option>
            <option value="baked">Direct</option>
          </select>
        </div>

        <div className="ap-tools-right">
          <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort assignments">
            {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <button className="ap-reset" onClick={reset}>Reset</button>
        </div>
      </div>

      <div className="ap-count">
        Showing <b>{shown.length}</b> of <b>{filtered.length}</b>
        {filtered.length !== rows.length && <> (filtered from {rows.length})</>}
      </div>

      {filtered.length === 0 ? (
        <div className="ap-empty small">
          <h4>No assignments match these filters</h4>
          <button className="ap-reset" onClick={reset}>Clear filters</button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th className="ap-col-title">Assignment</th>
                  <th>Type</th><th>Score</th><th>Due</th><th>Status</th><th>Assigned via</th><th>Submitted</th><th></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r, i) => {
                  const due = r.dueAt || r.assignment?.dueDate;
                  const done = ['submitted', 'late', 'graded'].includes(r.status);
                  const rel = relDue(due, done);
                  return (
                    <tr key={r.assignmentId || i}>
                      <td className="ap-col-title">
                        <button className="ap-title" onClick={() => setDetail(r)} title={r.assignment?.title}>
                          {r.assignment?.title || 'Untitled'}
                        </button>
                      </td>
                      <td>{r.assignment?.type || '—'}</td>
                      <td className="ap-score">{scoreText(r)}</td>
                      <td>
                        {fmtDate(due)}
                        {rel && <span className={`ap-rel ${rel.includes('overdue') ? 'bad' : ''}`}>{rel}</span>}
                      </td>
                      <td><StatusBadge status={r.status} /></td>
                      <td><span className={`ap-via ${r.source === 'schedule' ? 'sched' : ''}`}>{r.source === 'schedule' ? 'Scheduled' : 'Direct'}</span></td>
                      <td>{fmtDate(r.submittedAt)}</td>
                      <td><button className="ap-view" onClick={() => setDetail(r)}>View</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards — a wide table is unusable on a phone. */}
          <div className="ap-cards">
            {shown.map((r, i) => {
              const due = r.dueAt || r.assignment?.dueDate;
              const done = ['submitted', 'late', 'graded'].includes(r.status);
              const rel = relDue(due, done);
              return (
                <button className="ap-card" key={r.assignmentId || i} onClick={() => setDetail(r)}>
                  <div className="ap-card-top">
                    <StatusBadge status={r.status} />
                    <span className={`ap-via ${r.source === 'schedule' ? 'sched' : ''}`}>{r.source === 'schedule' ? 'Scheduled' : 'Direct'}</span>
                  </div>
                  <div className="ap-card-title">{r.assignment?.title || 'Untitled'}</div>
                  <div className="ap-card-meta">
                    <span><i>Score</i>{scoreText(r)}</span>
                    <span><i>Due</i>{fmtDate(due)}</span>
                    <span><i>Submitted</i>{fmtDate(r.submittedAt)}</span>
                  </div>
                  {rel && <div className={`ap-rel ${rel.includes('overdue') ? 'bad' : ''}`}>{rel}</div>}
                </button>
              );
            })}
          </div>

          <div className="ap-pager">
            <label>
              Rows
              <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }} aria-label="Rows per page">
                {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <div className="ap-pager-nav">
              <button disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>‹ Prev</button>
              <span>Page {safePage} of {totalPages}</span>
              <button disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>Next ›</button>
            </div>
          </div>
        </>
      )}

      {/* Details drawer — where the full title lives instead of stretching the table. */}
      {detail && (
        <div className="ap-drawer-back" onClick={() => setDetail(null)} role="presentation">
          <aside
            className="ap-drawer" onClick={e => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-label="Assignment details"
          >
            <div className="ap-drawer-head">
              <h4>Assignment details</h4>
              <button onClick={() => setDetail(null)} aria-label="Close details">×</button>
            </div>
            <div className="ap-drawer-body">
              <p className="ap-drawer-title">{detail.assignment?.title}</p>
              <dl className="ap-dl">
                <div><dt>Status</dt><dd><StatusBadge status={detail.status} /></dd></div>
                <div><dt>Type</dt><dd>{detail.assignment?.type || '—'}</dd></div>
                <div><dt>Score</dt><dd>{scoreText(detail)}{detail.percentage != null && ` (${detail.percentage}%)`}</dd></div>
                <div><dt>Due</dt><dd>{fmtDate(detail.dueAt || detail.assignment?.dueDate)}</dd></div>
                <div><dt>Submitted</dt><dd>{fmtDate(detail.submittedAt)}</dd></div>
                <div><dt>Assigned via</dt><dd>{detail.source === 'schedule' ? 'Assessment schedule' : 'Directly targeted'}</dd></div>
                <div><dt>Total points</dt><dd>{detail.assignment?.totalPoints ?? '—'}</dd></div>
              </dl>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default AssignmentsPanel;
