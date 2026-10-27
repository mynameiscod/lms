/**
 * Career-track content: AWS Databases (CL_AWS_DATABASES), Cloud & DevOps Engineer, batch CL1.
 *
 * What a cloud engineer runs when "the database" is an AWS service: RDS and Aurora (Multi-AZ, read replicas,
 * parameter groups, windows), backups, point-in-time restore and cross-region disaster recovery against an
 * agreed RPO and RTO, DynamoDB tables modelled from their access patterns, and ElastiCache in front of both.
 * It builds on the years' SQL and "Compute and Storage, Chosen", "Caching a Response Safely" and CL1's
 * "Designing a VPC", "Security Groups and Network ACLs" and "Lifecycle, Replication and Backups"; those are
 * referred to by title, not re-taught. Azure equivalents are named in a line; CL_AZURE teaches them.
 *
 * One fictional company runs through the topic: Rupayo, a Bengaluru UPI wallet whose ledger lives in AWS
 * Mumbai (ap-south-1) with disaster recovery in Hyderabad (ap-south-2). Every boto3 output quoted in the notes
 * is real output from boto3 1.43 against moto 5.2 (mock AWS); the RCU/WCU arithmetic and the cache simulation
 * (a fake clock standing in for Redis TTLs) were run in Python, and the Terraform block parses with
 * python-hcl2. AWS CLI commands, redis-py calls against a real Redis/Valkey and anything timing-related
 * (failover seconds, restore minutes) were written from the documentation and NOT run; the notes say so.
 * No prices: the notes describe the pricing model and send students to the pricing page and calculator.
 *
 * Skills: CLOUD_STORAGE by default; the DynamoDB lesson is DB_FUNDAMENTALS. Checkpoint questions elsewhere
 * that are plainly about data modelling, keys or consistency use ck('DB_FUNDAMENTALS', ...).
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_CL_AWS_DATABASES_BUNDLES: PilotBundle[] = [
  /* ── RDS_AURORA ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_DATABASES_RDS_AURORA',
    notes: `Rupayo, a UPI wallet in Bengaluru, keeps its ledger — every debit, credit and refund — in PostgreSQL. In
Year 3's "Compute and Storage, Chosen" you saw why a team rents a managed database instead of installing one on
a server. This lesson is what that choice looks like on AWS, and what is still your job after you make it.

## What RDS does for you, and what it does not

Amazon RDS runs the database engine for you: it provisions the host and storage, patches the engine and the
operating system in a window you choose, takes automated backups, replaces failed hardware and, with Multi-AZ,
fails over to a standby. There is no SSH to the host. What stays yours: the schema, indexes and slow queries,
connection counts, which network can reach the port, who has which database user, engine settings, the major
version upgrade plan and the bill. "Managed" moves the toil; it does not move the responsibility for data.

**Engines.** RDS runs PostgreSQL, MySQL, MariaDB, Oracle, SQL Server and Db2. **Aurora** is AWS's own engine,
compatible with MySQL or PostgreSQL, with a different storage layer (below). **Instance classes** follow the EC2
families: db.t (burstable, CPU credits — fine for dev, risky for a steady production load), db.m (general
purpose), db.r (memory-optimised, the usual choice when the working set should fit in RAM); a "g" in the name
means Graviton. **Storage** is gp3 for most workloads, io1/io2 when you need guaranteed IOPS; turn on storage
autoscaling (a maximum size) so a full disk does not take the ledger down at 2 a.m.

**Placement.** A DB subnet group lists private "data" subnets in at least two AZs (CL1's "Designing a VPC").
PubliclyAccessible stays false, and the security group allows port 5432 only from the app tier's security group,
never from 0.0.0.0/0. Let RDS keep the master password in Secrets Manager (ManageMasterUserPassword) rather than
typing one into a script, and give applications their own users, or IAM database authentication.

## Creating one from Python

This ran against moto (mock AWS), so the endpoint is fake, but every parameter is the real API:

    rds = boto3.client("rds", region_name="ap-south-1")
    db = rds.create_db_instance(
        DBInstanceIdentifier="ledger-prod", Engine="postgres", EngineVersion="16.3",
        DBInstanceClass="db.t4g.micro", AllocatedStorage=20, StorageType="gp3",
        MasterUsername="ledger_admin", ManageMasterUserPassword=True,
        MultiAZ=True, StorageEncrypted=True, BackupRetentionPeriod=7,
        PreferredBackupWindow="20:30-21:00", PreferredMaintenanceWindow="sun:21:30-sun:22:00",
        PubliclyAccessible=False, DBParameterGroupName="rupayo-pg16", DeletionProtection=True,
    )["DBInstance"]

    MultiAZ                  True
    StorageEncrypted         True
    BackupRetentionPeriod    7
    PubliclyAccessible       False
    DeletionProtection       True
    endpoint: ledger-prod.aaaaaaaaaa.ap-south-1.rds.amazonaws.com 5432

Two settings cannot be fixed later in place: encryption at rest is chosen at creation (an unencrypted database
is encrypted by copying a snapshot with encryption and restoring it), and so is the engine. Deletion protection
did its job in the same run: delete_db_instance returned "InvalidParameterCombination ... Cannot delete protected
DB Instance, please disable deletion protection and try again."

## Multi-AZ and read replicas solve different problems

    Question              Multi-AZ (instance)                Read replica
    Purpose               survive an AZ or host failure      offload reads, reporting, DR copy
    Replication           synchronous to a standby           asynchronous, so it can lag
    Can you read from it  no, the standby is idle            yes, its own endpoint
    Failover              automatic, same endpoint name      manual: you promote it
    Other region          no                                 yes (cross-region replica)

Multi-AZ failover flips the endpoint's DNS to the standby; AWS documents it as typically one to two minutes, and
your application must reconnect — connection pools that cache a dead connection, or a JVM that caches DNS for
ever, turn a two-minute failover into an outage. Read replicas lag: a user who pays and then opens history served
from the replica may not see the payment yet ("read your writes"), so route such reads to the primary. A newer
"Multi-AZ DB cluster" deployment has two readable standbys; read its docs before assuming either behaviour.

    replica: ledger-reports source: ledger-prod
    primary's replicas: ['ledger-reports']

## Aurora's different shape

Aurora separates compute from storage. The cluster volume keeps six copies of your data across three AZs; a
write is durable when four of six copies acknowledge it, and a read needs three, so losing an AZ does not stop
the database. Up to 15 Aurora replicas read the same shared volume, so their lag is usually milliseconds, and
failover promotes a replica instead of replaying logs. You connect to endpoints, not instances:

    writer endpoint: ledger-aurora.cluster-kphwjdkbdaqn.ap-south-1.rds.amazonaws.com
    reader endpoint: ledger-aurora.cluster-ro-kphwjdkbdaqn.ap-south-1.rds.amazonaws.com
    member: ledger-aurora-1 writer
    member: ledger-aurora-2 reader

Aurora Serverless v2 scales capacity in units up and down with load; Aurora Global Database replicates a cluster
to another region with low lag. Aurora is worth it for high availability and read scaling; for a small app,
plain RDS PostgreSQL is simpler and usually cheaper. Azure's equivalents are Azure Database for PostgreSQL
(Flexible Server) and Azure SQL Database.

## Parameter groups and maintenance windows

Engine settings live in a **parameter group**. The default group cannot be edited, so create your own on day one
(rupayo-pg16, family postgres16) and attach it. Dynamic parameters such as log_min_duration_statement apply
immediately; static ones such as max_connections apply only after a reboot (apply method "pending-reboot"). Aurora
adds a cluster parameter group for cluster-wide settings.

The **maintenance window** (weekly, at least 30 minutes) is when AWS applies pending patches, and the **backup
window** (daily) is when the snapshot is taken. Both are in **UTC**. "sun:21:30-sun:22:00" is Monday 03:00–03:30
IST, and "20:30-21:00" is 02:00–02:30 IST — the quiet hours for an Indian wallet. Writing "02:00" thinking IST
puts the window at 07:30 IST, in the morning rush.

## Cost and teardown

You pay per instance-hour (Multi-AZ roughly doubles the instance part), per GB-month of storage and provisioned
IOPS, for backup storage beyond what is included, and for data transfer between AZs and regions. Read the RDS
pricing page and the calculator for your region; check what the Free Tier currently covers before creating
anything, with a budget alarm already set. To tear down a practice database: turn off deletion protection, delete
the read replicas first, decide whether you want a final snapshot (manual snapshots are billed until you delete
them), then delete the instance.`,
    workedExample: `**Scenario.** Rupayo's ledger must survive the loss of an AZ, finance runs heavy month-end reports that slow
the app, and the CTO wants slow queries logged. Peak traffic is 10:00–22:00 IST. Design the RDS setup.

**1. Availability.** Multi-AZ instance deployment: a synchronous standby in a second AZ, automatic failover. A
read replica would not do this job — it is asynchronous and must be promoted by hand.

**2. Reports.** One read replica, ledger-reports, with its own endpoint for the finance tool. Reports tolerate a
few seconds of lag; the payment and balance screens keep reading from the primary.

**3. Settings.** A custom parameter group with log_min_duration_statement = 500 (dynamic, immediate) and
max_connections = 200 (static, pending-reboot — schedule the reboot).

**4. Windows in UTC.** Backup 20:30–21:00 UTC (02:00 IST), maintenance Sunday 21:30–22:00 UTC (Monday 03:00 IST).

**5. As Terraform** (parsed with python-hcl2; not applied — no account was used):

    resource "aws_db_instance" "ledger" {
      identifier                  = "ledger-prod"
      engine                      = "postgres"
      instance_class              = "db.t4g.micro"
      allocated_storage           = 20
      max_allocated_storage       = 100
      storage_encrypted           = true
      manage_master_user_password = true
      username                    = "ledger_admin"
      multi_az                    = true
      db_subnet_group_name        = aws_db_subnet_group.data.name
      vpc_security_group_ids      = [aws_security_group.ledger_db.id]
      publicly_accessible         = false
      parameter_group_name        = aws_db_parameter_group.ledger.name
      backup_retention_period     = 7
      backup_window               = "20:30-21:00"
      maintenance_window          = "sun:21:30-sun:22:00"
      deletion_protection         = true
      final_snapshot_identifier   = "ledger-prod-final"
    }

**6. What is still on Rupayo.** Indexes for the month-end queries, a connection pool (or RDS Proxy), a plan for
the next major version, and alarms on CPU, free storage, connections and replica lag.

**Result.** Each requirement maps to one feature, and the reason the other feature was not chosen is written down.`,
    mcqs: [
      mcq('Rupayo\'s finance team runs month-end reports that slow down the payment app on the same RDS PostgreSQL instance. Which change addresses this directly?', [
        ['Add a read replica and point the reporting tool at its endpoint', true],
        ['Enable Multi-AZ so the reports run on the synchronous standby', false],
        ['Raise BackupRetentionPeriod so reporting reads come from backups', false],
        ['Move the instance to a db.t class so it can burst during reports', false],
      ], 'A read replica has its own endpoint and takes read load off the primary. The Multi-AZ standby cannot be read, backups are not a query target, and a burstable class runs out of CPU credits under a sustained month-end load.'),
      mcq('A team writes PreferredMaintenanceWindow="sun:02:00-sun:02:30" meaning 2 a.m. India time. When will AWS actually patch the database?', [
        ['Sunday 07:30–08:00 IST, because the window is in UTC', true],
        ['Sunday 02:00–02:30 IST, as RDS uses the region\'s local time', false],
        ['Saturday 20:30–21:00 IST, since IST is behind UTC by 5:30', false],
        ['Whenever AWS chooses, because the window is only advisory', false],
      ], 'RDS windows are in UTC, and IST is UTC+5:30, so 02:00 UTC is 07:30 IST. RDS does not use local time, IST is ahead of UTC rather than behind, and pending maintenance is applied within the chosen window.'),
      mcq('After setting max_connections to 400 in a custom parameter group, the RDS instance still allows 200 connections. Why?', [
        ['It is a static parameter and is pending until the instance reboots', true],
        ['Custom parameter groups only apply to Aurora clusters, not to RDS', false],
        ['RDS ignores parameter changes made through the API or Terraform', false],
        ['The value must first be added to the read replica\'s parameter group', false],
      ], 'Static parameters such as max_connections take effect after a reboot (status pending-reboot). Custom parameter groups are how RDS settings are changed, API changes are honoured, and the replica\'s group does not gate the primary.'),
    ],
    checkpoint: [
      mcq('Rupayo needs the ledger to keep running if one Availability Zone in Mumbai fails, with no manual step. Which RDS feature provides this?', [
        ['A Multi-AZ deployment with automatic failover to a standby', true],
        ['A read replica in another AZ that the team promotes by hand', false],
        ['Daily automated snapshots with seven days of retention set', false],
        ['A larger db.r instance class with more memory and vCPUs', false],
      ], 'Multi-AZ keeps a synchronous standby and fails over automatically. A replica needs a manual promotion and may lag, snapshots need a restore, and a bigger instance in one AZ still dies with that AZ.'),
      mcq('Which statement about Aurora\'s storage is accurate?', [
        ['It keeps six copies across three AZs and replicas share that volume', true],
        ['Each Aurora replica keeps its own full copy, filled by log shipping', false],
        ['It is a single EBS volume that the writer instance attaches to', false],
        ['It stores data in S3 objects that are queried by Athena on demand', false],
      ], 'The Aurora cluster volume holds six copies across three AZs with quorum writes, and replicas read the shared volume, which keeps lag low. Replicas do not keep separate copies, it is not one EBS volume, and Athena is unrelated.'),
      mcq('A security review finds an RDS instance with PubliclyAccessible=true and a security group allowing 5432 from 0.0.0.0/0. What is the correct fix?', [
        ['Make it private and allow 5432 only from the app tier\'s security group', true],
        ['Keep it public but rotate the master password every thirty days', false],
        ['Move it to port 15432 so that internet scanners no longer find it', false],
        ['Enable storage encryption so the open port no longer matters', false],
      ], 'The database should not be reachable from the internet at all; referencing the app security group allows exactly the traffic needed. Password rotation and a new port leave it exposed, and encryption at rest does not stop logins over the network.'),
    ],
  },

  /* ── DB_BACKUP_DR ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_DATABASES_DB_BACKUP_DR',
    notes: `In CL1's "Lifecycle, Replication and Backups" you protected S3 objects and met AWS Backup. A database is harder:
it changes every second, and a backup nobody has restored is a hope, not a plan. This lesson starts from two
numbers the business agrees with you, and ends with a rehearsed restore.

## RPO and RTO first

- **RPO (recovery point objective)** — how much data you may lose, measured in time. RPO 5 minutes means after a
  disaster you may lose at most the last five minutes of transactions.
- **RTO (recovery time objective)** — how long the service may be down before it is back.

For Rupayo the ledger is RPO 5 minutes, RTO 1 hour; the marketing database is RPO 24 hours, RTO 1 day. Different
numbers, different designs, different bills. Ask for the numbers before choosing anything; "zero data loss and
zero downtime" is a cost conversation, not a requirement.

## Automated backups and point-in-time restore

With BackupRetentionPeriod between 1 and 35 days (0 turns backups off), RDS takes a daily snapshot in the backup
window and ships transaction logs to S3 continuously. Together they let you restore to **any second** inside the
retention period, up to the LatestRestorableTime, which is usually within the last five minutes. That is your RPO
on a single region: roughly five minutes, if the region survives.

The rule that catches everyone: **a restore never overwrites the database. It creates a new instance with a new
endpoint.** You then point the application at it, or copy the rows you need back. Pass the security group,
subnet group and parameter group explicitly; a restore that is not told picks defaults, and the app cannot
connect. Run against moto:

    rds.restore_db_instance_to_point_in_time(
        SourceDBInstanceIdentifier="ledger-prod",
        TargetDBInstanceIdentifier="ledger-pitr-1415",
        UseLatestRestorableTime=True,      # or RestoreTime=datetime(...) for an exact second
    )
    pitr: ledger-pitr-1415 available

## Snapshots, and what deleting does

A **manual snapshot** is kept until you delete it — take one before every risky migration. **Automated backups**
belong to the instance: delete the instance and they go too, unless you choose to retain them, which is why
deleting asks for a final snapshot. Listing them (moto):

    snap list: rds:ledger-prod-2026-10-27-09-23 automated
    snap list: ledger-before-migration-0042 manual

Restoring a snapshot gives you the data as of that snapshot only; point-in-time restore is what reaches minutes
before an incident. Snapshots of an encrypted database stay encrypted; to share one with another account it must
use a customer managed KMS key, not the AWS managed key.

## Multi-AZ and replicas are not backups

A synchronous standby faithfully replicates a DROP TABLE within milliseconds; a read replica replays it a moment
later. They protect against hardware and AZ failure, not against a bad migration, a bug that corrupts rows, or an
attacker with admin rights. Only backups protect against those — ideally backups the attacker cannot delete.

## Leaving the region

If ap-south-1 itself has a bad day, Mumbai backups do not help. Options, roughly in order of RPO, RTO and cost:

    Strategy            How                                      RPO          RTO
    Backup and restore  copy snapshots to ap-south-2             hours        hours
    Pilot light         cross-region read replica, app off       seconds-min  tens of minutes
    Warm standby        replica + small running app in DR        seconds-min  minutes
    Active-active       Aurora Global DB / DynamoDB global tbl   ~seconds     ~minutes

Hyderabad keeps the data in India, which matters for payment data and for the DPDP Act conversation. A
cross-region snapshot copy of an encrypted database names a KMS key in the destination region (moto output):

    hyd = boto3.client("rds", region_name="ap-south-2")
    hyd.copy_db_snapshot(SourceDBSnapshotIdentifier=src_arn,
                         TargetDBSnapshotIdentifier="ledger-0042-hyd",
                         SourceRegion="ap-south-1", KmsKeyId="alias/ledger-dr")
    copy: ledger-0042-hyd arn:aws:rds:ap-south-2:123456789012:snapshot:ledger-0042-hyd

RDS can also replicate automated backups to another region, and **AWS Backup** can run one plan across RDS,
Aurora, DynamoDB and EBS with copies to another region and another account; a vault lock stops even an
administrator deleting recovery points early. Keep backups in a separate account so a stolen admin key in
production cannot wipe both. DynamoDB has its own point-in-time recovery (up to 35 days) and on-demand backups;
like RDS, it restores into a new table. A logical dump (pg_dump) is still worth having for long retention or for
moving engines. Azure's equivalents: automated backups with PITR on Azure Database for PostgreSQL and geo-redundant
backup storage.

## A backup is real only after a restore

Rehearse every quarter, and after any big change, with a runbook:

1. Restore to a new instance (PITR to a chosen second) in a non-production network.
2. Time each step: the restore itself, DNS or config change, app checks. That total is your measured RTO.
3. Verify the data, not just the status: row counts of key tables, the newest ledger entry's timestamp (your
   measured RPO), a checksum of yesterday's settlement totals.
4. Write down what surprised you, delete the test instance, and update the runbook.

A small script that checks every database against the policy turns "we think we're covered" into a list (moto):

    ledger-prod    OK
    kyc-prod       FAIL: retention 1 days (< 7); storage not encrypted; deletion protection off;
                         single-AZ; no snapshot copy in the DR region

Restore times depend on size and are not something moto can show; measure yours in the drill.`,
    workedExample: `**Scenario.** At 14:15 IST on a Tuesday a migration on ledger-prod runs "UPDATE wallet_txn SET status =
'REFUNDED'" without its WHERE clause. 1.8 lakh rows are wrong. Payments keep flowing. RPO 5 minutes, RTO 1 hour.

**1. Do not fail over, do not restore over production.** Multi-AZ already replicated the update, and a restore
cannot overwrite anyway. Stop the migration job; announce the incident.

**2. Pick the point.** The migration log shows the statement at 14:15:07 IST = 08:45:07 UTC. Restore to
08:45:00 UTC, seven seconds before:

    rds.restore_db_instance_to_point_in_time(
        SourceDBInstanceIdentifier="ledger-prod",
        TargetDBInstanceIdentifier="ledger-pitr-1415",
        RestoreTime=datetime(2026, 10, 27, 8, 45, 0, tzinfo=timezone.utc),
        DBSubnetGroupName="data-private", VpcSecurityGroupIds=["sg-0ledgerdb0example"],
        DBParameterGroupName="rupayo-pg16")

Times in RDS APIs are UTC; restoring to "14:15" would land six hours later than intended — after the damage.

**3. Choose: repair or switch.** New payments have arrived since 14:15, so switching the app to the restored
instance would lose them. Instead, read the correct status of the affected rows from ledger-pitr-1415 and update
only those rows in production, in batches, inside a transaction each.

**4. Verify.** Counts by status in production now match the restored copy for transactions older than 14:15;
newer rows were untouched.

**5. Close.** Delete ledger-pitr-1415 after the review (it is billed while it runs), keep a manual snapshot of it if
finance wants evidence, and add a check to the migration pipeline that refuses UPDATE or DELETE without WHERE.

**Result.** No data lost, the app never went down, and the drill earlier in the quarter is why the team knew a
restore creates a new instance and needs its network settings.`,
    mcqs: [
      mcq('The business says the ledger may lose at most five minutes of data and must be back within one hour. How do these map to RPO and RTO?', [
        ['RPO is five minutes of data loss; RTO is one hour of downtime', true],
        ['RTO is five minutes of data loss; RPO is one hour of downtime', false],
        ['Both describe downtime; RPO is the planned and RTO the unplanned', false],
        ['RPO is the backup retention period and RTO the restore window', false],
      ], 'RPO bounds how much data can be lost, measured as time; RTO bounds how long recovery may take. The swapped mapping is the common slip, neither is about planned versus unplanned downtime, and retention period is a setting rather than an objective.'),
      mcq('An engineer runs restore_db_instance_to_point_in_time on ledger-prod and the app keeps showing the corrupted rows. What did they misunderstand?', [
        ['The restore created a new instance; the app still points at the old one', true],
        ['Point-in-time restore only works on Aurora, never on RDS PostgreSQL', false],
        ['The restore silently failed because Multi-AZ blocks restores in place', false],
        ['The app caches every row for 35 days, the maximum retention period', false],
      ], 'RDS restores always create a new instance with a new endpoint, so the app must be repointed or rows copied back. PITR works on RDS engines, Multi-AZ does not block restores, and 35 days is backup retention, not an application cache.'),
      mcq('Rupayo keeps Multi-AZ on and a read replica, and asks whether it still needs backups. What is the right answer?', [
        ['Yes: a bad UPDATE or a deletion reaches the standby and replica too', true],
        ['No: two live copies already cover every failure that can happen', false],
        ['No: the replica keeps every older version of each row for 35 days', false],
        ['Yes, but only because the standby is in the same AZ as the primary', false],
      ], 'Replication copies mistakes as faithfully as good writes, so only backups reach a point before the error. Two live copies do not cover logical errors, replicas keep no row history, and the Multi-AZ standby is in a different AZ by design.'),
    ],
    checkpoint: [
      mcq('A bug corrupts customer rows at 11:02, noticed at 11:30. Retention is seven days. What gets Rupayo closest to the data at 11:01?', [
        ['A point-in-time restore to 11:01 into a new instance, then repair', true],
        ['Restoring the latest automated daily snapshot over the database', false],
        ['Promoting the read replica, which still holds the 11:01 version', false],
        ['Forcing a Multi-AZ failover so the standby serves the old rows', false],
      ], 'PITR combines the daily snapshot with transaction logs to reach any second in retention. The daily snapshot is hours old and cannot be restored over the original, and both the replica and the standby have long since applied the corrupting writes.'),
      mcq('Rupayo copies encrypted ledger snapshots from ap-south-1 to ap-south-2. What must the copy request include?', [
        ['A KMS key in the destination region to encrypt the copied snapshot', true],
        ['The master password, so that the copy can be decrypted in transit', false],
        ['A read replica in ap-south-2, since snapshots only follow replicas', false],
        ['Public access on the snapshot, so ap-south-2 is allowed to read it', false],
      ], 'KMS keys are regional, so an encrypted cross-region copy names a key in the destination region. The master password is unrelated to snapshot encryption, copies do not need a replica, and making a snapshot public is a serious exposure, never a requirement.'),
      mcq('An attacker with admin rights in the production account deletes the database and all its snapshots. Which design would still have allowed recovery?', [
        ['Backup copies in a separate account, protected by a vault lock', true],
        ['A second Multi-AZ standby in the same production account region', false],
        ['Longer automated backup retention on the production instance', false],
        ['Deletion protection enabled on the production instance only', false],
      ], 'Copies in another account under a vault lock cannot be deleted with production credentials. Standbys and automated backups live and die with the production account, and an admin can simply turn deletion protection off.'),
    ],
  },

  /* ── DYNAMODB ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_DATABASES_DYNAMODB',
    notes: `Rupayo's transaction history screen is read millions of times on a sale day. The ledger stays in PostgreSQL;
the history feed, idempotency keys and sessions move to DynamoDB, a key-value and document database that scales
without servers to size. The catch: in SQL you design tables and write any query later; in DynamoDB **you list
the queries first** and design the keys so each is one cheap request.

## Keys

Every item has a **primary key**: a **partition key** alone, or a partition key plus a **sort key**. DynamoDB
hashes the partition key to pick the physical partition; items with the same partition key (an "item
collection") are stored together, ordered by sort key. A Query must name exactly one partition key value, and
may narrow the sort key with =, <, >, between or begins_with. An item can be at most 400 KB.

## Start from access patterns

Rupayo's list, agreed with the app team:

    AP1  a user's latest transactions, newest first, 20 per page
    AP2  a user's transactions on one day
    AP3  one transaction by its id (support team)
    AP4  a merchant's transactions for a day (settlement)
    AP5  reject a repeated UPI request id for 24 hours (idempotency)

Design: PK = USER#u-1001, SK = TXN#<ISO-8601 UTC time>#<txn id>. ISO timestamps sort as strings in time order,
so AP1 is "PK = user, newest first" and AP2 is "SK between two strings". AP3 needs a different key, so it gets a
**global secondary index** GSI1 with GSI1PK = TXN#<id>. Generic attribute names (PK, SK, GSI1PK) let one table
hold several item types — the "single-table" style.

    ddb.create_table(TableName="rupayo-txns", BillingMode="PAY_PER_REQUEST",
        AttributeDefinitions=[{"AttributeName": a, "AttributeType": "S"}
                              for a in ["PK", "SK", "GSI1PK", "GSI1SK"]],
        KeySchema=[{"AttributeName": "PK", "KeyType": "HASH"},
                   {"AttributeName": "SK", "KeyType": "RANGE"}],
        GlobalSecondaryIndexes=[{"IndexName": "GSI1", "KeySchema": [
            {"AttributeName": "GSI1PK", "KeyType": "HASH"},
            {"AttributeName": "GSI1SK", "KeyType": "RANGE"}],
            "Projection": {"ProjectionType": "ALL"}}],
        StreamSpecification={"StreamEnabled": True, "StreamViewType": "NEW_AND_OLD_IMAGES"})

Only key attributes are declared; everything else is schemaless. The queries, run against moto:

    t.query(KeyConditionExpression=Key("PK").eq("USER#u-1001") & Key("SK").begins_with("TXN#"),
            ScanIndexForward=False, Limit=3)
       TXN#2026-10-27T07:45:12Z#T9005 m-chai 4500
       TXN#2026-10-26T19:55:30Z#T9004 m-grocer 124000
       TXN#2026-10-26T08:02:17Z#T9003 m-chai 4000
       LastEvaluatedKey: {'PK': 'USER#u-1001', 'SK': 'TXN#2026-10-26T08:02:17Z#T9003'}
    AP2 on 26 Oct: ['T9003', 'T9004'] Count 2           # SK between "TXN#2026-10-26" and "TXN#2026-10-26~"
    AP3 T9004 -> USER#u-1001 124000                    # Query on IndexName="GSI1"

Pagination is yours: pass LastEvaluatedKey back as ExclusiveStartKey until it is absent. With Limit=2 the five
items came back as pages of 2, 2 and 1. Amounts are integers in paise, never floats.

## Filters, scans and what they cost

A FilterExpression is applied **after** items are read, so you pay for everything read. Filtering u-1001's
history for one merchant: "Count 3 ScannedCount 5". A Scan reads the whole table: "Count 4 ScannedCount 6" on six
items — and on sixty million. If a pattern needs a filter or a scan on a hot path, the key design is missing an
index.

## Conditional writes

AP5 is a put that must fail if the key exists, with a TTL attribute so the record expires:

    t.put_item(Item={"PK": "IDEM#upi-req-7f3a", "SK": "IDEM", "txn": "T9005",
                     "expires_at": now + 24 * 3600},
               ConditionExpression="attribute_not_exists(PK)")
    first put: ok
    second put: ConditionalCheckFailedException

Two moto errors you will meet for real: writing an item without its sort key gives "ValidationException - Missing
the key SK in the item", and SET status = :s gives "Attribute name is a reserved keyword; reserved keyword:
status" — use ExpressionAttributeNames {"#s": "status"}.

## Secondary indexes

A **GSI** has its own partition and sort key, can be added at any time, is updated asynchronously (reads are
eventually consistent only) and has its own capacity; a throttled GSI can throttle writes to the table. Project
only the attributes the pattern needs (KEYS_ONLY, INCLUDE or ALL) — projection is storage and write cost. An item
without the GSI key attributes is simply not in the index: a **sparse index**, handy for "only open disputes".
An **LSI** keeps the table's partition key with a different sort key, must be created with the table, supports
strongly consistent reads, and limits each item collection to 10 GB.

## Capacity

**On-demand** (PAY_PER_REQUEST) bills per request and suits new or spiky tables — a flash sale. **Provisioned**
sets read and write capacity units (with auto scaling) and is cheaper for steady, predictable load; check the
pricing page for both. The units:

- 1 RCU = one strongly consistent read per second of up to 4 KB (an eventually consistent read costs half).
- 1 WCU = one write per second of up to 1 KB. Transactional reads and writes cost double.

Run in Python: 800 eventually consistent reads/s of 1.2 KB items = 400 RCU; 300 writes/s of 1.5 KB = 600 WCU,
1,200 inside transactions. A Query adds up the sizes of the items it reads, then rounds up to 4 KB: 25 items of
300 bytes = 7,500 bytes = 2 RCU. Each partition serves at most 3,000 RCU and 1,000 WCU per second, so one hot key
— a huge merchant on sale day — throttles (ProvisionedThroughputExceededException) however much capacity the table
has. Spread it by appending a shard suffix to the key, as in the worked example.

## TTL and streams

**TTL** deletes items whose chosen Number attribute (epoch seconds) is in the past, at no write cost, usually
within a few days of expiry — not on the second. Until then expired items still come back, so filter on
expires_at when it matters. **Streams** record every change for 24 hours, in order per item; with
NEW_AND_OLD_IMAGES a Lambda can update a search index or send a notification. TTL deletions appear in the stream
marked as service deletions. Enabling TTL in moto:

    describe ttl: {'TimeToLiveStatus': 'ENABLED', 'AttributeName': 'expires_at'}

When not to use DynamoDB: ad-hoc reporting, many-table joins, or access patterns nobody can list yet — keep those
in PostgreSQL. Azure's nearest equivalent is Cosmos DB, which also partitions by a key you choose.`,
    workedExample: `**Scenario.** Finance adds AP4: "all of a merchant's transactions for one day, for settlement". MegaMart, a
big retailer, takes tens of thousands of payments an hour on sale days.

**1. The obvious key.** GSI2PK = MERCHANT#m-megamart#2026-10-26. One partition key value for a whole day of
MegaMart traffic: every write to the table also writes this index entry, all into one partition, which can take
at most 1,000 WCU per second. On sale day the index throttles and back-pressures the table.

**2. Write sharding.** Add a shard number from a hash of the transaction id, so one merchant-day spreads over N
partitions. N comes from peak writes divided by the per-partition limit, with headroom.

    SHARDS = 4
    def merchant_pk(merchant, day, txn_id):
        shard = zlib.crc32(txn_id.encode()) % SHARDS
        return f"MERCHANT#{merchant}#{day}#{shard}"

A stable hash (crc32) matters: Python's built-in hash() of a string changes between processes.

**3. Reading it back.** Settlement queries each shard and adds up — N cheap queries instead of one hot one.
Twelve test transactions on moto, GSI2 projecting only amount_paise (INCLUDE):

    shard 0: 4 txns
    shard 1: 2 txns
    shard 2: 3 txns
    shard 3: 3 txns
    settlement 26 Oct: 12 txns, total paise 78000

**4. Trade-offs.** Small merchants get four tiny partitions they do not need; that is acceptable, or shard only
merchants flagged as large. The GSI is eventually consistent, so settlement runs after the day closes plus a
margin, never at 23:59:59.

**Result.** Every access pattern is a Query on a key; none uses a Scan or a filter on a hot path, and the
hottest key is spread before sale day rather than after the first throttling alarm.`,
    mcqs: [
      mcq('Rupayo\'s history table has PK = USER#<id> and SK = TXN#<ISO time>#<txn id>. Which call returns a user\'s 20 newest transactions?', [
        ['Query on the user\'s PK with ScanIndexForward=False and Limit=20', true],
        ['Scan the table, filter on the user id and sort the results in Python', false],
        ['GetItem with the user\'s PK and the current time as the sort key value', false],
        ['Query on the SK alone with begins_with("TXN#") and Limit set to 20', false],
      ], 'A Query names one partition key and can read its sort key in descending order. A Scan reads and bills the whole table, GetItem needs the exact full key, and a Query must always include the partition key.'),
      mcq('A Query with a FilterExpression returns Count 3 and ScannedCount 5. What did the request consume?', [
        ['Read capacity for all five items read before the filter was applied', true],
        ['Read capacity for the three items left after the filter matched', false],
        ['No read capacity, because filtering happens in the boto3 client', false],
        ['Read capacity for five items plus a write for the filtered ones', false],
      ], 'Filters run on the server after the read, so you pay for every item scanned. The filter does not reduce cost, it is not done in the client, and nothing is written by a query.'),
      mcq('The table must also answer "find a transaction by its txn id", which is not in the primary key. What is the usual DynamoDB answer?', [
        ['A global secondary index with the transaction id as its partition key', true],
        ['A local secondary index added to the existing table at any later time', false],
        ['A Scan with a FilterExpression on txn_id, run once for each request', false],
        ['Storing each txn id as a new attribute name on the user\'s item', false],
      ], 'A GSI gives a different partition key and can be added to an existing table. An LSI keeps the same partition key and can only be created with the table, a Scan per lookup is slow and expensive, and attribute names are not a lookup mechanism.'),
    ],
    checkpoint: [
      mcq('Items are written with an expires_at attribute and TTL is enabled on it. A query an hour after expiry still returns some of them. Why?', [
        ['TTL deletes in the background, often within days, not at expiry', true],
        ['TTL only works when the table uses provisioned capacity mode', false],
        ['The TTL attribute must hold an ISO date string, not a number', false],
        ['Expired items are hidden only from Scans and never from Queries', false],
      ], 'TTL deletion is a background process that usually acts within a few days, so expired items must be filtered when it matters. TTL works in both capacity modes, the attribute must be epoch seconds as a Number, and expired-but-undeleted items appear in Scans as well.'),
      mcq('A table serves 500 strongly consistent reads per second of 6 KB items. How many RCUs are needed?', [
        ['1,000 RCU, since each 6 KB read rounds up to two 4 KB units', true],
        ['750 RCU, since each read costs 6 KB divided by 4 KB, unrounded', false],
        ['500 RCU, since one read always costs one unit whatever its size', false],
        ['3,000 RCU, since read units are counted in 1 KB steps like writes', false],
      ], 'Strongly consistent reads cost one RCU per 4 KB, rounded up per item: 6 KB is two units, times 500 is 1,000. Sizes are not left unrounded, size does matter, and the 1 KB step applies to writes, not reads.'),
      mcq('On a sale day one merchant\'s settlement index partition throttles while the table has spare capacity. What fixes the cause?', [
        ['Spread that merchant across shard suffixes in the partition key', true],
        ['Switch the table to on-demand so the partition limit disappears', false],
        ['Turn on DynamoDB Streams so writes are spread across shards', false],
        ['Add an LSI with the merchant id as its new partition key', false],
      ], 'Per-partition limits apply in every capacity mode, so a hot key must be split, here with a shard suffix. On-demand does not lift the per-partition limit, streams record changes and do not spread writes, and an LSI cannot change the partition key.'),
    ],
  },

  /* ── CACHING_ELASTICACHE ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_DATABASES_CACHING_ELASTICACHE',
    notes: `Every Rupayo QR scan looks up the merchant: name, UPI id, fee. On a sale day that is the same few thousand rows
read hundreds of thousands of times a minute. Year 3's "Caching a Response Safely" asked what is safe to cache and
how it becomes wrong. This lesson puts that cache on AWS and is honest about what it does to consistency: **a
cache is a copy, and every copy can be stale.**

## ElastiCache: what you are choosing

ElastiCache runs in-memory engines inside your VPC (no public endpoint; reach it from the app subnets, through a
security group, like the database).

    Engine                 Data                              Replication / failover    Use it for
    Valkey / Redis OSS     strings, hashes, sorted sets...   replicas, Multi-AZ        most caches, sessions,
                           TTL per key, atomic ops           automatic failover        rate limits, leaderboards
    Memcached              strings only, multi-threaded      none; a node lost is      a simple, large, purely
                                                             its data lost              disposable cache

Valkey is the open-source fork of Redis that AWS now offers alongside Redis OSS; the client code is the same. You
choose **serverless** (capacity scales; you pay for data stored and requests) or **node-based** clusters (you
pick node types, shards and replicas). Cluster mode spreads keys over shards for more memory and write
throughput; replicas add read capacity and a failover target. Turn on in-transit encryption and AUTH or RBAC users.
Pricing differs between the two models; read the ElastiCache pricing page. Azure's equivalent is Azure Cache for
Redis (Azure Managed Redis); for DynamoDB specifically, AWS offers DAX, a cache that speaks the DynamoDB API.

## Cache-aside, the default pattern

The app asks the cache; on a miss it reads the database and fills the cache with a TTL. Written against
redis-py's documented API (not run against a real Valkey or Redis — none was available):

    def get_merchant(mid, ttl=300):
        key = f"merchant:{mid}"
        hit = r.get(key)
        if hit is not None:
            return json.loads(hit)
        row = db_get_merchant(mid)                 # PostgreSQL
        r.set(key, json.dumps(row), ex=ttl)        # expires in 300 s
        return row

    def update_fee(mid, bps):
        db_update_fee(mid, bps)                    # write the database first
        r.delete(f"merchant:{mid}")                # then drop the cached copy

To show the behaviour honestly, the same logic was run in Python against a stand-in with a fake clock (GET, SET
with an expiry, DEL). Real output:

    5 reads -> db_reads = 1 | last: HIT
    t=120 after update (no invalidation): HIT fee_bps = 0 | db says 50
    t=301 after TTL: MISS fee_bps = 50
    update + delete key: MISS fee_bps = 75 | db_reads = 3

Without invalidation, a fee change is invisible for up to the TTL. With delete-on-write it shows on the next read.

**Write-through** writes the cache whenever the database is written, so reads are rarely misses, but the cache
fills with data nobody reads and a failed second write leaves the two disagreeing. **Write-behind** (write the
cache, flush to the database later) is fast and can lose data if the cache node dies — never for money.

## The race that delete-on-write does not close

Reader A misses and reads the row (fee 75). Writer B updates the fee to 100 and deletes the key — nothing is there
yet. A then writes its old row into the cache. Simulated:

    race: HIT fee_bps = 75 | db says 100 | wrong until t = 1300

Wrong for a full TTL. This is why **every** cached key has a TTL, even with invalidation: the TTL is the upper
bound on how long any bug or race can serve wrong data. Choose it from the business: "a merchant name may be five
minutes old; a fee may be one minute old; a wallet balance used to approve a payment may not be cached at all."

## Stampedes, hot keys and eviction

When a popular key expires, hundreds of requests miss together and hit the database at once — a **stampede**.
Remedies: add random jitter to TTLs so keys do not expire together; let one request rebuild while the others wait
or serve the old value (a short lock with SET key value NX EX 10 — set only if absent, with an expiry so a crashed
worker cannot hold it); refresh popular keys a little before they expire. On sale days a single key read by every
request can saturate one shard; keep a copy in the app's memory for a few seconds as well.

When memory fills, the engine evicts keys according to maxmemory-policy (for example evict the least recently used
keys that have a TTL). Evictions are normal for a cache and a warning for a session store. Watch CloudWatch:
CacheHits and CacheMisses (hit ratio), Evictions, CurrConnections, EngineCPUUtilization and
DatabaseMemoryUsagePercentage.

## What a cache must never do

- **Serve one user's data to another.** A key like "profile" instead of "profile:u-1001" is a data leak, not a
  performance bug. Put the user id (and tenant) in every per-user key.
- **Be the only copy.** If losing the cache loses data, it is a database; use a durable store (MemoryDB, or the
  database itself).
- **Decide money from stale data.** Balances and limits are read from the source of truth inside the transaction.
- **Hide that it is down.** If the cache fails, the app should fall back to the database with a timeout — and the
  database must be sized to survive that, at least for a while.

Replicas in Valkey/Redis are updated asynchronously, so reading from a replica can be a little older than the
primary; for a cache that is usually fine, and it is one more reason a TTL bounds staleness.`,
    workedExample: `**Scenario.** Before a festive sale, Rupayo expects QR-scan merchant lookups to rise tenfold. The merchant table
has 10,000 rows; a few hundred big merchants get most scans. The DBA asks: how much load will the cache take?

**1. Model the traffic.** Merchant popularity is skewed: the n-th most popular merchant gets traffic in
proportion to 1/n. Simulate 50,000 lookups, about 100 per second, with a 300-second TTL (fake clock, seed 7):

    hit ratio: 82.8%  (misses = 8591)

**2. Read the number.** Five in six lookups never reach PostgreSQL; the database sees about one in six. The misses
are mostly the long tail of small merchants, each looked up once inside its TTL. At ten times the traffic the
popular merchants stay hot and the ratio rises, so this is a cautious estimate — but measure it from the
CacheHits and CacheMisses metrics after launch rather than trusting the model.

**3. Set the TTLs from the business.** Name and UPI id: 300 s plus 0–60 s of random jitter. Fee: delete on every
fee update and a 60 s TTL as the safety net. Wallet balance: not cached.

**4. Protect the database from the cache.** If ElastiCache is unreachable, the app falls back to PostgreSQL with a
short timeout. Five in six lookups would then land on the database, so the team load-tests that path and adds a
read replica for merchant reads, rather than discovering it during the sale.

**5. Size.** 10,000 merchants at about 1 KB each is about 10 MB — tiny. The smallest node-based setup with one
replica in a second AZ (for failover), or serverless, is plenty; the choice is about availability and price, not
memory.

**Result.** The cache is justified by a measured hit ratio, every key has a TTL tied to how stale it may be, and
the failure mode was rehearsed rather than assumed.`,
    mcqs: [
      mcq('Rupayo changes a merchant\'s fee in PostgreSQL, but the app shows the old fee for several minutes. The cache is cache-aside with a 300-second TTL. What is missing?', [
        ['Deleting the merchant\'s cache key when the fee is written', true],
        ['A longer TTL, so the new fee is cached for more than 300 seconds', false],
        ['Reading the fee from a Redis replica instead of the primary node', false],
        ['Switching the cache engine from Redis OSS to Memcached nodes', false],
      ], 'Without invalidation, the stale copy lives until its TTL expires; deleting the key on write makes the next read fetch the new value. A longer TTL makes it worse, replicas hold the same stale value, and the engine choice does not invalidate anything.'),
      mcq('Why does a team keep a TTL on every cached key even though it deletes keys on every write?', [
        ['A race or a missed delete can still cache old data; TTL bounds it', true],
        ['ElastiCache refuses to store any key that has been set without a TTL', false],
        ['Keys without a TTL are copied to disk, which slows the cache down', false],
        ['Deleting a key is slow in Redis, so a TTL is the faster mechanism', false],
      ], 'A reader can write an old row back after the writer\'s delete, or a delete can fail; the TTL caps how long such wrong data lives. Keys without TTLs are allowed, they are not moved to disk, and DEL is a fast operation.'),
      mcq('A profile endpoint caches responses under the key "profile". What is the most serious consequence?', [
        ['Every user can be served the profile of whoever was cached first', true],
        ['The cache will evict the key too often and the hit ratio will drop', false],
        ['Redis rejects keys without a colon, so nothing is ever cached', false],
        ['The key will expire immediately because no user id was supplied', false],
      ], 'Per-user data under a shared key leaks one user\'s data to all others — a security incident, not a tuning issue. Eviction is not the problem, Redis accepts any key name, and a missing id does not change expiry.'),
    ],
    checkpoint: [
      mcq('Which data should Rupayo NOT serve from a cache when approving a payment?', [
        ['The wallet balance used to decide whether the payment can go through', true],
        ['The merchant\'s display name shown on the payment confirmation screen', false],
        ['The list of supported banks shown in the app\'s add-account screen', false],
        ['The app\'s feature flags, refreshed from configuration every minute', false],
      ], 'A decision about money must read the source of truth inside the transaction; a stale balance can approve an overdraft. Names, bank lists and feature flags tolerate being seconds or minutes old.'),
      mcq('A popular cache key expires and the database CPU spikes as hundreds of requests rebuild it at once. Which remedy targets this?', [
        ['Let one request rebuild under a short NX lock while the rest wait', true],
        ['Remove TTLs from all keys so that popular keys never expire again', false],
        ['Use write-behind caching so updates reach the database later', false],
        ['Move the cache into a public subnet so clients can reach it faster', false],
      ], 'A stampede is many simultaneous misses; a short lock (or serving the old value while one request refreshes) collapses them into one rebuild. Removing TTLs trades it for unbounded staleness, write-behind concerns writes, and a public cache is a security problem.'),
      ck('DB_FUNDAMENTALS', 'Reader A misses the cache and reads fee 75; writer B updates to 100 and deletes the key; A then caches 75. What bounds how long 75 is served?', [
        ['The TTL that A set when it wrote the old value into the cache', true],
        ['Nothing; the stale value stays until the next deploy of the app', false],
        ['The database replica lag, which is applied to the cache as well', false],
        ['The next DynamoDB stream record, which clears the cached key', false],
      ], 'Delete-on-write cannot fix this ordering, so the TTL is the upper bound on staleness. Without a TTL it would stay indefinitely, replica lag does not govern cache entries, and nothing here involves a DynamoDB stream.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_DATABASES_DEBUGGING',
    notes: `Six things that go wrong with AWS databases. For each: the symptom you see, the cause, and the one change that
fixes it. Read the error text first; in DynamoDB it usually names the problem exactly. Outputs marked (moto) are
real output from boto3 against moto; the others describe AWS behaviour from the documentation.

## 1. The restored database that nobody can reach

**Symptom.** After a point-in-time restore for a drill, the app's health check times out connecting to
ledger-pitr-1415. The instance is "available".

**Cause.** The restore was called with only the source, target and time. It landed in the default security group
and the default parameter group, and the app tier's security group has no rule to it.

**Fix.** Restore with DBSubnetGroupName, VpcSecurityGroupIds and DBParameterGroupName set, or modify the instance
afterwards. Put these in the drill runbook so the real incident does not rediscover them.

## 2. The parameter change that "did nothing"

**Symptom.** max_connections was raised from 200 to 400 in rupayo-pg16 yesterday. Today the app still gets "too
many connections" at 200.

**Cause.** max_connections is a static parameter. describe_db_instances shows the parameter group status as
pending-reboot.

**Fix.** Reboot in a quiet window (with Multi-AZ, a reboot with failover keeps the outage short). And ask why there
are 200 connections at all: a connection pool or RDS Proxy is usually the better fix than more connections.

## 3. Querying by an attribute that is not a key (moto)

**Symptom.**

    t.query(KeyConditionExpression=Key("merchant").eq("m-chai"))
    ValidationException - Query condition missed key schema element: PK

**Cause.** A Query must name the table's (or index's) partition key. merchant is an ordinary attribute.

**Fix.** Do not reach for a Scan. If "transactions by merchant" is a real access pattern, add a GSI keyed on it
(with sharding if one merchant is huge) and query the index with IndexName.

## 4. A reserved word in an update (moto)

**Symptom.**

    UpdateExpression="SET status = :s"
    ValidationException - Invalid UpdateExpression: Attribute name is a reserved keyword; reserved keyword: status

**Cause.** DynamoDB has a long list of reserved words (status, name, date, data, count and many more).

**Fix.** Use a placeholder: UpdateExpression="SET #s = :s", ExpressionAttributeNames={"#s": "status"}. Adding
ConditionExpression="#s = :ok" makes the refund apply only to a SUCCESS transaction (moto: "refund ok: REFUNDED").

## 5. "I just paid and it is not in my history"

**Symptom.** Support tickets: a payment succeeds, the user opens history at once and it is missing; a refresh a
second later shows it. Only on some requests.

**Cause.** Two variants of the same thing. In RDS, history is read from the read replica, which lags the primary
asynchronously. In DynamoDB, the history screen reads a GSI, and GSIs are eventually consistent.

**Fix.** Route read-after-write screens to the source: the RDS primary, or a strongly consistent Query on the base
table (ConsistentRead=True, not available on GSIs). Or return the new transaction in the payment response and let
the app show it. Monitor replica lag (the ReplicaLag metric) and alarm on it.

## 6. A cache that serves the old fee for minutes after it changed

**Symptom.** Finance lowers a merchant fee; receipts keep showing the old one, sometimes for exactly five minutes,
sometimes longer after a deploy.

**Cause.** The fee update writes PostgreSQL but never deletes the cache key, so the copy lives until its 300-second
TTL. "Longer after a deploy": a new code path calls r.set(key, value) without ex=, creating a key that never
expires.

**Fix.** Delete the key after the database write, and make one helper the only way to write the cache, always
with a TTL. Find keys without an expiry: TTL returns -1 for a key that exists without one. (Not run against a real
Redis; see the documented TTL command.)

## The habit

For each case, the fix changed exactly one thing, and the evidence came first: the error message, a describe call,
a metric. Changing instance sizes, capacity modes or cache engines until it works is how a team ends up with a
bigger bill and the same bug.`,
    mcqs: [
      mcq('A DynamoDB update fails with "Attribute name is a reserved keyword; reserved keyword: status". What is the fix?', [
        ['Use #s in the expression and map it in ExpressionAttributeNames', true],
        ['Rename the attribute to status_ in every item in the whole table', false],
        ['Put quotation marks around status inside the UpdateExpression', false],
        ['Switch the table to provisioned capacity so reserved words are allowed', false],
      ], 'ExpressionAttributeNames placeholders are the documented way to use reserved words. Renaming every item is unnecessary, quoting does not work in DynamoDB expressions, and capacity mode has nothing to do with reserved words.'),
      mcq('A point-in-time restored RDS instance is "available" but the app cannot connect to it. Which cause is most likely?', [
        ['It was given the default security group, which the app cannot reach', true],
        ['Point-in-time restores stay read-only until they are promoted', false],
        ['Restored instances accept connections only from the AWS console', false],
        ['The restore kept the old endpoint name, so DNS points at production', false],
      ], 'Unless told otherwise, a restore uses defaults for the security group and parameter group, so the app tier is not allowed in. Restored instances are writable, connect like any other, and always get a new endpoint name.'),
      mcq('Users sometimes miss a just-made payment in their history when it is read from a DynamoDB GSI. What explains it?', [
        ['GSIs are updated asynchronously and support only eventual consistency', true],
        ['The GSI dropped the item because its partition key was too long', false],
        ['ConsistentRead=True was set on the GSI query, which slows updates', false],
        ['TTL deleted the new item before the history screen could read it', false],
      ], 'GSI updates lag the base table slightly and strongly consistent reads are not supported on them. Long keys do not drop items silently, ConsistentRead is not allowed on a GSI at all, and TTL acts on expired items, not new ones.'),
      mcq('Some cache keys never expire after a recent deploy. What did the deploy most likely change?', [
        ['A code path that calls SET without an expiry on the cached keys', true],
        ['The cache cluster\'s maxmemory-policy, set to evict no keys at all', false],
        ['The node type, since larger nodes keep keys for longer than small', false],
        ['The security group, which now blocks the cache\'s expiry process', false],
      ], 'A SET without EX creates a key with no TTL, and TTL then reports -1. Eviction policy decides what happens when memory is full, node size does not change TTLs, and expiry is internal to the engine, not a network flow.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_DATABASES_PRACTICE',
    notes: `Eight exercises, easiest first. Answer each on paper before reading the answer. The arithmetic answers were
checked by running the same calculation in Python.

## 1. Feature for the requirement (easy)

For each, name the feature: (a) survive an AZ failure automatically; (b) take reporting load off the primary;
(c) recover from a bad DELETE made 20 minutes ago; (d) keep a copy safe in Hyderabad.

**Answer.** (a) Multi-AZ. (b) A read replica (or Aurora reader endpoint). (c) Point-in-time restore into a new
instance, then copy the rows back. (d) Cross-region snapshot copy or cross-region automated backups to ap-south-2
(or a cross-region replica if the RPO is minutes).

## 2. Windows in UTC (easy)

Rupayo wants backups at 01:30–02:00 IST and maintenance on Monday 03:00–03:30 IST. Write both windows.

**Answer.** IST = UTC+5:30. Backup "20:00-20:30" (previous day in UTC). Maintenance "sun:21:30-sun:22:00", because
Monday 03:00 IST is Sunday 21:30 UTC.

## 3. RPO and RTO (easy)

The marketing database can lose a day of data and be down for a day. The ledger can lose five minutes and be down
for an hour. Which needs cross-region copies, and which is fine with automated backups alone?

**Answer.** Marketing: automated backups in-region plus a daily snapshot copy is plenty. Ledger: PITR covers the
five minutes in-region; to meet RTO one hour even if the region fails, add a cross-region replica (pilot light) —
copies of daily snapshots would lose up to a day.

## 4. Read capacity (medium)

400 eventually consistent reads per second of 9 KB items. RCUs?

**Answer.** 9 KB rounds up to three 4 KB units; eventually consistent halves it: 400 × 3 × 0.5 = 600 RCU.

## 5. Write capacity (medium)

300 writes per second of 1.5 KB items, done inside TransactWriteItems. WCUs?

**Answer.** 1.5 KB rounds up to 2 WCU per write; transactions double: 300 × 2 × 2 = 1,200 WCU. (Python agreed: 600
without transactions, 1,200 with.)

## 6. Key design (medium)

A health-tech app, Arogya Notes, stores doctor's notes. Patterns: all notes for a patient newest first; one note by
id; all notes written by a doctor this week. Give PK, SK and any GSI.

**Answer.** PK = PATIENT#<id>, SK = NOTE#<ISO time>#<note id> (newest first with ScanIndexForward=False). GSI1:
GSI1PK = NOTE#<note id> for lookup by id. GSI2: GSI2PK = DOCTOR#<id>, GSI2SK = <ISO time>, queried with between for
the week. A doctor writes at most a few hundred notes a week, so no sharding is needed.

## 7. TTL value (medium)

An OTP record created at epoch 1793088000 must expire after 10 minutes. What does expires_at hold, and can the
login code trust that the item is gone at 1793088600?

**Answer.** 1793088600, a Number in epoch seconds. No — TTL deletes in the background, usually within days, so the
login code must also check expires_at > now itself.

## 8. Cache TTLs (harder)

Choose cache behaviour for: merchant display name; merchant fee; a user's KYC status; the wallet balance used for a
payment; the list of banks.

**Answer.** Name: cache-aside, 5 minutes plus jitter. Fee: delete on update, 60-second TTL as a safety net. KYC
status: short TTL (say 60 s) and delete on change, because a downgrade must take effect quickly. Wallet balance for
a payment: never cached; read inside the transaction. Bank list: an hour or more, refreshed on change. Each key
includes the id it belongs to.`,
    mcqs: [
      mcq('Backups must run at 01:30–02:00 IST. What value goes in PreferredBackupWindow?', [
        ['"20:00-20:30", because the window is given in UTC (IST minus 5:30)', true],
        ['"01:30-02:00", because RDS converts the window to local region time', false],
        ['"07:00-07:30", because UTC is five and a half hours ahead of IST', false],
        ['"19:30-20:00", because IST is six hours ahead of UTC in the winter', false],
      ], 'RDS windows are in UTC and IST is UTC+5:30, so 01:30 IST is 20:00 UTC the previous day. RDS does not convert to local time, UTC is behind IST rather than ahead, and India does not observe daylight saving time.'),
      mcq('How many RCUs do 400 eventually consistent reads per second of 9 KB items need?', [
        ['600, since 9 KB is three 4 KB units and eventual reads cost half', true],
        ['900, since 9 KB divided by 4 KB is 2.25, rounded and then doubled', false],
        ['1,200, since 9 KB is three units and nothing is halved for reads', false],
        ['3,600, since read units are counted per 1 KB of the item size', false],
      ], 'Round each read up to 4 KB units (three), then halve for eventual consistency: 400 × 3 × 0.5 = 600. Doubling is not part of reads, 1,200 is the strongly consistent figure, and 1 KB steps apply to writes.'),
      mcq('An OTP item has TTL set for 10 minutes after creation. What must the login code still do?', [
        ['Check expires_at against the current time itself', true],
        ['Delete the item at once when the OTP is created', false],
        ['Read it from a GSI so expired items are hidden', false],
        ['Use a Scan so that TTL deletions are applied', false],
      ], 'TTL removal can lag by days, so correctness needs an explicit expiry check. Deleting at creation defeats the OTP, GSIs also hold expired items until deletion, and a Scan does not trigger TTL.'),
      mcq('Notes for a patient must be listed newest first. Which sort key works with a single Query?', [
        ['NOTE#<ISO-8601 UTC time>#<note id>, read with ScanIndexForward=False', true],
        ['NOTE#<note id>, with the creation time kept in another attribute', false],
        ['NOTE#<time as dd-mm-yyyy hh:mm>, read with ScanIndexForward=False', false],
      ], 'ISO-8601 UTC strings sort in time order, and the id keeps keys unique. Sorting by id gives no time order, and dd-mm-yyyy strings sort by day of the month first, so 02-11 lands before 30-10.'),
      mcq('Which item should never be served from a cache when deciding to approve a payment?', [
        ['The wallet balance', true],
        ['The bank list shown', false],
        ['The merchant\'s logo', false],
      ], 'Approving money on a stale balance can overdraw a wallet, so it is read from the database in the transaction. A bank list and a logo can safely be minutes or hours old.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_DATABASES_INTERVIEW_QUESTION',
    notes: `Asked in cloud engineer, DevOps and SRE interviews at product companies, GCCs and fintechs in Bengaluru and
Hyderabad. Say each answer aloud in about two minutes, then compare. Interviewers listen for whether you separate
availability from recovery, and whether you design from requirements rather than from features.

## Q1. "What is the difference between Multi-AZ and a read replica in RDS?"

**Model answer.** "They solve different problems. Multi-AZ is for availability: a synchronous standby in another
AZ, not readable, and RDS fails over to it automatically, keeping the same endpoint name — usually in a minute or
two, and the app must reconnect. A read replica is for read scaling: asynchronous, so it can lag; it has its own
endpoint; it can be in another region; and if the primary dies you promote it by hand. I would not send
read-after-write traffic to a replica. And neither is a backup: a bad DELETE replicates to both."

**Follow-up.** "How is Aurora different?" — "Storage is a shared cluster volume with six copies across three AZs.
Replicas read the same volume, so lag is usually milliseconds, and failover promotes a replica. You use the
cluster (writer) endpoint and the reader endpoint rather than instance names."

## Q2. "How would you design backup and DR for a payments database?"

**Model answer.** "I start by getting the RPO and RTO from the business — say five minutes and one hour. In region:
Multi-AZ for hardware failure, automated backups with PITR for logical errors, a manual snapshot before each
migration. Across regions: Hyderabad if we are in Mumbai, to keep data in India; a cross-region replica or Aurora
Global Database if the RPO is minutes, snapshot copies if hours are acceptable. Backups copied to a separate account
under a vault lock, so a compromised production admin cannot delete them. Encrypted, with KMS keys in each region.
And a quarterly restore drill that measures the real RPO and RTO — a restore creates a new instance, so the
runbook includes network settings and how the app is repointed."

**Follow-up.** "Someone ran UPDATE without WHERE ten minutes ago. What do you do?" — "Not a failover — the standby
has it too. PITR to just before, in UTC, into a new instance; then copy the correct values back for the affected
rows, because switching the app over would lose the payments made since."

## Q3. "Design a DynamoDB table for an order-tracking feature."

**Model answer.** "First I write down the access patterns, with the product team: orders for a customer newest
first; one order by id; orders for a restaurant today; open orders only. Then keys: PK CUSTOMER#id, SK
ORDER#ISO-time#id for the first. A GSI with the order id as partition key for lookup by id. A GSI keyed on
restaurant and date for the third — sharded if one chain is huge, because a partition takes about 1,000 writes a
second. A sparse GSI on an attribute present only while an order is open. On-demand capacity to start, since
traffic is spiky; TTL to expire old tracking events; streams to push status changes to notifications. If they want
ad-hoc analytics, that goes to a warehouse, not to Scans."

**Follow-up.** "Why not just Scan with a filter?" — "A Scan reads, and bills, the whole table; the filter runs after
the read. Fine for a one-off job, never on a request path."

## Q4. "How do you keep a cache consistent with the database?"

**Model answer.** "Mostly cache-aside: read from the cache, on a miss read the DB and set with a TTL; on a write,
update the DB then delete the key. That still has a race — a slow reader can put an old value back after the
delete — so every key has a TTL, which bounds how long anything wrong can live. The TTL comes from the business:
how stale may this be? Some data is never cached, like a balance used to approve a payment. I watch the hit ratio
and evictions, add jitter against stampedes, and make sure the app survives the cache being down."

**Follow-up.** "Write-through instead?" — "Fewer misses, but the cache holds data nobody reads and two writes can
disagree on failure. Write-behind I would not use for money."`,
    mcqs: [
      mcq('Asked "Multi-AZ or read replica?", which answer would an interviewer rate highest?', [
        ['They differ: Multi-AZ for failover, replicas to scale reads; neither is a backup', true],
        ['Multi-AZ, because its standby can serve read traffic as well as fail over', false],
        ['A read replica, because it fails over by itself and has no replication lag', false],
        ['Either one, since both keep a synchronous copy in another Availability Zone', false],
      ], 'The strong answer separates availability from read scaling and notes that replication is not backup. The Multi-AZ instance standby is not readable, replicas need manual promotion and can lag, and only Multi-AZ is synchronous.'),
      mcq('In a DR answer, a candidate says "we have Multi-AZ, so we can recover from the bad UPDATE". What is the flaw?', [
        ['The standby received the UPDATE as well; recovery needs PITR', true],
        ['Multi-AZ failover takes days, so it cannot meet a one-hour RTO', false],
        ['Multi-AZ only exists for Aurora clusters, not for RDS PostgreSQL', false],
        ['The UPDATE is undone automatically by RDS after an hour has passed', false],
      ], 'Synchronous replication copies the bad statement immediately, so only a backup reaches a point before it. Failover takes minutes, Multi-AZ exists for RDS engines, and RDS never undoes statements on its own.'),
      mcq('Designing a DynamoDB table in an interview, what should a candidate do first?', [
        ['List the access patterns with the product team before choosing keys', true],
        ['Normalise the entities into tables as they would for PostgreSQL first', false],
        ['Pick provisioned capacity, then design keys to fit the chosen units', false],
      ], 'DynamoDB keys are chosen to make each known query a cheap Query, so patterns come first. Normalising first produces joins DynamoDB cannot do, and capacity is sized from patterns, not the other way round.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_DATABASES_CHECKPOINT',
    notes: `Ten questions across the topic: RDS and Aurora, backups and disaster recovery, DynamoDB modelling and capacity,
and caching with ElastiCache. Answer without notes; the result shows which lesson to revisit.`,
    checkpoint: [
      mcq('Rupayo\'s RDS instance must be encrypted at rest, but it was created unencrypted. What is the supported path?', [
        ['Copy a snapshot with encryption on, then restore it as a new instance', true],
        ['Tick "encrypt storage" on the running instance and reboot it once', false],
        ['Enable encryption on the read replica and then promote it later on', false],
        ['Turn on Multi-AZ, which encrypts the standby and then the primary', false],
      ], 'Encryption at rest is chosen at creation; the documented route is an encrypted snapshot copy restored to a new instance. It cannot be switched on in place, a replica of an unencrypted primary is unencrypted, and Multi-AZ does not change encryption.'),
      mcq('Which parameter change takes effect only after an RDS instance reboots?', [
        ['A static parameter such as max_connections', true],
        ['A dynamic one such as log_min_duration_statement', false],
        ['Any parameter set through boto3 rather than the console', false],
        ['Any parameter in the default parameter group of the engine', false],
      ], 'Static parameters wait for a reboot (pending-reboot); dynamic ones apply immediately. The tool used does not matter, and the default parameter group cannot be edited at all.'),
      mcq('An Aurora cluster has one writer and two replicas. Where should the reporting tool connect?', [
        ['The cluster\'s reader endpoint, which spreads reads over replicas', true],
        ['The cluster endpoint, which always routes to the writer instance', false],
        ['Directly to the writer instance\'s own endpoint by its instance name', false],
        ['The S3 bucket where Aurora writes the cluster volume\'s pages', false],
      ], 'The reader endpoint balances connections across replicas and keeps reports off the writer. The cluster endpoint is the writer, instance names break on failover, and the cluster volume is not an S3 bucket you query.'),
      mcq('A team says its ledger has an RPO of five minutes. What does that commit it to?', [
        ['Losing at most the last five minutes of data after a disaster', true],
        ['Being back online within five minutes of any disaster occurring', false],
        ['Taking a full manual snapshot of the database every five minutes', false],
        ['Keeping automated backups for five days before they are deleted', false],
      ], 'RPO is the maximum data loss measured in time. Time to be back online is the RTO, PITR meets a five-minute RPO without a snapshot every five minutes, and retention is a separate setting.'),
      mcq('The quarterly drill restores ledger-prod in 40 minutes and the newest row is four minutes old. What has the drill established?', [
        ['A measured RTO and RPO to compare with the targets of one hour and five minutes', true],
        ['That backups work, so further drills can stop until the next major version', false],
        ['That Multi-AZ is not needed, because a restore takes less than an hour', false],
        ['The exact restore time for any future size of the ledger database', false],
      ], 'A drill turns targets into measured numbers. Restore time grows with data and changes with configuration, so drills continue; restore and Multi-AZ solve different failures; and one timing does not predict a much larger database.'),
      ck('DB_FUNDAMENTALS', 'A DynamoDB Query must include which condition?', [
        ['Equality on the partition key of the table or index', true],
        ['A begins_with condition on the sort key of the table', false],
        ['A FilterExpression on at least one non-key attribute', false],
      ], 'Every Query targets exactly one partition key value. Sort key conditions and filters are optional extras that narrow the result.'),
      ck('DB_FUNDAMENTALS', 'Which statement about a DynamoDB global secondary index is correct?', [
        ['It can be added later and supports only eventually consistent reads', true],
        ['It must be defined at table creation and supports strong reads', false],
        ['It shares the table\'s partition key and only changes the sort key', false],
        ['It stores every attribute, whatever projection type is chosen', false],
      ], 'GSIs can be created any time and are updated asynchronously, so reads are eventually consistent. Creation-time-only with strong reads and the same partition key describe an LSI, and a GSI stores only the projected attributes.'),
      ck('DB_FUNDAMENTALS', 'How many WCUs do 200 writes per second of 2.5 KB items need outside transactions?', [
        ['600, since each 2.5 KB write rounds up to three 1 KB units', true],
        ['500, since 2.5 KB per write is used exactly with no rounding', false],
        ['200, since a write costs one unit regardless of the item size', false],
        ['1,200, since writes are always charged at double the read rate', false],
      ], 'Writes are billed per 1 KB, rounded up per item: 2.5 KB is three units, times 200 is 600. Sizes are rounded, size matters for writes, and doubling applies to transactional writes, not ordinary ones.'),
      mcq('A cache-aside cache shows a stale merchant fee for minutes after updates. What is the standard fix?', [
        ['Delete the key after the database write, and keep a TTL as a bound', true],
        ['Serve all reads from a Redis replica instead of the primary node', false],
        ['Raise the TTL so the cache is refreshed less often than before', false],
        ['Write the fee to the cache first and flush to the database later', false],
      ], 'Invalidate on write, with a TTL to bound races. Replicas are no fresher, a longer TTL lengthens staleness, and write-behind risks losing money data if the cache node fails.'),
      mcq('Which statement about ElastiCache is correct?', [
        ['It runs inside your VPC and is reached through security groups', true],
        ['It gets a public endpoint by default so mobile apps can call it', false],
        ['Memcached clusters replicate every key to a standby in another AZ', false],
        ['Keys without a TTL are rejected by Valkey and Redis OSS engines', false],
      ], 'ElastiCache lives in your VPC subnets with no public endpoint; access is controlled with security groups. Memcached has no replication, and keys without TTLs are allowed, which is exactly why teams must add them.'),
    ],
  },
];
