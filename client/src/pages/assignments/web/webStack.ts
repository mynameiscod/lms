/**
 * Web (frontend) assignments on the client: the stacks, their starter files, and the page the preview
 * runs. The server marks against the same file names (server/src/services/webAssignment/webChecks.ts).
 */

export type WebStack = 'html_css' | 'html_css_js' | 'bootstrap' | 'react';
export type CheckKind = 'element' | 'text' | 'image' | 'color' | 'font' | 'responsive' | 'source';

export interface WebFile { name: string; code: string }
export interface WebAsset { url: string; name: string; note?: string }
export interface WebColor { name: string; hex: string }
export interface WebFont { family: string; weights: string }
export interface WebRequirement {
  id: string;
  text: string;
  kind: CheckKind;
  selector?: string;
  value?: string;
  min?: number;
  points: number;
}
export interface WebAssignmentConfig {
  stack: WebStack;
  files: WebFile[];
  brief: string;
  referenceImages: WebAsset[];
  assets: WebAsset[];
  colors: WebColor[];
  fonts: WebFont[];
  requirements: WebRequirement[];
  autoWeight: number;
  aiFeedback: boolean;
}
export interface WebCheckResult { id: string; text: string; kind: CheckKind; passed: boolean; points: number; detail: string }

export const STACKS: { value: WebStack; label: string; short: string; files: string[]; hint: string }[] = [
  { value: 'html_css', label: 'HTML + CSS', short: 'HTML/CSS', files: ['index.html', 'style.css'], hint: 'Static pages: layout, typography, forms.' },
  { value: 'html_css_js', label: 'HTML + CSS + JavaScript', short: 'HTML/CSS/JS', files: ['index.html', 'style.css', 'script.js'], hint: 'Pages that react: menus, tabs, form checks, small apps.' },
  { value: 'bootstrap', label: 'HTML + CSS + Bootstrap 5', short: 'Bootstrap', files: ['index.html', 'style.css', 'script.js'], hint: 'Bootstrap is loaded for the student; grid, navbar, cards.' },
  { value: 'react', label: 'React 18 (JSX)', short: 'React', files: ['index.html', 'App.jsx', 'style.css'], hint: 'Components and hooks in App.jsx; React is loaded for the student.' },
];
export const stackOf = (v?: string) => STACKS.find(s => s.value === v) || STACKS[0];

export const CHECK_KINDS: { value: CheckKind; label: string; needs: 'selector' | 'value' | 'both' | 'none'; placeholder: string }[] = [
  { value: 'element', label: 'Has element', needs: 'selector', placeholder: 'form input[type=email]' },
  { value: 'text', label: 'Shows text', needs: 'both', placeholder: 'Sign in' },
  { value: 'image', label: 'Uses image', needs: 'value', placeholder: 'image link' },
  { value: 'color', label: 'Uses colour', needs: 'value', placeholder: '#1e40af' },
  { value: 'font', label: 'Uses font', needs: 'value', placeholder: 'Poppins' },
  { value: 'responsive', label: 'Works on mobile', needs: 'none', placeholder: '' },
  { value: 'source', label: 'Code contains', needs: 'value', placeholder: 'addEventListener' },
];

export const monacoLanguage = (name: string) =>
  name.endsWith('.html') ? 'html' : name.endsWith('.css') ? 'css' : 'javascript';

const BOOTSTRAP_CSS = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css';
const BOOTSTRAP_JS = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js';
const REACT_JS = 'https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.development.js';
const REACT_DOM_JS = 'https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.development.js';
const BABEL_JS = 'https://cdn.jsdelivr.net/npm/@babel/standalone@7.26.4/babel.min.js';

/** The <link> line a student pastes into <head> for the brief's fonts. */
export function googleFontsLink(fonts: WebFont[]): string {
  const fams = fonts.filter(f => f.family.trim());
  if (!fams.length) return '';
  const q = fams.map(f => {
    const w = (f.weights || '400').split(/[;,\s]+/).filter(Boolean).map(Number).filter(n => n >= 100 && n <= 900).sort((a, b) => a - b);
    return `family=${encodeURIComponent(f.family.trim()).replace(/%20/g, '+')}${w.length ? `:wght@${w.join(';')}` : ''}`;
  }).join('&');
  return `<link href="https://fonts.googleapis.com/css2?${q}&display=swap" rel="stylesheet">`;
}

