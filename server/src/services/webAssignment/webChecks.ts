/**
 * Marking a web (frontend) assignment against its checklist.
 *
 * WHAT IS CHECKED. Each requirement on the assignment is one plain-language line ("A login form with
 * an email field") with one machine check behind it. The checks look at what a student really built:
 *   element    — at least N elements match a CSS selector            (form input[type=email])
 *   text       — the page shows this text, optionally inside a selector  ("Login" in button)
 *   image      — one of the assignment's images is used (img src, srcset, CSS url())
 *   color      — the CSS uses this colour (hex/rgb, any case or short form)
 *   font       — a font / font-family declaration names this family
 *   responsive — a viewport meta tag, and a media query (or Bootstrap grid classes on that stack)
 *   source     — a file contains this code (e.g. useState, addEventListener)
 *
 * WHICH PAGE. On HTML/CSS the page is the student's own index.html. On the JavaScript and React stacks
 * the page is built by the code as it runs, so the workspace sends the page as it stood in the preview
 * when Submit was pressed and the element/text checks read that; with no snapshot, index.html is used.
 *
 * An empty page passes nothing, and an assignment with no requirements gives no automatic marks — the
 * trainer's rubric carries the whole grade. Nothing here can hand out marks for nothing.
 */
import { El, parseHtml, querySelectorAll, textContent, rawBodies, colorsIn, normalizeHex, usesFont, SelectorError, allElements } from './markup';

export const WEB_STACKS = ['html_css', 'html_css_js', 'bootstrap', 'react'] as const;
export type WebStack = typeof WEB_STACKS[number];
export const CHECK_KINDS = ['element', 'text', 'image', 'color', 'font', 'responsive', 'source'] as const;
export type CheckKind = typeof CHECK_KINDS[number];

export interface WebFile { name: string; code: string }
export interface WebRequirement {
  id: string;
  text: string;
  kind: CheckKind;
  selector?: string;
  value?: string;
  min?: number;
  points: number;
}
export interface WebCheckResult {
  id: string;
  text: string;
  kind: CheckKind;
  passed: boolean;
  points: number;
  detail: string;
}

/** The files each stack starts with, in tab order. */
export const STACK_FILES: Record<WebStack, string[]> = {
  html_css: ['index.html', 'style.css'],
  html_css_js: ['index.html', 'style.css', 'script.js'],
  bootstrap: ['index.html', 'style.css', 'script.js'],
  react: ['index.html', 'App.jsx', 'style.css'],
};

export const isWebStack = (v: unknown): v is WebStack => typeof v === 'string' && (WEB_STACKS as readonly string[]).includes(v);

/** Only the stack's own file names, each at most 200 KB; anything else in a request is dropped. */
export function cleanFiles(stack: WebStack, raw: unknown): WebFile[] {
  const list = Array.isArray(raw) ? raw : [];
  const allowed = STACK_FILES[stack];
  const out: WebFile[] = [];
  for (const name of allowed) {
    const f: any = list.find((x: any) => x && x.name === name);
    if (f && typeof f.code === 'string') out.push({ name, code: f.code.slice(0, 200_000) });
  }
  return out;
}

const fileOf = (files: WebFile[], name: string) => files.find(f => f.name === name)?.code || '';
const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

/** One file for the record and for anything that reads Submission.code (plagiarism, older screens). */
export function combinedCode(files: WebFile[]): string {
  return files.map(f => `/* ===== ${f.name} ===== */\n${f.code}`).join('\n\n');
}

export function evaluateWebChecks(input: {
  stack: WebStack;
  files: WebFile[];
  requirements: WebRequirement[];
  /** The page from the preview at submit time; only used on the JavaScript and React stacks. */
  renderedHtml?: string;
}): WebCheckResult[] {
  const { stack, files, requirements } = input;
  const sourceHtml = fileOf(files, 'index.html');
  const usesScript = stack !== 'html_css';
  const pageHtml = usesScript && input.renderedHtml && input.renderedHtml.trim() ? input.renderedHtml : sourceHtml;
  const page = parseHtml(pageHtml);
  const source = parseHtml(sourceHtml);
  const cssText = [
    fileOf(files, 'style.css'),
    ...rawBodies(source, 'style'),
    ...rawBodies(page, 'style'),
    ...allElements(page).map(e => e.attrs.style || '').filter(Boolean),
  ].join('\n');
  const allSource = files.map(f => f.code).join('\n');
  const body = allElements(page).find(e => e.tag === 'body') || page;

  return (requirements || []).map((r): WebCheckResult => {
    const base = { id: r.id, text: r.text, kind: r.kind, points: Math.max(0, Number(r.points) || 0) };
    try {
      const { passed, detail } = runOne(r, { stack, page, source, body, cssText, allSource, pageHtml, sourceHtml, files });
      return { ...base, passed, detail };
    } catch (e: any) {
      return { ...base, passed: false, detail: e instanceof SelectorError ? `Check could not run: ${e.message}` : 'Check could not run' };
    }
  });
}

interface Ctx {
  stack: WebStack; page: El; source: El; body: El; cssText: string; allSource: string;
  pageHtml: string; sourceHtml: string; files: WebFile[];
}

