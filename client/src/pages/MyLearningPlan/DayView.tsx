import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { enrollmentPlanApi } from '../../api/enrollmentPlanApi';
import { learningContentLibraryApi, CONTENT_TYPE_ICONS, CONTENT_TYPE_COLORS } from '../../api/learningContentLibraryApi';
import { interactiveLessonApi } from '../../api/interactiveLessonApi';
import InteractiveActivityViewer from './InteractiveActivityViewer';

// ─── Video Player ─────────────────────────────────────────────────────────────

export function VideoPlayer({ content, onWatchEnough }: { content: any; onWatchEnough: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [pct, setPct] = useState(0);
  const [notified, setNotified] = useState(false);
  const threshold = content.completionThreshold || 0;

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const watched = Math.round((v.currentTime / v.duration) * 100);
    setPct(watched);
    if (!notified && watched >= threshold) {
      setNotified(true);
      onWatchEnough();
    }
  }, [threshold, notified, onWatchEnough]);

  if (content.videoSource === 'youtube' && content.videoUrl) {
    const ytId = content.videoUrl.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1];
    return (
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: '10px', overflow: 'hidden' }}>
        <iframe
          src={`https://www.youtube.com/embed/${ytId}`}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
          allowFullScreen
          title={content.title}
        />
      </div>
    );
  }

  if (content.videoSource === 'bunny' && content.bunnyVideoId && content.bunnyLibraryId) {
    /**
     * A failed encode must not be dressed up as a slow one.
     *
     * Bunny shows the same "Processing video" placeholder for a video that is transcoding
     * and one that errored, so a recording that will never play looks like it is nearly
     * ready — and a student waits for something that is not coming. 5 and 6 are terminal:
     * say so, and tell whoever can act what to do about it.
     */
    if (content.bunnyStatus === 5 || content.bunnyStatus === 6) {
      return (
        <div style={{ borderRadius: 10, border: '1px solid #fde68a', background: '#fffbeb', color: '#92400e', padding: '20px 18px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
            <i className="bi bi-exclamation-triangle" style={{ marginRight: 8 }} />
            This recording could not be processed
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55 }}>
            The upload failed while being prepared, so there is nothing to play. It needs to be
            uploaded again — please let your trainer know.
          </div>
        </div>
      );
    }

    // Still working. Bunny's own placeholder is fine here, but say why, so "nothing is
    // happening" reads as "not yet" rather than "broken".
    if (content.bunnyStatus !== undefined && content.bunnyStatus < 4) {
      return (
        <div style={{ borderRadius: 10, border: '1px solid #bae6fd', background: '#f0f9ff', color: '#075985', padding: '20px 18px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
            <i className="bi bi-hourglass-split" style={{ marginRight: 8 }} />
            Still being prepared
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55 }}>
            This recording is being processed and will play shortly. Check back in a few minutes.
          </div>
        </div>
      );
    }

    return (
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: '10px', overflow: 'hidden' }}>
        <iframe
          src={`https://iframe.mediadelivery.net/embed/${content.bunnyLibraryId}/${content.bunnyVideoId}?autoplay=false&preload=true&responsive=true`}
          loading="lazy"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
          allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
          allowFullScreen
          title={content.title}
        />
      </div>
    );
  }

  if (content.videoSource === 'vimeo' && content.videoUrl) {
    const vimeoId = content.videoUrl.match(/vimeo\.com\/(\d+)/)?.[1];
    return (
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: '10px', overflow: 'hidden' }}>
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}`}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
          allowFullScreen
          title={content.title}
        />
      </div>
    );
  }

  // Uploaded video (streaming)
  const streamUrl = learningContentLibraryApi.getStreamUrl(content._id);
  return (
    <div>
      <video
        ref={videoRef}
        src={streamUrl}
        poster={content.videoThumbnail || undefined}
        controls
        onTimeUpdate={handleTimeUpdate}
        style={{ width: '100%', borderRadius: '10px', background: '#000' }}
      />
      {threshold > 0 && (
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
          Watch progress: {pct}% · Completion at {threshold}%
          {pct >= threshold && <span style={{ color: '#10b981', marginLeft: '8px' }}>✓ Threshold reached</span>}
        </div>
      )}
    </div>
  );
}

// ─── Notes Viewer ─────────────────────────────────────────────────────────────

export function NotesViewer({ content }: { content: any }) {
  if (content.notesSource === 'richtext' && content.notesContent) {
    return (
      <div
        className="ql-editor"
        dangerouslySetInnerHTML={{ __html: content.notesContent }}
        style={{ fontSize: '15px', lineHeight: 1.8, color: '#1e293b', padding: '4px 0' }}
      />
    );
  }
  if (content.notesSource === 'upload' && content.notesFilePath) {
    const fileName = content.notesFilePath.split('/').pop();
    const isPdf = fileName?.toLowerCase().endsWith('.pdf');
    return (
      <div>
        <a
          href={`/api/v1/learning-library/${content._id}/file`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: '#eff6ff', color: '#2563eb', padding: '10px 16px',
            borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '14px',
          }}
        >
          📎 {isPdf ? 'View PDF' : 'Download Notes'} ({fileName})
        </a>
        {isPdf && (
          <div style={{ marginTop: '12px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <iframe
              src={`/api/v1/learning-library/${content._id}/file`}
              width="100%"
              height="600px"
              style={{ border: 'none' }}
              title="Notes PDF"
            />
          </div>
        )}
      </div>
    );
  }
  return <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>No notes content available.</div>;
}

// ─── Q&A Viewer ───────────────────────────────────────────────────────────────

export function QAViewer({ content }: { content: any }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const items = content.qaItems || [];
  if (items.length === 0) return <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>No questions yet.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {items.map((qa: any, i: number) => (
        <div key={i} style={{ border: '1.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
          <button
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
            style={{
              width: '100%', textAlign: 'left', padding: '14px 16px',
              background: openIdx === i ? '#f0f9ff' : '#f8fafc',
              border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: '14px', fontWeight: 600, color: '#0f172a',
            }}
          >
            <span>{qa.question}</span>
            <span style={{ color: '#64748b', fontSize: '18px', flexShrink: 0, marginLeft: '8px' }}>{openIdx === i ? '▲' : '▼'}</span>
          </button>
          {openIdx === i && (
            <div style={{ padding: '14px 16px', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '14px', lineHeight: 1.7, color: '#374151', marginBottom: qa.tips ? '12px' : 0 }}>
                {qa.answer}
              </div>
              {qa.tips && (
                <div style={{ background: '#fef3c7', borderRadius: '7px', padding: '10px 12px', fontSize: '13px', color: '#92400e' }}>
                  💡 <strong>Tips:</strong> {qa.tips}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Practice Viewer ─────────────────────────────────────────────────────────

export function PracticeViewer({ content }: { content: any }) {
  const [answers, setAnswers] = useState<Record<number, number | null>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const questions = content.practiceQuestions || [];

  if (questions.length === 0) return <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>No questions yet.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {questions.map((q: any, qi: number) => (
        <div key={qi} style={{ border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '8px' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', flex: 1 }}>
              Q{qi + 1}. {q.title}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <span style={{
                background: q.difficulty === 'easy' ? '#dcfce7' : q.difficulty === 'medium' ? '#fef3c7' : '#fee2e2',
                color:      q.difficulty === 'easy' ? '#15803d' : q.difficulty === 'medium' ? '#b45309' : '#dc2626',
                borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 600,
              }}>
                {q.difficulty}
              </span>
              <span style={{ background: '#f1f5f9', color: '#475569', borderRadius: '6px', padding: '2px 8px', fontSize: '11px' }}>
                {q.marks}pt{q.marks !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {q.description && (
            <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, marginBottom: '12px', whiteSpace: 'pre-wrap' }}>
              {q.description}
            </div>
          )}

          {/* MCQ options */}
          {q.type === 'mcq' && q.options && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {q.options.map((opt: any, oi: number) => {
                const selected = answers[qi] === oi;
                const isCorrect = opt.isCorrect;
                const showResult = revealed[qi];
                let bg = '#f8fafc', border = '#e2e8f0', color = '#374151';
                if (showResult && isCorrect) { bg = '#dcfce7'; border = '#86efac'; color = '#15803d'; }
                else if (showResult && selected && !isCorrect) { bg = '#fee2e2'; border = '#fca5a5'; color = '#dc2626'; }
                else if (selected) { bg = '#eff6ff'; border = '#93c5fd'; color = '#1d4ed8'; }

                return (
                  <div
                    key={oi}
                    onClick={() => !revealed[qi] && setAnswers(prev => ({ ...prev, [qi]: oi }))}
                    style={{
                      padding: '10px 14px', borderRadius: '8px', cursor: revealed[qi] ? 'default' : 'pointer',
                      background: bg, border: `1.5px solid ${border}`, color, fontSize: '14px',
                      display: 'flex', alignItems: 'center', gap: '8px',
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '12px', minWidth: '20px' }}>{String.fromCharCode(65 + oi)}.</span>
                    <span>{opt.text}</span>
                    {showResult && isCorrect && <span style={{ marginLeft: 'auto' }}>✓</span>}
                    {showResult && selected && !isCorrect && <span style={{ marginLeft: 'auto' }}>✗</span>}
                  </div>
                );
              })}
              {answers[qi] !== null && answers[qi] !== undefined && !revealed[qi] && (
                <button
                  onClick={() => setRevealed(prev => ({ ...prev, [qi]: true }))}
                  style={{ alignSelf: 'flex-start', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '7px', padding: '7px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginTop: '4px' }}
                >
                  Check Answer
                </button>
              )}
              {revealed[qi] && q.explanation && (
                <div style={{ background: '#f0fdf4', borderRadius: '7px', padding: '10px 12px', fontSize: '13px', color: '#15803d', marginTop: '4px' }}>
                  💡 {q.explanation}
                </div>
              )}
            </div>
          )}

          {/* Theory / Coding */}
          {(q.type === 'theory' || q.type === 'coding') && (
            <div>
              {q.type === 'coding' && q.starterCode && (
                <div style={{ background: '#0f172a', borderRadius: '8px', padding: '14px', marginBottom: '10px', overflowX: 'auto' }}>
                  <pre style={{ margin: 0, color: '#e2e8f0', fontSize: '13px', fontFamily: 'monospace' }}>
                    {Object.entries(q.starterCode as Record<string, string>).map(([lang, code]) => (
                      `// ${lang}\n${code}`
                    )).join('\n\n')}
                  </pre>
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setRevealed(prev => ({ ...prev, [qi]: !prev[qi] }))}
                  style={{ background: '#f8fafc', color: '#374151', border: '1.5px solid #e2e8f0', borderRadius: '7px', padding: '7px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {revealed[qi] ? 'Hide' : 'Show'} Answer
                </button>
              </div>
              {revealed[qi] && q.explanation && (
                <div style={{ background: '#f8fafc', borderRadius: '7px', padding: '12px', marginTop: '8px', fontSize: '13px', color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {q.explanation}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Content Item Card ────────────────────────────────────────────────────────

// ─── Module activity card (quiz / assignment / code snippet / mock interview) ──

const MODULE_META: Record<string, { icon: string; label: string; color: string; verb: string }> = {
  quiz:          { icon: '📝', label: 'Quiz',           color: '#7c3aed', verb: 'Start Quiz' },
  assignment:    { icon: '📋', label: 'Assignment',     color: '#2563eb', verb: 'Open Assignment' },
  codeSnippet:   { icon: '⌨️', label: 'Code Snippet',   color: '#0ea5e9', verb: 'Solve' },
  mockInterview: { icon: '🎤', label: 'Mock Interview', color: '#f59e0b', verb: 'Start Interview' },
};
const STATUS_META: Record<string, { label: string; bg: string; fg: string }> = {
  not_started: { label: 'Not started', bg: '#f1f5f9', fg: '#94a3b8' },
  in_person:   { label: 'In-person',   bg: '#fef3c7', fg: '#b45309' },
  in_progress: { label: 'In progress', bg: '#fef3c7', fg: '#b45309' },
  submitted:   { label: 'Submitted',   bg: '#dbeafe', fg: '#1d4ed8' },
  graded:      { label: 'Graded',      bg: '#dcfce7', fg: '#16a34a' },
  evaluated:   { label: 'Evaluated',   bg: '#dcfce7', fg: '#16a34a' },
  passed:      { label: 'Passed',      bg: '#dcfce7', fg: '#16a34a' },
  failed:      { label: 'Needs work',  bg: '#fee2e2', fg: '#dc2626' },
};

function ModuleItemCard({ item }: { item: any }) {
  const navigate = useNavigate();
  const isPhysical = item.kind === 'mockInterview' && (item.sourceModel === 'physical' || item.moduleStatus === 'in_person');
  const meta = isPhysical
    ? { icon: '🧑‍💼', label: 'Mock Interview', color: '#f59e0b', verb: 'View Schedule' }
    : (MODULE_META[item.kind] || { icon: '📦', label: item.kind, color: '#64748b', verb: 'Open' });
  const st = STATUS_META[item.moduleStatus] || STATUS_META.not_started;
  const done = !!item.isCompleted;
  const slotColors: Record<string, string> = { morning: '#fef3c7', afternoon: '#dbeafe', evening: '#f3e8ff', anytime: '#f1f5f9' };

  return (
    <div style={{ borderRadius: '12px', border: `1.5px solid ${done ? '#86efac' : '#e2e8f0'}`, overflow: 'hidden', background: done ? '#f0fdf4' : '#fff' }}>
      <div style={{ height: '3px', background: done ? '#10b981' : meta.color }} />
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${meta.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
          {meta.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.contentTitle || meta.label}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '3px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ background: `${meta.color}15`, color: meta.color, borderRadius: '4px', padding: '1px 7px', fontSize: '11px', fontWeight: 700 }}>{meta.label}</span>
            <span style={{ background: st.bg, color: st.fg, borderRadius: '4px', padding: '1px 7px', fontSize: '11px', fontWeight: 600 }}>{st.label}</span>
            {typeof item.moduleScore === 'number' && <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>Score: {Math.round(item.moduleScore)}%</span>}
            {item.dueAt && <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600 }}>Due {new Date(item.dueAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
            {item.slot !== 'anytime' && (
              <span style={{ background: slotColors[item.slot] || '#f1f5f9', color: '#475569', borderRadius: '4px', padding: '1px 7px', fontSize: '11px', fontWeight: 500, textTransform: 'capitalize' }}>{item.slot}</span>
            )}
            {item.isGating && <span style={{ background: '#fef3c7', color: '#b45309', borderRadius: '4px', padding: '1px 7px', fontSize: '11px', fontWeight: 600 }}>🔑 Gating</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {done && <span style={{ color: '#10b981', fontWeight: 600, fontSize: '13px' }}>✓ Done</span>}
          {item.launchPath && (
            <button
              onClick={() => navigate(item.launchPath)}
              style={{ padding: '7px 14px', border: 'none', borderRadius: '8px', background: meta.color, color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              {done ? 'Review' : meta.verb}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface ContentItemCardProps {
  item: any;
  enrollmentId: string;
  dayNumber: number;
  isLocked: boolean;
  onComplete: () => void;
}

function ContentItemCard({ item, enrollmentId, dayNumber, isLocked, onComplete }: ContentItemCardProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(item.isCompleted);
  const content = item.content;
  const isInteractiveLesson = item.contentType === 'interactive_lesson';
  const [lessonProgress, setLessonProgress] = useState<any>(null);

  useEffect(() => {
    if (isInteractiveLesson && content?.conceptLessonId && !isLocked) {
      interactiveLessonApi.getProgress(content.conceptLessonId)
        .then(p => setLessonProgress(p))
        .catch(() => {});
    }
  }, [isInteractiveLesson, content?.conceptLessonId, isLocked]);

  const color = CONTENT_TYPE_COLORS[item.contentType as any] || '#64748b';
  const icon  = CONTENT_TYPE_ICONS[item.contentType as any]  || '📄';

  const handleMarkComplete = async () => {
    if (completed || completing) return;
    setCompleting(true);
    try {
      await enrollmentPlanApi.markContentComplete(enrollmentId, item.contentId, dayNumber);
      setCompleted(true);
      onComplete();
    } catch {
      alert('Failed to mark as complete');
    } finally {
      setCompleting(false);
    }
  };

  const slotColors: Record<string, string> = {
    morning: '#fef3c7', afternoon: '#dbeafe', evening: '#f3e8ff', anytime: '#f1f5f9',
  };

  return (
    <div style={{
      borderRadius: '12px', border: `1.5px solid ${completed ? '#86efac' : isLocked ? '#e2e8f0' : '#e2e8f0'}`,
      overflow: 'hidden', opacity: isLocked ? 0.6 : 1,
      background: completed ? '#f0fdf4' : '#fff',
    }}>
      {/* Header bar */}
      <div style={{ height: '3px', background: completed ? '#10b981' : color }} />

      {/* Video thumbnail */}
      {content?.type === 'video' && content?.videoThumbnail && !isLocked && (
        <div
          onClick={() => !isInteractiveLesson && setExpanded(e => !e)}
          style={{ height: '150px', background: '#0f172a', overflow: 'hidden', position: 'relative', cursor: 'pointer' }}
        >
          <img src={content.videoThumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }} />
          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,.5)' }}>▶</span>
        </div>
      )}

      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Type icon */}
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: `${color}15`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '18px', flexShrink: 0,
          }}>
            {isLocked ? '🔒' : icon}
          </div>

          {/* Title + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {content?.title || 'Content'}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
              {item.slot !== 'anytime' && (
                <span style={{ background: slotColors[item.slot] || '#f1f5f9', color: '#475569', borderRadius: '4px', padding: '1px 7px', fontSize: '11px', fontWeight: 500, textTransform: 'capitalize' }}>
                  {item.slot}
                </span>
              )}
              {content?.estimatedDuration > 0 && (
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>⏱ {content.estimatedDuration}m</span>
              )}
              {item.isGating && (
                <span style={{ background: '#fef3c7', color: '#b45309', borderRadius: '4px', padding: '1px 7px', fontSize: '11px', fontWeight: 600 }}>
                  🔑 Gating
                </span>
              )}
            </div>
          </div>

          {/* Complete button */}
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            {!isLocked && (
              isInteractiveLesson && content?.conceptLessonId ? (
                <button
                  onClick={() => navigate(`/interactive-lesson/play/${content.conceptLessonId}`)}
                  style={{ padding: '6px 12px', border: 'none', borderRadius: '7px', background: '#ec4899', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  🎮 {completed ? 'Replay' : 'Start'}
                </button>
              ) : (
                <button
                  onClick={() => setExpanded(e => !e)}
                  style={{ padding: '6px 12px', border: '1.5px solid #e2e8f0', borderRadius: '7px', background: '#fff', color: '#374151', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {expanded ? 'Hide' : (completed ? 'Review' : 'Open')}
                </button>
              )
            )}
            {completed ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontWeight: 600, fontSize: '13px' }}>
                ✓ Done
              </div>
            ) : isLocked ? (
              <div style={{ color: '#94a3b8', fontSize: '12px' }}>Locked</div>
            ) : (
              <button
                onClick={handleMarkComplete}
                disabled={completing}
                style={{
                  padding: '6px 12px', border: 'none',
                  borderRadius: '7px', background: '#10b981', color: '#fff',
                  fontSize: '13px', fontWeight: 600, cursor: completing ? 'not-allowed' : 'pointer',
                  opacity: completing ? 0.7 : 1,
                }}
              >
                {completing ? '...' : '✓ Done'}
              </button>
            )}
          </div>
        </div>

        {/* Expanded content */}
        {expanded && !isLocked && content && (
          <div style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
            {content.description && (
              <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
                {content.description}
              </p>
            )}
            {(content.type === 'video') && (
              <VideoPlayer content={content} onWatchEnough={handleMarkComplete} />
            )}
            {(content.type === 'notes') && (
              <NotesViewer content={content} />
            )}
            {(content.type === 'tech_qa' || content.type === 'behavioral_qa') && (
              <QAViewer content={content} />
            )}
            {(content.type === 'practice_coding' || content.type === 'practice_theory' || content.type === 'aptitude') && (
              <PracticeViewer content={content} />
            )}
            {content.type === 'interactive_activity' && content.htmlContent && (
              <InteractiveActivityViewer
                htmlContent={content.htmlContent}
                completed={completed}
                onComplete={handleMarkComplete}
              />
            )}
            {content.type === 'interactive_lesson' && content.conceptLessonId && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                {lessonProgress && (lessonProgress.status === 'passed' || lessonProgress.status === 'completed') ? (
                  <div style={{ color: '#10b981', fontWeight: 700, marginBottom: 12 }}>
                    ✅ Lesson completed — Score: {lessonProgress.score}%
                  </div>
                ) : lessonProgress && lessonProgress.status === 'in_progress' ? (
                  <div style={{ color: '#f59e0b', fontWeight: 600, marginBottom: 12 }}>
                    ⏸ In progress — Scene {lessonProgress.currentSceneIndex + 1}
                  </div>
                ) : null}
                <button
                  onClick={() => navigate(`/interactive-lesson/play/${content.conceptLessonId}`)}
                  style={{ padding: '12px 28px', background: '#ec4899', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
                >
                  🎮 {lessonProgress?.status === 'in_progress' ? 'Continue Lesson' : lessonProgress?.status === 'passed' ? 'Replay Lesson' : 'Start Lesson'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Day View ─────────────────────────────────────────────────────────────

export default function DayView() {
  const { enrollmentId, day } = useParams<{ enrollmentId: string; day: string }>();
  const navigate = useNavigate();
  const dayNumber = parseInt(day || '1', 10);

  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = useCallback(async () => {
    if (!enrollmentId || !day) return;
    setLoading(true);
    setError('');
    try {
      const res = await enrollmentPlanApi.getDayPlan(enrollmentId, dayNumber);
      setData(res);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load day plan');
    } finally {
      setLoading(false);
    }
  }, [enrollmentId, day, dayNumber]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh while a personalized day's content is generating (~30–60s).
  useEffect(() => {
    if (data?.aiGenStatus === 'generating') {
      const t = setInterval(() => { load(); }, 8000);
      return () => clearInterval(t);
    }
  }, [data?.aiGenStatus, load]);

  const handleItemComplete = () => {
    // Reload to get fresh completion state
    load();
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading Day {dayNumber}...</div>;
  if (error)   return <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>{error}</div>;
  if (!data)   return null;

  const { enrollment, curriculum, topic, items, isDayCompleted, isLocked, lockReason, aiGenStatus, todayPlanDay } = data;
  const totalDays = enrollment.totalDays;
  const hasPrev = dayNumber > 1;
  const hasNext = dayNumber < totalDays;
  const completedCount = items.filter((i: any) => i.isCompleted).length;
  const totalItems     = items.length;

  const dayDate = new Date(data.dayDate);
  const dayLabel = dayDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

  return (
    <div style={{ padding: '24px 28px 60px', width: '100%' }}>

      {/* Back nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/my-learning')}
          style={{ background: 'none', border: '1.5px solid #e2e8f0', borderRadius: '7px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px', color: '#475569' }}
        >
          ← My Plans
        </button>
        <span style={{ color: '#94a3b8', fontSize: '13px' }}>{enrollment.curriculumTitle}</span>
      </div>

      {/* Day header */}
      <div style={{
        background: isDayCompleted ? '#f0fdf4' : isLocked ? '#f8fafc' : '#fff',
        borderRadius: '12px', border: `1.5px solid ${isDayCompleted ? '#86efac' : '#e2e8f0'}`,
        padding: '20px', marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
                Day {dayNumber}
              </h2>
              {isDayCompleted && (
                <span style={{ background: '#dcfce7', color: '#15803d', borderRadius: '12px', padding: '3px 12px', fontSize: '13px', fontWeight: 600 }}>
                  ✓ Completed
                </span>
              )}
              {isLocked && (
                <span style={{ background: '#f1f5f9', color: '#64748b', borderRadius: '12px', padding: '3px 12px', fontSize: '13px', fontWeight: 600 }}>
                  🔒 Locked
                </span>
              )}
              {dayNumber === todayPlanDay && !isDayCompleted && (
                <span style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: '12px', padding: '3px 12px', fontSize: '13px', fontWeight: 600 }}>
                  📅 Today
                </span>
              )}
            </div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>{dayLabel}</div>
            {topic && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: topic.color }} />
                <span style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>{topic.title}</span>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Days {topic.startDay}–{topic.endDay}</span>
              </div>
            )}
          </div>

          {/* Overall progress */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
              {completedCount}/{totalItems} items · Day {dayNumber}/{totalDays}
            </div>
            <div style={{ width: '160px', height: '6px', background: '#f1f5f9', borderRadius: '3px' }}>
              <div style={{
                height: '6px', background: '#3b82f6', borderRadius: '3px',
                width: `${totalDays > 0 ? Math.round((enrollment.completedDays?.length / totalDays) * 100) : 0}%`,
              }} />
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
              {enrollment.completedDays?.length || 0} days done overall
            </div>
          </div>
        </div>
      </div>

      {/* Day nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button
          onClick={() => navigate(`/my-learning/${enrollmentId}/day/${dayNumber - 1}`)}
          disabled={!hasPrev}
          style={{
            padding: '8px 16px', border: '1.5px solid #e2e8f0', borderRadius: '7px',
            background: '#fff', color: hasPrev ? '#374151' : '#cbd5e1',
            cursor: hasPrev ? 'pointer' : 'not-allowed', fontWeight: 600, fontSize: '13px',
          }}
        >
          ← Day {dayNumber - 1}
        </button>

        {/* Jump to today */}
        {todayPlanDay && todayPlanDay !== dayNumber && (
          <button
            onClick={() => navigate(`/my-learning/${enrollmentId}/day/${todayPlanDay}`)}
            style={{
              padding: '8px 16px', border: '1.5px solid #bfdbfe', borderRadius: '7px',
              background: '#eff6ff', color: '#2563eb', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
            }}
          >
            📅 Today (Day {todayPlanDay})
          </button>
        )}

        <button
          onClick={() => navigate(`/my-learning/${enrollmentId}/day/${dayNumber + 1}`)}
          disabled={!hasNext}
          style={{
            padding: '8px 16px', border: '1.5px solid #e2e8f0', borderRadius: '7px',
            background: '#fff', color: hasNext ? '#374151' : '#cbd5e1',
            cursor: hasNext ? 'pointer' : 'not-allowed', fontWeight: 600, fontSize: '13px',
          }}
        >
          Day {dayNumber + 1} →
        </button>
      </div>

      {/* Content items */}
      {isLocked ? (
        lockReason === 'preview' ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', background: 'linear-gradient(135deg,#f6f4ff,#eafaf7)', borderRadius: '12px', border: '1px solid #e6e2fb' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔒</div>
            <h3 style={{ color: '#0f172a', margin: '0 0 6px' }}>This day is part of your full plan</h3>
            <p style={{ color: '#475569', margin: '0 auto 18px', maxWidth: 460 }}>
              You're on the free preview. Unlock your full personalized plan to continue — every lesson, DSA problem, mock interview, project, mentor support &amp; placement.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => alert('Online unlock (Razorpay) — coming with the paywall.')} style={{ background: 'linear-gradient(90deg,#6650d8,#14a89c)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Unlock full plan</button>
              <button onClick={() => alert('A mentor will reach out to you shortly.')} style={{ background: '#fff', color: '#6650d8', border: '1.5px solid #6650d8', borderRadius: 10, padding: '11px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Talk to a mentor</button>
            </div>
          </div>
        ) : lockReason === 'schedule' ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: '#f8fafc', borderRadius: '12px', border: '1.5px dashed #e2e8f0' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🗓️</div>
            <h3 style={{ color: '#0f172a', margin: '0 0 8px' }}>Day {dayNumber} unlocks soon</h3>
            <p style={{ color: '#64748b', margin: 0 }}>
              Your batch is currently on Day {todayPlanDay ?? '—'}. This day opens when the class reaches it — you can revisit any earlier day anytime to catch up.
            </p>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: '#f8fafc', borderRadius: '12px', border: '1.5px dashed #e2e8f0' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔒</div>
            <h3 style={{ color: '#0f172a', margin: '0 0 8px' }}>Day {dayNumber} is Locked</h3>
            <p style={{ color: '#64748b', margin: 0 }}>Complete the required items in Day {dayNumber - 1} to unlock this day.</p>
          </div>
        )
      ) : items.length === 0 ? (
        aiGenStatus === 'generating' ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: 'linear-gradient(135deg,#f6f4ff,#eafaf7)', borderRadius: '12px', border: '1px solid #e6e2fb' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✨</div>
            <h3 style={{ color: '#0f172a', margin: '0 0 8px' }}>Preparing your personalized lesson…</h3>
            <p style={{ color: '#64748b', margin: 0 }}>Building your lesson, interview Q&amp;A and coding practice for this day. This takes ~30–60s and refreshes automatically.</p>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: '#f8fafc', borderRadius: '12px', border: '1.5px dashed #e2e8f0' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
            <h3 style={{ color: '#0f172a', margin: '0 0 8px' }}>No content for this day</h3>
            <p style={{ color: '#64748b', margin: 0 }}>Content for Day {dayNumber} isn't available yet.</p>
          </div>
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {items.map((item: any, idx: number) => (
            (item.kind && item.kind !== 'content') ? (
              <ModuleItemCard key={idx} item={item} />
            ) : (
              <ContentItemCard
                key={idx}
                item={item}
                enrollmentId={enrollmentId!}
                dayNumber={dayNumber}
                isLocked={false}
                onComplete={handleItemComplete}
              />
            )
          ))}
          {isDayCompleted && (
            <div style={{
              textAlign: 'center', padding: '20px',
              background: '#f0fdf4', borderRadius: '10px', border: '1px solid #86efac',
              color: '#15803d', fontWeight: 600, fontSize: '15px',
            }}>
              🎉 Day {dayNumber} complete! {hasNext ? 'Ready for the next day.' : 'You\'ve reached the end of the curriculum!'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
