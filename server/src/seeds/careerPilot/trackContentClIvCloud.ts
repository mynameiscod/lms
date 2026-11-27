/**
 * Career-track placement content: Cloud Engineer Interview Questions (CL_IV_CLOUD), Cloud & DevOps
 * Engineer, batch CL4.
 *
 * Year-4 interview versions of what the track taught: AWS foundations (CL_AWS_FOUNDATIONS), networking
 * (CL_AWS_NETWORKING), compute and storage (CL_AWS_COMPUTE_STORAGE), databases (CL_AWS_DATABASES),
 * serverless (CL_SERVERLESS), security and cost (CL_SECURITY_COST) and Azure (CL_AZURE). Each set gives the
 * question, what the interviewer is testing, a spoken model answer, the follow-up a good answer earns and
 * the weak answer that loses the round; nothing is re-taught. The questions are chosen to sit beside, not
 * repeat, the four interview questions at the end of each of those topics.
 *
 * Context: fresher cloud engineer, DevOps and SRE roles at product companies, GCCs, IT services firms and
 * start-ups in Bengaluru, Hyderabad, Pune and Chennai. AWS first, Azure second. Account ids are the fake
 * 123456789012; no prices or free-tier figures are stated. The STS, availability-zone, DynamoDB and RDS
 * outputs quoted were run against moto 5.2 with boto3 1.43; the address and availability arithmetic was
 * run in Python.
 *
 * Attribution: the topic is multi-skill. Each IV_* unit declares one skill and its checkpoint questions
 * name it with ck(); the CHECKPOINT unit spreads its ten over the four skills. Practice mcqs name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_CL_IV_CLOUD_BUNDLES: PilotBundle[] = [
  /* ── IV_AWS_CORE ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_IV_CLOUD_IV_AWS_CORE',
    notes: `The first technical round for a fresher cloud role — at a GCC in Hyderabad, a fintech in Bengaluru or a
services firm's cloud practice in Pune — almost always opens on AWS fundamentals. The panel is not checking
that you can expand "IAM". It is checking whether you can **apply** regions, identity and the shared
responsibility model to a real system and say what you would check. You met all of this in AWS Foundations
and Compute and Storage; the end-of-topic questions there (user versus role, how a deny is decided, a leaked
key, a start-up's account layout) are assumed. These are the next ones panels ask. Each has what is tested, a
model answer to say aloud in about two minutes, the follow-up a good answer earns, and the weak answer.

## Q1. "We are a Mumbai payments start-up. Which region do we run in, and why?"

**Testing:** whether region choice is a decision with reasons, not a habit.

**Model answer.** "Four things decide it: where the data may live, latency to users, which services the
region offers, and cost. Payment data in India has to stay in India under RBI's storage rules, so it is
ap-south-1 Mumbai or ap-south-2 Hyderabad — I would confirm the exact obligations with compliance. Most of
our users are in India, so latency agrees. Mumbai is the older region and has the widest service list, so I
would run primary in Mumbai and check the regional services list before relying on anything in Hyderabad.
Prices differ between regions, so I would compare them in the pricing calculator rather than assume."

**Follow-up:** "And disaster recovery?" — Hyderabad, because it keeps the copy in India and is a separate
region. Then I check the DR plan only uses services Hyderabad actually has.

**Weak answer:** "us-east-1, because everything launches there first."

## Q2. "What is an Availability Zone, and what does 'we run in two AZs' actually protect us from?"

**Testing:** whether you know the failure domain, not just the name.

**Model answer.** "An AZ is one or more data centres in a region with independent power, cooling and
networking, close enough to the other AZs for low-latency links. Running across two AZs protects against a
data-centre-level failure — power, a network fault, a fire — and against AWS maintenance in one zone. It does
not protect against a region-wide problem, a bad deployment, a deleted table or a wrong security group,
because those hit both zones at once."

**Follow-up:** "Your colleague says their ap-south-1a is having problems. Is it the same as yours?" — Not
necessarily. AZ names are mapped per account; the AZ **ID** is the same everywhere. In moto the mapping
prints as:

    ap-south-1a aps1-az1
    ap-south-1b aps1-az3
    ap-south-1c aps1-az2

so I compare IDs such as aps1-az1, which describe-availability-zones returns, never names.

**Weak answer:** "An AZ is a backup region."

## Q3. "Explain shared responsibility for EC2, RDS and Lambda."

**Testing:** whether you see the line move with the service — and what never moves.

**Model answer.** "AWS always owns the physical layer, the hypervisor and the software behind managed
services. On EC2 I own the operating system: patching, the agent, the firewall, what runs on it. On RDS AWS
patches the engine and OS during my maintenance window, but whether the database is publicly accessible, its
security group, encryption and backups are mine. On Lambda AWS runs and patches the runtime; I own my code,
its dependencies, its execution role and the secrets it reads. Three things never move: identity,
configuration and data are always mine."

**Follow-up:** "An RDS instance was reachable from the internet. Whose fault?" — Ours. Publicly accessible
plus a security group open to 0.0.0.0/0 are customer settings.

**Weak answer:** "AWS handles security in the cloud and we handle security of the cloud." (It is the other
way round, and the answer has no examples.)

## Q4. "This policy lets the app list the bucket but not read files. Why?"

The interviewer shows:

    {"Effect": "Allow",
     "Action": ["s3:ListBucket", "s3:GetObject"],
     "Resource": "arn:aws:s3:::kosh-reports"}

**Testing:** whether you read ARNs precisely.

**Model answer.** "ListBucket acts on the bucket, whose ARN is arn:aws:s3:::kosh-reports. GetObject acts on
objects, whose ARNs are arn:aws:s3:::kosh-reports/key. The statement only names the bucket, so no object
matches and GetObject falls through to the implicit deny. I would split it into two statements: ListBucket on
the bucket ARN, GetObject on kosh-reports/reports/* — the narrowest prefix the app needs."

**Follow-up:** "It still fails after the fix." — Then I check the other layers: a bucket policy deny, a KMS
key policy if the objects use SSE-KMS (the role also needs kms:Decrypt), an SCP, and whether the code is
even running as that role.

**Weak answer:** "Give it s3:* on *."

## Q5. "How does code on one account read a bucket in another account?"

**Testing:** identity-based versus resource-based policy, and roles across accounts.

**Model answer.** "Two ways. With a resource policy: the bucket policy in account B names account A's role as
principal, and A's role's own policy allows the S3 actions — cross-account, both sides must allow. Or with a
role in B: B creates a role whose trust policy lets A's role assume it, A calls sts:AssumeRole and uses the
temporary credentials. The role pattern is better when many resources or services are involved; the bucket
policy is simpler for one bucket. Within one account, either an identity policy or the bucket policy alone
can grant access."

**Follow-up:** "A vendor's SaaS needs a role in our account. What do you add?" — An external ID condition in
the trust policy, so the vendor cannot be tricked into using our role for another customer (the confused
deputy problem).

**Weak answer:** "Create an IAM user in account B and give account A the keys."

## Q6. "How do you know which identity your code is really running as?"

**Testing:** a debugging habit, not a definition.

**Model answer.** "sts get-caller-identity, from the same place the code runs — the instance, the container,
the pipeline. Run against moto, a direct user and an assumed role look like this:

    arn:aws:sts::123456789012:user/moto
    arn:aws:sts::123456789012:assumed-role/reports-app/i-0abc123

The second is what I want to see on EC2: the instance's role, with the session name. If I see a user ARN
instead, somebody left access keys in environment variables or ~/.aws, and they win over the instance role in
the credential chain."

**Follow-up:** "Where do the role's credentials come from on EC2?" — The instance metadata service, which
should require IMDSv2 tokens.

**Weak answer:** "I check the IAM console."

## Q7. "Why does IMDSv2 matter?"

**Testing:** whether you connect a setting to an attack.

**Model answer.** "With IMDSv1, any code that can make the instance send an HTTP GET to 169.254.169.254 can
read the role's credentials — the classic case is a server-side request forgery bug in a web app that fetches
URLs. IMDSv2 requires a session token obtained by a PUT with a TTL header first, which a simple forwarded GET
cannot do. I would require IMDSv2 in the launch template and find old instances with a script."

**Follow-up:** "Containers on that host cannot get credentials after you enforced it." — The hop limit: a
limit of 1 stops the token response one network hop away, so containers behind a bridge network need 2.

**Weak answer:** "It is the newer version, so it is faster."

## Q8. "Stop, hibernate, terminate — what survives each?"

**Testing:** lifecycle facts that cause real data loss.

**Model answer.** "Stop keeps the EBS volumes and loses RAM and instance-store data; the public IPv4 address
changes unless it is an Elastic IP, and I still pay for the volumes. Hibernate saves RAM to the encrypted
root volume so the app resumes warm. Terminate deletes the instance and, by default, its root volume; extra
volumes stay unless DeleteOnTermination is set. Anything precious should not live on one instance anyway."

**Follow-up:** "A partner allow-listed our server's IP and it broke after maintenance." — It was a plain
public IP. Use an Elastic IP or, better, a NAT gateway or load balancer address that does not change.

**Weak answer:** "Stop and terminate are the same; you can start it again."

## How you are judged

Strong answers name the mechanism (an ARN, a trust policy, a token), give one India-relevant example and say
what they would check next. Weak answers are definitions, or "give it admin". If you do not know, say how you
would find out — the docs, get-caller-identity, CloudTrail — that is an answer; a confident guess is not.`,
    workedExample: `**Question: "Our report service on EC2 in Mumbai gets AccessDenied reading a PDF from S3. The
developer says the role has full S3 access. Walk me through it."**

**A weak answer (heard often):**

"I would attach AdministratorAccess to the role and try again. If that works, we know it is permissions."

What the panel hears: guessing with production privileges. It proves nothing — an explicit deny or an SCP
would still block admin — and it leaves a dangerous role behind.

**A strong answer:**

"First, who is calling? I run sts get-caller-identity on the instance. If it is not the role — say a user
ARN — someone left keys in environment variables, and those are what the SDK used. That is the most common
surprise.

If it is the role, I read the error message and CloudTrail's event for the call; newer AccessDenied messages
often say which kind of policy denied it.

Then the layers, in order. The role's policy: does GetObject have the object ARN with /*, not just the
bucket? The bucket policy: an explicit deny, for example one that requires the VPC endpoint — if the
instance reaches S3 through a NAT gateway, aws:SourceVpce does not match. Encryption: if the object uses
SSE-KMS, the role needs kms:Decrypt and the key policy must allow the account to delegate to IAM. Above
everything: an SCP on the account.

Each check takes a minute. I fix the specific layer with the narrowest change — kosh-reports/reports/* not
s3:* — and write down what it was, because the same mistake will be in the next service."

**Why it scores:** it starts with identity, uses evidence (the error and CloudTrail), walks the evaluation
layers in a sensible order, names the two traps juniors miss (the object ARN and KMS), and fixes narrowly.`,
    mcqs: [
      mcq('A policy grants s3:GetObject with Resource "arn:aws:s3:::kosh-reports". Reading kosh-reports/q3.pdf is denied. What does an interviewer expect you to spot?', [
        ['Object actions need the object ARN, kosh-reports/*, not the bucket ARN', true],
        ['GetObject needs ListBucket on the same statement before it can work', false],
        ['Bucket ARNs must include the region and the account id to be valid', false],
        ['The PDF must have been uploaded by the same role that is reading it', false],
      ], 'GetObject is evaluated against arn:aws:s3:::bucket/key, so a statement naming only the bucket matches no object. ListBucket is separate and not a prerequisite, S3 ARNs carry no region or account, and object ownership is enforced to the bucket owner on new buckets.'),
      mcq('Asked "what does running in two AZs not protect you from?", which answer is strongest?', [
        ['A power or network failure in a single data-centre building', false],
        ['Routine AWS maintenance that affects one zone at a time', false],
        ['A bad deploy or a deleted table, which hit both AZs at once', true],
        ['A hardware fault on the host that runs one of your instances', false],
      ], 'Multi-AZ protects against failures confined to one zone. Mistakes in software, data or configuration are replicated to every zone, which is why backups and safe deploys are separate controls. The other three are exactly what a second AZ covers.'),
      mcq('On an EC2 instance, get-caller-identity prints arn:aws:sts::123456789012:user/build-bot instead of the instance role. What is the likely cause?', [
        ['The instance profile is detached whenever IMDSv2 is enforced', false],
        ['Access keys in env variables or ~/.aws win in the credential chain', true],
        ['STS always reports the user who launched the instance originally', false],
        ['The role\'s session expired and STS fell back to a default user', false],
      ], 'The SDK and CLI check explicit environment variables and the shared credentials file before the instance metadata service, so stray keys silently replace the role. IMDSv2 does not detach profiles, STS reports the caller not the launcher, and expired role credentials are refreshed, not swapped for a user.'),
    ],
    checkpoint: [
      ck('CLOUD_FUNDAMENTALS', 'A Mumbai payments company must keep payment data in India and wants a DR region. Which pairing fits?', [
        ['Primary in ap-south-1 and DR in ap-south-2, after checking services', true],
        ['Primary in us-east-1, since new services always launch there first', false],
        ['Primary in ap-south-1 and DR in ap-southeast-1 Singapore, the closest', false],
        ['Two AZs in ap-south-1 only, since AZs count as separate regions', false],
      ], 'Mumbai and Hyderabad keep both copies in India, and the DR plan must use only services Hyderabad offers. Singapore and us-east-1 move data out of India, and AZs are parts of one region, not separate regions.'),
      ck('CLOUD_FUNDAMENTALS', 'A SaaS monitoring vendor asks for a role in your account. What should the role’s trust policy add beyond the vendor’s account?', [
        ['A condition that only allows calls made from the ap-south-1 region', false],
        ['A permissions boundary listing every service the vendor may call', false],
        ['An MFA condition, since the vendor will sign in to assume it', false],
        ['An sts:ExternalId condition, against the confused-deputy problem', true],
      ], 'An external ID the vendor stores per customer stops another of its customers from tricking it into assuming your role. A region condition does not address that, a boundary limits permissions rather than who may assume, and the vendor’s software cannot answer an MFA prompt.'),
      ck('CLOUD_FUNDAMENTALS', 'After IMDSv2 was enforced with a hop limit of 1, containers on an EC2 host can no longer get role credentials. What fixes it?', [
        ['Switch the host back to IMDSv1, since containers cannot use tokens', false],
        ['Raise the PUT response hop limit to 2 for that instance', true],
        ['Copy the role’s access keys into each container’s environment', false],
        ['Give the containers a public IP so they reach the endpoint directly', false],
      ], 'A container on a bridge network is one extra hop away, so the token response with a hop limit of 1 never reaches it. Going back to IMDSv1 removes the protection, there are no role access keys to copy, and the metadata endpoint is link-local, not reachable by public IP.'),
    ],
  },

  /* ── IV_AWS_NETWORK ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_IV_CLOUD_IV_AWS_NETWORK',
    notes: `Networking is where cloud panels separate people who have built a VPC from people who have read about one.
In AWS Networking you designed a three-tier VPC across zones, wrote route tables, chained security groups,
added endpoints and compared peering with Transit Gateway; the interview questions there (the path of a
request, security groups versus NACLs, a VPC that survives an AZ, connecting 20 VPCs) are assumed. Expect a
small scenario and "what would you check?" — the panel wants an order of checks, not a list of services.

## Q1. "Pick the CIDR for a new production VPC."

**Testing:** whether you plan for the network you will have in two years.

**Model answer.** "Not the 10.0.0.0/16 every tutorial uses, because the day we peer with another team's VPC
or connect the office over VPN, overlapping ranges cannot be routed. I would take a block from the company's
address plan — say 10.20.0.0/16 for this VPC — leave room for more VPCs, and split it into subnets per tier
per AZ with spare space. Remember AWS keeps five addresses in every subnet, so a /24 gives 251 usable and a
/26 gives 59."

**Follow-up:** "Why so large if we have six servers?" — Containers and Lambda in a VPC take an IP each,
EKS can take many per node, and resizing a VPC later means adding secondary ranges, which is awkward.

**Weak answer:** "10.0.0.0/16, it is the default."

## Q2. "What makes a subnet public?"

**Testing:** the one-sentence answer that most freshers get wrong.

**Model answer.** "Its route table has a route for 0.0.0.0/0 to an internet gateway. That is all — the name
and the 'auto-assign public IP' setting do not make it public. An instance there also needs a public IP or an
Elastic IP to be reachable, and its security group must allow the traffic."

**Follow-up:** "An instance in a public subnet has no public IP. Can it reach the internet?" — No. The
internet gateway translates only for instances with a public address; this one needs a NAT gateway path
instead, or a public IP.

**Weak answer:** "A subnet is public when you tick 'public' while creating it."

## Q3. "Our NAT gateway bill is bigger than our EC2 bill. What do you look at?"

**Testing:** whether you know what flows through NAT and how to take it off that path.

**Model answer.** "NAT gateways charge per hour and per GB processed, so the question is what traffic goes
through them. Usually it is traffic to AWS services: pulls from ECR, backups to S3, logs. I would turn on VPC
flow logs, or look at the cost and usage report by usage type, to find the top destinations. Then: a gateway
endpoint for S3 and DynamoDB, which has no charge; interface endpoints for ECR, CloudWatch Logs and others
where volume justifies them; and check that each AZ uses its own NAT gateway, so we are not paying cross-AZ
transfer as well."

**Follow-up:** "Why one NAT gateway per AZ?" — A NAT gateway lives in one AZ. If every private subnet routes
to the one in AZ-a, losing AZ-a cuts outbound for all of them.

**Weak answer:** "Replace the NAT gateway with a NAT instance to save money." (Possible, but it gives up
availability and patching, and it does not ask what the traffic is.)

## Q4. "Gateway endpoint or interface endpoint?"

**Testing:** precise knowledge of two similar-sounding things.

**Model answer.** "A gateway endpoint exists only for S3 and DynamoDB. It is a route-table target: the route
tables I attach it to get a route to the service's prefix list. It costs nothing, but it only works from
inside that VPC. An interface endpoint, PrivateLink, puts network interfaces with private IPs into my
subnets, protected by a security group; with private DNS on, the normal service name resolves to them. It
covers most other services and works from peered networks or on-premises, but it is billed per hour per AZ
and per GB."

**Follow-up:** "The bucket policy requires aws:SourceVpce and the app is denied." — Its traffic is not
going through that endpoint: the route table of its subnet lacks the endpoint route, or it reaches S3 from
another VPC or through NAT.

**Weak answer:** "They are the same; interface is newer."

## Q5. "ALB, NLB or CloudFront in front of the app?"

**Testing:** layer 7 versus layer 4, and edge caching.

**Model answer.** "An ALB works at HTTP: routing by host and path, TLS termination with ACM, WAF, target
groups for containers. An NLB works at TCP and UDP: very high throughput, a static IP per AZ for partners
who allow-list, and the client's IP preserved. CloudFront sits at the edge in front of either, caching
static content and absorbing spikes close to users. A typical web app is CloudFront, then an ALB, then
private targets."

**Follow-up:** "The ALB returns 502, 503 and 504 at different times. What does each tell you?" — 503: no
healthy targets in the group. 502: a target closed the connection or sent an invalid response. 504: the
target did not answer within the idle timeout. Each points somewhere different: health checks, the app, or a
slow dependency.

**Weak answer:** "Always NLB, it is faster."

## Q6. "Why can the root domain not be a CNAME, and what does Route 53 do about it?"

**Testing:** DNS basics plus the AWS-specific answer.

**Model answer.** "DNS forbids a CNAME at the zone apex, because the apex must also hold SOA and NS records.
Route 53's alias record solves it: an A or AAAA record at the apex that points to an AWS resource such as an
ALB or CloudFront distribution, and Route 53 answers with the current addresses. Aliases also follow the
target when its IPs change."

**Follow-up:** "How do you fail over to Hyderabad?" — Failover routing with a health check on the primary;
remember clients cache the old answer for the TTL, so failover is not instant.

**Weak answer:** "Point the root domain at the ALB's IP address." (ALB addresses change.)

## Q7. "How do you get a shell on an instance in a private subnet?"

**Testing:** whether you reach for an open port 22.

**Model answer.** "Session Manager. The instance needs the SSM agent, which Amazon Linux has, a role with
the SSM managed policy, and a path to the Systems Manager endpoints — through NAT, or interface endpoints for
ssm and ssmmessages (and ec2messages for older agents). Nothing listens inbound, there is no key to lose,
and every session can be logged."

**Follow-up:** "The instance does not show up as managed." — Check the role, the agent, and then the
network path to the endpoints, in that order.

**Weak answer:** "A bastion host with SSH open to 0.0.0.0/0."

## Q8. "VPC A peers with B, and B peers with C. Can A reach C?"

**Testing:** a fact that breaks real designs.

**Model answer.** "No. Peering is not transitive, and B cannot act as a router between them. A needs its own
peering with C, or all three attach to a Transit Gateway, which is the hub that does route between
attachments. Peering also refuses overlapping CIDRs, which is why Q1 matters."

**Follow-up:** "When is peering still the right answer?" — Two or three VPCs with heavy traffic between
them: there is no hourly attachment charge and no hub in the path.

**Weak answer:** "Yes, through B."

## How you are judged

Strong answers name the deciding mechanism (the route, the prefix list, the status code), give the order of
checks and say where each one is seen. Weak answers open ports or name services without saying why.`,
    workedExample: `**Question: "A new ECS service in the private app subnets cannot connect to the RDS database. The
error is a connection timeout. What do you check?"**

**A weak answer (heard often):**

"I would open port 5432 to 0.0.0.0/0 on the database security group and see if it connects."

What the panel hears: an unsafe change as the first step, and no understanding of what a timeout means.

**A strong answer:**

"A timeout means the packets are not being answered at all — something is dropping them. A 'connection
refused' would be different: that means we reached the host and nothing is listening. So I am looking for a
filter or a missing route, not a database problem.

First the security groups, because they are the most common cause. The database's group should allow 5432
from the app's security group. ECS tasks with awsvpc networking have their own interfaces and their own
group, so if the rule names the old EC2 app group, the new tasks are not in it. That is my first suspect.

Second, NACLs on the data subnets. They are stateless, so they need inbound 5432 from the app subnets and
outbound to the ephemeral ports — if someone wrote the inbound rule for the old app subnets only, the new
subnet's range is missing.

Third, the route: both subnets are in the same VPC, so the local route covers it, unless the database is in
a peered VPC — then both route tables need the peering route.

To prove it, I would use VPC Reachability Analyzer between the task's interface and the database, and check
flow logs for REJECT records on 5432. I fix it with a security-group-to-security-group rule, not a CIDR."

**Why it scores:** it reads the symptom (timeout versus refused), checks the likely layers in order, names
the ECS-specific trap, uses evidence tools, and ends with a narrow fix.`,
    mcqs: [
      mcq('An instance sits in a subnet whose route table sends 0.0.0.0/0 to an internet gateway, but it has no public IPv4 address. Can it reach the internet?', [
        ['Yes, the internet gateway assigns it an address on the way out', false],
        ['Yes, because the subnet is public and so are all its instances', false],
        ['No, unless the security group allows all outbound traffic too', false],
        ['No; it needs a public or Elastic IP, or a route via a NAT gateway', true],
      ], 'An internet gateway only translates for instances that have a public address. Without one, outbound traffic from that subnet goes nowhere, and a NAT gateway path is needed instead. Security groups allow all outbound by default, so they are not the blocker here.'),
      mcq('An ALB returns 503 for every request right after a deployment. What does that status point to first?', [
        ['No healthy targets are registered in the target group', true],
        ['The targets are too slow and exceed the idle timeout', false],
        ['A target closed the connection with a malformed reply', false],
        ['The ACM certificate on the listener has just expired', false],
      ], 'A 503 from an ALB means it has no healthy target to send the request to, so health checks are the first place to look. A slow target gives 504, a broken response gives 502, and an expired certificate fails the TLS handshake before any status code.'),
      mcq('A team peers VPC A with B and B with C, then wonders why A cannot reach C. Which explanation is right?', [
        ['B must enable IP forwarding on its route tables to pass the traffic', false],
        ['Peering is not transitive; A needs its own link or a Transit Gateway', true],
        ['C’s security groups must reference A’s groups across the two peerings', false],
        ['The peerings need to be in the same region for traffic to flow on', false],
      ], 'A peering connection carries traffic only between its two VPCs; AWS never routes through a third. Route tables have no forwarding switch, security group rules cannot fix a missing path, and cross-region peering works for its own pair.'),
    ],
    checkpoint: [
      ck('CLOUD_NETWORKING', 'Why does a /24 subnet in a VPC give 251 usable addresses rather than 256?', [
        ['AWS reserves five addresses in every subnet for its own use', true],
        ['The first five are kept for the NAT gateway and the load balancer', false],
        ['IPv4 subnets always lose a network, a broadcast and three gateways', false],
        ['Security groups each take one address, and a VPC has five defaults', false],
      ], 'AWS reserves the network address, the VPC router, DNS, one for future use and the last address in each subnet. They are not handed to NAT or load balancers, ordinary IPv4 subnetting loses only two, and security groups use no addresses.'),
      ck('CLOUD_NETWORKING', 'A bucket policy denies requests unless aws:SourceVpce matches the S3 gateway endpoint. A Lambda function in the VPC is denied. What is the most likely cause?', [
        ['Gateway endpoints only accept traffic from EC2 instances in the VPC', false],
        ['The bucket must also be in a different region from the endpoint', false],
        ['Its subnet’s route table lacks the endpoint, so traffic leaves via NAT', true],
        ['Lambda functions always reach S3 over the public internet by design', false],
      ], 'A gateway endpoint works only for subnets whose route tables have its prefix-list route; otherwise the request goes through NAT and carries no endpoint id. Any VPC resource can use it, it must be in the same region as the bucket, and VPC-attached Lambda follows the subnet routes.'),
      ck('CLOUD_NETWORKING', 'A payments partner allow-lists one IP per AZ and needs raw TCP on a custom port. Which front door fits?', [
        ['An Application Load Balancer, since it terminates TLS for the partner', false],
        ['CloudFront, since it gives a fixed address range for every request', false],
        ['A NAT gateway, since it already has one Elastic IP per Availability Zone', false],
        ['A Network Load Balancer, with a static IP per AZ and TCP listeners', true],
      ], 'An NLB handles TCP at layer 4 and offers a static (or Elastic) IP per AZ for allow-lists. An ALB speaks HTTP and its addresses change, CloudFront serves HTTP from many edge addresses, and a NAT gateway handles outbound traffic, not inbound connections.'),
    ],
  },

  /* ── IV_DATA_STORAGE ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_IV_CLOUD_IV_DATA_STORAGE',
    notes: `Storage and database questions are where the panel finds out whether you would lose a company's data. You
chose storage classes and wrote lifecycle rules, used EBS and EFS, built RDS with Multi-AZ and replicas,
designed DynamoDB tables from access patterns and planned backups by RPO and RTO in Compute and Storage and
Databases on AWS. Those topics' interview questions (Multi-AZ versus replicas, backup for a payments
database, an order-tracking table, cache consistency, a public bucket, choosing between EBS, EFS, S3 and
instance store) are assumed. These are the next layer: scenarios with a cost or a recovery in them.

## Q1. "KYC documents are read often for a month, rarely after, and must be kept for years. Design the storage."

**Testing:** storage classes, lifecycle and retention as one design.

**Model answer.** "S3 Standard at upload, because the first month is busy. A lifecycle rule moves objects to
Standard-IA after 30 days — not earlier, since IA has a 30-day minimum and a minimum billable size, so small
or short-lived objects cost more there. After that, Glacier Instant Retrieval if the occasional read must be
fast, or Glacier Deep Archive if a retrieval can wait hours. Versioning on, and Object Lock in compliance mode
for the retention period compliance gives us, so not even an admin can delete early. Block Public Access on,
SSE-KMS with a customer-managed key, and access only through the app's role."

**Follow-up:** "We do not know the access pattern." — Intelligent-Tiering, which moves objects between tiers
by access for a small monitoring charge per object; check the pricing page for whether that pays off for many
tiny files.

**Weak answer:** "Put everything in Glacier to save money."

## Q2. "A customer needs to download one private file for ten minutes. How?"

**Testing:** presigned URLs and their limits.

**Model answer.** "The app generates a presigned GET URL for that key with a ten-minute expiry and gives it
to the customer. The bucket stays private; the URL carries a signature made with the app's credentials and
grants only that one operation. If the app runs under a role, the URL also stops working when the role's
temporary credentials expire, whichever comes first."

**Follow-up:** "Could the URL be shared?" — Yes, anyone holding it can use it until it expires, which is why
the expiry is short and the URL is generated per request after an authorisation check.

**Weak answer:** "Make that object public for ten minutes."

## Q3. "An EBS volume is in ap-south-1a. The instance that needs it is in 1b."

**Testing:** whether you know EBS is zonal.

**Model answer.** "EBS volumes live in one AZ and attach only to instances in that AZ. I would snapshot the
volume — snapshots are stored regionally — and create a new volume from the snapshot in 1b. If two AZs need
the same files at the same time, EBS is the wrong tool: EFS is a shared file system across AZs."

**Follow-up:** "gp2 or gp3?" — gp3. Its baseline performance does not depend on size and IOPS and
throughput can be raised separately, so you stop buying disk space you do not need to get IOPS.

**Weak answer:** "Detach it and attach it to the other instance."

## Q4. "The AZ with our RDS primary goes down. What happens, and what must the application do?"

**Testing:** what Multi-AZ automates and what it leaves to you.

**Model answer.** "With Multi-AZ, RDS promotes the synchronous standby in the other AZ and points the same
endpoint name at it; AWS documents that as typically a minute or two. No committed data is lost because the
standby was synchronous. The application must reconnect: connection pools must drop dead connections and
retry, and nothing should cache the old DNS answer for long. Without Multi-AZ, we are restoring from backup."

**Follow-up:** "Does Multi-AZ protect us from a developer's bad DELETE?" — No. The standby applies the delete
too, and so do read replicas. That is what point-in-time restore is for.

**Weak answer:** "Nothing happens; the read replica takes over automatically."

## Q5. "The ledger can lose at most five minutes of data and must be back within an hour. Show me how you meet that."

**Testing:** RPO and RTO turned into features, then proved.

**Model answer.** "RPO five minutes: RDS automated backups with point-in-time restore, which can usually
restore to within the last five minutes, with retention long enough to notice a problem — up to 35 days. For a
region loss I copy snapshots or run a cross-region replica in Hyderabad. RTO one hour: a restore creates a new
instance, so I time the restore of our real database size, plus DNS and app config changes. I would run that
drill and write down the measured time, because an untested restore is a hope, not a plan."

**Follow-up:** "The restore drill takes 90 minutes." — Then we change design, not the number: a warm replica
in the DR region we can promote, or Aurora with faster recovery, and drill again.

**Weak answer:** "We take daily snapshots, so we are covered."

## Q6. "Design the DynamoDB key for orders, where the main query is 'this customer's orders, newest first'."

**Testing:** access-pattern-first design, and what a hot partition is.

**Model answer.** "Partition key customer_id, sort key the order timestamp, so one Query returns a
customer's orders in order, and ScanIndexForward=false gives newest first. Against moto, a query for one
customer since 1 October read only that customer's items, while a scan with a filter read the whole table:

    query 2 2     (Count, ScannedCount)
    scan 3 4

Scans pay for every item read, not every item returned. For 'all pending orders' I would add a GSI, keeping
in mind GSIs are eventually consistent."

**Follow-up:** "Why not partition key = status?" — Only a few values, so a few partitions take all the
traffic — a hot partition that throttles on sale day.

**Weak answer:** "Use order_id as the key and scan for the customer."

## Q7. "We have an unencrypted RDS instance. Turn on encryption."

**Testing:** whether you know encryption at rest is set at creation.

**Model answer.** "It cannot be switched on in place. I take a snapshot, copy the snapshot with encryption
and a KMS key, restore a new instance from the encrypted copy, then cut the application over in a planned
window — or use a replication-based migration to keep the downtime short. Then I set encryption as the
default for new volumes and enforce it with an AWS Config rule."

**Follow-up:** "Same for EBS?" — The same pattern: snapshot, encrypted copy, new volume. And turn on EBS
encryption by default per region.

**Weak answer:** "Tick 'encryption' in the modify screen."

## How you are judged

Strong answers start from the data's requirements (how often read, how long kept, how much loss is
acceptable), map them to features, and say how they would prove it. Weak answers name a service and stop.`,
    workedExample: `**Question: "At 14:05 IST someone ran DELETE without a WHERE on the production orders table. The
database is RDS PostgreSQL with Multi-AZ and a read replica. What do you do?"**

**A weak answer (heard often):**

"Fail over to the standby — it has a copy of the data."

What the panel hears: Multi-AZ and replicas confused with backups. The standby and the replica applied the
same DELETE within moments.

**A strong answer:**

"First, stop the damage: pause whatever is writing to orders if it can make things worse, and tell the
incident lead. Do not touch the production instance — I need it as it is.

Then point-in-time restore to a **new** instance, at a time just before the delete — 14:04 IST, which is
08:34 UTC, because the API takes UTC. In boto3:

    rds.restore_db_instance_to_point_in_time(
        SourceDBInstanceIdentifier="orders-prod",
        TargetDBInstanceIdentifier="orders-restore-1404",
        RestoreTime=datetime(2026, 10, 27, 8, 34, tzinfo=timezone.utc))

Against moto this returned orders-restore-1404 as available; on AWS it takes a while, which is part of the
RTO.

Restoring creates a new instance, so production keeps running. From the restored copy I export the orders
rows and load them back into production, after checking which orders arrived between 14:04 and now, so I do
not overwrite new ones. Then reconcile with the payments team.

Afterwards: why could an app user run a DELETE without WHERE on production? Separate read-only and
read-write roles, changes through reviewed scripts, and a timed restore drill so we know the real RTO."

**Why it scores:** it separates high availability from backup, restores beside production rather than over
it, handles the time zone, deals with data written since, and fixes the cause.`,
    mcqs: [
      mcq('A lifecycle rule moves 50 KB invoice PDFs to S3 Standard-IA after 7 days. Why does a reviewer object?', [
        ['Standard-IA objects cannot be read again without a restore request first', false],
        ['Lifecycle rules can move objects only into a Glacier storage class', false],
        ['Standard-IA keeps data in one AZ, so the PDFs would not survive a failure', false],
        ['IA bills a 30-day minimum and a 128 KB minimum size, so this costs more', true],
      ], 'Standard-IA charges each object as if stored at least 30 days and at least 128 KB, so small files moved early cost more, not less. IA is readable at once, lifecycle can target IA, and Standard-IA stores across multiple AZs (One Zone-IA is the single-AZ class).'),
      mcq('An interviewer asks whether RDS Multi-AZ protects against an accidental DELETE of all rows. What is the right answer?', [
        ['Yes, because the standby lags slightly and still holds the rows', false],
        ['No; the standby applies the delete too, so restore to a point in time', true],
        ['Yes, if you fail over within the first minute after the delete', false],
        ['No, unless the read replica has been promoted to a primary first', false],
      ], 'Multi-AZ replication is synchronous, so the standby has the same deletion; replicas get it moments later. Point-in-time restore to a new instance is the recovery. Failing over or promoting a replica gives you the same deleted data.'),
      mcq('Why is "status" a poor DynamoDB partition key for an orders table with millions of orders?', [
        ['Partition keys must be unique, and many orders share one status', false],
        ['Status values change, and partition keys can never be updated at all', false],
        ['A handful of values concentrate traffic on a few hot partitions', true],
        ['String attributes cannot be partition keys in on-demand capacity', false],
      ], 'Few distinct values means a few partitions take all the reads and writes, which throttles under load. With a sort key, the partition key need not be unique; changing a key means rewriting the item rather than being impossible; strings are valid keys in either mode.'),
    ],
    checkpoint: [
      ck('CLOUD_STORAGE', 'An app in ap-south-1b needs the data on an EBS volume that lives in ap-south-1a. What is the right move?', [
        ['Snapshot the volume and create a new volume from it in 1b', true],
        ['Detach the volume and attach it to the instance in 1b', false],
        ['Enable Multi-Attach so the volume serves both AZs', false],
        ['Move the volume with a lifecycle rule to the other AZ', false],
      ], 'EBS volumes attach only within their own AZ; snapshots are regional, so a new volume can be created from one in any AZ of the region. Multi-Attach still works within one AZ, and lifecycle rules belong to S3, not EBS.'),
      ck('CLOUD_STORAGE', 'A team’s restore drill of the ledger database took 90 minutes against a one-hour RTO. What is the sound response?', [
        ['Record the RTO as 90 minutes, since the drill measured the real time', false],
        ['Take snapshots more often, since that shortens the time to restore', false],
        ['Change the design, such as a promotable warm replica, and drill again', true],
        ['Skip future drills, since they show the plan cannot meet the target', false],
      ], 'The drill shows the current design misses the target, so the design changes (a warm standby or replica that can be promoted) and is measured again. Quietly changing the target ignores the business need, snapshot frequency improves RPO rather than restore time, and stopping drills hides the gap.'),
      ck('CLOUD_STORAGE', 'A customer must download one private statement for ten minutes, and the bucket must stay private. What do you use?', [
        ['A bucket policy that allows the customer’s IP for ten minutes', false],
        ['A presigned GET URL for that key, generated after an auth check', true],
        ['A public-read ACL on the object, removed by a Lambda timer later', false],
        ['A CloudFront distribution in front of the bucket with caching off', false],
      ], 'A presigned URL grants one operation on one key until it expires, signed with the app’s credentials, and the bucket stays private. IP rules are fragile and shared, public ACLs are disabled on modern buckets and expose the file, and CloudFront alone adds no per-user authorisation.'),
    ],
  },

  /* ── IV_ARCHITECTURE ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_IV_CLOUD_IV_ARCHITECTURE',
    notes: `Architecture questions are open on purpose: the panel wants to see you trade one thing against another and
say so. You scaled EC2 with Auto Scaling, built serverless with Lambda, SQS and Step Functions, ran
containers, priced purchase options and ran a Well-Architected review across the track; the earlier
interview questions (an AZ-proof, sale-proof web tier, when not to use Lambda, sale-day order intake, a bill
up 40%) are assumed. A fresher is not expected to have designed a bank. You are expected to ask what the
requirement is, choose, and name what your choice costs.

## Q1. "High availability, fault tolerance, disaster recovery — what is the difference?"

**Testing:** precise words, plus the arithmetic behind "nines".

**Model answer.** "High availability means the service stays up through common failures with at most a short
blip — two AZs behind a load balancer. Fault tolerance means a component failure causes no interruption at
all, which usually costs much more. Disaster recovery is getting back after something large — a region, a
deleted dataset — measured by RPO and RTO. In numbers, over a 30-day month 99.9% allows 43.2 minutes of
downtime, 99.95% allows 21.6 and 99.99% only 4.32."

**Follow-up:** "Three components in a chain at 99.95%, 99.95% and 99.9%. What is the whole?" — Multiply:
about 99.8%. A chain is weaker than its weakest link. Two independent 99.9% copies in parallel, either one
enough, give about 99.9999% — which is why redundancy works.

**Weak answer:** "They all mean the system does not go down."

## Q2. "What must be true of an app before you can scale it horizontally?"

**Testing:** whether you know scaling is an application property.

**Model answer.** "It must be stateless on the instance. Sessions go to ElastiCache or DynamoDB or a signed
token, uploads go to S3, not the local disk, scheduled jobs run once rather than on every copy, and config
comes from Parameter Store or the environment, not files edited by hand. Then any instance can serve any
request, and the load balancer and Auto Scaling can add or remove copies freely."

**Follow-up:** "Why not sticky sessions?" — They hide state on instances, so scale-in and deployments log
users out and the load spreads unevenly.

**Weak answer:** "Use a bigger instance type."

## Q3. "A flash sale starts at 8 p.m. IST. How do you scale for it?"

**Testing:** combining scaling policies, and knowing their timing.

**Model answer.** "Target tracking on a metric that tracks load — request count per target or CPU — for
normal days. For a known event, a scheduled action that raises the minimum before 8 p.m., because new
instances need minutes to boot and pass health checks; reacting after traffic arrives is too late.
Scheduled actions are in UTC unless I set a time zone, so 8 p.m. IST is 14:30 UTC. Warm the caches, raise
downstream limits too — database connections, Lambda concurrency, third-party payment quotas — and load-test
the path beforehand."

**Follow-up:** "What about the database?" — It does not autoscale like the web tier. Read replicas or
caching for reads, a queue in front of writes that can wait, and connection pooling.

**Weak answer:** "Auto Scaling handles it automatically."

## Q4. "Lambda, ECS on Fargate or EC2 for a new internal API?"

**Testing:** criteria, not a favourite.

**Model answer.** "It depends on traffic shape and constraints. Lambda for spiky or low traffic, short
requests within the 15-minute limit, and a small team — no servers, pay per request. Fargate for steady
traffic, long-lived connections, or a container the team already has, without managing nodes. EC2 when I
need control: GPUs, special kernels, licensing, or a steady load large enough that Savings Plans on
instances are clearly cheaper. For an internal API with business-hours traffic I would start on Lambda
behind API Gateway and revisit if latency or cost says otherwise."

**Follow-up:** "When does Lambda get expensive?" — High, steady request rates with long durations; at that
point always-on containers cost less per request. Do the arithmetic with the calculator.

**Weak answer:** "Serverless is always cheaper."

## Q5. "When do you put a queue between two services?"

**Testing:** synchronous versus asynchronous trade-offs.

**Model answer.** "When the caller does not need the answer immediately, or the receiver cannot keep up with
bursts. A queue absorbs spikes, lets the consumer scale on queue depth, and keeps the caller working when the
consumer is down. The price is that the result is not instant, messages may be delivered more than once, so
consumers must be idempotent, and failures need a dead-letter queue and an alarm on it."

**Follow-up:** "Payment confirmation — queue or not?" — The user-facing 'payment received' step is
synchronous; sending the receipt email, updating loyalty points and analytics go on a queue or an event bus.

**Weak answer:** "Always use queues; they make things scalable."

## Q6. "Name the Well-Architected pillars and give me one trade-off between two of them."

**Testing:** using the framework as a thinking tool.

**Model answer.** "Operational excellence, security, reliability, performance efficiency, cost optimisation
and sustainability. A trade-off: one NAT gateway per AZ costs more than one shared NAT gateway, but a shared
one is a single point of failure for outbound traffic — reliability against cost. For production I pay for
three; for dev, one is fine and I write that decision down."

**Follow-up:** "How does a review actually run?" — Questions per pillar against a real workload, risks
recorded as high or medium, and an improvement plan with owners.

**Weak answer:** listing the six names and stopping.

## Q7. "Cut compute cost without hurting reliability."

**Testing:** purchase options matched to workload shape.

**Model answer.** "Right-size first, using utilisation data, because a commitment on an oversized fleet
locks in waste. Then commit to the steady baseline with Savings Plans; Compute Savings Plans also cover
Fargate and Lambda. Run interruptible work — batch jobs, CI runners, stateless workers in a mixed fleet — on
Spot, which can be reclaimed with a two-minute warning. Try Graviton where the stack supports Arm. Switch off
non-production at night."

**Follow-up:** "Spot for the database?" — No. Spot is for work that can be interrupted and retried.

**Weak answer:** "Buy Reserved Instances for everything."

## Q8. "Should we go multi-region active-active?"

**Testing:** whether you can say "not yet" with reasons.

**Model answer.** "Probably not first. The DR strategies run from backup and restore, through pilot light and
warm standby, to multi-site active-active — each step cuts RTO and RPO and adds cost and complexity, and
active-active needs data written in two regions to stay consistent. Most products get more from doing
multi-AZ well, tested backups and a cross-region copy in Hyderabad first. I would ask what downtime costs
the business and pick the cheapest strategy that meets the RTO and RPO."

**Follow-up:** "What is pilot light?" — The data is replicated and the core infrastructure is defined but
scaled to zero or near it; recovery means scaling it up.

**Weak answer:** "Yes, that is best practice."

## How you are judged

Strong answers start with a clarifying question (load, availability target, budget), make a choice, and name
its cost. Weak answers name a fashionable service or say "it depends" without saying on what.`,
    workedExample: `**Question: "A state exam board publishes results at 10 a.m. Normal traffic is tiny; for the first
hour after results it is fifty times higher. Design it on AWS."**

**A weak answer (heard often):**

"EC2 with Auto Scaling behind a load balancer, and RDS. Auto Scaling will add servers when traffic goes up."

What the panel hears: the standard diagram, with no thought about the spike arriving in seconds, before any
instance can boot, and every request hitting the database.

**A strong answer:**

"First the question: are results read-only once published? If yes, this is a read problem, and the best
request is one that never reaches a server.

So I would generate each result in advance — a small JSON per roll number — and put them in a private S3
bucket behind CloudFront, with origin access control so only CloudFront reads the bucket. At 10 a.m. the
board flips a flag and the site starts linking to them. CloudFront serves from the edge, close to students
in every state, and the origin sees a fraction of the traffic.

The lookup API — roll number and date of birth — goes through API Gateway with throttling and a short cache,
to Lambda reading DynamoDB keyed by roll number. Those scale fast and need no warm-up of instances. I would
still raise the Lambda concurrency limit in advance and load-test at fifty times.

Cost: nearly nothing for the other 364 days. Risks: stale results if a correction is published, so I would
plan a CloudFront invalidation and short TTLs on the first hour. And a status page on a separate stack."

**Why it scores:** it questions the shape of the load, pushes the work to the edge, uses services that scale
in seconds rather than minutes, protects the backend with throttling and load tests, and names the cost and
the failure mode.`,
    mcqs: [
      mcq('Over a 30-day month, roughly how much downtime does a 99.9% availability target allow?', [
        ['About 4 minutes', false],
        ['About 43 minutes', true],
        ['About 7 hours', false],
        ['About 22 minutes', false],
      ], 'A 30-day month has 43,200 minutes; 0.1% of that is 43.2 minutes. About 4 minutes is 99.99%, about 22 minutes is 99.95%, and about 7 hours is closer to 99%.'),
      mcq('A scheduled scale-out must happen before an 8 p.m. IST sale, and the action has no time zone set. Which time do you enter?', [
        ['20:00, since AWS uses the region’s local time', false],
        ['02:30 the next morning, as UTC is ahead of IST', false],
        ['14:30 UTC, since IST is UTC plus five and a half', true],
        ['20:00 UTC, since the console converts it for you', false],
      ], 'Scheduled actions default to UTC; IST is UTC+05:30, so 20:00 IST is 14:30 UTC (enter it a little earlier to allow boot time). Regions do not change the default, UTC is behind IST rather than ahead, and nothing converts silently.'),
      mcq('An interviewer asks why sticky sessions are a poor substitute for a stateless app. Which answer is best?', [
        ['They hide state on instances, so scale-in and deploys log users out', true],
        ['They force the load balancer to terminate TLS on each instance instead', false],
        ['They are supported only by the NLB and never by Application LBs', false],
        ['They stop health checks from running against the target instances', false],
      ], 'Stickiness ties a user to one instance holding their session, so removing it loses that state and load spreads unevenly. It has nothing to do with where TLS ends, ALBs support it, and health checks keep working.'),
    ],
    checkpoint: [
      ck('CLOUD_COMPUTE', 'Three services in a chain are available 99.95%, 99.95% and 99.9% of the time. About what is the availability of the whole request path?', [
        ['About 99.95%, the value of the strongest part', false],
        ['About 99.90%, the value of the weakest part', false],
        ['About 99.98%, the average of the three values', false],
        ['About 99.80%, the product of the three values', true],
      ], 'A request needs all three, so availabilities multiply: 0.9995 × 0.9995 × 0.999 ≈ 0.998. A chain is worse than its weakest link, not equal to it, and averaging has no meaning for components in series.'),
      ck('CLOUD_COMPUTE', 'Which workload is the best fit for EC2 Spot capacity?', [
        ['The primary PostgreSQL database for a lending app', false],
        ['Stateless CI build runners that retry on failure', true],
        ['A single licensed server that cannot be restarted', false],
        ['The only NAT instance for a production VPC subnet', false],
      ], 'Spot can be reclaimed with a two-minute warning, so it suits work that can stop and retry. A primary database, a server that must not restart and a lone NAT path are all hurt badly by an interruption.'),
      ck('CLOUD_COMPUTE', 'A team wants multi-region active-active for a small internal HR app with a four-hour RTO. What do you recommend?', [
        ['Active-active, since it is the most reliable of the DR options', false],
        ['A cheaper strategy that meets the RTO, like backup and restore', true],
        ['No DR at all, since an HR app does not need any recovery plan', false],
        ['Run it in a single AZ, so there is less to fail over in a crisis', false],
      ], 'DR strategy should be the cheapest one that meets the RTO and RPO; a four-hour RTO is within reach of backup-and-restore or pilot light. Active-active adds cost and data-consistency work it does not need, no plan at all ignores real risk, and one AZ lowers availability.'),
    ],
  },

  /* ── IV_AZURE ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_IV_CLOUD_IV_AZURE',
    notes: `Many GCCs and IT services clients in Hyderabad, Pune and Bengaluru run Azure, so an AWS-first candidate is
often asked "and on Azure?". In Azure for AWS Engineers you mapped the hierarchy, Entra ID and RBAC, VNets and
NSGs, compute, storage, AKS and cost; the interview questions there (laying out subscriptions, RBAC versus
IAM, an unreachable VM behind an NSG, AKS workload identity) are assumed. Panels want to hear that you know
where Azure **differs**, not a name-for-name translation.

## Q1. "Translate a three-tier AWS app to Azure."

**Testing:** a working map, and where it breaks.

**Model answer.** "VPC to a VNet, subnets to subnets, security groups to NSGs, with application security
groups standing in for 'allow from this security group'. ALB to Application Gateway, NLB to Azure Load
Balancer, CloudFront to Front Door. EC2 and Auto Scaling to Virtual Machines and Scale Sets; containers to
App Service, Container Apps or AKS; Lambda to Functions. RDS PostgreSQL to Azure Database for PostgreSQL
Flexible Server, DynamoDB to Cosmos DB, S3 to Blob Storage. Instance roles to managed identities, Secrets
Manager and KMS to Key Vault, CloudWatch to Azure Monitor and Log Analytics, CloudFormation to ARM and Bicep
— and Terraform works on both."

**Follow-up:** "Where does the map mislead you?" — Identity lives in the Entra tenant above every
subscription; every resource sits in exactly one resource group, which has no AWS twin; NSGs have deny rules
and priorities; and storage redundancy is a choice you make, not a default like S3's.

**Weak answer:** "Azure is the same as AWS with different names."

## Q2. "System-assigned or user-assigned managed identity?"

**Testing:** identity lifecycle.

**Model answer.** "A system-assigned identity is created with the resource and deleted with it — simple, one
per resource, good for a single app. A user-assigned identity is a resource of its own: it can be shared by
several resources, exists before them, and keeps its role assignments if I redeploy the VM or app. For
infrastructure as code with frequent rebuilds, or AKS workload identity, I use user-assigned. Either way
there is no secret to store — the platform gets tokens for it."

**Follow-up:** "What is the AWS equivalent?" — An IAM role assumed through an instance profile, a task role
or an execution role.

**Weak answer:** "A managed identity is a service account with a password Azure rotates."

## Q3. "A developer shut down the VM from inside Linux. Why is it still on the bill?"

**Testing:** the most common Azure billing trap.

**Model answer.** "Shutting down from the OS leaves it Stopped, and Azure keeps the hardware allocated and
bills compute. Only Stopped (deallocated) — az vm deallocate or Stop in the portal — releases it, after which
we pay for disks and any static public IP. Deallocating also loses the temporary disk and a dynamic public
IP. I would add an auto-shutdown schedule on dev VMs and an Advisor check."

**Follow-up:** "Is that the same on AWS?" — No. A stopped EC2 instance does not bill compute; it pays for its
EBS volumes and any public IPv4 address it holds.

**Weak answer:** "Azure bills for a minimum of a month."

## Q4. "Where would you store a Central India hospital's scanned records, and with what redundancy?"

**Testing:** whether you choose redundancy deliberately and know the pair.

**Model answer.** "Blob Storage in Central India. LRS keeps three copies in one datacentre — too narrow for
records. ZRS spreads across three zones; GZRS adds an asynchronous copy to the paired region, South India,
so the data stays in India. For records I would pick GZRS, or RA-GZRS if reads must continue from the
secondary during a regional outage. Then access tiers with lifecycle — Hot, Cool, Cold, Archive — immutability
policies for retention, private endpoints and Entra-based access with shared keys disabled."

**Follow-up:** "Does geo-redundancy mean zero data loss?" — No. Geo-replication is asynchronous; a regional
failover can lose the most recent writes.

**Weak answer:** "Azure keeps copies everywhere automatically."

## Q5. "How is an NSG different from an AWS security group?"

**Testing:** rule evaluation details.

**Model answer.** "Both are stateful. But an NSG has allow and deny rules, each with a priority from 100 to
4096; the lowest number that matches wins. It can be attached to a subnet and to a NIC, and traffic must pass
both. There are default rules at the bottom — AllowVnetInBound, AllowAzureLoadBalancerInBound and
DenyAllInBound at 65500 — so all traffic within the VNet is allowed by default, unlike AWS where a new group
allows nothing in."

**Follow-up:** "How do you say 'only the app tier may reach the database'?" — An application security group
for the app VMs as source in the database NSG rule, plus a deny rule for the rest of the VNet, because the
default rule allows VNet traffic.

**Weak answer:** "NSGs are like NACLs, so they are stateless."

## Q6. "Deploy a new version of an App Service app without downtime."

**Testing:** deployment slots and their catch.

**Model answer.** "Deploy to a staging slot, which is a live copy of the app with its own hostname, warm it
and test it, then swap. The swap exchanges the slots after warming, so users see no restart. Settings marked
as slot settings stay with the slot, so production keeps its production connection string. Rolling back is
swapping again. Slots need the Standard tier or above."

**Follow-up:** "The staging slot cannot read its Key Vault secret." — The slot has its own managed identity
if it is system-assigned, and that identity needs its own access to the vault.

**Weak answer:** "Stop the app, deploy, start it again at night."

## Q7. "Private endpoint or service endpoint for a storage account?"

**Testing:** two features with similar names.

**Model answer.** "A service endpoint keeps the storage account's public address but sends traffic from my
subnet over the Azure backbone, and lets the storage firewall allow that subnet. A private endpoint gives the
storage account a private IP inside my VNet, reachable from peered VNets and on-premises too, and lets me turn
off public network access completely. For sensitive data, private endpoint — with the private DNS zone
privatelink.blob.core.windows.net linked to the VNet, or names will still resolve to the public address."

**Follow-up:** "We created a private endpoint and traffic still goes public." — DNS: the private zone is
missing or not linked, so the app resolves the public address; and public access was not disabled.

**Weak answer:** "They are the same thing."

## How you are judged

Strong answers translate and then name the difference that would bite in production. Weak answers translate
names only, or carry AWS assumptions across unchanged.`,
    workedExample: `**Question: "You know AWS. A client running on Azure says their Function App gets 403 when it reads
blobs, even though its managed identity is Contributor on the storage account. Explain."**

**A weak answer (heard often):**

"Contributor has full access, so it must be the network. I would open the storage firewall to all networks."

What the panel hears: an AWS assumption carried over, and a fix that makes the data public-facing.

**A strong answer:**

"Azure separates the management plane from the data plane. Contributor grants Actions — create, configure,
delete the storage account — but reading blob contents is a DataAction, and Contributor has none. So with
Entra authentication, the identity can manage the account and still cannot read a blob. It could list the
account keys and use them, which is exactly why I would disable shared-key access.

The fix is a data role at the narrowest scope: Storage Blob Data Reader on the one container the function
reads, assigned to its managed identity. Role assignments take a little while to apply, so I would retest
after a few minutes before changing anything else.

If it were the network instead, the error would usually say the request is not authorised by the firewall,
and I would check the storage firewall and whether a private endpoint and its DNS zone are in place —
not open the account to all networks.

The AWS comparison is an S3 bucket where the role can change the bucket's configuration but has no
s3:GetObject: management and data permissions are different actions there too, but in Azure they are
different role types, which is what catches people."

**Why it scores:** it names the real mechanism (Actions versus DataActions), fixes at the narrowest scope,
distinguishes an authorisation error from a network error, and refuses the unsafe shortcut.`,
    mcqs: [
      mcq('A developer runs "sudo shutdown now" on an Azure VM. What is the billing result?', [
        ['The VM becomes deallocated, so only its disks are billed from then on', false],
        ['The VM is deleted after 24 hours, along with its OS disk and its IP', false],
        ['The VM is Stopped but still allocated, so compute is still billed', true],
        ['Billing pauses for compute and disks alike until the VM is restarted', false],
      ], 'An OS-level shutdown leaves the VM Stopped with its hardware allocated, so compute charges continue; only a deallocate releases it. Nothing is deleted automatically, and disks are billed whether or not the VM is running.'),
      mcq('An Azure VNet has an NSG with only one custom rule, allowing HTTPS from the internet to the web subnet. Can a VM in another subnet of the same VNet reach the database subnet?', [
        ['Yes, the default AllowVnetInBound rule permits VNet traffic', true],
        ['No, NSGs deny everything that a custom rule does not allow', false],
        ['No, subnets in a VNet are isolated until they are peered', false],
        ['Yes, but only if both subnets share one route table first', false],
      ], 'NSGs include default rules, and AllowVnetInBound at priority 65000 allows traffic within the VNet; only DenyAllInBound at 65500 comes after it. Subnets in one VNet route to each other without peering or a shared route table.'),
      mcq('A private endpoint for a storage account exists, yet the app still connects to the public address. What is the most likely cause?', [
        ['The private endpoint must be in the same subnet as the app', false],
        ['The privatelink DNS zone is missing or not linked to the VNet', true],
        ['Storage accounts accept only service endpoints from App Service', false],
        ['The storage account must use the Premium tier for private links', false],
      ], 'The app resolves the storage name; without the linked privatelink.blob.core.windows.net zone, it still gets the public IP. The endpoint can sit in any reachable subnet, App Service can use private endpoints, and standard accounts support them.'),
    ],
    checkpoint: [
      ck('CLOUD_FUNDAMENTALS', 'A Function App’s managed identity is Contributor on a storage account but gets 403 reading blobs. What is the narrowest correct fix?', [
        ['Make the identity Owner of the storage account instead', false],
        ['Give it Storage Blob Data Reader on the one container', true],
        ['Open the storage firewall to all networks for a test', false],
        ['Store the account key in an app setting and use that', false],
      ], 'Reading blob data is a DataAction that Contributor and Owner lack; a data role on the specific container grants just that. Opening the firewall does not fix authorisation and exposes the account, and shared keys bypass Entra and should be disabled.'),
      ck('CLOUD_FUNDAMENTALS', 'Which redundancy keeps a Central India storage account’s data in India and survives both a zone failure and a regional outage?', [
        ['LRS, since three copies in one datacentre cover a regional outage', false],
        ['ZRS, since three zones in Central India cover a regional outage too', false],
        ['GRS to a paired region outside India, for better geographic distance', false],
        ['GZRS, zones in Central India plus a copy in paired South India', true],
      ], 'GZRS spreads across zones in the primary region and replicates to the paired region, which for Central India is South India. LRS covers one datacentre, ZRS one region, and Central India’s pair is in India, so no copy outside India is involved.'),
      ck('CLOUD_FUNDAMENTALS', 'A team rebuilds its VMs with Terraform every week and loses the VMs’ Key Vault access each time. What change fixes this?', [
        ['A user-assigned identity, whose roles survive the rebuild', true],
        ['A system-assigned identity, created again with each VM', false],
        ['A shared client secret stored on each VM’s data disk', false],
        ['Owner on the vault for the subscription’s admin group', false],
      ], 'A user-assigned managed identity is its own resource, so its role assignments stay when the VMs are replaced. A system-assigned identity is deleted with the VM, a stored secret reintroduces credentials, and Owner for admins does not give the VMs access.'),
    ],
  },

  /* ── RAPID_FIRE ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_IV_CLOUD_RAPID_FIRE',
    notes: `A screening call for a fresher cloud or DevOps role at a GCC, a services firm or a start-up: thirty questions
in about twelve minutes, one correct line each. Recruiters and first-round engineers use calls like this to
filter long lists. Cover the answer, say yours aloud, then check.

## AWS core

1. **AWS's two India regions?** — ap-south-1 Mumbai and ap-south-2 Hyderabad.
2. **AZ names or AZ IDs across accounts?** — IDs (aps1-az1); names are mapped per account.
3. **Global service examples?** — IAM, Route 53, CloudFront, Organizations.
4. **User versus role?** — Long-term credentials versus temporary credentials from STS.
5. **The two policies on a role?** — Trust policy (who may assume) and permissions policy (what it may do).
6. **Explicit deny versus allow?** — An explicit deny always wins.
7. **First command when AccessDenied?** — aws sts get-caller-identity.
8. **IMDSv2 in one line?** — Metadata needs a session token from a PUT first; blocks simple SSRF reads.
9. **Stop versus terminate?** — Stop keeps EBS; terminate deletes the root volume by default.

## Networking

10. **What makes a subnet public?** — A route to an internet gateway.
11. **Addresses AWS reserves per subnet?** — Five.
12. **NAT gateway direction?** — Outbound only; nothing can start a connection in through it.
13. **Gateway endpoints exist for?** — S3 and DynamoDB only.
14. **Security group stateful or stateless?** — Stateful; NACLs are stateless.
15. **ALB 504?** — The target did not answer in time.
16. **CNAME at the zone apex?** — Not allowed; use a Route 53 alias.
17. **Is peering transitive?** — No; use Transit Gateway for a hub.

## Storage and data

18. **S3 consistency?** — Strong read-after-write for all operations.
19. **Standard-IA catch?** — 30-day minimum and 128 KB minimum billable size.
20. **EBS scope?** — One AZ; move with a snapshot.
21. **Multi-AZ versus read replica?** — Synchronous standby for failover versus asynchronous copy for reads.
22. **Encrypt an existing RDS instance?** — Snapshot, encrypted copy, restore a new one.
23. **DynamoDB Query versus Scan?** — Query reads one partition key's items; Scan reads the whole table.
24. **RPO versus RTO?** — How much data you can lose versus how long you can be down.

## Architecture and cost

25. **99.9% over a 30-day month?** — About 43 minutes of downtime.
26. **Lambda maximum run time?** — 15 minutes.
27. **Spot interruption notice?** — Two minutes.
28. **Well-Architected pillar count?** — Six, including sustainability.

## Azure

29. **Stopped versus deallocated?** — Only deallocated stops compute billing.
30. **Central India's paired region?** — South India.

## Two questions you may also get

- **"Which certification do you have?"** — Say what it proved and what you built. AWS Cloud Practitioner
  and AZ-900 show vocabulary; Solutions Architect Associate shows design. A certification gets you past a
  filter; the project you can explain gets you the job (the Cloud Candidate topic covers the order).
- **"Have you used AWS with your own money?"** — Answer honestly: a budget alarm first, Free Tier where it
  applies, everything torn down after. Panels like a candidate who knows what a forgotten NAT gateway costs.

## Scoring

26+ correct and quick: strong. 20–25: revisit the sets your misses came from. Below 20, or "a subnet is
public when you tick public", or "Multi-AZ is a backup": go back to the question sets.`,
    mcqs: [
      mcq('Rapid fire: “Which two services have VPC gateway endpoints?”', [
        ['S3 and DynamoDB', true],
        ['S3 and Secrets Manager', false],
        ['ECR and CloudWatch Logs', false],
        ['DynamoDB and SQS queues', false],
      ], 'Gateway endpoints exist only for S3 and DynamoDB and are added as route-table targets. Secrets Manager, ECR, CloudWatch Logs and SQS use interface endpoints (PrivateLink).'),
      mcq('Rapid fire: “How many addresses does AWS reserve in each subnet?”', [
        ['Two', false],
        ['Four', false],
        ['Five', true],
        ['Eight', false],
      ], 'AWS reserves five: the network address, the VPC router, DNS, one for future use and the last address. Two is ordinary IPv4 subnetting; four and eight are guesses.'),
      mcq('Rapid fire: “What is the longest a single Lambda invocation can run?”', [
        ['5 minutes', false],
        ['60 minutes', false],
        ['30 seconds', false],
        ['15 minutes', true],
      ], 'Lambda’s maximum timeout is 15 minutes; the default is far lower, 3 seconds. Thirty seconds is close to API Gateway’s default integration timeout, which people confuse it with, and longer jobs belong on Fargate, Batch or Step Functions.'),
      mcq('Rapid fire: “Which Azure VM state stops compute billing?”', [
        ['Stopped', false],
        ['Stopped (deallocated)', true],
        ['Running with CPU idle', false],
        ['Shut down from the OS', false],
      ], 'Only deallocation releases the hardware and stops compute charges. Stopped, including a shutdown from inside the OS, keeps the VM allocated and billed.'),
      mcq('Rapid fire: “An ALB returns 502. What does that usually mean?”', [
        ['No healthy targets in the group', false],
        ['The target did not reply in time', false],
        ['The listener certificate expired', false],
        ['The target sent a bad response', true],
      ], 'A 502 means the target closed the connection or returned something the ALB could not use. No healthy targets is 503, a timeout is 504, and an expired certificate fails the TLS handshake.'),
    ],
  },

  /* ── MOCK ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_IV_CLOUD_MOCK',
    notes: `The interviewer's script for a 40-minute technical round for a fresher cloud engineer role at a GCC in
Hyderabad or a fintech in Bengaluru. Have a friend read the interviewer's lines, or record yourself and
score it against the notes. The panel writes down the words in bold.

## Opening (3 min)

"Tell me about one thing you built on AWS, in two minutes."

- **Strong:** the architecture in one sentence, **one decision and why** (private subnets and an ALB
  instead of a public instance, for example), **one thing that broke and how you found it**, and that it ran
  in your own account with **a budget alarm, and was torn down**.
- **Weak:** a list of twelve services with no decision.

## Q1 — AWS core (6 min)

"Our Lambda function reads an S3 object and gets AccessDenied. The execution role has s3:GetObject on
arn:aws:s3:::lendwise-docs. What is wrong?"

- **Strong:** **object actions need the object ARN**, lendwise-docs/*; then the other layers — **bucket
  policy deny, KMS key policy and kms:Decrypt for SSE-KMS, an SCP**; uses **CloudTrail** for evidence.
- **OK:** spots the ARN only.
- **Weak:** "Give the role s3:*."

Follow-up: "Fixed, and now it fails only for some objects." — Those objects are encrypted with a different
KMS key, or **uploaded by another account** before ownership was enforced.

## Q2 — Networking (8 min)

"An EC2 instance in a private subnet cannot download packages. The subnet's route table has 0.0.0.0/0 to a
NAT gateway. What do you check?"

- **Strong:** **the NAT gateway is in a public subnet** whose route table points to the internet gateway;
  the NAT gateway is **available** with an Elastic IP; the instance's **security group and NACL** allow
  outbound and the replies; **DNS** resolves. If the packages come from S3 (Amazon Linux repositories do),
  an **S3 gateway endpoint** would remove NAT from the path.
- **OK:** checks the route and the security group only.
- **Weak:** "Give the instance a public IP."

Follow-up: "Production has one NAT gateway for three AZs." — **One per AZ**, or losing that AZ cuts outbound
for all of them.

## Q3 — Storage and data (8 min)

"A lending app stores loan agreements in S3 and loan records in RDS. Retention is years; the database may
lose at most five minutes. Design storage and backup."

- **Strong:** S3 **versioning, Object Lock** in compliance mode, **lifecycle** to IA after 30 days and to
  Glacier later, **Block Public Access** and SSE-KMS; RDS **Multi-AZ for availability, PITR for the RPO**,
  **cross-region copy to Hyderabad**, and a **timed restore drill**.
- **OK:** good S3 design, treats Multi-AZ as the backup.
- **Weak:** "Daily snapshots."

Follow-up: "An analyst ran an UPDATE without WHERE." — **Restore to a point in time as a new instance**,
copy back the affected rows, then remove that access.

## Q4 — Architecture (10 min)

"Design a coupon-claim API for a sale: normally 50 requests a second, 5,000 a second for the first ten
minutes after 12 noon IST. Each coupon may be claimed once."

- **Strong:** asks a clarifying question; **API Gateway with throttling**, **Lambda or Fargate** behind it;
  **DynamoDB with a conditional write** so a coupon is claimed once; **pre-scaled** limits and concurrency
  before **06:30 UTC**; non-urgent work (emails, analytics) **on a queue**; a **load test** at peak; names a
  **cost and a failure mode**.
- **OK:** a sound diagram with no once-only guarantee.
- **Weak:** "EC2 with Auto Scaling will handle it."

Follow-up: "Why a conditional write and not a read then write?" — Two requests can both read 'unclaimed'
before either writes; the **condition makes the check and the write one atomic step**.

## Q5 — Azure (3 min)

"The same client asks for this on Azure. What changes?"

- **Strong:** a short map — **Functions or Container Apps, Cosmos DB, API Management, Blob Storage** — and
  **one real difference**: managed identity instead of an execution role, or **choosing storage
  redundancy**.
- **Weak:** "Same thing, different names."

## Close (2 min)

"What would you do differently in the project you described?" — **Strong:** one specific change and how
you would measure it.

## Scoring rubric

| Area | Strong (3) | OK (2) | Weak (1) |
|---|---|---|---|
| AWS core | ARN plus layers, with evidence | ARN only | s3:* |
| Networking | NAT placement, AZ, endpoint | Route and SG | Public IP |
| Storage and data | HA and backup kept apart, drill | S3 only | Daily snapshots |
| Architecture | Throttle, atomic claim, pre-scale | Diagram only | Auto Scaling will cope |
| Azure | Map plus one real difference | Map only | Same names |

Hire bar for a fresher: 11 or more out of 15, with no 1 in AWS core or networking. One unsafe instinct —
opening a security group to 0.0.0.0/0 "to test", or making a bucket public "for a minute" — costs more than
an honest "I have not done that, but here is how I would find out".`,
    mcqs: [
      mcq('In the mock’s Q2, the private subnet routes 0.0.0.0/0 to a NAT gateway but nothing downloads. Which finding is the classic cause?', [
        ['The NAT gateway was created in a private subnet with no IGW route', true],
        ['The instance needs a public IP before NAT will translate its traffic', false],
        ['The NAT gateway needs an inbound security group rule on port 443', false],
        ['NAT gateways handle only IPv6, so IPv4 package mirrors are not reached', false],
      ], 'A NAT gateway must sit in a public subnet whose route table sends 0.0.0.0/0 to the internet gateway, or its own traffic has nowhere to go. Instances behind NAT need no public IP, NAT gateways have no security groups, and they serve IPv4.'),
      mcq('In the mock’s Q4, why does a strong answer use a DynamoDB conditional write to claim a coupon?', [
        ['Conditional writes are cheaper than ordinary writes on sale days', false],
        ['It makes the check and the write atomic, so two claims cannot both win', true],
        ['Without a condition, DynamoDB rejects writes above 1,000 per second', false],
        ['It lets the Lambda function skip API Gateway throttling for claims', false],
      ], 'A read-then-write leaves a gap where two requests both see the coupon unclaimed; a condition expression such as attribute_not_exists makes the test and the write one step. It does not change price, there is no such blanket write rejection, and throttling still applies.'),
      mcq('In the mock’s Q3, which answer earns only an OK on storage and data?', [
        ['PITR for the RPO, Multi-AZ for uptime, and a timed restore drill', false],
        ['Object Lock, lifecycle to IA after 30 days, and Block Public Access', false],
        ['A solid S3 design that treats RDS Multi-AZ as the database backup', true],
        ['A cross-region snapshot copy to Hyderabad with a restore drill', false],
      ], 'The rubric gives OK to a good S3 design that confuses high availability with backup, because Multi-AZ copies a bad change too. The other three are parts of the strong answer.'),
    ],
  },

  /* ── CHECKPOINT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_IV_CLOUD_CHECKPOINT',
    notes: `Ten questions across the cloud engineer interview sets: AWS core, networking, storage and databases,
architecture and Azure. Each is asked the way a panel asks it. Read the detail in the question — an ARN, a
status code, a time zone — before you choose.`,
    checkpoint: [
      ck('CLOUD_FUNDAMENTALS', 'A web app that fetches user-supplied URLs runs on EC2 with IMDSv1. Which risk does an interviewer want you to name?', [
        ['An SSRF request could read the role’s credentials from metadata', true],
        ['The instance could lose its EBS root volume on its next restart', false],
        ['The app’s public IPv4 address could be reassigned to another user', false],
        ['The role’s trust policy could be changed by any outside caller', false],
      ], 'With IMDSv1 a forged GET to 169.254.169.254 returns credentials, which IMDSv2’s session token blocks. Restarts do not delete EBS roots, IP reassignment happens on stop/start, and trust policies change only through IAM calls.'),
      ck('CLOUD_FUNDAMENTALS', 'On RDS, which of these is still the customer’s responsibility under the shared responsibility model?', [
        ['Patching the database engine during the maintenance window', false],
        ['Replacing failed storage hardware under the database host', false],
        ['Whether the instance is publicly accessible, and its rules', true],
        ['Running the hypervisor that the database instance runs on', false],
      ], 'Network exposure, security groups, encryption choices and backups are customer settings on any managed service. AWS patches the engine in your window, replaces hardware and runs the hypervisor.'),
      ck('CLOUD_FUNDAMENTALS', 'An AWS engineer moving to Azure asks what has no direct AWS equivalent. Which is the best answer?', [
        ['Virtual networks, which Azure calls VNets', false],
        ['Resource groups, which delete everything in them', true],
        ['Managed databases, offered as Flexible Server', false],
        ['Object storage, offered as Blob Storage there', false],
      ], 'Every Azure resource sits in exactly one resource group, a lifecycle container with no AWS twin. VNets, managed PostgreSQL and Blob Storage all map closely to VPCs, RDS and S3.'),
      ck('CLOUD_NETWORKING', 'Private subnets in three AZs all route outbound through one NAT gateway in AZ-a. What is the main problem?', [
        ['NAT gateways need an Elastic IP in each AZ they serve', false],
        ['Traffic from the other AZs is blocked by the NACLs by default', false],
        ['NAT gateways cannot be shared by more than one route table', false],
        ['Losing AZ-a cuts outbound access for every private subnet', true],
      ], 'A NAT gateway is zonal, so one in AZ-a is a single point of failure for outbound traffic (and adds cross-AZ data charges). It needs one Elastic IP, default NACLs allow the traffic, and many route tables can point to it.'),
      ck('CLOUD_NETWORKING', 'An app timed out connecting to RDS on 5432, while another host got "connection refused". What does the difference tell you?', [
        ['A timeout means dropped packets; refused means nothing is listening', true],
        ['A timeout means a wrong password; refused means the DB is in another AZ', false],
        ['Both mean the security group is blocking the database port 5432', false],
        ['A timeout means DNS failed; refused means the TLS certificate is bad', false],
      ], 'Silence until timeout means something dropped the packets — a security group, NACL or missing route. A refusal is an RST from a reachable host with no listener on that port. Passwords, AZs, DNS failures and certificates produce different errors.'),
      ck('CLOUD_NETWORKING', 'The root domain lendwise.in must point to an ALB. Which record works?', [
        ['A CNAME at the apex pointing to the ALB’s DNS name', false],
        ['An A record holding the ALB’s current IP addresses', false],
        ['An alias A record at the apex targeting the ALB', true],
        ['A TXT record that names the ALB’s ARN for lookup', false],
      ], 'A CNAME is not allowed at the zone apex, and ALB addresses change, so fixed A records break. A Route 53 alias answers with the ALB’s current addresses. TXT records do not direct traffic.'),
      ck('CLOUD_STORAGE', 'A security review requires encryption at rest on an existing unencrypted RDS instance. What is the correct procedure?', [
        ['Modify the instance and tick encryption, applied at the next window', false],
        ['Snapshot it, copy the snapshot encrypted, restore a new instance', true],
        ['Create an encrypted read replica and promote it as the new primary', false],
        ['Enable EBS encryption by default, which covers RDS volumes as well', false],
      ], 'Encryption at rest is chosen at creation, so an unencrypted instance is moved through an encrypted snapshot copy and a restore. It cannot be modified in place, a replica of an unencrypted source cannot be encrypted, and the EBS default setting does not apply to RDS.'),
      ck('CLOUD_STORAGE', 'For “all of customer C1’s orders this month”, why does a DynamoDB Query on customer_id beat a Scan with a filter?', [
        ['A Scan cannot use a filter expression on non-key attributes', false],
        ['A Query returns items sorted, which a Scan can never do at all', false],
        ['A Scan is eventually consistent, so it may miss recent orders', false],
        ['A Query reads only C1’s items; a Scan reads the whole table', true],
      ], 'A Query reads one partition key’s items (and a sort key range), while a Scan reads every item and then filters, paying for all of them. Scans can filter on any attribute and can be strongly consistent; the difference is how much is read.'),
      ck('CLOUD_COMPUTE', 'An internal API gets bursts during office hours and nothing at night, with requests under a second. Which compute fits best to start?', [
        ['Lambda behind API Gateway, paying per request', true],
        ['A Reserved EC2 instance running all day and night', false],
        ['An EKS cluster with three on-demand worker nodes', false],
        ['A Spot fleet, since the traffic is unpredictable', false],
      ], 'Short, spiky, idle-at-night traffic suits Lambda: no idle capacity to pay for and no servers to run. A reserved instance and an EKS cluster pay all night, and Spot can be interrupted, which suits batch work rather than a user-facing API.'),
      ck('CLOUD_COMPUTE', 'Why must session data move off the instance before an app can scale horizontally?', [
        ['Load balancers reject requests that carry a session cookie', false],
        ['Auto Scaling launches only instances without local disks', false],
        ['Session files on local disk are slower than on a database', false],
        ['Any instance must serve any request, and scale-in kills one', true],
      ], 'Horizontal scaling assumes copies are interchangeable and disposable; state on one instance is lost when it is removed and unavailable to the others. Load balancers handle cookies, instances can have disks, and speed is not the issue.'),
    ],
  },
];
