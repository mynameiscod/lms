import React, { useState, useRef } from 'react';
import { placementDriveApi } from '../../api';

interface BulkRow { email?: string; rollNumber?: string; status: string; }
type PreviewRow = BulkRow & { _raw: string; _error?: string };

const VALID_STATUSES = ['applied', 'shortlisted', 'selected', 'rejected', 'placed'];

function parseCSV(text: string): PreviewRow[] {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (!lines.length) return [];

  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const emailIdx     = header.indexOf('email');
  const rollIdx      = header.indexOf('rollnumber');
  const statusIdx    = header.indexOf('status');

  if (statusIdx === -1) return [];

  return lines.slice(1).map((line, i) => {
    const cols = line.split(',').map(c => c.trim());
    const email      = emailIdx  >= 0 ? cols[emailIdx]  : undefined;
    const rollNumber = rollIdx   >= 0 ? cols[rollIdx]   : undefined;
    const status     = cols[statusIdx] || '';
    const error      = !VALID_STATUSES.includes(status.toLowerCase())
      ? `Invalid status "${status}"`
      : !email && !rollNumber
        ? 'Needs email or rollNumber'
        : undefined;
    return {
      email: email || undefined,
      rollNumber: rollNumber || undefined,
      status: status.toLowerCase(),
      _raw: `Row ${i + 2}`,
      _error: error
    };
  });
}

interface Props { driveId: string; onDone: () => void; }

const BulkStatusImport: React.FC<Props> = ({ driveId, onDone }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows]       = useState<PreviewRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult]   = useState<{ updated: number; errors: string[] } | null>(null);
  const [err, setErr]         = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (!parsed.length) {
        setErr('No valid rows found. Ensure CSV has columns: email or rollNumber, status');
      } else {
        setErr('');
        setRows(parsed);
        setResult(null);
      }
    };
    reader.readAsText(file);
  };

  const validRows  = rows.filter(r => !r._error);
  const errorRows  = rows.filter(r =>  r._error);

  const handleImport = async () => {
    if (!validRows.length) return;
    try {
      setImporting(true);
      setErr('');
      const updates = validRows.map(({ email, rollNumber, status }) => ({ email, rollNumber, status }));
      const res = await placementDriveApi.bulkStatusImport(driveId, updates);
      if (res.success) {
        setResult(res.data);
        setRows([]);
        if (fileRef.current) fileRef.current.value = '';
      } else {
        setErr('Import failed');
      }
    } catch (e: any) {
      setErr(e.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bsi-panel">
      <p className="text-muted small mb-2">
        Upload a CSV with columns <code>email</code> (or <code>rollNumber</code>) and <code>status</code>.
        Valid statuses: {VALID_STATUSES.join(', ')}.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="form-control form-control-sm mb-2"
        onChange={handleFile}
      />

      {err && <div className="alert alert-danger py-1 small">{err}</div>}

      {result && (
        <div className="alert alert-success py-1 small">
          ✅ Updated <strong>{result.updated}</strong> applicant(s).
          {result.errors.length > 0 && (
            <ul className="mb-0 mt-1">
              {result.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
          <button className="btn btn-sm btn-outline-secondary ms-2" onClick={onDone}>Close</button>
        </div>
      )}

      {rows.length > 0 && !result && (
        <>
          <p className="small mb-1">
            <strong>{validRows.length}</strong> valid rows{errorRows.length > 0 && `, ${errorRows.length} with errors`}
          </p>
          <div style={{ maxHeight: 240, overflowY: 'auto' }} className="mb-2">
            <table className="table table-sm table-bordered mb-0" style={{ fontSize: '0.8rem' }}>
              <thead className="table-light">
                <tr>
                  <th>Row</th><th>Email / Roll</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={r._error ? 'table-warning' : ''}>
                    <td>{r._raw}</td>
                    <td>{r.email || r.rollNumber || '—'}</td>
                    <td><span className={`badge ${r._error ? 'bg-warning text-dark' : 'bg-secondary'}`}>{r.status || '—'}</span></td>
                    <td>{r._error && <small className="text-danger">{r._error}</small>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="d-flex gap-2">
            <button
              className="btn btn-sm btn-primary"
              disabled={importing || !validRows.length}
              onClick={handleImport}
            >
              {importing ? <><span className="spinner-border spinner-border-sm me-1" />Importing…</> : `Import ${validRows.length} rows`}
            </button>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => { setRows([]); setErr(''); if (fileRef.current) fileRef.current.value = ''; }}>
              Clear
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default BulkStatusImport;
