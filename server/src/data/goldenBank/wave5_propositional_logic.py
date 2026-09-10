# -*- coding: utf-8 -*-
"""
Wave 5 — PROPOSITIONAL_LOGIC, 50 Golden Bank questions, all newly authored.

NOTHING HERE IS ANSWERABLE BY READING A SENTENCE CAREFULLY. That is what separates this skill
from the banked reasoning skill, which is about all-and-some claims in prose. Every item here
turns on a truth value: what a compound comes to under stated values, when an if-then is false,
whether two forms agree on every row. A student can be strong at one and weak at the other, and
the pair of skills is only worth carrying if the questions keep that promise.

THE VACUOUS CASE IS THE WHOLE OF THE IMPLICATION FAMILY. An if-then with a false first part is
true, and almost every student first says otherwise. All three questions in that family turn on
it, because a family that asked about it once would report a student as competent who happens to
have met the one case they know.

INCLUSIVE OR IS ASKED ABOUT TWICE IN PLAIN LANGUAGE. "Free entry for children or seniors" and a
customer who is both: everyday speech says one or the other, logic says at least one, and the
gap between them is where working conditions go wrong.

CONDITIONS ARE STATED IN WORDS AND NEVER IN CODE. The banked conditionals skill measures the
code. This measures the logic underneath it, and a stem carrying syntax would collect both and
distinguish neither.
"""

Q = []


def q(qid, family, difficulty, prompt, correct, distractors, explanation,
      provenance='AUTHORED', source='', evidence=None, mode=None, hinge=None):
    assert len(distractors) == 3, qid
    it = {'id': qid, 'family': family, 'difficulty': difficulty, 'prompt': prompt,
          'correct': correct, 'distractors': list(distractors), 'explanation': explanation,
          'provenance': provenance, 'source': source}
    if evidence:
        it['evidence'] = evidence
    if mode:
        it['mode'] = mode
    if hinge:
        it['hinge'] = hinge
    Q.append(it)


# =========================================================================
# PL_FAM01_PROPOSITION_RECOGNITION — D1 x4, D2 x1
# =========================================================================
q('GB_PL_001', 'PL_FAM01_PROPOSITION_RECOGNITION', 'D1',
  'Which of these is a statement that is either true or false?',
  'The number 7 is greater than 5',
  ['Close the door', 'What time does the train leave?', 'Please try again later'],
  'Only the first makes a claim that could be checked and found right or wrong. A command and a '
  'question assert nothing, so there is nothing in them to be true.')

q('GB_PL_002', 'PL_FAM01_PROPOSITION_RECOGNITION', 'D1',
  'Which of these carries no truth value at all?',
  'Please send the report',
  ['The report was sent yesterday', 'The report has 12 pages', 'No report was sent'],
  'A request is not a claim about how things are, so it cannot be true or false. The other three '
  'all assert something that could turn out either way.')

q('GB_PL_003', 'PL_FAM01_PROPOSITION_RECOGNITION', 'D1',
  'Is "It will rain in Chennai tomorrow" a statement that is either true or false?',
  'Yes, though which of the two it is cannot yet be known',
  ['No, because nobody knows yet',
   'No, because it is about the future rather than the present',
   'Yes, and as things stand it is true'],
  'The sentence makes a definite claim, and tomorrow will settle it one way or the other. Not '
  'knowing the answer is a fact about us, not about the sentence.')

q('GB_PL_004', 'PL_FAM01_PROPOSITION_RECOGNITION', 'D1',
  'A sentence qualifies when it makes a claim that is either true or false. Which of the '
  'following qualifies?',
  'The server restarted at midnight',
  ['Restart the server at midnight',
   'Should the server restart at midnight?',
   'Restarting servers at midnight is inconvenient'],
  'Only the first reports something that either happened or did not. The last is an expression '
  'of preference, which cannot be settled by checking anything.')