/** The files a new assignment starts with: boilerplate and links only, never the brief's colours or fonts in CSS. */
export function starterFiles(stack: WebStack, fonts: WebFont[], title = 'My page'): WebFile[] {
  const fontLink = googleFontsLink(fonts);
  const head = [
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    `<title>${title.replace(/[<>]/g, '')}</title>`,
    fontLink && '<link rel="preconnect" href="https://fonts.googleapis.com">',
    fontLink,
    stack === 'bootstrap' && `<link href="${BOOTSTRAP_CSS}" rel="stylesheet">`,
    '<link rel="stylesheet" href="style.css">',
  ].filter(Boolean).map(l => `  ${l}`).join('\n');
  const css = '/* Use the colours and fonts from the Design tab. */\n\n';
  if (stack === 'react') {
    return [
      { name: 'index.html', code: `<!DOCTYPE html>\n<html lang="en">\n<head>\n${head}\n</head>\n<body>\n  <div id="root"></div>\n  <!-- App.jsx runs here: React 18 is loaded for you. -->\n</body>\n</html>\n` },
      { name: 'App.jsx', code: 'function App() {\n  return (\n    <main>\n      <h1>Hello</h1>\n    </main>\n  );\n}\n\nReactDOM.createRoot(document.getElementById("root")).render(<App />);\n' },
      { name: 'style.css', code: css },
    ];
  }
  const scripts = stack === 'html_css' ? '' : `${stack === 'bootstrap' ? `  <script src="${BOOTSTRAP_JS}"></script>\n` : ''}  <script src="script.js"></script>\n`;
  const files: WebFile[] = [
    { name: 'index.html', code: `<!DOCTYPE html>\n<html lang="en">\n<head>\n${head}\n</head>\n<body>\n\n  <!-- Build the page here. -->\n\n${scripts}</body>\n</html>\n` },
    { name: 'style.css', code: css },
  ];
  if (stack !== 'html_css') files.push({ name: 'script.js', code: '// Your JavaScript here.\n' });
  return files;
}

/** Every file of the stack, in tab order: the given code where there is some, the starter otherwise. */
export function filesForStack(stack: WebStack, given: WebFile[] | undefined, fonts: WebFont[] = [], title?: string): WebFile[] {
  const starter = starterFiles(stack, fonts, title);
  return stackOf(stack).files.map(name => {
    const g = (given || []).find(f => f.name === name);
    return g ? { name, code: g.code } : (starter.find(f => f.name === name) || { name, code: '' });
  });
}

const safeScript = (code: string) => code.replace(/<\/script/gi, '<\\/script');

/**
 * Runs inside the preview. Sends console output and errors to the workspace, and on request the page
 * as it stands now (for marking the JavaScript/React stacks). The frame is sandboxed without
 * same-origin, so postMessage is the only way anything gets out of it.
 */
const BRIDGE = `<script data-cb-bridge>(function(){
  /* The frame has no origin of its own, so the browser refuses localStorage there; a page that saves
     to it (a to-do list) gets an in-memory one instead of an error. It lasts until the page reloads. */
  try { window.localStorage.getItem('x'); } catch (e) {
    var mk = function(){ var d = {}; return { getItem: function(k){ return Object.prototype.hasOwnProperty.call(d, k) ? d[k] : null; }, setItem: function(k, v){ d[k] = String(v); }, removeItem: function(k){ delete d[k]; }, clear: function(){ d = {}; }, key: function(i){ return Object.keys(d)[i] || null; }, get length(){ return Object.keys(d).length; } }; };
    try { Object.defineProperty(window, 'localStorage', { value: mk(), configurable: true }); Object.defineProperty(window, 'sessionStorage', { value: mk(), configurable: true }); } catch (e2) {}
  }
  function send(m){ try { parent.postMessage(Object.assign({ __cbPreview: 1 }, m), '*'); } catch (e) {} }
  function fmt(a){ try { return typeof a === 'string' ? a : (a instanceof Error ? a.message : JSON.stringify(a)); } catch (e) { return String(a); } }
  ['log','info','warn','error'].forEach(function(level){
    var orig = console[level];
    console[level] = function(){ var args = [].slice.call(arguments); send({ type: 'console', level: level, text: args.map(fmt).join(' ') }); try { orig.apply(console, args); } catch (e) {} };
  });
  window.addEventListener('error', function(e){ send({ type: 'console', level: 'error', text: (e.message || 'Error') + (e.lineno ? ' (line ' + e.lineno + ')' : '') }); });
  window.addEventListener('unhandledrejection', function(e){ send({ type: 'console', level: 'error', text: 'Unhandled promise: ' + fmt(e.reason) }); });
  window.addEventListener('message', function(e){
    if (!e.data || e.data.__cbPreview !== 'snapshot') return;
    var doc = document.documentElement.cloneNode(true);
    [].slice.call(doc.querySelectorAll('[data-cb-bridge],[data-cb-lib]')).forEach(function(n){ n.parentNode.removeChild(n); });
    send({ type: 'snapshot', id: e.data.id, html: '<!DOCTYPE html>' + doc.outerHTML });
  });
})();<\/script>`;

