import React, { useState } from 'react';
import { qualificationApi } from '../../../api';

/**
 * Qualification checklist on the lead page: the institute's questions (Qualification settings),
 * ticked when answered. Yes/No questions toggle with one click; others open a small editor.
 * Questions marked "needed for Qualified" must be answered before the lead can move to a
 * Qualified stage (enforced on the server).
 */
interface Q { id: string; question: string; answerType?: string; type?: string; options?: string[]; enabled?: boolean; requiredForQualified?: boolean }

const isYes = (v: any) => v === true || /^(yes|true|y|1)$/i.test(String(v ?? '').trim());
const filled = (v: any) => v !== undefined && v !== null && String(v).trim() !== '' && !/^(no|false)$/i.test(String(v).trim());

const QualificationChecklist: React.FC<{ leadId: string; questions: Q[]; answers: Record<string, any>; onSaved: (msg: string) => void; onError: (msg: string) => void }> = ({ leadId, questions, answers, onSaved, onError }) => {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const list = questions.filter(q => q.enabled !== false);
  const done = list.filter(q => filled(answers[q.id])).length;

  const save = async (qid: string, value: any) => {
    setSaving(true);
    try {
      const merged = { ...answers, [qid]: value };
      const payload = Object.entries(merged)
        .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
        .map(([questionId, answer]) => ({ questionId, answer, skipped: false }));
      const answered = list.filter(q => filled(merged[q.id])).length;
      await qualificationApi.saveLeadAnswers(leadId, { answers: payload, progress: list.length ? Math.round((answered / list.length) * 100) : 0 });
      setEditing(null);
      onSaved('Checklist saved');
    } catch (e: any) { onError(e.message || 'Could not save'); }
    finally { setSaving(false); }
  };

  if (!list.length) {
    return (
      <div className="ldv-card">
        <div className="ldv-card-head"><h3><i className="bi bi-clipboard-check" aria-hidden="true" /> Qualification Checklist</h3></div>
        <p className="ldv-empty">No checklist yet. Add questions in Qualification settings.</p>
      </div>
    );
  }

  return (
    <div className="ldv-card">
      <div className="ldv-card-head">
        <h3><i className="bi bi-clipboard-check" aria-hidden="true" /> Qualification Checklist</h3>
        <span className="ldv-pill">{done} / {list.length}</span>
      </div>
      <ul className="ldv-checklist">
        {list.map(q => {
          const v = answers[q.id];
          const kind = (q.answerType || q.type || 'text').toLowerCase();
          const isBool = kind === 'boolean' || kind === 'yes_no';
          const ok = filled(v);
          return (
            <li key={q.id}>
              <button type="button" className={`ldv-check ${ok ? 'on' : ''}`} disabled={saving}
                aria-pressed={ok} aria-label={`${q.question}: ${ok ? 'done' : 'not done'}`}
                onClick={() => (isBool ? save(q.id, isYes(v) ? 'No' : 'Yes') : (setEditing(editing === q.id ? null : q.id), setDraft(v ? String(v) : '')))}>
                {ok && <i className="bi bi-check-lg" />}
              </button>
              <div className="ldv-check-body">
                <span>{q.question}{q.requiredForQualified && <span className="ldv-need" title="Needed before Qualified"> *</span>}</span>
                {!isBool && ok && editing !== q.id && <span className="ldv-check-answer">{String(v)}</span>}
                {editing === q.id && (
                  <div className="ldv-check-edit">
                    {kind === 'select' && q.options?.length ? (
                      <select className="form-select form-select-sm" value={draft} onChange={e => setDraft(e.target.value)} autoFocus>
                        <option value="">Choose…</option>
                        {q.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input className="form-control form-control-sm" type={kind === 'number' ? 'number' : kind === 'date' ? 'date' : 'text'} value={draft} onChange={e => setDraft(e.target.value)} autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') save(q.id, draft.trim()); }} />
                    )}
                    <button className="btn btn-primary btn-sm" disabled={saving} onClick={() => save(q.id, draft.trim())}>Save</button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {list.some(q => q.requiredForQualified) && <p className="ldv-footnote">* needed before the lead can be marked Qualified</p>}
    </div>
  );
};

export default QualificationChecklist;
