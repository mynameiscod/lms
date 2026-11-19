import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { whatsAppChatApi, ThreadContext, chatErr } from '../../api/whatsAppChatApi';
import { useWaLive } from '../../components/WhatsAppChat/useWaLive';

/**
 * The right-hand panel next to a conversation: who this person is in the CRM, who their
 * counsellor is, every answer an automation collected, and what (if anything) is talking to
 * them automatically right now. Plus a legend for the message labels.
 */

const date = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }) : '—');
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '—');
const norm = (p: string) => { const d = String(p || '').replace(/\D/g, ''); return d.length === 10 ? `91${d}` : d; };

const RUN_LOOK: Record<string, { cls: string; label: string }> = {
  running: { cls: 'live', label: 'Running' },
  waiting: { cls: 'live', label: 'Running' },
  completed: { cls: 'done', label: 'Finished' },
  stopped: { cls: 'stop', label: 'Stopped' },
  failed: { cls: 'fail', label: 'Failed' },
};

const ContextPanel: React.FC<{ phone: string; onClose?: () => void }> = ({ phone, onClose }) => {
  const [ctx, setCtx] = useState<ThreadContext | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => {
    whatsAppChatApi.context(phone).then((c) => { setCtx(c); setErr(''); }).catch((e) => setErr(chatErr(e)));
  }, [phone]);
  useEffect(() => { setCtx(null); load(); }, [load]);
  const me = norm(phone);
  useWaLive((ev) => { if (ev.phone === me && ev.reason !== 'read') load(); });

  if (err) return <aside className="wai-ctx"><div className="wai-err">{err}</div></aside>;
  if (!ctx) return <aside className="wai-ctx"><div className="wai-ctx-empty">Loading details…</div></aside>;
  const { lead, automation } = ctx;
  const liveRuns = automation.workflows.filter((w) => w.status === 'running' || w.status === 'waiting');
  const pastRuns = automation.workflows.filter((w) => !(w.status === 'running' || w.status === 'waiting')).slice(0, 3);

  return (
    <aside className="wai-ctx" aria-label="Details">
      <div className="wai-ctx-top">
        <b>Details</b>
        {onClose && <button type="button" className="wai-icon-btn" onClick={onClose} aria-label="Hide details"><i className="bi bi-x-lg" /></button>}
      </div>

      <section className="wai-card">
        <h3><i className="bi bi-person-badge" /> Counsellor</h3>
        {ctx.owner ? (
          <p className="wai-big">{ctx.owner.name}</p>
        ) : <p className="wai-big none">Nobody yet</p>}
        <p className="wai-hint">
          {ctx.owner?.from === 'lead' ? "Same person as the lead's counsellor in CRM. Change it here or on the lead, and both change."
            : lead ? 'This lead has no counsellor. The first person to reply becomes it, or pick one above the chat.'
              : 'Not a lead. Whoever replies first owns the chat.'}
        </p>
      </section>

      <section className="wai-card">
        <h3><i className="bi bi-person-lines-fill" /> In CRM</h3>
        {lead ? (
          <>
            <dl className="wai-dl">
              <dt>Lead</dt><dd><Link to={`/leads/${lead._id}`}>{lead.name || 'Open lead'} <i className="bi bi-box-arrow-up-right" /></Link></dd>
              <dt>Stage</dt><dd>{lead.stage ? <span className="wai-stage" style={{ ['--c' as any]: lead.stage.color || '#64748b' }}>{lead.stage.name}</span> : '—'}{lead.subStage && <small> · {lead.subStage}</small>}</dd>
              <dt>Source</dt><dd>{cap(lead.source)}</dd>
              <dt>Priority</dt><dd>{lead.priority ? <span className={`wai-prio ${lead.priority}`}>{cap(lead.priority)}</span> : '—'}{lead.score != null && <small> · score {lead.score}</small>}</dd>
              {lead.courses.length > 0 && <><dt>Course</dt><dd>{lead.courses.join(', ')}</dd></>}
              <dt>Next follow-up</dt><dd>{date(lead.nextFollowUp)}</dd>
              <dt>Last contacted</dt><dd>{date(lead.lastContactedAt)}{lead.lastCallOutcome && <small> · {cap(lead.lastCallOutcome)}</small>}</dd>
              <dt>Lead since</dt><dd>{date(lead.createdAt)}</dd>
              {lead.savedOnLead.map((f) => <React.Fragment key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></React.Fragment>)}
            </dl>
          </>
        ) : <p className="wai-hint">This number is not a lead in CRM.</p>}
        {ctx.placement && <p className="wai-hint"><Link to={`/admin/placement-program?open=${ctx.placement._id}`}>Placement record: {ctx.placement.name || 'open'}</Link></p>}
        {ctx.student && <p className="wai-hint">LMS student: <b>{ctx.student.name}</b></p>}
      </section>

      <section className="wai-card">
        <h3><i className="bi bi-list-check" /> Answers they gave</h3>
        {ctx.answers.length ? (
          <ul className="wai-answers">
            {ctx.answers.map((a, i) => (
              <li key={i}><span>{a.question}</span><b>{a.answer}</b><small>{a.from}</small></li>
            ))}
          </ul>
        ) : <p className="wai-hint">No answers collected by a workflow or the bot yet.</p>}
      </section>

      <section className="wai-card">
        <h3><i className="bi bi-lightning-charge" /> Automation</h3>
        {!liveRuns.length && !automation.bot?.live && <p className="wai-ok"><i className="bi bi-check-circle" /> Nothing automatic is talking to them now. Replies are up to the team.</p>}
        {liveRuns.map((w, i) => (
          <div key={`l${i}`} className="wai-run">
            <span className={`wai-run-dot ${RUN_LOOK[w.status]?.cls}`} />
            <div><Link to={`/workflows/${w.workflowId}`}>{w.name}</Link><small>{w.note || RUN_LOOK[w.status]?.label}</small></div>
          </div>
        ))}
        {automation.bot && (
          <div className="wai-run">
            <span className={`wai-run-dot ${automation.bot.live ? 'live' : automation.bot.step === 'qualified' ? 'done' : 'stop'}`} />
            <div>
              <b>Old bot</b>
              <small>
                {automation.bot.step === 'qualified' ? `Finished all ${automation.bot.total} questions`
                  : automation.bot.paused ? `Off for this chat · stopped at question ${automation.bot.asked} of ${automation.bot.total}`
                    : automation.bot.live ? `Asking questions · ${automation.bot.asked} of ${automation.bot.total}`
                      : `Gave up waiting · ${automation.bot.asked} of ${automation.bot.total} asked`}
              </small>
            </div>
          </div>
        )}
        {pastRuns.length > 0 && <div className="wai-sub">Earlier</div>}
        {pastRuns.map((w, i) => (
          <div key={`p${i}`} className="wai-run past">
            <span className={`wai-run-dot ${RUN_LOOK[w.status]?.cls}`} />
            <div><Link to={`/workflows/${w.workflowId}`}>{w.name}</Link><small>{RUN_LOOK[w.status]?.label}{w.note ? ` · ${w.note}` : ''} · {date(w.at)}</small></div>
          </div>
        ))}
        <p className="wai-hint">When someone on the team replies, welcome or question workflows and the old bot stop for this chat. Demo reminders keep going.</p>
      </section>

      <section className="wai-card">
        <h3><i className="bi bi-tags" /> Message labels</h3>
        <ul className="wai-legend">
          <li><span className="wac-tag team"><i className="bi bi-person-fill" /> Name</span> typed by someone on your team</li>
          <li><span className="wac-tag flow"><i className="bi bi-lightning-charge-fill" /> Workflow</span> sent by an automation you built</li>
          <li><span className="wac-tag bot"><i className="bi bi-robot" /> Old bot</span> the old qualification bot</li>
          <li><span className="wac-tag cast"><i className="bi bi-megaphone-fill" /> Broadcast</span> Send-to-many</li>
          <li><span className="wac-tag auto"><i className="bi bi-gear-fill" /> Automatic</span> OTPs and system messages</li>
          <li><span className="wai-legend-in">White, on the left</span> written by the person</li>
        </ul>
      </section>
    </aside>
  );
};

export default ContextPanel;
