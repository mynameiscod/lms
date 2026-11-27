import { SeedBook } from '../types';

const book: SeedBook = {
  slug: 'track-cloud-devops',
  title: 'Cloud & DevOps Engineer (AWS + Azure) Interview Questions',
  kind: 'topic',
  subject: 'Cloud & DevOps Engineer (AWS + Azure)',
  description: 'The 40 questions cloud and DevOps freshers face: Linux and networking, Git, Docker and CI/CD, AWS and Azure core services, Kubernetes, Terraform, monitoring and real scenario rounds.',
  color: '#0369a1',
  emblem: '☁️',
  audience: 'careerpilot',
  stages: ['specialize', 'placement'],
  tracks: ['CLOUD_DEVOPS'],
  order: 212,
  chapters: [
    {
      title: 'Linux, Networking and Scripting',
      questions: [
        {
          q: `Explain Linux file permissions. What do \`chmod 755\` and \`chmod 644\` mean?`,
          a: `Every file has three permission sets: **owner (u)**, **group (g)** and **others (o)**. Each set can have **read (r = 4)**, **write (w = 2)** and **execute (x = 1)**. Add the numbers to get one digit per set.

- \`755\` = owner \`rwx\` (7), group \`r-x\` (5), others \`r-x\` (5). Used for scripts and directories.
- \`644\` = owner \`rw-\` (6), group \`r--\` (4), others \`r--\` (4). Used for normal files like configs and HTML.

\`\`\`bash
ls -l deploy.sh          # -rw-r--r-- 1 ubuntu ubuntu 220 deploy.sh
chmod 755 deploy.sh      # now -rwxr-xr-x
chmod u+x backup.sh      # add execute for the owner only
chown ubuntu:www-data app.log
chmod 400 mykey.pem      # SSH refuses private keys that others can read
\`\`\`

On a directory, \`x\` means you can enter it (\`cd\`) and \`r\` means you can list it.`,
          d: 'easy',
          at: 'Service companies, product companies',
          tip: `The \`chmod 400 key.pem\` fix for "UNPROTECTED PRIVATE KEY FILE" is a favourite follow-up for EC2 roles.`,
        },
        {
          q: `Which Linux commands do you use to check CPU, memory, disk and running processes on a server?`,
          a: `These are the commands a cloud engineer runs first when a server misbehaves:

| Need | Command |
|---|---|
| CPU and load, live | \`top\` or \`htop\`; \`uptime\` shows load average |
| Memory | \`free -h\` |
| Disk space per filesystem | \`df -h\` |
| Which folder is big | \`du -sh /var/log/*\` |
| Processes | \`ps aux --sort=-%cpu\` |
| Open ports | \`ss -tulpn\` |
| Logs | \`tail -f /var/log/syslog\`, \`journalctl -u nginx\` |
| Kill a process | \`kill <pid>\`, then \`kill -9 <pid>\` if it ignores the first |

\`\`\`bash
df -h /            # is the root disk full?
free -h            # is swap being used heavily?
ss -tulpn | grep 8080   # is my app listening?
\`\`\`

Load average is compared with the number of CPU cores (\`nproc\`): a load of 4 on a 2-core machine means work is queuing.`,
          d: 'easy',
          at: 'Service companies, product companies',
          tip: `Answer as a sequence: disk, memory, CPU, ports, logs. It shows you have a troubleshooting habit, not just a list.`,
        },
        {
          q: `What happens when you type a URL like https://example.com in the browser and press Enter?`,
          a: `1. **DNS lookup**: the browser checks its cache, then the OS, then a DNS resolver, which asks root, \`.com\` TLD and finally the authoritative name server (for example Route 53) for the IP address.
2. **TCP connection**: a three-way handshake (SYN, SYN-ACK, ACK) to port 443.
3. **TLS handshake**: the server sends its certificate, the browser verifies it against trusted CAs, and both agree on encryption keys.
4. **HTTP request**: \`GET /\` with headers such as Host, cookies and User-Agent.
5. **Server side**: in the cloud this usually passes a CDN (CloudFront), a load balancer, then an app server, which may query a database.
6. **Response**: status code, headers and HTML. The browser parses it, downloads CSS, JS and images (more requests) and renders the page.

For a DevOps role, name where each step can fail: wrong DNS record, security group blocking 443, expired certificate, unhealthy target behind the load balancer.`,
          d: 'easy',
          at: 'Product companies, service companies',
          tip: `Linking each step to a cloud service (Route 53, ALB, ACM certificate) turns a textbook answer into a DevOps answer.`,
        },
        {
          q: `What is the difference between TCP and UDP? Name the ports you should know.`,
          a: `- **TCP** is connection-oriented and reliable: handshake first, ordered delivery, retransmits lost packets. Used for web, SSH and databases.
- **UDP** is connectionless: no handshake, no guarantee of delivery or order, but lower overhead. Used for DNS queries, video calls, streaming and gaming.

Ports a cloud engineer opens in security groups every week:

| Port | Service |
|---|---|
| 22 | SSH |
| 53 | DNS (UDP, and TCP for large responses) |
| 80 / 443 | HTTP / HTTPS |
| 3306 | MySQL |
| 5432 | PostgreSQL |
| 6379 | Redis |
| 3389 | RDP (Windows servers) |
| 27017 | MongoDB |

Port numbers below 1024 are "well-known" and need root to bind on Linux, which is why apps often listen on 8080 behind Nginx or a load balancer.`,
          d: 'easy',
          at: 'Service companies',
          tip: `Say why port 22 should be opened only to your own IP, never 0.0.0.0/0.`,
        },
        {
          q: `Explain CIDR notation. How many IP addresses are in 10.0.0.0/16 and 10.0.1.0/24, and how would you split a VPC into subnets?`,
          a: `CIDR writes a network as \`address/prefix\`. The prefix is how many leading bits are fixed; the rest are host bits. Number of addresses = 2^(32 − prefix).

- \`10.0.0.0/16\` → 2^16 = **65,536** addresses (10.0.0.0 to 10.0.255.255).
- \`10.0.1.0/24\` → 2^8 = **256** addresses (10.0.1.0 to 10.0.1.255).
- \`/32\` is a single IP, used in security group rules like \`203.0.113.10/32\`.

A common VPC plan with a \`/16\`:

| Subnet | CIDR | AZ |
|---|---|---|
| public-a | 10.0.1.0/24 | ap-south-1a |
| public-b | 10.0.2.0/24 | ap-south-1b |
| private-a | 10.0.11.0/24 | ap-south-1a |
| private-b | 10.0.12.0/24 | ap-south-1b |

In AWS, each subnet loses **5 addresses** (network, VPC router, DNS, one reserved for future use, broadcast), so a /24 gives 251 usable IPs. Subnets must not overlap, and the VPC range should not clash with office or peered networks.`,
          d: 'medium',
          at: 'Product companies, service companies',
          tip: `Quote the "5 reserved IPs per subnet" rule; it shows hands-on AWS experience.`,
        },
        {
          q: `Write a bash script that warns when the root disk is more than 80% full.`,
          a: `\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

THRESHOLD="\${1:-80}"          # first argument, default 80
USAGE=$(df --output=pcent / | tail -1 | tr -dc '0-9')

if [ "\${USAGE}" -ge "\${THRESHOLD}" ]; then
  echo "WARNING: root disk at \${USAGE}% on $(hostname)" >&2
  exit 1
fi
echo "OK: root disk at \${USAGE}%"
\`\`\`

How it works:
- \`set -euo pipefail\` stops the script on errors, unset variables and failed pipes.
- \`df --output=pcent /\` prints only the use percentage; \`tr -dc '0-9'\` keeps the digits.
- \`-ge\` is the numeric "greater or equal" test.
- A non-zero exit code lets cron, a CI job or a monitoring agent treat it as a failure.

Schedule it every 15 minutes with \`crontab -e\`:

\`\`\`bash
*/15 * * * * /opt/scripts/disk_check.sh 85 >> /var/log/disk_check.log 2>&1
\`\`\`

In production you would send the warning to Slack or let CloudWatch Agent publish disk metrics with an alarm instead.`,
          d: 'medium',
          at: 'Service companies, product companies',
          tip: `Always mention \`set -euo pipefail\` and exit codes; interviewers use them to judge real scripting experience.`,
        },
        {
          q: `How would you use Python with boto3 to find all stopped EC2 instances in a region?`,
          a: `\`boto3\` is the AWS SDK for Python. It picks up credentials from environment variables, \`~/.aws/credentials\` or the IAM role attached to the machine, so no keys go in the code.

\`\`\`python
import boto3

def stopped_instances(region="ap-south-1"):
    ec2 = boto3.client("ec2", region_name=region)
    paginator = ec2.get_paginator("describe_instances")
    pages = paginator.paginate(
        Filters=[{"Name": "instance-state-name", "Values": ["stopped"]}]
    )
    result = []
    for page in pages:
        for reservation in page["Reservations"]:
            for inst in reservation["Instances"]:
                tags = {t["Key"]: t["Value"] for t in inst.get("Tags", [])}
                result.append((inst["InstanceId"], tags.get("Name", "-")))
    return result

for instance_id, name in stopped_instances():
    print(instance_id, name)
\`\`\`

Points to mention: use a **paginator** because AWS returns results in pages; filter on the server side instead of in Python; run it from Lambda on a schedule to report or clean up forgotten resources and save cost.`,
          d: 'medium',
          at: 'Product companies',
          tip: `Say where credentials come from (an IAM role), never hard-coded keys.`,
        },
        {
          q: `How do you run an application as a systemd service on Linux and read its logs?`,
          a: `**systemd** is the init system on most modern distros (Ubuntu, Amazon Linux, RHEL). A unit file tells it how to start, stop and restart your app.

\`\`\`ini
# /etc/systemd/system/orders.service
[Unit]
Description=Orders API
After=network.target

[Service]
User=appuser
WorkingDirectory=/opt/orders
EnvironmentFile=/etc/orders.env
ExecStart=/opt/orders/venv/bin/gunicorn -b 0.0.0.0:8000 app:app
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
\`\`\`

\`\`\`bash
sudo systemctl daemon-reload        # read the new unit file
sudo systemctl enable --now orders  # start now and on every boot
systemctl status orders             # state, PID, last log lines
journalctl -u orders -f             # follow its logs
journalctl -u orders --since "10 min ago"
\`\`\`

Why it matters: \`Restart=on-failure\` brings the app back after a crash, \`enable\` survives reboots, and running as a non-root \`User\` limits damage if the app is compromised. Secrets belong in an \`EnvironmentFile\` with tight permissions, not inside the unit.`,
          d: 'hard',
          at: 'Product companies',
          tip: `Explain why you would not just run \`nohup python app.py &\`: no restart, no boot start, no log management.`,
        },
      ],
    },
    {
      title: 'Git, Docker and CI/CD Pipelines',
      questions: [
        {
          q: `What is the difference between git merge and git rebase? Which branching strategy have you used?`,
          a: `Both bring changes from one branch into another.

- **Merge** creates a merge commit that joins the two histories. History stays exactly as it happened. Safe on shared branches.
- **Rebase** replays your commits on top of the target branch, giving a straight, linear history. It rewrites commit IDs, so never rebase a branch others have already pulled.

\`\`\`bash
git checkout feature/login
git rebase main          # update my branch with the latest main
git checkout main
git merge --no-ff feature/login
\`\`\`

Common strategies:
- **Feature branches + pull requests** (GitHub flow): short-lived branches, review, merge to \`main\`, deploy from \`main\`.
- **Trunk-based development**: very small, frequent merges to \`main\`, unfinished work hidden behind feature flags. Popular with strong CI/CD.
- **GitFlow**: \`develop\`, \`release\` and \`hotfix\` branches; heavier, used for versioned releases.

In DevOps the branch strategy decides the pipeline: for example, PRs run tests, merges to \`main\` deploy to staging, tags deploy to production.`,
          d: 'easy',
          at: 'Service companies, product companies',
          tip: `State the golden rule: rebase local work, merge shared work.`,
        },
        {
          q: `What is Docker? How is a container different from a virtual machine?`,
          a: `**Docker** packages an application with its runtime, libraries and config into an **image**, and runs it as an isolated **container**. The same image runs on a laptop, a CI runner and a production server, which removes "works on my machine" problems.

| | Virtual machine | Container |
|---|---|---|
| Isolation | Full guest OS on a hypervisor | Shares the host kernel; isolated with namespaces and cgroups |
| Size | GBs | Usually tens to hundreds of MB |
| Start time | Minutes | Seconds or less |
| Density | Few per host | Many per host |
| Security boundary | Stronger | Weaker, since the kernel is shared |

Containers do not replace VMs in the cloud: an EC2 instance or Azure VM is a VM, and containers usually run **on** those VMs, or on managed services like ECS, Fargate, EKS, AKS or Azure Container Apps.`,
          d: 'easy',
          at: 'Service companies, product companies',
          tip: `Mention namespaces and cgroups by name; it shows you know a container is a process, not a tiny VM.`,
        },
        {
          q: `What is the difference between a Docker image and a container? List the Docker commands you use most.`,
          a: `An **image** is a read-only template built from a Dockerfile, made of layers. A **container** is a running (or stopped) instance of an image with its own writable layer. One image can run many containers, like a class and its objects.

\`\`\`bash
docker build -t orders-api:1.0 .        # build an image
docker images                           # list images
docker run -d -p 8080:8000 --name orders orders-api:1.0
docker ps -a                            # running and stopped containers
docker logs -f orders                   # follow logs
docker exec -it orders sh               # shell inside the container
docker stop orders && docker rm orders
docker tag orders-api:1.0 myrepo/orders-api:1.0
docker push myrepo/orders-api:1.0       # to Docker Hub, ECR or ACR
docker system prune                     # clean unused data
\`\`\`

\`-p 8080:8000\` maps host port 8080 to container port 8000. Data written inside a container is lost when it is removed, so use **volumes** (\`-v pgdata:/var/lib/postgresql/data\`) for anything that must persist.`,
          d: 'easy',
          at: 'Service companies',
          tip: `Bring up volumes yourself; "where does the database data go?" is the usual next question.`,
        },
        {
          q: `Write a production-ready Dockerfile for a Python Flask app and explain layer caching.`,
          a: `\`\`\`dockerfile
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

# 1. Dependencies first: this layer is cached until requirements.txt changes
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2. Then the code, which changes often
COPY . .

RUN useradd --create-home appuser
USER appuser

EXPOSE 8000
CMD ["gunicorn", "-b", "0.0.0.0:8000", "app:app"]
\`\`\`

**Layer caching**: each instruction creates a layer. Docker reuses a cached layer if the instruction and its inputs have not changed. Copying \`requirements.txt\` and installing packages **before** copying the code means a code-only change rebuilds in seconds instead of reinstalling every package.

Other good practices shown: a small \`slim\` base image, \`--no-cache-dir\` to keep the image small, a non-root user, gunicorn instead of the Flask dev server, and a \`.dockerignore\` (not shown) to keep \`.git\`, \`venv\` and secrets out of the build context.`,
          d: 'medium',
          at: 'Product companies, service companies',
          tip: `Point to the order of COPY lines; that is what the interviewer is checking.`,
        },
        {
          q: `What is the difference between CMD and ENTRYPOINT, and between COPY and ADD, in a Dockerfile?`,
          a: `**CMD vs ENTRYPOINT**
- \`ENTRYPOINT\` sets the executable that always runs.
- \`CMD\` sets default arguments, or the default command if there is no ENTRYPOINT. Anything you pass after the image name in \`docker run\` **replaces CMD**.

\`\`\`dockerfile
ENTRYPOINT ["python", "manage.py"]
CMD ["runserver", "0.0.0.0:8000"]
\`\`\`

\`docker run myapp\` runs \`python manage.py runserver 0.0.0.0:8000\`; \`docker run myapp migrate\` runs \`python manage.py migrate\`.

Use the **exec form** (JSON array). The shell form (\`CMD python app.py\`) runs under \`/bin/sh -c\`, so the app does not get signals like SIGTERM directly and may not shut down cleanly when Kubernetes stops the container.

**COPY vs ADD**
- \`COPY\` copies files from the build context. Predictable; use it by default.
- \`ADD\` can also download URLs and auto-extracts local tar archives. Use it only when you need the extraction.`,
          d: 'medium',
          at: 'Product companies',
          tip: `The SIGTERM point about the shell form is what separates a strong answer from an average one.`,
        },
        {
          q: `What is CI/CD? What is the difference between continuous delivery and continuous deployment?`,
          a: `- **Continuous Integration (CI)**: every push or pull request automatically builds the code and runs tests and checks (lint, unit tests, security scan). Problems are caught within minutes, while the change is small.
- **Continuous Delivery**: every change that passes the pipeline is packaged (for example a Docker image) and deployed to staging, so it is **always ready** to release. Production deploy needs a **manual approval**.
- **Continuous Deployment**: no manual step. Every change that passes all checks goes to production automatically.

A typical pipeline:

1. Checkout code
2. Install dependencies, lint, unit tests
3. Build an artifact or Docker image, tag it with the commit SHA
4. Scan the image, push to a registry (ECR, ACR, Docker Hub)
5. Deploy to staging, run smoke or integration tests
6. Approval, then deploy to production (rolling, blue/green or canary)
7. Monitor and roll back if error rates rise

Tools: GitHub Actions, GitLab CI, Jenkins, Azure DevOps Pipelines, AWS CodePipeline.`,
          d: 'medium',
          at: 'Service companies, product companies',
          tip: `Draw the pipeline stages in order; interviewers love a candidate who can sketch it on a whiteboard.`,
        },
        {
          q: `Write a GitHub Actions workflow that runs tests on every pull request and builds a Docker image on pushes to main.`,
          a: `\`\`\`yaml
# .github/workflows/ci.yml
name: ci
on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r requirements.txt
      - run: pytest -q

  build:
    needs: test
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          username: \${{ secrets.DOCKERHUB_USER }}
          password: \${{ secrets.DOCKERHUB_TOKEN }}
      - run: |
          docker build -t myorg/orders:\${{ github.sha }} .
          docker push myorg/orders:\${{ github.sha }}
\`\`\`

Key ideas: \`on\` lists the triggers; jobs run in parallel unless linked with \`needs\`; \`if\` limits the build to pushes; secrets come from the repository settings and are masked in logs; tagging with \`github.sha\` makes every image traceable to a commit.`,
          d: 'medium',
          at: 'Product companies',
          tip: `Explain why you tag with the commit SHA instead of \`latest\`: rollbacks become exact.`,
        },
        {
          q: `How do you keep secrets out of your code, Docker images and CI/CD pipelines?`,
          a: `**Never** put secrets in Git, Dockerfiles or image layers. Even a deleted file stays in Git history and in old image layers.

What to do instead:
- **CI secrets**: store them in GitHub Actions secrets or Azure DevOps variable groups; they are masked in logs.
- **Better, no long-lived keys at all**: GitHub Actions can use **OIDC** to assume an AWS IAM role (or an Azure federated credential) and get short-lived credentials for each run.

\`\`\`yaml
permissions:
  id-token: write
  contents: read
steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789012:role/github-deploy
      aws-region: ap-south-1
\`\`\`

- **Runtime secrets**: AWS Secrets Manager or SSM Parameter Store, Azure Key Vault, or Kubernetes Secrets (with encryption at rest or an external secrets operator). The app reads them at start-up through its IAM role or managed identity.
- **Detection**: secret scanning (GitHub secret scanning, gitleaks) in the pipeline and pre-commit hooks.
- If a secret leaks: **rotate it immediately**, then clean history.`,
          d: 'hard',
          at: 'Product companies',
          tip: `Saying "OIDC instead of access keys" marks you as current; many fresher answers stop at "use GitHub secrets".`,
        },
      ],
    },
    {
      title: 'AWS and Azure Core Services',
      questions: [
        {
          q: `What are AWS Regions, Availability Zones and edge locations?`,
          a: `- **Region**: a geographic area with its own set of data centres, such as \`ap-south-1\` (Mumbai) or \`ap-south-2\` (Hyderabad). Regions are independent; you choose one based on latency to users, data residency laws, service availability and price.
- **Availability Zone (AZ)**: one or more separate data centres inside a region, with independent power, cooling and networking, connected by low-latency links. A region usually has three or more AZs. Spreading servers across AZs protects you when one data centre fails.
- **Edge location**: a point of presence used by **CloudFront** (CDN) and **Route 53** to serve content and DNS close to users. There are many more edge locations than regions.

Azure uses the same ideas: **regions** (Central India, South India), **availability zones** inside many regions, and its own edge network for Azure Front Door and CDN.

Design rule: production workloads should run in **at least two AZs**; disaster recovery for critical systems may use a second region.`,
          d: 'easy',
          at: 'Amazon, service companies',
          tip: `Name the Mumbai region code; local examples make answers memorable.`,
        },
        {
          q: `Explain IAM users, groups, roles and policies. What is least privilege?`,
          a: `- **User**: an identity for a person or (avoid this) an application, with a password and/or access keys.
- **Group**: a collection of users that share policies, such as \`developers\`.
- **Role**: an identity with **no long-term credentials** that is assumed temporarily, by an EC2 instance, a Lambda function, another account or a CI pipeline. Applications on AWS should always use roles.
- **Policy**: a JSON document that allows or denies actions on resources.

\`\`\`json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:PutObject"],
    "Resource": "arn:aws:s3:::orders-invoices/*"
  }]
}
\`\`\`

**Least privilege** means giving only the permissions a job needs, on only the resources it needs, and nothing more. Avoid \`"Action": "*"\`. An explicit **Deny** always wins over an Allow. Also: enable MFA, never use the root account for daily work, and rotate or remove unused keys.

Azure equivalent: **Microsoft Entra ID** identities plus **Azure RBAC** role assignments, and **managed identities** in place of IAM roles for apps.`,
          d: 'easy',
          at: 'Amazon, product companies, service companies',
          tip: `Explain why an EC2 instance should use a role, not access keys saved on the disk.`,
        },
        {
          q: `What is Amazon S3? Explain storage classes, versioning and how you would host a static website.`,
          a: `**S3** is object storage: files (objects) in **buckets**, addressed by key. It is designed for 99.999999999% (11 nines) durability and scales without limits. Bucket names are globally unique.

Storage classes trade cost against access speed:
- **S3 Standard**: frequently accessed data.
- **S3 Intelligent-Tiering**: moves objects between tiers automatically when access patterns are unknown.
- **S3 Standard-IA / One Zone-IA**: infrequent access, cheaper storage, retrieval fee.
- **S3 Glacier** classes: archives and backups, cheapest, slower retrieval.

**Lifecycle rules** move objects between classes or delete them after N days. **Versioning** keeps every version of an object, protecting against accidental overwrite or delete.

Static website: upload the build (HTML, CSS, JS) to a bucket, keep **Block Public Access on**, and serve it through **CloudFront** using Origin Access Control, with an ACM certificate for HTTPS and Route 53 for the domain.

Azure equivalent: **Blob Storage** with Hot, Cool, Cold and Archive tiers.`,
          d: 'easy',
          at: 'Amazon, service companies',
          tip: `Recommending CloudFront with a private bucket instead of a public bucket shows security awareness.`,
        },
        {
          q: `What is the difference between security groups and network ACLs in AWS?`,
          a: `| | Security group | Network ACL |
|---|---|---|
| Applies to | An instance's network interface (EC2, RDS, ALB) | A whole subnet |
| State | **Stateful**: return traffic is allowed automatically | **Stateless**: you must allow return traffic (ephemeral ports 1024–65535) |
| Rules | Allow only | Allow and deny |
| Evaluation | All rules together | In number order; first match wins |
| Default | New SG denies all inbound, allows all outbound | Default NACL allows all |

A clean pattern is to reference security groups instead of IP ranges:

- \`alb-sg\`: allow 443 from \`0.0.0.0/0\`
- \`app-sg\`: allow 8080 **from \`alb-sg\`** only
- \`db-sg\`: allow 5432 **from \`app-sg\`** only

Use NACLs as a coarse second layer, for example to block a known bad IP range for a whole subnet.

Azure equivalent: **Network Security Groups (NSGs)**, which are stateful and can attach to a subnet or a NIC, with priority-ordered allow and deny rules.`,
          d: 'medium',
          at: 'Amazon, product companies',
          tip: `The SG-references-SG chain (ALB → app → DB) is the answer interviewers hope to hear.`,
        },
        {
          q: `When would you choose EC2, Lambda or containers on ECS/Fargate for an application?`,
          a: `- **EC2**: full control of a virtual machine and its OS. Good for legacy apps, custom software, long-running processes, or when you need specific instance types (GPU). You patch and scale it yourself (with Auto Scaling groups).
- **Lambda**: serverless functions triggered by events (API Gateway, S3 upload, SQS, schedule). No servers, pay per request and duration, scales automatically. Limits: maximum **15 minutes** per run, cold starts, and a stateless model. Great for event processing, light APIs and automation.
- **ECS on Fargate**: run Docker containers without managing servers. Good for always-on APIs and microservices that are already containerised and run longer than Lambda allows.
- **EKS**: managed Kubernetes when the team needs Kubernetes features or portability.

Example: an e-commerce app might run its API on Fargate, resize product images with Lambda on S3 upload, and keep a reporting tool on a small EC2 instance.

Azure equivalents: Virtual Machines, Azure Functions, Azure Container Apps (or Container Instances) and AKS.`,
          d: 'medium',
          at: 'Amazon, product companies',
          tip: `Always give one concrete trigger for Lambda (S3 upload, schedule); vague "serverless is cheaper" answers lose marks.`,
        },
        {
          q: `What is the difference between RDS Multi-AZ and read replicas?`,
          a: `Both copy your database, for different goals.

| | Multi-AZ | Read replica |
|---|---|---|
| Purpose | **High availability** | **Read scaling** |
| Replication | Synchronous to a standby in another AZ | Asynchronous (small lag possible) |
| Can you query it? | No (in the classic setup, the standby only waits) | Yes, read-only |
| On failure | Automatic failover; the same endpoint points to the standby | Manual promotion to a standalone DB |
| Location | Same region | Same or another region |

Use **Multi-AZ** for every production database so a data-centre failure causes a short failover, not an outage. Add **read replicas** when reports or heavy read traffic slow down the primary; the app sends reads to the replica endpoint and writes to the primary.

Also mention: automated **backups** with point-in-time restore, manual **snapshots** before risky changes, placing RDS in **private subnets**, and storing credentials in Secrets Manager.

Azure equivalents: Azure SQL Database and Azure Database for PostgreSQL/MySQL, with zone-redundant high availability and read replicas.`,
          d: 'medium',
          at: 'Amazon, service companies',
          tip: `Remember: Multi-AZ = availability, read replica = performance. Saying it in one line first helps.`,
        },
        {
          q: `Map the common AWS services to their Azure equivalents.`,
          a: `Many companies in India run both clouds, so interviewers check that you can translate.

| Need | AWS | Azure |
|---|---|---|
| Virtual machines | EC2 | Virtual Machines |
| Auto scaling | Auto Scaling groups | Virtual Machine Scale Sets |
| Object storage | S3 | Blob Storage |
| Identity and access | IAM | Microsoft Entra ID + Azure RBAC |
| App identity | IAM role | Managed identity |
| Private network | VPC | Virtual Network (VNet) |
| Firewall rules | Security groups | Network Security Groups |
| Load balancer (HTTP) | Application Load Balancer | Application Gateway |
| Managed SQL | RDS | Azure SQL Database, Azure Database for PostgreSQL/MySQL |
| Serverless functions | Lambda | Azure Functions |
| Managed Kubernetes | EKS | AKS |
| Container registry | ECR | Azure Container Registry |
| Monitoring and logs | CloudWatch | Azure Monitor, Log Analytics |
| Secrets | Secrets Manager | Key Vault |
| Native IaC | CloudFormation | ARM templates, Bicep |
| DNS | Route 53 | Azure DNS |

One structural difference: Azure groups resources into **resource groups** inside a subscription, which makes cleanup and cost tracking per project easy.`,
          d: 'medium',
          at: 'Service companies, product companies',
          tip: `Mention resource groups; it is the Azure concept AWS-first candidates most often forget.`,
        },
        {
          q: `Design a VPC for a web application with public and private subnets. How do private servers reach the internet?`,
          a: `Layout across **two AZs** in one region:

- **Public subnets** (one per AZ): the **Application Load Balancer** and **NAT gateways**. Their route table sends \`0.0.0.0/0\` to the **Internet Gateway (IGW)**.
- **Private app subnets**: EC2, ECS tasks or EKS nodes. No public IPs. Their route table sends \`0.0.0.0/0\` to the **NAT gateway** in the same AZ.
- **Private data subnets**: RDS and ElastiCache. No internet route at all.

\`\`\`text
Internet → IGW → ALB (public) → app (private) → RDS (private data)
app → NAT gateway (public) → IGW → internet   (outbound only)
\`\`\`

How private servers reach the internet: the **NAT gateway** lets them make outbound calls (package updates, external APIs) while nothing on the internet can start a connection to them.

Extras worth naming:
- **VPC endpoints** for S3 and DynamoDB (gateway endpoints) keep that traffic off the NAT gateway, which saves money and stays private.
- **SSM Session Manager** to reach private servers without a bastion host or open port 22.
- One NAT gateway per AZ avoids a single point of failure; one shared NAT is cheaper for dev.
- **VPC Flow Logs** for troubleshooting.`,
          d: 'hard',
          at: 'Amazon, product companies',
          tip: `Draw it: three subnet tiers, two AZs, arrows for IGW and NAT. A sketch beats a paragraph.`,
        },
      ],
    },
    {
      title: 'Kubernetes, Terraform and Monitoring',
      questions: [
        {
          q: `What is Kubernetes? Explain pods, nodes, deployments and services.`,
          a: `**Kubernetes** is a container orchestrator: you describe the desired state (for example, "3 copies of this image, reachable on port 80") and it keeps the cluster in that state, restarting crashed containers, rescheduling them when a node dies, and rolling out new versions.

- **Cluster**: a **control plane** (API server, scheduler, controller manager, etcd) plus **worker nodes**.
- **Node**: a VM or machine that runs pods, using the kubelet and a container runtime.
- **Pod**: the smallest deployable unit; one or more containers that share an IP address and volumes. Pods are temporary and get new IPs when recreated.
- **Deployment**: manages a ReplicaSet to keep N identical pods running and handles rolling updates and rollbacks.
- **Service**: a stable virtual IP and DNS name that load-balances traffic to the pods matching its label selector.
- **Namespace**: a logical partition, such as \`dev\` and \`prod\`.
- **ConfigMap / Secret**: configuration and sensitive values injected into pods.

Managed offerings take care of the control plane: **EKS** on AWS and **AKS** on Azure.`,
          d: 'easy',
          at: 'Product companies, service companies',
          tip: `Explain why you need a Service: pod IPs change, so clients need a stable name.`,
        },
        {
          q: `What is Infrastructure as Code? How is Terraform different from CloudFormation or Bicep?`,
          a: `**Infrastructure as Code (IaC)** means defining servers, networks, databases and permissions in code files, kept in Git and applied by a tool, instead of clicking in the console. Benefits: repeatable environments (dev, staging and prod built the same way), code review for infrastructure changes, history and rollback, and fast disaster recovery.

| | Terraform | CloudFormation | Bicep / ARM |
|---|---|---|---|
| Clouds | Many (AWS, Azure, GCP, plus SaaS such as GitHub, Datadog) through providers | AWS only | Azure only |
| Language | HCL | YAML/JSON | Bicep (compiles to ARM JSON) |
| State | Terraform keeps a **state file** you must store safely | Managed by AWS | Managed by Azure |
| Preview | \`terraform plan\` | Change sets | \`what-if\` |

Terraform's style is **declarative**: you write the end result, and it works out what to create, change or delete. It is popular in multi-cloud teams because one workflow covers both AWS and Azure. OpenTofu is an open-source fork of Terraform with the same language.`,
          d: 'easy',
          at: 'Service companies, product companies',
          tip: `The words "declarative" and "state file" are what interviewers listen for.`,
        },
        {
          q: `Write a Kubernetes Deployment and Service for a web API and explain the important fields.`,
          a: `\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders
spec:
  replicas: 3
  selector:
    matchLabels: { app: orders }
  template:
    metadata:
      labels: { app: orders }
    spec:
      containers:
        - name: orders
          image: myorg/orders:1.4.2
          ports: [{ containerPort: 8000 }]
          resources:
            requests: { cpu: 100m, memory: 128Mi }
            limits: { memory: 256Mi }
          readinessProbe:
            httpGet: { path: /health, port: 8000 }
          livenessProbe:
            httpGet: { path: /health, port: 8000 }
            initialDelaySeconds: 15
---
apiVersion: v1
kind: Service
metadata:
  name: orders
spec:
  selector: { app: orders }
  ports: [{ port: 80, targetPort: 8000 }]
\`\`\`

- \`selector.matchLabels\` must match the pod template's labels.
- **requests** help the scheduler place pods; **limits** cap usage (going over the memory limit gets the container killed).
- **readinessProbe** failing removes the pod from the Service; **livenessProbe** failing restarts the container.
- The Service gives other pods the DNS name \`orders\` on port 80.

Apply with \`kubectl apply -f orders.yaml\`; check with \`kubectl get pods,svc\`.`,
          d: 'medium',
          at: 'Product companies',
          tip: `Know readiness vs liveness cold; it is asked in almost every Kubernetes round.`,
        },
        {
          q: `Explain Kubernetes Service types and Ingress. How does outside traffic reach your pods?`,
          a: `- **ClusterIP** (default): reachable only inside the cluster. Used for internal services such as a database or a backend called by the frontend.
- **NodePort**: opens the same port (30000–32767 by default) on every node. Mostly for testing.
- **LoadBalancer**: asks the cloud for a load balancer (on EKS an AWS load balancer, on AKS an Azure Load Balancer) with a public address pointing at the Service. Simple, but one load balancer per service gets expensive.
- **Ingress**: one entry point that routes HTTP(S) by host and path to many ClusterIP services, handled by an **Ingress controller** (NGINX Ingress, AWS Load Balancer Controller, Application Gateway for Containers on Azure).

\`\`\`yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: shop
spec:
  ingressClassName: nginx
  rules:
    - host: shop.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend: { service: { name: orders, port: { number: 80 } } }
\`\`\`

So the flow is: DNS → cloud load balancer → Ingress controller → Service → pods. The newer **Gateway API** is the successor to Ingress with richer routing.`,
          d: 'medium',
          at: 'Product companies',
          tip: `Explain the cost reason for Ingress over many LoadBalancer services.`,
        },
        {
          q: `Explain the Terraform workflow with a small example. What do init, plan and apply do?`,
          a: `\`\`\`hcl
variable "env" { default = "dev" }

provider "aws" { region = "ap-south-1" }

resource "aws_s3_bucket" "logs" {
  bucket = "orders-logs-\${var.env}-7f3a"
  tags   = { Environment = var.env }
}

output "bucket_name" { value = aws_s3_bucket.logs.bucket }
\`\`\`

\`\`\`bash
terraform init      # download the AWS provider, set up the backend
terraform fmt       # format code
terraform validate  # syntax and reference checks
terraform plan      # show what will be created, changed or destroyed
terraform apply     # make the changes (asks for confirmation)
terraform destroy   # delete everything this config manages
\`\`\`

- **init** prepares the working directory; run it first and after adding providers or modules.
- **plan** compares your code with the **state file** and the real cloud, and prints a diff. Review it carefully, especially lines marked "destroy" or "must be replaced".
- **apply** carries out the plan and updates the state.

\`\${var.env}\` is interpolation; \`aws_s3_bucket.logs.bucket\` is a reference that also tells Terraform the order to create resources. In CI, save the plan with \`terraform plan -out=tfplan\` and apply exactly that file after approval.`,
          d: 'medium',
          at: 'Product companies, service companies',
          tip: `Say you always read the plan for "destroy" before applying; it shows production caution.`,
        },
        {
          q: `How do you monitor a cloud application? Explain metrics, logs, traces and alerts.`,
          a: `The three signals of **observability**:
- **Metrics**: numbers over time, such as CPU, memory, request count, latency and error rate. Cheap to store, good for dashboards and alerts.
- **Logs**: detailed event records. Use structured (JSON) logs with a request ID so you can search them.
- **Traces**: the path of one request across services, showing which hop is slow. OpenTelemetry is the common standard for producing them.

Tools: **CloudWatch** (metrics, Logs, alarms, dashboards) and X-Ray on AWS; **Azure Monitor**, Log Analytics and Application Insights on Azure; **Prometheus + Grafana** for Kubernetes; Datadog, New Relic and ELK/OpenSearch as third-party options.

What to watch for a web service (the **golden signals**): latency, traffic, errors and saturation.

Good alerts:
- Fire on **symptoms users feel** (5xx rate above 2% for 5 minutes, p95 latency above 1 second), not on every CPU spike.
- Go to the right channel (Slack, PagerDuty) with a runbook link.
- Are few enough that people do not ignore them.

Example: a CloudWatch alarm on the ALB's \`HTTPCode_Target_5XX_Count\` that notifies an SNS topic.`,
          d: 'medium',
          at: 'Product companies, service companies',
          tip: `Mention p95 latency instead of average; averages hide the slow requests users complain about.`,
        },
        {
          q: `A pod is in CrashLoopBackOff. How do you troubleshoot it?`,
          a: `**CrashLoopBackOff** means the container starts, exits, and Kubernetes keeps restarting it with growing delays. Work through it in order:

\`\`\`bash
kubectl get pods -n shop                    # status and restart count
kubectl describe pod orders-7d9f-x2 -n shop # events, exit code, last state
kubectl logs orders-7d9f-x2 -n shop         # current attempt
kubectl logs orders-7d9f-x2 -n shop --previous   # the attempt that crashed
kubectl get events -n shop --sort-by=.lastTimestamp
\`\`\`

Read the **exit code** in \`describe\`:
- **1** or another app code: the application threw an error. Logs usually show it: missing environment variable, bad config, cannot connect to the database.
- **137** with reason **OOMKilled**: the container exceeded its memory limit. Raise the limit or fix the leak.
- **139**: segmentation fault.

Other common causes: a **liveness probe** that fails too early (the app is slow to start, so add \`initialDelaySeconds\` or a \`startupProbe\`); a missing ConfigMap or Secret key; a wrong command or entrypoint; the image built for the wrong CPU architecture (ARM vs x86).

To debug interactively, run the same image with \`kubectl run debug --rm -it --image=myorg/orders:1.4.2 -- sh\` or use \`kubectl debug\`.`,
          d: 'hard',
          at: 'Product companies',
          tip: `\`--previous\` is the flag most candidates forget; current logs of a restarting pod are often empty.`,
        },
        {
          q: `Why does Terraform state need to be stored remotely with locking? How do you organise Terraform for several environments?`,
          a: `The **state file** maps resources in your code to real cloud IDs. If it lives on one laptop, teammates cannot work safely, it can be lost, and it may contain secrets in plain text.

**Remote state with locking** fixes this: state is stored centrally and only one \`apply\` can run at a time, so two people cannot corrupt it.

\`\`\`hcl
terraform {
  backend "s3" {
    bucket       = "acme-tf-state"
    key          = "orders/prod/terraform.tfstate"
    region       = "ap-south-1"
    encrypt      = true
    use_lockfile = true   # S3-native locking (Terraform 1.10+); older setups use a DynamoDB table
  }
}
\`\`\`

On Azure the \`azurerm\` backend stores state in a Storage Account blob and uses blob leases for locking. Turn on bucket versioning and restrict access, because state can contain passwords.

Organising environments:
- Put reusable pieces in **modules** (\`modules/vpc\`, \`modules/ecs-service\`) with inputs and outputs.
- Keep a separate folder and state per environment (\`envs/dev\`, \`envs/prod\`) that calls the modules with different variables, so a mistake in dev cannot touch prod.
- Pin provider and module versions.
- Run \`plan\` on every pull request and \`apply\` only from the pipeline.
- Never edit state by hand; use \`terraform state mv\`, \`import\` blocks or \`terraform state rm\` when refactoring.`,
          d: 'hard',
          at: 'Product companies',
          tip: `Explain why separate state per environment limits the blast radius of mistakes.`,
        },
      ],
    },
    {
      title: 'Scenarios and project questions',
      questions: [
        {
          q: `Walk me through your cloud or DevOps capstone project.`,
          a: `Use a clear structure and keep it to about two minutes:

1. **Problem**: "I deployed a food-ordering API so it could be released many times a day without downtime."
2. **Architecture**: "A Flask API in Docker, images in ECR, running on ECS Fargate behind an ALB across two AZs, PostgreSQL on RDS in private subnets, and static frontend on S3 with CloudFront."
3. **Automation**: "Terraform builds the VPC, ECS, RDS and IAM. GitHub Actions runs tests, builds the image tagged with the commit SHA, and deploys with a rolling update. It uses OIDC instead of AWS keys."
4. **Operations**: "CloudWatch dashboards and an alarm on 5xx errors to Slack; logs in CloudWatch Logs."
5. **A problem you solved**: "Tasks kept failing health checks because the container listened on 127.0.0.1; binding to 0.0.0.0 fixed it."
6. **Results and next steps**: deploy time, monthly cost, what you would add (autoscaling, blue/green).

Be ready to open the repository, explain any line of the Terraform or pipeline, and say what each resource costs.`,
          d: 'easy',
          at: 'Service companies, product companies',
          tip: `Have one real bug story ready; "what was the hardest part?" always follows.`,
        },
        {
          q: `A teammate accidentally pushed AWS access keys to a public GitHub repository. What do you do?`,
          a: `Act in minutes; bots scan GitHub for keys constantly.

1. **Deactivate and delete the key** in IAM immediately. Removing the commit is **not** enough: the key is already exposed in history, forks and caches.
2. **Create a new key** only if one is truly needed; better, move the workload to an IAM role or OIDC so there is no long-lived key.
3. **Check what the key did**: search **CloudTrail** for API calls made with that access key ID; look for new IAM users, EC2 instances in unusual regions (crypto mining), changes to S3 bucket policies.
4. **Check billing** for sudden spikes and clean up anything the attacker created.
5. **Remove it from Git history** (git filter-repo or BFG) and force-push, after rotation.
6. **Prevent a repeat**: enable GitHub secret scanning and push protection, add gitleaks to pre-commit and CI, keep \`.env\` in \`.gitignore\`, and grant least-privilege permissions so a leaked key can do little harm.

AWS may also email you if it detects the exposed key and attach a quarantine policy; do not rely on that.`,
          d: 'easy',
          at: 'Product companies, service companies',
          tip: `Lead with "rotate first, clean history later"; the order is the whole answer.`,
        },
        {
          q: `Your website on an EC2 instance is not loading. How do you troubleshoot it step by step?`,
          a: `Go from outside in:

1. **DNS**: \`nslookup shop.example.com\` — does it resolve to the right IP or load balancer?
2. **Instance state**: is it running and are both **status checks** passing in the console?
3. **Network path**:
   - Security group allows inbound 80/443 from your IP or \`0.0.0.0/0\`?
   - Subnet route table has \`0.0.0.0/0\` → Internet Gateway, and the instance has a public or Elastic IP?
   - Network ACL is not blocking the port or the return ephemeral ports?
4. **On the server** (SSH or SSM Session Manager):
\`\`\`bash
sudo systemctl status nginx
ss -tulpn | grep -E ':80|:443'      # listening, and on 0.0.0.0 not 127.0.0.1?
curl -I http://localhost             # works locally?
df -h; free -h                       # disk full or out of memory?
sudo tail -n 50 /var/log/nginx/error.log
\`\`\`
5. **Behind a load balancer**: are the targets healthy? Does the health check path return 200?
6. **App and dependencies**: can the app reach its database (security group from app to DB)?

Fix the cause, then add monitoring so you hear about it before users do.`,
          d: 'medium',
          at: 'Product companies, service companies',
          tip: `Saying "curl localhost on the box" splits network problems from app problems in one step.`,
        },
        {
          q: `Design a highly available, scalable three-tier web application on AWS.`,
          a: `**Goal**: survive the loss of one data centre and handle traffic spikes.

- **Edge**: Route 53 for DNS, CloudFront for static files and caching, AWS WAF for common attacks, ACM certificates for HTTPS.
- **Web/app tier**: an **Application Load Balancer** in public subnets across **two or three AZs**, forwarding to EC2 instances in an **Auto Scaling group** (or ECS Fargate services) in private subnets. Scale on CPU or request count per target.
- **Data tier**: **RDS Multi-AZ** in private data subnets, read replicas for heavy reads, **ElastiCache (Redis)** for sessions and hot data. User uploads go to **S3**, not the server disk.
- **Stateless app servers**: no sessions on local disk, so any instance can serve any request and can be replaced at any time.
- **Async work**: SQS queue plus workers or Lambda for emails, invoices and image processing.
- **Security**: SG chain ALB → app → DB, IAM roles, Secrets Manager.
- **Operations**: CloudWatch alarms, centralised logs, automated RDS backups, everything built with Terraform.

On Azure the same design uses Front Door, Application Gateway, VM Scale Sets or Container Apps, Azure SQL with zone redundancy and Azure Cache for Redis.`,
          d: 'medium',
          at: 'Amazon, product companies',
          tip: `Say "stateless app tier" out loud; it is the idea that makes autoscaling work.`,
        },
        {
          q: `The AWS bill suddenly doubled this month. How do you find the cause and reduce cost?`,
          a: `**Find it**
- **Cost Explorer**: group by service, then by region, usage type and tag. The spike usually points to one service.
- Common culprits: forgotten EC2 or RDS instances in another region, **NAT gateway data processing**, unattached EBS volumes and old snapshots, unused Elastic IPs (public IPv4 addresses are charged), large CloudWatch Logs ingestion, data transfer out, an autoscaling group that never scaled in, or a leaked key used for crypto mining.
- **CloudTrail** shows who created the expensive resources.

**Reduce it**
- Stop or delete unused resources; schedule dev environments to shut down at night.
- **Right-size** instances using CPU and memory data (Compute Optimizer helps).
- Use **Savings Plans or Reserved Instances** for steady load and **Spot instances** for interruptible work.
- S3 lifecycle rules to cheaper classes; log retention limits.
- VPC gateway endpoints for S3 traffic instead of the NAT gateway.
- Graviton (ARM) instances where the software supports them.

**Prevent it**: **AWS Budgets** alerts, mandatory cost-allocation tags (project, owner, env) and a monthly review.

Azure has the same tools under **Cost Management + Billing** with budgets and Advisor recommendations.`,
          d: 'medium',
          at: 'Product companies',
          tip: `NAT gateway charges and forgotten resources in another region are the two answers that impress.`,
        },
        {
          q: `A new release broke production. How do you roll back, and which deployment strategies reduce this risk?`,
          a: `**Right now: restore service, investigate later.**
- Kubernetes: \`kubectl rollout undo deployment/orders\` (or redeploy the previous image tag).
- ECS: update the service to the previous task definition revision. With the deployment circuit breaker and rollback option enabled, ECS rolls back failed deployments automatically.
- Because images are tagged with commit SHAs, "previous version" is exact.
- **Database changes** are the hard part: a migration that dropped a column cannot be undone by redeploying. Use backward-compatible migrations (expand, then contract in a later release).

**Strategies that limit the damage**
- **Rolling update**: replace instances a few at a time; health checks stop a bad rollout. Default in Kubernetes and ECS.
- **Blue/green**: run the new version (green) next to the old (blue), switch traffic at the load balancer, switch back instantly if needed. Costs double capacity briefly.
- **Canary**: send 5–10% of traffic to the new version, watch error rate and latency, then increase. Needs good metrics.
- **Feature flags**: deploy code switched off, then turn features on gradually without a redeploy.

Afterwards, hold a **blameless post-mortem**: timeline, root cause, and an action item such as a test or alarm that would have caught it.`,
          d: 'hard',
          at: 'Product companies',
          tip: `Bring up database migrations yourself; it shows you know rollbacks are not always just redeploys.`,
        },
        {
          q: `Your application becomes slow during a sale and CPU is at 100%. How do you investigate and scale it?`,
          a: `**Stabilise first**
- Scale out: raise the Auto Scaling group's desired count, or the ECS service or Kubernetes Deployment replicas. Check the database can take the extra connections.

**Find the bottleneck** (do not assume it is the app servers)
- Load balancer metrics: request count, target response time, 5xx errors.
- App servers: CPU, memory, thread or worker saturation; profile the slow endpoints using traces (X-Ray, Application Insights, OpenTelemetry).
- **Database**: CPU, connections, slow query log, missing indexes, locks. A single unindexed query can saturate RDS and make every app server look slow.
- External calls: payment gateway or third-party API timeouts tying up workers.

**Fix and scale properly**
- **Autoscaling policies**: target tracking on CPU around 60% or on requests per target, so capacity is added before 100%. In Kubernetes, a Horizontal Pod Autoscaler plus Cluster Autoscaler or Karpenter for nodes.
- **Caching**: CloudFront for static and cacheable pages, Redis for repeated queries and sessions.
- **Database**: indexes, read replicas for reads, connection pooling (RDS Proxy).
- **Queues**: move slow work (emails, invoices) to SQS and workers.
- **Load test** before the next sale (k6, JMeter, Locust) and pre-scale for known events.`,
          d: 'hard',
          at: 'Product companies',
          tip: `Checking the database before adding servers is the insight interviewers are looking for.`,
        },
        {
          q: `Design a CI/CD pipeline that takes a microservice from a pull request to production on Kubernetes (EKS or AKS).`,
          a: `**On every pull request**
1. Lint, unit tests, coverage threshold.
2. Build the Docker image; scan code and image for vulnerabilities (Trivy or similar); scan for secrets.
3. \`terraform plan\` if infrastructure changed, posted as a PR comment.
4. Branch protection: required checks and one review before merge.

**On merge to main**
1. Build once, tag with the commit SHA, push to **ECR or ACR**. The same image is promoted to every environment; never rebuild per environment.
2. Deploy to **staging** with Helm or Kustomize (or update a GitOps repo that **Argo CD/Flux** syncs to the cluster).
3. Run smoke and integration tests against staging.

**To production**
1. Manual approval (GitHub environment protection rules or an Azure DevOps approval gate).
2. Rolling or canary deploy; readiness probes gate traffic.
3. Watch error rate and latency for 10–15 minutes; roll back automatically or with one command if they rise.

**Cross-cutting**: OIDC to the cloud (no stored keys), per-environment config in ConfigMaps and secrets from Secrets Manager or Key Vault, pipeline notifications to Slack, and every deploy traceable to a commit and an approver.`,
          d: 'hard',
          at: 'Product companies',
          tip: `"Build once, promote the same image" is the single principle interviewers most want to hear.`,
        },
      ],
    },
  ],
};

export default book;
