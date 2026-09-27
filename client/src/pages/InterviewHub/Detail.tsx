import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { interviewHubApi, ExpFull } from '../../api/interviewHubApi';
import { CompanyLogo, OutcomePill, RoundsTimeline, RecordingPlayer, fmtDate, ModeIcon, useHubBase } from './parts';
import '../ProblemBank/ProblemBank.css';
import './hub.css';

/** One candidate's interview: the rounds and every question, their tips, and the recording. */
const Detail: React.FC = () => {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const base = useHubBase();
  const [e, setE] = useState<ExpFull | null>(null);
  const [err, setErr] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);
  useEffect(() => { interviewHubApi.experience(id).then(setE).catch((x) => setErr(x?.response?.data?.message || 'Could not load it.')); }, [id]);

  if (err) return <div className="pb-root"><div className="pb-page"><div className="pb-alert pb-alert-bad">{err}</div></div></div>;
  if (!e) return <div className="pb-root"><div className="pb-page pb-muted"><span className="pb-spinner" /> Loading…</div></div>;
  const qCount = e.rounds.reduce((n, r) => n + r.questions.length, 0);

  return (
    <div className="pb-root">
      <div className="pb-page" style={{ maxWidth: 1180 }}>
        <button className="pb-btn pb-btn-ghost pb-btn-sm" style={{ marginBottom: 10 }} onClick={() => nav(-1)}><i className="fa-solid fa-arrow-left" /> Back</button>
        <div className="pb-head" style={{ alignItems: 'center' }}>
          <CompanyLogo name={e.companyName} size={52} />
          <div className="pb-grow">
            <h1>{e.companyName}</h1>
            <p style={{ marginTop: 2 }}>{e.role || 'Role not given'} · interviewed {fmtDate(e.interviewedOn)} · shared by {e.by}</p>
          </div>
          <OutcomePill o={e.outcome} />
        </div>

        <div className="ih-two">
          <div>
            {e.recording && <div className="pb-card" style={{ padding: 14, marginBottom: 12 }}><RecordingPlayer id={e.id} contentType={e.recording.contentType} durationSec={e.recording.durationSec} /></div>}
            {e.tips && <div className="ih-callout tip"><h3>💡 Advice for the next candidate</h3><p>{e.tips}</p></div>}
            {e.eliminationSummary && <div className="ih-callout cut"><h3>✂️ Where people were eliminated</h3><p>{e.eliminationSummary}</p></div>}
            <h2 style={{ margin: '6px 0 12px' }}>Rounds & questions</h2>
            {e.rounds.length ? <RoundsTimeline rounds={e.rounds} /> : (
              <div className="pb-card" style={{ padding: 16 }}>
                <div className="pb-chips" style={{ marginBottom: 8 }}>{e.roundsFaced.map((r, i) => <span key={i} className="pb-tag">{i + 1}. {r}</span>)}</div>
                {e.review && <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{e.review}</p>}
              </div>
            )}
            {e.transcript && (
              <div className="pb-card" style={{ padding: 14, marginTop: 12 }}>
                <button className="pb-btn pb-btn-ghost pb-btn-sm" onClick={() => setShowTranscript(!showTranscript)}>
                  <i className={`fa-solid fa-chevron-${showTranscript ? 'up' : 'down'}`} /> {showTranscript ? 'Hide' : 'Read'} the full transcript
                </button>
                {showTranscript && <p style={{ whiteSpace: 'pre-wrap', color: 'var(--pb-body)', lineHeight: 1.6 }}>{e.transcript}</p>}
              </div>
            )}
          </div>
          <aside>
            <div className="pb-card" style={{ padding: 16 }}>
              <h3>At a glance</h3>
              <div className="pb-row" style={{ justifyContent: 'space-between', padding: '6px 0' }}><span className="pb-muted">Rounds</span><b>{e.rounds.length || e.roundsFaced.length}</b></div>
              <div className="pb-row" style={{ justifyContent: 'space-between', padding: '6px 0' }}><span className="pb-muted">Questions</span><b>{qCount}</b></div>
              {e.difficultyFelt && <div className="pb-row" style={{ justifyContent: 'space-between', padding: '6px 0' }}><span className="pb-muted">Felt</span><b style={{ textTransform: 'capitalize' }}>{e.difficultyFelt}</b></div>}
              {e.durationDays ? <div className="pb-row" style={{ justifyContent: 'space-between', padding: '6px 0' }}><span className="pb-muted">Process took</span><b>{e.durationDays} days</b></div> : null}
              <div className="pb-row" style={{ justifyContent: 'space-between', padding: '6px 0' }}><span className="pb-muted">Shared as</span><b><ModeIcon mode={e.captureMode} /> {e.captureMode === 'text' ? 'Written' : e.captureMode === 'audio' ? 'Voice note' : 'Video'}</b></div>
              <button className="pb-btn pb-btn-primary" style={{ width: '100%', marginTop: 12, justifyContent: 'center' }} onClick={() => nav(`${base}/company/${e.companySlug}`)}>
                All {e.companyName} experiences & most-asked questions
              </button>
            </div>
            <div className="pb-card" style={{ padding: 16, marginTop: 12 }}>
              <h3>Interviewed recently?</h3>
              <p className="pb-muted" style={{ margin: '0 0 10px', fontSize: 13 }}>Your questions help the next batch walk in prepared.</p>
              <button className="pb-btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => nav(`${base}/share`)}><i className="fa-solid fa-microphone-lines" /> Share yours</button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Detail;
