import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Renders a self-contained activity (admin-authored HTML) full-width and
 * auto-sized to its content height, so it fills the page with no dead space.
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

const InteractiveActivityViewer: React.FC<Props> = ({ htmlContent, completed, onComplete }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [height, setHeight] = useState(640);

  // Read the iframe's real content height (srcDoc is same-origin) and fit to it.
  const measure = useCallback(() => {
    const f = iframeRef.current;
    if (!f) return;
    try {
      const doc = f.contentDocument || f.contentWindow?.document;
      if (doc?.documentElement) {
        const h = Math.max(
          doc.documentElement.scrollHeight,
          doc.body ? doc.body.scrollHeight : 0,
        );
        if (h > 0) setHeight(Math.min(8000, h + 2));
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
      } else if (d.type === 'cb-activity-height' && typeof d.height === 'number') {
        setHeight(Math.min(8000, d.height + 2));
      }
    };
    window.addEventListener('message', onMsg);
    const iv = window.setInterval(measure, 500); // keeps the frame fitted as slides change
    return () => { window.removeEventListener('message', onMsg); window.clearInterval(iv); };
  }, [completed, onComplete, measure]);

  const onLoad = () => { measure(); setTimeout(measure, 200); setTimeout(measure, 800); };

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
        srcDoc={htmlContent}
        onLoad={onLoad}
        scrolling="no"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
        style={{ display: 'block', width: '100%', height, border: 'none', background: 'transparent' }}
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
