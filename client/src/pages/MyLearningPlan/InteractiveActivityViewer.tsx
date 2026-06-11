import React, { useEffect, useRef, useState } from 'react';

/**
 * Renders a self-contained "do-it-yourself" activity (admin-authored HTML) in a
 * sandboxed iframe and bridges its progress back to the LMS.
 *
 * The activity HTML may (optionally) report progress to the parent:
 *   parent.postMessage({ type: 'cb-activity', done, total, complete }, '*');
 *   parent.postMessage({ type: 'cb-activity-height', height }, '*'); // px, to auto-size
 *
 * When `complete` is received (or the student taps the fallback button),
 * onComplete() is called — the day item is marked done via the existing flow,
 * so this works on ANY day of ANY curriculum (no day-specific coupling).
 */
interface Props {
  htmlContent: string;
  completed: boolean;
  onComplete: () => void;
}

const InteractiveActivityViewer: React.FC<Props> = ({ htmlContent, completed, onComplete }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [height, setHeight] = useState(720);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      // Only trust messages coming from our own iframe
      if (iframeRef.current && e.source !== iframeRef.current.contentWindow) return;
      const d = e.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === 'cb-activity') {
        if (typeof d.done === 'number' && typeof d.total === 'number') setProgress({ done: d.done, total: d.total });
        if (d.complete && !completed) onComplete();
      } else if (d.type === 'cb-activity-height' && typeof d.height === 'number') {
        setHeight(Math.max(400, Math.min(4000, d.height)));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [completed, onComplete]);

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
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
        style={{ width: '100%', height, border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff' }}
      />

      {!completed && (
        <button type="button" className="ia-complete-btn" onClick={onComplete}>
          ✓ I've completed this activity
        </button>
      )}

      <style>{`
        .ia-wrap { display: flex; flex-direction: column; gap: 12px; }
        .ia-progress { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px 14px; }
        .ia-progress-text { font-size: 13px; font-weight: 700; color: #0f172a; }
        .ia-progress-bar { height: 8px; background: #e5e7eb; border-radius: 6px; overflow: hidden; margin-top: 8px; }
        .ia-progress-bar > div { height: 100%; background: #14a89c; border-radius: 6px; transition: width .3s; }
        .ia-complete-btn { align-self: flex-start; background: #14a89c; color: #fff; border: none; border-radius: 10px; padding: 11px 20px; font-size: 14px; font-weight: 700; cursor: pointer; }
        .ia-complete-btn:hover { background: #0f8e83; }
      `}</style>
    </div>
  );
};

export default InteractiveActivityViewer;
