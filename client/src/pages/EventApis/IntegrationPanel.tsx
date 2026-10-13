import React from 'react';
import { EvEvent, EvLibraryField, publicBase } from '../../api/eventApisApi';
import { CopyField, Modal } from './shared';

/**
 * What to hand the website team for one event: the address, what GET returns, what POST takes,
 * and a working fetch() example built from this event's own fields.
 */
const sampleValue = (f: EvLibraryField): any => {
  switch (f.type) {
    case 'phone': return '9876543210';
    case 'email': return 'ravi@example.com';
    case 'number': return 3;
    case 'date': return '2026-11-30';
    case 'select': return f.options?.[0] || '';
    case 'multiselect': return f.options?.slice(0, 1) || [];
    case 'checkbox': return true;
    case 'url': return 'https://example.com';
    default: return f.key.includes('name') ? 'Ravi Kumar' : 'Sample text';
  }
};

const IntegrationPanel: React.FC<{ event: EvEvent; library: EvLibraryField[]; tenantSlug: string; onClose: () => void }> = ({ event, library, tenantSlug, onClose }) => {
  const url = `${publicBase()}/${tenantSlug}/${event.apiName}`;
  const listUrl = `${publicBase()}/${tenantSlug}`;
  const byKey = new Map(library.map((f) => [f.key, f]));
  const fields = event.fields.filter((p) => !p.hidden && byKey.has(p.key)).map((p) => ({ ...byKey.get(p.key)!, label: p.label || byKey.get(p.key)!.label, required: p.required }));
  const body = Object.fromEntries(fields.map((f) => [f.key, sampleValue(f)]));
  const fetchCode = `// 1. Read the fields and draw the form from them
const form = await fetch('${url}').then(r => r.json());
// form.data.event.status → "open" | "closed" | "not_yet_open" | "paused"
// form.data.fields      → [{ key, label, type, required, options? }, …]

// 2. Send the registration (add the hidden "_hp" field to your form and send it as typed)
const res = await fetch('${url}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(${JSON.stringify({ ...body, utm_source: 'instagram', _hp: '' }, null, 2).replace(/\n/g, '\n  ')}),
});
const out = await res.json();
// 201 → out.data.message      400 → out.errors = { fieldKey: "message", … }
// 403 → closed / not open / paused      409 → already registered      429 → too many attempts`;

  return (
    <Modal title={`Integrate: ${event.eventName}`} onClose={onClose}>
      <p className="ev-sub" style={{ marginBottom: 12 }}>Give this to the website team. The website reads the fields from the first address, so changes you make here appear on the website within a minute.</p>
      <label className="ev-label">This event's API</label>
      <CopyField value={url} label="Event API address" />
      <div className="ev-hint">GET returns the event and its fields. POST sends a registration (JSON). No login or key is needed.</div>
      <label className="ev-label" style={{ marginTop: 12 }}>All open events (for an events listing page)</label>
      <CopyField value={listUrl} label="Event list address" />

      <label className="ev-label" style={{ marginTop: 14 }}>Fields this event asks</label>
      <div className="ev-table-wrap">
        <table className="ev-table">
          <thead><tr><th>Key</th><th>Label</th><th>Type</th><th>Required</th><th>Options</th></tr></thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.key}>
                <td className="ev-mono">{f.key}</td><td>{f.label}</td><td>{f.type}</td><td>{f.required ? 'Yes' : 'No'}</td>
                <td>{f.options?.join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <label className="ev-label" style={{ marginTop: 14 }}>Example</label>
      <pre className="ev-code">{fetchCode}</pre>
      <div className="ev-row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
        <button className="ev-btn" onClick={() => { navigator.clipboard?.writeText(fetchCode).catch(() => {}); }}>Copy example</button>
        <button className="ev-btn ev-btn-primary" onClick={onClose}>Done</button>
      </div>
    </Modal>
  );
};

export default IntegrationPanel;
