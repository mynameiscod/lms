/**
 * CareerPilot mission library — stage- and goal-tagged daily missions.
 *
 * The problem this fixes: the assessment became precisely targeted (stage + goal +
 * background) while the missions that follow it stayed generic. A first-year targeting AI
 * sat a tailored paper, scored against it, and then received the same twenty missions as
 * a graduating developer. Twenty missions across a ninety-day roadmap also means the same
 * task returns every fortnight, which reads as an empty product however good each one is.
 *
 * Tagging rules used throughout:
 *
 *   stages  — which point in a course this makes sense at. A first-year cannot "add a
 *             project to your resume"; a final-year does not need "install an editor".
 *   goals   — role interest. Left EMPTY wherever the work is genuinely shared, because a
 *             tag that narrows without reason just makes the pool thinner. Aptitude,
 *             reasoning and most communication work is the same whoever you are.
 *   type    — drives the icon and the XP band the UI already uses.
 *   link    — where the member lands. /careerpilot/... directly: the /passport/... paths
 *             still redirect, but a redirect that has to preserve a query string is one
 *             more thing that can silently drop it.
 *
 * Every mission is one sitting — twenty minutes to an hour. A mission that cannot be
 * finished the day it appears breaks the streak the product is built around.
 *
 * Run: npx ts-node src/scripts/seedMissionLibrary.ts <tenantId>
 * Idempotent on (pool category, title). Re-running updates tags and text in place.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PassportContent from '../models/PassportContent';

dotenv.config();

interface M {
  category: string;          // pool it belongs to
  title: string;
  detail: string;
  type: string;              // learn | practice | aptitude | communication | resume | mock
  xp: number;
  link?: string;
  stages?: string[];
  goals?: string[];
}

const F = ['foundation'];
const B = ['build'];
const P = ['placement'];
const SEEK = ['placement', 'job_seeker'];
const FB = ['foundation', 'build'];
const BP = ['build', 'placement'];
const LATER = ['build', 'placement', 'job_seeker'];

const SD = ['Software Development'];
const DA = ['Data Analytics'];
const AI = ['AI-Ready'];

const PRACTICE_CODE = '/careerpilot/practice?kind=coding';
const PRACTICE_SQL  = '/careerpilot/practice?kind=sql';
const PRACTICE_MCQ  = '/careerpilot/practice?kind=mcq';
const INTERVIEW     = '/careerpilot/interview';
const RESUME        = '/careerpilot/resume';
const ROADMAP       = '/careerpilot/roadmap';

export const MISSIONS: M[] = [

  /* ══════════════════════════════════════════════════════════════════════════
     TECHNICAL — Foundation
     Nothing here assumes a prior project, a repository, or a language already
     chosen. The work is getting a beginner to write and run their own code.
     ══════════════════════════════════════════════════════════════════════════ */
  { category: 'technical', stages: F, goals: SD, type: 'practice', xp: 25, link: PRACTICE_CODE,
    title: 'Write your first loop', detail: 'Print the numbers 1 to 20, then only the even ones. Run it and confirm the output.' },
  { category: 'technical', stages: F, goals: SD, type: 'practice', xp: 25, link: PRACTICE_CODE,
    title: 'Conditions practice', detail: 'Write a program that reads a mark and prints Pass or Fail. Add a Distinction case above 75.' },
  { category: 'technical', stages: F, goals: SD, type: 'practice', xp: 30, link: PRACTICE_CODE,
    title: 'Your first function', detail: 'Write a function that takes two numbers and returns the larger. Call it three times with different values.' },
  { category: 'technical', stages: F, goals: SD, type: 'practice', xp: 30, link: PRACTICE_CODE,
    title: 'Loop inside a loop', detail: 'Print a 5x5 grid of stars, then a triangle. Nested loops are where most beginners first get stuck — sit with it.' },
  { category: 'technical', stages: F, goals: SD, type: 'learn', xp: 20, link: PRACTICE_MCQ,
    title: 'Read an error message properly', detail: 'Break a working program on purpose. Read the error, name the line and the cause before you fix it.' },
  { category: 'technical', stages: F, goals: SD, type: 'practice', xp: 30, link: PRACTICE_CODE,
    title: 'Work with a list', detail: 'Store 6 numbers, then find the largest without using a built-in max function.' },
  { category: 'technical', stages: F, goals: SD, type: 'practice', xp: 25, link: PRACTICE_CODE,
    title: 'String handling', detail: 'Reverse a word, then check whether it reads the same backwards.' },
  { category: 'technical', stages: F, goals: SD, type: 'learn', xp: 20, link: PRACTICE_MCQ,
    title: 'Trace code on paper', detail: 'Take a 10-line program. Write the value of every variable after each line, then run it and compare.' },

  { category: 'technical', stages: F, goals: DA, type: 'practice', xp: 25, link: PRACTICE_SQL,
    title: 'Your first SELECT', detail: 'Fetch every column from one table, then only three named columns. Notice what changes.' },
  { category: 'technical', stages: F, goals: DA, type: 'practice', xp: 30, link: PRACTICE_SQL,
    title: 'Filter rows with WHERE', detail: 'Fetch rows above a value, then combine two conditions with AND and again with OR.' },
  { category: 'technical', stages: F, goals: DA, type: 'learn', xp: 20,
    title: 'Spreadsheet formulas', detail: 'In any spreadsheet: SUM, AVERAGE and COUNT over 20 rows of your own numbers.' },
  { category: 'technical', stages: F, goals: DA, type: 'learn', xp: 25,
    title: 'Sort and filter real data', detail: 'Find any public dataset. Sort it by one column, filter to a subset, and write one sentence about what you see.' },
  { category: 'technical', stages: F, goals: DA, type: 'practice', xp: 25, link: PRACTICE_SQL,
    title: 'Count and group', detail: 'Count rows per category with GROUP BY. Check the total matches a plain count of the table.' },
  { category: 'technical', stages: F, goals: DA, type: 'learn', xp: 20, link: PRACTICE_MCQ,
    title: 'Read a chart critically', detail: 'Find a chart in the news. Write what it shows, what it leaves out, and one question you would ask its author.' },

  { category: 'technical', stages: F, goals: AI, type: 'practice', xp: 25, link: PRACTICE_CODE,
    title: 'Python basics drill', detail: 'Variables, a loop and a function in one short program. Run it and fix every error yourself.' },
  { category: 'technical', stages: F, goals: AI, type: 'practice', xp: 30, link: PRACTICE_CODE,
    title: 'Lists and dictionaries', detail: 'Store five student names with their marks in a dictionary, then print the highest scorer.' },
  { category: 'technical', stages: F, goals: AI, type: 'learn', xp: 25, link: PRACTICE_MCQ,
    title: 'Averages and spread', detail: 'For ten numbers, compute the mean and the median by hand. Change one number to a very large value and recompute both.' },
  { category: 'technical', stages: F, goals: AI, type: 'learn', xp: 25, link: PRACTICE_MCQ,
    title: 'Probability basics', detail: 'Two dice: work out the chance of a total of 7. Then list every combination and check your answer.' },
  { category: 'technical', stages: F, goals: AI, type: 'learn', xp: 20, link: ROADMAP,
    title: 'Using AI vs building AI', detail: 'Write half a page: what a person using AI tools does all day, and what a person building them does. Decide which you want.' },

  /* ── TECHNICAL — Build ─────────────────────────────────────────────────── */
  { category: 'technical', stages: B, goals: SD, type: 'practice', xp: 35, link: PRACTICE_CODE,
    title: 'Arrays and searching', detail: 'Implement linear search, then binary search on sorted data. Note how many comparisons each takes.' },
  { category: 'technical', stages: B, goals: SD, type: 'practice', xp: 35, link: PRACTICE_CODE,
    title: 'Hash map lookup', detail: 'Count how many times each word appears in a paragraph, using a dictionary rather than nested loops.' },
  { category: 'technical', stages: B, goals: SD, type: 'learn', xp: 30,
    title: 'Put today’s work in Git', detail: 'Initialise a repository, commit your code, and write a commit message that says what changed and why.' },
  { category: 'technical', stages: B, goals: SD, type: 'learn', xp: 30,
    title: 'Branch and merge', detail: 'Create a branch, make a change, merge it back. Cause a small conflict on purpose and resolve it.' },
  { category: 'technical', stages: B, goals: SD, type: 'practice', xp: 40, link: PRACTICE_CODE,
    title: 'Store data that survives', detail: 'Save records to a file or database, close the program, reopen it and read them back.' },
  { category: 'technical', stages: B, goals: SD, type: 'practice', xp: 35, link: PRACTICE_CODE,
    title: 'Handle bad input', detail: 'Take a working program and make it survive empty input, text where a number belongs, and a value out of range.' },
  { category: 'technical', stages: B, goals: SD, type: 'learn', xp: 30,
    title: 'Read someone else’s code', detail: 'Open any small public repository. Write five lines explaining what it does and where you would start changing it.' },
  { category: 'technical', stages: B, goals: SD, type: 'practice', xp: 40, link: PRACTICE_CODE,
    title: 'Split one file into three', detail: 'Take a long program and separate it into modules by responsibility. It must still run identically.' },

  { category: 'technical', stages: B, goals: DA, type: 'practice', xp: 35, link: PRACTICE_SQL,
    title: 'Join two tables', detail: 'Combine two tables with an INNER JOIN, then switch to LEFT JOIN and explain the difference in row count.' },
  { category: 'technical', stages: B, goals: DA, type: 'practice', xp: 35, link: PRACTICE_SQL,
    title: 'GROUP BY with HAVING', detail: 'Group by one column, aggregate, then keep only groups above a threshold using HAVING rather than WHERE.' },
  { category: 'technical', stages: B, goals: DA, type: 'practice', xp: 40,
    title: 'Clean a messy dataset', detail: 'Find data with blanks and duplicates. Remove duplicates, decide what to do with each blank, and write down why.' },
  { category: 'technical', stages: B, goals: DA, type: 'learn', xp: 35,
    title: 'Load data with pandas', detail: 'Read a CSV, print its shape and column types, then filter to the rows that matter for one question.' },
  { category: 'technical', stages: B, goals: DA, type: 'practice', xp: 35,
    title: 'Group and summarise in code', detail: 'Reproduce yesterday’s SQL GROUP BY using pandas. Confirm both give the same numbers.' },
  { category: 'technical', stages: B, goals: DA, type: 'learn', xp: 30,
    title: 'Make one honest chart', detail: 'Chart a real result. Label both axes, title it with the finding rather than the metric, and start the axis at zero.' },
  { category: 'technical', stages: B, goals: DA, type: 'practice', xp: 40, link: PRACTICE_SQL,
    title: 'Answer a business question', detail: 'Write one query that answers "which category grew fastest last quarter" end to end.' },

  { category: 'technical', stages: B, goals: AI, type: 'learn', xp: 35,
    title: 'Prepare data with pandas', detail: 'Load a dataset, handle its missing values, and convert one text column into numbers a model could use.' },
  { category: 'technical', stages: B, goals: AI, type: 'practice', xp: 40,
    title: 'Train your first model', detail: 'Fit a simple regression or classifier on a small dataset. Print the accuracy and say plainly whether it is any good.' },
  { category: 'technical', stages: B, goals: AI, type: 'learn', xp: 35,
    title: 'Split your data properly', detail: 'Separate train and test sets. Score on both, and write down why the test score is the honest one.' },
  { category: 'technical', stages: B, goals: AI, type: 'learn', xp: 35,
    title: 'Make a model overfit on purpose', detail: 'Push training accuracy near 100% and watch test accuracy fall. Note what you changed to cause it.' },
  { category: 'technical', stages: B, goals: AI, type: 'practice', xp: 35,
    title: 'Compare two models', detail: 'Run two algorithms on the same data. Report both scores and pick one, giving a reason that is not "it was higher".' },
  { category: 'technical', stages: B, goals: AI, type: 'learn', xp: 30,
    title: 'Beyond accuracy', detail: 'On an imbalanced dataset, work out precision and recall. Explain when accuracy alone would have misled you.' },
  { category: 'technical', stages: B, goals: AI, type: 'practice', xp: 35, link: PRACTICE_CODE,
    title: 'Call a model from code', detail: 'Wrap a trained model in a function that takes raw input and returns a prediction. Test it with three inputs.' },

  /* ── TECHNICAL — Placement / Job seeking ───────────────────────────────── */
  { category: 'technical', stages: SEEK, goals: SD, type: 'practice', xp: 40, link: PRACTICE_CODE,
    title: 'Two-pointer problem', detail: 'Solve a pair-sum problem in one pass. State the complexity before you look at any solution.' },
  { category: 'technical', stages: SEEK, goals: SD, type: 'practice', xp: 40, link: PRACTICE_CODE,
    title: 'String manipulation under time', detail: 'Give yourself 25 minutes for one medium string problem. Stop at the limit whether or not it works.' },
  { category: 'technical', stages: SEEK, goals: SD, type: 'practice', xp: 45, link: PRACTICE_CODE,
    title: 'Recursion and a base case', detail: 'Solve one recursive problem. Say out loud what the base case is and why it terminates.' },
  { category: 'technical', stages: SEEK, goals: SD, type: 'learn', xp: 35,
    title: 'Complexity of your own code', detail: 'Take code you wrote. Work out its time and space complexity, then find one line that dominates it.' },
  { category: 'technical', stages: SEEK, goals: SD, type: 'learn', xp: 40,
    title: 'Design a small system', detail: 'Sketch a URL shortener: the API, the storage, and what breaks first under load. Half a page.' },
  { category: 'technical', stages: SEEK, goals: SD, type: 'practice', xp: 40, link: PRACTICE_CODE,
    title: 'Fix a query inside a loop', detail: 'Find or write code that queries inside a loop. Rewrite it as one query and measure the difference.' },
  { category: 'technical', stages: SEEK, goals: SD, type: 'learn', xp: 35,
    title: 'Explain your architecture', detail: 'Draw your main project on one page: components and what talks to what. You will be asked to draw this.' },

  { category: 'technical', stages: SEEK, goals: DA, type: 'practice', xp: 40, link: PRACTICE_SQL,
    title: 'Window functions', detail: 'Rank rows within each group using a window function. Compare it to the same answer via a subquery.' },
  { category: 'technical', stages: SEEK, goals: DA, type: 'practice', xp: 40, link: PRACTICE_SQL,
    title: 'SQL under interview conditions', detail: 'Three queries in 30 minutes against a schema you have not seen. No looking up syntax.' },
  { category: 'technical', stages: SEEK, goals: DA, type: 'learn', xp: 40,
    title: 'Build a case study', detail: 'Take one dataset from question to recommendation. Method, finding, and what you would do about it.' },
  { category: 'technical', stages: SEEK, goals: DA, type: 'learn', xp: 35,
    title: 'Mean, median and the trap', detail: 'Find a real distribution where the two differ sharply. Prepare the two-sentence explanation of why.' },
  { category: 'technical', stages: SEEK, goals: DA, type: 'practice', xp: 40,
    title: 'Make your dashboard shareable', detail: 'Have someone else open your analysis without you. Fix everything they could not understand alone.' },
  { category: 'technical', stages: SEEK, goals: DA, type: 'learn', xp: 35,
    title: 'Defend a number', detail: 'Pick one figure from your analysis. Write how it was calculated and the three ways it could be wrong.' },

  { category: 'technical', stages: SEEK, goals: AI, type: 'learn', xp: 40,
    title: 'Justify every choice', detail: 'For your best ML project, write why you picked that model, those features, and that metric.' },
  { category: 'technical', stages: SEEK, goals: AI, type: 'learn', xp: 40,
    title: 'Where your model fails', detail: 'Find three inputs your model gets wrong. Explain the pattern. Interviewers ask this and "it does not" is not an answer.' },
  { category: 'technical', stages: SEEK, goals: AI, type: 'practice', xp: 45,
    title: 'Deploy a model behind an API', detail: 'Serve a prediction over HTTP. It only counts once something other than your notebook can call it.' },
  { category: 'technical', stages: SEEK, goals: AI, type: 'learn', xp: 35,
    title: 'Explain overfitting simply', detail: 'Explain it to someone non-technical in four sentences, using an example that is not about machine learning.' },
  { category: 'technical', stages: SEEK, goals: AI, type: 'learn', xp: 40,
    title: 'Data leakage check', detail: 'Audit one project for information that leaked from test into train. Write what you found or how you ruled it out.' },
  { category: 'technical', stages: SEEK, goals: AI, type: 'practice', xp: 40, link: PRACTICE_CODE,
    title: 'Coding round, not ML', detail: 'Solve one standard DSA problem. ML interviews still open with these, and candidates who only did models get caught.' },

  /* ══════════════════════════════════════════════════════════════════════════
     APTITUDE and REASONING — untagged by goal on purpose. Placement tests are
     the same paper whichever role you applied for.
     ══════════════════════════════════════════════════════════════════════════ */
  { category: 'aptitude', stages: FB, type: 'aptitude', xp: 20, link: PRACTICE_MCQ,
    title: 'Profit and loss', detail: 'Eight problems on cost price, selling price and margin.' },
  { category: 'aptitude', stages: FB, type: 'aptitude', xp: 20, link: PRACTICE_MCQ,
    title: 'Averages', detail: 'Six problems, including one where a new value changes the average.' },
  { category: 'aptitude', stages: FB, type: 'aptitude', xp: 20, link: PRACTICE_MCQ,
    title: 'Time and work', detail: 'Five problems on people working together at different rates.' },
  { category: 'aptitude', stages: FB, type: 'aptitude', xp: 20, link: PRACTICE_MCQ,
    title: 'Simple and compound interest', detail: 'Six problems. Do at least two without a calculator.' },
  { category: 'aptitude', stages: BP, type: 'aptitude', xp: 25, link: PRACTICE_MCQ,
    title: 'Permutations and combinations', detail: 'Six problems. Decide first whether order matters — that is where most marks are lost.' },
  { category: 'aptitude', stages: BP, type: 'aptitude', xp: 25, link: PRACTICE_MCQ,
    title: 'Probability set', detail: 'Six problems mixing dice, cards and coloured balls.' },
  { category: 'aptitude', stages: SEEK, type: 'aptitude', xp: 30, link: PRACTICE_MCQ,
    title: 'Timed mixed paper', detail: '20 questions in 20 minutes. Score it honestly and note which topic cost you most.' },
  { category: 'aptitude', stages: SEEK, type: 'aptitude', xp: 25, link: PRACTICE_MCQ,
    title: 'Data interpretation', detail: 'Read one table and one chart, then answer five questions on them under time.' },

  { category: 'logical_reasoning', stages: FB, type: 'aptitude', xp: 20, link: PRACTICE_MCQ,
    title: 'Number series', detail: 'Ten series questions. For each, write the rule before choosing.' },
  { category: 'logical_reasoning', stages: FB, type: 'aptitude', xp: 20, link: PRACTICE_MCQ,
    title: 'Coding and decoding', detail: 'Eight problems where letters map to other letters or numbers.' },
  { category: 'logical_reasoning', stages: FB, type: 'aptitude', xp: 20, link: PRACTICE_MCQ,
    title: 'Direction sense', detail: 'Six problems. Draw each one rather than solving it in your head.' },
  { category: 'logical_reasoning', stages: BP, type: 'aptitude', xp: 25, link: PRACTICE_MCQ,
    title: 'Seating arrangement', detail: 'Two arrangement puzzles. Build the diagram before reading the questions.' },
  { category: 'logical_reasoning', stages: BP, type: 'aptitude', xp: 25, link: PRACTICE_MCQ,
    title: 'Syllogisms', detail: 'Eight problems. Use diagrams — intuition is wrong more often than it feels.' },
  { category: 'logical_reasoning', stages: SEEK, type: 'aptitude', xp: 30, link: PRACTICE_MCQ,
    title: 'Puzzle under time', detail: 'One hard arrangement puzzle in 12 minutes. Stop at the limit either way.' },
  { category: 'logical_reasoning', stages: LATER, type: 'aptitude', xp: 25, link: PRACTICE_MCQ,
    title: 'Statement and assumption', detail: 'Six problems separating what is stated from what is merely implied.' },

  /* ══════════════════════════════════════════════════════════════════════════
     COMMUNICATION — mostly goal-neutral. Where a goal is set, it is because the
     thing being explained differs, not the skill.
     ══════════════════════════════════════════════════════════════════════════ */
  { category: 'communication', stages: F, type: 'communication', xp: 25, link: INTERVIEW,
    title: 'Sixty-second introduction', detail: 'Record one minute: who you are, what you study, what you are working towards. Listen back once.' },
  { category: 'communication', stages: F, type: 'communication', xp: 25,
    title: 'Explain something you learned', detail: 'Explain today’s concept aloud in five sentences, without notes and without jargon.' },
  { category: 'communication', stages: F, type: 'communication', xp: 20,
    title: 'Read aloud for clarity', detail: 'Read a technical paragraph aloud. Slow down at every full stop. Record it and listen for filler words.' },
  { category: 'communication', stages: FB, type: 'communication', xp: 25,
    title: 'Write a professional email', detail: 'Request a meeting in under 120 words: subject line, one line of context, one clear ask.' },
  { category: 'communication', stages: B, type: 'communication', xp: 30, link: INTERVIEW,
    title: 'Two-minute project pitch', detail: 'Problem, what you built, what you learned. Two minutes, timed, no notes.' },
  { category: 'communication', stages: B, type: 'communication', xp: 25,
    title: 'Explain a failure', detail: 'Describe something that did not work and what you changed. Practise saying it without apologising for it.' },
  { category: 'communication', stages: B, goals: DA, type: 'communication', xp: 30,
    title: 'One-sentence finding', detail: 'Take a chart you made and state its implication in one sentence a manager could act on.' },
  { category: 'communication', stages: B, goals: AI, type: 'communication', xp: 30,
    title: 'Explain your model to a non-expert', detail: 'What it predicts, what it uses, and one thing it cannot do. No equations.' },
  { category: 'communication', stages: SEEK, type: 'communication', xp: 35, link: INTERVIEW,
    title: 'Tell me about yourself', detail: 'Answer the opening question in 90 seconds: present, past, why this role. Record and re-record until it flows.' },
  { category: 'communication', stages: SEEK, type: 'communication', xp: 35, link: INTERVIEW,
    title: 'Answer a behavioural question', detail: 'Situation, task, action, result. Prepare one story about conflict and one about failure.' },
  { category: 'communication', stages: SEEK, type: 'communication', xp: 30, link: INTERVIEW,
    title: 'Why should we hire you', detail: 'Answer in under a minute with one concrete piece of evidence. Not adjectives.' },
  { category: 'communication', stages: SEEK, type: 'communication', xp: 25,
    title: 'Questions for the interviewer', detail: 'Prepare three questions that show you researched the company. Not about leave policy.' },
  { category: 'communication', stages: SEEK, type: 'communication', xp: 30, link: INTERVIEW,
    title: 'Handle "I don’t know"', detail: 'Practise answering a question outside your knowledge: say what you do know, then how you would find out.' },

  /* ══════════════════════════════════════════════════════════════════════════
     EMPLOYABILITY — the stage tags matter most here. Resume and application work
     must never reach a first-year, which is the bug that started all of this.
     ══════════════════════════════════════════════════════════════════════════ */
  { category: 'employability', stages: F, type: 'learn', xp: 20, link: ROADMAP,
    title: 'Set up your workspace', detail: 'Install an editor and the language you are learning. Run one program end to end on your own machine.' },
  { category: 'employability', stages: F, type: 'learn', xp: 20, link: ROADMAP,
    title: 'Find three seniors to follow', detail: 'Identify three people two or three years ahead of you. Note what they did that you have not started.' },
  { category: 'employability', stages: F, type: 'learn', xp: 20,
    title: 'Build a study routine', detail: 'Choose a fixed hour, five days a week. Write it down and keep the record visible for a fortnight.' },
  { category: 'employability', stages: F, type: 'learn', xp: 25, link: ROADMAP,
    title: 'Read one job description', detail: 'Find a role you want in three years. List every skill it names and mark which you have.' },

  { category: 'employability', stages: B, type: 'resume', xp: 30, link: RESUME,
    title: 'Start your resume', detail: 'One page: education, skills, and one project. It will be bad. Having a bad one beats having none.' },
  { category: 'employability', stages: B, type: 'learn', xp: 30,
    title: 'Publish your code', detail: 'Push one project to GitHub with a README saying what it does and how to run it.' },
  { category: 'employability', stages: B, type: 'learn', xp: 35,
    title: 'Finish something unfinished', detail: 'Pick a half-done project and get it to a state someone else could use. Finishing is the rarer skill.' },
  { category: 'employability', stages: B, type: 'learn', xp: 25, link: ROADMAP,
    title: 'Pick one track and commit', detail: 'Choose one path for the next six months. Write down what you are deliberately not learning.' },
  { category: 'employability', stages: B, type: 'resume', xp: 25, link: RESUME,
    title: 'Write one project properly', detail: 'Two lines: what problem it solved and what you personally built. No "team of four" without your part.' },
  { category: 'employability', stages: B, type: 'learn', xp: 25,
    title: 'Set up LinkedIn', detail: 'Photo, headline naming your target role, and your education. Twenty minutes.' },

  { category: 'employability', stages: P, type: 'resume', xp: 40, link: RESUME,
    title: 'Get your resume reviewed', detail: 'Have someone who hires read it. Apply every correction, even the ones you disagree with, then decide.' },
  { category: 'employability', stages: P, type: 'resume', xp: 35, link: RESUME,
    title: 'Quantify your resume', detail: 'Add a number to three bullets: users, rows, percent faster, marks. Vague claims read as no claim.' },
  { category: 'employability', stages: SEEK, type: 'mock', xp: 45, link: INTERVIEW,
    title: 'Full mock interview', detail: 'Complete one end to end and read the feedback. Note the single weakest answer.' },
  { category: 'employability', stages: SEEK, type: 'mock', xp: 45, link: INTERVIEW,
    title: 'Redo your weakest answer', detail: 'Take that answer from your last mock and run the round again. Compare the two.' },
  { category: 'employability', stages: SEEK, type: 'learn', xp: 30,
    title: 'Apply to five roles', detail: 'Five real applications today. Track company, date and status somewhere you will look again.' },
  { category: 'employability', stages: SEEK, type: 'learn', xp: 30,
    title: 'Tailor one application', detail: 'Rewrite your resume summary for one specific job description, using their words for the skills you have.' },
  { category: 'employability', stages: SEEK, type: 'learn', xp: 25,
    title: 'Ask for one referral', detail: 'Message one person at a company you applied to. Short, specific, and easy for them to say yes to.' },
  { category: 'employability', stages: SEEK, type: 'learn', xp: 25, link: ROADMAP,
    title: 'Track your applications', detail: 'Build a simple sheet: company, role, date, stage, next action. Job hunting fails on follow-up, not on applying.' },
  { category: 'employability', stages: ['job_seeker'], type: 'learn', xp: 30,
    title: 'Account for the gap', detail: 'Write two sentences on what you have done since graduating. Honest and forward-looking, not apologetic.' },
  { category: 'employability', stages: ['job_seeker'], type: 'learn', xp: 30,
    title: 'Widen the search', detail: 'List five companies outside the obvious names — smaller firms, other cities, adjacent roles. Apply to two.' },

  /* ══════════════════════════════════════════════════════════════════════════
     CAREER CLARITY
     ══════════════════════════════════════════════════════════════════════════ */
  { category: 'career_clarity', stages: F, type: 'learn', xp: 20, link: ROADMAP,
    title: 'Map three roles', detail: 'Write what a developer, an analyst and an ML engineer each do all day. Mark which sounds like you.' },
  { category: 'career_clarity', stages: F, type: 'learn', xp: 20, link: ROADMAP,
    title: 'Talk to someone working', detail: 'Ask one person in industry what their actual day looks like. Write down the part that surprised you.' },
  { category: 'career_clarity', stages: FB, type: 'learn', xp: 20, link: ROADMAP,
    title: 'Name your target role', detail: 'One role, three skills it needs, and your honest level in each today.' },
  { category: 'career_clarity', stages: B, type: 'learn', xp: 25, link: ROADMAP,
    title: 'Read five job posts', detail: 'Five posts for your target role. List every skill that appears in three or more.' },
  { category: 'career_clarity', stages: B, type: 'learn', xp: 25, link: ROADMAP,
    title: 'Find your gap', detail: 'Compare that list to what you can do. Pick the single biggest gap and plan the next two weeks around it.' },
  { category: 'career_clarity', stages: LATER, type: 'learn', xp: 25, link: ROADMAP,
    title: 'Research a company properly', detail: 'One company: what they build, who their customers are, and why you would join. Enough to talk for two minutes.' },
  { category: 'career_clarity', stages: SEEK, type: 'learn', xp: 25, link: ROADMAP,
    title: 'Know your salary range', detail: 'Find what your target role pays for your experience in your city. Decide your number before anyone asks.' },
  { category: 'career_clarity', stages: SEEK, type: 'learn', xp: 25,
    title: 'Write your why', detail: 'Why this role, why this company, why now. Three sentences you can say without hesitating.' },
];

