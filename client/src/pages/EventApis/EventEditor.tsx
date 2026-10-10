import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { eventApisApi, evError, EvCollection, EvEvent, EvFieldType, EvLibraryField } from '../../api/eventApisApi';
import IntegrationPanel from './IntegrationPanel';
import { toLocalInput } from './shared';
import './eventApis.css';

/**
 * Create or edit one event API: its collection (new, or one made here before), event name,
 * API name, dates, and the fields this event asks — picked from the collection's field library,
 * plus any new ones added on the spot.
 */

const TYPE_LABEL: Record<EvFieldType, string> = {
  text: 'Short text', textarea: 'Long text', email: 'Email', phone: 'Mobile number', number: 'Number',
  date: 'Date', select: 'Choose one', multiselect: 'Choose many', checkbox: 'Yes / No', url: 'Web link',
};

const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/g, '');
const keyFromLabel = (s: string) => {
  const k = s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
  return /^[a-z]/.test(k) ? k : (k ? `f_${k}`.slice(0, 40) : '');
};

/** One row of the field table: a library field, and this event's choices for it. */
interface Row extends EvLibraryField { use: boolean; required: boolean; eventLabel: string; isNew: boolean }

const STARTER: EvLibraryField[] = [
  { key: 'name', label: 'Full name', type: 'text' },
  { key: 'phone', label: 'Mobile number', type: 'phone' },
  { key: 'email', label: 'Email', type: 'email' },
];

