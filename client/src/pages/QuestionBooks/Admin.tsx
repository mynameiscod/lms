import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { questionBookApi, AdminBook, AdminQ } from '../../api/questionBookApi';
import { Modal, useToast, Markdown } from '../ProblemBank/shared';
import { BookCover } from './Library';
import '../ProblemBank/ProblemBank.css';
import './book.css';

/**
 * Question Books — staff side. Write topic and company books of interview questions, in
 * chapters; students read them notebook-style. A super admin can also write CodeBegun books
 * that every institute sees.
 */
const COLORS = ['#4f46e5', '#0d9488', '#be123c', '#b45309', '#0369a1', '#7c3aed', '#15803d', '#c2410c', '#1e293b'];
const EMBLEMS = ['☕', '🐍', '🗄️', '🧮', '🌐', '⚛️', '🧠', '💬', '🏢', '🧩', '📊', '🔐'];

const BookForm: React.FC<{ book?: AdminBook; onClose: () => void; onSaved: (b: AdminBook) => void }> = ({ book, onClose, onSaved }) => {
  const { user } = useAuth() as any;
  const [f, setF] = useState<any>(book ? { ...book } : { title: '', kind: 'topic', subject: '', description: '', color: COLORS[0], emblem: '☕', audience: 'all', scope: 'tenant', chaptersText: 'Basics\nIntermediate\nAdvanced' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const save = async () => {
    setBusy(true); setErr('');
    try {
      const body = { ...f, ...(book ? {} : { chapters: String(f.chaptersText || '').split('\n').map((x: string) => x.trim()).filter(Boolean) }) };
      onSaved(book ? await questionBookApi.admin.update(book.id || book._id, body) : await questionBookApi.admin.create(body));
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not save.'); }
    setBusy(false);
  };
  return (
    <Modal title={book ? 'Book details' : 'New question book'} onClose={onClose} footer={<>
      {err && <span className="pb-grow" style={{ color: 'var(--pb-bad)', fontSize: 13 }}>{err}</span>}
      <button className="pb-btn" onClick={onClose}>Cancel</button>
      <button className="pb-btn pb-btn-primary" disabled={busy || !String(f.title).trim()} onClick={save}>{busy ? <span className="pb-spinner" /> : null} {book ? 'Save' : 'Create book'}</button>
    </>}>
      <div className="pb-row" style={{ alignItems: 'flex-start', gap: 18 }}>
        <div style={{ width: 150, flexShrink: 0 }} className="qb">
          <BookCover b={{ id: '', slug: '', title: f.title || 'Book title', kind: f.kind, subject: f.subject, description: '', color: f.color, emblem: f.emblem, questionCount: book?.questionCount || 0, chapters: book?.chapters.length || String(f.chaptersText || '').split('\n').filter((x: string) => x.trim()).length, global: f.scope === 'global', knew: 0, revise: 0, favorites: 0, started: false }} onOpen={() => undefined} />
        </div>
        <div className="pb-grow">
          <div className="pb-seg" style={{ marginBottom: 4 }}>
            <button className={f.kind === 'topic' ? 'on' : ''} onClick={() => setF({ ...f, kind: 'topic' })}>Topic book</button>
            <button className={f.kind === 'company' ? 'on' : ''} onClick={() => setF({ ...f, kind: 'company', emblem: f.emblem || '🏢' })}>Company book</button>
          </div>
          <label className="pb-label">Title</label>
          <input className="pb-input" autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder={f.kind === 'company' ? 'e.g. Infosys Interview Notes' : 'e.g. Java Interview Questions'} />
          <label className="pb-label">{f.kind === 'company' ? 'Company' : 'Topic / language / concept'}</label>
          <input className="pb-input" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder={f.kind === 'company' ? 'Infosys' : 'Java'} />
        </div>
      </div>
      <label className="pb-label">Short description</label>
      <input className="pb-input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="What this book covers and who it's for" />
      <label className="pb-label">Cover</label>
      <div className="pb-row" style={{ flexWrap: 'wrap', gap: 6 }}>
        {COLORS.map((c) => <button key={c} onClick={() => setF({ ...f, color: c })} style={{ width: 26, height: 26, borderRadius: 99, background: c, border: f.color === c ? '3px solid #0f172a' : '2px solid #fff', boxShadow: '0 0 0 1px #cbd5e1', cursor: 'pointer' }} aria-label={c} />)}
        <span style={{ width: 10 }} />
        {EMBLEMS.map((e) => <button key={e} className={`pb-chip ${f.emblem === e ? 'on' : ''}`} onClick={() => setF({ ...f, emblem: e })}>{e}</button>)}
      </div>
      <div className="pb-field-row">
        <div><label className="pb-label">Who can read it</label>
          <select className="pb-select" value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>
            <option value="all">LMS students and CareerPilot members</option><option value="lms">LMS students only</option><option value="careerpilot">CareerPilot members only</option>
          </select></div>
        {!book && user?.role === 'SUPER_ADMIN' && <div><label className="pb-label">Owner</label>
          <select className="pb-select" value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value })}>
            <option value="tenant">This institute</option><option value="global">CodeBegun — every institute</option>
          </select></div>}
      </div>
      {!book && <>
        <label className="pb-label">Chapters <small>one per line — you can change them later</small></label>
        <textarea className="pb-textarea" rows={4} value={f.chaptersText} onChange={(e) => setF({ ...f, chaptersText: e.target.value })} />
      </>}
    </Modal>
  );
};

