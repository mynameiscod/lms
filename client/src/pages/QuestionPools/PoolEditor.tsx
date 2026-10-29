import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { questionPoolApi, Pool, BankRow, McqImportRow } from '../../api/questionPoolApi';
import { pbError } from '../../api/problemBankApi';
import { DifficultyPill, Modal, useToast } from '../ProblemBank/shared';
import { KIND_LABEL, LevelLine } from './index';
import '../ProblemBank/ProblemBank.css';

/** One CSV line into fields, honouring quotes and doubled quotes inside them. */
const csvFields = (line: string): string[] => {
  const out: string[] = []; let cur = ''; let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') quoted = false; else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur);
  return out.map(f => f.trim());
};

/** Header names are matched loosely, the way the Question Bank's own import matches them. */
const norm = (s: string) => s.toLowerCase().replace(/[\s_]+/g, '');
const CSV_TEMPLATE = 'question,optionA,optionB,optionC,optionD,correct,difficulty,marks,subject,topic,tags\n'
  + '"What does JVM stand for?",Java Virtual Machine,Java Variable Method,Joint Virtual Memory,,A,easy,1,Java,Basics,jvm;intro\n';

const parseMcqCsv = (text: string): McqImportRow[] => {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const head = csvFields(lines[0]).map(norm);
  return lines.slice(1).map(l => {
    const f = csvFields(l);
    const pick = (...names: string[]) => { for (const n of names) { const i = head.indexOf(norm(n)); if (i >= 0 && f[i]) return f[i]; } return ''; };
    return {
      question: pick('question', 'q'),
      options: [pick('optionA', 'a', 'option1'), pick('optionB', 'b', 'option2'), pick('optionC', 'c', 'option3'),
        pick('optionD', 'd', 'option4'), pick('optionE', 'e', 'option5')].filter(Boolean),
      correct: pick('correct', 'correctAnswer', 'answer', 'correctOption', 'ans'),
      difficulty: pick('difficulty', 'level'), marks: Number(pick('marks', 'mark', 'points')) || 1,
      subject: pick('subject'), topic: pick('topic'), tags: pick('tags', 'tag').split(';').map(t => t.trim()).filter(Boolean),
    };
  });
};

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
        <table className="pb-table">
          <thead><tr>
            <th style={{ width: 36 }}><input type="checkbox" aria-label="Select all on this page" checked={allOnPage} disabled={!pageRows.length} onChange={togglePage} /></th>
            {coding && <th>#</th>}<th>{coding ? 'Title' : 'Question'}</th><th>Level</th><th>{coding ? 'Topics' : 'Subject / topic'}</th><th>Marks</th>
          </tr></thead>
          <tbody>
            {!data && <tr><td colSpan={6} className="pb-muted" style={{ textAlign: 'center', padding: 24 }}><span className="pb-spinner" /></td></tr>}
            {data && !data.items.length && <tr><td colSpan={6} className="pb-muted" style={{ textAlign: 'center', padding: 24 }}>Nothing in the bank matches.</td></tr>}
            {data?.items.map(r => (
              <tr key={r.id} onClick={() => toggle(r)} style={{ opacity: pickable(r) ? 1 : 0.55, cursor: pickable(r) ? 'pointer' : 'default' }}>
                <td><input type="checkbox" disabled={!pickable(r)} checked={r.inPool || picked.has(r.id)} readOnly /></td>
                {coding && <td className="pb-muted pb-mono">{r.number}</td>}
                <td style={{ fontWeight: 600 }}>{r.title}
                  {r.inPool && <span className="pb-faint"> · already in pool</span>}
                  {!r.inPool && r.problem && <span style={{ color: 'var(--pb-bad)', fontWeight: 500 }}> · {r.problem}</span>}</td>
                <td><DifficultyPill d={r.difficulty} /></td>
                <td className="pb-muted">{r.topics.join(' · ')}</td>
                <td className="pb-muted">{r.marks}</td>
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

/** MCQs from a spreadsheet: written into the Question Bank and linked to this pool. */
const CsvImport: React.FC<{ pool: Pool; onClose: () => void; onDone: (p: Pool, msg: string, close: boolean) => void }> = ({ pool, onClose, onDone }) => {
  const [rows, setRows] = useState<McqImportRow[] | null>(null);
  const [file, setFile] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [refused, setRefused] = useState<{ row: number; reason: string }[]>([]);

  const read = async (f: File | undefined) => {
    if (!f) return;
    setErr(''); setRefused([]); setFile(f.name);
    const parsed = parseMcqCsv(await f.text());
    if (!parsed.length) { setRows(null); setErr('No questions found. The first row must be the column names — download the template to see them.'); return; }
    setRows(parsed);
  };
  const template = () => {
    const url = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'mcq-pool-template.csv'; a.click(); URL.revokeObjectURL(url);
  };
  const run = () => {
    if (!rows) return;
    setBusy(true); setErr('');
    questionPoolApi.importMcqs(pool.id, rows).then(r => {
      // Refused rows keep the dialog open so the admin can read which ones and why.
      if (r.refused.length) { setRefused(r.refused); setRows(null); setBusy(false); }
      onDone(r.pool, `${r.imported} imported into the Question Bank and this pool${r.refused.length ? ` · ${r.refused.length} rows refused` : ''}`, !r.refused.length);
    }).catch(e => { setErr(pbError(e)); setBusy(false); });
  };

  return (
    <Modal title="Import MCQs from a spreadsheet" onClose={onClose} footer={<>
      <button className="pb-btn pb-btn-ghost" onClick={template}><i className="fa-solid fa-download" /> Template</button>
      <span className="pb-grow" />
      <button className="pb-btn" onClick={onClose}>{refused.length ? 'Done' : 'Cancel'}</button>
      <button className="pb-btn pb-btn-primary" disabled={!rows?.length || busy} onClick={run}>{busy ? 'Importing…' : `Import ${rows?.length || ''}`}</button>
    </>}>
      <p className="pb-muted" style={{ marginTop: 0 }}>
        A CSV with the columns <b>question, optionA–optionD, correct</b> (a letter like <b>A</b>, or the answer text), and optionally
        <b> difficulty, marks, subject, topic, tags</b>. The questions are saved in the Question Bank, so other pools and quizzes can use them too.
      </p>
      {err && <div className="pb-alert pb-alert-bad">{err}</div>}
      <input type="file" accept=".csv,text/csv" onChange={e => read(e.target.files?.[0])} />
      {rows && <div className="pb-alert pb-alert-info">{file}: {rows.length} questions ready to import.</div>}
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
        <div className="pb-head">
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
          {!coding && <button className="pb-btn" onClick={() => setImporting(true)}><i className="fa-solid fa-file-csv" /> Import CSV</button>}
          <button className="pb-btn pb-btn-primary" onClick={() => setPicker(true)}><i className="fa-solid fa-plus" /> Add from {coding ? 'Problem Bank' : 'Question Bank'}</button>
        </div>

        <div className="pb-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
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
              ? 'Add published problems from the Problem Bank. Only problems with test cases can be added, because they are marked automatically.'
              : 'Add MCQs from the Question Bank, or import a spreadsheet.'}</p>
          </div>
        ) : (
          <div className="pb-card pb-table-wrap">
            <table className="pb-table">
              <thead><tr><th style={{ width: 36 }} /><th>{coding ? 'Problem' : 'Question'}</th><th>Level</th><th>{coding ? 'Topics' : 'Subject / topic'}</th><th>Marks</th></tr></thead>
              <tbody>
                {shown.map(q => (
                  <tr key={q.id} onClick={() => toggle(q.id)}>
                    <td><input type="checkbox" checked={selected.has(q.id)} readOnly aria-label="Select" /></td>
                    <td style={{ fontWeight: 600 }}>{q.title}{q.problem && <span style={{ color: 'var(--pb-bad)', fontWeight: 500 }}> · {q.problem}</span>}</td>
                    <td><DifficultyPill d={q.difficulty} /></td>
                    <td className="pb-muted">{q.topics.join(' · ')}</td>
                    <td className="pb-muted">{q.marks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="pb-faint" style={{ fontSize: 12.5, marginTop: 10 }}><LevelLine c={pool.counts} /> · questions are linked from the bank, so edits made there show here and in every exam that uses this pool.</p>
      </div>
      {picker && <BankPicker pool={pool} onClose={() => setPicker(false)} onAdded={(p, msg) => { setPool(p); setPicker(false); toast.show(msg); }} />}
      {importing && <CsvImport pool={pool} onClose={() => setImporting(false)} onDone={(p, msg, close) => { setPool(p); toast.show(msg); if (close) setImporting(false); }} />}
      {toast.node}
    </div>
  );
};

export default PoolEditor;
