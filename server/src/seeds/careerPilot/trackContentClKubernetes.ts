/**
 * Career-track content: Containers and Kubernetes (CL_KUBERNETES), Cloud & DevOps Engineer, batch CL2.
 *
 * How a cloud or DevOps engineer runs containers on AWS: ECR and ECS on Fargate first (and when that is
 * enough), then Kubernetes as a system rather than a set of YAML snippets — the control plane and its
 * controllers, Services, Ingress and network policies, configuration, secrets and storage, reliability
 * (QoS, disruption budgets, spreading, graceful shutdown, autoscaling behaviour), Helm, and EKS with IRSA,
 * Pod Identity, the VPC CNI and the AWS Load Balancer Controller. It builds on Year 3's "An Image Fit for
 * Production" and "Running It Somewhere Real", CL1's networking and IAM lessons, and the MLOps track's
 * "Kubernetes for ML" (four objects, the three probes, requests and limits, HPA arithmetic), which is
 * referred to rather than repeated. Azure equivalents (ACR, Container Apps, AKS) are named in a line.
 *
 * One fictional company runs through the topic: MediSlot, a Hyderabad clinic-booking start-up (api,
 * worker, web) in AWS Mumbai (ap-south-1). Every Kubernetes manifest in the notes was parsed with PyYAML
 * and checked field by field against the kubernetes Python client's models (unknown fields and missing
 * required fields fail); kubectl's client-side dry run needs an API server for discovery and could not be
 * used. ECR, ECS, EKS and IAM outputs are real boto3 1.43 output against moto 5.2 (mock AWS). kubectl, kind,
 * Helm, eksctl and AWS CLI commands were written from the documentation and NOT run — there was no
 * cluster; the notes say so where it matters. No prices: the notes describe each pricing model.
 *
 * Skills: KUBERNETES by default; the ECS lesson is CONTAINERS_DOCKER, and checkpoint questions elsewhere
 * that are plainly about images, registries or ECS use ck('CONTAINERS_DOCKER', ...).
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_CL_KUBERNETES_BUNDLES: PilotBundle[] = [
  /* ── CONTAINERS_ON_AWS ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_KUBERNETES_CONTAINERS_ON_AWS',
    notes: `MediSlot (fictional) is a Hyderabad start-up that books clinic appointments: patients pick a doctor and a
slot, pay a booking fee by UPI, and get an SMS reminder the day before. It has three containerised services —
**api** (FastAPI), **worker** (sends reminders from a queue) and **web** (a static front end) — and, because
the data is health data, it runs in AWS Mumbai (ap-south-1). Year 3's "An Image Fit for Production" taught you
to build a small, non-root, commit-tagged image, and "Running It Somewhere Real" gave you the orchestrator's
vocabulary. This lesson is where those images live on AWS and the simplest thing that runs them.

## ECR: the registry

Amazon ECR is a private registry per account and region. One **repository** per image, and the image URI is
the address everyone uses:

    123456789012.dkr.ecr.ap-south-1.amazonaws.com/medislot/api:3f9c2a1

Docker logs in with a token from the API (valid for 12 hours), never with your IAM keys:

    aws ecr get-login-password --region ap-south-1 | docker login --username AWS \\
        --password-stdin 123456789012.dkr.ecr.ap-south-1.amazonaws.com

Four settings make a repository production-grade. This ran against moto (mock AWS), so the account is fake, but
every parameter is the real API:

    ecr.create_repository(repositoryName="medislot/api", imageTagMutability="IMMUTABLE",
        imageScanningConfiguration={"scanOnPush": True},
        encryptionConfiguration={"encryptionType": "AES256"})

    repositoryUri: 123456789012.dkr.ecr.ap-south-1.amazonaws.com/medislot/api
    tag mutability: IMMUTABLE scanOnPush: True
    lifecycle rules: ['drop untagged after 7 days', 'keep last 30 release images']

- **Immutable tags.** Tag every image with the commit SHA and make tags immutable, so "api:3f9c2a1" means the
  same bytes for ever. Pushing a different image under the same tag fails (moto raised an "already exists"
  error on the second push; real ECR calls it ImageTagAlreadyExistsException). A mutable "latest" is how two
  tasks of one service end up running different code.
- **Scanning.** Basic scan on push, or enhanced scanning through Amazon Inspector, which rescans when new CVEs
  are published. A scan is a report; a pipeline gate (CL_CICD_GITOPS) is what stops a critical finding.
- **Lifecycle policy.** Expire untagged images after a few days and keep the last N releases; storage is billed.
- **Architecture.** Graviton (arm64) is usually cheaper per unit of work. An image built on an x86 laptop and
  run on arm64 dies with "exec format error"; build both with docker buildx --platform linux/amd64,linux/arm64.

Replication can copy images to ap-south-2 (Hyderabad) for DR. Azure's equivalent is Azure Container Registry.

## ECS: four nouns

- **Cluster** — a grouping of services and capacity; on Fargate it costs nothing by itself.
- **Task definition** — the recipe: image, CPU and memory, ports, environment, secrets, logging, roles. It is
  **versioned and immutable**: registering again creates medislot-api:2, and moto agreed ("task definition:
  medislot-api:1", "next registration: medislot-api:2").
- **Task** — one running copy of a task definition (one or more containers that share a network).
- **Service** — keeps N tasks running, replaces failed ones, registers them with a load balancer target group
  and rolls out a new revision.

The parts people get wrong:

    family="medislot-api", requiresCompatibilities=["FARGATE"], networkMode="awsvpc",
    cpu="512", memory="1024",
    runtimePlatform={"cpuArchitecture": "ARM64", "operatingSystemFamily": "LINUX"},
    executionRoleArn="arn:aws:iam::123456789012:role/medislot-ecs-execution",
    taskRoleArn="arn:aws:iam::123456789012:role/medislot-api-task",
    containerDefinitions=[{ "name": "api", "image": "...medislot/api:3f9c2a1", "essential": True,
        "portMappings": [{"containerPort": 8000}],
        "secrets": [{"name": "DB_PASSWORD", "valueFrom": "arn:aws:secretsmanager:ap-south-1:123456789012:secret:medislot/db-AbCdEf"}],
        "logConfiguration": {"logDriver": "awslogs", "options": {"awslogs-group": "/ecs/medislot-api", ...}} }]

- **Two roles, two jobs.** The **execution role** is used by ECS itself to pull the image from ECR, write logs and
  fetch the secrets named in the task definition. The **task role** is what your code gets when it calls AWS
  (SQS, S3). "AccessDenied pulling the image" is the execution role; "AccessDenied calling SQS from Python" is the
  task role. Never bake keys into the image.
- **awsvpc** gives every task its own ENI and private IP in your subnet, with its own security group — the ALB
  target group uses target type **ip**.
- **Fargate sizes** come in fixed CPU-and-memory pairs (512 CPU units allows 1–4 GB).
- **secrets** are injected at start; a rotated secret reaches tasks only after a new deployment.

## Services and deployments

    service: api desired 2 launchType FARGATE
    service status: ACTIVE deployments: 1
    after update: medislot-api:2

A rolling deployment is controlled by **minimumHealthyPercent** and **maximumPercent**: 100 and 200 mean "start
the new tasks first, never drop below two healthy". The **deployment circuit breaker** with rollback watches the
rollout and, if new tasks keep failing to start or to pass health checks, rolls back to the last working
revision instead of retrying for ever. **healthCheckGracePeriodSeconds** stops the ALB's health check from
killing a task that is still starting. ECS also supports blue/green deployments; CL_CICD_GITOPS compares
release strategies.

Tasks in private subnets need a NAT gateway or VPC endpoints to pull images: ecr.api, ecr.dkr, logs and the **S3
gateway endpoint**, because layers are served from S3 (CL1's "Endpoints, Peering, Transit Gateway and VPN").

## Fargate or EC2 capacity

    Question                 Fargate                                  EC2 launch type / capacity provider
    Servers to patch         none                                     yours (an Auto Scaling group of ECS AMIs)
    Billing                  per second for the task's vCPU and GB    per instance-hour, however full it is
    GPUs, daemons, host      not available                            available
    Best for                 most web APIs and workers                steady heavy load, GPUs, special hosts

**Fargate Spot** runs interruptible tasks with a two-minute warning — fine for MediSlot's reminder worker,
wrong for the payment callback. A capacity provider strategy can mix them ("base 2 on FARGATE, the rest Spot").
Debug a running task with **ECS Exec** (aws ecs execute-command) instead of opening SSH anywhere.

## When ECS is enough

ECS is AWS-only, has fewer moving parts, no control plane to upgrade and deep IAM integration. Choose it when the
team is small, everything is on AWS and the services are ordinary HTTP APIs and workers. Choose Kubernetes (EKS)
when you need portability across clouds, the Kubernetes ecosystem (operators, Helm charts, Argo CD), many teams
on one platform. Azure's nearest equivalent to ECS on Fargate is Azure Container Apps.

## Cost and teardown

Fargate bills per second for the vCPU and memory a task requests, so oversized tasks cost money every second; the
ALB, NAT gateways and logs are billed separately. Check the pricing page and calculator, budget alarm first. To tear down: set the service's desired
count to 0 and delete it, delete the ALB and target group, deregister old task definitions, delete images you do
not need, and give the log group a retention period so logs do not accumulate for ever. (The ECR, ECS and IAM
calls above ran against moto; the docker and aws CLI commands were written from the documentation.)`,
    workedExample: `**Scenario.** MediSlot's api must run on ECS in two AZs behind an ALB, read its database password from
Secrets Manager, send reminders through SQS, and never drop below two healthy tasks during a release. The first
attempt fails: tasks stop with "ResourceInitializationError: unable to pull secrets or registry auth".

**1. Read the error, not the dashboard.** aws ecs describe-tasks shows stoppedReason. "unable to pull secrets
or registry auth" happens before the container starts, so it is ECS's job that failed — the **execution role**
or the network path, not the Python code.

**2. Check the network path.** The tasks are in private subnets with no NAT gateway. ECS needs to reach ECR
(ecr.api, ecr.dkr), S3 (layers), Secrets Manager and CloudWatch Logs. Add interface endpoints for ecr.api,
ecr.dkr, secretsmanager and logs, with a security group that allows 443 from the task security group, and an S3
gateway endpoint on the private route tables. (A NAT gateway would also work; endpoints keep the traffic
private and are often cheaper at volume — compare both in the calculator.)

**3. Check the execution role.** It needs the AWS-managed policy for ECS task execution (ECR pull and logs) plus
secretsmanager:GetSecretValue on exactly arn:aws:secretsmanager:ap-south-1:123456789012:secret:medislot/db-*,
and kms:Decrypt if the secret uses a customer-managed key.

**4. Give the code its own role.** The task role gets sqs:SendMessage on the reminders queue only. The two roles
are separate so that a bug in the app cannot read every secret ECS can.

**5. Make the rollout safe.** minimumHealthyPercent 100, maximumPercent 200, circuit breaker with rollback on,
health check grace period 60 seconds, ALB target group of type ip with /healthz as the check.

**6. Verify.** The service reaches two running tasks, one per AZ; aws ecs describe-services shows the deployment
COMPLETED; the target group shows two healthy targets.

**Result.** One error message pointed at a whole class of causes (before-start failures), and each fix changed
one thing: the network path, then the execution role.`,
    mcqs: [
      mcq('MediSlot\'s api tasks fail with "AccessDenied" when the Python code sends a message to SQS. The image pulled and logs appear. Which role needs the permission?', [
        ['The task role, which the application code uses for its AWS calls', true],
        ['The execution role, which ECS uses to pull images and write logs', false],
        ['The ECS service-linked role, which manages the load balancer', false],
        ['The IAM role of the developer who registered the task definition', false],
      ], 'Calls made by your code use the task role. The execution role is used by ECS before the container runs (pulling, logs, injecting secrets) — and it evidently works here. The service-linked role and the developer\'s identity are not used by the running code.'),
      mcq('A team keeps pushing "medislot/api:latest" and finds two tasks of the same ECS service running different code. What prevents this?', [
        ['Tag each image with its commit SHA and make the repository\'s tags immutable', true],
        ['Turn on scan on push so that ECR rejects any image that changes under an existing tag', false],
        ['Add a lifecycle policy that deletes the previous latest image every day', false],
        ['Run more tasks so the service always pulls the same latest image twice', false],
      ], 'Immutable, commit-tagged images make a tag mean one set of bytes, so every task runs what the task definition names. Scanning reports vulnerabilities, a lifecycle policy deletes old images without fixing the moving tag, and more tasks pull the moving tag more often.'),
      mcq('Fargate tasks in private subnets with no NAT gateway stop with CannotPullContainerError. ecr.api and ecr.dkr interface endpoints exist. What is most likely missing?', [
        ['An S3 gateway endpoint, because image layers are downloaded from S3', true],
        ['A public IP on every task, because ECR only ever serves public IP addresses', false],
        ['An internet gateway attached to the private subnets\' route table', false],
        ['A second ECR repository in the same AZ as the private subnets', false],
      ], 'ECR serves image layers from S3, so private tasks also need the S3 gateway endpoint on their route table. Public IPs and internet gateway routes would make the subnets public, and ECR repositories are regional, not per AZ.'),
    ],
    checkpoint: [
      mcq('Which statement about ECS task definitions is correct?', [
        ['Each registration creates a new numbered revision that cannot be edited', true],
        ['A task definition is edited in place and running tasks pick up the change', false],
        ['Each service owns one task definition, which is deleted along with it', false],
        ['A task definition holds the desired count and the load balancer settings', false],
      ], 'Task definitions are immutable and versioned (family:revision); a service is updated to point at a new revision. Running tasks do not change in place, revisions outlive services, and desired count and load balancers belong to the service.'),
      mcq('MediSlot\'s reminder worker can tolerate interruption, but the payment-callback API cannot. How should their ECS capacity be chosen?', [
        ['Worker on Fargate Spot, payment-callback API on regular Fargate', true],
        ['Both on Fargate Spot, since interruptions come with two minutes\' warning', false],
        ['Both on the EC2 launch type, since Fargate cannot run any HTTP services', false],
        ['Payment-callback on Fargate Spot, since it sees the least traffic of all', false],
      ], 'Spot capacity can be reclaimed with a two-minute warning, which a queue worker can absorb and a payment callback should not. Fargate runs HTTP services fine, and low traffic does not make interruptions acceptable for payments.'),
      mcq('A start-up with four HTTP services, all on AWS and a two-person platform team, asks whether to use ECS or EKS. Which reasoning is strongest?', [
        ['ECS on Fargate: fewer moving parts and no control plane to upgrade', true],
        ['EKS: ECS cannot run more than one service in a cluster at a time', false],
        ['EKS: ECS has no rolling deployments, so every release is an outage', false],
        ['ECS on EC2: Fargate cannot attach a security group to its tasks', false],
      ], 'For a small all-AWS team, ECS on Fargate removes cluster upgrades and node management. ECS clusters run many services, ECS has rolling (and blue/green) deployments, and awsvpc tasks on Fargate get their own security groups.'),
    ],
  },

  /* ── K8S_ARCHITECTURE ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_KUBERNETES_K8S_ARCHITECTURE',
    notes: `If you took the MLOps track you have written a Deployment, a Service and a ConfigMap and met the three probes.
This lesson is the machine underneath: which component does what when you type kubectl apply, so that when a Pod
sits in Pending or a node dies you know where to look instead of reapplying YAML and hoping.

## The control plane

- **kube-apiserver** — the front door and the only component that talks to etcd. Every request (kubectl, the
  controllers, the kubelets) is authenticated, authorised (RBAC) and passed through **admission** (defaults,
  policies, quotas) before it is stored.
- **etcd** — a consistent key-value store holding every object. It uses Raft, so it needs a majority: three
  members survive one failure, five survive two. Lose etcd without a backup and you have lost the cluster's
  memory (on EKS, AWS runs and backs up etcd for you).
- **kube-scheduler** — watches for Pods with no node, **filters** nodes that cannot take the Pod (not enough
  requested CPU or memory, taints, affinity, a volume in another zone) and **scores** the rest, then writes the
  chosen node into the Pod. It does not start anything.
- **kube-controller-manager** — dozens of control loops (Deployment, ReplicaSet, Job, Node, EndpointSlice...).
  Each one watches objects, compares desired with actual, and acts to close the gap.
- **cloud-controller-manager** — the cloud-specific loops: load balancers for Services, node lifecycle.

## On every node

- **kubelet** — watches for Pods bound to its node, asks the container runtime (containerd, through the CRI) to
  start them, runs the probes and reports status back to the API server.
- **kube-proxy** — programs the node's iptables or IPVS rules so a Service's virtual IP reaches its Pods (some
  CNIs, such as Cilium, replace it).
- **CNI plugin** — gives each Pod an IP and wires Pod-to-Pod networking (on EKS, the VPC CNI; next lessons).

## What kubectl apply actually does

Follow MediSlot's web Deployment (3 replicas) from your terminal to running containers:

1. kubectl sends the object to the API server; it is authorised, admitted, defaulted and written to etcd.
2. The **Deployment controller** sees a Deployment with no ReplicaSet for this template, and creates one named
   web-<hash>, where the hash (the pod-template-hash label) identifies the template.
3. The **ReplicaSet controller** sees 0 of 3 Pods and creates three Pod objects with no node.
4. The **scheduler** binds each Pod to a node.
5. Each node's **kubelet** pulls the image, starts the container, runs the probes and writes the status.

Nobody calls anybody: every component **watches the API server** and reacts. That is why the system heals —
delete a Pod and the ReplicaSet controller simply sees 2 of 3 and creates another. Objects are linked by
**labels and selectors** (which Pods a ReplicaSet counts) and **ownerReferences** (which ReplicaSet owns a Pod,
so deleting the Deployment garbage-collects everything below it).

## Pods, and the workload objects around them

A **Pod** is one or more containers sharing a network namespace (they reach each other on localhost) and
volumes. Init containers run to completion first; a **native sidecar** is an init container with
restartPolicy: Always, which starts before and keeps running beside the main container (log shippers, proxies).
Pods are disposable: a replacement gets a new name and a new IP, which is why you never address a Pod directly.

    Object        Use it for                                     MediSlot example
    Deployment    stateless replicas, rolling updates             api, web
    StatefulSet   stable names and per-Pod storage                a Redis used only in dev
    DaemonSet     one Pod per node                                a log or metrics agent
    Job           run to completion, with retries                 a one-off data migration
    CronJob       a Job on a schedule                             release unpaid slot holds nightly

A CronJob's schedule is UTC unless you say otherwise; set the time zone explicitly:

    apiVersion: batch/v1
    kind: CronJob
    metadata: {name: slot-cleanup, namespace: clinic}
    spec:
      schedule: "0 2 * * *"
      timeZone: "Asia/Kolkata"
      concurrencyPolicy: Forbid
      jobTemplate:
        spec:
          backoffLimit: 2
          template:
            spec:
              restartPolicy: OnFailure
              containers:
                - name: cleanup
                  image: 123456789012.dkr.ecr.ap-south-1.amazonaws.com/medislot/api:3f9c2a1
                  command: ["python", "-m", "medislot.jobs.release_expired_holds"]

## A local cluster with kind

kind runs each Kubernetes node as a Docker container — free, and deleted in seconds:

    kind: Cluster
    apiVersion: kind.x-k8s.io/v1alpha4
    name: medislot
    nodes:
      - role: control-plane
      - role: worker
      - role: worker

    kind create cluster --config kind-config.yaml
    kubectl cluster-info --context kind-medislot
    kind load docker-image medislot/api:dev --name medislot   # use a local image without a registry
    kind delete cluster --name medislot

Three nodes need a few GB of RAM; on an 8 GB laptop close the browser tabs first.

## The kubectl you use every day

    kubectl get pods -n clinic -o wide                 # node and Pod IP
    kubectl describe pod web-7d4b9c-xk2lp -n clinic    # the Events at the bottom explain most failures
    kubectl logs deploy/api -n clinic --previous       # the crashed container's last words
    kubectl get events -n clinic --sort-by=.metadata.creationTimestamp
    kubectl explain deployment.spec.strategy           # field docs, offline from the server's schema
    kubectl diff -f k8s/                               # what apply would change
    kubectl create deployment web --image=nginx:1.27-alpine --dry-run=client -o yaml > web.yaml

The last line is how you scaffold YAML; then you edit it, commit it, and only ever change the cluster with
kubectl apply (or, later, Argo CD). Hand edits with kubectl edit are drift waiting to be overwritten.

## Reading a Pod's state

- **Pending** — not scheduled. describe shows FailedScheduling: "Insufficient cpu", an untolerated taint, or a
  volume node affinity conflict.
- **ContainerCreating** for long — volume attach, image pull or a missing Secret or ConfigMap.
- **ImagePullBackOff** — wrong name or tag, no permission to the registry, or no network path to it.
- **CrashLoopBackOff** — it starts and exits; read logs --previous and the exit code (137 is a kill, often OOM).
- **Running, 0/1 Ready** — the readiness probe is failing; the Service is not sending it traffic.

(The manifests here were checked against the Kubernetes API models; the kind and kubectl commands were written
from the documentation — there was no cluster to run them on.)`,
    workedExample: `**Scenario.** MediSlot runs web with 3 replicas on a three-node kind cluster. To see what happens when a
machine dies, you stop one worker: docker stop medislot-worker2. Predict the next ten minutes, then check.

**1. The node goes NotReady.** The kubelet on worker2 stops posting heartbeats. After the node monitor's grace
period (tens of seconds) the Node controller marks it NotReady and adds the taints
node.kubernetes.io/unreachable (NoExecute).

**2. The Pods do not move at once.** Every Pod gets default tolerations for not-ready and unreachable with
tolerationSeconds: 300. So the Pod on worker2 is still counted for about five minutes; kubectl get pods shows it
Running, then Terminating or Unknown. This delay is deliberate: a network blip should not reshuffle a cluster.

**3. Eviction and replacement.** When the toleration expires the Pod is evicted. The ReplicaSet controller sees
2 of 3 and creates a new Pod; the scheduler places it on a healthy node; the kubelet there starts it.

**4. Meanwhile, traffic.** The endpoints controller removes the unreachable Pod from the Service once it stops
being Ready, so users are served by the two others. Capacity was down a third for about five minutes.

**5. What you would change in production.** Run enough replicas that losing a node's share is survivable,
spread them across nodes and zones (topology spread, in "Probes, Resources, Autoscaling and Rollouts"), and set
a PodDisruptionBudget so planned drains never take too many at once. You could lower tolerationSeconds for a
latency-critical service, at the cost of churn on brief network problems.

**6. Check.** kubectl get nodes, kubectl get pods -o wide -w and kubectl get events tell the story in order;
docker start medislot-worker2 brings the node back, and the scheduler does not move Pods back by itself.

**Result.** Self-healing is several independent loops reacting to the API server, with documented delays —
knowing them is how you explain a "five-minute dip" in a post-mortem. (Written from the documented defaults; not
run here.)`,
    mcqs: [
      mcq('Someone deletes one of MediSlot\'s three web Pods by hand. Which component notices and creates the replacement Pod object?', [
        ['The ReplicaSet controller, which sees two Pods where three are desired', true],
        ['The kubelet on the node, which restarts the same Pod with the same name', false],
        ['The scheduler, which recreates any Pod that disappears from a node', false],
        ['etcd, which restores the deleted object from its most recent snapshot', false],
      ], 'The ReplicaSet controller compares desired and actual counts and creates a new Pod object; the scheduler then only chooses its node. A kubelet restarts containers inside an existing Pod, not deleted Pods, and etcd stores objects without recreating them.'),
      mcq('A new Pod for the api stays Pending, and kubectl describe shows "0/3 nodes are available: 3 Insufficient cpu". What does this mean?', [
        ['No node has enough unrequested CPU left for the Pod\'s CPU request', true],
        ['The nodes are busy at the moment, so the Pod waits for live CPU usage to fall', false],
        ['The container\'s CPU limit is lower than the application needs', false],
        ['The image is too large for the nodes, so it cannot be pulled yet', false],
      ], 'The scheduler filters on requests: the sum of requests already on each node plus this Pod\'s request must fit. Live usage is not what it checks, a limit does not affect scheduling, and image size shows up as pull problems, not FailedScheduling.'),
      mcq('Why is kubectl create deployment ... --dry-run=client -o yaml a good habit?', [
        ['It scaffolds YAML you can edit, commit and apply instead of changing the cluster', true],
        ['It validates the YAML against the live cluster and then applies it if it is accepted', false],
        ['It creates the Deployment but keeps it paused until you apply it again', false],
      ], 'With --dry-run=client nothing is sent to the cluster; the output is a starting manifest for version control and declarative apply. It neither applies the object nor creates a paused one.'),
    ],
    checkpoint: [
      mcq('Which control-plane component is the only one that reads and writes etcd directly?', [
        ['The kube-apiserver', true],
        ['The kube-scheduler', false],
        ['The kubelet on each node', false],
        ['The controller-manager', false],
      ], 'All other components, including the scheduler, controllers and kubelets, go through the API server, which authenticates, authorises and admits each change before storing it. That single path is what makes RBAC and admission enforceable.'),
      mcq('A worker node loses its network. With default settings, roughly when are its Pods evicted and replaced elsewhere?', [
        ['About five minutes after it becomes NotReady, when the default tolerations expire', true],
        ['Immediately, as soon as a single heartbeat from that node\'s kubelet has been missed', false],
        ['Never; Pods stay bound to that node until an administrator deletes them', false],
        ['After one hour, which is when the scheduler rebalances the whole cluster', false],
      ], 'Pods get not-ready and unreachable tolerations of 300 seconds by default, so eviction follows about five minutes after the node is marked NotReady. A single missed heartbeat is not enough, Pods are not stuck for ever, and there is no hourly rebalance.'),
      mcq('A CronJob with schedule "0 2 * * *" and no timeZone runs the slot cleanup at 07:30 IST instead of 02:00 IST. What is the fix?', [
        ['Set spec.timeZone to "Asia/Kolkata" so the schedule is read in IST', true],
        ['Change the node operating system\'s clock from UTC to IST on each node', false],
        ['Set concurrencyPolicy: Forbid so the job cannot run at the wrong time', false],
        ['Use a Deployment that sleeps until 02:00 IST and then runs the cleanup', false],
      ], 'Without timeZone the controller interprets the schedule in its own time zone, usually UTC, and 02:00 UTC is 07:30 IST. Changing node clocks is fragile and not what the controller reads, concurrencyPolicy controls overlapping runs, and a sleeping Deployment reinvents CronJob badly.'),
    ],
  },

  /* ── K8S_SERVICES_INGRESS ────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_KUBERNETES_K8S_SERVICES_INGRESS',
    notes: `Pods come and go with new IPs. A **Service** gives a set of Pods one stable name and virtual IP; an **Ingress**
(or the newer Gateway API) brings HTTP traffic in from outside; a **NetworkPolicy** decides who may talk to whom
inside. Get these three right and most "it works in the Pod but not from the browser" tickets disappear.

## How a Service finds its Pods

A Service has a **selector**. The EndpointSlice controller keeps a list of the IPs of Pods that match the selector
**and are Ready**; kube-proxy on every node turns the Service's virtual IP into rules that pick one of them. The
ClusterIP is not a real interface — you cannot ping it — and an empty endpoint list means the Service exists but
sends traffic nowhere.

    apiVersion: v1
    kind: Service
    metadata: {name: api, namespace: clinic}
    spec:
      type: ClusterIP
      selector: {app: api}
      ports:
        - name: http
          port: 80          # what clients connect to: http://api
          targetPort: http  # the container port named "http" (8000)

Four port words: **containerPort** (where the app listens), **targetPort** (where the Service sends; a number
or a port name), **port** (what clients use) and **nodePort** (a port on every node, for NodePort Services).
Naming the targetPort means the app can move from 8000 to 8080 without touching the Service.

## Service types

    Type           Reachable from                    Typical use
    ClusterIP      inside the cluster only           api, called by web and the worker
    headless       inside; DNS returns Pod IPs       StatefulSets: redis-0.redis.clinic.svc...
    NodePort       every node's IP on 30000-32767    labs, or behind your own load balancer
    LoadBalancer   a cloud load balancer             one external entry point per Service

A headless Service has clusterIP: None. Each LoadBalancer Service creates its **own** cloud load balancer —
ten services, ten load balancers, ten hourly bills — which is why HTTP services usually share one Ingress.
externalTrafficPolicy: Local keeps the client's source IP and avoids an extra hop, but only nodes running a Pod
receive traffic.

## DNS inside the cluster

CoreDNS gives every Service a name: **api.clinic.svc.cluster.local**. From a Pod in clinic, "api" is enough;
from another namespace use "api.clinic". Pods' resolv.conf has search domains and ndots:5, so an external name
such as api.razorpay.example is first tried against each cluster suffix — extra lookups on a hot path. A trailing
dot (api.razorpay.example.) or a lower ndots setting avoids it. When DNS "randomly" fails, check CoreDNS's Pods
and logs before blaming the app.

## Ingress: HTTP routing from outside

An Ingress object is only a set of rules; an **Ingress controller** (a Deployment in the cluster, or the AWS Load
Balancer Controller on EKS) reads it and does the routing. Without a controller watching your ingressClassName,
the object does nothing at all.

    apiVersion: networking.k8s.io/v1
    kind: Ingress
    metadata: {name: medislot, namespace: clinic}
    spec:
      ingressClassName: nginx
      tls:
        - hosts: [book.medislot.example]
          secretName: medislot-tls
      rules:
        - host: book.medislot.example
          http:
            paths:
              - path: /api
                pathType: Prefix
                backend: {service: {name: api, port: {name: http}}}
              - path: /
                pathType: Prefix
                backend: {service: {name: web, port: {number: 80}}}

**Prefix** matches whole path elements: /api matches /api and /api/slots but not /apis. **Exact** matches one
path. The TLS secret (type kubernetes.io/tls) is usually issued and renewed by cert-manager. Note the controller
landscape is changing: the Kubernetes project announced in November 2025 that the community ingress-nginx
controller would be retired, with maintenance ending in March 2026 — check its status, and prefer a maintained
controller for new clusters.

The **Gateway API** is the successor to Ingress: a platform team owns a Gateway (the listener, TLS), and app
teams attach HTTPRoutes with richer matching and weighted backends:

    apiVersion: gateway.networking.k8s.io/v1
    kind: HTTPRoute
    metadata: {name: medislot, namespace: clinic}
    spec:
      parentRefs: [{name: public-gw, namespace: gateway}]
      hostnames: [book.medislot.example]
      rules:
        - matches: [{path: {type: PathPrefix, value: /api}}]
          backendRefs: [{name: api, port: 80}]
        - backendRefs: [{name: web, port: 80}]

## NetworkPolicy: who may talk to whom

By default every Pod can reach every other Pod in the cluster. A NetworkPolicy selects Pods and lists what is
allowed; once any policy selects a Pod for Ingress, everything not allowed is dropped. Start with default deny
in the namespace, then open exactly what the design needs:

    kind: NetworkPolicy        # apiVersion networking.k8s.io/v1
    metadata: {name: default-deny-ingress, namespace: clinic}
    spec: {podSelector: {}, policyTypes: [Ingress]}
    ---
    kind: NetworkPolicy
    metadata: {name: api-from-web-and-ingress, namespace: clinic}
    spec:
      podSelector: {matchLabels: {app: api}}
      policyTypes: [Ingress]
      ingress:
        - from:
            - podSelector: {matchLabels: {app: web}}
            - namespaceSelector: {matchLabels: {kubernetes.io/metadata.name: ingress-nginx}}
          ports: [{protocol: TCP, port: 8000}]

Three things trip people up. Two entries under from are **OR**; one entry with both a namespaceSelector and a
podSelector is **AND**. The port is the **Pod's** port (8000), not the Service's port 80. And policies are
enforced by the CNI plugin: on a CNI without policy support they are accepted and silently ignored — test with a
throwaway Pod (kubectl run tmp --rm -it --image=busybox:1.36 -- wget -qO- -T 2 http://api.clinic) before trusting
them. If you also default-deny **Egress**, allow DNS (UDP and TCP 53 to kube-dns) or every lookup fails.

(The manifests were checked against the API models, the HTTPRoute was parsed only; nothing was applied to a
cluster.)`,
    workedExample: `**Scenario.** After a refactor, https://book.medislot.example/api/slots returns 503 from the ingress
controller, while the web page loads. The api Pods are Running and 1/1 Ready. Find the break without changing
anything at random.

**1. Walk the chain from the outside in.** Client → DNS → load balancer → Ingress controller → Ingress rule →
Service → EndpointSlice → Pod. A 503 from the controller means it matched a rule but had nowhere to send it.

**2. Check the rule.** kubectl describe ingress medislot -n clinic lists the backends: /api → api:http. So the
rule is fine and points at Service api.

**3. Check the Service's endpoints.**

    kubectl get endpointslices -n clinic -l kubernetes.io/service-name=api
    NAME        ADDRESSTYPE   PORTS     ENDPOINTS   AGE
    api-x7k2p   IPv4          <unset>   <unset>     3d

No endpoints, although Ready Pods exist. So the selector does not match them.

**4. Compare labels.** kubectl get svc api -o jsonpath='{.spec.selector}' prints {"app":"api"}; kubectl get pods
-n clinic --show-labels shows the refactored Pods carry app.kubernetes.io/name=api — the new chart's labels.

**5. Fix one side, deliberately.** Change the Service selector to the new label (and keep both label schemes on
the Pods during the switch if other selectors depend on the old one). Endpoints appear within seconds; the 503
stops.

**6. Check what else used the old label.** The NetworkPolicy api-from-web-and-ingress selects app: api — it now
selects nothing, so the default deny no longer applies to the api at all. Update it too, then verify from a
throwaway Pod in another namespace that the api is refused, and from the web Pod that it is allowed.

**Result.** The evidence chain (rule → Service → endpoints → labels) found the cause in four commands, and the
same label change was caught in the policy before it became a security hole. (Commands written from the
documentation; the output shape is illustrative.)`,
    mcqs: [
      mcq('MediSlot\'s web Pods call the api through a Service with port 80 and targetPort http. The api container\'s port named http is 8000. Which URL should web use from the same namespace?', [
        ['http://api, because clients use the Service port, which is 80', true],
        ['http://api:8000, because clients must always use the container port', false],
        ['http://api:30080, because in-cluster callers go through a NodePort', false],
        ['The Pod IP on 8000, because Services work only from outside the cluster', false],
      ], 'Clients connect to the Service name on the Service port (80, the default for http), and the Service forwards to targetPort 8000. The container port is not needed by callers, NodePorts are for outside access, and Pod IPs change on every restart.'),
      mcq('A team creates an Ingress with ingressClassName: nginx in a fresh kind cluster, and nothing answers on port 80. What is the most likely reason?', [
        ['No Ingress controller is installed to read and act on the Ingress', true],
        ['Ingress objects are only supported on clusters run by a cloud provider', false],
        ['pathType must be Exact for the root path / before it receives traffic', false],
        ['The Ingress needs a TLS section, since plain HTTP is always refused', false],
      ], 'An Ingress is a set of rules; a controller watching that class implements them, and kind does not ship one. Ingress works on any cluster with a controller, Prefix on / is the usual catch-all, and TLS is optional.'),
      mcq('A NetworkPolicy should allow only Pods labelled app: web in namespace clinic-web to reach the api. Which from block does that?', [
        ['One entry holding both a namespaceSelector and a podSelector together', true],
        ['Two separate entries: one namespaceSelector and one podSelector', false],
        ['One podSelector entry, since policies match Pods in all namespaces', false],
        ['One namespaceSelector entry, since labels on Pods are not checked', false],
      ], 'Selectors inside one from entry are combined with AND: web Pods in that namespace. Two entries mean OR, which admits every Pod in the namespace plus every web Pod in the api\'s own namespace. A podSelector alone matches only the policy\'s own namespace.'),
    ],
    checkpoint: [
      mcq('A Service exists and its Pods are Running and Ready, but kubectl get endpointslices for it shows no endpoints. What should you check first?', [
        ['Whether the Service selector matches the labels on those Pods', true],
        ['Whether CoreDNS is running, since endpoints come from DNS records', false],
        ['Whether the Service type is LoadBalancer rather than ClusterIP', false],
        ['Whether the Pods have a CPU limit, which endpoints require to exist', false],
      ], 'Endpoints list Ready Pods that match the selector, so an empty list with Ready Pods points at a label mismatch. DNS resolves the Service name but does not create endpoints, the type does not change matching, and limits are irrelevant to it.'),
      mcq('MediSlot exposes six HTTP services. Why do teams usually prefer one Ingress or Gateway over six LoadBalancer Services?', [
        ['Each LoadBalancer Service creates its own cloud load balancer and bill', true],
        ['LoadBalancer Services cannot carry HTTPS traffic for a public website', false],
        ['Ingress traffic skips kube-proxy, so it is always several times faster', false],
        ['LoadBalancer Services work only for a namespace called default', false],
      ], 'Every LoadBalancer Service provisions a separate load balancer with its own hourly cost and DNS name; one Ingress shares a load balancer with host and path routing. LoadBalancer Services can carry TLS, speed is not the point, and they work in any namespace.'),
      mcq('After adding a default-deny Egress policy to namespace clinic, every outbound call from the api fails, even to allowed services. What was forgotten?', [
        ['An egress rule allowing DNS on port 53 to the cluster DNS Pods', true],
        ['An ingress rule allowing traffic into the api from the internet', false],
        ['A Service of type NodePort so that egress traffic can leave nodes', false],
        ['A readiness probe, without which egress policies block all traffic', false],
      ], 'Every call starts with a DNS lookup; with egress denied, lookups to kube-dns fail, so nothing resolves. Ingress rules and NodePorts concern incoming traffic, and probes do not interact with network policies.'),
    ],
  },

  /* ── K8S_CONFIG_STORAGE ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_KUBERNETES_K8S_CONFIG_STORAGE',
    notes: `One image, many environments: Year 3's "One Build, Three Environments" and "Secrets, Properly" set the rule.
In Kubernetes the configuration lives in ConfigMaps and Secrets, and anything that must survive a Pod restart
lives in a volume. This lesson is how each behaves — including the behaviours that surprise people in
production.

## ConfigMaps: two ways in, two behaviours

    apiVersion: v1
    kind: ConfigMap
    metadata: {name: api-config, namespace: clinic}
    data:
      APP_ENV: "prod"
      SLOT_HOLD_MINUTES: "10"
      feature-flags.json: |
        {"video_consult": true, "upi_autopay": false}

In the Deployment, envFrom: [{configMapRef: {name: api-config}}] turns every key into an environment variable,
and a configMap volume with items: [{key: feature-flags.json, path: feature-flags.json}] mounted at
/etc/medislot puts the JSON on disk as a file.

- **Environment variables are read once, at start.** Changing the ConfigMap changes nothing in running Pods
  until they restart.
- **Mounted files are updated** by the kubelet after a delay (typically within a minute or two) — but only if the
  app re-reads the file, and **never for a subPath mount**.
- So a config change should be a rollout: Helm's checksum annotation (next lessons) or kubectl rollout restart.
  For values that must not change under a running app, set immutable: true and create a new ConfigMap per
  version — it also spares the API server from watching it.

## Secrets: base64 is not encryption

    apiVersion: v1
    kind: Secret
    metadata: {name: api-db, namespace: clinic}
    type: Opaque
    stringData:
      DB_USER: medislot_app
      DB_PASSWORD: change-me-not-a-real-password

The API stores the value base64-encoded. In Python:

    >>> base64.b64encode(b"change-me-not-a-real-password").decode()
    'Y2hhbmdlLW1lLW5vdC1hLXJlYWwtcGFzc3dvcmQ='
    >>> base64.b64decode('Y2hhbmdlLW1lLW5vdC1hLXJlYWwtcGFzc3dvcmQ=').decode()
    'change-me-not-a-real-password'

Anyone who can get the Secret, or read etcd, or exec into the Pod, has the password. What actually protects it:

- **RBAC** — few people and service accounts may get or list secrets in clinic (list returns values too).
- **Encryption at rest** for Secrets in etcd — on EKS, envelope encryption with a KMS key.
- **Not in Git.** A Secret manifest with real values in a repository is a leak. Keep secrets in AWS Secrets
  Manager and sync them in with the **External Secrets Operator** (an ExternalSecret names the remote key and
  the Kubernetes Secret to create) or mount them with the **Secrets Store CSI Driver** and the AWS provider.
- **Mount, do not log.** Prefer a file mount to an environment variable when the app can read files: env
  variables leak into crash dumps and "print the config" debug endpoints.

## Volumes and the storage chain

An **emptyDir** lives exactly as long as the Pod — scratch space (with a sizeLimit) or a shared directory between
containers. For data that must survive, the chain is:

    StorageClass  →  PersistentVolumeClaim  →  PersistentVolume  →  the disk (an EBS volume)
    "how to make"    "I need 20Gi, RWO"         "this disk"

    apiVersion: storage.k8s.io/v1
    kind: StorageClass
    metadata: {name: gp3}
    provisioner: ebs.csi.aws.com
    parameters: {type: gp3, encrypted: "true"}
    volumeBindingMode: WaitForFirstConsumer
    reclaimPolicy: Retain
    allowVolumeExpansion: true

A claim names the class and a size; dynamic provisioning creates the volume. The settings that matter:

- **Access modes.** ReadWriteOnce: one node at a time (EBS). ReadWriteMany: many nodes (EFS, through its CSI
  driver). ReadWriteOncePod: exactly one Pod. Asking EBS for ReadWriteMany leaves the claim Pending for ever.
- **WaitForFirstConsumer.** An EBS volume lives in one AZ. Binding immediately could create it in ap-south-1a
  while the scheduler later wants the Pod in 1b. Waiting until the Pod is scheduled creates the disk where the
  Pod is.
- **reclaimPolicy.** Delete (the default for most classes) deletes the disk when the claim is deleted — one
  careless kubectl delete pvc away from data loss. Retain keeps the disk for you to clean up (and pay for).

## StatefulSets

A StatefulSet gives each replica a **stable name** (redis-0, redis-1), a **stable DNS name** through a headless
Service (redis-0.redis.clinic.svc.cluster.local) and its **own claim** from volumeClaimTemplates (data-redis-0...).
Pods start and update in order. Scaling down does not delete the claims — your data waits for you.

    kind: StatefulSet         # apiVersion apps/v1
    metadata: {name: redis, namespace: clinic}
    spec:
      serviceName: redis
      replicas: 3
      selector: {matchLabels: {app: redis}}
      template:
        metadata: {labels: {app: redis}}
        spec:
          containers:
            - name: redis
              image: redis:7.4-alpine
              args: ["--appendonly", "yes"]
              volumeMounts: [{name: data, mountPath: /data}]
      volumeClaimTemplates:
        - metadata: {name: data}
          spec:
            accessModes: [ReadWriteOnce]
            storageClassName: gp3
            resources: {requests: {storage: 5Gi}}

## What not to keep in the cluster

A StatefulSet gives you stable storage, not a database service: backups, point-in-time restore, failover,
upgrades and monitoring are now yours. For MediSlot's bookings, RDS PostgreSQL (CL1's "Managed Relational
Databases: RDS and Aurora") and ElastiCache are the better default; StatefulSets suit dev environments,
caches you can lose, and teams with an operator they genuinely know how to run. Also keep out of the cluster:
large user uploads (S3), secrets' source of truth (Secrets Manager) and anything you cannot rebuild from Git.

(Manifests checked against the API models; the base64 lines were run in Python; nothing was applied to a
cluster.)`,
    workedExample: `**Scenario.** In a staging cluster on EKS, the dev Redis StatefulSet's Pod redis-1 has been Pending for an
hour after a node in ap-south-1b was replaced during an upgrade. describe shows: "0/4 nodes are available: 1
Insufficient memory, 3 node(s) had volume node affinity conflict." Explain and fix.

**1. Decode the message.** data-redis-1 is an EBS volume created in ap-south-1b. EBS volumes attach only to
instances in the same AZ, so the PersistentVolume carries a node affinity for 1b. Three of the four nodes are in
other AZs (the affinity conflict), and the only node in 1b has no room for the Pod's memory request.

**2. Rule out the wrong fixes.** Deleting the claim would make the Pod schedulable — by deleting the data.
Changing the StorageClass does nothing for an existing volume. ReadWriteMany is not available on EBS.

**3. Fix the capacity in the right AZ.** The node group's replacement left 1b with one small node. Scale the
node group so ap-south-1b has room (or let Karpenter or the Cluster Autoscaler add a node there — they consider
the volume's zone). redis-1 schedules, attaches its volume and starts with its data.

**4. Prevent it.** Node groups that host volumes should span every AZ the volumes are in, with headroom; a
topology spread constraint on the StatefulSet keeps replicas in different AZs, so one AZ's trouble affects one
replica.

**5. Ask the bigger question.** This Redis is used for slot-hold locks. Losing them for ten minutes means double
bookings. For production, ElastiCache with Multi-AZ gives failover the team does not have to build — the
StatefulSet stays only in dev.

**Result.** "Volume node affinity conflict" is an AZ problem, not a Kubernetes bug: zonal disks pin Pods to
zones, and capacity must exist there.`,
    mcqs: [
      mcq('MediSlot changes SLOT_HOLD_MINUTES in a ConfigMap that the api reads through envFrom. An hour later the running Pods still use the old value. Why?', [
        ['Environment variables are set when the container starts and never change', true],
        ['The kubelet syncs ConfigMaps only once a day unless it is told to resync', false],
        ['ConfigMaps are cached by CoreDNS, so the old value is served until expiry', false],
        ['The ConfigMap needs immutable: true before its updates reach any Pod', false],
      ], 'Environment variables are copied in at container start; a restart or rollout is needed. Mounted files do update (after a short delay), there is no daily sync or DNS cache involved, and immutable: true forbids changes rather than enabling them.'),
      mcq('A developer says "our Secret is safe in Git because the values are base64-encoded". What is the correct response?', [
        ['base64 is an encoding anyone can reverse; keep real values out of Git', true],
        ['base64 is safe in Git as long as the repository is a private repository', false],
        ['base64 is a hash, so the value can be checked but never read back again', false],
      ], 'base64 decodes in one line, so the password is effectively in plain text. A private repository still exposes it to everyone with access and to every clone for ever. base64 is not a hash. Use Secrets Manager with External Secrets or the CSI driver instead.'),
      mcq('Why does an EBS-backed StorageClass use volumeBindingMode: WaitForFirstConsumer?', [
        ['So the disk is created in the AZ where the scheduler places the Pod', true],
        ['So the disk is only billed once the application first writes to it', false],
        ['So several Pods on different nodes can share one EBS disk safely', false],
        ['So the claim can be resized later without any downtime for the Pod', false],
      ], 'EBS volumes are zonal; delaying binding until scheduling creates the volume in the Pod\'s AZ. Billing starts at creation, EBS is ReadWriteOnce, and expansion is controlled by allowVolumeExpansion.'),
    ],
    checkpoint: [
      mcq('A StatefulSet named redis with a headless Service named redis runs in namespace clinic. What DNS name reaches its second replica?', [
        ['redis-1.redis.clinic.svc.cluster.local', true],
        ['redis-2.redis.clinic.svc.cluster.local', false],
        ['redis.clinic.svc.cluster.local:1', false],
        ['redis-b.clinic.svc.cluster.local', false],
      ], 'StatefulSet Pods are numbered from 0, so the second is redis-1, and the headless Service gives it a per-Pod DNS name. redis-2 is the third replica, ports do not select replicas, and letters are not used.'),
      mcq('A team runs kubectl delete pvc uploads to "clean up", and the EBS volume with patients\' uploaded reports is gone. Which setting would have kept the disk?', [
        ['reclaimPolicy: Retain on the StorageClass that created the volume', true],
        ['accessModes: ReadWriteOncePod on the claim that requested the volume', false],
        ['volumeBindingMode: Immediate on the StorageClass of that claim', false],
        ['immutable: true on the claim, so the volume becomes read-only', false],
      ], 'With reclaimPolicy Delete, deleting the claim deletes the disk; Retain keeps it for manual recovery. Access mode and binding mode do not affect deletion, and immutable is a ConfigMap and Secret field, not a claim setting.'),
      mcq('Which way of supplying MediSlot\'s database password follows good practice on EKS?', [
        ['Keep it in Secrets Manager and sync it with the External Secrets Operator', true],
        ['Commit a Secret manifest with the value base64-encoded in the Helm chart', false],
        ['Bake it into the image as an environment variable at docker build time', false],
        ['Store it in a ConfigMap, since ConfigMaps are encrypted at rest on EKS', false],
      ], 'The source of truth stays in Secrets Manager with rotation and audit, and the operator creates the Kubernetes Secret. base64 in Git and baked images leak the value, and ConfigMaps are for non-secret configuration.'),
    ],
  },

  /* ── K8S_RELIABILITY ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_KUBERNETES_K8S_RELIABILITY',
    notes: `The MLOps track's "Kubernetes for ML" covered the basics: the three probes, requests versus limits, the HPA
formula desired = ceil(current × metric ÷ target), and maxSurge/maxUnavailable. This lesson is what a platform
engineer adds on top so that MediSlot's api survives node failures, cluster upgrades, deploys and the morning
rush when a hospital chain opens free health-camp bookings.

## The api, production-shaped

    # excerpt: the selector, labels, image and ports are as in the earlier lessons
    spec:
      replicas: 4
      revisionHistoryLimit: 10
      progressDeadlineSeconds: 300
      minReadySeconds: 10
      strategy: {type: RollingUpdate, rollingUpdate: {maxSurge: 25%, maxUnavailable: 0}}
      template:
        spec:
          terminationGracePeriodSeconds: 45
          topologySpreadConstraints:
            - {maxSkew: 1, topologyKey: topology.kubernetes.io/zone,
               whenUnsatisfiable: DoNotSchedule, labelSelector: {matchLabels: {app: api}}}
            - {maxSkew: 1, topologyKey: kubernetes.io/hostname,
               whenUnsatisfiable: ScheduleAnyway, labelSelector: {matchLabels: {app: api}}}
          containers:
            - name: api
              resources:
                requests: {cpu: 250m, memory: 384Mi}
                limits: {memory: 512Mi}
              startupProbe:   {httpGet: {path: /healthz, port: http}, periodSeconds: 5, failureThreshold: 12}
              readinessProbe: {httpGet: {path: /readyz, port: http}, periodSeconds: 5, failureThreshold: 2}
              livenessProbe:  {httpGet: {path: /healthz, port: http}, periodSeconds: 10, failureThreshold: 3}
              lifecycle:
                preStop: {exec: {command: ["sh", "-c", "sleep 10"]}}

## Quality of service and eviction

The kubelet sorts Pods into three QoS classes from their resources:

- **Guaranteed** — every container has CPU and memory requests equal to its limits.
- **Burstable** — at least one request or limit, but not Guaranteed (the api above).
- **BestEffort** — nothing set at all.

When a node runs short of memory, the kubelet evicts BestEffort Pods first, then Burstable Pods using more than
they requested. A Pod with no requests is also invisible to the scheduler's arithmetic, so it gets packed onto
full nodes. Make defaults impossible to forget with a **LimitRange** (defaultRequest cpu 100m and memory 128Mi,
default memory limit 256Mi per container) and cap a team's namespace with a **ResourceQuota** (requests.cpu "16",
requests.memory 32Gi, pods "120"). Once a quota covers limits.memory, a Pod without a memory limit is rejected
unless the LimitRange supplies one.

## Graceful shutdown

When a Pod is deleted (rollout, scale-down, drain), two things start **at the same time**: the endpoints
controller removes it from the Service, and the kubelet runs the preStop hook, then sends **SIGTERM**. Load
balancers and kube-proxy on other nodes take a few seconds to notice, so for a moment requests still arrive at a
Pod that is shutting down — the classic source of 502s during deploys. The fix has three parts:

1. preStop sleeps a few seconds so routing catches up before SIGTERM (newer clusters offer a built-in sleep
   action, preStop: sleep: {seconds: 10}, so the image needs no shell).
2. The app handles SIGTERM: stop accepting, finish in-flight requests, close the DB pool, exit. Uvicorn and
   Gunicorn do this when they receive the signal; a shell script as PID 1 that does not forward signals does not.
3. terminationGracePeriodSeconds covers preStop plus the drain (45 s here); after it, SIGKILL.

## Spreading and disruption budgets

Four replicas on one node is one replica as far as availability goes. **topologySpreadConstraints** keep the
api balanced across AZs (hard: DoNotSchedule) and nodes (soft: ScheduleAnyway); podAntiAffinity is the older
tool for the same job.

A **PodDisruptionBudget** limits **voluntary** disruptions — kubectl drain, node upgrades, Karpenter
consolidation — not crashes:

    apiVersion: policy/v1
    kind: PodDisruptionBudget
    metadata: {name: api, namespace: clinic}
    spec:
      minAvailable: 3
      selector: {matchLabels: {app: api}}

With 4 replicas, a drain may evict one api Pod at a time. With 3 replicas and minAvailable: 3, a drain can never
evict any, and node upgrades hang — a PDB must leave room to move.

## Autoscaling, properly

    metrics:
      - {type: Resource, resource: {name: cpu, target: {type: Utilization, averageUtilization: 65}}}
      - {type: Resource, resource: {name: memory, target: {type: Utilization, averageUtilization: 80}}}
    behavior:
      scaleUp:
        stabilizationWindowSeconds: 0
        policies: [{type: Percent, value: 100, periodSeconds: 30}, {type: Pods, value: 4, periodSeconds: 30}]
        selectPolicy: Max
      scaleDown:
        stabilizationWindowSeconds: 300
        policies: [{type: Percent, value: 20, periodSeconds: 60}]

With several metrics, the HPA computes a desired count for each and takes the **largest**: 4 Pods at 130% CPU
and 50% memory give ceil(4 × 130 ÷ 65) = 8 and ceil(4 × 50 ÷ 80) = 3, so **8** (computed in Python). The
behaviour block shapes the speed: scale up fast (double, or +4, whichever is more, every 30 s), scale down
slowly (at most 20% a minute, after five calm minutes). The HPA only adds Pods; when they do not fit, they wait
Pending until the **Cluster Autoscaler** or **Karpenter** adds nodes — which takes a minute or more. For a
known 9 a.m. rush, raise minReplicas before it rather than hoping the autoscalers react in time. The Vertical
Pod Autoscaler, in recommendation mode, is a good way to find sensible requests from real usage.

## Rollouts you can trust

minReadySeconds: 10 makes a new Pod stay Ready for ten seconds before it counts as available, catching apps
that pass readiness and crash a moment later. progressDeadlineSeconds: 300 marks a stuck rollout as failed
(ProgressDeadlineExceeded) so CI can see it — Kubernetes does not roll back by itself. Then:

    kubectl rollout status deploy/api -n clinic --timeout=5m
    kubectl rollout history deploy/api -n clinic
    kubectl rollout undo deploy/api -n clinic --to-revision=7

revisionHistoryLimit keeps the old ReplicaSets that undo needs. Canary and blue-green releases come in
CL_CICD_GITOPS. (Manifests checked against the API models and the HPA arithmetic run in Python; nothing was run
on a cluster.)`,
    workedExample: `**Scenario.** On camp-booking day the api runs 10 Pods at 200% of requested CPU (target 65%), memory at
60% (target 80%), maxReplicas 30. How fast does it scale, and what else must be true for users to notice nothing?

**1. What the HPA wants.** ceil(10 × 200 ÷ 65) = ceil(30.8) = 31 for CPU; ceil(10 × 60 ÷ 80) = 8 for memory. The
larger wins: 31, capped by maxReplicas at 30.

**2. What the behaviour allows.** scaleUp policies are +100% or +4 Pods per 30 s, selectPolicy Max, so from 10
it may add max(10, 4) = 10. A small Python simulation of the rule (the same load spread over more Pods) printed:

    10 pods at 200% cpu wants 31
    t+30s -> 20
    t+60s -> 30

**3. Where the Pods go.** 20 more Pods × 250m = 5 vCPU and 20 × 384Mi ≈ 7.5 GiB of requests. If the nodes do not
have it, the new Pods are Pending and Karpenter or the Cluster Autoscaler adds nodes — a minute or more each
round. So the real scale-up time is node time, not HPA time.

**4. Make it boring.**
- Raise minReplicas to 16 at 08:30 IST on camp day (a CronJob or the pipeline can patch the HPA), so the rush
  starts on enough Pods.
- Keep a little headroom: a low-priority "placeholder" Deployment that real Pods pre-empt is a common trick.
- Check the ResourceQuota: requests.cpu "16" allows 64 api Pods at 250m, but other workloads share it.
- The PDB (minAvailable 3) and zone spread keep a node upgrade or an AZ issue from cutting capacity during the
  day; postpone upgrades anyway.

**5. After the rush.** The scale-down window (300 s) and 20%-a-minute policy bring it back gradually, so a second
wave after lunch does not find the service shrunk.

**Result.** The HPA arithmetic is the easy part; capacity, quotas and timing decide whether users notice.`,
    mcqs: [
      mcq('During every deploy, MediSlot\'s ALB logs a burst of 502s from Pods that are shutting down. The app handles SIGTERM correctly. What is the usual fix?', [
        ['A short preStop sleep so routing removes the Pod before SIGTERM', true],
        ['A longer livenessProbe period so old Pods are restarted less often', false],
        ['Setting maxSurge to 0 so that new Pods start only after old ones exit', false],
        ['Removing terminationGracePeriodSeconds so the Pods stop immediately', false],
      ], 'Endpoint removal and SIGTERM happen in parallel, and load balancers lag; a preStop sleep lets routing catch up. Liveness timing is unrelated to shutdown, maxSurge 0 reduces capacity without fixing the race, and removing the grace period kills in-flight requests sooner.'),
      mcq('A node needs draining for an upgrade. The api has 3 replicas and a PDB with minAvailable: 3. What happens?', [
        ['The drain cannot evict any api Pod and waits until it times out', true],
        ['The drain ignores the PDB because node upgrades are involuntary', false],
        ['The drain evicts all three at once and the PDB only logs a warning', false],
        ['The PDB adds a fourth replica automatically so the drain can go on', false],
      ], 'Evicting any Pod would breach minAvailable, so the eviction API refuses and the drain blocks. Drains are voluntary disruptions and do respect PDBs; PDBs block rather than warn, and they never change replica counts.'),
      mcq('An HPA has CPU (target 60%) and memory (target 75%) metrics. Five Pods run at 90% CPU and 30% memory. What replica count does it compute?', [
        ['8, the larger of the two metrics\' results', true],
        ['2, the smaller of the two metrics\' results', false],
        ['5, as the two metrics disagree on direction', false],
        ['10, the sum of the two metrics\' answers', false],
      ], 'Each metric gives a count — ceil(5 × 90 ÷ 60) = 8 and ceil(5 × 30 ÷ 75) = 2 — and the HPA takes the largest so no metric is starved. It does not take the minimum, freeze on disagreement, or add them.'),
    ],
    checkpoint: [
      mcq('Which QoS class does a Pod get when every container sets CPU and memory requests equal to its limits?', [
        ['Guaranteed, and it is the last class to be evicted', true],
        ['Burstable, as any Pod with limits set is in that class', false],
        ['BestEffort, as matching values cancel each other out', false],
      ], 'Requests equal to limits for CPU and memory in every container is the definition of Guaranteed, evicted last under node pressure. Burstable means some resources set but not all equal, and BestEffort means none set.'),
      mcq('A rollout of the api has been stuck for ten minutes with new Pods crashing. progressDeadlineSeconds is 300. What has Kubernetes done?', [
        ['Marked the rollout as failed, leaving the rollback to you or your pipeline', true],
        ['Rolled back to the previous ReplicaSet automatically after five minutes', false],
        ['Deleted the Deployment, since its rollout went past the progress deadline', false],
        ['Paused the HPA until a person approves the new ReplicaSet manually', false],
      ], 'Exceeding the deadline sets the Progressing condition to False with ProgressDeadlineExceeded; Kubernetes does not roll back by itself, so CI or a person runs rollout undo. It deletes nothing and does not touch the HPA.'),
      mcq('All four api replicas were scheduled into ap-south-1a, and an AZ problem took the api down. Which setting prevents this placement?', [
        ['A topology spread constraint on topology.kubernetes.io/zone with maxSkew 1', true],
        ['A PodDisruptionBudget with minAvailable: 3 for the api\'s Pod labels', false],
        ['A higher maxSurge so the rollouts create Pods in more than one zone', false],
        ['A LimitRange that gives every api container a default memory limit', false],
      ], 'Zone spread constraints make the scheduler balance replicas across AZs. A PDB limits voluntary evictions but not placement, maxSurge controls rollout speed, and a LimitRange sets resource defaults.'),
    ],
  },

  /* ── HELM ────────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_KUBERNETES_HELM',
    notes: `MediSlot now has about fifteen manifests per environment, and dev, staging and prod differ in a handful of
values: replicas, resources, hostnames, image tags. Copying the YAML three times guarantees they drift. **Helm**
packages the manifests as a **chart** of templates plus **values**, installs it as a named **release**, and keeps
a revision history you can roll back to.

## A chart's shape

    medislot/
      Chart.yaml            # name, chart version, appVersion
      values.yaml           # defaults, documented
      values-prod.yaml      # kept beside the chart or in the environment repo
      templates/
        _helpers.tpl        # named templates: labels, image names
        configmap.yaml
        api-deployment.yaml
        api-service.yaml
        api-hpa.yaml
        NOTES.txt           # printed after install

    # Chart.yaml
    apiVersion: v2
    name: medislot
    description: MediSlot clinic booking - api, worker and web
    type: application
    version: 0.3.0          # the chart's own version; bump it on every chart change
    appVersion: "3f9c2a1"   # the application version it deploys by default

## Templates

Templates are Go templates. The pieces you will use most: .Values, .Release.Name, .Chart, include for named
templates, toYaml with nindent for blocks, default, quote, required, if and range.

    # templates/_helpers.tpl
    {{- define "medislot.labels" -}}
    app.kubernetes.io/name: {{ .Chart.Name }}
    app.kubernetes.io/instance: {{ .Release.Name }}
    app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
    app.kubernetes.io/managed-by: {{ .Release.Service }}
    helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version }}
    {{- end }}

    # templates/api-deployment.yaml (the interesting lines)
    metadata:
      name: {{ .Release.Name }}-api
      labels:
        {{- include "medislot.labels" . | nindent 4 }}
        app.kubernetes.io/component: api
    spec:
      {{- if not .Values.api.autoscaling.enabled }}
      replicas: {{ .Values.api.replicas }}
      {{- end }}
      template:
        metadata:
          annotations:
            checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
        spec:
          containers:
            - name: api
              image: "{{ .Values.image.registry }}/medislot/api:{{ .Values.image.tag | default .Chart.AppVersion }}"
              resources:
                {{- toYaml .Values.api.resources | nindent 12 }}

Three details carry real weight:

- **replicas is omitted when the HPA is on.** Otherwise every helm upgrade resets the count to the chart's
  number and fights the autoscaler mid-rush.
- **The checksum annotation** changes whenever the ConfigMap's rendered content changes, which changes the Pod
  template and triggers a rollout — the fix for "I changed the config and nothing happened" from the previous
  lesson.
- **Selectors are immutable.** spec.selector of a Deployment cannot change after creation; put only stable labels
  (instance, component) in it, never the version.

For release medislot, the rendered Deployment starts like this (this output was written by hand from the
template and checked against the Kubernetes API models; helm itself was not run):

    metadata:
      name: medislot-api
      labels:
        app.kubernetes.io/name: medislot
        app.kubernetes.io/instance: medislot
        app.kubernetes.io/version: "3f9c2a1"
        app.kubernetes.io/managed-by: Helm
        helm.sh/chart: medislot-0.3.0
        app.kubernetes.io/component: api

## Values and their order

Values are merged, and the later source wins: the chart's values.yaml, then each -f file **in the order given**,
then --set flags. So helm upgrade ... -f values.yaml -f values-prod.yaml --set image.tag=4b1d9e0 deploys
prod settings with the tag from CI. Keep --set for the one or two values CI computes; everything else belongs in
a reviewed file. Mark values without a safe default with required ("ingress.host is required").

## The release lifecycle

    helm lint ./medislot -f values-prod.yaml
    helm template medislot ./medislot -n clinic -f values-prod.yaml > rendered.yaml   # review or validate
    helm upgrade --install medislot ./medislot -n clinic --create-namespace \\
        -f values-prod.yaml --set image.tag=4b1d9e0 --wait --timeout 5m
    helm history medislot -n clinic
    helm rollback medislot 6 -n clinic
    helm get values medislot -n clinic       # what was actually deployed
    helm uninstall medislot -n clinic

upgrade --install is idempotent: the same command installs or upgrades, which is what a pipeline wants. --wait
makes Helm wait for the resources to become ready, so a broken release fails the pipeline instead of reporting
success. Helm 3's --atomic also rolls back a failed upgrade (Helm 4 renamed some flags — check helm upgrade
--help for the version you use). Each revision is stored as a Secret in the release namespace
(sh.helm.release.v1.medislot.v7), so the history survives your laptop. helm rollback creates a **new** revision
with the old content; it does not rewind history, and it does not roll back your database migrations.

## Public charts, without trusting them blindly

Most teams install the ingress controller, cert-manager, External Secrets or a monitoring stack from public
charts. Treat each like a dependency:

- **Pin the chart version** (--version) and record it in Git; never install "whatever is latest" in CI.
- **Read before you install:** helm show values, and helm pull --untar to read the templates. Look for
  ClusterRoles, hostNetwork, privileged containers and webhooks.
- **Know where the images come from,** and mirror important ones into your ECR; public catalogues change their
  terms and images move.
- **Diff upgrades:** render the old and new versions with helm template and diff them (or use the helm-diff
  plugin) before touching the cluster.

Charts can be stored as OCI artefacts — ECR can hold them next to the images:

    aws ecr get-login-password --region ap-south-1 | helm registry login --username AWS \\
        --password-stdin 123456789012.dkr.ecr.ap-south-1.amazonaws.com
    helm push medislot-0.3.0.tgz oci://123456789012.dkr.ecr.ap-south-1.amazonaws.com/charts

Helm is not the only option: Kustomize (built into kubectl) patches plain YAML per environment without
templates. Many teams use Helm for third-party software and either one for their own apps. (Helm and the
commands here were written from the Helm documentation; no helm binary or cluster was available to run them.)`,
    workedExample: `**Scenario.** CI ran helm upgrade --install for MediSlot's prod release with -f values-prod.yaml -f
values.yaml. Prod came up with 1 replica, debug logging and the dev hostname. Then the on-call engineer tried
to fix it with kubectl edit. Untangle it.

**1. Read what was deployed.** helm get values medislot -n clinic --all shows the merged values: replicas 1,
logLevel debug, ingress.host book.dev.medislot.example. Those are values.yaml's defaults.

**2. Find why.** Values files merge in order and the **later file wins**. values.yaml came last, so it overrode
every prod setting. The order must be -f values.yaml -f values-prod.yaml (and since the chart already includes
values.yaml, passing it at all is unnecessary).

**3. Undo the hand edit.** kubectl edit changed replicas on the live Deployment. Helm will either overwrite or
fight it on the next upgrade; either way, Git no longer describes prod. Do not "fix forward" by hand.

**4. Recover.** helm history medislot -n clinic lists revision 6 (last good, deployed yesterday) and 7 (bad).
helm rollback medislot 6 -n clinic --wait creates revision 8 with revision 6's manifests. Users are back on the
right settings in minutes.

**5. Fix the pipeline.** Correct the -f order, add helm template plus a check in CI that fails if the rendered
prod Deployment's host is not book.medislot.example or its HPA minReplicas is below 4, and require review for
values-prod.yaml changes.

**6. Write it up.** The post-incident note records the root cause (file order), the detection gap (no check of
rendered output) and why kubectl edit was harmful.

**Result.** Helm made recovery a one-line rollback; the same rendered-output check that would have caught this
is cheap to add to every pipeline. (Commands written from the Helm documentation; not run.)`,
    mcqs: [
      mcq('The chart\'s Deployment template always sets replicas from values, and an HPA scales the api to 12 during a rush. A helm upgrade then runs. What happens?', [
        ['The upgrade resets replicas to the chart value, fighting the HPA', true],
        ['Helm reads the HPA first and keeps the current count of twelve Pods', false],
        ['The upgrade fails, because an HPA locks the replicas field for good', false],
        ['Nothing changes, since Helm never updates the field after install', false],
      ], 'Helm applies the rendered replicas, which drops the count until the HPA scales up again. Helm does not consult the HPA, the field is not locked, and upgrades do update it — which is why the template should omit replicas when autoscaling is on.'),
      mcq('MediSlot changes a value that only affects the ConfigMap template. Which chart pattern makes the Pods restart to pick up the change?', [
        ['A checksum/config annotation on the Pod template from the rendered ConfigMap', true],
        ['A bump of appVersion in Chart.yaml so Kubernetes notices the new release', false],
        ['Setting the ConfigMap to immutable so that Helm has to recreate the Pods', false],
        ['Running helm rollback to the previous revision and then upgrading again', false],
      ], 'The annotation changes when the ConfigMap content changes, which changes the Pod template and triggers a rolling update. appVersion is metadata unless templates use it, immutable ConfigMaps cannot be updated in place, and a rollback-then-upgrade is a roundabout outage risk.'),
      mcq('A pipeline runs helm upgrade -f values-prod.yaml --set image.tag=4b1d9e0, and values-prod.yaml also sets image.tag: 3f9c2a1. Which tag is deployed?', [
        ['4b1d9e0, because --set is applied after the values files', true],
        ['3f9c2a1, because files always win over --set on the command line', false],
        ['Neither; Helm stops with an error about conflicting image values', false],
      ], 'Values merge in order — chart defaults, then -f files in order, then --set — so the --set value wins. Helm does not prefer files and does not treat overrides as conflicts.'),
    ],
    checkpoint: [
      mcq('What does helm rollback medislot 6 do to the release history?', [
        ['Creates a new revision whose manifests match revision 6', true],
        ['Deletes revisions 7 and later and makes 6 current again', false],
        ['Restores the database to its state at revision 6\'s time', false],
        ['Reinstalls the release from scratch with chart version 6', false],
      ], 'A rollback is recorded as a new revision with the old content, so the history stays complete. Later revisions are kept, Helm knows nothing about database state, and "6" is a release revision, not a chart version.'),
      mcq('Before installing a public chart for cert-manager in production, which practice matters most?', [
        ['Pin the chart version and read its values and templates before installing', true],
        ['Install the latest version so that security fixes arrive on every deploy', false],
        ['Install into the default namespace so that its RBAC has the fewest rules', false],
        ['Set every value with --set so the chart\'s defaults can never take effect', false],
      ], 'A pinned, reviewed chart is a known dependency; reading templates shows its RBAC, webhooks and images. Floating to latest changes production without review, the namespace does not reduce RBAC, and --set for everything is unreviewable.'),
      mcq('Why should a Deployment template\'s spec.selector contain only stable labels such as instance and component?', [
        ['A Deployment\'s selector cannot be changed after it is created', true],
        ['Selectors with more labels make kube-proxy route more slowly', false],
        ['Helm refuses to template any label inside a selector block', false],
        ['Stable labels are needed for the checksum annotation to work', false],
      ], 'spec.selector is immutable on apps/v1 Deployments, so a version label there breaks the next upgrade. Routing speed is unaffected, Helm templates selectors fine, and the checksum annotation is independent of selectors.'),
    ],
  },

  /* ── EKS ─────────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_KUBERNETES_EKS',
    notes: `Everything so far runs on kind. **Amazon EKS** runs the Kubernetes control plane for you — API servers and
etcd spread over three AZs, patched and backed up by AWS — and plugs the cluster into AWS networking and IAM.
What stays yours: nodes (unless you hand those over too), add-on versions, upgrades, who can reach the API, and
which AWS permissions each Pod gets. Azure's equivalent is AKS.

## Creating a cluster

In a company the cluster comes from Terraform (CL_TERRAFORM). For a lab, eksctl reads a config file (written
from the eksctl documentation; not run here):

    apiVersion: eksctl.io/v1alpha5
    kind: ClusterConfig
    metadata: {name: medislot-dev, region: ap-south-1, version: "1.35"}
    iam: {withOIDC: true}
    managedNodeGroups:
      - {name: general, instanceType: t4g.medium, minSize: 2, maxSize: 4, desiredCapacity: 2,
         privateNetworking: true}
    addons:
      - {name: vpc-cni}
      - {name: coredns}
      - {name: kube-proxy}
      - {name: aws-ebs-csi-driver}
      - {name: eks-pod-identity-agent}

Choose a Kubernetes version that is in **standard support** on the EKS version calendar. The same through boto3,
against moto (mock AWS; real creation takes many minutes and moto says ACTIVE at once):

    cluster: medislot-prod 1.35 ACTIVE
    nodegroup: general-arm ACTIVE {'minSize': 2, 'maxSize': 6, 'desiredSize': 2} ON_DEMAND
    fargate profile: batch-jobs ACTIVE [{'namespace': 'batch', 'labels': {'compute': 'fargate'}}]
    ResourceInUseException - ... DeleteCluster operation: Cluster has nodegroups attached

## Where Pods run

    Option                Who manages the machines      Good for
    Managed node groups   EKS creates and updates ASGs   a predictable default
    Karpenter             launches right-sized nodes     mixed sizes, Spot, fast scale-up
    EKS Auto Mode         AWS manages nodes and add-ons  teams that want the least to run
    Fargate profiles      no nodes; one Pod per microVM  small batch or isolated workloads

Fargate on EKS has limits (no DaemonSets, no EBS-backed persistent volumes), so most clusters use nodes.

## Who can use the cluster

The API endpoint can be public (restrict publicAccessCidrs to the office and VPN), private, or both. People and
pipelines authenticate with IAM; **access entries** map an IAM role to Kubernetes permissions through the EKS
API, replacing the old, fragile aws-auth ConfigMap:

    aws eks create-access-entry --cluster-name medislot-prod \\
        --principal-arn arn:aws:iam::123456789012:role/medislot-developers
    aws eks associate-access-policy --cluster-name medislot-prod \\
        --principal-arn arn:aws:iam::123456789012:role/medislot-developers \\
        --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSViewPolicy \\
        --access-scope type=namespace,namespaces=clinic
    aws eks update-kubeconfig --region ap-south-1 --name medislot-prod

## Networking: Pods get VPC addresses

The **VPC CNI** gives every Pod a real IP from your subnet, so Pods are reachable from the VPC and ALBs can
target them directly. Two consequences. First, IPs run out: a /24 node subnet is far too small for a busy
cluster (CL1's "Designing a VPC" sized app subnets for exactly this). Second, an instance type caps Pods per
node by its ENIs: max Pods = ENIs × (IPv4 addresses per ENI − 1) + 2, which is 17 for a t3.medium or t4g.medium.
**Prefix delegation** assigns /28 prefixes instead of single IPs and raises that ceiling considerably.

## AWS permissions for Pods: IRSA and Pod Identity

Never put access keys in a Pod, and do not rely on the node's instance role — every Pod on the node would share
it. Give each service account its own role.

**IRSA** trusts the cluster's OIDC issuer for one service account. Against moto:

    trust = {"Effect": "Allow", "Principal": {"Federated": provider_arn},
             "Action": "sts:AssumeRoleWithWebIdentity",
             "Condition": {"StringEquals": {
                 issuer + ":sub": "system:serviceaccount:clinic:reminder-worker",
                 issuer + ":aud": "sts.amazonaws.com"}}}
    role: arn:aws:iam::123456789012:role/medislot-reminder-worker

    apiVersion: v1
    kind: ServiceAccount
    metadata:
      name: reminder-worker
      namespace: clinic
      annotations:
        eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/medislot-reminder-worker

A webhook injects a projected token and AWS_ROLE_ARN into Pods using that service account; boto3 picks them up
with no code change. Pods created before the annotation must be restarted.

**EKS Pod Identity** is the newer way: install the eks-pod-identity-agent add-on, give the role a trust policy for
the pods.eks.amazonaws.com service principal, and create an association (cluster, namespace, service account,
role) through the EKS API. No OIDC provider per cluster, and one role can serve several clusters. Prefer it for
new EC2-node clusters; IRSA remains common and works on Fargate.

## The AWS Load Balancer Controller

Installed with Helm and given its own IAM role, it turns an Ingress with ingressClassName: alb into an **ALB**,
and a LoadBalancer Service with the right annotations into an **NLB**:

    metadata:
      annotations:
        alb.ingress.kubernetes.io/scheme: internet-facing
        alb.ingress.kubernetes.io/target-type: ip
        alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
        alb.ingress.kubernetes.io/ssl-redirect: "443"
        alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:ap-south-1:123456789012:certificate/11111111-...
        alb.ingress.kubernetes.io/healthcheck-path: /readyz
    spec:
      ingressClassName: alb

target-type ip sends traffic straight to Pod IPs. The controller finds subnets by tags: kubernetes.io/role/elb = 1
on public subnets, kubernetes.io/role/internal-elb = 1 on private ones. alb.ingress.kubernetes.io/group.name lets
several Ingresses share one ALB.

## Upgrades

Kubernetes ships a minor version roughly three times a year, and EKS versions leave standard support after a
fixed window, then move to paid extended support. Upgrade one minor version at a time: control plane first, then
add-ons, then nodes (worked example).

## Cost and teardown

You pay an hourly fee per cluster (higher in extended support), plus nodes, NAT gateways, load balancers, EBS
volumes and cross-AZ traffic — check the EKS pricing page. Tear down in order: delete Ingresses and LoadBalancer
Services first so the controller removes the ALBs and NLBs, then node groups, then the cluster; then look for
orphans — load balancers, EBS volumes from Retain classes, ENIs. (moto ran the boto3 calls; eksctl, aws CLI,
Helm and kubectl lines were written from the documentation and not run.)`,
    workedExample: `**Scenario.** MediSlot's production cluster runs 1.34 with managed node groups, and 1.35 has been in standard
support for months. Plan and run the upgrade without users noticing.

**1. Read before you touch.** Read the Kubernetes 1.35 changelog's deprecations and the EKS upgrade notes. Find
manifests and Helm releases using removed APIs (tools such as pluto or kubent scan for them); the EKS console's
upgrade insights flag deprecated API calls too.

**2. Rehearse on staging.** Same versions, same charts. Run the smoke tests and a load test afterwards.

**3. Check the safety nets.** Every Deployment that matters has replicas ≥ 2, a PDB that allows at least one
eviction (minAvailable: 3 with 4 replicas, not 3 with 3) and zone spreading — node replacement is a series of
drains.

**4. Control plane.** aws eks update-cluster-version --name medislot-prod --kubernetes-version 1.35 (or the
Terraform change). The API stays available; the old nodes keep working because kubelets may lag the API server
by a few minor versions.

**5. Add-ons.** Update vpc-cni, coredns, kube-proxy and the EBS CSI driver to versions compatible with 1.35
(aws eks describe-addon-versions lists them), and update Helm-installed controllers such as the AWS Load
Balancer Controller.

**6. Nodes.** Update the managed node group to the 1.35 AMI. EKS launches new nodes, cordons and drains the old
ones respecting PDBs, and terminates them. Watch kubectl get nodes, kubectl get pods -A | grep -v Running, and
the api's error rate. With Karpenter, its drift handling replaces nodes to match the new AMI.

**7. Verify and record.** All nodes on 1.35, no Pending Pods, error rate flat. Write the date and the next upgrade
due date in the runbook — skipping upgrades is how teams land in extended support with a bigger bill and a
two-version jump.

**Result.** An EKS upgrade is three ordered steps (control plane, add-ons, nodes) made boring by PDBs, spreading
and a rehearsal. (Commands written from the AWS documentation; not run.)`,
    mcqs: [
      mcq('MediSlot\'s reminder worker needs SQS access on EKS. Which approach gives only that Pod the permission?', [
        ['A role for its service account, through IRSA or EKS Pod Identity', true],
        ['The SQS permission on the node group\'s instance role for all Pods', false],
        ['An IAM user\'s access keys stored in a Kubernetes Secret in clinic', false],
        ['A NetworkPolicy that allows egress from the worker to the SQS API', false],
      ], 'IRSA and Pod Identity map an IAM role to one service account, so only Pods using it get the permission. The node role is shared by every Pod on the node, long-lived keys are a leak waiting to happen, and NetworkPolicies control packets, not IAM permissions.'),
      mcq('A node group of t3.medium instances has plenty of free CPU and memory, but new Pods stay Pending with "Too many pods". What explains it?', [
        ['The VPC CNI\'s per-node Pod limit from ENIs and IPs has been reached', true],
        ['EKS limits every cluster to 17 Pods unless a quota increase is filed', false],
        ['The scheduler places at most one Pod per vCPU on each EKS worker node', false],
        ['Pending Pods wait for the control plane upgrade that EKS schedules', false],
      ], 'With the VPC CNI, each Pod takes a VPC IP, and an instance type supports a fixed number (17 for t3.medium) unless prefix delegation is on. The limit is per node, not per cluster, the scheduler has no per-vCPU rule, and Pending is unrelated to upgrades.'),
      mcq('Before deleting a lab EKS cluster, why delete its Ingresses and LoadBalancer Services first?', [
        ['So the controller deletes the ALBs and NLBs it created, rather than orphaning them', true],
        ['Because EKS refuses to delete a cluster that still has any Kubernetes objects inside', false],
        ['Because the load balancers would be moved into the default VPC and billed there', false],
      ], 'The load balancers were created by the controller running in the cluster; delete the cluster first and nothing remains to remove them, so they keep billing. EKS does not check for objects, and load balancers do not move VPCs.'),
    ],
    checkpoint: [
      mcq('Which statement about EKS access entries is correct?', [
        ['They map IAM principals to cluster permissions through the EKS API', true],
        ['They are rows that must be added to the aws-auth ConfigMap by hand', false],
        ['They give Pods AWS permissions in place of IRSA or Pod Identity', false],
        ['They are security group rules that open the cluster\'s API endpoint', false],
      ], 'Access entries, with access policies or Kubernetes RBAC groups, replace the aws-auth ConfigMap for mapping IAM roles and users to cluster access. They do not grant Pods AWS permissions, and network access to the endpoint is a separate setting.'),
      mcq('An Ingress with ingressClassName: alb produces no load balancer, and the controller logs say it cannot find subnets. What is the likely fix?', [
        ['Tag the public subnets with kubernetes.io/role/elb set to 1', true],
        ['Change the Ingress pathType from Prefix to Exact for all paths', false],
        ['Give the ALB a public IP through an annotation on the Service', false],
        ['Add the subnets to the cluster\'s Fargate profile selector list', false],
      ], 'The AWS Load Balancer Controller discovers subnets by tags (elb for internet-facing, internal-elb for internal) unless they are listed explicitly. Path types, Service annotations and Fargate profiles do not affect subnet discovery.'),
      mcq('In what order should an EKS cluster be upgraded from one minor version to the next?', [
        ['Control plane, then add-ons such as vpc-cni, then the node groups', true],
        ['Node groups, then the control plane, then the add-ons at the end', false],
        ['Add-ons first, then nodes, and the control plane upgrades itself', false],
        ['All three at the same moment, so that versions never differ at all', false],
      ], 'Nodes may run older than the control plane but not newer, so the control plane goes first; add-ons are moved to versions compatible with it, then nodes are replaced. EKS does not upgrade the control plane on its own schedule while standard support lasts.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_KUBERNETES_DEBUGGING',
    notes: `Six failures from MediSlot's move to containers. For each: the symptom, the cause, and the one change that
fixes it. The order of evidence is always the same — kubectl get (state), kubectl describe (events), kubectl logs
--previous (the app's last words), then the AWS side (IAM, target groups, ECS stopped reasons). The messages
below are the documented forms; there was no cluster to reproduce them on.

## 1. CrashLoopBackOff on the new Graviton nodes only

**Symptom.** After adding an arm64 node group, api Pods scheduled there crash at once; the x86 ones are fine.
kubectl logs --previous shows: exec /usr/local/bin/uvicorn: exec format error.

**Cause.** The image was built on an x86 laptop for linux/amd64 only. An arm64 node cannot execute it.

**Fix.** Build a multi-architecture image (docker buildx build --platform linux/amd64,linux/arm64 ... --push), so
the same tag serves both. Until then, a nodeSelector of kubernetes.io/arch: amd64 keeps the api off arm64 nodes.

## 2. CreateContainerConfigError after a secrets clean-up

**Symptom.** New api Pods never start. describe shows: Error: couldn't find key DB_PASSWORD in Secret
clinic/api-db.

**Cause.** The External Secrets mapping was tidied and now writes the key as db-password. The Deployment's
secretKeyRef still asks for DB_PASSWORD. Old Pods kept running because env vars were read at their start.

**Fix.** Make the two names agree — change the ExternalSecret's secretKey back, or the secretKeyRef — in one
reviewed change. kubectl get secret api-db -n clinic -o jsonpath='{.data}' lists the key names (and the values,
so mind who can run it).

## 3. OOMKilled, though "nobody set a limit"

**Symptom.** The worker restarts every few hours. describe shows Last State: Terminated, Reason: OOMKilled, Exit
Code: 137, and the Pod has limits.memory 256Mi that no one remembers writing.

**Cause.** The worker's manifest had no resources, so the namespace LimitRange supplied its default memory limit
(256Mi). The worker's peak while batching reminders is about 330Mi.

**Fix.** Measure (kubectl top pod over a busy hour, or the metrics in your dashboards) and set explicit requests
and a limit with headroom: requests.memory 256Mi, limits.memory 384Mi. Defaults are a safety net, not a sizing
decision.

## 4. AccessDenied from STS in the reminder worker

**Symptom.** On EKS the worker logs: An error occurred (AccessDenied) when calling the AssumeRoleWithWebIdentity
operation: Not authorized to perform sts:AssumeRoleWithWebIdentity.

**Cause.** The IRSA role's trust policy says ":sub": "system:serviceaccount:default:reminder-worker", but the
worker runs in namespace clinic. The token's subject does not match, so STS refuses.

**Fix.** Correct the condition to system:serviceaccount:clinic:reminder-worker. If instead boto3 says it cannot
find credentials at all, the service account annotation is missing or the Pods predate it — restart them.

## 5. A node drain that never finishes

**Symptom.** The managed node group update is stuck; kubectl drain repeats: Cannot evict pod as it would violate
the pod's disruption budget.

**Cause.** web runs 2 replicas with a PDB of minAvailable: 2. No eviction can ever be allowed.

**Fix.** Use maxUnavailable: 1 in the PDB (it keeps working as replicas change), or run 3 replicas. The drain
proceeds one Pod at a time and the replacement Pod starts on another node.

## 6. An ECS service that replaces healthy tasks for ever

**Symptom.** MediSlot's api on ECS: tasks start, run for about 40 seconds, and are stopped with "Task failed ELB
health checks". The app takes about 45 seconds to load its doctor schedule cache.

**Cause.** healthCheckGracePeriodSeconds is 0, and the target group checks every 10 seconds with an unhealthy
threshold of 3. The ALB marks each task unhealthy before it has finished starting, and ECS replaces it.

**Fix.** Set a grace period above the real start time (90 seconds), and make /healthz answer once the server is
up while /readyz-style logic covers the cache. The circuit breaker would have stopped the loop on a deployment —
but this was steady state, so it kept cycling.

## The habit

Each fix changed one thing, named by evidence: a log line, an event, a policy condition. Deleting Pods, raising
every limit or recreating the cluster until it works teaches nothing and usually hides the cause.`,
    mcqs: [
      mcq('api Pods crash with "exec format error" only on arm64 nodes. Which change fixes the cause rather than hiding it?', [
        ['Build and push a multi-architecture image for amd64 and arm64', true],
        ['Raise the Pods\' memory limit so the binary can load on arm64', false],
        ['Add a liveness probe so the crashing containers restart sooner', false],
        ['Delete the arm64 node group and run the cluster on x86 for good', false],
      ], 'The image contains only amd64 binaries; a multi-arch build makes the same tag run on both. Memory has nothing to do with the instruction set, probes cannot fix an unrunnable binary, and dropping Graviton avoids the bug at a permanent cost.'),
      mcq('A worker Pod is OOMKilled at a 256Mi limit, though its manifest sets no resources. Where did the limit most likely come from?', [
        ['A LimitRange in the namespace that applies a default memory limit', true],
        ['The kubelet, which caps every container at a quarter of node memory', false],
        ['The HPA, which sets limits on Pods when it scales the Deployment', false],
        ['The container image, which declares its memory limit in its labels', false],
      ], 'A LimitRange injects default requests and limits into containers that omit them. The kubelet has no such default cap, the HPA changes replica counts, and image labels do not set resource limits.'),
      mcq('An IRSA role is assumed fine in staging but fails with "Not authorized to perform sts:AssumeRoleWithWebIdentity" in prod, where the worker runs in namespace clinic. What should be checked first?', [
        ['The sub condition naming the namespace and service account', true],
        ['Whether the role has sqs:SendMessage on the reminders queue', false],
        ['Whether the node group\'s instance role trusts the OIDC issuer', false],
        ['Whether the Pod has a CPU request large enough for STS calls', false],
      ], 'The error is from assuming the role, so the trust policy is at fault, and its sub must match system:serviceaccount:clinic:<name>. SQS permissions matter after the role is assumed, the node role is not involved in IRSA, and CPU has no bearing on authorisation.'),
      mcq('kubectl drain keeps printing "Cannot evict pod as it would violate the pod\'s disruption budget" for web, which has 2 replicas. What is the best fix?', [
        ['Change the PDB to maxUnavailable: 1, or run more web replicas', true],
        ['Delete the PDB permanently, since PDBs block every node upgrade', false],
        ['Drain with a shorter timeout so the eviction is forced through', false],
        ['Scale web to 0 during the drain so there is nothing to evict', false],
      ], 'A PDB that equals the replica count forbids every eviction; maxUnavailable: 1 or extra replicas leaves room to move one Pod at a time. Deleting PDBs removes the protection, a timeout does not override the budget, and scaling to zero is an outage.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_KUBERNETES_PRACTICE',
    notes: `Nine exercises, easiest first. Answer each on paper before reading the answer. The arithmetic was checked in
Python; the manifests were checked against the Kubernetes API models.

## 1. Port words (easy)

The api listens on 8000 (port named http). Write the Service ports entry so clients use http://api, and name
what a NodePort would add.

**Answer.** ports: [{name: http, port: 80, targetPort: http}]. A NodePort Service would add nodePort (in
30000–32767), opening that port on every node's IP.

## 2. Which role? (easy)

On ECS, for each failure name the role to fix: (a) CannotPullContainerError: access denied; (b) the app's boto3
call to S3 gets AccessDenied; (c) the secret named in the task definition cannot be fetched.

**Answer.** (a) execution role; (b) task role; (c) execution role (plus kms:Decrypt if a customer key is used).

## 3. Two metrics (easy)

HPA targets: CPU 50%, memory 70%. Six Pods run at 80% CPU and 70% memory. Desired replicas?

**Answer.** CPU: ceil(6 × 80 ÷ 50) = ceil(9.6) = 10. Memory: ceil(6 × 70 ÷ 70) = 6. The larger wins: 10.

## 4. Budgets and drains (easy)

web has 5 replicas. How many may a drain evict at once with (a) minAvailable: 4; (b) maxUnavailable: 2;
(c) minAvailable: 5?

**Answer.** (a) 1; (b) 2; (c) none — the drain blocks.

## 5. QoS (medium)

Classify: (a) requests cpu 250m, memory 384Mi, limits memory 512Mi; (b) requests and limits both cpu 500m and
memory 1Gi; (c) no resources, in a namespace without a LimitRange.

**Answer.** (a) Burstable; (b) Guaranteed; (c) BestEffort — first to be evicted under memory pressure.

## 6. A policy for Redis (medium)

Namespace clinic already has default-deny ingress. Allow only the api and the worker to reach Redis on 6379.

**Answer.**

    apiVersion: networking.k8s.io/v1
    kind: NetworkPolicy
    metadata: {name: redis-from-api-and-worker, namespace: clinic}
    spec:
      podSelector: {matchLabels: {app: redis}}
      policyTypes: [Ingress]
      ingress:
        - from:
            - podSelector:
                matchExpressions: [{key: app, operator: In, values: [api, worker]}]
          ports: [{protocol: TCP, port: 6379}]

## 7. Pods per node (medium)

m5.large: 3 ENIs, 10 IPv4 addresses per ENI, VPC CNI without prefix delegation, 4 DaemonSet Pods per node. How
many nodes for 120 application Pods if IPs were the only limit? Each Pod requests 250m CPU and allocatable CPU
is a little under 2 vCPU per node — which limit binds?

**Answer.** Max Pods = 3 × (10 − 1) + 2 = 29; minus 4 DaemonSet Pods = 25; ceil(120 ÷ 25) = 5 nodes by IPs. CPU:
120 × 0.25 = 30 vCPU, about 16 nodes at roughly 1.9 vCPU each. CPU binds — plan for 16, not 5.

## 8. Which values win? (medium)

helm upgrade --install medislot ./medislot -f values-prod.yaml -f values-hotfix.yaml --set api.replicas=6. The
chart sets replicas 2, prod sets 4, hotfix sets 5. Result?

**Answer.** 6 — --set comes after all files. Without --set, 5 (the later file wins over prod).

## 9. Shutdown budget (harder)

preStop sleeps 10 s; the slowest booking request takes up to 30 s to finish after SIGTERM. Is
terminationGracePeriodSeconds: 30 enough? What should it be?

**Answer.** No. The grace period counts from the start of termination and includes preStop: 10 + 30 = 40 s, so
at 30 s the container is SIGKILLed with requests in flight. Use 45 s or more.`,
    mcqs: [
      mcq('Six Pods run at 80% CPU against a 50% target and 70% memory against a 70% target. What does the HPA ask for?', [
        ['10 replicas, from the CPU metric', true],
        ['6 replicas, from the memory metric', false],
        ['8 replicas, the mean of the two', false],
        ['16 replicas, the sum of the two', false],
      ], 'CPU gives ceil(6 × 80 ÷ 50) = 10, memory gives 6, and the HPA takes the larger. It never averages or adds the per-metric results.'),
      mcq('A Pod sets requests of cpu 250m and memory 384Mi and a memory limit of 512Mi. What is its QoS class?', [
        ['Burstable', true],
        ['Guaranteed', false],
        ['BestEffort', false],
      ], 'It sets resources, so it is not BestEffort, but requests do not equal limits for both CPU and memory, so it is not Guaranteed. That leaves Burstable.'),
      mcq('On m5.large nodes (29 Pod IPs each) with 4 DaemonSet Pods per node and 250m CPU requests per app Pod, 120 app Pods are planned. What decides the node count?', [
        ['CPU requests, at about 16 nodes, far above the 5 the IPs need', true],
        ['Pod IPs, at 5 nodes, because the IP limit is always the binding one', false],
        ['DaemonSets, at 30 nodes, because each one needs a node of its own', false],
        ['Memory requests, which the scheduler checks before IPs and CPU', false],
      ], '30 vCPU of requests needs about 16 nodes with just under 2 allocatable vCPU each, while IPs allow 25 app Pods per node (5 nodes). DaemonSets run one Pod per node rather than needing their own, and memory was not the constraint given.'),
      mcq('preStop sleeps 10 s and requests need up to 30 s to drain after SIGTERM. Which terminationGracePeriodSeconds is safe?', [
        ['45, since the period covers preStop plus the drain', true],
        ['30, since the period starts only after preStop ends', false],
        ['10, since SIGTERM itself waits for requests to end', false],
      ], 'The grace period includes the preStop hook, so 10 + 30 = 40 s is the minimum and 45 leaves margin. It does not start after preStop, and SIGTERM is a request to stop, not a wait.'),
      mcq('With -f values-prod.yaml -f values-hotfix.yaml and no --set, prod sets api.replicas 4 and hotfix sets 5. What is deployed?', [
        ['5 replicas, since the later file overrides the earlier one', true],
        ['4 replicas, since the prod file is the first one listed', false],
        ['2 replicas, since the chart\'s default in values.yaml wins', false],
      ], 'Values files merge left to right, with later files overriding earlier ones, and both override the chart\'s values.yaml.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_KUBERNETES_INTERVIEW_QUESTION',
    notes: `Asked in DevOps, SRE and cloud engineer interviews at product companies, GCCs and start-ups in Bengaluru,
Hyderabad and Pune. Say each answer aloud in about two minutes, then compare. Interviewers listen for whether
you reason from how the system works, and whether you collect evidence before changing things.

## Q1. "What happens when you run kubectl apply -f deployment.yaml?"

**Model answer.** "kubectl sends the object to the API server, which authenticates me, checks RBAC, runs admission
— defaults, policies, quotas — and stores it in etcd. Nothing else is called directly; controllers watch. The
Deployment controller creates a ReplicaSet for this Pod template; the ReplicaSet controller creates the Pod
objects; the scheduler filters and scores nodes on requests, taints, affinity and volume zones, and binds each
Pod; the kubelet on that node pulls the image through containerd, starts the containers and runs the probes.
When readiness passes, the EndpointSlice controller adds the Pod to its Services, and kube-proxy routes to it."

**Follow-up.** "The Pod is Pending. Where do you look?" — "kubectl describe pod: the FailedScheduling event says
why — insufficient CPU or memory requests, an untolerated taint, a volume in another AZ, or too many Pods per
node with the VPC CNI. Then I fix that cause or add capacity."

## Q2. "ECS or EKS — what would you choose for us?"

**Model answer.** "It depends on the team and the workloads. ECS on Fargate is simpler: no control plane to
upgrade, no nodes, IAM roles per task, rolling deploys with a circuit breaker. For a small team running ordinary
APIs and workers on AWS only, that is usually the right call. EKS is worth its overhead when we need portability,
the Kubernetes ecosystem — Helm charts, operators, Argo CD — or a shared platform for many teams. With EKS we
take on upgrades every year, add-on versions, and a cluster bill. I would ask how many services and teams, and
whether anyone already runs Kubernetes well."

**Follow-up.** "We picked EKS. What is your first-week checklist?" — "Access entries instead of aws-auth, a
restricted public endpoint, IRSA or Pod Identity for workloads, the Load Balancer Controller, EBS CSI, metrics
server and an autoscaler, default requests by LimitRange, PDBs and spread constraints for critical services, and
a written upgrade plan."

## Q3. "A Pod is in CrashLoopBackOff. Walk me through it."

**Model answer.** "CrashLoopBackOff means it starts and exits, and the kubelet backs off between restarts. I run
kubectl logs --previous to see the crashed container's output, and describe for the exit code and events. Exit
137 with OOMKilled is the memory limit — measure and resize. 1 with a stack trace is the app — often a missing
setting or an unreachable dependency at start. 'exec format error' is the wrong CPU architecture. If the
container is killed by a liveness probe while starting, I add a startupProbe instead of a longer delay. I change
one thing and watch."

**Follow-up.** "The logs are empty." — "Then it dies before logging: check the command and args, a missing file
or ConfigMap key, permissions as a non-root user, or use kubectl debug with an ephemeral container to inspect."

## Q4. "How does a Pod on EKS get access to an S3 bucket?"

**Model answer.** "Not with access keys, and not through the node's instance role, which every Pod on that node
would share. I create an IAM role with only the S3 actions on that bucket's ARN and bind it to the Pod's service
account — with EKS Pod Identity, an association through the EKS API, or with IRSA, a trust policy on the
cluster's OIDC provider whose sub condition names the namespace and service account, plus the role-arn
annotation. The SDK picks up the credentials automatically, and they are temporary."

**Follow-up.** "It says AccessDenied on AssumeRoleWithWebIdentity." — "That is the trust policy, not the S3
policy: usually the sub names the wrong namespace or service account, or the audience is wrong."`,
    mcqs: [
      mcq('In an answer to "what happens on kubectl apply", which statement would an interviewer mark as wrong?', [
        ['The API server tells the kubelet directly to start the new containers', true],
        ['Controllers watch the API server and act on changes in desired state', false],
        ['The scheduler binds Pods to nodes but does not start any containers', false],
        ['Objects are stored in etcd after authentication and admission pass', false],
      ], 'Kubelets watch the API server for Pods bound to their node; the API server does not push commands. The other three statements describe the watch-based design correctly.'),
      mcq('Asked "ECS or EKS?", which answer shows the judgement interviewers look for?', [
        ['It depends on team size and needs; ECS is simpler, EKS adds ecosystem', true],
        ['Always EKS, because ECS is being retired by AWS in favour of EKS', false],
        ['Always ECS, because EKS cannot run in the AWS Mumbai region yet', false],
        ['Whichever is cheaper this month, as both have the same features', false],
      ], 'A strong answer weighs operational overhead against ecosystem and portability for the specific team. ECS is not being retired, EKS runs in ap-south-1, and the two differ in features and in operating cost.'),
      mcq('A candidate says a crashing Pod with exit code 137 and reason OOMKilled needs "a longer liveness probe delay". What is the better answer?', [
        ['Measure memory use and raise the memory limit to fit the real peak', true],
        ['Add a CPU limit so the container uses memory more slowly at start', false],
        ['Switch the container to a smaller base image to reduce its memory', false],
        ['Add more replicas so each Pod handles less load and less memory', false],
      ], 'OOMKilled means the container exceeded its memory limit, which probes cannot change; size the limit from measurement. A CPU limit throttles rather than saving memory, image size is disk not RAM, and more replicas help only if memory scales with load per Pod.'),
    ],
  },

  /* ── MINI_PROJECT ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_KUBERNETES_MINI_PROJECT',
    notes: `## The scenario

**MediSlot** (fictional) books appointments at 40 clinics across Hyderabad and Vijayawada. Patients choose a
doctor and a 15-minute slot, pay a booking fee by UPI, and get an SMS reminder 24 hours before. Today the whole
thing runs as one process on a single VM, and on Monday mornings — when clinics open the week's slots — it slows
to a crawl; last month a deploy during the rush caused ten minutes of failed bookings. The founders want it on
Kubernetes, with a path to EKS. You are the engineer who makes that happen.

The app is already split into three services in the starter repository (or write minimal ones yourself — any
language, a few dozen lines each):

- **api** — HTTP on port 8000: GET /slots?doctor=..., POST /bookings, GET /healthz, GET /readyz. Talks to
  PostgreSQL and Redis (slot holds expire after 10 minutes).
- **worker** — reads due reminders and "sends" them (logs a line; no real SMS). Talks to PostgreSQL.
- **web** — a static front end served by nginx on port 80 that calls /api.

## Requirements (and what they mean)

- "Monday mornings must not slow down." An HPA on the api with sensible requests, and a load test that shows it
  scaling.
- "No more failed bookings during deploys." Readiness gating, maxUnavailable 0, a graceful shutdown (preStop
  plus SIGTERM handling), and a PDB.
- "One clinic's data must never be visible to anyone outside." The api is reachable only through the ingress;
  Redis and PostgreSQL only from the services that need them (NetworkPolicies, tested).
- "We will move to AWS next quarter." A Helm chart with per-environment values, and a written EKS plan.
- "No surprise bills." Everything runs on kind on your laptop; nothing in this project needs an AWS account.

## Data you are given

- Monday 09:00–10:00 IST: about 15 times the normal request rate for 40 minutes.
- Measured on a laptop: one api process uses about 180 MB at rest and 300 MB under load, and starts in about
  8 seconds (it loads the week's doctor schedule).
- PostgreSQL holds patients' names and phone numbers. In the cluster it is acceptable for this project (a
  StatefulSet with a PVC and the official postgres image); in production it will be RDS.

## Deliverables

1. **Images** — a Dockerfile per service: small base, non-root user, tagged by commit SHA, built for amd64 and
   arm64 with buildx (Year 3's "An Image Fit for Production" standard).
2. **Manifests, then a chart** — namespace clinic; Deployments for api, worker and web with requests, a memory
   limit, the right probes (startup for the api), preStop and a grace period; Services; an Ingress (or
   Gateway API HTTPRoute) routing / to web and /api to api; ConfigMap and Secret (values not committed — a
   .example file and a script to create the Secret); Redis and PostgreSQL with PVCs; HPA with a behaviour block;
   PDBs; zone and node topology spread; a LimitRange and ResourceQuota; default-deny NetworkPolicies plus the
   allows the design needs. Then the same as a Helm chart, medislot, with values.yaml, values-dev.yaml and
   values-prod.yaml, the checksum annotation, and replicas omitted when the HPA is on.
3. **A manifest check in Python** — check_manifests.py renders the chart (helm template) and, with PyYAML,
   fails if any container lacks a CPU request or memory limit, any image tag is latest or missing, any
   Deployment's selector does not match its Pod labels, any Service targetPort names a port that does not
   exist, or any Pod lacks a readiness probe. Show it catching a planted mistake.
4. **Evidence on kind** — a three-node kind cluster (config committed). Show: rollout status; the HPA scaling
   during a load test (hey, k6 or a Python script) with kubectl get hpa -w output; a deploy during load with
   zero failed requests (count them); a NetworkPolicy test from a throwaway Pod that is refused and one that is
   allowed; a node stopped with docker stop and the api still answering; helm rollback after a deliberately bad
   release.
5. **EKS plan (EKS.md)** — what changes on AWS: ECR repositories and lifecycle policies; managed node groups or
   Karpenter and why; ingressClassName alb with the annotations you need; IRSA or Pod Identity for the worker
   (which AWS calls, which role, the trust policy); the EBS CSI driver and a gp3 StorageClass for anything
   stateful — or, better, RDS and ElastiCache instead, with the reason; access entries for the team; subnet
   sizes for Pod IPs; the upgrade procedure; a cost section built from the pricing pages and calculator; and the
   teardown order.
6. **README** — architecture diagram, how to run it from a clean laptop in under 15 minutes, decisions and
   trade-offs, what you would do differently with more time.

## Milestones

- **Day 1 — containers.** Three images, multi-arch, running locally with docker compose or kind.
- **Day 2 — manifests.** Everything in clinic on kind; probes, resources, Services and Ingress working.
- **Day 3 — reliability.** HPA, PDBs, spread, graceful shutdown; the load test and the deploy-under-load test.
- **Day 4 — safety and packaging.** NetworkPolicies (tested), quota and limits; the Helm chart; the manifest
  check in CI (a GitHub Actions workflow running it on every pull request).
- **Day 5 — evidence and the EKS plan.** Node-failure and rollback demonstrations; EKS.md; README.

## How it will be judged

A reviewer will clone the repository, follow the README on a clean machine, run the manifest check, and ask
"why" about every number: why this request, this limit, this PDB, this grace period. A smaller system where
every value is explained scores higher than a larger one copied from a tutorial. Never commit real secrets,
kubeconfigs or AWS account ids — use 123456789012 and obvious placeholders.`,
    assignment: {
      title: 'MediSlot on Kubernetes: Three Services, a Helm Chart and a Path to EKS',
      description: 'Containerise a three-service clinic-booking app (api, worker, web), run it on a local kind cluster with production-shaped manifests — probes, resources, autoscaling, disruption budgets, spreading, graceful shutdown and network policies — package it as a Helm chart with a Python manifest check, prove its behaviour under load and failure, and write the plan for running it on Amazon EKS.',
      instructions: `1. Build non-root, commit-tagged, multi-architecture images for api, worker and web.
2. Write manifests for namespace clinic: Deployments with requests, memory limits, startup/readiness/liveness probes as appropriate, preStop and a grace period; Services; Ingress or HTTPRoute; ConfigMap and a Secret created by script (no real values committed); Redis and PostgreSQL with PVCs; an HPA with a behaviour block; PDBs; zone and node topology spread; a LimitRange and ResourceQuota; default-deny NetworkPolicies and the required allows.
3. Package everything as the Helm chart medislot with values.yaml, values-dev.yaml and values-prod.yaml, a checksum annotation for configuration, and no replicas field when autoscaling is on.
4. Write check_manifests.py that renders the chart and fails on a missing CPU request or memory limit, a latest or missing image tag, a selector that does not match Pod labels, a Service targetPort that names no container port, or a missing readiness probe; show it catching a planted mistake, and run it in CI on every pull request.
5. On a three-node kind cluster, record evidence: the HPA scaling under a load test, a deploy during load with zero failed requests, NetworkPolicy tests (one refused, one allowed), the api surviving a stopped node, and a helm rollback of a deliberately bad release.
6. Write EKS.md covering ECR, node strategy, the ALB Ingress, IRSA or Pod Identity for the worker, storage or managed-service choices, access entries, Pod IP subnet sizing, upgrades, a cost estimate from the pricing pages and calculator, and the teardown order.
7. Write the README: diagram, clean-machine setup in under 15 minutes, decisions and trade-offs, and what you would improve.`,
      rubric: [
        { criterion: 'Images and manifests', description: 'Small non-root multi-arch images tagged by commit; correct Services and Ingress; probes chosen for each service\'s behaviour; requests and limits justified from the measured numbers; configuration and secrets handled without committing values.', maxPoints: 20 },
        { criterion: 'Reliability', description: 'HPA with a reasoned behaviour block, PDBs that allow drains, zone and node spread, graceful shutdown with preStop and SIGTERM handling, and a deploy under load with zero failed requests shown.', maxPoints: 20 },
        { criterion: 'Network and resource safety', description: 'Default-deny NetworkPolicies with only the needed allows, tested from throwaway Pods; LimitRange and ResourceQuota sized sensibly; nothing exposed except through the ingress.', maxPoints: 15 },
        { criterion: 'Helm chart and manifest check', description: 'A clean chart with per-environment values, helpers, checksum annotation and HPA-aware replicas; check_manifests.py catches each listed mistake and runs in CI.', maxPoints: 20 },
        { criterion: 'Evidence on kind', description: 'Real output for scaling, node failure, NetworkPolicy tests and helm rollback, each explained in a sentence or two.', maxPoints: 10 },
        { criterion: 'EKS plan and README', description: 'A concrete, correct EKS plan (identity, load balancing, storage choices, IP sizing, upgrades, cost, teardown) and a README that gets a reviewer running in 15 minutes.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
    mcqs: [
      mcq('MediSlot\'s api takes about 8 seconds to start and must never receive traffic before it has loaded the doctor schedule. Which probe setup fits?', [
        ['A startupProbe for start-up, and a readinessProbe that passes once the schedule is loaded', true],
        ['A livenessProbe with a 60-second initial delay and no readiness probe on the container', false],
        ['A readinessProbe only, since a startupProbe would restart the api while it is loading', false],
        ['No probes, since maxUnavailable: 0 already stops traffic reaching Pods that are starting', false],
      ], 'Readiness keeps traffic away until the schedule is loaded, and a startup probe protects slow starts from liveness. A long liveness delay hides hangs and still sends traffic early, startup probes do not restart a Pod that is within its allowance, and maxUnavailable says nothing about readiness.'),
      mcq('The EKS plan must give the reminder worker access to an SQS queue. Which line belongs in EKS.md?', [
        ['A role with sqs actions on that queue only, bound to the worker\'s service account', true],
        ['An IAM user for the worker, whose keys are stored in the Helm chart\'s values-prod.yaml', false],
        ['The SQS permissions added to the node role so that every Pod can send reminders', false],
      ], 'Binding a narrowly scoped role to the worker\'s service account (IRSA or Pod Identity) gives temporary credentials to that workload alone. Keys in values files leak, and the node role grants the permission to every Pod on the node.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_KUBERNETES_CHECKPOINT',
    notes: `Ten questions across the topic: ECR and ECS, the Kubernetes control plane, Services and networking,
configuration and storage, reliability, Helm and EKS. Answer without notes; the result shows which lesson to
revisit.`,
    checkpoint: [
      ck('CONTAINERS_DOCKER', 'An ECS task stops with "ResourceInitializationError: unable to pull secrets or registry auth" before the app starts. Which two areas should be checked?', [
        ['The execution role\'s permissions and the network path to ECR and Secrets Manager', true],
        ['The task role\'s permissions and the application\'s own database connection string', false],
        ['The service\'s desired count and the deployment circuit breaker\'s rollback setting', false],
        ['The ALB\'s health check path and the health check grace period on the service', false],
      ], 'The failure happens before the container runs, which is ECS\'s own work: pulling the image and fetching secrets with the execution role over the network. The task role and app settings matter after start, and desired count, circuit breakers and health checks act on running tasks.'),
      ck('CONTAINERS_DOCKER', 'Why do teams tag images with the commit SHA in an ECR repository that has immutable tags?', [
        ['A tag then always refers to one image, so every task runs the same code', true],
        ['Immutable tags make ECR scan images faster and skip unchanged layers', false],
        ['ECR charges no storage for images whose tags can never be overwritten', false],
      ], 'An immutable commit tag pins exactly what runs and makes rollbacks precise. Tag mutability does not change scanning speed or storage billing.'),
      mcq('Which component chooses the node for a new Pod?', [
        ['The kube-scheduler', true],
        ['The kubelet on the node', false],
        ['The ReplicaSet controller', false],
        ['kube-proxy on the node', false],
      ], 'The scheduler filters and scores nodes and binds the Pod. The ReplicaSet controller creates the Pod object, the kubelet starts containers for Pods already bound to its node, and kube-proxy handles Service routing.'),
      mcq('A Pod in namespace billing calls MediSlot\'s api Service in namespace clinic. Which name resolves correctly?', [
        ['api.clinic', true],
        ['api.billing', false],
        ['clinic-api', false],
        ['api.svc.clinic', false],
      ], 'Service DNS is <service>.<namespace>.svc.cluster.local, and the search path lets a Pod use <service>.<namespace>. api.billing looks in the caller\'s namespace, and the other two are not names CoreDNS serves.'),
      mcq('A NetworkPolicy is applied in a cluster and has no effect at all; traffic it should block still flows. What is the most likely cause?', [
        ['The cluster\'s CNI plugin does not enforce NetworkPolicy objects', true],
        ['NetworkPolicies take effect only after every Pod is restarted', false],
        ['The policy needs a matching Service before it selects any Pods', false],
        ['NetworkPolicies only apply to traffic that comes from the internet', false],
      ], 'Policies are implemented by the CNI; without support they are stored and ignored. They apply to running Pods without restarts, select Pods by labels rather than through Services, and cover in-cluster traffic.'),
      mcq('An api reads its feature flags from a ConfigMap mounted with subPath. After the ConfigMap changes, the file in the Pods never updates. Why?', [
        ['subPath mounts are not updated; the Pods need a rollout to see changes', true],
        ['ConfigMaps can only be changed by deleting and recreating the namespace', false],
        ['The kubelet updates mounted files only when the node itself is rebooted', false],
        ['Files from ConfigMaps are copied into the image when the Pod is created', false],
      ], 'Ordinary ConfigMap volume mounts are refreshed after a delay, but subPath mounts never are, so a rollout (for example via a checksum annotation) is the reliable path. ConfigMaps can be edited, no reboot is needed, and images are not modified.'),
      mcq('Under memory pressure on a node, which Pods does the kubelet evict first?', [
        ['BestEffort Pods, which set no requests or limits', true],
        ['Guaranteed Pods, which hold the most reserved memory', false],
        ['The Pods that were most recently scheduled on the node', false],
        ['Pods with a PodDisruptionBudget, as they have replacements', false],
      ], 'BestEffort Pods go first, then Burstable Pods above their requests; Guaranteed Pods are protected longest. Scheduling order is not the rule, and PDBs govern voluntary evictions such as drains, not node-pressure eviction.'),
      mcq('An HPA scales the api from 4 to 12 Pods, but 6 of the new Pods stay Pending. What must also be in place for the scale-up to complete?', [
        ['A node autoscaler such as Karpenter or the Cluster Autoscaler', true],
        ['A higher maxReplicas value on the HorizontalPodAutoscaler', false],
        ['A PodDisruptionBudget so that new Pods are allowed to start', false],
        ['A startupProbe, without which the scheduler will not place Pods', false],
      ], 'The HPA creates Pods; when they do not fit, only added nodes let them schedule. maxReplicas already allowed 12, PDBs limit evictions, and probes run after scheduling.'),
      mcq('A pipeline passes -f values-prod.yaml -f values.yaml to helm upgrade, and production gets the dev hostname. What is the fix?', [
        ['Pass values-prod.yaml last, or drop values.yaml, since later files win', true],
        ['Use --atomic so that Helm picks the production values automatically', false],
        ['Bump the chart version so Helm reloads values-prod.yaml from scratch', false],
        ['Run helm rollback before every upgrade to clear the merged values', false],
      ], 'Values files merge in order and the last one wins, so the defaults overrode prod; the chart already includes values.yaml. --atomic, version bumps and rollbacks do not change the merge order.'),
      mcq('A Pod on EKS must read one S3 bucket. Which setup follows AWS\'s guidance?', [
        ['A role scoped to that bucket, bound to the Pod\'s service account', true],
        ['The node instance role with S3 read access for the whole account', false],
        ['Access keys for a dedicated IAM user stored as a Kubernetes Secret', false],
        ['A bucket policy that allows reads from the cluster\'s VPC CIDR only', false],
      ], 'IRSA or Pod Identity gives that workload temporary credentials for a narrowly scoped role. The node role is shared by all Pods, static keys can leak and do not rotate, and a VPC-wide bucket policy grants every workload in the VPC.'),
    ],
  },
];
