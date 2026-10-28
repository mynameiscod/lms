import React, { useEffect, useRef, useState } from 'react';
import { UnitStudentPreview } from '../../api/passportApi';
import { ItemBody, ICON, TYPE_LABEL, mins, titleOf, typeOf } from './JourneyDay';
import './journeyDay.css';
import './journeyDayMember.css';
import './studentDayPreview.css';
import { opensAsBook } from './NotesBook';
import { keepTaskInView, showLessonIfStacked, showLessonTop, useDayPanes } from './useDayPanes';

/**
 * Content Builder → "Preview as a student".
 *
 * The day exactly as a member opens it: the same task list and the same viewers (video player,
 * notes, Q&A, practice) the day player uses, fed by the unit's student preview — which the server
 * builds with the composer's own code and the member-safe content view. Nothing here writes: no
 * progress, no XP, no "Mark as done". A checkpoint opens its editor in a new tab; an assignment opens the
 * student workspace in its read-only preview mode.
 */
const StudentDayPreview: React.FC<{ preview: UnitStudentPreview; onClose: () => void }> = ({ preview, onClose }) => {
  const items = preview.items || [];
  const [sel, setSel] = useState(0);
  const selected = items[sel];
  const gridRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  useDayPanes(gridRef, [items.length > 0]);
  useEffect(() => {
    showLessonTop(gridRef.current);
    keepTaskInView(gridRef.current);
  }, [sel]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const totalXp = items.reduce((n: number, it: any) => n + (Number(it.xp) || 0), 0);

  return <div className="sdp-back" role="dialog" aria-modal="true" aria-label="Student preview">
    <div className="sdp-bar">
      <span className="sdp-badge"><i className="bi bi-eye" /> Student preview</span>
      <span className="sdp-note">This is what a member sees on this day. Nothing here is saved.</span>
      <button type="button" className="sdp-close" onClick={onClose}><i className="bi bi-x-lg" /> Close preview</button>
    </div>
    <div className="sdp-scroll">
      <div className="jd-page jdm sdp-page">
        <section className="jdm-hero">
          <div className="jdm-hero-copy">
            <span className="jdm-eyebrow">Day preview · {preview.unit.unitCode}</span>
            <h1>{preview.unit.title}</h1>
            {!!preview.unit.description && <p className="sdp-desc">{preview.unit.description}</p>}
            {items.length > 0 && <div className="jdm-chips">
              <span><i className="bi bi-check2-circle" /> 0 of {items.length} tasks done</span>
              {totalXp > 0 && <span><i className="bi bi-lightning-charge-fill" /> 0 / {totalXp} XP</span>}
            </div>}
          </div>
        </section>

        {!items.length ? <div className="jd-empty"><p>There is nothing on this day yet — a member would see an empty day.</p></div>
          : <div className="jd-grid" ref={gridRef}>
            <aside className="jdm-rail-card">
              <div className="jdm-rail-head"><b>Today’s tasks</b><span>0/{items.length}</span></div>
              <ol className="jd-rail" aria-label="Today's activities">
                {items.map((it: any, i: number) => (
                  <li key={it.contentId || it.sourceId || i}>
                    <button type="button" className={`jd-item${i === sel ? ' sel' : ''}`} onClick={() => { setSel(i); showLessonIfStacked(gridRef.current); }} aria-current={i === sel ? 'true' : undefined}>
                      <span className={`jd-item-icon t-${typeOf(it)}`} aria-hidden><i className={`bi ${ICON[typeOf(it)] || 'bi-journal-text'}`} /></span>
                      <span className="jd-item-body">
                        <b>{titleOf(it)}</b>
                        <small>{TYPE_LABEL[typeOf(it)] || typeOf(it)}{it.estimatedDuration > 0 && <> · {mins(it.estimatedDuration)}</>}{it.isGating && <> · must be completed</>}</small>
                      </span>
                      {Number(it.xp) > 0 && <span className="jdm-xp">+{it.xp}</span>}
                    </button>
                  </li>
                ))}
              </ol>
            </aside>

            <section className={`jd-stage${opensAsBook(selected?.content) ? ' fill' : ''}`} aria-live="polite">
              {selected && <>
                <div className="jd-stage-head">
                  <div>
                    <span className={`jd-type t-${typeOf(selected)}`}><i className={`bi ${ICON[typeOf(selected)] || 'bi-journal-text'}`} aria-hidden /> {TYPE_LABEL[typeOf(selected)] || typeOf(selected)}{selected.estimatedDuration > 0 ? ` · ${mins(selected.estimatedDuration)}` : ''}</span>
                    <h2>{titleOf(selected)}</h2>
                  </div>
                  {Number(selected.xp) > 0 && <div className="jdm-stage-tags"><span className="jdm-xp big">+{selected.xp} XP</span></div>}
                </div>
                {(selected.kind === 'quiz' || selected.kind === 'assignment') && selected.live === false && (
                  <p className="sdp-warn"><i className="bi bi-eye-slash" /> Not published yet — members cannot open this {selected.kind === 'quiz' ? 'checkpoint' : 'assignment'} until it is.</p>
                )}
                <div className="jd-body" ref={bodyRef}>
                  <ItemBody item={selected.content || selected.kind === 'content' ? selected : { ...selected, launchPath: selected.previewPath || selected.editPath }}
                    onLaunch={(p) => window.open(p, '_blank', 'noopener')} />
                </div>
                <div className="jd-actions">
                  <span className="jdm-step">Task {sel + 1} of {items.length}</span>
                  {sel > 0 && <button type="button" className="jd-btn" onClick={() => setSel(sel - 1)}><i className="bi bi-arrow-left" aria-hidden /> Previous</button>}
                  {sel < items.length - 1 && <button type="button" className="jd-btn primary" onClick={() => setSel(sel + 1)}>Next <i className="bi bi-arrow-right" aria-hidden /></button>}
                </div>
              </>}
            </section>
          </div>}
      </div>
    </div>
  </div>;
};

export default StudentDayPreview;
