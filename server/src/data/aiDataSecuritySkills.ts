/**
 * The skill universe for the AI, Data, Security and Cloud roles.
 *
 * ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────────────────────
 *
 * CareerPilot offers nineteen roles and the catalogue holds one domain: SOFTWARE_ENGINEERING,
 * 104 keys, all of them first-year software foundations. There is no skill for RAG, none for
 * MLOps, none for threat modelling, none for Kubernetes. Ten of the nineteen roles therefore
 * have no blueprint at all — there was nothing to build one from — and the two AI roles that do
 * have one are built from software skills, because those were the only skills there were.
 *
 * A role a student can pick and the product cannot measure is worse than a role that is not
 * offered: it is chosen, it produces a readiness figure from unrelated evidence, and the figure
 * is shown to them and to their college.
 *
 * ── HOW THESE ARE PITCHED ─────────────────────────────────────────────────────────────────
 *
 * At the level a first- or second-year can actually be assessed on, which is the population
 * CareerPilot serves. "RAG_FUNDAMENTALS — why retrieval is added to a prompt, and what goes
 * wrong without it" is answerable by a student who has built one small thing. "Design a
 * multi-tenant vector store" is not, and a blueprint full of that produces the low-teens
 * readiness score RoleSkillBlueprint's own comment warns about: it "reads as 'this product
 * thinks I am hopeless' rather than 'you are in your first year'".
 *
 * ── GROUPS AND PREREQUISITES ──────────────────────────────────────────────────────────────
 *
 * A GROUP organises and is never assessed; a SKILL is measured. Prerequisites point at what
 * must come first, including across into SOFTWARE_ENGINEERING — an LLM skill genuinely depends
 * on PYTHON_BASICS, and saying so lets the planner order a journey sensibly rather than
 * teaching retrieval to somebody who cannot write a loop.
 */

export interface SeedSkill {
  key: string;
  name: string;
  description: string;
  domainKey: string;
  nodeType: 'GROUP' | 'SKILL';
  parentKey?: string;
  difficulty: 'FOUNDATION' | 'INTERMEDIATE' | 'ADVANCED';
  prerequisiteKeys?: string[];
  assessable?: boolean;
  aliases?: string[];
}

export const AI_ML = 'AI_ML';
export const DATA = 'DATA';
export const SECURITY = 'SECURITY';
export const CLOUD_INFRA = 'CLOUD_INFRA';

export const NEW_DOMAINS = [
  { key: AI_ML, label: 'AI and Machine Learning' },
  { key: DATA, label: 'Data' },
  { key: SECURITY, label: 'Security' },
  { key: CLOUD_INFRA, label: 'Cloud and Infrastructure' },
];

const g = (key: string, name: string, domainKey: string, description: string): SeedSkill =>
  ({ key, name, description, domainKey, nodeType: 'GROUP', difficulty: 'FOUNDATION', assessable: false });

const s = (
  key: string, name: string, domainKey: string, parentKey: string,
  difficulty: SeedSkill['difficulty'], description: string, prerequisiteKeys: string[] = [],
): SeedSkill => ({ key, name, description, domainKey, nodeType: 'SKILL', parentKey, difficulty, prerequisiteKeys, assessable: true });

/* ── AI and Machine Learning ───────────────────────────────────────────────────────────── */

