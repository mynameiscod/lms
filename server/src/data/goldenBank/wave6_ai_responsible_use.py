# -*- coding: utf-8 -*-
"""
Wave 6 — AI_RESPONSIBLE_USE, 50 Golden Bank questions, all newly authored.

THIS MEASURES CONSEQUENCES THAT CAN BE TRACED, NOT CONDUCT THAT CAN BE PREACHED. Not "should you
use these tools" but "which of these claims must be verified before it is published", "what
follows once this has been pasted in", "who bears the cost when this output is wrong". A family
that could only be settled by moral preference was not written, because a student can disagree
with it and still be right.

EVERY POLICY IS QUOTED IN FULL IN ITS OWN STEM. Institutions differ, rules change, and a question
that rewarded knowing one university's regulations would measure the wrong thing and date within a
year. What is measured is applying a stated rule to a case it does not name.

"ASK IT AGAIN" AND "ASK IT WHETHER IT IS SURE" APPEAR THROUGHOUT AS WRONG ANSWERS. They are what
people actually do, they feel like checking, and they produce a second claim by the process that
produced the first.

REFUSING EVERYTHING SCORES NO BETTER THAN ACCEPTING EVERYTHING. Several stems have a use that is
plainly fine — low stakes, checkable output, a reader in the loop — and the correct answer is to
go ahead. A student who has learned only to be suspicious has not learned to weigh anything, and
this bank does not reward them.
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
# AR_FAM01_FABRICATION_RECOGNITION — D1 x4, D2 x1
# =========================================================================
q('GB_AR_001', 'AR_FAM01_FABRICATION_RECOGNITION', 'D1',
  'An output contains four statements. Which is most likely to be invented?',
  'A named study from 2019 with two authors and a page range',
  ['A statement that the topic is widely debated',
   'A statement that more research would be useful',
   'A statement that the question is difficult to answer'],
  'Invention produces precise, well-formed detail because that is what the surrounding text calls '
  'for. The three vague statements are nearly always safe and nearly always useless.')

q('GB_AR_002', 'AR_FAM01_FABRICATION_RECOGNITION', 'D1',
  'What does a fabricated detail typically look like?',
  'Specific, correctly formatted and entirely ordinary',
  ['Vague and hedged', 'Obviously unusual in wording',
   'Marked as uncertain by the system'],
  'Nothing about a fabricated detail announces itself. It is produced by the same process as a '
  'correct one and comes out looking the same.')

q('GB_AR_003', 'AR_FAM01_FABRICATION_RECOGNITION', 'D1',
  'An output gives a statistic to one decimal place and attributes it to a named organisation. '
  'What follows from the precision?',
  'Nothing; precision is not evidence about accuracy',
  ['That the figure came from a real source',
   'That the figure was computed rather than recalled',
   'That the figure is current'],
  'A precise figure is what the sentence needed, whether or not one exists. Precision reads as '
  'authority and carries none.')

q('GB_AR_004', 'AR_FAM01_FABRICATION_RECOGNITION', 'D1',
  'Which part of an output about a legal question most needs checking before use?',
  'The section number of the statute it cites',
  ['The general description of how the law works',
   'The observation that the area is complex',
   'The suggestion to consult a professional'],
  'A section number is precise, checkable, and exactly the kind of detail that gets invented. The '
  'general description is harder to falsify and easier to verify loosely.')

q('GB_AR_005', 'AR_FAM01_FABRICATION_RECOGNITION', 'D2',
  'A student says they can tell fabricated output apart because it sounds less confident. What is '
  'wrong with that?',
  'Fabricated output is typically as confident as accurate output, since both are produced the '
  'same way',
  ['Nothing; confidence is a reliable signal',
   'Fabricated output is more confident, so the test is backwards',
   'Fabricated output cannot be told apart by any means'],
  'Manner is not correlated with accuracy in either direction. It can be told apart, by checking '
  'the claim against something outside the system.')

# =========================================================================
# AR_FAM02_CONFIDENTIAL_INPUT — D1 x3, D2 x1
# =========================================================================
q('GB_AR_006', 'AR_FAM02_CONFIDENTIAL_INPUT', 'D1',
  'Which of these should not be pasted into an external service?',
  'A customer list including names and addresses',
  ['A published product manual',
   'A page from the company public website',
   'An error message from open-source software'],
  'The customer list belongs to the people in it and to the company. The other three are already '
  'public and pasting them discloses nothing.')

q('GB_AR_007', 'AR_FAM02_CONFIDENTIAL_INPUT', 'D1',
  'A developer wants to paste twenty lines from a private codebase to ask about an error. What '
  'decides whether that is acceptable?',
  'Whether those lines are confidential, rather than how few of them there are',
  ['The number of lines, since twenty is a small extract',
   'Whether the error is serious',
   'Whether the developer wrote the lines themselves'],
  'A short extract of confidential material is still confidential. Authorship does not transfer '
  'ownership when the work was done for an employer.')

q('GB_AR_008', 'AR_FAM02_CONFIDENTIAL_INPUT', 'D1',
  'Which of these is confidential in a way that pasting would breach?',
  'A colleague medical certificate',
  ['A public holiday calendar',
   'The office opening hours',
   'A published organisational chart'],
  'Information about an identified person health belongs to them. The others are routinely '
  'published and concern nobody in particular.')

q('GB_AR_009', 'AR_FAM02_CONFIDENTIAL_INPUT', 'D2',
  'A developer replaces the customer names in a file with placeholders before pasting it, but '
  'leaves the account numbers, dates and amounts. Is the file now safe to paste?',
  'No; the remaining fields may still identify people and are themselves confidential',
  ['Yes, since the names have been removed',
   'Yes, provided the placeholders are consistent',
   'No, because placeholders make the question harder to answer'],
  'Removing names removes one identifier and not the others, and account numbers are sensitive '
  'in their own right. Partial removal is where this goes wrong most often.')

# =========================================================================
# AR_FAM03_DISCLOSURE_NEED — D1 x3, D2 x1
# =========================================================================
q('GB_AR_010', 'AR_FAM03_DISCLOSURE_NEED', 'D1',
  'A course states: "Assistance of any kind must be acknowledged in a note at the end of the '
  'submission." A student used a tool to check their spelling. What does the rule require?',
  'A note acknowledging it, since the rule covers assistance of any kind',
  ['Nothing, since spelling is trivial',
   'Nothing, since spelling checkers are standard',
   'A note only if the tool changed the meaning'],
  'The rule as quoted admits no exception for how small the help was. Whether the rule should be '
  'that broad is a different question from what it says.')

q('GB_AR_011', 'AR_FAM03_DISCLOSURE_NEED', 'D1',
  'A course states: "You may use any tool to help you understand the material. Submitted code '
  'must be your own work." A student used a tool to explain a concept and then wrote the code '
  'themselves. What does the rule require?',
  'Nothing further; understanding was assisted and the submitted work was their own',
  ['A note acknowledging the tool',
   'Resubmission without the tool having been used',
   'Nothing, but only if the concept was simple'],
  'The rule draws its line at the submitted code and explicitly permits help with understanding. '
  'This student stayed on the permitted side of it.')

q('GB_AR_012', 'AR_FAM03_DISCLOSURE_NEED', 'D1',
  'What decides whether assistance needs declaring?',
  'What the work was meant to demonstrate, and what the applicable rule says',
  ['How much assistance was taken',
   'Whether the assistance improved the result',
   'Whether anyone would be able to tell'],
  'Quantity is not the test and neither is detectability. The purpose of the work and the stated '
  'rule are what settle it.')

q('GB_AR_013', 'AR_FAM03_DISCLOSURE_NEED', 'D2',
  'A workplace has no stated policy on tool use. A developer used a generator for part of a '
  'deliverable and says no declaration is needed because nothing requires one. What is the '
  'weakness?',
  'The absence of a rule leaves the question open rather than settling it in their favour',
  ['Nothing; without a rule there is no obligation',
   'A rule always exists implicitly and forbids it',
   'The developer should have refused to use the tool'],
  'No rule means nobody has decided, which is a reason to ask rather than a permission. Deciding '
  'unilaterally in one own favour is what makes the position weak.')

# =========================================================================
# AR_FAM04_CLAIM_VERIFIABILITY — D2 x1, D3 x1
# =========================================================================
q('GB_AR_014', 'AR_FAM04_CLAIM_VERIFIABILITY', 'D2',
  'A generated report for a client contains four claims. Which most needs verifying before the '
  'report is sent?',
  'That a named regulation requires a specific action by a specific date',
  ['That the industry has grown in recent years',
   'That planning ahead is generally advisable',
   'That several approaches to the problem exist'],
  'The client may act on the regulation claim, and acting on it wrongly has a consequence and a '
  'deadline. The other three are unremarkable and cost nothing if loosely stated.')

q('GB_AR_015', 'AR_FAM04_CLAIM_VERIFIABILITY', 'D3',
  'An output contains a surprising claim that would be interesting if true and changes nothing '
  'anyone does, and an unsurprising claim that a payment deadline is the fifteenth of the month. '
  'Which should be checked first?',
  'The deadline, because someone will act on it',
  ['The surprising claim, because surprising claims are more likely wrong',
   'Both equally, since both are claims',
   'Neither, since one is unsurprising and the other is trivia'],
  'Checking effort follows consequence rather than novelty. An unsurprising claim that is acted '
  'on is worth more attention than a striking one that is not.')

# =========================================================================
# AR_FAM05_SOURCE_SUPPORT — D2 x1, D3 x1
# =========================================================================
q('GB_AR_016', 'AR_FAM05_SOURCE_SUPPORT', 'D2',
  'A claim states that a treatment reduces recovery time by half. The source cited is a real paper '
  'that reports a reduction of about a tenth. Does the source support the claim?',
  'No; the source exists and says something different',
  ['Yes, since the source is real and on the topic',
   'Yes, since both report a reduction',
   'It cannot be decided without reading the whole paper'],
  'Existing and being on topic are not the same as supporting. A citation that does not say what '
  'it is cited for is worse than none, because it looks checked.')

q('GB_AR_017', 'AR_FAM05_SOURCE_SUPPORT', 'D3',
  'A claim about current practice cites a real and well-regarded paper from 1998. What is the '
  'weakness?',
  'The source may not support a claim about current practice, whatever its quality',
  ['The source is not reputable enough',
   'The source is too old to be real',
   'There is no weakness; the paper is well-regarded'],
  'Quality and relevance are separate. An excellent paper about 1998 practice supports a claim '
  'about 1998 practice.')

# =========================================================================
# AR_FAM06_VERIFICATION_STEP — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_AR_018', 'AR_FAM06_VERIFICATION_STEP', 'D2',
  'An output states that a particular function exists in a library. What settles whether it does?',
  'Looking it up in the library documentation',
  ['Asking the same system whether it is sure',
   'Asking the same system to cite its source',
   'Asking the question again in different words'],
  'Only the first consults something outside the system. The other three produce further text by '
  'the same process that produced the claim.')

q('GB_AR_019', 'AR_FAM06_VERIFICATION_STEP', 'D3',
  'A user asks the same question three times and gets the same answer each time. Does the '
  'agreement establish that the answer is right?',
  'No; it shows the answer is stable, which is a different thing',
  ['Yes; three independent answers agreeing is strong evidence',
   'Yes, provided the wording differed each time',
   'No, and the repetition tells you nothing whatever'],
  'The three runs are not independent, since they share a process and a starting point. Stability '
  'is genuinely informative and is not accuracy.')

q('GB_AR_020', 'AR_FAM06_VERIFICATION_STEP', 'D4',
  'A user asks a system to provide a link supporting a claim, and receives one. The link was '
  'produced by the same process that produced the claim and has not been opened. What has been '
  'established?',
  'Nothing yet; the link is another produced claim until it is opened and read',
  ['That the claim has a source',
   'That the claim is supported, since a link was given',
   'That the system checked the claim before answering'],
  'A produced link may not resolve, or may resolve to something that says nothing relevant. '
  'Opening it and reading it is where the checking happens.',
  evidence='The link was produced by the same process that produced the claim and has not been '
           'opened')

# =========================================================================
# AR_FAM07_BIAS_SOURCE — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_AR_021', 'AR_FAM07_BIAS_SOURCE', 'D2',
  'A system trained on historical hiring decisions recommends fewer candidates from a particular '
  'group. Nobody wrote any rule about that group. How is that possible?',
  'The historical decisions contained the pattern, and the system reproduced it',
  ['Somebody must have written a rule after all',
   'The system developed a preference on its own',
   'The candidates from that group had weaker applications'],
  'A system reproduces what its examples contain, including patterns nobody intended and nobody '
  'stated. Intent is not required for the effect.')

q('GB_AR_022', 'AR_FAM07_BIAS_SOURCE', 'D3',
  'A team removes the field naming each candidate group from the training data, and the uneven '
  'outcome persists. Why might that be?',
  'Other fields in the data still carry that information indirectly',
  ['The removal was not applied correctly',
   'The system memorised the field before it was removed',
   'The unevenness must now be coincidence'],
  'Postcodes, school names and career gaps can all stand in for the removed field. Removing the '
  'obvious column removes the label rather than the pattern.')

q('GB_AR_023', 'AR_FAM07_BIAS_SOURCE', 'D4',
  'A tool for grading written work scores one dialect of English lower than another, on pieces '
  'judged equal in quality by human markers. The training material came almost entirely from one '
  'dialect and human markers judged the pieces equal in quality. What accounts for it?',
  'The training material represented one dialect, so departures from it read as errors',
  ['The lower-scoring dialect really is of lower quality',
   'The human markers were mistaken',
   'The tool has a rule penalising that dialect'],
  'The human judgement is the stem\'s stated ground truth, which rules out the quality '
  'explanation. What is left is that the tool learned one dialect and treats the other as '
  'deviation.',
  evidence='The training material came almost entirely from one dialect and human markers judged '
           'the pieces equal in quality')

# =========================================================================
# AR_FAM08_BIAS_IN_OUTPUT — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_AR_024', 'AR_FAM08_BIAS_IN_OUTPUT', 'D2',
  'Two identical requests for a job description are made, differing only in the name of the role '
  'holder. The two outputs differ in the seniority of the language used. What does that show?',
  'That something irrelevant to the role influenced the output',
  ['That the two roles are genuinely different',
   'That the outputs vary randomly and this is ordinary variation',
   'That one of the two names is invalid'],
  'The only difference between the requests was one that should not have mattered. Whether it '
  'happens consistently is the next question rather than this one.')

q('GB_AR_025', 'AR_FAM08_BIAS_IN_OUTPUT', 'D3',
  'A team observes a difference between two outputs that differ in one irrelevant respect, and '
  'notes that outputs vary between runs anyway. What would settle whether the difference is real?',
  'Repeating both many times and comparing the distributions',
  ['Running each once more',
   'Asking the system whether it treats the two differently',
   'Accepting the single observation, since the requests differed in only one way'],
  'Ordinary variation and a systematic difference look identical in one pair of outputs. '
  'Repetition separates them, and asking the system does not.')

q('GB_AR_026', 'AR_FAM08_BIAS_IN_OUTPUT', 'D4',
  'Two loan summaries are generated for applicants with identical finances, differing only in '
  'postcode. One summary recommends further checks and the other does not. Postcode is the only '
  'difference between the two applications and the finances are stated as identical. What follows?',
  'The postcode influenced the recommendation, which the stated finances do not justify',
  ['The postcodes indicate a genuine difference in risk',
   'The difference is ordinary variation and can be ignored',
   'One of the two summaries contains an error unrelated to postcode'],
  'The finances being identical is what makes the comparison informative. Whether postcode '
  'correlates with risk in the wider world does not license using it here.',
  evidence='Postcode is the only difference between the two applications and the finances are '
           'stated as identical')

# =========================================================================
# AR_FAM09_EXPOSURE_CONSEQUENCE — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_AR_027', 'AR_FAM09_EXPOSURE_CONSEQUENCE', 'D2',
  'A developer pastes a customer record into an external service and then deletes the '
  'conversation. What has deletion achieved?',
  'It has removed the developer view of it; the sending already happened',
  ['It has undone the disclosure',
   'It has removed the record from the service entirely',
   'Nothing, and nothing needed to be achieved'],
  'Deletion acts on what the user can see. The material left the organisation at the moment it '
  'was sent.')

q('GB_AR_028', 'AR_FAM09_EXPOSURE_CONSEQUENCE', 'D3',
  'A developer realises they have pasted confidential material into an external service. What is '
  'the most useful next step?',
  'Tell whoever is responsible for the material, so the exposure can be assessed',
  ['Delete the conversation and say nothing',
   'Ask the service to delete the material',
   'Note it and continue, since nothing visible has gone wrong'],
  'Someone else has to decide what follows — whether customers must be told, whether credentials '
  'must be changed. Handling it privately removes that decision from the people entitled to make '
  'it.')

q('GB_AR_029', 'AR_FAM09_EXPOSURE_CONSEQUENCE', 'D4',
  'A developer pastes a file containing an active access key into an external service. They '
  'delete the conversation immediately and nothing appears to have gone wrong. The key is still '
  'valid and deleting the conversation does not change that. What must happen?',
  'The key must be replaced, since it is still valid and has left the organisation',
  ['Nothing further; the conversation was deleted promptly',
   'The service should be asked to confirm deletion',
   'The file should be checked for other secrets and then forgotten'],
  'Whether anybody has used the key is unknown and unknowable, so the only remedy that works is '
  'making it useless. Prompt deletion addresses the record and not the credential.',
  evidence='The key is still valid and deleting the conversation does not change that')

# =========================================================================
# AR_FAM10_INTEGRITY_BOUNDARY — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_AR_030', 'AR_FAM10_INTEGRITY_BOUNDARY', 'D2',
  'An exercise exists to demonstrate that a student can trace a loop by hand. The student asks a '
  'tool to trace it and copies the trace. Has help become substitution?',
  'Yes; the tool supplied exactly the thing the exercise was to demonstrate',
  ['No, since the student read the trace afterwards',
   'No, since the trace is correct',
   'Only if the student did not understand the trace'],
  'The exercise was about the student producing a trace. Reading a correct one afterwards is '
  'valuable and is not what was being assessed.')

q('GB_AR_031', 'AR_FAM10_INTEGRITY_BOUNDARY', 'D3',
  'A project exists to demonstrate that a student can design and build a working application. The '
  'student uses a tool to explain an unfamiliar error message and then fixes it themselves. Has '
  'help become substitution?',
  'No; understanding an error is not what the project was assessing',
  ['Yes, since the tool contributed to the finished project',
   'Yes, since the student could not solve it alone',
   'Only if the fix was more than one line'],
  'What the work demonstrates is design and construction, and both remained the student\'s. '
  'Looking up an unfamiliar message is ordinary practice.')

q('GB_AR_032', 'AR_FAM10_INTEGRITY_BOUNDARY', 'D4',
  'A student uses a tool for ninety per cent of the words in an essay assessing their grasp of a '
  'historical argument, and for ten per cent of the words in an essay assessing their writing '
  'style. The proportion of words is the same measure in both cases, while what each essay exists '
  'to demonstrate is different. How should the two be judged?',
  'By what each essay was assessing, so the small use in the style essay may be the more serious',
  ['By proportion, so the ninety per cent case is much more serious',
   'By proportion, and both are acceptable if declared',
   'Both are equally acceptable, since a tool was used in each'],
  'Ten per cent of the words in a style assessment can be exactly the part being marked. Counting '
  'words measures something that is not what the rule is about.',
  evidence='The proportion of words is the same measure in both cases, while what each essay '
           'exists to demonstrate is different')

# =========================================================================
# AR_FAM11_FABRICATED_REFERENCE_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_AR_033', 'AR_FAM11_FABRICATED_REFERENCE_DIAGNOSIS', 'D3',
  'A reference in a generated draft cannot be found in any catalogue or search. What should be '
  'done?',
  'Remove it, and find a real source if the claim is to stay',
  ['Keep it, since the claim it supports is probably true',
   'Ask the system for the link so the reference can be located',
   'Keep it and mark it as unverified'],
  'A reference that names nothing supports nothing, whatever the claim\'s merits. Asking the '
  'system for a link produces another claim of the same kind.')

q('GB_AR_034', 'AR_FAM11_FABRICATED_REFERENCE_DIAGNOSIS', 'D4',
  'A draft cites a paper. The authors are real and work in this field, the journal exists, and no '
  'paper of that title by those authors appears anywhere. The authors and journal are real while '
  'no paper matching the citation exists. What is the most likely explanation?',
  'The citation was assembled from plausible parts and refers to no actual paper',
  ['The paper exists but is not indexed',
   'The title has been slightly misremembered and the paper is real',
   'The authors have not yet published it'],
  'Real components assembled into an unreal whole is exactly what generation produces, and it is '
  'far harder to detect than an obviously invented name. Searching by author rather than by title '
  'is how it gets confirmed.',
  evidence='The authors and journal are real while no paper matching the citation exists')

# =========================================================================
# AR_FAM12_UNCHECKED_CLAIM_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_AR_035', 'AR_FAM12_UNCHECKED_CLAIM_DIAGNOSIS', 'D3',
  'A wrong figure appears in a published report. It was generated, included by an analyst, passed '
  'by a reviewer who checked formatting only, and approved by a manager who read the summary. '
  'Where should it have been stopped?',
  'At the analyst, who introduced it and was the last person positioned to check it',
  ['At the manager, who gave final approval',
   'At the reviewer, who was checking formatting',
   'At the generator, which produced it'],
  'The reviewer and manager were doing something else, and neither was checking figures. The '
  'analyst brought it in and had the source to check it against.')

q('GB_AR_036', 'AR_FAM12_UNCHECKED_CLAIM_DIAGNOSIS', 'D4',
  'A wrong claim reaches customers. Every person who handled it assumed somebody earlier had '
  'verified it. Nobody was assigned to verify claims and every handler assumed an earlier one had '
  'done so. What is the fault?',
  'The process, which never assigned the verification to anyone',
  ['The last person to handle it, who should have checked',
   'The first person to handle it, who introduced it',
   'The generator, which produced the wrong claim'],
  'Each individual behaved reasonably given what they believed, and the belief was never true of '
  'anyone. Naming who verifies is what fixes this, and blaming a handler leaves the gap open.',
  evidence='Nobody was assigned to verify claims and every handler assumed an earlier one had '
           'done so')

# =========================================================================
# AR_FAM13_HARM_REASONING — D3 x1, D4 x1, D5 x3
# =========================================================================
q('GB_AR_037', 'AR_FAM13_HARM_REASONING', 'D3',
  'A generated summary of a medical leaflet is given to a patient and contains a wrong dose. Who '
  'bears the cost of the error?',
  'The patient, who did not choose the tool and cannot check the figure',
  ['The person who generated the summary',
   'The tool provider',
   'Nobody, provided the error is corrected quickly'],
  'The person who took the risk and the person who bears it are different people here. That '
  'separation is what makes the decision to use the tool somebody else\'s business.')

q('GB_AR_038', 'AR_FAM13_HARM_REASONING', 'D4',
  'A tool drafts rejection letters for benefit applications. It is right in ninety-nine cases out '
  'of a hundred. The service handles fifty thousand applications a year and each error means one '
  'person wrongly refused. A one per cent error rate over fifty thousand applications is five '
  'hundred people, and each of them is wrongly refused. How should the rate be judged?',
  'As five hundred people a year wrongly refused, which is the figure that matters',
  ['As a very low error rate, which is acceptable',
   'As acceptable, provided applicants may appeal',
   'As unmeasurable without knowing the previous rate'],
  'A rate expressed as a percentage understates what it means at scale. An appeal process helps '
  'those who use it and does not undo the five hundred refusals.',
  evidence='A one per cent error rate over fifty thousand applications is five hundred people')

q('GB_AR_039', 'AR_FAM13_HARM_REASONING', 'D5',
  'Two uses are compared. One drafts internal meeting notes that everyone present can correct '
  'from memory. One drafts safety instructions for equipment used by people with no other source '
  'of information. Every reader of the notes can detect an error and no reader of the '
  'instructions can. How does the same error rate differ between them?',
  'The same rate is tolerable in one and not the other, because only one set of readers can '
  'detect an error',
  ['The rate matters equally in both, since accuracy is accuracy',
   'The rate matters more for the notes, since more people read them',
   'Neither use is acceptable at any error rate'],
  'Detectability by the reader is what converts an error into a harm or into a correction. The '
  'rate on its own is not enough to judge either use.',
  mode='TRANSFER',
  hinge='Every reader of the notes can detect an error and no reader of the instructions can')

q('GB_AR_040', 'AR_FAM13_HARM_REASONING', 'D5',
  'A team argues that a tool need not be better than a human, only better than the human it '
  'replaces. The tool errs less often overall and errs on a different group of cases than the '
  'humans did. Fewer errors overall are distributed onto people who were not previously affected. '
  'What does the comparison miss?',
  'That a group not previously harmed is now harmed, which a total does not show',
  ['Nothing; fewer errors is straightforwardly better',
   'That the humans might improve with training',
   'That the tool error rate will rise over time'],
  'A reduced total can conceal a redistribution, and the people newly affected did not benefit '
  'from the reduction. Comparing rates within each group is what shows it.',
  mode='EDGE',
  hinge='Fewer errors overall are distributed onto people who were not previously affected')

q('GB_AR_041', 'AR_FAM13_HARM_REASONING', 'D5',
  'A service publishes a notice saying its output may be inaccurate and should not be relied on, '
  'then uses that output to answer questions people act on immediately. The notice tells readers '
  'not to rely on output that they have no other means of checking before acting. What does the '
  'notice achieve?',
  'Little for the reader, who has no alternative source at the moment of acting',
  ['It transfers responsibility to the reader entirely',
   'It removes any obligation on the service',
   'Nothing at all, since notices are never read'],
  'The notice is not worthless — it is honest and it sets expectations. It does not give a reader '
  'any way to act differently when there is nothing else to consult.',
  mode='EDGE',
  hinge='The notice tells readers not to rely on output that they have no other means of checking')

# =========================================================================
# AR_FAM14_USE_DECISION — D4 x1, D5 x4
# =========================================================================
q('GB_AR_042', 'AR_FAM14_USE_DECISION', 'D4',
  'A student wants to use a tool to generate practice questions on a topic, then answer them and '
  'check the answers against their textbook. Any wrong question is caught by the textbook check '
  'and nothing depends on the questions being right. Should they?',
  'Yes; a wrong question costs nothing because the textbook is the authority',
  ['No; generated questions may be wrong',
   'No; practice must come from an approved source',
   'Only if a teacher approves each question'],
  'The stakes are low and a check is already in place. Refusing here is the reflex the family '
  'exists to interrupt.',
  evidence='Any wrong question is caught by the textbook check')

q('GB_AR_043', 'AR_FAM14_USE_DECISION', 'D5',
  'A nurse wants to use a tool to summarise drug interactions during a shift, with no time to '
  'check the summaries against a reference. There is no opportunity to check the summary and a '
  'wrong summary affects a patient directly. Should they?',
  'No; nothing can be checked and the cost of an error falls on a patient',
  ['Yes, since summaries save time under pressure',
   'Yes, provided the nurse uses judgement',
   'Yes, if the tool is marketed for medical use'],
  'Both conditions that make use defensible are absent: no check and a serious consequence borne '
  'by someone else. Marketing is not a substitute for either.',
  mode='TRANSFER', hinge='There is no opportunity to check the summary')

q('GB_AR_044', 'AR_FAM14_USE_DECISION', 'D5',
  'A team wants to use a tool to draft replies to customer complaints. Every reply is read and '
  'edited by a trained agent before it is sent. A trained agent reads and edits every reply before '
  'a customer sees it. Should they?',
  'Yes; a reader with the relevant expertise sits between the output and the customer',
  ['No; customer communication is too sensitive',
   'No; the agent will stop reading carefully over time',
   'Only for complaints that are not serious'],
  'Review fatigue is a real risk and an argument for how the review is organised rather than '
  'against the use. The arrangement described has exactly the safeguard that matters.',
  mode='EDGE',
  hinge='A trained agent reads and edits every reply before a customer sees it')

q('GB_AR_045', 'AR_FAM14_USE_DECISION', 'D5',
  'A team can use a tool that saves each analyst two hours a day, at the cost of one wrong figure '
  'in a client report every few months. A wrong figure in a client report is discovered by the '
  'client rather than by the team. What should decide?',
  'What a wrong figure costs in client trust, weighed against the hours saved',
  ['The hours saved, since two hours a day is substantial',
   'The error rate alone, since one error in months is very low',
   'Neither; any error rate above zero rules the tool out'],
  'Neither figure decides alone, and the stem supplies the fact that turns the error into a '
  'reputational cost rather than an internal one. A ruling-out policy would forbid employing '
  'people as well.',
  mode='TRADEOFF',
  hinge='A wrong figure in a client report is discovered by the client rather than by the team')

q('GB_AR_046', 'AR_FAM14_USE_DECISION', 'D5',
  'A team refuses all tool use because one output was once wrong. Since then they have written '
  'everything by hand, and their hand-written documents contain errors at a similar rate. Their '
  'own hand-written work errs at a similar rate to the tool they refused. What does the policy '
  'achieve?',
  'Little; the errors continue at a similar rate and the policy addressed the source rather than '
  'the checking',
  ['A great deal; hand-written work is inherently more reliable',
   'Nothing, and no policy on tool use is ever worth having',
   'A reduction in errors that the team has not yet measured'],
  'The policy targeted where the text came from and the errors were never about that. Checking '
  'before publication would have addressed both.',
  mode='TRADEOFF',
  hinge='Their own hand-written work errs at a similar rate to the tool they refused')

# =========================================================================
# AR_FAM15_POLICY_TRANSFER — D4 x1, D5 x3
# =========================================================================
q('GB_AR_047', 'AR_FAM15_POLICY_TRANSFER', 'D4',
  'A policy reads: "No customer data may be transmitted to services outside the company." A '
  'developer wants to paste an error message containing a customer order number. The order number '
  'is customer data and pasting transmits it outside the company. What does the policy require?',
  'That the order number be removed before the message is pasted',
  ['Nothing, since an error message is not a customer record',
   'Nothing, since one order number is not really data',
   'That the developer obtain the customer permission first'],
  'The policy as quoted turns on what the data is and where it goes, and both conditions are met. '
  'Nothing in it makes an exception for small quantities.',
  evidence='The order number is customer data and pasting transmits it outside the company')

q('GB_AR_048', 'AR_FAM15_POLICY_TRANSFER', 'D5',
  'A policy reads: "Generated text may be used in internal documents provided it is reviewed by '
  'the author." A developer wants to use generated text in a document that will be sent to a '
  'regulator. The policy permits generated text in internal documents and says nothing about '
  'documents sent outside. What does it require?',
  'It does not cover this case, so the question has to be taken to whoever owns the policy',
  ['That the text be used, since the author will review it',
   'That the text not be used, since the policy does not permit it',
   'That the text be used, since a regulator document is a kind of internal document'],
  'Reading silence as permission and reading it as prohibition are both inventing a clause. What '
  'the policy protects — internal circulation with a reviewer — plainly does not extend here.',
  mode='TRANSFER',
  hinge='The policy permits generated text in internal documents and says nothing about documents '
        'sent outside')

q('GB_AR_049', 'AR_FAM15_POLICY_TRANSFER', 'D5',
  'A policy reads: "Any tool that stores your input may not be used with confidential material." A '
  'developer finds a tool that states it does not store input. The policy turns on whether input '
  'is stored, and the tool states that it is not. What does the policy allow?',
  'Use with confidential material, provided the claim about storage can be relied on',
  ['No use with confidential material, since all tools store input',
   'Use with confidential material without further question',
   'No use at all, since the policy names no permitted tools'],
  'The policy sets a condition rather than a blanket ban, and the condition is met by the tool '
  'own account. Whether that account can be relied on is the next question the policy implies.',
  mode='EDGE', hinge='The policy turns on whether input is stored')

q('GB_AR_050', 'AR_FAM15_POLICY_TRANSFER', 'D5',
  'Two policies apply. One permits generated code in internal tools. The other forbids '
  'unreviewed code anywhere in the payment system. A developer wants to use generated code in an '
  'internal tool that writes to the payment system. Both policies apply to this case and one '
  'permits while the other forbids unless reviewed. What follows?',
  'The stricter requirement governs, so the code may be used and must be reviewed',
  ['The permitting policy governs, since the tool is internal',
   'Neither policy governs, since they conflict',
   'The forbidding policy governs, so generated code may not be used at all'],
  'The two are not in conflict once read carefully: one permits and the other attaches a '
  'condition. Satisfying both is possible and is what the case requires.',
  mode='TRANSFER',
  hinge='Both policies apply to this case and one permits while the other forbids unless reviewed')
