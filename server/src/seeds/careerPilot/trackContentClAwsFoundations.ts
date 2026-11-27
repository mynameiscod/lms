/**
 * Career-track content: AWS Foundations — Accounts, IAM and the CLI (CL_AWS_FOUNDATIONS), Cloud & DevOps
 * Engineer, batch CL1.
 *
 * How an engineer starts on AWS: regions and zones, an account that cannot surprise anyone with a bill or a
 * breach, IAM policies and how AWS evaluates them, roles and temporary credentials instead of keys, the CLI and
 * boto3, and the multi-account layout with guardrails and tags a company runs. It builds on Year 2's "What You
 * Are Actually Renting" and "Configuration and Secrets in Production" and Year 3's "The Least Access It Can Work
 * With" and "What It Costs"; those are referred to by title, not re-taught. Azure equivalents get a sentence.
 *
 * One fictional company runs through the topic: PayKosh, a Bengaluru UPI bill-payments start-up moving to AWS
 * Mumbai (ap-south-1) with Hyderabad (ap-south-2) for recovery. Account ids are the documentation placeholder
 * 123456789012; every key and email is fake. Every boto3 output quoted in the notes is real output of the code
 * run against moto 5.2 (mock AWS) with boto3 1.43; JMESPath queries were run with the jmespath library boto3
 * uses. The IAM evaluation results come from a small teaching model of the documented evaluation logic, run in
 * Python and labelled as a model — the IAM policy simulator was not available. AWS CLI commands were written
 * from the CLI documentation and NOT run (no AWS account was used); the notes say so where they appear.
 *
 * Skills: CLOUD_FUNDAMENTALS by default; the IAM_POLICIES and ROLES_FEDERATION lessons are IAM_FUNDAMENTALS.
 * Checkpoint questions elsewhere that are plainly about IAM use ck('IAM_FUNDAMENTALS', ...).
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_CL_AWS_FOUNDATIONS_BUNDLES: PilotBundle[] = [
  /* ── GLOBAL_INFRA ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_FOUNDATIONS_GLOBAL_INFRA',
    notes: `In Year 2's "What You Are Actually Renting" you met the cloud as rented compute, storage and networking. This
topic is about running one particular cloud — AWS — the way an engineer does at work. It starts with the
physical shape of AWS, because almost every design decision later (where a database lives, what survives an
outage, what the bill says) comes back to it.

Through the topic we follow **PayKosh**, a Bengaluru start-up that lets people pay electricity, gas and
broadband bills over UPI. It is moving from a rented server to AWS.

## Regions

A **region** is a separate geographic area with its own set of data centres, for example **ap-south-1
(Mumbai)** and **ap-south-2 (Hyderabad)**. Regions are deliberately isolated from each other: most services
are regional, your resources live in the region you created them in, and an outage in one region is not
supposed to spread to another. Nothing is copied between regions unless you set it up.

That gives three questions for choosing a region:

1. **Latency to users.** PayKosh's users are in India; Mumbai or Hyderabad is a few tens of milliseconds away,
   a US region is a couple of hundred. For a payment confirmation screen that difference is felt.
2. **Data residency and law.** RBI's 2018 direction on payment data expects payment-system data to be stored in
   India, and the DPDP Act 2023 governs personal data. Read the current text with whoever owns compliance
   before deciding; the engineer's job is to make sure data does not quietly end up in another region (a
   backup copy, a log bucket, an analytics export).
3. **Price and service availability.** Prices differ by region, and a new service or instance type may reach
   us-east-1 months before Mumbai. Check the region table and the pricing page; do not assume.

## Availability Zones

Each region contains several **Availability Zones (AZs)** — one or more data centres with independent power,
cooling and networking, a few kilometres to tens of kilometres apart, joined by fast private links. Mumbai and
Hyderabad each have three today (check the AWS global infrastructure page; regions grow). The point of AZs is
that one zone can fail — a power fault, a flood, a bad network change — without the others.

An AZ has two names. The **zone name** (ap-south-1a) is per account: AWS maps the letters to physical zones
differently for different accounts so that everyone choosing "a" does not land in the same building. The
**zone ID** (aps1-az1) is the same physical zone for everyone. When two accounts must agree on a zone — say a
shared database and an app in another account — compare zone IDs, not names. Ask AWS from Python:

    import boto3
    ec2 = boto3.client("ec2", region_name="ap-south-1")
    for az in ec2.describe_availability_zones()["AvailabilityZones"]:
        print(az["ZoneName"], az["ZoneId"], az["State"])

Run against moto (the mock AWS library used throughout this topic), this printed:

    ap-south-1a aps1-az1 available
    ap-south-1b aps1-az3 available
    ap-south-1c aps1-az2 available

Notice "1b" is "az3" here. In your own account the mapping may differ — which is exactly the lesson.

The design rule that follows: **anything that must survive a zone failure runs in at least two AZs.** A
single EC2 instance in ap-south-1a is a single point of failure, however big it is. Load balancers, Auto
Scaling groups and Multi-AZ databases, all coming in this track, exist to spread work across zones.

## Beyond regions: the edge and local zones

- **Edge locations** are many smaller sites, including several Indian cities, used by CloudFront (the CDN),
  Route 53 (DNS) and a few other services to be close to users. You do not run your servers there.
- **Local Zones** put a small set of services (some EC2, EBS) in a metro area attached to a parent region.
  Delhi and Kolkata were among the first in India. Useful for very latency-sensitive work; most apps never
  need them.

## Global, regional and zonal services

Know which kind a service is, because it decides where you look for it and what fails together:

    Scope      Examples                                         What it means for you
    Global     IAM, Organizations, Route 53, CloudFront         one copy for the whole account
    Regional   S3 buckets, Lambda, DynamoDB, SQS, VPC           pick a region; resources live there
    Zonal      EC2 instances, EBS volumes, subnets              pinned to one AZ; plan for two AZs

Two traps catch beginners. S3 bucket **names** are global (nobody else can have "paykosh-statements") but
each **bucket** lives in one region. And the console remembers the last region you used, so "my instance has
disappeared" is very often "the console is showing Ohio".

## What AWS runs for you, and what you still own

The **shared responsibility model** draws the line: AWS secures the cloud itself — buildings, hardware,
the network between zones, the hypervisor and the software behind managed services. You secure what you put
in it — who can log in, how each service is configured, what is exposed, your code and your data. The line
moves with the service: on EC2 you patch the operating system; on RDS AWS patches the database engine, but
whether the database is reachable from the internet is still your setting. Identity, configuration and data
are always yours. (Year 3's "The Least Access It Can Work With" covered the identity half in principle; this
topic makes it concrete.)

## How the services are grouped

The console lists more than two hundred services. A cloud engineer uses a core of perhaps twenty, in families:

- **Compute:** EC2, Auto Scaling, Lambda, ECS/EKS/Fargate for containers.
- **Storage:** S3 (objects), EBS (disks for EC2), EFS (shared files), AWS Backup.
- **Databases:** RDS and Aurora (relational), DynamoDB (key-value), ElastiCache.
- **Networking:** VPC, Route 53, Elastic Load Balancing, CloudFront.
- **Identity and governance:** IAM, IAM Identity Center, Organizations, CloudTrail, Config.
- **Operations:** CloudWatch (metrics, logs, alarms), Systems Manager.

The rest of this track walks through these families in that order. Azure has the same shape with different
names — regions, availability zones, Entra ID for identity — and you will meet it in the Azure topic.`,
    workedExample: `**Scenario.** PayKosh's CTO asks for a one-page region decision before anything is built. Requirements: users are
all in India; payment and customer data must stay in India; the app must survive a data-centre failure; if
Mumbai as a whole is unavailable for hours, the company should be able to restore service somewhere else
in India.

**1. Primary region.** ap-south-1 (Mumbai): in India, closest to most users, and it has the widest service
list of the two Indian regions. Write down the services PayKosh needs (EC2, RDS for PostgreSQL, S3, SQS,
CloudWatch) and confirm each is offered in ap-south-1 on the AWS "services by region" page.

**2. Surviving a data-centre failure.** That is an AZ failure, so the design uses two AZs inside Mumbai:
the app servers in an Auto Scaling group across ap-south-1a and ap-south-1b, a Multi-AZ RDS database, and a
load balancer in both zones. For a shared design with a partner account, the document names zone IDs
(aps1-az1, aps1-az3), not letters.

**3. Surviving a regional event.** ap-south-2 (Hyderabad) is the recovery region: still in India, so
residency holds. Backups and database snapshots are copied there. The CTO must also hear what this does not
buy: a copy in Hyderabad is not a running second site — the recovery time depends on how much is pre-built.
Disaster recovery is covered properly in the databases topic.

**4. Things that silently leave the region.** A short checklist: CloudFront logs and CloudTrail (choose the
bucket region), any third-party SaaS that receives customer data, and analytics exports. Each is either
pointed at ap-south-1/2 or approved in writing.

**5. Cost note.** Prices per region differ, and data transfer between regions is charged. The document says
"estimate with the AWS Pricing Calculator for ap-south-1" and attaches the estimate rather than quoting
numbers from memory.

**Result.** One paragraph a non-engineer can sign: "Mumbai, two zones, Hyderabad holds backups; nothing
customer-related leaves India; estimate attached."`,
    mcqs: [
      mcq('PayKosh\'s single EC2 instance in ap-south-1a went down during a zone-wide power fault. Which change would have kept the app serving?', [
        ['Running instances in two Availability Zones behind a load balancer', true],
        ['Moving the same single instance to a larger instance type in 1a', false],
        ['Copying the instance\'s AMI to us-east-1 once a week as a backup', false],
        ['Putting CloudFront in front of the one instance in ap-south-1a', false],
      ], 'An AZ is the unit that fails together, so surviving its loss needs capacity in a second AZ. A bigger instance in the same zone fails just the same, a weekly AMI in another region is a slow restore rather than continued service, and CloudFront cannot serve dynamic payment requests when its only origin is down.'),
      mcq('Two PayKosh accounts must place resources in the same physical zone. One team says "use ap-south-1b". What should they compare instead?', [
        ['The zone ID, such as aps1-az3, which names the same zone in every account', true],
        ['The zone name, because ap-south-1b is the same building for every account in AWS', false],
        ['The region code, because all zones in a region share one data centre', false],
      ], 'Zone names are mapped per account, so "1b" can be different physical zones in two accounts; zone IDs are consistent. A region has several zones in separate facilities, so the region code alone does not pin a zone.'),
      mcq('Which of these resources is pinned to a single Availability Zone?', [
        ['An EBS volume attached to an EC2 instance', true],
        ['An S3 bucket created in ap-south-1', false],
        ['An IAM role used by the payments service', false],
        ['A Route 53 hosted zone for paykosh.example', false],
      ], 'EBS volumes and EC2 instances are zonal. S3 buckets are regional (stored across zones in the region), IAM is global to the account, and Route 53 is a global service.'),
    ],
    checkpoint: [
      mcq('A PayKosh engineer says the new instance "has vanished" from the console an hour after launching it. What is the most likely cause?', [
        ['The console is showing a different region from the one used', true],
        ['EC2 deletes instances that have been idle for one full hour', false],
        ['The instance moved to another AZ during routine maintenance', false],
        ['IAM hid the instance because the session token had expired', false],
      ], 'The console remembers the last region and shows only that region\'s resources. EC2 does not delete idle instances, instances do not migrate between zones on their own, and an expired session would force a sign-in rather than hide resources.'),
      mcq('PayKosh must keep customer payment data in India. Which choice keeps the primary data and its recovery copies in the country?', [
        ['Primary in ap-south-1, snapshots copied to ap-south-2', true],
        ['Primary in ap-south-1, snapshots copied to ap-southeast-1', false],
        ['Primary in ap-southeast-1, served in India through CloudFront', false],
        ['Primary in us-east-1, since IAM and billing live there anyway', false],
      ], 'Mumbai and Hyderabad are both Indian regions. Singapore (ap-southeast-1) is outside India, CloudFront caching does not change where the data is stored, and IAM being global says nothing about where data must live.'),
      mcq('Under the shared responsibility model, which task stays with PayKosh when it moves its PostgreSQL database from EC2 to Amazon RDS?', [
        ['Deciding whether the database can be reached from the internet', true],
        ['Patching the operating system underneath the database engine', false],
        ['Replacing failed disks in the hosts that run the database', false],
        ['Keeping the hypervisor isolated from other AWS customers', false],
      ], 'With RDS, AWS patches the host OS and engine and runs the hardware and hypervisor. Network exposure and configuration remain the customer\'s in every service model.'),
    ],
  },

  /* ── ACCOUNT_SETUP ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_FOUNDATIONS_ACCOUNT_SETUP',
    notes: `Two things go wrong with a new AWS account, and both make the news in Indian engineering WhatsApp groups every
month: a surprise bill (a GPU instance left running, a NAT gateway nobody knew about) and a breach (an access
key pushed to GitHub, mined for crypto within minutes). This lesson sets up an account so neither can happen
quietly. Do it before you create anything else in the track.

## The root user

Signing up creates the **root user**: the email address and password of the account, with unrestricted power
over everything, including closing the account. No policy you write can limit it inside a standalone account.
Treat it like the key to a bank locker:

- Use a dedicated email (for a company, a group mailbox such as aws-root@paykosh.example, never one person's
  inbox) and a long, unique password from a password manager.
- **Turn on MFA for root immediately** — a passkey or security key is best, an authenticator app is fine. AWS
  now enforces MFA on root for many account types; do it yourself anyway. Register a second device so losing
  one phone does not lock the company out.
- **Never create access keys for root.** If any exist, delete them.
- Then stop using it. Only a handful of tasks need root — changing the account's name, email or root password,
  closing the account, a few billing and support settings, and recovering from a bucket policy that locks out
  everyone. Everything else is done by a normal identity.

## An identity for daily work

The recommended way is **IAM Identity Center** (the next lessons cover it): you sign in through a portal and
receive short-lived credentials for a role. For a personal learning account, a simpler route many people take
first is one IAM user in an "Admins" group with MFA, console access only. Either way, the daily identity has
MFA, and nobody works as root.

Here is the IAM-user route scripted with boto3. Run against moto it printed what is shown; in a real account
you would run it once as root (or click it in the console), then sign out of root for good.

    import boto3
    iam = boto3.client("iam")
    iam.update_account_password_policy(MinimumPasswordLength=14, RequireSymbols=True,
        RequireNumbers=True, RequireUppercaseCharacters=True,
        RequireLowercaseCharacters=True, PasswordReusePrevention=24)
    iam.create_group(GroupName="Admins")
    iam.attach_group_policy(GroupName="Admins",
        PolicyArn="arn:aws:iam::aws:policy/AdministratorAccess")
    iam.create_user(UserName="priya.admin")
    iam.add_user_to_group(GroupName="Admins", UserName="priya.admin")
    mfa = iam.create_virtual_mfa_device(VirtualMFADeviceName="priya.admin")
    print(mfa["VirtualMFADevice"]["SerialNumber"])

    arn:aws:iam::123456789012:mfa/priya.admin

Permissions go on the **group**, not the user, so the next admin is one add_user_to_group call. Pairing the
MFA device (two codes from the app, enable_mfa_device) is done by the person who holds the phone.

One switch only root can flip: by default IAM identities cannot see billing pages. In Account settings, turn
on **IAM user and role access to Billing information** so your admin can read the bill without root.

## Budgets before resources

Set a cost alarm **before** launching anything. Two tools, and use both:

**AWS Budgets** tracks actual and forecast cost against an amount you choose and emails (or notifies via SNS)
at thresholds. A forecast alert is the valuable one: it warns on day five that the month is heading over.

    budgets = boto3.client("budgets", region_name="us-east-1")
    budgets.create_budget(AccountId="123456789012",
        Budget={"BudgetName": "monthly-cap", "BudgetLimit": {"Amount": "5", "Unit": "USD"},
                "TimeUnit": "MONTHLY", "BudgetType": "COST"},
        NotificationsWithSubscribers=[
          {"Notification": {"NotificationType": nt, "ComparisonOperator": "GREATER_THAN",
                            "Threshold": th, "ThresholdType": "PERCENTAGE"},
           "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "priya@example.com"}]}
          for nt, th in [("ACTUAL", 50.0), ("ACTUAL", 100.0), ("FORECASTED", 100.0)]])

Reading it back from moto printed:

    monthly-cap {'Amount': '5', 'Unit': 'USD'} MONTHLY
    [('ACTUAL', 50.0), ('ACTUAL', 100.0), ('FORECASTED', 100.0)]

Pick the amount yourself — the figure here is only an example, and accounts serviced from India may show
amounts in rupees; use the currency your Billing console shows.

A **CloudWatch billing alarm** watches the metric AWS/Billing EstimatedCharges. Two facts trip people up: you
must first enable billing alerts in Billing preferences, and billing metrics exist **only in us-east-1**, so
the alarm must be created there whatever region you work in. The metric updates a few times a day, so neither
tool is instant — they catch a forgotten resource in hours, not seconds.

Budgets alert; they do not stop spending by themselves. Budget actions can apply a restrictive policy when a
threshold is crossed, which some teams use on sandbox accounts.

## The Free Tier, honestly

The Free Tier is a set of allowances, not a promise that nothing costs money. Its shape has changed over the
years — older accounts have 12-month allowances plus "always free" amounts, while accounts opened more
recently get a credit-based free plan for a limited period. Read the Free Tier page for **your** account's
plan and watch the Free Tier usage alerts AWS emails. Common bill surprises for learners: NAT gateways and
load balancers (charged per hour whether used or not), public IPv4 addresses (AWS charges for them, and an
Elastic IP left unattached is pure waste), EBS
snapshots and volumes left after instances are terminated, and anything left running in a second region.

## The habit: build, check, tear down

Every lab in this track ends with a teardown step and a check of the Billing console's charges by service the
next day. Tag what you create (owner, purpose) so the leftovers are easy to find. Enable **Cost Anomaly
Detection** as well; it learns your normal spend and emails when something jumps.

Azure has the same pieces: the subscription owner is the account-level power, Entra ID provides MFA, and
Cost Management budgets play the role of AWS Budgets.`,
    workedExample: `**Scenario.** Rahul, a PayKosh intern, created an AWS account on Friday with his personal Gmail, used the root
user to launch an instance for a demo, and on Monday the CTO asks you to make the account safe before the
team starts using it. Write the order of work and why that order.

**1. Lock root first (minutes).** Change the root email to the group mailbox aws-root@paykosh.example and the
password to a generated one in the company password manager. Enable MFA on root with two devices held by two
people. Check Security credentials: Rahul created a root access key for the CLI — delete it. Everything after
this is done without root.

**2. Make the daily identity.** Enable IAM Identity Center (or, as a stop-gap, the Admins group and an IAM
user per admin, as in the notes). Every human gets MFA. Rahul's CLI moves to temporary credentials (the
CLI lesson shows aws configure sso).

**3. Make the bill visible.** As root, one last time: turn on IAM access to Billing information. Then, as the
admin: a monthly budget with ACTUAL 50 percent, ACTUAL 100 percent and FORECASTED 100 percent alerts to a team
email; billing alerts enabled and an EstimatedCharges alarm created in us-east-1; Cost Anomaly Detection on.

**4. Find what already exists.** Rahul's instance: look in every region he might have used (the Billing
console's charges by region tells you where money is going). Stop or terminate it, then delete the leftover
EBS volume and any Elastic IP. Record what was found.

**5. Write it down.** A short "account README" in the team wiki: who holds the root MFA devices, where the
budget alerts go, the rule "no root, no long-lived keys, everything tagged with owner".

**Why this order.** Root is the only identity that can do unlimited damage, so it is closed first. Budgets
come before cleaning up because the alerts protect you while you work. Cleaning up last means you do it with
the safe identity, not the root user you just locked away.`,
    mcqs: [
      mcq('A new PayKosh engineer wants an access key for the root user so the CLI "has full power". What is the right response?', [
        ['Refuse; root gets no access keys, and the engineer uses an admin role instead', true],
        ['Create the key but store it in the engineer\'s home folder with chmod 600', false],
        ['Create the key and rotate it every 90 days so a leak has a limited window', false],
        ['Create it, since keys for root are restricted by the account\'s IAM policies', false],
      ], 'Root keys carry unrestricted power that no IAM policy in a standalone account can limit, so AWS advises never creating them. File permissions and rotation shrink the risk without removing it, and IAM policies do not restrict the root user.'),
      mcq('PayKosh created a CloudWatch alarm on AWS/Billing EstimatedCharges in ap-south-1, and it never receives data. Why?', [
        ['Billing metrics are published only in us-east-1, so the alarm must be there', true],
        ['EstimatedCharges is only computed for accounts that have been open a full month', false],
        ['Billing alarms need the root user signed in for the metric to be published', false],
      ], 'Billing metrics live in us-east-1 regardless of where resources run (after billing alerts are enabled in preferences). The metric does not wait a month, and it does not depend on who is signed in.'),
      mcq('Which alert would have warned PayKosh earliest that a forgotten GPU instance was going to blow the month\'s budget?', [
        ['A Budgets alert on FORECASTED cost passing 100 percent', true],
        ['A Budgets alert on ACTUAL cost passing 100 percent', false],
        ['The monthly invoice email sent at the start of next month', false],
        ['A CloudWatch alarm on the instance\'s CPU passing 80 percent', false],
      ], 'A forecast alert fires as soon as the projected month-end cost crosses the limit, days before actual cost does. The invoice arrives after the money is spent, and CPU utilisation says nothing about cost.'),
    ],
    checkpoint: [
      mcq('In PayKosh\'s new account, the admin IAM user gets "access denied" on every Billing page despite AdministratorAccess. What fixes it?', [
        ['Root enables IAM user and role access to Billing in Account settings', true],
        ['Attach a second copy of AdministratorAccess directly to the user', false],
        ['Sign in to the console in us-east-1, where billing pages are kept', false],
        ['Add the admin user to the root user\'s MFA device as a second user', false],
      ], 'Until root activates IAM access to billing information, IAM identities are blocked from billing pages whatever their policies say. A duplicate policy changes nothing, the console region is not the issue, and MFA devices are not shared between identities.'),
      mcq('Which of these is a task that still needs the root user in a standalone account?', [
        ['Closing the account', true],
        ['Launching an EC2 instance', false],
        ['Creating an IAM role for CI', false],
        ['Creating an AWS Budget alert', false],
      ], 'Closing the account is one of the few root-only tasks. Launching instances, creating roles and creating budgets can all be done by an IAM identity with the right permissions, which is why daily work never uses root.'),
      mcq('A student finishes a lab, terminates the EC2 instance, and is still charged the next week. Which leftover is the most likely cause?', [
        ['An unattached EBS volume or Elastic IP that was not released', true],
        ['The IAM role the lab created, which bills per hour of existence', false],
        ['The AMI ID that was used, which charges while it is remembered', false],
        ['The budget alert itself, which costs more than the lab did', false],
      ], 'Volumes not set to delete on termination, snapshots and unattached Elastic IPs keep charging. IAM roles are free, using a public AMI does not create a charge on its own, and a budget alert is not what runs up a bill.'),
    ],
  },

  /* ── IAM_POLICIES ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_FOUNDATIONS_IAM_POLICIES',
    notes: `Every AWS API call — a console click, a CLI command, a boto3 call, a Lambda reading a bucket — is a request
from a **principal** to perform an **action** on a **resource**, and IAM decides allow or deny. A cloud engineer
must be able to read any policy and say exactly what it permits. Year 3's "The Least Access It Can Work With"
gave you the principle; this lesson is the mechanics.

## Identities

- **IAM user** — a long-term identity with a password and/or access keys. Today, mostly for the odd system
  that cannot use anything else.
- **IAM group** — a set of users that share policies. Not a principal itself: you cannot sign in as a group.
- **IAM role** — an identity with no long-term credentials. Something trusted **assumes** it and gets
  temporary credentials. People (through IAM Identity Center), EC2 instances, Lambda functions and CI pipelines
  should all use roles; the next lesson is about them.

## Policy types

    Type                         Attached to          Grants?   Used for
    Identity-based (managed)     user, group, role    yes       normal permissions; reusable
    Identity-based (inline)      one user/group/role  yes       a one-off tied to one identity
    Resource-based               S3 bucket, SQS, KMS  yes       who else may use this resource
    Permissions boundary         user or role         no, caps  the most an identity can ever get
    SCP / RCP (Organizations)    account or OU        no, caps  guardrails for whole accounts
    Session policy               one role session     no, caps  narrowing one assumed session

**AWS managed** policies (AdministratorAccess, ReadOnlyAccess, AmazonS3ReadOnlyAccess) are written and updated
by AWS — convenient, usually broader than you need. **Customer managed** policies are yours, versioned and
reusable — the normal choice for production. **Inline** policies live inside one identity and die with it.

## Anatomy of a policy

    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Sid": "ReadStatements",
          "Effect": "Allow",
          "Action": ["s3:GetObject", "s3:ListBucket"],
          "Resource": ["arn:aws:s3:::paykosh-statements",
                       "arn:aws:s3:::paykosh-statements/*"]
        }
      ]
    }

- **Version** is always "2012-10-17" (it is the policy language version, not a date you change). Leave it out
  and policy variables stop working.
- **Effect** is Allow or Deny. **Action** is service:operation; wildcards work ("s3:Get*"), and action names
  are case-insensitive.
- **Resource** is an ARN: arn:partition:service:region:account:resource. S3 ARNs have no region or account
  (buckets are globally named); IAM ARNs have no region (IAM is global). Resource matching is case-sensitive.
- Note the two resources. **s3:ListBucket acts on the bucket** ARN; **s3:GetObject acts on objects**
  (bucket/*). Granting ListBucket on "bucket/*" is the single most common S3 policy bug.
- **Condition** narrows a statement: "StringEquals": {"aws:RequestedRegion": "ap-south-1"}, "Bool":
  {"aws:SecureTransport": "true"}, "IpAddress": {"aws:SourceIp": "203.0.113.0/24"}.
- **Principal** appears only in resource-based and trust policies — who the policy is about. In an identity
  policy the principal is whoever the policy is attached to.
- **NotAction / NotResource** mean "everything except". With Deny they make tidy guardrails; with Allow they
  grant every future service too, so avoid them there.

A policy variable such as \${aws:username} lets one group policy give each user their own folder:
"Resource": "arn:aws:s3:::paykosh-home/\${aws:username}/*".

## How AWS evaluates a request

For a request inside one account, the documented logic reduces to:

1. **Start at deny.** Nothing is allowed unless something allows it (implicit deny).
2. **Any explicit Deny that applies, in any policy, wins.** Nothing overrides it.
3. **Guardrails must allow:** if the account is in an Organization, the SCPs on every level must allow the
   action; if the identity has a permissions boundary, the boundary must allow it; a session policy must
   allow it.
4. **Something must grant it:** an identity-based policy or a resource-based policy allows it.

Cross-account adds one rule: the caller's own identity policy **and** the resource's policy in the other
account must both allow it.

To make this concrete, the lesson's scratch code contains a small Python model of steps 1–4 (wildcards,
case-insensitive actions, a few condition operators). It is a teaching model, not AWS's engine — the real one
handles far more — but every result below agrees with the documented logic. "reader" is the policy above;
"admin" is Allow * on *:

    1 reader GetObject               -> ALLOW
    2 reader PutObject               -> DENY (implicit: nothing allowed it)
    3 reader GetObject, payroll      -> DENY (implicit: nothing allowed it)
    4 admin delete, console no MFA   -> DENY (explicit)
    5 admin delete, with MFA         -> ALLOW
    6 admin + boundary, ec2          -> DENY (outside permissions boundary)
    7 admin + boundary, s3           -> ALLOW
    8 action in odd case             -> ALLOW
    9 ListBucket on object ARN       -> DENY (implicit: nothing allowed it)
   10 admin under SCP s3+logs        -> DENY (not allowed by SCP)
   11 no identity policy, SCP *      -> DENY (implicit: nothing allowed it)

Read them as rules. Case 4 is a Deny on s3:Delete* when MFA is absent, beating admin's Allow. Cases 6 and 10
show that an admin policy is not the whole story — a boundary or SCP that does not allow ec2 caps it.
Case 11 is the one people get wrong in interviews: **an SCP never grants anything**. FullAWSAccess at the
organisation level with no identity policy still means denied.

## Writing least-privilege policies in practice

- Start from the actions the code actually calls. IAM Access Analyzer can **generate a policy from CloudTrail
  activity** and **validate** a policy (it flags things like PassRole on "*" and NotAction with Allow).
- Scope Resource to ARNs, not "*", wherever the service supports resource-level permissions (the Service
  Authorization Reference lists, per action, which resources and condition keys apply).
- Prefer a Deny guardrail for things that must never happen (deleting backups, disabling CloudTrail).
- Watch **iam:PassRole**: permission to hand a role to a service. "PassRole on *" lets someone launch an
  instance with the most powerful role in the account — an escalation path.
- Use groups and customer managed policies for people, one role per workload.

Azure does the same job with role-based access control: role definitions (actions) assigned to principals at
a scope (management group, subscription, resource group, resource).`,
    workedExample: `**Scenario.** PayKosh's statements service writes monthly PDFs to the bucket paykosh-statements under
statements/<customer-id>/. A support tool must let agents list and download statements, never write or
delete them, and only over HTTPS. Write the policy and check it against five requests.

**1. Draft.**

    {
      "Version": "2012-10-17",
      "Statement": [
        { "Sid": "ListStatementsPrefix", "Effect": "Allow", "Action": "s3:ListBucket",
          "Resource": "arn:aws:s3:::paykosh-statements",
          "Condition": { "StringLike": { "s3:prefix": ["statements/*"] } } },
        { "Sid": "ReadStatements", "Effect": "Allow", "Action": "s3:GetObject",
          "Resource": "arn:aws:s3:::paykosh-statements/statements/*" },
        { "Sid": "HttpsOnly", "Effect": "Deny", "Action": "s3:*", "Resource": "*",
          "Condition": { "Bool": { "aws:SecureTransport": "false" } } }
      ]
    }

**2. Check it by the evaluation steps.**

- GetObject statements/C1029/2026-10.pdf over HTTPS: no Deny applies (SecureTransport is true); ReadStatements
  allows. **Allowed.**
- ListBucket with prefix statements/: ListStatementsPrefix allows (bucket ARN, prefix matches). **Allowed.**
- ListBucket with no prefix (listing the whole bucket): the StringLike condition is not met, nothing else
  allows. **Implicit deny** — good, agents cannot see other prefixes.
- PutObject statements/C1029/fake.pdf: nothing allows it. **Implicit deny.**
- GetObject over plain HTTP: HttpsOnly applies. **Explicit deny**, whatever else says.

**3. Review it like a senior.** The Resource on the Deny is "*" on purpose — it is a guardrail. The Allow
statements are scoped to one bucket and one prefix. A reviewer may ask for one more thing: put the HTTPS rule in
the **bucket policy** too, so it applies to every principal, not just this tool. Run the draft through IAM
Access Analyzer's policy validation before merging.`,
    mcqs: [
      mcq('A PayKosh policy allows s3:ListBucket on "arn:aws:s3:::paykosh-statements/*". Listing the bucket fails with AccessDenied. Why?', [
        ['ListBucket acts on the bucket ARN, so it needs arn:aws:s3:::paykosh-statements', true],
        ['ListBucket also needs s3:GetObject granted on the same resource before it is allowed', false],
        ['The policy Version is missing, so every S3 action in the policy is ignored', false],
        ['ListBucket can only be granted by a bucket policy, never by an IAM policy', false],
      ], 'ListBucket is a bucket-level action; a resource of bucket/* matches objects, never the bucket, so nothing allows the request. ListBucket does not depend on GetObject, a missing Version disables policy variables rather than all actions, and identity policies can grant ListBucket.'),
      mcq('An engineer has AdministratorAccess and a permissions boundary that allows only s3:* and logs:*. What can they do with EC2?', [
        ['Nothing; the boundary caps them, so EC2 calls are implicitly denied', true],
        ['Everything; AdministratorAccess overrides any boundary set on the user', false],
        ['Read-only EC2 calls, since boundaries only restrict write actions', false],
        ['Everything, but only after re-authenticating with an MFA code', false],
      ], 'Effective permissions are the overlap of the identity policy and the boundary; EC2 is not in the boundary, so it is denied. Boundaries are not overridden by admin policies, they do not distinguish reads from writes, and MFA does not lift them.'),
      mcq('Why is "Effect": "Allow" with "NotAction": "iam:*" on "*" a poor way to give developers "everything except IAM"?', [
        ['It also grants every action of every service AWS adds in future', true],
        ['NotAction is invalid syntax inside identity-based policy documents', false],
        ['It still lets developers call iam:CreateUser through the console', false],
        ['NotAction statements only take effect when an SCP also allows them', false],
      ], 'Allow with NotAction grants everything not listed, including services that do not exist yet, which nobody reviewed. NotAction is valid, it does exclude IAM actions from the grant, and it does not depend on an SCP.'),
    ],
    checkpoint: [
      mcq('A PayKosh developer\'s policies: one Allows s3:* on the statements bucket; another Denies s3:DeleteObject on "*". They call DeleteObject on that bucket. Result?', [
        ['Denied, because an explicit Deny wins over any Allow', true],
        ['Allowed, because the more specific resource ARN wins', false],
        ['Allowed, because s3:* was attached to the user first', false],
        ['Denied only if the bucket also has a bucket policy', false],
      ], 'An applicable explicit Deny in any policy overrides every Allow. Specificity and attachment order play no part in IAM evaluation, and the Deny needs no bucket policy to take effect.'),
      mcq('PayKosh\'s Organization root has only the FullAWSAccess SCP. A new role in a member account has no policies attached. Can it read a bucket in its own account whose bucket policy says nothing about it?', [
        ['No; SCPs never grant, so with no identity or resource grant it is denied', true],
        ['Yes; FullAWSAccess grants every action to every principal in the account', false],
        ['Yes, but only for read actions such as s3:GetObject and s3:ListBucket', false],
        ['No, because FullAWSAccess must be removed before any role can work', false],
      ], 'SCPs set the maximum available; an identity or resource policy must still allow the call. FullAWSAccess grants nothing on its own, SCPs do not distinguish reads, and FullAWSAccess is what lets identity policies work at all.'),
      mcq('Which policy element would you add so a support tool can read statements only when the request arrives over HTTPS?', [
        ['A Deny with Condition Bool aws:SecureTransport false', true],
        ['A Principal block naming the support tool\'s role ARN', false],
        ['A Resource of arn:aws:s3:::paykosh-statements/https/*', false],
        ['A Version of "2012-10-17" written at statement level', false],
      ], 'aws:SecureTransport reports whether the request used TLS, and a Deny when it is false blocks plain HTTP. Principal is not used in identity policies, an "https" prefix is just a folder name, and Version belongs at the top of the document and controls the language version.'),
    ],
  },

  /* ── ROLES_FEDERATION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_FOUNDATIONS_ROLES_FEDERATION',
    notes: `Year 2's "Configuration and Secrets in Production" taught you never to put a secret in code. The best secret is
one that does not exist: no long-lived access key to leak, rotate or forget. On AWS that means **roles**.
Leaked IAM user keys remain one of the commonest ways AWS accounts are breached; a role's credentials expire
on their own.

## What a role is

A role has two policies:

- a **trust policy** — who may assume it (a principal: an AWS account, a service, a federated identity
  provider), with optional conditions;
- a **permissions policy** — what the role may do once assumed, evaluated like any identity policy.

Assuming a role calls **AWS STS** (Security Token Service), which returns a temporary access key id, secret
key and **session token**, with an expiry. By default a session lasts one hour; a role can allow up to 12
hours. Run against moto:

    import boto3, json
    trust = {"Version": "2012-10-17", "Statement": [{
        "Effect": "Allow",
        "Principal": {"AWS": "arn:aws:iam::123456789012:root"},
        "Action": "sts:AssumeRole",
        "Condition": {"Bool": {"aws:MultiFactorAuthPresent": "true"}}}]}
    iam = boto3.client("iam")
    role = iam.create_role(RoleName="ReadOnlyAuditor",
        AssumeRolePolicyDocument=json.dumps(trust))["Role"]
    resp = boto3.client("sts").assume_role(RoleArn=role["Arn"],
        RoleSessionName="priya-audit", DurationSeconds=900)
    c = resp["Credentials"]
    print(sorted(c.keys()))
    print("AccessKeyId starts with:", c["AccessKeyId"][:4])
    print("AssumedRoleUser:", resp["AssumedRoleUser"]["Arn"])

    ['AccessKeyId', 'Expiration', 'SecretAccessKey', 'SessionToken']
    AccessKeyId starts with: ASIA
    AssumedRoleUser: arn:aws:sts::123456789012:assumed-role/ReadOnlyAuditor/priya-audit

Three things to notice. Temporary keys start with **ASIA**; long-term user keys start with **AKIA** — useful
when you find a key in a log. The session **name** (priya-audit) appears in the assumed-role ARN and in every
CloudTrail record, so choose names that say who and why. And the trust policy's "arn:aws:iam::123456789012:root"
means "this account, as allowed by its own IAM policies" — not the root user. (moto does not enforce trust
conditions such as the MFA one; real STS does.)

## Roles for workloads

- **EC2: instance profiles.** A role is wrapped in an instance profile and attached to the instance. The SDK
  fetches credentials from the instance metadata service and refreshes them before expiry; your code just
  calls boto3.client("s3"). Require **IMDSv2** (session-token metadata) on every instance.
- **Lambda:** an execution role. **ECS:** a task role per task definition. **EKS:** IAM roles for service
  accounts or EKS Pod Identity — one role per pod's service account, not one per node.
- The trust policy names the service, e.g. "Principal": {"Service": "ec2.amazonaws.com"}.

Whoever attaches a role to a resource needs **iam:PassRole** for that role — scope it to the specific role
ARNs, never "*".

## Cross-account access

PayKosh will run several accounts (the last lesson of this topic). An engineer in the tooling account
reaches production by assuming a role there:

- The production role's **trust policy** names the tooling account (or a specific role in it).
- The engineer's identity policy in the tooling account must allow sts:AssumeRole on that role ARN.

Both sides must say yes — the cross-account rule from the last lesson. For a **third party** (a monitoring
vendor), add an **ExternalId** condition to the trust policy: a value the vendor stores per customer, which
stops another vendor customer from tricking the vendor into using your role (the "confused deputy" problem).

## People: IAM Identity Center

For humans, **IAM Identity Center** (formerly AWS SSO) is the recommended front door. Users come from its
own directory or from the company's identity provider (Entra ID, Okta, Google Workspace). An admin defines
**permission sets** ("ReadOnly", "PaymentsDeveloper") and assigns them to groups per account; Identity Center
creates matching roles in each account. Users sign in once through the access portal, pick account and role,
and get temporary credentials for the console or the CLI (aws configure sso, next lesson). Offboarding is one
change in the identity provider — no hunting for IAM users across accounts.

## Pipelines: OIDC federation

A GitHub Actions workflow that deploys to AWS should not hold an access key in its secrets. Instead, register
GitHub's OIDC provider (token.actions.githubusercontent.com) in IAM and create a role that trusts it, with
conditions on the token:

    "Condition": {
      "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
      "StringLike":   { "token.actions.githubusercontent.com:sub": "repo:paykosh/billpay-api:ref:refs/heads/main" }
    }

The workflow exchanges its short-lived OIDC token for role credentials (sts:AssumeRoleWithWebIdentity). The
**sub** condition is the security: without it, any repository on GitHub could assume the role. GitLab, Azure
DevOps and Kubernetes service accounts federate the same way.

## When a long-lived key is the last resort

Some on-premises systems cannot use roles (though IAM Roles Anywhere covers many with certificates). If a key
is unavoidable: one per system, least privilege, a condition on aws:SourceIp, stored in a secret manager,
rotated, and watched — IAM's credential report and last-used data show stale keys. Azure's equivalent of all
this is **managed identities** for workloads and **workload identity federation** for pipelines.`,
    workedExample: `**Scenario.** PayKosh's GitHub Actions pipeline deploys the billpay-api to the production account using an IAM
user key stored as a repository secret. An auditor flags it. Replace it with OIDC federation and state exactly
what each side trusts.

**1. In the production account (123456789012).** Add the OIDC identity provider for
token.actions.githubusercontent.com with audience sts.amazonaws.com. Create the role GitHubDeployBillpay with
this trust policy:

    {
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Principal": { "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com" },
        "Action": "sts:AssumeRoleWithWebIdentity",
        "Condition": {
          "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
          "StringLike": { "token.actions.githubusercontent.com:sub": "repo:paykosh/billpay-api:environment:production" }
        }
      }]
    }

The sub is pinned to the GitHub **environment** "production", which itself requires a reviewer's approval in
GitHub — so only an approved run of this one repository can assume the role.

**2. Its permissions policy.** Only what the deploy does: push to one ECR repository, update one ECS service,
and iam:PassRole on exactly the task role ARN the service uses.

**3. In the workflow.** Grant the job "permissions: id-token: write", then use the official
aws-actions/configure-aws-credentials action with role-to-assume set to the role ARN and aws-region ap-south-1.
No secret is stored anywhere.

**4. Remove the old path.** Deactivate the IAM user's key, watch for failures for a week, then delete the key
and the user. CloudTrail now shows deploys as assumed-role/GitHubDeployBillpay/<session>.

**What was not run.** The policy JSON was checked as valid JSON; the GitHub-side setup was written from
GitHub's and AWS's documentation and needs a real repository and account to test.`,
    mcqs: [
      mcq('An access key found in an application log starts with ASIA. What does that tell the PayKosh on-call engineer?', [
        ['It is a temporary STS credential that expires, from an assumed role', true],
        ['It is a long-term IAM user key that will work until someone deletes it', false],
        ['It is the root user\'s access key, which always starts with that prefix', false],
        ['It is an Asia Pacific region key that only works in ap-south-1', false],
      ], 'ASIA marks temporary credentials from STS; long-term IAM user keys start with AKIA. Neither prefix identifies root or a region — keys are not tied to regions.'),
      mcq('A monitoring vendor will assume a role in PayKosh\'s account. Which trust-policy condition protects against the confused-deputy problem?', [
        ['sts:ExternalId equal to the value the vendor issued for PayKosh', true],
        ['aws:SecureTransport set to true so that the call must use HTTPS', false],
        ['aws:RequestedRegion equal to ap-south-1 for every assume call', false],
      ], 'The external id ties the vendor\'s use of the role to PayKosh\'s configuration in the vendor\'s system, so another customer cannot point the vendor at PayKosh\'s role. HTTPS and region conditions do not say on whose behalf the vendor is acting.'),
      mcq('A GitHub OIDC role trusts token.actions.githubusercontent.com with an aud condition but no sub condition. What is the risk?', [
        ['A workflow in any GitHub repository could assume the role', true],
        ['The role can be assumed only from the default branch of a repo', false],
        ['Tokens never expire, so a leaked one works for ever after', false],
        ['Nothing, since aud alone already pins the PayKosh repository', false],
      ], 'Every GitHub OIDC token has the same audience; the sub claim carries the repository and ref, so without it any repository can assume the role. Missing sub does not restrict branches, OIDC tokens are short-lived, and aud does not identify a repository.'),
    ],
    checkpoint: [
      mcq('An EC2 instance at PayKosh must read one S3 bucket. What is the right way to give it credentials?', [
        ['Attach an instance profile whose role allows reads of that bucket', true],
        ['Save an IAM user\'s access key in the AMI so every launch has it', false],
        ['Pass an IAM user\'s access key to the instance in its user data', false],
        ['Give the instance a public IP so S3 trusts its source address', false],
      ], 'An instance profile delivers short-lived role credentials through instance metadata and refreshes them automatically. Keys in an AMI or user data are long-lived and readable by anyone with access to them, and a public IP does not authenticate anything.'),
      mcq('PayKosh engineers in the tooling account must assume a role in production. The production role trusts the tooling account. What else is required?', [
        ['An identity policy in tooling that allows sts:AssumeRole on that role', true],
        ['A copy of each engineer\'s IAM user created inside the production account', false],
        ['A bucket policy in production that names each engineer individually', false],
        ['Nothing else, because the trust policy alone completes the cross-account path', false],
      ], 'Cross-account access needs both sides: the trust policy in production and an allow for sts:AssumeRole in the caller\'s account. Duplicate users defeat the purpose of roles, a bucket policy is unrelated to assuming roles, and a trust policy alone is only half of the decision.'),
      mcq('Why does IAM Identity Center make offboarding a leaving PayKosh engineer simpler than IAM users in each account?', [
        ['Disabling them in the identity provider removes access to every account', true],
        ['Identity Center deletes CloudTrail records of former employees automatically', false],
        ['Permission sets expire after 90 days, so leavers drop out on their own', false],
        ['Identity Center users cannot use the CLI, so no keys need to be revoked', false],
      ], 'Access flows from one directory to roles in every account, so one change removes it everywhere. Identity Center does not delete audit logs, permission sets do not expire on a schedule, and its users can use the CLI with temporary credentials.'),
    ],
  },

  /* ── CLI_SDK ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_FOUNDATIONS_CLI_SDK',
    notes: `The console is for looking; the CLI and SDK are for doing things twice the same way. A cloud engineer answers
"how many untagged instances do we have in Mumbai?" with one command, and turns a weekly chore into a Python
script. This lesson covers both, with the credential setup that keeps them safe. (The CLI commands below were
written from the AWS CLI v2 documentation and not run here — there was no AWS account. The boto3 code was run
against moto and its real output is shown.)

## Configuration and profiles

The CLI and boto3 read the same two files in your home folder:

    ~/.aws/config                         ~/.aws/credentials
    [default]                             [default]
    region = ap-south-1                   aws_access_key_id = AKIAEXAMPLEFAKE00000
    output = json                         aws_secret_access_key = (fake)

    [profile paykosh-dev]
    sso_session = paykosh
    sso_account_id = 123456789012
    sso_role_name = PaymentsDeveloper
    region = ap-south-1

    [sso-session paykosh]
    sso_start_url = https://paykosh.awsapps.com/start
    sso_region = ap-south-1

The modern setup has **no credentials file at all**: aws configure sso writes the profile above, aws sso login
--profile paykosh-dev opens the browser, and the CLI caches short-lived role credentials. A profile can also
assume a role from another profile (role_arn plus source_profile). Choose a profile per command with --profile,
or for a whole shell with the AWS_PROFILE environment variable.

The first command in any session, and the first line of any debugging:

    aws sts get-caller-identity --profile paykosh-dev

It prints the account and the ARN you are acting as. Half of all "access denied" puzzles end here: wrong
profile, wrong account.

## Where credentials come from (the chain)

When code does not pass credentials explicitly, boto3 and the CLI search in order: explicit parameters,
**environment variables** (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN, AWS_PROFILE), the
**shared config and credentials files** (including SSO and assume-role profiles), **container credentials**
(ECS task roles) and finally the **EC2 instance metadata** (instance profile). The first match wins. That is
why the same script runs on a laptop with a profile and on EC2 with a role, without changes — and also why a
stale AWS_ACCESS_KEY_ID exported in your .bashrc silently overrides the SSO profile you thought you were using.

Region resolves the same way: --region, then AWS_REGION/AWS_DEFAULT_REGION, then the profile. The moto run
read profiles from a test config file:

    profiles: ['default', 'paykosh-dev', 'paykosh-hyd']
    default region: ap-south-1 | hyd profile region: ap-south-2

## Output, query and filters

- --output json (default), table (for humans), text (for shell loops), yaml.
- --query takes a **JMESPath** expression and filters the JSON **on your machine**.
- --filters (on EC2 and others) filters **on the server** — less data returned. Use filters to select, query
  to shape.

    aws ec2 describe-instances --filters Name=tag:env,Values=dev \\
      --query "Reservations[].Instances[].[InstanceId, InstanceType, State.Name]" --output table

The same JMESPath expressions work in boto3 through the jmespath library. Run over moto's describe_instances
output for two tagged t3.micro instances (ids shortened):

    Reservations[].Instances[].[InstanceId, InstanceType, State.Name]
      => [["i-...", "t3.micro", "running"], ["i-...", "t3.micro", "running"]]
    Reservations[].Instances[].Tags[?Key=='team'].Value[]  => ["payments", "payments"]
    length(Reservations[].Instances[])                    => 2

Note the [] after Reservations — instances are nested one level inside reservations; forgetting the flatten is
the usual reason a query returns nulls.

## boto3: clients, pagination, waiters, errors

**Pagination.** List calls return one page at a time. Ask for a page of 50 and you get 50 and a flag:

    s3 = boto3.client("s3", region_name="ap-south-1")
    one = s3.list_objects_v2(Bucket="paykosh-statements-dev", MaxKeys=50)
    print("one call:", one["KeyCount"], "keys, IsTruncated =", one["IsTruncated"])
    pages = s3.get_paginator("list_objects_v2").paginate(
        Bucket="paykosh-statements-dev", PaginationConfig={"PageSize": 50})
    print("paginator pages:", [p["KeyCount"] for p in pages])

    one call: 50 keys, IsTruncated = True
    paginator pages: [50, 50, 20]

With 120 objects, a script that calls list_objects_v2 once silently processes 50. Always use the paginator
for list and describe calls; paginate(...).search("Contents[].Key") yields keys across all pages. The CLI
paginates for you (use --max-items and --page-size to control it).

**Waiters** poll until a resource reaches a state, so you do not write sleep loops:

    ec2.get_waiter("instance_running").wait(InstanceIds=ids)
    ec2.terminate_instances(InstanceIds=ids)
    ec2.get_waiter("instance_terminated").wait(InstanceIds=ids)

The moto run printed ['terminated', 'terminated'] afterwards — a script that creates something must tear it
down too.

**Errors.** Service errors arrive as botocore.exceptions.ClientError; branch on the code, not the message:

    try:
        s3.head_object(Bucket="paykosh-statements-dev", Key="2026/11/missing.pdf")
    except ClientError as e:
        print(e.response["Error"]["Code"], e.response["ResponseMetadata"]["HTTPStatusCode"])

    404 404

HEAD responses have no body, so a missing object gives code "404", not "NoSuchKey" (which get_object gives).
Creating a bucket you already own in ap-south-1 gave BucketAlreadyOwnedByYou.

**Retries.** Throttling (ThrottlingException, SlowDown) is normal at scale. Configure the SDK's retry mode
rather than writing your own: Config(retries={"mode": "standard", "max_attempts": 5}) — or "adaptive", which
also slows the client down.

**Clients versus resources.** boto3 also has a higher-level "resource" interface; AWS has said it will not
add new features to it. New code uses clients.

## Testing scripts without a bill

moto (from moto import mock_aws) fakes AWS in memory for unit tests, as used throughout this topic; LocalStack
runs a fake AWS as a local server for integration tests. Neither is AWS — always run a final check in a
sandbox account — but they catch most logic bugs for free. Azure's equivalents are the az CLI with
--query (also JMESPath) and the azure-identity and azure-mgmt-* Python packages.`,
    workedExample: `**Scenario.** Every Monday a PayKosh engineer clicks through the console to find running EC2 instances in
ap-south-1 with no "owner" tag and posts them to Slack. Write the script.

**1. Shape.** Use the paginator (there may be hundreds of instances), filter on the server for running
instances, check tags on the client.

    import boto3

    REQUIRED = "owner"

    def untagged_instances(region="ap-south-1"):
        ec2 = boto3.client("ec2", region_name=region)
        pages = ec2.get_paginator("describe_instances").paginate(
            Filters=[{"Name": "instance-state-name", "Values": ["running"]}])
        out = []
        for page in pages:
            for res in page["Reservations"]:
                for inst in res["Instances"]:
                    keys = {t["Key"] for t in inst.get("Tags", [])}
                    if REQUIRED not in keys:
                        out.append((inst["InstanceId"], inst["InstanceType"]))
        return out

    if __name__ == "__main__":
        for iid, itype in untagged_instances():
            print(iid, itype)

**2. Points a reviewer looks for.** inst.get("Tags", []) — an instance with no tags has no Tags key at all, so
inst["Tags"] would crash on exactly the instances you are hunting. The region is a parameter, so the same code
loops over ap-south-1 and ap-south-2. No credentials appear in the code; on a laptop it uses the SSO profile
(AWS_PROFILE=paykosh-dev), on a scheduled Lambda it uses the execution role.

**3. Its permissions.** The role that runs it needs only ec2:DescribeInstances (which does not support
resource-level scoping, so Resource is "*"). Read-only, so a bug cannot break anything.

**4. Test it.** In a unit test, wrap it in mock_aws(), launch one tagged and one untagged instance, and
assert the function returns only the untagged one. Run that way with one tagged t3.micro and two untagged
t3.small instances, it returned exactly the two t3.small ones, and the JMESPath query below matched it. The same approach printed the tag report in the last
lesson of this topic.

**5. The CLI one-liner, for comparison** (written from the docs, not run):

    aws ec2 describe-instances --region ap-south-1 \\
      --filters Name=instance-state-name,Values=running \\
      --query "Reservations[].Instances[?!not_null(Tags[?Key=='owner'] | [0])].InstanceId[]" --output text

Readable? Barely. Past one line of logic, write Python.`,
    mcqs: [
      mcq('A PayKosh script calls s3.list_objects_v2 once and reports 1,000 statements, but the bucket holds 4,300. What is the fix?', [
        ['Use the list_objects_v2 paginator and iterate over every page', true],
        ['Raise MaxKeys to 5,000 so the single call returns every object', false],
        ['Switch the bucket to a storage class that lists faster per call', false],
        ['Retry the same call with adaptive retry mode switched on in Config', false],
      ], 'List calls return at most one page (S3 caps a page at 1,000 keys) and set IsTruncated; the paginator follows the continuation tokens. MaxKeys above the cap still returns one page, storage class does not affect listing, and retries repeat the same first page.'),
      mcq('A developer\'s CLI keeps acting as an old IAM user even though AWS_PROFILE points to the SSO profile. What is the likely cause?', [
        ['AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are still exported in the shell', true],
        ['The SSO profile is missing the line output = json under its section', false],
        ['The CLI always prefers the [default] profile over any named profile', false],
        ['SSO sessions last only one minute, so the CLI falls back to a user', false],
      ], 'Explicit key environment variables come before the shared config in the credential chain, so they win over AWS_PROFILE. Output format does not affect credentials, a named profile selected by AWS_PROFILE is used instead of default, and SSO sessions last hours.'),
      mcq('What is the difference between the CLI\'s --filters and --query on aws ec2 describe-instances?', [
        ['--filters selects on the server; --query reshapes the JSON on your machine', true],
        ['--query is evaluated by EC2 on the server; --filters runs locally afterwards', false],
        ['They are aliases, and the CLI documentation recommends either one equally', false],
      ], '--filters is sent to the API so less data comes back; --query applies JMESPath to the response locally. They are not aliases and do different jobs: select with filters, shape with query.'),
    ],
    checkpoint: [
      mcq('Before investigating an AccessDenied error in a PayKosh deploy script, which command shows which identity the script is really using?', [
        ['aws sts get-caller-identity with the same profile and environment', true],
        ['aws iam list-users, to see every user that exists in the account', false],
        ['aws configure list-profiles, to print the names of all profiles', false],
        ['aws ec2 describe-regions, to confirm the regions are all enabled', false],
      ], 'get-caller-identity returns the account and ARN of the credentials actually in use, which is the first fact you need. Listing users or profiles does not say which one is active, and the regions list is unrelated to identity.'),
      mcq('A boto3 script must work on a laptop with an SSO profile and unchanged on EC2 with an instance profile. How should it get credentials?', [
        ['Create clients with no keys and let the default credential chain find them', true],
        ['Read keys from a config.ini committed in the same repository as the script', false],
        ['Hard-code the SSO profile name in boto3.Session(profile_name=...) always', false],
        ['Ask the user to paste an access key at startup and keep it in a variable', false],
      ], 'The default chain picks up the profile on the laptop and the instance metadata role on EC2. Committed keys leak, a hard-coded profile does not exist on EC2, and pasted keys are long-lived secrets handled by hand.'),
      mcq('A PayKosh script catches ClientError from s3.head_object and checks for the code "NoSuchKey", yet missing objects are never detected. Why?', [
        ['HEAD responses have no body, so the error code comes back as "404"', true],
        ['head_object never raises an error and returns None for missing keys', false],
        ['NoSuchKey is only raised for buckets in the us-east-1 region of S3', false],
      ], 'Because a HEAD response has no body, botocore sets the code from the status: "404". get_object returns NoSuchKey. head_object does raise ClientError, and the code does not depend on the region.'),
    ],
  },

  /* ── ORGANIZATIONS_TAGGING ───────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_FOUNDATIONS_ORGANIZATIONS_TAGGING',
    notes: `One AWS account for everything works until the first incident. A developer testing a delete script in "dev"
deletes production, because dev and production were the same account. The fix is not more careful developers;
it is **separate accounts**, because an account is the strongest boundary AWS has: IAM permissions, service
quotas and (by default) the bill all stop at its edge.

## AWS Organizations

**AWS Organizations** groups accounts under one **management account**:

- **Consolidated billing** — one bill, volume discounts pooled, cost per account visible.
- **Organizational units (OUs)** — folders of accounts that can nest. Policies attached to an OU apply to
  every account below it.
- **Account creation by API** — a new account for a new team in minutes.
- **Policies** — service control policies (SCPs), resource control policies (RCPs), tag policies and backup
  policies.

The management account is special: SCPs do **not** apply to it. So it runs nothing but Organizations and
billing; workloads go in member accounts.

## A landing-zone layout

A small company does not need dozens of accounts, but it needs the shape. PayKosh's layout, built with boto3
against moto (it printed):

    Root SCPs: ['FullAWSAccess', 'ProtectAuditTrail']
    OU Security  SCPs=['FullAWSAccess']
      - paykosh-log-archive
      - paykosh-security-tooling
    OU Workloads  SCPs=['FullAWSAccess', 'DenyOutsideIndia']
      OU Prod  SCPs=['FullAWSAccess']
        - paykosh-prod
      OU NonProd  SCPs=['FullAWSAccess']
        - paykosh-staging
        - paykosh-dev
    OU Sandbox  SCPs=['FullAWSAccess']
      - sandbox-priya

- **Log archive** — CloudTrail and Config logs from every account land here; almost nobody can write or
  delete. When an incident happens, this is the evidence the attacker could not touch.
- **Security tooling** — GuardDuty, Security Hub and similar run here as **delegated administrator** for the
  organisation, so the security team does not need the management account.
- **Prod and NonProd** — separate accounts per environment. Production access goes through Identity Center
  roles; developers have broad rights in dev and read-only in prod.
- **Sandbox** — personal experiment accounts with a small budget and strict SCPs, cleaned regularly.

**AWS Control Tower** builds this pattern for you (a Security OU with Log Archive and Audit accounts, baseline
guardrails, an Account Factory). Many companies start there; knowing the parts lets you read and change it.

## Service control policies

An SCP sets the **maximum** permissions for every principal in the accounts it applies to — including the
member accounts' root users. It grants nothing (last lesson's case 11). FullAWSAccess is attached everywhere by
default; guardrails are usually Deny statements added on top. Two from PayKosh:

    {"Sid": "ProtectAuditTrail", "Effect": "Deny",
     "Action": ["cloudtrail:StopLogging", "cloudtrail:DeleteTrail", "cloudtrail:UpdateTrail"],
     "Resource": "*"}

    {"Sid": "DenyOutsideIndia", "Effect": "Deny",
     "NotAction": ["iam:*", "organizations:*", "sts:*", "support:*", "budgets:*",
                   "cloudfront:*", "route53:*"],
     "Resource": "*",
     "Condition": {"StringNotEquals": {"aws:RequestedRegion": ["ap-south-1", "ap-south-2"]}}}

The region guardrail must exempt **global services**, which are called through us-east-1 — leave IAM out of
the NotAction list and nobody can manage IAM any more. AWS publishes a maintained example of this SCP with the
full exemption list; start from it rather than this abbreviated one. **Test every SCP on the Sandbox OU
first**: an SCP mistake applies to every account below it at once. SCPs do not restrict service-linked roles.

**RCPs** (resource control policies) are the newer twin: a cap on what resource policies in your accounts can
allow — for example "no S3 bucket in the organisation can be read by principals outside it".

## Tags

A **tag** is a key-value pair on a resource. Tags answer "whose is this?" and "what does it cost?":

- **owner** (a team, not a person who will leave), **env** (prod, staging, dev), **cost-centre**, **service**
  or **app**, sometimes **data-classification**.
- Keys and values are **case-sensitive**: Owner and owner are different tags, and a report grouping by one
  misses the other.
- For cost, activate the keys as **cost allocation tags** in the Billing console; only then do they appear in
  Cost Explorer and cost reports. History before activation is limited (AWS offers a backfill for part of
  it; check the current docs), so activate the keys on day one.
- **Tag policies** in Organizations standardise keys and allowed values; an SCP or IAM condition on
  aws:RequestTag/aws:TagKeys can refuse to create untagged resources. Terraform's default_tags (CL2) applies
  tags to everything it creates.

The compliance check PayKosh runs, against four instances in moto:

    ['cost-centre', 'env', 'owner'] missing: []
    ['cost-centre', 'env', 'owner'] missing: []
    ['Owner', 'env'] missing: ['cost-centre', 'owner']
    [] missing: ['cost-centre', 'env', 'owner']

The third instance has an owner — spelled "Owner" — and the check correctly reports it as missing. Fix the
tag, not the check. Azure organises the same way with management groups, subscriptions, Azure Policy and tags.`,
    workedExample: `**Scenario.** PayKosh has grown to 40 engineers in one AWS account. The CTO asks you for a multi-account plan the
team can move to over a quarter, without a big-bang migration.

**Step 1 — Create the organisation from a fresh account.** The existing account holds production; making it the
management account would leave workloads where SCPs cannot reach. So a new, empty account becomes the
management account, and the old one is invited in as a member and moved into Workloads/Prod.

**Step 2 — Security first.** Create paykosh-log-archive and paykosh-security-tooling in the Security OU. Turn on
an organisation CloudTrail delivering to an S3 bucket in log-archive, with a bucket policy that only CloudTrail
can write to. Delegate GuardDuty and Security Hub administration to security-tooling. Attach ProtectAuditTrail
at the root.

**Step 3 — Identity.** Enable IAM Identity Center in the management account, connect the company's identity
provider, create permission sets (Admin, PaymentsDeveloper, ReadOnly) and assign them per account. Remove
IAM users from the old account as people move over.

**Step 4 — New environments.** Create paykosh-staging and paykosh-dev under Workloads/NonProd. New services start
there; dev resources are moved out of the old production account one service at a time.

**Step 5 — Guardrails, tested.** Attach DenyOutsideIndia to the Sandbox OU, try creating a bucket in us-west-2
from a sandbox account (expect AccessDenied) and run a normal IAM and Route 53 change (expect success). Only then
attach it to Workloads.

**Step 6 — Tags and cost.** A tag policy for owner, env and cost-centre; activate them as cost allocation tags;
a monthly Cost Explorer view by account and cost-centre goes to team leads.

**Result.** Each step is reversible and useful on its own. The biggest risk — production and experiments in
one account — shrinks with every service moved.`,
    mcqs: [
      mcq('PayKosh attaches an SCP denying ec2:TerminateInstances at the organisation root. An admin in the management account terminates an instance there. What happens?', [
        ['It succeeds, because SCPs never apply to the management account', true],
        ['It fails, because a root-level SCP binds every account in the org', false],
        ['It fails only if the admin signed in to the console without MFA', false],
        ['It succeeds, but only because the admin is the management root user', false],
      ], 'SCPs do not affect the management account at all, which is why workloads must not run there. Root-level SCPs bind member accounts only, MFA is irrelevant to SCP scope, and any principal in the management account, not only root, is unaffected.'),
      mcq('A cost report grouped by the tag "owner" shows a large "no tag" line, although engineers swear they tag everything. What should be checked first?', [
        ['Whether resources were tagged "Owner" or "OWNER", since keys are case-sensitive', true],
        ['Whether the resources were created in the Hyderabad region instead of Mumbai', false],
        ['Whether the SCPs at the root include the FullAWSAccess default policy', false],
      ], 'Tag keys are case-sensitive, so "Owner" is a different key and lands in "no tag". (Also check the key is activated as a cost allocation tag.) Region does not hide tags, and FullAWSAccess has nothing to do with cost reporting.'),
      mcq('Why does PayKosh\'s DenyOutsideIndia SCP list IAM, STS and Route 53 under NotAction?', [
        ['They are global services whose calls are made through us-east-1', true],
        ['They are free services, so denying them would not save any money', false],
        ['They cannot be governed by any SCP, so listing them avoids an error', false],
        ['They are only available in ap-south-1, so a region check is not needed', false],
      ], 'Global services are served from us-east-1, so a region deny without exemptions blocks them everywhere. Cost is not the reason, SCPs can govern these services, and they are not limited to Mumbai.'),
    ],
    checkpoint: [
      mcq('PayKosh wants CloudTrail logs that even an account administrator in production cannot delete. Where should they be delivered?', [
        ['A bucket in a separate log-archive account with tight access', true],
        ['A bucket in the production account with versioning enabled', false],
        ['The same account, inside a folder named do-not-delete', false],
        ['Each engineer\'s laptop, synced by a nightly script', false],
      ], 'An account boundary means production admins have no rights over the log-archive bucket. Versioning in the same account can be undone by its admin, a folder name protects nothing, and laptops are neither durable nor controlled.'),
      mcq('An engineer puts a new region-restriction SCP straight onto the Workloads OU and production breaks. What practice would have caught it?', [
        ['Attaching and testing the SCP on a Sandbox OU account first', true],
        ['Writing the SCP as an inline policy on every production role', false],
        ['Attaching the SCP to the management account before the OUs', false],
        ['Adding a tag to the SCP that marks it as experimental', false],
      ], 'SCPs hit every account below the attachment point at once, so they are tried on a sandbox first. Inline role policies are a different mechanism, the management account ignores SCPs so it tests nothing, and tags do not change how a policy is enforced.'),
      mcq('PayKosh tagged resources with cost-centre months ago, but Cost Explorer cannot group by it. What is missing?', [
        ['Activating cost-centre as a cost allocation tag in Billing', true],
        ['Recreating every resource so the tag is set at creation time', false],
        ['Renaming the key to aws:cost-centre so AWS can recognise it', false],
        ['A Budgets alert that names cost-centre as its filter value', false],
      ], 'User-defined tags appear in cost tools only after they are activated as cost allocation tags. Recreating resources is unnecessary, the aws: prefix is reserved for AWS-generated tags, and a budget does not activate tags.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_FOUNDATIONS_DEBUGGING',
    notes: `Six broken pieces of PayKosh's AWS setup. None of them threw a dramatic error; each did something quietly
wrong, which is why it survived review. For each: read the symptom, guess the cause before reading on, then
check. The IAM results come from the topic's Python model of the documented evaluation logic; the boto3
results are real output against moto. The SCP case was reasoned from the AWS documentation, not run.

The general method, worth more than any single fix: **find out who you are** (aws sts get-caller-identity),
**where you are** (account and region), and **what decided** (which policy, at which level) — then change one
thing.

## 1. Listing the bucket is denied, reading files works

**Symptom.** The support tool's role can download s3://paykosh-statements/statements/C1029/2026-10.pdf when
given the exact key, but aws s3 ls on the bucket returns AccessDenied.

    {"Effect": "Allow", "Action": ["s3:GetObject", "s3:ListBucket"],
     "Resource": "arn:aws:s3:::paykosh-statements/*"}

    9 ListBucket on object ARN       -> DENY (implicit: nothing allowed it)

**Cause.** s3:ListBucket is an action on the **bucket** (arn:aws:s3:::paykosh-statements); "/*" matches only
objects. Nothing allows the request, so the implicit deny stands.

**Fix.** Two statements: ListBucket on the bucket ARN (optionally with an s3:prefix condition), GetObject on
bucket/statements/*. Do not "fix" it with Resource "*" — that grants listing of every bucket in the account.

## 2. The MFA guardrail that the CLI walked straight past

**Symptom.** A policy denies s3:Delete* when MFA is absent. In the console without MFA, deletes are blocked as
intended. Then an engineer deletes objects from a laptop script using an old IAM access key — and it works.

    4 admin delete, console no MFA   -> DENY (explicit)
    4b same deny, access key         -> ALLOW
    4c BoolIfExists, access key      -> DENY (explicit)

**Cause.** The condition was "Bool": {"aws:MultiFactorAuthPresent": "false"}. For requests signed with
long-term access keys, that key is **not present at all**. A Bool condition on a missing key does not match, so
the Deny does not apply, and the admin Allow wins.

**Fix.** "BoolIfExists" — the condition counts as met when the key is missing, so the Deny applies to
key-signed requests too. Better still, remove the long-term key; the trap only exists because one is in use.

## 3. The nightly report that stopped at fifty

**Symptom.** A cleanup script reports "120 statements found" in the console but the script processes 50, and
no error is logged.

    one call: 50 keys, IsTruncated = True
    paginator pages: [50, 50, 20]

**Cause.** One list_objects_v2 call returns one page (MaxKeys=50 here; never more than 1,000) and sets
IsTruncated. The script never looked at the flag.

**Fix.** Use s3.get_paginator("list_objects_v2") and loop over pages, or .search("Contents[].Key"). The same
bug exists for describe_instances, list_users and nearly every list call.

## 4. "Missing object" that was never detected

**Symptom.** A script checks whether a statement exists before emailing it, catches ClientError, and tests
e.response["Error"]["Code"] == "NoSuchKey". Missing statements are reported as "unknown error".

    try:
        s3.head_object(Bucket="paykosh-statements-dev", Key="2026/11/missing.pdf")
    except ClientError as e:
        print(e.response["Error"]["Code"], e.response["ResponseMetadata"]["HTTPStatusCode"])

    404 404

**Cause.** head_object is an HTTP HEAD; the response has no body to carry "NoSuchKey", so botocore sets the
code from the status, "404". (get_object returns NoSuchKey.)

**Fix.** For head_object, test the status code (404) — or check both codes. Print the real error once before
writing the branch.

## 5. Half of the cost is "No tag"

**Symptom.** The monthly report by owner shows a large unowned line. The data team insists their instances
are tagged.

    ['Owner', 'env'] missing: ['cost-centre', 'owner']

**Cause.** They tagged **Owner**. Tag keys are case-sensitive, so the report grouping by "owner" puts them under
no tag. (A second common cause: the key was never activated as a cost allocation tag.)

**Fix.** Re-tag the resources with the standard key; add a tag policy for the organisation that fixes the
capitalisation, and enforce the required keys at creation (CL2 does this in Terraform with default_tags).

## 6. The region guardrail that locked out IAM

**Symptom.** Minutes after a new SCP is attached to the Workloads OU, engineers in paykosh-prod can no longer
create IAM roles or change Route 53 records. EC2 in ap-south-1 still works.

    {"Effect": "Deny", "Action": "*", "Resource": "*",
     "Condition": {"StringNotEquals": {"aws:RequestedRegion": ["ap-south-1", "ap-south-2"]}}}

**Cause.** IAM, Route 53, Organizations, STS's global endpoint and others are **global services** served from
us-east-1. "Deny everything outside Mumbai and Hyderabad" therefore denies them. (Reasoned from the AWS SCP
documentation; not run.)

**Fix.** Use NotAction to exempt global services — AWS publishes a maintained example of this SCP with the
list — and attach it to the Sandbox OU first, test, then Workloads. Detach immediately if it breaks
production; an SCP change takes effect for every account below it at once.`,
    mcqs: [
      mcq('A PayKosh Deny for s3:Delete* uses "Bool": {"aws:MultiFactorAuthPresent": "false"}. Deletes made with a long-term access key still succeed. Why?', [
        ['That key is absent on key-signed requests, so the Bool test never matches', true],
        ['Access keys are evaluated before Deny statements and so take priority', false],
        ['MFA conditions only work inside bucket policies, not IAM policies', false],
        ['The Deny needs a Principal element naming the user before it applies', false],
      ], 'With long-term keys aws:MultiFactorAuthPresent is not in the request, and a plain Bool on a missing key does not match; BoolIfExists does. Explicit Deny always outranks Allow, MFA conditions work in identity policies, and identity policies have no Principal element.'),
      mcq('A script\'s s3:ListBucket is denied though the role allows it on "arn:aws:s3:::paykosh-statements/*". What is the smallest correct fix?', [
        ['Add ListBucket on the bucket ARN arn:aws:s3:::paykosh-statements', true],
        ['Change the Resource to "*" so the role may list any bucket at all', false],
        ['Add s3:GetBucketLocation to the same statement on the same resource', false],
        ['Attach AmazonS3FullAccess to the role alongside the existing policy', false],
      ], 'ListBucket applies to the bucket resource, so naming the bucket ARN fixes it and nothing more. Resource "*" or S3FullAccess grant far more than needed, and GetBucketLocation on an object ARN has the same mistake.'),
      mcq('After attaching a region-deny SCP to the Workloads OU, PayKosh engineers cannot create IAM roles. EC2 in Mumbai still works. What is wrong?', [
        ['IAM is global and served from us-east-1, and the SCP did not exempt it', true],
        ['IAM roles need an SCP of their own that explicitly allows iam:CreateRole', false],
        ['The SCP took effect on the management account and blocked IAM there', false],
        ['IAM changes are blocked for an hour after any SCP change by design', false],
      ], 'Global services are called through us-east-1, so they fall outside an India-only region deny unless exempted with NotAction. The default FullAWSAccess already allows IAM, SCPs never apply to the management account, and there is no waiting period.'),
      mcq('A PayKosh audit script counts exactly 1,000 statement files every night, never more, in a bucket that keeps growing. What is the first thing to check?', [
        ['Whether it reads only the first page instead of using a paginator', true],
        ['Whether the bucket has reached a hard limit of 1,000 objects', false],
        ['Whether S3 versioning is hiding the newer objects from listing', false],
        ['Whether the role lacks s3:GetObject on the newest objects', false],
      ], 'A count stuck at exactly 1,000 is the S3 page size; the script needs the paginator. Buckets have no such object limit, versioning does not hide current objects from ListObjectsV2, and GetObject permission does not affect listing.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_FOUNDATIONS_PRACTICE',
    notes: `Eight exercises, easiest first. Do each on paper or in a scratch file before reading the answer. Exercises 5 and
6 can be run against moto (pip install boto3 moto) at no cost; the answers' outputs are from such runs.

## 1. Region or zone? (warm-up)

For each, say global, regional or zonal: (a) an IAM role, (b) an S3 bucket, (c) an EBS volume, (d) a Lambda
function, (e) a subnet, (f) a Route 53 hosted zone.

**Answer.** (a) global, (b) regional (globally unique name), (c) zonal, (d) regional, (e) zonal — a subnet
lives in one AZ, (f) global.

## 2. Choose the region

A Hyderabad health-tech start-up stores lab reports. Users are across South India; one investor asks to "use
Singapore, it's cheaper". What do you recommend, and what do you check?

**Answer.** ap-south-2 (Hyderabad) or ap-south-1 (Mumbai) for the data, because health data residency and the
DPDP Act need a compliance owner's sign-off before data leaves India, and latency is better. Check service
availability for each service in both regions and estimate cost in the Pricing Calculator rather than
assuming. Use the other Indian region for backups.

## 3. Read the policy

    {"Version": "2012-10-17", "Statement": [
      {"Effect": "Allow", "Action": "s3:*", "Resource": ["arn:aws:s3:::paykosh-reports",
                                                         "arn:aws:s3:::paykosh-reports/*"]},
      {"Effect": "Deny", "Action": ["s3:DeleteObject", "s3:DeleteBucket"], "Resource": "*"}]}

Can the holder (a) upload a file to paykosh-reports, (b) delete a file there, (c) read a file in
paykosh-payroll?

**Answer.** (a) yes, s3:PutObject is in s3:* on the bucket's objects; (b) no, explicit Deny; (c) no, nothing
allows it — implicit deny.

## 4. Write the policy

The analytics job must read objects under exports/ in paykosh-data and write results under results/ in the
same bucket. Nothing else.

**Answer.**

    {"Version": "2012-10-17", "Statement": [
      {"Sid": "ListTwoPrefixes", "Effect": "Allow", "Action": "s3:ListBucket",
       "Resource": "arn:aws:s3:::paykosh-data",
       "Condition": {"StringLike": {"s3:prefix": ["exports/*", "results/*"]}}},
      {"Sid": "ReadExports", "Effect": "Allow", "Action": "s3:GetObject",
       "Resource": "arn:aws:s3:::paykosh-data/exports/*"},
      {"Sid": "WriteResults", "Effect": "Allow", "Action": "s3:PutObject",
       "Resource": "arn:aws:s3:::paykosh-data/results/*"}]}

Common slips: ListBucket on bucket/*; one statement with both actions on "paykosh-data/*" (lets the job
overwrite exports).

## 5. Find the zones with JMESPath

Write a --query that returns, for running instances only, the instance id and its Availability Zone.

**Answer.** "Reservations[].Instances[?State.Name=='running'][].[InstanceId, Placement.AvailabilityZone]".
Against moto with instances in 1a, 1b and a stopped one in 1b it returned (ids shortened):

    [['i-...', 'ap-south-1a'], ['i-...', 'ap-south-1b']]

If the result comes back nested per reservation, you missed the [] flatten after the filter.

## 6. Paginate

Write a boto3 function that returns every IAM user name, however many there are.

**Answer.**

    def all_user_names():
        iam = boto3.client("iam")
        names = []
        for page in iam.get_paginator("list_users").paginate():
            names += [u["UserName"] for u in page["Users"]]
        return names

A single list_users call returns one page and an IsTruncated flag; the paginator follows the Marker for you.

## 7. Fix the trust policy

PayKosh's production role DeployFromTooling should be assumable only by the role CiRunner in the tooling account
210987654321. Its trust policy says "Principal": {"AWS": "*"}. Rewrite the principal and say what else is needed.

**Answer.** "Principal": {"AWS": "arn:aws:iam::210987654321:role/CiRunner"}, Action sts:AssumeRole. In the
tooling account, CiRunner's permissions policy must allow sts:AssumeRole on
arn:aws:iam::123456789012:role/DeployFromTooling — both sides must agree. "AWS": "*" with no condition let any
AWS principal in the world attempt it.

## 8. Lay out the accounts

A 15-person Pune ed-tech start-up has one account with prod, staging and every developer's experiments. Sketch
an Organizations layout and two SCPs.

**Answer.** New management account (billing and Organizations only). OUs: Security (log-archive,
security-tooling), Workloads/Prod (prod), Workloads/NonProd (staging, dev), Sandbox (one per developer or a
shared one). SCPs: protect CloudTrail and the log-archive bucket (at the root); deny regions outside India with
global services exempted (tested on Sandbox first). Plus Identity Center for people, a tag policy for owner,
env and cost-centre, and a budget per account.`,
    mcqs: [
      mcq('An analytics role at PayKosh must read exports/ and write results/ in one bucket. Which grant is closest to least privilege?', [
        ['GetObject on bucket/exports/* and PutObject on bucket/results/*', true],
        ['GetObject and PutObject together on bucket/* in one statement', false],
        ['s3:* on the bucket and its objects, with a Deny on DeleteBucket', false],
        ['AmazonS3ReadOnlyAccess plus PutObject on every bucket by "*"', false],
      ], 'Scoping each action to its own prefix gives exactly the two capabilities required. Both actions on bucket/* lets the job overwrite exports, s3:* grants far more than reads and writes, and a managed read-only policy covers every bucket in the account.'),
      mcq('A PayKosh query returns [[...], [...]] grouped per reservation instead of one flat list of instance ids. What fixes it?', [
        ['Adding the [] flatten after the filtered Instances expression', true],
        ['Switching --output from json to table so the nesting is removed', false],
        ['Adding --no-paginate so the CLI returns one reservation only', false],
        ['Replacing --query with --filters, which flattens on the server', false],
      ], 'Each reservation holds a list of instances, so a filter projection yields a list per reservation; a trailing [] flattens it. Output format and pagination do not change the JSON shape, and --filters selects instances rather than reshaping the result.'),
      mcq('Which trust-policy principal lets only the CiRunner role in tooling account 210987654321 assume a PayKosh production role?', [
        ['"AWS": "arn:aws:iam::210987654321:role/CiRunner"', true],
        ['"AWS": "*" with a Sid of "OnlyCiRunnerFromTooling"', false],
        ['"Service": "ci.amazonaws.com" in place of an account', false],
        ['"AWS": "arn:aws:iam::123456789012:root" for the account', false],
      ], 'Naming the role ARN restricts the trust to that one role. A Sid is only a label, there is no "ci" service principal, and the root ARN of 123456789012 trusts PayKosh\'s own account rather than the tooling account.'),
      mcq('A health-tech start-up\'s investor suggests Singapore for lab-report storage because "it is cheaper". What is the engineer\'s best first response?', [
        ['Check residency rules with the compliance owner before moving data abroad', true],
        ['Agree, since AWS encrypts the data at rest and so its location no longer matters', false],
        ['Agree, but put CloudFront in India so the data counts as stored in India', false],
        ['Refuse, because AWS forbids Indian accounts from using foreign regions', false],
      ], 'Health and personal data may carry residency obligations, so the location decision goes through compliance before cost. Encryption does not change where data is stored, a CDN cache is not the storage location, and AWS does not restrict Indian accounts to Indian regions.'),
      mcq('A boto3 function must return every IAM user in an account of 400 users. Which call pattern is correct?', [
        ['Loop over iam.get_paginator("list_users").paginate() and collect each page', true],
        ['Call iam.list_users(MaxItems=400) once and read the whole Users list it returns', false],
        ['Call iam.get_account_summary() and read the user names from its result', false],
      ], 'The paginator follows Marker/IsTruncated until every page is read. A single call may still return fewer than requested and is fragile when the count grows, and the account summary returns counts, not user names.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_FOUNDATIONS_INTERVIEW_QUESTION',
    notes: `Four questions asked in fresher cloud, DevOps and SRE interviews at product companies, GCCs and service firms in
Bengaluru, Hyderabad and Pune. Answer aloud first, about two minutes each, then compare. Interviewers listen
for precise words (role, trust policy, explicit deny, SCP) and for whether you would do the safe thing first.

## Q1. "What is the difference between an IAM user and an IAM role? When would you use each?"

**Model answer.** "A user is a long-term identity with a password or access keys. A role has no long-term
credentials — a trusted principal assumes it through STS and gets temporary credentials that expire, an hour
by default. A role has a trust policy, saying who may assume it, and a permissions policy, saying what it can
do. I'd use roles for almost everything: people through IAM Identity Center, EC2 through an instance profile,
Lambda through its execution role, CI through OIDC federation. I'd keep IAM users for the rare system that
can't use any of those, with a scoped key, stored in a secret manager and rotated."

**Follow-up.** "How does code on EC2 get the role's credentials?" — "From the instance metadata service; the
SDK's credential chain finds them and refreshes them before expiry. I'd require IMDSv2 so a simple forwarded
request can't read them."

## Q2. "A request is denied. Walk me through how AWS decides."

**Model answer.** "Everything starts denied. If any applicable policy has an explicit Deny, that's final. Then
the guardrails must allow it — SCPs at every level of the Organization, a permissions boundary if the identity
has one, a session policy if one was passed. Then something must grant it — the identity's policy or a
resource policy. Cross-account, both the caller's identity policy and the resource's policy must allow it.
To debug I'd first run aws sts get-caller-identity to see who I really am, then read the error — newer
AccessDenied messages often name the policy type that denied — and check CloudTrail for the event."

**Follow-up.** "The user has AdministratorAccess and is still denied. Why?" — "An explicit deny somewhere, an
SCP that doesn't allow it, a permissions boundary, or a resource policy — a KMS key policy or bucket policy —
that denies or, cross-account, doesn't allow it. Admin in IAM isn't admin of everything."

## Q3. "You find an access key for your company's AWS account in a public GitHub repo. What do you do?"

**Model answer.** "Contain first. Deactivate the key immediately — not delete yet, so I can still see its
last-used information. Find whose it is and what it can do. Check CloudTrail for every call made with that
key id, especially new users, keys, roles, instances in unusual regions and changes to logging. Remove
anything the attacker created; if they could create credentials, rotate those too. Then delete the key,
remove it from the repo history — assuming it was copied already — and fix the cause: replace the key with a
role or OIDC, and add secret scanning to the pipeline. Tell the security owner early; with customer data
there may be reporting duties."

**Follow-up.** "Why look in every region?" — "Attackers launch instances in regions the company never uses,
because nobody watches there. A region-deny SCP prevents that."

## Q4. "How would you set up AWS for a 20-person start-up?"

**Model answer.** "Organizations with a management account that runs nothing. A Security OU with a log-archive
account for the organisation CloudTrail and a security-tooling account; Workloads with separate prod and
non-prod accounts; a Sandbox OU. Identity Center for people with permission sets per role. SCPs that protect
CloudTrail and restrict regions to Mumbai and Hyderabad, tested on sandbox first. Root users locked with MFA
and no keys. Budgets and anomaly detection per account. A tagging standard — owner, env, cost-centre —
activated for cost. Control Tower can set most of this up; I'd still want to understand each piece."

**Follow-up.** "Isn't that overkill for 20 people?" — "Accounts are free; the expensive thing is separating
production from experiments later, after an incident. It's about a day's work at the start."`,
    mcqs: [
      mcq('In an interview you are asked why "AdministratorAccess" does not guarantee a call succeeds. Which answer is complete and correct?', [
        ['Explicit denies, SCPs, boundaries or resource policies can still block it', true],
        ['AdministratorAccess covers only the services that existed in 2012', false],
        ['AdministratorAccess is read-only unless MFA is used for the session', false],
        ['It works only in us-east-1, where IAM policies are evaluated by AWS', false],
      ], 'Admin grants every action in identity policy, but any explicit deny, an SCP or boundary that does not allow the action, or a resource policy can still refuse it. The managed policy is Allow * on *, it is not read-only, and IAM evaluation is not tied to one region.'),
      mcq('An interviewer asks for the first action on finding PayKosh\'s access key in a public repo. What do they want to hear?', [
        ['Deactivate the key at once, then investigate its use in CloudTrail', true],
        ['Delete the public repository so the key can no longer be seen there', false],
        ['Rotate the key quietly and keep using the new key in the same place', false],
        ['Wait to see if it is used, so you can tell if anyone really copied it', false],
      ], 'Containment comes first: deactivating stops use while preserving last-used data for the investigation. Deleting the repo does not stop a key that was already copied, rotating into the same place repeats the mistake, and waiting gives the attacker time.'),
      mcq('Asked "How does code on EC2 get role credentials?", which answer shows the right depth?', [
        ['Instance metadata supplies them via the SDK chain; require IMDSv2', true],
        ['The AMI holds a copy of the role\'s access key, read at boot time', false],
        ['EC2 sends the role\'s password to the instance through user data', false],
        ['The instance calls IAM\'s CreateAccessKey for itself on every start', false],
      ], 'The instance profile\'s temporary credentials come from the metadata service and are refreshed automatically; IMDSv2 hardens that path. Roles have no access keys or passwords to bake in or send, and an instance does not create keys for itself.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_FOUNDATIONS_CHECKPOINT',
    notes: `Ten questions across the topic: regions and zones, a safe account, IAM policies and their evaluation, roles and
federation, the CLI and boto3, and multi-account guardrails and tags. Answer without notes; the result shows
which lesson to revisit.`,
    checkpoint: [
      mcq('PayKosh runs two app instances in ap-south-1a only, behind a load balancer. What failure does this design not survive?', [
        ['The loss of the ap-south-1a Availability Zone', true],
        ['One of the two instances crashing on its own', false],
        ['A failed deploy on one instance during a rollout', false],
        ['A spike in traffic that one instance can absorb', false],
      ], 'Both instances share one AZ, so a zone failure takes both down; a second AZ is needed. A single instance crash, a bad deploy on one node and a modest spike are what two instances behind a load balancer already handle.'),
      mcq('Which pair of controls protects a new AWS account from both a breach of root and a runaway bill?', [
        ['Root MFA with no root keys, and a Budget with forecast alerts', true],
        ['A long root password, and a weekly look at the billing console', false],
        ['Root access keys stored in a vault, and a CPU alarm on each EC2', false],
        ['An IAM user for root tasks, and the Free Tier switched on', false],
      ], 'MFA and no keys close the main paths to root takeover, and forecast budget alerts warn before the bill lands. A password alone and weekly manual checks are weaker, root keys should not exist at all, and an IAM user cannot do root tasks while the Free Tier does not cap spend.'),
      ck('IAM_FUNDAMENTALS', 'A role has an Allow for s3:GetObject on a bucket and a permissions boundary that allows only dynamodb:*. Can it read objects?', [
        ['No; the boundary does not allow S3, so the request is denied', true],
        ['Yes; the Allow on the role overrides any permissions boundary', false],
        ['Yes, but only objects that were uploaded before the boundary', false],
        ['No, because GetObject also needs an Allow inside an SCP to work', false],
      ], 'Effective permissions are the intersection of identity policy and boundary, and S3 is outside the boundary. Boundaries are not overridden, they apply to every object regardless of age, and while SCPs must allow too, the default FullAWSAccess already does — the boundary is what blocks it.'),
      ck('IAM_FUNDAMENTALS', 'A PayKosh bucket policy in the prod account allows reads by a role in the analytics account. The analytics role has no policy mentioning S3. Can it read?', [
        ['No; cross-account access needs the caller\'s identity policy to allow it too', true],
        ['Yes; the bucket policy alone is enough when the bucket owner has allowed it', false],
        ['Yes, as long as both accounts are inside the same AWS Organization', false],
        ['No, because bucket policies can never name principals in other accounts', false],
      ], 'Across accounts both sides must allow: the resource policy in prod and an identity policy in analytics. Being in one Organization does not merge permissions, and bucket policies routinely name principals in other accounts.'),
      ck('IAM_FUNDAMENTALS', 'Which statement about the trust policy "Principal": {"AWS": "arn:aws:iam::123456789012:root"} on a role is correct?', [
        ['It trusts the whole account 123456789012, subject to that account\'s IAM policies', true],
        ['It trusts only the root user of account 123456789012 and no other identity', false],
        ['It trusts every AWS account, because "root" means the top of the hierarchy', false],
      ], 'The :root ARN in a principal stands for the account; principals in it may assume the role if their own policies allow sts:AssumeRole. It does not mean the root user only, and it does not open the role to other accounts.'),
      ck('IAM_FUNDAMENTALS', 'PayKosh\'s GitHub Actions deploy should get AWS access with no stored secret. What is the right mechanism?', [
        ['An IAM role trusting GitHub\'s OIDC provider, scoped by the sub claim', true],
        ['An IAM user key saved as an encrypted GitHub repository secret value', false],
        ['The production root user\'s MFA code entered into each workflow run', false],
        ['A public S3 bucket that the workflow writes its build artefacts into', false],
      ], 'OIDC federation exchanges GitHub\'s short-lived token for role credentials, and the sub condition pins the repository and branch or environment. An encrypted key is still a long-lived secret, root must never be used, and a public bucket is a data leak rather than authentication.'),
      mcq('A PayKosh boto3 script must find all EC2 instances with no "owner" tag across hundreds of instances. Which detail prevents it from crashing on exactly the instances it is looking for?', [
        ['Reading tags with inst.get("Tags", []), since untagged ones have no Tags key', true],
        ['Calling describe_instances once with MaxResults set to its largest value', false],
        ['Catching every exception around the loop and continuing with no message', false],
        ['Creating the client without region_name so it searches every region', false],
      ], 'An instance with no tags has no Tags key at all, so inst["Tags"] raises KeyError on precisely the untagged instances. One call is still one page, swallowing every exception hides real failures, and a client without a region uses the configured default region, not all regions.'),
      mcq('What does the CLI option --query do on aws ec2 describe-instances?', [
        ['Applies a JMESPath expression to the JSON response on your machine', true],
        ['Sends a SQL-style query to EC2 so fewer instances are returned', false],
        ['Selects which AWS profile and region the command should use', false],
        ['Saves the output as a named query to rerun later in the console', false],
      ], '--query is client-side JMESPath over the response; server-side selection is --filters. Profile and region are --profile and --region, and the CLI does not save queries to the console.'),
      mcq('Where should PayKosh\'s organisation-wide CloudTrail logs be stored so a compromised production admin cannot erase them?', [
        ['In a bucket in a dedicated log-archive account', true],
        ['In a bucket in the production account itself', false],
        ['In the management account alongside workloads', false],
        ['In CloudWatch Logs inside each of the member accounts', false],
      ], 'A separate account puts the logs outside the production admin\'s reach. A bucket or log group in the production account can be changed by its admin, and the management account should run nothing but Organizations and billing.'),
      mcq('PayKosh attaches an SCP that denies all actions outside ap-south-1 and ap-south-2, with no exemptions. What breaks?', [
        ['Global services such as IAM and Route 53, served from us-east-1', true],
        ['Nothing, since every AWS service is available in both Indian regions', false],
        ['Only the management account, which SCPs apply to most strictly', false],
        ['Only EC2 in Mumbai, since SCPs apply only to compute services', false],
      ], 'Global services are called through us-east-1, so an unexempted region deny blocks them. Not every service runs regionally in India, SCPs do not apply to the management account at all, and SCPs cover every service, not just compute.'),
    ],
  },
];
