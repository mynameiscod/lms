# Admissions CRM Revamp - Implementation Guidance

## Executive Summary

This document provides detailed implementation guidance for revamping the Lead Management System into a product-grade **Admissions CRM for CodeBegun**. The revamp builds upon the existing LMS + Lead Management infrastructure without breaking current functionality.

### Existing Foundation (Preserve & Enhance)
| Component | Status | Location |
|-----------|--------|----------|
| Lead Model | ✅ Exists | `server/src/models/Lead.ts` |
| LeadStage Model | ✅ Exists | `server/src/models/LeadStage.ts` |
| LeadFormConfig | ✅ Exists | `server/src/models/LeadFormConfig.ts` |
| FollowUpReminder | ✅ Exists | `server/src/models/FollowUpReminder.ts` |
| SeatReservation | ✅ Exists | `server/src/models/SeatReservation.ts` |
| AdCampaign | ✅ Exists | `server/src/models/AdCampaign.ts` |
| LeadStageHistory | ✅ Exists | `server/src/models/LeadStageHistory.ts` |
| WhatsApp Webhook | ✅ Exists | `server/src/controllers/whatsappWebhookController.ts` |
| Lead Priority/Score | ❌ Missing | Needs implementation |
| Qualification Questions | ❌ Missing | Needs implementation |
| Sales Content Panel | ❌ Missing | Needs implementation |
| AI Lead Summary | ❌ Missing | Needs implementation |

---

## 1. Dynamic Lead Form Builder

### 1.1 Current State
The system already has `LeadFormConfig` with:
- Field types: text, email, tel, number, date, select, textarea, checkbox
- Built-in fields: name, phone, email, source, courseInterest, stageId, assignedTo, nextFollowUp, notes
- Custom fields support
- Field ordering and required/enabled toggles

### 1.2 Enhancements Needed

#### 1.2.1 New Field Types
Add to `LeadFormConfig` field types:
```
multiselect, radio, file, url, location, whatsapp, datetime
```

#### 1.2.2 Field Visibility Configuration
Each field should have visibility settings for different contexts:

| Context | Description | Example |
|---------|-------------|---------|
| `showInForm` | Show in create/edit form | ✓ Name, Phone |
| `showInDetail` | Show in lead detail page | ✓ All fields |
| `showInTable` | Show as table column | ✓ Name, Stage, Follow-up |
| `showInKanban` | Show on Kanban card | ✓ Name, Priority |
| `showInTelecaller` | Show in telecaller console | ✓ Phone, Notes, Stage |
| `showInExport` | Include in CSV export | ✓ Most fields |

#### 1.2.3 Enhanced Field Schema
```typescript
interface ILeadFormField {
  fieldKey: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'date' | 'datetime' | 
        'select' | 'multiselect' | 'textarea' | 'checkbox' | 'radio' |
        'file' | 'url' | 'location' | 'whatsapp';
  required: boolean;
  enabled: boolean;
  isBuiltIn: boolean;
  options?: string[];
  placeholder?: string;
  order: number;
  
  // NEW: Visibility toggles
  visibility: {
    form: boolean;
    detail: boolean;
    table: boolean;
    kanban: boolean;
    telecaller: boolean;
    export: boolean;
  };
  
  // NEW: Field behavior
  editable: boolean;           // Can be edited after creation
  defaultValue?: any;          // Default when creating lead
  validation?: {
    pattern?: string;          // Regex pattern
    minLength?: number;
    maxLength?: number;
    min?: number;              // For numbers
    max?: number;
  };
  
  // NEW: Conditional visibility
  showWhen?: {
    fieldKey: string;          // Show only when another field...
    operator: 'equals' | 'contains' | 'notEmpty';
    value?: any;               // ...has this value
  };
  
  // NEW: Field grouping
  group?: string;              // e.g., 'contact', 'qualification', 'campaign'
}
```

#### 1.2.4 UI Behavior - Form Builder Page

**URL**: `/settings/lead-form`

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ Lead Form Configuration                        [Save Config]│
├─────────────────────────────────────────────────────────────┤
│  Field Groups: [Contact] [Qualification] [Campaign] [Custom]│
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ▲▼ Name*            [text]    ✓Form ✓Table ✓Detail     ││
│  │ ▲▼ Phone*           [tel]     ✓Form ✓Table ✓Detail     ││
│  │ ▲▼ Email            [email]   ✓Form ✓Table ✓Detail     ││
│  │ ▲▼ Course Interest  [multi]   ✓Form ✓Table ✓Detail     ││
│  │ ▲▼ Budget Range     [select]  ✓Form ☐Table ✓Detail     ││
│  │ + Add Custom Field                                      ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  Lead Sources: [website] [walkin] [referral] [+Add Source] │
└─────────────────────────────────────────────────────────────┘
```

**Add Field Modal**:
```
┌────────────────────────────────────┐
│ Add Custom Field                   │
├────────────────────────────────────┤
│ Label: [City                     ] │
│ Type:  [Select ▼                 ] │
│ Options: Hyderabad, Bangalore...   │
│ Group: [Contact ▼                ] │
│ ☐ Required  ☑ Editable            │
│                                    │
│ Visibility:                        │
│ ☑ Form  ☑ Table  ☑ Detail         │
│ ☐ Kanban  ☑ Telecaller  ☑ Export  │
│                                    │
│ Show only when:                    │
│ [Source ▼] [equals ▼] [Website ▼] │
│                                    │
│         [Cancel] [Add Field]       │
└────────────────────────────────────┘
```

**Role Behavior**:
| Role | Permissions |
|------|-------------|
| TENANT_ADMIN | Full access to form builder |
| SUPER_ADMIN | Full access |
| Others | No access to form builder |

---

## 2. Dynamic Lead Stage Builder

### 2.1 Current State
LeadStage has:
- name, color, order, isDefault, isActive

### 2.2 Enhanced Stage Schema
```typescript
interface ILeadStage {
  name: string;
  color: string;
  order: number;
  isDefault: boolean;
  isActive: boolean;
  tenantId: ObjectId;
  
  // NEW: Enhanced stage properties
  description?: string;
  category: 'new' | 'engaging' | 'qualified' | 'negotiation' | 
            'converted' | 'lost';
  
  // NEW: Stage movement rules
  allowedNextStages: ObjectId[];     // Which stages can move to
  allowedRoles: string[];            // Which roles can move leads here
  
  // NEW: Required actions before stage change
  requiredFields?: string[];         // Fields that must be filled
  requiresNote?: boolean;            // Must add note when moving
  requiresReason?: boolean;          // Must provide reason (for lost stages)
  
  // NEW: Automation triggers
  triggers?: {
    onEnter?: {
      sendWhatsApp?: boolean;
      sendEmail?: boolean;
      assignToRole?: string;
      setFollowUp?: number;          // Days to set follow-up
    };
    onExit?: {
      recordDuration?: boolean;
    };
  };
  
