import React, { useCallback, useEffect, useRef, useState } from 'react';
import { communicationApi, CommToday, CommProfile, CommAttempt, CommProgress } from '../../api/communicationApi';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const scoreColor = (s: number) => (s >= 80 ? '#16a34a' : s >= 60 ? '#d97706' : s >= 40 ? '#ea580c' : '#dc2626');
const pickMime = (video: boolean) => {
  const list = video
    ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
    : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  for (const m of list) { if ((window as any).MediaRecorder?.isTypeSupported?.(m)) return m; }
  return '';
};

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,.05)' };
const btn = (bg: string, disabled = false): React.CSSProperties => ({ padding: '10px 18px', background: disabled ? '#cbd5e1' : bg, color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: disabled ? 'default' : 'pointer' });
const input: React.CSSProperties = { padding: '9px 11px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, width: '100%', outline: 'none' };
const lbl: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' };

// ── Score chip ────────────────────────────────────────────────────────────────
const ScoreChip: React.FC<{ label: string; value: number | null }> = ({ label, value }) => (
  <div style={{ ...card, padding: '12px 14px', textAlign: 'center' }}>
    <div style={{ fontSize: 22, fontWeight: 800, color: value == null ? '#9ca3af' : scoreColor(value) }}>{value == null ? '—' : value}</div>
    <div style={{ fontSize: 11.5, color: '#6b7280', marginTop: 2 }}>{label}</div>
  </div>
);

// ── Result view ───────────────────────────────────────────────────────────────
const ResultView: React.FC<{ a: CommAttempt; onClose: () => void }> = ({ a, onClose }) => {
  const e = a.evaluation!;
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ ...card, padding: 22, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, fontWeight: 800, color: scoreColor(e.overallScore), lineHeight: 1 }}>{e.overallScore}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>/ 100</div>
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{e.readinessLevel}</div>
          <div style={{ fontSize: 13.5, color: '#4b5563', marginTop: 4 }}>{e.dailyCoachMessage}</div>
          <div style={{ fontSize: 12.5, color: '#6b7280', marginTop: 6 }}>
            🗣 {e.speakingSpeed.wordsPerMinute} wpm ({e.speakingSpeed.status.replace('_', ' ').toLowerCase()}) · 🧯 {e.fillerWords.total} filler words
          </div>
        </div>
        <button onClick={onClose} style={btn('#1a5490')}>Done</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 10 }}>
        <ScoreChip label="Confidence" value={e.confidenceScore} />
        <ScoreChip label="Clarity" value={e.clarityScore} />
        <ScoreChip label="Fluency" value={e.fluencyScore} />
        <ScoreChip label="Grammar" value={e.grammarScore} />
        <ScoreChip label="Content" value={e.contentScore} />
        <ScoreChip label="Project" value={e.projectExplanationScore} />
        <ScoreChip label="Career Goal" value={e.careerGoalScore} />
        <ScoreChip label="Closing" value={e.closingScore} />
      </div>

      {a.recordingType === 'video' && (
        <div style={{ ...card, padding: 14, fontSize: 12.5, color: '#6b7280' }}>
          👁 Eye contact, expression & posture: <strong>Not Evaluated</strong> (visual analysis isn’t available yet — audio & content only).
        </div>
      )}

      {(e.strengths.length > 0 || e.areasToImprove.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 }}>
          {e.strengths.length > 0 && (
            <div style={{ ...card, padding: 16 }}>
              <div style={{ fontWeight: 700, color: '#16a34a', marginBottom: 8 }}>✓ Strengths</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: '#374151', display: 'grid', gap: 5 }}>{e.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          )}
          {e.areasToImprove.length > 0 && (
            <div style={{ ...card, padding: 16 }}>
              <div style={{ fontWeight: 700, color: '#d97706', marginBottom: 8 }}>↗ Areas to improve</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: '#374151', display: 'grid', gap: 5 }}>{e.areasToImprove.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      {e.missingSections.length > 0 && (
        <div style={{ ...card, padding: 16, background: '#fffbeb', borderColor: '#fde68a' }}>
          <div style={{ fontWeight: 700, color: '#b45309', marginBottom: 6 }}>Missing sections</div>
          <div style={{ fontSize: 13.5, color: '#92400e' }}>{e.missingSections.join(' · ')}</div>
        </div>
      )}

      {e.sentenceImprovements.length > 0 && (
        <div style={{ ...card, padding: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Sentence improvements</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {e.sentenceImprovements.map((s, i) => (
              <div key={i} style={{ fontSize: 13.5 }}>
                <div style={{ color: '#dc2626' }}>✗ {s.original}</div>
                <div style={{ color: '#16a34a' }}>✓ {s.improved}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {e.improvedIntroduction && (
        <div style={{ ...card, padding: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>✨ Improved version <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 12 }}>(uses only your real details — speak it in your own words)</span></div>
          <div style={{ fontSize: 13.5, color: '#374151', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{e.improvedIntroduction}</div>
        </div>
      )}

      {a.transcript && (
        <details style={{ ...card, padding: 16 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700 }}>📝 Your transcript</summary>
          <div style={{ fontSize: 13.5, color: '#4b5563', marginTop: 10, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{a.transcript}</div>
        </details>
      )}
    </div>
  );
};

// ── Recorder modal ────────────────────────────────────────────────────────────
const Recorder: React.FC<{ today: CommToday; onDone: (a: CommAttempt) => void; onClose: () => void }> = ({ today, onDone, onClose }) => {
  const ch = today.challenge!;
  const [mode, setMode] = useState<'video' | 'audio'>(ch.recordingModes.includes('video') ? 'video' : 'audio');
  const [phase, setPhase] = useState<'setup' | 'ready' | 'count' | 'rec' | 'done' | 'submitting'>('setup');
  const [err, setErr] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [count, setCount] = useState(3);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const playbackRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<any>(null);
  const [playUrl, setPlayUrl] = useState('');

  const stopStream = () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; };
  useEffect(() => () => { clearInterval(timerRef.current); stopStream(); }, []);

  const check = async () => {
    setErr('');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: mode === 'video', audio: true });
      streamRef.current = s;
      if (previewRef.current && mode === 'video') { previewRef.current.srcObject = s; }
      setPhase('ready');
    } catch (e: any) {
      setErr(mode === 'video' ? 'Camera/mic blocked. Allow access in your browser and retry.' : 'Microphone blocked. Allow access in your browser and retry.');
    }
  };

  const startRec = () => {
    if (!streamRef.current) return;
    setPhase('count'); setCount(3);
    let c = 3;
    const cd = setInterval(() => {
      c -= 1; setCount(c);
      if (c <= 0) {
        clearInterval(cd);
        const mime = pickMime(mode === 'video');
        chunksRef.current = [];
        const rec = new MediaRecorder(streamRef.current!, mime ? { mimeType: mime } : undefined);
        rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
        rec.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: mime || 'video/webm' });
          blobRef.current = blob; setPlayUrl(URL.createObjectURL(blob));
          clearInterval(timerRef.current); setPhase('done');
        };
        rec.start(1000); recRef.current = rec;
        setPhase('rec'); setElapsed(0);
        timerRef.current = setInterval(() => setElapsed((x) => {
          const n = x + 1;
          if (n >= ch.maxSeconds) { try { rec.stop(); } catch { /* */ } }
          return n;
        }), 1000);
      }
    }, 1000);
  };

  const stopRec = () => { try { recRef.current?.stop(); } catch { /* */ } };
  const reRecord = () => { setPlayUrl(''); blobRef.current = null; setElapsed(0); setPhase('ready'); };

  const submit = async () => {
    if (!blobRef.current) return;
    if (elapsed < ch.minSeconds) { setErr(`Please speak at least ${ch.minSeconds}s (you did ${elapsed}s).`); return; }
    setPhase('submitting'); setErr(''); stopStream();
    try {
      const a = await communicationApi.submit(ch._id, today.date, mode, blobRef.current);
      onDone(a);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Submission failed. Try again.');
      setPhase('done');
    }
  };

  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const remaining = ch.maxSeconds - elapsed;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '24px 16px' }}>
      <div style={{ ...card, width: '100%', maxWidth: 620, padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{ch.title}</h3>
          <button onClick={() => { stopStream(); onClose(); }} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6b7280' }}>×</button>
        </div>

        {err && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>{err}</div>}

        {phase === 'setup' && (
          <div>
            <div style={{ fontSize: 13.5, color: '#4b5563', marginBottom: 14 }}>{ch.description}</div>
            <label style={lbl}>Recording mode</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {ch.recordingModes.includes('video') && <button onClick={() => setMode('video')} style={btn(mode === 'video' ? '#1a5490' : '#94a3b8')}>🎥 Video + Audio</button>}
              {ch.recordingModes.includes('audio') && <button onClick={() => setMode('audio')} style={btn(mode === 'audio' ? '#1a5490' : '#94a3b8')}>🎙 Audio only</button>}
            </div>
            <button onClick={check} style={{ ...btn('#16a34a'), width: '100%' }}>Check device & continue</button>
          </div>
        )}

        {phase !== 'setup' && (
          <>
            <div style={{ position: 'relative', background: '#0b1220', borderRadius: 12, overflow: 'hidden', aspectRatio: '16 / 9', marginBottom: 14, display: 'grid', placeItems: 'center' }}>
              {mode === 'video' && (phase === 'done' ? (
                <video ref={playbackRef} src={playUrl} controls playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <video ref={previewRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
              ))}
              {mode === 'audio' && phase === 'done' && <audio src={playUrl} controls style={{ width: '90%' }} />}
              {mode === 'audio' && phase !== 'done' && <div style={{ color: '#94a3b8', fontSize: 40 }}>🎙</div>}
              {phase === 'count' && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,.4)', color: '#fff', fontSize: 64, fontWeight: 800 }}>{count}</div>}
              {phase === 'rec' && (
                <div style={{ position: 'absolute', top: 10, left: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ background: '#dc2626', color: '#fff', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>● REC {mmss(elapsed)}</span>
                  {remaining <= 30 && <span style={{ background: '#f59e0b', color: '#fff', padding: '3px 8px', borderRadius: 20, fontSize: 11 }}>{remaining}s left</span>}
                </div>
              )}
            </div>

            <div style={{ fontSize: 12.5, color: '#6b7280', textAlign: 'center', marginBottom: 12 }}>
              Target {mmss(ch.targetSeconds)} · min {mmss(ch.minSeconds)} · max {mmss(ch.maxSeconds)}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {phase === 'ready' && <button onClick={startRec} style={btn('#dc2626')}>● Start recording</button>}
              {phase === 'rec' && <button onClick={stopRec} style={btn('#111827')}>■ Stop</button>}
              {phase === 'done' && <>
                <button onClick={reRecord} style={btn('#94a3b8')}>↻ Re-record</button>
                <button onClick={submit} style={btn('#16a34a')}>Submit for AI feedback</button>
              </>}
              {phase === 'submitting' && <div style={{ padding: '10px 0', color: '#6b7280' }}>⏳ Transcribing & evaluating… this takes ~20–40s</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── Profile form ──────────────────────────────────────────────────────────────
const ProfileForm: React.FC = () => {
  const [p, setP] = useState<CommProfile>({});
  const [template, setTemplate] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => { communicationApi.getProfile().then((r) => { setP(r.profile || {}); setTemplate(r.template); setLoading(false); }); }, []);
  const set = (k: keyof CommProfile, v: any) => setP((x) => ({ ...x, [k]: v }));
  const setList = (k: keyof CommProfile, v: string) => setP((x) => ({ ...x, [k]: v.split(',').map(s => s.trim()).filter(Boolean) }));
  const save = async () => { const r = await communicationApi.updateProfile(p); setTemplate(r.template); setSaved(true); setTimeout(() => setSaved(false), 2500); };
  const txt = (k: keyof CommProfile, label: string, ph = '') => (
    <div><label style={lbl}>{label}</label><input style={input} value={(p[k] as string) || ''} onChange={(e) => set(k, e.target.value)} placeholder={ph} /></div>
  );
  const lst = (k: keyof CommProfile, label: string, ph = '') => (
    <div><label style={lbl}>{label} <span style={{ fontWeight: 400, color: '#9ca3af' }}>(comma-separated)</span></label>
      <input style={input} value={((p[k] as string[]) || []).join(', ')} onChange={(e) => setList(k, e.target.value)} placeholder={ph} /></div>
  );
  if (loading) return <div style={{ color: '#9ca3af', padding: 40, textAlign: 'center' }}>Loading…</div>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 360px', gap: 20, alignItems: 'start' }} className="cl-profile">
      <div style={{ ...card, padding: 20, display: 'grid', gap: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Your communication profile</div>
        <p style={{ margin: 0, fontSize: 12.5, color: '#6b7280' }}>Fill these once. We use them to generate your intro template and to give the AI real context (it never invents facts).</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{txt('fullName', 'Full name')}{txt('currentCity', 'Current city')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{txt('degree', 'Degree', 'B.Tech')}{txt('specialization', 'Specialization', 'CSE')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>{txt('college', 'College')}{txt('graduationYear', 'Grad year', '2025')}{txt('cgpaOrPercentage', 'CGPA / %')}</div>
        {lst('primarySkills', 'Primary skills', 'Java, Spring Boot, SQL')}
        {lst('secondarySkills', 'Secondary skills', 'Git, Docker')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{txt('trainingInstitute', 'Training institute', 'CodeBegun')}{txt('internshipDetails', 'Internship details')}</div>
        {txt('projectName', 'Main project name')}
        {txt('projectObjective', 'Project objective')}
        {lst('projectTechnologies', 'Project technologies', 'React, Node, MongoDB')}
        {txt('projectResponsibilities', 'Your responsibilities')}
        {lst('strengths', 'Strengths', 'Quick learner, Team player')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{txt('shortTermGoal', 'Short-term goal')}{txt('longTermGoal', 'Long-term goal')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{txt('targetRole', 'Target role', 'Java Developer')}{lst('targetCompanies', 'Target companies')}</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={save} style={btn('#1a5490')}>Save profile</button>
          {saved && <span style={{ color: '#16a34a', fontSize: 13, fontWeight: 600 }}>✓ Saved</span>}
        </div>
      </div>
      <div style={{ ...card, padding: 18, position: 'sticky', top: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>📄 Your intro template</div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 10 }}>Use this as a structure — speak naturally in your own words. Don’t memorize word-for-word.</div>
        <div style={{ fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{template}</div>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const CommunicationLab: React.FC = () => {
  const [tab, setTab] = useState<'daily' | 'profile' | 'history' | 'progress' | 'achievements' | 'leaderboard'>('daily');
  const [today, setToday] = useState<CommToday | null>(null);
  const [recording, setRecording] = useState(false);
  const [result, setResult] = useState<CommAttempt | null>(null);
  const [history, setHistory] = useState<CommAttempt[]>([]);
  const [progress, setProgress] = useState<CommProgress | null>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [board, setBoard] = useState<{ enabled: boolean; rows: any[]; me: any } | null>(null);

  const loadToday = useCallback(() => { communicationApi.today(todayStr()).then(setToday).catch(() => {}); }, []);
  useEffect(() => { loadToday(); }, [loadToday]);
  useEffect(() => { if (tab === 'history') communicationApi.history().then(setHistory).catch(() => {}); }, [tab]);
  useEffect(() => { if (tab === 'progress') communicationApi.progress().then(setProgress).catch(() => {}); }, [tab]);
  useEffect(() => { if (tab === 'achievements') communicationApi.achievements().then((r) => setAchievements(r.achievements)).catch(() => {}); }, [tab]);
  useEffect(() => { if (tab === 'leaderboard') communicationApi.leaderboard().then(setBoard).catch(() => {}); }, [tab]);

  const onDone = (a: CommAttempt) => { setRecording(false); setResult(a); loadToday(); };

  const tabBtn = (k: typeof tab, label: string) => (
    <button onClick={() => { setTab(k); setResult(null); }}
      style={{ padding: '8px 16px', border: 'none', borderBottom: tab === k ? '2px solid #1a5490' : '2px solid transparent', background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: tab === k ? '#1a5490' : '#6b7280' }}>{label}</button>
  );

  return (
    <div style={{ padding: 24, maxWidth: 1060, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#111827' }}>🎙 AI Communication Lab</h2>
        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>Practise your communication every day. Record, get AI feedback, and build a streak.</p>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e5e7eb', marginBottom: 20, flexWrap: 'wrap' }}>
        {tabBtn('daily', 'Daily Practice')}{tabBtn('profile', 'My Profile')}{tabBtn('history', 'History')}{tabBtn('progress', 'Progress')}{tabBtn('achievements', 'Achievements')}{tabBtn('leaderboard', 'Leaderboard')}
      </div>

      {tab === 'daily' && (result ? (
        <ResultView a={result} onClose={() => setResult(null)} />
      ) : !today ? (
        <div style={{ color: '#9ca3af', padding: 40, textAlign: 'center' }}>Loading today’s challenge…</div>
      ) : !today.challenge ? (
        <div style={{ ...card, padding: 40, textAlign: 'center' }}>
          {today.locked && today.window ? (
            <>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{today.window.status === 'upcoming' ? '⏳' : '🔒'}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0b2e63', marginBottom: 4 }}>{today.message || 'This challenge is not open right now.'}</div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>Available window: {today.window.startTime || '00:00'} – {today.window.endTime || '23:59'} IST</div>
            </>
          ) : (
            <div style={{ color: '#9ca3af' }}>{today.message || 'No challenge available yet. Please check back later.'}</div>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 20, alignItems: 'start' }} className="cl-daily">
          <div style={{ ...card, padding: 22 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#1a5490' }}>Today’s Challenge</span>
            <h3 style={{ margin: '6px 0 8px', fontSize: 20, fontWeight: 700, color: '#111827' }}>{today.challenge.title}</h3>
            <p style={{ margin: '0 0 14px', color: '#4b5563', fontSize: 14 }}>{today.challenge.description}</p>
            {today.challenge.suggestedPoints && today.challenge.suggestedPoints.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ ...lbl, marginBottom: 6 }}>Cover these points</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {today.challenge.suggestedPoints.map((s, i) => <span key={i} style={{ fontSize: 12, background: '#eff6ff', color: '#1e40af', padding: '3px 9px', borderRadius: 20 }}>{s}</span>)}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 18, fontSize: 13, color: '#6b7280', marginBottom: 18, flexWrap: 'wrap' }}>
              <span>⏱ Target {Math.round(today.challenge.targetSeconds / 60)} min</span>
              <span>🔁 {today.challenge.maxAttempts} attempts</span>
              <span>📅 Deadline: Today 11:59 PM</span>
            </div>
            {today.status === 'completed' ? (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: 10, padding: '12px 16px', fontSize: 14, fontWeight: 600 }}>
                ✓ Completed today. Great work! Come back tomorrow for a new challenge.
              </div>
            ) : (
              <button onClick={() => setRecording(true)} style={{ ...btn('#dc2626'), fontSize: 15, padding: '12px 26px' }}>▶ Start Practice</button>
            )}
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ ...card, padding: 18, textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#f59e0b' }}>🔥 {today.currentStreak}</div>
              <div style={{ fontSize: 12.5, color: '#6b7280' }}>day streak · longest {today.longestStreak}</div>
            </div>
            <div style={{ ...card, padding: 18, textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: today.lastScore == null ? '#9ca3af' : scoreColor(today.lastScore) }}>{today.lastScore == null ? '—' : `${today.lastScore}%`}</div>
              <div style={{ fontSize: 12.5, color: '#6b7280' }}>last score</div>
            </div>
            <div style={{ ...card, padding: 14, fontSize: 12.5, color: '#6b7280' }}>
              💡 Fill your <strong>Profile</strong> tab first to get a personalized intro template.
            </div>
          </div>
        </div>
      ))}

      {tab === 'profile' && <ProfileForm />}

      {tab === 'history' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {history.length === 0 && <div style={{ ...card, padding: 40, textAlign: 'center', color: '#9ca3af' }}>No practice yet. Start today’s challenge!</div>}
          {history.map((a) => (
            <div key={a._id} style={{ ...card, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 46, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: a.evaluation ? scoreColor(a.evaluation.overallScore) : '#9ca3af' }}>{a.evaluation?.overallScore ?? '—'}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{a.challengeTitle}</div>
                <div style={{ fontSize: 12.5, color: '#6b7280' }}>{a.practiceDate} · {a.recordingType} · {a.recordingDuration}s · {a.wordsPerMinute || 0} wpm</div>
              </div>
              <button onClick={() => setResult(a)} style={{ ...btn('#1a5490'), padding: '6px 14px', fontSize: 13 }} disabled={!a.evaluation}>View</button>
            </div>
          ))}
          {result && <div style={{ marginTop: 8 }}><ResultView a={result} onClose={() => setResult(null)} /></div>}
        </div>
      )}

      {tab === 'progress' && (!progress ? <div style={{ color: '#9ca3af', padding: 40, textAlign: 'center' }}>Loading…</div> : (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ ...card, padding: 20, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <div><div style={{ fontSize: 12, color: '#6b7280' }}>Level</div><div style={{ fontSize: 20, fontWeight: 800, color: '#1a5490' }}>{progress.level}</div></div>
            <div style={{ flex: 1 }} />
            {[['Best', progress.best], ['Latest', progress.latest], ['Average', progress.avg]].map(([l, v]) => (
              <div key={l as string} style={{ textAlign: 'center' }}><div style={{ fontSize: 24, fontWeight: 800, color: scoreColor(v as number) }}>{v}</div><div style={{ fontSize: 11.5, color: '#6b7280' }}>{l}</div></div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12 }}>
            <ScoreChip label="🔥 Current streak" value={progress.currentStreak} />
            <ScoreChip label="🏆 Longest streak" value={progress.longestStreak} />
            <ScoreChip label="📅 Practice days" value={progress.totalPracticeDays} />
            <ScoreChip label="↗ Improvement" value={progress.improvement} />
          </div>
          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Focus areas</div>
            <div style={{ fontSize: 13.5, color: '#374151' }}>
              Strongest: <strong style={{ color: '#16a34a' }}>{progress.strongestSkill || '—'}</strong> · Work on: <strong style={{ color: '#d97706' }}>{progress.weakestSkill || '—'}</strong>
            </div>
          </div>
          {progress.timeline.length > 1 && (
            <div style={{ ...card, padding: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Score over time</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
                {progress.timeline.slice(-20).map((t, i) => (
                  <div key={i} title={`${t.date}: ${t.score}`} style={{ flex: 1, background: scoreColor(t.score), height: `${Math.max(4, t.score)}%`, borderRadius: '4px 4px 0 0', minWidth: 6 }} />
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {tab === 'achievements' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 14 }}>
          {achievements.map((a) => (
            <div key={a.code} style={{ ...card, padding: 18, textAlign: 'center', opacity: a.earned ? 1 : 0.6 }}>
              <div style={{ fontSize: 38, filter: a.earned ? 'none' : 'grayscale(1)' }}>{a.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginTop: 6, color: '#111827' }}>{a.name}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3, minHeight: 32 }}>{a.description}</div>
              {a.earned ? (
                <div style={{ fontSize: 11.5, color: '#16a34a', fontWeight: 600, marginTop: 6 }}>✓ Earned</div>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 6, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}><div style={{ width: `${a.progress}%`, height: '100%', background: '#1a5490' }} /></div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{a.progress}%</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'leaderboard' && (!board ? <div style={{ color: '#9ca3af', padding: 40, textAlign: 'center' }}>Loading…</div> : !board.enabled ? (
        <div style={{ ...card, padding: 40, textAlign: 'center', color: '#9ca3af' }}>The leaderboard is turned off for your institute.</div>
      ) : (
        <div style={{ ...card, padding: 8 }}>
          {board.rows.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>No rankings yet — be the first to practise!</div>}
          {board.rows.map((r) => (
            <div key={r.studentId} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: '1px solid #f1f5f9', background: r.me ? '#eff6ff' : 'transparent' }}>
              <div style={{ width: 30, fontWeight: 800, color: r.rank <= 3 ? '#f59e0b' : '#9ca3af', fontSize: 16 }}>{r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</div>
              <div style={{ flex: 1, fontWeight: 600, color: '#111827' }}>{r.name}{r.me ? ' (You)' : ''}</div>
              <div style={{ fontSize: 12.5, color: '#6b7280' }}>🔥 {r.streak} · {r.days} days</div>
              <div style={{ fontWeight: 700, color: scoreColor(r.avg), width: 44, textAlign: 'right' }}>{r.avg}</div>
            </div>
          ))}
          {board.me && board.me.rank > 10 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: '#eff6ff', borderTop: '2px solid #dbeafe' }}>
              <div style={{ width: 30, fontWeight: 800, color: '#1a5490' }}>{board.me.rank}</div>
              <div style={{ flex: 1, fontWeight: 600 }}>{board.me.name} (You)</div>
              <div style={{ fontSize: 12.5, color: '#6b7280' }}>🔥 {board.me.streak} · {board.me.days} days</div>
              <div style={{ fontWeight: 700, color: scoreColor(board.me.avg), width: 44, textAlign: 'right' }}>{board.me.avg}</div>
            </div>
          )}
        </div>
      ))}

      {recording && today?.challenge && <Recorder today={today} onDone={onDone} onClose={() => setRecording(false)} />}

      <style>{`@media (max-width: 820px){ .cl-daily, .cl-profile { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
};

export default CommunicationLab;
