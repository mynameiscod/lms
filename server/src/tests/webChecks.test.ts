/**
 * Web assignment marking (2026-11-28): the HTML reader, the selector matcher and each kind of check.
 */
import { parseHtml, querySelectorAll, textContent, colorsIn, usesFont, normalizeHex } from '../services/webAssignment/markup';
import { evaluateWebChecks, webAutoScore, requirementProblem, assetKey, cleanFiles, WebRequirement } from '../services/webAssignment/webChecks';
import { shapeGeneratedWeb } from '../services/aiService';

const PAGE = `<!DOCTYPE html>
<html><head><meta name=viewport content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="style.css"><style>h1{color:#E11D48}</style></head>
<body>
  <nav class="top bar"><a href="#">Home</a><a href=#about>About</a></nav>
  <main id="app">
    <h1>Welcome &amp; hello</h1>
    <form action="/login">
      <label>Email <input type="email" name="email" placeholder="you@example.com"></label>
      <input type=password name=password>
      <button type="submit" class="btn primary">Log in</button>
    </form>
    <img src="https://lms.example.com/api/v1/public/assignment-assets/t1/0123456789abcdef01234567.webp" alt="logo">
    <p>Unclosed paragraph
    <ul><li>One<li>Two</ul>
  </main>
  <script>document.title = "<b>not a tag</b>";</script>
</body></html>`;

describe('markup', () => {
  const doc = parseHtml(PAGE);
  test('selectors: tag, class, id, attribute, descendant, child, lists', () => {
    expect(querySelectorAll(doc, 'form input[type=email]')).toHaveLength(1);
    expect(querySelectorAll(doc, 'nav.top.bar > a')).toHaveLength(2);
    expect(querySelectorAll(doc, '#app h1')).toHaveLength(1);
    expect(querySelectorAll(doc, 'button.btn[type="submit"]')).toHaveLength(1);
    expect(querySelectorAll(doc, 'a[href^="#"]')).toHaveLength(2);
    expect(querySelectorAll(doc, 'img[src*=assignment-assets]')).toHaveLength(1);
    expect(querySelectorAll(doc, 'main > form, nav')).toHaveLength(2);
    expect(querySelectorAll(doc, 'body > form')).toHaveLength(0);
    expect(querySelectorAll(doc, 'li').length).toBeGreaterThanOrEqual(2);
  });
  test('script bodies are not parsed as tags, entities decode', () => {
    expect(querySelectorAll(doc, 'b')).toHaveLength(0);
    expect(textContent(doc)).toContain('Welcome & hello');
    expect(textContent(doc)).not.toContain('not a tag');
  });
  test('unsupported selectors say so', () => {
    expect(() => querySelectorAll(doc, 'a:hover')).toThrow(/Pseudo/);
  });
  test('colours and fonts', () => {
    expect(normalizeHex('#ABC')).toBe('#aabbcc');
    expect(normalizeHex('#11223344')).toBe('#112233');
    expect(colorsIn('a{color:#FFF;background:rgb(30, 64, 175)}')).toEqual(new Set(['#ffffff', '#1e40af']));
    expect(usesFont("body{font-family:'Poppins', sans-serif}", 'poppins')).toBe(true);
    expect(usesFont('h1{font:600 2rem/1.2 Playfair Display, serif}', 'Playfair Display')).toBe(true);
    expect(usesFont('body{font-family:Inter}', 'Poppins')).toBe(false);
  });
});

const REQS: WebRequirement[] = [
  { id: 'r1', text: 'Email field in a form', kind: 'element', selector: 'form input[type=email]', points: 2 },
  { id: 'r2', text: 'Says Log in', kind: 'text', value: 'log in', selector: 'button', points: 1 },
  { id: 'r3', text: 'Uses the logo', kind: 'image', value: 'http://localhost:5050/api/v1/public/assignment-assets/t1/0123456789abcdef01234567.webp', points: 1 },
  { id: 'r4', text: 'Primary colour', kind: 'color', value: '#1E40AF', points: 1 },
  { id: 'r5', text: 'Accent colour', kind: 'color', value: '#e11d48', points: 1 },
  { id: 'r6', text: 'Poppins font', kind: 'font', value: 'Poppins', points: 1 },
  { id: 'r7', text: 'Works on mobile', kind: 'responsive', points: 2 },
  { id: 'r8', text: 'Three nav links', kind: 'element', selector: 'nav a', min: 3, points: 1 },
];

