import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { interviewHubApi, ExpFull } from '../../api/interviewHubApi';
import { CompanyLogo, OutcomePill, RoundsTimeline, RecordingPlayer, fmtInterviewDate, ModeIcon, MODE_LABEL, DifficultyTag, cleanRoundNames, prettyCompany, useHubBase } from './parts';
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

  if (err) return <div className="pb-root ih-cb"><div className="pb-page ihx-page"><button className="ihx-back" onClick={() => nav(base)}><i className="bi bi-arrow-left" /> All experiences</button><div className="ihx-alert bad"><i className="bi bi-exclamation-triangle" /> {err}</div></div></div>;
  if (!e) return <div className="pb-root ih-cb"><div className="pb-page ihx-page pb-muted"><span className="pb-spinner" /> Loading the experience…</div></div>;
  const qCount = e.rounds.reduce((n, r) => n + r.questions.length, 0);
  const faced = cleanRoundNames(e.roundsFaced);
  const roundCount = e.rounds.length || faced.length;
  const company = prettyCompany(e.companyName);
  const date = fmtInterviewDate(e.interviewedOn);

  return (
    <div className="pb-root ih-cb">
      <div className="pb-page ihx-page">
        <button className="ihx-back" onClick={() => nav(-1)}><i className="bi bi-arrow-left" aria-hidden="true" /> Back</button>
        <div className="ihx-head">
          <CompanyLogo name={company} size={60} />
          <div className="t">
            <h1>{company}</h1>
            <div className="sub">
              <span><i className="bi bi-briefcase" aria-hidden="true" /> {e.role || 'Role not given'}</span>
              <span><i className="bi bi-calendar3" aria-hidden="true" /> {date ? `Interviewed ${date}` : 'Date not given'}</span>
              <span><i className="bi bi-person-circle" aria-hidden="true" /> Shared by {e.by}</span>
            </div>
          </div>
          <OutcomePill o={e.outcome} />
        </div>

        <div className="ih-two">
          <div>
            {e.recording && <div className="ihx-panel"><RecordingPlayer id={e.id} contentType={e.recording.contentType} durationSec={e.recording.durationSec} /></div>}
            {e.tips && <div className="ih-callout tip"><h3>💡 Advice for the next candidate</h3><p>{e.tips}</p></div>}
            {e.eliminationSummary && <div className="ih-callout cut"><h3>✂️ Where people were eliminated</h3><p>{e.eliminationSummary}</p></div>}
            <h2 className="ihx-section-title">Rounds &amp; questions <small>{roundCount} round{roundCount === 1 ? '' : 's'} · {qCount} question{qCount === 1 ? '' : 's'}</small></h2>
            {e.rounds.length ? <RoundsTimeline rounds={e.rounds} /> : (
              <div className="ihx-panel">
                {faced.length ? <div className="pb-chips" style={{ marginBottom: e.review ? 10 : 0 }}>{faced.map((r, i) => <span key={i} className="pb-tag">{i + 1}. {r}</span>)}</div>
                  : <p style={{ margin: 0 }}>The candidate did not record the rounds or questions for this interview.</p>}
                {e.review && <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#33475B' }}>{e.review}</p>}
              </div>
            )}
            {e.transcript && (
              <div className="ihx-panel" style={{ marginTop: 12 }}>
                <button className="link" onClick={() => setShowTranscript(!showTranscript)}>
                  <i className={`bi bi-chevron-${showTranscript ? 'up' : 'down'}`} /> {showTranscript ? 'Hide' : 'Read'} the full transcript
                </button>
                {showTranscript && <p style={{ whiteSpace: 'pre-wrap', color: 'var(--pb-body)', lineHeight: 1.6 }}>{e.transcript}</p>}
              </div>
            )}
          </div>
          <aside>
            <div className="ihx-panel">
              <h3>At a glance</h3>
              <div className="ihx-kv"><span>Result</span><OutcomePill o={e.outcome} /></div>
              <div className="ihx-kv"><span>Rounds</span><b>{roundCount || '—'}</b></div>
              <div className="ihx-kv"><span>Questions</span><b>{qCount}</b></div>
              {e.difficultyFelt && <div className="ihx-kv"><span>Difficulty</span><DifficultyTag d={e.difficultyFelt} /></div>}
              {e.durationDays ? <div className="ihx-kv"><span>Process took</span><b>{e.durationDays} days</b></div> : null}
              <div className="ihx-kv"><span>Shared as</span><b><ModeIcon mode={e.captureMode} /> {MODE_LABEL[e.captureMode] || 'Written'}</b></div>
              <button className="ihx-btn primary" style={{ width: '100%', marginTop: 14, whiteSpace: 'normal', padding: '10px 14px' }} onClick={() => nav(`${base}/company/${e.companySlug}`)}>
                <i className="bi bi-buildings" aria-hidden="true" /> All {company} experiences
              </button>
            </div>
            <div className="ihx-panel">
              <h3>Interviewed recently?</h3>
              <p style={{ margin: '0 0 12px' }}>Your questions help the next batch walk in prepared.</p>
              <button className="ihx-btn" style={{ width: '100%' }} onClick={() => nav(`${base}/share`)}><i className="bi bi-mic" aria-hidden="true" /> Share yours</button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Detail;
