/**
 * Bank depth — batch 5: TECHNICAL questions for AI-Ready, all four stages.
 *
 * "AI-Ready" is the most-chosen goal on a signup form and the least examined, so these
 * lean harder on knowledge checks than the other two technical batches. A student who
 * picked it because the field sounds exciting and a student who has actually trained a
 * model will answer these very differently, and that gap is exactly what the assessment
 * exists to find — flattering both of them produces a roadmap that helps neither.
 *
 * Foundation items deliberately test Python and school statistics rather than machine
 * learning: a first-year who cannot write a loop is not held back by not knowing what a
 * gradient is, and pretending otherwise sends them to the wrong work.
 *
 * Run: npx ts-node src/scripts/seedBankTechAI.ts <tenantId>
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PassportAssessment from '../models/PassportAssessment';

dotenv.config();

interface Q {
  category: string; text: string; options: string[];
  correctIndex: number; weight: number; selfReport?: boolean; stages: string[]; goals: string[];
}

const AI = ['AI-Ready'];
const F = ['foundation'], B = ['build'], SEEK = ['placement', 'job_seeker'];

export const QUESTIONS: Q[] = [

  /* ══ FOUNDATION ═══════════════════════════════════════════════════════════ */
  { category: 'technical', stages: F, goals: AI, correctIndex: 1, weight: 1,
    text: 'In Python, what does len([3, 7, 1, 9]) return?',
    options: ['3', '4', '9', '20'] },
  { category: 'technical', stages: F, goals: AI, correctIndex: 2, weight: 1,
    text: 'Which Python structure stores values you look up by a name or key?',
    options: ['List', 'Tuple', 'Dictionary', 'String'] },
  { category: 'technical', stages: F, goals: AI, correctIndex: 1, weight: 1.1,
    text: 'The numbers are 4, 4, 5, 6, 100. Which is furthest from typical?',
    options: ['The median', 'The mean', 'The mode', 'The minimum'] },
  { category: 'technical', stages: F, goals: AI, correctIndex: 2, weight: 1,
    text: 'A fair coin is tossed twice. What is the probability of two heads?',
    options: ['1/2', '1/3', '1/4', '2/3'] },
  { category: 'technical', stages: F, goals: AI, correctIndex: 1, weight: 1.1,
    text: 'What is a "dataset" in machine learning?',
    options: ['A type of model', 'The examples the model learns from', 'A programming library', 'A kind of chart'] },
  { category: 'technical', stages: F, goals: AI, correctIndex: 2, weight: 1.1,
    text: 'A model is meant to predict house prices. What is the "label" in its training data?',
    options: ['The number of rooms', 'The location', 'The actual price', 'The model name'] },
  { category: 'technical', stages: F, goals: AI, selfReport: true, correctIndex: -1, weight: 1.2,
    text: 'What draws you to AI?',
    options: ['It is what everyone is doing', 'It pays well', 'The problems interest me', 'I have tried it and want to go deeper'] },
  { category: 'technical', stages: F, goals: AI, selfReport: true, correctIndex: -1, weight: 1.1,
    text: 'Have you written Python that you could not have copied from a tutorial?',
    options: ['No', 'Modified a tutorial', 'Written small programs', 'Written and debugged my own regularly'] },
  { category: 'technical', stages: F, goals: AI, correctIndex: 1, weight: 1,
    text: 'What does a loop over a list let you do?',
    options: ['Sort it automatically', 'Do something with each item in turn', 'Delete it', 'Convert it to a number'] },
  { category: 'technical', stages: F, goals: AI, selfReport: true, correctIndex: -1, weight: 1.1,
    text: 'How comfortable are you with the maths in your course — algebra, functions, basic calculus?',
    options: ['Avoid it', 'Struggle through', 'Comfortable', 'Comfortable and enjoy it'] },

  /* ══ BUILD ════════════════════════════════════════════════════════════════ */
  { category: 'technical', stages: B, goals: AI, correctIndex: 1, weight: 1.4,
    text: 'A model scores 99% on training data and 62% on unseen data. What is happening?',
    options: ['Underfitting', 'Overfitting', 'The data is too clean', 'The learning rate is zero'] },
  { category: 'technical', stages: B, goals: AI, correctIndex: 2, weight: 1.4,
    text: 'Why hold back a test set instead of training on all the data?',
    options: ['To train faster', 'To reduce file size', 'To measure performance on data the model has not seen', 'Because libraries require it'] },
  { category: 'technical', stages: B, goals: AI, correctIndex: 1, weight: 1.3,
    text: '99% of transactions are legitimate. A fraud model that always predicts "legitimate" scores 99% accuracy. What does that show?',
    options: ['The model is excellent', 'Accuracy is the wrong metric here', 'The data is wrong', 'Fraud is unpredictable'] },
  { category: 'technical', stages: B, goals: AI, correctIndex: 2, weight: 1.3,
    text: 'What does pandas df.dropna() do?',
    options: ['Deletes the file', 'Renames columns', 'Removes rows with missing values', 'Sorts the data'] },
  { category: 'technical', stages: B, goals: AI, correctIndex: 1, weight: 1.3,
    text: 'What is a "feature" in machine learning?',
    options: ['A bug that was intended', 'An input variable the model learns from', 'The output prediction', 'A library function'] },
  { category: 'technical', stages: B, goals: AI, correctIndex: 2, weight: 1.3,
    text: 'Classification versus regression — what is the difference?',
    options: ['Speed', 'One uses Python, one does not', 'One predicts a category, the other a number', 'One needs more data'] },
  { category: 'technical', stages: B, goals: AI, selfReport: true, correctIndex: -1, weight: 1.4,
    text: 'Have you trained a model on data you chose yourself?',
    options: ['Only used AI tools or APIs', 'Followed a tutorial exactly', 'Trained one on my own data', 'Trained several and tuned them'] },
  { category: 'technical', stages: B, goals: AI, selfReport: true, correctIndex: -1, weight: 1.3,
    text: 'When your model performs badly, what do you change first?',
    options: ['Try a different algorithm', 'Add more layers', 'Look at the data', 'Look at the data and how it was split'] },
  { category: 'technical', stages: B, goals: AI, correctIndex: 1, weight: 1.2,
    text: 'Why scale or normalise numeric features before training many models?',
    options: ['To save memory', 'So one large-valued feature does not dominate', 'To remove outliers', 'To make the code shorter'] },
  { category: 'technical', stages: B, goals: AI, selfReport: true, correctIndex: -1, weight: 1.2,
    text: 'Can you explain, in your own words, what your last model actually learned?',
    options: ['No', 'Roughly', 'Yes, in general terms', 'Yes, including which features mattered'] },

  /* ══ PLACEMENT + JOB SEEKER ═══════════════════════════════════════════════ */
  { category: 'technical', stages: SEEK, goals: AI, correctIndex: 1, weight: 1.4,
    text: 'You compute a feature using the full dataset before splitting train and test. What have you caused?',
    options: ['Faster training', 'Data leakage', 'Regularisation', 'Class imbalance'] },
  { category: 'technical', stages: SEEK, goals: AI, correctIndex: 2, weight: 1.4,
    text: 'For a cancer screening model, which error matters most to minimise?',
    options: ['False positives', 'Total errors', 'False negatives', 'Training time'] },
  { category: 'technical', stages: SEEK, goals: AI, correctIndex: 1, weight: 1.3,
    text: 'What does cross-validation give you that a single train/test split does not?',
    options: ['A faster model', 'A more reliable estimate of performance', 'More training data', 'Fewer features'] },
  { category: 'technical', stages: SEEK, goals: AI, correctIndex: 2, weight: 1.3,
    text: 'Precision is high but recall is low. What is the model doing?',
    options: ['Predicting positive too often', 'Guessing randomly', 'Being cautious — missing real positives', 'Overfitting the test set'] },
  { category: 'technical', stages: SEEK, goals: AI, correctIndex: 1, weight: 1.3,
    text: 'A model performs well in testing but poorly in production. Most common cause?',
    options: ['Slow servers', 'Real-world data differs from training data', 'Wrong programming language', 'Too few features'] },
  { category: 'technical', stages: SEEK, goals: AI, correctIndex: 2, weight: 1.3,
    text: 'What does regularisation do?',
    options: ['Speeds up training', 'Cleans the data', 'Penalises complexity to reduce overfitting', 'Increases accuracy on training data'] },
  { category: 'technical', stages: SEEK, goals: AI, selfReport: true, correctIndex: -1, weight: 1.4,
    text: 'Could you explain your best project’s design choices to a sceptical interviewer?',
    options: ['No project to explain', 'I followed a tutorial', 'Some choices were mine', 'Every choice was mine and I can defend it'] },
  { category: 'technical', stages: SEEK, goals: AI, selfReport: true, correctIndex: -1, weight: 1.3,
    text: 'Has anything you built been used by someone other than you?',
    options: ['No', 'Shown to classmates', 'Shared code publicly', 'Deployed and actually used'] },
  { category: 'technical', stages: SEEK, goals: AI, correctIndex: 1, weight: 1.3,
    text: 'ML interviews usually open with which round?',
    options: ['Model theory', 'A coding / DSA problem', 'System design', 'Statistics only'] },
  { category: 'technical', stages: SEEK, goals: AI, selfReport: true, correctIndex: -1, weight: 1.3,
    text: 'Do you know where your best model fails?',
    options: ['It does not fail', 'Never checked', 'I know roughly', 'I have found and characterised the failure cases'] },
];

async function run() {
  const tenantId = process.argv[2];
  if (!tenantId) { console.error('Usage: seedBankTechAI.ts <tenantId>'); process.exit(1); }
  await mongoose.connect(process.env.MONGODB_URI as string);
  const a: any = await PassportAssessment.findOne({ tenantId });
  if (!a) { console.error('No assessment for that tenant.'); process.exit(1); }
  let added = 0, updated = 0;
  for (const q of QUESTIONS) {
    const existing = a.questions.find((x: any) => x.text === q.text);
    if (existing) { Object.assign(existing, q); updated++; } else { a.questions.push(q as any); added++; }
  }
  a.markModified('questions'); await a.save();
  console.log(`Batch 5 (AI technical) — added ${added}, updated ${updated}. Bank now ${a.questions.length}.`);
  await mongoose.disconnect();
}

if (require.main === module) run().catch(e => { console.error(e); process.exit(1); });