  // NEW: SLA configuration
  sla?: {
    maxDurationHours?: number;       // Alert if lead stays too long
    urgencyLevel?: 'low' | 'medium' | 'high';
  };
}
```

### 2.3 Recommended Stage Configuration

```
Category: NEW
├── New Lead              (#3B82F6 Blue)
├── Auto WhatsApp Sent    (#60A5FA Light Blue)
└── WhatsApp Replied      (#10B981 Green)

Category: ENGAGING  
├── Priority Evaluated    (#8B5CF6 Purple)
├── Assigned              (#F59E0B Amber)
├── First Call Pending    (#F97316 Orange)
├── First Call Attempted  (#FB923C Light Orange)
└── Connected             (#22C55E Green)

Category: QUALIFIED
├── Qualified             (#06B6D4 Cyan)
├── Follow-up Scheduled   (#14B8A6 Teal)
├── Online Meeting Set    (#0EA5E9 Sky)
├── Campus Visit Set      (#6366F1 Indigo)
└── Demo Completed        (#8B5CF6 Purple)

Category: NEGOTIATION
├── Payment Link Sent     (#EAB308 Yellow)
├── Seat Reserved         (#84CC16 Lime)
└── Demo Student          (#22C55E Green)

Category: CONVERTED
└── Enrolled Student      (#059669 Emerald)

Category: LOST
├── No Response           (#6B7280 Gray)
├── Not Interested        (#EF4444 Red)
├── Lost to Competitor    (#DC2626 Dark Red)
└── Wrong Number          (#9CA3AF Light Gray)
```

### 2.4 UI Behavior - Stage Builder Page

**URL**: `/settings/lead-stages`

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ Lead Stage Pipeline                            [Save Order] │
├─────────────────────────────────────────────────────────────┤
│ View: [Simple ▼] [Advanced]                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  NEW LEADS                                                  │
│  ┌────────┐   ┌────────────────┐   ┌───────────────┐       │
│  │  New   │ → │ Auto WhatsApp  │ → │ WA Replied    │       │
│  │ Lead   │   │    Sent        │   │               │       │
│  └────────┘   └────────────────┘   └───────────────┘       │
│       ↓                                   ↓                 │
│  ENGAGING                                                   │
│  ┌────────────┐   ┌──────────┐   ┌──────────────┐          │
│  │ Priority   │ → │ Assigned │ → │ First Call   │          │
│  │ Evaluated  │   │          │   │ Pending      │          │
│  └────────────┘   └──────────┘   └──────────────┘          │
│                         ↓                                   │
│  ... (visual pipeline continues)                            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Stage Details (click to edit):                              │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Name: [Qualified            ]  Color: [■ Cyan      ] │  │
│ │ Category: [QUALIFIED ▼]                               │  │
│ │ Description: [Lead has shown clear interest...]       │  │
│ │                                                       │  │
│ │ Movement Rules:                                       │  │
│ │ Allowed Next: ☑ Follow-up  ☑ Meeting  ☑ Lost         │  │
│ │ Allowed Roles: ☑ Admin  ☑ Staff  ☐ Telecaller        │  │
│ │                                                       │  │
│ │ Requirements:                                         │  │
│ │ ☑ Requires Note  ☐ Requires Reason                   │  │
│ │ Required Fields: [courseInterest, budget]             │  │
│ │                                                       │  │
│ │ SLA: Max [48] hours | Urgency: [Medium ▼]            │  │
│ └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2.5 Stage Change Validation Flow

```
User clicks "Move to Stage X"
        │
        ▼
┌─────────────────────────┐
│ Is user role in         │───No──→ Show "Permission Denied"
│ stage.allowedRoles?     │
└─────────────────────────┘
        │ Yes
        ▼
┌─────────────────────────┐
│ Is current stage in     │───No──→ Show "Cannot move from current stage"
│ targetStage.allowed     │
│ NextStages?             │
└─────────────────────────┘
        │ Yes
        ▼
┌─────────────────────────┐
│ Are all requiredFields  │───No──→ Show "Please fill: [field1, field2]"
│ filled?                 │
└─────────────────────────┘
        │ Yes
        ▼
┌─────────────────────────┐
│ Does stage require      │───Yes──→ Show Note Modal
│ note?                   │
└─────────────────────────┘
        │ No
        ▼
┌─────────────────────────┐
│ Is stage in LOST        │───Yes──→ Show Reason Modal
│ category?               │         (with structured reasons)
└─────────────────────────┘
        │ No
        ▼
    Execute Stage Change
    Record in LeadStageHistory
    Emit Real-time Event
```

---

## 3. Lead Priority and Eligibility Rules

### 3.1 New Data Model - LeadPriorityConfig

```typescript
interface ILeadPriorityConfig {
  tenantId: ObjectId;
  
  // Priority calculation rules
  rules: ILeadPriorityRule[];
  
  // Score thresholds
  thresholds: {
    hot: number;      // Score >= this = HOT
    warm: number;     // Score >= this = WARM
    cold: number;     // Below warm = COLD
  };
  
  // Eligibility rules
  eligibilityRules: IEligibilityRule[];
}

interface ILeadPriorityRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  
  // Condition
  condition: {
    field: string;        // 'source', 'whatsappReplied', 'city', etc.
    operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 
              'in' | 'notIn' | 'exists' | 'notExists';
    value: any;
  };
  
  // Score impact
  scoreImpact: number;    // Can be positive or negative
  
  // Priority override (optional)
  setPriority?: 'hot' | 'warm' | 'cold';
}

interface IEligibilityRule {
  id: string;
  name: string;
  condition: {
    field: string;
    operator: string;
    value: any;
  };
  result: 'eligible' | 'not_eligible' | 'needs_review';
  reason: string;
}
```

### 3.2 Lead Model Enhancement

Add to Lead model:
```typescript
// Priority & Scoring
priority: 'hot' | 'warm' | 'cold';
score: number;
eligibility: 'eligible' | 'not_eligible' | 'needs_review';
eligibilityReason?: string;

// Engagement tracking
whatsappStatus: 'not_sent' | 'sent' | 'delivered' | 'read' | 'replied';
whatsappRepliedAt?: Date;
firstResponseTime?: number;        // Minutes from lead creation to first reply

// Timing metrics
assignedAt?: Date;
firstActionAt?: Date;              // When telecaller first opened
firstCallAt?: Date;
lastContactedAt?: Date;
```

### 3.3 Default Priority Rules

```javascript
const DEFAULT_RULES = [
  // Engagement-based
  { name: 'WhatsApp Replied', field: 'whatsappStatus', operator: 'equals', value: 'replied', scoreImpact: +30 },
  { name: 'Quick Response', field: 'firstResponseTime', operator: 'lessThan', value: 30, scoreImpact: +20 },
  { name: 'No WhatsApp Reply (24h)', field: 'noReplyHours', operator: 'greaterThan', value: 24, scoreImpact: -15 },
  
  // Location-based
  { name: 'Local City', field: 'city', operator: 'in', value: ['Hyderabad', 'Secunderabad'], scoreImpact: +15 },
  { name: 'Remote Location', field: 'city', operator: 'notIn', value: ['Hyderabad', 'Secunderabad', 'Bangalore'], scoreImpact: -10 },
  
  // Interest-based
  { name: 'Classroom Interest', field: 'preferenceMode', operator: 'equals', value: 'offline', scoreImpact: +10 },
  { name: 'High Budget', field: 'budget', operator: 'in', value: ['50k-75k', '75k+'], scoreImpact: +15 },
  { name: 'Low Budget', field: 'budget', operator: 'equals', value: 'below_25k', scoreImpact: -10 },
  
  // Source-based
  { name: 'Walk-in Lead', field: 'source', operator: 'equals', value: 'walkin', scoreImpact: +25 },
  { name: 'Referral Lead', field: 'source', operator: 'equals', value: 'referral', scoreImpact: +20 },
  { name: 'Ad Lead', field: 'source', operator: 'in', value: ['google_ads', 'meta', 'instagram'], scoreImpact: +5 },
  
  // Urgency-based
  { name: 'Ready to Join', field: 'timeline', operator: 'equals', value: 'immediately', scoreImpact: +25 },
  { name: 'Exploring', field: 'timeline', operator: 'in', value: ['3_months', '6_months'], scoreImpact: -10 },
];

const THRESHOLDS = { hot: 60, warm: 30, cold: 0 };
```

### 3.4 UI Behavior - Priority Display

**In Lead Table/Kanban**:
```
┌─────────────────────────────────────────────────────────────┐
│ 🔥 John Doe          Score: 75    │ Qualified │ WhatsApp   │
│    WhatsApp Replied • Walk-in     │           │ ✓ Replied  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🌡️ Jane Smith        Score: 42    │ Follow-up │ Google Ads │
│    Called • Fee Concern           │           │            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ❄️ Bob Wilson        Score: 15    │ New Lead  │ Website    │
│    No Response 48h                │           │            │
└─────────────────────────────────────────────────────────────┘
```

**Priority Icons**:
- 🔥 **Hot** (Score ≥ 60): Red/Orange badge, at top of queue
- 🌡️ **Warm** (Score 30-59): Yellow badge, normal queue
- ❄️ **Cold** (Score < 30): Blue/Gray badge, lower queue

**In Lead Detail - Score Breakdown**:
```
┌─────────────────────────────────────────────────────────────┐
│ Lead Score: 75 🔥 HOT                                       │
├─────────────────────────────────────────────────────────────┤
│ Score Factors:                                              │
│ ✓ WhatsApp Replied           +30                            │
│ ✓ Walk-in Lead               +25                            │
│ ✓ Local City (Hyderabad)     +15                            │
│ ✓ High Budget                +15                            │
│ ✗ Not Classroom Interest     -10                            │
│ ───────────────────────────────────                         │
│ Total Score: 75                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.5 Priority Rules Admin Page

**URL**: `/settings/lead-priority`

```
┌─────────────────────────────────────────────────────────────┐
│ Lead Scoring Rules                               [Save]     │
├─────────────────────────────────────────────────────────────┤
│ Thresholds:                                                 │
│ Hot ≥ [60]    Warm ≥ [30]    Cold < 30                     │
├─────────────────────────────────────────────────────────────┤
│ Active Rules:                                               │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ ☑ WhatsApp Replied                          +30      │   │
│ │   When: whatsappStatus = replied                     │   │
│ ├──────────────────────────────────────────────────────┤   │
│ │ ☑ Walk-in Lead                              +25      │   │
│ │   When: source = walkin                              │   │
│ ├──────────────────────────────────────────────────────┤   │
│ │ ☐ Low Budget (disabled)                     -10      │   │
│ │   When: budget = below_25k                           │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                             │
│ [+ Add Custom Rule]                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Lead Source & Integration Tracking

### 4.1 Current State
Lead model already has:
- `source`: string
- `campaignId`: ObjectId (linked to AdCampaign)
- `utmParams`: { source, medium, campaign, content, term }

### 4.2 Enhanced Source Tracking

Add to Lead model:
```typescript
// Detailed source tracking
sourceDetails: {
  platform: 'meta' | 'google' | 'linkedin' | 'website' | 'manual' | 'whatsapp';
  campaignId?: ObjectId;
  campaignName?: string;
  adSetId?: string;
  adSetName?: string;
  adId?: string;
  adName?: string;
  formId?: string;           // For lead gen forms
  landingPage?: string;
  referrerUrl?: string;
};

// Cost tracking (admin-only visibility)
costData?: {
  costPerLead?: number;
  campaignSpend?: number;
  visible: boolean;          // Only show to admin roles
};
```

### 4.3 UI Behavior - Source Display

**For Telecaller** (limited view):
```
Source: Google Ads
Campaign: Java Course March 2026
```

**For Admin** (full view):
```
Source: Google Ads
Campaign: Java Course March 2026 (₹2,500 CPL)
Ad Set: Hyderabad IT Professionals
Ad: Video - Success Stories
Landing: /java-full-stack
Total Campaign Spend: ₹45,000 | 18 Leads
```

### 4.4 Source Capture Flows

**1. Manual Entry**:
- User selects source from dropdown
- Campaign optional

**2. CSV Import**:
- Map columns to source fields
- Auto-detect campaign names

**3. Meta/Facebook Lead Ads**:
- Webhook receives lead
- Extract: form_id, campaign_id, adset_id, ad_id
- Auto-link to existing AdCampaign or create new

**4. WhatsApp Click-to-Chat**:
- Extract UTM params from referrer
- Set source = 'whatsapp'
- Link to campaign if UTM matches

**5. Website Form**:
- Capture hidden UTM fields
- Set referrer URL and landing page

---

## 5. Auto WhatsApp Engagement

### 5.1 Current State
WhatsApp webhook controller exists with:
- Webhook verification
- Message handling
- Auto-qualification questions
- Conversation state management (in-memory)

### 5.2 Enhanced Auto-Engagement Flow

```
Lead Created (from Ad/Form)
        │
        ▼
┌─────────────────────────┐
│ Check: Source is        │───No──→ Mark for manual contact
│ WhatsApp/Meta?          │
└─────────────────────────┘
        │ Yes
        ▼
┌─────────────────────────┐
│ Send Welcome Message    │
│ + First Question        │
│ "Hi! Thanks for your    │
│ interest in CodeBegun.  │
│ What's your name?"      │
└─────────────────────────┘
        │
        ▼
    Wait for Reply
        │
   ┌────┴────┐
   │         │
Reply      No Reply (24h)
   │         │
   ▼         ▼
Mark as    Mark as
WARM/HOT   COLD
   │         │
   ▼         ▼
Continue   Lower priority
Questions  Flag for manual
```

### 5.3 Auto-Qualification Questions (Configurable)

```typescript
interface IAutoQualificationConfig {
  tenantId: ObjectId;
  enabled: boolean;
  
  welcomeMessage: string;
  
  questions: Array<{
    id: string;
    text: string;
    fieldToUpdate: string;       // Which lead field to update
    expectedType: 'text' | 'selection';
    options?: string[];           // For selection type
    order: number;
    required: boolean;
    skipKeywords?: string[];      // Words that skip this question
  }>;
  
  completionMessage: string;
  noResponseTimeout: number;      // Hours before marking cold
}
```

**Default Questions**:
1. "What's your name?" → `name`
2. "Which course are you interested in?" → `courseInterest`
3. "What's your graduation year?" → `graduationYear`
4. "Are you looking for online or classroom training?" → `preferenceMode`
5. "When are you planning to start?" → `timeline`

### 5.4 Lead Model - WhatsApp Tracking

```typescript
// WhatsApp engagement tracking
whatsappEngagement: {
  status: 'not_initiated' | 'initiated' | 'in_progress' | 'completed' | 'no_response';
  initiatedAt?: Date;
  lastMessageSentAt?: Date;
  lastReplyAt?: Date;
  questionsAsked: number;
  questionsAnswered: number;
  conversationSummary?: string;
};
```

### 5.5 UI Behavior - WhatsApp Status in Lead Cards

```
┌─────────────────────────────────────────────────┐
│ John Doe            🔥 Hot                      │
│ ┌─────────────────────────────────────────────┐│
│ │ 💬 WhatsApp: Replied                        ││
│ │ ✓ Name ✓ Course ✓ Graduation ○ Mode ○ Time ││
│ │ Last reply: 2 hours ago                     ││
│ └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

---

## 6. Lead Assignment & Distribution

### 6.1 Current State
- Manual assignment via `assignedTo` field
- Assignment visible in activity timeline
- Manager board shows per-employee distribution

### 6.2 Enhanced Assignment Tracking

Add to Lead model:
```typescript
// Assignment tracking
assignment: {
  assignedTo?: ObjectId;
  assignedBy?: ObjectId;
  assignedAt?: Date;
  previousAssignees?: Array<{
    userId: ObjectId;
    from: Date;
    to: Date;
    reason?: string;
  }>;
};

// Telecaller action tracking
telecallerMetrics: {
  firstViewedAt?: Date;          // When TC first opened lead
  firstActionAt?: Date;          // First note/call/update
  firstCallAt?: Date;
  totalCalls: number;
  totalActions: number;
  lastActionAt?: Date;
};
```

### 6.3 Assignment SLA Tracking

```typescript
// Calculate assignment SLA
const assignmentSLA = {
  leadToAssignment: lead.assignment.assignedAt - lead.createdAt,
  assignmentToFirstView: lead.telecallerMetrics.firstViewedAt - lead.assignment.assignedAt,
  assignmentToFirstCall: lead.telecallerMetrics.firstCallAt - lead.assignment.assignedAt,
};
```

### 6.4 UI Behavior - Manager Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ Lead Assignment Overview                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Awaiting Assignment: 12 leads                               │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ ⚠️ John (WhatsApp) - 2h unassigned   [Assign ▼]       │  │
│ │ ⚠️ Jane (Google Ads) - 1h unassigned  [Assign ▼]      │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ Team Performance:                                           │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Name          │ Assigned │ Actioned │ Avg Response    │  │
│ │ Priya         │ 45       │ 42       │ 15 min          │  │
│ │ Rahul         │ 38       │ 35       │ 25 min ⚠️       │  │
│ │ Amit          │ 52       │ 48       │ 12 min ✓        │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ Stale Leads (No action > 24h):                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Lead: Sanjay Rao │ Assigned: Rahul │ 36h no action    │  │
│ │ Lead: Meera Shah │ Assigned: Rahul │ 28h no action    │  │
│ └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 6.5 Future-Ready: Auto-Distribution Config

```typescript
interface ILeadDistributionConfig {
  tenantId: ObjectId;
  enabled: boolean;
  
  distributionMode: 'round_robin' | 'weighted' | 'skill_based' | 'manual';
  
  // Round robin settings
  roundRobinConfig?: {
    eligibleRoles: string[];
    maxLeadsPerDay?: number;
    excludeOnLeave: boolean;
  };
  
  // Weighted distribution
  weightedConfig?: {
    weights: Array<{
      userId: ObjectId;
      weight: number;          // Higher = more leads
    }>;
  };
  
  // Skill-based assignment
  skillBasedConfig?: {
    rules: Array<{
      condition: { field: string; value: any };
      assignToUser?: ObjectId;
      assignToRole?: string;
    }>;
  };
}
```

---

## 7. Telecaller Work Console

### 7.1 Design Philosophy
- **Focused**: Only essential information visible
- **Fast**: Quick actions without page navigation
- **Call-friendly**: Designed for use during phone calls
- **Mobile-responsive**: Works on tablets/phones

### 7.2 URL & Access
**URL**: `/telecaller/console` or `/leads?view=telecaller`
**Access**: Users with `view_leads`, `create_leads`, or `edit_leads` permissions

### 7.3 Console Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Telecaller Console                    [🔄 Refresh] [⚙️]    │
├─────────────────────────────────────────────────────────────┤
│ My Queue: 24 leads │ Due Today: 8 │ Overdue: 3 ⚠️          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ LEAD CARD (Current Focus)                               ││
│ │ ┌─────────────────────────────────────────────────────┐ ││
│ │ │ 🔥 Rajesh Kumar                    Priority: HOT    │ ││
│ │ │ 📞 +91 98765 43210  [Call] [WhatsApp]              │ ││
│ │ │ 📧 rajesh@email.com                                 │ ││
│ │ │                                                     │ ││
│ │ │ Stage: [Qualified ▼]    Source: Google Ads          │ ││
│ │ │ Interest: Java Full Stack, React                    │ ││
│ │ │ Follow-up: Today 3:00 PM ⚠️                        │ ││
│ │ │                                                     │ ││
│ │ │ Last Activity: Called - Connected (2h ago)          │ ││
│ │ │ "Interested, checking with parents for fee"         │ ││
│ │ └─────────────────────────────────────────────────────┘ ││
│ │                                                         ││
│ │ ┌─ Quick Actions ─────────────────────────────────────┐ ││
│ │ │ [📞 Log Call] [📝 Add Note] [📅 Set Follow-up]     │ ││
│ │ │ [📍 Schedule Visit] [💻 Schedule Meeting]          │ ││
│ │ │ [📎 Send Content] [💳 Payment Link]                │ ││
│ │ └─────────────────────────────────────────────────────┘ ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ LEAD QUEUE (Scrollable List)                            ││
│ │ ┌─────────────────────────────────────────────────────┐ ││
│ │ │ 🔥 Priya Sharma     Due: Now!     [Select]         │ ││
│ │ │ 🌡️ Amit Patel       Due: 4:00 PM  [Select]         │ ││
│ │ │ 🌡️ Sneha Reddy      Due: 5:30 PM  [Select]         │ ││
│ │ │ ❄️ Ravi Kumar       New Lead      [Select]         │ ││
│ │ └─────────────────────────────────────────────────────┘ ││
│ └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 7.4 Call Logging Drawer

When "Log Call" is clicked:

```
┌─────────────────────────────────────────────┐
│ Log Call - Rajesh Kumar           [✕ Close]│
├─────────────────────────────────────────────┤
│                                             │
│ Call Outcome:                               │
│ ┌─────────────────────────────────────────┐│
│ │ ○ Connected                             ││
│ │ ○ Not Answered                          ││
│ │ ○ Busy                                  ││
│ │ ○ Wrong Number                          ││
│ │ ○ Switched Off                          ││
│ │ ○ Rejected                              ││
│ └─────────────────────────────────────────┘│
│                                             │
│ If Connected, what happened?               │
│ ┌─────────────────────────────────────────┐│
│ │ ○ Interested - Schedule Follow-up       ││
│ │ ○ Interested - Schedule Demo            ││
│ │ ○ Interested - Schedule Visit           ││
│ │ ○ Interested - Payment Discussion       ││
│ │ ○ Need Time - Will Call Back            ││
│ │ ○ Not Interested                        ││
│ └─────────────────────────────────────────┘│
│                                             │
│ Call Summary:                               │
│ ┌─────────────────────────────────────────┐│
│ │ Lead is interested in Java Full Stack.  ││
│ │ Concerned about placement guarantee.    ││
│ │ Will discuss with parents tonight.      ││
│ └─────────────────────────────────────────┘│
│                                             │
│ 🎤 Upload Call Recording [Choose File]     │
│                                             │
│ Set Next Follow-up:                         │
│ [Date: Mar 31, 2026] [Time: 10:00 AM ▼]    │
│                                             │
│           [Cancel] [Save & Next Lead]       │
└─────────────────────────────────────────────┘
```

### 7.5 Call Outcomes & Next Actions

| Call Outcome | Suggested Next Action |
|--------------|----------------------|
| Connected - Interested | Set follow-up, Update stage to "Qualified" |
| Connected - Schedule Demo | Open meeting scheduler |
| Connected - Schedule Visit | Open visit scheduler |
| Connected - Payment | Show payment link option |
| Not Answered | Set follow-up for retry |
| Busy | Set short follow-up (1-2 hours) |
| Wrong Number | Update phone, flag lead |
| Not Interested | Move to "Not Interested" stage, require reason |

### 7.6 Mobile Telecaller View

```
┌─────────────────────────────┐
│ ☰  Telecaller Console       │
├─────────────────────────────┤
│ Due: 3 │ Overdue: 1 ⚠️      │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ 🔥 Rajesh Kumar         │ │
│ │ +91 98765 43210         │ │
│ │ [📞] [💬] [📝]          │ │
│ │ Java • Due Now • Hot    │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ 🌡️ Priya Sharma         │ │
│ │ +91 87654 32109         │ │
│ │ [📞] [💬] [📝]          │ │
│ │ Python • 4:00 PM • Warm │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ ❄️ Amit Patel           │ │
│ │ +91 76543 21098         │ │
│ │ [📞] [💬] [📝]          │ │
│ │ React • New • Cold      │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

---

## 8. Configurable Qualification Questions

### 8.1 New Data Model - QualificationQuestions

```typescript
interface IQualificationQuestionConfig {
  tenantId: ObjectId;
  
  questions: Array<{
    id: string;
    question: string;
    category: 'personal' | 'education' | 'career' | 'financial' | 'timeline';
    answerType: 'text' | 'select' | 'multiselect' | 'number' | 'boolean';
    options?: string[];
    order: number;
    showInStages: ObjectId[];      // Only show in these stages
    required: boolean;
    fieldToUpdate?: string;         // Auto-update lead field if provided
    scoreImpact?: {                 // Impact on lead score
      answerValue: any;
      impact: number;
    }[];
  }>;
}
```

### 8.2 Default Questions

```javascript
const DEFAULT_QUALIFICATION_QUESTIONS = [
  {
    question: "What is your current employment status?",
    category: "career",
    answerType: "select",
    options: ["Employed", "Fresher", "Freelancer", "Student", "Unemployed"],
    showInStages: ["Qualified", "First Call Attempted"],
  },
  {
    question: "What is your graduation year?",
    category: "education",
    answerType: "number",
    fieldToUpdate: "graduationYear",
    showInStages: ["First Call Attempted", "Connected"],
  },
  {
    question: "Are you looking for online or classroom training?",
    category: "personal",
    answerType: "select",
    options: ["Online Only", "Classroom Only", "Both OK"],
    fieldToUpdate: "preferenceMode",
    scoreImpact: [
      { answerValue: "Classroom Only", impact: +15 },
      { answerValue: "Both OK", impact: +10 },
    ],
  },
  {
    question: "What is your budget range?",
    category: "financial",
    answerType: "select",
    options: ["Below 25k", "25k-50k", "50k-75k", "75k+", "Need EMI"],
    fieldToUpdate: "budget",
  },
  {
    question: "When are you planning to start?",
    category: "timeline",
    answerType: "select",
    options: ["Immediately", "Within 1 month", "1-3 months", "3-6 months", "Just exploring"],
    fieldToUpdate: "timeline",
    scoreImpact: [
      { answerValue: "Immediately", impact: +25 },
      { answerValue: "Within 1 month", impact: +15 },
      { answerValue: "Just exploring", impact: -10 },
    ],
  },
  {
    question: "Do you have a laptop for training?",
    category: "personal",
    answerType: "boolean",
  },
  {
    question: "What is your primary goal?",
    category: "career",
    answerType: "select",
    options: ["Job Switch", "First Job", "Skill Upgrade", "Freelancing", "Business"],
  },
];
```

### 8.3 UI - Qualification Panel in Lead Detail

```
┌─────────────────────────────────────────────────────────────┐
│ Qualification Checklist                      [Edit] [Save] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ✓ Employment Status: Employed                              │
│ ✓ Graduation Year: 2022                                    │
│ ✓ Training Mode: Classroom Only (+15 score)                │
│ ○ Budget Range: [Select ▼]                                 │
│ ○ Timeline: [Select ▼]                                     │
│ ○ Has Laptop: [Yes] [No]                                   │
│ ○ Primary Goal: [Select ▼]                                 │
│                                                             │
│ Progress: 3/7 questions answered                           │
│ [▓▓▓▓▓░░░░░░░░░] 43%                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.4 Lead Model - Qualification Storage

```typescript
// In Lead model
qualificationAnswers: Map<string, {
  questionId: string;
  answer: any;
  answeredBy: ObjectId;
  answeredAt: Date;
  skipped: boolean;
}>;

qualificationProgress: {
  total: number;
  answered: number;
  percentage: number;
};
```

---

## 9. Interest Capture

### 9.1 Lead Model Enhancement

```typescript
// Structured interest capture
interests: {
  courses: string[];              // Java, Python, React, etc.
  mode: 'online' | 'offline' | 'hybrid' | 'undecided';
  location: 'hyderabad' | 'bangalore' | 'remote' | 'other';
  placement: boolean;
  urgency: 'immediate' | 'soon' | 'exploring';
  affordability: 'ready' | 'needs_emi' | 'budget_concern' | 'unknown';
  demoInterest: boolean;
  campusVisitInterest: boolean;
  technologies: string[];         // Specific tech interests
};
```

### 9.2 UI - Interest Capture Widget

```
┌─────────────────────────────────────────────────────────────┐
│ Lead Interests                                    [Edit]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Courses:  [Java ✕] [React ✕] [+ Add]                       │
│                                                             │
│ Training Mode:                                              │
│ [●] Classroom   [○] Online   [○] Hybrid   [○] Undecided    │
│                                                             │
│ Location Preference:                                        │
│ [○] Hyderabad   [●] Remote   [○] Other                     │
│                                                             │
│ Additional Interests:                                       │
│ ☑ Placement Assistance                                     │
│ ☑ Demo Session                                             │
│ ☐ Campus Visit                                             │
│                                                             │
│ Urgency: [Exploring ▼]                                     │
│ Affordability: [Needs EMI ▼]                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Follow-up Reminder Management

### 10.1 Current State
FollowUpReminder model exists with:
- Types: call, whatsapp, email, one_on_one, demo, touch_base, payment_reminder
- Status: pending, completed, cancelled, rescheduled
- Meeting details support

### 10.2 Enhanced UI - Follow-up Calendar View

**URL**: `/follow-ups` or Integration in dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ Follow-up Calendar                   [Day] [Week] [Month]  │
├─────────────────────────────────────────────────────────────┤
│ March 2026                                                  │
│ ┌────┬────┬────┬────┬────┬────┬────┐                       │
│ │Mon │Tue │Wed │Thu │Fri │Sat │Sun │                       │
│ ├────┼────┼────┼────┼────┼────┼────┤                       │
│ │ 30 │ 31 │ 1  │ 2  │ 3  │ 4  │ 5  │                       │
│ │ ●8 │ ●5 │ ●12│    │    │    │    │                       │
│ └────┴────┴────┴────┴────┴────┴────┘                       │
│                                                             │
│ Today's Follow-ups (8)                                      │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ 10:00 📞 Call Rajesh Kumar        [Complete] [Skip]   │  │
│ │ 11:00 💬 WhatsApp Priya Sharma    [Complete] [Skip]   │  │
│ │ 14:00 📞 Call Amit Patel          [Complete] [Skip]   │  │
│ │ 15:00 🏢 Campus Visit - Sneha     [Complete] [Skip]   │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ Overdue (3) ⚠️                                              │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Yesterday 📞 Call Ravi - "Fee discussion"   [Action]  │  │
│ │ 2 days ago 💬 WhatsApp Meera          [Reschedule]    │  │
│ └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 10.3 Quick Follow-up Modal

```
┌─────────────────────────────────────────┐
│ Schedule Follow-up                [✕]  │
├─────────────────────────────────────────┤
│ Lead: Rajesh Kumar                      │
│                                         │
│ Type:                                   │
│ [●] 📞 Call                             │
│ [○] 💬 WhatsApp                         │
│ [○] 📧 Email                            │
│ [○] 💻 Online Meeting                   │
│ [○] 🏢 Campus Visit                     │
│ [○] 💳 Payment Reminder                 │
│                                         │
│ Quick Schedule:                         │
│ [Today] [Tomorrow] [Next Week]          │
│                                         │
│ Or pick date/time:                      │
│ Date: [Mar 31, 2026   ] Time: [10:00▼] │
│                                         │
│ Notes:                                  │
│ ┌─────────────────────────────────────┐│
│ │ Discuss fee structure and EMI       ││
│ └─────────────────────────────────────┘│
│                                         │
│           [Cancel] [Schedule]           │
└─────────────────────────────────────────┘
```

### 10.4 Follow-up Visibility by Role

| Role | What They See |
|------|---------------|
| Telecaller | Only their own follow-ups |
| Manager | Team's follow-ups + aggregated stats |
| Admin | All follow-ups + team performance |

---

## 11. Meeting & Campus Visit Scheduling

### 11.1 Meeting Types

| Type | Description | Required Info |
|------|-------------|---------------|
| Online Demo | Product/course demo | Link, Duration |
| 1-on-1 Trainer Call | Speak with instructor | Link, Trainer name |
| Campus Visit | Physical visit | Date, Time, Location |
| Payment Discussion | Finance call | Payment options |

### 11.2 Meeting Scheduler UI

```
┌─────────────────────────────────────────────────────────────┐
│ Schedule Meeting                                     [✕]   │
├─────────────────────────────────────────────────────────────┤
│ Lead: Rajesh Kumar                                          │
│                                                             │
│ Meeting Type: [Online Demo ▼]                               │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Date: [April 1, 2026        ]                           ││
│ │ Time: [11:00 AM ▼]                                      ││
│ │ Duration: [30 min ▼]                                    ││
│ │                                                         ││
│ │ Meeting Link: [Auto-generate ▼]                         ││
│ │ https://meet.codebegun.com/demo-abc123                  ││
│ │                                                         ││
│ │ Trainer/Host: [Select Staff ▼]                          ││
│ │                                                         ││
│ │ ☑ Send WhatsApp confirmation                            ││
│ │ ☑ Send Email invitation                                 ││
│ │ ☑ Add to calendar                                       ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│            [Cancel] [Schedule Meeting]                      │
└─────────────────────────────────────────────────────────────┘
```

### 11.3 Campus Visit Scheduler

```
┌─────────────────────────────────────────────────────────────┐
│ Schedule Campus Visit                                [✕]   │
├─────────────────────────────────────────────────────────────┤
│ Lead: Priya Sharma                                          │
│                                                             │
│ Visit Date: [April 2, 2026        ]                         │
│ Time Slot: [10:00 AM - 12:00 PM ▼]                         │
│                                                             │
│ Campus Location:                                            │
│ [CodeBegun Hyderabad ▼]                                    │
│ 📍 Madhapur, Hyderabad - 500081                            │
│ 📞 +91 40 2355 1234                                        │
│                                                             │
│ What they want to see:                                      │
│ ☑ Classroom Tour                                           │
│ ☑ Meet Trainers                                            │
│ ☑ Payment Discussion                                       │
│ ☐ Student Interaction                                      │
│                                                             │
│ Special Notes:                                              │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Bringing parents for discussion                         ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ☑ Send location & details via WhatsApp                     │
│                                                             │
│            [Cancel] [Schedule Visit]                        │
└─────────────────────────────────────────────────────────────┘
```

### 11.4 Meeting Status Tracking

| Status | Description | Actions |
|--------|-------------|---------|
| Scheduled | Meeting is set | Reschedule, Cancel |
| Confirmed | Lead confirmed | Send reminder |
| In Progress | Meeting ongoing | - |
| Completed | Meeting done | Add notes, Update stage |
| No Show | Lead didn't attend | Reschedule, Follow-up |
| Cancelled | Cancelled by either party | Reschedule |

---

## 12. Sales Content Sharing Panel

### 12.1 New Data Model - SalesContent

```typescript
interface ISalesContent {
  _id: ObjectId;
  tenantId: ObjectId;
  
  title: string;
  description?: string;
  category: 'curriculum' | 'fee' | 'placement' | 'campus' | 
            'testimonial' | 'brochure' | 'video' | 'other';
  
  contentType: 'pdf' | 'image' | 'video' | 'link';
  fileUrl?: string;
  externalUrl?: string;
  thumbnailUrl?: string;
  
  // Access control
  visibleToRoles: string[];
  allowSharing: boolean;
  
  // Usage tracking
  shareCount: number;
  lastSharedAt?: Date;
  
  // Metadata
  tags: string[];
  order: number;
  isActive: boolean;
  
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

### 12.2 Content Categories

| Category | Examples |
|----------|----------|
| Curriculum | Course syllabus PDFs |
| Fee | Fee structure, EMI options |
| Placement | Placed students list, testimonials |
| Campus | Campus photos, classroom images |
| Testimonial | Video testimonials, reviews |
| Brochure | Marketing brochures |
| Video | Course intro videos |
| Other | Maps, directions, etc. |

### 12.3 UI - Content Library Panel

```
┌─────────────────────────────────────────────────────────────┐
│ Sales Content Library                    [Upload New] [⚙️] │
├─────────────────────────────────────────────────────────────┤
│ Categories: [All] [Curriculum] [Fee] [Placement] [Campus]  │
│ Search: [🔍 Search content...                             ]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Curriculum                                                  │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                       │
│ │ 📄 Java │ │ 📄 React│ │ 📄 Full │                       │
│ │ Course  │ │ Course  │ │ Stack   │                       │
│ │ PDF     │ │ PDF     │ │ PDF     │                       │
│ │ [Send]  │ │ [Send]  │ │ [Send]  │                       │
│ └─────────┘ └─────────┘ └─────────┘                       │
│                                                             │
│ Placement Records                                           │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                       │
│ │ 📋 2025 │ │ 📋 Top  │ │ 🎥 Video│                       │
│ │ Placements│ │ Placers │ │ Testi- │                       │
│ │         │ │         │ │ monials │                       │
│ │ [Send]  │ │ [Send]  │ │ [Send]  │                       │
│ └─────────┘ └─────────┘ └─────────┘                       │
│                                                             │
│ Campus & Classroom                                          │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                       │
│ │ 🖼️ Campus│ │ 🖼️ Class-│ │ 📍 Loca-│                       │
│ │ Tour    │ │ room    │ │ tion Map│                       │
│ │         │ │         │ │         │                       │
│ │ [Send]  │ │ [Send]  │ │ [Send]  │                       │
│ └─────────┘ └─────────┘ └─────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

### 12.4 Send Content Modal

```
┌─────────────────────────────────────────────┐
│ Send Content to Lead                   [✕] │
├─────────────────────────────────────────────┤
│ Lead: Rajesh Kumar                          │
│ Content: Java Full Stack Curriculum.pdf     │
│                                             │
│ Send via:                                   │
│ [●] WhatsApp  [○] Email  [○] Both          │
│                                             │
│ Message:                                    │
│ ┌─────────────────────────────────────────┐│
│ │ Hi Rajesh!                              ││
│ │                                         ││
│ │ Here's the Java Full Stack curriculum  ││  
│ │ you requested. Let me know if you have ││
│ │ any questions!                          ││
│ │                                         ││
│ │ Best regards,                           ││
│ │ CodeBegun Team                          ││
│ └─────────────────────────────────────────┘│
│                                             │
│ ☑ Track when opened (requires link)        │
│                                             │
│           [Cancel] [Send Content]           │
└─────────────────────────────────────────────┘
```

### 12.5 Content Sharing in Timeline

```
┌────────────────────────────────────────────┐
│ 📎 Content Shared                          │
│ Java Full Stack Curriculum.pdf             │
│ Sent via WhatsApp by Priya                 │
│ Mar 30, 2026 • 2:45 PM                     │
│ Status: Delivered ✓ • Opened ✓             │
└────────────────────────────────────────────┘
```

---

## 13. Payment Follow-up Workflow

### 13.1 Current State
SeatReservation model exists with:
- Payment tracking (amount, paid, balance)
- Payment installments
- Conversion to student

### 13.2 Payment Actions in Lead Detail

```
┌─────────────────────────────────────────────────────────────┐
│ Payment Actions                                             │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Course: Java Full Stack                                 ││
│ │ Total Fee: ₹65,000                                      ││
│ │                                                         ││
│ │ [🔗 Send Payment Link] [📝 Create Reservation]         ││
│ │                                                         ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ Payment Link History:                                       │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Mar 28 • ₹15,000 Registration Fee                       ││
│ │ Status: Sent → Viewed → ⏳ Pending                      ││
│ │ [Resend] [Follow-up]                                    ││
│ └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 13.3 Payment Link Modal

```
┌─────────────────────────────────────────────┐
│ Send Payment Link                      [✕] │
├─────────────────────────────────────────────┤
│ Lead: Rajesh Kumar                          │
│                                             │
│ Course: [Java Full Stack ▼]                │
│                                             │
│ Payment For:                                │
│ [●] Registration Fee (₹15,000)             │
│ [○] Full Fee (₹65,000)                     │
│ [○] Custom Amount                          │
│                                             │
│ Amount: [₹15,000             ]             │
│                                             │
│ Payment Options Available:                  │
│ ☑ UPI  ☑ Card  ☑ Net Banking              │
│                                             │
│ Message Template: [Registration ▼]         │
│ ┌─────────────────────────────────────────┐│
│ │ Dear Rajesh,                            ││
│ │                                         ││
│ │ Thank you for choosing CodeBegun!       ││
│ │ Please complete your registration by    ││
│ │ paying ₹15,000 using the link below.    ││
│ │                                         ││
│ │ [Payment Link]                          ││
│ └─────────────────────────────────────────┘│
│                                             │
│ Send via: ☑ WhatsApp ☑ Email               │
│                                             │
│         [Cancel] [Generate & Send]          │
└─────────────────────────────────────────────┘
```

### 13.4 Payment Status Pipeline

```
Payment Link Created
        │
        ▼
    Link Sent → Stage: "Payment Link Sent"
        │
        ▼
    Link Viewed
        │
   ┌────┴────┐
   │         │
Payment    Abandoned
Completed  │
   │       ▼
   │    Auto follow-up after 24h
   │
   ▼
Seat Reserved → Stage: "Seat Reserved"
   │
   ▼
(Optional) More Payments
   │
   ▼
Full Payment → Stage: "Demo Student" or "Enrolled"
```

---

## 14. Lead to Student Conversion

### 14.1 Conversion Flow

```
Lead (Payment Complete)
        │
        ▼
┌─────────────────────────┐
│ Convert to Student      │
│ - Create User account   │
│ - Set role: STUDENT     │
│ - Link to Batch         │
│ - Send Welcome Email    │
│ - Send Login Credentials│
└─────────────────────────┘
        │
        ▼
   Stage: "Enrolled Student"
        │
        ▼
   Lead marked converted
   (convertedStudentId set)
```

### 14.2 Convert Modal (Enhanced)

```
┌─────────────────────────────────────────────────────────────┐
│ Convert Lead to Student                                [✕] │
├─────────────────────────────────────────────────────────────┤
│ Lead: Rajesh Kumar                                          │
│ Email: rajesh@email.com                                     │
│ Payment Status: ✅ Paid ₹65,000                             │
│                                                             │
│ Student Account Setup:                                      │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Default Password: [Welcome@123          ] [Generate]   ││
│ │                                                         ││
│ │ Assign to Batch:                                        ││
│ │ [Java Full Stack - April 2026 ▼]                       ││
│ │                                                         ││
│ │ Student Type:                                           ││
│ │ [●] Regular Student                                     ││
│ │ [○] Demo Student (limited access)                       ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ Notifications:                                              │
│ ☑ Send Welcome Email with credentials                      │
│ ☑ Send WhatsApp Welcome Message                            │
│ ☑ Send Onboarding Instructions                             │
│                                                             │
│ Preview Welcome Email:                                      │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Subject: Welcome to CodeBegun, Rajesh! 🎉               ││
│ │                                                         ││
│ │ Dear Rajesh,                                            ││
│ │                                                         ││
│ │ Congratulations on joining CodeBegun!                   ││
│ │                                                         ││
│ │ Your learning portal credentials:                       ││
│ │ Email: rajesh@email.com                                 ││
│ │ Password: Welcome@123                                   ││
│ │                                                         ││
│ │ Login at: https://learn.codebegun.com                   ││
│ │                                                         ││
│ │ Your batch starts: April 5, 2026                        ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│              [Cancel] [Convert to Student]                  │
└─────────────────────────────────────────────────────────────┘
```

### 14.3 Post-Conversion

- Lead record remains (for historical tracking)
- `convertedStudentId` links to User record
- Stage changed to "Enrolled Student"
- Lead is removed from active telecaller queues
- Student appears in LMS Batch roster

---

## 15. Table View & Kanban View

### 15.1 Table View Enhancements

**Configurable Columns**:
```
┌─────────────────────────────────────────────────────────────┐
│ [⚙️ Columns] [Export] [Import] [+ New Lead]                │
├────┬──────────┬────────────┬────────────┬────────┬─────────┤
│ ☐  │ Name ▼   │ Phone      │ Stage ▼    │ Priority│ Follow- │
│    │          │            │            │         │ up ▼    │
├────┼──────────┼────────────┼────────────┼─────────┼─────────┤
│ ☐  │ 🔥Rajesh │ 9876543210 │ ●Qualified │ 75 Hot  │ Today ⚠️│
│ ☐  │ 🌡️Priya  │ 8765432109 │ ●Follow-up │ 42 Warm │ Tomorrow│
│ ☐  │ ❄️Amit   │ 7654321098 │ ●New Lead  │ 18 Cold │ -       │
└────┴──────────┴────────────┴────────────┴─────────┴─────────┘
```

**Column Configuration Modal**:
```
┌─────────────────────────────────────────┐
│ Configure Table Columns          [✕]   │
├─────────────────────────────────────────┤
│ Drag to reorder. Toggle to show/hide.  │
│                                         │
│ ☑ Name                    [≡]          │
│ ☑ Phone                   [≡]          │
│ ☑ Stage                   [≡]          │
│ ☑ Priority                [≡]          │
│ ☑ Follow-up Date          [≡]          │
│ ☐ Email                   [≡]          │
│ ☑ Source                  [≡]          │
│ ☐ Assigned To             [≡]          │
│ ☑ Course Interest         [≡]          │
│ ☐ Created Date            [≡]          │
│ ☐ Last Activity           [≡]          │
│                                         │
│         [Reset Default] [Apply]         │
└─────────────────────────────────────────┘
```

### 15.2 Kanban View Enhancements

```
┌─────────────────────────────────────────────────────────────┐
│ [Table] [Kanban]       Filters: [Stage ▼] [Priority ▼]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │ New Lead │ │ Qualified│ │ Follow-up│ │ Demo Set │        │
│ │ (12)     │ │ (8)      │ │ (15)     │ │ (5)      │        │
│ ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤        │
│ │┌────────┐│ │┌────────┐│ │┌────────┐│ │┌────────┐│        │
│ ││🔥Rajesh││ ││🌡️Priya ││ ││🔥Sneha ││ ││🔥Meera ││        │
│ ││Java    ││ ││React   ││ ││Python  ││ ││Java    ││        │
│ ││Today ⚠️││ ││Tmrw    ││ ││+2 days ││ ││Apr 1   ││        │
│ │└────────┘│ │└────────┘│ │└────────┘│ │└────────┘│        │
│ │┌────────┐│ │┌────────┐│ │┌────────┐│ │┌────────┐│        │
│ ││❄️Amit  ││ ││🌡️Kiran ││ ││🌡️Rohit ││ ││🌡️Anita ││        │
│ ││Full St.││ ││Java    ││ ││React   ││ ││Python  ││        │
│ ││New     ││ ││Mar 31  ││ ││Apr 2   ││ ││Apr 3   ││        │
│ │└────────┘│ │└────────┘│ │└────────┘│ │└────────┘│        │
│ │  + 10   │ │   + 6    │ │  + 13   │ │   + 3    │        │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                             │
│              [← Scroll for more stages →]                   │
└─────────────────────────────────────────────────────────────┘
```

**Kanban Card Design**:
```
┌────────────────────────────┐
│ 🔥 Rajesh Kumar           │
│ ○ Java Full Stack         │
│ 📞 9876543210              │
├────────────────────────────┤
│ Score: 75 │ Google Ads     │
│ Follow-up: Today 3:00 PM ⚠️│
│ 👤 Priya                   │
└────────────────────────────┘
```

---

## 16. Lead Activity Timeline

### 16.1 Timeline UI

```
┌─────────────────────────────────────────────────────────────┐
│ Activity Timeline                                           │
│ Filter: [All ▼]  Show: [Last 30 days ▼]                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ TODAY                                                       │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 📞 3:45 PM • Call Completed                             ││
│ │ Connected - 8 min call                                  ││
│ │ "Interested, will discuss with parents tonight"        ││
│ │ 🎤 [Play Recording]                                     ││
│ │ By: Priya Sharma                                        ││
│ │                               ⏱️ +15 min from last     ││
│ └─────────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 📅 3:30 PM • Follow-up Scheduled                        ││
│ │ Call scheduled for Mar 31, 10:00 AM                     ││
│ │ By: Priya Sharma                                        ││
│ └─────────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 📎 3:15 PM • Content Shared                             ││
│ │ Java Full Stack Curriculum.pdf                          ││
│ │ via WhatsApp • Delivered ✓                              ││
│ │ By: Priya Sharma                                        ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ YESTERDAY                                                   │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 🔄 4:20 PM • Stage Changed                              ││
│ │ New Lead → Qualified                                    ││
│ │ By: Priya Sharma              ⏱️ 2h 15min in prev stage││
│ └─────────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 👤 2:05 PM • Lead Assigned                              ││
│ │ Assigned to Priya Sharma                                ││
│ │ By: Admin                     ⏱️ 45min from creation   ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ MAR 28, 2026                                               │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ ✨ 1:20 PM • Lead Created                               ││
│ │ Source: Google Ads                                      ││
│ │ Campaign: Java March 2026                               ││
│ │ By: System (Auto-import)                                ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 16.2 Key Time Metrics Display

```
┌─────────────────────────────────────────────────────────────┐
│ Lead Journey Metrics                                        │
├─────────────────────────────────────────────────────────────┤
│ Created → Assigned:        45 min  ✓ Good                  │
│ Assigned → First View:     12 min  ✓ Excellent             │
│ Assigned → First Call:     2h 15m  ⚠️ Could improve        │
│ First Call → Follow-up:    24h     ✓ Normal                │
│ Total Lead Age:            3 days                          │
│ Time in Current Stage:     6 hours                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 17. Telecaller Productivity Monitoring

### 17.1 Manager Dashboard Enhancements

```
┌─────────────────────────────────────────────────────────────┐
│ Team Performance Dashboard                    [Export] [⚙️]│
├─────────────────────────────────────────────────────────────┤
│ Period: [Today ▼]   Team: [All ▼]                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Quick Stats                                                 │
│ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐         │
│ │  45   │ │  128  │ │  23   │ │  8    │ │  5    │         │
│ │ Leads │ │ Calls │ │Qualify│ │Demoschl│ │Convert│         │
│ │Assigned│ │ Made │ │       │ │       │ │       │         │
│ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘         │
│                                                             │
│ Team Member Performance                                     │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Name    │Assigned│ Calls │ Avg    │ Qualified│ Overdue│  │
│ │         │        │       │Response│          │        │  │
│ ├─────────┼────────┼───────┼────────┼──────────┼────────┤  │
│ │ Priya   │ 15     │ 42    │ 12 min │ 8        │ 1      │  │
│ │ Rahul   │ 18     │ 35    │ 28 min │ 5        │ 4 ⚠️   │  │
│ │ Amit    │ 12     │ 51    │ 8 min  │ 10       │ 0 ✓    │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ Attention Required                                          │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ ⚠️ Rahul has 4 overdue follow-ups                      │  │
│ │ ⚠️ 8 leads unassigned for > 1 hour                     │  │
│ │ ⚠️ Priya: Lead "Sanjay" stale for 48h                  │  │
│ └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 17.2 Stale Lead Alerts

Lead is considered **stale** when:
- Assigned but no action for 24+ hours
- Follow-up overdue by 24+ hours
- In same stage for longer than SLA

```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Stale Leads (Need Attention)                    [Assign]│
├─────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Sanjay Rao • Assigned to: Rahul                       │  │
│ │ No action for: 48 hours                               │  │
│ │ Stage: Qualified (no movement)                        │  │
│ │ [View] [Reassign] [Send Reminder]                     │  │
│ └───────────────────────────────────────────────────────┘  │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Meera Shah • Assigned to: Rahul                       │  │
│ │ Follow-up overdue: 36 hours                           │  │
│ │ Last note: "Will call back tomorrow"                  │  │
│ │ [View] [Reassign] [Send Reminder]                     │  │
│ └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 18. Campaign Management

### 18.1 Current State
AdCampaign model exists with full metrics tracking.

### 18.2 Enhanced Campaign Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ Campaign Management                     [+ New Campaign]   │
├─────────────────────────────────────────────────────────────┤
│ Period: [This Month ▼]   Platform: [All ▼]   Status: [All]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Overview                                                    │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐│
│ │ ₹1,25,000  │ │    156     │ │   ₹801     │ │    12      ││
│ │ Total Spend│ │ Total Leads│ │ Avg. CPL   │ │ Conversions││
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘│
│                                                             │
│ Active Campaigns                                            │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Campaign          │Platform│ Leads │ CPL   │Conversions│  │
│ ├───────────────────┼────────┼───────┼───────┼───────────┤  │
│ │ Java March 2026   │ Google │ 45    │ ₹650  │ 4         │  │
│ │ React Hyderabad   │ Meta   │ 38    │ ₹720  │ 3         │  │
│ │ Python Freshers   │ Meta   │ 52    │ ₹450  │ 5 ⭐      │  │
│ │ Full Stack Generic│ Google │ 21    │ ₹1200 │ 0 ⚠️      │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ Campaign Performance Chart                                  │
│ [Bar chart showing leads/conversions by campaign]          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 18.3 Campaign Detail View (Admin Only)

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back   Java March 2026                        [Edit] [🗑️]│
├─────────────────────────────────────────────────────────────┤
│ Platform: Google Ads   Status: 🟢 Active                   │
│ Started: Mar 1, 2026   Budget: ₹50,000                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Metrics                                                     │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Spend: ₹32,500    │ Impressions: 125,000              │   │
│ │ Clicks: 2,340     │ CTR: 1.87%                        │   │
│ │ Leads: 45         │ CPL: ₹722                         │   │
│ │ Conversions: 4    │ Conv. Rate: 8.9%                  │   │
│ │ Revenue: ₹2,60,000│ ROAS: 8.0x ✓                      │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                             │
│ Lead Funnel                                                 │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Leads:     45  ████████████████████████████████████│   │
│ │ Qualified: 28  ██████████████████████░░░░░░░░░░░░░░│   │
│ │ Demo:      12  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░│   │
│ │ Converted: 4   ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│   │
│ └──────────────────────────────────────────────────────┘   │
│                                                             │
│ Leads from this Campaign                                    │
│ [Table showing all 45 leads with their current status]     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 19. AI Lead Analysis

### 19.1 Feature Design

```typescript
// AI Summary stored on lead
aiSummary?: {
  generatedAt: Date;
  summary: string;
  keyInsights: string[];
  suggestedNextAction: string;
  seriousnessScore: number;       // 1-10
  conversionProbability: string;  // 'high' | 'medium' | 'low'
  generatedBy: string;            // Model name
};
```

### 19.2 UI - AI Analyze Button

In Lead Detail:
```
┌─────────────────────────────────────────────────────────────┐
│ AI Analysis                                    [🔄 Refresh]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 🤖 Lead Summary                                         ││
│ │                                                         ││
│ │ Rajesh is a 2022 graduate currently working as a        ││
│ │ junior developer. He's interested in Java Full Stack    ││
│ │ to advance his career. Strong interest signals:         ││
│ │ - Replied to WhatsApp within minutes                    ││
│ │ - Asked detailed questions about placement              ││
│ │ - Comfortable with classroom training budget            ││
│ │                                                         ││
│ │ Concerns: Needs to discuss with parents (financial).    ││
│ │                                                         ││
│ │ ─────────────────────────                               ││
│ │ Seriousness: ████████░░ 8/10                           ││
│ │ Conversion Probability: HIGH                            ││
│ │                                                         ││
│ │ 💡 Suggested Next Action:                               ││
│ │ Schedule a call with parents present to discuss fee     ││
│ │ structure and EMI options. Share placement records.     ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ Last analyzed: 2 hours ago                                  │
└─────────────────────────────────────────────────────────────┘
```

### 19.3 AI Prompt Template

```
Analyze this lead and provide a summary:

Lead Name: {{name}}
Source: {{source}}
Course Interest: {{courseInterest}}
Current Stage: {{stage}}
Priority Score: {{score}}

Timeline:
- Created: {{createdAt}}
- WhatsApp Status: {{whatsappStatus}}
- First Reply Time: {{firstResponseTime}} minutes
- Total Calls: {{totalCalls}}
- Last Contact: {{lastContactedAt}}

Qualification Answers:
{{qualificationAnswers}}

Recent Activities:
{{last5Activities}}

Notes:
{{notes}}

Provide:
1. Brief summary (3-4 sentences)
2. Key insights (bullet points)
3. Seriousness score (1-10)
4. Conversion probability (high/medium/low)
5. Suggested next action
```

---

## 20. Analytics & Funnel Reporting

### 20.1 Funnel Analytics Page

**URL**: `/leads/analytics`

```
┌─────────────────────────────────────────────────────────────┐
│ Lead Analytics                      Period: [This Month ▼] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Conversion Funnel                                           │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ New Leads:      245  ██████████████████████████████│   │
│ │ Qualified:      156  █████████████████████░░░░░░░░░│   │
│ │ Demo Scheduled: 68   ████████░░░░░░░░░░░░░░░░░░░░░░│   │
│ │ Demo Completed: 52   ██████░░░░░░░░░░░░░░░░░░░░░░░░│   │
│ │ Payment Ready:  28   ███░░░░░░░░░░░░░░░░░░░░░░░░░░░│   │
│ │ Enrolled:       18   ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░│   │
│ │                                                         │
│ │ Overall Conversion: 7.3%                                │
│ └──────────────────────────────────────────────────────┘   │
│                                                             │
│ Source Performance                                          │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Source       │ Leads │ Qualified│Converted│ Conv. %   │  │
│ ├──────────────┼───────┼──────────┼─────────┼───────────┤  │
│ │ Walk-in      │ 25    │ 22       │ 8       │ 32% ⭐    │  │
│ │ Referral     │ 18    │ 15       │ 5       │ 28%       │  │
│ │ Google Ads   │ 85    │ 52       │ 3       │ 3.5%      │  │
│ │ Meta Ads     │ 95    │ 48       │ 2       │ 2.1%      │  │
│ │ WhatsApp     │ 22    │ 19       │ 0       │ 0%        │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ Stage Bottlenecks                                           │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ ⚠️ Qualified → Demo: 56% drop-off                      │  │
│ │ ⚠️ Payment Ready → Enrolled: 35% drop-off              │  │
│ │ ✓ Demo → Payment Ready: 46% conversion                 │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ Lost Reasons                                                │
│ [Pie chart: Fee Issue 35%, Competitor 25%, No Response 20%]│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 21. Lost Lead Handling

### 21.1 Lost Reason Configuration

```typescript
interface ILostReasonConfig {
  tenantId: ObjectId;
  reasons: Array<{
    id: string;
    label: string;
    category: 'financial' | 'competitor' | 'timing' | 'quality' | 'other';
    requiresDetail: boolean;
    order: number;
  }>;
}
```

**Default Lost Reasons**:
```javascript
const DEFAULT_LOST_REASONS = [
  // Financial
  { label: "Fee too high", category: "financial" },
  { label: "Needs EMI but not eligible", category: "financial" },
  { label: "Cannot afford at this time", category: "financial" },
  
  // Competitor
  { label: "Joined competitor", category: "competitor", requiresDetail: true },
  { label: "Found free alternative", category: "competitor" },
  
  // Timing
  { label: "Not ready now - will consider later", category: "timing" },
  { label: "Job conflict - no time", category: "timing" },
  { label: "Personal issues", category: "timing" },
  
  // Quality
  { label: "Not interested in offered courses", category: "quality" },
  { label: "Location not suitable", category: "quality" },
  { label: "Batch timing not suitable", category: "quality" },
  
  // Other
  { label: "Wrong number / not reachable", category: "other" },
  { label: "Duplicate lead", category: "other" },
  { label: "Other", category: "other", requiresDetail: true },
];
```

### 21.2 Lost Lead Modal

```
┌─────────────────────────────────────────────┐
│ Mark Lead as Lost                      [✕] │
├─────────────────────────────────────────────┤
│ Lead: Rajesh Kumar                          │
│                                             │
│ Select Reason:                              │
│                                             │
│ Financial:                                  │
│ [○] Fee too high                           │
│ [○] Needs EMI but not eligible             │
│ [○] Cannot afford at this time             │
│                                             │
│ Competitor:                                 │
│ [○] Joined competitor                      │
│ [○] Found free alternative                 │
│                                             │
│ Timing:                                     │
│ [●] Not ready now - will consider later    │
│                                             │
│ Additional Details (optional):              │
│ ┌─────────────────────────────────────────┐│
│ │ Said will reconsider in 3 months after  ││
│ │ current project ends.                   ││
│ └─────────────────────────────────────────┘│
│                                             │
│ ☑ Schedule re-engagement follow-up         │
│   After: [3 months ▼]                      │
│                                             │
│         [Cancel] [Mark as Lost]             │
└─────────────────────────────────────────────┘
```

---

## 22. Role-Based Access Summary

| Feature | SUPER_ADMIN | TENANT_ADMIN | MANAGER | STAFF/Telecaller | INSTRUCTOR |
|---------|-------------|--------------|---------|------------------|------------|
| Form Builder | ✓ | ✓ | ✗ | ✗ | ✗ |
| Stage Builder | ✓ | ✓ | ✗ | ✗ | ✗ |
| Priority Rules | ✓ | ✓ | ✗ | ✗ | ✗ |
| View All Leads | ✓ | ✓ | Team Only | Own Only | ✗ |
| Create Leads | ✓ | ✓ | ✓ | ✓ | ✗ |
| Edit Leads | ✓ | ✓ | ✓ | Own Only | ✗ |
| Delete Leads | ✓ | ✓ | ✗ | ✗ | ✗ |
| Assign Leads | ✓ | ✓ | ✓ | ✗ | ✗ |
| View Campaign Cost | ✓ | ✓ | ✗ | ✗ | ✗ |
| View Analytics | ✓ | ✓ | ✓ | Own Only | ✗ |
| Convert to Student | ✓ | ✓ | ✓ | ✗ | ✗ |
| Telecaller Console | ✓ | ✓ | ✓ | ✓ | ✗ |
| Content Library | ✓ | ✓ | ✓ | View & Send | ✗ |
| AI Analysis | ✓ | ✓ | ✓ | ✗ | ✗ |

---

## 23. Implementation Phases

### Phase 1: Core Enhancements (Week 1-2)
1. Enhance Lead model with priority, score, eligibility fields
2. Enhance LeadStage model with movement rules
3. Enhance LeadFormConfig with visibility settings
4. Update frontend forms to respect visibility

### Phase 2: Telecaller Console (Week 2-3)
1. Build dedicated telecaller console page
2. Implement call logging with outcomes
3. Implement quick actions (follow-up, notes, stage change)
4. Mobile-responsive design

### Phase 3: Priority & Scoring (Week 3-4)
1. Build LeadPriorityConfig model
2. Implement scoring calculation service
3. Build admin UI for rule configuration
4. Display priority in lead cards/tables

### Phase 4: Qualification & Interest (Week 4-5)
1. Build QualificationQuestionConfig model
2. Implement qualification panel in lead detail
3. Build interest capture UI
4. Integrate with scoring

### Phase 5: Content & Communication (Week 5-6)
1. Build SalesContent model
2. Build content library UI
3. Implement content sharing with tracking
4. Enhance WhatsApp integration

### Phase 6: Analytics & AI (Week 6-7)
1. Build enhanced analytics dashboard
2. Implement funnel visualization
3. Build AI summary feature
4. Add bottleneck analysis

### Phase 7: Polish & Testing (Week 7-8)
1. Mobile responsiveness
2. Performance optimization
3. User acceptance testing
4. Documentation

---

## 24. File Structure (New Files)

```
server/src/
├── models/
│   ├── LeadPriorityConfig.ts      (NEW)
│   ├── QualificationQuestionConfig.ts (NEW)
│   ├── SalesContent.ts             (NEW)
│   └── LostReasonConfig.ts         (NEW)
├── controllers/
│   ├── leadPriorityController.ts   (NEW)
│   ├── qualificationController.ts  (NEW)
│   ├── salesContentController.ts   (NEW)
│   └── leadAIController.ts         (NEW)
├── services/
│   ├── leadScoringService.ts       (NEW)
│   └── leadAIService.ts            (NEW)
└── routes/
    ├── leadPriorityRoutes.ts       (NEW)
    ├── qualificationRoutes.ts      (NEW)
    └── salesContentRoutes.ts       (NEW)

client/src/pages/
├── TelecallerConsole/             (NEW)
│   ├── index.tsx
│   └── TelecallerConsole.css
├── LeadPrioritySettings/          (NEW)
│   └── index.tsx
├── QualificationSettings/         (NEW)
│   └── index.tsx
├── SalesContentLibrary/           (NEW)
│   └── index.tsx
└── LeadAnalyticsDashboard/        (NEW)
    └── index.tsx
```

---

## Summary

This revamp transforms the existing Lead Management System into a comprehensive **Admissions CRM** while:

1. ✅ Preserving all existing functionality
2. ✅ Enhancing with new features modularly
3. ✅ Maintaining backward compatibility
4. ✅ Respecting role-based access
5. ✅ Supporting mobile-responsive design
6. ✅ Enabling future scalability

The implementation focuses on **product behavior, UI/UX, workflows, and validations** rather than API contracts, allowing developers to implement the backend as needed while maintaining consistent frontend expectations.
