/**
 * Role blueprints for the AI, Data, Security and Cloud roles.
 *
 * ── WHAT A GOOD BLUEPRINT LOOKS LIKE HERE ─────────────────────────────────────────────────
 *
 * The seven software roles that were written by hand carry 16 to 24 skills each. That is the
 * shape to match, and it is not arbitrary: readiness is measured against every requirement, so
 * a blueprint is a claim about what this role needs, and padding it lowers every student's score
 * without telling anyone why.
 *
 * GENERATIVE_AI_ENGINEER is live with 58 — the entire foundation catalogue including
 * TYPING_SPEED, SELF_INTRODUCTION and SPOKEN_ENGLISH_CONFIDENCE, and not one generative-AI
 * skill, because none existed. It reads exactly like somebody pressed select-all. AI_ENGINEER
 * has 17, all of them HTML, CSS, SQL and DSA. Both are corrected here.
 *
 * ── THE MIX ───────────────────────────────────────────────────────────────────────────────
 *
 * Each role keeps a spine of shared foundations — a data engineer who cannot write a loop is not
 * a data engineer — and then the skills that make it that role rather than a neighbouring one.
 * Roughly: five or six foundations, ten to fourteen specialist, weighted so the specialist
 * skills decide the score.
 *
 * ── LEVELS ────────────────────────────────────────────────────────────────────────────────
 *
 * Pitched for a first- or second-year aiming at their first job, not a practitioner. FOUNDATION
 * means "has met it and can talk about it", WORKING means "has built something small with it",
 * PROFICIENT is reserved for the few skills that genuinely define the role. ADVANCED is not used:
 * nothing in a pre-placement programme should require it, and requiring it guarantees the
 * low-teens readiness figure RoleSkillBlueprint's own comment warns about.
 */

import { SkillImportance, SkillTargetLevel } from '../models/RoleSkillBlueprint';

export interface SeedRequirement {
  skillKey: string;
  importance: SkillImportance;
  targetLevel: SkillTargetLevel;
}

export interface SeedBlueprint {
  roleKey: string;
  /** Written where a blueprint already exists and is wrong; explains the change in the log. */
  replacesReason?: string;
  requirements: SeedRequirement[];
}

const E = (skillKey: string, targetLevel: SkillTargetLevel = 'WORKING'): SeedRequirement =>
  ({ skillKey, importance: 'ESSENTIAL', targetLevel });
const I = (skillKey: string, targetLevel: SkillTargetLevel = 'WORKING'): SeedRequirement =>
  ({ skillKey, importance: 'IMPORTANT', targetLevel });
const S = (skillKey: string, targetLevel: SkillTargetLevel = 'FOUNDATION'): SeedRequirement =>
  ({ skillKey, importance: 'SUPPORTING', targetLevel });

/** The spine every one of these roles shares. Kept SUPPORTING so it never outweighs the craft. */
const CORE = [
  S('PROGRAMMING_FUNDAMENTALS'), S('PROBLEM_SOLVING'), S('GIT_FUNDAMENTALS'),
  S('DEBUGGING'), S('TECHNICAL_COMMUNICATION'),
];

const PY = [E('PYTHON_BASICS'), I('PYTHON_FUNCTIONS'), I('PYTHON_COLLECTIONS')];