const AI_SKILLS: SeedSkill[] = [
  g('ML_FOUNDATIONS', 'Machine Learning Foundations', AI_ML, 'What learning from data means, and when it is the wrong tool.'),
  s('ML_CONCEPTS', 'ML Concepts', AI_ML, 'ML_FOUNDATIONS', 'FOUNDATION',
    'Training and inference, features and labels, and the difference between a rule you wrote and a pattern a model found.', ['PYTHON_BASICS']),
  s('ML_SUPERVISED', 'Supervised Learning', AI_ML, 'ML_FOUNDATIONS', 'FOUNDATION',
    'Classification and regression: what each predicts, and how to tell which problem you have.', ['ML_CONCEPTS']),
  s('ML_UNSUPERVISED', 'Unsupervised Learning', AI_ML, 'ML_FOUNDATIONS', 'INTERMEDIATE',
    'Clustering and dimensionality reduction, and why results need interpreting rather than scoring.', ['ML_CONCEPTS']),
  s('ML_EVALUATION', 'Model Evaluation', AI_ML, 'ML_FOUNDATIONS', 'INTERMEDIATE',
    'Train/test splits, accuracy against precision and recall, and why a 99% accurate model can be useless.', ['ML_SUPERVISED']),
  s('ML_FEATURE_ENGINEERING', 'Feature Engineering', AI_ML, 'ML_FOUNDATIONS', 'INTERMEDIATE',
    'Turning raw columns into inputs a model can use: encoding, scaling, and leakage.', ['ML_SUPERVISED']),
  s('ML_OVERFITTING', 'Overfitting and Generalisation', AI_ML, 'ML_FOUNDATIONS', 'INTERMEDIATE',
    'Why a model that is perfect on its training data has usually learnt the wrong thing.', ['ML_EVALUATION']),

  g('DEEP_LEARNING', 'Deep Learning', AI_ML, 'Neural networks, and what they buy over classical ML.'),
  s('NEURAL_NETWORKS', 'Neural Network Basics', AI_ML, 'DEEP_LEARNING', 'INTERMEDIATE',
    'Layers, weights and activation, described well enough to reason about a network rather than recite one.', ['ML_SUPERVISED']),
  s('DL_TRAINING', 'Training a Network', AI_ML, 'DEEP_LEARNING', 'INTERMEDIATE',
    'Loss, gradient descent, epochs and learning rate — what each one moves.', ['NEURAL_NETWORKS']),
  s('DL_TRANSFORMERS', 'Transformers and Attention', AI_ML, 'DEEP_LEARNING', 'ADVANCED',
    'Why attention replaced recurrence, and what a transformer is doing to a sequence.', ['DL_TRAINING']),

  g('GENERATIVE_AI', 'Generative AI', AI_ML, 'Building with large language models.'),
  s('LLM_FUNDAMENTALS', 'LLM Fundamentals', AI_ML, 'GENERATIVE_AI', 'FOUNDATION',
    'Tokens, context windows, temperature and why the same prompt can answer differently twice.', ['PYTHON_BASICS']),
  s('PROMPT_ENGINEERING', 'Prompt Engineering', AI_ML, 'GENERATIVE_AI', 'FOUNDATION',
    'Instruction, context and examples, and diagnosing a bad answer as a bad prompt.', ['LLM_FUNDAMENTALS']),
  s('VECTOR_EMBEDDINGS', 'Embeddings', AI_ML, 'GENERATIVE_AI', 'INTERMEDIATE',
    'Text as vectors, similarity, and why "close" is not "correct".', ['LLM_FUNDAMENTALS']),
  s('VECTOR_DATABASES', 'Vector Stores', AI_ML, 'GENERATIVE_AI', 'INTERMEDIATE',
    'Storing and querying embeddings, chunking, and what a bad chunk boundary costs.', ['VECTOR_EMBEDDINGS']),
  s('RAG_FUNDAMENTALS', 'Retrieval-Augmented Generation', AI_ML, 'GENERATIVE_AI', 'INTERMEDIATE',
    'Why retrieval is added to a prompt, what it fixes, and how it fails quietly.', ['VECTOR_DATABASES', 'PROMPT_ENGINEERING']),
  s('LLM_EVALUATION', 'Evaluating LLM Output', AI_ML, 'GENERATIVE_AI', 'INTERMEDIATE',
    'Judging generated text when there is no single right answer: rubrics, golden sets, regression.', ['PROMPT_ENGINEERING']),
  s('LLM_FINE_TUNING', 'Fine-tuning and Adaptation', AI_ML, 'GENERATIVE_AI', 'ADVANCED',
    'When fine-tuning beats prompting and retrieval, and when it is an expensive mistake.', ['RAG_FUNDAMENTALS']),
  s('GENAI_APP_PATTERNS', 'GenAI Application Patterns', AI_ML, 'GENERATIVE_AI', 'INTERMEDIATE',
    'Streaming, caching, cost control and graceful failure in a product built on a model.', ['RAG_FUNDAMENTALS', 'API_FUNDAMENTALS']),

  g('AI_AGENTS', 'AI Agents', AI_ML, 'Models that take actions, not just produce text.'),
  s('AGENT_FUNDAMENTALS', 'Agent Fundamentals', AI_ML, 'AI_AGENTS', 'INTERMEDIATE',
    'The loop — observe, decide, act — and why an agent needs a stopping condition.', ['PROMPT_ENGINEERING']),
  s('TOOL_CALLING', 'Tool Use and Function Calling', AI_ML, 'AI_AGENTS', 'INTERMEDIATE',
    'Describing a tool to a model, validating what comes back, and never trusting it blindly.', ['AGENT_FUNDAMENTALS', 'API_FUNDAMENTALS']),
  s('AGENT_MEMORY', 'Agent Memory and State', AI_ML, 'AI_AGENTS', 'INTERMEDIATE',
    'What to carry between steps, what to summarise and what to throw away.', ['AGENT_FUNDAMENTALS']),
  s('AGENT_ORCHESTRATION', 'Multi-step Orchestration', AI_ML, 'AI_AGENTS', 'ADVANCED',
    'Chaining, branching and retries across several model calls without losing the thread.', ['TOOL_CALLING', 'AGENT_MEMORY']),
  s('AGENT_EVALUATION', 'Evaluating Agents', AI_ML, 'AI_AGENTS', 'ADVANCED',
    'Judging a trajectory rather than an answer, and catching the run that succeeded by luck.', ['AGENT_ORCHESTRATION', 'LLM_EVALUATION']),

  g('MLOPS', 'MLOps', AI_ML, 'Getting a model into production and keeping it honest.'),
  s('MODEL_DEPLOYMENT', 'Model Deployment', AI_ML, 'MLOPS', 'INTERMEDIATE',
    'Serving a model behind an API, and what changes when it is no longer on your laptop.', ['ML_EVALUATION', 'API_FUNDAMENTALS']),
  s('EXPERIMENT_TRACKING', 'Experiment Tracking', AI_ML, 'MLOPS', 'FOUNDATION',
    'Recording what was run, on what data, with what result — so a number can be reproduced.', ['ML_EVALUATION']),
  s('MODEL_VERSIONING', 'Model and Data Versioning', AI_ML, 'MLOPS', 'INTERMEDIATE',
    'Why the code version alone does not identify a model, and what else has to be pinned.', ['EXPERIMENT_TRACKING', 'GIT_FUNDAMENTALS']),
  s('ML_PIPELINES', 'Training Pipelines', AI_ML, 'MLOPS', 'INTERMEDIATE',
    'Automating ingest, train and evaluate so a retrain is a command rather than a memory.', ['MODEL_VERSIONING']),
  s('MODEL_MONITORING', 'Monitoring and Drift', AI_ML, 'MLOPS', 'ADVANCED',
    'Watching a live model for the slow failure: the data moved and nothing threw an error.', ['MODEL_DEPLOYMENT']),

  g('AI_SAFETY', 'AI Safety and Security', AI_ML, 'The ways a model-backed system is attacked or misused.'),
  s('AI_RESPONSIBLE', 'Responsible AI', AI_ML, 'AI_SAFETY', 'FOUNDATION',
    'Bias, attribution, privacy and being able to say what a system should not be used for.', ['LLM_FUNDAMENTALS']),
  s('PROMPT_INJECTION', 'Prompt Injection', AI_ML, 'AI_SAFETY', 'INTERMEDIATE',
    'Why retrieved and user content is untrusted input, and what it can talk the model into.', ['RAG_FUNDAMENTALS']),
  s('AI_GUARDRAILS', 'Guardrails and Output Validation', AI_ML, 'AI_SAFETY', 'INTERMEDIATE',
    'Constraining what a model may return and checking it before anything acts on it.', ['PROMPT_INJECTION', 'TOOL_CALLING']),
  s('LLM_SECURITY', 'LLM Application Security', AI_ML, 'AI_SAFETY', 'ADVANCED',
    'Secrets, over-broad tool permissions and data leaving through a completion.', ['AI_GUARDRAILS']),
  s('MODEL_RED_TEAMING', 'Red Teaming a Model', AI_ML, 'AI_SAFETY', 'ADVANCED',
    'Attacking your own system on purpose, and writing down what got through.', ['LLM_SECURITY']),
];

