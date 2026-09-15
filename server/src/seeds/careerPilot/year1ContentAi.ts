/**
 * T_GENAI, T_AI_LITERACY and T_AI_CODING — the AI literacy module, all three topics.
 *
 * ── WHY THESE TOPICS, AND WHO THEY ARE FOR ─────────────────────────────────────────────────
 *
 * UNIVERSAL and mandatory. Every first-year will use generative AI tools this year, whatever
 * direction they take, and most will do so with no model of what the tool is doing. That gap
 * shows up as trusting a fabricated citation, pasting a friend's phone number or an API key into
 * a chat, and submitting code nobody can explain. These three topics close it in order: how the
 * models work (T_GENAI), how to use them well and responsibly (T_AI_LITERACY), and how to use them
 * for code without being used by them (T_AI_CODING).
 *
 * ── THE LINE THESE TOPICS HOLD ────────────────────────────────────────────────────────────
 *
 * Neither hype nor dismissal. The tools are genuinely useful and genuinely unreliable, and both
 * facts follow from the same mechanism — generating likely text rather than retrieving checked
 * fact. Every unit is taught from that mechanism rather than from a list of rules, so the lessons
 * survive the next product release.
 *
 * Deliberately vendor-neutral and undated: no product names, no model versions, no prices, no
 * claims about which system is currently best. Supervised and unsupervised learning, overfitting
 * and bias in training data belong to T_ML_INTRO and are referenced, not repeated.
 *
 * T_AI_LITERACY declares two skills. Checkpoint questions name the one each measures:
 * PROMPT_ENGINEERING for how a request is written, iterated and structured; AI_RESPONSIBLE_USE for
 * privacy, verification as a responsibility, honesty and academic integrity.
 */

import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string, skillKey?: string,
): PilotMcq => ({
  question,
  options: options.map(([text, isCorrect]) => ({ text, isCorrect })),
  explanation,
  ...(skillKey ? { skillKey } : {}),
});

const PE = 'PROMPT_ENGINEERING';
const RU = 'AI_RESPONSIBLE_USE';

