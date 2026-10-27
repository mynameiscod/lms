import React, { useRef, useState } from 'react';
import { CsvImportResult, downloadTemplate, importPracticeCsv, PracticeQuestionInput } from './practiceCsv';

/**
 * "Import from a spreadsheet" for a practice set (practiceCsv.ts holds the format).
 *
 * Nothing is added until the author has seen what was read: the count by type, every question in a
 * short list, and every row that was refused with its spreadsheet row number. Bad rows are never
 * half-imported; the author fixes them in the sheet and imports again.
 */
const PracticeCsvImport: React.FC<{
  existingCount: number;
  onUse: (questions: PracticeQuestionInput[], mode: 'add' | 'replace') => void;
}> = ({ existingCount, onUse }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [mode, setMode] = useState<'add' | 'replace'>('add');
  const [readErr, setReadErr] = useState('');

  const choose = async (f: File | undefined) => {
    setReadErr(''); setResult(null);
    if (!f) return;
    if (!/\.(csv|txt)$/i.test(f.name) && !/csv|text\/plain/.test(f.type)) { setReadErr('Choose a .csv file - in Excel or Google Sheets, use File → Download / Save as → CSV.'); return; }
    if (f.size > 2 * 1024 * 1024) { setReadErr('That file is larger than 2 MB. Split it into smaller files.'); return; }
    setFileName(f.name);
    try { setResult(importPracticeCsv(await f.text())); } catch { setReadErr('Could not read that file.'); }
  };
  const reset = () => { setResult(null); setFileName(''); setMode('add'); if (fileRef.current) fileRef.current.value = ''; };

  const qs = result?.questions || [];
  const mcq = qs.filter(q => q.type === 'mcq').length;

  return <section className="pci">
    <div className="pci-hd">
      <span className="pci-ic"><i className="bi bi-filetype-csv" /></span>
      <div><b>Import from a spreadsheet</b><small>Fill the template in Excel or Google Sheets, save it as CSV, and import every question at once.</small></div>
    </div>
    <div className="pci-act">
      <button type="button" className="acb-btn ghost sm" onClick={downloadTemplate}><i className="bi bi-download" /> Download CSV template</button>
      <label className="acb-btn sm pci-pick">
        <i className="bi bi-upload" /> {fileName ? 'Choose another file' : 'Import CSV'}
        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={e => choose(e.target.files?.[0])} />
      </label>
      {fileName && <span className="pci-file"><i className="bi bi-file-earmark-text" /> {fileName}</span>}
    </div>
    {readErr && <div className="acb-err"><i className="bi bi-exclamation-circle" /> {readErr}</div>}

    {result && <div className="pci-out">
      <div className={`pci-sum${qs.length ? '' : ' none'}`}>
        {qs.length
          ? <><i className="bi bi-check2-circle" /> <b>{qs.length} question{qs.length === 1 ? '' : 's'}</b> ready · {mcq} multiple choice · {qs.length - mcq} theory</>
          : <><i className="bi bi-exclamation-circle" /> No question could be read from this file.</>}
      </div>
      {result.errors.length > 0 && <details className="pci-errs" open={!qs.length || result.errors.length <= 5}>
        <summary>{result.errors.length} row{result.errors.length === 1 ? '' : 's'} skipped - fix {result.errors.length === 1 ? 'it' : 'them'} in the sheet and import again</summary>
        <ul>{result.errors.slice(0, 50).map((e, i) => <li key={i}><b>Row {e.row}</b> {e.message}</li>)}</ul>
        {result.errors.length > 50 && <small>…and {result.errors.length - 50} more.</small>}
      </details>}
      {qs.length > 0 && <ol className="pci-list">
        {qs.slice(0, 8).map((q, i) => <li key={i}>
          <span className={`pci-type t-${q.type}`}>{q.type === 'mcq' ? 'MCQ' : 'Theory'}</span>
          <span className="pci-q">{q.title}</span>
          {q.options && <span className="pci-opts">{q.options.map((o, j) => <em key={j} className={o.isCorrect ? 'ok' : ''}>{String.fromCharCode(65 + j)}. {o.text}</em>)}</span>}
        </li>)}
        {qs.length > 8 && <li className="pci-more">…and {qs.length - 8} more</li>}
      </ol>}
      {qs.length > 0 && existingCount > 0 && <div className="pci-mode" role="radiogroup" aria-label="What to do with the questions already in this set">
        <label><input type="radio" name="pci-mode" checked={mode === 'add'} onChange={() => setMode('add')} /> Add to the {existingCount} question{existingCount === 1 ? '' : 's'} already here</label>
        <label><input type="radio" name="pci-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} /> Replace them</label>
      </div>}
      <div className="pci-foot">
        <button type="button" className="acb-btn ghost sm" onClick={reset}>Cancel</button>
        <button type="button" className="acb-btn primary sm" disabled={!qs.length} onClick={() => { onUse(qs, existingCount ? mode : 'add'); reset(); }}>
          <i className="bi bi-check2" /> Use {qs.length ? `these ${qs.length}` : 'them'}
        </button>
      </div>
    </div>}
  </section>;
};

export default PracticeCsvImport;