const QuestionForm: React.FC<{ book: AdminBook; q?: AdminQ | null; chapterId: string; onClose: () => void; onSaved: (another: boolean) => void }> = ({ book, q, chapterId, onClose, onSaved }) => {
  const [f, setF] = useState<any>(q ? { ...q } : { question: '', answer: '', difficulty: 'medium', askedAt: '', tip: '', chapterId });
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const save = async (another: boolean) => {
    setBusy(true); setErr('');
    try { await questionBookApi.admin.saveQ(book.id, q?.id || null, f); onSaved(another); if (another) setF({ question: '', answer: '', difficulty: f.difficulty, askedAt: '', tip: '', chapterId: f.chapterId }); } catch (e: any) { setErr(e?.response?.data?.message || 'Could not save.'); }
    setBusy(false);
  };
  return (
    <Modal wide title={q ? 'Edit question' : 'Add a question'} onClose={onClose} footer={<>
      {err && <span className="pb-grow" style={{ color: 'var(--pb-bad)', fontSize: 13 }}>{err}</span>}
      {!err && <span className="pb-grow pb-faint" style={{ fontSize: 12 }}>Markdown works: **bold**, `code`, ``` code blocks ```, lists.</span>}
      <button className="pb-btn" onClick={() => setPreview(!preview)}>{preview ? 'Edit' : 'Preview'}</button>
      {!q && <button className="pb-btn" disabled={busy || f.question.trim().length < 3} onClick={() => save(true)}>Save & add another</button>}
      <button className="pb-btn pb-btn-primary" disabled={busy || f.question.trim().length < 3} onClick={() => save(false)}>{busy ? <span className="pb-spinner" /> : null} Save</button>
    </>}>
      {preview ? (
        <div className="qb"><div className="qb-book" style={{ minHeight: 360 }}>
          <div className="qb-page left"><div className="chap">{book.chapters.find((c) => c._id === f.chapterId)?.title}</div><div className="qno">Q.</div><div className="qtext"><div className="md"><Markdown text={f.question} /></div></div>
            <div className="meta"><span className={`qb-diff ${f.difficulty}`}>{f.difficulty}</span>{f.askedAt && <span>🏢 asked at {f.askedAt}</span>}</div></div>
          <div className="qb-page right"><div className="chap">Answer</div><div className="md" style={{ marginTop: 8 }}><Markdown text={f.answer} empty="No answer yet." /></div>{f.tip && <div className="qb-sticky">💡 {f.tip}</div>}</div>
        </div></div>
      ) : <>
        <div className="pb-field-row">
          <div><label className="pb-label" style={{ marginTop: 0 }}>Chapter</label>
            <select className="pb-select" value={f.chapterId} onChange={(e) => setF({ ...f, chapterId: e.target.value })}>{book.chapters.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}</select></div>
          <div><label className="pb-label" style={{ marginTop: 0 }}>Difficulty</label>
            <select className="pb-select" value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value })}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></div>
          <div><label className="pb-label" style={{ marginTop: 0 }}>Commonly asked at <small>optional</small></label>
            <input className="pb-input" value={f.askedAt} onChange={(e) => setF({ ...f, askedAt: e.target.value })} placeholder="TCS, Infosys" /></div>
        </div>
        <label className="pb-label">Question</label>
        <textarea className="pb-textarea" rows={4} autoFocus value={f.question} onChange={(e) => setF({ ...f, question: e.target.value })} placeholder="What is the difference between an abstract class and an interface?" />
        <label className="pb-label">Answer <small>what a strong candidate says</small></label>
        <textarea className="pb-textarea" rows={9} value={f.answer} onChange={(e) => setF({ ...f, answer: e.target.value })} />
        <label className="pb-label">Mentor's tip <small>optional — shows as a sticky note</small></label>
        <input className="pb-input" value={f.tip} onChange={(e) => setF({ ...f, tip: e.target.value })} placeholder="Interviewers follow up with: can an interface have a constructor?" />
      </>}
    </Modal>
  );
};

