import { TopicSeed } from './year1MegaCurriculum';
import { u } from './year4UnitKit';
import { ending } from './trackUnitsWeb';
import { interview } from './trackUnitsPlacement';

/**
 * Career-track content for Cloud & DevOps Engineer — AWS as the main cloud, with Azure taught as the
 * second cloud an engineer is expected to read and run. The track stands on the years' Linux,
 * networking, shell, Docker, CI/CD and cloud basics (packs SEC_SYSTEMS_BASICS and CLOUD_YEAR_BASICS);
 * these topics add what a cloud or DevOps engineer does at work: design and run AWS accounts and
 * networks, ship with containers, Kubernetes, Terraform and pipelines, and operate what they ship.
 *
 * Everything is taught on accounts and clusters the student owns, inside the AWS Free Tier or an
 * Azure free account wherever possible, with a budget alarm set before anything is created — and on
 * local tools (Docker, kind, Terraform, LocalStack) where a cloud bill is not worth it. Skills are the
 * CLOUD_INFRA domain of the role catalogue (aiDataSecuritySkills.ts).
 */

/** Batch CL1: AWS for engineers — accounts and IAM, networking, compute and storage, databases. */
export const TRACK_CL_AWS: Record<string, TopicSeed> = {
  /* ── AWS foundations: accounts, IAM and the CLI ── */
  CL_AWS_FOUNDATIONS: { category: 'UNIVERSAL', units: [
    u('GLOBAL_INFRA', 'How AWS Is Built: Regions, Availability Zones and Services', 'Regions and AZs, choosing a region (latency, cost, data residency in India), the shared responsibility model, and how AWS services are grouped.',
      ['Choose a region and explain what AWS runs for you and what you still own'], 35),
    u('ACCOUNT_SETUP', 'A Safe AWS Account: Root, MFA, Budgets and Free Tier', 'Locking away the root user, MFA, an admin identity for daily work, AWS Budgets and billing alarms, and staying inside the Free Tier.',
      ['Set up an AWS account that cannot surprise you with a bill or a breach'], 35, { after: ['GLOBAL_INFRA'] }),
    u('IAM_POLICIES', 'IAM: Users, Groups, Roles and Policies', 'Identities versus roles, policy documents (Effect, Action, Resource, Condition), managed versus inline, and the policy evaluation logic.',
      ['Write and read IAM policies and say exactly what a principal can do'], 45, { after: ['ACCOUNT_SETUP'] }),
    u('ROLES_FEDERATION', 'Roles, Temporary Credentials and IAM Identity Center', 'Assuming roles, instance profiles, STS, cross-account access, single sign-on with IAM Identity Center, and why long-lived keys are the last resort.',
      ['Give people and workloads access through roles instead of long-lived keys'], 40, { after: ['IAM_POLICIES'] }),
    u('CLI_SDK', 'The AWS CLI and boto3', 'Profiles and configuration, the CLI\'s output and query options, and automating AWS from Python with boto3, paginators and waiters.',
      ['Drive AWS from the command line and from Python scripts'], 40, { after: ['ROLES_FEDERATION'] }),
    u('ORGANIZATIONS_TAGGING', 'Multi-Account Setups, Tags and Guardrails', 'AWS Organizations, OUs and service control policies, a landing-zone layout (prod, non-prod, security, log archive), and tagging for ownership and cost.',
      ['Lay out accounts and guardrails the way a company runs AWS'], 40, { after: ['CLI_SDK'] }),
    ...ending('AWS Foundations', 'ORGANIZATIONS_TAGGING', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── AWS networking ── */
  CL_AWS_NETWORKING: { category: 'UNIVERSAL', units: [
    u('VPC_DESIGN', 'Designing a VPC: CIDR, Subnets and Availability Zones', 'Choosing CIDR ranges that will not clash, public and private subnets across AZs, and the default VPC versus your own.',
      ['Design a VPC address plan with public and private subnets across zones'], 40),
    u('ROUTING_GATEWAYS', 'Route Tables, Internet and NAT Gateways', 'What makes a subnet public, routing to the internet, NAT for private subnets and its cost, and egress-only gateways for IPv6.',
      ['Route traffic in and out of a VPC and keep private subnets private'], 40, { after: ['VPC_DESIGN'] }),
    u('SG_NACL', 'Security Groups and Network ACLs', 'Stateful security groups versus stateless NACLs, referencing one group from another, least-open rules, and reading why a connection fails.',
      ['Write security group and NACL rules that allow exactly what an app needs'], 40, { after: ['ROUTING_GATEWAYS'] }),
    u('PRIVATE_CONNECTIVITY', 'Endpoints, Peering, Transit Gateway and VPN', 'Gateway and interface endpoints, VPC peering versus Transit Gateway, Site-to-Site VPN and Direct Connect in outline.',
      ['Connect VPCs, services and offices privately and choose the right option'], 40, { after: ['SG_NACL'] }),
    u('DNS_ROUTE53', 'DNS with Route 53', 'Hosted zones, record types and alias records, routing policies (simple, weighted, latency, failover), health checks and private zones.',
      ['Run DNS for an application with Route 53, including failover'], 35, { after: ['PRIVATE_CONNECTIVITY'] }),
    u('LOAD_BALANCERS_CDN', 'Load Balancers and CloudFront', 'ALB versus NLB, listeners, target groups and health checks, TLS with ACM certificates, and CloudFront in front of an app or a bucket.',
      ['Put a load balancer and a CDN in front of an application with TLS'], 45, { after: ['DNS_ROUTE53'] }),
    ...ending('AWS Networking', 'LOAD_BALANCERS_CDN', { project: ['MINI_PROJECT', 'Mini Project — The Network for a Three-Tier App',
      'For a ticket-booking startup in Pune: design and build a two-AZ VPC with public, app and data subnets, NAT, endpoints, security groups, an ALB with TLS and Route 53 records — documented with a diagram and a cost estimate.'] }),
  ] },

  /* ── AWS compute and storage ── */
  CL_AWS_COMPUTE_STORAGE: { category: 'UNIVERSAL', units: [
    u('EC2_BASICS', 'EC2: Instance Types, AMIs and Key Access', 'Instance families and sizing, AMIs, user data for bootstrapping, connecting with Session Manager instead of open SSH, and instance metadata (IMDSv2).',
      ['Launch, bootstrap and reach an EC2 instance safely'], 45),
    u('EBS_EFS', 'Block and File Storage: EBS and EFS', 'EBS volume types, snapshots and encryption, instance store, and when shared file storage with EFS is the right answer.',
      ['Choose and manage block and file storage for servers'], 35, { after: ['EC2_BASICS'] }),
    u('AUTO_SCALING', 'Launch Templates and Auto Scaling Groups', 'Launch templates, ASGs across AZs, scaling policies (target tracking, step, scheduled), health checks and instance refresh.',
      ['Run a fleet that heals itself and scales with load'], 45, { after: ['EBS_EFS'] }),
    u('S3_FUNDAMENTALS', 'S3: Buckets, Objects and Access', 'Buckets and keys, storage classes, Block Public Access, bucket policies, presigned URLs, versioning and encryption.',
      ['Store and share objects in S3 without ever making a bucket public by accident'], 45, { after: ['AUTO_SCALING'] }),
    u('S3_LIFECYCLE_BACKUP', 'Lifecycle, Replication and Backups', 'Lifecycle rules to cheaper classes, replication, Object Lock, AWS Backup plans, and testing a restore.',
      ['Keep data for as long as it is needed, at the right cost, and prove it can be restored'], 35, { after: ['S3_FUNDAMENTALS'] }),
    u('PRICING_PURCHASE', 'Paying for Compute: On-Demand, Savings Plans and Spot', 'Pricing models, Savings Plans and Reserved Instances, Spot for interruptible work, Graviton, and right-sizing.',
      ['Choose how to pay for compute and cut the bill without risking the service'], 35, { after: ['S3_LIFECYCLE_BACKUP'] }),
    ...ending('AWS Compute and Storage', 'PRICING_PURCHASE', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── AWS databases ── */
  CL_AWS_DATABASES: { category: 'UNIVERSAL', units: [
    u('RDS_AURORA', 'Managed Relational Databases: RDS and Aurora', 'Engines, instance classes and storage, Multi-AZ versus read replicas, Aurora\'s architecture, parameter groups and maintenance windows.',
      ['Run a production relational database on RDS or Aurora'], 45),
    u('DB_BACKUP_DR', 'Database Backups, Restores and Disaster Recovery', 'Automated backups and point-in-time restore, snapshots, cross-region copies, RPO and RTO, and rehearsing a restore.',
      ['Plan and rehearse database recovery against an agreed RPO and RTO'], 40, { after: ['RDS_AURORA'] }),
    u('DYNAMODB', 'DynamoDB: Keys, Access Patterns and Capacity', 'Partition and sort keys, designing from access patterns, GSIs, on-demand versus provisioned capacity, TTL and streams.',
      ['Model a DynamoDB table from its access patterns'], 45, { after: ['DB_BACKUP_DR'] }),
    u('CACHING_ELASTICACHE', 'Caching with ElastiCache', 'Redis and Memcached, cache-aside and write-through, TTLs and invalidation, and what a cache does to consistency.',
      ['Add a cache that helps without serving wrong data'], 35, { after: ['DYNAMODB'] }),
    ...ending('AWS Databases', 'CACHING_ELASTICACHE', { minutes: [40, 50, 35, 40] }),
  ] },
};

/** Batch CL2: delivery — serverless, containers and Kubernetes, Terraform, CI/CD and GitOps. */
export const TRACK_CL_DELIVERY: Record<string, TopicSeed> = {
  /* ── Serverless and events ── */
  CL_SERVERLESS: { category: 'UNIVERSAL', units: [
    u('LAMBDA_BASICS', 'AWS Lambda: Functions, Triggers and Limits', 'The execution model, handlers in Python, triggers, timeouts and memory, cold starts, layers, and what Lambda is bad at.',
      ['Build and configure a Lambda function and know when not to use one'], 45),
    u('API_GATEWAY', 'APIs with API Gateway and Lambda', 'HTTP versus REST APIs, routes and integrations, authorisers, throttling and CORS.',
      ['Expose a serverless API with authorisation and throttling'], 40, { after: ['LAMBDA_BASICS'] }),
    u('MESSAGING', 'Queues and Topics: SQS and SNS', 'Decoupling with queues, standard versus FIFO, visibility timeouts, dead-letter queues, fan-out with SNS, and idempotent consumers.',
      ['Decouple services with queues and topics that survive failures'], 40, { after: ['API_GATEWAY'] }),
    u('EVENTBRIDGE_STEP', 'EventBridge and Step Functions', 'Event buses and rules, scheduled events, orchestration versus choreography, and Step Functions for multi-step workflows with retries.',
      ['Build an event-driven workflow with retries and visibility'], 40, { after: ['MESSAGING'] }),
    u('SERVERLESS_OPS', 'Packaging, Deploying and Testing Serverless Apps', 'AWS SAM in outline, environment configuration, local testing, permissions per function, and observing a serverless app.',
      ['Package, deploy and test a serverless application as one unit'], 40, { after: ['EVENTBRIDGE_STEP'] }),
    ...ending('Serverless on AWS', 'SERVERLESS_OPS', { project: ['MINI_PROJECT', 'Mini Project — An Event-Driven Order Pipeline',
      'For a grocery delivery startup: an HTTP API takes orders, a queue and Lambda functions process them, EventBridge notifies downstream services, failures go to a dead-letter queue, and the whole stack deploys from a template.'] }),
  ] },

  /* ── Containers and Kubernetes ── */
  CL_KUBERNETES: { category: 'UNIVERSAL', units: [
    u('CONTAINERS_ON_AWS', 'Containers on AWS: ECR, ECS and Fargate', 'Pushing images to ECR, ECS task definitions and services, Fargate versus EC2 launch types, and when ECS is enough.',
      ['Run a containerised service on ECS with Fargate'], 40),
    u('K8S_ARCHITECTURE', 'Kubernetes: the Cluster and Its Objects', 'Control plane and nodes, Pods, ReplicaSets and Deployments, declarative YAML, kubectl, and a local cluster with kind.',
      ['Explain how Kubernetes runs workloads and drive a local cluster with kubectl'], 45, { after: ['CONTAINERS_ON_AWS'] }),
    u('K8S_SERVICES_INGRESS', 'Services, Ingress and Networking', 'ClusterIP, NodePort and LoadBalancer services, DNS inside the cluster, Ingress controllers, and network policies.',
      ['Expose workloads inside and outside a cluster correctly'], 45, { after: ['K8S_ARCHITECTURE'] }),
    u('K8S_CONFIG_STORAGE', 'ConfigMaps, Secrets and Persistent Storage', 'Configuration and secrets, mounting them, persistent volumes and claims, StatefulSets, and what not to keep in a cluster.',
      ['Configure workloads and give the ones that need it durable storage'], 40, { after: ['K8S_SERVICES_INGRESS'] }),
    u('K8S_RELIABILITY', 'Probes, Resources, Autoscaling and Rollouts', 'Liveness, readiness and startup probes, requests and limits, the Horizontal Pod Autoscaler, rolling updates and rollbacks, and PodDisruptionBudgets.',
      ['Make a Kubernetes deployment self-healing, right-sized and safely updatable'], 45, { after: ['K8S_CONFIG_STORAGE'] }),
    u('HELM', 'Packaging with Helm', 'Charts, values and templates, releases, upgrades and rollbacks, and using public charts without trusting them blindly.',
      ['Package and release an application with Helm'], 35, { after: ['K8S_RELIABILITY'] }),
    u('EKS', 'Amazon EKS', 'Creating a cluster, managed node groups and Fargate profiles, IAM roles for service accounts, the AWS Load Balancer Controller, and cluster upgrades.',
      ['Run workloads on EKS with AWS-native networking and identity'], 45, { after: ['HELM'] }),
    ...ending('Containers and Kubernetes', 'EKS', { project: ['MINI_PROJECT', 'Mini Project — A Microservice App on Kubernetes',
      'Take a three-service app (API, worker, web) for a clinic booking system: containerise it, write the Kubernetes manifests with probes, limits and autoscaling, package it as a Helm chart, run it on kind, then document the changes needed for EKS.'] }),
  ] },

  /* ── Infrastructure as code ── */
  CL_TERRAFORM: { category: 'UNIVERSAL', units: [
    u('IAC_CONCEPTS', 'Infrastructure as Code: Why and How', 'Declarative versus imperative, drift, idempotence, the plan-and-apply cycle, and the tools: Terraform, CloudFormation, Bicep, Pulumi.',
      ['Explain what infrastructure as code solves and choose a tool for a team'], 35),
    u('TERRAFORM_BASICS', 'Terraform Basics: Providers, Resources and Variables', 'HCL, providers, resources and data sources, variables and outputs, and the init-plan-apply-destroy loop against AWS.',
      ['Write Terraform that builds AWS resources and read a plan before applying it'], 45, { after: ['IAC_CONCEPTS'] }),
    u('TERRAFORM_STATE', 'State, Remote Backends and Locking', 'What state is and why it is sensitive, an S3 backend with locking, importing existing resources, and moving and removing state safely.',
      ['Keep Terraform state safe and shared, and change it without breaking things'], 40, { after: ['TERRAFORM_BASICS'] }),
    u('TERRAFORM_MODULES', 'Modules, Environments and Workspaces', 'Writing and versioning modules, using registry modules carefully, one codebase for dev, staging and prod, and keeping environments apart.',
      ['Structure Terraform for several environments with reusable modules'], 45, { after: ['TERRAFORM_STATE'] }),
    u('IAC_PIPELINE', 'Terraform in a Pipeline: Review, Policy and Drift', 'fmt, validate and plan on every pull request, policy checks (tfsec/Checkov, OPA in outline), applying from CI, and detecting drift.',
      ['Run infrastructure changes through review, policy checks and CI'], 40, { after: ['TERRAFORM_MODULES'] }),
    u('CLOUDFORMATION_BICEP', 'CloudFormation and Bicep for Terraform Users', 'Reading and changing CloudFormation stacks (and CDK in outline), and Azure\'s Bicep — enough to work where a team uses them.',
      ['Read and change CloudFormation and Bicep templates'], 35, { after: ['IAC_PIPELINE'] }),
    ...ending('Infrastructure as Code', 'CLOUDFORMATION_BICEP', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── CI/CD and GitOps ── */
  CL_CICD_GITOPS: { category: 'UNIVERSAL', units: [
    u('PIPELINE_DESIGN', 'Designing a Delivery Pipeline', 'Build, test, scan, package, deploy and verify; environments and promotion; artefacts built once; and what makes a pipeline trustworthy.',
      ['Design a pipeline from commit to production that a team can trust'], 40),
    u('GHA_TO_AWS', 'GitHub Actions to AWS with OIDC', 'Workflows, jobs and caching, OIDC federation instead of stored keys, building and pushing to ECR, and deploying to ECS or EKS.',
      ['Deploy to AWS from GitHub Actions without storing any cloud keys'], 45, { after: ['PIPELINE_DESIGN'] }),
    u('SUPPLY_CHAIN', 'Securing the Pipeline: Scans, Signing and Secrets', 'Dependency and image scanning in CI, image signing in outline, secret scanning, least-privilege runners and protected branches.',
      ['Add the checks that stop a vulnerable or tampered build from shipping'], 40, { after: ['GHA_TO_AWS'] }),
    u('DEPLOY_STRATEGIES', 'Release Strategies: Rolling, Blue-Green, Canary and Feature Flags', 'Each strategy\'s risk and cost, automated rollback on bad metrics, database migrations that survive a rollback, and feature flags.',
      ['Choose a release strategy and roll back safely when it goes wrong'], 40, { after: ['SUPPLY_CHAIN'] }),
    u('GITOPS_ARGOCD', 'GitOps with Argo CD', 'Git as the source of truth for the cluster, Argo CD applications and sync, drift detection, and promoting between environments by pull request.',
      ['Run Kubernetes deployments the GitOps way with Argo CD'], 40, { after: ['DEPLOY_STRATEGIES'] }),
    ...ending('CI/CD and GitOps', 'GITOPS_ARGOCD', { minutes: [40, 50, 35, 40] }),
  ] },
};

/** Batch CL3: operate — observability and SRE, security and cost, Azure, and the capstone. */
export const TRACK_CL_OPERATE: Record<string, TopicSeed> = {
  /* ── Observability and SRE ── */
  CL_OBSERVABILITY_SRE: { category: 'UNIVERSAL', units: [
    u('THREE_SIGNALS', 'Logs, Metrics and Traces', 'What each signal answers, structured logging, the golden signals and RED/USE methods, cardinality, and OpenTelemetry in outline.',
      ['Instrument a service so its behaviour can be explained from the outside'], 40),
    u('CLOUDWATCH', 'CloudWatch: Metrics, Logs, Alarms and Dashboards', 'Built-in and custom metrics, log groups and Logs Insights queries, alarms and composite alarms, dashboards, and X-Ray tracing in outline.',
      ['Monitor an AWS workload with CloudWatch and alarm on what matters'], 45, { after: ['THREE_SIGNALS'] }),
    u('PROMETHEUS_GRAFANA', 'Prometheus and Grafana', 'Scraping and exporters, PromQL basics, recording and alerting rules, Alertmanager, and Grafana dashboards on a Kubernetes cluster.',
      ['Monitor a cluster with Prometheus and Grafana and write useful PromQL'], 45, { after: ['CLOUDWATCH'] }),
    u('SLI_SLO', 'SLIs, SLOs and Error Budgets', 'Choosing user-facing indicators, setting objectives, error budgets and burn-rate alerts, and what a team does when the budget runs out.',
      ['Define SLIs and SLOs for a service and alert on error-budget burn'], 45, { after: ['PROMETHEUS_GRAFANA'] }),
    u('INCIDENTS_POSTMORTEMS', 'On-Call, Incidents and Blameless Postmortems', 'Severity levels, incident roles, communication and status pages, runbooks, and writing a postmortem whose actions actually get done.',
      ['Run an incident and write a blameless postmortem with real follow-ups'], 40, { after: ['SLI_SLO'] }),
    u('RELIABILITY_CAPACITY', 'Reliability Patterns and Capacity Planning', 'Timeouts, retries with backoff, circuit breakers, graceful degradation, load testing, headroom and planning for a sale-day spike.',
      ['Design for failure and plan capacity before the traffic arrives'], 40, { after: ['INCIDENTS_POSTMORTEMS'] }),
    ...ending('Observability and SRE', 'RELIABILITY_CAPACITY', { project: ['MINI_PROJECT', 'Mini Project — SLOs and On-Call for a Payments API',
      'For a payments API at a fintech in Bengaluru: instrument the service, build the dashboards, define two SLOs with burn-rate alerts, write the runbooks, run a game day that breaks a dependency, and write the postmortem.'] }),
  ] },

  /* ── Cloud security and cost ── */
  CL_SECURITY_COST: { category: 'UNIVERSAL', units: [
    u('WELL_ARCHITECTED', 'The AWS Well-Architected Framework', 'The six pillars, running a review, and turning findings into a prioritised improvement plan.',
      ['Review a workload against Well-Architected and prioritise what to fix'], 35),
    u('ENCRYPTION_SECRETS', 'KMS, Encryption and Secrets Manager', 'Encryption at rest and in transit, KMS keys and key policies, envelope encryption, Secrets Manager and Parameter Store, and rotation.',
      ['Encrypt data and manage secrets so no credential lives in code'], 40, { after: ['WELL_ARCHITECTED'] }),
    u('SECURITY_SERVICES', 'Guardrails and Detection: CloudTrail, Config, GuardDuty and Security Hub', 'Audit trails, configuration rules, threat detection findings, a single security view, and responding to a finding.',
      ['Turn on and act on the AWS security services every account should have'], 40, { after: ['ENCRYPTION_SECRETS'] }),
    u('FINOPS', 'FinOps: Seeing, Explaining and Cutting the Bill', 'Cost Explorer, Cost and Usage Reports, allocation by tags, anomaly detection, the usual waste (idle, oversized, data transfer, NAT), and showback.',
      ['Explain a cloud bill and cut it with evidence'], 40, { after: ['SECURITY_SERVICES'] }),
    ...ending('Cloud Security and Cost', 'FINOPS', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── Azure for AWS engineers ── */
  CL_AZURE: { category: 'UNIVERSAL', units: [
    u('AZURE_MAP', 'Azure for an AWS Engineer: the Map', 'Tenants, management groups, subscriptions and resource groups, regions and availability zones, the portal and the az CLI, and the AWS-to-Azure service map.',
      ['Find your way around Azure by mapping it to what you know from AWS'], 40),
    u('ENTRA_RBAC', 'Microsoft Entra ID and Azure RBAC', 'Users, groups and service principals, managed identities, role assignments at each scope, custom roles, and Azure Policy.',
      ['Grant least-privilege access in Azure with RBAC, managed identities and policy'], 45, { after: ['AZURE_MAP'] }),
    u('AZURE_NETWORKING', 'Azure Networking: VNets, NSGs and Load Balancing', 'VNets and subnets, NSGs and application security groups, peering, private endpoints, Azure Load Balancer, Application Gateway and Front Door.',
      ['Design and secure an Azure network for a multi-tier application'], 45, { after: ['ENTRA_RBAC'] }),
    u('AZURE_COMPUTE', 'Azure Compute: VMs, Scale Sets and App Service', 'Virtual machines and scale sets, App Service plans and deployment slots, and Azure Functions — mapped to EC2, ASGs and Lambda.',
      ['Run applications on Azure VMs, App Service and Functions'], 45, { after: ['AZURE_NETWORKING'] }),
    u('AZURE_STORAGE_DATA', 'Azure Storage and Databases', 'Storage accounts, Blob tiers and access, redundancy options, Azure SQL Database and Cosmos DB, and backups.',
      ['Choose and secure Azure storage and managed databases'], 40, { after: ['AZURE_COMPUTE'] }),
    u('AKS_ACR', 'Containers on Azure: ACR and AKS', 'Azure Container Registry, AKS clusters and node pools, workload identity, and what changes moving a Helm release from EKS to AKS.',
      ['Run the same containerised app on AKS that you ran on EKS'], 45, { after: ['AZURE_STORAGE_DATA'] }),
    u('AZURE_MONITOR_IAC', 'Azure Monitor, Log Analytics and Terraform on Azure', 'Metrics and Log Analytics with KQL, alerts and Application Insights, and the azurerm Terraform provider with Bicep alongside.',
      ['Monitor Azure workloads and build Azure infrastructure with Terraform'], 45, { after: ['AKS_ACR'] }),
    u('AZURE_COST_GOVERN', 'Azure Cost Management, Governance and the AZ-104 Map', 'Budgets and cost analysis, tagging and policy for governance, Azure Advisor, and how this topic maps to AZ-900 and AZ-104.',
      ['Govern and cost-manage an Azure subscription and plan the Azure certifications'], 35, { after: ['AZURE_MONITOR_IAC'] }),
    ...ending('Azure', 'AZURE_COST_GOVERN', { project: ['MINI_PROJECT', 'Mini Project — The Same App on Azure',
      'Take the three-tier app you built on AWS and run it on Azure with Terraform: VNet and NSGs, App Service or AKS, a managed database, Key Vault secrets, Azure Monitor alerts and a budget — with a written comparison of cost, effort and gaps against the AWS version.'] }),
  ] },

  /* ── The Cloud & DevOps capstone ── */
  CL_CAPSTONE: { category: 'UNIVERSAL', units: [
    u('BRIEF', 'The Capstone: A Production Platform for a Real Product', 'A platform for an e-commerce, ed-tech or healthcare product: requirements, SLOs, budget, architecture on AWS, and the plan to deliver it.',
      ['Scope a cloud platform — architecture, SLOs, budget and delivery plan — for a product'], 45),
    u('BUILD_PLATFORM', 'Capstone Build — Infrastructure and Delivery', 'The AWS foundation in Terraform (accounts, network, cluster or ECS, database), the app containerised, and a pipeline with OIDC, scans and progressive delivery.',
      ['Build the platform as code and ship the product through a trustworthy pipeline'], 300, { unitType: 'PROJECT', after: ['BRIEF'], skillKeys: ['INFRA_AS_CODE', 'KUBERNETES'] }),
    u('BUILD_OPERATE', 'Capstone Build — Observability, Reliability and an Azure Failover', 'Dashboards, SLOs and alerts, a game day and its postmortem, a cost report, and a disaster-recovery copy of the critical path on Azure.',
      ['Operate the platform to its SLOs and prove recovery on a second cloud'], 240, { unitType: 'PROJECT', after: ['BUILD_PLATFORM'], skillKeys: ['OBSERVABILITY', 'SLI_SLO'] }),
    u('DEFENCE', 'Demo Day: Presenting and Defending the Platform', 'A live deploy and rollback, the dashboards during load, the cost and the trade-offs, and the questions a platform hiring panel asks.',
      ['Demo the platform and defend its design and decisions under questioning'], 45, { unitType: 'PRACTICE', after: ['BUILD_OPERATE'] }),
    u('CHECKPOINT', 'Capstone — Checkpoint', 'Where you actually are across the whole track, measured rather than felt.',
      ['Show cloud and DevOps judgement at the standard a hiring panel expects'], 40, { unitType: 'CHECKPOINT', after: ['DEFENCE'] }),
  ] },
};

/**
 * Batch CL4: Year-4 placement for Cloud & DevOps Engineer. Aptitude, coding rounds, core CS, HR and mocks
 * are the shared placement packs; these add the cloud and DevOps interviews, scenario rounds and the candidate.
 */
export const TRACK_CL_PLACE: Record<string, TopicSeed> = {
  /* ── The cloud interview ── */
  CL_IV_CLOUD: { category: 'UNIVERSAL', units: interview('Cloud Engineer Interview', [
    ['IV_AWS_CORE', 'AWS Core Questions', 'Regions and AZs, IAM policies and roles, EC2, S3 and the shared responsibility model, at interview depth.', ['CLOUD_FUNDAMENTALS']],
    ['IV_AWS_NETWORK', 'AWS Networking Questions', 'VPC design, public versus private subnets, NAT, security groups versus NACLs, endpoints, load balancers and Route 53.', ['CLOUD_NETWORKING']],
    ['IV_DATA_STORAGE', 'Storage and Database Questions', 'S3 classes and access, EBS and EFS, RDS Multi-AZ versus replicas, DynamoDB keys, backups, RPO and RTO.', ['CLOUD_STORAGE']],
    ['IV_ARCHITECTURE', 'Cloud Architecture Questions', 'High availability, scaling, serverless versus containers, cost trade-offs and Well-Architected reasoning.', ['CLOUD_COMPUTE']],
    ['IV_AZURE', 'Azure Questions', 'Subscriptions and resource groups, Entra ID and RBAC, VNets and NSGs, App Service, AKS and the AWS-to-Azure map.', ['CLOUD_FUNDAMENTALS']],
  ]) },

  /* ── The DevOps interview ── */
  CL_IV_DEVOPS: { category: 'UNIVERSAL', units: interview('DevOps Engineer Interview', [
    ['IV_LINUX', 'Linux and Networking Questions', 'Processes, permissions, systemd, disk and memory, logs, and debugging a box that will not serve traffic.', ['LINUX_ADMIN']],
    ['IV_DOCKER_K8S', 'Docker and Kubernetes Questions', 'Images and layers, Dockerfiles, Pods, Deployments, Services, probes, resources and a CrashLoopBackOff.', ['KUBERNETES']],
    ['IV_TERRAFORM', 'Terraform and IaC Questions', 'State and locking, modules, plan versus apply, drift, environments, and a failed apply.', ['INFRA_AS_CODE']],
    ['IV_CICD', 'CI/CD Questions', 'Pipeline stages, artefacts, secrets in pipelines, OIDC, release strategies and rollback.', ['CI_CD']],
    ['IV_SRE', 'Monitoring and SRE Questions', 'Golden signals, SLIs and SLOs, error budgets, alert fatigue, incident roles and postmortems.', ['OBSERVABILITY']],
  ]) },

  /* ── Scenario rounds ── */
  CL_SCENARIO_ROUNDS: { category: 'UNIVERSAL', units: [
    u('TROUBLESHOOTING_ROUND', 'The Live Troubleshooting Round', 'A broken deployment, a 502 from the load balancer, a pod that will not start — talking through checks in order and why.',
      ['Troubleshoot a broken cloud or Kubernetes setup aloud with a clear method'], 45),
    u('DESIGN_ROUND', 'The Cloud Design Round', 'Designing an architecture on a whiteboard for stated load, availability and budget, and defending each choice.',
      ['Design a cloud architecture to requirements and defend its trade-offs'], 45, { after: ['TROUBLESHOOTING_ROUND'] }),
    u('IAC_TAKEHOME', 'The Terraform and Pipeline Take-Home', 'A typical take-home: infrastructure and a pipeline for a small app, with a README a reviewer can run.',
      ['Deliver an infrastructure-and-pipeline take-home that gets a call-back'], 45, { after: ['DESIGN_ROUND'] }),
    u('INCIDENT_ROUND', 'The Incident and On-Call Round', 'An interviewer plays an outage; you triage, communicate, mitigate and then describe the postmortem.',
      ['Handle an interview outage scenario with sound decisions and clear communication'], 40, { after: ['IAC_TAKEHOME'] }),
    u('TIMED_SCENARIOS', 'Timed Scenario Set', 'Three cloud and DevOps scenario questions under time, with model answers and how each is scored.',
      ['Answer timed cloud scenario questions with structure and evidence'], 50, { unitType: 'PRACTICE', after: ['INCIDENT_ROUND'] }),
    u('CHECKPOINT', 'Cloud Scenario Rounds — Checkpoint', 'Where you actually are on this, measured rather than felt.',
      ['Show structured cloud and DevOps scenario thinking at interview standard'], 40, { unitType: 'CHECKPOINT', after: ['TIMED_SCENARIOS'] }),
  ] },

  /* ── The cloud candidate ── */
  CL_PLACE_CANDIDATE: { category: 'UNIVERSAL', units: [
    u('RESUME', 'A Cloud Engineer\'s Resume and Portfolio', 'The skills line recruiters filter on, project bullets with evidence (diagrams, repositories, cost figures), and a portfolio that runs.',
      ['Write a cloud resume and portfolio whose every claim can be checked'], 45, { skillKeys: ['PLACEMENT_READINESS', 'PORTFOLIO_EVIDENCE'] }),
    u('CERTIFICATIONS', 'AWS and Azure Certifications and the Career Path', 'Cloud Practitioner, Solutions Architect Associate, AZ-900 and AZ-104, CKA in outline — what each proves, the order, and the cloud career paths in India.',
      ['Plan certifications and a first cloud or DevOps role that fit your goals'], 35, { after: ['RESUME'], skillKeys: ['PLACEMENT_READINESS'] }),
    u('MOCK_LOOP', 'The Cloud & DevOps Interview Loop — Mock', 'Online test, a technical round, a troubleshooting round, a design round and HR — as one mock day, with the debrief.',
      ['Go through a complete cloud and DevOps interview loop and act on its debrief'], 60, { unitType: 'PRACTICE', after: ['CERTIFICATIONS'], skillKeys: ['INTERVIEW_PERFORMANCE'] }),
    u('CHECKPOINT', 'Cloud Placement — Checkpoint', 'Where you actually are on this, measured rather than felt.',
      ['Show the judgement a cloud hiring panel looks for'], 40, { unitType: 'CHECKPOINT', after: ['MOCK_LOOP'] }),
  ] },
};
