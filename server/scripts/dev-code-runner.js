#!/usr/bin/env node
/**
 * DEV-ONLY code runner that speaks Piston's API, for a machine that cannot run Docker.
 *
 *   npm run dev:runner            (in server/)  → http://127.0.0.1:2000/api/v2
 *   server/.env: PISTON_URL=http://127.0.0.1:2000/api/v2   then restart the API
 *
 * ⚠️ NO SANDBOX. It runs submitted code directly on this computer with your user's rights.
 * Anyone who can sit an exam or run code through this API (including over a LAN link) can run
 * programs here. Use it only on a dev machine with test accounts — NEVER in production, where
 * docker-compose runs the real, isolated Piston.
 *
 * It answers the two calls codeRunnerService makes:
 *   GET  /api/v2/runtimes  — what it can run, under the versions the service asks for
 *   POST /api/v2/execute   — { language, version, files:[{name?, content}], stdin, run_timeout }
 * with Piston's response shape: { language, version, run: { stdout, stderr, output, code, signal,
 * cpu_time, wall_time }, compile? }.
 *
 * Languages: Python (python/py on PATH), JavaScript (this Node), Java when javac + java are on
 * PATH. Anything else answers 400, as Piston does for an unknown runtime.
 */
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const HOST = '127.0.0.1';
const PORT = Number(process.env.DEV_RUNNER_PORT || 2000);
const MAX_PARALLEL = 4;
const MAX_OUTPUT = 1024 * 1024;

const has = (cmd, args) => { try { return spawnSync(cmd, args, { stdio: 'ignore', timeout: 5000 }).status === 0; } catch { return false; } };
const PYTHON = ['python', 'py', 'python3'].find(c => has(c, ['--version']));
const JAVA = has('javac', ['-version']) && has('java', ['-version']);

// Versions must equal codeRunnerService.mapToPistonLanguage, which is what it asks for.
const RUNTIMES = [
  ...(PYTHON ? [{ language: 'python', version: '3.10.0', aliases: ['py', 'python3'] }] : []),
  { language: 'javascript', version: '18.15.0', aliases: ['node-javascript', 'js'] },
  ...(JAVA ? [{ language: 'java', version: '15.0.2', aliases: [] }] : []),
];

/** Run one program: resolves Piston's stage object. */
function stage(cmd, args, cwd, stdin, timeoutMs) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(cmd, args, { cwd, windowsHide: true });
    let stdout = '', stderr = '', output = '', signal = null;
    const add = (which) => (d) => {
      const s = d.toString();
      if (output.length < MAX_OUTPUT) { output += s; if (which === 'out') stdout += s; else stderr += s; }
    };
    child.stdout.on('data', add('out'));
    child.stderr.on('data', add('err'));
    const timer = setTimeout(() => { signal = 'SIGKILL'; child.kill('SIGKILL'); }, timeoutMs);
    child.on('error', (e) => { stderr += String(e.message); });
    child.on('close', (code) => {
      clearTimeout(timer);
      const ms = Date.now() - started;
      // As Piston (Linux) would report it: \n line endings, and no path of this machine's temp folder.
      const clean = (s) => s.replace(/\r\n/g, '\n').split(cwd + path.sep).join('').split(cwd).join('');
      resolve({ stdout: clean(stdout), stderr: clean(stderr), output: clean(output), code: signal ? null : code, signal, cpu_time: ms, wall_time: ms });
    });
    child.stdin.on('error', () => undefined);
    child.stdin.end(stdin || '');
  });
}

async function execute(body) {
  const rt = RUNTIMES.find(r => r.language === body.language || r.aliases.includes(body.language));
  if (!rt) return { status: 400, json: { message: `${body.language}-${body.version} runtime is unknown` } };
  const file = (body.files || [])[0] || {};
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devrun-'));
  const timeout = Math.min(Math.max(Number(body.run_timeout) || 3000, 1000), 30000);
  try {
    if (rt.language === 'python') {
      fs.writeFileSync(path.join(dir, 'main.py'), file.content || '');
      // -I: isolated mode, so a student file named like a module cannot shadow the stdlib.
      return { status: 200, json: { language: rt.language, version: rt.version, run: await stage(PYTHON, ['-I', 'main.py'], dir, body.stdin, timeout) } };
    }
    if (rt.language === 'javascript') {
      fs.writeFileSync(path.join(dir, 'main.js'), file.content || '');
      return { status: 200, json: { language: rt.language, version: rt.version, run: await stage(process.execPath, ['main.js'], dir, body.stdin, timeout) } };
    }
    // Java: compile, then run the class the file is named after.
    const name = file.name && /\.java$/.test(file.name) ? file.name : 'Main.java';
    fs.writeFileSync(path.join(dir, name), file.content || '');
    const compile = await stage('javac', [name], dir, '', 20000);
    if (compile.code !== 0) return { status: 200, json: { language: rt.language, version: rt.version, compile, run: { stdout: '', stderr: '', output: '', code: null, signal: null } } };
    return { status: 200, json: { language: rt.language, version: rt.version, compile, run: await stage('java', ['-cp', '.', name.replace(/\.java$/, '')], dir, body.stdin, timeout) } };
  } finally {
    fs.rm(dir, { recursive: true, force: true }, () => undefined);
  }
}

let running = 0;
const queue = [];
const slot = () => new Promise(r => (running < MAX_PARALLEL ? (running++, r()) : queue.push(r)));
const release = () => { const next = queue.shift(); if (next) next(); else running--; };

const server = http.createServer((req, res) => {
  const send = (status, json) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(json)); };
  if (req.method === 'GET' && req.url === '/api/v2/runtimes') return send(200, RUNTIMES);
  if (req.method !== 'POST' || req.url !== '/api/v2/execute') return send(404, { message: 'Not found' });
  let raw = '';
  req.on('data', (d) => { raw += d; if (raw.length > 5 * 1024 * 1024) req.destroy(); });
  req.on('end', async () => {
    let body;
    try { body = JSON.parse(raw); } catch { return send(400, { message: 'Invalid JSON' }); }
    await slot();
    try { const r = await execute(body); send(r.status, r.json); }
    catch (e) { send(500, { message: String(e && e.message || e) }); }
    finally { release(); }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[dev-code-runner] http://${HOST}:${PORT}/api/v2 — NO SANDBOX, dev only`);
  console.log(`[dev-code-runner] runs: ${RUNTIMES.map(r => r.language).join(', ')}${JAVA ? '' : ' (install a JDK for Java)'}`);
});
