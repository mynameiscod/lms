import React from 'react';

/**
 * Timeline rows for lead activities: icon, a human title, the text, when, and a status chip
 * (call outcome, the stage moved to, the meeting result). Recordings play inline.
 */
const fmt = (d: string) => {
  const date = new Date(d); const now = new Date();
  const time = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const iso = (x: Date) => new Date(x.getTime() + 330 * 60_000).toISOString().slice(0, 10);
  if (iso(date) === iso(now)) return `Today, ${time}`;
  if (iso(date) === iso(new Date(now.getTime() - 86_400_000))) return `Yesterday, ${time}`;
  if (iso(date) === iso(new Date(now.getTime() + 86_400_000))) return `Tomorrow, ${time}`;
  return `${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${time}`;
};

const tone = (text: string) => {
  const t = text.toLowerCase();
  if (/lost|wrong|invalid|declin|not interested|no.?show|cancel/.test(t)) return 'bad';
  if (/answer|connect|qualif|attend|enrol|convert|paid|reserved/.test(t) && !/no answer|not answered|not connected/.test(t)) return 'good';
  if (/no answer|not answered|busy|switched|not connected|callback|pending|need time/.test(t)) return 'warn';
  return 'info';
};

export interface TimelineRow { key: string; icon: string; title: string; text?: string; at: string; chip?: string; by?: string; recordingUrl?: string }

export function toRows(activities: any[], outcomeLabel: (code: string) => string): TimelineRow[] {
  return [...(activities || [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((a, i) => {
      const by = a.createdBy ? `${a.createdBy.firstName || ''} ${a.createdBy.lastName || ''}`.trim() || a.createdBy.name : '';
      const base = { key: a._id || String(i), at: a.createdAt, by, recordingUrl: a.recordingUrl };
      const md = a.metadata || {};
      switch (a.type) {
        case 'call': {
          const label = a.callOutcome ? outcomeLabel(a.callOutcome) : md.dialed ? 'Started' : '';
          return { ...base, icon: 'bi-telephone', title: label ? `Call – ${label}` : 'Call', text: a.description, chip: label || undefined };
        }
        case 'status_change': {
          // System marker written by the WhatsApp drip ("drip_entry:<stage>:<date>").
          const drip = /^drip_entry:([^:]+):/.exec(a.description || '');
          if (drip) return { ...base, by: '', icon: 'bi-whatsapp', title: 'WhatsApp drip started', text: `Messages for the “${drip[1]}” stage` };
          const to = md.to && typeof md.to === 'string' ? md.to : '';
          const detail = [md.subStage, md.reason, md.reasonDetail].filter(Boolean).join(' · ');
          return { ...base, icon: 'bi-signpost-split', title: to ? `Moved to ${to}` : 'Status changed', text: detail || a.description, chip: to || undefined };
        }
        case 'meeting': {
          const st = md.status ? String(md.status).replace('completed', 'attended').replace('_', '-') : '';
          return { ...base, icon: 'bi-camera-video', title: a.description?.split('.')[0] || 'Meeting', text: a.description?.split('.').slice(1).join('.').trim(), chip: st ? st[0].toUpperCase() + st.slice(1) : undefined };
        }
        case 'whatsapp': return { ...base, icon: 'bi-whatsapp', title: 'WhatsApp', text: a.description };
        case 'email': return { ...base, icon: 'bi-envelope', title: 'Email', text: a.description };
        case 'assignment': return { ...base, icon: 'bi-person-check', title: 'Owner changed', text: a.description };
        case 'created': return { ...base, icon: 'bi-megaphone', title: 'Lead Created', text: a.description, chip: 'New Lead' };
        case 'content_shared': return { ...base, icon: 'bi-share', title: 'Content shared', text: a.description };
        default: return { ...base, icon: 'bi-sticky', title: 'Note', text: a.description };
      }
    });
}

const LeadTimeline: React.FC<{ rows: TimelineRow[]; empty?: string }> = ({ rows, empty = 'Nothing here yet.' }) => {
  if (!rows.length) return <p className="ldv-empty">{empty}</p>;
  return (
    <ul className="ldv-timeline">
      {rows.map(r => (
        <li key={r.key}>
          <span className="ldv-tl-icon" aria-hidden="true"><i className={`bi ${r.icon}`} /></span>
          <div className="ldv-tl-body">
            <div className="ldv-tl-head">
              <strong>{r.title}</strong>
              <span className="ldv-tl-time">{fmt(r.at)}</span>
            </div>
            <div className="ldv-tl-sub">
              <span className="ldv-tl-text">{r.text}{r.by ? <span className="ldv-tl-by"> — {r.by}</span> : null}</span>
              {r.chip && <span className={`ldv-chip ${tone(r.chip)}`}>{r.chip}</span>}
            </div>
            {r.recordingUrl && <audio className="ldv-audio" controls preload="none" src={r.recordingUrl}>Recording</audio>}
          </div>
        </li>
      ))}
    </ul>
  );
};

export default LeadTimeline;
