import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  curriculumApi,
  Curriculum,
  CurriculumTopic,
  DayPlan,
  DayContentItem,
  DayActivityKind,
  WeekendPlan,
  WEEKEND_TYPE_LABELS,
  SLOT_LABELS,
} from '../../api/curriculumApi';
import {
  learningContentLibraryApi,
  CONTENT_TYPE_ICONS,
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_COLORS,
} from '../../api/learningContentLibraryApi';

type Tab = 'overview' | 'topics' | 'daily' | 'weekend';

const TOPIC_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#0ea5e9','#f97316'];

// A picked activity normalized from either the content library or a module bank.
export interface PickedActivity {
  kind: DayActivityKind;
  id: string;             // contentId (content) or module sourceId
  title: string;
  contentType: string;    // library type, or the kind (for modules)
  sourceModel?: string;
  estimatedDuration?: number;
}

const KIND_TABS: { kind: DayActivityKind; label: string; icon: string }[] = [
  { kind: 'content',       label: 'Library',        icon: '📚' },
  { kind: 'quiz',          label: 'Quiz',           icon: '📝' },
  { kind: 'assignment',    label: 'Assignment',     icon: '📋' },
  { kind: 'codeSnippet',   label: 'Code Snippet',   icon: '⌨️' },
  { kind: 'mockInterview', label: 'Mock Interview', icon: '🎤' },
];
const KIND_ICON: Record<string, string> = { content: '📄', quiz: '📝', assignment: '📋', codeSnippet: '⌨️', mockInterview: '🎤' };
const KIND_COLOR: Record<string, string> = { content: '#64748b', quiz: '#7c3aed', assignment: '#2563eb', codeSnippet: '#0ea5e9', mockInterview: '#f59e0b' };

// ─── Activity Picker Modal (content library + standalone modules) ───────────────

interface PickerModalProps {
  onSelect: (item: PickedActivity) => void;
  onClose: () => void;
}

