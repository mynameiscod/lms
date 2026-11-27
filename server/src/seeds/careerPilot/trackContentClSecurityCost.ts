/**
 * Career-track content: Cloud Security and Cost (CL_SECURITY_COST), Cloud & DevOps Engineer, batch CL3.
 *
 * The engineer's half of security and cost on AWS: reviewing a workload against the Well-Architected
 * Framework and turning the findings into a plan, KMS keys and key policies, envelope encryption, Secrets
 * Manager and Parameter Store with rotation, switching on and wiring up CloudTrail, Config, GuardDuty and
 * Security Hub so findings reach someone and the safe ones fix themselves, and FinOps — reading a Cost and
 * Usage Report, allocating it by tags and cutting it with evidence. The analyst's view of the same services
 * (reading CloudTrail records, which events deserve an alert, prioritising a posture report) is the
 * Cybersecurity track's "Cloud Logging and Detection" and "Cloud Posture and Container Security"; this topic
 * refers to them rather than repeating them. It builds on CL1's "A Safe AWS Account", "Multi-Account Setups,
 * Tags and Guardrails", "S3: Buckets, Objects and Access" and "Paying for Compute", and Year 3's "Secrets,
 * Properly" and "What It Costs". Azure equivalents get a sentence.
 *
 * Defensive and engineering only, on accounts the student owns. One fictional company runs through the
 * topic: PaisaPatra, a Hyderabad lending start-up (small-business loans repaid over UPI) running in AWS
 * Mumbai (ap-south-1) with Hyderabad (ap-south-2) for recovery. Account ids are placeholders (123456789012,
 * 210987654321); every secret, key and password is fake. Every boto3 output in the notes is real output of
 * boto3 1.43 against moto 5.2 (mock AWS); envelope encryption used the cryptography library's AES-GCM
 * locally. The cost figures come from a synthetic Cost-and-Usage-style CSV analysed with pandas 3 — every
 * amount is MADE UP and labelled so; none is an AWS price. Terraform snippets were parsed with python-hcl2.
 * AWS CLI commands, the Well-Architected Tool, Cost Explorer's anomaly monitors and GuardDuty findings were
 * NOT run (no AWS account; moto does not implement them); the notes say so where they appear.
 *
 * Skills: CLOUD_FUNDAMENTALS by default; ENCRYPTION_SECRETS and SECURITY_SERVICES are IAM_FUNDAMENTALS.
 * Checkpoint questions elsewhere that are plainly about keys, secrets or the security services use
 * ck('IAM_FUNDAMENTALS', ...).
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_CL_SECURITY_COST_BUNDLES: PilotBundle[] = [
  /* ── WELL_ARCHITECTED ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_SECURITY_COST_WELL_ARCHITECTED',
    notes: `By now you can build most of an AWS platform: accounts and IAM, a VPC, compute, databases, containers,
Terraform, pipelines and monitoring. What none of those lessons answers is whether the pieces add up to
something a company should run its money on. The **AWS Well-Architected Framework** is AWS's published answer
to that question — a set of pillars, design principles and review questions — and a **Well-Architected review**
is the meeting where an engineer walks a workload through them. Interviewers at GCCs and AWS partners ask about
it because partners run these reviews for customers every week.

Through this topic we follow **PaisaPatra**, a
Hyderabad start-up that lends to kirana shops and small manufacturers and collects repayments over UPI. Its
loan service runs in Mumbai (ap-south-1), with Hyderabad (ap-south-2) for recovery.

## The six pillars

Each pillar has a short list of design principles and a set of questions. Learn the pillars as the question a
reviewer is really asking:

    Pillar                    The reviewer's real question                       Typical evidence
    Operational Excellence    Can you change it safely and learn from failures?   pipelines, runbooks, postmortems
    Security                  Who can do what, and would you know if they did?    IAM, encryption, CloudTrail, GuardDuty
    Reliability               What happens when a part fails, or load doubles?    Multi-AZ, backups restored, quotas
    Performance Efficiency    Are you using the right resource types and sizes?   load tests, instance choice, caching
    Cost Optimization         Do you know what it costs and who it is for?        tags, budgets, right-sizing
    Sustainability            Are you wasting energy as well as money?            utilisation, scheduling, managed services

Sustainability was added in 2021; older blog posts list five. A few design principles worth quoting in an
interview: *perform operations as code* and *make frequent, small, reversible changes* (Operational
Excellence); *apply security at all layers* and *keep people away from data* (Security); *automatically
recover from failure* and *stop guessing capacity* (Reliability); *adopt a consumption model* and *measure
overall efficiency* (Cost). The full list is on the framework's site — read it once end to end.

## The pillars trade against each other

The framework is not a list of things to max out. A Multi-AZ database doubles the database cost and buys
Reliability; encrypting with a customer managed key adds a little latency and a key to manage and buys
Security; turning the dev environment off at night saves money and costs a developer ten minutes each
morning. A good review names the trade-off and who decided it. "We run one NAT gateway, not one per AZ, and
accept that an AZ failure stops outbound calls for the dev account" is a well-architected answer; silence is
not.

## How a review runs

1. **Pick one workload** — "the loan service: API, workers, PostgreSQL, documents bucket", not "all of AWS".
2. **Get the right people in a room** for two to four hours: the engineers who run it, someone who owns its
   cost, and someone from security. A review is a conversation, not an audit; nobody gets marked down.
3. **Answer the questions** in the **AWS Well-Architected Tool** (in the console, at no charge for the tool
   itself). You define the workload, choose its region and environment, and answer each pillar's questions
   by ticking the best practices you actually follow. Answer for what is running today, not the plan.
4. **Add lenses** when they fit: the Serverless lens for Lambda-heavy workloads, the SaaS lens, the Financial
   Services Industry lens for a lender like PaisaPatra. A lens adds questions specific to that kind of system.
5. **Read the result.** The tool marks **high-risk issues (HRIs)** and **medium-risk issues (MRIs)** per pillar
   and links each to guidance. Save a **milestone** — a snapshot you can compare against in three months.

The Tool has an API (boto3's "wellarchitected" client: create_workload, list_answers, create_milestone), which
teams use to pull HRIs into their tracker. Moto does not implement it, so it is not shown running here.

## From findings to a plan

A review that produces forty findings and no plan has wasted an afternoon. Put each finding in one table with
its risk (HRI or MRI), how many people it hurts if it goes wrong (the blast radius) and the effort to fix,
then sort. PaisaPatra's nine findings, scored as risk weight x blast / effort in pandas (real output):

      risk                 pillar                                                     finding  effort_days  score
      HIGH               Security Loan DB master password in a .env file on the EC2 instances          1.0    9.0
      HIGH               Security        CloudTrail is single-region; no alert on StopLogging          0.5    6.0
      HIGH            Reliability           Backups exist but no restore has ever been tested          2.0    4.5
      HIGH            Reliability                  Loan API runs in one AZ (ap-south-1a only)          3.0    3.0
    MEDIUM Performance Efficiency                        Analytics r6i.2xlarge runs at 3% CPU          0.5    2.0
    MEDIUM      Cost Optimization         No owner tags on a fifth of spend; no budget alerts          1.0    2.0
    MEDIUM      Cost Optimization                     S3 traffic goes through the NAT gateway          0.5    2.0
    MEDIUM         Sustainability              Dev environment runs 24x7, used 10 hours a day          1.0    2.0
    MEDIUM Operational Excellence                           Deploys are manual SSH + git pull          5.0    0.8

The formula is a conversation starter, not a law. Two things it gets right: HRIs come before MRIs regardless
of effort, and among HRIs the cheap ones go first, because a one-day fix that removes a credential from disk
should not wait behind a three-day Multi-AZ migration. One thing it misses: some MRIs unlock others (a
pipeline makes every later fix safer), so a human still edits the order.

Each line then gets an **owner**, a **date** and a **definition of done** that can be checked ("the password
exists only in Secrets Manager and rotates; the .env file is gone from every instance and the AMI"). Re-run the
review at the milestone date and compare.

## Where the framework sits

- It is guidance, not a certification; there is no "Well-Architected certified" workload. Partners run reviews
  for customers, and AWS publishes whitepapers per pillar.
- The rest of this topic goes deep on two pillars engineers are most often caught out on: **Security**
  (encryption, secrets and the detective services) and **Cost Optimization** (FinOps).
- Azure has the **Azure Well-Architected Framework** with five pillars (Reliability, Security, Cost
  Optimization, Operational Excellence, Performance Efficiency), a self-assessment called the Azure
  Well-Architected Review, and Azure Advisor recommendations grouped by the same pillars; Google Cloud
  publishes its own Architecture Framework. The ideas transfer.

Three anti-patterns to avoid: answering aspirationally ("we will have backups"), treating the HRI count as a
score to game, and reviewing once at launch and never again — a workload drifts every sprint.`,
    workedExample: `**Scenario.** PaisaPatra's CTO wants the loan service reviewed before a lending partner's due diligence in 90
days. You run the review with two backend engineers and the finance lead. The Tool reports 4 HRIs and 5 MRIs
(the table in the notes).

**1. Read the HRIs as stories, not ticks.** The .env password means anyone who can read an instance disk or an
old AMI can read every loan. The single-region trail means an attacker working in ap-south-2 or touching IAM
(logged in us-east-1) leaves no trail you keep. Untested backups mean the recovery time is unknown. One AZ
means a zone outage stops repayments.

**2. Order them.** Credentials first (one day, worst blast radius). The trail and its alert second (half a
day). Then a restore drill — it tells you whether the backup HRI is a paperwork gap or a real hole. Multi-AZ
last of the four because it touches the load balancer, the Auto Scaling group and the database together.

**3. Name the trade-offs out loud.** Multi-AZ RDS roughly doubles the database line on the bill; the finance
lead agrees because a day without repayments costs more. The analytics right-sizing is free money but low
risk, so it goes in the same sprint as the tags, owned by the data team.

**4. Write the plan.**

    Week 1   Secrets Manager for the DB password, rotation on, .env removed (owner: Kavya)
    Week 1   Organisation trail, multi-region, alert on StopLogging (owner: Arjun)
    Week 3   Restore drill to a scratch instance, time it, write the runbook (owner: Kavya)
    Week 4-6 Second AZ for the API, Multi-AZ RDS in a maintenance window (owner: Arjun)
    Week 6   Tags + budget per account; analytics right-size (owner: data team)
    Week 12  Milestone review; compare HRIs with the baseline

**5. Report in one paragraph.** "4 high risks, all with owners and dates inside 6 weeks; the biggest cost is
Multi-AZ, accepted by finance; re-review on 20 January." The partner's auditor wants evidence of a process,
and a milestone history is exactly that.`,
    mcqs: [
      mcq('A PaisaPatra engineer lists the Well-Architected pillars as Operational Excellence, Security, Reliability, Performance Efficiency and Cost Optimization. What is missing?', [
        ['Sustainability, added in 2021 as the sixth pillar', true],
        ['Observability, which AWS split out of Operations', false],
        ['Compliance, which covers RBI and DPDP obligations', false],
        ['Scalability, the pillar for autoscaling and load', false],
      ], 'The framework has six pillars; Sustainability was added in 2021. Observability sits inside Operational Excellence, compliance is part of Security, and scaling is covered by Reliability and Performance Efficiency rather than a pillar of its own.'),
      mcq('The review shows four high-risk issues: a .env password, a single-region trail, untested backups and a one-AZ API. Which order follows the risk-then-effort rule?', [
        ['Password, trail, restore drill, then the Multi-AZ move', true],
        ['Multi-AZ move first, since it is the largest of the four', false],
        ['Restore drill, Multi-AZ, then password and trail together', false],
        ['Trail last, because logging does not stop any attack', false],
      ], 'Among items of equal risk, the cheap ones with the widest blast radius go first, so the one-day credential fix and the half-day trail lead. Size is not priority, and logging is what makes the next incident visible, so it is not optional.'),
      mcq('An engineer answers every review question with what the team plans to build next quarter. What does this do to the review?', [
        ['It hides today\'s real risks, so the plan fixes nothing', true],
        ['Nothing, because the Tool only scores the lens questions', false],
        ['It is required, because milestones record future plans', false],
        ['It raises the HRI count, which the Tool then penalises', false],
      ], 'The review is only useful if it describes what is running now; planned work belongs in the improvement plan. The Tool scores all pillar questions, milestones snapshot current answers, and aspirational answers lower rather than raise the HRI count.'),
    ],
    checkpoint: [
      mcq('PaisaPatra runs one NAT gateway in its dev VPC instead of one per AZ, and writes down that a zone failure would stop outbound calls from dev. How does Well-Architected view this?', [
        ['A documented trade-off of Reliability for Cost, which is acceptable', true],
        ['A high-risk issue that must be fixed before any other finding', false],
        ['A Security finding, since NAT gateways expose private subnets', false],
        ['Not reviewable, because dev accounts are outside the framework', false],
      ], 'The framework expects trade-offs between pillars to be made deliberately and recorded; a known, accepted reliability gap in dev is exactly that. It is not automatically high risk, NAT gateways allow outbound only, and any workload can be reviewed.'),
      mcq('What is a Well-Architected Tool milestone used for?', [
        ['A saved snapshot of the answers, compared at the next review', true],
        ['A deadline after which AWS closes the open high-risk issues', false],
        ['An AWS certification the workload receives after a review', false],
        ['A billing checkpoint that freezes the workload\'s cost data', false],
      ], 'A milestone records the state of the review so progress can be measured later. AWS does not close issues or certify workloads, and the Tool has nothing to do with billing data.'),
      mcq('PaisaPatra is a lender. Which addition makes its review ask questions specific to its industry?', [
        ['Applying the Financial Services Industry lens', true],
        ['Running the review in the ap-south-2 region', false],
        ['Answering only the Security pillar questions', false],
        ['Turning on Security Hub before the review starts', false],
      ], 'Lenses add questions for a kind of workload or industry, and AWS publishes one for financial services. The region of the workload does not change the questions, skipping pillars defeats the review, and Security Hub is a separate service.'),
    ],
  },

  /* ── ENCRYPTION_SECRETS ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_SECURITY_COST_ENCRYPTION_SECRETS',
    notes: `PaisaPatra's top finding was a database password in a .env file. This lesson fixes that properly and covers
the machinery underneath: KMS keys, who may use them, envelope encryption, and the two places AWS keeps
secrets. You already know two things from earlier lessons and they are not repeated here: S3, EBS and RDS
encrypt at rest with a tick-box ("S3: Buckets, Objects and Access", "Block and File Storage"), and encryption
at rest is **not** access control — S3 decrypts for anyone the policy lets in (the Cybersecurity track's
"Securing Cloud Networks and Storage" makes that case). Year 3's "Secrets, Properly" gave the rule: a secret
lives in a store, never in an image or a repository. Here is how the store works.

## KMS keys: three kinds

    Kind                    Who controls the policy    Rotation                 Example
    AWS owned key           AWS, invisible to you       AWS's business           default for some services
    AWS managed key         AWS (aws/s3, aws/ebs...)    automatic, yearly        tick "encrypt" with defaults
    Customer managed key    you                         optional, you set it     alias/paisapatra-loan-docs

Use a **customer managed key** when you need to decide who can decrypt (a key policy you write), to see every
use in CloudTrail under a key you own, to share it with another account, or to disable it in an emergency.
The key material of a standard symmetric key never leaves KMS's hardware security modules unencrypted; you
send data to KMS, or ask it for a data key, and it answers. KMS keys are **regional**: a key in ap-south-1
cannot decrypt in ap-south-2 (multi-Region keys exist for that case — a replica shares key material, its id
starts with mrk-). Pricing is per key per month plus per request; check the KMS pricing page.

## The key policy is the root of trust

Every KMS key has exactly one **key policy**, and unlike most AWS resources, an IAM policy alone is not
enough: IAM policies grant access to a key **only if the key policy allows the account to delegate**. That is
the job of the familiar first statement, which names the account itself as principal. Created with boto3
against moto (kms_demo.py):

    policy = {"Version": "2012-10-17", "Statement": [
      {"Sid": "AccountAdmins", "Effect": "Allow",
       "Principal": {"AWS": "arn:aws:iam::123456789012:root"}, "Action": "kms:*", "Resource": "*"},
      {"Sid": "LoanServiceUse", "Effect": "Allow",
       "Principal": {"AWS": "arn:aws:iam::123456789012:role/loan-service"},
       "Action": ["kms:Encrypt", "kms:Decrypt", "kms:GenerateDataKey"], "Resource": "*",
       "Condition": {"StringEquals": {"kms:EncryptionContext:app": "loan-docs"}}}]}
    key = kms.create_key(Description="PaisaPatra loan documents", Policy=json.dumps(policy))
    kms.create_alias(AliasName="alias/paisapatra-loan-docs", TargetKeyId=key["KeyMetadata"]["KeyId"])
    kms.enable_key_rotation(KeyId=key["KeyMetadata"]["KeyId"])

    CUSTOMER SYMMETRIC_DEFAULT Enabled arn:aws:kms:ap-south-1:123456789012:key/d171...
    rotation: True
    policy sids: ['AccountAdmins', 'LoanServiceUse']

"Resource": "*" inside a key policy means "this key". Code refers to the **alias**, never the key id, so a key
can be replaced by repointing the alias. **Rotation** makes new key material on a schedule (yearly by
default) while keeping the old material, so old ciphertext still decrypts and the key id does not change.

Two ways to lose data: write a key policy that removes everyone's admin rights (KMS refuses such a policy by
default — do not override the lockout safety check), or **delete the key**. Deletion is scheduled with a
waiting period of 7 to 30 days; after that, everything encrypted under it is gone for ever. Disable first,
watch CloudTrail for failed uses for a few weeks, then schedule. In moto: Enabled -> Disabled ->
PendingDeletion, and cancel_key_deletion returns it to Disabled.

## Encrypt directly, with context

KMS's Encrypt call takes at most 4 KB — enough for a token, not a document. Always pass an **encryption
context**: non-secret key-value pairs bound to the ciphertext, logged in CloudTrail, and usable in policy
conditions (the LoanServiceUse statement above only works for app=loan-docs). Real output:

    ctx = {"app": "loan-docs", "loan_id": "LN-20417"}
    ct = kms.encrypt(KeyId="alias/paisapatra-loan-docs", Plaintext=b"PAN: ABCDE1234F", EncryptionContext=ctx)
    kms.decrypt(CiphertextBlob=ct["CiphertextBlob"], EncryptionContext=ctx)

    decrypted: b'PAN: ABCDE1234F' | key used: True
    wrong context -> InvalidCiphertextException
    4097 bytes -> ValidationException

The wrong-context error is deliberate: a ciphertext copied from loan LN-20417 into another loan's record will
not decrypt there.

## Envelope encryption

For anything bigger, and for speed, you encrypt locally with a **data key** and let KMS protect only the data
key. This is what S3, EBS and RDS do for you under the hood:

    dk = kms.generate_data_key(KeyId="alias/paisapatra-loan-docs", KeySpec="AES_256", EncryptionContext=ctx)
    nonce = os.urandom(12)
    body = AESGCM(dk["Plaintext"]).encrypt(nonce, document, b"LN-20417")
    store(body, nonce, wrapped_key=dk["CiphertextBlob"])     # never store dk["Plaintext"]
    # later: key = kms.decrypt(CiphertextBlob=wrapped_key, EncryptionContext=ctx)["Plaintext"]

    data key: 32 bytes plaintext
    document: 84000 bytes -> stored body 84016 bytes (+16 tag)
    round trip ok: True

One KMS call per document instead of one per 4 KB, the bulk encryption runs on your CPU, and the plaintext data
key lives only in memory. For production code use the **AWS Encryption SDK**, which does exactly this and also
handles the message format and key caching; the hand-written version is here so you understand it.

## Secrets Manager or Parameter Store

    Need                                       Secrets Manager          Parameter Store
    Database passwords, partner API keys       yes                      SecureString works, no rotation
    Built-in rotation with a Lambda            yes                      no
    Plain config (feature flags, URLs)         overkill                 String parameter
    Cross-region replica for DR                yes                      no (copy it yourself)
    Cost model                                 per secret + API calls   standard tier has no storage charge

Secrets Manager keeps **versions** with staging labels: AWSCURRENT, AWSPREVIOUS and, during rotation,
AWSPENDING. Rotation runs a Lambda in four steps (createSecret, setSecret, testSecret, finishSecret); for RDS,
AWS provides the rotation functions and can manage the master password itself. Real output from
secrets_demo.py:

    sm.create_secret(Name="prod/loan-service/db", KmsKeyId="alias/paisapatra-secrets", SecretString=...)
    sm.rotate_secret(SecretId="prod/loan-service/db", RotationLambdaARN=fn,
                     RotationRules={"AutomaticallyAfterDays": 30}, RotateImmediately=False)

    RotationEnabled: True | rules: {'AutomaticallyAfterDays': 30} | lambda: pg-rotator
    after a new value: [('AWSCURRENT',), ('AWSPREVIOUS',)]
    delete_secret(RecoveryWindowInDays=7), then read -> InvalidRequestException; restore_secret works

Parameter Store, same run:

    ssm.put_parameter(Name="/prod/loan-service/bureau_api_key", Value="example-only-bureau-key",
                      Type="SecureString", KeyId="alias/paisapatra-secrets")
    without WithDecryption: the value is not the plaintext (False)
    with decryption: example-only-bureau-key
    a second put without Overwrite=True -> ParameterAlreadyExists

## Getting the secret into the app

- **ECS:** the task definition's "secrets" list names the secret ARN (optionally one JSON key of it); the
  **execution role** needs secretsmanager:GetSecretValue and kms:Decrypt on the key. The value arrives as an
  environment variable at start-up.
- **Lambda:** read it at init with boto3 or through the Parameters and Secrets extension, and cache it.
- **EKS:** the External Secrets Operator syncs it, as in "ConfigMaps, Secrets and Persistent Storage".
- **Anything that caches must refetch** after a rotation. A small pattern, run against moto:

    class DbCreds:      # fetch once, keep for ttl seconds, refetch at once after a login failure
        def get(self, force=False): ...
    1000 requests -> 1 fetch
    cached after rotation: example-only-v1
    after auth failure: example-only-v2 | fetches: 2

## In transit

TLS everywhere a byte crosses a network: ACM certificates on the load balancer and CloudFront, TLS from the app
to RDS (for PostgreSQL, the rds.force_ssl parameter refuses plain connections), and a bucket policy that
denies any request where aws:SecureTransport is false. Azure's equivalents are **Key Vault** (keys, secrets and
certificates in one service) and managed identities to read it.`,
    workedExample: `**Scenario.** Remove the loan database password from the .env file on PaisaPatra's ECS service, with
rotation, and without an outage.

**1. Create the key and the secret as code.** In the loan service's Terraform module (parsed with python-hcl2;
not applied — no account was used):

    resource "aws_kms_key" "loan_docs" {
      description             = "PaisaPatra loan documents"
      enable_key_rotation     = true
      deletion_window_in_days = 30
      policy                  = data.aws_iam_policy_document.loan_docs_key.json
    }
    resource "aws_kms_alias" "loan_docs" {
      name          = "alias/paisapatra-loan-docs"
      target_key_id = aws_kms_key.loan_docs.key_id
    }

For the RDS master password, let RDS manage it in Secrets Manager (manage_master_user_password, as in the
databases lesson). The app gets its **own** database user whose password is a Secrets Manager secret with the
AWS-provided PostgreSQL rotation function — **alternating users** strategy, so one valid login always exists
while the other is being changed.

**2. Give exactly one role access.** The ECS execution role gets secretsmanager:GetSecretValue on that one
secret ARN and kms:Decrypt on that one key; the key policy allows the role. No "*".

**3. Change the task definition.** Replace the DB_PASSWORD environment variable with a "secrets" entry whose
valueFrom is the secret's ARN. Deploy with the normal rolling update; new tasks read the secret, old tasks
still have the old value.

**4. Prove it.** CloudTrail shows GetSecretValue by the execution role at each task start. Trigger one rotation
by hand (rotate_secret with no rules change) in staging first and watch the app keep serving — the caching
pattern above refetches on a login failure.

**5. Clean up the old secret.** Change the old password in the database (it has been on disks and in an AMI;
assume it leaked), delete the .env file, rebuild the AMI without it, and search the Git history for it with a
secret scanner. Only then close the review finding.`,
    mcqs: [
      mcq('PaisaPatra\'s loan-service role has an IAM policy allowing kms:Decrypt on the loan-docs key, yet Decrypt is denied. The key policy has only one statement, for the security team\'s role. Why?', [
        ['The key policy does not let the account delegate to IAM policies', true],
        ['kms:Decrypt must also be allowed by an S3 bucket policy to work', false],
        ['IAM policies for KMS only take effect after the key is rotated', false],
        ['The role needs kms:CreateGrant before any Decrypt can succeed', false],
      ], 'For KMS, an IAM policy grants access only when the key policy allows it, usually through the statement naming the account as principal. Without that statement or one naming the role, the IAM Allow is ignored. Bucket policies, rotation and grants are not involved.'),
      mcq('Why does PaisaPatra encrypt 80 KB loan PDFs with a data key from GenerateDataKey instead of calling KMS Encrypt on each file?', [
        ['Encrypt takes at most 4 KB, and local encryption needs one call', true],
        ['GenerateDataKey keeps the master key on the app server for speed', false],
        ['Encrypt cannot use an encryption context, but data keys can', false],
        ['Data keys never need to be stored, so nothing extra is saved', false],
      ], 'KMS Encrypt is limited to 4 KB, and envelope encryption needs one KMS call per object, with the bulk work on your CPU. The KMS key never leaves KMS, Encrypt does accept an encryption context, and the wrapped data key must be stored beside the ciphertext.'),
      mcq('Which value belongs in a Parameter Store String parameter rather than in Secrets Manager?', [
        ['The maximum loan amount the API allows', true],
        ['The credit bureau\'s partner API key', false],
        ['The loan database\'s app user password', false],
        ['The UPI gateway\'s webhook signing secret', false],
      ], 'A loan limit is configuration, not a secret, so a plain String parameter is right. The bureau key, database password and webhook signing secret are all credentials that need encryption, audit and ideally rotation, which Secrets Manager provides.'),
    ],
    checkpoint: [
      mcq('A ciphertext created with encryption context {"app": "loan-docs", "loan_id": "LN-20417"} is copied into loan LN-20999\'s record and decrypted with that loan\'s context. What happens?', [
        ['KMS refuses it with InvalidCiphertextException', true],
        ['KMS decrypts it, since context is only a log label', false],
        ['KMS decrypts it but writes a warning to CloudTrail', false],
        ['KMS re-encrypts it under the new loan\'s context', false],
      ], 'The encryption context is bound to the ciphertext as authenticated data, so decryption needs the exact same pairs. It is logged, but it is not just a label; KMS does not decrypt with a warning, and it never re-encrypts silently.'),
      mcq('PaisaPatra wants to retire an old customer managed key that might still be used somewhere. What is the safe sequence?', [
        ['Disable it, watch CloudTrail for failed uses, then schedule deletion', true],
        ['Schedule deletion with a 7-day window and restore it if anything breaks', false],
        ['Delete the alias so nothing can find the key, then delete the key itself', false],
        ['Rotate it once more, so its data moves to new key material, then delete', false],
      ], 'Disabling is reversible and makes hidden users fail visibly in CloudTrail before anything is lost. Relying on a short window is risky, deleting the alias does not stop callers using the key id, and rotation keeps old material inside the same key, so deleting it still loses everything.'),
      mcq('PaisaPatra\'s app caches its database password for the life of the process. Thirty days later, rotation runs and logins start failing. What is the fix?', [
        ['Cache with a time limit and refetch on a login failure', true],
        ['Turn rotation off, since rotation is what broke the app', false],
        ['Copy the password into the task definition at deploy time', false],
        ['Read the secret on every single query, with no cache', false],
      ], 'A cache with a TTL that also refetches when authentication fails picks up the new version quickly. Turning rotation off removes the control, a value baked in at deploy goes stale the same way, and reading on every query adds latency and API cost for no benefit.'),
    ],
  },

  /* ── SECURITY_SERVICES ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_SECURITY_COST_SECURITY_SERVICES',
    notes: `Preventive controls — IAM, SCPs, encryption, private subnets — decide what can happen. **Detective** controls
tell you what did happen and what is misconfigured right now. AWS has four you should expect in every account,
and the engineer's job is different from the analyst's. The Cybersecurity track's "Cloud Logging and
Detection" teaches how to read a CloudTrail record and which events deserve an alert, and "Cloud Posture and
Container Security" how to prioritise a posture report. This lesson is the other half: switching the services
on correctly across an organisation, as code, wiring their findings to somebody, and letting the safe fixes
happen automatically.

## The four, in one line each

    Service        Answers                                          Reads
    CloudTrail     who called which API, when, from where           every API call (management by default)
    AWS Config     what each resource looks like, and did it change  resource configuration over time
    GuardDuty      does this activity look like an attack?          CloudTrail, VPC flow and DNS logs, more
    Security Hub   one prioritised list across all of the above     findings from AWS services and standards

Add **IAM Access Analyzer** (resources shared outside the account or organisation, and unused access),
**Inspector** (vulnerabilities in EC2, ECR images and Lambda) and **Macie** (personal data sitting in S3) once
the four are running. AWS has been reshaping Security Hub — recent documentation calls the posture-checking
part "Security Hub CSPM" — so match the console names you see to the roles described here.

## CloudTrail: the trail you keep

Event history keeps 90 days of management events whether you do anything or not. A **trail** is what you keep:
multi-region, log file validation on, delivered to a bucket in the log-archive account, and ideally an
**organisation trail** created once from the management account. Data events (S3 object reads, Lambda
invokes) are off by default and charged by volume, so select them for the buckets that matter. Real moto
output for PaisaPatra (secsvc_demo.py):

    ct.create_trail(Name="paisapatra-trail", S3BucketName=bucket, IsMultiRegionTrail=True,
                    EnableLogFileValidation=True, IncludeGlobalServiceEvents=True)
    ct.start_logging(Name="paisapatra-trail")
    ct.put_event_selectors(TrailName="paisapatra-trail", AdvancedEventSelectors=[
        {"Name": "management", "FieldSelectors": [{"Field": "eventCategory", "Equals": ["Management"]}]},
        {"Name": "loan-docs reads and writes", "FieldSelectors": [
            {"Field": "eventCategory", "Equals": ["Data"]},
            {"Field": "resources.type", "Equals": ["AWS::S3::Object"]},
            {"Field": "resources.ARN", "StartsWith": ["arn:aws:s3:::paisapatra-loan-docs/"]}]}])

    paisapatra-trail multi-region: True validation: True
    logging: True
    selectors: ['management', 'loan-docs reads and writes']

The bucket needs a policy letting cloudtrail.amazonaws.com check its ACL and write under AWSLogs/; forget it and
the trail is created but nothing arrives. Note that IAM, being global, logs in us-east-1 — a single-region
trail in Mumbai never sees it.

## AWS Config: what things look like

Config needs a **recorder** (what to record, with a role), a **delivery channel** (where snapshots go) and
then **rules**. AWS managed rules cover most needs; conformance packs bundle them.

    cfg.put_configuration_recorder(ConfigurationRecorder={"name": "default", "roleARN": role,
        "recordingGroup": {"allSupported": True, "includeGlobalResourceTypes": True}})
    cfg.put_delivery_channel(DeliveryChannel={"name": "default", "s3BucketName": bucket})
    cfg.start_configuration_recorder(ConfigurationRecorderName="default")
    # rules: S3_BUCKET_PUBLIC_READ_PROHIBITED, ENCRYPTED_VOLUMES, CLOUD_TRAIL_ENABLED,
    #        REQUIRED_TAGS with {"tag1Key": "owner", "tag2Key": "env"}

    config recorder: default recording: True
    rules: ['cloudtrail-on', 'ebs-encrypted', 'required-tags', 's3-no-public-read']

Moto stores rules but does not evaluate them, so compliance results are not shown. Config is charged per
configuration item recorded and per evaluation; on a busy Kubernetes account that adds up, so check the bill
after the first week.

## GuardDuty and Security Hub

GuardDuty is one call per region — create_detector(Enable=True) — and reads CloudTrail, VPC flow logs and DNS
logs on its own; you do not have to turn those logs on for it. Optional protection plans add S3, EKS, RDS,
Lambda, malware scanning and runtime monitoring. Security Hub runs standards (AWS Foundational Security Best
Practices, CIS) on top of **Config** — no Config, no controls — and collects findings in one format, ASFF. In
moto, GuardDuty's detector was ENABLED but findings are not implemented; Security Hub accepted an imported
finding and filtered it back by severity:

    imported: 1 failed: 0
    [('Loan-docs bucket allows non-TLS requests', 'HIGH')]

**Across the organisation:** make the security-tooling account the **delegated administrator** for
GuardDuty, Security Hub and Config aggregation, auto-enable for new accounts, and turn GuardDuty on in **every
region**, including those you do not use (or deny them with an SCP, as in CL1). Pick one aggregation region
(ap-south-1) for Security Hub so there is one list. All of this belongs in Terraform, not console clicks.

## Wiring findings to people

A finding nobody sees is decoration. Each service emits events to **EventBridge** in its own region; a rule
picks the ones that matter and sends them to SNS, a chat webhook, a ticket or a Lambda. Run against moto with
an SQS queue as the target:

    {"source": ["aws.guardduty"], "detail-type": ["GuardDuty Finding"],
     "detail": {"severity": [{"numeric": [">=", 7]}]}}

    three test events at severity 8.0, 5.0 and 2.0 ->
    delivered: [('UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration.OutsideAWS', 8.0)]

(The severities in those test events were set for the test.) Lower severities go to a daily digest, not a
pager. For Security Hub the AWS docs pattern matches "Security Hub Findings - Imported" with
detail.findings.Severity.Label in HIGH or CRITICAL — moto's matcher did not handle that nested array, so it was
not verified here.

## Fixing the safe ones automatically

Some findings have one correct, reversible fix: a bucket that should never be public. Config can run an AWS
Systems Manager Automation document as a **remediation**, or a Lambda can react to the Config compliance-change
event. The handler, run against moto with a synthetic event:

    def remediate(event, s3):
        d = event["detail"]
        if d["configRuleName"] != "s3-no-public-read" or \\
           d["newEvaluationResult"]["complianceType"] != "NON_COMPLIANT":
            return {"action": "none", "bucket": d["resourceId"]}
        s3.put_public_access_block(Bucket=d["resourceId"], PublicAccessBlockConfiguration={
            "BlockPublicAcls": True, "IgnorePublicAcls": True,
            "BlockPublicPolicy": True, "RestrictPublicBuckets": True})
        return {"action": "blocked-public-access", "bucket": d["resourceId"]}

    {'action': 'blocked-public-access', 'bucket': 'paisapatra-partner-uploads'}
    {'action': 'none', 'bucket': 'paisapatra-partner-uploads'}     # same event, COMPLIANT

Rules for auto-remediation: only fixes that cannot break production in a way you cannot undo; log and notify
every action; and fix the Terraform too, or the next apply reverts your fix. Terminating instances or rewriting
security groups automatically is how a security tool causes an outage.

Azure: **Activity Log** and diagnostic settings (CloudTrail), **Azure Policy** (Config rules), **Microsoft
Defender for Cloud** (GuardDuty and Security Hub together).`,
    workedExample: `**Scenario.** 02:10, PaisaPatra's on-call phone rings: GuardDuty
UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration.OutsideAWS. The temporary credentials of the
collections worker's instance role are being used from an IP address outside AWS. The analyst's triage steps
are in "Cloud Logging and Detection"; here is what the engineer on call does.

**1. Confirm in two minutes.** The finding names the role and the instance. CloudTrail for that role's access
key id shows ListBuckets and GetObject calls from the outside address. This is real; nothing PaisaPatra runs
calls AWS from outside AWS with that role.

**2. Cut off the stolen credentials.** Instance role credentials cannot be deactivated like an access key. In
IAM, **revoke active sessions** for the role: AWS attaches a policy denying everything to sessions issued
before now (a condition on aws:TokenIssueTime). New credentials the instance fetches still work, the copies
held outside stop.

**3. Contain the instance, keep the evidence.** Swap its security group for one with no rules, snapshot its EBS
volume, and take it out of the Auto Scaling group with "detach" so a fresh instance replaces it.

**4. Find how the credentials left.** The worker renders loan PDFs from a URL in the request. A request asking
it to fetch http://169.254.169.254/latest/meta-data/iam/security-credentials/ returned the credentials: an SSRF,
and the launch template still allowed **IMDSv1**, which answers a plain GET.

**5. Fix the cause in code and Terraform.** Validate PDF source URLs against an allow-list; set the launch
template's metadata options to http_tokens = "required" (IMDSv2) and a hop limit of 1; add the Security Hub
control that flags IMDSv1 to the pipeline's checks. Roll the Auto Scaling group.

**6. Scope and report.** CloudTrail shows what the credentials read: two buckets, one with loan documents —
that becomes a data incident with the compliance owner. The postmortem action list goes into the Well-Architected
plan.`,
    mcqs: [
      mcq('PaisaPatra created a multi-region trail pointing at a new bucket in the log-archive account, but no log files ever arrive. What is the most likely cause?', [
        ['The bucket policy does not allow CloudTrail to write to it', true],
        ['Trails only deliver logs once GuardDuty has been enabled', false],
        ['Multi-region trails write to CloudWatch Logs, never to S3', false],
        ['Log file validation blocks delivery until a key is created', false],
      ], 'CloudTrail needs a bucket policy letting cloudtrail.amazonaws.com read the bucket ACL and put objects under AWSLogs/. GuardDuty is independent, trails deliver to S3 (CloudWatch Logs is optional), and validation adds digest files rather than blocking delivery.'),
      mcq('Security Hub is on in PaisaPatra\'s new account but every standard\'s controls show no data. What was skipped?', [
        ['Turning on AWS Config recording in that account and region', true],
        ['Creating a GuardDuty detector in the us-east-1 region only', false],
        ['Adding data events for the S3 buckets to the trail first', false],
        ['Granting Security Hub kms:Decrypt on every key in the account', false],
      ], 'Security Hub evaluates most standard controls through Config rules, so Config must record resources first. GuardDuty is a separate source, S3 data events do not feed controls, and Security Hub needs no KMS permissions to run checks.'),
      mcq('A teammate wants a Lambda that terminates any EC2 instance a Config rule marks non-compliant. What is the strongest objection?', [
        ['Termination cannot be undone and can take production down', true],
        ['Config cannot send compliance changes to EventBridge', false],
        ['Lambda functions are not allowed to call TerminateInstances', false],
        ['Config rules only evaluate S3 buckets, never EC2 instances', false],
      ], 'Auto-remediation should be limited to reversible fixes that cannot break production; terminating on a rule match can destroy a working service and its data. Config does emit compliance-change events, Lambda can be granted any EC2 action, and Config evaluates many resource types.'),
    ],
    checkpoint: [
      mcq('PaisaPatra\'s only trail is a single-region trail in ap-south-1. Someone creates an IAM user at night. Where is that event?', [
        ['Only in us-east-1 Event history; the Mumbai trail never sees it', true],
        ['In the Mumbai trail, since every API call is logged where you work', false],
        ['Nowhere, because IAM changes are never recorded by CloudTrail', false],
        ['In AWS Config only, which replaces CloudTrail for IAM changes', false],
      ], 'IAM is a global service whose events are recorded in us-east-1, so only a multi-region trail (or one in us-east-1) keeps them; Event history there holds them for 90 days. CloudTrail does log IAM calls, and Config records resource state rather than who made the call.'),
      mcq('A GuardDuty finding shows an EC2 role\'s temporary credentials being used from outside AWS. How do you stop the stolen copies without breaking the instance\'s new ones?', [
        ['Revoke the role\'s active sessions issued before now', true],
        ['Deactivate the role\'s access key in the IAM console', false],
        ['Delete the role and create it again with a new name', false],
        ['Rotate the KMS key used by the instance\'s EBS volume', false],
      ], 'Revoking sessions adds a deny for tokens issued before the revocation time, so stolen copies fail while freshly issued credentials work. Roles have no access keys to deactivate, deleting the role breaks every legitimate user too, and the EBS key is unrelated to API credentials.'),
      mcq('PaisaPatra uses only Mumbai and Hyderabad. Why should GuardDuty still be enabled in regions it never uses, unless an SCP denies them?', [
        ['Attackers start resources in unwatched regions', true],
        ['GuardDuty bills less when every region is on', false],
        ['Findings from Mumbai are processed in us-east-1', false],
        ['IAM Access Analyzer needs it in every region', false],
      ], 'Regions nobody watches are where stolen credentials are used to run miners and other resources, so either watch them or deny them. Enabling more regions does not lower cost, GuardDuty findings are regional, and Access Analyzer does not depend on GuardDuty.'),
    ],
  },

  /* ── FINOPS ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_SECURITY_COST_FINOPS',
    notes: `Year 3's "What It Costs" taught you to estimate an architecture before building it. CL1 set up budgets and
tags ("A Safe AWS Account", "Multi-Account Setups, Tags and Guardrails") and compared On-Demand, Savings Plans
and Spot ("Paying for Compute"). This lesson is the month after: the bill has arrived, it is bigger than
expected, and the CFO wants to know why and what you will do about it. That practice is **FinOps** — engineering,
finance and product sharing responsibility for cloud spend, because engineers make the decisions that spend it.

**Every rupee figure in this lesson is made up.** They come from a synthetic file built to look like a Cost
and Usage Report, not from AWS prices. Prices change and differ by region; look them up on the pricing pages.

## The loop: inform, optimise, operate

The FinOps Foundation describes three phases you go round continuously. **Inform**: everyone can see what they
spend, allocated to an owner. **Optimise**: remove waste and buy smarter. **Operate**: budgets, alerts, reviews
and policies so it stays fixed. Teams that jump to "optimise" without "inform" cut the wrong things.

## The AWS tools

- **Cost Explorer** — charts of cost by service, account, region, tag, usage type, daily or monthly, with a
  forecast. Good for questions; awkward for repeatable analysis.
- **Cost and Usage Report (CUR)**, now delivered through **Data Exports** — every line item, hourly or daily,
  to an S3 bucket as CSV or Parquet; query it with Athena or pandas. This is the source of truth.
- **Cost allocation tags** (activated in Billing) and **cost categories** (rules that map accounts and tags to
  teams) — how cost gets an owner.
- **Budgets** (actual and forecast alerts) and **Cost Anomaly Detection** (monitors per service or per tag that
  alert on unusual spend).
- **Compute Optimizer** (right-sizing recommendations from CloudWatch metrics) and **Trusted Advisor** (idle and
  under-used resource checks).

Know three cost views: **unblended** (the rate actually charged on that line that hour), **amortised**
(upfront commitment fees spread across the period they cover) and **net** (after discounts). Commitment
purchases make unblended and amortised differ; compare like with like.

## Reading the bill with pandas

PaisaPatra's September file has 782 line items across two accounts. Read the account id as text (pandas turns
it into a number otherwise), and separate usage from fees and tax before allocating:

    cur = pd.read_csv("cur_sept_2026_synthetic.csv", keep_default_na=False,
                      dtype={"line_item_usage_account_id": str})
    usage = cur[cur["line_item_line_item_type"] == "Usage"].copy()
    usage["owner"] = usage["resource_tags_user_owner"].replace("", "(untagged)")
    usage.groupby("owner")["line_item_unblended_cost"].sum()

Real output (made-up rupees):

    total 372459 | Fee 4200  Tax 9800  Usage 358459

    by service                   by owner tag
    AmazonEC2         245509     lending       115853  32.3%
    AmazonRDS          49339     platform       92061  25.7%
    AWSDataTransfer    32427     (untagged)     80634  22.5%
    AmazonCloudWatch   17152     data           54470  15.2%
    AmazonS3           12593     collections    15441   4.3%
    AmazonVPC           1440

"EC2 is 68%" is the useless headline. Split by **usage type** after the region prefix (APS3 is Mumbai's) and
the story changes:

    BoxUsage (instances)         143727
    NatGateway-Bytes              83061      <- data through NAT, billed under EC2
    Multi-AZUsage (RDS)           49339
    DataTransfer-Out-Bytes        19407
    DataProcessing-Bytes          17152      <- CloudWatch Logs ingestion
    DataTransfer-Regional-Bytes   13020      <- traffic between AZs

The NAT gateway is processing more money than the loan API's instances cost. And 22.5% of usage has no owner:
three c6i.xlarge instances, data transfer and four idle public IPv4 addresses.

## The usual waste, and its fix

    Waste                                   How you see it                       Fix
    Idle or oversized instances             CPU p95 under 10% for weeks           stop, right-size, schedule
    Unattached EBS volumes, old snapshots   describe_volumes status=available     snapshot if needed, delete
    Idle public IPv4 / Elastic IPs          PublicIPv4:IdleAddress line items     release
    S3 and ECR traffic through NAT          NatGateway-Bytes; flow logs to S3     S3 gateway endpoint (no charge);
                                                                                  ECR interface endpoints (charged)
    Cross-AZ chatter                        DataTransfer-Regional-Bytes           keep chatty pairs in one AZ, cache
    Logs nobody reads                       DataProcessing-Bytes jump             log levels, retention, sampling
    Dev running 24x7                        dev BoxUsage flat across nights       schedule off-hours
    Steady load on On-Demand                stable BoxUsage over months           Savings Plans ("Paying for Compute")

Commit last. Buying a Savings Plan for instances you are about to delete locks the waste in.

A scan that finds the first three straight from the API (run against moto; ids shortened):

    for page in ec2.get_paginator("describe_volumes").paginate(
            Filters=[{"Name": "status", "Values": ["available"]}]): ...
    for a in ec2.describe_addresses()["Addresses"]:
        if "AssociationId" not in a: ...

    unattached volume  vol-4e4ff88b  500 GiB gp2
    unattached volume  vol-b63b207a  200 GiB gp2
    idle Elastic IP    eipalloc-efe  not associated
    no owner tag       i-7e03de8f99  c6i.xlarge
    no owner tag       i-483a64495b  c6i.xlarge

## Anomalies

Cost Anomaly Detection does this with a machine-learned model; the idea fits in pandas. Compare each
service's daily cost with the median of its previous seven days and flag anything over 1.5x:

    base = daily.rolling(7, min_periods=7).median().shift(1)
    ratio = daily / base

    AmazonCloudWatch: first flagged 2026-09-18, 8.2x its 7-day median; flagged days: 4
    services flagged: 1 of 6
    CloudWatch 1-17 Sep avg/day: 141 | 18-30 Sep avg/day: 1136 | extra this month: 12937

Someone left debug logging on in the loan API on 18 September. Note "flagged days: 4": after a few days the
baseline absorbs the new level and the alert goes quiet, though the money keeps going. An anomaly alert is a
prompt to act within days, not something to snooze. (Cost Explorer's anomaly monitors were not run; moto does
not implement them.)

## Showback, chargeback and unit cost

**Showback** sends each team its share every month; **chargeback** moves the money between budgets. Start
with showback. The number that persuades a CFO is a **unit cost**: cost per loan application processed, per
thousand UPI repayments collected. If volume doubled and cost rose 30%, the platform got cheaper per loan — a
good month, whatever the headline says. Azure's equivalent toolset is Cost Management + Billing, budgets and
Azure Advisor's cost recommendations.`,
    workedExample: `**Scenario.** PaisaPatra's September usage came to 358,459 (made-up rupees). The CFO asks for a plan to
cut it by the end of October, with evidence. You have the synthetic CUR, a month of CPU metrics and VPC flow logs.

**1. Find the owners first.** 22.5% is untagged. The three c6i.xlarge instances were launched by a load test
on 2 September (CloudTrail RunInstances, by the platform team's role) and never stopped. The data-transfer lines
have no resource tag by nature; allocate them with a cost category rule by account.

**2. List the candidates with their evidence** (real output of analyse_cur.py; amounts are one month of
made-up rupees):

    46767  stop 3 load-test instances                      cpu p95 ~1%, no owner, CloudTrail shows who
    41058  analytics r6i.2xlarge -> r6i.large, off at      cpu avg 3%, p95 9%; data team agrees
           nights and weekends (~1/4 size x ~1/3 hours)
     9720  delete 3 unattached volumes (after snapshot)    status available for 30 days
     1440  release 4 idle Elastic IPs                      not associated with anything
    49837  S3 gateway endpoint                              flow logs: ~60% of NAT bytes go to S3
    12937  turn debug logging off                           jump on 18 Sep, anomaly flagged
    161758 total, against 358459 usage

**3. Check each one for risk.** Right-sizing analytics: confirm nothing runs at month-end close that needs the
memory. The endpoint: a route-table change per private subnet — test in dev, then prod in a quiet window. The
volumes: snapshot first, delete after a week if nobody asks. ECR through interface endpoints would also cut
NAT bytes, but endpoints have their own hourly and data charges; estimate them before claiming a saving.

**4. Make it stay fixed.** A Config rule for required tags, a budget and anomaly monitor per team, a scheduler
for dev, a log-level check in code review, and a monthly 30-minute showback review per team.

**5. Report honestly.** "Up to 45% of September's usage was avoidable; about 60% of that is done this week,
the rest by 15 October. Savings Plans come after the clean-up, sized on the new baseline."`,
    mcqs: [
      mcq('PaisaPatra\'s cost report shows EC2 as 68% of usage. Which next step tells the team the most about where the money goes?', [
        ['Split EC2 by usage type, which separates instances from NAT data processing', true],
        ['Buy a Compute Savings Plan sized at 68% of the monthly bill straight away', false],
        ['Sort the EC2 instances by name and stop those that look like test servers', false],
        ['Move all EC2 workloads to Lambda, since Lambda never bills for idle time', false],
      ], 'EC2 as a product code includes NAT gateway hours and data processing, EBS and more, so the usage type split shows what is really being paid for. Committing before cleaning up locks in waste, stopping by name is guesswork, and a rewrite to Lambda is not an analysis.'),
      mcq('The anomaly check flagged CloudWatch on 18 September, but the flags stopped on 22 September while the higher spend continued. Why?', [
        ['The 7-day baseline absorbed the new level as normal', true],
        ['CloudWatch Logs pricing drops after four days of use', false],
        ['Anomaly checks only run for the first week of a month', false],
        ['The debug logs were deleted, so ingestion had stopped', false],
      ], 'A rolling baseline treats a sustained step as the new normal within days, so the alert stops though the extra cost does not. Pricing does not change after four days, the check runs every day, and the data shows ingestion continued at the higher level.'),
      mcq('Most of PaisaPatra\'s NAT gateway bytes are traffic from private subnets to S3. What is the cheapest correct fix?', [
        ['Add an S3 gateway endpoint to the private route tables', true],
        ['Move the instances into public subnets with public IPs', false],
        ['Add a second NAT gateway so the bytes are split in two', false],
        ['Turn on S3 Transfer Acceleration for the busy buckets', false],
      ], 'A gateway endpoint routes S3 traffic privately and has no charge of its own, removing that traffic from NAT processing. Public subnets expose the instances, a second NAT gateway adds hourly cost without reducing bytes processed, and Transfer Acceleration is for long-distance uploads and adds cost.'),
    ],
    checkpoint: [
      mcq('PaisaPatra bought a one-year commitment with an upfront fee in April. Which cost view spreads that fee across the months it covers?', [
        ['Amortised cost', true],
        ['Unblended cost', false],
        ['Blended cost of usage', false],
        ['Public on-demand cost', false],
      ], 'Amortised cost spreads upfront commitment fees over the term, so each month carries its share. Unblended shows the fee on the day it was charged, blended averages rates across an organisation, and on-demand cost is a list-price comparison rather than what was paid.'),
      mcq('22% of PaisaPatra\'s usage has no owner tag. The engineers say the resources are tagged. What should be checked first?', [
        ['That the tag key matches exactly and is activated for cost', true],
        ['That the tags were added by the root user and not by IAM', false],
        ['That the resources are in us-east-1, where tags are read', false],
        ['That each tag value is shorter than ten characters long', false],
      ], 'Tag keys are case-sensitive and only activated cost allocation tags appear in cost data, so "Owner" or an unactivated "owner" leaves cost untagged. Who added a tag, the region and value length do not affect allocation.'),
      mcq('Loan volume doubled in October and the AWS bill rose 30%. How should PaisaPatra present this to the CFO?', [
        ['Cost per loan fell, so the platform became more efficient', true],
        ['The bill rose 30%, so the platform became less efficient', false],
        ['Bills always rise with volume, so nothing needs reporting', false],
        ['The rise proves a Savings Plan must be bought immediately', false],
      ], 'Unit cost — cost per loan processed — fell sharply because volume grew faster than spend, which is the efficiency signal. The headline alone misleads, cost still needs reporting and owning, and a rise does not by itself prove a commitment is right.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_SECURITY_COST_DEBUGGING',
    notes: `Six things that went wrong at PaisaPatra after the security and cost work. Each looked fine in review. Read
the symptom, guess the cause, then check. Outputs marked "real" are boto3 against moto (debug_demo.py and the
lesson scripts); case 1 is reasoned from the KMS and S3 documentation, because moto does not enforce IAM.

The method for this topic: **which region, which key, which version, which baseline.** Keys, secrets, rules and
detectors are all regional, secrets have versions, and cost alerts compare against a moving baseline.

## 1. The bucket read that S3 allowed and KMS refused

**Symptom.** The new statements job has s3:GetObject on paisapatra-loan-docs/*. Every GetObject fails with
AccessDenied. A colleague's role with the same S3 policy works.

**Cause.** The bucket's default encryption is SSE-KMS with alias/paisapatra-loan-docs. Reading an SSE-KMS
object makes S3 call kms:Decrypt on the caller's behalf, so the caller needs kms:Decrypt on that key **and**
the key policy must allow it. The colleague's role is named in the key policy; the new job's is not.

**Fix.** Add kms:Decrypt on that one key ARN to the job's role, and confirm the key policy delegates to IAM
(the account statement) or names the role. Do not switch the bucket back to SSE-S3 to "make it work" — that
throws away the second gate and the decrypt audit trail.

## 2. Every old document stopped decrypting after a tidy-up

**Symptom.** A refactor of the document service added "tenant": "kirana" to the encryption context "for
better audit logs". New documents work; every document stored before the change fails.

    wrong context -> InvalidCiphertextException          (real)

**Cause.** The context is bound to each ciphertext when it is made. Decrypt must pass exactly the pairs used
at encrypt time; old documents were sealed without "tenant".

**Fix.** Store the context (or the fields to rebuild it) with each object and pass back what was stored.
Treat a change to the context as a data migration, never as a logging tweak.

## 3. Logins failing thirty days after go-live

**Symptom.** The loan API ran fine for a month after moving to Secrets Manager. At 03:00 on day 30, database
logins fail on every task until someone restarts the service.

    cached after rotation: example-only-v1               (real, from the caching demo)
    after auth failure: example-only-v2 | fetches: 2

**Cause.** The app read the secret once at start-up and held it for ever. Rotation (single-user strategy)
changed the password; the old one stopped working at once.

**Fix.** Cache with a TTL and refetch on an authentication failure, as in the lesson; for the database user,
prefer the alternating-users rotation so a valid login always exists during the change.

## 4. The API key that looked like garbage

**Symptom.** The bureau integration sends a long string starting with "AQIC..." (or, in moto, "kms:alias/...")
as its API key and gets 401 from the partner.

    without decryption: SecureString kms:alias/paisapatra-sec... False   (real)
    with decryption: example-only-bureau-key

**Cause.** get_parameter on a SecureString returns the encrypted value unless WithDecryption=True is passed.

**Fix.** Pass WithDecryption=True; the role also needs kms:Decrypt on the parameter's key. Add a start-up
check that fails loudly if a secret does not look like a secret of the expected shape.

## 5. The finding in Hyderabad that paged nobody

**Symptom.** During a game day, the security team triggers a sample high-severity GuardDuty finding in
ap-south-2. The on-call queue never receives it. The same test in Mumbai pages within a minute.

    rules in ap-south-2: []                                  (real)
    delivered from: ['ap-south-1']

**Cause.** GuardDuty findings, and the EventBridge events they produce, stay in their region. The rule and
its target were created only in ap-south-1.

**Fix.** Deploy the rule in every region from the same Terraform module (a for_each over regions), or route
everything through Security Hub's aggregation region and alert from there. Test each region after the change.

## 6. The DR drill that could not start the app

**Symptom.** In the Hyderabad recovery drill, the restored loan API crashes at start-up: ResourceNotFound for
its database secret. The database restored fine.

    Hyderabad read -> ResourceNotFoundException              (real)
    after replicate: {"password": "example-only"}
    key id in Hyderabad -> NotFoundException

**Cause.** Secrets and KMS keys are regional. The secret existed only in Mumbai, and the Mumbai key id means
nothing in ap-south-2.

**Fix.** Replicate the secret to ap-south-2 (replicate_secret_to_regions; the replica is re-encrypted with a
key in that region), use a key in the recovery region or a multi-Region key (its id starts with mrk-), and make
"read every secret in the DR region" a step in the drill checklist.`,
    mcqs: [
      mcq('PaisaPatra\'s statements job has s3:GetObject on the loan-docs bucket but gets AccessDenied on every object. The bucket uses SSE-KMS. What is missing?', [
        ['kms:Decrypt on the bucket\'s key, allowed by the key policy too', true],
        ['s3:ListBucket on the bucket ARN, which GetObject always needs', false],
        ['An S3 gateway endpoint, since KMS objects need private routing', false],
        ['kms:GenerateDataKey, which S3 uses whenever it reads an object', false],
      ], 'Reading an SSE-KMS object needs Decrypt on the key, granted by IAM and allowed by the key policy. ListBucket is for listing, not reading a known key; endpoints affect routing, not authorisation; and GenerateDataKey is used when writing, not reading.'),
      mcq('A developer added a field to the encryption context to improve audit logs. New documents decrypt; old ones fail with InvalidCiphertextException. What is the right fix?', [
        ['Pass back exactly the context each object was encrypted with', true],
        ['Rotate the KMS key so that the old documents are re-encrypted', false],
        ['Retry the decrypt calls, since this error is often transient', false],
        ['Give the role kms:ReEncrypt so it can read the old documents', false],
      ], 'The context is part of each ciphertext, so decryption must use the original pairs, which means storing them with the object. Rotation does not re-encrypt existing data, the error is deterministic rather than transient, and ReEncrypt still needs the original context.'),
      mcq('A high-severity test finding in ap-south-2 never reached PaisaPatra\'s on-call queue, though the same test in ap-south-1 did. Why?', [
        ['The EventBridge rule existed only in ap-south-1', true],
        ['GuardDuty cannot produce findings in ap-south-2', false],
        ['SQS queues reject messages sent from Hyderabad', false],
        ['Sample findings are never sent to EventBridge', false],
      ], 'GuardDuty findings become EventBridge events in their own region, so a rule is needed in each region or findings must be aggregated centrally. GuardDuty runs in Hyderabad, cross-region targets are not the issue here, and the Mumbai test shows sample findings do produce events.'),
      mcq('In a Hyderabad DR drill the app fails to start: its database secret is not found. The database restored fine. What prevents this next time?', [
        ['Replicating the secret to ap-south-2 and testing reads there', true],
        ['Copying the Mumbai key id into the Hyderabad configuration', false],
        ['Granting the role secretsmanager:* on every secret in Mumbai', false],
        ['Moving the secret into the database as a table of passwords', false],
      ], 'Secrets are regional, so a replica in the recovery region (with a key there) is needed, and the drill should prove it. A Mumbai key id does not exist in Hyderabad, wider permissions in Mumbai do not create a secret in Hyderabad, and storing passwords in the database defeats the secret store.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_SECURITY_COST_PRACTICE',
    notes: `Eight exercises, easiest first. Write your answer before reading ours. Exercises 4, 6 and 7 can be run
against moto and pandas at no cost; the answers' outputs come from such runs. All rupee amounts are made up.

## 1. Which pillar? (warm-up)

Name the Well-Architected pillar each finding belongs to: (a) no restore has ever been tested; (b) deploys are
done by SSH; (c) an instance runs at 2% CPU; (d) access keys older than a year; (e) dev runs all night unused;
(f) no owner tags.

**Answer.** (a) Reliability, (b) Operational Excellence, (c) Performance Efficiency (and Cost), (d) Security,
(e) Sustainability (and Cost), (f) Cost Optimization. Several findings touch two pillars; say both.

## 2. Pick the key

For each, choose AWS managed key or customer managed key: (a) EBS volumes of a dev sandbox; (b) the loan
documents bucket, which a partner account must read; (c) a secret that the security team must be able to make
unreadable in an emergency.

**Answer.** (a) AWS managed is fine. (b) Customer managed — you cannot edit an AWS managed key's policy, so you
cannot grant the partner account. (c) Customer managed — you can disable it.

## 3. Secrets Manager or Parameter Store

(a) the RDS app user's password; (b) the API's log level; (c) the UPI gateway's webhook signing secret; (d)
the S3 bucket name for statements; (e) a partner's OAuth client secret that the partner rotates each quarter.

**Answer.** (a) Secrets Manager with rotation; (b) Parameter Store String; (c) Secrets Manager; (d) Parameter
Store String; (e) Secrets Manager — no automatic rotation (the partner rotates it), but versioning, audit
and a resource policy still help. SecureString would also work for (e) in a small team.

## 4. Envelope decryption, in order

A stored loan document has: the AES-GCM body, its nonce, the wrapped data key and the encryption context.
Write the steps to read it.

**Answer.** (1) kms.decrypt(CiphertextBlob=wrapped_key, EncryptionContext=ctx) gives the plaintext data key;
(2) AESGCM(key).decrypt(nonce, body, aad) gives the document; (3) drop the key from memory. You never tell KMS
which key to use for a symmetric ciphertext — the wrapped blob records it. Run against moto: "round trip ok:
True".

## 5. Write the key policy statement

Allow the role loan-service in account 123456789012 to encrypt, decrypt and make data keys with the
loan-docs key, but only for the loan-docs application.

**Answer.**

    {"Sid": "LoanServiceUse", "Effect": "Allow",
     "Principal": {"AWS": "arn:aws:iam::123456789012:role/loan-service"},
     "Action": ["kms:Encrypt", "kms:Decrypt", "kms:GenerateDataKey"], "Resource": "*",
     "Condition": {"StringEquals": {"kms:EncryptionContext:app": "loan-docs"}}}

"Resource": "*" in a key policy means this key. Keep the account statement too, or IAM policies stop working
for the key and you risk locking yourself out.

## 6. An EventBridge rule for public buckets

Write the event pattern that matches only when the Config rule s3-no-public-read turns NON_COMPLIANT.

**Answer.**

    {"source": ["aws.config"], "detail-type": ["Config Rules Compliance Change"],
     "detail": {"configRuleName": ["s3-no-public-read"],
                "newEvaluationResult": {"complianceType": ["NON_COMPLIANT"]}}}

Against moto with three test events (that rule non-compliant, that rule compliant, another rule
non-compliant), only the first was delivered: "delivered: ['a']".

## 7. Who owns the bill?

Given the synthetic CUR, write pandas that returns usage cost per owner tag, with untagged rows shown as
"(untagged)", and the share of each.

**Answer.**

    usage = cur[cur["line_item_line_item_type"] == "Usage"].copy()
    usage["owner"] = usage["resource_tags_user_owner"].replace("", "(untagged)")
    by_owner = usage.groupby("owner")["line_item_unblended_cost"].sum().sort_values(ascending=False)
    (100 * by_owner / by_owner.sum()).round(1)

Real output: lending 32.3, platform 25.7, (untagged) 22.5, data 15.2, collections 4.3. Common slips: forgetting
keep_default_na=False (empty tags become NaN and groupby drops them silently) and including Tax and Fee lines.

## 8. Unit cost (made-up figures)

September: usage 358,459, 18,200 loan applications processed. October after the clean-up: 230,000 and 21,000
applications. What happened to cost per application?

**Answer.** 358459 / 18200 = 19.70 per application in September; 230000 / 21000 = 10.95 in October — down by
about 44% while volume rose 15%. That sentence, not the total, goes to the CFO.`,
    mcqs: [
      mcq('A partner account must read PaisaPatra\'s loan-docs bucket, encrypted with SSE-KMS. Why can the AWS managed key aws/s3 not be used?', [
        ['Its key policy cannot be edited to allow another account', true],
        ['It is not able to encrypt objects larger than 4 KB in size', false],
        ['AWS managed keys never rotate, so auditors reject them', false],
        ['It only works for buckets created in the us-east-1 region', false],
      ], 'You cannot change an AWS managed key\'s policy, so cross-account use needs a customer managed key. S3 uses data keys so object size is irrelevant, AWS managed keys rotate automatically, and they exist in every region.'),
      mcq('Which pattern makes PaisaPatra\'s EventBridge rule fire only when s3-no-public-read becomes non-compliant?', [
        ['Match configRuleName and newEvaluationResult.complianceType', true],
        ['Match source aws.config alone and filter in the Lambda later', false],
        ['Match detail-type "GuardDuty Finding" with severity of 7 or more', false],
        ['Match resourceType AWS::S3::Bucket and nothing else in detail', false],
      ], 'Matching both the rule name and the new compliance type delivers exactly the events wanted. Matching only the source sends every Config event, GuardDuty findings are a different source, and the resource type alone includes compliant evaluations and other rules.'),
      mcq('A pandas cost-by-owner report drops a large part of the bill without any error. What is the most likely slip?', [
        ['Empty tags read as NaN, which groupby silently leaves out', true],
        ['The groupby sorted the owners by name before it summed them', false],
        ['The unblended cost column was read in as a text column', false],
        ['The account id column was parsed as an integer by pandas', false],
      ], 'By default empty strings become NaN and groupby excludes NaN keys, so untagged cost vanishes; keep_default_na=False or fillna fixes it. Sorting does not drop rows, a text cost column would raise or concatenate rather than silently shrink, and the account id type does not affect owner totals.'),
      mcq('Which description of decrypting an envelope-encrypted document is correct?', [
        ['KMS unwraps the data key; the document is decrypted locally', true],
        ['KMS receives the whole document and decrypts it on its side', false],
        ['The app must name the KMS key id, or Decrypt cannot proceed', false],
        ['The data key is read from Parameter Store before decrypting', false],
      ], 'Only the small wrapped data key goes to KMS; the bulk decryption happens in the application with that key. For symmetric keys the ciphertext blob identifies the key, and the wrapped key is stored with the object rather than in Parameter Store.'),
      mcq('PaisaPatra\'s total AWS usage fell while loan applications rose 15%. Which metric shows the improvement most clearly?', [
        ['Cost per loan application processed', true],
        ['Share of the bill under EC2 instances', false],
        ['Number of AWS services in the bill', false],
        ['Percentage of resources with tags', false],
      ], 'Unit cost ties spend to the business outcome, so it shows efficiency even when totals move with volume. Service share, service count and tag coverage are useful hygiene measures but do not show cost per unit of work.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_SECURITY_COST_INTERVIEW_QUESTION',
    notes: `Four questions asked in fresher cloud, DevOps and SRE interviews at product companies, GCCs and AWS partners in
Hyderabad, Bengaluru and Pune. Answer each aloud in about two minutes, then compare. Interviewers listen for
the mechanism (data key, key policy, staging labels, usage type) and for whether you measure before you cut.

## Q1. "What is envelope encryption, and why does KMS use it?"

**Model answer.** "KMS keys never leave KMS, and its Encrypt call only takes 4 KB. So for real data you ask KMS
for a data key: GenerateDataKey returns it twice, in plaintext and encrypted under the KMS key. You encrypt the
data locally with the plaintext key, for example AES-GCM, throw the plaintext key away, and store the encrypted
data key next to the data. To read, you send only the small encrypted key to KMS to unwrap it. One KMS call per
object, bulk work on your CPU, and every unwrap is checked against the key policy and logged in CloudTrail.
S3, EBS and RDS do exactly this; in my own code I'd use the AWS Encryption SDK."

**Follow-up.** "What is an encryption context?" — "Non-secret key-value pairs bound to the ciphertext, which must
match on decrypt. They appear in CloudTrail and can be used in key policy conditions, so a ciphertext from one
loan cannot be decrypted as another's."

## Q2. "How should an app on ECS get its database password?"

**Model answer.** "From Secrets Manager, encrypted with a customer managed key. The task definition's secrets
section points at the secret ARN; the task execution role has GetSecretValue on that one secret and Decrypt
on that key, nothing wider. Rotation on, with the alternating-users strategy so there's always a valid login.
The app caches with a short TTL and refetches on an authentication failure. Nothing in the image, the repo,
Terraform variables or plain environment variables in the task definition."

**Follow-up.** "And the RDS master password?" — "Let RDS manage it in Secrets Manager; apps should never use the
master user anyway."

## Q3. "Our AWS bill went up 40% this month. How do you investigate?"

**Model answer.** "First, is it real and is it unexpected — did traffic go up 40% too? I'd look at cost per unit
of business, say per order. Then Cost Explorer, daily, grouped by service, then by usage type and account, to
find which line moved and on which day. The usage type matters: EC2 includes NAT gateway data processing and
EBS. Once I have the day and the line, CloudTrail tells me who created or changed what that day. Typical
causes: something left running after a test, debug logging, traffic going through NAT or across AZs, a new
feature's data transfer. Then fix it, and add an anomaly monitor and an owner tag so it's caught in a day next
time."

**Follow-up.** "Would you buy Savings Plans to bring it down?" — "Not first. Clean up, then commit on the new
steady baseline; committing first locks the waste in."

## Q4. "What security services would you turn on in a new AWS account, and how?"

**Model answer.** "An organisation CloudTrail trail, multi-region with log file validation, into a log-archive
account. AWS Config recording everywhere with managed rules or a conformance pack. GuardDuty in every region,
including unused ones, or an SCP that denies those regions. Security Hub with the Foundational Best Practices
standard, aggregated in one region. IAM Access Analyzer. All with the security account as delegated
administrator and auto-enable for new accounts, and all in Terraform. Then the part people skip: EventBridge
rules that send high-severity findings to on-call in every region, and auto-remediation only for safe,
reversible fixes like blocking public access on a bucket."

**Follow-up.** "GuardDuty fires for an EC2 role's credentials used outside AWS. What do you do?" — "Revoke the
role's active sessions, isolate the instance and keep a snapshot, find how they leaked — usually SSRF with
IMDSv1 — enforce IMDSv2, and check CloudTrail for what the credentials touched."`,
    mcqs: [
      mcq('An interviewer asks why S3 does not send each object to KMS to be encrypted. Which answer shows the mechanism?', [
        ['S3 encrypts with a data key; KMS only wraps that small key', true],
        ['KMS keys are copied into S3 so it can encrypt objects itself', false],
        ['S3 objects are not encrypted at all unless a key is supplied', false],
        ['KMS rejects any request that comes from an AWS service role', false],
      ], 'S3 uses envelope encryption: a data key encrypts the object and KMS protects the data key. KMS keys never leave KMS, S3 encrypts new objects by default, and AWS services call KMS on the caller\'s behalf all the time.'),
      mcq('Asked how an ECS task should receive its database password, which answer would an interviewer rate highest?', [
        ['Secrets Manager via the task definition, scoped execution role, rotation', true],
        ['An environment variable in the task definition, set by the CI pipeline', false],
        ['A file baked into the image at build time, readable by the app only', false],
        ['A Terraform variable marked sensitive, passed to the task at deploy', false],
      ], 'Referencing the secret from the task definition with a narrowly scoped execution role, plus rotation, keeps the value out of images, repos and plain configuration. Plain environment variables, baked files and Terraform variables all leave the value in places that are read, logged or stored.'),
      mcq('The bill rose 40% this month. What should a candidate say they would do first?', [
        ['Check it against business volume, then find the line and the day', true],
        ['Buy a Savings Plan at once to cover the new level of spend', false],
        ['Stop every instance without an owner tag across all accounts', false],
        ['Open a support case asking AWS to explain the higher charges', false],
      ], 'A good answer establishes whether the rise is unexpected relative to volume and then localises it by service, usage type and day before acting. Committing first locks in waste, blanket stops can take down production, and AWS support is not the first investigation tool.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_SECURITY_COST_CHECKPOINT',
    notes: `Ten questions across the topic: Well-Architected reviews, KMS and envelope encryption, Secrets Manager and
Parameter Store, the detective services and their wiring, and FinOps. Answer without notes; the result shows
which lesson to revisit.`,
    checkpoint: [
      mcq('PaisaPatra\'s review lists 30 findings. Which is the best way to turn them into a plan?', [
        ['Order by risk, then by blast radius and effort, with owners and dates', true],
        ['Fix them in the order the Tool lists the pillars, starting at the top', false],
        ['Fix every medium-risk finding first, since there are more of them', false],
        ['Fix only the Security pillar findings, because auditors read those', false],
      ], 'High risks come first, cheap fixes with wide impact lead among them, and every item gets an owner and a date. Pillar order is arbitrary, quantity is not priority, and reliability and cost findings matter to the business as much as security.'),
      ck('IAM_FUNDAMENTALS', 'Which statement about a customer managed KMS key\'s policy is correct?', [
        ['IAM policies work for the key only if its key policy allows that', true],
        ['IAM policies alone grant key access whatever the key policy says', false],
        ['A key policy is optional, and keys without one are open to all', false],
        ['Key policies only control rotation and have no effect on access', false],
      ], 'Every KMS key has a key policy, and IAM policies grant access to the key only when the key policy delegates to the account. Without that, an IAM Allow does nothing. Keys are never open by default, and the key policy is the primary access control.'),
      ck('IAM_FUNDAMENTALS', 'PaisaPatra stores each loan PDF encrypted with a data key. What must be stored next to each PDF?', [
        ['The wrapped data key, the nonce and the encryption context', true],
        ['The plaintext data key, so the PDF can be read without KMS', false],
        ['A copy of the KMS key material, exported for safe keeping', false],
        ['Nothing extra, since KMS keeps a copy of every data key', false],
      ], 'Decryption needs the wrapped key to send to KMS, the nonce for AES-GCM and the exact context. Storing the plaintext key defeats the scheme, KMS key material cannot be exported for standard keys, and KMS does not store data keys for you.'),
      ck('IAM_FUNDAMENTALS', 'What happens to data encrypted under a KMS key once its scheduled deletion completes?', [
        ['It can never be decrypted again', true],
        ['AWS Support can restore the key', false],
        ['It decrypts with the AWS managed key', false],
        ['It stays readable for one more year', false],
      ], 'Deleting a KMS key destroys its key material, so ciphertext under it is permanently unrecoverable; that is why there is a 7-30 day waiting period and why you disable first. Support cannot restore it, other keys cannot decrypt it, and there is no grace year.'),
      ck('IAM_FUNDAMENTALS', 'During rotation of a Secrets Manager secret, which staging label marks the new value before it is promoted?', [
        ['AWSPENDING', true],
        ['AWSCURRENT', false],
        ['AWSPREVIOUS', false],
        ['AWSLATEST', false],
      ], 'The rotation function creates the new version as AWSPENDING, sets and tests it, then moves AWSCURRENT to it, leaving the old one as AWSPREVIOUS. There is no AWSLATEST label.'),
      ck('IAM_FUNDAMENTALS', 'PaisaPatra wants a record of every read of objects in its loan-docs bucket. What must be added to its trail?', [
        ['S3 data events selected for that bucket', true],
        ['Log file validation on the existing trail', false],
        ['A second copy of the management events', false],
        ['CloudTrail Insights on write management events', false],
      ], 'Object-level reads are data events, which are off by default and must be selected per bucket or prefix. Validation proves logs were not altered, management events cover control-plane calls only, and Insights flags unusual management activity rather than object reads.'),
      ck('IAM_FUNDAMENTALS', 'Which job belongs to AWS Config rather than to GuardDuty?', [
        ['Reporting that an EBS volume is unencrypted', true],
        ['Spotting role credentials used outside AWS', false],
        ['Flagging DNS lookups of known mining pools', false],
        ['Detecting API calls from a known bad IP address', false],
      ], 'Config records resource configuration and checks it against rules, such as whether volumes are encrypted. Credential misuse, mining-pool DNS lookups and calls from malicious IPs are threat detections from GuardDuty\'s analysis of logs.'),
      ck('IAM_FUNDAMENTALS', 'Which finding is a sensible candidate for automatic remediation at PaisaPatra?', [
        ['A bucket that becomes public: turn on Block Public Access', true],
        ['An EC2 instance without tags: terminate it within the hour', false],
        ['A security group change in prod: delete the whole group now', false],
        ['A GuardDuty finding of any severity: stop every instance', false],
      ], 'Blocking public access on a bucket is reversible and should never break a correct design, so it can run automatically with a notification. Terminating, deleting security groups or stopping instances can cause outages and lose data, so they need a human.'),
      mcq('PaisaPatra\'s NAT gateway data processing costs more than its API instances. Which evidence tells the team what that traffic is?', [
        ['VPC flow logs showing the destinations of NAT traffic', true],
        ['The CPU utilisation of the NAT gateway over the month', false],
        ['The number of private subnets in each Availability Zone', false],
        ['The NAT gateway\'s hourly charge in the Cost Explorer view', false],
      ], 'Flow logs show where the bytes go, for example S3 or ECR, which decides between gateway and interface endpoints. NAT gateways are managed and expose no CPU to tune, subnet counts do not explain bytes, and the hourly charge is separate from data processed.'),
      mcq('Which order of FinOps actions avoids locking in waste?', [
        ['Allocate and clean up first, then size commitments on what remains', true],
        ['Buy Savings Plans first, then tag resources and remove idle ones', false],
        ['Remove idle resources, then stop tagging since the waste is gone', false],
        ['Set budgets only, since alerts alone will reduce the monthly bill', false],
      ], 'Committing after the clean-up sizes Savings Plans on the real baseline. Committing first pays for capacity you then delete, tagging must continue so new waste has an owner, and budgets alert but do not reduce spend by themselves.'),
    ],
  },
];
