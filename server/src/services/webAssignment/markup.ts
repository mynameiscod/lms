/**
 * A small, forgiving HTML reader for marking web assignments.
 *
 * WHY NOT A LIBRARY. The production image installs the server from server/package.json alone, and no
 * HTML parser is a direct dependency there; the ones in the root node_modules arrive through the
 * client's tooling and are absent in the container. What marking needs is modest — "is there a form
 * with an email input", "does the page say Login", "is this image used" — so a reader that copes with
 * student HTML (unclosed tags, missing quotes, odd nesting) and a selector matcher covering tag, #id,
 * .class, [attr], [attr=value], [attr*=value], [attr^=value], [attr$=value], descendant and child
 * combinators and comma lists is enough, and is fully tested here.
 */

export interface El {
  tag: string;
  attrs: Record<string, string>;
  children: Node[];
  parent: El | null;
}
export interface TextNode { text: string }
export type Node = El | TextNode;

const isEl = (n: Node): n is El => (n as El).tag !== undefined;

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const RAW = new Set(['script', 'style', 'textarea', 'title']);
const ATTR_RE = /([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

export function parseHtml(html: string): El {
  const root: El = { tag: '#document', attrs: {}, children: [], parent: null };
  const src = String(html || '');
  let cur = root;
  let i = 0;
  const pushText = (t: string) => { if (t) cur.children.push({ text: decode(t) }); };

  while (i < src.length) {
    const lt = src.indexOf('<', i);
    if (lt < 0) { pushText(src.slice(i)); break; }
    pushText(src.slice(i, lt));
    if (src.startsWith('<!--', lt)) {
      const end = src.indexOf('-->', lt + 4);
      i = end < 0 ? src.length : end + 3;
      continue;
    }
    if (src[lt + 1] === '!' || src[lt + 1] === '?') {
      const end = src.indexOf('>', lt);
      i = end < 0 ? src.length : end + 1;
      continue;
    }
    if (src[lt + 1] === '/') {
      const end = src.indexOf('>', lt);
      const name = src.slice(lt + 2, end < 0 ? src.length : end).trim().toLowerCase();
      i = end < 0 ? src.length : end + 1;
      // Close up to the nearest open element of that name; a stray close tag is ignored.
      for (let e: El | null = cur; e && e !== root; e = e.parent) {
        if (e.tag === name) { cur = e.parent || root; break; }
      }
      continue;
    }
    const m = /^<([a-zA-Z][\w:-]*)/.exec(src.slice(lt, lt + 64));
    if (!m) { pushText('<'); i = lt + 1; continue; }
    const tag = m[1].toLowerCase();
    // Find the end of the tag, respecting quoted attribute values.
    let j = lt + m[0].length;
    let quote = '';
    for (; j < src.length; j++) {
      const c = src[j];
      if (quote) { if (c === quote) quote = ''; } else if (c === '"' || c === "'") quote = c; else if (c === '>') break;
    }
    const inside = src.slice(lt + m[0].length, j);
    const selfClosing = /\/\s*$/.test(inside);
    const attrs: Record<string, string> = {};
    ATTR_RE.lastIndex = 0;
    let a: RegExpExecArray | null;
    while ((a = ATTR_RE.exec(inside))) {
      const name = a[1].toLowerCase();
      if (name === '/') continue;
      if (!(name in attrs)) attrs[name] = decode(a[2] ?? a[3] ?? a[4] ?? '');
    }
    i = j + 1;
    const el: El = { tag, attrs, children: [], parent: cur };
    cur.children.push(el);
    if (VOID.has(tag) || selfClosing) continue;
    if (RAW.has(tag)) {
      const close = src.toLowerCase().indexOf(`</${tag}`, i);
      const body = src.slice(i, close < 0 ? src.length : close);
      if (body) el.children.push({ text: tag === 'script' || tag === 'style' ? body : decode(body) });
      const end = close < 0 ? src.length : src.indexOf('>', close);
      i = end < 0 ? src.length : end + 1;
      continue;
    }
    cur = el;
  }
  return root;
}

function decode(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&');
}

export function allElements(root: El): El[] {
  const out: El[] = [];
  const walk = (e: El) => { for (const c of e.children) if (isEl(c)) { out.push(c); walk(c); } };
  walk(root);
  return out;
}

/** The text a visitor reads: no script or style bodies, whitespace collapsed. */
export function textContent(e: El): string {
  const parts: string[] = [];
  const walk = (n: El) => {
    for (const c of n.children) {
      if (isEl(c)) { if (c.tag !== 'script' && c.tag !== 'style') walk(c); } else parts.push(c.text);
    }
  };
  walk(e);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/** Text of raw elements of one tag (every <style> body, every inline <script>). */
export function rawBodies(root: El, tag: 'style' | 'script'): string[] {
  return allElements(root).filter(e => e.tag === tag && !(tag === 'script' && e.attrs.src))
    .map(e => e.children.map(c => (isEl(c) ? '' : c.text)).join(''));
}

/* ────────────────────────── selectors ────────────────────────── */

interface AttrTest { name: string; op: '' | '=' | '*=' | '^=' | '$=' | '~='; value: string }
interface Compound { tag: string | null; id: string | null; classes: string[]; attrs: AttrTest[] }
type Step = { compound: Compound; combinator: ' ' | '>' | null };

export class SelectorError extends Error {}

function splitTop(s: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0; let q = ''; let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === q) q = ''; continue; }
    if (c === '"' || c === "'") q = c;
    else if (c === '[' || c === '(') depth++;
    else if (c === ']' || c === ')') depth--;
    else if (c === sep && depth === 0) { out.push(s.slice(start, i)); start = i + 1; }
  }
  out.push(s.slice(start));
  return out.map(x => x.trim()).filter(Boolean);
}

