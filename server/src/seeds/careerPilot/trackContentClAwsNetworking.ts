/**
 * Career-track content: AWS Networking (CL_AWS_NETWORKING), Cloud & DevOps Engineer, batch CL1.
 *
 * How an engineer designs and runs a network on AWS: VPC address plans, route tables and gateways, security
 * groups and NACLs, private connectivity (endpoints, peering, Transit Gateway, VPN), Route 53 and load
 * balancers with CloudFront. It builds on Year 1's "IP Addresses" and "DNS" (T_NETWORKING), Year 3's
 * "Networking in a Cloud" (T3_CLOUD_INFRA) and the analyst's view in CY_CLOUD_SECURITY; those are referred to
 * by title, not re-taught. Azure equivalents are named in a line; Azure networking proper is CL_AZURE.
 *
 * One fictional company runs through the lessons: Pragati Pay, a Hyderabad UPI payments start-up running in
 * AWS Mumbai (ap-south-1) with disaster recovery in Hyderabad (ap-south-2). The mini project is TicketKatta, a
 * Pune ticket-booking start-up. Every CIDR figure was computed with Python's ipaddress module; every boto3
 * output was produced by boto3 1.43 against moto 5.2 (mock AWS), and the notes say where moto is more lenient
 * than real AWS. AWS CLI commands were written from the documentation and NOT run (no AWS account was used);
 * the Terraform snippet was parsed with python-hcl2 but not applied. IDs, account numbers (123456789012) and
 * domains (*.example) are fake. Prices are never quoted: students read the pricing pages.
 *
 * Skill: CLOUD_NETWORKING (the topic's only skill), so checkpoint questions need no skillKey.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_CL_AWS_NETWORKING_BUNDLES: PilotBundle[] = [
  /* ── VPC_DESIGN ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_NETWORKING_VPC_DESIGN',
    notes: `Pragati Pay, a UPI payments start-up in Hyderabad, is moving its services to AWS Mumbai (ap-south-1). The
first decision is also the hardest one to undo: **which IP addresses the network will use**. Instances,
databases and load balancers can be replaced in an afternoon. An address range that clashes with the
office, a partner bank or the next VPC can only be fixed by building a new network and moving everything.

You met CIDR notation in Year 1's "IP Addresses" and public versus private subnets in Year 3's "Networking
in a Cloud". This lesson turns them into an address plan you would defend in a design review.

## What a VPC is, precisely

- A **VPC** (Virtual Private Cloud) is a private network in **one region**. It spans every Availability
  Zone of that region.
- A **subnet** is a slice of the VPC's range that lives in **exactly one AZ**. High availability therefore
  means "the same tier in at least two subnets in two AZs", never "one big subnet".
- The VPC's primary IPv4 block can be anything from **/16 (65,536 addresses) to /28 (16)**. You can add
  secondary IPv4 blocks later, and an Amazon-provided IPv6 /56 (subnets are then /64).
- Every subnet loses **five addresses** to AWS: the network address, .1 (the VPC router), .2 (the DNS
  resolver), .3 (reserved for future use) and the last address.

The reservation, computed for 10.20.48.0/24 with ipaddress:

    10.20.48.0    network address
    10.20.48.1    VPC router
    10.20.48.2    DNS (VPC base +2)
    10.20.48.3    reserved for future use
    10.20.48.255  broadcast (not supported, reserved)

And what each size leaves you (total minus five):

    /16: 65536 addresses, 65531 usable in AWS
    /20:  4096 addresses,  4091 usable in AWS
    /22:  1024 addresses,  1019 usable in AWS
    /24:   256 addresses,   251 usable in AWS
    /26:    64 addresses,    59 usable in AWS
    /28:    16 addresses,    11 usable in AWS

## Choose a range that will never clash

Use the private (RFC 1918) ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16. Two networks can only be
joined by peering, Transit Gateway or VPN if their ranges **do not overlap**, so the range has to avoid
everything this VPC may ever talk to:

- **the office and home networks** of people who will use the VPN (192.168.0.0/24 and 192.168.1.0/24 are
  on every home router);
- **every other VPC** — prod, staging, dev, the data team's, the next acquisition's;
- **partners** at the far end of a site-to-site VPN (banks and payment networks have their own plans);
- **172.17.0.0/16**, Docker's default bridge on any laptop or build agent, and **172.31.0.0/16**, which is
  every account's default VPC.

The habit that prevents most clashes: give each environment and region its own /16 from 10.0.0.0/8 and
write it down in one table — prod-mumbai 10.20.0.0/16, prod-hyderabad 10.21.0.0/16, staging 10.30.0.0/16,
dev 10.40.0.0/16. Larger companies keep that table in **Amazon VPC IPAM**, which hands out blocks and
refuses overlaps. Checking Pragati's choice against what it knows about (real ipaddress output):

    office LAN             192.168.1.0/24   overlaps=False
    default VPC            172.31.0.0/16    overlaps=False
    staging VPC (copied)   10.20.0.0/16     overlaps=True
    Docker bridge          172.17.0.0/16    overlaps=False
    partner bank VPN       10.20.128.0/18   overlaps=True

Two clashes. The staging VPC was created by copying the prod template unchanged — the commonest cause.

## Lay out tiers across zones

A standard layout is three tiers in each of two or three AZs:

- **public** — only things that must accept internet traffic: load balancers, NAT gateways. Small.
- **app** — containers, instances, Lambda functions attached to the VPC. **Large**: EKS gives every pod a
  VPC address by default, and scaling out on a sale day must not fail for lack of IPs.
- **data** — RDS, ElastiCache. Small, and never reachable from the internet.

Pragati's plan for 10.20.0.0/16, three AZs (Mumbai and Hyderabad each have three), computed with
ipaddress:

    name       cidr             first usable   last usable    usable
    app-a      10.20.0.0/20     10.20.0.4      10.20.15.254   4091
    app-b      10.20.16.0/20    10.20.16.4     10.20.31.254   4091
    app-c      10.20.32.0/20    10.20.32.4     10.20.47.254   4091
    public-a   10.20.48.0/24    10.20.48.4     10.20.48.254   251
    public-b   10.20.49.0/24    10.20.49.4     10.20.49.254   251
    public-c   10.20.50.0/24    10.20.50.4     10.20.50.254   251
    data-a     10.20.52.0/24    10.20.52.4     10.20.52.254   251
    data-b     10.20.53.0/24    10.20.53.4     10.20.53.254   251
    data-c     10.20.54.0/24    10.20.54.4     10.20.54.254   251
    allocated 13824 of 65536 (21.1%)
    free blocks: ['10.20.51.0/24', '10.20.55.0/24', '10.20.56.0/21', '10.20.64.0/18', '10.20.128.0/17']

Only a fifth is allocated. That is deliberate: the free /18 and /17 are room for a new tier or a second
cluster, and **a subnet cannot be resized** once created — you can only add more.

