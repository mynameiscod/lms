import React, { useEffect, useRef, useState } from 'react';
import { speakingApi, PendingTask, SpeakingSubmission, LeaderRow, MyStats } from '../../api/speakingApi';

const PURPLE = '#6366f1', TEAL = '#14a89c';
const scoreColor = (n: number) => (n >= 75 ? '#16a34a' : n >= 50 ? '#d97706' : '#dc2626');
const pickMime = () => ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(m => (window as any).MediaRecorder?.isTypeSupported?.(m)) || '';

const SpeakingPractice: React.FC = () => {
  const [pending, setPending] = useState<PendingTask[]>([]);
  const [history, setHistory] = useState<SpeakingSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<PendingTask | null>(null);
  const [result, setResult] = useState<SpeakingSubmission | null>(null);
  const [top, setTop] = useState<LeaderRow[]>([]);
  const [me, setMe] = useState<MyStats | null>(null);

  const load = async () => {
    try {
      const [p, h, lb] = await Promise.all([speakingApi.myTasks(), speakingApi.mySubmissions(), speakingApi.leaderboard().catch(() => null)]);
      setPending(p.pending); setHistory(h);
      if (lb) { setTop(lb.top); setMe(lb.me); }
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 22 }}>
      <h1 style={{ margin: 0, fontSize: 24, color: '#0f172a' }}>Speaking Practice</h1>
      <p style={{ marginTop: 4, color: '#64748b', fontSize: 13.5 }}>Record your assigned speaking tasks. An AI coach scores your fluency, clarity and confidence and gives you feedback.</p>

      {loading ? <div style={{ color: '#94a3b8', padding: 30 }}>Loading…</div> : (
        <>
          {me && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, margin: '16px 0' }}>
              {[
                { label: 'Current streak', value: `${me.streak} wk${me.streak === 1 ? '' : 's'}`, ic: '🔥' },
                { label: 'Total recorded', value: String(me.count), ic: '🎬' },
                { label: 'Avg score', value: me.count ? `${me.avg}` : '—', ic: '⭐' },
                { label: 'Leaderboard rank', value: me.rank ? `#${me.rank}` : '—', ic: '🏆' },
              ].map(s => (
                <div key={s.label} style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 14, padding: 14 }}>
                  <div style={{ fontSize: 18 }}>{s.ic}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{s.value}</div>
                  <div style={{ fontSize: 11.5, color: '#94a3b8', fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
          {top.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 14, padding: 16, marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>🏆 Top speakers</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {top.slice(0, 5).map(r => (
                  <span key={r.rank} style={{ fontSize: 12.5, background: r.rank <= 3 ? '#fef9c3' : '#f1f5f9', color: '#334155', borderRadius: 999, padding: '4px 11px', fontWeight: 600 }}>
                    {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`} {r.name} · {r.count} recs · {r.avg} avg
                  </span>
                ))}
              </div>
            </div>
          )}
          <h2 style={{ fontSize: 16, margin: '22px 0 10px', color: '#0f172a' }}>To do {pending.length > 0 && <span style={{ color: '#dc2626' }}>({pending.length})</span>}</h2>
          {pending.length === 0 ? (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: 12, padding: 16, fontSize: 14 }}>🎉 You're all caught up — no speaking tasks due right now.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 12 }}>
              {pending.map((t, i) => (
                <div key={i} style={{ background: '#fff', border: `1px solid ${t.overdue ? '#fecaca' : '#e6e8f0'}`, borderRadius: 14, padding: 16 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, color: '#0f172a', flex: 1 }}>{t.title}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: t.overdue ? '#dc2626' : '#64748b', background: t.overdue ? '#fee2e2' : '#f1f5f9', borderRadius: 999, padding: '2px 9px' }}>{t.overdue ? 'Overdue' : 'Due'} {t.dueDate}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{t.prompt}</div>
                  <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 6 }}>Record {t.minSeconds}–{t.maxSeconds}s</div>
                  <button onClick={() => { setResult(null); setActive(t); }} style={{ marginTop: 12, width: '100%', background: `linear-gradient(90deg,${PURPLE},${TEAL})`, color: '#fff', border: 'none', borderRadius: 10, padding: '10px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>🎥 Record now</button>
                </div>
              ))}
            </div>
          )}

          <h2 style={{ fontSize: 16, margin: '26px 0 10px', color: '#0f172a' }}>Your history</h2>
          {history.length === 0 ? <div style={{ color: '#94a3b8', fontSize: 13.5 }}>No recordings yet.</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {history.map(h => <HistoryRow key={h._id} s={h} />)}
            </div>
          )}
        </>
      )}

      {active && <RecordModal task={active} onClose={() => setActive(null)} onDone={(sub) => { setActive(null); setResult(sub); load(); }} />}
      {result && <ResultModal sub={result} onClose={() => setResult(null)} />}
    </div>
  );
};

// ── History row with expandable feedback + playback ──
const HistoryRow: React.FC<{ s: SpeakingSubmission }> = ({ s }) => {
  const [open, setOpen] = useState(false);
  const [vurl, setVurl] = useState('');
  const play = async () => { try { setVurl(await speakingApi.playUrl(s._id)); } catch { /* ignore */ } };
  return (
    <div style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 12, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 14, color: scoreColor(s.score?.overall || 0), background: '#f8fafc', border: `2px solid ${scoreColor(s.score?.overall || 0)}33` }}>{s.score?.overall ?? '—'}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>{s.taskTitle || 'Speaking task'}</div>
          <div style={{ fontSize: 11.5, color: '#94a3b8' }}>{new Date(s.createdAt).toLocaleDateString()} · {s.durationSec}s</div>
        </div>
        <span style={{ color: '#94a3b8', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ marginTop: 10, borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
          <ScoreBars score={s.score} />
          {s.feedback?.summary && <div style={{ fontSize: 13, color: '#334155', marginTop: 8 }}>{s.feedback.summary}</div>}
          <FeedbackLists feedback={s.feedback} />
          <div style={{ marginTop: 8 }}>
            {vurl ? <video src={vurl} controls style={{ width: '100%', maxWidth: 360, borderRadius: 10 }} /> :
              <button onClick={play} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12.5, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>▶ Watch recording</button>}
          </div>
        </div>
      )}
    </div>
  );
};

const ScoreBars: React.FC<{ score?: any }> = ({ score }) => {
  if (!score) return null;
  const dims = [['Fluency', score.fluency], ['Clarity', score.clarity], ['Structure', score.structure], ['Confidence', score.confidence], ['Vocabulary', score.vocabulary]] as const;
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {dims.map(([label, v]) => (
        <div key={label as string}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}><span style={{ color: '#475569', fontWeight: 600 }}>{label}</span><b style={{ color: scoreColor(v as number) }}>{v as number}</b></div>
          <div style={{ height: 6, background: '#eef1f6', borderRadius: 6, overflow: 'hidden' }}><div style={{ width: `${v}%`, height: '100%', background: scoreColor(v as number) }} /></div>
        </div>
      ))}
    </div>
  );
};

const FeedbackLists: React.FC<{ feedback?: any }> = ({ feedback }) => {
  if (!feedback) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
      {!!feedback.strengths?.length && <div><div style={{ fontSize: 12, fontWeight: 700, color: '#15803d', marginBottom: 4 }}>✅ Strengths</div>{feedback.strengths.map((s: string, i: number) => <div key={i} style={{ fontSize: 12.5, color: '#475569', marginBottom: 3 }}>• {s}</div>)}</div>}
      {!!feedback.improvements?.length && <div><div style={{ fontSize: 12, fontWeight: 700, color: '#b45309', marginBottom: 4 }}>🎯 Work on</div>{feedback.improvements.map((s: string, i: number) => <div key={i} style={{ fontSize: 12.5, color: '#475569', marginBottom: 3 }}>• {s}</div>)}</div>}
    </div>
  );
};

// ── Record modal ──
const RecordModal: React.FC<{ task: PendingTask; onClose: () => void; onDone: (s: SpeakingSubmission) => void }> = ({ task, onClose, onDone }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [phase, setPhase] = useState<'ready' | 'recording' | 'recorded' | 'submitting'>('ready');
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); }, []);
  useEffect(() => {
    if (phase !== 'recording') return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const start = async () => {
    setErr('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.muted = true; await videoRef.current.play().catch(() => {}); }
      chunks.current = [];
      const rec = new MediaRecorder(stream, { mimeType: pickMime() || undefined });
      rec.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data); };
      rec.onstop = () => {
        const b = new Blob(chunks.current, { type: chunks.current[0]?.type || 'video/webm' });
        setBlob(b);
        streamRef.current?.getTracks().forEach(t => t.stop());
        if (videoRef.current) { videoRef.current.srcObject = null; videoRef.current.muted = false; videoRef.current.src = URL.createObjectURL(b); }
        setPhase('recorded');
      };
      recRef.current = rec; setSeconds(0); rec.start(); setPhase('recording');
    } catch (e: any) { setErr('Could not access camera/mic. Please allow permission and try again.'); }
  };
  const stop = () => recRef.current?.stop();
  const retake = () => { setBlob(null); setSeconds(0); setPhase('ready'); if (videoRef.current) videoRef.current.src = ''; };
  const submit = async () => {
    if (!blob) return;
    if (seconds < task.minSeconds) { setErr(`Please record at least ${task.minSeconds}s (you did ${seconds}s).`); return; }
    setPhase('submitting'); setErr('');
    try { const sub = await speakingApi.submit(task.taskId, task.dueDate, blob); onDone(sub); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Submission failed. Try again.'); setPhase('recorded'); }
  };

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  return (
    <div onClick={() => phase !== 'submitting' && phase !== 'recording' && onClose()} style={backdrop}>
      <div onClick={e => e.stopPropagation()} style={{ ...card, width: 'min(620px,100%)' }}>
        <div style={{ padding: '15px 20px', background: PURPLE, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 15 }}>🎥 {task.title}</div><div style={{ fontSize: 12, opacity: .9 }}>{task.prompt}</div></div>
          <button onClick={() => phase !== 'submitting' && phase !== 'recording' && onClose()} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: 18 }}>
          {task.instructions && <div style={{ fontSize: 12.5, color: '#64748b', background: '#f8fafc', border: '1px solid #eef1f6', borderRadius: 8, padding: '8px 10px', marginBottom: 12 }}>💡 {task.instructions}</div>}
          <div style={{ position: 'relative', background: '#0f172a', borderRadius: 12, overflow: 'hidden', aspectRatio: '16/9' }}>
            <video ref={videoRef} playsInline controls={phase === 'recorded'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {phase === 'recording' && <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(220,38,38,.9)', color: '#fff', borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 800 }}>● REC {mmss}</div>}
            {phase === 'ready' && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#94a3b8', fontSize: 14 }}>Camera preview will appear here</div>}
          </div>
          {err && <div style={{ background: '#fef2f2', color: '#b91c1c', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginTop: 10 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            {phase === 'ready' && <button onClick={start} style={btn(PURPLE)}>● Start recording</button>}
            {phase === 'recording' && <button onClick={stop} disabled={seconds < 1} style={btn('#dc2626')}>■ Stop ({mmss})</button>}
            {phase === 'recorded' && <>
              <button onClick={submit} style={btn(PURPLE)}>✓ Submit for AI review</button>
              <button onClick={retake} style={{ ...btn('#64748b'), background: '#f1f5f9', color: '#475569' }}>↻ Retake</button>
            </>}
            {phase === 'submitting' && <button disabled style={btn('#94a3b8')}>⏳ Transcribing &amp; scoring… (~20s)</button>}
          </div>
          <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 8 }}>Aim for {task.minSeconds}–{task.maxSeconds}s. Speak clearly; the AI transcribes and coaches your delivery.</div>
        </div>
      </div>
    </div>
  );
};

const ResultModal: React.FC<{ sub: SpeakingSubmission; onClose: () => void }> = ({ sub, onClose }) => (
  <div onClick={onClose} style={backdrop}>
    <div onClick={e => e.stopPropagation()} style={{ ...card, width: 'min(560px,100%)' }}>
      <div style={{ padding: '18px 20px', background: `linear-gradient(120deg,${PURPLE},${TEAL})`, color: '#fff', textAlign: 'center' }}>
        <div style={{ fontSize: 13, opacity: .9 }}>Your speaking score</div>
        <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1 }}>{sub.score?.overall ?? '—'}<span style={{ fontSize: 18, opacity: .8 }}>/100</span></div>
      </div>
      <div style={{ padding: 18 }}>
        <ScoreBars score={sub.score} />
        {sub.feedback?.summary && <div style={{ fontSize: 13.5, color: '#334155', marginTop: 12, lineHeight: 1.5 }}>{sub.feedback.summary}</div>}
        <FeedbackLists feedback={sub.feedback} />
        <button onClick={onClose} style={{ ...btn(PURPLE), marginTop: 16 }}>Done</button>
      </div>
    </div>
  </div>
);

const backdrop: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 20, overflowY: 'auto' };
const card: React.CSSProperties = { background: '#fff', borderRadius: 16, margin: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.3)', overflow: 'hidden' };
const btn = (bg: string): React.CSSProperties => ({ flex: 1, background: bg, color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontWeight: 700, fontSize: 14, cursor: 'pointer' });

export default SpeakingPractice;
