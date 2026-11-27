import { WfCondition, WfPath } from '../../models/Workflow';

/**
 * Conditions, {{placeholders}} and keyword matching. Pure: the engine hands in a `resolve(field)`
 * that knows the lead, the answers, the last message and the office hours.
 */

export type Resolve = (field: string) => any;

const norm = (v: any) => String(v ?? '').trim().toLowerCase();
const num = (v: any) => {
  const n = Number(String(v ?? '').replace(/[, ]/g, ''));
  return String(v ?? '').trim() !== '' && Number.isFinite(n) ? n : null;
};
const asList = (v: any): string[] => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]).map(norm).filter(Boolean);

export function testCondition(c: WfCondition, resolve: Resolve): boolean {
  const actual = resolve(c.field);
  const values = asList(actual);
  const wanted = Array.isArray(c.value) ? c.value.map(norm).filter(Boolean) : String(c.value ?? '').split(',').map(norm).filter(Boolean);
  const want = norm(Array.isArray(c.value) ? c.value[0] : c.value);
  switch (c.op) {
    case 'empty': return values.length === 0;
    case 'not_empty': return values.length > 0;
    case 'is': return wanted.length ? values.some((v) => wanted.includes(v)) : values.length === 0;
    case 'is_not': return !values.some((v) => wanted.includes(v));
    case 'contains': return !!want && values.some((v) => wanted.some((w) => v.includes(w)));
    case 'not_contains': return !values.some((v) => wanted.some((w) => v.includes(w)));
    case 'starts_with': return !!want && values.some((v) => v.startsWith(want));
    case 'gt': case 'gte': case 'lt': case 'lte': {
      const a = num(Array.isArray(actual) ? actual[0] : actual), b = num(Array.isArray(c.value) ? c.value[0] : c.value);
      if (a == null || b == null) return false;
      return c.op === 'gt' ? a > b : c.op === 'gte' ? a >= b : c.op === 'lt' ? a < b : a <= b;
    }
    default: return false;
  }
}

/** All (or any) of the path's conditions hold. A path with no conditions is "everyone else". */
export function pathMatches(p: WfPath, resolve: Resolve): boolean {
  if (!p.conditions?.length) return true;
  return p.match === 'any' ? p.conditions.some((c) => testCondition(c, resolve)) : p.conditions.every((c) => testCondition(c, resolve));
}

/** The first matching path (paths are checked top to bottom, like the builder shows them left to right). */
export function choosePath(paths: WfPath[], resolve: Resolve): WfPath | null {
  return (paths || []).find((p) => pathMatches(p, resolve)) || null;
}

/** Replace {{ name }}, {{answer.x}}, … — unknown placeholders become empty, never "{{…}}" in a message. */
export function render(text: string, resolve: Resolve): string {
  return String(text || '').replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_m, key) => {
    const v = resolve(key);
    if (v == null) return '';
    return Array.isArray(v) ? v.filter(Boolean).join(', ') : String(v);
  });
}

/** Does the message match any keyword? 'contains' matches whole words/phrases; 'exact' the whole message. */
export function matchKeyword(message: string, keywords: string[], mode: 'contains' | 'exact' = 'contains'): string | null {
  const m = norm(message).replace(/\s+/g, ' ');
  if (!m) return null;
  for (const raw of keywords || []) {
    const k = norm(raw).replace(/\s+/g, ' ');
    if (!k) continue;
    if (mode === 'exact') { if (m === k) return raw; continue; }
    const esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(^|[^\\p{L}\\p{N}])${esc}($|[^\\p{L}\\p{N}])`, 'u').test(m)) return raw;
  }
  return null;
}

/** Which option did the person pick? Exact title, its number ("2"), or a unique start ("java" → "Java Full Stack"). */
export function matchOption(reply: string, options: string[]): string | null {
  const r = norm(reply);
  if (!r) return null;
  const exact = options.find((o) => norm(o) === r);
  if (exact) return exact;
  const n = Number(r);
  if (Number.isInteger(n) && n >= 1 && n <= options.length) return options[n - 1];
  const starts = options.filter((o) => norm(o).startsWith(r) || r.startsWith(norm(o)));
  return starts.length === 1 ? starts[0] : null;
}

export const OPT_OUT_WORDS = ['stop', 'unsubscribe', 'stop messages', 'opt out', 'optout'];
export const OPT_IN_WORDS = ['start', 'subscribe', 'unstop'];
