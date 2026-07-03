import React, { useEffect, useRef } from 'react';

// ── Lightweight, dependency-free rich text ──────────────────────────────────────
// A small contentEditable editor (Bold / Italic / Underline / bullet + numbered
// lists) whose output is strictly sanitised to a tiny tag allow-list, so the HTML
// is safe to render with dangerouslySetInnerHTML in the resume templates.

const ALLOWED = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'BR', 'P', 'DIV', 'SPAN']);

// Keep only allow-listed tags, drop ALL attributes, escape text. Disallowed tags
// are unwrapped (their text content is kept). Nothing executable can survive.
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let doc: Document;
  try { doc = new DOMParser().parseFromString(html, 'text/html'); }
  catch { return esc(html); }
  const walk = (node: Node): string => {
    let out = '';
    node.childNodes.forEach(child => {
      if (child.nodeType === 3) { out += esc(child.textContent || ''); return; }
      if (child.nodeType !== 1) return;
      const el = child as Element;
      const tag = el.tagName.toUpperCase();
      const inner = walk(el);
      if (!ALLOWED.has(tag)) { out += inner; return; }
      if (tag === 'BR') { out += '<br>'; return; }
      out += `<${tag.toLowerCase()}>${inner}</${tag.toLowerCase()}>`;
    });
    return out;
  };
  return walk(doc.body).trim();
}

// True when the HTML has no visible content (used to show placeholders / skip render).
export const isRichEmpty = (html?: string) => !html || !html.replace(/<[^>]*>/g, '').replace(/&nbsp;|\s/g, '').trim();

const TB_BTN: React.CSSProperties = { border: '1px solid #d7dbe6', background: '#fff', borderRadius: 6, minWidth: 30, height: 28, cursor: 'pointer', fontSize: 13, lineHeight: 1, color: '#334155' };

export const RichTextEditor: React.FC<{ value: string; onChange: (html: string) => void; placeholder?: string; rows?: number }> = ({ value, onChange, placeholder, rows = 3 }) => {
  const ref = useRef<HTMLDivElement>(null);

  // Sync incoming value in (initial load + external rewrites like Auto-fix), but never
  // while the user is typing in it (would jump the caret).
  useEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.innerHTML !== (value || '')) el.innerHTML = value || '';
  }, [value]);

  const emit = () => onChange(sanitizeHtml(ref.current?.innerHTML || ''));
  const exec = (cmd: string) => { document.execCommand(cmd, false); ref.current?.focus(); emit(); };
  const hold = (e: React.MouseEvent) => e.preventDefault(); // keep the editor's selection

  return (
    <div className="rb-rte">
      <div className="rb-rte-toolbar">
        <button type="button" style={TB_BTN} title="Bold" onMouseDown={hold} onClick={() => exec('bold')}><b>B</b></button>
        <button type="button" style={TB_BTN} title="Italic" onMouseDown={hold} onClick={() => exec('italic')}><i>I</i></button>
        <button type="button" style={TB_BTN} title="Underline" onMouseDown={hold} onClick={() => exec('underline')}><u>U</u></button>
        <span style={{ width: 1, background: '#e2e8f0', margin: '0 2px' }} />
        <button type="button" style={TB_BTN} title="Bullet list" onMouseDown={hold} onClick={() => exec('insertUnorderedList')}>• List</button>
        <button type="button" style={TB_BTN} title="Numbered list" onMouseDown={hold} onClick={() => exec('insertOrderedList')}>1. List</button>
      </div>
      <div
        ref={ref}
        className="rb-rte-area"
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        data-ph={placeholder || ''}
        style={{ minHeight: rows * 22 }}
      />
    </div>
  );
};

// Render sanitised rich text (used inside the resume templates).
export const RichTextView: React.FC<{ html?: string; style?: React.CSSProperties }> = ({ html, style }) => {
  if (isRichEmpty(html)) return null;
  return <div className="rb-rte-render" style={style} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html || '') }} />;
};