/* ── Data ──────────────────────────────────────────────────────────────────────────────── */

const DATA_SKILLS: SeedSkill[] = [
  g('DATA_FOUNDATIONS', 'Data Foundations', DATA, 'Getting from a raw file to something trustworthy.'),
  s('DATA_WRANGLING', 'Data Wrangling', DATA, 'DATA_FOUNDATIONS', 'FOUNDATION',
    'Loading, reshaping and joining data without silently losing rows.', ['PYTHON_COLLECTIONS']),
  s('DATA_CLEANING', 'Data Cleaning', DATA, 'DATA_FOUNDATIONS', 'FOUNDATION',
    'Missing values, duplicates and outliers, and deciding rather than defaulting.', ['DATA_WRANGLING']),
  s('EXPLORATORY_ANALYSIS', 'Exploratory Analysis', DATA, 'DATA_FOUNDATIONS', 'FOUNDATION',
    'Asking a dataset what it contains before asking it a question.', ['DATA_CLEANING']),
  s('DATA_VISUALISATION', 'Data Visualisation', DATA, 'DATA_FOUNDATIONS', 'FOUNDATION',
    'Choosing a chart that answers the question, and not one that flatters it.', ['EXPLORATORY_ANALYSIS']),
  s('DATA_QUALITY', 'Data Quality', DATA, 'DATA_FOUNDATIONS', 'INTERMEDIATE',
    'Defining what "correct" means for a dataset and checking it automatically.', ['DATA_CLEANING']),

  g('STATISTICS', 'Statistics', DATA, 'The maths a data role is actually asked for.'),
  s('STATISTICS_BASICS', 'Descriptive Statistics', DATA, 'STATISTICS', 'FOUNDATION',
    'Mean, median, spread, and when an average hides the thing that matters.', []),
  s('PROBABILITY_BASICS', 'Probability Basics', DATA, 'STATISTICS', 'FOUNDATION',
    'Independence, conditional probability and reading a result without over-claiming.', ['STATISTICS_BASICS']),
  s('HYPOTHESIS_TESTING', 'Hypothesis Testing', DATA, 'STATISTICS', 'INTERMEDIATE',
    'What a p-value does and does not say, and what a test needs before it means anything.', ['PROBABILITY_BASICS']),

  g('ANALYTICS', 'Analytics and BI', DATA, 'Turning data into a decision somebody makes.'),
  s('SQL_AGGREGATION', 'SQL Aggregation', DATA, 'ANALYTICS', 'FOUNDATION',
    'GROUP BY, HAVING and the aggregate that quietly drops your NULLs.', ['SQL_BASICS']),
  s('SQL_WINDOW_FUNCTIONS', 'SQL Window Functions', DATA, 'ANALYTICS', 'INTERMEDIATE',
    'Ranking and running totals without collapsing the rows underneath them.', ['SQL_AGGREGATION', 'SQL_JOINS']),
  s('SPREADSHEET_ANALYSIS', 'Spreadsheet Analysis', DATA, 'ANALYTICS', 'FOUNDATION',
    'Pivot tables, lookups and the point at which a spreadsheet should become a query.', []),
  s('DASHBOARDING', 'Dashboards', DATA, 'ANALYTICS', 'INTERMEDIATE',
    'Building something a non-analyst can read without being walked through it.', ['DATA_VISUALISATION']),
  s('BUSINESS_METRICS', 'Business Metrics', DATA, 'ANALYTICS', 'INTERMEDIATE',
    'Defining a metric precisely enough that two people compute the same number.', ['EXPLORATORY_ANALYSIS']),

  g('DATA_ENGINEERING', 'Data Engineering', DATA, 'Moving and shaping data at volume.'),
  s('ETL_FUNDAMENTALS', 'ETL and ELT', DATA, 'DATA_ENGINEERING', 'INTERMEDIATE',
    'Extract, transform, load — and why the order of the last two is a real decision.', ['SQL_AGGREGATION']),
  s('DATA_PIPELINES', 'Data Pipelines', DATA, 'DATA_ENGINEERING', 'INTERMEDIATE',
    'Scheduling, dependencies and reruns, so yesterday can be fixed without breaking today.', ['ETL_FUNDAMENTALS']),
  s('DATA_MODELLING', 'Data Modelling', DATA, 'DATA_ENGINEERING', 'INTERMEDIATE',
    'Designing tables for the questions they will be asked, not the form that produced them.', ['DB_FUNDAMENTALS']),
  s('DATA_WAREHOUSING', 'Warehouses and Lakes', DATA, 'DATA_ENGINEERING', 'ADVANCED',
    'Where analytical data lives, and why it is not the production database.', ['DATA_MODELLING']),
  s('BATCH_STREAM_PROCESSING', 'Batch and Streaming', DATA, 'DATA_ENGINEERING', 'ADVANCED',
    'Choosing between them honestly, and what late-arriving data does to each.', ['DATA_PIPELINES']),
];

