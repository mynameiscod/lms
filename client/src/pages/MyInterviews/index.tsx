import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { scheduledInterviewApi } from '../../api';
import { studentInterviewApi } from '../../api/interviewModuleApi';
import { useLmsDemo } from '../../components/lmsDemo/DemoShell';
import './myInterviews.css';

/**
 * My Interviews, in the CareerPilot look: a navy banner with the counts, then three tabs —
 *   Practice  interviews a student can start on demand (for a demo student, the ones chosen for the demo)
 *   Upcoming  assigned AI interviews and scheduled mock interviews
 *   Results   AI reports and interviewer feedback
 * Same data and the same doors as before; only the look and the practice list are new.
 */

type CriterionStatus = 'good' | 'average' | 'poor';
type Tab = 'practice' | 'upcoming' | 'results';

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' });
const fmtTime = (t: string) => { const [h, m] = String(t).split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };
const scoreTone = (s: number) => (s >= 8 ? 'good' : s >= 5 ? 'mid' : 'low');

const TypeChip: React.FC<{ ai: boolean }> = ({ ai }) => (
  <span className={`myi-chip ${ai ? 'ai' : 'mock'}`}><i className={`bi ${ai ? 'bi-robot' : 'bi-person-video3'}`} /> {ai ? 'AI interview' : 'Mock interview'}</span>
);

