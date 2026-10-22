import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import supportApi, { ChatReply, ChatSource, errorText, moduleLabel, categoryLabel } from '../../api/supportApi';
import './support.css';

/**
 * The support assistant. It answers from published help articles only (the server enforces
 * this); every answer shows where it came from and is labelled general guidance, because the
 * assistant cannot see the member's account.
 *
 * When it cannot help, it offers a ticket DRAFT. Nothing is raised until the member presses
 * Submit, and a ticket number is shown only once the server has returned one.
 */
interface Msg {
  role: 'user' | 'assistant';
  content: string;
  steps?: string[];
  sources?: ChatSource[];
  fallback?: boolean;
  clarifying?: boolean;
  turnIndex?: number;
  helpful?: boolean | null;
  failed?: boolean;
}

const KEY = 'sp-chat-session';
const store = {
  get: () => { try { return sessionStorage.getItem(KEY) || ''; } catch { return ''; } },
  set: (v: string) => { try { if (v) sessionStorage.setItem(KEY, v); else sessionStorage.removeItem(KEY); } catch { /* storage unavailable */ } },
};

const SupportChat: React.FC<{ basePath: string }> = ({ basePath }) => {
  const nav = useNavigate();
  const loc = useLocation();
  const initial = (loc.state as any)?.question as string | undefined;
  const [sessionId, setSessionId] = useState(store.get());
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [draft, setDraft] = useState<ChatReply['draft'] | null>(null);
  const [handoff, setHandoff] = useState(false);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState('');
  const [lastFailed, setLastFailed] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const asked = useRef(false);

  useEffect(() => { supportApi.chatSuggestions().then(setSuggested).catch(() => setSuggested([])); }, []);

  // Resume this tab's conversation, if there is one.
  useEffect(() => {
    if (!sessionId) return;
    supportApi.chatSession(sessionId).then(s => {
      if (s.status === 'closed') { store.set(''); setSessionId(''); return; }
      setMsgs(s.turns.map(t => ({ role: t.role, content: t.content, steps: t.steps, sources: t.sources, fallback: t.fallback, turnIndex: t.index, helpful: t.helpful })));
    }).catch(() => { store.set(''); setSessionId(''); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs, typing, draft]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || typing) return;
    setInput(''); setLastFailed('');
    setMsgs(m => [...m.filter(x => !x.failed), { role: 'user', content: q }]);
    setTyping(true);
    try {
      const r = await supportApi.chatAsk(q, sessionId || undefined);
      if (r.sessionId !== sessionId) { setSessionId(r.sessionId); store.set(r.sessionId); }
      setMsgs(m => [...m, { role: 'assistant', content: r.content, steps: r.steps, sources: r.sources, fallback: r.fallback, clarifying: r.clarifying, turnIndex: r.turnIndex, helpful: null }]);
      if (r.offerTicket && r.draft) { setDraft(r.draft); setHandoff(r.handoff); }
    } catch (e: any) {
      setLastFailed(q);
      setMsgs(m => [...m, { role: 'assistant', content: errorText(e, 'The assistant is not available right now.'), failed: true }]);
    }
    setTyping(false);
  };

  // A question carried over from search starts the conversation.
  useEffect(() => { if (initial && !asked.current) { asked.current = true; send(initial); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rate = async (m: Msg, helpful: boolean) => {
    if (m.turnIndex === undefined || !sessionId) return;
    setMsgs(list => list.map(x => (x === m ? { ...x, helpful } : x)));
    try { await supportApi.chatFeedback(sessionId, m.turnIndex, helpful); }
    catch { setMsgs(list => list.map(x => (x.turnIndex === m.turnIndex ? { ...x, helpful: null } : x))); }
    if (!helpful && !draft) {
      // An unhelpful answer is a reason to offer a person.
      const firstAsk = msgs.find(x => x.role === 'user')?.content || 'Help request';
      setDraft({ subject: firstAsk.slice(0, 90), module: 'other', category: 'technical', summary: msgs.filter(x => x.role === 'user').slice(-4).map(x => `• ${x.content}`).join('\n') });
    }
  };

  const newConversation = async () => {
    if (sessionId) supportApi.chatClose(sessionId).catch(() => undefined);
    store.set(''); setSessionId(''); setMsgs([]); setDraft(null); setHandoff(false); setConsent(false); setSubmitErr(''); setLastFailed('');
  };

  const submitTicket = async () => {
    if (!draft) return;
    setSubmitting(true); setSubmitErr('');
    try {
      const r = await supportApi.create({
        subject: draft.subject.length >= 3 ? draft.subject : `Help request: ${draft.subject}`,
        description: `From my conversation with the assistant:\n${draft.summary}`,
        module: draft.module, category: draft.category, route: `${basePath}/assistant`,
        diagnosticsConsent: consent, diagnostics: consent ? `Screen: ${window.screen.width}×${window.screen.height}; language ${navigator.language}` : undefined,
        chatSessionId: sessionId || undefined,
      });
      store.set('');
      nav(`${basePath}/tickets/${r.ticket.id}`, { state: { justRaised: r.ticket.ticketNumber, duplicate: r.duplicate } });
    } catch (e) {
      setSubmitErr(errorText(e, 'The ticket could not be sent. Nothing was raised — please try again.'));
      setSubmitting(false);
    }
  };

  const editTicket = () => draft && nav(`${basePath}/new`, { state: { draft: { ...draft, description: `From my conversation with the assistant:\n${draft.summary}`, chatSessionId: sessionId || undefined } } });

  return (
    <div className="sp sp-chat">
      <div className="sp-head">
        <div>
          <button type="button" className="sp-back" onClick={() => nav(basePath)}><i className="bi bi-arrow-left" aria-hidden /> Help &amp; Support</button>
          <h1>Ask the AI assistant</h1>
          <p className="sp-sub" style={{ marginBottom: 0 }}>Answers come from our help articles. The assistant cannot see your account.</p>
        </div>
        <div className="sp-actions">
          <button type="button" className="sp-btn sp-btn-ghost" onClick={() => nav(`${basePath}/new`)}><i className="bi bi-person-raised-hand" aria-hidden /> Talk to support</button>
          {msgs.length > 0 && <button type="button" className="sp-btn sp-btn-ghost" onClick={newConversation}><i className="bi bi-arrow-counterclockwise" aria-hidden /> New conversation</button>}
        </div>
      </div>

      <div className="sp-card sp-chat-log" role="log" aria-live="polite" aria-label="Conversation with the assistant">
        {msgs.length === 0 && !typing && (
          <div className="sp-chat-empty">
            <i className="bi bi-stars" aria-hidden />
            <p>Ask a question in your own words.</p>
            {suggested.length > 0 && (
              <div className="sp-filters" style={{ justifyContent: 'center' }}>
                {suggested.map(s => <button key={s} type="button" className="sp-chip" onClick={() => send(s)}>{s}</button>)}
              </div>
            )}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`sp-bubble sp-bubble-${m.role}${m.failed ? ' sp-bubble-failed' : ''}`}>
            {m.role === 'assistant' && !m.failed && !m.fallback && !m.clarifying && <span className="sp-general">General guidance from help articles</span>}
            <div className="sp-msg-body">{m.content}</div>
            {m.steps && m.steps.length > 0 && <ol className="sp-steps">{m.steps.map((s, j) => <li key={j}>{s}</li>)}</ol>}
            {m.sources && m.sources.length > 0 && (
              <div className="sp-files" aria-label="Sources">
                {m.sources.map(s => (
                  <button key={s.id} type="button" className="sp-file" onClick={() => nav(`${basePath}/articles/${s.id}`)}><i className="bi bi-file-text" aria-hidden /> {s.title}</button>
                ))}
              </div>
            )}
            {m.failed && lastFailed && <button type="button" className="sp-btn sp-btn-ghost" style={{ marginTop: 8 }} onClick={() => send(lastFailed)}><i className="bi bi-arrow-clockwise" aria-hidden /> Retry</button>}
            {m.role === 'assistant' && !m.failed && m.turnIndex !== undefined && (
              <div className="sp-rate" role="group" aria-label="Was this answer helpful?">
                <button type="button" aria-pressed={m.helpful === true} className={m.helpful === true ? 'on' : ''} onClick={() => rate(m, true)} aria-label="Helpful"><i className="bi bi-hand-thumbs-up" aria-hidden /></button>
                <button type="button" aria-pressed={m.helpful === false} className={m.helpful === false ? 'on' : ''} onClick={() => rate(m, false)} aria-label="Not helpful"><i className="bi bi-hand-thumbs-down" aria-hidden /></button>
              </div>
            )}
          </div>
        ))}
        {typing && <div className="sp-bubble sp-bubble-assistant sp-typing" aria-label="The assistant is typing"><span /><span /><span /></div>}

        {draft && (
          <div className="sp-card sp-draft" aria-labelledby="sp-draft-title">
            <h3 id="sp-draft-title"><i className="bi bi-ticket-detailed" aria-hidden /> {handoff ? 'This needs our support team' : 'Raise a support ticket?'}</h3>
            <p className="sp-hint">Check the draft. Nothing is sent until you press Submit.</p>
            <dl className="sp-kv">
              <dt>Subject</dt><dd>{draft.subject}</dd>
              <dt>Area</dt><dd>{moduleLabel(draft.module)}</dd>
              <dt>Type</dt><dd>{categoryLabel(draft.category)}</dd>
              <dt>Source</dt><dd>AI assistant conversation</dd>
              <dt>Chat summary</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{draft.summary}</dd>
            </dl>
            <label className="sp-check" style={{ marginTop: 10 }}>
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
              <span><b>Share device details</b><span className="sp-hint" style={{ display: 'block' }}>Screen size, language and browser version, to help us investigate.</span></span>
            </label>
            {submitErr && <p className="sp-err" role="alert" style={{ marginTop: 10 }}>{submitErr}</p>}
            <div className="sp-actions" style={{ marginTop: 10 }}>
              <button type="button" className="sp-btn sp-btn-primary" disabled={submitting} onClick={submitTicket}>{submitting ? 'Sending…' : 'Submit ticket'}</button>
              <button type="button" className="sp-btn sp-btn-ghost" disabled={submitting} onClick={editTicket}>Edit</button>
              <button type="button" className="sp-btn sp-btn-ghost" disabled={submitting} onClick={() => setDraft(null)}>Not now</button>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form className="sp-chat-input" onSubmit={e => { e.preventDefault(); send(input); }}>
        <label className="sp-sr" htmlFor="sp-chat-q">Your question</label>
        <textarea id="sp-chat-q" className="sp-textarea" rows={2} maxLength={2000} value={input} disabled={typing}
          placeholder="Type your question. Never share passwords or codes."
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }} />
        <button type="submit" className="sp-btn sp-btn-primary" disabled={typing || !input.trim()} aria-label="Send"><i className="bi bi-send" aria-hidden /></button>
      </form>
    </div>
  );
};

export default SupportChat;
