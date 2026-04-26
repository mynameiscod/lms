import React, { useState, useEffect, useCallback } from 'react';
import { leadApi } from '../../api';

interface DupLead {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  source?: string;
  createdAt: string;
  stageId?: { _id: string; name: string } | string;
}

interface DupGroup {
  _id: string; // last 10 digits
  count: number;
  leads: DupLead[];
}

export default function LeadDuplicatesPage() {
  const [groups, setGroups] = useState<DupGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState<string | null>(null); // group _id being merged
  const [primaryIds, setPrimaryIds] = useState<Record<string, string>>({}); // groupKey -> selected primary _id
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await leadApi.getDuplicateLeads();
      const data = res?.data || res;
      const arr: DupGroup[] = Array.isArray(data) ? data : [];
      setGroups(arr);
      // Default primary = first lead in each group (oldest)
      const defaults: Record<string, string> = {};
      arr.forEach(g => {
        const sorted = [...g.leads].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        if (sorted[0]) defaults[g._id] = sorted[0]._id;
      });
      setPrimaryIds(defaults);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMerge = async (group: DupGroup) => {
    const primaryId = primaryIds[group._id];
    if (!primaryId) return;
    const dupeIds = group.leads.filter(l => l._id !== primaryId).map(l => l._id);
    if (dupeIds.length === 0) return;

    setMerging(group._id);
    setErrorMsg('');
    try {
      await leadApi.mergeDuplicateLeads(primaryId, dupeIds);
      setSuccessMsg(`Merged ${dupeIds.length} duplicate(s) into primary lead.`);
      await load();
    } catch (e: any) {
      setErrorMsg(e?.message || 'Merge failed');
    } finally {
      setMerging(null);
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div>
          <h4 className="mb-0 fw-bold">
            <i className="fas fa-copy me-2 text-danger" />
            Duplicate Lead Detector
          </h4>
          <small className="text-muted">Leads with the same last 10 digits of phone number</small>
        </div>
        <div className="ms-auto">
          <button className="btn btn-outline-secondary btn-sm" onClick={load} disabled={loading}>
            <i className="fas fa-sync-alt me-1" />
            Refresh
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="alert alert-success alert-dismissible">
          <i className="fas fa-check-circle me-2" />{successMsg}
          <button className="btn-close" onClick={() => setSuccessMsg('')} />
        </div>
      )}
      {errorMsg && (
        <div className="alert alert-danger alert-dismissible">
          <i className="fas fa-exclamation-circle me-2" />{errorMsg}
          <button className="btn-close" onClick={() => setErrorMsg('')} />
        </div>
      )}

      {loading && (
        <div className="text-center py-5 text-muted">
          <div className="spinner-border mb-3" />
          <div>Scanning for duplicates…</div>
        </div>
      )}

      {!loading && groups.length === 0 && (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <i className="fas fa-shield-alt fa-3x text-success mb-3 d-block" />
            <h5>No duplicates found</h5>
            <p className="text-muted mb-0">All leads have unique phone numbers.</p>
          </div>
        </div>
      )}

      {!loading && groups.map(group => (
        <div key={group._id} className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white d-flex align-items-center border-bottom py-3">
            <div>
              <span className="fw-bold text-danger me-2">
                <i className="fas fa-exclamation-triangle me-1" />
                {group.count} duplicates
              </span>
              <span className="text-muted small">Phone suffix: …{group._id}</span>
            </div>
            <div className="ms-auto">
              <button
                className="btn btn-sm btn-danger"
                onClick={() => handleMerge(group)}
                disabled={merging === group._id}
              >
                {merging === group._id
                  ? <><span className="spinner-border spinner-border-sm me-1" />Merging…</>
                  : <><i className="fas fa-code-branch me-1" />Merge Duplicates</>
                }
              </button>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 48 }}>Primary</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Source</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {group.leads.map(lead => {
                  const isPrimary = primaryIds[group._id] === lead._id;
                  return (
                    <tr key={lead._id} style={{ background: isPrimary ? '#e8f5e9' : undefined }}>
                      <td className="text-center">
                        <input
                          type="radio"
                          name={`primary-${group._id}`}
                          checked={isPrimary}
                          onChange={() => setPrimaryIds(p => ({ ...p, [group._id]: lead._id }))}
                          title="Set as primary"
                        />
                      </td>
                      <td>
                        <span className={`fw-semibold${isPrimary ? ' text-success' : ''}`}>
                          {lead.name}
                          {isPrimary && <span className="badge bg-success ms-2 small">Primary</span>}
                        </span>
                      </td>
                      <td>{lead.phone}</td>
                      <td>{lead.email || <span className="text-muted">—</span>}</td>
                      <td>
                        <span className="badge bg-secondary">{lead.source || '—'}</span>
                      </td>
                      <td className="text-muted small">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="card-footer bg-light text-muted small py-2">
            <i className="fas fa-info-circle me-1" />
            Select the <strong>Primary</strong> record to keep. All activities from other records will be merged into it, and duplicates will be deleted.
          </div>
        </div>
      ))}
    </div>
  );
}