const BulkForm: React.FC<{ book: AdminBook; chapterId: string; onClose: () => void; onDone: (n: number) => void }> = ({ book, chapterId, onClose, onDone }) => {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<{ question: string; answer: string }[] | null>(null);
  const [ch, setCh] = useState(chapterId);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!text.trim()) { setParsed(null); return; }
    const t = setTimeout(() => questionBookApi.admin.bulk(book.id, ch, text, true).then((r) => setParsed(r.parsed || [])).catch(() => undefined), 400);
    return () => clearTimeout(t);
  }, [text, ch, book.id]);
  return (
    <Modal wide title="Paste many questions" onClose={onClose} footer={<>
      {err && <span className="pb-grow" style={{ color: 'var(--pb-bad)', fontSize: 13 }}>{err}</span>}
      {!err && <span className="pb-grow pb-muted" style={{ fontSize: 13 }}>{parsed ? `${parsed.length} question(s) found` : ''}</span>}
      <button className="pb-btn" onClick={onClose}>Cancel</button>
      <button className="pb-btn pb-btn-primary" disabled={busy || !parsed?.length} onClick={async () => {
        setBusy(true); setErr('');
        try { const r = await questionBookApi.admin.bulk(book.id, ch, text, false); onDone(r.added || 0); } catch (e: any) { setErr(e?.response?.data?.message || 'Could not add.'); }
        setBusy(false);
      }}>Add {parsed?.length || ''} question(s)</button>
    </>}>
      <div className="pb-row" style={{ marginBottom: 8 }}>
        <span>Into chapter</span>
        <select className="pb-select" style={{ width: 240 }} value={ch} onChange={(e) => setCh(e.target.value)}>{book.chapters.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}</select>
      </div>
      <div className="pb-field-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <textarea className="pb-textarea pb-mono" rows={16} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Q: What is a HashMap?\nA: A key–value store backed by an array of buckets…\n\nQ: HashMap vs Hashtable?\nA: Hashtable is synchronized…\n\n1. What is the JVM?\nAnswer: …'} />
        <div className="pb-card" style={{ padding: 10, maxHeight: 360, overflow: 'auto' }}>
          {!parsed ? <div className="pb-muted" style={{ fontSize: 13 }}>Start each question with <b>Q:</b> (or "1.") and its answer with <b>A:</b>. Answers can run over many lines, including code blocks.</div>
            : parsed.map((p, i) => <div key={i} style={{ borderBottom: '1px solid var(--pb-line)', padding: '6px 0', fontSize: 13 }}><b>{i + 1}. {p.question.slice(0, 140)}</b><div className="pb-muted">{p.answer ? p.answer.slice(0, 160) : <i>no answer</i>}</div></div>)}
        </div>
      </div>
    </Modal>
  );
};

