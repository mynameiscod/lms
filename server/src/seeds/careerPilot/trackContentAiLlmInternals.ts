/**
 * Career-track content: How LLMs Work, for Engineers (AI_LLM_INTERNALS), the AI tracks, batch AI1.
 * Tokenisation, the transformer, training stages, decoding, choosing a model and running one locally —
 * the "why does it behave like that" layer under Building with LLMs (JT_AI_CONCEPTS) and Generative AI
 * in Python (JT_AI_PY), which this topic refers back to and never re-teaches.
 * Every token count, probability and model output quoted in the notes was produced by running the
 * snippet shown (tiktoken, Hugging Face transformers, numpy). No prices and no model version names:
 * a model is "a 135M-parameter open instruct model", a price is "P per million tokens".
 * Skills: LLM_FUNDAMENTALS by default, DL_TRANSFORMERS for TRANSFORMER_INTUITION (trackSkillAttribution).
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_AI_LLM_INTERNALS_BUNDLES: PilotBundle[] = [
  /* ── TOKENIZATION ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_LLM_INTERNALS_TOKENIZATION',
    notes: `You met tokens in Year 1 and priced them in Building with LLMs. This unit opens the tokeniser
itself, because a surprising number of production bugs — wrong counts, garbled Telugu in a stream,
a cost estimate that is three times too low, an embedding model that "cannot see" a query — are
tokenisation bugs wearing a disguise.

## What a tokeniser actually does

Modern LLMs use **byte-level BPE** (byte-pair encoding) or a close cousin (SentencePiece, WordPiece):

1. Start from raw **UTF-8 bytes** — 256 symbols, so nothing is ever "unknown".
2. During tokeniser training, repeatedly **merge the most frequent adjacent pair** into a new symbol.
3. Stop at a fixed vocabulary — typically 30,000 to 200,000 entries.

The result: common English words are one token, rare words are several, and text the training
corpus had little of (Indian scripts, unusual identifiers) falls back towards bytes. Three details
matter in practice:

- **The leading space belongs to the token.** \`" strawberry"\` and \`"strawberry"\` are different tokens.
- **Case matters.** \`"Strawberry"\` and \`"strawberry"\` split differently.
- **Each model family has its own tokeniser.** A count from one is an estimate for another.

## Real counts, measured

Run this in your venv (tiktoken ships two OpenAI encodings; the newer one has a much larger vocabulary):

    import tiktoken
    samples = {
        "english":  "Your refund will be credited within 5 working days.",
        "hinglish": "Mera refund kab aayega? 5 din ho gaye.",
        "hindi":    "मेरा रिफ़ंड कब आएगा? पाँच दिन हो गए।",
        "telugu":   "నా రీఫండ్ ఎప్పుడు వస్తుంది? ఐదు రోజులు అయింది.",
    }
    for name in ["cl100k_base", "o200k_base"]:
        enc = tiktoken.get_encoding(name)
        print(name, {k: len(enc.encode(v)) for k, v in samples.items()})

It printed:

    cl100k_base {'english': 11, 'hinglish': 15, 'hindi': 41, 'telugu': 78}
    o200k_base {'english': 11, 'hinglish': 15, 'hindi': 15, 'telugu': 17}

The same refund question costs **7 times** as many tokens in Telugu as in English on the older
tokeniser, and about 1.5 times on the newer one. Hinglish is cheap in characters but not in tokens:
"aayega" became \`a\` + \`ay\` + \`ega\`. Tokens are your **bill**, your **latency** and your **context
budget**, so a product for Indian users must be measured on Indian text, not on an English rule of
thumb.

An older English-only encoder is worse. The WordPiece tokeniser behind a popular small English
sentence-embedding model turned the Telugu sentence into:

    ['[UNK]', '[UNK]', '[UNK]', '[UNK]', '?', '[UNK]', '[UNK]', '[UNK]', '.']

Every Telugu word became the same "unknown" token, so every Telugu query gets nearly the same vector.
A multilingual SentencePiece model split the same sentence into 11 meaningful pieces. Check the
tokeniser of your embedding model before you promise Telugu search.

## Why counting and spelling go wrong

The model never sees letters, it sees token ids:

    "strawberry"  -> ['str', 'aw', 'berry']
    "1234567"     -> ['123', '456', '7']
    "9.11 vs 9.9" -> ['9', '.', '11', ' vs', ' ', '9', '.', '9']
    UPI ref 412345678901 -> ['UPI', ' ref', ' ', '412', '345', '678', '901']

Counting letters, reversing strings, comparing decimals and copying a 12-digit UPI reference exactly
are all harder than they look, because the units the model reasons over are not characters or
digits. The engineering answer is not a cleverer prompt: **do it in code**. Validate a copied
reference with a regex, compare amounts with \`Decimal\`, count with \`len()\` — or give the model a
tool that does.

## Counting before you send

    import tiktoken
    ENC = tiktoken.get_encoding("o200k_base")

    def count_tokens(text: str) -> int:
        return len(ENC.encode(text))

    def truncate_tokens(text: str, max_tokens: int) -> str:
        return ENC.decode(ENC.encode(text)[:max_tokens])

Truncate by **tokens**, never by characters: 4,000 characters of Telugu is far more than 1,000
tokens. A chat request also adds a few tokens per message for the role markers, so leave headroom
and treat the \`usage\` block in the response as the truth for billing. For a model whose tokeniser
is not in tiktoken, load it with \`AutoTokenizer.from_pretrained(model_id)\` and count the same way.

## Special tokens and the stream

Tokenisers reserve **special tokens** such as \`<|endoftext|>\` or a chat model's turn markers.
tiktoken refuses them in ordinary text by default:

    ValueError: Encountered text corresponding to disallowed special token '<|endoftext|>'.

That refusal is a safety feature: if user text could become a real turn marker, a user could forge
a "system" turn. Never pass \`allowed_special="all"\` on untrusted input.

One more trap: a token is a run of **bytes**, not always a whole character. Decoding a stream token
by token can split a Telugu letter in half and print \`�\`. Decode the accumulated ids, or feed bytes to
an incremental UTF-8 decoder (see the debugging unit).

## Rules of thumb

- English prose: about 4 characters per token. Code, JSON, numbers, dates and Indian scripts: more
  tokens per word — measure on 100 real messages.
- Count with the target model's own tokeniser; budget input plus output against the context window.
- Anything that needs exact characters or digits is a job for code, not for the model.`,
    workedExample: `**Problem:** a fintech support bot answers in English, Hindi and Hinglish. The team estimated
cost and context with "4 characters per token" and a 6,000-token budget for retrieved policy text.
Hindi users get "context length exceeded" errors and the bill is higher than planned.

**Step 1 — measure, per language, on real messages.** Pull 200 anonymised messages per language and
count with the target model's tokeniser:

    from statistics import mean
    import tiktoken
    enc = tiktoken.get_encoding("o200k_base")

    def ratio(msgs):            # characters per token
        return mean(len(m) / len(enc.encode(m)) for m in msgs)

On the two refund sentences from the notes, English is 51 characters / 11 tokens = 4.6, Hinglish 38/15
= 2.5, Hindi 36/15 = 2.4. On the older tokeniser Hindi was 36/41 = 0.9 — less than one character per
token. A "4 characters per token" rule under-counts Hindi by about 1.7 times on the new tokeniser and
4.5 times on the old.

**Step 2 — budget in tokens, not characters.** The policy chunks are stored with their token count
at ingestion (\`count_tokens(chunk)\`), and the retriever adds chunks until the running total would
cross the budget:

    def fit(chunks, budget):
        out, used = [], 0
        for c in chunks:                    # best first
            if used + c.tokens > budget:
                break
            out.append(c); used += c.tokens
        return out

**Step 3 — keep headroom for output and markers.** Budget = context window − system prompt tokens −
history tokens − max_tokens for the answer − about 50 for message markers.

**Step 4 — re-estimate cost per language.** cost = input_tokens × P_in / 1,000,000 + output_tokens ×
P_out / 1,000,000, with tokens measured per language and weighted by the traffic share. If 40% of
traffic is Hindi, the old estimate was badly wrong.

**Result:** no more overflow errors (the budget is real tokens), and a cost estimate that matches
the provider's \`usage\` totals within a few per cent.`,
    mcqs: [
      mcq('A support bot is asked "How many r\'s are in strawberry?" and answers 2. The team wants a reliable fix. What should they do?', [
        ['Count the letters in code, or give the model a tool that counts them', true],
        ['Raise the temperature so that the model reconsiders its first answer', false],
        ['Add "think very carefully about each letter" to the system prompt', false],
        ['Switch to a model with a longer context window so it sees every letter', false],
      ], 'The model sees tokens such as "str", "aw", "berry", not letters, so character-level questions are unreliable however the prompt is worded. Exact counting belongs in code. A longer context window does not change what a token is.'),
      mcq('A team truncates retrieved text to 4,000 characters to stay inside a 1,000-token budget. English works; Telugu requests overflow. Why?', [
        ['Telugu needs far more tokens per character, so truncate by tokens instead', true],
        ['Telugu text is stored as UTF-16, which doubles the length of every string', false],
        ['The model refuses Telugu, so the provider returns an overflow error code', false],
        ['Character truncation cuts Telugu words in half and those halves are free', false],
      ], 'Measured on the same sentence, Telugu needed 17 tokens on a newer tokeniser and 78 on an older one against 11 for English. The 4-characters-per-token rule only holds for English prose, so truncation must count tokens.'),
      mcq('A Telugu query to a RAG search returns the same irrelevant passages whatever is asked. The embedding model\'s tokeniser turns each Telugu word into [UNK]. What follows?', [
        ['Every Telugu query becomes nearly the same vector; use a multilingual model', true],
        ['The vectors are correct but the index must be rebuilt after each Telugu query', false],
        ['The [UNK] tokens are dropped, so the query is matched on its punctuation only', false],
      ], 'If every word maps to one unknown token, the queries are indistinguishable to the model, so search returns the same neighbours. A multilingual tokeniser split the same sentence into 11 meaningful pieces.'),
    ],
    checkpoint: [
      mcq('A model is asked to copy the UPI reference 412345678901 from a message into JSON, and about one call in two hundred changes a digit. What is the robust fix?', [
        ['Extract the reference with a regex in code and validate the model\'s output against it', true],
        ['Ask the model to repeat the reference twice and keep whichever copy appears first', false],
        ['Use a bigger model, because larger models never alter digits when copying them', false],
        ['Put the reference in capital letters so it is tokenised as a single unit', false],
      ], 'Long digit runs are split into chunks such as "412", "345", "678", "901", and copying them is a generation task that can slip. Exact identifiers should be extracted and checked in code; a bigger model reduces but does not remove the error.'),
      mcq('The same 30-word refund question costs noticeably more tokens in Hindi than in English on one model\'s tokeniser. What is the main reason?', [
        ['Its vocabulary has fewer merged pieces for Devanagari, so text falls back towards bytes', true],
        ['Hindi sentences contain more words than English ones for the same meaning', false],
        ['Providers add a surcharge token to each non-English message they receive', false],
      ], 'BPE merges are learnt from the training corpus. Scripts that were rare there get few merges and split into many small pieces, down to single bytes; a tokeniser with a larger, more multilingual vocabulary narrows the gap.'),
      mcq('A form lets users type any text, which is passed to tiktoken with allowed_special="all" before counting. Why is that risky?', [
        ['A user could type a real turn-marker token and forge a system turn', true],
        ['It makes token counting several times slower on long user messages', false],
        ['Special tokens are billed at a higher rate than ordinary text tokens', false],
        ['It turns every emoji in the message into the end-of-text token', false],
      ], 'Special tokens control the conversation structure. By default tiktoken refuses them in plain text; allowing them on untrusted input lets a user inject markers that the model treats as real structure.'),
    ],
  },

  /* ── TRANSFORMER_INTUITION ────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_LLM_INTERNALS_TRANSFORMER_INTUITION',
    notes: `You do not need to derive back-propagation to build with LLMs, but you do need a working
picture of what happens between "send prompt" and "first token". It explains why long prompts are
slow and expensive, why facts in the middle of a long context get missed, and why the order of a
prompt matters.

## From token ids to the next token

A **decoder-only transformer** (every mainstream chat model) does this for each prompt:

1. **Embedding lookup.** Each token id selects a row of a learnt table: a vector of a few hundred to
   several thousand numbers. You met embeddings in Building with LLMs; these are the model's own
   internal ones.
2. **Position.** The model must know order ("dog bites man" is not "man bites dog"). Most current
   models rotate the vectors by an amount that depends on position (RoPE). The window a model was
   **trained** on is the window it handles well.
3. **A stack of layers** (tens of them). Each layer has two parts:
   - **attention** — every token looks back at earlier tokens and pulls in what is relevant;
   - **a feed-forward network (MLP)** — transforms each token's vector on its own; much of the
     model's stored knowledge lives in these weights.
   Each part *adds* its result to a running vector per token (the **residual stream**).
4. **Output head.** The last token's final vector is multiplied by the vocabulary matrix to give one
   score (**logit**) per vocabulary entry; softmax turns the scores into probabilities. Decoding (next
   unit) picks one token, appends it, and the loop repeats.

A real small model, read from its config: 30 layers, vectors of 576 numbers, 9 attention heads, a
vocabulary of 49,152 tokens and a trained window of 8,192 tokens.

## Attention, in one formula

For every token the model computes three vectors: a **query** ("what am I looking for?"), a **key**
("what do I contain?") and a **value** ("what do I pass on?").

    scores  = Q · Kᵀ / √d          # how well each query matches each key
    scores += causal mask          # -∞ for every future position
    weights = softmax(scores)      # each row sums to 1
    output  = weights · V          # a weighted mix of earlier tokens' values

The **causal mask** is why the model is "decoder-only": token 5 can attend to tokens 1–5, never 6.
**Multi-head** attention runs this several times in parallel with different learnt projections, so
one head can track syntax while another tracks "which name does 'she' refer to".

## Prefill, decode and the KV cache

Generation has two phases:

- **Prefill** — the whole prompt is processed in parallel. Its cost grows with prompt length, which
  is your **time to first token**.
- **Decode** — one token at a time. Each new token needs the keys and values of every earlier token,
  so they are stored in the **KV cache** instead of being recomputed.

The cache is not small. Per token it holds 2 (K and V) × layers × KV heads × head size × bytes per
number. For a mid-size model with 32 layers, 8 KV heads, head size 128, at 16-bit precision:

    2 × 32 × 8 × 128 × 2 bytes = 131,072 bytes per token
    8,000-token context        ≈ 0.98 GiB, per concurrent request

That is why long contexts cost more, why providers price cached prompt prefixes differently, and
why a local model that loads fine runs out of memory when you raise its context length.

## What this explains about prompts

- **Cost grows with context.** Attention compares every token with every earlier one, so work grows
  roughly with the square of the length during prefill. A 100,000-token prompt is not "free because
  the window allows it".
- **Lost in the middle.** Measured across many models, facts at the **start** and **end** of a long
  context are used more reliably than facts buried in the middle. Put instructions first, the
  question last, and the few passages that matter close to the question — and send fewer passages.
- **Order is meaning.** Because each token only sees what came before it, the model reads your
  instructions before or after the data depending on where you put them. "Summarise the following"
  before the document primes what to look for; a question only at the very top of a 20-page paste may
  be diluted by the time the answer starts.
- **Stable prefix first.** Prefix caching (yours or the provider's) reuses KV entries only for an
  identical prefix, so the system prompt and examples go first and the per-request text last.
- **The window is a training property.** Feeding beyond the trained window, or stretching it
  without the model having been trained for it, degrades output long before an error appears.

## What attention does not do

Attention is not a lookup with guaranteed recall. A model can attend to the right passage and still
paraphrase it wrongly, and it can attend strongly to an irrelevant one that "looks" similar. The
engineering response is the one you already know: retrieve fewer, better passages, ask for
citations, and check them.`,
    workedExample: `**Problem:** see attention work on four tokens, and check the causal mask really hides the future.

    import numpy as np
    np.set_printoptions(precision=3, suppress=True)
    rng = np.random.default_rng(0)
    T, d = 4, 8                         # 4 tokens, 8-number vectors
    x = rng.normal(size=(T, d))         # token embeddings (position already added)
    Wq, Wk, Wv = (rng.normal(size=(d, d)) / np.sqrt(d) for _ in range(3))
    Q, K, V = x @ Wq, x @ Wk, x @ Wv

    scores = Q @ K.T / np.sqrt(d)                       # (T, T)
    mask = np.triu(np.ones((T, T), dtype=bool), k=1)    # True above the diagonal
    scores[mask] = -np.inf                              # the future is invisible
    w = np.exp(scores - scores.max(axis=1, keepdims=True))
    w = w / w.sum(axis=1, keepdims=True)
    print(w)
    print((w @ V).shape)

It printed:

    [[1.    0.    0.    0.   ]
     [0.995 0.005 0.    0.   ]
     [0.309 0.34  0.351 0.   ]
     [0.216 0.278 0.211 0.295]]
    (4, 8)

**Reading it:**

- Row 1 is token 1: it can only see itself, so its weight is 1.
- Every entry above the diagonal is 0 — the mask works; no token sees a later one.
- Each row sums to 1: a token's output is a weighted average of earlier tokens' values.
- Row 2 put 0.995 on token 1: with random weights the pattern means nothing, but in a trained model
  rows like this are how "it" finds the noun it refers to.
- The output keeps the shape (4, 8): attention mixes information *between* tokens without changing
  the vector size, so layers can be stacked.

**Now the cost.** The score matrix is T × T. At 4 tokens it has 16 entries; at 8,000 tokens it has
64 million per head per layer. That quadratic growth, plus the KV cache (about 128 KiB per token for
the mid-size model in the notes), is the real reason a long prompt raises latency and memory, and
the reason "just paste the whole policy manual" is an engineering decision, not a free one.`,
    mcqs: [
      mcq('A chat feature\'s time to first token rises from 0.4 s to 3 s after the team starts pasting a 40-page policy into every prompt, while tokens per second after that stay the same. Which phase grew?', [
        ['Prefill, which processes the whole prompt before the first token appears', true],
        ['Decode, which generates the reply one token at a time after the prompt', false],
        ['Softmax, which must normalise over the whole vocabulary for each token', false],
        ['Tokenisation, which is slow because it runs on the provider\'s CPUs', false],
      ], 'Prefill handles every prompt token before the first output token, so its time grows with prompt length. Decode speed per token stays roughly flat, which matches the symptom. Softmax over the vocabulary is the same size regardless of prompt length.'),
      mcq('A RAG prompt places 25 passages between the instructions and the question; the passage that answers sits at position 13 and is often ignored. What change best follows from how long contexts behave?', [
        ['Send fewer passages and put the best ones nearest the question', true],
        ['Move the question to the very top, above the instructions block', false],
        ['Duplicate every passage so that each one appears twice in context', false],
        ['Raise the temperature so the model explores the middle passages', false],
      ], 'Models use the start and end of a long context more reliably than the middle. Fewer, better-ranked passages near the question reduce both cost and the chance of missing the answer; duplication doubles cost and temperature changes sampling, not attention.'),
      mcq('A model has 32 layers, 8 KV heads and head size 128, and stores its cache in 16-bit numbers. Roughly how much KV cache does one 8,000-token conversation need?', [
        ['About 1 GiB, at 128 KiB per token', true],
        ['About 8 MiB, at 1 KiB per token', false],
        ['About 16 GiB, at 2 MiB per token', false],
        ['About 128 MiB, at 16 KiB per token', false],
      ], 'Per token: 2 (K and V) × 32 × 8 × 128 × 2 bytes = 131,072 bytes = 128 KiB. Times 8,000 tokens is about 0.98 GiB per concurrent conversation, which is why context length drives memory.'),
    ],
    checkpoint: [
      mcq('In a decoder-only transformer, why can the representation of token 5 not depend on token 9 of the same prompt?', [
        ['The causal mask sets attention scores to future positions to minus infinity', true],
        ['Positional encoding gives later tokens vectors that are too small to matter', false],
        ['The feed-forward layers process the tokens strictly from right to left', false],
        ['The KV cache is emptied after each token, so later tokens are never stored', false],
      ], 'The mask adds -inf to every score above the diagonal, so after softmax those weights are exactly 0. That is what lets the model be trained to predict the next token and generate left to right.'),
      mcq('A team caches identical prompt prefixes to cut latency. Their prompt is: user question, then retrieved passages, then a 2,000-token fixed system instruction block. Why do they see almost no cache hits?', [
        ['The varying text comes first, so no two requests share a prefix', true],
        ['Prefix caches only work when the temperature is set exactly to 0', false],
        ['A cache can only store prompts that are shorter than 1,000 tokens', false],
      ], 'Prefix caching reuses stored keys and values only for an identical beginning of the prompt. Putting the fixed system block and examples first and the per-request question and passages last makes the prefix repeat.'),
      mcq('Inside each transformer layer, what is the attention step\'s job compared with the feed-forward step?', [
        ['Attention mixes information between tokens; the feed-forward step works per token', true],
        ['Attention stores the facts; the feed-forward step chooses which token to output next', false],
        ['Attention converts token ids to vectors; the feed-forward step adds their positions', false],
        ['Attention runs only during training; the feed-forward step runs only during inference', false],
      ], 'Attention lets each token pull in information from earlier tokens. The MLP then transforms each token\'s vector independently, and much stored knowledge lives in its weights. The embedding lookup, not attention, turns ids into vectors.'),
    ],
  },

  /* ── TRAINING_STAGES ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_LLM_INTERNALS_TRAINING_STAGES',
    notes: `When a model refuses a harmless request, flatters a wrong answer, does not know about last month's
RBI circular, or ignores your output format, the question an engineer asks is **which training stage
produced this behaviour** — because that tells you what can fix it. Prompting, retrieval and
fine-tuning each reach different stages.

## Stage 1 — pre-training: knowledge and fluency

The model is trained to **predict the next token** on a very large corpus: web pages, books, code,
papers. Nothing else. From that one objective it learns grammar, facts, coding patterns and a great
deal of reasoning-shaped text. It also learns the corpus's gaps and biases.

Consequences you will meet:

- **Knowledge cut-off.** The corpus was collected up to some date; the model knows nothing after it,
  and it does not know *today's* date either. Put the date and fresh facts in the prompt.
- **Thin coverage = weak answers.** Little Telugu legal text in the corpus means weak Telugu legal
  answers, whatever the prompt says.
- **A base model continues text; it does not answer.** It is a document completer.
- **Fluency is not truth.** The objective rewards *plausible* continuations, which is the root of
  hallucination.

Pre-training is the expensive stage — thousands of accelerators for weeks or months. You will not
redo it; you choose a model whose pre-training suits you.

## Stage 2 — instruction tuning (supervised fine-tuning)

The base model is trained further on curated **(instruction, good response)** conversations, written
by people or generated and filtered. It learns:

- to **answer** a question rather than continue it;
- the **chat template** — the special tokens that mark system, user and assistant turns;
- formats: lists, JSON, code blocks, "only the answer".

This stage adds little new knowledge. It mostly teaches the model how to *use* what pre-training
gave it in a conversation.

## Stage 3 — preference tuning: helpful, harmless, and sometimes annoying

People (or a model following written principles) compare two answers to the same prompt and pick
the better one. The model is then pushed towards preferred answers — by training a **reward model**
and optimising against it with reinforcement learning (RLHF), or directly from the preference pairs
(DPO and its relatives). Newer models also get **reinforcement learning on checkable tasks** — maths
with a known answer, code that must pass tests — which is where long step-by-step "reasoning"
behaviour comes from.

This stage produces:

- **refusals** and safety behaviour — and **over-refusal** of harmless requests that look risky;
- the **assistant persona** and tone;
- **sycophancy** — agreeing with a user who pushes back, because raters liked agreeable answers;
- confident phrasing, which raters also tended to reward.

## Matching behaviour to stage — and to the fix

| Behaviour | Comes from | What actually helps |
|---|---|---|
| Does not know a policy changed last month | pre-training cut-off | retrieval (RAG) or facts in the prompt |
| Invents a plausible circular number | pre-training objective | grounding, citations, "say you don't know", checks in code |
| Ignores the JSON format | instruction tuning was weak on it | schema-constrained output, examples, a better model |
| Refuses to explain how UPI fraud works to a bank's fraud team | preference tuning | clearer system context about the user and purpose; another model |
| Changes a correct answer when the user says "are you sure?" | preference tuning | do not ask it to re-judge itself; verify in code or with a separate check |

## Where fine-tuning fits

Your own fine-tuning (full, or a cheap adapter such as LoRA) is **stage 2 again, on your data**. It
is good at **behaviour**: a fixed output format, a house tone, a narrow classification task, a
smaller model imitating a larger one. It is poor at **adding facts** — a model fine-tuned on your HR
handbook will still mix up the numbers and cannot cite its source, and every policy change means
retraining. Facts that change go in retrieval; behaviour that is stable can go in fine-tuning. Try
prompting and RAG first; fine-tune when an evaluation set shows a gap they cannot close.

## The system prompt is not a stage

A system prompt does not retrain anything. It works because instruction and preference tuning
taught the model to weight system-turn text heavily. That is also why it is not a security boundary:
it is a strong habit, not a rule enforced by code.`,
    workedExample: `**Problem:** show the difference between a base model and its instruction-tuned sibling, and the
bug that appears when you forget the chat template.

We ran a 135M-parameter open model pair (base and instruct) from the Hugging Face Hub on a laptop CPU:

    from transformers import AutoTokenizer, AutoModelForCausalLM
    for model_id in [BASE_ID, INSTRUCT_ID]:          # the two Hub ids of one model family
        tok = AutoTokenizer.from_pretrained(model_id)
        model = AutoModelForCausalLM.from_pretrained(model_id)
        inputs = tok("What is the capital of India?", return_tensors="pt")
        out = model.generate(**inputs, max_new_tokens=30, do_sample=False)
        print(repr(tok.decode(out[0, inputs["input_ids"].shape[1]:], skip_special_tokens=True)))

It printed:

    '\\n\\nThe capital of India is New Delhi.\\n\\nWhat is the capital of India?\\n\\nNew Delhi\\n\\nWhat is the capital of'
    ''

**The base model** answered — and then kept going, writing the next quiz question, because its corpus
contained quiz pages where a question is followed by more questions. It is completing a document.

**The instruct model returned an empty string.** Printed without \`skip_special_tokens\`, the reply was
\`'<|im_end|>'\`: its first token was "end of turn". Raw text with no chat template does not look like
the conversations it was tuned on, so it had nothing to say. With the template:

    messages = [{"role": "system", "content": "You are a concise assistant."},
                {"role": "user", "content": "What is the capital of India?"}]
    text = tok.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    print(repr(text))

    '<|im_start|>system\\nYou are a concise assistant.<|im_end|>\\n<|im_start|>user\\nWhat is the capital of India?<|im_end|>\\n<|im_start|>assistant\\n'

the same model replied \`'The capital of India is New Delhi.'\` and stopped.

**Lessons:** knowledge came from pre-training (both models know the answer); answering and
stopping came from instruction tuning; and the chat template is part of the model's interface. A
hosted chat API applies it for you; with open weights, \`apply_chat_template\` is your job.`,
    mcqs: [
      mcq('A model asked about a GST rule notified last month confidently describes the old rule. Which stage explains this, and what is the practical fix?', [
        ['Pre-training cut-off; retrieve the current notification into the prompt', true],
        ['Preference tuning; ask the model to be less confident when it answers', false],
        ['Instruction tuning; fine-tune the model on old and new GST rules together', false],
        ['Decoding; set temperature to 0 so the model returns the latest rule', false],
      ], 'The model learnt facts up to its corpus date and has no access to later changes. Fresh facts go into the prompt through retrieval. Fine-tuning is a poor and slow way to add changing facts, and decoding settings cannot add knowledge.'),
      mcq('A bank\'s fraud-analysis assistant refuses to explain how a common UPI collect-request scam works, although the analysts need it. Which training stage most likely produced the refusal?', [
        ['Preference tuning, which rewards refusing requests that resemble harm', true],
        ['Pre-training, because scam material was removed from the training corpus', false],
        ['Tokenisation, because the word UPI is split into two separate tokens', false],
      ], 'Refusals and over-refusals are shaped by preference tuning. Clear system context about who the users are and why they need it often helps; the knowledge is usually present from pre-training.'),
      mcq('An HR team wants a model that always answers in their fixed JSON shape and also knows their leave policy, which changes every quarter. Which split is sound?', [
        ['Fine-tune or prompt for the JSON shape; retrieve the policy at run time', true],
        ['Fine-tune on the policy each quarter; prompt for the JSON shape each call', false],
        ['Fine-tune for both, retraining every quarter when the policy is revised', false],
        ['Retrieve both the policy and the JSON shape from the vector index per call', false],
      ], 'Stable behaviour such as a format suits fine-tuning or prompting. Facts that change suit retrieval, which can be updated instantly and cited; fine-tuning on facts is slow, uncitable and mixes up numbers.'),
    ],
    checkpoint: [
      mcq('A user tells an assistant "that\'s wrong" about a correct EMI calculation, and the assistant apologises and produces a wrong figure. Which stage is this behaviour usually traced to?', [
        ['Preference tuning, where raters favoured agreeable answers', true],
        ['Pre-training, where the corpus had few EMI calculations', false],
        ['The chat template, which marks the user\'s turn as more trusted', false],
        ['The KV cache, which keeps only the most recent user message', false],
      ], 'Sycophancy comes from preference tuning: people tended to prefer answers that agree with them. The fix is to compute the EMI in code and not let the model re-judge a verified result.'),
      mcq('A team loads open instruct weights with transformers, passes the raw question as plain text, and gets empty or rambling replies. What did they skip?', [
        ['Formatting the messages with the tokeniser\'s chat template', true],
        ['Calling model.eval() before generating any of the tokens', false],
        ['Downloading the separate base model that the instruct one needs', false],
      ], 'Instruct models are tuned on conversations wrapped in special turn tokens. Without apply_chat_template the input does not look like a turn to answer; in our run the instruct model emitted end-of-turn at once.'),
      mcq('Why is a system prompt a strong influence on a chat model but not a security boundary?', [
        ['Tuning taught the model to weight it, but nothing in code enforces it', true],
        ['The provider deletes the system prompt after the first user message', false],
        ['System prompts are only applied when the temperature is set to 0', false],
        ['The system prompt is tokenised separately and never reaches attention', false],
      ], 'Instruction and preference tuning created the habit of following system text. It is a learnt tendency, so a crafted user message or document can override it; real limits must live in your code and permissions.'),
    ],
  },

  /* ── DECODING ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_LLM_INTERNALS_DECODING',
    notes: `The model's forward pass ends with a probability for every token in the vocabulary. **Decoding**
is the rule that turns those probabilities into one chosen token — and it is the part of "why do
answers vary" that you control with request parameters.

## Greedy and sampling

- **Greedy** — always take the most probable token. Repeatable for a given model and input, good
  for extraction, but prone to bland or looping text on long generations.
- **Sampling** — draw a token at random in proportion to its probability. Varied and natural, but
  any token with non-zero probability can appear, including a wrong number.

## Temperature, measured

Temperature T divides the logits before softmax: probabilities = softmax(logits / T). Small T
sharpens the distribution, large T flattens it. Five candidate next tokens after "Your refund will be
credited within", with made-up logits 4, 3, 2, 1, 0:

    import numpy as np
    tokens = [" 5", " 7", " 3", " 24", " two"]
    logits = np.array([4.0, 3.0, 2.0, 1.0, 0.0])

    def softmax(z, T=1.0):
        z = z / T
        z = z - z.max()                  # numerical stability
        e = np.exp(z)
        return e / e.sum()

    for T in (0.2, 0.7, 1.0, 1.5):
        p = softmax(logits, T)
        print(f"T={T}:", " ".join(f"{t!r}={x:.3f}" for t, x in zip(tokens, p)))

It printed:

    T=0.2: ' 5'=0.993 ' 7'=0.007 ' 3'=0.000 ' 24'=0.000 ' two'=0.000
    T=0.7: ' 5'=0.761 ' 7'=0.182 ' 3'=0.044 ' 24'=0.010 ' two'=0.003
    T=1.0: ' 5'=0.636 ' 7'=0.234 ' 3'=0.086 ' 24'=0.032 ' two'=0.012
    T=1.5: ' 5'=0.505 ' 7'=0.259 ' 3'=0.133 ' 24'=0.068 ' two'=0.035

At T = 1 the wrong figure " 7" still gets 23% of draws; at 1.5 even " 24" gets 7%. Temperature 0 is
treated as greedy. Temperature never adds knowledge — it only changes how often the less likely
tokens win.

## Top-p (nucleus) and top-k

**Top-p** keeps the smallest set of tokens whose probabilities add up to at least p, renormalises,
and samples only from them:

    p = softmax(logits)
    print(np.round(np.cumsum(np.sort(p)[::-1]), 3))
    # cumulative: [0.636 0.871 0.957 0.988 1.   ]
    # top_p=0.5: keep [' 5'] -> [1.]
    # top_p=0.9: keep [' 5', ' 7', ' 3'] -> [0.665 0.245 0.09 ]

At top-p 0.9 the long tail (" 24", " two") can never be drawn, while " 7" still can. **Top-k** keeps
a fixed number of tokens instead — simpler, but blind to whether the distribution is sharp or flat.
Common advice from providers: tune **either** temperature **or** top-p, not both at once, so you know
which change caused what.

## Seeds

Sampling uses a random number generator. With a fixed seed the draws repeat:

    rng = np.random.default_rng(seed=42)
    draws = rng.choice(len(tokens), size=1000, p=p)
    # 1000 draws at T=1: {' 5': 638, ' 7': 236, ' 3': 84, ' 24': 29, ' two': 13}

Locally, \`torch.manual_seed(1)\` before \`generate(do_sample=True)\` makes a run repeatable on the same
machine and library versions. Some hosted APIs accept a \`seed\` parameter, documented as
**best-effort**.

## Why temperature 0 is still not perfectly repeatable

Greedy decoding is deterministic only if the logits are bit-for-bit identical, and on a shared
inference server they are not quite:

- Your request is **batched** with other people's; batch size changes the order of floating-point
  additions, and floating-point addition is not associative, so logits differ in the last digits.
  When two tokens are nearly tied, the winner flips — and every later token follows the new path.
- Different **GPU kernels or hardware** in the fleet; some routing choices inside mixture-of-experts
  models.
- The provider quietly **updating** the model or serving stack behind the same name.

So: temperature 0 gives *mostly* the same output. Tests must check **behaviour** (valid JSON, the
right category, the cited passage), not exact strings. Log the model name and any fingerprint the
response returns, so you can tell a model change from noise.

## Stopping

- **max_tokens** caps output; when it is hit, \`finish_reason\` is \`"length"\` and the text is cut off.
- **Stop sequences** end generation when a string appears (\`"\\n\\n"\`, \`"</answer>"\`) — useful for
  completion-style prompts and local models.
- The model ending its own turn gives \`finish_reason\` \`"stop"\`.

Some reasoning-focused models fix or ignore temperature and top-p; read the model's documentation
rather than assuming the knobs exist.

## Choosing settings

| Task | Settings |
|---|---|
| Extraction, classification, SQL, JSON | temperature 0–0.2, schema-constrained output |
| RAG answers over policies | temperature 0–0.3; grounding matters more than decoding |
| Rewriting, summaries for people | 0.3–0.7 |
| Taglines, brainstorming, several variants | 0.7–1.0, or ask for n variants in one call |

Never use high temperature to "get a different answer" to a failing validation — fix the prompt.`,
    workedExample: `**Problem:** see real next-token probabilities from a real model, and see sampling cause a
hallucination that greedy decoding avoided.

We ran a 135M-parameter open instruct model on CPU with transformers, using the chat template from
the training-stages unit (\`MODEL_ID\` is any small instruct model id from the Hub):

    import torch
    from transformers import AutoTokenizer, AutoModelForCausalLM
    tok = AutoTokenizer.from_pretrained(MODEL_ID)
    model = AutoModelForCausalLM.from_pretrained(MODEL_ID)
    messages = [{"role": "system", "content": "You are a concise assistant."},
                {"role": "user", "content": "What is the capital of India?"}]
    text = tok.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tok(text, return_tensors="pt")

    with torch.no_grad():
        logits = model(**inputs).logits[0, -1]       # scores for the next token
    top = torch.topk(torch.softmax(logits, dim=-1), 5)
    for p, i in zip(top.values, top.indices):
        print(f"{tok.decode([int(i)])!r}: {float(p):.3f}")

It printed:

    'The': 0.723
    'India': 0.188
    'In': 0.023
    'I': 0.016
    '"': 0.005

Then three generations of 20 new tokens:

    out = model.generate(**inputs, max_new_tokens=20, do_sample=False)
    # greedy: 'The capital of India is New Delhi.'

    for seed in (1, 2):
        torch.manual_seed(seed)
        out = model.generate(**inputs, max_new_tokens=20, do_sample=True,
                             temperature=0.8, top_p=0.9)
    # seed 1: 'The capital of India is New Delhi.'
    # seed 2: 'The capital of India is New Delhi, which is located on the eastern coast of the country.'

**Reading it:**

- The first token is a real distribution: about 72% "The", 19% "India". Different first tokens lead
  to differently worded but equally correct answers.
- With sampling, seed 2 did not stop after "Delhi." — a lower-probability comma won, and the model
  then fluently invented a false fact (Delhi is not on any coast). Small models do this more, but the
  mechanism is the same in large ones.
- Re-running with seed 2 reproduces the bad answer exactly, which is how you debug it locally.

**Decision for a factual feature:** greedy or near-zero temperature, a tight max_tokens, and checks
on the content — not a higher temperature in the hope of a better draw.`,
    mcqs: [
      mcq('With logits 4, 3, 2, 1, 0 for five candidate tokens, what happens to the top token\'s probability as temperature goes from 1.0 to 0.2?', [
        ['It rises from about 0.64 to about 0.99', true],
        ['It falls from about 0.64 to about 0.20', false],
        ['It stays at 0.64, only the tail changes', false],
        ['It rises from about 0.20 to about 0.64', false],
      ], 'Dividing logits by a small temperature widens the gaps between them, so softmax concentrates on the top token: 0.636 at T=1 becomes 0.993 at T=0.2. Low temperature sharpens; it does not leave the top token unchanged.'),
      mcq('Candidate probabilities sorted are 0.636, 0.234, 0.086, 0.032, 0.012. With top-p = 0.9, which tokens can be sampled?', [
        ['The top three, whose cumulative total 0.957 first reaches 0.9', true],
        ['The top two, because 0.871 is the closest total to 0.9', false],
        ['All five, because top-p only rescales the probabilities', false],
        ['Only the first, because it is the only token above 0.5', false],
      ], 'Top-p keeps the smallest set whose cumulative probability is at least p. 0.636 + 0.234 = 0.871 is below 0.9, adding 0.086 gives 0.957, so three tokens are kept and renormalised.'),
      mcq('A nightly regression test calls a hosted model at temperature 0 and compares the reply string exactly with yesterday\'s. It fails about once a week with a reworded but correct answer. What is the right change?', [
        ['Assert on behaviour such as fields and citations, not the exact string', true],
        ['Lower the temperature further, to a small negative value like -0.1', false],
        ['Retry the call until the reply matches yesterday\'s string exactly', false],
      ], 'Temperature 0 on a shared server is not bit-for-bit repeatable: batching and floating-point order flip near-ties. Tests should check what matters. Negative temperature is invalid and retry-until-match hides real changes.'),
    ],
    checkpoint: [
      mcq('An invoice-extraction call occasionally returns a total that differs by one digit from the document. It runs at temperature 1.0. Which change addresses the decoding part of the problem?', [
        ['Drop temperature to 0–0.2 so unlikely digit tokens are rarely drawn', true],
        ['Raise top-p to 1.0 so that the full vocabulary is always available to it', false],
        ['Increase max_tokens so that the model has room to correct itself', false],
        ['Add a stop sequence after the total so generation ends sooner', false],
      ], 'At temperature 1 every plausible digit keeps real probability, so a wrong one is sometimes sampled. Low temperature makes the most likely token win. The total should still be checked in code against the document.'),
      mcq('A batch job reports finish_reason "length" on 4% of summaries, and those summaries end mid-sentence. What is happening?', [
        ['Generation hit max_tokens and was cut off before the model finished', true],
        ['A stop sequence matched part of the text and ended the reply early', false],
        ['The temperature was too low for the model to choose an ending token', false],
      ], 'finish_reason "length" means the output cap was reached. Raise max_tokens for these inputs or ask for shorter output, and detect "length" in code rather than storing truncated text.'),
      mcq('Why can two identical temperature-0 requests to a hosted model return different text?', [
        ['Batching changes floating-point order, so near-tied logits can flip', true],
        ['Temperature 0 is rounded up to a small random value by the server', false],
        ['The prompt is re-tokenised with a random tokeniser on each request', false],
        ['Greedy decoding chooses randomly between all tokens with equal scores', false],
      ], 'Floating-point addition is not associative; a different batch changes the summation order and the last digits of the logits. When two tokens are nearly tied the winner flips and the rest of the reply follows a different path.'),
    ],
  },

  /* ── MODEL_LANDSCAPE ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_LLM_INTERNALS_MODEL_LANDSCAPE',
    notes: `"Which model should we use?" is asked in every AI project, usually answered with whatever the
loudest person used last week. An engineer answers it the way you would choose a database: against
requirements, with measurements. Model names change every few months, so this unit teaches the
**axes** and the **method**, not a ranking.

## The four kinds of model you will choose between

- **Hosted, closed models** behind a provider's API. Usually the strongest on hard reasoning, no
  infrastructure, pay per token. Your data goes to the provider; you cannot inspect or freeze the
  weights, and the provider retires versions on its schedule.
- **Open-weight models** — the weights are downloadable; the training data and code usually are not
  ("open weight" is not the same as "open source"). You can run them on your own servers, in an
  Indian cloud region, or on a laptop, and pin an exact version for years.
- **Open-weight models hosted by someone else** — the same weights served by a cloud or inference
  provider through an API. Open licence, hosted convenience.
- **Small models** (roughly 1–10 billion parameters) versus **large** ones (tens to hundreds of
  billions). Small models are fast and cheap and often enough for classification, extraction and
  routing; large ones win on multi-step reasoning, long documents and difficult code.

**Mixture-of-experts** models have many parameters in total but use only a fraction per token, so
they run faster than their total size suggests while needing memory for all of it. Read both
numbers: total parameters (memory) and active parameters (speed).

## The axes that decide

1. **Quality on *your* task** — measured on your evaluation set, not a leaderboard.
2. **Latency** — time to first token and tokens per second at your prompt length.
3. **Cost** — (input tokens × input price + output tokens × output price) / 1,000,000 per call, times
   calls per month; for self-hosting, GPU hours at your real utilisation, plus the people to run it.
4. **Privacy and data location** — what the provider stores, for how long, whether it trains on API
   data, which region processes it. Under India's DPDP Act you remain responsible for personal data
   you send to a processor; a bank or hospital may simply require that data does not leave its own
   infrastructure.
5. **Licence** — permissive (Apache 2.0, MIT) or a custom licence with use restrictions, user caps or
   attribution rules. Read it before you ship; "free to download" is not "free to use commercially".
6. **Capabilities** — context length, tool calling, schema-constrained output, vision, and quality in
   Hindi, Telugu, Tamil and Hinglish.
7. **Operational fit** — rate limits, uptime, regions, how often versions are retired.

## Reading a benchmark sceptically

A benchmark score is a claim about one test, run one way. Before it moves your decision ask:

- **Is it my task?** A maths-olympiad score says little about classifying Hinglish complaints.
- **Contamination.** Public test questions leak into training data; a model can score well by
  having seen the answers.
- **Saturation.** When the top models all score 90%+, the differences are noise.
- **Who ran it, with what prompt?** Vendor-reported numbers use the vendor's best prompt and settings.
- **Arena-style rankings** reflect what raters prefer to read — often longer, confident answers —
  not correctness on your data.

Use benchmarks to build a **shortlist of three or four**; decide with your own evaluation set of 100–300
real cases (built in the evaluation topic), at the settings you will ship.

## A default strategy that works

- **Prototype** on a strong hosted model to learn what "good" looks like.
- **Build the evaluation set** from real inputs.
- **Try smaller and cheaper** models against it; keep the smallest that passes.
- **Route**: a small model for easy requests, a large one for hard ones (the production topic covers
  routing and fallbacks).
- **Keep the model a configuration value** — model name, base URL and key in settings, as you did
  in Generative AI in Python — so switching is a config change plus an evaluation run, not a rewrite.

## When open weights are the right call

- Data must not leave your infrastructure (regulated lending, health records, government work).
- Very high, steady volume where a GPU you keep busy beats per-token prices.
- You need a pinned version for years, or to fine-tune deeply.
- Offline or edge use: a field-service app with poor connectivity.

When they are not: low or spiky volume, a small team with no one to run GPUs, or a task that only
the strongest hosted models pass.`,
    workedExample: `**Problem:** a Hyderabad lending start-up has two features and asks for one model for both.

- **A — ticket triage:** classify 120,000 support messages a day (English, Telugu, Hinglish) into 12
  categories. About 400 input tokens and 20 output tokens each.
- **B — credit-memo drafting:** 300 memos a day from bank statements and bureau data — personal
  financial data — about 12,000 input and 1,500 output tokens each, read by an underwriter.

**Step 1 — volumes in tokens.**

    A: 120,000 × 400 = 48M input + 120,000 × 20 = 2.4M output tokens a day
    B:     300 × 12,000 = 3.6M input +   300 × 1,500 = 0.45M output tokens a day

**Step 2 — cost per day as a formula.** With prices per million tokens read from the provider's page:

    cost_A = 48 × P_in + 2.4 × P_out
    cost_B = 3.6 × P_in + 0.45 × P_out

For the same model, A costs over ten times what B does, despite B's long prompts — volume dominates.
A small model with a fraction of the price is the obvious first candidate for A.

**Step 3 — requirements.**

| | A — triage | B — credit memo |
|---|---|---|
| Quality | 12-way classification, Telugu + Hinglish | careful reasoning over numbers |
| Latency | under 1 s, async is fine | minutes acceptable |
| Privacy | message text, some personal data | sensitive financial data; the lender's policy: stays in India, no retention |
| Licence | commercial use needed | commercial use needed |

**Step 4 — shortlist and measure.** For A: two small open-weight models with permissive licences
and a small hosted model, each run on 300 labelled real tickets including 100 in Telugu and Hinglish.
For B: a large hosted model offered in an Indian region with zero data retention, and the largest
open-weight model the team can serve on rented GPUs in that region, each scored by two underwriters
on 40 past cases.

**Step 5 — decide on the numbers.** Suppose the open small model scores 94% on A, the hosted small one
95%, and the team cannot staff GPU operations. Choose the hosted small model for A; revisit
self-hosting if volume grows tenfold. For B, choose whichever passes the underwriters' bar while
meeting the data-location rule.

**Result:** two models, each justified on quality, cost, latency, privacy and licence — and both kept
as configuration, so the decision can be re-run when the next model appears.`,
    mcqs: [
      mcq('A vendor\'s new model tops a public reasoning leaderboard. Your feature classifies Hinglish complaints into 15 categories. What should decide whether you switch?', [
        ['Its score on your own labelled set of real complaints at your settings', true],
        ['Its leaderboard rank, since reasoning ability transfers to classification', false],
        ['Its parameter count, because larger models classify text more accurately', false],
        ['Its context window, since a bigger window always improves classification', false],
      ], 'Public benchmarks may be contaminated, saturated or unrelated to your task. Your own evaluation set of real inputs is the only evidence that the model is better for this feature.'),
      mcq('A mixture-of-experts model lists a large total parameter count and a much smaller active count. What does each number tell you about serving it?', [
        ['Total sets the memory needed; active sets the compute per token', true],
        ['Total sets the compute per token; active sets the memory needed', false],
        ['Total is the size on disk only; active is the size of the tokeniser', false],
      ], 'All experts must be loaded, so memory follows the total. Each token is routed through only some experts, so speed follows the active count — fast for its size, but still needing memory for everything.'),
      mcq('A hospital chain wants discharge summaries drafted from patient records and its policy says records may not leave its own data centre. Which option fits that constraint?', [
        ['An open-weight model served on the hospital\'s own GPUs', true],
        ['The strongest hosted model, with patient names removed', false],
        ['A hosted model, sending each record in smaller chunks', false],
        ['Any model, so long as the temperature is kept at zero', false],
      ], 'Only self-hosted open weights keep the records inside the data centre. Removing names still sends clinical data out, chunking changes nothing about where data goes, and decoding settings are irrelevant to privacy.'),
    ],
    checkpoint: [
      mcq('A feature makes 200,000 calls a day with 500 input and 50 output tokens each. In millions of tokens a day, what are the input and output volumes?', [
        ['100M input and 10M output tokens', true],
        ['10M input and 1M output tokens', false],
        ['100M input and 1M output tokens', false],
        ['1,000M input and 100M output tokens', false],
      ], '200,000 × 500 = 100,000,000 input tokens and 200,000 × 50 = 10,000,000 output tokens. Daily cost is then 100 × P_in + 10 × P_out with prices per million tokens.'),
      mcq('A start-up wants to embed an open-weight model in a product it sells. The model\'s page says "free to download" under a custom licence. What must the team check?', [
        ['The licence terms on commercial use, user caps and restrictions', true],
        ['Only that the weights file is smaller than their GPU\'s memory', false],
        ['Nothing, because downloadable weights are always open source', false],
      ], 'Open weights are not automatically open source or free for any use. Custom licences can restrict commercial use, cap the number of users, or require attribution; permissive licences such as Apache 2.0 and MIT do not.'),
      mcq('Which situation most favours self-hosting an open-weight model over a hosted API?', [
        ['Steady high volume, data that must stay on your infrastructure, and an ops team', true],
        ['Low, spiky traffic, a two-person team, and a task only the top model passes', false],
        ['A prototype due next week that needs to try several different model sizes', false],
        ['Any production feature, because self-hosting is always cheaper per token', false],
      ], 'Self-hosting pays off when GPUs stay busy, when privacy rules demand it, and when someone can operate the infrastructure. With spiky low traffic or a small team, per-token APIs are cheaper and simpler.'),
    ],
  },

  /* ── LOCAL_MODELS ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_LLM_INTERNALS_LOCAL_MODELS',
    notes: `Running an open-weight model on your own machine gives you a free, private, offline model for
development, tests and demos — and teaches you what hosted providers hide: memory, quantisation and
context length. There are two common routes: **Ollama** (an app that runs models behind a local
server) and **Hugging Face transformers** (Python, full control).

## Will it fit? Memory arithmetic

The weights need roughly **parameters × bytes per parameter**:

| Precision | Bytes/param | 7B model | 135M model |
|---|---|---|---|
| 32-bit float | 4 | 28 GB | 0.54 GB |
| 16-bit | 2 | 14 GB | 0.27 GB |
| 8-bit | 1 | 7 GB | — |
| 4-bit | ~0.5 | ~4 GB | — |

Add the **KV cache** (it grows with context length, see the transformer unit) and some working memory.
A laptop with 16 GB RAM runs a 7B model only when it is quantised to about 4 bits.

## Quantisation and what it costs

**Quantisation** stores weights in fewer bits — 8 or 4 instead of 16 — with a scale factor per small
block of weights. Ollama and llama.cpp use the **GGUF** format, with names such as \`Q8_0\`, \`Q5_K_M\`,
\`Q4_K_M\`. In practice:

- 8-bit is close to the original on most tasks.
- 4-bit (\`Q4_K_M\` is a common default) is usually a good trade for chat; the loss shows first in
  exact arithmetic, long multi-step reasoning, code and smaller languages — measure on your own set.
- Below 4 bits quality falls quickly.
- A bigger model at 4 bits often beats a smaller model at 16 bits for the same memory.

## Route 1 — Ollama

Install it from ollama.com (Windows, macOS, Linux). It runs a server on port **11434**. The CLI:

    ollama pull <model>          # download, e.g. a name:tag from ollama.com/library
    ollama run <model>           # interactive chat in the terminal
    ollama run <model> "Summarise UPI in one line"   # one-shot prompt
    ollama list                  # models on disk
    ollama ps                    # models loaded in memory right now
    ollama show <model>          # parameters, quantisation, context length, template
    ollama rm <model>            # delete from disk

Its native REST API:

    curl http://localhost:11434/api/chat -d '{
      "model": "<model>",
      "messages": [{"role": "user", "content": "Mera refund kab aayega?"}],
      "stream": false,
      "options": {"temperature": 0, "num_ctx": 8192, "seed": 42}
    }'

Two settings catch people out. **num_ctx** is the context length the model is loaded with, and
Ollama's default is only a few thousand tokens (it varies by version — check \`ollama show\`).
Longer prompts are **silently truncated**, not rejected. And a model stays loaded for a few minutes
after the last request (\`keep_alive\`), so the first request after that is slow.

You can bake settings into a named model with a **Modelfile**:

    FROM <model>
    PARAMETER temperature 0
    PARAMETER num_ctx 8192
    SYSTEM "You answer questions about the company's HR policies."

    ollama create hr-assistant -f Modelfile

## The OpenAI-compatible endpoint

Ollama also serves the OpenAI API shape at \`http://localhost:11434/v1\`, so the client code from
Generative AI in Python works unchanged:

    from openai import OpenAI
    client = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")  # key required, ignored
    resp = client.chat.completions.create(
        model="<model>",
        messages=[{"role": "user", "content": "Explain EMI in two lines."}],
        temperature=0,
    )
    print(resp.choices[0].message.content)

vLLM (\`vllm serve <hub-model-id>\`, port 8000) and llama.cpp's server expose the same shape, so "local
versus hosted" becomes three settings: base URL, key and model name.

## Route 2 — Hugging Face transformers

For full control — inspecting probabilities, fine-tuning, research — load the weights in Python.
Recent versions can take chat messages directly in a pipeline:

    from transformers import pipeline
    chat = pipeline("text-generation", model=MODEL_ID)      # any instruct model id from the Hub
    out = chat([{"role": "user", "content": "What is the capital of India?"}],
               max_new_tokens=40, do_sample=False)
    print(out[0]["generated_text"][-1]["content"])

The pipeline applies the chat template for you; with \`model.generate\` you call
\`apply_chat_template\` yourself (training-stages unit). Weights download once into the Hugging Face
cache (\`~/.cache/huggingface\`). On a CPU, keep to models under about 1–3B parameters; 4-bit loading
with bitsandbytes needs an NVIDIA GPU.

## Gotchas

- Gated models need a free Hugging Face account, accepting the licence, and \`hf auth login\`.
- \`localhost\` inside a Docker container is the container; reach the host's Ollama with
  \`host.docker.internal\` or run Ollama as a service in the same compose file.
- A local model is not a hosted one: weaker on hard tasks, slower on a laptop, and its own chat
  template and tool-calling support. Run your evaluation set before switching a feature to it.`,
    workedExample: `**Problem:** a team builds an HR-policy assistant. They want developers and CI to run with no paid
key, and production to use a hosted model — with no code change between them.

**Step 1 — make the model configuration.** Using Pydantic settings, as in Generative AI in Python:

    from pydantic_settings import BaseSettings
    from openai import OpenAI

    class Settings(BaseSettings):
        llm_base_url: str = "http://localhost:11434/v1"
        llm_api_key: str = "ollama"
        llm_model: str = "hr-assistant"         # the Ollama model created from the Modelfile
        llm_context_tokens: int = 8192

    s = Settings()
    client = OpenAI(base_url=s.llm_base_url, api_key=s.llm_api_key)

Production sets \`LLM_BASE_URL\`, \`LLM_API_KEY\` and \`LLM_MODEL\` as environment variables; nothing
else changes.

**Step 2 — make the local model match production's settings.** The Modelfile in the notes pins
temperature 0 and \`num_ctx 8192\`. Without that, Ollama's small default context would silently cut
the retrieved policy passages and the local answers would look worse than production for a reason
unrelated to the model.

**Step 3 — check the budget in code, not by hope.** Count prompt tokens with the model's own
tokeniser (or an estimate plus headroom) and refuse to send more than \`llm_context_tokens −
max_tokens\`. Silent truncation then becomes a logged error.

**Step 4 — smoke test the endpoint in CI.**

    def test_local_model_answers():
        r = client.chat.completions.create(
            model=s.llm_model, temperature=0, max_tokens=50,
            messages=[{"role": "user", "content": "Reply with the single word OK."}])
        assert "ok" in r.choices[0].message.content.lower()

Unit tests still use a fake client (fast, deterministic); this one test proves the wiring.

**Step 5 — know what local cannot prove.** Quality on the evaluation set must be measured on the
production model. The local model proves the code path, not the answer quality.

**Result:** \`ollama pull\`, \`ollama create hr-assistant -f Modelfile\`, and the app runs on a laptop
with no key; the same image runs in production against the hosted model by changing three
environment variables.`,
    mcqs: [
      mcq('A developer\'s 16 GB laptop must run a 7-billion-parameter model locally. Which choice makes it fit with room for the KV cache?', [
        ['A 4-bit quantised build, about 4 GB of weights', true],
        ['The 16-bit original, about 14 GB of weights', false],
        ['The 32-bit original, loaded with no KV cache', false],
        ['An 8-bit build plus a 128,000-token context', false],
      ], 'Weights need about parameters × bytes per parameter: 14 GB at 16-bit leaves almost nothing; 4-bit is about 3.5–4 GB. A very long context needs a large KV cache on top, so 8-bit with 128k tokens would not fit either.'),
      mcq('Through Ollama, answers to questions about the end of a long policy document are good, but questions about its beginning are answered as if that part were missing. No error is reported. What is the likely cause?', [
        ['The prompt exceeds num_ctx and is truncated silently; raise it in options', true],
        ['The model is quantised to 4 bits, which deletes the earliest tokens first', false],
        ['keep_alive unloaded the model halfway through reading the long prompt', false],
      ], 'Ollama loads a model with a fixed context length and drops what does not fit without an error. Setting num_ctx in the request options or Modelfile, and counting tokens before sending, fixes it.'),
      mcq('An app uses the OpenAI Python SDK against a hosted provider. What is the minimum change to point it at a local Ollama server?', [
        ['Set base_url to http://localhost:11434/v1, any key, and a local model', true],
        ['Replace the SDK with the Ollama REST API and rewrite each call site', false],
        ['Install a proxy that converts OpenAI requests to transformers calls', false],
        ['Set the api_key to "local"; the SDK then detects the Ollama server', false],
      ], 'Ollama serves an OpenAI-compatible API under /v1, so only base URL, key (required by the SDK but ignored) and model name change. The native REST API is optional.'),
    ],
    checkpoint: [
      mcq('A FastAPI service in Docker calls http://localhost:11434/v1 and gets "connection refused", though Ollama works from the host\'s terminal. Why?', [
        ['localhost in the container is the container; use host.docker.internal', true],
        ['Ollama refuses requests that do not include a paid OpenAI API key', false],
        ['Port 11434 is reserved inside Docker for the container\'s own DNS', false],
        ['The OpenAI SDK cannot talk to servers that use plain HTTP at all', false],
      ], 'Inside a container, localhost refers to the container itself, where nothing listens on 11434. Point the client at host.docker.internal or run Ollama as a service on the same Docker network.'),
      mcq('After quantising a model from 16-bit to 4-bit, chat answers look the same but a test set of GST calculations drops from 91% to 78%. What is the sound reading?', [
        ['Quantisation loss shows first on exact arithmetic; try 8-bit or a larger model', true],
        ['The test set must be wrong, because quantisation does not change answers', false],
        ['4-bit models need temperature 1.0 to recover their lost precision', false],
      ], 'Quantisation adds small errors to every weight. Casual chat hides them; exact arithmetic and multi-step reasoning reveal them. Measure on your own task and step up the precision or the model size if needed.'),
      mcq('Why does a first request to a local Ollama model take 20 seconds when later ones take 2?', [
        ['The model is loaded into memory on first use and unloaded after keep_alive', true],
        ['The first request also downloads the tokeniser from the Hugging Face Hub', false],
        ['Ollama compiles the model to GPU code anew for each new conversation', false],
        ['The first request is always sent to the hosted provider as a fallback', false],
      ], 'Loading several GB of weights takes time. Ollama keeps a model resident for a while after the last request; once it is unloaded, the next request pays the load cost again.'),
    ],
  },

  /* ── DEBUGGING ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_LLM_INTERNALS_DEBUGGING',
    notes: `Bugs in this topic hide below the prompt: in the tokeniser, the chat template, the decoder or the
local server's settings. Your code runs, the model replies, and the reply is wrong, empty or garbled.
Each case below was reproduced in the course venv; the outputs are real.

## 1. The instruct model returns an empty string

**Symptom:** a locally loaded instruct model returns \`''\` for "What is the capital of India?".

    inputs = tok("What is the capital of India?", return_tensors="pt")
    out = model.generate(**inputs, max_new_tokens=30)
    print(repr(tok.decode(out[0, inputs["input_ids"].shape[1]:], skip_special_tokens=False)))
    # '<|im_end|>'

**Cause:** no chat template. The model saw plain text that does not look like a conversation turn and
predicted "end of turn" straight away (\`skip_special_tokens=True\` hid that token, giving \`''\`).
**Fix:** \`tok.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)\`, or use a
pipeline, which applies it. Decode with special tokens visible while debugging.

## 2. Telugu queries all return the same passages

**Symptom:** every Telugu question to the RAG search returns the same five passages.
**Look at the tokens:**

    tok = AutoTokenizer.from_pretrained(EMBEDDING_MODEL_ID)
    print(tok.tokenize("నా రీఫండ్ ఎప్పుడు వస్తుంది? ఐదు రోజులు అయింది."))
    # ['[UNK]', '[UNK]', '[UNK]', '[UNK]', '?', '[UNK]', '[UNK]', '[UNK]', '.']

**Cause:** an English-only WordPiece vocabulary; every Telugu word is \`[UNK]\`, so all Telugu queries
embed to nearly the same vector.
**Fix:** a multilingual embedding model (its tokeniser produced 11 real pieces for this sentence), then
re-embed the corpus. Add Telugu queries to the retrieval evaluation set.

## 3. The stream shows "�" in Hindi and Telugu

**Symptom:** a streaming UI shows \`నా రీ��ండ్\` while the final stored text is fine.

    ids = enc.encode("నా రీఫండ్")
    print("".join(enc.decode([i]) for i in ids))        # నా రీ��ండ్

**Cause:** one Telugu letter was split across two tokens; decoding each token alone produces half a
UTF-8 character.
**Fix:** decode bytes with an incremental decoder, or re-decode the accumulated ids:

    import codecs
    dec = codecs.getincrementaldecoder("utf-8")()
    print("".join(dec.decode(enc.decode_single_token_bytes(i)) for i in ids))   # నా రీఫండ్

Hosted streaming APIs already send whole characters; this bites when you stream from your own
model server.

## 4. "Context length exceeded" only for Hindi users

**Symptom:** a guard computes \`len(text) / 4\` and approves requests that the provider then rejects.
**Cause:** the 4-characters-per-token rule is for English. The Hindi refund sentence was 36 characters
and 41 tokens on one tokeniser — under one character per token.
**Fix:** count with the model's tokeniser (\`len(enc.encode(text))\`) and truncate by tokens
(\`enc.decode(enc.encode(text)[:n])\`), leaving headroom for output and message markers.

## 5. The local model ignores the start of a long document

**Symptom:** via Ollama, questions about the first sections of a 15-page policy get "not mentioned".
**Cause:** the prompt is longer than the loaded \`num_ctx\`; Ollama drops the overflow without an error.
**Fix:** set \`"options": {"num_ctx": 8192}\` (or \`PARAMETER num_ctx\` in a Modelfile), check the memory
it needs, and count tokens before sending so overflow becomes a logged error.

## 6. The "deterministic" test is flaky

**Symptom:** a test at temperature 0 asserts the exact reply text and fails once or twice a week.
**Cause:** hosted inference is not bit-for-bit repeatable — batching changes floating-point order and
near-tied tokens flip.
**Fix:** assert behaviour (parsed fields, category, cited passage id), log the model name and any
fingerprint, and run quality checks on an evaluation set rather than one string.

## The habit

Print the **tokens** (\`tokenize\`, \`encode\` with decoded pieces), the **exact text sent** (after the
chat template), the **settings** (temperature, top-p, max_tokens, num_ctx) and the **finish reason**.
Nine times in ten the bug is visible in one of those four.`,
    mcqs: [
      mcq('A custom model server streams tokens to a React UI, and Hindi words show a "�" mid-word that disappears when the full reply is saved. What is the cause?', [
        ['A character was split across tokens and each token was decoded on its own', true],
        ['The React component renders Devanagari in a font without the needed glyphs', false],
        ['The model produced an invalid token that the save step later corrected', false],
        ['The server sends Latin-1 while the browser expects UTF-8 for the stream', false],
      ], 'Byte-level tokens can end in the middle of a multi-byte UTF-8 character. Decoding token by token yields half-characters; an incremental UTF-8 decoder or re-decoding the accumulated ids fixes it. The saved text is fine because it is decoded whole.'),
      mcq('An instruct model loaded with transformers returns \'\' for every question; decoding with skip_special_tokens=False shows only an end-of-turn token. What should change first?', [
        ['Build the prompt with apply_chat_template and add_generation_prompt=True', true],
        ['Raise max_new_tokens from 30 to 300 so the model has room to answer', false],
        ['Switch to do_sample=True so the model avoids always picking end-of-turn', false],
      ], 'The model ends its turn at once because plain text is not a conversation it was tuned on. More tokens or sampling do not fix a malformed input; the chat template does.'),
      mcq('A guard approves prompts when len(text) / 4 is under the limit, yet the provider rejects some Telugu prompts for length. Which fix is correct?', [
        ['Count tokens with the model\'s tokeniser and truncate by token count', true],
        ['Divide by 2 instead of 4 for every prompt, whatever its language', false],
        ['Strip the Telugu text down to its consonants before sending the prompt', false],
        ['Ask the provider to raise the context window for Telugu-speaking users', false],
      ], 'Characters per token vary by script and tokeniser — the same Telugu sentence took 17 tokens on one tokeniser and 78 on another. Only a real token count is safe; a different constant just moves the failure.'),
      mcq('A local Ollama model answers "the policy does not mention probation" though section 1 covers it; questions on later sections work. What do you check first?', [
        ['Whether the prompt is longer than the loaded num_ctx', true],
        ['Whether temperature is 0, which hides early sections', false],
        ['Whether the model is the 4-bit or the 8-bit download', false],
        ['Whether keep_alive is long enough for the full answer', false],
      ], 'Ollama silently drops prompt text that does not fit the loaded context length, so the earliest part of a long prompt can vanish. Quantisation level and keep_alive do not remove specific sections.'),
    ],
  },

  /* ── PRACTICE ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_LLM_INTERNALS_PRACTICE',
    notes: `Work each exercise on paper or in the venv before reading the answer. Levels: **[1]** recall,
**[2]** apply, **[3]** decide.

## 1. [1] Spot the tokenisation risk

Which of these model tasks are risky because of tokenisation: (a) summarise a complaint; (b) count
the words in a paragraph; (c) copy a 12-digit UPI reference into JSON; (d) translate a sentence?

**Answer:** (b) and (c). Tokens are not words or digits: counting and exact copying are unreliable.
Do (b) with \`len(text.split())\` and validate (c) against a regex extraction.

## 2. [2] Token budget

A context window is 16,000 tokens. The system prompt is 1,200 tokens, history is capped at 3,000, the
answer is capped at 800, and you keep 100 for markers. How many tokens are left for retrieved passages?

**Answer:** 16,000 − 1,200 − 3,000 − 800 − 100 = **10,900**.

## 3. [2] Softmax by hand

Logits are 2, 1, 0 for tokens A, B, C. Compute probabilities at T = 1 (e ≈ 2.718).

**Answer:** e² = 7.389, e¹ = 2.718, e⁰ = 1; sum 11.107. A = **0.665**, B = **0.245**, C = **0.090**.
(These are the same numbers top-p 0.9 produced in the decoding unit after renormalising.)

## 4. [2] Temperature direction

Same logits at T = 0.5. Without computing exactly: does A's probability go up or down, and roughly
to what?

**Answer:** up. Dividing by 0.5 doubles the logits to 4, 2, 0: e⁴ = 54.6, e² = 7.39, 1; A ≈ 54.6 / 63.0 =
**0.867**.

## 5. [2] Top-p

Sorted probabilities 0.50, 0.25, 0.15, 0.06, 0.04. Which tokens survive top-p = 0.8? And top-p = 0.9?

**Answer:** cumulative 0.50, 0.75, 0.90, 0.96, 1.00. At 0.8 the first three (0.90 is the first total
≥ 0.8). At 0.9 also the first three — 0.90 reaches 0.9 exactly.

## 6. [2] KV cache

A model has 40 layers, 8 KV heads, head size 128, a 16-bit cache. How much cache for one 16,000-token
conversation?

**Answer:** per token 2 × 40 × 8 × 128 × 2 = 163,840 bytes = 160 KiB. × 16,000 = 2,621,440,000 bytes ≈
**2.44 GiB** per conversation — before the weights.

## 7. [2] Will it fit?

A 14-billion-parameter model on a GPU with 24 GB. Which precision fits with room for the cache: 16-bit,
8-bit or 4-bit?

**Answer:** 16-bit needs about 28 GB — no. 8-bit about 14 GB, leaving ~10 GB for cache and overhead —
yes. 4-bit about 7 GB — yes, with more room for long contexts or concurrency, at some quality cost.

## 8. [3] Which stage?

For each behaviour name the training stage and the fix: (a) does not know this year's revised
income-tax slabs; (b) refuses to describe phishing to the security team; (c) ignores your JSON format.

**Answer:** (a) pre-training cut-off → put the current slabs in the prompt via retrieval. (b)
preference tuning → clear system context about the users and purpose, or another model. (c)
instruction following → schema-constrained output and examples; fine-tune only if those fail.

## 9. [3] Decoding settings

Pick temperature and top-p for: (a) extracting PAN and amount from a scanned invoice; (b) ten
alternative push-notification lines for a Diwali sale.

**Answer:** (a) temperature 0, default top-p, schema-constrained output, validation in code. (b)
temperature about 0.8–1.0 (tune top-p or temperature, not both), and ask for all ten in one call so
they differ from each other.

## 10. [3] Choose a model

A government-hospital pilot drafts Telugu discharge summaries; records may not leave the state data
centre; volume 500 a day. Hosted or open-weight?

**Answer:** open-weight, self-hosted in the data centre — the data rule decides before quality or
cost. Shortlist open models with good Telugu, check their licences, and score drafts with doctors on
40 real cases before choosing.`,
    mcqs: [
      mcq('Logits for three tokens are 2, 1 and 0. At temperature 1, which probabilities does softmax give, to three decimal places?', [
        ['0.665, 0.245 and 0.090', true],
        ['0.667, 0.333 and 0.000', false],
        ['0.500, 0.333 and 0.167', false],
        ['0.731, 0.269 and 0.000', false],
      ], 'e² = 7.389, e¹ = 2.718, e⁰ = 1, summing to 11.107; dividing gives 0.665, 0.245, 0.090. Dividing the logits by their sum (2/3, 1/3, 0) is the tempting mistake — softmax exponentiates first.'),
      mcq('A 16,000-token window must hold a 1,200-token system prompt, 3,000 tokens of history, an 800-token answer cap and 100 tokens of markers. How many tokens remain for retrieved passages?', [
        ['10,900 tokens', true],
        ['11,700 tokens', false],
        ['12,000 tokens', false],
        ['10,100 tokens', false],
      ], 'Input and output share the window: 16,000 − 1,200 − 3,000 − 800 − 100 = 10,900. Forgetting the answer cap gives 11,700, the most common error.'),
      mcq('A 14-billion-parameter model must run on a 24 GB GPU with room for a long context. Which is the highest precision that fits?', [
        ['8-bit weights, about 14 GB, leaving roughly 10 GB', true],
        ['16-bit weights, about 14 GB, leaving roughly 10 GB', false],
        ['16-bit weights, about 28 GB, after offloading the cache', false],
      ], 'Weights take about parameters × bytes per parameter: 14B × 2 bytes = 28 GB at 16-bit, too much for 24 GB; 14B × 1 byte = 14 GB at 8-bit fits with space for the KV cache.'),
      mcq('Sorted next-token probabilities are 0.50, 0.25, 0.15, 0.06 and 0.04. How many tokens can be drawn with top-p set to 0.8?', [
        ['Three, because the total first reaches 0.8 at 0.90', true],
        ['Two, because 0.75 is the total closest to 0.8', false],
        ['Four, because top-p keeps tokens until 0.96', false],
        ['One, because only 0.50 is above the 0.8 line', false],
      ], 'Top-p keeps the smallest prefix whose cumulative probability is at least p: 0.50, 0.75, 0.90 — the third token takes the total past 0.8, so three tokens survive.'),
      mcq('A marketing team wants ten clearly different Diwali push-notification lines from one model. Which approach fits best?', [
        ['One call at moderately high temperature asking for all ten lines', true],
        ['Ten calls at temperature 0 with the same prompt, keeping each line', false],
        ['Ten calls at temperature 2.0 so that every line is maximally random', false],
      ], 'At temperature 0, ten identical calls return nearly the same line. Asking for ten in one call lets the model make them differ from each other, and moderate temperature adds variety without the incoherence of very high values.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_LLM_INTERNALS_INTERVIEW_QUESTION',
    notes: `AI-engineering interviews in Bengaluru and Hyderabad now open with "how does it actually work?"
questions. The interviewer is not after a lecture on back-propagation; they want to hear that you can
connect the mechanism to a bug, a cost or a design decision. Answer in two minutes, then expect the
follow-up.

## Q1. "Why can't an LLM reliably count the letters in a word?"

**Model answer:** "The model never sees letters. Text is split into subword tokens by a BPE tokeniser —
'strawberry' becomes 'str', 'aw', 'berry' on one tokeniser — and the model predicts token ids. Letter
counts are not directly visible in those ids, so the model has to have memorised them. The same thing
makes digit copying and decimal comparison unreliable: a 12-digit UPI reference is four 3-digit
tokens. In a product I would not prompt harder; I would do counting and exact copying in code, or give
the model a tool."

**Follow-up:** "Does this affect cost?" — "Yes. The number of tokens per word depends on the script.
The same refund question took 11 tokens in English and 17 in Telugu on one tokeniser, 78 on an older
one. I measure on real traffic per language and budget in tokens, not characters."

## Q2. "Walk me through what happens from sending a prompt to receiving the first token."

**Model answer:** "The server applies the chat template and tokenises the text. In **prefill**, the
whole prompt passes through every transformer layer in parallel — attention lets each token look at
earlier ones under a causal mask, the feed-forward part transforms each token — and the keys and
values for every token are stored in the **KV cache**. The final vector of the last token is projected
onto the vocabulary to give logits; softmax gives probabilities; the decoder samples or picks one
token. That is the first token, so **time to first token grows with prompt length**. After that,
**decode** produces one token per step, reusing the cache."

**Follow-up:** "So why are long contexts expensive?" — "Prefill attention grows roughly with the square
of length, and the KV cache grows linearly — about 128 KiB per token for a mid-size model, so a
gigabyte at 8,000 tokens, per concurrent request. And quality drops for facts in the middle of very
long contexts, so I send fewer, better passages."

## Q3. "We set temperature to 0. Why do we still see different answers?"

**Model answer:** "Temperature 0 means greedy decoding, which is deterministic only if the logits are
identical. On a shared server, requests are batched, and batch composition changes the order of
floating-point additions; addition is not associative, so logits differ slightly, and where two tokens
are nearly tied the choice flips and the rest of the text follows. Hardware differences and silent
model updates add more. So I test behaviour — parsed fields, categories, citations — and log the
model version, rather than comparing strings."

**Follow-up:** "How would you make a local run reproducible?" — "Fix the model files, library versions
and hardware, and set the seed — \`torch.manual_seed\` before \`generate\` with sampling, or the
\`seed\` option in Ollama. Then the same input gives the same output on that machine."

## Q4. "Hosted API or an open-weight model for our product?"

**Model answer:** "It depends on five things, and I would decide on measurements. **Quality on our
task** — I would build a set of a few hundred real cases and score candidates on it. **Cost** — tokens
per call × calls × price per million for APIs; GPU hours at real utilisation plus operations for
self-hosting. **Latency**. **Privacy** — if personal financial or health data must stay on our
infrastructure, that decides it, and under the DPDP Act we stay responsible for what we send a
processor. **Licence** — open weights are not always free for commercial use. I usually prototype on a
strong hosted model, then try smaller and open ones against the evaluation set, and keep the model as
configuration so we can switch."

**Follow-up:** "We have 10 million classification calls a day." — "Then volume dominates cost: a small
model that passes the evaluation set, hosted or self-hosted on GPUs we keep busy, with a larger model
only for the uncertain cases."`,
    mcqs: [
      mcq('An interviewer asks why time to first token rises with prompt length but tokens per second afterwards do not. Which answer is accurate?', [
        ['Prefill processes the whole prompt first; decode then reuses the KV cache per token', true],
        ['The provider queues long prompts behind short ones before it starts processing them', false],
        ['Long prompts are tokenised more slowly, and tokenisation happens before every token', false],
        ['Decode recomputes attention for the entire prompt from scratch on every new token', false],
      ], 'Prefill runs every prompt token through the layers before the first output token, so it grows with length. Decode reuses cached keys and values, so each new token costs roughly the same; recomputing everything each step is exactly what the cache avoids.'),
      mcq('In an interview you are asked how to make a sampled local generation reproducible for a bug report. What do you say?', [
        ['Pin model files and library versions, use the same machine, and set the seed', true],
        ['Set temperature to 0.01 so sampling is practically identical to greedy decoding', false],
        ['Run the generation three times and report whichever reply appears most often', false],
      ], 'Sampling is repeatable when the random seed, weights, software and hardware are the same. A tiny temperature changes the behaviour being debugged, and majority voting does not reproduce the failing run.'),
      mcq('An interviewer says, "Just fine-tune the model on our product catalogue so it knows our prices." What is the strongest response?', [
        ['Prices change and need citing, so retrieve them; fine-tune only for behaviour', true],
        ['Fine-tuning is the right tool, as long as it is repeated after each price change', false],
        ['Fine-tuning works only on base models, so it cannot be used on a chat model', false],
        ['The prices should go in the system prompt, since prompts can hold any amount', false],
      ], 'Fine-tuning teaches behaviour well but stores facts unreliably, cannot cite a source and needs retraining on every change. Retrieval brings current prices at run time. System prompts are limited by the context window.'),
    ],
  },

  /* ── CHECKPOINT ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_LLM_INTERNALS_CHECKPOINT',
    notes: `Ten scenario questions across the whole topic: tokenisation, the transformer, training stages,
decoding, choosing a model and running one locally. Where there is arithmetic, do it on paper before
you look at the options.`,
    checkpoint: [
      mcq('A product manager estimates token costs for a Telugu-first app using "1 token ≈ 4 characters". What is the likely effect?', [
        ['Costs and context use are underestimated, because Telugu needs more tokens per character', true],
        ['Costs are overestimated, because Telugu words are long and so become single tokens', false],
        ['The estimate is accurate, because every tokeniser is trained to average 4 characters', false],
        ['Only latency is affected; billing counts characters rather than tokens for Telugu', false],
      ], 'Scripts that are rare in tokeniser training split into many small pieces: the same sentence was 11 tokens in English and 17 or 78 in Telugu depending on the tokeniser. Billing and limits are in tokens, so the estimate is too low.'),
      mcq('A team writes a guard that blocks any user message containing the text "<|im_start|>system". Why does the underlying risk exist at all?', [
        ['If such text became a special token, users could forge a turn the model trusts', true],
        ['That string is billed at a premium rate that the team wants to avoid paying', false],
        ['The string crashes every tokeniser, so the request would fail without the guard', false],
      ], 'Chat templates mark turns with special tokens. If untrusted text could be encoded as those tokens, a user could inject a fake system turn; tokenisers refuse special tokens in ordinary text by default for this reason.'),
      ck('DL_TRANSFORMERS', 'A long RAG prompt has the instructions first, 30 passages next and the question last. The answering passage is number 15. Why is it at higher risk of being ignored than passage 29?', [
        ['Long-context models use the middle of the context less reliably than its ends', true],
        ['The causal mask hides passage 15 from the question because it comes earlier', false],
        ['Attention can only reach the 20 tokens nearest to the current output token', false],
        ['Passages in the middle are dropped by the tokeniser to stay within the window', false],
      ], 'Measured across many models, information at the start and end of a long context is used more reliably than information in the middle. The causal mask hides later tokens, not earlier ones, so the question can attend to passage 15 — just less reliably.'),
      ck('DL_TRANSFORMERS', 'A self-hosted model serves 20 concurrent chats of 8,000 tokens each. Its KV cache needs 128 KiB per token. About how much GPU memory does the cache alone need?', [
        ['About 20 GiB', true],
        ['About 1 GiB', false],
        ['About 160 MiB', false],
        ['About 200 GiB', false],
      ], '128 KiB × 8,000 tokens ≈ 0.98 GiB per chat; × 20 concurrent chats ≈ 19.5 GiB, on top of the weights. The cache scales with both context length and concurrency, which is why long contexts limit throughput.'),
      mcq('A base model given "Q: What is the notice period for resignation?" writes an answer and then three more invented questions with answers. What explains this?', [
        ['A base model continues documents; answering and stopping come from instruction tuning', true],
        ['Its temperature is too high, so it keeps sampling extra questions after the answer', false],
        ['The KV cache overflowed, so the model lost track of where its answer should end', false],
      ], 'Pre-training teaches next-token prediction on documents such as FAQ pages, where a question is followed by more questions. Instruction tuning is what teaches a model to answer one question and end its turn.'),
      mcq('A model insists the repo rate is the value from before the latest RBI announcement. Which fix addresses the cause?', [
        ['Put the current rate, from a trusted source, into the prompt at run time', true],
        ['Lower the temperature so the model stops guessing at the latest value', false],
        ['Fine-tune the model once on this month\'s announcement and redeploy it', false],
        ['Ask the model to reflect and check whether its answer is up to date', false],
      ], 'The knowledge cut-off is a pre-training property; the model cannot know later facts. Retrieval or tool results provide them. Fine-tuning on a fact that will change again is slow and unreliable, and self-reflection cannot create missing knowledge.'),
      mcq('With logits 4, 3, 2, 1, 0, the top token has probability 0.636 at temperature 1. What happens to the lowest token\'s probability at temperature 1.5?', [
        ['It rises, from about 0.012 to about 0.035', true],
        ['It falls, from about 0.012 to about 0.004', false],
        ['It stays at 0.012, as only the top changes', false],
      ], 'Higher temperature shrinks the gaps between logits, flattening the distribution: the top token falls to 0.505 and the bottom rises to 0.035. More tail tokens get drawn, which is how high temperature produces stray errors.'),
      mcq('A classification feature at temperature 0 returns a different but valid category for the same ticket on rare occasions. What is the best engineering response?', [
        ['Accept small variation, test behaviour on an eval set, and log the model version', true],
        ['Report a provider bug, because temperature 0 guarantees the same output always', false],
        ['Raise temperature to 0.5 so the variation is at least consistent across calls', false],
        ['Call the model five times for every ticket and always store the first reply', false],
      ], 'Temperature 0 is not bit-for-bit repeatable on shared servers because batching changes floating-point order. Borderline tickets can flip. Evaluate on a labelled set and track model versions; raising temperature adds variation.'),
      mcq('A team must choose a model for 5 million short Hinglish classifications a day, with no data-location rule. Which process is sound?', [
        ['Shortlist small models, score them on real labelled tickets, compare cost per day', true],
        ['Pick the top model on a public leaderboard, since it will classify best as well', false],
        ['Pick the largest open-weight model available, as size predicts Hinglish quality', false],
      ], 'At this volume cost per call dominates, so small models are the first candidates, and only your own labelled Hinglish data shows whether they are good enough. Leaderboards and size are weak proxies for this task.'),
      mcq('A developer switches an app from a hosted API to Ollama by changing base_url, and long-document answers get worse with no errors. Besides model quality, what must they check?', [
        ['The num_ctx the model is loaded with, since overflow is cut off silently', true],
        ['That the OpenAI SDK is upgraded to its Ollama-specific major version', false],
        ['That temperature is raised, because local models need it to read long text', false],
        ['That the API key starts with "sk-", or Ollama ignores the system prompt', false],
      ], 'Ollama loads models with a modest default context and truncates longer prompts without an error. Set num_ctx explicitly and count tokens before sending; the SDK needs no special version and the key is ignored.'),
    ],
  },
];
