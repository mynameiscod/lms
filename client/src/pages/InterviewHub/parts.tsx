import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { interviewHubApi, HubRound, ExpCard, OUTCOME_LABEL, ROUND_OPTIONS, CATEGORY_OPTIONS } from '../../api/interviewHubApi';

const CAT_LABEL = Object.fromEntries(CATEGORY_OPTIONS.map((c) => [c.key, c.label]));
const COLORS = ['#4f46e5', '#0d9488', '#be123c', '#b45309', '#0369a1', '#7c3aed', '#15803d', '#c2410c'];

/** Where the hub lives: inside CareerPilot's shell for members who opened it there, else the LMS. */
export function useHubBase() {
  const { pathname } = useLocation();
  return pathname.startsWith('/careerpilot') ? '/careerpilot/interview-experiences' : '/interview-experiences';
}

export const fmtDate = (iso?: string | null) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

/** A letter tile coloured by the company name, so the same company always looks the same. */
export const CompanyLogo: React.FC<{ name: string; size?: number }> = ({ name, size }) => {
  const n = (name || '?').trim();
  let h = 0; for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
  return <span className="ih-logo" style={{ background: COLORS[h % COLORS.length], ...(size ? { width: size, height: size } : {}) }}>{n.slice(0, 1).toUpperCase()}</span>;
};

export const OutcomePill: React.FC<{ o: string }> = ({ o }) => {
  const [cls, label] = OUTCOME_LABEL[o] || ['pb-badge-neutral', o];
  return <span className={`pb-pill ${cls}`}>{label}</span>;
};

export const ModeIcon: React.FC<{ mode: string; recording?: boolean }> = ({ mode, recording }) =>
  mode === 'video' ? <span title={recording ? 'Video available' : 'Recorded on video'}><i className="fa-solid fa-video" /></span>
    : mode === 'audio' ? <span title={recording ? 'Voice note available' : 'Recorded as a voice note'}><i className="fa-solid fa-microphone" /></span>
      : <span title="Written"><i className="fa-regular fa-file-lines" /></span>;

export const ExperienceCard: React.FC<{ e: ExpCard; onOpen: () => void; showStatus?: boolean }> = ({ e, onOpen, showStatus }) => (
  <div className="pb-card ih-card" onClick={onOpen} role="button" tabIndex={0} onKeyDown={(k) => { if (k.key === 'Enter') onOpen(); }}>
    <div className="pb-row" style={{ alignItems: 'flex-start' }}>
      <CompanyLogo name={e.companyName} />
      <div className="pb-grow" style={{ minWidth: 0 }}>
        <div className="co">{e.companyName}</div>
        <div className="meta">{e.role || 'Role not given'} · {fmtDate(e.interviewedOn)}</div>
      </div>
      {showStatus && e.status ? <StatusPillHub s={e.status} /> : <OutcomePill o={e.outcome} />}
    </div>
    {!!e.rounds.length && <div className="pb-chips">{e.rounds.slice(0, 5).map((r, i) => <span key={i} className="pb-tag">{i + 1}. {r}</span>)}{e.rounds.length > 5 && <span className="pb-tag">+{e.rounds.length - 5}</span>}</div>}
    {e.tips && <div className="tip">💡 {e.tips}</div>}
    <div className="foot">
      <span><i className="fa-regular fa-circle-question" /> {e.questionCount} question{e.questionCount === 1 ? '' : 's'}</span>
      <ModeIcon mode={e.captureMode} recording={e.hasRecording} />
      <span className="pb-grow" />
      <span>{e.by}</span>
    </div>
    {showStatus && e.status === 'rejected' && e.reviewNote && <div className="pb-alert pb-alert-bad" style={{ margin: 0, fontSize: 12.5 }}>{e.reviewNote}</div>}
  </div>
);

const STATUS: Record<string, [string, string]> = {
  draft: ['pb-badge-neutral', 'Draft'], pending: ['pb-badge-warn', 'In review'], published: ['pb-badge-ok', 'Published'], rejected: ['pb-badge-bad', 'Needs changes'],
};
export const StatusPillHub: React.FC<{ s: string }> = ({ s }) => <span className={`pb-pill ${(STATUS[s] || STATUS.draft)[0]}`}>{(STATUS[s] || STATUS.draft)[1]}</span>;