function ActivityPickerModal({ onSelect, onClose }: PickerModalProps) {
  const [activeKind, setActiveKind] = useState<DayActivityKind>('content');
  const [rows, setRows]       = useState<PickedActivity[]>([]);
  const [search, setSearch]   = useState('');
  const [typeFilter, setType] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (activeKind === 'content') {
        const res = await learningContentLibraryApi.list({
          search: search || undefined,
          type: (typeFilter as any) || undefined,
          published: 'true',
        });
        setRows(res.items.map(i => ({
          kind: 'content', id: i._id, title: i.title, contentType: i.type, estimatedDuration: i.estimatedDuration || 0,
        })));
      } else {
        const items = await curriculumApi.activityBank(activeKind, search || undefined);
        setRows(items.map(i => ({
          kind: activeKind, id: i.id, title: i.title, contentType: activeKind, sourceModel: i.sourceModel,
        })));
      }
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [activeKind, search, typeFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff', borderRadius: '12px', width: '680px', maxHeight: '82vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{ padding: '18px 20px 0', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Add Activity to Day</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#64748b' }}>×</button>
          </div>
          {/* Source tabs */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {KIND_TABS.map(t => (
              <button
                key={t.kind}
                onClick={() => { setActiveKind(t.kind); setSearch(''); setType(''); }}
                style={{
                  padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer',
                  fontWeight: 600, fontSize: '13px',
                  color: activeKind === t.kind ? '#0f172a' : '#64748b',
                  borderBottom: activeKind === t.kind ? '2px solid #0f172a' : '2px solid transparent',
                  marginBottom: '-1px',
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '12px 20px', display: 'flex', gap: '8px' }}>
          <input
            autoFocus
            type="text"
            placeholder={`Search ${KIND_TABS.find(t => t.kind === activeKind)?.label.toLowerCase()}...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', outline: 'none' }}
          />
          {activeKind === 'content' && (
            <select
              value={typeFilter}
              onChange={e => setType(e.target.value)}
              style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px' }}
            >
              <option value="">All Types</option>
              <option value="interactive_lesson">🎮 Interactive Lesson</option>
              <option value="video">🎬 Video</option>
              <option value="notes">📄 Notes</option>
              <option value="tech_qa">💻 Tech Q&A</option>
              <option value="behavioral_qa">🤝 Behavioral Q&A</option>
              <option value="practice_coding">⌨️ Practice Coding</option>
              <option value="practice_theory">📝 Practice Theory</option>
              <option value="aptitude">🧠 Aptitude</option>
            </select>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading...</div>
          ) : rows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              {activeKind === 'content' ? 'No published content found' : `No ${KIND_TABS.find(t => t.kind === activeKind)?.label.toLowerCase()}s found`}
            </div>
          ) : (
            rows.map(item => {
              const isContent = item.kind === 'content';
              const color = isContent ? (CONTENT_TYPE_COLORS[item.contentType as any] || '#64748b') : KIND_COLOR[item.kind];
              const icon  = isContent ? (CONTENT_TYPE_ICONS[item.contentType as any]  || '📄') : KIND_ICON[item.kind];
              const label = isContent ? (CONTENT_TYPE_LABELS[item.contentType as any] || item.contentType) : (KIND_TABS.find(t => t.kind === item.kind)?.label || item.kind);
              return (
                <div
                  key={`${item.kind}-${item.id}`}
                  onClick={() => onSelect(item)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                    border: '1.5px solid transparent', marginBottom: '4px',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '8px',
                    background: `${color}15`, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '16px', flexShrink: 0,
                  }}>
                    {icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {label}{isContent && item.estimatedDuration ? ` · ${item.estimatedDuration}m` : ''}
                    </div>
                  </div>
                  <span style={{ background: `${color}15`, color, borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 600, flexShrink: 0 }}>
                    + Add
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Day Content Row ───────────────────────────────────────────────────────────

interface DayContentRowProps {
  item: DayContentItem;
  onRemove: () => void;
  onChange: (updated: DayContentItem) => void;
}

function DayContentRow({ item, onRemove, onChange }: DayContentRowProps) {
  const kind = item.kind || 'content';
  const isContent = kind === 'content';
  const color = isContent ? (CONTENT_TYPE_COLORS[item.contentType as any] || '#64748b') : KIND_COLOR[kind];
  const icon  = isContent ? (CONTENT_TYPE_ICONS[item.contentType as any]  || '📄') : KIND_ICON[kind];
  const kindLabel = KIND_TABS.find(t => t.kind === kind)?.label || kind;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '8px 10px', background: '#f8fafc',
      borderRadius: '8px', marginBottom: '4px',
      border: '1px solid #e2e8f0',
    }}>
      <span style={{ fontSize: '14px', flexShrink: 0 }}>{icon}</span>
      {!isContent && (
        <span style={{ background: `${color}15`, color, borderRadius: '5px', padding: '1px 7px', fontSize: '10px', fontWeight: 700, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          {kindLabel}
        </span>
      )}
      <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.contentTitle}
      </span>
      <select
        value={item.slot}
        onChange={e => onChange({ ...item, slot: e.target.value as any })}
        style={{ padding: '3px 6px', border: '1px solid #e2e8f0', borderRadius: '5px', fontSize: '12px', background: '#fff' }}
      >
        {Object.entries(SLOT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b', flexShrink: 0 }}>
        <input
          type="checkbox"
          checked={item.isGating}
          onChange={e => onChange({ ...item, isGating: e.target.checked })}
        />
        Gating
      </label>
      <button
        onClick={onRemove}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '14px', padding: '0 4px', flexShrink: 0 }}
      >
        ×
      </button>
    </div>
  );
}

// ─── Main Builder Page ─────────────────────────────────────────────────────────

export default function BuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isCreate = !id || id === 'create';

  const [tab, setTab]                   = useState<Tab>('overview');
  const [curriculum, setCurriculum]     = useState<Partial<Curriculum>>({ totalDays: 145, topics: [] });
  const [dayPlans, setDayPlans]         = useState<DayPlan[]>([]);
  const [weekendPlans, setWeekendPlans] = useState<WeekendPlan[]>([]);
  const [loading, setLoading]           = useState(!isCreate);
  const [saving, setSaving]             = useState(false);

  // Topic editor state
  const [editTopicIdx, setEditTopicIdx] = useState<number | null>(null);
  const [topicDraft, setTopicDraft]     = useState<Partial<CurriculumTopic>>({});

  // Day planner state
  const [activeTopic, setActiveTopic]   = useState<CurriculumTopic | null>(null);
  const [pickerDay, setPickerDay]       = useState<number | null>(null);
  const [dayPlanDrafts, setDayPlanDrafts] = useState<Record<number, DayPlan>>({});
  const [savingDay, setSavingDay]       = useState<number | null>(null);

  // Weekend planner state
  const [pickerWeekend, setPickerWeekend] = useState<{ week: number; day: 'saturday' | 'sunday' } | null>(null);
  const [weekendDrafts, setWeekendDrafts] = useState<Record<string, WeekendPlan>>({});
  const [savingWeekend, setSavingWeekend] = useState<string | null>(null);

  // Content picker
  const [showPicker, setShowPicker]     = useState(false);

  // ── Load existing curriculum ──────────────────────────────────────────────
  useEffect(() => {
    if (isCreate) return;
    (async () => {
      setLoading(true);
      try {
        const [cur, days, weekends] = await Promise.all([
          curriculumApi.getById(id!),
          curriculumApi.getDayPlans(id!),
          curriculumApi.getWeekendPlans(id!),
        ]);
        setCurriculum(cur);
        setDayPlans(days);
        setWeekendPlans(weekends);
        if ((cur.topics || []).length > 0) {
          setActiveTopic(cur.topics[0]);
        }
        // Seed drafts
        const dm: Record<number, DayPlan> = {};
        days.forEach(dp => { dm[dp.dayNumber] = dp; });
        setDayPlanDrafts(dm);
        const wm: Record<string, WeekendPlan> = {};
        weekends.forEach(wp => { wm[`${wp.weekNumber}-${wp.dayOfWeek}`] = wp; });
        setWeekendDrafts(wm);
      } catch {
        alert('Failed to load curriculum');
        navigate('/curriculum-builder');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isCreate]);

  // ── Save overview ─────────────────────────────────────────────────────────
  const saveOverview = async () => {
    if (!curriculum.title?.trim()) { alert('Title is required'); return; }
    setSaving(true);
    try {
      if (isCreate) {
        const created = await curriculumApi.create(curriculum);
        navigate(`/curriculum-builder/${created._id}`, { replace: true });
      } else {
        const updated = await curriculumApi.update(id!, curriculum);
        setCurriculum(updated);
        alert('Saved!');
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // ── Topics ────────────────────────────────────────────────────────────────
  const saveTopics = async () => {
    if (isCreate) { alert('Save the overview first to get a curriculum ID'); return; }
    setSaving(true);
    try {
      const updated = await curriculumApi.update(id!, { topics: curriculum.topics });
      setCurriculum(prev => ({ ...prev, topics: updated.topics }));
      alert('Topics saved!');
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to save topics');
    } finally {
      setSaving(false);
    }
  };

  const addTopic = () => {
    const topics = curriculum.topics || [];
    const lastEnd = topics.reduce((max, t) => Math.max(max, t.endDay), 0);
    setTopicDraft({
      title: '',
      order: topics.length,
      startDay: lastEnd + 1,
      endDay: lastEnd + 14,
      color: TOPIC_COLORS[topics.length % TOPIC_COLORS.length],
    });
    setEditTopicIdx(-1); // -1 = new
  };

  const saveTopic = () => {
    if (!topicDraft.title?.trim()) { alert('Topic title required'); return; }
    if (!topicDraft.startDay || !topicDraft.endDay || topicDraft.startDay > topicDraft.endDay) {
      alert('End day must be ≥ start day'); return;
    }
    const topics = [...(curriculum.topics || [])];
    if (editTopicIdx === -1) {
      topics.push({ ...topicDraft, order: topics.length } as CurriculumTopic);
    } else {
      topics[editTopicIdx!] = { ...topics[editTopicIdx!], ...topicDraft };
    }
    setCurriculum(prev => ({ ...prev, topics }));
    setEditTopicIdx(null);
    setTopicDraft({});
  };

  const removeTopic = (idx: number) => {
    if (!window.confirm('Remove this topic?')) return;
    const topics = (curriculum.topics || []).filter((_, i) => i !== idx);
    setCurriculum(prev => ({ ...prev, topics }));
  };

  // ── Day plan helpers ──────────────────────────────────────────────────────
  const getDayDraft = (day: number): DayPlan => {
    return dayPlanDrafts[day] || {
      _id: '', curriculumId: id || '', topicId: activeTopic?._id || '',
      dayNumber: day, items: [],
    };
  };

  const saveDayPlan = async (day: number) => {
    if (!id) return;
    const draft = getDayDraft(day);
    setSavingDay(day);
    try {
      const saved = await curriculumApi.upsertDayPlan(id, day, {
        topicId: draft.topicId,
        title: draft.title,
        notes: draft.notes,
        items: draft.items,
      });
      setDayPlanDrafts(prev => ({ ...prev, [day]: saved }));
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to save day');
    } finally {
      setSavingDay(null);
    }
  };

  const pickedToItem = (p: PickedActivity, order: number): DayContentItem => ({
    kind: p.kind,
    contentId: p.kind === 'content' ? p.id : undefined,
    sourceModel: p.kind === 'content' ? undefined : p.sourceModel,
    sourceId: p.kind === 'content' ? undefined : p.id,
    contentTitle: p.title,
    contentType: p.kind === 'content' ? p.contentType : p.kind,
    slot: 'anytime',
    isGating: false,
    required: true,
    points: 0,
    order,
    estimatedDuration: p.estimatedDuration || 0,
  });

  const isDuplicate = (items: DayContentItem[], p: PickedActivity) =>
    items.some(i => p.kind === 'content' ? (i.kind || 'content') === 'content' && i.contentId === p.id : i.sourceId === p.id);

  const addContentToDay = (day: number, p: PickedActivity) => {
    setDayPlanDrafts(prev => {
      const existing = prev[day] || getDayDraft(day);
      if (isDuplicate(existing.items, p)) return prev;
      const newItem = pickedToItem(p, existing.items.length);
      return { ...prev, [day]: { ...existing, items: [...existing.items, newItem] } };
    });
    setShowPicker(false);
    setPickerDay(null);
  };

  const removeContentFromDay = (day: number, idx: number) => {
    setDayPlanDrafts(prev => {
      const existing = prev[day] || getDayDraft(day);
      const items = existing.items.filter((_, i) => i !== idx);
      return { ...prev, [day]: { ...existing, items } };
    });
  };

  const updateDayItem = (day: number, idx: number, updated: DayContentItem) => {
    setDayPlanDrafts(prev => {
      const existing = prev[day] || getDayDraft(day);
      const items = existing.items.map((it, i) => i === idx ? updated : it);
      return { ...prev, [day]: { ...existing, items } };
    });
  };

  // ── Weekend plan helpers ───────────────────────────────────────────────────
  const weekKey = (week: number, day: 'saturday' | 'sunday') => `${week}-${day}`;

  const getWeekendDraft = (week: number, day: 'saturday' | 'sunday'): WeekendPlan => {
    return weekendDrafts[weekKey(week, day)] || {
      _id: '', curriculumId: id || '', weekNumber: week, dayOfWeek: day, type: 'rest', items: [],
    };
  };

  const saveWeekendPlan = async (week: number, day: 'saturday' | 'sunday') => {
    if (!id) return;
    const key = weekKey(week, day);
    const draft = getWeekendDraft(week, day);
    setSavingWeekend(key);
    try {
      const saved = await curriculumApi.upsertWeekendPlan(id, week, day, draft);
      setWeekendDrafts(prev => ({ ...prev, [key]: saved }));
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to save weekend plan');
    } finally {
      setSavingWeekend(null);
    }
  };

  const addContentToWeekend = (week: number, day: 'saturday' | 'sunday', p: PickedActivity) => {
    const key = weekKey(week, day);
    setWeekendDrafts(prev => {
      const existing = prev[key] || getWeekendDraft(week, day);
      if (isDuplicate(existing.items, p)) return prev;
      const newItem = pickedToItem(p, existing.items.length);
      return { ...prev, [key]: { ...existing, items: [...existing.items, newItem] } };
    });
    setShowPicker(false);
    setPickerWeekend(null);
  };

  // ── Total weeks ───────────────────────────────────────────────────────────
  const totalWeeks = Math.ceil((curriculum.totalDays || 145) / 5);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading curriculum...</div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate('/curriculum-builder')}
          style={{ background: 'none', border: '1.5px solid #e2e8f0', borderRadius: '7px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px', color: '#475569' }}
        >
          ← Back
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
            {isCreate ? '+ New Curriculum' : (curriculum.title || 'Curriculum Builder')}
          </h2>
          {!isCreate && curriculum.totalDays && (
            <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '13px' }}>
              {curriculum.totalDays}-day plan · {(curriculum.topics || []).length} topics
            </p>
          )}
        </div>
        {!isCreate && (
          <button
            onClick={() => curriculumApi.togglePublish(id!).then(r => setCurriculum(prev => ({ ...prev, isPublished: r.isPublished })))}
            style={{
              background: curriculum.isPublished ? '#dcfce7' : '#f1f5f9',
              color: curriculum.isPublished ? '#16a34a' : '#94a3b8',
              border: 'none', borderRadius: '20px', padding: '6px 14px',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            {curriculum.isPublished ? '● Published' : '○ Draft'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid #e2e8f0', marginBottom: '24px' }}>
        {([
          { key: 'overview', label: '📋 Overview' },
          { key: 'topics',   label: '📚 Topics' },
          { key: 'daily',    label: '📅 Daily Plan', disabled: isCreate },
          { key: 'weekend',  label: '🏖 Weekend Plan', disabled: isCreate },
        ] as { key: Tab; label: string; disabled?: boolean }[]).map(t => (
          <button
            key={t.key}
            onClick={() => !t.disabled && setTab(t.key)}
            disabled={t.disabled}
            style={{
              padding: '10px 18px', border: 'none', background: 'none',
              cursor: t.disabled ? 'not-allowed' : 'pointer',
              fontWeight: 600, fontSize: '14px',
              color: tab === t.key ? '#0f172a' : t.disabled ? '#cbd5e1' : '#64748b',
              borderBottom: tab === t.key ? '2px solid #0f172a' : '2px solid transparent',
              marginBottom: '-2px',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ─────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div style={{ maxWidth: '600px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontWeight: 600, fontSize: '14px', color: '#374151' }}>Curriculum Title *</span>
              <input
                type="text"
                value={curriculum.title || ''}
                onChange={e => setCurriculum(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Java Fullstack — 145 Days"
                style={{ padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontWeight: 600, fontSize: '14px', color: '#374151' }}>Description</span>
              <textarea
                rows={3}
                value={curriculum.description || ''}
                onChange={e => setCurriculum(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this curriculum..."
                style={{ padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', resize: 'vertical' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontWeight: 600, fontSize: '14px', color: '#374151' }}>Target Course</span>
              <input
                type="text"
                value={curriculum.targetCourse || ''}
                onChange={e => setCurriculum(prev => ({ ...prev, targetCourse: e.target.value }))}
                placeholder="e.g. Java Fullstack, Python Data Science"
                style={{ padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontWeight: 600, fontSize: '14px', color: '#374151' }}>Total Days</span>
              <input
                type="number"
                min={1}
                max={365}
                value={curriculum.totalDays || 145}
                onChange={e => setCurriculum(prev => ({ ...prev, totalDays: parseInt(e.target.value, 10) || 145 }))}
                style={{ padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', maxWidth: '160px' }}
              />
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Weekdays only (excluding weekends)</span>
            </label>
            <button
              onClick={saveOverview}
              disabled={saving}
              style={{
                alignSelf: 'flex-start', background: '#0f172a', color: '#fff',
                border: 'none', borderRadius: '8px', padding: '10px 24px',
                fontWeight: 600, fontSize: '14px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving...' : isCreate ? 'Create Curriculum →' : 'Save Overview'}
            </button>
          </div>
        </div>
      )}

      {/* ── Topics Tab ───────────────────────────────────────────────────── */}
      {tab === 'topics' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
              Define topics and their day ranges. Topics are used to group days in the Daily Plan.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={addTopic}
                style={{
                  background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '7px',
                  padding: '8px 16px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', color: '#374151',
                }}
              >
                + Add Topic
              </button>
              <button
                onClick={saveTopics}
                disabled={saving}
                style={{
                  background: '#0f172a', color: '#fff', border: 'none', borderRadius: '7px',
                  padding: '8px 16px', fontWeight: 600, fontSize: '13px',
                  cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Saving...' : 'Save Topics'}
              </button>
            </div>
          </div>

          {/* Topic edit form */}
          {editTopicIdx !== null && (
            <div style={{
              background: '#f8fafc', borderRadius: '10px', border: '1.5px solid #e2e8f0',
              padding: '16px', marginBottom: '16px',
            }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 700 }}>
                {editTopicIdx === -1 ? 'New Topic' : 'Edit Topic'}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: '1 / -1' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Title *</span>
                  <input
                    autoFocus
                    type="text"
                    value={topicDraft.title || ''}
                    onChange={e => setTopicDraft(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Java Basics"
                    style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', outline: 'none' }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Start Day</span>
                  <input
                    type="number"
                    min={1}
                    value={topicDraft.startDay || ''}
                    onChange={e => setTopicDraft(prev => ({ ...prev, startDay: parseInt(e.target.value) || 1 }))}
                    style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', outline: 'none' }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>End Day</span>
                  <input
                    type="number"
                    min={1}
                    value={topicDraft.endDay || ''}
                    onChange={e => setTopicDraft(prev => ({ ...prev, endDay: parseInt(e.target.value) || 1 }))}
                    style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', outline: 'none' }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Color</span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {TOPIC_COLORS.map(col => (
                      <div
                        key={col}
                        onClick={() => setTopicDraft(prev => ({ ...prev, color: col }))}
                        style={{
                          width: '24px', height: '24px', borderRadius: '50%', background: col,
                          cursor: 'pointer', border: topicDraft.color === col ? '3px solid #0f172a' : '3px solid transparent',
                        }}
                      />
                    ))}
                  </div>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Description</span>
                  <input
                    type="text"
                    value={topicDraft.description || ''}
                    onChange={e => setTopicDraft(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description"
                    style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', outline: 'none' }}
                  />
                </label>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={saveTopic}
                  style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: '7px', padding: '7px 16px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                >
                  {editTopicIdx === -1 ? 'Add' : 'Update'} Topic
                </button>
                <button
                  onClick={() => { setEditTopicIdx(null); setTopicDraft({}); }}
                  style={{ background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: '7px', padding: '7px 16px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Topics list */}
          {(curriculum.topics || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', background: '#f8fafc', borderRadius: '10px', border: '1.5px dashed #e2e8f0' }}>
              No topics yet. Click "+ Add Topic" to define day ranges.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(curriculum.topics || []).map((topic, idx) => (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', background: '#fff', borderRadius: '10px',
                  border: '1.5px solid #e2e8f0',
                }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: topic.color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{topic.title}</div>
                    {topic.description && <div style={{ fontSize: '12px', color: '#64748b' }}>{topic.description}</div>}
                  </div>
                  <div style={{ fontSize: '13px', color: '#475569', background: '#f1f5f9', borderRadius: '6px', padding: '4px 10px', whiteSpace: 'nowrap' }}>
                    Days {topic.startDay}–{topic.endDay} ({topic.endDay - topic.startDay + 1} days)
                  </div>
                  <button
                    onClick={() => { setEditTopicIdx(idx); setTopicDraft({ ...topic }); }}
                    style={{ background: 'none', border: '1.5px solid #e2e8f0', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '13px', color: '#374151' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removeTopic(idx)}
                    style={{ background: 'none', border: '1.5px solid #fecaca', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '13px', color: '#dc2626' }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Daily Plan Tab ───────────────────────────────────────────────── */}
      {tab === 'daily' && !isCreate && (
        <div style={{ display: 'flex', gap: '16px', minHeight: '600px' }}>

          {/* Left: Topic selector */}
          <div style={{ width: '220px', flexShrink: 0 }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Topics
            </h4>
            {(curriculum.topics || []).length === 0 ? (
              <div style={{ fontSize: '13px', color: '#94a3b8', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                Add topics in the Topics tab first.
              </div>
            ) : (
              (curriculum.topics || []).map((t, i) => {
                const daysInTopic = Array.from({ length: t.endDay - t.startDay + 1 }, (_, i) => t.startDay + i);
                const plannedCount = daysInTopic.filter(d => (dayPlanDrafts[d]?.items?.length || 0) > 0).length;
                return (
                  <div
                    key={i}
                    onClick={() => setActiveTopic(t)}
                    style={{
                      padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', marginBottom: '4px',
                      background: activeTopic?._id === t._id || (activeTopic?.title === t.title && activeTopic?.startDay === t.startDay) ? '#0f172a' : '#f8fafc',
                      color:      activeTopic?._id === t._id || (activeTopic?.title === t.title && activeTopic?.startDay === t.startDay) ? '#fff' : '#374151',
                      border: '1.5px solid',
                      borderColor: activeTopic?._id === t._id || (activeTopic?.title === t.title && activeTopic?.startDay === t.startDay) ? '#0f172a' : '#e2e8f0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, fontSize: '13px' }}>{t.title}</span>
                    </div>
                    <div style={{ fontSize: '11px', opacity: 0.7 }}>
                      Days {t.startDay}–{t.endDay} · {plannedCount}/{daysInTopic.length} planned
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Day list */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {!activeTopic ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', background: '#f8fafc', borderRadius: '10px' }}>
                Select a topic to plan its days
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: activeTopic.color }} />
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{activeTopic.title}</h3>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>Days {activeTopic.startDay}–{activeTopic.endDay}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Array.from({ length: activeTopic.endDay - activeTopic.startDay + 1 }, (_, i) => {
                    const day   = activeTopic.startDay + i;
                    const draft = getDayDraft(day);
                    const hasContent = draft.items.length > 0;
                    const totalMins  = draft.items.reduce((sum, item) => sum + (item.estimatedDuration || 0), 0);
                    return (
                      <div key={day} style={{
                        background: '#fff', borderRadius: '10px',
                        border: `1.5px solid ${hasContent ? '#bfdbfe' : '#e2e8f0'}`,
                        overflow: 'hidden',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: hasContent ? '#eff6ff' : '#f8fafc' }}>
                          <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', minWidth: '56px' }}>Day {day}</span>
                          <span style={{ flex: 1, fontSize: '12px', color: '#64748b' }}>
                            {hasContent ? `${draft.items.length} item${draft.items.length !== 1 ? 's' : ''} · ${totalMins}m` : 'No content assigned'}
                          </span>
                          <button
                            onClick={() => { setPickerDay(day); setShowPicker(true); }}
                            style={{
                              background: '#0f172a', color: '#fff', border: 'none',
                              borderRadius: '6px', padding: '4px 10px', fontSize: '12px',
                              fontWeight: 600, cursor: 'pointer',
                            }}
                          >
                            + Add
                          </button>
                          {hasContent && (
                            <button
                              onClick={() => saveDayPlan(day)}
                              disabled={savingDay === day}
                              style={{
                                background: '#10b981', color: '#fff', border: 'none',
                                borderRadius: '6px', padding: '4px 10px', fontSize: '12px',
                                fontWeight: 600, cursor: savingDay === day ? 'not-allowed' : 'pointer',
                                opacity: savingDay === day ? 0.7 : 1,
                              }}
                            >
                              {savingDay === day ? '...' : 'Save'}
                            </button>
                          )}
                        </div>
                        {hasContent && (
                          <div style={{ padding: '8px 14px 10px' }}>
                            {draft.items.map((item, idx) => (
                              <DayContentRow
                                key={idx}
                                item={item}
                                onRemove={() => removeContentFromDay(day, idx)}
                                onChange={updated => updateDayItem(day, idx, updated)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Weekend Plan Tab ─────────────────────────────────────────────── */}
      {tab === 'weekend' && !isCreate && (
        <div>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 16px' }}>
            Configure Saturday and Sunday plans for each week. {totalWeeks} weeks total.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Array.from({ length: totalWeeks }, (_, i) => {
              const week = i + 1;
              return (
                <div key={week} style={{ background: '#fff', borderRadius: '10px', border: '1.5px solid #e2e8f0', overflow: 'hidden' }}>
                  <div style={{ padding: '10px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>Week {week}</span>
                    <span style={{ marginLeft: '8px', fontSize: '12px', color: '#94a3b8' }}>
                      (Days {(week - 1) * 5 + 1}–{Math.min(week * 5, curriculum.totalDays || 145)} weekdays)
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
                    {(['saturday', 'sunday'] as const).map(dow => {
                      const key   = weekKey(week, dow);
                      const draft = getWeekendDraft(week, dow);
                      const isRest = draft.type === 'rest';
                      return (
                        <div key={dow} style={{ padding: '12px 14px', borderRight: dow === 'saturday' ? '1px solid #e2e8f0' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 600, fontSize: '13px', color: '#374151', textTransform: 'capitalize' }}>{dow}</span>
                            <select
                              value={draft.type}
                              onChange={e => setWeekendDrafts(prev => ({
                                ...prev,
                                [key]: { ...getWeekendDraft(week, dow), type: e.target.value as any }
                              }))}
                              style={{ padding: '3px 6px', border: '1px solid #e2e8f0', borderRadius: '5px', fontSize: '12px' }}
                            >
                              {Object.entries(WEEKEND_TYPE_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                              ))}
                            </select>
                          </div>
                          {!isRest && (
                            <>
                              <input
                                type="text"
                                placeholder="Optional title..."
                                value={draft.title || ''}
                                onChange={e => setWeekendDrafts(prev => ({
                                  ...prev,
                                  [key]: { ...getWeekendDraft(week, dow), title: e.target.value }
                                }))}
                                style={{ width: '100%', padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: '5px', fontSize: '12px', marginBottom: '6px', boxSizing: 'border-box', outline: 'none' }}
                              />
                              {draft.items.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '4px 6px', background: '#f8fafc', borderRadius: '5px', marginBottom: '3px' }}>
                                  <span>{(item.kind && item.kind !== 'content') ? KIND_ICON[item.kind] : (CONTENT_TYPE_ICONS[item.contentType as any] || '📄')}</span>
                                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.contentTitle}</span>
                                  <button
                                    onClick={() => setWeekendDrafts(prev => ({
                                      ...prev,
                                      [key]: { ...getWeekendDraft(week, dow), items: draft.items.filter((_, i) => i !== idx) }
                                    }))}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0 2px' }}
                                  >×</button>
                                </div>
                              ))}
                              <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                <button
                                  onClick={() => { setPickerWeekend({ week, day: dow }); setShowPicker(true); }}
                                  style={{ flex: 1, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '5px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', color: '#374151' }}
                                >
                                  + Content
                                </button>
                                <button
                                  onClick={() => saveWeekendPlan(week, dow)}
                                  disabled={savingWeekend === key}
                                  style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '5px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
                                >
                                  {savingWeekend === key ? '...' : 'Save'}
                                </button>
                              </div>
                            </>
                          )}
                          {isRest && (
                            <button
                              onClick={() => saveWeekendPlan(week, dow)}
                              disabled={savingWeekend === key}
                              style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '5px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', width: '100%' }}
                            >
                              {savingWeekend === key ? '...' : 'Mark as Rest Day'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity Picker Modal */}
      {showPicker && (
        <ActivityPickerModal
          onSelect={item => {
            if (pickerDay !== null) {
              addContentToDay(pickerDay, item);
            } else if (pickerWeekend) {
              addContentToWeekend(pickerWeekend.week, pickerWeekend.day, item);
            }
          }}
          onClose={() => { setShowPicker(false); setPickerDay(null); setPickerWeekend(null); }}
        />
      )}
    </div>
  );
}