function insertBefore(html: string, closing: RegExp, chunk: string, fallback: 'start' | 'end'): string {
  const m = closing.exec(html);
  if (m) return html.slice(0, m.index) + chunk + html.slice(m.index);
  return fallback === 'start' ? chunk + html : html + chunk;
}

/** One HTML document from the files: style.css and script.js inlined where they are linked, React wired up. */
export function buildPreviewDoc(stack: WebStack, files: WebFile[], opts: { bridge?: boolean } = {}): string {
  const get = (n: string) => files.find(f => f.name === n)?.code || '';
  let html = get('index.html') || '<!DOCTYPE html><html><head></head><body></body></html>';
  const css = get('style.css');
  const styleTag = `<style>\n${css}\n</style>`;
  const linkRe = /<link\b[^>]*href\s*=\s*["']?\.?\/?style\.css["']?[^>]*>/i;
  if (linkRe.test(html)) html = html.replace(linkRe, () => styleTag);
  else if (css.trim()) html = insertBefore(html, /<\/head>/i, styleTag, 'start');

  if (stack === 'react') {
    html = html.replace(/<script\b[^>]*src\s*=\s*["']?\.?\/?App\.jsx["']?[^>]*>\s*<\/script>/i, '');
    const libs = [REACT_JS, REACT_DOM_JS, BABEL_JS].map(src => `<script data-cb-lib src="${src}"></script>`).join('\n');
    const app = `<script data-cb-lib type="text/babel" data-presets="react">\n${safeScript(get('App.jsx'))}\n</script>`;
    html = insertBefore(html, /<\/body>/i, `${libs}\n${app}\n`, 'end');
  } else if (stack !== 'html_css') {
    const js = get('script.js');
    const scriptRe = /<script\b[^>]*src\s*=\s*["']?\.?\/?script\.js["']?[^>]*>\s*<\/script>/i;
    const tag = `<script>\n${safeScript(js)}\n</script>`;
    if (scriptRe.test(html)) html = html.replace(scriptRe, () => tag);
    else if (js.trim()) html = insertBefore(html, /<\/body>/i, tag, 'end');
  }
  if (opts.bridge !== false) {
    html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => `${m}${BRIDGE}`) : BRIDGE + html;
  }
  return html;
}

/** The absolute link of an uploaded image (the server returns a path under the API). */
export function absoluteAssetUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = process.env.REACT_APP_API_URL || '/api/v1';
  const abs = new URL(base.replace(/\/$/, ''), window.location.origin).href.replace(/\/$/, '');
  return `${abs}${path.startsWith('/') ? '' : '/'}${path}`;
}

/** A trainer rubric for the part of the mark the checklist does not give. */
export function defaultWebRubric(manualPoints: number) {
  const parts = [
    { criterion: 'Layout matches the design', description: 'Sections, spacing and alignment follow the brief and the reference images.', share: 0.35 },
    { criterion: 'Colours, fonts & images', description: 'Uses the given palette, fonts and images, consistently.', share: 0.25 },
    { criterion: 'Responsive', description: 'Looks right on a phone, a tablet and a desktop.', share: 0.2 },
    { criterion: 'Code quality', description: 'Clean, semantic HTML, organised CSS/JS, sensible names.', share: 0.2 },
  ];
  let left = manualPoints;
  return parts.map((p, i) => {
    const pts = i === parts.length - 1 ? left : Math.round(manualPoints * p.share);
    left -= pts;
    return { criterion: p.criterion, description: p.description, maxPoints: Math.max(0, pts), order: i };
  });
}

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

export const emptyWebConfig = (stack: WebStack = 'html_css'): WebAssignmentConfig => ({
  stack, files: starterFiles(stack, []), brief: '', referenceImages: [], assets: [], colors: [], fonts: [],
  requirements: [], autoWeight: 50, aiFeedback: true,
});
