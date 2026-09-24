# CI

One workflow, `.github/workflows/ci.yml`, answering one question:

> Does this repository still build, typecheck and pass its automated tests?

It deploys nothing, touches no production system, and requires no secrets.

## Triggers

- Every push to `master`
- Every pull request

Superseded runs on the same branch or PR are cancelled (`concurrency`, `cancel-in-progress`).

## Environment

| | |
|---|---|
| Runner | `ubuntu-latest` |
| Node | **18** |
| Package manager | **npm**, `npm ci` from the repository root |
| Permissions | `contents: read` only |
| Timeouts | 20 min (server, client), 10 min (shared, repository safety) |

**Why Node 18** — it is what actually runs this code. `Dockerfile` uses `node:18-alpine` in all
three stages, and production reports `v18.20.8`. Root `package.json` declares
`engines.node >= 16`, which 18 satisfies. Pinned deliberately rather than tracking latest.

**Why one root install** — the root `package.json` declares npm workspaces
(`client`, `server`, `shared`) and `package-lock.json` is lockfile v3 with all three linked, so
a single `npm ci` installs everything. `npm install` is never used: it can resolve differently
from the lockfile.

## Jobs

| Job | Steps |
|---|---|
| **Shared** | install → `npm run build --workspace=shared` |
| **Server** | install → `npm run build --workspace=server` → `npm test --workspace=server -- --ci` |
| **Client** | install → `npm run build --workspace=client` → `npm test --workspace=client -- --watchAll=false` |
| **Repository Safety** | CRLF check → `bash -n` on every shell script → `docker compose config --quiet` |

Four independent jobs so a frontend failure cannot hide a backend result.

## Environment variables CI sets

All are non-secret. There are no repository secrets and none are needed.

| Variable | Job | Why |
|---|---|---|
| `NODE_ENV=test` | Server tests | Standard test environment |
| `CI=false` | Client **build** | See below — this one matters |
| `CI=true` | Client **tests** | Stops `react-scripts test` entering interactive watch mode, which would hang the runner |
| `NODE_OPTIONS=--max-old-space-size=4096` | Client build | Matches the Dockerfile; the build needs the heap |
| `MONGO_ROOT_USERNAME`, `MONGO_ROOT_PASSWORD`, `REDIS_PASSWORD`, `JWT_SECRET`, `ENCRYPTION_KEY` | Compose validation | Throwaway placeholders so variable interpolation resolves. Not credentials, and never used to connect to anything. |

### The `CI=false` on the client build, and the warning ratchet

GitHub Actions sets `CI=true` automatically, and Create React App then **treats eslint warnings
as errors**. This repository has a backlog of such warnings — unused variables and
`react-hooks/exhaustive-deps` — so `CI=true npm run build` fails with
*"Treating warnings as errors because process.env.CI = true"*.

The `Dockerfile` does **not** set `CI`, so production builds these as warnings and succeeds.
Setting `CI=false` makes CI reproduce the real production build rather than a stricter standard
the project has never met. A genuine compile error still fails the step.

**But `CI=false` on its own left a hole**: the existing warnings were frozen in *and* a newly
added one was invisible, so the build could not tell anybody they had made things worse.

So the **count** is the gate instead of the warnings themselves:

- The baseline lives in `.github/client-warning-baseline.txt`, one integer.
- More warnings than the baseline **fails the build**, printing every warning and the delta.
- Fewer prints a notice asking you to lower the baseline, so a cleanup is locked in.

The backlog is allowed to stay. It is not allowed to grow. Raising the baseline to make a build
pass defeats the whole mechanism — it is one line in a diff precisely so somebody has to justify
it in review.

**Current baseline: 116**, measured on 24 September 2026 from a real `CI=false` production build.
It came down from 119 when three page modules that were imported but never routed were deleted
during the code-splitting work.

## What CI intentionally does NOT do

- No deployment, no CD, no Docker image publishing, no SSH to any host
- No production database, Redis, Piston or external API access
- No container is started — compose is validated, never run
- No standalone linter (there is no eslint config for `server/`); the client's warning
  **count** is gated by the ratchet above
- No coverage upload, no Dependabot, no SonarQube, no release automation
- No artifact upload

## Known gaps

**Server lint does not work.** `server/package.json` declares `lint: eslint src/**/*.ts`, but
**no package in this repository depends on eslint** and `server/` has no eslint config file. The
binary present in `node_modules/.bin` is a transitive hoist from `react-scripts`. Running the
script fails with "no configuration found". Fixing it means choosing a config and resolving
whatever it reports across the server — a separate, deliberate piece of work.

**Client lint is not a separate gate**, but CRA runs eslint during `react-scripts build`, so the
rules are exercised; they just do not fail the build (see `CI=false` above).

**`@lms-saas/shared` compiles but is unused.** Verified at the time of writing:

- Zero imports of `@lms-saas/shared` anywhere in `server/src` or `client/src`
- Only `shared/src/index.ts` is compiled; `shared/types/index.ts` and `shared/constants/roles.ts`
  sit outside `rootDir: ./src` and are never built
- `shared/dist/index.js` is committed
- 138 of its 144 tracked files are `node_modules` — the TypeScript binary is in git

CI proves it builds. It does **not** prove client and server can consume it, because nothing
does. That wiring needs a scoped decision before the Code Visualizer event schema is placed
there.

**A Jest worker does not exit cleanly.** The server suite ends with *"A worker process has failed
to exit gracefully"*. Jest force-exits and the run completes green. Pre-existing, caused by a
leaked handle or timer in some suite; worth `--detectOpenHandles` one day.

## Reproducing CI locally

```bash
npm ci

npm run build --workspace=shared
npm run build --workspace=server
npm test  --workspace=server -- --ci

CI=false NODE_OPTIONS=--max-old-space-size=4096 npm run build --workspace=client
CI=true  npm test --workspace=client -- --watchAll=false

# repository safety
for f in $(git ls-files '*.sh'); do bash -n "$f" || echo "SYNTAX: $f"; done
for f in $(git ls-files 'scripts/*.sh' '*.sh' docker-compose.yml Dockerfile .gitattributes); do
  grep -q $'\r' "$f" && echo "CRLF: $f"
done
docker compose config --quiet
```

## Measured baseline

Recorded locally on 24 September 2026, before the workflow was committed.

| Check | Result |
|---|---|
| Shared build | pass |
| Server typecheck | pass, exit 0 |
| Server Jest | **120 suites passed, 2 skipped, 0 failed** · 2,140 tests passed, 42 skipped · ~120 s |
| Client build (`CI=false`) | pass, exit 0, 34 MB output |
| Client build (`CI=true`) | **fail** — warnings treated as errors (hence the ratchet) |
| Client tests | 3 suites, 48 tests, all pass |
| CRLF check | clean |
| `bash -n` | 13 scripts, all pass |
| Compose validation | valid |

One pre-existing test failure was found and fixed while establishing this baseline:
`hackathonExamService.test.ts` mocked `HackathonExamAttempt` without `updateOne`, which
`saveAnswer` began calling on 22 September when whole-document writes were replaced with a
positional `$set`. The fix is confined to the test's mock; no application code changed.