q('GB_PL_005', 'PL_FAM01_PROPOSITION_RECOGNITION', 'D2',
  'A student says that "The millionth digit of pi is 7" does not count, because nobody in the '
  'room knows whether it is true. What is wrong with that?',
  'Having a truth value is not the same as anyone knowing it; the sentence is one or the other '
  'regardless',
  ['Nothing; a sentence nobody can check does not count',
   'It does not count, but for a different reason entirely',
   'It counts only once somebody has actually computed the digit'],
  'The digit is whatever it is, and the sentence is true or false accordingly. Availability of '
  'the answer is a separate matter from the existence of one.')

# =========================================================================
# PL_FAM02_CONNECTIVE_MEANING — D1 x3, D2 x1
# =========================================================================
q('GB_PL_006', 'PL_FAM02_CONNECTIVE_MEANING', 'D1',
  'A rule applies when a customer is a member and also holds a voucher. Which connective does '
  'that use?',
  'AND',
  ['OR', 'NOT', 'It uses no connective at all'],
  'Both requirements have to hold of the same customer, which is what AND expresses. OR would '
  'admit members with no voucher.')

q('GB_PL_007', 'PL_FAM02_CONNECTIVE_MEANING', 'D1',
  'A discount is offered to anyone who is a student or a pensioner. Someone is both. Does the '
  'discount apply to them?',
  'Yes; OR in logic includes the case where both parts hold',
  ['No, because or means one or the other but not both',
   'Only if the offer explicitly adds the words or both',
   'It cannot be decided from the offer as written'],
  'The OR of logic asks for at least one, so satisfying two is more than enough. Everyday speech '
  'often means the exclusive version, which is the source of the confusion.')

q('GB_PL_008', 'PL_FAM02_CONNECTIVE_MEANING', 'D1',
  'Which connective reverses the truth value of whatever it is applied to?',
  'NOT',
  ['AND', 'OR', 'IF'],
  'NOT turns true into false and false into true, and is the only one of the four that acts on a '
  'single statement rather than joining two.')

q('GB_PL_009', 'PL_FAM02_CONNECTIVE_MEANING', 'D2',
  'A sign reads: free entry for children or seniors. A child who is also a senior is turned '
  'away, on the grounds that the word or excludes anyone who is both. Is the refusal supported '
  'by logic?',
  'No; the OR of logic admits those who satisfy both conditions',
  ['Yes, because or always excludes the case where both hold',
   'Yes, because no person can genuinely be in both categories',
   'It depends on which of the two categories the sign listed first'],
  'Satisfying either condition is what the sign asks for, and this person satisfies two. The '
  'exclusive reading is a habit of speech rather than anything the wording requires.')

# =========================================================================
# PL_FAM03_TABLE_SHAPE — D1 x3, D2 x1
# =========================================================================
q('GB_PL_010', 'PL_FAM03_TABLE_SHAPE', 'D1',
  'A truth table is drawn up for a statement with 2 variables. How many rows does it have?',
  '4',
  ['2', '3', '8'],
  'Each variable can be true or false independently, giving two times two, which is 4. The '
  'number of variables is not itself the number of rows.')

q('GB_PL_011', 'PL_FAM03_TABLE_SHAPE', 'D1',
  'How does the number of rows in a truth table change when one more variable is added?',
  'It doubles',
  ['It increases by one', 'It increases by two', 'It stays the same'],
  'Every existing combination appears twice over, once with the new variable true and once with '
  'it false, so the count doubles. That is why tables become unwieldy so quickly.')

q('GB_PL_012', 'PL_FAM03_TABLE_SHAPE', 'D1',
  'A truth table lists every combination of values its variables can take. What must be true of '
  'its rows?',
  'Every combination appears exactly once',
  ['Only the combinations making the statement true appear',
   'The rows may be as many or as few as convenient',
   'The combination where every variable is false is left out'],
  'Completeness is the point of the table: leaving a combination out is exactly how an '
  'expression gets mistaken for one it merely resembles.')

q('GB_PL_013', 'PL_FAM03_TABLE_SHAPE', 'D2',
  'A student draws a table for a statement with 3 variables and writes 6 rows. What has gone '
  'wrong?',
  'Each variable doubles the count, so 3 variables need 8 rows',
  ['Nothing; 6 rows is right for 3 variables',
   'The student should have written 9 rows',
   'The student should have written 3 rows, one for each variable'],
  'Multiplying the variable count by two gives 6 and squaring it gives 9; neither is how the '
  'combinations grow. Doubling three times from a single row is what gives 8.')

