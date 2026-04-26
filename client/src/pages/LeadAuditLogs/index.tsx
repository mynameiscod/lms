import React, { useState, useEffect, useCallback } from 'react';
import { leadApi } from '../../api';
import './LeadAuditLogs.css';

interface AuditLog {
  _id: string;
  userId: { firstName: string; lastName: string; email: string } | null;
  action: string;
  targetId?: string;
  details: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: '#38a169',
  UPDATE: '#3182ce',
  DELETE: '#e53e3e',
  ASSIGN: '#d69e2e',
  STAGE_CHANGE: '#805ad5',
  CONVERT: '#319795',
  EXPORT: '#718096',
  IMPORT: '#dd6b20',
  VIEW: '#a0aec0',
};

const LeadAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [leadIdFilter, setLeadIdFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const filters: any = { page, limit: 50 };
      if (leadIdFilter.trim()) filters.leadId = leadIdFilter.trim();
      const res = await leadApi.getAuditLogs(filters);
      const data = res?.data || res;
      setLogs(data?.logs || []);
      setTotalPages(data?.totalPages || 1);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, leadIdFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="audit-page">
      <h2>Lead Audit Logs</h2>

      <div className="audit-filters">
        <input
          type="text"
          placeholder="Filter by Lead ID..."
          value={leadIdFilter}
          onChange={e => { setLeadIdFilter(e.target.value); setPage(1); }}
          className="audit-filter-input"
        />
      </div>

      {loading ? (
        <div className="audit-loading">Loading audit logs...</div>
      ) : logs.length === 0 ? (
        <div className="audit-empty">No audit logs found</div>
      ) : (
        <div className="audit-table-wrap">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Details</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log._id}>
                  <td className="audit-time">{new Date(log.createdAt).toLocaleString()}</td>
                  <td>{log.userId ? `${log.userId.firstName} ${log.userId.lastName}` : 'System'}</td>
                  <td>
                    <span className="audit-action-badge" style={{ backgroundColor: ACTION_COLORS[log.action] || '#718096' }}>
                      {log.action}
                    </span>
                  </td>
                  <td className="audit-details">{log.details}</td>
                  <td className="audit-ip">{log.ipAddress || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="audit-pagination">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
};

export default LeadAuditLogsPage;