/** Read-only rounds, as a timeline. */
export const RoundsTimeline: React.FC<{ rounds: HubRound[] }> = ({ rounds }) => {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  if (!rounds.length) return <div className="pb-muted">No rounds were recorded.</div>;
  return (
    <div className="ih-timeline">
      {rounds.map((r, i) => (
        <div key={i} className="ih-round">
          <span className={`dot ${r.cleared === true ? 'ok' : r.cleared === false ? 'bad' : ''}`}>{i + 1}</span>
          <div className="pb-card">
            <div className="pb-row" style={{ flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0 }} className="pb-grow">{r.name || r.label}</h3>
              {r.mode && <span className="pb-tag">{r.mode === 'online' ? 'Online' : 'In person'}</span>}
              {r.durationMins ? <span className="pb-tag">{r.durationMins} min</span> : null}
              {r.cleared === true && <span className="pb-pill pb-badge-ok">Cleared</span>}
              {r.cleared === false && <span className="pb-pill pb-badge-bad">Eliminated here</span>}
            </div>
            {!!r.questions.length && (
              <ol className="ih-qlist">
                {r.questions.map((q, j) => {
                  const k = `${i}:${j}`;
                  return (
                    <li key={j}>
                      <div className="pb-row" style={{ alignItems: 'flex-start' }}>
                        <span className="pb-grow" style={{ whiteSpace: 'pre-wrap' }}>{q.text}</span>
                        {q.category && <span className="pb-tag">{CAT_LABEL[q.category] || q.category}</span>}
                      </div>
                      {q.answerHint && (open[k]
                        ? <div className="ih-hint"><b>How they answered:</b> {q.answerHint}</div>
                        : <button className="pb-btn pb-btn-ghost pb-btn-sm" style={{ paddingLeft: 0 }} onClick={() => setOpen({ ...open, [k]: true })}><i className="fa-regular fa-lightbulb" /> Show their answer</button>)}
                    </li>
                  );
                })}
              </ol>
            )}
            {r.notes && <div className="pb-muted" style={{ marginTop: 8, fontSize: 13, whiteSpace: 'pre-wrap' }}>{r.notes}</div>}
          </div>
        </div>
      ))}
    </div>
  );
};

