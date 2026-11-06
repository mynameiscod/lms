import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { leadApi } from '../../api';
import StageChangeDialog from '../../components/leads/StageChangeDialog';
import './FollowUpQueue.css';

/**
 * Follow-up queue — what each counsellor should do next. Tabs read GET /leads/queue (scoped to
 * the user's own leads unless they can see the team). Closed leads (lost / enrolled) are left
 * out of every tab except Nurture.
 */
type Tab = 'today' | 'overdue' | 'upcoming' | 'unassigned' | 'nurture';
const TABS: { key: Tab; label: string; hint: string }[] = [
  { key: 'today', label: 'Due today', hint: 'Follow-ups scheduled for today.' },
  { key: 'overdue', label: 'Overdue', hint: 'Follow-up date has passed. Oldest first.' },
  { key: 'upcoming', label: 'Upcoming', hint: 'Follow-ups after today.' },
  { key: 'unassigned', label: 'Unassigned', hint: 'Open leads nobody owns yet. Oldest first.' },
  { key: 'nurture', label: 'Nurture reactivation', hint: 'Nurture leads due back within 7 days.' },
];

interface QLead {
  _id: string; name: string; phone: string; courseInterest?: string[]; source?: string; priority?: string;
  stageId?: { _id: string; name: string; color?: string }; subStageId?: { _id: string; name: string } | null;
  assignedTo?: { firstName?: string; lastName?: string } | null;
  nextFollowUp?: string; lastContactedAt?: string; lastCallOutcome?: string; nurture?: { reactivateAt?: string }; createdAt: string;
}

const fmt = (d?: string) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');
const ago = (d?: string) => {
  if (!d) return 'never';
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60); if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

const FollowUpQueue: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('today');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ leads: QLead[]; total: number; totalPages: number }>({ leads: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [dialog, setDialog] = useState<QLead | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res: any = await leadApi.getQueue(tab, page);
      setData(res.data || { leads: [], total: 0, totalPages: 1 });
    } catch (e: any) {
      setError(e.message || 'Could not load the queue');
    } finally { setLoading(false); }
  }, [tab, page]);
  useEffect(() => { load(); }, [load]);

  const when = (l: QLead) => (tab === 'nurture' ? l.nurture?.reactivateAt : l.nextFollowUp);
  const overdue = (l: QLead) => { const w = when(l); return !!w && new Date(w).getTime() < Date.now(); };

  return (
    <div className="fq-page">
      <header className="fq-header">
        <div>
          <h1>Follow-up queue</h1>
          <p>Who to call next. Open a lead to work it, or move it on from here.</p>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={load} disabled={loading}>Refresh</button>
      </header>

      <ul className="nav nav-tabs fq-tabs" role="tablist">
        {TABS.map(t => (
          <li className="nav-item" key={t.key}>
            <button role="tab" aria-selected={tab === t.key} className={`nav-link${tab === t.key ? ' active' : ''}`} onClick={() => { setTab(t.key); setPage(1); }}>{t.label}</button>
          </li>
        ))}
      </ul>
      <p className="fq-hint">{TABS.find(t => t.key === tab)?.hint} {!loading && <strong>{data.total} lead{data.total === 1 ? '' : 's'}</strong>}</p>

      {toast && <div className="alert alert-success py-2">{toast}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      {loading ? <div className="fq-empty">Loading…</div> : data.leads.length === 0 ? (
        <div className="fq-empty">Nothing here. 🎉</div>
      ) : (
        <div className="fq-table-wrap">
          <table className="table table-hover align-middle fq-table">
            <thead>
              <tr>
                <th>Lead</th><th>Stage</th><th>{tab === 'nurture' ? 'Reactivate' : 'Follow-up'}</th>
                <th>Last contact</th><th>Owner</th><th aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              {data.leads.map(l => (
                <tr key={l._id}>
                  <td>
                    <button type="button" className="btn btn-link p-0 fw-semibold text-start" onClick={() => navigate(`/leads/${l._id}`)}>{l.name}</button>
                    <div className="small text-muted">{l.phone}{l.courseInterest?.length ? ` · ${l.courseInterest.join(', ')}` : ''}</div>
                  </td>
                  <td>
                    <span className="fq-stage" style={{ borderColor: l.stageId?.color || '#cbd5e1' }}>{l.stageId?.name || '—'}</span>
                    {l.subStageId?.name && <div className="small text-muted">{l.subStageId.name}</div>}
                  </td>
                  <td className={overdue(l) ? 'text-danger fw-semibold' : ''}>{fmt(when(l))}</td>
                  <td className="small">{ago(l.lastContactedAt)}{l.lastCallOutcome ? <div className="text-muted text-capitalize">{l.lastCallOutcome.replace(/_/g, ' ')}</div> : null}</td>
                  <td className="small">{l.assignedTo ? `${l.assignedTo.firstName || ''} ${l.assignedTo.lastName || ''}`.trim() : <span className="text-muted">Unassigned</span>}</td>
                  <td className="text-end text-nowrap">
                    <a className="btn btn-outline-success btn-sm me-1" href={`tel:${l.phone}`} onClick={() => leadApi.logCallClick?.(l._id)?.catch?.(() => {})}>Call</a>
                    <button className="btn btn-outline-primary btn-sm" onClick={() => setDialog(l)}>Move</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.totalPages > 1 && (
        <div className="d-flex justify-content-center align-items-center gap-2 mt-2">
          <button className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span className="small">Page {page} of {data.totalPages}</span>
          <button className="btn btn-outline-secondary btn-sm" disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}

      <StageChangeDialog
        open={!!dialog}
        onClose={() => setDialog(null)}
        leadIds={dialog ? [dialog._id] : []}
        currentStageId={dialog?.stageId?._id}
        currentSubStageId={dialog?.subStageId?._id || null}
        onDone={(_o, msg) => { setToast(msg); window.setTimeout(() => setToast(''), 3500); load(); }}
      />
    </div>
  );
};

export default FollowUpQueue;