# =========================================================================
# PL_FAM04_COMPOUND_EVALUATION — D2 x1, D3 x1
# =========================================================================
q('GB_PL_014', 'PL_FAM04_COMPOUND_EVALUATION', 'D2',
  'A system keeps two flags for each order, shipped and invoiced. For one order the shipped flag '
  'holds and the invoiced flag does not. What does the combined requirement shipped and invoiced '
  'come to for that order?',
  'False',
  ['True', 'It cannot be determined', 'Both outcomes at once'],
  'A requirement of both parts fails as soon as one fails, so the answer is False. Both flags '
  'have been given values, which leaves nothing undetermined.')

q('GB_PL_015', 'PL_FAM04_COMPOUND_EVALUATION', 'D3',
  'Three flags describe a booking: paid holds, cancelled does not, and confirmed holds. What '
  'does the requirement paid, together with either cancelled or confirmed, come to?',
  'True',
  ['False', 'It cannot be determined',
   'It depends which of the two inner flags is checked first'],
  'Either of the inner flags is enough and confirmed holds, so the inner part succeeds; paid '
  'holds as well, so the whole comes to True. Checking order cannot change a result the grouping '
  'has already fixed.')

# =========================================================================
# PL_FAM05_NEGATION_SCOPE — D2 x1, D3 x1
# =========================================================================
q('GB_PL_016', 'PL_FAM05_NEGATION_SCOPE', 'D2',
  'Two sensors are wired so that an engineer can ask whether it is not the case that both report '
  'a fault. On this occasion both sensors do report a fault. What does that denial come to?',
  'False',
  ['True', 'It cannot be determined', 'It depends which of the two sensors is considered'],
  'The statement being denied holds, so the denial of it is False. The denial covers the pair '
  'taken together rather than either sensor on its own.')

q('GB_PL_017', 'PL_FAM05_NEGATION_SCOPE', 'D3',
  'A condition is written so that a negation covers only the first of two parts joined by AND. '
  'The first part is true and the second is false. What does the whole condition come to?',
  'False',
  ['True', 'It cannot be determined without knowing the connective',
   'It would be false only if the negation had covered both parts'],
  'Negating the true first part gives false, and false joined by AND to anything is False. Both '
  'halves fail here, which is why the answer is unaffected by the second part.')

# =========================================================================
# PL_FAM06_IMPLICATION_VALUE — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_PL_018', 'PL_FAM06_IMPLICATION_VALUE', 'D2',
  'The statement is: if it is raining then the match is cancelled. It is not raining, and the '
  'match went ahead. Is the statement false?',
  'No; a statement of this form is not broken when its first part is false',
  ['Yes, because the match was not cancelled',
   'Yes, because the two parts of the statement disagree',
   'It cannot be decided from a single day'],
  'The statement promises something only about rainy days. A dry day on which the match is '
  'played is not a case it ever spoke about.')

q('GB_PL_019', 'PL_FAM06_IMPLICATION_VALUE', 'D3',
  'The statement is: if the light is red then the car stops. The light is green and the car '
  'stops anyway. Has the statement been broken?',
  'No; the first part is false, so nothing was promised about this case',
  ['Yes, because the car stopped when the light was not red',
   'Yes, because a green light should mean the car does not stop',
   'It cannot be decided without watching more cars'],
  'Only a red light followed by a car that fails to stop would break it. Stopping at green is '
  'unremarkable and outside what the statement covers.')

q('GB_PL_020', 'PL_FAM06_IMPLICATION_VALUE', 'D4',
  'A rule reads: if a form is late then a fee is charged. A form arrived on time and a fee was '
  'charged anyway. A statement of this form is false only when the first part is true and the '
  'second is false, and here the first part is false. Has the rule been broken?',
  'No, because the rule says nothing about forms that arrive on time',
  ['Yes, because a fee was charged without any lateness',
   'Yes, because the rule implies that punctual forms attract no fee',
   'It cannot be decided from a single form'],
  'Reading the rule as forbidding a fee on punctual forms is reading its converse, which it does '
  'not assert. The fee may be unfair, and it is not a breach of this rule.',
  evidence='is false only when the first part is true and the second is false')

