# -*- coding: utf-8 -*-
"""
Wave 6 — AI_ML_CONCEPTS, 50 Golden Bank questions, all newly authored.

NO PRODUCT, MODEL OR VERSION IS NAMED ANYWHERE. Every system in every stem is described by how it
was built, and no key would change if the entire market were replaced tomorrow. A question that
rewards knowing which tool is currently best measures how recently a student read the news.

THE RULE-BASED SYSTEM THAT LOOKS INTELLIGENT IS THE PRODUCTIVE STEM and appears throughout. A
spell checker with a word list, a tax calculator, a thermostat: students classify these as learned
because they behave capably, and the correction is that capability says nothing about origin.

TWO FAMILIES DELIBERATELY REWARD SAYING "IT DEPENDS ON THE DATA" AND TWO PUNISH IT. Suitability
and approach choice both contain tasks where a written rule is plainly right, so a student who
answers "use learning" every time scores no better than one who answers at random. The same
applies to accuracy: one stem has a high figure that really is strong evidence.

THE ARITHMETIC IN THE EVALUATION FAMILY IS KEPT TRIVIAL. Ninety-nine out of a hundred, ninety out
of a hundred. What is being measured is whether a student asks how the cases were split, not
whether they can compute a proportion.
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
# AM_FAM01_TERM_SCOPE — D1 x4, D2 x1
# =========================================================================
q('GB_AM_001', 'AM_FAM01_TERM_SCOPE', 'D1',
  'How do the terms artificial intelligence and machine learning relate to each other?',
  'Machine learning is one way of building artificial intelligence',
  ['Artificial intelligence is one way of doing machine learning',
   'The two name the same thing',
   'The two are separate fields with nothing in common'],
  'Machine learning sits inside the wider field, as one approach among several. Rule-based '
  'systems are artificial intelligence too and involve no learning at all.')

q('GB_AM_002', 'AM_FAM01_TERM_SCOPE', 'D1',
  'Where does deep learning sit in relation to machine learning?',
  'Inside it, as one particular approach',
  ['Outside it, as a separate discipline',
   'Above it, containing machine learning as a part',
   'Alongside it, with neither containing the other'],
  'Deep learning is a kind of machine learning, so it is the innermost of the three terms. Plenty '
  'of machine learning uses nothing that would be called deep.')

q('GB_AM_003', 'AM_FAM01_TERM_SCOPE', 'D1',
  'A system is described as artificial intelligence. What follows about how it was built?',
  'Nothing; it may have been written as rules or learned from examples',
  ['That it learned from examples',
   'That it uses deep learning',
   'That it was written as a set of rules'],
  'The term describes what a system does rather than how it was made. Assuming learning from the '
  'label is the commonest error in the topic.')

q('GB_AM_004', 'AM_FAM01_TERM_SCOPE', 'D1',
  'Which ordering places the three terms correctly from widest to narrowest?',
  'Artificial intelligence, machine learning, deep learning',
  ['Deep learning, machine learning, artificial intelligence',
   'Machine learning, artificial intelligence, deep learning',
   'Artificial intelligence, deep learning, machine learning'],
  'Each term names a subset of the one before it. Reversing the order is what happens when the '
  'most recently encountered term is assumed to be the largest.')

q('GB_AM_005', 'AM_FAM01_TERM_SCOPE', 'D2',
  'A student says that because a chess program plays extremely well, it must be using machine '
  'learning. What is wrong with the reasoning?',
  'Playing well says nothing about origin; a program can search possibilities using written '
  'rules and never learn',
  ['Nothing; strong performance does indicate learning',
   'Chess programs are not artificial intelligence at all',
   'Chess programs use deep learning rather than machine learning'],
  'Some chess programs learn and some search using rules written by people, and both play well. '
  'Capability and construction are separate questions.')

# =========================================================================
# AM_FAM02_LEARNED_VS_RULE — D1 x3, D2 x1
# =========================================================================
q('GB_AM_006', 'AM_FAM02_LEARNED_VS_RULE', 'D1',
  'A thermostat switches the heating on whenever the temperature drops below a figure someone '
  'set. Was its behaviour written or learned?',
  'Written, because someone stated the condition',
  ['Learned, because it responds to its surroundings',
   'Learned, because it acts without being told each time',
   'Neither; the behaviour has no origin'],
  'Responding to the world is not the same as having learned from it. Every part of what this '
  'device does was decided by a person in advance.')

q('GB_AM_007', 'AM_FAM02_LEARNED_VS_RULE', 'D1',
  'A system was shown thousands of photographs already marked as cats or dogs, and can now sort '
  'new photographs. Was its behaviour written or learned?',
  'Learned, because it was derived from the marked examples',
  ['Written, because someone chose the categories',
   'Written, because someone assembled the photographs',
   'Neither, since photographs are not instructions'],
  'People supplied the examples and the categories; nobody wrote down what distinguishes a cat '
  'from a dog. That distinction came out of the examples, which is what learning means here.')

q('GB_AM_008', 'AM_FAM02_LEARNED_VS_RULE', 'D1',
  'A spell checker compares each word against a stored list and flags anything absent from it. '
  'Was its behaviour written or learned?',
  'Written, because the check was stated and the list supplied',
  ['Learned, because the list came from real text',
   'Learned, because it improves as words are added',
   'Written for common words and learned for the rest'],
  'The list is data the check consults rather than examples anything generalised from. Adding a '
  'word extends the list and changes no behaviour that was not already there.')

q('GB_AM_009', 'AM_FAM02_LEARNED_VS_RULE', 'D2',
  'Two systems both recommend films. One applies a stated rule that anyone who liked a film is '
  'shown others of the same genre. The other derived its suggestions from what viewers went on to '
  'watch. What separates them?',
  'Where the behaviour came from: one was stated in advance and the other derived from examples',
  ['Nothing; both recommend films and are therefore the same kind of system',
   'The second is artificial intelligence and the first is not',
   'The quality of their recommendations'],
  'Both may recommend well or badly, and that is not the question. One does what somebody wrote '
  'and the other does what its examples supported.')

# =========================================================================
# AM_FAM03_TRAINING_DATA_ROLE — D1 x3, D2 x1
# =========================================================================
q('GB_AM_010', 'AM_FAM03_TRAINING_DATA_ROLE', 'D1',
  'A system was trained on a large collection of examples. What were the examples for?',
  'Deriving behaviour that extends beyond the examples themselves',
  ['Building a store the system searches when a question arrives',
   'Filling a list of answers to give back later',
   'Testing behaviour that had already been written'],
  'The examples shape the system during training and are not consulted afterwards. Treating them '
  'as a store the system looks things up in is the model most students start with.')

q('GB_AM_011', 'AM_FAM03_TRAINING_DATA_ROLE', 'D1',
  'After training is finished, does a system still hold the examples it was trained on?',
  'Not as a collection it can consult; what remains is what was derived from them',
  ['Yes, and it searches them for each new question',
   'Yes, and it returns whichever example is closest',
   'No, and so it can no longer do anything'],
  'What survives training is the derived behaviour rather than the material it came from. That is '
  'why a trained system can answer about cases its examples never contained.')

q('GB_AM_012', 'AM_FAM03_TRAINING_DATA_ROLE', 'D1',
  'A team doubles the number of examples used to train a system. What does this most directly '
  'change?',
  'What the system derives, and therefore how it behaves',
  ['How quickly the system answers a question',
   'How much storage the finished system occupies',
   'Nothing, since behaviour is written separately'],
  'More examples give more to generalise from, so the behaviour that comes out of training '
  'differs. Speed of answering afterwards is a separate matter.')

q('GB_AM_013', 'AM_FAM03_TRAINING_DATA_ROLE', 'D2',
  'A student explains that a trained system works by finding the training example most like the '
  'new input and copying its answer. What is wrong with that account?',
  'It describes a lookup, whereas training derives behaviour that handles inputs unlike any '
  'example',
  ['Nothing; that is exactly how training works',
   'It is right except that the system finds the least similar example',
   'It is right only for systems trained on photographs'],
  'Some methods do work by comparing against stored examples, which is what makes this account '
  'plausible. It is not what training in general produces, and it cannot explain sensible '
  'behaviour on genuinely novel input.')

# =========================================================================
# AM_FAM04_TASK_CLASSIFICATION — D2 x1, D3 x1
# =========================================================================
q('GB_AM_014', 'AM_FAM04_TASK_CLASSIFICATION', 'D2',
  'A task is to decide, for each incoming message, whether it is urgent or routine. What shape of '
  'task is that?',
  'Sorting into named categories',
  ['Predicting a quantity', 'Grouping without any categories named in advance',
   'Ordering the messages by importance'],
  'Two named outcomes with every message going into one of them is sorting into categories. '
  'Nothing numeric is being estimated.')

q('GB_AM_015', 'AM_FAM04_TASK_CLASSIFICATION', 'D3',
  'A task is to estimate how many minutes a delivery will take, given the distance and the time '
  'of day. What shape of task is that?',
  'Predicting a quantity',
  ['Sorting into named categories',
   'Grouping without any categories named in advance',
   'Deciding whether the delivery will be late'],
  'The answer is a number on a continuous scale rather than one of a fixed set of labels. '
  'Deciding whether it will be late would be a different task built on top of this one.')

# =========================================================================
# AM_FAM05_LABEL_PRESENCE — D2 x1, D3 x1
# =========================================================================
q('GB_AM_016', 'AM_FAM05_LABEL_PRESENCE', 'D2',
  'A hospital holds scans with no notes attached, and wants a system that sorts them into healthy '
  'and unhealthy. Does the data already contain the answers?',
  'No; the scans carry no indication of which are which',
  ['Yes, because the scans themselves show the condition',
   'Yes, because the two categories have been named',
   'It cannot be determined from what is stated'],
  'A scan showing a condition is not the same as a record stating it. Somebody would have to go '
  'through and mark them before the answers exist as data.')

q('GB_AM_017', 'AM_FAM05_LABEL_PRESENCE', 'D3',
  'A company keeps a record of every subscription and whether it was eventually cancelled. It '
  'wants to predict which current subscriptions will be cancelled. Does the data already contain '
  'the answers?',
  'Yes; the past cancellations are answers, though nobody created them for this purpose',
  ['No, because nobody set out to record answers',
   'No, because the answers concern current subscriptions rather than past ones',
   'Only if the cancellations were recorded with a reason'],
  'The outcomes were recorded as a by-product of running the business, and that is exactly what '
  'makes them usable. Answers do not have to have been created deliberately to be answers.')

# =========================================================================
# AM_FAM06_SUITABILITY_JUDGEMENT — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_AM_018', 'AM_FAM06_SUITABILITY_JUDGEMENT', 'D2',
  'A system must work out the tax owed on a salary, using published bands that are stated exactly '
  'in law. Which approach fits?',
  'A written rule, since the calculation is already stated precisely',
  ['A learned system, since there is a great deal of salary data',
   'A learned system, so that it improves over time',
   'Either; the two would give the same answers'],
  'Learning would approximate a rule that is already known exactly, and would sometimes get it '
  'wrong. When the rule can be written down, writing it down is both cheaper and correct.')

q('GB_AM_019', 'AM_FAM06_SUITABILITY_JUDGEMENT', 'D3',
  'A system must decide whether a handwritten digit is a three or an eight. Nobody can state a '
  'rule that reliably separates them. Which approach fits?',
  'A learned system, since the distinction cannot be written down but examples are plentiful',
  ['A written rule listing the shapes each digit may take',
   'A written rule based on how much ink each digit uses',
   'Neither; the task cannot be automated'],
  'This is the case learning exists for: the distinction is real, people apply it effortlessly, '
  'and nobody can state it. Attempts to write the rule produce long lists of exceptions.')

q('GB_AM_020', 'AM_FAM06_SUITABILITY_JUDGEMENT', 'D4',
  'A system must decide whether a customer qualifies for a refund. The conditions are set out in '
  'a published policy, and every refusal must be explained to the customer by citing the clause '
  'that applied. The policy states the conditions exactly and every decision must name the clause '
  'it rests on. Which approach fits?',
  'A written rule, because only that can name the clause behind each decision',
  ['A learned system trained on past refund decisions',
   'A learned system, with a written rule used to check it afterwards',
   'A learned system, since past decisions are plentiful'],
  'Past decisions exist and would train something workable, and it could not cite a clause. The '
  'obligation to explain is what settles the choice here rather than what is achievable.',
  evidence='The policy states the conditions exactly and every decision must name the clause it '
           'rests on')

# =========================================================================
# AM_FAM07_PATTERN_FROM_EXAMPLES — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_AM_021', 'AM_FAM07_PATTERN_FROM_EXAMPLES', 'D2',
  'A system is trained on photographs of cats and dogs, all taken indoors. What could it learn to '
  'tell apart?',
  'Cats from dogs, as far as the photographs show the difference',
  ['Indoor from outdoor scenes',
   'Cats from dogs from rabbits',
   'The age of each animal'],
  'A system can only pick up distinctions its examples actually contain. Rabbits never appeared '
  'and every photograph was indoors, so neither distinction is available.')

q('GB_AM_022', 'AM_FAM07_PATTERN_FROM_EXAMPLES', 'D3',
  'A system is trained to sort customer messages using examples written only in English. What can '
  'be said about its handling of messages in other languages?',
  'Nothing was learned about them, since no example contained one',
  ['It will handle them correctly, since the categories are the same',
   'It will refuse to sort them',
   'It will treat every one of them as routine'],
  'The categories being the same does not help, because nothing in training connected those '
  'categories to any other language. What such a system does with them is undetermined rather '
  'than safe.')

q('GB_AM_023', 'AM_FAM07_PATTERN_FROM_EXAMPLES', 'D4',
  'A system is trained to judge job applications, using examples from a company that has only '
  'ever hired graduates of three universities. Every example in the training data comes from those '
  'three universities and no other. What has the system had the opportunity to learn about '
  'applicants from a fourth?',
  'Nothing, because no example gave it anything to generalise from',
  ['That they are unsuitable, since none was ever hired',
   'That they are as suitable as any other applicant',
   'It will decline to judge them'],
  'Absence from the examples is not evidence of unsuitability; it is absence of evidence. The '
  'system will nonetheless produce a confident judgement, which is what makes the gap dangerous '
  'rather than merely limiting.',
  evidence='Every example in the training data comes from those three universities and no other')

# =========================================================================
# AM_FAM08_GENERALISATION — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_AM_024', 'AM_FAM08_GENERALISATION', 'D2',
  'A system sorts photographs of vehicles correctly nine times out of ten on examples like the '
  'ones it was trained on. It is now shown a photograph of a vehicle type that never appeared in '
  'training. What follows?',
  'Its performance on that photograph does not follow from its performance on the others',
  ['It will be right about nine times out of ten on this one too',
   'It will report that it does not recognise the vehicle',
   'It will always be wrong on this one'],
  'A figure measured on one kind of input says nothing about a different kind. The system has no '
  'means of noticing that this input is unlike what it saw.')

q('GB_AM_025', 'AM_FAM08_GENERALISATION', 'D3',
  'A system trained on photographs taken in daylight is given one taken at night. What is the most '
  'likely behaviour?',
  'A confident answer that may well be wrong',
  ['A refusal to answer', 'A warning that the input is unusual',
   'The same accuracy as in daylight'],
  'Nothing in ordinary training teaches a system to recognise unfamiliarity, so it answers as '
  'readily as ever. The confidence is what misleads the person reading the output.')

q('GB_AM_026', 'AM_FAM08_GENERALISATION', 'D4',
  'A fault detector was trained on recordings from one factory and is deployed in a second with '
  'different machinery. It reports no faults for a month, and the team concludes the second '
  'factory is running well. The system was never shown a recording from this factory, so a quiet '
  'month tells you as much about the system as about the machinery. What should be concluded?',
  'Nothing yet; the silence could equally mean the detector is unable to judge this machinery',
  ['That the second factory is running well',
   'That the detector has failed and should be replaced',
   'That the second factory has fewer faults than the first'],
  'Two explanations fit the observation equally, and the report alone cannot separate them. '
  'Deliberately introducing a known fault would.',
  evidence='The system was never shown a recording from this factory')

# =========================================================================
# AM_FAM09_ACCURACY_MEANING — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_AM_027', 'AM_FAM09_ACCURACY_MEANING', 'D2',
  'A system is reported as correct on 90 out of every 100 cases. What else is needed before '
  'judging whether that is good?',
  'How the cases were split between the possible answers',
  ['How long the system takes to answer',
   'How many examples it was trained on',
   'Which method was used to build it'],
  'A figure alone cannot be judged. If ninety of every hundred cases share one answer, always '
  'giving that answer scores the same and is useless.')

q('GB_AM_028', 'AM_FAM09_ACCURACY_MEANING', 'D3',
  'A system detects a condition that occurs in 1 case out of every 100, and is correct 99 times '
  'out of 100. Is that impressive?',
  'Not on its own; always answering that the condition is absent would score the same',
  ['Yes, since 99 out of 100 is close to perfect',
   'Yes, provided the system was trained on enough cases',
   'No, because 99 is never a good score'],
  'The figure matches what a system that detects nothing would achieve, so it carries no evidence '
  'that anything is being detected. What matters is performance on the rare case.')

q('GB_AM_029', 'AM_FAM09_ACCURACY_MEANING', 'D4',
  'A system sorts messages into two categories, and the cases are split evenly between them. It '
  'is correct 90 times out of 100. Because the two categories occur equally often, always naming '
  'one of them would score only 50 out of 100. What does the figure establish?',
  'That the system is doing substantially better than answering without looking',
  ['Nothing, since accuracy figures are never informative',
   'That the system is correct on 90 per cent of each category separately',
   'That the system would score 90 on any data it is given'],
  'An even split makes the baseline 50, so 90 is a genuine improvement on it. It still says '
  'nothing about how the errors are distributed between the two categories.',
  evidence='Because the two categories occur equally often, always naming one of them would '
           'score only 50 out of 100')

# =========================================================================
# AM_FAM10_MODEL_LIMITS — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_AM_030', 'AM_FAM10_MODEL_LIMITS', 'D2',
  'A trained system is asked why it gave the answer it did, and produces a fluent explanation. '
  'What is that explanation?',
  'Another output, which may or may not describe what actually happened',
  ['A record of the steps the system took',
   'A proof that the answer was correct',
   'A summary of the training examples used'],
  'The explanation was produced the same way the answer was, so it carries no special authority. '
  'Nothing in it is a transcript of the system\'s working.')

q('GB_AM_031', 'AM_FAM10_MODEL_LIMITS', 'D3',
  'A regulator requires that every automated decision be traceable to a stated reason. A team '
  'proposes a learned system that scores well. What is the difficulty?',
  'A learned system produces decisions rather than reasons, so tracing one to a stated reason is '
  'not something it can do',
  ['Learned systems are not accurate enough for regulated work',
   'Learned systems cannot be tested',
   'There is no difficulty; the system can be asked to explain each decision'],
  'Asking it to explain produces text, not a reason the decision actually rested on. The '
  'requirement is about the decision procedure rather than about producing an account afterwards.')

q('GB_AM_032', 'AM_FAM10_MODEL_LIMITS', 'D4',
  'A team wants a trained system to tell them which of its inputs mattered most to a particular '
  'decision. Separate techniques exist for estimating that, and the system itself does not record '
  'which inputs it relied on. What is the honest position?',
  'The system cannot supply it directly, though a separate technique can estimate it',
  ['The system can be asked directly and will answer accurately',
   'The information is unobtainable by any means',
   'The information is only obtainable by retraining from scratch'],
  'Neither extreme is right. There is real work on estimating this, and none of it consists of '
  'asking the system and believing what it says.',
  evidence='the system itself does not record which inputs it relied on')

# =========================================================================
# AM_FAM11_DATA_FAULT_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_AM_033', 'AM_FAM11_DATA_FAULT_DIAGNOSIS', 'D3',
  'A speech system works well for most users and poorly for those with a particular regional '
  'accent. Its training recordings came from one city. What is the most likely explanation?',
  'That accent was largely absent from the recordings, so little was learned about it',
  ['The system is not powerful enough for speech',
   'That accent is inherently harder to recognise',
   'The affected users are speaking unclearly'],
  'A gap in the examples becomes a gap in the behaviour. Nothing about the accent itself has been '
  'shown to be harder; it was simply not represented.')

q('GB_AM_034', 'AM_FAM11_DATA_FAULT_DIAGNOSIS', 'D4',
  'A team responds to poor performance on one group by collecting ten times more training data, '
  'drawn from exactly the same source as before. The new data comes from the same source and so '
  'contains the same group in the same small proportion. What will happen?',
  'The gap will remain, because more of the same data does not represent the missing group any '
  'better',
  ['The gap will close, because ten times more data is a substantial increase',
   'The gap will close for large groups and widen for small ones',
   'Performance will fall for every group'],
  'Volume and coverage are different things, and only coverage was ever the problem. Collecting '
  'from a new source, even in smaller quantity, would address it.',
  evidence='The new data comes from the same source and so contains the same group in the same '
           'small proportion')

# =========================================================================
# AM_FAM12_WRONG_SIGNAL_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_AM_035', 'AM_FAM12_WRONG_SIGNAL_DIAGNOSIS', 'D3',
  'A system trained to spot diseased leaves scores almost perfectly in testing and fails in the '
  'field. Every diseased leaf in the training set was photographed against a blue background and '
  'every healthy one against a white background. What did it most likely learn?',
  'To tell the backgrounds apart rather than the leaves',
  ['To recognise disease, with the field conditions being harder',
   'To recognise leaf shape rather than colour',
   'Nothing at all, since it fails in the field'],
  'The backgrounds separate the two categories perfectly and are far easier to detect than the '
  'disease. A system uses whatever distinguishes its examples, and this distinguished them '
  'completely.')

q('GB_AM_036', 'AM_FAM12_WRONG_SIGNAL_DIAGNOSIS', 'D4',
  'A system predicting which patients need urgent care performs well in testing and badly in use. '
  'In the training records, urgent cases had almost always already been given a particular drug, '
  'and that drug appears among the inputs. The drug is recorded because the case was urgent, so '
  'it is a consequence of urgency rather than a sign of it. What went wrong?',
  'The system used a field that only becomes available after the decision it is meant to make',
  ['The training data was too small',
   'The drug is a genuine early indicator and the system was right',
   'The system was tested on the wrong patients'],
  'In testing, that field is present and the system looks excellent. At the moment a real '
  'prediction is needed, it has not been recorded yet, so the signal the system relied on is '
  'simply missing.',
  evidence='The drug is recorded because the case was urgent, so it is a consequence of urgency '
           'rather than a sign of it')

# =========================================================================
# AM_FAM13_EVALUATION_REASONING — D3 x1, D4 x1, D5 x3
# =========================================================================
q('GB_AM_037', 'AM_FAM13_EVALUATION_REASONING', 'D3',
  'A system is measured on the same examples it was trained on and scores perfectly. What does '
  'that establish?',
  'That it reproduces those examples; nothing about examples it has not seen',
  ['That it will perform perfectly in use',
   'That it was trained for long enough',
   'That the examples were of high quality'],
  'Reproducing what it was shown is the least demanding thing a trained system can do. The '
  'question worth asking is about inputs held back from training.')

q('GB_AM_038', 'AM_FAM13_EVALUATION_REASONING', 'D4',
  'A team splits its data, trains on one part and measures on the other, and reports a strong '
  'score. They then adjust the system repeatedly, measuring on that same held-back part each '
  'time and keeping whatever scores best. The held-back part guided the adjustments and so is no '
  'longer material the system has never been exposed to. What is wrong with the reported score?',
  'The held-back part has effectively become part of the training, so the score is optimistic',
  ['Nothing; splitting the data was done correctly',
   'The split should have been made in the other proportion',
   'The score is too low rather than too high'],
  'The split was right and what followed undid it. Choosing among many variants by one measurement '
  'fits the system to that measurement, which is why a third, untouched portion is kept back.',
  evidence='The held-back part guided the adjustments and so is no longer material the system has '
           'never been exposed to')

q('GB_AM_039', 'AM_FAM13_EVALUATION_REASONING', 'D5',
  'A system is measured on data collected six months after its training data, and scores well. A '
  'colleague objects that the measurement is invalid because the data is from a different period. '
  'Being measured on later data is closer to how the system will actually be used than being '
  'measured on data from the same period. Is the objection sound?',
  'No; measuring on later data is a stronger test rather than a weaker one',
  ['Yes; the two periods must match for the measurement to be valid',
   'Yes, unless the system is retrained on the later data first',
   'No, but only if nothing changed between the two periods'],
  'The worry behind the objection is real for training data and inverted here. A system that '
  'holds up on later data has demonstrated something a same-period measurement cannot.',
  mode='EDGE',
  hinge='Being measured on later data is closer to how the system will actually be used')

q('GB_AM_040', 'AM_FAM13_EVALUATION_REASONING', 'D5',
  'A team must compare two systems for spotting fraud. Fraud occurs in about one transaction in a '
  'thousand. Proportion correct will be about the same for both systems and for a system that '
  'declares every transaction genuine. What should they measure instead?',
  'How the systems perform on the fraudulent cases specifically',
  ['Proportion correct, measured over more transactions',
   'How quickly each system reaches a decision',
   'How many transactions each was trained on'],
  'With a rarity like this, the overall figure is dominated by the common case and cannot '
  'separate anything. Only performance on the rare cases distinguishes a useful system from an '
  'inert one.',
  mode='TRANSFER',
  hinge='Proportion correct will be about the same for both systems and for a system that '
        'declares every transaction genuine')

q('GB_AM_041', 'AM_FAM13_EVALUATION_REASONING', 'D5',
  'A system is measured on data held back properly and scores 85 out of 100. In use it scores 60. '
  'The held-back data was drawn from the same collection as the training data, while the data met '
  'in use was not. What best explains the drop?',
  'The held-back data resembled the training data more closely than real use does',
  ['The measurement was carried out incorrectly',
   'The system degraded after being deployed',
   'The system was trained for too long'],
  'Holding data back protects against measuring on what was trained on, and not against the whole '
  'collection differing from the world. That is a separate and commoner gap.',
  mode='EDGE',
  hinge='The held-back data was drawn from the same collection as the training data, while the '
        'data met in use was not')

# =========================================================================
# AM_FAM14_APPROACH_CHOICE — D4 x1, D5 x4
# =========================================================================
q('GB_AM_042', 'AM_FAM14_APPROACH_CHOICE', 'D4',
  'A system must flag transactions that break a compliance rule. The rule is published, exact, '
  'and changes twice a year, and every flag must be justified by citing the rule. The rule is '
  'stated exactly and each flag must cite it, while learning would approximate it and could cite '
  'nothing. Which approach fits?',
  'A written rule, updated when the rule changes',
  ['A learned system trained on past flagged transactions',
   'A learned system, retrained twice a year when the rule changes',
   'A learned system for the common cases and a rule for the rest'],
  'Changing twice a year is an argument for something easy to edit, not for retraining. Learning '
  'here would be an approximation of something already known exactly.',
  evidence='The rule is stated exactly and each flag must cite it')

q('GB_AM_043', 'AM_FAM14_APPROACH_CHOICE', 'D5',
  'A team must build a system to spot defective parts from photographs. Inspectors can identify a '
  'defect instantly and cannot say what they are looking at. Twenty thousand photographs already '
  'marked by inspectors are available. Which approach fits?',
  'A learned system, since the distinction is real, unstatable, and richly exemplified',
  ['A written rule, developed by interviewing the inspectors at length',
   'A written rule based on the size of any mark on the part',
   'Neither; the inspectors should continue to do it by hand'],
  'Every condition for learning is met: the judgement exists, nobody can state it, and the marked '
  'examples are plentiful. Interviewing to extract a rule is exactly what fails when the '
  'expertise is not available in words.',
  mode='TRANSFER',
  hinge='Inspectors can identify a defect instantly and cannot say what they are looking at')

q('GB_AM_044', 'AM_FAM14_APPROACH_CHOICE', 'D5',
  'A learned system would score better than a written rule on a task, and any error affects '
  'whether a person receives a benefit they are entitled to, with an appeal process that requires '
  'the reason for each decision. Being more often right does not help an appeal that has to be '
  'answered with a reason. What should be built?',
  'The written rule, because the appeal process needs a reason and accuracy cannot supply one',
  ['The learned system, because it is right more often',
   'The learned system, with a person reviewing every decision',
   'The learned system, with reasons generated for each decision afterwards'],
  'Generating a reason afterwards produces text that did not drive the decision, which is worse '
  'than no reason because it looks like one. Human review of every decision removes the benefit '
  'of automating at all.',
  mode='TRADEOFF',
  hinge='Being more often right does not help an appeal that has to be answered with a reason')

q('GB_AM_045', 'AM_FAM14_APPROACH_CHOICE', 'D5',
  'A task has a rule that is known exactly but has around four hundred clauses interacting in '
  'complicated ways. A team proposes learning it from examples instead. Learning would approximate '
  'a rule that is already known exactly, so any disagreement between them is the learned system '
  'being wrong. What follows?',
  'The rule should still be written, since every disagreement would be an error introduced for '
  'convenience',
  ['Learning is appropriate, since four hundred clauses are too many to write',
   'Learning is appropriate, provided the examples come from the rule itself',
   'Neither approach can work at this scale'],
  'Complexity is an argument for care in implementing the rule and never for guessing at it. '
  'Generating examples from the rule to train something less accurate than the rule is effort '
  'spent to become wrong.',
  mode='EDGE',
  hinge='Learning would approximate a rule that is already known exactly')

q('GB_AM_046', 'AM_FAM14_APPROACH_CHOICE', 'D5',
  'Two teams disagree. One proposes a learned system that is right 94 times in 100 and cannot '
  'say why. The other proposes a written rule that is right 88 times in 100 and states its reason '
  'every time. The task is suggesting which article a reader might enjoy next, and a wrong '
  'suggestion costs a reader a few seconds. Which fits?',
  'The learned system, because nothing here needs a reason and the errors are cheap',
  ['The written rule, because a stated reason is always preferable',
   'The written rule, because 88 and 94 are close enough to be equivalent',
   'Neither; readers should choose their own articles'],
  'The same trade decided the other way in a benefits decision, and the difference is what an '
  'error costs. Preferring explanations regardless of stakes is a rule that ignores the '
  'question.',
  mode='TRADEOFF', hinge='a wrong suggestion costs a reader a few seconds')

# =========================================================================
# AM_FAM15_UNFAMILIAR_SYSTEM_TRANSFER — D4 x1, D5 x3
# =========================================================================
q('GB_AM_047', 'AM_FAM15_UNFAMILIAR_SYSTEM_TRANSFER', 'D4',
  'A tool is described as deriving its behaviour from a collection of past cases, with no '
  'conditions written by hand. It behaves oddly on a case unlike anything in that collection. The '
  'tool derived everything it does from the collection and nothing was written by hand. What '
  'accounts for the odd behaviour?',
  'The collection contained nothing resembling this case, so nothing determined the behaviour',
  ['A mistake in the conditions somebody wrote',
   'The tool has begun to learn from the cases it is now meeting',
   'The tool is refusing to handle the case'],
  'With nothing written by hand there are no conditions to contain a mistake. The behaviour on an '
  'unrepresented case was never determined by anything.',
  evidence='The tool derived everything it does from the collection and nothing was written by '
           'hand')

q('GB_AM_048', 'AM_FAM15_UNFAMILIAR_SYSTEM_TRANSFER', 'D5',
  'A supplier describes a product as improving continuously through use. A buyer asks what that '
  'means. The description does not say whether behaviour changes on the buyer machine or whether '
  'updated versions are supplied periodically. Which question would settle it?',
  'Whether the behaviour changes between updates, or only when a new version is installed',
  ['How many examples the product was originally built from',
   'Whether the product uses deep learning',
   'How accurate the product is at present'],
  'Two very different arrangements are consistent with the phrase, and they differ in whether the '
  'buyer can reproduce yesterday behaviour. The other questions are reasonable and do not '
  'distinguish the two.',
  mode='TRANSFER',
  hinge='whether behaviour changes on the buyer machine or whether updated versions are supplied '
        'periodically')

q('GB_AM_049', 'AM_FAM15_UNFAMILIAR_SYSTEM_TRANSFER', 'D5',
  'A system is described as combining written conditions with a learned component: the conditions '
  'decide the common cases and anything they do not cover is passed to the learned part. A '
  'decision must be explained. The conditions can be cited and the learned part cannot, and which '
  'of the two handled a given case is recorded. What follows?',
  'Decisions handled by the conditions can be explained and the rest cannot, and the record says '
  'which is which',
  ['No decision can be explained, since part of the system is learned',
   'Every decision can be explained, since part of the system is written',
   'The system should be replaced by one or the other'],
  'A mixed system gives a mixed answer, and the record is what makes that answer usable. Treating '
  'it as wholly one or the other discards information that is already being kept.',
  mode='EDGE',
  hinge='The conditions can be cited and the learned part cannot, and which of the two handled a '
        'given case is recorded')

q('GB_AM_050', 'AM_FAM15_UNFAMILIAR_SYSTEM_TRANSFER', 'D5',
  'A product claims to need no training data because it works out of the box. A team must judge '
  'the claim. Behaviour that was not derived on the buyer premises was derived somewhere by '
  'somebody, or else written by hand. What does the claim actually tell them?',
  'Only that they need supply no data; the behaviour still came from somewhere and that origin '
  'matters',
  ['That the product uses written conditions rather than learning',
   'That the product will work equally well on any data',
   'That the product cannot be evaluated'],
  'Requiring no data from the buyer is a statement about the buyer effort, not about how the '
  'product was built. Whether it was trained on material resembling this buyer situation remains '
  'the question worth asking.',
  mode='TRANSFER',
  hinge='Behaviour that was not derived on the buyer premises was derived somewhere by somebody')
