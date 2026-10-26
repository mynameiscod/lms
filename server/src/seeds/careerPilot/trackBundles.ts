/**
 * Every authored career-track content bundle (stage `track`), in one list. Seeded with
 * `seedPilotUnitContent.ts <tenantId> --track`; held to the same quality rules as every year
 * (tests/trackContentQuality.test.ts).
 */
import crypto from 'crypto';
import { PilotBundle } from './pilotUnitContent';
import { TRACK_BOOTSTRAP_BUNDLES } from './trackContentBootstrap';
import { TRACK_JAVASCRIPT_BUNDLES } from './trackContentJavaScript';
import { TRACK_REACT_CORE_BUNDLES } from './trackContentReactCore';
import { TRACK_REACT_APPS_BUNDLES } from './trackContentReactApps';
import { TRACK_JAVA_CORE_BUNDLES } from './trackContentJavaCore';
import { TRACK_JAVA_OOP_BUNDLES } from './trackContentJavaOop';
import { TRACK_JAVA_COLLECTIONS_BUNDLES } from './trackContentJavaCollections';
import { TRACK_JAVA_CONCURRENCY_DSA_BUNDLES } from './trackContentJavaConcurrencyDsa';
import { TRACK_JAVA_DSA_NONLINEAR_BUNDLES } from './trackContentJavaDsaNonlinear';
import { TRACK_MYSQL_BUNDLES } from './trackContentMysql';
import { TRACK_JDBC_BUNDLES } from './trackContentJdbc';
import { TRACK_JPA_BUNDLES } from './trackContentJpa';
import { TRACK_SPRING_CORE_BUNDLES } from './trackContentSpringCore';
import { TRACK_BOOT_REST_BUNDLES } from './trackContentBootRest';
import { TRACK_BOOT_DATA_BUNDLES } from './trackContentBootData';
import { TRACK_BOOT_SECURITY_BUNDLES } from './trackContentBootSecurity';
import { TRACK_BOOT_TESTING_BUNDLES } from './trackContentBootTesting';
import { TRACK_FULLSTACK_BUNDLES } from './trackContentFullstack';
import { TRACK_AI_CONCEPTS_BUNDLES } from './trackContentAiConcepts';
import { TRACK_AI_SPRING_BUNDLES } from './trackContentAiSpring';
import { TRACK_AI_AGENTS_BUNDLES } from './trackContentAiAgents';
import { TRACK_AI_AGENTS_JAVA_BUNDLES } from './trackContentAiAgentsJava';
import { TRACK_CAPSTONE_BUNDLES } from './trackContentCapstone';
import { TRACK_IV_CORE_JAVA_BUNDLES } from './trackContentIvCoreJava';
import { TRACK_IV_SPRING_BUNDLES } from './trackContentIvSpring';
import { TRACK_IV_FRONTEND_BUNDLES } from './trackContentIvFrontend';
import { TRACK_IV_SQL_AI_BUNDLES } from './trackContentIvSqlAi';
import { TRACK_CODING_JAVA_BUNDLES } from './trackContentCodingJava';
import { TRACK_PLACE_JAVA_FS_BUNDLES } from './trackContentPlaceJavaFs';
import { TRACK_PY_MODERN_BUNDLES } from './trackContentPyModern';
import { TRACK_PY_TESTING_BUNDLES } from './trackContentPyTesting';
import { TRACK_PY_MYSQL_BUNDLES } from './trackContentPyMysql';
import { TRACK_DJANGO_CORE_BUNDLES } from './trackContentDjangoCore';
import { TRACK_DJANGO_ORM_BUNDLES } from './trackContentDjangoOrm';
import { TRACK_DRF_BUNDLES } from './trackContentDrf';
import { TRACK_DJANGO_AUTH_BUNDLES } from './trackContentDjangoAuth';
import { TRACK_DJANGO_TESTING_BUNDLES } from './trackContentDjangoTesting';
import { TRACK_FULLSTACK_PY_BUNDLES } from './trackContentFullstackPy';
import { TRACK_FASTAPI_BUNDLES } from './trackContentFastApi';
import { TRACK_AI_PY_BUNDLES } from './trackContentAiPy';
import { TRACK_AI_AGENTS_PY_BUNDLES } from './trackContentAiAgentsPy';
import { TRACK_CAPSTONE_PY_BUNDLES } from './trackContentCapstonePy';
import { TRACK_IV_PYTHON_BUNDLES } from './trackContentIvPython';
import { TRACK_CS_CORE_BUNDLES } from './trackContentCsCore';
import { TRACK_CS_OOP_BUNDLES } from './trackContentCsOop';
import { TRACK_CS_COLLECTIONS_BUNDLES } from './trackContentCsCollections';
import { TRACK_CS_ASYNC_DSA_BUNDLES } from './trackContentCsAsyncDsa';
import { TRACK_CS_DSA_NONLINEAR_BUNDLES } from './trackContentCsDsaNonlinear';
import { TRACK_CS_SQLSERVER_BUNDLES } from './trackContentCsSqlServer';
import { TRACK_CS_ADONET_BUNDLES } from './trackContentCsAdoNet';
import { TRACK_CS_EFCORE_BUNDLES } from './trackContentCsEfCore';
import { TRACK_CS_DI_BUNDLES } from './trackContentCsDi';
import { TRACK_CS_ASPNET_API_BUNDLES } from './trackContentCsAspnetApi';
import { TRACK_CS_ASPNET_DATA_SECURITY_BUNDLES } from './trackContentCsAspnetDataSecurity';
import { TRACK_CS_ASPNET_TESTING_BUNDLES } from './trackContentCsAspnetTesting';
import { TRACK_CS_FULLSTACK_BUNDLES } from './trackContentCsFullstack';
import { TRACK_CS_AI_BUNDLES } from './trackContentCsAi';
import { TRACK_CS_AGENTS_CAPSTONE_BUNDLES } from './trackContentCsAgentsCapstone';
import { TRACK_CS_IV_BUNDLES } from './trackContentCsIv';
import { TRACK_CS_CODING_BUNDLES } from './trackContentCsCoding';
import { TRACK_CS_PLACE_FS_BUNDLES } from './trackContentCsPlaceFs';
import { TRACK_DATA_EXCEL_BUNDLES } from './trackContentDataExcel';
import { TRACK_DATA_SQL_BUNDLES } from './trackContentDataSql';
import { TRACK_DATA_PANDAS_BUNDLES } from './trackContentDataPandas';
import { TRACK_DATA_CLEANING_EDA_BUNDLES } from './trackContentDataCleaningEda';
import { TRACK_DATA_STATS_BUNDLES } from './trackContentDataStats';
import { TRACK_DATA_PBI_MODEL_DAX_BUNDLES } from './trackContentDataPbiModelDax';
import { TRACK_DATA_PBI_REPORTS_BUNDLES } from './trackContentDataPbiReports';
import { TRACK_DATA_METRICS_CAPSTONE_BUNDLES } from './trackContentDataMetricsCapstone';
import { TRACK_DATA_AI_ANALYST_BUNDLES } from './trackContentDataAiAnalyst';
import { TRACK_DATA_IV_SQL_BUNDLES } from './trackContentDataIvSql';
import { TRACK_DATA_IV_TOOLS_STATS_BUNDLES } from './trackContentDataIvToolsStats';
import { TRACK_DATA_CASES_CANDIDATE_BUNDLES } from './trackContentDataCasesCandidate';
import { TRACK_DS_MATH_WORKFLOW_BUNDLES } from './trackContentDsMathWorkflow';
import { TRACK_DS_SUPERVISED_BUNDLES } from './trackContentDsSupervised';
import { TRACK_DS_ENSEMBLES_EVAL_BUNDLES } from './trackContentDsEnsemblesEval';
import { TRACK_DS_FEATURES_UNSUP_BUNDLES } from './trackContentDsFeaturesUnsup';
import { TRACK_DS_TIME_SERIES_BUNDLES } from './trackContentDsTimeSeries';
import { TRACK_DS_DEEP_LEARNING_BUNDLES } from './trackContentDsDeepLearning';
import { TRACK_DS_NLP_GENAI_BUNDLES } from './trackContentDsNlpGenai';
import { TRACK_DS_DEPLOYMENT_BUNDLES } from './trackContentDsDeployment';
import { TRACK_DS_CAPSTONE_BUNDLES } from './trackContentDsCapstone';
import { TRACK_DS_IV_ML_BUNDLES } from './trackContentDsIvMl';
import { TRACK_DS_CASE_PROBABILITY_BUNDLES } from './trackContentDsCaseProbability';
import { TRACK_DS_CODING_CANDIDATE_BUNDLES } from './trackContentDsCodingCandidate';
import { TRACK_IV_DJANGO_BUNDLES } from './trackContentIvDjango';
import { TRACK_CODING_PYTHON_BUNDLES } from './trackContentCodingPython';
import { TRACK_PLACE_PY_FS_BUNDLES } from './trackContentPlacePyFs';