# =========================================================================
# PL_FAM07_TABLE_COMPLETION — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_PL_021', 'PL_FAM07_TABLE_COMPLETION', 'D2',
  'Take the four rows for P and Q in this order: both true; P true and Q false; P false and Q '
  'true; both false. What is the column for P OR Q?',
  'True, True, True, False',
  ['True, False, False, False', 'False, True, True, True', 'True, True, False, False'],
  'OR is true wherever at least one part is true, which is the first three rows, and false only '
  'in the last: True, True, True, False.')

q('GB_PL_022', 'PL_FAM07_TABLE_COMPLETION', 'D3',
  'Over the four rows taken in the order both true, P only, Q only, neither, one column reads '
  'True, False, False, False. Which expression produces it?',
  'P AND Q',
  ['P OR Q', 'NOT (P AND Q)', 'P on its own'],
  'Being true in the single row where both hold is the signature of P AND Q. P on its own would '
  'also be true in the row where only P holds.')

q('GB_PL_023', 'PL_FAM07_TABLE_COMPLETION', 'D4',
  'A column over the rows both true, P only, Q only, neither reads True, True, True, False. A '
  'colleague calls it the column for P AND Q. The column is true in three rows out of four, '
  'whereas an AND is true only in the row where both parts hold. Which expression is it?',
  'P OR Q',
  ['P AND Q', 'NOT P', 'P AND NOT Q'],
  'Three true rows out of four is what OR gives, and one true row is what AND gives. Counting '
  'the true rows is enough to rule the claim out before checking any row individually.',
  evidence='true in three rows out of four, whereas an AND is true only in the row where both '
           'parts hold')

# =========================================================================
# PL_FAM08_EQUIVALENCE_CHECK — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_PL_024', 'PL_FAM08_EQUIVALENCE_CHECK', 'D2',
  'Are P AND Q and Q AND P equivalent?',
  'Yes, they agree on every row',
  ['No, because the two parts are written in a different order',
   'Only when P and Q happen to have the same value',
   'It cannot be decided without being given values'],
  'Requiring both parts does not depend on which is named first, so the two columns match '
  'everywhere. Equivalence is settled by the table, not by appearance.')

q('GB_PL_025', 'PL_FAM08_EQUIVALENCE_CHECK', 'D3',
  'Are NOT (P AND Q) and NOT P AND NOT Q equivalent?',
  'No; they differ whenever exactly one of P and Q is true',
  ['Yes, since a negation passes through an AND unchanged',
   'Yes, they agree on all four rows',
   'No; they differ only in the row where both are true'],
  'With P true and Q false the first comes to true and the second to false. In the row where '
  'both are true the two agree, which is why checking that row alone proves nothing.')

q('GB_PL_026', 'PL_FAM08_EQUIVALENCE_CHECK', 'D4',
  'A developer checks whether P OR (P AND Q) is equivalent to P by trying three cases: both '
  'true, P true with Q false, and both false. The three cases tried leave out the row where P is '
  'false and Q is true, which is the only row where the two could have come apart. What has the '
  'check established?',
  'Nothing conclusive, because the row the check needed is the one it omitted',
  ['That the two are equivalent, since three rows out of four agreed',
   'That the two are not equivalent',
   'That the two are equivalent whenever P is true'],
  'The three rows tried were never in doubt. Whether the claim happens to be true is a separate '
  'question from whether this check settled it, and it did not.',
  evidence='leave out the row where P is false and Q is true')

# =========================================================================
# PL_FAM09_CONVERSE_AND_CONTRAPOSITIVE — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_PL_027', 'PL_FAM09_CONVERSE_AND_CONTRAPOSITIVE', 'D2',
  'The statement is: if a number is a multiple of 4 then it is even. What is its converse?',
  'If a number is even then it is a multiple of 4',
  ['If a number is not a multiple of 4 then it is not even',
   'If a number is not even then it is not a multiple of 4',
   'A number is a multiple of 4 and is also even'],
  'The converse swaps the two parts and leaves them unnegated. It is a different claim, and here '
  'a false one, since 6 is even and is not a multiple of 4.')

