import React, { useEffect, useRef, useState } from 'react';
import { aiMentorApi, MentorMessage } from '../../api/aiMentorApi';

const PURPLE = '#6366f1';

// Minimal, dependency-free markdown-ish rendering: **bold**, bullet lines, paragraphs.
function renderContent(text: string): React.ReactNode {
  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) {
      out.push(<ul key={`u${out.length}`} style={{ margin: '4px 0 8px', paddingLeft: 20 }}>{bullets.map((b, i) => <li key={i} style={{ marginBottom: 3 }}>{inline(b)}</li>)}</ul>);
      bullets = [];
    }
  };
  const inline = (s: string): React.ReactNode =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>);
  lines.forEach((ln, idx) => {
    const t = ln.trim();
    if (/^[-*•]\s+/.test(t)) { bullets.push(t.replace(/^[-*•]\s+/, '')); return; }
    flush();
    if (t) out.push(<p key={`p${idx}`} style={{ margin: '0 0 8px' }}>{inline(t)}</p>);
  });
  flush();
  return out;
}

const AIMentor: React.FC = () => {
  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    aiMentorApi.getChat()
      .then(d => { setMessages(d.messages || []); setSuggestions(d.suggestions || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

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

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: 20, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 26 }}>🧭</span>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 22, color: '#0f172a' }}>AI Career Mentor</h1>
          <div style={{ fontSize: 12.5, color: '#64748b' }}>Knows your goals, scores and skill gaps — ask anything about your career.</div>
        </div>
        {messages.length > 0 && <button onClick={clear} style={{ background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', fontSize: 12.5, color: '#64748b', cursor: 'pointer' }}>Clear</button>}
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, margin: '12px 0' }}>
        {loading ? (
          <div style={{ color: '#94a3b8', fontSize: 14 }}>Loading…</div>
        ) : messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🧭</div>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 16 }}>Your personal career mentor</div>
            <div style={{ fontSize: 13.5, maxWidth: 420, marginTop: 6 }}>Ask about what to study next, interview prep, projects, your resume, or job strategy. Try one of these:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 16, maxWidth: 560 }}>
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => send(s)} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 999, padding: '8px 14px', fontSize: 12.5, color: '#334155', cursor: 'pointer' }}>{s}</button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
                <div style={{
                  maxWidth: '82%', padding: '10px 14px', borderRadius: 14, fontSize: 14, lineHeight: 1.5,
                  background: m.role === 'user' ? PURPLE : '#fff',
                  color: m.role === 'user' ? '#fff' : '#0f172a',
                  border: m.role === 'user' ? 'none' : '1px solid #e2e8f0',
                  borderBottomRightRadius: m.role === 'user' ? 4 : 14,
                  borderBottomLeftRadius: m.role === 'user' ? 14 : 4,
                }}>
                  {m.role === 'user' ? m.content : renderContent(m.content)}
                </div>
              </div>
            ))}
            {sending && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '10px 14px', borderRadius: 14, background: '#fff', border: '1px solid #e2e8f0', color: '#94a3b8', fontSize: 14 }}>Mentor is thinking…</div>
              </div>
            )}
          </>
        )}
      </div>

      <form onSubmit={e => { e.preventDefault(); send(input); }} style={{ display: 'flex', gap: 10 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask your mentor anything…"
          disabled={sending}
          style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: 12, padding: '12px 16px', fontSize: 14, fontFamily: 'inherit' }}
        />
        <button type="submit" disabled={sending || !input.trim()}
          style={{ background: PURPLE, color: '#fff', border: 'none', borderRadius: 12, padding: '0 22px', fontWeight: 700, fontSize: 14, cursor: sending || !input.trim() ? 'default' : 'pointer', opacity: sending || !input.trim() ? 0.6 : 1 }}>
          Send
        </button>
      </form>
    </div>
  );
};

export default AIMentor;