const MyInterviews: React.FC = () => {
  const navigate = useNavigate();
  const { me: demoMe } = useLmsDemo();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [practice, setPractice] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab | null>(null);

  useEffect(() => {
    Promise.all([
      studentInterviewApi.getAssignments().catch(() => ({})),
      studentInterviewApi.getAttempts().catch(() => ({})),
      scheduledInterviewApi.getMyInterviews().catch(() => ({})),
      scheduledInterviewApi.getMyFeedback().catch(() => ({})),
      studentInterviewApi.getPracticeTemplates().catch(() => ({})),
    ]).then(([aRes, atRes, ivRes, fbRes, prRes]: any[]) => {
      setAssignments(aRes.data || aRes.assignments || []);
      setAttempts(atRes.attempts || atRes.data || []);
      setInterviews(ivRes.data || []);
      setFeedbacks(fbRes.data || []);
      setPractice(prRes.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const today0 = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  const aiActive = assignments.filter(a => a.status === 'assigned' || a.status === 'in_progress');
  const aiReports = attempts.filter(a => ['completed', 'evaluated', 'result_published'].includes(a.status));
  const mockUpcoming = interviews.filter(iv => new Date(iv.date).getTime() >= today0);
  const mockPast = interviews.filter(iv => new Date(iv.date).getTime() < today0);
  const fbByInterview = new Map(feedbacks.map((f: any) => [String(f.interviewId?._id || f.interviewId), f]));
  const upcomingCount = aiActive.length + mockUpcoming.length;
  const resultsCount = aiReports.length + feedbacks.length;
  // Open on whatever has something in it: practice first when there is practice and nothing scheduled.
  const shown: Tab = tab || (upcomingCount ? 'upcoming' : practice.length ? 'practice' : 'upcoming');
  const allowance = demoMe?.use?.mock;

  if (loading) return <div className="myi"><div className="myi-state"><span className="myi-spin" /> Loading your interviews…</div></div>;

  return (
    <div className="myi">
      <header className="myi-hero">
        <div className="myi-hero-copy">
          <span className="myi-eyebrow">Interview practice</span>
          <h1>My Interviews</h1>
          <p>Practise with an AI interviewer, attend mock interviews, and see every result in one place.</p>
        </div>
        <div className="myi-tiles">
          <div><b>{practice.length}</b><span>Practice interviews</span></div>
          <div><b>{upcomingCount}</b><span>Upcoming</span></div>
          <div><b>{resultsCount}</b><span>Reports</span></div>
        </div>
      </header>

      <nav className="myi-tabs" role="tablist" aria-label="Interviews">
        {([['practice', 'Practice', practice.length], ['upcoming', 'Upcoming', upcomingCount], ['results', 'Results', resultsCount]] as const).map(([k, l, n]) => (
          <button key={k} type="button" role="tab" aria-selected={shown === k} className={shown === k ? 'on' : ''} onClick={() => setTab(k)}>
            {l} <em>{n}</em>
          </button>
        ))}
      </nav>

      {shown === 'practice' && (
        practice.length === 0 ? (
          <Empty icon="bi-mic" title="No practice interviews yet" sub="Practice interviews you can start any time will appear here." />
        ) : (
          <>
            {allowance && allowance.limit > 0 && <div className="myi-note"><i className="bi bi-info-circle" /> You can start {allowance.left} of {allowance.limit} practice interviews today.</div>}
            <div className="myi-grid">
              {practice.map((t: any) => (
                <article key={t._id} className="myi-card myi-practice">
                  <span className="myi-ic ai"><i className="bi bi-robot" /></span>
                  <div className="myi-card-body">
                    <h3>{t.title}</h3>
                    {t.description && <p>{t.description}</p>}
                    <div className="myi-meta">
                      {t.totalDuration ? <span><i className="bi bi-clock" /> {t.totalDuration} min</span> : null}
                      {t.sectionCount ? <span><i className="bi bi-list-ol" /> {t.sectionCount} section{t.sectionCount === 1 ? '' : 's'}</span> : null}
                      {t.difficultyLevel && <span className={`myi-diff ${t.difficultyLevel}`}>{t.difficultyLevel}</span>}
                    </div>
                  </div>
                  <button type="button" className="myi-btn navy" disabled={!!allowance && allowance.limit > 0 && allowance.left === 0} onClick={() => navigate(`/student/interviews/take/${t._id}`)}>
                    <i className="bi bi-play-fill" /> Start
                  </button>
                </article>
              ))}
            </div>
          </>
        )
      )}

      {shown === 'upcoming' && (
        upcomingCount === 0 ? (
          <Empty icon="bi-calendar-event" title="No interviews coming up" sub="Assigned AI interviews and scheduled mock interviews will appear here." action={practice.length ? { label: 'Practise one now', onClick: () => setTab('practice') } : undefined} />
        ) : (
          <div className="myi-list">
            {aiActive.map(a => (
              <article key={a._id} className="myi-card">
                <span className="myi-ic ai"><i className="bi bi-robot" /></span>
                <div className="myi-card-body">
                  <h3>{a.templateId?.title || 'AI Interview'} <TypeChip ai /></h3>
                  <div className="myi-meta">
                    {a.templateId?.totalDuration ? <span><i className="bi bi-clock" /> {a.templateId.totalDuration} min</span> : null}
                    <span><i className="bi bi-arrow-repeat" /> Attempts {a.attemptsUsed ?? 0}/{a.maxAttempts ?? 1}</span>
                    {a.dueDate ? <span><i className="bi bi-calendar" /> Due {new Date(a.dueDate).toLocaleDateString()}</span> : null}
                  </div>
                </div>
                <button type="button" className="myi-btn navy" disabled={a.attemptsUsed >= a.maxAttempts}
                  onClick={() => navigate(`/student/interviews/live/${a.templateId?._id || a.templateId}?assignmentId=${a._id}`)}>
                  {a.status === 'in_progress' ? 'Resume' : a.attemptsUsed > 0 ? 'Reattempt' : 'Start'} <i className="bi bi-arrow-right" />
                </button>
              </article>
            ))}
            {mockUpcoming.map(iv => <MockCard key={iv._id} iv={iv} />)}
          </div>
        )
      )}

      {shown === 'results' && (
        resultsCount === 0 && mockPast.length === 0 ? (
          <Empty icon="bi-clipboard-data" title="No results yet" sub="Your AI reports and interviewer feedback will show up here." />
        ) : (
          <div className="myi-list">
            {aiReports.map(att => (
              <article key={att._id} className="myi-card">
                <span className="myi-ic ai"><i className="bi bi-robot" /></span>
                <div className="myi-card-body">
                  <h3>{att.templateId?.title || 'AI Interview'} <TypeChip ai /></h3>
                  <div className="myi-meta">
                    <span className="myi-score">Score {att.overallPercentage != null ? `${att.overallPercentage.toFixed(0)}%` : '—'}</span>
                    {att.startedAt ? <span><i className="bi bi-calendar" /> {new Date(att.startedAt).toLocaleDateString()}</span> : null}
                  </div>
                </div>
                <button type="button" className="myi-btn ghost" onClick={() => navigate(`/student/interviews/report/${att._id}`)}>View report <i className="bi bi-arrow-right" /></button>
              </article>
            ))}
            {feedbacks.map((fb: any) => <FeedbackCard key={fb._id} fb={fb} />)}
            {mockPast.filter(iv => !fbByInterview.has(String(iv._id))).map(iv => (
              <article key={iv._id} className="myi-card">
                <span className="myi-ic mock"><i className="bi bi-person-video3" /></span>
                <div className="myi-card-body">
                  <h3>{iv.title} <TypeChip ai={false} /></h3>
                  <div className="myi-meta"><span><i className="bi bi-calendar" /> {fmtDate(iv.date)}</span><span><i className="bi bi-person" /> {iv.interviewerName}</span></div>
                </div>
                <span className="myi-wait">Awaiting feedback</span>
              </article>
            ))}
          </div>
        )
      )}
    </div>
  );
};

const MockCard: React.FC<{ iv: any }> = ({ iv }) => {
  const [open, setOpen] = useState(false);
  const daysUntil = Math.ceil((new Date(iv.date).getTime() - Date.now()) / 86400000);
  return (
    <article className="myi-card col">
      <div className="myi-card-row" onClick={() => setOpen(o => !o)} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') setOpen(o => !o); }}>
        <span className="myi-date"><small>{new Date(iv.date).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}</small><b>{new Date(iv.date).getDate()}</b></span>
        <div className="myi-card-body">
          <h3>{iv.title} <TypeChip ai={false} />{daysUntil <= 3 && daysUntil >= 0 && <span className="myi-soon">{daysUntil === 0 ? 'Today' : `In ${daysUntil}d`}</span>}</h3>
          <div className="myi-meta"><span><i className="bi bi-clock" /> {fmtDate(iv.date)} at {fmtTime(iv.time)}</span><span>{iv.duration} min</span><span><i className="bi bi-person" /> {iv.interviewerName}</span></div>
        </div>
        {iv.meetLink && <a href={iv.meetLink} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="myi-btn navy">Join <i className="bi bi-box-arrow-up-right" /></a>}
        <i className={`bi bi-chevron-${open ? 'up' : 'down'} myi-caret`} />
      </div>
      {open && (
        <div className="myi-more">
          {iv.venue && <p><i className="bi bi-geo-alt" /> <b>Venue:</b> {iv.venue}</p>}
          {iv.description && <p>{iv.description}</p>}
          {(iv.criteria || []).length > 0 && <div className="myi-crit">{iv.criteria.map((c: any) => <span key={c.key}>{c.label}</span>)}</div>}
        </div>
      )}
    </article>
  );
};

const FeedbackCard: React.FC<{ fb: any }> = ({ fb }) => {
  const iv = fb.interviewId;
  return (
    <article className="myi-fb">
      <div className="myi-fb-head">
        <div><b>{iv?.title || 'Mock Interview'}</b><span>{iv?.date && fmtDate(iv.date)} {iv?.interviewerName && `· ${iv.interviewerName}`}</span></div>
        <TypeChip ai={false} />
      </div>
      <div className="myi-fb-body">
        {fb.attendanceStatus === 'absent' ? <div className="myi-absent">Marked absent</div> : (
          <>
            {fb.overallScore != null && (
              <div className="myi-overall"><span>Overall score</span><b className={scoreTone(fb.overallScore)}>{fb.overallScore.toFixed(1)}</b><em>/10</em></div>
            )}
            <div className="myi-rates">
              {(fb.criteriaRatings || []).map((r: any) => (
                <div key={r.key} className="myi-rate">
                  <span className="l">{r.label}</span>
                  <i className="bar"><em className={scoreTone(r.score)} style={{ width: `${r.score * 10}%` }} /></i>
                  <b className={scoreTone(r.score)}>{r.score}</b>
                  <span className={`st ${(r.status as CriterionStatus) || ''}`}>{r.status}</span>
                </div>
              ))}
            </div>
            {fb.overallComment && <div className="myi-comment"><b>Interviewer comments: </b>{fb.overallComment}</div>}
          </>
        )}
      </div>
    </article>
  );
};

const Empty: React.FC<{ icon: string; title: string; sub: string; action?: { label: string; onClick: () => void } }> = ({ icon, title, sub, action }) => (
  <div className="myi-empty">
    <span className="myi-empty-ic"><i className={`bi ${icon}`} /></span>
    <b>{title}</b>
    <span>{sub}</span>
    {action && <button type="button" className="myi-btn navy" onClick={action.onClick}>{action.label}</button>}
  </div>
);

export default MyInterviews;