q('GB_PL_028', 'PL_FAM09_CONVERSE_AND_CONTRAPOSITIVE', 'D3',
  'Which restatement of "if it is a dog then it is a mammal" says exactly the same thing?',
  'If it is not a mammal then it is not a dog',
  ['If it is a mammal then it is a dog',
   'If it is not a dog then it is not a mammal',
   'It is a dog and it is a mammal'],
  'Swapping the parts and negating both leaves the meaning untouched. Doing only one of those '
  'two operations changes what is being claimed.')

q('GB_PL_029', 'PL_FAM09_CONVERSE_AND_CONTRAPOSITIVE', 'D4',
  'A policy says: if an account is dormant then it is archived. A team implements it by treating '
  'every archived account as dormant. Treating every archived account as dormant is the converse '
  'of the policy, which the policy does not assert. What has gone wrong?',
  'The converse has been implemented as though it followed from the policy',
  ['The contrapositive has been implemented in place of the policy',
   'Nothing; reversing a policy says the same thing',
   'The policy as written is self-contradictory'],
  'Accounts may be archived for reasons other than dormancy, and the policy leaves room for '
  'that. The contrapositive, that anything not archived is not dormant, would have been sound.',
  evidence='Treating every archived account as dormant is the converse of the policy')

# =========================================================================
# PL_FAM10_CONDITION_OUTCOME — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_PL_030', 'PL_FAM10_CONDITION_OUTCOME', 'D2',
  'A branch runs when a user is logged in and has confirmed their email address. A user is '
  'logged in but has not confirmed. Does the branch run?',
  'No, because both parts must hold',
  ['Yes, because one of the two parts holds',
   'Yes, because being logged in is the more important requirement',
   'It cannot be decided from what is given'],
  'A requirement of both fails as soon as one part fails. Neither part outranks the other; they '
  'are simply both required.')

q('GB_PL_031', 'PL_FAM10_CONDITION_OUTCOME', 'D3',
  'A branch runs when an order is overdue or flagged. An order is neither overdue nor flagged, '
  'though it is unusually large. Does the branch run?',
  'No, because neither of the two named parts holds',
  ['Yes, because the order is unusually large',
   'Yes, because a requirement of either kind needs only one thing to be true',
   'It cannot be decided without knowing the order value'],
  'Size is not one of the two conditions, so it cannot satisfy either. Needing only one part is '
  'true and useless when neither part is present.')

q('GB_PL_032', 'PL_FAM10_CONDITION_OUTCOME', 'D4',
  'A branch is meant to run for users who are either administrators or auditors, and it is '
  'running for every user in the system. Every user satisfies at least one of the two conditions '
  'as they are currently written, because the auditor condition was written so that it holds of '
  'everyone. Why does the branch always run?',
  'Because one of the two parts is true of every user, and only one is needed',
  ['Because AND was used where OR was intended',
   'Because the administrator condition is true of every user',
   'Because any branch with two conditions runs for everyone'],
  'An always-true part makes the whole always true, whatever the other part does. Using AND '
  'would have produced too few users rather than too many.',
  evidence='the auditor condition was written so that it holds of everyone')

# =========================================================================
# PL_FAM11_ALWAYS_TRUE_OR_FALSE — D3 x1, D4 x1
# =========================================================================
q('GB_PL_033', 'PL_FAM11_ALWAYS_TRUE_OR_FALSE', 'D3',
  'What is the value of P OR NOT P?',
  'True, whatever P is',
  ['False, whatever P is', 'True only when P is true', 'It depends on the value of P'],
  'One of the two parts holds in each of the two possible cases, so the whole comes to True '
  'either way. There is no value of P that makes both parts fail.')

q('GB_PL_034', 'PL_FAM11_ALWAYS_TRUE_OR_FALSE', 'D4',
  'An expression built from P and Q comes out true on three of its four rows and false on the '
  'fourth. A developer describes it as always true. Being false on one row is enough to make a '
  'claim of always true wrong, however many rows agree. Which description is correct?',
  'It depends on the values of P and Q',
  ['It is always true', 'It is always false', 'It is true whenever P is true'],
  'Three rows out of four is not every row, and an expression that varies at all depends on its '
  'variables. Which row fails has not been stated, so nothing more specific can be said.',
  evidence='Being false on one row is enough to make a claim of always true wrong')

