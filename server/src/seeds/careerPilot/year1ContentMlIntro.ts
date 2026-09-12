/**
 * T_ML_INTRO — the complete topic, eight units. DIRECTION: AI_ML and DATA.
 *
 * ── WHY THIS TOPIC ────────────────────────────────────────────────────────────────────────
 *
 * More direction inventory for AI_ML and DATA, both of which the strong profiles sample. Six
 * GUIDED concepts, a PRACTICE and a STANDARD-depth project.
 *
 * ── THE LINE THIS TOPIC HOLDS ─────────────────────────────────────────────────────────────
 *
 * An introduction to machine learning for first-years fails in one of two ways: it becomes
 * linear algebra they are not ready for, or it becomes marketing. This is neither. It is
 * literacy — what these systems actually do, what they cannot do, and how to tell whether a
 * claim about one is credible.
 *
 * No unit here asks a student to train anything serious. Every unit asks them to reason about
 * whether a model's output should be believed, because that is the skill a first-year will
 * genuinely need within a year, whatever direction they take.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const ML_INTRO_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'T_ML_INTRO_AI_ML_DL',
    notes: `Three terms, used interchangeably in public and meaning different things. Getting them
straight is the first step to reading any claim critically.

**Artificial intelligence** is the widest: any system doing something that would be called
intelligent if a person did it. A chess program using hand-written rules is AI. So is a
spam filter. The term has meant different things each decade, which is why it carries so little
information on its own.

**Machine learning** is a subset: systems that improve at a task by being shown examples,
rather than by being given rules. Nobody writes "if the email contains these words it is spam";
the system is shown thousands of labelled emails and derives the pattern.

**Deep learning** is a subset of that: machine learning using neural networks with many layers.
It is what made image recognition and language models work, and it needs far more data and
computation than the alternatives.

    AI  ⊃  Machine learning  ⊃  Deep learning

**The distinction that matters practically: rules versus examples.**

- **Rule-based** — a person writes the logic. Predictable, explainable, and limited to cases
  somebody anticipated.
- **Learned** — the system derives the logic from data. Handles cases nobody enumerated, and
  cannot fully explain itself.

That trade is the whole subject. You gain the ability to handle messy, unanticipated input and
you lose the ability to say exactly why any particular decision was made.

**When rules are the right answer**, which is more often than the hype suggests: the rules are
known and stable, you need to explain every decision, the data is scarce, or a mistake is
unacceptable. Tax calculation is rules. Nobody should learn tax rates from examples.

**"AI" in a product description usually tells you nothing.** It may mean a large language
model, a small statistical model, or a set of if-statements somebody is proud of. The useful
question is always: what does it do when it is wrong, and how would you know?`,
    mcqs: [
      mcq('The relationship between the three terms is:',
        [['AI contains machine learning, which contains deep learning', true],
          ['They are synonyms', false],
          ['Deep learning contains AI', false],
          ['They are unrelated fields', false]],
        'Nested subsets. Deep learning is one technique within one approach within a very broad goal.'),
      mcq('The defining difference between rule-based and learned systems is:',
        [['A person writes the logic, versus the system deriving it from examples', true],
          ['Speed', false], ['Cost', false], ['Programming language', false]],
        'Everything else about the trade-off follows from this one distinction.'),
      mcq('What do you give up by using a learned system?',
        [['The ability to say exactly why a particular decision was made', true],
          ['Accuracy', false], ['Speed', false], ['Nothing', false]],
        'In exchange for handling cases nobody enumerated. That is the trade, and it is not always worth making.'),
      mcq('When is a rule-based system the better choice?',
        [['When rules are known and stable, decisions must be explained, or errors are unacceptable', true],
          ['When you have lots of data', false],
          ['Never, in modern systems', false],
          ['Only for small problems', false]],
        'Nobody should learn tax rates from examples, and the same logic covers a great deal of real software.'),
    ],
    checkpoint: [
      mcq('A product says it is "AI-powered". What have you learned?',
        [['Very little — it could be a language model or a set of if-statements', true],
          ['It uses deep learning', false],
          ['It learns from users', false],
          ['It is state of the art', false]],
        'The useful question is what it does when it is wrong and how you would know.'),
      mcq('A spam filter written as hand-coded keyword rules is:',
        [['AI but not machine learning — nothing is learned from examples', true],
          ['Machine learning', false],
          ['Deep learning', false],
          ['Not AI at all', false]],
        'The historical breadth of "AI" is exactly why the term carries so little information by itself.'),
    ],
  },
  {
    unitCode: 'T_ML_INTRO_LEARNING_FROM_DATA',
    notes: `"Learning" here has a narrow technical meaning, and taking it literally is the source of
most public confusion about these systems.

**What actually happens.** A model has parameters — numbers. Training adjusts those numbers so
that the model's outputs on the training examples are closer to the correct answers. That is
all. There is no understanding, no intention, and no knowledge in the ordinary sense.

The loop:

1. Show the model an example
2. Compare its output with the correct answer
3. Measure how wrong it was — the **loss**
4. Adjust the parameters slightly to reduce the loss
5. Repeat, millions of times

**What "learning the pattern" means concretely.** Shown enough photos labelled cat or dog, a
model ends up with parameters producing "cat" for cat photos. It has not formed a concept of a
cat. It has found a function that separates those pixel arrangements.

**This is why they fail in ways that look absurd.** A model that appears to recognise cats may
have learned that cat photos in its training set were taken indoors. Show it a cat outdoors and
it fails, and it fails *confidently*, because nothing in it knows what a cat is — only what
distinguished the examples it saw.

**Generalisation is the actual goal.** Performing well on the training data is easy and
worthless: the model could memorise it. What matters is performing well on data it has never
seen, and that is a genuinely different property, with its own unit.

**What is needed for this to work at all:**

- **Enough examples**, and how many depends on the problem
- **Representative examples** — if they do not resemble what it will meet, nothing works
- **Correct labels** — a model trained on wrong answers learns the wrong answers faithfully
- **Signal actually present in the data** — no amount of training extracts a pattern that is
  not there

**The last point is the one people skip.** If the information required to predict the outcome
is simply absent from the inputs, no model and no quantity of data will help. "We do not have
the data to answer this" is a legitimate and frequently correct conclusion.`,
    mcqs: [
      mcq('What does training a model actually do?',
        [['Adjusts numeric parameters to reduce the error on the training examples', true],
          ['Stores the examples for later', false],
          ['Builds a set of rules', false],
          ['Forms concepts', false]],
        'No understanding and no intention — a function is fitted, and everything surprising about these systems follows from that.'),
      mcq('A cat classifier fails on outdoor photos. The likely explanation is:',
        [['It learned something that happened to separate its examples, such as indoor settings', true],
          ['It needs more layers', false],
          ['Cats look different outdoors', false],
          ['A bug in the code', false]],
        'It never formed a concept of a cat, only a function separating the pixel arrangements it was shown.'),
      mcq('Why is performing well on the training data worthless by itself?',
        [['The model could simply have memorised it — generalisation is the actual goal', true],
          ['Training data is always wrong', false],
          ['It proves overfitting', false],
          ['It is not worthless', false]],
        'Performing on data it has never seen is a genuinely different property, and the only one that matters.'),
      mcq('The requirement people most often skip is:',
        [['That the signal is present in the data at all', true],
          ['Enough examples', false],
          ['Correct labels', false],
          ['Enough computation', false]],
        'If the information needed is absent from the inputs, no model and no quantity of data will produce it.'),
    ],
    checkpoint: [
      mcq('A model trained on mislabelled data will:',
        [['Learn the wrong answers faithfully', true],
          ['Detect and correct the errors', false],
          ['Fail to train', false],
          ['Be unaffected if most labels are right', false]],
        'It has no way to know a label is wrong; the labels ARE the definition of correct during training.'),
      mcq('"We do not have the data to answer this" is:',
        [['A legitimate and frequently correct conclusion', true],
          ['An admission of failure', false],
          ['Solved by more data of the same kind', false],
          ['Solved by a bigger model', false]],
        'Neither scale nor architecture can extract information that was never in the inputs.'),
    ],
  },
  {
    unitCode: 'T_ML_INTRO_SUPERVISED',
    notes: `Supervised learning uses **labelled** examples: inputs paired with the correct output.
It is the majority of applied machine learning, because it is the setting where you can measure
whether you succeeded.

**Two things it is used for, and the distinction is worth being precise about:**

**Classification** — predict a category.

- Spam or not spam
- Which of ten digits this image shows
- Will this customer leave: yes or no

**Regression** — predict a number.

- What this house will sell for
- How many units will be sold next month
- How long this request will take

**The question that separates them:** is the output a label from a fixed set, or a quantity on
a continuous scale? Predicting a rating from 1 to 5 can be either, depending on whether 4 is
"one more than 3" or just a different category — and choosing deliberately matters, because it
changes what "wrong" means. A regression that predicts 4.2 when the answer is 4 is nearly
right; a classifier that says "4" or "5" is simply right or wrong.

**What you need:** input features, correct labels, and enough examples covering the range of
cases you expect.

**Where the labels come from is the practical bottleneck.** Sometimes they are free — historical
outcomes you already recorded. Often somebody has to create them by hand, and that is slow,
expensive and inconsistent between labellers. **Label quality sets the ceiling on model
quality**, and a great deal of real machine-learning work is actually work on labels.

**Measuring success, and why accuracy alone misleads.** For a disease affecting 1% of people, a
model answering "no" every time is 99% accurate and completely useless. This is the base-rate
problem from statistics arriving in a new costume.

So classification is measured with:

- **Precision** — of those it flagged, how many were right
- **Recall** — of those it should have flagged, how many it caught
- And the trade between them, because raising one usually lowers the other

**Which matters more depends entirely on the cost of each error.** Missing a cancer is far worse
than a false alarm, so recall dominates. Wrongly blocking a legitimate payment is worse than
letting one suspicious one through, so precision dominates. That decision is a product
judgement, not a technical one.`,
    mcqs: [
      mcq('Predicting house price is:',
        [['Regression — the output is a quantity on a continuous scale', true],
          ['Classification', false], ['Unsupervised', false], ['Neither', false]],
        'Price is a number where being close counts. A classifier would treat 500k and 510k as simply different.'),
      mcq('A model predicting "no disease" always is 99% accurate on a 1% disease. What does that show?',
        [['Accuracy alone is misleading when classes are imbalanced', true],
          ['The model is good', false],
          ['The data is wrong', false],
          ['99% is the ceiling', false]],
        'The base-rate problem from statistics in a new costume, and the reason precision and recall exist.'),
      mcq('Precision and recall differ how?',
        [['Precision: of those flagged, how many were right. Recall: of those it should catch, how many it did', true],
          ['They are the same', false],
          ['Precision is for regression', false],
          ['Recall measures speed', false]],
        'Raising one usually lowers the other, which is why you must decide which error is more costly.'),
      mcq('Why does label quality set a ceiling on model quality?',
        [['The labels define what correct means during training', true],
          ['Labels are expensive', false],
          ['More labels mean better models', false],
          ['It does not', false]],
        'A great deal of real machine-learning work is actually work on labels, for exactly this reason.'),
    ],
    checkpoint: [
      mcq('For cancer screening, which matters more and why?',
        [['Recall — missing a real case is far worse than a false alarm', true],
          ['Precision, to avoid worrying people', false],
          ['Accuracy', false],
          ['They are equally important', false]],
        'Which error is more costly is a product judgement rather than a technical one.'),
      mcq('Predicting a 1-5 rating could be either task. What decides?',
        [['Whether 4 is "one more than 3" or merely a different category', true],
          ['The amount of data', false],
          ['The model type', false],
          ['It is always classification', false]],
        'It changes what "wrong" means: nearly-right is meaningful for regression and not for classification.'),
    ],
  },
  {
    unitCode: 'T_ML_INTRO_UNSUPERVISED',
    notes: `Unsupervised learning works with **no labels at all**. Nobody has said what the right
answer is; the system finds structure in the data itself.

**Clustering** — group similar items together.

Given customer purchase histories with no categories, find groups that behave similarly. The
algorithm does not know what the groups mean. It finds them; a human interprets them.

**Dimensionality reduction** — describe the same data with fewer numbers, keeping what matters.
Useful for visualising high-dimensional data and for feeding a smaller input to another model.

**Anomaly detection** — find the points unlike the rest. Fraud, faults, intrusions.

**The crucial difference from supervised learning: there is no right answer to check against.**

In supervised learning you hold back data and measure whether predictions match the known
labels. Here there is nothing to match. If you cluster customers into four groups, nothing
tells you whether four was correct, or whether the groups mean anything.

**So evaluation is a judgement.** Are the clusters stable when you rerun with different starting
conditions? Do they correspond to something recognisable? Are they useful for a decision
somebody actually has to make? Those are the questions, and all three are qualitative.

**This is where unsupervised results get oversold.** "We discovered five customer segments"
sounds like a finding. The algorithm will produce five segments from any data, including
random noise, because that is what it was asked to do. **The number of clusters was usually
chosen by a person**, and the algorithm cannot tell you it was wrong.

**The honest framing:** clustering generates hypotheses. It does not confirm them. A segmentation
is worth something once somebody has checked that the groups differ in a way that matters and
that the difference persists on new data.

**When to reach for it.** You have data and no labels, and labelling is impractical. Or you want
to explore before deciding what to predict. It is frequently a first step rather than an answer.`,
    mcqs: [
      mcq('The defining difference from supervised learning is:',
        [['There are no labels, so there is no right answer to check against', true],
          ['It uses less data', false],
          ['It is faster', false],
          ['It only works on numbers', false]],
        'Everything difficult about evaluating unsupervised results follows from having nothing to compare with.'),
      mcq('You cluster customers into five groups. What has the algorithm established?',
        [['Nothing about whether five is right or whether the groups mean anything', true],
          ['That there are five real segments', false],
          ['That the data is well structured', false],
          ['That five is optimal', false]],
        'It will produce five groups from random noise too, because producing five groups is what it was asked to do.'),
      mcq('How should clustering results be treated?',
        [['As hypotheses to be checked, not as findings', true],
          ['As confirmed segments', false],
          ['As ground truth', false],
          ['As statistically significant', false]],
        'Worth something once somebody has checked the groups differ in a way that matters and persists on new data.'),
      mcq('When is unsupervised learning the right starting point?',
        [['You have data, no labels, and labelling is impractical', true],
          ['You know what you want to predict', false],
          ['You have very little data', false],
          ['Accuracy matters most', false]],
        'Frequently a first step towards deciding what to predict rather than an answer in itself.'),
    ],
    checkpoint: [
      mcq('How can you partially validate a clustering?',
        [['Check whether the clusters are stable across reruns and correspond to something recognisable', true],
          ['Compute its accuracy', false],
          ['Compare against labels', false],
          ['You cannot validate it at all', false]],
        'Qualitative checks, since the quantitative one available to supervised learning does not exist here.'),
      mcq('"We discovered five customer segments" is oversold because:',
        [['The number five was almost certainly chosen by a person', true],
          ['Five is too few', false],
          ['Segments are not real', false],
          ['Clustering is unreliable', false]],
        'And the algorithm cannot tell you the choice was wrong, because it has no notion of a correct number.'),
    ],
  },
  {
    unitCode: 'T_ML_INTRO_TRAINING_AND_TESTING',
    notes: `A model that is perfect on the data it learned from is often worthless. Understanding
why is the most important idea in this topic.

**Overfitting** is learning the training data so specifically that the model captures its noise
and accidents rather than the underlying pattern. It scores brilliantly on data it has seen and
badly on anything else.

**The human analogy that actually fits.** A student who memorises past exam papers scores well
if the questions repeat and fails when they change. They learned the papers, not the subject.

**The defence: hold data back.**

- **Training set** (~70%) — the model learns from this
- **Validation set** (~15%) — used while tuning, to compare options
- **Test set** (~15%) — touched **once**, at the very end

**The test set must not influence any decision.** The moment you look at it and change something,
it has become a second validation set and stops measuring generalisation. This is violated
constantly, usually without anybody noticing, and the model then looks better than it is.

**How to recognise overfitting:** training accuracy high and rising, test accuracy lower and
plateauing or falling. That gap is the diagnostic.

**Underfitting** is the opposite and less discussed: the model is too simple to capture the real
pattern, so it performs poorly on both. Both sets scoring badly points here, not to overfitting.

**Data leakage** is the subtler failure and it produces suspiciously excellent results. Information
from the test set reaches training somehow:

- Scaling computed over the whole dataset before splitting
- The same customer appearing in both sets
- A feature that encodes the answer — including "date account closed" when predicting whether
  an account closed

**The rule of thumb worth carrying:** if a result seems too good, suspect leakage before
celebrating. Genuine 99% accuracy on a hard problem is rare; leakage producing it is common.`,
    mcqs: [
      mcq('Overfitting is:',
        [['Learning the training data so specifically that noise is captured instead of the pattern', true],
          ['Using too much data', false],
          ['Training for too little time', false],
          ['A model that is too simple', false]],
        'The student who memorised past papers: excellent when questions repeat, lost when they change.'),
      mcq('Both training and test accuracy are poor. This indicates:',
        [['Underfitting — the model is too simple for the pattern', true],
          ['Overfitting', false],
          ['Data leakage', false],
          ['A good model', false]],
        'Overfitting shows as a GAP between the two. Both being poor is the opposite problem.'),
      mcq('Why must the test set be used only once?',
        [['Looking and then changing something turns it into a validation set and stops it measuring generalisation', true],
          ['It is computationally expensive', false],
          ['It degrades the data', false],
          ['It need not be', false]],
        'Violated constantly without anybody noticing, and the model then looks better than it is.'),
      mcq('A model reaches 99% on a hard problem. Your first suspicion should be:',
        [['Data leakage', true],
          ['A genuine breakthrough', false],
          ['Underfitting', false],
          ['Too little data', false]],
        'Genuine 99% on a hard problem is rare; leakage producing it is common, so suspect before celebrating.'),
    ],
    checkpoint: [
      mcq('Which is an example of data leakage?',
        [['Including "date account closed" as a feature when predicting whether an account closed', true],
          ['Using 70% of data for training', false],
          ['Having more features than rows', false],
          ['Training for many epochs', false]],
        'The feature encodes the answer, so the model learns something unavailable at prediction time.'),
      mcq('Training accuracy rising while test accuracy falls indicates:',
        [['Overfitting — the gap between them is the diagnostic', true],
          ['Underfitting', false],
          ['Normal training', false],
          ['A bug', false]],
        'The divergence itself is the signal, which is why both curves are worth watching rather than one.'),
    ],
  },
  {
    unitCode: 'T_ML_INTRO_WHERE_IT_FAILS',
    notes: `Models fail in characteristic ways. Knowing them is what lets you judge whether an
output should be believed — the actual skill this topic exists to build.

**1. Bias in the data becomes bias in the model.**

A model trained on historical hiring decisions learns the historical decisions, including the
discriminatory ones. It does not know they were wrong; it has no notion of wrong beyond
matching the examples. **"The algorithm decided" is not neutrality** — it is the past,
automated and given a veneer of objectivity that makes it harder to challenge.

**2. Distribution shift.**

The world changes and the model does not. A model trained on pre-2020 shopping behaviour was
badly wrong in 2020. Performance degrades quietly, because nothing announces that the incoming
data no longer resembles the training data. This is why deployed models need monitoring rather
than just evaluation.

**3. Confident wrongness.**

Most models output a probability, and that number is not reliability. A model can be 99%
confident and wrong, particularly on inputs unlike anything it was trained on — which is
exactly when you most need it to say "I do not know". Very few systems do.

**4. Correlation captured as causation.**

A model may key on something correlated with the answer but not causing it, which works until
the correlation breaks. The much-repeated example: a model detecting pneumonia from X-rays that
had partly learned to recognise the portable scanner used for the sickest patients. Accurate in
testing, useless in a different hospital.

**5. Optimising the stated objective, not the intended one.**

A recommender told to maximise watch time will learn that outrage sustains attention. It did
exactly what it was asked. The gap between the measurable proxy and the thing actually wanted
is where a great deal of real harm lives.

**6. The absent feedback loop.**

A model rejecting loan applications never learns whether the rejected applicants would have
repaid, because they were never given the chance. The data it accumulates confirms its own
decisions.

**The questions to ask of any deployed model:**

- What data was it trained on, and who is under-represented?
- What happens when it is wrong, and who bears that cost?
- Has the world changed since training?
- What exactly is it optimising, and is that the thing we want?
- How would we find out if it degraded?`,
    mcqs: [
      mcq('A model trained on historical hiring decisions is claimed to be objective. What is wrong?',
        [['It learned the historical decisions, discriminatory ones included, and automation adds no neutrality', true],
          ['It needs more data', false],
          ['It is objective', false],
          ['Hiring cannot be modelled', false]],
        'The veneer of objectivity is the harm: the same bias becomes harder to challenge once a system produced it.'),
      mcq('A model quietly gets worse over months with no code change. Most likely:',
        [['Distribution shift — the incoming data no longer resembles the training data', true],
          ['Overfitting', false],
          ['Hardware degradation', false],
          ['A bug', false]],
        'Nothing announces it, which is why deployed models need monitoring rather than only evaluation.'),
      mcq('A pneumonia model partly learned to recognise a portable scanner. What failure is that?',
        [['Correlation captured as causation — it breaks in a different hospital', true],
          ['Overfitting to noise', false],
          ['Distribution shift', false],
          ['Data leakage in the labels', false]],
        'Accurate in testing because the correlation held there, and useless the moment it does not.'),
      mcq('A recommender optimising watch time promotes outrage. This is:',
        [['The system optimising the stated objective rather than the intended one', true],
          ['A bug', false],
          ['Distribution shift', false],
          ['Overfitting', false]],
        'It did exactly what it was asked. The gap between the proxy and the intent is where much real harm lives.'),
    ],
    checkpoint: [
      mcq('A model is 99% confident and wrong. What does the confidence number mean?',
        [['Less than it appears — confidence is unreliable on inputs unlike the training data', true],
          ['A 1% chance of error', false],
          ['The model is broken', false],
          ['It is well calibrated', false]],
        'Exactly when you most need "I do not know" is when you are least likely to get it.'),
      mcq('A loan model never learns about applicants it rejected because:',
        [['They were never given the chance to repay, so no outcome exists', true],
          ['The data is deleted', false],
          ['Rejections are not recorded', false],
          ['Privacy rules', false]],
        'The accumulated data confirms the model\'s own decisions, which is a feedback loop rather than evidence.'),
    ],
  },
  {
    unitCode: 'T_ML_INTRO_PRACTICE',
    notes: `No new concepts. These exercises classify real scenarios and predict where each would
fail, which is the applied form of everything in this topic.

**Why prediction rather than computation.** You are not going to train a production model this
year. You are, almost immediately, going to be in a room where somebody proposes one — and the
useful contribution is "what happens when it is wrong, and who is under-represented in that
data".

**The method for any scenario:**

1. **Supervised or unsupervised?** Are there labels?
2. **If supervised: classification or regression?** Category or quantity?
3. **Where do the labels come from, and are they trustworthy?**
4. **What would the training data over-represent, and who is missing from it?**
5. **What happens when it is wrong, and who bears the cost?**
6. **Would the world change under it?**

**The checklist for judging any claim about a model:**

- What was it measured on, and was that data ever used in training?
- Is accuracy being quoted on an imbalanced problem?
- Is this correlation being described as causation?
- What is it actually optimising, as opposed to what it is said to do?
- How would anybody notice if it degraded?

**A caution on your own reasoning.** The failure modes in the previous unit are easy to
recognise in somebody else's system and hard to see in one you are enthusiastic about. When you
propose something, deliberately write down the way it will fail before you write down what it
will achieve.`,
    mcqs: [
      mcq('Predicting which of 26 letters a handwritten character is:',
        [['Supervised classification — labelled examples, categorical output', true],
          ['Supervised regression', false],
          ['Unsupervised clustering', false],
          ['Anomaly detection', false]],
        'Fixed set of categories with known correct answers is the definition of classification.'),
      mcq('Grouping news articles by topic with no predefined categories is:',
        [['Unsupervised clustering', true],
          ['Supervised classification', false],
          ['Regression', false],
          ['Overfitting', false]],
        'No labels means no right answer to check against, so evaluation becomes a judgement.'),
      mcq('A resume screener trained on past hires is proposed. The first question is:',
        [['Whose resumes are under-represented in the historical hires?', true],
          ['How accurate is it?', false],
          ['Which model architecture?', false],
          ['How fast is it?', false]],
        'Accuracy against biased labels measures agreement with the bias, so it cannot answer the question that matters.'),
      mcq('A model predicting equipment failure is 99.9% accurate. Failures are 0.1% of cases. What does that suggest?',
        [['It may simply be predicting "no failure" every time', true],
          ['It is excellent', false],
          ['It is overfitting', false],
          ['The data is wrong', false]],
        'The base-rate trap again. Precision and recall on the failure class are the numbers that would settle it.'),
      mcq('Before proposing a model, you should deliberately:',
        [['Write down how it will fail before writing what it will achieve', true],
          ['Estimate the accuracy', false],
          ['Choose the architecture', false],
          ['Collect more data', false]],
        'The failure modes are easy to see in somebody else\'s system and hard to see in one you are enthusiastic about.'),
    ],
    checkpoint: [
      mcq('A claim quotes accuracy on a heavily imbalanced problem. What should you ask for?',
        [['Precision and recall on the rare class', true],
          ['A larger sample', false],
          ['The architecture', false],
          ['Training time', false]],
        'Accuracy is dominated by the majority class and can be excellent while the model never detects the thing that matters.'),
      mcq('The most useful contribution a first-year can make to a model proposal is:',
        [['Asking what happens when it is wrong and who is under-represented in the data', true],
          ['Suggesting a better architecture', false],
          ['Estimating training cost', false],
          ['Recommending more data', false]],
        'It requires no specialist knowledge and it is the question most often skipped.'),
    ],
  },
  {
    unitCode: 'T_ML_INTRO_MINI_PROJECT',
    notes: `Build or run a simple model, examine where it is wrong, and write the honest summary a
non-technical person could act on.

**The model is the easy part and the smallest part of the marks.** A basic classifier on a
public dataset is a short piece of work with plenty of tutorials. What this project assesses is
what you do next: looking at the errors, working out what they have in common, and reporting it
to somebody who cannot read the code.

**Why the errors specifically.** An accuracy number tells you how often it was wrong. The
errors tell you *when* — and that is what determines whether the model is usable. A model that
is 90% accurate and wrong randomly is very different from one that is 90% accurate and wrong on
every case from one group.

**How to examine errors properly:**

1. Get the list of wrong predictions, not just the count
2. Look at twenty of them, individually
3. Ask what they share — a category, a length, a missing field, a demographic
4. Check whether the error rate differs between subgroups, and by how much
5. Find the cases where it was confident and wrong; those are the dangerous ones

**Writing for a non-technical reader** is a real constraint and a real skill. No accuracy figure
without a plain-language statement of what it means. No jargon that has not been explained. And
a clear statement of what the model should NOT be used for — which is usually the most valuable
sentence in the whole report.

**Expect to find something uncomfortable.** Nearly every honest error analysis turns up a
subgroup the model serves badly. Reporting it is the point of the exercise, not a failure of it.

The brief, acceptance criteria and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — A Model, Its Errors, and What You Would Tell Somebody',
      description: `Build or run a simple model on real data, analyse where and how it is wrong, and write a summary a non-technical decision-maker could act on. The error analysis and the plain-language report carry most of the marks.`,
      instructions: `**The brief**

**Part 1 — A model.** Train or run a simple classifier or regressor on a real public dataset.
Keep it basic — logistic regression, a decision tree, k-nearest neighbours. A library is
expected; implementing the algorithm is not the point.

Requirements:

- Split into train and test **before** any preprocessing that learns from the data
- Report the metric appropriate to the problem, and say why that metric
- If it is a classification problem with imbalance, report precision and recall, not accuracy
  alone

**Part 2 — Error analysis.** This is the substance.

- List the errors, not just the count
- Examine at least twenty individually
- Identify at least **two patterns** in them — what do the wrong cases share?
- Compare the error rate between at least two subgroups present in your data
- Find the cases where the model was most confident and wrong, and say what they have in common

**Part 3 — The report for a non-technical reader.**

Roughly 400-500 words, addressed to somebody deciding whether to use this. It must contain:

- What the model does, in one sentence with no jargon
- How well it works, in plain language, with the number explained rather than quoted
- **Where it fails, specifically** — the patterns you found
- **What it should not be used for**
- What you would need in order to improve it

**What to submit**

1. Your code or notebook.
2. The error analysis, with the examples you examined and the patterns you identified.
3. The non-technical report.
4. A short note (150 words) on anything that surprised you, and anything you were tempted to
   leave out of the report.

**Constraints**

- Real public data. No synthetic datasets.
- No causal language about what the model "knows" or "understands".
- Every accuracy figure must be accompanied by the base rate, so the reader can judge it.

**Where the marks are.** A model with mediocre accuracy and a sharp, honest error analysis
scores well above a high-accuracy model reported without one. If your error analysis found
nothing uncomfortable, look harder — nearly every model serves some subgroup badly, and finding
it is the exercise.`,
      rubric: [
        {
          criterion: 'The model',
          description: 'Runs correctly on real data, split before preprocessing, with an appropriate metric chosen and justified. Precision and recall where the problem is imbalanced.',
          maxPoints: 20,
        },
        {
          criterion: 'Error analysis',
          description: 'At least twenty errors examined individually, two genuine patterns identified, subgroup error rates compared, and the confidently-wrong cases characterised.',
          maxPoints: 35,
        },
        {
          criterion: 'The non-technical report',
          description: 'One-sentence plain description, performance explained rather than quoted, failure patterns stated specifically, and an explicit statement of what it should not be used for.',
          maxPoints: 30,
        },
        {
          criterion: 'Honesty',
          description: 'Accuracy always accompanied by the base rate; no causal or anthropomorphic language; the note identifies what was tempting to omit.',
          maxPoints: 15,
        },
      ],
      totalPoints: 100,
    },
  },
];