/* ── Security ──────────────────────────────────────────────────────────────────────────── */

const SECURITY_SKILLS: SeedSkill[] = [
  g('SECURITY_FOUNDATIONS', 'Security Foundations', SECURITY, 'How systems are attacked, and how they are defended.'),
  s('SECURITY_FUNDAMENTALS', 'Security Fundamentals', SECURITY, 'SECURITY_FOUNDATIONS', 'FOUNDATION',
    'Confidentiality, integrity and availability as a way of reasoning, not three words.', []),
  s('AUTHENTICATION_AUTHZ', 'Authentication and Authorisation', SECURITY, 'SECURITY_FOUNDATIONS', 'FOUNDATION',
    'Who you are against what you may do, sessions, tokens, and the difference that gets confused.', ['SECURITY_FUNDAMENTALS', 'HTTP']),
  s('OWASP_TOP_TEN', 'Common Web Vulnerabilities', SECURITY, 'SECURITY_FOUNDATIONS', 'INTERMEDIATE',
    'Injection, broken access control and XSS — what they look like in real code.', ['AUTHENTICATION_AUTHZ']),
  s('CRYPTOGRAPHY_BASICS', 'Applied Cryptography', SECURITY, 'SECURITY_FOUNDATIONS', 'INTERMEDIATE',
    'Hashing against encryption, salting, and why you do not write your own.', ['SECURITY_FUNDAMENTALS']),
  s('THREAT_MODELLING', 'Threat Modelling', SECURITY, 'SECURITY_FOUNDATIONS', 'INTERMEDIATE',
    'Asking what an attacker wants and where the trust boundaries are, before writing code.', ['OWASP_TOP_TEN']),
  s('NETWORK_SECURITY', 'Network Security', SECURITY, 'SECURITY_FOUNDATIONS', 'INTERMEDIATE',
    'TLS, firewalls, segmentation and what is still readable on the wire.', ['COMPUTER_NETWORKS']),

  g('SECURITY_OPERATIONS', 'Security Operations', SECURITY, 'Noticing an attack and responding to it.'),
  s('SIEM_MONITORING', 'Logging and Monitoring', SECURITY, 'SECURITY_OPERATIONS', 'INTERMEDIATE',
    'Collecting the evidence an incident will need, before the incident.', ['NETWORK_SECURITY']),
  s('VULNERABILITY_MANAGEMENT', 'Vulnerability Management', SECURITY, 'SECURITY_OPERATIONS', 'INTERMEDIATE',
    'Scanning, triage and patching, and prioritising by reachability rather than score.', ['OWASP_TOP_TEN']),
  s('INCIDENT_RESPONSE', 'Incident Response', SECURITY, 'SECURITY_OPERATIONS', 'ADVANCED',
    'Contain, investigate, recover, write it down — in that order and under pressure.', ['SIEM_MONITORING']),
];

