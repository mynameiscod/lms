import { TopicSeed } from './year1MegaCurriculum';
import { u } from './year4UnitKit';
import { ending } from './trackUnitsWeb';
import { interview } from './trackUnitsPlacement';

/**
 * Career-track content for the AI tracks — AI Engineer, Generative AI Engineer, Agentic AI Engineer,
 * MLOps Engineer and AI Security Engineer. All five are Python and stand on content the platform
 * already has: Core Python and DSA in Python, Year 1's T_GENAI, the language-free JT_AI_CONCEPTS and
 * JT_AI_AGENTS, and Python Full Stack's JT_FASTAPI, JT_AI_PY and JT_AI_AGENTS_PY. Nothing those teach
 * is taught again here.
 *
 * Batch AI1 is the shared core: what an engineer (not a user) needs to know about how LLMs behave,
 * RAG built properly with a real vector database, evaluating and guarding an LLM feature, and running
 * one in production. Skills are the AI_ML domain of the role catalogue (aiDataSecuritySkills.ts).
 */
export const TRACK_AI_CORE: Record<string, TopicSeed> = {
  /* ── How LLMs work, for engineers ── */
  AI_LLM_INTERNALS: { category: 'UNIVERSAL', units: [
    u('TOKENIZATION', 'Tokenisation, and How It Leaks into Your Bugs', 'Subword tokens, why counting, spelling and Indian-language text behave oddly, and counting tokens before you send them.',
      ['Predict how text tokenises and explain the bugs and costs that follow from it'], 35),
    u('TRANSFORMER_INTUITION', 'Attention and the Transformer, as an Engineer Needs It', 'Embeddings in, attention across the context, next-token probabilities out — and what that explains about long prompts and lost middles.',
      ['Explain how a decoder-only transformer turns a prompt into the next token, and what that implies for prompt design'], 45, { after: ['TOKENIZATION'] }),
    u('TRAINING_STAGES', 'Pre-training, Instruction Tuning and Preference Tuning', 'Where a model\'s knowledge, its helpfulness and its refusals each come from, and why a knowledge cut-off exists.',
      ['Say which training stage explains a given model behaviour and what can and cannot change it'], 40, { after: ['TRANSFORMER_INTUITION'] }),
    u('DECODING', 'Decoding: Temperature, Top-p, Seeds and Determinism', 'Greedy versus sampled output, temperature and nucleus sampling, stop sequences, and why temperature 0 is still not perfectly repeatable.',
      ['Choose decoding settings for a task and explain the variation that remains'], 35, { after: ['TRAINING_STAGES'] }),
    u('MODEL_LANDSCAPE', 'Choosing a Model: Closed, Open-Weight, Small and Large', 'Hosted APIs versus open weights, model size against quality, latency and cost, licences, and reading a benchmark sceptically.',
      ['Pick a model for a feature on quality, cost, latency, privacy and licence, and justify it'], 40, { after: ['DECODING'] }),
    u('LOCAL_MODELS', 'Running an Open Model Locally', 'Ollama and Hugging Face transformers, quantisation and what it costs in quality, and an OpenAI-compatible local endpoint.',
      ['Run an open-weight model on your own machine and call it the same way as a hosted one'], 45, { after: ['MODEL_LANDSCAPE'] }),
    ...ending('LLM Internals', 'LOCAL_MODELS', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── RAG in depth, on a real vector database ── */
  AI_RAG_DEEP: { category: 'UNIVERSAL', units: [
    u('PARSING_CHUNKING', 'Parsing Documents and Chunking Them Well', 'PDFs, tables and HTML into clean text; fixed, recursive and structure-aware chunking; overlap; and keeping each chunk\'s source.',
      ['Parse real documents and choose a chunking strategy that keeps answers findable'], 45),
    u('EMBEDDING_MODELS', 'Choosing an Embedding Model', 'Dimensions, multilingual and domain models, normalisation and cosine similarity, and testing a model on your own queries.',
      ['Choose and test an embedding model against your own documents and questions'], 40, { after: ['PARSING_CHUNKING'] }),
    u('VECTOR_DATABASES', 'Vector Databases: pgvector, Chroma and Qdrant', 'Collections and payloads, exact versus approximate search, HNSW and IVF in outline, metadata filters, and updating or deleting documents.',
      ['Store, filter, update and search embeddings in a vector database and explain its index'], 50, { after: ['EMBEDDING_MODELS'] }),
    u('HYBRID_RERANK', 'Hybrid Search and Re-ranking', 'Keyword (BM25) and vector search together, reciprocal rank fusion, and a cross-encoder re-ranker on the top results.',
      ['Combine keyword and vector search and re-rank the results to improve what is retrieved'], 45, { after: ['VECTOR_DATABASES'] }),
    u('QUERY_TRANSFORM', 'Better Queries: Rewriting, Multi-Query and Routing', 'Turning a chat follow-up into a standalone question, several queries for one question, and routing a question to the right index.',
      ['Rewrite and route user questions so the right passages are retrieved'], 40, { after: ['HYBRID_RERANK'] }),
    u('RETRIEVAL_EVAL', 'Measuring Retrieval: Recall@k, MRR and a Golden Set', 'A labelled set of questions and the passages that answer them, recall@k and MRR, and comparing chunking or search changes with numbers.',
      ['Measure retrieval quality with a golden set and decide between two RAG designs on the numbers'], 45, { after: ['QUERY_TRANSFORM'] }),
    ...ending('RAG and Vector Databases', 'RETRIEVAL_EVAL', { project: ['MINI_PROJECT', 'Mini Project — RAG over a Company\'s Policy Documents',
      'Index a set of HR and travel policy PDFs in a vector database with hybrid search and re-ranking, answer with citations, and report recall@5 before and after each improvement.'] }),
  ] },

  /* ── Evaluating and guarding LLM applications ── */
  AI_EVAL_SAFETY: { category: 'UNIVERSAL', units: [
    u('EVAL_SETS', 'Building an Evaluation Set', 'Cases from real usage and edge cases, expected behaviour rather than expected wording, and keeping the set versioned.',
      ['Build a versioned evaluation set that covers how a feature is actually used and how it breaks'], 40),
    u('AUTO_EVAL', 'Automatic Evaluation: Checks, Metrics and LLM-as-Judge', 'Exact and schema checks, similarity metrics, a judge model with a rubric, and checking the judge against human labels.',
      ['Score an LLM feature automatically and show the scores agree with human judgement'], 45, { after: ['EVAL_SETS'] }),
    u('RAG_EVAL', 'Evaluating RAG: Faithfulness, Relevance and Context', 'Separating retrieval failures from generation failures, faithfulness and answer relevance, and frameworks such as Ragas.',
      ['Diagnose whether a bad RAG answer came from retrieval or generation, with metrics'], 40, { after: ['AUTO_EVAL'] }),
    u('REGRESSION_CI', 'Prompt and Model Changes as Tested Releases', 'Running the evaluation set in CI, thresholds that block a release, comparing two prompts or models, and shadow testing.',
      ['Gate a prompt or model change on an automated evaluation run'], 40, { after: ['RAG_EVAL'] }),
    u('PROMPT_INJECTION', 'Prompt Injection, Direct and Indirect', 'A user overriding instructions, instructions hidden in retrieved documents and web pages, why no prompt fully prevents it, and limiting the damage.',
      ['Show how direct and indirect prompt injection work against an application and limit what they can do'], 45, { after: ['REGRESSION_CI'] }),
    u('GUARDRAILS', 'Input and Output Guardrails', 'Validating input, moderation, PII detection and redaction, output schema and policy checks, and what to do when a check fails.',
      ['Put input and output guardrails around an LLM feature and handle each failure safely'], 40, { after: ['PROMPT_INJECTION'] }),
    u('RESPONSIBLE_AI', 'Responsible AI: Bias, Privacy and the Law', 'Bias in outputs and how to test for it, personal data and India\'s DPDP Act, transparency with users, and keeping a human in the loop.',
      ['Assess an AI feature for bias and privacy risk and design it to meet India\'s data-protection law'], 40, { after: ['GUARDRAILS'] }),
    ...ending('LLM Evaluation and Safety', 'RESPONSIBLE_AI', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── Running AI applications in production ── */
  AI_PRODUCTION: { category: 'UNIVERSAL', units: [
    u('APP_PATTERNS', 'GenAI Application Patterns', 'Chat assistants, extraction pipelines, copilots inside a product, and batch enrichment — and which architecture each needs.',
      ['Match a product need to a GenAI pattern and sketch the architecture it needs'], 40),
    u('ROUTING_CACHING', 'Model Routing, Caching and Fallbacks', 'A small model first and a large one when needed, exact and semantic caching, provider fallbacks, and the gateway that does it.',
      ['Route requests between models, cache answers safely and fall back when a provider fails'], 45, { after: ['APP_PATTERNS'] }),
    u('COST_LATENCY', 'Budgets for Cost, Latency and Rate Limits', 'Measuring cost per request, prompt trimming, streaming for perceived speed, concurrency limits, retries with backoff, and per-user quotas.',
      ['Keep an AI feature inside a cost and latency budget under real traffic'], 40, { after: ['ROUTING_CACHING'] }),
    u('TRACING', 'Tracing and Observability for LLM Apps', 'Tracing each call, retrieval and tool step, logging prompts without leaking personal data, dashboards, and alerting on quality as well as errors.',
      ['Trace an LLM request end to end and find where its time, cost or quality went'], 40, { after: ['COST_LATENCY'] }),
    u('BACKGROUND_JOBS', 'Long-Running AI Work: Queues and Background Jobs', 'Why a request should not wait two minutes, task queues (Celery or RQ), progress updates, idempotency and retries.',
      ['Move slow AI work to a background job the user can follow and safely retry'], 40, { after: ['TRACING'] }),
    u('DEPLOY_AI_SERVICE', 'Deploying an AI Service', 'A Docker image for the FastAPI service, secrets and configuration, health checks, scaling workers, and rolling out a new prompt or model safely.',
      ['Deploy an AI service with its secrets, health checks and a safe way to change prompts or models'], 45, { after: ['BACKGROUND_JOBS'] }),
    ...ending('AI in Production', 'DEPLOY_AI_SERVICE', { project: ['MINI_PROJECT', 'Mini Project — Shipping the Policy Assistant',
      'Take the policy-document RAG service to production: Docker, configuration from the environment, caching and a model fallback, tracing, a cost report per request, and an evaluation run that gates the release.'] }),
  ] },
};

/**
 * Batch AI2: the AI Engineer's and the Generative AI Engineer's own topics. Fine-tuning and multimodal
 * AI are the Generative AI Engineer's specialism; each of the two tracks closes on its own capstone.
 */
export const TRACK_AI_GENAI: Record<string, TopicSeed> = {
  /* ── Fine-tuning open models ── */
  AI_FINE_TUNING: { category: 'UNIVERSAL', units: [
    u('WHEN_TO_FINE_TUNE', 'Prompt, RAG or Fine-Tune?', 'What fine-tuning changes (behaviour, format, tone, a narrow skill) and what it does not (fresh facts), and the cost of each route.',
      ['Decide between prompting, RAG and fine-tuning for a requirement and justify the choice'], 35),
    u('DATASETS', 'Building a Fine-Tuning Dataset', 'Instruction and chat formats, chat templates, how many examples, cleaning and de-duplicating, splitting, and synthetic data with its risks.',
      ['Build and validate a clean instruction dataset in the format a trainer expects'], 45, { after: ['WHEN_TO_FINE_TUNE'] }),
    u('LORA_PEFT', 'LoRA, QLoRA and Parameter-Efficient Fine-Tuning', 'Why full fine-tuning is rarely needed, low-rank adapters, rank and alpha, target modules, and 4-bit quantised training.',
      ['Explain LoRA and QLoRA and choose adapter settings for a model and a GPU budget'], 45, { after: ['DATASETS'] }),
    u('TRAINING_RUN', 'A Supervised Fine-Tuning Run', 'Hugging Face TRL\'s SFT trainer with a PEFT config, learning rate and epochs, loss curves, overfitting, and running it on a free GPU notebook.',
      ['Run a LoRA supervised fine-tune and read its loss curves to judge it'], 50, { after: ['LORA_PEFT'] }),
    u('EVALUATE_FINE_TUNE', 'Did the Fine-Tune Help?', 'Comparing base, prompted and fine-tuned models on a held-out set, catastrophic forgetting, and regressions on general ability.',
      ['Show with a held-out evaluation whether a fine-tune beat a well-prompted base model'], 40, { after: ['TRAINING_RUN'] }),
    u('SERVING_ADAPTERS', 'Merging, Quantising and Serving a Fine-Tuned Model', 'Merging adapters or loading them at run time, quantising for serving, and serving behind an OpenAI-compatible endpoint (vLLM or Ollama).',
      ['Package and serve a fine-tuned model behind an OpenAI-compatible endpoint'], 40, { after: ['EVALUATE_FINE_TUNE'] }),
    ...ending('Fine-Tuning', 'SERVING_ADAPTERS', { project: ['MINI_PROJECT', 'Mini Project — A Fine-Tuned Support-Reply Model',
      'Fine-tune a small open model with LoRA to draft replies in a telecom company\'s support tone and JSON format, compare it with a prompted base model on a held-out set, and serve the winner.'] }),
  ] },

  /* ── Multimodal AI ── */
  AI_MULTIMODAL: { category: 'UNIVERSAL', units: [
    u('VISION_INPUTS', 'Images as Input: Vision-Language Models', 'Sending images to a model, what it reads well and badly, resolution and cost, and asking for structured output about an image.',
      ['Extract structured information from images with a vision-language model and check its accuracy'], 40),
    u('DOCUMENT_AI', 'Document AI: Invoices, Forms and Scans', 'OCR versus a vision model, extracting fields from invoices and forms, validating totals and GST numbers in code, and human review.',
      ['Build a document-extraction pipeline that validates what the model read'], 45, { after: ['VISION_INPUTS'] }),
    u('SPEECH', 'Speech: Transcription and Text-to-Speech', 'Whisper-style speech-to-text, Indian accents and code-mixed speech, timestamps and speaker labels in outline, and text-to-speech for replies.',
      ['Transcribe and voice a conversation, and measure transcription quality with word error rate'], 40, { after: ['DOCUMENT_AI'] }),
    u('IMAGE_GENERATION', 'Generating Images Responsibly', 'Diffusion models in outline, prompting for images, editing, and the rules on likeness, copyright and labelling generated content.',
      ['Generate and edit images for a product feature within legal and ethical limits'], 35, { after: ['SPEECH'] }),
    u('MULTIMODAL_RAG', 'Multimodal RAG', 'Indexing slides, charts and scanned pages, image and text embeddings in one store, and answering with the figure that supports the answer.',
      ['Answer questions over documents that mix text, tables and images, citing the page'], 45, { after: ['IMAGE_GENERATION'] }),
    ...ending('Multimodal AI', 'MULTIMODAL_RAG', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── The AI Engineer capstone ── */
  AI_CAPSTONE_ENG: { category: 'UNIVERSAL', units: [
    u('BRIEF', 'The Capstone: An AI Product, Scoped', 'A knowledge assistant for a real domain — a college, a hospital, a bank\'s policies or a SaaS help centre: users, data, success metrics, architecture and a plan.',
      ['Scope an AI product, its evaluation metrics and its architecture, and plan its delivery'], 45),
    u('BUILD_CORE', 'Capstone Build — Retrieval, Generation and an Agent', 'Ingestion, a vector database with hybrid search, grounded and cited answers, and one tool-using agent action with approval.',
      ['Build the retrieval, generation and agent core of the product to a measured standard'], 300, { unitType: 'PROJECT', after: ['BRIEF'], skillKeys: ['RAG_FUNDAMENTALS', 'GENAI_APP_PATTERNS'] }),
    u('BUILD_PRODUCTION', 'Capstone Build — Evaluation, Guardrails and Deployment', 'An evaluation set gating releases, guardrails, tracing and cost per request, and the service deployed with Docker.',
      ['Evaluate, guard and deploy the product, with the numbers to show it works'], 240, { unitType: 'PROJECT', after: ['BUILD_CORE'], skillKeys: ['LLM_EVALUATION', 'MODEL_DEPLOYMENT'] }),
    u('DEFENCE', 'Demo Day: Presenting and Defending the Capstone', 'A ten-minute demo, the architecture and evaluation results, and the questions a panel asks about failure, cost and safety.',
      ['Present the AI product and defend every design decision under questioning'], 45, { unitType: 'PRACTICE', after: ['BUILD_PRODUCTION'] }),
    u('CHECKPOINT', 'Capstone — Checkpoint', 'Where you actually are across the whole track, measured rather than felt.',
      ['Show AI-engineering judgement at the standard a hiring panel expects'], 40, { unitType: 'CHECKPOINT', after: ['DEFENCE'] }),
  ] },

  /* ── The Generative AI Engineer capstone ── */
  AI_CAPSTONE_GENAI: { category: 'UNIVERSAL', units: [
    u('BRIEF', 'The Capstone: A Generative AI Product, Scoped', 'A product that needs more than a prompt — a domain assistant with its own tone, a document-processing service, or a multimodal helper: users, data, metrics and a plan.',
      ['Scope a generative AI product, choose prompt, RAG or fine-tuning for each part, and plan it'], 45),
    u('BUILD_MODEL', 'Capstone Build — The Model Layer', 'The chosen mix of prompting, RAG and a LoRA fine-tune, each compared against the simpler option on a held-out set.',
      ['Build the model layer and prove each added piece beats the simpler alternative'], 300, { unitType: 'PROJECT', after: ['BRIEF'], skillKeys: ['LLM_FINE_TUNING', 'RAG_FUNDAMENTALS'] }),
    u('BUILD_PRODUCT', 'Capstone Build — The Product', 'A FastAPI service and a simple UI, a multimodal input where it earns its place, guardrails, evaluation in CI and deployment.',
      ['Ship the product with guardrails, an evaluation gate and a deployment'], 240, { unitType: 'PROJECT', after: ['BUILD_MODEL'], skillKeys: ['GENAI_APP_PATTERNS', 'LLM_EVALUATION'] }),
    u('DEFENCE', 'Demo Day: Presenting and Defending the Capstone', 'A ten-minute demo, the evaluation results, and the questions a panel asks about data, fine-tuning, cost and safety.',
      ['Present the product and defend every modelling decision under questioning'], 45, { unitType: 'PRACTICE', after: ['BUILD_PRODUCT'] }),
    u('CHECKPOINT', 'Capstone — Checkpoint', 'Where you actually are across the whole track, measured rather than felt.',
      ['Show generative-AI engineering judgement at the standard a hiring panel expects'], 40, { unitType: 'CHECKPOINT', after: ['DEFENCE'] }),
  ] },
};

/**
 * Batch AI3: the Agentic AI Engineer's specialism. JT_AI_AGENTS (what an agent is, tools, workflows,
 * memory, MCP, guardrails) and JT_AI_AGENTS_PY (tool calling, a first LangGraph agent, memory and MCP in
 * Python) come first; these go from one bounded agent to agent systems that are designed, evaluated,
 * secured and run in production.
 */
export const TRACK_AI_AGENTIC: Record<string, TopicSeed> = {
  /* ── Orchestration and multi-agent systems ── */
  AI_AGENT_ORCHESTRATION: { category: 'UNIVERSAL', units: [
    u('STATE_GRAPHS', 'Agents as State Graphs', 'Typed state, nodes, conditional edges, reducers and checkpointers in LangGraph — and drawing the graph before writing it.',
      ['Model an agent as a typed state graph with conditional routing and a checkpointer'], 45),
    u('AGENT_PATTERNS', 'The Agent Patterns: ReAct, Plan-and-Execute, Reflection and Routing', 'What each pattern is good and bad at, how many model calls each costs, and choosing the simplest one that works.',
      ['Choose and implement the agent pattern a task needs, and justify its cost'], 45, { after: ['STATE_GRAPHS'] }),
    u('MULTI_AGENT', 'Multi-Agent Systems: Supervisors and Hand-offs', 'A supervisor with specialist agents, hand-offs between agents, shared versus private state, and when several agents are worse than one.',
      ['Design a supervisor-and-specialists system and explain when one agent would do better'], 45, { after: ['AGENT_PATTERNS'] }),
    u('PARALLEL_WORK', 'Parallel Sub-Tasks: Fan-Out and Fan-In', 'Splitting work into parallel branches, map-reduce over documents, joining results, and handling one branch failing.',
      ['Run independent agent sub-tasks in parallel and combine their results safely'], 40, { after: ['MULTI_AGENT'] }),
    u('HUMAN_IN_THE_LOOP', 'Human in the Loop: Interrupts, Approvals and Edits', 'Pausing a graph for approval, letting a person edit the plan or a tool call, and resuming from the saved state.',
      ['Pause an agent for human approval or correction and resume it from where it stopped'], 40, { after: ['PARALLEL_WORK'] }),
    u('DURABLE_EXECUTION', 'Long-Running and Durable Agents', 'Persisting checkpoints in a database, resuming after a crash, retries without repeating side effects, and time-outs.',
      ['Make a long-running agent survive restarts without repeating actions it already took'], 40, { after: ['HUMAN_IN_THE_LOOP'] }),
    ...ending('Agent Orchestration', 'DURABLE_EXECUTION', { project: ['MINI_PROJECT', 'Mini Project — A Research-and-Report Agent Team',
      'A supervisor that sends a research question to a search agent and a data agent in parallel, has a writer agent draft a cited report, pauses for an editor\'s approval, and resumes safely after a restart.'] }),
  ] },

  /* ── Tools, MCP, memory and context ── */
  AI_AGENT_TOOLS_MEMORY: { category: 'UNIVERSAL', units: [
    u('TOOL_DESIGN', 'Designing Tools a Model Uses Well', 'Names, descriptions and argument schemas, returning errors the model can act on, idempotent tools, and how many tools is too many.',
      ['Design a tool set whose calls a model gets right, and whose failures it can recover from'], 40),
    u('MCP_SERVERS', 'Building MCP Servers in Python', 'Tools, resources and prompts in an MCP server with the Python SDK, stdio and HTTP transports, and authorising the client.',
      ['Build and secure an MCP server that exposes a service\'s tools and data to any agent'], 45, { after: ['TOOL_DESIGN'] }),
    u('CODE_AND_WEB_TOOLS', 'Code Execution and Web Tools', 'Letting an agent run code in a sandbox, browse or search the web, and the risks each adds — and the limits that contain them.',
      ['Give an agent sandboxed code execution and web access with limits that contain the risk'], 40, { after: ['MCP_SERVERS'] }),
    u('MEMORY_STORES', 'Long-Term Memory Done Properly', 'What to remember (facts, preferences, past episodes), writing and updating memories, retrieving them, keeping users apart, and forgetting on request.',
      ['Build long-term memory that stays accurate, separated between users and deletable'], 45, { after: ['CODE_AND_WEB_TOOLS'] }),
    u('CONTEXT_ENGINEERING', 'Context Engineering', 'Deciding what goes into the context window each step: instructions, tool results, retrieved memory, summaries and trimming, and the cost of a bloated context.',
      ['Manage what an agent sees each step so it stays accurate, fast and affordable over long tasks'], 40, { after: ['MEMORY_STORES'] }),
    ...ending('Agent Tools and Memory', 'CONTEXT_ENGINEERING', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── Evaluating, securing and running agents ── */
  AI_AGENT_EVAL_OPS: { category: 'UNIVERSAL', units: [
    u('TRAJECTORY_EVAL', 'Evaluating Agents: Outcomes and Trajectories', 'Task success, tool-call accuracy, step counts and the path taken, comparing a run against a reference trajectory, and judging with a rubric.',
      ['Evaluate an agent on whether it succeeded and on how it got there'], 45),
    u('SCENARIO_TESTS', 'Scenario Tests and Simulated Users', 'Scripted scenarios, a simulated user model, fake tools with recorded responses, and running the suite on every change.',
      ['Build a repeatable scenario suite with simulated users and fake tools for an agent'], 40, { after: ['TRAJECTORY_EVAL'] }),
    u('AGENT_SECURITY', 'Securing Agents: Excessive Agency and Tool Injection', 'Least-privilege tools, injection through tool results and documents, confirming risky actions, sandboxing, and audit logs.',
      ['Limit what an agent can do, and defend it against instructions smuggled in through its tools'], 45, { after: ['SCENARIO_TESTS'] }),
    u('OBSERVABILITY_BUDGETS', 'Tracing Agent Runs and Enforcing Budgets', 'Tracing every step and tool call, catching loops, step and token budgets per run, and alerts on cost and failure rates.',
      ['Trace agent runs and stop runaway loops and costs before users notice'], 40, { after: ['AGENT_SECURITY'] }),
    u('SERVING_AGENTS', 'Serving Agents as a Product', 'An agent behind an API, streaming its steps to the UI, background runs with progress, threads per user, and versioning agent behaviour.',
      ['Serve an agent to users with streamed progress, per-user threads and safe releases'], 45, { after: ['OBSERVABILITY_BUDGETS'] }),
    ...ending('Agent Evaluation and Operations', 'SERVING_AGENTS', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── The Agentic AI Engineer capstone ── */
  AI_CAPSTONE_AGENTIC: { category: 'UNIVERSAL', units: [
    u('BRIEF', 'The Capstone: An Agentic Product, Scoped', 'An agent that does real work for a business — operations, recruitment, finance back-office or customer support: the tasks, tools, risks, metrics and a plan.',
      ['Scope an agentic product, its tools, its risks and its evaluation, and plan its delivery'], 45),
    u('BUILD_AGENT', 'Capstone Build — The Agent System', 'The graph, the tools and an MCP server, memory, parallel work and the human approval steps.',
      ['Build the agent system with its tools, memory and approvals'], 300, { unitType: 'PROJECT', after: ['BRIEF'], skillKeys: ['AGENT_ORCHESTRATION', 'TOOL_CALLING'] }),
    u('BUILD_PRODUCTION', 'Capstone Build — Evaluation, Security and Deployment', 'A scenario suite with trajectory scores, security tests, tracing and budgets, and the agent deployed as a service.',
      ['Evaluate, secure and deploy the agent, with the numbers to show it is safe to use'], 240, { unitType: 'PROJECT', after: ['BUILD_AGENT'], skillKeys: ['AGENT_EVALUATION', 'AGENT_MEMORY'] }),
    u('DEFENCE', 'Demo Day: Presenting and Defending the Capstone', 'A live run of the agent, its evaluation results, and the questions a panel asks about autonomy, failure, cost and security.',
      ['Demo the agent and defend its design, its limits and its safeguards under questioning'], 45, { unitType: 'PRACTICE', after: ['BUILD_PRODUCTION'] }),
    u('CHECKPOINT', 'Capstone — Checkpoint', 'Where you actually are across the whole track, measured rather than felt.',
      ['Show agentic-AI engineering judgement at the standard a hiring panel expects'], 40, { unitType: 'CHECKPOINT', after: ['DEFENCE'] }),
  ] },
};

/**
 * Batch AI4: the MLOps Engineer's specialism. The track already has machine-learning foundations and
 * supervised learning, the years' Linux, Docker, CI/CD and cloud basics (DEVOPS_FOR_ML), and Data
 * Science's DS_DEPLOYMENT (saving, serving with FastAPI, MLflow tracking, drift, Docker). These take
 * one deployed model to a platform that trains, ships, watches and retrains models repeatably.
 */
export const TRACK_AI_MLOPS: Record<string, TopicSeed> = {
  /* ── Pipelines, versioning and reproducibility ── */
  MLOPS_PIPELINES: { category: 'UNIVERSAL', units: [
    u('DATA_VERSIONING', 'Versioning Data and Models with DVC', 'Why Git alone cannot version data, DVC tracking and remotes, and tying a model to the exact data and code that made it.',
      ['Version datasets and models so any past model can be rebuilt from its data and code'], 45),
    u('PIPELINE_DESIGN', 'ML Pipelines as Code', 'Stages and their inputs and outputs, a DAG, caching unchanged steps, and orchestrators (DVC pipelines, Prefect, Airflow) and when each fits.',
      ['Turn a notebook into a staged, cached pipeline and choose an orchestrator for it'], 45, { after: ['DATA_VERSIONING'] }),
    u('REPRODUCIBLE_TRAINING', 'Reproducible Training', 'Pinned environments, seeds and their limits, configuration files instead of edited code, and recording everything a run depended on.',
      ['Make a training run reproducible and prove it by re-running it'], 40, { after: ['PIPELINE_DESIGN'] }),
    u('MODEL_REGISTRY', 'The Model Registry and Promotion', 'Registering models with lineage, versions and aliases (champion and challenger), promotion rules, and who may promote.',
      ['Register, compare and promote models with lineage and a clear promotion rule'], 40, { after: ['REPRODUCIBLE_TRAINING'] }),
    u('DATA_VALIDATION', 'Validating Data Before It Reaches a Model', 'Schema and range checks, distribution checks against a reference, failing a pipeline on bad data, and tools such as pandera and Great Expectations.',
      ['Stop a pipeline when incoming data breaks the model\'s assumptions'], 40, { after: ['MODEL_REGISTRY'] }),
    u('FEATURE_STORES', 'Features: Training-Serving Skew and Feature Stores', 'Computing a feature the same way in training and serving, point-in-time correctness, and what a feature store (Feast) does and costs.',
      ['Prevent training-serving skew and decide whether a feature store is worth it'], 40, { after: ['DATA_VALIDATION'] }),
    ...ending('ML Pipelines', 'FEATURE_STORES', { project: ['MINI_PROJECT', 'Mini Project — A Reproducible Credit-Risk Training Pipeline',
      'A versioned, validated, cached training pipeline for a lender\'s credit-risk model: DVC for data, MLflow for runs and the registry, a data-validation gate, and a promotion rule — rebuilt from scratch on a second machine.'] }),
  ] },

  /* ── CI/CD and infrastructure for ML ── */
  MLOPS_CICD_INFRA: { category: 'UNIVERSAL', units: [
    u('CI_FOR_ML', 'Continuous Integration for ML Code', 'Unit tests for features and pipelines, data and model checks, a training smoke test, and a GitHub Actions workflow that runs them.',
      ['Build a CI workflow that tests ML code, data contracts and a small training run'], 45),
    u('CD_FOR_MODELS', 'Continuous Delivery for Models', 'Evaluation gates before release, shadow and canary releases, A/B tests, and rolling back a model in minutes.',
      ['Release a new model safely with an evaluation gate, a canary and a rollback'], 45, { after: ['CI_FOR_ML'] }),
    u('KUBERNETES_FOR_ML', 'Kubernetes for Model Serving', 'Pods, Deployments, Services and ConfigMaps, resource requests and limits, probes, and autoscaling a model server.',
      ['Deploy and autoscale a model server on Kubernetes with health probes and resource limits'], 50, { after: ['CD_FOR_MODELS'] }),
    u('SERVING_PATTERNS', 'Serving Patterns: Online, Batch and Streaming', 'Choosing online, batch or streaming inference, model servers (BentoML, KServe, Triton) in outline, batching, GPUs and cost.',
      ['Choose the serving pattern and platform a model needs on latency, volume and cost'], 40, { after: ['KUBERNETES_FOR_ML'] }),
    u('INFRA_AS_CODE', 'Infrastructure as Code for ML', 'Terraform basics — providers, resources, state and plans — for buckets, a container registry and a cluster, reviewed like code.',
      ['Describe ML infrastructure in Terraform and change it through reviewed plans'], 45, { after: ['SERVING_PATTERNS'] }),
    u('CONFIG_SECRETS', 'Configuration and Secrets Across Environments', 'Dev, staging and production configuration, secrets managers instead of files, and configuration drift.',
      ['Run the same ML service in several environments without leaking or drifting configuration'], 35, { after: ['INFRA_AS_CODE'] }),
    ...ending('CI/CD and Infrastructure for ML', 'CONFIG_SECRETS', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── Monitoring, retraining and LLMOps ── */
  MLOPS_MONITORING: { category: 'UNIVERSAL', units: [
    u('SERVICE_METRICS', 'Service Metrics: Prometheus and Grafana', 'Latency percentiles, throughput and errors for a model service, exposing metrics, dashboards, and alerts that page for the right things.',
      ['Instrument a model service and alert on its latency and errors'], 45),
    u('MODEL_QUALITY', 'Monitoring Model Quality', 'Performance when labels arrive late, proxy metrics, slices that hide failures, and drift results read with care.',
      ['Monitor a model\'s real-world quality, by slice, even when labels arrive late'], 45, { after: ['SERVICE_METRICS'] }),
    u('RETRAINING', 'Retraining: When and How', 'Scheduled versus triggered retraining, continuous training pipelines, guarding against training on bad data, and comparing with the champion.',
      ['Design a retraining loop that improves the model without shipping a worse one'], 40, { after: ['MODEL_QUALITY'] }),
    u('LLMOPS', 'LLMOps: Running LLM Applications', 'Versioning prompts and models, evaluation runs in production, monitoring quality, cost and latency, and what changes from classic MLOps.',
      ['Operate an LLM application with versioned prompts, live evaluation and cost monitoring'], 45, { after: ['RETRAINING'] }),
    u('ML_INCIDENTS', 'When a Model Breaks in Production', 'Runbooks, rolling back a model or a feature, kill switches and fallbacks, and a blameless post-incident review.',
      ['Handle a model incident end to end and write the review that prevents the next one'], 40, { after: ['LLMOPS'] }),
    ...ending('Model Monitoring and LLMOps', 'ML_INCIDENTS', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── The MLOps Engineer capstone ── */
  AI_CAPSTONE_MLOPS: { category: 'UNIVERSAL', units: [
    u('BRIEF', 'The Capstone: An ML Platform, Scoped', 'A model that has to keep working — demand forecasting for a grocery chain, fraud scoring for a payments app, or churn for a telecom: the SLAs, risks, metrics and a plan.',
      ['Scope an ML platform for a real model, its service levels and its risks, and plan its delivery'], 45),
    u('BUILD_PIPELINE', 'Capstone Build — Pipeline, Registry and CI', 'Versioned data, a validated and reproducible training pipeline, experiment tracking and a registry, and CI that tests all of it.',
      ['Build the training side of the platform so any model can be rebuilt and promoted by rule'], 300, { unitType: 'PROJECT', after: ['BRIEF'], skillKeys: ['ML_PIPELINES', 'CI_CD'] }),
    u('BUILD_SERVING', 'Capstone Build — Serving, Monitoring and Retraining', 'The model served on Kubernetes through a gated, canaried release, with service and quality monitoring, alerts and a retraining loop.',
      ['Ship and operate the model with monitoring, alerts, safe releases and retraining'], 240, { unitType: 'PROJECT', after: ['BUILD_PIPELINE'], skillKeys: ['MODEL_DEPLOYMENT', 'MODEL_MONITORING'] }),
    u('DEFENCE', 'Demo Day: Presenting and Defending the Capstone', 'A live release and rollback, the dashboards, and the questions a panel asks about reproducibility, failure and cost.',
      ['Demo the platform and defend its design under questioning'], 45, { unitType: 'PRACTICE', after: ['BUILD_SERVING'] }),
    u('CHECKPOINT', 'Capstone — Checkpoint', 'Where you actually are across the whole track, measured rather than felt.',
      ['Show MLOps judgement at the standard a hiring panel expects'], 40, { unitType: 'CHECKPOINT', after: ['DEFENCE'] }),
  ] },
};

/**
 * Batch AI5: the AI Security Engineer's specialism. The track already has the years' security
 * foundations (SECURITY_FOR_AI: threats, threat modelling, web security and the OWASP Top 10,
 * authentication and authorisation, AppSec), building with LLMs and agents, and the AI core's
 * evaluation, prompt-injection and guardrail lessons. These go deeper on attacking and defending
 * AI systems — always as authorised, defensive work.
 */
export const TRACK_AI_SECURITY: Record<string, TopicSeed> = {
  /* ── Threats to LLM applications ── */
  AISEC_LLM_THREATS: { category: 'UNIVERSAL', units: [
    u('OWASP_LLM_TOP10', 'The OWASP Top 10 for LLM Applications', 'The risk categories an LLM application faces, what each looks like in a real product, and how they differ from the classic web Top 10.',
      ['Map an LLM application\'s design to the OWASP LLM risk categories and rank its exposure'], 40),
    u('THREAT_MODEL_AI', 'Threat Modelling an AI System', 'Data flows, trust boundaries around the model, retrieval and tools, STRIDE applied to an LLM app, and the attacker\'s goals.',
      ['Threat-model an LLM application with retrieval and tools, and prioritise what to fix'], 45, { after: ['OWASP_LLM_TOP10'] }),
    u('DATA_LEAKAGE', 'Sensitive Data Leakage', 'System prompt leaks, personal data in context and logs, cross-user leaks through caches and memory, and training-data extraction in outline.',
      ['Find and close the paths by which an AI feature can leak sensitive data'], 40, { after: ['THREAT_MODEL_AI'] }),
    u('RAG_AGENT_ATTACKS', 'Attacks Through Retrieval and Tools', 'Poisoned documents, indirect injection through web pages and emails, tool misuse, and excessive agency — why agents widen the attack surface.',
      ['Explain and test how retrieved content and tool results can turn an assistant against its user'], 45, { after: ['DATA_LEAKAGE'] }),
    u('ACCESS_CONTROL_AI', 'Access Control for RAG and Agents', 'Document-level permissions in retrieval, filtering before the model sees anything, tenant isolation, and acting with the user\'s rights only.',
      ['Enforce permissions in retrieval and tools so an assistant never shows or does more than its user may'], 40, { after: ['RAG_AGENT_ATTACKS'] }),
    u('SUPPLY_CHAIN', 'The AI Supply Chain', 'Unsafe model files (pickle), scanning and safe formats (safetensors), poisoned datasets, untrusted MCP servers and dependency pinning.',
      ['Assess and secure the models, datasets, servers and packages an AI system depends on'], 40, { after: ['ACCESS_CONTROL_AI'] }),
    ...ending('LLM Security', 'SUPPLY_CHAIN', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── Red teaming AI systems ── */
  AISEC_RED_TEAMING: { category: 'UNIVERSAL', units: [
    u('RED_TEAM_METHOD', 'Red Teaming an AI System, Properly', 'Authorisation and scope, rules of engagement, a harm taxonomy, test environments, and evidence that holds up.',
      ['Plan an authorised red-team exercise on an AI system with scope, rules and a harm taxonomy'], 40),
    u('INJECTION_TESTING', 'Systematic Prompt-Injection Testing', 'Building a test suite of direct and indirect injection cases, canary secrets, measuring attack success rate, and regression-testing fixes.',
      ['Measure an application\'s resistance to prompt injection with a repeatable test suite'], 45, { after: ['RED_TEAM_METHOD'] }),
    u('JAILBREAK_CLASSES', 'Jailbreak Classes and Refusal Robustness', 'The families of jailbreak — role-play, obfuscation, multi-turn escalation — at the level needed to test for them, and measuring over- and under-refusal.',
      ['Test a model\'s refusal behaviour across jailbreak classes and report both failure directions'], 40, { after: ['INJECTION_TESTING'] }),
    u('AUTOMATED_RED_TEAMING', 'Automated Red Teaming', 'Scanners and frameworks (garak, PyRIT, promptfoo) in outline, generating attack variants, scoring with judges, and their blind spots.',
      ['Run an automated red-team scan, read its results critically and add the human testing it misses'], 45, { after: ['JAILBREAK_CLASSES'] }),
    u('FINDINGS_REPORTING', 'Reporting Findings and Retesting', 'Severity for AI findings, reproducible evidence when outputs vary, writing for engineers and leaders, and retesting a fix.',
      ['Write AI security findings that can be reproduced, prioritised and verified as fixed'], 35, { after: ['AUTOMATED_RED_TEAMING'] }),
    ...ending('AI Red Teaming', 'FINDINGS_REPORTING', { project: ['MINI_PROJECT', 'Mini Project — Red-Teaming a Bank\'s Support Assistant',
      'An authorised assessment of a deliberately vulnerable banking support assistant with RAG and tools: scope, an injection and data-leakage test suite, an automated scan, a findings report with severities, and a retest after the fixes.'] }),
  ] },

  /* ── Defending AI systems ── */
  AISEC_DEFENCES: { category: 'UNIVERSAL', units: [
    u('DEFENCE_IN_DEPTH', 'Defence in Depth for LLM Applications', 'Least privilege, separating trusted and untrusted text, the quarantined-model pattern, confirmations, and why no single filter is enough.',
      ['Design an LLM application whose worst case stays acceptable even when the model is fooled'], 45),
    u('GUARDRAIL_ENGINEERING', 'Engineering Guardrails', 'Safety classifiers and guard models, rule engines, where each check sits in the flow, latency and false-positive costs, and testing the guards themselves.',
      ['Build and measure a layered guardrail pipeline with acceptable latency and false positives'], 45, { after: ['DEFENCE_IN_DEPTH'] }),
    u('OUTPUT_HANDLING', 'Handling Model Output Safely', 'Model output as untrusted input: HTML and markdown injection, generated SQL and shell commands, links and images that exfiltrate data.',
      ['Treat model output as untrusted and stop it from becoming an injection into the rest of the system'], 40, { after: ['GUARDRAIL_ENGINEERING'] }),
    u('ABUSE_MONITORING', 'Detecting Abuse and Responding to AI Incidents', 'Signals of attack and misuse, rate limits and quotas, logging without hoarding personal data, and an AI incident runbook.',
      ['Detect attacks and abuse against an AI feature and respond with a tested runbook'], 40, { after: ['OUTPUT_HANDLING'] }),
    u('AI_GOVERNANCE', 'AI Risk Management and Governance', 'Risk frameworks (NIST AI RMF, ISO/IEC 42001) in outline, model and system cards, policies, India\'s data-protection duties, and audits.',
      ['Run an AI risk assessment and produce the documentation an auditor or regulator will ask for'], 40, { after: ['ABUSE_MONITORING'] }),
    ...ending('AI Defences', 'AI_GOVERNANCE', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── The AI Security Engineer capstone ── */
  AI_CAPSTONE_AISEC: { category: 'UNIVERSAL', units: [
    u('BRIEF', 'The Capstone: Securing an AI Product', 'A real AI product to assess and harden — an insurer\'s claims assistant, an HR copilot with tools, or an edtech tutor: scope, threat model, success measures and a plan.',
      ['Scope a security engagement on an AI product, its threat model and its success measures'], 45),
    u('BUILD_ASSESSMENT', 'Capstone Build — The Assessment', 'Threat model, an injection and data-leakage test suite, automated and manual red teaming, and a findings report with severities.',
      ['Assess the AI product and report reproducible, prioritised findings'], 300, { unitType: 'PROJECT', after: ['BRIEF'], skillKeys: ['MODEL_RED_TEAMING', 'PROMPT_INJECTION'] }),
    u('BUILD_HARDENING', 'Capstone Build — Hardening and Proof', 'Fixes in depth — access control, guardrails, output handling, monitoring — a retest showing the attack success rate fall, and governance documents.',
      ['Harden the product and prove with a retest that the risk went down'], 240, { unitType: 'PROJECT', after: ['BUILD_ASSESSMENT'], skillKeys: ['AI_GUARDRAILS', 'LLM_SECURITY'] }),
    u('DEFENCE', 'Demo Day: Presenting and Defending the Capstone', 'A live attack before and after, the findings and fixes, and the questions a panel asks about residual risk and trade-offs.',
      ['Present the assessment and hardening and defend every judgement under questioning'], 45, { unitType: 'PRACTICE', after: ['BUILD_HARDENING'] }),
    u('CHECKPOINT', 'Capstone — Checkpoint', 'Where you actually are across the whole track, measured rather than felt.',
      ['Show AI-security judgement at the standard a hiring panel expects'], 40, { unitType: 'CHECKPOINT', after: ['DEFENCE'] }),
  ] },
};

/**
 * Batch AI6: Year-4 placement for the AI tracks. Aptitude, coding rounds in Python, core CS, HR and
 * mocks are the shared placement packs; JT_IV_AI (AI engineering interview basics) is already in every
 * "+ AI" track. These add the LLM engineering interview at depth, one interview topic per specialism,
 * AI system design rounds, and the AI candidate.
 */
export const TRACK_AI_PLACE: Record<string, TopicSeed> = {
  /* ── LLM engineering at interview depth (every AI track) ── */
  AI_IV_LLM: { category: 'UNIVERSAL', units: interview('LLM Engineering Interview', [
    ['IV_LLM_BASICS', 'How LLMs Work — Interview Questions', 'Tokens, attention, training stages, decoding and model choice, as interviewers probe them and the follow-ups that catch bluffing.', ['LLM_FUNDAMENTALS']],
    ['IV_RAG', 'RAG and Vector Search Questions', 'Chunking, embeddings, vector indexes, hybrid search and re-ranking, and measuring retrieval — with the "why did it answer wrongly" follow-up.', ['RAG_FUNDAMENTALS']],
    ['IV_EVAL_SAFETY', 'Evaluation, Guardrails and Injection Questions', 'Evaluation sets, LLM-as-judge, release gates, prompt injection and guardrails, asked as scenarios.', ['LLM_EVALUATION']],
    ['IV_PRODUCTION', 'LLM Applications in Production Questions', 'Routing, caching, cost and latency budgets, tracing, background jobs and safe rollouts of prompts and models.', ['GENAI_APP_PATTERNS']],
  ]) },

  /* ── The Generative AI specialism at interview depth ── */
  AI_IV_GENAI: { category: 'UNIVERSAL', units: interview('Generative AI Interview', [
    ['IV_FINE_TUNING', 'Fine-Tuning Questions', 'Prompt, RAG or fine-tune; datasets and chat templates; LoRA and QLoRA; reading loss curves; forgetting; serving adapters.', ['LLM_FINE_TUNING']],
    ['IV_TRANSFORMERS', 'Transformer Architecture Questions', 'Attention and its cost, positional information, encoder vs decoder models, KV cache and why long context is expensive.', ['DL_TRANSFORMERS']],
    ['IV_MULTIMODAL', 'Multimodal AI Questions', 'Vision-language models, document AI and validation, speech and word error rate, multimodal retrieval and responsible image generation.', ['GENAI_APP_PATTERNS']],
  ]) },

  /* ── The Agentic AI specialism at interview depth ── */
  AI_IV_AGENTS: { category: 'UNIVERSAL', units: interview('Agentic AI Interview', [
    ['IV_ORCHESTRATION', 'Agent Design and Orchestration Questions', 'Workflow or agent, the patterns and their cost, multi-agent design, parallel work, human approval and durable execution.', ['AGENT_ORCHESTRATION']],
    ['IV_TOOLS_MEMORY', 'Tools, MCP and Memory Questions', 'Tool design, MCP servers, sandboxing code and web tools, long-term memory and context engineering.', ['TOOL_CALLING']],
    ['IV_AGENT_EVAL_SECURITY', 'Evaluating and Securing Agents Questions', 'Trajectory evaluation, scenario suites, excessive agency, tool injection, budgets and serving agents.', ['AGENT_EVALUATION']],
  ]) },

  /* ── The MLOps specialism at interview depth ── */
  AI_IV_MLOPS: { category: 'UNIVERSAL', units: interview('MLOps Interview', [
    ['IV_PIPELINES', 'Pipelines, Versioning and Registry Questions', 'Reproducibility, data and model versioning, data validation, training-serving skew and promotion rules.', ['ML_PIPELINES']],
    ['IV_DELIVERY', 'CI/CD for ML Questions', 'What to test in ML code, evaluation gates, shadow and canary releases, rollback, and infrastructure as code.', ['CI_CD']],
    ['IV_SERVING', 'Model Serving and Kubernetes Questions', 'Online vs batch serving, model servers, Kubernetes deployments, probes and autoscaling, GPUs and cost.', ['MODEL_DEPLOYMENT']],
    ['IV_MONITORING', 'Monitoring, Retraining and LLMOps Questions', 'Service metrics, model quality with late labels, drift, retraining loops, LLMOps and model incidents.', ['MODEL_MONITORING']],
  ]) },

  /* ── The AI Security specialism at interview depth ── */
  AI_IV_AISEC: { category: 'UNIVERSAL', units: interview('AI Security Interview', [
    ['IV_LLM_THREATS', 'LLM Threats and Threat Modelling Questions', 'The OWASP LLM risks, data leakage, attacks through retrieval and tools, access control and the AI supply chain.', ['LLM_SECURITY']],
    ['IV_RED_TEAMING', 'AI Red Teaming Questions', 'Scoping an authorised exercise, systematic injection testing, measuring refusal robustness, automated scanners and reporting.', ['MODEL_RED_TEAMING']],
    ['IV_DEFENCES', 'AI Defences and Governance Questions', 'Defence in depth, guardrail engineering and its costs, safe output handling, abuse monitoring and AI risk governance.', ['AI_GUARDRAILS']],
  ]) },

  /* ── AI system design rounds ── */
  AI_SYSTEM_DESIGN: { category: 'UNIVERSAL', units: [
    u('DESIGN_METHOD', 'How an AI System Design Round Runs', 'Requirements and constraints first, a baseline, the data and model path, evaluation, cost and latency, safety and operations — in forty-five minutes.',
      ['Run an AI system design answer with a clear structure and time plan'], 40),
    u('DESIGN_RAG_ASSISTANT', 'Design: A Knowledge Assistant at Scale', 'A cited assistant over millions of documents for thousands of users: ingestion, retrieval, permissions, evaluation, cost and freshness.',
      ['Design a production knowledge assistant and defend its trade-offs'], 45, { after: ['DESIGN_METHOD'] }),
    u('DESIGN_AGENT', 'Design: An Agent That Acts for Users', 'A booking, support or operations agent: tools, approvals, memory, failure handling, evaluation and security.',
      ['Design an agent system whose failures stay safe and whose behaviour can be measured'], 45, { after: ['DESIGN_RAG_ASSISTANT'] }),
    u('DESIGN_ML_PLATFORM', 'Design: Serving and Monitoring Models at Scale', 'A fraud or recommendation model at high traffic: features, online serving, releases, monitoring and retraining.',
      ['Design an ML serving and monitoring platform at scale'], 45, { after: ['DESIGN_AGENT'] }),
    u('TAKE_HOME', 'The AI Engineering Take-Home', 'Scoping the assignment, a working baseline, an evaluation with numbers, and a short write-up that wins the next round.',
      ['Complete an AI engineering take-home to the standard that gets a call-back'], 45, { after: ['DESIGN_ML_PLATFORM'] }),
    u('TIMED_DESIGNS', 'Timed AI Design Set', 'Two AI system design questions under time, with model answers and how each is scored.',
      ['Answer timed AI design questions with structure and clear trade-offs'], 50, { unitType: 'PRACTICE', after: ['TAKE_HOME'] }),
    u('CHECKPOINT', 'AI System Design — Checkpoint', 'Where you actually are on this, measured rather than felt.',
      ['Show structured AI system design thinking at interview standard'], 40, { unitType: 'CHECKPOINT', after: ['TIMED_DESIGNS'] }),
  ] },

  /* ── The AI candidate ── */
  AI_PLACE_CANDIDATE: { category: 'UNIVERSAL', units: [
    u('RESUME', 'An AI Engineer\'s Resume and Portfolio', 'The skills line recruiters filter on, project bullets with evaluation numbers and cost, a GitHub with runnable projects, a deployed demo and a short write-up.',
      ['Write an AI resume and portfolio whose every claim can be checked'], 45, { skillKeys: ['PLACEMENT_READINESS', 'PORTFOLIO_EVIDENCE'] }),
    u('DEFEND_CAPSTONE', 'Defending Your AI Capstone', 'The problem, architecture, evaluation results, failures, cost and safety of your track\'s capstone — and the follow-ups a panel asks about each.',
      ['Defend the capstone end to end under follow-up questions'], 45, { after: ['RESUME'], skillKeys: ['TECHNICAL_EXPLANATION'] }),
    u('MOCK_LOOP', 'The AI Interview Loop — Mock', 'Online test (aptitude and Python), a coding round, an LLM or ML round, an AI system design round, a hiring-manager round and HR — as one mock day.',
      ['Go through a complete AI interview loop and act on its debrief'], 60, { unitType: 'PRACTICE', after: ['DEFEND_CAPSTONE'], skillKeys: ['INTERVIEW_PERFORMANCE'] }),
    u('CHECKPOINT', 'AI Placement — Checkpoint', 'Where you actually are on this, measured rather than felt.',
      ['Show the judgement an AI hiring panel looks for'], 40, { unitType: 'CHECKPOINT', after: ['MOCK_LOOP'] }),
  ] },
};
