import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  learningContentLibraryApi,
  ContentLibraryItem,
  ContentLibraryType,
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_ICONS,
  CONTENT_TYPE_COLORS,
} from '../../api/learningContentLibraryApi';
import { interactiveLessonApi } from '../../api/interactiveLessonApi';
import ContentPreviewModal from './ContentPreviewModal';

const ALL_TYPES: { key: ContentLibraryType | 'all'; label: string; icon: string }[] = [
  { key: 'all',               label: 'All',              icon: '📚' },
  { key: 'video',             label: 'Videos',           icon: '🎬' },
  { key: 'notes',             label: 'Notes',            icon: '📄' },
  { key: 'tech_qa',           label: 'Tech Q&A',         icon: '💻' },
  { key: 'behavioral_qa',     label: 'Behavioral Q&A',   icon: '🤝' },
  { key: 'practice_coding',   label: 'Practice Coding',  icon: '⌨️' },
  { key: 'practice_theory',   label: 'Practice Theory',  icon: '📝' },
  { key: 'aptitude',          label: 'Aptitude',         icon: '🧠' },
  { key: 'interactive_lesson',label: 'Interactive',      icon: '🎮' },
];

export default function LearningContentLibrary() {
  const navigate = useNavigate();

  const [items,       setItems]       = useState<ContentLibraryItem[]>([]);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [activeType,  setActiveType]  = useState<ContentLibraryType | 'all'>('all');
  const [sourceView,  setSourceView]  = useState<'curriculum' | 'generated'>('curriculum');
  const [search,      setSearch]      = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [topicTags,   setTopicTags]   = useState<string[]>([]);
  const [deleting,    setDeleting]    = useState<string | null>(null);
  const [toggling,    setToggling]    = useState<string | null>(null);
  const [previewId,   setPreviewId]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (activeType !== 'all') filters.type  = activeType;
      if (search)               filters.search = search;
      if (topicFilter)          filters.topic  = topicFilter;
      if (sourceView === 'generated') filters.source = 'generated';
      const res = await learningContentLibraryApi.list(filters);
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeType, search, topicFilter, sourceView]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    learningContentLibraryApi.getTopicTags()
      .then(setTopicTags)
      .catch(() => {});
  }, []);

  const handleDelete = async (item: ContentLibraryItem) => {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    setDeleting(item._id);
    try {
      await learningContentLibraryApi.delete(item._id);
      setItems(prev => prev.filter(i => i._id !== item._id));
      setTotal(prev => prev - 1);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const handleTogglePublish = async (item: ContentLibraryItem) => {
    setToggling(item._id);
    try {
      const res = await learningContentLibraryApi.togglePublish(item._id);
      // Sync publish state to the InteractiveLesson document as well
      if (item.type === 'interactive_lesson' && item.conceptLessonId) {
        await interactiveLessonApi.update(item.conceptLessonId, { isPublished: res.isPublished });
      }
      setItems(prev =>
        prev.map(i => i._id === item._id ? { ...i, isPublished: res.isPublished } : i)
      );
    } catch (e) {
      alert('Failed to update publish status');
    } finally {
      setToggling(null);
    }
  };

  const fmtDuration = (mins: number) => {
    if (!mins) return '—';
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const counts: Record<string, number> = { all: total };
  items.forEach(i => { counts[i.type] = (counts[i.type] || 0) + 1; });

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
            📚 Content Library
          </h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
            Reusable content for your 145-day learning plans
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => navigate('/live-class')}
            style={{
              background: '#16a34a', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '10px 20px',
              fontWeight: 600, fontSize: '14px', cursor: 'pointer',
            }}
          >
            🎥 Live Class
          </button>
          <button
            onClick={() => navigate('/learning-library/record')}
            style={{
              background: '#dc2626', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '10px 20px',
              fontWeight: 600, fontSize: '14px', cursor: 'pointer',
            }}
          >
            🔴 Record Class
          </button>
          <button
            onClick={() => navigate('/interactive-lessons/new')}
            style={{
              background: '#ec4899', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '10px 20px',
              fontWeight: 600, fontSize: '14px', cursor: 'pointer',
            }}
          >
            🎮 New Interactive Lesson
          </button>
          <button
            onClick={() => navigate('/learning-library/create')}
            style={{
              background: '#0f172a', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '10px 20px',
              fontWeight: 600, fontSize: '14px', cursor: 'pointer',
            }}
          >
            + Add Content
          </button>
        </div>
      </div>

      {/* Source toggle — keep CareerPilot's auto-generated content out of the curriculum view */}
      <div style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: 10, padding: 3, marginBottom: 14 }}>
        {([['curriculum', '📚 Curriculum content'], ['generated', '🤖 AI-generated (CareerPilot)']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setSourceView(k)}
            style={{ border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              background: sourceView === k ? '#fff' : 'transparent', color: sourceView === k ? '#0f172a' : '#64748b',
              boxShadow: sourceView === k ? '0 1px 3px rgba(0,0,0,.1)' : 'none' }}>
            {label}
          </button>
        ))}
      </div>
      {sourceView === 'generated' && (
        <div style={{ fontSize: 12.5, color: '#64748b', background: '#eef2ff', border: '1px solid #e0e7ff', borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>
          These lessons are auto-generated by the CareerPilot assessment funnel and are hidden from the Curriculum Builder to keep your offline-class content clean.
        </div>
      )}

      {/* Type tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {ALL_TYPES.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveType(t.key as any)}
            style={{
              padding: '7px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', border: '1.5px solid',
              borderColor: activeType === t.key ? '#0f172a' : '#e2e8f0',
              background: activeType === t.key ? '#0f172a' : '#fff',
              color: activeType === t.key ? '#fff' : '#475569',
              transition: 'all 0.15s',
            }}
          >
            {t.icon} {t.label}
            {counts[t.key] !== undefined && (
              <span style={{
                marginLeft: '6px', background: activeType === t.key ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                color: activeType === t.key ? '#fff' : '#64748b',
                borderRadius: '10px', padding: '1px 7px', fontSize: '11px',
              }}>
                {t.key === 'all' ? total : (items.filter(i => i.type === t.key).length)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by title, tag..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: '200px', padding: '9px 14px',
            border: '1.5px solid #e2e8f0', borderRadius: '8px',
            fontSize: '14px', outline: 'none',
          }}
        />
        <select
          value={topicFilter}
          onChange={e => setTopicFilter(e.target.value)}
          style={{
            padding: '9px 14px', border: '1.5px solid #e2e8f0',
            borderRadius: '8px', fontSize: '14px', minWidth: '180px', background: '#fff',
          }}
        >
          <option value="">All Topics</option>
          {topicTags.map(tag => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>
      </div>

      {/* Content grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
          Loading content library...
        </div>
      ) : items.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '80px 24px',
          background: '#f8fafc', borderRadius: '12px',
          border: '1.5px dashed #e2e8f0',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
          <h3 style={{ color: '#0f172a', margin: '0 0 8px' }}>No content yet</h3>
          <p style={{ color: '#64748b', margin: '0 0 20px' }}>
            Add your first content item to the library.
          </p>
          <button
            onClick={() => navigate('/learning-library/create')}
            style={{
              background: '#0f172a', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '10px 20px',
              fontWeight: 600, fontSize: '14px', cursor: 'pointer',
            }}
          >
            + Add Content
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px',
        }}>
          {items.map(item => (
            <ContentCard
              key={item._id}
              item={item}
              onEdit={() => item.type === 'interactive_lesson'
                ? navigate(`/interactive-lessons/edit/${item.conceptLessonId || item._id}`)
                : navigate(`/learning-library/edit/${item._id}`)
              }
              onPreview={() => setPreviewId(item._id)}
              onDelete={() => handleDelete(item)}
              onTogglePublish={() => handleTogglePublish(item)}
              isDeleting={deleting === item._id}
              isToggling={toggling === item._id}
              fmtDuration={fmtDuration}
            />
          ))}
        </div>
      )}

      {previewId && <ContentPreviewModal contentId={previewId} onClose={() => setPreviewId(null)} />}
    </div>
  );
}

interface CardProps {
  item: ContentLibraryItem;
  onEdit: () => void;
  onPreview: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
  isDeleting: boolean;
  isToggling: boolean;
  fmtDuration: (m: number) => string;
}

function ContentCard({ item, onEdit, onPreview, onDelete, onTogglePublish, isDeleting, isToggling, fmtDuration }: CardProps) {
  const color  = CONTENT_TYPE_COLORS[item.type] || '#64748b';
  const icon   = CONTENT_TYPE_ICONS[item.type]  || '📄';
  const label  = CONTENT_TYPE_LABELS[item.type] || item.type;

  return (
    <div style={{
      background: '#fff', borderRadius: '12px',
      border: '1.5px solid #e2e8f0',
      overflow: 'hidden',
      transition: 'box-shadow 0.15s',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      {/* Color band */}
      <div style={{ height: '4px', background: color }} />

      {/* Video thumbnail */}
      {item.type === 'video' && item.videoThumbnail && (
        <div style={{ height: '150px', background: '#0f172a', overflow: 'hidden', position: 'relative' }}>
          <img src={item.videoThumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }} />
          <span style={{ position: 'absolute', right: '8px', bottom: '8px', background: 'rgba(0,0,0,.6)', color: '#fff', borderRadius: '6px', padding: '2px 8px', fontSize: '12px', fontWeight: 600 }}>▶ Video</span>
        </div>
      )}

      <div style={{ padding: '16px' }}>
        {/* Type badge + publish toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            background: `${color}15`, color, borderRadius: '6px',
            padding: '3px 10px', fontSize: '12px', fontWeight: 600,
          }}>
            {icon} {label}
          </span>
          <button
            onClick={onTogglePublish}
            disabled={isToggling}
            title={item.isPublished ? 'Click to unpublish' : 'Click to publish'}
            style={{
              background: item.isPublished ? '#dcfce7' : '#f1f5f9',
              color:      item.isPublished ? '#16a34a' : '#94a3b8',
              border: 'none', borderRadius: '12px',
              padding: '3px 10px', fontSize: '12px', fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isToggling ? '...' : item.isPublished ? '● Published' : '○ Draft'}
          </button>
        </div>

        {/* Title */}
        <h3 style={{
          margin: '0 0 6px', fontSize: '15px', fontWeight: 700,
          color: '#0f172a', lineHeight: 1.3,
        }}>
          {item.title}
        </h3>

        {/* Description */}
        {item.description && (
          <p style={{
            margin: '0 0 10px', fontSize: '13px', color: '#64748b',
            lineHeight: 1.5, overflow: 'hidden',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {item.description}
          </p>
        )}

        {/* Tags */}
        {item.topicTags?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
            {item.topicTags.slice(0, 4).map(tag => (
              <span key={tag} style={{
                background: '#f1f5f9', color: '#475569',
                borderRadius: '4px', padding: '2px 8px', fontSize: '11px',
              }}>
                {tag}
              </span>
            ))}
            {item.topicTags.length > 4 && (
              <span style={{ color: '#94a3b8', fontSize: '11px', padding: '2px 4px' }}>
                +{item.topicTags.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Stats row */}
        <div style={{
          display: 'flex', gap: '16px',
          borderTop: '1px solid #f1f5f9', paddingTop: '10px',
          marginTop: '4px', fontSize: '12px', color: '#94a3b8',
        }}>
          {item.estimatedDuration > 0 && (
            <span>⏱ {fmtDuration(item.estimatedDuration)}</span>
          )}
          {item.usageCount > 0 && (
            <span>📋 Used in {item.usageCount} plan{item.usageCount !== 1 ? 's' : ''}</span>
          )}
          {item.viewCount > 0 && (
            <span>👁 {item.viewCount} views</span>
          )}
          {item.difficulty && (
            <span style={{ textTransform: 'capitalize' }}>
              {item.difficulty === 'beginner' ? '🟢' : item.difficulty === 'intermediate' ? '🟡' : '🔴'}{' '}
              {item.difficulty}
            </span>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button
            onClick={onPreview}
            title="Preview exactly how students see this"
            style={{
              flex: 1, padding: '8px', border: '1.5px solid #c7d2fe',
              borderRadius: '7px', background: '#eef2ff', color: '#4f46e5',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            👁️ Preview
          </button>
          <button
            onClick={onEdit}
            style={{
              flex: 1, padding: '8px', border: '1.5px solid #e2e8f0',
              borderRadius: '7px', background: '#fff', color: '#374151',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            ✏️ Edit
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            style={{
              padding: '8px 12px', border: '1.5px solid #fecaca',
              borderRadius: '7px', background: '#fff', color: '#dc2626',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            {isDeleting ? '...' : '🗑'}
          </button>
        </div>
      </div>
    </div>
  );
}
