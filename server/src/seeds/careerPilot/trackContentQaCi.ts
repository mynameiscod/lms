/**
 * Career-track content: Quality in CI (QA_CI_QUALITY), QA / SDET, batch QA3.
 *
 * The tester's side of a pipeline: which tests run at which stage of a GitHub Actions workflow, browsers and
 * reports in CI, failing the build only for the right reasons; keeping a growing suite fast with deterministic
 * sharding, duration balancing and test selection by changed files; measuring flaky tests, quarantining them with an
 * owner and a deadline, retrying honestly and reading suite health from JUnit XML; and a quality strategy for a whole
 * product, from the test portfolio to quality gates and production monitoring. It builds on Year 3's "A Pipeline, Not
 * a Person Remembering" and "Flaky Tests Are a Bug", the Cloud track's "Designing a Delivery Pipeline" and "Release
 * Strategies: Rolling, Blue-Green, Canary and Feature Flags", and this track's "Test Levels, Types and the Test
 * Pyramid", "Test Plans, Test Strategy and Risk-Based Testing", "Markers, Plugins and Reports" (exit codes, xdist,
 * JUnit and HTML reports) and "Traces, Screenshots and Flaky Tests"; those are referred to by title, not re-taught.
 *
 * One fictional company runs through the topic: SafarBus, a Pune bus-ticket booking start-up (Pune-Goa and
 * Hyderabad-Bengaluru routes, fares in paise with 5% GST on AC buses, cancellation refund slabs at 48 and 12 hours,
 * seat holds released by a sweeper thread). Its demo suite has 34 pytest tests: unit, API against a live Flask
 * server, and Playwright UI tests in the installed Chrome. Every output quoted is real output from Python 3.13,
 * pytest 9.1, pytest-xdist 3.8, Playwright 1.64 for Python, Flask 3.1, PyYAML 6.0 and git 2.49 on an 8-core Windows
 * laptop (timings vary run to run): the local stage runner, the sharding plugin (crc32, Python's salted hash() and
 * duration balancing), the 50-run flakiness measurements and Wilson intervals, the --lf retry report, the quarantine
 * check, the JUnit health and summary reports, test selection over a real git repository (including a real shallow
 * clone), the quality gate and the synthetic journey. Every GitHub Actions workflow shown was parsed with PyYAML and
 * checked by a small structural checker (needs, matrix keys, artefact names, pipes, || true); none was run on GitHub,
 * since no repository or runner was used. Written from documentation and not run: pytest-split, pytest-repeat,
 * pytest-rerunfailures, pytest-testmon, Playwright Test's --shard for JavaScript, and the GitLab and Jenkins lines.
 *
 * Skills: CI_CD by default; FLAKY_MANAGEMENT and QUALITY_STRATEGY measure AUTOMATED_TESTING. Checkpoint questions
 * that plainly measure the other skill name it with ck().
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_QA_CI_QUALITY_BUNDLES: PilotBundle[] = [
  /* ── TESTS_IN_CI ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_CI_QUALITY_TESTS_IN_CI',
    notes: `SafarBus sells bus tickets from Pune to Goa and from Hyderabad to Bengaluru. Its 34 tests ran on Anusha's laptop
"before big releases". In March a developer changed one character in the refund rule, from >= 48 to > 48, and a
customer who cancelled exactly 48 hours before departure got 50% back instead of 90%. The unit test for that slab
existed and would have failed. Nobody ran it.

Year 3's "A Pipeline, Not a Person Remembering" and the Cloud track's "Designing a Delivery Pipeline" cover the
pipeline from build to deploy. This lesson is the tester's part of it: which tests run at which stage, what they
leave behind when they fail, and how to make sure red means red and green means green.

## Stages: cheap first, and stop early

    unit    16 tests   seconds    no server, no browser          every push and pull request
    api     14 tests   seconds    a live Flask server            after unit passes
    ui       3 tests   seconds+   a real browser, per engine     after api passes
    report   -         -          JUnit summary and the gate     always, even after a failure

Each stage is a job; needs: makes a job wait for another, and a job whose needs failed is skipped. A broken fare
rule should cost 15 seconds of a runner, not 15 minutes of browsers. The same order and skip rule, run on the laptop
by a short script that reads the workflow file (real output):

    unit  success  exit 0  16 passed, 1 deselected in 1.49s  (7.6s)
    api   success  exit 0  14 passed in 2.69s  (7.9s)
    ui    success  exit 0  3 passed in 7.66s  (11.7s)

and with the refund bug put back:

    unit  failure  exit 1  1 failed, 15 passed, 1 deselected in 1.69s  (6.8s)
    api   skipped (needs: unit)
    ui    skipped (needs: api)

Each stage took about 6 seconds more than its tests (Python and plugins starting); on GitHub each job also checks
out and installs. Few large jobs beat many tiny ones.

## The workflow

Parsed with PyYAML and checked for its structure; it was not run on GitHub. The unit and api jobs have the same
shape, so only the ui and report jobs are shown in full:

    name: tests
    on:
      pull_request:
      push:
        branches: [main]
    permissions:
      contents: read
    concurrency:
      group: tests-\${{ github.ref }}
      cancel-in-progress: true
    jobs:
      unit:   # checkout, setup-python with cache: pip, pip install, pytest tests/unit, upload junit-unit
      api:    # needs: unit; the same steps for tests/api
      ui:
        needs: api
        runs-on: ubuntu-latest
        timeout-minutes: 20
        strategy:
          fail-fast: false
          matrix:
            browser: [chromium, firefox]
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-python@v5
            with:
              python-version: "3.12"
              cache: pip
          - run: pip install -r requirements.txt
          - run: python -m playwright install --with-deps \${{ matrix.browser }}
          - run: >
              pytest tests/ui -m "not quarantine" --browser \${{ matrix.browser }}
              --tracing retain-on-failure --junitxml=reports/junit-ui-\${{ matrix.browser }}.xml
          - uses: actions/upload-artifact@v4
            if: \${{ !cancelled() }}
            with:
              name: junit-ui-\${{ matrix.browser }}
              path: reports/
          - uses: actions/upload-artifact@v4
            if: \${{ failure() }}
            with:
              name: traces-\${{ matrix.browser }}
              path: test-results/
              retention-days: 7
      report:
        needs: [unit, api, ui]
        if: \${{ !cancelled() }}
        runs-on: ubuntu-latest
        timeout-minutes: 5
        steps:
          - uses: actions/checkout@v4
          - uses: actions/download-artifact@v4
            with:
              pattern: junit-*
              path: reports/
              merge-multiple: true
          - run: python tools/junit_summary.py "reports/*.xml" >> "$GITHUB_STEP_SUMMARY"
          - name: the gate - fail if any test job did not pass
            if: \${{ contains(needs.*.result, 'failure') || contains(needs.*.result, 'cancelled') }}
            run: exit 1

What each line is for:

- **concurrency** with cancel-in-progress: a new push cancels the old run of the same branch.
- **timeout-minutes**: a hung browser otherwise holds a runner until the platform's six-hour job limit.
- **fail-fast: false**: a matrix cancels its other jobs when one fails, by default. For test jobs you want every
  browser's result, because "fails only on Firefox" is the diagnosis.
- **Artefact names carry the matrix value.** Since upload-artifact v4 an artefact name can be used once per run.
- **if: !cancelled()** on uploads and on the report job: steps and jobs after a failure are skipped unless told
  otherwise, which is exactly when you need the report. always() also runs after a manual cancel; !cancelled() does not.
- **The gate step.** The report job succeeds even when ui failed, because it only summarises. Branch protection
  should require the report job, and its last step fails when any test job failed or was cancelled.

## Browsers in CI

python -m playwright install --with-deps chromium downloads the browser build that matches the installed
Playwright version and, on Linux runners, the system libraries it needs. Pin playwright in requirements.txt: the
browser build and the library version move together. The alternative is Microsoft's image mcr.microsoft.com/playwright/python, with a tag matching your pip version. Tests run headless by default; nothing needs a display. For Selenium, GitHub's Ubuntu runners
come with Chrome, and Selenium Manager (Selenium 4.6 and later) fetches the matching driver.

## Reports and artefacts

- **JUnit XML** from every stage. Every CI server reads it: GitLab with artifacts: reports: junit:, Jenkins with
  the junit step, and GitHub through the job summary or a test-report action.
- **A job summary.** Anything appended to the file named by GITHUB_STEP_SUMMARY appears as Markdown on the run page.
  The 25-line junit_summary.py, run on the reports of the refund bug, printed:

      | report | passed | failed | skipped | seconds |
      |---|---:|---:|---:|---:|
      | junit-api-ui.xml | 17 | 0 | 0 | 8.4 |
      | junit-unit.xml | 15 | 1 | 0 | 1.3 |
      | **total** | **32** | **1** | **0** | |

      | \`tests.unit.test_fares::test_refund_slabs[48-90000]\` | assert 50000 == 90000 |

- **Traces and screenshots** on failure only, kept for days, not months.

## Failing the build for the right reasons

A CI step passes when its shell exits 0. Things that make a red suite look green:

- **|| true** after pytest: the step exits 0 whatever happened. Locally, a failing run followed by || true gave
  "step exit: 0".
- **A pipe**: pytest ... | tee out.txt exits with tee's code. GitHub's default Linux shell is bash -e without
  pipefail; writing shell: bash on the step switches to bash -eo pipefail. Locally the same pipe exited 0 without
  pipefail and 1 with it.
- **continue-on-error: true** on a test step.

And red for the wrong reason: a typo in -m (exit 5), or an environment that is down (exit 3 in the framework from
"Markers, Plugins and Reports"). Label those differently; a tester who files 34 bugs for one dead staging host
loses the team's trust.

**Secrets.** Test credentials come from repository secrets, which GitHub does not pass to pull requests from forks;
tests needing them must skip there.`,
    workedExample: `**Scenario.** The refund change is back in a pull request: if hours_before > 48. Walk through what the pipeline does and
what the developer sees, using the real local outputs.

**Step 1: unit runs first.** 15 passed, 1 failed in 1.69 s. The failure is specific:

    E       assert 50000 == 90000
    E        +  where 50000 = refund(100000, 48)

**Step 2: the expensive jobs do not start.** api and ui need unit, so both are skipped. No browser was installed,
nothing waited on Playwright.

**Step 3: the evidence still arrives.** The unit job's upload step has if: !cancelled(), so junit-unit is uploaded
although the test step failed. The report job also has if: !cancelled(), downloads every junit-* artefact that
exists, and writes the summary table to the run page: 15 passed, 1 failed, with the failing test id and message.

**Step 4: the gate.** needs.*.result contains failure (unit), so the gate step runs exit 1 and the report job
fails. Branch protection requires the report job, so the pull request cannot be merged.

**Step 5: what the developer reads.** Not a log of 400 lines: one table with test_refund_slabs[48-90000] and
"assert 50000 == 90000". The parametrize id says the boundary, the message says the amount. That is a two-minute fix.

**Step 6: what would have hidden it.** Any one of these in the unit job would have let the bug merge:

    run: pytest tests/unit || true
    run: pytest tests/unit | tee unit.log          # default shell, no pipefail
    continue-on-error: true

and so would a report job without the gate step, because a summary that says "1 failed" in a green job is read by
nobody.

**What to say in a review.** "Cheap stages first, needs to skip the expensive ones, reports uploaded even on
failure, and one required gate job that fails if any test job failed. No || true, no unguarded pipes."`,
    mcqs: [
      mcq('SafarBus\'s ui job runs a two-browser matrix. With default settings, the Chromium job fails after two minutes. What happens to the Firefox job?', [
        ['It is cancelled, because fail-fast is true by default', true],
        ['It runs to the end, because matrix jobs are independent', false],
        ['It is restarted from the beginning once Chromium is fixed', false],
        ['It is marked skipped, as if its needs: job had failed too', false],
      ], 'A matrix strategy has fail-fast: true unless you say otherwise, so one failure cancels the jobs still running. For test matrices set fail-fast: false, because "fails only in one browser" is the diagnosis you need. Matrix jobs are not independent by default, nothing restarts them, and skipping is what needs: does, not the matrix.'),
      mcq('A unit test fails and the following step uploads reports/ with actions/upload-artifact and no if: condition. What is uploaded?', [
        ['Nothing, because steps after a failed step are skipped', true],
        ['The JUnit file, because uploads always run after tests', false],
        ['An empty artefact, so the report job finds the name', false],
        ['The report, but only when the job runs on main', false],
      ], 'Without a condition a step runs only if everything before it succeeded, so the report is lost exactly when it is needed. if: !cancelled() (or always()) fixes that. There is no special rule for upload steps, no empty placeholder artefact and no branch-dependent behaviour.'),
      mcq('In a workflow step, run: pytest tests/api | tee api.log fails one test, yet the step is green. Which change makes the step fail as it should?', [
        ['Add shell: bash to the step, which turns on pipefail', true],
        ['Add continue-on-error: false to the step definition', false],
        ['Move tee before pytest so pytest becomes the last command', false],
        ['Add --strict-markers to pytest so failures are stricter', false],
      ], 'GitHub\'s default Linux shell runs bash -e without pipefail, so a pipeline exits with the last command\'s code (tee\'s 0). With shell: bash it runs bash -eo pipefail, and a pytest failure fails the step. continue-on-error: false is already the default, reordering a pipe does not work that way, and --strict-markers checks marker names, not exit codes.'),
    ],
    checkpoint: [
      mcq('SafarBus\'s report job only summarises JUnit files and is the required status check. The ui job failed. How does the gate stop the merge?', [
        ['A last step that fails when needs.*.result contains failure', true],
        ['The report job fails on its own, since one of its needs failed', false],
        ['GitHub blocks every merge while any job in the run is red', false],
        ['download-artifact errors when a JUnit file contains failures', false],
      ], 'A job with if: !cancelled() runs after its needs fail and succeeds if its own steps succeed, so it must check needs.*.result itself and exit 1. It does not fail by inheritance, branch protection looks only at the checks it requires, and downloading an artefact never inspects its contents.'),
      mcq('Why does SafarBus set concurrency with cancel-in-progress: true on the tests workflow?', [
        ['A new push to a branch cancels the older run nobody will merge', true],
        ['It allows the unit, api and ui jobs to run at the same moment', false],
        ['It stops two pull requests from changing the same file at once', false],
        ['It retries a job automatically when the runner is lost midway', false],
      ], 'The concurrency group is per ref, so when a developer pushes again, the run for the old commit is cancelled and runners go to the commit that matters. Parallel jobs come from not having needs:, concurrency has nothing to do with merge conflicts, and it does not retry anything.'),
      mcq('Two matrix jobs both upload JUnit reports with name: junit using upload-artifact@v4. What happens?', [
        ['The second upload fails, because a name is used once per run', true],
        ['The two files are merged into one artefact called junit', false],
        ['The second upload silently replaces the first job\'s file', false],
        ['Both uploads succeed and the artefacts get numbered names', false],
      ], 'From v4, artefacts are immutable and a name can exist once in a workflow run, so the second upload is refused with a conflict. Put the matrix value in the name (junit-ui-chromium) and merge later with download-artifact\'s pattern and merge-multiple. v4 neither merges, overwrites nor renumbers.'),
    ],
  },

  /* ── SPEED_PARALLEL ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_CI_QUALITY_SPEED_PARALLEL',
    notes: `A suite that takes 40 minutes is run before lunch, not before every merge, and soon not at all. SafarBus wants a
verdict on a pull request in under ten minutes, while the suite grows towards 2,000 tests. "Markers, Plugins and
Reports" covered running tests in parallel on one machine with pytest-xdist and a smoke marker. This lesson adds
the rest of the toolbox, in the order to reach for it:

1. **Delete and push down.** A browser test that checks a fare rule belongs in a unit test (seconds, not minutes).
2. **Parallel on one machine** with -n auto, when tests wait on browsers and networks.
3. **Shard across machines**: split the suite into N parts, one per CI job.
4. **Select**: on a pull request, run only the tests the change can affect, plus smoke.
5. **Run everything later**: the full suite on main and nightly, as the safety net for 3 and 4.

## Sharding must be deterministic

Each shard is a separate machine that collects the whole suite and keeps its own part. Every machine must compute
the same split, or tests are skipped or run twice. SafarBus's conftest adds --shard=i/n:

    def shard_of_hash(nodeid: str, n: int) -> int:
        return zlib.crc32(nodeid.encode("utf-8")) % n      # same answer on every machine

    def pytest_collection_modifyitems(config, items):
        ...
        keep = [it for it in items if pick(it) == i - 1]
        drop = [it for it in items if pick(it) != i - 1]
        items[:] = keep
        config.hook.pytest_deselected(items=drop)

A checker collected each shard in its own process, like four CI machines, and compared with the full list:

    shard 1/4: 6 tests
    shard 2/4: 8 tests
    shard 3/4: 7 tests
    shard 4/4: 11 tests
    total 32, ran 32, never ran 0, ran twice or more 0

The tempting version uses Python's built-in hash(nodeid) % n. String hashes are salted per process (PYTHONHASHSEED),
so each machine splits differently. Two real runs:

    total 32, ran 42, never ran 8, ran twice or more 15
    total 32, ran 30, never ran 12, ran twice or more 9

All shards green, and twelve tests never ran: a silent hole in the safety net. Under xdist the same mistake is loud,
because xdist compares the workers' collections:

    ERROR gw0 - Different tests were collected between gw1 and gw0. The differenc...

## Balance by duration

Hashing spreads test counts, not seconds. On a generated suite of 60 tests (21 s of work: many quick, a few
browser-length, two 3-4 s payment journeys), the plan for four shards from recorded durations:

    hash (crc32)       tests [12, 12, 13, 23]  seconds [5.16, 3.81, 6.87, 5.16]  slowest shard 6.87s
    duration (greedy)  tests [13, 13, 17, 17]  seconds [5.25, 5.26, 5.25, 5.24]  slowest shard 5.26s
    ideal: 5.25s per shard; no shard can beat the longest test, 3.86s

Measured, pytest's own times for the four shards were 5.69, 4.44, 7.29 and 5.73 s by hash, and 5.76, 5.77, 5.75 and
5.83 s by duration. The greedy rule: sort tests longest first, give each to the shard with the least work so far.
Durations come from the last full run's JUnit XML (each testcase has a time attribute); a new test gets a default.
With eight shards, the 3.86 s journey alone set the floor, so more shards bought nothing: split the long test.

Shards are not free. Run as four processes on one laptop, the four SafarBus shards took 13.1 s against 7.5 s
serially: they shared one CPU and each started Python, the plugins and Chrome. In CI each shard is its own runner,
but each also pays checkout, installs and a browser download, often a minute or more. Shard when the suite is
long compared with that fixed cost.

## The sharded workflow (parsed and checked, not run)

    jobs:
      shard:
        runs-on: ubuntu-latest
        timeout-minutes: 20
        strategy:
          fail-fast: false
          matrix:
            shard: [1, 2, 3, 4]
        steps:
          # checkout, setup-python, pip install, playwright install --with-deps chromium
          - run: >
              pytest -m "not quarantine" -n 2
              --shard=\${{ matrix.shard }}/4 --shard-by=duration --durations-file=tools/durations.json
              --junitxml=reports/junit-shard-\${{ matrix.shard }}.xml
          - uses: actions/upload-artifact@v4
            if: \${{ !cancelled() }}
            with:
              name: junit-shard-\${{ matrix.shard }}
              path: reports/
      merge:
        needs: shard
        if: \${{ !cancelled() }}
        # download junit-shard-* with merge-multiple, write the summary, refresh durations.json

Ready-made options, from their documentation: **pytest-split** (pytest --store-durations, then --splits 4
--group 1) does the same duration split; Playwright Test for JavaScript has --shard=1/4 and merge-reports.

## Smoke first, then the rest

The smoke set (5 SafarBus tests: health, search, one booking, one fare, one UI search) gives a first verdict in
seconds and goes first in the pull-request workflow; the affected tests need it to pass.

## Running only what a change affects

Selection needs a map from source files to tests. SafarBus builds one by tracing which app/ files each test
executes (a tiny version of what coverage-based tools record): 33 tests mapped, app/fares.py executed by 21, app/
server.py by 17, app/seats.py by 3. Then rules decide, from git diff --name-only against the base branch:

- conftest.py, pytest.ini, requirements, the workflow or the selector itself changed: run everything.
- A file the map does not know (new module, data file): run everything. Never guess.
- Docs and *.md: no tests beyond smoke. A changed test file: the tests in it.

Real results over a small git repository, one branch per change:

    refund-48h  app/fares.py: 21 tests executed it       selected: 21 of 33 tests, plus the smoke set
    seat-ttl    app/seats.py: 3 tests executed it        selected: 3 of 33 tests, plus the smoke set
    docs        README.md: no tests                      selected: 0 of 33 tests, plus the smoke set
    new-module  app/offers.py is not in the test map     selected: ALL 33 tests
    fixture     tests/conftest.py affects every test     selected: ALL 33 tests

On refund-48h, pytest @out/selected.txt (pytest reads arguments from a file given with @) ran the 21 and failed
test_refund_slabs[48-90000]. The map goes stale as code changes, so the full suite still runs on every merge to
main and nightly. pytest-testmon is a maintained plugin built on the same idea (from its documentation).`,
    workedExample: `**Scenario.** SafarBus will have about 2,000 tests by next year: 1,500 unit (0.02 s each), 420 API (0.3 s each) and 80
UI (6 s each). Each CI job costs about 90 s of fixed set-up (checkout, installs, a browser). Design pull-request
and main-branch runs that answer within ten minutes.

**Step 1: add up the work.** Unit 1,500 x 0.02 = 30 s. API 420 x 0.3 = 126 s. UI 80 x 6 = 480 s. Total 636 s,
about 10.6 minutes of tests on one worker, plus set-up. Too slow for every pull request.

**Step 2: parallel on one runner.** API and UI tests wait on servers and browsers, so -n 4 on a four-core runner
roughly quarters their time when the tests are independent: 126 / 4 + 480 / 4 = about 152 s, plus 30 s of unit
tests and 90 s of set-up, about 4.5 minutes. Already inside the budget, but the UI share grows fastest.

**Step 3: shard the UI tests.** Four shards balanced by duration, each with -n 2: 480 / 8 = 60 s of UI per shard,
plus 90 s of set-up = 2.5 minutes, all four at once. Unit and API stay in one job (about 2.5 minutes with -n 4).
More shards would mostly buy more set-up.

**Step 4: pull requests get selection.** Smoke first (about 30 s plus set-up), then the selected tests. A change to
the refund rule selects the tests that execute fares.py; a README change runs smoke only; a conftest change runs
everything. Selection is an optimisation for the common case, never the only run.

**Step 5: main and nightly get everything.** The sharded full suite runs on every merge to main, which also
refreshes durations.json and the test map; nightly adds the quarantined tests and repeats.

**Step 6: check the plan with numbers, not hope.** The merge job's summary shows each shard's time. If one shard is
always slowest, look for a single long test (the generated suite's 3.86 s journey set the floor for eight shards)
and split that test rather than adding shards.

**What to say in a review.** "Push checks down, parallelise waiting tests, shard by recorded duration with a
deterministic split, select on pull requests with run-all fallbacks, and keep the full suite on main as the net."`,
    mcqs: [
      mcq('A tester shards with hash(test_id) % 4 in conftest.py. All four CI shards are green. What did the checker find when it collected each shard in its own process?', [
        ['Some tests ran in two shards and some in none', true],
        ['Every test ran exactly once, as the hash is stable', false],
        ['Collection failed with an error in every shard', false],
        ['All tests landed in shard 1, the others were empty', false],
      ], 'Python salts string hashes per process, so each shard computes a different split: one run had 15 tests twice and 8 never, another 12 never. Nothing errors outside xdist, so the hole is silent. A stable hash such as zlib.crc32 of the node id gives every machine the same answer.'),
      mcq('With 60 tests split four ways, hashing gave shards of 5.16, 3.81, 6.87 and 5.16 seconds. What did splitting by recorded duration change?', [
        ['It brought every shard to about 5.25 s, so the run ends sooner', true],
        ['It put the same number of tests, fifteen, into each of the shards', false],
        ['It made the whole suite faster by skipping the slowest tests', false],
        ['It moved every slow test into one shard so the others finish', false],
      ], 'Greedy longest-first gave shards of 5.24 to 5.26 s, so the slowest shard fell from 6.87 s to 5.26 s and the run ends when that shard ends. Test counts were 13, 13, 17 and 17, not equal; nothing was skipped; and grouping slow tests together is the opposite of balancing.'),
      mcq('The SafarBus selector meets app/offers.py, a file that no test in the map executed. What does it do, and why?', [
        ['Runs the whole suite, because an unknown file must not be guessed', true],
        ['Runs only smoke, because no test has executed the new module yet', false],
        ['Runs no tests, since a file without tests cannot break any test', false],
        ['Fails the job and asks the author to update the map by hand', false],
      ], 'A file missing from the map may be new code that other modules import, so the safe default is to run everything; the next full run on main adds it to the map. Running smoke or nothing would let a broken import through, and failing the job blocks every new file for no reason.'),
    ],
    checkpoint: [
      mcq('Four SafarBus shards run as separate processes on one laptop took 13.1 s, against 7.5 s for one serial run. What does that show?', [
        ['Each shard pays start-up and shares one CPU; sharding pays per runner', true],
        ['The crc32 split was unbalanced, so one shard did most of the work', false],
        ['Sharding is slower than serial runs, so it should never be used', false],
        ['Chrome cannot run in four processes at once on a Windows laptop', false],
      ], 'Every shard started Python, the plugins and Chrome, and all four competed for the same cores, so the fixed costs dominated. On CI each shard gets its own runner, and sharding pays when the suite is long compared with that set-up cost. The split was balanced, sharding is useful in the right place, and the browsers did run.'),
      mcq('The selector sees that tests/conftest.py changed on a pull request. Which choice is right?', [
        ['Run every test, since fixtures in it can affect any test', true],
        ['Run the tests in conftest.py, as for any changed test file', false],
        ['Run only smoke, since a conftest holds no tests of its own', false],
        ['Run the tests whose map entries include the conftest file', false],
      ], 'A root conftest supplies fixtures and hooks to every test below it, so any test may behave differently. It has no tests of its own to run, smoke alone could miss a broken fixture, and a map that records only app/ files never lists conftest.py at all.'),
      mcq('After sharding by duration into eight parts, the slowest shard took 3.86 s, the same as the longest single test. What is the next step?', [
        ['Split that long test, since no shard can finish before it', true],
        ['Add eight more shards so the long test gets its own runner', false],
        ['Switch back to hash sharding, which spreads tests more evenly', false],
        ['Raise the default duration for new tests from 1.0 to 4.0 s', false],
      ], 'One test is the floor for its shard, so more shards only add set-up cost; breaking the 3.86 s journey into smaller tests is the only way below it. Hashing balances counts, not time, and the default duration only affects tests without a recorded time.'),
    ],
  },

  /* ── FLAKY_MANAGEMENT ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_CI_QUALITY_FLAKY_MANAGEMENT',
    notes: `"Flaky Tests Are a Bug" (Year 3) and Playwright's "Traces, Screenshots and Flaky Tests" taught you to find and fix the
cause of one flaky test. This lesson is about the suite: how flaky a test really is, what to do with it before the
fix, how to retry without lying, and the numbers that tell a lead whether the suite can be trusted.

## The test

SafarBus holds a seat for a short time while the customer pays; a sweeper thread frees expired holds. Each sweeper
starts after a random delay so that many app instances do not sweep in step. The test:

    def test_hold_is_released_after_ttl():
        m = SeatMap(ttl=0.5, sweep_every=0.25)
        m.start_sweeper()
        m.hold(12)
        time.sleep(0.72)                      # "ttl plus a bit"
        try:
            assert 12 in m.free
        finally:
            m.stop()

It passes on the developer's machine. Is it flaky, and how much?

## Measure: run it many times

One pass proves nothing. SafarBus's conftest adds --repeat N, which parametrises every selected test N times (the
pytest-repeat plugin offers the same as --count, from its documentation). Three real runs of 50:

    10 failed, 40 passed in 37.49s
    6 failed, 44 passed in 37.53s
    11 failed, 39 passed in 36.90s

A short script reads the JUnit files and puts an interval around the rate (the Wilson interval, which behaves
sensibly near 0% and 100%):

    out/flaky-1.xml: 10/50 failed = 20%  (95% interval 11% to 33%)
    out/flaky-2.xml: 6/50 failed = 12%  (95% interval 6% to 24%)
    out/flaky-3.xml: 11/50 failed = 22%  (95% interval 13% to 35%)
    all runs: 27/150 = 18.0%  (95% interval 12.7% to 24.9%)
      chance that  5 runs in a row are all green at this rate: 37%
      chance that 10 runs in a row are all green at this rate: 14%
      chance a 300-test suite with 3 tests like this goes green: 55%

Three lessons in those lines. A single batch of 50 swung from 12% to 22%, so quote a rate with its interval. A
test that fails one run in five still passes five runs in a row 37% of the time, so "I ran it five times and it
passed" proves little. And three such tests make almost half of all builds red for no reason; that is how teams
learn to ignore red.

**After the fix**, run the same 50 and read the interval, not just the count:

    out/fixed.xml: 0/50 failed = 0%  (95% interval 0% to 7%)

Zero failures in 50 means "probably below 7%", not "fixed for ever". The nightly job keeps counting.

## Rank by history

Repeating every test is expensive, so find candidates in the history you already have. A health report over 12
nightly JUnit files:

    flaky (passed and failed on the same code) - flip count over the window:
      test_seats::test_hold_is_released_after_ttl  history PPPFPFPPPFPP  fail rate 25%  flips 6

Flips (pass to fail or back) separate flaky tests from broken ones: a test that went PPPPPPPPPPFF is a regression
with a start date, not a flake.

## Quarantine: out of the gate, not out of sight

A flaky test in the merge gate blocks everyone; deleting it loses the check. Quarantine moves it out of the gate
and keeps it running nightly. SafarBus makes the rules executable:

    @pytest.mark.quarantine(owner="anusha", ticket="SB-412", until="2026-11-15")
    def test_hold_is_released_after_ttl(): ...

The pull-request workflow runs -m "not quarantine"; the nightly job runs everything and repeats the quarantined
tests to measure them. A hook in conftest refuses a quarantine without owner, ticket and date, and fails the run once
the date passes. With the clock set to 16 November:

    ERROR: tests/unit/test_seats.py::test_hold_is_released_after_ttl: quarantine expired on 2026-11-15 (owner anusha, SB-412) - fix it or delete it

Exit code 4 (a usage error), so nobody mistakes it for a product bug. Keep the quarantine small (a team limit of
about five is common) and its age visible.

## Retries, done honestly

A retry is acceptable only if every test that needed one is reported. SafarBus reruns with pytest's built-in --lf
(last failed) as a second attempt and prints what changed. Two real runs of the unit tests repeated ten times:

    attempt 1: exit 1, 2 failed of 170
    attempt 2 (--lf): reran 2; passed on retry 1; failed again 1
      FLAKY   tests.unit.test_seats::test_hold_is_released_after_ttl[r2]
      FAILED  tests.unit.test_seats::test_hold_is_released_after_ttl[r7]

    attempt 1: exit 1, 4 failed of 170
    attempt 2 (--lf): reran 4; passed on retry 3; failed again 1

Note the second line of each: an 18% flake fails twice in a row about 3% of the time, so retries reduce red builds,
they do not remove them. Rules: never retry exit codes other than 1 (a collection error or usage error will not pass
on retry); count retried passes as flaky in the report; never retry tests outside quarantine silently.
pytest-rerunfailures gives --reruns 2 --reruns-delay 1 and @pytest.mark.flaky(reruns=2) (from its documentation); the
same rules apply.

## Suite health metrics

Read weekly from nightly JUnit files: **green-run rate** (7 of 12 SafarBus nightlies were green), flaky tests by
flips, **quarantine size and age**, suite time (median 8.8 s, worst 22.5 s), the slowest tests, and how long red
builds stay red. Rising numbers are a planning item, not a complaint.`,
    workedExample: `**Scenario.** The SafarBus nightly history is in, and the lead asks: "Is the seat-hold test flaky, is anything really
broken, and what do we do this week?"

**Step 1: read the health report.**

    12 runs, 34 tests, 408 results, pass rate 98.8%
    green runs: 7/12
    failing now (failed in each of the last 2 runs) - treat as a regression:
      test_fares::test_refund_slabs[48-90000]  history PPPPPPPPPPFF  first failed in run 11
    flaky (passed and failed on the same code) - flip count over the window:
      test_seats::test_hold_is_released_after_ttl  history PPPFPFPPPFPP  fail rate 25%  flips 6

A 98.8% pass rate sounds fine and hides both problems; the green-run rate (7 of 12) does not.

**Step 2: separate the two.** The refund test passed ten times then failed twice: a regression that arrived with
the change in run 11. That is a bug report, today, with the commit range. The seat test flips: flaky.

**Step 3: measure the flaky one.** 150 repeats: 27 failures, 18% (95% interval 12.7% to 24.9%).

**Step 4: find the cause.** The sweeper starts after a random delay of up to 0.25 s and then runs every 0.25 s. The
test needs a sweep between 0.5 and 0.72 s after the hold; when the first sweep comes late, the next one is after
the check. The product is fine; the test assumes a timing the code never promised.

**Step 5: quarantine while fixing.** The marker with owner anusha, ticket SB-412 and until 2026-11-15. Pull requests
stop going red for it; nightly keeps measuring it.

**Step 6: fix the test, not the timeout.** Test the expiry rule with a fake clock (exact, no sleeping), and keep one
integration test that polls until the seat is free, with a deadline of ttl plus two sweep periods plus a margin:

    while 12 not in m.free and time.monotonic() < deadline:
        time.sleep(0.02)
    assert 12 in m.free, "seat 12 still held after ttl plus two sweeps"

50 repeats: 0 failed (95% interval 0% to 7%). Remove the quarantine marker in the same pull request.

**What to tell the lead.** "One real regression in refunds, reported with the commit range. One flaky test at about
18%, caused by the test's timing assumption, quarantined with an owner and now fixed; nightly will confirm."`,
    mcqs: [
      mcq('The seat-hold test failed 10, 6 and 11 times in three batches of 50 runs. How should its flakiness be reported?', [
        ['About 18%, with a 95% interval of roughly 13% to 25%', true],
        ['12%, from the batch with the fewest failures recorded', false],
        ['22%, from the worst batch, to be on the safe side here', false],
        ['20%, because the first batch of fifty is the true rate', false],
      ], 'Pooling the 150 runs gives 27 failures, 18%, and the Wilson interval (12.7% to 24.9%) says how uncertain that is. Picking the best or worst batch, or trusting the first one, ignores how much a batch of 50 swings: these three ranged from 12% to 22% on the same code.'),
      mcq('After a fix, the SafarBus test passed 50 runs out of 50. What can you honestly claim?', [
        ['Its failure rate is probably below about 7%', true],
        ['It is fixed, since a flaky test always fails in fifty runs', false],
        ['Its failure rate is exactly zero on every CI machine', false],
        ['Nothing at all, as fifty runs is too few to mean anything', false],
      ], 'Zero failures in 50 gives a 95% upper bound of about 7%, a strong improvement from 18% but not proof of zero; the nightly job keeps counting. A rare flake can pass fifty times, CI machines differ from laptops, and fifty runs is plenty to show the rate fell.'),
      mcq('Nightly history for test_refund_slabs[48-90000] reads PPPPPPPPPPFF. What is it?', [
        ['A regression that started in run 11, not a flaky test', true],
        ['A flaky test with a failure rate of about 17% per run', false],
        ['A test to quarantine now, since it failed twice in a row', false],
        ['A broken environment, as two failures in a row suggest', false],
      ], 'Ten passes then consistent failures is a change in behaviour with a start point: find the commit between runs 10 and 11 and report the bug. A flaky test flips back and forth; quarantining a real regression hides a product bug; and an environment fault would fail many tests, not one boundary.'),
    ],
    checkpoint: [
      mcq('A team adds an automatic retry of every failed test in the merge gate and reports only the final result. What is wrong with it?', [
        ['Retried passes vanish, so flaky tests and real races go unseen', true],
        ['Retries are slow, since every test in the suite then runs twice', false],
        ['pytest cannot retry tests without the pytest-rerunfailures plugin', false],
        ['Retried tests always pass, which makes the whole gate pointless', false],
      ], 'Silent retries turn a red signal into green, so the team never learns which tests are flaky or which failures were real races users will hit. Only failed tests are rerun, pytest\'s own --lf can rerun failures, and retried tests do not always pass: an 18% flake failed again about one time in thirty.'),
      mcq('Why does SafarBus\'s conftest fail the run when a quarantine marker\'s until date has passed?', [
        ['So a quarantined test cannot stay out of the gate for ever', true],
        ['So expired tests run again in the pull-request merge gate', false],
        ['So the flaky test is deleted on that date automatically', false],
        ['So the owner gets an e-mail from pytest on the due date', false],
      ], 'Without a deadline, quarantine becomes a graveyard of checks nobody runs or reads. Failing loudly forces a decision: fix it or delete it. The hook does not move tests back into the gate, delete anything or send mail; it stops the run with a message naming the owner and ticket.'),
      mcq('Which number best tells a lead whether developers will trust SafarBus\'s red builds?', [
        ['The share of runs that were completely green, 7 of 12', true],
        ['The share of all test results that passed, 98.8% here', false],
        ['The total number of tests in the suite, 34 this month', false],
        ['The share of source lines executed by the test suite', false],
      ], 'Developers see builds, not individual results: five red builds in twelve teaches them to ignore red, even though 98.8% of results passed. The test count and line coverage say nothing about whether a red build means a real problem.'),
    ],
  },

  /* ── QUALITY_STRATEGY ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_CI_QUALITY_QUALITY_STRATEGY',
    notes: `"Test Plans, Test Strategy and Risk-Based Testing" separated a strategy from a plan and scored risks; "Test Levels,
Types and the Test Pyramid" placed each check at the lowest level that can catch it. This lesson puts those to work
for a whole product, with the pipeline from this topic: what SafarBus tests, where, when, what blocks a release,
how production is watched, and which numbers show whether any of it works.

## The portfolio

A portfolio says, per level, what is checked, how many tests, where they run and how long they may take:

    Level            What it checks                          Size   Runs                 Time budget
    Unit             fares, GST, refund slabs, seat rules    ~1500  every push           1 min
    API              search, holds, bookings, errors         ~420   every push           3 min
    Contract         payment gateway and SMS provider        ~30    every push           1 min
    UI end-to-end    the money journeys only                 ~80    main, sharded        5 min
    Exploratory      new features, festival rules            2 h    each sprint          -
    Performance      search and booking under load           3      before sale days     30 min
    Security checks  dependency scan, authorised checks      -      every push, weekly   -
    Production       synthetic journeys, alerts, canary      -      every minute         -

Two rules keep it honest. Each risk from the risk table has a home in it: the 48-hour refund slab is a unit test,
"bookings survive a payment timeout" is an API test with the gateway stubbed, "a customer can book Pune to Goa" is
UI and synthetic. And each level has a time budget; when a level outgrows it, that is a design discussion
(push down, shard, delete), not a slower pipeline.

## Quality gates

A gate is a rule that blocks a step until evidence says it is safe. Good gates read evidence the pipeline already
produces and fail with a reason:

    Pull request   smoke + affected tests green, lint, no new high-severity dependency findings
    Merge to main  full suite green (quarantine excluded), artefact built once
    Release        staging journeys green, performance within budget, no open critical defects
    After deploy   canary error rate and latency no worse than the baseline, synthetic checks green

SafarBus's release gate reads a small evidence file and a thresholds file. Real output:

    PASS  tests failed in the merge gate        0  (limit 0)
    PASS  smoke suite seconds                 6.3  (limit 120)
    PASS  tests in quarantine                   1  (limit 5)
    PASS  search p95 ms (staging probe)      11.4  (limit 300)
    PASS  open critical defects                 0  (limit 0)
    GATE: release may proceed

and with the refund regression and one open critical defect:

    FAIL  tests failed in the merge gate        1  (limit 0)
    FAIL  open critical defects                 1  (limit 0)
    GATE: blocked - fix the FAIL lines or get a recorded waiver

A waiver is a decision a named person makes and records ("release with SB-431 open; workaround published"), not a
rule quietly switched off. Avoid gates on numbers that are easy to game: a line-coverage threshold invites tests
without assertions. Coverage is better used to find untested risky code than as a gate.

## Production monitoring is testing too

Some failures appear only with real traffic, real devices and a real payment gateway at 9 p.m. on a holiday eve.
Shift-right practices, met briefly in "QA in Agile Teams and Shift-Left Testing", become part of the strategy:

- **Synthetic journeys**: a scripted search and booking against production every minute, with a test account and a
  bus the operations team excludes from real sales. SafarBus's script, run locally with a fault switched on for
  five checks:

      minute 11: ALERT - journey failed 3 checks in a row (search 503); page the on-call
      minute 15: recovered
      checks 20, succeeded 15, availability 75%, median 66 ms, p95 71 ms

  It alerts on three failures in a row, not one, for the same reason you do not trust one flaky test.
- **Service level objectives**: "99.5% of searches succeed in under 800 ms over 30 days". The gap to 100% is an error
  budget; when it is spent, the team slows releases. Year 3's "Knowing Before a User Tells You" covers the signals.
- **Canary releases and feature flags** (the Cloud track's "Release Strategies"): a new fare engine reaches 5% of
  bookings first, with automatic rollback if errors rise; a flag turns the festival surge on without a deploy.
- **Every production incident becomes a test**: the bug that escaped gets a test at the lowest level that would have
  caught it, and the strategy asks why that level missed it.

## Metrics that matter

    Escaped defects        bugs found in production per release, by severity
    Defect detection %     found before release / all found, e.g. 46 / (46 + 4) = 92%
    Change failure rate    deployments needing a fix or rollback, e.g. 3 of 40 = 7.5%
    Time to restore        from alert to recovery
    Feedback time          push to pull-request verdict (target under 10 minutes)
    Suite health           green-run rate, flaky count, quarantine size and age

Watch for vanity numbers: the count of test cases, the count of bugs filed by testers, or 100% pass rates. Each can
rise while quality falls. Pair every number with the decision it informs.`,
    workedExample: `**Scenario.** SafarBus's founder asks for a one-page quality strategy before the Diwali travel rush, when traffic triples
and a new "festival surge" fare goes live. Write it.

**1. Context and risks.** Top risks from the risk table: wrong fare or refund amount (likelihood 3, impact 5),
double-booked seats under load (3 x 5), payment taken without a ticket (2 x 5), search slow at peak (4 x 4). Out of
scope this season: the Android app's offline mode (no change since last release; covered by existing checks).

**2. Portfolio.** Surge and GST rules as unit tests from a rule table (boundaries at 0, 1 and 6 seats; surge before
GST: 1,000 rupees AC with surge = 1,207.50). Seat holds as API tests with concurrent requests. Payment timeout as an
API test with the gateway stubbed. Three UI journeys: search, book, cancel. Two exploratory sessions on the surge
fare. A load test of search at three times last year's peak, two weeks before the rush.

**3. Pipeline.** Pull requests: smoke and affected tests in under ten minutes. Main: full suite sharded four ways.
Nightly: everything plus quarantined tests repeated 50 times.

**4. Gates.** Release blocked by any failing merge-gate test, p95 search above 300 ms in the staging probe, more than
five quarantined tests, or an open critical defect. Waivers signed by the engineering manager.

**5. Production.** Synthetic search-and-book every minute on both routes; alert after three failures in a row; SLO
99.5% of searches under 800 ms; the surge fare behind a flag, released to 5% first.

**6. Metrics, reviewed weekly.** Escaped defects by severity, defect detection percentage, change failure rate,
feedback time and green-run rate. Last season: 46 bugs found before release and 4 after, 92%; the target is to keep
critical escapes at zero.

**7. Owners.** QA lead owns the strategy and gates; each quarantine has a named owner; on-call owns synthetic alerts.

**What makes it a strategy, not a wish list.** Every risk has a test level, every level has a budget, every gate
reads evidence, and every metric has a decision attached.`,
    mcqs: [
      mcq('In SafarBus\'s portfolio, where should the check "a cancellation exactly 48 hours before departure refunds 90%" live?', [
        ['A unit test of the refund rule, with the boundary values', true],
        ['A UI test that books and then cancels through the browser', false],
        ['A synthetic journey that runs against production hourly', false],
        ['An exploratory session before every festival season', false],
      ], 'It is a pure rule with a boundary, so the lowest level that can catch it is a unit test: fast, exact and run on every push. A UI test would take seconds and fail for unrelated reasons, a synthetic journey cannot choose the hours before departure, and exploration does not repeat reliably.'),
      mcq('The release gate failed on "open critical defects 1". The product owner wants to ship with a published workaround. What is the right way?', [
        ['A named person records a waiver for that defect and release', true],
        ['Raise the gate\'s limit to one critical defect for this release', false],
        ['Lower the defect\'s severity to high so the gate turns green', false],
        ['Skip the gate step in the workflow for this one deployment', false],
      ], 'Releasing with a known issue can be a sound business decision, so the strategy allows it through a recorded, owned waiver that names the defect. Changing the threshold, relabelling the severity or skipping the step hide the decision instead of making it, and the next release inherits the weaker rule.'),
      mcq('Why does SafarBus\'s synthetic journey alert only after three failed checks in a row?', [
        ['One failed check can be noise; three in a row is an outage', true],
        ['The monitoring tool cannot send more than one alert an hour', false],
        ['The service level objective allows three failed bookings', false],
        ['Three checks are needed before p95 latency can be computed', false],
      ], 'A single network blip would page the on-call for nothing, and alerts that cry wolf get ignored, like a flaky test. Three in a row (here during the five-minute fault) is a real failure. The rule is not a tool limit, it is not what the SLO measures, and p95 is computed over all checks.'),
    ],
    checkpoint: [
      mcq('A manager proposes a release gate of "90% line coverage". What is the strongest objection?', [
        ['Coverage counts executed lines, so tests without asserts can meet it', true],
        ['Line coverage cannot be measured for a Flask app tested over HTTP', false],
        ['A coverage gate makes the unit tests run more slowly than before', false],
        ['Coverage tools only work with unittest, not with pytest suites', false],
      ], 'Executing a line is not checking it, so a hard coverage gate invites tests that call code and assert nothing. Coverage is more useful as a map of untested risky code. It can be measured for server code under test, its overhead is modest, and pytest works with coverage tools through plugins.'),
      mcq('SafarBus found 46 bugs before release and 4 in production last season. What is its defect detection percentage?', [
        ['92%, found before release divided by all bugs found', true],
        ['8%, the bugs that escaped divided by all bugs found', false],
        ['91%, the bugs found before release divided by fifty', false],
        ['87%, the escaped bugs subtracted from the found ones', false],
      ], 'Defect detection percentage is bugs found before release over all bugs found: 46 / (46 + 4) = 92%. The 8% is the escape rate, the complement. 46 / 50 is 92%, not 91%, and subtracting counts does not give a percentage.'),
      mcq('Which of these belongs in a product quality strategy rather than in one release\'s test plan?', [
        ['Every production incident gets a test at the lowest level that misses it', true],
        ['Anusha tests the festival surge fare on Tuesday and Wednesday', false],
        ['Booking flows for the Pune-Goa route are in scope this release', false],
        ['The staging build for release 4.2 is ready by the 14th', false],
      ], 'A strategy sets long-lived rules for how the product is tested, such as turning every escaped bug into a test. Who tests what on which days, the scope of one release and a build date are plan details that change every release.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_CI_QUALITY_DEBUGGING',
    notes: `Six things that went wrong while putting SafarBus's tests into CI. In each the tests were fine; the pipeline around
them lied, lost evidence or skipped work. Outputs marked "real" were produced on the demo; the GitHub behaviour is
from GitHub's documentation, since no workflow was run on GitHub.

## 1. The green build with a failing test (real)

**Symptom.** The refund bug merged. The unit job was green; its log, scrolled up, shows "1 failed, 15 passed".

**Cause.** The step was run: pytest tests/unit | tee unit.log. Without pipefail a pipeline returns the last
command's code, and tee succeeded. Locally the same pipe gave exit 0 without pipefail and 1 with it. GitHub's
default Linux shell is bash -e, without pipefail. The other usual culprit is || true, added "to let the report
upload".

**Fix.** shell: bash on the step (bash -eo pipefail), no || true, and if: !cancelled() on the upload step instead,
which is what the || true was trying to achieve.

## 2. No report when the tests fail

**Symptom.** Green runs have a JUnit artefact and a summary; red runs, the ones you need, have neither.

**Cause.** The upload step had no if:, so it was skipped after the failing pytest step; the report job had needs:
and no if:, so it was skipped too.

**Fix.** if: \${{ !cancelled() }} on both, and a gate step in the report job so that a successful report job does not
make a failed run look mergeable.

## 3. The matrix that loses half its reports

**Symptom.** In the four-shard workflow, one shard uploads "junit" and the other three uploads fail with a conflict
error: an artefact with this name already exists on the workflow run.

**Cause.** From upload-artifact v4, artefacts are immutable and each name can be used once per run. A structural
check of the broken workflow (real) also found two more mistakes in it:

    error: shard: uses matrix.shards, but the matrix defines ['shard']
    error: shard step 4: artifact name 'junit' is the same in every matrix job; v4 refuses the second upload
    error: merge: needs unknown job 'shards'

**Fix.** name: junit-shard-\${{ matrix.shard }}, and in the merge job download with pattern: junit-shard-* and
merge-multiple: true. Fix the matrix.shards typo, which renders as an empty value, so every shard ran with
--shard=/4.

## 4. Shards that skip tests (real)

**Symptom.** All four shards green, yet a test that was broken on purpose never failed.

**Cause.** The split used hash(nodeid) % 4. String hashes are salted per process, so each CI machine computed a
different split. Collecting each shard separately:

    total 32, ran 42, never ran 8, ran twice or more 15

**Fix.** zlib.crc32(nodeid.encode()) % n, or a duration plan read from a committed file; then add the check that
collects every shard and compares with the full list (total 32, ran 32, never ran 0) to the pipeline itself.

## 5. Test selection on a shallow clone (real)

**Symptom.** The pull-request selector crashes, or in an older version selects nothing.

**Cause.** actions/checkout fetches one commit by default. In a real depth-1 clone:

    fatal: ambiguous argument 'origin/main...HEAD': unknown revision or path not in the working tree.

After fetching main also at depth 1: "fatal: origin/main...HEAD: no merge base". After git fetch --unshallow, git
diff printed app/fares.py.

**Fix.** fetch-depth: 0 on the checkout in the selection job, and make the selector run everything when git diff
fails rather than guess. The fixed selector printed "git diff failed: fatal: ambiguous argument..." then "selected:
ALL 33 tests".

## 6. The quarantine that never expired in the gate (real)

**Symptom.** Run nightly, the conftest stops on an expired quarantine. In the pull-request gate, the same date is
long past and the run is green.

**Cause.** The check ran in pytest_collection_finish, which sees the tests left after -m "not quarantine" removed
the quarantined ones. With the clock set to 16 November: "16 passed, 1 deselected".

**Fix.** Check in pytest_collection_modifyitems marked @pytest.hookimpl(tryfirst=True), which runs before pytest
applies -m and -k. Then the gate run also stops:

    ERROR: tests/unit/test_seats.py::test_hold_is_released_after_ttl: quarantine expired on 2026-11-15 (owner anusha, SB-412) - fix it or delete it

## The habit

When CI disagrees with your laptop, read the pipeline as code: what each step's exit code really is, what runs
after a failure, what each matrix job is called, and what the checkout contains.`,
    mcqs: [
      mcq('A unit job is green although its log shows "1 failed". The step is run: pytest tests/unit | tee unit.log with the default shell. Why?', [
        ['The default shell has no pipefail, so tee\'s exit code wins', true],
        ['tee swallows pytest\'s output, so the runner never sees it', false],
        ['GitHub ignores pytest exit codes unless --junitxml is set', false],
        ['The failure was in a quarantined test, which never counts', false],
      ], 'Without pipefail a pipeline exits with its last command\'s code, and tee succeeded; shell: bash runs bash -eo pipefail. tee copies output rather than hiding it, exit codes matter with or without JUnit, and the failing refund test was not quarantined.'),
      mcq('Four shards upload JUnit files and only one artefact appears; the other uploads fail with a name conflict. What is the fix?', [
        ['Put the matrix value in each artefact name and merge later', true],
        ['Give the upload step if: always() so every shard can write', false],
        ['Run the four shards one after another with max-parallel: 1', false],
        ['Use overwrite on the upload so each shard replaces the last', false],
      ], 'upload-artifact v4 allows each name once per run, so junit-shard-1 to junit-shard-4 are needed, merged by download-artifact with a pattern and merge-multiple. A condition changes when the step runs, not the clash; running shards in series still repeats the name; and overwriting would keep only the last shard\'s results.'),
      mcq('The PR selector fails with "unknown revision ... origin/main...HEAD" in CI but works locally. What is the cause?', [
        ['The checkout fetched one commit, so the base branch is missing', true],
        ['The selector has to be run from inside the tests directory', false],
        ['git is not installed on GitHub\'s hosted Ubuntu runner images', false],
        ['The test map was built on Windows and uses backslash paths', false],
      ], 'actions/checkout defaults to fetch-depth 1, so neither main nor a merge base exists in the clone; the demo reproduced the exact error with a depth-1 clone. fetch-depth: 0 fixes it. The working directory is not the issue, hosted runners have git, and the map paths use forward slashes.'),
      mcq('An expired quarantine stops the nightly run but not the pull-request run with -m "not quarantine". The check is in pytest_collection_finish. Why?', [
        ['That hook sees only the tests left after -m deselected', true],
        ['pytest_collection_finish runs only when no -m is given', false],
        ['Markers with arguments are cleared by -m expressions', false],
        ['The pull-request run uses a different conftest file', false],
      ], 'By collection_finish, -m has removed the quarantined test, so the check never meets it. A pytest_collection_modifyitems hook marked tryfirst runs before deselection and sees every test. collection_finish always runs, -m does not strip marker arguments, and both runs load the same conftest.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_CI_QUALITY_PRACTICE',
    notes: `Eight exercises on SafarBus's pipeline. Try each before reading the answer.

## 1. Order the stages (easy)

Lint (10 s), UI tests in two browsers (6 min), unit tests (40 s), API tests (2 min), a summary report. Write the
needs: for each job.

**Answer.** unit needs lint; api needs unit; ui needs api; report needs [unit, api, ui] with if: !cancelled() and a
gate step. Lint could also run beside unit (no needs) since both are cheap; either way the browsers start only when
the cheap checks pass.

## 2. Make the report survive (easy)

    - run: pytest tests/api --junitxml=reports/junit-api.xml || true
    - uses: actions/upload-artifact@v4
      with: { name: junit-api, path: reports/ }

**Answer.** Remove || true and give the upload step if: \${{ !cancelled() }}. The step now fails when tests fail, and
the report is still uploaded.

## 3. Name the artefacts (easy)

A matrix has browser: [chromium, firefox] and os: [ubuntu-latest, windows-latest]. Write an artefact name that is
unique per job.

**Answer.** junit-\${{ matrix.browser }}-\${{ matrix.os }}. Every matrix key that varies must appear in the name.

## 4. A stable shard function (medium)

Write shard_of(nodeid, n) that gives the same answer on every machine, and say why hash() does not.

**Answer.**

    import zlib
    def shard_of(nodeid: str, n: int) -> int:
        return zlib.crc32(nodeid.encode("utf-8")) % n

hash() of a string is salted per process (PYTHONHASHSEED), so separate CI machines split differently; in the demo
one run left 8 tests unrun and ran 15 twice.

## 5. Balance the shards (medium)

Durations in seconds: A 8, B 6, C 5, D 4, E 3, F 2, G 2. Split into two shards with the greedy longest-first rule.

**Answer.** A to S1 (8). B to S2 (6). C to S2 (11). D to S1 (12). E to S2 (14). F to S1 (14). G: tie at 14, the
first shard wins, S1 (16). Shards: S1 = A, D, F, G = 16 s; S2 = B, C, E = 14 s. The total is 30, so 15 each is the
ideal; greedy is close, and it is cheap.

## 6. How flaky? (medium)

A test failed 9 times in 60 runs. Give the rate and the chance that it passes 10 runs in a row.

**Answer.** 9/60 = 15%. 0.85 to the power 10 is about 0.20: one time in five, ten straight passes would wrongly
suggest it is fine. (The Wilson 95% interval for 9 of 60 is about 8% to 26%.)

## 7. Selection rules (medium)

Changed files: docs/setup.md, app/fares.py, requirements.txt. What does SafarBus's selector run?

**Answer.** Everything: requirements.txt is a run-all trigger, because a dependency upgrade can change behaviour
anywhere. The rules are checked file by file, and the first run-all trigger decides.

## 8. A gate rule that cannot be gamed (harder)

The manager proposes "release only when 100% of test cases pass". Rewrite it.

**Answer.** "Release when every merge-gate test passes on the release build, the quarantine has at most five tests,
none past its date, and no critical defect is open, unless a named person records a waiver." The original invites
skipping or deleting failing tests to reach 100%; the rewrite measures the release build, limits quarantine and
keeps the decision with a person.`,
    mcqs: [
      mcq('Two shards, greedy longest-first, durations 8, 6, 5, 4, 3, 2 and 2 seconds. What are the shard totals?', [
        ['16 s and 14 s', true],
        ['15 s and 15 s', false],
        ['18 s and 12 s', false],
        ['17 s and 13 s', false],
      ], 'Taking tests longest first and always giving the next to the lighter shard: 8 to S1, 6 and 5 to S2 (11), 4 to S1 (12), 3 to S2 (14), 2 to S1 (14), and the last 2 to S1 on the tie, 16 against 14. A perfect 15/15 split exists in theory but greedy does not search for it; the other totals do not follow the rule.'),
      mcq('A test failed 9 times in 60 runs. Roughly how often would it pass ten runs in a row?', [
        ['About one time in five', true],
        ['About one time in two', false],
        ['About one time in fifty', false],
        ['Never, at that failure rate', false],
      ], 'The failure rate is 15%, so ten passes in a row happen with probability 0.85 to the tenth power, about 0.20. That is why a handful of green reruns is weak evidence of a fix. One in two would be a rate near 7%, one in fifty near 32%, and ten passes are perfectly possible.'),
      mcq('A matrix varies browser and os. Which artefact name is safe with upload-artifact v4?', [
        ['junit-${{ matrix.browser }}-${{ matrix.os }}', true],
        ['junit-${{ matrix.browser }}-${{ github.run_id }}', false],
        ['junit-${{ matrix.os }}-${{ github.sha }}', false],
        ['junit-${{ github.job }}-${{ matrix.browser }}', false],
      ], 'A name must be unique per job in the run, so every matrix key that varies must appear in it. run_id, sha and job name are the same for every job of the matrix, so the other names collide (two jobs share each browser or os value).'),
      mcq('Changed files are docs/setup.md, app/fares.py and requirements.txt. What does the SafarBus selector run?', [
        ['The whole suite, since requirements.txt triggers a full run', true],
        ['The 21 fare tests, since only app/fares.py is application code', false],
        ['Smoke only, since one of the three changed files is a docs file', false],
        ['The fare tests and smoke, then the rest of the suite nightly', false],
      ], 'A changed dependency file can alter behaviour anywhere, so it is a run-all trigger and decides the outcome. The fare tests alone would ignore the upgrade, docs files never reduce a selection, and leaving the rest to the nightly run would let a dependency break merge.'),
      mcq('Which rewrite of "release only when 100% of test cases pass" is hardest to game?', [
        ['Merge-gate tests green on the release build, quarantine capped and dated', true],
        ['100% of test cases pass, and the number of test cases may not decrease', false],
        ['95% of the test cases pass, so that a few flaky tests cannot block it', false],
        ['100% of test cases pass on at least one of three consecutive CI runs', false],
      ], 'Tying the rule to the release build, capping and dating the quarantine and keeping waivers explicit leaves no quiet way out. A count floor still allows weakening tests, a 95% rule lets real failures through, and "one green run in three" is a retry policy that hides flaky and broken tests alike.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_CI_QUALITY_INTERVIEW_QUESTION',
    notes: `Four questions that come up in QA engineer and SDET interviews at product companies, GCCs and service companies,
with an answer that scores well and the follow-up a good interviewer asks next. Say each aloud in about two
minutes, using your own project's numbers.

## Q1. "How did you integrate your tests into CI?"

**Model answer.** "GitHub Actions, on every pull request and push to main. Unit tests first, then API tests against
a server the fixtures start, then Playwright tests in Chromium and Firefox as a matrix with fail-fast off. needs:
chains them, so a broken unit test skips the browser jobs. Each job writes JUnit XML, uploaded with if: !cancelled()
so failures still leave a report, and Playwright traces are uploaded on failure for a week. A report job merges the
JUnit files into the run summary and has a gate step that fails if any test job failed; that job is the required
check. No || true anywhere, and steps with pipes use shell: bash so pipefail is on."

**Follow-up.** "Your UI job takes 20 minutes. What do you do?" — "Measure first: per-test durations from JUnit. Move
rule checks down to API or unit tests, run with xdist, then shard by recorded duration across four runners, and
on pull requests run smoke plus the affected tests, with the full suite on main."

## Q2. "How do you deal with flaky tests?"

**Model answer.** "Measure, contain, fix. I find candidates from nightly history by flips: passing and failing on the
same code. I repeat the test 50 times to get a rate with an interval; ours failed 27 of 150, 18%. While fixing, I
quarantine it with a marker that needs an owner, a ticket and a date, so the merge gate excludes it and the nightly
job still runs and measures it; the conftest fails the run once the date passes. Then I fix the cause: here the test
assumed the sweeper would run within 0.22 seconds, so I tested the expiry logic with a fake clock and made the
integration test poll with a deadline. 0 of 50 failed afterwards."

**Follow-up.** "Why not just add retries?" — "Retries are acceptable only if every retried pass is reported as
flaky. Silent retries hide real races, and they do not even remove the red builds: an 18% flake fails twice in a
row about 3% of the time."

## Q3. "Your suite has 3,000 tests and takes 50 minutes. Developers have stopped waiting for it."

**Model answer.** "First the profile: which levels and which tests take the time; usually a few hundred UI tests are
most of it. Then, in order: delete duplicates and push rule checks down; parallelise waiting tests with xdist;
shard across runners with a deterministic, duration-balanced split, checking that every test runs exactly once;
smoke first on pull requests, then selection by changed files from a coverage map, with run-all for config,
dependency and unknown files. The full sharded suite runs on main and nightly as the safety net."

**Follow-up.** "What can go wrong with test selection?" — "A stale map, files the map does not know, changes outside
code such as configuration or data, and shallow clones in CI where git diff has no base. Each needs a run-all
fallback, and the full suite on main catches what selection missed."

## Q4. "Write a quality strategy for our product in five minutes."

**Model answer.** "I would start from the risks, not from tools: what failure costs the most money or trust. Each
risk gets a home at the lowest test level that catches it, and each level a time budget and a place in the
pipeline. Gates at pull request, merge, release and after deploy, each reading evidence the pipeline produces,
with waivers recorded by a named person. Production monitoring is part of it: synthetic journeys, SLOs, canaries
and flags. Every escaped bug becomes a test. And a few metrics with decisions attached: escaped defects, defect
detection percentage, change failure rate, feedback time and green-run rate."

**Follow-up.** "Which metric would you not use?" — "Test-case count or bugs filed per tester. Both can rise while
quality falls, and both reward the wrong behaviour."`,
    mcqs: [
      mcq('An interviewer asks why your report job needs a gate step when it already shows the failures. What is the best answer?', [
        ['The required check must fail when any test job failed', true],
        ['GitHub hides the summary unless the report job fails', false],
        ['The gate step is what uploads the JUnit files at the end', false],
        ['Without it the report job would run before the tests do', false],
      ], 'A report job with if: !cancelled() succeeds whenever its own steps succeed, so as the required check it would let a failed run merge; the gate step fails it when needs.*.result contains a failure. The summary is shown either way, uploads happen in the test jobs, and needs: already orders the jobs.'),
      mcq('In an interview you say you retry failed tests. Which follow-up answer shows you understand the risk?', [
        ['Every retried pass is reported as flaky and counted', true],
        ['Retries are capped at five so that the pipeline ends', false],
        ['Retries run only on main, never on pull requests', false],
        ['Each retry first waits for one minute before running', false],
      ], 'The danger of retries is hiding flakiness and real races, so the answer that counts is visibility: every test that needed a retry is reported and tracked. Caps, branch limits and delays change cost and timing but still let a retried pass vanish into green.'),
      mcq('Asked "what can go wrong with test selection?", which answer names a real failure mode?', [
        ['A shallow CI clone where git diff has no base to compare', true],
        ['Selected tests run faster than they would in the full suite', false],
        ['pytest cannot run a list of test ids read from a text file', false],
        ['Selection forces every test in the suite to become a unit test', false],
      ], 'With fetch-depth 1 the base branch and merge base are missing, so git diff fails, as the demo reproduced; the selector must then run everything. Speed is the goal, not a failure; pytest reads arguments from a file given with @; and selection works at any test level.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_CI_QUALITY_CHECKPOINT',
    notes: `Ten questions across the topic: test stages and reports in CI, failing for the right reasons, sharding and test
selection, flaky-test measurement and quarantine, and a product quality strategy. Answer without notes; the result
shows which lesson to revisit.`,
    checkpoint: [
      mcq('SafarBus\'s ui job needs api, which needs unit. A unit test fails. What happens to the api and ui jobs?', [
        ['Both are skipped, so no runner time goes to browsers', true],
        ['Both run anyway, since needs only decides their order', false],
        ['They run with continue-on-error so reports still appear', false],
        ['They wait until someone re-runs the failed unit job', false],
      ], 'A job whose needs did not succeed is skipped unless its if: says otherwise, which saves the expensive stages when a cheap one fails. needs is more than ordering, nothing adds continue-on-error, and skipped jobs do not wait for a re-run.'),
      mcq('A test step must upload its JUnit file even when tests fail, but not after someone cancels the run. Which condition fits?', [
        ['if: ${{ !cancelled() }}', true],
        ['if: ${{ always() }}', false],
        ['if: ${{ success() }}', false],
        ['if: ${{ github.event_name == \'push\' }}', false],
      ], '!cancelled() runs after success or failure but not after a cancel. always() also runs after a cancel, success() is the default that skips the step after a failure, and an event check does not depend on the test result at all.'),
      mcq('Why should a CI test step never end with || true?', [
        ['It turns every failing exit code into 0, so the step is green', true],
        ['It makes pytest skip the tests marked as quarantine in the run', false],
        ['It prevents pytest from writing the JUnit XML report file', false],
        ['It doubles the test run because the shell retries the command', false],
      ], 'cmd || true runs true whenever cmd fails, so the step always exits 0 and failures merge; the demo printed "step exit: 0" after a failing run. It does not change which tests run, pytest still writes its report, and nothing is retried.'),
      mcq('Every SafarBus CI shard must compute the same split. Which shard function meets that?', [
        ['zlib.crc32(nodeid.encode()) % n', true],
        ['hash(nodeid) % n', false],
        ['random.randrange(n) per test id', false],
        ['id(item) % n per collected item', false],
      ], 'crc32 depends only on the bytes of the node id, so every machine agrees. Python\'s hash() of a string is salted per process, random choices differ per run, and id() is a memory address that differs per process; all three leave tests unrun or run twice.'),
      mcq('Durations are 8, 6, 5, 4, 3, 2 and 2 seconds. With many shards, what is the fastest any sharded run can finish?', [
        ['8 seconds, the longest single test', true],
        ['4.3 seconds, the total over seven shards', false],
        ['2 seconds, the shortest test in the list', false],
        ['30 seconds, the total work of the suite', false],
      ], 'A test runs in one shard, so the shard holding the 8 s test takes at least 8 s however many shards exist; the next step is to split that test. Dividing the total by the shard count ignores that floor, the shortest test is irrelevant, and 30 s is the serial time.'),
      ck('AUTOMATED_TESTING', 'A seat-hold test failed 27 times in 150 runs. Which statement about it is correct?', [
        ['Its rate is about 18%; it passes 5 runs in a row about 37% of the time', true],
        ['Its rate is about 18%, so it fails at least once in any five runs', false],
        ['Its rate is about 27%, since 27 of the runs ended in a failure', false],
        ['It is not flaky, since it passed most of the 150 runs it was given', false],
      ], '27/150 is 18%, and 0.82 to the fifth power is about 0.37, so five green runs in a row prove little. Failing at least once in five is likely but not certain, 27 is a count rather than a percentage, and a test that both passes and fails on the same code is flaky by definition.'),
      ck('AUTOMATED_TESTING', 'Which quarantine rule keeps a flaky test visible while it is out of the merge gate?', [
        ['An owner, a ticket and an end date, and nightly runs that measure it', true],
        ['A skip marker with a reason string, so it no longer fails anyone\'s run', false],
        ['Deleting it and adding a ticket to write it again once time allows', false],
        ['Moving it into a separate folder that the merge-gate job does not run', false],
      ], 'Quarantine should remove the test from the gate, not from sight: someone owns it, a ticket tracks the fix, the date forces a decision and nightly runs keep measuring it. A plain skip, a deletion or a forgotten folder all stop the check from running anywhere.'),
      ck('AUTOMATED_TESTING', 'A test\'s nightly history is PPPFPFPPPFPP and another\'s is PPPPPPPPPPFF. What is the right reading?', [
        ['The first is flaky; the second is a regression that began in run 11', true],
        ['Both are flaky, since each has failed at least twice in twelve runs', false],
        ['The first is a regression; the second is flaky, as it has stopped passing', false],
        ['Both are regressions, since any failure in a nightly run is a new bug', false],
      ], 'Flips between pass and fail on the same code mark a flaky test; a long run of passes followed by consistent failures marks a change in behaviour with a start point. Counting failures alone confuses the two, and treating every failure as new or as flaky sends the team the wrong way.'),
      ck('AUTOMATED_TESTING', 'In a product quality strategy, what is the point of a time budget for each test level?', [
        ['Outgrowing it triggers a design change, not a slower pipeline', true],
        ['It tells testers how long manual test execution should take', false],
        ['It sets the timeout-minutes value for every job in the pipeline', false],
        ['It lets the team bill clients for the hours spent testing', false],
      ], 'A budget makes growth visible: when the UI level passes five minutes, the team pushes checks down, shards or deletes, instead of letting feedback get slower month by month. It is not about manual execution, job timeouts are a separate safety net, and it has nothing to do with billing.'),
      ck('AUTOMATED_TESTING', 'Which practice treats production monitoring as part of testing?', [
        ['A synthetic search-and-book journey every minute with an alert rule', true],
        ['Running the full regression suite against production every night', false],
        ['Copying production data to staging and testing it there weekly', false],
        ['Asking customer support to forward complaints to the QA team', false],
      ], 'A scripted journey with a test account, on a schedule, with an alert after repeated failures checks the live system the way a user meets it. Running the whole regression suite on production creates real bookings and load, copying production data raises privacy problems under the DPDP Act, and complaints arrive after users are hurt.'),
    ],
  },
];