function parseCompound(s: string): Compound {
  const c: Compound = { tag: null, id: null, classes: [], attrs: [] };
  let i = 0;
  const ident = () => {
    const m = /^[\w-]+/.exec(s.slice(i));
    if (!m) throw new SelectorError(`Cannot read the selector near "${s.slice(i)}"`);
    i += m[0].length;
    return m[0];
  };
  if (s[0] === '*') i = 1;
  else if (/^[a-zA-Z]/.test(s)) c.tag = ident().toLowerCase();
  while (i < s.length) {
    const ch = s[i];
    if (ch === '#') { i++; c.id = ident(); } else if (ch === '.') { i++; c.classes.push(ident()); } else if (ch === '[') {
      const end = s.indexOf(']', i);
      if (end < 0) throw new SelectorError('A [ in the selector is not closed');
      const body = s.slice(i + 1, end).trim();
      const m = /^([\w-]+)\s*(?:([*^$~]?=)\s*(?:"([^"]*)"|'([^']*)'|([^\]\s]*)))?\s*i?$/.exec(body);
      if (!m) throw new SelectorError(`Cannot read [${body}]`);
      c.attrs.push({ name: m[1].toLowerCase(), op: (m[2] || '') as AttrTest['op'], value: m[3] ?? m[4] ?? m[5] ?? '' });
      i = end + 1;
    } else if (ch === ':') {
      throw new SelectorError('Pseudo-classes such as :hover are not supported in a check');
    } else throw new SelectorError(`Cannot read the selector near "${s.slice(i)}"`);
  }
  return c;
}

function parseComplex(s: string): Step[] {
  const tokens = s.replace(/\s*>\s*/g, ' > ').trim().split(/\s+/);
  const steps: Step[] = [];
  let pending: ' ' | '>' | null = null;
  for (const t of tokens) {
    if (t === '>') { pending = '>'; continue; }
    steps.push({ compound: parseCompound(t), combinator: steps.length ? (pending || ' ') : null });
    pending = null;
  }
  if (!steps.length) throw new SelectorError('Empty selector');
  return steps;
}

/** Throws SelectorError when the selector uses something this matcher does not support. */
export function parseSelector(selector: string): Step[][] {
  const parts = splitTop(String(selector || ''), ',');
  if (!parts.length) throw new SelectorError('Empty selector');
  return parts.map(parseComplex);
}

function matchCompound(e: El, c: Compound): boolean {
  if (c.tag && e.tag !== c.tag) return false;
  if (c.id && e.attrs.id !== c.id) return false;
  if (c.classes.length) {
    const have = new Set((e.attrs.class || '').split(/\s+/).filter(Boolean));
    if (!c.classes.every(k => have.has(k))) return false;
  }
  for (const a of c.attrs) {
    if (!(a.name in e.attrs)) return false;
    const v = e.attrs[a.name];
    const want = a.value;
    const lv = v.toLowerCase(); const lw = want.toLowerCase();
    if (a.op === '=' && lv !== lw) return false;
    if (a.op === '*=' && !lv.includes(lw)) return false;
    if (a.op === '^=' && !lv.startsWith(lw)) return false;
    if (a.op === '$=' && !lv.endsWith(lw)) return false;
    if (a.op === '~=' && !lv.split(/\s+/).includes(lw)) return false;
  }
  return true;
}

function matchSteps(e: El, steps: Step[], k: number): boolean {
  if (!matchCompound(e, steps[k].compound)) return false;
  if (k === 0) return true;
  const comb = steps[k].combinator;
  if (comb === '>') return !!e.parent && e.parent.tag !== '#document' && matchSteps(e.parent, steps, k - 1);
  for (let p = e.parent; p && p.tag !== '#document'; p = p.parent) if (matchSteps(p, steps, k - 1)) return true;
  return false;
}

export function querySelectorAll(root: El, selector: string): El[] {
  const lists = parseSelector(selector);
  return allElements(root).filter(e => lists.some(steps => matchSteps(e, steps, steps.length - 1)));
}

/* ────────────────────────── CSS ────────────────────────── */

/** Every colour written as hex, rgb() or rgba(), as lowercase #rrggbb. */
export function colorsIn(css: string): Set<string> {
  const out = new Set<string>();
  const s = String(css || '');
  for (const m of s.matchAll(/#([0-9a-fA-F]{3,8})\b/g)) {
    const n = normalizeHex(`#${m[1]}`);
    if (n) out.add(n);
  }
  for (const m of s.matchAll(/rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/gi)) {
    out.add(`#${[m[1], m[2], m[3]].map(x => Math.min(255, Number(x)).toString(16).padStart(2, '0')).join('')}`);
  }
  return out;
}

/** #abc, #aabbcc, #aabbccdd (alpha dropped) → #aabbcc; anything else → null. */
export function normalizeHex(v: string): string | null {
  const m = /^#?([0-9a-fA-F]{3,8})$/.exec(String(v || '').trim());
  if (!m) return null;
  let h = m[1].toLowerCase();
  if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split('').map(c => c + c).join('');
  else if (h.length === 8) h = h.slice(0, 6);
  else if (h.length !== 6) return null;
  return `#${h}`;
}

/** Does any font or font-family declaration name this family? */
export function usesFont(css: string, family: string): boolean {
  const want = String(family || '').replace(/["']/g, '').trim().toLowerCase();
  if (!want) return false;
  for (const m of String(css || '').matchAll(/font(?:-family)?\s*:\s*([^;}]+)/gi)) {
    const names = m[1].split(',').map(x => x.replace(/["']/g, '').trim().toLowerCase());
    if (names.some(n => n === want || n.endsWith(` ${want}`))) return true;
  }
  return false;
}
