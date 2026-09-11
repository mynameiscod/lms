import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import passportApi, { ConceptJourney, ConceptJourneyStep } from '../../api/passportApi';
import { lessonBlocks, LessonBlock } from './lessonText';
import './materialViewer.css';

/**
 * The lesson an admin wrote, as the member reads it.
 *
 * ── ONE LESSON, THREE THINGS TO DO ────────────────────────────────────────────────────────
 *
 * Watch it, read it, try it. The previous version poured all three down one page as a column of
 * cards, so a student scrolling for the practice had to pass everything else to find it, and had
 * no idea the practice existed until they got there. Three tabs say what a lesson contains
 * before any of it is read, and let somebody come back for the half they did not finish.
 *
 * The tabs are built from what is actually in the material. A lesson with no practice shows two.
 * A fixed set of three with an empty one would imply the author forgot something.
 *
 * ── NOTES ARE READ, NOT TRUSTED ───────────────────────────────────────────────────────────
 *
 * They arrive as HTML from an admin rich-text editor. Rendering them as HTML would make that
 * editor an XSS surface aimed at every member; rendering them as text showed the student the
 * tags, which is what it did. `lessonText` takes the paragraph breaks and list items the author
 * meant, throws away every tag, and hands back strings React escapes as it always does.
 */

type Body = {
  overview?: string;
  notes?: string;
  videoUrl?: string;
  videoKey?: string;
  steps?: { title?: string; detail?: string; command?: string; expectedOutput?: string }[];
  breakdown?: { term?: string; explanation?: string; example?: string }[];
  checks?: { question?: string; answer?: string }[];
  references?: { label?: string; url?: string }[];
  attachments?: { fileKey?: string; fileName?: string; mimeType?: string; size?: number }[];
};

type TabKey = 'watch' | 'read' | 'practise';