/* ── The book editor ─────────────────────────────────────────────────────────────────────── */
export const BookEditor: React.FC = () => {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [data, setData] = useState<{ book: AdminBook; questions: AdminQ[] } | null>(null);
  const [chapter, setChapter] = useState('');
  const [editing, setEditing] = useState<AdminQ | null | 'new'>(null);
  const [bulk, setBulk] = useState(false);
  const [details, setDetails] = useState(false);
  const [chapters, setChapters] = useState<{ id?: string; title: string }[] | null>(null);

  const load = useCallback(() => questionBookApi.admin.get(id).then((d) => {
    setData({ book: { ...d.book, id: d.book.id || d.book._id }, questions: d.questions });
    setChapter((c) => c && d.book.chapters.some((x) => x._id === c) ? c : d.book.chapters[0]?._id || '');
  }).catch(() => undefined), [id]);
  useEffect(() => { load(); }, [load]);
  const qs = useMemo(() => (data?.questions || []).filter((q) => q.chapterId === chapter).sort((a, b) => a.order - b.order), [data, chapter]);
  if (!data) return <div className="pb-root"><div className="pb-page pb-muted"><span className="pb-spinner" /> Loading…</div></div>;
  const b = data.book;

  const move = async (i: number, dir: -1 | 1) => {
    const ids = qs.map((q) => q.id); const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await questionBookApi.admin.reorder(b.id, chapter, ids); load();
  };

  return (
    <div className="pb-root">
      <div className="pb-page">
        <div className="pb-head" style={{ alignItems: 'center' }}>
          <button className="pb-btn pb-btn-ghost pb-btn-sm" onClick={() => nav('/admin/question-books')}><i className="fa-solid fa-arrow-left" /> Books</button>
          <div className="pb-grow"><h1>{b.emblem} {b.title}</h1><p style={{ marginTop: 2 }}>{b.kind === 'company' ? 'Company book' : 'Topic book'}{b.subject ? ` · ${b.subject}` : ''} · {b.questionCount} questions · {b.scope === 'global' ? 'CodeBegun (every institute)' : 'this institute'}</p></div>
          <span className={`pb-pill ${b.status === 'published' ? 'pb-badge-ok' : 'pb-badge-neutral'}`}>{b.status === 'published' ? 'Published' : 'Draft'}</span>
          <button className="pb-btn" onClick={() => setDetails(true)}><i className="fa-solid fa-pen" /> Details</button>
          <button className="pb-btn" onClick={() => window.open(`/question-books/${b.slug}`, '_blank')} disabled={b.status !== 'published'} title={b.status !== 'published' ? 'Publish to preview as a student' : ''}><i className="fa-regular fa-eye" /> Read as student</button>
          <button className={`pb-btn ${b.status === 'published' ? '' : 'pb-btn-primary'}`} onClick={async () => {
            try { await questionBookApi.admin.update(b.id, { ...b, status: b.status === 'published' ? 'draft' : 'published' }); toast.show(b.status === 'published' ? 'Unpublished — students no longer see it.' : 'Published — students can read it now.'); load(); } catch (e: any) { toast.show(e?.response?.data?.message || 'Could not change it.', true); }
          }}>{b.status === 'published' ? 'Unpublish' : 'Publish'}</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0,1fr)', gap: 14, alignItems: 'start' }}>
          <div className="pb-card" style={{ padding: 12 }}>
            <div className="pb-row" style={{ marginBottom: 8 }}><h3 className="pb-grow" style={{ margin: 0 }}>Chapters</h3>
              <button className="pb-btn pb-btn-sm" onClick={() => setChapters(b.chapters.map((c) => ({ id: c._id, title: c.title })))}><i className="fa-solid fa-pen" /> Edit</button></div>
            {b.chapters.map((c) => {
              const n = data.questions.filter((q) => q.chapterId === c._id).length;
              return (
                <div key={c._id} onClick={() => setChapter(c._id)} className="pb-row" style={{ padding: '8px 10px', borderRadius: 10, cursor: 'pointer', background: chapter === c._id ? 'var(--pb-accent-soft)' : 'transparent', fontWeight: chapter === c._id ? 700 : 500 }}>
                  <span className="pb-grow">{c.title}</span><span className="pb-tag">{n}</span>
                </div>
              );
            })}
          </div>

          <div className="pb-card">
            <div className="pb-row" style={{ padding: '12px 14px', borderBottom: '1px solid var(--pb-line)', flexWrap: 'wrap' }}>
              <h3 className="pb-grow" style={{ margin: 0 }}>{b.chapters.find((c) => c._id === chapter)?.title}</h3>
              <button className="pb-btn pb-btn-sm" onClick={() => setBulk(true)}><i className="fa-solid fa-paste" /> Paste many</button>
              <button className="pb-btn pb-btn-sm pb-btn-primary" onClick={() => setEditing('new')}><i className="fa-solid fa-plus" /> Add question</button>
            </div>
            {!qs.length && <div className="pb-empty" style={{ padding: 36 }}><h2>No questions in this chapter yet</h2><p className="pb-muted">Add them one by one, or paste a whole list.</p></div>}
            {qs.map((q, i) => (
              <div key={q.id} className="pb-row" style={{ padding: '10px 14px', borderTop: i ? '1px solid var(--pb-line)' : 0, alignItems: 'flex-start' }}>
                <span className="pb-faint" style={{ width: 26, paddingTop: 2 }}>{i + 1}.</span>
                <div className="pb-grow" style={{ minWidth: 0, cursor: 'pointer' }} onClick={() => setEditing(q)}>
                  <div style={{ fontWeight: 650, whiteSpace: 'pre-wrap' }}>{q.question.slice(0, 220)}</div>
                  <div className="pb-faint" style={{ fontSize: 12.5, marginTop: 2 }}>{q.answer ? q.answer.replace(/```[\s\S]*?```/g, '[code]').slice(0, 140) : <span style={{ color: 'var(--pb-warn)' }}>no answer yet</span>}</div>
                </div>
                <span className={`pb-pill pb-diff-${q.difficulty}`}>{q.difficulty}</span>
                <button className="pb-btn pb-btn-ghost pb-btn-icon" disabled={i === 0} onClick={() => move(i, -1)} title="Move up"><i className="fa-solid fa-arrow-up" /></button>
                <button className="pb-btn pb-btn-ghost pb-btn-icon" disabled={i === qs.length - 1} onClick={() => move(i, 1)} title="Move down"><i className="fa-solid fa-arrow-down" /></button>
                <button className="pb-btn pb-btn-ghost pb-btn-icon" title="Delete" onClick={async () => { if (!window.confirm('Delete this question?')) return; await questionBookApi.admin.deleteQ(b.id, q.id); load(); }}><i className="fa-regular fa-trash-can" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {editing && <QuestionForm book={b} q={editing === 'new' ? null : editing} chapterId={chapter} onClose={() => setEditing(null)} onSaved={(another) => { if (!another) setEditing(null); toast.show('Saved.'); load(); }} />}
      {bulk && <BulkForm book={b} chapterId={chapter} onClose={() => setBulk(false)} onDone={(n) => { setBulk(false); toast.show(`${n} question(s) added.`); load(); }} />}
      {details && <BookForm book={b} onClose={() => setDetails(false)} onSaved={() => { setDetails(false); toast.show('Saved.'); load(); }} />}
      {chapters && (
        <Modal title="Chapters" onClose={() => setChapters(null)} footer={<>
          <button className="pb-btn" onClick={() => setChapters([...chapters, { title: `Chapter ${chapters.length + 1}` }])}><i className="fa-solid fa-plus" /> Add chapter</button>
          <span className="pb-grow" />
          <button className="pb-btn" onClick={() => setChapters(null)}>Cancel</button>
          <button className="pb-btn pb-btn-primary" onClick={async () => {
            try { await questionBookApi.admin.chapters(b.id, chapters); setChapters(null); toast.show('Chapters saved.'); load(); } catch (e: any) { toast.show(e?.response?.data?.message || 'Could not save.', true); }
          }}>Save</button>
        </>}>
          {chapters.map((c, i) => (
            <div key={i} className="pb-row" style={{ marginBottom: 6 }}>
              <span className="pb-faint" style={{ width: 22 }}>{i + 1}.</span>
              <input className="pb-input pb-grow" value={c.title} onChange={(e) => setChapters(chapters.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
              <button className="pb-btn pb-btn-ghost pb-btn-icon" disabled={i === 0} onClick={() => { const n = [...chapters]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; setChapters(n); }}><i className="fa-solid fa-arrow-up" /></button>
              <button className="pb-btn pb-btn-ghost pb-btn-icon" onClick={() => setChapters(chapters.filter((_, j) => j !== i))} title="Remove (only an empty chapter)"><i className="fa-regular fa-trash-can" /></button>
            </div>
          ))}
        </Modal>
      )}
      {toast.node}
    </div>
  );
};

/* ── The list of books ───────────────────────────────────────────────────────────────────── */
const QuestionBooksAdmin: React.FC = () => {
  const nav = useNavigate();
  const toast = useToast();
  const [books, setBooks] = useState<AdminBook[] | null>(null);
  const [creating, setCreating] = useState(false);
  const load = useCallback(() => questionBookApi.admin.books().then(setBooks).catch(() => setBooks([])), []);
  useEffect(() => { load(); }, [load]);
  return (
    <div className="pb-root">
      <div className="pb-page">
        <div className="pb-head">
          <div className="pb-grow"><h1>Question Books</h1><p>Write interview questions and model answers as books — by topic (Java, SQL, DSA, HR…) or by company. Students read them like a notebook: question, think, flip for the answer, mark what they know, star for their cheat sheet.</p></div>
          <button className="pb-btn" onClick={() => nav('/question-books')}><i className="fa-regular fa-eye" /> Student view</button>
          <button className="pb-btn pb-btn-primary" onClick={() => setCreating(true)}><i className="fa-solid fa-plus" /> New book</button>
        </div>
        {!books ? <span className="pb-spinner" /> : !books.length ? (
          <div className="pb-card pb-empty"><div style={{ fontSize: 44 }}>📚</div><h2>No books yet</h2><p className="pb-muted">Start with the topics your students are asked about most — Java, SQL, OOPs, HR.</p>
            <button className="pb-btn pb-btn-primary" onClick={() => setCreating(true)}>Create the first book</button></div>
        ) : (
          <div className="pb-card pb-table-wrap">
            <table className="pb-table">
              <thead><tr><th>Book</th><th>Type</th><th>Questions</th><th>Chapters</th><th>Readers</th><th>Status</th></tr></thead>
              <tbody>{books.map((b) => (
                <tr key={b.id} onClick={() => (b.canEdit !== false ? nav(`/admin/question-books/${b.id}`) : toast.show('A CodeBegun book — only a super admin can edit it.', true))}>
                  <td><span className="pb-row"><span style={{ width: 30, height: 38, borderRadius: '2px 6px 6px 2px', background: b.color, display: 'grid', placeItems: 'center', color: '#fff' }}>{b.emblem}</span><span><b>{b.title}</b><div className="pb-faint" style={{ fontSize: 12 }}>{b.subject}{b.scope === 'global' ? ' · CodeBegun' : ''}</div></span></span></td>
                  <td>{b.kind === 'company' ? 'Company' : 'Topic'}</td>
                  <td>{b.questionCount}</td>
                  <td>{b.chapters.length}</td>
                  <td className="pb-muted">{b.audience === 'all' ? 'LMS + CareerPilot' : b.audience === 'lms' ? 'LMS' : 'CareerPilot'}</td>
                  <td><span className={`pb-pill ${b.status === 'published' ? 'pb-badge-ok' : 'pb-badge-neutral'}`}>{b.status === 'published' ? 'Published' : 'Draft'}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      {creating && <BookForm onClose={() => setCreating(false)} onSaved={(b) => { setCreating(false); nav(`/admin/question-books/${(b as any)._id || b.id}`); }} />}
      {toast.node}
    </div>
  );
};

export default QuestionBooksAdmin;
