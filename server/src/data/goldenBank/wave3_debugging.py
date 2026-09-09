# -*- coding: utf-8 -*-
"""
Wave 3 — DEBUGGING, 50 Golden Bank questions, all newly authored.

THIS SKILL STARTS FROM ZERO BY DESIGN, NOT BY ACCIDENT. Phase 2 found that all thirteen questions
filed under DEBUGGING were domain fault-spotting — a loop that misses its last value, a condition
with the wrong operator — and Phase 2.5 sent every one of them to the domain skill whose diagnosis
family owns it. The blueprint gives DEBUGGING the method instead: read the evidence, reproduce,
form a hypothesis that fits everything, divide the possibilities, change one thing at a time, and
check that the fault is gone rather than that the symptom is.

THE HARDEST FACT HERE IS THAT A SYMPTOM DISAPPEARING IS NOT A FIX. Two families carry it, and the
blueprint requires that every option in the root-cause family makes the symptom disappear — so the
judgement is about what each change leaves behind rather than about whether it works.
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
# DG_FAM01_MESSAGE_READING — D1 x4, D2 x1
# =========================================================================
q('GB_DG_001', 'DG_FAM01_MESSAGE_READING', 'D1',
  'A program stops with the message "division by zero at line 42". What does that tell you?',
  'That a division by zero happened while line 42 was running',
  ['That line 42 contains the mistake that must be corrected',
   'That line 42 should be deleted',
   'That the value zero was typed in by the user'],
  'The message names where the failure surfaced and what happened there. Why the divisor was zero '
  'may lie many lines earlier, which is exactly the difference between where a fault appears and '
  'where it is.')

q('GB_DG_002', 'DG_FAM01_MESSAGE_READING', 'D1',
  'A program stops with the message "file not found: report.csv". What does the message not tell '
  'you?',
  'Why the file is not there',
  ['Which file was being looked for',
   'That the program could not find it',
   'That the program stopped'],
  'The message states what was sought and what happened, and nothing about the cause. Whether the '
  'file was never created, was deleted, or was looked for in the wrong place is what the '
  'investigation has to establish.')

q('GB_DG_003', 'DG_FAM01_MESSAGE_READING', 'D1',
  'A message reads "expected a number, found text". What kind of information is that?',
  'A description of what went wrong, not of how to correct it',
  ['An instruction saying what to change',
   'A warning that can safely be ignored',
   'A statement that the program is beyond repair'],
  'A message reports the mismatch it met. Which value should have been converted, and where, is '
  'the reader\'s job — a message that named the fix would have had to understand the intent.')

q('GB_DG_004', 'DG_FAM01_MESSAGE_READING', 'D1',
  'Someone says an error message is "just noise" and closes it without reading. What is lost?',
  'The most specific evidence available about what happened and where',
  ['Nothing; messages repeat what is already obvious',
   'The chance to restart the program cleanly',
   'The record of how long the program ran'],
  'A message is the cheapest evidence there is, produced at the moment of failure and naming both '
  'the failure and its location. Discarding it means starting the investigation with nothing.')

q('GB_DG_005', 'DG_FAM01_MESSAGE_READING', 'D2',
  'A program stops with "index out of range at line 90". Line 90 reads a position from a list. '
  'Where is the fault most likely to be?',
  'Wherever the position was computed, which may be well before line 90',
  ['At line 90, which must be rewritten',
   'In the list, which must be too short',
   'In the message, which reports the wrong line'],
  'Line 90 is where an invalid position was used, and the position came from somewhere. The list '
  'being shorter than expected is one possibility among several, and it too would have a cause '
  'earlier in the program.')

# =========================================================================
# DG_FAM02_FAILURE_KIND — D1 x3, D2 x1
# =========================================================================
q('GB_DG_006', 'DG_FAM02_FAILURE_KIND', 'D1',
  'A program refuses to start and reports a problem with its text before anything runs. What kind '
  'of failure is that?',
  'One caught before execution, in how the program is written',
  ['One that happens partway through running',
   'One that produces a wrong answer',
   'Not a failure, since nothing ran'],
  'Being caught before anything runs places it in the program\'s form rather than its behaviour. '
  'A failure partway through would require the program to have started.')

q('GB_DG_007', 'DG_FAM02_FAILURE_KIND', 'D1',
  'A program runs for a while, then stops with a message. What kind of failure is that?',
  'One that happens while running',
  ['One caught before execution',
   'One that produces a wrong answer and finishes',
   'Not a failure, since some of it worked'],
  'Starting and then stopping places the failure during execution, typically because some value '
  'or resource was not what the code assumed. Partial success does not make it something other '
  'than a failure.')

q('GB_DG_008', 'DG_FAM02_FAILURE_KIND', 'D1',
  'A program runs to the end, reports nothing, and produces an answer that is wrong. Is that a '
  'failure?',
  'Yes; a program can be entirely legal, finish normally, and be wrong',
  ['No; a program that finishes has worked',
   'No; without a message there is nothing to investigate',
   'Yes, but only if it stops on some other input'],
  'Nothing about finishing cleanly speaks to correctness, and this is the most expensive kind of '
  'failure precisely because nothing announces it. Taking silence as success is the belief this '
  'measures.')

q('GB_DG_009', 'DG_FAM02_FAILURE_KIND', 'D2',
  'Three reports arrive: one program will not start, one stops halfway, and one finishes with a '
  'wrong total. Which is likely to be discovered last?',
  'The one that finishes with a wrong total, because nothing about it announces a problem',
  ['The one that will not start, because nobody can run it',
   'The one that stops halfway, because it runs partly',
   'They are discovered at the same time, since all three are faults'],
  'The first two report themselves the moment anyone tries them. A plausible wrong answer passes '
  'every informal check and may be acted on for a long time before anybody questions it.')

# =========================================================================
# DG_FAM03_EVIDENCE_SELECTION — D1 x3, D2 x1
# =========================================================================
q('GB_DG_010', 'DG_FAM03_EVIDENCE_SELECTION', 'D1',
  'The question is whether a function is being called at all. Which evidence answers it?',
  'A record written at the start of the function',
  ['A record of the value the function returns',
   'A record written at the end of the program',
   'Reading the function\'s code again'],
  'Something written on entry appears exactly when the function is reached and not otherwise. A '
  'record of the return value tells you nothing when the function never runs, since none is '
  'produced either way.')

q('GB_DG_011', 'DG_FAM03_EVIDENCE_SELECTION', 'D1',
  'The question is what value a variable held just before a failure. Which evidence answers it?',
  'A record of that variable written immediately before the failing line',
  ['A record of that variable written at the start of the program',
   'A record of a different variable at the same point',
   'The error message, which names the line'],
  'The value is wanted at a particular moment, so the record has to be taken at that moment. Its '
  'value at the start says nothing about what it became.')

q('GB_DG_012', 'DG_FAM03_EVIDENCE_SELECTION', 'D1',
  'It is already known that a function is called and that it returns the wrong value. What '
  'evidence makes progress?',
  'The values it is being given when it is called',
  ['Confirmation that it is called',
   'Confirmation that its result is wrong',
   'The number of times it is called'],
  'Evidence is useful only when it can change what you believe, and the first two options confirm '
  'what is already established. Whether the inputs are wrong or the function is decides where to '
  'look next.')

q('GB_DG_013', 'DG_FAM03_EVIDENCE_SELECTION', 'D2',
  'A total is wrong. Someone proposes recording the total after every addition. Someone else '
  'proposes recording it once at the end. Which is more useful, and why?',
  'After every addition, because it shows which addition first produced a wrong value',
  ['Once at the end, because that is where the wrong total appears',
   'Neither; the code should be read instead',
   'Once at the end, because fewer records are easier to read'],
  'A single record at the end confirms the symptom that is already known. Recording along the way '
  'turns one observation into a sequence, and the point where it first goes wrong is what '
  'localises the fault.')

# =========================================================================
# DG_FAM04_REPRODUCTION_REQUIREMENTS — D2, D3
# =========================================================================
q('GB_DG_014', 'DG_FAM04_REPRODUCTION_REQUIREMENTS', 'D2',
  'A report says only: "the export crashed this morning". What is needed before the fault can be '
  'reproduced?',
  'What was being exported and what steps were taken',
  ['Which version of the software is installed',
   'How long the export usually takes',
   'A proposed fix from the reporter'],
  'Reproducing requires the same input and the same actions, and neither is given. The version is '
  'worth knowing and does not by itself let anyone repeat the failure.')

q('GB_DG_015', 'DG_FAM04_REPRODUCTION_REQUIREMENTS', 'D3',
  'A report gives the exact steps and the exact input, and the fault does not reproduce. What is '
  'most likely still missing?',
  'Something about the reporter\'s own environment or data that the steps do not carry',
  ['The steps, which must be incomplete',
   'The input, which must be different',
   'Nothing; the fault must have been fixed already'],
  'Complete steps that do not reproduce the fault point at a difference between the two settings '
  'rather than at the description. A report can be exact about what was done and silent about '
  'where and with what.')

# =========================================================================
# DG_FAM05_HYPOTHESIS_FIT — D2, D3
# =========================================================================
q('GB_DG_016', 'DG_FAM05_HYPOTHESIS_FIT', 'D2',
  'Two observations: the program fails only on files larger than a few megabytes, and it fails on '
  'the same large file every time. Which explanation fits both?',
  'Something about the size of the file is what the code cannot handle',
  ['The file is corrupt, which is why it fails',
   'The failure is random and the large file is a coincidence',
   'The program has run out of disk space'],
  'A corrupt file would not explain why every large file fails, and randomness contradicts it '
  'failing every time on the same one. Only an explanation tied to size covers both observations.')

q('GB_DG_017', 'DG_FAM05_HYPOTHESIS_FIT', 'D3',
  'Three observations: it fails on one particular record, it succeeds on a copy of that record '
  'with one field emptied, and it succeeds on every other record. Which explanation fits all '
  'three?',
  'Something about the contents of that one field is what the code cannot handle',
  ['The record is too large',
   'The program fails intermittently',
   'The file containing the record is corrupt'],
  'Emptying one field makes the failure go away, which points at that field\'s contents and rules '
  'out both size and corruption of the file. Intermittency contradicts the failure being '
  'repeatable on that record.')

# =========================================================================
# DG_FAM06_ISOLATION_STEP — D2, D3, D4
# =========================================================================
q('GB_DG_018', 'DG_FAM06_ISOLATION_STEP', 'D2',
  'A fault could lie anywhere in a sequence of eight steps. Which next check eliminates the most '
  'possibilities?',
  'Check whether the value is correct after the fourth step',
  ['Check whether the value is correct after the first step',
   'Check whether the value is correct after the last step',
   'Change the fourth step and see whether the symptom goes'],
  'A check in the middle halves the range whichever way it comes out. Checking at either end '
  'eliminates one step, and changing something before anything is known destroys the evidence.')

q('GB_DG_019', 'DG_FAM06_ISOLATION_STEP', 'D3',
  'It is known that the value is correct after step 4 and wrong after step 8. Which check comes '
  'next?',
  'After step 6',
  ['After step 5', 'After step 8, to confirm', 'After step 2, to be thorough'],
  'The fault lies between 4 and 8, so the middle of what remains is step 6. Checking step 5 '
  'eliminates one step rather than half, and the other two re-examine regions already settled.')

q('GB_DG_020', 'DG_FAM06_ISOLATION_STEP', 'D4',
  'A colleague proposes changing three lines they suspect and running again. Nothing is yet known '
  'beyond the symptom. What is wrong with the proposal as a next step?',
  'It changes the program before anything has been learned, so the result cannot be interpreted '
  'either way',
  ['It changes too few lines to make a difference',
   'It should be done, but only after reading the whole file',
   'Nothing; trying a change is the fastest way to learn'],
  'If the symptom goes, three changes are credited and none is understood; if it stays, the '
  'suspicion is not cleared either, since the changes may have been wrong in detail. An '
  'observation costs nothing and narrows the search.',
  evidence='Nothing is yet known beyond the symptom')

# =========================================================================
# DG_FAM07_HALVING_SEARCH — D2, D3, D4
# =========================================================================
q('GB_DG_021', 'DG_FAM07_HALVING_SEARCH', 'D2',
  'A feature worked at version 10 and is broken at version 20. Which version should be tested '
  'next?',
  'Version 15',
  ['Version 11', 'Version 19', 'Version 20 again'],
  'Testing Version 15, in the middle, halves the range whatever the result. Version 11 eliminates '
  'one change, and retesting the broken version confirms what is already known.')

q('GB_DG_022', 'DG_FAM07_HALVING_SEARCH', 'D3',
  'A range of 16 versions contains the change that broke a feature. About how many tests are '
  'needed to find it by halving?',
  '4',
  ['8', '16', '2'],
  'Each test halves what remains: 16, 8, 4, 2, 1 — four tests to reach a single version. Testing '
  'each in turn would take up to sixteen.')

q('GB_DG_023', 'DG_FAM07_HALVING_SEARCH', 'D4',
  'Someone testing a range of versions always tries the one immediately after the last known good '
  'version. They do find the change eventually. Why is halving preferable?',
  'Their approach eliminates one version per test; halving eliminates half of what remains',
  ['Their approach can miss the change entirely',
   'Their approach tests versions that do not exist',
   'Halving is not preferable; their approach is more reliable'],
  'Both approaches find the change, so the difference is entirely in how many tests it takes. '
  'Reliability is not what separates them, which is why the comparison has to be about work.',
  evidence='They do find the change eventually')

# =========================================================================
# DG_FAM08_EVIDENCE_INTERPRETATION — D2, D3, D4
# =========================================================================
q('GB_DG_024', 'DG_FAM08_EVIDENCE_INTERPRETATION', 'D2',
  'Values recorded at four points read: after A, 10; after B, 10; after C, 45; after D, 45. The '
  'expected value throughout is 10. Where was the wrong value introduced?',
  'Between B and C',
  ['At D, where it was last seen', 'Between A and B', 'At A, where the value first appears'],
  'The value is correct through B and wrong at C, so whatever changed it lies between them. Point '
  'D merely carries forward a value that was already wrong.')

q('GB_DG_025', 'DG_FAM08_EVIDENCE_INTERPRETATION', 'D3',
  'Values recorded at five points read: 3, 3, 3, 7, 7. The value should stay 3 throughout. Which '
  'region can be ruled out entirely?',
  'Everything before the third point, which was still correct',
  ['Everything after the fourth point, where the value stopped changing',
   'The region between the fourth and fifth points, where nothing changed',
   'Nothing can be ruled out from these values'],
  'Correct values up to the third point clear that region, and the change happened between the '
  'third and fourth. That nothing changed afterwards is true and does not clear anything, since '
  'the damage was already done.')

q('GB_DG_026', 'DG_FAM08_EVIDENCE_INTERPRETATION', 'D4',
  'Values recorded at four points read: 5, 5, 5, 5, and the final answer is still wrong. Every '
  'recorded value is exactly what was expected. What does that tell you?',
  'The fault lies somewhere the recording does not cover, or in something other than this value',
  ['The recording is broken and should be repeated',
   'The expected values must themselves be wrong',
   'The fault is at the last point, since that is where the answer appears'],
  'Evidence that is entirely as expected rules out the region it covers and says nothing about '
  'anything else. Some other value, or a stretch with no records in it, is where to look next.',
  evidence='Every recorded value is exactly what was expected')

# =========================================================================
# DG_FAM09_ONE_CHANGE_AT_A_TIME — D2, D3, D4
# =========================================================================
q('GB_DG_027', 'DG_FAM09_ONE_CHANGE_AT_A_TIME', 'D2',
  'Three changes are made at once and the symptom disappears. What has been established?',
  'That the three together remove the symptom, and nothing about which of them matters',
  ['That all three changes were necessary',
   'That the first change was the important one',
   'That the fault is now understood'],
  'The experiment had one outcome and three variables, so it cannot attribute the result to any '
  'one of them. Two of the changes may be irrelevant or even harmful in some other case.')

q('GB_DG_028', 'DG_FAM09_ONE_CHANGE_AT_A_TIME', 'D3',
  'Three changes are made at once and the symptom remains. What has been established?',
  'That the three together do not remove it; any one of them might still be part of the fix',
  ['That none of the three is relevant',
   'That all three should be undone',
   'That the fault lies elsewhere entirely'],
  'A negative result on a combined change is as ambiguous as a positive one — one change may have '
  'helped while another made things worse. Concluding that none is relevant discards a real '
  'possibility.')

q('GB_DG_029', 'DG_FAM09_ONE_CHANGE_AT_A_TIME', 'D4',
  'A colleague reports that they changed four things and the fault is fixed, and proposes closing '
  'the investigation. The symptom genuinely no longer appears. What should be said?',
  'That the symptom is gone and the cause is unknown, so at least one change is unexplained and '
  'may be unnecessary or harmful',
  ['That the fault is fixed and the investigation can close',
   'That all four changes should be undone and redone one at a time before anything is kept',
   'That the fault was never real, since four unrelated changes removed it'],
  'The observation is genuine and the conclusion drawn from it is not. Insisting on undoing '
  'everything is a defensible instinct and heavier than the situation needs; naming what remains '
  'unknown is what lets somebody decide.',
  evidence='The symptom genuinely no longer appears')

# =========================================================================
# DG_FAM10_ASSUMPTION_VERIFICATION — D2, D3, D4
# =========================================================================
q('GB_DG_030', 'DG_FAM10_ASSUMPTION_VERIFICATION', 'D2',
  'Someone edits a file, runs the program, and sees no change in behaviour. They conclude the '
  'change had no effect. What have they assumed rather than checked?',
  'That the file they edited is the one being run',
  ['That the program runs at all',
   'That the change was the right one to make',
   'That the behaviour was worth changing'],
  'A change with no visible effect has two explanations, and only one of them is about the change '
  'itself. Confirming that the running program includes the edit costs a moment and removes half '
  'the possibilities.')

q('GB_DG_031', 'DG_FAM10_ASSUMPTION_VERIFICATION', 'D3',
  'An investigation reports: "the input file is correct, so the fault is in the code". What was '
  'assumed rather than checked?',
  'That the file the program actually opened is the file that was inspected',
  ['That the code could contain a fault',
   'That the input file exists',
   'That the fault is worth investigating'],
  'Two different things are being called the input file: the one someone looked at and the one '
  'the program read. They are usually the same and the investigation depends on it, which is '
  'exactly the kind of assumption worth checking.')

q('GB_DG_032', 'DG_FAM10_ASSUMPTION_VERIFICATION', 'D4',
  'An investigation has checked the input, the output and every intermediate value, and reports '
  'that all of them are correct while the fault persists. Every check described was genuinely '
  'carried out. What is the most likely assumption behind the contradiction?',
  'That the values being checked come from the same run as the fault',
  ['That the checks were carried out correctly',
   'That the fault is real',
   'That the code contains no other functions'],
  'Everything correct while the fault persists is a contradiction, and a contradiction points at '
  'an assumption rather than at an observation. Checks taken from a different run — a different '
  'input, an older build — are consistent with every stated fact.',
  evidence='Every check described was genuinely carried out')

# =========================================================================
# DG_FAM11_INTERMITTENT_REASONING — D3, D4
# =========================================================================
q('GB_DG_033', 'DG_FAM11_INTERMITTENT_REASONING', 'D3',
  'A program fails on roughly one run in five, with the same input each time. What follows?',
  'Something not visible in the input is varying between runs',
  ['The program is behaving randomly and cannot be investigated',
   'The input is not really the same each time',
   'The fault will disappear if the program is run enough times'],
  'Identical input with different outcomes means the input is not the only thing the program '
  'depends on. Calling it random ends the investigation before it starts, and something genuinely '
  'is different between the runs.')

q('GB_DG_034', 'DG_FAM11_INTERMITTENT_REASONING', 'D4',
  'A fault appears only when the machine is busy, and never on an idle machine. The same input is '
  'used in both cases. Which candidate cause fits?',
  'Something that depends on timing, which changes when other work competes for the machine',
  ['A wrong value in the input, which would fail every time',
   'A missing file, which would fail every time',
   'Randomness, which would not correlate with load'],
  'The failure correlates with load, which rules out anything that would fail identically on every '
  'run and rules out pure chance. Timing is the class of cause that varies with how busy a machine '
  'is.',
  evidence='The same input is used in both cases')

# =========================================================================
# DG_FAM12_ENVIRONMENT_DIFFERENCE — D3, D4
# =========================================================================
q('GB_DG_035', 'DG_FAM12_ENVIRONMENT_DIFFERENCE', 'D3',
  'Identical code works on one machine and fails on another. What follows?',
  'Something outside the code differs between the two machines',
  ['The code contains a fault that one machine tolerates',
   'One of the two machines is faulty',
   'The code is not really identical'],
  'Identical instructions producing different behaviour means the instructions are not the only '
  'input. Concluding that a machine is faulty jumps to one difference among many that have not '
  'been examined.')

q('GB_DG_036', 'DG_FAM12_ENVIRONMENT_DIFFERENCE', 'D4',
  'Code works on one machine and fails on another with a message about a missing setting. The '
  'code, the input and the version are confirmed identical. What should be compared first?',
  'The configuration each machine supplies to the program',
  ['The processor speed of the two machines',
   'The amount of memory installed',
   'The code, once more, in case something was missed'],
  'The symptom names the class of difference, so the comparison should start there rather than '
  'with hardware that could not produce this message. Re-checking what has been confirmed '
  'identical repeats work already done.',
  evidence='The code, the input and the version are confirmed identical')

# =========================================================================
# DG_FAM13_FIX_VERIFICATION — D3, D4, D5 x3
# =========================================================================
q('GB_DG_037', 'DG_FAM13_FIX_VERIFICATION', 'D3',
  'A change is made and the program is run on an input that never triggered the fault. The '
  'symptom does not appear. What has been established?',
  'Nothing about the fault, since this input never produced the symptom',
  ['That the fault is fixed',
   'That the fault was not real',
   'That the change was unnecessary'],
  'A test can only tell you something when it would have behaved differently before the change. '
  'This input passed before and passes now, so it distinguishes nothing.')

q('GB_DG_038', 'DG_FAM13_FIX_VERIFICATION', 'D4',
  'A change is made and the failing case now passes. The change was to catch the failure and '
  'continue silently. Is the fault fixed?',
  'No; the failure still occurs and is now hidden, so the wrong behaviour continues unreported',
  ['Yes; the failing case passes',
   'Yes, provided no other case fails',
   'No; the change should have been made in a different file'],
  'Catching a failure removes the symptom and leaves everything that produced it. The program now '
  'does the wrong thing quietly, which is worse than doing it loudly.',
  evidence='The change was to catch the failure and continue silently')

q('GB_DG_039', 'DG_FAM13_FIX_VERIFICATION', 'D5',
  'A change fixes the reported case and nobody can say why it works. Should it be kept?',
  'Not as it stands; a change that works for unknown reasons may stop working for unknown reasons',
  ['Yes; a working fix is a working fix',
   'Yes, provided the tests pass',
   'No; it should be discarded and the fault left open'],
  'What is missing is not the outcome but the account of it, and without one nobody can say which '
  'other cases it affects. Discarding it outright throws away a genuine clue about where the '
  'fault lies.',
  mode='TRADEOFF', hinge='nobody can say why it works')

q('GB_DG_040', 'DG_FAM13_FIX_VERIFICATION', 'D5',
  'To be sure a fault is fixed, what has to be shown besides the symptom no longer appearing?',
  'That the change removes the cause, and that the case which used to fail now behaves correctly '
  'rather than merely quietly',
  ['That every test in the suite passes',
   'That the program runs faster than before',
   'Nothing further; the symptom is the fault'],
  'A symptom can be suppressed, hidden or avoided without the cause going anywhere, so its absence '
  'is necessary and not sufficient. A passing suite is evidence and is only as good as whether any '
  'test would have caught this.',
  mode='TRANSFER', hinge='besides the symptom no longer appearing')

q('GB_DG_041', 'DG_FAM13_FIX_VERIFICATION', 'D5',
  'A fix is verified by running the case that failed. What further case is worth running, and why?',
  'A case that passed before, to confirm the change has not broken something that was working',
  ['The same case again, to confirm the result',
   'A case that would fail whatever happens, as a control',
   'Nothing further; the failing case is what mattered'],
  'A change can remove one fault and introduce another, and only a previously working case can '
  'reveal that. Repeating the fixed case adds nothing, and a case that always fails tells you '
  'nothing about the change.',
  mode='TRANSFER', hinge='What further case is worth running')

# =========================================================================
# DG_FAM14_ROOT_CAUSE_JUDGEMENT — D4, D5 x4   (every option removes the symptom)
# =========================================================================
q('GB_DG_042', 'DG_FAM14_ROOT_CAUSE_JUDGEMENT', 'D4',
  'A division by zero occurs because a count is zero for empty input. Two changes are proposed: '
  'return early when the input is empty, or wrap the division so the failure is caught and ignored. '
  'Both remove the symptom. Which addresses the cause?',
  'Returning early on empty input, because it handles the case that produced the zero',
  ['Wrapping the division, because it prevents the failure',
   'Both equally, since the symptom goes either way',
   'Neither; the division itself must be rewritten'],
  'One change handles the situation the program can genuinely meet; the other lets it continue '
  'past a failure with no defined result. Both make the symptom disappear, which is exactly why '
  'the judgement is about what each leaves behind.',
  evidence='Both remove the symptom')

q('GB_DG_043', 'DG_FAM14_ROOT_CAUSE_JUDGEMENT', 'D5',
  'A fault appears for one particular customer record. Two changes are proposed: skip that record, '
  'or correct the handling of the field that breaks. Both remove the symptom. What does the first '
  'leave behind?',
  'Every other record with the same field content, which will break in the same way',
  ['Nothing; the record was the problem',
   'A slower program, because of the extra check',
   'A record that will be processed incorrectly rather than skipped'],
  'Special-casing the input that revealed a fault treats the messenger as the cause. The next '
  'record with the same content is not covered by the special case and fails identically.',
  mode='TRANSFER', hinge='skip that record, or correct the handling of the field that breaks')

q('GB_DG_044', 'DG_FAM14_ROOT_CAUSE_JUDGEMENT', 'D5',
  'When is suppressing a symptom the defensible choice rather than fixing the cause?',
  'When the system must keep running now and the cause cannot be fixed in time — provided the '
  'suppression is recorded and the cause is still pursued',
  ['Never; the cause must always be fixed first',
   'Whenever the fix would take longer than the suppression',
   'Whenever the symptom is rare enough not to matter'],
  'Keeping something running while a proper fix is prepared is a real engineering decision, and '
  'what makes it defensible is that it is deliberate, recorded and temporary. Choosing it merely '
  'because it is quicker is how a temporary measure becomes permanent.',
  mode='TRADEOFF', hinge='When is suppressing a symptom the defensible choice')

q('GB_DG_045', 'DG_FAM14_ROOT_CAUSE_JUDGEMENT', 'D5',
  'A fault has been suppressed rather than fixed, and six months later a similar fault appears '
  'elsewhere. What is the connection?',
  'The cause was never removed, so anything sharing it can fail the same way',
  ['There is no connection; the two are separate faults',
   'The suppression caused the second fault directly',
   'The second fault proves the first was fixed correctly'],
  'A cause that survives can produce symptoms wherever it is present, and the second appearance is '
  'evidence about the first. That is different from the suppression causing it, which would '
  'require the suppression itself to be at fault.',
  mode='TRANSFER', hinge='six months later a similar fault appears elsewhere')

q('GB_DG_046', 'DG_FAM14_ROOT_CAUSE_JUDGEMENT', 'D5',
  'Two changes both remove a symptom: one is small and addresses the cause, the other is large and '
  'restructures the surrounding code. What decides between them?',
  'Whether the restructuring is needed for something beyond this fault; if not, the small change '
  'does the job with less risk',
  ['The large change, since it improves the code',
   'The small change, since smaller changes are always safer',
   'Neither; both should be applied'],
  'Both address the cause, so the question is what else each brings. Restructuring may be worth '
  'doing and is a separate piece of work, and bundling it into a fix makes both harder to review '
  'and to undo.',
  mode='TRADEOFF', hinge='one is small and addresses the cause, the other is large and '
                         'restructures the surrounding code')

# =========================================================================
# DG_FAM15_STRATEGY_CHOICE — D4, D5 x3   (every approach is a real technique)
# =========================================================================
q('GB_DG_047', 'DG_FAM15_STRATEGY_CHOICE', 'D4',
  'A fault is new since yesterday and the code has changed in twenty places since then. The '
  'message gives no useful location. Which approach makes progress fastest?',
  'Halving the range of changes to find which one introduced it',
  ['Reading the whole file where the fault appears',
   'Adding records at every step of the program',
   'Rewriting the part of the code most likely to be wrong'],
  'The most informative thing known is that it worked yesterday, which turns the problem into a '
  'search over changes. Reading and recording are real techniques and start from nothing when a '
  'much stronger clue is available.',
  evidence='The message gives no useful location')

q('GB_DG_048', 'DG_FAM15_STRATEGY_CHOICE', 'D5',
  'A fault has existed for as long as anyone remembers, and nothing has changed recently. The '
  'message names a specific line. Which approach fits?',
  'Start at the line named and work backwards through the values that reach it',
  ['Halve the range of recent changes',
   'Ask when the fault was introduced',
   'Rewrite the file containing the line'],
  'Halving a range of changes needs a change to search, and here there is none. What is available '
  'is a location, so the investigation starts there and moves back along the values.',
  mode='TRANSFER', hinge='nothing has changed recently')

q('GB_DG_049', 'DG_FAM15_STRATEGY_CHOICE', 'D5',
  'A fault is already localised to five lines and its message states exactly which value is '
  'wrong. Someone proposes adding records throughout the program. What is wrong with that?',
  'The evidence it would gather is already available, so it costs time and adds nothing',
  ['Recording is never a useful technique',
   'It would change the behaviour of the fault',
   'Nothing; more evidence is always better'],
  'Recording is a real and often necessary technique, and it is wasted where the question it '
  'answers has already been answered. Choosing an approach means asking what is still unknown.',
  mode='TRANSFER', hinge='its message states exactly which value is wrong')

q('GB_DG_050', 'DG_FAM15_STRATEGY_CHOICE', 'D5',
  'Two approaches would both find a fault: one takes an hour and is certain, the other takes ten '
  'minutes and works about half the time. How should the choice be made?',
  'Try the quick one first, since failing costs ten minutes and succeeding saves fifty',
  ['The certain one, since certainty is worth the time',
   'The quick one, since speed always matters more',
   'Neither; both should be run at once'],
  'The two are not exclusive in time: a failed quick attempt still leaves the certain one '
  'available, so the expected cost of trying it first is lower. That reasoning depends on the '
  'numbers, and it would reverse if the quick approach took most of an hour.',
  mode='TRADEOFF', hinge='one takes an hour and is certain, the other takes ten minutes')
