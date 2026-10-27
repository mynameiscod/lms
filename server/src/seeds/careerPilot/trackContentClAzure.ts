/**
 * Career-track content: Azure for AWS Engineers (CL_AZURE), Cloud & DevOps Engineer, batch CL3.
 *
 * Azure taught as the second cloud, by mapping it onto the AWS the student already runs: tenants, management
 * groups, subscriptions and resource groups; Entra ID, managed identities, RBAC at every scope and Azure Policy;
 * VNets, NSG priorities, private endpoints and the load balancers; VMs, scale sets, App Service slots and
 * Functions; storage redundancy, Azure SQL, PostgreSQL Flexible Server and Cosmos DB; ACR and AKS with workload
 * identity; Azure Monitor with KQL, Terraform's azurerm provider; and cost, governance and the AZ-900/AZ-104 map.
 * It builds on CL1-CL2 (the AWS topics, Containers and Kubernetes, Terraform, CI/CD) and on the Azure lines
 * those lessons already contain; Bicep's basics are in CL_TERRAFORM's "CloudFormation and Bicep for Terraform
 * Users" and are referred to, not repeated.
 *
 * One fictional company runs through the lessons: PeopleNest, a Bengaluru HR and payroll SaaS that runs on AWS
 * Mumbai and must stand up an Azure copy in Central India (Pune) because its large GCC customers buy on Azure.
 * The mini project moves TicketKatta (the Pune ticket-booking start-up from the AWS networking project) to Azure.
 *
 * Verification. There was no Azure account, no az CLI and no Azure SDK. Every az CLI command, Bicep file and KQL
 * query was written from Microsoft's documentation and NOT run. Every Terraform snippet was parsed with
 * python-hcl2 (and cross-references checked), but not planned or applied. Every YAML snippet was parsed with
 * PyYAML, and the Kubernetes manifests were checked field by field against the kubernetes Python client's
 * models. The Python simulations (RBAC scope inheritance, NSG priority evaluation, the VNet address plan with
 * ipaddress, deployment-slot swaps, Blob lifecycle tiers, the JMESPath queries az uses for --query, a tag audit
 * and a budget forecast, and the aggregation a KQL query performs) were run and their real output is quoted.
 * IDs (00000000-..., 11111111-...), account 123456789012 and *.example domains are fake. No prices are quoted.
 *
 * Skills: CLOUD_FUNDAMENTALS by default; AZURE_NETWORKING measures CLOUD_NETWORKING and AZURE_COMPUTE and
 * AKS_ACR measure CLOUD_COMPUTE (trackSkillAttribution.ts). Checkpoint questions elsewhere that are plainly about
 * networking or compute use ck('CLOUD_NETWORKING' | 'CLOUD_COMPUTE', ...).
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_CL_AZURE_BUNDLES: PilotBundle[] = [
  /* ── AZURE_MAP ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AZURE_AZURE_MAP',
    notes: `PeopleNest, a Bengaluru HR and payroll SaaS, runs on AWS Mumbai. Three of its largest customers are global
capability centres in Hyderabad and Pune whose procurement teams buy on Azure and want PeopleNest's data
inside their own Azure commitments. So the platform team must stand up a copy of the product on Azure in
Central India. Nobody on the team has used Azure. This topic is what they learn, and it starts with the map:
where things live in Azure, and which AWS idea each one replaces.

You already know the AWS side from "How AWS Is Built" and "Multi-Account Setups, Tags and Guardrails". The
point of this lesson is the places where Azure is **shaped differently**, because that is where AWS
engineers make mistakes.

## The hierarchy: tenant, management groups, subscriptions, resource groups

    Microsoft Entra tenant (the directory: users, groups, apps)
      Root management group
        mg-peoplenest
          mg-platform          -> sub-connectivity, sub-management
          mg-workloads         -> sub-hr-prod, sub-hr-nonprod
          mg-sandbox           -> sub-sandbox-<name>
            resource groups    -> rg-hr-prod, rg-hr-prod-data, ...
              resources        -> VMs, VNets, storage accounts, ...

- **Tenant.** One instance of Microsoft Entra ID (formerly Azure Active Directory). Every user, group,
  application and managed identity lives here. Every subscription trusts exactly one tenant.
- **Management group.** A folder of subscriptions (and of other management groups) used to apply access and
  policy once for many subscriptions. The tree can be up to six levels deep, not counting the root and the
  subscriptions. AWS equivalent: an **organisational unit** in AWS Organizations.
- **Subscription.** The billing unit, the boundary for many service quotas, and a scope for access and policy.
  The closest AWS idea is an **account**.
- **Resource group (RG).** A container for resources that share a lifecycle. Every resource is in exactly one
  RG; RGs cannot be nested. AWS has **no real equivalent** — the nearest is a CloudFormation stack.

## The first big difference: identity is not inside the subscription

In AWS each account has its own IAM: users, roles and policies live **inside** the account, and reaching
another account means assuming a role there. In Azure, identities live in the **tenant**, above every
subscription. The same user, group or managed identity can be granted access in ten subscriptions without
"crossing" anything. A subscription is therefore a billing and access-control boundary, but not an identity
boundary. The next lesson builds on this.

## The second: resource groups are lifecycle, not location

- An RG has a region, but that only says where its **metadata** is stored. Resources inside it can be in
  any region: an RG in Central India may hold a storage account in South India.
- Deleting an RG deletes **everything in it**. That is the most useful teardown command in Azure and the most
  dangerous one: az group delete --name rg-hr-dev --yes removes the VMs, disks, VNets and databases together.
- Group by "what is created and deleted together": rg-hr-prod-network, rg-hr-prod-app, rg-hr-prod-data.

Every resource has an ID that spells out the hierarchy, and every Azure tool uses it:

    /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-hr-prod
        /providers/Microsoft.Compute/virtualMachines/vm-batch-01

## One API: Azure Resource Manager

Every create, read, update and delete — from the portal, az CLI, Terraform, Bicep or an SDK — goes to **Azure
Resource Manager (ARM)** at management.azure.com. ARM authenticates you with Entra ID, checks RBAC and Azure
Policy, and passes the request to a **resource provider** (Microsoft.Compute, Microsoft.Network,
Microsoft.Storage, Microsoft.ContainerService ...). A provider must be **registered** in a subscription before
it can be used there. The portal often does this for you; a fresh subscription driven by Terraform fails with
a MissingSubscriptionRegistration error until someone runs:

    az provider register --namespace Microsoft.ContainerService

## Regions and zones in India

Azure has three public regions in India: **Central India (Pune)**, **South India (Chennai)** and **West India
(Mumbai)**, named centralindia, southindia and westindia in code. Not every service or VM size is offered in
every region — check "products available by region" before you design. Central India offers **availability
zones**; check the current list before relying on zones in the other two.

Two differences from AWS:

- **Zones are numbered 1, 2, 3**, and the numbers are **logical per subscription** — your zone 1 may be
  another subscription's zone 2, just as AWS AZ names are shuffled per account.
- **Region pairs.** Many regions are paired with another in the same geography; Central India is paired with
  South India. The pair is used for geo-redundant storage replication and Microsoft staggers planned platform
  updates across a pair. Newer regions may have no pair, so check before you depend on it.

## The az CLI in ten commands

    az login                                   # browser sign-in; --use-device-code on a remote box
    az account list -o table                   # subscriptions you can see
    az account set --subscription sub-hr-nonprod
    az config set defaults.location=centralindia defaults.group=rg-hr-dev
    az group create --name rg-hr-dev --location centralindia --tags owner=hr-platform env=dev
    az resource list --resource-group rg-hr-dev -o table
    az vm list -d --query "[?powerState=='VM running'].{name:name, rg:resourceGroup}" -o table
    az group delete --name rg-hr-dev --yes --no-wait

Output is -o json (default), table, tsv or yaml, and --query takes **JMESPath** — the same language as the AWS
CLI's --query. An untagged-VM query, run with Python's jmespath library on az-style sample data:

    [?tags.owner==null].{name:name, location:location}
    [{"name": "vm-dev-01", "location": "centralindia"}, {"name": "vm-test-07", "location": "southindia"}]

## The service map

    AWS                          Azure
    Account / OU / SCP           Subscription / management group / Azure Policy (deny effect)
    IAM, Identity Center         Entra ID + Azure RBAC; managed identities for workloads
    VPC, security group          Virtual network (VNet), network security group (NSG)
    ALB / NLB / CloudFront       Application Gateway / Azure Load Balancer / Front Door
    Route 53                     Azure DNS (+ Traffic Manager for DNS routing)
    EC2, Auto Scaling group      Virtual Machines, Virtual Machine Scale Sets
    Elastic Beanstalk/App Runner App Service
    Lambda                       Azure Functions
    ECS on Fargate, EKS, ECR     Container Apps, AKS, Azure Container Registry
    S3, EBS, EFS                 Blob Storage, Managed Disks, Azure Files
    RDS PostgreSQL / SQL Server  Azure Database for PostgreSQL / Azure SQL Database
    DynamoDB, ElastiCache        Cosmos DB, Azure Cache for Redis
    SQS / SNS / EventBridge      Service Bus or Storage queues / Service Bus topics / Event Grid
    KMS, Secrets Manager         Key Vault (keys and secrets)
    CloudWatch, CloudTrail       Azure Monitor (Log Analytics), activity log
    GuardDuty, Security Hub      Microsoft Defender for Cloud
    CloudFormation               ARM templates / Bicep
    Cost Explorer, Budgets       Cost Management (cost analysis, budgets)

The map is a starting point: an SCP limits **actions by identities**, while a policy judges **resource
properties**. Each lesson calls out where a pair differs.`,
    workedExample: `**Scenario.** PeopleNest's CTO asks for "the Azure layout" before anyone creates a resource. Facts: one
product (HR and payroll), prod and non-prod, a shared network team, customers who require data in India, and
engineers who want throwaway sandboxes.

**1. Tenant.** PeopleNest already has Microsoft 365, so it already has an Entra tenant. Use it — a second
tenant means a second set of identities to secure. Engineers sign in with their existing work accounts.

**2. Management groups.** mg-peoplenest under the root, with mg-platform (shared network and monitoring),
mg-workloads (the product) and mg-sandbox. Policies such as "only Central India and South India" are assigned
once at mg-peoplenest; "sandbox resources must carry an expiry tag" only at mg-sandbox.

**3. Subscriptions.** sub-hr-prod and sub-hr-nonprod under mg-workloads (the AWS layout had prod and non-prod
accounts, so this maps one to one), sub-connectivity under mg-platform for the hub network, and one
subscription per sandbox user. Separate subscriptions give separate bills and quotas, and a mistake in
non-prod cannot exhaust prod's quota.

**4. Resource groups.** By lifecycle: rg-hr-prod-network (VNet, NSGs — changes rarely), rg-hr-prod-app (App
Service or AKS), rg-hr-prod-data (PostgreSQL, storage, Key Vault — never deleted casually). Non-prod mirrors
it, and test environments get their own RG so az group delete cleans them completely.

**5. Regions.** Central India (Pune) as primary: in India, with availability zones. South India (Chennai) for
backups and disaster recovery, because it is Central India's pair and geo-redundant storage replicates there.
Data stays in India either way, which answers the customers' residency question in one line.

**6. Names.** One convention, written down: rg-<app>-<env>-<purpose>, vnet-, nsg-, kv-, st (storage names
allow only lowercase letters and digits, 3-24 characters, globally unique), log-, appi-. A name you cannot
parse at 2 a.m. is a bad name.

The answer fits on one page, and every later lesson hangs off it.`,
    mcqs: [
      mcq('An engineer runs az group delete --name rg-hr-dev --yes. The group is in Central India, and one storage account inside it was created in South India. What is deleted?', [
        ['Every resource in the group, including the South India storage account', true],
        ['Only the Central India resources; the South India account becomes orphaned', false],
        ['Nothing yet: a resource group with resources in two regions cannot be deleted', false],
        ['Only the group\'s metadata; the resources move to the subscription\'s default group', false],
      ], 'A resource group is a lifecycle container: deleting it deletes every resource in it, whatever region each resource is in. The group\'s own region only says where its metadata is stored; there is no default group that absorbs resources, and mixed regions do not block deletion.'),
      mcq('PeopleNest\'s AWS habit is "a separate account means separate identities". Why does that habit not carry over to Azure subscriptions?', [
        ['Identities live in the Entra tenant, above every subscription that trusts it', true],
        ['Each subscription has its own Entra directory, so users are duplicated in each', false],
        ['Subscriptions share one IAM policy document that is edited in the portal', false],
        ['Azure has no user identities at all, only service principals per subscription', false],
      ], 'Users, groups and managed identities belong to the tenant, and access is granted to them in any subscription by role assignments. A subscription does not own a directory, there is no shared IAM policy document, and Azure certainly has user identities.'),
      mcq('terraform apply against a brand-new subscription fails on an AKS cluster with MissingSubscriptionRegistration for Microsoft.ContainerService. What is the fix?', [
        ['Register the Microsoft.ContainerService resource provider in that subscription', true],
        ['Move the cluster into a management group that already has the AKS licence', false],
        ['Create the cluster in the portal once, since Terraform cannot create AKS clusters', false],
        ['Assign the Contributor role to the cluster before Terraform is allowed to create it', false],
      ], 'A resource provider must be registered in each subscription before its resource types can be created there; az provider register --namespace Microsoft.ContainerService does it. There is no AKS licence on management groups, Terraform creates AKS clusters fine, and a role cannot be assigned to a resource that does not exist yet.'),
    ],
    checkpoint: [
      mcq('An AWS engineer asks which Azure construct is closest to an AWS account. What is the best answer?', [
        ['A subscription: the unit of billing, quotas and access scope', true],
        ['A resource group: the container that every resource must sit in', false],
        ['A tenant: the directory of users, groups and applications', false],
        ['A region: the place where resources are physically created', false],
      ], 'Like an AWS account, a subscription is where costs are billed, quotas apply and access is scoped. Resource groups are lifecycle containers inside it, a tenant is the identity directory above it, and a region is a location, not an ownership boundary.'),
      ck('CLOUD_NETWORKING', 'Two subscriptions both place a VM in "zone 1" of Central India to keep traffic inside one zone. Why might the VMs still be in different physical zones?', [
        ['Zone numbers are logical and are mapped separately for each subscription', true],
        ['Central India has only one physical zone, so "zone 1" is just a label', false],
        ['Zone 1 is reserved for Microsoft\'s own services in every Indian region', false],
        ['VMs ignore the zone setting unless they are part of a scale set', false],
      ], 'Azure maps logical zones 1, 2 and 3 to physical zones per subscription, just as AWS maps AZ names per account, so the same number need not mean the same building. Central India has several zones, zone 1 is not reserved, and a single VM does honour its zone.'),
      mcq('Why is Central India\'s pairing with South India relevant when PeopleNest chooses geo-redundant storage?', [
        ['Geo-redundant storage copies data to the paired region, so it stays in India', true],
        ['The pair lets one subscription span both regions, which is not possible otherwise', false],
        ['Paired regions share one set of availability zones between the two cities', false],
        ['Resources in paired regions are billed once, so the copy has no storage cost', false],
      ], 'GRS and GZRS replicate asynchronously to the region\'s pair, here South India, which keeps the secondary copy in India. Any subscription can use any region, zones are per region, and the secondary copy is billed.'),
    ],
  },

  /* ── ENTRA_RBAC ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AZURE_ENTRA_RBAC',
    notes: `In AWS you learned one system: IAM policies attached to users and roles, evaluated with explicit deny on
top ("IAM: Users, Groups, Roles and Policies"). Azure splits the same job into three parts, and confusing them
is the commonest Azure access bug:

- **Microsoft Entra ID** — who you are: users, groups, applications, managed identities.
- **Azure RBAC** — what you may do to resources: role assignments at a scope.
- **Azure Policy** — what resources may look like, whoever creates them.

## Identities in Entra ID

- **Users and groups.** Grant access to **groups**, never to individuals: when Meera moves teams, one
  membership changes and every subscription follows.
- **App registration and service principal.** An app registration is the global definition of an
  application; its **service principal** is that app's identity inside a tenant, and it is the service
  principal that receives role assignments. A service principal with a client secret is the Azure version of an
  IAM user with access keys: it works, it leaks, and it is the last resort.
- **Managed identity.** An identity Azure creates and rotates for a resource, with no secret you ever see —
  the Azure version of an EC2 instance profile or an ECS task role. Two kinds:
  - **System-assigned:** enabled on one resource, deleted with it.
  - **User-assigned:** a standalone resource (Microsoft.ManagedIdentity/userAssignedIdentities) you attach to
    one or many resources; its role assignments survive when the VM or app is rebuilt.
- **Federated credentials.** An app registration or a user-assigned identity can trust tokens from an
  external OIDC issuer — GitHub Actions, an AKS cluster — exactly like an IAM OIDC provider plus a role trust
  policy. No secret is stored anywhere.

Code does not care which one it gets: azure-identity's DefaultAzureCredential tries environment variables,
workload identity, managed identity and your az login in turn (clients constructed with the SDK installed; no
call was made to Azure):

    from azure.identity import DefaultAzureCredential
    from azure.keyvault.secrets import SecretClient

    client = SecretClient(vault_url="https://kv-hr-prod.vault.azure.net",
                          credential=DefaultAzureCredential())
    db_password = client.get_secret("db-password").value

## Two role systems — do not mix them up

**Entra roles** (Global Administrator, User Administrator ...) govern the **directory**: users, passwords,
app registrations. **Azure roles** (Owner, Contributor, Reader ...) govern **resources**. A Global Administrator
has no subscription access by default (they can elevate to User Access Administrator at the root, which is
logged), and a subscription Owner cannot reset anyone's password.

## Azure RBAC: who, what, where

A **role assignment** is three things: a **security principal** (user, group, service principal, managed
identity), a **role definition** (a list of allowed operations) and a **scope** (management group,
subscription, resource group or a single resource). It applies at its scope **and everything below it**.

The built-in roles you will use daily:

- **Owner** — everything, including granting access. **Contributor** — everything except granting access.
  **Reader** — read only. **User Access Administrator** and **Role Based Access Control Administrator** —
  manage role assignments.
- **Data-plane roles** such as Storage Blob Data Reader, Key Vault Secrets User and AcrPull. Azure separates
  **Actions** (management: create a storage account) from **DataActions** (data: read a blob). Contributor
  has Actions "*" but no DataActions, so a Contributor using Entra sign-in gets a 403 reading blobs.

The catch in that last point: Contributor *can* run Microsoft.Storage/storageAccounts/listKeys/action, fetch
the account key and read everything with it. Treat Contributor on a storage account as data access unless
shared-key access is switched off.

## How assignments combine

Azure RBAC is **additive**: your access is the union of every assignment covering the resource, and there is
no explicit deny you can write. **NotActions** only subtracts from *that role's* Actions — another role can
still grant the operation. (Deny assignments exist, but only features such as deployment stacks create them.)
Least privilege therefore means **narrow roles at narrow scopes**, not broad grants with denies on top.

A small Python model of that logic (inheritance downwards, Actions minus NotActions, union of assignments) with
PeopleNest's assignments — Reader for grp-platform at mg-peoplenest, Contributor and Reader for grp-hr-devs on
rg-hr-dev and rg-hr-prod, and a VM role for Meera on one VM. Real output:

    virtualMachines/read                     on vm-batch-01 ALLOW  Reader @ mg-peoplenest; Reader @ rg-hr-prod
    virtualMachines/restart/action           on vm-batch-01 deny
    virtualMachines/restart/action           on vm-dev-01   ALLOW  Contributor @ rg-hr-dev
    roleAssignments/write                    on rg-hr-dev   deny
    virtualMachines/restart/action           on vm-batch-01 ALLOW  Virtual Machine Contributor (abridged) @ vm-batch-01
    virtualMachines/delete                   on vm-web-01   deny
    subscriptions/resourceGroups/write       on rg-hr-new   deny

    Contributor allows roleAssignments/write? False
    Contributor allows storage listKeys?      True

Three lessons in seven lines: a management-group assignment reaches every VM below it; Contributor on a
resource group cannot grant access; and nobody here can **create** a new resource group, because that needs a
role at the subscription scope — an RG-scoped Contributor works only inside groups that already exist.

## Doing it with az

    az role assignment create --assignee-object-id <group-object-id> --assignee-principal-type Group \\
      --role "Contributor" --scope /subscriptions/<sub-id>/resourceGroups/rg-hr-dev
    az role assignment list --assignee <object-id> --all --include-inherited -o table
    az role definition create --role-definition @vm-operator.json

A custom role is JSON with Actions, NotActions, DataActions, NotDataActions and AssignableScopes:

    {
      "Name": "VM Operator (PeopleNest)",
      "IsCustom": true,
      "Description": "Start, restart and deallocate VMs; read what is needed to find them.",
      "Actions": [
        "Microsoft.Compute/virtualMachines/read",
        "Microsoft.Compute/virtualMachines/start/action",
        "Microsoft.Compute/virtualMachines/restart/action",
        "Microsoft.Compute/virtualMachines/deallocate/action",
        "Microsoft.Resources/subscriptions/resourceGroups/read"
      ],
      "NotActions": [], "DataActions": [], "NotDataActions": [],
      "AssignableScopes": ["/subscriptions/00000000-0000-0000-0000-000000000000"]
    }

Role changes can take several minutes to apply; sign in again before deciding an assignment "did not work".
For admins, **Privileged Identity Management** (an Entra ID P2 feature) makes people *eligible* for Owner, to
activate for an hour with a reason.

## Azure Policy, briefly

RBAC answers "may this person create a storage account?". **Azure Policy** answers "may *any* storage account
allow public blob access?" — it evaluates resource **properties** on every create and update, and reports
existing resources as compliant or not. The rule below denies storage accounts that do not switch public blob
access off (parsed as JSON; not deployed):

    {
      "mode": "All",
      "policyRule": {
        "if": { "allOf": [
          { "field": "type", "equals": "Microsoft.Storage/storageAccounts" },
          { "field": "Microsoft.Storage/storageAccounts/allowBlobPublicAccess", "notEquals": false }
        ] },
        "then": { "effect": "deny" }
      }
    }

That is closer to an AWS Config rule with enforcement than to an SCP. The governance lesson uses policy at
scale.`,
    workedExample: `**Scenario.** PeopleNest's security lead asks for the Azure access design before the first engineer is
given anything. Inputs: 12 developers, 3 platform engineers, an on-call rota, a GitHub Actions pipeline and the
HR API itself, which reads secrets from Key Vault and payslip PDFs from Blob Storage.

**1. People get groups, groups get roles.** grp-hr-devs: Contributor on the non-prod subscription, Reader on
rg-hr-prod-app. grp-platform: Reader at mg-peoplenest (they see everything), and *eligible* Owner on the
subscriptions through PIM, activated with a reason. No user has a direct assignment, which the access review
can check with az role assignment list --all and a filter on principalType User.

**2. On-call gets a custom role.** The on-call rota must restart and deallocate VMs at night but not create or
delete them. The custom VM Operator role (read, start, restart, deallocate) is assigned to grp-oncall at
rg-hr-prod-app only. The Python model confirms restart is allowed there and delete is not.

**3. The pipeline uses a federated credential.** An app registration with a federated credential whose subject
is repo:peoplenest/hr-platform:environment:production. It gets Contributor on rg-hr-prod-app only — it deploys
code, it does not need the network or data groups. There is no client secret to leak or rotate.

**4. The app uses a user-assigned managed identity.** id-hr-api gets Key Vault Secrets User on kv-hr-prod and
Storage Blob Data Reader on the payslips container — data-plane roles at the narrowest useful scope. User-
assigned, because the API runs on several instances and is rebuilt often; the identity and its assignments
outlive any one of them.

**5. Close the side doors.** Shared-key access is disabled on the payslips storage account, so nobody with
Contributor can list keys and bypass the data roles. Two break-glass accounts with Global Administrator,
long passwords in a safe and sign-in alerts — for the day Entra sign-in itself is the problem.

**6. Write the review into the calendar.** A quarterly export of role assignments per scope, compared with the
intended table. Access drifts the moment a deadline arrives; the review is how it comes back.`,
    mcqs: [
      mcq('A developer holds Contributor on a storage account and runs az storage blob list --auth-mode login. The call fails with AuthorizationPermissionMismatch. Why?', [
        ['Contributor grants management Actions but no DataActions for reading blobs', true],
        ['Contributor is a read-only role, so it cannot call any storage account APIs', false],
        ['The storage account must first be moved into the developer\'s own resource group', false],
        ['Blob listing works only with the account key, never with an Entra sign-in', false],
      ], 'With --auth-mode login the request is authorised by data-plane roles such as Storage Blob Data Reader, which Contributor does not include. Contributor is not read-only, resource group placement does not matter, and Entra sign-in is the recommended way to read blobs.'),
      mcq('The HR API runs on a scale set that is rebuilt every release, and also in a Functions app; both need the same Key Vault access. Which identity fits best?', [
        ['One user-assigned managed identity attached to both, holding the role once', true],
        ['A system-assigned identity on each resource, re-granted after every rebuild', false],
        ['A service principal with a client secret stored in both apps\' settings', false],
        ['The developer\'s own account, signed in once on each instance with az login', false],
      ], 'A user-assigned identity is a standalone resource, so it can be shared and its role assignments survive rebuilds. System-assigned identities die with their resource, a client secret is a credential to leak and rotate, and a person\'s login must never run a service.'),
      mcq('Why can a user with Contributor on a subscription not give a colleague Reader on a resource group in it?', [
        ['Contributor\'s NotActions remove Microsoft.Authorization write and delete', true],
        ['Role assignments can only be created at management group scope in Azure', false],
        ['Reader is an Entra directory role, which subscription roles cannot grant', false],
        ['The colleague must first be invited into the subscription\'s own directory', false],
      ], 'Contributor is "everything except access management": its NotActions exclude Microsoft.Authorization/*/Write and Delete, so creating role assignments needs Owner, User Access Administrator or RBAC Administrator. Assignments can be made at any scope, Reader is an Azure role, and the subscription has no directory of its own.'),
    ],
    checkpoint: [
      mcq('grp-hr-devs has Reader at mg-peoplenest and Contributor on rg-hr-dev. What can a member do to a VM in rg-hr-dev?', [
        ['Manage it fully, because effective access is the union of both', true],
        ['Only read it, because the higher scope\'s Reader role takes priority', false],
        ['Nothing, because two assignments on the same group cancel out', false],
        ['Only read it until an Owner approves the narrower assignment', false],
      ], 'Azure RBAC is additive: every assignment covering the resource contributes, so Contributor at the resource group applies on top of the inherited Reader. Higher scopes do not override lower ones, assignments never cancel, and no approval step exists in plain RBAC.'),
      mcq('Role A allows Microsoft.Compute/* with NotActions Microsoft.Compute/virtualMachines/delete. Role B allows virtualMachines/delete. A user holds both at the same scope. Can they delete a VM?', [
        ['Yes, because NotActions only subtracts from role A, not from role B', true],
        ['No, because NotActions acts as an explicit deny across all roles', false],
        ['No, because two roles at one scope are evaluated with the stricter', false],
        ['Only if role B was assigned before role A at that particular scope', false],
      ], 'NotActions trims the role it is written in; it is not a deny, so role B still grants delete and the union allows it. Azure has no stricter-wins rule for roles, and assignment order is irrelevant. Only deny assignments block, and those cannot be written by hand.'),
      mcq('PeopleNest\'s IT head is a Global Administrator in Entra ID yet sees no resources in sub-hr-prod. What explains it?', [
        ['Entra roles govern the directory; resource access needs an Azure role', true],
        ['Global Administrators can see resources only through the az CLI tool', false],
        ['The subscription belongs to another tenant than the IT head\'s account', false],
        ['Global Administrator is a trial role that lapses after thirty days', false],
      ], 'Directory roles and Azure RBAC are separate systems; a Global Administrator needs an Azure role assignment (or must elevate to User Access Administrator, which is logged). Tool choice does not change permissions, nothing suggests another tenant, and the role does not expire.'),
    ],
  },

  /* ── AZURE_NETWORKING ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AZURE_AZURE_NETWORKING',
    notes: `You can design an AWS VPC with public, app and data subnets, security groups and an ALB ("Designing a VPC",
"Security Groups and Network ACLs", "Load Balancers and CloudFront"). Azure's virtual network looks the same
from a distance. Up close, four things differ: subnets are regional, there is no internet gateway to make a
subnet "public", NSG rules have **priorities and explicit denies**, and PaaS services join the network through
**private endpoints**.

## VNets and subnets

- A **virtual network (VNet)** lives in one region and has one or more address spaces (PeopleNest:
  10.60.0.0/16, chosen not to clash with its AWS Mumbai VPC, 10.50.0.0/16, which it will connect by VPN).
- A **subnet is regional**, not zonal. In AWS "two AZs" means two subnets; in Azure one subnet holds VMs in
  zones 1, 2 and 3. Zone spread is a property of the resources, not of the subnet.
- Azure reserves **five addresses** per subnet — like AWS, but for different jobs: .0 network, .1 default
  gateway, .2 and .3 Azure DNS, and the last address. The smallest IPv4 subnet is a /29 (three usable).
- Some services need a **dedicated subnet**: AzureBastionSubnet (exact name, /26 or larger), GatewaySubnet,
  Application Gateway's own subnet, and one delegated to App Service for VNet integration.

PeopleNest's plan, computed with ipaddress (usable = total minus Azure's five):

    subnet             cidr            usable  first..last usable
    snet-appgw         10.60.0.0/24       251  10.60.0.4..10.60.0.254
    snet-web           10.60.1.0/24       251  10.60.1.4..10.60.1.254
    snet-api           10.60.2.0/24       251  10.60.2.4..10.60.2.254
    snet-data          10.60.3.0/24       251  10.60.3.4..10.60.3.254
    AzureBastionSubnet 10.60.4.0/26        59  10.60.4.4..10.60.4.62
    GatewaySubnet      10.60.4.64/27       27  10.60.4.68..10.60.4.94
    snet-aks           10.60.16.0/20     4091  10.60.16.4..10.60.31.254
    allocated 5216 of 65536 (8.0%)
    largest free blocks: ['10.60.128.0/17', '10.60.64.0/18', '10.60.32.0/19', '10.60.8.0/21']

snet-data holds no VMs — it holds the **private endpoints** of the database, Key Vault and storage.

## Routing and the missing internet gateway

Azure adds **system routes** for you: the VNet's own range, peered VNets, and 0.0.0.0/0 to the internet. There
is no IGW to attach and no "public subnet": a VM is reachable from the internet only if it has a **public IP**
(or sits behind a public load balancer) **and** an NSG allows the traffic. You override routes with a **route
table** (user-defined routes), for example 0.0.0.0/0 to a firewall appliance in a hub VNet.

Outbound: Microsoft is retiring implicit "default outbound access", so plan an explicit path — a **NAT
gateway** on the subnet (as on AWS), a load balancer's outbound rules, or a firewall.

## Network security groups: priorities and first match

An **NSG** is a list of rules, each with a **priority from 100 to 4096**, direction, source, destination,
port, protocol and **Allow or Deny**. Rules are checked **lowest number first, and the first match wins**. NSGs
are stateful, like security groups — but unlike security groups they can deny, so they also do the job of a
NACL. Every NSG ends with default rules you cannot delete:

    Inbound   65000 AllowVnetInBound              VirtualNetwork -> VirtualNetwork
              65001 AllowAzureLoadBalancerInBound AzureLoadBalancer -> any
              65500 DenyAllInBound                any -> any
    Outbound  65000 AllowVnetOutBound, 65001 AllowInternetOutBound, 65500 DenyAllOutBound

**VirtualNetwork** is a **service tag** meaning the VNet's address space plus peered VNets and connected
on-premises ranges — far wider than "my subnet". **Application security groups (ASGs)** label NICs (asg-web,
asg-api, asg-db) so rules can say "asg-web to asg-api on 8000", like referencing one security group from
another in AWS.

An NSG can sit on a **subnet** and on a **NIC**. Inbound traffic is checked by the subnet's NSG and then the
NIC's; outbound in the reverse order; **both must allow**. Use subnet NSGs and leave NIC NSGs off unless you
have a reason.

A Python model of the documented evaluation, with PeopleNest's rules (allow appgw to asg-web on 443 at 100,
asg-web to asg-api on 8000 at 200, asg-api to asg-db on 5432 at 300, deny VirtualNetwork to VirtualNetwork at
4000). Real output:

    appgw -> web :443                Allow by   100 allow-https-from-appgw
    web -> api :8000                 Allow by   200 allow-web-to-api
    web -> db :5432 (skip the api)   Deny  by  4000 deny-vnet-rest
    peered VNet -> db :5432          Deny  by  4000 deny-vnet-rest
    internet -> web :443             Deny  by 65500 DenyAllInBound
    LB health probe -> web :443      Allow by 65001 AllowAzureLoadBalancerInBound

    Without the 4000 deny (defaults only):
    web -> db :5432 (skip the api)   Allow by 65000 AllowVnetInBound
    peered VNet -> db :5432          Allow by 65000 AllowVnetInBound

The second block is the lesson: **by default, everything in the VNet and every peered VNet can reach
everything**. Tiering needs your own deny above 65000. Two more traps the model reproduces: a broad
"deny from VirtualNetwork" at 150 blocks the web-to-api allow at 200 (lower number wins, whatever you meant);
and a subnet NSG that allows 443 is useless if the NIC has an NSG without that rule.

## Peering and private endpoints

- **VNet peering** connects two VNets over Microsoft's backbone, in one region or across regions. It is
  **not transitive** (A-B and B-C does not give A-C), needs a link created on each side, and refuses
  overlapping ranges — the same rules as VPC peering. Hub-and-spoke designs put shared services and a firewall
  in a hub and route spokes through it.
- A **private endpoint** puts a NIC with a private IP from your subnet in front of one PaaS resource (a
  storage account's blob service, a PostgreSQL server, a Key Vault) — the equivalent of an interface endpoint.
  It only works if DNS answers with the private IP: create the **private DNS zone** (for blobs,
  privatelink.blob.core.windows.net) and **link it to the VNet**. Then switch the resource's public network
  access off.
- A **service endpoint** is older: the service's firewall can allow your subnet, but the service keeps its
  public IP. Prefer private endpoints for data.

## Load balancing

    Azure Load Balancer   layer 4, regional, TCP/UDP          ~ NLB
    Application Gateway   layer 7, regional, WAF option        ~ ALB + AWS WAF
    Front Door            layer 7, global edge, CDN and WAF    ~ CloudFront (+ WAF)
    Traffic Manager       DNS-based routing                    ~ Route 53 routing policies

Use the **Standard** SKUs; the Basic load balancer and Basic public IP are retired. A Standard load balancer
and Standard public IP are closed to inbound traffic until an NSG allows it.

## The commands (written from the docs; not run)

    az network vnet create -g rg-hr-prod-network -n vnet-hr-prod --address-prefixes 10.60.0.0/16
    az network nsg create -g rg-hr-prod-network -n nsg-api
    az network asg create -g rg-hr-prod-network -n asg-api
    az network nsg rule create -g rg-hr-prod-network --nsg-name nsg-api -n allow-web-to-api \\
      --priority 200 --direction Inbound --access Allow --protocol Tcp \\
      --source-asgs asg-web --destination-asgs asg-api --destination-port-ranges 8000
    az network nic list-effective-nsg -g rg-hr-prod-app -n nic-vm-api-01     # what really applies

Network Watcher's **IP flow verify** (az network watcher test-ip-flow) names the rule that allows or denies a
given packet — the tool to reach for before editing anything.`,
    workedExample: `**Scenario.** The HR API on Azure must be reachable only through Application Gateway, call PostgreSQL
privately, and read payslips from Blob Storage without the storage account being on the internet. A reviewer
asks you to show that the design blocks web-to-database traffic.

**1. Subnets by role.** snet-appgw (Application Gateway v2, dedicated), snet-api (VMs in a scale set across
zones 1-3), snet-data (private endpoints only). One subnet per tier is enough, because subnets are regional.

**2. Labels, not addresses.** NICs of the API VMs join asg-api. Rules then survive scaling, because new VMs
join the ASG and need no rule change.

**3. The NSG on snet-api.**

    100  Allow  10.60.0.0/24 (appgw subnet) -> asg-api  TCP 8000
    110  Allow  AzureLoadBalancer           -> asg-api  TCP 8000   (kept explicit for clarity)
    4000 Deny   VirtualNetwork              -> any      any

The Application Gateway's health probes come from its own subnet, so rule 100 covers them. Rule 4000 cancels
the generous AllowVnetInBound default for this subnet — including traffic from the peered hub. If the gateway
subnet has an NSG of its own, it must allow the gateway's management ports as Application Gateway documents;
leave that subnet's NSG to the gateway's documented rules.

**4. The data path.** A private endpoint for the PostgreSQL server and one for the storage account's blob
service in snet-data, with privatelink.postgres.database.azure.com and privatelink.blob.core.windows.net zones
linked to the VNet. Public network access off on both. The PostgreSQL server's own firewall is no longer
relevant: there is no public path.

**5. Prove it.** Run the NSG model with the real rule set (the output in the notes: web to db denied at 4000),
then on the real network use IP flow verify from a web VM to the database endpoint IP on 5432 and expect
"Deny, securityRule deny-vnet-rest". Put both in the design document. A reviewer trusts a test, not a diagram.

**6. Teardown note.** Private endpoints and NAT gateways are billed while they exist; the non-prod copy of this
network is created and deleted with its resource group.`,
    mcqs: [
      mcq('nsg-api has a rule at priority 150 that denies all traffic from VirtualNetwork, and a rule at 200 that allows asg-web to asg-api on 8000. What happens to web-to-api calls?', [
        ['They are denied, because the rule with the lower number matches first', true],
        ['They are allowed, because an Allow rule always overrides a broader Deny', false],
        ['They are allowed, because the more specific ASG rule is evaluated first', false],
        ['They are denied only for the first minute while the NSG is propagating', false],
      ], 'NSG rules are evaluated in priority order, lowest number first, and the first match decides. The traffic matches the deny at 150 before reaching 200. Azure does not prefer Allow or specificity; to fix it, give the allow a lower number than the deny.'),
      mcq('The subnet\'s NSG allows TCP 443 from Internet, but HTTPS to the VM still times out. The VM\'s NIC also has an NSG with no custom rules. What is the cause?', [
        ['The NIC\'s NSG falls through to DenyAllInBound, and both NSGs must allow', true],
        ['NSGs on NICs are ignored whenever the subnet already has an NSG attached', false],
        ['Inbound HTTPS from the internet needs an internet gateway on the VNet', false],
        ['The subnet NSG must allow port 443 outbound too, for the return traffic', false],
      ], 'Inbound traffic is checked by the subnet NSG and then the NIC NSG, and both must allow it; the empty NIC NSG ends in DenyAllInBound. NIC NSGs are not ignored, Azure has no internet gateway, and NSGs are stateful, so return traffic needs no rule.'),
      mcq('The API has a private endpoint for sthrpayslips, and public access is disabled, yet the storage name still resolves to a public IP from the API VMs and requests fail with 403. What is missing?', [
        ['A privatelink.blob.core.windows.net private DNS zone linked to the VNet', true],
        ['A service endpoint on the subnet, which a private endpoint depends upon', false],
        ['An NSG rule allowing outbound 443 from the API subnet to the internet', false],
        ['A second private endpoint, because each one serves only a single zone', false],
      ], 'Clients reach the private endpoint only if DNS returns its private IP, which needs the privatelink zone linked to the VNet. Without it the public endpoint is used and refused. Service endpoints are a separate feature, outbound 443 is allowed by default, and one endpoint serves the whole VNet.'),
    ],
    checkpoint: [
      mcq('PeopleNest\'s data subnet has an NSG with no custom rules. A VM in a peered VNet connects to the database on 5432. What decides the result?', [
        ['AllowVnetInBound at 65000 allows it, as peered ranges count as VirtualNetwork', true],
        ['DenyAllInBound at 65500 blocks it, because peered VNets count as Internet', false],
        ['The connection fails, since VNet peering carries only ICMP and HTTP traffic', false],
        ['AllowAzureLoadBalancerInBound at 65001 allows it, as peering uses a load balancer', false],
      ], 'The VirtualNetwork service tag includes the VNet, peered VNets and connected on-premises ranges, so the default 65000 rule allows the traffic. That is why tiering needs a custom deny above 65000. Peering carries all protocols and does not involve a load balancer.'),
      mcq('How many addresses can be assigned to resources in an Azure subnet of 10.60.4.64/27?', [
        ['27', true],
        ['30', false],
        ['32', false],
      ], 'A /27 has 32 addresses and Azure reserves five in every subnet: the network address, the default gateway, two for Azure DNS and the last address. 30 is the traditional answer that removes only network and broadcast, and 32 removes nothing.'),
      mcq('PeopleNest wants one HTTPS entry point for users across India and abroad, with a web application firewall and edge caching. Which Azure service fits?', [
        ['Azure Front Door', true],
        ['Azure Load Balancer', false],
        ['Application Gateway in one region', false],
        ['A NAT gateway on the web subnet', false],
      ], 'Front Door is the global layer-7 edge with CDN caching and WAF, the CloudFront-like service. Azure Load Balancer is layer 4 and regional, Application Gateway is layer 7 but regional, and a NAT gateway handles outbound traffic only.'),
    ],
  },

  /* ── AZURE_COMPUTE ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AZURE_AZURE_COMPUTE',
    notes: `PeopleNest runs three kinds of compute on AWS: EC2 instances in an Auto Scaling group for the HR API, a
Lambda function for nightly payroll reconciliation, and Elastic Beanstalk for a small admin portal. On Azure the
same three become Virtual Machine Scale Sets (or App Service), Azure Functions and App Service. You know the
ideas from "EC2: Instance Types, AMIs and Key Access", "Launch Templates and Auto Scaling Groups" and "AWS
Lambda: Functions, Triggers and Limits"; this lesson is about what is named and billed differently.

## Virtual machines

- **Sizes** read like this: Standard_D2s_v5 is the D family (general purpose), 2 vCPUs, "s" for premium-SSD
  capable, version 5. B is burstable (CPU credits, like AWS T instances), E memory-optimised, F compute-optimised.
  Not every size is in every region or zone — check before you standardise on one.
- **Images** are Marketplace URNs or aliases such as Ubuntu2204; your own live in an Azure Compute Gallery.
  --custom-data passes a cloud-init file, as EC2 user data does.
- **Disks** are managed disks (Standard HDD, Standard SSD, Premium SSD, Premium SSD v2, Ultra), encrypted at
  rest by default. Many sizes also have a **temporary disk** — local, fast and wiped on deallocation or host
  maintenance, the equivalent of instance store.
- **Access**: no public IP, no open port 22. Use Azure Bastion, or az vm run-command invoke for one-off
  commands — the Session Manager and Run Command habits from AWS carry over.

Created from the docs (not run):

    az vm create -g rg-hr-dev -n vm-api-01 --image Ubuntu2204 --size Standard_B2s \\
      --vnet-name vnet-hr-dev --subnet snet-api --public-ip-address "" --nsg "" \\
      --zone 1 --assign-identity --admin-username azureuser --generate-ssh-keys \\
      --custom-data cloud-init.yaml
    az vm run-command invoke -g rg-hr-dev -n vm-api-01 --command-id RunShellScript \\
      --scripts "systemctl status hr-api --no-pager"

--public-ip-address "" and --nsg "" mean "no public IP, no NIC-level NSG" — the subnet's NSG does the work.

## Stopped is not deallocated

The billing trap AWS engineers fall into. Shutting a VM down from inside the OS leaves it **Stopped**: Azure
still holds the hardware and **still bills compute**. Only **Stopped (deallocated)** — az vm deallocate or
Stop in the portal — releases it, after which you pay for disks (and any static public IP) only. Deallocation
also clears the temporary disk and releases a dynamic public IP. A JMESPath query finds the expensive kind
(the result shown is jmespath's, run over az-style sample data with one VM in each state):

    az vm list -d --query "[?powerState=='VM stopped'].name"
    ["vm-dev-01"]

## Scale sets and availability

- Spread instances over **zones** 1-3 (availability sets are the older, single-datacentre pattern).
- **Virtual Machine Scale Sets** are the Auto Scaling group; use **Flexible** orchestration for new sets.
- **Autoscale** is an Azure Monitor setting with a minimum, maximum and default count and **rules**:

    az monitor autoscale create -g rg-hr-prod-app --resource vmss-api \\
      --resource-type Microsoft.Compute/virtualMachineScaleSets --name as-api \\
      --min-count 2 --max-count 10 --count 2
    az monitor autoscale rule create -g rg-hr-prod-app --autoscale-name as-api \\
      --condition "Percentage CPU > 70 avg 5m" --scale out 2
    az monitor autoscale rule create -g rg-hr-prod-app --autoscale-name as-api \\
      --condition "Percentage CPU < 30 avg 10m" --scale in 1

Unlike AWS target tracking, scale-out and scale-in are **separate rules**: forget the scale-in rule and the set
grows on salary day and stays large all month. Keep the two thresholds well apart so they do not flap.

## App Service: plans, apps and slots

App Service is the managed web platform — closest to Elastic Beanstalk or App Runner.

- An **App Service plan** is the set of VMs you pay for: OS (Linux or Windows), pricing tier (Free, Basic,
  Standard, Premium v3, Isolated) and instance count. **Apps** are deployed onto a plan, and every app on the
  plan runs on every instance of it. Scale **up** by changing tier, **out** by adding instances. Two busy apps
  on one plan share its CPU — a noisy neighbour you created yourself.
- **App settings** become environment variables. A setting can reference Key Vault instead of holding the
  secret: @Microsoft.KeyVault(SecretUri=https://kv-hr-prod.vault.azure.net/secrets/db-password/), resolved
  with the app's managed identity.
- **Networking**: VNet integration for outbound calls; a private endpoint to make the app private.
- **Deployment slots** (Standard tier and above) are live copies of the app with their own host names, e.g.
  app-hr-api-staging. Deploy to staging, warm it, then **swap**: Azure applies production's settings to the
  staging instances, waits for them to warm up, and switches routing. The previous version is now in the
  staging slot, so **rollback is another swap**.

What moves in a swap is the trap. Code and ordinary settings move; settings marked **deployment slot setting**
("sticky") stay with their slot. A Python model of the documented behaviour, real output:

    Nothing marked sticky - after swap:
      production  code=v42    APP_ENV=staging DB_HOST=psql-staging FEATURE_PAYSLIP_V2=on
      staging     code=v41    APP_ENV=prod DB_HOST=psql-prod FEATURE_PAYSLIP_V2=off

    DB_HOST and APP_ENV sticky - after swap:
      production  code=v42    APP_ENV=prod DB_HOST=psql-prod FEATURE_PAYSLIP_V2=on
      staging     code=v41    APP_ENV=staging DB_HOST=psql-staging FEATURE_PAYSLIP_V2=off

Without sticky settings, production would be talking to the staging database. Environment-specific values are
sticky; feature flags that ship with the release are not.

    az appservice plan create -g rg-hr-prod-app -n asp-hr-prod --is-linux --sku P1v3
    az webapp create -g rg-hr-prod-app -p asp-hr-prod -n app-hr-api --runtime "PYTHON:3.12"
    az webapp deployment slot create -g rg-hr-prod-app -n app-hr-api --slot staging
    az webapp config appsettings set -g rg-hr-prod-app -n app-hr-api --slot staging \\
      --slot-settings DB_HOST=psql-hr-staging.postgres.database.azure.com APP_ENV=staging
    az webapp deployment slot swap -g rg-hr-prod-app -n app-hr-api --slot staging --target-slot production

## Azure Functions

Functions is Lambda: triggers (HTTP, timer, queue, blob, Event Grid) plus **bindings** that read or write other
services declaratively. Hosting plans: **Flex Consumption** (serverless, the plan for most new apps),
Consumption, **Premium** (pre-warmed instances, no cold start, VNet) and Dedicated (on an App Service plan).
Every function app needs a storage account. The Python v2 programming model — this exact file was imported with
the azure-functions package and the HTTP function called locally:

    import logging
    import azure.functions as func

    app = func.FunctionApp()

    @app.route(route="payslip/{employee_id}", auth_level=func.AuthLevel.FUNCTION)
    def payslip(req: func.HttpRequest) -> func.HttpResponse:
        emp = req.route_params.get("employee_id")
        return func.HttpResponse(f"payslip for {emp}", status_code=200)

    @app.timer_trigger(schedule="0 30 18 * * *", arg_name="timer", run_on_startup=False)
    def nightly_reconcile(timer: func.TimerRequest) -> None:
        logging.info("reconciling yesterday's payroll run")

    payslip [('httpTrigger', 'payslip/{employee_id}'), ('http', None)]
    nightly_reconcile [('timerTrigger', '0 30 18 * * *')]
    200 payslip for E1042

The timer is NCRONTAB with a **seconds** field first, in UTC by default: 18:30 UTC is midnight IST. Durable
Functions plays Step Functions' role; **Container Apps** is the nearest thing to ECS on Fargate.`,
    workedExample: `**Scenario.** PeopleNest's admin portal (FastAPI, low traffic) and HR API (busy on salary days, the last
working day and the first of each month) move to Azure. Choose the compute and the release process.

**1. Portal: App Service.** One Linux plan in Premium v3 (Standard would also allow slots; Premium gives
more headroom per instance), two instances across zones. App settings hold non-secret configuration; the
database password is a Key Vault reference resolved by the app's managed identity, so it never appears in a
pipeline log.

**2. HR API: App Service too, on its own plan.** It could be a scale set, but nobody on the team wants to patch
VMs, and App Service autoscale handles salary-day load. A separate plan, so a portal bug cannot starve the API.
Autoscale rules: out by 2 when CPU averages over 70% for 5 minutes, in by 1 under 30% for 10 minutes, minimum
2, maximum 8 — and a scheduled profile that raises the minimum to 4 on the last working day.

**3. Payroll reconciliation: Functions.** A timer function at "0 30 18 * * *" (midnight IST) on Flex
Consumption. It runs for a few minutes a day, so paying for idle instances makes no sense.

**4. Releases with slots.** The pipeline deploys build v42 to the staging slot, which has sticky settings
DB_HOST and APP_ENV pointing at the staging database. Smoke tests run against
app-hr-api-staging.azurewebsites.net. Then the pipeline swaps. The model's output shows production on v42 with
the production DB_HOST, and v41 waiting in staging. A bad release is undone with one more swap, which the model
also showed restoring v41 with the right settings.

**5. What the team writes down.** Which settings are sticky (environment-specific: hosts, environment names,
connection strings), which are not (feature flags that belong to a release), the autoscale rules with their
reasons, and the deallocation rule for any VM: dev VMs are deallocated at 20:00 IST by an automation job, never
just shut down from inside.`,
    mcqs: [
      mcq('A developer shuts down a dev VM with sudo shutdown -h now every evening, yet compute charges continue. The portal shows "Stopped". What should they do instead?', [
        ['Deallocate it with az vm deallocate, so Azure releases the compute', true],
        ['Delete the OS disk each evening and recreate it the next morning', false],
        ['Move the VM to the B-series, which stops billing once shut down', false],
        ['Remove its public IP, because the IP is what keeps the VM billed', false],
      ], 'A VM stopped from inside the OS still holds its hardware and is billed for compute; only "Stopped (deallocated)" ends compute charges. Deleting disks destroys data, no size stops billing on OS shutdown, and a public IP is billed separately but is not what keeps compute billed.'),
      mcq('After a slot swap, production starts writing to the staging database. DB_HOST was set as an ordinary app setting in both slots. What was the correct setup?', [
        ['Mark DB_HOST as a deployment slot setting so it stays with its slot', true],
        ['Store DB_HOST in the code, since app settings never move with a swap', false],
        ['Swap with --preserve-vnet only, which keeps every setting where it is', false],
        ['Use one database for both slots, because a swap cannot keep settings', false],
      ], 'Ordinary settings travel with the code during a swap; sticky (deployment slot) settings stay with the slot. Hard-coding hosts breaks per-environment config, --preserve-vnet concerns networking, and sharing one database between staging and production defeats the point of staging.'),
      mcq('The HR API\'s scale set grew from 2 to 8 instances on salary day and was still at 8 two weeks later. Autoscale has one rule: CPU above 70% scales out by 2. What is missing?', [
        ['A separate scale-in rule, because Azure autoscale does not reverse a rule', true],
        ['A larger maximum count, because the set was capped and then stuck there', false],
        ['A health probe, because unhealthy instances block every scale-in action', false],
        ['A second scale-out rule on memory, so that the set can calculate an average', false],
      ], 'Azure autoscale rules are one-directional; without a scale-in rule the count only grows. The maximum caps growth but does not freeze the count, health probes do not block scale-in, and another scale-out rule would only add instances.'),
    ],
    checkpoint: [
      mcq('Two apps share one App Service plan running three P1v3 instances. Where do the apps run?', [
        ['Both apps run on all three instances and share their capacity', true],
        ['Each app gets its own instance, and the third is kept on standby', false],
        ['The first app uses all three, and the second runs only on failover', false],
        ['Each app gets one and a half instances worth of dedicated CPU', false],
      ], 'A plan is the set of VMs; every app on it runs on every instance and competes for the same CPU and memory. Plans do not divide instances between apps or keep standbys, which is why busy apps get their own plan.'),
      mcq('A function has the timer schedule "0 30 18 * * *" and the app uses the default time zone. When does it run in India?', [
        ['Every day at midnight IST', true],
        ['Every day at 18:30 IST', false],
        ['At 30 seconds past 18:00 IST', false],
        ['Every 18 days at 00:30 IST', false],
      ], 'NCRONTAB has six fields starting with seconds: second 0, minute 30, hour 18, every day. Timers default to UTC, and 18:30 UTC is 00:00 IST. Reading it as IST, as a five-field cron or as an interval gives the other answers.'),
      mcq('An Azure VM writes temporary build files to its temporary disk. After the VM is deallocated and started again, the files are gone. Why?', [
        ['The temporary disk is local to the host and is not kept across deallocation', true],
        ['Managed disks are wiped whenever a VM is restarted from the Azure portal', false],
        ['The VM\'s OS disk was encrypted, and encrypted disks reset on every start', false],
        ['Deallocation snapshots data disks only when the VM has a public IP address', false],
      ], 'The temporary disk lives on the physical host, like EC2 instance store, and is lost when the VM is deallocated or moved. Managed OS and data disks persist across restarts, encryption at rest does not reset data, and snapshots have nothing to do with public IPs.'),
    ],
  },

  /* ── AZURE_STORAGE_DATA ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AZURE_AZURE_STORAGE_DATA',
    notes: `PeopleNest stores two kinds of data: payslip PDFs (written once, read a few times in the first month,
kept for years) and the HR database (PostgreSQL on RDS). On Azure they become Blob Storage and Azure Database
for PostgreSQL. You know the AWS versions from "S3: Buckets, Objects and Access", "Lifecycle, Replication and
Backups" and "Managed Relational Databases: RDS and Aurora". The differences that bite are where settings live,
and how many copies you get by default.

## Storage accounts

A **storage account** is one namespace for four services: Blob (objects), Files (SMB/NFS shares), Queue and
Table. Inside it, **containers** hold **blobs** — a container is roughly an S3 bucket. But the important
settings belong to the **account**, not the container: redundancy, network rules, encryption, whether shared
keys and public access are allowed. Two containers that need different redundancy need two accounts.

- Kind: **StorageV2** (general-purpose v2) for almost everything; Premium kinds for low-latency block blobs or
  file shares.
- Name: 3-24 lowercase letters and digits, **globally unique**, because it becomes the host name
  https://sthrpayslips.blob.core.windows.net.

## Redundancy: the default is not S3's default

S3 Standard keeps data across several AZs without you asking. Azure makes you choose, and the cheapest option
is narrower than AWS engineers assume:

    LRS     3 copies in one datacentre                       survives a disk or rack, not a zone
    ZRS     3 copies across 3 availability zones             survives a zone
    GRS     LRS here + async LRS copy in the paired region   survives a region
    GZRS    ZRS here + async LRS copy in the paired region   survives a zone and a region
    RA-GRS / RA-GZRS   as above, and the secondary is readable at <name>-secondary.blob.core.windows.net

For Central India the paired region is South India, so the geo copy stays in India. Geo-replication is
asynchronous, so a regional failover can lose the most recent writes; failover is something you (or Microsoft
in a disaster) trigger. ZRS needs a region with availability zones.

## Access tiers and lifecycle

Blob tiers: **Hot**, **Cool**, **Cold** and **Archive** — cheaper to store, dearer to read as you go down.
Cool, Cold and Archive have minimum storage durations (30, 90 and 180 days); removing or re-tiering a blob
earlier is charged as if it had stayed the minimum. **Archive is offline**: a blob must be **rehydrated** to Hot
or Cool before it can be read, which takes hours. A lifecycle policy moves blobs automatically — this one was
parsed and simulated in Python:

    { "rules": [ { "enabled": true, "name": "payslips-age-out", "type": "Lifecycle",
        "definition": {
          "filters": { "blobTypes": ["blockBlob"], "prefixMatch": ["payslips/"] },
          "actions": { "baseBlob": {
            "tierToCool":    { "daysAfterModificationGreaterThan": 30 },
            "tierToCold":    { "daysAfterModificationGreaterThan": 90 },
            "tierToArchive": { "daysAfterModificationGreaterThan": 180 },
            "delete":        { "daysAfterModificationGreaterThan": 2920 } } } } } ] }

    payslip modified   10 days ago -> Hot
    payslip modified   31 days ago -> Cool
    payslip modified  181 days ago -> Archive
    payslip modified 2921 days ago -> deleted
    Cool    entered day  31, removed day  45:  14 days in tier, early-deletion days charged: 16
    Archive entered day 181, removed day 300: 119 days in tier, early-deletion days charged: 61

The eight-year delete stands in for whatever retention your compliance team sets. Apply it with az storage
account management-policy create --policy @lifecycle.json.

## Who can read a blob

- **Entra ID + RBAC** (preferred): Storage Blob Data Reader or Contributor at the container or account
  scope, for people and managed identities (the RBAC lesson's DataActions point).
- **Shared key**: the two account keys are root passwords for all data. Disable them (allowSharedKeyAccess
  false) when nothing needs them.
- **SAS tokens** are the presigned URLs. A **user delegation SAS** is signed with Entra credentials, is valid
  for at most seven days and can be revoked by revoking the delegation key. A service or account SAS is signed
  with an account key, and the only blunt way to revoke a leaked one is to rotate that key.
- **Anonymous access**: keep allowBlobPublicAccess false, and enforce it with the policy from the RBAC lesson.
- **Network**: firewall default action Deny, plus a private endpoint (networking lesson).
- **Protection**: soft delete for blobs and containers, versioning, and immutability policies (write once,
  read many — the Object Lock equivalent) for records that must not change.

Written from the docs (not run):

    az storage account create -g rg-hr-prod-data -n sthrpayslips -l centralindia \\
      --sku Standard_GZRS --kind StorageV2 --min-tls-version TLS1_2 \\
      --allow-blob-public-access false --allow-shared-key-access false
    az storage container create --account-name sthrpayslips -n payslips --auth-mode login
    az storage blob generate-sas --account-name sthrpayslips -c payslips -n 2026/10/E1042.pdf \\
      --permissions r --expiry 2026-10-28T06:30Z --https-only --auth-mode login --as-user

--auth-mode login --as-user is what makes it a user delegation SAS.

## Managed databases

**Azure Database for PostgreSQL – Flexible Server** is the RDS PostgreSQL equivalent and the natural home
for PeopleNest's database:

- **Zone-redundant high availability** keeps a synchronous standby in another zone with automatic failover —
  the Multi-AZ idea. Read replicas are separate.
- **Backups** are automatic with point-in-time restore over a retention you set (7 to 35 days);
  geo-redundant backup to the paired region must be chosen when the server is created.
- **Networking**: private access through a delegated subnet, or a private endpoint; public access off.
- A dev server can be **stopped** to save compute (it starts again by itself after seven days).

**Azure SQL Database** is managed SQL Server: databases on a logical server, the vCore model (General Purpose,
Business Critical, Hyperscale) or the older DTU model, a serverless tier that can auto-pause, point-in-time
restore and long-term retention, and **failover groups** for a geo-replicated database with one listener name.
SQL Managed Instance is for lifting whole SQL Server estates.

**Cosmos DB** is the DynamoDB equivalent: you choose a **partition key** from your access patterns (the
DynamoDB lesson's rule applies unchanged), throughput is in **request units per second** (provisioned,
autoscale or serverless), and it adds **five consistency levels** (strong, bounded staleness, session — the
default — consistent prefix, eventual) and multi-region writes. The change feed plays the part of DynamoDB
Streams.

## Backups you can restore

Azure Backup (Recovery Services and Backup vaults) protects VMs, disks, file shares and some databases on a
schedule, as AWS Backup does. The rule from "Database Backups, Restores and Disaster Recovery" stands: a backup
that has never been restored is a hope, so schedule a restore test and write down how long it took.`,
    workedExample: `**Scenario.** PeopleNest's payslips and HR database move to Azure. Requirements from customers: data in
India, survive a zone failure without data loss, survive a regional disaster with at most an hour of loss,
payslips downloadable by employees for 15 minutes from a link, eight-year retention.

**1. Payslip storage account: Standard_GZRS in Central India.** ZRS for zone failures (synchronous across three
zones, no loss), plus an asynchronous copy in South India for a regional disaster. Both regions are in India.
RA-GZRS is not needed: nobody reads from the secondary in normal running.

**2. Lock it down.** Public blob access off, shared-key access off, TLS 1.2 minimum, public network access off
with a private endpoint in snet-data. Soft delete and versioning on, so a buggy job that overwrites payslips can
be undone. An immutability policy on the container if the auditors ask for WORM.

**3. Downloads.** The HR API's managed identity has Storage Blob Data Contributor on the payslips container
(not the account). For a download it requests a user delegation key and signs a read-only SAS for one blob,
valid 15 minutes. Nothing signed with an account key exists, because account keys are disabled.

**4. Lifecycle.** The policy in the notes: Cool after 30 days, Cold after 90, Archive after 180, delete after
the retention period. The simulation's early-deletion lines are the reason the Archive step is at 180 days and
not earlier: payslips are sometimes re-requested in the first months, and pulling one out of Archive takes hours.

**5. Database.** PostgreSQL Flexible Server, zone-redundant HA, private access in its delegated subnet,
geo-redundant backup switched on at creation (it cannot be added later the same way), retention 35 days. That
meets "no loss in a zone failure"; for the regional case, restoring the geo backup in South India is the plan,
and its real recovery point and time are measured in a drill before anyone promises "an hour".

**6. Evidence.** A quarterly restore drill: restore last night's database to a new server in South India and
download five archived payslips after rehydration. Record both durations in the runbook.`,
    mcqs: [
      mcq('PeopleNest\'s first storage account used Standard_LRS "because S3 already spreads data across zones". What does LRS actually give them?', [
        ['Three copies in one datacentre, which does not survive losing that zone', true],
        ['Three copies across three zones, the same as S3 Standard in a region', false],
        ['One copy in this region and one copy in the paired South India region', false],
        ['A single copy, with redundancy added only after the first month of use', false],
      ], 'LRS keeps three synchronous copies inside one datacentre. Zone spread is ZRS, the paired-region copy is GRS or GZRS, and Azure never keeps a single copy. S3 Standard\'s multi-AZ default does not carry over; in Azure you choose.'),
      mcq('An employee asks for a two-year-old payslip that a lifecycle rule moved to the Archive tier. What has to happen before it can be downloaded?', [
        ['Rehydrate the blob to Hot or Cool, which takes hours, and then read it', true],
        ['Generate a SAS for it, since Archive blobs are readable through SAS only', false],
        ['Nothing: Archive blobs are read directly, only with higher read latency', false],
        ['Restore it from the geo-redundant copy, since Archive data is offline', false],
      ], 'Archive is an offline tier: a blob must be rehydrated (by copying or changing its tier) before it can be read, and that takes hours. A SAS grants access but does not bring data online, and the secondary region holds the same archived blob.'),
      mcq('A download link signed with the storage account key has leaked into a public chat. What is the reliable way to make it stop working?', [
        ['Rotate the account key that signed it, which invalidates its SAS tokens', true],
        ['Delete the chat message, since a SAS stops working once it is unshared', false],
        ['Change the blob\'s tier to Cool, which invalidates SAS tokens issued earlier', false],
        ['Turn on soft delete, which blocks downloads of blobs already shared by SAS', false],
      ], 'An ad hoc SAS signed with an account key is valid until it expires unless that key is rotated (or, for a SAS tied to a stored access policy, the policy is changed). That is why user delegation SAS with short expiry and disabled shared keys is preferred. Deleting the message, changing tiers or soft delete do nothing to the token.'),
    ],
    checkpoint: [
      mcq('A blob moved to the Cool tier is deleted 10 days later. How is that billed?', [
        ['An early-deletion charge for the remaining 20 days of Cool\'s minimum', true],
        ['No extra charge, because deletes are always free in every Blob tier', false],
        ['A charge for a full 180 days, the longest minimum of any Blob tier', false],
        ['A rehydration charge, because Cool blobs are copied to Hot before deletion', false],
      ], 'Cool has a 30-day minimum, so deleting after 10 days is billed as if the remaining 20 had been stored. The 180-day minimum belongs to Archive, and only Archive needs rehydration.'),
      mcq('An AWS engineer sizes Cosmos DB the way they sized a provisioned DynamoDB table. In what unit is Cosmos DB throughput set?', [
        ['Request units per second', true],
        ['Read and write capacity units', false],
        ['vCores per partition key value', false],
        ['IOPS per gigabyte of storage', false],
      ], 'Cosmos DB normalises reads, writes and queries into request units, provisioned per second (manually or with autoscale) or consumed in serverless mode. Read and write capacity units are DynamoDB\'s terms, vCores belong to Azure SQL and PostgreSQL, and IOPS per GB describes disks.'),
      mcq('What does zone-redundant high availability on Azure Database for PostgreSQL Flexible Server provide, in AWS terms?', [
        ['A synchronous standby in another zone with automatic failover, like Multi-AZ', true],
        ['A readable replica in South India that clients query for every report', false],
        ['Nightly snapshots copied to three zones, restored by hand after a failure', false],
        ['A second primary in another zone, with both accepting writes at all times', false],
      ], 'Zone-redundant HA keeps a synchronous standby in a different zone and fails over automatically, which is the RDS Multi-AZ idea. Read replicas are a separate feature, backups are not HA, and Flexible Server does not run two writable primaries.'),
    ],
  },

  /* ── AKS_ACR ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AZURE_AKS_ACR',
    notes: `PeopleNest's payslip worker and HR API already run on EKS from a Helm chart ("Packaging with Helm", "Amazon
EKS"). The Azure copy should run the **same chart** on AKS. Kubernetes itself does not change — Deployments,
Services, probes, HPAs and PDBs are identical. What changes is everything that touches the cloud: the registry,
node pools, networking, load balancers, storage classes and, above all, how a Pod gets cloud credentials.

## Azure Container Registry

- SKUs **Basic**, **Standard** and **Premium**; Premium adds geo-replication and private endpoints. The name
  is globally unique (letters and digits) and becomes the login server, crpeoplenest.azurecr.io.
- Leave the **admin user disabled** — it is a shared username and password. People push after az acr login
  (an Entra token); pipelines push with the **AcrPush** role through a federated credential; clusters pull with
  **AcrPull**.
- az acr build -r crpeoplenest -t hr-api:3f9c2ab . builds in Azure (ACR Tasks) — handy when the build agent
  has no Docker daemon. Tag by commit SHA, as you did in ECR.

## The cluster

    az aks create -g rg-hr-prod-app -n aks-hr-prod --tier standard \\
      --node-count 2 --node-vm-size Standard_D2s_v5 --zones 1 2 3 \\
      --network-plugin azure --network-plugin-mode overlay --vnet-subnet-id <snet-aks-id> \\
      --enable-oidc-issuer --enable-workload-identity \\
      --attach-acr crpeoplenest --generate-ssh-keys
    az aks nodepool add -g rg-hr-prod-app --cluster-name aks-hr-prod -n apps --mode User \\
      --node-vm-size Standard_D4s_v5 --zones 1 2 3 \\
      --enable-cluster-autoscaler --min-count 2 --max-count 6
    az aks get-credentials -g rg-hr-prod-app -n aks-hr-prod

(Written from the docs; not run.) What each piece maps to:

- **Tier.** The control plane is managed in every tier; Free has no uptime SLA and suits dev, **Standard**
  adds the SLA for production, Premium adds long-term support. EKS charges per cluster-hour; check both pricing
  pages rather than assuming either is free.
- **Node pools** are the managed node groups. Each pool is a scale set. A **system** pool runs CoreDNS and
  other system Pods; **user** pools run your workloads, can use Spot VMs, and scale with the cluster
  autoscaler per pool.
- **The node resource group.** AKS creates a second resource group, named like
  MC_rg-hr-prod-app_aks-hr-prod_centralindia, holding the scale sets, load balancer, public IPs and disks.
  AKS owns it: change things through Kubernetes or the AKS API, never by hand there, or AKS will put them back.
- **Networking.** **Azure CNI Overlay** gives nodes VNet IPs and Pods addresses from a private Pod CIDR
  (10.244.0.0/16 by default), so a /20 node subnet goes a long way. Flat **Azure CNI** gives every Pod a VNet IP
  — the VPC CNI model, with the same subnet-sizing worry. kubenet is being retired. The **service CIDR**
  (10.0.0.0/16 by default) must not overlap the VNet or anything it is connected to.
- **People's access.** Integrate with Entra ID and use **Azure RBAC for Kubernetes authorisation** (built-in
  roles such as Azure Kubernetes Service RBAC Reader and RBAC Admin) — the job EKS access entries do. Disable
  local accounts so nobody holds a static admin kubeconfig.
- **Cost.** az aks stop deallocates a whole dev cluster overnight; az aks start brings it back.

## Workload identity: IRSA, translated

IRSA lets a service account assume an IAM role through the cluster's OIDC issuer. AKS workload identity is the
same design:

    IRSA (EKS)                                AKS workload identity
    cluster OIDC provider in IAM              --enable-oidc-issuer
    IAM role                                  user-assigned managed identity
    trust policy: sub = system:serviceaccount:hr:payslip-worker
                                              federated credential: subject = the same string
    SA annotation eks.amazonaws.com/role-arn  SA annotation azure.workload.identity/client-id
    (nothing on the Pod)                      Pod label azure.workload.identity/use: "true"
    boto3 finds the token by itself           DefaultAzureCredential finds it by itself

The steps (written from the docs; not run):

    OIDC=$(az aks show -g rg-hr-prod-app -n aks-hr-prod --query oidcIssuerProfile.issuerUrl -o tsv)
    az identity create -g rg-hr-prod-app -n id-payslip-worker
    az identity federated-credential create -g rg-hr-prod-app --identity-name id-payslip-worker \\
      --name fc-payslip-worker --issuer "$OIDC" \\
      --subject system:serviceaccount:hr:payslip-worker --audience api://AzureADTokenExchange
    az role assignment create --assignee-object-id <identity-principal-id> \\
      --assignee-principal-type ServicePrincipal --role "Storage Blob Data Contributor" \\
      --scope <payslips-container-id>

And the Kubernetes side — checked against the kubernetes client's models:

    apiVersion: v1
    kind: ServiceAccount
    metadata:
      name: payslip-worker
      namespace: hr
      annotations:
        azure.workload.identity/client-id: 11111111-2222-3333-4444-555555555555
    ---
    # in the Deployment's Pod template:
      template:
        metadata:
          labels:
            app: payslip-worker
            azure.workload.identity/use: "true"
        spec:
          serviceAccountName: payslip-worker

The label is the difference AWS engineers miss. The workload identity webhook only mutates Pods that carry it,
injecting AZURE_CLIENT_ID, AZURE_TENANT_ID and AZURE_FEDERATED_TOKEN_FILE plus the projected token. Without it,
DefaultAzureCredential finds no credential. (The older "AAD Pod Identity" add-on is deprecated; do not follow
tutorials that use it.)

## Moving the Helm release

The chart stays; the values file changes. Diffing PeopleNest's two values files with a short PyYAML script
(real output, condensed):

    image.repository           EKS: 123456789012.dkr.ecr.ap-south-1.amazonaws.com/hr-api  AKS: crpeoplenest.azurecr.io/hr-api
    serviceAccount.annotations EKS: eks.amazonaws.com/role-arn: ...  AKS: azure.workload.identity/client-id: 1111...
    podLabels                  EKS: {}                            AKS: azure.workload.identity/use: "true"
    ingress.className          EKS: alb                           AKS: webapprouting.kubernetes.azure.com
    ingress.annotations        EKS: alb.ingress.kubernetes.io/... AKS: {}
    persistence.storageClass   EKS: gp3                           AKS: managed-csi
    env.FILES_URL              EKS: s3://peoplenest-payslips      AKS: https://sthrpayslips.blob.core.windows.net/payslips
    unchanged: ['image.tag']

- **Ingress.** The AWS Load Balancer Controller is replaced by the **application routing add-on** (managed
  NGINX, az aks approuting enable, class webapprouting.kubernetes.azure.com) or by Application Gateway for
  Containers. The ALB annotations simply go.
- **Storage.** managed-csi (Azure Disk, ReadWriteOnce, zonal like EBS) or azurefile-csi (Azure Files,
  ReadWriteMany, like EFS).
- **Internal load balancer.** A Service of type LoadBalancer with the annotation
  service.beta.kubernetes.io/azure-load-balancer-internal: "true".
- **The app.** S3 calls become Blob calls. If the code was written against a small storage interface, that
  is one adapter, not a rewrite.

## Upgrades

az aks get-upgrades lists versions; az aks upgrade moves the control plane and then node pools, surging extra
nodes as it drains old ones — so the PDB lesson from EKS applies unchanged. Set an auto-upgrade channel and a
node OS upgrade channel, and a maintenance window outside salary week.`,
    workedExample: `**Scenario.** Move the payslip worker — which reads from a queue and writes PDFs to object storage — from
EKS to AKS without changing its Deployment template beyond what Azure requires.

**1. Registry.** Create crpeoplenest (Standard), and push the same commit-tagged image (hr-api:3f9c2ab) from the
pipeline with AcrPush via its federated credential. The image itself does not change.

**2. Cluster.** aks-hr-prod with a system pool and an apps user pool across zones 1-3, Azure CNI Overlay in
snet-aks (10.60.16.0/20), OIDC issuer and workload identity enabled, --attach-acr crpeoplenest so the kubelet
identity has AcrPull.

**3. Identity.** id-payslip-worker (user-assigned), a federated credential with subject
system:serviceaccount:hr:payslip-worker, and Storage Blob Data Contributor on the payslips container only. This
is the IRSA role with its trust policy, in Azure's words.

**4. Values.** values-aks.yaml from the diff: repository, client-id annotation, the Pod label, the ingress
class, managed-csi, and the blob URL. The Deployment template already renders podLabels into the Pod template,
so no chart change is needed — check with helm template that the label appears under spec.template.metadata.

**5. Code.** The worker used boto3. It now needs azure-storage-blob and azure-identity:
BlobServiceClient(account_url, credential=DefaultAzureCredential()). Wrapped behind the existing
save_payslip(path, data) function, so nothing else in the worker changes.

**6. Verify in order.** kubectl describe pod shows the AZURE_* environment variables (the webhook ran);
logs show a successful upload; az storage blob list --auth-mode login shows the file. If authentication fails
with AADSTS70021, the federated credential's subject or issuer does not match the token — compare namespace
and service account names character by character.

**7. Leave the old path open.** Keep the EKS deployment running read-only until a week of Azure payslips has
been reconciled against the AWS ones.`,
    mcqs: [
      mcq('The payslip worker on AKS fails with "DefaultAzureCredential failed to retrieve a token". Its service account has the client-id annotation, and kubectl describe pod shows no AZURE_FEDERATED_TOKEN_FILE. What is missing?', [
        ['The Pod label azure.workload.identity/use: "true" on the Pod template', true],
        ['The eks.amazonaws.com/role-arn annotation copied from the EKS values', false],
        ['An AcrPull role assignment on the cluster\'s kubelet managed identity', false],
        ['A client secret in a Kubernetes Secret mounted into the worker\'s Pod', false],
      ], 'The workload identity webhook only mutates Pods labelled azure.workload.identity/use: "true"; without it no token or AZURE_* variables are injected. The EKS annotation means nothing on AKS, AcrPull concerns pulling images, and a client secret is exactly what workload identity avoids.'),
      mcq('Token exchange fails with AADSTS70021: No matching federated identity record found. The worker runs in namespace hr as service account payslip-worker. What should be checked first?', [
        ['The federated credential\'s issuer and subject against the cluster and SA', true],
        ['The storage role assignment on the payslips container for the identity', false],
        ['The node pool\'s VM size, since small nodes cannot request Entra tokens', false],
        ['The ingress class, because tokens are exchanged through the app routing', false],
      ], 'AADSTS70021 means Entra found no federated credential whose issuer and subject match the presented token, often a wrong namespace, SA name or OIDC URL. Storage roles matter only after a token is issued, VM size is irrelevant, and token exchange does not pass through the ingress.'),
      mcq('New Pods on AKS show ImagePullBackOff with a 401 Unauthorized from crpeoplenest.azurecr.io. The image tag exists. What is the likely fix?', [
        ['Give the kubelet identity AcrPull, for example with az aks update --attach-acr', true],
        ['Enable the registry\'s admin user and paste its password into every values file', false],
        ['Move the registry to the Premium SKU, since Basic registries refuse AKS pulls', false],
        ['Label the Pods for workload identity so that they pull with their own identity', false],
      ], 'Nodes pull images with the kubelet managed identity, which needs AcrPull on the registry; --attach-acr creates that assignment. The admin user is a shared secret to avoid, Basic works with AKS, and workload identity is for the app\'s own calls, not for image pulls.'),
    ],
    checkpoint: [
      mcq('An engineer edits a load-balancing rule by hand in the MC_rg-hr-prod-app_aks-hr-prod_centralindia resource group, and the change soon disappears. Why?', [
        ['AKS manages that node resource group and reconciles it from Kubernetes', true],
        ['Azure Policy reverts any edit made in a resource group named with MC_', false],
        ['The resource group is read-only, so the change was never really saved', false],
        ['Load balancer rules in Azure expire after an hour unless they are renewed', false],
      ], 'The node resource group belongs to AKS, which reconciles its load balancer and other resources from Service objects and cluster settings; change them through Kubernetes or the AKS API. No built-in policy targets MC_ names, the group is not read-only, and rules do not expire.'),
      mcq('Three replicas of a reporting Deployment on AKS must all mount the same volume read-write. Which storage class fits?', [
        ['azurefile-csi, which uses Azure Files and supports ReadWriteMany', true],
        ['managed-csi, which uses Azure Disk and attaches it to every node', false],
        ['managed-csi-premium, because Premium disks allow shared writing', false],
        ['Any class, since AKS replicates disk writes between replicas itself', false],
      ], 'Azure Files supports ReadWriteMany across nodes, like EFS. Azure Disk classes are ReadWriteOnce block devices, attached to one node at a time, like EBS. AKS does not replicate disk writes between replicas.'),
      mcq('In IRSA, the IAM role\'s trust policy names system:serviceaccount:hr:payslip-worker. Where does that string go in AKS workload identity?', [
        ['In the federated identity credential\'s subject on the managed identity', true],
        ['In the ServiceAccount\'s client-id annotation, in place of the client ID', false],
        ['In the Pod label azure.workload.identity/use, in place of the value true', false],
        ['In a role assignment\'s condition on the storage account\'s data roles', false],
      ], 'The federated credential on the user-assigned identity plays the trust policy\'s role: its issuer and subject must match the service account token. The annotation carries the identity\'s client ID, the label is just "true", and role assignments say what the identity may do, not who may become it.'),
    ],
  },

  /* ── AZURE_MONITOR_IAC ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AZURE_AZURE_MONITOR_IAC',
    notes: `Two things make the Azure copy of PeopleNest operable rather than merely running: seeing what it does, and
rebuilding it from code. You have both on AWS — "CloudWatch: Metrics, Logs, Alarms and Dashboards" and the
Terraform topic. Here they are on Azure.

## Azure Monitor, mapped

    Azure                                   AWS
    Platform metrics (automatic)            CloudWatch metrics
    Activity log (control plane)            CloudTrail management events
    Resource logs via diagnostic settings   service logs (ALB, VPC flow logs ...) you switch on
    Log Analytics workspace + KQL           CloudWatch Logs + Logs Insights
    Application Insights                    X-Ray + application signals
    Container insights / managed Prometheus Container Insights / Amazon Managed Prometheus
    Alert rules + action groups             CloudWatch alarms + SNS topics

The trap: **resource logs are not collected by default.** An NSG, a storage account, an Application Gateway or
a Key Vault produces logs only after you create a **diagnostic setting** that sends them to a Log Analytics
workspace (or a storage account or Event Hub). Teams discover this on the day of an incident, when the logs
they need never existed. Make a diagnostic setting part of every resource's Terraform.

The **activity log** is on by default — every write in the subscription, with the caller — and is kept for 90
days; send it to a workspace to query it and keep it longer.

## KQL in one page

Log Analytics speaks **Kusto Query Language**. A query is a table followed by a pipeline of operators — read it
top to bottom like a shell pipeline. Logs Insights users map it quickly:

    Logs Insights         KQL
    fields a, b           project a, b
    filter x > 5          where x > 5
    stats count() by k    summarize count() by k
    bin(5m)               bin(TimeGenerated, 5m)
    sort t desc           order by t desc
    limit 20              take 20

Failure rate and latency per endpoint from Application Insights (workspace-based table AppRequests):

    AppRequests
    | where TimeGenerated > ago(1h)
    | summarize requests = count(), failures = countif(Success == false),
                p95_ms = percentile(DurationMs, 95) by Name
    | extend failure_pct = round(100.0 * failures / requests, 1)
    | order by failure_pct desc

The query was not run against a workspace. The same aggregation over 1,200 sample requests in Python shows the
shape of the answer:

    Name                   requests  failures  p95_ms  failure_pct
    POST /api/payroll/run        51         2    4522          3.9
    GET /api/payslips           603         4     279          0.7
    POST /api/leave             302         2     385          0.7
    GET /api/health             244         0      11          0.0

(KQL's percentile() is an estimate, so a real workspace may differ slightly in the last digits.) Two more you
will use in the first week:

    // who changed access in the last day
    AzureActivity
    | where TimeGenerated > ago(1d)
    | where OperationNameValue =~ "Microsoft.Authorization/roleAssignments/write"
    | project TimeGenerated, Caller, ResourceGroup, ActivityStatusValue

    // AKS: error lines per Pod in the hr namespace, every 5 minutes
    ContainerLogV2
    | where PodNamespace == "hr" and LogMessage has "ERROR"
    | summarize errors = count() by bin(TimeGenerated, 5m), PodName
    | render timechart

## Application Insights from Python

Application Insights is fed by OpenTelemetry ("Logs, Metrics and Traces"). The Azure Monitor distro configures
the exporters in one call and reads APPLICATIONINSIGHTS_CONNECTION_STRING from the environment (the import and
signature were checked with the package installed; nothing was sent):

    from azure.monitor.opentelemetry import configure_azure_monitor
    configure_azure_monitor()          # before the FastAPI app is created

Requests, dependencies and exceptions land in AppRequests, AppDependencies and AppExceptions, correlated by
operation ID.

## Alerts

    az monitor action-group create -g rg-hr-prod-app -n ag-hr-oncall --short-name hroncall \\
      --action email platform-team oncall@peoplenest.example
    az monitor metrics alert create -g rg-hr-prod-app -n alert-hr-api-5xx \\
      --scopes <app-service-id> --condition "total Http5xx > 20" \\
      --window-size 5m --evaluation-frequency 1m --severity 2 --action ag-hr-oncall

**Log search alerts** run KQL on a schedule for what metrics cannot see. Alert on symptoms users feel (the SLOs
from "SLIs, SLOs and Error Budgets"), not on every CPU spike.

## Terraform on Azure: the azurerm provider

Everything from the Terraform topic carries over; three Azure specifics:

- The provider needs a features {} block, and in version 4 a **subscription_id** (or ARM_SUBSCRIPTION_ID).
- The **azurerm backend** keeps state in a blob container and **locks it with a blob lease** — no separate lock
  table as with S3 and DynamoDB. use_azuread_auth = true makes it use your Entra identity instead of a key.
- In CI, authenticate with **OIDC**: ARM_USE_OIDC=true plus ARM_CLIENT_ID, ARM_TENANT_ID and
  ARM_SUBSCRIPTION_ID, and a federated credential for the repository — no client secret.

Abridged from PeopleNest's module (parsed with python-hcl2, references checked; not planned or applied):

    terraform {
      required_providers {
        azurerm = { source = "hashicorp/azurerm", version = "~> 4.0" }
      }
      backend "azurerm" {
        resource_group_name  = "rg-tfstate"
        storage_account_name = "sttfstatepeoplenest"
        container_name       = "tfstate"
        key                  = "hr/prod.tfstate"
        use_azuread_auth     = true
      }
    }

    provider "azurerm" {
      features {}
      subscription_id = var.subscription_id
    }

    resource "azurerm_log_analytics_workspace" "hr" {
      name                = "log-hr-prod"
      location            = azurerm_resource_group.hr.location
      resource_group_name = azurerm_resource_group.hr.name
      sku                 = "PerGB2018"
      retention_in_days   = 30
    }

    resource "azurerm_application_insights" "hr" {
      name                = "appi-hr-prod"
      location            = azurerm_resource_group.hr.location
      resource_group_name = azurerm_resource_group.hr.name
      workspace_id        = azurerm_log_analytics_workspace.hr.id
      application_type    = "web"
    }

    resource "azurerm_monitor_diagnostic_setting" "nsg" {
      name                       = "diag-nsg-api"
      target_resource_id         = azurerm_network_security_group.api.id
      log_analytics_workspace_id = azurerm_log_analytics_workspace.hr.id
      enabled_log {
        category_group = "allLogs"
      }
    }

The full file adds the resource group, network, action group and metric alert.

## Bicep alongside

Some Azure teams use Bicep ("CloudFormation and Bicep for Terraform Users"): new Azure features on day one, no
state file. The same two resources (written from the docs; not compiled):

    resource law 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
      name: 'log-hr-prod'
      location: location
      properties: {
        sku: { name: 'PerGB2018' }
        retentionInDays: 30
      }
    }

    resource appi 'Microsoft.Insights/components@2020-02-02' = {
      name: 'appi-hr-prod'
      location: location
      kind: 'web'
      properties: {
        Application_Type: 'web'
        WorkspaceResourceId: law.id
      }
    }

PeopleNest keeps Terraform, because the same people already run its AWS estate with it and one tool for two
clouds is one review process. Whichever you choose, one tool owns each resource.`,
    mcqs: [
      mcq('During an incident the team queries Log Analytics for nsg-api\'s rule-counter logs and finds nothing at all. What is the most likely reason?', [
        ['No diagnostic setting was created to send the NSG\'s logs to the workspace', true],
        ['NSG logs are kept only in the activity log, which KQL cannot query at all', false],
        ['The workspace\'s retention is 30 days, so new logs are deleted immediately', false],
        ['NSGs produce logs only when they deny traffic from a peered virtual network', false],
      ], 'Resource logs are produced only after a diagnostic setting routes them somewhere; without one nothing is collected. The activity log records control-plane changes and can itself be queried once routed, 30-day retention keeps 30 days, and NSG logs are not limited to peered traffic.'),
      mcq('Which KQL line does the job of the Logs Insights command stats count(*) by bin(5m)?', [
        ['| summarize count() by bin(TimeGenerated, 5m)', true],
        ['| stats count(*) by bin(TimeGenerated, 5m)', false],
        ['| project count() by bin(TimeGenerated, 5m)', false],
        ['| where count() by bin(TimeGenerated, 5m)', false],
      ], 'KQL aggregates with summarize, and bin() takes the time column explicitly. stats is Logs Insights syntax, project only selects columns, and where filters rows rather than aggregating.'),
      mcq('After upgrading to azurerm 4.x, terraform plan fails because the subscription cannot be determined, though az login works. What fixes it?', [
        ['Set subscription_id in the provider block or ARM_SUBSCRIPTION_ID in the environment', true],
        ['Add the subscription to the backend block, since the provider reads its value from there', false],
        ['Downgrade to azurerm 2.x, since 4.x no longer supports authentication with the az CLI', false],
        ['Register the Microsoft.Subscription resource provider before running terraform init', false],
      ], 'Version 4 of the azurerm provider requires the subscription to be stated explicitly in the provider block or ARM_SUBSCRIPTION_ID. The backend configures state only, 4.x still supports az CLI authentication, and provider registration is a different error.'),
    ],
    checkpoint: [
      mcq('A storage account\'s network rules were opened to all networks yesterday and nobody admits to it. Where is the answer?', [
        ['The activity log (AzureActivity), which records the write and its caller', true],
        ['Application Insights, which records changes to every resource it monitors', false],
        ['The storage account\'s platform metrics, which log each configuration change', false],
        ['Container insights, which records control-plane changes for the subscription', false],
      ], 'Control-plane writes, including who made them, are in the activity log, queryable as AzureActivity once routed to a workspace. Application Insights traces applications, metrics are numbers over time, and Container insights watches AKS clusters.'),
      mcq('PeopleNest moves its Terraform state for Azure into an azurerm backend. What prevents two pipelines from applying at the same time?', [
        ['A lease on the state blob, which the backend takes while it works', true],
        ['A DynamoDB-style lock table that must be created next to the blob', false],
        ['Nothing, so the team must add a lock table in Azure Table storage', false],
        ['Blob versioning, which rejects the second write to the state file', false],
      ], 'The azurerm backend locks state by acquiring a lease on the blob, so no separate table is needed. A lock table is the S3 backend\'s design, and versioning keeps history but does not serialise writers.'),
      mcq('Which Azure Monitor component plays the part of an SNS topic that CloudWatch alarms notify?', [
        ['An action group', true],
        ['A data collection rule', false],
        ['A Log Analytics workspace', false],
        ['A diagnostic setting', false],
      ], 'Alert rules notify action groups, which fan out to email, SMS, webhooks, Functions and more, as alarms notify an SNS topic. Data collection rules define what agents collect, a workspace stores logs, and a diagnostic setting routes a resource\'s logs.'),
    ],
  },

  /* ── AZURE_COST_GOVERN ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AZURE_AZURE_COST_GOVERN',
    notes: `The last lesson of the topic is the one that keeps the first eight safe: knowing what the Azure estate
costs, keeping it inside rules everyone agreed to, and turning all of it into the Azure certifications
employers filter on. On AWS you did this in "FinOps: Seeing, Explaining and Cutting the Bill" and "Multi-Account
Setups, Tags and Guardrails".

## Before you create anything: a budget

The same rule as on AWS. An **Azure free account** comes with a spending limit while it runs on its free
credit; once you move to **pay-as-you-go**, there is no cap, and a forgotten AKS cluster bills until someone
notices. Check the free account page for what is currently included rather than trusting a blog post.

**Budgets** in Cost Management are set at a management group, subscription or resource group, with alert
thresholds on **actual** and **forecast** cost. A budget **does not stop spending** — it sends email or
triggers an **action group**, which can run automation (for example, deallocate every VM tagged env=dev).
PeopleNest's subscription budget in Terraform (parsed with python-hcl2; not applied):

    data "azurerm_subscription" "current" {}

    resource "azurerm_consumption_budget_subscription" "monthly" {
      name            = "budget-peoplenest-azure"
      subscription_id = data.azurerm_subscription.current.id
      amount          = 3000
      time_grain      = "Monthly"
      time_period {
        start_date = "2026-11-01T00:00:00Z"
      }
      notification {
        enabled        = true
        threshold      = 80
        operator       = "GreaterThan"
        threshold_type = "Forecasted"
        contact_emails = ["cloud-owners@peoplenest.example"]
      }
    }

The amount is in the billing currency; 3000 here is a placeholder. A forecast alert fires early — a
straight-line estimate in Python of the same situation (Azure's forecast uses its own model):

    threshold  50%: actual -      forecast FIRED
    threshold  80%: actual -      forecast FIRED
    threshold 100%: actual -      forecast FIRED
    day 12 of 30: spent 1450, straight-line forecast 3625 against budget 3000

On day 12 nothing "actual" has fired, yet the month is heading 20% over. That is why forecast thresholds exist.

## Seeing the bill

**Cost analysis** shows cost by service, resource group, resource, location or tag, at any scope, with a daily
or monthly grain; cost data arrives with a delay of hours, so it is not a real-time meter. **Exports** write
cost data to a storage account on a schedule (the Cost and Usage Report idea), and **anomaly alerts** flag
unusual daily spend. If you buy reservations or a savings plan, compare **amortised** and **actual** cost views,
or one month will look absurd.

## Tags: not inherited

Tags are name/value pairs on resources, resource groups and subscriptions. Tag **names are case-insensitive**,
values are case-sensitive. The difference from what most people expect: **a resource does not inherit its
resource group's tags.** rg-hr-prod tagged cost-centre=CC-410 says nothing about the database inside it unless
something copies the tag. Two tools do: the built-in policy "Inherit a tag from the resource group if missing"
(Modify effect, with a remediation task for existing resources), and Cost Management's tag-inheritance setting
for cost records on supported billing accounts.

A tag audit over az resource list -o json-shaped data (real output; names lower-cased first because Azure
treats Env and env as the same tag):

    rg-hr-prod     ok
    app-hr-api     ok
    psql-hr-prod   missing: cost-centre
    sthrpayslips   missing: owner, env, cost-centre
    vm-test-07     missing: owner, cost-centre

## Azure Policy at scale

Policies are grouped into **initiatives** and **assigned** at a scope — usually a management group — with
parameters. Effects you will meet: **Deny**, **Audit**, **Modify** (add or fix tags and properties),
**DeployIfNotExists** (e.g. create a diagnostic setting when missing), **AuditIfNotExists** and **Disabled**.
Modify and DeployIfNotExists need a managed identity on the assignment and a **remediation task** for resources
that already exist. **Exemptions** (with an expiry date) handle the justified exception without deleting the
assignment. A reasonable starting baseline for PeopleNest:

- Allowed locations: centralindia, southindia (data residency, and no surprise regions).
- Require owner, env and cost-centre tags; inherit cost-centre from the resource group.
- Deny storage accounts that allow public blob access; deny public IPs on NICs in prod.
- DeployIfNotExists diagnostic settings to the central workspace.

Remember the distinction from the map lesson: an SCP limits what identities may **do**; a policy judges what a
resource **is**. Policy cannot stop an Owner from deleting a database — that is a job for RBAC and locks.

## Locks

A **resource lock** — CanNotDelete or ReadOnly — applies at a scope and below, to **everyone, Owners
included**, until someone with lock permissions removes it. CanNotDelete on rg-hr-prod-data is a cheap guard
against the az group delete accident. ReadOnly is sharper than it sounds: it blocks every write *and* POST
operations such as listing storage keys, so apps that fetch keys break. Use CanNotDelete unless you have tested
ReadOnly.

## Advisor and the usual waste

**Azure Advisor** gives recommendations in five areas — cost, reliability, security, operational excellence and
performance — the same pillars as the Azure Well-Architected Framework (AWS's framework has a sixth,
sustainability). **Defender for Cloud** adds a secure score and security recommendations. The waste Advisor and
cost analysis keep finding:

- VMs stopped but not deallocated; oversized VMs and App Service plans with idle CPU.
- Unattached managed disks and unused public IPs left after VMs were deleted.
- Log Analytics ingestion from verbose debug logging — logs are billed by volume ingested.
- Dev AKS clusters that are never stopped; Premium tiers in non-prod.
- NAT gateways, private endpoints, VPN gateways and firewalls left in a test environment.

The cure for the last one is structural: each test environment in its own resource group, deleted as a unit.

## The certification map

**AZ-900 (Azure Fundamentals)** has three domains: cloud concepts; Azure architecture and services; Azure
management and governance. This topic covers all three. **AZ-104 (Azure Administrator Associate)** has five,
and this topic maps onto them:

    Manage Azure identities and governance     ENTRA_RBAC, AZURE_COST_GOVERN, AZURE_MAP
    Implement and manage storage               AZURE_STORAGE_DATA
    Deploy and manage Azure compute resources  AZURE_COMPUTE, AKS_ACR
    Implement and manage virtual networking    AZURE_NETWORKING
    Monitor and maintain Azure resources       AZURE_MONITOR_IAC, backups in AZURE_STORAGE_DATA

The weightings and objectives change, so read the current study guide on Microsoft Learn before booking. For a
cloud or DevOps role, AZ-104 after an AWS associate certificate is a strong pair; AZ-400 (DevOps Engineer Expert)
comes later and needs an associate certificate first. Microsoft Learn's free sandboxes cover many hands-on
modules without touching your own subscription.`,
    mcqs: [
      mcq('Cost analysis grouped by the cost-centre tag shows most of rg-hr-prod as "untagged", although the resource group itself carries cost-centre=CC-410. Why?', [
        ['Resources do not inherit their resource group\'s tags unless policy copies them', true],
        ['Cost analysis reads tags only from subscriptions, never from resource groups', false],
        ['Tag names are case-sensitive, so cost-centre and CC-410 do not match up', false],
        ['Tags appear in cost analysis only after the resource has been redeployed', false],
      ], 'Tags are not inherited; the "Inherit a tag from the resource group if missing" policy (Modify, with remediation) or Cost Management\'s tag inheritance setting copies them. Cost analysis can group by resource tags, tag names are case-insensitive, and redeploying is not required once tags exist.'),
      mcq('PeopleNest\'s pay-as-you-go subscription reaches 100% of its monthly budget on the 20th. What happens to the running resources?', [
        ['They keep running; the budget alerts and can trigger an action group', true],
        ['They are deallocated automatically until the next month\'s budget starts', false],
        ['They are moved to the free tier, so they keep working at no extra cost', false],
        ['New resources are blocked, while those already running keep going', false],
      ], 'Budgets notify rather than enforce. Any shutdown must be built, for example an action group that runs automation to deallocate dev VMs. Azure does not deallocate, downgrade or block creation because a budget threshold was crossed.'),
      mcq('After a ReadOnly lock is put on the payslips storage account, an older app that authenticates with an account key starts failing. Why?', [
        ['A ReadOnly lock blocks POST operations such as listing the account keys', true],
        ['A ReadOnly lock rotates the account keys, so the app\'s stored key is stale', false],
        ['A ReadOnly lock disables blob reads for every client that uses shared keys', false],
        ['A ReadOnly lock moves every blob in the account to the Archive access tier', false],
      ], 'ReadOnly permits only read (GET) operations on the management plane, and listKeys is a POST, so an app that fetches keys at start-up breaks. Locks do not rotate keys, change tiers or block data reads by themselves.'),
    ],
    checkpoint: [
      mcq('An engineer with Owner on rg-hr-prod-data tries to delete a test database there. A CanNotDelete lock is set on the resource group. What happens?', [
        ['The delete is refused; the lock applies to Owners until it is removed', true],
        ['The delete succeeds, because Owners are exempt from locks they inherit', false],
        ['The delete succeeds, because locks protect only the resource group itself', false],
        ['The delete is queued and runs automatically when the lock next expires', false],
      ], 'Locks apply to every user at that scope and below, Owners included; someone with lock permissions must remove it first. Locks are inherited by the resources in the group, and they have no expiry or queue.'),
      mcq('Which Azure Policy effect adds a missing tag to resources at creation and, with a remediation task, to existing ones?', [
        ['Modify', true],
        ['Audit', false],
        ['Deny', false],
        ['Disabled', false],
      ], 'Modify changes properties and tags during create or update, and a remediation task applies it to existing resources using the assignment\'s managed identity. Audit only reports, Deny blocks the request, and Disabled turns the policy off.'),
      mcq('A study plan lists "configure NSGs, peering and private endpoints". Which AZ-104 domain does it belong to?', [
        ['Implement and manage virtual networking', true],
        ['Manage Azure identities and governance', false],
        ['Deploy and manage Azure compute resources', false],
        ['Monitor and maintain Azure resources', false],
      ], 'NSGs, peering and private endpoints are networking objectives. Identities and governance cover Entra, RBAC and policy, compute covers VMs, App Service and containers, and monitoring covers Azure Monitor and backups.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AZURE_DEBUGGING',
    notes: `Six failures from PeopleNest's first month on Azure. For each: the symptom, the cause, and the one change that
fixes it. The order of evidence is the same every time — read the **exact error** (Azure's error codes are
specific: AuthorizationFailed, AuthorizationPermissionMismatch, AADSTS70021), find **which layer** produced it
(ARM, the data plane, Entra ID, the network), then check that layer's configuration. The messages below are the
documented forms; there was no subscription to reproduce them in.

## 1. "Contributor" cannot create a resource group

**Symptom.** Meera, Contributor on rg-hr-dev, runs az group create -n rg-hr-feature-x -l centralindia and gets:
(AuthorizationFailed) The client 'meera@peoplenest.example' ... does not have authorization to perform action
'Microsoft.Resources/subscriptions/resourcegroups/write' over scope '/subscriptions/.../resourcegroups/
rg-hr-feature-x' or the scope is invalid.

**Cause.** Her role is scoped to one resource group. Creating a **new** group is a write at subscription scope,
which nothing grants her — the RBAC model in the lesson printed exactly this deny.

**Fix.** Not Contributor on the subscription. Either the platform team (or a pipeline) creates feature groups
on request and assigns her Contributor on each, or a custom role that allows resource group writes is given to
a sandbox subscription only. If access *was* just granted, the message's own advice applies: sign in again so a
fresh token carries it.

## 2. A 403 reading blobs, with "full access"

**Symptom.** The payslip job, running as its managed identity, gets AuthorizationPermissionMismatch from Blob
Storage. The identity has Contributor on the storage account.

**Cause.** Contributor grants management Actions, not DataActions. With Entra authentication the data plane
checks data roles only.

**Fix.** Assign Storage Blob Data Contributor at the payslips container scope (and remove Contributor, which
the job never needed). Allow a few minutes for the assignment to take effect before testing again.

## 3. Application Gateway shows every backend unhealthy

**Symptom.** After a "tidy-up" of nsg-api, Application Gateway's backend health shows all API instances
unhealthy, and users get 502s. Network Watcher IP flow verify from the gateway subnet to an API VM on 8000
reports: Access Deny, rule deny-vnet-rest.

**Cause.** The tidy-up renumbered rules. allow-appgw-8000 is now at **4010**, after deny-vnet-rest at **4000**.
The lower number matches first, so the deny wins for the gateway's traffic and its health probes.

**Fix.** Give the allow a number below the deny (100). Keep a numbering convention in the NSG's Terraform —
allows in 100-999, broad denies at 4000 — and a test that runs the rules through the evaluation model before
merge.

## 4. The staging slot cannot read its secret

**Symptom.** The new release in the staging slot fails its warm-up with database authentication errors. In the
portal, the app setting DB_PASSWORD shows a red mark: the Key Vault reference is not resolved.

**Cause.** Production's **system-assigned identity** was granted Key Vault Secrets User. A deployment slot has
its **own** system-assigned identity, which was granted nothing.

**Fix.** Grant the staging slot's identity the same role, or — better — attach one **user-assigned** identity
to both slots and set it as the identity used for Key Vault references, so a new slot needs no new grant.

## 5. Workload identity works in dev, fails in prod

**Symptom.** The payslip worker on the prod AKS cluster logs AADSTS70021: No matching federated identity record
found for presented assertion. The same chart works in dev.

**Cause.** The federated credential was copied from dev, including its **issuer** — dev's cluster OIDC URL.
Every cluster has its own issuer, and Entra matches issuer and subject exactly.

**Fix.** Create the prod federated credential with prod's issuer (az aks show --query
oidcIssuerProfile.issuerUrl) and subject system:serviceaccount:hr:payslip-worker. In Terraform, read the issuer
from the cluster resource, as the module in the monitoring lesson does, instead of pasting it.

## 6. Private endpoint created, app still goes public

**Symptom.** After public network access on sthrpayslips is disabled, the HR API gets 403 "This request is not
authorized to perform this operation." nslookup sthrpayslips.blob.core.windows.net on an API VM returns a public
address.

**Cause.** The private endpoint exists, but the privatelink.blob.core.windows.net zone is **not linked** to
vnet-hr-prod, so the VM resolves the public endpoint, which now refuses everyone.

**Fix.** Link the private DNS zone to the VNet (and to any peered VNet whose clients use the endpoint). Re-run
nslookup: it should return 10.60.3.x. No application change is needed.

## The habit

In every case the error said which layer failed. ARM authorisation errors name an action and a scope; data-plane
errors name a permission mismatch; Entra errors carry an AADSTS code; network failures show up in IP flow verify
and DNS. Read it, then change one thing.`,
    mcqs: [
      mcq('An engineer who is Contributor on two resource groups gets AuthorizationFailed for Microsoft.Resources/subscriptions/resourcegroups/write when creating a third. What is the right fix?', [
        ['Have the group created for them and get Contributor on it', true],
        ['Make them Contributor on the subscription for the whole year', false],
        ['Retry in another region, since the name is taken in this one', false],
        ['Add the resourcegroups/write action to their NotActions list', false],
      ], 'Creating a group is a write at subscription scope, which their group-scoped roles do not grant; creating the group centrally and scoping Contributor to it keeps least privilege. A year-long subscription-wide Contributor is far broader than needed, the error is not about names or regions, and NotActions removes rights rather than adding them.'),
      mcq('nsg-api has deny-vnet-rest at 4000 and allow-appgw-8000 at 4010. Backend health on Application Gateway turns unhealthy. What change fixes it?', [
        ['Renumber the allow below 4000, for example to 100', true],
        ['Raise the deny to 4096 so it is the highest number', false],
        ['Add a second allow rule at 4020 for the same traffic', false],
        ['Restart the API VMs so they pick up the new rule set', false],
      ], 'First match by lowest number means the deny at 4000 matches before the allow at 4010; putting the allow at 100 fixes the order. Moving the deny to 4096 would also work but leaves a fragile layout; another allow after the deny never matches, and VMs do not cache NSG rules.'),
      mcq('Production resolves a Key Vault reference fine, but the staging slot shows it unresolved. Both use system-assigned identities. What is the cause?', [
        ['Each slot has its own system-assigned identity, and staging has no role', true],
        ['Key Vault references work only in the production slot of an App Service', false],
        ['The staging slot needs the vault\'s access keys stored in its app settings', false],
        ['Slot swaps reset the vault\'s firewall, so staging must be swapped first', false],
      ], 'A deployment slot is its own app with its own system-assigned identity, which needs its own role on the vault (or use one user-assigned identity for both). References work in every slot, Key Vault has no access keys to store, and swaps do not touch the vault firewall.'),
      mcq('A federated credential copied from the dev AKS cluster fails in prod with AADSTS70021, though namespace and service account names are identical. What differs?', [
        ['The issuer, because every cluster has its own OIDC issuer URL', true],
        ['The audience, because prod clusters use a different audience value', false],
        ['The subject, because prod adds the cluster name to the subject', false],
        ['The token lifetime, because prod tokens expire before the exchange', false],
      ], 'Entra matches the token\'s issuer and subject exactly, and each AKS cluster has a unique OIDC issuer URL, so a credential pasted from dev names the wrong one. The audience stays api://AzureADTokenExchange, the subject format does not include the cluster, and expiry gives a different error.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AZURE_PRACTICE',
    notes: `Nine exercises, easiest first. Answer each on paper before reading the answer. Address arithmetic was computed
with Python's ipaddress module, NSG answers with the evaluation model from the networking lesson.

## 1. Read a resource ID (easy)

/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-hr-prod-data/providers/
Microsoft.DBforPostgreSQL/flexibleServers/psql-hr-prod. Name the subscription, resource group, resource
provider, type and name, and say what deleting rg-hr-prod-data would do to it.

**Answer.** Subscription 00000000-..., group rg-hr-prod-data, provider Microsoft.DBforPostgreSQL, type
flexibleServers, name psql-hr-prod. Deleting the group deletes the server — which is why that group carries a
CanNotDelete lock.

## 2. Map it (easy)

Give the Azure service for: an EC2 instance profile, an SQS queue, CloudTrail, an SCP that blocks regions, an
EFS volume mounted by Pods.

**Answer.** A managed identity; a Service Bus queue (or a Storage queue for simple cases); the activity log; an
Azure Policy assignment of "Allowed locations" (a policy on resource properties, not on actions); Azure Files via
the azurefile-csi storage class.

## 3. Effective access (easy)

grp-oncall has Reader on sub-hr-prod and the custom VM Operator role on rg-hr-prod-app. Can a member (a) restart
a VM in rg-hr-prod-app, (b) restart one in rg-hr-prod-data, (c) delete one in rg-hr-prod-app, (d) assign Reader
to a colleague?

**Answer.** (a) Yes — VM Operator at that group. (b) No — only Reader reaches it. (c) No — no role grants
delete. (d) No — neither role has Microsoft.Authorization/roleAssignments/write.

## 4. Evaluate an NSG (medium)

nsg-web, inbound: 100 Allow 10.60.0.0/24 to any on 443; 200 Deny VirtualNetwork to any on 22; 300 Allow
10.60.4.0/26 (the Bastion subnet) to any on 22; 400 Deny Internet to any. Decide (a) Bastion host 10.60.4.10 to
web on 22, (b) the gateway 10.60.0.10 on 443, (c) an API VM 10.60.2.4 on 443, (d) 198.51.100.7 on 443.

**Answer** (model output):

    (a) Bastion 10.60.4.10 -> web :22    Deny  by   200 deny-ssh-from-vnet
    (b) appgw 10.60.0.10 -> web :443     Allow by   100 allow-appgw-https
    (c) api 10.60.2.4 -> web :443        Allow by 65000 AllowVnetInBound
    (d) 198.51.100.7 -> web :443         Deny  by   400 deny-internet

(a) is the trap: the Bastion subnet is inside VirtualNetwork, so the deny at 200 matches first. Swap 200 and 300.
(c) shows the VNet default still applies to anything you did not deny.

## 5. Size the AKS subnet (medium)

60 nodes, max 30 Pods per node, 3 extra nodes during upgrades. How big must the node subnet be with flat Azure
CNI (each node reserves max-Pods + 1 addresses), and with Azure CNI Overlay?

**Answer.** Flat: 63 x 31 = 1,953 addresses, so a /21 (2,043 usable after Azure's five). Overlay: Pods use the
private Pod CIDR, so only 63 node addresses — a /25 (123 usable). Overlay gives each node a /24 of Pod addresses,
so a 10.244.0.0/16 Pod CIDR supports 256 nodes.

## 6. Choose redundancy (medium)

For each, pick LRS, ZRS, GRS or GZRS: (a) build caches that can be regenerated; (b) payslips that must survive
a zone failure with no loss, data in India; (c) the same, plus a regional disaster; (d) nightly exports to an
auditor that must survive a regional disaster but not a zone one.

**Answer.** (a) LRS. (b) ZRS. (c) GZRS — the secondary is South India, Central India's pair. (d) GRS.

## 7. Sticky or not (medium)

Mark each app setting sticky or not: DB_HOST, APP_ENV, FEATURE_PAYSLIP_V2 (ships with v42),
APPLICATIONINSIGHTS_CONNECTION_STRING (separate resources for prod and staging), LOG_LEVEL (same everywhere).

**Answer.** Sticky: DB_HOST, APP_ENV, the connection string. Not sticky: the feature flag (it belongs to the
release) and LOG_LEVEL (same in both, so it does not matter — leave it non-sticky).

## 8. Write the KQL (medium)

From AppRequests, count requests with a ResultCode starting with "5" in 5-minute bins over the last 6 hours,
as a time chart.

**Answer.**

    AppRequests
    | where TimeGenerated > ago(6h) and ResultCode startswith "5"
    | summarize errors = count() by bin(TimeGenerated, 5m)
    | render timechart

## 9. Early deletion (harder)

A lifecycle rule moves blobs to Archive after 180 days. A bulk cleanup deletes 2,000 archived blobs on day 250.
How many archive-days per blob are charged as early deletion, and what would you change?

**Answer.** 250 - 180 = 70 days in Archive; the minimum is 180, so 110 early-deletion days per blob. If cleanups
happen around day 250, either archive later or delete without archiving — Cool or Cold may be cheaper overall
for data with a short tail.`,
    mcqs: [
      mcq('In exercise 4, why is SSH from the Bastion host denied even though rule 300 allows the Bastion subnet?', [
        ['Rule 200 denies VirtualNetwork on 22, and the Bastion subnet is in it', true],
        ['Bastion connections use port 443, so a rule for 22 never matches', false],
        ['Rule 400 denies Internet, and Bastion traffic counts as Internet', false],
        ['NSG rules for SSH are ignored when Azure Bastion is deployed', false],
      ], 'Rules run lowest number first, and the deny at 200 matches the Bastion subnet\'s address because VirtualNetwork includes it. Bastion does reach VMs on 22 from its subnet, its traffic is not Internet, and NSGs are never bypassed for SSH.'),
      mcq('A cluster will have 40 nodes with max 50 Pods each and 2 surge nodes, using flat Azure CNI. How many node-subnet addresses are needed?', [
        ['42 x 51 = 2,142', true],
        ['40 x 50 = 2,000', false],
        ['42 x 50 = 2,100', false],
        ['40 x 51 = 2,040', false],
      ], 'Flat Azure CNI reserves max-Pods + 1 addresses per node (the node plus its Pods), and surge nodes need them too: 42 x 51. The other answers drop the surge nodes, the node\'s own address, or both.'),
      mcq('Archived audit exports are always deleted after about 200 days. Moving them to Archive at day 30 causes early-deletion charges. What is the better rule?', [
        ['Use Cool or Cold instead, whose minimums the data outlives', true],
        ['Move them to Archive at day 1 so that they spend longer there', false],
        ['Keep them in Hot for ever, since tiers only add hidden costs', false],
        ['Turn on soft delete so deletions are not counted against tiers', false],
      ], 'Data deleted around day 200 spends about 170 days in Archive, under its 180-day minimum; Cool (30) or Cold (90) minimums are met. Archiving earlier still deletes at the same age, Hot ignores the savings, and soft delete adds retention rather than avoiding minimums.'),
      mcq('Which pair is the correct Azure mapping for "an SCP that blocks regions"?', [
        ['An "Allowed locations" policy at a management group', true],
        ['A custom RBAC role with NotActions on other regions', false],
        ['A CanNotDelete lock on every non-Indian resource group', false],
        ['A route table that drops traffic to other region IPs', false],
      ], 'Allowed locations is a policy on the resource\'s location property, assigned once at a management group to cover its subscriptions. NotActions trims a role rather than denying, locks stop deletion, and routing does not stop resources being created elsewhere.'),
      mcq('An app setting holds a connection string to a separate Application Insights resource per slot. Should it be sticky?', [
        ['Yes, because each slot must keep sending to its own resource', true],
        ['No, because telemetry settings are ignored by slot swaps', false],
        ['No, because only database settings may be marked sticky', false],
        ['Yes, but only on the production slot, never on staging', false],
      ], 'An environment-specific value must stay with its slot, so it is marked as a deployment slot setting. Telemetry settings swap like any other, any setting can be sticky, and stickiness is set per setting name on each slot.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AZURE_INTERVIEW_QUESTION',
    notes: `Asked in cloud and DevOps interviews at GCCs and IT services companies in Hyderabad, Pune and Bengaluru, where
many clients run Azure, and at product companies that run AWS but sell to Azure customers. Say each answer aloud
in about two minutes, then compare. Interviewers listen for whether you know where Azure differs from AWS rather
than translating names one for one.

## Q1. "You have worked on AWS. How is Azure organised, and how would you lay out a new company's subscriptions?"

**Model answer.** "Identity is at the top: one Entra ID tenant holds every user, group and managed identity, and
every subscription trusts that tenant — unlike AWS, where each account has its own IAM. Under the tenant there
is a management group tree, then subscriptions, which are the billing and quota boundary like AWS accounts, then
resource groups, which have no real AWS equivalent: every resource is in exactly one, and deleting the group
deletes everything in it. I would put a company root management group under the tenant root, with platform,
workloads and sandbox groups; prod and non-prod subscriptions per product; and resource groups by lifecycle —
network, app, data — so that a test environment can be deleted as one unit. Policies such as allowed regions are
assigned once at the top."

**Follow-up.** "Why not one subscription with many resource groups?" — "Subscriptions separate quotas, bills and
blast radius. If non-prod exhausts a vCPU quota or someone gets Owner by mistake, it must not touch prod.
Resource groups inside one subscription share all of that."

## Q2. "Compare Azure RBAC with AWS IAM."

**Model answer.** "Both say who can do which actions on what. In IAM I attach policies with Allow and Deny
statements to principals and resources, and an explicit deny always wins. In Azure RBAC I create a role
assignment — a principal, a role definition and a scope — and it inherits down from management group to
resource. Assignments are additive; NotActions only trims one role and is not a deny. So least privilege in
Azure is narrow roles at narrow scopes. Azure also separates management Actions from DataActions: Contributor on
a storage account cannot read blobs with Entra sign-in, though it can list the keys, which is why I disable
shared-key access. And directory roles like Global Administrator are a separate system from Azure roles."

**Follow-up.** "So how do you stop someone deleting the production database?" — "RBAC first: nobody holds a role
with delete on it day to day, and admin roles are eligible through PIM. Then a CanNotDelete lock on the data
resource group, which even Owners must remove deliberately. And Azure Policy for what resources may look like —
though policy judges properties, it does not stop an action by an identity."

## Q3. "An NSG rule allows HTTPS to a VM, but the app is unreachable. Walk me through it."

**Model answer.** "First, which path: is there a public IP or a load balancer in front, and does DNS resolve to
it? Then the effective rules — az network nic list-effective-nsg — because there may be an NSG on the subnet and
another on the NIC, both must allow, and the lowest-numbered matching rule wins, so a deny with a lower number
beats my allow. IP flow verify in Network Watcher tells me exactly which rule decides. If NSGs allow it, I check
routing — a route table might send 0.0.0.0/0 to a firewall that drops it — and then the VM itself: is the app
listening on that port and interface, and is the OS firewall open? For a load balancer I check the health probe,
since a failing probe removes the VM from rotation."

**Follow-up.** "The probe fails though the app works from inside the VM." — "Then the probe path or port is wrong,
or the NSG blocks the probe source. For Azure Load Balancer probes the default AllowAzureLoadBalancerInBound rule
covers it unless a custom deny with a lower number catches it first."

## Q4. "How does a Pod on AKS read a secret from Key Vault without any stored credential?"

**Model answer.** "With workload identity. The cluster has an OIDC issuer; I create a user-assigned managed
identity and give it Key Vault Secrets User on that vault only; I add a federated credential to the identity
whose issuer is the cluster's and whose subject is system:serviceaccount:<namespace>:<sa>. The service account is
annotated with the identity's client ID, and the Pod template carries the label azure.workload.identity/use:
"true", so the webhook injects a projected token and environment variables. The SDK's DefaultAzureCredential
exchanges the token with Entra ID for an access token. It is the same design as IRSA on EKS."

**Follow-up.** "It fails with AADSTS70021." — "No federated credential matches the token: the subject has the
wrong namespace or service account, or the issuer is another cluster's. I compare them with az aks show and az
identity federated-credential list."`,
    mcqs: [
      mcq('Asked "why not one subscription for everything?", which answer shows the judgement an interviewer wants?', [
        ['Subscriptions separate quotas, bills and blast radius between prod and non-prod', true],
        ['Azure allows at most one resource group in each subscription, so many are needed', false],
        ['Each subscription needs its own Entra tenant, which keeps their users apart', false],
        ['Resource groups cannot hold resources from more than one Azure service type', false],
      ], 'A strong answer names what a subscription isolates: quotas, cost and the damage a mistake can do. Subscriptions hold many resource groups, all trust one tenant, and resource groups hold any mix of resource types.'),
      mcq('A candidate says, "In Azure I would add a NotActions entry to block deletes, like an explicit deny in IAM." What is wrong with that?', [
        ['NotActions only trims that role; another role can still grant the delete', true],
        ['NotActions is applied only to Entra directory roles, not to Azure roles', false],
        ['NotActions blocks every action, so the user could no longer read anything', false],
        ['Nothing is wrong: NotActions overrides any other assignment the user has', false],
      ], 'NotActions removes operations from the role it is written in; a second role assignment can still grant them, because RBAC is additive. It applies to Azure roles, removes only the listed operations, and overrides nothing outside its own role.'),
      mcq('In the NSG troubleshooting answer, which tool tells you exactly which rule allows or denies a given packet?', [
        ['IP flow verify in Network Watcher', true],
        ['Azure Advisor\'s reliability tab', false],
        ['The activity log for the subscription', false],
        ['Cost analysis grouped by the NSG', false],
      ], 'IP flow verify evaluates a five-tuple against the effective NSG rules and names the deciding rule. Advisor gives recommendations, the activity log records configuration changes, and cost analysis shows spend.'),
    ],
  },

  /* ── MINI_PROJECT ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AZURE_MINI_PROJECT',
    notes: `## The scenario

**TicketKatta** (fictional) — the Pune ticket-booking start-up whose AWS network you designed in the AWS
networking project — has signed a deal with a college-fest organiser network whose sponsor gives it Azure
credits, and with a corporate events firm that will only buy services hosted on Azure in India. The founders
want the same app running on Azure in Central India (Pune), built entirely with Terraform, with an honest
written comparison: what it cost, how long it took, and what Azure did better or worse.

You are the engineer. Everything runs in your own Azure subscription — a free account if you have one — with a
budget set **before** anything else, and everything is deleted at the end.

## The app

Use the three-tier app you built for the AWS topics, or a minimal version (any language, a few dozen lines):

- **web/api** — an HTTP service: GET /events, POST /bookings, GET /healthz. Reads a database password from the
  environment (which on Azure comes from a Key Vault reference or the CSI driver, never from the repository).
- **PostgreSQL** — events and bookings tables.
- **Object storage** — ticket PDFs (any small file will do), served to users with a short-lived link.

## Requirements (and what they mean on Azure)

- "Runs in India, survives losing a machine." Central India; at least two instances (App Service with two
  instances, or AKS with two nodes in different zones).
- "Nothing public that need not be." Only the web entry point is public. PostgreSQL and the storage account
  have public network access off and private endpoints (or PostgreSQL private access) with linked private DNS
  zones.
- "No passwords in code or pipelines." A managed identity for the app; Key Vault for the database password;
  data-plane roles (Key Vault Secrets User, Storage Blob Data Contributor) at the narrowest scope; shared-key
  access disabled on storage; ticket links are user delegation SAS tokens valid for 15 minutes.
- "We will know when it breaks." Application Insights, a Log Analytics workspace, diagnostic settings on the
  NSGs, Key Vault and storage account, and two alerts (5xx rate and p95 latency) to an action group.
- "No surprise bills." A subscription or resource group budget with forecast and actual alerts, required tags
  enforced by policy, and a teardown that leaves nothing billable.

## Deliverables

1. **Terraform** (azurerm 4.x) with an azurerm remote backend using Entra authentication: resource groups by
   lifecycle; a VNet with the subnets you need (show the address plan computed with Python's ipaddress, and that
   it does not overlap your AWS VPC); NSGs with application security groups where you have VMs, and a custom deny
   above the VirtualNetwork default; App Service (plan, app, staging slot with sticky settings, VNet integration)
   **or** AKS (system and user pools, Azure CNI Overlay, workload identity, ACR with AcrPull); PostgreSQL
   Flexible Server; a storage account with ZRS or GZRS (justify it), versioning, soft delete and a lifecycle
   policy; Key Vault with the RBAC permission model; monitoring and alerts; the budget, a policy assignment and a
   CanNotDelete lock on the data group.
2. **An NSG test** — the rules exported from Terraform (terraform show -json or the plan) and evaluated by a
   Python model like the lesson's, proving: internet to the database is denied, web to database on 5432 is
   denied unless your design needs it, and the entry point reaches the app. Then, on the real network, the same
   cases with IP flow verify.
3. **A release** — deploy v1, then v2 to the staging slot (or a new Helm revision), swap (or roll out), and roll
   back. Show production kept its own database settings.
4. **Evidence** — screenshots or CLI output: the app working, a ticket link that stops working after 15 minutes,
   a KQL query of your own over AppRequests, an alert firing (cause a 5xx burst deliberately), the budget, the
   policy compliance view, and nslookup from inside the VNet returning private IPs.
5. **COMPARISON.md** — AWS versus Azure for this app: a table mapping every AWS resource you used to the Azure
   one; where Azure was easier and where harder (RBAC scopes, NSG priorities, slots, managed identities, the
   resource group model, private DNS); a cost estimate for both built from the two pricing calculators (state
   your assumptions; no guessing); gaps you did not close; and what you would choose for TicketKatta and why.
6. **README and teardown** — a diagram, how to deploy from a clean machine, and the teardown order (lock removed
   deliberately, then terraform destroy, then confirm in cost analysis over the next days that spend went to zero).

## Milestones

- **Day 1 — foundation.** Budget, tags policy, state backend, resource groups, the address plan and VNet.
- **Day 2 — data.** PostgreSQL, storage account, Key Vault, private endpoints and DNS; identities and roles.
- **Day 3 — app.** App Service with slots or AKS with workload identity; the app working end to end.
- **Day 4 — operations.** Monitoring, alerts, the NSG test, the release and rollback.
- **Day 5 — evidence and write-up.** COMPARISON.md, README, teardown and the final cost check.

## How it will be judged

The reviewer will read the Terraform, run your NSG test, and ask "why" about every choice: this redundancy, this
scope, this priority, this tier. The comparison document matters as much as the infrastructure — an engineer who
can say precisely where two clouds differ is the engineer GCC teams hire. Never commit secrets, subscription IDs
or state files; use placeholders such as 00000000-0000-0000-0000-000000000000.`,
    assignment: {
      title: 'TicketKatta on Azure: The Same Three-Tier App, Built with Terraform and Compared with AWS',
      description: 'Rebuild the TicketKatta booking app on Azure in Central India with Terraform: a private network with tested NSGs, App Service with slots or AKS with workload identity, PostgreSQL Flexible Server and Blob Storage behind private endpoints, Key Vault and managed identities, Azure Monitor alerts, a budget and policy — then write an evidence-based comparison of cost, effort and gaps against the AWS version, and tear it all down.',
      instructions: `1. Before creating anything, set a budget with forecast and actual alerts and assign a policy requiring owner, env and cost-centre tags.
2. Write Terraform (azurerm 4.x, azurerm backend with Entra authentication) for resource groups by lifecycle, a VNet whose address plan you computed with ipaddress and checked against your AWS VPC, and NSGs with a custom deny above the VirtualNetwork default.
3. Run the app on App Service (plan, staging slot with sticky settings, VNet integration) or on AKS (system and user pools, Azure CNI Overlay, ACR with AcrPull, workload identity).
4. Add PostgreSQL Flexible Server and a storage account (justify ZRS or GZRS) with public access off, private endpoints and linked private DNS zones, versioning, soft delete and a lifecycle policy; disable shared-key access.
5. Give the app a managed identity with Key Vault Secrets User and Storage Blob Data Contributor at the narrowest scopes; serve ticket files through 15-minute user delegation SAS links.
6. Add Application Insights, a Log Analytics workspace, diagnostic settings on the NSGs, Key Vault and storage account, two alerts to an action group, and a CanNotDelete lock on the data resource group.
7. Test the NSGs with a Python evaluation of the Terraform rules and with IP flow verify; perform a release and a rollback; collect the evidence listed in the brief.
8. Write COMPARISON.md (resource map, easier and harder, cost estimates from both calculators with assumptions, gaps, recommendation) and a README with a diagram, deployment steps and the teardown order; then tear everything down and confirm spend returns to zero.`,
      rubric: [
        { criterion: 'Terraform and structure', description: 'Clean azurerm 4.x code with a remote backend using Entra authentication, resource groups by lifecycle, consistent names and tags, and no secrets, subscription IDs or state committed.', maxPoints: 20 },
        { criterion: 'Network and its test', description: 'A non-overlapping address plan shown with ipaddress; NSGs with correct priorities, ASGs where VMs are used and a custom deny above the defaults; private endpoints with linked DNS; a Python NSG test and IP flow verify results that agree.', maxPoints: 20 },
        { criterion: 'Identity and data protection', description: 'Managed identity with data-plane roles at the narrowest scope, Key Vault in RBAC mode, shared-key access disabled, user delegation SAS with short expiry, justified storage redundancy, versioning, soft delete and lifecycle.', maxPoints: 20 },
        { criterion: 'App, release and operations', description: 'The app running across at least two instances or zones; a release and rollback with slots or Helm that keeps production settings; Application Insights, diagnostic settings, a working KQL query and alerts proven by a deliberate failure.', maxPoints: 20 },
        { criterion: 'Cost, governance and comparison', description: 'Budget, tag policy and lock in place before the build; COMPARISON.md with a full resource map, specific differences, calculator-based cost estimates with assumptions, honest gaps and a reasoned recommendation; a verified teardown.', maxPoints: 20 },
      ],
      totalPoints: 100,
    },
    mcqs: [
      mcq('TicketKatta\'s ticket PDFs must survive a zone failure with no data loss and stay in India. The team has no regional-disaster requirement. Which redundancy do you justify in COMPARISON.md?', [
        ['ZRS in Central India', true],
        ['LRS in Central India', false],
        ['GRS from Central India', false],
        ['LRS in West India', false],
      ], 'ZRS writes synchronously across three zones, so a zone failure loses nothing, and it stays in Central India. LRS sits in one datacentre, GRS adds a regional copy but its primary is still LRS within one datacentre, and moving region does not add zone resilience.'),
      mcq('The NSG test must prove that the web tier cannot open connections to PostgreSQL on 5432. With only the default rules on the data subnet, what does the test show?', [
        ['Allowed by AllowVnetInBound, so a custom deny above 65000 is needed', true],
        ['Denied by DenyAllInBound, because data subnets block 5432 by default', false],
        ['Denied, because private endpoints accept traffic only from App Service', false],
        ['Allowed only if the web tier has a public IP address assigned to it', false],
      ], 'Default rules allow everything within the VirtualNetwork tag at 65000, so the web tier reaches the database unless you add a deny with a lower number (or rely on database authentication alone). DenyAllInBound comes after it, private endpoints do not filter callers by service, and public IPs are irrelevant inside the VNet.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_AZURE_CHECKPOINT',
    notes: `Ten questions across the topic: the Azure hierarchy, Entra ID and RBAC, networking, compute, storage and
databases, AKS, monitoring and Terraform, and cost and governance. Answer without notes; the result shows which
lesson to revisit.`,
    checkpoint: [
      mcq('PeopleNest keeps its test environments in one resource group per feature branch. Why does that make teardown reliable?', [
        ['Deleting the group deletes everything in it as a unit', true],
        ['Resource groups stop billing when nobody has logged in', false],
        ['Azure deletes resource groups that have no tags each night', false],
        ['Groups are capped in cost by the subscription\'s quota', false],
      ], 'A resource group is a lifecycle container: az group delete removes every resource in it, wherever it runs. Groups do not stop billing on inactivity, Azure does not delete untagged groups, and quotas limit resource counts, not cost.'),
      mcq('A managed identity has Storage Blob Data Reader on the payslips container. The team also wants it to read secrets in kv-hr-prod. What is the least-privilege grant?', [
        ['Key Vault Secrets User on kv-hr-prod for that identity', true],
        ['Contributor on the resource group that holds the vault', false],
        ['Owner on kv-hr-prod, so it can manage its own access', false],
        ['Key Vault Administrator on the subscription it is in', false],
      ], 'Key Vault Secrets User is a data-plane role that reads secret values, scoped to the one vault. Contributor manages the vault rather than reading secrets in RBAC mode, Owner can grant access, and an administrator role across the subscription is far wider than needed.'),
      ck('CLOUD_NETWORKING', 'nsg-data has: 100 Allow asg-api to asg-db on 5432; 150 Deny VirtualNetwork to any on any. A peered hub VM tries 5432 on the database. What is the result?', [
        ['Denied by 150, since the hub is in VirtualNetwork and not in asg-api', true],
        ['Allowed by 100, since peered VMs are added to every ASG automatically', false],
        ['Allowed by AllowVnetInBound at 65000, which outranks custom rules', false],
        ['Denied by DenyAllInBound at 65500, as peered traffic counts as Internet', false],
      ], 'The hub VM is not in asg-api, so rule 100 does not match; the VirtualNetwork tag includes peered VNets, so 150 matches and denies. ASGs contain only the NICs you add, defaults at 65000 come after custom rules, and peered traffic is VirtualNetwork, not Internet.'),
      ck('CLOUD_NETWORKING', 'Why does a private endpoint for a storage account need a privatelink private DNS zone linked to the VNet?', [
        ['So the account\'s usual name resolves to the endpoint\'s private IP', true],
        ['So the storage account can create blobs inside the VNet\'s address space', false],
        ['So the NSG can read the endpoint\'s rules from the DNS zone\'s records', false],
        ['So traffic to the account is encrypted, which DNS zones are needed for', false],
      ], 'Clients keep using sthrpayslips.blob.core.windows.net; the linked privatelink zone makes that name resolve to the private IP. Blobs are not stored in the VNet, NSGs do not read DNS, and TLS works with or without the zone.'),
      ck('CLOUD_NETWORKING', 'An AWS engineer plans "one subnet per zone" for a zone-redundant scale set in an Azure VNet. What should they know?', [
        ['Azure subnets are regional, so one subnet can serve all three zones', true],
        ['Azure subnets are zonal, exactly like AWS, so three subnets are needed', false],
        ['Scale sets cannot use zones unless each zone has its own VNet as well', false],
        ['Each zone needs its own NSG, attached to the zone instead of the subnet', false],
      ], 'Azure subnets span the region\'s zones, so zone spread is set on the resources, not by subnet. Separate VNets per zone are unnecessary, and NSGs attach to subnets or NICs, never to zones.'),
      ck('CLOUD_COMPUTE', 'Which App Service feature lets PeopleNest deploy v42, warm it up and roll back by swapping again?', [
        ['Deployment slots', true],
        ['Scale-up to Premium', false],
        ['VNet integration', false],
        ['Always On setting', false],
      ], 'Slots are live copies with their own host names; a swap promotes the warmed staging slot and leaves the previous version ready to swap back. Scaling up changes the tier, VNet integration handles outbound networking, and Always On keeps an app loaded.'),
      ck('CLOUD_COMPUTE', 'A nightly job deallocates dev VMs instead of shutting them down from the OS. What does deallocation change on the bill?', [
        ['Compute stops being billed; disks are still billed', true],
        ['Nothing, since a stopped VM costs the same either way', false],
        ['Disks stop being billed; compute is still billed', false],
        ['Everything stops being billed, including the disks', false],
      ], 'Deallocation releases the hardware, so compute charges stop while managed disks (and static public IPs) continue. A VM stopped from the OS keeps billing compute, and disks always bill while they exist.'),
      ck('CLOUD_COMPUTE', 'Moving a Helm release from EKS to AKS, what replaces the eks.amazonaws.com/role-arn service account annotation?', [
        ['The azure.workload.identity/client-id annotation, plus the Pod label', true],
        ['An AcrPull role assignment on the kubelet identity of each node pool', false],
        ['A Kubernetes Secret holding the managed identity\'s client secret value', false],
        ['Nothing, since AKS Pods inherit the cluster identity\'s permissions', false],
      ], 'Workload identity uses the client-id annotation on the service account and the azure.workload.identity/use label on Pods, with a federated credential on the managed identity. AcrPull is for image pulls, managed identities have no client secret to store, and Pods should never ride on the cluster\'s identity.'),
      mcq('An alert must fire when the HR API\'s 5xx count passes 20 in five minutes. Which pair of Azure Monitor objects is needed?', [
        ['A metric alert rule and an action group to notify', true],
        ['A diagnostic setting and a Log Analytics workspace', false],
        ['A data collection rule and an activity log alert', false],
        ['An Application Insights resource and a workbook', false],
      ], 'A metric alert rule evaluates the Http5xx metric and notifies an action group. Diagnostic settings and workspaces collect logs, data collection rules configure agents, activity log alerts watch control-plane events, and workbooks only visualise.'),
      mcq('PeopleNest\'s policy "Allowed locations" lists centralindia and southindia at mg-peoplenest. An engineer creates a storage account in westeurope in a subscription below it. What happens?', [
        ['The create is denied because the location property fails the policy', true],
        ['The account is created and moved to centralindia by the policy engine', false],
        ['The account is created, since policies apply only to resource groups', false],
        ['The create succeeds and the engineer\'s RBAC roles are then removed', false],
      ], 'A Deny policy evaluates the request\'s properties, and a location outside the list is refused. Policy does not relocate resources, it applies to resources as well as groups, and it never changes anyone\'s role assignments.'),
    ],
  },
];