# =========================================================================
# PL_FAM12_CONDITION_FAULT_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_PL_035', 'PL_FAM12_CONDITION_FAULT_DIAGNOSIS', 'D3',
  'A filter should show orders that are urgent and unpaid. It is showing urgent orders, paid '
  'ones included. Which fault fits?',
  'The unpaid part is not being applied',
  ['The urgent part is not being applied',
   'A requirement of either was used where both were needed',
   'Both parts have been negated'],
  'Everything shown is urgent, so that part is working. Paid orders getting through means the '
  'second requirement is having no effect at all.')

q('GB_PL_036', 'PL_FAM12_CONDITION_FAULT_DIAGNOSIS', 'D4',
  'A rule should grant access to staff who are full-time and have completed training. It is '
  'granting access to every full-time member of staff, including those who have not completed '
  'training, and to nobody else. Nobody outside the full-time group is being granted access, so '
  'that part is working. What is the fault?',
  'The training requirement is not being applied at all',
  ['The full-time requirement is not being applied',
   'A requirement of either was used where both were needed',
   'Both parts of the condition have been negated'],
  'Had either part been enough, trained part-time staff would have been let in too, and the stem '
  'says nobody outside the full-time group gets access. That rules the loosened requirement out '
  'and leaves the training check doing nothing.',
  evidence='Nobody outside the full-time group is being granted access')

# =========================================================================
# PL_FAM13_NEGATED_CONDITION_BRANCH — D3 x1, D4 x1, D5 x3
# =========================================================================
q('GB_PL_037', 'PL_FAM13_NEGATED_CONDITION_BRANCH', 'D3',
  'A branch runs when a user is both verified and active. The opposite branch runs whenever that '
  'requirement fails. Which users take the opposite branch?',
  'Those who are unverified, or inactive, or both',
  ['Only those who are both unverified and inactive',
   'Only those who are unverified',
   'Nobody, since the two branches cover the same users'],
  'A requirement of both fails as soon as either part fails, so failing one is enough. Requiring '
  'both failures would leave a verified but inactive user with no branch to take.')

q('GB_PL_038', 'PL_FAM13_NEGATED_CONDITION_BRANCH', 'D4',
  'A requirement is that a file be both readable and recent. Its denial has been written as "not '
  'readable and not recent". A file that is readable but old fails the original requirement, and '
  'the denial as written does not admit it. What is wrong with the denial?',
  'Denying a requirement of both gives not readable or not recent, with the connective changed',
  ['The denial should have kept the connective and negated neither part',
   'The denial is correct exactly as written',
   'The two parts of the denial should have been written in the other order'],
  'Negating the parts without changing the connective is the half-done rule, and it admits only '
  'files that fail on both counts. The readable-but-old file is precisely the case it loses.',
  evidence='A file that is readable but old fails the original requirement, and the denial as '
           'written does not admit it')

q('GB_PL_039', 'PL_FAM13_NEGATED_CONDITION_BRANCH', 'D5',
  'A rule admits anyone who is either a member or a subscriber. Someone asks which people the '
  'denial of that rule admits. Satisfying even one part would have satisfied the original rule, '
  'so the denial can admit nobody who satisfies either. Who does the denial admit?',
  'Only those who are neither a member nor a subscriber',
  ['Those who are not a member, or not a subscriber, or both',
   'Those who are both a member and a subscriber',
   'Nobody at all'],
  'Denying a requirement of either gives a requirement of neither, which is much narrower than '
  'the original. The loose-sounding option would admit a member who is not a subscriber, and the '
  'original rule already admitted them.',
  mode='EDGE', hinge='Satisfying even one part would have satisfied the original rule')

