/**
 * Career-track content: The Cloud Candidate (CL_PLACE_CANDIDATE), Cloud & DevOps Engineer, batch CL4 — the last topic
 * of Year-4 placement for the Cloud & DevOps Engineer track. The shared Year-4 packs teach resume format, aptitude,
 * HR and generic mocks; this is the cloud and DevOps version: a resume and portfolio whose every claim can be checked
 * (and that leaks no keys, state files or account details), the AWS, Azure and Kubernetes certifications and the
 * cloud career paths in India, and one complete cloud and DevOps interview loop. Modelled on CY_PLACE_CANDIDATE.
 *
 * The evidence throughout is the track's capstone (CL_CAPSTONE, "A Production Platform": SaleSutra, a fictional Jaipur
 * marketplace, on EKS with Terraform, GitHub Actions with OIDC, an Argo Rollouts canary, SLOs, a game day, a cost
 * report and a DR drill on Azure). Its figures (55 req/s per Pod as an example measurement, 32 against 720 billable
 * hours, RTO 24.75 min, worst-case RPO 62.2 min) are quoted from that topic; students replace them with their own.
 * Certifications are described by what they prove and who asks for them — no exam prices, passing scores, question
 * counts or durations, and no salary figures: the notes send students to the official pages. The round-0 log
 * problem's output was produced by running the Python solution on the sample shown (scratchpad cl_place_candidate).
 *
 * Attribution: the topic is multi-skill (PLACEMENT_READINESS default, PORTFOLIO_EVIDENCE, INTERVIEW_PERFORMANCE).
 * Every checkpoint question names its skill with ck(), within what its unit declares; practice mcqs name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const PR = 'PLACEMENT_READINESS';
const PE = 'PORTFOLIO_EVIDENCE';
const IP = 'INTERVIEW_PERFORMANCE';

export const TRACK_CL_PLACE_CANDIDATE_BUNDLES: PilotBundle[] = [
  /* ── RESUME ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_PLACE_CANDIDATE_RESUME',
    notes: `The shared Year-4 resume pack covers format, length and the basics. This unit is the **cloud and DevOps** version:
the resume that gets through the filter for roles titled "Cloud Engineer — Trainee", "Associate DevOps Engineer",
"Cloud Support Associate", "Site Reliability Engineer I", "Platform Engineer" or "Systems Engineer (Cloud)", and a
portfolio a reviewer can actually run. Cloud hiring has its own two problems. Every applicant lists the same twenty
service names from the same courses, so the list alone proves nothing. And a cloud resume is a small test of
judgement: a candidate whose public repository holds an access key or a Terraform state file has answered the
security question before the interview starts.

## Who reads it, and what they filter on

| Employer | Typical first filter | What wins the shortlist |
|---|---|---|
| Product companies (Bengaluru, Hyderabad, Pune, Gurugram) | Linux, one cloud in depth, Docker and Kubernetes, scripting | A platform you built and operated, with numbers |
| Global capability centres | AWS or Azure, Terraform, CI/CD, an associate certification | Clean, documented repositories; process discipline |
| IT services companies | A cloud fundamentals or associate certification, Linux, willingness to learn any stack | Breadth, clear communication, a certification in progress |
| Startups | Can you ship and run it alone: AWS, containers, pipelines, cost awareness | A working demo and a short, honest cost report |
| MSPs and cloud partners | AWS or Azure certifications, Linux, monitoring, shift readiness | Runbooks, alarms and a teardown you can show |

Many of these employers run a **background verification** after the offer: education, previous employment, and
certifications checked with the issuer through your credential ID. A claim that cannot survive that check is not
worth the risk.

## The skills line a filter searches

Use the job description's spellings, grouped, and only what you can defend for ten minutes:

    Cloud (AWS):    IAM (roles, policies, OIDC), VPC, EC2, S3, RDS PostgreSQL, SQS, Lambda, EKS/ECS, CloudWatch, Route 53
    Cloud (Azure):  App Service, Azure Database for PostgreSQL, Blob Storage, Entra ID and RBAC, Cost Management
    IaC:            Terraform (modules, remote state with locking, plan in CI), Helm
    Containers:     Docker, Kubernetes (Deployments, Services, probes, HPA), kind, Argo CD, Argo Rollouts
    CI/CD:          GitHub Actions (OIDC to AWS), Trivy, cosign
    Observability:  Prometheus, Grafana, Alertmanager, CloudWatch alarms; SLOs and burn-rate alerting
    Scripting/OS:   Python (boto3), Bash, Linux, Git, DNS, TLS, HTTP

Leave out what you only watched: "Ansible", "Jenkins", "GCP", "OpenShift", "service mesh", "multi-region active-
active" — unless you used them. If a JD names a tool you know only by its equivalent, write the one you used and be
ready to map it aloud ("I built pipelines in GitHub Actions; a Jenkinsfile is the same stages in Groovy"). **Every
word on this line is a question in the technical round** — "Terraform" means you will be asked what is in the state
file and what happens when two people apply at once.

## Bullets: what you built + the evidence + the measured result

A cloud bullet is credible when it names the architecture, the method and a number someone could recount.

- Weak: "Deployed a scalable, highly available e-commerce application on AWS using DevOps best practices."
- Platform: "Built SaleSutra's platform as code — Terraform stacks split by lifecycle (bootstrap, foundation,
  session), EKS in two AZs, RDS PostgreSQL in private subnets — rebuilt from nothing in each session."
- Delivery: "GitHub Actions with OIDC (no access keys): tests, Trivy and terraform plan on every PR; images signed
  with cosign; an Argo Rollouts canary aborted a deliberately bad build at the 10% step with no manual action."
- Reliability: "Two SLOs with burn-rate alerts; load-tested to a measured 55 req/s per Pod and planned the sale
  peak at 16 Pods across two AZs; ran three game-day experiments and wrote a blameless postmortem."
- Recovery: "DR copy of the checkout path on Azure (Central India): drill RTO 24.75 min; reported the worst-case
  RPO of 62.2 min, not the drill's lucky 58."
- Cost: "Kept hourly-billed resources to 8 four-hour sessions (32 billable hours against 720 if left up) with a
  budget alarm and a nightly teardown; a leftovers script printed nothing after the final teardown."

The figures above are from the capstone's worked examples — replace every one with yours, and keep the Locust
results, the drill log and the Cost Explorer export that produced each number. **Cost figures** come from your own
bill and the Pricing Calculator, labelled as lab or production estimate; never quote a price from a blog.

## A portfolio that runs

Nobody will keep an EKS cluster running for a recruiter — and you should not pay for one. "Runs" means a reviewer
can see it work and rebuild it from code:

    salesutra-platform/
      README.md          one diagram, the SLOs, a results table, the 3-minute recording, how to run it locally
      DECISIONS.md       each lab shortcut (single-AZ RDS, one NAT, spot nodes) next to its production setting
      infra/             Terraform: bootstrap/ foundation/ platform/ azure-dr/, each with a README and example tfvars
      deploy/            Helm chart, Argo CD applications, the Rollout and its analysis template
      .github/workflows/ PR checks, build-sign-push, nightly teardown
      ops/               slo.py, leftovers.py, the load test, runbooks, the postmortem, the cost report
      local/             kind config and a make target: the whole app on a laptop in minutes, no cloud bill

The README leads with a table: SLOs and what was measured, the canary abort, load-test capacity, RPO and RTO with
the worst case, billable hours and the teardown result. The 3-minute screen recording (a merge, a bad release
stopped by the canary, the dashboard) carries what a live cluster cannot. Architecture diagrams are drawn from what
Terraform actually creates, not from an icon set's ideal picture.

## What never to publish

- **Credentials** — access keys, \`.env\` files, kubeconfigs, database passwords, SAS tokens, GitHub tokens. If one
  was ever committed, revoke and rotate it: deleting the file leaves it in git history and in every clone.
- **Terraform state** (\`terraform.tfstate\`, its backups) — it can hold secrets in plain text. State lives in the
  remote backend; \`.gitignore\` covers \`*.tfstate*\`, \`.terraform/\` and real \`*.tfvars\`.
- **Account details** — account ids, ARNs and console URLs in screenshots and docs: use 123456789012 and
  \`example\` domains. An account id alone is not a password, but there is no reason to hand it out.
- **Anything open to the world** — a public S3 bucket or a 0.0.0.0/0 database rule left from a demo.
- **An employer's or client's work** — internship pipelines, configs or dashboards, even "anonymised".

## Copies for different roles — the facts never change, only the order

| Target | Lead with | Push down |
|---|---|---|
| DevOps engineer | The pipeline, OIDC, the canary, Terraform | Azure DR detail |
| SRE | SLOs, burn-rate alerts, game day, postmortem, capacity plan | Image signing |
| Cloud engineer (AWS) | VPC and IAM design, EKS, RDS, cost report | Prometheus internals |
| Azure-first role or MSP | The Azure DR drill, Entra ID and RBAC, AZ-900/AZ-104 status | EKS specifics |
| Cloud support | Troubleshooting runbooks, CloudWatch, Linux and networking | Design trade-offs |

LinkedIn and Naukri use the same spellings and the same numbers; pin the platform repository in Featured.`,
    workedExample: `**A weak cloud resume section, rewritten.** Rohit, B.Tech 2026, sends:

    SKILLS: AWS (all services), Azure, GCP, DevOps, Docker, Kubernetes, Jenkins, Ansible, Terraform, Chef, Puppet,
            Linux, Python, Microservices, Cloud Security
    PROJECTS
    1. Hosted a website on AWS EC2 with high availability and auto scaling.
    2. CI/CD pipeline for a microservices app achieving 100% automation.
    3. Kubernetes cluster for a scalable e-commerce platform.

**What a platform panel sees.** "AWS (all services)" invites a question on a service he has never opened. Three
config-management tools and three clouds with no work behind them. "High availability" on one EC2 instance is a
contradiction. "100% automation" has no denominator. Project 3 does not say what ran on the cluster or what he did.

**Step 1 — inventory what is true.** His capstone is SaleSutra: Terraform stacks, EKS, RDS, GitHub Actions with
OIDC, Argo CD and a canary, Prometheus and two SLOs, a game day, a cost report, a DR drill on Azure. He has read
about Jenkins and Ansible but never run them; he has never touched GCP.

**Step 2 — rewrite.**

    SaleSutra — a production platform for a sale-day marketplace          github.com/rohit-k/salesutra-platform
    AWS (EKS, RDS, SQS, IAM), Terraform, GitHub Actions, Argo CD, Prometheus, Azure App Service
     - Terraform stacks split by lifecycle; the hourly-billed platform stack applied and destroyed per session —
       32 billable hours over 8 sessions, budget alarm first, leftovers script empty at the end.
     - PR checks (tests, Trivy, terraform plan) and OIDC to AWS — no access keys anywhere; a canary at 10%
       aborted a deliberately broken build automatically (recording in the README).
     - Checkout SLO 99.5% with burn-rate alerts; load-tested per-Pod capacity and planned the sale peak for
       the loss of one AZ; game day with a blameless postmortem.
     - DR copy on Azure Central India: drill RTO under 25 minutes; worst-case RPO reported as 62 minutes and
       the fix (30-minute dumps) written down.

    SKILLS
    AWS: IAM, VPC, EC2, S3, RDS, SQS, EKS, CloudWatch | Azure: App Service, Blob, Entra ID | Terraform, Helm
    Docker, Kubernetes, Argo CD, Argo Rollouts | GitHub Actions, Trivy, cosign | Prometheus, Grafana | Python, Bash, Linux

**Step 3 — remove what must go.** GCP, Chef, Puppet and Ansible come off. The EC2 website becomes one line under
"Earlier work" or goes. He searches every repository's history for keys and state files (\`git log --all -- '*.tfstate'\`
and a secret scanner), rotates anything he finds, and replaces account ids in screenshots with 123456789012. For a
JD asking for Jenkins, he keeps the truth and maps it in the interview: "the stages, artefacts and secrets problems
are the same; I would expect a week to be useful in Jenkins".`,
    mcqs: [
      mcq('Anirudh\'s platform repository has a terraform.tfstate file committed in the infra folder "so reviewers can see what was created". What should he do?', [
        ['Remove it from history, check it for secrets and rotate any, and keep state in the remote backend', true],
        ['Leave it, since state only lists resource names and a reviewer can learn a lot from reading it', false],
        ['Rename it to state-example.json, so that Terraform will not read it but reviewers can still open it', false],
        ['Make the repository private until the placement season ends, then make it public again afterwards', false],
      ], 'State can hold secrets in plain text, such as database passwords and generated keys, so a committed state file must be treated as exposed. Renaming or hiding it temporarily leaves the same content in history; what reviewers need is the code and the README.'),
      mcq('A product-company JD lists "Jenkins, Ansible, AWS, Kubernetes". Pallavi has built pipelines only in GitHub Actions and has never used Ansible. How should her skills line handle it?', [
        ['List GitHub Actions with what she built, and map it to Jenkins aloud in the interview', true],
        ['Add Jenkins and Ansible to the line, because the recruiter filter rejects resumes without them', false],
        ['Write "CI/CD tools (all major)", which matches every filter without naming an unused tool', false],
        ['Drop the CI/CD section entirely, since GitHub Actions will look like a hobby tool to them', false],
      ], 'True tool names with real work behind them survive the technical round; panels accept that pipeline concepts transfer. Listing unused tools fails the first follow-up, catch-all phrases are claims no one can check, and hiding the work wastes her strongest evidence.'),
      mcq('Deepak wants his portfolio to "run" for recruiters but cannot afford to keep EKS up. What is the best approach?', [
        ['A kind setup that runs the app locally, a short recording of the canary abort, and Terraform to rebuild', true],
        ['Keep the smallest EKS cluster running all placement season, since a live URL is the only proof recruiters accept', false],
        ['Replace the platform with screenshots of the AWS console taken on the day it was running at full size', false],
        ['Share his AWS console login with recruiters, so they can open the resources and inspect them directly', false],
      ], 'A reviewer can run the app on a laptop, watch the hard part working and see the code that rebuilds the rest — with no bill. A month-long cluster costs real money for a link few will open, screenshots prove little, and sharing credentials is a security failure.'),
    ],
    checkpoint: [
      ck(PR, 'Varun\'s bullet says "Deployed a highly available, scalable application on AWS using DevOps best practices". Which rewrite would a platform lead trust most?', [
        ['The architecture in one line, the pipeline\'s safety checks, and a measured result such as the canary abort', true],
        ['The same bullet with "highly available" changed to "fault tolerant", which sounds more advanced to a panel', false],
        ['A list of every AWS service in the account, so that the bullet matches as many recruiter filters as possible', false],
        ['"Passionate DevOps enthusiast with strong cloud exposure", which is how many freshers in cloud phrase it', false],
      ], 'A credible bullet names what was built, how it is protected and a result someone can check. Swapping one buzzword for another, piling on service names or adding adjectives gives the panel nothing to probe and nothing to believe.'),
      ck(PE, 'Which item best backs the bullet "Planned the sale peak at 16 Pods across two AZs"?', [
        ['The load-test results per step, the per-Pod capacity, and the arithmetic for losing a zone', true],
        ['A Grafana screenshot from the day the cluster ran the largest number of Pods it ever had', false],
        ['A README sentence saying the cluster was sized carefully for the Diwali sale traffic', false],
        ['A certificate from an online Kubernetes course whose syllabus covered autoscaling', false],
      ], 'Evidence is what produced the number and can be rechecked: the measured capacity and the calculation from it. A busy screenshot, a sentence or a course certificate says nothing about how sixteen was reached.'),
      ck(PE, 'Kavya\'s best pipeline work came from her internship at a fintech GCC. A recruiter asks to see it. What should she share?', [
        ['A version rebuilt in her own repository, and an offer to describe the internship work in general terms', true],
        ['The internship workflow files with the company name replaced, because the YAML is generic anyway', false],
        ['The full repository, since recruiters are bound by the same confidentiality rules as the GCC\'s own engineers', false],
        ['Screenshots of the internal pipeline runs, with the account ids and company logo cropped out first', false],
      ], 'Internship work belongs to the employer; renaming, cropping or trusting a recruiter still leaks it and breaks trust. Rebuilding the pattern in her own repository shows the same skill honestly, and describing it in general terms is allowed.'),
    ],
  },

  /* ── CERTIFICATIONS ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_PLACE_CANDIDATE_CERTIFICATIONS',
    notes: `Cloud job descriptions in India name certifications more than most software roles do, and freshers spend months and
money collecting the wrong ones. This unit covers what each common certification proves, who asks for it, a
sensible order for someone who has finished this track, and the cloud career paths. **Exam prices, passing scores,
question counts, durations, exam codes and renewal rules change** — read the official AWS Certification, Microsoft
Learn and Linux Foundation pages before you book anything, and do not trust a number from a forum or a training
institute's advertisement.

## What a certification proves — and what it does not

A certification proves you passed an exam on a defined body of knowledge on a given date. It does **not** prove you
can find why a target group is unhealthy at 2 a.m., which is why the panel asks about your capstone regardless.
Certifications help in three ways: they get a resume past a filter that names them; they help an employer's
business (AWS and Microsoft partners must show certified staff to keep their partner status, so services companies
and MSPs count certifications); and they give you a structured syllabus. The track already gave you the syllabus;
the first two are what you are buying.

## The certifications in this track's world

| Certification | Body | What it proves | Who tends to ask |
|---|---|---|---|
| AWS Certified Cloud Practitioner | AWS | Foundational: cloud concepts, core services, security and shared responsibility, billing and pricing models | IT services and partners counting certified staff; non-engineering roles |
| AWS Certified Solutions Architect – Associate | AWS | Designing secure, resilient, high-performing and cost-optimised architectures on AWS | The most-named AWS certification in cloud and DevOps JDs: product companies, GCCs, partners |
| Microsoft Azure Fundamentals (AZ-900) | Microsoft | Foundational: cloud concepts, Azure architecture and services, management and governance | Microsoft-stack employers and services firms; a common first step for Azure roles |
| Microsoft Azure Administrator Associate (AZ-104) | Microsoft | Running Azure: identities and governance, storage, compute, virtual networking, monitoring and backup | Azure-first companies, MSPs and GCCs with Azure estates |
| Certified Kubernetes Administrator (CKA) | CNCF / Linux Foundation | Administering a cluster hands-on, in a performance-based exam at the command line: architecture, workloads, networking, storage, troubleshooting | Platform, DevOps and SRE teams running Kubernetes |
| HashiCorp Terraform Associate | HashiCorp | Infrastructure-as-code concepts and the Terraform workflow, state and modules | DevOps JDs that name Terraform |

Notes that matter when choosing:

- **Cloud Practitioner is optional for you.** It is designed for people new to cloud, including non-engineers. After
  this track you already know its syllabus; take it only if a target employer's filter names it, or as a low-stakes
  first experience of the exam format. Many graduates of a track like this go straight to the associate.
- **Solutions Architect – Associate is the one most often named.** It is scenario-based: "which design meets these
  requirements at the lowest cost" — exactly the reasoning of the design round. It is the best single AWS
  certification for this track. The developer and operations associates are good alternatives for roles that name
  them; read the current list on the AWS Certification page, because AWS renames and retires exams.
- **AZ-900, then AZ-104, if you target Azure.** AZ-900 is fundamentals; AZ-104 is the administrator's job and is
  what Azure-first employers and MSPs filter on. Your Azure for AWS Engineers lessons and the DR drill are a start on its syllabus,
  not all of it. Fundamentals certifications such as AZ-900 do not expire; associate-level Microsoft certifications
  are kept current through a free online renewal assessment — check the current rule on Microsoft Learn.
- **CKA is hands-on**, which is why platform teams respect it: you fix and build things in real clusters against
  the clock. Take it after you have run Kubernetes for real — the capstone is the minimum — not as your first.
  CKAD (the developer version) and CKS (security, which requires CKA first) come later.
- **Not yet:** the Professional-level AWS certifications (Solutions Architect – Professional, DevOps Engineer –
  Professional), Azure's AZ-305 and AZ-400 expert-track exams. They are designed for people with real work
  experience; aim at them after a year or two in the job, often with employer support.
- **Free learning paths** — AWS Skill Builder, Microsoft Learn with its free practice assessments, the Kubernetes
  documentation — are good syllabi. Student programmes and exam discounts exist from time to time; check the
  official pages rather than a reseller's promise. A course-completion badge is not a proctored certification, and
  your resume must say which one you hold.
- A certification on your resume carries its **credential ID or verification link** — background verification
  checks it with the issuer. "Exam booked for March" is honest and acceptable; "certified" before you pass is not.

## A sensible order for this track's graduate

| Your target | First | Then | Later, with experience |
|---|---|---|---|
| AWS cloud or DevOps engineer | Solutions Architect – Associate | Terraform Associate or CKA, by what your JDs name | A Professional AWS certification |
| Azure-first employer or MSP | AZ-900 (optional) → AZ-104 | Solutions Architect – Associate for a second cloud | AZ-305 or AZ-400 |
| Platform / Kubernetes / SRE | Solutions Architect – Associate | CKA | CKS or CKAD |
| IT services mass hiring | Cloud Practitioner or AZ-900 (whichever the employer names) | The matching associate | Whatever the first project needs |

One certification at a time, **applying in parallel**. The order comes from counting what your own target JDs name.

## Cloud careers in India

| Role | What the job is | What gets you there |
|---|---|---|
| Cloud support associate / engineer | Troubleshoot customers' or internal teams' cloud problems against runbooks; often shift-based | Linux, networking, one cloud, clear writing |
| Cloud engineer | Build and run accounts, networks, compute and databases, usually as code | Terraform, IAM and VPC depth, an associate certification |
| DevOps engineer | Pipelines, environments, releases, developer tooling | CI/CD, containers, IaC, scripting |
| Site reliability engineer | SLOs, alerting, incidents, capacity, reducing toil with code | Observability, Linux depth, coding, calm on call |
| Platform engineer | An internal platform (Kubernetes, golden paths) that other teams deploy onto | Kubernetes depth, GitOps, product thinking for developers |
| Cloud security engineer | IAM review, guardrails, posture, cloud detections | IAM and networking depth, the Cloud Security and Cost lessons, then security certifications |
| FinOps analyst / engineer | Cost visibility, allocation, savings plans, waste removal | Billing data, tagging, the cost report habit |
| Solutions architect | Designing for customers or product teams | Years of building first — not a fresher role |

Titles are inconsistent across companies — "DevOps engineer" at one is "cloud engineer" at another — so read the
responsibilities, not the title. A common path is two to three years as a cloud, DevOps or support engineer, then a
move towards SRE, platform or security.

## Choosing a first role

| Employer | What you get | What it costs you |
|---|---|---|
| Product company | Ownership, real scale, modern tooling, strong reviews | Few entry openings, high bar, you learn fast alone |
| GCC | Global process, mature tooling, structured training | Narrower scope at first; hours sometimes aligned to another time zone |
| IT services | Training, a certification push, exposure to many clients | You may be placed on a project that is not cloud; bonds and service agreements are common |
| Startup | Breadth: you build and run everything | Little structure or mentoring; on-call from early on |
| MSP or cloud partner | Many customer accounts, certifications paid for, fast learning | Shift work, ticket-driven tasks, customer deadlines |

Ask in every interview: what the first six months of work actually are, whether juniors write Terraform and
pipeline changes that reach production (with review), the on-call or shift pattern, how training and certification
are supported, and any bond or service agreement. A role that keeps you clicking in a console for a year teaches less
than one where your code is reviewed by someone senior.`,
    workedExample: `**Choosing a certification and a first role — two candidates, the same question.** Both finished the track and the
SaleSutra capstone. Both ask: "Which certification should I do first?"

**Sneha** wants a cloud engineer role in Hyderabad. Her shortlist of twenty postings (GCCs, two MSPs, a few product
companies) names: Solutions Architect – Associate in eleven, AZ-104 in six, Cloud Practitioner in three, Terraform
Associate in four, CKA in two. Both MSPs say most of their customers run on Azure.

A weak plan: "Cloud Practitioner, then AZ-900, then both associates, then CKA, and only then apply." That is many
months and several exam fees before a single application, starting with a foundational exam whose syllabus she has
already passed in the track.

A strong plan, written out:

    Goal:          cloud engineer at a GCC or MSP in Hyderabad, applying from this month
    Evidence now:  SaleSutra repo (Terraform, EKS, OIDC pipeline, SLOs, Azure DR drill), resume rewritten
    First:         Solutions Architect – Associate — named in 11 of my 20 postings; matches my AWS capstone
    Second:        AZ-104 if an Azure MSP makes an offer or names it as a condition; employer support asked
    Not now:       Cloud Practitioner (I already know its syllabus), CKA (only 2 of 20 name it)
    Apply:         now, in parallel — "Solutions Architect – Associate, exam booked" is honest

**Arjun** wants a platform or SRE role at a Bengaluru product company. His shortlist rarely names a certification;
it names Kubernetes, Go or Python, Terraform, observability and on-call. A certification is not his bottleneck: the
depth of his answers is. His plan: deepen the capstone (a Karpenter experiment, a second game day, a better
postmortem), practise the troubleshooting and design rounds, and take CKA in a few months because its hands-on exam
is the kind of practice his interviews reward. If no product role comes, a GCC platform team is a good first step.

**What the two plans share.** Each starts from real job descriptions, not a forum list; each counts what the target
employers name; each applies while studying; and each can say in one sentence why this certification and not the
others. That sentence is the answer to "Why did you choose this certification?"`,
    mcqs: [
      mcq('Farhan finished this track and is targeting AWS cloud engineer roles at GCCs. Which first certification fits him best?', [
        ['Solutions Architect – Associate, the AWS exam his target postings name most', true],
        ['Cloud Practitioner, because AWS requires it before any associate exam is booked', false],
        ['A Professional AWS certification, so his resume stands above every other fresher', false],
        ['AZ-900, because a fundamentals exam on Azure counts the same as one on AWS for a GCC', false],
      ], 'The associate matches what the postings ask for and what he built. Cloud Practitioner is not a prerequisite for the associate, Professional exams are designed for experienced engineers, and an Azure fundamentals exam does not answer an AWS filter.'),
      mcq('Why do platform teams tend to respect the CKA more than a multiple-choice certification?', [
        ['It is performance-based: candidates fix and build things in real clusters at the command line', true],
        ['It can only be taken after several years of paid Kubernetes work, which the exam body checks first', false],
        ['It is issued by AWS and Microsoft together, so it counts on both clouds\' partner programmes', false],
        ['It never needs renewing, so it proves knowledge that is current for the whole of a career', false],
      ], 'A hands-on exam is closer to the job than choosing an option, which is why teams running Kubernetes value it. CKA has no work-experience requirement, it comes from the CNCF and Linux Foundation, and it does expire — check the current rule.'),
      mcq('An IT services recruiter asks Nandini why her certifications section lists "AZ-104 — exam booked, February". What is the honest reason that wording is right?', [
        ['It states the real status, which verification will confirm, and still shows her direction', true],
        ['Recruiters treat a booked exam as passed, so it carries the same weight as a credential ID', false],
        ['Writing "certified" is fine only once the exam fee is paid, so booked is a cautious form', false],
        ['Microsoft lets candidates show a certification badge from the day the exam is booked', false],
      ], 'Background verification checks certifications with the issuer, so only true status survives. A booked exam is not equal to a pass, paying the fee does not make anyone certified, and Microsoft issues the credential only after the exam is passed.'),
    ],
    checkpoint: [
      ck(PR, 'Rahul has finished the track and wants a DevOps role. Which certification plan is strongest?', [
        ['Count what his target postings name, book the most-named one, and apply while preparing', true],
        ['Pass Cloud Practitioner, AZ-900, both associates and CKA before sending one application', false],
        ['Skip certifications entirely, since a strong capstone replaces them in every company\'s filter', false],
        ['Start with a Professional AWS exam, so that every entry certification after it looks easy', false],
      ], 'A plan driven by his own target postings fixes the real filter problem while the capstone carries the interview, and applying in parallel loses no time. Collecting five exams delays everything, some filters really do name one, and Professional exams assume work experience.'),
      ck(PR, 'Two offers: an IT services company with a training programme and a bond, and a startup where Ishaan would run AWS alone. He wants to become an SRE. What should decide it?', [
        ['Which role puts him on production systems with reviews and on-call he can learn from', true],
        ['Always the startup, because only startups give freshers access to production systems', false],
        ['Always the services company, because SRE roles are only open to those with a bond served', false],
        ['Whichever pays more, because the type of employer makes no difference to an SRE path', false],
      ], 'SRE skill grows from running real systems with feedback, so the deciding facts are the work and the mentoring. Either "always" rule ignores the specifics of each offer, and pay alone says nothing about what the first two years will teach.'),
      ck(PR, 'In an interview Meghna is asked, "Why did you skip Cloud Practitioner and take the associate first?" Which answer is strongest?', [
        ['Her track covered its syllabus, her target JDs named the associate, and it tests design reasoning', true],
        ['Cloud Practitioner is worthless and nobody in Indian cloud hiring takes it seriously any more', false],
        ['The associate was the only AWS exam her college\'s training cell happened to be offering that term', false],
        ['Her friends said the associate was easier to pass than Cloud Practitioner, so she followed them', false],
      ], 'A strong answer gives reasons tied to her evidence and her goal. Dismissing a credential the panel may hold, or pointing to convenience or friends, shows no judgement of her own.'),
    ],
  },

  /* ── MOCK_LOOP ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_PLACE_CANDIDATE_MOCK_LOOP',
    notes: `One complete interview day for an **entry cloud or DevOps engineer** role in India — the shape most product
companies, GCCs and the stronger services and MSP teams use. Pay varies widely by city, employer and role; check
current figures for each company rather than trusting a forum. Run it with a friend or mentor as interviewer, in one
day, with real timers. The question banks are the other placement topics: Cloud Engineer and DevOps Engineer
Interview Questions for round 1, Cloud Scenario Rounds for rounds 2 and 3. Your evidence in every round is SaleSutra.

## Round 0 — Online assessment (75 min, proctored)

| Section | Time | What it is |
|---|---|---|
| Aptitude | 20 min | quant, logical, reading comprehension |
| Linux, networking and cloud MCQs | 30 min | permissions, processes, ports, DNS, TLS, CIDR, IAM, S3, VPCs |
| Scripting problem | 25 min | a log or inventory file and a Python or Bash task |

**Sample problem.** "Each line of a load-balancer log is time, method, path, status, latency in ms. For each
endpoint (treat /products/<n> as one endpoint), print requests, server errors, the server-error rate and the p95
latency, highest error rate first. Flag any endpoint whose server-error rate is above 2%."

    10:00:01 GET /products/12 200 41      10:00:04 POST /orders 201 210      10:00:06 POST /orders 502 1500
    10:00:01 POST /orders 201 180         10:00:04 GET /products/12 200 44   10:00:07 GET /products/3 200 40
    10:00:02 POST /login 401 35           10:00:05 POST /login 200 52        10:00:07 POST /orders 201 230
    10:00:02 GET /products/7 200 38       10:00:05 POST /orders 201 195
    10:00:03 POST /orders 503 2004        10:00:06 POST /login 401 33
    10:00:03 POST /login 401 30

A correct solution (nearest-rank p95) prints:

    POST /orders           n= 6 5xx=2 rate= 33.3% p95=2004ms  FLAG
    GET /products/{id}     n= 4 5xx=0 rate=  0.0% p95=44ms
    POST /login            n= 4 5xx=0 rate=  0.0% p95=52ms

The traps: **401 is not a server error** — a solution that counts every non-2xx flags /login at 75% and pages someone
for users typing wrong passwords; and the product pages must be grouped, or three endpoints of one request each
hide the pattern. **Scored on:** hidden tests — an empty log, an endpoint with one request, a 499 or 504. In the
interview, say what the flag means: checkout failing for a third of requests with slow responses, which looks like
the database or a dependency, not the load balancer — and that this is exactly an SLO indicator.

## Round 1 — Technical (40 min)

Six or seven questions across Linux, networking, AWS, containers, IaC and CI/CD, for example: "What happens between
typing a URL and the page loading — and which AWS pieces sit on that path in your capstone?", "Security group or
NACL — which is stateful, and what does that change?", "What is in Terraform state, and what happens when two people
apply at once?", "How does your pipeline get into AWS without an access key?", "Your capstone in three minutes."

**Scored on:** correct, explained plainly, honest at the edge of knowledge, connected to something you built.

## Round 2 — Live troubleshooting (40 min)

"After a deploy, the site returns 502 from the load balancer. Here is a terminal on a bastion with read access.
Talk me through it." A strong candidate states the method before typing: what changed (the deploy), what the 502
means (the load balancer reached a target and got a bad or no response), then checks in order — target group health
and its reason codes, the port the targets register on against the port the container listens on, the security
group from the load balancer to the targets, the readiness probe and Pod status (\`kubectl get pods\`,
\`kubectl describe\`, \`kubectl logs --previous\`), and the application's own logs. Then the fix, and how to stop it
recurring (a canary would have caught it at 10%). Variants: a Pod in CrashLoopBackOff, a Lambda timing out on a
database in a private subnet, a \`terraform apply\` failing half-way.

**Scored on:** a hypothesis before each command, reading the output aloud, narrowing in order, no random changes.

## Round 3 — Design (40 min)

"Design the backend for a results-day page: 2 lakh students, most in the first ten minutes, in ap-south-1, on a
startup's budget." Clarify (reads versus writes, how fresh the result must be, login), estimate (requests a second at
the peak), propose (results pre-computed and served from a cache or a CDN, a small API behind a load balancer, the
database protected from the spike), plan the spike (pre-scale before ten o'clock, a load test beforehand), then the
trade-offs and the cost shape — which parts bill by the hour and which by use. Name what you would leave out.

**Scored on:** requirements first, numbers, a simple design that meets them, honest trade-offs, cost awareness.

## Round 4 — Hiring manager and HR (25 min)

"You ran \`terraform destroy\` and realised it was the shared staging workspace. What do you do?" → stop, tell the
team at once, help restore from code and backups, then write a blameless note and a guard (separate accounts or
state, a plan reviewed before destroy) — never hide it. "Are you comfortable with on-call or shifts?", "Relocation
and the service agreement?", "Expected CTC?" — honest and consistent with the resume. Ask your own questions: the
first six months of work, code review, on-call, certification support.

## Scoring sheet (1–4 per row)

| Row | 1 | 4 |
|---|---|---|
| Fundamentals | Errors not noticed | Correct, with where it shows up in a real system |
| Method | Random commands or guesses | Hypothesis, check, narrow — in order |
| Design | Boxes with no numbers | Requirements, estimates, trade-offs and cost |
| Evidence | "It should scale" | Measured figures from the capstone, labelled lab or estimate |
| Communication | Rambling or jargon | Clear enough for a teammate to act on |
| Integrity | Bluffs, hides mistakes | "I don't know — here is how I'd find out"; owns errors |

## Debrief template (fill within an hour)

    Round / interviewer role:
    Questions asked, verbatim:
    Answered well — why:
    Weak or blank — the question + what a strong answer contains:
    Facts I could not recall (commands, ports, service limits, Terraform behaviour):
    Fix before the next loop (max 3, each with a date):`,
    mcqs: [
      mcq('In the round-0 log problem, /login has three 401 responses out of four requests. What should a correct solution report for it?', [
        ['A server-error rate of 0%, since 401 is a client error, and no flag', true],
        ['A server-error rate of 75% and a flag, since three requests did not succeed', false],
        ['A rate of 25%, counting only the one 200 as the error because the rest were blocked', false],
        ['No row for /login at all, because unauthenticated requests are dropped from the log', false],
      ], 'The task counts server errors (5xx); a 401 means the client sent bad credentials and the service behaved correctly. Counting every non-2xx pages people for mistyped passwords, and the requests are still in the log, so the endpoint has a row.'),
      mcq('Round 2: the interviewer says "502 from the load balancer after a deploy". Which first step scores best?', [
        ['State what changed and what a 502 means, then check target health and its reason codes', true],
        ['Restart every Pod in the namespace straight away, since a restart clears most deploy faults', false],
        ['Increase the load balancer\'s idle timeout, because a 502 always means requests are timing out', false],
        ['Roll back the VPC and subnet Terraform, since a 502 points to a networking change in the stack', false],
      ], 'Interviewers score the method: a hypothesis from what changed, then the most informative check. Blind restarts destroy evidence, a 502 is a bad response from the target rather than always a timeout, and nothing suggests the network stack changed.'),
      mcq('Round 3: designing a results-day page for 2 lakh students arriving in ten minutes. What should Tanvi do before drawing any boxes?', [
        ['Clarify reads versus writes and freshness, then estimate the peak requests a second', true],
        ['Pick EKS with a service mesh, so that any load the interviewer adds later is already covered', false],
        ['Ask the interviewer for the budget in rupees and refuse to design until a number is given', false],
        ['Draw a multi-region active-active setup, since the panel always rewards the most resilient design', false],
      ], 'Requirements and numbers come first: a read-heavy, pre-computable result points to caching and pre-scaling. Choosing the heaviest stack or the most resilient diagram without numbers shows no judgement, and a design round expects you to proceed on stated assumptions.'),
      mcq('Round 4: the manager asks what Joseph would do after running terraform destroy on the shared staging workspace by mistake. Which answer scores best?', [
        ['Tell the team at once, help restore from code and backups, then propose a guard against repeats', true],
        ['Quietly re-apply the whole stack before anyone notices, because staging has no real customers to affect', false],
        ['Wait to see whether anyone complains, since staging is often broken for other reasons anyway', false],
        ['Blame the workspace naming, because a tool that allows this mistake is the real cause of it', false],
      ], 'Panels look for ownership and honesty: tell people, fix it, and remove the cause without blame. A quiet re-apply can lose data and others\' work, waiting wastes the team\'s time, and blaming the tool skips the guard that would prevent a repeat.'),
      mcq('After the mock day, Aditi\'s debrief says "Troubleshooting round went badly". Which rewrite is most useful?', [
        ['"Forgot to check the container port against the target group port; practise two 502 drills by 15 Nov"', true],
        ['"Troubleshooting round went badly; I will revise every topic in the whole track over the next month"', false],
        ['"The interviewer gave a problem far harder than anything a fresher DevOps engineer is expected to see"', false],
        ['"I was nervous during troubleshooting, so I need to stay calmer during the next interviews I attend"', false],
      ], 'A useful debrief names the exact gap and a dated fix. Revising everything, blaming the interviewer or noting nerves gives nothing specific to practise before the next loop.'),
    ],
  },

  /* ── CHECKPOINT ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_PLACE_CANDIDATE_CHECKPOINT',
    notes: `This checkpoint measures the judgement a cloud hiring panel looks for: a resume whose every claim has evidence behind
it, a portfolio that runs and leaks nothing, certifications chosen for a reason, and method and honesty across the
interview day.

Recall the rules of this topic:
- **Every claim is checkable** — a repository, a recording, a measured figure, a credential ID.
- **Nothing published that should not be** — no keys, state files, account details or employer work.
- **Method before answers**, and mistakes owned out loud.

Each question is a scenario. Pick what a strong candidate would actually do.`,
    checkpoint: [
      ck(PR, 'Siddharth\'s skills line reads "AWS, Azure, GCP, Jenkins, Ansible, Chef, Puppet, OpenShift, Terraform". He used only AWS, Terraform and a little Azure. What should he do?', [
        ['Cut it to what he used, grouped by area, with each item something he can defend', true],
        ['Keep the list, because a long line of tools shows the breadth a DevOps role wants', false],
        ['Add more tools, since recruiters match keywords and a longer line wins the filter', false],
        ['Keep the list but mark the unused tools "familiar", so nobody can call them false', false],
      ], 'Every item on the line becomes a technical question; unused tools fail the first follow-up and cost trust in the rest. "Familiar" is still a claim he cannot back, and breadth without depth is not what panels reward.'),
      ck(PR, 'A GCC JD says "AWS Solutions Architect – Associate preferred". Dinesh has the capstone and his exam is booked for next month. How should his resume show it?', [
        ['"Solutions Architect – Associate (exam booked, month)", with the capstone leading', true],
        ['"AWS certified", since he will have passed it by the time anyone checks the claim', false],
        ['Nothing about it, because an unfinished certification counts against a candidate', false],
        ['"Solutions Architect – Associate equivalent", since his capstone covers the syllabus', false],
      ], 'True status is honest and still answers a "preferred" line; claiming a pass in advance fails background verification. Hiding it wastes a relevant signal, and "equivalent" is a claim nobody can check.'),
      ck(PR, 'Tejas has offers from a GCC platform team and an MSP where he would handle customer tickets on shifts. He wants to become a platform engineer. Which question matters most?', [
        ['Whether he will write reviewed Kubernetes and Terraform changes in his first year', true],
        ['Which office is nearer his flat, because commuting time matters a lot on any shift', false],
        ['Which company has more LinkedIn followers, since a known brand helps the next switch', false],
        ['Which offer has the more senior-sounding title, since titles set his next job level', false],
      ], 'His goal is platform engineering, so the deciding fact is whether the first year builds that skill with feedback. Commute, brand and title matter less than the work he will actually do.'),
      ck(PE, 'Which file should NOT be in Lakshmi\'s public platform repository?', [
        ['terraform.tfvars with the real database password, so the stack applies in one command', true],
        ['variables.tf with descriptions, types and defaults for every input the stacks accept', false],
        ['DECISIONS.md listing each lab shortcut beside the setting production would use instead', false],
        ['ops/leftovers.py, which lists any billable resource still present after a teardown', false],
      ], 'A tfvars file with a real secret is a credential in Git; secrets belong in a secrets manager or a local, ignored file. Variable definitions, honest trade-offs and the teardown check are exactly what reviewers want to read.'),
      ck(PE, 'Harsh\'s README claims "the canary stops a bad release by itself". What makes this claim checkable?', [
        ['A recording of a broken build failing analysis and the Rollout aborting, with the AnalysisTemplate in the repo', true],
        ['A sentence in the README saying the canary was tested several times before the final demo day', false],
        ['A screenshot of Argo CD showing every application Synced and Healthy on a quiet afternoon', false],
        ['A link to the Argo Rollouts documentation page that describes how canary analysis works', false],
      ], 'The claim is about behaviour under failure, so the evidence must show the failure and the abort, plus the configuration that caused it. A sentence, a healthy screenshot or the vendor\'s documentation shows nothing about his platform.'),
      ck(PE, 'Nisha\'s cost report says "the lab cost very little". How should she make the cost claim checkable without quoting prices from a blog?', [
        ['Cost by session and service from her own bill, billable hours, and a Pricing Calculator production estimate', true],
        ['A list of the AWS Free Tier limits copied from a blog post, since everything stayed inside them', false],
        ['A promise that she always deleted the resources, so the bill could not possibly have been large', false],
        ['The monthly price of each service from a 2023 article, multiplied by the services she used', false],
      ], 'Figures from her own billing data, with the hours that drove them and a labelled estimate for production, can be checked. Copied limits, promises and stale prices from articles describe someone else\'s bill, not hers.'),
      ck(IP, 'In round 1 Ravi is asked how Terraform state locking works with an S3 backend and is unsure of the detail. What should he do?', [
        ['Say what he knows, name the gap, say where he would check it, and explain why locking matters', true],
        ['Give a confident, detailed answer anyway, because a pause looks under-prepared to the panel', false],
        ['Say that state locking is an old feature and no longer matters for any modern Terraform team', false],
        ['Change the subject to his Kubernetes work, where he is much more confident than with Terraform', false],
      ], 'Panels score honesty at the edge of knowledge; a confident wrong answer is worse than a named gap. Locking still matters whenever two applies could overlap, and dodging leaves the gap where the panel can see it.'),
      ck(IP, 'In the troubleshooting round, the interviewer adds: "The target group shows the targets as healthy." How should Megha change her plan?', [
        ['Drop the health-check theory and look at what healthy targets return: app logs, timeouts, the response', true],
        ['Keep checking the health checks, since changing course now would look indecisive to the panel', false],
        ['Declare the load balancer faulty and propose replacing it, since its targets are all healthy', false],
        ['Ask the interviewer to say which component is broken, so that she can move on to the fix', false],
      ], 'New evidence should narrow the search: healthy targets point at what they return under real requests. Sticking to a disproved theory, blaming the load balancer without evidence or handing the question back all fail the method being tested.'),
      ck(IP, 'A design-round panellist asks Kunal: "Your capstone pre-scales to 16 Pods for the sale. Why not just rely on the HPA?" Which answer is strongest?', [
        ['The HPA reacts in minutes while a sale spikes in seconds, so capacity must be there before it opens', true],
        ['The HPA does not work on EKS, so pre-scaling by hand was the only option available to him', false],
        ['Sixteen Pods is the most a single node group can hold, so the HPA would have stopped there anyway', false],
        ['Pre-scaling is always cheaper than autoscaling, since the cluster bills less for idle Pods', false],
      ], 'Autoscaling follows load with a delay, so a known, sudden spike needs capacity ready in advance — the reasoning from his own capacity plan. The HPA works on EKS, there is no such Pod limit, and pre-scaling costs more, not less.'),
      ck(IP, 'In the HR round, Abhishek is asked: "Are you comfortable with on-call?" He has never done it but is willing. What is the best answer?', [
        ['Say yes honestly, mention the game day and runbooks, and ask how the rota and support work', true],
        ['Say he loves being on call, because any hesitation at this late stage will cost him the offer', false],
        ['Say he cannot do on-call, and hope the team makes an exception for him after he joins', false],
        ['Avoid the question and talk about his capstone instead, so that the topic is dropped', false],
      ], 'An honest yes backed by relevant practice, plus a question about the rota, builds trust. Overstating enthusiasm, refusing and hoping for an exception, or dodging all create problems after joining.'),
    ],
  },
];