const kb = (n?: number) => (!n ? '' : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const isExternal = (route: string) => /^https?:\/\//i.test(route);

/**
 * Turn an admin's link into something that plays here, or say it cannot.
 *
 * THE OLD ONE WAS `video.replace('watch?v=', 'embed/')`, which handles exactly one shape of
 * YouTube URL. Paste a `youtu.be` share link — what the Share button gives you — or a watch URL
 * with a playlist or a timestamp, and the iframe loaded a page that refuses to be framed. The
 * student saw a black rectangle and no reason for it.
 */
function embedFor(raw: string): string | null {
  const url = String(raw || '').trim();
  if (!url) return null;
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  const host = u.hostname.replace(/^www\./, '');
  const t = parseInt(u.searchParams.get('t') || u.searchParams.get('start') || '', 10);
  const at = Number.isFinite(t) && t > 0 ? `?start=${t}` : '';

  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('/')[0];
    return id ? `https://www.youtube.com/embed/${id}${at}` : null;
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    const v = u.searchParams.get('v');
    if (v) return `https://www.youtube.com/embed/${v}${at}`;
    const m = u.pathname.match(/\/(?:embed|shorts|live|v)\/([^/?#]+)/);
    return m ? `https://www.youtube.com/embed/${m[1]}${at}` : null;
  }
  if (host === 'vimeo.com') {
    const id = u.pathname.split('/').filter(Boolean)[0];
    return /^\d+$/.test(id || '') ? `https://player.vimeo.com/video/${id}` : null;
  }
  if (host === 'player.vimeo.com') return url;
  if (host === 'drive.google.com') {
    const m = u.pathname.match(/\/file\/d\/([^/]+)/);
    return m ? `https://drive.google.com/file/d/${m[1]}/preview` : null;
  }
  return null;
}

/** A file we can play ourselves, rather than frame from somebody else's site. */
const isVideoFile = (url: string) => /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i.test(String(url || ''));

/** Authored prose, as blocks. Paragraphs and bullets survive; tags do not. */
const Prose: React.FC<{ blocks: LessonBlock[] }> = ({ blocks }) => {
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = (key: string) => {
    if (!bullets.length) return;
    out.push(<ul className="mv-ul" key={key}>{bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>);
    bullets = [];
  };
  blocks.forEach((b, i) => {
    if (b.kind === 'li') { bullets.push(b.text); return; }
    flush(`u${i}`);
    out.push(b.kind === 'h'
      ? <h3 className="mv-h3" key={i}>{b.text}</h3>
      : <p key={i}>{b.text}</p>);
  });
  flush('uend');
  return <>{out}</>;
};

const MaterialViewer: React.FC = () => {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const location = useLocation();

  const [m, setM] = useState<any>(null);
  const [journey, setJourney] = useState<ConceptJourney | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [tab, setTab] = useState<TabKey | null>(null);

  const openFile = async (fileKey: string) => {
    if (!fileKey) return;
    try { window.open(await passportApi.attachmentUrl(fileKey), '_blank', 'noopener'); }
    catch { setErr('That file could not be opened. Please try again.'); }
  };

  const load = useCallback(async () => {
    setLoading(true); setErr(''); setRevealed(new Set()); setTab(null);
    try {
      const material = await passportApi.getMemberMaterial(id);
      setM(material);
      // The course this lesson belongs to, allowed to fail quietly: most skills have no authored
      // journey, and a lesson that refused to open because its course was missing would be worse.
      const key = material?.skill?.key;
      if (key) passportApi.getMyConceptJourney(key).then(setJourney).catch(() => setJourney(null));
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not open this material.');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const b: Body = (m?.body || {}) as Body;
  const video = String(b.videoUrl || '').trim();
  const notes = useMemo(() => lessonBlocks(b.notes), [b.notes]);
  const overview = useMemo(() => lessonBlocks(b.overview), [b.overview]);

  /** Only the tabs this lesson actually has. */
  const tabs = useMemo(() => {
    const list: { key: TabKey; label: string; sub: string }[] = [];
    if (video || b.videoKey) list.push({ key: 'watch', label: 'Video', sub: 'Watch and learn' });
    if (notes.length || b.breakdown?.length || b.references?.length || b.attachments?.length) {
      list.push({ key: 'read', label: 'Notes', sub: 'Read and understand' });
    }
    if (b.steps?.length || b.checks?.length) {
      list.push({ key: 'practise', label: 'Practice', sub: 'Apply what you learn' });
    }
    return list;
  }, [video, b.videoKey, notes.length, b.breakdown, b.references, b.attachments, b.steps, b.checks]);

  // Open on the first tab that exists, so a lesson with only notes does not open on an empty one.
  const active: TabKey | null = tab ?? tabs[0]?.key ?? null;

  const place = useMemo(() => {
    if (!journey) return null;
    const i = (journey.steps || []).findIndex(s => s.resourceId === id);
    if (i < 0) return null;
    return { step: journey.steps[i], index: i + 1, total: journey.steps.length, next: journey.steps[i + 1] || null };
  }, [journey, id]);

  const openStep = (step: ConceptJourneyStep) => {
    if (!step.route || !step.hasContent) return;
    if (isExternal(step.route)) window.open(step.route, '_blank', 'noopener');
    else nav(step.route, { state: { fromJourney: journey?.skillKey } });
  };

  const cameFrom = (location.state as any)?.fromJourney as string | undefined;
  const courseKey = cameFrom || journey?.skillKey;
  const goBack = () => nav(courseKey ? `/careerpilot/learn/${courseKey}` : '/careerpilot');

  if (loading) return <div className="mv"><div className="mv-state">Loading…</div></div>;
  if (err) return (
    <div className="mv">
      <div className="mv-state err">
        <b>{err}</b>
        <button className="mv-btn" onClick={() => nav('/careerpilot')}>Back to my missions</button>
      </div>
    </div>
  );

  const embed = embedFor(video);

  return (
    <div className="mv">
      <button className="mv-back" onClick={goBack}>
        {courseKey ? '← Back to the course' : '← Back to my missions'}
      </button>

      <header className="mv-hd">
        <div className="mv-crumbs">
          <span className="mv-skill">{m.skill?.name || m.skill?.key}</span>
          {place && !!place.step.topic && (
            <span className="mv-crumb">
              {place.step.topic}{place.step.subtopic ? ` › ${place.step.subtopic}` : ''}
            </span>
          )}
        </div>
        <h1>{m.title}</h1>
        {!!m.description && <p className="mv-blurb">{m.description}</p>}

        {/* The facts about this lesson, before any of it is read. */}
        <div className="mv-facts">
          {place && <span><b>Step {place.index}</b> of {place.total}</span>}
          {!!place?.step.estimatedMinutes && <span><b>{place.step.estimatedMinutes} min</b> estimated</span>}
          {typeof m.xp === 'number' && <span><b>{m.xp} XP</b> on completion</span>}
          {!!m.resourceType && <span className="mv-type">{m.resourceType}</span>}
          {journey && (
            <button className="mv-linkish" onClick={() => nav(`/careerpilot/learn/${journey.skillKey}`)}>
              See the whole course
            </button>
          )}
        </div>
      </header>

      {tabs.length > 0 && (
        /* What this lesson holds, said up front. A student looking for the practice can see that
           it exists without scrolling the whole page to find out. */
        <nav className="mv-tabs" aria-label="In this lesson">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`mv-tab${active === t.key ? ' is-on' : ''}`}
              onClick={() => setTab(t.key)}
              aria-current={active === t.key}
            >
              <b>{t.label}</b><span>{t.sub}</span>
            </button>
          ))}
        </nav>
      )}

      {tabs.length === 0 && (
        <div className="mv-state">
          <b>This lesson has no content yet</b>
          Your mentors are still writing it. Your plan will bring you back when it is ready.
        </div>
      )}

      {/* ── Watch ─────────────────────────────────────────────────────────── */}
      {active === 'watch' && (
        <div className="mv-pane mv-watch">
          <div className="mv-watch-main">
            {video && isVideoFile(video) ? (
              <div className="mv-video"><video src={video} controls preload="metadata" /></div>
            ) : embed ? (
              <div className="mv-video">
                <iframe
                  src={embed}
                  title={m.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : video ? (
              /* A link we cannot frame. Said plainly, because a black rectangle tells a student
                 nothing about why nothing is playing. */
              <div className="mv-offsite">
                <p>This video is hosted somewhere that will not play inside the app.</p>
                <a className="mv-btn primary" href={video} target="_blank" rel="noreferrer">
                  Open the video in a new tab
                </a>
              </div>
            ) : (
              <div className="mv-offsite">
                <p>A video was uploaded for this lesson but is not available to play yet.</p>
              </div>
            )}
          </div>

          {overview.length > 0 && (
            <aside className="mv-aside">
              <h2>What you will learn</h2>
              <div className="mv-prose"><Prose blocks={overview} /></div>
            </aside>
          )}
        </div>
      )}

      {/* ── Read ──────────────────────────────────────────────────────────── */}
      {active === 'read' && (
        <div className="mv-pane">
          {notes.length > 0 && (
            <section className="mv-block">
              <h2>Notes</h2>
              <div className="mv-prose"><Prose blocks={notes} /></div>
            </section>
          )}

          {!!b.breakdown?.length && (
            <section className="mv-block">
              <h2>Terms</h2>
              <dl className="mv-terms">
                {b.breakdown.map((t, i) => (
                  <React.Fragment key={i}>
                    <dt>{t.term}</dt>
                    <dd>{t.explanation}{!!t.example && <pre>{t.example}</pre>}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </section>
          )}

          {!!b.attachments?.length && (
            <section className="mv-block">
              <h2>Files</h2>
              <ul className="mv-files">
                {b.attachments.map((a, i) => (
                  <li key={i}>
                    {/* Opened through a ten-minute ticket naming this one file. A plain href
                        would need the session JWT in the URL, where it lands in access logs. */}
                    <button className="mv-file" onClick={() => openFile(a.fileKey || '')}>
                      {a.fileName || 'Attachment'}
                    </button>
                    {!!a.size && <span>{kb(a.size)}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!!b.references?.length && (
            <section className="mv-block">
              <h2>Read more</h2>
              <ul className="mv-refs">
                {b.references.map((r, i) => (
                  <li key={i}><a href={r.url} target="_blank" rel="noreferrer">{r.label || r.url}</a></li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* ── Practise ──────────────────────────────────────────────────────── */}
      {active === 'practise' && (
        <div className="mv-pane">
          {!!b.steps?.length && (
            <section className="mv-block">
              <h2>Follow along</h2>
              <ol className="mv-steps">
                {b.steps.map((s, i) => (
                  <li key={i}>
                    {!!s.title && <b>{s.title}</b>}
                    {!!s.detail && <p>{s.detail}</p>}
                    {!!s.command && <pre className="mv-cmd">{s.command}</pre>}
                    {/* The difference between "done" and "I think so". */}
                    {!!s.expectedOutput && (
                      <div className="mv-expect"><span>You should see</span><pre>{s.expectedOutput}</pre></div>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {!!b.checks?.length && (
            <section className="mv-block">
              <h2>Check yourself</h2>
              <p className="mv-hint">Answer in your head first — these are not marked.</p>
              <ul className="mv-checks">
                {b.checks.map((c, i) => (
                  <li key={i} className={revealed.has(i) ? 'is-open' : ''}>
                    <b>{c.question}</b>
                    {revealed.has(i)
                      ? <p>{c.answer}</p>
                      : (
                        <button className="mv-reveal" onClick={() => setRevealed(s => new Set(s).add(i))}>
                          Show the answer
                        </button>
                      )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <footer className="mv-foot">
        {place?.next ? (
          <>
            <span className="mv-foot-label">Next in this course</span>
            <button
              className="mv-next"
              onClick={() => openStep(place.next!)}
              disabled={!place.next.hasContent || !place.next.route}
            >
              <b>{place.next.title || place.next.phase}</b>
              <span>
                {place.next.estimatedMinutes} min
                {place.next.hasContent && place.next.route ? '' : ' · not ready yet'}
              </span>
            </button>
          </>
        ) : null}
        {/* No "mark done" here. Completion belongs to the mission that sent them; a second button
            that also completed it would let somebody finish work they never opened. */}
        <p>Tick this off on your missions screen when you are done with it.</p>
        <button className="mv-btn" onClick={goBack}>
          {courseKey ? 'Back to the course' : 'Back to my missions'}
        </button>
      </footer>
    </div>
  );
};

export default MaterialViewer;