Two traps. A CIDR must start on its own boundary: ipaddress refuses 10.20.40.0/20 ("has host bits set")
because /20 blocks start at multiples of 16 in the third octet, and so does AWS. And AZ **names** are
shuffled per account (your ap-south-1a may be another account's ap-south-1b); when two accounts must
agree on a zone, use the AZ **ID** (aps1-az1 and so on).

## Building it, and what AWS refuses

The same plan in boto3, run against moto (mock AWS):

    ec2 = boto3.client("ec2", region_name="ap-south-1")
    vid = ec2.create_vpc(CidrBlock="10.20.0.0/16")["Vpc"]["VpcId"]
    ec2.create_subnet(VpcId=vid, CidrBlock="10.20.48.0/24", AvailabilityZone="ap-south-1a")

AWS refuses mistakes at creation time, and the errors are worth recognising (moto output):

    InvalidSubnet.Conflict  The CIDR '10.20.48.128/25' conflicts with another subnet
    InvalidSubnet.Range     The CIDR '10.21.0.0/24' is invalid.      (outside the VPC)
    InvalidVpc.Range        The CIDR '10.0.0.0/8' is invalid.        (larger than /16)

In Terraform (CL2 teaches it properly) the plan becomes arithmetic with cidrsubnet(prefix, newbits, netnum),
which gives the same blocks — checked here with ipaddress; parsed with python-hcl2, not applied:

    locals {
      vpc_cidr = "10.20.0.0/16"
      azs      = ["ap-south-1a", "ap-south-1b"]
      app      = [for i, az in local.azs : cidrsubnet(local.vpc_cidr, 4, i)]       # 10.20.0.0/20, 10.20.16.0/20
      public   = [for i, az in local.azs : cidrsubnet(local.vpc_cidr, 8, 48 + i)]  # 10.20.48.0/24, 10.20.49.0/24
      data     = [for i, az in local.azs : cidrsubnet(local.vpc_cidr, 8, 52 + i)]  # 10.20.52.0/24, 10.20.53.0/24
    }

## The default VPC

Every account has one per region. In moto, as in AWS, it is 172.31.0.0/16 with a /20 in every AZ:

    ap-south-1a 172.31.0.0/20  MapPublicIpOnLaunch True
    ap-south-1b 172.31.16.0/20 MapPublicIpOnLaunch True
    ap-south-1c 172.31.32.0/20 MapPublicIpOnLaunch True

Every subnet is public and hands out public IPs. It is fine for a ten-minute experiment and wrong for
anything real: no private tier, and the same range in every account, so it can never be peered with
another account's default VPC.

Azure's equivalent is the **virtual network** (VNet). One difference to remember: Azure subnets are
regional, not zonal, so zone spread is a property of the resources, not of the subnet.`,
    workedExample: `**Scenario.** Pragati Pay's platform lead asks you for "the network plan" before anything is built. Known
facts: prod in Mumbai, a warm standby in Hyderabad, one staging and one dev environment, an office VPN, and
a site-to-site VPN to Kaveri Bank (fictional), whose side uses 10.20.128.0/18.

**1. Allocate per environment first, subnets second.** prod-mumbai 10.20.0.0/16, prod-hyderabad
10.21.0.0/16, staging 10.30.0.0/16, dev 10.40.0.0/16. The two prod blocks are adjacent on purpose: ipaddress
collapses them to 10.20.0.0/15, so a router at the bank or the office can carry one route for "all of
Pragati prod".

**2. Run the clash check against every known range.** It flags Kaveri Bank: 10.20.128.0/18 sits inside
prod-mumbai. You cannot change the bank's network. Options: move Pragati prod to another /16, or carve
prod so the bank's /18 is never used and ask the bank to route only the Pragati subnets. The first is
cleaner and costs nothing now because nothing is built — this is exactly why the plan comes first. New
choice: prod-mumbai 10.50.0.0/16, prod-hyderabad 10.51.0.0/16. Re-run the check: no overlaps.

**3. Size the tiers for the busiest day, not today.** The payments API runs on EKS. On a festival sale
day, traffic can be several times normal; at one VPC IP per pod plus nodes, a /24 (251 addresses) per AZ
would run dry. App subnets get /20 (4,091 each); public and data get /24.

**4. Leave space.** Three AZs times three tiers uses about a fifth of the /16. Write the free blocks into
the plan so the next team takes from them instead of guessing.

**5. Record it.** One table in the repo (environment, region, CIDR, owner), the subnet table, and the
rule "new VPCs take a block from this table; never copy a VPC module with its CIDR". The staging clash
found earlier came from exactly that copy.`,
    mcqs: [
      mcq('Pragati\'s EKS cluster gives every pod a VPC address. A teammate proposes /24 app subnets "because 251 addresses is plenty". What is the strongest objection?', [
        ['Pods use VPC addresses, so scaling on a sale day can run a /24 out of IPs', true],
        ['A /24 cannot be placed in an AZ that also contains a /20 public subnet', false],
        ['EKS refuses to schedule pods into any subnet smaller than a /16 address block', false],
        ['AWS reserves half of every /24 for the VPC router and DNS resolver', false],
      ], 'With pod-per-IP networking, node and pod counts draw on the subnet, and a /24 leaves only 251 usable addresses per AZ. Subnet sizes in one AZ can differ freely, EKS has no /16 minimum, and AWS reserves five addresses per subnet, not half of it.'),
      mcq('A new staging VPC was created from the prod module with its CIDR unchanged, and the two VPCs now need to be peered. What happens?', [
        ['Peering is not possible because the two address ranges overlap', true],
        ['Peering works, and AWS renumbers the staging subnets automatically', false],
        ['Peering works, but only for traffic that stays inside a single AZ', false],
        ['Peering works once both VPCs enable DNS hostnames on their subnets', false],
      ], 'Routing needs every destination to be unambiguous, so VPCs with overlapping CIDRs cannot be peered (or routed through Transit Gateway). AWS never renumbers subnets, AZ placement is irrelevant, and DNS settings do not resolve an address overlap.'),
      mcq('Why is the default VPC (172.31.0.0/16) a poor choice for Pragati\'s production payments API?', [
        ['All its subnets are public, and every account uses the same range', true],
        ['It cannot be used with load balancers or with RDS databases at all', false],
        ['It is deleted automatically after the Free Tier period has ended', false],
        ['It exists only in us-east-1, so it adds latency for users in India', false],
      ], 'Default subnets have a route to the internet gateway and assign public IPs, and the identical 172.31.0.0/16 in every account blocks peering with other default VPCs. It supports ALBs and RDS, is not deleted after the Free Tier, and exists in every region.'),
    ],
    checkpoint: [
      mcq('An engineer tries to create subnet 10.20.40.0/20 in VPC 10.20.0.0/16 and the request is rejected. Why?', [
        ['A /20 must start on a multiple of 16 in the third octet; 40 is not one', true],
        ['A /20 holds more addresses than AWS allows for any single subnet in a VPC', false],
        ['Subnets in a /16 VPC must all be /24, the size AWS expects there', false],
        ['10.20.40.0 is reserved by AWS as the address of the VPC router', false],
      ], 'A /20 spans 16 values of the third octet, so valid starts are 0, 16, 32, 48 and so on; 10.20.40.0/20 has host bits set (ipaddress says so, and AWS refuses it). /20 subnets are allowed, sizes can be mixed, and the router is the .1 of each subnet.'),
      mcq('How many addresses can Pragati actually assign to resources in a /26 subnet?', [
        ['59', true],
        ['62', false],
        ['64', false],
      ], 'A /26 has 64 addresses and AWS reserves five in every subnet (network, router, DNS, one future-use and the last). 62 is the traditional "minus network and broadcast" answer, which is wrong for AWS; 64 ignores reservations entirely.'),
      mcq('Two Pragati accounts must place their brokers in "the same AZ" to avoid cross-AZ traffic. Why should they compare AZ IDs rather than AZ names?', [
        ['AZ names map to different physical zones in different accounts', true],
        ['AZ IDs are shorter and so fit in the subnet tags more easily', false],
        ['AZ names change every time the region adds a new data centre building', false],
        ['AZ IDs are needed only when the subnets are using IPv6 blocks', false],
      ], 'AWS maps names such as ap-south-1a to physical zones independently per account, while AZ IDs (aps1-az1) are the same everywhere. Tag length is irrelevant, names do not change when capacity is added, and the mapping issue applies to IPv4 and IPv6 alike.'),
    ],
  },
  /* ── ROUTING_GATEWAYS ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_NETWORKING_ROUTING_GATEWAYS',
    notes: `A subnet is not public or private because of its name, its size or a checkbox. It is public because of
**one route** in the route table it uses. This lesson is about route tables and the gateways they point
at, and about the one AWS line item that surprises almost every new team: NAT.

## Route tables

- Every subnet is associated with **exactly one** route table. A subnet with no explicit association uses
  the VPC's **main route table** — silently.
- Every route table has a **local** route for the VPC's CIDR (10.20.0.0/16 -> local). It cannot be removed,
  which is why everything in a VPC can route to everything else; security groups decide what is allowed.
- When several routes match, the **most specific (longest prefix) wins**: a packet for 10.20.52.9 matches
  both 0.0.0.0/0 and 10.20.0.0/16 and goes local.

Pragati's VPC after routing, as moto reports it (route table IDs shortened):

    rtb-75 ['main']
          10.20.0.0/16 -> local
    rtb-82 ['public-a', 'public-b']
          10.20.0.0/16 -> local
          0.0.0.0/0 -> igw
    rtb-38 ['app-a', 'app-b']
          10.20.0.0/16 -> local
          0.0.0.0/0 -> nat
          pl-60357dccbcd6de912 -> vpce
    rtb-57 ['data-a', 'data-b']
          10.20.0.0/16 -> local
          pl-60357dccbcd6de912 -> vpce

Four tables, four behaviours. The pl- entry is the S3 **prefix list** that a gateway endpoint adds (the
endpoints lesson comes next but one); the main table is left with only the local route on purpose.

## Internet gateway: what makes a subnet public

An **internet gateway** (IGW) is attached to one VPC. A subnet is public when its route table sends
0.0.0.0/0 (and ::/0 for IPv6) to the IGW. An instance there also needs a **public IPv4 address** (or an
Elastic IP); the IGW translates between it and the private address. Without the public IP, an instance
in a "public" subnet still cannot be reached. AWS charges for public IPv4 addresses, so do not hand them
out by default — check the VPC pricing page for the current model.

A small checker that answers "public or private?" the way AWS decides it, including the fallback to the
main table:

    def is_public(ec2, subnet_id, vpc_id):
        rts = ec2.describe_route_tables(Filters=[
            {"Name": "association.subnet-id", "Values": [subnet_id]}])["RouteTables"]
        how = "explicit"
        if not rts:   # no association: the main route table applies
            rts = ec2.describe_route_tables(Filters=[
                {"Name": "vpc-id", "Values": [vpc_id]},
                {"Name": "association.main", "Values": ["true"]}])["RouteTables"]
            how = "main (implicit)"
        default = [r for r in rts[0]["Routes"] if r.get("DestinationCidrBlock") == "0.0.0.0/0"]
        target = (default[0].get("GatewayId") or default[0].get("NatGatewayId")) if default else "none"
        return how, target, target.startswith("igw-")

Its output over Pragati's subnets (moto):

    public-a  via explicit        0.0.0.0/0 -> igw   PUBLIC
    app-a     via explicit        0.0.0.0/0 -> nat   private
    data-a    via explicit        0.0.0.0/0 -> none  private

## The main-route-table trap

Someone "fixes" internet access by adding 0.0.0.0/0 -> igw to the **main** route table. Months later a
new subnet is created for a database and nobody associates it with anything. The checker on that new
subnet:

    after someone adds igw to MAIN table, new unassociated subnet data-new:
    ('main (implicit)', 'igw-327b93081cf754620', True)

A database subnet that is public by accident. The rule: **keep the main route table private** (local
only) and associate every subnet explicitly — in Terraform, every subnet gets an aws_route_table_association.

## NAT gateways: out, never in

Private app servers still need to go *out*: OS updates, a payment partner's API, a container registry. A
**NAT gateway** sits in a public subnet with an Elastic IP; the private subnets' route table sends
0.0.0.0/0 to it. Connections can start from inside; nothing on the internet can start one inward.

Points that decide the design:

- **A NAT gateway lives in one AZ.** One shared NAT is a single point of failure for every private subnet
  and adds cross-AZ data charges. Production runs **one NAT per AZ**, each private subnet routing to the
  NAT in its own AZ; dev can share one to save money.
- **It is billed by the hour and per GB processed** (plus normal data transfer). Look up the current
  figures on the VPC pricing page; the pattern is what matters: every byte your private servers pull from
  the internet — or from S3 and ECR, if you have no endpoints — passes through that meter.
- **Data subnets get no default route at all.** A database that cannot reach the internet cannot leak to it.

The commands (from the documentation, not run):

    aws ec2 allocate-address --domain vpc
    aws ec2 create-nat-gateway --subnet-id subnet-0pub0a --allocation-id eipalloc-0abc1234
    aws ec2 create-route --route-table-id rtb-0app0a --destination-cidr-block 0.0.0.0/0 \\
        --nat-gateway-id nat-0abc1234

## IPv6 and the egress-only gateway

IPv6 addresses in a VPC are globally unique, so there is no NAT. To let private IPv6 workloads go out but
never be reached, route ::/0 to an **egress-only internet gateway** — the IPv6 counterpart of NAT's "out,
never in". Route ::/0 to the normal IGW only in public subnets. Forgetting IPv6 is how a "private" subnet
ends up reachable: a ::/0 -> igw route in an app table makes those instances public over IPv6.

## Reading a route problem

When something cannot connect, read the path hop by hop: which route table does the **source** subnet use,
which route matches the destination (longest prefix), and does the reply have a route back? The VPC
**Reachability Analyzer** does this analysis between two resources and names the blocking component.

Azure equivalents: system routes plus user-defined routes (route tables) per subnet, and Azure NAT Gateway
for outbound traffic.`,
    workedExample: `**Scenario.** Pragati's first month on AWS: the bill shows NAT gateway charges larger than all the EC2
instances together. The CFO asks the platform team why "a router" costs more than the servers.

**1. Find what flows through NAT.** CloudWatch publishes BytesOutToDestination and BytesInFromDestination
per NAT gateway; VPC Flow Logs on the NAT's network interface show the destinations. Grouping by
destination shows most bytes going to Amazon S3 address ranges (statement PDFs and backups) and to ECR
(container images pulled on every deploy and every scale-out).

**2. Route AWS traffic around NAT.** Add an S3 **gateway endpoint** to the app and data route tables — it
has no hourly or per-GB charge, and the route table gains a prefix-list route, as in the moto output above.
ECR needs interface endpoints for its API and Docker registry, and image layers come from S3, so the S3
gateway endpoint covers those bytes too. Interface endpoints are billed per hour and per GB, so compare
their cost with the NAT bytes they remove, using the pricing calculator.

**3. Check resilience while you are there.** Both private route tables point at one NAT in ap-south-1a.
If that AZ has trouble, app-b loses all outbound access although its own AZ is healthy, and every byte
from app-b already pays cross-AZ transfer. Add a NAT in public-b and give app-b its own route table
pointing at it.

**4. Verify.** Re-run the checker (private subnets still route 0.0.0.0/0 to a NAT, now in their own AZ),
watch the NAT byte metrics fall over the next deploys, and confirm in Cost Explorer a week later.

**5. Write it down.** "Every VPC gets S3 (and DynamoDB, if used) gateway endpoints on day one; NAT per
AZ in prod." That line in the network standard prevents the next surprise.`,
    mcqs: [
      mcq('A Pragati engineer moves an instance into public-a, but it still cannot be reached from the internet on 443, although the security group allows it. The subnet\'s table routes 0.0.0.0/0 to the IGW. What is the likeliest gap?', [
        ['The instance has no public IPv4 address or Elastic IP', true],
        ['The IGW needs a NAT gateway in the same subnet to work', false],
        ['Public subnets only work after the main table is edited', false],
        ['The local route sends the replies back into the VPC instead', false],
      ], 'The IGW maps a public address to the private one; with no public IP or Elastic IP there is nothing to reach. NAT is for outbound from private subnets, editing the main table is not required (and is a trap), and the local route only covers the VPC range, not internet replies.'),
      mcq('App servers in app-a and app-b both route 0.0.0.0/0 to one NAT gateway in ap-south-1a. What is the risk?', [
        ['A problem in ap-south-1a cuts outbound access for app-b as well', true],
        ['NAT gateways refuse traffic arriving from subnets in a different AZ', false],
        ['The NAT gateway turns app-b into a public subnet over IPv4', false],
        ['Route tables cannot point two subnets at the same NAT gateway', false],
      ], 'A NAT gateway is zonal, so a shared one makes ap-south-1a a dependency of app-b (and adds cross-AZ charges). Cross-AZ traffic is accepted, NAT never makes a subnet public, and many subnets may share a route table or a target.'),
      mcq('A private subnet\'s route table has 10.20.0.0/16 -> local and 0.0.0.0/0 -> nat. Where does a packet to 10.20.52.9 go?', [
        ['To local, because the more specific /16 route wins', true],
        ['To the NAT, because 0.0.0.0/0 matches every address', false],
        ['To whichever route was added to the table most recently', false],
        ['It is dropped, because two routes match the same address', false],
      ], 'Route tables use longest-prefix match: 10.20.0.0/16 is more specific than 0.0.0.0/0, so the packet stays in the VPC. A default route only catches what nothing more specific matches, order of creation does not matter, and overlapping matches are normal.'),
    ],
    checkpoint: [
      mcq('A new data-new subnet was created but never associated with a route table. Someone earlier added 0.0.0.0/0 -> igw to the main route table. What is data-new?', [
        ['Public, because it falls back to the main route table', true],
        ['Private, because a subnet with no association has no routes', false],
        ['Isolated, because AWS blocks unassociated subnets entirely', false],
        ['Private, because only subnets named "public" use the IGW', false],
      ], 'A subnet without an explicit association uses the main route table, which here routes to the internet gateway, so the subnet is public. Unassociated subnets are not routeless or blocked, and names have no effect on routing.'),
      mcq('Pragati\'s private app servers must reach a partner API on the internet, and nothing on the internet may open a connection to them. Which setup is right for IPv4?', [
        ['A NAT gateway in a public subnet, routed from the private table', true],
        ['An internet gateway route in the private subnet\'s own route table', false],
        ['An egress-only internet gateway routed from the private table', false],
        ['A gateway endpoint for the partner API inside the private subnet', false],
      ], 'NAT lets connections start from inside only. An IGW route makes the subnet public, the egress-only gateway handles IPv6 traffic only, and gateway endpoints exist only for S3 and DynamoDB, not third-party APIs.'),
      mcq('Pragati adds IPv6 to its VPC. The app subnets must reach the internet over IPv6 but never be reachable from it. What should their table route ::/0 to?', [
        ['An egress-only internet gateway', true],
        ['A NAT gateway with an Elastic IP', false],
        ['The internet gateway of the VPC', false],
        ['The local route of the IPv6 block', false],
      ], 'IPv6 has no NAT in a VPC; the egress-only internet gateway allows outbound connections and their replies only. A NAT gateway translates IPv4, routing ::/0 to the IGW makes the subnet publicly reachable over IPv6, and the local route covers only the VPC.'),
    ],
  },
  /* ── SG_NACL ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_NETWORKING_SG_NACL',
    notes: `Routes decide where a packet *can* go. Two filters decide whether it is *allowed*: **security groups** on
each network interface and **network ACLs** on each subnet. Year 3's "Networking in a Cloud" gave you the
rule of thumb (narrowest rule that works, reference groups not addresses); this lesson is the exact
behaviour, because "connection timed out" is the symptom of a dozen different mistakes and you will be the
one asked to find which.

## Security groups

- Attached to an **elastic network interface** — an instance, a load balancer node, an RDS instance, a
  Lambda function in a VPC, an interface endpoint. One interface can carry several groups; their rules add up.
- **Allow rules only.** There is no deny. Anything no rule allows is dropped.
- **Stateful.** If a connection is allowed in, its replies go out automatically, whatever the outbound
  rules say (and the same in reverse).
- A **new** group has no inbound rules and one outbound rule allowing everything. The VPC's **default**
  group also allows all inbound traffic from other members of itself — a reason not to use it.
- A rule's source can be a CIDR, a **prefix list**, or **another security group**: "allow 5432 from every
  interface that carries pragati-app", whatever its IP is today.

Pragati's three tiers, built in moto and read back with describe_security_groups:

    pragati-alb
         in  tcp 443-443 from ['0.0.0.0/0', '::/0']
         out -1 to ['0.0.0.0/0']
    pragati-app
         in  tcp 8080-8080 from ['sg:pragati-alb']
         out -1 to ['0.0.0.0/0']
    pragati-db
         in  tcp 5432-5432 from ['sg:pragati-app']
         out -1 to ['0.0.0.0/0']

The chain is the design: only the load balancer is open to the internet, only on 443; the app accepts
only the load balancer; the database accepts only the app. Scaling from 2 to 40 app instances changes no
rule. The boto3 call for the database rule:

    ec2.authorize_security_group_ingress(GroupId=db_sg, IpPermissions=[{
        "IpProtocol": "tcp", "FromPort": 5432, "ToPort": 5432,
        "UserIdGroupPairs": [{"GroupId": app_sg, "Description": "from app"}]}])

**Least-open habits:** no 0.0.0.0/0 or ::/0 except on the public load balancer's 80/443; no SSH or RDP
rules at all — use Systems Manager Session Manager; a description on every rule; office ranges kept in a
managed prefix list so they change in one place; and on the data tier, tighten **egress** too (a database
has no reason to open connections to the internet).

## Network ACLs

- Attached to a **subnet**; each subnet has exactly one (the default NACL unless you associate another).
- **Numbered rules, lowest first, first match wins**, with both **allow and deny**. A final * rule denies
  whatever nothing matched.
- **Stateless.** Replies are new packets as far as the NACL is concerned, so you must allow them in the
  other direction — to the client's **ephemeral port**. AWS recommends allowing 1024-65535 for replies,
  because clients pick their source port from a wide range (Linux 32768-60999, others lower).

The default NACL, as moto reports it, allows everything both ways:

    in    100  -1 0.0.0.0/0    allow
    in  32767  -1 0.0.0.0/0    deny
    out   100  -1 0.0.0.0/0    allow
    out 32767  -1 0.0.0.0/0    deny

(32767 is the * rule in the API.) A **custom** NACL starts with nothing but the * deny — associate it with
a live subnet before writing its rules and that subnet goes dark. Pragati's data-subnet NACL:

    in    100   6 10.20.0.0/19  5432-5432 allow
    in    200   6 10.20.0.0/16  1024-65535 allow
    out   100   6 10.20.0.0/19  1024-65535 allow
    out   200   6 0.0.0.0/0     443-443 allow

10.20.0.0/19 covers app-a and app-b (10.20.0.0 to 10.20.31.255) — and, as the worked example shows, not
app-c. Use NACLs as a coarse second layer (deny a known-bad range, fence the data subnets off from the
public ones); do the precise work in security groups. Every NACL rule you add is a rule someone will
forget during the next incident.

## Reading why a connection fails

A small simulator applies the rules in AWS order — NACL inbound on the destination subnet, the destination's
security groups, then NACL outbound for the reply (stateless) — over Pragati's rules. Real output, trimmed
to fit:

    app-a -> db              ALLOWED   NACL in #100 allow | SG: sg-db allows 5432 from sg-app | NACL out #100 allow
    batch (app-c) -> db      BLOCKED   NACL in #200 allow | SG: no rule matches
    alb -> db                BLOCKED   NACL in #200 allow | SG: no rule matches
    internet -> alb          ALLOWED   SG: sg-alb allows 443 from 0.0.0.0/0
    internet -> app direct   BLOCKED   SG: no rule matches

In a real account the evidence comes from **VPC Flow Logs** (one line per flow; the default format is
version, account, interface, source, destination, ports, protocol, packets, bytes, start, end, action,
status) and the **Reachability Analyzer**. Counting REJECT lines on the database's interface:

    REJECT 10.20.33.5     -> 10.20.52.9:5432  packets=6

A REJECT says *a* filter dropped it, not *which* — the security group or the NACL. Two symptoms help: a
security group drop or a NACL drop both look like a **timeout** to the client; a **connection refused**
means the packet arrived and nothing was listening, so the network is fine and the service is not.

Azure's **network security groups** combine the two ideas: stateful like security groups, but with
numbered priorities and deny rules; application security groups play the role of group references.`,
    workedExample: `**Scenario.** Pragati adds a nightly settlement batch job in a new subnet, app-c (10.20.32.0/20). It times
out connecting to PostgreSQL at 10.20.52.9:5432. The developer has already "opened the port on the
database".

**1. Gather evidence, not guesses.** Flow logs on the database's interface show REJECT for 10.20.33.5 to
10.20.52.9:5432, so packets reach the subnet and are dropped. The client sees a timeout, not "refused" —
consistent with a filter, not a stopped database.

**2. Security group.** pragati-db allows 5432 only from pragati-app. The batch instances carry
pragati-batch. The developer's change had added the rule to pragati-app by mistake. Add 5432 from
pragati-batch to pragati-db (not from 10.20.32.0/20: a group reference survives re-IP).

**3. Still a timeout.** The simulator, after the security group fix:

    batch after SG fix: BLOCKED (reply) NACL in #200 allow | SG: sg-db allows 5432 from sg-batch
                        | NACL out #* deny (reply to port 49152)

The request now gets in, but the data subnet's NACL only allows replies out to 10.20.0.0/19 — app-a and
app-b. App-c is outside that /19, so the reply hits the * deny. Stateless filters fail exactly like this:
one direction works.

**4. Fix both directions, narrowly.** Change outbound rule 100 to 10.20.0.0/18 (which ipaddress confirms
covers all three app subnets, 10.20.0.0 to 10.20.63.255 — and, note, the public and data subnets too, so
weigh that) or add a rule 110 for 10.20.32.0/20. Pragati adds rule 110 for 10.20.32.0/20: explicit, and
one line to remove if the batch moves.

**5. Notice the bigger problem the simulator showed.** Inbound rule 200 (1024-65535 from the whole VPC,
meant for replies) also admitted the batch's 5432 request before the security group rule existed — port
5432 is inside 1024-65535. That NACL was never protecting the port; the security group was. Write that in
the review: the NACL is a coarse fence, the security group is the lock.`,
    mcqs: [
      mcq('pragati-app allows 8080 inbound from pragati-alb, and its outbound rules were reduced to only 443 to 0.0.0.0/0. Do the app\'s HTTP replies on 8080 still reach the load balancer?', [
        ['Yes, security groups are stateful, so replies to allowed traffic pass', true],
        ['No, an outbound rule for 8080 to pragati-alb must be added as well', false],
        ['No, the replies leave from an ephemeral port that is not allowed out', false],
        ['Only when the subnet NACL is also left at the default of allow all', false],
      ], 'Security groups track connections: a reply to an allowed inbound connection is allowed out regardless of outbound rules. Adding 8080 outbound or ephemeral ports is NACL thinking. The NACL is a separate check, but the question is about the security group, which passes the reply.'),
      mcq('A colleague associates a freshly created custom NACL with the live data subnets "to fill in the rules afterwards". What happens immediately?', [
        ['All traffic to and from those subnets is denied by the * rule', true],
        ['Nothing changes until at least one allow rule has been added', false],
        ['Traffic falls back to the default NACL until rules are added', false],
        ['Only inbound traffic is denied; replies are still let through', false],
      ], 'A new custom NACL contains only the final deny-all rule in each direction, so associating it cuts the subnet off. It is effective at once, there is no fallback to the default NACL, and NACLs are stateless, so nothing is let through as a reply.'),
      mcq('A developer says the database "rejects" connections. The client prints "Connection refused" immediately rather than timing out. What does that tell you?', [
        ['The packet reached the host and nothing was listening on that port', true],
        ['The database\'s security group dropped the packet on its inbound side', false],
        ['The subnet\'s NACL denied the request with an explicit deny rule', false],
        ['The route table has no route from the client subnet to the database', false],
      ], 'A refusal is the host answering with a reset, so the network delivered the packet; look at the service (stopped, wrong port, listening only on localhost). Security groups and NACLs drop silently, and a missing route also produces a timeout, not a refusal.'),
    ],
    checkpoint: [
      mcq('Which rule set lets Pragati\'s app instances reach PostgreSQL while staying correct as instances scale in and out?', [
        ['pragati-db allows 5432 from the security group pragati-app', true],
        ['pragati-db allows 5432 from each app instance\'s current IP', false],
        ['pragati-db allows 5432 from 0.0.0.0/0, the subnet is private', false],
        ['pragati-app denies 5432 to every group except pragati-db', false],
      ], 'A group reference matches any interface carrying pragati-app, whatever its address. Per-IP rules break on every scale event, 0.0.0.0/0 relies on routing alone and opens the port to anything that gets into the VPC, and security groups have no deny rules.'),
      mcq('A data-subnet NACL allows 5432 in from the app range but has no outbound rule for that range. What does a client see?', [
        ['A timeout, because the replies are dropped on the way out', true],
        ['A working connection, because NACLs track the connection state', false],
        ['Connection refused, because the database answers with a reset', false],
        ['A working connection, because the security group allows replies', false],
      ], 'NACLs are stateless, so the reply to the client\'s ephemeral port needs its own outbound allow; without it the client waits and times out. NACLs do not track state, a reset would also be blocked, and the security group allowing the reply does not override the NACL.'),
      mcq('Flow logs on a database interface show REJECT for 10.20.33.5 to port 5432. What can you conclude from that line alone?', [
        ['A security group or a NACL dropped it; the line does not say which', true],
        ['The NACL dropped it, because flow logs record only NACL decisions', false],
        ['The security group dropped it, because NACLs are never logged', false],
        ['The database refused it, because PostgreSQL rejected the login', false],
      ], 'REJECT means the traffic was not permitted by the security groups or the network ACL; you then compare rules (or run Reachability Analyzer) to find which. Flow logs cover both filters, and an application-level login failure would show as ACCEPT at the network level.'),
    ],
  },
  /* ── PRIVATE_CONNECTIVITY ────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_NETWORKING_PRIVATE_CONNECTIVITY',
    notes: `Pragati's private subnets now reach the internet only through NAT. Most of what they actually talk to is
not the internet: S3, Secrets Manager, ECR, the staging VPC, a shared-services VPC, the office, and Kaveri
Bank (fictional) over a site-to-site VPN. Each of these has a private path, and choosing the right one is a
standard design-review question.

## VPC endpoints: AWS services without the internet

**Gateway endpoints** exist for exactly two services, **S3 and DynamoDB**. You attach one to route tables;
AWS adds a route to the service's **prefix list**. There is no hourly or data charge. Built in moto:

    vpce = ec2.create_vpc_endpoint(VpcId=vid, VpcEndpointType="Gateway",
        ServiceName="com.amazonaws.ap-south-1.s3", RouteTableIds=[app_rt, data_rt])["VpcEndpoint"]
    # endpoint Gateway com.amazonaws.ap-south-1.s3 available
    # the app and data tables gain:  pl-60357dccbcd6de912 -> vpce

**Interface endpoints** (AWS PrivateLink) cover most other services — Secrets Manager, SSM, ECR, STS,
CloudWatch Logs, KMS and many more. Each is a set of **network interfaces in your subnets** with private
IPs and a **security group**. With **private DNS** on, the normal service name
(secretsmanager.ap-south-1.amazonaws.com) resolves to those private IPs inside the VPC, so code and SDKs
need no change; that needs the VPC's DNS support and DNS hostnames attributes on. In moto:

    Interface com.amazonaws.ap-south-1.secretsmanager PrivateDns True ENIs 2

Interface endpoints are billed per hour per AZ and per GB, so add them where they pay for themselves
(heavy traffic, or a subnet that must have no internet path at all) and check the calculator.

Two more uses. An **endpoint policy** limits what can be done through the endpoint (only Pragati's
buckets, say). And a bucket policy can **require** the endpoint (Deny unless aws:SourceVpce matches) —
the analyst's angle on that is in CY_CLOUD_SECURITY's networks-and-storage lesson. The same PrivateLink
technology lets you **publish your own service** to other VPCs or customers: an endpoint service in front
of a Network Load Balancer, with no peering and no CIDR coordination.

One limit to remember: a gateway endpoint is reachable only from inside its own VPC — not from a peered
VPC, not over VPN. Shared access to S3 from on-premises uses an interface endpoint for S3.

## VPC peering: two VPCs, one link

A **peering connection** joins two VPCs (same or different account, same or different region) so they
route to each other over private addresses. In moto, the request and accept steps:

    status initiating-request
    after accept active 10.20.0.0/16 <-> 10.40.0.0/16

Rules that matter:

- **No overlapping CIDRs.** Real AWS fails such a request; moto accepted one (status initiating-request
  for two 10.20.0.0/16 VPCs), so do not take a mock's leniency as permission. This is where the address
  plan from the first lesson pays off.
- **Both sides need routes** to the other's CIDR via the pcx- connection, and security groups must allow
  the traffic (in the same region a rule can reference the peer's security group).
- **Not transitive.** If A peers with B and B with C, A cannot reach C through B; nor can A use B's NAT,
  internet gateway or VPN ("no edge-to-edge routing").

Peering is simple and has no hourly charge, but a full mesh grows as n(n-1)/2: 6 VPCs need 15
connections, 10 need 45, 20 need 190 — each with routes on both sides.

## Transit Gateway: a hub

A **Transit Gateway** (TGW) is a regional router you attach VPCs, VPNs and Direct Connect to. Every
attachment is one connection to the hub instead of n-1 peerings. Created in moto:

    tgw- available enable 64512     (state, default route-table association, Amazon-side ASN)

The power is in its **route tables**: associate prod VPCs with one table and non-prod with another, and
non-prod can never route to prod while both reach shared services. TGWs in different regions **peer**
with each other (Mumbai to Hyderabad for Pragati's DR). It costs per attachment-hour and per GB processed,
so a two-VPC setup is cheaper with peering; the hub wins on manageability once there are several VPCs, a
VPN and segmentation rules.

## Reaching offices and partners

- **Site-to-Site VPN** — IPsec over the internet between a **customer gateway** (the office or bank
  firewall) and a virtual private gateway or a TGW. Each connection has **two tunnels** to two AWS
  endpoints; configure both, or a routine AWS maintenance takes you down. Routing is static or **BGP**.
  Quick to set up; throughput and latency follow the internet path.
- **Direct Connect** — a dedicated private circuit from a Direct Connect location (several exist in
  India) into AWS, ordered through AWS or a partner. Consistent latency and high bandwidth, but it takes
  weeks to provision and is **not encrypted by default** (use MACsec where supported, or run a VPN over
  it). A common pattern: Direct Connect primary, Site-to-Site VPN as backup.
- **Client VPN** — for people (engineers on laptops), not for networks.

## Choosing

    Need                                        Use
    Private subnets to S3 / DynamoDB            gateway endpoint (free)
    Private subnets to other AWS APIs           interface endpoints, or NAT if traffic is light
    Two or three VPCs, no transit needed        VPC peering
    Many VPCs, VPN, prod/non-prod segmentation  Transit Gateway with route tables
    Office or bank network, quickly             Site-to-Site VPN (two tunnels)
    Steady high-volume private link             Direct Connect, with VPN backup
    Offer one service to other VPCs             PrivateLink endpoint service (NLB)

Azure equivalents: Private Endpoints and service endpoints, VNet peering (also non-transitive), hub-and-
spoke with Azure Virtual WAN, VPN Gateway and ExpressRoute.`,
    workedExample: `**Scenario.** Pragati has grown to six VPCs in Mumbai (prod-payments, prod-ledger, shared-services,
staging, dev, security-tooling), a DR VPC in Hyderabad, an office in HITEC City and a VPN to Kaveri Bank.
They are joined by a tangle of peerings added one ticket at a time. Design the replacement.

**1. Count what the mesh would cost to maintain.** Six VPCs in a full mesh need 6 x 5 / 2 = 15 peerings,
each with routes on both sides; seven with DR need 21. And peering cannot carry the bank VPN to the VPCs
behind it, because peering is not transitive.

**2. Put a Transit Gateway in Mumbai** and attach the six VPCs, the office VPN and the bank VPN. Peer it
with a TGW in Hyderabad for the DR VPC.

**3. Segment with TGW route tables.**
- prod table (prod-payments, prod-ledger): routes to each other, shared-services and the bank.
- non-prod table (staging, dev): routes to shared-services only — never to prod.
- shared table (shared-services, security-tooling): routes to everything (security scans need reach).
- bank table (bank VPN): routes to prod-payments' app subnets only. The bank should not see the ledger.

**4. Check the address plan first.** The bank's 10.20.128.0/18 clashed with the original prod range; the
first lesson moved prod to 10.50.0.0/16. Without that, the TGW could not route the bank at all.

**5. Keep AWS traffic local.** Each VPC still gets its own S3 and DynamoDB gateway endpoints (they cannot
be shared through the TGW). Interface endpoints can be centralised in shared-services with Route 53
private zones, an advanced pattern to adopt only when the per-VPC endpoint bill justifies it.

**6. Cost and risk.** TGW charges per attachment and per GB; compare with the current peerings using the
calculator. Migrate one VPC at a time: add the TGW route, confirm with Reachability Analyzer, then delete
the old peering.`,
    mcqs: [
      mcq('VPC A peers with B, and B peers with C. A service in A tries to reach a database in C. What happens?', [
        ['It fails: peering is not transitive, so A has no path to C', true],
        ['It works, once B enables forwarding on its own route tables', false],
        ['It works, but only if the three VPCs are in the same account', false],
        ['It works for TCP traffic, but UDP traffic is dropped by B', false],
      ], 'A peering connection only links its two VPCs; traffic cannot transit through B whatever B\'s route tables say. Account ownership and protocol do not change that. To connect many VPCs through a hub, use a Transit Gateway.'),
      mcq('Pragati\'s data subnets have no NAT and no internet route, yet the app must read secrets from Secrets Manager there. What is the right fix?', [
        ['An interface endpoint for Secrets Manager with private DNS turned on', true],
        ['A gateway endpoint for Secrets Manager attached to the data route table', false],
        ['A peering connection from the VPC to the Secrets Manager service VPC', false],
        ['A NAT gateway route only for the Secrets Manager hostname in DNS', false],
      ], 'Secrets Manager is reached privately through an interface endpoint (PrivateLink), and private DNS keeps the usual hostname working. Gateway endpoints exist only for S3 and DynamoDB, you cannot peer with an AWS service, and routes match addresses, not hostnames.'),
      mcq('An on-premises server reaches Pragati\'s VPC over Site-to-Site VPN and tries to use the VPC\'s S3 gateway endpoint. Why does that not work?', [
        ['Gateway endpoints serve only traffic that originates inside their VPC', true],
        ['Gateway endpoints need a Transit Gateway before they accept VPN traffic', false],
        ['S3 rejects every request whose source IP address is a private one', false],
        ['The VPN tunnel encrypts traffic, so S3 cannot read the request body', false],
      ], 'A gateway endpoint works through the VPC\'s route tables and cannot be extended to peered VPCs or on-premises networks; an interface endpoint for S3 can. Adding a TGW does not change that, S3 accepts requests over private endpoints, and the tunnel encryption ends before the request reaches AWS.'),
    ],
    checkpoint: [
      mcq('Pragati has twelve VPCs, two VPNs and a rule that non-prod must never reach prod. Which design fits?', [
        ['A Transit Gateway with separate route tables for prod and non-prod', true],
        ['A full mesh of VPC peerings with routes removed from non-prod', false],
        ['One large VPC holding all environments, separated by subnets', false],
        ['Gateway endpoints in every VPC, pointing at the prod VPC', false],
      ], 'A TGW connects many VPCs and VPNs, and its route tables enforce segmentation centrally. A twelve-VPC mesh needs 66 peerings and cannot carry the VPNs transitively, one shared VPC weakens isolation, and gateway endpoints only reach S3 and DynamoDB.'),
      mcq('Kaveri Bank wants a private link to Pragati that gives steady latency for settlement files. The team needs it next week. What is the sensible plan?', [
        ['Site-to-Site VPN with both tunnels now, then Direct Connect later', true],
        ['Direct Connect only, since it can be provisioned within the week', false],
        ['VPC peering with the bank\'s on-premises network over the internet', false],
        ['Client VPN for the bank\'s file server, as it is a single machine', false],
      ], 'A VPN can be built in days; Direct Connect usually takes weeks, so it comes later, with the VPN kept as backup. Peering joins VPCs, not on-premises networks, and Client VPN is for people on laptops rather than for a partner network.'),
      mcq('A peering request between two VPCs that both use 10.20.0.0/16 succeeded in a moto test. What should the team expect in real AWS?', [
        ['The request fails, because peered VPCs must not overlap', true],
        ['It works, as moto mirrors AWS behaviour exactly for EC2', false],
        ['It works, but only for the subnets that do not overlap', false],
        ['It works once both sides add a route to 10.20.0.0/16', false],
      ], 'AWS does not allow peering VPCs with overlapping CIDR blocks; a mock accepting it is a gap in the mock, not a feature of AWS. Moto does not mirror every validation, partial overlap is still refused, and no route could be unambiguous anyway.'),
    ],
  },
  /* ── DNS_ROUTE53 ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_NETWORKING_DNS_ROUTE53',
    notes: `Year 1's "DNS" taught how a name becomes an address: resolvers, authoritative servers, records and TTLs.
**Route 53** is AWS's DNS service, and in a cloud team it does two jobs: it answers for your public domain,
and it gives names to things inside your VPCs. Its routing policies also make DNS a traffic-steering and
failover tool — which is powerful, and slower than people expect.

## Hosted zones and delegation

A **public hosted zone** holds the records for a domain. Creating one gives you an SOA record and an NS
record listing **four name servers**. In moto:

    zone = r53.create_hosted_zone(Name="pragatipay.example", CallerReference="lesson-1")
    # zone pragatipay.example. NS 4
    # default records [('NS', 'pragatipay.example.'), ('SOA', 'pragatipay.example.')]

Nothing on the internet uses this zone until the domain's **registrar** (Route 53 or any other registrar)
lists those four name servers for the domain. "I created the record and nothing resolves" is most often a
zone that was never delegated, or a second zone with the same name created by mistake whose name servers
the registrar does not list. CallerReference must be unique per request — it makes retries safe.

## Records, and the alias record

The usual types: **A** (IPv4), **AAAA** (IPv6), **CNAME** (this name is another name), **MX** (mail),
**TXT** (verification, SPF), **CAA** (which certificate authorities may issue for the domain).

Two rules decide most designs:

- A **CNAME cannot sit at the zone apex** (pragatipay.example itself), because the apex must also hold
  NS and SOA records and a CNAME may not coexist with other records. Real Route 53 refuses it. **moto
  accepted an apex CNAME** in testing — a mock's gap, not AWS behaviour.
- Route 53's **alias record** solves that: an A or AAAA record that points at an AWS resource — a load
  balancer, a CloudFront distribution, an S3 website endpoint, API Gateway, or another record in the zone.
  It works at the apex, follows the target's changing IPs, takes its TTL from the target, and queries
  for alias records that point at AWS resources are not charged.

## Routing policies

Pragati's records after one change batch (moto output):

    api.pragatipay.example.      A     mumbai     PRIMARY    203.0.113.10
    api.pragatipay.example.      A     hyderabad  SECONDARY  198.51.100.20
    app.pragatipay.example.      A                alias      pragati-web-1.ap-south-1.elb.amazonaws.com
    beta.pragatipay.example.     CNAME blue       weight 90  blue.pragatipay.example
    beta.pragatipay.example.     CNAME green      weight 10  green.pragatipay.example

The policies, and what each is for:

- **Simple** — one answer. Most records.
- **Weighted** — split by weight (90/10 above): canary releases, or moving traffic between stacks.
- **Latency** — answer with the region that has the lowest measured latency for the resolver's location.
- **Failover** — PRIMARY while its health check passes, SECONDARY otherwise. Active-passive DR.
- **Geolocation / geoproximity** — by the user's country or distance, for example to keep Indian users on
  an Indian region for data-residency reasons. Geolocation needs a default record or some users get no answer.
- **Multivalue answer** — several healthy IPs, client picks; **IP-based** — by the resolver's network.

Records that share a name and type under a policy are told apart by **SetIdentifier** (mumbai, hyderabad).

## Health checks

A Route 53 health check probes an endpoint (HTTP, HTTPS or TCP) from checkers in several AWS locations,
at a standard or fast interval, and declares it unhealthy after a failure threshold. The one in moto:

    health check HTTPS /healthz 3     (type, path, failure threshold)

Points engineers miss:

- The checkers come from the internet, so the endpoint's security group must allow Route 53's health
  checker ranges (published in AWS's ip-ranges.json under the ROUTE53_HEALTHCHECKS service).
- For a **private** resource, use a health check based on a **CloudWatch alarm** instead.
- For an alias to a load balancer, **Evaluate Target Health** lets the record follow the ALB's own
  target health without a separate check.
- /healthz should prove the service can do its job (reach its database) without being so deep that one
  slow dependency fails over the whole region.

## Failover is not instant

DNS answers are **cached for the TTL** by resolvers and clients. Even after Route 53 switches to the
secondary, users keep the old answer until it expires — and some clients cache longer than they should.
Use a short TTL (60 seconds) on records you may fail over, and lower long TTLs a day **before** a planned
migration. Failover moves traffic; it does not move data — the Hyderabad stack needs its database
replicated (CL_AWS_DATABASES covers that).

## Private hosted zones and the resolver

A **private hosted zone** answers only inside the VPCs associated with it (moto: private zone
internal.pragati. True). It needs the VPC attributes **enableDnsSupport** and **enableDnsHostnames** on.
Use it for names like ledger-db.internal.pragati, and for **split-horizon** DNS: the same name resolving to a
private address inside the VPC and a public one outside.

Every VPC has the **Route 53 Resolver** at the VPC base address plus two (10.20.0.2). For hybrid networks,
**Resolver endpoints** forward queries: an **outbound** endpoint with a rule sends corp.kaveri.example to the
bank's DNS servers; an **inbound** endpoint lets office DNS servers resolve internal.pragati.

The CLI form of a change (from the documentation, not run):

    aws route53 change-resource-record-sets --hosted-zone-id Z0EXAMPLE12345 \\
        --change-batch file://failover-records.json

Azure equivalents: Azure DNS and Private DNS zones; Traffic Manager for DNS-based routing.`,
    workedExample: `**Scenario.** Pragati's API runs in Mumbai with a warm standby in Hyderabad. The CTO wants "automatic
failover" for api.pragatipay.example before the festival sale.

**1. Records.** Two A alias records for api.pragatipay.example: SetIdentifier mumbai, Failover PRIMARY,
pointing at the Mumbai ALB; SetIdentifier hyderabad, Failover SECONDARY, pointing at the Hyderabad ALB.
(The moto build used plain A records with documentation IPs, 203.0.113.10 and 198.51.100.20; in production
both are aliases.)

**2. Health.** Attach a health check to the primary: HTTPS on /healthz, failure threshold 3. The
endpoint returns 200 only if the API can reach its database and the secrets it needs; it does not call
third-party partners, so a partner outage cannot fail over the region. Allow the Route 53 health checker
ranges on the ALB's security group for 443.

**3. TTL.** Alias records take the target's TTL; for any non-alias records in the chain, use 60
seconds. Tell the business the honest number: users move over within roughly the detection time plus the
TTL, and some long-caching clients take longer.

**4. What failover does not do.** DNS moves requests; it does not make Hyderabad ready. The database
replica must be promoted (a decision, often manual, because promoting a replica that is behind loses
payments), and the Hyderabad stack must have capacity for sale-day load. Write both into the runbook.

**5. Rehearse.** In staging, invert the health check (or block the checkers on the ALB) and watch the
answer change with dig; time it; then restore. A failover that has never been tested is a hope, not a
plan.`,
    mcqs: [
      mcq('Pragati wants pragatipay.example (the bare domain) to point at its Application Load Balancer. Which record works?', [
        ['An A record with Alias set, targeting the load balancer', true],
        ['A CNAME record at the apex, pointing at the ALB\'s DNS name', false],
        ['An A record holding one of the ALB\'s current IP addresses', false],
        ['An NS record at the apex that names the ALB\'s DNS name', false],
      ], 'Alias A records work at the zone apex and follow the ALB\'s changing addresses. A CNAME cannot coexist with the apex NS and SOA records, ALB IPs change so a fixed A record breaks, and NS records delegate zones rather than point at endpoints.'),
      mcq('A new hosted zone for pragatipay.example has all records, but nothing resolves on the internet. dig shows the registrar still lists old name servers. What must change?', [
        ['The registrar must list the four Route 53 name servers of the zone', true],
        ['The records need a lower TTL so the resolvers pick up the change', false],
        ['The hosted zone must be made private and then associated with VPCs', false],
        ['Each record must be recreated as an alias so Route 53 serves it', false],
      ], 'Resolvers find a zone through the delegation at the registrar; until it names Route 53\'s servers, they never ask Route 53. TTLs only affect caching of answers already given, a private zone answers only inside VPCs, and ordinary records are served without being aliases.'),
      mcq('Pragati sends 10% of beta traffic to a new green stack using weighted records. What must the two records share, and what must differ?', [
        ['Same name and type; different SetIdentifier and weight', true],
        ['Same SetIdentifier; different name, type and weight', false],
        ['Same weight; different name and record type for each', false],
        ['Same health check; different hosted zone for each one', false],
      ], 'Weighted records answer one query (same name and type), and SetIdentifier distinguishes them, with weights 90 and 10 setting the split. Different names would be different queries, equal weights give 50/50, and both records live in the same hosted zone.'),
    ],
    checkpoint: [
      mcq('The Mumbai API fails its health check and Route 53 switches api.pragatipay.example to Hyderabad, yet many users keep hitting Mumbai for a while. Why?', [
        ['Resolvers and clients cache the old answer until its TTL expires', true],
        ['Route 53 waits for an engineer to approve each failover by hand', false],
        ['Failover records switch only after the primary region is deleted', false],
        ['Health checks run once an hour, so failover is always delayed', false],
      ], 'DNS answers are cached for the TTL, so clients keep the old address until it expires (and some cache longer). Failover is automatic, needs no deletion, and each health checker probes every 10 or 30 seconds, not hourly.'),
      mcq('A Route 53 health check on Pragati\'s ALB always reports unhealthy, though the app works from the office. The ALB\'s security group allows 443 only from the office range. What is the cause?', [
        ['The Route 53 health checkers come from AWS ranges the group does not allow', true],
        ['Health checks need port 80, so the group must allow plain HTTP for them', false],
        ['Health checks cannot target an ALB and must target the instances instead', false],
        ['The health check must be created in us-east-1 to reach a Mumbai ALB', false],
      ], 'Route 53 checkers probe from their own published IP ranges on the internet; if the security group blocks them, every check fails. HTTPS checks use 443, ALBs are valid targets, and health checks are global rather than tied to a region.'),
      mcq('ledger-db.internal.pragati resolves inside the prod VPC but not inside the newly peered analytics VPC. What is missing?', [
        ['Associating the private hosted zone with the analytics VPC', true],
        ['Making the internal.pragati zone public so all VPCs see it', false],
        ['A CNAME in the analytics VPC pointing at the prod resolver', false],
        ['Raising the record\'s TTL so it propagates across the peering', false],
      ], 'Private hosted zones answer only in the VPCs associated with them; peering does not share DNS. Making the zone public would expose internal names, a VPC has no place to hold a stray CNAME outside a zone, and TTL does not propagate anything.'),
    ],
  },
  /* ── LOAD_BALANCERS_CDN ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_NETWORKING_LOAD_BALANCERS_CDN',
    notes: `Everything so far keeps traffic out. This lesson is about letting the right traffic in: a load balancer
as the only public entry point, TLS on it, and a CDN in front for users across India. Year 3's
"Networking in a Cloud" introduced the load balancer as "the public entry point with health checks"; here
are the choices and settings you will actually make.

## Which load balancer

- **Application Load Balancer (ALB)** — layer 7, HTTP and HTTPS (and gRPC, WebSockets). Routes by host,
  path, headers or query string; terminates TLS; adds X-Forwarded-For so the app sees the client's IP; works
  with AWS WAF. The default for web apps and APIs.
- **Network Load Balancer (NLB)** — layer 4, TCP, UDP and TLS. Very high throughput and low latency, **one
  static IP per AZ** (or your Elastic IPs), and it can preserve the client's source IP. Use it for non-HTTP
  protocols, for partners who must allow-list fixed IPs (banks often do), and behind a PrivateLink endpoint
  service. NLBs can have security groups too, chosen when the NLB is created.
- **Gateway Load Balancer** — inserts third-party firewall appliances; you will meet it in security teams.
  The Classic Load Balancer is legacy.

## The pieces of an ALB

    internet -> listener (HTTPS :443) -> rules (path /api/*, host, ...) -> target group -> targets
                listener (HTTP :80)   -> redirect to HTTPS, 301

Built in moto with boto3 (run; output below, trimmed):

    lb = elb.create_load_balancer(Name="pragati-web", Subnets=[public_a, public_b],
                                  SecurityGroups=[alb_sg], Scheme="internet-facing", Type="application")
    tg = elb.create_target_group(Name="pragati-app", Protocol="HTTP", Port=8080, VpcId=vid,
                                 TargetType="ip", HealthCheckPath="/healthz", HealthCheckIntervalSeconds=15,
                                 HealthyThresholdCount=3, UnhealthyThresholdCount=2, Matcher={"HttpCode": "200"})

    application internet-facing pragati-web-1.ap-south-1.elb.amazonaws.com ['ap-south-1a', 'ap-south-1b']
    tg HTTP 8080 ip /healthz 15 3 2
    listener HTTPS 443 forward  ELBSecurityPolicy-TLS13-1-2-2021-06
    listener HTTP 80 redirect HTTP_301
    rules [('10', [['/api/*']]), ('default', [])]
    target 10.20.3.17 healthy
    target 10.20.19.40 healthy

What to know about each:

- **Subnets**: an ALB needs subnets in **at least two AZs** (public ones for internet-facing, private for
  internal). moto accepted a one-subnet ALB; real AWS refuses it.
- **Target types**: instance, ip (containers on ECS/EKS, or servers reached over VPN) and lambda. ALB nodes
  connect from their own private IPs, which is why the app's security group references the ALB's group.
- **Health checks**: with a 15-second interval and an unhealthy threshold of 2, a dead target leaves
  rotation after about 30 seconds; 3 healthy checks bring it back. Make /healthz cheap and honest.
  (moto reports every registered target healthy; a real ALB probes them.)
- **Rules** are evaluated by priority; the default action catches the rest.
- **Defaults worth knowing**: idle timeout 60 seconds (long-polling or slow report downloads need more),
  deregistration delay 300 seconds (a deploy waits that long per target unless you lower it), cross-zone
  load balancing on for ALBs (off by default on NLBs).

## TLS with ACM

**AWS Certificate Manager** issues public certificates at no charge for use with integrated services (ALB,
CloudFront, API Gateway) and renews them automatically. Validate by **DNS**: ACM gives a CNAME to add to
Route 53, and as long as it stays, renewal is automatic. In moto:

    cert = acm.request_certificate(DomainName="app.pragatipay.example", ValidationMethod="DNS")

Terminate TLS on the HTTPS listener with a modern **security policy** (the TLS 1.3 policy above), and
redirect port 80 to 443 with a 301 rather than serving content on HTTP. If compliance requires encryption
all the way to the app (common in payments), the target group uses HTTPS too. A certificate for
**CloudFront must be requested in us-east-1**, whatever region the app runs in — a classic first-time error.

## CloudFront in front

**CloudFront** serves content from edge locations close to users (there are several in Indian cities),
which cuts latency for static files and absorbs traffic spikes before they reach your servers.

- **Origins**: an S3 bucket, an ALB, or any HTTP server.
- **Cache behaviours** by path: /static/* cached for a long time (versioned file names, so no
  invalidation needed); /api/* not cached, forwarding the headers and cookies the API needs.
- **S3 origins stay private**: use **Origin Access Control** (OAC) so only the distribution can read the
  bucket, with Block Public Access left on. Never make the bucket public "for the CDN".
- **Lock the ALB to CloudFront** when CloudFront fronts it: allow the AWS-managed prefix list for
  CloudFront origin-facing addresses in the ALB's security group, and check a secret custom header in a
  listener rule, so nobody bypasses the CDN and its WAF. (CloudFront VPC origins, a newer option, let the
  ALB sit in private subnets with no public entry at all; check whether your setup supports it.)
- **Invalidations** remove cached objects early; use them for mistakes, not as the deploy mechanism.
- **Shield Standard** protects every distribution and ALB against common network attacks at no extra
  cost; **AWS WAF** on CloudFront or the ALB adds rate limits and managed rule sets — useful on sale days
  and when someone scripts OTP requests.

The pricing model for all three (ALB capacity units, NLB capacity units, CloudFront requests and data
out) is on their pricing pages; estimate with the calculator before the sale, not after.

Azure equivalents: Azure Load Balancer (layer 4), Application Gateway (layer 7, with WAF), and Azure Front
Door for global entry and CDN.`,
    workedExample: `**Scenario.** Pragati launches a merchant dashboard (a React single-page app) and a public API, and Kaveri
Bank's settlement system must call one Pragati endpoint from a firewall that only allows fixed IPs.

**1. The dashboard.** Build output goes to a private S3 bucket. A CloudFront distribution serves it with
OAC; Block Public Access stays on. File names carry content hashes, so index.html gets a short TTL and
/static/* a long one; a deploy uploads new files and needs no invalidation except for index.html.

**2. The API.** An internet-facing ALB in public-a and public-b; HTTPS listener with an ACM certificate
for api.pragatipay.example (requested in ap-south-1, where the ALB is); port 80 redirects with a 301;
target group of type ip for the EKS pods, health check /healthz every 15 seconds. The app's security
group allows 8080 only from the ALB's group. CloudFront fronts the API too (no caching for /api/*, all
needed headers forwarded), so its certificate is a second ACM certificate in **us-east-1**. The ALB's
security group allows only the CloudFront origin-facing prefix list, and a listener rule rejects requests
missing the secret header CloudFront adds.

**3. The bank.** The bank cannot allow-list CloudFront or ALB addresses, which change. Put an NLB with an
Elastic IP per AZ in front of the settlement service (TLS listener with its own certificate), and give the
bank those two IPs. The NLB's security group allows only the bank's VPN-egress range.

**4. Sale-day readiness.** WAF rate-based rules on CloudFront for the OTP and login paths; ALB idle
timeout raised for the report-download path only if needed; a load test from outside AWS to watch the ALB
scale; the deregistration delay lowered to 30 seconds so deploys during the sale do not hang.

**5. Check the result.** curl -I http://app... returns 301 to https; the bucket URL returns 403; the ALB's
own DNS name refuses direct requests; the bank's test call arrives from the expected IP in the NLB logs.`,
    mcqs: [
      mcq('Kaveri Bank\'s firewall can only allow-list fixed IP addresses for Pragati\'s settlement endpoint. Which front door fits?', [
        ['A Network Load Balancer with an Elastic IP in each AZ', true],
        ['An Application Load Balancer, whose IPs stay fixed for life', false],
        ['A CloudFront distribution with the bank as its only origin', false],
        ['An internet gateway with the bank\'s range in the route table', false],
      ], 'NLBs offer one static IP per AZ and accept Elastic IPs, which a partner can allow-list. ALB node addresses change over time, CloudFront edges use many changing addresses (and origins are where CloudFront fetches from, not callers), and route tables do not filter callers.'),
      mcq('Pragati requests an ACM certificate in ap-south-1 and tries to attach it to its CloudFront distribution, but it is not offered. Why?', [
        ['CloudFront uses certificates requested in us-east-1 only', true],
        ['ACM certificates cannot be used with CloudFront at all', false],
        ['The certificate must be validated by email for CloudFront', false],
        ['CloudFront needs the certificate to be exported as a file', false],
      ], 'CloudFront is a global service that reads ACM certificates from us-east-1, so request a second certificate there. ACM works with CloudFront, DNS validation is fine (and better for renewal), and ACM public certificates are attached by ARN, not exported.'),
      mcq('After a deploy, each old target takes about five minutes to leave Pragati\'s target group, and deploys crawl. Which setting explains it?', [
        ['The deregistration delay, which defaults to 300 seconds', true],
        ['The health check interval, which defaults to 300 seconds', false],
        ['The ALB idle timeout, which defaults to five minutes', false],
        ['The listener rule priority, which delays lower rules', false],
      ], 'Deregistration delay (connection draining) keeps a target serving in-flight requests for up to 300 seconds by default; lower it for short requests. Health check intervals are seconds long, the idle timeout defaults to 60 seconds, and rule priority affects matching order, not timing.'),
    ],
    checkpoint: [
      mcq('Pragati serves its dashboard from S3 through CloudFront. How should the bucket be protected?', [
        ['Keep it private and let CloudFront read it through Origin Access Control', true],
        ['Make it public, since CloudFront can only read objects that are public', false],
        ['Allow the CloudFront edge IP ranges in a bucket policy condition list', false],
        ['Enable static website hosting with public read for the build folder', false],
      ], 'OAC lets only the distribution read the bucket while Block Public Access stays on. CloudFront does not need public objects, edge IP lists are large and changing, and website hosting requires public read, which this design avoids.'),
      mcq('Which need points to an ALB rather than an NLB?', [
        ['Routing /api/* and /admin/* to different target groups', true],
        ['Carrying a UDP protocol for a real-time telemetry stream', false],
        ['Giving a partner one fixed IP address per Availability Zone', false],
        ['Passing raw TCP for a non-HTTP database replication link', false],
      ], 'Path-based routing is a layer-7 feature of the ALB. UDP, fixed per-AZ IPs and raw TCP are NLB territory, because the ALB handles HTTP and HTTPS only and its addresses change.'),
      mcq('An ALB target group has interval 15 seconds, unhealthy threshold 2 and healthy threshold 3. A pod hangs. About how long until the ALB stops sending it traffic?', [
        ['About 30 seconds', true],
        ['About 45 seconds', false],
        ['About 15 seconds', false],
        ['About 5 minutes', false],
      ], 'Two consecutive failed checks 15 seconds apart take about 30 seconds. 45 seconds is the healthy threshold (3 x 15), which applies when a target comes back; one check is not enough to mark it unhealthy; five minutes is the deregistration delay default, which is different.'),
    ],
  },
  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_NETWORKING_DEBUGGING',
    notes: `Network faults on AWS almost all look the same from the application: a timeout. The way through is to walk
the path in a fixed order and look at evidence at each step, instead of opening ports until it works (and
leaving them open). The order:

    1. DNS        does the name resolve to the address you expect, from where the client runs?
    2. Route      does the source subnet's route table have a route to the destination (longest prefix)?
                  and does the destination's table have one back?
    3. NACL       inbound on the destination subnet, outbound for the reply (stateless, ephemeral ports)
    4. SG         inbound on the destination interface (stateful; replies are automatic)
    5. Service    is anything listening? (refused = reached the host; timeout = filtered or unrouted)

Tools: VPC Flow Logs (ACCEPT/REJECT per flow), Reachability Analyzer (names the blocking component),
the route-table checker from "Route Tables, Internet and NAT Gateways", and from an instance via Session
Manager: dig, curl -v, nc -zv host port. Six real failures follow, each with symptom, cause and fix.

## 1. "Public" instance, unreachable

**Symptom.** A test web server in public-c times out on 443. Its security group allows 443 from anywhere
for the test, and it has a public IP.
**Evidence.** The checker on public-c returns ('main (implicit)', 'none', False): the subnet was created
for the third AZ and never associated with the public route table, so it uses the main table, which
(correctly) has only the local route.
**Fix.** Associate public-c with the public route table. Do **not** add the IGW route to the main table —
that makes every future unassociated subnet public (the trap from the routing lesson).

## 2. NAT gateway in the wrong subnet

**Symptom.** After a rebuild, app servers cannot reach the payment partner's API or download packages.
Their table routes 0.0.0.0/0 to a NAT gateway that shows "available".
**Cause.** The Terraform change created the NAT in **app-a** instead of public-a. A NAT gateway forwards
to the internet using **its own subnet's** route table, and app-a's default route points back at the NAT
itself. Available is not the same as working.
**Fix.** Recreate the NAT in a public subnet (its route table must send 0.0.0.0/0 to the IGW), update the
private routes, delete the misplaced one. Add the subnet to the module's variable validation.

## 3. Backups to S3 hang from the data subnets

**Symptom.** A pg_dump upload to S3 from a data-subnet instance hangs; the same command works from app-a.
The data route table has the S3 gateway endpoint route (pl-...). Security groups allow all egress.
**Cause.** The data subnets' NACL (from the security groups lesson):

    in    100   6 10.20.0.0/19  5432-5432 allow
    in    200   6 10.20.0.0/16  1024-65535 allow
    out   100   6 10.20.0.0/19  1024-65535 allow
    out   200   6 0.0.0.0/0     443-443 allow

Outbound 443 is allowed, but the **replies come back from S3's public addresses** to an ephemeral port, and
inbound rule 200 only allows ephemeral ports from inside the VPC. The endpoint keeps traffic private; it
does not change S3's addresses. The request leaves; the answer is dropped.
**Fix.** Allow inbound 1024-65535 from the S3 prefix list (NACLs take CIDRs, so the S3 ranges for
ap-south-1 from ip-ranges.json — or, simpler, 0.0.0.0/0 for TCP 1024-65535 inbound and rely on security
groups for precision). This is the cost of stateless filters: every outbound rule needs its reply rule.

## 4. Peering is active; nothing passes

**Symptom.** pcx- between prod (10.50.0.0/16) and analytics (10.40.0.0/16) shows **active**; queries from
analytics to the prod read replica time out.
**Cause.** Routes were added only in the prod tables (10.40.0.0/16 -> pcx). Analytics' tables have no
route to 10.50.0.0/16, so requests go to its default route (a NAT) and die there. A peering connection is
only a door; each side must route to it.
**Fix.** Add 10.50.0.0/16 -> pcx to every analytics table that needs it, and allow 5432 on the replica's
security group from the analytics group (same-region peers can reference each other's groups).

## 5. Every target unhealthy; the ALB returns 503

**Symptom.** After adding HTTPS redirects in the app, all targets in pragati-app go unhealthy and users get
503 Service Unavailable from the ALB.
**Cause.** The app now answers /healthz on HTTP with a **301** redirect to HTTPS. The target group's
matcher expects 200, so every check fails; with no healthy targets the ALB returns 503. (A 502 points to a
target that answered with something the ALB could not use, such as a closed connection.)
**Fix.** Exempt /healthz from the redirect in the app — TLS already ends at the ALB, and the redirect
belongs on the ALB's port-80 listener, not in the app. Do not "fix" it by setting the matcher to 200-399;
that would hide a real redirect loop.

## 6. A private name that resolves nowhere

**Symptom.** A new VPC is associated with the internal.pragati private hosted zone, yet ledger-db.internal.pragati
does not resolve, and the Secrets Manager interface endpoint's private DNS name resolves to
public IPs.
**Cause.** The VPC was created by a script that left **enableDnsHostnames** off (and, in one account,
enableDnsSupport off too). Private hosted zones and endpoint private DNS need both.
**Fix.** Turn both attributes on (modify-vpc-attribute, one attribute per call), then re-test with dig from
an instance. Add both to the VPC module's defaults so it cannot recur.

Commands for these checks (from the documentation, not run):

    aws ec2 describe-route-tables --filters Name=association.subnet-id,Values=subnet-0pubc
    aws ec2 describe-nat-gateways --query "NatGateways[].{id:NatGatewayId,subnet:SubnetId,state:State}"
    aws ec2 modify-vpc-attribute --vpc-id vpc-0abc --enable-dns-hostnames "{\\"Value\\":true}"
    aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:ap-south-1:123456789012:targetgroup/pragati-app/0123456789abcdef`,
    mcqs: [
      mcq('A NAT gateway shows state "available", yet private servers routed to it cannot reach the internet. The NAT sits in app-a. What is wrong?', [
        ['The NAT\'s own subnet has no route to an internet gateway', true],
        ['NAT gateways need a security group that allows outbound 443', false],
        ['The NAT gateway needs a few hours after creation to start routing', false],
        ['Private route tables must point 0.0.0.0/0 at the IGW as well', false],
      ], 'A NAT gateway sends traffic out using its own subnet\'s route table, which must point at an internet gateway, so it belongs in a public subnet. NAT gateways have no security groups, available means ready, and pointing private tables at the IGW would make them public.'),
      mcq('Data-subnet instances can send to S3 through a gateway endpoint on 443, but uploads hang. The NACL allows inbound ephemeral ports only from 10.20.0.0/16. Why?', [
        ['S3\'s replies come from S3 addresses outside the VPC range', true],
        ['Gateway endpoints need port 80 open in addition to port 443', false],
        ['The security group drops replies unless egress is restricted', false],
        ['The route to the S3 prefix list sends replies through the NAT', false],
      ], 'The endpoint keeps the path private but S3 still answers from its own public ranges, and the stateless NACL must allow those replies in. HTTPS uses 443 only, security groups are stateful and allow replies, and endpoint routes do not involve NAT.'),
      mcq('After the app began redirecting HTTP to HTTPS, every ALB target turned unhealthy and users get 503s. The health check expects 200 on /healthz over HTTP. What is the right fix?', [
        ['Exempt /healthz from the app\'s redirect and keep the matcher at 200', true],
        ['Widen the matcher to 200-399 so that every redirect counts as healthy', false],
        ['Remove the health check so the ALB sends traffic to all targets anyway', false],
        ['Open port 443 on the app\'s security group to the whole internet range', false],
      ], 'The health check sees a 301 and fails; the app should answer the probe with 200 (TLS ends at the ALB, which handles the redirect on port 80). Widening the matcher hides real redirect faults, an ALB target group always has a health check, and opening 443 to the internet is unrelated and unsafe.'),
      mcq('A peering connection between prod and analytics shows "active", but analytics cannot reach prod. Prod\'s tables route 10.40.0.0/16 to the pcx. What is the most likely cause?', [
        ['Analytics\' route tables have no route to prod\'s CIDR via the pcx', true],
        ['Peering needs a Transit Gateway before any traffic can pass at all', false],
        ['Active only means the request was sent, not that it was accepted', false],
        ['Prod\'s NACL must be replaced by the default NACL to allow peering', false],
      ], 'Both VPCs must route to each other through the peering; one-sided routes mean requests from analytics follow its default route and fail. Peering needs no TGW, "active" means accepted and usable, and the default NACL is not a requirement for peering.'),
    ],
  },
  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_NETWORKING_PRACTICE',
    notes: `Ten exercises, easiest first. Do each on paper (or in Python with ipaddress) before reading the answer. All
use Pragati Pay's prod VPC 10.20.0.0/16 from the lessons: app-a 10.20.0.0/20, app-b 10.20.16.0/20, app-c
10.20.32.0/20, public-a/b/c 10.20.48-50.0/24, data-a/b/c 10.20.52-54.0/24. Every number below was checked
with Python's ipaddress module; the code in exercise 10 was run against moto.

## 1. Usable addresses (easy)

How many addresses can you assign in a /27 subnet on AWS?

**Answer.** 32 - 5 = **27**. AWS reserves the network address, .1 router, .2 DNS, .3 future use and the
last address.

## 2. Which subnet? (easy)

Which subnet holds 10.20.47.9?

**Answer.** **app-c**. 10.20.32.0/20 runs from 10.20.32.0 to 10.20.47.255 (16 values of the third octet
starting at 32). ipaddress: ip_address("10.20.47.9") in ip_network("10.20.32.0/20") is True.

## 3. One rule for two subnets (easy)

What is the smallest single CIDR covering app-a and app-b, for a NACL rule?

**Answer.** **10.20.0.0/19** (ipaddress.collapse_addresses gives exactly that). It ends at 10.20.31.255, so
it does **not** include app-c — the trap from the security groups lesson.

## 4. Carving free space (medium)

The free block 10.20.56.0/21 must become four equal subnets for a new queue-worker tier. What are they?

**Answer.** /23s: **10.20.56.0/23, 10.20.58.0/23, 10.20.60.0/23, 10.20.62.0/23**. A /23 has 512
addresses, so **507** usable each on AWS (not 510, the textbook figure). The /21 ends at 10.20.63.255.

## 5. Public or private? (medium)

Subnet X has an explicit association with a table holding 10.20.0.0/16 -> local and ::/0 -> igw-..., and no
0.0.0.0/0 route. Instances have IPv6 addresses. Is X public?

**Answer.** **Public over IPv6**, private over IPv4. ::/0 to the internet gateway makes every instance with
an IPv6 address reachable from the internet if security groups allow it. For outbound-only IPv6, route ::/0
to an egress-only internet gateway instead.

## 6. Security groups for a cache (medium)

Pragati adds ElastiCache (Redis, port 6379) in the data subnets, used by the app tier and a nightly batch.
Write the inbound rules.

**Answer.** On a new group pragati-cache: TCP 6379 from **sg pragati-app**; TCP 6379 from **sg pragati-batch**.
Nothing else inbound. Not from 10.20.0.0/16 (that also admits the public tier and anything future), and
never from 0.0.0.0/0. Restrict its egress too — a cache never starts outbound connections.

## 7. NACL for the public subnets (hard)

Write NACL rules for public subnets holding only the ALB, which receives HTTPS from the internet and
forwards to targets on 8080 in the app subnets (10.20.0.0/18 covers all three app subnets).

**Answer.**

    in   100  tcp  0.0.0.0/0      443         allow   clients to the ALB
    in   110  tcp  10.20.0.0/18   1024-65535  allow   replies from targets
    out  100  tcp  0.0.0.0/0      1024-65535  allow   replies to clients
    out  110  tcp  10.20.0.0/18   8080        allow   ALB to targets
    in/out *  all  0.0.0.0/0      all         deny

Note 10.20.0.0/18 also covers the public and data subnets (it runs to 10.20.63.255); acceptable for a coarse
NACL. If port 80 serves the redirect, add in 80 as well. And the NAT gateways in these subnets need rules
too: in from the app range and out to the internet on the ports the apps call (mostly 443), plus the
ephemeral-port replies both ways — which is why many teams keep public NACLs at the default and rely on
security groups.

## 8. Pick the connection (medium)

For each, name the service: (a) app servers to DynamoDB without NAT; (b) ten VPCs plus the office, with
dev barred from prod; (c) one partner calls one Pragati service privately from the partner's own VPC, with
overlapping CIDRs; (d) private servers to the ECR API.

**Answer.** (a) DynamoDB **gateway endpoint**. (b) **Transit Gateway** with separate route tables. (c)
**PrivateLink endpoint service** behind an NLB — overlapping CIDRs do not matter because no routing is
shared. (d) ECR **interface endpoints** (plus the S3 gateway endpoint, because image layers come from S3).

## 9. Health-check timing (easy)

Target group: interval 10 seconds, unhealthy threshold 3, healthy threshold 5. How long until a hung
target stops getting traffic, and how long until a recovered one gets it again?

**Answer.** About **30 seconds** (3 x 10) to remove, about **50 seconds** (5 x 10) to restore.

## 10. Find world-open security groups with boto3 (hard)

Write a function that lists inbound rules open to 0.0.0.0/0 or ::/0, except 443 on the ALB's group.

**Answer** (run against moto with four groups: the ALB, an all-traffic temp-debug, SSH open to ::/0, and RDP
limited to an office /28):

    def world_open(ec2, allowed=(("pragati-alb", 443),)):
        out = []
        for g in ec2.describe_security_groups()["SecurityGroups"]:
            for p in g["IpPermissions"]:
                srcs = [r["CidrIp"] for r in p.get("IpRanges", []) if r["CidrIp"] == "0.0.0.0/0"] + \\
                       [r["CidrIpv6"] for r in p.get("Ipv6Ranges", []) if r["CidrIpv6"] == "::/0"]
                if not srcs:
                    continue
                lo, hi = p.get("FromPort", 0), p.get("ToPort", 65535)
                if p["IpProtocol"] == "-1":          # all traffic has no ports
                    lo, hi = 0, 65535
                if (g["GroupName"], lo) in allowed and lo == hi:
                    continue
                out.append((g["GroupName"], p["IpProtocol"], lo, hi, ",".join(srcs)))
        return sorted(out)

Output:

    ('legacy-sftp', 'tcp', 22, 22, '::/0')
    ('temp-debug', '-1', 0, 65535, '0.0.0.0/0')

The office RDP rule is correctly not listed; the IPv6 SSH rule would be missed by a check that looked only
at IpRanges. In a real account, wrap describe_security_groups in a paginator.`,
    mcqs: [
      mcq('How many assignable addresses does a /23 subnet give on AWS?', [
        ['507', true],
        ['510', false],
        ['512', false],
        ['254', false],
      ], 'A /23 has 512 addresses and AWS reserves five per subnet, leaving 507. 510 subtracts only the network and broadcast addresses, 512 ignores reservations, and 254 is the figure for a traditional /24.'),
      mcq('Which single CIDR covers app-a (10.20.0.0/20), app-b (10.20.16.0/20) and app-c (10.20.32.0/20), and nothing smaller would?', [
        ['10.20.0.0/18', true],
        ['10.20.0.0/19', false],
        ['10.20.0.0/20', false],
        ['10.20.32.0/19', false],
      ], 'The three /20s span 10.20.0.0 to 10.20.47.255; the smallest aligned block containing them is the /18 (to 10.20.63.255). A /19 stops at 10.20.31.255 and misses app-c, a /20 is only app-a, and 10.20.32.0/19 misses app-a and app-b.'),
      mcq('A route table holds 10.20.0.0/16 -> local and ::/0 -> igw, with no IPv4 default route. Instances there have IPv6 addresses. How should you describe the subnet?', [
        ['Private over IPv4 but reachable from the internet over IPv6', true],
        ['Private in every way, because there is no 0.0.0.0/0 route', false],
        ['Public over IPv4 because the table references an IGW at all', false],
        ['Isolated, because IPv6 routes need an egress-only gateway', false],
      ], '::/0 to the internet gateway gives IPv6 instances a public path, while IPv4 has no default route. Looking only at 0.0.0.0/0 misses this, an IGW reference does not make IPv4 public on its own, and the egress-only gateway is an option for outbound-only IPv6, not a requirement.'),
      mcq('Which inbound rule set for a new Redis cache group (6379) used by the app tier and a batch job is least open while still working?', [
        ['6379 from sg pragati-app, and 6379 from sg pragati-batch', true],
        ['6379 from 10.20.0.0/16, which already covers both tiers', false],
        ['All ports from sg pragati-app and from sg pragati-batch', false],
        ['6379 from 0.0.0.0/0, since the data subnets are private', false],
      ], 'Two group references admit exactly the two callers on exactly one port. The whole VPC range also admits the public tier and anything added later, all ports is broader than needed, and 0.0.0.0/0 relies on routing alone to keep the internet out.'),
      mcq('A security-group audit script checks only IpRanges for 0.0.0.0/0. Which risky rule will it miss?', [
        ['TCP 22 open to ::/0 under Ipv6Ranges', true],
        ['All traffic open to 0.0.0.0/0 for debug', false],
        ['TCP 3389 open to 0.0.0.0/0 on a jump box', false],
        ['TCP 5432 open to 0.0.0.0/0 on a database', false],
      ], 'IPv6 sources live in Ipv6Ranges, so an IPv4-only check misses SSH open to the whole IPv6 internet. The other three rules use 0.0.0.0/0 in IpRanges and would be found.'),
    ],
  },
  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_NETWORKING_INTERVIEW_QUESTION',
    notes: `AWS networking comes up in nearly every cloud, DevOps and SRE interview, at product companies and GCCs
alike, usually as "design this" or "this is broken, what do you check". Interviewers listen for an
**order** (you walk the path), **precise words** (stateful, longest prefix, non-transitive) and **trade-offs
with reasons** (cost, blast radius, operability). Four questions follow, each with a model answer and the
follow-up a good answer earns. Practise them aloud; two minutes per answer.

## Q1. "A user types our URL and gets a page. Walk me through the network path on AWS."

**Model answer.** "The browser asks its resolver for app.pragatipay.example. The resolver follows the
delegation to our Route 53 public hosted zone, which returns an alias answer — CloudFront or the ALB's
current addresses. If CloudFront is in front, the nearest edge terminates TLS and either serves a cached
static file or forwards the request to the origin, our internet-facing ALB in two public subnets. The ALB
terminates TLS with an ACM certificate, matches a listener rule — say /api/* — and forwards to a healthy
target in the target group, an app pod in a private subnet. That hop is allowed because the app's security
group admits 8080 from the ALB's group. The app queries PostgreSQL in a data subnet, allowed by the DB
group referencing the app group. Replies return the same way; security groups are stateful so no reply
rules are needed. If the app calls a partner API, it goes out through the NAT gateway in its AZ; S3 calls
go through the gateway endpoint."

**Follow-up:** "Where can it fail, and how would you know?" Name a failure per hop with its signal: DNS
(dig from outside), TLS (certificate name or expiry, browser error), ALB 503 (no healthy targets) versus
502 (bad response from a target), security group or NACL (timeouts; flow log REJECT), app (5xx in
application logs), database (connection errors, max connections). The interviewer wants the habit of
following the request, not a list of services.

## Q2. "Security groups versus network ACLs. When would you use each?"

**Model answer.** "Security groups attach to network interfaces, have allow rules only, and are stateful —
a reply to an allowed connection is allowed automatically. They can reference other groups, so 'DB allows
5432 from the app group' stays right as instances scale. NACLs attach to subnets, are stateless — the reply
needs its own rule, to the ephemeral port range — and have numbered allow and deny rules evaluated lowest
first. I do the precise work in security groups and use NACLs as a coarse fence: deny a known-bad range,
or keep data subnets from talking to public subnets at all. Every NACL rule is one more thing to check in
an incident, so I keep them few."

**Follow-up:** "You added the security group rule and it still times out. Next?" "Check the NACLs in
both directions — especially the outbound reply to ephemeral ports — then routes on both sides, then the
flow logs on the destination interface for REJECT, or run Reachability Analyzer between the two
resources. If the client says 'connection refused' instead, the network is fine and the service is not
listening."

## Q3. "Design the VPC for a three-tier app that must survive an AZ failure."

**Model answer.** "A /16 from our address plan, chosen not to overlap anything we may connect to —
offices, other VPCs, partners. Two or three AZs, three tiers in each: small public subnets for the ALB and
NAT gateways, large private app subnets because EKS gives each pod an IP, small data subnets with no
default route. Public route table to the IGW; one NAT gateway per AZ with each app subnet routing to its
own AZ's NAT; main route table left local-only and every subnet explicitly associated. S3 and DynamoDB
gateway endpoints on day one. Security groups chained ALB to app to DB. RDS Multi-AZ in the data subnets.
Flow logs on. I'd leave most of the /16 unallocated for growth."

**Follow-up:** "The NAT bill is huge. What do you do?" "Find what flows through it — NAT byte metrics and
flow logs grouped by destination. Usually it's S3 and ECR: the S3 gateway endpoint is free and takes most
of it; add ECR and other interface endpoints where the traffic justifies their hourly cost. Check for
cross-AZ NAT routing too. I'd keep one NAT per AZ in prod; in dev, one shared NAT is acceptable."

## Q4. "We have 20 VPCs across accounts and a data centre. How do you connect them?"

**Model answer.** "Peering would need 190 connections for a full mesh and isn't transitive, so a Transit
Gateway per region, shared to the other accounts with Resource Access Manager. VPCs attach to it; the data
centre comes in over Direct Connect with a Site-to-Site VPN as backup, both on the TGW. TGW route tables
segment traffic: prod, non-prod and shared services, with non-prod never routing to prod. TGWs peer across
regions for DR. The prerequisite is a non-overlapping address plan, ideally managed in VPC IPAM."

**Follow-up:** "We acquired a company whose VPC overlaps ours. Now what?" "Overlapping ranges can't be
routed together. If they only need a few services, expose them with PrivateLink — an endpoint service on an
NLB — which needs no routing between the networks. Long term, re-address their VPC from our plan. NAT-based
workarounds exist but are hard to operate; I'd treat them as temporary."`,
    mcqs: [
      mcq('In an interview you are asked why the app tier needs no outbound rule for its replies to the ALB. Which answer is precise?', [
        ['Security groups are stateful, so replies to allowed connections pass', true],
        ['The ALB opens a second connection back to receive each app response', false],
        ['Outbound security group rules apply only to traffic to the internet', false],
        ['The NACL on the app subnet already allows all ephemeral reply ports', false],
      ], 'Statefulness is the reason: the security group tracks the connection the ALB opened and lets the reply out. The ALB does not open return connections, outbound rules apply to all destinations, and NACLs are a separate check that does not explain security group behaviour.'),
      mcq('An interviewer says: "We acquired a company whose VPC CIDR overlaps ours; they need two of our APIs next month." What is the strongest first answer?', [
        ['Expose the two APIs through a PrivateLink endpoint service', true],
        ['Peer the two VPCs and route only the non-overlapping parts', false],
        ['Attach both VPCs to a Transit Gateway with a shared route table', false],
        ['Re-address our own VPC before the deadline to remove the clash', false],
      ], 'PrivateLink publishes a service through an NLB with no routing between the VPCs, so overlap does not matter. Peering and TGW routing both need unambiguous, non-overlapping ranges, and re-addressing your own production VPC in a month is the riskiest option.'),
      mcq('Asked to design for AZ failure, a candidate puts one NAT gateway in ap-south-1a for all private subnets. Which interviewer follow-up exposes the flaw?', [
        ['What happens to app-b\'s outbound traffic if ap-south-1a fails?', true],
        ['Which route table does the NAT gateway itself need to be placed in?', false],
        ['How many IP addresses does a NAT gateway take in its own subnet?', false],
        ['Why did you choose a /16 range for the VPC rather than a /20 one?', false],
      ], 'A NAT gateway is zonal, so a single one makes every AZ depend on ap-south-1a for outbound access — the design no longer survives an AZ failure. The other questions are reasonable but do not test the availability flaw.'),
    ],
  },
  /* ── MINI_PROJECT ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_NETWORKING_MINI_PROJECT',
    notes: `## The scenario

**TicketKatta** (fictional) is a Pune start-up selling tickets for concerts, stand-up shows and college fests
across Maharashtra. It runs on a single EC2 instance in the default VPC with PostgreSQL on the same box,
SSH open to the world, and a DNS A record pointing at the instance's public IP. Last month a popular
show's sale opened at 7 pm; the instance fell over at 7:02, and the founders spent the evening restarting
it. They have raised money and hired you as their first cloud engineer.

Your job in this project is the **network**: a production-grade VPC for a three-tier booking app in AWS
Mumbai (ap-south-1), built, tested, documented and costed. Compute and the database engine itself are
later topics; here you build the places they will live and the paths between them.

## Requirements from the founders (and what they mean)

- "Never go down at 7 pm again." Two AZs for every tier; an ALB health-checking the app; no single NAT.
- "Customers' payment and phone data must be safe." Data tier with no route to the internet; database
  reachable only from the app tier; no SSH from anywhere (Session Manager instead).
- "Our payment gateway partner calls us back." A webhook path on the ALB (/webhooks/*) to the app.
- "We will open an office VPN and a staging account next year." An address plan that clashes with neither
  the office (192.168.10.0/24) nor the payment partner's VPN range (10.20.0.0/16), and leaves room for staging.
- "Our AWS bill must not surprise us." A budget alarm before anything is built; a cost estimate; every
  resource torn down after the demo.

## Data you are given

- Expected peak: a sale opening brings roughly ten times normal traffic for about twenty minutes.
- App tier: containers on ECS or EKS later; plan for up to 600 tasks or pods at peak, one VPC IP each.
- Data tier: one PostgreSQL primary and a standby (RDS Multi-AZ later), plus Redis.
- Static assets (posters, JS bundles) will move to S3 behind CloudFront.
- Domain: ticketkatta.example in the brief. If you own a real domain, you may use a subdomain of it; if
  not, build Route 53 and ACM in moto and the live ALB with a self-signed test only — say which in the README.

## Safety and cost rules (read before milestone 1)

1. Create an AWS Budget with an email alert at a small amount **before** creating anything. Screenshot it.
2. Build everything first in **moto** (boto3 against mock AWS) — free and repeatable. Only then, if you
   choose, build the live version for a short demo window.
3. NAT gateways, ALBs, public IPv4 addresses and interface endpoints are billed by the hour. Read their
   pricing pages, estimate a two-hour demo in the AWS Pricing Calculator, and **delete everything** right
   after. Show the teardown output.
4. No security group may allow 0.0.0.0/0 or ::/0 except the ALB on 80 and 443. No real keys, account IDs
   or secrets in the repository — use 123456789012 and fake values in docs.

## Deliverables

1. **Address plan** (address-plan.md and plan.py): the VPC CIDR and every subnet, with usable counts,
   computed by Python's ipaddress; a clash check against the office, the partner and the default VPC;
   free blocks listed; the reason for each size.
2. **Build script** (build_network.py, boto3): VPC, six subnets in two AZs, IGW, two NAT gateways (one per
   AZ), route tables (public, app-a, app-b, data) explicitly associated, the main table left local-only, S3
   gateway endpoint on app and data tables, security groups (alb, app, db, cache) chained by group
   reference, a NACL for the data subnets with reply rules, ALB in two public subnets with an HTTPS
   listener (ACM certificate) and an HTTP listener that redirects with a 301, a target group with a
   /healthz check, a listener rule for /webhooks/*, a Route 53 zone with an alias A record for
   ticketkatta.example and www, and a weighted pair for a future canary. It must run cleanly against moto.
3. **Verification script** (verify_network.py): prints for each subnet whether it is public or private and
   why (route table and default-route target, including the main-table fallback); lists any world-open
   security group rule (expect only the ALB's 80/443); asserts that the db group admits 5432 only from the
   app group; prints the Route 53 records. Include its real output in the README.
4. **Diagram** (one PNG or draw.io file): AZs, subnets with CIDRs, gateways, endpoints, ALB, security
   group arrows, and the request path for a ticket purchase.
5. **Cost estimate** (cost.md): line items for a month of production and for the two-hour demo, taken
   from the Pricing Calculator (export or screenshot), with one paragraph on the biggest cost and how you
   would reduce it (NAT and endpoints are the usual answer).
6. **README**: decisions and trade-offs, what moto accepted that real AWS would refuse (find at least one),
   the live-demo evidence if you did one (curl -I showing the 301 and the 200, then the teardown), and a
   one-page runbook "the site times out — what to check, in order".

## Milestones

- **Day 1 — plan.** Budget alarm; address plan and clash check; diagram draft. Review: does the app tier
  hold 600 IPs per AZ with room to spare? (A /22 gives 1,019 usable; a /21 gives 2,043.)
- **Day 2 — routing.** Subnets, IGW, NATs, route tables, endpoint, in moto; verification script showing
  public, app and data subnets classified correctly.
- **Day 3 — filters.** Security groups and the data NACL; the world-open check; a deliberate mistake
  (add 22 from 0.0.0.0/0) that your check catches, then removed.
- **Day 4 — entry.** ALB, target group, listeners, rules, Route 53 and ACM; verification output complete.
- **Day 5 — evidence.** Cost estimate, README and runbook; optional live demo of at most two hours, with
  teardown proof.

## How it will be judged

A reviewer will run your build and verify scripts against moto, read your plan and diagram, and ask "why"
about every size and every rule. A working build with no reasons scores lower than a slightly smaller
build where every decision is explained.`,
    assignment: {
      title: 'The Network for a Three-Tier App: TicketKatta on AWS Mumbai',
      description: 'Design, build (in moto, optionally live for a short demo), verify, document and cost a two-AZ VPC for a Pune ticket-booking start-up: public, app and data subnets, per-AZ NAT, an S3 gateway endpoint, chained security groups and a data NACL, an ALB with TLS and path rules, and Route 53 records.',
      instructions: `1. Create an AWS Budget alert before building anything, and keep all secrets and real account IDs out of the repository.
2. Write plan.py and address-plan.md: a VPC CIDR and six subnets across two AZs computed with ipaddress, with usable counts, a clash check against 192.168.10.0/24, 10.20.0.0/16 and 172.31.0.0/16, free blocks, and the reason for each size (the app tier must hold 600 IPs per AZ).
3. Write build_network.py (boto3) that builds the VPC, subnets, IGW, one NAT gateway per AZ, explicitly associated route tables (main table local-only), an S3 gateway endpoint, alb/app/db/cache security groups chained by group reference, a data-subnet NACL with reply rules, an ALB with an HTTPS listener and a 301 redirect on HTTP, a /healthz target group, a /webhooks/* rule, and Route 53 alias and weighted records. It must run cleanly against moto.
4. Write verify_network.py that classifies every subnet as public or private with the reason, lists world-open rules (only the ALB's 80/443 may appear), asserts the db group admits 5432 only from the app group, and prints the DNS records; paste its real output into the README.
5. Draw the diagram with AZs, subnets and CIDRs, gateways, endpoint, ALB, security-group arrows and the request path for a ticket purchase.
6. Write cost.md from the AWS Pricing Calculator for one month of production and for a two-hour demo, naming the biggest cost and how to reduce it.
7. Finish the README: decisions and trade-offs, at least one thing moto accepted that real AWS refuses, live-demo evidence and teardown proof if you ran it live, and a "site times out" runbook in checking order.`,
      rubric: [
        { criterion: 'Address plan', description: 'Non-overlapping CIDR chosen for stated reasons; subnet sizes justified against 600 IPs per AZ; usable counts and clash check computed with ipaddress; free space kept and listed.', maxPoints: 20 },
        { criterion: 'Routing and gateways', description: 'Public, app and data tiers routed correctly; one NAT per AZ with same-AZ routes; main route table left local-only with explicit associations; S3 gateway endpoint on app and data tables.', maxPoints: 20 },
        { criterion: 'Security groups and NACL', description: 'Chained group references, no world-open rule except the ALB on 80/443, no SSH; data NACL that works in both directions; the world-open check catches a planted mistake.', maxPoints: 20 },
        { criterion: 'Load balancer, TLS and DNS', description: 'ALB in two AZs with HTTPS, a 301 redirect, an honest /healthz check and the webhook rule; ACM certificate by DNS validation; alias records at the apex and a weighted pair.', maxPoints: 15 },
        { criterion: 'Verification and evidence', description: 'Build and verify scripts run cleanly against moto; real output in the README; a moto-versus-AWS difference identified; teardown proof if a live demo was run.', maxPoints: 15 },
        { criterion: 'Diagram, cost and runbook', description: 'Clear diagram with the request path; cost estimate from the calculator with the biggest cost explained; a runbook that walks DNS, routes, NACLs, security groups and the service in order.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    mcqs: [
      mcq('TicketKatta\'s app tier must hold about 600 pod IPs per AZ at peak, with room to grow. Which app subnet size is the smallest sensible choice?', [
        ['/22, which gives 1,019 usable addresses', true],
        ['/23, which gives 507 usable addresses', false],
        ['/24, which gives 251 usable addresses', false],
        ['/16, which gives 65,531 usable addresses', false],
      ], 'A /22 holds 1,019 assignable addresses (1,024 minus AWS\'s five), above 600 with headroom. A /23 and a /24 are too small for the peak, and a /16 would consume the whole VPC for one subnet, which is impossible alongside the other tiers.'),
      mcq('The brief says the payment partner\'s VPN uses 10.20.0.0/16. Why does that rule out 10.20.0.0/16 for TicketKatta\'s VPC even before any VPN exists?', [
        ['Overlapping ranges cannot be routed together once the VPN is added', true],
        ['AWS reserves every range used by a payment partner for their own VPN', false],
        ['Subnets in a 10.20.0.0/16 VPC cannot be associated with route tables', false],
        ['Route 53 refuses to create records for VPCs in overlapping ranges', false],
      ], 'A VPN or any routed link needs unambiguous destinations, so the VPC must not overlap the partner\'s range; choosing now avoids rebuilding later. AWS does not reserve partners\' ranges, route tables work in any valid range, and Route 53 records are unaffected by CIDRs.'),
    ],
  },
  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AWS_NETWORKING_CHECKPOINT',
    notes: `Ten questions across the topic: address plans, routing and gateways, security groups and NACLs, private
connectivity, Route 53, and load balancers with CloudFront. Answer without notes; the result shows which
lesson to revisit.`,
    checkpoint: [
      mcq('A fintech plans VPCs for prod, staging and dev in Mumbai and Hyderabad, plus a VPN to a bank. Which habit best prevents address clashes later?', [
        ['A written per-environment /16 allocation, checked against every partner range', true],
        ['Reusing 10.0.0.0/16 everywhere, since VPCs in separate accounts are isolated', false],
        ['Taking the default VPC range in each account and region to keep things simple', false],
        ['Choosing ranges when each VPC is created and renumbering if a clash appears', false],
      ], 'A single allocation table (or VPC IPAM), checked against offices and partners, keeps every range unique. Identical ranges block peering, TGW and VPN routing later, default VPCs all share 172.31.0.0/16, and subnets cannot be renumbered in place.'),
      mcq('Which statement about subnets and Availability Zones in an AWS VPC is correct?', [
        ['Each subnet lives in exactly one AZ, so a tier spans AZs through several subnets', true],
        ['Each subnet spans all the AZs of its region, so one subnet per tier is enough', false],
        ['Each subnet spans two AZs, chosen by AWS when the subnet is first created', false],
        ['Subnets are global, and the AZ is chosen per instance when it is launched', false],
      ], 'AWS subnets are zonal, so high availability means the same tier in subnets in two or more AZs. Regional subnets are an Azure trait, AWS never spreads one subnet across two AZs, and subnets belong to one VPC in one region.'),
      mcq('A route table has 10.20.0.0/16 -> local, 10.40.0.0/16 -> pcx-1 and 0.0.0.0/0 -> nat-1. Where does traffic to 10.40.3.8 go?', [
        ['Through the peering connection pcx-1', true],
        ['Through the NAT gateway nat-1', false],
        ['To the local route of the VPC', false],
        ['Nowhere; the packet is dropped', false],
      ], '10.40.0.0/16 is the most specific route matching 10.40.3.8, so it wins over the default route. The NAT route only catches unmatched destinations, the local route covers 10.20.0.0/16, and a matching route exists, so nothing is dropped.'),
      mcq('Why does a production VPC usually run one NAT gateway per Availability Zone?', [
        ['A NAT gateway is zonal, so sharing one ties every AZ to it', true],
        ['Each NAT gateway can serve exactly one private subnet only', false],
        ['NAT gateways stop working when traffic crosses an AZ line', false],
        ['AWS requires one NAT per AZ before a VPC can use the IGW', false],
      ], 'Per-AZ NAT keeps an AZ\'s outbound access independent of other AZs and avoids cross-AZ charges. One NAT can serve many subnets, cross-AZ traffic does work (it is just a dependency and a cost), and the IGW has no such requirement.'),
      mcq('Pragati\'s data subnets must let the app tier reach PostgreSQL and nothing else. Where should the precise rule live?', [
        ['In the database security group, allowing 5432 from the app group', true],
        ['In the data subnet NACL, allowing 5432 from the whole VPC range', false],
        ['In the data route table, as a route to the app subnets only', false],
        ['In the app security group, as an outbound deny for other ports', false],
      ], 'Security groups give exact, stateful, identity-based rules. A NACL rule from the whole VPC is coarse and needs reply rules, route tables decide paths rather than permission, and security groups have no deny rules.'),
      mcq('A private subnet must read objects from S3 and items from DynamoDB without NAT and at no extra endpoint charge. What do you add?', [
        ['Gateway endpoints for S3 and DynamoDB on its route table', true],
        ['Interface endpoints for S3 and DynamoDB in each AZ', false],
        ['A VPC peering connection to the S3 and DynamoDB VPC', false],
        ['An egress-only internet gateway for the two services', false],
      ], 'Gateway endpoints exist for exactly these two services, add prefix-list routes and carry no hourly or data charge. Interface endpoints work but are billed, AWS services are not peering targets, and the egress-only gateway is for IPv6 internet traffic.'),
      mcq('Which pair of facts about VPC peering is correct?', [
        ['It is non-transitive, and the two VPC ranges must not overlap', true],
        ['It is transitive, and the two VPC ranges must not overlap', false],
        ['It is non-transitive, and overlapping ranges are translated', false],
        ['It is transitive, and it works only inside a single account', false],
      ], 'Peering links exactly two VPCs, cannot carry traffic onward, and refuses overlapping CIDRs. It is never transitive, AWS does not translate overlapping ranges for peering, and peering works across accounts and regions.'),
      mcq('Pragati wants its bare domain pragatipay.example to follow a CloudFront distribution. Which Route 53 record is correct?', [
        ['An alias A record at the apex targeting the distribution', true],
        ['A CNAME at the apex pointing at the cloudfront.net name', false],
        ['An A record at the apex holding one edge location\'s IP', false],
        ['An MX record at the apex naming the distribution domain', false],
      ], 'Alias records work at the apex and track the distribution\'s addresses. A CNAME cannot coexist with the apex SOA and NS records, edge IPs vary by location and change, and MX records route mail, not web traffic.'),
      mcq('An internet-facing ALB must be created for an app that will later run in two AZs. What does the ALB itself require?', [
        ['Subnets in at least two Availability Zones', true],
        ['An Elastic IP address in each Availability Zone', false],
        ['A NAT gateway in each of its public subnets', false],
        ['A private hosted zone associated with its VPC', false],
      ], 'An ALB is created with subnets in two or more AZs (public ones when internet-facing). Elastic IPs are an NLB feature, NAT gateways serve outbound traffic from private subnets, and a private hosted zone is unrelated to creating the ALB.'),
      mcq('A CloudFront distribution fronts Pragati\'s ALB, but scanners still hit the ALB\'s own DNS name directly. Which change closes that bypass?', [
        ['Allow only the CloudFront origin-facing prefix list, and check a secret header', true],
        ['Delete the ALB\'s own amazonaws.com DNS name so that scanners cannot resolve it', false],
        ['Lower the ALB idle timeout so that direct connections are dropped more quickly', false],
        ['Turn on Shield Standard for the ALB so that direct requests are blocked by it', false],
      ], 'Restricting the ALB security group to CloudFront\'s managed prefix list and requiring a header that only CloudFront sends stops direct access. The ALB\'s AWS-managed DNS name cannot be deleted, the idle timeout does not filter callers, and Shield Standard is always on and defends against network attacks, not direct access.'),
    ],
  },
];