export const AI_BUNDLES: PilotBundle[] = [
  /* ── T_GENAI · how these models work ─────────────────────────────────────────────────── */
  {
    unitCode: 'T_GENAI_WHAT_IS_GENAI',
    notes: `Generative AI is a system that produces new content — text, code, images, audio — rather
than assigning a label to content that already exists.

**The contrast with what you may already know.** A spam filter takes an email and outputs one of
two labels: spam or not spam. A generative model given "write a polite email asking to move my lab
slot to Thursday" produces an email that did not exist a moment ago. Both learned from data (the
classification side is covered in the machine learning topic); the difference is what comes out.

**What a large language model is.** A large language model (LLM) is trained on a very large
amount of text to do one thing: predict what text comes next. That sounds narrow, but predicting
the continuation of a textbook explanation well requires something that behaves like knowing the
subject, and predicting the next line of a program well requires something that behaves like
knowing the language. Scaled up far enough, one objective produces a system that can draft,
summarise, translate, explain and write code.

**From text predictor to assistant.** A model trained only to continue text will happily continue
your question with three more questions. Chat assistants are the same kind of model trained further
on examples of helpful conversations and on human judgements of which replies are better, so they
respond to instructions instead of merely continuing them.

**The model and the product are different things.** The application around a model may add a web
search, a code runner, uploaded files or a saved memory. When a chat app reads a web page, the
application fetched the page and passed its text to the model. Keep the two apart when judging what
"it" can do.

**The misconception: it looks the answer up.** There is no store of answers being retrieved. Each
reply is generated fresh from patterns captured in the model's parameters. That is why it can
answer a question nobody has ever asked — and why it can produce a fluent answer to a question that
has no true answer at all. A model can reproduce text it saw many times during training, but that
is not the same as consulting a source.

**Why this matters.** Everything else in this topic — tokens, variation between runs, invented
facts, hard limits — follows from "produces likely content", not "retrieves correct content". Hold
on to that and most of the surprising behaviour stops being surprising.`,
    mcqs: [
      mcq('Which of these tasks is generative rather than classification?',
        [['Writing a product description from a list of features', true],
          ['Deciding whether a film review is positive or negative', false],
          ['Flagging a bank transaction as likely to be fraudulent', false],
          ['Sorting incoming support tickets into five fixed queues', false]],
        'The description is new text that did not exist before. The other three each assign an existing input to one of a fixed set of labels.'),
      mcq('What is the core training objective of a large language model?',
        [['Predicting the next piece of text from what came before', true],
          ['Storing questions paired with their verified answers', false],
          ['Following grammar rules written out by linguists', false],
          ['Labelling each sentence it reads as true or false', false]],
        'Next-text prediction on a very large corpus is the foundation. Everything an assistant does is built on top of that one objective.'),
      mcq('A chat assistant reads a web page you link and summarises it. Which part fetched the page?',
        [['The application around the model, which passed the text in', true],
          ['The model itself, which browses by predicting web addresses', false],
          ['The training data, which holds a copy of every web page', false],
          ['Your browser, which the model controls while it answers', false]],
        'Tools such as search belong to the product. The model only ever sees the text the application places in front of it.'),
      mcq('How does a chat assistant differ from a model that has only learned to continue text?',
        [['It was trained further on conversations to follow instructions', true],
          ['It holds a search engine in place of learned parameters', false],
          ['It is a rule-based program written on top of the model', false],
          ['It was trained on far less text, so it stays on topic', false]],
        'The same kind of model, trained further on helpful exchanges and human preferences. Without that step it would continue your question rather than answer it.'),
    ],
    checkpoint: [
      mcq('A model gives a sensible answer to a question no website has ever addressed. What does this show?',
        [['Its output is generated from patterns, not retrieved from a store', true],
          ['It secretly searched a private collection of expert answers', false],
          ['Somebody at the company wrote that answer for it in advance', false],
          ['The question must have been in its training data after all', false]],
        'Generation from learned patterns is what lets it respond to unseen questions. The same mechanism lets it answer questions that have no true answer.'),
      mcq('Why can one model produce both a correct explanation and a confident falsehood?',
        [['Both are produced the same way: as likely text, not checked fact', true],
          ['Correct answers come from a database and false ones from guessing', false],
          ['It switches to a lower-quality mode when a question is difficult', false],
          ['False answers occur only when the servers are under heavy load', false]],
        'There is no separate path for true and false output. Both are likely continuations, which is why fluency says nothing about accuracy.'),
      mcq('A friend says "an LLM is just a spam filter with more categories". The best correction is:',
        [['A classifier assigns a label; an LLM generates new content', true],
          ['An LLM is rule-based, while a spam filter learns from examples', false],
          ['They are the same, except that an LLM has far more labels', false],
          ['A spam filter needs training data, while an LLM needs none', false]],
        'The output differs in kind: one label from a fixed set, against open-ended new text. Both learn from data, so the other distinctions are wrong.'),
    ],
  },
  {
    unitCode: 'T_GENAI_TOKENS',
    notes: `A language model does not read letters or words. It reads **tokens**, and it writes one
token at a time.

**What a token is.** Before text reaches the model, a tokeniser splits it into pieces from a fixed
vocabulary: common words are usually a single token, rarer words are split into several pieces, and
punctuation and spaces are tokens or parts of tokens too. A word such as "unbelievably" might become
"un", "believ" and "ably"; the exact split depends on the tokeniser. Each token is then just a
number. As a rough guide for English, a token averages about four characters, or three quarters of
a word. Text in many other languages is often split into more tokens for the same meaning, because
tokenisers are built largely from English-heavy text.

**Generation is repeated prediction.** Given every token so far, the model assigns a probability to
every token in its vocabulary. One is chosen, added to the end, and the whole step repeats:

    Input:   The capital of India is
    Step 1:  The capital of India is New
    Step 2:  The capital of India is New Delhi
    Step 3:  The capital of India is New Delhi.

Nothing writes out the whole answer first and then types it. Each token is committed as it is
produced, and an early poor choice is built upon rather than revised.

**Three consequences you will meet.**

- **Letter-level tasks are awkward.** Asked how many times a letter appears in a long word, a model
  is working from tokens that hide the individual letters, so it often miscounts.
- **The context window.** A model can take only a limited number of tokens into account at once.
  Your prompt, any pasted document, the earlier conversation and the reply being written all count
  against it. When a conversation outgrows it, the application must drop or summarise older parts,
  and the model simply no longer sees them.
- **Length limits and usage are counted in tokens**, not words or characters.

**The misconception: it remembers our conversation.** The model is not changed by talking to you.
Within one chat, the application sends the earlier messages back in as part of the input on every
turn, which is why the model appears to remember. Start a new chat and nothing carries over, unless
the product saves notes and quietly feeds them back in.

**Why this matters.** Tokens explain why a model can write a fluent essay and fail to count letters,
why a very long chat starts ignoring your first instruction, and why pasting a huge document can
leave part of it unread.`,
    mcqs: [
      mcq('Why might a model miscount the letters in a long, unusual word?',
        [['It processes chunks of text as tokens, not single letters', true],
          ['It has never seen that word, so it cannot spell it at all', false],
          ['Counting needs internet access, which models never have', false],
          ['Letters are removed from the input before the model reads it', false]],
        'The tokens hide the individual characters. The model is predicting an answer about letters it never directly sees.'),
      mcq('Which of these count against a model\'s context window?',
        [['The prompt, pasted text, earlier turns and the reply itself', true],
          ['Only the words typed in your latest message to the model', false],
          ['Only the model\'s reply, since the prompt is stored apart', false],
          ['Only uploaded files, as typed messages are processed free', false]],
        'Everything the model must take into account at once shares the same limit, including the text it is currently generating.'),
      mcq('Deep into a long chat, an assistant ignores a rule you set in your very first message. Which explanation fits how these models work?',
        [['The early message no longer fits in the context window', true],
          ['The model judged the rule wrong and chose to overrule it', false],
          ['Models forget instructions after a fixed number of minutes', false],
          ['The rule was saved into its training data and overwritten', false]],
        'When a conversation outgrows the window, older text is dropped or summarised. Repeating the rule, or starting a fresh chat, puts it back in view.'),
      mcq('At each step of generating a reply, the model:',
        [['Scores every possible next token, and one of them is chosen', true],
          ['Looks up the full answer, then reveals it a word at a time', false],
          ['Checks each sentence against a source before it continues', false],
          ['Picks the next word at random, with every word equally likely', false]],
        'A probability for every token in the vocabulary, one choice, then repeat. Nothing is looked up and nothing is checked.'),
    ],
    checkpoint: [
      mcq('You paste a 30-page document and the summary covers only the first half accurately. The most likely reason is:',
        [['The document exceeded the tokens the model could take in', true],
          ['The model reads documents from the end and ran out of time', false],
          ['Summaries are designed to cover half of any input they get', false],
          ['The second half used a font that the model cannot read', false]],
        'Text beyond the context window, or cut by the application to fit, is simply never seen. Splitting the document into parts avoids it.'),
      mcq('Why does the same sentence often use more tokens in many non-English languages?',
        [['Tokenisers built from English-heavy text split it into more pieces', true],
          ['Non-English text is translated into English before being read', false],
          ['Grammar in those languages needs a separate token per rule', false],
          ['Each non-English character is stored as several full words', false]],
        'Common English words earned whole tokens when the vocabulary was built. Text the tokeniser saw less of is broken into smaller, more numerous pieces.'),
      mcq('In a brand-new chat with no memory feature, an assistant recalls nothing from yesterday. Why?',
        [['Chatting does not change the model; it sees only text sent now', true],
          ['Yesterday\'s chat was used to retrain it, erasing the details', false],
          ['Its memory is wiped each night to free space on the servers', false],
          ['It does remember, but it has been told to pretend otherwise', false]],
        'Apparent memory within a chat is the application re-sending earlier messages. A new chat starts with none of that text.'),
    ],
  },
  {
    unitCode: 'T_GENAI_WHY_IT_VARIES',
    notes: `Ask the same question twice and you may get two different answers. That is not a fault. It
is a choice made in how the next token is picked.

**Probabilities, then a choice.** At each step the model produces probabilities for the next
token. Suppose the text so far is "Our college fest this year is going to be":

    amazing    0.40
    great      0.25
    fun        0.15
    huge       0.10
    (thousands of others share the remaining 0.10)

(The numbers are invented for illustration.) Always taking the top token is called **greedy**
decoding. Most assistants instead **sample**: they pick at random in proportion to the
probabilities, so "amazing" is chosen about 40% of the time and "fun" about 15%.

**Temperature** reshapes the probabilities before sampling. A low temperature sharpens them, so the
likeliest tokens win almost every time and the output becomes predictable. A high temperature
flattens them, so unlikely tokens are picked more often and the output becomes more varied — and
more likely to wander off course. A related setting, **top-p**, samples only from the smallest set
of likeliest tokens whose probabilities add up to p, cutting off the long tail of odd choices.

**Small differences compound.** Once one early token differs, every later token is predicted from a
different text. Two runs can therefore differ in structure and even in conclusion, not just wording.

**Why sample at all?** Always taking the top token tends to produce bland, repetitive text. Sampling
makes writing sound natural and gives useful variety when brainstorming. For tasks that need
consistency — extracting the same fields from many forms, say — a low temperature is the better
choice. Chat apps often hide these settings; programming interfaces usually expose them. Even at a
temperature of zero, repeated runs are not always identical, because of how the computation is
carried out on shared hardware, and a product may also change the model behind it.

**The misconception: agreement means correctness.** Asking three times and getting the same answer
does not make it right. A mistake the model learned firmly is repeated consistently. The reverse is
a useful signal, though: if a factual question gets different answers on different runs, the model
has no firm basis for any of them.

**Why this matters.** Rerunning a question is a cheap probe. Variation on a creative task is a
feature; variation on a factual one is a warning.`,
    mcqs: [
      mcq('Lowering the temperature makes a model\'s output:',
        [['More predictable, favouring the likeliest tokens', true],
          ['More accurate, because false tokens are filtered', false],
          ['Shorter, since fewer tokens are allowed per reply', false],
          ['Slower, since each token is checked more carefully', false]],
        'Temperature changes how concentrated the choice is, not whether the result is true. A low temperature gives the likeliest text, which may still be wrong.'),
      mcq('Two runs of one prompt give essays with quite different structures. Why so different?',
        [['One early different token sends the rest down another path', true],
          ['The model was retrained between the first and second run', false],
          ['Each run is answered by a randomly chosen different model', false],
          ['The prompt was read in a different order the second time', false]],
        'Every later token is predicted from the text so far, so a single early divergence compounds through the whole reply.'),
      mcq('A top-p setting of 0.9 means the model:',
        [['Samples only from the likeliest tokens covering 90% probability', true],
          ['Chooses the single most likely token nine times out of ten', false],
          ['Rejects any reply it is less than 90 per cent sure about', false],
          ['Reserves ninety per cent of the context window for the prompt', false]],
        'The long tail of unlikely tokens is cut off, and sampling happens among the rest. It is a limit on choices, not a confidence threshold.'),
      mcq('You need the same fields extracted consistently from 200 scanned forms. Which setting suits the task?',
        [['A low temperature, so the likeliest output is chosen each time', true],
          ['A high temperature, so the model tries a range of readings', false],
          ['The default, since temperature affects only creative work', false],
          ['Any value, because extraction never involves any sampling', false]],
        'Consistency is the goal, so variety is a cost. Low temperature makes repeated runs far more alike, though you still check the extracted values.'),
    ],
    checkpoint: [
      mcq('Asked five times in fresh chats, a model gives the same wrong date every time. What does this show?',
        [['Consistency is not correctness; a learned error repeats reliably', true],
          ['The date must be right, because random errors would vary', false],
          ['The temperature was set so high that the error was locked in', false],
          ['The model checked the date against a source all five times', false]],
        'A firmly learned mistake is the likeliest continuation every time. Only an independent source can settle the date.'),
      mcq('A student sets temperature to 0 and still notices a small difference between two runs. The best explanation is:',
        [['Computation on shared servers can vary slightly, even unsampled', true],
          ['Temperature 0 means maximum randomness rather than none at all', false],
          ['The model learns from each run and adjusts its next answer', false],
          ['The setting is ignored whenever the prompt is under one line', false]],
        'Zero temperature removes deliberate sampling, but implementation details can still nudge a token, and one changed token changes the rest.'),
      mcq('Why do most assistants sample rather than always taking the most likely token?',
        [['Always taking the top token tends to give bland, repetitive text', true],
          ['Picking the top token is too slow to do at every single step', false],
          ['The most likely token is usually wrong, so it is avoided', false],
          ['Sampling guarantees that every answer is factually correct', false]],
        'Sampling is chosen for natural, varied writing. It has nothing to do with accuracy, in either direction.'),
    ],
  },
  {
    unitCode: 'T_GENAI_HALLUCINATION',
    notes: `A model can produce fluent, specific, plausible content that is simply false. This is
usually called **hallucination**, and it sounds exactly as confident as a correct answer.

**What it looks like.** A reference list where the authors, journal and year look right and the
paper does not exist. A Python function with a sensible name that no library provides. A precise
statistic with a named report that never contained it. A quotation nobody said. A detailed answer
explaining why something happened that never happened.

**Why it happens — straight from the mechanism.**

1. **The model produces likely text.** A citation has a recognisable shape — author, year, title,
   journal — and a plausible one is as easy to generate as a real one.
2. **Nothing checks against the world.** Unless the application retrieves documents or runs a
   search, there is no step where output is compared with a source.
3. **Gaps get filled.** On an obscure topic the model has seen little about, it still produces the
   shape of an answer rather than nothing.
4. **False premises get accepted.** Ask "why did Isaac Newton turn down the Nobel Prize?" and a
   model may explain his reasons, although he died long before the prize existed.
5. **Tone is learned separately from truth.** The confident style comes from confident writing in
   the training data, so it is the same whether the content is right or wrong.

**Where fabrication concentrates:** exact figures, citations and links, quotations, obscure people
and places, version-specific technical details, local facts such as your college's rules, and any
question built on a false premise.

**Checks that do not work.** Asking "are you sure?" — the model may apologise and change a correct
answer, or repeat a wrong one more firmly. Asking for a source — it may invent one. Judging by the
level of detail — detail is exactly what it generates easily.

**What reduces it.** Supplying the source text and asking for answers only from it, with the
supporting sentence quoted. Tools that search or look things up. Explicitly allowing "I do not
know". All of these reduce invention; none removes it, because a model can still misread or
misquote a document it was given.

**The misconception: it is a rare bug that the next version will fix.** Rates vary by task and
have fallen in many settings, but invention follows from how generation works. Plan for it on every
answer you intend to rely on.`,
    workedExample: `**A student asks an assistant for three research papers on crop yield prediction in India,
and gets three neat references.**

**Check 1.** Search the first title in a scholarly search engine. It exists, with the same authors
and year. Usable, once the paper itself has been opened and read.

**Check 2.** Search the second title. Nothing close exists. Searching the named authors shows real
researchers in agriculture who never wrote it. The reference is fabricated from plausible parts —
the most dangerous kind, because the names look right.

**Check 3.** The third title exists, but with different authors and a different year. The model
has blended a real paper with invented details; citing it as given would be wrong.

**The lesson.** One in three was reliable as generated. Every reference was checked at its source
rather than by asking the assistant whether it was sure, and the check took a few minutes.`,
    mcqs: [
      mcq('Why can a model produce a reference to a paper that does not exist?',
        [['It generates text shaped like a reference, not a record of one', true],
          ['It found a paper that has since been removed from the internet', false],
          ['It confused two authors whose names were stored side by side', false],
          ['It is programmed to invent references whenever it is offline', false]],
        'A citation is a predictable pattern, and a plausible one is as easy to produce as a real one. Nothing in generation checks that it exists.'),
      mcq('Asked "Why did Isaac Newton turn down the Nobel Prize in Physics?", a model lists his reasons. What went wrong?',
        [['The premise is false, and the model built an answer on it', true],
          ['Newton\'s reasons are disputed, so the model chose one account', false],
          ['The model answered correctly but forgot to name its sources', false],
          ['The model mixed Newton up with a later physicist of that name', false]],
        'Newton died in 1727 and the prize was first awarded in 1901. A question that assumes something false often gets a fluent answer instead of a correction.'),
      mcq('Which part of a generated answer deserves the most suspicion?',
        [['Exact figures, quotations and citations on a niche subject', true],
          ['Explanations of widely taught ideas such as photosynthesis', false],
          ['The overall structure and headings the answer is laid out in', false],
          ['Common words and grammar in sentences about everyday topics', false]],
        'Fabrication concentrates where the model has little to go on and where precision is expected. Widely repeated basics are far less risky.'),
      mcq('You reply "Are you sure?" to a correct answer and the model changes it. What does this show?',
        [['Its reaction to pushback is not a reliable signal of truth', true],
          ['The first answer must have been wrong, since it was corrected', false],
          ['The model looked the fact up again and found a newer figure', false],
          ['Challenging a model always makes its next answer more accurate', false]],
        'Models tend to go along with the direction of a conversation. Only an independent source can tell you which answer was right.'),
    ],
    checkpoint: [
      mcq('Why does a fabricated answer sound exactly as confident as a correct one?',
        [['The tone is learned from confident text and is not tied to truth', true],
          ['The model hides doubt so that people keep using the product', false],
          ['Confidence is set by the temperature, which was left too low', false],
          ['Fabrication only occurs when the model is certain it is right', false]],
        'Style and content are produced by the same prediction, and the style was learned from writing that sounds sure. It carries no information about accuracy.'),
      mcq('You give a model a document and ask it to answer only from that document. What is the effect?',
        [['Less invention, though it can still misread or misquote the text', true],
          ['No invention at all, as the model can only repeat the text', false],
          ['No difference, because models ignore pasted material entirely', false],
          ['More invention, because the document overloads the model', false]],
        'Grounding in a source is one of the best mitigations, but the answer is still generated. Checking the quoted sentence against the document closes the gap.'),
      mcq('An assistant gives a precise literacy rate for your district and names the report it came from. What should you do before using it?',
        [['Find the named report and check the figure appears in it', true],
          ['Ask the assistant whether it is sure, and use it if it says yes', false],
          ['Use it, since naming a report shows the figure was looked up', false],
          ['Ask for a second figure and use it if the two roughly agree', false]],
        'A named source is one more piece of generated text until you open it. The report either contains the figure or it does not.'),
    ],
  },
  {
    unitCode: 'T_GENAI_LIMITS',
    notes: `Some tasks are hard for a language model in predictable ways. Knowing which lets you decide
in advance where to trust it and where to reach for something else.

**Knowledge cutoff.** A model learns from data collected up to some date and knows nothing after
it. It may not know its own cutoff reliably, and it will describe the latest thing it saw as if it
were current — a library version, an exam pattern, a regulation. A product with a search tool can
fetch newer information; the model on its own cannot.

**Exact arithmetic.** Multiplying two seven-digit numbers by predicting digit tokens is error-prone.
Many products hand calculations to a code or calculator tool, which is the product working around
the model. When a number matters, have the calculation done by code or check it yourself.

**Character-level work.** Counting letters, reversing a string, or producing text of exactly 50
characters all depend on units the model does not see directly, because it works in tokens.

**Reasoning that is really pattern matching.** Step-by-step explanations often work well on
familiar kinds of problem. But change one detail of a well-known puzzle and a model may confidently
give the answer to the original version, because the familiar pattern outweighs the detail you
changed.

**Your world.** It cannot see your files, your college's rules, today's news or the output of your
code unless that text is put in front of it.

**Self-knowledge.** Asked why it gave an answer, a model generates a plausible explanation. That
explanation is more generated text, not a trustworthy report of how the answer was produced, and its
stated confidence is similarly unreliable.

**Agreement.** Models tend to go along with the framing of a question. "Isn't it true that...?"
invites agreement whether or not the claim is true.

**What these models do well — just as important.** Drafting and rewording, summarising text you
supply, explaining widely taught concepts, generating examples and practice questions, translating,
and first-draft code for common tasks. These play to the strength of predicting likely text.

**The misconception: a limit is a sign the model is useless.** A calculator cannot write an essay
and nobody calls it useless. The skill is matching the task to the tool.

**A question to ask before relying on an answer.** Is this a common pattern in text — or does it
need exact computation, fresh facts, facts about me, or a reasoning step I cannot check? The more of
the second kind, the more checking the answer needs.`,
    mcqs: [
      mcq('Which task is a model most likely to get wrong without a tool?',
        [['Multiplying two seven-digit numbers exactly', true],
          ['Rewording a paragraph for a school student', false],
          ['Explaining how a list differs from a tuple', false],
          ['Drafting an email to reschedule a viva exam', false]],
        'Exact multi-digit arithmetic by token prediction is error-prone. The other three are common text patterns the model handles well.'),
      mcq('Asked about a library\'s newest release, a model describes an older release as current. Why?',
        [['Its training data stops at a cutoff date it cannot see past', true],
          ['The newer release is too large to fit in its context window', false],
          ['Models are barred from discussing recently released software', false],
          ['It checked the website, but the page it read was out of date', false]],
        'The newest thing it saw during training looks current to it. Official release notes are the place to check.'),
      mcq('A famous riddle is given with one detail changed, and the model answers the original riddle. Which limit is this?',
        [['Matching a familiar problem instead of reading this one', true],
          ['A knowledge cutoff older than the changed riddle itself', false],
          ['A riddle too long to fit inside the context window', false],
          ['A high temperature that picked a less likely answer', false]],
        'The well-known version dominates the prediction. The changed detail is outweighed by the pattern the model has seen many times.'),
      mcq('"Isn\'t it true that recursion is always faster than a loop?" gets a reply agreeing with you. Why?',
        [['Models tend to go along with the framing of a question', true],
          ['Recursion is always faster, so agreeing was simply correct', false],
          ['Leading questions force the model to a higher temperature', false],
          ['The model searched for the claim and found it on a forum', false]],
        'The claim is false; recursion usually adds call overhead. A neutral question, such as asking which is faster and when, avoids steering the answer.'),
    ],
    checkpoint: [
      mcq('Which question is a model least equipped to answer from its training alone?',
        [['What your department changed in this semester\'s attendance rule', true],
          ['How a hash table gives fast lookups in the typical case', false],
          ['What the main causes of the First World War are said to be', false],
          ['Why binary search needs its input to be sorted beforehand', false]],
        'Local and recent facts were never in its training data. The other three are widely written about.'),
      mcq('A chat product correctly reports the result of a match played this morning. What does that tell you about the model?',
        [['Little — the application probably fetched it with a search tool', true],
          ['The model\'s knowledge cutoff must be later than this morning', false],
          ['Models learn continuously from news as it is published', false],
          ['The model predicted the score from patterns in earlier matches', false]],
        'Fresh facts come from tools the product adds. The model itself is unchanged since training.'),
      mcq('Asked why it gave an answer, a model produces a tidy step-by-step explanation. How should you treat it?',
        [['As more generated text, not a reliable report of its process', true],
          ['As a precise record of the internal steps behind the answer', false],
          ['As proof the answer is right, since it explained its reasoning', false],
          ['As worthless, because models never produce sound reasoning', false]],
        'The explanation may be useful to check, but it is produced the same way as the answer. It is neither proof nor worthless.'),
    ],
  },
  {
    unitCode: 'T_GENAI_PRACTICE',
    notes: `No new ideas. This unit is about probing a model deliberately — predicting where it will fail,
testing that prediction fairly, and recording evidence somebody else could check.

**The method, for every probe:**

1. **Pick one limit from this topic** to test: invented facts, a false premise, the knowledge
   cutoff, exact arithmetic, letter-level work, variation between runs, or a context window.
2. **Write your prediction before running anything.** What do you expect, and why, in terms of how
   the model works?
3. **Choose a question whose answer you can verify independently** — an official page, a textbook,
   a calculator, a count by hand. A probe with no checkable answer produces no evidence.
4. **Run it more than once, in fresh chats.** One run shows what happened once; several show
   whether it is typical.
5. **Change one thing at a time.** Add the source document, or ask for code instead of mental
   arithmetic, and keep everything else identical, so you know what caused any difference.
6. **Record exactly.** The prompt as sent, the reply copied word for word, the product, the date,
   and any visible settings.
7. **State what the evidence does not show.** One product on one date is not every model forever.

**A log entry looks like this:**

    Limit tested:  false premise
    Prediction:    it will explain an event that never happened
    Prompt:        (copied exactly)
    Runs:          3 fresh chats, same product, same date
    Result:        2 of 3 explained it; 1 corrected the premise
    Checked against: (the source showing the premise is false)
    Conclusion:    likely on this product; not shown for others

**Checklist before you call a probe finished:**

- The prompt and reply are copied, not paraphrased.
- The correct answer came from somewhere other than a model.
- More than one run, and the count is reported.
- Only one thing changed between compared runs.
- The failure is named using this topic's terms.
- The conclusion claims no more than the runs support.`,
    mcqs: [
      mcq('You want evidence that a model\'s answers to one factual question vary. Which probe is best?',
        [['Ask the same question several times in fresh chats and compare', true],
          ['Ask once, then ask the model how much its answers tend to vary', false],
          ['Ask once in a long chat and keep adding more follow-up detail', false],
          ['Ask several different questions once each and compare the tone', false]],
        'Variation is measured by repeating the same input under the same conditions. The model\'s own account of its variability is not evidence.'),
      mcq('Which prompt is a fair probe of the false-premise weakness?',
        [['Ask for the reasons behind an event that never took place', true],
          ['Ask for a summary of an event that is widely documented', false],
          ['Ask the model whether it ever believes false things', false],
          ['Ask for an event\'s date and then ask it to double-check', false]],
        'The probe must contain a false assumption whose falsity you can show. The others test something else or rely on self-report.'),
      mcq('A letter-counting probe fails in a single run. Which conclusion is most defensible to record?',
        [['This prompt failed on this product, on this date, in one run', true],
          ['All language models are unable to count letters in any word', false],
          ['The model is broken and should not be used for any other task', false],
          ['Letter counting will be fixed in the very next model release', false]],
        'The conclusion must stay within the evidence. More runs, and more words, would be needed to say anything broader.'),
      mcq('To test whether giving the source text reduces invented details, what should differ between the compared runs?',
        [['Only whether the source text is included, with all else fixed', true],
          ['The question, the product and the source, to cover more ground', false],
          ['The wording of the question each time, to avoid a stale reply', false],
          ['Nothing at all; the original prompt is simply run once more', false]],
        'Changing one variable is what lets you attribute any difference to it. Changing several at once makes the result uninterpretable.'),
      mcq('A model answers 23 × 47 correctly. Why is this weak evidence about its arithmetic?',
        [['Small products are common in text, so this may be familiar', true],
          ['The answer must be confirmed by asking the model a second time', false],
          ['Correct answers can never tell you anything about a model', false],
          ['A correct answer proves arithmetic is now reliable in all models', false]],
        'A limit shows up where the pattern is unfamiliar, such as long multiplications. An easy case that succeeds does not test the claim.'),
    ],
    checkpoint: [
      mcq('Which record is the most useful evidence that a model fabricated something?',
        [['Exact prompt, verbatim reply, and the source showing it is false', true],
          ['A summary of the reply, and a note that it seemed wrong at the time', false],
          ['A screenshot of the reply with the product name clearly visible', false],
          ['The model\'s own admission that its earlier answer was mistaken', false]],
        'Somebody else must be able to see what was asked, what came back, and why it is wrong. An admission from the model can itself be generated on request.'),
      mcq('Why write your prediction down before running a probe?',
        [['It shows whether you understood the limit, not just the result', true],
          ['The model reads your prediction and tries harder to beat it', false],
          ['Products refuse prompts unless a prediction is included first', false],
          ['It guarantees the probe will produce a failure worth recording', false]],
        'A prediction grounded in how the model works turns an anecdote into a test of your understanding.'),
      mcq('A classmate\'s report concludes "AI cannot do maths" after one failed multiplication. What is the main flaw?',
        [['One run on one product is generalised to all models and tasks', true],
          ['Multiplication is not really maths, so it tested something else', false],
          ['The report should have used a harder calculation to convince', false],
          ['The classmate should have asked the model to confirm its answer', false]],
        'The evidence supports a narrow claim at most. Overgeneralising from one run is the commonest error in this kind of report.'),
    ],
  },

  /* ── T_AI_LITERACY · using these tools well and responsibly ──────────────────────────── */
  {
    unitCode: 'T_AI_LITERACY_CLEAR_INSTRUCTIONS',
    notes: `Most disappointing output comes from a request that left too much unsaid. A model rarely
asks what you meant; it fills every gap with the most generic reading, and generic is what you get.

**Vague:**

    Explain recursion.

**Clear:**

    Explain recursion to a first-year who knows Python loops but has
    never seen a function call itself. Use one example that computes a
    factorial, trace the calls for 3, and keep it under 250 words.

The second version produces something usable on the first try, because it states the parts the
first one left for the model to guess.

**The parts of a clear request:**

- **The task**, as a precise verb: explain, summarise, compare, rewrite, list, critique.
- **The audience and level**: who will read it and what they already know.
- **The format**: bullet points, a table with named columns, code only, a paragraph.
- **The length**, as a number rather than "not too long".
- **Constraints**: British spelling, no external libraries, only what the syllabus covers.
- **What good looks like**: "a reader should be able to trace the calls by hand afterwards".

**Keep instructions apart from material.** When you paste an email or a paragraph to work on, mark
where it begins and ends — for example between lines of three quotation marks — and refer to "the
text between the markers". Otherwise the model may treat part of your material as instructions.

**Say what you want, not only what to avoid.** "Do not be too formal" leaves the target open;
"write as one classmate to another" names it.

**The diagnostic.** Before blaming the model, ask: could a capable person have produced what I
wanted from exactly these words? If not, the request is the problem, and rewording it is faster than
regenerating.

**The misconception: there are magic words.** No secret phrase unlocks better answers, and neither
flattery nor rudeness is a technique. Clarity about task, audience, format and limits is what works,
and it is the same clarity a human helper would need.

**Clarity is also about purpose.** "Explain why my loop never ends" and "write my lab solution" are
both clear, but they ask for different things. On assessed work, stating that you want an
explanation rather than an answer keeps the tool helping you learn — and within course rules that
allow AI for help but not for doing the work.`,
    mcqs: [
      mcq('Which rewrite of "summarise this article" is clearest?',
        [['Summarise it in five bullet points for a classmate who missed the lecture', true],
          ['Summarise this article really well, and please make it a good summary', false],
          ['Summarise it the way an expert would, in as much detail as is needed', false],
          ['Summarise this article and do not make it too long or too short either', false]],
        'It fixes the format, the length and the reader. The others leave each of those for the model to guess.'),
      mcq('An answer came back generic and unhelpful. Which question should you ask yourself first?',
        [['Could a capable person have given what I wanted from those words?', true],
          ['Is the model I am using too small for this kind of request?', false],
          ['Would adding please and thank you have produced a better answer?', false],
          ['Should I send the same request again until a better one appears?', false]],
        'Most generic output is a generic request. Checking the request first is quicker than regenerating or switching tools.'),
      mcq('Why is "under 150 words" a better instruction than "not too long"?',
        [['It gives a target the output can be checked against', true],
          ['Models cannot read negative words such as not or never', false],
          ['Numbers use fewer tokens than words, so it costs less', false],
          ['Short instructions are always followed more closely', false]],
        'A concrete target removes the guess about what "too long" means. Models can read negation; it is the vagueness that hurts.'),
      mcq('Why mark where a pasted email begins and ends when asking for a reply to it?',
        [['So the instructions are not confused with the material itself', true],
          ['Because the model refuses any input without quotation marks', false],
          ['So the model knows to translate the email before replying', false],
          ['Because markers reduce the number of tokens the email uses', false]],
        'A pasted email may contain sentences that read like instructions. Clear boundaries tell the model which text is yours to act on.'),
    ],
    checkpoint: [
      mcq('Which request is most likely to produce a usable revision table on the first try?',
        [['Table comparing lists, tuples and sets: mutability, order, one use each', true],
          ['Tell me everything about lists, tuples and sets so that I understand them', false],
          ['Explain lists, tuples and sets the way a top professor would explain them', false],
          ['Give a detailed comparison of lists, tuples and sets, but keep it simple', false]],
        'It names the format, the columns and the scope. The last option contradicts itself, and the others leave format and scope open.', PE),
      mcq('A student believes a secret phrase makes a model give better answers. The best response is:',
        [['Stating task, audience, format and limits does far more', true],
          ['Correct: certain words unlock a hidden high-quality mode', false],
          ['Being rude to the model reliably makes it more careful', false],
          ['Only very long prompts work, whatever they happen to say', false]],
        'What improves output is information the model would otherwise have to guess. There is no hidden mode to unlock.', PE),
      mcq('Your course allows AI for explanations but not for writing graded code. Stuck on a lab, which request fits the rule?',
        [['Explain why my loop never ends, without writing the fix for me', true],
          ['Write the complete lab solution so I can study it after I submit', false],
          ['Rewrite my solution so it looks different from my classmates\' code', false],
          ['Give me the working answer, and I will change the variable names', false]],
        'It asks for understanding and leaves the graded work to you. The others obtain the code itself, which the rule forbids however it is disguised.', RU),
    ],
  },
  {
    unitCode: 'T_AI_LITERACY_CONTEXT',
    notes: `A model knows nothing about your situation: your syllabus, your Python version, what you have
already tried, the constraint your lecturer set, or who will read the result. Without that, it
assumes the most common case — which is often not yours.

**Without context:**

    Why is my code not working?

**With context:**

    I am a first-year using Python 3.12 on Windows. This function should
    return the average of a list of marks, but it raises the error below
    on an empty list. We have not covered exceptions yet, so please
    suggest a fix that uses an if statement.
    (the function)
    (the full error message)

**The kinds of context that change an answer:**

- **Purpose and situation**: what the output is for and where it will be used.
- **Audience**: who reads it and what they already know.
- **Source material**: the actual assignment brief, the lecture excerpt, the code, the full error.
- **Constraints**: versions, allowed libraries, word limits, what the course has covered.
- **What you have tried**, so the model does not suggest it again.

**Supply the real material, not a description of it.** Pasting the assignment's actual
requirements lets the model work from your brief rather than a typical version it imagines, and
answers grounded in supplied text invent less.

**More is not automatically better.** Irrelevant detail distracts, dilutes the parts that matter,
and uses up the context window. A useful test: would a helpful senior student need this to answer?
If not, leave it out.

**The misconception: it can see my work.** A model sees only what is in the conversation, plus
anything you have explicitly connected. It cannot see your screen, your project folder or the file
you mentioned but did not paste.

**Context is where oversharing happens.** Everything you paste leaves your machine. Replace real
names, roll numbers, phone numbers, passwords and keys with neutral labels such as STUDENT_A before
sending; the next units cover what must never be pasted. And the context has to be true: tell the
model the wrong Python version and its advice will be confidently wrong for your machine — a mistake
that is yours, not the model's.`,
    mcqs: [
      mcq('"Why is my code not working?" is sent with nothing else. What is most needed?',
        [['The code, the exact error, and what it was meant to do', true],
          ['A politer phrasing, so the model tries harder with it', false],
          ['A request that the answer be written in bullet points', false],
          ['The course name and the lecturer who set the exercise', false]],
        'Without the code and the error, the model can only list the common causes of every problem. With them it can address yours.'),
      mcq('Which piece of context most changes advice on fixing a Python error?',
        [['The Python version and the full error message received', true],
          ['How long you have spent working on the problem so far', false],
          ['Whether you prefer a dark or a light theme in the editor', false],
          ['How many other students have hit the same problem too', false]],
        'Both change what the correct fix is. Features and messages differ between versions, and the full error usually names the cause.'),
      mcq('Why can adding a lot of unrelated background make an answer worse?',
        [['Irrelevant detail distracts from what the task needs', true],
          ['Models refuse any prompt longer than one paragraph', false],
          ['Extra background raises the temperature of the reply', false],
          ['Long prompts are always read from the end backwards', false]],
        'Relevant context helps and irrelevant context competes with it for attention and for space in the window.'),
      mcq('Pasting the actual assignment brief helps because:',
        [['The model works from your requirements, not a typical version', true],
          ['Assignments are stored in its training data under their titles', false],
          ['It lets the model inform your lecturer that you are working on it', false],
          ['The model is required to follow any document that it is given', false]],
        'Otherwise it answers a generic version of the task, which may differ from yours in exactly the details that are marked.'),
    ],
    checkpoint: [
      mcq('Asking an assistant for a revision plan, which context would change the plan most?',
        [['Exam date, topics to cover, and hours available each day', true],
          ['Your favourite subject and the time you usually wake up', false],
          ['The name of your college and the city where it is located', false],
          ['That the plan should be very good and well organised', false]],
        'Those three facts determine what a sensible plan contains. The others either do not change it or add no information.', PE),
      mcq('You want help writing a hostel complaint that involves a roommate, and your notes include their name and phone number. What is the best approach?',
        [['Describe the situation but leave out the name and number', true],
          ['Paste everything, because the model needs every detail', false],
          ['Include the details, then ask the model to forget them', false],
          ['Include only the number, as the name is the sensitive part', false]],
        'The help you need does not depend on who the roommate is. Their details are not yours to share, and a request to forget does not undo sending them.', RU),
      mcq('You tell an assistant your code runs on Python 3.12, but your lab machine has Python 3.8. What follows?',
        [['Advice may use features your version lacks, and that error is yours', true],
          ['Nothing, since the model will detect the real version from the code', false],
          ['The model is at fault, since it should have asked you for proof', false],
          ['The advice is identical, because Python versions never differ', false]],
        'For example, the match statement arrived in Python 3.10. You supplied the context, so you are responsible for it being accurate.', RU),
    ],
  },
  {
    unitCode: 'T_AI_LITERACY_EXAMPLES',
    notes: `Some formats are easier to show than to describe. Giving a model a few worked examples of
what you want — often called **few-shot** prompting — is frequently more effective than a paragraph
of instructions.

**Describing the format** takes a paragraph and still leaves room for interpretation. **Showing
it** looks like this:

    Turn each note into a flashcard, in exactly this format.

    Note: a tuple cannot be changed after it is created
    Q: Can a tuple be modified after it is created?
    A: No. Tuples are immutable.

    Note: range(5) stops before 5
    Q: What is the last value produced by range(5)?
    A: 4. The stop value is excluded.

    Note: dictionary keys must be hashable

The model continues the pattern for the last note. With no examples the request is **zero-shot**;
with one it is one-shot.

**What examples control — very strongly.** Format, length, tone and level of detail. A model
copies surface features faithfully: if every example is one line, the output will be one line; if
every example is about lists, outputs drift towards lists; if an example contains a mistake, the
mistake is copied.

**Choosing good examples:**

- **Two or three**, not one. A single example gets copied too literally, topic and all.
- **Vary what should vary** (topic, wording) and **keep fixed what must stay fixed** (format).
- **Include an awkward case** and show how to handle it — for instance, a note too vague to make a
  question from, with the answer SKIP.
- **Check every example is correct**, because each one is treated as the definition of right.
- **Separate examples from the new input** clearly, and keep a short instruction alongside them.

**The misconception: examples are optional decoration.** For anything with a precise shape — a
marking scheme, a data format, a consistent style — examples are often the single most effective
thing in the prompt.

**Examples are content too.** Examples copied from real data can carry personal information into a
prompt; invented ones work just as well. And a classmate's graded work, or a marker's comments on
it, is not yours to use as example material.`,
    mcqs: [
      mcq('All three of your example summaries are one sentence long. What will the output most likely be?',
        [['One sentence, because examples set length strongly', true],
          ['A full paragraph, since the model ignores example length', false],
          ['Three sentences, one for each of the examples provided', false],
          ['A random length, as examples only affect vocabulary', false]],
        'Length is one of the surface features a model copies most faithfully. If you want a paragraph, show paragraphs.'),
      mcq('One of your examples has a misspelt field label. What is the risk?',
        [['The misspelling may be copied into every output that follows', true],
          ['The model will refuse to continue until the label is fixed', false],
          ['Nothing, since models correct examples before they use them', false],
          ['Only the first output will be affected by the misspelling', false]],
        'Examples are taken as the definition of correct, mistakes included. Checking them is part of writing them.'),
      mcq('When are examples most useful compared with a written description?',
        [['When the wanted format is easier to show than to describe', true],
          ['When the task is a single factual question with one answer', false],
          ['When the model already produces exactly what you want', false],
          ['When you want every output to vary as much as possible', false]],
        'Examples earn their place when shape and consistency matter. A one-line factual question gains nothing from them.'),
      mcq('Why vary the topics of your examples while keeping the format identical?',
        [['So the format is copied without narrowing the content', true],
          ['So the model does not get bored of seeing one topic', false],
          ['Because identical topics fill the context window faster', false],
          ['Because models only accept examples on different subjects', false]],
        'Whatever is constant across examples is treated as a requirement. Keep constant only what you want repeated.'),
    ],
    checkpoint: [
      mcq('You want marks converted to grades, with a special rule for absent students. What should your examples include?',
        [['A normal case and an absent student, so the rule is shown', true],
          ['Only normal cases, since absent students are rare in class', false],
          ['One long example containing every student in the class', false],
          ['Examples with no fixed format, so the model can choose one', false]],
        'The awkward case is exactly where a model guesses if it is not shown. One example of it is worth more than a paragraph describing it.', PE),
      mcq('Using a single example, every output ends up discussing the same topic as that example. What is the fix?',
        [['Add a couple more examples that differ in topic but share format', true],
          ['Remove the instruction so that only the example guides the model', false],
          ['Raise the temperature so the model stops copying the example', false],
          ['Place the example after the new input rather than before it', false]],
        'With one example, everything about it looks like a requirement. Varied examples show which features are the pattern.', PE),
      mcq('For examples of good feedback comments, you consider pasting a classmate\'s marked report with the marker\'s notes. What is the best choice?',
        [['Write invented examples rather than use their work and notes', true],
          ['Paste it, since the report has already been marked and returned', false],
          ['Paste it with the grade removed, so that it becomes anonymous', false],
          ['Paste only the marker\'s comments, as those are not their work', false]],
        'The report and the comments on it belong to your classmate\'s assessment record. Invented examples teach the format just as well.', RU),
    ],
  },
  {
    unitCode: 'T_AI_LITERACY_ITERATING',
    notes: `The first answer is a draft. Treating a model like a vending machine — one request, take
what comes out — wastes most of what it can do. Treating it as a conversation gets you from a
mediocre answer to a good one in a few turns.

**Feedback has to be specific.** "Make it better" gives the model nothing to act on.

    Turn 1: Explain list comprehensions with two examples.
    (The reply uses a nested comprehension and a lambda.)

    Turn 2: We have not covered lambda. Replace the second example
            with one that filters even numbers from a list, and keep
            the first example exactly as it is.

    Turn 3: Good. Now add the equivalent for loop under each example,
            so the two can be compared line by line.

Each turn says what is wrong, what to change, and what to keep.

**Habits that make iteration work:**

- **Change one thing per turn** where you can, so you know which change helped.
- **Say what to keep**, or a good section may be rewritten along with the bad one.
- **Ask for options**: "give three different opening sentences" is often faster than refining one.
- **Ask it to question you**: "before answering, ask me anything you need to know" suits a complex
  request where you are not sure what detail matters.
- **Start fresh when it drifts.** After many turns, a conversation fills with rejected attempts that
  still influence the replies. Open a new chat with a better first prompt that includes what you
  learned.
- **Know when to stop.** If three rounds bring no improvement, the task may need something the model
  lacks — current facts, your local rules, exact computation. Go to a source instead.

**The misconception: regenerating is iterating.** Pressing regenerate samples again from the same
input. It can give a different answer but adds no information, so it cannot steer towards what you
need.

**Iterate towards quality, not agreement.** It is easy to keep rephrasing until the model says your
argument is flawless — and because models tend to go along with the direction of a conversation, it
eventually will. That is not evidence. Ask instead for the strongest objection to your argument, and
judge the answer yourself.

**Keep the prompt that worked.** When a sequence of turns finally produces what you need, rewrite
it as one clear first prompt and save it. Next time you start where you finished.`,
    mcqs: [
      mcq('Which follow-up is most likely to improve a draft?',
        [['Keep the table, but cut the introduction to two sentences', true],
          ['That is not quite it, so please try again and do it better', false],
          ['Make it much better and more professional than it is now', false],
          ['Could you redo the whole thing from the very beginning', false]],
        'It says what to keep and exactly what to change. The others ask for improvement without saying what improvement means.'),
      mcq('Why change one thing per follow-up where possible?',
        [['You can tell which change produced the improvement', true],
          ['Models accept only one instruction in each message', false],
          ['Each follow-up has a strict limit on its word count', false],
          ['Several changes raise the temperature of the reply', false]],
        'Models can handle several instructions, but when many things change at once you cannot learn what worked.'),
      mcq('After many turns, a model keeps returning to an approach you have already rejected. What is the best move?',
        [['Start a new chat with a better first prompt using what you learned', true],
          ['Keep repeating the rejection in capital letters until it listens', false],
          ['Regenerate the same reply until a different approach appears', false],
          ['Accept that approach, since the model has decided it is best', false]],
        'The rejected attempts are still in the context and keep influencing replies. A fresh start removes them.'),
      mcq('Pressing regenerate differs from iterating because it:',
        [['Samples again without giving the model any new information', true],
          ['Sends your feedback to the developers to improve the model', false],
          ['Always returns exactly the answer it gave the first time', false],
          ['Clears the context window and starts a brand new chat', false]],
        'A different sample may be better or worse by chance. Only feedback tells the model which direction you need.'),
    ],
    checkpoint: [
      mcq('When is it most useful to ask the model to put clarifying questions to you before it answers?',
        [['When your request is complex and you are unsure what detail it needs', true],
          ['When you want the fastest possible reply to a simple factual query', false],
          ['When you already know exactly what you want and have said all of it', false],
          ['When you want the model to decide the requirements on your behalf', false]],
        'Its questions surface the gaps in your request before a draft is built on guesses about them.', PE),
      mcq('Three rounds of refinement have not improved an answer that depends on this year\'s exam dates. What is the reasonable conclusion?',
        [['The task needs facts the model lacks, so use an official source', true],
          ['A fourth and fifth round will eventually produce the right dates', false],
          ['The prompt is too polite, and a firmer tone will fix the dates', false],
          ['The dates are probably right, since the model kept repeating them', false]],
        'Iteration improves how a model uses what it has. It cannot supply facts that were never in front of it.', PE),
      mcq('You keep rephrasing until the model agrees your essay argument has no weaknesses. What is the problem?',
        [['Steering a model into agreement is not evidence the argument is sound', true],
          ['The model\'s agreement only becomes final after five or more turns', false],
          ['Rephrasing a question to a model breaks most universities\' rules', false],
          ['Nothing: a model that agrees after scrutiny has checked the logic', false]],
        'Models tend to follow the direction of a conversation. Presenting their agreement as a check on your work misleads you and your reader.', RU),
    ],
  },
  {
    unitCode: 'T_AI_LITERACY_VERIFYING',
    notes: `When you repeat something a model told you — in an assignment, a group chat, a code review —
you are vouching for it. Checking first is not distrust for its own sake; it is what makes the
claim yours to repeat.

**Different claims need different checks, and some are cheap:**

- **Code**: run it on inputs whose correct outputs you already know.
- **Arithmetic**: recompute it, or have code do it.
- **A standard definition**: the textbook or the official documentation.
- **A quotation or citation**: find the original. Does it exist, and does it say that?
- **A figure or date**: the primary source — the official page, the actual report.
- **A library function**: the library's own documentation.

**Some are expensive or should not be self-checked at all.** Summaries of long documents you have
not read need spot-checks against the original. Medical, legal and financial advice needs a
qualified person, because a plausible wrong answer can do real harm.

**A method that scales:**

1. Break the answer into individual claims.
2. Mark the ones you will actually rely on.
3. Check each against a source independent of any model.
4. Record what you checked and against what.

**Match the effort to the stakes.** Idle curiosity needs little. Something you submit needs the
claims you rely on checked. Something that affects other people needs the most.

**What does not count as a check.** Asking the same model whether it is sure. Asking a second
chatbot, which may share similar training data and similar mistakes — useful for spotting issues,
but not a source. A link you have not opened: it may not exist, or may not say what was claimed.
Detail and fluency, which cost a model nothing to produce.

**Prompts that make checking easier.** "List each factual claim separately." "For each point,
quote the sentence from my document that supports it." These do not make the answer true, but they
turn one large verification job into several small, quick ones.

**The misconception: it gave a source, so it is verified.** A source you have not opened is one
more piece of generated text. Verification happens when you read the source, not when the model
names one.`,
    mcqs: [
      mcq('What is the cheapest reliable check on a generated Python function?',
        [['Run it on inputs whose correct outputs you already know', true],
          ['Ask the model to confirm that the function is correct', false],
          ['Read the function once and see whether it looks tidy', false],
          ['Check that every line has an explanatory comment on it', false]],
        'Running known cases gives direct evidence in seconds. Self-confirmation, tidiness and comments are all things a model can produce for wrong code.'),
      mcq('An answer includes a link supporting its key figure. Before relying on the figure, you should:',
        [['Open the link and check it exists and contains the figure', true],
          ['Trust it, since a model cannot produce a link that is fake', false],
          ['Check that the link\'s domain ends in .org or .edu first', false],
          ['Ask the model to repeat the figure to be sure of it', false]],
        'Links are generated text until opened. Many point nowhere, or to a page that says something different.'),
      mcq('Why is asking a second chatbot to confirm the first one\'s claim a weak check?',
        [['Both may share similar training data and similar errors', true],
          ['Chatbots are not allowed to contradict other chatbots', false],
          ['The second will always disagree to seem more helpful', false],
          ['Two chatbots cannot answer the same question at once', false]],
        'Agreement between two generated answers is not independent evidence. A primary source is.'),
      mcq('You used AI to summarise a 40-page report for an assignment. Which check is proportionate?',
        [['Find several specific points from the summary in the report', true],
          ['Reread the summary slowly to see whether it sounds convincing', false],
          ['Ask the model to rate its own summary out of ten for accuracy', false],
          ['Skip checking, as a summary cannot introduce any new claims', false]],
        'Spot-checking specific statements against the original catches both invented and distorted points without rereading all 40 pages.'),
    ],
    checkpoint: [
      mcq('Which claim deserves the most careful verification before you act on it?',
        [['A medicine dosage you plan to give a family member', true],
          ['A synonym for a word in a birthday message to a friend', false],
          ['A suggested title for your personal blog post on cricket', false],
          ['A reminder of what a for loop is used for in Python', false]],
        'Verification effort should follow the stakes. A wrong dosage harms somebody; this one belongs with a doctor or pharmacist, not a chatbot.', RU),
      mcq('Which prompt makes a generated answer about your document easiest to verify?',
        [['For each point, quote the sentence in my document that supports it', true],
          ['Be completely accurate and never make any mistakes in your answer', false],
          ['Answer confidently, so that I do not need to double-check anything', false],
          ['Give me a long, detailed answer containing as much as you possibly can', false]],
        'Quoted support turns verification into a quick lookup for each point. Asking for accuracy does not change how the answer is generated.', PE),
      mcq('You put an unchecked AI claim into a group project report and it turns out to be wrong. Who is responsible?',
        [['You are, because you presented it as reliable', true],
          ['The AI company, as its product made the claim', false],
          ['Nobody, since AI mistakes are nobody\'s fault', false],
          ['The group leader, who should check every line', false]],
        'Whatever produced the claim, you chose to repeat it without checking. That choice is where the responsibility sits.', RU),
    ],
  },
  {
    unitCode: 'T_AI_LITERACY_PRIVACY',
    notes: `Whatever you paste into an AI tool leaves your device. Depending on the product and your
settings, it may be stored, read by staff reviewing conversations, used to improve future models,
or exposed if the service is breached. Consumer tools and tools your institution has approved often
work under different terms. Check the settings, and write every prompt as if someone else might read
it.

**Never paste:**

- **Credentials**: passwords, one-time codes, API keys, access tokens, database connection strings,
  \`.env\` files. If a working key has already been pasted, revoke it and create a new one; deleting
  the chat does not undo sending it.
- **Other people's personal data**: names with phone numbers, Aadhaar numbers, addresses, marks,
  health details, screenshots of a group chat. Their consent is not yours to give.
- **Confidential work**: internship or company code, client data, unreleased designs, anything under
  a non-disclosure agreement — unless the organisation has approved a tool for exactly that use.
  Organisations have legal duties for personal data under laws such as India's Digital Personal
  Data Protection Act, 2023, and an employer will expect you to respect them.
- **Assessment material you may not share**: unreleased question papers, other students'
  submissions.

**Think twice about your own sensitive data** — identity documents, finances, health. It is your
decision, but make it deliberately.

**How to get help anyway:**

- **Redact and substitute.** Replace real values with obvious stand-ins:

      # before
      conn = connect(host="db.internal-company.in", user="admin", password="Vid@2024!")
      # after
      conn = connect(host="DB_HOST", user="DB_USER", password="DB_PASSWORD")

- **Build a minimal example.** Cut the problem down to the smallest piece of code that still shows
  it, with invented data. This protects the original and usually gets a better answer, because the
  model is not distracted by everything else.
- **Describe instead of pasting**, when the structure matters more than the content.
- **Use the approved tool** for work data, if your institution or employer provides one.

**The misconception: deleting the conversation removes the data.** The prompt may already have been
logged or retained under the service's policy. Prevention is the only reliable protection.

**Why this matters.** A leaked key can be abused within minutes of exposure, and a leak of other
people's data harms people who never chose to use the tool at all.`,
    mcqs: [
      mcq('You pasted code containing a working API key into a chatbot. What is the most important next step?',
        [['Revoke the key and issue a new one, then remove it from the code', true],
          ['Delete the chat, since that removes the key from every system', false],
          ['Ask the chatbot to forget the key for the rest of the session', false],
          ['Nothing, because chatbots have no way of using an API key', false]],
        'Once sent, the key may be stored beyond your reach. Revoking it makes any stored copy useless.'),
      mcq('Which is safe to paste into a general AI tool for debugging help?',
        [['A small made-up example that reproduces the same error', true],
          ['The internship project\'s database file, to show real rows', false],
          ['A screenshot of the class group chat showing the bug report', false],
          ['The project\'s .env file, so the model sees the configuration', false]],
        'A minimal invented example contains nothing confidential and usually gets a clearer answer than the full original.'),
      mcq('A friend asks you to have AI improve their CV, which includes their phone number, email and home address. What is the issue?',
        [['It is their personal data, so sharing it is their decision', true],
          ['CVs are too long to fit inside any model\'s context window', false],
          ['AI tools refuse all documents that contain phone numbers', false],
          ['There is no issue once the improved CV has been returned', false]],
        'Only they can agree to their details being sent to a service. Removing the contact details first, or letting them do it themselves, avoids the problem.'),
      mcq('Your internship team works on company code. Which rule applies to pasting it into AI tools?',
        [['Use only tools the organisation has approved for that code', true],
          ['Paste freely, since code is not personal data about anyone', false],
          ['Paste it, as long as all of the code comments are removed', false],
          ['Paste half of it, so nobody could rebuild the whole system', false]],
        'Company code is confidential whether or not it contains personal data. The organisation decides which tools may see it.'),
    ],
    checkpoint: [
      mcq('Which item must never go into a prompt?',
        [['The password to your college email account', true],
          ['A description of an error you are seeing', false],
          ['A short quotation from a published textbook', false],
          ['A list of invented names used as test data', false]],
        'A credential gives access to everything behind it. The others contain nothing that can be misused.', RU),
      mcq('You need help with a bug in code that processes real customer records. Which prompt gets useful help without exposing anything?',
        [['The same logic with invented records that trigger the bug', true],
          ['The full code and a sample of real records marked private', false],
          ['A general question with no code, asking what bugs exist', false],
          ['The real records only, since the logic itself is not secret', false]],
        'A minimal reproduction keeps the problem and drops the data. Marking data private does not change where it goes, and a question without code cannot be answered well.', PE),
      mcq('A tool\'s settings say prompts may be used to improve its models. Your group project spreadsheet includes teammates\' marks. What should you do?',
        [['Leave their marks out, since they did not agree to share them', true],
          ['Paste it, since improving models is a harmless purpose', false],
          ['Paste it, provided every teammate is in the same class', false],
          ['Paste it, as marks do not count as personal information', false]],
        'Marks tied to named people are personal data, and the decision to share them is theirs. The task can almost always be done with the marks removed or invented.', RU),
    ],
  },
  {
    unitCode: 'T_AI_LITERACY_HONESTY',
    notes: `Using AI is not dishonest. Hiding how you used it, or using it where the rules say not to,
is.

**Rules differ, so find the one that applies.** Policies vary between institutions, courses and
even individual assignments. Some forbid AI for graded work. Some allow it for particular tasks —
brainstorming, grammar, explaining an error — provided you say so. Some encourage it. When the
brief says nothing, ask the instructor before you start, not after you submit. Until you know, treat
graded work as not permitting it.

**Academic integrity.** Submitting AI-generated work as your own where that is not permitted is
misrepresenting authorship — in the same family as copying from another student. Where use is
permitted with disclosure, using it without disclosing is still a breach, because disclosure was
the condition.

**Disclosure that is actually useful** names the tool, what you used it for, how you checked it,
and what you changed:

    AI use: I used a chat assistant to explain the error "list index
    out of range" and to suggest test cases. I wrote the function
    myself. Two of its suggested tests had wrong expected values,
    which I corrected after working them out by hand.

"Some AI may have been used" tells a marker nothing.

**Keep a trail.** Save the prompts you sent, the replies you relied on, and your drafts. If your
work is ever questioned, that record is your evidence.

**Detectors are unreliable.** Tools claiming to detect AI-written text produce false positives on
genuine student writing and miss edited AI text. Do not rely on being undetected, and do not assume
a flag proves anything. Drafts and notes are what show how work was really produced.

**Can you explain it?** If you cannot explain or reproduce a piece of work with the tool closed, it
is not yet yours in the sense that assessment cares about — and a viva, an interview or your next
course will show it.

**Beyond college.** Workplaces have AI policies too, and a take-home coding test or a job
application written by AI misrepresents your ability to the people deciding whether to hire you.

**The misconception: if it is not detected, it is fine.** Honesty is not about detection. It is
about whether the person reading your work is being told the truth about who did what.

**And responsibility stays with you.** Errors in submitted work are yours, whatever tool produced
the first draft.`,
    mcqs: [
      mcq('Your assignment brief says nothing about AI. What should you do before using it?',
        [['Ask the instructor what is allowed for this assignment', true],
          ['Use it freely, since anything not banned is permitted', false],
          ['Use it but avoid mentioning it, in case it is not allowed', false],
          ['Assume the policy of a different course you took applies', false]],
        'Policies vary even between assignments. Asking first costs a message; guessing wrong can cost a misconduct case.'),
      mcq('Which disclosure statement is most useful to a marker?',
        [['The tool, what you used it for, and how you checked its output', true],
          ['A note saying some AI may have been involved somewhere in it', false],
          ['A list of every AI product you have used at any time this term', false],
          ['The model\'s own statement that it helped with the work honestly', false]],
        'It tells the marker exactly which parts are your work and how the rest was verified. Vague or irrelevant statements tell them nothing.'),
      mcq('An AI-text detector flags an essay you wrote entirely yourself. What is the best evidence in your favour?',
        [['Your drafts, notes and a record of how the work was produced', true],
          ['A second detector that happens to give a lower AI score', false],
          ['A chatbot\'s statement saying that it did not write the essay', false],
          ['The claim that detectors are never wrong about human writing', false]],
        'Detectors are unreliable in both directions. A record of your process is direct evidence; another detector score is not.'),
      mcq('A policy permits AI help provided it is disclosed. Using it without disclosing is:',
        [['Still a breach, because disclosure was the condition of use', true],
          ['Fine, as the use itself was allowed under the policy anyway', false],
          ['Fine, provided the final work received a passing grade', false],
          ['A breach only if the AI\'s output contained factual errors', false]],
        'Permission came with a condition. Meeting half of it misrepresents how the work was produced.'),
    ],
    checkpoint: [
      mcq('In a course that forbids AI for reports, you submit a generated report with a few words changed. What is this?',
        [['Misrepresenting authorship, much like copying another person', true],
          ['Acceptable, since nobody else submitted exactly the same text', false],
          ['Acceptable, because the changed words make the work your own', false],
          ['A minor formatting matter, unless the report scores highly', false]],
        'Changing a few words does not change who did the work. Presenting it as yours breaks the rule it was submitted under.', RU),
      mcq('Your course allows AI as a tutor but not for producing answers. Which prompt fits that policy?',
        [['Ask me questions that lead me to the bug, but do not fix it', true],
          ['Write the answer, and I will retype it in my own handwriting', false],
          ['Solve it step by step, and label the result as my own work', false],
          ['Fix the bug quietly, so that the change is hard to notice', false]],
        'Guiding questions keep the thinking with you, which is what a tutor does. The others obtain the answer and disguise it.', PE),
      mcq('In a viva, you cannot explain a function from your AI-assisted submission. What does that indicate?',
        [['The work is not yet yours in the sense assessment requires', true],
          ['The examiner asked about a part that was not being assessed', false],
          ['Vivas are unfair to students who used approved AI tools', false],
          ['The function must be wrong, since it cannot be explained', false]],
        'Assessment measures what you can do. Code you cannot explain is evidence of what a tool did, even if using the tool was allowed.', RU),
    ],
  },
  {
    unitCode: 'T_AI_LITERACY_PRACTICE',
    notes: `No new ideas. These exercises complete real tasks with AI and leave a trail someone else could
audit — which request was made, what came back, what was checked, and what was changed.

**The method, for every task:**

1. **Check the policy** for this piece of work and write down what it allows.
2. **Decide the split**: what you will do yourself, and what you will ask for help with.
3. **Write the first prompt** with task, audience, format, length and constraints; add the
   context the task needs; add two or three examples if the shape matters.
4. **Strip anything private** — names, numbers, credentials, confidential material — before sending.
5. **Iterate with specific feedback**, and start a fresh chat if the conversation drifts.
6. **List the claims you will rely on** and check each against an independent source, or by running
   the code.
7. **Edit the result into your own work**, and make sure you can explain every part of it.
8. **Write the disclosure**: tool, purpose, what you checked, what you changed.

**A trail entry looks like this:**

    Task:            (what you were producing)
    Policy:          (what this assignment allows)
    Prompt 1:        (copied exactly as sent)
    Reply relied on: (key parts copied word for word)
    Changes and why: (what you rewrote, cut or corrected)
    Claims checked:  (each claim, and the source it was checked against)
    Removed:         (private details taken out before sending)
    Disclosure:      (the statement you submitted)

**Checklist before you submit:**

- The policy was checked, and your use fits it.
- No prompt contained personal data, credentials or confidential material.
- Every factual claim you rely on was checked outside any model.
- Every sentence and every line of code is something you can explain.
- The trail matches what you actually did, including the parts that went badly.
- The disclosure is specific enough that a marker could tell your work from the tool's.`,
    mcqs: [
      mcq('For a poster announcing a college coding contest, which first prompt best follows the method?',
        [['Poster text for first-years: coding contest, Friday 5 pm, Lab 3, under 60 words', true],
          ['Make a really attractive poster for our coding contest that people will love', false],
          ['Write something for our coding contest, you know, the kind of thing that works', false],
          ['Poster for our coding contest with every student coordinator\'s phone number', false]],
        'It states audience, the facts to include and a length. The last option also puts other people\'s phone numbers into a prompt.'),
      mcq('An assistant\'s draft for your report includes a statistic on internet users in India. What should your trail record?',
        [['The figure, the source you checked it against, and the result', true],
          ['That the figure looked reasonable, so it was accepted as it was', false],
          ['Only the final report, since the prompts are not part of the work', false],
          ['The figure, and the model\'s reassurance that it was correct', false]],
        'An auditable trail shows the check itself. A reassurance from the model is not a check.'),
      mcq('Your draft prompt includes a teammate\'s name and roll number to divide up tasks. How should you revise it?',
        [['Replace them with labels such as Member A before sending', true],
          ['Keep them, since roll numbers are not linked to anyone', false],
          ['Send it, then delete the chat once the reply has arrived', false],
          ['Add a line asking the model to keep the details private', false]],
        'The task works just as well with labels. Deleting afterwards or asking for privacy does not change what was sent.'),
      mcq('A generated draft is good but uses several terms you cannot explain. Following the method, what comes next?',
        [['Learn each term, or remove it, before the work is submitted', true],
          ['Submit it, since the terms are correct and the grade is safe', false],
          ['Ask the model for footnotes so a reader can explain the terms', false],
          ['Swap each term for a synonym so the work sounds more like you', false]],
        'Everything submitted must be something you can explain. Disguising what you do not understand hides the gap rather than closing it.'),
      mcq('An assistant suggested the structure of your lab report and you checked two formulas in the textbook. Which disclosure fits?',
        [['Structure suggested by an assistant; two formulas checked in the textbook', true],
          ['This report may have had some help from various tools while being written', false],
          ['No disclosure is needed, since the assistant did not write any sentences', false],
          ['Written entirely by me, with some occasional grammar help from friends', false]],
        'It names what the tool did and how its contribution was checked. Suggesting structure is still use that the policy may require you to disclose.'),
    ],
    checkpoint: [
      mcq('Your first prompt returned a generic essay outline. Which follow-up applies the method?',
        [['Rework section 2 around the two case studies from my notes below', true],
          ['This is too generic, so please do much better on the next attempt', false],
          ['Regenerate the outline until one appears that looks less generic', false],
          ['Write the whole essay instead, since the outline was not helpful', false]],
        'Specific feedback with the context the model lacked. The last option also moves from help to having the work done for you.', PE),
      mcq('Which trail entry would let an instructor audit how you used AI?',
        [['Prompts as sent, key replies, checks made, and what you changed', true],
          ['The name of the tool, with a note that it was used responsibly', false],
          ['The final submission alone, since the process is private to you', false],
          ['A screenshot of the tool\'s home page taken on submission day', false]],
        'An audit needs the process, not a label. Only the first shows what was asked, what was relied on and how it was checked.', RU),
      mcq('Midway through a task, you realise the policy permits AI for grammar only, but you used it for ideas. What is the honest course of action?',
        [['Tell the instructor and disclose what you used it for', true],
          ['Remove the evidence of that use from your trail first', false],
          ['Reword the ideas so that the use is no longer visible', false],
          ['Submit as planned, since nobody can own an idea anyway', false]],
        'The mistake is recoverable if you are open about it. Hiding it turns a misunderstanding into deliberate misrepresentation.', RU),
    ],
  },

  /* ── T_AI_CODING · generated code: read it, test it, own it ──────────────────────────── */
  {
    unitCode: 'T_AI_CODING_WHAT_IT_IS_GOOD_AT',
    notes: `Coding assistants are genuinely useful and genuinely unreliable. The skill is knowing which
jobs to hand over — and that depends as much on you as on the tool.

**Where generated code helps most:**

- **Boilerplate**: setting up \`argparse\`, reading a CSV file with the \`csv\` module, the skeleton
  of a class. Routine, well documented, and quick to check by running.
- **Syntax you have forgotten**: printing a number to two decimal places is \`f"{avg:.2f}"\`, and
  one run confirms it.
- **Explaining**: what an error message means, or what an unfamiliar snippet does.
- **Ideas for tests**: edge cases you had not thought of — which you then check yourself.
- **A first draft to react to**, when a blank file is the obstacle.
- **Translating** an idea between two languages you already know.

**Where it is weaker:**

- **Requirements only you know** — the exact rules your lecturer set, or what your team agreed.
- **Subtle logic**, where plausible and correct look the same at a glance.
- **Security-sensitive code** such as login, password storage or database queries.
- **Code that depends on a project it cannot see**, or on library versions newer than its training.

**The delegation rule: delegate what you could check.** If you would recognise a wrong answer, an
assistant can save you time. If you could not, you are not delegating; you are gambling, and you
will not know when you have lost.

**The trade-off for a first-year.** The exercises in your first programming course exist to build a
mental model of how code runs, and that model is built by writing loops, getting them wrong and
fixing them. Generating those exercises removes the practice the course is for. Use an assistant as
a tutor on fundamentals — "why does my loop stop early?" — and as a speed-up on things you can
already do.

**Two opposite misconceptions.** "AI writes code now, so learning to program is pointless" is
wrong: judging generated code requires exactly the skill it seems to replace. "AI code is always
rubbish" is also wrong: for common tasks it is often correct, and refusing to use it at all wastes
real time. Quality varies with the task, and the value depends on the person reviewing it.

**Why this matters.** Every later unit in this topic — reading, testing, spotting faults, owning
the result — assumes you have first chosen a task where checking is possible.`,
    mcqs: [
      mcq('Which task is most sensible to hand to a coding assistant?',
        [['Recalling the f-string syntax to print a number to two places', true],
          ['Deciding the grading rules your own lecturer has specified', false],
          ['Choosing which features your group project should include', false],
          ['Writing a lab exercise whose purpose is to practise loops', false]],
        'The answer is routine and one run confirms it. The others need knowledge only you have, or remove practice you need.'),
      mcq('The rule "delegate what you could check" means:',
        [['Use generated code only where you can tell if it is wrong', true],
          ['Only delegate tasks the assistant has handled correctly before', false],
          ['Check the assistant\'s licence before using any of its code', false],
          ['Delegate everything, then check whichever parts go on to fail', false]],
        'The value of generated code depends on being able to judge it. Without that, errors pass straight through.'),
      mcq('Why is generating first-year loop exercises a poor trade?',
        [['Writing them is the practice that builds the skill', true],
          ['Assistants cannot write loops correctly in Python', false],
          ['Loop exercises are too long for a context window', false],
          ['Generated loops always run slower than written ones', false]],
        'The exercise is the point. The finished code has no value of its own once the practice has been skipped.'),
      mcq('Which is a genuine strength of assistants when you meet unfamiliar code?',
        [['Explaining what an error message or snippet means', true],
          ['Knowing the requirements your team agreed last week', false],
          ['Guaranteeing the code is secure against all attacks', false],
          ['Seeing the rest of your project without being shown it', false]],
        'Explanations of common errors and constructs are well represented in training data. The other three are beyond what a model can know or promise.'),
    ],
    checkpoint: [
      mcq('"AI can write code now, so learning to program is pointless." What is the best response?',
        [['Judging generated code needs the very skill it seems to replace', true],
          ['Correct, since generated code no longer contains any faults', false],
          ['Wrong, because assistants are unable to write working code', false],
          ['Correct, but only for languages other than Python and C', false]],
        'Someone must decide whether the code is right, and that takes programming knowledge. Assistants do write working code, often, which is why judging it matters.'),
      mcq('Which request carries the most risk for a first-year?',
        [['Password storage for a club website, which they cannot evaluate', true],
          ['An example of reading lines from a text file, which they will run', false],
          ['A reminder of how to sort a list of tuples by the second item', false],
          ['An explanation of what a KeyError means in a short script', false]],
        'Security code can look correct and be badly wrong, and the requester cannot tell. The other three are easy to check.'),
      mcq('An assistant writes a clean argparse setup for your script in seconds. What makes this a good use?',
        [['It is routine code whose behaviour you can quickly run and check', true],
          ['argparse is too difficult for any person to learn to write', false],
          ['Generated argparse code is guaranteed to contain no faults', false],
          ['Using the assistant means you no longer need to read the code', false]],
        'Low risk, well documented and checkable in a moment. You still read it and run it.'),
    ],
  },
  {
    unitCode: 'T_AI_CODING_READING_IT',
    notes: `Generated code arrives looking finished. Reading it properly — before running it and before
trusting it — is the difference between using the code and being used by it.

**A method for reading code you did not write:**

1. **Restate what you asked for** in one sentence. That is the specification you are reading against.
2. **Read the signature.** What does it take, and what does it return or print? Does that match?
3. **Check every unfamiliar name.** For each import or call you do not recognise, confirm in the
   official documentation that it exists and does what the code assumes.
4. **Trace a small input by hand**, writing down each variable's value line by line, and predict the
   output before running anything.
5. **List the assumptions**: that the input is non-empty, sorted, numeric, positive, unique.
6. **Explain each line in your own words.** A line you cannot explain is a line to learn or remove.

**What to watch for:**

- **Names that promise more than the code does.** A function called \`is_valid_email\` that only
  checks for an @ sign.
- **Comments describing the intention rather than the behaviour.** A comment saying "handles empty
  lists" is a claim, not a fact; generated comments are wrong as often as the code is.
- **Unnecessary complexity.** An index loop where a plain \`for\` would do, or three helper functions
  for a five-line task. More code is more to be wrong.
- **Calls that return nothing useful.** \`result = items.sort()\` sets \`result\` to \`None\`, because
  \`list.sort()\` sorts in place.

**The misconception: it ran without an error, so it is correct.** Running shows only that it did
not crash on that input. Most faults in generated code produce a wrong answer quietly, and reading is
how you catch them before they reach anyone else.

**Why this matters.** You cannot test what you do not understand, because you do not know which
cases are risky. Reading comes first, and the worked example below shows how much a short trace
reveals.`,
    workedExample: `**The request:** "a function that returns the average of a list of marks".

    def average_marks(marks):
        total = 0
        for i in range(1, len(marks)):
            total += marks[i]
        return round(total / len(marks), 2)

**Signature.** Takes a list, returns a number. That matches the request.

**Trace with [70, 80, 90].** \`len(marks)\` is 3, so \`range(1, 3)\` gives \`i\` = 1 and then 2.
\`total\` becomes 80, then 170. The function returns \`round(170 / 3, 2)\`, which is 56.67. The
correct average is 80.

**Cause.** The loop starts at index 1, so the first mark is never added, while the division still
uses all three.

**Assumption found while reading.** An empty list reaches \`total / len(marks)\` with a length of
zero and raises \`ZeroDivisionError\`. The request did not say what should happen, so that needs a
decision rather than a guess.

**A version you can explain line by line:**

    def average_marks(marks):
        if not marks:
            return 0.0
        return round(sum(marks) / len(marks), 2)

Returning 0.0 for no marks is a choice. It belongs in the specification, and it needs a test.`,
    mcqs: [
      mcq('`for i in range(1, len(marks)):` visits every index except which?',
        [['Index 0, the first element', true],
          ['The last index of the list', false],
          ['Every second index in turn', false],
          ['None; it visits all of them', false]],
        'range(1, n) starts at 1 and stops before n, so it covers the last index but never index 0.'),
      mcq('A generated function named `is_valid_email` returns `"@" in text`. What does reading it reveal?',
        [['The name promises far more checking than the code does', true],
          ['It is correct, since every valid email contains an @', false],
          ['It will crash on any text that does not contain an @', false],
          ['The in operator works only on lists, so it cannot run', false]],
        'Text such as "@@" passes. A name states the intention; only the body shows the behaviour.'),
      mcq('Why trace a small input by hand before running generated code?',
        [['You predict the output, so a wrong result stands out', true],
          ['Hand-traced code runs faster when you do execute it', false],
          ['Tracing removes the need to run the code afterwards', false],
          ['Python needs a trace before it can run a function', false]],
        'Without a prediction, a plausible wrong answer looks fine. The trace also shows exactly where the behaviour departs from the intention.'),
      mcq('A generated comment says the function "handles empty lists". How should you treat it?',
        [['Check the code itself, because comments can be wrong', true],
          ['Trust the comment, since it was written with the code', false],
          ['Delete it, because generated comments are always wrong', false],
          ['Add a second comment agreeing with it, as confirmation', false]],
        'A comment is a claim about the code, generated the same way as the code. Read the body, and test the empty case.'),
    ],
    checkpoint: [
      mcq('Code meant to count students scoring 40 or more uses `if m > cutoff:` with a cutoff of 40. What does reading show?',
        [['A mark of exactly 40 is not counted, though it should be', true],
          ['Marks above 40 are counted twice by the comparison', false],
          ['The code is correct, because 40 is the cutoff given', false],
          ['Marks below 40 are counted, which inflates the total', false]],
        '"40 or more" needs >=. A boundary written with the wrong operator is invisible on typical marks and wrong on exactly the case that matters.'),
      mcq('Generated code imports a package you have never heard of. What should you do before running it?',
        [['Confirm from official sources that it exists and what it does', true],
          ['Install it straight away, since the assistant recommended it', false],
          ['Delete the import line and hope the rest still runs as before', false],
          ['Assume it is part of the standard library and simply carry on', false]],
        'Assistants invent package names, and a real package with that name may not be the one you want. Checking takes a minute.'),
      mcq('A generated function ends with `result = items.sort()` and then `return result`. What does it return?',
        [['None, because list.sort() sorts in place and returns None', true],
          ['A new sorted copy, leaving the original list unchanged', false],
          ['The original list in its unsorted order, left untouched', false],
          ['The sorted list, returned by sort() for convenience', false]],
        'sort() changes the list and returns None; sorted(items) returns a new list. Reading the call carefully catches this before a test does.'),
    ],
  },
  {
    unitCode: 'T_AI_CODING_TESTING_IT',
    notes: `Reading tells you what the code seems to do. Testing tells you what it actually does — but
only if the tests are aimed at what you asked for, not at what the code happens to do.

**Write the expected results before you run anything.** Work them out by hand from the
specification. If you run the code first and copy its output into your tests, the tests will
faithfully confirm whatever the code does, bugs included.

**Choose cases to break it, not to watch it pass.** Suppose the specification is: \`percentage(scored,
total)\` returns the percentage rounded to one decimal place, and raises \`ValueError\` when
\`total\` is 0.

    assert percentage(45, 50) == 90.0      # typical
    assert percentage(0, 50) == 0.0        # lower boundary
    assert percentage(50, 50) == 100.0     # upper boundary
    assert percentage(1, 3) == 33.3        # rounding

    try:
        percentage(10, 0)                  # invalid input
        assert False, "expected ValueError"
    except ValueError:
        pass

**Categories worth covering for almost any function:** a typical case; the boundaries (0, the
cutoff exactly, the maximum); empty input; a single item; duplicates; invalid input such as a
negative number or the wrong type; and something large.

**Asking the assistant for tests.** Useful for ideas, especially edge cases you missed. But when code
and tests come from the same request, both can share the same misunderstanding of the task, and
they will agree with each other perfectly. Check every expected value yourself.

**A test failure is a question, not a verdict.** If \`percentage(1, 3)\` returns 33.33, decide from
the specification which is right before changing either the code or the test.

**What passing tests prove.** That the code is right for those cases. Nothing more. Good tests are
chosen so that a likely fault would show up in at least one of them.

**A useful extra for small functions:** compare the generated version with a slow, obviously
correct version of your own on many inputs. Any disagreement points straight at a fault.

**The misconception: the assistant said it tested the code.** Unless a tool visibly ran the tests
and you can see the results, "I have tested this" is one more sentence of generated text.

**Why this matters.** Generated code is most often wrong at the edges — the empty list, the exact
boundary, the invalid input — and those are precisely the cases a quick trial on typical input never
reaches.`,
    mcqs: [
      mcq('Where should the expected outputs in your tests come from?',
        [['The specification, worked out by hand before running', true],
          ['Whatever the generated code prints the first time', false],
          ['The assistant\'s description of what the code returns', false],
          ['The output of a classmate\'s version of the program', false]],
        'Expected values copied from the code under test can only confirm it. The specification is the independent standard.'),
      mcq('The specification says marks of 40 or more pass. Which set of marks makes the most valuable boundary tests?',
        [['39, 40 and 41', true],
          ['10, 50 and 90', false],
          ['0 and 100 only', false],
          ['A single 75', false]],
        'Faults cluster at the boundary, such as > written for >=. Values far from 40 pass whether or not the comparison is right.'),
      mcq('Generated code and generated tests came from the same prompt, and every test passes. What is the weakness?',
        [['Both may share the same misunderstanding of the task', true],
          ['Generated tests are never run by the Python interpreter', false],
          ['Tests that pass the first time are always badly written', false],
          ['The assistant only tests a small sample of the lines', false]],
        'Agreement between two outputs of one misunderstanding proves nothing. Your hand-worked expected values break the loop.'),
      mcq('An assistant says "I have tested this code and it works". How should you treat that?',
        [['As a claim, unless a tool visibly ran tests you can inspect', true],
          ['As proof, since assistants cannot state things that are false', false],
          ['As a guarantee covering every input the code will receive', false],
          ['As a sign you only need to test the cases it did not mention', false]],
        'A statement of testing costs nothing to generate. Evidence is test output you can see, ideally from tests you wrote.'),
    ],
    checkpoint: [
      mcq('For a generated `average(nums)`, which single test is most likely to expose a case the assistant ignored?',
        [['An empty list', true],
          ['[10, 20, 30]', false],
          ['[1, 2, 3, 4, 5]', false],
          ['[100, 200]', false]],
        'Dividing by the length of an empty list fails, and nothing in a typical example reveals it. The other three are all ordinary cases.'),
      mcq('All ten of your tests pass. What can you conclude?',
        [['It is right for those ten cases, which is not proof of the rest', true],
          ['The code is correct for every input it will ever receive', false],
          ['Nothing, because passing tests carry no information at all', false],
          ['The code is correct, as long as the tests were generated', false]],
        'Tests are evidence, not proof. Their value depends on whether they include the cases where faults are likely.'),
      mcq('`assert percentage(1, 3) == 33.3` fails because the function returns 33.33. What is the right first step?',
        [['Check the specification for which rounding was asked for', true],
          ['Change the test to 33.33, since the code must be right', false],
          ['Delete the test, since floating-point results always vary', false],
          ['Ask the assistant which of the two values it prefers', false]],
        'The specification decides. If it says one decimal place, the code is wrong; if it says two, the test is.'),
    ],
  },
  {
    unitCode: 'T_AI_CODING_COMMON_FAULTS',
    notes: `Generated code fails in a small number of recurring ways. Knowing them turns "it does not
work" into a short list of suspects.

**The method:**

1. **Reproduce the problem with the smallest input** that shows it.
2. **Read the last line of the traceback**, then the line of your code it points to. A wrong answer
   with no traceback is a different kind of fault, covered below.
3. **Match the symptom** to one of the faults in this unit.
4. **Confirm the cause** in the official documentation, or with one targeted test, before changing
   anything.
5. **Fix it, and add a test** that would have caught it.

**Invented functions and packages.**

    AttributeError: module 'statistics' has no attribute 'average'

The name is plausible and does not exist; the real function is \`statistics.mean\`. Methods get
invented too: \`'str' object has no attribute 'reverse'\`. So do packages. Never install a package
simply because generated code imports it — attackers have registered package names that assistants
are known to invent.

**Outdated code.**

    ImportError: cannot import name 'Mapping' from 'collections'

Training data spans years of old code. \`Mapping\` lives in \`collections.abc\`, and the old import
stopped working in Python 3.10. A \`SyntaxError\` on \`print "done"\` means Python 2 code.

**Off by one: no error, wrong answer.** A sum from 1 to n that gives 45 for n = 10 used
\`range(1, n)\`, which stops before n.

**Missing edge cases.** It works on typical input and fails on the input nobody mentioned:
\`ZeroDivisionError\` averaging an empty list, \`ValueError\` from \`max()\` on an empty list,
\`IndexError\` taking the first item of nothing.

**A shared mutable default.**

    def add_item(item, basket=[]):
        basket.append(item)
        return basket

The default list is created once, when the function is defined, so calls that omit \`basket\` all
share it and earlier items reappear. Use \`basket=None\` and create the list inside the function.

**Text where a number was meant.** \`input()\` returns a string, so adding inputs 5 and 3 prints 53.

**Insecure code that passes every test.**

    query = f"SELECT * FROM students WHERE roll_no = '{roll}'"
    cur.execute(query)

Given the input \`' OR '1'='1\` the condition matches every row. This is SQL injection, and ordinary
tests never reveal it because ordinary input is harmless. The fix is a parameterised query, where
the driver sends the value as data and never as SQL:

    cur.execute("SELECT * FROM students WHERE roll_no = ?", (roll,))

Look for this family deliberately: \`eval()\` on user input, passwords written into the source,
certificate checks switched off.`,
    mcqs: [
      mcq('Generated code fails with `AttributeError: module \'statistics\' has no attribute \'average\'`. What is the cause and fix?',
        [['An invented name; the real function is statistics.mean', true],
          ['The statistics module is missing; install it with pip', false],
          ['average must be imported separately from the module', false],
          ['The list passed in is empty, so average is unavailable', false]],
        'statistics is part of the standard library and has mean, median and others, but no average. A plausible name that does not exist is the classic generated fault.'),
      mcq('A generated `add_student(name, roster=[])` returns names from earlier calls as well. What is the cause?',
        [['The default list is created once and shared between calls', true],
          ['Python keeps every list argument until the program exits', false],
          ['The function forgot to return the roster at the very end', false],
          ['Lists passed as arguments are always copied twice by Python', false]],
        'Default values are evaluated when the function is defined. Use None as the default and create a new list inside the function.'),
      mcq('Generated code with `from collections import Mapping` raises ImportError on your machine. What is most likely?',
        [['Outdated code; Mapping must come from collections.abc', true],
          ['Your Python installation is damaged and must be reinstalled', false],
          ['Mapping is an invented name that has never existed in Python', false],
          ['The import has to come after the code that uses Mapping', false]],
        'The name is real but its old location was removed in Python 3.10. Old tutorials in the training data still use it.'),
      mcq('A generated login lookup builds its query as `f"... WHERE user = \'{name}\'"` and passes every test. What is wrong?',
        [['Crafted input can change the query itself: SQL injection', true],
          ['f-strings are too slow for building database queries', false],
          ['The query fails for any name longer than a single word', false],
          ['Nothing, since the code passed every test that was written', false]],
        'Input containing a quote can rewrite the condition. Ordinary test names are harmless, so only reading for the pattern catches it.'),
    ],
    checkpoint: [
      mcq('A generated function meant to add up 1 to n returns 45 for n = 10. What is the most likely fault?',
        [['The loop uses range(1, n), which stops before n', true],
          ['Integer overflow, as 55 is too large for Python', false],
          ['The running total starts at 1 rather than at 0', false],
          ['The loop adds each number twice and then halves it', false]],
        '1 + 2 + ... + 9 is exactly 45, the answer without the final term. Python integers do not overflow, and starting the total at 1 would give 56.'),
      mcq('Generated code reads two numbers with `input()` and prints 53 when given 5 and 3. What is the cause?',
        [['input() returns strings, so + joined the text', true],
          ['The numbers were read in reverse order and added', false],
          ['Python adds the digits of both numbers first', false],
          ['The + operator multiplies whole numbers in Python', false]],
        'Adding two strings concatenates them. Converting with int() before adding fixes it.'),
      mcq('Using sqlite3, what is the safe fix for a query built as `"... WHERE roll_no = \'" + roll + "\'"`?',
        [['Use a ? marker and pass (roll,) as a separate argument', true],
          ['Strip every quote character from roll before joining it', false],
          ['Use an f-string instead, which escapes values for you', false],
          ['Convert roll to upper case so SQL keywords cannot match', false]],
        'The driver then sends roll purely as data. Stripping characters is fragile, f-strings escape nothing, and SQL keywords are not case-sensitive anyway.'),
    ],
  },
  {
    unitCode: 'T_AI_CODING_OWNERSHIP',
    notes: `When you submit, commit or merge code, you are claiming it: that it works, that it is safe,
that you are allowed to use it, and that you can maintain it. Whatever produced the first draft,
that claim is yours.

**What accepting generated code commits you to:**

- **Correctness**: you tested it against the specification, including the edges.
- **Safety**: you checked it for the fault families you know, security included.
- **Understanding**: you can explain every line, and could fix it when it breaks with no assistant
  to ask.
- **Honesty**: your use fits the rules that apply, and you disclosed it where they require.
- **Dependencies**: if a suggestion added a package, you checked that it is real, maintained and
  acceptable to depend on.

**In a course.** Graded code is evidence of what you can do. Where the policy forbids generated code,
submitting it misrepresents your ability. Where it allows use with disclosure, undisclosed use is
still a breach. In a group project your teammates are also relying on the part you claimed.

**At work.** "The AI wrote that part" is not accepted in a code review or after an outage. A
reviewer will reasonably hold back a change its author cannot explain, and the person who merged the
code is the one asked what went wrong.

**Licensing, kept in proportion.** Generated code can occasionally reproduce existing code closely,
and that code has a licence. For short common snippets the risk is small; in a company, its policy
on AI tools and licences decides.

**The misconception: ownership is a percentage.** "I changed 30% of it, so it is mine" confuses
editing with owning. What matters is whether you understand it, have verified it, and are honest
about where it came from. Code you fully understand and disclose is legitimately used; code you
reworded but cannot explain is not yours however much you changed.

**A practical test.** With the assistant closed, can you explain why the code takes this approach
rather than another, and could you rebuild it from scratch given time? If yes, you own it. If not,
the next step is learning it — not submitting it.

**Why this matters.** Tools will keep improving and the responsibility will not move. The people
trusted with generated code are the ones who treat it exactly as they would treat code they wrote.`,
    mcqs: [
      mcq('Generated code you merged causes a bug in the team project. In the review, who is answerable?',
        [['You, since merging it meant vouching for the change', true],
          ['The assistant\'s vendor, as its tool produced the fault', false],
          ['The reviewer, who alone was responsible for catching it', false],
          ['Nobody, because generated faults are treated as accidents', false]],
        'Merging is a claim that the change is ready. The source of the first draft does not transfer that claim to anyone else.'),
      mcq('"I changed 30% of the generated code, so it is mine." What is wrong with this reasoning?',
        [['Ownership rests on understanding and honesty, not a percentage', true],
          ['The threshold is 50%, so thirty per cent is not quite enough', false],
          ['Nothing, since changed code no longer counts as generated', false],
          ['Only renamed variables count towards the thirty per cent', false]],
        'No proportion of edits makes code yours. Understanding it, verifying it and being honest about its origin does.'),
      mcq('An assistant suggests adding a third-party package to your project. What does accepting commit you to?',
        [['Checking it is real, maintained and acceptable to depend on', true],
          ['Nothing, because the assistant is responsible for its advice', false],
          ['Updating it only if the assistant later recommends a change', false],
          ['Using it only in code that no other person will ever read', false]],
        'A dependency becomes part of your project and its risks become yours. Invented and malicious package names make the check essential.'),
      mcq('Which is the best test of whether you own a generated function?',
        [['Explain it and rebuild it with the assistant closed', true],
          ['Ask the assistant to confirm you understand the code', false],
          ['Check that it contains comments on every single line', false],
          ['Run it once and confirm that it prints some output', false]],
        'Only unaided explanation shows the understanding is yours. The others can all be satisfied without it.'),
    ],
    checkpoint: [
      mcq('In a code review, a teammate says "the AI wrote that part, so I cannot explain it". What is the reasonable response?',
        [['Hold the change until its author can explain it', true],
          ['Approve it, since generated code is usually fine', false],
          ['Approve it, as the reviewer is not the author here', false],
          ['Rewrite it quietly without telling the author', false]],
        'Nobody would be able to maintain or debug code its author cannot explain. Holding it is fair, and it tells the author what is needed.'),
      mcq('Your course allows AI with disclosure. You use generated code, understand it fully, but do not disclose. Is that acceptable?',
        [['No, it is still a breach, as disclosure was the condition', true],
          ['Yes, since understanding the code makes it your own work', false],
          ['Yes, because disclosure matters only when code is wrong', false],
          ['No, but only if another student used the same code too', false]],
        'Understanding is necessary but not sufficient. The policy made disclosure part of permitted use.'),
      mcq('Why does "the AI wrote it" not reduce your responsibility for code at work?',
        [['Committing code is a claim that you checked it and stand behind it', true],
          ['Companies are not allowed to use generated code in any product', false],
          ['Assistants keep logs proving which person typed each line', false],
          ['Automated review systems always reject any generated code', false]],
        'Tools produce drafts; people decide what ships. The decision to commit carries the responsibility.'),
    ],
  },
  {
    unitCode: 'T_AI_CODING_PRACTICE',
    notes: `No new ideas. Every exercise here runs the same loop — specify, generate, read, test, fix —
until you can do it without thinking about the steps.

**The loop, for every task:**

1. **Specify first.** Write the inputs, the output, and what happens on awkward input. Work out the
   expected results of your tests by hand now, before any code exists.
2. **Generate with the specification.** Include the Python version, "standard library only" if that
   applies, and ask for the function alone rather than a whole program.
3. **Read it.** Signature against the specification; every unfamiliar name checked; a small input
   traced by hand; assumptions listed.
4. **Test it.** Your hand-worked cases first, then boundaries, empty input, duplicates and invalid
   input.
5. **Match any failure to a known fault**: invented name, outdated code, off by one, missing edge
   case, shared mutable default, text where a number was meant, unsafe query or \`eval\`.
6. **Fix it** — yourself, or by giving the assistant the exact failing case — then rerun every test
   and add one that would have caught the fault.
7. **Explain it** line by line, and disclose the use if the work is assessed.

**Checklist before you call it done:**

- Expected values came from the specification, not from running the code.
- Every call the code makes exists in the version of Python you use.
- Empty input, a single item, duplicates and the exact boundaries are tested.
- Loop ranges were checked for off-by-one errors.
- No function has a mutable default argument.
- Anything read from \`input()\` is converted before arithmetic.
- No query is built by joining strings, and nothing user-supplied reaches \`eval\`.
- You can explain every line with the assistant closed.

**The coding exercise** gives you generated code that looks right and is not. Read and test it
before you change a single character.`,
    coding: [{
      title: 'Fix a generated second-largest function',
      description: `An assistant was asked for "a function that returns the second largest number in a list" and produced the code in the starter. Read it, test it against the specification below, and fix it.

Specification: read one line of space-separated integers. Print the second largest **distinct** value. If there are fewer than two distinct values, print \`NONE\`.

Examples: \`4 9 2 9\` prints \`4\`, and \`7 7 7\` prints \`NONE\`.

Before changing anything, work out which of the examples the generated version gets wrong, and why.`,
      starter: `# Generated code: read it and test it before trusting it.
def second_largest(nums):
    nums.sort()
    return nums[-2]


nums = [int(x) for x in input().split()]
print(second_largest(nums))
`,
      language: 'python',
      tests: [
        { input: '4 9 2 9', expectedOutput: '4' },
        { input: '5 1', expectedOutput: '1' },
        { input: '7 7 7', expectedOutput: 'NONE' },
        { input: '3', expectedOutput: 'NONE', isHidden: true },
        { input: '-2 -5 -2 0', expectedOutput: '-2', isHidden: true },
      ],
    }],
    mcqs: [
      mcq('A generated `median(nums)` sorts the list and returns `nums[len(nums) // 2]`. What does it return for [4, 1, 3, 2]?',
        [['3, though the median of those four values is 2.5', true],
          ['2.5, since it averages the two values in the middle', false],
          ['2, which is the lower of the two middle values', false],
          ['An error, because the list has an even length', false]],
        'Sorted, the list is [1, 2, 3, 4] and index 2 holds 3. An even-length list needs the mean of the two middle values; it also sorts the caller\'s list in place.'),
      mcq('Which is the best first prompt for a function that removes repeated words?',
        [['Function only, standard library: return unique words in first-seen order', true],
          ['Write me some good Python code that deals with the words in a list', false],
          ['Write a complete app that handles words, with a menu and a database', false],
          ['Give me the best way to do words in Python, whatever you think is right', false]],
        'It states the scope, the constraint and the exact behaviour, including order. Each alternative leaves the model to guess what is wanted.'),
      mcq('A generated `is_leap(year)` returns `year % 4 == 0`. Which test exposes the fault?',
        [['1900, divisible by 4 but not a leap year', true],
          ['2024, divisible by 4 and a leap year', false],
          ['2023, which is not divisible by 4', false],
          ['2000, divisible by 400 and a leap year', false]],
        'Century years are leap years only when divisible by 400. The other three all give the right answer from the faulty rule.'),
      mcq('Generated code reads a number with `eval(input())`. Why must it be replaced?',
        [['It runs any expression typed, including harmful code', true],
          ['eval is slower than int() for very large whole numbers', false],
          ['eval was removed from the language in Python 3', false],
          ['It rounds every number down to the nearest integer', false]],
        'eval executes whatever the user types. int(input()) or float(input()) reads a number and nothing else.'),
      mcq('A test shows `word_count("")` returns 1 instead of 0. Which follow-up to the assistant applies the method?',
        [['Empty string returns 1, expected 0; fix that case and explain why', true],
          ['It is still broken, so please rewrite the whole function from scratch', false],
          ['Make the function better, and handle all of the cases this time', false],
          ['Add more comments so that the empty-string case is easier to follow', false]],
        'The exact failing case gives the model something to act on. The likely cause is splitting on a single space, since "".split(" ") returns one empty string.'),
    ],
    checkpoint: [
      mcq('In the specify-generate-read-test-fix loop, why work out expected test values before generating any code?',
        [['So the generated code cannot shape what you think is correct', true],
          ['So that the assistant can read your values and copy them', false],
          ['Because Python requires tests to exist before a function', false],
          ['Because tests written afterwards can never be run at all', false]],
        'Once you have seen the output, it is easy to accept it as the expectation. Values fixed beforehand keep the specification independent.'),
      mcq('A generated `last_n(items, n)` returns `items[-n:]`. Which input reveals an edge-case fault?',
        [['n = 0, which returns the whole list instead of nothing', true],
          ['n = 2 with a list of five items to take from the end', false],
          ['n = 1 with a list holding exactly one single item', false],
          ['n = 3 with a list of three items, returning them all', false]],
        'items[-0:] is the same as items[0:], the whole list. The other inputs all behave as specified.'),
      mcq('After fixing a fault in generated code, what should you do before moving on?',
        [['Rerun every test and add one that catches this fault', true],
          ['Ask the assistant whether the fix looks right to it', false],
          ['Run only the test that failed, as the others passed', false],
          ['Delete the failing test, since the fault is now fixed', false]],
        'A fix can break a case that used to pass, and the new test stops the same fault from returning unnoticed.'),
    ],
  },
  {
    unitCode: 'T_AI_CODING_MINI_PROJECT',
    notes: `Build a small but real Python program with an AI assistant, then explain it — and change it —
with the assistant closed.

**Why this is a project and not another exercise.** Every unit in this topic taught one habit:
choosing what to delegate, reading, testing, spotting faults, owning the result. None of them asked
you to stand behind a finished piece of work. That is the only test that distinguishes using these
tools from being used by them: if you can explain every function and change the program unaided, the
assistance made you faster; if you cannot, it did the work instead of you.

**The program is deliberately modest.** Splitting a trip's expenses between friends sounds trivial
and is full of the faults generated code makes: money held in floats (\`int(float("0.29") * 100)\`
is 28, not 29), a split that loses a paisa to rounding, a payer who was not one of the participants,
a malformed row that crashes everything.

**How to work:**

1. **Specify before generating.** Write down the rules for splitting and rounding, and work out the
   expected results for your tests by hand.
2. **Generate in small pieces** — one function at a time, not the whole program in one prompt.
3. **Read, test and fix each piece** before asking for the next. Record every fault you find.
4. **Keep the AI log as you go**, not reconstructed at the end. Prompts, what you accepted, what you
   rejected and why.
5. **Close the assistant for the unaided parts** and keep it closed. If you get stuck, that is
   information about what you still need to learn — write it down honestly.

**What good looks like.** A program whose balances always sum to exactly zero, that reports bad
rows instead of crashing, tests with hand-worked expected values, a fault record showing real
problems you caught, and an explanation that shows you understand every function well enough to
change it yourself. A modest program you fully own scores far better than an impressive one you
cannot explain.

The brief, requirements and rubric are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — Built With AI, Explained Without It',
      description: 'Build a trip expense splitter in Python with an AI assistant, test it and record the faults you found in generated code, then explain and extend it with the assistant closed. The unaided explanation and change carry the most marks.',
      instructions: `**The scenario**

Five friends are back from a trip with a spreadsheet of who paid for what. Build \`tripsplit.py\`, a command-line Python program that reads their expenses and works out who owes whom. You may use an AI assistant to build it. You will then explain it, and change it, with the assistant closed.

**Input.** A CSV file named on the command line (\`python tripsplit.py expenses.csv\`):

    payer,amount,participants
    Asha,1200.00,Asha;Ravi;Meena
    Ravi,450.50,Ravi;Meena
    Meena,300,Asha;Ravi;Meena;Kiran

\`participants\` lists everyone sharing that expense, separated by semicolons. The payer need not be one of them.

**Requirements**

1. **Money in paise.** Convert every amount to a whole number of paise and never do money arithmetic in floats. Reject amounts that are negative, not numbers, or have more than two decimal places.
2. **Exact splitting.** Split each amount equally in paise. Leftover paise go one each to participants in the order listed, so 100 paise among three people is 34, 33 and 33.
3. **Balances.** Print each person's net balance (amount paid minus total share) in rupees to two decimal places. Balances must sum to exactly zero paise; assert this in the code.
4. **Settlements.** Print a list of payments such as \`Meena pays Asha 400.00\` that brings every balance to zero. It does not need to be the shortest possible list.
5. **Bad rows.** A malformed row is reported with its line number and skipped; the program never crashes on bad input. An empty file prints a message and exits normally.
6. **Structure.** At least these functions: \`parse_amount\`, \`split_paise\`, \`read_expenses\`, \`compute_balances\` and \`settle\`.

**Testing and evidence**

7. **Tests.** At least ten tests using \`assert\` or pytest, with expected values worked out by hand. Cover at least: a split with leftover paise; an amount with one decimal place; an invalid amount; a payer who is not a participant; a person who paid nothing; an empty file; and a check that applying your settlements leaves every balance at zero.
8. **AI log.** Every prompt you sent, what you accepted, what you rejected, and why.
9. **Fault record.** At least three real faults found in generated code, each with the symptom, the cause, the kind of fault, how you found it, and the test you added.

**The unaided part — assistant closed**

10. **Walkthrough.** For each function, a short explanation in your own words of what it does and why it is written that way, including why the balances always sum to zero.
11. **Unaided change.** Add a \`--person NAME\` option that prints only the settlements involving that person. Do it without any AI tool, and note roughly how long it took and what went wrong along the way.
12. **Viva.** About five minutes in which you explain any function the assessor chooses and answer questions on it. If your instructor cannot arrange a live viva, record a walkthrough of \`split_paise\` and \`settle\` instead.

**What to submit**

1. \`tripsplit.py\` and your test file.
2. The AI log and the fault record.
3. The written walkthrough.
4. The viva recording, or the confirmed viva slot.
5. A disclosure statement: the tool, what it was used for, and which parts you wrote or changed yourself.`,
      rubric: [
        { criterion: 'Working program', description: 'Amounts held in paise with invalid amounts rejected; leftover paise assigned in listed order; balances sum to exactly zero; settlements clear every balance; bad rows reported by line number without crashing.', maxPoints: 20 },
        { criterion: 'Testing', description: 'At least ten tests with hand-worked expected values covering every listed case, including a check that the settlements clear all balances; the tests run and pass.', maxPoints: 20 },
        { criterion: 'AI log and fault record', description: 'Prompts recorded with reasons for accepting or rejecting output; at least three genuine faults, each with symptom, cause, fault type and the test added to catch it.', maxPoints: 15 },
        { criterion: 'Unaided explanation and change', description: 'Walkthrough accurate and in the student\'s own words; the --person option works and was built without AI; viva answers show real understanding of every function, including why balances sum to zero.', maxPoints: 35 },
        { criterion: 'Honest disclosure', description: 'Disclosure is specific and consistent with the AI log; nothing presented as unaided work is shown by the log to have been generated.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
  },
];
