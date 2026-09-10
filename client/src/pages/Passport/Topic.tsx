import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { adaptiveApi, TopicView, TopicItem, STATE_LABEL, STATE_TONE } from '../../api/adaptiveApi';
import './topic.css';

/**
 * One topic, in the order it is meant to be taken: watch, read, practise.
 *
 * WHERE A MISSION LANDS. Until now a learning mission named a skill, and a skill is not a thing
 * that renders — so the card either linked to an assessment or reported that no resource was
 * configured. This is the page it should have been opening.
 *
 * THE THREE ITEMS ARE ALREADY CHOSEN. The plan picked them when it was generated, at the depth
 * this student's Skill DNA earned, and the server hands back exactly those. Nothing is resolved
 * here: a page that re-resolved could show different material from the week it came from, and
 * nobody would see the difference.
 *
 * A PLACEHOLDER SAYS SO, LOUDLY. Every item currently in the library is scaffolding, and the
 * honest thing is to tell the student that rather than let them conclude the product is thin.
 * The banner is deliberately hard to miss and deliberately not an error — nothing is broken, the
 * lesson simply is not written yet.
 *
 * NOTHING HERE GRADES ANYTHING. Practice questions are shown with their options and no answer
 * key, because the key never leaves the server. Marking practice is a separate concern and
 * pretending to do it here would be inventing a score.
 */

const TYPE_LABEL: Record<string, string> = {
  video: 'Watch',
  notes: 'Read',
  interactive_lesson: 'Work through',
  tech_qa: 'Questions and answers',
  practice_coding: 'Practise',
  practice_theory: 'Practise',
};

const TYPE_ICON: Record<string, string> = {
  video: '▶',
  notes: '≡',
  interactive_lesson: '◈',
  tech_qa: '?',
  practice_coding: '⌨',
  practice_theory: '✎',
};

const DEPTH_LABEL: Record<string, string> = {
  FOUNDATION: 'From the beginning',
  GUIDED: 'Guided',
  STANDARD: 'Standard',
  REVISION: 'Recap',
  CHALLENGE: 'Challenge',
};

const mins = (n: number) => (n >= 60 ? `${Math.floor(n / 60)}h${n % 60 ? ` ${n % 60}m` : ''}` : `${n} min`);

/**
 * A video, from whichever host the author chose.
 *
 * Upload, YouTube, Vimeo and Bunny are all accepted, so this cannot assume one player. A URL it
 * recognises is embedded; anything else becomes a link rather than a broken frame, which is the
 * difference between "open this elsewhere" and a page that looks defective.
 */
const VideoBlock: React.FC<{ item: TopicItem }> = ({ item }) => {
  const url = item.videoUrl || '';
  if (!url) {
    return (
      <div className="tp-empty">
        No video has been uploaded for this topic yet.
      </div>
    );
  }

  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  const vimeo = url.match(/vimeo\.com\/(\d+)/);

  if (yt) {
    return (
      <div className="tp-frame">
        <iframe src={`https://www.youtube.com/embed/${yt[1]}`} title={item.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
          allowFullScreen />
      </div>
    );
  }
  if (vimeo) {
    return (
      <div className="tp-frame">
        <iframe src={`https://player.vimeo.com/video/${vimeo[1]}`} title={item.title}
          allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
      </div>
    );
  }
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) {
    return <video className="tp-video" src={url} controls preload="metadata" />;
  }
  return <a className="tp-link" href={url} target="_blank" rel="noreferrer">Open the video</a>;
};

/**
 * Notes, rendered from the author's text.
 *
 * Deliberately NOT dangerouslySetInnerHTML. The body is authored in the admin editor and stored
 * as text; injecting it as markup would make every author a route to script on a student's page.
 * Paragraphs and simple emphasis are enough for notes, and anything richer belongs in a proper
 * renderer rather than in an escape hatch.
 */
const NotesBlock: React.FC<{ item: TopicItem }> = ({ item }) => {
  const body = item.notesContent || '';
  if (!body.trim()) return <div className="tp-empty">These notes have not been written yet.</div>;

  return (
    <div className="tp-notes">
      {body.split(/\n{2,}/).map((para, i) => (
        <p key={i}>
          {para.split(/(\*\*[^*]+\*\*)/).map((chunk, j) => (
            chunk.startsWith('**') && chunk.endsWith('**')
              ? <strong key={j}>{chunk.slice(2, -2)}</strong>
              : <React.Fragment key={j}>{chunk}</React.Fragment>
          ))}
        </p>
      ))}
    </div>
  );
};

