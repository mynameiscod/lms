import React, { useMemo, useState } from 'react';
import { Assignment, Submission } from '../../../api/assignmentApi';
import WebPreview, { Device } from './WebPreview';
import { filesForStack, absoluteAssetUrl, stackOf } from './webStack';
import { webConfigOf } from './WebWorkspace';

/**
 * A handed-in web page: the checklist with what passed, the page itself running at any width (beside
 * the reference design when there is one), each file's code, and the AI's comments. Used on the
 * student's result page and on the trainer's marking screen.
 */
const WebResultSections: React.FC<{ assignment: Assignment; submission: Submission; cardClass?: string }> = ({ assignment, submission, cardClass = 'cb-ar-card' }) => {
  const web = webConfigOf(assignment);
  const files = useMemo(() => filesForStack(web.stack, submission.webFiles || [], [], assignment.title), [web.stack, submission.webFiles, assignment.title]);
  const [device, setDevice] = useState<Device>('desktop');
  const [view, setView] = useState<'page' | 'code'>('page');
  const [file, setFile] = useState(0);
  const [ref, setRef] = useState(0);
  const checks = submission.webChecks || [];
  const total = checks.reduce((s, c) => s + c.points, 0);
  const earned = checks.filter(c => c.passed).reduce((s, c) => s + c.points, 0);
  const refs = web.referenceImages || [];

  return (
    <>
      {checks.length > 0 && (
        <section className={cardClass}>
          <div className="cb-ar-section-head">
            <div><span className="cb-ar-icon blue"><i className="bi bi-list-check" /></span><div><h3>Checklist</h3><p>{checks.filter(c => c.passed).length} of {checks.length} checks passed · marked automatically</p></div></div>
            <span className="cb-ar-chip">{earned}/{total} pts · {submission.autoScore ?? 0} marks</span>
          </div>
          <ul className="wd-checks">
            {checks.map(c => (
              <li key={c.id} className={c.passed ? 'ok' : 'no'}>
                <i className={`bi ${c.passed ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`} aria-hidden />
                <span>{c.text}{!c.passed && c.detail ? <em> — {c.detail}</em> : null}</span>
                <b>{c.points} pt{c.points === 1 ? '' : 's'}</b>
              </li>
            ))}
          </ul>
        </section>
      )}

      {submission.aiReview && (
        <section className={cardClass}>
          <div className="cb-ar-section-head"><div><span className="cb-ar-icon purple"><i className="bi bi-stars" /></span><div><h3>AI comments</h3><p>Suggestions on your code — they do not change the mark</p></div></div></div>
          <div className="wr-ai">{submission.aiReview}</div>
        </section>
      )}

      {files.some(f => f.code.trim()) && (
        <section className={cardClass}>
          <div className="cb-ar-section-head">
            <div><span className="cb-ar-icon teal"><i className="bi bi-window" /></span><div><h3>The page</h3><p>{stackOf(web.stack).label} · {files.length} files</p></div></div>
            <div className="ww-seg" role="group" aria-label="Show">
              <button type="button" className={view === 'page' ? 'on' : ''} onClick={() => setView('page')}><i className="bi bi-eye" /><span>Page</span></button>
              <button type="button" className={view === 'code' ? 'on' : ''} onClick={() => setView('code')}><i className="bi bi-code-slash" /><span>Code</span></button>
            </div>
          </div>
          {view === 'page' ? (
            <>
              <div className="ww-pbar wr-bar">
                <div className="ww-seg" role="group" aria-label="Preview width">
                  {([['desktop', 'bi-display', 'Desktop'], ['tablet', 'bi-tablet', 'Tablet'], ['mobile', 'bi-phone', 'Mobile']] as const).map(([d, ic, label]) => (
                    <button key={d} type="button" className={device === d ? 'on' : ''} onClick={() => setDevice(d)} aria-pressed={device === d}><i className={`bi ${ic}`} /><span>{label}</span></button>
                  ))}
                </div>
                {refs.length > 1 && (
                  <select className="wr-select" value={ref} onChange={e => setRef(Number(e.target.value))} aria-label="Reference design">
                    {refs.map((r, i) => <option key={i} value={i}>{r.name || `Reference ${i + 1}`}</option>)}
                  </select>
                )}
              </div>
              <div className={`wr-compare${refs.length ? ' two' : ''}`}>
                <div className="wr-frame"><span className="wr-label">Submitted page</span><WebPreview stack={web.stack} files={files} device={device} title="Submitted page" /></div>
                {refs.length > 0 && (
                  <div className="wr-frame wr-ref"><span className="wr-label">Reference design</span><img src={absoluteAssetUrl(refs[ref].url)} alt={refs[ref].name || 'Reference design'} /></div>
                )}
              </div>
            </>
          ) : (
            <div className="cb-ar-code">
              <div className="cb-ar-code-head">
                <span className="wr-files">
                  {files.map((f, i) => <button key={f.name} type="button" className={i === file ? 'on' : ''} onClick={() => setFile(i)}>{f.name}</button>)}
                </span>
                <span>Read only</span>
              </div>
              <pre>{files[file]?.code}</pre>
            </div>
          )}
        </section>
      )}
    </>
  );
};

export default WebResultSections;
