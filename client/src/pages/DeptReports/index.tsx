import React, { useEffect, useState } from 'react';
import { departmentReportApi } from '../../api';
import './DeptReportsPage.css';

interface DeptRow {
  _id: string;
  name: string;
  code: string;
  totalStudents: number;
  placedStudents: number;
  activeBatches: number;
}

const DeptReportsPage: React.FC = () => {
  const [rows, setRows]       = useState<DeptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    departmentReportApi.getReport()
      .then(r => setRows(r.data || []))
      .catch(e => setError(e.message || 'Failed to load report'))
      .finally(() => setLoading(false));
  }, []);

  const total = rows.reduce((s, r) => ({ students: s.students + r.totalStudents, placed: s.placed + r.placedStudents, batches: s.batches + r.activeBatches }), { students: 0, placed: 0, batches: 0 });
  const overallRate = total.students ? Math.round((total.placed / total.students) * 100) : 0;

  const downloadCSV = () => {
    const header = 'Department,Code,Students,Placed,Placement %,Active Batches\n';
    const lines  = rows.map(r => {
      const pct = r.totalStudents ? ((r.placedStudents / r.totalStudents) * 100).toFixed(1) : '0.0';
      return `"${r.name}","${r.code}",${r.totalStudents},${r.placedStudents},${pct}%,${r.activeBatches}`;
    }).join('\n');
    const blob = new Blob([header + lines], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `dept-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="dr-page container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0">Department Reports</h2>
          <p className="text-muted small mb-0">Placement &amp; membership statistics per department</p>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={downloadCSV} disabled={rows.length === 0}>
          <i className="bi bi-download me-1" />Export CSV
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Summary cards */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Departments',    value: rows.length,          icon: 'building-columns', color: 'primary' },
          { label: 'Total Students', value: total.students,       icon: 'people-fill',       color: 'info'    },
          { label: 'Placed',         value: total.placed,         icon: 'briefcase-fill',    color: 'success' },
          { label: 'Placement Rate', value: `${overallRate}%`,    icon: 'graph-up-arrow',    color: 'warning' },
        ].map(card => (
          <div key={card.label} className="col-6 col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body d-flex gap-3 align-items-center">
                <div className={`dr-icon bg-${card.color} bg-opacity-10 text-${card.color}`}>
                  <i className={`bi bi-${card.icon}`} />
                </div>
                <div>
                  <div className="fs-4 fw-bold">{card.value}</div>
                  <div className="text-muted small">{card.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : rows.length === 0 ? (
        <div className="text-center text-muted py-5">No department data found. Create departments and assign memberships first.</div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Department</th>
                  <th>Code</th>
                  <th className="text-end">Students</th>
                  <th className="text-end">Placed</th>
                  <th style={{ width: 180 }}>Placement Rate</th>
                  <th className="text-end">Active Batches</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const pct = r.totalStudents ? Math.round((r.placedStudents / r.totalStudents) * 100) : 0;
                  return (
                    <tr key={r._id}>
                      <td className="fw-semibold">{r.name}</td>
                      <td><span className="badge text-bg-light border fw-normal">{r.code}</span></td>
                      <td className="text-end">{r.totalStudents}</td>
                      <td className="text-end text-success fw-semibold">{r.placedStudents}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="progress flex-grow-1" style={{ height: 8 }}>
                            <div
                              className={`progress-bar ${pct >= 70 ? 'bg-success' : pct >= 40 ? 'bg-warning' : 'bg-danger'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="small fw-medium" style={{ width: 36 }}>{pct}%</span>
                        </div>
                      </td>
                      <td className="text-end">{r.activeBatches}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="table-light fw-semibold">
                <tr>
                  <td colSpan={2}>Totals</td>
                  <td className="text-end">{total.students}</td>
                  <td className="text-end text-success">{total.placed}</td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <div className="progress flex-grow-1" style={{ height: 8 }}>
                        <div className="progress-bar bg-primary" style={{ width: `${overallRate}%` }} />
                      </div>
                      <span className="small fw-medium" style={{ width: 36 }}>{overallRate}%</span>
                    </div>
                  </td>
                  <td className="text-end">{total.batches}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeptReportsPage;