function runOne(r: WebRequirement, c: Ctx): { passed: boolean; detail: string } {
  switch (r.kind) {
    case 'element': {
      const min = Math.max(1, Math.floor(Number(r.min) || 1));
      const n = querySelectorAll(c.page, r.selector || '').length;
      return { passed: n >= min, detail: `${n} found${min > 1 ? `, ${min} needed` : ''}` };
    }
    case 'text': {
      const want = norm(r.value || '');
      if (!want) return { passed: false, detail: 'No text set for this check' };
      const scope = r.selector ? querySelectorAll(c.page, r.selector) : [c.body];
      const hit = scope.some(e => norm(textContent(e)).includes(want)
        || [e, ...allElements(e)].some(x => norm(x.attrs.placeholder || x.attrs.value || x.attrs.alt || '').includes(want)));
      return { passed: hit, detail: hit ? 'Found' : 'Not on the page' };
    }
    case 'image': {
      const key = assetKey(r.value || '');
      if (!key) return { passed: false, detail: 'No image set for this check' };
      const hit = c.pageHtml.includes(key) || c.cssText.includes(key) || c.allSource.includes(key);
      return { passed: hit, detail: hit ? 'Used' : 'Not used' };
    }
    case 'color': {
      const want = normalizeHex(r.value || '');
      if (!want) return { passed: false, detail: 'No colour set for this check' };
      const hit = colorsIn(c.cssText).has(want) || colorsIn(c.allSource).has(want);
      return { passed: hit, detail: hit ? 'Used' : 'Not used in the CSS' };
    }
    case 'font': {
      const hit = usesFont(c.cssText, r.value || '') || usesFont(c.allSource, r.value || '');
      return { passed: hit, detail: hit ? 'Used' : 'Not used in a font-family' };
    }
    case 'responsive': {
      const viewport = allElements(c.source).concat(allElements(c.page))
        .some(e => e.tag === 'meta' && (e.attrs.name || '').toLowerCase() === 'viewport');
      const media = /@media[^{]*\(/i.test(c.cssText) || /@media[^{]*\(/i.test(c.allSource);
      const grid = c.stack === 'bootstrap' && allElements(c.page).some(e => /\bcol-(sm|md|lg|xl|xxl)-?\d*\b|\brow-cols-/.test(e.attrs.class || ''));
      const passed = viewport && (media || grid);
      const missing = [!viewport && 'a viewport meta tag', !(media || grid) && (c.stack === 'bootstrap' ? 'a media query or Bootstrap grid classes' : 'a media query')].filter(Boolean);
      return { passed, detail: passed ? 'Has a mobile layout' : `Missing ${missing.join(' and ')}` };
    }
    case 'source': {
      const want = String(r.value || '');
      if (!want.trim()) return { passed: false, detail: 'No code set for this check' };
      const hit = c.allSource.includes(want);
      return { passed: hit, detail: hit ? 'Found in the code' : 'Not in the code' };
    }
    default:
      return { passed: false, detail: 'Unknown check' };
  }
}

/**
 * What identifies an uploaded image wherever the page is opened. The full URL carries a host that
 * differs between the trainer's screen, the student's and the server, so the stable part is matched:
 * the stored file name for our own uploads, else the URL without its scheme and host.
 */
export function assetKey(url: string): string {
  const s = String(url || '').trim();
  const own = /assignment-assets\/[^/]+\/([a-f0-9]{24}\.\w+)/i.exec(s);
  if (own) return own[1];
  return s.replace(/^https?:\/\/[^/]+/i, '');
}

/** Points earned on the checklist, as a share of the automatic part of the mark. */
export function webAutoScore(results: WebCheckResult[], totalPoints: number, autoWeight: number): number {
  const total = results.reduce((s, r) => s + r.points, 0);
  if (!total) return 0;
  const earned = results.filter(r => r.passed).reduce((s, r) => s + r.points, 0);
  const share = Math.min(100, Math.max(0, Number(autoWeight) || 0)) / 100;
  return Math.round((earned / total) * totalPoints * share);
}

/** Check a requirement list before it is saved; returns the first problem, or null. */
export function requirementProblem(reqs: WebRequirement[]): string | null {
  for (const [i, r] of (reqs || []).entries()) {
    const n = `Requirement ${i + 1}`;
    if (!r.text?.trim()) return `${n} has no description`;
    if (!(CHECK_KINDS as readonly string[]).includes(r.kind)) return `${n} has an unknown check type`;
    if (r.kind === 'element' || (r.kind === 'text' && r.selector)) {
      if (r.kind === 'element' && !r.selector?.trim()) return `${n} needs a selector`;
      try { querySelectorAll(parseHtml(''), r.selector || '*'); } catch (e: any) { return `${n}: ${e.message}`; }
    }
    if (['text', 'image', 'color', 'font', 'source'].includes(r.kind) && !String(r.value || '').trim()) return `${n} needs a value`;
    if (r.kind === 'color' && !normalizeHex(r.value || '')) return `${n}: "${r.value}" is not a colour code like #1a2b3c`;
  }
  return null;
}