const EventEditor: React.FC = () => {
  const { id } = useParams();
  const editing = !!id;
  const nav = useNavigate();

  const [collections, setCollections] = useState<EvCollection[]>([]);
  const [tenantSlug, setTenantSlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<{ event: EvEvent; library: EvLibraryField[] } | null>(null);

  const [colMode, setColMode] = useState<'existing' | 'new'>('existing');
  const [collectionId, setCollectionId] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [eventName, setEventName] = useState('');
  const [apiName, setApiName] = useState('');
  const [apiTouched, setApiTouched] = useState(false);
  const [opensAt, setOpensAt] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [description, setDescription] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [onePerPhone, setOnePerPhone] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [hasData, setHasData] = useState(false);

  const [nf, setNf] = useState<{ label: string; key: string; type: EvFieldType; options: string }>({ label: '', key: '', type: 'text', options: '' });

  /** Library rows for a collection, with an event's picks laid over them in the event's order. */
  const rowsFor = (library: EvLibraryField[], picks?: EvEvent['fields']): Row[] => {
    if (!picks) return library.map((f) => ({ ...f, use: false, required: false, eventLabel: '', isNew: false }));
    const byKey = new Map(library.map((f) => [f.key, f]));
    const picked: Row[] = picks.filter((p) => !p.hidden && byKey.has(p.key))
      .map((p) => ({ ...byKey.get(p.key)!, use: true, required: p.required, eventLabel: p.label || '', isNew: false }));
    const pickedKeys = new Set(picked.map((r) => r.key));
    return [...picked, ...library.filter((f) => !pickedKeys.has(f.key)).map((f) => ({ ...f, use: false, required: false, eventLabel: '', isNew: false }))];
  };

  useEffect(() => {
    (async () => {
      try {
        const [cols, meta] = await Promise.all([eventApisApi.collections(), eventApisApi.meta()]);
        setCollections(cols); setTenantSlug(meta.tenantSlug);
        if (editing) {
          const { event, collection } = await eventApisApi.event(id!);
          setCollectionId(String(event.collectionId)); setColMode('existing');
          setEventName(event.eventName); setApiName(event.apiName); setApiTouched(true);
          setOpensAt(toLocalInput(event.opensAt)); setClosesAt(toLocalInput(event.closesAt));
          setDescription(event.description || ''); setSuccessMessage(event.successMessage || ''); setOnePerPhone(event.onePerPhone);
          setRows(rowsFor(collection.fields, event.fields));
          setHasData(event.submissionCount > 0);
        } else if (cols.length) {
          setCollectionId(cols[0]._id); setRows(rowsFor(cols[0].fields));
        } else {
          setColMode('new');
          setRows(STARTER.map((f) => ({ ...f, use: true, required: f.key !== 'email', eventLabel: '', isNew: true })));
        }
      } catch (e) { setErr(evError(e, 'Could not load this page.')); }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const pickCollection = (cid: string) => {
    setCollectionId(cid);
    const c = collections.find((x) => x._id === cid);
    const extra = rows.filter((r) => r.isNew);
    setRows([...rowsFor(c?.fields || []), ...extra]);
  };
  const switchMode = (m: 'existing' | 'new') => {
    setColMode(m);
    if (m === 'new') setRows(STARTER.map((f) => ({ ...f, use: true, required: f.key !== 'email', eventLabel: '', isNew: true })));
    else pickCollection(collectionId || collections[0]?._id || '');
  };

  const onEventName = (v: string) => { setEventName(v); if (!apiTouched) setApiName(slugify(v)); };
  const update = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const move = (key: string, dir: -1 | 1) => setRows((rs) => {
    const i = rs.findIndex((r) => r.key === key);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= rs.length) return rs;
    const out = [...rs]; [out[i], out[j]] = [out[j], out[i]];
    return out;
  });

  const nfKey = nf.key || keyFromLabel(nf.label);
  const addField = () => {
    setErr('');
    if (!nf.label.trim()) { setErr('Give the new field a label.'); return; }
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(nfKey)) { setErr('The field key must start with a letter and use lowercase letters, numbers or _.'); return; }
    if (rows.some((r) => r.key === nfKey)) { setErr(`A field with the key "${nfKey}" is already in this collection. Tick it in the list instead.`); return; }
    const options = nf.options.split(',').map((o) => o.trim()).filter(Boolean);
    if ((nf.type === 'select' || nf.type === 'multiselect') && !options.length) { setErr('Add the options, separated by commas.'); return; }
    setRows((rs) => [...rs, {
      key: nfKey, label: nf.label.trim(), type: nf.type, ...(options.length ? { options } : {}),
      use: true, required: false, eventLabel: '', isNew: true,
    }]);
    setNf({ label: '', key: '', type: 'text', options: '' });
  };
  const removeNew = (key: string) => setRows((rs) => rs.filter((r) => r.key !== key));

  const used = useMemo(() => rows.filter((r) => r.use), [rows]);

  const save = async () => {
    setErr('');
    if (colMode === 'new' && !newCollectionName.trim()) { setErr('Name the new collection.'); return; }
    if (colMode === 'existing' && !collectionId) { setErr('Choose a collection.'); return; }
    if (!eventName.trim()) { setErr('Give the event a name.'); return; }
    if (!closesAt) { setErr('Set the closing date.'); return; }
    if (!used.length) { setErr('Tick at least one field for this event.'); return; }
    const body: any = {
      eventName: eventName.trim(), apiName: apiName.trim(),
      opensAt: opensAt ? new Date(opensAt).toISOString() : null,
      closesAt: new Date(closesAt).toISOString(),
      description, successMessage, onePerPhone,
      newFields: rows.filter((r) => r.isNew).map(({ key, label, type, options }) => ({ key, label, type, options })),
      fields: used.map((r) => ({ key: r.key, required: r.required, ...(r.eventLabel.trim() ? { label: r.eventLabel.trim() } : {}) })),
    };
    if (!editing) {
      if (colMode === 'existing') body.collectionId = collectionId; else body.newCollectionName = newCollectionName.trim();
    }
    setBusy(true);
    try {
      const ev = editing ? await eventApisApi.updateEvent(id!, body) : await eventApisApi.createEvent(body);
      const { event, collection } = await eventApisApi.event(ev._id);
      setSaved({ event, library: collection.fields });
    } catch (e) { setErr(evError(e, 'Could not save.')); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    setBusy(false);
  };

  if (loading) return <div className="ev-root"><p className="ev-sub">Loading…</p></div>;

  return (
    <div className="ev-root">
      <div className="ev-head">
        <div className="ev-grow">
          <h1>{editing ? 'Edit event API' : 'New event API'}</h1>
          <p className="ev-sub">The website reads this event's fields and sends registrations to its API. Registrations are kept in the collection you choose, never in LMS users or leads.</p>
        </div>
        <button className="ev-btn" onClick={() => nav('/event-apis')}><i className="fa-solid fa-arrow-left" /> Back</button>
      </div>

      {err && <div className="ev-alert ev-alert-bad" role="alert">{err}</div>}
      {hasData && <div className="ev-alert ev-alert-warn">This event already has registrations. Its API name and collection are fixed, and fields can be hidden but not removed.</div>}

      <section className="ev-card">
        <h2>Collection</h2>
        {!editing && (
          <div className="ev-choice" style={{ marginBottom: 10 }}>
            <label className={colMode === 'existing' ? 'on' : ''}>
              <input type="radio" name="colmode" checked={colMode === 'existing'} disabled={!collections.length} onChange={() => switchMode('existing')} /> Use an existing collection
            </label>
            <label className={colMode === 'new' ? 'on' : ''}>
              <input type="radio" name="colmode" checked={colMode === 'new'} onChange={() => switchMode('new')} /> Create a new collection
            </label>
          </div>
        )}
        {colMode === 'existing' ? (
          <select id="ev-collection" className="ev-select" value={collectionId} disabled={editing} onChange={(e) => pickCollection(e.target.value)} aria-label="Collection">
            {collections.map((c) => <option key={c._id} value={c._id}>{c.name} ({c.submissionCount || 0} registrations)</option>)}
          </select>
        ) : (
          <input id="ev-newcol" className="ev-input" placeholder="For example: Workshops 2026" value={newCollectionName} onChange={(e) => setNewCollectionName(e.target.value)} aria-label="New collection name" style={{ maxWidth: 420 }} />
        )}
        <div className="ev-hint">Only collections made on this page are listed. Several events can share one collection, and each event asks its own fields.</div>
      </section>

      <section className="ev-card">
        <h2>Event</h2>
        <div className="ev-grid2">
          <div className="ev-field">
            <label className="ev-label" htmlFor="ev-name">Event name</label>
            <input id="ev-name" className="ev-input" placeholder="Java Full Stack Workshop – Nov 2026" value={eventName} onChange={(e) => onEventName(e.target.value)} />
          </div>
          <div className="ev-field">
            <label className="ev-label" htmlFor="ev-api">API name</label>
            <input id="ev-api" className="ev-input ev-mono" value={apiName} disabled={hasData}
              onChange={(e) => { setApiTouched(true); setApiName(e.target.value.toLowerCase()); }} />
            <div className="ev-hint">The end of the website's address: …/{tenantSlug || 'institute'}/<b>{apiName || 'api-name'}</b>. Lowercase letters, numbers and dashes.</div>
          </div>
          <div className="ev-field">
            <label className="ev-label" htmlFor="ev-opens">Opens (optional)</label>
            <input id="ev-opens" type="datetime-local" className="ev-input" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} />
          </div>
          <div className="ev-field">
            <label className="ev-label" htmlFor="ev-closes">Closes</label>
            <input id="ev-closes" type="datetime-local" className="ev-input" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
            <div className="ev-hint">After this time the API refuses registrations and tells the website the event is closed.</div>
          </div>
        </div>
        <div className="ev-grid2" style={{ marginTop: 14 }}>
          <div className="ev-field">
            <label className="ev-label" htmlFor="ev-desc">Description (optional, sent to the website)</label>
            <textarea id="ev-desc" className="ev-textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="ev-field">
            <label className="ev-label" htmlFor="ev-success">Message after registering (optional)</label>
            <textarea id="ev-success" className="ev-textarea" placeholder="Thank you — your registration has been received." value={successMessage} onChange={(e) => setSuccessMessage(e.target.value)} />
          </div>
        </div>
        <label className="ev-row" style={{ marginTop: 12, cursor: 'pointer' }}>
          <input id="ev-oneper" type="checkbox" checked={onePerPhone} onChange={(e) => setOnePerPhone(e.target.checked)} />
          One registration per mobile number for this event
        </label>
      </section>

      <section className="ev-card">
        <h2>Fields for this event</h2>
        <p className="ev-sub" style={{ marginBottom: 10 }}>Tick the fields this event asks, set which are required, and order them with the arrows. A label typed here is used for this event only.</p>
        <div className="ev-table-wrap">
          <table className="ev-table ev-fields">
            <thead><tr><th>Ask</th><th>Field</th><th>Key</th><th>Type</th><th>Required</th><th>Label for this event</th><th>Order</th></tr></thead>
            <tbody>
              {!rows.length && <tr><td colSpan={7} className="ev-empty">This collection has no fields yet. Add the first one below.</td></tr>}
              {rows.map((r, i) => (
                <tr key={r.key} className={r.use ? '' : 'off'}>
                  <td><input type="checkbox" aria-label={`Ask ${r.label}`} checked={r.use} onChange={(e) => update(r.key, { use: e.target.checked })} /></td>
                  <td>{r.label}{r.isNew && <span className="ev-pill open" style={{ marginLeft: 6 }}>new</span>}
                    {r.options?.length ? <div className="ev-hint">{r.options.join(', ')}</div> : null}</td>
                  <td className="ev-mono">{r.key}</td>
                  <td>{TYPE_LABEL[r.type]}</td>
                  <td><input type="checkbox" aria-label={`${r.label} is required`} disabled={!r.use} checked={r.required} onChange={(e) => update(r.key, { required: e.target.checked })} /></td>
                  <td><input className="ev-input" disabled={!r.use} placeholder={r.label} value={r.eventLabel} onChange={(e) => update(r.key, { eventLabel: e.target.value })} aria-label={`Label for ${r.label}`} /></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="ev-btn ev-btn-ghost ev-btn-sm" disabled={i === 0} onClick={() => move(r.key, -1)} aria-label="Move up"><i className="fa-solid fa-arrow-up" /></button>
                    <button className="ev-btn ev-btn-ghost ev-btn-sm" disabled={i === rows.length - 1} onClick={() => move(r.key, 1)} aria-label="Move down"><i className="fa-solid fa-arrow-down" /></button>
                    {r.isNew && <button className="ev-btn ev-btn-ghost ev-btn-sm ev-btn-danger" onClick={() => removeNew(r.key)} aria-label="Remove new field"><i className="fa-solid fa-trash" /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ev-newfield">
          <div>
            <label className="ev-label" htmlFor="nf-label">New field label</label>
            <input id="nf-label" className="ev-input" placeholder="College name" value={nf.label} onChange={(e) => setNf({ ...nf, label: e.target.value })} />
          </div>
          <div>
            <label className="ev-label" htmlFor="nf-key">Key</label>
            <input id="nf-key" className="ev-input ev-mono" placeholder={keyFromLabel(nf.label) || 'college_name'} value={nf.key} onChange={(e) => setNf({ ...nf, key: e.target.value.toLowerCase() })} />
          </div>
          <div>
            <label className="ev-label" htmlFor="nf-type">Type</label>
            <select id="nf-type" className="ev-select" style={{ width: '100%' }} value={nf.type} onChange={(e) => setNf({ ...nf, type: e.target.value as EvFieldType })}>
              {(Object.keys(TYPE_LABEL) as EvFieldType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="ev-label" htmlFor="nf-options">Options {nf.type === 'select' || nf.type === 'multiselect' ? '' : '(choice types only)'}</label>
            <input id="nf-options" className="ev-input" disabled={nf.type !== 'select' && nf.type !== 'multiselect'} placeholder="1st Year, 2nd Year, 3rd Year" value={nf.options} onChange={(e) => setNf({ ...nf, options: e.target.value })} />
          </div>
          <button className="ev-btn" onClick={addField}><i className="fa-solid fa-plus" /> Add field</button>
        </div>
        <div className="ev-hint">A new field is added to the collection, so later events can tick it too. The key is what the website sends and cannot change once registrations exist.</div>
      </section>

      <div className="ev-row" style={{ justifyContent: 'flex-end' }}>
        <button className="ev-btn" onClick={() => nav('/event-apis')}>Cancel</button>
        <button className="ev-btn ev-btn-primary" disabled={busy} onClick={save}>
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Create & publish API'}
        </button>
      </div>

      {saved && <IntegrationPanel event={saved.event} library={saved.library} tenantSlug={tenantSlug} onClose={() => nav('/event-apis')} />}
    </div>
  );
};

export default EventEditor;
