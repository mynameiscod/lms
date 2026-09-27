import React, { useRef, useState } from 'react';
import { problemBankApi, pbError, PbImportRow } from '../../api/problemBankApi';
import { Modal } from './shared';

/**
 * Bulk import, in three steps: choose (file or pasted JSON) → preview every row → import.
 * Nothing is saved until the last step, and rows with errors are skipped, never half-created.
 */
const ImportDialog: React.FC<{ canGlobal: boolean; onClose: () => void; onDone: (created: number) => void }> = ({ canGlobal, onClose, onDone }) => {
  const [step, setStep] = useState<'choose' | 'preview' | 'done'>('choose');
  const [mode, setMode] = useState<'file' | 'paste'>('file');
  const [pasted, setPasted] = useState('');
  const [fileName, setFileName] = useState('');
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [rows, setRows] = useState<PbImportRow[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [keep, setKeep] = useState<Set<number>>(new Set());
  const [scope, setScope] = useState<'tenant' | 'global'>('tenant');
  const [verify, setVerify] = useState(true);
  const [result, setResult] = useState<{ created: any[]; skipped: any[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const preview = async (body: { filename?: string; data?: string; text?: string }) => {
    setBusy(true); setErr('');
    try {
      const r = await problemBankApi.importPreview(body);
      setRows(r.rows); setItems(r.items);
      setKeep(new Set(r.rows.filter((x) => !x.errors.length).map((x) => x.row)));
      setStep('preview');
    } catch (e) { setErr(pbError(e, 'Could not read that file.')); }
    setBusy(false);
  };

  const onFile = (f?: File | null) => {
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) { setErr('That file is larger than 8 MB — split it into smaller files.'); return; }
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = String(reader.result || '').split(',')[1] || '';
      preview({ filename: f.name, data: b64 });
    };
    reader.readAsDataURL(f);
  };

  const commit = async () => {
    setBusy(true); setErr('');
    try {
      const chosen = items.filter((_, i) => keep.has(i + 1));
      const r = await problemBankApi.importCommit(chosen, scope, verify);
      setResult(r); setStep('done');
    } catch (e) { setErr(pbError(e, 'Import failed.')); }
    setBusy(false);
  };

  const ok = rows.filter((r) => !r.errors.length).length;
  const footer = step === 'choose' ? (
    <>
      <button className="pb-btn" onClick={onClose}>Cancel</button>
      {mode === 'paste' && <button className="pb-btn pb-btn-primary" disabled={!pasted.trim() || busy} onClick={() => preview({ text: pasted })}>
        {busy ? <span className="pb-spinner" /> : <i className="fa-solid fa-magnifying-glass" />} Preview</button>}
    </>
  ) : step === 'preview' ? (
    <>
      <button className="pb-btn" onClick={() => setStep('choose')}><i className="fa-solid fa-arrow-left" /> Back</button>
      <span className="pb-spacer" />
      <button className="pb-btn pb-btn-primary" disabled={!keep.size || busy} onClick={commit}>
        {busy ? <span className="pb-spinner" /> : <i className="fa-solid fa-file-import" />} Import {keep.size} problem{keep.size === 1 ? '' : 's'}
      </button>
    </>
  ) : (
    <button className="pb-btn pb-btn-primary" onClick={() => onDone(result?.created.length || 0)}>Done</button>
  );

  return (
    <Modal title="Import problems" onClose={onClose} wide footer={footer}>
      {step === 'choose' && <>
        <div className="pb-row pb-wrap" style={{ marginBottom: 14 }}>
          <div className="pb-seg">
            <button className={mode === 'file' ? 'on' : ''} onClick={() => setMode('file')}>Upload a file</button>
            <button className={mode === 'paste' ? 'on' : ''} onClick={() => setMode('paste')}>Paste JSON</button>
          </div>
          <span className="pb-spacer" />
          <span className="pb-muted" style={{ fontSize: 13 }}>Templates:</span>
          <button className="pb-btn pb-btn-sm" onClick={() => problemBankApi.downloadTemplate('json')}><i className="fa-solid fa-file-code" /> JSON</button>
          <button className="pb-btn pb-btn-sm" onClick={() => problemBankApi.downloadTemplate('csv')}><i className="fa-solid fa-file-csv" /> CSV / Excel</button>
        </div>
        {mode === 'file' ? (
          <div className={`pb-drop ${over ? 'over' : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files?.[0]); }}>
            {busy ? <><span className="pb-spinner" /><div style={{ marginTop: 8 }}>Reading {fileName}…</div></> : <>
              <i className="fa-solid fa-cloud-arrow-up" />
              <div style={{ fontWeight: 700, marginTop: 8 }}>Drop a .json, .csv or .xlsx file here, or click to choose</div>
              <div className="pb-muted" style={{ fontSize: 13, marginTop: 4 }}>Up to 1,000 problems per file · 8 MB</div>
            </>}
            <input ref={fileRef} type="file" accept=".json,.csv,.xlsx,.xls" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
        ) : (
          <textarea className="pb-textarea pb-mono" style={{ minHeight: 260 }} value={pasted} onChange={(e) => setPasted(e.target.value)}
            placeholder={'[\n  {\n    "title": "Sum of Two Numbers",\n    "difficulty": "easy",\n    "topics": ["math"],\n    "statement": "Read a and b, print a + b.",\n    "tests": [{ "input": "2 3", "output": "5", "sample": true }],\n    "solutions": { "python": "a,b=map(int,input().split())\\nprint(a+b)" }\n  }\n]'} />
        )}
        <div className="pb-alert pb-alert-info" style={{ marginTop: 14 }}>
          <b>Tip:</b> leave expected outputs empty and include a reference solution — the judge runs it and fills the answers in, then verifies every language.
          In spreadsheets, list tests as <code>sample_input_1</code>/<code>sample_output_1</code>, <code>test_input_1</code>/<code>test_output_1</code>…
          and code as <code>starter_python</code>, <code>solution_java</code> and so on.
        </div>
      </>}

      {step === 'preview' && <>
        <div className="pb-row pb-wrap" style={{ marginBottom: 12 }}>
          <b>{rows.length} row{rows.length === 1 ? '' : 's'} read</b>
          <span className="pb-pill pb-badge-ok">{ok} ready</span>
          {rows.length - ok > 0 && <span className="pb-pill pb-badge-bad">{rows.length - ok} with errors (skipped)</span>}
          <span className="pb-spacer" />
          {canGlobal && (
            <select className="pb-select" style={{ width: 'auto' }} value={scope} onChange={(e) => setScope(e.target.value as any)}>
              <option value="tenant">Add to my institute</option>
              <option value="global">Add to CodeBegun global library</option>
            </select>
          )}
          <label className="pb-switch"><input type="checkbox" checked={verify} onChange={(e) => setVerify(e.target.checked)} /> Verify with reference solutions</label>
        </div>
        <div className="pb-card pb-table-wrap" style={{ maxHeight: 420, overflowY: 'auto' }}>
          <table className="pb-table">
            <thead><tr>
              <th style={{ width: 36 }}><input type="checkbox" checked={keep.size === ok && ok > 0}
                onChange={(e) => setKeep(e.target.checked ? new Set(rows.filter((r) => !r.errors.length).map((r) => r.row)) : new Set())} /></th>
              <th style={{ width: 50 }}>Row</th><th>Title</th><th>Checks</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.row} style={{ cursor: 'default' }}>
                  <td><input type="checkbox" disabled={!!r.errors.length} checked={keep.has(r.row)}
                    onChange={(e) => { const n = new Set(keep); if (e.target.checked) n.add(r.row); else n.delete(r.row); setKeep(n); }} /></td>
                  <td className="pb-muted">{r.row}</td>
                  <td style={{ fontWeight: 650 }}>{r.title}</td>
                  <td style={{ fontSize: 12.5 }}>
                    {r.errors.map((m, i) => <div key={`e${i}`} style={{ color: 'var(--pb-bad)' }}><i className="fa-solid fa-circle-xmark" /> {m}</div>)}
                    {r.warnings.map((m, i) => <div key={`w${i}`} style={{ color: 'var(--pb-warn)' }}><i className="fa-solid fa-triangle-exclamation" /> {m}</div>)}
                    {!r.errors.length && !r.warnings.length && <span style={{ color: 'var(--pb-ok)' }}><i className="fa-solid fa-circle-check" /> Ready{r.publishable ? ' to publish' : ''}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pb-help">Imported problems arrive as drafts. Review them in the studio and publish when ready.</div>
      </>}

      {step === 'done' && result && <>
        <div className="pb-alert pb-alert-ok"><i className="fa-solid fa-circle-check" /> Imported <b>{result.created.length}</b> problem{result.created.length === 1 ? '' : 's'} as drafts.
          {verify && ' Those with reference solutions are being verified in the background.'}</div>
        {!!result.skipped.length && <>
          <h3 style={{ marginTop: 14 }}>Skipped ({result.skipped.length})</h3>
          {result.skipped.map((s) => <div key={s.row} style={{ fontSize: 13, marginBottom: 4 }}><b>Row {s.row} — {s.title}:</b> <span className="pb-muted">{s.reason}</span></div>)}
        </>}
      </>}

      {err && <div className="pb-alert pb-alert-bad">{err}</div>}
    </Modal>
  );
};

export default ImportDialog;
