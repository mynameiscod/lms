import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { questionBookApi, ReadBook, BookQ } from '../../api/questionBookApi';
import { renderMarkdown } from '../ProblemBank/shared';
import { useBooksBase } from './Library';
import '../ProblemBank/ProblemBank.css';
import './book.css';

/**
 * The open notebook. The cover swings open onto the contents; each spread is one question on
 * the left and its answer on the right — hidden until the reader has thought about it. Turning
 * the page is a page turn. Marks, stars and notes save as you go.
 */
type Filter = 'all' | 'revise' | 'unseen' | 'favorites';
const Md: React.FC<{ text: string }> = ({ text }) => <div className="md" dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />;

const Reader: React.FC = () => {
  const { slug = '' } = useParams();
  const nav = useNavigate();
  const base = useBooksBase();
  const [data, setData] = useState<ReadBook | null>(null);
  const [err, setErr] = useState('');
  const [pos, setPos] = useState(-1); // -1 = contents
  const [filter, setFilter] = useState<Filter>('all');
  const [revealed, setRevealed] = useState(false);
  const [turn, setTurn] = useState<'next' | 'prev' | null>(null);
  const [marks, setMarks] = useState<Record<string, 'knew' | 'revise'>>({});
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [noteDraft, setNoteDraft] = useState('');
  const [phoneTurn, setPhoneTurn] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    questionBookApi.book(slug).then((d) => {
      setData(d); setMarks(d.progress.marks || {}); setFavs(new Set(d.progress.favorites || [])); setNotes(d.progress.notes || {});
    }).catch((e) => setErr(e?.response?.data?.message || 'Could not open this book.'));
  }, [slug]);

  const list: BookQ[] = useMemo(() => {
    const qs = data?.questions || [];
    if (filter === 'revise') return qs.filter((q) => marks[q.id] === 'revise');
    if (filter === 'unseen') return qs.filter((q) => !marks[q.id]);
    if (filter === 'favorites') return qs.filter((q) => favs.has(q.id));
    return qs;
  }, [data, filter, marks, favs]);
  const cur = pos >= 0 ? list[pos] : undefined;
  const chapterOf = useCallback((q?: BookQ) => data?.chapters.find((c) => c.id === q?.chapterId)?.title || '', [data]);

  useEffect(() => { setNoteDraft(cur ? notes[cur.id] || '' : ''); }, [cur, notes]);
  // A filtered view shrinks as cards are marked; stay on the last card rather than fall off the end.
  useEffect(() => { if (pos >= list.length && list.length) setPos(list.length - 1); }, [pos, list.length]);

  const go = useCallback((to: number) => {
    if (busy.current || !data) return;
    if (to < -1 || to >= list.length || to === pos) return;
    busy.current = true;
    const dir = to > pos ? 'next' : 'prev';
    setTurn(dir); setPhoneTurn(true);
    // Swap the pages as the turning leaf passes the spine.
    setTimeout(() => { setPos(to); setRevealed(false); }, 300);
    setTimeout(() => { setTurn(null); setPhoneTurn(false); busy.current = false; }, 640);
    const q = list[to];
    if (q) questionBookApi.progress(data.book.id, { last: q.id }).catch(() => undefined);
  }, [data, list, pos]);

  const mark = (m: 'knew' | 'revise') => {
    if (!cur || !data) return;
    const next = marks[cur.id] === m ? null : m;
    setMarks((x) => { const c = { ...x }; if (next) c[cur.id] = next; else delete c[cur.id]; return c; });
    questionBookApi.progress(data.book.id, { questionId: cur.id, mark: next }).catch(() => undefined);
    // Knowing it moves you on; in "revise" and "unseen" views the card leaves the list itself.
    if (next && filter === 'all' && pos < list.length - 1) setTimeout(() => go(pos + 1), 450);
    if (next && (filter === 'revise' || filter === 'unseen')) setRevealed(false);
  };
  const star = () => {
    if (!cur || !data) return;
    const on = !favs.has(cur.id);
    setFavs((s) => { const n = new Set(s); if (on) n.add(cur.id); else n.delete(cur.id); return n; });
    questionBookApi.progress(data.book.id, { questionId: cur.id, favorite: on }).catch(() => undefined);
  };
  const saveNote = () => {
    if (!cur || !data || (notes[cur.id] || '') === noteDraft.trim()) return;
    setNotes((n) => ({ ...n, [cur.id]: noteDraft.trim() }));
    questionBookApi.progress(data.book.id, { questionId: cur.id, note: noteDraft.trim() }).catch(() => undefined);
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'TEXTAREA' || (e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight') go(pos + 1);
      else if (e.key === 'ArrowLeft') go(pos - 1);
      else if ((e.key === ' ' || e.key === 'Enter') && cur) { e.preventDefault(); setRevealed(true); }
      else if (e.key === 'k' && revealed) mark('knew');
      else if (e.key === 'r' && revealed) mark('revise');
      else if (e.key === 'f') star();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  if (err) return <div className="pb-root"><div className="pb-page"><div className="pb-alert pb-alert-bad">{err}</div><button className="pb-btn" onClick={() => nav(base)}>Back to the library</button></div></div>;
  if (!data) return <div className="pb-root"><div className="pb-page pb-muted"><span className="pb-spinner" /> Opening the book…</div></div>;
  const b = data.book;
  const known = data.questions.filter((q) => marks[q.id] === 'knew').length;
  const lastIdx = data.progress.lastQuestionId ? data.questions.findIndex((q) => q.id === data.progress.lastQuestionId) : -1;
  const counts = { all: data.questions.length, revise: data.questions.filter((q) => marks[q.id] === 'revise').length, unseen: data.questions.filter((q) => !marks[q.id]).length, favorites: favs.size };

  return (
    <div className="pb-root qb">
      <div className="pb-page" style={{ maxWidth: 1180 }}>
        <div className="pb-row qb-noprint" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
          <button className="pb-btn pb-btn-ghost pb-btn-sm" onClick={() => nav(base)}><i className="fa-solid fa-arrow-left" /> Library</button>
          <b className="pb-grow" style={{ fontSize: 16 }}>{b.title}</b>
          <div className="pb-seg">
            {(['all', 'unseen', 'revise', 'favorites'] as Filter[]).map((f) => (
              <button key={f} className={filter === f ? 'on' : ''} onClick={() => { setFilter(f); setPos(-1); setRevealed(false); }}>
                {f === 'all' ? 'All' : f === 'unseen' ? 'Not yet seen' : f === 'revise' ? 'To revise' : '★ Starred'} ({counts[f]})
              </button>
            ))}
          </div>
        </div>

        <div className="qb-stage">
          <div className={`qb-book ${phoneTurn ? 'turning' : ''}`}>
            <div className="qb-front" style={{ backgroundColor: b.color, backgroundImage: 'linear-gradient(160deg, rgba(255,255,255,.14), rgba(0,0,0,.22))' }}>
              <div className="emb">{b.emblem || (b.kind === 'company' ? '🏢' : '📘')}</div>
              <div className="ttl">{b.title}</div>
              {b.subject && <div style={{ marginTop: 10, opacity: .85 }}>{b.subject}</div>}
            </div>
            {turn && <div className={`qb-turn ${turn}`} />}

            {pos === -1 || !cur ? (
              <>
                <div className="qb-page left">
                  <div className="chap">{b.kind === 'company' ? 'Company book' : 'Topic book'}{b.global ? ' · by CodeBegun' : ''}</div>
                  <div className="qno" style={{ fontSize: 46, lineHeight: '52px' }}>{b.title}</div>
                  {b.description && <div className="qtext" style={{ marginTop: 6 }}>{b.description}</div>}
                  <div className="meta" style={{ marginTop: 18 }}>
                    <span>📖 {data.questions.length} questions</span><span>✅ {known} known</span><span>🔁 {counts.revise} to revise</span><span>⭐ {favs.size} starred</span>
                  </div>
                  <div className="qb-sticky" style={{ marginTop: 24 }}>How to read: think of your answer first, then tap "Show the answer". Be honest with "I knew it" — the "To revise" pile is your study list.</div>
                  <span className="pno">i</span>
                </div>
                <div className="qb-page right qb-toc">
                  <h3>Contents</h3>
                  {filter !== 'all' && <div className="meta" style={{ marginTop: 0 }}>Showing {list.length} {filter === 'favorites' ? 'starred' : filter === 'revise' ? 'to revise' : 'not yet seen'}</div>}
                  {data.chapters.map((c) => {
                    const first = list.findIndex((q) => q.chapterId === c.id);
                    const n = list.filter((q) => q.chapterId === c.id).length;
                    return (
                      <div key={c.id} className="qb-toc-row" style={{ opacity: first < 0 ? .4 : 1 }} onClick={() => first >= 0 && go(first)}>
                        <span>{c.title}</span><span className="dots" /><span>{n}</span>
                      </div>
                    );
                  })}
                  <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {list.length > 0 && <button className="pb-btn pb-btn-primary" onClick={() => go(0)}>Start reading <i className="fa-solid fa-arrow-right" /></button>}
                    {filter === 'all' && lastIdx > 0 && <button className="pb-btn" onClick={() => go(lastIdx)}>Continue from Q{lastIdx + 1}</button>}
                    {!list.length && <span className="pb-muted" style={{ fontFamily: 'inherit' }}>Nothing here yet.</span>}
                  </div>
                  <span className="pno">ii</span>
                </div>
              </>
            ) : (
              <>
                <div className="qb-page left">
                  <button className={`qb-star ${favs.has(cur.id) ? 'on' : ''}`} onClick={star} title="Star for your cheat sheet (F)">{favs.has(cur.id) ? '★' : '☆'}</button>
                  <div className="chap">{chapterOf(cur)}</div>
                  <div className="qno">Q{data.questions.indexOf(cur) + 1}.</div>
                  <div className="qtext"><Md text={cur.question} /></div>
                  <div className="meta">
                    <span className={`qb-diff ${cur.difficulty}`}>{cur.difficulty}</span>
                    {cur.askedAt && <span>🏢 asked at {cur.askedAt}</span>}
                    {marks[cur.id] === 'knew' && <span style={{ color: '#047857' }}>✓ you knew this</span>}
                    {marks[cur.id] === 'revise' && <span style={{ color: '#b45309' }}>↻ on your revise list</span>}
                  </div>
                  <span className="pno">{pos + 1}</span>
                </div>
                <div className="qb-page right">
                  {!revealed ? (
                    <div className="qb-cover-answer">
                      <div>
                        <button onClick={() => setRevealed(true)}>🤔 Thought about it? Show the answer</button>
                        <small>Space · or tap</small>
                      </div>
                    </div>
                  ) : (
                    <div className="qb-answer">
                      <div className="chap">Answer</div>
                      <div style={{ marginTop: 8 }}>{cur.answer ? <Md text={cur.answer} /> : <span style={{ color: '#94a3b8' }}>No written answer — say yours out loud, then judge honestly.</span>}</div>
                      {cur.tip && <div className="qb-sticky">💡 {cur.tip}</div>}
                      <div className="qb-sticky note"><textarea placeholder="Your note (for the cheat sheet)…" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} onBlur={saveNote} /></div>
                    </div>
                  )}
                  {revealed && (
                    <div className="qb-judge">
                      <button className={`rev ${marks[cur.id] === 'revise' ? 'on' : ''}`} onClick={() => mark('revise')}>↻ Revise later</button>
                      <button className={`knew ${marks[cur.id] === 'knew' ? 'on' : ''}`} onClick={() => mark('knew')}>✓ I knew it</button>
                    </div>
                  )}
                  <span className="pno">of {list.length}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="qb-nav qb-noprint">
          <button className="pb-btn" disabled={pos < 0} onClick={() => go(pos - 1)}><i className="fa-solid fa-chevron-left" /> {pos === 0 ? 'Contents' : 'Previous'}</button>
          <div className="qb-dots">
            {list.slice(0, 160).map((q, i) => <span key={q.id} title={`Q${data.questions.indexOf(q) + 1}`} className={`${marks[q.id] || ''} ${i === pos ? 'cur' : ''}`} onClick={() => go(i)} />)}
          </div>
          <button className="pb-btn pb-btn-primary" disabled={pos >= list.length - 1} onClick={() => go(pos + 1)}>{pos === -1 ? 'Start' : 'Next'} <i className="fa-solid fa-chevron-right" /></button>
        </div>
        <div className="pb-faint qb-noprint" style={{ textAlign: 'center', fontSize: 12, marginTop: 8 }}>← → turn pages · Space shows the answer · K knew it · R revise · F star</div>
      </div>
    </div>
  );
};

export default Reader;
