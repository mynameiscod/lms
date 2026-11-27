import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { enrollmentPlanApi } from '../../api/enrollmentPlanApi';
import { CONTENT_TYPE_ICONS, CONTENT_TYPE_LABELS, CONTENT_TYPE_COLORS } from '../../api/learningContentLibraryApi';
import { VideoPlayer, QAViewer, PracticeViewer } from './DayView';
import InteractiveActivityViewer from './InteractiveActivityViewer';
import NotesReader from './NotesReader';
import { useAuth } from '../../contexts/AuthContext';
import { useLmsDemo, isDemoUser } from '../../components/lmsDemo/DemoShell';
import './learningPlanDay.css';

const fmtTime = (secs: number) => {
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

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
  // An LMS demo student: fewer tabs, and the AI helper shows the day's allowance.
  const { user } = useAuth() as any;
  const demo = isDemoUser(user);
  const { me: demoMe, refresh: refreshDemo } = useLmsDemo();

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
    finally { setAiLoading(false); if (demo) refreshDemo(); }
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
  // Every day as a card in one scrolling row; the day on show is scrolled into view.
  const daysRow = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = daysRow.current; if (!row) return;
    const cur = row.querySelector<HTMLElement>('[aria-current="page"]');
    if (cur) row.scrollTo({ left: Math.max(0, cur.offsetLeft - row.clientWidth / 2 + cur.clientWidth / 2), behavior: 'smooth' });
  }, [dayNumber, allDays.length]);
  const scrollDays = (dir: number) => { const row = daysRow.current; if (row) row.scrollBy({ left: dir * Math.max(240, row.clientWidth * 0.8), behavior: 'smooth' }); };

  if (loading) return <div className="lpd"><div className="lpd-state"><div className="lpd-spin" /> Loading your day…</div></div>;
  if (!data) return <div className="lpd"><div className="lpd-state err"><i className="bi bi-exclamation-circle" /> Could not load this day. <button type="button" onClick={load}>Try again</button></div></div>;

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
  const dayDone = items.filter(i => i.isCompleted).length;
  const dayPct = items.length ? Math.round((dayDone / items.length) * 100) : 0;
  const dayMinutes = items.reduce((a, i) => a + (itemMeta(i).duration || 0), 0);
  const dayTitle = data.dayTitle || data.topic?.title || '';
  // A demo student has no playground, assignments or class discussion; those tabs would only fail.
  const tabs = (demo ? ['description', 'notes', 'resources'] : ['description', 'notes', 'code', 'resources', 'submissions', 'discussion']) as Array<typeof tab>;
  const aiInfo = demo ? demoMe?.ai : undefined;
  const aiOff = !!aiInfo && aiInfo.limit === 0;
  const ask = (action: string, q?: string) => { if (!aiOff) runAssistant(action, q); };

  return (
    <div className="lpd">
      {/* ── Day header ── */}
      <header className="lpd-hero">
        <div className="lpd-hero-main">
          <div className="lpd-crumbs">
            <button type="button" onClick={() => navigate('/my-learning')}><i className="bi bi-arrow-left" /> My Learning Plan</button>
            <span aria-hidden="true">/</span>
            <button type="button" onClick={() => navigate(`/my-learning/${enrollmentId}/journey`)}>All days</button>
          </div>
          <span className="lpd-eyebrow">{data.enrollment?.curriculumTitle || data.curriculum?.title}</span>
          <h1>Day {dayNumber}{dayTitle ? <span>: {dayTitle}</span> : null}</h1>
          <div className="lpd-chips">
            <span><i className="bi bi-list-check" /> {dayDone}/{items.length} done</span>
            {dayMinutes > 0 && <span><i className="bi bi-clock" /> {dayMinutes} min</span>}
            <span><i className="bi bi-fire" /> {summary?.streak ?? 0} day streak</span>
            <span><i className="bi bi-lightning-charge-fill" /> {summary?.xp ?? 0} XP</span>
          </div>
          <div className="lpd-bar" aria-label={`Day ${dayPct}% done`}><i style={{ width: `${dayPct}%` }} /></div>
        </div>
        <div className="lpd-hero-side">
          <div className="lpd-ring" style={{ ['--p' as any]: `${donutPct * 3.6}deg` }}><div><b>{donutPct}%</b><span>course</span></div></div>
          <div className="lpd-daynav">
            <button type="button" disabled={dayNumber <= 1} onClick={() => navigate(`/my-learning/${enrollmentId}/day/${dayNumber - 1}`)}><i className="bi bi-chevron-left" /> Day {Math.max(1, dayNumber - 1)}</button>
            <button type="button" disabled={!totalDays || dayNumber >= totalDays} onClick={() => navigate(`/my-learning/${enrollmentId}/day/${dayNumber + 1}`)}>Day {dayNumber + 1} <i className="bi bi-chevron-right" /></button>
          </div>
        </div>
      </header>

      {/* ── Day cards + search ── */}
      <section className="lpd-strip-card">
        <div className="lpd-strip-head">
          <div>
            <b>Your days</b>
            <span>{completedDaysCount} of {totalDays} days complete</span>
          </div>
          <div className="lpd-search">
            <i className="bi bi-search" />
            <input value={search} onChange={e => runSearch(e.target.value)} placeholder="Search topics and lessons" aria-label="Search this plan" />
            {searchResults.length > 0 && (
              <div className="lpd-search-res">
                {searchResults.map((r, i) => (
                  <button key={i} type="button" onClick={() => { setSearch(''); setSearchResults([]); navigate(`/my-learning/${enrollmentId}/day/${r.dayNumber}`); }}>
                    <b>Day {r.dayNumber}</b> {r.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="lpd-strip">
          <button type="button" className="lpd-strip-arrow" onClick={() => scrollDays(-1)} aria-label="Earlier days"><i className="bi bi-chevron-left" /></button>
          <div className="lpd-days" ref={daysRow}>
            {allDays.map(d => {
              const isCur = d.day === dayNumber;
              const st = d.locked ? 'locked' : d.status === 'completed' ? 'done' : isCur ? 'cur' : d.status === 'current' ? 'today' : 'next';
              const label = st === 'done' ? 'Done' : st === 'locked' ? 'Locked' : isCur ? 'Open now' : st === 'today' ? 'Up next' : 'Not started';
              return (
                <button key={d.day} type="button" disabled={d.locked} className={`lpd-day ${st}${isCur ? ' sel' : ''}`}
                  onClick={() => !d.locked && navigate(`/my-learning/${enrollmentId}/day/${d.day}`)} aria-current={isCur ? 'page' : undefined}>
                  <span className="lpd-day-top">
                    <span className="lpd-day-n"><small>Day</small><b>{d.day}</b></span>
                    <i className={`bi ${st === 'done' ? 'bi-check-circle-fill' : st === 'locked' ? 'bi-lock-fill' : isCur ? 'bi-play-circle-fill' : 'bi-circle'}`} />
                  </span>
                  <span className="lpd-day-title">{d.title || (isCur && dayTitle) || `Day ${d.day} lessons`}</span>
                  <span className="lpd-day-st">{label}</span>
                </button>
              );
            })}
          </div>
          <button type="button" className="lpd-strip-arrow" onClick={() => scrollDays(1)} aria-label="Later days"><i className="bi bi-chevron-right" /></button>
        </div>
      </section>

      {/* ── Tasks · lesson · helpers ── */}
      <div className="lpd-grid">
        <div className="lpd-col">
        <aside className="lpd-rail">
          <div className="lpd-rail-head"><b>Today's tasks</b><span>{dayDone}/{items.length}</span></div>
          <div className="lpd-tasks">
            {items.map((it, i) => {
              const m = itemMeta(it);
              const active = i === selIdx;
              return (
                <button key={i} type="button" className={`lpd-task${active ? ' sel' : ''}${it.isCompleted ? ' done' : ''}`} onClick={() => { setSelIdx(i); setTab('description'); }}>
                  <span className={`lpd-task-ic t-${typeKey(it)}`}><i className={`bi ${typeIcon(it)}`} /></span>
                  <span className="lpd-task-tx">
                    <b>{m.title}</b>
                    <small>{m.label}{m.duration ? ` · ${m.duration} min` : ''}</small>
                  </span>
                  <i className={`bi ${it.isCompleted ? 'bi-check-circle-fill' : active ? 'bi-play-fill' : 'bi-circle'} lpd-task-st`} />
                </button>
              );
            })}
            {items.length === 0 && <div className="lpd-empty-small"><i className="bi bi-calendar2-week" /> No lessons for this day yet.</div>}
          </div>
        </aside>

        {/* Progress cards: under the task list on laptops, after everything else on phones. */}
        <div className="lpd-extras">
          {/* Today's goal */}
          {!demo && (
            <section className="lpd-card">
              <div className="lpd-card-head"><b><i className="bi bi-bullseye" /> Today's goal</b><button type="button" className="lpd-link" onClick={() => { setGoalDraft(goal.targets); setGoalEdit(true); }}>Edit</button></div>
              {goalItems.map(g => (
                <div key={g.key} className={`lpd-goal${g.done ? ' done' : ''}`}><i className={`bi ${g.done ? 'bi-check-circle-fill' : 'bi-circle'}`} /> {g.label}</div>
              ))}
              <div className="lpd-mini-bar"><i style={{ width: `${goalPct}%` }} /></div>
            </section>
          )}

          {/* Progress */}
          <section className="lpd-card">
            <div className="lpd-card-head"><b><i className="bi bi-graph-up" /> Course progress</b><span className="lpd-count">{donutPct}%</span></div>
            <div className="lpd-prog">
              <ProgressRow tone="green" label="Completed" value={progress.completed} />
              <ProgressRow tone="amber" label="In progress" value={progress.inProgress} />
              <ProgressRow tone="grey" label="Not started" value={progress.notStarted} />
              <div className="lpd-prog-total">Total <b>{progress.total}</b> lessons · {fmtTime(summary?.timeSpentSeconds || 0)} spent</div>
            </div>
          </section>

          {Array.isArray(summary?.badges) && summary.badges.length > 0 && (
            <section className="lpd-card">
              <div className="lpd-card-head"><b><i className="bi bi-award" /> Badges</b><span className="lpd-count">{summary.badges.filter((b: any) => b.earned).length}/{summary.badges.length}</span></div>
              <div className="lpd-badges">
                {summary.badges.map((b: any) => (
                  <div key={b.id} title={b.hint} className={b.earned ? 'on' : ''}>
                    <span>{b.earned ? b.icon : <i className="bi bi-lock-fill" />}</span>
                    <b>{b.label}</b>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
        </div>

        <main className="lpd-stage">
          {data.isLocked ? (
            <div className="lpd-locked">
              <i className={`bi ${data.lockReason === 'schedule' ? 'bi-calendar-event' : 'bi-lock'}`} />
              <h3>{data.lockReason === 'schedule' ? 'This day unlocks soon' : 'This day is locked'}</h3>
              <p>{data.lockReason === 'schedule' ? `Your batch is on Day ${data.todayPlanDay ?? '—'} — revisit earlier days anytime.` : 'Complete the required items in the previous day.'}</p>
            </div>
          ) : !selected ? (
            <div className="lpd-locked"><i className="bi bi-hand-index" /><h3>Pick a task to begin</h3><p>Choose a lesson from the list.</p></div>
          ) : (
            <>
              <div className="lpd-stage-head">
                <div>
                  <span className={`lpd-type t-${typeKey(selected)}`}><i className={`bi ${typeIcon(selected)}`} /> {selMeta!.label}{selMeta!.duration ? ` · ${selMeta!.duration} min` : ''}</span>
                  <h2>{selMeta!.title}</h2>
                </div>
                {selContentId && (
                  <button type="button" className={`lpd-icon-btn${bookmarks.has(selContentId) ? ' on' : ''}`} onClick={toggleBookmark} title={bookmarks.has(selContentId) ? 'Remove bookmark' : 'Bookmark'} aria-pressed={bookmarks.has(selContentId)}>
                    <i className={`bi ${bookmarks.has(selContentId) ? 'bi-bookmark-fill' : 'bi-bookmark'}`} />
                  </button>
                )}
              </div>

              <div className="lpd-body"><ContentBody item={selected} /></div>

              <div className="lpd-tabs" role="tablist">
                {tabs.map(t => (
                  <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
                    {t}{t === 'discussion' && comments.length ? ` (${comments.length})` : ''}
                  </button>
                ))}
              </div>

              <div className="lpd-tab-body">
                {tab === 'description' && <div className="lpd-desc">{selected.content?.description || selected.description || 'No description for this lesson.'}</div>}
                {tab === 'notes' && <NotesViewerSafe item={selected} />}
                {tab === 'code' && (
                  <div className="lpd-center">
                    <p>Practice this topic in the code playground.</p>
                    <button type="button" className="lpd-btn navy" onClick={() => navigate('/code-playground')}><i className="bi bi-code-slash" /> Open Code Playground</button>
                  </div>
                )}
                {tab === 'resources' && <ResourcesTab item={selected} />}
                {tab === 'submissions' && (
                  selected.kind === 'assignment' || selected.launchPath
                    ? <button type="button" className="lpd-btn navy" onClick={() => navigate(selected.launchPath)}><i className="bi bi-clipboard-check" /> Open assignment & submissions</button>
                    : <p className="lpd-muted">Submissions apply to assignment tasks.</p>
                )}
                {tab === 'discussion' && (
                  <div>
                    <div className="lpd-compose">
                      <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && postComment()} placeholder="Ask a question or share a thought…" aria-label="Write a comment" />
                      <button type="button" className="lpd-btn navy" onClick={postComment}>Post</button>
                    </div>
                    {comments.length === 0 && <p className="lpd-muted">No comments yet — start the discussion.</p>}
                    {comments.map((c, i) => (
                      <div key={i} className="lpd-comment">
                        <div><b>{c.authorName || 'Student'}</b> · {new Date(c.createdAt).toLocaleDateString()}</div>
                        <p>{c.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="lpd-stage-foot">
                <button type="button" className="lpd-btn ghost" disabled={selIdx === 0} onClick={() => { setSelIdx(i => Math.max(0, i - 1)); setTab('description'); }}><i className="bi bi-arrow-left" /> Previous</button>
                {selContentId && !selected.isCompleted && <button type="button" className="lpd-btn green" onClick={markComplete}><i className="bi bi-check2-circle" /> Mark complete</button>}
                {selected.isCompleted && <span className="lpd-done-pill"><i className="bi bi-check-circle-fill" /> Completed</span>}
                <button type="button" className="lpd-btn navy" disabled={selIdx >= items.length - 1} onClick={() => { setSelIdx(i => Math.min(items.length - 1, i + 1)); setTab('description'); }}>Next <i className="bi bi-arrow-right" /></button>
              </div>
            </>
          )}
        </main>

        <aside className="lpd-side">
          {/* AI study helper */}
          <section className="lpd-card">
            <div className="lpd-card-head">
              <b><i className="bi bi-robot" /> AI study helper</b>
              {aiInfo ? <span className={`lpd-ai-left${aiInfo.left === 0 ? ' out' : ''}`}>{aiInfo.left}/{aiInfo.limit} today</span> : <span className="lpd-beta">BETA</span>}
            </div>
            {aiOff ? <p className="lpd-muted">The AI helper is not part of this demo.</p> : (
              <>
                <div className="lpd-quick">
                  <button type="button" onClick={() => ask('explain')} disabled={aiLoading}>Explain this</button>
                  <button type="button" onClick={() => ask('example')} disabled={aiLoading}>Give an example</button>
                  <button type="button" onClick={() => ask('mcqs')} disabled={aiLoading}>Quiz me (MCQs)</button>
                  <button type="button" onClick={() => ask('translate')} disabled={aiLoading}>In Telugu</button>
                </div>
                <div className="lpd-compose">
                  <input value={aiQ} onChange={e => setAiQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && aiQ.trim()) { ask('ask', aiQ); setAiQ(''); } }} placeholder="Ask your doubt…" aria-label="Ask the AI helper" />
                  <button type="button" className="lpd-btn navy sq" onClick={() => { if (aiQ.trim()) { ask('ask', aiQ); setAiQ(''); } }} aria-label="Ask"><i className="bi bi-send-fill" /></button>
                </div>
                {(aiLoading || aiOut) && <div className="lpd-ai-out">{aiLoading ? 'Thinking…' : aiOut}</div>}
              </>
            )}
          </section>

          {/* My notes */}
          <section className="lpd-card">
            <div className="lpd-card-head"><b><i className="bi bi-sticky" /> My notes</b><span className="lpd-count">{notes.length}</span></div>
            <div className="lpd-compose">
              <input value={noteText} onChange={e => setNoteText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNote()} placeholder="Add a note…" aria-label="Add a note" />
              <button type="button" className="lpd-btn navy sq" onClick={addNote} aria-label="Add note"><i className="bi bi-plus-lg" /></button>
            </div>
            <div className="lpd-notes">
              {notes.slice(0, 8).map(n => (
                <div key={n._id} className="lpd-note">
                  <p>{n.text}</p>
                  <small>{new Date(n.createdAt).toLocaleDateString()}{n.contentTitle ? ` · ${n.contentTitle}` : ''}</small>
                  <button type="button" onClick={() => delNote(n._id)} title="Delete note" aria-label="Delete note"><i className="bi bi-trash3" /></button>
                </div>
              ))}
              {notes.length === 0 && <p className="lpd-muted">No notes yet.</p>}
            </div>
          </section>
        </aside>
      </div>

      {/* Goal editor */}
      {goalEdit && (
        <div className="lpd-modal" role="dialog" aria-modal="true" onClick={() => setGoalEdit(false)}>
          <div className="lpd-modal-card" onClick={e => e.stopPropagation()}>
            <h3>Edit today's goal</h3>
            {(['videos', 'assignments', 'quizzes'] as const).map(k => (
              <label key={k} className="lpd-goal-row"><span>{k}</span>
                <input type="number" min={0} max={20} value={goalDraft[k]} onChange={e => setGoalDraft(d => ({ ...d, [k]: parseInt(e.target.value, 10) || 0 }))} />
              </label>
            ))}
            <div className="lpd-modal-actions">
              <button type="button" className="lpd-btn ghost" onClick={() => setGoalEdit(false)}>Cancel</button>
              <button type="button" className="lpd-btn navy" onClick={saveGoals}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Small components ──────────────────────────────────────────────────────────
const typeKey = (item: any): string => {
  const t = item?.content?.type || item?.contentType || item?.kind || 'content';
  if (t === 'video') return 'video';
  if (t === 'notes' || t === 'worked_example') return 'notes';
  if (t === 'quiz' || t === 'aptitude' || t === 'practice_theory') return 'quiz';
  if (t === 'practice_coding' || t === 'codeSnippet') return 'code';
  if (t === 'assignment') return 'assign';
  if (t === 'tech_qa' || t === 'behavioral_qa' || t === 'mockInterview') return 'qa';
  return 'other';
};
const TYPE_ICON: Record<string, string> = {
  video: 'bi-play-btn-fill', notes: 'bi-journal-text', quiz: 'bi-patch-question', code: 'bi-code-slash',
  assign: 'bi-clipboard-check', qa: 'bi-chat-square-text', other: 'bi-hand-index-thumb',
};
const typeIcon = (item: any) => TYPE_ICON[typeKey(item)];

const ProgressRow: React.FC<{ tone: 'green' | 'amber' | 'grey'; label: string; value: number }> = ({ tone, label, value }) => (
  <div className="lpd-prog-row"><span className={`dot ${tone}`} /><span>{label}</span><b>{value}</b></div>
);

// Dispatch a content item to the right student renderer.
const ContentBody: React.FC<{ item: any }> = ({ item }) => {
  const c = item.content;
  if (!c) {
    // Module item (assignment/quiz/etc.)
    return (
      <div className="lpd-module">
        <i className={`bi ${typeIcon(item)}`} />
        <p>This is a {item.kind === 'codeSnippet' ? 'code' : item.kind === 'mockInterview' ? 'mock interview' : item.kind} activity.</p>
        {item.launchPath && <a className="lpd-btn navy" href={item.launchPath}>Open {item.kind === 'codeSnippet' ? 'code' : item.kind}</a>}
      </div>
    );
  }
  switch (c.type) {
    case 'video': return <VideoPlayer content={c} onWatchEnough={() => {}} />;
    case 'notes':
    case 'worked_example': return <NotesReader content={c} />;
    case 'tech_qa': case 'behavioral_qa': return <QAViewer content={c} />;
    case 'practice_coding': case 'practice_theory': case 'aptitude': return <PracticeViewer content={c} />;
    case 'interactive_activity': return c.htmlContent ? <InteractiveActivityViewer htmlContent={c.htmlContent} completed={false} onComplete={() => {}} /> : <p className="lpd-muted">No activity content.</p>;
    default: return <p className="lpd-muted">Preview not available for this type.</p>;
  }
};

const NotesViewerSafe: React.FC<{ item: any }> = ({ item }) => {
  const c = item.content;
  if (c && (c.notesContent || c.notesFilePath)) return <NotesReader content={c} />;
  return <p className="lpd-muted">No notes for this lesson.</p>;
};

const ResourcesTab: React.FC<{ item: any }> = ({ item }) => {
  const c = item.content;
  const links: { label: string; href: string }[] = [];
  if (c?.notesFilePath) links.push({ label: 'Notes / document', href: `/api/v1/learning-library/${c._id}/file` });
  if (c?.type === 'video' && c?.videoSource === 'upload') links.push({ label: 'Video (stream)', href: `/api/v1/learning-library/${c._id}/stream` });
  if (links.length === 0) return <p className="lpd-muted">No downloadable resources for this lesson.</p>;
  return (
    <div className="lpd-resources">
      {links.map((l, i) => <a key={i} href={l.href} target="_blank" rel="noopener noreferrer"><i className="bi bi-paperclip" /> {l.label}</a>)}
    </div>
  );
};

export default LearningPlanPro;
