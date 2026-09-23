/**
 * T2_TRACK_CLOUD — eleven units. Year 2, direction track.
 *
 * ── WHAT A SECOND-YEAR NEEDS FROM THIS ────────────────────────────────────────────────────
 *
 * Cloud and operations rarely hires true juniors, which the direction units said plainly. This
 * track is therefore written for two outcomes: a student who can deploy and operate their own work
 * properly — which every direction benefits from — and a student who wants this as a second role
 * after backend, and needs the foundations to be real.
 *
 * The emphasis throughout is on the unglamorous half: what it costs, what breaks, how you find out,
 * and how you get back. Deploying is easy. Recovering at three in the morning is the job.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const CLOUD_TRACK_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'T2_TRACK_CLOUD_WHAT_CLOUD_IS',
    notes: `The cloud is somebody else's computers, rented by the hour, with an API in front of them.
Everything else is detail — but the detail decides your bill.

**The three things you rent:**

| Resource | What it is | Charged by |
|---|---|---|
| **Compute** | Machines or containers running your code | Time running, and size |
| **Storage** | Disks, object stores, databases | Space held, and often requests |
| **Network** | Moving data in and out | Data out, almost always |

**Data in is usually free; data out is not.** That asymmetry surprises everybody once. An
application serving large files or images can spend more on bandwidth than on the machine serving
them.

**The service models**, from most control to least:

- **IaaS** — a virtual machine. You manage the OS, the patches, everything.
- **PaaS** — you provide the code, they run it. Less control, far less work.
- **Serverless** — you provide a function; it runs on demand and costs nothing idle.
- **SaaS** — somebody else's finished application.

**For a second-year project, a managed platform is almost always the right answer.** Running your
own virtual machine teaches you a great deal and costs you evenings in maintenance that are not the
point of your project.

**The cost model is what people get wrong.** Three recurring surprises:

1. **A machine left running.** Compute is charged whether or not anybody uses it, and an instance
   started for an experiment in March is still charging in June.
2. **Bandwidth.** Serving video or images at any volume.
3. **Managed database backups and snapshots.** Storage charged repeatedly, quietly.

**Set a billing alert before you deploy anything.** Every provider offers them, they take two
minutes, and the alternative is discovering the problem on a statement.

**Use the free tiers deliberately.** All the major providers have them, and they are enough for a
student project — but read the limits, because exceeding one silently is the other common way a bill
appears.

**Regions matter** for latency, for law and for price. A server near your users is faster; data about
Indian users may need to stay in India; and the same instance costs different amounts in different
regions.`,
    mcqs: [
      mcq('Network charges usually apply to:',
        [['Data leaving the provider', true],
          ['Data entering the provider', false],
          ['Both equally', false],
          ['Traffic between regions only', false]],
        'The asymmetry surprises everybody once.'),
      mcq('For a student project, the usual right choice is:',
        [['A managed platform', true],
          ['Your own virtual machine', false],
          ['A dedicated server', false],
          ['A local machine with port forwarding', false]],
        'Running your own VM costs evenings that are not the point.'),
      mcq('The commonest source of an unexpected cloud bill is:',
        [['A machine left running', true],
          ['Excessive API calls', false],
          ['Storage of large files', false],
          ['Multiple regions enabled', false]],
        'Compute is charged whether or not anybody uses it.'),
      mcq('A billing alert should be configured:',
        [['Before deploying anything', true],
          ['After the first month\'s usage', false],
          ['Only on paid tiers', false],
          ['When approaching the free tier limit', false]],
        'Two minutes, against discovering it on a statement.'),
    ],
    checkpoint: [
      mcq('Serverless differs from PaaS mainly in that it:',
        [['Costs nothing while idle', true],
          ['Gives more control over the OS', false],
          ['Requires container images', false],
          ['Cannot scale automatically', false]],
        'It runs on demand rather than continuously.'),
      mcq('Region choice affects:',
        [['Latency, legal obligations and price', true],
          ['Only latency', false],
          ['Only price', false],
          ['Availability of the free tier alone', false]],
        'Data about Indian users may need to stay in India.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_CLOUD_SERVERS',
    notes: `A virtual machine you can reach from anywhere is also a machine anybody can reach. The
first hour after creating one decides whether that is a problem.

**Creating one** gives you a size, a region, an operating system image and a key pair. Take the
smallest size that works; you can resize later, and the default is usually larger than you need.

**Connecting, with a key rather than a password:**

    chmod 600 ~/.ssh/id_ed25519          # SSH refuses a key others can read
    ssh -i ~/.ssh/id_ed25519 ubuntu@203.0.113.10

**Password authentication should be disabled entirely.** A machine with SSH open and passwords
enabled is under automated attack within minutes of existing — not hours, minutes. Key-only
authentication removes the entire category.

**The first-hour checklist:**

1. Update the packages
2. Create a non-root user with sudo, and stop using root
3. Disable password authentication and root login in \`sshd_config\`
4. Configure the firewall: allow SSH, HTTP and HTTPS, deny everything else
5. Enable automatic security updates
6. Set up log rotation, so the disk does not fill

**Security groups are the firewall that matters**, and they are the thing most often left open. A
database port open to the world is the commonest serious misconfiguration in cloud infrastructure,
and it has caused many of the breaches you have read about. Your database should accept connections
only from your application, never from the internet.

**Keys are credentials.** The private key never leaves your machine, never goes in a repository,
never gets emailed. If one leaks, remove the public key from the server and issue a new pair.

**Treat servers as replaceable.** A machine you have configured by hand over six months, with
changes nobody recorded, cannot be rebuilt when it fails — and it will fail. Write the setup down as
a script from the first day, so the machine is reproducible.

**Monitor the disk.** A full disk is the single most common cause of a server that stops working for
no apparent reason, and logs are usually what filled it.`,
    mcqs: [
      mcq('A new server with SSH password authentication enabled is:',
        [['Under automated attack within minutes', true],
          ['Safe if the password is strong', false],
          ['Only at risk once it is publicised', false],
          ['Protected by the provider by default', false]],
        'Key-only authentication removes the whole category.'),
      mcq('The commonest serious cloud misconfiguration is:',
        [['A database port open to the internet', true],
          ['An unpatched operating system', false],
          ['A weak SSH key', false],
          ['Logging disabled', false]],
        'It should accept connections only from your application.'),
      mcq('A private SSH key should:',
        [['Never leave your own machine', true],
          ['Be stored in the repository for the team', false],
          ['Be shared with whoever needs access', false],
          ['Be backed up to cloud storage', false]],
        'If one leaks, remove the public key and issue a new pair.'),
      mcq('Configuring a server by hand over months means:',
        [['It cannot be rebuilt when it fails', true],
          ['It performs better than a scripted one', false],
          ['It is easier to debug', false],
          ['Changes are automatically recorded', false]],
        'Write the setup as a script from the first day.'),
    ],
    checkpoint: [
      mcq('The most common cause of a server that stops working unexpectedly is:',
        [['A full disk, usually from logs', true],
          ['A memory leak in the application', false],
          ['An expired certificate', false],
          ['A network partition', false]],
        'Set up log rotation and monitor the disk.'),
      mcq('The first-hour checklist includes disabling:',
        [['Password authentication and root login', true],
          ['Automatic security updates', false],
          ['The firewall, for convenience', false],
          ['Log rotation', false]],
        'Along with creating a non-root user and configuring the firewall.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_CLOUD_DEPLOYING',
    notes: `Getting code onto a machine and serving it to the internet. Conceptually simple, and full
of steps that are obvious only after you have missed one.

**What has to be true for a request to reach your code:**

1. A domain name points at the server
2. Something listens on port 443 and terminates TLS
3. That something forwards to your application
4. Your application is running, and stays running
5. The firewall allows 80 and 443

**A reverse proxy in front of your application** is the standard arrangement. Nginx or Caddy handles
TLS, serves static files, and forwards the rest — and it means your application never needs to run as
root or hold a certificate.

    server {
        listen 443 ssl;
        server_name app.example.com;
        location / {
            proxy_pass http://127.0.0.1:8000;
            proxy_set_header Host $host;
        }
    }

**Your application must not be started by hand.** A process started in a terminal dies when that
terminal closes and never returns after a reboot. Use a service manager — systemd, or your platform's
equivalent — so it starts at boot and restarts on failure.

**TLS is free and automatic** via Let's Encrypt, and there is no reason to serve anything over plain
HTTP in 2026. Certbot or Caddy renews it; check the renewal works before the ninety days elapse,
because an expired certificate is a very visible outage.

**Environment variables for configuration**, provided by the service manager or the platform, never
committed.

**Deploy repeatably from the first release.** A deployment done by typing commands is one you will do
differently under pressure. A script — pull, install, migrate, restart, verify — is a deployment
anybody can run and everybody runs identically.

**The order matters:** migrate before restarting if the new code needs the new schema, and design
migrations so both versions of the code can run against the schema during the switch.

**Verify after deploying**, automatically. A deployment that reports success while the application
fails to start is worse than one that fails loudly — hit the health endpoint and check the response.

**Have a way back.** Before your first deployment, know how you would return to the previous version.
The answer at this scale can be "redeploy the previous commit", but it should be an answer you have
tried, not one you are assuming.`,
    mcqs: [
      mcq('A reverse proxy in front of your application means:',
        [['Your app never runs as root', true],
          ['Requests are load balanced automatically', false],
          ['Static files are cached in memory', false],
          ['The application can listen on port 443', false]],
        'Nginx or Caddy terminates TLS and forwards the rest.'),
      mcq('An application started by hand in a terminal:',
        [['Dies with the terminal, and after a reboot', true],
          ['Runs until it crashes', false],
          ['Restarts automatically on failure', false],
          ['Is managed by the operating system', false]],
        'Use a service manager so it starts at boot.'),
      mcq('Deployment should be scripted from the first release because:',
        [['A typed deployment varies under pressure', true],
          ['Scripts run faster', false],
          ['Providers require automation', false],
          ['It enables rollback by default', false]],
        'A script is a deployment anybody can run identically.'),
      mcq('A deployment that reports success while the app fails to start is:',
        [['Worse than one that fails loudly', true],
          ['Acceptable if monitoring catches it', false],
          ['Normal for asynchronous deployments', false],
          ['A problem only for zero-downtime setups', false]],
        'Verify by hitting the health endpoint afterwards.'),
    ],
    checkpoint: [
      mcq('Migrations should be designed so that:',
        [['Both code versions can run against the schema', true],
          ['They run after the restart', false],
          ['They lock the tables during the switch', false],
          ['They are applied manually for safety', false]],
        'Otherwise the switch has a window where one of them fails.'),
      mcq('Before your first deployment, you should already know:',
        [['How to return to the previous version', true],
          ['How to scale horizontally', false],
          ['The cost per thousand requests', false],
          ['The provider\'s uptime guarantee', false]],
        'And have tried it, rather than assuming it.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_CLOUD_CONFIG_SECRETS',
    notes: `The same code runs on your laptop, in the test environment and in production, pointed at
different things. Configuration is what differs, and secrets are the part that must never be in the
repository.

**The rule from the backbone, applied here:** anything that differs between environments, or must not
be public, is configuration. Everything else is code.

**Where configuration comes from in production:** environment variables set by the platform or the
service manager, or a secret manager for the sensitive ones. Not a file you edited on the server,
because that file exists nowhere else and vanishes with the machine.

**Secret managers** — AWS Secrets Manager, Google Secret Manager, Vault — add what environment
variables cannot: access control, rotation, and an audit trail of who read what. For a student
project, environment variables are adequate. For anything with real users, a secret manager is what
you should reach for.

**Never log configuration.** A startup line printing the loaded settings puts your database password
in a log file, which is copied, shipped and read by many people.

**Separate environments properly.** Development, staging and production with different credentials
and different data. The failure this prevents is the one everybody has heard of: a script run against
production because the connection string in the terminal was the wrong one. Separate credentials make
that impossible rather than unlikely.

**Never use production data in development.** If you need realistic data, anonymise it — and treat a
copy of production data on a laptop as the incident it would be if that laptop were lost.

**Validate configuration at startup.** Fail immediately with a clear message when a required variable
is missing, rather than discovering it in a request handler at two in the morning:

    DATABASE_URL = require_env("DATABASE_URL")

**Rotate secrets when someone leaves**, when one may have been exposed, and periodically. Rotation is
only possible if you know where each secret is used, which is an argument for keeping them in one
place.

**And a leaked secret is revoked first, investigated second.** That order matters more than anything
else in this unit.`,
    mcqs: [
      mcq('Configuration edited in a file on the server:',
        [['It vanishes with the machine', true],
          ['Is the standard production approach', false],
          ['Is safer than environment variables', false],
          ['Can be recovered from a backup reliably', false]],
        'Environment variables or a secret manager instead.'),
      mcq('A secret manager adds what environment variables lack:',
        [['Access control and rotation', true],
          ['Encryption in transit', false],
          ['Environment separation', false],
          ['Faster startup', false]],
        'Environment variables are adequate for a student project.'),
      mcq('Separate credentials per environment prevent:',
        [['A script run against production', true],
          ['Secrets being committed', false],
          ['Configuration drift', false],
          ['Unauthorised deployments', false]],
        'Impossible rather than unlikely.'),
      mcq('Configuration should be validated:',
        [['At startup, with a clear message', true],
          ['On first use of each value', false],
          ['During the deployment script', false],
          ['By the secret manager', false]],
        'Rather than discovering a missing variable in a handler at 2am.'),
    ],
    checkpoint: [
      mcq('Printing loaded settings at startup risks:',
        [['Putting the database password in a log file', true],
          ['Slowing the startup sequence', false],
          ['Exposing the configuration schema', false],
          ['Breaking the secret manager integration', false]],
        'Logs are copied, shipped and read by many people.'),
      mcq('A copy of production data on a developer laptop should be treated as:',
        [['An incident if the laptop were lost', true],
          ['Acceptable for realistic testing', false],
          ['Safe once the laptop is encrypted', false],
          ['Necessary for debugging', false]],
        'Anonymise it instead, and keep the real thing where it belongs.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_CLOUD_CONTAINERS',
    notes: `A container packages your code with everything it needs to run, so the thing that works on
your machine is the thing that runs in production. That is the whole pitch, and it is largely true.

    FROM python:3.12-slim

    WORKDIR /app
    COPY requirements.txt .
    RUN pip install --no-cache-dir -r requirements.txt

    COPY . .
    ENV PORT=8000
    EXPOSE 8000
    CMD ["gunicorn", "-b", "0.0.0.0:8000", "app:app"]

**Copy the requirements before the code.** Docker caches each layer, and a layer is rebuilt when
anything above it changes. With requirements copied first, changing your code does not reinstall
every dependency — which is the difference between a five-second build and a three-minute one.

**Images versus containers.** An image is the built artefact; a container is a running instance of
it. You build once and run the identical image in every environment, which is what makes the
promise work.

**Keep images small.** A \`-slim\` or Alpine base, no build tools in the final image, and a
multi-stage build when you need a compiler to produce something you then copy. A 1.2GB image is slow
to push, slow to pull and slow to start.

**\`.dockerignore\`** matters as much as \`.gitignore\`: without it you copy \`.git\`,
\`node_modules\`, your local \`.env\` and every cached artefact into the image.

**Never bake secrets into an image.** Anybody who can pull it can read every layer, including files
you deleted in a later one. Secrets come in at runtime as environment variables.

**Containers are ephemeral.** Anything written inside one is gone when it restarts, which is fine for
a stateless application and fatal for a database. Persistent data goes in a volume or, better, in a
managed database outside the container.

**\`docker compose\`** for running several together locally — an app, a database, a cache — described
in one file that a new developer can start with one command. That alone often justifies the whole
thing for a small team.

**Run as a non-root user** inside the container. The default is root, and a process escaping a
container running as root is a considerably worse day than one running as \`app\`.

**Kubernetes exists**, and you do not need it. Recognise what it is — orchestration across many
machines — and know that for anything a second-year builds, a managed platform running one container
is the right scale.`,
    mcqs: [
      mcq('Requirements are copied before the application code because:',
        [['Layer caching avoids reinstalling them', true],
          ['Docker requires that order', false],
          ['It reduces the final image size', false],
          ['Dependencies must exist before the code', false]],
        'The difference between a five-second and a three-minute build.'),
      mcq('A secret baked into an image is:',
        [['Readable by anybody who can pull it', true],
          ['Encrypted within the layer', false],
          ['Removed if deleted in a later layer', false],
          ['Only visible to the image owner', false]],
        'Secrets come in at runtime as environment variables.'),
      mcq('Data written inside a container:',
        [['Is lost when it restarts', true],
          ['Persists in the image', false],
          ['Is written to the host automatically', false],
          ['Survives until the image is rebuilt', false]],
        'Use a volume, or better a managed database outside it.'),
      mcq('Containers should run as:',
        [['A non-root user', true],
          ['Root, which is the default', false],
          ['The same user as the host', false],
          ['A user matching the service account', false]],
        'An escape from a root container is a considerably worse day.'),
    ],
    checkpoint: [
      mcq('`.dockerignore` prevents:',
        [['Copying .git and .env into the image', true],
          ['Layers being cached incorrectly', false],
          ['Secrets being read at runtime', false],
          ['The image running as root', false]],
        'As important as .gitignore.'),
      mcq('For anything a second-year builds, the right scale is:',
        [['A managed platform running one container', true],
          ['A Kubernetes cluster', false],
          ['Several orchestrated virtual machines', false],
          ['A serverless function per endpoint', false]],
        'Recognise what Kubernetes is; you do not need it.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_CLOUD_CI_CD',
    notes: `A pipeline is the automated path from a commit to a deployment, and its most valuable
property is what it refuses to ship.

    name: CI
    on: [push, pull_request]
    jobs:
      test:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-python@v5
            with: { python-version: '3.12' }
          - run: pip install -r requirements.txt
          - run: pytest
          - run: ruff check .

**Continuous integration** is that: every push runs the tests, on a clean machine, and tells you
within minutes. Its real value is the clean machine — it catches everything that works only because
of something installed on your laptop.

**Continuous delivery** adds a deployment to the same pipeline, triggered on merges to \`main\`, and
only when everything before it passed.

**What the pipeline must refuse to ship:** failing tests, failing linting, a known vulnerable
dependency, a secret detected in the diff, and code that has not been reviewed. Each of those is a
gate somebody would otherwise skip under time pressure, which is exactly when it matters.

**Fast, or ignored.** A pipeline taking twenty minutes is a pipeline people stop waiting for and
start working around. Cache dependencies, run independent jobs in parallel, and run the slowest
checks only where they are needed.

**Pipeline secrets live in the provider's secret store**, injected as environment variables, and
never printed. A build log is often visible to more people than the repository.

**Deploy on merge, not on push to a branch.** The reviewed, tested state of \`main\` is what goes
out, and nothing else does.

**Every deployment should be traceable:** which commit, deployed by what, when. When something breaks
at four in the afternoon, "what changed" is the first question and the deployment log is the answer.

**Rollback is part of the pipeline, not an emergency improvisation.** Whether it is redeploying the
previous image or a platform's one-click revert, it must be something you have tested — and the
moment you need it is not the moment to find out.

**Start small.** Tests on every push is the whole of the value for a student project, and it is
worth having before anything else in this unit.`,
    mcqs: [
      mcq('The real value of CI running on a clean machine is that it:',
        [['It catches what only your laptop has', true],
          ['Runs the tests faster', false],
          ['Isolates the tests from each other', false],
          ['Reduces the cost of the pipeline', false]],
        'The missing dependency that was installed last year.'),
      mcq('A pipeline taking twenty minutes tends to be:',
        [['Worked around rather than waited for', true],
          ['More thorough and therefore better', false],
          ['Normal for a compiled language', false],
          ['A sign of good test coverage', false]],
        'Cache dependencies and parallelise independent jobs.'),
      mcq('Deployment should be triggered by:',
        [['A merge to main, after review and tests', true],
          ['Any push to any branch', false],
          ['A manual command after merging', false],
          ['A scheduled nightly job', false]],
        'The reviewed, tested state is what goes out.'),
      mcq('Pipeline secrets must never be printed because:',
        [['Build logs are widely visible', true],
          ['Logs are retained indefinitely', false],
          ['Printing them slows the build', false],
          ['The provider forbids it', false]],
        'Injected as environment variables from the secret store.'),
    ],
    checkpoint: [
      mcq('Rollback should be:',
        [['Part of the pipeline, and already tested', true],
          ['An emergency manual procedure', false],
          ['Handled by the provider automatically', false],
          ['Unnecessary with good testing', false]],
        'The moment you need it is not the moment to find out.'),
      mcq('For a student project, the first thing worth automating is:',
        [['Tests on every push', true],
          ['Deployment on merge', false],
          ['Dependency scanning', false],
          ['Container image builds', false]],
        'That is most of the value, before anything else.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_CLOUD_MONITORING',
    notes: `You cannot fix what you cannot see. Monitoring is the difference between knowing your
system broke and being told by a customer.

**The three kinds of signal, and what each is for:**

| | Answers | Example |
|---|---|---|
| **Logs** | What happened, in detail | The traceback for request a4f2 |
| **Metrics** | How much, over time | Requests per minute, error rate, p95 latency |
| **Traces** | Where the time went | This request spent 1.8s in the database |

**The four numbers worth watching** on almost any service: request rate, error rate, latency at the
95th percentile, and saturation — how full the resource is.

**Percentiles, not averages.** An average latency of 200ms can hide 5% of requests taking four
seconds, and those 5% are the users who leave. The p95 and p99 tell you what the worst experience
actually is.

**Centralise the logs.** Logs on a machine are logs you lose when the machine is replaced, and logs
you cannot search across instances. Ship them somewhere, and make sure the request id from the
backend track travels with them.

**Alert on symptoms, not causes.** "The error rate is above 2% for five minutes" is worth waking
somebody for. "CPU is at 80%" is not — it may be entirely fine, and an alert that fires when nothing
is wrong trains people to ignore alerts.

**Every alert must be actionable.** If the answer to an alert is "acknowledge it and carry on", it
should not exist. Alert fatigue is the failure mode of monitoring, and once a team is ignoring
alerts, the one that mattered gets ignored too.

**Health and readiness endpoints** are what the platform uses to decide whether to send you traffic
and whether to restart you. Health should be cheap and not touch the database; readiness should check
that dependencies are reachable.

**Watch the business numbers too.** Orders per hour falling to zero is a better signal than any
technical metric, because it catches the failures that do not raise an error — a broken form, a
payment provider quietly rejecting everything.

**Monitor before you need it.** Instrumenting during an incident is the worst possible time, and the
data you wanted is the data from the last hour, which you do not have.`,
    mcqs: [
      mcq('The four signals worth watching on almost any service are:',
        [['Rate, errors, latency and saturation', true],
          ['CPU, memory, disk and network', false],
          ['Uptime, errors, deploys and rollbacks', false],
          ['Logs, metrics, traces and alerts', false]],
        'Symptoms of what users experience, rather than machine internals.'),
      mcq('Latency should be reported as a percentile because:',
        [['An average hides the worst experiences', true],
          ['Percentiles are easier to compute', false],
          ['Averages require more storage', false],
          ['It is the industry convention', false]],
        '200ms average can hide 5% at four seconds.'),
      mcq('Alerting on "CPU at 80%" is discouraged because:',
        [['It may be fine, and false alerts numb people', true],
          ['CPU cannot be measured reliably', false],
          ['It duplicates the saturation metric', false],
          ['It fires too rarely to be useful', false]],
        'Alert on symptoms, not causes.'),
      mcq('Orders per hour falling to zero is valuable because:',
        [['It catches failures that raise no error', true],
          ['It is easier to measure than latency', false],
          ['It correlates with CPU usage', false],
          ['Business metrics are required for compliance', false]],
        'A broken form, or a provider quietly rejecting everything.'),
    ],
    checkpoint: [
      mcq('Logs should be centralised because logs on a machine are:',
        [['Lost with the machine, and unsearchable', true],
          ['Slower to write', false],
          ['Not retained by default', false],
          ['Unavailable to the platform', false]],
        'And the request id must travel with them.'),
      mcq('An alert whose only response is to acknowledge it:',
        [['Should not exist', true],
          ['Should fire less frequently', false],
          ['Should be routed to a different team', false],
          ['Is a useful record of system state', false]],
        'Alert fatigue is the failure mode of monitoring.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_CLOUD_RELIABILITY',
    notes: `Everything fails eventually. Reliability is not preventing that; it is limiting the damage
and getting back quickly.

**Backups, and the rule that matters: a backup you have not restored is not a backup.** It is a file
you believe in. Restore one, to a separate environment, on a schedule, and time how long it takes.

**The 3-2-1 idea**, adapted: at least three copies, on two kinds of storage, one of them somewhere
else. A backup on the same machine as the database protects against deletion and against nothing
else.

**Know your two numbers:**

- **RPO** — how much data you can afford to lose. Hourly backups means up to an hour.
- **RTO** — how long you can afford to be down. Restoring a large database takes longer than people
  expect, and the time to find out is not during the outage.

**Automated backups are not enough on their own.** Verify they are running, verify they are complete,
and verify they restore. A backup job that has been failing silently for three months is a common and
entirely avoidable disaster.

**Rollback before diagnosis.** When a deployment breaks production, get back to the working version
first and investigate afterwards. Debugging in front of users, while the system is down, produces
worse decisions and a longer outage.

**Write the runbook before you need it.** A short document per likely failure: how to tell it is
happening, how to confirm, what to do, who to tell. Five of them, half a page each — how to restore
the database, how to roll back, what to do when the disk is full, what to do when the app will not
start, who to contact.

**The value of a runbook is at three in the morning**, when whoever is awake is tired and probably
not the person who built it. A procedure written calmly beats improvisation under pressure every
time.

**Practise the recovery.** Delete a test database and restore it. Roll back a deployment
deliberately. The first time you do either should not be the time it matters.

**Write a blameless post-incident note** afterwards: what happened, the timeline, why, and what
would prevent it. The point is the system, not the person — and a culture where people hide mistakes
produces more of them, not fewer.`,
    mcqs: [
      mcq('A backup you have never restored is:',
        [['A file you believe in', true],
          ['Adequate if the job reports success', false],
          ['Verified by its checksum', false],
          ['Sufficient for most failures', false]],
        'Restore one on a schedule and time how long it takes.'),
      mcq('RPO describes:',
        [['How much data you can afford to lose', true],
          ['How long you can afford to be down', false],
          ['How often backups run', false],
          ['How many copies exist', false]],
        'RTO is the second one: how long you can afford to be down.'),
      mcq('When a deployment breaks production you should:',
        [['Roll back first, then investigate', true],
          ['Diagnose before changing anything', false],
          ['Apply a quick fix forward', false],
          ['Wait for more information', false]],
        'Debugging in front of users produces worse decisions.'),
      mcq('A backup on the same machine as the database protects against:',
        [['Accidental deletion', true],
          ['Hardware failure', false],
          ['Ransomware', false],
          ['Regional outages', false]],
        'Three copies, two kinds of storage, one elsewhere.'),
    ],
    checkpoint: [
      mcq('A runbook is valuable mainly because:',
        [['It is read by somebody tired', true],
          ['It documents the architecture', false],
          ['It satisfies an audit requirement', false],
          ['It replaces monitoring', false]],
        'Written calmly, read under pressure.'),
      mcq('A blameless post-incident note focuses on:',
        [['The system, not the person', true],
          ['Assigning responsibility clearly', false],
          ['The cost of the outage', false],
          ['Preventing recurrence through process only', false]],
        'A culture where people hide mistakes produces more of them.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_CLOUD_DEBUGGING',
    notes: `Something is broken in production, users are affected, and you have to work out what
without breaking it further.

**The order, and it matters:**

1. **Is it actually broken?** Reproduce it, or confirm from monitoring. One report may be one user's
   network.
2. **How bad, and who is affected?** Everybody, or one endpoint, or one region.
3. **What changed?** A deploy, a configuration change, a migration, a dependency, a traffic spike, a
   certificate expiry. Ninety per cent of incidents have an answer here.
4. **Stop the bleeding.** Roll back, scale up, disable the feature. Restore service first.
5. **Then diagnose**, with the pressure off.

**The shapes, and where each points:**

**Everything is down.** The whole instance, the load balancer, DNS, an expired certificate, or the
account itself — check the provider status page early, because it is occasionally the whole answer.

**Intermittent failures.** One instance of several is unhealthy, a dependency is flapping, or
something is running out of a resource periodically.

**Slow, not down.** The database, a dependency timing out, a connection pool exhausted, or traffic
you have not scaled for.

**It broke at exactly midnight.** A scheduled job, a certificate, a token expiry, or a date boundary
in the code.

**It broke after a deploy.** Roll back and confirm; that both restores service and tells you where to
look.

**It works on the server and not for users.** DNS, a CDN, a firewall, or a client-side error — the
problem is between you and them.

**The commands you will use:**

    systemctl status myapp; journalctl -u myapp -n 200    # is it running, and what did it say
    df -h                                                  # the full disk, always worth ruling out
    free -h; top                                           # memory and CPU
    ss -tlnp                                               # what is listening
    curl -v https://app.example.com/health                 # from outside

**Change one thing at a time**, and write down what you changed. An incident where four people made
six undocumented changes is one nobody can learn from afterwards, and it is often one where the
recovery took longer than the failure.

**Communicate while you work.** A short update every fifteen minutes to whoever is affected, even
when there is nothing new, is the difference between a handled incident and a panic.`,
    mcqs: [
      mcq('The first question in an incident is:',
        [['Is it actually broken?', true],
          ['What changed recently?', false],
          ['Should we roll back?', false],
          ['Which component failed?', false]],
        'One report may be one user\'s network.'),
      mcq('"What changed?" answers roughly:',
        [['Ninety per cent of incidents', true],
          ['Half of incidents', false],
          ['Only deployment-related incidents', false],
          ['Incidents with a clear error message', false]],
        'A deploy, a config change, a migration, a certificate.'),
      mcq('Restoring service before diagnosing is preferred because:',
        [['Debugging under pressure produces worse decisions', true],
          ['The cause disappears after rollback', false],
          ['Monitoring data is clearer afterwards', false],
          ['Users cannot be informed until it is fixed', false]],
        'Stop the bleeding, then diagnose with the pressure off.'),
      mcq('A failure at exactly midnight suggests:',
        [['A scheduled job or an expiry', true],
          ['A traffic spike', false],
          ['A memory leak', false],
          ['A network partition', false]],
        'Certificates and tokens expire on boundaries.'),
    ],
    checkpoint: [
      mcq('During an incident you should change:',
        [['One thing at a time, writing each down', true],
          ['Several things quickly, to restore service', false],
          ['Nothing until the cause is known', false],
          ['Only configuration, never code', false]],
        'Otherwise nobody can learn from it afterwards.'),
      mcq('Communicating every fifteen minutes during an incident:',
        [['The difference between order and panic', true],
          ['Slows the technical response', false],
          ['Is only needed for customer-facing outages', false],
          ['Should wait until the cause is known', false]],
        'Even when there is nothing new to report.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_CLOUD_PRACTICE',
    notes: `No new ideas. Deploy, break and recover things until the procedures are familiar rather
than frightening.

**Use free tiers and small instances, and destroy what you create.** Set a billing alert first.

**Do these:**

1. **Deploy from scratch.** A server, the first-hour hardening checklist, a reverse proxy, TLS, a
   service manager, and an application reachable on a domain. Record every step as you go.
2. **Rebuild from your script.** Destroy the server and recreate it using only what you wrote down.
   Whatever you had to improvise was missing from the script.
3. **Containerise something.** A Dockerfile, a compose file with a database, running locally and
   deployed.
4. **Build a pipeline.** Tests on every push, deploy on merge to main, and a deliberate failing test
   to prove the gate holds.
5. **Break the disk.** Fill it, watch what fails, and fix it. This is the failure you are most likely
   to meet.
6. **Roll back under pressure.** Deploy something broken deliberately, then recover it, and time
   yourself.
7. **Restore a backup.** Take one, delete the database, restore it, and record the RTO you measured.
8. **Write five runbooks**, half a page each, then have somebody else follow one without your help.

**Record for each:** what you did, what surprised you, and how long it took.

**The standard this set aims at:** deploying is the easy half. The measure is whether you can get
back when it breaks, from what you wrote down, at a time when you are tired and nobody is available
to help.`,
    mcqs: [
      mcq('Rebuilding the server from your own script reveals:',
        [['The steps you improvised and never wrote down', true],
          ['Performance differences between instances', false],
          ['Configuration drift over time', false],
          ['Whether the backup is valid', false]],
        'Whatever you had to improvise was missing.'),
      mcq('A deliberately failing test in the pipeline exercise proves:',
        [['That the gate blocks a deployment', true],
          ['That the tests are comprehensive', false],
          ['That the pipeline is fast enough', false],
          ['That rollback works', false]],
        'A gate nobody has tested is a gate nobody can rely on.'),
      mcq('Filling the disk deliberately is included because:',
        [['The failure you are likeliest to meet', true],
          ['It is easy to reproduce', false],
          ['It tests the monitoring setup', false],
          ['Providers charge for full disks', false]],
        'And its symptoms look like anything except a full disk.'),
      mcq('Restoring a backup should produce:',
        [['A measured recovery time you record', true],
          ['Confirmation the backup job ran', false],
          ['A checksum comparison', false],
          ['A list of changed rows', false]],
        'The time to find out is not during an outage.'),
      mcq('The standard this set aims at is whether you can:',
        [['Get back from what you wrote down', true],
          ['Deploy an application to a domain', false],
          ['Build a container image correctly', false],
          ['Configure monitoring and alerts', false]],
        'Deploying is the easy half.'),
    ],
    checkpoint: [
      mcq('Having somebody else follow your runbook without help tests:',
        [['Whether it works for its reader', true],
          ['Whether the procedure is efficient', false],
          ['How long the recovery takes', false],
          ['Whether the system is documented', false]],
        'It will be read by somebody tired who did not write it.'),
      mcq('Before creating anything in a cloud account, you should:',
        [['Set a billing alert', true],
          ['Choose the largest free-tier instance', false],
          ['Enable every region', false],
          ['Create a separate account per project', false]],
        'And destroy what you create afterwards.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_CLOUD_MINI_PROJECT',
    notes: `Take an application and make it something that runs unattended, recovers from failure, and
can be operated by somebody who did not build it.

**Why operability is the assessment.** Deploying an application once is an afternoon. An application
that restarts itself, tells you when it is unhealthy, can be rolled back in two minutes and restored
from backup in twenty is a different thing — and it is the thing an employer in this direction is
actually hiring for.

**What is being assessed:** that the infrastructure is reproducible from what you wrote down, that
the pipeline refuses to ship broken code, that you can demonstrate a recovery rather than describe
one, and that the runbooks work for somebody else.

**Build it in this order:**

1. **Deploy it manually once**, recording every step, so you know what the script must do.
2. **Turn that into a script** and rebuild from nothing to prove it.
3. **Containerise**, and deploy the image.
4. **The pipeline**: tests, gates, deployment on merge, rollback.
5. **Monitoring and alerts**, before you need them.
6. **Backups, restore, and the runbooks** — then have somebody else use them.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Project — An Application You Can Operate',
      description: 'Take an application to production with reproducible infrastructure, a pipeline that refuses broken code, monitoring, tested backups and runbooks somebody else can follow.',
      instructions: `**The brief**

Take an application with a database — one of your own from another track is ideal — and make it
operable in production.

Free tiers throughout. Destroy what you create when the assessment is done.

**Requirements**

1. **A deployed application** reachable on a domain over HTTPS, with a valid certificate and
   automatic renewal configured.
2. **Reproducible infrastructure**: a script or configuration that builds the environment from
   nothing, demonstrated by destroying and rebuilding it.
3. **Containerised**, with a \`.dockerignore\`, a non-root user, no secrets in the image, and a
   compose file for local development.
4. **Configuration and secrets** injected at runtime, validated at startup, never logged, with a
   committed \`.env.example\`.
5. **A pipeline**: tests and linting on every push, deployment on merge to main, and a demonstrated
   gate blocking a failing build.
6. **A rollback**, demonstrated and timed.
7. **Monitoring**: centralised logs with request ids, the four key metrics, health and readiness
   endpoints, and at least two actionable alerts with their thresholds justified.
8. **Backups**: automated, verified, and **restored at least once** with the recovery time measured.
9. **Five runbooks**, half a page each, covering restore, rollback, full disk, application will not
   start, and one failure specific to your system.
10. **An incident exercise**: break production deliberately, recover using only your runbooks, and
    write a blameless note.

**What to submit**

1. The repository, including infrastructure and pipeline configuration.
2. The **rebuild evidence**: destroyed and recreated from the script, with a transcript.
3. The **pipeline evidence**: a blocked build and a successful deployment.
4. The **recovery evidence**: a timed rollback and a timed restore, with the RPO and RTO you measured.
5. The **runbooks**, plus a note from somebody who followed one without your help.
6. The **incident note** from the deliberate failure.
7. A **short write-up** (400–500 words): the step you had improvised and not written down; what took
   longest to recover and why; what you would add before this carried real users.

**Constraints**

- No secrets in the repository, the image or any log.
- No manual step that is not written down.
- Everything created must be destroyed at the end, with a note confirming it.

**Where the marks are.** The recovery evidence and the runbooks. Anybody can deploy something; the
grade is decided by what happens when it breaks and whether somebody other than you can fix it.`,
      rubric: [
        {
          criterion: 'Deployment and reproducibility',
          description: 'Running on HTTPS with renewal configured; environment rebuilt from a script with evidence; containerised safely with no secrets in the image.',
          maxPoints: 25,
        },
        {
          criterion: 'Pipeline',
          description: 'Tests and linting on every push, deployment on merge, a demonstrated gate blocking a bad build, and a timed rollback.',
          maxPoints: 20,
        },
        {
          criterion: 'Observability',
          description: 'Centralised logs with request ids, four key metrics, health and readiness, and alerts that are actionable with justified thresholds.',
          maxPoints: 20,
        },
        {
          criterion: 'Recovery',
          description: 'Backups automated and verified; a real restore performed and timed; RPO and RTO stated from measurement rather than assumption.',
          maxPoints: 25,
        },
        {
          criterion: 'Runbooks and incident',
          description: 'Five usable runbooks, validated by somebody else following one; deliberate incident recovered from them with a blameless note.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },
];