export const NEW_BLUEPRINTS: SeedBlueprint[] = [
  {
    roleKey: 'AI_ENGINEER',
    replacesReason: '17 skills, all HTML/CSS/SQL/DSA — a generic software blueprint with no AI in it',
    requirements: [
      ...CORE, ...PY,
      E('ML_CONCEPTS'), E('LLM_FUNDAMENTALS'), E('PROMPT_ENGINEERING'),
      E('RAG_FUNDAMENTALS', 'PROFICIENT'), I('VECTOR_EMBEDDINGS'), I('VECTOR_DATABASES'),
      I('GENAI_APP_PATTERNS'), I('LLM_EVALUATION'), I('API_FUNDAMENTALS'),
      S('MODEL_DEPLOYMENT'), S('AI_RESPONSIBLE'), S('PROMPT_INJECTION'),
    ],
  },
  {
    roleKey: 'GENERATIVE_AI_ENGINEER',
    replacesReason: '58 skills — the whole foundation catalogue including TYPING_SPEED, and no GenAI skill at all',
    requirements: [
      ...CORE, ...PY,
      E('LLM_FUNDAMENTALS', 'PROFICIENT'), E('PROMPT_ENGINEERING', 'PROFICIENT'),
      E('VECTOR_EMBEDDINGS'), E('RAG_FUNDAMENTALS', 'PROFICIENT'), E('GENAI_APP_PATTERNS'),
      I('VECTOR_DATABASES'), I('LLM_EVALUATION'), I('LLM_FINE_TUNING', 'FOUNDATION'),
      I('AI_GUARDRAILS'), I('API_FUNDAMENTALS'),
      S('PROMPT_INJECTION'), S('AI_RESPONSIBLE'), S('DL_TRANSFORMERS'),
    ],
  },
  {
    roleKey: 'AGENTIC_AI_ENGINEER',
    requirements: [
      ...CORE, ...PY,
      E('LLM_FUNDAMENTALS'), E('PROMPT_ENGINEERING'), E('AGENT_FUNDAMENTALS', 'PROFICIENT'),
      E('TOOL_CALLING', 'PROFICIENT'), E('AGENT_ORCHESTRATION'),
      I('AGENT_MEMORY'), I('AGENT_EVALUATION'), I('RAG_FUNDAMENTALS'), I('API_FUNDAMENTALS'),
      I('AI_GUARDRAILS'), S('PROMPT_INJECTION'), S('GENAI_APP_PATTERNS'),
    ],
  },
  {
    roleKey: 'MACHINE_LEARNING_ENGINEER',
    requirements: [
      ...CORE, ...PY,
      E('ML_CONCEPTS', 'PROFICIENT'), E('ML_SUPERVISED', 'PROFICIENT'), E('ML_EVALUATION'),
      E('ML_FEATURE_ENGINEERING'), I('ML_UNSUPERVISED'), I('ML_OVERFITTING'),
      I('NEURAL_NETWORKS'), I('DL_TRAINING'), I('STATISTICS_BASICS'),
      I('DATA_WRANGLING'), S('MODEL_DEPLOYMENT'), S('EXPERIMENT_TRACKING'),
    ],
  },
  {
    roleKey: 'MLOPS_ENGINEER',
    requirements: [
      ...CORE, ...PY,
      E('MODEL_DEPLOYMENT', 'PROFICIENT'), E('ML_PIPELINES', 'PROFICIENT'),
      E('MODEL_VERSIONING'), E('CI_CD'), E('CONTAINERS_DOCKER'),
      I('MODEL_MONITORING'), I('EXPERIMENT_TRACKING'), I('INFRA_AS_CODE'),
      I('OBSERVABILITY'), I('ML_EVALUATION'), S('CLOUD_COMPUTE'), S('CONFIG_MANAGEMENT'),
    ],
  },
  {
    roleKey: 'AI_SECURITY_ENGINEER',
    requirements: [
      ...CORE, ...PY,
      E('SECURITY_FUNDAMENTALS'), E('PROMPT_INJECTION', 'PROFICIENT'),
      E('AI_GUARDRAILS', 'PROFICIENT'), E('LLM_SECURITY'), E('LLM_FUNDAMENTALS'),
      I('MODEL_RED_TEAMING'), I('THREAT_MODELLING'), I('AUTHENTICATION_AUTHZ'),
      I('OWASP_TOP_TEN'), I('RAG_FUNDAMENTALS'), S('AI_RESPONSIBLE'), S('TOOL_CALLING'),
    ],
  },
  {
    roleKey: 'DATA_SCIENTIST',
    requirements: [
      ...CORE, ...PY,
      E('STATISTICS_BASICS', 'PROFICIENT'), E('EXPLORATORY_ANALYSIS', 'PROFICIENT'),
      E('DATA_CLEANING'), E('ML_SUPERVISED'), E('ML_EVALUATION'),
      I('PROBABILITY_BASICS'), I('HYPOTHESIS_TESTING'), I('DATA_VISUALISATION'),
      I('DATA_WRANGLING'), I('SQL_AGGREGATION'), S('ML_FEATURE_ENGINEERING'), S('BUSINESS_METRICS'),
    ],
  },
  {
    roleKey: 'DATA_ANALYST',
    requirements: [
      ...CORE,
      E('SQL_BASICS', 'PROFICIENT'), E('SQL_AGGREGATION', 'PROFICIENT'), E('SQL_JOINS'),
      E('EXPLORATORY_ANALYSIS'), E('DATA_VISUALISATION'), E('BUSINESS_METRICS'),
      I('SQL_WINDOW_FUNCTIONS'), I('DASHBOARDING'), I('SPREADSHEET_ANALYSIS'),
      I('DATA_CLEANING'), I('STATISTICS_BASICS'), S('DATA_WRANGLING'), S('PYTHON_BASICS'),
    ],
  },
  {
    roleKey: 'DATA_ENGINEER',
    requirements: [
      ...CORE, ...PY,
      E('SQL_BASICS'), E('SQL_AGGREGATION'), E('DATA_MODELLING', 'PROFICIENT'),
      E('ETL_FUNDAMENTALS', 'PROFICIENT'), E('DATA_PIPELINES'),
      I('DATA_QUALITY'), I('DATA_WAREHOUSING'), I('BATCH_STREAM_PROCESSING'),
      I('DB_FUNDAMENTALS'), I('CONTAINERS_DOCKER'), S('CLOUD_STORAGE'), S('CI_CD'),
    ],
  },
  {
    roleKey: 'CYBERSECURITY_ANALYST',
    requirements: [
      ...CORE,
      E('SECURITY_FUNDAMENTALS', 'PROFICIENT'), E('OWASP_TOP_TEN', 'PROFICIENT'),
      E('AUTHENTICATION_AUTHZ'), E('NETWORK_SECURITY'), E('SIEM_MONITORING'),
      I('THREAT_MODELLING'), I('VULNERABILITY_MANAGEMENT'), I('INCIDENT_RESPONSE'),
      I('CRYPTOGRAPHY_BASICS'), I('LINUX_ADMIN'), I('COMPUTER_NETWORKS'),
      S('OPERATING_SYSTEMS'), S('IAM_FUNDAMENTALS'),
    ],
  },
  {
    roleKey: 'DEVOPS_ENGINEER',
    requirements: [
      ...CORE,
      E('LINUX_ADMIN', 'PROFICIENT'), E('CONTAINERS_DOCKER', 'PROFICIENT'), E('CI_CD', 'PROFICIENT'),
      E('INFRA_AS_CODE'), E('CLOUD_FUNDAMENTALS'),
      I('KUBERNETES'), I('CLOUD_COMPUTE'), I('CLOUD_NETWORKING'), I('CONFIG_MANAGEMENT'),
      I('OBSERVABILITY'), I('GIT_BRANCHING'), S('IAM_FUNDAMENTALS'), S('SECURITY_FUNDAMENTALS'),
    ],
  },
  {
    roleKey: 'SITE_RELIABILITY_ENGINEER',
    requirements: [
      ...CORE,
      E('LINUX_ADMIN', 'PROFICIENT'), E('OBSERVABILITY', 'PROFICIENT'),
      E('INCIDENT_MANAGEMENT'), E('RELIABILITY_PATTERNS'), E('SLI_SLO'),
      I('CAPACITY_PLANNING'), I('CONTAINERS_DOCKER'), I('KUBERNETES'),
      I('CLOUD_NETWORKING'), I('CI_CD'), I('SYSTEM_DESIGN_BASICS'),
      S('INFRA_AS_CODE'), S('COMPUTER_NETWORKS'),
    ],
  },
];