/** Practice questions, with their options and without their answers. */
const PracticeBlock: React.FC<{ item: TopicItem }> = ({ item }) => {
  const questions = item.practiceQuestions || [];
  if (!questions.length) {
    return <div className="tp-empty">No practice has been written for this topic yet.</div>;
  }
  return (
    <ol className="tp-questions">
      {questions.map((q, i) => (
        <li key={i}>
          <div className="tp-q-head">
            <span className="tp-q-title">{q.title}</span>
            <span className={`tp-q-diff ${q.difficulty}`}>{q.difficulty}</span>
          </div>
          <p className="tp-q-body">{q.description}</p>
          {!!(q.options || []).length && (
            <ul className="tp-options">
              {q.options.map((o, j) => <li key={j}>{o.text}</li>)}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
};

const ItemCard: React.FC<{ item: TopicItem; index: number }> = ({ item, index }) => {
  const [open, setOpen] = useState(index === 0);
  const label = TYPE_LABEL[item.type] || item.type;

  return (
    <section className={`tp-item${open ? ' open' : ''}`}>
      <button className="tp-item-head" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="tp-step">{index + 1}</span>
        <span className="tp-icon" aria-hidden>{TYPE_ICON[item.type] || '•'}</span>
        <span className="tp-item-title">
          {label}
          <small>{item.title}</small>
        </span>
        {item.placeholder && <span className="tp-tag">Placeholder</span>}
        <span className="tp-mins">{mins(item.estimatedMinutes)}</span>
        <span className="tp-chev" aria-hidden>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="tp-item-body">
          {item.description && <p className="tp-desc">{item.description}</p>}
          {item.type === 'video' && <VideoBlock item={item} />}
          {item.type === 'notes' && <NotesBlock item={item} />}
          {item.type.startsWith('practice') && <PracticeBlock item={item} />}
          {!['video', 'notes'].includes(item.type) && !item.type.startsWith('practice') && (
            <div className="tp-empty">This kind of material cannot be shown here yet.</div>
          )}
        </div>
      )}
    </section>
  );
};

const Topic: React.FC = () => {
  const { topicCode = '' } = useParams();
  const navigate = useNavigate();
  const [view, setView] = useState<TopicView | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  /**
   * The student comes from the session, never from the URL.
   *
   * Reading an id out of the address bar would make one student's plan reachable by editing it.
   * The server refuses that — mayViewStudent checks — but a client that asks for it at all is one
   * server bug away from leaking, which is why the journey page does the same thing.
   */
  const { user } = useAuth();
  const studentId = String((user as any)?.id || (user as any)?._id || '');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setView(await adaptiveApi.getTopic(studentId, topicCode));
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not open this topic.');
    } finally {
      setLoading(false);
    }
  }, [studentId, topicCode]);

  useEffect(() => { if (studentId) load(); else setLoading(false); }, [load, studentId]);

  if (loading) return <div className="tp-wrap"><div className="tp-loading">Opening…</div></div>;

  if (error || !view) {
    return (
      <div className="tp-wrap">
        <div className="tp-error">
          <p>{error || 'That topic is not in your plan.'}</p>
          <button onClick={() => navigate('/careerpilot/plan')}>Back to my plan</button>
        </div>
      </div>
    );
  }

  const { topic, items, coverage } = view;
  const tone = STATE_TONE[topic.state] || 'muted';

  return (
    <div className="tp-wrap">
      <button className="tp-back" onClick={() => navigate(-1)}>← Back</button>

      <header className="tp-head">
        {topic.moduleName && <div className="tp-module">{topic.moduleName}</div>}
        <h1>{topic.title}</h1>
        <div className="tp-meta">
          <span className={`tp-state ${tone}`}>{STATE_LABEL[topic.state] || topic.state}</span>
          <span className="tp-depth">{DEPTH_LABEL[topic.depth] || topic.depth}</span>
          {!topic.mandatory && <span className="tp-optional">Optional</span>}
        </div>
        {/* Why this topic is in the plan at all, in the words frozen onto it when it was built. */}
        {topic.reasonText && <p className="tp-why">{topic.reasonText}</p>}
      </header>

      {/**
        * A locked topic is shown, not hidden — and it says what it is waiting for.
        *
        * Hiding it would leave a student wondering where a topic went; showing it without the
        * reason would leave them wondering why they cannot start.
        */}
      {topic.locked && (
        <div className="tp-locked">
          <strong>This unlocks once you have the basics behind it.</strong>
          {topic.lockedBy && <span> Work through <b>{topic.lockedBy.replace(/_/g, ' ').toLowerCase()}</b> first — it is earlier in your plan.</span>}
        </div>
      )}

      {coverage.placeholders > 0 && (
        <div className="tp-placeholder-note">
          <strong>{coverage.placeholders === items.length ? 'This lesson is not written yet.' : 'Some of this is not written yet.'}</strong>
          <span>
            {' '}You are seeing scaffolding so the steps are visible. Nothing here is broken — the
            teaching material is still being authored.
          </span>
        </div>
      )}

      {!!coverage.missing.length && (
        <div className="tp-missing">
          Still to come for this topic: {coverage.missing.join(', ')}.
        </div>
      )}

      {/**
        * A stale plan is not an empty topic, and saying so matters.
        *
        * "Nothing is written yet" would send a student to complain about missing material that
        * exists — their plan is simply older than the library. Rebuilding it is the fix, and it
        * is one they can do themselves.
        */}
      {coverage.stale && (
        <div className="tp-stale">
          <strong>Your plan is older than this lesson.</strong>
          <span> The material for this topic has been updated since your plan was built. Rebuild
            your plan and it will pick up the new version.</span>
          <button onClick={() => navigate('/careerpilot/plan')}>Go to my plan</button>
        </div>
      )}

      {items.length === 0 && !coverage.stale
        ? <div className="tp-empty big">There is no material attached to this topic yet.</div>
        : items.map((item, i) => <ItemCard key={item.id} item={item} index={i} />)}
    </div>
  );
};

export default Topic;
