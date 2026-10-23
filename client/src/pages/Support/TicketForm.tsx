import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import supportApi, { MODULES, CATEGORIES, moduleLabel, categoryLabel, errorText, NewTicket } from '../../api/supportApi';
import { fmtSize } from './supportUi';
import { lastFailedRequestId } from '../../utils/clientMonitor';
import './support.css';

/**
 * Report a problem. Two steps: write it, then review exactly what will be sent and confirm.
 * Nothing is raised until the member presses Submit on the review, and the page only says a
 * ticket exists once the server has returned its number.
 *
 * Context arrives from the page that opened the form (router state or ?from=), never typed by
 * the member. Diagnostics are shared only when the consent box is ticked, and the member sees
 * what they are before agreeing.
 */
const MAX_FILES = 3;
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export interface TicketDraft extends Partial<NewTicket> { summary?: string }

function diagnosticsText(): string {
  const nav = window.navigator;
  return [
    `Screen: ${window.screen.width}×${window.screen.height}, window ${window.innerWidth}×${window.innerHeight}`,
    `Language: ${nav.language}`,
    `Online: ${nav.onLine ? 'yes' : 'no'}`,
    `Time zone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
  ].join('\n');
}

const TicketForm: React.FC<{ basePath: string; draft?: TicketDraft; onCancel?: () => void }> = ({ basePath, draft, onCancel }) => {
  const nav = useNavigate();
  const loc = useLocation();
  const params = new URLSearchParams(loc.search);
  const from = (loc.state as any)?.from || params.get('from') || draft?.route || undefined;
  const relatedRequestId = (loc.state as any)?.requestId || draft?.relatedRequestId || lastFailedRequestId() || undefined;

  const [step, setStep] = useState<'edit' | 'review'>('edit');
  const [subject, setSubject] = useState(draft?.subject || '');
  const [description, setDescription] = useState(draft?.description || '');
  const [module, setModule] = useState(draft?.module || params.get('module') || 'other');
  const [category, setCategory] = useState(draft?.category || 'technical');
  const [consent, setConsent] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const diag = useMemo(diagnosticsText, []);

  const problems = [
    subject.trim().length < 3 && 'Add a short subject (at least 3 characters).',
    !description.trim() && 'Describe what happened.',
  ].filter(Boolean) as string[];

  const pickFiles = (list: FileList | null) => {
    setErr('');
    const chosen = Array.from(list || []);
    const bad = chosen.find(f => !TYPES.includes(f.type)) ;
    if (bad) return setErr(`"${bad.name}" is not a JPG, PNG, WEBP or PDF file.`);
    const big = chosen.find(f => f.size > MAX_BYTES);
    if (big) return setErr(`"${big.name}" is larger than 5 MB.`);
    setFiles(prev => [...prev, ...chosen].slice(0, MAX_FILES));
  };

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      const r = await supportApi.create({
        subject: subject.trim(), description: description.trim(), module, category,
        route: from, relatedRequestId, diagnosticsConsent: consent, diagnostics: consent ? diag : undefined,
        chatSessionId: draft?.chatSessionId,
      });
      // Files go on the first message, once the ticket exists. A failed upload does not undo the ticket.
      let fileNote = '';
      if (files.length && !r.duplicate) {
        try { await supportApi.reply(r.ticket.id, { body: `Attached ${files.length === 1 ? 'a file' : `${files.length} files`}.` }, files); }
        catch (e) { fileNote = `Your ticket was raised, but the files could not be attached: ${errorText(e)}`; }
      }
      nav(`${basePath}/tickets/${r.ticket.id}`, { state: { justRaised: r.ticket.ticketNumber, duplicate: r.duplicate, fileNote } });
    } catch (e) {
      setErr(errorText(e, 'Your ticket could not be sent. Nothing was raised — please try again.'));
      setBusy(false);
    }
  };

  if (step === 'review') {
    return (
      <div className="sp-card sp-review" aria-labelledby="sp-review-title">
        <h2 id="sp-review-title">Check your ticket before sending</h2>
        <dl>
          <dt>Subject</dt><dd>{subject.trim()}</dd>
          <dt>Area</dt><dd>{moduleLabel(module)}</dd>
          <dt>Type</dt><dd>{categoryLabel(category)}</dd>
          <dt>Description</dt><dd>{description.trim()}</dd>
          {from && <><dt>Page</dt><dd>{from}</dd></>}
          {draft?.summary && <><dt>From your chat</dt><dd>{draft.summary}</dd></>}
          <dt>Files</dt><dd>{files.length ? files.map(f => f.name).join(', ') : 'None'}</dd>
          <dt>Device details</dt><dd>{consent ? diag : 'Not shared'}</dd>
        </dl>
        {err && <p className="sp-err" role="alert">{err}</p>}
        <div className="sp-actions">
          <button type="button" className="sp-btn sp-btn-primary" onClick={submit} disabled={busy}>
            {busy ? <><i className="bi bi-arrow-repeat sp-spin" aria-hidden /> Sending…</> : <><i className="bi bi-send" aria-hidden /> Submit ticket</>}
          </button>
          <button type="button" className="sp-btn sp-btn-ghost" onClick={() => setStep('edit')} disabled={busy}><i className="bi bi-pencil" aria-hidden /> Edit</button>
        </div>
      </div>
    );
  }

  return (
    <form className="sp-card" noValidate onSubmit={e => { e.preventDefault(); if (!problems.length) setStep('review'); }}>
      <div className="sp-field">
        <label htmlFor="sp-subject">Subject</label>
        <input id="sp-subject" className="sp-input" value={subject} maxLength={200} onChange={e => setSubject(e.target.value)} placeholder="For example: Day 3 does not open" required />
      </div>
      <div className="sp-row">
        <div className="sp-field">
          <label htmlFor="sp-module">Which part of CareerPilot?</label>
          <select id="sp-module" className="sp-select" value={module} onChange={e => setModule(e.target.value)}>
            {MODULES.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </div>
        <div className="sp-field">
          <label htmlFor="sp-category">What kind of problem?</label>
          <select id="sp-category" className="sp-select" value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
      </div>
      <div className="sp-field">
        <label htmlFor="sp-desc">What happened?</label>
        <textarea id="sp-desc" className="sp-textarea" value={description} maxLength={5000} onChange={e => setDescription(e.target.value)}
          placeholder="What you did, what you expected, and what happened instead. Please do not include passwords or payment card details." required />
        <div className="sp-count">{description.length}/5000</div>
      </div>
      <div className="sp-field">
        <label htmlFor="sp-files">Screenshots (optional)</label>
        <input id="sp-files" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" multiple onChange={e => { pickFiles(e.target.files); e.target.value = ''; }} disabled={files.length >= MAX_FILES} />
        <span className="sp-hint">Up to {MAX_FILES} files, JPG, PNG, WEBP or PDF, 5 MB each.</span>
        {files.length > 0 && (
          <div className="sp-files">
            {files.map((f, i) => (
              <span className="sp-file" key={i}>{f.name} · {fmtSize(f.size)}
                <button type="button" className="sp-back" style={{ margin: 0 }} aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}><i className="bi bi-x" aria-hidden /></button>
              </span>
            ))}
          </div>
        )}
      </div>
      <label className="sp-check">
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
        <span>
          <b>Share device details to help us investigate</b>
          <span className="sp-hint" style={{ display: 'block' }}>Screen size, language, time zone, connection state and your browser version. No passwords, files or personal data.</span>
        </span>
      </label>
      {err && <p className="sp-err" role="alert" style={{ marginTop: 12 }}>{err}</p>}
      {problems.length > 0 && (subject || description) && <p className="sp-hint" style={{ marginTop: 10 }}>{problems.join(' ')}</p>}
      <div className="sp-actions" style={{ marginTop: 14 }}>
        <button type="submit" className="sp-btn sp-btn-primary" disabled={problems.length > 0}>Review ticket</button>
        <button type="button" className="sp-btn sp-btn-ghost" onClick={onCancel || (() => nav(basePath))}>Cancel</button>
      </div>
    </form>
  );
};

export default TicketForm;
