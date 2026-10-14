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
];