/**
 * The twenty starter missions are untagged, which means every one of them reaches every
 * member — including four that assume a career already under way. Adding a tagged library
 * alongside them does not fix that: a first-year would still be handed "Resume kickoff"
 * from the starter pool on any day it came up.
 *
 * Only the ones that genuinely do not apply at every stage are touched. Aptitude,
 * reasoning and the communication drills are left untagged deliberately — they are the
 * same work whoever you are, and narrowing them would only thin the pool.
 */
const RETAG_STARTERS: { category: string; title: string; stages: string[] }[] = [
  { category: 'employability', title: 'Resume kickoff',        stages: ['build', 'placement', 'job_seeker'] },
  { category: 'employability', title: 'Add a project',         stages: ['build', 'placement', 'job_seeker'] },
  { category: 'employability', title: 'LinkedIn headline',     stages: ['build', 'placement', 'job_seeker'] },
  { category: 'employability', title: 'Mock interview round',  stages: ['placement', 'job_seeker'] },
];

async function run() {
  const tenantId = process.argv[2];
  if (!tenantId) { console.error('Usage: seedMissionLibrary.ts <tenantId>'); process.exit(1); }

  await mongoose.connect(process.env.MONGODB_URI as string);
  const c: any = await PassportContent.findOne({ tenantId });
  if (!c) { console.error('No content for that tenant — open the CareerPilot admin screens once to seed it.'); process.exit(1); }

  let added = 0, updated = 0, pools = 0;
  for (const m of MISSIONS) {
    let pool = (c.missionPools || []).find((p: any) => p.category === m.category);
    if (!pool) {
      c.missionPools.push({ category: m.category, items: [] });
      pool = c.missionPools[c.missionPools.length - 1];
      pools++;
    }
    const body = { title: m.title, detail: m.detail, type: m.type, xp: m.xp, link: m.link,
                   stages: m.stages || [], goals: m.goals || [] };
    const existing = (pool.items || []).find((i: any) => i.title === m.title);
    if (existing) { Object.assign(existing, body); updated++; }
    else { pool.items.push(body as any); added++; }
  }

  // The starter missions predate the rename and still point at /passport/*. Those paths
  // redirect, but a redirect that has to carry a query string is one more place the
  // ?kind= filter can be lost — so rewrite them to the real path.
  let retagged = 0;
  for (const r of RETAG_STARTERS) {
    const pool = (c.missionPools || []).find((p: any) => p.category === r.category);
    const it = pool && (pool.items || []).find((x: any) => x.title === r.title);
    if (it && !(it.stages?.length)) { it.stages = r.stages; retagged++; }
  }

  let relinked = 0;
  for (const p of c.missionPools) {
    for (const i of (p.items || [])) {
      if (i.link && i.link.indexOf('/careerpilot/') === 0) {
        i.link = i.link.replace('/careerpilot/', '/careerpilot/');
        relinked++;
      }
    }
  }

  c.markModified('missionPools');
  await c.save();

  const all: any[] = [];
  for (const p of c.missionPools) for (const i of (p.items || [])) all.push({ ...i.toObject?.() ?? i, category: p.category });

  console.log(`Missions — added ${added}, updated ${updated}, new pools ${pools}, retagged ${retagged}, relinked ${relinked}`);
  console.log(`Library now ${all.length} missions.\n`);

  // What a member is actually offered. A stage that looks fine in total can still be
  // empty for one goal, and 90 days of missions drawn from a thin pool repeat.
  const stages = ['foundation', 'build', 'placement', 'job_seeker'];
  const goals = ['Software Development', 'Data Analytics', 'AI-Ready', 'Not sure yet'];
  console.log(`${'goal'.padEnd(22)}${stages.map(s => s.padEnd(12)).join('')}`);
  for (const g of goals) {
    const undecided = /not sure/i.test(g);
    const row = stages.map(st => {
      const n = all.filter(i => {
        if (i.stages?.length && !i.stages.includes(st)) return false;
        if (i.goals?.length && undecided) return false;
        if (i.goals?.length && !i.goals.includes(g)) return false;
        return true;
      }).length;
      return `${n}${n < 30 ? ' !' : ''}`.padEnd(12);
    });
    console.log(`${g.padEnd(22)}${row.join('')}`);
  }
  console.log('\n(! = under 30, which repeats inside a 90-day roadmap)');

  await mongoose.disconnect();
}

if (require.main === module) run().catch(e => { console.error(e); process.exit(1); });
