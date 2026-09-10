# -*- coding: utf-8 -*-
"""
Wave 6 — GENERATIVE_AI_LLM, 50 Golden Bank questions, all newly authored.

EVERY ANSWER FOLLOWS FROM THE MECHANISM RATHER THAN FROM A PRODUCT. No vendor, model or version
appears anywhere, and no key would change if every current system were withdrawn. What is measured
is that text is handled in pieces, that only the context is visible, that training happened before
use, that output is built one piece at a time, and that how well an answer is written carries no
evidence about whether it is true.

THE MIRRORED ERROR IS ASKED ABOUT AS OFTEN AS THE OBVIOUS ONE. A student who has learned to
distrust confident answers and to trust hedged ones has swapped one bad heuristic for another, so
the confidence family contains a hedged answer that is correct and a confident one that is wrong,
and neither manner is ever evidence.

IMPROVING WITHIN A CONVERSATION IS REAL AND IS NOT LEARNING. It is the single most common belief
students hold, and correcting it by denying the improvement would be worse than leaving it alone.
Several stems therefore show a model genuinely getting better across an exchange, and the
measurement is whether the student attributes it to the context rather than to training.

PRODUCT FEATURES ARE STATED IN THE STEM WHEN THEY MATTER. Whether a memory feature is present
changes the right answer about persistence, so every stem in that family says. A question whose
answer depends on an unstated product decision has no defensible key.
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
# GA_FAM01_TOKEN_RECOGNITION — D1 x4, D2 x1
# =========================================================================
q('GB_GA_001', 'GA_FAM01_TOKEN_RECOGNITION', 'D1',
  'A language model is described as processing text in units. What are those units usually like?',
  'Pieces often smaller than a word',
  ['Individual characters', 'Whole words only', 'Complete sentences'],
  'The units are commonly fragments — a common word may be one piece while an unusual one is '
  'split into several. Characters and whole words are the two natural guesses and neither is how '
  'these systems work.')

q('GB_GA_002', 'GA_FAM01_TOKEN_RECOGNITION', 'D1',
  'A common short word and a long unusual one are given to a model. What can be said about how '
  'many pieces each becomes?',
  'The unusual one is likely to become more pieces than the common one',
  ['Both become one piece each, since both are words',
   'Both become the same number of pieces, since length is what matters',
   'The common one becomes more pieces, since it appears more often'],
  'Frequent words tend to be single pieces and rare ones get broken up. That is why length in '
  'letters is a poor guide to how much of a system limit a passage consumes.')

q('GB_GA_003', 'GA_FAM01_TOKEN_RECOGNITION', 'D1',
  'A limit on how much a model can handle at once is quoted in units rather than in words. Why '
  'does that matter to someone estimating whether a document fits?',
  'Because the count of units does not follow directly from the count of words',
  ['Because units are always larger than words',
   'Because the limit changes as the document is read',
   'It does not matter; the two counts are interchangeable'],
  'A passage of unusual terms uses more units than an equally long passage of ordinary prose. '
  'Estimating from word count alone can be some way out in either direction.')

q('GB_GA_004', 'GA_FAM01_TOKEN_RECOGNITION', 'D1',
  'Does the way text is broken into units affect what a model can do with it?',
  'Yes; the units are what the model works with, so the division is part of the mechanism',
  ['No; the division is only a matter of storage',
   'No; the model reconstructs the original text before working on it',
   'Only for text that is not in English'],
  'Everything the model does happens over these pieces. That is why tasks about individual '
  'letters, such as counting them in a word, are harder than they look.')

q('GB_GA_005', 'GA_FAM01_TOKEN_RECOGNITION', 'D2',
  'A model is asked how many times a particular letter appears in a long word, and gets it wrong. '
  'What does the mechanism suggest about why?',
  'The word may have arrived as one or two pieces rather than as separate letters',
  ['The model cannot count at all',
   'The model was not trained on that word',
   'The model refuses questions about spelling'],
  'Individual letters are not what the system works with, so a question about them asks it to '
  'reason about something below the level it operates on. It answers anyway, which is why the '
  'error is confident.')

# =========================================================================
# GA_FAM02_CONTEXT_CONTENT — D1 x3, D2 x1
# =========================================================================
q('GB_GA_006', 'GA_FAM02_CONTEXT_CONTENT', 'D1',
  'A user asks a model about a file open on their computer, without pasting any of it. What can '
  'the model see?',
  'Only the text of the question itself',
  ['The open file, since it is on the same machine',
   'Every file the user has recently opened',
   'The file name but not its contents'],
  'A model responds to the text in front of it and has no access to the machine. Nothing about '
  'the file reached it.')

q('GB_GA_007', 'GA_FAM02_CONTEXT_CONTENT', 'D1',
  'A user had a conversation yesterday in a separate session. Today, with no memory feature '
  'enabled, they refer to it. What can the model see?',
  'Only what is in front of it today',
  ['Yesterday conversation, since it was with the same user',
   'A summary of yesterday conversation',
   'Every conversation the model has ever had'],
  'Each session presents its own text and nothing else. Whether a product adds a memory feature '
  'on top is a separate decision, and this one has not.')

q('GB_GA_008', 'GA_FAM02_CONTEXT_CONTENT', 'D1',
  'Within a single conversation, what does a model have available when answering the fifth '
  'question?',
  'The earlier questions and answers, as far as they still fit',
  ['Only the fifth question',
   'Only the first question and the fifth',
   'The fifth question and a summary of the rest'],
  'The exchange so far is presented to the model each time, which is why it can refer back. That '
  'availability lasts only while the material still fits.')

q('GB_GA_009', 'GA_FAM02_CONTEXT_CONTENT', 'D2',
  'A user pastes a document into the conversation and asks a question about it. Later in the same '
  'conversation the model answers about the document accurately. What accounts for that?',
  'The document is in front of the model, because it was pasted in',
  ['The model retrieved the document from where it is stored',
   'The model memorised the document during training',
   'The model was updated with the document'],
  'Pasting it put it into what the model can see. Nothing was stored, retrieved or learned; the '
  'text is simply present.')

# =========================================================================
# GA_FAM03_TRAINING_VS_USE — D1 x3, D2 x1
# =========================================================================
q('GB_GA_010', 'GA_FAM03_TRAINING_VS_USE', 'D1',
  'A user corrects a model, which then gives a better answer. Has the model been trained by the '
  'correction?',
  'No; the correction is now part of what it can see, which is a different thing',
  ['Yes; that is what training means',
   'Yes, but only for this user',
   'No, and the improved answer must be a coincidence'],
  'The improvement is real and its cause is the context rather than training. The correction '
  'sits in front of the model exactly as any other text does.')

q('GB_GA_011', 'GA_FAM03_TRAINING_VS_USE', 'D1',
  'Which of these is training rather than use?',
  'Adjusting the model from a large body of text before anybody could ask it anything',
  ['Answering a question',
   'Reading a document that has been pasted in',
   'Producing a different answer when asked twice'],
  'Training is the process that produced the model and happened before any of the others. '
  'Everything else on the list happens to a model that already exists.')

q('GB_GA_012', 'GA_FAM03_TRAINING_VS_USE', 'D1',
  'A user tells a model a fact it did not previously state correctly. Does another user benefit?',
  'No; nothing outside this conversation has changed',
  ['Yes, once the model has processed the correction',
   'Yes, but only for users asking the same question',
   'Only if several users make the same correction'],
  'The correction affects the text of this conversation and nothing else. A change reaching '
  'other users would require the model itself to be rebuilt.')

q('GB_GA_013', 'GA_FAM03_TRAINING_VS_USE', 'D2',
  'Over a long conversation a model gets steadily better at matching a user preferred style. A '
  'student says it has been learning. What is the accurate account?',
  'The examples of the preferred style are accumulating in front of it, which is not learning',
  ['It has been learning, and the improvement proves it',
   'It has not improved; the user has adjusted to its style',
   'It has been learning, but only temporarily'],
  'Denying the improvement would be wrong — it is real and observable. What produces it is the '
  'growing body of examples in the conversation, all of which vanish when the conversation does.')

# =========================================================================
# GA_FAM04_GENERATION_ORDER — D2 x1, D3 x1
# =========================================================================
q('GB_GA_014', 'GA_FAM04_GENERATION_ORDER', 'D2',
  'A model produces a long answer. In what order was it constructed?',
  'A piece at a time, each chosen given everything written so far',
  ['Planned in full, then written out',
   'Retrieved whole from a store of prepared answers',
   'Written from the conclusion backwards'],
  'Each piece is chosen in turn with everything before it available. There is no separate '
  'planning stage that settles the conclusion first.')

q('GB_GA_015', 'GA_FAM04_GENERATION_ORDER', 'D3',
  'A model begins an answer with a firm statement and then produces reasoning that does not '
  'support it. What does the manner of production explain about this?',
  'The statement was produced before any of the reasoning existed, so nothing constrained it to '
  'follow',
  ['The reasoning was produced first and then contradicted',
   'The model changed its mind partway through',
   'The reasoning must in fact support the statement'],
  'Committing to an answer before working is a direct consequence of building the text in order. '
  'Asking for the reasoning before the conclusion is the ordinary remedy.')

# =========================================================================
# GA_FAM05_VARIABILITY_SOURCE — D2 x1, D3 x1
# =========================================================================
q('GB_GA_016', 'GA_FAM05_VARIABILITY_SOURCE', 'D2',
  'The same question is asked twice and produces two differently worded answers. What accounts '
  'for the difference?',
  'The next piece is selected from several possibilities rather than fixed',
  ['The model was updated between the two questions',
   'The question was not in fact identical',
   'One of the two answers is necessarily wrong'],
  'Selection among candidates is what makes repeated answers differ. Two different wordings can '
  'both be correct, and can both be wrong.')

q('GB_GA_017', 'GA_FAM05_VARIABILITY_SOURCE', 'D3',
  'A team runs the same prompt ten times and gets ten different answers, of which eight agree in '
  'substance and two do not. What does the disagreement indicate?',
  'That the question is one where the selection can land in genuinely different places',
  ['That the model was retrained during the ten runs',
   'That the eight agreeing answers are correct',
   'That the model is faulty and should be replaced'],
  'Agreement among repetitions is evidence about stability rather than about truth: eight answers '
  'can agree and be wrong. What it does show is that this question is not being answered '
  'reliably.')

# =========================================================================
# GA_FAM06_CONTEXT_LIMIT_EFFECT — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_GA_018', 'GA_FAM06_CONTEXT_LIMIT_EFFECT', 'D2',
  'A conversation grows long enough to exceed what the model can hold at once. What happens to '
  'the earliest part?',
  'It stops being visible to the model',
  ['It is summarised and kept', 'It is stored and retrieved when relevant',
   'The conversation refuses to continue'],
  'Once the material no longer fits, the earliest part is no longer in front of the model. Some '
  'products summarise as a separate feature; the mechanism itself does not.')

q('GB_GA_019', 'GA_FAM06_CONTEXT_LIMIT_EFFECT', 'D3',
  'A very long conversation loses its earliest exchanges. Is the user told?',
  'Not by the mechanism; the model simply stops having that material',
  ['Yes, the model announces what it has lost',
   'Yes, the conversation is marked as truncated',
   'No, but the model will say so if asked'],
  'Nothing about the loss is visible from the answers, which is what makes it confusing. Asking '
  'the model produces a guess, since it cannot see what is absent.')

q('GB_GA_020', 'GA_FAM06_CONTEXT_LIMIT_EFFECT', 'D4',
  'A user pastes a very long document and asks a question. The answer discusses the later part of '
  'the document accurately and misdescribes the beginning. The document exceeded what the model '
  'can hold, so the earliest material fell out while the most recent remained. What explains the '
  'pattern?',
  'The beginning is no longer in front of the model, while the end still is',
  ['The model reads documents from the end backwards',
   'The beginning of the document was badly written',
   'The model attends less carefully to the start of anything'],
  'The pattern follows the mechanism exactly: what falls out is the oldest material. Splitting '
  'the document and asking about each part separately is the ordinary remedy.',
  evidence='The document exceeded what the model can hold, so the earliest material fell out '
           'while the most recent remained')

# =========================================================================
# GA_FAM07_PERSISTENCE_REASONING — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_GA_021', 'GA_FAM07_PERSISTENCE_REASONING', 'D2',
  'A user establishes a preferred output format in one conversation. No memory feature is '
  'enabled. Is it in force in a new conversation tomorrow?',
  'No; it was held in that conversation and is gone with it',
  ['Yes, because the model has adapted to this user',
   'Yes, for a limited period',
   'Only if the same question is asked'],
  'What was established lived in the text of that conversation. A new conversation begins with '
  'nothing but what is put into it.')

q('GB_GA_022', 'GA_FAM07_PERSISTENCE_REASONING', 'D3',
  'A product offers a memory feature that records stated preferences across conversations. A user '
  'has it enabled and states a preference. Is it in force tomorrow?',
  'Yes, because the feature places it into the new conversation',
  ['No, because a conversation cannot affect another one',
   'Yes, because the model has been trained on the preference',
   'Only within the same day'],
  'The feature works by putting the preference in front of the model again rather than by '
  'changing the model. The effect is real and the mechanism is still the context.')

q('GB_GA_023', 'GA_FAM07_PERSISTENCE_REASONING', 'D4',
  'A user tells a model about a mistake in its answer, and the next day the same mistake appears '
  'in another user conversation. No memory feature is enabled for either user. Nothing said in a '
  'conversation alters the model itself, and each conversation begins with only what is put into '
  'it. What does this show?',
  'Nothing surprising; a correction in one conversation was never going to affect another',
  ['That the model has forgotten the correction',
   'That the correction was rejected by the model',
   'That the two users are being served by different models'],
  'The expectation is what is at fault rather than the system. Getting a correction to persist '
  'requires either a feature that reinserts it or a change to the model, and neither happened.',
  evidence='Nothing said in a conversation alters the model itself')

# =========================================================================
# GA_FAM08_KNOWLEDGE_LIMIT — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_GA_024', 'GA_FAM08_KNOWLEDGE_LIMIT', 'D2',
  'A model is asked about an event that happened last week. Its training finished a year ago and '
  'nothing about the event has been supplied. What can it know?',
  'Nothing about the event, though it may still produce an answer',
  ['The event, since models are updated continuously',
   'The event, if it was widely reported',
   'Nothing, and it will say so'],
  'The event is outside everything the model was built from. Producing an answer anyway is the '
  'usual behaviour, and that answer has no source.')

q('GB_GA_025', 'GA_FAM08_KNOWLEDGE_LIMIT', 'D3',
  'A user pastes a news report from last week and asks the model to summarise it. Training '
  'finished a year ago. Can it answer?',
  'Yes, because the material is now in front of it',
  ['No, because the event postdates its training',
   'Only partially, since it lacks background',
   'Yes, but the summary will be a year out of date'],
  'Supplying the material removes the limitation entirely for this question. The limit is about '
  'what the model knows unprompted, not about what it can work with.')

q('GB_GA_026', 'GA_FAM08_KNOWLEDGE_LIMIT', 'D4',
  'A model is asked for the current version number of a widely used tool and gives one '
  'confidently. Its training finished some time ago and nothing current was supplied. The answer '
  'concerns something that changes frequently and no current information was placed in front of '
  'the model. What is the status of that answer?',
  'It reports what was true when training finished, at best, and cannot be current',
  ['It is current, since version numbers are well documented',
   'It is a fabrication with no basis at all',
   'It is correct if stated confidently'],
  'This is the class of question where being out of date is near certain rather than possible. '
  'Distinguishing it from an invented answer matters, because the remedy differs.',
  evidence='The answer concerns something that changes frequently and no current information was '
           'placed in front of the model')

# =========================================================================
# GA_FAM09_CONFIDENCE_VS_CORRECTNESS — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_GA_027', 'GA_FAM09_CONFIDENCE_VS_CORRECTNESS', 'D2',
  'A model gives an answer in a confident tone with no hedging. What does the tone establish '
  'about accuracy?',
  'Nothing at all',
  ['That the answer is likely correct',
   'That the model checked the answer',
   'That the answer came from training rather than invention'],
  'Tone and content are produced by the same process, so one carries no evidence about the '
  'other. A fabricated answer is typically delivered exactly as confidently as a correct one.')

q('GB_GA_028', 'GA_FAM09_CONFIDENCE_VS_CORRECTNESS', 'D3',
  'A model hedges an answer heavily, saying it may not be reliable. A user concludes the answer '
  'is probably wrong. Is that a sound conclusion?',
  'No; hedging is no more evidence than confidence is',
  ['Yes; hedging indicates the model is uncertain',
   'Yes, unless the question was very simple',
   'No, because hedged answers are usually correct'],
  'Reading hedging as evidence is the same error as reading confidence as evidence, with the sign '
  'flipped. Neither manner reports anything about the content.')

q('GB_GA_029', 'GA_FAM09_CONFIDENCE_VS_CORRECTNESS', 'D4',
  'Two answers to the same question are compared. One is confident and detailed, giving names and '
  'dates. The other is brief and hedged. Detail and confidence are produced by the same process '
  'that produces the content, so neither is evidence about accuracy. Which should be trusted more?',
  'Neither; the manner of an answer carries no information about its accuracy',
  ['The confident detailed one, since detail suggests knowledge',
   'The hedged one, since hedging suggests honesty',
   'The confident one, unless the topic is unusual'],
  'Detail is precisely what fabrication supplies, and hedging is a style rather than a '
  'measurement. Both answers have to be checked the same way.',
  evidence='Detail and confidence are produced by the same process that produces the content')

# =========================================================================
# GA_FAM10_VARIABILITY_CONTROL — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_GA_030', 'GA_FAM10_VARIABILITY_CONTROL', 'D2',
  'A setting controls how freely the next piece is chosen. A team needs the same prompt to give '
  'the same answer as often as possible. Which way should it move?',
  'Towards choosing the most likely piece each time',
  ['Towards choosing more freely among candidates',
   'It makes no difference to repeatability',
   'Towards the middle of its range'],
  'Constraining the selection makes repeated runs agree more often. It says nothing about whether '
  'the repeated answer is right.')

q('GB_GA_031', 'GA_FAM10_VARIABILITY_CONTROL', 'D3',
  'A team constrains the selection as tightly as the setting allows, and the model still gives a '
  'wrong answer. What has the setting achieved?',
  'More consistent answers, which was never the same as more correct ones',
  ['Nothing, since the setting does not work',
   'A more correct answer that has been misjudged',
   'A reduction in the length of the answer'],
  'Repeatability and accuracy are separate properties. A tightly constrained system gives the '
  'same wrong answer every time, which is at least easier to notice.')

q('GB_GA_032', 'GA_FAM10_VARIABILITY_CONTROL', 'D4',
  'A team is generating alternative headlines and wants genuine variety, then separately wants a '
  'classification task to give the same answer every run. One task rewards variety among '
  'candidates and the other rewards the same choice being made every time. What should they do?',
  'Loosen the selection for the headlines and constrain it for the classification',
  ['Constrain the selection for both tasks',
   'Loosen the selection for both tasks',
   'Use the same setting for both, since the model is the same'],
  'The setting is chosen per task rather than per model, because the two tasks want opposite '
  'things from it. Constraining both would produce near-identical headlines.',
  evidence='One task rewards variety among candidates and the other rewards the same choice being '
           'made every time')

# =========================================================================
# GA_FAM11_CONTEXT_LOSS_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_GA_033', 'GA_FAM11_CONTEXT_LOSS_DIAGNOSIS', 'D3',
  'Early in a long conversation a user asks for all answers in bullet points, and the model '
  'complies for some time. Much later it returns to prose. What is the likely cause?',
  'The instruction is no longer in front of the model',
  ['The model has decided prose is more suitable',
   'The model misunderstood the instruction',
   'The model is refusing the instruction'],
  'The instruction was obeyed for a long stretch, which rules out misunderstanding. What changed '
  'is that the conversation grew past what fits.')

q('GB_GA_034', 'GA_FAM11_CONTEXT_LOSS_DIAGNOSIS', 'D4',
  'A model follows a detailed specification for thirty exchanges and then begins ignoring parts '
  'of it, starting with the parts stated earliest. The specification was obeyed for thirty '
  'exchanges and the parts now ignored are the ones stated earliest. What is happening?',
  'The earliest part of the specification has fallen out of what the model can see',
  ['The model has grown less capable during the conversation',
   'The specification contains a contradiction that has surfaced',
   'The later parts of the specification overrode the earlier ones'],
  'That the failures follow the order in which the specification was stated is the signature. '
  'Restating the specification, or moving it to the most recent message, restores the behaviour.',
  evidence='The specification was obeyed for thirty exchanges and the parts now ignored are the '
           'ones stated earliest')

# =========================================================================
# GA_FAM12_STALE_ANSWER_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_GA_035', 'GA_FAM12_STALE_ANSWER_DIAGNOSIS', 'D3',
  'A model states that a particular library function takes two arguments. It took two arguments '
  'until a release last year, and now takes three. What kind of wrong answer is this?',
  'Out of date rather than invented, since it was true when training finished',
  ['Invented, since the answer is wrong',
   'Correct, since the function did once take two',
   'Neither; the model has misread the question'],
  'The answer has a real source and that source has been superseded. The remedy is supplying '
  'current documentation, which would do nothing for a fabricated answer.')

q('GB_GA_036', 'GA_FAM12_STALE_ANSWER_DIAGNOSIS', 'D4',
  'A model names a library function that does not appear in any version of the library, past or '
  'present. A colleague suggests the answer is merely out of date. Nothing in the library history '
  'ever contained a function of that name, so there is no earlier version in which the answer was '
  'true. Which is it?',
  'Invented, since no version of the library ever had it',
  ['Out of date, since libraries change frequently',
   'Out of date, since the model training finished some time ago',
   'Correct, and the library documentation is incomplete'],
  'Being out of date requires a moment at which the answer was true, and there was none. The '
  'name is plausible because plausible naming is what generation produces.',
  evidence='Nothing in the library history ever contained a function of that name')

# =========================================================================
# GA_FAM13_CAPABILITY_REASONING — D3 x1, D4 x1, D5 x3
# =========================================================================
q('GB_GA_037', 'GA_FAM13_CAPABILITY_REASONING', 'D3',
  'A team wants a model to guarantee that a figure it reports matches a figure in a database. '
  'What does the mechanism say about that?',
  'It cannot guarantee it; the figure is produced rather than looked up',
  ['It can, provided the database was in its training data',
   'It can, if asked to be accurate',
   'It can for numbers and not for text'],
  'Producing a figure and retrieving one are different operations. Supplying the record and '
  'asking the model to read it is a different arrangement with different guarantees.')

q('GB_GA_038', 'GA_FAM13_CAPABILITY_REASONING', 'D4',
  'A team asks a model to state how confident it is in each answer, intending to act only on the '
  'high-confidence ones. The stated confidence is produced by the same process as the answer '
  'rather than measured from anything. What does the plan achieve?',
  'Nothing reliable; the stated figure is another output rather than a measurement',
  ['A usable filter, since the model knows when it is unsure',
   'A usable filter for factual questions only',
   'A reduction in the number of wrong answers'],
  'The figure reads like a measurement and is produced like a sentence. Confidence estimated from '
  'outside the model — agreement across repeated runs, for instance — is a different and more '
  'defensible arrangement.',
  evidence='The stated confidence is produced by the same process as the answer rather than '
           'measured from anything')

q('GB_GA_039', 'GA_FAM13_CAPABILITY_REASONING', 'D5',
  'A team wants a model to add up a column of forty figures and guarantee the total. They point '
  'out that it gets short sums right. Producing a total a piece at a time is not the same '
  'operation as computing one, however often the result happens to agree. What follows?',
  'Short sums being right is not evidence for long ones; the total should be computed and the '
  'model asked to present it',
  ['Longer sums will be right too, since the method is the same',
   'The model should be asked to check its own total',
   'Arithmetic of any length is beyond the mechanism'],
  'Getting short sums right is what a system that has seen many short sums does. Handing it the '
  'computed total to format is the arrangement that gets both the arithmetic and the prose right.',
  mode='TRANSFER',
  hinge='Producing a total a piece at a time is not the same operation as computing one')

q('GB_GA_040', 'GA_FAM13_CAPABILITY_REASONING', 'D5',
  'A model is asked to list every occurrence of a term in a document that has been pasted in, and '
  'misses two. The document is in front of the model, so this is not a question of missing '
  'information but of exhaustively enumerating from produced text. What does the mechanism say?',
  'Exhaustive enumeration is not guaranteed even when the material is fully visible',
  ['The two occurrences must have fallen outside what the model can hold',
   'The model did not understand the term',
   'The document must have been pasted incompletely'],
  'Having the material present removes one failure and not this one. A search tool guarantees '
  'completeness and a generated list does not, whatever is in front of the model.',
  mode='EDGE',
  hinge='this is not a question of missing information but of exhaustively enumerating from '
        'produced text')

q('GB_GA_041', 'GA_FAM13_CAPABILITY_REASONING', 'D5',
  'A team notices that asking a model to work through a problem step by step before answering '
  'improves its results, and concludes the model is now reasoning rather than generating. Each '
  'step is produced the same way every other piece of text is, and each one then sits in front of '
  'the model as it produces the next. What is the accurate account?',
  'The steps become part of what it can see, so later pieces are chosen with them present',
  ['The model switches to a different mode when asked to work step by step',
   'The improvement is imaginary and the results are unchanged',
   'The model is retrieving a worked solution rather than producing one'],
  'The improvement is real and the explanation is mechanical rather than a change of kind. '
  'Denying the improvement would be as wrong as attributing it to a new faculty.',
  mode='EDGE',
  hinge='each one then sits in front of the model as it produces the next')

# =========================================================================
# GA_FAM14_TOOL_CHOICE — D4 x1, D5 x4
# =========================================================================
q('GB_GA_042', 'GA_FAM14_TOOL_CHOICE', 'D4',
  'A team needs the balance of a named account, and the figure must be exactly right every time. '
  'The figure must be exactly right and identical on every request, which is what a query '
  'guarantees and generation does not. What should produce it?',
  'A query against the account records',
  ['A model, asked to be precise',
   'A model, with the answer checked against the records afterwards',
   'A model, with the selection constrained as tightly as possible'],
  'Checking afterwards is real work that a query removes entirely. Constraining the selection '
  'buys consistency rather than correctness.',
  evidence='The figure must be exactly right and identical on every request')

q('GB_GA_043', 'GA_FAM14_TOOL_CHOICE', 'D5',
  'A team must produce twenty differently worded versions of a marketing line, for a person to '
  'choose between. No version needs to be factually checkable and a person reviews all twenty. '
  'Which approach fits?',
  'A model, since variety is the requirement and a person is checking',
  ['A query against a database of previous marketing lines',
   'A written rule that recombines phrases',
   'A model, but only with the selection tightly constrained'],
  'This is what generation is genuinely good at: producing plausible variety cheaply where a '
  'human decides. Constraining the selection would work against the only thing being asked for.',
  mode='TRANSFER',
  hinge='No version needs to be factually checkable and a person reviews all twenty')

q('GB_GA_044', 'GA_FAM14_TOOL_CHOICE', 'D5',
  'A model is proposed for extracting a date from each of fifty thousand scanned invoices. The '
  'result feeds an accounting system directly with nobody reading it. Nobody will read the '
  'extracted dates before they are used, so any error passes through unnoticed. What follows?',
  'Either a person or an automated check must sit between the extraction and the accounting '
  'system',
  ['The model is unsuitable and the work should be done by hand',
   'The model is suitable, since extraction is a simple task',
   'The model is suitable if the selection is constrained'],
  'The volume rules out doing it by hand and the absence of a reader rules out trusting it '
  'directly. What settles it is inserting a check, such as reconciling totals, rather than '
  'choosing between the two extremes.',
  mode='TRADEOFF',
  hinge='Nobody will read the extracted dates before they are used')

q('GB_GA_045', 'GA_FAM14_TOOL_CHOICE', 'D5',
  'A team wants a model to decide which of two contract clauses applies to a case, and to be able '
  'to show later why it decided as it did. An explanation produced afterwards was not what drove '
  'the decision, and the decision itself leaves no record of its grounds. What should they do?',
  'Use the model to draft an argument for a person to decide on, rather than to decide',
  ['Use the model to decide and ask it to explain each decision',
   'Use the model to decide and record its stated confidence',
   'Use the model to decide, with a person reviewing a sample'],
  'Reviewing a sample catches a rate and not this case. Moving the model from deciding to '
  'drafting keeps what it is good at and puts the decision where a reason exists.',
  mode='TRADEOFF',
  hinge='An explanation produced afterwards was not what drove the decision')

q('GB_GA_046', 'GA_FAM14_TOOL_CHOICE', 'D5',
  'A team rejects a model for summarising internal documents on the grounds that it might '
  'fabricate. The documents are supplied in full and a person reads every summary alongside the '
  'original before it is used. Both the source and a reader are present at every step. Is the '
  'rejection reasonable?',
  'No; supplying the source and having a reader addresses the concern that motivated it',
  ['Yes; fabrication makes summarisation unsuitable',
   'Yes, unless the documents are short',
   'No, because summaries are never fabricated'],
  'Blanket refusal is as unreasoning as blanket trust. The two conditions that make fabrication '
  'dangerous — no source to check against and no reader — are both absent here.',
  mode='EDGE', hinge='Both the source and a reader are present at every step')

# =========================================================================
# GA_FAM15_MECHANISM_TRANSFER — D4 x1, D5 x3
# =========================================================================
q('GB_GA_047', 'GA_FAM15_MECHANISM_TRANSFER', 'D4',
  'A user notices a model repeating a phrase from much earlier in a conversation, unprompted. The '
  'earlier text is still in front of the model and is chosen among the candidates for what comes '
  'next. What accounts for it?',
  'The earlier phrase is still visible and influences what is selected next',
  ['The model has become attached to the phrase',
   'The phrase was in the training data and is being recalled',
   'The model is malfunctioning'],
  'Everything in the context influences the selection, including the model own earlier output. '
  'This is why a conversation can settle into a repetitive register.',
  evidence='The earlier text is still in front of the model and is chosen among the candidates '
           'for what comes next')

q('GB_GA_048', 'GA_FAM15_MECHANISM_TRANSFER', 'D5',
  'A model gives a different answer when a question is preceded by an unrelated friendly greeting '
  'than when it is asked bare. A user calls this evidence of mood. Everything in front of the '
  'model is part of what the next piece is chosen from, whether or not it bears on the question. '
  'What is the accurate account?',
  'The greeting is part of the context and therefore part of what shapes the selection',
  ['The model has a mood that the greeting improved',
   'The two answers must in fact be identical',
   'The greeting was interpreted as an instruction'],
  'No part of the context is inert. Attributing the effect to mood is a description of the '
  'symptom rather than of what produced it.',
  mode='TRANSFER',
  hinge='Everything in front of the model is part of what the next piece is chosen from')

q('GB_GA_049', 'GA_FAM15_MECHANISM_TRANSFER', 'D5',
  'A model asked to answer in one word gives a worse answer than when allowed to write freely. A '
  'team calls this evidence that it is withholding effort. Each piece is chosen given everything '
  'produced so far, so a one-word answer has no earlier pieces to be chosen in light of. What is '
  'the accurate account?',
  'A single piece is chosen with nothing produced before it, so nothing intermediate could shape '
  'it',
  ['The model withholds effort on short answers',
   'The model is unable to be concise',
   'The two answers are equally good and the team is mistaken'],
  'Room to produce intermediate text is room for later pieces to be chosen in light of it. Asking '
  'for the working and then the one-word answer gets both.',
  mode='EDGE',
  hinge='a one-word answer has no earlier pieces to be chosen in light of')

q('GB_GA_050', 'GA_FAM15_MECHANISM_TRANSFER', 'D5',
  'A product claims its model never invents facts because it checks each answer against a source '
  'before returning it. A team must judge the claim. Checking against a source is a separate step '
  'around the model rather than a property of generating text. What does the claim describe?',
  'An arrangement built around the model, whose strength depends on the source and the check',
  ['A model that generates differently from others',
   'A claim that cannot be true of any system',
   'A model that has been trained not to invent'],
  'The claim is about the surrounding system rather than about generation, and such arrangements '
  'genuinely help. What to ask next is what the source covers and what happens when the check '
  'fails.',
  mode='TRANSFER',
  hinge='Checking against a source is a separate step around the model rather than a property of '
        'generating text')
