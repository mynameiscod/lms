import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { portalApi, empErr, HistoryRow, PortalMe } from '../../../api/employeesApi';
import DayEditor from './DayEditor';
import { addDays, daysBetween, fmtDay, hoursText, modeLabel, todayIST } from './portalUtils';
import '../employees.css';
import './portal.css';

interface Props { me: PortalMe; reload: () => void }

const STATUS: Record<string, { cls: string; label: string }> = {
  open: { cls: 'grey', label: 'Draft' },
  submitted: { cls: 'amber', label: 'Waiting for review' },
  approved: { cls: 'green', label: 'Approved' },
  returned: { cls: 'red', label: 'Returned' },
  missing: { cls: 'red', label: 'Not logged' },
  none: { cls: 'grey', label: '—' },
};

const PAGE = 30;

const HistoryTab: React.FC<Props> = ({ me, reload }) => {
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<string | null>(null);

  const today = todayIST();
  const to = addDays(today, -page * PAGE);
  const from = addDays(to, -(PAGE - 1));
  const editableDays = me.config.activityPolicy.editableDays;

  const load = useCallback(() => {
    setLoading(true); setError('');
    portalApi.history(from, to)
      .then((r) => setRows([...r].sort((a, b) => (a.date < b.date ? 1 : -1))))
      .catch((e) => setError(empErr(e, 'Could not load your history')))
      .finally(() => setLoading(false));
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const logged = rows.filter((r) => r.status !== 'missing' && r.status !== 'none' && r.status !== 'open');
    const hrs = rows.filter((r) => r.totalHours > 0);
    const avg = hrs.length ? hrs.reduce((s, r) => s + r.totalHours, 0) / hrs.length : 0;
    return { logged: logged.length, missing: rows.filter((r) => r.status === 'missing').length, avg };
  }, [rows]);

  const canEdit = (r: HistoryRow) =>
    ['open', 'returned', 'missing'].includes(r.status) && daysBetween(r.date, today) >= 0 && daysBetween(r.date, today) <= editableDays;

  const closeModal = () => { setEditing(null); load(); reload(); };
  const editingRow = rows.find((r) => r.date === editing);
  const readOnly = editingRow ? !canEdit(editingRow) : false;

  return (
    <div>
      <div className="emp-stats">
        <div className="emp-stat"><b>{stats.logged}</b><span>Days logged</span></div>
        <div className="emp-stat"><b style={stats.missing ? { color: '#b91c1c' } : undefined}>{stats.missing}</b><span>Not logged</span></div>
        <div className="emp-stat"><b>{hoursText(Math.round(stats.avg * 10) / 10)}</b><span>Average per day</span></div>
        <div className="emp-stat"><b>{fmtDay(from).split(', ')[1]}–{fmtDay(to).split(', ')[1]}</b><span>Showing</span></div>
      </div>

      <div className="emp-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <button type="button" className="emp-btn ghost sm" onClick={() => setPage((p) => p + 1)}>← Previous 30 days</button>
        <button type="button" className="emp-btn ghost sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Next 30 days →</button>
      </div>

      {error && <div className="emp-msg err">{error} <button type="button" className="emp-btn ghost sm" onClick={load}>Try again</button></div>}
      {loading ? <p className="emp-empty">Loading…</p> : rows.length === 0 ? <p className="emp-empty">No days in this period.</p> : (
        <div className="emp-card">
          {rows.map((r) => {
            const st = STATUS[r.status] || STATUS.none;
            return (
              <div className="emp-hist-row" key={r.date}>
                <div>
                  <b>{fmtDay(r.date)}</b>
                  <div className="emp-muted" style={{ fontSize: 12.5 }}>{r.status === 'missing' || r.status === 'none' ? '' : modeLabel(r.workMode)}{r.late ? ' · late' : ''}</div>
                </div>
                <div className="hide-sm">{r.totalHours ? hoursText(r.totalHours) : '—'}</div>
                <div className="hide-sm">{r.taskCount ? `${r.taskCount} task${r.taskCount > 1 ? 's' : ''}` : '—'}</div>
                <div className="hide-sm"><span className={`emp-badge ${st.cls}`}>{st.label}</span></div>
                <div className="emp-row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                  {r.status !== 'none' && (
                    <button type="button" className="emp-btn ghost sm" onClick={() => setEditing(r.date)}>
                      {canEdit(r) ? (r.status === 'missing' ? 'Fill in' : 'Edit') : 'View'}
                    </button>
                  )}
                </div>
                <div style={{ gridColumn: '1 / -1' }} className="emp-sub show-sm">
                  <span className={`emp-badge ${st.cls}`} style={{ marginRight: 8 }}>{st.label}</span>
                  <span className="emp-muted">{r.totalHours ? `${hoursText(r.totalHours)} · ` : ''}{r.taskCount ? `${r.taskCount} task${r.taskCount > 1 ? 's' : ''}` : ''}</span>
                </div>
                {r.status === 'returned' && r.reviewNote && <div className="emp-returned-note"><b>Please fix:</b> {r.reviewNote}</div>}
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <div className="emp-modal-back" onClick={closeModal}>
          <div className="emp-modal" style={{ maxWidth: 680 }} role="dialog" aria-modal="true" aria-label={`Day ${editing}`} onClick={(e) => e.stopPropagation()}>
            <h2>{fmtDay(editing)}{readOnly ? ' (view only)' : ''}</h2>
            {readOnly && <p className="emp-hint">This day is older than {editableDays} days or already submitted, so it cannot be changed.</p>}
            <DayEditor date={editing} config={me.config} readOnly={readOnly} onChanged={() => { load(); reload(); }} />
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <button type="button" className="emp-btn ghost" onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryTab;
