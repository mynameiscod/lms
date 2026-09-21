/**
 * Every authored Year-1 content bundle, in one list.
 *
 * Split across files because one module of thirty thousand lines is unreviewable, not because
 * they are different kinds of thing — the seed treats them identically.
 *
 * WHY THIS IS ITS OWN MODULE. The seed script is an IIFE: importing it runs it. QA tooling needs
 * the authored source of truth without connecting to a database or writing anything, so the
 * registry lives here and the seed imports it. One list, two readers, no chance of the audit
 * checking a different set of bundles than the seed writes.
 */

import { PilotBundle } from './pilotUnitContent';
import { YEAR1_BUNDLES } from './year1UnitContent';
import { PROGRAMMING_SPINE_BUNDLES } from './year1ContentProgramming';
import { VERIFICATION_BUNDLES } from './year1ContentVerification';
import { FUNCTIONS_BUNDLES } from './year1ContentFunctions';
import { PSEUDOCODE_BOOLEAN_BUNDLES } from './year1ContentPseudocodeBoolean';
import { ACCESSIBILITY_FORMS_BUNDLES } from './year1ContentAccessibilityForms';
import { JS_DOM_BUNDLES } from './year1ContentJsDom';
import { ML_INTRO_BUNDLES } from './year1ContentMlIntro';
import { NETWORKING_BUNDLES } from './year1ContentNetworking';
import { STATS_BUNDLES } from './year1ContentStats';
import { SQL_BUNDLES } from './year1ContentSql';
import { SHELL_BUNDLES } from './year1ContentShell';
import { CSS_BUNDLES } from './year1ContentCss';
import { ARRAYS_BUNDLES } from './year1ContentArrays';
import { CAREER_MAP_BUNDLES } from './year1ContentCareerMap';
import { C_BASICS_BUNDLES } from './year1ContentCBasics';
import { FILES_EDITOR_BUNDLES } from './year1ContentFilesEditor';
import { HARDWARE_NUMBERS_BUNDLES } from './year1ContentHardwareNumbers';
import { HTTP_BUNDLES } from './year1ContentHttp';
import { DECOMPOSITION_BUNDLES } from './year1ContentDecomposition';
import { OPERATING_SYSTEMS_BUNDLES } from './year1ContentOperatingSystems';
import { COMMUNICATION_CAPSTONE_BUNDLES } from './year1ContentCommunicationCapstone';
import { AI_BUNDLES } from './year1ContentAi';
import { VARIABLES_GIT_BUNDLES } from './year1ContentVariablesGit';
import { CAPACITY_BUNDLES } from './year1ContentCapacityUnits';
import { SOFTWARE_CORE_BUNDLES } from './year1ContentSoftwareCore';
import { APTITUDE_BUNDLES } from './year1ContentAptitude';
import { LOGIC_MATH_BUNDLES } from './year1ContentLogicMath';
/* Direction topics that had no units of their own. Seeded as DRAFT units; an admin publishes. */
import { FIRST_BACKEND_BUNDLES } from './year1ContentFirstBackend';
import { MOBILE_APPS_BUNDLES } from './year1ContentMobileApps';
import { DATA_WRANGLING_BUNDLES } from './year1ContentDataWrangling';
import { SECURITY_THINKING_BUNDLES } from './year1ContentSecurityThinking';

export const ALL_BUNDLES: PilotBundle[] = [
  ...YEAR1_BUNDLES, ...PROGRAMMING_SPINE_BUNDLES, ...VERIFICATION_BUNDLES,
  ...FUNCTIONS_BUNDLES, ...PSEUDOCODE_BOOLEAN_BUNDLES, ...ACCESSIBILITY_FORMS_BUNDLES,
  ...JS_DOM_BUNDLES, ...ML_INTRO_BUNDLES, ...NETWORKING_BUNDLES, ...STATS_BUNDLES,
  ...SQL_BUNDLES, ...SHELL_BUNDLES, ...CSS_BUNDLES, ...ARRAYS_BUNDLES, ...CAREER_MAP_BUNDLES,
  ...C_BASICS_BUNDLES, ...FILES_EDITOR_BUNDLES, ...HARDWARE_NUMBERS_BUNDLES,
  ...HTTP_BUNDLES, ...DECOMPOSITION_BUNDLES, ...OPERATING_SYSTEMS_BUNDLES,
  ...COMMUNICATION_CAPSTONE_BUNDLES, ...AI_BUNDLES,
  ...VARIABLES_GIT_BUNDLES, ...CAPACITY_BUNDLES, ...SOFTWARE_CORE_BUNDLES,
  ...APTITUDE_BUNDLES, ...LOGIC_MATH_BUNDLES,
  ...FIRST_BACKEND_BUNDLES, ...MOBILE_APPS_BUNDLES, ...DATA_WRANGLING_BUNDLES, ...SECURITY_THINKING_BUNDLES,
];
