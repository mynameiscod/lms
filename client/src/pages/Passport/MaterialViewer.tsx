import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import passportApi from '../../api/passportApi';
import './materialViewer.css';

/**
 * The lesson an admin wrote, as the member reads it.
 *
 * WHY THIS EXISTS. The mission engine dropped any material without an external URL, so
 * everything the Concept Bank's editor produces — the overview, the notes, the follow-along
 * steps, the term breakdown, the self-checks, the uploaded files — was authored into a
 * place no student could reach. A Learn mission fell through to "work on this in your own
 * time" even when a full lesson had been written for it.
 *
 * EVERY SECTION IS OPTIONAL, because the model is. A material may be a bare video, a bare
 * set of steps, or all of it; this renders what is there and shows nothing where there is
 * nothing, rather than empty headings implying the author forgot something.
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

const MaterialViewer: React.FC = () => {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const [m, setM] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  const openFile = async (fileKey: string) => {
    if (!fileKey) return;
    try { window.open(await passportApi.attachmentUrl(fileKey), '_blank', 'noopener'); }
    catch { setErr('That file could not be opened. Please try again.'); }
  };

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try { setM(await passportApi.getMemberMaterial(id)); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Could not open this material.'); }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="mv"><div className="mv-state">Loading…</div></div>;
  if (err) return (
    <div className="mv">
      <div className="mv-state err">
        <b>{err}</b>
        <button className="mv-btn" onClick={() => nav('/careerpilot')}>Back to my missions</button>
      </div>
    </div>
  );

  const b: Body = m.body || {};
  const video = b.videoUrl || '';

  return (
    <div className="mv">
      <button className="mv-back" onClick={() => nav('/careerpilot')}>← Back to my missions</button>

      <header className="mv-hd">
        <span className="mv-skill">{m.skill?.name || m.skill?.key}</span>
        <h1>{m.title}</h1>
        {!!m.description && <p>{m.description}</p>}
      </header>

      {!!b.overview?.trim() && (
        <section className="mv-overview">
          <p>{b.overview}</p>
        </section>
      )}

      {!!video && (
        <section className="mv-block">
          <h2>Watch</h2>
          {/* An admin's link, not a player we host. Rendered in an iframe when it is
              embeddable and as a plain link otherwise, because a broken black rectangle
              tells a student nothing about why nothing is playing. */}
          {/youtube\.com|youtu\.be|vimeo\.com|player\./i.test(video) ? (
            <div className="mv-video">
              <iframe
                src={video.replace('watch?v=', 'embed/')}
                title={m.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <a className="mv-btn" href={video} target="_blank" rel="noreferrer">Open the video</a>
          )}
        </section>
      )}

      {!!b.notes?.trim() && (
        <section className="mv-block">
          <h2>Notes</h2>
          {/* Rendered as text, deliberately. The notes are authored by admins and injecting
              them as HTML would make the editor an XSS surface aimed at every member. */}
          <div className="mv-notes">{b.notes}</div>
        </section>
      )}

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

      {!!b.breakdown?.length && (
        <section className="mv-block">
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
        <section className="mv-block">
          <h2>Check yourself</h2>
          <p className="mv-hint">Answer in your head first — these are not marked.</p>
          <ul className="mv-checks">
            {b.checks.map((c, i) => (
              <li key={i}>
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
        <section className="mv-block">
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
        <section className="mv-block">
          <h2>Read more</h2>
          <ul className="mv-refs">
            {b.references.map((r, i) => (
              <li key={i}><a href={r.url} target="_blank" rel="noreferrer">{r.label || r.url}</a></li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mv-foot">
        {/* No "mark done" here. Completion belongs to the mission that sent them, and a
            second button that also completes it would let a member finish work they never
            opened — and put two writers on one record. */}
        <p>Finished? Tick this mission off on your missions screen.</p>
        <button className="mv-btn primary" onClick={() => nav('/careerpilot')}>Back to my missions</button>
      </footer>
    </div>
  );
};

export default MaterialViewer;