describe('evaluateWebChecks', () => {
  const files = [
    { name: 'index.html', code: PAGE },
    { name: 'style.css', code: 'body{font-family:"Poppins",sans-serif;background:rgb(30,64,175)} @media (max-width: 600px){nav{display:none}}' },
  ];
  test('each kind of check reads the real page', () => {
    const r = evaluateWebChecks({ stack: 'html_css', files, requirements: REQS });
    expect(r.map(x => x.passed)).toEqual([true, true, true, true, true, true, true, false]);
    expect(r[7].detail).toBe('2 found, 3 needed');
    // 9 of 10 points on the checklist, at 50% of 100 points = 45
    expect(webAutoScore(r, 100, 50)).toBe(45);
  });
  test('an empty page earns nothing, and no checklist gives no marks', () => {
    const r = evaluateWebChecks({ stack: 'html_css', files: [{ name: 'index.html', code: '' }], requirements: REQS });
    expect(r.every(x => !x.passed)).toBe(true);
    expect(webAutoScore(r, 100, 50)).toBe(0);
    expect(webAutoScore([], 100, 50)).toBe(0);
  });
  test('responsive needs both the viewport tag and a media query', () => {
    const noMedia = evaluateWebChecks({ stack: 'html_css', files: [files[0], { name: 'style.css', code: 'body{}' }], requirements: [REQS[6]] });
    expect(noMedia[0]).toMatchObject({ passed: false, detail: 'Missing a media query' });
    const boot = evaluateWebChecks({ stack: 'bootstrap', files: [{ name: 'index.html', code: '<meta name="viewport" content="x"><div class="row"><div class="col-md-6"></div></div>' }], requirements: [REQS[6]] });
    expect(boot[0].passed).toBe(true);
  });
  test('JS and React stacks read the page from the preview; plain HTML ignores it', () => {
    const shell = [{ name: 'index.html', code: '<div id="root"></div>' }, { name: 'App.jsx', code: 'const [n,setN]=useState(0)' }];
    const rendered = '<html><body><div id="root"><button class="add">Add task</button></div></body></html>';
    const req: WebRequirement[] = [
      { id: 'a', text: 'Add button', kind: 'text', selector: 'button.add', value: 'Add task', points: 1 },
      { id: 'b', text: 'Uses state', kind: 'source', value: 'useState', points: 1 },
    ];
    expect(evaluateWebChecks({ stack: 'react', files: shell, requirements: req, renderedHtml: rendered }).map(x => x.passed)).toEqual([true, true]);
    expect(evaluateWebChecks({ stack: 'html_css', files: shell, requirements: req, renderedHtml: rendered })[0].passed).toBe(false);
  });
  test('a broken selector fails that check only, with the reason', () => {
    const r = evaluateWebChecks({ stack: 'html_css', files, requirements: [{ id: 'x', text: 'x', kind: 'element', selector: 'a:hover', points: 1 }, REQS[0]] });
    expect(r[0]).toMatchObject({ passed: false });
    expect(r[0].detail).toMatch(/Pseudo/);
    expect(r[1].passed).toBe(true);
  });
});

describe('helpers', () => {
  test('requirementProblem refuses what cannot run', () => {
    expect(requirementProblem(REQS)).toBeNull();
    expect(requirementProblem([{ id: '1', text: 'x', kind: 'element', points: 1 }])).toMatch(/needs a selector/);
    expect(requirementProblem([{ id: '1', text: 'x', kind: 'color', value: 'blue', points: 1 }])).toMatch(/not a colour code/);
    expect(requirementProblem([{ id: '1', text: 'x', kind: 'element', selector: 'a:hover', points: 1 }])).toMatch(/Pseudo/);
    expect(requirementProblem([{ id: '1', text: '', kind: 'responsive', points: 1 }])).toMatch(/no description/);
  });
  test('assetKey matches our uploads on any host', () => {
    expect(assetKey('https://a.com/api/v1/public/assignment-assets/t/0123456789abcdef01234567.webp')).toBe('0123456789abcdef01234567.webp');
    expect(assetKey('https://cdn.x.com/img/logo.png')).toBe('/img/logo.png');
  });
  test('cleanFiles keeps only the stack files', () => {
    expect(cleanFiles('html_css', [{ name: 'index.html', code: 'a' }, { name: 'evil.php', code: 'b' }, { name: 'script.js', code: 'c' }]))
      .toEqual([{ name: 'index.html', code: 'a' }]);
  });
});

describe('shapeGeneratedWeb (AI draft)', () => {
  const draft = {
    description: '<p>Build it</p>', instructions: '<ol><li>Go</li></ol>', brief: 'Header, form',
    colors: [{ name: 'Primary', hex: '#1E40AF' }, { name: 'Bad', hex: 'blue' }],
    fonts: [{ family: 'Poppins', weights: '400;600' }],
    requirements: [
      { text: 'Email field', kind: 'element', selector: 'input[type=email]', points: 2 },
      { text: 'Hover effect', kind: 'element', selector: 'a:hover', points: 1 },
      { text: 'Primary colour', kind: 'color', value: '#1e40af', points: 1 },
      { text: 'A footer', kind: 'element', selector: 'footer', points: 1 },
    ],
    starterFiles: { 'index.html': '<!-- start -->', 'style.css': '' },
    solutionFiles: { 'index.html': '<input type="email">', 'style.css': 'body{color:#1e40af}' },
    topics: ['forms'],
  };
  test('keeps checks the reference page passes, drops malformed ones and ones it fails', () => {
    const out = shapeGeneratedWeb(draft, 'html_css');
    expect(out.requirements.map(r => r.text)).toEqual(['Email field', 'Primary colour']);
    expect(out.requirements.map(r => r.id)).toEqual(['r1', 'r2']);
    expect(out.verification).toMatchObject({ requested: 4, kept: 2 });
    expect(out.verification.dropped.join(' ')).toMatch(/Hover effect.*Pseudo/);
    expect(out.verification.dropped.join(' ')).toMatch(/A footer: the reference page did not pass it/);
    expect(out.colors).toEqual([{ name: 'Primary', hex: '#1e40af' }]);
    expect(out.files.map(f => f.name)).toEqual(['index.html', 'style.css']);
  });
  test('on React the page is built at run time, so element checks are kept', () => {
    const out = shapeGeneratedWeb({ ...draft, starterFiles: { 'index.html': '<div id="root"></div>' }, solutionFiles: { 'App.jsx': 'x' } }, 'react');
    expect(out.requirements.map(r => r.text)).toEqual(['Email field', 'A footer']);
  });
  test('no starter files is an error', () => {
    expect(() => shapeGeneratedWeb({ ...draft, starterFiles: {} }, 'html_css')).toThrow(/no starter files/);
  });
});
