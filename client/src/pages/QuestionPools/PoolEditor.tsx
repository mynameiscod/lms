import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { questionPoolApi, Pool, BankRow } from '../../api/questionPoolApi';
import { pbError } from '../../api/problemBankApi';
import { DifficultyPill, Modal, useToast } from '../ProblemBank/shared';
import { KIND_LABEL, LevelLine } from './index';
import '../ProblemBank/ProblemBank.css';
import './questionPools.css';

/** The bank, browsed from inside the pool. Rows already in it, or that could not be drawn, cannot be ticked. */
const BankPicker: React.FC<{ pool: Pool; onClose: () => void; onAdded: (p: Pool, msg: string) => void }> = ({ pool, onClose, onAdded }) => {
  const coding = pool.kind === 'coding';
  const [q, setQ] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: BankRow[]; total: number; pages: number } | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { setPage(1); }, [q, difficulty, subject, topic]);
  useEffect(() => {
    const t = setTimeout(() => {
      questionPoolApi.bank(pool.id, { q: q || undefined, difficulty: difficulty || undefined, subject: subject || undefined, topic: topic || undefined, page, limit: 50 })
        .then(setData).catch(e => setErr(pbError(e)));
    }, 250);
    return () => clearTimeout(t);
  }, [pool.id, q, difficulty, subject, topic, page]);

  const pickable = (r: BankRow) => !r.inPool && !r.problem;
  const toggle = (r: BankRow) => {
    if (!pickable(r)) return;
    const s = new Set(picked); if (s.has(r.id)) s.delete(r.id); else s.add(r.id); setPicked(s);
  };
  const pageRows = (data?.items || []).filter(pickable);
  const allOnPage = pageRows.length > 0 && pageRows.every(r => picked.has(r.id));
  const togglePage = () => {
    const s = new Set(picked);
    pageRows.forEach(r => (allOnPage ? s.delete(r.id) : s.add(r.id)));
    setPicked(s);
  };
  const add = () => {
    setBusy(true); setErr('');
    questionPoolApi.add(pool.id, Array.from(picked)).then(r => {
      const msg = `${r.added} added` + (r.refused.length ? ` · ${r.refused.length} refused: ${r.refused.map(x => x.reason).join(', ')}` : '');
      onAdded(r.pool, msg);
    }).catch(e => { setErr(pbError(e)); setBusy(false); });
  };

  return (
    <Modal title={`Add ${coding ? 'problems from the Problem Bank' : 'MCQs from the Question Bank'}`} onClose={onClose} wide footer={<>
      <span className="pb-muted pb-grow">{picked.size} selected{coding ? ' · only published problems with tests can be added' : ''}</span>
      <button className="pb-btn" onClick={onClose}>Cancel</button>
      <button className="pb-btn pb-btn-primary" disabled={!picked.size || busy} onClick={add}><i className="fa-solid fa-plus" /> {busy ? 'Adding…' : `Add ${picked.size || ''}`}</button>
    </>}>
      {err && <div className="pb-alert pb-alert-bad">{err}</div>}
      <div className="pb-row" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
        <div className="pb-search pb-grow"><i className="fa-solid fa-magnifying-glass" />
          <input className="pb-input" autoFocus placeholder={coding ? 'Search title, tag or #number' : 'Search question text or tag'} value={q} onChange={e => setQ(e.target.value)} /></div>
        {!coding && <input className="pb-input" style={{ width: 140 }} placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} />}
        <input className="pb-input" style={{ width: 140 }} placeholder="Topic" value={topic} onChange={e => setTopic(e.target.value)} />
        <select className="pb-select" style={{ width: 'auto' }} value={difficulty} onChange={e => setDifficulty(e.target.value)}>
          <option value="">Any level</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
        </select>
      </div>
      <div className="pb-card pb-table-wrap" style={{ maxHeight: 440, overflowY: 'auto' }}>
        <table className="pb-table qp-table">
          <thead><tr>
            <th style={{ width: 36 }}><input type="checkbox" aria-label="Select all on this page" checked={allOnPage} disabled={!pageRows.length} onChange={togglePage} /></th>
            {coding && <th>#</th>}<th>{coding ? 'Title' : 'Question'}</th><th>Level</th><th>{coding ? 'Topics' : 'Subject / topic'}</th><th>Marks</th>
          </tr></thead>
          <tbody>
            {!data && <tr><td colSpan={6} className="pb-muted" style={{ textAlign: 'center', padding: 24 }}><span className="pb-spinner" /></td></tr>}
            {data && !data.items.length && <tr><td colSpan={6} className="pb-muted" style={{ textAlign: 'center', padding: 24 }}>Nothing in the bank matches.</td></tr>}
            {data?.items.map(r => (
              <tr key={r.id} onClick={() => toggle(r)} style={{ opacity: pickable(r) ? 1 : 0.55, cursor: pickable(r) ? 'pointer' : 'default' }}>
                <td className="qp-check"><input type="checkbox" disabled={!pickable(r)} checked={r.inPool || picked.has(r.id)} readOnly aria-label="Select" /></td>
                {coding && <td className="pb-muted pb-mono qp-hide-sm">{r.number}</td>}
                <td className="qp-main" style={{ fontWeight: 600 }}>{r.title}
                  {r.inPool && <span className="pb-faint"> · already in pool</span>}
                  {!r.inPool && r.problem && <span style={{ color: 'var(--pb-bad)', fontWeight: 500 }}> · {r.problem}</span>}</td>
                <td className="qp-meta"><DifficultyPill d={r.difficulty} /></td>
                <td className="pb-muted qp-meta">{r.topics.join(' · ')}</td>
                <td className="pb-muted qp-meta" data-label="Marks">{r.marks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && data.pages > 1 && (
        <div className="pb-row" style={{ marginTop: 8 }}>
          <span className="pb-muted pb-grow">{data.total} in the bank · page {page} of {data.pages}</span>
          <button className="pb-btn pb-btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <button className="pb-btn pb-btn-sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </Modal>
  );
};

/** A spreadsheet the server can read (CSV or Excel), sent base64. */
const SHEET = /\.(csv|xlsx|xls)$/i;
const MAX_FILE_MB = 7;
const asBase64 = (f: File) => new Promise<string>((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1] || '');
  r.onerror = () => reject(new Error('That file could not be read.'));
  r.readAsDataURL(f);
});

/** The two spreadsheet formats, one per pool kind. Both are offered so the other one is never a mystery. */
const FORMATS: { kind: 'mcq' | 'coding'; label: string; pool: string; icon: string; columns: React.ReactNode }[] = [
  {
    kind: 'mcq', label: 'MCQ', pool: 'MCQ pools', icon: 'fa-solid fa-list-check',
    columns: <><b>question, optionA–optionD, correct</b> (a letter like A, or the answer text); optional <b>difficulty, marks, subject, topic, tags</b>.</>,
  },
  {
    kind: 'coding', label: 'Coding', pool: 'coding pools', icon: 'fa-solid fa-code',
    columns: <><b>title, statement, difficulty, marks</b>, <b>sample_input_1 / sample_output_1</b>, hidden tests <b>test_input_1 / test_output_1</b>…, and <b>starter_python</b>, <b>starter_java</b>… per language.</>,
  },
];

/**
 * Questions from a CSV or Excel file, into this pool. MCQs are saved in the Question Bank; coding
 * problems in the Problem Bank as published, LMS-only exam questions (tagged Exam), so students
 * never see them outside an exam paper.
 */
const FileImport: React.FC<{ pool: Pool; onClose: () => void; onDone: (p: Pool, msg: string, close: boolean) => void }> = ({ pool, onClose, onDone }) => {
  const coding = pool.kind === 'coding';
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [refused, setRefused] = useState<{ row: number; reason: string }[]>([]);

  const pick = (f: File | undefined) => {
    setErr(''); setRefused([]); setFile(null);
    if (!f) return;
    if (!SHEET.test(f.name)) { setErr('Choose a .csv, .xlsx or .xls file.'); return; }
    if (f.size > MAX_FILE_MB * 1024 * 1024) { setErr(`The file is larger than ${MAX_FILE_MB} MB — split it into smaller files.`); return; }
    setFile(f);
  };
  const run = async () => {
    if (!file) return;
    setBusy(true); setErr('');
    try {
      const r = await questionPoolApi.importFile(pool.id, file.name, await asBase64(file));
      // Refused rows keep the dialog open so the admin can read which ones and why.
      if (r.refused.length) { setRefused(r.refused); setFile(null); }
      setBusy(false);
      const where = coding ? 'the Problem Bank (LMS only, tagged Exam)' : 'the Question Bank';
      const refusedNote = r.refused.length ? ` · ${r.refused.length} row${r.refused.length === 1 ? '' : 's'} refused` : '';
      onDone(r.pool, `${r.imported} imported into ${where} and this pool${refusedNote}`, !r.refused.length);
    } catch (e) { setErr(pbError(e)); setBusy(false); }
  };

  return (
    <Modal title={`Import ${coding ? 'coding problems' : 'MCQs'} from a spreadsheet`} onClose={onClose} footer={<>
      <span className="pb-grow" />
      <button className="pb-btn" onClick={onClose}>{refused.length ? 'Done' : 'Cancel'}</button>
      <button className="pb-btn pb-btn-primary" disabled={!file || busy} onClick={run}>{busy ? 'Importing…' : 'Import'}</button>
    </>}>
      <p className="pb-muted" style={{ marginTop: 0 }}>
        There are two formats, one for each kind of pool. This is {coding ? 'a coding pool' : 'an MCQ pool'}, so use the
        <b> {coding ? 'coding' : 'MCQ'} format</b>. Both open in Excel or Google Sheets and can be saved as CSV or Excel.
      </p>
      <div className="qp-formats">
        {FORMATS.map(f => {
          const mine = f.kind === pool.kind;
          return (
            <div key={f.kind} className={`qp-format${mine ? ' is-mine' : ''}`}>
              <div className="qp-format-head">
                <i className={f.icon} />
                <b className="pb-grow">{f.label}</b>
                {mine ? <span className="pb-tag qp-format-tag">This pool</span> : <span className="pb-faint qp-format-tag">For {f.pool}</span>}
              </div>
              <div className="qp-format-cols">{f.columns}</div>
              <button className={`pb-btn pb-btn-sm${mine ? ' pb-btn-primary' : ''}`}
                onClick={() => questionPoolApi.downloadTemplate(f.kind).catch(e => setErr(pbError(e)))}>
                <i className="fa-solid fa-download" /> {f.label} template
              </button>
            </div>
          );
        })}
      </div>
      <div className="pb-alert pb-alert-info qp-import-note">
        <i className="fa-solid fa-eye-slash" />
        <span>{coding
          ? <>Imported problems are saved in the Problem Bank as <b>LMS only</b> and tagged <b>Exam</b>. Students never see them in a practice library — only in an exam paper that draws them.</>
          : <>Imported MCQs are saved in the Question Bank. Students see them only in an exam or quiz that uses them.</>}</span>
      </div>
      {err && <div className="pb-alert pb-alert-bad">{err}</div>}
      <label className="qp-file">
        <input type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }} />
        <i className="fa-solid fa-file-arrow-up" />
        <span>{file ? <><b>{file.name}</b> · {(file.size / 1024).toFixed(0)} KB</> : 'Choose a CSV or Excel file'}</span>
      </label>
      {!!refused.length && (
        <div className="pb-alert pb-alert-warn">
          <b>These rows were not imported:</b>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{refused.slice(0, 20).map(r => <li key={r.row}>Row {r.row + 1}: {r.reason}</li>)}</ul>
          {refused.length > 20 && <div>…and {refused.length - 20} more.</div>}
        </div>
      )}
    </Modal>
  );
};

