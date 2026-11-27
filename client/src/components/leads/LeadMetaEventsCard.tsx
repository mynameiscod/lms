import React, { useEffect, useState } from 'react';
import { metaCrmApi } from '../../api';

/**
 * Which milestone events this lead sent to Meta (server: MetaCrmEvent). Hidden when there are
 * none, or when the viewer may not see Meta sync (the API refuses and the card stays empty).
 */
interface Ev { _id: string; milestone: string; eventName: string; status: string; eventTime: string; sentAt?: string; lastError?: string; mode?: string }
const BADGE: Record<string, string> = {
  sent: 'bg-success-subtle text-success-emphasis', pending: 'bg-primary-subtle text-primary-emphasis',
  failed: 'bg-danger-subtle text-danger-emphasis', skipped: 'bg-secondary-subtle text-secondary-emphasis',
};

const LeadMetaEventsCard: React.FC<{ leadId: string; version?: string }> = ({ leadId, version }) => {
  const [events, setEvents] = useState<Ev[]>([]);
  useEffect(() => {
    metaCrmApi.leadEvents(leadId).then((r: any) => setEvents(r.data || [])).catch(() => setEvents([]));
  }, [leadId, version]);
  if (!events.length) return null;
  return (
    <div className="ld2-card">
      <h4>Meta sync</h4>
      {events.map(e => (
        <div key={e._id} className="d-flex justify-content-between align-items-start gap-2 small mb-1">
          <div>
            <div className="fw-semibold">{e.eventName}</div>
            <div className="text-muted">{new Date(e.sentAt || e.eventTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}{e.mode === 'test' ? ' · test' : ''}</div>
            {e.lastError && e.status !== 'sent' && <div className="text-muted">{e.lastError}</div>}
          </div>
          <span className={`badge ${BADGE[e.status] || 'bg-light text-dark'}`}>{e.status}</span>
        </div>
      ))}
    </div>
  );
};

export default LeadMetaEventsCard;
