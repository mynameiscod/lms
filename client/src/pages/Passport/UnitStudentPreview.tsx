/**
 * "Preview as student" for one learning unit.
 *
 * The day comes from the server's student-preview endpoint, which builds it the way a journey day is built
 * (the same activities, in the same order, with the same filter on grading material). It is drawn here with
 * the day player's own pieces — `ItemBody` and the `jd-*` styles — so what an admin checks is what a student
 * reads.
 *
 * NOTHING IN HERE WRITES. There is no enrollment behind a preview, so there is no "Mark as done", checkpoints
 * and projects do not open, and no evidence, completion or journey change can follow from anything clicked.
 */
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import passportApi, { UnitStudentPreview as Preview } from '../../api/passportApi';
import { ItemBody, TYPE_LABEL, ICON, titleOf, typeOf, mins } from './JourneyDay';
import './journeyDay.css';
import './unitStudentPreview.css';

const UnitStudentPreview: React.FC<{ unitCode: string; onClose: () => void }> = ({ unitCode, onClose }) => {
  const [data, setData] = useState<Preview | null>(null);
  const [error, setError] = useState('');
  const [selIdx, setSelIdx] = useState(0);
  const [note, setNote] = useState('');

  useEffect(() => {
    let alive = true;
    passportApi.unitStudentPreview(unitCode)
      .then(d => { if (alive) { setData(d); setSelIdx(0); } })
      .catch(e => { if (alive) setError(e?.response?.data?.message || 'The preview could not be built.'); });
    return () => { alive = false; };
  }, [unitCode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const items = data?.items || [];
  const selected = items[selIdx];

  // Portalled to <body>: inside the admin layout a transformed ancestor would otherwise size the "full screen" overlay.
  return createPortal(
    <div className="usp-overlay" role="dialog" aria-modal="true" aria-label={`Student preview of ${unitCode}`}>
      <div className="usp-banner" data-testid="student-preview-banner">
        <span className="usp-badge">PREVIEW</span>
        <span className="usp-banner-text">
          What a student sees for this unit. Nothing here is saved — no progress, no completion, no evidence.
        </span>
        <button type="button" className="usp-close" onClick={onClose}>
          <i className="bi bi-x-lg" aria-hidden /> Close preview
        </button>
      </div>

      <div className="jd-page usp-page">
        {!data && !error && <div className="jd-skeleton">Building the preview…</div>}
        {error && <p className="jd-error">{error}</p>}

        {data && (
          <>
            <header className="jd-head">
              <div>
                <span className="jd-kicker">DAY PREVIEW · {data.unit.unitCode}</span>
                <h1>{data.unit.title}</h1>
              </div>
            </header>

            {(data.unit.description || data.unit.learningOutcomes.length > 0) && (
              <div className="usp-objective">
                {data.unit.description && <p>{data.unit.description}</p>}
                {data.unit.learningOutcomes.length > 0 && (
                  <ul>{data.unit.learningOutcomes.map((o, i) => <li key={i}>{o}</li>)}</ul>
                )}
              </div>
            )}

            {data.notShown.length > 0 && (
              <p className="usp-warn">
                Not shown to students because not published: {data.notShown.map(r => r.title).join(', ')}.
              </p>
            )}

            {items.length === 0 && (
              <div className="jd-empty">
                <p>There is nothing to open for this day yet. Attach and publish content for this unit.</p>
              </div>
            )}

            {items.length > 0 && (
              <div className="jd-grid">
                <ol className="jd-rail" aria-label="Today's activities">
                  {items.map((it, i) => (
                    <li key={String(it.contentId || it.sourceId || i)}>
                      <button
                        type="button"
                        className={`jd-item${i === selIdx ? ' sel' : ''}`}
                        onClick={() => { setSelIdx(i); setNote(''); }}
                        aria-current={i === selIdx ? 'true' : undefined}
                      >
                        <span className="jd-item-icon" aria-hidden>
                          <i className={`bi ${ICON[typeOf(it)] || 'bi-journal-text'}`} />
                        </span>
                        <span className="jd-item-body">
                          <b>{titleOf(it)}</b>
                          <small>
                            {TYPE_LABEL[typeOf(it)] || typeOf(it)}
                            {it.estimatedDuration > 0 && <> · {mins(it.estimatedDuration)}</>}
                            {it.isGating && <> · must be completed</>}
                          </small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>

                <section className="jd-stage" aria-live="polite">
                  {selected && (
                    <>
                      <div className="jd-stage-head">
                        <div>
                          <span className="jd-type">{TYPE_LABEL[typeOf(selected)] || typeOf(selected)}</span>
                          <h2>{titleOf(selected)}</h2>
                        </div>
                      </div>

                      <div className="jd-body">
                        <ItemBody
                          item={selected.content ? selected : { ...selected, launchPath: selected.editPath }}
                          onLaunch={() => setNote(
                            selected.kind === 'quiz'
                              ? 'In preview the checkpoint does not open. A student opens it here as a full-screen paper.'
                              : 'In preview the project does not open. A student opens it here in its workspace.',
                          )}
                        />
                        {selected.content === null && selected.kind === 'content' && (
                          <p className="jd-muted">This content could not be loaded.</p>
                        )}
                      </div>

                      {note && <p className="usp-note" role="status">{note}</p>}

                      <div className="jd-actions">
                        {selected.kind !== 'content' && selected.live === false && (
                          <span className="usp-warn inline">Not live yet — students cannot open it.</span>
                        )}
                        {selected.kind !== 'content' && selected.editPath && (
                          <a className="jd-btn" href={selected.editPath} target="_blank" rel="noopener noreferrer">
                            Edit this {selected.kind === 'quiz' ? 'checkpoint' : 'project'} <i className="bi bi-box-arrow-up-right" aria-hidden />
                          </a>
                        )}
                        {selected.contentId && (
                          <button type="button" className="jd-btn" disabled title="Disabled in preview">
                            Mark as done
                          </button>
                        )}
                        {selIdx < items.length - 1 && (
                          <button type="button" className="jd-btn" onClick={() => { setSelIdx(selIdx + 1); setNote(''); }}>
                            Next activity <i className="bi bi-arrow-right" aria-hidden />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </section>
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default UnitStudentPreview;
