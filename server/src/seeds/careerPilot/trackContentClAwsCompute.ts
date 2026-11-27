/**
 * Career-track content: AWS Compute and Storage (CL_AWS_COMPUTE_STORAGE), Cloud & DevOps Engineer, batch CL1.
 *
 * What a cloud engineer does with EC2, EBS, EFS, Auto Scaling and S3 at work: launch and reach servers safely,
 * give them the right disks, run them as a self-healing fleet, store objects without leaking them, keep data for
 * as long as it is needed and prove it restores, and pay for all of it sensibly. It builds on Year 2's "A Machine
 * You Do Not Own", Year 3's "Compute and Storage, Chosen" and "What It Costs", and on this track's AWS
 * Foundations (account safety, IAM, the CLI and boto3) and AWS Networking (VPCs, security groups, load
 * balancers); those are referred to by title, not re-taught.
 *
 * Two fictional companies run through the topic: BazaarBolt, a Hyderabad e-commerce start-up with festival
 * sale-day spikes, and Ankura Health, a diagnostics chain whose lab reports must be kept for years. Everything
 * runs in ap-south-1 (Mumbai) with disaster-recovery copies in ap-south-2 (Hyderabad). Account ids are the
 * documentation placeholder 123456789012. No prices are stated: pricing is taught as a model and students are
 * sent to the pricing page and calculator.
 *
 * Every boto3 example was run against moto 5.2 (boto3 1.43) and its printed output is quoted as printed;
 * resource ids are random per run. Where moto does not implement or enforce something (instance refresh,
 * backup selections, cross-AZ attach errors, lifecycle minimum days, Block Public Access refusals), the notes
 * say the snippet or error text was written from the AWS documentation and not run. AWS CLI and shell commands
 * on instances were not run (no AWS account was used).
 *
 * Skills: CLOUD_COMPUTE by default; the EBS/EFS, S3 and lifecycle/backup lessons are CLOUD_STORAGE. Checkpoint
 * questions plainly about the other skill use ck('CLOUD_STORAGE', ...) or ck('CLOUD_COMPUTE', ...).
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_CL_AWS_COMPUTE_STORAGE_BUNDLES: PilotBundle[] = [
  /* ── EC2_BASICS ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_COMPUTE_STORAGE_EC2_BASICS',
    notes: `In Year 2's "A Machine You Do Not Own" you created a cloud server and reached it. This lesson is the
working engineer's version: choosing an instance type on purpose, starting from the right image, configuring the
server at boot without logging in, reaching it with no SSH port open, and closing the metadata hole that has
caused real breaches. The running example is BazaarBolt, a Hyderabad e-commerce start-up, whose web tier runs in
Mumbai (ap-south-1). Before you create anything in your own account, the budget alarm from "A Safe AWS Account"
must already exist.

## Reading an instance type

An instance type name is a small specification. Take **m7g.large**:

- **m** — the family. **M** is general purpose, **T** is burstable general purpose, **C** is compute-optimised
  (more CPU per GiB of memory), **R** and **X** are memory-optimised, **I** and **D** are storage-optimised
  (fast local disks), and **P, G, Inf, Trn** carry accelerators.
- **7** — the generation. Newer generations usually give better price-performance; prefer them.
- **g** — attributes: **g** is AWS Graviton (ARM), **a** is AMD, **i** is Intel, **d** adds local NVMe instance
  store, **n** adds network bandwidth.
- **large** — the size. Each step up (large, xlarge, 2xlarge...) roughly doubles vCPU and memory.

Ask the API rather than memorising. Real output from describe_instance_types (run against moto):

    c7g.xlarge  vCPU=4 mem=8192 MiB arch=['arm64']
    m7g.large   vCPU=2 mem=8192 MiB arch=['arm64']
    r6i.large   vCPU=2 mem=16384 MiB arch=['x86_64']
    t3.micro    vCPU=2 mem=1024 MiB arch=['x86_64']

Notice the ratios: C gives 2 GiB per vCPU, M gives 4, R gives 8. Pick the family from what the workload runs out
of first (a Java API usually wants memory, an image resizer wants CPU), then the smallest size that holds the
peak with headroom. **T instances** earn CPU credits while idle and spend them when busy; T3 and newer launch in
"unlimited" mode by default, which keeps them fast under sustained load and adds a charge for the surplus. They
suit spiky, mostly idle work (a dev box, an admin panel), not a server that is busy all day.

## AMIs: the image a server starts from

An **AMI** (Amazon Machine Image) is a template for the root volume plus launch settings. AMIs are **regional**:
the same Amazon Linux release has a different id in Mumbai and in Hyderabad, and you copy your own AMIs to
another region for disaster recovery. Never hard-code an AMI id in a script — it goes stale with every patch
release. AWS publishes the current ids as public SSM parameters:

    ami = ssm.get_parameter(
        Name="/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
    )["Parameter"]["Value"]

Choose an AMI from Amazon, a verified publisher, or your own pipeline. A random community AMI is somebody's
server image with unknown contents. Teams often "bake" their own **golden AMI** (patched OS, agents installed)
with EC2 Image Builder or Packer, so boot time is short and every server starts identical.

## User data: configure at first boot

**User data** is a script (or cloud-init config) that runs **as root, once, at first boot**. It is how you turn
a plain AMI into a web server without anyone logging in. It is limited to 16 KB, the logs land in
/var/log/cloud-init-output.log on Amazon Linux, and it is **not a secret store**: anyone who can describe the
instance attribute can read it. Fetch secrets at runtime from Secrets Manager or Parameter Store using the
instance's role.

## Reaching the server: Session Manager, not an open port 22

The old habit — a key pair, port 22 open to 0.0.0.0/0, a .pem file passed around on WhatsApp — is how servers
get brute-forced and how leavers keep access. Use **AWS Systems Manager Session Manager** instead:

- The SSM agent (preinstalled on Amazon Linux 2023) makes an **outbound** connection to Systems Manager. The
  security group needs **no inbound rule** at all.
- The instance needs an **instance profile** whose role includes the AWS managed policy
  AmazonSSMManagedInstanceCore, and a path to the SSM endpoints (a NAT gateway, or the interface endpoints for
  ssm, ssmmessages and ec2messages from "Endpoints, Peering, Transit Gateway and VPN").
- Access is IAM-controlled (no shared keys), and sessions can be logged to CloudWatch Logs or S3.

From a laptop (written from the CLI documentation, not run here):

    aws ssm start-session --target i-0123456789abcdef0 --region ap-south-1

EC2 Instance Connect is the fallback when SSH itself is needed: it pushes a short-lived public key and still lets
you keep port 22 closed to the internet. Azure's equivalent of all this is Azure Bastion.

## Instance metadata and IMDSv2

Every instance can query **http://169.254.169.254** for its id, region and — critically — the temporary
credentials of its role. IMDSv1 answers any GET request, so an attacker who tricks the app into fetching a URL
(server-side request forgery) can read the role's keys. **IMDSv2** requires a session token obtained with a PUT
first, which a forwarded GET cannot do:

    TOKEN=$(curl -s -X PUT http://169.254.169.254/latest/api/token \\
      -H "X-aws-ec2-metadata-token-ttl-seconds: 300")
    curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \\
      http://169.254.169.254/latest/meta-data/placement/region

Require IMDSv2 on every launch (HttpTokens "required"). A hop limit of 1 also stops containers that sit behind an
extra network hop on the host from reaching the metadata service; raise it to 2 only for container hosts that
genuinely need it.

## Launching it from Python

The boto3 launch BazaarBolt's platform team uses (you met clients, waiters and paginators in "The AWS CLI and
boto3"):

    ec2 = boto3.client("ec2", region_name="ap-south-1")
    r = ec2.run_instances(
        ImageId=ami, InstanceType="t3.micro", MinCount=1, MaxCount=1,
        UserData=USER_DATA,                       # boto3 base64-encodes this for run_instances
        MetadataOptions={"HttpTokens": "required", "HttpPutResponseHopLimit": 1},
        TagSpecifications=[{"ResourceType": "instance",
                            "Tags": [{"Key": "Name", "Value": "bb-web-1"},
                                     {"Key": "owner", "Value": "platform"}]}],
    )
    iid = r["Instances"][0]["InstanceId"]
    ec2.get_waiter("instance_running").wait(InstanceIds=[iid])

Real output against moto (ids are random each run):

    AMI: ami-08e3b3155fc937a94
    i-c30bdaf4b0d498f37 running t3.micro ap-south-1a IMDS tokens: required
    user data (stored base64), first line: #!/bin/bash

In a real account you would also pass IamInstanceProfile (for Session Manager), SubnetId (a private subnet) and
SecurityGroupIds (no inbound from the internet; the load balancer's group only).

## Lifecycle facts that bite

- **Stop** keeps the EBS root volume; **terminate** deletes it unless DeleteOnTermination is off. Instance store
  data is lost on stop, and a stopped instance still pays for its EBS volumes.
- A public IPv4 address changes on stop and start unless it is an Elastic IP — and AWS charges for public IPv4
  addresses, which is one more reason to keep servers in private subnets behind a load balancer.
- Turn on **termination protection** for anything hand-built and precious; better still, make nothing precious
  (the Auto Scaling lesson).
- Tag everything at launch (Name, owner, env, cost-centre): "AWS Organizations, OUs and tagging" showed why
  untagged resources become nobody's bill.

Azure's names: Virtual Machines, images, custom data and the Instance Metadata Service; the ideas carry over.`,
    workedExample: `**Scenario.** BazaarBolt's security review asks one question about EC2: "which running servers still allow
IMDSv1?" There are dozens of instances across teams. You write a script that finds them and fixes them.

**1. Find them, with a paginator.** describe_instances returns pages; a script that reads only the first page
silently misses servers in a big account.

    def imds_v1_allowed():
        found = []
        pages = ec2.get_paginator("describe_instances").paginate(
            Filters=[{"Name": "instance-state-name", "Values": ["pending", "running", "stopped"]}])
        for page in pages:
            for res in page["Reservations"]:
                for i in res["Instances"]:
                    if i["MetadataOptions"]["HttpTokens"] != "required":
                        name = next((t["Value"] for t in i.get("Tags", []) if t["Key"] == "Name"), "-")
                        found.append((i["InstanceId"], name))
        return found

Stopped instances are included on purpose: they will start again one day with the old setting.

**2. Fix them.** The setting can be changed on a running instance, no reboot needed:

    for iid, _ in bad:
        ec2.modify_instance_metadata_options(InstanceId=iid, HttpTokens="required")

**3. Real output** against moto, with two compliant web servers and one legacy batch box:

    IMDSv1 still allowed: ['legacy-batch']
    after fix: []

**4. Before you flip it in production.** Very old SDKs and hand-written scripts that curl the metadata service
without a token will break. Check the instance's MetadataNoToken CloudWatch metric (requests that arrived
without a token) for a week first; if it is zero, the change is safe. If not, upgrade the caller, then enforce.

**5. Stop it coming back.** Fixing today's servers does not fix tomorrow's. Put HttpTokens "required" in every
launch template, set the account-level default for new instances (ec2 modify-instance-metadata-defaults), and
let the guardrail lesson's service control policy deny launches that do not require IMDSv2. The script then
becomes a weekly check that should always print an empty list.`,
    mcqs: [
      mcq('BazaarBolt\'s product-image resizer is CPU-bound and uses little memory. Which family should the team start from?', [
        ['C (compute-optimised), then the smallest size that holds the peak', true],
        ['R (memory-optimised), since bigger memory makes every job faster', false],
        ['T (burstable), since it is the default choice for any steady workload', false],
        ['I (storage-optimised), since image files are written to local disk', false],
      ], 'C instances give the most CPU per GiB of memory, which is what a CPU-bound job runs out of. R wastes money on memory it will not use, T suits spiky mostly-idle work rather than sustained CPU, and I is for workloads limited by local disk IO, not CPU.'),
      mcq('A script launches servers with ImageId="ami-0abc..." copied from a blog post written for us-east-1. It fails in ap-south-1. Why?', [
        ['AMI ids are regional, so that id does not exist in Mumbai', true],
        ['ap-south-1 accepts only AMIs that were built with Packer', false],
        ['AMI ids expire after 30 days and must be refreshed by hand', false],
        ['Mumbai requires an ARM AMI for every new instance type', false],
      ], 'An AMI lives in one region; the same OS release has a different id elsewhere, which is why scripts resolve the id from the public SSM parameter in their own region. There is no Packer-only rule, AMI ids do not expire on a timer, and x86 AMIs run fine in Mumbai.'),
      mcq('Why does requiring IMDSv2 defend against a server-side request forgery bug in a web app?', [
        ['The token must be fetched with a PUT, which a forwarded GET cannot do', true],
        ['IMDSv2 encrypts the role credentials so stolen copies are unreadable', false],
        ['IMDSv2 moves the metadata service to a private DNS name outside the VPC', false],
        ['IMDSv2 removes role credentials from the metadata service completely', false],
      ], 'An SSRF bug usually lets an attacker make the app send a simple GET; IMDSv2 answers only requests carrying a session token obtained by a PUT. The credentials are not encrypted for the reader, the address is still 169.254.169.254, and role credentials are still served to legitimate callers.'),
    ],
    checkpoint: [
      mcq('A new teammate opens port 22 to 0.0.0.0/0 "just to debug" a private EC2 instance. What do you suggest instead?', [
        ['Session Manager via the instance role, with no inbound rule at all', true],
        ['Keep port 22 open but move SSH to port 2222 so scanners miss it', false],
        ['Give the instance a public IP and share one .pem key with the team', false],
        ['Open port 22 to 0.0.0.0/0 but only on weekdays during office hours', false],
      ], 'Session Manager connects outbound from the agent, is controlled by IAM and can be logged, so nothing listens to the internet. A different port is still found by scanners, a shared key cannot be revoked per person, and a timed open port is still an open port.'),
      mcq('BazaarBolt puts the database password in EC2 user data so the app can read it at boot. What is the problem?', [
        ['Anyone allowed to describe the instance attribute can read it', true],
        ['User data runs on every reboot, so the password changes each time', false],
        ['User data is deleted after boot, so the app cannot read it later', false],
        ['User data is limited to ASCII, so passwords with symbols break', false],
      ], 'User data is stored with the instance and readable through the API and the metadata service; it is configuration, not a secret store. Secrets belong in Secrets Manager or Parameter Store, fetched with the instance role. User data runs once by default, is not deleted, and is not limited to ASCII.'),
      mcq('An on-call engineer stops and starts an EC2 instance that has a large local NVMe instance store holding a cache. What happens to the cache?', [
        ['It is lost: instance store does not survive a stop', true],
        ['It is kept, because stop and start keep all disks', false],
        ['It is moved to an EBS snapshot automatically on stop', false],
        ['It is kept only if termination protection is turned on', false],
      ], 'Instance store is physically attached to the host and is wiped when the instance stops (it survives only a reboot). EBS volumes are kept, no automatic snapshot is taken, and termination protection guards against terminate, not data loss on stop.'),
    ],
  },

  /* ── EBS_EFS ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_COMPUTE_STORAGE_EBS_EFS',
    notes: `A server needs somewhere to keep data that outlives a process. AWS gives you three shapes, and picking the
wrong one is a common, expensive mistake: **block storage** that one server formats as a disk (EBS), **ephemeral
local disks** on the host (instance store), and **shared file storage** many servers mount at once (EFS, or FSx).
Year 3's "Compute and Storage, Chosen" introduced the trade-off; here you run them.

## EBS: a network disk in one Availability Zone

An **EBS volume** is a block device attached over the network to one instance (Multi-Attach exists for io1/io2
and clustered software only). Facts that shape every design:

- A volume lives in **one Availability Zone** and attaches only to instances in that same AZ. A volume in
  ap-south-1b cannot be attached to an instance in ap-south-1a; the API refuses with a zone-mismatch error.
- It persists independently of the instance. The root volume is deleted on termination by default
  (DeleteOnTermination), extra volumes are not — which is why accounts fill with forgotten "available" volumes.
- You can grow it, change its type and change its performance **online** (Elastic Volumes), then grow the file
  system inside the OS (growpart and xfs_growfs or resize2fs). After a modification you must wait before
  modifying the same volume again (AWS documents a six-hour gap).

## Volume types

    Type        Medium   Use it for                                   Performance model
    gp3         SSD      default: boot volumes, most apps, small DBs  baseline 3,000 IOPS and 125 MiB/s
                                                                        at any size; buy more separately
    gp2         SSD      older default; migrate to gp3                IOPS grow with size (3 per GiB)
    io2 (Block  SSD      busy databases needing high, consistent      provisioned IOPS, highest durability
     Express)              IOPS and low latency
    st1         HDD      big sequential reads: logs, data pipelines   throughput, not IOPS; not bootable
    sc1         HDD      cold sequential data read rarely             lowest cost; not bootable

The practical rule: **start with gp3**, size capacity for the data, then set IOPS and throughput for the measured
workload. gp3 decouples performance from size, so you no longer buy a 1 TB gp2 volume just to get its IOPS.
Check the current maximums on the EBS volume types page before promising a number.

## Snapshots

A **snapshot** is a point-in-time backup of a volume, stored regionally (in S3, managed by AWS) and
**incremental**: after the first, each snapshot stores only changed blocks. From a snapshot you can create a
volume in **any AZ** of the region (that is how you move a disk between AZs), copy it to another region for
disaster recovery, or share it with another account. Two cautions:

- A volume created from a snapshot loads its blocks lazily, so the first read of each block is slow. For a
  database restore, pre-read the volume (fio or dd) or use Fast Snapshot Restore before taking traffic.
- A crash-consistent snapshot of a busy database may need recovery on restore. Flush or freeze writes, or use
  the database's own backup tooling (the AWS Databases topic) for databases.

Automate snapshots with Amazon Data Lifecycle Manager or AWS Backup (next-but-one lesson), never by memory.

## Encryption

EBS encryption uses KMS keys and is transparent to the OS. Turn on **encryption by default** per region once,
so no unencrypted volume can be created again. An existing unencrypted volume cannot be encrypted in place:
snapshot it, copy the snapshot with encryption on, create a new volume, and swap.

## Running it with boto3

Real output from moto for BazaarBolt's order-database data volume (ebs.py in the scratch folder):

    ec2.enable_ebs_encryption_by_default()
    vol = ec2.create_volume(AvailabilityZone="ap-south-1a", Size=100, VolumeType="gp3",
                            Iops=6000, Throughput=250, Encrypted=True, ...)
    ec2.attach_volume(VolumeId=vid, InstanceId=iid, Device="/dev/sdf")
    snap = ec2.create_snapshot(VolumeId=vid, Description="orders-db nightly", ...)
    hyd = boto3.client("ec2", region_name="ap-south-2")
    copy = hyd.copy_snapshot(SourceRegion="ap-south-1", SourceSnapshotId=snap["SnapshotId"],
                             Encrypted=True, Description="DR copy of orders-db nightly")

    encryption by default: True
    vol-19580357581558c91 gp3 100 GiB iops 6000 throughput 250 encrypted True -> attached /dev/sdf
    snapshot snap-90d535871cce238bf of vol-19580357581558c91 encrypted True
    copied to ap-south-2 as snap-1275d8e5582b5a66a
    unattached: vol-6f1da29d2a55bc103 gp2 500 GiB ap-south-1b

Note copy_snapshot is called **in the destination region** with SourceRegion naming where it comes from. The
last line is the cost check every account needs: volumes in state "available" are attached to nothing and still
billed. Moto does not enforce the same-AZ attach rule, so the zone-mismatch error is described from the
documentation rather than shown.

## Instance store

Some types (the "d" variants, the I family) have NVMe disks physically in the host. They are very fast and
included in the instance price, and **ephemeral**: the data survives a reboot but is lost on stop, terminate or
host failure. Use them for caches, scratch space and replicated data stores that tolerate losing a node — never
for the only copy of anything.

## EFS: shared files across AZs

**Amazon EFS** is managed NFS (v4.1) for Linux. One file system is mounted by many instances, containers or
Lambda functions at once, across AZs, and grows and shrinks with the data — no capacity to provision. You create a
**mount target** in each AZ's subnet, guarded by a security group that allows TCP 2049 only from the app tier.

    fs = efs.create_file_system(CreationToken="bb-media-share", PerformanceMode="generalPurpose",
                                ThroughputMode="elastic", Encrypted=True, ...)
    for s in subnets:
        efs.create_mount_target(FileSystemId=fsid, SubnetId=s, SecurityGroups=[sg])
    efs.put_lifecycle_configuration(FileSystemId=fsid, LifecyclePolicies=[
        {"TransitionToIA": "AFTER_30_DAYS"}, {"TransitionToPrimaryStorageClass": "AFTER_1_ACCESS"}])

Real output against moto:

    fsmt-c6ceb4ab ap-south-1a 10.20.1.4
    fsmt-e9040f64 ap-south-1b 10.20.2.4
    fs-ec8ff259 elastic encrypted True
    [{'TransitionToIA': 'AFTER_30_DAYS'}, {'TransitionToPrimaryStorageClass': 'AFTER_1_ACCESS'}]

On an instance (not run here), with the amazon-efs-utils package: sudo mount -t efs -o tls fs-ec8ff259:/ /mnt/media.
The lifecycle policy moves files untouched for 30 days to the cheaper Infrequent Access class and brings them
back on first access. EFS costs more per GiB than EBS and has higher per-operation latency; it is the right
answer when several servers must see the same files (uploaded media for a web fleet, shared home directories,
a CMS), not as a faster or "safer" EBS.

**When not EFS:** Windows file shares (FSx for Windows File Server), high-performance computing scratch (FSx for
Lustre), and anything that is really objects fetched by key (S3, next lessons). Azure's equivalents are Managed
Disks, temporary disks, and Azure Files.`,
    workedExample: `**Scenario.** BazaarBolt runs three things on EC2 in Mumbai and asks you to choose storage for each.

**1. The order database (PostgreSQL on one instance, moving to RDS next quarter).** Block storage, one
writer, steady random IO. **gp3**, encrypted, 200 GiB for the data and growth, with IOPS raised above the
baseline after measuring peak sale-day IO from the volume's CloudWatch metrics (VolumeReadOps, VolumeWriteOps,
VolumeQueueLength). io2 only if gp3 at its ceiling still shows latency. Daily snapshots kept 14 days, copied to
ap-south-2. **Not** instance store: a stop would lose the database.

**2. The web tier's product images uploaded by sellers.** Six web servers across two AZs must all serve the same
files. EBS cannot be shared across AZs, so the choice is between EFS and S3. Since images are fetched by key and
served to browsers, **S3 behind CloudFront** is cheaper and scales better; EFS would work but every image
request would go through a web server. Choose S3 (next lessons) — and EFS only for the legacy CMS plugin
that insists on a POSIX path.

**3. The search service's index cache.** Rebuilt from the database in minutes, read constantly, latency
matters. Instance store on an i-family or "d" type is ideal: fastest disks, no extra charge, and losing a node
only costs a rebuild.

**4. The forgotten money.** The volume audit from the notes found a 500 GiB gp2 volume "available" in ap-south-1b.
Before deleting: check its tags and CreateTime, snapshot it (cheap insurance), tell the owner, wait a week,
then delete the volume and keep the snapshot for 30 days.

**5. The migration.** Existing gp2 volumes become gp3 online with modify_volume(VolumeType="gp3") — no
downtime, usually a lower bill and equal or better baseline performance. Record each volume's current IOPS
first so gp3 is set at least as high.`,
    mcqs: [
      mcq('An engineer tries to attach a volume in ap-south-1b to an instance in ap-south-1a and gets an error. What is the fix?', [
        ['Snapshot the volume and create a new one from it in ap-south-1a', true],
        ['Enable Multi-Attach on the volume so that it can be used across zones', false],
        ['Detach and retry; cross-zone attach succeeds on a second try', false],
        ['Change the volume type to gp3, which can attach in any zone', false],
      ], 'EBS volumes are bound to one AZ; snapshots are regional, so a volume created from the snapshot can live in any AZ. Multi-Attach is for several instances in the same AZ, retrying does not change the rule, and no volume type crosses zones.'),
      mcq('Six web servers in two Availability Zones must read and write the same uploaded files through a POSIX path. Which storage fits?', [
        ['An EFS file system with a mount target in each AZ', true],
        ['One shared gp3 volume attached to all six of the web servers', false],
        ['Instance store on each server, synced by cron', false],
        ['An io2 volume with Multi-Attach across both AZs', false],
      ], 'EFS is shared NFS reachable from every AZ through its mount targets. A gp3 volume attaches to one instance in one AZ, instance store is ephemeral and per-host, and io2 Multi-Attach works only within one AZ and needs cluster-aware software.'),
      mcq('Why is migrating gp2 volumes to gp3 usually a safe early cost win?', [
        ['gp3 gives a fixed performance baseline at any size, with no downtime to switch', true],
        ['gp3 volumes are stored on HDDs, which cost less than SSD storage per GiB', false],
        ['gp3 needs no snapshots, because AWS keeps a copy in a second region', false],
        ['gp3 removes the need to grow the file system after resizing the volume', false],
      ], 'gp3 decouples IOPS and throughput from size and is changed online with Elastic Volumes. It is SSD, it still needs your snapshots, and a resized volume still needs the file system grown inside the OS.'),
    ],
    checkpoint: [
      mcq('An existing unencrypted EBS volume must become encrypted. Which procedure works?', [
        ['Snapshot it, copy the snapshot with encryption, create a volume from the copy, swap', true],
        ['Call modify_volume with Encrypted=True and wait for the optimising state to end', false],
        ['Turn on encryption by default for the region; existing volumes encrypt overnight', false],
        ['Detach it, set the KMS key on the volume, and reattach it to the same instance', false],
      ], 'Encryption is fixed when a volume is created, so the route is through an encrypted snapshot copy. modify_volume changes size, type and performance only, encryption by default affects new volumes, and a key cannot be set on an existing volume.'),
      mcq('A database volume restored from last night\'s snapshot is attached, and the first queries are very slow. What is the most likely cause?', [
        ['Blocks load lazily from the snapshot on first read until the volume is warmed', true],
        ['Restored volumes always run as sc1 until AWS re-optimises them after a week', false],
        ['The snapshot was incremental, so half of the data blocks are missing for good', false],
        ['Encrypted volumes are slower than unencrypted ones on every read and write', false],
      ], 'A volume created from a snapshot fetches each block on first access; pre-reading it or Fast Snapshot Restore removes the penalty. The type does not change, incremental snapshots still restore complete volumes, and EBS encryption has no meaningful performance cost.'),
      ck('CLOUD_COMPUTE', 'A team wants the fastest scratch disk for a node that can be rebuilt in minutes if lost. Which choice and instance fits?', [
        ['Instance store on a type with local NVMe disks, such as a "d" variant', true],
        ['An io2 volume on a T-family instance, for the highest possible durability', false],
        ['An EFS file system in Max I/O mode, mounted from every AZ', false],
        ['An st1 volume, since HDD throughput beats SSD for small random IO', false],
      ], 'Local NVMe instance store is the fastest disk and is fine for data you can rebuild. io2 buys durability the team does not need, EFS adds network latency, and st1 is poor at small random IO.'),
    ],
  },

  /* ── AUTO_SCALING ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_COMPUTE_STORAGE_AUTO_SCALING',
    notes: `One hand-built server is a pet: when it dies at 2 a.m., someone wakes up. A cloud engineer runs **cattle**: a
group of identical servers described by a template, which replaces any member that fails and grows or shrinks
with load. On AWS that is a **launch template** plus an **Auto Scaling group (ASG)**, usually behind the load
balancer from "Load Balancers and CloudFront". BazaarBolt needs exactly this for its web tier, which sees ten
times its normal traffic at midnight when a festival sale opens.

## Launch templates

A **launch template** holds everything run_instances would take: AMI, instance type, security groups, instance
profile, metadata options, user data, tags, EBS settings. It is **versioned**: every change creates a new
version, and an ASG points at a specific version, at $Default, or at $Latest. Pinning a version number gives you
a controlled rollout; $Latest means the next instance launched picks up whatever was saved last.

    lt = ec2.create_launch_template(
        LaunchTemplateName="bb-web",
        VersionDescription="nginx on AL2023",
        LaunchTemplateData={
            "ImageId": ami, "InstanceType": "t3.small",
            "SecurityGroupIds": [sg],
            "IamInstanceProfile": {"Name": "bb-web-instance"},
            "MetadataOptions": {"HttpTokens": "required"},
            "UserData": USER_DATA_B64,              # launch templates need it base64-encoded yourself
            "TagSpecifications": [{"ResourceType": "instance",
                                   "Tags": [{"Key": "app", "Value": "bb-web"}]}],
        })["LaunchTemplate"]

One trap: run_instances base64-encodes user data for you, but **LaunchTemplateData does not** — pass plain text
and the API answers InvalidUserData.Malformed (you will see it in the debugging unit). Launch configurations are
the older mechanism; AWS no longer adds features to them and new accounts cannot create them. Use templates.

## The group

    asg.create_auto_scaling_group(
        AutoScalingGroupName="bb-web-asg",
        LaunchTemplate={"LaunchTemplateName": "bb-web", "Version": "$Latest"},
        MinSize=2, MaxSize=10, DesiredCapacity=2,
        VPCZoneIdentifier=",".join(subnets),       # private subnets in two AZs
        HealthCheckType="ELB", HealthCheckGracePeriod=120,
    )

- **Min, max, desired**: desired is what the group aims for now; scaling moves it between min and max. Min 2
  across two AZs means one AZ can fail and the service survives. Max is your cost ceiling — set it on purpose.
- **Subnets in several AZs**: the group balances instances across them and rebalances after an AZ recovers.
- **Health checks**: the default EC2 check only notices a dead VM. **HealthCheckType="ELB"** also replaces
  instances that the load balancer marks unhealthy (the app is down but the VM is up), which is what you want.
  The **grace period** must cover boot plus user data plus app start, or the group kills instances that were
  only starting up.
- Attach the group to the load balancer's **target group** (TargetGroupARNs) so new instances receive traffic
  automatically.

Real output against moto, including replacing an instance that was terminated by hand:

    lt-912e997d760e6aac8 bb-web latest version 1
    min/desired/max: 2 2 10 health check: ELB
      i-0f9f5c81b900ba4b9 InService Healthy
      i-25f969d3fed858a6f InService Healthy
    after terminating i-0f9f5c81b900ba4b9 -> ['i-25f969d3fed858a6f', 'i-7867965b77b896574']

The terminated instance was replaced without anyone acting. That is the whole point.

## Scaling policies

- **Target tracking** (start here): "keep average CPU near 50%" or "keep requests per target near 1,000". The ASG
  creates and manages the CloudWatch alarms itself; do not edit them by hand.
- **Step scaling**: you define alarms and steps ("CPU above 70% add 2, above 85% add 4"). Useful when the
  response must be non-linear; more to maintain.
- **Scheduled actions**: change min/desired/max at a time. Sale days are known in advance — pre-warm before
  midnight rather than hoping the policy reacts fast enough to a vertical spike. Times are UTC unless you pass
  TimeZone (for example "Asia/Kolkata").
- **Predictive scaling**: learns daily and weekly patterns from history and scales ahead of them.

    asg.put_scaling_policy(
        AutoScalingGroupName="bb-web-asg", PolicyName="cpu50",
        PolicyType="TargetTrackingScaling",
        TargetTrackingConfiguration={
            "PredefinedMetricSpecification": {"PredefinedMetricType": "ASGAverageCPUUtilization"},
            "TargetValue": 50.0,
        })
    asg.put_scheduled_update_group_action(
        AutoScalingGroupName="bb-web-asg", ScheduledActionName="sale-prewarm",
        StartTime="2026-10-31T17:30:00Z", MinSize=6, MaxSize=20, DesiredCapacity=8)

Real output:

    policy: cpu50 TargetTrackingScaling 50.0
    scheduled: sale-prewarm 2026-10-31 17:30:00+00:00 6 8 20

17:30 UTC is 23:00 IST, an hour before the midnight sale. Choose the scaling metric honestly: CPU is a fine
default for a CPU-bound app; for an IO-bound API, ALBRequestCountPerTarget usually tracks load better.
**Instance warm-up** tells the policy to ignore a new instance's metrics until it is ready, so the group does
not over-scale while instances boot. Remember the scale-out speed limit: a group can only add capacity as fast
as an instance boots. A golden AMI that starts in 40 seconds scales far better than user data that compiles for
six minutes.

## Rolling out a new version: instance refresh

A new AMI means a new template version and replacing every instance without downtime. **Instance refresh** does
it in batches while keeping a minimum healthy percentage. Moto 5.2 does not implement it; this call is written
from the boto3 documentation and not run:

    asg.start_instance_refresh(
        AutoScalingGroupName="bb-web-asg",
        Preferences={"MinHealthyPercentage": 90, "InstanceWarmup": 120,
                     "AutoRollback": True},
    )

With MinHealthyPercentage 90 on a 10-instance group, it replaces one instance at a time and waits for the new one
to be healthy and warm before the next. Checkpoints can pause at a percentage so you look at metrics before
continuing, and auto-rollback returns to the previous configuration if the refresh fails.

## Lifecycle hooks and termination

**Lifecycle hooks** pause an instance in Pending:Wait or Terminating:Wait so you can finish work — register with
a service, or drain a queue worker and ship its logs before it disappears. Pair them with the load balancer's
deregistration delay so in-flight requests finish. **Scale-in protection** stops the group choosing a specific
instance (a worker mid-job) for termination.

Azure's equivalent is Virtual Machine Scale Sets with autoscale rules; the concepts map one to one.`,
    workedExample: `**Scenario.** BazaarBolt's Diwali sale opens at 00:00 IST. Last year the site fell over for 11 minutes at
midnight while the ASG (min 2, max 10, CPU 50%) scaled from 2 to 10 instances. The postmortem found three
causes. You redesign the group.

**1. Reacting is too late for a cliff.** Traffic went from normal to ten times normal in under a minute.
Target tracking needs a few minutes of metrics, then instances need minutes to boot. Fix: a **scheduled action**
at 23:00 IST setting min 6, desired 8, max 20, and another at 03:00 IST returning to min 2, desired 2, max 10.
Target tracking stays on to handle whatever the forecast missed.

**2. Boot was slow.** User data installed packages and pulled the app from S3: about five minutes per
instance. Fix: bake a **golden AMI** in the pipeline with everything installed; user data now only reads
configuration. Boot to healthy drops to about a minute (measure it; do not assume).

**3. Healthy instances were killed.** HealthCheckGracePeriod was 30 seconds, so ELB health checks failed during
start-up and the group terminated instances that were still booting — a replacement loop at peak. Fix: grace
period comfortably above the measured boot-to-healthy time, and a real /healthz endpoint that checks the app,
not just nginx.

**4. The ceiling was too low and nobody knew.** Max 10 capped capacity while CPU sat at 95%. Fix: max 20 for the
sale window, an alarm when desired equals max for five minutes, and a confirmed EC2 vCPU service quota in
ap-south-1 high enough for 20 instances (request quota increases days before, not on the night).

**5. Rehearse it.** A load test a week before the sale (k6 or Locust from a separate account, against a staging
copy) at twice the forecast, watching desired capacity, target response time and 5xx counts. The scheduled
actions are checked with describe_scheduled_actions the same afternoon.

**Result.** At midnight eight warm instances are already serving; target tracking adds four more by 00:06.
Nobody is paged.`,
    mcqs: [
      mcq('BazaarBolt\'s ASG uses the default EC2 health check. The app has crashed on one instance but the VM is still running. What happens?', [
        ['Nothing: the EC2 check passes, so the broken instance stays in service', true],
        ['The ASG replaces it at once, because every health check probes the app', false],
        ['The load balancer terminates the instance after three failed checks', false],
        ['The instance reboots itself, because the SSM agent notices the crash', false],
      ], 'The EC2 health check only sees VM status. HealthCheckType="ELB" makes the group act on the load balancer\'s view of the app. A load balancer stops routing to an unhealthy target but does not terminate it, and the SSM agent does not restart apps.'),
      mcq('A group scales on CPU but launches far more instances than needed during every spike, then removes them. Which setting most likely fixes it?', [
        ['An instance warm-up so booting instances\' metrics are ignored until ready', true],
        ['A launch template pinned to $Latest so the newest AMI is always used', false],
        ['A larger maximum size so the group has more room to add instances when needed', false],
        ['A switch from target tracking to the default EC2 health check type', false],
      ], 'While new instances boot, the average still looks high, so the policy keeps adding capacity; warm-up excludes them until ready. The template version, a larger max or the health check type do not change how scaling reads its metric.'),
      mcq('Why does BazaarBolt add a scheduled action before the midnight sale instead of relying on target tracking alone?', [
        ['A step change that steep outruns metric delay plus instance boot time', true],
        ['Target tracking is switched off automatically between 00:00 and 06:00', false],
        ['Scheduled actions are cheaper per instance-hour than target tracking', false],
        ['Target tracking cannot scale out above the group\'s desired capacity', false],
      ], 'Target tracking reacts after metrics rise, and new instances take time to boot, so a known cliff is better met with capacity already running. Target tracking is not time-limited, scheduling does not change instance pricing, and target tracking moves desired capacity up to max.'),
    ],
    checkpoint: [
      mcq('A new AMI is ready for a 10-instance ASG serving live traffic. What rolls it out without downtime?', [
        ['A new template version, then an instance refresh with a minimum healthy percentage', true],
        ['Terminating all ten instances at once so the group relaunches them from the new AMI', false],
        ['Logging in to each instance with Session Manager and running the OS upgrade by hand', false],
        ['Editing the AMI id inside the running instances\' user data from the console', false],
      ], 'Instance refresh replaces instances in batches while keeping enough healthy capacity. Terminating all at once causes an outage, hand upgrades drift from the template, and user data of running instances does not change their image.'),
      mcq('Instances in an ASG are terminated a minute after launch, again and again, during a deploy. Logs show the app needs three minutes to start. What is the cause?', [
        ['The health check grace period is shorter than the app\'s start-up time', true],
        ['The ASG max size is too low for the number of instances being launched', false],
        ['The launch template is pinned to version 1 rather than to $Latest', false],
        ['The target tracking policy is set to 50% instead of 70% average CPU', false],
      ], 'With ELB health checks and a short grace period, instances fail checks while starting and are replaced, which repeats forever. Max size limits growth, the version pin decides which configuration launches, and the scaling target does not terminate instances that are starting.'),
      mcq('Queue workers in an ASG lose half-finished jobs when the group scales in. Which feature lets a worker finish before it is terminated?', [
        ['A termination lifecycle hook that waits until the worker is drained', true],
        ['A launch template version that installs a newer worker process', false],
        ['A larger desired capacity, so no worker is ever terminated at all', false],
        ['A health check type of EC2, so the instance is never marked unhealthy', false],
      ], 'A Terminating:Wait hook pauses termination so the worker can finish or hand back its job (scale-in protection on busy instances also helps). A new version does not change termination, a fixed high capacity wastes money, and the health check type is unrelated to scale-in.'),
    ],
  },

  /* ── S3_FUNDAMENTALS ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_COMPUTE_STORAGE_S3_FUNDAMENTALS',
    notes: `S3 is the storage most of your systems will touch: invoices, uploads, logs, backups, data-lake tables,
static sites, Terraform state. It is also the service behind a long list of Indian data-exposure headlines, nearly
all of them one setting: a bucket someone made readable by the world. This lesson is about using S3 well and
making that mistake impossible. BazaarBolt stores customer invoices in it.

## Buckets, keys and objects

- A **bucket** lives in one region; its name is globally unique, 3 to 63 lowercase characters. Put the region and
  purpose in it: bb-invoices-prod-apsouth1.
- An **object** is bytes plus metadata, addressed by a **key** such as 2026/10/INV-000417.pdf. There are no real
  folders: the console shows "/" as folders, but listing by **prefix** is just string matching on keys.
- Objects can be up to 5 TB; a single PUT carries up to 5 GB, and multipart upload (which boto3's upload_file
  does for you above a threshold) is the way for large files.
- S3 is **strongly consistent** for reads after writes and for listings. Durability is designed for eleven nines
  across multiple AZs (except One Zone classes).

## Storage classes

    Class                     For                                          Watch out for
    S3 Standard               hot data, read often                         the default
    S3 Intelligent-Tiering    unknown or changing access patterns          small monitoring charge per object
    S3 Standard-IA            read rarely but needed in milliseconds       per-GB retrieval charge, 30-day minimum
    S3 One Zone-IA            re-creatable data, rarely read               one AZ: lost if that AZ is lost
    S3 Glacier Instant Ret.   archives read about once a quarter           90-day minimum, retrieval charge
    S3 Glacier Flexible Ret.  archives; minutes-to-hours restore           restore first, then read
    S3 Glacier Deep Archive   compliance archives read almost never        hours to restore, 180-day minimum

The pricing model is storage per GB-month, plus requests, plus retrieval for the colder classes, plus data
transfer out to the internet. Infrequent-access classes also bill small objects as if they were at least 128 KB.
Read the S3 pricing page for the actual figures. The next lesson automates moving data between classes.

## Who can read it: the access model

Access to an object is decided by IAM policies on the caller (the IAM lesson), the **bucket policy**, and the
**Block Public Access** settings over them. Since 2023, new buckets have Block Public Access on and object
ACLs disabled (Object Ownership "bucket owner enforced") by default — keep it that way, and manage access with
policies, not ACLs.

**Block Public Access** has four settings — BlockPublicAcls, IgnorePublicAcls, BlockPublicPolicy,
RestrictPublicBuckets — at the bucket and at the **account** level. Turn all four on at the account level for
every account that does not serve a public website straight from S3 (and even websites should use CloudFront
with origin access control, so the bucket stays private). With BlockPublicPolicy on, AWS rejects any bucket
policy that would grant public access with AccessDenied. Moto does not enforce that refusal, so it is described
here rather than shown.

A bucket policy every production bucket should carry — refuse anything not sent over TLS:

    {"Sid": "DenyInsecureTransport", "Effect": "Deny", "Principal": "*", "Action": "s3:*",
     "Resource": ["arn:aws:s3:::bb-invoices-prod-apsouth1",
                  "arn:aws:s3:::bb-invoices-prod-apsouth1/*"],
     "Condition": {"Bool": {"aws:SecureTransport": "false"}}}

Note the two resources: actions on the bucket (ListBucket) use the bucket ARN, actions on objects (GetObject)
use bucket/*. Forgetting one of them is the most common bucket-policy bug.

## Encryption and versioning

All new objects are encrypted at rest by default with SSE-S3. Use **SSE-KMS** with a customer managed key when
you need key-level access control and an audit trail of decryptions — then the reader also needs kms:Decrypt on
the key, a classic source of AccessDenied. Turn on **S3 Bucket Keys** with SSE-KMS to cut the number of KMS
calls. **Versioning** keeps every version of every key; an overwrite or delete no longer destroys data (a delete
adds a "delete marker"). Once enabled, versioning can be suspended but never removed.

## Running it

From s3.py (run against moto):

    s3 = boto3.client("s3", region_name="ap-south-1",
                      config=Config(signature_version="s3v4", s3={"addressing_style": "virtual"}))
    s3.create_bucket(Bucket=BUCKET, CreateBucketConfiguration={"LocationConstraint": "ap-south-1"})
    s3.put_public_access_block(Bucket=BUCKET, PublicAccessBlockConfiguration={
        "BlockPublicAcls": True, "IgnorePublicAcls": True,
        "BlockPublicPolicy": True, "RestrictPublicBuckets": True})
    s3.put_bucket_encryption(Bucket=BUCKET, ServerSideEncryptionConfiguration={"Rules": [{
        "ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "aws:kms", "KMSMasterKeyID": key},
        "BucketKeyEnabled": True}]})
    s3.put_bucket_versioning(Bucket=BUCKET, VersioningConfiguration={"Status": "Enabled"})

Outside us-east-1, create_bucket needs the LocationConstraint. After writing the same key twice, the real output:

    encryption: aws:kms | versions: 2

## Sharing one object: presigned URLs

A customer must download **their** invoice, without a public bucket and without AWS credentials. The app, which
holds a role allowed to read the object, signs a URL that is valid for a short time:

    url = s3.generate_presigned_url("get_object", Params={"Bucket": BUCKET, "Key": k}, ExpiresIn=600)

Real output, inspecting the URL:

    host: bb-invoices-prod-apsouth1.s3.ap-south-1.amazonaws.com
    query keys: ['X-Amz-Algorithm', 'X-Amz-Credential', 'X-Amz-Date', 'X-Amz-Expires', 'X-Amz-Signature', 'X-Amz-SignedHeaders']
    expires: 600 seconds

Facts to know: signing happens locally (no API call), so a URL can be generated for a key that does not exist; the
URL carries the signer's permissions, so sign with a narrowly scoped role; SigV4 URLs last at most seven days, and
a URL signed with temporary role credentials stops working when those credentials expire, whatever ExpiresIn
says. For uploads from a browser or app, presign put_object or use generate_presigned_post with conditions (a
content-length range, a fixed key prefix). The client config above pins SigV4 and the regional endpoint, so the
URL points straight at Mumbai.

Azure Blob Storage has the same shapes: storage accounts and containers, access tiers, "allow blob public access"
off, and SAS tokens in place of presigned URLs.`,
    workedExample: `**Scenario.** A security researcher emails BazaarBolt: "your marketing assets are listable from the internet."
You are asked to find every bucket at risk in the account and fix it in an afternoon.

**1. Inventory the buckets and their two key settings.** s3_audit.py, run against moto with three buckets set up
the way real accounts drift:

    for b in s3.list_buckets()["Buckets"]:
        bpa, public = check(b["Name"])     # get_public_access_block + get_bucket_policy_status
        flag = "PUBLIC" if public else ("review" if bpa != "all on" else "ok")

Real output:

    bb-invoices-prod-apsouth1    block-public-access=all on   policy-public=False ok
    bb-app-logs                  block-public-access=NOT SET  policy-public=False review
    bb-campaign-temp             block-public-access=NOT SET  policy-public=True  PUBLIC

The check function treats the "NoSuchPublicAccessBlockConfiguration" and "NoSuchBucketPolicy" error codes as
answers, not crashes: a bucket with no settings is exactly what you are looking for.

**2. Read the public policy before deleting anything.** bb-campaign-temp has "Principal": "*" with s3:GetObject
on every object — made public "for a day" for an ad agency last Diwali. Ask what the agency still needs; the
answer is usually a few files, which presigned URLs or a CloudFront distribution with origin access control can
serve without a public bucket.

**3. Contain.** Delete the public policy, then turn on all four Block Public Access settings on the bucket — and
at the **account** level, so the next bucket cannot repeat this. Check access logs or CloudTrail data events (if
they were on) for who fetched the objects while the bucket was public; if personal data was exposed, this becomes
an incident with DPDP Act obligations, not a quiet fix.

**4. Prevent.** An SCP that denies s3:PutBucketPublicAccessBlock changes outside the platform role, an AWS Config
rule (s3-bucket-public-read-prohibited) to alert on drift, and the audit script on a weekly schedule. The
expected weekly output is a list of "ok" lines.`,
    mcqs: [
      mcq('A bucket policy allows s3:ListBucket and s3:GetObject on "arn:aws:s3:::bb-reports/*" only. Listing fails, downloads work. Why?', [
        ['ListBucket acts on the bucket ARN, which the policy does not name', true],
        ['ListBucket needs Block Public Access off before it can succeed', false],
        ['Objects encrypted with SSE-S3 can be read but never listed', false],
        ['Bucket policies may grant only one action per statement', false],
      ], 'Bucket-level actions match arn:aws:s3:::bb-reports, object-level actions match bb-reports/*; a policy needs both resources. Block Public Access is unrelated to a named principal\'s access, SSE-S3 does not affect listing, and a statement can list many actions.'),
      mcq('BazaarBolt\'s app signs an invoice download URL with ExpiresIn=86400 using its EC2 role credentials. Customers report it fails after a few hours. What explains it?', [
        ['The URL dies when the temporary role credentials that signed it expire', true],
        ['S3 caps every presigned URL at exactly one hour, whatever ExpiresIn says', false],
        ['The bucket\'s versioning invalidates presigned URLs after each new write', false],
        ['Presigned URLs only work for buckets that have Block Public Access off', false],
      ], 'A presigned URL is only as valid as the credentials that signed it, and role credentials rotate within hours. The SigV4 maximum is seven days, not one hour, versioning does not revoke signatures, and presigned URLs work on private buckets — that is their purpose.'),
      mcq('After a reader\'s IAM policy allows s3:GetObject, reads of SSE-KMS objects still fail with AccessDenied. What is missing?', [
        ['kms:Decrypt on the customer managed key for that reader', true],
        ['s3:PutObject, which S3 checks before every read request', false],
        ['A public bucket policy, because KMS objects need one', false],
        ['Versioning, which SSE-KMS objects require to be read', false],
      ], 'With SSE-KMS, S3 decrypts on the caller\'s behalf and needs the caller to be allowed kms:Decrypt on the key. Reads do not need PutObject, KMS never needs public access, and versioning is unrelated to decryption.'),
    ],
    checkpoint: [
      mcq('An ad agency needs to download 12 campaign images from a private bucket this week. What is the safest way?', [
        ['Short-lived presigned URLs for those 12 objects, generated by a scoped role', true],
        ['A bucket policy with "Principal": "*" on the objects until the campaign ends', false],
        ['Turning off Block Public Access on the bucket for the week, then back on', false],
        ['An IAM user with s3:* for the agency, with its access key emailed to them', false],
      ], 'Presigned URLs share exactly those objects for a limited time without changing the bucket\'s exposure. A public policy or disabled Block Public Access exposes everything, and a long-lived key with s3:* hands over far more than 12 images.'),
      mcq('A finance team deletes an invoice by mistake from a bucket with versioning enabled. What can you do?', [
        ['Remove the delete marker or copy back the previous version', true],
        ['Nothing; versioning only protects against overwrites, not deletes', false],
        ['Ask AWS Support to restore it from their internal S3 backups', false],
        ['Suspend versioning, which brings back every deleted object', false],
      ], 'A delete on a versioned bucket only adds a delete marker; the old version is still there. Versioning protects deletes too, AWS does not restore customer objects, and suspending versioning restores nothing.'),
      mcq('Which setting stops anyone in the account from attaching a bucket policy that makes a bucket public?', [
        ['Block Public Access with BlockPublicPolicy on, at the account level', true],
        ['Default encryption with SSE-KMS on every bucket in the account', false],
        ['Versioning enabled on every bucket in the account, then suspended again', false],
        ['Object Ownership set to "object writer" on each bucket', false],
      ], 'BlockPublicPolicy makes S3 reject policies that grant public access, and the account-level setting covers every bucket. Encryption and versioning do not limit who can read, and "object writer" ownership re-enables ACLs, which makes exposure easier.'),
    ],
  },

  /* ── S3_LIFECYCLE_BACKUP ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_COMPUTE_STORAGE_S3_LIFECYCLE_BACKUP',
    notes: `Ankura Health, a diagnostics chain in Hyderabad, stores every lab report as a PDF in S3 Mumbai. Patients
open a report a few times in its first week and almost never after a month, yet the law and the company's
policy require keeping reports for years, untampered, and recoverable if Mumbai has a very bad day. Doing that by
hand is impossible at millions of objects. Four tools do it: **lifecycle rules** (cost over time),
**replication** (a second copy elsewhere), **Object Lock** (nobody can delete or alter it early) and **AWS
Backup** (scheduled, policy-driven backups across services). Then the step most teams skip: **testing a
restore**.

## Lifecycle rules

A lifecycle configuration is a set of rules, each with a filter (prefix, tags, object size) and actions:
**transitions** to colder classes after N days, **expiration** after N days, clean-up of **noncurrent
versions**, and **aborting incomplete multipart uploads** (failed uploads leave invisible parts you keep paying
for). Ankura's rules, from lifecycle.py (run against moto):

    s3.put_bucket_lifecycle_configuration(Bucket=B, LifecycleConfiguration={"Rules": [
        {"ID": "reports-tiering", "Status": "Enabled", "Filter": {"Prefix": "reports/"},
         "Transitions": [{"Days": 30, "StorageClass": "STANDARD_IA"},
                         {"Days": 180, "StorageClass": "GLACIER_IR"},
                         {"Days": 365, "StorageClass": "DEEP_ARCHIVE"}],
         "NoncurrentVersionExpiration": {"NoncurrentDays": 90}},
        {"ID": "tmp-cleanup", "Status": "Enabled", "Filter": {"Prefix": "tmp/"},
         "Expiration": {"Days": 7}},
        {"ID": "abort-failed-uploads", "Status": "Enabled", "Filter": {},
         "AbortIncompleteMultipartUpload": {"DaysAfterInitiation": 7}},
    ]})

Reading the rules back, the real output:

    reports-tiering        30d->STANDARD_IA, 180d->GLACIER_IR, 365d->DEEP_ARCHIVE, old versions 90d
    tmp-cleanup            expire 7d
    abort-failed-uploads   abort uploads 7d

Rules worth knowing before you write your own:

- Transitions to Standard-IA or One Zone-IA need objects at least **30 days** old; S3 rejects a 7-day IA
  transition with an InvalidArgument error (from the documentation — moto accepted it, so do not trust a mock
  for this).
- Colder classes have **minimum storage durations** (30 days for the IA classes, 90 for the Glacier Instant and
  Flexible classes, 180 for Deep Archive). Deleting or transitioning earlier is billed as if the object stayed.
- Each transition is billed per object. Millions of tiny objects can cost more to transition than they save;
  filter by size (ObjectSizeGreaterThan) or leave small objects in Standard.
- Glacier Flexible and Deep Archive need a **restore** (minutes to hours) before reading. Glacier Instant
  Retrieval does not, which is why Ankura uses it for the 6-to-12-month band, when a doctor may still ask for
  an old report.
- Lifecycle runs asynchronously; changes are not instant. Do not test a rule by waiting for tomorrow — check the
  configuration and use S3 Storage Lens or Inventory to watch the classes shift.

## Replication

**Cross-Region Replication** copies new objects to a bucket in another region (Same-Region Replication for
another account or bucket in the same region). Both buckets need versioning; S3 assumes an IAM role you give it.

    s3.put_bucket_replication(Bucket=B, ReplicationConfiguration={
        "Role": "arn:aws:iam::123456789012:role/s3-replication-reports",
        "Rules": [{"ID": "reports-to-hyd", "Status": "Enabled", "Priority": 1,
                   "Filter": {"Prefix": "reports/"},
                   "DeleteMarkerReplication": {"Status": "Disabled"},
                   "Destination": {"Bucket": "arn:aws:s3:::ankura-reports-dr",
                                   "StorageClass": "STANDARD_IA"}}]})

    replication: reports-to-hyd -> arn:aws:s3:::ankura-reports-dr STANDARD_IA

What replication is **not**: a backup. It copies mistakes too — a corrupted overwrite replicates within minutes.
It replicates only objects written **after** it is configured (use S3 Batch Replication for existing ones), and
by design it does not replicate deletions of specific versions. Keep delete-marker replication off for a DR
copy, and put the destination in a separate account that the source account's admins cannot delete from.
Replication Time Control adds a replication-time SLA when an auditor needs one. Both Mumbai and Hyderabad are
in India, which keeps the second copy inside the country for data-residency questions.

## Object Lock: write once, read many

**Object Lock** stops a version being deleted or overwritten until a retain-until date. It needs versioning and is
normally switched on when the bucket is created. Two modes:

- **Governance**: users with the special s3:BypassGovernanceRetention permission can still shorten or remove
  it. Good for protecting against accidents.
- **Compliance**: **nobody**, including the root user, can delete the version or shorten the retention until it
  expires. Good for regulatory retention and ransomware protection — and dangerous in a test, because a mistake
  is kept, and billed, for the full period.

A **legal hold** blocks deletion with no date until it is removed (for an investigation). Real output from moto,
a bucket with a 30-day COMPLIANCE default retention:

    retention: COMPLIANCE until 2026-11-26
    delete that version: AccessDenied
    versions kept: 1 | delete markers: 1

The delete **with** a version id is refused. A delete **without** one just adds a delete marker — the report
disappears from normal listings, but the locked version is still there and can be recovered. Test Object Lock
with Governance mode and a 1-day retention, never Compliance with years.

## AWS Backup

S3 versioning and replication protect objects; companies also need one place that backs up **everything** —
EBS volumes, EC2 instances, RDS and DynamoDB, EFS, and S3 — on a schedule, with retention, cross-region and
cross-account copies, and an audit trail. That is **AWS Backup**: a **backup plan** (rules: schedule, window,
lifecycle, copy actions), **resource assignments** (usually by tag, so new resources are covered automatically),
and **vaults** (Vault Lock gives them write-once protection). From backup.py, run against moto:

    plan = bk.create_backup_plan(BackupPlan={
        "BackupPlanName": "ankura-daily-35d",
        "Rules": [{
            "RuleName": "daily-0200-ist",
            "TargetBackupVaultName": "ankura-prod-vault",
            "ScheduleExpression": "cron(30 20 * * ? *)",      # 20:30 UTC = 02:00 IST
            "StartWindowMinutes": 60,
            "Lifecycle": {"DeleteAfterDays": 35},
            "CopyActions": [{"DestinationBackupVaultArn":
                "arn:aws:backup:ap-south-2:123456789012:backup-vault:ankura-dr-vault",
                "Lifecycle": {"DeleteAfterDays": 35}}],
        }]})

    ankura-daily-35d | daily-0200-ist cron(30 20 * * ? *) | keep 35 days
    copies to: ap-south-2

The tag-based assignment (create_backup_selection with ListOfTags backup=daily) is not implemented in moto 5.2, so
it was written from the documentation and not run.

## A backup you have not restored is a hope

Write down the **RPO** (how much data you can lose) and **RTO** (how long you can be down) the business agreed,
then prove them: restore a sample of objects and a whole volume into an isolated account each quarter, time it,
open the files, and record the result. AWS Backup's restore testing feature can schedule this. Azure's
equivalents are Blob lifecycle management, object replication, immutable blob storage and Azure Backup.`,
    workedExample: `**Scenario.** Ankura's auditor asks three questions: "How long do you keep reports, where, and can anyone
delete them early? How much would you lose if Mumbai failed? Show me the last restore test." You build the
design and the evidence.

**1. Retention.** Policy says seven years. The reports bucket gets Object Lock default retention in
**Compliance** mode for 7 years — but only after a month of Governance mode in production, to be sure the
upload code and lifecycle work with it. Noncurrent versions are kept 90 days for operator mistakes.

**2. Cost over seven years.** Most reports are read in their first month. The lifecycle rule above moves them to
Standard-IA at 30 days, Glacier Instant Retrieval at 180, and Deep Archive at 365. Because reports average about
300 KB, the 128 KB IA minimum does not hurt; a rule for small thumbnails would. Estimate the steady-state cost by
class in the AWS Pricing Calculator rather than quoting a number from memory.

**3. Region failure.** Replication sends new reports to ankura-reports-dr in Hyderabad, in a separate backup
account, typically within minutes (enable Replication Time Control if the auditor needs a contractual number).
The answer to "how much would you lose" is therefore minutes of new uploads, not the archive.

**4. Mistakes and ransomware.** Replication alone would replicate an encrypting attacker's overwrites; Object Lock
in the destination account means the previous versions cannot be destroyed, even with stolen admin credentials
in the production account.

**5. The restore test.** Quarterly, a script picks 50 random report keys from the DR bucket, including some in
Deep Archive, restores them (Bulk retrieval for the archived ones), downloads them, checks each SHA-256 against
the value stored in the database at upload time, and records: count requested, count verified, slowest time.
The ticket with that output is the evidence the auditor asked for.`,
    mcqs: [
      mcq('A lifecycle rule moves objects to Glacier Deep Archive after 30 days, and the team deletes most of them at day 60. What happens to the bill?', [
        ['Early-deletion charges apply, as if each object stayed 180 days', true],
        ['Nothing extra; deleted objects stop costing on the day they go', false],
        ['AWS refunds the transition charge for every object deleted', false],
        ['The deletion is refused until the 180-day minimum has passed', false],
      ], 'Deep Archive has a 180-day minimum storage duration; deleting earlier is billed for the remaining days. Charges do not stop immediately, nothing is refunded, and the deletion is allowed (only Object Lock refuses deletion).'),
      mcq('Ankura relies on Cross-Region Replication as its "backup". A bug overwrites 10,000 reports with blank PDFs. What happens in the destination bucket?', [
        ['The blank versions replicate too; only versioning there keeps the old ones', true],
        ['Nothing replicates, because replication copies only brand-new keys', false],
        ['Replication detects the corruption and pauses until someone approves it', false],
        ['The destination automatically keeps the original and rejects the blanks', false],
      ], 'Replication copies new versions faithfully, including bad ones; the destination\'s versioning (ideally with Object Lock) is what preserves the good copies. Overwrites are replicated, there is no corruption detection, and the destination does not choose between versions.'),
      mcq('Why should a first test of Object Lock use Governance mode with a one-day retention?', [
        ['Compliance mode cannot be undone, so a mistake is kept and billed for the full period', true],
        ['Governance mode is the only mode that works on buckets that have versioning enabled', false],
        ['Compliance mode can only be set by AWS Support after a written legal request', false],
        ['Object Lock retention must be at least one day and at most one day for new buckets', false],
      ], 'In Compliance mode nobody, including root, can shorten retention or delete the version early. Both modes need versioning, Compliance is set by the customer, and retention periods can be far longer than one day.'),
    ],
    checkpoint: [
      mcq('A bucket has collected many failed multipart uploads from a flaky mobile network. How do you stop paying for them?', [
        ['A lifecycle rule with AbortIncompleteMultipartUpload after a few days', true],
        ['An Expiration rule on the prefix, which deletes the failed upload parts', false],
        ['Turning on versioning, so incomplete parts are merged into versions', false],
        ['Nothing; S3 never charges for parts of uploads that did not complete', false],
      ], 'Incomplete multipart parts are stored and billed until aborted, and the lifecycle action does it automatically. Expiration acts on objects, not upload parts, versioning has nothing to merge, and parts are billed.'),
      mcq('The auditor asks for proof that Ankura can recover lab reports if Mumbai is unavailable. Which evidence is strongest?', [
        ['A recorded, timed restore of sampled reports from the Hyderabad copy, checksums verified', true],
        ['A screenshot of the replication rule showing Status: Enabled on the Mumbai bucket', false],
        ['The AWS durability figure of eleven nines quoted from the S3 documentation page', false],
        ['A backup plan that runs every night with a 35-day lifecycle on its recovery points in the vault', false],
      ], 'Only a restore that actually ran and verified the data proves recoverability. A rule being enabled, a durability figure, or a schedule are all configuration; none shows the data comes back intact.'),
      mcq('Ankura wants new EBS volumes, RDS databases and EFS file systems to be backed up without anyone remembering to add them. Which design does that?', [
        ['An AWS Backup plan whose resource assignment selects by a tag such as backup=daily', true],
        ['A cron job on one EC2 instance that snapshots the volumes listed in a text file', false],
        ['S3 Cross-Region Replication configured on every bucket in the production account', false],
        ['A lifecycle rule that transitions every new resource to Glacier Deep Archive', false],
      ], 'Tag-based assignment in AWS Backup covers new resources as soon as they are tagged (enforce the tag with policy). A hand-kept list goes stale, S3 replication does not cover EBS or RDS, and lifecycle rules apply only to S3 objects.'),
    ],
  },

  /* ── PRICING_PURCHASE ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_COMPUTE_STORAGE_PRICING_PURCHASE',
    notes: `Year 3's "What It Costs" treated the bill as an engineering constraint. This lesson is the toolkit a cloud
engineer uses on the compute part of it: the **purchase options** (On-Demand, Savings Plans, Reserved
Instances, Spot), the **architecture** choices that change the rate (Graviton, right-sizing), and how to decide
without gambling the service. No prices appear here on purpose: they differ by region, change often, and the
skill is the method. Every number you put in a proposal comes from the AWS pricing pages, the Pricing Calculator
or your own Cost Explorer data.

## The pricing model in one breath

You pay for compute **time** (per second for Linux On-Demand instances, with a one-minute minimum; some
operating systems bill per hour), **storage** attached to it (EBS per GB-month and provisioned performance),
**data transfer** out of AWS and between AZs and regions, and extras such as public IPv4 addresses, load
balancers and NAT gateways. Rates differ by region: Mumbai and Hyderabad are not priced like Virginia. Data
transfer and NAT are the line items freshers forget; the AWS Networking topic covered them.

## The purchase options

- **On-Demand**: no commitment, pay for what runs. The baseline, and the right choice for anything new, spiky
  or short-lived.
- **Savings Plans**: you commit to a fixed **amount of spend per hour** for **1 or 3 years** (no upfront,
  partial or all upfront) in exchange for lower rates. A **Compute Savings Plan** applies across instance
  families, sizes, regions and operating systems, and to Fargate and Lambda. An **EC2 Instance Savings Plan**
  gives a deeper discount but is tied to one instance family in one region. Usage above the commitment is billed
  On-Demand; commitment you do not use is still paid.
- **Reserved Instances**: the older commitment model, tied to instance attributes. Standard RIs give the deepest
  discount with the least flexibility; Convertible RIs can be exchanged. **Zonal** RIs also reserve capacity in an
  AZ. Most teams now prefer Savings Plans for flexibility; RIs still matter for RDS, ElastiCache and similar
  services that Savings Plans do not cover.
- **On-Demand Capacity Reservations**: guarantee capacity in an AZ (for a sale day or a DR plan) without a
  discount; combine them with a Savings Plan to get both.
- **Spot Instances**: spare EC2 capacity at a large discount that AWS can **reclaim with a two-minute warning**.
  Ideal for stateless, interruptible, retryable work: batch jobs, CI runners, image processing, big-data workers,
  some Kubernetes worker nodes. Wrong for a single database or anything that loses state on interruption.

Azure has the same menu: pay-as-you-go, Azure savings plan for compute, Reserved VM Instances and Spot VMs.

## How much to commit: a calculation, not a feeling

The question is how much steady usage to cover. commit.py models one week of BazaarBolt's hourly fleet usage in
"on-demand units" (one unit = the cost of one hour at the On-Demand rate): 8 units overnight, 14 by day, 20 in
the evening peak. The discount is an **assumption for the exercise** (30%); read the real one for your plan,
term and region.

    def weekly_cost(commit):
        return sum(commit * (1 - DISCOUNT) + max(u - commit, 0) for u in usage)

Real output:

    all on-demand: 2184 units/week
    commit  4/h: 1982.4  saves   9.2%  (usage at or above the commitment 100% of hours)
    commit  8/h: 1780.8  saves  18.5%  (usage at or above the commitment 100% of hours)
    commit 10/h: 1806.0  saves  17.3%  (usage at or above the commitment 62% of hours)
    commit 14/h: 1856.4  saves  15.0%  (usage at or above the commitment 62% of hours)
    commit 17/h: 2104.2  saves   3.7%  (usage at or above the commitment 21% of hours)
    commit 20/h: 2352.0  saves  -7.7%  (usage at or above the commitment 21% of hours)
    cheapest commitment: 8 units/h

The pattern generalises: an extra unit of commitment pays off only if usage is at or above it for more than
(1 minus the discount) of the hours — here, 70%. The overnight floor qualifies; the daytime band (62%) does not.
Committing to the peak **loses** money. In practice: commit to the floor you are confident will exist for the
whole term, after right-sizing (or you lock in waste), and grow the commitment in steps as usage proves itself.
AWS Cost Explorer's Savings Plans recommendations do this calculation on your real history.

## Spot done properly

Never run "a Spot instance". Run a **fleet that tolerates losing members**: an Auto Scaling group with a mixed
instances policy — an On-Demand base for the minimum the service needs, Spot above it, **several
interchangeable instance types** so one type's shortage does not starve you, and the price-capacity-optimized
allocation strategy (it picks the pools least likely to be interrupted at a low price). From spot.py, run
against moto:

    MixedInstancesPolicy={
        "LaunchTemplate": {
            "LaunchTemplateSpecification": {"LaunchTemplateName": "bb-image-resize", "Version": "$Latest"},
            "Overrides": [{"InstanceType": t} for t in ["c6i.large", "c5.large", "c6a.large", "m6i.large"]],
        },
        "InstancesDistribution": {
            "OnDemandBaseCapacity": 2,
            "OnDemandPercentageAboveBaseCapacity": 0,
            "SpotAllocationStrategy": "price-capacity-optimized",
        },
    },
    CapacityRebalance=True,

    types: ['c6i.large', 'c5.large', 'c6a.large', 'm6i.large']
    on-demand base: 2 | on-demand above base: 0 % | spot strategy: price-capacity-optimized | capacity rebalance: True
    instances: 6

**Capacity Rebalancing** starts a replacement when AWS signals elevated interruption risk, before the two-minute
notice. The application side matters as much: jobs must be idempotent and checkpointed, workers should watch
the interruption notice (instance metadata spot/instance-action, or the EventBridge event) and stop taking work.

## Graviton and right-sizing

**Graviton** (ARM) instances, the "g" types, usually give better price-performance for Linux workloads. The cost
is engineering: multi-architecture container images (docker buildx for linux/arm64), checking native
dependencies, and load-testing before switching. Interpreted Python and Java services often move with little
change; old binaries and some native wheels may not.

**Right-sizing** comes before any commitment. rightsize.py loads 14 days of hourly CPU into CloudWatch (moto) and
reads it back with get_metric_statistics; synthetic data, real output:

    instance             type           avg   max  verdict
    i-0aa1-orders-api    m6i.2xlarge   10.0  21.9  downsize one step
    i-0bb2-search        c6i.xlarge    50.5  81.0  keep
    i-0cc3-report-batch  r6i.xlarge     4.4  10.8  downsize one step

Read the verdict with judgement. CPU is only one resource: EC2 does not report memory without the CloudWatch
agent, and report-batch is an **R** (memory-optimised) instance — it may be idle on CPU because it is sized for
memory. Install the agent, look at memory and network too, and prefer the recommendations of **AWS Compute
Optimizer**, which uses them. Downsize one step at a time, watch latency, repeat. Then turn off what does not
need to run at all: dev and test environments stopped outside office hours (an Instance Scheduler or a scheduled
ASG action to zero) often save more than any discount.`,
    workedExample: `**Scenario.** BazaarBolt's monthly AWS bill has doubled in a year and the CTO asks for a plan that cuts compute
cost without risking the sale-day service. You have Cost Explorer, Compute Optimizer and a week.

**1. Find where the money goes.** Group last month's cost by service, then by usage type and by the team tag.
Compute is the largest line; inside it, three things stand out: the web ASG, a fleet of always-on image-resize
workers, and dev/test environments that run around the clock.

**2. Stop paying for nothing first.** Dev and test servers run all 168 hours of the week but are used for about 50.
A scheduled action stops them outside 09:00 to 21:00 IST on weekdays. Untagged, unattached EBS volumes and old
snapshots (from the EBS lesson) are cleaned up after owner sign-off.

**3. Right-size before committing.** Compute Optimizer flags the orders API (m6i.2xlarge, CPU peak about 22%,
memory under 40% with the agent installed) as over-provisioned. It moves one step down, to m6i.xlarge, in staging,
then production, watching p95 latency for a week. It also gets a Graviton trial: the team builds an arm64 image
and runs the load test on m7g.xlarge.

**4. Move interruptible work to Spot.** The image-resize workers read jobs from a queue and are idempotent. They
move to the mixed-instances group above: two On-Demand, the rest Spot across four types, Capacity Rebalancing
on, and a handler that stops taking jobs on the interruption notice.

**5. Commit to the floor last.** With waste gone and sizes settled, Cost Explorer's recommendation (and the
commit.py reasoning) points to a Compute Savings Plan covering the overnight baseline, not the sale-day peak, on
a 1-year term so the commitment can be revisited after the Graviton move.

**6. Prove it.** A cost dashboard by tag, a budget alert per team, and a monthly review: savings that are not
measured do not survive the next year.`,
    mcqs: [
      mcq('BazaarBolt\'s nightly report job can be retried, takes 40 minutes and can restart from checkpoints. Which purchase option fits best?', [
        ['Spot capacity in a group with several instance types', true],
        ['A 3-year Standard Reserved Instance for one instance', false],
        ['A zonal On-Demand Capacity Reservation every night', false],
        ['On-Demand only, since batch work should never be interrupted', false],
      ], 'Interruptible, checkpointed batch work is the textbook case for Spot, and several types reduce interruption risk. A 3-year RI pays for 24 hours to use 40 minutes, a capacity reservation adds no discount, and the job is designed to survive interruption.'),
      mcq('A team plans to change a self-built C library-based service from c6i to c7g instances for the price-performance gain. What must they check first?', [
        ['That every binary and native dependency is built for arm64', true],
        ['That their AWS account has Graviton enabled by AWS Support', false],
        ['That their region bills Graviton per hour rather than per second', false],
        ['That the service uses gp2 volumes, since Graviton needs gp2', false],
      ], 'Graviton is ARM; x86 binaries and native libraries must be rebuilt (and container images built for linux/arm64) before the move. No enablement is needed, billing granularity is not the concern, and Graviton instances use gp3 or any EBS type.'),
      mcq('Which statement about a Compute Savings Plan is correct?', [
        ['It commits to a spend per hour and applies across families and regions', true],
        ['It reserves capacity in one AZ so that instances can always launch on sale day', false],
        ['It refunds unused commitment at the end of each month of the term', false],
        ['It applies only to one instance type that was named at purchase time', false],
      ], 'A Compute Savings Plan is an hourly spend commitment that floats across families, sizes, regions, Fargate and Lambda. It does not reserve capacity (a zonal RI or capacity reservation does), unused commitment is not refunded, and it is not tied to one type.'),
    ],
    checkpoint: [
      mcq('Fleet usage is 10 units overnight and 25 units in the evening peak. Assume commitments save 30%. Where should the commitment be set?', [
        ['Around the overnight floor, since the peak runs well under 70% of hours', true],
        ['At the peak of 25 units, so every hour of usage is discounted', false],
        ['At zero, since savings plans only pay off for 3-year terms', false],
        ['At the average usage level, because covering the average always minimises the bill', false],
      ], 'Each extra committed unit pays off only if used for more than (1 minus discount) of hours, so the floor is covered and the peak is not. Committing to the peak pays for idle commitment most hours, 1-year terms also save, and the average is not the break-even rule.'),
      mcq('A right-sizing report shows an r6i.xlarge with average CPU of 4%. What should you check before downsizing it?', [
        ['Its memory use, since R instances are sized for memory, not CPU', true],
        ['Its AMI age, since older images report CPU usage incorrectly', false],
        ['Its tag count, since untagged instances cannot be resized', false],
        ['Its EBS type, since gp3 volumes hide CPU use from CloudWatch', false],
      ], 'An R instance may be busy on memory while idle on CPU, and EC2 needs the CloudWatch agent to report memory. AMI age, tags and volume type do not distort CPU metrics or block resizing.'),
      mcq('A worker on Spot receives the two-minute interruption notice. What should the application do?', [
        ['Stop taking new jobs, checkpoint or hand back the current one, and exit', true],
        ['Ignore it, because AWS waits for running jobs before reclaiming capacity', false],
        ['Restart itself so it moves to an On-Demand instance in the same group', false],
        ['Raise its own bid price so AWS keeps the instance for this workload', false],
      ], 'The notice is the time to drain cleanly; the instance is reclaimed when it expires. AWS does not wait for jobs, a restart does not change the purchase option, and current Spot pricing has no bidding to outbid an interruption.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_COMPUTE_STORAGE_DEBUGGING',
    notes: `Six things that went wrong on BazaarBolt's and Ankura's compute and storage, each reported by someone who
had already tried two random fixes. For each: read the symptom, say the cause aloud before reading on, then
check. Lines marked "real output" come from dbg.py run against moto; the others quote error text from the AWS
documentation because moto does not reproduce them (noted where it applies).

## 1. The launch template that will not save

**Symptom.** A teammate moves the web server's boot script from run_instances into a launch template. The call
fails (real output):

    1 broken: InvalidUserData.Malformed - Invalid BASE64 encoding of user data.

"But it worked in run_instances!"

**Cause.** boto3 base64-encodes UserData for **run_instances** automatically. **LaunchTemplateData.UserData** is
passed through as-is and must already be base64.

**Fix.** Encode it yourself, once:

    "UserData": base64.b64encode(SCRIPT.encode()).decode()

    1 fixed: template created, version 1

Do not "fix" it by encoding twice in run_instances code that is shared — cloud-init will then receive base64
text and silently run nothing.

## 2. The group that eats its own instances

**Symptom.** During a deploy, the web ASG's activity history shows the same pattern every two minutes:
"Launching a new EC2 instance", then "Terminating EC2 instance: ... was taken out of service in response to an
ELB system health check failure." The group never reaches desired capacity, and the site is short of servers.

**Cause.** HealthCheckType is ELB and HealthCheckGracePeriod is 30 seconds, but user data installs packages and
the app needs about three minutes to answer /healthz. The group judges instances before they can be healthy.

**Fix.** Measure boot-to-healthy (instance launch time to the first passing target health check) and set the
grace period comfortably above it; better still, shorten boot with a golden AMI. Do not switch the health check
back to EC2 to "stop the churn" — that hides apps that are really dead.

## 3. The invoice count that is always 1,000

**Symptom.** The finance reconciliation script reports exactly 1,000 invoices for October, every time, though
the order database has 2,500. Real output:

    2 broken: 1000 objects, IsTruncated = True

**Cause.** list_objects_v2 returns at most 1,000 keys per call. The script read one page and ignored IsTruncated
and the continuation token.

**Fix.** Use the paginator (or loop on NextContinuationToken):

    pages = s3.get_paginator("list_objects_v2").paginate(Bucket=B, Prefix="2026/10/")
    total = sum(p.get("KeyCount", 0) for p in pages)

    2 fixed:  2500 objects

The same bug hides in describe_instances, describe_volumes and every other paged API. For very large buckets,
S3 Inventory (a daily CSV or Parquet listing) beats listing at all.

## 4. The prefix that matches nothing

**Symptom.** A clean-up script for Ankura reports "0 objects" under /2026/10/, and a lifecycle rule with Prefix
"/reports/" has, after a month, moved nothing. Real output:

    3 broken: 0 objects
    3 fixed:  5 objects in the first 5-key page

**Cause.** Keys do not start with "/". A prefix is plain string matching on the key, so "/reports/" matches no
key that is stored as "reports/LAB-1.pdf". The console showing folders makes people think of paths.

**Fix.** Drop the leading slash in the script and in the lifecycle filter, then confirm the rule's effect with
S3 Inventory or Storage Lens after it has had time to run — lifecycle is asynchronous.

## 5. The volume that will not attach

**Symptom.** Restoring a data volume for a replacement instance fails with (error text from the EC2 documentation;
moto does not enforce this rule):

    InvalidVolume.ZoneMismatch: The volume 'vol-...' is not in the same availability zone as instance 'i-...'

**Cause.** The ASG launched the replacement in ap-south-1a; the volume lives in ap-south-1b. EBS volumes attach
only within their AZ.

**Fix.** Snapshot the volume and create a new volume from the snapshot in the instance's AZ (snapshots are
regional). Long-term fix: a server that needs a particular disk should not be in an ASG that can place it in any
AZ — move the state to RDS, EFS or S3, or pin that single instance and its volume to one AZ deliberately.

## 6. The server Session Manager cannot see

**Symptom.** "aws ssm start-session" returns TargetNotConnected for a new private instance, and it does not
appear in Fleet Manager. The team's next idea is to open port 22.

**Cause.** Session Manager needs three things: an agent (present on Amazon Linux 2023), an **instance profile**
whose role allows AmazonSSMManagedInstanceCore, and an **outbound path** to the SSM endpoints. This instance had
no profile, and its private subnet had neither a NAT gateway route nor interface endpoints.

**Fix.** Attach the instance profile (associate_iam_instance_profile works on a running instance) and add
interface endpoints for ssm, ssmmessages and ec2messages with private DNS on and a security group allowing HTTPS
from the VPC. The agent registers within a few minutes. Port 22 stays closed.`,
    mcqs: [
      mcq('A script copies run_instances arguments into create_launch_template and gets InvalidUserData.Malformed. What changed?', [
        ['Launch templates need user data already base64-encoded', true],
        ['Launch templates allow user data only on ARM instances', false],
        ['Launch templates reject any user data over 1 KB in size', false],
        ['Launch templates need user data in YAML, not a shell script', false],
      ], 'boto3 encodes UserData for run_instances but passes LaunchTemplateData.UserData unchanged, so it must already be base64. Architecture, a 1 KB limit (the real limit is 16 KB) and YAML have nothing to do with the error.'),
      mcq('A reconciliation script always finds exactly 1,000 objects under a prefix that holds many more. What is the fix?', [
        ['Use the list_objects_v2 paginator or follow the continuation token', true],
        ['Raise MaxKeys to 100000 so one call returns every key at once', false],
        ['Turn on versioning so that each list call returns more objects', false],
        ['Switch the bucket to Intelligent-Tiering so listing is not capped', false],
      ], 'Each list call returns at most 1,000 keys; the remaining pages must be fetched. MaxKeys above 1,000 is still capped, and versioning or storage class do not change listing limits.'),
      mcq('An ASG keeps terminating new instances with "ELB system health check failure" a minute after launch. What is the first thing to check?', [
        ['Whether the grace period covers the app\'s measured start-up time', true],
        ['Whether the launch template still points at version $Latest', false],
        ['Whether the instances have IMDSv2 required in metadata options', false],
        ['Whether the group\'s maximum size is larger than its desired size', false],
      ], 'Instances judged by the load balancer before they finish starting fail and are replaced, in a loop. The template version, IMDS setting and max size do not make healthy-but-starting instances fail their health checks.'),
      mcq('A new private instance shows TargetNotConnected in Session Manager. It has an instance profile with the right policy. What is the most likely remaining cause?', [
        ['No route to the SSM endpoints: no NAT and no interface endpoints', true],
        ['Port 22 is closed in its security group, so the agent cannot connect', false],
        ['The instance uses gp3 rather than gp2 for its root EBS volume', false],
        ['IMDSv2 is required, which blocks the SSM agent from registering', false],
      ], 'The agent connects outbound over HTTPS to Systems Manager; without NAT or the ssm, ssmmessages and ec2messages endpoints it cannot register. Session Manager does not use port 22, volume type is irrelevant, and the current agent works with IMDSv2.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_COMPUTE_STORAGE_PRACTICE',
    notes: `Ten exercises. Do each on paper or in a scratch file first, then check the answer. Several can be run against
moto with the scripts from the lessons if you want to see the output yourself.

## 1. Read the instance type

Decode: c7g.2xlarge, r6id.large, m6a.xlarge, t4g.small.

**Answer.** c7g.2xlarge: compute-optimised, generation 7, Graviton (ARM), size 2xlarge (8 vCPU on this family).
r6id.large: memory-optimised, generation 6, Intel, with local NVMe instance store. m6a.xlarge: general purpose,
generation 6, AMD. t4g.small: burstable, generation 4, Graviton. If you are unsure of vCPU and memory, ask
describe_instance_types rather than guessing.

## 2. Pick the family

(a) A Java order API using 12 GiB of heap at peak and modest CPU. (b) A video thumbnail generator pegged at 100%
CPU. (c) An admin panel used twice a day. (d) An in-memory analytics engine holding 100 GiB.

**Answer.** (a) M (general purpose) — or R if the heap grows; check memory first. (b) C. (c) T (burstable),
mostly idle. (d) R or X (memory-optimised). The rule: name the resource the workload exhausts first.

## 3. Survive an AZ

The web tier needs 4 instances to carry normal load. It runs in two AZs. What minimum should the ASG have so
that losing one AZ still leaves enough capacity?

**Answer.** 8 — four in each AZ, so either AZ alone can carry the load. With three AZs, 6 (two per AZ, four
left after a loss). Teams often accept min 4 plus fast scaling instead; say which you chose and why.

## 4. gp2 to gp3

Two gp2 volumes: 1,000 GiB and 2,000 GiB. What gp3 IOPS keep performance at least equal?

**Answer.** gp2 gives 3 IOPS per GiB: 3,000 and 6,000. gp3's baseline is 3,000 at any size, so the first needs no
extra IOPS; the second needs 6,000 provisioned. Check throughput too (gp3 baseline 125 MiB/s) against the
volume's measured peak.

## 5. Fix the lifecycle rule

    {"ID": "logs", "Status": "Enabled", "Filter": {"Prefix": "/app-logs/"},
     "Transitions": [{"Days": 7, "StorageClass": "STANDARD_IA"}],
     "Expiration": {"Days": 20}}

**Answer.** Three problems. The leading slash means it matches no key. Standard-IA needs objects at least 30
days old, so the 7-day transition is rejected. And expiring at 20 days makes any IA transition pointless (and
IA's 30-day minimum would bill the difference). For logs read only in the first fortnight: Prefix "app-logs/",
no transition, Expiration 30 days — or 90 days if there is a retention requirement, with IA at 30.

## 6. Write the two resources

A policy must let the reporting role list bb-reports and read its objects. Write the Resource list.

**Answer.** ["arn:aws:s3:::bb-reports", "arn:aws:s3:::bb-reports/*"] — ListBucket on the bucket ARN, GetObject
on the objects. Use one statement per action group if you want them scoped precisely.

## 7. Presigned URL lifetime

The app runs on EC2 and signs download URLs with ExpiresIn=172800 (two days). How long do the URLs really work?

**Answer.** Until the earlier of two days or the expiry of the role credentials that signed them — typically a
few hours on EC2. If two days are truly needed (they rarely are), have the client request a fresh URL when it
needs one.

## 8. IST to UTC for scheduled scaling

A sale starts at 20:00 IST on Friday. Write the StartTime (UTC) for a pre-warm one hour before.

**Answer.** 19:00 IST is 13:30 UTC (IST is UTC+5:30), so "...T13:30:00Z" on the Friday. Or pass
TimeZone="Asia/Kolkata" with a local time and avoid the arithmetic.

## 9. How much to commit

Hourly usage over a month: 6 units for 100% of hours, 12 units for 55% of hours, 18 units for 15%. Assume a
plan discount of 25% (read the real one from the pricing page).

**Answer.** An extra unit of commitment pays off only if used more than 75% of the hours (1 minus 0.25). The
first 6 units are used 100% of the time: commit. Units 7 to 12 are used 55%: do not. Commit 6 units per hour; the
rest stays On-Demand (or Spot, where interruptible).

## 10. Choose the storage

(a) Uploaded profile photos for a mobile app. (b) The data directory of a self-managed PostgreSQL. (c) A
shared folder that three Linux servers in different AZs write reports to. (d) Seven years of lab reports read
almost never. (e) A build cache that can be rebuilt.

**Answer.** (a) S3 with presigned uploads and CloudFront. (b) EBS gp3 (io2 if measured IO demands it), with
snapshots — or move to RDS. (c) EFS. (d) S3 with lifecycle to Glacier Deep Archive and Object Lock. (e) Instance
store or a gp3 volume you do not back up.`,
    mcqs: [
      mcq('A 2,000 GiB gp2 volume is being moved to gp3. What IOPS must be provisioned to keep its baseline performance?', [
        ['6,000 IOPS, since gp2 gave 3 IOPS for each GiB', true],
        ['3,000 IOPS, since that is the baseline for every gp3 volume', false],
        ['2,000 IOPS, since gp3 provides 1 IOPS for each GiB', false],
        ['16,000 IOPS, since gp3 must always be set to its maximum', false],
      ], 'gp2 at 2,000 GiB gives 6,000 IOPS, so gp3 needs 6,000 provisioned above its 3,000 baseline. Keeping 3,000 halves performance, gp3 does not scale per GiB, and maxing out IOPS pays for performance not needed.'),
      mcq('A web tier needs 6 instances to carry normal load and runs across three AZs. What ASG minimum survives losing any one AZ at full capacity?', [
        ['9 instances, three in each of the three zones', true],
        ['6 instances, two in each of the three zones', false],
        ['12 instances, four in each of the three zones', false],
        ['3 instances, one in each of the three zones', false],
      ], 'With 9 spread evenly, losing one AZ leaves 6, which carries the load. 6 leaves only 4 after a loss, 12 over-provisions, and 3 cannot carry normal load even with every AZ up.'),
      mcq('A scheduled action must fire at 21:30 IST. Which UTC time do you enter if no TimeZone is given?', [
        ['16:00 UTC on the same day', true],
        ['03:00 UTC on the next day', false],
        ['21:30 UTC on the same day', false],
        ['15:30 UTC on the same day', false],
      ], 'IST is UTC plus 5 hours 30 minutes, so 21:30 IST is 16:00 UTC. Adding instead of subtracting gives the next morning, leaving it unconverted fires 5.5 hours late, and 15:30 subtracts six hours.'),
      mcq('A lifecycle rule on Prefix "app-logs/" transitions to Standard-IA at 30 days and expires objects at 35 days. What is wrong with it?', [
        ['IA\'s 30-day minimum makes a move for 5 days cost more than it saves', true],
        ['Expiration must always be at least 365 days after any transition', false],
        ['A rule cannot contain both a transition and an expiration action', false],
        ['Standard-IA transitions need the prefix to start with a slash', false],
      ], 'Objects moved to IA are billed for at least 30 days there, plus a per-object transition charge, so moving them five days before deletion wastes money. There is no 365-day rule, rules can combine actions, and a leading slash would break the prefix.'),
      mcq('Usage is 10 units in all hours and 16 units in 60% of hours. With an assumed 20% discount, how much should be committed?', [
        ['10 units, because hours above 10 are used under 80% of the time', true],
        ['16 units, because the 60% band still uses most of its hours', false],
        ['13 units, because the commitment should always match average usage', false],
        ['0 units, because any commitment below the peak wastes money', false],
      ], 'A committed unit pays off when used more than (1 minus 0.20) = 80% of hours; the band above 10 is used 60%, so commit 10. 16 pays for idle units 40% of hours, the average is not the rule, and the floor is always worth committing.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_COMPUTE_STORAGE_INTERVIEW_QUESTION',
    notes: `Questions asked in cloud engineer, DevOps and SRE interviews at product companies, GCCs and IT services
firms in Bengaluru, Hyderabad and Pune. Answer each aloud in about two minutes before reading the model answer.
Interviewers listen for trade-offs, failure thinking and cost awareness, not a list of service names.

## Q1. "Design the compute for a web app that must survive an AZ failure and a 10x sale-day spike."

**Model answer.** "Stateless app servers in an Auto Scaling group across at least two AZs, in private subnets,
behind an Application Load Balancer. The launch template pins a golden AMI with IMDSv2 required and an instance
profile — no SSH, Session Manager for access. Health checks come from the load balancer, with a grace period
above the measured start-up time. Minimum capacity is set so one AZ can carry the base load. For the sale, I
would not rely on reactive scaling for a cliff: a scheduled action pre-warms an hour before, target tracking on
request count per target handles the rest, and max size, the EC2 vCPU quota and the database's capacity are
raised and load-tested a week before. State lives outside the instances: sessions in ElastiCache or a token,
files in S3, data in RDS."

**Follow-up.** "Your scale-out still takes six minutes. What do you look at?" — "Where the time goes: launch to
running, running to user data done, app start, health checks passing. Usually it is user data installing
things; bake them into the AMI. Then check instance warm-up and health check intervals. Warm pools can keep
pre-initialised stopped instances ready if boot cannot be made faster."

## Q2. "We found an S3 bucket with customer data that was public. Walk me through it."

**Model answer.** "Contain first: remove the public policy or ACL and turn on Block Public Access on the bucket
and at the account level. Then scope it: what was in it, since when was it public (CloudTrail management events
for PutBucketPolicy or the ACL change), and who read it (server access logs or CloudTrail data events, if they
were enabled — if not, say so honestly, since that limits what we can prove). If personal data was exposed it is
a security incident, with notification obligations under the DPDP Act, so legal and the security team are
involved early. Then prevent: account-level Block Public Access, an SCP that stops anyone but the platform role
changing it, an AWS Config rule for drift, and presigned URLs or CloudFront with origin access control for the
legitimate need that led someone to make it public."

**Follow-up.** "Block Public Access is on. Can data still leak?" — "Yes, through principals that are allowed: an
over-broad IAM role, a cross-account bucket policy to the wrong account, leaked access keys, or presigned URLs
shared too widely. Block Public Access stops anonymous access, not over-trusting authorised ones."

## Q3. "Our EC2 bill doubled. How would you cut it by a third without risking production?"

**Model answer.** "Measure before acting: Cost Explorer grouped by service, usage type and owner tag. Then in
order of risk. First, waste: dev and test running all night, unattached volumes, old snapshots, idle load
balancers and public IPs. Second, right-sizing with Compute Optimizer and the CloudWatch agent's memory data,
one step at a time, watching latency. Third, architecture: Graviton where builds allow, Spot for interruptible
work with a mixed-instances group. Last, commitments: a Savings Plan sized to the floor we are confident of
after the first three steps, never to the peak. And I would put budgets and a tag-based dashboard in so the
saving stays."

**Follow-up.** "Why commitments last?" — "Because committing before right-sizing locks in today's waste for one
or three years, and committing to usage that later moves to Spot or Graviton can leave commitment unused."

## Q4. "EBS, EFS, S3 and instance store: when would you use each?"

**Model answer.** "EBS is a block disk for one instance in one AZ — boot volumes and databases, gp3 by default,
snapshots for backup. EFS is shared NFS across AZs for Linux, when several servers need the same POSIX files.
S3 is object storage by key over HTTPS — uploads, static assets, backups, data lakes — the cheapest and most
durable for that shape, with lifecycle to colder classes. Instance store is the host's local NVMe: fastest and
included, but gone on stop or host failure, so caches and scratch only. The common mistakes are EFS where S3
would do, and the only copy of data on instance store."

**Follow-up.** "A legacy app writes uploads to /var/uploads on one server. You need three servers. What do you
do?" — "Short term, mount EFS at /var/uploads on all three. Medium term, change the app to write to S3 with
presigned uploads and serve through CloudFront, which removes the file system from the request path."`,
    mcqs: [
      mcq('In Q2, an interviewer asks why you check CloudTrail data events or access logs after closing a public bucket. Which reason is best?', [
        ['To learn who read which objects, which decides whether it is a reportable breach', true],
        ['To make Block Public Access take effect, since it needs logging on to work', false],
        ['To roll the bucket back to a version made before the policy was changed', false],
        ['To produce the presigned URLs that will replace the public policy later', false],
      ], 'The access record shows what was actually read and by whom, which scopes the incident and any DPDP notification. Block Public Access works without logging, logs do not restore anything, and presigned URLs are generated by the app, not from logs.'),
      mcq('A candidate says "I would buy a three-year Savings Plan covering our peak usage first, then right-size." What is the strongest objection?', [
        ['It locks in today\'s waste and pays for idle commitment off-peak', true],
        ['Savings Plans can only be bought after a year of On-Demand use', false],
        ['Savings Plans cover only Spot capacity, not On-Demand instances', false],
        ['Right-sizing is impossible once any commitment has been bought', false],
      ], 'Committing before right-sizing fixes the oversized footprint for the term, and peak-level commitment goes unused for most hours. There is no waiting period, Savings Plans apply to On-Demand usage, and right-sizing remains possible, just less rewarding.'),
      mcq('An interviewer asks how to scale a web tier out faster when it takes six minutes. Which answer addresses the usual biggest delay?', [
        ['Bake dependencies into a golden AMI so user data does almost nothing', true],
        ['Raise the target tracking value from 50% CPU to 80% CPU', false],
        ['Switch the ASG health check type from ELB to the simpler EC2 default', false],
        ['Move the instances from private subnets into public subnets', false],
      ], 'Installing packages in user data at boot is usually the slowest step; pre-baking removes it. A higher CPU target scales later, the EC2 health check hides broken apps without speeding boot, and subnet placement does not change start-up time.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_COMPUTE_STORAGE_CHECKPOINT',
    notes: `Ten questions across the topic: EC2 and safe access, EBS and EFS, launch templates and Auto Scaling, S3 access
and sharing, lifecycle and backups, and paying for compute. Answer without notes; the result shows which lesson
to revisit.`,
    checkpoint: [
      mcq('BazaarBolt\'s platform team wants every new instance to start from the current patched Amazon Linux image without editing scripts each month. What should the scripts do?', [
        ['Read the AMI id from the public SSM parameter for that image', true],
        ['Use the AMI id from the first instance ever launched in the account', false],
        ['Search community AMIs for the newest one named "amazon-linux"', false],
        ['Copy the AMI id from us-east-1 and reuse it in every region', false],
      ], 'AWS publishes the latest AMI ids per region as public SSM parameters. An old id is unpatched, community AMIs can be anyone\'s, and AMI ids differ between regions.'),
      mcq('A security review finds instances that answer the metadata service without a token. Which setting closes this?', [
        ['HttpTokens set to "required" in metadata options', true],
        ['A security group rule denying 169.254.169.254', false],
        ['Termination protection turned on for each instance', false],
        ['An Elastic IP attached to every affected instance', false],
      ], 'HttpTokens "required" enforces IMDSv2, which needs a session token. Security groups cannot filter the link-local metadata address, and termination protection and Elastic IPs have nothing to do with metadata access.'),
      ck('CLOUD_STORAGE', 'A gp3 database volume must move from ap-south-1a to an instance in ap-south-1c. What is the way to do it?', [
        ['Create a snapshot, then a new volume from it in ap-south-1c', true],
        ['Detach it and attach it to the instance in ap-south-1c', false],
        ['Modify the volume\'s AvailabilityZone with modify_volume', false],
        ['Enable Multi-Attach so that both zones can use the same volume', false],
      ], 'Volumes are bound to an AZ but snapshots are regional, so a snapshot restores into any AZ. Cross-AZ attach is refused, modify_volume cannot change the AZ, and Multi-Attach works only within one AZ.'),
      ck('CLOUD_STORAGE', 'Four Linux servers across two AZs need the same POSIX directory for a legacy CMS. Which storage suits it?', [
        ['EFS with a mount target in each AZ', true],
        ['One io2 volume shared by all four', false],
        ['Instance store synced by rsync', false],
        ['An st1 volume in the first zone', false],
      ], 'EFS provides shared NFS across AZs. An io2 volume cannot span AZs, instance store is ephemeral and per host, and an st1 volume attaches to one instance in one AZ.'),
      mcq('An ASG uses HealthCheckType "EC2". The app process dies but the VM keeps running. What changes to make the group replace such instances?', [
        ['Set HealthCheckType to "ELB" with a suitable grace period', true],
        ['Pin the launch template to a specific version number', false],
        ['Add a scheduled action that restarts the group every night', false],
        ['Raise the target tracking value so the group scales out', false],
      ], 'The ELB health check reflects whether the app answers; the EC2 check sees only the VM. Version pinning, nightly restarts and scaling targets do not detect a dead app.'),
      mcq('A festival sale starts at a known time and traffic jumps tenfold within a minute. Which ASG feature prepares for it best?', [
        ['A scheduled action that raises capacity before it starts', true],
        ['Step scaling that adds a larger step at 90% average CPU', false],
        ['A longer health check grace period for new instances', false],
        ['Changing the launch template to the $Default version', false],
      ], 'A known cliff should be met with capacity already running. Step scaling still reacts after the spike and waits for boot, a longer grace period changes health judgement not capacity, and the template version is irrelevant.'),
      ck('CLOUD_STORAGE', 'An app must let customers download their own invoices from a private bucket. Which approach is right?', [
        ['Presigned GET URLs that expire after a few minutes', true],
        ['A bucket policy granting s3:GetObject to "Principal": "*"', false],
        ['Each customer gets an IAM user with read-only access', false],
        ['Object ACLs set to public-read on every invoice object', false],
      ], 'A short-lived presigned URL shares one object with no AWS identity needed. A public policy or public ACLs expose every invoice, and IAM users per customer are unmanageable and long-lived.'),
      ck('CLOUD_STORAGE', 'Which pair of settings ensures an object deleted by mistake can be recovered and cannot be removed early by anyone?', [
        ['Versioning with Object Lock in Compliance mode', true],
        ['Default encryption with SSE-KMS and a bucket key', false],
        ['Block Public Access with all four settings on', false],
        ['Intelligent-Tiering with archive access tiers', false],
      ], 'Versioning keeps prior versions and Compliance-mode Object Lock prevents anyone deleting them before the retain date. Encryption, Block Public Access and storage tiers do not protect against deletion.'),
      ck('CLOUD_STORAGE', 'Lab reports are read in their first month and kept seven years. Which lifecycle plan is sensible?', [
        ['Standard, then IA at 30 days, then Glacier tiers later', true],
        ['Deep Archive on day one so storage is as cheap as possible', false],
        ['One Zone-IA at 7 days, then deletion after the first year', false],
        ['Standard for seven years with no lifecycle rule at all', false],
      ], 'Cooling over time matches the read pattern and keeps everything for the retention period. Deep Archive at once makes first-month reads slow and costly, One Zone-IA at 7 days is rejected and deleting at a year breaks retention, and never tiering overpays.'),
      mcq('Interruptible image-processing workers run around the clock. Which purchasing approach cuts cost most safely?', [
        ['Spot across several types, with a small On-Demand base', true],
        ['A 3-year Standard RI for one specific instance type', false],
        ['On-Demand Capacity Reservations in every zone used', false],
        ['Dedicated Hosts so that no other customer shares them', false],
      ], 'Interruptible work tolerates Spot reclaims, and several types plus an On-Demand base keep capacity available. A single-type RI loses flexibility, capacity reservations give no discount, and Dedicated Hosts cost more.'),
    ],
  },
];