import { TRACK_AI_LLM_INTERNALS_BUNDLES } from './trackContentAiLlmInternals';
import { TRACK_AI_RAG_DEEP_BUNDLES } from './trackContentAiRagDeep';
import { TRACK_AI_EVAL_SAFETY_BUNDLES } from './trackContentAiEvalSafety';
import { TRACK_AI_PRODUCTION_BUNDLES } from './trackContentAiProduction';
import { TRACK_AI_FINE_TUNING_BUNDLES } from './trackContentAiFineTuning';
import { TRACK_AI_MULTIMODAL_BUNDLES } from './trackContentAiMultimodal';
import { TRACK_AI_CAPSTONES_BUNDLES } from './trackContentAiCapstones';
import { TRACK_AI_AGENT_ORCHESTRATION_BUNDLES } from './trackContentAiAgentOrchestration';
import { TRACK_AI_AGENT_TOOLS_MEMORY_BUNDLES } from './trackContentAiAgentToolsMemory';
import { TRACK_AI_AGENT_EVAL_OPS_BUNDLES } from './trackContentAiAgentEvalOps';
import { TRACK_AI_CAPSTONE_AGENTIC_BUNDLES } from './trackContentAiCapstoneAgentic';
import { TRACK_MLOPS_PIPELINES_BUNDLES } from './trackContentMlopsPipelines';
import { TRACK_MLOPS_CICD_INFRA_BUNDLES } from './trackContentMlopsCicdInfra';
import { TRACK_MLOPS_MONITORING_BUNDLES } from './trackContentMlopsMonitoring';
import { TRACK_AI_CAPSTONE_MLOPS_BUNDLES } from './trackContentAiCapstoneMlops';

