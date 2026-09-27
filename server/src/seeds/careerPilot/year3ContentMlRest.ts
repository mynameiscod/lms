/**
 * T3_ML_EVALUATION, T3_ML_PIPELINES and T3_ML_PROJECT — eleven units. Year 3, AI/ML track.
 * Finishes S15.
 *
 * ── EVALUATION IS THE JOB ─────────────────────────────────────────────────────────────────
 *
 * If the track has one thesis, it is that a machine learning engineer's value is in knowing
 * whether a model works, not in producing one. Producing one is a library call; knowing
 * whether it works is judgement, and it is what the whole of this file is about.
 *
 * WHICH_METRIC leads because a metric is a claim about what matters, and choosing it
 * carelessly means optimising the wrong thing with perfect rigour.
 *
 * RESPONSIBLE_USE attributes to AI_RESPONSIBLE_USE and is deliberately not a separate ethics
 * module bolted on the end. It asks one engineering question — who is this wrong about? — and
 * answers it with a subgroup breakdown, which is an ordinary measurement a graduate can
 * actually perform rather than a principle they can only agree with.
 *
 * The project's EXPLAIN unit is called "Defending the Evaluation" rather than "Explaining the
 * Project", and that naming is the point: in an ML interview the evaluation is what gets
 * attacked, and a candidate who has only prepared to describe their model is unprepared.
 *
 * Attribution: EVALUATION defaults to ML_EVALUATION with the responsible-use unit overridden.
 * PIPELINES is all ML_WORKFLOW. The project is all PRODUCTION_ENGINEERING.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const ML_REST_BUNDLES: PilotBundle[] = [
  /* ══ T3_ML_EVALUATION ═══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_ML_EVALUATION_WHICH_METRIC',
    notes: `**A metric is a claim about what matters.** Choose it carelessly and you optimise
the wrong thing with perfect rigour, which is a worse outcome than not optimising at all —
because everybody believes the number.

## Start from the decision

**What does the output cause somebody to do, and what does each mistake cost?**

That question chooses the metric. Everything else is convention.

- **A screening test** — missing a case is catastrophic. Recall.
- **A spam filter** — deleting real mail is unacceptable. Precision.
- **A price estimate** — how wrong, in pounds. Mean absolute error.
- **A ranked worklist** — are the top hundred good? Precision at k.

**Notice that the last one has a metric most people do not know exists**, and it is the right
one for a very common shape of problem.

## The metrics worth knowing, and what each hides

**Accuracy** hides imbalance. 99% on a 1% positive rate is achieved by predicting negative.

**Precision** hides how many you missed.

**Recall** hides how many false alarms you raised.

**F1** hides the trade-off between them, which is often the decision itself.

**AUC** measures ranking quality across all thresholds. **Useful for comparing models, and it
does not tell you how the model performs at the threshold you will actually use** — which is
the thing you need to know before deploying.

**Precision at k** — of the top k by score, how many are right. **The honest metric when
capacity is fixed**, and it matches what the team will actually do.

**Mean absolute error** — average size of the mistake, in real units. Interpretable.

**Root mean squared error** — punishes large errors. Right when a big mistake is
disproportionately bad.

## One metric to optimise, several to watch

**Pick one to improve.** Optimising three at once means optimising none, and it produces
endless argument about trade-offs nobody decided.

**Then watch the others** so you notice when improving one destroys another. Recall rising
while precision collapses is not progress, and a single number would have hidden it.

## Segment it

**An overall metric can hide complete failure on a subgroup.** 90% accuracy overall, 45% on
one customer type, and the overall number is what gets reported.

**Report the metric per meaningful segment**, always. This is the same measurement the
responsible-use unit requires, and it is worth doing for ordinary quality reasons as well.

## Beware the metric that is easy to game

**If you optimise a proxy, you get the proxy.**

Optimise clicks and you get clickbait. Optimise time on site and you get an interface that is
hard to leave. Optimise ticket closure and you get tickets closed without being solved.

**Ask what behaviour maximising this metric would produce**, and whether you want it. **That
question is cheap and it is almost never asked**, and it catches the whole class of problem
before anything is built.

## Report it honestly

> "Precision at 100 is 0.72 — of the hundred cases we flag each day, 72 are genuine. Recall is
> 0.31, so we are catching about a third of the total. The baseline rule achieves 0.55 at the
> same volume."

**Three numbers and a comparison.** A reader can decide from that. From "AUC 0.89", they
cannot.`,
    mcqs: [
      mcq('The question that chooses the metric is:',
        [['What the output causes somebody to do, and what each mistake costs', true],
          ['Which metric is standard for this problem type', false],
          ['Which metric the model optimises internally', false],
          ['Which metric is most robust to imbalance', false]],
        'Everything else is convention.'),
      mcq('AUC does not tell you:',
        [['How the model performs at the threshold you will use', true],
          ['Whether the model ranks better than chance', false],
          ['How two models compare overall', false],
          ['Whether the classes are imbalanced', false]],
        'Which is the thing you need before deploying.'),
      mcq('Precision at k is the honest metric when:',
        [['Capacity is fixed, so only the top k are acted on', true],
          ['The classes are heavily imbalanced', false],
          ['The probabilities are uncalibrated', false],
          ['The threshold has not been chosen', false]],
        'It matches what the team will actually do.'),
      mcq('Optimising three metrics at once:',
        [['Means optimising none, and produces endless argument', true],
          ['Gives a more balanced model', false],
          ['Is standard practice for production models', false],
          ['Requires a combined objective function', false]],
        'Pick one to improve and watch the others.'),
    ],
    checkpoint: [
      mcq('"What behaviour would maximising this metric produce?" is:',
        [['Cheap, almost never asked, and catches a whole class of problem', true],
          ['A question for the product team rather than the engineer', false],
          ['Only relevant to recommendation systems', false],
          ['Answered by the offline evaluation', false]],
        'Optimise clicks and you get clickbait.'),
      mcq('An overall metric of 90% can hide:',
        [['Complete failure on one subgroup', true],
          ['A calibration problem', false],
          ['An unstable random seed', false],
          ['A leaked feature', false]],
        'Report the metric per meaningful segment, always.'),
      mcq('"AUC 0.89" as a report is inadequate because:',
        [['A reader cannot decide anything from it', true],
          ['AUC is an unreliable metric', false],
          ['It omits the confidence interval', false],
          ['It does not state the model family', false]],
        'Three numbers and a baseline comparison lets them decide.'),
    ],
  },

  {
    unitCode: 'T3_ML_EVALUATION_OVERFITTING',
    notes: `**Overfitting is the model learning your training data rather than the pattern
behind it.** It memorises the noise, and the noise does not repeat.

## What it looks like

**Training error keeps falling. Validation error stops falling, then rises.**

That divergence is the definition, and the point where validation turns is where you should
have stopped.

**Plot both curves.** It takes one line of code and it diagnoses the most common failure in
modelling. A student who plots them has an answer; one who reports a single score has a
number.

## Why it happens

**Too much capacity for the data.** A model flexible enough to fit any pattern will fit the
one in your sample, including the parts that are accidental.

**Too little data.** The same model on ten times the rows would generalise.

**Too many features**, especially relative to rows.

**Training too long** on an iterative model.

**Leakage**, which produces the same symptom offline and a worse one in production.

## Fixing it, in the order worth trying

**1. More data.** Always the best answer where it is available, and frequently it is not.

**2. Fewer features.** The cheapest real fix, and it usually costs less than people fear.

**3. A simpler model.** Fewer parameters, less depth.

**4. Regularisation.** A penalty on complexity, which lets you keep the model family and
constrain it.

**5. Early stopping.** Halt when validation stops improving.

**6. Ensembling.** Averaging several models reduces variance.

**Note the order.** People reach for four and five first because they are one parameter each,
and two is usually more effective and makes the model easier to explain as well.

## Underfitting, the other side

**Both errors high, and close together.** The model cannot capture the pattern.

**Fixes:** more capacity, better features, less regularisation.

**And the possibility people forget:** there may be no signal. **If you are at the baseline and
cannot move, the features may genuinely not predict the target** — that is a finding, not a
failure, and reporting it early saves everybody time.

## The trap that is not overfitting

**Overfitting to the validation set.**

You try forty configurations, keep the one with the best validation score, and that score is
now optimistic — you selected on it. The model is tuned to that particular split's noise.

**This is why the test set exists and why it is touched once.** And with a small validation
set, a difference of one point between configurations is frequently noise: **you are choosing
between models that are the same.**

## Detecting it honestly

**The learning curve.** Performance against training set size. If validation is still improving
as data grows, more data will help. If it has plateaued, it will not — and that tells you
whether to collect more or to change approach, which is a genuinely useful thing to know.

**Cross-validation variance.** If the score swings widely across folds, the estimate is
unstable and the model is sensitive to which rows it saw.

**And the seed check from the workflow unit.** If three seeds give scores spanning more than
the improvement you are claiming, you have not demonstrated an improvement.`,
    mcqs: [
      mcq('Overfitting is diagnosed by:',
        [['Training error falling while validation error rises', true],
          ['A high training error', false],
          ['A large gap between test and production', false],
          ['An unstable score across seeds', false]],
        'The divergence is the definition, and the turn is where you should have stopped.'),
      mcq('The cheapest real fix after more data is:',
        [['Fewer features', true],
          ['Regularisation', false],
          ['Early stopping', false],
          ['A simpler model family', false]],
        'Usually more effective than the one-parameter fixes, and easier to explain.'),
      mcq('Both errors high and close together means:',
        [['Underfitting, or no signal in the features', true],
          ['Overfitting to the validation set', false],
          ['A leak in the preprocessing', false],
          ['An unsuitable metric', false]],
        'And no signal is a finding rather than a failure.'),
      mcq('Trying forty configurations and keeping the best validation score:',
        [['Makes that score optimistic, because you selected on it', true],
          ['Is the standard tuning procedure with no cost', false],
          ['Requires a larger validation set', false],
          ['Overfits the training data specifically', false]],
        'Which is why the test set exists and is touched once.'),
    ],
    checkpoint: [
      mcq('A learning curve that has plateaued tells you:',
        [['More data will not help, so change approach', true],
          ['The model has converged entirely correctly', false],
          ['The validation set is too small', false],
          ['Regularisation is too strong', false]],
        'Genuinely useful: collect more, or do something different.'),
      mcq('A one-point difference between configurations on a small validation set is:',
        [['Frequently noise — you are choosing between identical models', true],
          ['A meaningful improvement that is well worth keeping', false],
          ['Evidence of better regularisation', false],
          ['Reason to increase the model capacity', false]],
        'Check it against the variation across seeds and folds.'),
      mcq('A score swinging widely across cross-validation folds indicates:',
        [['An unstable estimate and sensitivity to which rows were seen', true],
          ['Overfitting rather badly to the training data itself', false],
          ['A leak between the folds', false],
          ['An inappropriate number of folds', false]],
        'The estimate is not trustworthy at that precision.'),
    ],
  },

  {
    unitCode: 'T3_ML_EVALUATION_RESPONSIBLE_USE',
    notes: `**Who is this model wrong about?**

That is the question, and it is an engineering question with a measurable answer — not a
principle you can only agree with. This unit is not an ethics module bolted on the end; it is a
subgroup breakdown you can perform this afternoon.

## Aggregate metrics hide the people who are harmed

A model at 92% accuracy overall.

Broken down: 95% on the largest group, 61% on a smaller one.

**The smaller group experiences a different system** — and nothing in the headline number says
so. **They are the people who will complain, and the complaint will be correct.**

## Measure it

**Break every metric down by every group you can identify**, and do it as routine rather than
as a special exercise.

Age, location, language, customer type, device, account age, referral source — whatever your
data has. **You do not need a protected characteristic in the data to find a disparity**;
proxies will show it, and often the proxy is the mechanism.

**Report the worst group, not just the average.** A model that is excellent on average and
poor for a tenth of users is a model that is poor for a tenth of users.

## Where the disparity comes from

**Less data about that group.** The model is simply worse at what it has seen less of, and
that is the commonest mechanism by a distance.

**Historical bias in the labels.** If past decisions were biased, a model trained to reproduce
them reproduces the bias faithfully — and with a veneer of objectivity that makes it harder to
challenge than the original decision was.

**A proxy feature.** Postcode encodes a great deal more than location.

**A different relationship in that group.** The pattern that holds for most people does not
hold for them, and a single model cannot express both.

## The questions to ask before deploying

**Who is affected by a mistake, and how badly?** A wrong film recommendation and a wrong loan
decision are not the same kind of wrong.

**Can they appeal?** A decision with no route to challenge it should be held to a higher
standard than one a person can contest.

**Would I be comfortable explaining this decision to the person affected?** If the answer is
"the model said so", that is not an explanation, and in several jurisdictions it is not
legally sufficient either.

**What happens as it runs?** A model that routes opportunities away from a group reduces that
group's future data, which makes the model worse for them, which routes more away. **Feedback
loops of this shape are common and they are invisible in an offline evaluation.**

## What to do about it

**Measure and report.** The minimum, and it is more than most do.

**Collect better data** for the groups where it is thin. Often the most effective fix and the
least glamorous.

**Reconsider the target.** If the label encodes a biased past decision, predicting it faithfully
is the problem rather than the solution.

**Set a floor**, not just an average. "No group below 80%" is a requirement you can hold a
model to.

**Or do not deploy.** **A model that works for most people and fails a group is sometimes the
wrong thing to ship**, and being able to say so is part of the job rather than an obstacle to
it.

## Write it down

**In the model documentation: what it was trained on, who it was evaluated on, where it
performs worst, and what it should not be used for.**

That last item matters most. **A model built to rank marketing leads will eventually be used to
decide something consequential**, by somebody who was not there when it was built — and the
written limitation is the only thing standing between the two.`,
    mcqs: [
      mcq('The engineering question this unit asks is:',
        [['Who is this model wrong about', true],
          ['Is this model fair by a formal definition', false],
          ['Does this model comply with regulation', false],
          ['Should this model be built at all', false]],
        'It has a measurable answer: a subgroup breakdown.'),
      mcq('The commonest mechanism for a subgroup disparity is:',
        [['Less data about that group', true],
          ['A biased feature in the model', false],
          ['A deliberately skewed sample', false],
          ['An inappropriate metric', false]],
        'The model is worse at what it has seen less of.'),
      mcq('A model trained on biased historical decisions:',
        [['Reproduces the bias with a veneer of objectivity', true],
          ['Corrects for the bias through averaging', false],
          ['Amplifies only extreme cases', false],
          ['Can be fixed by rebalancing the classes', false]],
        'Making it harder to challenge than the original decision was.'),
      mcq('"The model said so" is:',
        [['Not an explanation, and in some jurisdictions not sufficient', true],
          ['Acceptable for automated decisions', false],
          ['Adequate if the model is documented', false],
          ['Standard practice for high-volume decisions', false]],
        'Would you be comfortable saying it to the person affected?'),
    ],
    checkpoint: [
      mcq('A feedback loop where a model routes opportunities away from a group:',
        [['Reduces their future data, making the model worse for them', true],
          ['Corrects itself gradually as the data accumulates', false],
          ['Is visible in the offline evaluation', false],
          ['Only occurs in recommendation systems', false]],
        'Common, and invisible until it is running.'),
      mcq('Setting a floor rather than an average target:',
        [['Gives a requirement you can hold the model to', true],
          ['Is harder to measure than the average', false],
          ['Reduces overall performance unnecessarily', false],
          ['Only applies to protected groups', false]],
        '"No group below 80%" is checkable.'),
      mcq('The most important item in model documentation is:',
        [['What it should not be used for', true],
          ['What data it was trained on', false],
          ['Which metrics it achieves', false],
          ['Which model family it uses', false]],
        'It will be reused by somebody who was not there when it was built.'),
    ],
  },

  {
    unitCode: 'T3_ML_EVALUATION_DEBUGGING',
    notes: `Five evaluation failures. All of them produce a number that somebody believes.

## 1. The metric does not match the decision

**Symptom:** the model scores well and the people using it are unhappy.

**Cause:** you optimised accuracy and they care about the top hundred. Or optimised overall
error and they care about the expensive cases.

**Diagnosis:** **ask what they do with the output.** Then check whether your metric rewards
doing that well. **It is a five-minute conversation and it is skipped constantly.**

## 2. The score moves and nothing changed

**Causes:** no random seed; a small validation set where one or two examples swing it; an
unstable training process; data that changed underneath you.

**Diagnosis:** run it three times. **If the spread is larger than the difference you are
investigating, there is nothing to investigate** — and that comparison is the whole answer.

## 3. Validation is good and test is much worse

**Causes:** you tuned against validation too many times; the split was not random with respect
to something that matters; leakage that the validation split shared and the test split did not.

**And it is worth being honest about the consequence:** you cannot fix this by tuning more.
Whatever you do next, the test estimate is used up, and the correct answer is usually to
report both numbers and explain the gap.

## 4. The aggregate is fine and somebody is complaining

**Cause:** a subgroup the aggregate hides.

**Diagnosis:** break the metric down by every group you can construct. **The complaint usually
identifies the group for you**, which is worth listening for rather than defending against.

## 5. It performed well offline and poorly in production

**Causes, in order:** leakage; train-serve skew; distribution shift; a feedback loop; the
offline evaluation not matching how it is actually used — a model evaluated on a balanced
sample and deployed on a stream with 1% positives.

**That last one is underrated.** **Evaluate on data that looks like production**, including
the class balance, or the number you report is about a different problem.

## The habits

**Always report a baseline.** Without it the metric is uninterpretable.

**Always report per-segment.** The aggregate hides the thing somebody will raise.

**Always report the variation** — across seeds, across folds. A number without a spread invites
false precision.

**Always state the threshold** for a classifier, and what it was chosen to optimise.

**And always say what the model should not be used for.** It is the shortest section and it
prevents the most damage.`,
    mcqs: [
      mcq('The model scores well and users are unhappy. The diagnosis is:',
        [['Ask what they do with the output, then check the metric rewards it', true],
          ['Retrain with more data', false],
          ['Recalibrate the probabilities', false],
          ['Check for distribution shift', false]],
        'A five-minute conversation, skipped constantly.'),
      mcq('If the spread across three runs exceeds the difference you are investigating:',
        [['There is nothing to investigate', true],
          ['You need more runs to be sure', false],
          ['The model is unstable and should be simplified', false],
          ['The validation set is too small', false]],
        'That comparison is the whole answer.'),
      mcq('Validation good, test much worse cannot be fixed by:',
        [['Tuning more, because the test estimate is used up', true],
          ['Reporting both numbers', false],
          ['Investigating the split', false],
          ['Looking for leakage', false]],
        'The correct answer is usually to report both and explain the gap.'),
      mcq('Evaluating on a balanced sample and deploying on a 1% stream:',
        [['Reports a number about a different problem', true],
          ['Is a reasonable approximation', false],
          ['Overstates recall only', false],
          ['Is corrected by recalibration', false]],
        'Evaluate on data that looks like production, including the class balance.'),
    ],
    checkpoint: [
      mcq('A complaint about model behaviour usually:',
        [['Identifies the subgroup for you', true],
          ['Reflects a misunderstanding of the metric', false],
          ['Indicates a threshold problem', false],
          ['Points at a data quality issue', false]],
        'Worth listening for rather than defending against.'),
      mcq('A number reported without a spread:',
        [['Invites false precision', true],
          ['Is standard for point estimates', false],
          ['Is acceptable when the sample is large', false],
          ['Implies the variance was checked', false]],
        'Across seeds and across folds.'),
      mcq('The shortest section of an evaluation report is:',
        [['What the model should not be used for', true],
          ['The baseline comparison', false],
          ['The per-segment breakdown', false],
          ['The justification for the threshold', false]],
        'And it prevents the most damage.'),
    ],
  },

  {
    unitCode: 'T3_ML_EVALUATION_PRACTICE',
    notes: `Two exercises on evaluation judgement: matching a metric to a decision, and finding
the subgroup an aggregate hides.`,
    coding: [
      {
        title: 'Which metric does this decision need?',
        description: `Read one problem per line as \`<output_type> <fp_cost> <fn_cost>
<fixed_capacity>\`, where output_type is \`number\` or \`class\`, the costs are \`low\` or
\`high\`, and fixed_capacity is \`yes\` or \`no\`.

Print the metric, checking in this order:

- output_type \`number\` → \`mean_absolute_error\`
- fixed_capacity \`yes\` → \`precision_at_k\`
- fn_cost \`high\` and fp_cost \`low\` → \`recall\`
- fp_cost \`high\` and fn_cost \`low\` → \`precision\`
- otherwise → \`f1\`

Then a final line \`f1=<n>\` counting how many fell through to F1.

Fixed capacity outranks the costs: if only the top hundred can be acted on, precision at k is
what the team experiences whatever the costs say.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Capacity outranks cost. A number is never a classification metric.
`,
        language: 'python',
        tests: [
          { input: 'number low high no\n', expectedOutput: 'mean_absolute_error\nf1=0' },
          { input: 'class low high yes\n', expectedOutput: 'precision_at_k\nf1=0' },
          { input: 'class low high no\n', expectedOutput: 'recall\nf1=0' },
          { input: 'class high low no\n', expectedOutput: 'precision\nf1=0' },
          { input: 'class high high no\n', expectedOutput: 'f1\nf1=1' },
          { input: 'number high high yes\n', expectedOutput: 'mean_absolute_error\nf1=0', isHidden: true },
          { input: 'class low low no\n', expectedOutput: 'f1\nf1=1', isHidden: true },
        ],
      },
      {
        title: 'Find the group it fails',
        description: `Read one subgroup per line as \`<name> <correct> <total>\`.

Print, for each, \`<name> <accuracy to 2 decimal places>\`, sorted by accuracy ascending then
by name. Then two final lines:

    overall=<accuracy across all rows, to 2 decimal places>
    worst=<name of the lowest group, or none if there are no rows>

A group with a total of 0 has an accuracy of 0.00 and still counts as a group.

The point is the gap between \`overall\` and \`worst\`.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# The aggregate is a weighted average. The worst group is what somebody experiences.
`,
        language: 'python',
        tests: [
          { input: 'a 950 1000\nb 61 100\n', expectedOutput: 'b 0.61\na 0.95\noverall=0.92\nworst=b' },
          { input: 'only 80 100\n', expectedOutput: 'only 0.80\noverall=0.80\nworst=only' },
          { input: '', expectedOutput: 'overall=0.00\nworst=none' },
          { input: 'x 50 100\ny 50 100\n', expectedOutput: 'x 0.50\ny 0.50\noverall=0.50\nworst=x' },
          { input: 'p 10 10\nq 0 0\n', expectedOutput: 'q 0.00\np 1.00\noverall=1.00\nworst=q', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'ML Evaluation Practice',
      description: 'Match metrics to decisions, find the failing subgroup, then evaluate a real model properly.',
      instructions: `Complete both exercises, then:

1. For the first: capacity outranks cost. Give a case where that ordering feels wrong, and say
   what you would do about it.
2. For the first: F1 is the fallback when both costs are equal. Say whether that is a good
   default and what you would prefer.
3. For the second: the hidden case has a group with zero rows scoring 0.00 and being reported
   as the worst. **Say why that is a defect in the specification**, and what it should do.

**Then, a real model.** Train one, or use one you built earlier in the track.

4. State the decision it supports and what each mistake costs.
5. Choose one metric to optimise and name three to watch. Justify the choice from the decision.
6. Report the baseline alongside every number.
7. **Break every metric down by at least three subgroups.** Report the table, including the
   worst group.
8. Report the spread across three random seeds.
9. For a classifier: state the threshold and what it was chosen to optimise. For a regressor:
   report the error at different ranges of the target.
10. Plot training against validation across model capacity or training time. Identify where
    overfitting begins.
11. Write the three-sentence honest report: the numbers, the baseline, and what the model
    should not be used for.`,
      rubric: [
        { criterion: 'Metrics matched to decisions', description: 'All cases, with capacity taking precedence.', maxPoints: 20 },
        { criterion: 'Subgroup failure found', description: 'Correct sorting, overall and worst, including the empty case.', maxPoints: 15 },
        { criterion: 'The specification defect', description: 'Notices the empty group being reported as worst, and says what it should do.', maxPoints: 15 },
        { criterion: 'A real model with a baseline', description: 'Every number reported against a baseline.', maxPoints: 15 },
        { criterion: 'Three subgroups broken down', description: 'A real table, including the worst group named.', maxPoints: 20 },
        { criterion: 'The honest three sentences', description: 'Numbers, baseline, and what it should not be used for.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'a 950 1000\nb 61 100\n', expectedOutput: 'b 0.61\na 0.95\noverall=0.92\nworst=b' },
          { input: 'only 80 100\n', expectedOutput: 'only 0.80\noverall=0.80\nworst=only' },
          { input: '', expectedOutput: 'overall=0.00\nworst=none' },
          { input: 'p 10 10\nq 0 0\n', expectedOutput: 'q 0.00\np 1.00\noverall=1.00\nworst=q', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 20,
      },
    },
    checkpoint: [
      mcq('A group with zero rows reported as the worst performer is:',
        [['A defect in the specification, which the assignment asks you to find', true],
          ['Correct, since its measured accuracy is indeed the lowest', false],
          ['An edge case that should be filtered', false],
          ['Expected behaviour for empty groups', false]],
        'A group nobody is in cannot be the one the model fails.'),
      mcq('Fixed capacity outranks the cost comparison because:',
        [['Only the top k are acted on, whatever the costs say', true],
          ['Capacity is easier to measure', false],
          ['Costs are usually roughly symmetric in practice', false],
          ['Precision at k subsumes both costs', false]],
        'It is what the team actually experiences.'),
      mcq('Reporting the error at different ranges of a regression target:',
        [['Reveals where the model is unreliable', true],
          ['Improves the overall error figure', false],
          ['Is only needed for skewed targets', false],
          ['Replaces the need for a baseline', false]],
        'The same argument as subgroup breakdown, on a continuous target.'),
    ],
  },

  {
    unitCode: 'T3_ML_EVALUATION_MINI_PROJECT',
    notes: `Evaluate a model properly, including the parts that are uncomfortable.

The brief's distinguishing requirement is **the subgroup floor**: find the group your model is
worst for, and either fix it or state plainly that you are shipping something that works less
well for them. Most projects never look; the ones that do are a different standard of work.

Budget around two hours.`,
    assignment: {
      title: 'Mini Project — An Evaluation That Does Not Flatter',
      description: 'Evaluate a model against a baseline, by subgroup, across seeds, and report what it should not be used for.',
      instructions: `**Use** a model you built earlier in the track, or train one. Real data,
with at least one meaningful way to segment the population.

**Part one — the decision and the metric**

1. What decision does this support? Who acts on it?
2. Cost both kinds of mistake.
3. Choose one metric to optimise and three to watch. Justify from the decision, not convention.
4. **Ask what behaviour maximising your metric would produce.** Say whether you want it.

**Part two — the honest numbers**

5. Baseline, and any existing rule.
6. Your metric, against both.
7. The three watched metrics.
8. Spread across three random seeds.
9. Spread across cross-validation folds.
10. **A learning curve.** Say whether more data would help.

**Part three — overfitting**

11. Training against validation across capacity or training time. Identify the turn.
12. Say what you did about it and in which order you tried things.
13. Report how many configurations you tried. **Then say what that does to your validation
    estimate.**

**Part four — who it fails**

14. **Break every metric down by at least four subgroups.** Use whatever your data allows.
15. Report the worst group and the gap to the best.
16. Investigate the worst: is it data volume, label quality, a different relationship, or a
    proxy feature?
17. Try one fix. Report whether it helped and what it cost the other groups.
18. **Set a floor** and say whether the model meets it.

**Part five — the limits**

19. What should this model not be used for?
20. What happens if it runs for a year — any feedback loop?
21. Could somebody affected appeal? Should they be able to?
22. Would you be comfortable explaining a decision to the person affected? Write the
    explanation you would give.

**Part six — the report**

23. Three sentences: the finding, the confidence, the limitation.
24. One table: metric, baseline, model, worst subgroup.
25. **Would you deploy it?** If the answer is no, say why — that is a full-marks outcome.

**Submit** the metric justification, the full numbers with spreads, the subgroup table, the
fix attempt, and the report.`,
      rubric: [
        { criterion: 'Metric chosen from the decision', description: 'Justified by cost and use, with the gaming question asked.', maxPoints: 15 },
        { criterion: 'Numbers with spreads', description: 'Baseline, seeds, folds and a learning curve.', maxPoints: 20 },
        { criterion: 'Overfitting examined honestly', description: 'Curves plotted, fixes ordered, configurations counted and their effect stated.', maxPoints: 15 },
        { criterion: 'Four subgroups broken down', description: 'Worst group identified, gap reported, cause investigated.', maxPoints: 25 },
        { criterion: 'A fix attempted', description: 'Tried, measured, and its cost to other groups reported.', maxPoints: 10 },
        { criterion: 'Limits written', description: 'What not to use it for, feedback loops, appeal, and an explanation to the affected.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('What sets this project apart from an ordinary evaluation is:',
        [['Finding the group the model is worst for and saying so plainly', true],
          ['Reporting the spread observed across several seeds', false],
          ['Plotting the learning curve', false],
          ['Justifying the metric choice', false]],
        'Most projects never look.'),
      mcq('Reporting how many configurations you tried matters because:',
        [['It tells the reader how optimistic the validation estimate is', true],
          ['It documents how much effort was invested in tuning', false],
          ['It shows the search was thorough', false],
          ['It justifies the final choice', false]],
        'Forty configurations means the best score was selected on.'),
      mcq('"I would not deploy it" as a conclusion is:',
        [['A full-marks outcome if argued', true],
          ['An admission the project failed', false],
          ['Acceptable only if the metrics are poor', false],
          ['A reason to try a different model', false]],
        'Being able to say so is part of the job.'),
    ],
  },

  /* ══ T3_ML_PIPELINES ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_ML_PIPELINES_REPRODUCIBLE',
    notes: `**Can you produce the same model twice?**

If not, you cannot debug it, cannot defend it, and cannot go back to it when the new version
turns out worse. This is the data pipeline topic's idempotence argument, applied to models —
and it is harder here, because a model has more moving parts.

## What has to be fixed

**The data.** The exact rows. A query against a live table returns something different
tomorrow. **Snapshot it, or version it, or record a query with a timestamp bound** — and the
third is often the most practical.

**The code.** In version control, with the commit recorded alongside the model.

**The dependencies.** Pinned exactly. A minor version of a library can change a default and
move your score.

**The randomness.** Seeds for the framework, the language, and the data shuffling. All three,
because setting one and missing another is the usual mistake.

**The parameters.** Every hyperparameter, recorded rather than remembered.

**The environment.** The hardware can matter — floating point on a GPU is not bit-identical to
a CPU, and for most purposes that is irrelevant and for a few it is not.

## What "reproducible" honestly means

**Two useful standards, and saying which you meet is the point:**

**Exactly reproducible** — the same bits. Requires everything above, and it is achievable for
most tabular work.

**Statistically reproducible** — the same performance within the ordinary variation. **This is
usually enough**, and it is what you should aim for when exact reproduction is expensive.

**"I ran it again and got roughly the same" is neither**, unless you state what roughly means.

## The minimum that actually works

    model_v3/
      model.pkl
      metadata.json      # commit, data snapshot id, params, seeds, metrics, date
      requirements.txt   # pinned
      train.py

**One command retrains it from the metadata.** That is the bar, and it is not high.

**The metadata file is the important part.** A model artefact with no record of how it was made
is an artefact nobody can trust — and in six months, nobody will remember which of the four
training scripts produced it.

## Why it matters beyond tidiness

**Debugging.** The new model is worse. You need the old one, and you need to know what changed.

**Auditing.** Somebody asks why a decision was made. You need the model that made it, and the
data it was trained on.

**Rollback.** The deployment topic's argument applies here too: the previous model is what you
deploy when the new one fails, and you need to be able to produce it.

**Handover.** Somebody else has to retrain it. If that requires you, you are the dependency.

## The specific trap

**A notebook that has been run out of order.**

The pipeline topic said this about data, and it is worse here: a model trained in a notebook
where cells were run, edited, re-run and deleted has **no recoverable provenance at all**. The
result exists and the process does not.

**Train from a script.** Explore in a notebook if you like — that is what notebooks are good
at — and produce the model with something that runs top to bottom.`,
    mcqs: [
      mcq('Setting one random seed and missing another is:',
        [['The usual mistake — framework, language and shuffling all need one', true],
          ['Sufficient for most frameworks', false],
          ['Only a problem for neural networks', false],
          ['Corrected automatically by the pipeline', false]],
        'All three, or the result still varies.'),
      mcq('Statistically reproducible means:',
        [['The same performance within the ordinary variation', true],
          ['The same bits every time', false],
          ['The same result on the same hardware', false],
          ['A result within the confidence interval', false]],
        'Usually enough, and you should say which standard you meet.'),
      mcq('The important part of a saved model directory is:',
        [['The metadata recording commit, data, parameters and seeds', true],
          ['The serialised model file', false],
          ['The pinned requirements', false],
          ['The training script', false]],
        'An artefact with no record of how it was made cannot be trusted.'),
      mcq('A model trained in a notebook run out of order has:',
        [['No recoverable provenance at all', true],
          ['Provenance recoverable from the cell outputs', false],
          ['Reduced but usable reproducibility', false],
          ['The same provenance as a script', false]],
        'The result exists and the process does not.'),
    ],
    checkpoint: [
      mcq('A minor library version change can:',
        [['Change a default and move your score', true],
          ['Break the model file format', false],
          ['Only affect training speed', false],
          ['Be ignored if the major version matches', false]],
        'A default can change between minor versions and move your score.'),
      mcq('Reproducibility matters for rollback because:',
        [['The previous model is what you deploy when the new one fails', true],
          ['Rollback would otherwise require retraining it from scratch', false],
          ['The deployment records the model version', false],
          ['Old artefacts are deleted automatically', false]],
        'The deployment topic’s argument, applied to models.'),
      mcq('If retraining a model requires you personally:',
        [['You are the dependency', true],
          ['The process is adequately documented', false],
          ['The model is too complex to hand over', false],
          ['A runbook would not help', false]],
        'Handover is one of the four reasons this matters.'),
    ],
  },

  {
    unitCode: 'T3_ML_PIPELINES_TRACKING_EXPERIMENTS',
    notes: `You have run forty experiments. **Which change moved the score?**

If the answer involves scrolling back through a terminal, you have lost information you paid
for — and you will repeat experiments you have already run, which is the most avoidable waste
in the whole discipline.

## What to record, per run

**The result:** every metric, on train and validation. Per subgroup if you have them.

**The inputs:** the data version, the feature set, the preprocessing.

**The configuration:** every hyperparameter, the model family, the seed.

**The provenance:** the code commit, who ran it, when, how long it took.

**A note:** what you were testing. **One sentence, and it is the field you will be most
grateful for** — six weeks later, "tried removing the postcode features to see if the
disparity narrowed" is worth more than any of the numbers beside it.

## Where to put it

**A CSV appended to by your training script** is a complete and legitimate answer for a
personal project. One row per run, and you can sort it.

**A tracking tool** for anything bigger: automatic capture, comparison views, artefact storage.
Several exist and they all do the same thing.

**Not your memory. Not the terminal scrollback. Not a notebook cell output** that will be
overwritten by the next run.

## Change one thing at a time

**The debugging topic's rule, and it applies with full force here.**

Change the features and the model and the learning rate together, get a better score, and you
have learned nothing transferable — you cannot repeat it deliberately and you cannot explain
it.

**When you must change several**, record them all and treat the result as a hypothesis rather
than a finding.

## Compare honestly

**Against the same split**, or the comparison is not one.

**With the variation in view.** If your seeds span 2% and the improvement is 1%, the run is
not better. **This is the most common self-deception in experiment tracking**, and the tracked
spread is what prevents it.

**And count your comparisons.** Forty experiments and you keep the best validation score —
that score is optimistic, and the amount depends on how many you ran. **Recording the count is
what lets you say by roughly how much.**

## What the log gives you later

**Which direction helps.** Feature work moved the score three times; capacity never did. That
tells you where to spend the next week.

**What has already been tried.** Somebody asks "have you tried dropping the sparse features" —
you have, twice, and it was worse both times. **Without the log, you try it a third time.**

**The explanation.** "We chose this configuration because the four alternatives were within
noise and this one is the simplest" is a defensible sentence, and it requires the record.

## The habit

**Log before you look at the result.** Write the note about what you are testing as you launch
the run, not afterwards — afterwards, the note becomes a description of what you found, which
is a different and much less useful thing.`,
    mcqs: [
      mcq('The field you will be most grateful for later is:',
        [['The one-sentence note on what you were testing', true],
          ['The full hyperparameter set', false],
          ['The validation metric', false],
          ['The code commit hash', false]],
        '"Tried removing postcode to see if the disparity narrowed" beats any number beside it.'),
      mcq('A CSV appended to by the training script is:',
        [['A complete and legitimate answer for a personal project', true],
          ['Inadequate for any real work', false],
          ['Only suitable for recording final results', false],
          ['Harder to maintain than a tracking tool', false]],
        'One row per run, and you can sort it.'),
      mcq('If your seeds span 2% and the improvement is 1%:',
        [['The run is not better, and the tracked spread is what shows it', true],
          ['The improvement is real but marginal', false],
          ['More seeds are needed to confirm', false],
          ['The comparison should use a different split', false]],
        'The most common self-deception in experiment tracking.'),
      mcq('Recording how many experiments you ran lets you:',
        [['Say roughly how optimistic the best validation score is', true],
          ['Estimate the compute cost', false],
          ['Reproduce the search later', false],
          ['Justify the time spent', false]],
        'The optimism depends on the count.'),
    ],
    checkpoint: [
      mcq('Changing features, model and learning rate together gives:',
        [['A better score and nothing transferable', true],
          ['A faster path to a good configuration', false],
          ['An interaction effect worth recording', false],
          ['A valid result if the improvement is large', false]],
        'You cannot repeat it deliberately or explain it.'),
      mcq('Without an experiment log, when somebody asks if you tried something:',
        [['You try it a third time', true],
          ['You can usually recall the result', false],
          ['The model metadata answers it', false],
          ['The code history shows it', false]],
        'The most avoidable waste in the discipline.'),
      mcq('The note should be written:',
        [['As you launch the run, not afterwards', true],
          ['After the result is known, for accuracy', false],
          ['Only for runs that produce an improvement', false],
          ['At the end of each working session', false]],
        'Afterwards it becomes a description of what you found, which is less useful.'),
    ],
  },

  /* ══ T3_ML_PROJECT ══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_ML_PROJECT_BRIEF',
    notes: `Write down the problem, the data, the metric and what done means — before training
anything.

The risk specific to a machine learning project is **the endless tuning loop**: forty runs, a
score that creeps up by noise, and no finished artefact. A definition of done is what stops it.

## Choose a problem with a decision

**Not "predict house prices on the famous dataset."** A problem where somebody would act on the
output, even hypothetically — and preferably your own data, or something nobody has tuned to
death.

**Good signs:** the two mistakes cost differently; there is a sensible baseline; the data is
messy enough to require judgement.

## Check the data is sufficient first

**An hour, before committing.**

Does it have the target? Enough rows for the effect size you care about? A way to split
honestly — is it time-ordered, is it grouped? Any obvious leakage?

**"The data cannot support this" is much cheaper to find now.**

## The brief

1. **The problem**, and the decision it supports.
2. **The two mistakes**, and what each costs.
3. **The metric**, chosen from those costs, and three to watch.
4. **The baseline**, and any existing rule.
5. **The split**, and why that type.
6. **The data**: source, rows, period, and why it is sufficient.
7. **What good enough looks like.** A number. **Without it you will tune forever**, and this is
   the item that specifically prevents this project's characteristic failure.

## The definition of done

- [ ] Split made before any exploration, of the right type
- [ ] Baseline built and evaluated identically
- [ ] Every feature checked for availability at prediction time
- [ ] Features added one at a time with the change measured
- [ ] Everything in a pipeline; nothing fitted outside the fold
- [ ] Seeds set; spread across three reported
- [ ] Metrics reported per subgroup, with the worst named
- [ ] Threshold chosen from costs, not left at the default
- [ ] Test set touched exactly once
- [ ] Experiments logged, with the count of configurations tried
- [ ] Model saved with metadata: commit, data version, parameters, seeds, metrics
- [ ] Retrainable from that metadata by one command
- [ ] Written limits: what it should not be used for

**Write your own before starting**, and treat everything else as a later list.

## What this prevents

**The endless tune.** No target, no finish.

**The unreproducible model.** A file nobody can regenerate.

**The flattering evaluation.** One number, no baseline, no subgroups, no spread.

**The unusable feature.** Excellent offline, unavailable at serving.

## Time

**Reserve a third for evaluation, reproducibility and the write-up.** On an ML project this is
the part that demonstrates judgement, and the model itself is largely a library call — which
is exactly why the reserved third is the part that distinguishes the work.`,
    mcqs: [
      mcq('The characteristic failure of an ML project is:',
        [['The endless tuning loop with no finished artefact', true],
          ['Choosing the wrong model family', false],
          ['Insufficient training data', false],
          ['A poorly engineered feature set', false]],
        'Forty runs, a score creeping up by noise.'),
      mcq('The brief item that specifically prevents it is:',
        [['A number for what good enough looks like', true],
          ['The chosen metric', false],
          ['The baseline', false],
          ['The split type', false]],
        'Without it you will tune forever.'),
      mcq('Checking the data is sufficient before committing:',
        [['Finds "this cannot be supported" for an hour rather than a week', true],
          ['Is impossible before modelling begins', false],
          ['Duplicates the exploration step', false],
          ['Only matters for small datasets', false]],
        'Target, rows, an honest split, and obvious leakage.'),
      mcq('The reserved third is the distinguishing part because:',
        [['The model itself is largely a library call', true],
          ['Evaluation takes longer than training', false],
          ['Documentation is heavily weighted', false],
          ['Reproducibility is hard to retrofit', false]],
        'Judgement is what is being assessed.'),
    ],
    checkpoint: [
      mcq('A good problem for this project has:',
        [['Differing costs, a sensible baseline, and messy data', true],
          ['A clean dataset and a known benchmark', false],
          ['A large number of features', false],
          ['An established state-of-the-art result to beat', false]],
        'Preferably your own data, or something nobody has tuned to death.'),
      mcq('"Touched exactly once" on the done list refers to:',
        [['The test set', true], ['The raw data', false],
          ['The tuning loop', false], ['The deployment', false]],
        'And the brief makes it a checkable item rather than an intention.'),
      mcq('New ideas during the project should go:',
        [['On a later list', true],
          ['Into the experiment log as planned runs', false],
          ['Into the brief if they improve the metric', false],
          ['To the mentor for a scope decision', false]],
        'Ship what you committed to.'),
    ],
  },

  {
    unitCode: 'T3_ML_PROJECT_BUILD',
    notes: `Build it. Split, baseline, features, model, evaluation, reproducibility — with the
discipline visible at each step.

**The order below front-loads the things that cannot be retrofitted.** A split made late is a
split made after you looked; a pipeline added at the end is a model that was never validated
honestly.

Budget around three and a half hours of focused work.`,
    assignment: {
      title: 'Applied ML Project — Building the Model',
      description: 'Build a model end to end with an honest split, a baseline, a measured sequence and one test evaluation.',
      instructions: `**Work from your brief**, in this order.

**Part one — the things that cannot be retrofitted**

1. **Split first.** State the type and why. Set the test set aside.
2. Set every seed: framework, language, shuffling.
3. Create the experiment log. One row per run, with a note field.
4. Baseline, evaluated identically. Record it as run one.

**Part two — features**

5. The feature table: every feature, its source at serving time, when it becomes known, its
   cost.
6. Classify each for leakage. **Report anything not safe.**
7. Everything in a pipeline. **Show that preprocessing is fitted inside the folds.**
8. Add features one at a time, logging each run with its note.

**Part three — the model**

9. A simple model. Log it.
10. A more capable one. Log it.
11. Tune, logging every configuration. **Report how many you ran.**
12. Check the spread across three seeds for your best configuration.
13. **Compare your improvement against that spread.** If it is smaller, say so.

**Part four — evaluation**

14. Every metric against the baseline.
15. Per subgroup, at least four. Name the worst.
16. Training against validation curves. Identify overfitting and say what you did.
17. For a classifier: the cost table and the chosen threshold. For a regressor: error by range
    of the target.
18. Twenty mistakes inspected. Report the pattern.

**Part five — the test set, once**

19. Evaluate. Report. **Compare with validation and explain any gap.**
20. Do not tune afterwards. If tempted, record what you would have done.

**Part six — reproducibility**

21. Save the model with metadata: commit, data version, parameters, seeds, metrics, date.
22. Pin the dependencies.
23. **Delete the model and retrain it from the metadata with one command.** Show that the
    metrics match, and say whether the match is exact or statistical.

**Submit** the code, the experiment log, the feature table, the subgroup breakdown, the single
test evaluation, and the one-command retrain.`,
      rubric: [
        { criterion: 'Split, seeds and log first', description: 'All three in place before any modelling.', maxPoints: 15 },
        { criterion: 'Features checked and measured', description: 'Feature table with serving availability; added one at a time.', maxPoints: 20 },
        { criterion: 'Every run logged', description: 'Including the note and the count of configurations tried.', maxPoints: 15 },
        { criterion: 'Improvement against spread', description: 'Three seeds, and an honest comparison with the claimed gain.', maxPoints: 15 },
        { criterion: 'Subgroups and mistakes', description: 'Four subgroups with the worst named; twenty mistakes inspected.', maxPoints: 20 },
        { criterion: 'Retrained from metadata', description: 'One command, metrics matched, standard of reproduction stated.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('The order front-loads:',
        [['The things that cannot be retrofitted', true],
          ['The fastest steps', false],
          ['The steps that need the most data', false],
          ['The parts that are assessed most heavily', false]],
        'A split made late is a split made after you looked.'),
      mcq('Comparing your improvement against the seed spread:',
        [['Tests whether you improved anything at all', true],
          ['Measures the model’s stability', false],
          ['Validates that the split was done correctly', false],
          ['Checks for overfitting', false]],
        'If the spread is larger, there is no improvement to claim.'),
      mcq('Saying whether the retrain match is exact or statistical:',
        [['States which standard of reproducibility you met', true],
          ['Indicates whether seeds were set', false],
          ['Measures the training variance', false],
          ['Confirms that the dependencies are all pinned', false]],
        '"Roughly the same" is neither, unless you say what roughly means.'),
    ],
  },

  {
    unitCode: 'T3_ML_PROJECT_EXPLAIN',
    notes: `**Defend the evaluation.** Not the model — the evaluation. In a machine learning
interview that is what gets attacked, and a candidate who has only prepared to describe their
model is unprepared for the conversation that actually happens.

## Why the evaluation is the subject

Anybody can call a library. **What distinguishes a candidate is whether they know how good
their model actually is** — and the questions are all variations on that.

A confident claim with a weak evaluation behind it is the worst outcome in this interview,
because it demonstrates the opposite of the thing being assessed.

## The questions, and what a good answer sounds like

**"How did you split the data?"** The first question, frequently. Answer with the type and the
reason. **If there is time structure or grouping in your data and you split randomly, say so
now** rather than being caught.

**"What is your baseline?"** Have it. A candidate without one cannot say whether their model
is good.

**"How do you know it is not overfitting?"** The curves, the gap, the seed spread, the single
test evaluation.

**"Could anything be leaking?"** **Never say no.** Say what you checked: feature importance,
the availability question, remove-and-retrain. Somebody experienced knows leakage is common and
a flat denial reads as inexperience.

**"Why that metric?"** From the decision and the costs. Not "it is standard for
classification".

**"Who is it worst for?"** Have the subgroup table. **Most candidates have never looked**, and
having the answer is disproportionately impressive because of it.

**"How many configurations did you try?"** Honest number, and what it does to the validation
estimate.

**"Would you deploy it?"** A real answer with conditions. "Not yet — recall on the smallest
segment is 0.4 and I would want more data there first" is a better answer than yes.

## The four-sentence shape

**What I did. Why. What it cost. What I would change.**

> "I split by time rather than randomly, because the target depends on behaviour that drifts
> and a random split would have let the model learn from the future. It cost me about 15% of
> the data, since the last three months became the test set and could not be trained on. If I
> were doing it again I would use a rolling evaluation instead of one holdout, which would give
> me several estimates rather than one."

**The fourth sentence is the one that distinguishes you**, as in every other track.

## What not to do

**Do not claim a number you cannot defend.** If you tuned against validation forty times, the
0.91 is not a clean estimate and pretending otherwise fails the moment they ask.

**Do not present the best seed.** Present the spread.

**Do not skip the baseline** because it makes the model look less impressive. **An interviewer
who notices you omitted it concludes something worse than the comparison would have.**

**Do not say "the model decided".** You decided to use a model.

## Prepare

**A three-minute walkthrough** of the problem, the decision, the metric and the headline
numbers — with the baseline in the headline.

**Three decisions in the four-sentence form.** The split, the metric, and the threshold are
good candidates.

**The subgroup table**, ready to show.

**One thing that surprised you.** A feature that did nothing, a leak you found, a subgroup that
failed. **These are the best answers you will give**, because they demonstrate that you were
looking rather than reporting.

**And the honest limits.** What it should not be used for, and who it is wrong about. Saying
that unprompted is the strongest signal available in this interview.`,
    mcqs: [
      mcq('The subject of an ML interview is:',
        [['The evaluation, not the model', true],
          ['The model architecture', false],
          ['The feature engineering', false],
          ['The deployment approach', false]],
        'Anybody can call a library; knowing how good it is distinguishes you.'),
      mcq('Asked whether anything could be leaking, you should:',
        [['Say what you checked, never simply no', true],
          ['Say no if you checked thoroughly', false],
          ['Explain that the split prevents it', false],
          ['Describe the pipeline structure', false]],
        'A flat denial reads as inexperience, because leakage is common.'),
      mcq('Having the subgroup table is disproportionately impressive because:',
        [['Most candidates have never looked', true],
          ['It is technically difficult to produce', false],
          ['Interviewers always ask for it', false],
          ['It is required by regulation', false]],
        'The answer is cheap and the omission is universal.'),
      mcq('Omitting the baseline because it flatters the model:',
        [['Leads an interviewer to conclude something worse', true],
          ['Is acceptable if the model is strong', false],
          ['Keeps the presentation focused', false],
          ['Is normal in industry reporting', false]],
        'They notice, and the inference is worse than the comparison.'),
    ],
    checkpoint: [
      mcq('"Would you deploy it?" is best answered with:',
        [['A real answer with conditions', true],
          ['Yes, supported by the metrics', false],
          ['That it depends on the business', false],
          ['No, since it has not been validated in production', false]],
        '"Not yet — recall on the smallest segment is 0.4" beats yes.'),
      mcq('Presenting the best seed rather than the spread:',
        [['Is a number you cannot defend', true],
          ['Is standard practice when reporting', false],
          ['Is acceptable if the seed is recorded', false],
          ['Shows the model’s potential', false]],
        'The spread is the honest summary; one seed is a number you chose.'),
      mcq('The best answers you will give in this interview are about:',
        [['Something that surprised you', true],
          ['The architecture you chose', false],
          ['The size of the dataset', false],
          ['The tools you used', false]],
        'A feature that did nothing, a leak you found, a subgroup that failed.'),
    ],
  },
];
