import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import passportApi, { ConceptJourney, ConceptJourneyStep } from '../../api/passportApi';
import './materialViewer.css';

/**
 * The lesson an admin wrote, as the member reads it.
 *
 * WHY IT WAS REBUILT. The first version rendered every section the Concept Bank can produce,
 * one card after another, and stopped there. That made it a page rather than a lesson: a
 * student had no idea how long it was or what was in it before scrolling the whole thing, no
 * sense of where it sat in the course they were working through, and nothing at the end except
 * "tick this off somewhere else". A long lesson read as an undifferentiated column, and the
 * last screen of it was a dead end.
 *
 * So this adds the three things a person reading a lesson actually needs:
 *   · WHERE AM I — the step's place in the course, from the journey the mission came from.
 *   · WHAT IS IN THIS — contents built from the sections that exist, and a reading position.
 *   · WHAT NEXT — the next step of the course, so finishing leads somewhere.
 *
 * EVERY SECTION IS STILL OPTIONAL, because the model is. A material may be a bare video, a bare
 * set of steps, or all of it; this renders what is there and shows nothing where there is
 * nothing, rather than empty headings implying the author forgot something.
 *
 * STILL NO "MARK DONE". Completion belongs to the mission that sent them here. A second button
 * that also completed it would let a member finish work they never opened, and put two writers
 * on one record.
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

const kb = (n?: number) => (!n ? '' : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

const isExternal = (route: string) => /^https?:\/\//i.test(route);

/**
 * Turn an admin's link into something that plays here, or say it cannot.
 *
 * THE OLD ONE WAS `video.replace('watch?v=', 'embed/')`. That handles exactly one shape of
 * YouTube URL: paste a `youtu.be` share link — which is what the Share button gives you — or a
 * watch URL with a playlist or a timestamp on it, and the iframe loaded a page that refuses to
 * be framed. The student saw a black rectangle and no reason for it.
 */
