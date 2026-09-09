# -*- coding: utf-8 -*-
"""
Wave 4 — TECHNICAL_EXPLANATION, 50 Golden Bank questions, all newly authored.

THE MISCONCEPTIONS ARE DRAWN FROM EARLIER SKILLS IN THIS BANK, as the blueprint instructs — the
processor believed to store files, a loop believed always to run once, a program believed to work
out what was meant. Correcting a belief is only measurable when the belief is a real one, and
these are the ones the rest of the Foundation blueprint spends its distractors on.

EVERY READER IS DESCRIBED. Three families here depend on who is being explained to, and none of
them has an answer until that is stated: what counts as jargon, what depth is right, and what a
rewritten explanation must preserve are all properties of a particular reader rather than of the
text alone.
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
# TE_FAM01_EXPLANATION_VS_DESCRIPTION — D1 x4, D2 x1
# =========================================================================
q('GB_TE_001', 'TE_FAM01_EXPLANATION_VS_DESCRIPTION', 'D1',
  'Which of these explains why a page loads slowly, rather than describing that it does?',
  'The page requests forty separate images, each needing its own round trip',
  ['The page takes a long time to appear',
   'The page has poor loading performance',
   'A page is a document fetched over a network'],
  'An explanation names something that produces the effect. Restating the slowness in other words '
  'is circular, and defining what a page is answers a different question.')

q('GB_TE_002', 'TE_FAM01_EXPLANATION_VS_DESCRIPTION', 'D1',
  'Which of these explains why a total came out wrong, rather than describing that it did?',
  'The running total was reset inside the loop, so only the last value survived',
  ['The total is not the correct value',
   'The program has a bug in its arithmetic',
   'A total is the sum of a set of values'],
  'Only one option names a mechanism that would produce the wrong total. "Has a bug" restates the '
  'symptom in technical-sounding words without saying anything about it.')

q('GB_TE_003', 'TE_FAM01_EXPLANATION_VS_DESCRIPTION', 'D1',
  'Which of these explains why a file is still on disk after a program closes?',
  'Saving writes the data to storage, which keeps its contents without power',
  ['Files are persistent',
   'The file was not deleted',
   'A file is a named collection of data'],
  'The first names why persistence happens. "Files are persistent" is the observation dressed as '
  'a reason, and the others are a definition and a statement of what did not occur.')

q('GB_TE_004', 'TE_FAM01_EXPLANATION_VS_DESCRIPTION', 'D1',
  'What makes a statement an explanation rather than a description?',
  'It says why something happens, not only what happens',
  ['It uses technical vocabulary',
   'It is longer than a description',
   'It is written for an expert reader'],
  'Explanations answer why. Vocabulary, length and audience are all properties an explanation may '
  'have without being one.')

q('GB_TE_005', 'TE_FAM01_EXPLANATION_VS_DESCRIPTION', 'D2',
  'Someone says a program is slow "because it has performance problems". Why is that not an '
  'explanation?',
  'It restates the observation in different words, so nothing new is offered as a cause',
  ['It is too short to be an explanation',
   'It uses vocabulary the reader may not know',
   'It is an explanation, though not a detailed one'],
  'A cause has to be something other than the effect, and this is the effect renamed. Length and '
  'vocabulary are beside the point — a one-word cause would still be an explanation.')

# =========================================================================
# TE_FAM02_ANALOGY_MAPPING — D1 x3, D2 x1
# =========================================================================
q('GB_TE_006', 'TE_FAM02_ANALOGY_MAPPING', 'D1',
  'Working memory is described as a desk and storage as a filing cabinet. What does taking a '
  'folder out of the cabinet and putting it on the desk correspond to?',
  'Loading a file from storage into working memory',
  ['Saving a file from working memory to storage',
   'Deleting a file',
   'Switching the machine off'],
  'The direction matters: the cabinet is the long-term place and the desk is where work happens, '
  'so moving from cabinet to desk is loading. Reversing the direction gives saving.')

q('GB_TE_007', 'TE_FAM02_ANALOGY_MAPPING', 'D1',
  'A queue is described as a line of people waiting. What does the front of the line correspond '
  'to?',
  'The item that will be dealt with next',
  ['The item added most recently',
   'The item that has already been dealt with',
   'The total number of items waiting'],
  'People join a line at the back and are served from the front, so the front is what comes next. '
  'The most recent arrival is at the other end.')

q('GB_TE_008', 'TE_FAM02_ANALOGY_MAPPING', 'D1',
  'A network is described as a postal system. What does an address correspond to?',
  'The information that decides where the data is delivered',
  ['The contents of the message',
   'The speed of delivery',
   'The person who wrote the message'],
  'An address in both systems is what routing acts on. Contents and sender are carried along and '
  'play no part in deciding the destination.')

q('GB_TE_009', 'TE_FAM02_ANALOGY_MAPPING', 'D2',
  'A cache is described as a notepad on which you jot down answers you have looked up. What does '
  'the notepad becoming out of date correspond to?',
  'A stored copy no longer matching what the source now says',
  ['The cache running out of space',
   'The cache being cleared deliberately',
   'The original source becoming unavailable'],
  'The mapping is between a jotted answer and a stored copy, and the failure mode is the same in '
  'both: the source changed and the note did not. Running out of space is a different situation '
  'with a different remedy.')

# =========================================================================
# TE_FAM03_JARGON_IDENTIFICATION — D1 x3, D2 x1   (the reader is described)
# =========================================================================
q('GB_TE_010', 'TE_FAM03_JARGON_IDENTIFICATION', 'D1',
  'An explanation for someone who has never programmed says: "The function is called recursively '
  'until the base case is reached." Which term would stop that reader?',
  'recursively',
  ['called', 'until', 'reached'],
  'The three ordinary words carry their everyday meanings. Only one term has a technical sense '
  'the reader could not guess, and the sentence depends on it.')

q('GB_TE_011', 'TE_FAM03_JARGON_IDENTIFICATION', 'D1',
  'An explanation for a first-year student says: "The value is stored in a variable, then '
  'serialised before it is sent." Which term would stop that reader?',
  'serialised',
  ['stored', 'variable', 'sent'],
  'A first-year has met variables and storing. Only one word here belongs to a later topic, and '
  'the reader has no way to guess it from context.')

q('GB_TE_012', 'TE_FAM03_JARGON_IDENTIFICATION', 'D1',
  'Is a long word necessarily jargon?',
  'No; jargon is a term with a technical meaning the reader does not have, whatever its length',
  ['Yes; long words should be replaced',
   'No; jargon is any word with more than three syllables',
   'Yes, unless the reader is an expert'],
  'What makes a term jargon is the reader\'s unfamiliarity with its technical sense. Plenty of '
  'jargon is short — "heap", "thread", "commit" — and plenty of long words are ordinary.')

q('GB_TE_013', 'TE_FAM03_JARGON_IDENTIFICATION', 'D2',
  'An explanation defines "idempotent" in its first sentence and uses it in its fourth. Is the '
  'term jargon for a reader who has never met it?',
  'Not by the fourth sentence; the explanation supplied the meaning before relying on it',
  ['Yes; the term is technical whatever the explanation does',
   'Yes; a reader cannot learn a term from one definition',
   'No; the term is not technical at all'],
  'Jargon is a property of the reader\'s knowledge at the moment they meet the word, and an '
  'explanation can change that. Defining before using is exactly what makes a technical term '
  'usable.')

# =========================================================================
# TE_FAM04_EXPLANATION_ORDER — D2, D3
# =========================================================================
q('GB_TE_014', 'TE_FAM04_EXPLANATION_ORDER', 'D2',
  'Three parts of an explanation: (a) what a variable is, (b) what assignment does, (c) why a '
  'total must be set before a loop. In which order does nothing depend on something unsaid?',
  'a, b, c',
  ['c, a, b', 'b, a, c', 'c, b, a'],
  'Assignment needs a variable to have been introduced, and the point about the total needs both. '
  'Beginning with the conclusion leaves the reader holding a claim they cannot yet follow.')

q('GB_TE_015', 'TE_FAM04_EXPLANATION_ORDER', 'D3',
  'An explanation runs: "The cache serves the old copy, which is why the page is stale. A cache '
  'stores copies of files." What is wrong with the order?',
  'The term is used to explain the symptom before the term itself is introduced',
  ['The two sentences should be joined into one',
   'The explanation is too short',
   'Nothing; the reader will infer the meaning'],
  'The first sentence depends on the second, so the reader meets a load-bearing term with no '
  'meaning attached. Whether they can guess it is not the point — the order makes them guess.')

# =========================================================================
# TE_FAM05_ACCURACY_CHECK — D2, D3
# =========================================================================
q('GB_TE_016', 'TE_FAM05_ACCURACY_CHECK', 'D2',
  'An explanation reads: "When you save a file, the application writes it to the disk directly, '
  'and the operating system records its name." Which step is untrue?',
  'The application writing to the disk directly',
  ['The operating system recording the name',
   'The file being written when you save',
   'None; the explanation is accurate'],
  'Applications ask the operating system rather than reaching hardware, so that step is wrong '
  'while the others are right. The explanation reads perfectly well, which is why fluency cannot '
  'be the cue.')

q('GB_TE_017', 'TE_FAM05_ACCURACY_CHECK', 'D3',
  'An explanation reads: "A loop checks its condition, runs its body, and repeats — so a loop '
  'always runs its body at least once." Which step is untrue?',
  'The conclusion that the body always runs at least once',
  ['That a loop checks its condition',
   'That a loop runs its body',
   'That a loop repeats'],
  'The first three steps describe a test-first loop accurately, and the conclusion contradicts '
  'them: if the condition is false at entry the body never runs. The false part is the one that '
  'sounds like a summary.')

# =========================================================================
# TE_FAM06_COMPLETENESS_CHECK — D2, D3, D4
# =========================================================================
q('GB_TE_018', 'TE_FAM06_COMPLETENESS_CHECK', 'D2',
  'The question was "why did my change not appear?". The explanation says: "Browsers store copies '
  'of files." What step is missing?',
  'That the stored copy is being used instead of fetching the changed file',
  ['That browsers can be closed and reopened',
   'How caching improves performance',
   'What a browser is'],
  'The reader has been told a fact and not how it produces their symptom. The other options are '
  'true and answer questions nobody asked.')

q('GB_TE_019', 'TE_FAM06_COMPLETENESS_CHECK', 'D3',
  'The question was "why is my total wrong?". The explanation says: "You reset the total inside '
  'the loop." What step is missing?',
  'That resetting inside the loop discards everything accumulated so far, leaving only the last '
  'value',
  ['Where the loop should be placed in the file',
   'What a total is',
   'How to write a loop'],
  'The reader has been told what they did and not why it produces this result, so they cannot '
  'recognise the same mistake elsewhere. The missing step is the link between the cause and the '
  'symptom.')

q('GB_TE_020', 'TE_FAM06_COMPLETENESS_CHECK', 'D4',
  'The question was "should I use a fetch or a submitting method here?". The explanation '
  'accurately describes what each method means. It contains no false statements. What is missing?',
  'What goes wrong if the wrong one is chosen, which is what the decision turns on',
  ['A definition of a method',
   'A description of how the request travels',
   'Nothing; the explanation is accurate'],
  'Accuracy and completeness are separate, and this explanation is accurate about definitions '
  'while silent about consequences. The reader asked which to choose and has been given no ground '
  'for choosing.',
  evidence='It contains no false statements')

# =========================================================================
# TE_FAM07_ANALOGY_LIMIT — D2, D3, D4
# =========================================================================
q('GB_TE_021', 'TE_FAM07_ANALOGY_LIMIT', 'D2',
  'Working memory is described as a desk. Which conclusion would that analogy wrongly support?',
  'That things left on the desk are still there tomorrow morning',
  ['That the desk holds what you are working on now',
   'That a bigger desk lets you work on more at once',
   'That putting something away frees space'],
  'A desk keeps its contents overnight and working memory does not, so the analogy misleads at '
  'exactly that point. The other three conclusions hold in both.')

q('GB_TE_022', 'TE_FAM07_ANALOGY_LIMIT', 'D3',
  'A network is described as a postal system. Which conclusion would that analogy wrongly support?',
  'That only one copy of a message exists, so sending it means giving it away',
  ['That messages need an address',
   'That messages may take different routes',
   'That messages can be delayed'],
  'Posting a letter removes it from the sender and sending data copies it, so the analogy breaks '
  'over whether the original remains. The other three carry across correctly.')

q('GB_TE_023', 'TE_FAM07_ANALOGY_LIMIT', 'D4',
  'A cache is described as a notepad of jotted answers. A student concludes that clearing the '
  'cache loses information permanently. The analogy is otherwise sound and widely used. Why does '
  'the conclusion not follow?',
  'A jotted note may be the only copy, while a cached copy always has a source it can be fetched '
  'from again',
  ['Because clearing a cache is impossible',
   'Because a notepad is not a good analogy for a cache',
   'Because the cache is stored on the server'],
  'Every analogy carries some conclusions and not others, and this one breaks precisely where the '
  'original still exists. The analogy is genuinely useful, which is what makes knowing its limit '
  'necessary rather than a reason to discard it.',
  evidence='The analogy is otherwise sound and widely used')

# =========================================================================
# TE_FAM08_DEPTH_MATCHING — D2, D3, D4
# =========================================================================
q('GB_TE_024', 'TE_FAM08_DEPTH_MATCHING', 'D2',
  'A first-year asks why their page will not load. The answer explains the details of how names '
  'are resolved into addresses. Is the depth right?',
  'No; it is too deep for the question, which was about their page rather than about resolution',
  ['Yes; more detail is always better',
   'No; it is not deep enough',
   'Yes; the reader will learn something useful'],
  'Depth is judged against what was asked, and an accurate answer to a different question does '
  'not become right by being informative. The reader leaves without knowing why their page fails.')

q('GB_TE_025', 'TE_FAM08_DEPTH_MATCHING', 'D3',
  'An experienced developer asks why a particular request is being refused. The answer says '
  '"something went wrong with the request". Is the depth right?',
  'No; it is too shallow for this reader and this question, which needed the specific reason',
  ['Yes; short answers are clearer',
   'No; the answer is inaccurate',
   'Yes; the reader can investigate further'],
  'The answer is true and tells the reader nothing they did not already know. What the depth has '
  'to match is both the question and what the reader can already do with it.')

q('GB_TE_026', 'TE_FAM08_DEPTH_MATCHING', 'D4',
  'A first-year asks "why does my loop never end?". The answer explains, accurately, how a '
  'processor executes instructions in a cycle. The answer is entirely correct. What is wrong with '
  'it?',
  'It answers a question about the program with an explanation about the machine, so the reader '
  'still cannot fix their loop',
  ['It is inaccurate about the processor',
   'It is too short for the question',
   'Nothing; the explanation is correct'],
  'Correctness does not make an explanation an answer. The reader needs to know that nothing in '
  'their body changes the condition, and no amount of accurate detail about the processor '
  'supplies that.',
  evidence='The answer is entirely correct')

# =========================================================================
# TE_FAM09_CAUSE_IDENTIFICATION — D2, D3, D4
# =========================================================================
q('GB_TE_027', 'TE_FAM09_CAUSE_IDENTIFICATION', 'D2',
  'Why does a program stop with a division by zero? Which account names a cause?',
  'A count used as the divisor was zero, because the list it counted was empty',
  ['Because a division by zero occurred',
   'Because the program has a fault',
   'Because division is a risky operation'],
  'Only one account says something other than the effect. "A division by zero occurred" is the '
  'observation restated, which is circular however technical it sounds.')

q('GB_TE_028', 'TE_FAM09_CAUSE_IDENTIFICATION', 'D3',
  'Why is a page showing yesterday\'s data? Which account names a cause?',
  'The browser reused a stored copy rather than requesting the file again',
  ['Because the page is out of date',
   'Because caching exists',
   'Because pages sometimes show old content'],
  'A cause has to be something that happened. That caching exists is a fact about the world and '
  'not about this page, and the other two restate the symptom.')

q('GB_TE_029', 'TE_FAM09_CAUSE_IDENTIFICATION', 'D4',
  'Why did a nightly job fail? One account says "because the disk was full". Another says '
  '"because a log file grew without limit and filled the disk". Both are true. Which is the more '
  'useful explanation, and why?',
  'The second, because it names something that can be changed; the first names a state that will '
  'recur',
  ['The first, because it is the immediate cause',
   'The first, because it is simpler',
   'They are equally useful, since both are true'],
  'Both are accurate and they sit at different distances from something actionable. Clearing the '
  'disk addresses the first and the job fails again next week; limiting the log addresses the '
  'second.',
  evidence='Both are true')

# =========================================================================
# TE_FAM10_EXAMPLE_CHOICE — D2, D3, D4
# =========================================================================
q('GB_TE_030', 'TE_FAM10_EXAMPLE_CHOICE', 'D2',
  'Which example best demonstrates that a loop can run zero times?',
  'A loop counting from 1 to 0, whose condition is false before the first pass',
  ['A loop counting from 1 to 10',
   'A loop that never ends',
   'A loop containing a conditional'],
  'The concept is a loop whose body never runs, and only one option shows it. The others are '
  'genuine examples of other things.')

q('GB_TE_031', 'TE_FAM10_EXAMPLE_CHOICE', 'D3',
  'Which example best demonstrates that copying a variable does not link the two?',
  'a is set to 5, b is set to a, a is then set to 10, and b is still 5',
  ['a is set to 5 and b is set to 5',
   'a is set to 5 and printed twice',
   'a and b are both set to 10 in turn'],
  'The point is that changing one leaves the other alone, which needs a copy followed by a change. '
  'The first alternative sets both to the same value without ever copying, so the concept is '
  'absent.')

q('GB_TE_032', 'TE_FAM10_EXAMPLE_CHOICE', 'D4',
  'A teacher wants an example showing that an average of whole numbers can lose its fraction. They '
  'choose the values 4 and 8. Each option below is a genuine example of something. What is wrong '
  'with their choice?',
  'The average of 4 and 8 is exactly 6, so nothing is lost and the point does not appear',
  ['The values are too small to show the effect',
   'Two values are too few for an average',
   'Nothing; the example is fine'],
  'An example has to make the concept visible, and values that divide exactly hide it completely. '
  'Choosing 4 and 7 instead would show the loss immediately, which is the whole difference '
  'between a demonstration and an illustration.',
  evidence='Each option below is a genuine example of something')

# =========================================================================
# TE_FAM11_HARMFUL_SIMPLIFICATION — D3, D4
# =========================================================================
q('GB_TE_033', 'TE_FAM11_HARMFUL_SIMPLIFICATION', 'D3',
  'A simplification says "memory is where the computer keeps things it is using". Does it leave a '
  'false belief?',
  'No; it omits detail without implying anything untrue',
  ['Yes; it implies memory keeps things permanently',
   'Yes; it implies memory is the only place things are kept',
   'Yes; it implies memory is a physical place'],
  'The statement is incomplete and not misleading: it says nothing about persistence either way. '
  'A harmful simplification produces a prediction that turns out wrong.')

q('GB_TE_034', 'TE_FAM11_HARMFUL_SIMPLIFICATION', 'D4',
  'A simplification says "saving a file puts it in memory so you can get it back later". A student '
  'who believes it does not save before switching off. The statement is short and reads clearly. '
  'What is wrong with it?',
  'It puts saved files in memory, which produces a false prediction about switching off',
  ['It is too short to be useful',
   'It omits how saving works internally',
   'Nothing; the student should have known better'],
  'The simplification does not merely leave something out; it puts a file in the wrong place and '
  'the reader acts on that. The test of a simplification is whether the beliefs it creates are '
  'true as far as they go.',
  evidence='The statement is short and reads clearly')

# =========================================================================
# TE_FAM12_DECISION_JUSTIFICATION — D3, D4
# =========================================================================
q('GB_TE_035', 'TE_FAM12_DECISION_JUSTIFICATION', 'D3',
  'A team chose to keep a collection sorted. Which account explains the decision?',
  'Because the collection is searched far more often than it is added to, and searching sorted '
  'data is much cheaper',
  ['Because they decided sorting was the right approach',
   'Because sorted data is standard practice',
   'Because sorting is a well-understood operation'],
  'Only one account gives a reason tied to this situation. Convention and familiarity would '
  'support any decision equally and so explain none.')

q('GB_TE_036', 'TE_FAM12_DECISION_JUSTIFICATION', 'D4',
  'A team chose to store a value in the browser rather than on the server, and justified it by '
  'saying "it is simpler". Simplicity would also have justified storing it on the server. What is '
  'wrong with the justification?',
  'It does not distinguish the option chosen from the one rejected, so it explains nothing',
  ['It is not a real consideration',
   'It is too short',
   'Nothing; simplicity is a valid reason'],
  'Simplicity is a genuine consideration and here it points both ways, so it cannot be why one '
  'was chosen. A reason that would equally support the alternative is the sharpest kind of '
  'non-explanation.',
  evidence='Simplicity would also have justified storing it on the server')

# =========================================================================
# TE_FAM13_MISCONCEPTION_CORRECTION — D3, D4, D5 x3
# =========================================================================
q('GB_TE_037', 'TE_FAM13_MISCONCEPTION_CORRECTION', 'D3',
  'A student believes the processor is where files are kept. Which response would change that '
  'belief?',
  'Ask where the files are when the machine is switched off, and follow that to storage',
  ['Tell them the processor does not keep files',
   'Explain how the processor executes instructions',
   'Tell them files are kept on storage'],
  'A correction that engages the belief lets the student see for themselves why it cannot hold. '
  'Simply asserting the opposite leaves them with two claims and no way to choose.')

q('GB_TE_038', 'TE_FAM13_MISCONCEPTION_CORRECTION', 'D4',
  'A student believes a loop always runs its body at least once. A colleague replies, correctly, '
  'that a test-first loop checks before running. The reply is accurate and the student is '
  'unconvinced. What is missing?',
  'An account of why the belief seemed right — most loops they have written did run at least once',
  ['A more precise definition of a loop',
   'An example of a loop that never ends',
   'Nothing; the reply is correct'],
  'A belief formed from experience is not dislodged by a contrary statement, however accurate. '
  'Showing why the experience was consistent with it, and where it stops being so, is what '
  'changes it.',
  evidence='The reply is accurate and the student is unconvinced')

q('GB_TE_039', 'TE_FAM13_MISCONCEPTION_CORRECTION', 'D5',
  'A student believes a program works out what they meant when the input is unexpected. Which '
  'correction would change the belief most durably?',
  'Show a case where the unexpected input produces plainly wrong behaviour that nobody wrote',
  ['Tell them programs only do what they are told',
   'Explain how a processor executes instructions',
   'Give them a definition of a program'],
  'A belief about behaviour is best corrected by behaviour, because the student sees the '
  'prediction fail. A general statement is easy to accept and easy to keep acting against.',
  mode='TRANSFER', hinge='a program works out what they meant when the input is unexpected')

q('GB_TE_040', 'TE_FAM13_MISCONCEPTION_CORRECTION', 'D5',
  'Why is contradicting a misconception often less effective than explaining why it seemed '
  'reasonable?',
  'The belief was formed from evidence, and evidence that is not accounted for keeps supporting it',
  ['Because contradiction is impolite',
   'Because people never change their minds',
   'Because a misconception is usually partly true'],
  'Somebody holding a wrong belief usually has reasons, and a bare contradiction leaves those '
  'reasons standing. Accounting for them is what makes the correction stick rather than being '
  'accepted and then forgotten.',
  mode='TRANSFER', hinge='less effective than explaining why it seemed reasonable')

q('GB_TE_041', 'TE_FAM13_MISCONCEPTION_CORRECTION', 'D5',
  'A misconception is corrected and the student agrees, then makes the same mistake a week later. '
  'What does that suggest?',
  'The correction was accepted without replacing the model that produced the mistake',
  ['The student was not paying attention',
   'The correction was wrong',
   'Misconceptions cannot be corrected'],
  'Agreeing with a statement and holding a working model are different things, and only the second '
  'governs what somebody does under pressure. That the mistake recurs is evidence about the '
  'correction rather than about the student.',
  mode='TRANSFER', hinge='then makes the same mistake a week later')

# =========================================================================
# TE_FAM14_EXPLANATION_REPAIR — D4, D5 x4   (the fault is named in the stem)
# =========================================================================
q('GB_TE_042', 'TE_FAM14_EXPLANATION_REPAIR', 'D4',
  'An explanation reads: "The page is stale because of caching." The named fault is that it does '
  'not say what caching did here. The sentence is accurate and clearly written. Which change fixes '
  'that fault?',
  '"The page is stale because your browser reused a stored copy instead of fetching the new file."',
  ['"The page is stale because of caching, which is a common problem."',
   '"The page is stale. Caching stores copies of files to improve performance."',
   '"The page appears to be stale because of caching behaviour."'],
  'Only one option says what happened in this case. The others add sympathy, general background, '
  'or hedging — each an improvement of some kind that leaves the named fault untouched.',
  evidence='The sentence is accurate and clearly written')

q('GB_TE_043', 'TE_FAM14_EXPLANATION_REPAIR', 'D5',
  'An explanation reads: "Saving writes the file to memory." The named fault is that it is '
  'inaccurate. Which change fixes it without introducing a new fault?',
  '"Saving writes the file to storage, which keeps it after the machine is switched off."',
  ['"Saving writes the file to memory, which keeps it after the machine is switched off."',
   '"Saving writes the file to storage, and storage is a kind of memory."',
   '"Saving preserves the file."'],
  'The first correction replaces the wrong place with the right one and says why it matters. The '
  'second keeps the error, the third reintroduces the confusion by another route, and the fourth '
  'is true and says nothing.',
  mode='TRANSFER', hinge='The named fault is that it is inaccurate')

q('GB_TE_044', 'TE_FAM14_EXPLANATION_REPAIR', 'D5',
  'An explanation reads: "The request failed because the server returned an error." The named '
  'fault is circularity. Which change fixes it?',
  '"The request failed because it was missing the identification the server requires."',
  ['"The request failed because the server responded with a failure status."',
   '"The request failed. Servers return errors when something goes wrong."',
   '"The request was unsuccessful because the server did not succeed."'],
  'Only one option supplies something other than the failure itself. The other three restate it '
  'in fresh words, which is what circularity survives on.',
  mode='TRANSFER', hinge='The named fault is circularity')

q('GB_TE_045', 'TE_FAM14_EXPLANATION_REPAIR', 'D5',
  'An explanation has two faults: it is inaccurate about one step, and it assumes a term the '
  'reader does not know. Only one can be repaired before it is sent. Which should it be?',
  'The inaccuracy, because a reader who follows it will believe something false, while an unknown '
  'term leaves them asking',
  ['The unknown term, because the reader cannot get past it',
   'Either; both are defects of the same kind',
   'Neither; an explanation with two faults should not be sent'],
  'A term the reader cannot follow stops them and prompts a question; an inaccuracy they can '
  'follow is absorbed. Ranking defects by what the reader ends up believing is what makes a single '
  'repair a decision.',
  mode='TRADEOFF', hinge='Only one can be repaired before it is sent')

q('GB_TE_046', 'TE_FAM14_EXPLANATION_REPAIR', 'D5',
  'A repair removes a named fault and makes the explanation noticeably longer. When is that a poor '
  'trade?',
  'When the added length pushes the part that answers the question past where the reader stops '
  'reading',
  ['Always; explanations should be as short as possible',
   'Never; correctness outweighs length',
   'When the reader is an expert'],
  'Length matters through whether the explanation is read to the point that matters. A longer '
  'version that leads with the answer costs almost nothing, and one that buries it costs '
  'everything.',
  mode='TRADEOFF', hinge='makes the explanation noticeably longer')

# =========================================================================
# TE_FAM15_AUDIENCE_TRANSFER — D4, D5 x3   (both readers described)
# =========================================================================
q('GB_TE_047', 'TE_FAM15_AUDIENCE_TRANSFER', 'D4',
  'An explanation written for developers reads: "The endpoint is idempotent, so retries are safe." '
  'It must be rewritten for a support agent who knows the product and not the vocabulary. The '
  'meaning must be preserved. Which version works?',
  '"Sending the same request again does not do the action twice, so it is safe to retry."',
  ['"The endpoint is idempotent, so retries are safe. Please retry."',
   '"Retries are safe."',
   '"The endpoint has a property that makes retrying acceptable."'],
  'Only one option removes the term and keeps what it meant. Shortening keeps the assumed '
  'knowledge or drops the substance, and naming the property without saying what it is leaves the '
  'reader exactly where they started.',
  evidence='The meaning must be preserved')

q('GB_TE_048', 'TE_FAM15_AUDIENCE_TRANSFER', 'D5',
  'An explanation for a first-year is being rewritten for a complete beginner. What is the main '
  'risk?',
  'Removing the vocabulary and the substance together, leaving something true and empty',
  ['Making it too long',
   'Using an analogy',
   'Explaining something the reader already knows'],
  'Simplifying by deletion is the easy failure: what remains is accurate and carries no meaning. '
  'An analogy is a tool rather than a risk, provided its limits are known.',
  mode='TRANSFER', hinge='being rewritten for a complete beginner')

q('GB_TE_049', 'TE_FAM15_AUDIENCE_TRANSFER', 'D5',
  'An explanation is rewritten for a non-technical reader by replacing every technical term with '
  'an analogy. What is the risk?',
  'The analogies carry conclusions the technical terms did not, so the reader may believe things '
  'that are false',
  ['There is no risk; analogies always help',
   'The explanation becomes longer',
   'The reader will not understand the analogies'],
  'Every analogy supports conclusions of its own, and a chain of them supports a great many. '
  'Replacing terms wholesale trades one kind of inaccessibility for a different kind of '
  'inaccuracy.',
  mode='TRADEOFF', hinge='replacing every technical term with an analogy')

q('GB_TE_050', 'TE_FAM15_AUDIENCE_TRANSFER', 'D5',
  'One explanation must serve both a first-year student and an experienced developer. What is the '
  'best approach?',
  'Answer the question plainly first, then add the detail the experienced reader needs below it',
  ['Write at the level of the less experienced reader throughout',
   'Write at the level of the more experienced reader throughout',
   'Write two separate explanations and hope each reader finds theirs'],
  'Ordering by depth lets each reader stop where their need is met, which is what a single '
  'document can do that two cannot. Pitching throughout at either level fails one of the two '
  'readers by design.',
  mode='TRADEOFF', hinge='must serve both a first-year student and an experienced developer')
