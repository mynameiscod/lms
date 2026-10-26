/**
 * The career-track golden bank, assembled: Skill DNA questions for the skills a career track
 * teaches that no year measures — Java (the years teach in Python), Spring, JDBC and JPA, React,
 * modern JavaScript, Bootstrap, and building with LLMs.
 *
 * One file per skill, fifty items each, ten at every difficulty band, under the same rules as the
 * year banks (tests/trackGoldenBank.test.ts). Kept apart so it is imported, counted and certified
 * on its own: a track question never changes a year's inventory, and a skill a year already
 * measures keeps the questions it has.
 */
import { GoldenItem } from './types';
import { JAVA_BASICS } from './javaBasics';
import { JAVA_CONTROL_FLOW } from './javaControlFlow';
import { JAVA_ARRAYS } from './javaArrays';
import { JAVA_METHODS } from './javaMethods';
import { JAVA_OOP } from './javaOop';
import { JAVA_EXCEPTIONS } from './javaExceptions';
import { JAVA_COLLECTIONS } from './javaCollections';
import { JAVA_STREAMS } from './javaStreams';
import { JAVA_CONCURRENCY } from './javaConcurrency';
import { JDBC } from './jdbc';
import { JPA_HIBERNATE } from './jpaHibernate';
import { SPRING_CORE } from './springCore';
import { SPRING_BOOT } from './springBoot';
import { SPRING_SECURITY } from './springSecurity';
import { JS_FUNCTIONS } from './jsFunctions';
import { JS_ARRAYS_OBJECTS } from './jsArraysObjects';
import { JS_ES6 } from './jsEs6';
import { BOOTSTRAP } from './bootstrap';
import { RESPONSIVE_DESIGN } from './responsiveDesign';
import { REACT_COMPONENTS } from './reactComponents';
import { REACT_HOOKS } from './reactHooks';
import { REACT_ROUTING } from './reactRouting';
import { STATE_MANAGEMENT } from './stateManagement';
import { LLM_APPLICATIONS } from './llmApplications';
import { RAG_SYSTEMS } from './ragSystems';
import { AI_AGENTS } from './aiAgents';
import { PYTHON_FUNCTIONS } from './pythonFunctions';
import { PYTHON_ADVANCED } from './pythonAdvanced';
import { PYTHON_DB } from './pythonDb';
import { DJANGO } from './django';
import { DJANGO_REST } from './djangoRest';
import { FASTAPI } from './fastapi';
// .NET Full Stack + AI (batch N6).
import { CSHARP_BASICS } from './csharpBasics';
import { CSHARP_OOP } from './csharpOop';
import { CSHARP_EXCEPTIONS } from './csharpExceptions';
import { CSHARP_COLLECTIONS } from './csharpCollections';
import { CSHARP_LINQ } from './csharpLinq';
import { CSHARP_ASYNC } from './csharpAsync';
import { ADO_NET } from './adoNet';
import { EF_CORE } from './efCore';
import { DOTNET_DI } from './dotnetDi';
import { ASPNET_CORE } from './aspnetCore';
import { ASPNET_SECURITY } from './aspnetSecurity';
import { SQL_SERVER } from './sqlServer';
// Data Analytics + AI (batch A6).
import { SPREADSHEET_ANALYSIS } from './spreadsheetAnalysis';
import { SQL_AGGREGATION } from './sqlAggregation';
import { SQL_WINDOW_FUNCTIONS } from './sqlWindowFunctions';
import { DATA_CLEANING } from './dataCleaning';
import { DATA_QUALITY } from './dataQuality';
import { EXPLORATORY_ANALYSIS } from './exploratoryAnalysis';
import { DATA_VISUALISATION } from './dataVisualisation';
import { STATISTICS_BASICS } from './statisticsBasics';
import { PROBABILITY_BASICS } from './probabilityBasics';
import { HYPOTHESIS_TESTING } from './hypothesisTesting';
import { DASHBOARDING } from './dashboarding';
import { BUSINESS_METRICS } from './businessMetrics';
// Data Science + AI (batch S6).
import { ML_CONCEPTS } from './mlConcepts';
import { ML_SUPERVISED } from './mlSupervised';
import { ML_UNSUPERVISED } from './mlUnsupervised';
import { ML_EVALUATION } from './mlEvaluation';
import { ML_FEATURE_ENGINEERING } from './mlFeatureEngineering';
import { ML_OVERFITTING } from './mlOverfitting';
import { NEURAL_NETWORKS } from './neuralNetworks';
import { DL_TRAINING } from './dlTraining';
import { DL_TRANSFORMERS } from './dlTransformers';
import { VECTOR_EMBEDDINGS } from './vectorEmbeddings';
import { MODEL_DEPLOYMENT } from './modelDeployment';
import { EXPERIMENT_TRACKING } from './experimentTracking';
import { MODEL_MONITORING } from './modelMonitoring';
import { LLM_FUNDAMENTALS } from './llmFundamentals';
import { RAG_FUNDAMENTALS } from './ragFundamentals';
import { VECTOR_DATABASES } from './vectorDatabases';
import { LLM_EVALUATION } from './llmEvaluation';
import { AI_GUARDRAILS } from './aiGuardrails';
import { PROMPT_INJECTION } from './promptInjection';
import { AI_RESPONSIBLE } from './aiResponsible';
import { GENAI_APP_PATTERNS } from './genaiAppPatterns';
import { LLM_FINE_TUNING } from './llmFineTuning';
import { AGENT_FUNDAMENTALS } from './agentFundamentals';
import { TOOL_CALLING } from './toolCalling';
import { AGENT_ORCHESTRATION } from './agentOrchestration';
import { AGENT_MEMORY } from './agentMemory';
import { AGENT_EVALUATION } from './agentEvaluation';
import { ML_PIPELINES } from './mlPipelines';
import { MODEL_VERSIONING } from './modelVersioning';
import { LLM_SECURITY } from './llmSecurity';
import { MODEL_RED_TEAMING } from './modelRedTeaming';
import { AUTHENTICATION_AUTHZ } from './authenticationAuthz';
import { CLOUD_NETWORKING } from './cloudNetworking';
import { CLOUD_STORAGE } from './cloudStorage';
import { CRYPTOGRAPHY_BASICS } from './cryptographyBasics';
import { IAM_FUNDAMENTALS } from './iamFundamentals';
import { INCIDENT_RESPONSE } from './incidentResponse';
import { LINUX_ADMIN } from './linuxAdmin';
import { NETWORK_SECURITY } from './networkSecurity';
import { OWASP_TOP_TEN } from './owaspTopTen';
import { SIEM_MONITORING } from './siemMonitoring';
import { THREAT_MODELLING } from './threatModelling';
import { VULNERABILITY_MANAGEMENT } from './vulnerabilityManagement';