function embedFor(raw: string): string | null {
  const url = String(raw || '').trim();
  if (!url) return null;
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  const host = u.hostname.replace(/^www\./, '');
  // A timestamp is worth carrying: an author linking to 4:20 meant it.
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

/**
 * Notes as an author typed them, split into paragraphs.
 *
 * Rendered as TEXT, deliberately and unchanged from the first version: these are authored in an
 * admin form, and injecting them as HTML would make that form an XSS surface aimed at every
 * member. Splitting on blank lines is the most a plain-text renderer can honestly do, and it is
 * the difference between prose and a wall.
 */
const paragraphsOf = (notes: string): string[] =>
  String(notes || '').split(/\n{2,}/).map(p => p.trim()).filter(Boolean);

interface SectionDef { id: string; label: string; present: boolean }

const MaterialViewer: React.FC = () => {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const location = useLocation();

  const [m, setM] = useState<any>(null);
  const [journey, setJourney] = useState<ConceptJourney | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  /** Null while the lesson is shorter than the screen — there is no position to report. */
  const [read, setRead] = useState<number | null>(null);
  const article = useRef<HTMLDivElement>(null);

  const openFile = async (fileKey: string) => {
    if (!fileKey) return;
    try { window.open(await passportApi.attachmentUrl(fileKey), '_blank', 'noopener'); }
    catch { setErr('That file could not be opened. Please try again.'); }
  };

  const load = useCallback(async () => {
    setLoading(true); setErr(''); setRevealed(new Set());
    try {
      const material = await passportApi.getMemberMaterial(id);
      setM(material);
      /**
       * The course this lesson belongs to, if there is one.
       *
       * Fetched after the material and allowed to fail quietly: most skills have no authored
       * journey, and a lesson that refused to open because its course was missing would be a
       * worse screen than one that simply shows no breadcrumb.
       */
      const key = material?.skill?.key;
      if (key) {
        passportApi.getMyConceptJourney(key).then(setJourney).catch(() => setJourney(null));
      }
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not open this material.');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // How far down the lesson they are. A long read with no sense of its own length is the
  // complaint this answers.
  useEffect(() => {
    const onScroll = () => {
      const el = article.current;
      if (!el) return;
      // Measured against the viewport rather than offsetTop: this renders inside the member
      // shell, so the article's offset parent is not the document and offsetTop would be
      // measuring from the wrong origin.
      const r = el.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      if (span <= 0) { setRead(null); return; }
      setRead(Math.min(100, Math.max(0, Math.round((-r.top / span) * 100))));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [m]);

  const b: Body = (m?.body || {}) as Body;

  const sections: SectionDef[] = useMemo(() => ([
    { id: 'mv-watch',  label: 'Watch',          present: !!String(b.videoUrl || '').trim() },
    { id: 'mv-notes',  label: 'Notes',          present: !!String(b.notes || '').trim() },
    { id: 'mv-steps',  label: 'Follow along',   present: !!b.steps?.length },
    { id: 'mv-terms',  label: 'Terms',          present: !!b.breakdown?.length },
    { id: 'mv-checks', label: 'Check yourself', present: !!b.checks?.length },
    { id: 'mv-files',  label: 'Files',          present: !!b.attachments?.length },
    { id: 'mv-refs',   label: 'Read more',      present: !!b.references?.length },
  ]), [m]);   // eslint-disable-line react-hooks/exhaustive-deps -- `b` is derived from `m`

  const shown = sections.filter(s => s.present);

  /** This lesson's place in its course, and what follows it. */
  const place = useMemo(() => {
    if (!journey) return null;
    const i = journey.steps.findIndex(s => s.resourceId === id);
    if (i < 0) return null;
    return {
      step: journey.steps[i],
      index: i + 1,
      total: journey.steps.length,
      next: journey.steps[i + 1] || null,
    };
  }, [journey, id]);

  const openStep = (step: ConceptJourneyStep) => {
    if (!step.route || !step.hasContent) return;
    if (isExternal(step.route)) window.open(step.route, '_blank', 'noopener');
    else nav(step.route, { state: { fromJourney: journey?.skillKey } });
  };

  const cameFromJourney = (location.state as any)?.fromJourney as string | undefined;
  const courseKey = cameFromJourney || journey?.skillKey;
  const backLabel = courseKey ? '← Back to the course' : '← Back to my missions';
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

  const video = String(b.videoUrl || '').trim();
  const embed = embedFor(video);

  return (
    <div className="mv">
      {/* Reading position. Thin, fixed, and the only thing on the screen that moves. */}
      {read !== null && (
        <div className="mv-read" aria-hidden="true"><i style={{ width: `${read}%` }} /></div>
      )}

      <button className="mv-back" onClick={goBack}>{backLabel}</button>

      <header className="mv-hd">
        <div className="mv-crumbs">
          <span className="mv-skill">{m.skill?.name || m.skill?.key}</span>
          {place && !!place.step.topic && (
            <span className="mv-crumb">
              {place.step.topic}
              {place.step.subtopic ? ` › ${place.step.subtopic}` : ''}
            </span>
          )}
        </div>
        <h1>{m.title}</h1>
        {!!m.description && <p className="mv-blurb">{m.description}</p>}

        {place && (
          /* Where this sits in the course. A lesson opened from a mission used to float free of
             everything around it — the student could not tell whether it was the first of three
             or the last of fourteen. */
          <div className="mv-place">
            <span>Step {place.index} of {place.total}</span>
            <button className="mv-linkish" onClick={() => nav(`/careerpilot/learn/${journey!.skillKey}`)}>
              See the whole course
            </button>
          </div>
        )}
      </header>

      {shown.length > 1 && (
        /* Contents, built from what is actually in this lesson. Never a fixed list with empty
           headings, which would imply the author left something out. */
        <nav className="mv-toc" aria-label="In this lesson">
          <span>In this lesson</span>
          {shown.map(s => (
            <button
              key={s.id}
              onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              {s.label}
            </button>
          ))}
        </nav>
      )}

      <div className="mv-article" ref={article}>

        {!!b.overview?.trim() && (
          <section className="mv-overview">
            <p>{b.overview}</p>
          </section>
        )}

        {!!video && (
          <section className="mv-block" id="mv-watch">
            <h2>Watch</h2>
            {isVideoFile(video) ? (
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
            ) : (
              /* A link we cannot frame. Said plainly, because a black rectangle tells a student
                 nothing about why nothing is playing. */
              <div className="mv-offsite">
                <p>This video is hosted somewhere that will not play inside the app.</p>
                <a className="mv-btn primary" href={video} target="_blank" rel="noreferrer">
                  Open the video in a new tab
                </a>
              </div>
            )}
          </section>
        )}

        {!video && !!b.videoKey?.trim() && (
          <section className="mv-block">
            <h2>Watch</h2>
            <p className="mv-hint">A video was uploaded for this lesson but is not available to play yet.</p>
          </section>
        )}

        {!!b.notes?.trim() && (
          <section className="mv-block" id="mv-notes">
            <h2>Notes</h2>
            {/* Rendered as text, deliberately. The notes are authored by admins and injecting
                them as HTML would make the editor an XSS surface aimed at every member. */}
            <div className="mv-notes">
              {paragraphsOf(b.notes).map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </section>
        )}

        {!!b.steps?.length && (
          <section className="mv-block" id="mv-steps">
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

        {!!b.breakdown?.length && (
          <section className="mv-block" id="mv-terms">
            <h2>Terms</h2>
            <dl className="mv-terms">
              {b.breakdown.map((t, i) => (
                <React.Fragment key={i}>
                  <dt>{t.term}</dt>
                  <dd>
                    {t.explanation}
                    {!!t.example && <pre>{t.example}</pre>}
                  </dd>
                </React.Fragment>
              ))}
            </dl>
          </section>
        )}

        {!!b.checks?.length && (
          <section className="mv-block" id="mv-checks">
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

        {!!b.attachments?.length && (
          <section className="mv-block" id="mv-files">
            <h2>Files</h2>
            <ul className="mv-files">
              {b.attachments.map((a, i) => (
                <li key={i}>
                  {/* Opened through a ten-minute ticket naming this one file, fetched on
                      click. A plain href would need the session JWT in the URL, where it
                      lands in access logs, browser history and Referer headers. */}
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
          <section className="mv-block" id="mv-refs">
            <h2>Read more</h2>
            <ul className="mv-refs">
              {b.references.map((r, i) => (
                <li key={i}><a href={r.url} target="_blank" rel="noreferrer">{r.label || r.url}</a></li>
              ))}
            </ul>
          </section>
        )}

      </div>

      <footer className="mv-foot">
        {place?.next ? (
          /* Finishing leads somewhere. The old footer's only offer was to leave. */
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
            <p>Tick this one off on your missions screen when you are done with it.</p>
          </>
        ) : (
          <p>Finished? Tick this mission off on your missions screen.</p>
        )}
        <button className="mv-btn" onClick={goBack}>{courseKey ? 'Back to the course' : 'Back to my missions'}</button>
      </footer>
    </div>
  );
};

export default MaterialViewer;
