import { useEffect } from 'react';

/**
 * Anti-cheat guards for exam screens.
 *
 * Two separate rules, because they protect different things:
 *
 *   1. THE QUESTION CANNOT BE TAKEN OUT. Selection, copy, cut, right-click and drag are
 *      blocked inside anything marked `data-noselect`. That is the paper — question text
 *      and options — and stopping it being lifted into an AI assistant is the point.
 *
 *   2. NOTHING CAN BE PASTED IN, anywhere on the page, including the code editor. An
 *      answer that arrives by paste was written somewhere else.
 *
 * Listeners are attached at DOCUMENT level in the CAPTURE phase deliberately. Monaco and
 * every other rich editor handle these events on their own hidden textarea and stop them
 * propagating, so a listener on a wrapping div never runs. Capture sees the event on the
 * way down, before the editor does.
 *
 * This is a deterrent, not a security boundary — anything running in a browser can be
 * defeated by someone determined enough with devtools. It removes the effortless path,
 * which is what casual copying actually is.
 */
export function useExamGuards(enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled) return;

    /** Is this event inside a region marked as protected? */
    const inProtected = (target: EventTarget | null): boolean =>
      !!(target instanceof Element && target.closest('[data-noselect]'));

    const blockIfProtected = (e: Event) => {
      if (inProtected(e.target)) e.preventDefault();
    };

    /**
     * Copy and cut are checked against the SELECTION, not the event target. A keyboard
     * copy fires on whatever holds focus, which may be the page body while the highlighted
     * text sits in the question — checking only the target would let Ctrl+C through.
     */
    const blockCopy = (e: ClipboardEvent) => {
      const sel = window.getSelection();
      const node = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).commonAncestorContainer : null;
      const el = node instanceof Element ? node : node?.parentElement ?? null;
      if (inProtected(e.target) || (el && el.closest('[data-noselect]'))) e.preventDefault();
    };

    // Paste is blocked outright, wherever it lands.
    const blockPaste = (e: ClipboardEvent) => e.preventDefault();

    document.addEventListener('copy', blockCopy, true);
    document.addEventListener('cut', blockCopy, true);
    document.addEventListener('paste', blockPaste, true);
    document.addEventListener('contextmenu', blockIfProtected, true);
    document.addEventListener('dragstart', blockIfProtected, true);
    // Without this, a click-drag inside a protected block still paints a selection even
    // though user-select hides it in most browsers.
    document.addEventListener('selectstart', blockIfProtected, true);

    return () => {
      document.removeEventListener('copy', blockCopy, true);
      document.removeEventListener('cut', blockCopy, true);
      document.removeEventListener('paste', blockPaste, true);
      document.removeEventListener('contextmenu', blockIfProtected, true);
      document.removeEventListener('dragstart', blockIfProtected, true);
      document.removeEventListener('selectstart', blockIfProtected, true);
    };
  }, [enabled]);
}

export default useExamGuards;