q('GB_PL_040', 'PL_FAM13_NEGATED_CONDITION_BRANCH', 'D5',
  'An alert fires when a service is down and not under maintenance. A team wants the exact set '
  'of situations in which the alert does not fire. Not firing means the two-part requirement '
  'failed, and a two-part requirement fails as soon as either part does. Which situations are '
  'they?',
  'The service being up, or the service being under maintenance, or both',
  ['The service being up and under maintenance at the same time',
   'The service being up, and nothing else',
   'The service being under maintenance, and nothing else'],
  'Either failure is enough, so the quiet cases are the union of the two rather than their '
  'overlap. Listing only one of them would leave the team blind to half of their silent '
  'periods.',
  mode='TRANSFER', hinge='a two-part requirement fails as soon as either part does')

q('GB_PL_041', 'PL_FAM13_NEGATED_CONDITION_BRANCH', 'D5',
  'A requirement is that a value be greater than 10 and less than 20. A developer denies it as '
  'at most 10 and at least 20. No value can be both at most 10 and at least 20, so the denial as '
  'written admits nothing whatever. What is wrong?',
  'The connective should have become or, so that failing either comparison is enough',
  ['The comparisons should have excluded the boundary values',
   'The denial is right and the original requirement was wrong',
   'The two comparisons should have been written in the other order'],
  'A denial that can never hold is a reliable sign that the connective was left alone. Every '
  'value outside the range fails one comparison or the other, and none fails both.',
  mode='EDGE', hinge='No value can be both at most 10 and at least 20')

# =========================================================================
# PL_FAM14_CONDITION_DESIGN_CHOICE — D4 x1, D5 x4
# =========================================================================
q('GB_PL_042', 'PL_FAM14_CONDITION_DESIGN_CHOICE', 'D4',
  'A refund is allowed for orders that are unopened or faulty. An order that is both unopened '
  'and faulty must also qualify, and an order that is opened and not faulty must not. Which '
  'condition expresses the rule exactly?',
  'Unopened or faulty',
  ['Unopened and faulty', 'Unopened or faulty, but not both', 'Unopened, with faulty ignored'],
  'Either ground is sufficient, and having two grounds does not disqualify anyone. Excluding the '
  'both case would deny a refund to the customer with the strongest claim.',
  evidence='An order that is both unopened and faulty must also qualify')

q('GB_PL_043', 'PL_FAM14_CONDITION_DESIGN_CHOICE', 'D5',
  'A prize goes to entrants who answered every question or finished within the time limit, but '
  'not to those who did both, since they go into a separate draw. Entrants who did both must be '
  'excluded even though each part on its own would admit them. Which condition is right?',
  'Exactly one of the two, and not both',
  ['Either of the two, the both case included',
   'Both of the two together',
   'Neither of the two'],
  'Neither part can be used unmodified, since each admits the very entrants who must be '
  'excluded. Only the exclusive form leaves them out while keeping everyone else.',
  mode='EDGE',
  hinge='Entrants who did both must be excluded even though each part on its own would admit '
        'them')

q('GB_PL_044', 'PL_FAM14_CONDITION_DESIGN_CHOICE', 'D5',
  'A notification should reach users who have opted in and have a verified address. Users who '
  'opted in without verifying must not be contacted, and users who verified without opting in '
  'must not be contacted either. Which condition expresses that?',
  'Opted in and verified',
  ['Opted in or verified', 'Opted in or verified, but not both', 'Verified, with opting in '
   'ignored'],
  'Each one-sided case is named in the requirement as excluded, so both parts are necessary. A '
  'requirement of either would contact exactly the two groups the rule rules out.',
  mode='TRANSFER', hinge='users who verified without opting in must not be contacted either')

q('GB_PL_045', 'PL_FAM14_CONDITION_DESIGN_CHOICE', 'D5',
  'Access is granted to staff who are not on leave. One member of staff has no leave record at '
  'all. Having no record is a different thing from having a record that shows no leave, and the '
  'rule says nothing about which of the two an absent record represents. What should be done?',
  'The rule must say how a missing record is to be read before the condition can be written',
  ['Treat the missing record as meaning the person is on leave',
   'Treat the missing record as meaning the person is not on leave',
   'Refuse access whenever a record is missing'],
  'Either reading is a decision with consequences, and picking one silently buries it in code. '
  'The gap is in the rule, and it is the rule that has to close it.',
  mode='EDGE', hinge='the rule says nothing about which of the two an absent record represents')

