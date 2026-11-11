import React, { useCallback, useEffect, useState } from 'react';
import { communicationApi, CommProfile, CommAttempt, CommProgress } from '../../api/communicationApi';
import CoachTab, { CoachResult, CoachState, CoachStep } from './CoachTab';
import { isCounted } from './LabHome';
import './communicationLab.css';
import { useLocation } from 'react-router-dom';
import DailyPracticeCard from '../Passport/DailyPracticeCard';
import SpeakingFeedback from './SpeakingFeedback';
import Recorder from './Recorder';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const scoreColor = (s?: number | null) => {
  if (s == null) return '#94a3b8';
  if (s >= 80) return '#16835d';
  if (s >= 60) return '#b86b00';
  return '#c93737';
};


// Three tabs only: practise, see how you are improving, see how you compare. Profile is a link, not a tab.
const TABS = [['coach', 'Practice'], ['progress', 'Progress'], ['leaderboard', 'Leaderboard']] as const;

type Tab = typeof TABS[number][0] | 'profile';

const ScoreCard: React.FC<{ label: string; value: number | null | undefined }> = ({ label, value }) => (
  <div className="clx-card clx-score-card"><b style={{ color: scoreColor(value) }}>{value ?? '—'}</b><span>{label}</span></div>
);


const ProfileForm: React.FC = () => {
  const [p, setP] = useState<CommProfile>({});
  const [template, setTemplate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  useEffect(() => { communicationApi.getProfile().then(r => { setP(r.profile || {}); setTemplate(r.template || ''); }).finally(() => setLoading(false)); }, []);
  const set = (k: keyof CommProfile, v: any) => setP(x => ({ ...x, [k]: v }));
  const text = (k: keyof CommProfile, label: string, ph = '', full = false) => <div className={`clx-field ${full ? 'full' : ''}`}><label>{label}</label><input value={(p[k] as string) || ''} placeholder={ph} onChange={e => set(k, e.target.value)} /></div>;
  const list = (k: keyof CommProfile, label: string, ph = '', full = false) => <div className={`clx-field ${full ? 'full' : ''}`}><label>{label}</label><input value={((p[k] as string[]) || []).join(', ')} placeholder={ph} onChange={e => set(k, e.target.value.split(',').map(s => s.trim()).filter(Boolean))} /></div>;
  const save = async () => { const r = await communicationApi.updateProfile(p); setTemplate(r.template || ''); setSaved(true); setTimeout(() => setSaved(false), 2200); };
  if (loading) return <div className="clx-card clx-empty">Loading your communication profile…</div>;
  return <div className="clx-profile"><div className="clx-card clx-form"><div className="clx-section" style={{ padding: 0, marginBottom: 16 }}><h2>Your communication profile</h2><p style={{ color: '#2F3F56', fontSize: 13 }}>Give the AI real context so your practice and introduction feedback stay personal and accurate.</p></div><div className="clx-form-grid">{text('fullName','Full name')}{text('currentCity','Current city')}{text('degree','Degree','B.Tech')}{text('specialization','Specialization','CSE')}{text('college','College')}{text('graduationYear','Graduation year','2026')}{text('cgpaOrPercentage','CGPA / Percentage')}{text('targetRole','Target role','Java Developer')}{list('primarySkills','Primary skills','Java, Spring Boot, SQL',true)}{list('secondarySkills','Secondary skills','Git, Docker',true)}{text('trainingInstitute','Training institute','CodeBegun')}{text('internshipDetails','Internship details')}{text('projectName','Main project name', '', true)}{text('projectObjective','Project objective','',true)}{list('projectTechnologies','Project technologies','React, Node, MongoDB',true)}{text('projectResponsibilities','Your responsibilities','',true)}{list('strengths','Strengths','Quick learner, Team player',true)}{text('shortTermGoal','Short-term goal')}{text('longTermGoal','Long-term goal')}{list('targetCompanies','Target companies','ServiceNow, Microsoft',true)}</div><div className="clx-actions"><button className="clx-btn primary" onClick={save}><i className="bi bi-check2-circle" /> Save profile</button>{saved && <span style={{ color:'#16835d',fontWeight:700,fontSize:13 }}><i className="bi bi-check-circle-fill" /> Saved</span>}</div></div><aside className="clx-card clx-template"><h3><i className="bi bi-file-earmark-text" /> Your intro template</h3><p style={{ color:'#2F3F56' }}>Use this as a structure and speak naturally in your own words.</p><p>{template || 'Complete your profile to generate a personal introduction structure.'}</p></aside></div>;
};

const ResultView: React.FC<{ a: CommAttempt; onClose: () => void }> = ({ a, onClose }) => {
  const e: any = a.evaluation;
  if (!e) return null;
  const wpm = e.speakingSpeed?.wordsPerMinute ?? (a as any).wordsPerMinute;
  return <SpeakingFeedback
    title={a.challengeTitle || 'Your recording'} score={e.overallScore ?? 0} level={e.readinessLevel}
    message={e.dailyCoachMessage} strengths={e.strengths} improve={e.areasToImprove}
    nextFocus={e.nextPracticeFocus} betterAnswer={e.improvedIntroduction}
    fixes={[...(e.grammarCorrections || []), ...(e.sentenceImprovements || [])]}
    onBack={onClose} backLabel="Back"
    measures={[
      { label: 'Words per minute', value: wpm ?? '—', hint: e.speakingSpeed?.recommendedRange ? `Comfortable range: ${e.speakingSpeed.recommendedRange}` : undefined },
      { label: '"Um" and "uh"', value: e.fillerWords?.total ?? '—' },
    ]}
    scores={[
      { label: 'Confidence', value: e.confidenceScore }, { label: 'Clarity', value: e.clarityScore },
      { label: 'Fluency', value: e.fluencyScore }, { label: 'Grammar', value: e.grammarScore },
      { label: 'Content', value: e.contentScore }, { label: 'Your project', value: e.projectExplanationScore },
      { label: 'Career goal', value: e.careerGoalScore }, { label: 'Closing', value: e.closingScore },
    ]}
    transcript={e.transcript || (a as any).transcript}
  />;
};

const CommunicationLab: React.FC = () => {
  // CareerPilot members see today's speaking goal; the LMS lab (/ai-communication-lab) does not.
  const member = useLocation().pathname.startsWith('/careerpilot');
  const [goalKey, setGoalKey] = useState(0);
  const [tab, setTab] = useState<Tab>('coach');
  const [coach, setCoach] = useState<CoachState | null>(null);
  const [coachLoading, setCoachLoading] = useState(true);
  const [coachStep, setCoachStep] = useState<CoachStep | null>(null);
  const [coachResult, setCoachResult] = useState<{ a: any; next: CoachState | null } | null>(null);
  const loadCoach = useCallback(() => communicationApi.coach().then(setCoach).catch(() => setCoach(null)).finally(() => setCoachLoading(false)), []);
  useEffect(() => { loadCoach(); }, [loadCoach]);
  const [today, setToday] = useState<any>(null);
  const [history, setHistory] = useState<CommAttempt[]>([]);
  const [progress, setProgress] = useState<CommProgress | null>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [board, setBoard] = useState<any>(null);
  const [recording, setRecording] = useState(false);
  const [result, setResult] = useState<CommAttempt | null>(null);

  const loadToday = useCallback(() => communicationApi.today(todayStr()).then(setToday).catch(() => setToday(null)), []);
  const loadOverview = useCallback(() => {
    communicationApi.progress().then(setProgress).catch(() => {});
    communicationApi.history().then(setHistory).catch(() => {});
  }, []);
  useEffect(() => { loadToday(); loadOverview(); }, [loadToday, loadOverview]);
  useEffect(() => { if (tab === 'progress') communicationApi.progress().then(setProgress).catch(() => {}); if (tab === 'progress') communicationApi.history().then(setHistory).catch(() => {}); if (tab === 'leaderboard') communicationApi.achievements().then((r:any) => setAchievements(r.achievements || [])).catch(() => {}); if (tab === 'leaderboard') communicationApi.leaderboard().then(setBoard).catch(() => {}); }, [tab]);

  const onDone = (a: CommAttempt) => { setRecording(false); setResult(a); loadToday(); loadOverview(); setGoalKey(k => k + 1); };
  const streak = today?.currentStreak ?? progress?.currentStreak ?? 0;
  const counted = history.filter(isCounted);
  const practised = counted.length;
  const avgScore = counted.length ? Math.round(counted.reduce((n, a) => n + (a.evaluation!.overallScore as number), 0) / counted.length) : null;
  const completed = today?.status === 'completed';

  return <div className="clx">
    <header className="clx-top">
      <div className="clx-top-copy">
        <h1>AI Communication <span>Lab</span></h1>
        <p>Daily AI-powered practice to improve your communication, confidence and clarity.</p>
      </div>
      <div className="clx-top-stats">
        <div className="clx-stat"><span className="ic fire"><i className="bi bi-fire" /></span><div><b>{streak}</b><span>Day streak</span></div></div>
        <div className="clx-stat"><span className="ic blue"><i className="bi bi-bar-chart-fill" /></span><div><b>{practised}</b><span>Questions practised</span></div></div>
        <div className="clx-stat"><span className="ic gold"><i className="bi bi-star-fill" /></span><div><b>{avgScore == null ? '—' : `${avgScore}%`}</b><span>Average score</span></div></div>
      </div>
    </header>
    <nav className="clx-tabs">{TABS.map(([k,l]) => <button key={k} className={`clx-tab ${tab===k?'on':''}`} onClick={()=>{setTab(k);setResult(null);}}>{l}</button>)}</nav>
    {member && tab === 'coach' && <DailyPracticeCard key={goalKey} only="communication" className="clx-daily" />}


    {tab === 'coach' && !coachResult && today?.challenge && <div className="clx-card clx-panel" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 220 }}><b style={{ color: '#051d64' }}>{today.challenge.title}</b><p style={{ margin: '4px 0 0', color: '#2F3F56', fontSize: 13 }}>{today.challenge.description}</p></div>
      <button className="clx-btn primary" disabled={today?.status === 'completed'} onClick={() => setRecording(true)}><i className="bi bi-mic" /> {today?.status === 'completed' ? 'Done today' : 'Start'}</button>
    </div>}
    {tab === 'coach' && (coachResult
      ? <CoachResult a={coachResult.a} next={coachResult.next} onClose={() => setCoachResult(null)} />
      : <CoachTab state={coach} loading={coachLoading} onStart={setCoachStep} history={history} today={todayStr()} onOpenAttempt={(a) => { setTab('progress'); setResult(a); }} onViewAll={() => { setTab('progress'); setResult(null); }} />)}

    {tab === 'coach' && !coachResult && <div style={{ marginTop: 14, textAlign: 'right' }}><button className="clx-btn" onClick={() => setTab('profile')}><i className="bi bi-person-gear" /> Edit my profile</button></div>}
    {tab === 'profile' && <><button className="clx-btn" style={{ marginBottom: 14 }} onClick={() => setTab('coach')}><i className="bi bi-arrow-left" /> Back to practice</button><ProfileForm /></>}
    {tab === 'progress' && <div className="clx-card clx-panel" style={{ marginTop: 16 }}><h2 style={{ marginTop:0,color:'#051d64' }}>Practice History</h2><div className="clx-list">{history.length ? history.map(a=><div className="clx-history-row" key={a._id}>{(() => { const none = a.kind === 'coach' && ((a.recordingDuration || 0) < 5 || ((a.recordingDuration || 0) >= 15 && (a.wordCount ?? 0) <= 5)); return <><div className="clx-score" style={{color: none ? '#94a3b8' : scoreColor(a.evaluation?.overallScore)}}>{none ? '—' : (a.evaluation?.overallScore ?? '—')}</div><div><b>{a.challengeTitle}</b><p>{a.practiceDate} · {a.recordingType} · {a.recordingDuration}s{none ? ' · no voice was heard (not counted)' : ` · ${a.wordsPerMinute || 0} wpm`}</p></div><button className="clx-btn" disabled={!a.evaluation || none} onClick={()=>setResult(a)}>View</button></>; })()}</div>) : <div className="clx-empty"><i className="bi bi-clock-history"/><h3>No practice history yet</h3><p>Complete your first daily challenge and it will appear here.</p></div>}</div>{result && <div style={{marginTop:18}}>{(result as any).kind === 'coach' ? <CoachResult a={result} next={null} onClose={()=>setResult(null)}/> : <ResultView a={result} onClose={()=>setResult(null)}/>}</div>}</div>}
    {tab === 'progress' && <div>{progress ? <><div className="clx-progress-kpis"><div className="clx-card clx-mini"><i className="bi bi-fire"/><b>{progress.currentStreak}</b><span>Current streak</span></div><div className="clx-card clx-mini"><i className="bi bi-trophy"/><b>{progress.longestStreak}</b><span>Longest streak</span></div><div className="clx-card clx-mini"><i className="bi bi-calendar-check"/><b>{progress.totalPracticeDays}</b><span>Practice days</span></div><div className="clx-card clx-mini"><i className="bi bi-graph-up-arrow"/><b>{progress.improvement}</b><span>Improvement</span></div></div><div className="clx-card clx-panel" style={{marginTop:16}}><h3 style={{color:'#051d64'}}>Performance Summary</h3><p style={{color:'#2F3F56'}}>Best <strong>{progress.best}</strong> · Latest <strong>{progress.latest}</strong> · Average <strong>{progress.avg}</strong></p><p style={{color:'#2F3F56'}}>Strongest: <strong style={{color:'#16835d'}}>{progress.strongestSkill || '—'}</strong> · Focus next: <strong style={{color:'#b86b00'}}>{progress.weakestSkill || '—'}</strong></p></div></> : <div className="clx-card clx-empty">Loading progress…</div>}</div>}
    {tab === 'leaderboard' && <h2 style={{ margin: '0 0 12px', color: '#051d64', fontSize: 18 }}>Your badges</h2>}
    {tab === 'leaderboard' && <div className="clx-achievements" style={{ marginBottom: 22 }}>{achievements.length ? achievements.map((a:any)=><div className="clx-card clx-ach" key={a.code}><span className="icon"><i className={`bi ${a.earned?'bi-trophy-fill':'bi-award'}`} /></span><h3>{a.name}</h3><p>{a.description}</p>{a.earned?<span style={{color:'#16835d',fontSize:12,fontWeight:800}}><i className="bi bi-check-circle-fill"/> Earned</span>:<div className="clx-progress-track"><i style={{width:`${a.progress || 0}%`}}/></div>}</div>) : <div className="clx-card clx-empty"><i className="bi bi-award"/><h3>No achievements yet</h3><p>Keep practising to unlock communication achievements.</p></div>}</div>}
    {tab === 'leaderboard' && <h2 style={{ margin: '0 0 12px', color: '#051d64', fontSize: 18 }}>Who is practising the most</h2>}
    {tab === 'leaderboard' && <div className="clx-card">{!board ? <div className="clx-empty">Loading leaderboard…</div> : !board.enabled ? <div className="clx-empty"><i className="bi bi-bar-chart"/><h3>Leaderboard unavailable</h3><p>The leaderboard is turned off for your institute.</p></div> : board.rows?.length ? board.rows.map((r:any)=><div className={`clx-rank ${r.me?'me':''}`} key={r.studentId}><span className="place">{r.rank <= 3 ? <i className="bi bi-trophy-fill" style={{ color: ['#d4a017', '#94a3b8', '#b4733a'][r.rank - 1] }} /> : r.rank}</span><span className="name">{r.name}{r.me?' (You)':''}</span><span className="stat">{r.days} day{r.days === 1 ? '' : 's'} practised{r.streak > 0 ? <> · <i className="bi bi-fire"/> {r.streak}-day streak</> : ''}</span><strong style={{color:scoreColor(r.avg)}} title="Average score">{r.avg}</strong></div>) : <div className="clx-empty"><i className="bi bi-people"/><h3>No rankings yet</h3><p>Complete a practice session to get started.</p></div>}</div>}

    {coachStep && <Recorder
      today={{ date: todayStr(), challenge: { _id: 'coach', title: coachStep.prompt.title, description: coachStep.prompt.ask, minSeconds: 20, maxSeconds: 180 } }}
      submitter={(blob, mode) => communicationApi.coachSubmit(coachStep.area, coachStep.index, blob, mode)}
      onDone={(r: any) => { setCoachStep(null); setCoachResult({ a: r.attempt, next: r.next }); setCoach(r.next); loadOverview(); setGoalKey(k => k + 1); }}
      onClose={() => setCoachStep(null)} />}
    {recording && today?.challenge && <Recorder today={today} onDone={onDone} onClose={()=>setRecording(false)} />}
  </div>;
};

export default CommunicationLab;
