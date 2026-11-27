/**
 * Career-track content: Cloud Security for Analysts (CY_CLOUD_SECURITY), Cybersecurity Analyst, batch CY3.
 *
 * The analyst's view of a cloud account: who secures what (shared responsibility), least-privilege identity
 * and access, networks and storage that do not leak, the audit and flow logs a SOC reads, and posture checks
 * for the account and its containers. AWS is the concrete provider throughout; Azure and GCP equivalents are
 * named in a line. It builds on CY1's "Firewalls, Segmentation and Least-Privilege Networks", "Identity and
 * Access Management" and "Keys and Secrets Management", on CY2's SIEM, Sigma and incident-response units and on
 * CY3's "Dependencies, SBOMs and Container Images"; those are referred to by title, not re-taught.
 *
 * Defensive only, on accounts the student owns or is authorised to review. One fictional company runs through
 * the topic: Swasthya Labs, a Pune diagnostics chain whose lab reports (health data) live in AWS Mumbai. Every
 * finding, count and timeline in the notes is real output of Python (pandas 3, PyYAML, pySigma 1.5) run over
 * synthetic IAM policies, security groups, bucket settings, CloudTrail records, an account inventory and
 * Kubernetes manifests. AWS CLI, kubectl, kube-bench and Prowler commands were written from their
 * documentation and NOT run (no cloud account or cluster was used); the notes say so where they appear.
 *
 * Skills: IAM_FUNDAMENTALS by default; the networks-and-storage lesson is CLOUD_NETWORKING. Checkpoint
 * questions plainly about networks use ck('CLOUD_NETWORKING', ...), and about storage exposure
 * ck('CLOUD_STORAGE', ...).
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_CY_CLOUD_SECURITY_BUNDLES: PilotBundle[] = [
  /* ── SHARED_RESPONSIBILITY ───────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_CLOUD_SECURITY_SHARED_RESPONSIBILITY',
    notes: `Swasthya Labs, a diagnostics chain in Pune, moved its patient report portal to AWS in the Mumbai region
(ap-south-1). At the kick-off meeting the CTO said: "AWS is ISO 27001 and SOC 2 certified, so the cloud part is
covered." That sentence is behind a large share of cloud incidents. The certificates are real, but they cover
**AWS's half** of the job. The other half is yours, and no certificate of theirs says anything about it.

## Security of the cloud, security in the cloud

AWS phrases the split this way:

- **Security OF the cloud** — the provider's job: data centres, guards and cameras, hardware, the network
  between regions, the hypervisor that separates your virtual machines from other customers', and the
  software behind each managed service.
- **Security IN the cloud** — the customer's job: who can log in and what they may do, how each service is
  configured, what is exposed to the internet, the operating systems you run, your code and above all your data.

Azure and Google Cloud draw the same line with different words. The exact split moves with the **service
model**, and that is what an analyst has to be able to say for any service in front of them.

## How the line moves: IaaS, PaaS, SaaS

    Control                          On-prem   IaaS (EC2)   PaaS (RDS, Lambda)   SaaS (Microsoft 365)
    Physical, power, hardware        you       provider     provider             provider
    Hypervisor / host OS             you       provider     provider             provider
    Guest OS patching                you       YOU          provider             provider
    Database engine / runtime        you       YOU          provider             provider
    Network rules (security groups)  you       YOU          YOU                  provider (mostly)
    Application code                 you       YOU          YOU                  provider
    Identities, access, MFA          you       YOU          YOU                  YOU
    Configuration of the service     you       YOU          YOU                  YOU
    Data: classification, sharing    you       YOU          YOU                  YOU

Read the last three rows twice: **identity, configuration and data are always yours**, even in SaaS. Microsoft
runs Exchange Online, but if a Swasthya employee shares a folder of reports with "anyone with the link", that is
Swasthya's incident. With Amazon RDS, AWS patches PostgreSQL for you (within the maintenance window you choose),
but whether the database is reachable from the internet and who holds the master password is your decision.

## Where cloud breaches actually come from

Hardware failures and hypervisor escapes make headlines precisely because they are rare. The incidents an
Indian SOC handles week to week are on the customer side:

1. **Over-broad identities** — a developer's policy with "Action": "*" and a long-lived access key on a laptop.
2. **Leaked credentials** — an access key pushed to a public repository (you handled exactly this alert in
   CY1's "Keys and Secrets Management").
3. **Exposed storage** — a bucket made public "for a day" to share files with a partner.
4. **Exposed admin ports** — SSH or RDP open to 0.0.0.0/0 for debugging and never closed.
5. **Logging that was never turned on** — so when something does happen, nobody can say what.

The Capital One breach (2019) is the textbook case: a misconfigured web application firewall let requests reach
the EC2 instance metadata service, which handed out the credentials of a role that could read far too many S3
buckets. Every link in that chain — the WAF configuration, the metadata settings, the role's permissions — was
on the customer's side of the line. The defensive lessons became standard controls: require IMDSv2 for the
metadata service, and give each workload role only the buckets it needs.

## What the provider's evidence covers

AWS publishes its audit reports (SOC 2, ISO 27001 and others) through **AWS Artifact**; Azure and GCP have
equivalent compliance portals. Auditors and bank customers will ask for them — and then ask for **your** half:
your access reviews, your logging, your configuration baselines. A sentence for your own notes: "the provider's
certificate is necessary evidence, never sufficient evidence."

## Accounts, regions and guardrails

A mature AWS setup does not put everything in one account. **AWS Organizations** groups accounts — typically
separate ones for production, development, security tooling and a **log archive** that almost nobody can
write to. **Service control policies (SCPs)** set guardrails over member accounts, for example "nobody in any
account may stop CloudTrail" or "no resources outside ap-south-1 and ap-south-2". Azure uses management groups
and Azure Policy for the same idea; GCP uses folders and Organization Policy.

Region matters in India. AWS has Mumbai (ap-south-1) and Hyderabad (ap-south-2). RBI expects payment-system
data to be stored in India, and the DPDP Act governs personal data (CY3's "Security Obligations in India"
covers both in outline). Read the current text before telling anyone what they require; your job as an analyst
is to notice when data or activity turns up in a region the organisation does not use.

## What changes for the analyst

You lose things you relied on: there is no network tap on the provider's switches and no disk to pull out of
a server. You gain others: every control-plane action is an API call that can be logged (CloudTrail), network
flows can be recorded (VPC Flow Logs), disks can be snapshotted in seconds for evidence (CY2's "Evidence and
Forensics Basics" still applies — the snapshot is your image), and the provider runs detections of its own
(Amazon GuardDuty, Microsoft Defender for Cloud, Google Security Command Center). The rest of this topic is
about using those well.`,
    workedExample: `**Scenario.** Swasthya runs three things: the patient portal on EC2 behind a load balancer, the reports
database on Amazon RDS for PostgreSQL, and staff email and files on Microsoft 365. The new CISO asks you for a
one-page responsibility matrix and, as a test, who acts on three recent events.

**1. The matrix (abridged).**

    Control                         Portal (EC2, IaaS)   Reports DB (RDS, PaaS)     Email (M365, SaaS)
    OS and engine patches           Swasthya IT          AWS, in our window          Microsoft
    Network exposure                Swasthya (SGs)       Swasthya (SGs, public flag) Microsoft + our sharing settings
    Encryption at rest              Swasthya: EBS keys   Swasthya: set at creation   Microsoft, our key options
    Identities and MFA              Swasthya             Swasthya (IAM + DB users)   Swasthya (Entra ID)
    Logs collected to the SIEM      Swasthya             Swasthya                    Swasthya (audit log export)
    Backups tested                  Swasthya             Swasthya (snapshots, PITR)  Swasthya decides retention

**2. Event A — "AWS has announced a patch for a hypervisor vulnerability."** Provider's side. Action for
Swasthya: read the bulletin, confirm nothing is required of customers, note it in the risk register.

**3. Event B — "The reports database is listed by an internet scanner with port 5432 open."** Customer's side,
however managed RDS is: the security group and the "publicly accessible" setting are Swasthya's. Raise a
high-priority finding to the database owner; this is exactly what the next lessons teach you to find.

**4. Event C — "A lab technician forwarded 40 reports to a personal Gmail account."** Customer's side, inside
SaaS: identity, data handling and policy. Microsoft provides the controls (data-loss prevention, external
forwarding rules); whether they are switched on is Swasthya's. It also starts the incident and DPDP process.

**Result.** The CISO's question "is the cloud secure?" becomes a better one: "which of our rows have an owner,
evidence and logging?" Every empty cell is a finding.`,
    mcqs: [
      mcq('Swasthya runs PostgreSQL on Amazon RDS. A critical PostgreSQL engine patch is released. Who applies it?', [
        ['AWS applies it, during the maintenance window the customer has chosen', true],
        ['The customer logs in to the RDS database host over SSH and installs it', false],
        ['Nobody does, because managed database engines are never patched', false],
        ['The customer must rebuild the database from scratch on a new engine', false],
      ], 'With PaaS such as RDS the provider patches the engine and the host; the customer controls when (the maintenance window) and some version choices. RDS gives no SSH access to the host, engines are patched, and a rebuild is not how patches are applied.'),
      mcq('A start-up says "we only use SaaS, so cloud security is entirely the vendor\'s job". Which responsibility stays with the start-up even in SaaS?', [
        ['Who has accounts, whether MFA is on, and what data users share', true],
        ['Patching the SaaS vendor\'s servers and their operating systems', false],
        ['Physical security of the data centres that host the application', false],
        ['Separating its tenant from other tenants at the hypervisor layer', false],
      ], 'Identity, configuration and data are the customer\'s in every service model. Server patching, physical security and tenant isolation are the SaaS provider\'s side of the line.'),
      mcq('Which control most directly addressed the chain seen in the Capital One breach, where a misrouted request reached the instance metadata service and returned role credentials?', [
        ['Requiring IMDSv2 and trimming the role to only the buckets the app needs', true],
        ['Buying a provider certificate such as ISO 27001 for the customer account', false],
        ['Moving the S3 buckets to a different AWS region from the EC2 instances', false],
        ['Turning on default S3 encryption at rest with SSE-S3 for all of the buckets', false],
      ], 'IMDSv2 requires a session token that a simple forwarded request cannot obtain, and least privilege limits what stolen role credentials can read. Certificates cover the provider, regions do not change permissions, and S3 decrypts transparently for any principal allowed to read.'),
    ],
    checkpoint: [
      mcq('An auditor at a bank asks Swasthya for evidence about its AWS environment. Swasthya sends only the AWS SOC 2 report from AWS Artifact. What is missing?', [
        ['Evidence of Swasthya\'s own half: access reviews, logging and configuration', true],
        ['Nothing, because the AWS report covers every control in a customer account', false],
        ['A second copy of the same AWS report, signed by Swasthya\'s own auditor', false],
        ['The AWS ISO 27001 certificate, since SOC 2 reports are not accepted in India', false],
      ], 'Provider reports cover security OF the cloud. The auditor also needs the customer\'s controls IN the cloud. A re-signed copy adds nothing, and a SOC 2 report is not rejected for being SOC 2; it simply covers the wrong half.'),
      ck('CLOUD_NETWORKING', 'An internet scan shows SSH open to the world on an EC2 instance in Swasthya\'s account. Under the shared responsibility model, whose fix is it?', [
        ['Swasthya\'s, because security groups and exposure are customer settings', true],
        ['AWS\'s, because EC2 is an AWS service running on AWS-owned hardware', false],
        ['The internet service provider\'s, since the scan came across its network', false],
        ['Nobody\'s, because port 22 is protected by SSH encryption on its own', false],
      ], 'Network rules on IaaS are configured by the customer. The provider owns the hardware but not the customer\'s security group, the ISP does not decide what Swasthya exposes, and encryption does not stop login attempts against an open admin port.'),
      mcq('Swasthya wants a rule that no account in its AWS Organization can stop CloudTrail, even an account administrator. Which mechanism fits?', [
        ['A service control policy applied to the member accounts', true],
        ['An inline policy on each administrator\'s own IAM user', false],
        ['A bucket policy on the S3 bucket that stores the logs', false],
        ['A tag on the trail saying that it must not be stopped', false],
      ], 'SCPs cap what any principal in a member account can do, including administrators. An administrator can edit their own inline policy, a bucket policy protects the bucket rather than the trail\'s logging state, and tags do nothing unless a policy evaluates them.'),
    ],
  },

  /* ── CLOUD_IAM ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_CLOUD_SECURITY_CLOUD_IAM',
    notes: `In CY1's "Identity and Access Management" you met joiners, movers and leavers, MFA and privileged access.
In the cloud the same ideas become JSON. Every API call — read an object, start a server, change a policy — is
checked against policies, and those policies are where most cloud risk lives.

## Who can act in an AWS account

- **The root user** — the email address that created the account. It can do everything, including close the
  account. Give it a strong password and hardware MFA, create **no access keys** for it, and use it only for the
  handful of tasks that require it. Any root activity is worth an alert.
- **IAM users** — long-lived identities with a password and/or access keys. Avoid them for people: use
  **IAM Identity Center** with your company directory (Entra ID or Google Workspace), so leavers lose cloud
  access when HR offboards them.
- **IAM roles** — identities with no long-term secret. A person, a service or another account **assumes** the
  role and receives temporary credentials from STS that expire. EC2 instances get them through an instance
  profile; Lambda functions through an execution role.

Access key IDs tell you which kind you are looking at: **AKIA...** is a long-term user key, **ASIA...** is a
temporary STS credential. When a key leaks, AKIA keys keep working until someone deactivates them.

## Anatomy of a policy

A least-privilege identity policy for the reports team:

    {
      "Version": "2012-10-17",
      "Statement": [{
        "Sid": "ReadReports",
        "Effect": "Allow",
        "Action": ["s3:GetObject", "s3:ListBucket"],
        "Resource": ["arn:aws:s3:::swasthya-reports", "arn:aws:s3:::swasthya-reports/*"]
      }]
    }

**Effect** is Allow or Deny; **Action** names API operations (service:Operation, case-insensitive);
**Resource** names ARNs; an optional **Condition** adds requirements such as MFA, source network, tags or
region. Resource-based policies (bucket policies, KMS key policies) and role **trust policies** also carry a
**Principal**: who the policy applies to.

## How AWS decides

1. Everything starts as **implicit deny**.
2. An **explicit Deny** in any applicable policy wins, always.
3. Otherwise an **Allow** is needed — from an identity policy or a resource policy (within one account).
4. Guardrails cap the result: SCPs, permission boundaries and session policies can only take away.

So "we added Allow s3:* but the user still gets AccessDenied" usually means an explicit Deny or an SCP; and "we
never granted that, how did they do it?" usually means a wildcard or a resource policy you did not read.

## What least privilege looks like in practice

- Name **actions**, not services: "s3:GetObject", not "s3:*".
- Name **resources**: a bucket ARN, a function ARN, a key ARN — not "*".
- Add **conditions** for sensitive actions: aws:MultiFactorAuthPresent, aws:SourceIp or aws:SourceVpce,
  aws:RequestedRegion, aws:PrincipalTag.
- Never pair **Allow with NotAction** ("everything except IAM") — it silently grants every new service AWS
  launches.
- Treat these as **admin-equivalent** in reviews, because each lets a holder raise their own access:
  iam:PassRole on "*", iam:CreatePolicyVersion, iam:AttachUserPolicy / AttachRolePolicy, iam:PutUserPolicy,
  iam:CreateAccessKey on other users, iam:UpdateAssumeRolePolicy. (Named here so you can spot them, not use them.)
- For **trust policies**, "Principal": {"AWS": "*"} with no condition means any AWS principal may try to assume
  the role. A third-party vendor role needs the vendor's account as principal and an **sts:ExternalId**
  condition, which defends against the confused-deputy problem.

## Reviewing who can do what, with code

Swasthya's six identity policies and two trust policies are in policies.json. A small checker flags full admin,
service wildcards, NotAction, PassRole on any role, writes on any resource, sensitive actions with no condition,
and trust policies open to anyone. Its real output:

    ReportsReadOnly: OK
    DevOpsEngineer: 1
      CRITICAL Everything     full admin: Action * on Resource *
    BreakGlassAdmin: 1
      HIGH     AdminWithMfa   admin behind a Condition: confirm it is break-glass
    LabUploaderApp: 2
      HIGH     Uploads        service wildcard s3:*
      MEDIUM   DecryptAny     sensitive actions with no Condition (MFA, source, tag)
    CiDeployRole: 3
      HIGH     Deploy         iam:PassRole on any role
      MEDIUM   Deploy         write actions on Resource *: lambda:updatefunctioncode, iam:passrole
      MEDIUM   Deploy         sensitive actions with no Condition (MFA, source, tag)
    SupportTeam: 1
      HIGH     AllButIam      Allow with NotAction grants everything not listed
    VendorAuditRole (trust): 1
      CRITICAL AnyoneMayAssume trust policy: any AWS principal may assume this role
    AppServerRole (trust): OK
    totals: {'CRITICAL': 2, 'HIGH': 4, 'MEDIUM': 3}

The checker lower-cases actions before comparing, because AWS treats action names case-insensitively, and it
accepts Action and Resource as either a string or a list — both are legal JSON shapes for a policy. A finding is
a question, not a verdict: BreakGlassAdmin is supposed to be powerful; the review confirms it is MFA-gated,
rarely used and alerted on.

## The AWS tools for the same job (not run here)

Written from the AWS CLI documentation; no account was used:

    aws iam get-account-authorization-details --output json > authz.json
    aws iam generate-credential-report
    aws iam get-credential-report --query Content --output text | base64 --decode > creds.csv
    aws iam simulate-principal-policy \\
        --policy-source-arn arn:aws:iam::111122223333:role/CiDeployRole --action-names iam:PassRole
    aws accessanalyzer list-findings --analyzer-arn <analyzer-arn>

The first dumps every user, role and policy for offline review (feed it to a checker like the one above). The
**credential report** lists every user's password, MFA and access-key age and last use — the fastest way to
find stale keys. **IAM Access Analyzer** reports resources shared outside the account and unused access, and can
draft a policy from the actions a role actually used in CloudTrail. "Last accessed" data shows which services a
role has not touched in months; those permissions can go.

Azure has the same ideas as role assignments at a scope (Azure RBAC) and Entra ID Privileged Identity
Management for just-in-time admin; GCP has IAM bindings on resources, where the broad basic roles Owner and
Editor are the "Action: *" to look for, and downloadable service account keys are the AKIA keys to hunt down.`,
    workedExample: `**Scenario.** The checker flagged CiDeployRole (HIGH: iam:PassRole on any role). The CI pipeline only
deploys the report-generation Lambda functions, which all run with one execution role. You rewrite the policy
and re-run the review.

**1. Why PassRole on "*" matters.** Passing a role means giving a service (Lambda, EC2) a role to run as. If CI
may pass **any** role, a compromised pipeline can attach the most powerful role in the account to a function it
controls — admin by one step. The fix is to name the one role CI is allowed to pass.

**2. The rewrite.**

    {
      "Version": "2012-10-17",
      "Statement": [
        {"Sid": "DeployReportFunctions", "Effect": "Allow",
         "Action": ["lambda:UpdateFunctionCode", "lambda:UpdateFunctionConfiguration"],
         "Resource": "arn:aws:lambda:ap-south-1:111122223333:function:report-*"},
        {"Sid": "PassOnlyTheExecRole", "Effect": "Allow", "Action": "iam:PassRole",
         "Resource": "arn:aws:iam::111122223333:role/report-lambda-exec",
         "Condition": {"StringEquals": {"iam:PassedToService": "lambda.amazonaws.com"}}}
      ]
    }

The functions are named by ARN pattern (only report-* in Mumbai), PassRole names one role, and the
iam:PassedToService condition means that role can be handed only to Lambda, not to an EC2 instance.

**3. Re-run the checker.** Its real output on the new document:

    CiDeployRole (fixed): OK

**4. Prove it still works.** A clean review does not mean the pipeline still deploys. Before merging, the
platform team runs the CI job in a staging account, and you check CloudTrail for AccessDenied errors from the
role (the next lessons show how). Tightening that breaks deployment gets rolled back and loosened by hand at 2 a.m.,
usually too far.

**5. Record it.** Finding, change, evidence of the clean review and the successful staging run go on the ticket:
that is your access-review evidence for the next audit.`,
    mcqs: [
      mcq('A leaked credential in a CloudTrail record starts with ASIA. What does that tell you?', [
        ['It is a temporary STS credential, which expires on its own', true],
        ['It is a long-term access key that belongs to an IAM user', false],
        ['It belongs to the root user of the account, so it is critical', false],
        ['It was created in the Asia Pacific region, so it is local', false],
      ], 'ASIA prefixes temporary credentials issued by STS (for example after assuming a role); AKIA prefixes long-term user keys. Neither prefix means root, and the prefix has nothing to do with a region.'),
      mcq('A user has an identity policy allowing s3:* on a bucket, yet gets AccessDenied on GetObject. Which explanation fits AWS policy evaluation?', [
        ['An explicit Deny in another policy or an SCP applies to them', true],
        ['s3:* covers only bucket-level actions, never object reads', false],
        ['Allows need to appear in at least two separate policies', false],
        ['Policies take effect only after the user signs out and in', false],
      ], 'An explicit Deny anywhere, or a guardrail such as an SCP or permission boundary, overrides an Allow. s3:* covers object actions too, one Allow is enough, and IAM changes do not wait for a sign-out (they propagate within moments).'),
      mcq('Why does a reviewer flag "Effect": "Allow" with "NotAction": "iam:*" on "Resource": "*"?', [
        ['It grants every non-IAM action, including services launched later', true],
        ['It denies all IAM actions, which locks the account administrators out', false],
        ['NotAction is not valid JSON in an identity policy, so it fails to save', false],
        ['It grants only IAM actions, which is the opposite of what was meant', false],
      ], 'Allow plus NotAction allows everything except the listed actions, so new services are granted automatically. It does not deny IAM (it merely does not allow it), NotAction is valid, and it grants the complement of IAM rather than IAM.'),
    ],
    checkpoint: [
      mcq('A vendor that audits Swasthya\'s AWS bills needs to assume a read-only role from its own account. Which trust policy is right?', [
        ['Principal is the vendor\'s account, with an sts:ExternalId condition', true],
        ['Principal "AWS": "*", so the vendor can assume it from any account', false],
        ['Principal is the vendor\'s account, with no conditions so it is simple', false],
        ['No trust policy; share a Swasthya IAM user\'s access key with them', false],
      ], 'Naming the vendor account limits who may assume the role, and the ExternalId condition guards against the confused-deputy problem. "*" opens the role to anyone, dropping the condition loses that protection, and sharing a long-term user key defeats the point of a role.'),
      mcq('The credential report shows svc-backup has an access key created 980 days ago and last used 650 days ago. What is the best next step?', [
        ['Confirm with the owner, deactivate the key, then delete it if nothing breaks', true],
        ['Rotate the key at once and give the new one to the same backup system', false],
        ['Leave it, since an unused key cannot be used by anyone, so it is harmless', false],
        ['Delete the whole AWS account\'s IAM users and recreate them from scratch', false],
      ], 'A key unused for almost two years is likely unneeded; deactivating first is reversible if something does depend on it, then delete. Rotating keeps an unneeded credential alive, an unused key still works if leaked, and mass deletion is disruptive and unnecessary.'),
      mcq('Which permission should a review treat as admin-equivalent even though it does not say "*"?', [
        ['iam:CreatePolicyVersion on the policies attached to the user', true],
        ['s3:GetObject on one named bucket that holds public images', false],
        ['ec2:DescribeInstances on all of the instances in the account', false],
        ['cloudwatch:GetMetricData on every metric in the Mumbai region', false],
      ], 'A principal that can write a new default version of its own policy can grant itself anything. Reading one bucket, describing instances or reading metrics do not let a principal change its own permissions.'),
    ],
  },
  /* ── CLOUD_NETWORK_STORAGE ───────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_CLOUD_SECURITY_CLOUD_NETWORK_STORAGE',
    notes: `Two settings cause most cloud exposure an analyst is asked about: a network rule that lets the whole
internet in, and a storage bucket that lets the whole internet read. This lesson is about finding both, and about
the designs that make them unnecessary. The firewall thinking is CY1's "Firewalls, Segmentation and
Least-Privilege Networks"; here it is applied to AWS objects.

## The virtual network

A **VPC** is your private network in a region. It is split into **subnets**; a subnet is "public" only because
its route table sends 0.0.0.0/0 to an **internet gateway**. Private subnets reach out (for updates) through a
**NAT gateway** and cannot be reached from outside. The usual three tiers:

    internet -> load balancer (public subnets) -> app servers (private) -> database (private, no route out)

Two kinds of filter apply:

- **Security groups** — attached to each network interface (instance, load balancer, database). They are
  **stateful** (replies are allowed automatically), **allow-only** (there is no deny rule) and can name another
  security group as the source: "allow 5432 from the app-servers group", whatever the servers' IPs are.
- **Network ACLs** — attached to subnets, **stateless** (you must allow the return traffic too), numbered rules
  evaluated in order, with allow and deny. Use them as a coarse second layer, for example to deny a known-bad range.

Azure's equivalent is the **network security group** (it does have deny rules and priorities); GCP uses VPC
**firewall rules** applied by network tags or service accounts.

## Rules that should never exist

- **Admin ports open to the world** — 22 (SSH), 3389 (RDP), 5985/5986 (WinRM) from 0.0.0.0/0 or ::/0. Use AWS
  Systems Manager Session Manager (no inbound port at all, every session logged) or a bastion reachable only
  from the office range with MFA.
- **Database ports open to the world** — 3306, 5432, 1433, 6379, 27017, 9200. Databases belong in private
  subnets, reachable only from the app tier's security group.
- **"All traffic" rules** — protocol -1 from anywhere, usually called something like temp-debug.
- **Forgetting IPv6** — ::/0 is "the whole internet" too, and many quick checks only look for 0.0.0.0/0.

## Checking security groups with code

The inventory has the output shape of "aws ec2 describe-security-groups". The checker looks for world-open
sources (IPv4 and IPv6), then grades by what is open; port 443 on the load balancer is expected and skipped.
Real output:

    Security groups open to the internet
      CRITICAL sg-0e5 temp-debug       0.0.0.0/0 all or most ports open to the internet [SSH/22, RDP/3389, WinRM/5985] attached=0
      CRITICAL sg-0f6 legacy-ftp       ::/0      all or most ports open to the internet [SSH/22, RDP/3389, MySQL/3306] attached=1
      HIGH     sg-0b2 app-servers      0.0.0.0/0 admin port open to the internet [SSH/22] attached=2
      HIGH     sg-0c3 reports-db       0.0.0.0/0 database port open to the internet [PostgreSQL/5432] attached=1

"attached" matters for priority: temp-debug is attached to nothing, so it is a clean-up item; legacy-ftp
opens ports 20 to 3400 to all of IPv6 on a live server, and reports-db exposes the health database. The
jump-windows group allowing 3389 from 203.0.113.10/32 (one office address) was correctly not flagged.

The same question asked of AWS directly (written from the CLI documentation, not run):

    aws ec2 describe-security-groups --filters Name=ip-permission.cidr,Values=0.0.0.0/0 \\
        --query "SecurityGroups[].{id:GroupId,name:GroupName}"

## Private endpoints

Servers in private subnets often need S3 or other AWS APIs. A **VPC gateway endpoint** (S3, DynamoDB) or an
**interface endpoint** (PrivateLink, for most other services) keeps that traffic off the internet. A bucket
policy can then require the endpoint — a Deny unless aws:SourceVpce equals your endpoint ID — so even a stolen
credential cannot read the bucket from outside the VPC. Azure calls these Private Endpoints; GCP has Private
Service Connect and Private Google Access.

## How storage leaks

S3 buckets are private by default, and since April 2023 new buckets start with **Block Public Access** on and
ACLs disabled. Buckets still leak, through:

- a **bucket policy** with "Principal": "*" and no condition (often "temporarily, for the partner");
- a legacy **ACL** granting READ to the AllUsers group — or to AuthenticatedUsers, which means *any AWS
  account in the world*, not "our users";
- **presigned URLs** generated with long expiry and pasted into email or WhatsApp;
- **static website hosting** switched on for a bucket that also holds private files.

**Block Public Access** (BPA) has four switches: BlockPublicAcls and IgnorePublicAcls (for ACLs),
BlockPublicPolicy and RestrictPublicBuckets (for policies). They can be set per bucket and, more strongly,
for the **whole account**. Real output of the bucket check over Swasthya's four buckets:

    S3 buckets
      swasthya-reports         data=health  OK
      swasthya-lab-uploads     data=health  PUBLIC (policy); Block Public Access not fully on; versioning off; health data not under a KMS key (SSE-S3 only)
      swasthya-website         data=public  OK
      swasthya-db-backups      data=health  PUBLIC (ACL); Block Public Access not fully on

The checker decides "public" the way S3 does: a public policy counts only if RestrictPublicBuckets is off, a
public ACL only if IgnorePublicAcls is off. Two health-data buckets are readable by anyone.

## Encryption at rest is not access control

Since January 2023 S3 encrypts every new object (SSE-S3) by default. That protects against someone walking off
with a disk; it does **nothing** against a public bucket, because S3 decrypts for anyone the policy allows.
**SSE-KMS** with a customer managed key adds a second gate (the KMS key policy must also allow the caller) and
logs every Decrypt in CloudTrail — which is why sensitive data should use it. (S3 also refuses anonymous
requests for SSE-KMS objects, a useful side effect but not a reason to leave a policy public.) Turn on **EBS encryption by
default** per region; an RDS instance's encryption is chosen at creation (an unencrypted one is fixed by
snapshot, encrypted copy, restore). For backups, **versioning** plus **Object Lock** keeps earlier copies
safe from deletion and ransomware.

Commands for the bucket checks (from the documentation, not run):

    aws s3api get-bucket-policy-status --bucket swasthya-lab-uploads
    aws s3control get-public-access-block --account-id 111122223333
    aws s3api put-public-access-block --bucket swasthya-db-backups \\
        --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

Azure storage accounts have an "allow blob anonymous access" setting to keep off; GCP buckets have **public
access prevention** and uniform bucket-level access.`,
    workedExample: `**Scenario.** The bucket check reports swasthya-lab-uploads as PUBLIC (policy). It holds PDFs of
patients' lab reports. You are L2 on shift; the bucket owner is the portal team.

**1. Confirm, do not assume.** Read the policy and the bucket's policy status (get-bucket-policy-status
returns IsPublic). Here the statement is Allow, Principal "*", s3:GetObject on every object, with no condition
— anyone with an object's URL can download it. Object keys are guessable patterns (report IDs), so "nobody
knows the URL" is not a defence.

**2. Ask why it is public before closing it.** The portal team says patients download reports through a link
in an SMS. Closing the bucket blindly would break that — and then someone reopens it in a hurry. The right
design already exists: the portal generates a **presigned URL** for one object, valid for a short time, after
the patient logs in.

**3. Contain, reversibly.** With the portal team on the call, turn on all four BPA switches for the bucket
(one command, reversible), switch the portal to presigned URLs, and remove the public statement. Then enable
account-level BPA so the next bucket cannot repeat this.

**4. Scope the exposure.** Who downloaded what while it was public? That needs **S3 server access logs** or
CloudTrail **data events** for the bucket. If neither was on — common — say so plainly in the ticket: "access
during the exposure window cannot be determined". Do not write "no evidence of access" when there was no
logging to provide evidence.

**5. Hand over to incident response.** Health data was exposed to the internet for an unknown period: this
goes into the incident process and the DPDP assessment from CY2's "Reporting Incidents and Learning from Them",
with the policy, the timestamps of the change (from CloudTrail PutBucketPolicy) and the containment steps as
evidence.`,
    mcqs: [
      mcq('An app security group allows 8080 from the load balancer\'s security group rather than from an IP range. What is the advantage?', [
        ['Traffic is allowed from whatever instances use that group, even as IPs change', true],
        ['Security groups referencing groups are stateless and therefore faster', false],
        ['It also blocks the load balancer from reaching the app on any port', false],
        ['It makes the app servers reachable from the whole internet on 8080', false],
      ], 'Referencing a security group allows traffic from any interface carrying that group, so autoscaling or IP changes need no rule edits. Security groups are stateful either way, the rule allows (not blocks) the load balancer, and it does not open the app to the internet.'),
      mcq('A bucket ACL grants READ to the AuthenticatedUsers group. A developer says "fine, only our logged-in staff". What is wrong?', [
        ['That group means any AWS account holder anywhere, not your staff', true],
        ['That group means only the root user of the bucket owner\'s account', false],
        ['That group means only IAM roles in the bucket owner\'s organisation', false],
        ['That group grants nothing unless the objects are encrypted with KMS', false],
      ], 'AuthenticatedUsers covers anyone authenticated to AWS with any account, so it is effectively public. It is not limited to your root user, your organisation or your roles, and encryption type does not change who the ACL grants.'),
      mcq('A health-data bucket uses SSE-S3 encryption and has a public bucket policy. A manager says "it is encrypted, so the data is safe". Why is that wrong?', [
        ['S3 decrypts objects for any caller the policy allows, including anonymous ones', true],
        ['SSE-S3 is switched off whenever a bucket policy is attached to the bucket', false],
        ['Encrypted objects can only be listed by outsiders, never actually downloaded', false],
        ['The anonymous reader receives ciphertext, but the key is printed in the URL', false],
      ], 'Server-side encryption protects data on disk; S3 serves plaintext to anyone authorised, and a public policy authorises everyone. Policies do not switch encryption off, downloads do succeed, and no key appears in a URL.'),
    ],
    checkpoint: [
      mcq('The checker flags sg-0f6 legacy-ftp: ports 20 to 3400 open to ::/0, attached to one live server. Many scripts in the team only search for 0.0.0.0/0. What should you conclude?', [
        ['It is internet-exposed over IPv6 and those scripts were missing it', true],
        ['::/0 is a placeholder that matches no addresses, so it is harmless', false],
        ['IPv6 rules are ignored unless an IPv4 rule also allows the port', false],
        ['The rule applies only inside the VPC, since IPv6 is private by design', false],
      ], '::/0 is every IPv6 address, so the server is exposed to the internet if it has an IPv6 path. It is not a placeholder, IPv6 rules apply on their own, and IPv6 addresses in a VPC are typically globally routable rather than private.'),
      ck('CLOUD_STORAGE', 'swasthya-db-backups has an ACL granting READ to AllUsers. Which single bucket setting stops that ACL from making it public without touching the ACL?', [
        ['IgnorePublicAcls in Block Public Access', true],
        ['BlockPublicPolicy in Block Public Access', false],
        ['Default encryption with an SSE-KMS key', false],
        ['Versioning with Object Lock switched on', false],
      ], 'IgnorePublicAcls makes S3 ignore public ACLs already present. BlockPublicPolicy acts on bucket policies, changing default encryption affects only objects written afterwards (the existing backups stay as they are), and versioning protects against deletion, not reading.'),
      ck('CLOUD_STORAGE', 'Patients must download their own lab report from S3 after logging in to the portal. Which design avoids a public bucket?', [
        ['The portal issues a short-lived presigned URL for that one object', true],
        ['The bucket allows Principal "*" but object names are kept secret', false],
        ['The bucket ACL grants READ to the AuthenticatedUsers group only', false],
        ['The bucket uses static website hosting with directory listing off', false],
      ], 'A presigned URL grants time-limited access to one object for a caller the portal has authenticated. Secret object names are guessable, AuthenticatedUsers is any AWS account, and website hosting still requires public read.'),
    ],
  },

  /* ── CLOUD_LOGGING ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_CLOUD_SECURITY_CLOUD_LOGGING',
    notes: `In the cloud, nearly everything an attacker does to your account is an API call, and API calls can be
logged. This lesson is about which cloud logs to collect, how they reach the SIEM you built in CY2 ("A SIEM with
Wazuh and Elastic"), and which events deserve an alert.

## The logs that matter

- **AWS CloudTrail** — the control plane: who called which API, from where, with what result.
  - **Management events** (create a user, change a security group, stop a trail) are recorded by default and
    visible in **Event history** for 90 days — even if you never set anything up.
  - To keep them longer and send them to a SIEM you create a **trail**: make it **multi-region** (or an
    **organisation trail** covering every account), deliver to a bucket in a separate log-archive account, and
    switch on **log file validation** (signed SHA-256 digest files that prove the logs were not altered).
  - **Data events** — S3 object reads and writes, Lambda invocations — are **off by default** and charged
    separately. Turn them on for the buckets that hold sensitive data; without them, the previous lesson's
    "who downloaded the reports?" has no answer.
- **VPC Flow Logs** — one record per network flow: source and destination address and port, protocol, bytes,
  ACCEPT or REJECT. Like the firewall logs in CY1, but for every interface you choose.
- Others worth knowing: S3 server access logs, load balancer access logs, Route 53 Resolver query logs (DNS),
  and **GuardDuty** findings (AWS's own detections over CloudTrail, flow and DNS logs).

Azure: the **Activity Log** (control plane), Entra ID sign-in and audit logs, NSG flow logs. GCP: **Cloud Audit
Logs** (Admin Activity is always on; Data Access logs mostly have to be enabled) and VPC Flow Logs.

## Reading a CloudTrail record

Trimmed to the fields an analyst reads first:

    {
      "eventTime": "2026-10-14T19:03:40Z",
      "eventSource": "iam.amazonaws.com",
      "eventName": "CreateAccessKey",
      "awsRegion": "us-east-1",
      "sourceIPAddress": "198.51.100.77",
      "userIdentity": {"type": "IAMUser", "arn": "arn:aws:iam::111122223333:user/arjun.dev", "userName": "arjun.dev"},
      "requestParameters": {"userName": "svc-backup"}
    }

**Who** (userIdentity: type Root, IAMUser, AssumedRole...), **what** (eventSource + eventName), **where from**
(sourceIPAddress, userAgent), **on what** (requestParameters), and **did it work** (an errorCode such as
AccessDenied is present only when it failed). Note awsRegion: IAM is a global service and its events are
recorded in us-east-1 even when your whole company works in Mumbai.

## Events worth an alert

    Root user activity (userIdentity.type = Root)        the account's master key is in use
    ConsoleLogin with MFAUsed = No                       a password alone was enough
    StopLogging, DeleteTrail, UpdateTrail,               someone is blinding the SOC
      PutEventSelectors; GuardDuty DeleteDetector
    IAM policy changes (Attach/Put*Policy,               someone is changing who can do what
      CreatePolicyVersion, UpdateAssumeRolePolicy)
    CreateAccessKey, especially for another user         a new long-term credential, maybe a back door
    PutBucketPolicy, PutBucketAcl,                       storage about to become public
      DeletePublicAccessBlock
    AuthorizeSecurityGroupIngress with 0.0.0.0/0         a hole opened to the internet
    KMS DisableKey, ScheduleKeyDeletion                  data about to become unreadable
    Any activity in a region the company does not use    resources hidden where nobody looks
    A burst of AccessDenied from one principal           someone testing what a credential can do

## Finding them with pandas

The sample is 412 synthetic CloudTrail records from one day at Swasthya: 400 routine reads, a few staff
actions, and one story. Flattening the JSON with pandas.json_normalize and applying the rules above gave this
real output:

    events: 412 | principals: 5 | source IPs: 3
    root activity                  1
    console login without MFA      1
    logging tampered               1
    IAM policy change              1
    access key created             1
    bucket policy/ACL change       1
    ingress opened to world        1
    activity outside home regions  1

Grouping the hits by principal and source IP turns eight counters into two stories:

    who        ip             hits  first                      last
    arjun.dev  198.51.100.77     5  2026-10-14 19:03:05+00:00  2026-10-14 19:06:12+00:00
    root       203.0.113.21      2  2026-10-14 05:12:00+00:00  2026-10-14 05:12:00+00:00
    svc-backup 198.51.100.77     1  2026-10-14 19:09:00+00:00  2026-10-14 19:09:00+00:00

The root login (no MFA) is from the office address and gets its own ticket. The other two share an IP never
seen before 19:00 — and everything from it, in order, reads like a checklist:

    19:02:10 arjun.dev  GetCallerIdentity              ap-south-1
    19:02:31 arjun.dev  ListUsers                      us-east-1
    19:02:40 arjun.dev  ListAttachedUserPolicies       us-east-1
    19:03:05 arjun.dev  AttachUserPolicy               us-east-1  AccessDenied
    19:03:40 arjun.dev  CreateAccessKey                us-east-1
    19:05:02 arjun.dev  StopLogging                    ap-south-1
    19:05:30 arjun.dev  PutBucketPolicy                ap-south-1
    19:06:12 arjun.dev  AuthorizeSecurityGroupIngress  ap-south-1
    19:09:00 svc-backup RunInstances                   sa-east-1

"Who am I", look around, a failed attempt at admin, a new key for a different user, logging stopped, a bucket
policy changed, a database port opened, then the **new** key used in São Paulo. The failed AttachUserPolicy
matters as much as the successes: it shows intent. Two rule details: the region rule excludes global services
(IAM, sign-in), or every IAM call in us-east-1 would fire it; and the events after StopLogging are still
visible because they came from **Event history**, which a trail being stopped does not switch off. Protect
the trail itself: an organisation trail plus an SCP that denies cloudtrail:StopLogging.

## Getting it into the SIEM and alerting fast

Wazuh has an AWS module that reads CloudTrail (and other logs) from the S3 bucket; Elastic has an AWS
integration that does the same. Detections can then be written once as Sigma — Sigma has an aws/cloudtrail log
source. This rule was converted with pySigma's Lucene backend; the conversion is real output:

    detection:
      selection:
        eventSource: cloudtrail.amazonaws.com
        eventName: [StopLogging, DeleteTrail, UpdateTrail, PutEventSelectors]
      condition: selection

    eventSource:cloudtrail.amazonaws.com AND (eventName:(StopLogging OR DeleteTrail OR UpdateTrail OR PutEventSelectors))

For the few events that cannot wait for a SIEM batch, an **Amazon EventBridge** rule can match the event and
notify the SOC within moments. Its event pattern, written from the documentation and not run:

    {"source": ["aws.cloudtrail"], "detail-type": ["AWS API Call via CloudTrail"],
     "detail": {"eventName": ["StopLogging", "DeleteTrail"]}}

From the command line (not run): "aws cloudtrail get-trail-status --name swasthya-trail" shows IsLogging, and
"aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=StopLogging" searches
Event history.`,
    workedExample: `**Scenario.** The timeline above landed at 19:10 in Swasthya's SOC. You are the analyst on shift. The
playbook steps follow CY2's "Containment, Eradication and Recovery"; here is what they mean in AWS.

**1. Decide quickly.** arjun.dev is a developer in Pune; 198.51.100.77 has never been seen; the activity
includes logging tampering and a new key for another user. Treat it as a compromised long-term key (the AKIA
type from the identity lesson), not as a developer working late. Call arjun to confirm he is not doing this.

**2. Contain the credentials — all of them.** Deactivate arjun.dev's key **and** the svc-backup key created at
19:03:40 (the attacker's spare). Deactivation is reversible (written from the CLI docs, not run):

    aws iam update-access-key --user-name arjun.dev --access-key-id <AKIA...> --status Inactive
    aws iam update-access-key --user-name svc-backup --access-key-id <AKIA...> --status Inactive

Then search the day for any other CreateAccessKey, CreateUser, CreateLoginProfile or role trust change from that
IP — a second back door is common.

**3. Restore visibility.** start-logging on swasthya-trail; check get-trail-status shows IsLogging true.

**4. Undo the changes.** Revert the bucket policy on swasthya-db-backups (keep a copy of the attacker's
version as evidence) and remove the 0.0.0.0/0 rule on 5432 from reports-db.

**5. The São Paulo instance.** Snapshot its volume first (evidence), then stop it. Check for others: activity
in sa-east-1 or any unused region from the new key.

**6. Scope data access.** Was anything read from the backups bucket while its policy was open? Only data
events or server access logs can say. Write down what the logs can and cannot prove.

**7. Root cause.** Where did arjun's key leak from? A secret scan of his repositories and laptop (CY1's
secret-scanning) usually answers it. The longer fix: no long-term keys for developers at all — Identity Center
with short-lived credentials.`,
    mcqs: [
      mcq('An analyst searches CloudTrail for S3 GetObject calls on the reports bucket during an exposure window and finds none. Data events were never enabled. What can she conclude?', [
        ['Nothing about reads: object reads are data events and were not recorded', true],
        ['No object was read, since CloudTrail records every API call by default', false],
        ['The bucket was never really public, or GetObject events would show up', false],
        ['Reads happened, because an empty result always means logs were deleted', false],
      ], 'GetObject is a data event, which is off by default, so absence of records proves nothing. Management events are default, data events are not; the bucket status is a separate question; and an empty result is expected, not evidence of deletion.'),
      mcq('A region-based rule alerts on every IAM call even though Swasthya works only in Mumbai. Why?', [
        ['IAM is global, so its events are recorded with awsRegion us-east-1', true],
        ['IAM calls are routed through the US because India has no endpoints', false],
        ['The developers are really working from servers in North Virginia', false],
        ['CloudTrail stores every event in us-east-1 once a trail is created', false],
      ], 'Global services such as IAM log their events in us-east-1; the rule must exclude them. It is not about routing or where people work, and regional services keep their own region in awsRegion.'),
      mcq('Which CloudTrail feature lets you show an auditor that the delivered log files were not altered after delivery?', [
        ['Log file integrity validation, with signed digest files', true],
        ['Multi-region trails, which copy logs to every region', false],
        ['Event history, which holds 90 days of management events', false],
        ['Data events, which record object-level S3 operations', false],
      ], 'Log file validation produces signed SHA-256 digest files that let you verify each log file. Multi-region widens coverage, Event history is a short-term console view, and data events add more event types; none proves integrity.'),
    ],
    checkpoint: [
      mcq('In the timeline, AttachUserPolicy for AdministratorAccess failed with AccessDenied. A colleague wants to drop failed events from the report to keep it short. Why keep it?', [
        ['A failed escalation attempt shows the intent behind the session', true],
        ['Failed events cost more to store, so they must be listed for billing', false],
        ['AccessDenied means the call actually succeeded after a short retry', false],
        ['CloudTrail deletes failed events after a day unless they are reported', false],
      ], 'Attempts that fail are evidence of what the actor was trying to do and help scope the incident. Storage cost is irrelevant, AccessDenied means it did not succeed, and CloudTrail does not delete failed events early.'),
      mcq('After StopLogging at 19:05, the analyst still sees the 19:06 security-group change. Where did that record most likely come from?', [
        ['CloudTrail Event history, which keeps 90 days of management events', true],
        ['The stopped trail, which keeps logging for an hour after it is stopped', false],
        ['VPC Flow Logs, which record API calls made on the security groups', false],
        ['GuardDuty, which stores the original CloudTrail records for the SOC', false],
      ], 'Event history records management events whether or not a trail is logging. A stopped trail stops delivering, flow logs record network traffic rather than API calls, and GuardDuty produces findings rather than serving raw CloudTrail records.'),
      ck('CLOUD_NETWORKING', 'Which log answers "did any host in the VPC talk to 198.51.100.77, and how many bytes went out"?', [
        ['VPC Flow Logs for the VPC\'s network interfaces', true],
        ['CloudTrail management events for the account', false],
        ['IAM credential report for the account\'s users', false],
        ['S3 server access logs for the backups bucket', false],
      ], 'Flow logs record source, destination, ports, bytes and accept/reject per flow. CloudTrail records API calls, the credential report lists credentials, and S3 access logs cover requests to one bucket.'),
    ],
  },

  /* ── POSTURE_CONTAINERS ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_CLOUD_SECURITY_POSTURE_CONTAINERS',
    notes: `The last three lessons found problems one at a time. **Cloud security posture management (CSPM)** checks an
entire account against a list of rules continuously, so the next public bucket is found in minutes, not at the
next audit. This lesson covers reading and prioritising a posture report, then the basic checks for containers
and Kubernetes.

## Benchmarks and the tools that apply them

- **CIS Benchmarks** are consensus configuration guides published by the Center for Internet Security — one for
  AWS Foundations, others for Azure, GCP, Kubernetes, Docker and operating systems. Each recommendation says what
  to check, why, and how to fix it, and is marked Level 1 (sensible everywhere) or Level 2 (stricter, may
  affect function). Use the current version and cite its own numbering; versions renumber controls.
- **AWS Security Hub** runs standards such as the CIS AWS Foundations Benchmark and AWS Foundational Security
  Best Practices on top of **AWS Config**, which records every resource's configuration over time.
- **Prowler** is a free, open-source CLI that runs hundreds of AWS (and Azure/GCP) checks and maps them to CIS
  and other frameworks. Written from its documentation, not run:

      prowler aws --list-compliance
      prowler aws --compliance <framework-name-from-the-list>

- Azure has **Microsoft Defender for Cloud**; GCP has **Security Command Center**.

## A posture report, built from an inventory

To see what a CSPM does, Swasthya's account inventory (root settings, users and keys, trails, per-region
services, bucket and network settings) was checked against fifteen CIS-style rules. They mirror the themes of
the CIS AWS Foundations Benchmark but are numbered P-01 to P-15 here, not with CIS's numbers. Real output:

      id    section                                                    check result                          failing
    P-01   Identity                                        Root user has MFA   FAIL                             root
    P-02   Identity                             Root user has no access keys   PASS
    P-03   Identity                               Every console user has MFA   FAIL           arjun.dev, intern.2025
    P-04   Identity                       Access keys rotated within 90 days   FAIL priya.ops, arjun.dev, svc-backup
    P-05   Identity                       No credentials unused for 45+ days   FAIL                       svc-backup
    P-06   Identity                         Password policy min length >= 14   FAIL                     min_length=8
    P-07    Logging                          A multi-region trail is logging   FAIL     swasthya-trail single-region
    P-08    Logging                             Trail log file validation on   FAIL                   swasthya-trail
    P-09    Logging                     AWS Config recording in every region   FAIL                       ap-south-2
    P-10 Monitoring                             GuardDuty on in every region   FAIL                       ap-south-2
    P-11    Logging                         VPC flow logs on in every region   FAIL                       ap-south-2
    P-12    Storage                  Account-level S3 Block Public Access on   FAIL                          account
    P-13    Storage                EBS encryption by default in every region   FAIL                       ap-south-2
    P-14    Network                 Default security groups allow no traffic   FAIL                       ap-south-1
    P-15    Network No security group opens admin ports to 0.0.0.0/0 or ::/0   FAIL           sg-0b2, sg-0e5, sg-0f6

    passed by section: {'Identity': '1/6', 'Logging': '0/4', 'Monitoring': '0/1', 'Network': '0/2', 'Storage': '0/2'}
    overall: 1/15 = 7%

## Reading it like an analyst, not a scoreboard

"7%" is a useless headline. A posture score weights a password-length rule the same as a public health-data
bucket. Prioritise by **exposure** (reachable from the internet?), **data** (what is behind it?) and
**ease of abuse** (does it need a stolen credential, or nothing at all?):

1. P-12 and the two public health buckets from the storage lesson — nothing at all is needed to read them.
2. P-15 — admin and database ports open to the internet, on live servers.
3. P-01 and P-03 — the root user and console users protected by a password alone.
4. P-07, P-08, P-10, P-11 — without them the next incident is invisible. Note that ap-south-2 (Hyderabad)
   fails everything: an unused region with no monitoring is exactly where an attacker parks resources. If the
   company does not use it, an SCP can deny it.
5. P-04, P-05, P-06 — real, but slower to hurt.

Each failing check gets an owner and a date; an accepted exception gets an expiry, just like the vulnerability
exceptions in "Patching, Compensating Controls and Verification". Then the CSPM re-checks — the same
verification loop.

## Containers: what is different

Image scanning and SBOMs were covered in "Dependencies, SBOMs and Container Images", and building containers in
Year 4's "Putting It In a Container". The runtime question here: a container is a process on a shared **host
kernel**, not a separate machine. Settings that remove the separation:

- **privileged: true** — effectively root on the node;
- **hostPath** volumes (worst of all, mounting "/"), **hostNetwork**, hostPID;
- running as **root** inside the container, without dropping Linux capabilities or blocking privilege escalation;
- an unpinned image tag such as :latest (what runs tomorrow is not what was scanned today); pin a version or,
  better, a digest;
- no CPU and memory limits (one container can starve the node).

A short PyYAML checker over two Deployments, in the spirit of Kubernetes' **Pod Security Standards**
(Privileged, Baseline, Restricted). Real output:

    lab/reports-api: 0 finding(s)
    lab/log-shipper: 8 finding(s)
      - shares the node's network/PID/IPC namespace
      - hostPath volume /
      - service account token mounted (is it needed?)
      - shipper: privileged
      - shipper: may run as root
      - shipper: privilege escalation not disabled
      - shipper: unpinned image tag :latest
      - shipper: no resource limits

## Kubernetes in five checks

1. **RBAC** — who is bound to cluster-admin? "kubectl get clusterrolebindings -o wide" and
   "kubectl auth can-i --list --as=system:serviceaccount:lab:default -n lab" (not run) show what an identity can do.
2. **Pod Security Admission** — label namespaces to enforce a standard:
   "kubectl label namespace lab pod-security.kubernetes.io/enforce=restricted" (not run).
3. **Network policies** — by default every pod can reach every other pod; a default-deny NetworkPolicy per
   namespace (with a CNI that enforces it) is the cluster's segmentation.
4. **Secrets** — Kubernetes Secrets are base64-encoded, not encrypted, unless encryption at rest is configured
   (on EKS, envelope encryption with a KMS key).
5. **Audit logs** — the API server's audit log is the cluster's CloudTrail. On EKS the control-plane log types
   (api, audit, authenticator and others) must be switched on to reach CloudWatch.

On **EKS**, AWS runs the control plane; your nodes, workloads, RBAC and network policies are yours — the shared
responsibility line again. **kube-bench** checks nodes against the CIS Kubernetes Benchmark
("kube-bench run --targets node", from its documentation, not run).`,
    workedExample: `**Scenario.** The CISO gives you one week and two engineers to "fix the cloud posture report". There
are 14 failing checks and two flagged Kubernetes workloads. You write the plan.

**Day 1 — stop the bleeding (minutes each).** Account-level Block Public Access on (P-12): it closes both
public health buckets at once, after the portal team has moved to presigned URLs. Remove 0.0.0.0/0 on 5432
from reports-db and on 22 from app-servers; delete temp-debug, which is attached to nothing; ask the owner of
legacy-ftp whether it is still needed at all (P-15).

**Day 2 — identity.** Hardware MFA on root; MFA enforced for arjun.dev and intern.2025, or disable the
intern's console access if the internship ended (P-01, P-03). Deactivate svc-backup's unused key (P-05).

**Day 3 — visibility.** An organisation trail, multi-region, with log file validation, into the log-archive
account (P-07, P-08). GuardDuty and Config on in ap-south-2 — or an SCP denying ap-south-2 entirely if it is
unused (P-09, P-10, P-11, P-13).

**Day 4 — containers.** log-shipper is a vendor agent that genuinely needs some host access to read node
logs. Do not just delete it: mount only /var/log read-only instead of "/", remove privileged, pin the image
to a version, add limits; put it in its own namespace with a Pod Security level that allows what it needs,
and enforce restricted on the lab namespace for everything else.

**Day 5 — the slow items, with dates.** Key rotation (P-04) and password policy (P-06) get owners and
deadlines. The default security group (P-14) is emptied once nothing uses it.

**Report.** Not "posture went from 7% to 80%" but: "both public data exposures closed on day 1, internet
admin access removed, and the account can now see an incident in every region". Then the CSPM keeps checking
so that day 1 does not have to be repeated.`,
    mcqs: [
      mcq('Two accounts both score 80% on a CIS-style posture report. Why can one still be much riskier than the other?', [
        ['Checks are counted equally, but a public data bucket outweighs a password rule', true],
        ['CIS Benchmarks are written for on-premises systems, so cloud scores are meaningless', false],
        ['Posture tools only check the region they are run from, so the scores are partial', false],
        ['A score of 80% means the remaining 20% of resources were not scanned at all', false],
      ], 'A raw pass percentage ignores exposure, data and ease of abuse, so the failing 20% can differ hugely. CIS publishes cloud benchmarks, good tools check every region, and the score is about checks, not unscanned resources.'),
      mcq('A Deployment runs its container with privileged: true and a hostPath volume mounting "/". Why is this close to giving it the node?', [
        ['The container shares the host kernel and can reach the node\'s whole filesystem', true],
        ['Privileged containers run on a separate virtual machine with its own kernel', false],
        ['hostPath volumes are read-only by design, so only the privileged flag matters', false],
        ['It is risky only if the image tag is :latest; pinned images are safe this way', false],
      ], 'Containers share the node kernel; privileged mode removes most isolation and mounting "/" exposes the node\'s files. Privileged does not mean a separate VM, hostPath is writable unless set read-only, and pinning the tag does not fix runtime privileges.'),
      mcq('A new namespace has no NetworkPolicy objects. What does that mean for traffic between its pods?', [
        ['All pod-to-pod traffic is allowed until a policy selects the pods', true],
        ['All pod-to-pod traffic is denied until a policy allows each flow', false],
        ['Only traffic on port 443 is allowed, because the API server needs it', false],
        ['Traffic is allowed only between pods that share the same node in it', false],
      ], 'Kubernetes allows all pod traffic by default; isolation begins only when a NetworkPolicy selects a pod (and the CNI enforces it). Default-deny must be created, there is no special 443 rule, and node placement does not matter.'),
    ],
    checkpoint: [
      mcq('The posture report shows ap-south-2 failing Config, GuardDuty, flow logs and EBS encryption. Swasthya never uses that region. What is the strongest fix?', [
        ['Deny the unused region with an SCP, so nothing can be created there', true],
        ['Ignore it, because no resources exist there so it cannot be a risk', false],
        ['Turn on EBS encryption there, as that is the highest-severity item', false],
        ['Move the Mumbai workloads there so the region is actually in use', false],
      ], 'An unused, unmonitored region is where an attacker can create resources unseen; denying it removes the risk, and enabling GuardDuty there is the fallback. "Nothing there now" is not a control, encryption alone leaves it blind, and moving workloads is unrelated.'),
      mcq('A colleague proposes reporting "posture improved from 7% to 40%" to the board after week one. What should the report lead with?', [
        ['Which exposures were closed: public data, open admin ports, missing logs', true],
        ['The full list of 15 check IDs with PASS or FAIL for every single one', false],
        ['The percentage alone, since boards prefer a single number to a story', false],
        ['The tool name and version used to generate the posture report output', false],
      ], 'Leadership needs to know which real risks were removed; a percentage hides whether the important ones were fixed. The full check table belongs in an appendix, and tool details matter to engineers, not as the headline.'),
      mcq('An EKS cluster is compromised through a pod with a cluster-admin binding on its service account. Under shared responsibility for EKS, whose control failed?', [
        ['The customer\'s: RBAC bindings and workloads are configured by the customer', true],
        ['AWS\'s: EKS is a managed service, so cluster RBAC is entirely managed by AWS', false],
        ['The image publisher\'s, because the pod pulled their image from a registry', false],
        ['Nobody\'s, since service accounts are created by Kubernetes automatically', false],
      ], 'AWS runs the EKS control plane, but RBAC bindings, workloads and nodes are the customer\'s. The image publisher did not bind cluster-admin, and the default service account exists automatically but has no such binding unless someone adds it.'),
    ],
  },
  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_CLOUD_SECURITY_DEBUGGING',
    notes: `Six broken cloud checks from Swasthya's SOC scripts. Each one ran without an error and reported something
plausible — which is why nobody noticed. Every "broken" and "fixed" line below is real output from running both
versions over the topic's synthetic policies, inventory and CloudTrail records. For each: read the symptom,
guess the cause before reading on, then check.

## 1. The wildcard that was never found

**Symptom.** The least-privilege checker reported LabUploaderApp's "Uploads" statement as clean. The policy plainly says
"Action": "s3:*".

    1 broken: [] | chars seen: ['s', '3', ':', '*']
    1 fixed:  ['s3:*']

**Cause.** In IAM JSON, Action (and Resource, and Principal values) may be a single string or a list. The code
did "for a in st['Action']", and iterating a Python string yields characters; no single character ends with ":*".

**Fix.** Normalise first: "acts = x if isinstance(x, list) else [x]". Do it for Action, NotAction, Resource and
Statement itself (a policy with one statement may give a dict rather than a list).

## 2. PassRole that hid behind capital letters

**Symptom.** A policy someone wrote by hand with "IAM:passrole" passed the PassRole check.

    2 broken: False | fixed: True

**Cause.** The check was "'iam:PassRole' in actions" — an exact, case-sensitive string match. AWS treats action
names case-insensitively, so the policy grants exactly what the check was looking for.

**Fix.** Lower-case both sides before comparing. The same applies to wildcard matching: "S3:Get*" grants
s3:GetObject.

## 3. The IPv6 hole

**Symptom.** The weekly "open to the internet" report listed four security groups. A pen-test report (an
authorised one, commissioned by Swasthya) found a fifth exposed server.

    3 broken: ['web-alb', 'app-servers', 'reports-db', 'temp-debug']
    3 fixed:  ['web-alb', 'app-servers', 'reports-db', 'temp-debug', 'legacy-ftp']

**Cause.** The script read only IpRanges[].CidrIp for "0.0.0.0/0". legacy-ftp's rule is in Ipv6Ranges with
"::/0", which is the whole IPv6 internet.

**Fix.** Check both lists, for both world ranges. And test the checker with a fixture that contains an IPv6-only
rule, so the bug cannot quietly return.

## 4. The bucket that was public by ACL

**Symptom.** The public-bucket report showed only swasthya-lab-uploads. The database backups bucket was being read
from outside.

    4 broken: ['swasthya-lab-uploads'] | fixed: ['swasthya-lab-uploads', 'swasthya-db-backups']

**Cause.** The script looked only at bucket policies for "Principal": "*". swasthya-db-backups is public through a
legacy **ACL** granting READ to the AllUsers group, and Block Public Access was not on to ignore it.

**Fix.** Check ACL grants to AllUsers and AuthenticatedUsers as well as policies, and apply the BPA settings the
way S3 does (IgnorePublicAcls neutralises ACLs, RestrictPublicBuckets neutralises public policies). Better
still, ask S3: get-bucket-policy-status gives AWS's own verdict on the policy.

## 5. The escalation attempt that disappeared

**Symptom.** The incident timeline for arjun.dev showed a new access key being created, but not the attempt to
attach AdministratorAccess, which the L1 analyst remembered seeing.

    5 broken: ['CreateAccessKey'] | fixed: ['AttachUserPolicy', 'CreateAccessKey'] | errors: ['AccessDenied', '-']

**Cause.** A tidy-up filter kept only rows where errorCode was empty, "to show what actually happened".
Failed calls are what actually happened too: an AccessDenied on AttachUserPolicy is a privilege-escalation
attempt and changes the severity of the incident.

**Fix.** Keep failures in the timeline and mark them. Bursts of AccessDenied from one principal are themselves a
detection. (A related crash: on a batch with no failures at all, json_normalize produces no errorCode column, and
"df['errorCode']" raises KeyError: 'errorCode'. Use df.get with a default, as the fixed script does.)

## 6. The region rule that cried wolf

**Symptom.** "Activity outside home regions" raised 6 alerts on the incident day; analysts started ignoring it,
and nearly missed the one that mattered.

    without the global-service exclusion:  activity outside home regions  6
    with it:                               activity outside home regions  1

**Cause.** IAM and sign-in are global services, and CloudTrail records their events with awsRegion us-east-1. Four
IAM calls and the root console login therefore looked like "activity in the US". The real hit — RunInstances in
sa-east-1 with the attacker's new key — was one alert among six.

**Fix.** Exclude events whose eventSource is a global service (iam, sign-in) from the region rule, and alert on
those through their own rules instead. A rule's false positives are a detection bug, not an analyst's problem;
CY2's "Tuning Detections and Fighting Alert Fatigue" applies to cloud rules exactly as to endpoint ones.

## The pattern

Five of six bugs are the same mistake: the script assumed one shape for data that AWS allows in several (string
or list, any case, IPv4 or IPv6, policy or ACL, present or absent). Before trusting a cloud check, build a small
fixture with every legal shape and one known-bad example of each, and make the check prove it finds them.`,
    mcqs: [
      mcq('A checker reports no wildcard in a statement whose "Action" is the single string "ec2:*". What is the most likely bug?', [
        ['It iterated the string character by character instead of wrapping it in a list', true],
        ['ec2:* is not a wildcard in IAM, since wildcards only work for the s3 service', false],
        ['The checker needs the policy Version to be 2008-10-17 to recognise wildcards', false],
        ['Single-string actions are ignored by AWS, so the checker was correct to skip it', false],
      ], 'Action may be a string or a list; iterating a string yields characters, none of which ends with ":*". Wildcards work for every service, 2012-10-17 is the current version, and AWS honours single-string actions.'),
      mcq('A bucket report built only from bucket policies says one bucket is public, but outsiders are reading a second bucket. Which check was missing?', [
        ['ACL grants to AllUsers or AuthenticatedUsers, with IgnorePublicAcls off', true],
        ['The bucket\'s lifecycle rules, which can publish objects after 30 days', false],
        ['The storage class, since Glacier objects are always readable by anyone at all', false],
        ['Whether versioning is suspended, since suspended buckets become public', false],
      ], 'Buckets can be public through ACLs as well as policies; IgnorePublicAcls decides whether those ACLs count. Lifecycle rules move or expire objects, storage class does not grant access, and versioning has nothing to do with public access.'),
      mcq('A pandas filter on errorCode raises KeyError: \'errorCode\' on one day\'s CloudTrail batch, though it worked yesterday. Why?', [
        ['No call failed that day, so json_normalize created no errorCode column', true],
        ['CloudTrail renamed the field to error_code in the newest log format', false],
        ['errorCode only appears in data events, and that day had no data events', false],
        ['pandas cannot read fields whose names contain a capital letter in them', false],
      ], 'errorCode is present only on failed calls; with none in the batch the flattened frame has no such column. The field was not renamed, it appears on any failed event (management or data), and pandas handles capitalised names.'),
      mcq('A rule for "activity outside ap-south-1/ap-south-2" fires on every ListUsers and CreateAccessKey call. What is the correct fix?', [
        ['Exclude global services such as IAM from the region rule', true],
        ['Add us-east-1 to the list of home regions for every service', false],
        ['Disable the region rule, since regions are not useful in AWS', false],
        ['Move the company\'s IAM users into the ap-south-1 region instead', false],
      ], 'IAM events are recorded in us-east-1 because IAM is global; excluding global services keeps the rule meaningful. Adding us-east-1 for all services would hide real activity there, disabling the rule loses a good signal, and IAM users are not regional.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_CLOUD_SECURITY_PRACTICE',
    notes: `Nine exercises, easiest first. Do each on paper or in Python before reading the answer. They use Swasthya
Labs' account (111122223333) and the data from the lessons.

## 1. Who fixes it? (easy)

For each, say provider or customer: (a) a power failure in an AWS Mumbai data centre; (b) an RDS database with
"publicly accessible" set to yes; (c) an unpatched kernel on an EC2 instance; (d) a Microsoft 365 mailbox with no MFA.

**Answer.** (a) provider; (b) customer — configuration; (c) customer — guest OS on IaaS; (d) customer — identity
is always the customer's, even in SaaS.

## 2. Read a policy (easy)

LabUploaderApp has two statements: Allow "s3:*" on arn:aws:s3:::swasthya-lab-uploads/*, and Allow
"kms:Decrypt" on "*". List the problems.

**Answer.** s3:* includes deleting objects, changing object ACLs and more — the uploader needs s3:PutObject
(perhaps s3:GetObject). kms:Decrypt on "*" lets it decrypt with any key whose key policy permits the account's
principals; name the one key ARN. The checker rated these HIGH and MEDIUM.

## 3. Write a least-privilege policy (medium)

The finance analyst may list and read only reports under the prefix reports/2026/ in swasthya-reports.

**Answer.**

    {"Version": "2012-10-17", "Statement": [
      {"Sid": "List2026", "Effect": "Allow", "Action": "s3:ListBucket",
       "Resource": "arn:aws:s3:::swasthya-reports",
       "Condition": {"StringLike": {"s3:prefix": ["reports/2026/*"]}}},
      {"Sid": "Read2026", "Effect": "Allow", "Action": "s3:GetObject",
       "Resource": "arn:aws:s3:::swasthya-reports/reports/2026/*"}]}

ListBucket acts on the **bucket** ARN and is narrowed by the s3:prefix condition; GetObject acts on **object**
ARNs. Putting both on one ARN is the most common mistake: one of the two then never matches.

## 4. Design the security groups (medium)

Load balancer, app servers on 8080, PostgreSQL on 5432. Admins need shell access. Write the inbound rules.

**Answer.** alb-sg: 443 from 0.0.0.0/0 and ::/0. app-sg: 8080 from alb-sg (a group reference, not an IP range).
db-sg: 5432 from app-sg only. No port 22 anywhere: admins use Session Manager. If a bastion is unavoidable,
22 from the office /32 only. One address versus 65,536 for a /16 and every address for 0.0.0.0/0 — narrow sources matter.

## 5. Read a CloudTrail record (medium)

A record has userIdentity.type "Root", eventName "ConsoleLogin", sourceIPAddress 203.0.113.21,
additionalEventData.MFAUsed "No" and responseElements.ConsoleLogin "Success". What do you do?

**Answer.** A successful root login with no MFA. Confirm with the account owner whether it was them and why
(root is needed for very few tasks); either way raise a finding: root must have MFA (posture check P-01). If
nobody claims it, treat it as an incident: the account's most powerful credential is in someone else's hands.

## 6. Keys created for someone else (medium)

Write a pandas filter over the flattened CloudTrail frame for CreateAccessKey calls where the caller created a
key for a **different** user.

**Answer.**

    k = df[df.eventName.eq("CreateAccessKey")]
    other = k[k["requestParameters.userName"].ne(k["userIdentity.userName"])]

On the lesson's data it returns one row (real output):

    eventTime             userIdentity.userName  requestParameters.userName  sourceIPAddress
    2026-10-14T19:03:40Z  arjun.dev              svc-backup                  198.51.100.77

Careful: when a user creates a key for themselves without naming a user, requestParameters.userName can be
absent (NaN), and NaN "ne" a name is True. Fill it first with the caller's name before comparing.

## 7. Public or not? (medium)

A bucket has a policy with Principal "*" (no condition) and an ACL granting READ to AllUsers. For each Block
Public Access setting, is it public? (a) all four on; (b) only IgnorePublicAcls on; (c) only
RestrictPublicBuckets on; (d) none.

**Answer.** (a) not public. (b) public — the policy still counts. (c) public — the ACL still counts.
(d) public through both. Only when both the ACL path (IgnorePublicAcls) and the policy path
(RestrictPublicBuckets) are closed is it private — which is why "all four, at account level" is the standard.

## 8. Read a flow log (medium)

    2 111122223333 eni-0c3db 198.51.100.77 10.20.3.25 51544 5432 6 41 9120 1792004820 1792004880 ACCEPT OK

**Answer.** Version 2, the reports-db interface; source 198.51.100.77 port 51544 to 10.20.3.25 port 5432,
protocol 6 (TCP), 41 packets, 9,120 bytes, from 2026-10-14 19:07:00 UTC for one minute, **ACCEPT**. The
attacker's address reached PostgreSQL one minute after the 0.0.0.0/0 rule was added. A connection is not a
login; the database's own logs say whether authentication succeeded. 9,120 bytes in is small, but check the
reverse-direction record for bytes out.

## 9. Fix a manifest (hard)

A Deployment has privileged: true, hostNetwork: true, a hostPath of "/", image shipper:latest and no limits.
The vendor says the agent must read node logs. Rewrite the risky parts.

**Answer.** Remove privileged and hostNetwork; replace the "/" hostPath with /var/log mounted readOnly: true;
set runAsNonRoot (if the agent supports it), allowPrivilegeEscalation: false and drop ALL capabilities, adding
back only what the vendor documents; pin the image to a version or digest; add CPU and memory limits; run it in
its own namespace so the restricted Pod Security level can be enforced everywhere else.`,
    mcqs: [
      mcq('A policy puts s3:ListBucket and s3:GetObject together on "arn:aws:s3:::swasthya-reports/*" only. What happens?', [
        ['GetObject works, but ListBucket never matches because it needs the bucket ARN', true],
        ['ListBucket works, but GetObject fails because objects need the bucket ARN', false],
        ['Both work, since the trailing /* also covers the bucket itself in S3', false],
        ['Neither works, because S3 policies cannot list two actions at once', false],
      ], 'ListBucket is a bucket-level action and needs arn:aws:s3:::swasthya-reports; GetObject is object-level and matches bucket/*. The /* pattern does not match the bucket ARN, and listing several actions in one statement is normal.'),
      mcq('Which inbound rule lets only the app tier reach the database, whatever IPs the app servers get?', [
        ['5432 from the app servers\' security group', true],
        ['5432 from 10.20.0.0/16, the whole VPC range', false],
        ['5432 from 0.0.0.0/0 with the DB in a private subnet', false],
        ['All traffic from the load balancer\'s security group', false],
      ], 'A security-group reference follows the instances that carry it. The VPC range lets every host in the VPC in, a world rule relies on routing alone, and the load balancer should not talk to the database at all.'),
      mcq('A flow log record shows 198.51.100.77 to the database on 5432 with action ACCEPT. What does it prove?', [
        ['A TCP connection was allowed through; not that a login succeeded', true],
        ['That the attacker logged in and read the database tables in full', false],
        ['That the security group had blocked the attempt at the network', false],
        ['Nothing, since flow logs only cover traffic between AWS services', false],
      ], 'ACCEPT means the network allowed the flow; authentication and queries are in the database\'s logs. REJECT would mean blocked, and flow logs cover any traffic to the interface, including from the internet.'),
      mcq('Your filter for "keys created for another user" flags a developer who created a key for himself. What is the likely cause?', [
        ['requestParameters.userName was absent, and NaN compared as not equal', true],
        ['CloudTrail records self-created keys under the root user\'s identity', false],
        ['The developer\'s name has capitals, and CloudTrail lower-cases names', false],
        ['CreateAccessKey for oneself is logged as a different event called RotateKey', false],
      ], 'If no userName is passed the key is for the caller and the field may be missing; NaN != name is True. Fill it with the caller first. CloudTrail does not attribute these to root, does not lower-case names, and there is no RotateKey event.'),
      mcq('An agent needs to read node logs on Kubernetes. Which volume is the least-privilege choice?', [
        ['hostPath /var/log mounted read-only', true],
        ['hostPath / mounted read-write as root', false],
        ['hostPath /var mounted read-write as root', false],
        ['No volume; run the pod with privileged: true', false],
      ], 'Mounting only the log directory read-only gives the agent what it needs. Mounting "/" or /var read-write exposes far more of the node, and privileged mode removes isolation entirely.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_CLOUD_SECURITY_INTERVIEW_QUESTION',
    notes: `Questions asked in SOC L1/L2 and junior cloud-security interviews at MSSPs, banks and GCCs in Bengaluru,
Hyderabad and Pune. Answer aloud first, in about two minutes, then compare. Interviewers listen for a sequence
of actions and for knowing what the logs can and cannot prove.

## Q1. "Explain the shared responsibility model, with an example."

**Model answer.** "The provider secures the cloud itself — data centres, hardware, the hypervisor and the
managed-service software. The customer secures what they put in it — identities, configuration, network
exposure, their own code and data. The line moves with the service: on EC2 we patch the operating system; on
RDS AWS patches the engine but we still decide whether it is reachable from the internet; on Microsoft 365 we
still own accounts, MFA and sharing. Most real cloud breaches are on the customer side — a public bucket, a
leaked access key, an over-privileged role. In the Capital One case, a WAF misconfiguration let requests reach
the metadata service and return credentials of a role that could read too many buckets; every link was a
customer setting."

**Follow-up.** "So what do you ask a client who says 'we're on AWS, so we're compliant'?" — "Which of their
controls they can evidence: access reviews, logging, configuration baselines. AWS's reports in Artifact cover
AWS's half only."

## Q2. "A bucket with customer data turns out to be public. Walk me through what you do."

**Model answer.** "Confirm it — policy, ACL, Block Public Access, get-bucket-policy-status. Find out why it is
public before closing it, so I do not break a business flow and get it reopened; usually the right design is
presigned URLs. Contain reversibly: Block Public Access on the bucket and, if it is not already, on the account.
Then scope: when did it become public (CloudTrail PutBucketPolicy or PutBucketAcl), and was anything read — which
needs S3 data events or server access logs. If those were off, I write that access cannot be determined, not that
there was none. Personal data exposed means it goes into incident response and the DPDP assessment, and CERT-In
reporting is considered under the current directions."

**Follow-up.** "The data was encrypted with SSE-S3 — does that help?" — "No. S3 decrypts for anyone the policy
allows; encryption at rest protects disks, not access. SSE-KMS would have added a key policy as a second gate."

## Q3. "How would you detect a compromised access key in AWS?"

**Model answer.** "From CloudTrail, in the SIEM. Signals: the key used from an IP or ASN never seen for that
user; a first call of GetCallerIdentity followed by enumeration (ListUsers, List policies); bursts of
AccessDenied; sensitive changes — CreateAccessKey for another user, policy attachments, StopLogging,
PutBucketPolicy, security groups opened to 0.0.0.0/0; activity in unused regions. GuardDuty adds findings
for some of these. When it fires, I deactivate the key and any keys or users it created, restore logging, undo
its changes keeping copies as evidence, snapshot anything it launched, and find where the key leaked."

**Follow-up.** "Your region rule fires on every IAM call. Why?" — "IAM is global; its events are recorded in
us-east-1. Exclude global services from the region rule and cover them with their own rules."

## Q4. "What does least privilege mean in AWS IAM, and how do you get there?"

**Model answer.** "Each identity gets only the actions, on only the resources, under only the conditions it
needs. In policy terms: named actions instead of service wildcards, resource ARNs instead of '*', conditions
for sensitive actions, no Allow with NotAction, and PassRole limited to named roles. People use SSO roles with
temporary credentials rather than IAM users with keys. To get there: IAM Access Analyzer can draft a policy from
what a role actually did in CloudTrail, last-accessed data shows unused services, and the credential report
finds stale keys. Then review regularly — permissions creep back."

**Follow-up.** "Which permissions are dangerous without being '*'?" — "Anything that lets a principal raise its
own access: iam:PassRole on any role, CreatePolicyVersion, AttachUserPolicy or PutUserPolicy, CreateAccessKey
on other users, UpdateAssumeRolePolicy."`,
    mcqs: [
      mcq('Asked how to detect a compromised AWS key, a candidate only says "GuardDuty will alert". What would strengthen the answer most?', [
        ['Naming CloudTrail signals: new IP, enumeration, AccessDenied bursts, risky changes', true],
        ['Saying GuardDuty is a paid service that needs to be enabled in each AWS region', false],
        ['Adding that AWS automatically rotates every leaked key within twenty-four hours', false],
        ['Mentioning that keys starting with ASIA can never be compromised by attackers', false],
      ], 'Interviewers want to hear what the analyst would look for in the logs, beyond a product name. Region-by-region enablement is true but secondary, AWS does not rotate your leaked keys for you, and ASIA keys can be stolen too (they just expire).'),
      mcq('In a public-bucket scenario, a candidate writes "no evidence of data access" when S3 data events and access logs were off. Why does the interviewer push back?', [
        ['With no logging, access cannot be determined; the wording overclaims', true],
        ['Management events always include object reads, so access was visible', false],
        ['Public buckets are never read in practice, so the line is unnecessary', false],
        ['The phrase is fine; regulators prefer reports to state no evidence', false],
      ], 'Absence of evidence from logs that were never collected is not evidence of absence; the honest statement is that access cannot be determined. Object reads are data events, public buckets are scanned and read, and misleading wording harms the regulator report.'),
      mcq('Which answer to "is SSE-S3 encryption enough to protect a public bucket?" is correct?', [
        ['No: S3 decrypts for anyone allowed, so the policy is the real control', true],
        ['Yes: anonymous readers receive ciphertext they cannot decrypt at all', false],
        ['Yes: SSE-S3 blocks every request from outside India for data in ap-south-1', false],
        ['No: SSE-S3 is only applied to objects larger than five gigabytes', false],
      ], 'Server-side encryption protects stored data; S3 returns plaintext to any permitted caller. Readers do not get ciphertext, encryption has nothing to do with geography, and SSE-S3 applies to all new objects regardless of size.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_CLOUD_SECURITY_CHECKPOINT',
    notes: `Ten questions across the topic: shared responsibility, least-privilege IAM, network and storage exposure,
cloud logging and detection, and posture and containers. Answer without notes; the result shows which lesson
to revisit.`,
    checkpoint: [
      mcq('Swasthya moves its reports database from PostgreSQL on EC2 to Amazon RDS. Which task moves to AWS?', [
        ['Patching the database engine and the host operating system', true],
        ['Deciding which security groups may reach the database port', false],
        ['Choosing who holds the master password and database users', false],
        ['Classifying which tables contain patients\' health data', false],
      ], 'With RDS the provider patches the engine and host. Network exposure, database credentials and data classification stay with the customer in every model.'),
      mcq('A policy grants iam:PassRole on "*" to a CI pipeline role. Why is it rated HIGH?', [
        ['The pipeline could hand the most powerful role to a service it controls', true],
        ['PassRole lets the pipeline read the console passwords of every IAM user', false],
        ['PassRole on "*" disables CloudTrail logging for the pipeline role', false],
        ['PassRole is deprecated, so policies using it fail to evaluate at all', false],
      ], 'Passing any role lets a compromised pipeline run code as an admin role, an escalation in one step. PassRole does not reveal passwords, does not touch logging, and is a current, valid action.'),
      mcq('A third-party vendor role\'s trust policy has "Principal": {"AWS": "*"} and no condition. What is the right finding?', [
        ['CRITICAL: any AWS principal may attempt to assume the role', true],
        ['LOW: trust policies only matter for roles used by EC2 instances', false],
        ['None: a role cannot be assumed unless it has a permissions policy', false],
        ['MEDIUM: only the root users of other accounts may assume it', false],
      ], 'An open principal with no condition invites anyone in AWS to try; restrict it to the vendor account with an ExternalId. Trust policies matter for every role, the permissions policy defines what the role can do after assumption (not who can assume), and "*" is not limited to root users.'),
      ck('CLOUD_NETWORKING', 'Admins need shell access to private EC2 instances. Which option opens no inbound port at all?', [
        ['AWS Systems Manager Session Manager', true],
        ['A bastion with port 22 from 0.0.0.0/0', false],
        ['Port 22 from the office /32 on each host', false],
        ['RDP on 3389 from the whole VPC range', false],
      ], 'Session Manager connects through the SSM agent outbound, with sessions logged, and needs no inbound rule. The other options all open an inbound admin port, one of them to the whole internet.'),
      ck('CLOUD_STORAGE', 'Which account-level setting would have prevented both of Swasthya\'s public health-data buckets, one public by policy and one by ACL?', [
        ['All four S3 Block Public Access switches at account level', true],
        ['Default SSE-S3 encryption enabled on every bucket in the account', false],
        ['Versioning with MFA Delete turned on for every bucket in the account', false],
        ['A lifecycle rule that moves objects to Glacier after thirty days', false],
      ], 'Account-level BPA blocks and ignores public ACLs and policies for every bucket. Encryption does not stop permitted reads, versioning protects against deletion, and lifecycle rules change storage class, not access.'),
      ck('CLOUD_STORAGE', 'Why should sensitive buckets use SSE-KMS with a customer managed key rather than relying on SSE-S3 alone?', [
        ['The key policy adds a second gate and every Decrypt call is logged', true],
        ['SSE-KMS makes objects unreadable by the account\'s own applications', false],
        ['SSE-S3 stores the encryption key next to the objects in plain text', false],
        ['SSE-KMS is required by AWS before any bucket can be created at all', false],
      ], 'With a customer managed KMS key, callers need permission in the key policy too, and KMS usage appears in CloudTrail. Permitted applications still read normally, SSE-S3 keys are managed by S3 (not stored in plaintext beside objects), and SSE-KMS is optional.'),
      mcq('Which CloudTrail event, seen from an unfamiliar IP, most urgently needs a real-time alert rather than a daily report?', [
        ['StopLogging on the account\'s trail', true],
        ['DescribeInstances in ap-south-1', false],
        ['GetObject on the public website bucket', false],
        ['GetMetricData for the load balancer', false],
      ], 'Stopping the trail blinds the SOC to what comes next, so it needs an immediate alert (for example through EventBridge). The others are routine reads.'),
      mcq('An analyst needs to know which objects were downloaded from a bucket last week. Which logs must already have been on?', [
        ['CloudTrail data events or S3 server access logs for that bucket', true],
        ['CloudTrail management events, which are on by default for all accounts', false],
        ['VPC Flow Logs for the subnets where the account\'s EC2 servers run', false],
        ['The IAM credential report, generated for the account last week', false],
      ], 'Object-level reads are recorded only by data events or server access logs. Management events cover control-plane calls, flow logs show network flows without object names, and the credential report lists credentials.'),
      mcq('A posture report lists 14 failures. Which should be fixed first?', [
        ['A public bucket holding health data, needing no credential to read', true],
        ['A password policy with a minimum length of 8 instead of 14', false],
        ['Access keys for an active user that are 111 days old', false],
        ['Log file validation switched off on the existing trail', false],
      ], 'Exposure, data sensitivity and ease of abuse rank first: anyone can read the bucket now. The others are real gaps that need a stolen credential or a later incident to matter, so they follow.'),
      mcq('A pod spec has privileged: true, a hostPath of "/" and runs as root. In one phrase, what is the risk?', [
        ['A compromise of the container is a compromise of the node', true],
        ['The pod uses more CPU than the others scheduled on its node', false],
        ['The image cannot be scanned for vulnerabilities in the registry', false],
        ['Kubernetes refuses to schedule it on nodes in a managed cluster', false],
      ], 'Privileged mode plus the node\'s root filesystem removes container isolation. CPU use is about limits, image scanning is unaffected, and clusters schedule such pods unless Pod Security admission blocks them.'),
    ],
  },
];
