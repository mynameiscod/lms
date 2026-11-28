import React, { useMemo, useRef, useState } from 'react';
import { placementDeskApi, ListMatch, ExternalInput } from '../../api/placementDeskApi';

/**
 * "Upload a list" on a drive: a CSV / Excel file or pasted lines is checked against the LMS students,
 * and the screen shows each row's result before anything is added. Email and phone matches are ticked
 * for you; a name-only match, a row with several possible students and a row not found need a person.
 */
export interface ListChoice { studentIds: string[]; externals: ExternalInput[] }

const TEMPLATE = 'Name,Email,Phone\nAsha Rao,asha@example.com,9876543210\n';
const VIA = { email: 'by email', phone: 'by phone', name: 'by name only — check it' } as const;
/** A match a person must confirm: by name alone, or by email/phone under a different name. */
const unsure = (r: ListMatch) => r.status === 'matched' && (r.via === 'name' || !!r.nameDiffers);

const UploadList: React.FC<{ driveId: string; onChange: (c: ListChoice) => void }> = ({ driveId, onChange }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [results, setResults] = useState<ListMatch[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  /** row → chosen student id ('' = not chosen) */
  const [pick, setPick] = useState<Record<number, string>>({});
  /** not-found rows to add as outside candidates */
  const [outside, setOutside] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<'all' | 'review'>('all');

  const emit = (p: Record<number, string>, o: Set<number>, rs: ListMatch[] | null = results) => {
    const ids = [...new Set(Object.values(p).filter(Boolean))];
    const externals = (rs || []).filter(r => o.has(r.row) && r.input.name)
      .map(r => ({ name: r.input.name!, email: r.input.email, phone: r.input.phone }));
    onChange({ studentIds: ids, externals });
  };

  const check = async (file?: File) => {
    setBusy(true); setErr('');
    try {
      const r = await placementDeskApi.matchList(driveId, file ? { file } : { text });
      const p: Record<number, string> = {};
      for (const x of r.results) if (x.status === 'matched' && !unsure(x) && x.student) p[x.row] = x.student._id;
      setResults(r.results); setTruncated(r.truncated); setPick(p); setOutside(new Set()); emit(p, new Set(), r.results);
    } catch (e: any) { setErr(e.message); setResults(null); emit({}, new Set(), null); } finally { setBusy(false); }
  };

  const setRow = (row: number, id: string) => setPick(prev => { const n = { ...prev, [row]: id }; emit(n, outside); return n; });
  const toggleOutside = (row: number) => setOutside(prev => { const n = new Set(prev); n.has(row) ? n.delete(row) : n.add(row); emit(pick, n); return n; });

  const counts = useMemo(() => {
    const c = { matched: 0, review: 0, not_found: 0, skipped: 0 };
    for (const r of results || []) {
      if (r.status === 'matched' && !unsure(r)) c.matched++;
      else if (r.status === 'several' || unsure(r)) c.review++;
      else if (r.status === 'not_found') c.not_found++;
      else c.skipped++;
    }
    return c;
  }, [results]);
  const chosen = new Set(Object.values(pick).filter(Boolean)).size;
  const needsReview = (r: ListMatch) => r.status === 'several' || r.status === 'not_found' || unsure(r);
  const shown = (results || []).filter(r => filter === 'all' || needsReview(r));

  const downloadTemplate = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([TEMPLATE], { type: 'text/csv' }));
    a.download = 'drive-students-template.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (!results) {
    return (
      <div className="pd-ul">
        <p className="pd-hint">Upload the list the company or college sent, or paste it. Each person is looked up in the LMS by <b>email</b>, then <b>phone</b>, then <b>name</b>. You check the result before anyone is added.</p>
        {err && <div className="pd-err">{err}</div>}
        <div className="pd-ul-drop">
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,text/csv" hidden onChange={e => { const f = e.target.files?.[0]; if (f) { setFileName(f.name); check(f); } e.target.value = ''; }} />
          <button className="pd-btn primary" onClick={() => fileRef.current?.click()} disabled={busy}>{busy && fileName ? `Checking ${fileName}…` : 'Upload CSV or Excel'}</button>
          <button className="pd-link" onClick={downloadTemplate}>Download a template</button>
        </div>
        <label className="pd-paste"><span>Or paste names, emails or phone numbers — one person per line</span>
          <textarea rows={6} value={text} onChange={e => setText(e.target.value)} placeholder={'Asha Rao, asha@example.com, 9876543210\nravi@example.com\n9000000001'} />
        </label>
        {text.trim() && <button className="pd-btn" onClick={() => { setFileName(''); check(); }} disabled={busy}>{busy ? 'Checking…' : 'Check these against the LMS'}</button>}
      </div>
    );
  }

  return (
    <div className="pd-ul">
      <div className="pd-ul-sum">
        <span className="ok"><b>{counts.matched}</b> matched</span>
        <span className="warn"><b>{counts.review}</b> to check</span>
        <span className="no"><b>{counts.not_found}</b> not found</span>
        {counts.skipped > 0 && <span className="skip"><b>{counts.skipped}</b> already on the drive or repeated</span>}
        <span className="pd-ul-grow" />
        <div className="pd-seg"><button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>All {results.length}</button><button className={filter === 'review' ? 'on' : ''} onClick={() => setFilter('review')}>Needs you {counts.review + counts.not_found}</button></div>
        <button className="pd-link" onClick={() => { setResults(null); emit({}, new Set(), null); }}>Start over</button>
      </div>
      {truncated && <div className="pd-err">Only the first 1000 rows were read. Split the list to add more.</div>}
      <div className="pd-pick pd-ul-list">
        {shown.length === 0 && <div className="pd-empty">Nothing needs you — every row matched by email or phone.</div>}
        {shown.map(r => {
          const who = [r.input.name, r.input.email, r.input.phone].filter(Boolean).join(' · ');
          return (
            <div key={r.row} className={`pd-ul-row s-${r.status}${unsure(r) ? ' s-name' : ''}`}>
              <span className="pd-ul-n">{r.row}</span>
              <div className="pd-ul-in"><b>{who || '—'}</b><small>from the list</small></div>
              <div className="pd-ul-out">
                {r.status === 'matched' && r.student && (
                  <label className="pd-ul-pick">
                    <input type="checkbox" checked={pick[r.row] === r.student._id} onChange={e => setRow(r.row, e.target.checked ? r.student!._id : '')} />
                    <span><b>{r.student.name}</b><small>{[r.student.batchName, r.student.email, !r.student.active && 'inactive'].filter(Boolean).join(' · ')}</small></span>
                    <em className={unsure(r) ? 'warn' : 'ok'}>{r.nameDiffers ? `${VIA[r.via!]}, but the name is different — check it` : VIA[r.via!]}</em>
                  </label>
                )}
                {r.status === 'several' && (
                  <div className="pd-ul-pick">
                    <select value={pick[r.row] || ''} onChange={e => setRow(r.row, e.target.value)} aria-label={`Choose the student for row ${r.row}`}>
                      <option value="">{r.options!.length} students match — choose one</option>
                      {r.options!.map(o => <option key={o._id} value={o._id}>{o.name} · {o.batchName || 'no batch'} · {o.email || o.phone || ''}</option>)}
                    </select>
                    <em className="warn">choose</em>
                  </div>
                )}
                {r.status === 'not_found' && (
                  <label className="pd-ul-pick">
                    <input type="checkbox" checked={outside.has(r.row)} disabled={!r.input.name} onChange={() => toggleOutside(r.row)} />
                    <span><b>Not in the LMS</b><small>{r.input.name ? 'Tick to add as an outside candidate' : 'No name in the list, so it cannot be added'}</small></span>
                    <em className="no">not found</em>
                  </label>
                )}
                {r.status === 'already' && !r.student && (
                  <div className="pd-ul-pick"><span><b>Outside candidate</b><small>Already on this drive</small></span><em className="skip">skipped</em></div>
                )}
                {(r.status === 'already' || r.status === 'repeat') && r.student && (
                  <div className="pd-ul-pick"><span><b>{r.student.name}</b><small>{r.status === 'already' ? 'Already on this drive' : 'Repeated in the list'}</small></span><em className="skip">skipped</em></div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="pd-hint">{chosen} student{chosen === 1 ? '' : 's'}{outside.size ? ` and ${outside.size} outside candidate${outside.size === 1 ? '' : 's'}` : ''} will be added.</p>
    </div>
  );
};

export default UploadList;
