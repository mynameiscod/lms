/**
 * In-app feedback instead of the browser's alert / confirm / prompt.
 *
 * The browser's own popups look like a different product, block the page, and on phones show the
 * site's address above the message. These render inside the app, in CodeBegun colours, and need
 * no provider: each call mounts what it needs into one container on <body>.
 *
 *   toast('Link copied');                          // a short message that disappears by itself
 *   toast('Could not save', 'error');
 *   if (await confirmDialog({ title: 'Submit now?', message: '3 questions are blank.' })) …
 *   const name = await promptDialog({ title: 'Repository name', defaultValue: 'my-app' }); // null if cancelled
 *   await copyText(url, 'Link copied');            // clipboard, with an in-app fallback — never window.prompt
 */
import React, { useEffect, useRef, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import './appFeedback.css';

type ToastKind = 'success' | 'error' | 'info';

let host: HTMLDivElement | null = null;
const hostEl = (): HTMLDivElement => {
  if (!host) {
    host = document.createElement('div');
    host.className = 'afb-host';
    document.body.appendChild(host);
  }
  return host;
};

/* ── Toasts ─────────────────────────────────────────────────────────────────────────── */

let toastRoot: Root | null = null;
let toasts: { id: number; text: string; kind: ToastKind }[] = [];
let nextId = 1;

const renderToasts = () => {
  if (!toastRoot) {
    const el = document.createElement('div');
    el.className = 'afb-toasts';
    el.setAttribute('aria-live', 'polite');
    hostEl().appendChild(el);
    toastRoot = createRoot(el);
  }
  toastRoot.render(
    <>
      {toasts.map(t => (
        <div key={t.id} className={`afb-toast afb-toast-${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
          <i className={`bi ${t.kind === 'success' ? 'bi-check-circle-fill' : t.kind === 'error' ? 'bi-exclamation-circle-fill' : 'bi-info-circle-fill'}`} aria-hidden />
          <span>{t.text}</span>
          <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)}><i className="bi bi-x" aria-hidden /></button>
        </div>
      ))}
    </>,
  );
};

const dismiss = (id: number) => {
  toasts = toasts.filter(t => t.id !== id);
  renderToasts();
};

export function toast(text: string, kind: ToastKind = 'success', ms = 3200): void {
  const id = nextId++;
  toasts = [...toasts.slice(-3), { id, text, kind }];
  renderToasts();
  window.setTimeout(() => dismiss(id), kind === 'error' ? Math.max(ms, 5000) : ms);
}

/* ── Dialogs ────────────────────────────────────────────────────────────────────────── */

interface DialogOptions {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** A destructive action: the confirm button is red. */
  danger?: boolean;
}
interface PromptOptions extends DialogOptions {
  defaultValue?: string;
  placeholder?: string;
}

function Dialog({ opts, input, onDone }: { opts: PromptOptions; input: boolean; onDone: (v: string | boolean | null) => void }) {
  const [value, setValue] = useState(opts.defaultValue ?? '');
  const okRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    (input ? inputRef.current : okRef.current)?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onDone(input ? null : false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [input, onDone]);
  const ok = () => onDone(input ? value : true);
  return (
    <div className="afb-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onDone(input ? null : false); }}>
      <div className="afb-dialog" role="dialog" aria-modal="true" aria-labelledby="afb-title">
        <h3 id="afb-title">{opts.title}</h3>
        {opts.message && <div className="afb-msg">{opts.message}</div>}
        {input && (
          <input ref={inputRef} className="afb-input" value={value} placeholder={opts.placeholder}
            onChange={e => setValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') ok(); }} />
        )}
        <div className="afb-actions">
          <button type="button" className="afb-btn afb-ghost" onClick={() => onDone(input ? null : false)}>{opts.cancelLabel || 'Cancel'}</button>
          <button type="button" ref={okRef} className={`afb-btn ${opts.danger ? 'afb-danger' : 'afb-primary'}`} onClick={ok}>
            {opts.confirmLabel || 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}

function openDialog(opts: PromptOptions, input: boolean): Promise<string | boolean | null> {
  return new Promise(resolve => {
    const el = document.createElement('div');
    hostEl().appendChild(el);
    const root = createRoot(el);
    const done = (v: string | boolean | null) => {
      root.unmount();
      el.remove();
      resolve(v);
    };
    root.render(<Dialog opts={opts} input={input} onDone={done} />);
  });
}

/** Resolves true when the person confirms, false when they cancel, press Escape or click outside. */
export const confirmDialog = (opts: DialogOptions): Promise<boolean> =>
  openDialog(opts, false).then(v => v === true);

/** Resolves the entered text, or null when cancelled. */
export const promptDialog = (opts: PromptOptions): Promise<string | null> =>
  openDialog(opts, true).then(v => (typeof v === 'string' ? v : null));

/**
 * Copy text to the clipboard and say so. Where the clipboard is unavailable (an http page, an
 * old browser), the text is shown in an in-app dialog to copy by hand — never window.prompt.
 */
export async function copyText(text: string, done = 'Copied'): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast(done);
  } catch {
    await openDialog({ title: 'Copy this link', message: 'Select it and copy it.', defaultValue: text, confirmLabel: 'Done', cancelLabel: 'Close' }, true);
  }
}