const PoolEditor: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const nav = useNavigate();
  const toast = useToast();
  const [pool, setPool] = useState<Pool | null>(null);
  const [err, setErr] = useState('');
  const [picker, setPicker] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(() => { questionPoolApi.get(id).then(setPool).catch(e => setErr(pbError(e))); }, [id]);
  useEffect(load, [load]);

  const shown = useMemo(() => (pool?.questions || []).filter(q => !level || (level === 'broken' ? !!q.problem : q.difficulty === level && !q.problem)), [pool, level]);

  if (err && !pool) return <div className="pb-root"><div className="pb-page"><div className="pb-alert pb-alert-bad">{err}</div></div></div>;
  if (!pool) return <div className="pb-root"><div className="pb-page pb-muted"><span className="pb-spinner" /> Loading…</div></div>;

  const coding = pool.kind === 'coding';
  const broken = pool.counts.total - pool.counts.usable;

  const saveDetails = () => {
    questionPoolApi.update(pool.id, { name, description })
      .then(p => { setPool(p); setEditing(false); toast.show('Saved'); })
      .catch(e => toast.show(pbError(e), true));
  };
  const removeSelected = () => {
    if (!window.confirm(`Remove ${selected.size} question(s) from this pool? They stay in the bank.`)) return;
    questionPoolApi.removeQuestions(pool.id, Array.from(selected))
      .then(p => { setPool(p); setSelected(new Set()); toast.show('Removed from the pool'); })
      .catch(e => toast.show(pbError(e), true));
  };
  const deletePool = () => {
    if (!window.confirm(`Delete the pool "${pool.name}"? Its questions stay in the bank.`)) return;
    questionPoolApi.remove(pool.id).then(() => nav('/admin/assignments/pools')).catch(e => toast.show(pbError(e), true));
  };
  const toggle = (qid: string) => { const s = new Set(selected); if (s.has(qid)) s.delete(qid); else s.add(qid); setSelected(s); };

  return (
    <div className="pb-root">
      <div className="pb-page">
        <button className="pb-btn pb-btn-ghost pb-btn-sm" style={{ marginBottom: 8 }} onClick={() => nav('/admin/assignments/pools')}><i className="fa-solid fa-arrow-left" /> All pools</button>
        <div className="pb-head qp-head">
          <div className="pb-grow">
            {editing ? (
              <div style={{ maxWidth: 560 }}>
                <input className="pb-input" value={name} onChange={e => setName(e.target.value)} maxLength={120} />
                <textarea className="pb-textarea" style={{ marginTop: 8 }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" maxLength={1000} />
                <div className="pb-row" style={{ marginTop: 8 }}>
                  <button className="pb-btn pb-btn-sm pb-btn-primary" disabled={!name.trim()} onClick={saveDetails}>Save</button>
                  <button className="pb-btn pb-btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </div>
            ) : <>
              <h1>{pool.name} <button className="pb-btn pb-btn-ghost pb-btn-icon" aria-label="Rename" onClick={() => { setName(pool.name); setDescription(pool.description); setEditing(true); }}><i className="fa-solid fa-pen" /></button></h1>
              <p><span className="pb-tag">{KIND_LABEL[pool.kind]}</span> {pool.description}</p>
            </>}
          </div>
          <button className="pb-btn" onClick={() => setImporting(true)}><i className="fa-solid fa-file-csv" /> Import CSV / Excel</button>
          <button className="pb-btn pb-btn-primary" onClick={() => setPicker(true)}><i className="fa-solid fa-plus" /> Add from {coding ? 'Problem Bank' : 'Question Bank'}</button>
        </div>

        <div className="pb-stats qp-stats">
          <div className="pb-card pb-stat"><div className="n">{pool.counts.usable}</div><div className="l">can be drawn</div></div>
          <div className="pb-card pb-stat"><div className="n">{pool.counts.easy}</div><div className="l">easy</div></div>
          <div className="pb-card pb-stat"><div className="n">{pool.counts.medium}</div><div className="l">medium</div></div>
          <div className="pb-card pb-stat"><div className="n">{pool.counts.hard}</div><div className="l">hard</div></div>
        </div>
        {broken > 0 && (
          <div className="pb-alert pb-alert-warn">
            {broken} question{broken === 1 ? '' : 's'} in this pool can't be drawn right now (unpublished, no tests, no answer marked, or removed from the bank). Fix {broken === 1 ? 'it' : 'them'} in the bank, or remove {broken === 1 ? 'it' : 'them'} from the pool.
          </div>
        )}

        <div className="pb-row" style={{ margin: '4px 0 10px' }}>
          <select className="pb-select" style={{ width: 'auto' }} value={level} onChange={e => setLevel(e.target.value)}>
            <option value="">All questions ({pool.counts.total})</option>
            <option value="easy">Easy ({pool.counts.easy})</option>
            <option value="medium">Medium ({pool.counts.medium})</option>
            <option value="hard">Hard ({pool.counts.hard})</option>
            {broken > 0 && <option value="broken">Can't be drawn ({broken})</option>}
          </select>
          <span className="pb-grow" />
          {selected.size > 0 && <button className="pb-btn pb-btn-sm" onClick={removeSelected}><i className="fa-solid fa-minus" /> Remove {selected.size} from pool</button>}
          <button className="pb-btn pb-btn-sm pb-btn-ghost" style={{ color: 'var(--pb-bad)' }} onClick={deletePool}><i className="fa-solid fa-trash" /> Delete pool</button>
        </div>

        {!pool.questions.length ? (
          <div className="pb-card pb-empty">
            <h2>This pool is empty</h2>
            <p className="pb-muted">{coding
              ? 'Add published problems from the Problem Bank, or import a CSV / Excel file of new ones. Every problem needs test cases, because answers are marked automatically.'
              : 'Add MCQs from the Question Bank, or import a CSV / Excel file.'}</p>
          </div>
        ) : (
          <div className="pb-card pb-table-wrap">
            <table className="pb-table qp-table">
              <thead><tr><th style={{ width: 36 }} /><th>{coding ? 'Problem' : 'Question'}</th><th>Level</th><th>{coding ? 'Topics' : 'Subject / topic'}</th><th>Marks</th></tr></thead>
              <tbody>
                {shown.map(q => (
                  <tr key={q.id} onClick={() => toggle(q.id)}>
                    <td className="qp-check"><input type="checkbox" checked={selected.has(q.id)} readOnly aria-label="Select" /></td>
                    <td className="qp-main" style={{ fontWeight: 600 }}>{q.title}{q.problem && <span style={{ color: 'var(--pb-bad)', fontWeight: 500 }}> · {q.problem}</span>}</td>
                    <td className="qp-meta"><DifficultyPill d={q.difficulty} /></td>
                    <td className="pb-muted qp-meta">{q.topics.join(' · ')}</td>
                    <td className="pb-muted qp-meta" data-label="Marks">{q.marks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="pb-faint" style={{ fontSize: 12.5, marginTop: 10 }}><LevelLine c={pool.counts} /> · questions are linked from the bank, so edits made there show here and in every exam that uses this pool.</p>
      </div>
      {picker && <BankPicker pool={pool} onClose={() => setPicker(false)} onAdded={(p, msg) => { setPool(p); setPicker(false); toast.show(msg); }} />}
      {importing && <FileImport pool={pool} onClose={() => setImporting(false)} onDone={(p, msg, close) => { setPool(p); toast.show(msg); if (close) setImporting(false); }} />}
      {toast.node}
    </div>
  );
};

export default PoolEditor;
