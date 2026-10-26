import { TopicSeed } from './year1MegaCurriculum';
import { u } from './year4UnitKit';
import { ending } from './trackUnitsWeb';

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
