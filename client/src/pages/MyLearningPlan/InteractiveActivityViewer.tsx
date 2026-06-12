import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Renders a self-contained activity (admin-authored HTML) full-width and sized
 * to its real content height, so it fills the page with no dead space and no
 * scroll feedback loop.
 *
 * The activity HTML may optionally report progress:
 *   parent.postMessage({ type:'cb-activity', done, total, complete }, '*');
 * Completion (message or the fallback button) calls onComplete() — which marks
 * the day item done via the existing flow, so it works on ANY day of ANY
 * curriculum (no day-specific coupling).
 */
interface Props {
  htmlContent: string;
  completed: boolean;
  onComplete: () => void;
}

/**
 * Forces every activity to render full-width: any centering wrapper the author
 * put directly under <body> (e.g. `.app { max-width: 760px; margin: 0 auto }`)
 * gets its cap removed via !important, so the activity spans the whole page
 * without the author hand-editing CSS. Injected at the END of <head> so it wins.
 */
const FULL_WIDTH_CSS =
  '<style id="cb-ia-fullwidth">html,body{margin:0!important}body{width:100%!important}'
  + 'body>*{max-width:none!important}</style>';

const withFullWidth = (html: string): string => {
  if (!html) return html;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${FULL_WIDTH_CSS}</head>`);
  if (/<body[^>]*>/i.test(html)) return html.replace(/<body[^>]*>/i, (m) => m + FULL_WIDTH_CSS);
  return FULL_WIDTH_CSS + html;
};

const InteractiveActivityViewer: React.FC<Props> = ({ htmlContent, completed, onComplete }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const srcDoc = useMemo(() => withFullWidth(htmlContent), [htmlContent]);
  const roRef = useRef<ResizeObserver | null>(null);
  const lastH = useRef(0);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [height, setHeight] = useState(560);

  /**
   * Measure the TRUE content height = the lowest bottom edge of the body's
   * direct children. This ignores any `min-height:100%`/flex-fill the activity
   * puts on <body> (which would otherwise echo the iframe height back and grow
   * forever). No padding is added, so the height is stable once it settles.
   */
  const measure = useCallback(() => {
    const f = iframeRef.current;
    if (!f) return;
    try {
      const doc = f.contentDocument || f.contentWindow?.document;
      if (!doc || !doc.body) return;
      const kids = doc.body.children;
      let h = 0;
      for (let i = 0; i < kids.length; i++) {
        const r = (kids[i] as HTMLElement).getBoundingClientRect();
        if (r.bottom > h) h = r.bottom;
      }
      h = Math.ceil(h);
      if (h > 0 && Math.abs(h - lastH.current) > 3) {
        lastH.current = h;
        setHeight(Math.min(8000, h));
      }
    } catch { /* cross-origin guard — ignore */ }
  }, []);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === 'cb-activity') {
        if (typeof d.done === 'number' && typeof d.total === 'number') setProgress({ done: d.done, total: d.total });
        if (d.complete && !completed) onComplete();
        measure();
      }
      // NOTE: cb-activity-height messages are intentionally ignored — we measure
      // the real content height ourselves to avoid a resize feedback loop.
    };
    window.addEventListener('message', onMsg);
    const iv = window.setInterval(measure, 600); // catches slide changes (incl. shrink)
    return () => {
      window.removeEventListener('message', onMsg);
      window.clearInterval(iv);
      roRef.current?.disconnect();
      roRef.current = null;
    };
  }, [completed, onComplete, measure]);

  // Reset baseline when the activity HTML changes.
  useEffect(() => { lastH.current = 0; }, [htmlContent]);

  const onLoad = () => {
    measure();
    setTimeout(measure, 150);
    setTimeout(measure, 500);
    try {
      const doc = iframeRef.current?.contentDocument;
      const target = doc?.body?.firstElementChild || doc?.body;
      if (doc && target && 'ResizeObserver' in window) {
        roRef.current?.disconnect();
        const ro = new ResizeObserver(() => measure());
        ro.observe(target);
        roRef.current = ro;
      }
    } catch { /* ignore */ }
  };

  const pct = progress && progress.total ? Math.round((progress.done / progress.total) * 100) : (completed ? 100 : 0);

  return (
    <div className="ia-wrap">
      {(progress || completed) && (
        <div className="ia-progress">
          <span className="ia-progress-text">
            {completed ? 'Completed ✓' : `Your progress — ${progress?.done ?? 0} / ${progress?.total ?? '?'} done`}
          </span>
          <div className="ia-progress-bar"><div style={{ width: `${pct}%` }} /></div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        title="Activity"
        srcDoc={srcDoc}
        onLoad={onLoad}
        scrolling="no"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox allow-downloads"
        style={{ display: 'block', width: '100%', height, border: 'none', background: 'transparent', overflow: 'hidden' }}
      />

      {!completed && (
        <button type="button" className="ia-complete-btn" onClick={onComplete}>
          ✓ I've completed this activity
        </button>
      )}

      <style>{`
        .ia-wrap { display: flex; flex-direction: column; gap: 12px; width: 100%; }
        .ia-progress { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px 14px; }
        .ia-progress-text { font-size: 13px; font-weight: 700; color: #0f172a; }
        .ia-progress-bar { height: 8px; background: #e5e7eb; border-radius: 6px; overflow: hidden; margin-top: 8px; }
        .ia-progress-bar > div { height: 100%; background: #14a89c; border-radius: 6px; transition: width .3s; }
        .ia-complete-btn { align-self: center; background: #14a89c; color: #fff; border: none; border-radius: 10px; padding: 11px 20px; font-size: 14px; font-weight: 700; cursor: pointer; }
        .ia-complete-btn:hover { background: #0f8e83; }
      `}</style>
    </div>
  );
};

export default InteractiveActivityViewer;
