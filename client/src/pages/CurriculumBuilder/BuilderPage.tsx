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
import './CurriculumBuilder.css';

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

interface PickerRow extends PickedActivity { meta?: string; tags?: string[]; }

const CONTENT_TYPE_FILTERS: { label: string; icon: string; types: string[] }[] = [
  { label: 'Video',                icon: '🎬', types: ['video'] },
  { label: 'Interactive Activity', icon: '🧩', types: ['interactive_activity', 'interactive_lesson'] },
  { label: 'Document',             icon: '📄', types: ['notes'] },
  { label: 'Q&A / Practice',       icon: '💻', types: ['tech_qa', 'behavioral_qa', 'practice_coding', 'practice_theory', 'aptitude'] },
];
const DURATIONS = [
  { key: 'any', label: 'Any duration' },
  { key: 'lt15', label: 'Under 15 minutes' },
  { key: '15-30', label: '15–30 minutes' },
  { key: '30-60', label: '30–60 minutes' },
  { key: 'gt60', label: 'Over 60 minutes' },
];

export function ActivityPickerModal({ onSelect, onClose }: PickerModalProps) {
  const navigate = useNavigate();
  const [activeKind, setActiveKind] = useState<DayActivityKind>('content');
  const [rows, setRows]       = useState<PickerRow[]>([]);
  const [search, setSearch]   = useState('');
  const [typeFilter, setType] = useState('');
  const [ctypes, setCtypes]   = useState<Set<string>>(new Set());
  const [duration, setDuration] = useState('any');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (activeKind === 'content') {
        const res = await learningContentLibraryApi.list({ search: search || undefined, type: (typeFilter as any) || undefined, published: 'true' });
        setRows(res.items.map((i: any) => ({
          kind: 'content', id: i._id, title: i.title, contentType: i.type,
          estimatedDuration: i.estimatedDuration || 0, tags: i.topicTags || [],
        })));
      } else {
        const items = await curriculumApi.activityBank(activeKind, search || undefined);
        setRows(items.map(i => ({ kind: activeKind, id: i.id, title: i.title, contentType: activeKind, sourceModel: i.sourceModel, meta: i.meta })));
      }
    } catch { setRows([]); } finally { setLoading(false); }
  }, [activeKind, search, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const resetFilters = () => { setSearch(''); setType(''); setCtypes(new Set()); setDuration('any'); };
  const toggleCtype = (types: string[]) => setCtypes(prev => {
    const n = new Set(prev); const key = types[0];
    if (n.has(key)) n.delete(key); else n.add(key);
    return n;
  });
  const inDuration = (m: number) => duration === 'any' || (duration === 'lt15' && m < 15) || (duration === '15-30' && m >= 15 && m <= 30) || (duration === '30-60' && m > 30 && m <= 60) || (duration === 'gt60' && m > 60);

  const filtered = rows.filter(r => {
    if (activeKind !== 'content') return true;
    if (ctypes.size > 0) {
      const matchType = CONTENT_TYPE_FILTERS.some(f => ctypes.has(f.types[0]) && f.types.includes(r.contentType));
      if (!matchType) return false;
    }
    if (!inDuration(r.estimatedDuration || 0)) return false;
    return true;
  });

  const activeLabel = KIND_TABS.find(t => t.kind === activeKind)?.label || '';

  return (
    <div className="cbp-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cbp-modal">
        <div className="cbp-head">
          <div className="cbp-head-top">
            <div>
              <h3>Add Activity to Day</h3>
              <p>Select an activity type and choose content to add to this day.</p>
            </div>
            <button className="cbp-x" onClick={onClose}>×</button>
          </div>
          <div className="cbp-tabs">
            {KIND_TABS.map(t => (
              <button key={t.kind} className={`cbp-tab ${activeKind === t.kind ? 'active' : ''}`} onClick={() => { setActiveKind(t.kind); resetFilters(); }}>
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="cbp-body">
          {/* Filters */}
          <div className="cbp-filters">
            <div className="cbp-filters-head">
              <span className="h">Filters</span>
              <button className="cbp-reset" onClick={resetFilters}>↺ Reset</button>
            </div>
            <input className="cbp-search" placeholder={`Search ${activeLabel.toLowerCase()}…`} value={search} onChange={e => setSearch(e.target.value)} autoFocus />
            {activeKind === 'content' ? (
              <>
                <div className="cbp-flabel">Type</div>
                <select className="cbp-select" value={typeFilter} onChange={e => setType(e.target.value)}>
                  <option value="">All Types</option>
                  <option value="video">Video</option>
                  <option value="notes">Notes</option>
                  <option value="interactive_lesson">Interactive Lesson</option>
                  <option value="interactive_activity">Interactive Activity</option>
                  <option value="tech_qa">Tech Q&A</option>
                  <option value="practice_coding">Practice Coding</option>
                  <option value="aptitude">Aptitude</option>
                </select>
                <div className="cbp-flabel">Content Type</div>
                {CONTENT_TYPE_FILTERS.map(f => (
                  <label key={f.label} className="cbp-check">
                    <input type="checkbox" checked={ctypes.has(f.types[0])} onChange={() => toggleCtype(f.types)} />
                    <span>{f.icon} {f.label}</span>
                  </label>
                ))}
                <div className="cbp-flabel">Duration</div>
                {DURATIONS.map(d => (
                  <label key={d.key} className="cbp-radio">
                    <input type="radio" name="cbp-dur" checked={duration === d.key} onChange={() => setDuration(d.key)} />
                    <span>{d.label}</span>
                  </label>
                ))}
              </>
            ) : (
              <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 8 }}>Search {activeLabel.toLowerCase()}s by title above.</div>
            )}
          </div>

          {/* List */}
          <div className="cbp-main">
            <div className="cbp-main-head">
              <span className="ct">{activeKind === 'content' ? 'All Library Content' : `${activeLabel}s`}</span>
              <span className="cbp-count">{filtered.length} items</span>
              <div className="right">
                <span style={{ fontSize: 12.5, color: '#94a3b8' }}>Sort by</span>
                <select className="cbp-sort" defaultValue="recent"><option value="recent">Recently Added</option></select>
              </div>
            </div>
            <div className="cbp-list">
              {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading…</div>
              ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No {activeKind === 'content' ? 'content' : activeLabel.toLowerCase() + 's'} found.</div>
              ) : filtered.map(item => {
                const isContent = item.kind === 'content';
                const color = isContent ? (CONTENT_TYPE_COLORS[item.contentType as any] || '#64748b') : KIND_COLOR[item.kind];
                const icon  = isContent ? (CONTENT_TYPE_ICONS[item.contentType as any]  || '📄') : KIND_ICON[item.kind];
                const label = isContent ? (CONTENT_TYPE_LABELS[item.contentType as any] || item.contentType) : (KIND_TABS.find(t => t.kind === item.kind)?.label || item.kind);
                const meta = isContent ? `${label}${item.estimatedDuration ? ` · ${item.estimatedDuration} min` : ''}` : `${label}${item.meta ? ` · ${item.meta}` : ''}`;
                return (
                  <div className="cbp-item" key={`${item.kind}-${item.id}`}>
                    <div className="cbp-item-ic" style={{ background: `${color}15` }}>{icon}</div>
                    <div className="cbp-item-main">
                      <div className="cbp-item-title">{item.title}</div>
                      <div className="cbp-item-meta">{meta}</div>
                      {!!(item.tags && item.tags.length) && (
                        <div className="cbp-item-tags">{item.tags.slice(0, 3).map(t => <span key={t} className="cbp-tag">{t}</span>)}</div>
                      )}
                    </div>
                    <button className="cbp-add" onClick={() => onSelect(item)}>+ Add</button>
                  </div>
                );
              })}
            </div>
            <div className="cbp-foot">
              <button className="cbp-cancel" onClick={onClose}>Cancel</button>
              <span className="cbp-tip">💡 Tip: build your day from the library or any module.</span>
              {activeKind === 'content' && (
                <button className="cbp-add" onClick={() => { onClose(); navigate('/learning-library/create'); }}>+ Add Custom Content</button>
              )}
            </div>
          </div>
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
    <div className="cb-item">
      <div className="cb-item-ic" style={{ background: `${color}15` }}>{icon}</div>
      {!isContent && <span className="cb-item-kind" style={{ background: `${color}15`, color }}>{kindLabel}</span>}
      <span className="cb-item-title">{item.contentTitle}</span>
      <select className="cb-slot" value={item.slot} onChange={e => onChange({ ...item, slot: e.target.value as any })}>
        {Object.entries(SLOT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <label className="cb-gating">
        <input type="checkbox" checked={item.isGating} onChange={e => onChange({ ...item, isGating: e.target.checked })} /> Gating
      </label>
      {(kind === 'assignment' || kind === 'quiz') && (
        <span className="cb-duegrp" title="Deadline & late policy for this assessment">
          <span className="cb-due-lbl">Due Day+</span>
          <input className="cb-num" type="number" min={0} value={item.dueOffsetDays ?? 0}
            onChange={e => onChange({ ...item, dueOffsetDays: Number(e.target.value) })} title="Due = the day's date + N days" />
          <select className="cb-slot" value={item.latePolicy || 'grace'}
            onChange={e => onChange({ ...item, latePolicy: e.target.value as any })} title="Late policy">
            <option value="grace">Grace</option>
            <option value="hard_lock">Hard lock</option>
            <option value="open">Open</option>
          </select>
          {(item.latePolicy || 'grace') === 'grace' && (
            <input className="cb-num" type="number" min={0} value={item.graceDays ?? 2}
              onChange={e => onChange({ ...item, graceDays: Number(e.target.value) })} title="Grace days" />
          )}
        </span>
      )}
      <button className="cb-icon-btn del" onClick={onRemove} title="Remove">🗑</button>
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
  const [topicSearch, setTopicSearch]   = useState('');
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  const toggleDay = (d: number) => setExpandedDays(prev => { const n = new Set(prev); n.has(d) ? n.delete(d) : n.add(d); return n; });

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

  const pickedToItem = (p: PickedActivity, order: number): DayContentItem => {
    const physical = p.sourceModel === 'physical'; // in-person mock: scheduled separately
    return {
      kind: p.kind,
      contentId: p.kind === 'content' ? p.id : undefined,
      sourceModel: p.kind === 'content' ? undefined : p.sourceModel,
      sourceId: (p.kind === 'content' || physical) ? undefined : p.id,
      contentTitle: p.title,
      contentType: p.kind === 'content' ? p.contentType : p.kind,
      slot: 'anytime',
      isGating: false,
      required: !physical, // physical mock never blocks day completion
      points: 0,
      order,
      estimatedDuration: p.estimatedDuration || 0,
    };
  };

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
    <div className="cb-wrap">

      <button className="cb-back" onClick={() => navigate('/curriculum-builder')}>← Back to Hub</button>

      {/* Header */}
      <div className="cb-head">
        <div className="cb-head-ic">📅</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="cb-head-title">
            {isCreate ? '+ New Curriculum' : (curriculum.title || 'Curriculum Builder')}
            {!isCreate && (
              <button
                className={`cb-pub ${curriculum.isPublished ? 'on' : 'off'}`}
                onClick={() => curriculumApi.togglePublish(id!).then(r => setCurriculum(prev => ({ ...prev, isPublished: r.isPublished })))}
              >
                {curriculum.isPublished ? '● Published' : '○ Draft'}
              </button>
            )}
          </h1>
          {!isCreate && curriculum.totalDays && (
            <p className="cb-head-sub">{curriculum.totalDays}-day plan · {(curriculum.topics || []).length} topic{(curriculum.topics || []).length !== 1 ? 's' : ''}</p>
          )}
        </div>
        {!isCreate && (
          <div className="cb-head-actions">
            <button className="cb-btn" onClick={() => setTab('overview')}>👁 Preview Plan</button>
            <button
              className={`cb-btn ${curriculum.shared ? 'on' : ''}`}
              onClick={() => curriculumApi.share(id!, !curriculum.shared).then(r => setCurriculum(prev => ({ ...prev, shared: r.shared })))}
            >
              🔗 {curriculum.shared ? 'Shared' : 'Share Plan'}
            </button>
            <button className="cb-btn primary" onClick={() => setTab('daily')}>✏ Edit Plan</button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="cb-tabs">
        {([
          { key: 'overview', label: '📋 Overview' },
          { key: 'topics',   label: 'Topics' },
          { key: 'daily',    label: 'Daily Plan', disabled: isCreate },
          { key: 'weekend',  label: '🏖 Weekend Plan', disabled: isCreate },
        ] as { key: Tab; label: string; disabled?: boolean }[]).map(t => (
          <button key={t.key} className={`cb-tab ${tab === t.key ? 'active' : ''}`} onClick={() => !t.disabled && setTab(t.key)} disabled={t.disabled}>
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
        <div className="cb-daily">

          {/* Left: Topic selector */}
          <div className="cb-topics">
            <h4>Topics</h4>
            <input className="cb-topic-search" placeholder="🔍 Search topics..." value={topicSearch} onChange={e => setTopicSearch(e.target.value)} />
            {(curriculum.topics || []).length === 0 ? (
              <div style={{ fontSize: 13, color: '#94a3b8', padding: 12 }}>Add topics in the Topics tab first.</div>
            ) : (
              (curriculum.topics || [])
                .filter(t => !topicSearch || t.title.toLowerCase().includes(topicSearch.toLowerCase()))
                .map((t, i) => {
                  const daysInTopic = Array.from({ length: t.endDay - t.startDay + 1 }, (_, i) => t.startDay + i);
                  const plannedCount = daysInTopic.filter(d => (dayPlanDrafts[d]?.items?.length || 0) > 0).length;
                  const isActive = activeTopic?._id === t._id || (activeTopic?.title === t.title && activeTopic?.startDay === t.startDay);
                  return (
                    <div key={i} className={`cb-topic-card ${isActive ? 'active' : ''}`} onClick={() => setActiveTopic(t)}>
                      <div className="t"><span className="cb-topic-dot" style={{ background: t.color }} />{t.title}</div>
                      <div className="s">Days {t.startDay}–{t.endDay} · {plannedCount}/{daysInTopic.length} planned</div>
                    </div>
                  );
                })
            )}
          </div>

          {/* Right: Day list */}
          <div className="cb-pane">
            {!activeTopic ? (
              <div className="cb-empty">Select a topic to plan its days</div>
            ) : (() => {
              const span = activeTopic.endDay - activeTopic.startDay + 1;
              const days = Array.from({ length: span }, (_, i) => activeTopic.startDay + i);
              const plannedCount = days.filter(d => (dayPlanDrafts[d]?.items?.length || 0) > 0).length;
              const progress = span > 0 ? Math.round((plannedCount / span) * 100) : 0;
              return (
                <>
                  <div className="cb-topic-head">
                    <span className="cb-topic-dot" style={{ background: activeTopic.color, width: 12, height: 12 }} />
                    <h3>{activeTopic.title}</h3>
                    <span className="range">Days {activeTopic.startDay}–{activeTopic.endDay}</span>
                    <div className="pills">
                      <span className="cb-chip plan">{plannedCount}/{span} Planned</span>
                      <span className="cb-chip prog">{progress}% Progress</span>
                    </div>
                  </div>

                  {days.map(day => {
                    const draft = getDayDraft(day);
                    const hasContent = draft.items.length > 0;
                    const totalMins = draft.items.reduce((s, item) => s + (item.estimatedDuration || 0), 0);
                    const open = expandedDays.has(day) || (hasContent && expandedDays.size === 0 && day === activeTopic.startDay);
                    return (
                      <div key={day} className={`cb-day ${hasContent ? 'has' : ''}`}>
                        <div className="cb-day-head" onClick={() => toggleDay(day)}>
                          <span className="cb-day-num">Day {day}</span>
                          <span className={`cb-day-meta ${hasContent ? 'has' : ''}`}>
                            {hasContent ? `${draft.items.length} item${draft.items.length !== 1 ? 's' : ''} · ${totalMins}m` : 'No content assigned'}
                          </span>
                          <div className="cb-day-actions" onClick={e => e.stopPropagation()}>
                            <button className="cb-add" onClick={() => { setPickerDay(day); setShowPicker(true); }}>+ Add Activity</button>
                            {hasContent && (
                              <button className="cb-save" onClick={() => saveDayPlan(day)} disabled={savingDay === day}>
                                {savingDay === day ? '…' : 'Save Day'}
                              </button>
                            )}
                            <span className={`cb-chev ${open ? 'open' : ''}`} onClick={() => toggleDay(day)}>▾</span>
                          </div>
                        </div>
                        {open && hasContent && (
                          <div className="cb-day-body">
                            {draft.items.map((item, idx) => (
                              <DayContentRow key={idx} item={item} onRemove={() => removeContentFromDay(day, idx)} onChange={updated => updateDayItem(day, idx, updated)} />
                            ))}
                            <button className="cb-add-another" onClick={() => { setPickerDay(day); setShowPicker(true); }}>+ Add another activity</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              );
            })()}
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
