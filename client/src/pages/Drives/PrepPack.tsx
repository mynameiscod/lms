import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { interviewHubApi, PrepPack as Pack } from '../../api/interviewHubApi';
import { Modal } from '../ProblemBank/shared';
import { CompanyLogo, Flashcards, FlashItem, fmtDate } from '../InterviewHub/parts';
import '../ProblemBank/ProblemBank.css';
import '../InterviewHub/hub.css';

/**
 * A drive's prep pack: what this company asked the candidates before you, where they were cut,
 * what they advise — and ways to practise it. Opening it is what the institute's "opened before
 * the drive" number counts.
 */
const PrepPackPage: React.FC = () => {
  const { driveId = '' } = useParams();
  const nav = useNavigate();
  const [p, setP] = useState<Pack | null>(null);
  const [err, setErr] = useState('');
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () => interviewHubApi.prep(driveId).then((x) => { if (alive) setP(x); return x; });
    load().then((x) => {
      interviewHubApi.prepOpened(driveId).catch(() => undefined);
      // Predicted questions are generated in the background the first time; pick them up.
      if (x.preparingPredicted) setTimeout(() => { load().catch(() => undefined); }, 20000);
    }).catch((e) => setErr(e?.response?.data?.message || 'Could not open the prep pack.'));
    return () => { alive = false; };
  }, [driveId]);

  const cards: FlashItem[] = useMemo(() => !p ? [] : [
    ...p.mostAsked.map((q) => ({ q: q.text, tag: q.round, note: q.count > 1 ? `asked ${q.count}×` : 'reported' })),
    ...p.bankQuestions.map((q) => ({ q: q.text, a: q.answer, tag: q.round })),
    ...p.predicted.map((q) => ({ q: q.text, a: q.answer, tag: 'Predicted' })),
  ], [p]);

  if (err) return <div className="pb-root"><div className="pb-page"><div className="pb-alert pb-alert-bad">{err}</div><button className="pb-btn" onClick={() => nav('/drives')}>Back to Drives</button></div></div>;
  if (!p) return <div className="pb-root"><div className="pb-page pb-muted"><span className="pb-spinner" /> Opening your prep pack…</div></div>;
  const d = p.drive;
  const nothing = !p.mostAsked.length && !p.bankQuestions.length && !p.predicted.length;

  return (
    <div className="pb-root">
      <div className="pb-page" style={{ maxWidth: 1180 }}>
        <button className="pb-btn pb-btn-ghost pb-btn-sm" style={{ marginBottom: 10 }} onClick={() => nav('/drives?tab=applications')}><i className="fa-solid fa-arrow-left" /> My applications</button>
        <div className="ih-pack-hero">
          <CompanyLogo name={d.companyName} size={56} />
          <div className="pb-grow">
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.06em', color: '#c7d2fe' }}>PREP PACK</div>
            <h1>{d.companyName}{d.role ? ` — ${d.role}` : ''}</h1>
            <div className="sub">{d.driveDate ? <>Drive on <b>{fmtDate(d.driveDate)}</b>{d.location ? ` · ${d.location}` : ''}</> : 'Drive date to be announced'}</div>
          </div>
          <div className="count"><b>{p.reports}</b><span>candidate reports</span></div>
          <div className="count"><b>{cards.length}</b><span>questions to practise</span></div>
        </div>

        <div className="pb-row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <button className="pb-btn pb-btn-primary" disabled={!cards.length} onClick={() => setFlash(true)}><i className="fa-solid fa-layer-group" /> Practise with flashcards</button>
          {p.codingSetId && <button className="pb-btn" onClick={() => nav(`/coding-practice/${p.codingSetId}`)}><i className="fa-solid fa-code" /> Coding practice set</button>}
          <button className="pb-btn" onClick={() => nav(`/interview-experiences/company/${d.companySlug}`)}><i className="fa-regular fa-comments" /> All {d.companyName} experiences</button>
        </div>

        <div className="ih-two">
          <div>
            {(!!p.roundPattern.length || !!d.rounds.length) && (
              <div className="pb-card" style={{ padding: 16, marginBottom: 12 }}>
                <h3>What to expect</h3>
                {!!d.rounds.length && (
                  <div style={{ marginBottom: 10 }}>
                    <div className="pb-faint" style={{ fontSize: 12, marginBottom: 6 }}>Announced for this drive</div>
                    <div className="ih-flow">{d.rounds.map((r, i) => (
                      <React.Fragment key={i}>{i > 0 && <i className="fa-solid fa-chevron-right" />}<span className="step">{r.name}{r.date ? <small>{fmtDate(r.date)}</small> : null}</span></React.Fragment>
                    ))}</div>
                  </div>
                )}
                {!!p.roundPattern.length && (
                  <div>
                    <div className="pb-faint" style={{ fontSize: 12, marginBottom: 6 }}>What earlier candidates faced</div>
                    <div className="ih-flow">{p.roundPattern.map((r, i) => (
                      <React.Fragment key={r.key}>{i > 0 && <i className="fa-solid fa-chevron-right" />}<span className="step">{r.name}<small>{r.seenIn}/{p.reports}</small></span></React.Fragment>
                    ))}</div>
                  </div>
                )}
              </div>
            )}

            {!!p.mostAsked.length && (
              <div className="pb-card" style={{ marginBottom: 12 }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--pb-line)' }}><h3 style={{ margin: 0 }}>Most-asked questions</h3><div className="pb-faint" style={{ fontSize: 12 }}>Reported by real candidates — prepare the top ones first.</div></div>
                {p.mostAsked.map((q, i) => (
                  <div key={i} className={`ih-asked ${q.count >= 3 ? 'hot' : ''}`}>
                    <div className="cnt">{q.count}×<small>asked</small></div>
                    <div className="pb-grow"><div style={{ whiteSpace: 'pre-wrap' }}>{q.text}</div>
                      <div className="pb-row" style={{ marginTop: 4, gap: 6 }}><span className="pb-tag">{q.round}</span><span className="pb-faint" style={{ fontSize: 12 }}>last asked {fmtDate(q.lastAsked)}</span></div></div>
                  </div>
                ))}
              </div>
            )}

            {!!p.bankQuestions.length && (
              <div className="pb-card" style={{ marginBottom: 12 }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--pb-line)' }}><h3 style={{ margin: 0 }}>From the {d.companyName} question bank</h3></div>
                {p.bankQuestions.map((q, i) => (
                  <details key={i} className="ih-asked" style={{ display: 'block' }}>
                    <summary style={{ cursor: 'pointer' }}>{q.text}</summary>
                    {q.answer && <div className="ih-hint">{q.answer}</div>}
                  </details>
                ))}
              </div>
            )}

            {!!p.predicted.length && (
              <div style={{ marginBottom: 12 }}>
                <div className="ih-predicted"><b>AI-predicted questions — not reported by any candidate.</b> Nobody has shared a {d.companyName} interview yet, so these are likely questions for a role like this, to help you start. Be the first to share after your interview.</div>
                <div className="pb-card">
                  {p.predicted.map((q, i) => (
                    <details key={i} className="ih-asked" style={{ display: 'block' }}>
                      <summary style={{ cursor: 'pointer' }}>{q.text}</summary>
                      {q.answer && <div className="ih-hint">{q.answer}</div>}
                    </details>
                  ))}
                </div>
              </div>
            )}

            {nothing && (
              <div className="pb-card pb-empty">
                {p.preparingPredicted ? <><span className="pb-spinner" /><h2 style={{ marginTop: 10 }}>Preparing likely questions…</h2><p className="pb-muted">Nobody has reported a {d.companyName} interview yet. We are putting together likely questions — this takes about 20 seconds.</p></>
                  : <><h2>No questions for {d.companyName} yet</h2><p className="pb-muted">You will be among the first to face them. After your interview, share what you were asked.</p></>}
              </div>
            )}
          </div>

          <aside>
            {!!p.voices.length && (
              <div className="pb-card" style={{ padding: 16, marginBottom: 12 }}>
                <h3>From recent candidates</h3>
                {p.voices.slice(0, 5).map((v, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    {v.tips && <div className="ih-voice">💡 {v.tips}</div>}
                    {v.eliminated && <div className="ih-voice" style={{ borderLeftColor: 'var(--pb-bad)' }}>✂️ {v.eliminated}</div>}
                    <div className="pb-faint" style={{ fontSize: 11.5 }}>{v.role || 'Candidate'} · {fmtDate(v.interviewedOn)}</div>
                  </div>
                ))}
              </div>
            )}
            {d.description && <div className="pb-card" style={{ padding: 16, marginBottom: 12 }}><h3>About the drive</h3><p className="pb-muted" style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 13.5 }}>{d.description}</p></div>}
            <div className="pb-card" style={{ padding: 16 }}>
              <h3>After your interview</h3>
              <p className="pb-muted" style={{ margin: '0 0 10px', fontSize: 13 }}>This pack exists because students before you shared. Return the favour — a 5-minute voice note is enough.</p>
              <button className="pb-btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => nav(`/interview-experiences/share?company=${encodeURIComponent(d.companyName)}`)}><i className="fa-solid fa-microphone-lines" /> Share how it went</button>
            </div>
          </aside>
        </div>
      </div>
      {flash && (
        <Modal wide title={`${d.companyName} — flashcards`} onClose={() => setFlash(false)}>
          <Flashcards deckKey={`drive:${d.id}`} items={cards} onClose={() => setFlash(false)} />
        </Modal>
      )}
    </div>
  );
};

export default PrepPackPage;
