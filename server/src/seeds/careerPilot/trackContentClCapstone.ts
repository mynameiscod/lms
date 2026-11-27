/**
 * Career-track content: Capstone: A Production Platform (CL_CAPSTONE), Cloud & DevOps Engineer, batch CL3 — the
 * track's capstone. Nothing is re-taught; every unit points back to the lesson that taught the idea.
 *
 * The student scopes, builds, operates, presents and defends a production platform for one product: Terraform for
 * the AWS foundation, the app in containers on Kubernetes (kind every day, EKS in time-boxed sessions; ECS on
 * Fargate is an accepted alternative), a GitHub Actions pipeline with OIDC, scans, signing and an Argo Rollouts
 * canary, Prometheus/Grafana and CloudWatch, two SLOs with burn-rate alerts, a game day and its postmortem, a cost
 * report, and a disaster-recovery copy of the critical path on Azure (Central India). Option A (recommended, load
 * profile provided) is SaleSutra, a fictional Jaipur handloom and handicrafts marketplace with festival sale days;
 * Option B is an ed-tech results-day platform, Option C a tele-consultation and lab-report platform.
 *
 * Cost and safety run through every unit: a budget alarm before anything is created, hourly-billed pieces only in
 * sessions that end with a destroy, a nightly teardown workflow as a backstop, and a teardown checklist with a
 * leftovers script as the last deliverable. Account 123456789012, every key, hostname (*.example) and id are fake.
 * No prices are quoted: the notes teach which pieces bill by the hour and send students to the pricing pages.
 *
 * Verified by running, in the scratch venv: the budget, CloudWatch alarm, log-retention and leftovers scripts with
 * boto3 1.43 against moto 5.2 (outputs quoted are real; moto starts alarms in OK where AWS starts them in
 * INSUFFICIENT_DATA); the FastAPI metrics middleware with prometheus_client through TestClient; the SLO, burn-rate,
 * capacity, session-hours, game-day (a simulated minute series, labelled so) and DR-drill arithmetic in Python.
 * Every HCL block was parsed with python-hcl2 and every Kubernetes, Argo and GitHub Actions document with PyYAML
 * (keys checked against the documented schema); none was applied or run — there was no AWS or Azure account, no
 * Terraform binary, no cluster and no GitHub runner. The Locust file was compiled, not run (no target). AWS, az,
 * kubectl, Helm and kind commands were written from the documentation.
 *
 * Attribution: the topic is [INFRA_AS_CODE, KUBERNETES, CI_CD, OBSERVABILITY, SLI_SLO], default INFRA_AS_CODE;
 * BUILD_PLATFORM declares INFRA_AS_CODE and KUBERNETES, BUILD_OPERATE OBSERVABILITY and SLI_SLO. Checkpoint
 * questions on a skill other than INFRA_AS_CODE name it with ck(); questions drawn from the networking, IAM,
 * database and cost lessons are tagged with the capstone skill they exercise.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const K8S = 'KUBERNETES';
const CICD = 'CI_CD';
const OBS = 'OBSERVABILITY';
const SLO = 'SLI_SLO';

export const TRACK_CL_CAPSTONE_BUNDLES: PilotBundle[] = [
  /* ── BRIEF ─────────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_CAPSTONE_BRIEF',
    notes: `**A platform hiring panel does not ask whether you know what Terraform is. It asks you to push a bad commit
and show the platform stop it — then asks what the last month of running it cost.** This capstone gives you that
demo. You will build the platform for one real-looking product as code, ship the product through a pipeline you
would trust, run it to written SLOs, break it on purpose, recover a copy on a second cloud, and then defend all of
it to a panel.

You have every piece already. CL1 gave you the account, IAM, networks, compute, storage and databases (AWS
Foundations, AWS Networking, AWS Compute and Storage, AWS Databases). CL2 gave you Serverless on AWS, Containers and
Kubernetes, Infrastructure as Code and CI/CD and GitOps. CL3 gave you Observability and SRE, Cloud Security and Cost
and Azure for AWS Engineers. The capstone joins them into one working platform, and nothing in it is new.

## Three products, one standard

| | **Option A — SaleSutra (recommended, load profile provided)** | **Option B — an ed-tech platform** | **Option C — a health-tech platform** |
|---|---|---|---|
| Who | A fictional Jaipur marketplace for handloom and handicrafts sellers | Mock tests and results for 2 lakh exam aspirants | Tele-consultations and lab reports for a clinic chain |
| The spike | The Diwali sale: about 10× normal traffic for two hours | Results day: most students arrive in the first ten minutes | Monday mornings; otherwise steady |
| Critical path | Browse, cart, checkout (orders-api), order worker | Log in, see result, download scorecard | Book a slot, upload and read a lab report |
| What hurts most | Checkout failing in the sale hour | A results page that will not load on results day | A report shown to the wrong patient; data leaving India |
| The hard question | "Your checkout canary failed at 10%. Did any customer notice?" | "Results go live at 10:00. When did you scale, and why then?" | "Your DR copy is on Azure. Which region, and who said that was allowed?" |

All three are graded on the same rubric. **Option A is recommended**: it has a sharp, predictable spike, money on
the critical path and a queue between checkout and fulfilment, so every part of the track has something to do.
Option C must keep every copy of data in India (ap-south-1 or ap-south-2 on AWS, Central India on Azure) and say
why in writing. **No real customer or patient data** in any option: seed data is synthetic.

## The product you run

Keep the application small; the platform is what is graded. SaleSutra has three services and two stores of state:

- **storefront** — the web front end; reads the catalogue through orders-api.
- **orders-api** — FastAPI: GET /products/{id}, POST /orders, /healthz/ready, /healthz/live and /metrics.
- **worker** — reads order messages from an SQS queue, reserves stock and writes the order status back.
- **PostgreSQL** (RDS in AWS, a container on kind) and **SQS** (LocalStack or moto's server mode on your laptop).

Write the services yourself in a day, or reuse MediSlot's three services from the Kubernetes mini project.

## SLOs, fixed before you build

| SLO | Indicator | Objective (28-day window) |
|---|---|---|
| Checkout availability | POST /orders responses that are not 5xx, measured at the service | 99.5% |
| Checkout latency | POST /orders served in under 800 ms | 95% |
| Order processing | Orders confirmed by the worker within 2 minutes of being queued | 99% |

A 99.5% objective leaves an error budget of 0.5%. At SaleSutra's normal volume — about 1.2 million checkouts in 28
days — that is 6,000 failed checkouts. The same five-minute outage costs 2.5% of the budget on a normal afternoon
(0.5 checkouts a second) and 25% in the sale hour (5 a second): **when** you break things matters as much as how
long. Keep this arithmetic in a small \`slo.py\` in your repository, so the panel can rerun it.

## The budget, and the shape of the bill

Your own account, ap-south-1 (Mumbai), a **budget alarm created before anything else**, and nothing left running
between sessions. AWS changed its Free Tier for accounts opened from July 2025 (credits, and a free or paid plan);
older accounts have the 12-month Free Tier. Read your account's Free Tier and Billing pages before you plan
sessions, and price each item with the AWS Pricing Calculator — this capstone quotes no prices because they change.

| Bills while it exists (hourly) | Bills by use | Not in this capstone |
|---|---|---|
| EKS control plane, worker nodes, NAT gateway, ALB, RDS instance, public IPv4 addresses, interface endpoints | S3, SQS, ECR storage, CloudWatch Logs ingestion and storage, Secrets Manager secrets | Multi-AZ RDS, a NAT per AZ, Shield Advanced, a second always-on region |

Everything in the first column lives in one Terraform stack you **apply at the start of a session and destroy at
the end**. Eight four-hour sessions are 32 billable hours per hourly item; leaving them up for a month is 720 hours,
22.5 times more. Kubernetes work happens on **kind** on your laptop every day, and on EKS only in sessions. If your
budget is tight, ECS on Fargate is accepted in place of EKS (Containers on AWS: ECR, ECS and Fargate); say so in
DECISIONS.md. Azure works the same way: the DR copy exists only for the drill, then the resource group is deleted.

## The reference architecture

    GitHub: app repo ── PR: tests, Trivy, terraform plan, checkov ──► merge
              │ main: build once, push to ECR by git sha, cosign sign
              ▼
    gitops repo (env values) ──► Argo CD ──► EKS (shop namespace)
                                              Argo Rollouts canary + analysis on Prometheus
    Route 53 (failover) ──► ALB ──► storefront, orders-api ──► RDS PostgreSQL (private subnets)
                                          │ SQS orders queue ──► worker
    Prometheus + Grafana + Alertmanager (in cluster) | CloudWatch alarms (RDS, SQS) | Budgets
    hourly pg_dump ──► Azure Blob (Central India) ──► DR drill: Postgres flexible server + App Service
    Terraform: bootstrap (state, budget, OIDC) | foundation (ECR, SQS, S3) | platform (session) | azure-dr

## Milestones (about five weeks part-time)

| Milestone | Done when |
|---|---|
| M1 — Plan | PLATFORM.md: requirements, SLOs, architecture, cost shape, session plan, risks, what is out of scope |
| M2 — Foundation | Budget alarm, state bucket with locking, OIDC roles, foundation stack applied; app running on kind |
| M3 — Delivery | PR checks, image build and signing, Argo CD and a canary that aborts a bad release by itself |
| M4 — Operate | Dashboards, SLO burn-rate alerts, a load test, a game day and its postmortem, a cost report |
| M5 — Recover and defend | Azure DR drill with measured RPO and RTO, full teardown verified, a rehearsed demo |

## Risks to write down on day one

1. **The bill.** A forgotten NAT gateway or cluster bills every hour. The budget alarm, session discipline and
   the nightly teardown are the controls.
2. **Credentials.** No access keys anywhere: OIDC for the pipeline, IAM Identity Center or short-lived sessions for
   you (Roles, Temporary Credentials and IAM Identity Center).
3. **Lab is not production.** Single-AZ RDS, one NAT, spot nodes and re-seeded data are lab decisions. Write the
   production setting next to each one.
4. **The spike is on the calendar.** Scaling that starts when it arrives is late (Reliability Patterns and
   Capacity Planning).

## What "done" means

A reviewer clones the repositories, reads PLATFORM.md and DECISIONS.md, runs \`terraform plan\` and sees the
infrastructure described; watches your recording of a bad release being stopped by the canary; opens the dashboard
and the postmortem; reads the cost report and knows what production would cost; and sees the leftovers script print
nothing after your final teardown.`,
    workedExample: `**A one-page PLATFORM.md for Option A (abridged).**

**Product.** SaleSutra (fictional): 1,800 sellers, about 40 requests a second to orders-api on a normal day, 10× for
two hours in the Diwali sale. Checkout writes an order and puts a message on SQS; the worker reserves stock.

**SLOs.** Checkout availability 99.5% and checkout latency 95% under 800 ms, both over 28 days, measured at the
service; order processing 99% within 2 minutes. Burn-rate pages at 2% of budget in an hour and 5% in six hours.

**Architecture.** ap-south-1, two AZs. VPC with public, private and database subnets; one NAT gateway (lab). EKS
with a managed node group on spot instances (lab), the AWS Load Balancer Controller, Argo CD and Argo Rollouts,
kube-prometheus-stack. RDS PostgreSQL, single-AZ (lab; Multi-AZ in production). SQS with a dead-letter queue.

**Delivery.** PRs run tests, Trivy, helm lint and terraform plan; main builds once, pushes by git sha to ECR and
signs with cosign. Argo CD deploys from the gitops repo; prod promotion is a pull request; Rollouts canaries 10% then
50% with analysis on checkout errors and p95 latency.

**Recovery.** RDS automated backups in region. Hourly pg_dump to Azure Blob in Central India. Drill target: RPO 60
minutes, RTO 60 minutes for browse and checkout on Azure App Service with Azure Database for PostgreSQL.

**Cost.** Budget alarm at 50% and 80% actual and 100% forecast. Session stack applied for at most one day at a time;
nightly teardown workflow at 23:00 IST as a backstop. Everything tagged Project=salesutra and Session=<date>.

**Session plan.** S1 foundation and first EKS apply; S2 pipeline and Argo CD; S3 canary and a forced rollback; S4
dashboards and load test; S5 game day; S6 DR drill; S7 demo rehearsal; S8 demo, then the final teardown.

**Not doing:** Multi-AZ RDS, a service mesh, a second always-on region, real payment integration (a stub returns
success or a configurable failure), real customer data.`,
    mcqs: [
      mcq('A student planning SaleSutra wants to leave the EKS cluster, NAT gateway and ALB running for the whole five weeks "so nothing breaks between sessions". What should PLATFORM.md say instead?', [
        ['Put them in one session stack that is applied at the start and destroyed at the end of each session', true],
        ['Keep them running but scale the node group to zero overnight, since nodes are the only hourly charge', false],
        ['Move them to ap-south-2, because a newer region bills less for idle resources than Mumbai does', false],
        ['Leave them running and raise the budget limit, so the alarm does not fire during the capstone', false],
      ], 'The EKS control plane, NAT gateway and ALB bill every hour they exist, whether or not nodes run. A session stack keeps billable hours near 32 instead of 720. Raising the alarm limit silences the control instead of fixing the cause.'),
      mcq('Why does the SaleSutra brief measure checkout availability at the service rather than by pinging the home page every minute?', [
        ['The SLO is about checkout requests users send; a ping of the home page says nothing about failed orders', true],
        ['Prometheus cannot scrape a home page, so a ping-based indicator would need a paid monitoring tool', false],
        ['Pinging every minute would use up the SQS free requests, since the home page writes a message each time', false],
        ['Home-page pings are always 200 on Kubernetes, because readiness probes hide every failing Pod', false],
      ], 'An SLI should count the events users care about, as SLIs, SLOs and Error Budgets taught: real checkout requests that succeed. A home-page ping can stay green while every order fails. The other options invent limits that do not exist.'),
      mcq('The same five-minute checkout outage costs SaleSutra 2.5% of its 28-day error budget on a normal afternoon and 25% in the sale hour. What does that teach about the game day?', [
        ['Run it at a planned, low-traffic time on staging, and plan sale-day changes as freezes', true],
        ['Run it in the sale hour, since that is when the error budget is largest and can absorb it', false],
        ['Run it at any time, because error budgets are measured in minutes, not in requests', false],
        ['Skip it before the sale, since any experiment would use up the whole error budget', false],
      ], 'A request-based budget is spent by failed requests, so the same outage costs ten times more at ten times the traffic. Experiments go where the blast radius is small, and the sale hour is frozen. Skipping the game day leaves the failure to be found in the sale.'),
    ],
    checkpoint: [
      mcq('SaleSutra\'s platform must be rebuilt from nothing in each session. Which Terraform layout makes that cheap and safe?', [
        ['Separate stacks: bootstrap and foundation stay, the hourly-billed platform stack is applied and destroyed', true],
        ['One stack for everything, destroyed each night, including the state bucket and the budget alarm with it', false],
        ['One workspace per session, each with its own copy of the VPC, cluster and database for comparison', false],
        ['No Terraform for the session pieces; create them in the console because they only live a few hours', false],
      ], 'Splitting by lifecycle (Modules, Environments and Workspaces) lets the expensive layer come and go while state, the budget and OIDC roles stay. Destroying the state bucket with the rest loses the record of what exists; console-built resources cannot be destroyed reliably.'),
      ck(SLO, 'SaleSutra sets a 99.5% checkout availability SLO over 28 days and expects 1.2 million checkouts. How many failed checkouts does the error budget allow?', [
        ['6,000', true],
        ['600', false],
        ['60,000', false],
        ['201', false],
      ], '0.5% of 1,200,000 is 6,000. 600 would be a 99.95% objective and 60,000 a 95% one; 201 is the number of minutes a time-based 0.5% budget allows in 28 days, a different measure.'),
      ck(CICD, 'The brief says the pipeline must have "no access keys anywhere". How does GitHub Actions get into SaleSutra\'s AWS account?', [
        ['OIDC federation: the workflow assumes a role whose trust policy names the repository and environment', true],
        ['An IAM user\'s access key stored as an encrypted repository secret and rotated every ninety days by a script', false],
        ['The root user\'s credentials kept in GitHub environment secrets, protected by required reviewers', false],
        ['A self-hosted runner in the VPC with an admin instance profile shared by every repository', false],
      ], 'GitHub Actions to AWS with OIDC: short-lived credentials, scoped by the token\'s sub claim, nothing to leak. A rotated key is still a long-lived secret, root must never be used, and a shared admin runner gives every repository full access.'),
    ],
  },

  /* ── BUILD_PLATFORM ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_CAPSTONE_BUILD_PLATFORM',
    notes: `**The build half of the platform: a budget alarm first, then the AWS foundation in Terraform, the product in
containers on Kubernetes, and a pipeline that builds once, scans, signs and releases by canary — stopping a bad
release on its own.** The skills come from Infrastructure as Code (state, modules, Terraform in a Pipeline),
Containers and Kubernetes (Probes, Resources, Autoscaling and Rollouts, Packaging with Helm, Amazon EKS) and CI/CD
and GitOps (GitHub Actions to AWS with OIDC, Securing the Pipeline, Release Strategies, GitOps with Argo CD).

## The repositories

    salesutra-platform/                     salesutra-gitops/
      PLATFORM.md  DECISIONS.md  SESSIONS.md    envs/staging/values.yaml
      infra/bootstrap/   state bucket, OIDC     envs/prod/values.yaml
      infra/foundation/  ECR, SQS, S3           apps/  (Argo CD Applications)
      infra/platform/    VPC, EKS, RDS (session)
      infra/azure-dr/    (next unit)
      services/  storefront/ orders-api/ worker/
      charts/salesutra/  Helm chart (Rollout, Services, Ingress, HPA, PDB)
      .github/workflows/ ci.yml deploy.yml nightly-teardown.yml
      ops/  leftovers.py  runbooks/  (next unit: slo/, gameday/, cost/)

## Step 0 — The budget alarm, before anything else

Create it in the console or with boto3 before Terraform exists, then bring it under Terraform later with an import
block. \`budget.py\`, run against moto (mock AWS) — the email address is fake, and the amount is your own cap in the
currency your account's budgets use:

    budgets = boto3.client("budgets", region_name="us-east-1")
    subs = [{"SubscriptionType": "EMAIL", "Address": "salesutra-alerts@example.com"}]
    budgets.create_budget(
        AccountId=account,
        Budget={"BudgetName": "salesutra-capstone-monthly", "BudgetLimit": {"Amount": "10", "Unit": "USD"},
                "TimeUnit": "MONTHLY", "BudgetType": "COST"},
        NotificationsWithSubscribers=[
            {"Notification": {"NotificationType": "ACTUAL", "ComparisonOperator": "GREATER_THAN",
                              "Threshold": 50, "ThresholdType": "PERCENTAGE"}, "Subscribers": subs},
            # ... the same at 80 ACTUAL, and at 100 FORECASTED
        ],
    )

    salesutra-capstone-monthly MONTHLY COST {'Amount': '10', 'Unit': 'USD'}
      ACTUAL GREATER_THAN 50 PERCENTAGE
      ACTUAL GREATER_THAN 80 PERCENTAGE
      FORECASTED GREATER_THAN 100 PERCENTAGE

A forecast alert warns before the money is spent; billing data lags by hours, so the budget is a backstop, not a
brake. Confirm the subscription email arrives (A Safe AWS Account: Root, MFA, Budgets and Free Tier).

## Step 1 — Bootstrap and foundation

**bootstrap/** creates the state bucket (versioned, encrypted, Block Public Access on), the GitHub OIDC provider and
three roles: \`gha-salesutra-plan\` (read-only, trusted by pull requests), \`gha-salesutra-build\` (push to ECR,
trusted by main) and \`gha-salesutra-teardown\` (destroy the session stack, trusted only by the lab-teardown
environment). Its own state is local the first time, then migrated with \`terraform init -migrate-state\` (State,
Remote Backends and Locking). Every other stack starts like this (parsed with python-hcl2, not applied):

    terraform {
      required_version = ">= 1.11"
      required_providers {
        aws = { source = "hashicorp/aws", version = "~> 6.0" }
      }
      backend "s3" {
        bucket       = "salesutra-tfstate-123456789012"
        key          = "platform/terraform.tfstate"
        region       = "ap-south-1"
        encrypt      = true
        use_lockfile = true
      }
    }

    provider "aws" {
      region = "ap-south-1"
      default_tags {
        tags = { Project = "salesutra", Stack = "platform", Owner = "your-name", ManagedBy = "terraform" }
      }
    }

**foundation/** holds what is cheap to keep: ECR repositories (scan on push, immutable tags, a lifecycle rule keeping
the last 20 images), the SQS queue with its dead-letter queue, and a private S3 bucket for product images.

## Step 2 — The session stack: network, cluster, database

**platform/** is everything that bills by the hour. Registry modules are pinned to a major version and read before
use; input names change between majors (the EKS module renamed most of its inputs in v21 — read its upgrade guide).
Parsed with python-hcl2, not applied:

    module "vpc" {
      source  = "terraform-aws-modules/vpc/aws"
      version = "~> 6.0"

      name             = "salesutra"
      cidr             = "10.40.0.0/16"
      azs              = ["ap-south-1a", "ap-south-1b"]
      public_subnets   = ["10.40.0.0/24", "10.40.1.0/24"]
      private_subnets  = ["10.40.10.0/24", "10.40.11.0/24"]
      database_subnets = ["10.40.20.0/24", "10.40.21.0/24"]

      enable_nat_gateway  = true
      single_nat_gateway  = true   # lab: one NAT; production has one per AZ (DECISIONS.md D3)
      public_subnet_tags  = { "kubernetes.io/role/elb" = 1 }
      private_subnet_tags = { "kubernetes.io/role/internal-elb" = 1 }
    }

    module "eks" {
      source  = "terraform-aws-modules/eks/aws"
      version = "~> 21.0"

      name                                     = "salesutra"
      kubernetes_version                       = var.kubernetes_version
      vpc_id                                   = module.vpc.vpc_id
      subnet_ids                               = module.vpc.private_subnets
      endpoint_public_access                   = true
      endpoint_public_access_cidrs             = [var.my_ip_cidr]
      enable_cluster_creator_admin_permissions = true

      addons = {
        vpc-cni                = { before_compute = true }
        coredns                = {}
        kube-proxy             = {}
        eks-pod-identity-agent = { before_compute = true }
      }

      eks_managed_node_groups = {
        lab = {
          instance_types = ["t3.medium", "t3a.medium"]
          capacity_type  = "SPOT"   # lab: interruptions are acceptable; production uses on-demand
          min_size       = 2
          max_size       = 3
          desired_size   = 2
        }
      }
    }

The API endpoint is public but limited to your own IP; production would make it private. The database sits in the
database subnets and only the nodes' security group may reach it:

    resource "aws_db_instance" "orders" {
      identifier                  = "salesutra-orders"
      engine                      = "postgres"
      engine_version              = "16"
      instance_class              = var.db_instance_class
      allocated_storage           = 20
      storage_encrypted           = true
      db_name                     = "orders"
      username                    = "salesutra_admin"
      manage_master_user_password = true
      db_subnet_group_name        = module.vpc.database_subnet_group_name
      vpc_security_group_ids      = [aws_security_group.db.id]
      publicly_accessible         = false
      multi_az                    = false   # lab; production is Multi-AZ (D4)
      backup_retention_period     = 1
      skip_final_snapshot         = true    # synthetic data, re-seeded every session (D5)
    }

    resource "aws_vpc_security_group_ingress_rule" "db_from_nodes" {
      security_group_id            = aws_security_group.db.id
      referenced_security_group_id = module.eks.node_security_group_id
      ip_protocol                  = "tcp"
      from_port                    = 5432
      to_port                      = 5432
    }

\`manage_master_user_password\` keeps the password in Secrets Manager, never in state as plain text or in a tfvars
file (KMS, Encryption and Secrets Manager). Choose the smallest instance class your account's free offer covers.
Pods reach SQS through EKS Pod Identity — an \`aws_eks_pod_identity_association\` for the shop/orders-api and
shop/worker service accounts, each role allowing only its own queue actions (Amazon EKS).

## Step 3 — The product on Kubernetes

Develop every day on **kind** — \`kind create cluster --config kind.yaml\` with one control-plane and two worker
nodes — with PostgreSQL in a container and SQS from LocalStack or moto's server mode (check LocalStack's current
terms for its free edition). Install metrics-server so the HPA works. The Helm chart renders, for orders-api, a
**Rollout** instead of a Deployment, so the same chart canaries in staging and prod (parsed with PyYAML, not run):

    apiVersion: argoproj.io/v1alpha1
    kind: Rollout
    metadata:
      name: orders-api
      namespace: shop
    spec:
      revisionHistoryLimit: 3
      selector:
        matchLabels:
          app.kubernetes.io/name: orders-api
      template:
        metadata:
          labels:
            app.kubernetes.io/name: orders-api
        spec:
          serviceAccountName: orders-api
          containers:
            - name: orders-api
              image: 123456789012.dkr.ecr.ap-south-1.amazonaws.com/salesutra/orders-api:4b1d9e0
              ports:
                - name: http
                  containerPort: 8000
              readinessProbe:
                httpGet: {path: /healthz/ready, port: http}
                periodSeconds: 5
              livenessProbe:
                httpGet: {path: /healthz/live, port: http}
                periodSeconds: 10
              resources:
                requests: {cpu: 250m, memory: 256Mi}
                limits: {memory: 512Mi}
      strategy:
        canary:
          canaryService: orders-api-canary
          stableService: orders-api-stable
          trafficRouting:
            alb:
              ingress: orders-api
              servicePort: 80
          steps:
            - setWeight: 10
            - analysis:
                templates:
                  - templateName: checkout-canary
                args:
                  - name: canary-hash
                    valueFrom:
                      podTemplateHashValue: Latest
            - setWeight: 50
            - pause: {duration: 10m}

On kind there is no ALB: leave \`trafficRouting\` out and Rollouts approximates the weight with replica counts. The
chart also renders an HPA whose scaleTargetRef is the Rollout (apiVersion argoproj.io/v1alpha1, min 2, max 8, CPU
60%), a PodDisruptionBudget, topology spread across zones, and no \`replicas\` field while the HPA is on.

**The analysis.** The canary's Pods carry a \`rollouts-pod-template-hash\` label; the ServiceMonitor copies it
onto the metrics (\`podTargetLabels\`, next unit) so the query can judge the canary alone:

    apiVersion: argoproj.io/v1alpha1
    kind: AnalysisTemplate
    metadata:
      name: checkout-canary
      namespace: shop
    spec:
      args:
        - name: canary-hash
      metrics:
        - name: checkout-error-ratio
          interval: 1m
          count: 5
          failureLimit: 1
          successCondition: len(result) > 0 && result[0] <= 0.005
          provider:
            prometheus:
              address: http://kube-prometheus-stack-prometheus.monitoring.svc:9090
              query: |
                sum(rate(http_requests_total{route="/orders",method="POST",code=~"5..",rollouts_pod_template_hash="{{args.canary-hash}}"}[2m]))
                /
                sum(rate(http_requests_total{route="/orders",method="POST",rollouts_pod_template_hash="{{args.canary-hash}}"}[2m]))
        - name: checkout-p95-seconds
          interval: 1m
          count: 5
          failureLimit: 1
          successCondition: len(result) > 0 && result[0] <= 0.8
          provider:
            prometheus:
              address: http://kube-prometheus-stack-prometheus.monitoring.svc:9090
              query: |
                histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{route="/orders",method="POST",rollouts_pod_template_hash="{{args.canary-hash}}"}[2m])))

The thresholds are the SLOs, not numbers picked for the demo. With no checkout traffic the ratio is NaN, which does
not satisfy the condition, so the analysis fails: drive synthetic checkouts (the Locust file, next unit) at staging
during every canary.

## Step 4 — The pipeline

**ci.yml (pull requests):** ruff and pytest; docker build; Trivy on the image, failing on fixable CRITICAL and HIGH;
helm lint and a schema check of the rendered chart; \`terraform fmt -check\`, \`validate\` and \`plan\` with the
read-only role, the plan posted on the PR; checkov on the Terraform. **deploy.yml (main)** builds once and promotes
the same digest (parsed with PyYAML, not run):

    name: deploy
    on:
      push:
        branches: [main]
    permissions:
      contents: read
    concurrency:
      group: deploy-salesutra
      cancel-in-progress: false
    jobs:
      build:
        runs-on: ubuntu-latest
        permissions:
          contents: read
          id-token: write
        outputs:
          digest: \${{ steps.push.outputs.digest }}
        steps:
          - uses: actions/checkout@v4
          - uses: aws-actions/configure-aws-credentials@v4
            with:
              role-to-assume: arn:aws:iam::123456789012:role/gha-salesutra-build
              aws-region: ap-south-1
          - id: ecr
            uses: aws-actions/amazon-ecr-login@v2
          - id: push
            uses: docker/build-push-action@v6
            with:
              context: services/orders-api
              push: true
              tags: \${{ steps.ecr.outputs.registry }}/salesutra/orders-api:\${{ github.sha }}
          - uses: sigstore/cosign-installer@v3
          - run: cosign sign --yes "\${{ steps.ecr.outputs.registry }}/salesutra/orders-api@\${{ steps.push.outputs.digest }}"
      promote-staging:
        needs: build
        runs-on: ubuntu-latest
        environment: staging
        steps:
          - id: app-token
            uses: actions/create-github-app-token@v1
            with:
              app-id: \${{ vars.GITOPS_APP_ID }}
              private-key: \${{ secrets.GITOPS_APP_KEY }}
              repositories: salesutra-gitops
          - uses: actions/checkout@v4
            with:
              repository: salesutra/salesutra-gitops
              token: \${{ steps.app-token.outputs.token }}
          - run: |
              yq -i '.ordersApi.image.tag = "\${{ github.sha }}"' envs/staging/values.yaml
              git config user.name "salesutra-deploy-bot"
              git config user.email "deploy-bot@salesutra.example"
              git commit -am "staging: orders-api \${{ github.sha }}"
              git push

Argo CD syncs staging from the gitops repo; **production is a pull request** in the gitops repo that copies the
same tag into envs/prod, reviewed by someone else. The GitHub App token can write only to the gitops repository;
the workflow never holds cluster credentials — Argo CD pulls. The cosign step needs \`id-token: write\` (keyless
signing uses the workflow's OIDC token), which the build job has.

## Step 5 — The nightly teardown, a backstop

Sessions end with a destroy you run yourself; this workflow catches the night you forget (parsed with PyYAML, not run):

    name: nightly-teardown
    on:
      schedule:
        - cron: "30 17 * * *"   # 23:00 IST
      workflow_dispatch:
    permissions:
      contents: read
      id-token: write
    concurrency:
      group: terraform-platform
      cancel-in-progress: false
    jobs:
      destroy:
        runs-on: ubuntu-latest
        environment: lab-teardown
        steps:
          - uses: actions/checkout@v4
          - uses: aws-actions/configure-aws-credentials@v4
            with:
              role-to-assume: arn:aws:iam::123456789012:role/gha-salesutra-teardown
              aws-region: ap-south-1
          - uses: hashicorp/setup-terraform@v3
          - name: Remove what Kubernetes created outside Terraform
            run: |
              if aws eks describe-cluster --name salesutra >/dev/null 2>&1; then
                aws eks update-kubeconfig --name salesutra
                kubectl delete applications --all -n argocd --wait=true
                kubectl delete namespace shop monitoring --ignore-not-found --wait=true
              fi
          - name: Destroy the session stack
            working-directory: infra/platform
            run: |
              terraform init -input=false
              terraform destroy -auto-approve -input=false
          - name: List anything still billing
            run: pip install --quiet boto3 && python ops/leftovers.py

Cron times are UTC, and scheduled runs can start late. The Argo CD applications go first, or self-heal puts the
workloads back; deleting the namespaces then removes the Ingresses and PVCs, and with them the ALB and the EBS
volumes, which the AWS Load Balancer Controller and the EBS CSI driver created — not Terraform. Destroy the cluster
first and they are orphaned and billing. The same \`concurrency\` group as the platform pipeline stops a destroy racing an apply.

## Deliverables

1. The two repositories above; PLATFORM.md from the Brief; DECISIONS.md with every lab-versus-production choice.
2. The budget alarm (screenshot of the confirmed subscription) and SESSIONS.md: date, start, end, destroyed yes/no.
3. Terraform for bootstrap, foundation and platform; a \`terraform plan\` output; a successful apply and destroy.
4. The chart, running on kind and on EKS (or ECS), with probes, requests, HPA, PDB and the Rollout.
5. ci.yml, deploy.yml and nightly-teardown.yml; links to a PR run with the plan and scan results.
6. A recording of a deliberately bad release (it returns 5xx on 5% of checkouts) aborted by the analysis, with the
   Rollout's status before and after.

## Acceptance checks

- No access key exists for any IAM user (\`aws iam list-access-keys\` shows none), and no secret is in Git.
- \`terraform plan\` on a fresh clone with the remote backend shows no changes after an apply.
- A PR that opens the database security group to 0.0.0.0/0 on 5432 is failed by the policy check before review
  (write a custom checkov or OPA policy if no built-in check covers that rule).
- Reverting the gitops commit restores the previous version without running the pipeline.
- After a session, \`python ops/leftovers.py\` prints nothing.

## Common traps

- **Destroying the cluster before its load balancers.** Orphaned ALBs and target groups keep billing.
- **\`latest\` tags.** Immutable tags and git-sha tags make "what is running" a question with one answer.
- **ServiceMonitor ignored.** kube-prometheus-stack selects ServiceMonitors by its release label by default.
- **Plan role that can apply.** The PR role is read-only; anything else lets a PR from a branch change production.`,
    mcqs: [
      mcq('SaleSutra\'s first teardown ran terraform destroy on the platform stack and finished cleanly, yet the next day\'s bill still showed a load balancer. What went wrong?', [
        ['The ALB was created by the AWS Load Balancer Controller for an Ingress, not by Terraform', true],
        ['terraform destroy skips load balancers unless -target names each one of them explicitly', false],
        ['The state lock was still held, so Terraform silently skipped the networking resources', false],
        ['Load balancers are billed for 24 hours after deletion, so the charge was expected', false],
      ], 'Resources made by in-cluster controllers are not in Terraform state. Deleting the Ingresses (and PVCs) before destroying the cluster lets the controllers clean up. destroy does not skip resources it knows about, and a held lock makes destroy fail, not skip.'),
      mcq('The checkout canary analysis failed at 03:00 on a quiet staging cluster although the new release was healthy. What is the most likely cause?', [
        ['No checkout traffic, so the error ratio was NaN and could not meet the success condition', true],
        ['Prometheus drops metrics at night to save memory, so every query came back with an empty result', false],
        ['The rollouts_pod_template_hash label changes every hour, so the query matched the wrong Pods', false],
        ['Argo Rollouts allows analysis only in office hours unless a schedule override is configured', false],
      ], 'Zero divided by zero is NaN, and NaN is not <= 0.005, so the measurement fails. Synthetic checkouts during every canary give the analysis something to judge. The hash is fixed per ReplicaSet, and neither Prometheus nor Rollouts has time-of-day rules.'),
      mcq('Why does SaleSutra\'s deploy workflow push the image by git sha and then promote the same tag through staging and prod?', [
        ['The bytes tested in staging are exactly the bytes that reach production', true],
        ['ECR charges less for images whose tags are hexadecimal commit identifiers', false],
        ['Argo CD can only read image tags that are forty characters or shorter', false],
        ['Building again for prod is needed so production gets the latest dependencies', false],
      ], 'Build once, promote the artefact (Designing a Delivery Pipeline): a rebuild could pull different dependencies and ship something never tested. Tags have no effect on ECR pricing, and a rebuild for prod is exactly what the rule forbids.'),
    ],
    assignment: {
      title: 'Capstone: Infrastructure and Delivery',
      description: 'Set the budget alarm, build the AWS foundation and session stack in Terraform, run the product on Kubernetes, and ship it through a pipeline with OIDC, scans, signing and a canary that aborts a bad release.',
      instructions: `Build the platform for the option you chose in the Brief, as described in this unit's notes, in your own
AWS account in ap-south-1. Create the budget alarm before any other resource. Submit links to both repositories
(or a zip) and the recordings.

**Submit:**

1. PLATFORM.md, DECISIONS.md (every lab-versus-production choice, with the production setting) and SESSIONS.md
   (each session's start, end and confirmed destroy).
2. Evidence of the budget alarm and its confirmed email subscription, created before the first Terraform apply.
3. Terraform for bootstrap, foundation and the session stack, with a remote backend and locking; a plan output and
   the destroy log from one session.
4. The Helm chart running on kind and on EKS (or ECS on Fargate, justified in DECISIONS.md): probes, requests,
   HPA, PodDisruptionBudget and the orders-api Rollout with its AnalysisTemplate.
5. The three workflows; a PR run showing tests, Trivy, the Terraform plan and checkov; a main run showing build,
   push and cosign signing; the gitops commits for staging and the prod promotion PR.
6. A recording of a bad release aborted by the canary analysis, and of a rollback by reverting the gitops commit.
7. The output of \`ops/leftovers.py\` after your last session: nothing.

**Before you submit,** go through each acceptance check in the notes and point to where it is met.`,
      rubric: [
        { criterion: 'Cost guardrails and account safety', description: 'Budget alarm with forecast alert created first; no IAM access keys; tags on everything; session log with confirmed destroys; nightly teardown as a backstop.', maxPoints: 10 },
        { criterion: 'Infrastructure as code', description: 'Stacks split by lifecycle; S3 backend with locking; pinned providers and modules; private database reachable only from the nodes; secrets kept out of code and state; clean plan after apply.', maxPoints: 25 },
        { criterion: 'Containers and Kubernetes', description: 'Small, scanned images; probes, requests and limits; HPA on the Rollout; PDB and zone spread; runs on kind and on EKS or ECS; Pod Identity or IRSA with least privilege.', maxPoints: 20 },
        { criterion: 'Pipeline and supply chain', description: 'PR checks (tests, Trivy, plan, policy) gate the merge; OIDC roles split by purpose; build once and promote by digest or sha; signing; GitOps with a reviewed prod promotion.', maxPoints: 25 },
        { criterion: 'Progressive delivery and rollback', description: 'Canary analysis on the SLO indicators; a bad release aborted automatically and shown; rollback by Git revert demonstrated.', maxPoints: 10 },
        { criterion: 'Documentation and honesty', description: 'A stranger can rebuild the platform from the README; lab-versus-production choices written down; what was run in AWS and what only on kind is labelled.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
  },

  /* ── BUILD_OPERATE ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_CAPSTONE_BUILD_OPERATE',
    notes: `**The operate half: dashboards and SLO alerts that a person would act on, a load test against the sale-day
profile, a game day and its postmortem, a cost report, a disaster-recovery copy of the critical path on Azure with
measured RPO and RTO — and a teardown that leaves nothing billing.** It draws on Observability and SRE (Logs, Metrics
and Traces; CloudWatch; Prometheus and Grafana; SLIs, SLOs and Error Budgets; On-Call, Incidents and Blameless
Postmortems; Reliability Patterns and Capacity Planning), on FinOps: Seeing, Explaining and Cutting the Bill, on
Database Backups, Restores and Disaster Recovery and DNS with Route 53, and on Azure for AWS Engineers.

## Part 1 — Instrument the service

orders-api counts requests and times them, labelled by the **route template**, never the raw URL — a label per
product id would create a time series per product (cardinality, from Logs, Metrics and Traces). The middleware, run
with FastAPI's TestClient and prometheus_client:

    REQUESTS = Counter("http_requests_total", "Requests by route and status code", ["route", "method", "code"])
    LATENCY = Histogram("http_request_duration_seconds", "Request latency", ["route", "method"],
                        buckets=(0.05, 0.1, 0.2, 0.4, 0.8, 1.6, 3.2))

    @app.middleware("http")
    async def measure(request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        route = request.scope.get("route")
        path = route.path if route else "unmatched"
        LATENCY.labels(path, request.method).observe(time.perf_counter() - start)
        REQUESTS.labels(path, request.method, str(response.status_code)).inc()
        return response

After three product views, one order and one unknown URL, /metrics really printed:

    http_requests_total{code="200",method="GET",route="/products/{product_id}"} 3.0
    http_requests_total{code="201",method="POST",route="/orders"} 1.0
    http_requests_total{code="404",method="GET",route="unmatched"} 1.0

The 0.8 bucket exists because the latency SLO is "under 800 ms": a histogram can only answer the question its bucket
boundaries ask. Logs are JSON lines on stdout with the order id and a trace id, shipped by Fluent Bit to CloudWatch
Logs with a **retention set** — log groups never expire by default.

## Part 2 — Prometheus, SLO rules and alerts

Install kube-prometheus-stack with Helm. The ServiceMonitor must carry the release label the stack selects on, and
copies the Rollouts hash onto every series for the canary analysis. The Rollout's stable and canary Services select
the same Pods as the main orders-api Service, so only the main one carries the scrape label — otherwise every Pod is
scraped two or three times, under different \`service\` labels (parsed with PyYAML, not run):

    apiVersion: monitoring.coreos.com/v1
    kind: ServiceMonitor
    metadata:
      name: orders-api
      namespace: shop
      labels:
        release: kube-prometheus-stack
    spec:
      selector:
        matchLabels:
          app.kubernetes.io/name: orders-api
          salesutra.example/scrape: "true"
      podTargetLabels:
        - rollouts-pod-template-hash
      endpoints:
        - port: http
          path: /metrics
          interval: 15s

Recording rules turn the SLI into one series per window; the alerts use **two windows** each, as SLIs, SLOs and
Error Budgets taught. For a 28-day window (672 hours) the page thresholds work out as \`slo.py\` printed:

    window 28 d = 672 h; error budget 0.500% of requests
    page: 2% in 1 h      burn rate 13.44 -> error ratio above 6.72%
    page: 5% in 6 h      burn rate  5.60 -> error ratio above 2.80%
    ticket: 10% in 3 d   burn rate  0.93 -> error ratio above 0.47%

(Many teams reuse 14.4, 6 and 1, the figures for a 30-day window; either is fine if written down.)

    apiVersion: monitoring.coreos.com/v1
    kind: PrometheusRule
    metadata:
      name: checkout-slo
      namespace: monitoring
      labels:
        release: kube-prometheus-stack
    spec:
      groups:
        - name: checkout-sli
          rules:
            - record: sli:checkout_errors:ratio_rate5m
              expr: |
                sum(rate(http_requests_total{service="orders-api",route="/orders",method="POST",code=~"5.."}[5m]))
                /
                sum(rate(http_requests_total{service="orders-api",route="/orders",method="POST"}[5m]))
            - record: sli:checkout_errors:ratio_rate1h
              expr: |
                sum(rate(http_requests_total{service="orders-api",route="/orders",method="POST",code=~"5.."}[1h]))
                /
                sum(rate(http_requests_total{service="orders-api",route="/orders",method="POST"}[1h]))
        - name: checkout-slo-alerts
          rules:
            - alert: CheckoutErrorBudgetFastBurn
              expr: sli:checkout_errors:ratio_rate1h > (13.44 * 0.005) and sli:checkout_errors:ratio_rate5m > (13.44 * 0.005)
              for: 2m
              labels:
                severity: page
              annotations:
                summary: Checkout is spending its 28-day error budget at 2% an hour or faster
                runbook_url: https://github.com/salesutra/salesutra-platform/blob/main/ops/runbooks/checkout-errors.md

Add the 30m/6h pair at 5.6 and the latency SLO the same way (the ratio of POST /orders requests above the 0.8
bucket). Every page links a runbook. **CloudWatch** watches what Prometheus cannot see from inside the cluster —
alarms created with boto3 against moto (real AWS starts a new alarm in INSUFFICIENT_DATA; moto printed OK):

    cw.put_metric_alarm(
        AlarmName="salesutra-orders-queue-age",
        AlarmDescription="Oldest order waiting > 5 min: worker down or too slow. Runbook: ops/runbooks/queue-age.md",
        Namespace="AWS/SQS", MetricName="ApproximateAgeOfOldestMessage",
        Dimensions=[{"Name": "QueueName", "Value": "salesutra-orders"}],
        Statistic="Maximum", Period=60, EvaluationPeriods=5, DatapointsToAlarm=5,
        Threshold=300, ComparisonOperator="GreaterThanThreshold",
        TreatMissingData="notBreaching", AlarmActions=[topic], OKActions=[topic])

    salesutra-orders-queue-age ApproximateAgeOfOldestMessage GreaterThanThreshold 300.0 notBreaching OK
    salesutra-db-free-storage-low FreeStorageSpace LessThanThreshold 2147483648.0 breaching OK

The queue-age alarm is the order-processing SLO's early warning: the worker can be "up" and still falling behind.

**The dashboard**, one page: the three SLOs with budget remaining; request rate, errors and p95 by route (the RED
method); queue depth and age; RDS connections and CPU; node and Pod saturation; deploy markers from Argo CD.

## Part 3 — Load test and capacity

A Locust file (compiled, not run here) drives the sale-day mix — ten product views for every checkout:

    import random
    from locust import HttpUser, task, between

    class Shopper(HttpUser):
        wait_time = between(1, 3)

        @task(10)
        def browse(self):
            self.client.get(f"/products/{random.randint(1, 500)}", name="/products/{id}")

        @task(1)
        def checkout(self):
            self.client.post("/orders", json={"product_id": random.randint(1, 500), "qty": 1}, name="/orders")

Ramp in steps, hold each, and find the requests per second one Pod serves at the HPA's 60% CPU target. Then plan the
sale (from \`slo.py\`, with 55 req/s per Pod as an example measurement):

    peak 400 rps / 55 rps per pod = 7.27 -> 8 pods
    survive one of 2 AZs: 8 pods per AZ, 16 total at peak

Losing a zone at the peak means the other zone alone must carry it, so production would run 16 at the peak, scaled
up **before** the sale opens — the HPA reacts in minutes, the sale spikes in seconds. The lab test runs a scaled-down
peak; report what you measured and what you extrapolated, separately. Check that RDS connections stay under the
limit as Pods multiply: 16 Pods × a pool of 10 is 160 connections.

## Part 4 — The game day and the postmortem

Write each experiment as a hypothesis with an abort condition, run it on staging at a planned hour, and keep a log.
Run at least three: kill the worker Pods during load (expect: queue age rises, no order lost, recovery within the
order-processing SLO); reboot the RDS instance (expect: checkout 5xx for some minutes, the fast-burn page fires);
add latency to the payment stub (expect: timeouts and the circuit breaker, not a pile-up of threads).

What the fast-burn alert should do during a five-minute database outage — a **simulated** minute series at the lab's
20 checkouts a second (\`gameday.py\`, not cluster output):

    10:59  5m   0.17%  1h  0.17%
    11:00  5m  20.13%  1h  1.83%
    11:01  5m  40.10%  1h  3.49%
    11:02  5m  60.07%  1h  5.16%
    11:03  5m  80.03%  1h  6.82%  PAGE
    11:04  5m 100.00%  1h  8.49%  PAGE
    11:08  5m  20.13%  1h  8.49%  PAGE
    11:09  5m   0.17%  1h  8.49%
    threshold 6.72%; page true from 11:03 to 11:08, clears at 11:09

The condition holds from 11:03; with \`for: 2m\` the page goes out at about 11:05, as the database returns. The 1-hour
ratio alone stays above 6.72% until 12:00, nearly an hour after recovery — the short window is what lets the alert
clear. Compare your real alert times with this, and explain the difference. Then write the **blameless postmortem**
for the worst experiment: summary, impact in failed checkouts and budget spent, timeline, contributing causes, what
went well, and actions with owners and dates (On-Call, Incidents and Blameless Postmortems).

## Part 5 — The cost report

Activate the Project and Session tags as cost allocation tags in the Billing console on day one: they apply only from
activation, and data takes up to a day to appear. The report (one page): cost by session and by service from Cost
Explorer; the three biggest items and why (usually the EKS control plane, the NAT gateway and the nodes); what
production would cost, built in the Pricing Calculator with Multi-AZ RDS, a NAT per AZ and on-demand nodes; and three
savings with evidence — Graviton nodes, Savings Plans for the steady baseline, S3 and ECR gateway endpoints instead
of NAT traffic for image pulls. The Cost Explorer API charges per request; use the console or a handful of calls.

## Part 6 — Disaster recovery on Azure

The critical path — browse and checkout — gets a **pilot light** in Central India: a CronJob runs \`pg_dump\` every
hour and uploads to Azure Blob with a write-only, container-scoped SAS that expires; the dump is the only thing that
exists in Azure between drills, plus a Basic container registry the pipeline pushes the same image to. (The
pg_dump client must be at least the server's major version.) For the drill, \`terraform apply -var drill=true\`
creates the rest (azurerm provider, parsed with python-hcl2, not applied):

    resource "azurerm_resource_group" "dr" {
      name     = "rg-salesutra-dr"
      location = "centralindia"
      tags     = { Project = "salesutra", Purpose = "dr" }
    }

    resource "azurerm_service_plan" "dr" {
      count               = var.drill ? 1 : 0
      name                = "asp-salesutra-dr"
      resource_group_name = azurerm_resource_group.dr.name
      location            = azurerm_resource_group.dr.location
      os_type             = "Linux"
      sku_name            = "B1"
    }

    resource "azurerm_linux_web_app" "orders_api" {
      count               = var.drill ? 1 : 0
      name                = "salesutra-dr-orders-api"
      resource_group_name = azurerm_resource_group.dr.name
      location            = azurerm_resource_group.dr.location
      service_plan_id     = azurerm_service_plan.dr[0].id
      https_only          = true

      identity {
        type = "SystemAssigned"
      }

      site_config {
        health_check_path                       = "/healthz/ready"
        health_check_eviction_time_in_min       = 5
        container_registry_use_managed_identity = true
        application_stack {
          docker_image_name   = "orders-api:\${var.image_tag}"
          docker_registry_url = "https://salesutradr.azurecr.io"
        }
      }

      app_settings = {
        WEBSITES_PORT = "8000"
        APP_ENV       = "dr"
      }
    }

Add the AcrPull role assignment for the app's managed identity, an Azure Database for PostgreSQL flexible server with
private access through a delegated subnet and VNet integration for the app (Azure Networking: never open the
database to the internet), the connection string as a Key Vault reference, and a budget on the resource group
(Azure Cost Management). **DNS failover** uses Route 53: a health check on the AWS endpoint and failover records.
App Service answers only hostnames bound to it, so shop.salesutra.example must be added to the web app as a
custom domain with a certificate, or failover lands on an error page. Route 53 hosted zones and health checks are
billed monthly; without a domain, demonstrate the switch by hand and say so.

    resource "aws_route53_health_check" "primary" {
      fqdn              = var.primary_alb_hostname
      type              = "HTTPS"
      resource_path     = "/healthz/ready"
      port              = 443
      request_interval  = 30
      failure_threshold = 3
    }

    resource "aws_route53_record" "shop_secondary" {
      zone_id        = var.zone_id
      name           = "shop.salesutra.example"
      type           = "CNAME"
      ttl            = 60
      records        = ["salesutra-dr-orders-api.azurewebsites.net"]
      set_identifier = "azure-centralindia"
      failover_routing_policy {
        type = "SECONDARY"
      }
    }

(The PRIMARY record is the same shape with the ALB hostname and the health check id.) **The drill:** declare the
primary lost, restore, switch, place a test order, and time each step. A rehearsal log run through \`drill.py\`:

    RPO this drill: 58 min of orders lost (dump taken at 13:00, disaster at 13:58)
    RTO this drill: 24.75 min (declared to first order on Azure)
    worst case with hourly dumps: 62.2 min (disaster just before the next upload lands)
    with 30-minute dumps: 32.2 min

The drill met both 60-minute targets — and the worst case misses the RPO, because a dump takes two minutes to land.
Either dump every 30 minutes or write RPO 90; do not report the lucky drill as the guarantee. Fail back, then
\`terraform apply -var drill=false\` (or delete the resource group) the same day.

## Part 7 — The teardown checklist (last)

In this order, after the demo:

1. Delete the Argo CD applications, then the shop and monitoring namespaces; wait until the ALB and the EBS
   volumes are gone from the console.
2. \`terraform destroy\` the platform stack, then azure-dr (\`az group delete -n rg-salesutra-dr\` if anything
   remains), then foundation; empty the ECR repositories and the image bucket first.
3. Run \`ops/leftovers.py\` in ap-south-1 (and any other region you touched). Against moto, with an ALB, a volume,
   an Elastic IP and a log group left behind by controllers outside Terraform, it printed:

       elastic-ip               127.66.192.74
       ebs-volume               vol-e148fa1018df3051a
       load-balancer            k8s-shop-storefro-1a2b3c4d5e
       log-group-no-retention   /aws/containerinsights/salesutra/application

   The tag search found none of them: controller-made resources do not carry your default tags. Check each service.
4. Delete RDS snapshots you made, Route 53 health checks and the hosted zone if you created one, and the Secrets
   Manager secrets (they wait out a recovery window before deletion).
5. Last, destroy bootstrap: the OIDC roles, then the state bucket (empty every object version first).
6. Keep the budget alarm for one more month, and check the Billing console and Azure Cost Management the next day.

## Deliverables

1. Instrumented services; the ServiceMonitor, PrometheusRules, CloudWatch alarms and an exported dashboard.
2. SLO.md: indicators, objectives, burn-rate thresholds and their arithmetic, the runbook for each page.
3. The Locust file, results per step, the capacity plan with measured and extrapolated numbers separated.
4. The game-day plan and log, alert times compared with expectation, and one blameless postmortem.
5. The cost report. 6. The azure-dr Terraform, the drill log, measured RPO and RTO with the worst case.
7. The teardown checklist completed, with the final leftovers output and next-day billing screenshots.`,
    mcqs: [
      mcq('SaleSutra\'s orders-api labels its request counter with the full URL path, and Prometheus memory climbs through the sale. Which fix keeps the SLO queries working?', [
        ['Label with the route template, such as /products/{product_id}, instead of the raw path', true],
        ['Drop the code label, since status codes multiply the number of series more than paths do', false],
        ['Raise Prometheus memory limits and keep the raw paths, since per-product data helps debugging', false],
        ['Scrape every five minutes instead of fifteen seconds, so fewer series are stored overall', false],
      ], 'Every distinct label value is a new series, so a label per product id grows without bound. The route template keeps the set small and still answers the SLO question. Dropping the code label breaks the error ratio; scrape interval does not change series count.'),
      mcq('In SaleSutra\'s DR drill the measured RPO was 58 minutes against a 60-minute target, with hourly dumps that take two minutes to upload. What should the report claim?', [
        ['The worst case is about 62 minutes, so the target is not met; dump more often or change it', true],
        ['The target is met, since the measured 58 minutes is the number the drill actually produced', false],
        ['The RPO is zero, because RDS keeps automated backups in Mumbai throughout the drill', false],
        ['RPO cannot be measured in a drill, so the report should give only the RTO it measured', false],
      ], 'RPO is a promise about the worst case, and a disaster just before the next upload lands loses an hour plus the upload time. The drill measured one lucky case. In-region backups do not help when the region is the thing that was lost.'),
      mcq('During SaleSutra\'s game day the worker Pods were killed and every API health check stayed green. Which signal shows the order-processing SLO at risk?', [
        ['The SQS ApproximateAgeOfOldestMessage alarm as orders wait longer than they should', true],
        ['The orders-api error ratio, since checkout fails whenever the worker is down', false],
        ['Node CPU on the cluster, because a killed worker leaves its node running hot for minutes', false],
        ['The ALB request count, which falls to zero when no worker is consuming', false],
      ], 'Checkout only enqueues, so the API stays healthy while orders pile up; the age of the oldest message measures the user-facing delay. Node CPU falls rather than rises, and ALB traffic is unaffected by the worker.'),
    ],
    assignment: {
      title: 'Capstone: Observability, Reliability and an Azure Failover',
      description: 'Instrument and dashboard the platform, alert on SLO burn, load test for the spike, run a game day with a postmortem, report the cost, prove recovery of the critical path on Azure, and tear everything down.',
      instructions: `Operate the platform you built in the previous unit, as described in this unit's notes. Run experiments only on
your own staging environment at a planned time; the DR copy goes in Central India; everything is destroyed at the end.
Submit links to the repositories (or a zip) and the recordings.

**Submit:**

1. The instrumented services, ServiceMonitor, recording and alerting rules, CloudWatch alarms, an exported Grafana
   dashboard and screenshots of it under load.
2. SLO.md with the indicators, objectives, burn-rate thresholds and their arithmetic, and a runbook for every page.
3. The load test: the Locust file, results per step, requests per second per Pod, and the sale-day capacity plan
   with measured and extrapolated figures kept apart.
4. The game day: plan with hypotheses and abort conditions, the log, alert times against expectation, and one
   blameless postmortem with owned, dated actions.
5. The cost report: by session and service, the three biggest items, a production estimate and three savings with
   evidence.
6. The DR drill: azure-dr Terraform, the dump job, the drill log, measured RPO and RTO, the worst case, and the
   failback.
7. The completed teardown checklist, the final leftovers output (empty) and next-day billing screenshots for AWS and
   Azure.

**Before you submit,** check every deliverable in the notes and point to where it is met.`,
      rubric: [
        { criterion: 'Instrumentation and dashboards', description: 'Route-template labels; histogram buckets that answer the SLO; structured logs with retention; one dashboard tied to decisions, with deploy markers.', maxPoints: 15 },
        { criterion: 'SLOs and alerting', description: 'User-facing SLIs; objectives with written budgets; multiwindow burn-rate alerts with correct arithmetic; CloudWatch for managed services; a runbook for every page.', maxPoints: 20 },
        { criterion: 'Load test and capacity', description: 'A realistic traffic mix; per-Pod capacity measured; zone-loss headroom and pre-scaling for a known spike; connection limits checked; measured and extrapolated kept apart.', maxPoints: 10 },
        { criterion: 'Game day and postmortem', description: 'Hypotheses and abort conditions; safe timing on staging; alert behaviour compared with expectation; blameless postmortem with impact in budget terms and owned actions.', maxPoints: 15 },
        { criterion: 'Cost report', description: 'Tag-based cost by session and service; the biggest items explained; a production estimate from the calculator; savings backed by evidence.', maxPoints: 10 },
        { criterion: 'Azure disaster recovery', description: 'Pilot light in Central India; private database access; managed identity for the registry; DNS failover or a documented manual switch; RPO and RTO measured, with the worst case stated honestly; failback done.', maxPoints: 20 },
        { criterion: 'Teardown and honesty', description: 'Checklist completed in order; leftovers script empty; billing checked the next day; simulated, lab and production figures labelled everywhere.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
  },

  /* ── DEFENCE ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_CAPSTONE_DEFENCE',
    notes: `**A platform hiring panel — usually a senior DevOps or SRE engineer, a platform lead, sometimes an engineering
manager — wants to watch the platform work, not hear it described.** Twelve minutes of demo, twenty of questions.
This unit is the script, the questions and what a strong answer contains.

## The twelve-minute demo

| Time | Show | Say |
|---|---|---|
| 0:00–1:00 | The product and the SLOs | What SaleSutra sells, the sale spike, the three SLOs and the budget |
| 1:00–2:30 | The architecture and the repos | One diagram; the stacks split by lifecycle; what runs only in sessions |
| 2:30–5:30 | A release, live | Merge a change; image built, scanned, signed; staging synced; the canary at 10% with analysis passing |
| 5:30–7:00 | A bad release | The prepared 5% error build; analysis fails; Rollout aborts; traffic back on stable — the dashboard during it |
| 7:00–8:30 | Load and the alerts | The load test at the scaled peak; HPA scaling; the game-day page and its postmortem |
| 8:30–10:00 | Recovery | The DR drill recording: restore, switch, first order on Azure; RPO and RTO with the worst case |
| 10:00–11:00 | The bill | Cost by session and service; the production estimate; the three savings |
| 11:00–12:00 | What you learnt | One thing that surprised you, and what you would build next |

Bring the cluster up in a session an hour before and run a release end to end as a warm-up. Record every live step
beforehand: if EKS or the network fails on the day, say so, play the recording and continue — a platform lead has
seen many demos fail and is watching how you handle it.

## The questions, and what a strong answer contains

1. **"Walk me through what happens between merge and production."** Checks on the PR; build once; scan; sign; push
   by sha; gitops commit for staging; Argo CD sync; canary with analysis; prod by reviewed PR. Name who can approve.
2. **"Your canary failed at 10%. Did any customer notice?"** About 10% of checkout requests for the minutes before
   the abort, so some did; the budget spent, from the dashboard; why the first step is small.
3. **"Why Argo CD pulling rather than the pipeline running kubectl?"** No cluster credentials in CI; drift is
   corrected; Git is the record; rollback is a revert.
4. **"Where are your secrets?"** Secrets Manager for the database (managed by RDS), Pod Identity for AWS calls, a
   GitHub App for the gitops repo, OIDC for AWS; none in Git or Terraform state as plain values — say what is in
   state and how the bucket is protected.
5. **"Why is the alert threshold 6.72%?"** 2% of a 28-day budget in one hour: burn rate 13.44 × 0.5%; the short
   window lets it clear; the ticket-level alert for slow burns.
6. **"What happens at 10× traffic?"** Measured per-Pod capacity; Pods for the peak and for losing a zone; pre-scaled
   before the sale; database connections and the queue as the next limits; what the load test did not cover.
7. **"Why single-AZ RDS and spot nodes?"** Lab cost, written in DECISIONS.md, with the production setting next to
   each. Never pretend the lab is production.
8. **"Your RPO is 60 minutes. Is that good enough for an e-commerce company?"** It depends on what an hour of lost
   orders costs; the payment provider still has the payments; reconciling is a business process; the next step
   would be continuous replication, at a cost.
9. **"Why Azure for DR and not another AWS region?"** The capstone asked for it; the real trade-off is two skill
   sets and two bills against provider independence; most companies would choose ap-south-2 first.
10. **"What did the bill teach you?"** The control plane, NAT and idle hours dominate; session discipline; what you
    would change for production.
11. **"Your nightly teardown destroys everything. What stops it destroying production?"** Its role trusts only the
    lab-teardown environment and has rights only on the lab stack's resources; production lives in another account.
12. **"With two more weeks, what would you build?"** One thing tied to evidence — a private EKS endpoint, Karpenter
    for faster scaling, a 30-minute dump — not "a service mesh".

## Rehearse with these

Answer each in under a minute, aloud: the path from merge to production; what the bad release cost in error budget;
the worst-case RPO and why it differs from the drill; the biggest line on the bill and how you would cut it.

## After demo day

Run the teardown checklist from the previous unit the same day, and submit the empty leftovers output. A platform you
can build in an afternoon from code is worth more than one that is still running.`,
    mcqs: [
      mcq('A panellist asks SaleSutra\'s student why the platform has no kubectl step in the deploy workflow. Which answer is strongest?', [
        ['Argo CD pulls from the gitops repo, so CI holds no cluster credentials and Git records every change', true],
        ['kubectl cannot run on GitHub-hosted runners, so the deploy had to move inside the cluster', false],
        ['Argo CD deploys faster than kubectl, which matters most during the Diwali sale traffic spike', false],
        ['Helm replaced kubectl in the pipeline, and Argo CD is required for Helm charts to install at all', false],
      ], 'Pull-based GitOps keeps credentials inside the cluster and makes the desired state reviewable and revertible, as GitOps with Argo CD taught. kubectl runs fine on hosted runners, speed is not the point, and Helm does not need Argo CD.'),
      mcq('The panel asks whether SaleSutra\'s single-AZ RDS instance is a mistake. What is the best reply?', [
        ['A lab cost decision, written in DECISIONS.md with Multi-AZ as the production setting and why', true],
        ['It is fine for production, because RDS restarts in another zone automatically when one fails', false],
        ['Multi-AZ only matters for reads, and SaleSutra\'s checkout is a write-heavy workload anyway', false],
        ['The DR copy on Azure replaces Multi-AZ, so a second zone in Mumbai would add nothing at all', false],
      ], 'Owning a deliberate trade-off is what panels look for. Single-AZ RDS does not fail over by itself, Multi-AZ is about availability rather than reads (Managed Relational Databases: RDS and Aurora), and a cross-cloud restore with a 60-minute RPO is not a zone failover.'),
      mcq('Asked "Your canary failed at 10% — did any customer notice?", which answer shows the most judgement?', [
        ['Yes: about a tenth of checkouts for a few minutes, and here is the budget it spent', true],
        ['No, canary traffic is synthetic, so no real customer request ever reaches the new version', false],
        ['No, because Argo Rollouts retries every failed canary request on the stable version first', false],
        ['Nobody could notice, since the analysis ran before any traffic was shifted to the canary', false],
      ], 'A canary is real traffic, and honesty about the impact — measured in error budget — is the strong answer. Rollouts does not replay failed requests, and the analysis in this Rollout runs after the 10% weight is set.'),
      mcq('The panel asks why SaleSutra\'s nightly teardown cannot destroy production. Which answer holds up?', [
        ['Its role trusts only the lab-teardown environment and can touch only the lab account\'s stack', true],
        ['The workflow runs at 23:00 IST, when production deploys are frozen and nothing can change', false],
        ['terraform destroy asks for confirmation, and nobody is awake at night to type yes into it', false],
        ['GitHub refuses to run scheduled workflows that would delete resources in a production account', false],
      ], 'Blast radius comes from identity and account boundaries: the OIDC trust condition and the role\'s permissions decide what the job can do. -auto-approve removes the prompt, a freeze does not stop a script, and GitHub has no such rule.'),
    ],
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_CAPSTONE_CHECKPOINT',
    notes: `Ten scenario questions across the whole Cloud & DevOps Engineer track — accounts and networks, Kubernetes,
Terraform, pipelines, observability, SLOs, cost and recovery — at the level a platform hiring panel expects. Choose
what you would actually do, and be ready to say why.`,
    checkpoint: [
      mcq('Two engineers ran terraform apply on the same stack at once and both runs edited the state file. What should the backend have had?', [
        ['State locking — use_lockfile on the S3 backend — so the second run waits or fails', true],
        ['A separate state file per engineer, merged by hand at the end of each working day', false],
        ['State kept in Git, so that the second engineer gets a merge conflict on push', false],
        ['Bucket versioning alone, since an older version of the state can always be restored', false],
      ], 'Locking stops two writers at once (State, Remote Backends and Locking). Versioning helps recover after damage but does not prevent it; per-person state or state in Git lose the single source of truth and can leak secrets.'),
      mcq('terraform plan shows an RDS instance being replaced because someone changed its identifier in a refactor. What should happen before apply?', [
        ['A moved block or state mv records the rename, so the plan shows no replacement', true],
        ['Apply as planned, because RDS copies the data to the new instance during replacement', false],
        ['Add -refresh=false to the plan so Terraform stops comparing state with the real instance', false],
        ['Delete the instance from state with state rm and let the next apply adopt it on its own', false],
      ], 'A replacement destroys the database. moved blocks (or terraform state mv) tell Terraform it is the same object. RDS does not copy data on replace, -refresh=false hides drift without changing addresses, and state rm leaves the instance unmanaged.'),
      ck(K8S, 'After a node is drained for an upgrade, all three orders-api Pods restart at once and checkout fails for a minute. What was missing?', [
        ['A PodDisruptionBudget, with Pods spread across nodes and zones', true],
        ['A higher memory limit, so the Pods survive the drain operation', false],
        ['A liveness probe, so Kubernetes restarts the Pods more quickly', false],
        ['A NodePort Service, so traffic reaches Pods on every node directly', false],
      ], 'A PDB limits voluntary evictions and topology spread keeps replicas apart (Probes, Resources, Autoscaling and Rollouts). Memory limits and probes do not stop evictions, and the Service type does not change how many Pods are running.'),
      ck(K8S, 'Pods on EKS need to read one SQS queue. Which way gives them access?', [
        ['EKS Pod Identity or IRSA: a role for the service account allowing only that queue', true],
        ['An access key in a Kubernetes Secret, mounted into the Pods as environment variables', false],
        ['The node group\'s instance role, extended with SQS full access for every Pod', false],
        ['A public queue policy allowing any principal, restricted to the VPC CIDR range', false],
      ], 'Per-workload roles give short-lived credentials scoped to one service account (Amazon EKS). Keys in Secrets are long-lived and leak; the node role gives every Pod on the node the same rights; a principal-wide policy is the wide-open pattern to avoid.'),
      ck(CICD, 'A pull request from a contributor\'s branch could run terraform apply in production through the workflow. Which change closes this?', [
        ['PR jobs use a read-only plan role; apply runs only from main, in a protected environment', true],
        ['Store the production role\'s ARN as a secret so that pull requests cannot read it', false],
        ['Run apply only on self-hosted runners, since GitHub-hosted runners are shared', false],
        ['Require two approvals on every PR, while leaving the workflow\'s permissions as they are', false],
      ], 'The OIDC trust policy and role split decide what a PR can do (GitHub Actions to AWS with OIDC, Terraform in a Pipeline). A role ARN is not a secret, runner type does not limit permissions, and approvals do not stop a workflow that runs before review.'),
      ck(CICD, 'Trivy fails the build on a HIGH vulnerability in the base image, and no fixed version exists yet. What should the team do?', [
        ['Record a time-limited exception with the reason and owner, and rebuild when a fix appears', true],
        ['Turn off image scanning until the vendor publishes a fixed base image for the vulnerability', false],
        ['Change the threshold to CRITICAL permanently so that HIGH findings never block a build', false],
        ['Push the image under a new tag, because Trivy only scans tags it has not seen before', false],
      ], 'Exceptions with an expiry and a reason keep the gate meaningful (Securing the Pipeline: Scans, Signing and Secrets). Turning off scanning or lowering the bar for ever hides every later finding, and Trivy scans content, not tag names.'),
      ck(OBS, 'Checkout p95 latency rose during the sale, but CPU on every Pod stayed at 40%. Where should the engineer look first?', [
        ['Downstream waits: database connections and query time, and the payment call, using traces', true],
        ['The HPA, which should have added Pods, because CPU at 40% means the Pods are overloaded', false],
        ['Node disk space, since slow responses usually mean the container logs filled the disk', false],
        ['The Ingress, because latency above the ALB is never caused by the application itself', false],
      ], 'Low CPU with rising latency means the service is waiting, not working; traces and RDS metrics show which dependency (Logs, Metrics and Traces). More Pods would add database connections and make a pool limit worse.'),
      ck(OBS, 'A team has 140 alerts and the on-call engineer ignores most pages. What change helps most?', [
        ['Page only on SLO burn and user-facing symptoms; turn the rest into tickets or dashboards', true],
        ['Add a second on-call engineer so that every alert gets looked at within five minutes', false],
        ['Raise every threshold by 20% so that fewer alerts fire during normal working hours', false],
        ['Send all the alerts to email instead of the pager, so that nights stay quiet for on-call', false],
      ], 'Pages should mean "a user is hurt, act now" (CloudWatch: Metrics, Logs, Alarms and Dashboards; SLIs, SLOs and Error Budgets). More people or blanket thresholds keep the noise; moving everything to email hides the real pages too.'),
      ck(SLO, 'A service has used 90% of its error budget with ten days of the window left. What does the error-budget policy usually say?', [
        ['Slow or freeze risky releases and spend effort on reliability until the budget recovers', true],
        ['Lower the SLO for the rest of the window so that the remaining budget becomes larger', false],
        ['Carry on as normal, since the budget resets at the end of the window anyway', false],
        ['Page the on-call engineer every hour until the error ratio returns to zero', false],
      ], 'The budget is a decision tool: when it is nearly spent, change slows and reliability work comes first (SLIs, SLOs and Error Budgets). Moving the SLO defeats the agreement, and hourly pages are noise.'),
      ck(K8S, 'An ed-tech platform publishes results at 10:00 and last year\'s spike overwhelmed the HPA. What belongs in the plan?', [
        ['Pre-scale Pods and nodes before 10:00 from a load test, and check database limits', true],
        ['Lower the HPA CPU target to 20%, so that it reacts faster when the spike arrives', false],
        ['Rely on the HPA alone this year, but raise the maximum number of replicas to 100', false],
        ['Move the results page to a larger node type the evening before, and keep two Pods', false],
      ], 'A spike at a known time is met by capacity added in advance, sized from measurement (Reliability Patterns and Capacity Planning); autoscaling still takes minutes. Bigger nodes with two Pods do not add serving capacity in proportion.'),
    ],
  },
];
