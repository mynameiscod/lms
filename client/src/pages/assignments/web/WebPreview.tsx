import React, { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { WebStack, WebFile, buildPreviewDoc } from './webStack';

export type Device = 'desktop' | 'tablet' | 'mobile';
export const DEVICE_WIDTH: Record<Device, number> = { desktop: 1280, tablet: 768, mobile: 390 };
export interface ConsoleLine { level: 'log' | 'info' | 'warn' | 'error'; text: string }
export interface WebPreviewHandle {
  /** The page as it stands in the preview now (scripts have run). Null if the frame does not answer. */
  snapshot: () => Promise<string | null>;
}

/**
 * The student's page, running. Sandboxed with scripts allowed but NOT same-origin, so their JavaScript
 * cannot reach the LMS page, its storage or its session; console lines and the page snapshot come out
 * by postMessage only. The page is laid out at the chosen device's real width and scaled to fit.
 */
const WebPreview = forwardRef<WebPreviewHandle, {
  stack: WebStack;
  files: WebFile[];
  /** Bumps to rebuild the page (Run). The page also rebuilds when `files` change. */
  runKey?: number;
  device?: Device;
  onConsole?: (line: ConsoleLine) => void;
  /** A reference image laid over the page to compare, and how see-through it is. */
  overlayUrl?: string | null;
  overlayOpacity?: number;
  title?: string;
}>(({ stack, files, runKey = 0, device = 'desktop', onConsole, overlayUrl, overlayOpacity = 0.5, title = 'Page preview' }, ref) => {
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [doc, setDoc] = useState('');
  const waiters = useRef(new Map<string, (html: string | null) => void>());
  const consoleRef = useRef(onConsole);
  consoleRef.current = onConsole;

  useEffect(() => { setDoc(buildPreviewDoc(stack, files)); }, [stack, files, runKey]);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (!frame.current || e.source !== frame.current.contentWindow) return;
      const d: any = e.data;
      if (!d || d.__cbPreview !== 1) return;
      if (d.type === 'console') consoleRef.current?.({ level: d.level, text: String(d.text || '').slice(0, 2000) });
      if (d.type === 'snapshot') {
        const w = waiters.current.get(d.id);
        if (w) { waiters.current.delete(d.id); w(String(d.html || '')); }
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  useImperativeHandle(ref, () => ({
    snapshot: () => new Promise(resolve => {
      const win = frame.current?.contentWindow;
      if (!win) return resolve(null);
      const id = Math.random().toString(36).slice(2);
      waiters.current.set(id, resolve);
      win.postMessage({ __cbPreview: 'snapshot', id }, '*');
      window.setTimeout(() => { if (waiters.current.delete(id)) resolve(null); }, 2000);
    }),
  }), []);

  const width = DEVICE_WIDTH[device];
  const scale = size.w ? Math.min(1, size.w / width) : 1;
  const frameH = size.h ? size.h / scale : 600;

  return (
    <div className="wp-box" ref={box}>
      <div className="wp-stage" style={{ width: width * scale, height: frameH * scale }}>
        <iframe
          ref={frame}
          title={title}
          sandbox="allow-scripts allow-modals allow-forms"
          srcDoc={doc}
          style={{ width, height: frameH, transform: `scale(${scale})` }}
        />
        {overlayUrl && (
          <img className="wp-overlay" src={overlayUrl} alt="" style={{ width, transform: `scale(${scale})`, opacity: overlayOpacity }} />
        )}
      </div>
    </div>
  );
});

export default WebPreview;
