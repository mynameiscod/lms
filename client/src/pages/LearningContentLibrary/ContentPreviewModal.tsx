import React, { useEffect, useState } from 'react';
import { learningContentLibraryApi, CONTENT_TYPE_LABELS, CONTENT_TYPE_ICONS, CONTENT_TYPE_COLORS, ContentLibraryItem } from '../../api/learningContentLibraryApi';
import { VideoPlayer, NotesViewer, QAViewer, PracticeViewer } from '../MyLearningPlan/DayView';
import InteractiveActivityViewer from '../MyLearningPlan/InteractiveActivityViewer';

// Admin preview of a content library item — renders it with the EXACT same components
// students see in their DayView, so "how it looks for students" is guaranteed identical.
const ContentPreviewModal: React.FC<{ contentId: string; onClose: () => void }> = ({ contentId, onClose }) => {
  const [content, setContent] = useState<ContentLibraryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await learningContentLibraryApi.getById(contentId);
        if (alive) setContent(data);
      } catch (e: any) {
        if (alive) setErr(e?.response?.data?.message || 'Failed to load content');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [contentId]);

  const c: any = content;
  const renderBody = () => {
    if (!c) return null;
    switch (c.type) {
      case 'video':
        return <VideoPlayer content={c} onWatchEnough={() => {}} />;
      case 'notes':
        return <NotesViewer content={c} />;
      case 'tech_qa':
      case 'behavioral_qa':
        return <QAViewer content={c} />;
      case 'practice_coding':
      case 'practice_theory':
      case 'aptitude':
        return <PracticeViewer content={c} />;
      case 'interactive_activity':
        return c.htmlContent
          ? <InteractiveActivityViewer htmlContent={c.htmlContent} completed={false} onComplete={() => {}} />
          : <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>No activity content.</div>;
      case 'interactive_lesson':
        return (
          <div style={{ textAlign: 'center', padding: '30px 20px', background: '#f8fafc', borderRadius: 10, border: '1px dashed #e2e8f0' }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>🎬</div>
            <p style={{ color: '#475569', margin: '0 0 14px' }}>This is a multi-scene interactive lesson. Open it in the full lesson player to preview.</p>
            {c.conceptLessonId && (
              <a href={`/interactive-lesson/${c.conceptLessonId}`} target="_blank" rel="noopener noreferrer"
                style={{ background: '#6366f1', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '9px 16px', fontWeight: 700, fontSize: 14 }}>
                ▶ Open lesson player
              </a>
            )}
          </div>
        );
      default:
        return <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>Preview not available for this type.</div>;
    }
  };

  const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', zIndex: 5000, display: 'grid', placeItems: 'center', padding: 20 };
  const card: React.CSSProperties = { background: '#fff', borderRadius: 16, width: 'min(860px, 96vw)', maxHeight: '92vh', overflow: 'auto', boxShadow: '0 24px 70px rgba(15,23,42,.4)' };
  const tint = c ? (CONTENT_TYPE_COLORS[c.type as keyof typeof CONTENT_TYPE_COLORS] || '#6366f1') : '#6366f1';

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={e => e.stopPropagation()}>
        <div style={{ position: 'sticky', top: 0, background: '#fff', borderBottom: '1px solid #eef1f6', padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, zIndex: 2 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', letterSpacing: .6 }}>STUDENT PREVIEW</span>
              <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700, background: '#ecfdf5', padding: '2px 8px', borderRadius: 20 }}>👁 Exactly what students see</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 3 }}>{c?.title || (loading ? 'Loading…' : 'Content')}</div>
            {c && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, background: `${tint}18`, color: tint, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                <span>{CONTENT_TYPE_ICONS[c.type as keyof typeof CONTENT_TYPE_ICONS]}</span>
                <span>{CONTENT_TYPE_LABELS[c.type as keyof typeof CONTENT_TYPE_LABELS]}</span>
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ border: 'none', background: '#f1f5f9', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: '#475569', flexShrink: 0 }}>✕</button>
        </div>

        <div style={{ padding: '16px 22px 26px' }}>
          {loading && <p style={{ color: '#64748b' }}>Loading preview…</p>}
          {err && <p style={{ color: '#dc2626' }}>{err}</p>}
          {c?.description && <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>{c.description}</p>}
          {renderBody()}
        </div>
      </div>
    </div>
  );
};

export default ContentPreviewModal;