/* ── Cloud and Infrastructure ──────────────────────────────────────────────────────────── */

const CLOUD_SKILLS: SeedSkill[] = [
  g('CLOUD_PLATFORM', 'Cloud Platform', CLOUD_INFRA, 'The building blocks every provider offers.'),
  s('CLOUD_FUNDAMENTALS', 'Cloud Fundamentals', CLOUD_INFRA, 'CLOUD_PLATFORM', 'FOUNDATION',
    'Regions, availability, managed against self-hosted, and what you pay for.', ['OPERATING_SYSTEMS']),
  s('CLOUD_COMPUTE', 'Compute Services', CLOUD_INFRA, 'CLOUD_PLATFORM', 'FOUNDATION',
    'Virtual machines, containers and serverless, and choosing between them for a reason.', ['CLOUD_FUNDAMENTALS']),
  s('CLOUD_STORAGE', 'Storage Services', CLOUD_INFRA, 'CLOUD_PLATFORM', 'FOUNDATION',
    'Object, block and database storage, durability, and what a lifecycle rule is for.', ['CLOUD_FUNDAMENTALS']),
  s('CLOUD_NETWORKING', 'Cloud Networking', CLOUD_INFRA, 'CLOUD_PLATFORM', 'INTERMEDIATE',
    'VPCs, subnets, load balancers and why the thing cannot reach the other thing.', ['COMPUTER_NETWORKS', 'CLOUD_FUNDAMENTALS']),
  s('IAM_FUNDAMENTALS', 'Identity and Access', CLOUD_INFRA, 'CLOUD_PLATFORM', 'INTERMEDIATE',
    'Roles, policies and least privilege, and why everything-allowed is how breaches start.', ['CLOUD_FUNDAMENTALS']),
  s('LINUX_ADMIN', 'Linux Administration', CLOUD_INFRA, 'CLOUD_PLATFORM', 'FOUNDATION',
    'Processes, permissions, services and logs on a machine with no desktop.', ['OPERATING_SYSTEMS']),

  g('DEVOPS_PRACTICE', 'DevOps Practice', CLOUD_INFRA, 'Shipping repeatedly without breaking things.'),
  s('CONTAINERS_DOCKER', 'Containers', CLOUD_INFRA, 'DEVOPS_PRACTICE', 'FOUNDATION',
    'Images against containers, layers, and why it works on your machine.', ['LINUX_ADMIN']),
  s('CI_CD', 'CI and CD', CLOUD_INFRA, 'DEVOPS_PRACTICE', 'INTERMEDIATE',
    'Building, testing and releasing on every change, and what a pipeline must refuse.', ['GIT_BRANCHING', 'TESTING_FUNDAMENTALS']),
  s('INFRA_AS_CODE', 'Infrastructure as Code', CLOUD_INFRA, 'DEVOPS_PRACTICE', 'INTERMEDIATE',
    'Describing infrastructure in a file so it can be reviewed, repeated and rolled back.', ['CLOUD_COMPUTE']),
  s('KUBERNETES', 'Kubernetes', CLOUD_INFRA, 'DEVOPS_PRACTICE', 'ADVANCED',
    'Pods, services and deployments, and what the scheduler is deciding for you.', ['CONTAINERS_DOCKER', 'CLOUD_NETWORKING']),
  s('CONFIG_MANAGEMENT', 'Configuration and Secrets', CLOUD_INFRA, 'DEVOPS_PRACTICE', 'INTERMEDIATE',
    'Per-environment configuration, and keeping secrets out of the repository.', ['INFRA_AS_CODE']),

  g('RELIABILITY', 'Reliability', CLOUD_INFRA, 'Keeping a live system up, and knowing when it is not.'),
  s('OBSERVABILITY', 'Observability', CLOUD_INFRA, 'RELIABILITY', 'INTERMEDIATE',
    'Logs, metrics and traces, and being able to answer a question you did not anticipate.', ['LINUX_ADMIN']),
  s('SLI_SLO', 'SLIs, SLOs and Error Budgets', CLOUD_INFRA, 'RELIABILITY', 'ADVANCED',
    'Deciding how reliable is reliable enough, in a number, before the argument.', ['OBSERVABILITY']),
  s('INCIDENT_MANAGEMENT', 'Incident Management', CLOUD_INFRA, 'RELIABILITY', 'ADVANCED',
    'Running an outage: roles, comms, and a blameless write-up that changes something.', ['OBSERVABILITY']),
  s('RELIABILITY_PATTERNS', 'Reliability Patterns', CLOUD_INFRA, 'RELIABILITY', 'ADVANCED',
    'Retries, timeouts, backoff and circuit breakers — and the retry storm they cause when wrong.', ['SYSTEM_DESIGN_BASICS']),
  s('CAPACITY_PLANNING', 'Capacity and Scaling', CLOUD_INFRA, 'RELIABILITY', 'ADVANCED',
    'Measuring headroom and scaling before the traffic rather than during it.', ['OBSERVABILITY', 'CLOUD_COMPUTE']),
];

export const NEW_SKILLS: SeedSkill[] = [...AI_SKILLS, ...DATA_SKILLS, ...SECURITY_SKILLS, ...CLOUD_SKILLS];
