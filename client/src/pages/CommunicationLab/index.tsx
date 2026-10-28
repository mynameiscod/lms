import React, { useCallback, useEffect, useRef, useState } from 'react';
import { communicationApi, CommProfile, CommAttempt, CommProgress } from '../../api/communicationApi';
import CoachTab, { CoachResult, CoachState, CoachStep } from './CoachTab';
import { isCounted } from './LabHome';
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

// Three tabs only: practise, see how you are improving, see how you compare. Profile is a link, not a tab.
const TABS = [['coach', 'Practice'], ['progress', 'Progress'], ['leaderboard', 'Leaderboard']] as const;

type Tab = typeof TABS[number][0] | 'profile';

const ScoreCard: React.FC<{ label: string; value: number | null | undefined }> = ({ label, value }) => (
  <div className="clx-card clx-score-card"><b style={{ color: scoreColor(value) }}>{value ?? '—'}</b><span>{label}</span></div>
);

const Recorder: React.FC<{ today: any; onDone: (a: any) => void; onClose: () => void; submitter?: (blob: Blob, mode: 'video' | 'audio') => Promise<any> }> = ({ today, onDone, onClose, submitter }) => {
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

  // Is the microphone really picking up a voice? A live level bar before and during recording, and a check afterwards.
  const [level, setLevel] = useState(0);
  const [silent, setSilent] = useState(false);
  const peakRef = useRef(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef(0);
  const stopMeter = () => { cancelAnimationFrame(rafRef.current); audioCtxRef.current?.close().catch(() => {}); audioCtxRef.current = null; };
  const startMeter = (stream: MediaStream) => {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new AC();
      const an = ctx.createAnalyser(); an.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(an);
      audioCtxRef.current = ctx;
      const buf = new Uint8Array(an.fftSize); let last = 0;
      const tick = (t: number) => {
        an.getByteTimeDomainData(buf);
        let sum = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / buf.length);
        if (phaseRef.current === 'rec') peakRef.current = Math.max(peakRef.current, rms);
        if (t - last > 90) { last = t; setLevel(Math.min(1, rms * 5)); }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch { /* no meter: the server still refuses a silent recording */ }
  };
  const stopStream = () => { stopMeter(); streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; };
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
      startMeter(streamRef.current); setStreamTick(x => x + 1); setPhase('ready');
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
      peakRef.current = 0; setSilent(false);
      rec.onstop = () => {
        if (peakRef.current < 0.012) setSilent(true); // not a whisper, not a murmur: the microphone heard nothing
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
    try { onDone(submitter ? await submitter(blobRef.current, mode) : await communicationApi.submit(ch._id, today.date, mode, blobRef.current)); }
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
            {(phase === 'ready' || phase === 'rec') && (
              <div style={{ margin: '4px 0 12px' }}>
                <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}><div style={{ width: `${Math.round(level * 100)}%`, height: '100%', background: level > 0.08 ? '#16a34a' : '#f59e0b', transition: 'width .08s' }} /></div>
                <small style={{ color: '#2F3F56' }}>{phase === 'ready' ? 'Say a few words: this bar should move. If it does not, your microphone is muted or the wrong one is selected.' : 'Microphone level'}</small>
              </div>
            )}
            {phase === 'done' && silent && <div className="pm-msg err" style={{ marginBottom: 12 }}>We could not hear your voice in this recording. Check that your microphone is not muted and the right one is selected, then record again. A silent recording cannot be scored.</div>}
            <div className="clx-actions" style={{ justifyContent: 'center' }}>
              {phase === 'ready' && <button className="clx-btn primary" onClick={start}><i className="bi bi-mic-fill" /> Start recording</button>}
              {phase === 'rec' && <button className="clx-btn primary" onClick={() => recRef.current?.stop()}><i className="bi bi-stop-fill" /> Stop</button>}
              {phase === 'done' && <><button className="clx-btn" onClick={() => { setPlayUrl(''); blobRef.current = null; setElapsed(0); setSilent(false); setPhase('ready'); }}><i className="bi bi-arrow-counterclockwise" /> Re-record</button><button className="clx-btn teal" onClick={submit} disabled={silent} title={silent ? 'No voice was heard in this recording' : ''}><i className="bi bi-stars" /> Submit for AI feedback</button></>}
              {phase === 'submitting' && <span style={{ color: '#2F3F56', fontSize: 13 }}><i className="bi bi-hourglass-split" /> Transcribing and evaluating…</span>}
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
  return <div className="clx-profile"><div className="clx-card clx-form"><div className="clx-section" style={{ padding: 0, marginBottom: 16 }}><h2>Your communication profile</h2><p style={{ color: '#2F3F56', fontSize: 13 }}>Give the AI real context so your practice and introduction feedback stay personal and accurate.</p></div><div className="clx-form-grid">{text('fullName','Full name')}{text('currentCity','Current city')}{text('degree','Degree','B.Tech')}{text('specialization','Specialization','CSE')}{text('college','College')}{text('graduationYear','Graduation year','2026')}{text('cgpaOrPercentage','CGPA / Percentage')}{text('targetRole','Target role','Java Developer')}{list('primarySkills','Primary skills','Java, Spring Boot, SQL',true)}{list('secondarySkills','Secondary skills','Git, Docker',true)}{text('trainingInstitute','Training institute','CodeBegun')}{text('internshipDetails','Internship details')}{text('projectName','Main project name', '', true)}{text('projectObjective','Project objective','',true)}{list('projectTechnologies','Project technologies','React, Node, MongoDB',true)}{text('projectResponsibilities','Your responsibilities','',true)}{list('strengths','Strengths','Quick learner, Team player',true)}{text('shortTermGoal','Short-term goal')}{text('longTermGoal','Long-term goal')}{list('targetCompanies','Target companies','ServiceNow, Microsoft',true)}</div><div className="clx-actions"><button className="clx-btn primary" onClick={save}><i className="bi bi-check2-circle" /> Save profile</button>{saved && <span style={{ color:'#16835d',fontWeight:700,fontSize:13 }}><i className="bi bi-check-circle-fill" /> Saved</span>}</div></div><aside className="clx-card clx-template"><h3><i className="bi bi-file-earmark-text" /> Your intro template</h3><p style={{ color:'#2F3F56' }}>Use this as a structure and speak naturally in your own words.</p><p>{template || 'Complete your profile to generate a personal introduction structure.'}</p></aside></div>;
};

const ResultView: React.FC<{ a: CommAttempt; onClose: () => void }> = ({ a, onClose }) => {
  const e: any = a.evaluation;
  if (!e) return null;
  return <div className="clx-feedback"><div className="clx-card clx-feedback-head"><div className="clx-feedback-score"><div><b>{e.overallScore}</b><div style={{ fontSize: 11 }}>/100</div></div></div><div style={{ flex:1 }}><h2 style={{ margin:'0 0 5px',color:'#051d64' }}>{e.readinessLevel}</h2><p style={{ margin:0,color:'#2F3F56',fontSize:13.5 }}>{e.dailyCoachMessage}</p><p style={{ margin:'8px 0 0',fontSize:12.5,color:'#2F3F56' }}><i className="bi bi-speedometer2" /> {e.speakingSpeed?.wordsPerMinute || 0} wpm &nbsp; <i className="bi bi-chat-dots" /> {e.fillerWords?.total || 0} filler words</p></div><button className="clx-btn" onClick={onClose}><i className="bi bi-arrow-left" /> Back</button></div><div className="clx-score-grid"><ScoreCard label="Confidence" value={e.confidenceScore}/><ScoreCard label="Clarity" value={e.clarityScore}/><ScoreCard label="Fluency" value={e.fluencyScore}/><ScoreCard label="Grammar" value={e.grammarScore}/><ScoreCard label="Content" value={e.contentScore}/><ScoreCard label="Project" value={e.projectExplanationScore}/><ScoreCard label="Career Goal" value={e.careerGoalScore}/><ScoreCard label="Closing" value={e.closingScore}/></div>{(e.strengths?.length || e.areasToImprove?.length) ? <div className="clx-grid"><div className="clx-card clx-panel"><h3 style={{ color:'#16835d' }}><i className="bi bi-check-circle" /> Strengths</h3><ul>{(e.strengths || []).map((s:string,i:number)=><li key={i}>{s}</li>)}</ul></div><div className="clx-card clx-panel"><h3 style={{ color:'#b86b00' }}><i className="bi bi-arrow-up-right-circle" /> Areas to improve</h3><ul>{(e.areasToImprove || []).map((s:string,i:number)=><li key={i}>{s}</li>)}</ul></div></div> : null}{e.transcript && <div className="clx-card clx-panel"><h3><i className="bi bi-file-text" /> Your transcript</h3><p style={{ whiteSpace:'pre-wrap',lineHeight:1.65 }}>{e.transcript}</p></div>}</div>;
};

const CommunicationLab: React.FC = () => {
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

  const onDone = (a: CommAttempt) => { setRecording(false); setResult(a); loadToday(); loadOverview(); };
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
      today={{ date: todayStr(), challenge: { _id: 'coach', title: coachStep.prompt.title, description: `${coachStep.prompt.ask} You can listen before you send. Once sent, this answer is final and cannot be redone.`, recordingModes: ['video', 'audio'], minSeconds: 20, maxSeconds: 180 } }}
      submitter={(blob, mode) => communicationApi.coachSubmit(coachStep.area, coachStep.index, blob, mode)}
      onDone={(r: any) => { setCoachStep(null); setCoachResult({ a: r.attempt, next: r.next }); setCoach(r.next); loadOverview(); }}
      onClose={() => setCoachStep(null)} />}
    {recording && today?.challenge && <Recorder today={today} onDone={onDone} onClose={()=>setRecording(false)} />}
  </div>;
};

export default CommunicationLab;
