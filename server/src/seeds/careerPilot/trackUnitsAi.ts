import { TopicSeed } from './year1MegaCurriculum';
import { u } from './year4UnitKit';
import { ending } from './trackUnitsWeb';

/**
 * Career-track content, batch 5: generative and agentic AI, and the capstone.
 *
 * The concept topics (JT_AI_CONCEPTS, JT_AI_AGENTS) name no language, so Python Full Stack + AI and
 * every later "+ AI" track reuse them as they stand; the Spring topics are the Java code for the
 * same ideas. How a model works is not taught again — Year 1's T_GENAI is in the pack.
 */
export const TRACK_AI: Record<string, TopicSeed> = {
  /* ── Building with LLMs: the concepts (language-free) ── */
  JT_AI_CONCEPTS: { category: 'UNIVERSAL', units: [
    u('PROMPT_DESIGN', 'Prompts as Code: Roles, Examples and Structured Output', 'System and user messages, few-shot examples, asking for JSON against a schema, and prompts kept as templates.',
      ['Write a system prompt and template that returns valid structured output for a feature'], 45, { skillKeys: ['PROMPT_ENGINEERING'] }),
    u('TOKENS_COST_LIMITS', 'Tokens, Context Windows, Cost and Latency', 'What a call costs, why long context is slow and expensive, temperature, rate limits and timeouts.',
      ['Estimate the cost and latency of an LLM feature and choose a model and settings for it'], 35, { after: ['PROMPT_DESIGN'] }),
    u('EMBEDDINGS', 'Embeddings and Vector Search', 'Text as vectors, similarity, what a vector store does, and why keyword search still matters.',
      ['Explain embeddings and similarity search, and when they beat or lose to keyword search'], 40, { after: ['TOKENS_COST_LIMITS'], skillKeys: ['RAG_SYSTEMS'] }),
    u('RAG', 'Retrieval-Augmented Generation', 'Chunking, retrieving, grounding the answer in what was retrieved, citing sources, and saying "I don\'t know".',
      ['Design a RAG pipeline from documents to a grounded, cited answer'], 45, { after: ['EMBEDDINGS'], skillKeys: ['RAG_SYSTEMS'] }),
    u('EVALUATION_FAILURES', 'When LLM Features Fail: Evaluation, Injection and Guardrails', 'Hallucination, an evaluation set, prompt injection, leaking data, and failing safely.',
      ['Evaluate an LLM feature against test cases and defend it against prompt injection'], 40, { after: ['RAG'] }),
    ...ending('LLM Applications', 'EVALUATION_FAILURES', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── Generative AI in Spring Boot ── */
  JT_AI_SPRING: { category: 'UNIVERSAL', units: [
    u('SPRING_AI_SETUP', 'Spring AI: Calling a Model from Spring Boot', 'The ChatClient, a provider starter (OpenAI or Gemini), keys from the environment, and a first chat endpoint.',
      ['Call an LLM from a Spring Boot endpoint with Spring AI, with the key kept out of the code'], 45),
    u('STRUCTURED_OUTPUT', 'Prompt Templates and Structured Output in Java', 'Templates with parameters, mapping an answer to a Java record, and handling an answer that does not parse.',
      ['Turn a model answer into a validated Java object and handle the failure case'], 40, { after: ['SPRING_AI_SETUP'] }),
    u('STREAMING_REACT', 'Streaming a Chat Answer into React', 'A streamed response from Spring Boot, reading it in React as it arrives, and cancelling it.',
      ['Stream a chat answer from Spring Boot to a React UI token by token'], 45, { after: ['STRUCTURED_OUTPUT'] }),
    u('VECTOR_STORE', 'Embeddings and a Vector Store in Spring AI', 'Embedding documents, loading them into a vector store (PGVector or the simple store), and similarity search.',
      ['Ingest documents into a vector store with Spring AI and search them by meaning'], 45, { after: ['STREAMING_REACT'], skillKeys: ['RAG_SYSTEMS'] }),
    u('RAG', 'RAG in Spring Boot', 'Retrieval as an advisor, grounding and citations, and answering only from the app\'s own documents.',
      ['Answer questions over your own documents with Spring AI, citing what the answer used'], 50, { after: ['VECTOR_STORE'], skillKeys: ['RAG_SYSTEMS'] }),
    ...ending('Spring AI', 'RAG', { project: ['MINI_PROJECT', 'Mini Project — An AI Help Desk over Your Own Docs', 'A Spring Boot + React help desk that answers questions from a set of product documents with RAG: streamed answers, cited sources, an "I don\'t know" path and a small evaluation set.'] }),
  ] },

  /* ── Agentic AI: the concepts (language-free) ── */
  JT_AI_AGENTS: { category: 'UNIVERSAL', units: [
    u('WHAT_AGENT', 'What an Agent Is, and When Not to Build One', 'A model choosing actions in a loop; agents versus a fixed workflow; the cost of autonomy.',
      ['Decide whether a problem needs an agent, a fixed workflow or a single call'], 35),
    u('TOOLS', 'Tools and Function Calling', 'How a model asks to call a function, describing tools well, and validating every argument it sends.',
      ['Design tool definitions a model can use correctly and validate the calls it makes'], 40, { after: ['WHAT_AGENT'] }),
    u('WORKFLOWS', 'Multi-Step Workflows and Planning', 'Chaining, routing, plan-then-act, and stopping: loop limits and knowing when the task is done.',
      ['Design a multi-step agent workflow with a clear stopping condition'], 40, { after: ['TOOLS'] }),
    u('MEMORY', 'Memory: Short-Term and Long-Term', 'Conversation history and its limits, summarising, and storing facts for later sessions.',
      ['Choose what an agent remembers, for how long, and how it is retrieved'], 35, { after: ['WORKFLOWS'] }),
    u('MCP', 'MCP: The Model Context Protocol', 'Servers, clients, tools and resources, and why one standard beats a custom integration per app.',
      ['Explain MCP\'s parts and connect an agent to an existing MCP server'], 35, { after: ['MEMORY'] }),
    u('GUARDRAILS', 'Guardrails, Cost Limits and Testing an Agent', 'Permissions, human approval for risky actions, budgets and step limits, logs, and tests for behaviour.',
      ['Put limits and approvals around an agent and test that it behaves'], 40, { after: ['MCP'] }),
    ...ending('AI Agents', 'GUARDRAILS', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── Building agents in Java ── */
  JT_AI_AGENTS_JAVA: { category: 'UNIVERSAL', units: [
    u('TOOLS_SPRING', 'Tool Calling in Spring AI', 'Exposing Java methods as tools, what the model sees, and keeping the tool layer safe.',
      ['Give a Spring AI chat client tools backed by your own services, with checks on every call'], 45),
    u('MEMORY_SPRING', 'Chat Memory and a Stateful Assistant', 'Chat memory per user, how much history to keep, and storing it beyond one request.',
      ['Build an assistant that remembers a user\'s conversation, safely separated between users'], 40, { after: ['TOOLS_SPRING'] }),
    u('MCP_SPRING', 'MCP in Spring AI', 'Using an MCP server\'s tools from Spring AI, and exposing your own service as an MCP server.',
      ['Connect a Spring AI agent to an MCP server and expose one of your own'], 40, { after: ['MEMORY_SPRING'] }),
    ...ending('Java AI Agents', 'MCP_SPRING', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── The capstone ── */
  JT_CAPSTONE: { category: 'UNIVERSAL', units: [
    u('BRIEF', 'The Capstone: Scope, Architecture and Plan', 'Choosing between an e-commerce store and a job portal, the architecture, a design document and a build plan.',
      ['Scope the capstone, draw its architecture and write a plan you can deliver in the time'], 45),
    u('BUILD_CORE', 'Capstone Build — The Full-Stack Application', 'React, Spring Boot and MySQL: login and roles, the core features, tests, and a deployed first version.',
      ['Build and deploy the core application to the standard of the earlier projects'], 300, { unitType: 'PROJECT', after: ['BRIEF'] }),
    u('AI_FEATURES', 'Capstone Build — The AI Assistant and the Agent', 'A RAG assistant over the app\'s own catalogue or listings, and an agent that acts for the user with approval.',
      ['Add a grounded AI assistant and a guarded agent to the application and evaluate both'], 240, { unitType: 'PROJECT', after: ['BUILD_CORE'], skillKeys: ['LLM_APPLICATIONS', 'AI_AGENTS'] }),
    u('DEFENCE', 'Demo Day: Presenting and Defending the Capstone', 'A five-minute demo, the architecture walk-through, and the questions an interviewer will ask about it.',
      ['Demo the capstone and defend every design decision under questioning'], 45, { unitType: 'PRACTICE', after: ['AI_FEATURES'] }),
    u('CHECKPOINT', 'Capstone — Checkpoint', 'Where you actually are across the whole track, measured rather than felt.',
      ['Show full-stack and AI judgement at the standard a hiring panel expects'], 40, { unitType: 'CHECKPOINT', after: ['DEFENCE'] }),
  ] },
};
