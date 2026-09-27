import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { interviewHubApi, ExpFull, HubRound } from '../../api/interviewHubApi';
import { Recorder, RoundsEditor, RecordingPlayer, useHubBase } from './parts';
import '../ProblemBank/ProblemBank.css';
import './hub.css';

/**
 * Share an interview. Built so a candidate who has five minutes can still give the next batch
 * everything: say it into the microphone, and the transcript is organised into rounds and
 * questions for them to correct. Typing works the same way.
 */
type Mode = 'text' | 'audio' | 'video';
const today = () => new Date().toISOString().slice(0, 10);

const Share: React.FC = () => {
  const nav = useNavigate();
  const base = useHubBase();
  const [sp] = useSearchParams();
  const inviteId = sp.get('invite') || '';
  const editId = sp.get('id') || '';
  const [step, setStep] = useState(0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('');
  const [inviteMsg, setInviteMsg] = useState('');

  const [companyName, setCompanyName] = useState(sp.get('company') || '');
  const [role, setRole] = useState('');
  const [interviewedOn, setInterviewedOn] = useState(today());
  const [outcome, setOutcome] = useState('waiting');

  const [mode, setMode] = useState<Mode>('audio');
  const [notes, setNotes] = useState('');
  const [useAi, setUseAi] = useState(true);
  const [rec, setRec] = useState<{ recording: Blob; audio?: Blob; seconds: number } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [exp, setExp] = useState<ExpFull | null>(null);
  const [rounds, setRounds] = useState<HubRound[]>([]);
  const [tips, setTips] = useState('');
  const [elim, setElim] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [shareGlobal, setShareGlobal] = useState(true);
  const [shareRecording, setShareRecording] = useState(true);
  const [aiNote, setAiNote] = useState('');

  useEffect(() => {
    if (inviteId) interviewHubApi.invite(inviteId).then((i) => {
      if (i.status === 'submitted' && i.experienceId) { nav(`${base}/share?id=${i.experienceId}`, { replace: true }); return; }
      setCompanyName(i.companyName); setRole(i.role || '');
      if (i.interviewedOn) setInterviewedOn(i.interviewedOn.slice(0, 10));
      setInviteMsg(i.message || '');
    }).catch(() => undefined);
  }, [inviteId, nav, base]);

  useEffect(() => {
    if (!editId) return;
    interviewHubApi.getMine(editId).then((e) => { loadExp(e); setStep(2); }).catch((x) => setErr(x?.response?.data?.message || 'Could not open it.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const loadExp = (e: ExpFull) => {
    setExp(e); setCompanyName(e.companyName); setRole(e.role); setInterviewedOn(String(e.interviewedOn).slice(0, 10)); setOutcome(e.outcome);
    setRounds(e.rounds.length ? e.rounds : [{ key: 'technical', name: 'Technical Interview', questions: [{ text: '' }] }]);
    setTips(e.tips || ''); setElim(e.eliminationSummary || '');
    setAnonymous(!!e.anonymous); setShareGlobal(e.shareGlobal !== false); setShareRecording(e.shareRecording !== false);
  };

  const basicsOk = companyName.trim().length >= 2 && !!interviewedOn;

  const createDraft = async () => {
    setErr(''); setBusy(true); setProgress(0);
    const f = new FormData();
    f.append('companyName', companyName.trim()); f.append('role', role.trim()); f.append('interviewedOn', interviewedOn); f.append('outcome', outcome);
    f.append('captureMode', mode); f.append('notes', notes); f.append('useAi', String(mode === 'text' ? useAi : true));
    if (inviteId) f.append('inviteId', inviteId);
    if (mode !== 'text') {
      if (rec) {
        const ext = rec.recording.type.includes('mp4') ? 'mp4' : 'webm';
        f.append('recording', rec.recording, `${mode}.${ext}`);
        if (rec.audio) f.append('audio', rec.audio, 'audio.webm');
      } else if (file) f.append('recording', file, file.name);
    }
    setPhase(mode === 'text' ? (useAi ? 'Organising your notes into rounds…' : 'Saving…') : 'Uploading…');
    try {
      const r = await interviewHubApi.createDraft(f, (p) => { setProgress(p); if (p >= 100) setPhase('Transcribing and organising it into rounds and questions — about 30 seconds…'); });
      loadExp(r.experience);
      setAiNote(r.aiError ? `We could not organise it automatically (${r.aiError}). Fill in the rounds below.` : r.aiStructured ? 'We organised what you said into rounds and questions. Check it, fix anything wrong, add what we missed.' : mode !== 'text' && !r.transcribed ? 'We saved your recording but could not transcribe it. Add the rounds and questions below.' : '');
      setStep(2);
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not save it. Try again.'); }
    setBusy(false); setPhase('');
  };

  const save = async (submit: boolean) => {
    if (!exp) return;
    setErr(''); setBusy(true);
    try {
      const cleaned = rounds.map((r) => ({ ...r, questions: r.questions.filter((q) => q.text.trim()) }));
      const e = await interviewHubApi.updateMine(exp.id, { companyName, role, interviewedOn, outcome, rounds: cleaned, tips, eliminationSummary: elim, anonymous, shareGlobal, shareRecording, submit });
      setExp(e);
      if (submit) setStep(3);
    } catch (x: any) { setErr(x?.response?.data?.message || 'Could not save.'); }
    setBusy(false);
  };

  const captureReady = mode === 'text' ? notes.trim().length >= 20 || !useAi : !!rec || !!file;
  const qTotal = rounds.reduce((n, r) => n + r.questions.filter((q) => q.text.trim()).length, 0);

  return (
    <div className="pb-root">
      <div className="pb-page ih-wizard">
        <button className="pb-btn pb-btn-ghost pb-btn-sm" style={{ marginBottom: 10 }} onClick={() => nav(`${base}?tab=mine`)}><i className="fa-solid fa-arrow-left" /> My posts</button>
        <h1 style={{ marginBottom: 4 }}>Share your interview</h1>
        <p className="pb-muted" style={{ marginTop: 0 }}>What you were asked is the most useful thing the next candidate can read. Your admin reviews it before anyone sees it.</p>
        <div className="ih-steps">{[0, 1, 2, 3].map((i) => <span key={i} className={step >= i ? 'on' : ''} />)}</div>
        {inviteMsg && step < 2 && <div className="pb-alert pb-alert-info"><b>From your admin:</b> {inviteMsg}</div>}
        {err && <div className="pb-alert pb-alert-bad">{err}</div>}

        {step === 0 && (
          <div className="pb-card" style={{ padding: 20 }}>
            <h2>The interview</h2>
            <div className="pb-field-row">
              <div><label className="pb-label">Company</label><input className="pb-input" autoFocus value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Infosys" /></div>
              <div><label className="pb-label">Role</label><input className="pb-input" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Java Developer" /></div>
            </div>
            <div className="pb-field-row">
              <div><label className="pb-label">Interview date <small>the last round you faced</small></label><input className="pb-input" type="date" max={today()} value={interviewedOn} onChange={(e) => setInterviewedOn(e.target.value)} /></div>
              <div><label className="pb-label">Result so far</label>
                <select className="pb-select" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
                  <option value="waiting">Waiting for the result</option><option value="offer">Got the offer</option><option value="rejected">Not selected</option><option value="withdrew">I withdrew</option>
                </select></div>
            </div>
            <div className="pb-row" style={{ marginTop: 18, justifyContent: 'flex-end' }}>
              <button className="pb-btn pb-btn-primary" disabled={!basicsOk} onClick={() => setStep(1)}>Next <i className="fa-solid fa-arrow-right" /></button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="pb-card" style={{ padding: 20 }}>
            <h2>How do you want to share it?</h2>
            <p className="pb-muted" style={{ marginTop: 4 }}>Speaking is fastest — we turn it into rounds and questions for you.</p>
            <div className="ih-modes">
              {([['audio', 'fa-microphone', 'Voice note', 'Talk it through, 3–10 minutes'], ['video', 'fa-video', 'Video', 'Record yourself explaining it'], ['text', 'fa-keyboard', 'Type it', 'Write your notes or fill the rounds']] as const).map(([m, ic, t, s]) => (
                <button key={m} className={`ih-mode ${mode === m ? 'on' : ''}`} onClick={() => { setMode(m); setRec(null); setFile(null); }}>
                  <i className={`fa-solid ${ic}`} /><b>{t}</b><span>{s}</span>
                </button>
              ))}
            </div>

            {mode === 'text' ? (
              <div style={{ marginTop: 14 }}>
                <label className="pb-label">Everything you remember <small>round by round, every question — rough is fine</small></label>
                <textarea className="pb-textarea" rows={10} value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder={'Round 1 — Online test (60 min): 20 aptitude, 2 coding: reverse a linked list, find the longest substring without repeats…\nRound 2 — Technical: asked about my project, OOPs pillars, difference between HashMap and ConcurrentHashMap…\nMost people were eliminated in the coding round.\nTip: revise SQL joins, they asked 3 queries.'} />
                <label className="pb-switch" style={{ marginTop: 8 }}><input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} /> Organise my notes into rounds and questions for me</label>
              </div>
            ) : (
              <>
                {!file && <Recorder key={mode} kind={mode} onDone={setRec} />}
                {!rec && (
                  <div className="pb-row" style={{ marginTop: 10 }}>
                    <span className="pb-muted" style={{ fontSize: 13 }}>{file ? <>Selected <b>{file.name}</b> ({Math.round(file.size / 1024 / 1024)} MB)</> : 'Already recorded it on your phone?'}</span>
                    <input ref={fileRef} type="file" hidden accept={mode === 'audio' ? 'audio/*' : 'video/*'} onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    <button className="pb-btn pb-btn-sm" onClick={() => (file ? setFile(null) : fileRef.current?.click())}>{file ? 'Remove' : 'Upload a file'}</button>
                  </div>
                )}
                {file && mode === 'video' && file.size > 24 * 1024 * 1024 && <div className="pb-help">Large videos cannot be transcribed automatically — you will fill in the rounds on the next step. A voice note always can be.</div>}
                <label className="pb-label">Anything to add in writing? <small>optional</small></label>
                <textarea className="pb-textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Coding questions are easier to type exactly — paste them here." />
              </>
            )}

            {busy && (
              <div className="pb-alert pb-alert-info" style={{ marginTop: 12 }}>
                <span className="pb-spinner" /> {phase} {progress > 0 && progress < 100 ? `${progress}%` : ''}
              </div>
            )}
            <div className="pb-row" style={{ marginTop: 18 }}>
              <button className="pb-btn" onClick={() => setStep(0)} disabled={busy}><i className="fa-solid fa-arrow-left" /> Back</button>
              <span className="pb-grow" />
              <button className="pb-btn pb-btn-primary" disabled={!captureReady || busy} onClick={createDraft}>
                {busy ? <span className="pb-spinner" /> : null} {mode === 'text' && !useAi ? 'Fill the rounds myself' : 'Continue'} <i className="fa-solid fa-arrow-right" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && exp && (
          <>
            {aiNote && <div className="pb-alert pb-alert-info">{aiNote}</div>}
            {exp.status === 'rejected' && exp.reviewNote && <div className="pb-alert pb-alert-warn"><b>Your admin asked for changes:</b> {exp.reviewNote}</div>}
            <div className="pb-card" style={{ padding: 16, marginBottom: 12 }}>
              <div className="pb-row" style={{ flexWrap: 'wrap' }}>
                <b className="pb-grow" style={{ fontSize: 16 }}>{companyName}{role ? ` · ${role}` : ''}</b>
                <select className="pb-select" style={{ width: 200 }} value={outcome} onChange={(e) => setOutcome(e.target.value)}>
                  <option value="waiting">Waiting for the result</option><option value="offer">Got the offer</option><option value="rejected">Not selected</option><option value="withdrew">I withdrew</option>
                </select>
              </div>
              {exp.recording && <div style={{ marginTop: 10 }}><RecordingPlayer id={exp.id} contentType={exp.recording.contentType} durationSec={exp.recording.durationSec} /></div>}
            </div>

            <h2 style={{ margin: '4px 0 10px' }}>Rounds & questions <span className="pb-muted" style={{ fontSize: 13, fontWeight: 600 }}>{rounds.length} rounds · {qTotal} questions</span></h2>
            <RoundsEditor rounds={rounds} onChange={setRounds} />

            <div className="pb-card" style={{ padding: 16, marginTop: 14 }}>
              <label className="pb-label" style={{ marginTop: 0 }}>Where were people eliminated, and why?</label>
              <textarea className="pb-textarea" rows={3} value={elim} onChange={(e) => setElim(e.target.value)} placeholder="e.g. About half were cut in the coding round — most could not finish the second problem in time." />
              <label className="pb-label">Your advice for the next person</label>
              <textarea className="pb-textarea" rows={3} value={tips} onChange={(e) => setTips(e.target.value)} placeholder="What should they revise? What surprised you?" />
            </div>

            <div className="pb-card ih-consent" style={{ marginTop: 14 }}>
              <b>Who can see it</b>
              <label className="pb-switch"><input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} /> Post without my name</label>
              <label className="pb-switch"><input type="checkbox" checked={shareGlobal} onChange={(e) => setShareGlobal(e.target.checked)} /> Also help students at other institutes <small className="pb-faint">(they never see your name)</small></label>
              {exp.recording && <label className="pb-switch"><input type="checkbox" checked={shareRecording} onChange={(e) => setShareRecording(e.target.checked)} /> Let other students {exp.recording.contentType.startsWith('audio') ? 'listen to my voice note' : 'watch my video'} <small className="pb-faint">(untick to share only the text)</small></label>}
            </div>

            <div className="pb-row" style={{ marginTop: 16, flexWrap: 'wrap' }}>
              {!editId && <button className="pb-btn" onClick={() => setStep(1)} disabled={busy}><i className="fa-solid fa-arrow-left" /> Back</button>}
              <span className="pb-grow" />
              <button className="pb-btn" disabled={busy} onClick={() => save(false)}>Save draft</button>
              <button className="pb-btn pb-btn-primary" disabled={busy} onClick={() => save(true)}>{busy ? <span className="pb-spinner" /> : <i className="fa-solid fa-paper-plane" />} Submit for review</button>
            </div>
          </>
        )}

        {step === 3 && (
          <div className="pb-card pb-empty">
            <div style={{ fontSize: 44 }}>🙌</div>
            <h2>Thank you — that will genuinely help someone</h2>
            <p className="pb-muted">Your admin reviews it, then it goes live for every student preparing for {companyName}. You earn coins when it is approved.</p>
            <div className="pb-row" style={{ justifyContent: 'center', marginTop: 12 }}>
              <button className="pb-btn" onClick={() => nav(`${base}?tab=mine`)}>My posts</button>
              <button className="pb-btn pb-btn-primary" onClick={() => nav(base)}>Read other experiences</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Share;
