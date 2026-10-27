/**
 * Career-track placement content: DevOps Engineer Interview Questions (CL_IV_DEVOPS), Cloud & DevOps Engineer,
 * batch CL4.
 *
 * Year-4 interview versions of what the track taught: Linux and networking (the years' T2_LINUX and T3_LINUX),
 * Docker and Kubernetes (CL_KUBERNETES and the years' container lessons), Terraform (CL_TERRAFORM), CI/CD and
 * GitOps (CL_CICD_GITOPS) and monitoring and SRE (CL_OBSERVABILITY_SRE). Each set gives the question, what the
 * interviewer is testing, a model answer to say aloud, the follow-up a good answer earns and the weak answer
 * that loses the round. The topics' own INTERVIEW_QUESTION units already cover kubectl apply, ECS versus EKS,
 * state, environments, drift, OIDC, canaries and burn-rate SLOs; these sets ask the next questions a panel
 * asks, and refer back rather than repeat.
 *
 * Context: DevOps, SRE, platform and cloud engineer roles for freshers at product companies, GCCs, IT services
 * and start-ups in Bengaluru, Hyderabad, Pune and Chennai. Shell output quoted here was run on Ubuntu (WSL);
 * Kubernetes, workflow and HCL snippets were parsed (PyYAML, python-hcl2) but not run on a cluster or cloud.
 *
 * Attribution: the topic is multi-skill. Each IV_* unit declares one skill and its checkpoint questions name
 * it with ck(); the CHECKPOINT unit spreads its ten over the five skills. Practice mcqs name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_CL_IV_DEVOPS_BUNDLES: PilotBundle[] = [
  /* ── IV_LINUX ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_IV_DEVOPS_IV_LINUX',
    notes: `Every DevOps and SRE interview has a Linux round, and for freshers it is often the round that decides the
offer. The panel — an SRE at a fintech in Bengaluru, a platform engineer at a GCC in Hyderabad — is not checking
that you know forty commands. It is checking whether you have a **method**: start from the symptom, collect
evidence in a sensible order, explain what each output means, and change one thing at a time. You learnt the
commands in "Linux for Engineers" (processes and services, SSH and permissions, logs on a server); here they are
asked the way a panel asks them. The shell output below is real, from an Ubuntu machine.

## Q1. "The service is running, but users get nothing. Walk me through the box."

**Testing:** whether you work in layers instead of guessing.

**Model answer.** "I go from inside the box outwards. systemctl status myapp — is it active, since when, how many
restarts? Then journalctl -u myapp -n 100 for its own words. Then ss -tlnp to see that it is listening, and on
which address. Then curl localhost on that port. If it answers locally and not from outside, the problem is the
binding, the host firewall, the security group or NACL, or the load balancer's health check — in that order."

The binding is the commonest single cause. A Python server started with --bind 127.0.0.1:

    $ ss -tlnp
    State  Recv-Q Send-Q  Local Address:Port Peer Address:PortProcess
    LISTEN 0      5           127.0.0.1:8080      0.0.0.0:*    users:(("python3",pid=495,fd=3))
    $ curl -s -o /dev/null -w '%{http_code}\\n' http://127.0.0.1:8080/
    200
    $ curl -sS -o /dev/null -m 3 http://10.0.1.25:8080/      # the box's own private IP
    curl: (7) Failed to connect to 10.0.1.25 port 8080 after 0 ms: Connection refused

It works on localhost and is refused on the box's own address: it must listen on 0.0.0.0 (or the private IP).

**Follow-up:** "What is the difference between 'connection refused' and 'connection timed out'?" — "Refused means
my packet reached a host and it answered with a reset: nothing listens on that port, or a firewall rejects
actively. Timed out means no answer at all: packets dropped by a security group, a NACL, a route or a host that
is down." Real output of both:

    $ curl -sS -o /dev/null -m 3 http://127.0.0.1:9090/
    curl: (7) Failed to connect to 127.0.0.1 port 9090 after 0 ms: Connection refused
    $ curl -sS -o /dev/null -m 3 http://10.255.255.1:80/
    curl: (28) Connection timed out after 3001 milliseconds

On AWS a security group never sends a reset — it drops — so a timeout from outside points at the security group,
the NACL or routing, and a refusal points at the instance.

**Weak answer:** "I would restart the service and check again."

## Q2. "df says the disk is 100% full, but du adds up to far less. Why?"

**Testing:** whether you know that deleting a file does not free its space while a process holds it open.

**Model answer.** "Someone deleted a big log while the app still had it open. The directory entry is gone, so du
cannot see it, but the inode and its blocks stay until the last file descriptor closes, so df still counts them.
lsof +L1 lists open files with zero links." Real output: a 200 MB log, held open by a writer, then deleted:

    --- du after rm
    4.0K    /tmp/ivlab
    --- lsof +L1 (open but deleted)
    COMMAND PID  USER   FD   TYPE DEVICE  SIZE/OFF NLINK  NODE NAME
    sleep   482 naidu    1w   REG   8,32 209715200     0 25723 /tmp/ivlab/app.log (deleted)

"To free it, restart or reload the process so it reopens its log, or truncate it through the descriptor with
: > /proc/482/fd/1 — that ran and the size went from 209715200 bytes to 0. Then fix the cause: logrotate with a
postrotate signal, or copytruncate for apps that cannot reopen, and never rm a live log again."

**Follow-up:** "df shows space free, but writes fail with 'No space left on device'." — "Inodes. df -i. Millions
of tiny files — session files, a cache directory — use up the inode table while the blocks are free."

**Weak answer:** "Add a bigger disk."

## Q3. "Load average is 12 on a 4-core box, but top shows the CPU 70% idle. Explain."

**Testing:** what load average actually counts.

**Model answer.** "On Linux, load average counts tasks that are runnable **and** tasks in uninterruptible sleep —
state D, usually waiting on disk or a network filesystem. So a high load with idle CPU means processes are stuck
on I/O, not on CPU. I would check the wa column in top or vmstat 1 — the b column there counts blocked
processes — then iostat -x for the device's utilisation and await, and ps -eo pid,stat,cmd | grep ' D' for which
processes. On EC2, a gp2 volume out of burst credits or an EFS mount with slow throughput is a common cause."

The three numbers are 1-, 5- and 15-minute averages; compare them with nproc — 12 on 4 cores is three tasks per core.

**Follow-up:** "What is a zombie process, and can you kill it?" — "A child that has exited but whose parent has
not called wait() to collect its exit status. It uses no CPU or memory, only a process-table entry, and kill -9
does nothing because it is already dead." Real output from a parent that never waits:

        PID    PPID STAT CMD
        362     341 Z+   [python3] <defunct>
    after kill -9: Z+

"You fix the parent — or kill it, and init adopts and reaps the zombie. In containers this is why an init such as
tini, or docker run --init, matters when PID 1 spawns children."

## Q4. "free shows 150 MB free on an 8 GB server. Do we need more RAM?"

**Testing:** whether you can read free, and know where the OOM killer leaves its mark.

**Model answer.** "Not from that number. Linux uses spare memory as page cache, so 'free' is always small on a busy
box. The column that matters is available — memory that can be handed to programs without swapping." Real output:

                   total        used        free      shared  buff/cache   available
    Mem:           3.7Gi       468Mi       2.9Gi       3.0Mi       394Mi       3.1Gi

"If available is low and swap is busy, or the kernel log shows 'Out of memory: Killed process', then memory is
really short. journalctl -k or dmesg shows the OOM killer's choice. In a container the same event shows as
OOMKilled with exit code 137 — 128 plus signal 9."

**Follow-up:** "Why 137?" — "A process killed by a signal exits with 128 plus the signal number. SIGKILL is 9, so
137; SIGTERM is 15, so 143." Both ran: SIGTERM -> exit 143, SIGKILL -> exit 137.

## Q5. "The app gets 'Permission denied' writing to /srv/app/uploads, though the file is 644. Why?"

**Testing:** users, groups, and what permissions mean on a directory.

**Model answer.** "First, which user is the process? systemctl show -p User myapp or ps -o user. Then ls -ld on
the directory, not just the file: creating or deleting a file needs write and execute on the directory. Execute on
a directory means 'may enter'." Real output — a directory with read but no execute:

    drw-r--r--
    --- ls uploads (read, no execute)
    a.txt
    --- cat uploads/a.txt
    cat: uploads/a.txt: Permission denied

"The names list, nothing opens. The fix is ownership: chown the directory to the service user and give it 750 or
770 with a shared group — not chmod 777, which is guessing, and not running the service as root."

**Follow-up:** "What is the sticky bit?" — "On a directory such as /tmp (mode 1777), anyone may create files but
only a file's owner can delete or rename it. setuid on a binary runs it as its owner — passwd uses it — which is
why a setuid-root binary is a security review item."

## Q6. "What happens when a service runs curl https://api.paysetu.in/health?"

**Testing:** networking from name to response, and which tool checks each step.

**Model answer.** "Name resolution first — /etc/hosts, then the resolver in /etc/resolv.conf; dig shows what DNS
returns. Then a TCP handshake to port 443 — nc -vz tests that. Then TLS: the client sends the name as SNI, the
server presents its certificate chain, the client checks the name, the dates and the chain to a trusted CA. Then
the HTTP request. curl -v shows every stage, so I can say which one fails."

**Follow-up:** "dig resolves it but the app in the container says it cannot resolve." — "The container has its own
/etc/resolv.conf; in Kubernetes the search domains and ndots:5 make short names try cluster suffixes first. Or an
/etc/hosts entry overrides it. And 'certificate verify failed' is usually a missing intermediate certificate on the
server or a wrong clock on the client."

## How you are judged

Strong answers name a command, say what its output means and what you would do next. Weak answers jump to a fix —
restart, reboot, chmod 777, a bigger instance — before any evidence.`,
    workedExample: `**Question: "After this morning's deploy, Nginx on our EC2 instance returns 502 Bad Gateway for every request.
Talk me through it."**

**A weak answer (heard often):**

"502 means the server is down. I would restart Nginx and if that does not work, reboot the instance."

What the panel hears: no idea what a 502 means, and two actions that destroy evidence.

**A strong answer:**

"A 502 from Nginx means Nginx itself is up and answering, but its upstream — the app it proxies to — gave it no
valid response. So I leave Nginx alone and look at the app.

First, Nginx's error log says why: tail -n 50 /var/log/nginx/error.log. A typical line is
'connect() failed (111: Connection refused) while connecting to upstream, ... upstream:
"http://127.0.0.1:8000/"'. Error 111 is ECONNREFUSED: nothing is listening on 127.0.0.1:8000.

Second, the app: systemctl status app — is it active, and is the restart count climbing? If it is crash-looping,
journalctl -u app -n 100 shows the reason: often a new setting the deploy needs that is missing from the
environment file, or a port that changed.

Third, ss -tlnp: is the app listening, and on the port and address Nginx expects? If the deploy moved it to 8080,
or it now binds a Unix socket, the upstream line in the Nginx config is wrong.

If instead the log says 'upstream timed out', the app is listening but slow — I would check the database and
free -h and df -h before anything else.

To mitigate, I roll back to the previous release, which is faster than debugging under a 502. Then I find the
cause on the old box or in staging, and add a post-deploy check that curls the health endpoint before the
release counts as done."

**Why it scores:** it knows what 502 means, reads the proxy's own log before touching anything, goes to the
process, the logs and the socket in order, distinguishes refused from timed out, and mitigates before diagnosing.`,
    mcqs: [
      mcq('A Flask app answers on curl http://127.0.0.1:5000 from the server itself, but every request from the load balancer is refused. What should a candidate suspect first?', [
        ['The app is bound to 127.0.0.1 instead of 0.0.0.0 or the private IP', true],
        ['The security group drops port 5000, since refusals come from AWS', false],
        ['The load balancer health check path returns a 404 from the app', false],
        ['The instance has run out of memory and drops new TCP connections', false],
      ], 'Answering locally while refusing the box’s own address is the signature of a loopback binding. Security groups drop silently, which gives a timeout, not a refusal; a 404 health check would still connect; memory pressure does not produce clean refusals.'),
      mcq('After someone deleted a 30 GB log on a full server, df still reports 100% used. Which command shows where the space went?', [
        ['lsof +L1, to list files that are open but have no links left', true],
        ['du -sh /var/log, to add up the size of what is in the log folder', false],
        ['df -i, to compare inode use against the free blocks on the disk', false],
        ['free -h, to check whether the page cache is holding those blocks', false],
      ], 'A deleted file held open by a process keeps its blocks until the descriptor closes; lsof +L1 lists exactly those. du cannot see a file with no directory entry, df -i diagnoses inode exhaustion, and page cache is memory, not disk.'),
      mcq('A container exits with code 143 during every rolling update. What does that number tell you?', [
        ['It ended on SIGTERM, which is a normal stop asked for by the platform', true],
        ['It was killed by the kernel’s OOM killer after reaching its memory limit', false],
        ['It crashed with an unhandled exception raised by the application code', false],
        ['It could not start because its binary was built for another architecture', false],
      ], 'Exit codes above 128 mean death by signal: 143 = 128 + 15, SIGTERM, what Kubernetes or Docker sends to stop a container. OOM kills arrive as SIGKILL (137), an exception usually exits 1, and a wrong architecture fails at exec.'),
    ],
    checkpoint: [
      ck('LINUX_ADMIN', 'From your laptop, curl to an EC2 instance’s port 8443 hangs and then reports “Connection timed out”. On the instance, ss shows the app listening on 0.0.0.0:8443. Where do you look next?', [
        ['Security group, NACL and route table, since packets are being dropped', true],
        ['The application log, since the app is rejecting your TLS handshake', false],
        ['The app’s bind address, since 0.0.0.0 accepts only local connections', false],
        ['The instance’s DNS settings, since the name resolves to the wrong port', false],
      ], 'A timeout means no reply at all, and AWS network controls drop rather than reject, so the path is the suspect when the app listens on all addresses. A TLS rejection needs a TCP connection first; 0.0.0.0 means every address; DNS returns addresses, not ports.'),
      ck('LINUX_ADMIN', 'A 4-vCPU database host shows load average 9.8 while top reports CPU 65% idle and a high wa figure. What is the most likely explanation?', [
        ['Processes are blocked on disk I/O, which load average also counts', true],
        ['The host has too few cores, since load above 4 always means CPU wait', false],
        ['A runaway process is spinning on one core and hiding from top', false],
        ['The load average is stale and refreshes only every fifteen minutes', false],
      ], 'Linux load average includes tasks in uninterruptible sleep, usually waiting on storage, and a high wa confirms it. More cores would not help, a spinning process would show as busy CPU, and the three averages update continuously over 1, 5 and 15 minutes.'),
      ck('LINUX_ADMIN', 'A systemd service running as user app cannot create files in /srv/app/uploads, which is owned by root with mode 755. What is the right fix?', [
        ['Give the directory to the app user or a shared group with write access', true],
        ['Run chmod 777 on the directory so that any user can write files into it', false],
        ['Change the service to run as root so the directory permissions no longer apply', false],
        ['Run chmod 644 on the files inside so the app user can overwrite each of them', false],
      ], 'Creating a file needs write and execute on the directory for the process’s user, so ownership or group write is the precise fix. 777 opens it to every user, running as root widens the blast radius, and file modes do not control creating new entries.'),
    ],
  },

  /* ── IV_DOCKER_K8S ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_IV_DEVOPS_IV_DOCKER_K8S',
    notes: `Containers and Kubernetes take the longest slot in most DevOps and platform interviews. The topic's own interview
unit (in "Kubernetes on AWS") already drilled "what happens on kubectl apply", "ECS or EKS", the CrashLoopBackOff
walk-through and IRSA. A panel that has heard those answers goes one level down: what an image actually is, what
isolates a container, why it will not stop cleanly, how a Service finds its Pods, and what a probe should and
should not check. Each answer below ends where the follow-up begins. Manifests were checked against the
Kubernetes API models in Python; nothing here ran on a cluster, and the Dockerfile was written from the
documentation, not built.

## Q1. "What is an image layer, and why does the order of lines in a Dockerfile matter?"

**Testing:** whether you have built images and waited for slow builds.

**Model answer.** "An image is a stack of read-only layers plus metadata; RUN, COPY and ADD each add a layer. At
build time each step is cached, and the cache for a step is used only if its instruction and inputs are unchanged
and every step before it was a cache hit. So the order should go from what changes least to what changes most.
For a Python service I copy requirements.txt and install dependencies first, then copy the code — a code change
then reuses the dependency layer instead of reinstalling everything."

    FROM python:3.12-slim AS build
    WORKDIR /app
    COPY requirements.txt .
    RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

    FROM python:3.12-slim
    WORKDIR /app
    COPY --from=build /install /usr/local
    COPY . .
    RUN useradd --uid 10001 --no-create-home app
    USER 10001
    EXPOSE 8000
    CMD ["gunicorn", "-b", "0.0.0.0:8000", "-w", "2", "-k", "uvicorn.workers.UvicornWorker", "app.main:app"]

**Follow-up:** "The image is 1.2 GB. Make it smaller." — "A slim base, a multi-stage build so compilers stay in
the build stage, pip's --no-cache-dir, a .dockerignore that keeps .git, tests and local virtualenvs out of the
context, and cleaning apt lists in the same RUN that installs them — a file deleted in a later layer still ships in
the earlier one. Alpine is not automatically better for Python: it uses musl, so some packages have no ready
wheel and compile from source, which can make the build slower and the image bigger. I would check the result with
docker history to see which layer is heavy."

## Q2. "What actually isolates a container? How is it different from a VM?"

**Testing:** whether "lightweight VM" is all you know.

**Model answer.** "A container is an ordinary Linux process with a restricted view. Namespaces give it its own
process IDs, network stack, mounts, hostname and users; cgroups limit how much CPU and memory it may use. It
shares the host's kernel — a VM has its own kernel on a hypervisor. So containers start in a second and pack
densely, but the isolation is weaker: a kernel bug affects every container on the node, which is why multi-tenant
platforms add gVisor, Firecracker microVMs (what Lambda runs on) or separate nodes."

**Follow-up:** "Why should the container not run as root?" — "Root in the container is root on the host's kernel
unless user namespaces remap it. If the app is compromised and there is a breakout bug or a careless hostPath
mount, root gets much further. A USER line with a numeric UID, runAsNonRoot: true in the Pod's securityContext,
a read-only root filesystem and dropped capabilities are the cheap defaults."

## Q3. "docker stop takes ten seconds and then the app dies with no clean shutdown. Why?"

**Testing:** signals and PID 1 — the cause behind "a few errors on every deploy".

**Model answer.** "docker stop sends SIGTERM to PID 1 in the container, waits ten seconds by default, then sends
SIGKILL — exit code 137. If the Dockerfile uses the shell form, CMD gunicorn ..., PID 1 is /bin/sh -c, which does
not pass SIGTERM on to gunicorn, so the app never hears it and is killed. The exec form, CMD ["gunicorn", ...],
makes the app PID 1 and it receives the signal. The app must then stop accepting work, finish in-flight requests
and exit. If PID 1 has to be a script, end it with exec, or use tini or docker run --init, which also reaps
zombie processes."

**Follow-up:** "In Kubernetes the app handles SIGTERM, but we still see 502s during rollouts." — "That is the race
between endpoint removal and SIGTERM, covered in the reliability lesson: a short preStop sleep so load balancers
stop sending first, and a terminationGracePeriodSeconds that covers the sleep plus the drain."

## Q4. "Why not create Pods directly? And when is a Deployment the wrong choice?"

**Testing:** the workload objects and what each guarantees.

**Model answer.** "A bare Pod is not recreated if its node dies, and it cannot be rolled out. A Deployment manages
ReplicaSets, so it gives replicas, self-healing and rolling updates for stateless services. A StatefulSet is for
Pods that need a stable identity and their own storage — api-0, api-1, each with its own PersistentVolumeClaim
from volumeClaimTemplates, started in order — Kafka, ZooKeeper, a self-run database. A DaemonSet puts one Pod on
every node — log shippers, node exporters, the CNI. A Job runs to completion and a CronJob runs one on a schedule."

**Follow-up:** "A Service has no endpoints. Why?" — "A Service selects Pods by label. Either the selector does not
match the Pod template's labels — app: api versus app: api-server — or the Pods match but are not Ready, because
only Ready Pods are added. kubectl get endpointslices -l kubernetes.io/service-name=api shows which, and
kubectl get pods -l app=api --show-labels shows the labels."

    apiVersion: v1
    kind: Service
    metadata: {name: api, namespace: clinic}
    spec:
      selector: {app: api}
      ports: [{port: 80, targetPort: http}]

## Q5. "Pods restart every few minutes at peak, all of them together. Here are the events."

The interviewer reads: "Liveness probe failed: Get "http://10.0.3.17:8000/healthz": context deadline exceeded. Container api failed liveness probe, will be restarted."

**Testing:** what a liveness probe is for, and how a bad one turns slowness into an outage.

**Model answer.** "The liveness probe timed out — the default timeoutSeconds is one second — so the kubelet killed
healthy-but-slow containers. If /healthz checks the database, then when the database slows at peak every Pod fails
liveness at once and is restarted together, which removes capacity exactly when it is needed: a self-inflicted
outage. Liveness should answer 'is this process wedged?' — a cheap in-process check. Readiness answers 'should I
get traffic now?' and may check what the Pod needs to serve. Slow start goes in a startupProbe, which holds the
other two off until it passes."

    startupProbe:   {httpGet: {path: /healthz, port: http}, periodSeconds: 5, failureThreshold: 24}
    readinessProbe: {httpGet: {path: /readyz, port: http}, periodSeconds: 5, timeoutSeconds: 2}
    livenessProbe:  {httpGet: {path: /healthz, port: http}, periodSeconds: 10, timeoutSeconds: 2, failureThreshold: 3}

"That startupProbe allows 5 × 24 = 120 seconds to start. I would also check describe for the last state's exit
code: 137 after a liveness kill means the app did not exit within the grace period."

**Follow-up:** "Should readiness check the database?" — "With care. If every Pod goes unready when the database
blips, the Service has no endpoints and users get errors from the load balancer instead of a graceful message.
Many teams keep readiness to the Pod's own ability to serve and handle a dependency outage in the code."

## Q6. "Requests and limits — what happens when a container goes over each?"

**Testing:** scheduling versus enforcement, and the CPU-limit argument.

**Model answer.** "Requests are what the scheduler reserves on a node; limits are what the kernel enforces.
Going over a memory limit gets the container OOMKilled, exit 137. Going over a CPU limit does not kill anything —
the container is throttled by the CFS quota, so latency rises. Using more than the request, up to the limit, is
fine while the node has room, but under memory pressure Pods above their requests are evicted first."

**Follow-up:** "Some teams set no CPU limits at all. Why?" — "Throttling hurts latency even when the node has idle
CPU, and spiky services such as Python web servers get throttled within each 100 ms period. With honest CPU
requests the scheduler still shares the node fairly. Memory limits stay, because memory cannot be throttled. I
would look at container_cpu_cfs_throttled_periods_total before deciding."

## How you are judged

Strong answers explain the mechanism — layers and cache, namespaces and cgroups, signals and PID 1, labels and
readiness — and then the setting that follows from it. Weak answers recite object names, or fix every symptom
by raising a timeout.`,
    workedExample: `**Question: "We deployed v2 of the api. kubectl get pods shows the new Pods Running but 0/1 Ready for ten
minutes, and the rollout has not finished. Talk me through it."**

**A weak answer:**

"The Pods are broken. I would delete them so Kubernetes recreates them, and if it still fails, roll back."

What the panel hears: deleting Pods recreates the same template, so it changes nothing, and there is no attempt to
find out why.

**A strong answer:**

"Running but not Ready means the containers started and the readiness probe is failing, so the Service keeps
them out and the Deployment will not remove old Pods — with maxUnavailable 0 users are still on v1, which is the
safety working.

I would run kubectl describe pod on one new Pod and read the events. 'Readiness probe failed: HTTP probe failed
with statuscode: 503' means the app answers but says it is not ready; 'connection refused' means nothing listens
on the probe port — for example v2 listens on 8080 while the probe still says 8000, or the named port changed.

Then kubectl logs on that Pod: a 503 from /readyz usually names its reason — a database migration not applied, a
new environment variable missing from the ConfigMap, a downstream it cannot reach because a NetworkPolicy does
not allow it.

The rollout will hit progressDeadlineSeconds and be marked failed; Kubernetes will not roll back on its own. If
the cause is not obvious in a few minutes, I run kubectl rollout undo deploy/api and investigate v2 in staging.

Finally the pipeline should have caught this: kubectl rollout status with a timeout after every deploy, so CI fails
and rolls back instead of a person noticing ten minutes later."

**Why it scores:** it reads Running-but-not-Ready correctly, sees that the rollout strategy is protecting users,
moves from events to logs to a specific cause, and ends with the pipeline change that prevents a repeat.`,
    mcqs: [
      mcq('A Dockerfile copies the whole project and then runs pip install -r requirements.txt. Every one-line code change takes eight minutes to build. What fixes it?', [
        ['Copy requirements.txt and install first, then copy the code after', true],
        ['Switch to an Alpine base image so the install step runs faster', false],
        ['Add --no-cache-dir to pip so stale packages are not reused', false],
        ['Use ADD instead of COPY so Docker can detect which files changed', false],
      ], 'A code change invalidates the COPY of the whole project and every step after it, including the install. Installing from requirements.txt first keeps that layer cached. Alpine can make Python installs slower, --no-cache-dir shrinks the image but not the rebuild, and ADD caches the same way as COPY.'),
      mcq('A Service named api has no endpoints, although three Pods labelled app: api-server are Running and Ready. What is wrong?', [
        ['The Service selector is app: api and does not match the Pod labels', true],
        ['The Pods need a containerPort entry before the Service can see them', false],
        ['The Service must be type LoadBalancer before it will list endpoints', false],
        ['Endpoints appear only once the HorizontalPodAutoscaler has scaled', false],
      ], 'A Service selects Pods by label, and only matching, Ready Pods become endpoints. A containerPort is informational, ClusterIP Services have endpoints too, and autoscaling has no part in endpoint selection.'),
      mcq('During a sale, the database slows down and every api Pod is restarted within a minute, making the outage worse. The liveness probe calls /healthz, which queries the database. What should change?', [
        ['Liveness should check only the process; dependencies stay out of it', true],
        ['The liveness failureThreshold should rise to 30 so it never fires', false],
        ['The readiness probe should be removed so traffic keeps flowing in', false],
        ['The database should be scaled up whenever liveness probes start failing', false],
      ], 'A liveness probe that depends on the database turns a slow database into a restart storm. Keep liveness to “is this process alive”. A huge threshold hides a real deadlock, removing readiness sends traffic to Pods that cannot serve, and scaling the database is a separate concern.'),
    ],
    checkpoint: [
      ck('KUBERNETES', 'A container’s CMD is written in shell form, CMD python worker.py. On every deploy it is killed after the grace period instead of finishing its current job. Why?', [
        ['The shell is PID 1 and does not pass SIGTERM on to the Python process', true],
        ['Shell form makes the container ignore the stop timeout set by the platform', false],
        ['Python cannot handle SIGTERM unless it runs inside a virtual environment', false],
        ['The worker needs a liveness probe before Kubernetes will send it signals', false],
      ], 'Shell form runs /bin/sh -c as PID 1, and the shell does not forward SIGTERM, so the worker never hears it and is SIGKILLed after the grace period. The timeout still applies, Python handles signals anywhere, and probes have nothing to do with termination signals.'),
      ck('KUBERNETES', 'A latency-sensitive api has a CPU limit of 500m. Its p99 doubles at peak, but it is never restarted and the node has idle CPU. What is the likely cause?', [
        ['CFS throttling at the CPU limit, which slows the container down', true],
        ['OOM kills, which restart the container and lose warm caches', false],
        ['The CPU request is too high, so the scheduler starves the Pod', false],
        ['Eviction under node pressure, since it uses more than requested', false],
      ], 'Exceeding a CPU limit throttles rather than kills, so latency rises with no restarts even on an idle node. OOM kills would show restarts, a request only reserves capacity, and eviction would remove the Pod.'),
      ck('KUBERNETES', 'Which workload type should run a log-shipping agent that must be present on every node in the cluster?', [
        ['A DaemonSet, which schedules one Pod on each matching node', true],
        ['A Deployment with replicas set to the current node count', false],
        ['A StatefulSet, so each agent keeps a stable identity', false],
        ['A CronJob that runs on each node once every minute', false],
      ], 'A DaemonSet places one Pod per node and adds one when a node joins. A Deployment with a fixed count does not follow nodes or guarantee one each, a StatefulSet gives identity rather than placement, and a CronJob would miss logs between runs.'),
    ],
  },

  /* ── IV_TERRAFORM ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_IV_DEVOPS_IV_TERRAFORM',
    notes: `Terraform is on nearly every DevOps and cloud job description in India, and the interview questions about it have
a pattern: the panel wants to know whether you have **operated** it with a team, not whether you can write a
resource block. The Terraform topic's interview unit already covered what state is, the dev-staging-prod layout,
console drift and the half-failed apply. The questions below are the ones that come next: reading a plan, count
versus for_each, secrets in state, modules, lifecycle rules and where Terraform stops. Every HCL snippet here was
parsed with python-hcl2; none was applied, because there is no AWS account behind this lesson.

## Q1. "What does terraform plan actually do — and why apply a saved plan in CI?"

**Testing:** whether you read plans or just approve them.

**Model answer.** "Plan refreshes what it knows from the real infrastructure for every resource in state, compares
that with the configuration, and prints the actions to make them match: + create, - destroy, ~ update in place,
-/+ destroy and then create a replacement, +/- the same but creating first. It ends with a summary line, 'Plan: 1
to add, 2 to change, 0 to destroy'. In CI I run terraform plan -out=tfplan on the pull request, someone reviews
it, and the apply job runs terraform apply tfplan — exactly what was reviewed, not a fresh plan that might differ.
If the state changed in between, Terraform refuses with 'Saved plan is stale', and we plan again."

**Follow-up:** "A plan shows -/+ on an EC2 instance with '# forces replacement' next to user_data. What do you
do?" — "Stop and read why. Some arguments cannot change in place, so the instance would be destroyed — with its
local data and private IP. If that is not wanted, revert the change. If it is — say, a new bootstrap script — I
make sure the instance is disposable, behind a load balancer or an Auto Scaling group, and use
create_before_destroy so the new one is up before the old one goes."

## Q2. "count or for_each? Why did removing one bucket from a list destroy three?"

**Testing:** how Terraform addresses instances — a classic production accident.

**Model answer.** "With count, instances are addressed by index. MedSetu's three buckets:"

    variable "buckets" {
      type    = list(string)
      default = ["invoices", "kyc", "reports"]
    }

    resource "aws_s3_bucket" "this" {
      count  = length(var.buckets)
      bucket = "medsetu-\${var.buckets[count.index]}-123456789012"
    }

"Remove 'invoices' and every later index shifts: this[0] becomes kyc and this[1] becomes reports, and a bucket's
name forces replacement. A small simulation of the plan's arithmetic printed:"

    this[0] invoices -> kyc: replace
    this[1] kyc -> reports: replace
    this[2] reports: destroy
    Plan: 2 to add, 0 to change, 3 to destroy.

"With for_each over a set or a map, instances are addressed by key — this["kyc"] — so removing one key removes
exactly one instance. I use count only for 'zero or one' switches, such as count = var.enable_bastion ? 1 : 0."

**Follow-up:** "The count version is already in production. How do you switch without destroying anything?" —
"moved blocks, one per instance, reviewed in the same PR. The plan should then show moves and nothing to add or
destroy:"

    resource "aws_s3_bucket" "this" {
      for_each = toset(var.buckets)
      bucket   = "medsetu-\${each.key}-123456789012"
    }

    moved {
      from = aws_s3_bucket.this[0]
      to   = aws_s3_bucket.this["invoices"]
    }

"— and the same for 1 and 2. On older versions it was terraform state mv, which works but is not reviewed in a
PR."

## Q3. "Your state file contains the database password. What do you do?"

**Testing:** whether you know that sensitive = true hides output but not state.

**Model answer.** "Marking a variable or output sensitive only hides it in plan and apply output; the value is still
written to state in plain text. So first, keep secrets out: for RDS, manage_master_user_password = true lets RDS
keep the password in Secrets Manager; newer Terraform versions add write-only arguments that are never stored.
Applications read the secret from Secrets Manager at runtime. Second, treat state as a secret store anyway: an S3
backend with encryption, versioning and blocked public access, and only the Terraform roles allowed to read it."

**Follow-up:** "Someone committed terraform.tfstate to the Git repository last month." — "Treat every secret in it
as leaked: rotate them first, because deleting the file does not remove it from history or from clones. Then
remove it from history if policy requires, move state to the remote backend, and add *.tfstate and .terraform/ to
.gitignore — plus a secret-scanning check in CI."

## Q4. "How do you write a module someone else can safely use?"

**Testing:** interfaces and versioning, not syntax.

**Model answer.** "A module is a directory with variables as its inputs and outputs as its interface. Inputs are
typed and validated, so a bad value fails at plan with a message rather than at AWS:"

    variable "cidr" {
      type = string
      validation {
        condition     = can(cidrhost(var.cidr, 0))
        error_message = "cidr must be a valid CIDR block, such as 10.20.0.0/16."
      }
    }

    output "private_subnet_ids" {
      value = aws_subnet.private[*].id
    }

"It declares required_providers but has no provider block — the caller configures the region and credentials.
It does one job, has sensible defaults, and callers pin it to a release:"

    module "network" {
      source = "git::https://github.com/medsetu/tf-modules.git//network?ref=v1.4.0"
      cidr   = "10.20.0.0/16"
      azs    = ["ap-south-1a", "ap-south-1b"]
    }

**Follow-up:** "A module release renamed an internal resource, and every caller's plan now destroys its VPC." —
"The module author should have shipped a moved block inside the module; Terraform applies moved blocks from
modules too. As a caller, I would not apply — I would pin the old tag, report it, and upgrade when the release has
the moved block. That is also why the plan for every module bump is read in the PR."

## Q5. "When do you use create_before_destroy, prevent_destroy and ignore_changes?"

**Testing:** lifecycle rules and their limits.

**Model answer.** "create_before_destroy for things that are replaced and must not leave a gap — launch templates,
certificates, an instance behind a load balancer. prevent_destroy on things whose loss is a disaster — the
production database, the state bucket — so any plan that would destroy them errors. ignore_changes for attributes
something else owns: an ECS service's desired_count that autoscaling changes, so every apply does not reset it."

    resource "aws_ecs_service" "api" {
      name          = "api"
      desired_count = 2

      lifecycle {
        ignore_changes = [desired_count]
      }
    }

**Follow-up:** "Is prevent_destroy enough to protect the database?" — "No. It only works while the resource block is
in the configuration; delete the block and the guard goes with it, and terraform destroy of a whole workspace is a
separate path too. So the database also has deletion_protection = true on the AWS side, final snapshots, backups —
and prod applies only from CI with an approval."

## Q6. "Terraform, CloudFormation or Ansible — what is each for?"

**Testing:** whether you can place tools rather than pick a favourite.

**Model answer.** "Terraform and CloudFormation are declarative provisioning tools: they create and change cloud
resources from a desired state. CloudFormation is AWS-only and keeps state on the AWS side, with rollback on
failure; Terraform works across providers — AWS, Azure, Cloudflare, Datadog — and keeps its own state. Ansible is
configuration management: it runs ordered tasks over SSH to configure machines, and it has no state of the world.
On a team I follow what is already there; for a new multi-cloud estate I would choose Terraform."

**Follow-up:** "Would you install packages on EC2 with a Terraform provisioner?" — "Only as a last resort; the
documentation says the same. Provisioners are not part of the plan and fail awkwardly. I would bake an AMI with
Packer, or use user_data for a small bootstrap, or run containers so the instance needs almost nothing."

## How you are judged

Strong answers read plan output precisely, know how addresses and state work, and add a safety net — moved blocks,
lifecycle guards, deletion protection, CI-only applies. Weak answers are "I would run apply and see".`,
    workedExample: `**Question: "We bumped the AWS provider from 5.x to 6.x. The plan in prod now shows 47 resources to change.
What do you do?"**

**A weak answer:**

"Terraform knows best — if the plan says change, I apply. A provider upgrade is just a version number."

What the panel hears: someone who will change 47 production resources without reading why.

**A strong answer:**

"I do not apply. A major provider version can change defaults, rename or remove arguments, and change how
attributes are read, so a big plan after an upgrade usually means the code needs updating, not the infrastructure.

First, the upgrade guide for that major version — HashiCorp publishes one — and the plan itself. I group the 47:
how many are ~ in place, how many -/+? Anything forcing replacement is a stop. Often most are cosmetic — a
default tag, an attribute now read differently — and the right change is in our code.

Second, I do it in dev first. The version constraint was ~> 5.0; I change it to ~> 6.0 in a branch, run terraform
init -upgrade, which also updates .terraform.lock.hcl with the new version and hashes, and plan dev. I fix the
code until the dev plan is empty or contains only changes I can explain, apply dev, then staging, then prod — each
with its own plan read in the PR.

Third, the lock file is committed, so CI and every laptop use exactly the same provider build, and nobody gets
6.x by accident on a Monday.

If one environment must stay on 5.x for a while, the pin keeps it there; there is no rush to upgrade prod on the
same day."

**Why it scores:** it treats the plan as evidence, knows major versions change behaviour, uses the lock file and
promotion through environments, and never applies a change it cannot explain.`,
    mcqs: [
      mcq('A plan line reads “-/+ resource "aws_instance" "worker"” with “# forces replacement” beside availability_zone. What will apply do?', [
        ['Destroy the instance and then create a new one in the new zone', true],
        ['Move the running instance to the new zone with no downtime at all', false],
        ['Update the zone in place, keeping the instance’s ID and private IP', false],
        ['Create a second instance and leave the old one running beside it', false],
      ], '-/+ means destroy then create a replacement, because that argument cannot change in place; the old instance’s local data and IP go with it. EC2 cannot move zones live, “forces replacement” rules out an in-place update, and the old one is destroyed, not kept.'),
      mcq('Three subnets were created with count over a list of zones. Someone removes the first zone from the list. Why does the plan replace the other two subnets?', [
        ['count addresses by index, so the remaining zones shift down one place', true],
        ['Subnets in a VPC must always be recreated together as a single group', false],
        ['Removing any element invalidates the state lock for that resource type', false],
        ['The provider re-reads zones alphabetically and so reorders the subnets', false],
      ], 'With count, aws_subnet.x[1] becomes what x[0] was, and a zone change forces replacement. for_each keyed by zone would remove just one. Subnets are independent, the lock is unrelated, and the provider does not reorder your list.'),
      mcq('A teammate marks the db_password variable sensitive = true and says the secret is now protected. What is the accurate reply?', [
        ['It is hidden in plan output but still written to state in plain text', true],
        ['It is encrypted in state with the provider’s KMS key from then on', false],
        ['It is removed from state, so the next plan will try to set it again', false],
        ['It is fully protected, provided the state is stored on a local disk', false],
      ], 'sensitive only redacts the value in CLI output; state still stores it. Encryption of state comes from the backend, not the flag, nothing is removed from state, and a local file is less protected, not more.'),
    ],
    checkpoint: [
      ck('INFRA_AS_CODE', 'The CI apply job runs terraform apply tfplan an hour after the plan was reviewed, and fails with “Saved plan is stale”. What does it mean?', [
        ['State changed after the plan was made, so Terraform refuses to apply it', true],
        ['The plan file expires after sixty minutes and must be regenerated daily', false],
        ['The provider was upgraded in between and its new schema rejects the plan', false],
        ['Someone holds the state lock, so the saved plan cannot be read right now', false],
      ], 'A saved plan records the state it was made against; if another apply changed state since, applying it could be wrong, so Terraform refuses and you plan again. Plans have no timer, a provider change gives a different error, and a held lock reports a lock error.'),
      ck('INFRA_AS_CODE', 'An ECS service’s desired_count is changed by Application Auto Scaling, and every terraform apply sets it back to 2 in the middle of the day. What is the fix?', [
        ['Add desired_count to ignore_changes in the service’s lifecycle block', true],
        ['Add prevent_destroy to the service so that apply cannot change the count', false],
        ['Run terraform refresh before each apply so state learns the current count', false],
        ['Remove the service from state so Terraform no longer manages it at all', false],
      ], 'ignore_changes tells Terraform that another system owns that attribute. prevent_destroy guards against deletion, not updates; refreshing changes state but the code still says 2, so plan still resets it; and dropping it from state abandons management of the whole service.'),
      ck('INFRA_AS_CODE', 'A pull request deletes the aws_db_instance block that carried lifecycle { prevent_destroy = true }. What will the plan do?', [
        ['Plan to destroy the database, since the guard went with the block', true],
        ['Fail, because prevent_destroy is kept in state after the first apply', false],
        ['Keep the database and stop managing it, with nothing at all to destroy', false],
        ['Ask for the database’s final snapshot name before it plans anything', false],
      ], 'prevent_destroy lives in the configuration; with the block gone, the plan proposes destroying the resource still in state. It is not saved in state, removing a block destroys rather than forgets (that needs a removed block or state rm), and Terraform asks no questions in plan.'),
    ],
  },

  /* ── IV_CICD ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_IV_DEVOPS_IV_CICD',
    notes: `"Tell me about a pipeline you built" opens most CI/CD rounds, and every follow-up after it is a test of one idea:
can this person be trusted with the path to production? The CI/CD topic's interview unit covered the
pipeline walk-through, OIDC without stored keys, blue-green versus canary with expand-and-contract migrations,
and GitOps with Argo CD. The panel's next questions are about artefacts, secrets, the pipeline as an attack
surface, rollback when it is real, flaky tests and measuring delivery. Workflow snippets below were parsed with
PyYAML — which, by the way, caught a real mistake in the first draft: run: echo "Checking: $TITLE" is invalid
YAML, because a colon followed by a space inside a plain value starts a mapping. A block (run: |) fixes it.

## Q1. "Why build once and promote? What is wrong with deploying :latest?"

**Testing:** whether you know what an artefact is and why it must be immutable.

**Model answer.** "The image that passed tests in staging must be the exact bytes that reach production. If each
environment rebuilds from source, a dependency can resolve differently, a base image can move, and what you tested
is not what you ship. So CI builds once, tags the image with the commit SHA, pushes it to ECR with tag immutability
on, and records the digest — sha256:... — which identifies the content. Every later stage deploys that digest.
:latest is a moving pointer: two nodes can pull different images under the same name, a rollback to 'latest' is
meaningless, and nobody can say what is running."

**Follow-up:** "How do you know exactly what is running in production right now?" — "The deploy record the pipeline
writes — service, digest, commit, who approved, when — and the platform itself: the ECS task definition's image,
or kubectl get deploy api -o jsonpath='{.spec.template.spec.containers[0].image}' showing a digest, not a tag. If
those two disagree, someone deployed outside the pipeline."

## Q2. "How do you handle secrets in a pipeline?"

**Testing:** whether you know the ways they leak.

**Model answer.** "Cloud access needs no stored secret — OIDC federation, as we covered in the CI/CD topic. Other
secrets — a third-party API key, a signing key — live in the CI system's secret store, scoped to a GitHub
environment such as production so only jobs for that environment, after its approval, can read them. Application
secrets do not go through the pipeline at all; the app reads them from Secrets Manager at runtime. In the
workflow, secrets go into env for the one step that needs them, never into command-line arguments, and never
with set -x on."

**Follow-up:** "A secret appeared in a build log. What now?" — "Rotate it first — the log may have been read or
copied already, and deleting it does not undo that. Then delete the log run, find how it leaked — masking only
works on the exact value, so a base64-encoded or split copy prints in clear — and fix that step. Then check the
provider's access logs for use of the old value."

## Q3. "How can a pull-request title run code in your pipeline?"

**Testing:** whether you see the pipeline as an attack surface — the supply-chain lesson.

**Model answer.** "Expressions such as \${{ github.event.pull_request.title }} are pasted into the script before the
shell runs it. This step is injectable:"

    - run: |
        echo "Checking \${{ github.event.pull_request.title }}"

"A title like a"; whoami; echo " turns the script into echo "Checking a"; whoami; echo "" — three commands, and
whoami really runs (tried in bash: it printed the user name). Any command would run the same way, with whatever
token and secrets that job has. The fix is to pass untrusted input as an environment variable, which the shell treats as data:"

    - name: Show the PR title safely
      env:
        TITLE: \${{ github.event.pull_request.title }}
      run: |
        echo "Checking: $TITLE"

"Add permissions: contents: read at the top so GITHUB_TOKEN is read-only by default, and never use
pull_request_target to check out and build a fork's code — that trigger runs with the base repository's secrets."

**Follow-up:** "What about third-party actions?" — "Pin them to a full commit SHA, not a tag, because a tag can be
moved. In March 2025 the tags of the popular tj-actions/changed-files action were repointed to a malicious commit
that printed CI secrets into build logs; repositories pinned to a SHA were not affected. Dependabot can keep
SHA pins up to date."

## Q4. "A bad release is found twenty minutes after deploy. How do you roll back — really?"

**Testing:** whether rollback is a practised path or a hope.

**Model answer.** "Rollback is a deploy of the previous digest through the same pipeline — fast because nothing is
built. On ECS that is the previous task definition revision, and the deployment circuit breaker with rollback, or
CloudWatch alarms on the deployment, can do it automatically. On Kubernetes, kubectl rollout undo works, but with
GitOps the rollback is a git revert of the image bump, or Argo CD undoes my manual change. If the feature is
behind a flag, turning the flag off is faster still. Rollback is only safe if the database schema still works
with the old code — which is why migrations are expand-and-contract."

**Follow-up:** "When would you roll forward instead?" — "When rolling back is unsafe — the new version already
wrote data the old one cannot read — or when the fix is one line, understood and faster through the pipeline than
the rollback. The default under pressure is still: mitigate first, then fix."

## Q5. "Tests fail, someone clicks re-run, and they pass. What do you do?"

**Testing:** whether you protect the signal a pipeline gives.

**Model answer.** "A flaky test is worse than no test: people learn to re-run until green, and then a real failure
gets re-run too. I would track flaky tests — the CI system or a simple report of tests that failed and then
passed on the same commit — quarantine the worst into a non-blocking job with an owner and a date, and fix the
cause: usually shared state between tests, time and time zones, ordering, or a real network call that should be
mocked. I would not add automatic retries across the whole suite; that hides the problem."

**Follow-up:** "What would you make required before merging to main?" — "Branch protection with required status
checks — lint, unit tests, the build, dependency and secret scanning, and the Terraform plan where relevant — at
least one reviewer who is not the author, and a merge queue on busy repositories so each change is tested against
the latest main, not a stale base."

## Q6. "How do you know your delivery is getting better?"

**Testing:** the DORA measures and whether you can collect them honestly.

**Model answer.** "Four measures: deployment frequency, lead time for changes — commit to running in production,
change failure rate — the share of deployments that cause a failure needing a fix or rollback, and time to restore
service after such a failure. The pipeline produces most of them: the deploy record has the commit time and the
deploy time; rollbacks and hotfix deploys mark failures; incidents give restore time. I would look at trends per
team, not compare teams."

**Follow-up:** "Can they be gamed?" — "Easily: split deploys to raise frequency, not count a rollback as a failure.
So they are for a team to improve itself, never a target with a bonus attached."

## How you are judged

Strong answers name the control and the failure it prevents — digests against drift, OIDC against stored keys,
env variables against injection, SHA pins against moved tags, expand-and-contract against unsafe rollback. Weak
answers list tools.`,
    workedExample: `**Question: "Our pipeline deployed to production, every step was green, and the site was broken for forty minutes
before a customer told us. What was missing from the pipeline?"**

**A weak answer:**

"More tests. I would increase unit test coverage to 90%."

What the panel hears: unit tests run before the deploy, so they cannot tell you that the deploy itself broke
production; and coverage measures lines executed, not behaviour.

**A strong answer:**

"'Green' only meant each step's command exited zero. Three things were missing.

**1. The deploy step did not wait for the rollout.** aws ecs update-service returns as soon as the request is
accepted; kubectl apply returns when the object is stored. The step must wait — aws ecs wait services-stable or
kubectl rollout status with a timeout — so a rollout that never becomes healthy fails the pipeline.

**2. No verification after the deploy.** A smoke test against the real production URL: the health endpoint, then
two or three critical journeys — log in, search, add to cart for Kiranakart — with a test account. If it fails, the
pipeline rolls back to the previous digest automatically.

**3. No automatic rollback on metrics.** ECS's deployment circuit breaker with rollback catches tasks that never
become healthy; CloudWatch alarms attached to the deployment — 5xx rate on the target group, p99 latency — catch a
release that is healthy but wrong. On Kubernetes, a canary with analysis does the same job.

And outside the pipeline: an SLO burn-rate alert would have paged us in minutes, not left it to a customer. I would
write it up as a blameless postmortem with these as owned actions."

**Why it scores:** it separates 'the command succeeded' from 'the service works', adds checks at the right stage,
makes rollback automatic, and connects the pipeline to monitoring.`,
    mcqs: [
      mcq('Staging and production each run docker build from the same Git tag. A release passes staging and fails in production with a library error. What is the most likely cause?', [
        ['The two builds resolved dependencies differently, so the images differ', true],
        ['Production needs a higher memory limit than staging for the same image', false],
        ['The Git tag moved between the two builds, so the code itself is different', false],
        ['Production pulled the image from a different region’s ECR repository', false],
      ], 'Rebuilding per environment lets unpinned dependencies or a moved base image change between builds, which is why you build once and promote a digest. Memory limits cause OOM kills, not library errors; a moved tag is possible but rare; and replicated images have the same digest.'),
      mcq('A workflow step runs echo "Release ${{ github.event.pull_request.title }}". Why does a security review flag it?', [
        ['The title is pasted into the script, so a crafted title runs as shell', true],
        ['Pull-request titles may contain Unicode, which breaks the runner shell', false],
        ['GitHub logs the title in clear, which leaks the repository’s secrets', false],
        ['The expression is evaluated after the step, so the title prints empty', false],
      ], 'Expressions are substituted into the script text before the shell runs, so attacker-controlled text becomes code. Passing it through env makes it data. Unicode is harmless, a title is not a secret, and the expression is evaluated before the step, not after.'),
      mcq('A release corrupts nothing but has a bad bug. The database migration in it added a column and a backfill. Which rollback plan is safe?', [
        ['Redeploy the previous digest; the old code ignores the added column', true],
        ['Restore last night’s database snapshot, then redeploy the old code', false],
        ['Drop the new column first so the old code sees the schema it expects', false],
        ['Wait for the next release, since a schema change means no rollback', false],
      ], 'An additive, expand-style change is backward compatible, so the previous version runs against the new schema. Restoring a snapshot loses every order since, dropping the column destroys the backfill, and waiting leaves users on the bug.'),
    ],
    checkpoint: [
      ck('CI_CD', 'After a deploy, nobody can say which build is running: the Deployment’s image is shop-api:latest on every environment. What should the pipeline change?', [
        ['Deploy the immutable digest built once in CI and record it per release', true],
        ['Tag each image with the environment name, such as shop-api:prod', false],
        ['Set imagePullPolicy to Always so every Pod pulls the newest latest', false],
        ['Rebuild the image during each deploy so the tag always matches main', false],
      ], 'A digest names exact content and stays the same from staging to production, so what is running is knowable and rollback is precise. An environment tag still moves, Always pulls whatever latest is now, and rebuilding per deploy defeats build-once.'),
      ck('CI_CD', 'A workflow uses a popular third-party action as some-org/lint-action@v3. Which change best protects the pipeline if that tag is later moved to malicious code?', [
        ['Pin the action to a full commit SHA and update it through reviewed PRs', true],
        ['Pin it to @v3.1 instead, since a minor version tag can never be moved', false],
        ['Run the action only on the main branch so pull requests cannot reach it', false],
        ['Add a step after it that deletes the workspace when the job completes', false],
      ], 'A commit SHA cannot be repointed, so the code you reviewed is the code that runs. Any tag, minor or major, can be moved by whoever controls the repository; restricting branches does not stop a poisoned action running on main; cleaning up afterwards is too late.'),
      ck('CI_CD', 'A team reports deployment frequency rising from 4 to 40 a week after splitting each release into ten tiny deploys, with no change to lead time or failures. What should you conclude?', [
        ['The measure was gamed; look at lead time and failure rate together', true],
        ['Delivery is ten times better, since frequency is the key DORA metric', false],
        ['Change failure rate will drop, since smaller deploys always fail less', false],
        ['The pipeline is overloaded and should be limited to four deploys a week', false],
      ], 'DORA measures are read together; frequency alone rose without faster delivery or fewer failures, so nothing improved. No single metric is the key one, smaller deploys tend to fail less but not automatically, and capping deploys is the wrong lesson.'),
    ],
  },

  /* ── IV_SRE ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_IV_DEVOPS_IV_SRE',
    notes: `SRE and monitoring questions decide more DevOps offers than freshers expect, because a team hiring for on-call is
asking one thing: will this person make incidents shorter or longer? The observability topic's interview unit
already asked logs versus metrics versus traces, SLOs for a payments API with burn-rate alerts, the 2am page and
resilience to a flaky dependency. The panel's next questions go to the signals themselves, the error budget as a
working agreement, alert fatigue, the people side of an incident and the postmortem. The numbers below were
computed in Python and the Prometheus output came from the prometheus_client library; the PromQL is written from
the documentation and was not run against a server.

## Q1. "What are the four golden signals? And why is average latency a bad number?"

**Testing:** whether you monitor what users feel.

**Model answer.** "Latency, traffic, errors and saturation, from Google's SRE book. For a request-driven service I
use RED — rate, errors, duration — per route; for resources such as disks, queues and connection pools, USE —
utilisation, saturation, errors. Latency I measure as percentiles, because an average hides the slow tail." A
thousand requests, 985 at 80 ms and 15 at 3 seconds, computed in Python:

    mean 124 ms  p50 80 ms  p95 80 ms  p99 3000 ms

"The mean looks healthy, yet 1 user in 67 waits three seconds — and on a payments page that user retries or
leaves. Prometheus records latency as a histogram of cumulative buckets," and for the same thousand requests:

    http_request_duration_seconds_bucket{le="0.5",route="/v1/payments"} 985.0
    http_request_duration_seconds_bucket{le="+Inf",route="/v1/payments"} 1000.0
    http_request_duration_seconds_count{route="/v1/payments"} 1000.0
    http_request_duration_seconds_sum{route="/v1/payments"} 123.79999999999868

"985 of 1,000 under 0.5 s is 98.5%, so a '99% under 0.5 s' SLI is missed even though the mean is 124 ms."

**Follow-up:** "We run twenty Pods. Can you average their p99s?" — "No — percentiles do not average. Aggregate the
buckets first, then take the quantile:"

    histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket{route="/v1/payments"}[5m])))

## Q2. "SLI, SLO, SLA — and what is the error budget at 99.95%?"

**Testing:** precise vocabulary and arithmetic you can do aloud.

**Model answer.** "The SLI is the measurement — good events over valid events. The SLO is our internal target for
it over a window. The SLA is the contract with customers, with credits if it is missed, and it is set looser than
the SLO so we are warned before we owe anyone. At 99.95% over 30 days the budget is 0.05% — 21.6 minutes of full
outage, or for 60 million requests a month, 30,000 failed requests." Computed:

    SLO 99.95% over 30 days -> 21.6 min
    request budget at 99.95% of 60M: 30000
    error ratio 0.5% at 99.95% -> burn 10x, budget gone in 72 h

**Follow-up:** "The budget is gone on day 12. What happens?" — "Whatever the error budget policy, agreed with product
in advance, says. Typically feature releases pause, except security fixes and reliability work, until the rolling
window recovers, and the postmortem actions for the incidents that spent it go first. Without that written
policy, the budget is just a number on a dashboard."

## Q3. "Our on-call gets forty pages a week and ignores most of them. Fix it."

**Testing:** alert design and judgement.

**Model answer.** "First, data: export a month of pages and mark each one — did someone have to act, and was it
urgent? Then three rules. A page must need a human now; anything that can wait becomes a ticket, and anything
nobody acts on is deleted. Page on symptoms users feel — SLO burn rate — rather than on causes like CPU at 80%,
which is often fine. And group related alerts in Alertmanager, so one database failure is one page, not thirty.
Every remaining page links a runbook. I would review pages weekly with the team and track pages per shift."

**Follow-up:** "Then how do you catch a disk filling up before it is full?" — "Alert on when it will be full, not on
a percentage: predict_linear(node_filesystem_avail_bytes{mountpoint="/data"}[6h], 4 * 3600) < 0 says it will
run out within four hours at the current rate — a page; a slower trend is a ticket. A static 90% fires on a big
disk that is fine for months and misses a small one filling fast."

## Q4. "What are the roles in an incident, and why should the incident commander not debug?"

**Testing:** whether you have seen an incident run well or badly.

**Model answer.** "The incident commander owns the incident — priorities, who does what, decisions like 'roll back
now'. The operations lead investigates and changes systems. The communications lead posts updates to the business
and the status page on a fixed cadence. A scribe keeps the timeline. If the IC is reading logs, nobody is watching
the clock, nobody notices that two people are changing the same system, and updates stop. On a small team one
person can hold two roles, but says so aloud."

**Follow-up:** "When do you declare an incident?" — "When users are affected or likely to be, by the severity table —
and when in doubt, declare and downgrade later. Declaring is cheap; declaring forty minutes late is not."

## Q5. "Tell me what makes a postmortem useful."

**Testing:** blameless culture, and actions that actually get done.

**Model answer.** "It asks how the system allowed the failure, not who caused it. 'Human error' is never a root
cause — the question is why the mistake was easy and why nothing caught it. A good one has impact in user terms
and error budget, a timeline including when we detected and each decision, several contributing factors rather than
one root cause, what went well and where we got lucky, and a few action items, each with an owner, a priority, a
due date and a ticket."

**Follow-up:** "How do you make sure the actions are done?" — "Fewer of them — three real ones beat twelve vague ones
like 'improve monitoring'. Track them in the team's normal backlog, review open postmortem actions in a weekly
meeting, and when the error budget is spent, they go before features."

## Q6. "Counter, gauge or histogram — and why do we always wrap a counter in rate()?"

**Testing:** whether you have written PromQL, not just read dashboards.

**Model answer.** "A counter only goes up — requests, errors, bytes sent — and resets to zero when the process
restarts. A gauge goes up and down — queue depth, memory in use, temperature. A histogram counts observations into
buckets, plus a sum and a count, so you can compute percentiles and averages over any window. A raw counter's
value depends on when the process started, so it is useless on its own; rate(http_requests_total[5m]) gives
per-second increase, and rate handles the reset when a Pod restarts."

**Follow-up:** "Why rate over five minutes and not one?" — "The range must hold several scrapes. With a 30-second
scrape interval, a one-minute window has two samples, and a missed scrape leaves nothing; four times the scrape
interval is the usual minimum."

## How you are judged

Strong answers start from users, put numbers on the board and know what happens after the alert — people, roles
and actions. Weak answers list tools: "we use Grafana" answers none of these questions.`,
    workedExample: `**Question: "You join our team as a junior SRE. We have two hundred alerts, no SLOs and an unhappy on-call
rotation. What do you do in your first month?"**

**A weak answer:**

"I would set up Grafana dashboards for everything and add alerts for CPU, memory and disk on every server."

What the panel hears: more alerts on causes, which is how the team got two hundred.

**A strong answer:**

"Week one, I listen and measure. I join the on-call rotation as a shadow, read the last few postmortems, and export
a month of pages: which alerts fired, how often, and whether anyone acted. That list usually shows a handful of
alerts causing most of the noise.

Week two, I pick the one or two most important user journeys — for a fintech, making a payment and seeing it
settle — and propose SLIs for them from the load balancer's data: availability and latency, good over valid.
I suggest SLOs slightly below what the service achieves today, and take them to the product owner, because an SLO
without an error budget policy agreed with product is decoration.

Week three, I add multiwindow burn-rate alerts for those SLOs, and with the team's agreement I turn the noisiest
cause-based alerts into tickets or delete them. Each page that remains gets a runbook link.

Week four, I compare: pages per shift before and after, and whether any real incident was caught later than it
would have been. I write it up and ask the team what to do next.

What I would not do is delete alerts on my own in week one. I do not yet know which of them caught the last real
outage."

**Why it scores:** it is ordered, measured and collaborative, starts from user journeys, ties SLOs to a policy with
product, and shows the humility a new joiner needs.`,
    mcqs: [
      mcq('A service’s mean latency is 120 ms, but customers complain about slow payments. Which number should you look at first?', [
        ['The p99 latency from the histogram, which shows the slow tail', true],
        ['The median latency, since half of the users get that value', false],
        ['The maximum latency, since it shows the worst single request', false],
        ['The request rate, since slowness always follows high traffic', false],
      ], 'A mean hides a small share of very slow requests, which is what complaints describe; a high percentile from the histogram exposes it. The median hides the tail too, a single maximum is noise, and slowness does not always follow traffic.'),
      mcq('An alert fires whenever any server’s CPU is above 80%, and on-call ignores it twelve times a week. What is the strongest fix?', [
        ['Replace it with SLO burn-rate pages and keep CPU on a dashboard', true],
        ['Raise the threshold to 95% so that it fires less often each week', false],
        ['Send it to the whole team so that somebody always acknowledges it', false],
        ['Add a second CPU alert at 90% so the urgent cases stand out from it', false],
      ], 'High CPU is a cause that is often harmless; paging on symptoms users feel removes the noise without losing real problems. A higher threshold still pages on harmless spikes, wider paging spreads fatigue, and a second alert adds noise.'),
      mcq('In the middle of an incident, the incident commander starts reading database logs because they know the system best. What is the risk?', [
        ['Nobody coordinates or decides, and updates and timekeeping stop', true],
        ['The logs may be changed by the IC, which spoils them as evidence', false],
        ['The database team will lose ownership of the incident afterwards', false],
        ['Reading logs during an incident breaks the blameless principle', false],
      ], 'The IC’s job is to steer — priorities, assignments, decisions and communication; deep in logs, nobody is doing it. Reading logs does not alter them, ownership is not the issue, and blamelessness concerns the postmortem, not who reads logs.'),
    ],
    checkpoint: [
      ck('OBSERVABILITY', 'Each of 20 Pods reports its own p99 latency. A dashboard shows the average of the 20 values as the service’s p99. What is wrong?', [
        ['Percentiles cannot be averaged; aggregate the buckets, then compute', true],
        ['The dashboard should show the maximum of the 20 values as the p99', false],
        ['The p99 should be replaced by the p50 for services with many Pods', false],
        ['The average is correct only when every Pod gets an equal share of traffic', false],
      ], 'A percentile of the whole needs the whole distribution, so sum the histogram buckets across Pods and then take histogram_quantile. The maximum overstates it, the median hides the tail, and even equal traffic does not make averaged percentiles correct.'),
      ck('OBSERVABILITY', 'A service has a 99.9% availability SLO over 30 days and serves 50 million requests in that window. How many failed requests does the error budget allow?', [
        ['50,000', true],
        ['5,000', false],
        ['500,000', false],
        ['43,200', false],
      ], 'The budget is 0.1% of valid requests: 50,000,000 × 0.001 = 50,000. 5,000 would be 99.99%, 500,000 would be 99%, and 43.2 is the number of minutes in a 30-day 99.9% budget, not a request count.'),
      ck('OBSERVABILITY', 'A postmortem lists the root cause as “engineer ran the wrong command in production”. What should the reviewer ask for?', [
        ['Why the command was easy to run wrongly and why nothing caught it', true],
        ['The engineer’s name, so the team can arrange extra training for them', false],
        ['A rule that only senior engineers may run commands in production', false],
        ['Nothing more, since the root cause has been found and is clear enough', false],
      ], 'Blameless review treats human error as a symptom: the system allowed it — no guard, no review, a confusing tool. Naming and retraining one person, or restricting by seniority, leaves the trap in place for the next person.'),
    ],
  },

  /* ── RAPID_FIRE ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_IV_DEVOPS_RAPID_FIRE',
    notes: `A screening call for a DevOps, SRE or platform role — often a recruiter with a list, or an engineer giving you
fifteen minutes before deciding on a full round. Thirty questions, one correct line each, at speaking pace. Cover
the answer, say yours aloud, then check. If you need more than ten seconds, go back to that question set.

## Linux and networking

1. **List listening TCP ports with their process?** — ss -tlnp.
2. **Exit code 137?** — 128 + 9: killed by SIGKILL, very often the OOM killer.
3. **chmod 640?** — Owner read-write, group read, others nothing.
4. **Where is a systemd service's log?** — In the journal: journalctl -u name.
5. **Ports 22, 53, 443?** — SSH, DNS, HTTPS.
6. **Refused versus timed out?** — Refused: reached a host, nothing listening. Timed out: packets dropped on the way.

## Docker and Kubernetes

7. **ENTRYPOINT versus CMD?** — ENTRYPOINT is the executable; CMD supplies default arguments that docker run can override.
8. **A Pod stuck in Pending?** — Not scheduled yet: describe shows why — resources, taints, affinity, volumes.
9. **ImagePullBackOff?** — The node cannot pull the image: wrong name or tag, or no access to the registry.
10. **Service types?** — ClusterIP, NodePort, LoadBalancer (and ExternalName).
11. **Is a Secret encrypted?** — Only base64-encoded; encryption at rest needs etcd encryption or KMS (EKS can use KMS).
12. **Logs of the container that just crashed?** — kubectl logs --previous.

## Terraform

13. **What does init do?** — Downloads providers and modules and configures the backend.
14. **validate versus plan?** — validate checks the configuration without calling the cloud; plan compares with real state.
15. **State locking on the S3 backend today?** — use_lockfile writes a .tflock object; the DynamoDB table is deprecated.
16. **Data source versus resource?** — A data source reads something that exists; a resource is managed by Terraform.
17. **Bring a console-made bucket under Terraform?** — An import block, then plan until it is empty.
18. **version = "~> 6.0" allows?** — Any 6.x release, never 7.0.

## CI/CD

19. **Continuous delivery versus deployment?** — Delivery: every change is releasable, a person approves. Deployment: every passing change goes out automatically.
20. **What is promoted between environments?** — The same artefact, identified by its digest.
21. **Why OIDC from CI to AWS?** — Short-lived credentials per job; no stored access keys.
22. **Blue-green rollback?** — Switch traffic back to the old colour.
23. **Canary?** — A small share of traffic to the new version, compared against the stable one before widening.
24. **GitOps in one line?** — Git holds the desired state; an agent in the cluster pulls and reconciles it.

## Monitoring and SRE

25. **Golden signals?** — Latency, traffic, errors, saturation.
26. **99.9% over 30 days, in minutes?** — 43.2.
27. **MTTR?** — Mean time to restore service.
28. **Burn rate of 1?** — Spends exactly the whole budget over the window.
29. **Counter versus gauge?** — A counter only rises (and resets on restart); a gauge goes up and down.
30. **Blameless postmortem?** — Asks how the system allowed it, not who did it.

## Two questions you may also get

- **"Which certifications are you doing?"** — Answer with what you have and why. The CKA proves hands-on
  Kubernetes under a timer; HashiCorp's Terraform Associate and an AWS associate-level certification are what
  DevOps job descriptions in India mention most. A certification gets you past a filter; the repository you can
  walk through gets you the job. The Cloud Candidate topic plans the order.
- **"Are you comfortable with on-call?"** — Answer honestly and specifically. Most DevOps and SRE roles have a
  rotation after a few months; say what you can commit to.

## Scoring

26+ correct and quick: strong. 20–25: go back to the sets your misses came from. Below 20, or "chmod 777" for a
permission error, or "restart it" as a first step: redo the question sets before the next screening call.`,
    mcqs: [
      mcq('Rapid fire: “Which command shows the output of a Pod’s previous, crashed container?”', [
        ['kubectl logs --previous', true],
        ['kubectl describe pod --logs', false],
        ['kubectl get events --previous', false],
        ['kubectl logs --tail=crashed', false],
      ], 'kubectl logs --previous (or -p) prints the last terminated instance of the container, which is where a crash’s output is. describe has no --logs flag, get events has no --previous, and --tail takes a line count.'),
      mcq('Rapid fire: “What does version = "~> 6.0" allow for a Terraform provider?”', [
        ['Any 6.x release, but not 7.0', true],
        ['Only 6.0.x patch releases', false],
        ['6.0 or any later major release', false],
        ['Exactly 6.0.0 and nothing else', false],
      ], 'The pessimistic operator lets the rightmost given part rise: ~> 6.0 means at least 6.0 and below 7.0. ~> 6.0.0 would allow only patches, >= 6.0 would allow later majors, and = 6.0.0 pins one release.'),
      mcq('Rapid fire: “A 99.9% SLO over 30 days allows how much full downtime?”', [
        ['43.2 minutes', true],
        ['4.3 minutes', false],
        ['432 minutes', false],
        ['86.4 minutes', false],
      ], '0.1% of 30 × 24 × 60 = 43,200 minutes is 43.2 minutes. 4.3 is the 99.99% figure, 432 the 99% figure, and 86.4 would be 0.2%.'),
      mcq('Rapid fire: “What does ImagePullBackOff tell you?”', [
        ['The node cannot get the image: a wrong name, tag or registry access', true],
        ['The container started and then exited with a non-zero error code', false],
        ['The scheduler found no node with enough free memory for the Pod', false],
        ['The readiness probe failed, so the Pod was taken out of service', false],
      ], 'ImagePullBackOff means pulls are failing and the kubelet is backing off between attempts — check the image reference and registry permissions. A crashing container shows CrashLoopBackOff, no capacity shows Pending, and a failed readiness probe shows not Ready.'),
      mcq('Rapid fire: “Continuous delivery or continuous deployment — what is the difference?”', [
        ['Delivery keeps changes releasable; deployment ships each automatically', true],
        ['Delivery is for applications; deployment is only for infrastructure code', false],
        ['Delivery builds the artefact; deployment runs the unit tests on it', false],
        ['They are two names for the same practice, used by different vendors', false],
      ], 'In continuous delivery every change is releasable and a person decides when; in continuous deployment every change that passes goes to production with no manual step. Neither is tied to a kind of code, tests belong to both, and they are distinct practices.'),
    ],
  },

  /* ── MOCK ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_IV_DEVOPS_MOCK',
    notes: `The interviewer's script for a 45-minute technical round for a fresher DevOps or SRE role — at a product company
in Bengaluru, a GCC in Hyderabad, or the cloud practice of an IT services firm in Pune. Have a friend read the
interviewer's lines, or record yourself and score it against the notes. The panel writes down the words in bold.

## Opening (3 min)

"Tell me about one project where you deployed something, in two minutes."

- **Strong:** what it runs and where (a small API on ECS or EKS, say), **how it gets there** (the pipeline, the
  Terraform), **one thing that broke and how you found it**, and what it costs and how you tear it down.
- **Weak:** a list of tools — "Docker, Kubernetes, Terraform, Jenkins, Prometheus" — with no decisions.

## Q1 — Linux (7 min)

"Users get a timeout on our API. The EC2 instance is running and the app's systemd service is active. Go."

- **Strong:** inside out — **journalctl** for the app's own errors, **ss -tlnp** for the address it listens on,
  **curl localhost**; then outwards. **A timeout means dropped packets**, so the **security group, NACL and
  routes** before the app; and the **target group health** if it is behind a load balancer.
- **Weak:** "Restart the instance."

Follow-up: "ss shows it on 127.0.0.1:8000." — It would then be refused rather than time out from the load
balancer's side, so there may be two faults; fix the bind to 0.0.0.0, then check the path again.

## Q2 — Kubernetes (10 min)

"A new Deployment's Pods are all Pending. kubectl describe shows: 0/3 nodes are available: 3 Insufficient memory."

- **Strong:** the scheduler adds up **requests, not usage**; compare the Pod's memory request with what each node
  has **allocatable minus already requested** (kubectl describe node). Either the request is too large — a typo such
  as 16Gi for 1.6Gi, or copied from another service — or the cluster needs nodes; with **Karpenter or the Cluster
  Autoscaler** check why it did not add one (limits, instance types, the node group's max size).
- **OK:** "Add a node", with no look at the request.
- **Weak:** "Delete the Pods so they get rescheduled."

Follow-up: "The request is right and we need more capacity, but the budget is fixed." — Rightsize other workloads
from **measured usage**, find idle Pods, consider Spot for stateless workers, and say it is a cost conversation
with the owner, not a quiet change.

## Q3 — Terraform (8 min)

The interviewer shows a PR's plan summary: "Plan: 1 to add, 0 to change, 1 to destroy." The resource is the
production RDS instance; the diff marks **storage_encrypted** as forcing replacement.

- **Strong:** **do not merge**. Replacement means a new, empty database; encryption cannot be turned on in place.
  The safe path is a **snapshot, an encrypted copy, a restore and a cut-over** in a planned window, with the old
  instance kept until verified. Asks whether **prevent_destroy and deletion_protection** were set — they should
  have made this plan fail.
- **Weak:** "Apply it in the night when traffic is low."

## Q4 — CI/CD (8 min)

"Design the pipeline for this API, from pull request to production on AWS. Where do the credentials live?"

- **Strong:** PR checks (lint, tests, scanning) as **required checks**; on merge, **build once, push by digest**;
  deploy staging automatically, smoke test, **approval through a GitHub environment**, production with a canary or
  the circuit breaker and **automatic rollback**; **OIDC roles** per stage with an exact sub, **no stored keys**;
  application secrets read at runtime from Secrets Manager.
- **Weak:** "Store the AWS keys as GitHub secrets and run deploy.sh."

Follow-up: "A PR from a fork needs to run tests. Anything to watch?" — **No secrets for fork PRs**, read-only token,
**never pull_request_target with the fork's code**, untrusted input through env.

## Q5 — SRE (7 min)

"It is 2:10 a.m. You get paged: checkout error rate burning budget at 14x. The deploy log shows a release at 1:55.
What do you do in the first ten minutes, and what do you write the next day?"

- **Strong:** acknowledge; check the impact on the SLO dashboard; **declare and take IC** if nobody else is there;
  the **release at 1:55 is the prime suspect — roll back first**, watch the burn rate fall; post an update with
  impact, action and next update time; next day a **blameless postmortem** with timeline, contributing factors —
  including **why the canary or post-deploy checks did not catch it** — and owned actions.
- **Weak:** "Read the code of the release to find the bug before changing anything."

## Close (2 min)

"What would you improve in your project if you had another week?" — **Strong:** one specific gap — no alerting, a
manual step, no teardown script — and how you would know the fix worked.

## Scoring rubric

| Area | Strong (3) | OK (2) | Weak (1) |
|---|---|---|---|
| Linux | Layered, refused versus timeout | Right commands, no order | Restart |
| Kubernetes | Requests versus allocatable, autoscaler | Add a node | Delete Pods |
| Terraform | Stops; snapshot-restore plan; guards | Senses risk, no plan | Apply at night |
| CI/CD | Digest, approvals, OIDC, rollback | Stages only | Stored keys |
| SRE | Roll back first, comms, blameless | Fixes, no comms | Debug first |

Hire bar for a fresher: 11 or more out of 15, with no 1 in Terraform or SRE. One destructive instinct —
applying a plan that replaces a production database, or debugging while the budget burns — costs more than an
honest "I have not done that; here is how I would find out".`,
    mcqs: [
      mcq('In the mock’s Q2, Pods are Pending with “3 Insufficient memory”, yet the nodes show plenty of free memory in their usage graphs. Why can the scheduler still refuse?', [
        ['It places Pods by the memory already requested on each node, not usage', true],
        ['Usage graphs include the page cache, which the scheduler cannot touch', false],
        ['The nodes reserve half their memory for system daemons by default', false],
        ['Pending Pods are placed only after the HPA has finished scaling down', false],
      ], 'Scheduling is bookkeeping on requests against allocatable capacity; a node can be idle in practice and full on paper. Page cache is not what the scheduler counts, system reservations are set per cluster rather than half, and the HPA does not gate scheduling.'),
      mcq('In the mock’s Q3, why is “apply it at night when traffic is low” a failing answer?', [
        ['Replacing the instance creates a new, empty database at any hour', true],
        ['Terraform cannot run outside office hours without a special flag', false],
        ['RDS blocks every change between midnight and six in the morning', false],
        ['The plan will expire before night and need approving all over again', false],
      ], 'The harm is the replacement itself — the data is not carried over — so timing does not help; the fix is a snapshot, an encrypted copy and a restore. Terraform has no time-of-day rule, RDS maintenance windows do not block changes like that, and plans do not expire on a timer.'),
      mcq('In the mock’s Q5, the release went out at 1:55 and the page came at 2:10. What should happen before anyone reads the release’s code?', [
        ['Roll the release back and confirm the burn rate falls', true],
        ['Silence the alert until the morning stand-up meeting', false],
        ['Restart every checkout Pod to clear any stuck state', false],
        ['Open a ticket for the team that owns the release code', false],
      ], 'A change just before the symptom is the most likely cause, and rolling back is the fastest safe mitigation; diagnosis can follow. Silencing hides an outage, restarting keeps the bad release, and a ticket leaves customers failing until morning.'),
    ],
  },

  /* ── CHECKPOINT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_IV_DEVOPS_CHECKPOINT',
    notes: `Ten questions across the DevOps interview sets: Linux and networking, Docker and Kubernetes, Terraform, CI/CD,
and monitoring and SRE. Each is asked the way a panel asks it. Read the output or numbers in the question before
you choose.`,
    checkpoint: [
      ck('LINUX_ADMIN', 'A Java service on an 8 GB VM was killed overnight. Which place most directly confirms whether the kernel’s OOM killer did it?', [
        ['The kernel log, through journalctl -k or dmesg, for “Out of memory”', true],
        ['The output of free -h this morning, looking at the free column', false],
        ['The application’s own log, for the last line written before it died', false],
        ['The output of df -h, since a full disk is what stops a JVM at night', false],
      ], 'The OOM killer writes its decision, with the victim’s PID and memory, to the kernel log. free shows memory now, not last night; the app cannot log its own SIGKILL; and a full disk is a different failure.'),
      ck('LINUX_ADMIN', 'nc -vz db.internal 5432 from the app server prints “Connection refused”. What does that rule out?', [
        ['A security group silently dropping the traffic on the way there', true],
        ['The database process being stopped or listening on another port', false],
        ['A firewall on the database host rejecting the connection outright', false],
        ['The database host being reachable over the network at this moment', false],
      ], 'A refusal is an active reset from the destination, so packets got there; a security group drops silently and would give a timeout. A stopped database, a different port, or a host firewall set to reject all produce exactly this refusal, and reachability is confirmed rather than ruled out.'),
      ck('KUBERNETES', 'A Pod shows Last State: Terminated, Reason: OOMKilled, Exit Code: 137, and the container has a 512Mi memory limit. What is the right first step?', [
        ['Measure the container’s real peak memory and size the limit from it', true],
        ['Remove the CPU limit, since throttling makes memory use grow over time', false],
        ['Increase the liveness probe delay so the container has time to settle', false],
        ['Add replicas, since more Pods always lower the memory each one needs', false],
      ], 'OOMKilled at the limit means the container needed more than 512Mi, or leaks; measure usage before changing the limit. CPU limits do not cause memory growth, probes cannot stop an OOM kill, and replicas help only if memory scales with per-Pod load.'),
      ck('KUBERNETES', 'A Dockerfile ends with RUN rm -rf /root/.cache after an earlier RUN pip install wrote 400 MB there. Why is the image no smaller?', [
        ['The files remain in the earlier layer; deleting them later only hides them', true],
        ['rm cannot delete files inside a build, so the cache directory is left as is', false],
        ['Docker compresses the cache, so it was never 400 MB in the image itself', false],
        ['The cache lives on the build host, so it never entered the image at all', false],
      ], 'Layers are additive: a later layer can mark files deleted but the earlier layer still ships them. Clean up in the same RUN, or use pip’s --no-cache-dir or a multi-stage build. rm works fine in a build, and the cache was written inside the image’s filesystem.'),
      ck('INFRA_AS_CODE', 'Two engineers’ plans for the same stack show different results, though both are on main. One has Terraform 1.13, the other 1.9, and neither lock file was committed. What fixes this?', [
        ['Commit .terraform.lock.hcl and set required_version in the configuration', true],
        ['Delete the state file so both engineers start again from the same point', false],
        ['Have each engineer run terraform refresh before every plan they make', false],
        ['Move the state to a workspace per engineer so their plans stop clashing', false],
      ], 'The lock file pins provider versions and hashes, and required_version pins Terraform itself, so everyone and CI plan with the same tools. Deleting state is destructive, refreshing does not align versions, and separate workspaces would split one environment into two.'),
      ck('INFRA_AS_CODE', 'A security group was created with count = var.enabled ? 1 : 0. A reviewer asks for it as for_each over a set instead. When is count still the better choice here?', [
        ['For a simple on-or-off switch of zero or one instance, as it is', true],
        ['Never, since count is deprecated in current Terraform versions', false],
        ['Whenever the resource is a security group or other network object', false],
        ['Only when the state is stored on local disk and not in S3', false],
      ], 'count is clear and safe for zero-or-one, because there is no index to shift; for_each is for collections whose members can change. count is not deprecated, the resource type does not matter, and the backend has no bearing on it.'),
      ck('CI_CD', 'A workflow triggered by pull_request_target checks out the pull request’s head commit and runs npm test. Why does a reviewer block it?', [
        ['Untrusted fork code runs with the base repository’s secrets and token', true],
        ['pull_request_target cannot check out code from another repository at all', false],
        ['npm test needs a full clone, which pull_request_target does not provide', false],
        ['The trigger runs only after merge, so the tests would come too late', false],
      ], 'pull_request_target runs in the base repository’s context with its secrets and a write-capable token, so running a fork’s code there hands those to the fork’s author. It can check out other refs, which is the danger; clone depth is unrelated; and it runs on the PR, not after merge.'),
      ck('CI_CD', 'The ECS deploy step returns success in 20 seconds, but the new tasks fail health checks and the old ones keep serving. What should the pipeline add?', [
        ['A wait for a stable service, with automatic rollback when it fails', true],
        ['A longer health check grace period so the new tasks always pass it', false],
        ['A second deploy step that runs only if the first one has timed out', false],
        ['A manual approval after the deploy so a person can watch the console', false],
      ], 'update-service returns when the request is accepted, not when the rollout is healthy; waiting for stability, with the circuit breaker’s rollback, makes the pipeline reflect reality. A longer grace period hides failures, a retry repeats the same release, and watching a console is not a check.'),
      ck('OBSERVABILITY', 'A disk alert fires at 85% used on a 2 TB volume that has grown 1% a month for a year. Which alert would serve on-call better?', [
        ['One on the predicted time to full, paging only if it is within hours', true],
        ['The same alert at 95%, so that it fires less often on this large volume', false],
        ['A page on any write error, since the percentage itself is meaningless', false],
        ['An alert on the volume’s IOPS, since busy disks are the ones that fill', false],
      ], 'A time-to-full prediction, such as predict_linear on available bytes, pages when exhaustion is near and leaves slow growth to a ticket. A higher threshold still ignores the rate, a write error means it is already too late, and IOPS measures load, not space.'),
      ck('OBSERVABILITY', 'During a SEV1, the communications lead posts “still investigating” every 30 minutes with no new findings. An engineer says this wastes time. Who is right?', [
        ['The lead: a fixed cadence keeps stakeholders informed and off the call', true],
        ['The engineer: updates should go out only when the cause has been found', false],
        ['The engineer: updates should come from the incident commander instead', false],
        ['Neither: updates belong in the postmortem after the incident is closed', false],
      ], 'Regular updates, even without news, stop the business from interrupting engineers and show the incident is in hand. Waiting for the cause leaves people guessing, the IC delegates communication precisely so they can steer, and a postmortem is far too late for stakeholders.'),
    ],
  },
];
