/**
 * Career-track content: NLP and generative AI for data science (Data Science + AI, batch S3).
 *
 * DS_NLP_GENAI — working with text (tokenisation, cleaning that keeps meaning, Hinglish, a TF-IDF baseline),
 * embeddings and similarity, transformers and Hugging Face pipelines, choosing between a classic model, a
 * fine-tuned transformer and a prompted LLM, LLMs in a data scientist's own work (labelling, extraction,
 * synthetic data, and measuring an LLM against a labelled sample), and retrieval-augmented generation as a
 * data scientist evaluates it; ending with a support-ticket classification project done three ways.
 *
 * The Java/Python "+ AI" tracks' JT_AI_CONCEPTS teaches prompts, tokens and cost, embeddings, RAG and LLM
 * failures to an engineer, and Data Analytics' DT_AI_ANALYST teaches an analyst to verify AI output. Nothing
 * here re-teaches either: this topic is about measurement — which approach is more accurate on held-out text,
 * by how much, at what cost and latency, and how sure we are.
 *
 * One seeded generator of fintech support tickets (English and romanised Hinglish, five intents, 4% label
 * noise, eight phrasing templates per intent) runs through the topic. Every output shown was produced by
 * running the code with scikit-learn 1.9, PyTorch 2.14 (CPU), transformers 5.20 and statsmodels 0.15, using
 * small public checkpoints from the Hugging Face Hub (all-MiniLM-L6-v2, paraphrase-multilingual-MiniLM-L12-v2,
 * distilbert-base-uncased-finetuned-sst-2-english, dslim/distilbert-NER, a 2-layer BERT and a small zero-shot
 * NLI model). LLM API calls are vendor-neutral sketches with the key read from an environment variable; their
 * results are never shown as if run, and the LLM-labelling confusion matrix is an illustrative set of counts
 * whose metrics were computed. No prices or model versions are quoted — cost is tokens × price per token.
 *
 * The topic is two-skill (DL_TRANSFORMERS, VECTOR_EMBEDDINGS). Every checkpoint question names its skill with
 * ck(): DL_TRANSFORMERS by default, VECTOR_EMBEDDINGS for the EMBEDDINGS unit (its only skill) and for
 * embedding and retrieval questions elsewhere, following trackSkillAttribution.ts.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const TR = 'DL_TRANSFORMERS';
const EM = 'VECTOR_EMBEDDINGS';

export const TRACK_DS_NLP_GENAI_BUNDLES: PilotBundle[] = [
  /* ── TEXT_PREP ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_NLP_GENAI_TEXT_PREP',
    notes: `Text is the most common unstructured data a data scientist in India is handed: support tickets, app-store
reviews, chat transcripts, product titles, call-centre notes. A model cannot read it. Before any model — a
logistic regression or a transformer — the text has to become numbers, and the decisions you make on the way
(what counts as a word, what to throw away, how to treat "nahi", "nhi" and "nahin") decide what the model can
learn. This unit builds the **baseline every text project starts with**: TF-IDF features and a linear model.

## The data: a fintech app's support tickets

A payments app receives a few thousand tickets a day. The support team wants each one routed to the right queue
automatically. Five intents: **payment_failed** (money debited, payment failed), **refund**, **kyc**, **card**
and **login_otp**. The tickets are written the way Indian users write — English, romanised Hindi, and a mix of
both in one sentence. This generator is used throughout the topic:

    import numpy as np
    import pandas as pd

    def make_tickets(n=3000, seed=11):
        rng = np.random.default_rng(seed)
        T = {
            "payment_failed": [
                "money debited but not credited to {who}", "upi payment failed but amount deducted rs {amt}",
                "paisa kat gaya lekin {who} ko nahi mila", "transaction pending since {t}, rs {amt} debited",
                "payment fail ho gaya par account se {amt} cut", "sent {amt} to {who}, shows failed, balance reduced",
                "upi txn stuck in processing for {t}", "amount debited twice for one payment of rs {amt}"],
            "refund": [
                "refund not received for cancelled order of rs {amt}", "when will i get my refund, it has been {t}",
                "refund abhi tak nahi aaya {t} ho gaye", "merchant said refund initiated but not in my account",
                "cancelled recharge, refund of {amt} still pending", "refund status shows processed but no money",
                "mera refund kab aayega, order cancel kiya tha", "please return my {amt} for the failed booking"],
            "kyc": [
                "kyc verification pending since {t}", "aadhaar kyc failed, name mismatch with pan",
                "kyc reject ho gaya, documents sahi the", "video kyc link not working",
                "pan card upload error during kyc", "my wallet is limited because kyc is not complete",
                "kyc update karna hai address change hua", "full kyc done but limit still not increased"],
            "card": [
                "debit card blocked after wrong pin", "card declined at {who} even though balance is there",
                "card block karna hai, kho gaya", "virtual card not working for online payment",
                "international transaction disabled on my card", "new card not delivered yet, it has been {t}",
                "card se payment nahi ho raha", "please unblock my card, i blocked it by mistake"],
            "login_otp": [
                "otp not coming on my number", "cannot login, app says session expired",
                "otp nahi aa raha login ke liye", "forgot mpin, reset is not working",
                "app logs me out every time i open it", "changed phone, cannot log in to account",
                "login nahi ho raha, otp late aata hai", "otp received after {t}, already expired"],
        }
        who = ["swiggy", "zomato", "my friend", "the shopkeeper", "irctc", "bigbasket", "my landlord", "electricity board"]
        times = ["2 days", "a week", "3 hours", "10 days", "5 days", "48 hours"]
        labels = list(T)
        p = [0.32, 0.24, 0.16, 0.14, 0.14]
        rows = []
        for i in range(n):
            lab = str(rng.choice(labels, p=p)); k = int(rng.integers(0, 8))
            s = T[lab][k].format(who=rng.choice(who), amt=int(rng.integers(49, 25000)), t=rng.choice(times))
            if rng.random() < 0.3:
                s = rng.choice(["hi team, ", "urgent!! ", "sir ", "hello, ", "pls help "]) + s
            if rng.random() < 0.25:
                s = s + rng.choice([" pls help", " asap", " very bad service", " 3rd time complaining", "!!", " call me"])
            if rng.random() < 0.15:  # spelling variants
                s = s.replace("nahi", rng.choice(["nhi", "nahin", "nai"])).replace("payment", rng.choice(["paymnt", "pymt"]))
            if rng.random() < 0.3:
                s = s.upper() if rng.random() < 0.2 else s.capitalize()
            rows.append((i, s, lab, k))
        df = pd.DataFrame(rows, columns=["ticket_id", "text", "label", "tpl"])
        flip = rng.random(n) < 0.04                      # agents mislabel about 4% of tickets
        df["true_label"] = df["label"]
        df.loc[flip, "label"] = [str(x) for x in rng.choice(labels, flip.sum())]
        return df

    df = make_tickets()
    print(df.shape, df.label.value_counts().to_dict())
    print(df.sample(5, random_state=1)[["text", "label"]].to_string(index=False))

    (3000, 5) {'payment_failed': 947, 'refund': 706, 'kyc': 486, 'login_otp': 434, 'card': 427}
                                                                     text          label
    amount debited twice for one payment of rs 11421 3rd time complaining payment_failed
                       sent 14459 to irctc, shows failed, balance reduced payment_failed
            merchant said refund initiated but not in my account pls help         refund
                   New card not delivered yet, it has been 5 days call me           card
                              Refund abhi tak nahin aaya a week ho gaye!!         refund

Two columns exist only because the data is simulated: \`tpl\` says which of eight phrasings produced the ticket,
and \`true_label\` is the label before the agents' 4% of mistakes. Real data never has an answer key; here it lets
us check claims that you normally cannot.

## Tokenisation: what counts as a word

A **token** is the unit a model counts. The simplest tokeniser splits on spaces, and it is not good enough:

    s = "Paisa kat gaya lekin Swiggy ko nahi mila!! Rs 450, txn id T2026..."
    print(s.split())
    import re
    print(re.findall(r"(?u)\\b\\w\\w+\\b", s.lower()))

    ['Paisa', 'kat', 'gaya', 'lekin', 'Swiggy', 'ko', 'nahi', 'mila!!', 'Rs', '450,', 'txn', 'id', 'T2026...']
    ['paisa', 'kat', 'gaya', 'lekin', 'swiggy', 'ko', 'nahi', 'mila', 'rs', '450', 'txn', 'id', 't2026']

With \`split()\`, "mila!!" and "mila" are different words and "450," keeps its comma. The second line is exactly what
scikit-learn's \`TfidfVectorizer\` does by default: lowercase, then keep runs of **two or more** word characters.
Note what that default silently drops — every one-character token, so "i" and "₹" and a lone digit vanish. Usually
harmless; occasionally the one character is the signal (a rating of "5", the rupee sign), and then you set
\`token_pattern\` yourself.

Transformers use **subword** tokenisers instead (next units), which never meet an unknown word: "refund" might be
one token and "abhi" two. For TF-IDF, word tokens and **character n-grams** are the two choices.

## Cleaning without destroying meaning

The old recipe — lowercase, strip punctuation, remove stop words, stem — was designed for English news articles.
Applied blindly to tickets and reviews, parts of it remove the signal:

- **Stop words.** scikit-learn's English list contains the negations:

        from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS
        print([w for w in ["not", "no", "nor", "never", "cannot", "nahi"] if w in ENGLISH_STOP_WORDS])

        ['not', 'no', 'nor', 'never', 'cannot']

  "Refund received" and "refund not received" become the same text. For sentiment, complaints and anything where
  negation matters, keep negations — and note the list knows nothing about Hindi, so "nahi" survives anyway.
  On this dataset, removing stop words left accuracy unchanged (0.961 both ways), which is the usual result with
  TF-IDF and a linear model: they down-weight common words already, so stop-word removal mostly saves memory.
- **Numbers.** "rs 11421" — the exact amount is noise, but *that there is an amount* is a signal for payment and
  refund tickets. Replacing digits with a placeholder (\`re.sub(r"\\d+", " <num> ", s)\`) keeps the signal and shrinks
  the vocabulary.
- **Case and repeated punctuation.** Lowercase for TF-IDF. "!!!" and ALL CAPS carry urgency; if urgency matters,
  extract it as a separate feature before lowercasing rather than throwing it away.
- **PII.** Tickets contain phone numbers, UPI IDs, account numbers and names. Mask them (\`<phone>\`, \`<upi_id>\`)
  before the text is stored for training or sent to any external API. India's Digital Personal Data Protection
  Act makes this an obligation, not just good modelling practice.
- **Stemming and lemmatising** ("debited" → "debit") help little for classification with enough data and do
  nothing for Hinglish. Skip them unless a test shows a gain.

## Hinglish and mixed scripts

Indian text mixes languages within one sentence ("refund abhi tak nahi aaya"), spells the same Hindi word many ways
("nahi", "nhi", "nahin", "nai"), and sometimes uses Devanagari or another script. Three practical consequences:

1. **Spelling variants split one word into many features.** Word-level TF-IDF treats "nahi" and "nhi" as unrelated.
   **Character n-grams** (\`analyzer="char_wb", ngram_range=(2, 5)\`) share pieces ("na", "ah", "hi") across
   variants and typos, and are the standard fix.
2. **English-only resources fail quietly.** Stop-word lists, lemmatisers and sentiment lexicons simply do not
   recognise romanised Hindi; they do not raise an error.
3. **Pretrained models may not know it either.** A multilingual model trained on Devanagari Hindi has seen little
   romanised Hindi — the next unit measures exactly this.

If a share of your data is in Devanagari, keep it: TF-IDF handles any Unicode word characters, and transliterating
everything to one script is a project of its own.

## The baseline: TF-IDF and logistic regression

**TF-IDF** turns each document into a vector with one entry per vocabulary term: term frequency (how often the
term appears in this document), multiplied by inverse document frequency (rarer terms across the corpus weigh
more), then L2-normalised. scikit-learn's default idf is ln((1 + n) / (1 + df)) + 1. \`sublinear_tf=True\` uses
1 + log(tf), so a word repeated five times does not count five times. Bigrams (\`ngram_range=(1, 2)\`) capture
"not received" and "kat gaya" as units. A linear model on these sparse features is fast, strong and explainable.

    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.model_selection import train_test_split
    from sklearn.pipeline import make_pipeline
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import accuracy_score, f1_score

    tr, te = train_test_split(df, test_size=0.25, stratify=df.label, random_state=0)
    for name, vec in [("word 1-2", TfidfVectorizer(ngram_range=(1, 2), min_df=2, sublinear_tf=True)),
                      ("char_wb 2-5", TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), min_df=2, sublinear_tf=True))]:
        m = make_pipeline(vec, LogisticRegression(max_iter=2000, C=5)).fit(tr.text, tr.label)
        p = m.predict(te.text)
        print(name, len(m[0].vocabulary_), round(accuracy_score(te.label, p), 3), round(f1_score(te.label, p, average="macro"), 3))

    word 1-2 772 0.961 0.961
    char_wb 2-5 3539 0.961 0.961

96.1% accuracy and macro F1 against a majority-class baseline of 31.6%. The vectoriser sits **inside the
pipeline**, so its vocabulary and idf weights are learned from training text only. Read the model before trusting
it — the top-weighted features per class:

    vec, lr = m[0], m[1]                      # the word-level model
    names = vec.get_feature_names_out()
    for c, cls in enumerate(lr.classes_):
        print(cls, list(names[np.argsort(-lr.coef_[c])[:5]]))

    card ['card', 'card not', 'card se', 'ho raha', 'my card']
    kyc ['kyc', 'verification', 'kyc verification', 'verification pending', 'booking pls']
    login_otp ['otp', 'login', 'cannot', 'app', 'expired']
    payment_failed ['debited', 'rs', 'transaction pending', 'upi', 'amount']
    refund ['refund', 'cancelled', 'of', 'booking', 'for the']

Mostly sensible — and two warnings: "booking pls" for **kyc** and "of" / "for the" for **refund** are artefacts of
how particular phrasings co-occur, not meaning. A model leaning on them will be fragile.

## The errors, and the test that matters

All 29 test errors are tickets whose **label** is wrong — the 4% the agents mislabelled ("refund not received for
cancelled order" labelled kyc). Measured against \`true_label\`, the model is 100% right. Two lessons:

- **Read the errors before improving the model.** Past a point, the ceiling is label quality, not the algorithm.
  Relabelling a few hundred tickets carefully is often worth more than any model change.
- **A random split flatters templated text.** Every test phrasing also appears in training. Real users keep
  inventing new phrasings, so hold out **phrasings the model never saw** — here, train on templates 0–5 and test on
  6–7:

        seen, unseen = df[df.tpl < 6], df[df.tpl >= 6]
        # same two pipelines, fitted on seen and scored on unseen
        unseen word 1-2 0.664 0.678
        unseen char_wb 2-5 0.58 0.612

  From 0.96 to **0.66**. "please return my 7381 for the failed booking" is a refund in words the model never met,
  and "failed" pulls it to payment_failed. In real projects the equivalent is a **time-based split** (train on
  earlier months, test on later), and the drop is the honest estimate of production accuracy.

TF-IDF also has a hard limit: it knows only words it saw. "Amount gone from bank but shop didn't get it" shares
almost no words with "money debited but not credited". Meaning-level similarity needs **embeddings** — the next
unit — and those 0.66 are the number they will have to beat.

## Checklist for a text baseline

- Split first (by time or by source if the data allows), vectorise inside a pipeline.
- Word 1–2-grams with \`sublinear_tf\` and \`min_df\` 2–5; try \`char_wb\` 2–5 for misspelt or code-mixed text.
- Logistic regression or a linear SVM; tune C.
- Report macro F1 and per-class recall alongside accuracy — the classes are imbalanced.
- Read the top features and twenty errors before anything else.`,
    workedExample: `**Task: a food-delivery company's sentiment model, trained on English reviews, scores "khana thanda tha, delivery
late, paisa barbaad" as positive. Fix the baseline.**

**Step 1 — Look at what the vectoriser sees.** \`vec.build_analyzer()("khana thanda tha, paisa barbaad")\` returns
the tokens; then check which are in the vocabulary. None of "khana", "thanda", "barbaad" were in the training
vocabulary, so the review is scored on "delivery" and "late" alone — plus the intercept, which leans positive
because 70% of training reviews are positive.

**Step 2 — Measure the size of the problem.** Sample 300 recent reviews and count the code-mixed ones: if 35% are
Hinglish, the English-only model is untested on a third of production.

**Step 3 — Get labelled Hinglish.** Label a few hundred Hinglish reviews (by agents, or with an LLM checked against
a hand-labelled sample — later in this topic). There is no shortcut: a model cannot learn words it never saw.

**Step 4 — Make features robust to spelling.** Combine word and character features:

    from sklearn.pipeline import make_union
    vec = make_union(TfidfVectorizer(ngram_range=(1, 2), min_df=2, sublinear_tf=True),
                     TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), min_df=3, sublinear_tf=True))
    model = make_pipeline(vec, LogisticRegression(max_iter=3000, C=3))

Keep negations ("not", "nahi") — do not apply the English stop-word list.

**Step 5 — Evaluate per language.** Report macro F1 separately for English and Hinglish test reviews, on a split by
date. A single overall number hides the group that was failing.

**What to say:** "The model never saw Hinglish words, so it judged those reviews on the English words left over. We
added labelled Hinglish reviews and character n-grams, and we now report accuracy for each language separately."`,
    mcqs: [
      mcq('A ticket classifier uses scikit-learn\'s English stop-word list. What happens to "refund not received" and "refund received"?', [
        ['They become identical, because "not" is on the stop-word list', true],
        ['They stay different, because the list keeps all short words', false],
        ['They stay different, because TF-IDF weights every word equally', false],
        ['They both disappear, because "refund" is on the stop-word list', false],
      ], 'ENGLISH_STOP_WORDS contains "not", "no", "never" and "cannot". Removing them erases negation, which is exactly what separates these two tickets.'),
      mcq('The baseline scored 0.961 on a random split but 0.664 when tested on phrasings it never saw. Which number estimates production accuracy better, and why?', [
        ['The 0.664, because users keep writing in new ways the model has not met', true],
        ['The 0.961, because the random split used more of the data to test on', false],
        ['The 0.961, because the unseen-phrasing test throws away useful features', false],
        ['Neither, since text accuracy can only be measured on the training set', false],
      ], 'In a random split, every test phrasing also appears in training. Production brings new phrasings, so a split that holds them out — or a time-based split — gives the honest estimate.'),
      mcq('Why do character n-grams (analyzer="char_wb") help with romanised Hinglish such as "nahi", "nhi" and "nahin"?', [
        ['The variants share character pieces, so they share features', true],
        ['They translate each Hindi word into its English equivalent first', false],
        ['They remove every vowel, so all the spellings become the same word', false],
        ['They group words by meaning, using a pretrained Hindi dictionary', false],
      ], 'Word features treat each spelling as unrelated. Character n-grams such as "na", "ah", "hi" overlap across spellings and typos, so the model can generalise across them.'),
    ],
    checkpoint: [
      ck(TR, 'What does TfidfVectorizer\'s default token_pattern keep from the text "Rs 450 paid, 5 stars"?', [
        ['rs, 450, paid and stars — tokens of one character are dropped', true],
        ['Every character including the commas and the number 5', false],
        ['Only alphabetic words; all the digits are removed first', false],
        ['Rs, 450, paid, 5 and stars, with the original case kept', false],
      ], 'The default pattern keeps runs of two or more word characters after lowercasing, so "5" disappears while "450" survives. Set token_pattern yourself when a single character matters.'),
      ck(TR, 'All 29 errors of a ticket model turn out to be tickets whose agent label is wrong. What is the most useful next step?', [
        ['Audit and fix the labels, since label quality now limits the score', true],
        ['Switch to a transformer, which will learn to ignore wrong labels', false],
        ['Add more n-gram sizes so the model can fit those 29 tickets too', false],
        ['Remove stop words, which usually fixes most of the remaining errors', false],
      ], 'When the model is right and the label is wrong, a better model cannot help — and fitting the wrong labels would make it worse. Cleaning labels raises both the score and its meaning.'),
      ck(TR, 'Why must the TfidfVectorizer be fitted inside the pipeline rather than on all tickets before splitting?', [
        ['Its vocabulary and idf weights would otherwise use the test text', true],
        ['A vectoriser fitted outside a pipeline cannot produce sparse output', false],
        ['Fitting on all tickets makes the vocabulary too small to be useful', false],
        ['The vectoriser needs the labels, which only the pipeline provides', false],
      ], 'Fitting on everything lets test-set words and document frequencies shape the features — a mild leak that inflates the score. Inside a pipeline, each fit sees only training text.'),
    ],
  },

  /* ── EMBEDDINGS ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_NLP_GENAI_EMBEDDINGS',
    notes: `TF-IDF knows words. It cannot tell that "amount gone from bank" and "money debited" mean the same thing,
because they share no words. An **embedding** is a dense vector — a few hundred numbers — produced by a neural
network trained so that texts with similar meaning get nearby vectors. With embeddings, a data scientist can
classify text with little data, search by meaning, find duplicates and cluster themes. This unit uses them as
features and as a similarity measure; how the network produces them is the next unit.

## Word embeddings and sentence embeddings

- **Word embeddings** (word2vec, GloVe, fastText; 2013–2016) give each word one fixed vector. "Bank" has one vector
  whether it is a river bank or a bank account. Averaging word vectors gives a crude sentence vector.
- **Contextual embeddings** come from transformers: each token's vector depends on the whole sentence.
- **Sentence embeddings** come from a transformer fine-tuned so that a pooled vector for the whole sentence is
  useful for similarity. Models such as \`all-MiniLM-L6-v2\` (22 million parameters, 384 dimensions) are small
  enough to run on a laptop CPU.

The \`sentence-transformers\` library wraps this in one line (\`SentenceTransformer(name).encode(texts,
normalize_embeddings=True)\`). The same thing with plain \`transformers\` shows what happens inside — the tokens'
vectors are averaged, ignoring padding, and normalised:

    import torch
    from transformers import AutoTokenizer, AutoModel

    name = "sentence-transformers/all-MiniLM-L6-v2"
    tok, model = AutoTokenizer.from_pretrained(name), AutoModel.from_pretrained(name).eval()

    def embed(texts, bs=64):
        out = []
        with torch.no_grad():
            for i in range(0, len(texts), bs):
                b = tok(list(texts[i:i + bs]), padding=True, truncation=True, max_length=128, return_tensors="pt")
                h = model(**b).last_hidden_state                 # (batch, tokens, 384)
                m = b["attention_mask"].unsqueeze(-1).float()     # 1 for real tokens, 0 for padding
                v = (h * m).sum(1) / m.sum(1)                     # mean pooling
                out.append(torch.nn.functional.normalize(v, dim=1))
        return torch.cat(out).numpy()

The first call downloads the model (about 90 MB) to the Hugging Face cache; later calls load it from disk. Use the
pooling the model card specifies — this model was trained with mean pooling, and taking only the first token's
vector gives worse similarities.

## Cosine similarity

Similarity between embeddings is measured by the **cosine** of the angle between them: a·b / (‖a‖ ‖b‖), from −1 to
1. When vectors are normalised to length 1, cosine is just the dot product — which is why the function above
normalises, and why a vector index can use a fast dot product.

    pairs = [("money debited but not credited to swiggy", "amount deducted, merchant did not receive it"),
             ("money debited but not credited to swiggy", "otp not coming on my number"),
             ("money debited but not credited to swiggy", "paisa kat gaya lekin swiggy ko nahi mila"),
             ("refund not received", "refund received, thank you")]
    for a, b in pairs:
        e = embed([a, b]); print(round(float(e[0] @ e[1]), 3), "|", b)

    0.536 | amount deducted, merchant did not receive it
    0.226 | otp not coming on my number
    0.155 | paisa kat gaya lekin swiggy ko nahi mila
    0.772 | refund received, thank you

Four lessons in four lines:

- **Paraphrases score high** (0.54) with almost no shared words — what TF-IDF cannot do.
- **Unrelated tickets score low** (0.23), but not zero. Cosine values are relative: there is no universal
  "similar" threshold, so any threshold is set on labelled pairs from your own data.
- **Romanised Hinglish is nearly invisible** to an English model (0.155: less similar than the OTP ticket). The
  multilingual \`paraphrase-multilingual-MiniLM-L12-v2\` scored this pair **0.075** — it was trained on Hindi in
  Devanagari, not Hindi typed in Latin letters. Test any model on your own language mix before relying on it.
- **Similar is not the same as equivalent.** "Refund not received" and "refund received, thank you" score 0.77:
  same topic, opposite meaning. Embeddings capture topic strongly and negation weakly.

## Embeddings as features

Freeze the embedding model, embed every ticket, and train a logistic regression on the 384 numbers — the same
unseen-phrasing test as the last unit (train on templates 0–5, test on 6–7):

    from sklearn.linear_model import LogisticRegression
    seen, unseen = df[df.tpl < 6], df[df.tpl >= 6]
    Xs, Xu = embed(seen.text.tolist()), embed(unseen.text.tolist())
    m = LogisticRegression(max_iter=3000, C=5).fit(Xs, seen.label)
    p = m.predict(Xu)
    print(Xs.shape, round(accuracy_score(unseen.label, p), 3), round(f1_score(unseen.label, p, average="macro"), 3))

    (2276, 384) 0.884 0.888

| Features (logistic regression) | Unseen phrasings, accuracy |
|---|---|
| TF-IDF words 1–2 | 0.664 |
| TF-IDF characters 2–5 | 0.580 |
| all-MiniLM-L6-v2 embeddings | **0.884** |
| paraphrase-multilingual-MiniLM-L12-v2 embeddings | 0.786 |

The embedding model was trained on a billion sentence pairs, so it brings knowledge of paraphrase that 2,276
tickets cannot teach a TF-IDF model. This is **transfer learning** with no fine-tuning — cheap, fast (the
embeddings are computed once and cached), and often the best first upgrade over TF-IDF. The bigger multilingual
model did worse, for the romanisation reason above. Bigger is not automatically better; measure.

## Semantic search

Embed the documents once, embed each query, return the documents with the highest cosine. Eight help-centre
article titles, five user queries:

    faq = ["What to do if money is deducted but the UPI payment failed",
           "How long does a refund for a cancelled order take", "How to complete video KYC",
           "How to block or unblock your debit card", "Not receiving the OTP to log in",
           "How to change the mobile number linked to your account",
           "How to raise a chargeback for a merchant dispute", "How to increase your wallet limit"]
    F = embed(faq)
    for q in ["i lost my card what do i do", "verification code never arrives", "cancelled my ticket, where is my money"]:
        s = embed([q])[0] @ F.T
        print(q, "->", faq[s.argmax()], round(float(s.max()), 2))

    i lost my card what do i do -> How to block or unblock your debit card 0.39
    verification code never arrives -> Not receiving the OTP to log in 0.35
    cancelled my ticket, where is my money -> What to do if money is deducted but the UPI payment failed 0.46

TF-IDF on the same queries sent "i lost my card" and "verification code never arrives" to the UPI article (the
second with a score of 0.00 — no shared words at all). Embeddings got both right. The third query is a miss for
both: the refund article scored 0.42, just behind 0.46, because "money" matched strongly. Retrieval is ranked, so a
data scientist measures **recall@k** (is the right document in the top k?) rather than looking only at the top
hit — the RAG unit does this properly.

At scale you do not compare against every vector by brute force; a vector index (FAISS, a vector database, or
pgvector in Postgres) does approximate nearest-neighbour search over millions of vectors in milliseconds.

## Clustering text

Embeddings plus k-means (S2) group tickets into themes without labels. On all 3,000 tickets, k-means with k = 8 on
the embeddings agreed with the five agent labels at **ARI 0.519** (k = 5: 0.388). Clusters follow wording as much
as intent — the Hinglish tickets tend to cluster together whatever they are about. Use clustering to **discover**
themes for a new label set, reading twenty tickets per cluster, never as labels in their own right.

## Practical points

- **Cache embeddings** with the model name and version. Changing the model changes every vector; vectors from two
  models are not comparable.
- **Truncation.** Small sentence models read about 128–256 tokens (this one was trained on 128 and accepts up to
  256). Longer texts are cut silently; chunk long documents.
- **Normalise** once and use the dot product.
- **Duplicates.** Near-duplicate tickets (the same complaint sent three times) have cosine close to 1; set the
  threshold on labelled pairs and check what sits just above and below it.
- **Speed.** On a laptop CPU, embedding all 3,000 short tickets with MiniLM took under twenty seconds (a few
  milliseconds each); a TF-IDF model scored them at about 0.02 ms each — hundreds of times faster. For millions of
  texts a day, that difference is a cost line.`,
    workedExample: `**Task: the support team says many tickets are repeats — the same customer complaining three times about the same
failed payment. Find duplicate tickets so agents handle each problem once.**

**Step 1 — Define a duplicate in data terms.** Same customer, within 72 hours, about the same problem. The customer
and time conditions come from columns; only "same problem" needs text similarity. Comparing within a customer's
recent tickets keeps the comparisons few.

**Step 2 — Embed and compare.** For each customer, embed their tickets from the last 72 hours and compute pairwise
cosine: \`E @ E.T\` on normalised vectors.

**Step 3 — Choose the threshold on labelled pairs.** Ask agents to mark 300 pairs as duplicate or not. For
thresholds from 0.5 to 0.95, compute precision and recall of "cosine ≥ threshold" against their marks. Suppose 0.80
gives precision 0.94 and recall 0.81; 0.70 gives 0.85 and 0.90. Merging two different problems loses a customer's
second complaint, so precision matters more: choose 0.80.

**Step 4 — Check the failure the model is known for.** Pairs like "refund not received" and "refund received,
thank you" score high (0.77 in this unit). Add a simple rule — a ticket containing "received, thank" or "resolved"
is never merged as a duplicate of a complaint — and re-measure.

**Step 5 — Ship it as a suggestion.** Show "possible duplicate of #18342" to the agent instead of merging
automatically, and log whether they accept it; that log is next quarter's labelled data.

**What to say:** "Duplicates are found by meaning within a customer's last 72 hours. The 0.80 threshold was chosen
on 300 pairs agents labelled, at 94% precision, and agents confirm every merge."`,
    mcqs: [
      mcq('An English sentence-embedding model gives "paisa kat gaya lekin swiggy ko nahi mila" a cosine of 0.155 with its English translation. What does this show?', [
        ['The model barely understands romanised Hindi, so it must be tested on it first', true],
        ['The two sentences mean different things, and the low score is correct here', false],
        ['Cosine similarity cannot be used when the two texts are of different lengths', false],
        ['The vectors were not normalised, which always pushes the cosine towards 0', false],
      ], 'They mean the same thing; the model has seen little Hindi typed in Latin letters. Even a multilingual model scored 0.075, because it learned Hindi in Devanagari.'),
      mcq('Frozen MiniLM embeddings with logistic regression scored 0.884 on unseen phrasings against 0.664 for TF-IDF. Where does the gain come from?', [
        ['The embedding model learned paraphrase from far more text than the tickets', true],
        ['Embeddings have 384 columns, and more columns always give a higher accuracy', false],
        ['The embedding model was trained on these exact support tickets beforehand', false],
        ['Logistic regression works better on dense input than on any sparse input', false],
      ], 'The embedding model was trained on a very large set of sentence pairs, so similar meanings land near each other even with no shared words. That transferred knowledge is what TF-IDF lacks.'),
      mcq('Why are sentence embeddings usually normalised to length 1 before search?', [
        ['The dot product then equals cosine similarity, and is fast to compute', true],
        ['Normalising removes the effect of negation words such as "not"', false],
        ['A vector index can only store vectors with values between 0 and 1', false],
        ['Normalised vectors take a quarter of the memory of the raw vectors', false],
      ], 'Cosine is a·b divided by both lengths. With unit-length vectors the division is by 1, so a plain dot product — which indexes and matrix multiplication do fast — gives cosine.'),
    ],
    checkpoint: [
      ck(EM, '"Refund not received" and "refund received, thank you" have a cosine similarity of 0.77. What does that say about embeddings?', [
        ['They capture topic strongly but negation weakly, so similar is not equal', true],
        ['The two tickets are duplicates and should be merged into a single one', false],
        ['Cosine similarity above 0.7 always means the texts share the same intent', false],
        ['The model is broken, because opposite meanings should score below zero', false],
      ], 'Both texts are about a refund, so they sit close together. Opposite outcomes are only a small shift in the vector, which is why thresholds are set on labelled pairs and checked for this case.'),
      ck(EM, 'A team switches its search from one embedding model to a better one. What must happen to the stored document vectors?', [
        ['Re-embed every document, since vectors of two models are not comparable', true],
        ['Nothing — every vector keeps its meaning as long as the dimension matches', false],
        ['Only new documents are embedded with the new model from now on', false],
        ['Rescale the old vectors so their lengths match the new model\'s', false],
      ], 'Each model defines its own space; the same dimension does not mean the same axes. Mixing old document vectors with new query vectors gives meaningless similarities.'),
      ck(EM, 'k-means on ticket embeddings matches the agent labels with an ARI of 0.52. How should the clusters be used?', [
        ['To discover themes, by reading samples from each cluster before naming any', true],
        ['As the new labels, because clustering removes the noise in agent labels', false],
        ['Not at all, since an ARI below 0.9 means embeddings contain no useful signal', false],
        ['To train a classifier directly, using cluster numbers as the true classes', false],
      ], 'Clusters follow wording as well as intent — Hinglish tickets group together whatever they are about. They are a starting point for a label set that people then define and check.'),
    ],
  },

  /* ── TRANSFORMERS ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_NLP_GENAI_TRANSFORMERS',
    notes: `Every modern text model — the sentence encoder of the last unit, the sentiment model in an app, the LLM behind
a chatbot — is a **transformer**. A data scientist does not need to build one, but must be able to run one, read
what it returns, choose the right kind for a task and explain in an interview what attention does. This unit
covers the idea, the three families, tokenisers, and Hugging Face pipelines for classification and extraction.

## Attention, as intuition

Before transformers, sequence models read text one token at a time (the RNNs of the deep-learning topic) and
struggled to connect words far apart. **Self-attention** lets every token look at every other token in one step and
decide how much each matters to it. In "refund not received", the vector for "received" should be changed by
"not" — attention is the mechanism that lets it be.

Mechanically, each token's vector x is multiplied by three learned matrices to give a **query** q, a **key** k and a
**value** v. A token's query is compared with every token's key (dot product, divided by √d to keep values
moderate); a softmax turns the scores into weights that sum to 1; the token's new vector is the weighted average of
the values. Three tokens, four dimensions, random weights:

    import numpy as np, torch
    X = np.array([[1.0, 0.0, 1.0, 0.0],    # "refund"
                  [0.0, 1.0, 0.0, 1.0],    # "not"
                  [1.0, 1.0, 0.0, 0.0]])   # "received"
    rng = np.random.default_rng(0)
    Wq, Wk, Wv = (rng.normal(0, 0.5, (4, 4)) for _ in range(3))
    Q, K, V = X @ Wq, X @ Wk, X @ Wv
    scores = Q @ K.T / np.sqrt(4)
    w = np.exp(scores - scores.max(1, keepdims=True)); w /= w.sum(1, keepdims=True)
    print(w.round(2))
    out = torch.nn.functional.scaled_dot_product_attention(*(torch.tensor(a)[None] for a in (Q, K, V)))
    print(np.allclose(out[0].numpy(), w @ V))

    [[0.38 0.29 0.33]
     [0.25 0.36 0.39]
     [0.32 0.26 0.42]]
    True

Row i holds how much token i attends to each token; every row sums to 1. With random weights the pattern means
nothing — training adjusts Wq, Wk and Wv until the weights are useful. PyTorch's
\`scaled_dot_product_attention\` (2.0+) computes exactly this. A real model adds:

- **Multiple heads** — several attention computations in parallel, each free to track a different relation.
- **Many layers** — attention followed by a small feed-forward network, stacked 6 to 100+ times.
- **Positions** — attention itself ignores word order, so position information is added to the token vectors.
- **Masks** — padding is masked out; in a decoder, each token is masked from seeing tokens after it.

Cost grows with the **square of the sequence length** (every token attends to every token), which is why models
have a maximum context and why long inputs are slow.

## Three families

| Family | Sees | Pretrained to | Examples | Use it for |
|---|---|---|---|---|
| **Encoder** | The whole text, both directions | Fill in masked words | BERT, DistilBERT, RoBERTa, MiniLM | Classification, extraction (NER), embeddings |
| **Decoder** | Only earlier tokens | Predict the next token | GPT-style models, most LLMs | Generating text; prompted classification and extraction |
| **Encoder–decoder** | Encoder reads input; decoder writes output | Rebuild corrupted text | T5, BART | Translation, summarisation |

For a labelled classification task at scale, a small **encoder** fine-tuned on your data is usually the efficient
choice. Decoders (LLMs) can do the same task with no training through a prompt, at a higher cost per prediction —
the trade-off of the next unit.

## Tokenisers

A transformer reads **token IDs** from a fixed vocabulary of subwords (about 30,000 for BERT's WordPiece). A word
not in the vocabulary is split into pieces, so nothing is ever unknown:

    from transformers import AutoTokenizer
    tok = AutoTokenizer.from_pretrained("distilbert/distilbert-base-uncased-finetuned-sst-2-english")
    for s in ["Refund not received for my cancelled order", "refund abhi tak nahi aaya, paisa kat gaya",
              "UPI txn T2026091512 debited ₹450"]:
        ids = tok(s)["input_ids"]
        print(len(s.split()), len(ids), tok.convert_ids_to_tokens(ids))

    7 10 ['[CLS]', 'ref', '##und', 'not', 'received', 'for', 'my', 'cancelled', 'order', '[SEP]']
    8 17 ['[CLS]', 'ref', '##und', 'ab', '##hi', 'tak', 'nah', '##i', 'aa', '##ya', ',', 'pa', '##isa', 'kat', 'gay', '##a', '[SEP]']
    5 19 ['[CLS]', 'up', '##i', 'tx', '##n', 't', '##20', '##26', '##0', '##9', '##15', '##12', 'de', '##bit', '##ed', '₹', '##45', '##0', '[SEP]']

What to notice:

- **[CLS] and [SEP]** are added by the tokenizer. Classification heads in BERT-style models read the [CLS] position.
- **"##" marks a continuation piece.** English words are mostly one token; romanised Hindi breaks into fragments
  ("nah", "##i"), and IDs and amounts into many. Code-mixed text needs **more tokens per word** — 15 tokens for 8
  words here against 8 for 7 — which means a shorter effective context and, for an API priced per token, a higher
  cost for the same message.
- **The tokenizer must match the model.** Token 2025 means "not" only for this vocabulary. Always load both with the
  same name.

A batch is padded to the longest text, and the **attention mask** tells the model which positions are real:

    e = tok(["otp not coming", "card blocked after wrong pin"], padding=True, return_tensors="pt")
    print(e["input_ids"]); print(e["attention_mask"])

    tensor([[  101, 27178,  2361,  2025,  2746,   102,     0],
            [  101,  4003,  8534,  2044,  3308,  9231,   102]])
    tensor([[1, 1, 1, 1, 1, 1, 0],
            [1, 1, 1, 1, 1, 1, 1]])

## Hugging Face pipelines

\`pipeline(task, model=...)\` bundles tokenizer, model and post-processing. Always name the model: the task-only
default changes between library versions and is chosen for demos, not for your data.

**Sentiment (an encoder fine-tuned on English movie reviews):**

    from transformers import pipeline
    clf = pipeline("sentiment-analysis", model="distilbert/distilbert-base-uncased-finetuned-sst-2-english")
    clf(["Delivery was quick and the biryani was hot", "The app is not bad at all",
         "khana thanda tha, paisa barbaad", "bahut badhiya service, full paisa vasool"])

    [{'label': 'POSITIVE', 'score': 0.9988}, {'label': 'POSITIVE', 'score': 0.9976},
     {'label': 'NEGATIVE', 'score': 0.9811}, {'label': 'NEGATIVE', 'score': 0.9834}]

It handles "not bad at all" — attention over context, not word counting. And it calls "bahut badhiya service, full
paisa vasool" (excellent service, full value for money) **NEGATIVE with 0.98**. The score is the model's
confidence, not a probability of being right; on text unlike its training data it is confidently wrong. Evaluate on
a labelled sample of *your* text before trusting any pretrained pipeline.

**Zero-shot classification** uses a model trained on natural-language inference to score "This text is about
{label}" for labels you name at run time:

    zs = pipeline("zero-shot-classification", model="MoritzLaurer/xtremedistil-l6-h256-zeroshot-v1.1-all-33")
    labels = ["failed payment", "refund", "KYC verification", "debit card", "login or OTP"]
    r = zs("sent 2000 to my landlord, shows failed, balance reduced", candidate_labels=labels)
    print(r["labels"][0], round(r["scores"][0], 2))

    failed payment 0.81

No training data needed — but on the unseen-phrasing tickets this small model scored only **0.47** accuracy, at
about 155 ms per ticket on a laptop CPU, because it runs once per (ticket, label) pair. Useful to bootstrap labels,
weak as a production classifier.

**Named-entity recognition (extraction):**

    ner = pipeline("ner", model="dslim/distilbert-NER", aggregation_strategy="first")
    for e in ner("Ravi Kumar paid Swiggy 450 rupees from his HDFC account in Bengaluru"):
        print(e["entity_group"], e["word"], round(float(e["score"]), 2))

    PER Ravi Kumar 1.0
    PER Swiggy 0.81
    ORG HDFC 0.97
    LOC Bengaluru 1.0

\`aggregation_strategy\` merges subword pieces into whole entities; with \`"simple"\` this example came back as
fragments ("S", "##wig", "##gy"; "Bengal", "##uru"), with \`"first"\` as whole words. And "Swiggy" is tagged as a
**person** — a model trained on news text has not met Indian brand names. For extracting merchant names, amounts
and UPI IDs from tickets, regular expressions handle the structured parts, and a model fine-tuned on a few hundred
labelled tickets (or a prompted LLM) handles the rest.

## Reading a model you load

    from transformers import AutoModelForSequenceClassification
    model = AutoModelForSequenceClassification.from_pretrained("google/bert_uncased_L-2_H-128_A-2", num_labels=5)

The library reports that \`classifier.weight\` and \`classifier.bias\` are **newly initialised**. That is expected:
the pretrained body is loaded, and a fresh classification head for your five labels must be trained (fine-tuning,
next unit). If you see that message when loading a model you believed was *already* fine-tuned, you loaded the
wrong checkpoint — its predictions are random.

## Version notes

- transformers 5 supports PyTorch only; TensorFlow and JAX model classes were removed. Code written for 4.40+ with
  PyTorch, as here, runs on both.
- \`aggregation_strategy\` replaced the old \`grouped_entities=True\` for NER (4.x deprecation).
- The missing-weights notice was a warning starting "Some weights of … were not initialized" in 4.x; 5.x prints a
  load report table. Same meaning.
- Pipelines run on CPU by default; pass \`device=0\` for the first GPU.`,
    mcqs: [
      mcq('In self-attention, what does the softmax over a token\'s query-key scores produce?', [
        ['Weights summing to 1 that say how much each token\'s value contributes', true],
        ['The probability of each word in the vocabulary appearing next in the text', false],
        ['A mask that removes the padding tokens from the batch before encoding', false],
        ['The token IDs that the tokenizer assigns to each word piece of the input', false],
      ], 'Scores are turned into non-negative weights that sum to 1; the token\'s new vector is the weighted average of all tokens\' value vectors.'),
      mcq('A sentiment pipeline returns NEGATIVE with score 0.98 for "bahut badhiya service, full paisa vasool". What should a data scientist conclude?', [
        ['A high score is not accuracy; check the model on labelled Hinglish first', true],
        ['The review must be negative, since a score of 0.98 means 98% certainty', false],
        ['The tokenizer failed, because the pipeline would refuse unknown words', false],
        ['Scores above 0.95 should always be trusted, and lower ones reviewed', false],
      ], 'The model was trained on English reviews and is confidently wrong on text unlike its training data. Only measurement on labelled samples of your own text tells you how often it is right.'),
      mcq('Why does romanised Hinglish usually cost more tokens per word than English for a BERT-style tokenizer?', [
        ['Its words are rarely in the subword vocabulary, so they split into pieces', true],
        ['The tokenizer adds a language tag before every Hindi word that it reads', false],
        ['Hindi words are always longer than English ones, letter for letter', false],
        ['The tokenizer translates Hindi into English, which adds extra words', false],
      ], 'The vocabulary was built mostly from English text. "nahi" becomes "nah" + "##i" and "paisa" becomes "pa" + "##isa", so the same message takes more tokens.'),
    ],
    checkpoint: [
      ck(TR, 'A team must classify 50 lakh support tickets a month into ten queues and has 20,000 labelled tickets. Which model family fits best?', [
        ['A small encoder such as DistilBERT or MiniLM, fine-tuned on the labels', true],
        ['An encoder–decoder such as T5, trained to translate tickets into queues', false],
        ['A large decoder LLM prompted for every ticket, with no use of the labels', false],
        ['A word2vec model, since word embeddings handle classification on their own', false],
      ], 'With plenty of labels and high volume, a small fine-tuned encoder is accurate, fast and cheap per prediction. A prompted LLM is possible but costs far more at that volume.'),
      ck(TR, 'After loading a checkpoint you believed was already fine-tuned for your task, transformers reports the classifier weights as newly initialised. What does that mean?', [
        ['The head is random, so this checkpoint was not fine-tuned for your labels', true],
        ['It is a harmless notice that appears every time any model is loaded', false],
        ['The tokenizer and model are mismatched and must be loaded separately', false],
        ['The model will download the missing weights the first time it predicts', false],
      ], 'A newly initialised head is expected when you are about to fine-tune. If you thought it was trained, its predictions are random — you loaded the base model, not the fine-tuned one.'),
      ck(TR, 'Why does self-attention become slow on very long inputs?', [
        ['Every token attends to every other, so the work grows with length squared', true],
        ['Each token is processed one after another, as in a recurrent network', false],
        ['The tokenizer must search the whole vocabulary for each new character', false],
        ['Softmax cannot be computed in parallel when the input has many tokens', false],
      ], 'Attention compares every query with every key: n tokens give n × n scores. Doubling the length roughly quadruples that part of the work, which is why models cap their context.'),
    ],
  },

  /* ── FINE_TUNE_OR_PROMPT ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_NLP_GENAI_FINE_TUNE_OR_PROMPT',
    notes: `A text task can now be solved four ways: a **classic model** (TF-IDF and logistic regression), **frozen
embeddings** with a simple classifier, a **fine-tuned transformer**, or a **prompted LLM**. Juniors pick the newest;
interviewers want to hear you choose on accuracy, cost, latency, data, privacy and maintenance — with numbers. This
unit runs the first three plus a zero-shot model on the same held-out tickets, and shows how to bring an LLM into
the same comparison.

## The four options

| Option | Needs labelled data | Training | Cost per prediction | Typical latency | Main risk |
|---|---|---|---|---|---|
| TF-IDF + linear model | Hundreds to thousands | Seconds, CPU | Almost nothing | Well under a millisecond | Misses unseen wording |
| Frozen embeddings + linear model | Hundreds | Seconds after embedding | Small (one encoder pass) | Milliseconds | Embedding model may not know your language |
| Fine-tuned small transformer | Thousands | Minutes on CPU, faster on a GPU | Small, on your own servers | Milliseconds | Overfitting to training phrasings; needs ML ops |
| Prompted LLM (zero/few-shot) | None to train; a labelled set to **evaluate** | None | Tokens × price per token | Hundreds of ms to seconds | Cost at volume, data leaving your systems, output drift |

## Fine-tuning a small transformer

Fine-tuning starts from a pretrained encoder, adds a classification head, and trains everything on your labels with
a small learning rate. A plain PyTorch loop (the Hugging Face \`Trainer\` class does the same with more options):

    import torch
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
    torch.manual_seed(0)
    name = "sentence-transformers/all-MiniLM-L6-v2"          # 22.7 million parameters
    labels = sorted(df.label.unique()); l2i = {l: i for i, l in enumerate(labels)}
    tok = AutoTokenizer.from_pretrained(name)
    model = AutoModelForSequenceClassification.from_pretrained(name, num_labels=len(labels))
    enc = lambda t: tok(list(t), padding=True, truncation=True, max_length=48, return_tensors="pt")
    Xs, ys = enc(seen.text), torch.tensor(seen.label.map(l2i).values)
    opt = torch.optim.AdamW(model.parameters(), lr=5e-5)
    for ep in range(3):
        model.train(); perm = torch.randperm(len(ys)); total = 0
        for i in range(0, len(ys), 32):
            idx = perm[i:i + 32]
            out = model(input_ids=Xs["input_ids"][idx], attention_mask=Xs["attention_mask"][idx], labels=ys[idx])
            opt.zero_grad(); out.loss.backward(); opt.step(); total += out.loss.item() * len(idx)
        print("epoch", ep + 1, "loss", round(total / len(ys), 3))
    model.eval()
    with torch.no_grad():
        pred = model(**enc(unseen.text)).logits.argmax(-1).numpy()

    epoch 1 loss 0.804
    epoch 2 loss 0.222
    epoch 3 loss 0.19

Passing \`labels=\` makes the model return a cross-entropy loss. The learning rate is 10–100 times smaller than for
training from scratch — the pretrained weights are already good, and a big step destroys them. On a laptop CPU this
took under three minutes; a 2-layer BERT (4.4 million parameters, 5 epochs at 1e-4) took about two.

## The comparison, on the same held-out tickets

Train on phrasings 0–5, test on the 724 tickets written in phrasings 6–7 (the honest test from the first unit):

| Approach | Accuracy | Macro F1 | Training | Inference, laptop CPU |
|---|---|---|---|---|
| TF-IDF words 1–2 + logistic regression | 0.664 | 0.678 | < 1 s | ~0.02 ms / ticket |
| Frozen all-MiniLM-L6-v2 embeddings + logistic regression | **0.884** | **0.888** | embed once, then < 1 s | a few ms / ticket |
| Fine-tuned all-MiniLM-L6-v2, 3 epochs | 0.851 | 0.857 | ~2.5 min | ~5 ms / ticket (batched) |
| Fine-tuned 2-layer BERT, 5 epochs | 0.677 | 0.722 | ~2 min | < 1 ms / ticket |
| Zero-shot NLI model, no training labels | 0.470 | 0.500 | none | ~155 ms / ticket |

(Timings were taken on a shared laptop CPU and vary run to run; read them as orders of magnitude.)

What the table teaches:

- **Pretraining is where the gain comes from.** Both MiniLM rows beat TF-IDF by about 20 points because the model
  already knew paraphrase. The tiny BERT, with little pretrained knowledge, barely beat TF-IDF.
- **Fine-tuning did not beat frozen embeddings here.** With only six phrasings per class to learn from, updating
  every weight let the model fit those phrasings; the frozen model kept its general knowledge. With varied
  training data, fine-tuning usually wins — but the only way to know is to test on held-out text like production.
- **No-label approaches are weakest** on this task, and slowest. Zero-shot is for bootstrapping, not for routing.
- On the random split all the trained approaches score about 0.96, which is why that split cannot choose between
  them.

## Bringing a prompted LLM into the same table

A prompted LLM is a candidate like any other: same held-out tickets, same metrics. A vendor-neutral sketch — the
endpoint and key come from environment variables, the reply is JSON with a fixed label set, and every reply is
validated:

    import os, json, requests
    LABELS = ["payment_failed", "refund", "kyc", "card", "login_otp"]
    PROMPT = ("Classify the customer support ticket from an Indian payments app into exactly one of: "
              + ", ".join(LABELS) + ". Tickets may be in English, Hindi or Hinglish. "
              'Reply with JSON only: {"label": "<one label>"}.')

    def llm_label(ticket):
        r = requests.post(os.environ["LLM_API_URL"], timeout=30,
                          headers={"Authorization": f"Bearer {os.environ['LLM_API_KEY']}"},
                          json={"messages": [{"role": "system", "content": PROMPT},
                                             {"role": "user", "content": ticket}], "temperature": 0})
        try:
            label = json.loads(r.json()["output_text"])["label"]   # field names depend on the provider
        except (KeyError, ValueError):
            return "INVALID"
        return label if label in LABELS else "INVALID"

Count INVALID replies as errors — they are errors in production too. Results from an LLM depend on the model and
its version, so record both with the scores, and re-run the evaluation when the provider changes the model.

## Cost and latency, computed rather than guessed

Cost of a prompted classifier = (input tokens × input price per token + output tokens × output price per token) ×
number of tickets. For 1,000 tickets with a 600-token instruction (with a few examples), 45 tokens per ticket and a
12-token JSON reply: 645,000 input tokens and 12,000 output tokens per thousand tickets. Multiply by the price per
token on the provider's current price page — prices change, the formula does not. Measure tokens with the
provider's own tokenizer; Hinglish needs more tokens per word (previous unit).

A fine-tuned encoder costs the server it runs on: a CPU machine scoring ~5 ms per ticket handles about 200 tickets a
second. Add the cost of the people who retrain and monitor it. TF-IDF costs almost nothing to run.

## A decision rule that holds up in interviews

1. **Start with the baseline** (TF-IDF) — it is the number to beat, and sometimes it is enough.
2. **Have labels and volume?** Try frozen embeddings, then a fine-tuned small encoder; keep what wins on held-out
   data from a later period.
3. **Few or no labels, or the labels change every month?** A prompted LLM — evaluated on a few hundred
   hand-labelled tickets — is the fastest way to ship; its labels can later train a cheap model (distillation).
4. **Can the data leave your systems?** Tickets with account details may not go to an external API without masking
   and a data-processing agreement; that alone can decide it.
5. **Training from scratch** a transformer is almost never right for a business text task — pretraining needs far
   more text and compute than any one company's tickets.`,
    workedExample: `**Task: an NBFC wants to tag 3 lakh loan-collection call transcripts a month with one of 12 reasons for
non-payment. There are 1,500 labelled transcripts. Choose an approach and justify it.**

**Step 1 — Volume and cost.** 3 lakh transcripts × ~800 tokens each = 24 crore input tokens a month for a prompted
LLM, plus the instructions and output. Write it as 240,000,000 × price per input token and get the current price —
at most providers this is a significant monthly line. A fine-tuned encoder on one CPU or small GPU server is a fixed
cost.

**Step 2 — Data rules.** Transcripts contain names, loan account numbers and phone numbers. Sending them out needs
masking and a contract; an in-house encoder avoids the question.

**Step 3 — Length.** 800 tokens exceeds a BERT-style encoder's 512-token limit. Options: keep the borrower's turns
only, or split into 512-token windows and average the predictions. Check how often the reason appears in the first
512 tokens.

**Step 4 — Run the candidates on the same held-out set** (the latest month's 300 labelled transcripts): TF-IDF
baseline, frozen embeddings, a fine-tuned encoder, and a prompted LLM on a sample. Report macro F1 and recall on the
rare reasons, which matter most to collections.

**Step 5 — Decide.** If the fine-tuned encoder is within a couple of points of the LLM, it wins on cost and privacy.
If the LLM is far ahead, use it to label more transcripts and fine-tune on those — the labels move in-house and the
monthly cost drops.

**What to say:** "I'd compare all four on the latest month's labelled calls. At 3 lakh a month with personal data in
the text, a fine-tuned encoder is the default unless an LLM is clearly more accurate — and then I'd use the LLM to
create training labels rather than call it on every transcript."`,
    mcqs: [
      mcq('Fine-tuned MiniLM scored 0.851 on unseen phrasings while frozen MiniLM embeddings with logistic regression scored 0.884. What is the most likely reason?', [
        ['Updating all weights on six phrasings per class fitted those phrasings', true],
        ['Fine-tuning always performs worse than frozen embeddings on any text task', false],
        ['The fine-tuned model used a smaller vocabulary than the frozen encoder did', false],
        ['Logistic regression is a stronger classifier than any transformer\'s head', false],
      ], 'The training text had little variety, so fine-tuning partly specialised the model to it. The frozen encoder kept its general sense of paraphrase. With varied training data the order often reverses — test, do not assume.'),
      mcq('Why is the learning rate for fine-tuning a pretrained transformer much smaller than for training from scratch?', [
        ['Large steps would overwrite the useful knowledge in the pretrained weights', true],
        ['Small learning rates are needed so that the tokenizer can be trained as well', false],
        ['Pretrained models have no gradients except in their classification head', false],
        ['A large learning rate makes the model output tokens instead of class labels', false],
      ], 'The pretrained weights already encode language. Fine-tuning nudges them toward the task; a large step pushes them far from that starting point and the benefit of pretraining is lost.'),
      mcq('A prompted LLM returns "Refund issue" for some tickets instead of one of the five allowed labels. How should the evaluation count those replies?', [
        ['As errors, since production code could not route them either', true],
        ['As correct when the meaning is close to the true label of the ticket', false],
        ['They should be dropped from the evaluation set before scoring', false],
        ['As a sixth class, with its own precision and recall reported', false],
      ], 'A reply outside the label set breaks the routing just as a wrong label does. Dropping them hides a failure mode and overstates accuracy.'),
    ],
    checkpoint: [
      ck(TR, 'On a random split, TF-IDF, frozen embeddings and a fine-tuned encoder all score about 0.96. Why can that split not choose between them?', [
        ['Its test phrasings also appear in training, so it does not test new wording', true],
        ['Accuracy cannot be compared across models that use different features', false],
        ['A random split always gives every model exactly the same accuracy', false],
        ['The test set is too large for differences between them to show up', false],
      ], 'Every model can memorise phrasings it saw. The differences appear only on wording held out from training — unseen templates here, a later time period in real data.'),
      ck(TR, 'A team has no labelled tickets and must start routing next week. Which plan is sound?', [
        ['Prompt an LLM, hand-label a few hundred tickets to measure it, keep its labels', true],
        ['Train a transformer from scratch on the unlabelled tickets, then route them', false],
        ['Fine-tune a small encoder now on the ticket text without using any labels at all', false],
        ['Use TF-IDF with logistic regression, which needs no labels to be trained', false],
      ], 'A prompted LLM needs no training labels, but it still needs a labelled sample to be evaluated. Its checked labels become training data for a cheaper model later.'),
      ck(TR, 'A prompted classifier uses a 600-token instruction, 45 tokens per ticket and a 12-token reply. How many input tokens do 10,000 tickets need?', [
        ['6,450,000 input tokens', true],
        ['6,570,000 input tokens', false],
        ['450,000 input tokens', false],
        ['645,000 input tokens', false],
      ], 'The instruction is sent with every ticket: (600 + 45) × 10,000 = 6,450,000 input tokens. The 12-token replies are output tokens, priced separately.'),
    ],
  },

  /* ── LLMS_FOR_DS ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_NLP_GENAI_LLMS_FOR_DS',
    notes: `For a data scientist, an LLM is first a **tool for making data**: labels for text nobody has labelled,
structured fields pulled out of free text, extra examples for a rare class. Each of those outputs then feeds a model
or a report, so each must be **measured** like any other model's output — against a labelled sample, with a
confidence interval, and re-measured when anything changes. This unit is about that measurement. (How to write
the prompt, count its tokens and parse its JSON is in the engineering tracks' AI topics; here those are assumed.)

## Zero-shot and few-shot labelling

- **Zero-shot**: the prompt gives the label set and a definition of each label, and the model labels the text.
- **Few-shot**: the prompt also includes a handful of labelled examples. Pick them to cover the confusions you
  expect — a refund that mentions a failed payment, a card ticket written as a payment problem — not random ones.
  Their order and wording can shift results, so freeze them once chosen.

Write the **label guide** first — the same one human labellers would get: what each label means, which wins when two
apply ("money debited for a cancelled order is refund, not payment_failed"), and what to do with nonsense ("other").
An LLM labels to the guide it is given; a vague guide gives vague labels from people and models alike.

## The gold set: the part people skip

To know how good LLM labels are, you need tickets labelled by people who followed the guide:

1. **Sample** 300–500 tickets at random from recent data (stratify if a class is rare, and record the weights).
2. **Two people label each ticket** independently. Their agreement, measured with **Cohen's kappa**, is the ceiling:
   if two careful humans agree only 85% of the time, no model will be "95% accurate" in a meaningful sense.
3. Disagreements are resolved by a third person, and the guide is updated.
4. **Split the gold set**: a **dev** part for improving the prompt, and a **test** part looked at once, at the end.
   Rewording the prompt until the test score rises is overfitting to the test set, exactly as with
   hyperparameters.

## Measuring LLM labels against the gold set

Suppose a prompted LLM labelled the 200-ticket test part and the counts came back as below (rows are the human
label, columns the LLM's). The counts are illustrative; the metrics below were computed from them:

| human \\ LLM | payment_failed | refund | kyc | card | login_otp |
|---|---|---|---|---|---|
| **payment_failed** | 52 | 9 | 0 | 2 | 1 |
| **refund** | 6 | 40 | 0 | 0 | 0 |
| **kyc** | 0 | 1 | 31 | 0 | 0 |
| **card** | 4 | 0 | 0 | 23 | 1 |
| **login_otp** | 0 | 0 | 1 | 1 | 28 |

    import numpy as np
    from sklearn.metrics import accuracy_score, classification_report, cohen_kappa_score
    from statsmodels.stats.proportion import proportion_confint
    labels = ["payment_failed", "refund", "kyc", "card", "login_otp"]
    cm = np.array([[52, 9, 0, 2, 1], [6, 40, 0, 0, 0], [0, 1, 31, 0, 0], [4, 0, 0, 23, 1], [0, 0, 1, 1, 28]])
    pairs = [(labels[i], labels[j]) for i in range(5) for j in range(5) for _ in range(cm[i, j])]
    human, llm = [a for a, _ in pairs], [b for _, b in pairs]
    print(round(accuracy_score(human, llm), 3), round(cohen_kappa_score(human, llm), 3))
    print(classification_report(human, llm, labels=labels, digits=2))
    print(proportion_confint(174, 200, method="wilson"))

    0.87 0.833
                    precision    recall  f1-score   support
    payment_failed       0.84      0.81      0.83        64
            refund       0.80      0.87      0.83        46
               kyc       0.97      0.97      0.97        32
              card       0.88      0.82      0.85        28
         login_otp       0.93      0.93      0.93        30
          accuracy                           0.87       200
         macro avg       0.89      0.88      0.88       200
    (0.816, 0.910)

How to read it:

- **Accuracy 0.87, 95% interval 0.82–0.91** (Wilson, from statistics in the analyst packs). With 200 tickets the
  estimate is ±5 points; report the interval, not "87%".
- **Kappa 0.833** corrects for agreement by chance; compare it with the human–human kappa. If the two humans reached
  0.86, the LLM is close to a second labeller.
- **The confusion is concentrated**: 15 of the 26 errors are payment_failed ↔ refund. That is a label-guide problem
  as much as a model problem — add the rule and two examples of exactly that boundary to the prompt.
- **Per-class recall matters downstream.** card recall 0.82 means 18% of card tickets go to the wrong queue.

## Did the new prompt really help?

Prompt v2 adds the payment/refund rule. On the **same** 200 tickets it scores 185/200 = 0.925 (interval 0.88–0.95).
The two intervals overlap — but they are not independent: both prompts labelled the same tickets. The right test is
**paired**: McNemar's test on the tickets where the two prompts disagree.

    from statsmodels.stats.contingency_tables import mcnemar
    #                 v2 right  v2 wrong
    table = np.array([[170,       4],      # v1 right
                      [ 15,      11]])     # v1 wrong
    print(mcnemar(table, exact=True).pvalue)

    0.0192

v2 fixed 15 tickets v1 got wrong and broke 4 that v1 got right; that imbalance is unlikely by chance (p ≈ 0.02).
Then confirm on the untouched test part — if the 200 were the dev part, they have been used to choose v2.

## Structured extraction

LLMs pull fields out of free text — amount, merchant, transaction date, the bank named. Evaluate **field by field**,
after normalising both sides, because "Rs 1,200" and 1200.0 are the same answer:

    import pandas as pd, numpy as np, re
    gold = pd.DataFrame({"ticket_id": [101, 102, 103, 104, 105, 106],
                         "amount": [450.0, 1200.0, np.nan, 2999.0, 15000.0, 89.0],
                         "merchant": ["swiggy", "irctc", None, "bigbasket", "my landlord", "zomato"]})
    llm = pd.DataFrame({"ticket_id": [101, 102, 103, 104, 105, 106],
                        "amount": ["Rs 450", "1,200", "0", "2999", "15000", None],
                        "merchant": ["Swiggy", "IRCTC", None, "Big Basket", None, "zomato"]})

    def to_amount(x):                       # "Rs 1,200" -> 1200.0; "0" or missing -> NaN
        if pd.isna(x): return np.nan
        v = float(re.sub(r"[^\\d.]", "", str(x)) or "nan")
        return np.nan if v == 0 else v
    def norm_name(x):                       # "Big Basket" -> "bigbasket"
        return "" if pd.isna(x) else re.sub(r"\\s+", "", str(x).lower())

    m = gold.merge(llm, on="ticket_id", suffixes=("_gold", "_llm"))
    a, b = m.amount_gold, m.amount_llm.map(to_amount)
    m["amount_ok"] = (a.isna() & b.isna()) | np.isclose(a, b)
    m["merchant_ok"] = m.merchant_gold.map(norm_name) == m.merchant_llm.map(norm_name)
    print(m[["amount_ok", "merchant_ok"]].mean().round(3).to_dict())

    {'amount_ok': 0.833, 'merchant_ok': 0.833}

Decide the normalisation rules **before** looking at scores (is "0" the same as "no amount"? here, yes), report
missing-versus-wrong separately (ticket 106 lost its amount; ticket 105 lost "my landlord"), and spot-check
**hallucinated** values — an amount that appears nowhere in the ticket text is worse than a blank. A simple check:
every extracted amount must occur as a number in the source text.

## Synthetic data, and its risks

An LLM can write a thousand "card declined abroad" tickets to fill a rare class. Use it with care:

- **It is less varied than real data.** Generated texts share phrasings and length; a model trained on them learns
  the generator's style — the same failure as the templated tickets in this topic, where unseen phrasings dropped
  TF-IDF from 0.96 to 0.66.
- **Its labels are whatever you asked for**, so it cannot teach a boundary you have not defined.
- **Never evaluate on synthetic data.** Test sets are real, labelled tickets only. Check that adding synthetic
  examples improves the real test score; if it does not, drop them.
- **Privacy.** Do not paste real customer tickets into a prompt to "make more like these" without masking them first.

## Habits that make LLM outputs usable

- Temperature 0 makes outputs more repeatable but not guaranteed identical; store every raw output with the prompt
  version and model name.
- An LLM's own stated confidence ("I am 90% sure") is poorly calibrated. Agreement between two prompts or two runs
  is a better signal for routing uncertain items to a person.
- Re-run the gold-set evaluation on a schedule and whenever the provider updates the model; drift in labels breaks
  every chart built on them.
- LLMs are poor at arithmetic over many rows. Use them to make labels and fields, then compute with pandas.`,
    mcqs: [
      mcq('Two analysts labelling the same 300 tickets reach a Cohen\'s kappa of 0.78. Why does that number matter when judging an LLM labeller?', [
        ['It is roughly the ceiling of agreement any labeller can reach on this task', true],
        ['It is the minimum accuracy that the LLM must reach before it can be used', false],
        ['It shows that the gold set is unusable and must be relabelled from scratch', false],
        ['It measures how well calibrated the LLM\'s stated confidence scores are', false],
      ], 'If careful people disagree this much, the task is partly ambiguous. An LLM whose kappa with the gold labels approaches the human–human kappa is about as good as a second person.'),
      mcq('A team rewrites its labelling prompt ten times, keeping each change that raises the score on its 200-ticket test set. What is wrong with this?', [
        ['The prompt is now tuned to those tickets, so their score is optimistic', true],
        ['Prompts must never be changed once the first labels have been produced', false],
        ['200 tickets are too many, since each run of the prompt costs tokens', false],
        ['Nothing — choosing the best prompt on the test set is standard practice', false],
      ], 'Choosing among prompts by test score is tuning on the test set, like choosing hyperparameters on it. Tune on a dev split and look at the test split once.'),
      mcq('An LLM extracts an amount of ₹4,500 from a ticket whose text contains no amount at all. Which simple check would have caught it?', [
        ['Require every extracted amount to appear as a number in the source text', true],
        ['Ask the LLM to state its confidence and reject replies scored below 50%', false],
        ['Set the temperature to 0 so that the model never invents any value', false],
        ['Round every extracted amount to the nearest hundred before using it', false],
      ], 'A value that appears nowhere in the input is a hallucination. A grounding check against the source text is cheap and catches it; stated confidence and temperature do not.'),
    ],
    checkpoint: [
      ck(TR, 'Prompt v1 scored 174/200 and prompt v2 185/200 on the same tickets, and their Wilson intervals overlap. Which test decides whether v2 is better?', [
        ['McNemar\'s test on the tickets where the two prompts disagree', true],
        ['A two-sample t-test on the two accuracies treated as independent', false],
        ['Comparing the intervals: overlapping ones mean there is no difference', false],
        ['A chi-square test of each prompt\'s labels against a uniform split', false],
      ], 'Both prompts labelled the same tickets, so the comparison is paired. McNemar uses the discordant tickets (15 fixed, 4 broken here) and found p ≈ 0.02.'),
      ck(TR, 'Fifteen of an LLM labeller\'s 26 errors are payment_failed tickets labelled refund or the reverse. What is the best first fix?', [
        ['State the rule for that boundary in the guide and add examples of it to the prompt', true],
        ['Raise the temperature so the model explores other labels more freely', false],
        ['Merge payment_failed and refund into a single class to remove the errors', false],
        ['Replace the LLM with TF-IDF, which never confuses two neighbouring classes', false],
      ], 'Concentrated confusion usually means the boundary is not defined. Writing the rule ("money debited for a cancelled order is refund") and showing examples addresses the cause.'),
      ck(TR, 'A team adds 2,000 LLM-generated tickets for a rare class. Where must the effect be measured?', [
        ['On a test set of real, human-labelled tickets only', true],
        ['On a held-out part of the generated tickets themselves', false],
        ['On the training set, where the new tickets were added', false],
        ['On a fresh batch of tickets generated with a new prompt', false],
      ], 'Synthetic tickets share the generator\'s style, so scoring on them flatters any model trained on them. Only real labelled tickets show whether production accuracy improved.'),
    ],
  },

  /* ── RAG_BASICS ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_NLP_GENAI_RAG_BASICS',
    notes: `**Retrieval-augmented generation (RAG)** answers questions from your own documents: find the passages most
relevant to the question, put them in the prompt, and ask the LLM to answer from them alone. Engineers build it; a
data scientist is asked **how good it is** and **which part to fix**. This unit builds a minimal retriever over a
payments app's help centre and evaluates retrieval and answers separately.

## The pipeline in four steps

1. **Chunk** each document into passages small enough to be specific and large enough to make sense alone.
2. **Embed** every chunk once and store the vectors (a vector index or database).
3. **Retrieve**: embed the question and take the top-k chunks by cosine, often combined with keyword search.
4. **Generate**: prompt the LLM with the question and the retrieved chunks, instructing it to answer only from them
   and to say when they do not contain the answer.

If retrieval misses the right passage, no LLM can answer correctly from it. So the first number to measure is
retrieval quality, and it needs **no LLM at all**.

## The data: a help centre and an evaluation set

Eight help articles (money debited but UPI failed, refunds, KYC, wallet limits, blocking a card, OTP and login,
changing your mobile number, merchant disputes), each a title and three or four short paragraphs. The **evaluation
set** is 20 questions written the way users ask them, each with the article that answers it:

    QUESTIONS = [
        ("My money was cut from the bank but the UPI payment failed. When will I get it back?", "upi_failed"),
        ("What is the UTR number used for?", "upi_failed"),
        ("I cancelled my order. How long until the refund reaches my bank account?", "refund"),
        ("I finished full KYC yesterday, my limit is still the same", "wallet_limit"),
        ("Can I unblock a card that I blocked?", "card_block"),
        ("Why is UPI not working after I changed my phone number?", "change_mobile"),
        ("How many days do I have to dispute a card payment?", "chargeback"),
        # ... 20 in all, two or three per article
    ]

Building this set is most of the work, and it is the asset that lets every later change be measured. Take questions
from real search logs and tickets where you can; questions you write yourself tend to reuse the documents' words and
make keyword search look better than it is.

## Chunking

    def chunk_paragraphs(articles):                 # one chunk per paragraph, title kept with each
        out = []
        for aid, text in articles.items():
            title, *paras = text.split("\\n")
            for p in paras:
                out.append((aid, title + " " + p))
        return out

    def chunk_words(articles, size=40, overlap=10):  # fixed windows of 40 words, overlapping by 10
        out = []
        for aid, text in articles.items():
            w = text.split()
            for s in range(0, max(len(w) - overlap, 1), size - overlap):
                out.append((aid, " ".join(w[s:s + size])))
        return out

Keeping the article title with each paragraph matters: "A blocked card cannot be unblocked" is clearer to the
embedding model as "Blocking and unblocking your debit card. A blocked card cannot be unblocked".

## Retrieval metrics

For each question, rank all chunks by score and find the rank of the first chunk from the correct article:

- **Hit rate@1** — share of questions whose top chunk is from the right article.
- **Recall@k** — share with a right chunk in the top k (k = the number of chunks you will put in the prompt).
- **MRR** (mean reciprocal rank) — average of 1 / rank; rewards putting the right chunk near the top.

    import numpy as np
    from sklearn.feature_extraction.text import TfidfVectorizer

    def evaluate(chunks, scorer, k=3):
        ids = [a for a, _ in chunks]
        S = scorer([c for _, c in chunks], [q for q, _ in QUESTIONS])
        hit1 = hitk = rr = 0
        for i, (_, gold) in enumerate(QUESTIONS):
            rank = [ids[j] for j in np.argsort(-S[i])].index(gold) + 1
            hit1 += rank == 1; hitk += rank <= k; rr += 1 / rank
        n = len(QUESTIONS)
        return round(hit1 / n, 2), round(hitk / n, 2), round(rr / n, 3)

    def tfidf_scores(docs, qs):
        v = TfidfVectorizer(sublinear_tf=True, stop_words="english").fit(docs)
        return (v.transform(qs) @ v.transform(docs).T).toarray()
    def emb_scores(docs, qs):
        return embed(qs) @ embed(docs).T                  # MiniLM, from the embeddings unit
    def hybrid_scores(docs, qs, w=0.5):                   # min-max scale each, then blend
        mm = lambda S: (S - S.min(1, keepdims=True)) / (S.max(1, keepdims=True) - S.min(1, keepdims=True) + 1e-9)
        return w * mm(tfidf_scores(docs, qs)) + (1 - w) * mm(emb_scores(docs, qs))

Calling \`evaluate\` for each chunking and each scorer gives (hit@1, recall@3, MRR):

| Chunking | TF-IDF | Embeddings | Hybrid |
|---|---|---|---|
| Whole article (8 chunks) | 0.85, 1.0, 0.917 | 0.9, 1.0, 0.942 | 0.9, 1.0, 0.95 |
| Paragraph + title (21 chunks) | 0.85, 0.95, 0.912 | 0.95, 1.0, 0.975 | 0.9, 1.0, 0.95 |
| 40 words, 10 overlap (21 chunks) | 0.9, 1.0, 0.942 | 1.0, 1.0, 1.0 | 0.95, 1.0, 0.967 |

(Stop words are removed for retrieval here — for matching a question to a passage, "how" and "the" add nothing, and
negation matters less than in classification.)

Read it the way a reviewer would:

- **Twenty questions is a small set.** Each question is 5 points of hit@1; "0.95 vs 1.0" is one question. These
  numbers show the method, not a winner — a real evaluation needs a few hundred questions, and the comparison should
  be paired (the same questions, counting which ones each method gets right).
- **Look at the misses, by name** (paragraph chunks). Keyword search put the wrong article first for "Why is UPI not
  working after I changed my phone number?" (it matched "UPI" to the failed-payment article), "The seller never
  delivered my order" (no shared words with "goods or service" and "merchant") and "How many days do I have to
  dispute a card payment?" (sent to the failed-payment article's dispute paragraph). Embeddings missed "What is the UTR number used for?" — "UTR" is a rare code
  the embedding model has no meaning for, while keyword search ranked the right article first. That pattern is
  general: **embeddings win on paraphrase, keywords win on exact identifiers** (UTR, error codes, product names),
  and hybrid retrieval exists to get both.
- **Chunking changed the result as much as the retriever did** — and the best size for 20 questions over eight short
  articles says little about a 400-page policy manual. Re-run this table on your own documents.

## Evaluating the generated answer

Once retrieval is good, judge the answers on three questions, for a sample of evaluation questions:

1. **Faithfulness** — is every claim in the answer supported by the retrieved chunks? An answer saying "refunds take
   3 days" when the chunk says "5 to 7 working days" is unfaithful even if it sounds helpful.
2. **Correctness** — does it answer the question, compared with a reference answer written by someone who knows the
   policy?
3. **Refusal when it should** — for questions the documents do not answer (include some in the set: "What is the
   interest rate on a personal loan?"), does it say it does not know rather than invent?

People rate a sample of a hundred or so on these criteria. An **LLM-as-judge** (a second prompt that scores
faithfulness given the chunks and the answer) scales this up, but it is itself a model with errors: measure its
agreement with the human ratings on the same sample before relying on it, as with any labeller.

## Which part to fix

| Symptom on the evaluation set | Where the fault is | What to try |
|---|---|---|
| Right article not in top k | Retrieval | Chunking with titles, hybrid search, a better embedding model, more k |
| Right chunk retrieved, wrong answer | Generation | Clearer instructions, fewer and better-ordered chunks |
| Answer adds facts not in the chunks | Generation (faithfulness) | "Answer only from the context; otherwise say you don't know", and test it |
| Right answer last month, wrong now | Documents | Re-index when articles change; store document version with each chunk |
| Exact codes (UTR, error 502) not found | Retrieval | Keyword or hybrid search |

Report retrieval and answer quality separately, so that a change can be traced to the step it affected.`,
    mcqs: [
      mcq('Embedding search misses "What is the UTR number used for?" while keyword search finds the right article. What is the general lesson?', [
        ['Embeddings handle paraphrase but not rare exact codes; hybrid search covers both', true],
        ['Keyword search is more accurate than embeddings for every kind of question users ask', false],
        ['The embedding model is broken and should be replaced by a much larger model', false],
        ['Questions containing abbreviations should be removed from the evaluation set', false],
      ], 'An identifier like UTR carries little meaning for an embedding model but is an exact match for keywords. Hybrid retrieval combines the two strengths.'),
      mcq('On 20 evaluation questions, one chunking scores hit@1 0.95 and another 1.0. What should the team conclude?', [
        ['The gap is one question; a few hundred are needed to choose', true],
        ['The second chunking is better and should now replace the first', false],
        ['Hit@1 cannot be compared between two chunking strategies', false],
        ['Both scores are too high, so the evaluation set is leaking', false],
      ], 'With 20 questions each one is 5 points. One question\'s difference is well within noise; a larger set and a paired comparison are needed before a decision.'),
      mcq('Why should a RAG evaluation set include some questions the documents do not answer?', [
        ['To check that the system says it does not know instead of inventing', true],
        ['To lower the scores so that later improvements look more impressive', false],
        ['To train the embedding model on the questions it cannot yet answer', false],
        ['To measure recall@k, which needs questions with no correct document', false],
      ], 'A grounded system should refuse when the context lacks the answer. Without such questions, an assistant that confidently invents answers would never be caught.'),
    ],
    checkpoint: [
      ck(EM, 'For four questions, the first correct chunk is at rank 1, rank 3, not retrieved, and rank 2. What are recall@3 and MRR?', [
        ['Recall@3 0.75 and MRR about 0.458', true],
        ['Recall@3 0.75 and MRR about 0.611', false],
        ['Recall@3 0.50 and MRR about 0.458', false],
        ['Recall@3 1.00 and MRR about 0.367', false],
      ], 'Three of four questions have a correct chunk in the top 3, so recall@3 = 0.75. MRR = (1 + 1/3 + 0 + 1/2) / 4 = 0.458; an unretrieved question contributes 0.'),
      ck(EM, 'A RAG assistant gives wrong answers, and the evaluation shows the correct chunk is in the top 3 for 98% of questions. Where should the team look first?', [
        ['At generation — the prompt and how the model uses the retrieved chunks', true],
        ['At the embedding model, which should be replaced with a larger one', false],
        ['At chunking, since smaller chunks always improve answer correctness', false],
        ['At the vector index, which is probably returning chunks at random', false],
      ], 'Retrieval is already finding the right passage. Wrong answers with the right context point to the generation step: instructions, the number and order of chunks, or faithfulness.'),
      ck(TR, 'A team wants an LLM-as-judge to score the faithfulness of 10,000 RAG answers. What must they do first?', [
        ['Compare the judge\'s scores with human ratings on a sample', true],
        ['Use the same model as the assistant so the scores are consistent', false],
        ['Nothing — a judge model is accurate whenever temperature is 0', false],
        ['Ask the judge to explain its scores, so no checking is needed', false],
      ], 'A judge is a labeller with its own error rate. Its agreement with careful human ratings on a sample decides whether its scores can stand in for people.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_NLP_GENAI_DEBUGGING',
    notes: `Text models fail quietly. A tokenizer from the wrong model, a pooling step that counts padding, a prompt tuned on
the test set — each still produces confident labels and a respectable-looking score. These eight faults, each with
symptom, cause and fix, are the ones that reach production in NLP work.

## 1. The vectoriser was fitted twice

**Symptom:** \`ValueError: X has 812 features, but LogisticRegression is expecting 772 features as input\` — or, in a
version where the counts happened to match, test accuracy near chance.
**Cause:** \`TfidfVectorizer().fit_transform(test_text)\` on the test set builds a **new** vocabulary, so column 17
means a different word than it did in training.
**Fix:** fit once, on training text, and only \`transform\` everything else — simplest with the vectoriser inside a
\`Pipeline\` that is saved and loaded as one object.

## 2. Complaints scored as compliments

**Symptom:** a review classifier marks "delivery was not good" and "not happy with the refund" as positive.
**Cause:** \`stop_words="english"\` removed "not", "no" and "never" — they are on scikit-learn's list — leaving "delivery
was good" and "happy with the refund".
**Fix:** drop the stop-word list (TF-IDF already down-weights common words) or pass a custom list without
negations; add bigrams so "not good" is a feature of its own.

## 3. The same ticket gets a different embedding in a batch

**Symptom:** semantic search returns different results for a query depending on what else was in the batch; a text
embedded alone and in a batch has cosine **0.695** with itself.
**Cause:** mean pooling with \`h.mean(1)\` averages the **padding** positions too. Short texts in a batch with a long
one are padded, and the padding vectors drag the average.
**Fix:** pool with the attention mask: \`(h * mask).sum(1) / mask.sum(1)\`. With the mask, the same text gives the same
vector in any batch (cosine 1.0 with itself).

## 4. Everything looks similar to everything

**Symptom:** cosine between unrelated tickets ("otp not coming", "kyc rejected") is 0.54–0.77, so every duplicate
threshold merges too much.
**Cause:** the code took the **[CLS] vector** from a model trained with mean pooling. With mean pooling, the same
pairs scored 0.13–0.32.
**Fix:** use the pooling stated on the model card (or the \`sentence-transformers\` wrapper, which reads it from the
model's config), and re-set any thresholds afterwards.

## 5. Predictions near chance after a "simple" upgrade

**Symptom:** a fine-tuned classifier that scored 0.88 now scores 0.30 after someone "updated the tokenizer".
**Cause:** the tokenizer was loaded from a different checkpoint (an uncased vocabulary for a cased model, or a newer
model's tokenizer). Token IDs now point to different rows of the embedding table.
**Fix:** load tokenizer and model from the same directory or name, save them together
(\`model.save_pretrained(d); tok.save_pretrained(d)\`), and add a test that scores ten known tickets after loading.

## 6. The same ticket, two different labels

**Symptom:** calling the fine-tuned model twice on one ticket returns refund, then payment_failed.
**Cause:** the model was left in **training mode** after fine-tuning, so dropout randomly zeroes activations on every
call.
**Fix:** \`model.eval()\` before predicting, and \`torch.no_grad()\` (or \`torch.inference_mode()\`) to save memory and
time. Check: two calls on the same batch must return identical logits.

## 7. Long tickets are misclassified

**Symptom:** accuracy is 0.90 for tickets under 50 words and 0.71 for tickets over 150 words.
**Cause:** \`truncation=True, max_length=64\` silently cut long tickets; the reason ("…and the refund still has not
come") was often at the end, after a long story.
**Fix:** check the token-length distribution first (\`tok(texts)["input_ids"]\` lengths); raise \`max_length\` up to
the model's limit, keep the head and tail of the text, or split into windows and combine predictions. Report
accuracy by length band.

## 8. The LLM labeller was 96% accurate — on its own examples

**Symptom:** a prompted labeller scored 0.96 on the evaluation set and 0.84 on next month's audited tickets.
**Cause:** the few-shot examples in the prompt were taken from the evaluation set, and the prompt was reworded
repeatedly while watching that set's score.
**Fix:** keep few-shot examples and prompt tuning on a dev split; score the test split once; re-audit a fresh monthly
sample.

## A debugging order for text models

1. Score ten tickets you know the answer to, by hand, after every load and before every evaluation.
2. Check the data path: same tokenizer, same vocabulary, same pooling, eval mode, truncation length.
3. Check the evaluation: split by time or source, no examples shared with prompts, metrics per class and per length
   or language.
4. Only then change the model.`,
    mcqs: [
      mcq('A text embedded alone and inside a padded batch gives two vectors with cosine 0.695. What is the most likely cause?', [
        ['Mean pooling included the padding positions instead of using the attention mask', true],
        ['The model was left in training mode, so dropout changed each of the vectors', false],
        ['Cosine similarity is not defined for vectors produced by a transformer model', false],
        ['The batch was longer than the model\'s maximum length, so the text was cut', false],
      ], 'Without the mask, padded positions are averaged in, and the amount of padding depends on the longest text in the batch. Masked mean pooling gives the same vector in any batch.'),
      mcq('A fine-tuned classifier returns different labels for the same ticket on two calls. Which fix addresses the cause?', [
        ['Call model.eval() so dropout is switched off during prediction', true],
        ['Lower the learning rate and fine-tune the model once more from scratch', false],
        ['Set the tokenizer\'s padding to "max_length" for every single call', false],
        ['Use a larger batch size so the random variation averages itself out', false],
      ], 'In training mode, dropout zeroes random activations on each forward pass. eval() disables it, making predictions deterministic.'),
      mcq('Accuracy is 0.90 for short tickets and 0.71 for long ones, and the tokenizer uses max_length=64. What should be checked first?', [
        ['How many tickets exceed 64 tokens, since truncation drops their endings', true],
        ['Whether long tickets use more stop words that should have been removed', false],
        ['Whether the learning rate was too high for the longer training tickets', false],
        ['Whether the attention mask is all ones for the longest tickets in a batch', false],
      ], 'Truncation is silent. If the reason for the ticket often comes late, cutting at 64 tokens removes it. The token-length distribution shows how many tickets are affected.'),
      mcq('After someone updates "only the tokenizer", a classifier drops from 0.88 to 0.30. What happened?', [
        ['Token IDs no longer match the rows of the model\'s embedding table', true],
        ['The new tokenizer is slower, so requests timed out and were scored as wrong', false],
        ['The new tokenizer removed stop words, which the classifier depended on', false],
        ['Tokenizers must be retrained every month, and this one was out of date', false],
      ], 'A model learns one vector per token ID of its own vocabulary. A different tokenizer sends different IDs, so the model reads nonsense. Tokenizer and model must come from the same checkpoint.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_NLP_GENAI_PRACTICE',
    notes: `Six exercises. Work each on paper or in a notebook before reading the answer; every number was checked in
Python with scikit-learn 1.9 and NumPy 2.5.

## Exercise 1 — TF-IDF by hand

Three tickets: "refund not received", "refund received thanks", "otp not received". scikit-learn's default idf is
ln((1 + n) / (1 + df)) + 1, with n = 3 documents. Compute the idf of "refund", "otp" and "received", then the
L2-normalised TF-IDF vector of the first ticket.

**Answer.** "refund" is in 2 documents: ln(4/3) + 1 = **1.288**. "otp" is in 1: ln(4/2) + 1 = **1.693**. "received"
is in all 3: ln(4/4) + 1 = **1.0** ("not" is in 2, so 1.288). The first ticket's raw weights are not 1.288, received
1.0, refund 1.288; their length is √(1.288² + 1² + 1.288²) = 2.077, so the normalised vector is **not 0.620,
received 0.481, refund 0.620**. The word in every document gets the lowest weight.

## Exercise 2 — Cosine similarity

Two embeddings (shortened to three dimensions): a = (1, 2, 2), b = (2, 1, 2). Compute their cosine similarity. If
both were first normalised to length 1, what would their dot product be?

**Answer.** a·b = 2 + 2 + 4 = 8; ‖a‖ = ‖b‖ = 3; cosine = 8 / 9 = **0.889**. After normalising, the dot product is
the cosine, **0.889** — which is why search systems normalise once and use dot products.

## Exercise 3 — One attention step

One token's query-key scores against three tokens are 2, 1 and 0, and d = 4. The three value vectors are (1, 0),
(0, 1) and (1, 1). Compute the attention weights and the token's output vector.

**Answer.** Scale by √4 = 2: (1, 0.5, 0). Softmax: e¹ = 2.718, e⁰·⁵ = 1.649, e⁰ = 1; total 5.367; weights **0.506,
0.307, 0.186**. Output = 0.506·(1, 0) + 0.307·(0, 1) + 0.186·(1, 1) = **(0.693, 0.494)**.

## Exercise 4 — What a prompted classifier costs

A prompted ticket classifier sends a 600-token instruction (with examples), an average ticket of 45 tokens, and
receives a 12-token JSON reply. The app gets 12,000 tickets a month. Write the monthly cost as a formula in
p_in and p_out (price per input and per output token). How does the cost change if the instruction is cut to 300
tokens?

**Answer.** Input tokens = (600 + 45) × 12,000 = **7,740,000**; output tokens = 12 × 12,000 = **144,000**. Monthly cost
= 7,740,000 × p_in + 144,000 × p_out. With a 300-token instruction, input becomes (300 + 45) × 12,000 = 4,140,000 —
**46.5% fewer input tokens**, because the instruction is resent with every ticket. Check that accuracy holds on the
labelled set before shipping the shorter prompt.

## Exercise 5 — Agreement beyond chance

A human and an LLM flag 100 tickets as urgent or not. Both say urgent: 20; both say not urgent: 60; human urgent and
LLM not: 8; human not and LLM urgent: 12. Compute observed agreement, chance agreement and Cohen's kappa.

**Answer.** Observed p_o = (20 + 60) / 100 = **0.80**. The human says urgent 28% of the time, the LLM 32%. Chance
agreement p_e = 0.28 × 0.32 + 0.72 × 0.68 = **0.5792**. Kappa = (0.80 − 0.5792) / (1 − 0.5792) = **0.525** —
moderate. 80% agreement sounds high, but most of it is two raters saying "not urgent" to the many ordinary tickets.

## Exercise 6 — Retrieval metrics

For five evaluation questions, the first correct chunk is at rank 2, 1, 5, not retrieved, and 1. Compute hit
rate@1, recall@3 and MRR.

**Answer.** Hit@1 = 2/5 = **0.4**. Recall@3: ranks 2, 1 and 1 are within 3, so **0.6**. MRR = (1/2 + 1 + 1/5 + 0 + 1)
/ 5 = 2.7 / 5 = **0.54**. The question at rank 5 counts for MRR but not for recall@3 — if only three chunks go into
the prompt, the LLM never sees its answer.`,
    mcqs: [
      mcq('A word appears in every document of the corpus. With scikit-learn\'s default smoothed idf, what is its idf?', [
        ['Exactly 1, the lowest value any term can get', true],
        ['Exactly 0, so the word is removed from the vectors', false],
        ['ln(2) + 1, about 1.69, the same as any common word', false],
        ['It is undefined, and the vectoriser raises an error', false],
      ], 'idf = ln((1 + n) / (1 + n)) + 1 = ln(1) + 1 = 1. The +1 keeps such words in the vector at the lowest weight instead of deleting them.'),
      mcq('Raw attention scores for one token are 4, 2 and 0 with d = 16. What are the scaled scores before softmax?', [
        ['1, 0.5 and 0', true],
        ['0.25, 0.125 and 0', false],
        ['4, 2 and 0, since scaling is applied after softmax', false],
        ['2, 1 and 0', false],
      ], 'Scores are divided by √d = √16 = 4 before the softmax, giving 1, 0.5 and 0. Scaling keeps large dot products from making the softmax nearly one-hot.'),
      mcq('A human and an LLM agree on 90% of 200 tickets, and chance agreement for their label rates is 0.80. What is Cohen\'s kappa?', [
        ['0.50', true],
        ['0.90', false],
        ['0.10', false],
        ['0.875', false],
      ], 'Kappa = (p_o − p_e) / (1 − p_e) = (0.90 − 0.80) / 0.20 = 0.50. High raw agreement can hide modest agreement beyond chance when one label dominates.'),
      mcq('A prompted classifier\'s instruction is 800 tokens and each ticket averages 50. Roughly what share of input tokens does halving the instruction save?', [
        ['About 47%', true],
        ['About 50%', false],
        ['About 6%', false],
        ['About 94%', false],
      ], 'Per ticket the input falls from 850 to 450 tokens: 400 / 850 ≈ 47%. The saving is large because the instruction is resent with every ticket.'),
      mcq('For three questions the first correct chunk is at ranks 1, 4 and 2. With three chunks placed in the prompt, what is recall@3?', [
        ['2/3, because the rank-4 chunk never reaches the prompt', true],
        ['1, because every question has a correct chunk somewhere', false],
        ['1/3, because only one question has its chunk at rank 1', false],
        ['0.58, the mean of the reciprocal ranks of the three', false],
      ], 'Recall@3 counts questions with a correct chunk in the top 3: ranks 1 and 2 qualify, rank 4 does not. 0.58 is the MRR, a different metric.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_NLP_GENAI_INTERVIEW_QUESTION',
    notes: `NLP questions in data-science interviews have moved from "explain TF-IDF" to "would you use an LLM for this, and
how would you know it works?". Fintech, e-commerce and customer-experience teams ask about ticket and review
classification; product companies ask how attention works and the difference between BERT and GPT; everyone asks
how you would evaluate an LLM feature. The interviewer is listening for a baseline, an honest split, numbers on
cost, and a plan to measure. Three questions, model answers, follow-ups.

## 1. "We get 20,000 support tickets a day in English and Hinglish. How would you route them automatically?"

**Model answer.** "First I'd fix the label set with the support leads — say ten queues with written definitions —
and get a few thousand recent tickets labelled, with a sample labelled twice to measure agreement, because that's
the ceiling for any model.

I'd split by time: train on earlier months, test on the latest, because new app versions bring new wording. Then a
TF-IDF baseline with word and character n-grams and logistic regression — characters because Hinglish is spelt many
ways. In a project I did on simulated fintech tickets, that baseline scored 0.96 on a random split but 0.66 on
phrasings it hadn't seen, which is the number I'd trust.

Next, frozen sentence embeddings with a linear model, and a fine-tuned small encoder like MiniLM. In that project,
frozen embeddings reached 0.88 on the unseen phrasings. I'd check the embedding model handles romanised Hindi —
multilingual models often don't. At 20,000 a day, a small encoder on our own servers is cheap and keeps customer
data in-house; I'd compare a prompted LLM on a sample, and if it's much better, use it to create training labels
rather than call it on every ticket.

In production: route only when the model is confident, send the rest to a general queue, mask phone numbers and UPI
IDs before storing text, and audit a weekly sample per queue to catch drift."

**Follow-ups:**
- *"How do you set the confidence threshold?"* On the validation set, plot accuracy of the routed tickets against
  the share routed; choose the threshold where routed accuracy meets the support team's target (say 95%), and
  report what share goes to manual triage.
- *"A new queue is added next month. What changes?"* Write its definition, label examples (an LLM can propose
  candidates for review), retrain, and re-evaluate every class — a new class steals tickets from its neighbours.

## 2. "Explain attention. What's the difference between BERT and GPT?"

**Model answer.** "Attention lets each token build its representation from all the others. Each token gets a
query, key and value vector by learned projections; the query is compared with every key by dot product, scaled by
the square root of the dimension, softmaxed into weights, and the output is the weighted sum of the values. In
'refund not received', that's how 'received' picks up 'not'. Many heads run in parallel and the block is stacked
in layers. Because every token attends to every token, the cost grows with the square of the length — that's why
there's a context limit.

BERT is an encoder: it sees the whole text in both directions and was pretrained by predicting masked words, so
it's good at understanding tasks — classification, extraction, embeddings — usually after fine-tuning. GPT-style
models are decoders: each token sees only earlier ones, pretrained to predict the next token, so they generate text
and can do tasks from a prompt. For a fixed classification task at volume, I'd usually fine-tune a small encoder;
for open-ended generation or few labels, a decoder through prompting."

**Follow-ups:**
- *"How does the model know word order?"* Attention alone is order-blind; position information is added to the token
  embeddings — learned or fixed position vectors, or rotary encodings in many newer models.
- *"What is a tokenizer doing, and why does it matter for cost?"* It maps text to IDs from a fixed subword
  vocabulary. Rare words and romanised Hindi split into several pieces, so the same message costs more tokens — more
  money with an API and less room in the context.

## 3. "Your team wants to use an LLM to label 2 lakh customer reviews for a sentiment dashboard. How do you make sure the labels are right?"

**Model answer.** "I'd treat the LLM as a labeller and evaluate it like one. First, a written guide — what counts as
negative, how to label mixed reviews and sarcasm, what to do with Hinglish. Then a gold set of about 400 reviews,
sampled from the real stream and labelled by two people, split into dev and test. The human–human kappa tells me the
ceiling.

I'd tune the prompt and few-shot examples on dev only, then score the test part once: accuracy with a Wilson
interval, kappa against the humans, per-class recall, and separate numbers for English and Hinglish. If I compare
two prompts, I use McNemar's test on the same reviews rather than eyeballing intervals.

Before the full run, I'd estimate cost as tokens times price, mask any personal data, set temperature to 0 and store
the raw outputs with the prompt and model version. After the run, I'd audit a random monthly sample, because the
provider can update the model, and a shift in labels would show up on the dashboard as a fake change in customer
sentiment."

**Follow-ups:**
- *"The dashboard shows negative reviews up 6 points this month. Real or not?"* Check whether the model, prompt or
  input mix changed (more Hinglish, a new source); re-label last month's audit sample with this month's setup — if
  last month also moves, the shift is the labeller, not the customers.
- *"Could you avoid calling the LLM for every review?"* Yes — use its audited labels to fine-tune a small encoder,
  verify it matches the LLM on the test set, and run that instead.`,
    mcqs: [
      mcq('An interviewer asks how you would route tickets. Which evaluation detail most shows you understand production text data?', [
        ['Testing on a later time period, because new wording appears over time', true],
        ['Using 10-fold cross-validation with shuffling on the full ticket history', false],
        ['Reporting training accuracy, which shows how well the model has learned', false],
        ['Choosing the model with the most parameters available for the language', false],
      ], 'A random split hides the drop that new phrasings cause; in the simulated tickets it was 0.96 versus 0.66. A time-based split estimates what production will see.'),
      mcq('Asked how a transformer knows word order, which answer is correct?', [
        ['Position information is added to the token vectors, since attention alone ignores order', true],
        ['Attention processes tokens from left to right, so their order is built into the computation', false],
        ['The tokenizer sorts the tokens alphabetically, and the model learns to undo the sort', false],
        ['Word order is not used at all; transformers treat every sentence as a bag of words', false],
      ], 'Self-attention is permutation-invariant on its own. Position embeddings (learned, sinusoidal or rotary) give the model order.'),
      mcq('A sentiment dashboard built on LLM labels shows negative reviews up 6 points in a month. What is the first thing to rule out?', [
        ['That the labeller changed, by re-labelling last month\'s audit sample', true],
        ['That customers are unhappy, by launching a survey of recent buyers', false],
        ['That the dashboard is broken, by rebuilding it in a different BI tool', false],
        ['That the reviews are fake, by removing every review under ten words', false],
      ], 'A model or prompt change can move the labels with no change in customers. Re-labelling an old sample with the current setup separates labeller drift from real change.'),
    ],
  },

  /* ── MINI_PROJECT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_NLP_GENAI_MINI_PROJECT',
    notes: `# Mini Project — Classifying Support Tickets Three Ways

A payments app's support head asks one question: "Should we route tickets with the old keyword model, a fine-tuned
transformer, or an LLM?" You will answer it with evidence. Clean four months of tickets, build three classifiers —
**TF-IDF with a linear model**, a **fine-tuned small transformer**, and a **prompted LLM** — score all three on the
**same held-out set**, measure accuracy, cost per thousand tickets and latency, and recommend one with reasons.

## The data

Generate it with this script. It uses \`make_tickets\` from the "Working with Text" unit (save that function as
\`gen.py\`); it runs in a few seconds.

    import numpy as np, pandas as pd
    from gen import make_tickets          # the generator from "Working with Text"

    rng = np.random.default_rng(2026)
    df = make_tickets(n=8000, seed=21).drop(columns="true_label")
    # trap 6: phrasings 6-7 appear only from September — a new app version, new wording
    month = np.where(df.tpl >= 6, rng.choice([6, 7, 8, 9], len(df), p=[0.0, 0.0, 0.0, 1.0]),
                     rng.choice([6, 7, 8, 9], len(df), p=[0.3, 0.3, 0.3, 0.1]))
    day = rng.integers(1, 29, len(df))
    df["created_at"] = pd.to_datetime({"year": 2026, "month": month, "day": day}) + pd.to_timedelta(rng.integers(0, 86400, len(df)), unit="s")
    df["customer_id"] = [f"C{x:06d}" for x in rng.integers(1, 6000, len(df))]
    # trap 1: PII inside the text
    pii = rng.random(len(df)) < 0.12
    df.loc[pii, "text"] = df.loc[pii, "text"] + [f" my number {rng.integers(6, 10)}{rng.integers(100000000, 999999999)}" for _ in range(pii.sum())]
    upi = rng.random(len(df)) < 0.06
    df.loc[upi, "text"] = df.loc[upi, "text"] + [f" upi id {n}@ok{b}" for n, b in zip(rng.choice(["ravi.k", "priya92", "anil.s", "meena_r"], upi.sum()), rng.choice(["axis", "hdfc", "sbi"], upi.sum()))]
    # trap 2: the same complaint resent within hours
    rep = df.sample(600, random_state=1).copy()
    rep["created_at"] = rep["created_at"] + pd.to_timedelta(rng.integers(600, 72 * 3600, len(rep)), unit="s")
    rep["text"] = rep["text"] + rng.choice([" again", " still not resolved", " ???", " reminder"], len(rep))
    df = pd.concat([df, rep], ignore_index=True)
    # trap 3: a column that is written after the ticket is routed
    reply = {"payment_failed": "We have raised a reversal request with your bank.",
             "refund": "We have checked with the merchant about your refund.",
             "kyc": "Please re-upload your documents for verification.",
             "card": "Your card request has been processed.",
             "login_otp": "Please update the app and request a new OTP."}
    df["first_agent_reply"] = df["label"].map(reply)
    # trap 4: inconsistent label spelling from two CRM versions
    odd = rng.random(len(df)) < 0.05
    df.loc[odd, "label"] = df.loc[odd, "label"].str.upper().str.replace("_", " ")
    # trap 5: empty and Devanagari tickets
    junk = pd.DataFrame({"text": ["hi", "?", "hello", "", "test"] * 8, "label": rng.choice(["refund", "card"], 40)})
    dev = pd.DataFrame({"text": ["पैसा कट गया लेकिन पेमेंट फेल", "रिफंड अभी तक नहीं आया", "केवाईसी पेंडिंग है", "ओटीपी नहीं आ रहा"] * 15,
                        "label": ["payment_failed", "refund", "kyc", "login_otp"] * 15})
    extra = pd.concat([junk, dev], ignore_index=True)
    extra["created_at"] = pd.Timestamp("2026-06-01") + pd.to_timedelta(rng.integers(0, 120 * 86400, len(extra)), unit="s")
    extra["customer_id"] = [f"C{x:06d}" for x in rng.integers(1, 6000, len(extra))]
    extra["first_agent_reply"] = ""
    df = pd.concat([df, extra], ignore_index=True).drop(columns="tpl")
    df = df.sample(frac=1, random_state=3).reset_index(drop=True)
    df["ticket_id"] = np.arange(500001, 500001 + len(df))
    df[["ticket_id", "created_at", "customer_id", "text", "first_agent_reply", "label"]].to_csv("tickets.csv", index=False)

The file has 8,700 rows from June to September 2026. The comments name the traps so you can check your work; a
real export would not. About 4% of the labels are wrong, as in the rest of this topic — do not try to "fix" them by
looking at the test set.

| Column | Meaning |
|---|---|
| ticket_id, created_at, customer_id | Identifiers and the time the ticket was raised |
| text | What the customer wrote — English, Hinglish, sometimes Devanagari; may contain phone numbers and UPI IDs |
| first_agent_reply | The agent's first reply, written **after** the ticket was routed |
| label | The queue the ticket ended in (five intents) |

## Tasks

1. **Clean, and log every decision with a count.** Normalise label spellings; decide what to do with empty and
   one-word tickets; mask phone numbers and UPI IDs (\`<phone>\`, \`<upi_id>\`) in the text before anything else; find
   resent complaints (same customer, near-identical text, within 72 hours) and keep one per complaint — and make
   sure no complaint has copies on both sides of the split. Keep the Devanagari tickets and say how each approach
   handles them.
2. **Split by time.** Train and validate on June–August; the **test set is every ticket from 1 September**, used once
   at the end. Explain in two sentences why a random split would mislead here, and show the evidence (the random-split
   score of your baseline next to its September score).
3. **Approach A — TF-IDF baseline.** Word and/or character n-grams with logistic regression or a linear SVM, tuned on a
   validation slice of August. Do not use \`first_agent_reply\` — say why, with the score it would give.
4. **Approach B — fine-tuned small transformer.** Fine-tune a small encoder (for example all-MiniLM-L6-v2 or
   DistilBERT) for 2–4 epochs with \`torch.manual_seed\` fixed; report training time and hardware. Optionally add
   frozen embeddings with logistic regression as a fourth row.
5. **Approach C — prompted LLM.** Write a label guide and a zero- or few-shot prompt with a fixed label set and JSON
   output; key from an environment variable, temperature 0, PII masked. Few-shot examples come from training months
   only. Run it on a **random sample of at least 300 September tickets** (stratified if you like, weights recorded);
   count invalid replies as errors; store raw outputs with the prompt version and model name. If you have no API
   access, run the same evaluation with an open model you can run locally and say so.
6. **Compare on the same tickets.** For the LLM's sample, score all three approaches on exactly those tickets:
   accuracy with a Wilson interval, macro F1, per-class recall, and McNemar's test for the LLM against your best
   trained model. Also report A and B on the full September set.
7. **Cost and latency.** Cost per thousand tickets: for C, measured tokens × price per token (state the price and
   the date you read it); for A and B, the server time per thousand tickets on your hardware. Latency: median and
   95th percentile per ticket.
8. **Recommend one** approach for 20,000 tickets a day, in half a page: accuracy, cost, latency, privacy, and what
   it would take to maintain. Say what would change your recommendation.

## Deliverables

1. **\`tickets.ipynb\`** — runs top to bottom after "Restart & Run All" (the LLM section may load saved raw outputs,
   with the code that produced them included).
2. **\`recommendation.pdf\`** (or .md), **at most three pages** — the comparison table, the recommendation, and the
   limits of the evaluation.
3. **\`README.md\`** — how to run it, library versions, the model names used, and the environment variables needed.

## Acceptance criteria

- The cleaning log gives counts for label spellings fixed, junk tickets handled, PII masked and resent complaints
  removed; no complaint appears in both train and test.
- No feature uses \`first_agent_reply\`, and the report states why it leaks.
- The test set is September only, untouched until the final scoring; the random-split score is shown beside it.
- All three approaches are scored on the same September tickets, with Wilson intervals and a McNemar test.
- The LLM evaluation counts invalid replies as errors, uses no test tickets as few-shot examples, and sends no
  unmasked phone numbers or UPI IDs.
- Cost per thousand tickets and median/95th-percentile latency are reported for every approach, with prices as a
  formula and a dated source.
- The recommendation names one approach, gives reasons in numbers, and states what would change it.`,
    mcqs: [
      mcq('In the project data, what is wrong with using first_agent_reply as a feature?', [
        ['It is written after routing and restates the queue, so it leaks the label', true],
        ['It is too short to carry any information about the ticket\'s queue', false],
        ['It is in English while the tickets are often in Hinglish or Devanagari', false],
        ['It would make the TF-IDF vocabulary too large to fit in memory', false],
      ], 'The reply is chosen by the agent who already knows the queue, so it predicts the label almost perfectly in a notebook and does not exist at routing time.'),
      mcq('A customer resent the same complaint twice, and one copy lands in training and the other in the test set. What does that do?', [
        ['It inflates the test score, as the model has effectively seen that ticket', true],
        ['It lowers the test score, because duplicates confuse the trained model', false],
        ['Nothing, since the two copies were created at slightly different times', false],
        ['It only matters for the LLM, because the trained models ignore duplicates', false],
      ], 'Near-identical copies on both sides of a split let the model be tested on what it memorised. Keep one copy per complaint, or keep all copies on one side.'),
    ],
    assignment: {
      title: 'Classifying Support Tickets Three Ways',
      description: 'Clean a fintech app\'s support tickets, classify them with a TF-IDF model, a fine-tuned small transformer and a prompted LLM, compare accuracy, cost per thousand tickets and latency on the same held-out September tickets, and recommend one approach with reasons.',
      instructions: `Complete the project described in this unit's brief and submit a repository link or a zip.

**Submit:**

1. \`tickets.ipynb\` — generates the data with the brief's script, then: a cleaning log with counts (labels, junk,
   PII, resent complaints); a time split with September as the test set and the random-split comparison; the TF-IDF
   baseline; the fine-tuned transformer with seed, epochs, training time and hardware; the prompted LLM on at least
   300 September tickets with masked input, invalid replies counted as errors and raw outputs saved; the comparison
   on the same tickets with Wilson intervals, per-class recall and McNemar's test; cost per thousand tickets and
   median/95th-percentile latency for every approach. It must run top to bottom after "Restart & Run All".
2. \`recommendation.pdf\` or \`.md\`, at most three pages — the comparison table, one recommended approach for 20,000
   tickets a day with reasons, and the limits of the evaluation.
3. \`README.md\` — how to run it, library versions, model names, and the environment variables the LLM code reads.

**Before you submit,** go through the acceptance criteria in the brief and note each result at the end of the
notebook (for example: "Resent complaints removed: …; September accuracy A / B / C: …; McNemar p: …").`,
      rubric: [
        { criterion: 'Data preparation and honest evaluation', description: 'Labels normalised, junk handled, PII masked before any use, resent complaints de-duplicated with none split across train and test; first_agent_reply excluded with the leak explained; September held out and used once, with the random-split score shown beside it.', maxPoints: 30 },
        { criterion: 'Three approaches built correctly', description: 'A tuned TF-IDF baseline in a pipeline; a seeded fine-tuned encoder with training details; a prompted LLM with a label guide, fixed label set, JSON output, key from the environment, few-shot examples from training months only, invalid replies counted and raw outputs stored.', maxPoints: 30 },
        { criterion: 'Comparison, cost and latency', description: 'All approaches scored on the same tickets with accuracy, Wilson intervals, macro F1, per-class recall and a McNemar test; cost per thousand tickets as tokens × price with a dated source and server time for the trained models; median and 95th-percentile latency.', maxPoints: 25 },
        { criterion: 'Recommendation and communication', description: 'One approach recommended for 20,000 tickets a day with reasons in numbers (accuracy, cost, latency, privacy, maintenance) and the conditions that would change it; a report of at most three pages; a notebook that runs, with README and versions.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_NLP_GENAI_CHECKPOINT',
    notes: `Ten questions across the topic: text preparation and the TF-IDF baseline, embeddings and similarity,
transformers and tokenisers, choosing between a classic model, a fine-tuned transformer and an LLM, measuring an
LLM's labels, and evaluating retrieval. Several give numbers — work them out before you look at the options.`,
    checkpoint: [
      ck(TR, 'Ticket text contains "nahi", "nhi" and "nahin" for the same word. Which change to a TF-IDF baseline handles this best?', [
        ['Add character n-gram features with analyzer="char_wb"', true],
        ['Apply the English stop-word list before vectorising', false],
        ['Stem every word with an English stemming algorithm', false],
        ['Raise min_df so that the rarer spellings are removed', false],
      ], 'Character n-grams share pieces across spelling variants and typos. English stop words and stemmers do not recognise romanised Hindi, and a higher min_df just deletes the variants.'),
      ck(EM, 'Two normalised sentence embeddings have a dot product of 0.62. What is their cosine similarity?', [
        ['0.62', true],
        ['0.38', false],
        ['0.79', false],
        ['It depends on their lengths, which are not given', false],
      ], 'For vectors of length 1, cosine = a·b / (1 × 1), so it equals the dot product. Their lengths are known: both are 1.'),
      ck(EM, 'Sentence embeddings plus logistic regression beat TF-IDF on unseen phrasings (0.884 against 0.664). What does the embedding model contribute?', [
        ['Knowledge of paraphrase learned in pretraining on a large text collection', true],
        ['A larger vocabulary of exact words copied from the support tickets themselves', false],
        ['Label information, because embedding models are trained on support tickets', false],
        ['Better handling of rare codes such as UTR numbers and transaction IDs', false],
      ], 'Pretraining on many sentence pairs places paraphrases near each other, so new wording still lands near the right class. Rare codes are in fact a weakness of embeddings.'),
      ck(TR, 'One token\'s scaled attention scores are 1, 0.5 and 0. What weight does it give the first token, to two decimals?', [
        ['0.51', true],
        ['0.67', false],
        ['0.33', false],
        ['1.00', false],
      ], 'Softmax: e¹ / (e¹ + e⁰·⁵ + e⁰) = 2.718 / 5.367 ≈ 0.51. The weights over the three tokens sum to 1.'),
      ck(TR, 'Which model family is pretrained by predicting masked words while seeing the text in both directions?', [
        ['Encoders such as BERT and MiniLM', true],
        ['Decoders such as GPT-style LLMs', false],
        ['Word2vec and other word-vector models', false],
        ['Recurrent networks such as an LSTM', false],
      ], 'Encoders read the whole input bidirectionally and learn by filling in masked tokens, which suits classification, extraction and embeddings. Decoders predict the next token from earlier ones only.'),
      ck(TR, 'A ticket classifier will score 50 lakh tickets a month, has 30,000 labels, and the text contains account details. Which choice is usually best?', [
        ['A fine-tuned small encoder run on the company\'s own servers', true],
        ['A prompted external LLM called once for every single ticket', false],
        ['A transformer trained from scratch on the company\'s tickets', false],
        ['A zero-shot NLI model, because it needs no labels at all', false],
      ], 'With many labels, high volume and sensitive text, a fine-tuned encoder is accurate, cheap per ticket and keeps data in-house. Training from scratch wastes the labels\' value; zero-shot was weakest in this topic.'),
      ck(TR, 'A prompted labeller has an 800-token instruction, 40-token inputs and 10-token replies. How many input tokens do 5,000 items need?', [
        ['4,200,000', true],
        ['4,250,000', false],
        ['200,000', false],
        ['4,000,000', false],
      ], 'Each call sends the instruction and the item: (800 + 40) × 5,000 = 4,200,000 input tokens. The 10-token replies are output tokens.'),
      ck(TR, 'An LLM labeller and a human agree on 85% of reviews, and chance agreement is 0.70. What is Cohen\'s kappa?', [
        ['0.50', true],
        ['0.85', false],
        ['0.15', false],
        ['0.21', false],
      ], 'Kappa = (0.85 − 0.70) / (1 − 0.70) = 0.15 / 0.30 = 0.50 — moderate agreement beyond chance, despite 85% raw agreement.'),
      ck(EM, 'Embedding retrieval misses questions that quote exact error codes, while it handles paraphrased questions well. What should be added?', [
        ['Keyword search combined with the embeddings in a hybrid ranking', true],
        ['A larger chunk size so each chunk contains more of the codes', false],
        ['A higher temperature for the LLM that writes the final answer', false],
        ['Stop-word removal on the questions before they are embedded', false],
      ], 'Rare exact strings carry little meaning for an embedding model but match perfectly in keyword search. Hybrid retrieval keeps the paraphrase strength and adds exact matching.'),
      ck(EM, 'For five questions the first correct chunk is at ranks 1, 2, 2, 6 and 1. What is the MRR?', [
        ['About 0.633', true],
        ['About 0.800', false],
        ['About 0.567', false],
        ['About 0.733', false],
      ], 'MRR = (1 + 1/2 + 1/2 + 1/6 + 1) / 5 = 3.167 / 5 ≈ 0.633. Every retrieved question contributes 1 / rank, however low.'),
    ],
  },
];
