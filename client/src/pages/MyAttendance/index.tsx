import React, { useEffect, useState, useCallback } from 'react';
import { attendanceApi, batchApi } from '../../api';
import { Alert, Spinner } from '../../components/common';
import { Attendance, AttendanceSummary, Batch } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import './MyAttendancePage.css';

const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

type RangePreset = 'thisMonth' | 'lastMonth' | 'thisWeek' | 'last7' | 'custom';

const presetLabels: Record<RangePreset, string> = {
  thisMonth: 'This Month',
  lastMonth: 'Last Month',
  thisWeek: 'This Week',
  last7: 'Last 7 Days',
  custom: 'Custom Range',
};

const computeRange = (preset: RangePreset): { from: string; to: string } => {
  const today = new Date();
  if (preset === 'thisMonth') {
    return {
      from: getLocalDateString(new Date(today.getFullYear(), today.getMonth(), 1)),
      to: getLocalDateString(today),
    };
  }
  if (preset === 'lastMonth') {
    return {
      from: getLocalDateString(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      to: getLocalDateString(new Date(today.getFullYear(), today.getMonth(), 0)),
    };
  }
  if (preset === 'thisWeek') {
    const d = new Date(today);
    const diff = (d.getDay() + 6) % 7; // Monday as start
    d.setDate(d.getDate() - diff);
    return { from: getLocalDateString(d), to: getLocalDateString(today) };
  }
  if (preset === 'last7') {
    const d = new Date(today);
    d.setDate(d.getDate() - 6);
    return { from: getLocalDateString(d), to: getLocalDateString(today) };
  }
  return { from: getLocalDateString(today), to: getLocalDateString(today) };
};

const statusLabel = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const MyAttendancePage: React.FC = () => {
  const { user } = useAuth();

  const [currentBatch, setCurrentBatch] = useState<Batch | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');

  const initial = computeRange('thisMonth');
  const [startDate, setStartDate] = useState<string>(initial.from);
  const [endDate, setEndDate] = useState<string>(initial.to);
  const [preset, setPreset] = useState<RangePreset>('thisMonth');

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);

  // Get date constraints
  const getMinDate = () => {
    if (!currentBatch || !user) return '';
    const batchStart = currentBatch.startDate ? new Date(currentBatch.startDate) : null;
    const userJoined = user.createdAt ? new Date(user.createdAt) : null;
    if (batchStart && userJoined) {
      return batchStart > userJoined
        ? batchStart.toISOString().split('T')[0]
        : userJoined.toISOString().split('T')[0];
    }
    return batchStart?.toISOString().split('T')[0] || userJoined?.toISOString().split('T')[0] || '';
  };

  const getFromDateMax = () => getLocalDateString();

  const getToDateMax = () => {
    if (!currentBatch) return getLocalDateString();
    const today = getLocalDateString();
    const batchEnd = currentBatch.endDate ? getLocalDateString(new Date(currentBatch.endDate)) : today;
    return batchEnd < today ? batchEnd : today;
  };

  const fetchAttendance = useCallback(async (from: string, to: string) => {
    if (!user?._id) return;
    try {
      setError('');
      setFetching(true);
      const attendanceRes = await attendanceApi.getStudentAttendance(user._id, from, to);
      const records: Attendance[] = attendanceRes.data || [];
      records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAttendance(records);
      setPage(1);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch attendance');
    } finally {
      setFetching(false);
    }
  }, [user]);

  useEffect(() => {
    const fetchStudentBatch = async () => {
      try {
        setLoading(true);
        if (user?.batchId) {
          const res = await batchApi.getBatchById(user.batchId);
          const batch = res.data || res;
          setCurrentBatch(batch);
          if (user._id) {
            const summaryRes = await attendanceApi.getStudentAttendanceSummary(user._id, user.batchId);
            setSummary(summaryRes.data || null);
          }
          await fetchAttendance(initial.from, initial.to);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch batch');
      } finally {
        setLoading(false);
      }
    };
    fetchStudentBatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handlePreset = (value: RangePreset) => {
    setPreset(value);
    if (value === 'custom') return;
    const { from, to } = computeRange(value);
    setStartDate(from);
    setEndDate(to);
    fetchAttendance(from, to);
  };

  const handleFilter = () => {
    if (!startDate || !endDate) {
      setError('Please select both from and to dates');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('From date cannot be greater than to date');
      return;
    }
    fetchAttendance(startDate, endDate);
  };

  // Derive summary from the currently loaded range so cards track the filter
  const rangeSummary: AttendanceSummary = React.useMemo(() => {
    const present = attendance.filter(a => a.status === 'present').length;
    const absent = attendance.filter(a => a.status === 'absent').length;
    const leave = attendance.filter(a => a.status === 'leave').length;
    const total = attendance.length;
    const percentage = total ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, leave, percentage };
  }, [attendance]);

  const display = attendance.length > 0 ? rangeSummary : (summary || rangeSummary);
  const pct = (n: number) => (display.total ? Math.round((n / display.total) * 100) : 0);
  const rating = display.percentage >= 75 ? 'Good!' : display.percentage >= 50 ? 'Average' : 'Needs work';
  const ratingClass = display.percentage >= 75 ? 'good' : display.percentage >= 50 ? 'avg' : 'low';

  const totalRecords = attendance.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / perPage));
  const pageStart = (page - 1) * perPage;
  const pageRecords = attendance.slice(pageStart, pageStart + perPage);

  const pageNumbers = (): (number | '…')[] => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, '…', totalPages];
    if (page >= totalPages - 2) return [1, '…', totalPages - 2, totalPages - 1, totalPages];
    return [1, '…', page, '…', totalPages];
  };

  if (loading) return <Spinner fullScreen />;

  return (
    <div className="ma-page">
      {/* Header */}
      <div className="ma-header">
        <div>
          <h1 className="ma-title">My Attendance</h1>
          <p className="ma-subtitle">Track your class attendance and maintain your records.</p>
        </div>
        <div className="ma-hero-art">📋</div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* Batch info */}
      {currentBatch && (
        <div className="ma-batch">
          <span className="ma-batch-ic">👥</span>
          <span>Batch: <strong>{currentBatch.name}</strong></span>
        </div>
      )}

      {/* Filter bar */}
      <div className="ma-filterbar">
        <div className="ma-filter-item">
          <label>From</label>
          <input
            type="date"
            value={startDate}
            min={getMinDate()}
            max={getFromDateMax()}
            onChange={(e) => { setStartDate(e.target.value); setPreset('custom'); }}
            className="ma-date"
          />
        </div>
        <div className="ma-filter-item">
          <label>To</label>
          <input
            type="date"
            value={endDate}
            min={startDate || getMinDate()}
            max={getToDateMax()}
            onChange={(e) => { setEndDate(e.target.value); setPreset('custom'); }}
            className="ma-date"
          />
        </div>
        <button className="ma-filter-btn" onClick={handleFilter} disabled={fetching}>
          {fetching ? 'Loading…' : 'Filter'}
        </button>
        <select
          className="ma-preset"
          value={preset}
          onChange={(e) => handlePreset(e.target.value as RangePreset)}
        >
          {(['thisMonth', 'lastMonth', 'thisWeek', 'last7', 'custom'] as RangePreset[]).map(p => (
            <option key={p} value={p}>{presetLabels[p]}</option>
          ))}
        </select>
      </div>

      {/* Stat cards */}
      <div className="ma-stats">
        <div className="ma-stat">
          <span className="ma-stat-ic purple">🗓️</span>
          <div><div className="ma-stat-label">Total Days</div><div className="ma-stat-val">{display.total}</div></div>
        </div>
        <div className="ma-stat">
          <span className="ma-stat-ic green">✅</span>
          <div><div className="ma-stat-label">Present</div><div className="ma-stat-val">{display.present}</div><div className="ma-stat-sub good">{pct(display.present)}%</div></div>
        </div>
        <div className="ma-stat">
          <span className="ma-stat-ic red">⛔</span>
          <div><div className="ma-stat-label">Absent</div><div className="ma-stat-val">{display.absent}</div><div className="ma-stat-sub low">{pct(display.absent)}%</div></div>
        </div>
        <div className="ma-stat">
          <span className="ma-stat-ic amber">🕒</span>
          <div><div className="ma-stat-label">Leave</div><div className="ma-stat-val">{display.leave}</div><div className="ma-stat-sub avg">{pct(display.leave)}%</div></div>
        </div>
        <div className="ma-stat">
          <span className="ma-stat-ic blue">📊</span>
          <div><div className="ma-stat-label">Attendance %</div><div className="ma-stat-val">{display.percentage}%</div><div className={`ma-stat-sub ${ratingClass}`}>{rating}</div></div>
        </div>
      </div>

      {/* Attendance history */}
      <div className="ma-card">
        <h2 className="ma-card-title">Attendance History</h2>

        {totalRecords === 0 ? (
          <div className="ma-empty">
            <div className="ma-empty-ic">📭</div>
            <h3>No attendance records</h3>
            <p>No attendance records found for the selected dates.</p>
          </div>
        ) : (
          <>
            <div className="ma-table-wrap">
              <table className="ma-table">
                <thead>
                  <tr><th>Date</th><th>Day</th><th>Status</th><th>Remarks</th></tr>
                </thead>
                <tbody>
                  {pageRecords.map(record => {
                    const d = new Date(record.date);
                    return (
                      <tr key={record._id}>
                        <td data-label="Date">{d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td data-label="Day">{d.toLocaleDateString('en-US', { weekday: 'long' })}</td>
                        <td data-label="Status">
                          <span className={`ma-badge ${record.status}`}>{statusLabel(record.status)}</span>
                        </td>
                        <td data-label="Remarks" className="ma-remarks">{record.remarks || '–'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer / pagination */}
            <div className="ma-foot">
              <span className="ma-foot-info">
                Showing {pageStart + 1} to {Math.min(pageStart + perPage, totalRecords)} of {totalRecords} records
              </span>
              <div className="ma-pager">
                <button className="ma-pg" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>←</button>
                {pageNumbers().map((n, i) =>
                  n === '…'
                    ? <span key={`e${i}`} className="ma-pg-ellipsis">…</span>
                    : <button key={n} className={`ma-pg ${page === n ? 'active' : ''}`} onClick={() => setPage(n as number)}>{n}</button>
                )}
                <button className="ma-pg" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>→</button>
              </div>
              <select className="ma-perpage" value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}>
                {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n} per page</option>)}
              </select>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MyAttendancePage;
