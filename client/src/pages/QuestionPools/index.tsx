import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { questionPoolApi, PoolSummary, PoolKind } from '../../api/questionPoolApi';
import { pbError } from '../../api/problemBankApi';
import { Modal, relTime } from '../ProblemBank/shared';
import '../ProblemBank/ProblemBank.css';

export const KIND_LABEL: Record<PoolKind, string> = { coding: 'Coding problems', mcq: 'MCQs' };

/** "20 easy · 20 medium · 10 hard", the line an exam's balanced draw depends on. */
export const LevelLine: React.FC<{ c: { easy: number; medium: number; hard: number } }> = ({ c }) => (
  <span className="pb-muted">{c.easy} easy · {c.medium} medium · {c.hard} hard</span>
);

const NewPool: React.FC<{ onClose: () => void; onMade: (id: string) => void }> = ({ onClose, onMade }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<PoolKind>('coding');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const save = () => {
    setBusy(true); setErr('');
    questionPoolApi.create({ name, description, kind }).then(p => onMade(p.id)).catch(e => { setErr(pbError(e)); setBusy(false); });
  };
  return (
    <Modal title="New question pool" onClose={onClose} footer={<>
      <span className="pb-grow" />
      <button className="pb-btn" onClick={onClose}>Cancel</button>
      <button className="pb-btn pb-btn-primary" disabled={busy || !name.trim()} onClick={save}>{busy ? 'Creating…' : 'Create pool'}</button>
    </>}>
      {err && <div className="pb-alert pb-alert-bad">{err}</div>}
      <label className="pb-label">Name</label>
      <input className="pb-input" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Java Batch-12 Coding Pool" maxLength={120} />
      <label className="pb-label" style={{ marginTop: 12 }}>What it holds</label>
      <div className="pb-seg">
        {(['coding', 'mcq'] as PoolKind[]).map(k => (
          <button key={k} type="button" className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{KIND_LABEL[k]}</button>
        ))}
      </div>
      <p className="pb-faint" style={{ margin: '6px 0 0', fontSize: 12.5 }}>A pool holds one kind, so every student's paper carries the same weight. This cannot be changed later.</p>
      <label className="pb-label" style={{ marginTop: 12 }}>Description (optional)</label>
      <textarea className="pb-textarea" value={description} onChange={e => setDescription(e.target.value)} maxLength={1000} />
    </Modal>
  );
};

/**
 * Question Pools — hand-picked, reusable shortlists of bank questions. An exam says "give each
 * student 3 from this pool"; the questions themselves stay in the Problem Bank and Question Bank.
 */
const QuestionPools: React.FC = () => {
  const nav = useNavigate();
  const [rows, setRows] = useState<PoolSummary[] | null>(null);
  const [err, setErr] = useState('');
  const [creating, setCreating] = useState(false);
  useEffect(() => { questionPoolApi.list().then(setRows).catch(e => setErr(pbError(e))); }, []);

  return (
    <div className="pb-root">
      <div className="pb-page">
        <div className="pb-head">
          <div className="pb-grow">
            <h1>Question Pools</h1>
            <p>Pick questions from the Problem Bank and Question Bank into a pool once, then reuse it in any exam. Each student gets their own random set from the pool.</p>
          </div>
          <button className="pb-btn pb-btn-primary" onClick={() => setCreating(true)}><i className="fa-solid fa-plus" /> New pool</button>
        </div>
        {err && <div className="pb-alert pb-alert-bad">{err}</div>}
        {!rows ? <div className="pb-muted"><span className="pb-spinner" /> Loading…</div> : !rows.length ? (
          <div className="pb-card pb-empty">
            <h2>No pools yet</h2>
            <p className="pb-muted">Make one pool for coding problems (say, 50 Java problems) and one for MCQs (say, 150 aptitude questions). Exams draw a few from each, at random, for every student.</p>
            <button className="pb-btn pb-btn-primary" style={{ marginTop: 12 }} onClick={() => setCreating(true)}><i className="fa-solid fa-plus" /> Create the first pool</button>
          </div>
        ) : (
          <div className="pb-card pb-table-wrap">
            <table className="pb-table">
              <thead><tr><th>Pool</th><th>Holds</th><th>Questions</th><th>By level</th><th>Updated</th></tr></thead>
              <tbody>
                {rows.map(p => (
                  <tr key={p.id} onClick={() => nav(`/admin/assignments/pools/${p.id}`)}>
                    <td className="pb-title-cell"><div className="t">{p.name}</div>{p.description && <div className="sub pb-muted">{p.description}</div>}</td>
                    <td><span className="pb-tag">{KIND_LABEL[p.kind]}</span></td>
                    <td>
                      <b>{p.counts.usable}</b>
                      {p.counts.total > p.counts.usable && <span className="pb-pill pb-badge-bad" style={{ marginLeft: 8 }}>{p.counts.total - p.counts.usable} can't be drawn</span>}
                    </td>
                    <td><LevelLine c={p.counts} /></td>
                    <td className="pb-muted">{relTime(p.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {creating && <NewPool onClose={() => setCreating(false)} onMade={id => nav(`/admin/assignments/pools/${id}`)} />}
    </div>
  );
};

export default QuestionPools;