export const TRACK_BANK: GoldenItem[] = [
  ...JAVA_BASICS,
  ...JAVA_CONTROL_FLOW,
  ...JAVA_ARRAYS,
  ...JAVA_METHODS,
  ...JAVA_OOP,
  ...JAVA_EXCEPTIONS,
  ...JAVA_COLLECTIONS,
  ...JAVA_STREAMS,
  ...JAVA_CONCURRENCY,
  ...JDBC,
  ...JPA_HIBERNATE,
  ...SPRING_CORE,
  ...SPRING_BOOT,
  ...SPRING_SECURITY,
  ...JS_FUNCTIONS,
  ...JS_ARRAYS_OBJECTS,
  ...JS_ES6,
  ...BOOTSTRAP,
  ...RESPONSIVE_DESIGN,
  ...REACT_COMPONENTS,
  ...REACT_HOOKS,
  ...REACT_ROUTING,
  ...STATE_MANAGEMENT,
  ...LLM_APPLICATIONS,
  ...RAG_SYSTEMS,
  ...AI_AGENTS,
  ...PYTHON_FUNCTIONS,
  ...PYTHON_ADVANCED,
  ...PYTHON_DB,
  ...DJANGO,
  ...DJANGO_REST,
  ...FASTAPI,
  ...CSHARP_BASICS,
  ...CSHARP_OOP,
  ...CSHARP_EXCEPTIONS,
  ...CSHARP_COLLECTIONS,
  ...CSHARP_LINQ,
  ...CSHARP_ASYNC,
  ...ADO_NET,
  ...EF_CORE,
  ...DOTNET_DI,
  ...ASPNET_CORE,
  ...ASPNET_SECURITY,
  ...SQL_SERVER,
  ...SPREADSHEET_ANALYSIS,
  ...SQL_AGGREGATION,
  ...SQL_WINDOW_FUNCTIONS,
  ...DATA_CLEANING,
  ...DATA_QUALITY,
  ...EXPLORATORY_ANALYSIS,
  ...DATA_VISUALISATION,
  ...STATISTICS_BASICS,
  ...PROBABILITY_BASICS,
  ...HYPOTHESIS_TESTING,
  ...DASHBOARDING,
  ...BUSINESS_METRICS,
  ...ML_CONCEPTS,
  ...ML_SUPERVISED,
  ...ML_UNSUPERVISED,
  ...ML_EVALUATION,
  ...ML_FEATURE_ENGINEERING,
  ...ML_OVERFITTING,
  ...NEURAL_NETWORKS,
  ...DL_TRAINING,
  ...DL_TRANSFORMERS,
  ...VECTOR_EMBEDDINGS,
  ...MODEL_DEPLOYMENT,
  ...EXPERIMENT_TRACKING,
  ...MODEL_MONITORING,
  ...LLM_FUNDAMENTALS,
  ...RAG_FUNDAMENTALS,
  ...VECTOR_DATABASES,
  ...LLM_EVALUATION,
  ...AI_GUARDRAILS,
  ...PROMPT_INJECTION,
  ...AI_RESPONSIBLE,
  ...GENAI_APP_PATTERNS,
  ...LLM_FINE_TUNING,
  ...AGENT_FUNDAMENTALS,
  ...TOOL_CALLING,
  ...AGENT_ORCHESTRATION,
  ...AGENT_MEMORY,
  ...AGENT_EVALUATION,
  ...ML_PIPELINES,
  ...MODEL_VERSIONING,
  ...LLM_SECURITY,
  ...MODEL_RED_TEAMING,
  ...AUTHENTICATION_AUTHZ,
  ...CLOUD_NETWORKING,
  ...CLOUD_STORAGE,
  ...CRYPTOGRAPHY_BASICS,
  ...IAM_FUNDAMENTALS,
  ...INCIDENT_RESPONSE,
  ...LINUX_ADMIN,
  ...NETWORK_SECURITY,
  ...OWASP_TOP_TEN,
  ...SIEM_MONITORING,
  ...THREAT_MODELLING,
  ...VULNERABILITY_MANAGEMENT,
];