type Mcq = { question: string; options: { text: string; isCorrect: boolean }[] };

/*
 * WHERE THE RIGHT ANSWER SITS. Writers put the correct option first far more often than not, and
 * practice renders options in written order — so a student learns "pick A". Each question's
 * correct option is moved to a position chosen by a hash of its own text: spread evenly, the same
 * on every run (so seeded rows do not churn), and the distractors keep their written order.
 * No option or explanation refers to a position, so moving them changes nothing else.
 */
const placed = <T extends Mcq>(q: T): T => {
  const correct = q.options.find(o => o.isCorrect);
  if (!correct) return q;
  const rest = q.options.filter(o => o !== correct);
  const at = crypto.createHash('md5').update(q.question).digest().readUInt32BE(0) % q.options.length;
  return { ...q, options: [...rest.slice(0, at), correct, ...rest.slice(at)] };
};
const balanced = (b: PilotBundle): PilotBundle => ({
  ...b,
  mcqs: b.mcqs?.map(placed),
  checkpoint: b.checkpoint?.map(placed),
});

export const ALL_TRACK_BUNDLES: PilotBundle[] = [
  ...TRACK_BOOTSTRAP_BUNDLES,
  ...TRACK_JAVASCRIPT_BUNDLES,
  ...TRACK_REACT_CORE_BUNDLES,
  ...TRACK_REACT_APPS_BUNDLES,
  ...TRACK_JAVA_CORE_BUNDLES,
  ...TRACK_JAVA_OOP_BUNDLES,
  ...TRACK_JAVA_COLLECTIONS_BUNDLES,
  ...TRACK_JAVA_CONCURRENCY_DSA_BUNDLES,
  ...TRACK_JAVA_DSA_NONLINEAR_BUNDLES,
  ...TRACK_MYSQL_BUNDLES,
  ...TRACK_JDBC_BUNDLES,
  ...TRACK_JPA_BUNDLES,
  ...TRACK_SPRING_CORE_BUNDLES,
  ...TRACK_BOOT_REST_BUNDLES,
  ...TRACK_BOOT_DATA_BUNDLES,
  ...TRACK_BOOT_SECURITY_BUNDLES,
  ...TRACK_BOOT_TESTING_BUNDLES,
  ...TRACK_FULLSTACK_BUNDLES,
  ...TRACK_AI_CONCEPTS_BUNDLES,
  ...TRACK_AI_SPRING_BUNDLES,
  ...TRACK_AI_AGENTS_BUNDLES,
  ...TRACK_AI_AGENTS_JAVA_BUNDLES,
  ...TRACK_CAPSTONE_BUNDLES,
  ...TRACK_IV_CORE_JAVA_BUNDLES,
  ...TRACK_IV_SPRING_BUNDLES,
  ...TRACK_IV_FRONTEND_BUNDLES,
  ...TRACK_IV_SQL_AI_BUNDLES,
  ...TRACK_CODING_JAVA_BUNDLES,
  ...TRACK_PLACE_JAVA_FS_BUNDLES,
  ...TRACK_PY_MODERN_BUNDLES,
  ...TRACK_PY_TESTING_BUNDLES,
  ...TRACK_PY_MYSQL_BUNDLES,
  ...TRACK_DJANGO_CORE_BUNDLES,
  ...TRACK_DJANGO_ORM_BUNDLES,
  ...TRACK_DRF_BUNDLES,
  ...TRACK_DJANGO_AUTH_BUNDLES,
  ...TRACK_DJANGO_TESTING_BUNDLES,
  ...TRACK_FULLSTACK_PY_BUNDLES,
  ...TRACK_FASTAPI_BUNDLES,
  ...TRACK_AI_PY_BUNDLES,
  ...TRACK_AI_AGENTS_PY_BUNDLES,
  ...TRACK_CAPSTONE_PY_BUNDLES,
  ...TRACK_IV_PYTHON_BUNDLES,
  ...TRACK_IV_DJANGO_BUNDLES,
  ...TRACK_CODING_PYTHON_BUNDLES,
  ...TRACK_PLACE_PY_FS_BUNDLES,
  ...TRACK_CS_CORE_BUNDLES,
  ...TRACK_CS_OOP_BUNDLES,
  ...TRACK_CS_COLLECTIONS_BUNDLES,
  ...TRACK_CS_ASYNC_DSA_BUNDLES,
  ...TRACK_CS_DSA_NONLINEAR_BUNDLES,
  ...TRACK_CS_SQLSERVER_BUNDLES,
  ...TRACK_CS_ADONET_BUNDLES,
  ...TRACK_CS_EFCORE_BUNDLES,
  ...TRACK_CS_DI_BUNDLES,
  ...TRACK_CS_ASPNET_API_BUNDLES,
  ...TRACK_CS_ASPNET_DATA_SECURITY_BUNDLES,
  ...TRACK_CS_ASPNET_TESTING_BUNDLES,
  ...TRACK_CS_FULLSTACK_BUNDLES,
  ...TRACK_CS_AI_BUNDLES,
  ...TRACK_CS_AGENTS_CAPSTONE_BUNDLES,
  ...TRACK_CS_IV_BUNDLES,
  ...TRACK_CS_CODING_BUNDLES,
  ...TRACK_CS_PLACE_FS_BUNDLES,
  ...TRACK_DATA_EXCEL_BUNDLES,
  ...TRACK_DATA_SQL_BUNDLES,
  ...TRACK_DATA_PANDAS_BUNDLES,
  ...TRACK_DATA_CLEANING_EDA_BUNDLES,
  ...TRACK_DATA_STATS_BUNDLES,
  ...TRACK_DATA_PBI_MODEL_DAX_BUNDLES,
  ...TRACK_DATA_PBI_REPORTS_BUNDLES,
  ...TRACK_DATA_METRICS_CAPSTONE_BUNDLES,
  ...TRACK_DATA_AI_ANALYST_BUNDLES,
  ...TRACK_DATA_IV_SQL_BUNDLES,
  ...TRACK_DATA_IV_TOOLS_STATS_BUNDLES,
  ...TRACK_DATA_CASES_CANDIDATE_BUNDLES,
  ...TRACK_DS_MATH_WORKFLOW_BUNDLES,
  ...TRACK_DS_SUPERVISED_BUNDLES,
  ...TRACK_DS_ENSEMBLES_EVAL_BUNDLES,
  ...TRACK_DS_FEATURES_UNSUP_BUNDLES,
  ...TRACK_DS_TIME_SERIES_BUNDLES,
  ...TRACK_DS_DEEP_LEARNING_BUNDLES,
  ...TRACK_DS_NLP_GENAI_BUNDLES,
  ...TRACK_DS_DEPLOYMENT_BUNDLES,
  ...TRACK_DS_CAPSTONE_BUNDLES,
  ...TRACK_DS_IV_ML_BUNDLES,
  ...TRACK_DS_CASE_PROBABILITY_BUNDLES,
  ...TRACK_DS_CODING_CANDIDATE_BUNDLES,
  ...TRACK_AI_LLM_INTERNALS_BUNDLES,
  ...TRACK_AI_RAG_DEEP_BUNDLES,
  ...TRACK_AI_EVAL_SAFETY_BUNDLES,
  ...TRACK_AI_PRODUCTION_BUNDLES,
  ...TRACK_AI_FINE_TUNING_BUNDLES,
  ...TRACK_AI_MULTIMODAL_BUNDLES,
  ...TRACK_AI_CAPSTONES_BUNDLES,
  ...TRACK_AI_AGENT_ORCHESTRATION_BUNDLES,
  ...TRACK_AI_AGENT_TOOLS_MEMORY_BUNDLES,
  ...TRACK_AI_AGENT_EVAL_OPS_BUNDLES,
  ...TRACK_AI_CAPSTONE_AGENTIC_BUNDLES,
  ...TRACK_MLOPS_PIPELINES_BUNDLES,
  ...TRACK_MLOPS_CICD_INFRA_BUNDLES,
  ...TRACK_MLOPS_MONITORING_BUNDLES,
  ...TRACK_AI_CAPSTONE_MLOPS_BUNDLES,
].map(balanced);