/** Edit rounds and their questions — used by the candidate and by the reviewing admin. */
export const RoundsEditor: React.FC<{ rounds: HubRound[]; onChange: (r: HubRound[]) => void }> = ({ rounds, onChange }) => {
  const set = (i: number, patch: Partial<HubRound>) => onChange(rounds.map((r, x) => (x === i ? { ...r, ...patch } : r)));
  const move = (i: number, dir: -1 | 1) => { const j = i + dir; if (j < 0 || j >= rounds.length) return; const c = [...rounds]; [c[i], c[j]] = [c[j], c[i]]; onChange(c); };
  return (
    <div>
      {rounds.map((r, i) => (
        <div key={i} className="pb-card ih-redit">
          <div className="pb-row" style={{ flexWrap: 'wrap' }}>
            <span className="pb-pill pb-badge-accent">Round {i + 1}</span>
            <select className="pb-select" style={{ width: 180 }} value={r.key} onChange={(e) => set(i, { key: e.target.value, name: r.name && ROUND_OPTIONS.some((o) => o.label === r.name) ? ROUND_OPTIONS.find((o) => o.key === e.target.value)!.label : r.name || ROUND_OPTIONS.find((o) => o.key === e.target.value)!.label })}>
              {ROUND_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
            <input className="pb-input pb-grow" style={{ minWidth: 160 }} placeholder="Round name as they called it" value={r.name} onChange={(e) => set(i, { name: e.target.value })} />
            <select className="pb-select" style={{ width: 120 }} value={r.mode || ''} onChange={(e) => set(i, { mode: e.target.value })}>
              <option value="">Mode…</option><option value="online">Online</option><option value="offline">In person</option>
            </select>
            <select className="pb-select" style={{ width: 150 }} value={r.cleared === true ? 'yes' : r.cleared === false ? 'no' : ''} onChange={(e) => set(i, { cleared: e.target.value === '' ? undefined : e.target.value === 'yes' })}>
              <option value="">Result…</option><option value="yes">I cleared it</option><option value="no">Eliminated here</option>
            </select>
            <button className="pb-btn pb-btn-ghost pb-btn-icon" title="Move up" onClick={() => move(i, -1)} disabled={i === 0}><i className="fa-solid fa-arrow-up" /></button>
            <button className="pb-btn pb-btn-ghost pb-btn-icon" title="Move down" onClick={() => move(i, 1)} disabled={i === rounds.length - 1}><i className="fa-solid fa-arrow-down" /></button>
            <button className="pb-btn pb-btn-ghost pb-btn-icon" title="Remove round" onClick={() => onChange(rounds.filter((_, x) => x !== i))}><i className="fa-regular fa-trash-can" /></button>
          </div>
          {r.questions.map((q, j) => (
            <div key={j} className="qrow">
              <textarea className="pb-textarea" rows={2} placeholder={`Question ${j + 1} — as they asked it`} value={q.text}
                onChange={(e) => set(i, { questions: r.questions.map((x, y) => (y === j ? { ...x, text: e.target.value } : x)) })} />
              <select className="pb-select" value={q.category || ''} onChange={(e) => set(i, { questions: r.questions.map((x, y) => (y === j ? { ...x, category: e.target.value } : x)) })}>
                {CATEGORY_OPTIONS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
              <button className="pb-btn pb-btn-ghost pb-btn-icon" title="Remove question" onClick={() => set(i, { questions: r.questions.filter((_, y) => y !== j) })}><i className="fa-solid fa-xmark" /></button>
              <input className="pb-input" style={{ gridColumn: '1 / -1', fontSize: 13 }} placeholder="Optional: what you answered / the expected approach" value={q.answerHint || ''}
                onChange={(e) => set(i, { questions: r.questions.map((x, y) => (y === j ? { ...x, answerHint: e.target.value } : x)) })} />
            </div>
          ))}
          <div className="pb-row" style={{ marginTop: 10 }}>
            <button className="pb-btn pb-btn-sm" onClick={() => set(i, { questions: [...r.questions, { text: '', category: '' }] })}><i className="fa-solid fa-plus" /> Add a question</button>
            <input className="pb-input pb-grow" style={{ fontSize: 13 }} placeholder="Anything else about this round (duration, panel, cut-off…)" value={r.notes || ''} onChange={(e) => set(i, { notes: e.target.value })} />
          </div>
        </div>
      ))}
      <button className="pb-btn" onClick={() => onChange([...rounds, { key: 'technical', name: 'Technical Interview', questions: [{ text: '', category: '' }] }])}><i className="fa-solid fa-plus" /> Add a round</button>
    </div>
  );
};

/** Plays a recording on demand — it is fetched with the auth header, never linked directly. */
export const RecordingPlayer: React.FC<{ id: string; contentType: string; durationSec?: number }> = ({ id, contentType, durationSec }) => {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const isAudio = contentType.startsWith('audio');
  if (!url) return (
    <button className="pb-btn" disabled={busy} onClick={async () => { setBusy(true); setErr(''); try { setUrl(await interviewHubApi.mediaUrl(id)); } catch { setErr('Could not load the recording.'); } setBusy(false); }}>
      {busy ? <span className="pb-spinner" /> : <i className={`fa-solid ${isAudio ? 'fa-headphones' : 'fa-circle-play'}`} />} {isAudio ? 'Listen to the voice note' : 'Watch the video'}{durationSec ? ` · ${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')}` : ''}
      {err && <span style={{ color: 'var(--pb-bad)', marginLeft: 8 }}>{err}</span>}
    </button>
  );
  return isAudio ? <audio src={url} controls autoPlay style={{ width: '100%' }} /> : <video src={url} controls autoPlay style={{ width: '100%', maxHeight: 420, borderRadius: 12, background: '#000' }} />;
};

/**
 * Records a voice note or a video in the browser. For video it also records the audio track
 * on its own — a small file that can be transcribed, where the video usually cannot.
 */
export const Recorder: React.FC<{ kind: 'audio' | 'video'; onDone: (r: { recording: Blob; audio?: Blob; seconds: number } | null) => void }> = ({ kind, onDone }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [preview, setPreview] = useState('');
  const [err, setErr] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const recs = useRef<{ main?: MediaRecorder; audio?: MediaRecorder; mainChunks: Blob[]; audioChunks: Blob[] }>({ mainChunks: [], audioChunks: [] });
  const timer = useRef<any>();

  useEffect(() => () => { stream?.getTracks().forEach((t) => t.stop()); clearInterval(timer.current); if (preview) URL.revokeObjectURL(preview); }, [stream, preview]);

  const start = async () => {
    setErr('');
    try {
      const s = stream || await navigator.mediaDevices.getUserMedia(kind === 'video' ? { audio: true, video: { width: 1280, height: 720 } } : { audio: true });
      setStream(s);
      if (kind === 'video' && videoRef.current) { videoRef.current.srcObject = s; videoRef.current.muted = true; videoRef.current.play().catch(() => undefined); }
      const pick = (types: string[]) => types.find((t) => (window as any).MediaRecorder?.isTypeSupported?.(t)) || '';
      const mainType = kind === 'video' ? pick(['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']) : pick(['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']);
      const r = recs.current;
      r.mainChunks = []; r.audioChunks = [];
      r.main = new MediaRecorder(s, mainType ? { mimeType: mainType, ...(kind === 'video' ? { videoBitsPerSecond: 1_000_000 } : {}) } : undefined);
      r.main.ondataavailable = (e) => { if (e.data.size) r.mainChunks.push(e.data); };
      r.main.start(1000);
      if (kind === 'video') {
        const audioOnly = new MediaStream(s.getAudioTracks());
        const at = pick(['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']);
        r.audio = new MediaRecorder(audioOnly, at ? { mimeType: at, audioBitsPerSecond: 48_000 } : undefined);
        r.audio.ondataavailable = (e) => { if (e.data.size) r.audioChunks.push(e.data); };
        r.audio.start(1000);
      }
      setSecs(0); setRecording(true); setPreview('');
      timer.current = setInterval(() => setSecs((x) => x + 1), 1000);
    } catch (e: any) {
      setErr(e?.name === 'NotAllowedError' ? `Allow ${kind === 'video' ? 'camera and microphone' : 'microphone'} access in your browser, then try again.` : 'Could not start recording on this device.');
    }
  };

  const stop = () => {
    const r = recs.current;
    clearInterval(timer.current);
    setRecording(false);
    const finish = (rec: MediaRecorder | undefined) => new Promise<void>((ok) => { if (!rec || rec.state === 'inactive') return ok(); rec.onstop = () => ok(); rec.stop(); });
    Promise.all([finish(r.main), finish(r.audio)]).then(() => {
      const main = new Blob(r.mainChunks, { type: r.main?.mimeType || (kind === 'video' ? 'video/webm' : 'audio/webm') });
      const audio = r.audioChunks.length ? new Blob(r.audioChunks, { type: r.audio?.mimeType || 'audio/webm' }) : undefined;
      stream?.getTracks().forEach((t) => t.stop()); setStream(null);
      setPreview(URL.createObjectURL(main));
      onDone({ recording: main, audio, seconds: secs });
    });
  };

  const mm = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  return (
    <div className="ih-recorder">
      {kind === 'video' && !preview && <video ref={videoRef} playsInline />}
      {preview && (kind === 'video' ? <video src={preview} controls playsInline /> : <audio src={preview} controls style={{ width: '100%' }} />)}
      <div className="pb-row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
        {recording ? <>
          <span className="rec">{mm}</span>
          <span className="pb-grow" />
          <button className="pb-btn pb-btn-danger" onClick={stop}><i className="fa-solid fa-stop" /> Stop</button>
        </> : <>
          <span style={{ color: '#cbd5e1' }}>{preview ? `Recorded ${mm}. Listen back, or record again.` : `Speak for 3–10 minutes. We turn it into rounds and questions for you.`}</span>
          <span className="pb-grow" />
          <button className="pb-btn pb-btn-primary" onClick={() => { if (preview) { URL.revokeObjectURL(preview); onDone(null); } start(); }}>
            <i className={`fa-solid ${kind === 'video' ? 'fa-video' : 'fa-microphone'}`} /> {preview ? 'Record again' : 'Start recording'}
          </button>
        </>}
      </div>
      {!preview && (
        <ul className="ih-prompts">
          <li>How many rounds were there, and what was each one?</li>
          <li>What exactly did they ask in each round — every question you remember.</li>
          <li>Where did people get eliminated, and why?</li>
          <li>What would you tell the next person to prepare?</li>
        </ul>
      )}
      {err && <div className="pb-alert pb-alert-bad" style={{ marginTop: 10 }}>{err}</div>}
    </div>
  );
};

export interface FlashItem { q: string; a?: string; tag?: string; note?: string }

/**
 * Flashcards: read the question, think, tap to flip, then say whether you knew it. "Revise"
 * cards come back at the end of the round; progress is kept in this browser per deck.
 */
export const Flashcards: React.FC<{ deckKey: string; items: FlashItem[]; onClose?: () => void }> = ({ deckKey, items, onClose }) => {
  const storeKey = `ih-flash:${deckKey}`;
  const load = (): Record<string, 'knew' | 'revise'> => { try { return JSON.parse(localStorage.getItem(storeKey) || '{}'); } catch { return {}; } };
  const [marks, setMarks] = useState<Record<string, 'knew' | 'revise'>>(load);
  const [queue, setQueue] = useState<number[]>(() => items.map((_, i) => i).filter((i) => load()[items[i].q] !== 'knew'));
  const [flipped, setFlipped] = useState(false);
  const save = (m: Record<string, 'knew' | 'revise'>) => { setMarks(m); try { localStorage.setItem(storeKey, JSON.stringify(m)); } catch { /* private mode */ } };
  const knewCount = items.filter((it) => marks[it.q] === 'knew').length;
  const cur = queue[0];

  const mark = (m: 'knew' | 'revise') => {
    const it = items[cur];
    save({ ...marks, [it.q]: m });
    setFlipped(false);
    setQueue((qu) => (m === 'knew' ? qu.slice(1) : [...qu.slice(1), qu[0]]));
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (cur === undefined) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped((f) => !f); }
      if (flipped && (e.key === 'ArrowRight' || e.key === 'k')) mark('knew');
      if (flipped && (e.key === 'ArrowLeft' || e.key === 'r')) mark('revise');
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  if (!items.length) return <div className="pb-muted">No questions to practise yet.</div>;
  if (cur === undefined) return (
    <div className="ih-flash pb-card pb-empty">
      <div style={{ fontSize: 42 }}>🎉</div>
      <h2>You knew all {items.length}</h2>
      <p className="pb-muted">Come back the day before your interview for a quick run-through.</p>
      <div className="pb-row" style={{ justifyContent: 'center' }}>
        <button className="pb-btn" onClick={() => { save({}); setQueue(items.map((_, i) => i)); }}>Start over</button>
        {onClose && <button className="pb-btn pb-btn-primary" onClick={onClose}>Done</button>}
      </div>
    </div>
  );
  const it = items[cur];
  return (
    <div className="ih-flash">
      <div className={`ih-flash-card ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped(!flipped)} role="button" tabIndex={0} aria-label="Flip card">
        <div className="ih-flash-inner">
          <div className="ih-flash-face">
            <div className="pb-row">{it.tag && <span className="pb-tag">{it.tag}</span>}{it.note && <span className="pb-faint" style={{ fontSize: 12 }}>{it.note}</span>}</div>
            <div className="q">{it.q}</div>
            <div className="hint">Think of your answer, then tap to flip · Space</div>
          </div>
          <div className="ih-flash-face back">
            <div className="pb-faint" style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>ANSWER</div>
            <div className="a">{it.a || 'No model answer yet — say yours out loud, then judge honestly.'}</div>
          </div>
        </div>
      </div>
      <div className="ih-flash-bar">
        <button className="pb-btn" disabled={!flipped} onClick={() => mark('revise')}><i className="fa-solid fa-rotate-left" /> Revise</button>
        <div className="ih-flash-progress"><span style={{ width: `${(knewCount / items.length) * 100}%` }} /></div>
        <span className="pb-muted" style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>{knewCount}/{items.length} known</span>
        <button className="pb-btn pb-btn-success" disabled={!flipped} onClick={() => mark('knew')}><i className="fa-solid fa-check" /> I knew it</button>
      </div>
    </div>
  );
};
