#!/usr/bin/env node
/**
 * check-event-schema-sync.js — prove the execution-event schema is identical on both sides.
 *
 *   node scripts/check-event-schema-sync.js          # check; exits 1 on any difference
 *   node scripts/check-event-schema-sync.js --fix    # copy server -> client, then check
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────────────────────
 *
 * The visualizer's event schema is duplicated: the server emits these events and the client
 * renders them, and both need the types. The Phase 0 design put it in the `shared/` workspace,
 * but `shared/` is not a working package — its `main` points at a file that does not exist, it
 * emits no type declarations, neither app depends on it, and the Dockerfile never copies it, so
 * an import would fail the deploy rather than the test run.
 *
 * Duplication is the cheaper trade for one file of types. What makes it safe is that the copies
 * cannot drift silently: this runs in CI, and a one-character difference fails the build with a
 * diff. Without it, duplication is just two files that slowly stop agreeing — and the failure
 * mode is the renderer quietly mis-reading an event, which looks like a bug in the student's
 * code rather than in ours.
 *
 * SERVER IS THE SOURCE OF TRUTH. It is where events are produced. --fix copies in that
 * direction only, so there is never a question of which edit wins.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'server', 'src', 'types', 'executionEvents.ts');
const MIRROR = path.join(ROOT, 'client', 'src', 'types', 'executionEvents.ts');

const FIX = process.argv.includes('--fix');

const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');

if (!fs.existsSync(SOURCE)) {
  console.error(`✗ Source of truth is missing: ${rel(SOURCE)}`);
  process.exit(1);
}

/*
 * Compared with line endings normalised.
 *
 * This repository is edited on Windows with core.autocrlf, so one copy can legitimately be CRLF
 * in the working tree while the other is LF. Failing on that would be a check that cries wolf
 * every time somebody touches the file on a different machine, and a check people learn to
 * ignore is worse than no check. Content is what matters; git stores LF for both.
 */
const normalise = (s) => s.replace(/\r\n/g, '\n');

const source = normalise(fs.readFileSync(SOURCE, 'utf8'));

if (FIX) {
  fs.mkdirSync(path.dirname(MIRROR), { recursive: true });
  const existing = fs.existsSync(MIRROR) ? normalise(fs.readFileSync(MIRROR, 'utf8')) : null;
  if (existing === source) {
    console.log(`✓ ${rel(MIRROR)} already matches. Nothing to do.`);
  } else {
    fs.writeFileSync(MIRROR, source);
    console.log(`✓ Copied ${rel(SOURCE)} → ${rel(MIRROR)}`);
  }
}

if (!fs.existsSync(MIRROR)) {
  console.error(`✗ Missing: ${rel(MIRROR)}`);
  console.error('  Run: node scripts/check-event-schema-sync.js --fix');
  process.exit(1);
}

const mirror = normalise(fs.readFileSync(MIRROR, 'utf8'));

if (mirror === source) {
  const lines = source.split('\n').length;
  console.log(`✓ Execution-event schema is in sync (${lines} lines).`);
  console.log(`    ${rel(SOURCE)}`);
  console.log(`    ${rel(MIRROR)}`);
  process.exit(0);
}

/* ── Differ. Show WHERE, not just that. ──────────────────────────────────────────────────── */
const a = source.split('\n');
const b = mirror.split('\n');

console.error('✗ The execution-event schema has DRIFTED between server and client.\n');
console.error(`  source: ${rel(SOURCE)}  (${a.length} lines)`);
console.error(`  mirror: ${rel(MIRROR)}  (${b.length} lines)\n`);

let shown = 0;
for (let i = 0; i < Math.max(a.length, b.length) && shown < 20; i++) {
  if (a[i] === b[i]) continue;
  console.error(`  line ${i + 1}:`);
  console.error(`    server: ${a[i] === undefined ? '(absent)' : a[i]}`);
  console.error(`    client: ${b[i] === undefined ? '(absent)' : b[i]}`);
  shown++;
}
if (shown === 20) console.error('\n  ... more differences not shown.');

console.error('\n  The SERVER copy is the source of truth — it is where events are produced.');
console.error('  If the server copy is right:  node scripts/check-event-schema-sync.js --fix');
console.error('  If the client copy is right:  port the change into the server copy, then --fix.');
process.exit(1);
