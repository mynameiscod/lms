import React, { useCallback, useEffect, useRef, useState } from 'react';
import { communicationApi, CommProfile, CommAttempt, CommProgress } from '../../api/communicationApi';
import './communicationLab.css';

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

const pickMime = (video: boolean) => {
  const list = video
    ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
    : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  for (const m of list) if ((window as any).MediaRecorder?.isTypeSupported?.(m)) return m;
  return '';
};

const TABS = [
  ['daily', 'Daily Practice'], ['profile', 'My Profile'], ['history', 'History'],
  ['progress', 'Progress'], ['achievements', 'Achievements'], ['leaderboard', 'Leaderboard'],
] as const;

type Tab = typeof TABS[number][0];

const Metric: React.FC<{ icon: string; value: React.ReactNode; label: string; tone?: string }> = ({ icon, value, label, tone = '' }) => (
  <div className={`clx-kpi ${tone}`}><i className={`bi ${icon}`} /><div><b>{value}</b><span>{label}</span></div></div>
);

const ScoreCard: React.FC<{ label: string; value: number | null | undefined }> = ({ label, value }) => (
  <div className="clx-card clx-score-card"><b style={{ color: scoreColor(value) }}>{value ?? '—'}</b><span>{label}</span></div>
);

const Recorder: React.FC<{ today: any; onDone: (a: CommAttempt) => void; onClose: () => void }> = ({ today, onDone, onClose }) => {
  const ch = today.challenge;
  const [mode, setMode] = useState<'video' | 'audio'>(ch?.recordingModes?.includes('video') ? 'video' : 'audio');
  const [phase, setPhase] = useState<'setup' | 'ready' | 'count' | 'rec' | 'done' | 'submitting'>('setup');
  const [err, setErr] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [count, setCount] = useState(3);
  const [playUrl, setPlayUrl] = useState('');
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<any>(null);
  const [streamTick, setStreamTick] = useState(0);

  const stopStream = () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; };
  useEffect(() => () => { clearInterval(timerRef.current); stopStream(); if (playUrl) URL.revokeObjectURL(playUrl); }, [playUrl]);

  useEffect(() => {
    const v = previewRef.current;
    if (v && streamRef.current && mode === 'video' && phase !== 'setup' && phase !== 'done') {
      v.srcObject = streamRef.current;
      v.play?.().catch(() => {});
    }
  }, [phase, mode, streamTick]);

  const check = async () => {
    setErr('');
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: mode === 'video', audio: true });
      setStreamTick(x => x + 1); setPhase('ready');
    } catch {
      setErr(mode === 'video' ? 'Camera or microphone access is blocked. Allow access and retry.' : 'Microphone access is blocked. Allow access and retry.');
    }
  };

  const start = () => {
    if (!streamRef.current) return;
    setPhase('count'); setCount(3);
    let n = 3;
    const cd = setInterval(() => {
      n -= 1; setCount(n);
      if (n > 0) return;
      clearInterval(cd);
      const mime = pickMime(mode === 'video');
      chunksRef.current = [];
      const rec = new MediaRecorder(streamRef.current!, mime ? { mimeType: mime } : undefined);
      rec.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime || (mode === 'video' ? 'video/webm' : 'audio/webm') });
        blobRef.current = blob;
        setPlayUrl(URL.createObjectURL(blob));
        clearInterval(timerRef.current);
        setPhase('done');
      };
      rec.start(1000); recRef.current = rec; setElapsed(0); setPhase('rec');
      timerRef.current = setInterval(() => setElapsed(x => {
        const next = x + 1;
        if (ch?.maxSeconds && next >= ch.maxSeconds) try { rec.stop(); } catch {}
        return next;
      }), 1000);
    }, 1000);
  };

  const submit = async () => {
    if (!blobRef.current) return;
    if (elapsed < (ch?.minSeconds || 0)) { setErr(`Please speak for at least ${ch.minSeconds} seconds.`); return; }
    setPhase('submitting'); stopStream(); setErr('');
    try { onDone(await communicationApi.submit(ch._id, today.date, mode, blobRef.current)); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Submission failed. Please try again.'); setPhase('done'); }
  };

  return (
    <div className="clx-modal">
      <div className="clx-modal-card">
        <div className="clx-modal-head"><div><h3>{ch?.title}</h3></div><button className="clx-close" onClick={() => { stopStream(); onClose(); }}><i className="bi bi-x-lg" /></button></div>
        {err && <div className="pm-msg err" style={{ marginBottom: 12 }}>{err}</div>}
        {phase === 'setup' ? (
          <>
            <p>{ch?.description}</p>
            <div className="clx-actions">
              {ch?.recordingModes?.includes('video') && <button className={`clx-btn ${mode === 'video' ? 'primary' : ''}`} onClick={() => setMode('video')}><i className="bi bi-camera-video" /> Video + Audio</button>}
              {ch?.recordingModes?.includes('audio') && <button className={`clx-btn ${mode === 'audio' ? 'primary' : ''}`} onClick={() => setMode('audio')}><i className="bi bi-mic" /> Audio only</button>}
            </div>
            <button className="clx-btn teal" style={{ width: '100%', marginTop: 16 }} onClick={check}><i className="bi bi-shield-check" /> Check device & continue</button>
          </>
        ) : (
          <>
            <div className="clx-preview">
              {mode === 'video' && phase !== 'done' && <video ref={previewRef} autoPlay muted playsInline />}
              {mode === 'video' && phase === 'done' && <video src={playUrl} controls playsInline />}
              {mode === 'audio' && phase === 'done' && <audio src={playUrl} controls style={{ width: '88%' }} />}
              {mode === 'audio' && phase !== 'done' && <i className="bi bi-mic" style={{ fontSize: 42 }} />}
              {phase === 'count' && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,.45)', color: '#fff', fontSize: 64, fontWeight: 900 }}>{count}</div>}
              {phase === 'rec' && <span className="clx-rec-status"><i className="bi bi-record-circle" /> REC {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</span>}
            </div>
            <div className="clx-actions" style={{ justifyContent: 'center' }}>
              {phase === 'ready' && <button className="clx-btn primary" onClick={start}><i className="bi bi-mic-fill" /> Start recording</button>}
              {phase === 'rec' && <button className="clx-btn primary" onClick={() => recRef.current?.stop()}><i className="bi bi-stop-fill" /> Stop</button>}
              {phase === 'done' && <><button className="clx-btn" onClick={() => { setPlayUrl(''); blobRef.current = null; setElapsed(0); setPhase('ready'); }}><i className="bi bi-arrow-counterclockwise" /> Re-record</button><button className="clx-btn teal" onClick={submit}><i className="bi bi-stars" /> Submit for AI feedback</button></>}
              {phase === 'submitting' && <span style={{ color: '#64748b', fontSize: 13 }}><i className="bi bi-hourglass-split" /> Transcribing and evaluating…</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

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
  return <div className="clx-profile"><div className="clx-card clx-form"><div className="clx-section" style={{ padding: 0, marginBottom: 16 }}><h2>Your communication profile</h2><p style={{ color: '#64748b', fontSize: 13 }}>Give the AI real context so your practice and introduction feedback stay personal and accurate.</p></div><div className="clx-form-grid">{text('fullName','Full name')}{text('currentCity','Current city')}{text('degree','Degree','B.Tech')}{text('specialization','Specialization','CSE')}{text('college','College')}{text('graduationYear','Graduation year','2026')}{text('cgpaOrPercentage','CGPA / Percentage')}{text('targetRole','Target role','Java Developer')}{list('primarySkills','Primary skills','Java, Spring Boot, SQL',true)}{list('secondarySkills','Secondary skills','Git, Docker',true)}{text('trainingInstitute','Training institute','CodeBegun')}{text('internshipDetails','Internship details')}{text('projectName','Main project name', '', true)}{text('projectObjective','Project objective','',true)}{list('projectTechnologies','Project technologies','React, Node, MongoDB',true)}{text('projectResponsibilities','Your responsibilities','',true)}{list('strengths','Strengths','Quick learner, Team player',true)}{text('shortTermGoal','Short-term goal')}{text('longTermGoal','Long-term goal')}{list('targetCompanies','Target companies','ServiceNow, Microsoft',true)}</div><div className="clx-actions"><button className="clx-btn primary" onClick={save}><i className="bi bi-check2-circle" /> Save profile</button>{saved && <span style={{ color:'#16835d',fontWeight:700,fontSize:13 }}><i className="bi bi-check-circle-fill" /> Saved</span>}</div></div><aside className="clx-card clx-template"><h3><i className="bi bi-file-earmark-text" /> Your intro template</h3><p style={{ color:'#64748b' }}>Use this as a structure and speak naturally in your own words.</p><p>{template || 'Complete your profile to generate a personal introduction structure.'}</p></aside></div>;
};

const ResultView: React.FC<{ a: CommAttempt; onClose: () => void }> = ({ a, onClose }) => {
  const e: any = a.evaluation;
  if (!e) return null;
  return <div className="clx-feedback"><div className="clx-card clx-feedback-head"><div className="clx-feedback-score"><div><b>{e.overallScore}</b><div style={{ fontSize: 11 }}>/100</div></div></div><div style={{ flex:1 }}><h2 style={{ margin:'0 0 5px',color:'#051d64' }}>{e.readinessLevel}</h2><p style={{ margin:0,color:'#64748b',fontSize:13.5 }}>{e.dailyCoachMessage}</p><p style={{ margin:'8px 0 0',fontSize:12.5,color:'#64748b' }}><i className="bi bi-speedometer2" /> {e.speakingSpeed?.wordsPerMinute || 0} wpm &nbsp; <i className="bi bi-chat-dots" /> {e.fillerWords?.total || 0} filler words</p></div><button className="clx-btn" onClick={onClose}><i className="bi bi-arrow-left" /> Back</button></div><div className="clx-score-grid"><ScoreCard label="Confidence" value={e.confidenceScore}/><ScoreCard label="Clarity" value={e.clarityScore}/><ScoreCard label="Fluency" value={e.fluencyScore}/><ScoreCard label="Grammar" value={e.grammarScore}/><ScoreCard label="Content" value={e.contentScore}/><ScoreCard label="Project" value={e.projectExplanationScore}/><ScoreCard label="Career Goal" value={e.careerGoalScore}/><ScoreCard label="Closing" value={e.closingScore}/></div>{(e.strengths?.length || e.areasToImprove?.length) ? <div className="clx-grid"><div className="clx-card clx-panel"><h3 style={{ color:'#16835d' }}><i className="bi bi-check-circle" /> Strengths</h3><ul>{(e.strengths || []).map((s:string,i:number)=><li key={i}>{s}</li>)}</ul></div><div className="clx-card clx-panel"><h3 style={{ color:'#b86b00' }}><i className="bi bi-arrow-up-right-circle" /> Areas to improve</h3><ul>{(e.areasToImprove || []).map((s:string,i:number)=><li key={i}>{s}</li>)}</ul></div></div> : null}{e.transcript && <div className="clx-card clx-panel"><h3><i className="bi bi-file-text" /> Your transcript</h3><p style={{ whiteSpace:'pre-wrap',lineHeight:1.65 }}>{e.transcript}</p></div>}</div>;
};

const CommunicationLab: React.FC = () => {
  const [tab, setTab] = useState<Tab>('daily');
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
  useEffect(() => { if (tab === 'progress') communicationApi.progress().then(setProgress).catch(() => {}); if (tab === 'history') communicationApi.history().then(setHistory).catch(() => {}); if (tab === 'achievements') communicationApi.achievements().then((r:any) => setAchievements(r.achievements || [])).catch(() => {}); if (tab === 'leaderboard') communicationApi.leaderboard().then(setBoard).catch(() => {}); }, [tab]);

  const onDone = (a: CommAttempt) => { setRecording(false); setResult(a); loadToday(); loadOverview(); };
  const streak = today?.currentStreak ?? progress?.currentStreak ?? 0;
  const totalSessions = progress?.totalPracticeDays ?? history.length;
  const bestScore = progress?.best ?? today?.lastScore ?? 0;
  const completed = today?.status === 'completed';
  const recent = history.slice(0, 2);
  const daysDone = Math.min(7, streak || 0);
  const weekdays = ['M','T','W','T','F','S','S'];

  return <div className="clx">
    <header className="clx-head"><div className="clx-title"><span className="clx-title-icon"><i className="bi bi-person-video3" /></span><div><h1>AI Communication Lab</h1><p>Practise your communication every day. Record, get AI feedback, and build a streak.</p></div></div><div className="clx-kpis"><Metric icon="bi-fire" value={streak} label="Day Streak"/><Metric icon="bi-graph-up-arrow" value={totalSessions} label="Sessions" tone="teal"/><Metric icon="bi-star" value={bestScore || '—'} label="Best Score" tone="amber"/></div></header>
    <nav className="clx-tabs">{TABS.map(([k,l]) => <button key={k} className={`clx-tab ${tab===k?'on':''}`} onClick={()=>{setTab(k);setResult(null);}}>{l}</button>)}</nav>

    {tab === 'daily' && (result ? <ResultView a={result} onClose={()=>setResult(null)} /> : <>
      <section className="clx-card clx-hero"><div className="clx-hero-main"><div className="clx-hero-art"><span className="person"><i className="bi bi-person-lines-fill" /></span><span className="mic"><i className="bi bi-mic-fill" /></span></div><div className="clx-hero-copy"><h2>{today?.challenge ? 'Start Your Daily Practice' : 'Your Daily Practice'}</h2><p>{today?.challenge ? 'Record your response and get instant AI feedback to improve your communication skills.' : (today?.message || 'A new communication challenge will appear here when it is available.')}</p><div className="clx-actions"><button className="clx-btn primary" disabled={!today?.challenge || completed} onClick={()=>setRecording(true)}><i className="bi bi-mic" /> {completed ? 'Completed Today' : 'Start Practice'}</button><button className="clx-btn" onClick={()=>setTab('profile')}><i className="bi bi-person-gear" /> My Profile</button></div></div></div><aside className="clx-goal"><h3>Today's Goal</h3><p>Complete 1 practice session</p><div className="clx-progress-line"><div className="clx-progress-track"><i style={{ width: completed ? '100%' : '0%' }} /></div><b>{completed?'1 / 1':'0 / 1'}</b></div><div className={`clx-goal-msg ${completed?'':'pending'}`}><i className={`bi ${completed?'bi-check-circle-fill':'bi-hourglass-split'}`} /> {completed ? 'Goal completed! Great job!' : 'One focused practice completes today’s goal.'}</div></aside></section>
      <div className="clx-grid"><section className="clx-card clx-section"><h2>Today's Practice Task</h2>{today?.challenge ? <div className="clx-task"><span className="clx-task-icon"><i className="bi bi-megaphone" /></span><div className="clx-task-main"><div className="clx-task-title"><b>{today.challenge.title}</b><span className="clx-badge">Daily</span></div><p>{today.challenge.description}</p><div className="clx-meta"><span><i className="bi bi-clock" /> {Math.max(1,Math.round((today.challenge.targetSeconds || 60)/60))} min</span><span><i className="bi bi-arrow-repeat" /> {today.challenge.maxAttempts || 1} attempts</span><span><i className="bi bi-calendar-check" /> Today</span></div></div><button className="clx-btn primary" disabled={completed} onClick={()=>setRecording(true)}>{completed?'Done':'Practice Now'} <i className="bi bi-arrow-right" /></button></div> : <div className="clx-empty"><i className="bi bi-calendar2-check" /><h3>No challenge available yet</h3><p>{today?.message || 'Please check back later for today’s communication challenge.'}</p></div>}</section><aside className="clx-side"><div className="clx-card clx-side-card"><h3><i className="bi bi-calendar3" /> Your Streak</h3><div className="clx-streak-days">{weekdays.map((d,i)=><div className={`clx-day ${i < daysDone ? 'done':''}`} key={`${d}-${i}`}><b>{d}</b><span><i className={`bi ${i < daysDone ? 'bi-check-lg':'bi-circle-fill'}`} /></span></div>)}</div><div className="clx-side-note">{streak ? `${streak} day${streak===1?'':'s'} in a row. Keep it going.` : 'Complete today’s practice to start your streak.'}</div></div><div className="clx-card clx-side-card"><div className="clx-tip"><i className="bi bi-lightbulb" /><div><h3>AI Communication Tip</h3><p>Speak clearly, use short pauses between ideas, and support key points with one concrete example.</p></div></div></div><div className="clx-card clx-side-card"><h3><i className="bi bi-clock-history" /> Recent Activity</h3><div className="clx-activity">{recent.length ? recent.map(a=><div className="clx-activity-row" key={a._id}><span className="check"><i className="bi bi-check2" /></span><div><b>{a.challengeTitle}</b><p>{a.practiceDate}</p></div><strong style={{ color:scoreColor(a.evaluation?.overallScore) }}>{a.evaluation?.overallScore ?? '—'}/100</strong></div>) : <p style={{ color:'#64748b',fontSize:12.5 }}>No completed sessions yet.</p>}</div></div></aside></div>
    </>)}

    {tab === 'profile' && <ProfileForm />}
    {tab === 'history' && <div className="clx-card clx-panel"><h2 style={{ marginTop:0,color:'#051d64' }}>Practice History</h2><div className="clx-list">{history.length ? history.map(a=><div className="clx-history-row" key={a._id}><div className="clx-score" style={{color:scoreColor(a.evaluation?.overallScore)}}>{a.evaluation?.overallScore ?? '—'}</div><div><b>{a.challengeTitle}</b><p>{a.practiceDate} · {a.recordingType} · {a.recordingDuration}s · {a.wordsPerMinute || 0} wpm</p></div><button className="clx-btn" disabled={!a.evaluation} onClick={()=>setResult(a)}>View</button></div>) : <div className="clx-empty"><i className="bi bi-clock-history"/><h3>No practice history yet</h3><p>Complete your first daily challenge and it will appear here.</p></div>}</div>{result && <div style={{marginTop:18}}><ResultView a={result} onClose={()=>setResult(null)}/></div>}</div>}
    {tab === 'progress' && <div>{progress ? <><div className="clx-progress-kpis"><div className="clx-card clx-mini"><i className="bi bi-fire"/><b>{progress.currentStreak}</b><span>Current streak</span></div><div className="clx-card clx-mini"><i className="bi bi-trophy"/><b>{progress.longestStreak}</b><span>Longest streak</span></div><div className="clx-card clx-mini"><i className="bi bi-calendar-check"/><b>{progress.totalPracticeDays}</b><span>Practice days</span></div><div className="clx-card clx-mini"><i className="bi bi-graph-up-arrow"/><b>{progress.improvement}</b><span>Improvement</span></div></div><div className="clx-card clx-panel" style={{marginTop:16}}><h3 style={{color:'#051d64'}}>Performance Summary</h3><p style={{color:'#64748b'}}>Best <strong>{progress.best}</strong> · Latest <strong>{progress.latest}</strong> · Average <strong>{progress.avg}</strong></p><p style={{color:'#64748b'}}>Strongest: <strong style={{color:'#16835d'}}>{progress.strongestSkill || '—'}</strong> · Focus next: <strong style={{color:'#b86b00'}}>{progress.weakestSkill || '—'}</strong></p></div></> : <div className="clx-card clx-empty">Loading progress…</div>}</div>}
    {tab === 'achievements' && <div className="clx-achievements">{achievements.length ? achievements.map((a:any)=><div className="clx-card clx-ach" key={a.code}><span className="icon"><i className={`bi ${a.earned?'bi-trophy-fill':'bi-award'}`} /></span><h3>{a.name}</h3><p>{a.description}</p>{a.earned?<span style={{color:'#16835d',fontSize:12,fontWeight:800}}><i className="bi bi-check-circle-fill"/> Earned</span>:<div className="clx-progress-track"><i style={{width:`${a.progress || 0}%`}}/></div>}</div>) : <div className="clx-card clx-empty"><i className="bi bi-award"/><h3>No achievements yet</h3><p>Keep practising to unlock communication achievements.</p></div>}</div>}
    {tab === 'leaderboard' && <div className="clx-card">{!board ? <div className="clx-empty">Loading leaderboard…</div> : !board.enabled ? <div className="clx-empty"><i className="bi bi-bar-chart"/><h3>Leaderboard unavailable</h3><p>The leaderboard is turned off for your institute.</p></div> : board.rows?.length ? board.rows.map((r:any)=><div className={`clx-rank ${r.me?'me':''}`} key={r.studentId}><span className="place">{r.rank <= 3 ? <i className="bi bi-trophy-fill" /> : r.rank}</span><span className="name">{r.name}{r.me?' (You)':''}</span><span className="stat"><i className="bi bi-fire"/> {r.streak} · {r.days} days</span><strong style={{color:scoreColor(r.avg)}}>{r.avg}</strong></div>) : <div className="clx-empty"><i className="bi bi-people"/><h3>No rankings yet</h3><p>Complete a practice session to get started.</p></div>}</div>}

    {recording && today?.challenge && <Recorder today={today} onDone={onDone} onClose={()=>setRecording(false)} />}
  </div>;
};

export default CommunicationLab;
