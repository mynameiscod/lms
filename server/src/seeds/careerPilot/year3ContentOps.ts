/**
 * T3_LINUX, T3_CONTAINERS and T3_DEPLOYMENT — eighteen units. Year 3. Finishes S09.
 *
 * ── THE MODULE NOBODY TEACHES AND EVERYBODY NEEDS ─────────────────────────────────────────
 *
 * A graduate can write a service and cannot find out why it will not start on a server. That
 * gap costs them days in their first month, and nothing in a normal curriculum addresses it
 * because it is not a language and it does not look like computer science.
 *
 * So these units are written around the questions somebody actually asks at 9am on a Tuesday:
 * what is running, what is listening on that port, where is the log, why does the container
 * exit immediately, and how do I get the previous version back.
 *
 * ROLLING_BACK is the unit that matters most and is taught least. Every deployment discussion
 * is about getting code out; the skill that saves an incident is getting it back off, and a
 * team that has never rehearsed a rollback does not have one.
 *
 * The containers topic refuses the "containers are lightweight VMs" framing. They are isolated
 * processes, and every behaviour that confuses students — why the container exits, why the
 * data vanished, why the file changed inside and not outside — follows directly from that.
 *
 * Attribution: T3_LINUX and T3_CONTAINERS are single-skill and derived. T3_DEPLOYMENT defaults
 * to DEPLOYMENT with A_PIPELINE_NOT_A_PERSON on CI_CD.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const OPS_BUNDLES: PilotBundle[] = [
  /* ══ T3_LINUX ═══════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_LINUX_PROCESSES_AND_SERVICES',
    notes: `Your code runs as a process on a machine you cannot see. These are the commands
that tell you what is happening, and they are the difference between diagnosing a deployment
and asking somebody else to.

## What is running

    ps aux | grep myapp        # is it running, as whom, since when
    top                        # live, sorted by CPU
    htop                       # the same, readable

**\`ps aux\` tells you four things worth knowing:** the process exists, which user it runs as,
how much memory it holds, and when it started. **That last one catches more problems than the
others combined** — a process that started four minutes ago when you deployed three hours ago
has been restarting, and nothing else on the page says so.

## What is listening

    ss -tlnp                   # TCP, listening, numeric, with the process
    lsof -i :8080              # what holds this port

**"Address already in use"** is the commonest startup failure there is, and it has exactly two
causes: an old instance did not die, or something else legitimately owns the port. One command
distinguishes them.

**Notice what it is bound to.** \`127.0.0.1:8080\` accepts only local connections;
\`0.0.0.0:8080\` accepts any. A service that "works on the server and not from outside" is
almost always bound to localhost — and this is one of the most common single causes of a
graduate's first deployment not working.

## Services

Most things run under **systemd**:

    systemctl status myapp     # running? since when? recent log lines
    systemctl restart myapp
    journalctl -u myapp -f     # follow its log
    journalctl -u myapp --since "10 minutes ago"

**\`systemctl status\` is the first command to run** on any "the service is down". It gives
you state, uptime, the exit code of the last failure and the last few log lines in one screen.

**Read the restart count.** A service restarting every thirty seconds is crash-looping, and
systemd will keep restarting it forever, which makes it look alive from the outside.

## Resources

    df -h                      # disk
    free -h                    # memory
    uptime                     # load

**A full disk is the most under-diagnosed outage there is.** Everything fails in a confusing
way — the database cannot write, logs stop, sessions vanish, uploads fail — and none of the
errors says "disk full". \`df -h\` takes two seconds and should be near the top of any
checklist.

**Check inodes too.** \`df -i\`. A disk with space and no inodes left, from millions of tiny
files, behaves as full and shows plenty free.

## Signals, and why a container stops badly

    kill <pid>       # SIGTERM — please stop, run your cleanup
    kill -9 <pid>    # SIGKILL — stop now, no cleanup

**SIGTERM first, always.** \`kill -9\` gives the process no chance to finish a request, flush
a buffer or close a connection.

**Handle SIGTERM in your application.** Stop accepting new work, finish what is in flight,
close connections, exit. Without that, every deploy drops the requests that were in progress —
and this is the mechanism behind "we get a handful of errors on every release".

## The order to work through

1. \`systemctl status\` — is it running, and has it been restarting?
2. \`journalctl -u <service> -n 100\` — what did it say?
3. \`ss -tlnp\` — is it listening, and on what address?
4. \`df -h\` and \`free -h\` — is the machine healthy?
5. \`curl localhost:PORT/health\` — does it answer locally?

**If it answers locally and not remotely, the problem is the binding, the firewall or the
proxy** — and you have narrowed it to three things in five commands.`,
    mcqs: [
      mcq('Which field in `ps aux` catches the most problems?',
        [['The start time', true], ['The memory held', false],
          ['The user it runs as', false], ['The CPU percentage', false]],
        'Started four minutes ago after a three-hour-old deploy means it has been restarting.'),
      mcq('A service that works on the server and not from outside is usually:',
        [['Bound to 127.0.0.1 rather than 0.0.0.0', true],
          ['Blocked by the application firewall', false],
          ['Missing its reverse proxy configuration', false],
          ['Listening on the wrong port number', false]],
        'One of the most common causes of a first deployment not working.'),
      mcq('A full disk is under-diagnosed because:',
        [['Everything fails confusingly and nothing says "disk full"', true],
          ['Monitoring rarely covers disk usage', false],
          ['The failure appears gradually over hours', false],
          ['Logs are the first thing to be affected', false]],
        'Two seconds with df -h, and it belongs near the top of any checklist.'),
      mcq('Not handling SIGTERM in your application causes:',
        [['In-flight requests to be dropped on every deploy', true],
          ['The process to ignore restart commands', false],
          ['The service to be killed immediately', false],
          ['Systemd to report the wrong exit code', false]],
        'Which is the mechanism behind "a handful of errors on every release".'),
    ],
    checkpoint: [
      mcq('"Address already in use" has how many usual causes?',
        [['Two — an old instance, or something else owns it', true],
          ['One — the previous process did not exit', false],
          ['Three — the process, the proxy, or the firewall', false],
          ['Several, depending on the operating system', false]],
        'And one command with lsof distinguishes them.'),
      mcq('A service restarting every thirty seconds:',
        [['Is crash-looping, and looks alive from outside', true],
          ['Will be stopped automatically by systemd', false],
          ['Indicates a memory limit being hit', false],
          ['Suggests the health check is misconfigured', false]],
        'Systemd keeps restarting it forever, so read the restart count.'),
      mcq('`df -i` is worth checking because:',
        [['A disk can run out of inodes with space remaining', true],
          ['It reports disk usage more accurately', false],
          ['It shows which processes hold open files', false],
          ['It includes mounted network filesystems', false]],
        'Millions of tiny files, and the disk behaves as full while showing plenty free.'),
    ],
  },

  {
    unitCode: 'T3_LINUX_SSH_AND_PERMISSIONS',
    notes: `SSH is how you reach a machine, and permissions are why half of what you try does
not work. Both are worth twenty minutes, once.

## SSH with keys

    ssh-keygen -t ed25519 -C "you@example.com"
    ssh-copy-id user@server
    ssh user@server

**Keys, never passwords.** A password can be brute-forced and a key cannot, and any server
exposed to the internet sees password attempts within minutes of booting.

**The private key never leaves your machine.** Not in a repository, not in Slack, not on a
shared drive. If it does, it is compromised and must be replaced everywhere.

**\`~/.ssh/config\` is the quality-of-life change nobody makes:**

    Host prod
        HostName 10.0.1.5
        User deploy
        IdentityFile ~/.ssh/prod_ed25519

Now \`ssh prod\` works, and so does \`scp file prod:/tmp/\`.

## Permission denied, in order

Work through these; it is nearly always one of them.

**The key is not being offered.** \`ssh -v\` shows which keys are tried. Usually the wrong
file, or one not added to the agent.

**Permissions on the key are too open.** SSH refuses a private key readable by others, and the
error is not obvious. \`chmod 600 ~/.ssh/id_ed25519\`.

**Permissions on \`~/.ssh\` or \`authorized_keys\` on the server.** The directory must be
\`700\` and the file \`600\`. **This is the one that catches people**, because everything looks
correct and the server silently refuses.

**Wrong user.** \`deploy@\` and \`ubuntu@\` are different accounts with different keys.

## Unix permissions in two minutes

    -rw-r--r--  1 deploy www-data  1024 Mar  1 10:00 config.yml
     │└┬┘└┬┘└┬┘    └──┬─┘ └───┬──┘
     │ │  │  │        │       └── group
     │ │  │  │        └────────── owner
     │ │  │  └── others: read
     │ │  └───── group:  read
     │ └──────── owner:  read, write
     └────────── a regular file (d for a directory)

Numerically: read 4, write 2, execute 1. So **755** is owner all, group and others read and
execute. **644** is owner read-write, everyone else read.

**On a directory, execute means "may enter"** rather than "may run". A directory with read and
no execute lets you list the names and open nothing, which produces a confusing permission
error on a file whose own permissions are fine.

## What to set

- **Code:** \`644\`, owned by the deploy user.
- **Directories:** \`755\`.
- **Scripts:** \`755\`.
- **Secrets:** \`600\`, owned by the user that reads them. **Never \`777\`** — it is not a fix,
  it is giving up, and it is the single clearest sign in a code review that somebody was
  guessing.

## Running as the right user

**Not root.** A service running as root and compromised gives the attacker the machine. Create
a user for the service, give it exactly what it needs, and no shell if it does not need one.

**Sudo for people, not for services.** If a service needs a privileged operation, that is worth
designing around rather than granting.

## What belongs on a server at all

**Nothing you cannot recreate.** A machine configured by hand over two years, that nobody can
rebuild, is the worst asset in any infrastructure — and the next topic is largely an answer to
that problem.`,
    mcqs: [
      mcq('SSH keys are preferred over passwords because:',
        [['A key cannot be brute-forced', true],
          ['Keys are easier to rotate across a fleet', false],
          ['Passwords are transmitted in the clear', false],
          ['Keys can be scoped to individual commands', false]],
        'Any internet-facing server sees password attempts within minutes of booting.'),
      mcq('The permission problem that catches people most often is:',
        [['The mode on ~/.ssh or authorized_keys on the server', true],
          ['The private key being readable by others locally', false],
          ['Connecting as the wrong user', false],
          ['The key not being loaded into the agent', false]],
        'Everything looks correct and the server silently refuses.'),
      mcq('Execute permission on a directory means:',
        [['You may enter it', true],
          ['You may run files inside it', false],
          ['You may list its contents', false],
          ['You may create files in it', false]],
        'Read without execute lists the names and opens nothing, which is a confusing error.'),
      mcq('Setting a file to 777 is:',
        [['Giving up, and a clear sign of guesswork in review', true],
          ['Acceptable on a server nobody else can reach', false],
          ['A reasonable temporary fix during debugging', false],
          ['Required for some shared directories', false]],
        'It is not a fix; it removes the question rather than answering it.'),
    ],
    checkpoint: [
      mcq('A service should not run as root because:',
        [['Compromising it then gives away the machine', true],
          ['Root processes cannot be restarted cleanly', false],
          ['Systemd refuses to manage root services', false],
          ['It makes log ownership inconsistent', false]],
        'Create a user, give it exactly what it needs, and no shell if it does not need one.'),
      mcq('`644` means:',
        [['Owner read and write, everyone else read', true],
          ['Owner all, group and others read', false],
          ['Owner read and write, nobody else anything', false],
          ['Everyone read and write, owner execute', false]],
        'Read 4, write 2, execute 1 — worth being able to read without looking up.'),
      mcq('A hand-configured server nobody can rebuild is:',
        [['The worst asset in any infrastructure', true],
          ['Acceptable if it is documented thoroughly', false],
          ['A normal outcome for long-lived systems', false],
          ['Only a problem when it needs upgrading', false]],
        'Which is largely what the containers topic exists to answer.'),
    ],
  },

  {
    unitCode: 'T3_LINUX_LOGS_ON_A_SERVER',
    notes: `Something is wrong on a server. The log will tell you, and finding it is a skill in
itself.

## Where logs live

**Under systemd** — \`journalctl -u <service>\`. Most modern services.

**In \`/var/log/\`** — the traditional place. \`/var/log/nginx/\`, \`/var/log/syslog\`,
\`/var/log/postgresql/\`.

**In a container** — \`docker logs <container>\`. Stdout and stderr, and nothing else, which
is the next topic's subject.

**Shipped elsewhere** — to a log aggregator, in which case the machine may have nothing, and
looking is the wrong move.

**Nowhere.** A service writing to stdout with nothing capturing it loses everything. Worth
checking before a long search.

## The commands

    journalctl -u myapp -n 100          # last 100 lines
    journalctl -u myapp -f              # follow
    journalctl -u myapp --since "1 hour ago"
    journalctl -u myapp -p err          # errors and worse

    tail -f /var/log/nginx/error.log
    tail -n 200 /var/log/syslog
    less +G /var/log/syslog             # open at the end, then search

**\`less\` and then \`/pattern\`** is better than \`grep\` when you do not yet know what you
are looking for, because you can read around a hit. \`grep\` gives you the line and hides the
context, and the context is usually where the answer is.

## Finding the thing

    grep -i error app.log                      # case-insensitive
    grep -C 5 'timeout' app.log                # five lines either side
    grep 'req_01HX3' app.log                   # one request, if you log ids
    grep -c 'error' app.log                    # how many
    awk '{print $1}' access.log | sort | uniq -c | sort -rn | head
                                               # top callers by address

**That last one is worth memorising.** It answers "who is hammering us" in one line, and the
shape — extract, sort, count, sort by count — solves a surprising number of log questions.

## Reading, rather than searching

**Start at the first error, not the last.** The last is usually a consequence. Scroll up to
where things first went wrong, which is often something that does not look like an error at
all.

**Read what happened just before.** The cause is rarely the line that failed.

**Check the timestamps.** Is this happening now, or is it from yesterday? A log open on your
screen is not necessarily live, and people have debugged historical failures for an hour.

**Check the time zone.** Servers usually run UTC and you probably do not. An hour of confusion
is the standard cost of forgetting this.

## Rotation, and the thing it hides

    ls -la /var/log/nginx/
    error.log  error.log.1  error.log.2.gz

**The event you are looking for may be in the rotated file**, which \`tail\` and \`grep\` on
the live file will not show. Use \`zgrep\` for the compressed ones.

**And check the rotation is working at all.** A log that is never rotated fills the disk, and
that is the full-disk outage from the processes unit, arriving by the most preventable route
there is.

## The five-minute triage

1. \`systemctl status\` — state, uptime, last exit, recent lines.
2. \`journalctl -u <service> -p err --since "1 hour ago"\` — errors only, recent only.
3. Find the **first** error and read fifty lines around it.
4. \`df -h\` — because it is two seconds and it is sometimes the whole answer.
5. If nothing: is the log actually being written? \`ls -la\` the file and check the timestamp.

**Point five is the one people skip**, and "there is nothing in the log" is very often "nothing
is writing to that log".`,
    mcqs: [
      mcq('`less` with a search beats `grep` when:',
        [['You do not yet know what you are looking for', true],
          ['The file is too large for grep to handle', false],
          ['The pattern appears many times', false],
          ['The log is being written to live', false]],
        'grep hides the context, and the context is usually where the answer is.'),
      mcq('You should start reading at:',
        [['The first error, not the last', true],
          ['The last error, which is most recent', false],
          ['The point the service restarted', false],
          ['The highest severity line present', false]],
        'The last is usually a consequence of something further up.'),
      mcq('`awk \'{print $1}\' access.log | sort | uniq -c | sort -rn | head` answers:',
        [['Who is making the most requests', true],
          ['Which endpoints are slowest', false],
          ['How many errors occurred per hour', false],
          ['Which responses were served from cache', false]],
        'Extract, sort, count, sort by count — a shape worth memorising.'),
      mcq('"There is nothing in the log" very often means:',
        [['Nothing is writing to that log', true],
          ['The log level is set too high', false],
          ['The event happened before rotation', false],
          ['The service failed before logging started', false]],
        'Which is why checking the file timestamp is step five.'),
    ],
    checkpoint: [
      mcq('The event you want may be missing from `tail` because:',
        [['It is in a rotated file', true],
          ['The log buffer has not flushed', false],
          ['tail shows only the last ten lines', false],
          ['The file was truncated on restart', false]],
        'Use zgrep for the compressed ones.'),
      mcq('A log that is never rotated:',
        [['Fills the disk, which is the outage from the processes unit', true],
          ['Becomes too slow to search effectively', false],
          ['Is overwritten once it reaches a configured size limit', false],
          ['Loses its earliest entries automatically', false]],
        'Arriving by the most preventable route there is.'),
      mcq('Server time zones matter because:',
        [['Servers usually run UTC and you probably do not', true],
          ['Rotation happens at local midnight', false],
          ['Timestamps are stored without a zone', false],
          ['Different services use different formats', false]],
        'An hour of confusion is the standard cost of forgetting.'),
    ],
  },

  {
    unitCode: 'T3_LINUX_DEBUGGING',
    notes: `Five server problems and the command that identifies each. This is the checklist
that turns "the server is broken" into a diagnosis.

## 1. It will not start

    systemctl status myapp
    journalctl -u myapp -n 50

**Usual causes, in order:** the port is in use; a config file is missing or malformed; a
permission on a file or directory; a missing environment variable; a dependency — the database
— is unreachable.

**The exit code is in \`systemctl status\`, and it narrows things immediately.** Exit 1 is
usually the application deciding to stop; 127 is a command not found; 137 is SIGKILL, which
usually means the out-of-memory killer.

## 2. It starts and then dies

**Symptom:** \`active (running)\` for a few seconds, then restarting. The restart count climbs.

**Cause:** it crashes after startup — a failing connection, an unhandled exception in the first
request, a health check it cannot pass.

**The trap:** systemd restarts it forever, so from the outside it looks alive. **Read the
restart count**, which is the only thing on the status page that shows this.

## 3. It runs and does not respond

    curl localhost:8080/health       # works?
    ss -tlnp | grep 8080             # listening, and on what address?
    sudo ufw status                  # firewall
    curl -v http://server:8080/      # from outside

**If localhost works and remote does not**, it is the binding (127.0.0.1), the firewall, or the
proxy. In that order — the binding is the most common by a distance.

## 4. It was fine and is now slow

    top            # CPU
    free -h        # memory, and swap in particular
    df -h          # disk
    iostat -x 1    # disk wait

**Swap is the tell people miss.** A machine swapping is thrashing, and everything is slow for
no visible reason. \`free -h\` shows it in one line.

**High load with low CPU means waiting** — for disk, or for the network, or for a lock. It is
the same bimodal signature the database unit described, at the machine level.

## 5. Disk full

    df -h
    du -sh /var/log/*  | sort -h | tail
    du -sh /* 2>/dev/null | sort -h | tail

**Everything breaks in a confusing way** and none of the errors mentions disk. The usual
culprits: unrotated logs, old container images, temporary files nothing cleans up, database
write-ahead logs.

**And check \`df -i\`.** Space available and no inodes behaves identically and shows nothing
wrong in \`df -h\`.

## The checklist, in order

1. \`systemctl status\` — running? restarting? exit code?
2. \`journalctl -u <service> -n 100\` — what did it say first?
3. \`df -h\` and \`free -h\` — is the machine well?
4. \`ss -tlnp\` — listening, and on what address?
5. \`curl localhost\` — does it answer itself?
6. Only then: the application, the network, the proxy.

**Steps 1 to 5 take two minutes and cover most of it.** The instinct is to start at 6, reading
application code, which is the same mistake as reaching for indexes before reading the plan.`,
    mcqs: [
      mcq('Exit code 137 usually means:',
        [['SIGKILL, typically the out-of-memory killer', true],
          ['A command was not found', false],
          ['The application chose to exit', false],
          ['A configuration file was invalid', false]],
        'And it narrows the cause immediately, which is why the exit code is worth reading.'),
      mcq('A service crash-looping looks alive from outside because:',
        [['Systemd keeps restarting it', true],
          ['The health check caches its last result', false],
          ['The port stays bound between restarts', false],
          ['The process id does not change', false]],
        'The restart count is the only thing on the status page that shows it.'),
      mcq('Localhost responds and remote does not. Check, in order:',
        [['The binding, then the firewall, then the proxy', true],
          ['The firewall, then the proxy, then the binding', false],
          ['The proxy, then the binding, then DNS', false],
          ['DNS, then the firewall, then the binding', false]],
        'The binding is the most common by a distance.'),
      mcq('High load with low CPU means:',
        [['Waiting — for disk, network or a lock', true],
          ['A miscounted load average', false],
          ['Too many idle processes', false],
          ['Memory pressure from the page cache', false]],
        'The same bimodal signature as the database unit, at the machine level.'),
    ],
    checkpoint: [
      mcq('A machine that is swapping:',
        [['Is thrashing, and everything is slow for no visible reason', true],
          ['Has run out of available disk space rather than memory', false],
          ['Will be killed by the kernel shortly', false],
          ['Shows high CPU in top', false]],
        '`free -h` shows it in one line, and people miss it.'),
      mcq('The instinct to start by reading application code is:',
        [['The same mistake as indexing before reading the plan', true],
          ['Correct when the logs show nothing', false],
          ['Faster for application-level failures', false],
          ['Reasonable once the service is confirmed running', false]],
        'Steps one to five take two minutes and cover most of it.'),
      mcq('Disk full is confusing to diagnose because:',
        [['Every failure it causes says something else', true],
          ['It happens only under heavy write load', false],
          ['Monitoring usually covers it already', false],
          ['The failures appear on other machines first', false]],
        'The database cannot write, uploads fail, logs stop — and nothing says "disk full".'),
    ],
  },

  {
    unitCode: 'T3_LINUX_PRACTICE',
    notes: `Two exercises on reading what a server tells you. Neither needs a server — both
work on the text a server produces, which is the part that transfers.`,
    coding: [
      {
        title: 'Triage from the status output',
        description: `Read four lines describing a service's state:

    <active|failed|activating>
    <restart count as an integer>
    <last exit code as an integer>
    <listening address, or none>

Print one diagnosis:

- Restart count above 3 → \`crash_looping\`
- Otherwise, state \`failed\` and exit code 137 → \`out_of_memory\`
- Otherwise, state \`failed\` → \`start_failure\`
- Otherwise, state \`activating\` → \`starting\`
- Otherwise, listening address \`none\` → \`not_listening\`
- Otherwise, address beginning \`127.0.0.1\` → \`local_only\`
- Otherwise → \`healthy\`

The order is part of the specification: a crash-looping service that happens to be listening
right now is still crash-looping.`,
        starter: `import sys

lines = [l.strip() for l in sys.stdin.read().split(chr(10))]
state, restarts, exit_code, address = lines[0], int(lines[1]), int(lines[2]), lines[3]

# The checks are ordered. A service can match more than one.
`,
        language: 'python',
        tests: [
          { input: 'active\n0\n0\n0.0.0.0:8080\n', expectedOutput: 'healthy' },
          { input: 'active\n7\n0\n0.0.0.0:8080\n', expectedOutput: 'crash_looping' },
          { input: 'failed\n1\n137\nnone\n', expectedOutput: 'out_of_memory' },
          { input: 'active\n0\n0\n127.0.0.1:8080\n', expectedOutput: 'local_only' },
          { input: 'failed\n0\n1\nnone\n', expectedOutput: 'start_failure', isHidden: true },
          { input: 'activating\n0\n0\nnone\n', expectedOutput: 'starting', isHidden: true },
          { input: 'active\n0\n0\nnone\n', expectedOutput: 'not_listening', isHidden: true },
          { input: 'failed\n9\n137\nnone\n', expectedOutput: 'crash_looping', isHidden: true },
        ],
      },
      {
        title: 'Top callers from an access log',
        description: `Read access log lines in the form \`<address> <method> <path> <status>\`.

Print the top three addresses by request count, one per line as \`<address> <count>\`, highest
first. Break ties by address, ascending. Print fewer than three if there are fewer.

Then a final line: \`errors=<n>\`, the count of lines whose status is 500 or above.

This is the \`awk | sort | uniq -c | sort -rn | head\` pipeline, written out — and the point is
that the shape solves a large fraction of log questions.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Extract, count, sort by count descending, break ties ascending by address.
`,
        language: 'python',
        tests: [
          { input: '1.1.1.1 GET / 200\n1.1.1.1 GET /a 200\n2.2.2.2 GET / 500\n', expectedOutput: '1.1.1.1 2\n2.2.2.2 1\nerrors=1' },
          { input: '', expectedOutput: 'errors=0' },
          { input: '9.9.9.9 GET / 503\n', expectedOutput: '9.9.9.9 1\nerrors=1' },
          { input: 'b GET / 200\na GET / 200\n', expectedOutput: 'a 1\nb 1\nerrors=0', isHidden: true },
          { input: 'a GET / 499\na GET / 500\n', expectedOutput: 'a 2\nerrors=1', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Linux Practice',
      description: 'Triage from status output, summarise an access log, and run the checklist on a real machine.',
      instructions: `Complete both exercises, then:

1. For the first: explain why the crash-looping check comes before the others. Give the
   concrete case where a different order gives a misleading answer.
2. For the first: \`local_only\` is a diagnosis rather than a fault. Say what would have to be
   true for it to be correct, and what would have to be true for it to be the bug.
3. For the second: write out the shell pipeline that does the same thing, and say which part of
   it corresponds to which part of your code.

**Then, on a real machine** — a virtual machine, a container, a cloud instance or WSL.

4. Run a service under systemd, or a long-running process of your own. Show
   \`systemctl status\` or \`ps aux\` for it.
5. Find what is listening on every port. Report the output and say which of them you expected.
6. Break it deliberately: stop the service and change the port to one already in use. Start it
   and capture the exact error and exit code.
7. Work the five-step checklist and show each command's output. **Say at which step you would
   have found it** if you had not known what you broke.
8. Find the log. Say where it was and how you found it.
9. Fill a filesystem, or simulate it, and observe what fails. Report what the errors said — and
   whether any of them mentioned the disk.`,
      rubric: [
        { criterion: 'Ordered triage', description: 'All eight cases, with the precedence respected.', maxPoints: 20 },
        { criterion: 'Log summary', description: 'Counts, tie-breaking and error count all correct, including empty input.', maxPoints: 20 },
        { criterion: 'The equivalent pipeline', description: 'Written out, and mapped part by part to the code.', maxPoints: 15 },
        { criterion: 'A real service, inspected', description: 'Status and listening ports shown, with expectations stated.', maxPoints: 15 },
        { criterion: 'Broken and diagnosed', description: 'Exact error and exit code captured, checklist worked, step identified.', maxPoints: 20 },
        { criterion: 'The disk experiment', description: 'What failed, and whether anything named the real cause.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

lines = [l.strip() for l in sys.stdin.read().split(chr(10))]
state, restarts, exit_code, address = lines[0], int(lines[1]), int(lines[2]), lines[3]
`,
        tests: [
          { input: 'active\n0\n0\n0.0.0.0:8080\n', expectedOutput: 'healthy' },
          { input: 'active\n7\n0\n0.0.0.0:8080\n', expectedOutput: 'crash_looping' },
          { input: 'failed\n1\n137\nnone\n', expectedOutput: 'out_of_memory' },
          { input: 'failed\n0\n1\nnone\n', expectedOutput: 'start_failure', isHidden: true },
          { input: 'active\n0\n0\nnone\n', expectedOutput: 'not_listening', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 20,
      },
    },
    checkpoint: [
      mcq('The crash-looping check must come first because:',
        [['A service restarting can be momentarily healthy-looking', true],
          ['Restart counts are the most reliable signal available', false],
          ['Other checks would raise an error on it', false],
          ['It is the most severe of the diagnoses', false]],
        'It is listening right now and it will be dead in twenty seconds.'),
      mcq('`local_only` is described as a diagnosis rather than a fault because:',
        [['Binding to localhost is correct behind some proxies', true],
          ['It always indicates a configuration error somewhere', false],
          ['The address may change on restart', false],
          ['It only matters for public services', false]],
        'The assignment asks when it is right and when it is the bug.'),
      mcq('The pipeline shape extract, sort, count, sort:',
        [['Answers a large fraction of log questions', true],
          ['Is the fastest way to process large logs', false],
          ['Is specific to access log formats', false],
          ['Requires the log to be sorted already', false]],
        'Which is why it is worth writing out once by hand.'),
    ],
  },

  {
    unitCode: 'T3_LINUX_MINI_PROJECT',
    notes: `Take a service you wrote and run it properly on a machine — as a managed service,
as a non-root user, with logs you can find and a rollback you have actually performed.

The brief's real subject is **the second deploy**. Anyone can get something running once. The
skills that matter are the ones you need at 2am: finding the log, reading the failure, and
getting the previous version back.

Budget around two hours. Use a virtual machine, a cloud instance, a container or WSL — anything
you can break without consequence.`,
    assignment: {
      title: 'Mini Project — Run It Like It Matters',
      description: 'Deploy a service you wrote as a managed, non-root systemd unit, break it deliberately, and roll it back.',
      instructions: `**Deploy** an application of yours to a machine you can break.

**Part one — run it properly**

1. A dedicated user for the service. Not root, and no login shell if it does not need one.
2. A systemd unit file. Show it, and explain three of its directives in your own words.
3. It must start on boot and restart on failure. **Demonstrate both** — reboot the machine, and
   kill the process.
4. Configuration through environment variables or a config file, not baked into the code.
   **Secrets not in the repository**, with mode \`600\`.
5. Handle SIGTERM: finish in-flight work, then exit. **Prove it** — send a request that takes
   two seconds, send SIGTERM during it, and show the request completing.

**Part two — make it observable**

6. Logs reachable with \`journalctl\`. Show a real entry.
7. A health endpoint that checks a real dependency, not just that the process is up.
8. Log rotation, or confirm journald's limits are configured. Say what stops the disk filling.

**Part three — break it deliberately, five ways**

For each: cause it, capture the exact error, diagnose it with the checklist, and say **which
step of the checklist found it**.

9. Port already in use.
10. A missing environment variable.
11. A permission denied on a file it needs.
12. A dependency unavailable — stop the database.
13. Disk full, or close enough to observe the effect.

**Part four — the part that matters**

14. Deploy version 2. Show it running.
15. **Roll back to version 1.** Time it. Write the exact commands.
16. Now roll back **without** the notes you just wrote — from memory, having waited at least an
    hour. Say what you got wrong.
17. Write a runbook: what to do when this service is down, in numbered steps, written so that
    somebody who did not build it could follow it at 2am.

**Submit** the unit file, the SIGTERM demonstration, the five failures with their diagnoses and
checklist steps, the rollback timing, and the runbook.`,
      rubric: [
        { criterion: 'Run properly', description: 'Dedicated user, systemd unit, boot and restart both demonstrated.', maxPoints: 20 },
        { criterion: 'SIGTERM handled, proven', description: 'An in-flight request completing during shutdown, shown.', maxPoints: 15 },
        { criterion: 'Observable', description: 'Logs found, a real health check, and something that stops the disk filling.', maxPoints: 15 },
        { criterion: 'Five failures diagnosed', description: 'Each caused, each error captured, each traced to a checklist step.', maxPoints: 25 },
        { criterion: 'A rollback, timed', description: 'Performed, timed, and the commands written down.', maxPoints: 15 },
        { criterion: 'A runbook somebody else could follow', description: 'Numbered, unambiguous, written for 2am.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('The brief’s real subject is:',
        [['The second deploy, and what you need at 2am', true],
          ['Configuring systemd correctly', false],
          ['Running services without root', false],
          ['Making the application observable to its operators', false]],
        'Anyone can get something running once.'),
      mcq('Rolling back from memory an hour later tests:',
        [['Whether the procedure is actually usable under pressure', true],
          ['How well the commands were documented', false],
          ['Whether the rollback is reversible', false],
          ['How long the whole process actually takes in practice', false]],
        'What you got wrong is the finding.'),
      mcq('A health check should verify:',
        [['A real dependency, not just that the process is up', true],
          ['That the last deploy completed successfully', false],
          ['The version currently running', false],
          ['That the port is bound correctly', false]],
        'A service whose database is down is not healthy.'),
    ],
  },

  /* ══ T3_CONTAINERS ══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_CONTAINERS_WHY_CONTAINERS',
    notes: `"It works on my machine" is a real problem with a real cost, and containers are the
answer that won.

## The problem

Your machine has Python 3.11, a particular OpenSSL, a library installed two years ago you have
forgotten about, and an environment variable in your shell profile. The server has none of
that, and reproducing it by hand produces a machine nobody can rebuild — which is where the
Linux topic ended.

## What a container actually is

**An isolated process on the host kernel, with its own view of the filesystem, the network and
the process tree.**

Not a virtual machine. **There is no guest operating system, and no second kernel.** A
container is a normal Linux process that has been lied to about what it can see.

That single sentence explains everything students find confusing:

- **Why is it so fast to start?** It is a process. Starting it is starting a process.
- **Why is the image so much smaller than a VM?** No kernel, no operating system — just the
  files your program needs.
- **Why does the container stop when my program finishes?** Because the container *is* the
  process. When the process ends, there is nothing left to be running.
- **Why can I not run a Windows container on Linux?** There is no second kernel; it uses the
  host's.

## Image against container

**An image** is a filesystem plus metadata. Read-only, built once, versioned. A class.

**A container** is a running instance of one, with a writeable layer on top. An object.

**The writeable layer disappears when the container is removed.** This is the source of the
"where did my data go" question, and it is not a bug — it is what makes containers disposable,
which is the property everything else depends on.

**So anything that must survive goes in a volume**, which is storage mounted from outside and
has a life of its own.

## What you get

**The same thing everywhere.** The image that passed your tests is the image in production.
Not "the same version of the code" — **the same filesystem, byte for byte.**

**Disposable infrastructure.** A container is cattle, not a pet. Something wrong? Kill it and
start another. That is only possible because it holds no state.

**Isolation.** Two applications needing different versions of the same library coexist.

**A build that is a file.** The Dockerfile is the machine configuration, in version control,
reviewed like code. **That is the answer to the hand-configured server**, and it is the largest
single benefit.

## What you do not get

**Not security isolation, by default.** A container shares the host kernel. A kernel
vulnerability escapes it, and a container running as root is closer to root on the host than
people assume.

**Not simplicity.** You have added a build step, a registry, an orchestration question and a
new layer to debug through. For a single small application on a single server, that may not be
worth it — and saying so is a legitimate engineering position.

**Not performance.** Roughly native, not better.

## When not to bother

A static site. A script run once a day by cron. A single application on a single server that
nobody else deploys. **Containers solve reproducibility and isolation**, and if you do not have
those problems, you have bought a build pipeline for nothing.`,
    mcqs: [
      mcq('A container is:',
        [['An isolated process on the host kernel', true],
          ['A lightweight virtual machine', false],
          ['A packaged operating system image', false],
          ['A sandboxed runtime environment', false]],
        'A normal Linux process that has been lied to about what it can see.'),
      mcq('The container stops when your program finishes because:',
        [['The container is the process', true],
          ['The runtime cleans up idle containers', false],
          ['The image is read-only once started', false],
          ['The init system has nothing left to supervise', false]],
        'When the process ends, there is nothing left to be running.'),
      mcq('Data written inside a container disappears because:',
        [['The writeable layer goes when the container does', true],
          ['The image filesystem is read-only', false],
          ['Containers do not have write permission', false],
          ['The data is held in memory only', false]],
        'Which is what makes them disposable, and why volumes exist.'),
      mcq('The largest single benefit of a Dockerfile is:',
        [['The machine configuration is a reviewed file in version control', true],
          ['Images build faster than provisioning a server', false],
          ['It documents the application’s dependencies', false],
          ['It allows the same image to run anywhere', false]],
        'It is the answer to the hand-configured server nobody can rebuild.'),
    ],
    checkpoint: [
      mcq('Containers do not provide, by default:',
        [['Security isolation from the host kernel', true],
          ['Filesystem isolation between containers', false],
          ['Independent process trees', false],
          ['Separate network namespaces', false]],
        'A kernel vulnerability escapes, and running as root inside is closer to root outside than people assume.'),
      mcq('Containers are not worth it for:',
        [['A single application on a single server nobody else deploys', true],
          ['An application with several conflicting dependencies', false],
          ['A service deployed by more than one person', false],
          ['Anything that must run identically in CI', false]],
        'You have bought a build pipeline for problems you do not have.'),
      mcq('An image is to a container as:',
        [['A class is to an object', true],
          ['A process is to a thread', false],
          ['A repository is to a commit', false],
          ['A schema is to a query', false]],
        'Read-only and versioned, against a running instance with a writeable layer.'),
    ],
  },

  {
    unitCode: 'T3_CONTAINERS_BUILDING_AN_IMAGE',
    notes: `A Dockerfile is a build, and the things that make it good are not obvious.

## The naive one, and what is wrong with it

    FROM python:3.11
    COPY . /app
    WORKDIR /app
    RUN pip install -r requirements.txt
    CMD python app.py

It works. Four problems:

**It reinstalls every dependency on every code change.** \`COPY . /app\` invalidates the cache,
so the \`pip install\` below it reruns even when only a comment changed. **This is the single
biggest waste in most Dockerfiles.**

**It is large.** \`python:3.11\` is about 1GB, most of it a full Debian you do not need.

**It runs as root.**

**Nothing is pinned.** \`python:3.11\` today is not \`python:3.11\` next month.

## The better one

    FROM python:3.11-slim AS build
    WORKDIR /app
    COPY requirements.txt .                   # dependencies first
    RUN pip install --no-cache-dir --user -r requirements.txt

    FROM python:3.11-slim
    RUN useradd -m -u 1000 app
    WORKDIR /app
    COPY --from=build /root/.local /home/app/.local
    COPY --chown=app:app . .
    USER app
    ENV PATH=/home/app/.local/bin:$PATH
    EXPOSE 8000
    CMD ["python", "app.py"]

## Layer caching, which is the thing to understand

**Each instruction is a layer, and a layer is cached until something above it changes.**

So **order from least to most frequently changing**: base image, system packages,
dependencies, then application code. Copying \`requirements.txt\` alone before the rest of the
source is the whole trick, and it turns a three-minute build into ten seconds for the ninety
percent of commits that change only code.

## Multi-stage builds

Build in one stage, copy only the result into a clean second one. The compiler, the build
tools and the intermediate files never reach the final image.

**Typical effect: 1GB to 150MB.** Smaller means faster to push, faster to pull, faster to
start, and a smaller attack surface — fewer packages, fewer vulnerabilities.

## What not to put in an image

**Secrets.** Not as an \`ENV\`, not copied in and deleted later. **Deleting a file in a later
layer does not remove it from the image** — the earlier layer still contains it, and anyone
with the image can extract it. Secrets come in at runtime.

**Anything unnecessary.** Tests, documentation, \`.git\`, build caches. Use a \`.dockerignore\`;
without one, \`COPY . .\` copies your \`.git\` directory, which often contains more history than
the application.

**Data.** That is a volume.

## The rest, briefly

**Pin your base image.** \`python:3.11-slim\` moves. A digest, or at least a patch version.

**\`CMD\` in exec form** — \`CMD ["python", "app.py"]\`, not \`CMD python app.py\`. The shell form
wraps your process in a shell, and **the shell does not forward SIGTERM**, so your graceful
shutdown never runs and every stop is effectively a kill.

**\`USER\` before \`CMD\`.** Running as root inside a container is a real risk, not a theoretical
one.

**One process per container.** If you need two, you need two containers. An image with an init
system supervising three services is a small virtual machine, and you have lost the property
that made containers useful.`,
    mcqs: [
      mcq('Copying requirements.txt before the rest of the source:',
        [['Keeps the dependency layer cached when only code changes', true],
          ['Makes the final image smaller', false],
          ['Ensures dependencies install before the code runs', false],
          ['Avoids copying files that are not needed', false]],
        'It turns a three-minute build into ten seconds for most commits.'),
      mcq('Deleting a secret in a later layer:',
        [['Leaves it in the earlier layer, extractable from the image', true],
          ['Removes it from the final image correctly', false],
          ['Works only if the layers are squashed', false],
          ['Is safe as long as the file is overwritten first', false]],
        'Secrets come in at runtime, never at build time.'),
      mcq('`CMD python app.py` rather than the exec form causes:',
        [['A shell wrapper that does not forward SIGTERM', true],
          ['The command to run before the entrypoint', false],
          ['Environment variables to be ignored', false],
          ['The container to exit immediately', false]],
        'Your graceful shutdown never runs, and every stop is effectively a kill.'),
      mcq('A multi-stage build typically:',
        [['Leaves the build tools out of the final image', true],
          ['Runs the build steps in parallel', false],
          ['Caches the dependency layer more effectively', false],
          ['Allows two processes to run per container', false]],
        'Often 1GB down to 150MB, which is fewer packages and fewer vulnerabilities.'),
    ],
    checkpoint: [
      mcq('Dockerfile instructions should be ordered:',
        [['Least to most frequently changing', true],
          ['Most to least frequently changing', false],
          ['By how long each step takes', false],
          ['In the order the application needs them', false]],
        'A layer is cached until something above it changes.'),
      mcq('Without a `.dockerignore`, `COPY . .` typically includes:',
        [['The .git directory', true],
          ['Only the tracked source files', false],
          ['Files listed in .gitignore', false],
          ['Nothing outside the build context root', false]],
        'Which often contains more history than the application.'),
      mcq('Running an init system supervising three services in one container:',
        [['Makes it a small virtual machine and loses the point', true],
          ['Is the standard pattern for related services', false],
          ['Improves startup time for the group', false],
          ['Is required when services share a volume', false]],
        'If you need two processes, you need two containers.'),
    ],
  },

  {
    unitCode: 'T3_CONTAINERS_RUNNING_AND_DEBUGGING',
    notes: `The image builds. Now it does not start, or it starts and cannot reach anything.
These are the failures, and each one follows from what a container actually is.

## The commands

    docker run -d --name api -p 8080:8000 myapp:1.2
    docker ps              # running
    docker ps -a           # including the dead ones — check this one
    docker logs api
    docker logs -f api
    docker exec -it api sh # a shell inside it
    docker inspect api     # everything, in JSON

**\`docker ps -a\` is the one people forget.** A container that exited immediately does not
appear in \`docker ps\`, so "it did not start" often means "it started, failed and left" — and
the evidence is one flag away.

## It exits immediately

**The commonest problem, and it follows directly from "the container is the process".**

- **The process finished.** A script that runs and returns. There is nothing wrong; the
  container did exactly what it was told.
- **The process failed.** \`docker logs\` has the reason.
- **It went to the background.** A server daemonising itself means the foreground process
  exits, and the container ends with it. **Run servers in the foreground inside containers.**
- **The command was wrong.** Exit 127 is "not found" — a typo, or a binary not in the image.

**\`docker ps -a\` gives you the exit code**, and the exit code narrows it immediately.

## Networking

**\`-p 8080:8000\`** is host 8080 to container 8000. **The order catches everybody.**

**Inside the container, \`localhost\` is the container.** Your application connecting to
\`localhost:5432\` for a database in another container finds nothing, because localhost is
itself.

- **Another container** → use its name on a shared network. \`postgres:5432\`.
- **The host machine** → \`host.docker.internal\` on Mac and Windows; on Linux, the host's
  address on the bridge, or \`--network host\`.

**Bind to \`0.0.0.0\` inside the container**, never \`127.0.0.1\`. A server bound to localhost
inside a container is reachable only from inside it, and the port mapping appears to do
nothing. **This is the same binding mistake as the Linux topic, with an extra layer to hide
behind.**

## Data

**Everything written inside is gone when the container is removed.** Use a volume:

    docker run -v pgdata:/var/lib/postgresql/data postgres

**A named volume** is managed and persists. **A bind mount** maps a host directory in, which is
what you want for development so code changes appear without a rebuild.

## Environment

    docker run -e DATABASE_URL=... --env-file .env myapp

**Not in the image.** Configuration and secrets at runtime, which is what makes one image
usable in three environments.

## Debugging a container that will not behave

1. **\`docker ps -a\`** — did it exit, and with what code?
2. **\`docker logs\`** — what did it say? Note that it only captures stdout and stderr, so an
   application logging to a file inside the container logs into the void.
3. **\`docker exec -it <name> sh\`** — get inside and look. If it is not running, run the image
   with a shell as the command instead: \`docker run -it --entrypoint sh myapp\`.
4. **From inside, check the basics.** Is the file there? Is the environment variable set? Can
   it reach the database by name?
5. **\`docker inspect\`** — the actual mounts, ports, environment and network, as opposed to
   what you think you passed.

**Step 3 is the one that resolves most of it.** Getting inside a broken container and looking
turns a guessing game into an ordinary investigation — and it is the same principle as the
debugging topic: look at the state, not the outcome.`,
    mcqs: [
      mcq('A container that "did not start" often:',
        [['Started, failed and exited — visible with docker ps -a', true],
          ['Failed during the image build', false],
          ['Is waiting for a dependency to become available', false],
          ['Was never created because of a name conflict', false]],
        'The evidence is one flag away, and the exit code narrows it immediately.'),
      mcq('A server that daemonises itself inside a container:',
        [['Ends the container, because the foreground process exits', true],
          ['Runs correctly but produces no logs', false],
          ['Is restarted automatically by the runtime', false],
          ['Keeps running but loses its port mapping', false]],
        'Run servers in the foreground inside containers.'),
      mcq('Inside a container, `localhost` refers to:',
        [['The container itself', true],
          ['The host machine', false],
          ['The default bridge gateway', false],
          ['Whichever container published that port', false]],
        'Which is why connecting to localhost:5432 for a database elsewhere finds nothing.'),
      mcq('An application logging to a file inside a container:',
        [['Logs into the void, since docker logs captures stdout and stderr', true],
          ['Writes to the host filesystem by default', false],
          ['Has its file rotated by the runtime', false],
          ['Appears in docker logs after a flush', false]],
        'Which is why containerised applications log to stdout.'),
    ],
    checkpoint: [
      mcq('`-p 8080:8000` maps:',
        [['Host 8080 to container 8000', true],
          ['Container 8080 to host 8000', false],
          ['Both ports on the host', false],
          ['Container 8080 to the bridge on 8000', false]],
        'The order catches everybody at least once.'),
      mcq('Binding to 127.0.0.1 inside a container:',
        [['Makes the port mapping appear to do nothing', true],
          ['Is required for the mapping to work', false],
          ['Restricts access to the host machine only', false],
          ['Has the same effect as 0.0.0.0', false]],
        'The same binding mistake as the Linux topic, with an extra layer to hide behind.'),
      mcq('The debugging step that resolves most container problems is:',
        [['Getting a shell inside and looking', true],
          ['Reading the build output again', false],
          ['Inspecting the image layers', false],
          ['Rebuilding without the cache', false]],
        'Look at the state, not the outcome — the same principle as the debugging topic.'),
    ],
  },

  {
    unitCode: 'T3_CONTAINERS_DEBUGGING',
    notes: `Five container problems, each of which follows from something the first unit said.

## 1. It works locally, not in CI or production

**Cause, in order of likelihood:** a different architecture (an image built on an Apple Silicon
machine will not run on an x86 server unless built for it); an environment variable set locally
and not there; a bind mount supplying files locally that are not in the image; a base image tag
that has moved since you last pulled.

**The diagnostic:** \`docker run\` the *exact* image tag locally, with no compose file, no bind
mounts and no local environment. **If it fails, it is the image. If it works, it is the
environment** — and that is the whole question answered in one command.

## 2. The build is slow every time

**Cause:** \`COPY . .\` above the dependency install, so nothing below it ever caches.
**Fix:** dependencies first. **Tell:** the build log shows \`Using cache\` for the first few
steps and nothing afterwards.

## 3. The image is enormous

**Cause:** a full base image, build tools in the final stage, \`.git\` and node_modules copied
in, or an apt cache left behind. **Diagnostic:** \`docker history <image>\` shows the size of
each layer, and the offending one is usually obvious.

## 4. The data vanished

**Cause:** written to the container's writeable layer rather than a volume. **This is not a
bug**, it is the property that makes containers disposable. **Fix:** a volume, and the question
to ask of every container is "what in here must survive?"

## 5. Permission denied on a mounted volume

**Symptom:** works on Mac, fails on Linux. **Cause:** the container's user id does not match
the host directory's owner. Docker Desktop hides this; Linux does not. **Fix:** match the uid,
or set ownership on the mount, or use a named volume rather than a bind mount.

## Two things worth knowing

**A container is not a machine.** \`docker exec\` into it and install a package and it is gone
on the next restart. **Fix the Dockerfile, rebuild.** Every change made inside a running
container is temporary by design, and an engineer who has "fixed" production by exec-ing into a
container has fixed nothing.

**\`docker system prune\`** reclaims the disk that dangling images and stopped containers eat.
On a build machine this is a genuine and regular cause of the full-disk outage from the Linux
topic.

## The order

1. \`docker ps -a\` — running, exited, or never created? What exit code?
2. \`docker logs\` — what did it say?
3. \`docker run --entrypoint sh\` — get inside the image and look.
4. \`docker inspect\` — what was *actually* passed, as opposed to what you meant.
5. Compare with a working environment: same tag, same architecture, same variables.`,
    mcqs: [
      mcq('The diagnostic for "works locally, not in production" is:',
        [['Run the exact tag locally with no compose, mounts or local variables', true],
          ['Compare the two Dockerfiles line by line', false],
          ['Rebuild the image without the cache', false],
          ['Check the logs on both environments', false]],
        'Fails: it is the image. Works: it is the environment. One command.'),
      mcq('A build log showing "Using cache" for the first steps and nothing after means:',
        [['Something above the expensive step changed', true],
          ['The cache was cleared before the build', false],
          ['The base image was updated', false],
          ['The build ran on a different machine', false]],
        'Usually COPY . . sitting above the dependency install.'),
      mcq('Changes made with `docker exec` into a running container:',
        [['Are gone on the next restart, by design', true],
          ['Persist in the image for later runs', false],
          ['Are written to the mounted volumes', false],
          ['Require a commit to take effect', false]],
        'An engineer who has "fixed" production this way has fixed nothing.'),
      mcq('Volume permission errors that appear on Linux and not Mac are caused by:',
        [['The container user id not matching the host directory owner', true],
          ['Different filesystem types between the platforms', false],
          ['Docker Desktop mounting volumes read-only', false],
          ['SELinux being enabled on Linux hosts', false]],
        'Docker Desktop hides the mismatch; Linux does not.'),
    ],
    checkpoint: [
      mcq('An image built on Apple Silicon running on an x86 server:',
        [['Fails unless it was built for that architecture', true],
          ['Runs with a performance penalty', false],
          ['Runs correctly, since containers are portable', false],
          ['Fails only if it contains compiled code', false]],
        'The first thing to check in the "works locally" list.'),
      mcq('`docker history` is useful for:',
        [['Finding which layer made the image large', true],
          ['Listing the containers started from an image', false],
          ['Showing the build cache hit rate', false],
          ['Recovering a deleted intermediate layer', false]],
        'The offending layer is usually obvious once you can see the sizes.'),
      mcq('`docker system prune` on a build machine addresses:',
        [['The full-disk outage from the Linux topic', true],
          ['Slow builds caused by a cold cache', false],
          ['Containers that fail to stop cleanly', false],
          ['Images built for the wrong architecture', false]],
        'Dangling images and stopped containers eat disk steadily.'),
    ],
  },

  {
    unitCode: 'T3_CONTAINERS_PRACTICE',
    notes: `Two exercises on the reasoning rather than the tooling: layer caching, and the
networking mistake that costs everybody an afternoon once.`,
    coding: [
      {
        title: 'Which layers rebuild',
        description: `Given an ordered list of Dockerfile instructions and the set of files
that changed, print how many layers must be rebuilt.

First line: an integer n. Then n lines, each an instruction in one of these forms:

- \`FROM <image>\` — depends on nothing
- \`RUN <anything>\` — depends on nothing itself
- \`COPY <file>\` — depends on that file

Then a final line: the changed files, space separated, or empty if none.

A layer rebuilds if **its own dependency changed, or any layer above it rebuilt.** Print the
count.`,
        starter: `import sys

lines = [l.rstrip(chr(10)) for l in sys.stdin]
n = int(lines[0])
steps = lines[1:1 + n]
changed = set(lines[1 + n].split()) if len(lines) > 1 + n else set()

# Once one layer rebuilds, everything below it does too.
`,
        language: 'python',
        tests: [
          { input: '3\nFROM python\nCOPY requirements.txt\nRUN pip install\nrequirements.txt\n', expectedOutput: '2' },
          { input: '3\nFROM python\nCOPY requirements.txt\nRUN pip install\napp.py\n', expectedOutput: '0' },
          { input: '4\nFROM python\nCOPY app.py\nRUN pip install\nCOPY extra.txt\napp.py\n', expectedOutput: '3' },
          { input: '2\nFROM python\nRUN echo hi\n\n', expectedOutput: '0' },
          { input: '3\nCOPY a\nCOPY b\nCOPY c\na c\n', expectedOutput: '3', isHidden: true },
          { input: '3\nCOPY a\nCOPY b\nCOPY c\nc\n', expectedOutput: '1', isHidden: true },
        ],
      },
      {
        title: 'Can it reach that?',
        description: `Given a target address written inside a container, say whether it
resolves to what the author intended.

Read lines of \`<context> <address>\`, where context is \`same_container\`,
\`other_container\`, or \`host\`, meaning where the thing being reached actually lives.

Print for each:

- Address starting \`localhost\` or \`127.0.0.1\`, context \`same_container\` → \`ok\`
- Address starting \`localhost\` or \`127.0.0.1\`, any other context → \`wrong_localhost\`
- Address \`host.docker.internal\`, context \`host\` → \`ok\`
- Address \`host.docker.internal\`, any other context → \`wrong_host_alias\`
- Anything else, context \`other_container\` → \`ok\`
- Anything else → \`unknown\`

The address may carry a port; ignore it.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Inside a container, localhost is the container. Strip any port before comparing.
`,
        language: 'python',
        tests: [
          { input: 'same_container localhost:8000\n', expectedOutput: 'ok' },
          { input: 'other_container localhost:5432\n', expectedOutput: 'wrong_localhost' },
          { input: 'other_container postgres:5432\n', expectedOutput: 'ok' },
          { input: 'host host.docker.internal:3000\n', expectedOutput: 'ok' },
          { input: 'other_container host.docker.internal\n', expectedOutput: 'wrong_host_alias', isHidden: true },
          { input: 'host 127.0.0.1:9000\n', expectedOutput: 'wrong_localhost', isHidden: true },
          { input: 'host db:5432\n', expectedOutput: 'unknown', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Containers Practice',
      description: 'Reason about layer caching and container networking, then build and shrink a real image.',
      instructions: `Complete both exercises, then:

1. For the first: given a four-step Dockerfile that copies all source before installing
   dependencies, say how many layers rebuild when one comment changes. Then reorder it and give
   the new number.
2. For the first: say why "once one rebuilds, everything below does" follows from what a layer
   is.
3. For the second: explain why \`localhost\` inside a container refers to the container, using
   the definition from the first unit rather than repeating the rule.

**Then, build something real.**

4. Write a Dockerfile for an application of yours. Build it. Report the size.
5. Improve it: a slim base, a multi-stage build, dependencies before source, a non-root user,
   a \`.dockerignore\`. Report the new size and the percentage reduction.
6. Time a rebuild after changing one line of code, before and after your improvements. Report
   both.
7. Run it with a database in a second container. Show the connection working, and say exactly
   what address your application uses and why.
8. Deliberately bind your server to \`127.0.0.1\` inside the container. Show that the published
   port does not work, and explain what is happening.
9. Write data inside the container, remove it, start it again. Show that the data is gone.
   Then add a volume and show it surviving.`,
      rubric: [
        { criterion: 'Layer caching reasoned', description: 'All cases correct, including multiple changes and none.', maxPoints: 20 },
        { criterion: 'Networking classified', description: 'All contexts correct, including the port-stripping cases.', maxPoints: 20 },
        { criterion: 'A real image, measured', description: 'Built, sized, improved, and the reduction reported.', maxPoints: 20 },
        { criterion: 'Rebuild time, before and after', description: 'Both timings, from a one-line code change.', maxPoints: 15 },
        { criterion: 'The localhost experiment', description: 'Binding broken deliberately, with what is happening explained.', maxPoints: 15 },
        { criterion: 'Data lost, then kept', description: 'Both demonstrated, with the volume doing the work.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

lines = [l.rstrip(chr(10)) for l in sys.stdin]
n = int(lines[0])
steps = lines[1:1 + n]
changed = set(lines[1 + n].split()) if len(lines) > 1 + n else set()
`,
        tests: [
          { input: '3\nFROM python\nCOPY requirements.txt\nRUN pip install\nrequirements.txt\n', expectedOutput: '2' },
          { input: '3\nFROM python\nCOPY requirements.txt\nRUN pip install\napp.py\n', expectedOutput: '0' },
          { input: '2\nFROM python\nRUN echo hi\n\n', expectedOutput: '0' },
          { input: '3\nCOPY a\nCOPY b\nCOPY c\nc\n', expectedOutput: '1', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 20,
      },
    },
    checkpoint: [
      mcq('"Once one layer rebuilds, everything below does" because:',
        [['Each layer is built on the filesystem the one above produced', true],
          ['The cache is invalidated for the whole build', false],
          ['Layers are stored as a single archive', false],
          ['The build would otherwise run its instructions in parallel', false]],
        'A layer is a filesystem delta on top of the previous one.'),
      mcq('Copying source before installing dependencies means a comment change rebuilds:',
        [['Every layer from the copy downwards', true],
          ['Only the layer containing the source', false],
          ['Nothing, since the comment does not affect the build', false],
          ['Only the final layer', false]],
        'Which is the single biggest waste in most Dockerfiles.'),
      mcq('Publishing a port has no effect when the server binds to 127.0.0.1 because:',
        [['The server accepts connections only from inside the container', true],
          ['The port mapping requires the host address to be used instead', false],
          ['Docker cannot route to a loopback address', false],
          ['The port is already in use by the loopback', false]],
        'The mapping delivers traffic to the container, and nothing there is listening for it.'),
    ],
  },

  {
    unitCode: 'T3_CONTAINERS_MINI_PROJECT',
    notes: `Containerise a real application with a real database, and prove the image is what
it claims to be.

The brief's test is **the second machine**. An image that works where it was built proves very
little; an image that a classmate can pull and run with one command is the property containers
exist to provide, and it is the only way to know you have it.

Budget around two hours, and arrange the second machine in advance.`,
    assignment: {
      title: 'Mini Project — An Image Somebody Else Can Run',
      description: 'Containerise an application and its database, shrink it, and prove it runs somewhere you did not build it.',
      instructions: `**Containerise** an application of yours that talks to a database.

**Part one — make it work**

1. A Dockerfile for the application. It must run as a non-root user.
2. Compose, or equivalent, running the application and a database together.
3. The database's data must survive a restart. **Show it** — write a row, restart, read it back.
4. Configuration entirely through environment variables. **The image must be identical across
   environments**; only the variables differ. Show the same image running twice with different
   settings.
5. No secrets in the image or the Dockerfile. Say how they get in.

**Part two — make it good**

6. Multi-stage build. Report the size before and after, and say what left.
7. Dependencies cached above source. Report the rebuild time after a one-line change, before
   and after the reordering.
8. A \`.dockerignore\`. Say what it excludes and how much that saved.
9. A pinned base image. Say what you pinned to and what could still change underneath you.
10. A health check that verifies the database connection, not just the process.

**Part three — prove it**

11. **Push the image to a registry.** Have somebody else — a classmate, or a machine you have
    never built on — pull it and run it. **One command, from your documentation.**
12. Record what they had to ask you. **Every question is a defect in your documentation or your
    image.** Fix them.
13. Run it on a different architecture if you can, or explain what would break if you did.

**Part four — break it**

For each: cause it, capture the error, diagnose it, and say which command told you.

14. Bind the server to \`127.0.0.1\` inside the container.
15. Point the application at \`localhost\` for the database.
16. Remove the volume and restart.
17. Make the container exit immediately — a command that returns.

**Submit** the Dockerfile and compose file, the size and timing table, your reviewer's
questions with the fixes, and the four failures with their diagnoses.`,
      rubric: [
        { criterion: 'It runs, with data surviving', description: 'Application and database together, persistence demonstrated.', maxPoints: 15 },
        { criterion: 'One image, many environments', description: 'Identical image run twice with different configuration, secrets outside it.', maxPoints: 15 },
        { criterion: 'Sizes and times measured', description: 'Before and after for both, with what left the image named.', maxPoints: 20 },
        { criterion: 'Somebody else ran it', description: 'Pulled and run elsewhere from documentation, in one command.', maxPoints: 20 },
        { criterion: 'Their questions, fixed', description: 'Recorded and addressed, rather than answered in person.', maxPoints: 10 },
        { criterion: 'Four failures diagnosed', description: 'Each caused, captured and traced to the command that revealed it.', maxPoints: 20 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('The test of the project is:',
        [['Somebody else pulling and running it in one command', true],
          ['The image being under a target size', false],
          ['The build completing in CI', false],
          ['The application passing its tests inside the container', false]],
        'An image that works where it was built proves very little.'),
      mcq('The same image running in three environments requires:',
        [['All configuration to arrive as environment variables', true],
          ['A separate build per environment', false],
          ['A configuration file baked into the image per stage', false],
          ['Environment-specific tags on the image', false]],
        'Only the variables differ; the filesystem is byte for byte the same.'),
      mcq('A question your reviewer has to ask is:',
        [['A defect in the documentation or the image', true],
          ['Expected, for an unfamiliar application', false],
          ['A sign the image needs more configuration', false],
          ['Useful feedback but not a failure', false]],
        'The same standard as the API and README units.'),
    ],
  },

  /* ══ T3_DEPLOYMENT ══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_DEPLOYMENT_A_PIPELINE_NOT_A_PERSON',
    notes: `A deployment that depends on somebody remembering seven steps will go wrong. Not
might — **will**, on the day they are ill, or in a hurry, or it is their first week.

A pipeline is the same steps, written down as code, run the same way every time.

## What it does, in order

**1. On every push:** check out, install dependencies, **run the tests**, run the linter,
build. **This is continuous integration**, and it is valuable entirely on its own — it catches
"works on my machine" before a human is involved.

**2. On merge to the main branch:** build the artefact once, tag it, push it to a registry,
deploy to staging, run smoke tests.

**3. To production:** deploy, verify, and be able to roll back.

## The rule that matters most

**Build once, deploy everywhere.**

The artefact tested in staging is **byte for byte** the artefact that reaches production.
Rebuilding per environment means production runs something no one tested — a dependency
resolved to a new patch version, a different build machine, a base image that moved.

**So: one build, tagged, promoted through environments.** Configuration differs; the artefact
does not. This is the same argument the containers topic made about one image and many
environments, and it is the single most important idea in this unit.

## Fast, or ignored

**A pipeline slower than about ten minutes stops being used properly.** People push and stop
watching, batch changes to avoid waiting, and merge before it finishes. The feedback loop is
the product, and a slow pipeline has a broken one.

**Make it fast:** cache dependencies between runs; run independent jobs in parallel; run the
fast checks first so a lint failure does not wait for the integration suite; only run what the
change affects, if your build system can tell.

## What belongs in it

**Tests.** The whole point.

**Linting and formatting.** Machine-checkable, so never a review comment.

**A security scan** of dependencies. Cheap, and it catches known vulnerabilities.

**A build that fails on a warning you care about.**

**A migration step**, if you have a database — and note that a schema change and a code change
deploying together is the thing that makes rollback hard, which the rollback unit returns to.

## What does not

**Secrets in the configuration file.** The pipeline definition is in the repository. Use the
platform's secret store, and note that **a secret in a pipeline log is a leaked secret** —
scrub output, and be careful what you echo.

**Manual approval on everything.** A gate everybody clicks without reading is worse than no
gate: it creates the appearance of control and the habit of ignoring it.

**Flaky tests.** A pipeline that fails randomly gets rerun reflexively, and then a real failure
is rerun too. **This is exactly the argument the flaky-tests unit made**, and the pipeline is
where the cost is paid.

## The test of a good pipeline

**Could somebody who joined this week deploy safely?**

If the answer needs "well, they'd have to know about the thing with the cache", the pipeline is
not finished — that knowledge is a step somebody is remembering, and it belongs in the file.`,
    mcqs: [
      mcq('"Build once, deploy everywhere" matters because:',
        [['Otherwise production runs something nobody tested', true],
          ['Rebuilding per environment is slower', false],
          ['Artefacts are expensive to store', false],
          ['Tags become inconsistent across environments', false]],
        'A dependency resolves differently, a base image moves, a build machine differs.'),
      mcq('A pipeline slower than about ten minutes:',
        [['Stops being used properly', true],
          ['Costs too much in build minutes', false],
          ['Indicates the test suite is too large', false],
          ['Should be split across two repositories', false]],
        'People stop watching, batch changes, and merge before it finishes.'),
      mcq('A manual approval gate everybody clicks without reading:',
        [['Is worse than no gate at all', true],
          ['Provides a useful audit trail regardless', false],
          ['Slows deployment without other harm', false],
          ['Should be replaced with two approvers', false]],
        'The appearance of control, and the habit of ignoring it.'),
      mcq('A secret appearing in a pipeline log is:',
        [['A leaked secret', true],
          ['Acceptable if the log is private', false],
          ['Only a problem if the log is retained', false],
          ['Masked automatically by most platforms', false]],
        'Scrub the output, and be careful what you echo.'),
    ],
    checkpoint: [
      mcq('Running the fast checks first means:',
        [['A lint failure does not wait for the integration suite', true],
          ['The pipeline then uses fewer parallel runners', false],
          ['Failures are reported in severity order', false],
          ['Expensive jobs can be cached more easily', false]],
        'The feedback loop is the product.'),
      mcq('The test of a good pipeline is:',
        [['Somebody who joined this week could deploy safely', true],
          ['It completes in under ten minutes', false],
          ['It has never allowed a bad deploy', false],
          ['Every step in it is automated end to end', false]],
        '"They would have to know about the cache thing" means it is not finished.'),
      mcq('A flaky test in a pipeline is costly because:',
        [['Reflexive reruns mean real failures get rerun too', true],
          ['It consumes paid build minutes unnecessarily', false],
          ['It delays the deployment by one cycle', false],
          ['It masks other failures in the same job', false]],
        'The flaky-tests argument, and the pipeline is where the cost is paid.'),
    ],
  },

  {
    unitCode: 'T3_DEPLOYMENT_ENVIRONMENTS',
    notes: `Three environments, one build. The number is a convention; the "one build" is not.

## What each is for

**Development.** Your machine. Fast feedback, fake data, everything local.

**Staging.** As close to production as you can afford: same infrastructure shape, same
deployment process, same configuration mechanism. **Its job is to be the place a deployment
fails.**

**Production.** Real users and real data.

## Same artefact, different configuration

The build produced in CI is promoted through all three. **Nothing is rebuilt**, for the reasons
the pipeline unit gave.

**What differs is configuration, and only configuration:** database URLs, API keys, feature
flags, log levels, scale.

**All of it from the environment**, never from a file in the repository selected by a
\`if env == 'production'\` branch. That branch means your code behaves differently in
production from anywhere you tested it, which is precisely the property you are trying to
eliminate.

## Why staging usually fails to help

Most staging environments are useless, and for predictable reasons:

**The data is nothing like production.** Fifty rows against fifty million. Every performance
problem is invisible, and so is every data-shape problem — the migrated records, the nulls, the
customer with 400,000 orders.

**The scale is nothing like production.** One instance against twenty. Concurrency problems do
not appear.

**The integrations are fake.** Payment in test mode behaves differently from payment in live
mode, and the differences are where the bugs are.

**It has drifted.** Configured by hand over a year, it is now a machine unlike either your
laptop or production. **A staging environment that differs from production in unknown ways is
worse than none**, because it produces confidence rather than information.

**What to do:** make it as similar as you can afford, be explicit in writing about the
differences that remain, and **treat a staging pass as evidence rather than proof.**

## Configuration, done sensibly

**Environment variables.** Standard, supported everywhere, and nothing accidentally committed.

**A secret manager for secrets.** Not environment variables where you can avoid it — they leak
into logs, crash dumps and child processes.

**Fail at startup on anything missing.** A service that starts with no \`DATABASE_URL\` and
fails on the first request is far worse than one that refuses to start: the failure is later,
further from the cause, and it has already taken traffic.

    DATABASE_URL = require_env('DATABASE_URL')   # raises now, not at 3am

**Never a default that is production-shaped.** A fallback that silently points at the
production database is a real accident that has happened to real teams.

## Feature flags

A way to deploy code without releasing behaviour. Deploy dark, turn on for yourself, then a
percentage, then everybody — and turn it off in seconds without a deploy, which is the whole
value.

**The cost is real:** every flag doubles the paths through your code, two flags make four, and
untested combinations accumulate. **Remove flags once the decision is made.** A codebase with
forty permanent flags has 2⁴⁰ possible configurations and is tested in one of them.`,
    mcqs: [
      mcq('What should differ between environments?',
        [['Configuration, and nothing else', true],
          ['Configuration and the build for each target', false],
          ['Configuration and the feature set enabled', false],
          ['Configuration and the logging implementation', false]],
        'The artefact is promoted; only the variables change.'),
      mcq('An `if env == \'production\'` branch in the code:',
        [['Means production behaves differently from anywhere tested', true],
          ['Is acceptable for logging configuration', false],
          ['Keeps environment-specific logic in one place', false],
          ['Is safer than an environment variable', false]],
        'Precisely the property you are trying to eliminate.'),
      mcq('A staging environment differing from production in unknown ways is:',
        [['Worse than none, because it produces confidence', true],
          ['Still useful for catching obvious failures', false],
          ['Acceptable if the differences are documented', false],
          ['Normal, and not worth investing in', false]],
        'Confidence rather than information.'),
      mcq('A service missing `DATABASE_URL` should:',
        [['Refuse to start', true],
          ['Start and fail on the first database call', false],
          ['Start with a local default', false],
          ['Start and log a warning', false]],
        'Failing later is further from the cause, and it has already taken traffic.'),
    ],
    checkpoint: [
      mcq('The main reason staging misses performance problems is:',
        [['The data volume is nothing like production', true],
          ['The hardware is smaller', false],
          ['The test suite that runs there is less thorough', false],
          ['Caching behaves differently', false]],
        'Fifty rows against fifty million, and the data shape differs too.'),
      mcq('The value of a feature flag is:',
        [['Turning behaviour off in seconds without a deploy', true],
          ['Deploying to a subset of servers', false],
          ['Testing two implementations against each other', false],
          ['Avoiding a rollback when something breaks', false]],
        'Deploy dark, ramp up, and reverse instantly.'),
      mcq('Forty permanent feature flags means:',
        [['An enormous number of configurations, tested in one', true],
          ['Forty code paths to maintain', false],
          ['A configuration file that becomes hard to read', false],
          ['Slower startup while flags are evaluated', false]],
        'Remove flags once the decision is made.'),
    ],
  },

  {
    unitCode: 'T3_DEPLOYMENT_ROLLING_BACK',
    notes: `Every deployment conversation is about getting code out. **The skill that saves an
incident is getting it back off**, and it is taught least.

## The first question

> **How do I undo this, and how long does it take?**

Ask it before deploying, every time. If the answer is "I'm not sure", you are not ready to
deploy — not because the change is risky, but because you have no plan for the case where it
is.

## Rollback must be fast and boring

**Under five minutes**, and it should be the same mechanism every time. An incident is not the
moment to improvise, and a rollback nobody has performed is a hypothesis.

**Rehearse it.** Roll back deliberately, on a normal Tuesday afternoon, and time it. **A team
that has never rolled back does not have a rollback** — they have a document.

## How, in order of preference

**Redeploy the previous artefact.** You have it; it is tagged; it was tested. One command, and
it is why "build once" matters: the previous artefact still exists and still works.

**Blue-green.** Two environments, traffic switched between them. Rollback is switching back —
seconds, and the old version is still warm.

**Canary.** Route a small percentage to the new version. Watch the errors. Roll back by routing
0% — you have exposed a fraction of users rather than all of them.

**Revert the commit and redeploy.** Slowest, because it rebuilds. Fine when nothing is on fire.

## What makes rollback hard

**Database migrations.** Almost always the answer.

A migration that drops a column cannot be rolled back — the data is gone. Once the new code has
written to a new schema, the old code cannot read it.

**The rule: make migrations backwards compatible, and deploy them separately.**

1. **Deploy the migration alone.** Additive only: add the column, nullable, with a default. The
   old code ignores it and keeps working.
2. **Deploy the code** that writes to both old and new.
3. **Backfill.**
4. **Deploy the code** that reads from the new.
5. **Much later, once you are certain, drop the old column.**

**Five deploys instead of one, and every step is individually reversible.** That is
expand-and-contract, the same pattern as the API versioning unit, and it is the price of being
able to go back.

**Other things that block a rollback:** a message format change that the old consumers cannot
read; a cache populated in a new shape; a third party you have already told about a change; and
**anything irreversible that has already happened** — emails sent, payments taken. Rolling back
the code does not unsend an email.

## After a rollback

**Roll back first, diagnose second.** The instinct is to find the cause while users are
affected. Stop the bleeding, then investigate with the pressure off — and you will investigate
better.

**Keep the evidence.** Logs, metrics, the failing version's artefact. Rolling back often
destroys the thing you need to understand what happened.

**Then write it up.** What broke, what the signal was, how long until anybody noticed, and
**what would have caught it before deploy.** That last question is the one that produces the
improvement.`,
    mcqs: [
      mcq('The question to ask before every deployment is:',
        [['How do I undo this, and how long does it take', true],
          ['What could go wrong with this change', false],
          ['Has this been tested in staging', false],
          ['Who is available if something breaks', false]],
        '"I’m not sure" means you are not ready, whatever the change is.'),
      mcq('A team that has never performed a rollback:',
        [['Has a document, not a rollback', true],
          ['Has had no incidents requiring one', false],
          ['Should rehearse only in staging', false],
          ['Can rely on the documented procedure', false]],
        'A rollback nobody has performed is a hypothesis.'),
      mcq('What makes rollback hard is almost always:',
        [['Database migrations', true],
          ['Cached artefacts', false],
          ['Load balancer configuration', false],
          ['Dependency version drift', false]],
        'Once the new code has written to a new schema, the old code cannot read it.'),
      mcq('The first response to a bad deploy is:',
        [['Roll back, then diagnose', true],
          ['Diagnose, then decide whether to roll back', false],
          ['Disable the affected feature and investigate', false],
          ['Check whether staging showed the same problem', false]],
        'Stop the bleeding, and you will investigate better with the pressure off.'),
    ],
    checkpoint: [
      mcq('A backwards-compatible migration sequence takes:',
        [['Five deploys, each individually reversible', true],
          ['Two deploys, schema then code', false],
          ['One deploy, with the migration inside it', false],
          ['Three deploys, with a backfill in the middle', false]],
        'Expand and contract, and it is the price of being able to go back.'),
      mcq('Which cannot be undone by a rollback?',
        [['An email that has already been sent', true],
          ['A column added by the migration', false],
          ['A cache populated in the new shape', false],
          ['Traffic routed to the new version', false]],
        'Rolling back the code does not unsend it.'),
      mcq('Rolling back often destroys:',
        [['The evidence needed to understand the failure', true],
          ['The ability to redeploy the same version', false],
          ['The metrics from the affected period', false],
          ['The link between the deploy and the incident', false]],
        'Keep the logs, the metrics and the failing artefact.'),
    ],
  },

  {
    unitCode: 'T3_DEPLOYMENT_DEBUGGING',
    notes: `Five deployment failures. The first is the one that produces a bad hour.

## 1. It worked in staging

**Causes, in order:** configuration differing in a way nobody wrote down; data — staging has
fifty rows and production fifty million; **scale** — one instance against twenty, so a
concurrency bug appears; an integration in test mode behaving differently; and a resource limit
that only exists in production.

**Diagnosis:** \`diff\` the two configurations, literally. Then compare the data volumes for
the tables involved. **Most of these are found by comparing rather than by reading code.**

## 2. Half the servers have the new version

**Symptom:** intermittent failures. Some requests work, some do not, and it looks like a flaky
bug.

**Cause:** a rolling deploy that partially failed, or that is still in progress.

**Why it is confusing:** the same request works when retried, so it reads as a race. **Check
the deploy status before debugging the application** — this is the "is it the code or the
environment" question, and thirty seconds settles it.

## 3. The migration ran and the code did not deploy

**Symptom:** errors about missing columns, or about columns that should not exist yet.

**Cause:** the deploy failed after the migration step. The schema has moved and the code has
not.

**Fix now:** roll the schema forward with the matching code, or roll both back if the migration
was reversible. **Fix properly:** migrations that are backwards compatible with the currently
running code, so this state is survivable rather than an outage.

## 4. It deployed and then died

**Symptom:** healthy for a minute, then crash-looping.

**Causes:** a missing environment variable only touched on some code path; a memory limit hit
under real traffic; a connection pool exhausted at real concurrency; a dependency it cannot
reach from that network.

**Check the exit code.** 137 is out of memory, and a container killed for memory on production
traffic is extremely common and looks nothing like a memory bug from inside the application.

## 5. Nobody noticed for two hours

**The worst one, and it is not a technical failure.**

**Cause:** no alerting on the signals that moved, or alerts going somewhere nobody watches.

**Fix:** alert on error rate and latency on the main path — the two from the reliability topic
— and **check the deploy actually worked** rather than assuming a green pipeline means a
healthy system. A pipeline reports that the deploy command succeeded, which is not the same
claim.

## The habit

**Watch the deploy.** Error rate and latency, for ten minutes afterwards. Most bad deploys
announce themselves within two, and being present turns a two-hour incident into a four-minute
one.

**Deploy small and often.** A deploy with one change has one suspect. A deploy with forty has
forty, and bisecting a production incident is much more expensive than bisecting a test
failure.

**Never deploy on a Friday afternoon** — not because Friday is special, but because **the
window between the deploy and somebody noticing is what matters**, and that window is longest
when everybody is about to leave.`,
    mcqs: [
      mcq('Intermittent failures right after a deploy usually mean:',
        [['Only some servers have the new version', true],
          ['A race condition under new load', false],
          ['A cache serving mixed responses', false],
          ['A partially applied migration', false]],
        'The same request works on retry, so it reads as a race. Check the deploy status first.'),
      mcq('The migration ran and the code did not. The proper fix is:',
        [['Migrations that are compatible with the running code', true],
          ['Running migrations after the code deploys', false],
          ['Wrapping the whole deploy in a transaction', false],
          ['Deploying migrations only during maintenance', false]],
        'So the intermediate state is survivable rather than an outage.'),
      mcq('Exit code 137 after a deploy under real traffic:',
        [['Is the out-of-memory killer, and looks nothing like a memory bug inside', true],
          ['Indicates the health check failed repeatedly', false],
          ['Means the previous container did not release the port', false],
          ['Suggests the image was built for the wrong architecture', false]],
        'Extremely common, and invisible from the application’s own perspective.'),
      mcq('A green pipeline means:',
        [['The deploy command succeeded, which is a different claim', true],
          ['The new version is healthy in production', false],
          ['The tests passed against the deployed artefact', false],
          ['The rollout completed on every instance', false]],
        'Check the system, not the pipeline.'),
    ],
    checkpoint: [
      mcq('Most bad deploys announce themselves within:',
        [['About two minutes', true], ['About an hour', false],
          ['The first full traffic cycle', false], ['One business day', false]],
        'Which is why watching for ten turns a two-hour incident into a four-minute one.'),
      mcq('Deploying small and often helps because:',
        [['A deploy with one change has one suspect', true],
          ['Smaller deploys are faster to roll back', false],
          ['Frequent deploys keep the pipeline warm', false],
          ['It spreads the risk over more releases', false]],
        'Bisecting a production incident is far more expensive than bisecting a test failure.'),
      mcq('The argument against a Friday afternoon deploy is:',
        [['The window before somebody notices is longest then', true],
          ['Weekend traffic patterns are unusual', false],
          ['Fewer engineers are available to fix it', false],
          ['Friday deploys are more likely to be rushed', false]],
        'It is about the window, not about the day.'),
    ],
  },

  {
    unitCode: 'T3_DEPLOYMENT_PRACTICE',
    notes: `Two exercises on the reasoning that makes deployment safe: which migration steps
are reversible, and what a rollout state implies.`,
    coding: [
      {
        title: 'Is this migration reversible?',
        description: `Read one migration step per line and print \`reversible\` or
\`irreversible\` for each.

- \`add_column <name> nullable\` → reversible
- \`add_column <name> not_null_no_default\` → irreversible (it fails on existing rows, and the
  fix is a data change)
- \`add_column <name> not_null_with_default\` → reversible
- \`drop_column <name>\` → irreversible
- \`rename_column <old> <new>\` → irreversible (old code cannot read the new name)
- \`add_index <name>\` → reversible
- \`drop_index <name>\` → reversible
- \`widen_type <name>\` → reversible
- \`narrow_type <name>\` → irreversible
- anything else → \`unknown\`

Then print a final line \`safe\` if every step was reversible, or \`unsafe\` otherwise. An
empty input prints only \`safe\`.`,
        starter: `import sys

steps = [l.split() for l in sys.stdin if l.split()]

# Reversible means the previous version of the code still works after it.
`,
        language: 'python',
        tests: [
          { input: 'add_column email nullable\nadd_index email_idx\n', expectedOutput: 'reversible\nreversible\nsafe' },
          { input: 'drop_column legacy\n', expectedOutput: 'irreversible\nunsafe' },
          { input: '', expectedOutput: 'safe' },
          { input: 'rename_column a b\nadd_index i\n', expectedOutput: 'irreversible\nreversible\nunsafe' },
          { input: 'add_column x not_null_no_default\n', expectedOutput: 'irreversible\nunsafe', isHidden: true },
          { input: 'add_column x not_null_with_default\nwiden_type x\n', expectedOutput: 'reversible\nreversible\nsafe', isHidden: true },
          { input: 'do_something_odd\n', expectedOutput: 'unknown\nunsafe', isHidden: true },
        ],
      },
      {
        title: 'What is the rollout doing?',
        description: `Read \`<total> <new_version> <failing>\` — the number of instances, how
many run the new version, and how many are failing health checks.

Print the state:

- \`failing\` equals \`total\` → \`total_outage\`
- \`new_version\` is 0 → \`not_started\`
- \`new_version\` equals \`total\` and \`failing\` is 0 → \`complete\`
- \`new_version\` equals \`total\` and \`failing\` above 0 → \`rolled_out_unhealthy\`
- \`failing\` above 0 → \`partial_unhealthy\`
- otherwise → \`in_progress\`

The order matters: a total outage is a total outage whatever the version split says.`,
        starter: `import sys

total, new_version, failing = [int(x) for x in sys.stdin.readline().split()]

# A mixed fleet explains intermittent failures. A total outage explains everything.
`,
        language: 'python',
        tests: [
          { input: '10 0 0\n', expectedOutput: 'not_started' },
          { input: '10 10 0\n', expectedOutput: 'complete' },
          { input: '10 5 0\n', expectedOutput: 'in_progress' },
          { input: '10 10 10\n', expectedOutput: 'total_outage' },
          { input: '10 10 2\n', expectedOutput: 'rolled_out_unhealthy', isHidden: true },
          { input: '10 5 2\n', expectedOutput: 'partial_unhealthy', isHidden: true },
          { input: '10 0 10\n', expectedOutput: 'total_outage', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Deployment Practice',
      description: 'Classify migrations and rollout states, then plan and rehearse a real reversible change.',
      instructions: `Complete both exercises, then:

1. For the first: \`add_column not_null_no_default\` is classified irreversible. Explain why,
   and say what the reversible version of the same intention is.
2. For the first: \`rename_column\` is irreversible even though the data is intact. Say why,
   in terms of the code that is currently running.
3. For the second: explain why \`total_outage\` must be checked before the version split.

**Then, plan a real change.**

4. Take a real application of yours with a database. Choose a genuinely breaking schema change
   — rename a column, split a field into two, change a type.
5. Write the **expand-and-contract plan**: every deploy, in order, with what each one does and
   why it is individually reversible.
6. **Execute it.** All the steps. Show the application working after each.
7. At one intermediate step, **roll back**. Show that it works, and that no data was lost.
8. Time the whole sequence and time the rollback separately.
9. Say what you would have had to do if you had made the change in one deploy and it had gone
   wrong after the migration. Be concrete.`,
      rubric: [
        { criterion: 'Migrations classified', description: 'All cases, including the two not-null variants and the unknown.', maxPoints: 20 },
        { criterion: 'Rollout states', description: 'All cases with the precedence respected.', maxPoints: 15 },
        { criterion: 'Why rename is irreversible', description: 'Explained in terms of the currently running code, not the data.', maxPoints: 15 },
        { criterion: 'A real expand-and-contract plan', description: 'Every deploy listed, each justified as individually reversible.', maxPoints: 20 },
        { criterion: 'Executed, with a rollback', description: 'All steps run, one rolled back, no data lost.', maxPoints: 20 },
        { criterion: 'The one-deploy counterfactual', description: 'Concrete about what recovery would have required.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

steps = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'add_column email nullable\nadd_index email_idx\n', expectedOutput: 'reversible\nreversible\nsafe' },
          { input: 'drop_column legacy\n', expectedOutput: 'irreversible\nunsafe' },
          { input: '', expectedOutput: 'safe' },
          { input: 'add_column x not_null_no_default\n', expectedOutput: 'irreversible\nunsafe', isHidden: true },
          { input: 'do_something_odd\n', expectedOutput: 'unknown\nunsafe', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 20,
      },
    },
    checkpoint: [
      mcq('`rename_column` is irreversible even with the data intact because:',
        [['The currently running code cannot read the new name', true],
          ['The old name cannot be restored afterwards', false],
          ['Indexes on the column are dropped', false],
          ['The rename cannot be applied atomically', false]],
        'Reversible means the previous version of the code still works after it.'),
      mcq('`add_column not_null` with no default is irreversible because:',
        [['It fails on existing rows, and fixing that is a data change', true],
          ['The column can no longer be dropped once it is populated', false],
          ['Existing code would write nulls to it', false],
          ['The default cannot be added afterwards', false]],
        'The reversible version is nullable, or not-null with a default.'),
      mcq('A mixed fleet during a rollout explains:',
        [['Intermittent failures that look like a race', true],
          ['A total outage across all instances', false],
          ['A migration that ran without the code', false],
          ['Health checks failing on new instances only', false]],
        'The same request works on retry, which is why the deploy status is the first check.'),
    ],
  },

  {
    unitCode: 'T3_DEPLOYMENT_MINI_PROJECT',
    notes: `Build a pipeline that deploys, and then prove you can undo it.

**The rollback is the deliverable.** A project that deploys successfully and has never been
reversed has demonstrated the easy half, and the brief is weighted so that the timing of a
rehearsed rollback is worth as much as the pipeline that built it.

Budget around two hours. Anything you can break will do — a free tier, a virtual machine, a
container host.`,
    assignment: {
      title: 'Mini Project — A Pipeline You Can Reverse',
      description: 'Build a deployment pipeline for a real application, then rehearse and time a rollback.',
      instructions: `**Set up** continuous deployment for an application of yours, to somewhere
you can break.

**Part one — the pipeline**

1. On every push: install, test, lint, build. Show a run.
2. On merge: build the artefact **once**, tag it with the commit, push it to a registry.
3. Deploy that exact artefact. **Show that nothing is rebuilt** at the deploy step, and say how
   you know.
4. Report the total pipeline time. If it is over ten minutes, make it faster and report both
   numbers.
5. Secrets from the platform's store, not the repository. Show that a secret does not appear in
   the log — including in any step that echoes its environment.

**Part two — deploy safely**

6. A health check the deployment waits for before considering itself done.
7. Deploy twice, with a visible change between them, and show both.
8. Watch the deploy: what did you look at for the ten minutes afterwards, and what would have
   told you it was bad?

**Part three — the rollback, which is the project**

9. Roll back to the previous version. **Time it.** Write the exact commands.
10. Do it again a day later **from your runbook**, without looking at anything else. Say what
    the runbook was missing.
11. Deploy a version that is **deliberately broken** — one that starts and fails on a common
    request. Watch it fail, then roll back. Report: how long until you noticed, and how long
    until it was back.
12. Say what would have made you notice sooner, and implement it if you can.

**Part four — the database**

13. Add a schema change to the pipeline.
14. Make it backwards compatible using expand and contract. Show each deploy.
15. **Roll back with the migration already applied.** Show the old code still working against
    the new schema — which is the whole point of the pattern.
16. Say what you would do if you had to roll back an irreversible migration. There is an
    answer, and it is not technical.

**Submit** the pipeline configuration, the two rollback timings, the broken-deploy incident
with its timings, the runbook, and the expand-and-contract sequence.`,
      rubric: [
        { criterion: 'A real pipeline', description: 'Test, build once, tag, deploy the same artefact — with evidence it is not rebuilt.', maxPoints: 20 },
        { criterion: 'Secrets kept out', description: 'From a store, and shown absent from the logs.', maxPoints: 10 },
        { criterion: 'A timed rollback', description: 'Performed, timed, commands recorded.', maxPoints: 20 },
        { criterion: 'From the runbook, a day later', description: 'Repeated cold, with what was missing reported.', maxPoints: 15 },
        { criterion: 'A deliberate incident', description: 'Broken version deployed, time to notice and time to recover both reported.', maxPoints: 20 },
        { criterion: 'Rollback across a migration', description: 'Old code shown working against the new schema.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('The deliverable of this project is:',
        [['The rollback', true], ['The pipeline', false],
          ['The health check', false], ['The migration sequence', false]],
        'A project that has never been reversed has demonstrated the easy half.'),
      mcq('Repeating the rollback from the runbook a day later tests:',
        [['Whether the runbook works without the author', true],
          ['Whether the rollback is idempotent', false],
          ['How much the timing varies', false],
          ['Whether the artefact is still available', false]],
        'What it was missing is the finding.'),
      mcq('Rolling back an irreversible migration has an answer that:',
        [['Is not technical', true],
          ['Requires a database backup restore', false],
          ['Depends on the migration framework used', false],
          ['Is to roll forward with a fix instead', false]],
        'Which is what question 16 is asking the student to reach.'),
    ],
  },
];
