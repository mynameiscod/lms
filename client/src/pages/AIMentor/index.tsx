import React, { useEffect, useMemo, useRef, useState } from 'react';
import { aiMentorApi, MentorMessage } from '../../api/aiMentorApi';
import { useFillViewport } from '../../hooks/useFillViewport';
import './aiMentor.css';

/**
 * Renders the mentor's reply: fenced code blocks, `inline code`, **bold**, bullets, headings.
 *
 * Kept dependency-free, as it was — but code blocks are new, and they are the reason this is
 * worth doing at all. This mentor coaches coding, so it answers with code; rendered as running
 * prose, the indentation was lost, which for a first-year is most of the information. A fence is
 * pulled out first so nothing inside it is treated as markup, and the rest is formatted around it.
 */
function renderContent(text: string): React.ReactNode {
  const out: React.ReactNode[] = [];
  const fence = /```([a-zA-Z0-9+#]*)\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = fence.exec(text))) {
    if (m.index > last) out.push(...prose(text.slice(last, m.index), out.length));
    out.push(<pre key={`c${out.length}`}><code>{m[2].replace(/\n$/, '')}</code></pre>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(...prose(text.slice(last), out.length));
  return out;
}

/** Everything that is not a code block. */
function prose(text: string, seed: number): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let bullets: React.ReactNode[] = [];
  let ordered = false;

  const flush = () => {
    if (!bullets.length) return;
    const L = ordered ? 'ol' : 'ul';
    out.push(<L key={`l${seed}-${out.length}`}>{bullets}</L>);
    bullets = [];
  };

  for (const raw of text.split('\n')) {
    const t = raw.trim();
    if (!t) { flush(); continue; }

    const num = /^(\d+)[.)]\s+(.*)$/.exec(t);
    const bul = /^[-*•]\s+(.*)$/.exec(t);
    if (num || bul) {
      const nextOrdered = !!num;
      if (bullets.length && nextOrdered !== ordered) flush();
      ordered = nextOrdered;
      bullets.push(<li key={`i${seed}-${bullets.length}`}>{inline((num ? num[2] : bul![1]))}</li>);
      continue;
    }

    flush();
    const head = /^#{1,6}\s+(.*)$/.exec(t);
    if (head) { out.push(<h4 key={`h${seed}-${out.length}`}>{inline(head[1])}</h4>); continue; }
    out.push(<p key={`p${seed}-${out.length}`}>{inline(t)}</p>);
  }
  flush();
  return out;
}

/** **bold** and `code`, in one pass so a bold run containing code still splits correctly. */
function inline(s: string): React.ReactNode {
  return s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) return <code key={i}>{part.slice(1, -1)}</code>;
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

const AIMentor: React.FC = () => {
  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const { ref: rootRef, height: fit } = useFillViewport<HTMLDivElement>();

  useEffect(() => {
    aiMentorApi.getChat()
      .then(d => { setMessages(d.messages || []); setSuggestions(d.suggestions || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  /** Grow with the question. A one-line input made anybody with a real problem write blind. */
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [input]);

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || sending) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', content: msg }]);
    setSending(true);
    try {
      const d = await aiMentorApi.send(msg);
      setMessages(d.messages || []);
    } catch (e: any) {
      // Say what is actually wrong. "Try again" is the wrong advice when retrying cannot help — an AI provider that has
      // not been set up fails every time, and only an admin can fix that.
      const why = String(e?.response?.data?.message || '');
      const content = /no ai provider|not configured|api key/i.test(why)
        ? '⚠️ The AI mentor is not switched on yet — no AI provider has been set up for your institute. Please ask your admin to add an Anthropic or OpenAI key in Platform Settings.'
        : '⚠️ Sorry, I could not reply just now. Please try again in a moment.';
      setMessages(m => [...m, { role: 'assistant', content }]);
    } finally { setSending(false); }
  };

  const clear = async () => {
    if (!window.confirm('Clear this conversation?')) return;
    await aiMentorApi.clear();
    setMessages([]);
  };

  /** Enter sends; Shift+Enter is a new line — the convention every chat the member already uses. */
  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const started = messages.length > 0;
  const quick = useMemo(() => suggestions.slice(0, 4), [suggestions]);

  /* Starter topics carry an icon so the grid reads at a glance; the text is the server's own suggestion. */
  const STARTER_ICON = ['bi-bug', 'bi-signpost-split', 'bi-puzzle', 'bi-bullseye', 'bi-briefcase', 'bi-lightbulb'];

  /**
   * A chat app, not a page with a chat on it: the mentor lives in a navy side panel (who it is, what it does, where to
   * start), and the conversation owns the rest of the space with the composer docked under it.
   */
  return (
    <div className="aim aim2" ref={rootRef} style={fit ? { height: fit } : undefined}>
      <aside className="aim2-side">
        <div className="aim2-me">
          <span className="aim2-avatar"><i className="bi bi-compass" /><em aria-hidden="true" /></span>
          <div><b>AI Career Mentor</b><span><i className="bi bi-circle-fill" /> Online · replies in seconds</span></div>
        </div>
        <p className="aim2-intro">Coaches your coding and problem-solving with hints, not answers — and your career. It knows your program, your goals and your weak areas.</p>
        <ul className="aim2-can">
          <li><i className="bi bi-lightbulb" /> Hints when you are stuck</li>
          <li><i className="bi bi-signpost-split" /> Plan before you code</li>
          <li><i className="bi bi-mic" /> Interview preparation</li>
          <li><i className="bi bi-briefcase" /> Projects and career advice</li>
        </ul>
        {/* Before the first message the same starters fill the conversation as a grid; here they would repeat it. */}
        {started && !!suggestions.length && (
          <div className="aim2-starters">
            <small>Try asking</small>
            {suggestions.slice(0, 4).map((s, i) => (
              <button key={i} type="button" onClick={() => send(s)} disabled={sending}>
                <i className={`bi ${STARTER_ICON[i % STARTER_ICON.length]}`} /> <span>{s}</span>
              </button>
            ))}
          </div>
        )}
        {started && (
          <button className="aim2-clear" onClick={clear}><i className="bi bi-arrow-counterclockwise" /> New conversation</button>
        )}
      </aside>

      <section className="aim2-chat">
        <header className="aim2-chat-head">
          <div><b>{started ? 'Your conversation' : 'Start a conversation'}</b><span>Hints and questions — never just the answer</span></div>
          {started && <span className="aim2-count">{messages.length} message{messages.length === 1 ? '' : 's'}</span>}
        </header>

        <div className="aim-thread aim2-thread" ref={scrollRef}>
          {loading ? (
            <div className="aim-load">Loading your conversation…</div>
          ) : !started ? (
            <div className="aim2-empty">
              <span className="aim2-empty-mark"><i className="bi bi-chat-square-heart" /></span>
              <h2>What shall we work on today?</h2>
              <p>Stuck on a problem? I will coach you to think it through — plus interview preparation, projects and career guidance.</p>
              <div className="aim2-grid">
                {suggestions.map((s, i) => (
                  <button key={i} className="aim2-topic" onClick={() => send(s)}>
                    <span className="ic"><i className={`bi ${STARTER_ICON[i % STARTER_ICON.length]}`} /></span>
                    <span className="tx">{s}</span>
                    <i className="bi bi-arrow-up-right go" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((m, i) => (
                <div key={i} className={`aim-row ${m.role === 'user' ? 'me' : 'bot'}`}>
                  <span className={`aim-av ${m.role === 'user' ? 'me' : 'bot'}`}>
                    {m.role === 'user' ? <i className="bi bi-person-fill" /> : <i className="bi bi-compass" />}
                  </span>
                  <div className="aim-bubble">
                    {m.role === 'user' ? m.content : renderContent(m.content)}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="aim-row bot">
                  <span className="aim-av bot"><i className="bi bi-compass" /></span>
                  <div className="aim-bubble">
                    <span className="aim-typing"><i /><i /><i /></span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="aim2-dock">
          {started && !!quick.length && (
            <div className="aim-quick">
              {quick.map((s, i) => (
                <button key={i} className="aim-chip" onClick={() => send(s)} disabled={sending}>{s}</button>
              ))}
            </div>
          )}
          <form className="aim-composer" onSubmit={e => { e.preventDefault(); send(input); }}>
            <textarea
              ref={boxRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask your mentor anything…"
              disabled={sending}
            />
            <button className="aim-send" type="submit" disabled={sending || !input.trim()} aria-label="Send">
              <i className="bi bi-send-fill" />
            </button>
          </form>
          <p className="aim-hint">Enter to send · Shift + Enter for a new line</p>
        </div>
      </section>
    </div>
  );
};

export default AIMentor;