q('GB_PL_046', 'PL_FAM14_CONDITION_DESIGN_CHOICE', 'D5',
  'A condition can be written as the denial of a two-part requirement, or as two denials joined '
  'the other way. The two admit exactly the same cases. One form will be read by people thinking '
  'in terms of the original requirement, the other by people who will later extend it with a '
  'third part. What should decide between them?',
  'Either is correct, so the choice turns on which form the people maintaining it will read more '
  'reliably',
  ['The first, because fewer negations are always clearer',
   'The second, because it is closer to the order a machine evaluates in',
   'Neither; a condition of this shape should be split into two separate rules'],
  'Correctness cannot separate them, so nothing about the logic settles it. Claiming that one '
  'form is always clearer replaces a judgement about these readers with a rule that does not '
  'hold generally.',
  mode='TRADEOFF', hinge='The two admit exactly the same cases')

# =========================================================================
# PL_FAM15_LOGIC_TRANSFER — D4 x1, D5 x3
# =========================================================================
q('GB_PL_047', 'PL_FAM15_LOGIC_TRANSFER', 'D4',
  'A building admits someone who holds a valid pass and appears on the visitor list for today. A '
  'contractor holds a valid pass and appears on yesterday list. Holding a valid pass satisfies '
  'only one of the two requirements, and both are required. Is the contractor admitted?',
  'No, because only one of the two requirements is satisfied',
  ['Yes, because the valid pass is the substantive requirement',
   'Yes, because appearing on a visitor list at all is enough',
   'It cannot be decided from the rules as given'],
  'Both requirements are stated, so satisfying one leaves the person outside. Yesterday list is '
  'not today list, however similar the two look.',
  evidence='Holding a valid pass satisfies only one of the two requirements')

q('GB_PL_048', 'PL_FAM15_LOGIC_TRANSFER', 'D5',
  'A refund system applies three rules that must all hold: the item was bought within 30 days, '
  'it is unused, and a receipt exists. A customer has a receipt and bought the item 10 days ago, '
  'but has used it. All three rules must hold together, and one of them does not. What is the '
  'outcome?',
  'No refund, because a requirement that all three hold fails as soon as one does',
  ['A refund, since two of the three rules are satisfied',
   'A partial refund in proportion to the rules satisfied',
   'It cannot be decided without knowing what the item cost'],
  'Requirements joined this way are not scored; they are met or not met. Two out of three is a '
  'failure in exactly the same way that none out of three is.',
  mode='TRANSFER', hinge='All three rules must hold together, and one of them does not')

q('GB_PL_049', 'PL_FAM15_LOGIC_TRANSFER', 'D5',
  'A discount applies when a customer is not a first-time buyer. A new system holds no record of '
  'whether a given customer has bought before. The absence of a record is being read as proof '
  'that the customer has not bought before, which is a different claim from a record showing no '
  'previous purchase. What is the risk?',
  'Returning customers whose history the system never received will be treated as first-time '
  'buyers',
  ['Every customer will end up receiving the discount',
   'No customer will end up receiving the discount',
   'The discount will be applied twice to some customers'],
  'Not knowing something is being treated as knowing it to be false, and the two differ exactly '
  'for customers whose history was never loaded. Those are the people the rule will get wrong.',
  mode='EDGE',
  hinge='The absence of a record is being read as proof that the customer has not bought before')

q('GB_PL_050', 'PL_FAM15_LOGIC_TRANSFER', 'D5',
  'An eligibility rule can be stated as one condition with four parts, or as four separate '
  'checks each with its own message. The single condition is quicker to evaluate and tells a '
  'rejected applicant nothing about which part they failed. Applicants must be told why they '
  'were rejected. Which form fits?',
  'The four separate checks, because the requirement includes telling the applicant which part '
  'failed',
  ['The single condition, because it is quicker to evaluate',
   'The single condition, with one general message covering all four parts',
   'Either, since the two reach the same decision'],
  'Both forms decide identically, so the decision is not what separates them. One of them can '
  'meet the stated obligation to explain and the other cannot.',
  mode='TRADEOFF', hinge='tells a rejected applicant nothing about which part they failed')
