import React, { useEffect, useMemo, useRef, useState } from 'react';
import { aiMentorApi, MentorMessage } from '../../api/aiMentorApi';
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
  const rootRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<number>();

  useEffect(() => {
    aiMentorApi.getChat()
      .then(d => { setMessages(d.messages || []); setSuggestions(d.suggestions || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  /**
   * Fill the space that is actually there, measured, rather than calculated from 100vh.
   *
   * A viewport calculation needs to know the height of everything above this page, and that is
   * different in the two places it mounts and changes whenever either chrome does. It was also
   * simply wrong inside the member shell: the sidebar carries the daily-goal panel, so the shell
   * is TALLER than the viewport and the page scrolls — the thread was sized against one height
   * while sitting in another, which clipped a message at the bottom and left dead space under
   * the composer at the same time.
   *
   * The element's own distance from the top of the viewport answers both, wherever it is mounted.
   */
  useEffect(() => {
    const measure = () => {
      const el = rootRef.current;
      if (!el) return;
      // getBoundingClientRect().top is already relative to the viewport, which is exactly the
      // question being asked: how much room is left below this element on screen.
      const top = el.getBoundingClientRect().top;
      setFit(Math.max(430, Math.round(window.innerHeight - top - 26)));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

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
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: '⚠️ Sorry, I could not reply just now. Please try again.' }]);
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

  return (
    <div className="aim" ref={rootRef} style={fit ? { height: fit } : undefined}>
      <header className="aim-head">
        <span className="aim-mark"><i className="bi bi-compass" /></span>
        <div className="aim-head-t">
          <h1>AI Career Mentor</h1>
          <p>Coaches your coding and problem-solving with hints rather than answers, and your career — it knows your program, your goals and your weak areas.</p>
        </div>
        {started && (
          <button className="aim-clear" onClick={clear}><i className="bi bi-arrow-counterclockwise" /> Clear</button>
        )}
      </header>

      <div className="aim-thread" ref={scrollRef}>
        {loading ? (
          <div className="aim-load">Loading your conversation…</div>
        ) : !started ? (
          <div className="aim-empty">
            <span className="aim-empty-mark"><i className="bi bi-compass" /></span>
            <h2>Your personal coding and career coach</h2>
            <p>
              Stuck on a problem? I will coach you to think it through — hints and questions, never
              the answer — plus interview preparation, projects and career guidance.
            </p>
            <div className="aim-chips">
              {suggestions.map((s, i) => (
                <button key={i} className="aim-chip" onClick={() => send(s)}>
                  <i className="bi bi-stars" />{s}
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
  );
};

export default AIMentor;
