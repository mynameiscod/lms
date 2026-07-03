import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { enrollmentPlanApi } from '../../api/enrollmentPlanApi';
import { CONTENT_TYPE_ICONS, CONTENT_TYPE_LABELS, CONTENT_TYPE_COLORS } from '../../api/learningContentLibraryApi';
import { VideoPlayer, NotesViewer, QAViewer, PracticeViewer } from './DayView';
import InteractiveActivityViewer from './InteractiveActivityViewer';

const PURPLE = '#6366f1';

const fmtTime = (secs: number) => {
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

// ── Progress donut ────────────────────────────────────────────────────────────
const Donut: React.FC<{ pct: number; label: string }> = ({ pct, label }) => (
  <div style={{ width: 120, height: 120, borderRadius: '50%', background: `conic-gradient(#22c55e 0% ${pct}%, #eef1f6 ${pct}% 100%)`, display: 'grid', placeItems: 'center' }}>
    <div style={{ width: 92, height: 92, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{pct}%</div>
        <div style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 600 }}>{label}</div>
      </div>
    </div>
  </div>
);

const card: React.CSSProperties = { background: '#fff', border: '1px solid #eef1f6', borderRadius: 14, boxShadow: '0 1px 3px rgba(16,24,40,.04)' };

// ── Item helpers ────────────────────────────────────────────────────────────
const itemMeta = (item: any) => {
  const c = item.content;
  // Day items store their name in `contentTitle` (both content + module items). Fall back
  // to the loaded content's own title, then the raw kind.
  const type = c?.type || item.contentType || item.kind || 'content';
  // Content items: prefer the live content title; module items (quiz/assignment/…): the
  // stored contentTitle (there's no loaded content object for those).
  const title = c?.title || item.contentTitle || item.title || (item.kind && item.kind !== 'content' ? item.kind : 'Untitled');
  const duration = c?.estimatedDuration || item.estimatedDuration || 0;
  const icon = CONTENT_TYPE_ICONS[type as keyof typeof CONTENT_TYPE_ICONS] || (item.kind === 'assignment' ? '📝' : item.kind === 'quiz' ? '❓' : item.kind === 'mockInterview' ? '🎤' : item.kind === 'codeSnippet' ? '💻' : '📄');
  const label = CONTENT_TYPE_LABELS[type as keyof typeof CONTENT_TYPE_LABELS] || (item.kind === 'quiz' ? 'Quiz' : item.kind === 'assignment' ? 'Assignment' : item.kind === 'mockInterview' ? 'Mock Interview' : item.kind === 'codeSnippet' ? 'Code Snippet' : 'Content');
  const color = CONTENT_TYPE_COLORS[type as keyof typeof CONTENT_TYPE_COLORS] || '#64748b';
  return { type, title, duration, icon, label, color };
};

const LearningPlanPro: React.FC = () => {
  const { enrollmentId = '', day = '1' } = useParams();
  const navigate = useNavigate();
  const dayNumber = parseInt(day, 10);

  const [data, setData] = useState<any>(null);
  const [journey, setJourney] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [selIdx, setSelIdx] = useState(0);
  const [tab, setTab] = useState<'description' | 'notes' | 'code' | 'resources' | 'submissions' | 'discussion'>('description');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Assistant
  const [aiOut, setAiOut] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiQ, setAiQ] = useState('');
  // Notes composer
  const [noteText, setNoteText] = useState('');
  // Discussion
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  // Goal editor
  const [goalEdit, setGoalEdit] = useState(false);
  const [goalDraft, setGoalDraft] = useState({ videos: 1, assignments: 1, quizzes: 1 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, j, s, n, b] = await Promise.all([
        enrollmentPlanApi.getDayPlan(enrollmentId, dayNumber),
        enrollmentPlanApi.getJourney(enrollmentId).catch(() => null),
        enrollmentPlanApi.getSummary(enrollmentId).catch(() => null),
        enrollmentPlanApi.listNotes(enrollmentId).catch(() => []),
        enrollmentPlanApi.listBookmarks(enrollmentId).catch(() => []),
      ]);
      setData(d); setJourney(j); setSummary(s); setNotes(n);
      setBookmarks(new Set(b.map((x: any) => x.contentId)));
      setSelIdx(0); setTab('description');
      if (s?.goal?.targets) setGoalDraft(s.goal.targets);
    } catch { /* handled by empty state */ }
    finally { setLoading(false); }
  }, [enrollmentId, dayNumber]);

  useEffect(() => { load(); }, [load]);

  // Time heartbeat every 30s while the page is open.
  useEffect(() => {
    const t = setInterval(() => { enrollmentPlanApi.heartbeat(enrollmentId, 30).then(r => {
      setSummary((prev: any) => prev ? { ...prev, timeSpentSeconds: r.timeSpentSeconds, streak: r.streak } : prev);
    }).catch(() => {}); }, 30000);
    return () => clearInterval(t);
  }, [enrollmentId]);

  const items: any[] = data?.items || [];
  const selected = items[selIdx];
  const selContentId = selected?.content?._id || (selected?.contentId ? String(selected.contentId) : null);

  // Load discussion when the discussion tab / selected item changes.
  useEffect(() => {
    if (tab === 'discussion' && selContentId) {
      enrollmentPlanApi.listDiscussion(enrollmentId, selContentId).then(setComments).catch(() => setComments([]));
    }
  }, [tab, selContentId, enrollmentId]);

  const runSearch = async (q: string) => {
    setSearch(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    try { setSearchResults(await enrollmentPlanApi.search(enrollmentId, q)); } catch { setSearchResults([]); }
  };

  const runAssistant = async (action: string, question?: string) => {
    setAiLoading(true); setAiOut('');
    try {
      const ans = await enrollmentPlanApi.assistant(enrollmentId, {
        action, contentId: selContentId || undefined, question,
        topicTitle: selected ? itemMeta(selected).title : undefined,
        targetLang: action === 'translate' ? 'Telugu' : undefined,
      });
      setAiOut(ans);
    } catch (e: any) { setAiOut(e?.response?.data?.message || 'Assistant is unavailable right now.'); }
    finally { setAiLoading(false); }
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    const note = await enrollmentPlanApi.createNote(enrollmentId, {
      text: noteText.trim(), dayNumber, contentId: selContentId || undefined,
      contentTitle: selected ? itemMeta(selected).title : undefined,
    });
    setNotes(prev => [note, ...prev]); setNoteText('');
  };
  const delNote = async (id: string) => { await enrollmentPlanApi.deleteNote(enrollmentId, id); setNotes(prev => prev.filter(n => n._id !== id)); };

  const toggleBookmark = async () => {
    if (!selContentId) return;
    const r = await enrollmentPlanApi.toggleBookmark(enrollmentId, { contentId: selContentId, dayNumber, title: selected ? itemMeta(selected).title : '' });
    setBookmarks(prev => { const s = new Set(prev); r.bookmarked ? s.add(selContentId) : s.delete(selContentId); return s; });
  };

  const postComment = async () => {
    if (!commentText.trim() || !selContentId) return;
    const c = await enrollmentPlanApi.postDiscussion(enrollmentId, { contentId: selContentId, dayNumber, text: commentText.trim() });
    setComments(prev => [...prev, c]); setCommentText('');
  };

  const markComplete = async () => {
    if (!selContentId) return;
    await enrollmentPlanApi.markContentComplete(enrollmentId, selContentId, dayNumber);
    load();
  };

  const saveGoals = async () => {
    await enrollmentPlanApi.updateGoals(enrollmentId, goalDraft);
    setGoalEdit(false);
    const s = await enrollmentPlanApi.getSummary(enrollmentId).catch(() => null);
    if (s) setSummary(s);
  };

  // Day strip window (10 days) from the journey.
  const allDays: any[] = useMemo(() => (journey?.plan?.weeks || []).flatMap((w: any) => w.days || []), [journey]);
  const totalDays = data?.enrollment?.totalDays || journey?.plan?.totalDays || 0;
  const completedDaysCount = data?.enrollment?.completedDays?.length ?? journey?.progress?.completedDays ?? 0;
  const [stripStart, setStripStart] = useState(1);
  useEffect(() => { setStripStart(Math.max(1, dayNumber - 4)); }, [dayNumber]);
  const stripDays = allDays.filter(d => d.day >= stripStart && d.day < stripStart + 10);

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>Loading your learning plan…</div>;
  if (!data) return <div style={{ padding: 60, textAlign: 'center', color: '#dc2626' }}>Could not load this day.</div>;

  const progress = summary?.progress || { total: 0, completed: 0, inProgress: 0, notStarted: 0 };
  const donutPct = progress.total ? Math.round((progress.completed / progress.total) * 100) : (journey?.progress?.percent || 0);
  const goal = summary?.goal || { targets: { videos: 1, assignments: 1, quizzes: 1 }, done: { videos: 0, assignments: 0, quizzes: 0 } };
  const goalItems = [
    { key: 'videos', label: `Watch ${goal.targets.videos} Video${goal.targets.videos !== 1 ? 's' : ''}`, done: goal.done.videos >= goal.targets.videos },
    { key: 'assignments', label: `Complete ${goal.targets.assignments} Assignment${goal.targets.assignments !== 1 ? 's' : ''}`, done: goal.done.assignments >= goal.targets.assignments },
    { key: 'quizzes', label: `Attempt ${goal.targets.quizzes} Quiz${goal.targets.quizzes !== 1 ? 'zes' : ''}`, done: goal.done.quizzes >= goal.targets.quizzes },
  ];
  const goalPct = Math.round((goalItems.filter(g => g.done).length / goalItems.length) * 100);

  const selMeta = selected ? itemMeta(selected) : null;

  return (
    <div style={{ background: '#f6f7fb', minHeight: '100vh', padding: '16px 20px 40px' }}>
      {/* ── Top bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 420 }}>
          <input value={search} onChange={e => runSearch(e.target.value)} placeholder="🔍  Search for topics, lessons…"
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, background: '#fff' }} />
          {searchResults.length > 0 && (
            <div style={{ position: 'absolute', top: 44, left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 10px 30px rgba(15,23,42,.12)', zIndex: 30, maxHeight: 320, overflow: 'auto' }}>
              {searchResults.map((r, i) => (
                <button key={i} onClick={() => { setSearch(''); setSearchResults([]); navigate(`/my-learning/${enrollmentId}/day/${r.dayNumber}`); }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', border: 'none', background: '#fff', cursor: 'pointer', fontSize: 13.5, borderBottom: '1px solid #f1f5f9' }}>
                  <b style={{ color: PURPLE }}>Day {r.dayNumber}</b> · {r.title}
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #eef1f6', borderRadius: 10, padding: '7px 12px', fontWeight: 700, fontSize: 13 }} title="Day streak">
          <span>🔥</span><span>{summary?.streak ?? 0}</span><span style={{ color: '#94a3b8', fontWeight: 600 }}>Day Streak</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #eef1f6', borderRadius: 10, padding: '7px 12px', fontWeight: 800, fontSize: 13 }} title="Experience points">
          <span style={{ background: '#ede9fe', color: '#7c3aed', borderRadius: 6, padding: '1px 7px', fontSize: 11 }}>XP</span>
          <span>{summary?.xp ?? 0}</span>
        </div>
        <button onClick={() => navigate('/notifications')} title="Notifications" style={{ ...card, border: '1px solid #eef1f6', width: 40, height: 40, borderRadius: 10, cursor: 'pointer', fontSize: 16 }}>🔔</button>
      </div>

      {/* ── Header card + Today's goal ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 16, marginBottom: 16, alignItems: 'stretch' }}>
        <div style={{ ...card, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#0f172a' }}>{data.enrollment?.curriculumTitle || data.curriculum?.title}</h2>
            <span style={{ background: '#dcfce7', color: '#15803d', fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20 }}>{data.enrollment?.status === 'active' ? 'Active' : data.enrollment?.status}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 14, alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 5 }}><span>Overall Progress</span><b style={{ color: '#0f172a' }}>{donutPct}%</b></div>
              <div style={{ height: 8, background: '#eef1f6', borderRadius: 6, overflow: 'hidden' }}><div style={{ width: `${donutPct}%`, height: '100%', background: 'linear-gradient(90deg,#22c55e,#16a34a)' }} /></div>
            </div>
            <Stat label="Completed" value={`${completedDaysCount} / ${totalDays} Days`} />
            <Stat label="Time Spent" value={fmtTime(summary?.timeSpentSeconds || 0)} />
            <Stat label="Remaining Days" value={`${Math.max(0, totalDays - completedDaysCount)} Days`} />
          </div>

          {/* Day strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
            <button onClick={() => setStripStart(s => Math.max(1, s - 5))} style={stripArrow}>‹</button>
            <div style={{ display: 'flex', gap: 8, overflow: 'hidden', flex: 1 }}>
              {stripDays.map(d => {
                const isCur = d.day === dayNumber;
                const st = d.status;
                return (
                  <button key={d.day} onClick={() => !d.locked && navigate(`/my-learning/${enrollmentId}/day/${d.day}`)}
                    disabled={d.locked}
                    style={{ flex: '1 0 auto', minWidth: 62, textAlign: 'center', padding: '8px 4px', borderRadius: 10, cursor: d.locked ? 'not-allowed' : 'pointer',
                      border: isCur ? `2px solid ${PURPLE}` : '1px solid #eef1f6', background: isCur ? '#eef2ff' : '#fff' }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: isCur ? PURPLE : '#334155' }}>Day {d.day}</div>
                    <div style={{ fontSize: 15, marginTop: 2 }}>{st === 'completed' ? '✅' : d.locked ? '🔒' : isCur ? '🔵' : '⚪'}</div>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setStripStart(s => Math.min(Math.max(1, totalDays - 9), s + 5))} style={stripArrow}>›</button>
          </div>
        </div>

        {/* Today's Goal */}
        <div style={{ ...card, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <b style={{ fontSize: 15, color: '#0f172a' }}>Today's Goal</b>
            <button onClick={() => { setGoalDraft(goal.targets); setGoalEdit(true); }} style={{ background: 'none', border: 'none', color: PURPLE, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Edit</button>
          </div>
          {goalItems.map(g => (
            <div key={g.key} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10, fontSize: 13.5 }}>
              <span style={{ fontSize: 16 }}>{g.done ? '✅' : '⚪'}</span>
              <span style={{ color: g.done ? '#94a3b8' : '#334155', textDecoration: g.done ? 'line-through' : 'none' }}>{g.label}</span>
            </div>
          ))}
          <div style={{ height: 7, background: '#eef1f6', borderRadius: 6, overflow: 'hidden', marginTop: 6 }}><div style={{ width: `${goalPct}%`, height: '100%', background: 'linear-gradient(90deg,#22c55e,#16a34a)' }} /></div>
          <div style={{ textAlign: 'right', fontSize: 12, color: '#64748b', marginTop: 4 }}>{goalPct}%</div>
        </div>
      </div>

      {/* ── 3-column body ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0,1fr) 320px', gap: 16 }}>
        {/* Left: topics */}
        <div style={{ ...card, padding: 16, alignSelf: 'start' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <b style={{ fontSize: 15, color: '#0f172a' }}>Day {dayNumber} · Topics</b>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{items.length} Topics</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((it, i) => {
              const m = itemMeta(it);
              const active = i === selIdx;
              return (
                <button key={i} onClick={() => { setSelIdx(i); setTab('description'); }}
                  style={{ display: 'flex', gap: 10, alignItems: 'flex-start', textAlign: 'left', padding: '10px 11px', borderRadius: 10, cursor: 'pointer',
                    border: active ? `1.5px solid ${PURPLE}` : '1px solid #eef1f6', background: active ? '#eef2ff' : '#fff' }}>
                  <span style={{ fontSize: 16 }}>{it.isCompleted ? '✅' : active ? '▶️' : '⚪'}</span>
                  <span style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a', lineHeight: 1.35 }}>{i + 1}. {m.title}</div>
                    <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>{m.label}{m.duration ? ` · ${m.duration} min` : ''}</div>
                  </span>
                </button>
              );
            })}
            {items.length === 0 && <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 20 }}>No topics for this day.</div>}
          </div>
          <button style={{ width: '100%', marginTop: 14, padding: '9px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            onClick={() => alert('Day materials: use each topic\'s Resources tab to download.')}>⬇ Download Day Materials</button>
        </div>

        {/* Center: content viewer */}
        <div style={{ ...card, padding: 20, minWidth: 0 }}>
          {data.isLocked ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
              <div style={{ fontSize: 40 }}>{data.lockReason === 'schedule' ? '🗓️' : '🔒'}</div>
              <h3 style={{ color: '#0f172a' }}>{data.lockReason === 'schedule' ? 'This day unlocks soon' : 'This day is locked'}</h3>
              <p>{data.lockReason === 'schedule' ? `Your batch is on Day ${data.todayPlanDay ?? '—'} — revisit earlier days anytime.` : 'Complete the required items in the previous day.'}</p>
            </div>
          ) : !selected ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>Select a topic to begin.</div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>{selMeta!.title}</h3>
                {selContentId && (
                  <button onClick={toggleBookmark} title="Bookmark" style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', fontSize: 15 }}>
                    {bookmarks.has(selContentId) ? '🔖' : '🏷️'}
                  </button>
                )}
              </div>

              {/* Content body */}
              <ContentBody item={selected} />

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #eef1f6', margin: '18px 0 14px', overflowX: 'auto' }}>
                {(['description', 'notes', 'code', 'resources', 'submissions', 'discussion'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    style={{ padding: '9px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap',
                      color: tab === t ? PURPLE : '#64748b', borderBottom: tab === t ? `2px solid ${PURPLE}` : '2px solid transparent', textTransform: 'capitalize' }}>
                    {t}{t === 'discussion' && comments.length ? ` (${comments.length})` : ''}
                  </button>
                ))}
              </div>

              <div style={{ minHeight: 80 }}>
                {tab === 'description' && <div style={{ fontSize: 14, lineHeight: 1.7, color: '#374151', whiteSpace: 'pre-wrap' }}>{selected.content?.description || selected.description || 'No description.'}</div>}
                {tab === 'notes' && <NotesViewerSafe item={selected} />}
                {tab === 'code' && (
                  <div style={{ textAlign: 'center', padding: 20 }}>
                    <p style={{ color: '#64748b' }}>Practice this topic in the code playground.</p>
                    <button onClick={() => navigate('/code-playground')} style={{ background: PURPLE, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontWeight: 700, cursor: 'pointer' }}>Open Code Playground</button>
                  </div>
                )}
                {tab === 'resources' && <ResourcesTab item={selected} />}
                {tab === 'submissions' && (
                  <div style={{ color: '#64748b', fontSize: 13.5 }}>
                    {selected.kind === 'assignment' || selected.launchPath
                      ? <button onClick={() => navigate(selected.launchPath)} style={{ background: PURPLE, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontWeight: 700, cursor: 'pointer' }}>Open assignment & submissions</button>
                      : 'Submissions apply to assignment topics.'}
                  </div>
                )}
                {tab === 'discussion' && (
                  <div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                      <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && postComment()} placeholder="Ask a question or share a thought…" style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13.5 }} />
                      <button onClick={postComment} style={{ background: PURPLE, color: '#fff', border: 'none', borderRadius: 8, padding: '0 16px', fontWeight: 700, cursor: 'pointer' }}>Post</button>
                    </div>
                    {comments.length === 0 && <p style={{ color: '#94a3b8', fontSize: 13 }}>No comments yet — start the discussion.</p>}
                    {comments.map((c, i) => (
                      <div key={i} style={{ borderTop: '1px solid #f1f5f9', padding: '10px 0' }}>
                        <div style={{ fontSize: 12.5, color: '#64748b', marginBottom: 3 }}><b style={{ color: '#0f172a' }}>{c.authorName || 'Student'}</b> · {new Date(c.createdAt).toLocaleDateString()}</div>
                        <div style={{ fontSize: 14, color: '#334151' }}>{c.text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Prev/Next + complete */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, gap: 10 }}>
                <button disabled={selIdx === 0} onClick={() => { setSelIdx(i => Math.max(0, i - 1)); setTab('description'); }} style={navBtn(selIdx === 0)}>← Previous Topic</button>
                {selContentId && !selected.isCompleted && <button onClick={markComplete} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 700, cursor: 'pointer' }}>✓ Mark Complete</button>}
                <button disabled={selIdx >= items.length - 1} onClick={() => { setSelIdx(i => Math.min(items.length - 1, i + 1)); setTab('description'); }} style={{ ...navBtn(selIdx >= items.length - 1), background: PURPLE, color: '#fff', borderColor: 'transparent' }}>Next Topic →</button>
              </div>
            </>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignSelf: 'start' }}>
          {/* AI assistant */}
          <div style={{ ...card, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <b style={{ fontSize: 15, color: '#0f172a' }}>AI Study Assistant</b>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#7c3aed', background: '#ede9fe', padding: '1px 7px', borderRadius: 20 }}>BETA</span>
            </div>
            <p style={{ fontSize: 12.5, color: '#94a3b8', margin: '0 0 10px' }}>Ask anything about this topic…</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
              <QuickBtn label="Explain this concept" onClick={() => runAssistant('explain')} />
              <QuickBtn label="Give me an example" onClick={() => runAssistant('example')} />
              <QuickBtn label="Generate MCQs" onClick={() => runAssistant('mcqs')} />
              <QuickBtn label="Translate to Telugu" onClick={() => runAssistant('translate')} />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={aiQ} onChange={e => setAiQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && aiQ.trim()) { runAssistant('ask', aiQ); setAiQ(''); } }} placeholder="Ask your doubt…" style={{ flex: 1, padding: '9px 11px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
              <button onClick={() => { if (aiQ.trim()) { runAssistant('ask', aiQ); setAiQ(''); } }} style={{ background: PURPLE, color: '#fff', border: 'none', borderRadius: 8, width: 38, cursor: 'pointer' }}>➤</button>
            </div>
            {(aiLoading || aiOut) && (
              <div style={{ marginTop: 12, background: '#f8fafc', border: '1px solid #eef1f6', borderRadius: 10, padding: 12, fontSize: 13, lineHeight: 1.6, color: '#334155', whiteSpace: 'pre-wrap', maxHeight: 320, overflow: 'auto' }}>
                {aiLoading ? 'Thinking…' : aiOut}
              </div>
            )}
          </div>

          {/* My Notes */}
          <div style={{ ...card, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <b style={{ fontSize: 15, color: '#0f172a' }}>My Notes</b>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{notes.length}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <input value={noteText} onChange={e => setNoteText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNote()} placeholder="Add a note…" style={{ flex: 1, padding: '8px 11px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
              <button onClick={addNote} style={{ background: PURPLE, color: '#fff', border: 'none', borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontWeight: 700 }}>+</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflow: 'auto' }}>
              {notes.slice(0, 8).map(n => (
                <div key={n._id} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '9px 11px', fontSize: 13, color: '#78350f', position: 'relative' }}>
                  <div style={{ paddingRight: 18 }}>{n.text}</div>
                  <div style={{ fontSize: 11, color: '#b45309', marginTop: 4 }}>{new Date(n.createdAt).toLocaleDateString()}{n.contentTitle ? ` · ${n.contentTitle}` : ''}</div>
                  <button onClick={() => delNote(n._id)} title="Delete" style={{ position: 'absolute', top: 6, right: 6, background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 13 }}>🗑</button>
                </div>
              ))}
              {notes.length === 0 && <p style={{ color: '#94a3b8', fontSize: 12.5, margin: 0 }}>No notes yet.</p>}
            </div>
          </div>

          {/* Learning progress */}
          <div style={{ ...card, padding: 16 }}>
            <b style={{ fontSize: 15, color: '#0f172a', display: 'block', marginBottom: 12 }}>Learning Progress</b>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Donut pct={donutPct} label="Completed" />
              <div style={{ fontSize: 13, flex: 1 }}>
                <ProgressRow color="#22c55e" label="Completed" value={progress.completed} />
                <ProgressRow color="#f59e0b" label="In Progress" value={progress.inProgress} />
                <ProgressRow color="#cbd5e1" label="Not Started" value={progress.notStarted} />
                <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 8, paddingTop: 8, fontSize: 12.5, color: '#64748b' }}>Total <b style={{ color: '#0f172a' }}>{progress.total}</b> Topics</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Goal editor modal */}
      {goalEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', display: 'grid', placeItems: 'center', zIndex: 6000 }} onClick={() => setGoalEdit(false)}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: 'min(360px,92vw)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 14px', color: '#0f172a' }}>Edit Today's Goal</h3>
            {(['videos', 'assignments', 'quizzes'] as const).map(k => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ textTransform: 'capitalize', fontSize: 14, color: '#334155' }}>{k}</span>
                <input type="number" min={0} max={20} value={goalDraft[k]} onChange={e => setGoalDraft(d => ({ ...d, [k]: parseInt(e.target.value, 10) || 0 }))} style={{ width: 70, padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0' }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={() => setGoalEdit(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
              <button onClick={saveGoals} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: PURPLE, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Small components ──────────────────────────────────────────────────────────
const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div><div style={{ fontSize: 11.5, color: '#94a3b8' }}>{label}</div><div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{value}</div></div>
);
const ProgressRow: React.FC<{ color: string; label: string; value: number }> = ({ color, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
    <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
    <span style={{ flex: 1, color: '#475569' }}>{label}</span><b style={{ color: '#0f172a' }}>{value}</b>
  </div>
);
const QuickBtn: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button onClick={onClick} style={{ padding: '8px 6px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>{label}</button>
);
const stripArrow: React.CSSProperties = { border: '1px solid #eef1f6', background: '#fff', borderRadius: 8, width: 30, height: 34, cursor: 'pointer', color: '#475569', flexShrink: 0 };
const navBtn = (disabled: boolean): React.CSSProperties => ({ padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 700, fontSize: 13.5, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1 });

// Dispatch a content item to the right student renderer.
const ContentBody: React.FC<{ item: any }> = ({ item }) => {
  const c = item.content;
  if (!c) {
    // Module item (assignment/quiz/etc.)
    return (
      <div style={{ textAlign: 'center', padding: 26, background: '#f8fafc', borderRadius: 10, border: '1px dashed #e2e8f0' }}>
        <div style={{ fontSize: 34, marginBottom: 8 }}>{item.kind === 'assignment' ? '📝' : item.kind === 'quiz' ? '❓' : '🎯'}</div>
        <p style={{ color: '#475569', margin: '0 0 12px' }}>This is a {item.kind} activity.</p>
        {item.launchPath && <a href={item.launchPath} style={{ background: PURPLE, color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '9px 16px', fontWeight: 700 }}>Open {item.kind}</a>}
      </div>
    );
  }
  switch (c.type) {
    case 'video': return <VideoPlayer content={c} onWatchEnough={() => {}} />;
    case 'notes': return <NotesViewer content={c} />;
    case 'tech_qa': case 'behavioral_qa': return <QAViewer content={c} />;
    case 'practice_coding': case 'practice_theory': case 'aptitude': return <PracticeViewer content={c} />;
    case 'interactive_activity': return c.htmlContent ? <InteractiveActivityViewer htmlContent={c.htmlContent} completed={false} onComplete={() => {}} /> : <div style={{ color: '#94a3b8' }}>No activity content.</div>;
    default: return <div style={{ color: '#94a3b8' }}>Preview not available for this type.</div>;
  }
};

const NotesViewerSafe: React.FC<{ item: any }> = ({ item }) => {
  const c = item.content;
  if (c && (c.notesContent || c.notesFilePath)) return <NotesViewer content={c} />;
  return <div style={{ color: '#94a3b8', fontSize: 13.5 }}>No notes for this topic.</div>;
};

const ResourcesTab: React.FC<{ item: any }> = ({ item }) => {
  const c = item.content;
  const links: { label: string; href: string }[] = [];
  if (c?.notesFilePath) links.push({ label: 'Notes / document', href: `/api/v1/learning-library/${c._id}/file` });
  if (c?.type === 'video' && c?.videoSource === 'upload') links.push({ label: 'Video (stream)', href: `/api/v1/learning-library/${c._id}/stream` });
  if (links.length === 0) return <div style={{ color: '#94a3b8', fontSize: 13.5 }}>No downloadable resources for this topic.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {links.map((l, i) => <a key={i} href={l.href} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#eff6ff', color: '#2563eb', padding: '10px 14px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 13.5 }}>📎 {l.label}</a>)}
    </div>
  );
};

export default LearningPlanPro;
