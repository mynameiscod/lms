/**
 * Career-track content: Infrastructure as Code with Terraform (CL_TERRAFORM), Cloud & DevOps Engineer, batch CL2.
 *
 * What a cloud or DevOps engineer does with infrastructure as code at work: why declarative tools exist, Terraform
 * against AWS (providers, resources, variables, the init-plan-apply loop), state in an S3 backend with locking,
 * imports and refactors, modules and environments, Terraform in a pull-request pipeline with policy checks and
 * drift detection, and enough CloudFormation, CDK and Bicep to work on a team that uses them. It builds on Year 3's
 * cloud lessons ("Compute and Storage, Chosen", "One Build, Three Environments", "Secrets, Properly") and CL1's
 * AWS topics, and goes deeper than the MLOps track's single "Infrastructure as Code" unit; those are referred to by
 * title, not re-taught. Azure equivalents are named in a line; CL_AZURE teaches Azure itself.
 *
 * One fictional company runs through the topic: MedSetu, a Hyderabad health-tech start-up (appointments and lab
 * reports) running in AWS Mumbai (ap-south-1) with disaster recovery in Hyderabad (ap-south-2). There is no
 * Terraform binary where this was written: every HCL block was parsed with python-hcl2 8.1 but none was planned or
 * applied, and every "terraform plan" output is illustrative, written from the documentation in Terraform's real
 * format, and labelled so. boto3 outputs (the imperative script, the state-bucket bootstrap, the CloudFormation
 * stack) are real output from boto3 1.43 against moto 5.2 (mock AWS); the plan-JSON guard was run in Python on a
 * hand-written plan file. The CloudFormation YAML parses with PyYAML (a loader that accepts !Ref and friends) and
 * was created as a stack in moto; Bicep, CDK, the GitHub Actions workflow (parsed with PyYAML only), Rego and every
 * CLI command were written from the documentation and NOT run. Account ids (123456789012) and names are fake.
 * No prices: students read the pricing pages and keep a budget alarm on.
 *
 * Skills: INFRA_AS_CODE by default; the pipeline lesson is CONFIG_MANAGEMENT. Checkpoint questions elsewhere that
 * are plainly about per-environment configuration or keeping secrets out of code and state use
 * ck('CONFIG_MANAGEMENT', ...); pipeline-lesson questions that are plainly about Terraform itself use
 * ck('INFRA_AS_CODE', ...).
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const CFG = 'CONFIG_MANAGEMENT';
const IAC = 'INFRA_AS_CODE';

export const TRACK_CL_TERRAFORM_BUNDLES: PilotBundle[] = [
  /* ── IAC_CONCEPTS ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_TERRAFORM_IAC_CONCEPTS',
    notes: `MedSetu, a Hyderabad health-tech start-up, books doctor appointments and delivers lab reports for clinics in
Telangana and Andhra Pradesh. Its production account in AWS Mumbai was built by clicking in the console over two
years. Last month an engineer "tidied up" a security group and the report service lost its database for forty
minutes; nobody could say what the rule had been. Staging is "roughly like prod". Rebuilding prod in Hyderabad
for disaster recovery is a wiki page nobody has followed. Year 3's "Debugging Cloud Infrastructure" already named
the cure: an environment defined in files can be diffed, reviewed and rebuilt. This topic is how that is done.

## Imperative scripts, and why they grow into a tool

The first instinct is a script. This one ran against moto (mock AWS):

    def setup_reports(s3):
        s3.create_bucket(Bucket="medsetu-reports-dev",
                         CreateBucketConfiguration={"LocationConstraint": "ap-south-1"})
        s3.put_bucket_versioning(Bucket="medsetu-reports-dev",
                                 VersioningConfiguration={"Status": "Enabled"})

    created
    BucketAlreadyOwnedByYou: An error occurred (BucketAlreadyOwnedByYou) when calling the CreateBucket
    operation: Your previous request to create the named bucket succeeded and you already own it.

The first run works; the second fails. The script says **how** (do these steps), so it only works from one starting
point. Make it safe to re-run and it changes shape — read what exists, compare, act only on the difference:

    ensure_reports(s3)   ->  created / versioning None -> Enabled
    ensure_reports(s3)   ->  no changes
    (someone suspends versioning in the console)
    ensure_reports(s3)   ->  versioning Suspended -> Enabled

That is the whole idea of a declarative tool, written by hand for one bucket and two settings. Terraform, CloudFormation
and Bicep do it for thousands of resource types: you write **what** should exist, the tool reads what does exist,
computes the difference, and shows it to you before acting.

## The words you will use every day

- **Declarative** — the file describes the end state ("a versioned bucket called X"). **Imperative** — the file
  lists steps. Declarative files can be applied repeatedly; imperative ones need care for every starting point.
- **Idempotent** — applying the same definition twice changes nothing the second time. "No changes" on a re-run is
  the sign of healthy code.
- **Desired state, recorded state, real state.** The code says what you want; the tool's record (Terraform's
  state, a CloudFormation stack) says what it created; the cloud says what is actually there. Most surprises are a
  disagreement between two of the three.
- **Drift** — reality changed outside the tool: a console edit, a script, an AWS-side change. The next plan shows
  it, and the team either adopts it into code or lets the apply put it back.
- **Plan and apply** — compute the difference and print it; then carry it out. The plan is the thing a reviewer
  reads, the way a code reviewer reads a diff.
- **Immutable infrastructure** — replace rather than patch: a new AMI or image, a new instance, the old one removed.
  IaC makes replacement cheap enough to prefer.

## What IaC owns, and what it does not

Terraform-style tools own **cloud resources**: VPCs, IAM roles, buckets, databases, clusters, DNS records. They are
poor at what happens **inside** a server (packages, files — that is cloud-init, a baked image or Ansible) and
should not own **application releases** (a new container tag every hour belongs to the CI/CD pipeline, the next
topic). Nor should they own data: Terraform creates the bucket, never the lab reports in it. Teams that blur these
lines end with an infrastructure apply for every release, or a database that Terraform "helpfully" recreates.

## The tools

    Tool            Language            Where the record lives        Clouds
    Terraform       HCL                 a state file you store        any (providers)
    OpenTofu        HCL                 a state file you store        any (Terraform fork)
    CloudFormation  YAML or JSON        the stack, inside AWS         AWS only
    AWS CDK         Python, TS, Java    synthesises CloudFormation    AWS only
    Bicep           Bicep (ARM)         Azure Resource Manager        Azure only
    Pulumi          Python, TS, Go      a state backend you choose    any

Terraform is the most common in Indian job listings for cloud and DevOps roles, which is why this topic teaches it.
Since version 1.6 Terraform is under the Business Source Licence; OpenTofu is the open-source fork under the Linux
Foundation and runs the same HCL with the command tofu. Most teams' day-to-day work is identical on either.

**Choosing for a team** is about the team, not the tool's feature list: which clouds you run (one cloud and a
strong AWS shop may prefer CloudFormation or CDK, with no state file to look after); who writes it (developers who
want loops and classes like CDK or Pulumi; platform teams like HCL's plain reviewable diffs); what already exists
(rewriting working CloudFormation is rarely worth it); and how you will run it (state storage, locking, CI). Two
tools on the same resource is the one choice that is always wrong — they will fight.

## Cost and safety from the first file

Before any apply in your own account: the budget alarm from "A Safe AWS Account" must exist. IaC gives students a
gift here — **teardown is one command** (terraform destroy), so a practice environment lives for an evening, not a
month. Never put access keys in a file; the tools read credentials from your SSO session or role, as CL1 taught.`,
    mcqs: [
      mcq('MedSetu\'s setup script creates a bucket and enables versioning. It succeeds once and fails with BucketAlreadyOwnedByYou on the second run. Which property is the script missing?', [
        ['Idempotence: a re-run should find the bucket and change nothing', true],
        ['Atomicity: the two API calls should be one single transaction', false],
        ['Isolation: the script should run in a separate AWS account', false],
        ['Durability: the bucket should be replicated to ap-south-2', false],
      ], 'An idempotent definition can be applied again and converges with no changes; the script assumes an empty account, so the second run fails. Wrapping calls in a transaction, a separate account or replication would not stop it erroring on the already-existing bucket.'),
      mcq('After a security-group rule was edited in the console, which situation best describes what a declarative tool will report on its next plan?', [
        ['Drift: real state no longer matches the code, so it plans to put it back', true],
        ['Corruption: the state is now invalid and must be rebuilt from scratch', false],
        ['Nothing: changes made outside the tool are invisible to its next plan', false],
        ['A conflict that blocks every further apply until AWS Support resolves it', false],
      ], 'The plan reads real values and compares them with the code, so the console edit shows up as drift with a change back to the coded value. State is not corrupted, the change is visible precisely because the tool refreshes, and nothing needs AWS Support.'),
      mcq('A team proposes that Terraform should also upload each day\'s lab-report PDFs into the reports bucket it creates. What is the right response?', [
        ['No: Terraform owns the bucket; the application writes the reports', true],
        ['Yes: keeping data in Terraform means it is reviewed in pull requests', false],
        ['Yes, as long as the PDFs are marked sensitive in the configuration', false],
        ['No: Terraform cannot write objects into S3 buckets in any version', false],
      ], 'Infrastructure tools own the infrastructure; data and releases belong to the application and pipelines, otherwise every new file needs an apply and a destroy could remove patient data. Marking values sensitive does not change that, and Terraform technically can manage objects, which is why the boundary has to be a decision.'),
    ],
    checkpoint: [
      mcq('Which statement best describes a declarative infrastructure definition?', [
        ['It states the end result, and the tool works out the steps from what exists', true],
        ['It lists the API calls in order, and the tool replays them exactly on each run', false],
        ['It records every change ever made, and the tool replays the whole history', false],
        ['It holds a snapshot of the account, and the tool restores it on each apply', false],
      ], 'Declarative code describes desired state; the tool compares it with reality and plans the difference. Replaying steps is the imperative style, replaying history is event sourcing, and restoring a snapshot would wipe any legitimate data or change.'),
      mcq('MedSetu runs only on AWS, its engineers write Python, and it has no Terraform yet. Which choice is defensible for its first IaC tool?', [
        ['AWS CDK in Python, or Terraform: both fit a single-cloud team', true],
        ['Bicep, because it has no state file that the team must protect', false],
        ['Running two tools on each resource so that one can check the other', false],
        ['No tool until the team has moved every workload onto Kubernetes', false],
      ], 'For one cloud and a Python team, CDK (CloudFormation underneath) or Terraform are both sound; the choice turns on skills and operations. Bicep targets Azure only, two tools on the same resource fight each other, and IaC does not wait for Kubernetes.'),
      mcq('Which item should a company keep out of its Terraform code?', [
        ['The container image tag deployed with each release, many times a day', true],
        ['The IAM role that the application\'s EKS pods assume to read S3', false],
        ['The Route 53 alias record that points the API name at the load balancer', false],
        ['The KMS key used to encrypt the lab-report bucket and its replica', false],
      ], 'Frequent application releases belong to the CI/CD pipeline; putting each image tag in Terraform means an infrastructure apply per release. IAM roles, DNS records and KMS keys are long-lived infrastructure that Terraform should own.'),
    ],
  },
  /* ── TERRAFORM_BASICS ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_TERRAFORM_TERRAFORM_BASICS',
    notes: `MedSetu's first Terraform will build the bucket that holds lab-report PDFs in dev: versioned, private, with old
versions expiring. Small, but it uses every idea you need for the rest of the topic. (No Terraform binary was
available where this was written: every block below parses with python-hcl2, and the plan output is illustrative,
written from the documentation in Terraform's real format.)

## The files

Terraform reads every .tf file in a directory as one configuration; the file names are a convention for humans:

    reports/
      versions.tf        terraform block, required providers
      providers.tf       provider settings
      variables.tf       inputs
      main.tf            resources and data sources
      outputs.tf         values to print or pass on
      dev.tfvars         values for dev (no secrets)
      .terraform.lock.hcl   provider versions actually chosen - commit it

Add .terraform/ and *.tfstate* to .gitignore. The lock file goes **in** Git, so every laptop and CI run uses the
same provider build.

## Terraform and the provider

    terraform {
      required_version = ">= 1.11"
      required_providers {
        aws = {
          source  = "hashicorp/aws"
          version = "~> 6.0"
        }
      }
    }

    provider "aws" {
      region = var.region
      default_tags {
        tags = {
          project    = "medsetu"
          env        = var.env
          managed_by = "terraform"
        }
      }
    }

A **provider** is a plugin that turns resources into API calls. "~> 6.0" means 6.0 or later but below 7.0: minor
upgrades allowed, a major (which may rename arguments) never by accident. default_tags puts the tags on every
resource, which the cost reports from CL1 depend on. Credentials are **not** here: the provider reads them from the
environment, so run aws sso login --profile medsetu-dev and then AWS_PROFILE=medsetu-dev terraform plan.

## Variables, locals, data sources and resources

    variable "region" {
      type    = string
      default = "ap-south-1"
    }

    variable "env" {
      type        = string
      description = "dev, staging or prod"
      validation {
        condition     = contains(["dev", "staging", "prod"], var.env)
        error_message = "env must be dev, staging or prod."
      }
    }

    variable "noncurrent_days" {
      type    = number
      default = 30
    }

    data "aws_caller_identity" "current" {}

    locals {
      bucket_name = "medsetu-reports-\${var.env}-\${data.aws_caller_identity.current.account_id}"
    }

    resource "aws_s3_bucket" "reports" {
      bucket = local.bucket_name
    }

    resource "aws_s3_bucket_versioning" "reports" {
      bucket = aws_s3_bucket.reports.id
      versioning_configuration {
        status = "Enabled"
      }
    }

    resource "aws_s3_bucket_public_access_block" "reports" {
      bucket                  = aws_s3_bucket.reports.id
      block_public_acls       = true
      block_public_policy     = true
      ignore_public_acls      = true
      restrict_public_buckets = true
    }

    resource "aws_s3_bucket_lifecycle_configuration" "reports" {
      bucket = aws_s3_bucket.reports.id
      rule {
        id     = "expire-noncurrent"
        status = "Enabled"
        filter {}
        noncurrent_version_expiration {
          noncurrent_days = var.noncurrent_days
        }
      }
    }

    output "reports_bucket_arn" {
      value = aws_s3_bucket.reports.arn
    }

- A **resource** block has a type (aws_s3_bucket) and a local name (reports); together they are its **address**,
  aws_s3_bucket.reports. **Arguments** are what you set; **attributes** such as arn and id are what AWS returns.
- A **data source** reads something that exists without managing it — here the account id, so bucket names are
  globally unique without hard-coding 123456789012.
- **References** (aws_s3_bucket.reports.id) are how Terraform learns the order: the versioning resource waits for
  the bucket. You rarely need depends_on; reach for it only for a dependency Terraform cannot see.
- **Validation** fails the plan with your message instead of letting env = "prd" build a fourth environment.
- Variable values come from, lowest priority first: defaults, TF_VAR_env environment variables, terraform.tfvars,
  *.auto.tfvars, then -var and -var-file on the command line. Prefer one explicit -var-file=dev.tfvars per run.

## The loop

    terraform init                          downloads providers, sets up the backend, writes the lock file
    terraform fmt                           rewrites files in the standard style
    terraform validate                      checks syntax and types, no AWS calls for resources
    terraform plan -var-file=dev.tfvars -out=tfplan
    terraform apply tfplan                  applies exactly the plan you read
    terraform destroy -var-file=dev.tfvars  removes everything this configuration manages

The first plan, trimmed (a real one lists every attribute):

    Terraform used the selected providers to generate the following execution
    plan. Resource actions are indicated with the following symbols:
      + create

    Terraform will perform the following actions:

      # aws_s3_bucket.reports will be created
      + resource "aws_s3_bucket" "reports" {
          + arn           = (known after apply)
          + bucket        = "medsetu-reports-dev-123456789012"
          + force_destroy = false
          + id            = (known after apply)
          + tags_all      = {
              + "env"        = "dev"
              + "managed_by" = "terraform"
              + "project"    = "medsetu"
            }
        }

    Plan: 4 to add, 0 to change, 0 to destroy.

    Changes to Outputs:
      + reports_bucket_arn = (known after apply)

**Symbols:** + create, ~ update in place, - destroy, -/+ destroy and then create a replacement, +/- create the
replacement first (create_before_destroy), <= read a data source. "(known after apply)" means AWS decides the
value. **Always read the summary line first**, then every - and -/+.

Apply with a saved plan runs without a prompt, which is what CI needs; a plain terraform apply recomputes the plan
and asks for "yes". When you finish practising, terraform destroy and check the console is empty — a versioned
bucket must be emptied (all versions) before S3 lets it go; force_destroy = true does that for throwaway dev
buckets only, never for patient data.`,
    workedExample: `**Scenario.** MedSetu also needs buckets for invoices and scanned prescriptions in dev, configured exactly like
reports. A colleague copies the block twice. Do better, and read the plan when someone renames one.

**1. One block, a set of names.** for_each over a set gives one instance per key:

    variable "stores" {
      type    = set(string)
      default = ["reports", "invoices", "scans"]
    }

    resource "aws_s3_bucket" "store" {
      for_each = var.stores
      bucket   = "medsetu-\${each.key}-\${var.env}-\${data.aws_caller_identity.current.account_id}"
    }

    resource "aws_s3_bucket_versioning" "store" {
      for_each = aws_s3_bucket.store
      bucket   = each.value.id
      versioning_configuration {
        status = "Enabled"
      }
    }

Addresses become aws_s3_bucket.store["reports"], aws_s3_bucket.store["invoices"] and aws_s3_bucket.store["scans"].
The versioning resource iterates over the buckets themselves, so each.value is a bucket object.

**2. Why not count = 3 with a list?** count gives addresses store[0], store[1], store[2]. Remove "invoices" from the
middle of the list and "scans" moves from index 2 to 1: Terraform plans to change store[1] into the scans bucket's
name (a replacement) and destroy store[2]. With for_each the keys are names, so removing "invoices" touches only
store["invoices"]. Use count for "zero or one" (count = var.enable_replica ? 1 : 0); use for_each for collections.

**3. Someone renames "scans" to "prescriptions".** The illustrative plan:

      # aws_s3_bucket.store["prescriptions"] will be created
      + resource "aws_s3_bucket" "store" {
          + bucket = "medsetu-prescriptions-dev-123456789012"
        }

      # aws_s3_bucket.store["scans"] will be destroyed
      # (because key ["scans"] is not in for_each map)
      - resource "aws_s3_bucket" "store" {
          - bucket = "medsetu-scans-dev-123456789012" -> null
        }

    Plan: 2 to add, 0 to change, 2 to destroy.

(Two of each, because the versioning resource follows its bucket.) The destroy will fail on a non-empty bucket —
which is the safety you want — but in prod you would not let it get that far.

**4. The review comment.** "A bucket name cannot change in place; this deletes scans. If we really want the new
name, copy the objects first, or keep the bucket and add a tag instead."

**Result.** One block for three buckets, stable addresses, and a reviewer who reads "2 to destroy" before anything
happens.`,
    mcqs: [
      mcq('A plan line reads -/+ resource "aws_s3_bucket" "reports" with bucket = "medsetu-reports-dev-..." -> "medsetu-labreports-dev-..." # forces replacement. What will apply try to do?', [
        ['Delete the old bucket and then create one under the new name', true],
        ['Rename the bucket in place, keeping every object and version', false],
        ['Create the new bucket and copy every object over before deleting', false],
        ['Only update the tag that shows the name and leave the bucket', false],
      ], 'S3 bucket names cannot change, so -/+ means destroy and create a new, empty bucket; the delete fails if the bucket still holds objects. Terraform never renames in place here and never copies data, and the name is not a tag.'),
      mcq('MedSetu sets version = "~> 6.0" for the AWS provider. Which provider release could terraform init -upgrade select?', [
        ['6.14.0, since any 6.x at or above 6.0 is allowed', true],
        ['7.0.0, since it is the newest major release out', false],
        ['5.99.0, since lower versions are always allowed', false],
        ['Only 6.0.0 exactly, since ~> pins one release', false],
      ], '"~> 6.0" allows 6.0 and later minors but stops before 7.0, so 6.14.0 fits. 7.0.0 is the next major and excluded, 5.x is below the floor, and an exact pin would be "= 6.0.0" (or "~> 6.0.0" for patches only).'),
      mcq('An engineer removes "invoices" from the middle of a three-item list used with count on aws_s3_bucket.store. Why does the plan show a replacement as well as a destroy?', [
        ['The last bucket shifts to a lower index and its name no longer matches', true],
        ['count resources are always replaced together whenever the list changes', false],
        ['Terraform sorts count lists alphabetically and must rebuild the order', false],
        ['Removing any list item invalidates the lock file for the AWS provider', false],
      ], 'count addresses are positions: "scans" moves from [2] to [1], so [1] must become a different bucket (replace) and [2] is destroyed. Only the shifted items change, Terraform does not sort the list, and the provider lock file is unrelated. for_each keyed by name avoids this.'),
    ],
    checkpoint: [
      mcq('Where should the AWS provider get its credentials when an engineer runs terraform plan for dev?', [
        ['From the environment, such as an SSO profile set in AWS_PROFILE', true],
        ['From access_key and secret_key arguments in the provider block', false],
        ['From a dev.tfvars file committed next to the configuration files', false],
        ['From the state file, which stores the credentials of the last apply', false],
      ], 'The provider reads the standard AWS credential chain, so short-lived SSO or role credentials never enter the code. Keys in the provider block or a committed tfvars file leak through Git, and state does not hold provider credentials.'),
      mcq('Why does aws_s3_bucket_versioning.reports get created after aws_s3_bucket.reports without any depends_on?', [
        ['Its bucket argument references aws_s3_bucket.reports.id', true],
        ['Terraform creates resources in the order of the files', false],
        ['Terraform creates resources alphabetically by their type', false],
        ['The AWS provider always creates buckets before others', false],
      ], 'References build the dependency graph, so the versioning resource waits for the bucket id. File order, alphabetical order and any provider-wide rule play no part; resources without dependencies are created in parallel.'),
      mcq('Which situation is the right use of count instead of for_each?', [
        ['Creating a replica bucket only when var.enable_dr is true', true],
        ['Creating one bucket for each name in a set of store names', false],
        ['Creating one IAM user for each engineer listed in a map', false],
        ['Creating one DNS record for each clinic in a list of clinics', false],
      ], 'count = var.enable_dr ? 1 : 0 is the idiom for an optional resource. Collections of named things should use for_each so that removing one item does not shift the addresses of the rest.'),
    ],
  },
  /* ── TERRAFORM_STATE ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_TERRAFORM_TERRAFORM_STATE',
    notes: `After the first apply, MedSetu's reports directory has a new file: terraform.tfstate. It is the most important
and most dangerous file in the repository folder, and it must not stay there.

## What state is

State is Terraform's record of which real object each address manages, with every attribute it last saw:

    {
      "version": 4,
      "serial": 7,
      "lineage": "6c0e3f2a-...",
      "resources": [
        { "mode": "managed", "type": "aws_s3_bucket", "name": "reports",
          "instances": [ { "attributes": { "id": "medsetu-reports-dev-123456789012", "arn": "...", ... } } ] }
      ]
    }

Without it, Terraform cannot tell "create a bucket" from "that bucket is mine already". serial goes up on every
write; lineage identifies this state's history, so Terraform refuses to overwrite it with an unrelated state.
terraform state list prints the addresses, terraform state show aws_s3_bucket.reports one resource.

**State is sensitive.** It holds every attribute in plain text — including a database password passed in a
variable, the result of random_password, or a private key from tls_private_key. Marking a variable sensitive = true
hides it in plan output; **it is still written to state**. So: keep secrets out of state where you can (RDS's
manage_master_user_password = true lets Secrets Manager hold the password, as in "Managed Relational Databases: RDS and Aurora"; Terraform 1.11
adds write-only arguments for the same purpose), and treat the state store as a secret store: encrypted, versioned,
readable only by the people and roles who run Terraform. Never commit it.

## A remote backend on S3, with locking

Local state fails the moment two people or a CI job are involved: each has a different copy, and two applies at
once can create duplicates or lose track of resources. A backend stores state centrally:

    terraform {
      backend "s3" {
        bucket       = "medsetu-tfstate-123456789012"
        key          = "reports/dev/terraform.tfstate"
        region       = "ap-south-1"
        encrypt      = true
        use_lockfile = true
      }
    }

use_lockfile (Terraform 1.10 and later) takes a lock by writing reports/dev/terraform.tfstate.tflock beside the
state with a conditional write; older setups used a DynamoDB table (dynamodb_table), which is now deprecated. While
one plan or apply holds the lock, any other gets:

    Error: Error acquiring the state lock

    Error message: ...
    Lock Info:
      ID:        3f2b6a1e-9c4d-4b7e-8a51-0d2e6f9b1c7a
      Path:      medsetu-tfstate-123456789012/reports/dev/terraform.tfstate
      Operation: OperationTypeApply
      Who:       runner@ci-7f3c
      Version:   1.13.3
      Created:   2026-10-20 09:14:03.512 +0000 UTC

That is the lock doing its job — wait. A lock left behind by a cancelled CI run is removed with terraform
force-unlock 3f2b6a1e-..., **only after** confirming the holder is really dead; unlocking under a running apply is how
state gets corrupted. (Illustrative output, written from the documentation.)

**Backend blocks cannot use variables.** For several environments, leave the values out (backend "s3" {}) and pass
a file: terraform init -backend-config=backend/prod.hcl. Changing the backend later needs terraform init
-migrate-state, which copies state to the new place.

**The chicken and the egg.** The state bucket must exist before any backend can use it. Create it once with a tiny
separate configuration on local state, or a reviewed script. This ran against moto:

    bootstrap_state_bucket(s3, "medsetu-tfstate-123456789012")   # create, versioning, KMS, public block

    location   ap-south-1
    versioning Enabled
    encryption aws:kms
    public     {'BlockPublicAcls': True, 'IgnorePublicAcls': True, 'BlockPublicPolicy': True,
                'RestrictPublicBuckets': True}

The roles that run Terraform need s3:ListBucket on the bucket, s3:GetObject and s3:PutObject on the state key, and
GetObject, PutObject and DeleteObject on the .tflock key — and nobody else needs anything. On Azure, the azurerm
backend keeps state in a Blob Storage container and locks with a blob lease.

**Versioning is your undo.** If a bad operation writes a broken state, the previous version is still there. In the
same moto run, two writes left two versions and the older one came back intact:

    versions   2
    older      {"serial": 41}

Restore by copying the older version back over the key (with every Terraform run stopped), then run a plan and
read it carefully before anything else.

## Changing state without breaking things

Terraform 1.5 and later let you change state through **code that is reviewed**, instead of one-off commands.

**Importing what already exists.** A console-built bucket comes under management with an import block:

    import {
      to = aws_s3_bucket.legacy_scans
      id = "medsetu-legacy-scans"
    }

terraform plan -generate-config-out=generated.tf writes a starting resource block for you to tidy; the plan then
shows "will be imported" and the summary counts it ("Plan: 1 to import, 0 to add, 0 to change, 0 to destroy.").
Aim for a plan with **no** changes besides the import: it proves your code describes reality.

**Renaming an address.** Moving a resource into for_each or a module changes its address; without help, Terraform
plans destroy-and-create. A moved block says it is the same object:

    moved {
      from = aws_s3_bucket.reports
      to   = aws_s3_bucket.store["reports"]
    }

**Letting go without deleting.** To hand a resource to another stack or leave it alone:

    removed {
      from = aws_s3_bucket.legacy_scans
      lifecycle {
        destroy = false
      }
    }

The older commands terraform state mv and terraform state rm do the same, immediately and with no review — keep
them for emergencies, take a copy (terraform state pull > backup.tfstate) first, and write down what you ran.

**Accepting drift deliberately.** terraform apply -refresh-only updates state to match reality without changing
any infrastructure — for example after AWS changed a default. It changes nothing in AWS; read its plan anyway.`,
    workedExample: `**Scenario.** Years ago someone created medsetu-legacy-scans by hand. It holds scanned prescriptions that must be
kept, it has no versioning, and the security team wants it managed by code. Nobody may delete it, even by accident.

**1. Import, do not recreate.** Creating a "new" bucket with the same name fails (names are global and it exists).
Write the import block and generate the configuration:

    import {
      to = aws_s3_bucket.legacy_scans
      id = "medsetu-legacy-scans"
    }

and run terraform plan -generate-config-out=generated.tf.

**2. Tidy the generated block.** It lists many attributes with their current values; keep the ones you mean
(bucket, tags), delete computed noise, and move it into main.tf. Add the guard:

    resource "aws_s3_bucket" "legacy_scans" {
      bucket = "medsetu-legacy-scans"
      lifecycle {
        prevent_destroy = true
      }
    }

prevent_destroy makes any plan that would destroy this resource fail with an error, so a typo cannot delete it.

**3. Prove the code matches reality.** The plan should read, in substance (illustrative):

      # aws_s3_bucket.legacy_scans will be imported
        resource "aws_s3_bucket" "legacy_scans" {
            bucket = "medsetu-legacy-scans"
            id     = "medsetu-legacy-scans"
            # (attributes trimmed)
        }

    Plan: 1 to import, 0 to add, 0 to change, 0 to destroy.

If it also shows "~ update in-place", your code differs from reality; decide whether that change is wanted before
applying.

**4. Then improve it, in a separate change.** A second pull request adds aws_s3_bucket_versioning and the public
access block for the bucket. Importing and changing in one step hides which differences were intended.

**5. Remove the import block** after the apply, or leave it — once imported it is a no-op. Record in the README that
the bucket predates Terraform.

**Result.** The bucket is in state and in code, protected against deletion, and every later change goes through a
plan.`,
    mcqs: [
      mcq('A variable db_password is declared with sensitive = true and passed to aws_db_instance. Where can someone with read access to the state bucket still see the password?', [
        ['In the state file, which stores the value in plain text', true],
        ['Nowhere, because sensitive values are never written out', false],
        ['Only in the plan output saved by the last CI pipeline run', false],
        ['Only in CloudTrail, which logs the CreateDBInstance call', false],
      ], 'sensitive hides a value in plan and apply output, but state records every attribute, so the password is readable there. That is why secrets are kept out of state (for example manage_master_user_password) and the state store is locked down. Plan output redacts it, and CloudTrail redacts password parameters.'),
      mcq('A CI job was cancelled mid-apply and every later run fails with "Error acquiring the state lock". What should the engineer do first?', [
        ['Confirm no apply is still running, then force-unlock that lock ID', true],
        ['Delete terraform.tfstate so that Terraform builds a fresh copy', false],
        ['Run the next apply with -lock=false so that it can go through', false],
        ['Remove use_lockfile from the backend block and re-run terraform init', false],
      ], 'The lock may belong to a process that is still writing; once it is confirmed dead, terraform force-unlock with the ID from Lock Info clears it. Deleting state loses track of everything, and disabling locking or removing it invites two writers at once.'),
      mcq('An engineer moves aws_s3_bucket.reports into a for_each resource as aws_s3_bucket.store["reports"]. The plan shows 1 to add and 1 to destroy. What is the reviewed fix?', [
        ['Add a moved block from the old address to the new one', true],
        ['Run terraform apply and then re-import the deleted bucket', false],
        ['Add depends_on from the new resource to the old resource', false],
        ['Use terraform apply -refresh-only to accept the new address', false],
      ], 'A moved block records that the object only changed address, so the plan becomes a move with no destroy, and it is reviewed like any code. Applying first deletes the bucket, depends_on orders operations without renaming anything, and refresh-only syncs attributes, not addresses.'),
    ],
    checkpoint: [
      mcq('Why does MedSetu enable versioning on the bucket that holds Terraform state?', [
        ['So a state overwritten by a bad run can be restored from a prior version', true],
        ['So that Terraform can read several environments from a single state object', false],
        ['Because the S3 backend refuses to store state in unversioned buckets', false],
        ['So that two engineers can write state at once and both writes are kept', false],
      ], 'Versioning keeps earlier copies, which is the recovery path when state is damaged. Environments use separate keys, not versions, the backend works without versioning (it is just unwise), and simultaneous writes are prevented by the lock, not merged by versioning.'),
      mcq('A backend block reads bucket = var.state_bucket and terraform init fails. What is the supported way to vary the backend per environment?', [
        ['Leave values out and pass -backend-config=backend/prod.hcl to init', true],
        ['Use a local value instead, because locals are allowed in a backend', false],
        ['Set TF_VAR_state_bucket, because backends read environment values', false],
        ['Put the backend block inside a module and pass the bucket as an input', false],
      ], 'Backend configuration is read before variables exist, so neither variables nor locals are allowed; partial configuration supplies the values at init. TF_VAR_ sets input variables only, and backends cannot be declared in child modules.'),
      mcq('A console-built bucket must come under Terraform without being recreated. Which plan result shows the import was written correctly?', [
        ['Plan: 1 to import, 0 to add, 0 to change, 0 to destroy.', true],
        ['Plan: 1 to import, 1 to add, 0 to change, 1 to destroy.', false],
        ['Plan: 0 to import, 1 to add, 0 to change, 0 to destroy.', false],
        ['Plan: 1 to import, 0 to add, 3 to change, 0 to destroy.', false],
      ], 'An import whose code matches reality changes nothing else. A destroy-and-add means the code forces replacement, "1 to add" with no import would try to create a duplicate, and in-place changes mean the code differs from the real bucket and need a decision first.'),
    ],
  },
  /* ── TERRAFORM_MODULES ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_TERRAFORM_TERRAFORM_MODULES',
    notes: `MedSetu now has buckets in three places, each with versioning, a public access block and a lifecycle rule —
copied, and already slightly different. It also needs dev, staging and prod, in three AWS accounts (CL1's
"Multi-Account Setups, Tags and Guardrails"). Modules remove the copying; a clear environment layout keeps the
copies of the platform apart.

## A module is a directory

Every directory of .tf files is a module. The one you run terraform in is the **root module**; the ones it calls
are **child modules**. A child module has inputs (variables), outputs, and resources; it should **not** contain a
provider block or a backend — those belong to the root, so the same module works in any account or region.

    modules/secure_bucket/variables.tf
    variable "name" {
      type = string
    }

    variable "noncurrent_days" {
      type    = number
      default = 30
    }

    modules/secure_bucket/main.tf
    resource "aws_s3_bucket" "this" {
      bucket = var.name
    }

    resource "aws_s3_bucket_versioning" "this" {
      bucket = aws_s3_bucket.this.id
      versioning_configuration {
        status = "Enabled"
      }
    }

    resource "aws_s3_bucket_public_access_block" "this" {
      bucket                  = aws_s3_bucket.this.id
      block_public_acls       = true
      block_public_policy     = true
      ignore_public_acls      = true
      restrict_public_buckets = true
    }

    modules/secure_bucket/outputs.tf
    output "id" {
      value = aws_s3_bucket.this.id
    }

    output "arn" {
      value = aws_s3_bucket.this.arn
    }

Calling it:

    module "reports_bucket" {
      source          = "../../modules/secure_bucket"
      name            = "medsetu-reports-\${var.env}-\${data.aws_caller_identity.current.account_id}"
      noncurrent_days = 90
    }

The caller reads module.reports_bucket.arn; inside, the resource's address becomes
module.reports_bucket.aws_s3_bucket.this. **A good module is opinionated where safety is concerned** (there is no
input to make the bucket public) **and small everywhere else** — a module with forty inputs is a second copy of
the provider's documentation. In the module's own terraform block, state the provider with a minimum (">= 6.0")
and let the root pin the exact range, so two modules cannot demand conflicting versions.

**Two regions.** For the disaster-recovery copy in Hyderabad, the root declares a second provider with an alias and
hands it to the module, which simply uses "aws":

    provider "aws" {
      alias  = "hyd"
      region = "ap-south-2"
    }

    module "reports_dr_bucket" {
      source = "../../modules/secure_bucket"
      name   = "medsetu-reports-dr-\${var.env}-\${data.aws_caller_identity.current.account_id}"
      providers = {
        aws = aws.hyd
      }
    }

## Versioning modules

Inside one repository, a relative source is fine. Shared across teams, modules live in their own repository and
are called **by tag**:

    source = "git::https://github.com/medsetu/terraform-modules.git//secure_bucket?ref=v1.3.0"

Use semantic versions: a new optional input is a minor release; renaming an input or changing what is created is
a major one, with moved blocks inside the module so callers' resources are not destroyed. Never point production at
a branch — "main" today is not "main" next week. The version argument exists only for registry sources; for Git
sources the ref is the version.

## Registry modules, carefully

terraform-aws-modules/vpc/aws builds a full VPC in a few lines and is widely used. Before adopting any registry
module: read what it creates (its defaults may add NAT gateways in every AZ — a real bill), read its inputs for
the major version you pin, check it is maintained, pin it (version = "~> 6.0" at most, or an exact version), and
read the plan of the first apply line by line. A module you cannot read is a module you cannot debug at 2 a.m.

## One codebase, three environments

**Directory per environment (recommended):**

    infra/
      modules/secure_bucket/   modules/network/   modules/app/
      envs/dev/       main.tf  backend.hcl  dev.tfvars
      envs/staging/   main.tf  backend.hcl  staging.tfvars
      envs/prod/      main.tf  backend.hcl  prod.tfvars

Each env directory calls the same modules (prod pinned to a tag that has passed staging), has its own state key,
and its provider refuses the wrong account:

    provider "aws" {
      region              = "ap-south-1"
      allowed_account_ids = ["123456789012"]
      assume_role {
        role_arn = "arn:aws:iam::123456789012:role/terraform-prod"
      }
    }

**CLI workspaces** keep several states for one directory (terraform workspace new staging; the code reads
terraform.workspace; the S3 backend stores them under env:/staging/...). They suit short-lived identical copies,
such as a per-feature test stack. For prod they are weak: the same backend and credentials serve every workspace,
and which one is selected is invisible in the code — terraform apply in the wrong workspace changes production.
(HCP Terraform's "workspaces" are a different idea: a separate run environment per configuration.)

## Keep the differences in values

Environments should differ in **values** (instance sizes, counts, retention) held in tfvars, not in code paths.
Secrets never go in tfvars: they live in Secrets Manager or SSM Parameter Store and are referenced by name. And
split big estates into **layers** with separate state — network, data, apps — so an app change cannot plan a
VPC deletion. Layers find each other through data sources (look up the VPC by its tag) or SSM parameters the
lower layer writes; terraform_remote_state works too but gives the reader the whole of the other state.`,
    workedExample: `**Scenario.** MedSetu's prod root for the reports service must use the shared bucket module at the version that
passed staging, run only against the prod account, keep a DR bucket in Hyderabad, and differ from dev only in
values. Write envs/prod and say what a reviewer checks.

**1. Backend, partially configured.** envs/prod/main.tf has backend "s3" {}; envs/prod/backend.hcl holds:

    bucket       = "medsetu-tfstate-123456789012"
    key          = "reports/prod/terraform.tfstate"
    region       = "ap-south-1"
    encrypt      = true
    use_lockfile = true

init runs as terraform init -backend-config=backend.hcl. Dev's file differs only in key (reports/dev/...).

**2. Providers with a guard.** The default provider assumes terraform-prod in account 123456789012 with
allowed_account_ids set, and an aliased provider "hyd" does the same in ap-south-2. A credential mix-up now fails at
plan time instead of creating prod buckets in dev.

**3. Modules at a tag.**

    module "reports_bucket" {
      source          = "git::https://github.com/medsetu/terraform-modules.git//secure_bucket?ref=v1.3.0"
      name            = "medsetu-reports-prod-123456789012"
      noncurrent_days = var.noncurrent_days
    }

Staging calls ?ref=v1.4.0 this week; prod moves to v1.4.0 by its own pull request once staging is happy.

**4. Values.** prod.tfvars: noncurrent_days = 365 (medical-record retention, agreed with the compliance lead); dev:
7. Nothing else differs. No password, key or token appears in any tfvars file.

**5. What the reviewer checks.** The ref is a tag, not a branch; the backend key says prod; the plan's summary
creates only buckets and their settings; the DR bucket is in ap-south-2 (data stays in India, which matters for
health data); and the plan was run with the prod role, not someone's admin session.

**Result.** Three environments from one module, each in its own account and state, differing only in tfvars and
the module version they have reached.`,
    mcqs: [
      mcq('A shared module contains provider "aws" { region = "ap-south-1" }. What problem does this cause for teams that call it?', [
        ['Callers cannot point it at another region or account through providers', true],
        ['Terraform refuses to run any module that declares its own provider block', false],
        ['Every call of the module downloads a separate copy of the AWS provider', false],
        ['The module\'s resources are left out of the root module\'s state file', false],
      ], 'A provider configured inside a child module fixes its region and credentials, so the DR call to ap-south-2 cannot work, and such modules cannot be used with for_each or count. Terraform allows it (legacy), plugins are shared, and the resources still land in the root\'s state.'),
      mcq('Prod calls a Git module with ?ref=main. What is the risk?', [
        ['A merge to main changes prod\'s next plan with no prod change reviewed', true],
        ['Git sources cannot be used by Terraform for any production configuration', false],
        ['Terraform will refuse to download a module from a branch that is called main', false],
        ['Branch refs make every plan re-create all of the resources in that module', false],
      ], 'A branch moves, so prod silently picks up whatever lands in main the next time it initialises. Pinning to a tag makes the upgrade its own reviewed change. Git sources are common in production, branch refs download fine, and they do not force replacements by themselves.'),
      mcq('Why is a directory per environment usually preferred over CLI workspaces for separating dev and prod?', [
        ['Each environment has its own visible backend, credentials and tfvars', true],
        ['Workspaces cannot store their state files in the S3 remote backend', false],
        ['Workspaces force all of the environments to use exactly the same values', false],
        ['Directories let Terraform apply all environments in a single run', false],
      ], 'With directories the environment is explicit in the path, backend key and provider settings, so applying prod by mistake is hard. Workspaces do work with S3 (under env:/), can read different values through terraform.workspace, and directories are applied one at a time on purpose.'),
    ],
    checkpoint: [
      ck(CFG, 'Dev and prod use the same modules. Prod needs bigger instances and longer retention. Where should those differences live?', [
        ['In each environment\'s tfvars, with the code the same', true],
        ['In if-prod conditions written throughout the modules', false],
        ['In separate copies of the modules, one for each env', false],
        ['In environment variables set by hand on each laptop', false],
      ], 'Keeping the code identical and the values per environment makes environments comparable and reviewable. Prod conditions scattered through modules make dev untestable for prod paths, copied modules drift, and hand-set variables are invisible to review.'),
      mcq('Which practice best guards against applying the prod configuration with dev credentials?', [
        ['allowed_account_ids set to the prod account in the provider', true],
        ['A comment at the top of main.tf saying "prod only, be careful"', false],
        ['A default_tags block that tags every resource with env = prod', false],
        ['A larger -parallelism value, so that prod applies finish faster', false],
      ], 'allowed_account_ids makes the provider fail if its credentials belong to another account. Comments do not stop anything, tags label resources after the fact, and parallelism only changes how many operations run at once.'),
      mcq('A large estate keeps network, database and app resources in one state. What is the main benefit of splitting it into layered states?', [
        ['A change to one layer cannot plan changes to the others', true],
        ['Terraform needs no lock once the state is split into parts', false],
        ['Each layer can then use a different version of HCL syntax', false],
        ['The layers no longer need any outputs or shared identifiers', false],
      ], 'Separate states limit the blast radius and speed up plans: an app change cannot touch the VPC. Each layer still needs locking, HCL is the same everywhere, and layers still share identifiers through outputs, data sources or SSM parameters.'),
    ],
  },
  /* ── IAC_PIPELINE ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_TERRAFORM_IAC_PIPELINE',
    notes: `Until now a MedSetu engineer ran terraform apply from a laptop. That works for one person; with five, nobody knows
which code produced production, laptops hold powerful credentials, and review is optional. The fix is the same as
for application code (Year 3's "Building the Pipeline"): every infrastructure change is a pull request, a pipeline
proves it and shows its plan, and only the pipeline applies.

## What runs on every pull request

1. **terraform fmt -check -recursive** — formatting is not a review topic.
2. **terraform init** and **terraform validate** — syntax, types, missing variables. (validate needs init; in a job
   with no cloud access use terraform init -backend=false.)
3. **Linters and static policy on the code** — TFLint for provider-specific mistakes (an invalid instance type);
   Trivy's config scanning (which absorbed tfsec) or Checkov for insecure settings: a public bucket, an unencrypted
   volume, a security group open to 0.0.0.0/0. A justified exception is written in the code with a reason, e.g.
   #checkov:skip=CKV_AWS_18:access logs for this bucket go to the central trail — so the exception is reviewed too.
4. **terraform plan** for each environment the change touches, with a read-only role, saved with -out.
5. **Policy on the plan** — the plan as JSON (terraform show -json tfplan) lists every resource change with its
   actions, so rules can ask "would this delete a database?", which a code scan cannot see.
6. **The plan, posted** to the pull request or the job summary, where the reviewer reads it.

## Applying from CI

Merging to main plans again (main may have moved since the PR), and the apply job — gated by a GitHub environment
with required reviewers — applies **that saved plan file**, so what was approved is exactly what runs. If the state
changed in between, Terraform refuses with "Saved plan is stale" and you re-plan. The workflow (parsed with PyYAML;
not run — no repository or account was used):

    name: infra-prod
    on:
      pull_request:
        paths: ["infra/**"]
      push:
        branches: [main]
        paths: ["infra/**"]

    permissions:
      id-token: write
      contents: read

    concurrency:
      group: terraform-prod
      cancel-in-progress: false

    defaults:
      run:
        working-directory: infra/envs/prod

    jobs:
      plan:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - uses: hashicorp/setup-terraform@v3
            with:
              terraform_version: 1.13.3
              terraform_wrapper: false
          - uses: aws-actions/configure-aws-credentials@v4
            with:
              role-to-assume: arn:aws:iam::123456789012:role/terraform-plan
              aws-region: ap-south-1
          - run: terraform fmt -check -recursive ../..
          - run: terraform init -input=false -backend-config=backend.hcl
          - run: terraform validate
          - run: terraform plan -input=false -var-file=prod.tfvars -out=tfplan
          - run: terraform show -json tfplan > tfplan.json
          - run: python ../../ci/plan_guard.py tfplan.json
          - run: terraform show -no-color tfplan >> "$GITHUB_STEP_SUMMARY"
          - uses: actions/upload-artifact@v4
            with:
              name: tfplan
              path: infra/envs/prod/tfplan
              retention-days: 1

      apply:
        if: github.event_name == 'push'
        needs: plan
        runs-on: ubuntu-latest
        environment: production
        steps:
          - uses: actions/checkout@v4
          - uses: hashicorp/setup-terraform@v3
            with:
              terraform_version: 1.13.3
              terraform_wrapper: false
          - uses: aws-actions/configure-aws-credentials@v4
            with:
              role-to-assume: arn:aws:iam::123456789012:role/terraform-apply
              aws-region: ap-south-1
          - uses: actions/download-artifact@v4
            with:
              name: tfplan
              path: infra/envs/prod
          - run: terraform init -input=false -backend-config=backend.hcl
          - run: terraform apply -input=false tfplan

Points that matter:

- **No keys anywhere.** OIDC gives the job short-lived credentials (CL2's "GitHub Actions to AWS with OIDC"). The
  plan role's trust policy accepts the repository's pull requests and main branch and grants read-only access plus
  the state bucket; the apply role trusts only repo:medsetu/infra:environment:production.
- **Plan runs code.** Providers and data "external" execute during plan, so a malicious pull request could act with
  the plan role. Keep that role read-only, and never give fork pull requests cloud credentials.
- **One at a time.** The concurrency group queues runs instead of racing (the state lock is the second line).
- **Plan files are secrets.** A saved plan contains the configuration and state values, so the artifact lives for a
  day and only this workflow can read it. terraform_wrapper: false keeps the setup action's wrapper from adding its
  own lines to redirected output.
- **Nobody applies prod from a laptop** — the human role for prod is read-only, with a break-glass role for
  emergencies that alerts when used.

## Policy as code, in outline

The Python guard in the worked example is one way. Open Policy Agent is the common general tool: policies in Rego,
run against the plan JSON with conftest test tfplan.json. Written from the documentation, not run:

    package main

    import rego.v1

    deny contains msg if {
      rc := input.resource_changes[_]
      rc.type == "aws_db_instance"
      "delete" in rc.change.actions
      msg := sprintf("%s would be deleted or replaced", [rc.address])
    }

## Drift detection

A scheduled job (nightly, or hourly for prod) runs terraform plan -detailed-exitcode for each environment. Exit code
0 means no changes, 1 an error, **2 a non-empty plan** — on a branch where nothing was merged, that is drift. The
job alerts the team; someone finds the change in CloudTrail and decides: **revert** (apply the code, which puts the
setting back) or **adopt** (a pull request that changes the code to match, so the next plan is empty). Leaving it
means the next unrelated apply silently reverts it.`,
    workedExample: `**Scenario.** A pull request titled "appointments DB: PostgreSQL 17 and encryption" reaches MedSetu's
pipeline. fmt, validate and Checkov pass. The plan-JSON guard fails. Read what it says and decide.

**1. The guard.** It walks resource_changes and blocks deletes or replacements of resource types that hold data.
Run in Python against a hand-written plan file shaped like terraform show -json output:

    PROTECTED = {"aws_db_instance", "aws_s3_bucket", "aws_dynamodb_table", "aws_kms_key"}

    def review(plan):
        problems, counts = [], {"create": 0, "update": 0, "delete": 0, "replace": 0}
        for rc in plan.get("resource_changes", []):
            actions = rc["change"]["actions"]
            if actions in (["delete", "create"], ["create", "delete"]):
                counts["replace"] += 1
                kind = "replaced"
            elif actions == ["delete"]:
                counts["delete"] += 1
                kind = "deleted"
            else:
                for a in actions:
                    if a in counts:
                        counts[a] += 1
                continue
            if rc["type"] in PROTECTED:
                problems.append(f"{rc['address']} would be {kind}")
        return counts, problems

Output, and the process exited 1 so the job failed:

    {'create': 1, 'update': 1, 'delete': 1, 'replace': 1}
    BLOCK: aws_db_instance.appointments would be replaced

**2. Why a replacement?** The plan marks storage_encrypted = false -> true "# forces replacement". Encryption at rest
is chosen when an RDS instance is created (CL1's "Managed Relational Databases: RDS and Aurora"), so Terraform's only
way to honour the line is to destroy the database and create a new, empty one. The engine bump alone (with
allow_major_version_upgrade = true) would have been an in-place update with downtime in the maintenance window.

**3. The other lines.** The deleted aws_instance.bastion is intended (Session Manager replaced it — say so in the
PR). The update to the security group is the bastion's rule leaving. Fine.

**4. Decision.** Request changes and split the PR. One PR for the bastion. One for the major-version upgrade,
in a maintenance window, after a fresh manual snapshot. Encryption becomes a planned migration: snapshot, copy the
snapshot with encryption, restore a new instance, switch the application, then remove the old one — with its own
runbook, not a side effect of a plan. The guard stays: a replaced database in prod always needs a human to look
twice.

**5. If a replacement is ever truly intended**, the escape hatch is explicit and reviewed (a label that a second
approver applies, read by the job), never "comment out the guard".`,
    mcqs: [
      mcq('In MedSetu\'s workflow, why does the apply job apply the saved tfplan instead of running terraform apply with auto-approve?', [
        ['So that exactly the plan the approver read is what gets applied', true],
        ['Because terraform apply cannot run at all in a non-interactive job', false],
        ['Because the saved plan file makes the apply job run much faster', false],
        ['So that the state lock is skipped for the duration of the apply', false],
      ], 'A saved plan applies precisely the reviewed changes and fails as stale if state moved, whereas auto-approve recomputes a new plan nobody read. apply can run non-interactively, speed is not the point, and applying a plan still takes the lock.'),
      mcq('A nightly drift job runs terraform plan -detailed-exitcode on main and gets exit code 2. What does that mean?', [
        ['The plan succeeded and has changes, so reality differs from code', true],
        ['The plan failed with an error, and the job needs to be re-run later', false],
        ['The plan found no changes, and the environment is fully in sync', false],
        ['The state lock was held, and the plan waited two minutes to run', false],
      ], 'With -detailed-exitcode, 0 is no changes, 1 is an error and 2 is a successful plan with changes; on an untouched main branch that signals drift. Lock waits are not reported through this exit code.'),
      mcq('Why should the role used for pull-request plans be read-only, even though plan "does not change anything"?', [
        ['Plan executes provider and external-data code from the PR branch', true],
        ['AWS rejects terraform plan calls made by roles with write access', false],
        ['Read-only roles let plan skip refreshing the resource attributes', false],
        ['A read-only role makes the plan output smaller and easier to read', false],
      ], 'During plan Terraform runs providers and data sources, including data "external", from the proposed code, so a hostile PR could act with whatever the role allows. AWS has no such rule, refresh still runs with read access, and the role does not change output size.'),
    ],
    checkpoint: [
      mcq('MedSetu wants no AWS keys stored in GitHub. How should the apply job get credentials?', [
        ['OIDC: assume a role that trusts only the production environment', true],
        ['A repository secret holding an IAM user access key for production', false],
        ['An organisation secret with keys rotated by hand every month', false],
        ['The plan job\'s credentials, passed to apply as an artifact', false],
      ], 'OIDC exchanges the job\'s identity token for short-lived role credentials, and the trust policy can require the production environment. Stored keys of any kind are long-lived and leak, and credentials must never be passed between jobs as artifacts.'),
      ck(IAC, 'A Checkov scan flags a bucket for missing access logging, but logs go to a central trail by design. What is the right way to proceed?', [
        ['Add a skip comment for that check, with the reason, in the code', true],
        ['Disable Checkov for the whole repository to stop the false alarms', false],
        ['Mark the pipeline step as allowed to fail so the merge can go on', false],
        ['Enable access logging anyway so that the scanner stays quiet now', false],
      ], 'A scoped, reasoned skip keeps the exception visible in review while every other check still runs. Turning the scanner off or letting it fail hides real findings, and adding logging nobody uses costs money to satisfy a tool.'),
      mcq('The drift job reports that a security group gained a rule in the console last night. What should happen next?', [
        ['Find who and why in CloudTrail, then revert it or adopt it in code', true],
        ['Ignore it, since the next unrelated apply will sort it out by itself', false],
        ['Delete the state file so that the console change becomes the truth', false],
        ['Run terraform apply -refresh-only so the rule is removed from AWS', false],
      ], 'Drift needs a decision: revert by applying code, or adopt by changing code. Ignoring it means a later apply removes it without anyone choosing to, deleting state loses track of everything, and refresh-only records the rule in state rather than removing it.'),
    ],
  },
  /* ── CLOUDFORMATION_BICEP ────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_TERRAFORM_CLOUDFORMATION_BICEP',
    notes: `MedSetu runs Terraform, but the job market does not stop there: the payments partner MedSetu integrates with ships
its AWS resources as CloudFormation, a hospital group it serves in Hyderabad runs Azure with Bicep, and one of
MedSetu's own older services was built with the AWS CDK. You do not need to master these; you need to read a
template, change it safely and know where the traps are. Everything maps onto what you already know:

    Idea            Terraform                CloudFormation                 Bicep (Azure)
    Record          state file you store     the stack, kept by AWS         the resource group in ARM
    Preview         terraform plan           change set                     what-if
    Inputs          variable                 Parameters                     param
    Outputs         output                   Outputs (+ Export)             output
    Reuse           module                   nested stack, module           module
    Drift           plan shows it            detect-stack-drift             what-if against reality
    Remove          terraform destroy        delete-stack                   delete the group, or a stack

## Reading a CloudFormation template

    AWSTemplateFormatVersion: "2010-09-09"
    Description: MedSetu lab-report bucket
    Parameters:
      Env:
        Type: String
        AllowedValues: [dev, staging, prod]
    Conditions:
      IsProd: !Equals [!Ref Env, prod]
    Resources:
      ReportsBucket:
        Type: AWS::S3::Bucket
        DeletionPolicy: Retain
        UpdateReplacePolicy: Retain
        Properties:
          BucketName: !Sub "medsetu-reports-\${Env}-\${AWS::AccountId}"
          VersioningConfiguration:
            Status: !If [IsProd, Enabled, Suspended]
          BucketEncryption:
            ServerSideEncryptionConfiguration:
              - ServerSideEncryptionByDefault:
                  SSEAlgorithm: aws:kms
          PublicAccessBlockConfiguration:
            BlockPublicAcls: true
            BlockPublicPolicy: true
            IgnorePublicAcls: true
            RestrictPublicBuckets: true
    Outputs:
      ReportsBucketName:
        Value: !Ref ReportsBucket
        Export:
          Name: !Sub "\${AWS::StackName}-ReportsBucketName"
      ReportsBucketArn:
        Value: !GetAtt ReportsBucket.Arn

ReportsBucket is the **logical ID** (like a Terraform address); the bucket's name is the physical ID. !Ref returns a
resource's main identifier (for a bucket, its name) or a parameter's value; !GetAtt reads another attribute; !Sub
fills \${...} placeholders, including pseudo parameters such as AWS::AccountId, AWS::Region and AWS::StackName. Created
as a stack in moto with Env=prod:

    status: CREATE_COMPLETE
      ReportsBucketName = medsetu-reports-prod-123456789012
      ReportsBucketArn = arn:aws:s3:::medsetu-reports-prod-123456789012

## Changing a stack safely

Do not update a production stack directly; create a **change set**, read it, then execute it:

    aws cloudformation create-change-set --stack-name medsetu-reports-prod --change-set-name retention-365 \\
        --template-body file://reports.yaml --parameters ParameterKey=Env,ParameterValue=prod
    aws cloudformation describe-change-set --stack-name medsetu-reports-prod --change-set-name retention-365
    aws cloudformation execute-change-set --stack-name medsetu-reports-prod --change-set-name retention-365

Each change lists Action (Add, Modify, Remove) and, for Modify, **Replacement: True, False or Conditional**.
Replacement True on a bucket or database is the CloudFormation spelling of Terraform's -/+. (moto's change-set diff
is simplified, so these commands and fields are from the documentation.) cfn-lint catches template mistakes before
any of this.

**When an operation fails, CloudFormation rolls back** to the last working state on its own. Read the stack events
from the **first** CREATE_FAILED or UPDATE_FAILED — later failures are usually "Resource creation cancelled". Two
states to recognise: **ROLLBACK_COMPLETE** after a failed first create (the stack cannot be updated; delete it and
create again), and **UPDATE_ROLLBACK_FAILED** (often because someone changed or deleted a resource by hand; fix the
cause, then continue-update-rollback).

**Protections.** DeletionPolicy: Retain keeps the bucket when the resource leaves the template or the stack is
deleted; Snapshot (for databases and volumes) keeps a final snapshot; UpdateReplacePolicy does the same when an update
replaces it. Set them explicitly on anything holding data. Termination protection stops delete-stack; a stack policy
can forbid updates to named resources. Drift: detect-stack-drift then describe-stack-resource-drifts shows which
properties differ. Exports are read by other stacks with !ImportValue, and an export in use **cannot be changed or
deleted** — a tight coupling to use sparingly.

## The CDK, in outline

The AWS CDK writes CloudFormation from a programming language. In Python (written from the documentation, not run):

    from aws_cdk import App, Stack, RemovalPolicy, aws_s3 as s3
    from constructs import Construct

    class ReportsStack(Stack):
        def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
            super().__init__(scope, construct_id, **kwargs)
            s3.Bucket(self, "Reports", versioned=True,
                      encryption=s3.BucketEncryption.KMS_MANAGED,
                      block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
                      enforce_ssl=True, removal_policy=RemovalPolicy.RETAIN)

    app = App()
    ReportsStack(app, "medsetu-reports-dev")
    app.synth()

cdk bootstrap prepares an account and region once; cdk synth prints the generated template; **cdk diff** is the
plan; cdk deploy runs a change set. When a CDK deploy fails, you debug the synthesised CloudFormation stack.

## Bicep

Bicep compiles to ARM templates. Azure Resource Manager itself is the record — there is no state file. Written from
the documentation, not run:

    @allowed([
      'dev'
      'prod'
    ])
    param env string
    param location string = 'centralindia'

    resource reports 'Microsoft.Storage/storageAccounts@2023-05-01' = {
      name: 'medsetureports\${env}'
      location: location
      sku: {
        name: 'Standard_LRS'
      }
      kind: 'StorageV2'
      properties: {
        allowBlobPublicAccess: false
        minimumTlsVersion: 'TLS1_2'
        supportsHttpsTrafficOnly: true
      }
    }

    output storageAccountId string = reports.id

Each resource names its type and **API version**; properties follow that version's schema. Preview and deploy:

    az deployment group what-if --resource-group rg-medsetu-dev --template-file main.bicep --parameters env=dev
    az deployment group create  --resource-group rg-medsetu-dev --template-file main.bicep --parameters env=dev

The trap: the default **Incremental** mode never deletes resources missing from the template, so removing a block
does not remove the resource; **Complete** mode deletes everything in the resource group that the template does not
list — including things other people made. Deployment stacks are Azure's newer answer for managing deletes.

## Working on a team that uses them

Never let two tools manage the same resource. To move a CloudFormation resource into Terraform: set DeletionPolicy:
Retain, remove it from the stack, then import it into Terraform — the same import you learned for state.`,
    mcqs: [
      mcq('A change set for the partner\'s stack shows Action Modify, Replacement True on an AWS::RDS::DBInstance. What does executing it mean?', [
        ['A new database will be created and the old one removed', true],
        ['The existing database will be updated with no downtime', false],
        ['Nothing yet: Replacement True only marks a stale template', false],
        ['The database will be renamed and every connection kept', false],
      ], 'Replacement True is CloudFormation\'s destroy-and-create: a new physical resource replaces the old, so data needs a plan (and DeletionPolicy or UpdateReplacePolicy Snapshot). An in-place update would show Replacement False, and nothing is renamed or kept connected.'),
      mcq('A first-time create of a stack failed and it now sits in ROLLBACK_COMPLETE. The template is fixed. What is the next step?', [
        ['Delete the stack, then create it again with the fixed template', true],
        ['Run update-stack with the fixed template on the existing stack', false],
        ['Run continue-update-rollback, then update the stack once more', false],
        ['Execute the old change set again, since rollback reset it', false],
      ], 'A stack whose first create rolled back cannot be updated; it is deleted and created afresh. continue-update-rollback is for UPDATE_ROLLBACK_FAILED, and an old change set cannot be executed against this state.'),
      mcq('A Bicep file no longer contains a storage account that it used to deploy, and the next default deployment succeeds. What happened to the account?', [
        ['It still exists, because Incremental mode does not delete resources', true],
        ['It was deleted, because Bicep keeps a state file and saw it removed', false],
        ['It was deleted, because what-if always runs and removes the extras', false],
        ['It was moved into a new resource group created by the deployment', false],
      ], 'The default Incremental mode only creates and updates what the template lists, so a removed block leaves the resource in place. Bicep has no state file, what-if only previews, and deployments do not move resources between groups.'),
    ],
    checkpoint: [
      mcq('In CloudFormation, which setting keeps a bucket of patient reports when it is removed from the template?', [
        ['DeletionPolicy: Retain on the bucket resource', true],
        ['A stack Export of the bucket name for others', false],
        ['The VersioningConfiguration set to Enabled', false],
        ['A Condition that is true only in production', false],
      ], 'DeletionPolicy: Retain tells CloudFormation to leave the physical resource in place when the logical resource leaves the stack. Exports share values, versioning keeps object versions but not the bucket, and a condition only decides whether the resource is in the template.'),
      mcq('Which pair is the CloudFormation and Azure equivalent of reviewing a terraform plan?', [
        ['A change set, and az deployment group what-if', true],
        ['A stack policy, and an Azure Policy assignment', false],
        ['Drift detection, and the Bicep linter warnings', false],
        ['cfn-lint, and az bicep build to an ARM file', false],
      ], 'Change sets and what-if preview the changes a deployment will make, as a plan does. Stack and Azure policies restrict changes, drift detection compares reality with the record, and linting or building checks syntax without showing changes.'),
      mcq('A CDK app\'s deploy fails with "UPDATE_ROLLBACK_COMPLETE". Where do you look for the cause?', [
        ['The CloudFormation stack events, from the first failed one', true],
        ['The CDK state file in the project\'s local cdk.out folder', false],
        ['The Python traceback from cdk synth on the developer machine', false],
        ['The last stack event, since it states the real root cause', false],
      ], 'The CDK deploys through CloudFormation, so the first UPDATE_FAILED event holds the reason. cdk.out holds synthesised templates, not state; synth succeeded or there would be no deployment; and the last events are usually cancellations caused by the first failure.'),
    ],
  },
  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_TERRAFORM_DEBUGGING',
    notes: `Terraform failures fall into three kinds, and naming the kind first saves an hour: **the configuration is wrong**
(validate or plan fails before touching AWS), **the plan is wrong** (it runs, but proposes something you did not
mean — the dangerous kind, because it looks like success), and **the apply fails** (AWS refused something partway;
Terraform has recorded whatever did get created, so re-plan before anything else). Read the whole error: it names
the file and line, and usually the reason.

Tools: terraform validate; terraform plan with a careful read of every - and -/+; terraform state list and state
show; terraform console to evaluate an expression against the real configuration; terraform providers to see what
needs which plugin; TF_LOG=DEBUG for the raw API calls (the log can contain secrets — never paste it in a ticket).
Six failures from MedSetu's first months follow. The HCL parses with python-hcl2; the error and plan text is
illustrative, written from the documentation, since no Terraform binary was used.

## 1. "Cycle" between two security groups

**Symptom.** The app group allows egress to the database group, and the database group ingress from the app group,
both as inline blocks. Plan fails:

    Error: Cycle: aws_security_group.db, aws_security_group.app

**Cause.** Each group's inline rules reference the other's id, so neither can be created first.
**Fix.** Create the groups without inline rules, and each rule as its own resource, which depends on both groups:

    resource "aws_vpc_security_group_ingress_rule" "db_from_app" {
      security_group_id            = aws_security_group.db.id
      referenced_security_group_id = aws_security_group.app.id
      ip_protocol                  = "tcp"
      from_port                    = 5432
      to_port                      = 5432
    }

## 2. A plan that is never empty

**Symptom.** Every plan, on an untouched branch, shows a change to the app group's ingress, and every apply
"succeeds". The drift job alerts nightly.
**Cause.** The group still had an inline ingress block, and someone added a separate
aws_vpc_security_group_ingress_rule for the same group. The inline block says "these are all the rules", so each
apply removes the separate rule, then the separate resource adds it back. Two owners, one object.
**Fix.** One style per group — separate rule resources — and delete the inline blocks. The same trap exists wherever a
resource has both an inline form and a standalone resource (inline route blocks on aws_route_table plus aws_route
resources; inline_policy on aws_iam_role plus aws_iam_role_policy).

## 3. "Invalid for_each argument"

**Symptom.** An alarm per worker instance:

    resource "aws_cloudwatch_metric_alarm" "cpu" {
      for_each            = toset(aws_instance.worker[*].id)
      alarm_name          = "worker-cpu-\${each.key}"
      namespace           = "AWS/EC2"
      metric_name         = "CPUUtilization"
      comparison_operator = "GreaterThanThreshold"
      threshold           = 80
      evaluation_periods  = 3
      period              = 300
      statistic           = "Average"
      dimensions = {
        InstanceId = each.key
      }
    }

Plan fails:

    Error: Invalid for_each argument

    The "for_each" set includes values derived from resource attributes that
    cannot be determined until apply, and so Terraform cannot determine the full
    set of keys that will identify the instances of this resource.

**Cause.** for_each keys must be known at plan time; instance ids exist only after apply.
**Fix.** Key by something you chose. Make the workers for_each over names (var.workers = ["w1", "w2"]) and iterate
over them: for_each = aws_instance.worker, with each.key the name and each.value.id the id. Ids can be values; they
cannot be keys. Avoid -target to "apply the instances first" — it works once and leaves a configuration that cannot
be planned from scratch.

## 4. A new backend key, and everything "to add"

**Symptom.** Tidying paths, someone changed key = "reports.tfstate" to "reports/prod/terraform.tfstate". plan then
said:

    Error: Backend initialization required, please run "terraform init"

    Reason: Backend configuration block has changed

They ran terraform init -reconfigure, and the next plan was "Plan: 23 to add, 0 to change, 0 to destroy."
**Cause.** -reconfigure points at the new key **without copying state**, so Terraform believes it manages nothing.
Applying would collide with every existing named resource and duplicate the unnamed ones.
**Fix.** Do not apply. Run terraform init -migrate-state, which copies the state from the old location to the new
one; the plan should return to "No changes." The old object stays in the bucket — delete it later, deliberately.

## 5. Instances replaced every few weeks

**Symptom.** With no code change, a plan proposes replacing both workers:

      # aws_instance.worker["w1"] must be replaced
    -/+ resource "aws_instance" "worker" {
          ~ ami = "ami-0a1b2c3d4e5f60718" -> "ami-0f9e8d7c6b5a40312" # forces replacement

**Cause.** ami comes from data "aws_ami" with most_recent = true. Each new Amazon Linux release changes the answer,
and changing an instance's AMI forces replacement.
**Fix.** Make image changes deliberate: pin the AMI id in a variable that a pull request bumps, or put instances in an
Auto Scaling group whose launch template takes the new AMI and rolls instances through an instance refresh. Do not
paper over it with ignore_changes unless something else really owns the AMI.

## 6. CI fails on the lock file after a provider bump

**Symptom.** A PR changed version = "~> 5.0" to "~> 6.0". CI fails at init:

    Error: Inconsistent dependency lock file

    The following dependency selections recorded in the lock file are
    inconsistent with the current configuration:
      - provider registry.terraform.io/hashicorp/aws: locked version selection 5.100.0 doesn't match the updated version constraints "~> 6.0"

**Cause.** .terraform.lock.hcl still records the 5.x provider, and CI (correctly) does not rewrite it.
**Fix.** Run terraform init -upgrade locally, then terraform providers lock -platform=linux_amd64
-platform=darwin_arm64 -platform=windows_amd64 so hashes exist for every machine, and commit the lock file. A major
version is a migration: read the provider's upgrade guide and expect plan changes.`,
    mcqs: [
      mcq('Plan fails with "Error: Cycle: aws_security_group.db, aws_security_group.app". Each group has an inline rule that references the other group. What is the fix?', [
        ['Move the rules into separate rule resources that reference both groups', true],
        ['Add depends_on from the db group to the app group to set an order', false],
        ['Run the apply twice, so the second run creates the remaining rules', false],
        ['Merge the two groups into one group that allows all traffic inside', false],
      ], 'Standalone rule resources depend on both groups, so the groups are created first and the rules after, which breaks the cycle. depends_on adds an edge and cannot remove the existing ones, a second run hits the same cycle, and one wide-open group throws away the separation.'),
      mcq('After terraform init -reconfigure on a new backend key, the plan says "Plan: 23 to add, 0 to change, 0 to destroy." What happened?', [
        ['Init pointed at the new key without copying the old state there', true],
        ['AWS deleted the 23 resources while the backend was being changed', false],
        ['The provider lock file was reset, so every resource is rebuilt', false],
        ['The state was copied, but -reconfigure marks it all for re-creation', false],
      ], '-reconfigure ignores the previous backend, so the new key is empty and Terraform thinks it manages nothing; -migrate-state copies the state across. Nothing in AWS changed, the lock file only records providers, and no state was copied.'),
      mcq('A plan proposes replacing worker instances although nobody changed the code. ami comes from data "aws_ami" with most_recent = true. What is the cause?', [
        ['A newer image was published, so the data source returns a new AMI', true],
        ['The instances were stopped, and stopped instances are always replaced', false],
        ['The state lock expired, so Terraform lost the AMI it used before', false],
        ['The provider changed its default instance type for these workers', false],
      ], 'most_recent picks the latest matching AMI at each plan, and an AMI change forces a new instance. Stopping instances, lock expiry and provider defaults do not change the AMI argument.'),
      mcq('CI fails with "Inconsistent dependency lock file" right after a PR moved the AWS provider constraint to "~> 6.0". What should the author do?', [
        ['Run init -upgrade, lock hashes for all platforms, and commit', true],
        ['Delete .terraform.lock.hcl from Git so CI chooses for itself', false],
        ['Add -lock=false to the CI init step so it skips the check', false],
        ['Pin the constraint back to "~> 5.0" and keep the old provider', false],
      ], 'The lock file must be updated deliberately and committed so every machine uses the same provider build; locking for several platforms avoids hash failures elsewhere. Deleting it loses reproducibility, -lock=false is about state locking, not the dependency lock, and reverting abandons the upgrade.'),
    ],
  },
  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_TERRAFORM_PRACTICE',
    notes: `Ten exercises, easiest first. Write your answer before reading ours. HCL answers parse with python-hcl2; the Python
in exercise 8 was run; the plan and CloudFormation behaviour is from the documentation (no Terraform binary or AWS
account was used).

## 1. Version constraints (easy)

Which of 6.1.0, 6.2.0, 6.2.7, 6.9.1 and 7.0.0 satisfy "~> 6.2", and which satisfy "~> 6.2.0"?

**Answer.** "~> 6.2" means at least 6.2 and below 7.0: **6.2.0, 6.2.7, 6.9.1**. "~> 6.2.0" means at least 6.2.0 and
below 6.3.0: **6.2.0, 6.2.7**. The rightmost number given is the one allowed to grow.

## 2. Which value wins? (easy)

noncurrent_days has default = 30; terraform.tfvars sets 60; the shell has TF_VAR_noncurrent_days=90; the command is
terraform plan -var-file=prod.tfvars, and prod.tfvars sets 365. What value is used? And without -var-file?

**Answer.** **365** — command-line -var-file beats everything. Without it, **60**: terraform.tfvars beats environment
variables, which beat the default. (People expect the environment variable to win; it is near the bottom.)

## 3. Write the summary line (easy)

A plan creates two queues, updates one alarm in place, and replaces one instance. What is the summary line?

**Answer.** **Plan: 3 to add, 1 to change, 1 to destroy.** A replacement counts once in "add" and once in "destroy",
not in "change".

## 4. for_each over a map (medium)

Create one SQS queue per entry of { appointments = 4, reports = 14 } (retention in days), named
medsetu-<key>-<env>.

**Answer.**

    variable "queues" {
      type = map(number)
      default = {
        appointments = 4
        reports      = 14
      }
    }

    resource "aws_sqs_queue" "q" {
      for_each                  = var.queues
      name                      = "medsetu-\${each.key}-\${var.env}"
      message_retention_seconds = each.value * 86400
    }

Addresses: aws_sqs_queue.q["appointments"] and aws_sqs_queue.q["reports"]. 14 days is SQS's maximum retention, so
validate the map if others will edit it.

## 5. From count to for_each without destroying (medium)

aws_s3_bucket.store used count over ["reports", "invoices", "scans"]. You switch to for_each over the same names.
Write what stops the plan from replacing all three.

**Answer.**

    moved {
      from = aws_s3_bucket.store[0]
      to   = aws_s3_bucket.store["reports"]
    }

    moved {
      from = aws_s3_bucket.store[1]
      to   = aws_s3_bucket.store["invoices"]
    }

    moved {
      from = aws_s3_bucket.store[2]
      to   = aws_s3_bucket.store["scans"]
    }

The plan should show three moves and "0 to add, 0 to change, 0 to destroy". Do the same for every resource that
followed the buckets (versioning, public access block).

## 6. Where does the workspace state live? (easy)

The S3 backend has key = "reports/terraform.tfstate" and the default workspace_key_prefix. Where is the state for
the default workspace, and for a workspace named staging?

**Answer.** Default: **reports/terraform.tfstate**. staging: **env:/staging/reports/terraform.tfstate**. An IAM policy
that allows only reports/* would block the staging workspace.

## 7. Read the actions (medium)

In terraform show -json output, what does each mean: ["no-op"], ["update"], ["delete", "create"],
["create", "delete"], ["delete"], ["read"]?

**Answer.** Nothing to do; in-place update; replace, destroying first (the default); replace, creating the new one
first (create_before_destroy); destroy; a data source read during apply because it depends on unknown values.

## 8. Rebuild the summary from the JSON (hard)

Write a Python function that prints Terraform's summary line from a plan JSON.

**Answer** (run on a plan file with one create, one update, one replacement and one delete):

    def summary(plan):
        add = change = destroy = 0
        for rc in plan["resource_changes"]:
            a = rc["change"]["actions"]
            if "create" in a:
                add += 1
            if "delete" in a:
                destroy += 1
            if a == ["update"]:
                change += 1
        return f"Plan: {add} to add, {change} to change, {destroy} to destroy."

    Plan: 2 to add, 1 to change, 2 to destroy.

The replacement is counted in both add and destroy, as Terraform does; imports and moves are not handled here.

## 9. CloudFormation replacement (medium)

In the reports stack, you (a) change the tag env from prod to production, and (b) change BucketName. What does the
change set show for each?

**Answer.** (a) Modify, **Replacement False** — tags update in place. (b) Modify, **Replacement True** — a bucket
name cannot change, so CloudFormation creates a new bucket; with UpdateReplacePolicy: Retain the old one is kept,
otherwise CloudFormation tries to delete it (and fails if it is not empty).

## 10. A drift check in shell (medium)

Write the shell step for a nightly job that alerts only on drift and fails loudly on errors.

**Answer.**

    set +e
    terraform plan -input=false -detailed-exitcode -var-file=prod.tfvars -out=drift.tfplan
    code=$?
    set -e
    if [ "$code" -eq 2 ]; then
      terraform show -no-color drift.tfplan > drift.txt
      echo "drift found"; exit 2
    elif [ "$code" -ne 0 ]; then
      echo "plan failed"; exit 1
    fi

set +e matters: CI shells usually stop on any non-zero exit, and 2 is not an error here.`,
    mcqs: [
      mcq('Which provider version satisfies "~> 6.2.0"?', [
        ['6.2.7', true],
        ['6.3.0', false],
        ['6.1.9', false],
        ['7.2.0', false],
      ], '"~> 6.2.0" allows 6.2.0 and later patches below 6.3.0, so only 6.2.7 fits. 6.3.0 is the next minor, 6.1.9 is below the floor, and 7.2.0 is a new major.'),
      mcq('terraform.tfvars sets noncurrent_days = 60 and the shell exports TF_VAR_noncurrent_days=90. No -var or -var-file is given. Which value is used?', [
        ['60, from terraform.tfvars', true],
        ['90, from the environment', false],
        ['30, the declared default', false],
        ['An error for two values', false],
      ], 'terraform.tfvars is loaded after environment variables and overrides them; only *.auto.tfvars and command-line -var or -var-file rank higher. The default is used only when nothing else sets the value, and duplicate sources are not an error.'),
      mcq('A plan creates one bucket, updates two alarms in place and replaces one instance. What is the summary line?', [
        ['Plan: 2 to add, 2 to change, 1 to destroy.', true],
        ['Plan: 1 to add, 3 to change, 0 to destroy.', false],
        ['Plan: 2 to add, 3 to change, 1 to destroy.', false],
        ['Plan: 1 to add, 2 to change, 1 to destroy.', false],
      ], 'A replacement counts once as an add and once as a destroy, and never as a change: one bucket plus one new instance is 2 to add, two alarms are 2 to change, and the old instance is 1 to destroy.'),
      mcq('With key = "reports/terraform.tfstate" and default settings, where does the S3 backend keep the state of a workspace called staging?', [
        ['env:/staging/reports/terraform.tfstate', true],
        ['reports/staging/terraform.tfstate', false],
        ['staging/reports/terraform.tfstate', false],
        ['reports/terraform.tfstate.staging', false],
      ], 'Non-default workspaces are stored under the workspace_key_prefix, which defaults to env:, followed by the workspace name and the key. The other paths are plausible layouts but not what the backend does.'),
      mcq('A nightly drift step runs plan with -detailed-exitcode under "set -e" and the job fails every night with no error message. Why?', [
        ['Exit code 2 means drift, and set -e treats it as a failure', true],
        ['-detailed-exitcode cannot be used together with the -out flag', false],
        ['set -e makes Terraform hide every error message that it prints', false],
        ['The plan cannot run at night because of the state lock timeout', false],
      ], 'With -detailed-exitcode a successful plan with changes returns 2, and set -e stops the script on any non-zero code, so the step needs set +e around it. -out works with it, set -e does not hide output, and the lock has nothing to do with time of day.'),
    ],
  },
  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_TERRAFORM_INTERVIEW_QUESTION',
    notes: `Terraform comes up in almost every DevOps, cloud and SRE interview in India — product companies, GCCs and the
cloud practices of IT services firms alike. Interviewers are not checking syntax. They listen for whether you have
**operated** it with other people: state and locking, reading plans, environments, and what you do when an apply
goes wrong. Four questions follow, each with a model answer and the follow-up a good answer earns. Practise aloud;
about two minutes each.

## Q1. "What is Terraform state, and why does it matter?"

**Model answer.** "State is Terraform's record of which real object each resource address manages, with the
attributes it last saw. Plan compares three things — the code, the state and the real infrastructure — so without
state Terraform cannot tell 'create this' from 'this is already mine'. Because a team shares it, it lives in a
remote backend: for us an S3 bucket with versioning, encryption and blocked public access, and locking with the S3
lock file so two applies cannot run at once. It holds attributes in plain text, sometimes secrets, so access is
limited to the roles that run Terraform, and we keep secrets out of it where possible — for example letting RDS keep
the master password in Secrets Manager."

**Follow-up:** "Someone's laptop apply and the CI apply ran at the same moment. What happens?" "With locking, the
second one fails to acquire the lock and stops; nothing is harmed. Without locking, both read the same serial, both
change things and the last writer wins — the other's resources exist in AWS but not in state, so the next plan wants
to create duplicates. I'd recover by importing the orphans, then fix the process so only CI applies."

## Q2. "How do you structure Terraform for dev, staging and prod?"

**Model answer.** "Shared modules for the building blocks — network, data, app — versioned by Git tag. Then one root
directory per environment that calls those modules, each with its own backend key and its own AWS account, and a
provider with allowed_account_ids so prod code cannot run with dev credentials. Environments differ only in tfvars
values; secrets come from Secrets Manager, never tfvars. Changes are promoted by bumping the module tag in staging
first, then prod. Large estates are split into layered states so an app change cannot touch the VPC."

**Follow-up:** "Why not workspaces?" "Workspaces share the backend and the credentials, and the selected workspace
is invisible in the code, so applying to prod by mistake is one forgotten command away. I use them for short-lived
identical copies, such as a stack per feature branch, not for the prod boundary."

## Q3. "Someone changed a security group in the console. How do you find out, and what do you do?"

**Model answer.** "A scheduled pipeline runs terraform plan -detailed-exitcode against each environment; exit code 2
on an unchanged main branch means drift, and it alerts us. I'd look up the change in CloudTrail — who, when, from
where — and ask why. If it was an emergency fix that should stay, I raise a PR that puts it in code so the next plan
is empty. If it was a mistake or unsafe, applying the code reverts it. Either way I don't leave it, because the next
unrelated apply would revert it silently. Longer term: read-only console roles for prod and a break-glass role that
alerts."

**Follow-up:** "What if the plan shows drift on a resource Terraform does not manage?" "It won't — plan only knows
what's in state. That's the gap: unmanaged resources need AWS Config or a tagging report to find, and then I import
them or decide they belong elsewhere."

## Q4. "An apply failed halfway. What now?"

**Model answer.** "First, don't re-run blindly. Terraform writes state as resources are created, so everything that
succeeded is recorded; the error names what failed and why — a quota, a permission, a name already taken, a
dependency AWS had not finished. I fix that cause, run plan again, read it — it should now show only the remaining
work — and apply. If the error was a lock or a crash mid-write, I check the lock holder and, if needed, restore the
previous state version from the versioned bucket before planning. Terraform has no automatic rollback like
CloudFormation; rolling back means applying the previous code through the same pipeline."

**Follow-up:** "Your plan shows a database will be replaced. Walk me through what you do." "Stop the apply. Find the
argument marked 'forces replacement' and why it changed. If it was unintended, change the code back. If the change is
needed — say, enabling encryption — it becomes a planned migration with a snapshot, a restore to a new instance and a
cut-over, not a plan line. And the database should already carry prevent_destroy and deletion protection, so a
mistaken apply fails instead of deleting it."`,
    mcqs: [
      mcq('An interviewer asks why Terraform needs state at all if it can query AWS. Which answer is the strongest?', [
        ['State maps each address to a real object; without it Terraform cannot tell its resources apart', true],
        ['State caches the provider plugins, so the next init can work with no internet connection at all', false],
        ['State stores the plan history, so Terraform can roll back to an earlier apply automatically', false],
        ['State holds the AWS credentials, so team members do not each need their own access to AWS', false],
      ], 'Terraform reads AWS during plan, but only state tells it which bucket or instance belongs to which address in the code. Plugins live in .terraform, Terraform keeps no plan history and has no automatic rollback, and credentials never belong in state.'),
      mcq('Asked "an apply failed halfway, what now?", which first step shows the most operational maturity?', [
        ['Read the error, fix its cause, then plan again before any new apply', true],
        ['Run terraform destroy, then apply from scratch for a clean slate', false],
        ['Delete the state file, since a failed apply leaves it corrupted', false],
        ['Re-run the same apply at once, since most failures are transient', false],
      ], 'State already records what succeeded, so fixing the cause and re-planning shows exactly the remaining work. Destroying production, deleting state or blindly retrying either does damage or repeats the failure without understanding it.'),
      mcq('In an interview you propose workspaces for dev, staging and prod. The interviewer asks what could go wrong. Which reply names the real risk?', [
        ['The selected workspace is invisible in code, so prod can be hit by mistake', true],
        ['Workspaces cannot store their state in an S3 backend with any locking', false],
        ['Workspaces force every environment to use the same instance sizes', false],
        ['Workspaces stop modules from being called from inside the configuration', false],
      ], 'All workspaces share the backend, credentials and code, and the current one is easy to forget, so an apply meant for dev can reach prod. S3 workspaces are supported and locked, values can differ through terraform.workspace, and modules work normally.'),
    ],
  },
  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_TERRAFORM_CHECKPOINT',
    notes: `Ten questions across the topic: declarative infrastructure, Terraform basics and plans, state and backends, modules
and environments, pipelines and drift, and CloudFormation and Bicep. Answer without notes; the result shows which
lesson to revisit.`,
    checkpoint: [
      mcq('What does it mean that applying an unchanged Terraform configuration a second time reports "No changes"?', [
        ['The definition is idempotent: reality already matches it', true],
        ['The second run was skipped because the state was locked', false],
        ['Terraform keeps no state after its first successful apply', false],
        ['The provider caches results and ignores any second call', false],
      ], 'A declarative tool converges: when real state matches the code, there is nothing to do. A lock would produce an error, state persists between runs, and the plan really does refresh from AWS rather than replaying a cache.'),
      mcq('Which plan symbol warns that an existing resource will be destroyed and a new one created in its place?', [
        ['-/+', true],
        ['~', false],
        ['<=', false],
        ['+', false],
      ], '-/+ means destroy and then create a replacement (+/- when create_before_destroy is set). ~ is an in-place update, <= is a data source read, and + is a plain create.'),
      mcq('Why should a list of named buckets usually use for_each rather than count?', [
        ['Removing one name then leaves the other addresses unchanged', true],
        ['for_each creates every bucket at once, and count one at a time', false],
        ['count cannot be used with any AWS resource type that has a name', false],
        ['for_each stores each bucket in a different state file of its own', false],
      ], 'for_each keys instances by name, so deleting one entry touches only that instance; count keys by position and shifts the rest. Both run in parallel, count works with any resource, and all instances share the same state.'),
      mcq('What does use_lockfile = true in an S3 backend protect against?', [
        ['Two plans or applies writing the same state at the same time', true],
        ['Anyone reading the state without the proper IAM permissions', false],
        ['Loss of the state file if the S3 bucket itself is deleted', false],
        ['A provider upgrade beyond the version in the lock file', false],
      ], 'The lock file in S3 serialises operations on one state. Read access is controlled by IAM, recovery comes from versioning and backups, and provider versions are pinned by .terraform.lock.hcl, a different file.'),
      ck(CFG, 'A teammate passes the RDS master password through a variable marked sensitive = true. What remains true?', [
        ['The password is written in plain text to the state file', true],
        ['The password is encrypted inside the state by Terraform', false],
        ['The password is left out of state and kept only in memory', false],
        ['The password is shown in the plan, but nowhere after that', false],
      ], 'sensitive only redacts the value in CLI output; state still stores it in plain text, which is why the password belongs in Secrets Manager (manage_master_user_password) and the state store is locked down. Terraform does not encrypt state contents itself, and plan output redacts it.'),
      mcq('A resource block is renamed in code, and the plan wants to destroy and re-create it. What tells Terraform it is the same object?', [
        ['A moved block from the old address to the new one', true],
        ['A removed block for the old address with destroy = false', false],
        ['An import block that points at the old address again', false],
        ['A lifecycle create_before_destroy setting on the block', false],
      ], 'moved records an address change so state is updated with no infrastructure change. removed with destroy = false forgets the object, import adopts an unmanaged one, and create_before_destroy only changes the order of a replacement.'),
      ck(CFG, 'MedSetu\'s prod and dev must never be applied with each other\'s credentials. Which setup does this best?', [
        ['A root directory per env, each with its own account guard and backend key', true],
        ['One root directory with workspaces, and a strict naming rule for the workspaces', false],
        ['One root directory, with env passed on the command line by the engineer', false],
        ['One state for both, with tags on every resource to show its environment', false],
      ], 'Separate roots make the environment explicit in the path, backend and provider, and allowed_account_ids stops the wrong credentials. Workspaces and command-line values rely on people remembering, and a shared state couples both environments\' blast radius.'),
      ck(CFG, 'In a pull-request pipeline for Terraform, which control stops a plan that would replace a production database?', [
        ['A policy check on the plan JSON that blocks deletes of data stores', true],
        ['Running terraform fmt -check on every file changed in the request', false],
        ['Running terraform validate before any plan is run in the pipeline', false],
        ['A static scan of the HCL for public buckets and open ports alone', false],
      ], 'Only the plan knows that an action is a replacement, so a rule over resource_changes can block it. fmt checks style, validate checks syntax and types, and static scans look for insecure settings in code, not for what the plan will do.'),
      ck(CFG, 'Why does MedSetu run terraform plan -detailed-exitcode on a schedule against main?', [
        ['To detect drift: exit code 2 means reality differs from code', true],
        ['To refresh the state lock so that it never expires overnight', false],
        ['To apply small fixes automatically whenever a change is found', false],
        ['To upgrade the providers to the newest version in the range', false],
      ], 'A scheduled plan with -detailed-exitcode turns drift into a signal (2 = changes) that the team then reverts or adopts. Locks are not refreshed this way, a plan never applies anything, and provider upgrades happen through init -upgrade and a reviewed lock file.'),
      mcq('A team managing Azure with Bicep removes a storage account from the template and redeploys in the default mode. What happens?', [
        ['The account stays, because Incremental mode never deletes', true],
        ['The account is deleted, because Bicep tracks it in state', false],
        ['The deployment fails until the account is deleted by hand', false],
        ['The account is moved to a new group named for the template', false],
      ], 'Incremental mode only creates and updates what the template lists; deletion needs Complete mode, a deployment stack or a manual delete. Bicep keeps no state file, removal is not an error, and deployments do not move resources.'),
    ],
  },
];
