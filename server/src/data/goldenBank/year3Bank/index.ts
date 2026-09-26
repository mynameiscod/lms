/**
 * The Year-3 golden bank, assembled.
 *
 * One file per skill, fifty items each, ten at every difficulty band. Kept apart from the Year-1
 * and Year-2 banks because the three are imported, counted and certified separately: a Year-3
 * question must never change a Year-2 inventory, and a skill an earlier year already measures
 * keeps the questions it has rather than gaining a second set.
 *
 * ── WHAT BELONGS HERE ─────────────────────────────────────────────────────────────────────
 *
 * Only the skills Year 3 introduces. Of the 84 active skills in its stage set, 49 already had
 * three or more questions from the earlier years the day Year 3 was seeded — CODE_REVIEW,
 * REST_APIS, DSA_TREES and the rest are measured perfectly well by the banks that already exist.
 * The 35 that had none are what this file is for, and reusing the others is deliberate rather
 * than an omission.
 */

import { GoldenItem } from './types';
import { DESIGN_PATTERNS } from './designPatterns';
import { SOFTWARE_ARCHITECTURE } from './softwareArchitecture';
import { AUTHENTICATION } from './authentication';
import { AUTHORIZATION } from './authorization';
import { DSA_GRAPHS } from './dsaGraphs';
import { DSA_DP } from './dsaDp';
import { DSA_HEAPS } from './dsaHeaps';
import { REFACTORING } from './refactoring';
import { AUTOMATED_TESTING } from './automatedTesting';
import { API_DESIGN } from './apiDesign';
import { DB_INDEXING } from './dbIndexing';
import { QUERY_OPTIMIZATION } from './queryOptimization';
import { CACHING } from './caching';
import { CONTAINERS_DOCKER } from './containersDocker';
import { CI_CD } from './ciCd';
import { DEPLOYMENT } from './deployment';
import { WEB_SECURITY } from './webSecurity';
import { SECURE_CODING } from './secureCoding';
import { THREAT_MODELING } from './threatModeling';
import { ERROR_HANDLING_DESIGN } from './errorHandlingDesign';
import { LOGGING_DIAGNOSTICS } from './loggingDiagnostics';
import { MONITORING_OBSERVABILITY } from './monitoringObservability';

export const YEAR3_BANK: GoldenItem[] = [
  ...DESIGN_PATTERNS,
  ...SOFTWARE_ARCHITECTURE,
  ...AUTHENTICATION,
  ...AUTHORIZATION,
  ...DSA_GRAPHS,
  ...DSA_DP,
  ...DSA_HEAPS,
  ...REFACTORING,
  ...AUTOMATED_TESTING,
  ...API_DESIGN,
  ...DB_INDEXING,
  ...QUERY_OPTIMIZATION,
  ...CACHING,
  ...CONTAINERS_DOCKER,
  ...CI_CD,
  ...DEPLOYMENT,
  ...WEB_SECURITY,
  ...SECURE_CODING,
  ...THREAT_MODELING,
  ...ERROR_HANDLING_DESIGN,
  ...LOGGING_DIAGNOSTICS,
  ...MONITORING_OBSERVABILITY,
];

export { GoldenItem };
