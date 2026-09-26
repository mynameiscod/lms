import { TopicSeed } from './year1MegaCurriculum';
import { u } from './year3UnitKit';

/**
 * Year 3, Stage 3 — professional engineering and career proof. Modules S20 to S25.
 *
 * ── WHAT THIS STAGE IS ────────────────────────────────────────────────────────────────────
 *
 * The year's output, rather than more of its input. One project carried the whole way, the
 * interview as a practised skill, the writing and speaking the job is mostly made of, a
 * portfolio a stranger will believe, and an internship actually applied for.
 *
 * ── NO closeOut HERE, DELIBERATELY ────────────────────────────────────────────────────────
 *
 * Every other stage ends its topics with debug, drill and mini-project. This stage IS the
 * project. Wrapping a capstone in a mini-project about capstones would be padding, and the
 * minutes are better spent on the thing itself.
 */

export const YEAR3_PROOF: Record<string, TopicSeed> = {
  /* ── S20 · Production engineering project ────────────────────────────────────────────── */
  T3_PROJECT: {
    category: 'UNIVERSAL',
    units: [
      u('CHOOSING_SOMETHING_WORTH_BUILDING', 'Choosing Something Worth Building',
        'Something you will finish, that solves a real problem, and that you can show somebody.',
        ['Choose a project you can finish and would be glad to show'], 60),
      u('REQUIREMENTS_AND_SCOPE', 'Requirements, and What You Are Not Building',
        'Scope decided at the start, when you know least, is the decision that most often sinks a project.',
        ['Write requirements including what is explicitly out of scope'], 70,
        { after: ['CHOOSING_SOMETHING_WORTH_BUILDING'] }),
      u('DESIGNING_IT', 'Designing It Before Building It',
        'The architecture, the data model and the decisions worth writing down first.',
        ['Produce a design you could hand to somebody else'], 80, { after: ['REQUIREMENTS_AND_SCOPE'] }),
      u('BUILDING_IT', 'Building It',
        'Implementation with a real Git workflow, real tests and real commits.',
        ['Build the project with a history that shows how it was built'],
        220, { unitType: 'PROJECT', after: ['DESIGNING_IT'] }),
      u('SHIPPING_IT', 'Deploying It Where Somebody Can Use It',
        'Deployed, configured, and with the secrets kept out of the repository.',
        ['Deploy the project somewhere a stranger can open it'], 90, { after: ['BUILDING_IT'] }),
      u('PRESENTING_IT', 'Presenting It',
        'Ten minutes on what it does, how it is built and why — to somebody who has not seen it.',
        ['Present the project and answer questions about the decisions'], 70, { after: ['SHIPPING_IT'] }),
    ],
  },
  T3_CAPSTONE: {
    category: 'UNIVERSAL',
    units: [
      u('CAPSTONE_BRIEF', 'Capstone — What You Are Proving',
        'The one piece of work the rest of the year is evidence for. What it has to demonstrate.',
        ['State what your capstone is meant to prove about you'], 60),
      u('CAPSTONE_BUILD', 'Building the Capstone',
        'Larger than the last one, in your direction, and finished.',
        ['Build and finish a capstone in your chosen direction'],
        260, { unitType: 'PROJECT', after: ['CAPSTONE_BRIEF'] }),
      u('CAPSTONE_REVIEW', 'Capstone Review',
        'Assessed the way an interviewer would: the code, the decisions and the explanation.',
        ['Have the capstone reviewed against what an employer asks for'],
        80, { unitType: 'CHECKPOINT', after: ['CAPSTONE_BUILD'] }),
    ],
  },

  /* ── S21 · Technical interviews ──────────────────────────────────────────────────────── */
  T3_INTERVIEW_PRACTICE: {
    category: 'UNIVERSAL',
    units: [
      u('INTERPRETING_THE_PROBLEM', 'Interpreting the Problem, Out Loud',
        'Restating it, asking about the constraints, and naming the edge cases before coding.',
        ['Restate a problem and surface its constraints before writing anything'], 70),
      u('TALKING_WHILE_SOLVING', 'Talking While You Solve',
        'The interviewer is assessing reasoning. Silence hides the thing being marked.',
        ['Narrate an approach while working it'], 70, { after: ['INTERPRETING_THE_PROBLEM'] }),
      u('WHEN_YOU_ARE_STUCK', 'Being Stuck, Well',
        'What to say and do in the four minutes where nothing is working.',
        ['Get unstuck out loud rather than going quiet'], 60, { after: ['TALKING_WHILE_SOLVING'] }),
      u('TIMED_SETS', 'Timed Practice Sets',
        'Problems under a clock, at the difficulty interviews actually use.',
        ['Solve under time, or reach a partial answer you can defend'],
        90, { unitType: 'PRACTICE', after: ['WHEN_YOU_ARE_STUCK'] }),
      u('MOCK_INTERVIEW', 'Mock Technical Interview',
        'The whole thing, with somebody watching, and feedback afterwards.',
        ['Sit a full technical interview and act on the feedback'],
        90, { unitType: 'CHECKPOINT', after: ['TIMED_SETS'] }),
    ],
  },
  T3_SYSTEM_DESIGN: {
    category: 'UNIVERSAL',
    units: [
      u('THE_SHAPE_OF_THE_ANSWER', 'What a System Design Answer Looks Like',
        'Requirements, scale, the boxes, the data, then the trade-offs. In that order.',
        ['Structure a system design answer rather than drawing boxes at random'], 80),
      u('ESTIMATING', 'Estimating Before Designing',
        'Users, requests and storage — rough numbers that rule designs out early.',
        ['Estimate scale well enough to narrow the design'], 70, { after: ['THE_SHAPE_OF_THE_ANSWER'] }),
      u('DEFENDING_TRADEOFFS', 'Defending the Trade-offs',
        'There is no right answer. There is an answer you can justify.',
        ['Justify a design choice against the alternative you rejected'], 75, { after: ['ESTIMATING'] }),
      u('DESIGN_PRACTICE', 'System Design Practice',
        'Three systems, sketched and defended under time.',
        ['Design and defend a system under interview conditions'],
        90, { unitType: 'PRACTICE', after: ['DEFENDING_TRADEOFFS'] }),
    ],
  },

  /* ── S22 · Professional communication ────────────────────────────────────────────────── */
  T3_TECH_WRITING: {
    category: 'UNIVERSAL',
    units: [
      u('WRITING_FOR_ENGINEERS', 'Writing Another Engineer Can Act On',
        'Short, specific, and answering the question they actually have.',
        ['Write something another engineer can act on without asking you'], 65),
      u('A_DESIGN_NOTE', 'A Design Note',
        'The problem, the options, the choice and the consequences — on one page.',
        ['Write a design note somebody could review'], 70, { after: ['WRITING_FOR_ENGINEERS'] }),
      u('ASKING_A_GOOD_QUESTION', 'Asking a Question That Gets Answered',
        'Symptom, what you ruled out, and a clear ask. The difference between an hour and a week.',
        ['Write a question somebody can answer between two other things'], 55,
        { after: ['A_DESIGN_NOTE'] }),
    ],
  },
  T3_PRESENTING: {
    category: 'UNIVERSAL',
    units: [
      u('EXPLAINING_ARCHITECTURE', 'Explaining How Something Is Built',
        'To somebody who has not seen it, at the level they need, without the whole history.',
        ['Explain an architecture to somebody who has not seen it'], 70),
      u('PRESENTING_A_PROJECT', 'Presenting a Project',
        'What it does, what was hard, what you would change. In under ten minutes.',
        ['Present a project and handle the questions'], 70, { after: ['EXPLAINING_ARCHITECTURE'] }),
    ],
  },

  /* ── S23 · Portfolio ─────────────────────────────────────────────────────────────────── */
  T3_PORTFOLIO: {
    category: 'UNIVERSAL',
    units: [
      u('NINETY_SECONDS', 'A Stranger With Ninety Seconds',
        'Who reads a portfolio, how long for, and what they are looking for a reason to do.',
        ['Judge your own portfolio the way a reviewer will'], 55),
      u('THE_REPOSITORY', 'A Repository Somebody Will Believe',
        'A README, a history that shows the work, and no secrets in it.',
        ['Prepare a repository a reviewer would be glad to open'], 75, { after: ['NINETY_SECONDS'] }),
      u('THE_DEMO', 'A Demo That Works When Clicked',
        'Deployed, reachable, and with a way in that does not require signing up.',
        ['Publish a demo a stranger can try in a minute'], 70, { after: ['THE_REPOSITORY'] }),
      u('WRITING_THE_PROJECT_UP', 'Writing the Project Up',
        'The problem you had, what you built, and the hardest part — not a list of technologies.',
        ['Write up a project so its value is obvious in a paragraph'], 65, { after: ['THE_DEMO'] }),
      u('PORTFOLIO_REVIEW', 'Portfolio Review',
        'Assessed against what a reviewer actually checks.',
        ['Have the portfolio reviewed and act on what comes back'],
        60, { unitType: 'CHECKPOINT', after: ['WRITING_THE_PROJECT_UP'] }),
    ],
  },

  /* ── S24 · Internship and industry readiness ─────────────────────────────────────────── */
  T3_APPLYING: {
    category: 'UNIVERSAL',
    units: [
      u('READING_A_JOB_DESCRIPTION', 'Reading a Job Description Honestly',
        'Which requirements are real, which are a wish list, and when to apply anyway.',
        ['Judge a job description against your own evidence'], 60),
      u('MATCHING_AND_GAPS', 'Matching Yourself, and Naming the Gaps',
        'Where you fit, where you do not, and what to say about the difference.',
        ['Match your evidence to a role and name the gaps before they do'], 65,
        { after: ['READING_A_JOB_DESCRIPTION'] }),
      u('RESUME_FOR_A_ROLE', 'A Résumé Aimed at One Role',
        'Evidence over adjectives, and the same projects framed for this job.',
        ['Tailor a résumé to a specific role'], 70, { after: ['MATCHING_AND_GAPS'] }),
      u('APPLYING_AND_TRACKING', 'Applying, and Keeping Track',
        'Volume, follow-up, and knowing which applications are still alive.',
        ['Run an application process rather than sending and hoping'], 55,
        { after: ['RESUME_FOR_A_ROLE'] }),
    ],
  },
  T3_BEHAVIORAL: {
    category: 'UNIVERSAL',
    units: [
      u('A_REAL_EXAMPLE_READY', 'Having a Real Example Ready',
        'What you did, why, and what you would change. Prepared, not improvised.',
        ['Tell a real story about your own work, with a point'], 70),
      u('THE_COMMON_QUESTIONS', 'The Questions That Always Come',
        'Conflict, failure, something you are proud of — and answering them without a script.',
        ['Answer the standard behavioural questions with real material'], 70,
        { after: ['A_REAL_EXAMPLE_READY'] }),
      u('THE_FIRST_WEEKS', 'Being New Without Being Silently Stuck',
        'Asking, standups, taking a review, and saying early when something has slipped.',
        ['Describe how you would work in your first weeks on a team'], 65,
        { after: ['THE_COMMON_QUESTIONS'] }),
      u('MOCK_BEHAVIORAL', 'Mock Behavioural Interview',
        'The whole thing, with feedback.',
        ['Sit a behavioural interview and act on the feedback'],
        70, { unitType: 'CHECKPOINT', after: ['THE_FIRST_WEEKS'] }),
    ],
  },

  /* ── S25 · Verification ──────────────────────────────────────────────────────────────── */
  T3_VERIFICATION: {
    category: 'UNIVERSAL',
    units: [
      u('TECHNICAL_VERIFICATION', 'Verifying the Technical Year',
        'Programming, data structures, algorithms, databases, APIs, testing and security — measured, not asserted.',
        ['Demonstrate the technical work of the year'],
        110, { unitType: 'CHECKPOINT' }),
      u('SPECIALIZATION_VERIFICATION', 'Verifying the Specialization',
        'The direction you chose, at the depth somebody would hire for.',
        ['Demonstrate the specialization at hiring depth'],
        100, { unitType: 'CHECKPOINT', after: ['TECHNICAL_VERIFICATION'] }),
      u('READINESS_REVIEW', 'Career Readiness Review',
        'The capstone, the portfolio and the interview work, reviewed together against what an employer asks.',
        ['Leave the year knowing exactly where you stand and what is next'],
        90, { unitType: 'CHECKPOINT', after: ['SPECIALIZATION_VERIFICATION'] }),
    ],
  },
};
