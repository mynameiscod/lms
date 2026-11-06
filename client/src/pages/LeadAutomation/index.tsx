import React, { useEffect, useState } from 'react';
import { leadAutomationApi } from '../../api';

/**
 * CRM automation rules (server: services/leadAutomationService.ts). Every rule is off until
 * switched on here. Rules create follow-up tasks and reminders only — they never move a lead's
 * stage and never mark a lead lost.
 */
type Rules = Record<string, Record<string, any>>;
const RULES: { key: string; title: string; what: string; field?: { name: string; label: string; min: number; max: number; unit: string } }[] = [
  { key: 'firstContactSla', title: 'First-contact SLA', what: 'If nobody has contacted a new lead within this time, create an urgent “First contact overdue” task for its owner.', field: { name: 'minutes', label: 'Contact within', min: 5, max: 1440, unit: 'minutes' } },
  { key: 'callRetry', title: 'Retry unanswered calls', what: 'After an unanswered call, schedule the next try using “Retry after” from your call-outcome list. Stops after this many misses in a row and leaves a note for a person to decide.', field: { name: 'maxAttempts', label: 'Stop after', min: 1, max: 20, unit: 'unanswered calls' } },
  { key: 'overdueReminder', title: 'Overdue follow-up reminder', what: 'Pop up a reminder for follow-ups still open this long after they were due.', field: { name: 'hours', label: 'Remind after', min: 1, max: 168, unit: 'hours overdue' } },
  { key: 'demoReminder', title: 'Demo reminder', what: 'Remind the team before a scheduled demo or campus visit.', field: { name: 'hoursBefore', label: 'Remind', min: 1, max: 48, unit: 'hours before' } },
  { key: 'noShowFollowUp', title: 'Demo no-show follow-up', what: 'When a demo is marked no-show, create a high-priority task to call and rebook.', field: { name: 'hoursAfter', label: 'Call back', min: 1, max: 168, unit: 'hours later' } },
  { key: 'seatReservedFollowUp', title: 'Seat reserved follow-up', what: 'When a lead has sat in a “Seat reserved” stage this long, create a task to complete the admission.', field: { name: 'days', label: 'After', min: 1, max: 30, unit: 'days' } },
  { key: 'nurtureReactivation', title: 'Nurture reactivation', what: 'When a nurture lead’s reactivation date arrives, create a task for its owner to reconnect.' },
];

const LeadAutomation: React.FC = () => {
  const [rules, setRules] = useState<Rules | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  useEffect(() => {
    leadAutomationApi.get().then((r: any) => setRules(r.data)).catch((e: any) => setMsg({ type: 'danger', text: e.message || 'Could not load rules' }));
  }, []);

  const set = (rule: string, field: string, value: any) => setRules(r => (r ? { ...r, [rule]: { ...r[rule], [field]: value } } : r));
  const save = async () => {
    if (!rules) return;
    setSaving(true); setMsg(null);
    try {
      const r: any = await leadAutomationApi.save(rules);
      setRules(r.data); setMsg({ type: 'success', text: 'Saved. Rules run every 5 minutes.' });
    } catch (e: any) { setMsg({ type: 'danger', text: e.message || 'Could not save' }); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>CRM automation</h1>
      <p className="text-muted" style={{ fontSize: '0.9rem' }}>
        Rules that create follow-up tasks and reminders for counsellors. They never change a lead’s stage and never mark a lead lost.
        Tasks appear in the Follow-up queue. Lead assignment and duplicate detection have their own settings (Lead distribution, Lead sources).
      </p>
      {msg && <div className={`alert alert-${msg.type} py-2`}>{msg.text}</div>}
      {!rules ? <div className="text-muted p-4">Loading…</div> : (
        <>
          <div className="list-group mb-3">
            {RULES.map(r => (
              <div key={r.key} className="list-group-item py-3">
                <div className="form-check form-switch d-flex align-items-start gap-2 ps-0">
                  <input className="form-check-input ms-0 mt-1" type="checkbox" role="switch" id={`rule-${r.key}`}
                    checked={!!rules[r.key]?.enabled} onChange={e => set(r.key, 'enabled', e.target.checked)} />
                  <label className="form-check-label" htmlFor={`rule-${r.key}`}>
                    <span className="fw-semibold d-block">{r.title}</span>
                    <span className="small text-muted d-block">{r.what}</span>
                  </label>
                </div>
                {r.field && (
                  <div className="d-flex align-items-center gap-2 mt-2 ms-4 small">
                    <span>{r.field.label}</span>
                    <input type="number" className="form-control form-control-sm" style={{ width: 90 }} min={r.field.min} max={r.field.max}
                      value={rules[r.key]?.[r.field.name] ?? ''} disabled={!rules[r.key]?.enabled}
                      onChange={e => set(r.key, r.field!.name, Number(e.target.value))} aria-label={`${r.title}: ${r.field.label}`} />
                    <span className="text-muted">{r.field.unit}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save rules'}</button>
        </>
      )}
    </div>
  );
};

export default LeadAutomation;
