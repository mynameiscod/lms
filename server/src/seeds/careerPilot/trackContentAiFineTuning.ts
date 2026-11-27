/**
 * Career-track content: Fine-Tuning Open Models (AI_FINE_TUNING), the AI tracks, batch AI2.
 * The Generative AI Engineer's specialism: when to fine-tune at all, building and validating a chat
 * dataset, LoRA and QLoRA, a supervised fine-tuning run with Hugging Face TRL and PEFT, proving the
 * fine-tune beat a well-prompted base model, and merging, quantising and serving the result.
 * Builds on the shared AI core (batch AI1): training stages and local models (AI_LLM_INTERNALS),
 * evaluation sets and gates (AI_EVAL_SAFETY) and deployment (AI_PRODUCTION) are referred back to,
 * never re-taught. The running example is a telecom support-reply model that answers in JSON.
 * Every dataset, template, parameter-count, loss and generation output quoted was produced by running
 * the code shown on CPU with a 135M-parameter open instruct model, TRL 1.16, PEFT 0.21, transformers 5.
 * Students run the same code on a free Colab or Kaggle GPU. QLoRA (bitsandbytes needs CUDA), vLLM and
 * the Ollama adapter import were written from their documentation and not executed here.
 * No prices and no model version names. Skills: LLM_FINE_TUNING; DL_TRANSFORMERS for LORA_PEFT.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_AI_FINE_TUNING_BUNDLES: PilotBundle[] = [
  /* ── WHEN_TO_FINE_TUNE ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_FINE_TUNING_WHEN_TO_FINE_TUNE',
    notes: `In How LLMs Work you learnt that your own fine-tuning is "stage 2 again, on your data", and the rule
that facts which change belong in retrieval. This unit turns that rule into an engineering decision you
can defend in a design review, with the costs written down — because fine-tuning is the most expensive
of the three routes to build, to run and, above all, to keep alive.

## What fine-tuning actually changes

Supervised fine-tuning nudges the weights so that, given inputs like your examples, the model produces
outputs like your examples. It is very good at:

- **Format.** Always the same JSON keys, always a valid enum value, no chatty preamble — even on odd
  inputs where a prompted model drifts.
- **Tone and style.** "Apologise once, never blame the customer, under 60 words, Hinglish if they wrote
  Hinglish" is easier to show in 500 examples than to describe in a prompt.
- **A narrow skill.** Classifying a ticket into your 40 intents, extracting fields from your form, writing
  SQL for your schema — tasks where a small specialised model can match a big general one.
- **Shorter prompts.** Behaviour that lived in a 1,800-token prompt full of examples moves into the
  weights, so every call is cheaper and faster.
- **Distillation.** Using a large model's outputs (checked) to teach a small model one task, so you can
  serve the small one.

It is poor at, or simply wrong for:

- **Fresh or changing facts** — tariffs, policies, prices. Retrain every week? You cannot cite it either.
- **Access control.** A fine-tuned model cannot "only tell managers" — it knows what it knows for everyone.
- **Fixing retrieval.** If RAG fetches the wrong chunk, fine-tuning the generator does not fix it.
- **Teaching a lot of new knowledge** in a few hundred examples. It tends to learn the *style* of the
  answers and invent the content.

## The ladder: climb only when the evaluation set says so

1. **Prompt well.** A clear system prompt, a few examples, structured output with a schema, temperature 0.
2. **Add retrieval** if the gap is missing or changing knowledge.
3. **Fine-tune** if the gap is behaviour that stays stable and your eval set (the one from Evaluating and
   Guarding LLM Applications) shows prompting cannot close it — or if the prompt that closes it is too
   long, slow or costly at your volume.

Each step is judged on the same held-out evaluation set. "It feels more on-brand" is not evidence. You
should be able to say: "prompted: valid JSON 94%, intent accuracy 81%; the fine-tune must beat that".

## What each route really costs

| Cost | Prompting | RAG | Fine-tuning |
|---|---|---|---|
| Build | hours | days to weeks (ingestion, index, evaluation) | weeks: data, training, evaluation |
| Per call | prompt tokens, sometimes many | retrieval latency + context tokens | short prompt; but you may now host a GPU |
| Change | edit a prompt, re-run the eval | re-index a document | rebuild the dataset, retrain, re-evaluate |
| Hidden | none | stale index, access filters | labelling, a pinned base model, retraining when it updates |

The hidden column decides most projects. A fine-tuned adapter is tied to **one exact base model**: when
a better base model arrives, you retrain. Someone must own the dataset, the training script and the
evaluation for as long as the model is in production.

Do the break-even with your own numbers, never a blog's:

    tokens_saved_per_call  = old_prompt_tokens - new_prompt_tokens
    monthly_saving         = tokens_saved_per_call * calls_per_month * P_in / 1_000_000
    monthly_cost_of_tuning = serving_cost_per_month + (training + labelling) / months_in_service

Fill P_in from the provider's pricing page on the day you decide.

## Hosted fine-tuning or open weights?

Several API providers fine-tune their own models for you: upload JSONL, get a model id. Fast to start,
no GPUs — but the weights never leave the provider and you serve only there. **Open-weight models with
LoRA** (the rest of this topic) give you the weights: you can serve on your own hardware, keep customer
data inside India when a client's DPDP Act obligations or contract demand it, and run a small model
cheaply. You also own every operational problem.

## Signals, in one list

For fine-tuning: high-volume narrow task; a strict format the model keeps breaking; a latency budget that
needs a small model; data that must not leave your servers; a style easier to show than to describe;
at least a few hundred clean examples you can actually get.

Against: the requirement is "it should know our documents"; facts change monthly; fewer than about 100
good examples; no evaluation set yet; nobody to own retraining.

## You can combine them

The common production shape is **RAG plus a fine-tuned generator**: retrieval supplies the facts, and the
fine-tune teaches the model to use retrieved context *your* way — cite the clause id, answer in your JSON,
say "not in the policy" when the context is silent. You train it on examples that include retrieved
passages in the prompt, so it learns the behaviour, not the facts.

## Write the decision down

A short decision record saves an argument six months later: the requirement, the eval numbers for
prompting and RAG, the gap, the expected gain, the costs above, the owner, and the condition that would
make you revisit it ("if the base model's prompted accuracy reaches the fine-tune's, drop the fine-tune").`,
    workedExample: `**Situation:** a telecom operator's support team wants model-drafted replies to customer chats, in a
fixed JSON shape: \`{"intent", "reply", "escalate"}\`. About 3 lakh chats a month, in English, Hindi and
Hinglish. Agents edit the draft before sending.

**Step 1 — prompt and measure.** A system prompt with the schema, five intents and eight worked examples
(about 1,800 tokens) on a hosted model, run on a 300-chat held-out set labelled by senior agents:

    prompted, 1,800-token prompt: valid JSON 97%, intent 88%, escalate 91%, p95 latency 2.1 s

Good, but the prompt is long and the escalation misses are dangerous (a stolen-SIM chat not escalated).

**Step 2 — is it a knowledge gap?** No. Escalation rules and tone are stable behaviour; the intent list
changes perhaps twice a year. Nothing here needs fresh facts, so RAG would not help this part.

**Step 3 — break-even, with variables.** A fine-tuned model would need about 150 prompt tokens:

    tokens_saved_per_call = 1,800 - 150 = 1,650
    tokens_saved_per_month = 1,650 * 300,000 = 495,000,000
    monthly_saving = 495 * P_in              # P_in per million tokens, from the pricing page

Against it: one GPU serving an 8B-class open model with LoRA (G per month), plus about three weeks of
one engineer to label 2,000 chats, train and evaluate, plus a retrain each time the base model changes.

**Step 4 — the decision record.**

- Requirement: drafts in a fixed JSON shape, escalation recall at least 98%.
- Evidence: prompted escalation 91%; adding examples to the prompt raised it to 93% and the prompt to
  2,600 tokens.
- Decision: LoRA fine-tune of an open 7–8B instruct model on 2,000 cleaned, PII-scrubbed chats;
  self-hosted, which also keeps chat logs on the operator's servers.
- Gate: the fine-tune ships only if it beats the prompted model on the same 300 chats, escalation recall
  first.
- Revisit: if a newer hosted model reaches 98% escalation recall with a short prompt.

The fine-tune is justified by a measured gap in stable behaviour and by volume, not by a feeling.`,
    mcqs: [
      mcq('A college placement cell wants its chatbot to answer from the current year\'s placement brochure, which changes every semester. A teammate proposes a LoRA fine-tune on the brochure. What do you recommend?', [
        ['Retrieve brochure sections at run time; changing facts belong in retrieval', true],
        ['Fine-tune each semester on the new brochure so that the bot stays up to date', false],
        ['Fine-tune once on all past brochures so that the bot learns how placements work', false],
        ['Use full fine-tuning instead, since LoRA cannot store facts in its small adapters', false],
      ], 'The brochure is changing knowledge that students will want cited, so retrieval is the fit: re-index the new brochure and every answer updates. Retraining each semester is slow and still uncitable, past brochures teach stale facts, and full fine-tuning has the same knowledge problem as LoRA.'),
      mcq('Prompting already gives 96% valid JSON on a ticket-routing task, but the prompt needs 2,400 tokens of examples and the task runs 10 lakh times a month. What is the strongest case for fine-tuning here?', [
        ['Moving the examples into the weights cuts tokens and latency on every call', true],
        ['Fine-tuning will make the routing model know the latest product catalogue', false],
        ['A fine-tuned model can no longer return invalid JSON, so validation can go', false],
        ['Fine-tuning is required once a prompt exceeds the 2,000-token example limit', false],
      ], 'At this volume the repeated 2,400 prompt tokens are a real cost and latency, and a fine-tune moves that behaviour into the weights so the prompt shrinks. It does not add catalogue facts, never removes the need to validate output, and there is no 2,000-token limit on examples.'),
      mcq('Which of these is a hidden ongoing cost of a LoRA fine-tune that a prompt-only solution does not have?', [
        ['Retraining and re-evaluating when you move to a newer base model', true],
        ['Paying for the tokens of the system prompt on every single request', false],
        ['Re-indexing documents in the vector store whenever a policy changes', false],
      ], 'An adapter is tied to the exact base weights it was trained on, so upgrading the base model means retraining and re-running the evaluation. Paying for prompt tokens is the prompt-only route\'s own cost, and re-indexing is a RAG cost, not a fine-tuning one.'),
    ],
    checkpoint: [
      mcq('An HR assistant must answer only from policies the employee is allowed to see, and managers see more policies than staff. Why is fine-tuning the wrong place to put the policy content?', [
        ['Weights cannot enforce per-user access; retrieval can filter by permission', true],
        ['Fine-tuned models refuse to answer HR questions after instruction tuning', false],
        ['LoRA adapters can hold at most a few pages of policy text in their weights', false],
        ['Fine-tuning only changes tone, so the model could never learn any policy', false],
      ], 'Whatever is in the weights is available to every user of the model, so a fine-tune cannot keep manager-only policies from staff. Retrieval with a permission filter can. Fine-tuning can learn some facts, so "only tone" is wrong, and there is no page limit on adapters — the problem is control, not capacity.'),
      mcq('Your team has 60 labelled support replies and no evaluation set, and a manager asks for a fine-tune next week. What is the right first step?', [
        ['Build a held-out evaluation set and measure a well-prompted base model', true],
        ['Generate 5,000 synthetic replies from the 60 and fine-tune on all of them', false],
        ['Fine-tune on the 60 replies now and judge the result by reading a few outputs', false],
        ['Switch to full fine-tuning, which needs fewer examples than LoRA to work', false],
      ], 'Without an evaluation set nobody can tell whether a fine-tune helps, and the prompted baseline may already be good enough. Multiplying 60 examples synthetically copies their gaps, reading a few outputs is not evidence, and full fine-tuning does not need fewer examples.'),
      mcq('A bank needs a model that classifies complaint emails into 35 categories, must run inside its own data centre, and handles 20 lakh emails a month. Which route fits best?', [
        ['LoRA fine-tune a small open model on labelled emails and serve it in-house', true],
        ['A hosted provider\'s fine-tuning API, since the bank needs the highest volume', false],
        ['RAG over the category descriptions, so the model looks up each category', false],
        ['A long few-shot prompt on a large hosted model with 35 examples per call', false],
      ], 'A stable, narrow, high-volume task with data that must stay in-house suits a small open model fine-tuned with LoRA and served on the bank\'s own hardware. A hosted fine-tune keeps the data and model at the provider, retrieval does not teach classification behaviour, and a long hosted prompt fails both the cost and the data-location requirement.'),
    ],
  },

  /* ── DATASETS ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_FINE_TUNING_DATASETS',
    notes: `A fine-tune is its dataset. The trainer, LoRA settings and GPU matter far less than whether every
example shows exactly the behaviour you want. This unit builds the telecom support dataset used for the
rest of the topic, and the validation code that keeps rubbish out of it.

## Formats a trainer understands

Hugging Face TRL's \`SFTTrainer\` (next units) accepts two shapes per JSONL line:

    # conversational ("messages") — what you want for chat models
    {"messages": [{"role": "system", "content": "..."},
                  {"role": "user", "content": "Recharge 299 not done, UPI shows success"},
                  {"role": "assistant", "content": "{\\"intent\\": \\"recharge_failed\\", ...}"}]}

    # prompt-completion — fine for single-turn tasks
    {"prompt": [{"role": "user", "content": "..."}], "completion": [{"role": "assistant", "content": "..."}]}

Older tutorials use Alpaca-style \`instruction / input / output\` fields; convert them to messages. Keep
the **system prompt you will use in production** in every training example, word for word. The model
learns the behaviour *in that context*; a different system prompt at serving time is a different input.

## Chat templates: what the model actually sees

A chat model was instruction-tuned with special turn markers. \`apply_chat_template\` turns your messages
into exactly that string. For the 135M open instruct model used here:

    from transformers import AutoTokenizer
    tok = AutoTokenizer.from_pretrained("HuggingFaceTB/SmolLM2-135M-Instruct")
    print(tok.apply_chat_template(row["messages"], tokenize=False))

printed:

    <|im_start|>system
    You are the support assistant for a mobile network. Reply only with JSON: {"intent": ..., "reply": ..., "escalate": true|false}.<|im_end|>
    <|im_start|>user
    Why is my bill Rs 199 higher than my plan<|im_end|>
    <|im_start|>assistant
    {"intent": "bill_dispute", "reply": "Sorry about the confusion. ...", "escalate": true}<|im_end|>

Three things to check every time:

- **The end-of-turn token** (\`<|im_end|>\` here, which is also the tokenizer's \`eos_token\`) is at the end
  of the assistant turn. If it is missing, the fine-tuned model never learns to stop.
- **Default system prompts.** With no system message, this template silently inserted "You are a helpful
  AI assistant named SmolLM, trained by Hugging Face". Train and serve with the same explicit system turn.
- **At inference**, pass the conversation *without* the answer and \`add_generation_prompt=True\`, which
  ends the string with \`<|im_start|>assistant\` so the model writes the reply.

One version trap, met for real: in transformers 5, \`apply_chat_template(..., tokenize=True)\` returns a
dict-like \`BatchEncoding\`, so \`len()\` of it is 2 (its keys), not the token count. Count with
\`len(tok.apply_chat_template(msgs, tokenize=True)["input_ids"])\`. Our examples were 107–135 tokens,
mean 122 — use this to set \`max_length\` so nothing is silently truncated.

## How many examples?

- **Format and tone:** a few hundred good examples often suffice.
- **A narrow skill** (intent classification, extraction): 1,000–5,000, covering every class and the
  awkward inputs (Hinglish, typos, two problems in one message).
- **Quality beats quantity.** 500 examples agents agree with outperform 5,000 scraped chats where half
  the replies are wrong. The model copies mistakes as faithfully as good answers.

## Validate, then de-duplicate

Every row passes code checks before it reaches a trainer:

    INTENTS = {"recharge_failed", "no_network", "port_out", "bill_dispute", "sim_block"}

    def problems(row):
        msgs = row.get("messages")
        if not isinstance(msgs, list) or not msgs:
            return ["no messages"]
        errs, roles = [], [m.get("role") for m in msgs]
        if roles[-1] != "assistant": errs.append("last turn is not assistant")
        if roles[0] != "system":     errs.append("no system turn")
        if roles[-1] == "assistant":
            try:
                out = json.loads(msgs[-1]["content"])
                if out.get("intent") not in INTENTS: errs.append(f"unknown intent {out.get('intent')!r}")
                if not isinstance(out.get("escalate"), bool): errs.append("escalate is not a bool")
            except json.JSONDecodeError:
                errs.append("assistant reply is not JSON")
        return errs

    def key(row):   # duplicate = same user text after normalising case and spaces
        user = " | ".join(re.sub(r"\\s+", " ", m["content"].strip().lower())
                          for m in row["messages"] if m["role"] == "user")
        return hashlib.sha256(user.encode()).hexdigest()

On 65 raw rows (generated from templates, plus five planted bad rows) it printed:

    read 65 kept 52
      dropped 10: duplicate
      dropped 1: no system turn
      dropped 1: assistant reply is not JSON
      dropped 1: unknown intent 'billing'
      dropped 1: escalate is not a bool
      dropped 1: last turn is not assistant

Ten duplicates from 65 rows — templated and synthetic data repeats itself far more than you expect.
Duplicates make the model over-weight some examples and, worse, leak into your test set. For real chat
logs add **near-duplicate** detection (embeddings with a similarity threshold, as in the RAG topic).

## Split without leaking

Stratify by class so every intent is in the test set, then check that no test input appears in train:

    train 42 test 10
    Counter({'bill_dispute': 10, 'recharge_failed': 10, 'no_network': 9, 'sim_block': 7, 'port_out': 6})
    test rows also in train: 0

Zero exact leaks is necessary, not sufficient. Our rows came from shared templates, so "bill me 199
extra laga hai" in test has a sibling "bill me 299 extra laga hai" in train — the test set flatters the
model. For a real project split **by source**: by customer, by week, or by template, so the test set is
genuinely unseen. Also note the imbalance (6 port-out against 10 billing); fix it with more real
examples, not by copying.

## Synthetic data, and its risks

Generating examples with a strong model is normal practice, especially for rare cases. Treat it as a
draft: errors in the generator's answers become your model's habits; outputs are repetitive (dedupe!);
it smooths away the messy Hinglish real customers write; and the provider's terms may restrict using its
outputs to train other models — read them. Have humans review a sample, mix synthetic with real data,
and keep a \`source\` field on every row so you can measure each slice separately.

## Privacy before training

Real chat logs contain phone numbers, Aadhaar and account numbers. Run the PII redaction you built in the
evaluation topic **before** data enters the training set: a model can memorise and repeat training data,
and under the DPDP Act you need a lawful purpose for using customers' chats to train at all.`,
    workedExample: `**Task:** turn 18 months of exported support chats (a CSV of 2.4 lakh conversations with agent replies
and a resolved-intent column) into a training set for the JSON support-reply model.

**Step 1 — select.** Keep only chats where the agent reply got a positive CSAT rating and the intent is
one of the five in scope. Drop chats over 6 turns (the task is first-reply drafting). That leaves about
31,000.

**Step 2 — convert.** For each chat build one row: the production system prompt, the customer's first
message, and the target \`{"intent", "reply", "escalate"}\`, where \`escalate\` comes from whether the chat
was transferred and \`reply\` is the agent's first reply.

**Step 3 — scrub.** Run the redaction functions on the user and assistant text, replacing phone numbers,
Aadhaar-like numbers and account ids with placeholders such as \`<PHONE>\`. Count replacements per field;
spot-check 50 rows by hand.

**Step 4 — validate and dedupe.** Run \`problems()\` and the normalised-text \`key()\` from the notes. Then
near-duplicates: embed the user messages and drop any pair above a similarity threshold you chose on 200
labelled pairs. Typical result on chat logs: 15–30% removed.

**Step 5 — balance and cap.** Port-out chats are 40% of the data because of one network outage week;
cap each intent at 1,500 so the model does not learn "everything is port-out", and keep 300 sim-block
chats even though they are rare, because missing one is the costliest error.

**Step 6 — split by time.** Train on months 1–15, validate on month 16, test on months 17–18. A random
split would put the same outage week in train and test and flatter the model.

**Step 7 — record it.** A \`DATASET.md\` with the source export date, every filter and its row counts,
the redaction rules, the split dates and the hash of each JSONL file. When the model misbehaves in three
months, this file is the first thing you will open.

**Result:** about 6,500 train, 500 validation and 600 test rows, every one valid, scrubbed and traceable.`,
    mcqs: [
      mcq('A fine-tuned support model keeps generating text after its JSON, inventing a second customer turn. What is the most likely dataset problem?', [
        ['The training rows lack the end-of-turn token after the assistant reply', true],
        ['The training rows include a system prompt, which confuses the model', false],
        ['The dataset uses the messages format instead of prompt and completion', false],
        ['The JSON replies in the training rows were too short to learn stopping', false],
      ], 'The model learns when to stop from the end-of-turn token at the end of each assistant turn; if the template or the data drops it, generation runs on into an invented next turn. A system prompt is expected, the messages format is the recommended one, and reply length does not teach stopping.'),
      mcq('Your validator reports 0 exact overlaps between train and test, but test accuracy is 99% while real traffic gives 80%. What is the likeliest explanation?', [
        ['Near-identical template siblings sit in both splits, so the test set is not unseen', true],
        ['The test set is too small, so accuracy always comes out higher than on traffic', false],
        ['Exact-overlap checks are unreliable because hashing loses part of the text', false],
        ['Real traffic is always 20 points worse than any test set, so this is normal', false],
      ], 'Rows built from the same template with a different amount or city are not exact duplicates, yet the model has effectively seen them, so the test score is inflated. Splitting by source or template fixes it. A small test set adds noise in both directions, hashing normalised text is reliable, and there is no fixed gap to expect.'),
      mcq('You train with no system message and serve with the production system prompt. The fine-tune performs worse than in testing. Why?', [
        ['The template added a default system prompt in training, so serving differs', true],
        ['Fine-tuned models ignore system prompts, so the serving prompt confuses them', false],
        ['The production system prompt uses up the context the model needs for output', false],
      ], 'Chat templates can insert a default system prompt when none is given, so the model learnt its behaviour after a different system turn from the one it sees in production. Train and serve with the same explicit system prompt. Fine-tuned models do read system prompts, and a short system prompt does not exhaust the context.'),
    ],
    checkpoint: [
      mcq('In transformers 5, \`len(tok.apply_chat_template(msgs, tokenize=True))\` returns 2 for every example. What is going on?', [
        ['It returns a BatchEncoding, so len counts keys; use ["input_ids"]', true],
        ['The template failed and returned only the two special tokens it adds', false],
        ['The messages list has two entries, and the function returns one per message', false],
        ['The tokenizer is in batch mode, so it reports the batch size of two', false],
      ], 'With tokenize=True the call returns a dict-like BatchEncoding with input_ids and attention_mask, so len gives 2. Index input_ids to get the token count. The template did not fail, and the result is neither per-message nor a batch size.'),
      mcq('Chat exports for a fine-tune contain customers\' phone numbers and account ids. When should redaction happen?', [
        ['Before the data enters the training set, since models can memorise it', true],
        ['After training, by filtering the fine-tuned model\'s outputs for numbers', false],
        ['Only on the test split, since that is the part that people will read', false],
        ['It is not needed when the model is served only to internal agents', false],
      ], 'A model can memorise and reproduce training data, and using personal data to train needs care under the DPDP Act, so it must be scrubbed before training. Output filtering is a weak second line, redacting only test data leaves train exposed, and internal users are still the wrong audience for another customer\'s data.'),
      mcq('A dataset has 4,000 billing rows and 150 stolen-SIM rows, and missing a stolen-SIM escalation is the costliest error. What is the best fix?', [
        ['Collect and review more real stolen-SIM chats and cap the billing rows', true],
        ['Copy each stolen-SIM row twenty times until both classes are the same size', false],
        ['Delete the stolen-SIM class and handle those chats with keyword rules only', false],
        ['Train for more epochs, so the model eventually learns the rare class too', false],
      ], 'More real examples of the rare, costly class plus a cap on the dominant one improves balance without teaching the model to parrot a few rows. Copying rows twenty times invites memorisation, dropping the class gives up on the most important case, and extra epochs mostly overfit what is already common.'),
    ],
  },

  /* ── LORA_PEFT ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_FINE_TUNING_LORA_PEFT',
    notes: `You know from the transformer unit that a model is mostly big weight matrices — the attention
projections and the MLP layers in every block. Fine-tuning changes those matrices. The question for an
engineer is how many of their numbers you must change, and what that costs in GPU memory.

## Why full fine-tuning is rarely the answer

Full fine-tuning updates every weight. With the Adam optimiser in mixed precision, each parameter needs
roughly: 2 bytes (16-bit weight) + 2 (gradient) + 4 (fp32 master copy) + 8 (two Adam moments) ≈ **16
bytes**, before activations. A 7B model: 7 × 16 = about **112 GB** — several data-centre GPUs. And every
fine-tune produces a full 14 GB copy of the model to store and serve.

## LoRA: learn a small correction

LoRA (low-rank adaptation) freezes the original weight W (shape d_out × d_in) and learns a correction as
the product of two thin matrices:

    W' = W + (alpha / r) * B @ A        A: r x d_in,  B: d_out x r,  r is small (8, 16, 32)

- **A** starts random and **B** starts at zero, so at step 0 the model is exactly the base model.
- Only A and B are trained: r × (d_in + d_out) numbers per adapted matrix instead of d_in × d_out.
- **alpha / r** scales the update. People set alpha = r or alpha = 2r and leave it; if you change r,
  scaling keeps the update size comparable.
- The bet: the change a task needs has low "rank" — a few directions, not a whole new matrix. For format,
  tone and narrow skills this holds remarkably well.

## Counting parameters — by hand and by PEFT

The 135M model used in this topic is a Llama-style decoder: 30 layers, hidden size 576, 9 query heads
but only 3 key/value heads (grouped-query attention), MLP width 1536. So \`q_proj\` is 576 × 576 but
\`k_proj\` and \`v_proj\` are 192 × 576. The linear layer names, read from the model:

    ['down_proj', 'gate_proj', 'k_proj', 'lm_head', 'o_proj', 'q_proj', 'up_proj', 'v_proj']

By hand for r = 8 on q_proj and v_proj: 8 × (576 + 576) + 8 × (576 + 192) = 9,216 + 6,144 = 15,360 per
layer × 30 layers = **460,800**. PEFT agrees:

    from peft import LoraConfig, get_peft_model
    cfg = LoraConfig(r=8, lora_alpha=16, lora_dropout=0.05,
                     target_modules=["q_proj", "v_proj"], task_type="CAUSAL_LM")
    model = get_peft_model(base, cfg)
    model.print_trainable_parameters()

    r=8,  q,v:            trainable params: 460,800 || all params: 134,975,808 || trainable%: 0.3414
    r=16, q,k,v,o:        trainable params: 1,843,200 || all params: 136,358,208 || trainable%: 1.3517
    r=16, "all-linear":   trainable params: 4,884,480 || all params: 139,399,488 || trainable%: 3.5039

Even the widest setting trains 3.5% of the numbers. The memory win is bigger than that percentage
suggests: gradients and Adam states exist only for the adapter, so on a 7B model the frozen 16-bit
weights (about 14 GB) dominate and the adapter's optimiser state is a few hundred MB.

## Choosing the settings

- **target_modules.** \`"all-linear"\` (every linear layer except the output head) is the safe modern
  default and usually beats attention-only. Use \`["q_proj","v_proj"]\` only when memory is tight.
  Module names differ between architectures — print them, as above, rather than copying a tutorial.
- **r.** Start at 16. Format and tone rarely need more; a harder skill on more data may gain from 32–64.
  Raising r is cheap to try; measure, do not assume bigger is better.
- **lora_alpha.** 2 × r (or r). Treat alpha and the learning rate as one knob.
- **lora_dropout.** 0.05–0.1 on small datasets; 0 is fine on large ones.
- **task_type="CAUSAL_LM"** for decoder chat models.

## QLoRA: a frozen 4-bit base

QLoRA loads the frozen base weights in **4-bit** (the NF4 format) and trains 16-bit LoRA adapters on top;
the weights are de-quantised on the fly for each matrix multiply. A 7B model's weights fall from about
14 GB to about 4 GB, so a 7–8B model fine-tunes on one free 16 GB notebook GPU. It needs the
\`bitsandbytes\` library and a CUDA GPU (this part was not run on CPU here):

    import torch
    from transformers import AutoModelForCausalLM, BitsAndBytesConfig
    from peft import prepare_model_for_kbit_training

    bnb = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4",
                             bnb_4bit_use_double_quant=True,
                             bnb_4bit_compute_dtype=torch.float16)   # bfloat16 on newer GPUs
    model = AutoModelForCausalLM.from_pretrained(model_id, quantization_config=bnb, device_map="auto")
    model = prepare_model_for_kbit_training(model)   # gradient checkpointing, stable norms

Costs: training is slower (the de-quantising), and quality is usually close to 16-bit LoRA but not
always identical — evaluate. Remember the adapter was trained against a 4-bit base: merging it into a
16-bit base later is common and generally fine, but re-run your evaluation on exactly what you serve.

## Rough GPU budgets (weights plus adapter, short sequences)

| Model size | LoRA, 16-bit base | QLoRA, 4-bit base |
|---|---|---|
| 0.5–1.5B | 4–8 GB | 2–4 GB |
| 7–8B | about 18–24 GB | about 8–12 GB |
| 13–14B | about 32–40 GB | about 12–18 GB |

Longer sequences and bigger batches add activation memory; **gradient checkpointing** trades about 20–30%
more time for much less of it.

## The PEFT family, briefly

LoRA dominates. You will also see **DoRA** (\`use_dora=True\` in LoraConfig — splits magnitude and direction,
sometimes better at low rank), and prompt or prefix tuning (learn a few virtual tokens; cheap but weaker).
An adapter file is small — a few MB — so you can keep one per customer or task over one shared base model,
which is exactly what the serving unit exploits.`,
    workedExample: `**Situation:** you must fine-tune an open 8B instruct model for the support-reply task. The only GPU is a
free notebook GPU with 16 GB of memory. Sequences are up to 512 tokens.

**Step 1 — rule out full fine-tuning.** 8B × 16 bytes ≈ 128 GB. Impossible.

**Step 2 — try 16-bit LoRA on paper.** Frozen weights 8B × 2 bytes = 16 GB — already the whole card
before activations, adapter and CUDA overhead. Will not fit.

**Step 3 — QLoRA.** 4-bit weights ≈ 8B × 0.5 bytes = 4 GB, plus quantisation constants, call it 5 GB.

**Step 4 — size the adapter.** An 8B Llama-style model has 32 layers, hidden 4096, k/v projections
4096 → 1024 and MLP width 14336. With r = 16 on all linear layers, per layer:

    q, o:            2 × 16 × (4096 + 4096)   = 262,144
    k, v:            2 × 16 × (4096 + 1024)   = 163,840
    gate, up:        2 × 16 × (4096 + 14336)  = 589,824
    down:            1 × 16 × (14336 + 4096)  = 294,912
    per layer total                            = 1,310,720
    × 32 layers                                ≈ 42 million parameters

In 16-bit weights plus 32-bit gradients and Adam moments (about 14 bytes each) that is roughly 0.6 GB.

**Step 5 — activations.** Batch size 4 at 512 tokens with gradient checkpointing fits in the remaining
~10 GB; without checkpointing it may not. Use \`per_device_train_batch_size=2\`,
\`gradient_accumulation_steps=8\` (effective batch 16) and checkpointing on.

**Step 6 — what to check in the run.** \`print_trainable_parameters()\` should report about 42M trainable
(roughly 0.5% of the total); \`torch.cuda.max_memory_allocated()\` after the first 10 steps tells you the
real peak. If you run out of memory, cut the batch size first, then the sequence length, then r.

**Decision:** QLoRA, r = 16, alpha = 32, all-linear, dropout 0.05, compute dtype float16 on this GPU.`,
    mcqs: [
      mcq('In LoRA, why is the B matrix initialised to zero?', [
        ['So that at step 0 the adapted model gives exactly the base model\'s outputs', true],
        ['So that the adapter uses no GPU memory until training has really started', false],
        ['So that the learning rate can be raised without the loss diverging later', false],
        ['So that the adapter can be merged into the base model without any rounding', false],
      ], 'With B at zero the product B @ A is zero, so training starts from the base model\'s behaviour and moves away only as far as the data pushes it. Zeros still occupy memory, initialisation does not license a higher learning rate, and merging precision is unrelated.'),
      mcq('A model has 24 layers. You apply r = 8 LoRA to q_proj (1024 × 1024) and v_proj (256 × 1024, out × in) in every layer. How many trainable parameters is that?', [
        ['24 × 8 × (2048 + 1280) = 638,976', true],
        ['24 × 8 × (1024 + 1024) = 393,216', false],
        ['24 × (1024 × 1024 + 256 × 1024) = 31,457,280', false],
        ['8 × (2048 + 1280) = 26,624', false],
      ], 'Each adapted matrix adds r × (d_in + d_out): 8 × 2048 for q and 8 × 1280 for v, per layer, times 24 layers. The second option forgets v_proj, the third counts the full frozen matrices that LoRA does not train, and the last counts only one layer.'),
      mcq('Your team copies a tutorial\'s target_modules=["query", "value"] onto a Llama-style model and PEFT raises an error that the target modules were not found. What is the right fix?', [
        ['Print the model\'s linear layer names and target those, or use "all-linear"', true],
        ['Downgrade PEFT, since newer versions renamed the attention modules', false],
        ['Pass task_type="SEQ_CLS" so that PEFT searches the classifier modules', false],
        ['Set r higher, because small ranks cannot attach to the attention layers', false],
      ], 'Module names depend on the architecture: BERT-style models use query and value, Llama-style models q_proj and v_proj. Listing the model\'s own Linear modules, or using "all-linear", fixes it. The PEFT version, the task type and the rank are not the cause.'),
    ],
    checkpoint: [
      ck('DL_TRANSFORMERS', 'A model uses grouped-query attention with 32 query heads and 8 key/value heads, hidden size 4096 and head size 128. What shape is k_proj (out × in)?', [
        ['1024 × 4096, because only 8 heads of 128 are projected for keys', true],
        ['4096 × 4096, because keys always match the hidden size of the model', false],
        ['4096 × 1024, because keys are projected down from a smaller input', false],
        ['128 × 4096, because one key head is shared by every query head', false],
      ], 'Keys and values are projected for the key/value heads only: 8 × 128 = 1024 outputs from the 4096-wide hidden state. Full 4096 outputs would be ordinary multi-head attention, the input side is the hidden size not 1024, and there are 8 key heads, not 1.'),
      ck('DL_TRANSFORMERS', 'Why does LoRA with about 1% trainable parameters cut fine-tuning memory far more than 1% of the saving might suggest?', [
        ['Gradients and optimiser states exist only for the small adapter matrices', true],
        ['The frozen base weights are deleted from GPU memory once training starts', false],
        ['LoRA trains with shorter sequences, so the activations become very small', false],
        ['LoRA skips the backward pass through the frozen layers of the network', false],
      ], 'In full fine-tuning gradients, master weights and Adam moments take about 14 of the 16 bytes per parameter; with LoRA they exist only for the adapter, leaving mostly the frozen 16-bit weights. The base weights stay in memory, sequence length is unchanged, and the backward pass still runs through frozen layers to reach the adapters.'),
      ck('LLM_FINE_TUNING', 'A team must fine-tune a 13B model on one 24 GB GPU. Which plan is realistic?', [
        ['QLoRA with a 4-bit base, gradient checkpointing and a small per-device batch', true],
        ['16-bit LoRA with batch size 1, since LoRA trains only a few million parameters', false],
        ['Full fine-tuning with gradient accumulation to save memory between steps', false],
        ['LoRA on the output head only, which keeps the 13B body out of GPU memory', false],
      ], 'A 13B model in 16-bit needs about 26 GB for weights alone, so only a 4-bit base fits on 24 GB, with checkpointing and a small batch for activations. Gradient accumulation does not shrink weights or optimiser state, and adapting only the head still requires the whole body in memory for the forward pass.'),
    ],
  },

  /* ── TRAINING_RUN ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_FINE_TUNING_TRAINING_RUN',
    notes: `Time to train. Everything below was run end to end on a laptop CPU with the 135M-parameter open
instruct model and the 42-row support dataset from the datasets unit. That is a **smoke test**: it proves the
code, the masking and the numbers. You will do the real run on a free GPU notebook (Colab or Kaggle) with
the same script and a bigger model — on a GPU the run below takes well under a minute; on the CPU it took
23 minutes.

## The script

    from datasets import load_dataset
    from peft import LoraConfig
    from trl import SFTConfig, SFTTrainer

    MODEL = "HuggingFaceTB/SmolLM2-135M-Instruct"
    data = load_dataset("json", data_files={"train": "train.jsonl", "test": "test.jsonl"})
    # train on the reply only: prompt = system + user turns, completion = the assistant turn
    data = data.map(lambda r: {"prompt": r["messages"][:-1], "completion": r["messages"][-1:]},
                    remove_columns=["messages"])

    peft_config = LoraConfig(r=16, lora_alpha=32, lora_dropout=0.05,
                             target_modules="all-linear", task_type="CAUSAL_LM")
    args = SFTConfig(
        output_dir="out/support-lora",
        num_train_epochs=3,
        per_device_train_batch_size=4,
        gradient_accumulation_steps=2,      # effective batch 8
        learning_rate=2e-4,
        lr_scheduler_type="cosine",
        warmup_steps=0.1,                   # a float below 1 = a fraction of all steps
        max_length=512,
        logging_steps=2,
        eval_strategy="epoch",
        save_strategy="no",
        report_to="none",
        seed=42,
        bf16=False,                         # CPU; on a GPU see below
    )
    trainer = SFTTrainer(model=MODEL, args=args, train_dataset=data["train"],
                         eval_dataset=data["test"], peft_config=peft_config)
    trainer.train()
    trainer.save_model("out/support-lora/final")      # saves the adapter only

\`SFTTrainer\` loads the model from its id, applies the chat template, tokenises, masks the prompt, wraps the
model with the LoRA config and trains. Because the dataset is tiny, the 10 held-out rows doubled as the
evaluation set during training; in a real project keep three splits — train, **validation** (watched during
training) and **test** (touched once, at the end).

## Two version notes, met for real

- transformers 5 removed \`warmup_ratio\`; \`warmup_steps\` takes a fraction. Old tutorials fail with
  \`unexpected keyword argument 'warmup_ratio'\`.
- TRL defaults to \`bf16=True\`. On a CPU, and on the older 16 GB GPU most free notebooks hand out, set
  \`bf16=False\`; on that GPU add \`fp16=True\`. Newer GPUs keep bf16.

## Check before you spend GPU time

    trainer.model.print_trainable_parameters()
    batch = next(iter(trainer.get_train_dataloader()))
    labels = batch["labels"][0]
    print("label tokens counted in loss:", int((labels != -100).sum()), "of", int(batch["attention_mask"][0].sum()))

printed:

    trainable params: 4,884,480 || all params: 139,399,488 || trainable%: 3.5039
    label tokens counted in loss: 51 of 113

51 of 113 means only the JSON reply (and its end token) is a target. With the plain messages format it was
113 of 113 — the debugging unit shows why that matters.

## What the run printed

Three epochs = 18 optimiser steps (42 rows, batch 4, accumulation 2). Selected log lines:

    step  2  loss 2.569  mean_token_accuracy 0.474
    step  6  loss 2.314                          eval_loss 2.262
    step 12  loss 2.012                          eval_loss 2.015
    step 18  loss 1.883  mean_token_accuracy 0.569  eval_loss 1.960

Both losses fell — training works — but they are still high. The model's answer to a held-out Hinglish
billing complaint shows what "still high" means:

    {"intent": "199", "reply": "Kyun, you're a total idiot. You're going to get a 199 extra laga, ...

Valid-looking JSON with an invented intent and an insulting reply. **Format is learnt first, content
later** — and you must read outputs, not just losses, before anyone else sees a model.

The same script with \`num_train_epochs=10\` (60 steps, 42 minutes on the CPU) gave this validation curve:

    epoch       1     2     3     4     5     6     7     8     9     10
    eval_loss 2.386 2.000 1.635 1.319 1.048 0.834 0.673 0.585 0.547 0.541

with the final training loss at 0.318 and token accuracy 0.91 on train against 0.84 on validation. The next
unit evaluates both adapters properly.

## Reading loss curves

- **Both falling:** keep going, or you stopped too early (our 3-epoch run).
- **Both flat and high:** the learning rate is too low, the masking is wrong, or the task is beyond the model.
- **Training falling, validation rising:** overfitting — memorising. Keep the checkpoint with the lowest
  validation loss and train less.
- **Validation flattening** (epochs 8–10 above): further epochs buy little; stop.
- **Spiky:** small batches. Raise gradient accumulation or lower the learning rate.
- **Validation suspiciously close to training:** your validation rows may be siblings of training rows (ours
  came from shared templates, so this curve flatters the model).

Loss is a training signal. Whether the model is *better* is decided by task metrics in the next unit.

## Settings that matter, with sane starting points

- **learning_rate:** 1e-4 to 2e-4 for LoRA (full fine-tuning uses about 1e-5).
- **epochs:** 1–3 on thousands of examples. We needed 10 only because we had 42 rows — a warning sign in
  itself.
- **effective batch:** 8–32, via \`per_device_train_batch_size\` × \`gradient_accumulation_steps\`.
- **max_length:** above your longest example (we measured 135 tokens); anything longer is truncated.
- **gradient_checkpointing=True:** much less activation memory for about 20–30% more time.
- **keeping the best:** \`save_strategy="epoch"\`, \`eval_strategy="epoch"\`, \`load_best_model_at_end=True\`,
  \`metric_for_best_model="eval_loss"\`, \`save_total_limit=2\`.
- **packing=True** fits several short examples into one sequence for speed; check your TRL version handles
  the boundaries between examples before relying on it.

## Running it on a free GPU notebook

1. Colab: Runtime → Change runtime type → a GPU. Kaggle: Settings → Accelerator → a GPU (weekly quota).
2. \`pip install -U transformers trl peft datasets accelerate\` (add \`bitsandbytes\` for QLoRA), then
   print the versions and pin them in your project.
3. Upload \`train.jsonl\` and \`val.jsonl\`; for gated models, \`huggingface-cli login\` with a read token.
4. Swap in a 0.5–2B instruct model id, set \`fp16=True, bf16=False\` on the older GPU, and train.
5. Sessions die without warning: save the adapter to Drive or push it with
   \`trainer.push_to_hub()\` to a **private** repository — your data shaped it.`,
    workedExample: `**Task:** decide what to do with the 10-epoch run, using only what it logged.

**Step 1 — lay out the curves.** From \`trainer.state.log_history\`:

    epoch   train_loss  eval_loss  eval_token_acc
    1        2.462       2.386      0.537
    3        1.654       1.635      0.670
    5        0.997       1.048      0.756
    7        0.413       0.673      0.797
    8        0.491       0.585      0.828
    10       0.318       0.541      0.841

**Step 2 — find the shape.** Validation loss falls every epoch but by less each time: 0.088, 0.038 and
0.006 over the last three. Training loss is now well below validation loss (0.32 against 0.54), and the gap
has widened since epoch 5. That is the start of memorisation, but not yet overfitting — validation has not
turned upwards.

**Step 3 — question the validation set.** These 10 rows came from the same templates as the training rows,
so a falling validation loss partly measures "remembers the template". On a by-source split the curve
would likely flatten sooner. This alone would make me distrust "best epoch = 10".

**Step 4 — question the data size.** Ten epochs over 42 rows is 420 passes over examples. The real fix is
more, more varied data — hundreds of real chats — after which 2–3 epochs would be normal.

**Step 5 — decide.** Keep both the 3-epoch and 10-epoch adapters and let task metrics choose (next unit).
For the real run on a GPU: \`save_strategy="epoch"\`, \`load_best_model_at_end=True\`, a by-source
validation split, 3 epochs on a few hundred rows, and the same masking check.

**Step 6 — record it.** Commit the curve, the config and the library versions next to the adapter. A
training run you cannot reproduce is a demo, not a model.`,
    mcqs: [
      mcq('You copy an SFT script from a 2024 tutorial and get "unexpected keyword argument \'warmup_ratio\'" on transformers 5. What is the correct change?', [
        ['Pass the fraction to warmup_steps, e.g. warmup_steps=0.1', true],
        ['Delete warm-up, since transformers 5 no longer supports any', false],
        ['Pass warmup_ratio to the LoraConfig instead of the SFTConfig', false],
        ['Pin transformers to 2.x, where warmup_ratio was first defined', false],
      ], 'In transformers 5 warmup_steps accepts either a step count or a float below 1 meaning a fraction of all steps, which replaces warmup_ratio. Warm-up still exists, LoraConfig has no warm-up setting, and pinning an ancient version would break TRL and PEFT.'),
      mcq('After 3 epochs on 42 rows, the loss has fallen from 2.57 to 1.88 and the model outputs valid-looking JSON with an invented intent and a rude reply. What is the best reading?', [
        ['It has learnt the format but not yet the content; it needs more training', true],
        ['It is overfitted, since a loss under 2 on so few rows means memorising', false],
        ['The masking is wrong, since a masked model would never produce rude text', false],
        ['The base model is broken, since fine-tuning cannot produce invalid content', false],
      ], 'Both losses were still high and falling, and the output shows the structure learnt before the content — typical of an undertrained run. Overfitting would show validation loss rising, masking was verified (51 of 113 tokens), and fine-tuning can certainly produce wrong content.'),
      mcq('Which settings make a run keep the checkpoint with the lowest validation loss rather than the last one?', [
        ['Matching eval and save strategies with load_best_model_at_end=True', true],
        ['save_strategy="no" with eval_strategy="epoch" and a cosine schedule', false],
        ['save_total_limit=1, which deletes all checkpoints except the best one', false],
        ['metric_for_best_model="loss" with no evaluation dataset passed in', false],
      ], 'The trainer can reload the best checkpoint only if it evaluates and saves at the same points and is told to load the best at the end. Saving nothing keeps only the final weights, save_total_limit keeps the most recent rather than the best on its own, and without an evaluation set there is no validation loss to compare.'),
    ],
    checkpoint: [
      mcq('A run on one GPU uses per_device_train_batch_size=2 and gradient_accumulation_steps=8 over 3,200 rows for 2 epochs. How many optimiser steps does it take?', [
        ['400, because each step uses 16 rows and there are 6,400 row passes', true],
        ['3,200, because each step uses 2 rows and there are 6,400 row passes', false],
        ['200, because each step uses 16 rows and the epochs do not add steps', false],
        ['800, because each step uses 8 rows and there are 6,400 row passes', false],
      ], 'Effective batch = 2 × 8 = 16 rows per optimiser step; 2 epochs × 3,200 rows = 6,400 row passes; 6,400 / 16 = 400. 3,200 counts micro-batches, 200 forgets the second epoch, and 800 ignores the per-device batch of 2.'),
      mcq('Training and validation loss both stay flat near their starting values for two epochs. What should you check first?', [
        ['Whether the loss masks everything or the learning rate is far too low', true],
        ['Whether the model is overfitting and needs fewer epochs to generalise', false],
        ['Whether the validation set leaks into the training set through templates', false],
        ['Whether the adapter rank is too high and is slowing the learning down', false],
      ], 'Flat curves mean nothing is being learnt: typically all labels are masked, the learning rate is tiny, or nothing trainable is attached. Overfitting and leakage both show falling training loss, and a higher rank does not stop learning.'),
      mcq('On a free notebook GPU you train for two hours and the session disconnects before the end. What practice prevents losing the run?', [
        ['Saving checkpoints each epoch to Drive or a private Hub repository', true],
        ['Raising the batch size so that the run finishes before a disconnect', false],
        ['Setting save_strategy="no" so that saving does not slow the run down', false],
        ['Training on the CPU runtime, which notebooks never disconnect from', false],
      ], 'Free sessions end without warning, so checkpoints must go somewhere that outlives the session, such as Drive or a private Hub repository, and training can resume from them. A larger batch may not fit and does not stop disconnects, not saving loses everything, and CPU sessions also time out.'),
    ],
  },

  /* ── EVALUATE_FINE_TUNE ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_FINE_TUNING_EVALUATE_FINE_TUNE',
    notes: `A fine-tune has to earn its keep against the cheapest alternative that could do the job: the same
base model, well prompted. You built evaluation sets, runners and gates in Evaluating and Guarding LLM
Applications; here you point them at a fine-tune and add the two checks fine-tuning specifically needs —
a fair baseline and a forgetting check.

## The evaluation script

Greedy decoding, the same prompt builder for every system, scored on the held-out rows:

    def generate(model, messages):
        ids = tok.apply_chat_template(messages, add_generation_prompt=True,
                                      return_tensors="pt", return_dict=True)
        with torch.no_grad():
            out = model.generate(**ids, max_new_tokens=90, do_sample=False,
                                 pad_token_id=tok.eos_token_id)
        return tok.decode(out[0][ids["input_ids"].shape[1]:], skip_special_tokens=True).strip()

    def score(model, name):
        valid = intent_ok = esc_ok = 0
        for row in test:
            want = json.loads(row["messages"][-1]["content"])
            text = generate(model, row["messages"][:-1])
            try:
                got = json.loads(text)
            except json.JSONDecodeError:
                continue
            if not isinstance(got, dict):
                continue
            valid += 1
            intent_ok += got.get("intent") == want["intent"]
            esc_ok += got.get("escalate") == want["escalate"]
        print(f"{name:10s} valid JSON {valid}/{len(test)}  intent {intent_ok}/{len(test)}  escalate {esc_ok}/{len(test)}")

    tuned = PeftModel.from_pretrained(AutoModelForCausalLM.from_pretrained(MODEL), "out/support-lora/final")

(The \`isinstance\` check was added after the first run crashed: one model replied with a bare JSON
string, which \`json.loads\` happily parsed.)

## Four systems, one test set

Run on the 10 held-out rows with the 135M model:

    system                               prompt tokens  valid JSON  intent  escalate
    base + system prompt                 ~60             0/10        0/10    0/10
    base + system prompt + 5 examples    472             9/10        3/10    5/10
    LoRA, 3 epochs                       ~60             9/10        0/10    3/10
    LoRA, 10 epochs                      ~60             10/10       3/10    7/10

What it says:

- **A zero-shot baseline is a straw man.** Without examples this small model rambled ("I am Bill, the
  local police officer…"). Five examples took it to 9/10 valid JSON. Compare against *that*.
- **The 10-epoch fine-tune matched the few-shot prompt on intent and beat it on escalation** — with a prompt
  about an eighth as long. That is the real argument for fine-tuning here: the same behaviour, cheaper.
- **The 3-epoch adapter lost to the prompt** on every metric. An undertrained fine-tune is worse than none.
- **Intent at 3/10 is unusable for everyone.** The fine-tune invented \`"bill_extra"\`, an intent that does
  not exist. Validate the enum in code and treat unknown values as "escalate", whatever the model.

## Is 7/10 really better than 5/10?

Not on 10 rows. With n = 10 a 95% interval around 70% is roughly ±28 points — the two systems overlap
completely. For decisions you want a few hundred test rows. Compare systems **paired**, on the same rows:
count the rows where A is right and B wrong, and the reverse. If the fine-tune wins 14 and loses 3 of the
rows where they disagree, that is evidence; 2 against 1 is not.

## Catastrophic forgetting

Narrow training can damage general ability. The script ends with one off-topic question, no system prompt:

    base : The capital of France is Paris.
    lora : "Bonjour" is the French equivalent of English "hello."

Ten epochs on 42 telecom rows broke a fact the base model knew. One question is an anecdote; in a real
project keep a **general-ability set** of 50–200 items (facts, arithmetic, instructions, a translation, your
safety-refusal set from the evaluation topic) and run it on base and fine-tune every time. Fine-tunes can
also weaken refusals: re-run the safety tests, not only the task tests.

Mitigations, in order of effort: train fewer epochs or at a lower learning rate; lower the rank; mix 5–20%
general instruction data into the training set; and route only task traffic to the adapter, so the forgetting
never meets a general question — the natural shape when adapters are served separately.

## What to measure for a fine-tune

- **Task metrics**, matched to the product: JSON validity, field accuracy, escalation recall and precision.
- **Quality you cannot regex:** tone and helpfulness, rated blind (the rater does not know which system
  wrote it) by agents or a judge calibrated against them.
- **Forgetting and safety:** the general set and the refusal set.
- **Cost and latency:** prompt tokens per call and p95 latency — often the reason you fine-tuned.

## The ship rule

Write it before you look at results: "ship if escalation recall is at least the baseline's, intent accuracy
is at least 3 points higher on 300 paired rows, the general set drops by no more than 2 points, and no safety
test regresses." Then the numbers decide, not the effort you spent training.`,
    workedExample: `**Situation:** the real support-reply project. A 1.5B open instruct model, 2,000 training chats, a 300-row
test set split by date, labelled by senior agents. You have three candidates. (The numbers in this example
are an illustration of the method; your own project produces its own.)

**Step 1 — fix the ship rule first.** Escalation recall ≥ baseline; intent accuracy +3 points or more;
general set drop ≤ 2 points; zero new safety failures.

**Step 2 — run all systems on the same 300 rows, greedy decoding, one prompt builder.**

    system                       valid  intent  esc. recall  esc. precision  prompt tokens
    base, 6-example prompt       97.0%  84.3%   92.6%        88.1%           1,450
    LoRA r=16, 2 epochs          99.7%  89.0%   97.1%        90.4%           160
    LoRA r=16, 4 epochs          99.3%  88.7%   94.1%        91.0%           160

**Step 3 — paired comparison on intent.** Between the prompt and the 2-epoch adapter, 32 rows differ: the
adapter is right on 25 and wrong on 7. That is a real difference, not noise.

**Step 4 — forgetting and safety.** General set (120 items): base 81%, 2-epoch 80%, 4-epoch 74%. Safety
refusals: no change for 2 epochs; 4 epochs answered 2 prompts the base refused.

**Step 5 — tone.** Two senior agents rated 40 blind pairs; the 2-epoch adapter was preferred 24 times, the
prompt 11, ties 5.

**Step 6 — decide.** The 2-epoch adapter meets every condition. The 4-epoch one fails escalation recall
against the 2-epoch one, loses 7 points on the general set and regresses on safety, so more training made
things worse. Ship 2 epochs, behind a canary, and keep the prompt-based system as the fallback.`,
    mcqs: [
      mcq('A team reports that its fine-tune scores 92% against 40% for the base model, which was run with no system prompt and no examples. What is wrong with the claim?', [
        ['The baseline is a straw man; compare with the base model\'s best prompt', true],
        ['The fine-tune must be evaluated on its training rows to be comparable', false],
        ['The base model should have been fine-tuned briefly before comparison', false],
        ['A 52-point gap is too large to be real, so the evaluation is broken', false],
      ], 'The question is whether fine-tuning beat the cheaper option, which is the base model with a good prompt and examples; a bare base model is easy to beat. Training rows inflate scores, fine-tuning the baseline makes it another fine-tune, and large gaps over a weak baseline are entirely possible.'),
      mcq('On 10 test rows, a fine-tune gets escalation right 7 times and the prompted baseline 5 times. What can you conclude?', [
        ['Nothing firm yet; on 10 rows the two results are within noise', true],
        ['The fine-tune is 40% better at escalation and should be shipped', false],
        ['The baseline is better, since small test sets favour the fine-tune', false],
        ['Escalation is solved, since 7 of 10 is above the usual 60% bar', false],
      ], 'With so few rows, the uncertainty around each score is about ±28 points, so 7 against 5 cannot separate the systems. You need hundreds of rows and a paired count of disagreements. The 40% figure overstates a two-row difference, and there is no standard 60% bar.'),
      mcq('After fine-tuning on support chats, the model gets simple general questions wrong. Which mitigation keeps the support gains while addressing this?', [
        ['Mix some general instruction data into training, or train for fewer epochs', true],
        ['Raise the learning rate so the model relearns general skills more quickly', false],
        ['Increase the LoRA rank so that the adapter can store general knowledge too', false],
        ['Evaluate only on support questions, since general ones are out of scope', false],
      ], 'Forgetting comes from pushing the weights hard towards a narrow task; gentler training and a share of general data counter it. A higher learning rate or rank pushes harder, and ignoring general questions hides a regression users will meet unless traffic is routed.'),
    ],
    checkpoint: [
      mcq('Your evaluation script crashes with "\'str\' object has no attribute \'get\'" after json.loads on a model reply. What happened, and what is the fix?', [
        ['The model replied with a bare JSON string; count only dict results as valid', true],
        ['The reply was not JSON at all; catch JSONDecodeError around json.loads', false],
        ['The test row has no intent field; skip rows missing an expected intent', false],
        ['The tokenizer decoded special tokens; pass skip_special_tokens=True', false],
      ], 'json.loads accepts any JSON value, including a quoted string, so a reply like "ok" parses into a str with no .get. Check isinstance(got, dict) before reading fields. Invalid JSON would raise JSONDecodeError instead, the expected row is fine, and special tokens are a different symptom.'),
      mcq('Two systems disagree on 30 of 300 test rows: system A is right on 22 of them and B on 8. What does the paired view tell you that the overall accuracies alone do not?', [
        ['That A\'s advantage comes from many consistent wins on the same rows', true],
        ['That both systems are equally good, since they agree on 270 of the rows', false],
        ['That B is better, since it made fewer changes compared with the baseline', false],
        ['That the test set is too easy, since most rows are right for both systems', false],
      ], 'Counting wins and losses on the rows where the systems differ shows whether one beats the other consistently; 22 against 8 is a clear pattern. Agreement on the other rows says nothing about which is better, B is simply wrong more often, and agreement does not prove the set is easy.'),
      mcq('Which result should block shipping a fine-tune that improved intent accuracy by 5 points?', [
        ['It now answers two prompts that the base model correctly refused', true],
        ['Its replies are shorter on average than the prompted base model\'s', false],
        ['Its prompt is 1,300 tokens shorter than the prompted baseline\'s', false],
        ['It was trained for 2 epochs rather than the 3 that were planned', false],
      ], 'Fine-tuning can weaken safety behaviour, and a new failure on the refusal set is a release blocker regardless of task gains. Shorter replies may be fine or even wanted, a shorter prompt is a benefit, and the number of epochs is a means, not a result.'),
    ],
  },

  /* ── SERVING_ADAPTERS ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_FINE_TUNING_SERVING_ADAPTERS',
    notes: `You have an adapter that passed its evaluation. Now it has to answer real requests, ideally through the
same OpenAI-compatible interface your application already uses for hosted models (you built that client
in Generative AI in Python, and the deployment, health checks and tracing around it in AI in Production —
none of that changes). The only new decisions are: merge or not, quantise or not, and which server.

## What the trainer saved

    adapter files: ['README.md', 'adapter_config.json', 'adapter_model.safetensors', 'chat_template.jinja',
                    'tokenizer.json', 'tokenizer_config.json', 'training_args.bin']
    {'base_model_name_or_path': 'HuggingFaceTB/SmolLM2-135M-Instruct', 'r': 16, 'lora_alpha': 32,
     'target_modules': ['v_proj', 'gate_proj', 'up_proj', 'k_proj', 'q_proj', 'o_proj', 'down_proj'],
     'task_type': 'CAUSAL_LM'}

\`adapter_model.safetensors\` was 19.6 MB: 4,884,480 parameters × 4 bytes (saved in fp32 from a CPU run;
a GPU run in 16-bit halves that). The adapter is useless without **exactly** the base model named in
\`adapter_config.json\` — record the base model's revision next to it.

## Option 1: load the adapter at run time

    from transformers import AutoModelForCausalLM
    from peft import PeftModel
    base = AutoModelForCausalLM.from_pretrained(BASE_ID)
    model = PeftModel.from_pretrained(base, "out/support-lora/final")

Small to ship and swap, and one base can host many adapters. Each forward pass does the extra B @ A work,
a small latency cost.

## Option 2: merge the adapter into the weights

    merged = PeftModel.from_pretrained(base, ADAPTER).merge_and_unload()
    merged.save_pretrained("out/support-merged")
    tokenizer.save_pretrained("out/support-merged")      # ship the tokenizer and chat template too

\`merge_and_unload()\` computes W + (alpha / r)·B·A once and returns a plain transformers model
(\`LlamaForCausalLM\` here) — no PEFT needed at serving time, no adapter overhead. The cost: a full-size
copy per fine-tune (541.6 MB here, in fp32, against the adapter's 19.6 MB). Check the merge is faithful by
comparing logits of the merged model and the adapter model on the same prompt:

    max logit difference merged vs adapter: 4.76837158203125e-05

That is floating-point rounding — the same model. If you trained with QLoRA, merge into a **16-bit** copy
of the base (not the 4-bit one), then quantise the merged result if you want to, and evaluate again.

Rule of thumb: **one task, one model → merge. Many adapters on one base → serve adapters.**

## Quantising for serving

You met GGUF quantisation levels and their cost in Running an Open Model Locally. The same rule applies to
your fine-tune, with one sharper edge: fine-tunes are often used for exact things — JSON keys, intent
labels — and that is where quantisation errors show first. Re-run your evaluation set on the quantised
build; if escalation recall drops, step up to 8-bit or keep 16-bit. On GPUs, vLLM also serves AWQ- and
GPTQ-quantised checkpoints, and bitsandbytes 4-bit models.

## Serving with vLLM (GPU)

vLLM is a high-throughput inference server with an OpenAI-compatible API and multi-LoRA support. It needs
a Linux CUDA GPU, so the commands below are from its documentation and were not run for this unit — try
them on your notebook GPU.

    pip install vllm
    vllm serve <base-model-id> \\
        --enable-lora \\
        --lora-modules support=./out/support-lora/final \\
        --max-lora-rank 16 \\
        --max-loras 4

- \`--lora-modules name=path\` registers an adapter under a name. Several can be listed.
- \`--max-lora-rank\` must be at least your adapter's r; raise it if you trained with r = 32 or 64.
- \`--max-loras\` is how many different adapters can be active in one batch.

Clients choose the adapter with the \`model\` field:

    from openai import OpenAI
    client = OpenAI(base_url="http://localhost:8000/v1", api_key="not-needed-locally")
    resp = client.chat.completions.create(
        model="support",                     # the LoRA name; the base model id gives the plain base
        messages=build_messages(user_text),  # the SAME builder used for training and evaluation
        temperature=0, max_tokens=200,
    )

\`GET /v1/models\` lists the base and every registered adapter — a quick health check that your adapter
loaded. A merged model is served like any other: \`vllm serve ./out/support-merged\`.

## Serving with Ollama (laptop, small server)

Ollama serves GGUF models with an OpenAI-compatible endpoint at \`http://localhost:11434/v1\`. Two documented
routes (not run here; check \`ollama show --modelfile\` on the result):

    # Route A — import the merged safetensors folder and quantise while importing
    FROM ./out/support-merged

    ollama create support-reply -f Modelfile --quantize q4_K_M

    # Route B — base model plus your safetensors adapter (supported architectures only)
    FROM <the exact base model the adapter was trained on>
    ADAPTER ./out/support-lora/final

Either way, check that the imported model's chat template matches the one you trained with, set
\`PARAMETER temperature 0\` and \`PARAMETER num_ctx\` as in the earlier unit, and point your client's
\`base_url\` at Ollama with \`model="support-reply"\`. Route B with a different base model than the one
you trained on will load and produce nonsense.

## Before you call it shipped

1. Run the **evaluation set against the served endpoint**, not the notebook model. Same prompt builder,
   same decoding. Numbers should match the notebook within noise.
2. Validate every response with the Pydantic schema; on failure, fall back to a safe default ("escalate
   to an agent").
3. Put the base model id and revision, adapter hash, quantisation level and evaluation results in your
   model registry entry (the MLflow registry or a simple versioned table).
4. Keep the previous model servable for a quick rollback — with adapters that is just another
   \`--lora-modules\` entry.`,
    workedExample: `**Situation:** the support-reply fine-tune passed evaluation. The operator wants it in production on one
GPU server, and a second, Telugu-English adapter for the Andhra Pradesh and Telangana circles is being
trained. Agents' consoles already call an OpenAI-compatible endpoint.

**Step 1 — choose adapters over merging.** Two adapters (soon more, for other circles) on one base model.
Merging would mean two full copies of the base in GPU memory; serving adapters shares one.

**Step 2 — start vLLM with both.**

    vllm serve <base-model-id> --enable-lora \\
        --lora-modules support-en=/models/support-en support-te=/models/support-te \\
        --max-lora-rank 16 --max-loras 2

**Step 3 — route in the gateway.** The application gateway picks the adapter by the customer's circle
and the detected language, and keeps everything else unchanged:

    def model_for(circle: str, lang: str) -> str:
        return "support-te" if circle in {"AP", "TS"} and lang == "te-en" else "support-en"

**Step 4 — evaluate through the endpoint.** Run \`evaluate.py\` pointed at \`base_url=http://gpu-1:8000/v1\`
for each adapter on its own test set. Compare with the notebook numbers; a gap means the prompt builder or
the decoding differs between notebook and server.

**Step 5 — release safely.** Ship \`support-te\` to 10% of AP and Telangana chats first (the canary pattern
from AI in Production), watch escalation recall and agent edit rates, then widen. Rollback is changing
\`model_for\` back to \`support-en\`.

**Step 6 — the laptop copy.** For a demo at a field office with no GPU: merge \`support-en\` into a
16-bit base, import into Ollama with \`--quantize q4_K_M\`, and run the evaluation set on that build
before anyone sees it. If JSON validity or escalation recall drops, use \`q8_0\` instead.

**Result:** one GPU, two behaviours, a gateway rule to choose between them, and every served variant
evaluated as served.`,
    mcqs: [
      mcq('You merge a LoRA adapter into its base and compare logits with the unmerged PEFT model on one prompt. The maximum difference is about 5e-05. What does that show?', [
        ['The merge is faithful; the gap is floating-point rounding', true],
        ['The merge lost the adapter, so the merged model is the base', false],
        ['The merge doubled the adapter, so its effect is now too strong', false],
        ['The merge is broken, since any difference means a wrong merge', false],
      ], 'Adding (alpha / r)·B·A into W changes the order of floating-point operations, so tiny differences around 1e-5 are expected and mean the models are the same. A lost or doubled adapter would move logits by whole units, not hundred-thousandths.'),
      mcq('A team trained an adapter with r = 64 and starts vLLM with --enable-lora and its default maximum LoRA rank. What should they expect?', [
        ['The adapter will be rejected until --max-lora-rank is raised to 64', true],
        ['vLLM will silently truncate the adapter to rank 16 and serve it', false],
        ['vLLM will merge the adapter into the base model to fit the limit', false],
        ['The adapter will load, but only for requests with temperature 0', false],
      ], 'vLLM sizes its LoRA buffers by --max-lora-rank, so an adapter with a larger rank cannot be loaded until the limit is raised. It does not truncate or merge adapters, and decoding settings have nothing to do with loading.'),
      mcq('Your fine-tune scored 99% valid JSON in the notebook, but the Ollama build you imported with --quantize q4_K_M has not been evaluated. What is the right next step?', [
        ['Run the evaluation set against the Ollama endpoint before shipping it', true],
        ['Ship it, since quantisation changes style but never output format', false],
        ['Re-train the adapter in 4-bit so that the two builds become identical', false],
        ['Switch to vLLM, which serves 4-bit models without any loss in quality', false],
      ], 'A quantised build is a slightly different model, and exact outputs such as JSON keys can suffer, so evaluate exactly what you serve. Quantisation can affect format, retraining in 4-bit does not make a GGUF identical, and no server makes quantisation free.'),
    ],
    checkpoint: [
      mcq('A company will serve one fine-tuned model for one task on a dedicated GPU, at high traffic. Which serving form fits best?', [
        ['A merged model, so there is no adapter work on each forward pass', true],
        ['The base model plus the adapter, swapped in and out per request', false],
        ['The adapter alone, since it holds all the weights the task needs', false],
        ['The 4-bit QLoRA training checkpoint, exactly as it left the trainer', false],
      ], 'With a single task there is nothing to swap, so merging removes the per-call adapter overhead and the dependency on PEFT. Per-request swapping helps only with many adapters, an adapter alone is just a correction and cannot run, and the QLoRA training checkpoint is not a serving format.'),
      mcq('An Ollama Modelfile says FROM a 7B model and ADAPTER points to a LoRA trained on a 1B model of the same family. What is the most likely outcome?', [
        ['It fails to load or gives nonsense, since the adapter fits other weights', true],
        ['It works, since adapters move freely between sizes of one model family', false],
        ['Ollama rescales the adapter to the 7B shapes during the import step', false],
        ['It works, but only after the model is quantised to the q4_K_M level', false],
      ], 'An adapter is a correction to the exact base it was trained on; a different size has different shapes and weights. Nothing rescales it, and quantisation level is irrelevant. Use the same base model the adapter names in adapter_config.json.'),
      mcq('With vLLM serving one base and two adapters, how does a client choose the Telugu-English adapter?', [
        ['By putting the adapter\'s registered name in the request\'s model field', true],
        ['By adding a lora_path header that points at the adapter folder', false],
        ['By sending the adapter id inside the system message of the request', false],
        ['By calling a separate port that vLLM opens for every registered adapter', false],
      ], 'Adapters registered with --lora-modules appear as models in /v1/models, and a request selects one by naming it in the model field. There is no path header, the system message is just text, and vLLM serves all adapters on one port.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_FINE_TUNING_DEBUGGING',
    notes: `Fine-tuning bugs come in two kinds. Loud ones stop the run with an exception — annoying but quick.
Quiet ones train happily for an hour and give you a model that is subtly wrong. The error messages below
are real, from TRL 1.16, PEFT 0.21 and transformers 5; library versions move fast, so the first habit is
to **pin your versions** in \`requirements.txt\` and read the installed library's docs, not a two-year-old
blog post.

## 1. A tutorial's config does not construct

**Symptom:**

    TypeError: SFTConfig.__init__() got an unexpected keyword argument 'warmup_ratio'

**Cause:** in transformers 5 the separate \`warmup_ratio\` argument is gone; \`warmup_steps\` now takes either
an integer (steps) or a float below 1 (a fraction of total steps). The tutorial was written for an older
version.
**Fix:** \`warmup_steps=0.1\`. In general, check \`inspect.signature(SFTConfig.__init__)\` or the docs of the
version you actually installed.

## 2. "Your setup doesn't support bf16/gpu"

**Symptom:** on a laptop, or on a free notebook GPU:

    ValueError: Your setup doesn't support bf16/gpu. You need to assign use_cpu if you want to train the model on CPU.

**Cause:** TRL's config defaults to \`bf16=True\`. A CPU cannot do it, and neither can the older 16 GB GPU
that many free notebooks give you (bfloat16 needs a newer generation of GPU).
**Fix:** \`bf16=False\` on CPU; \`bf16=False, fp16=True\` on an older GPU; leave bf16 on for newer ones. If
you use QLoRA, set \`bnb_4bit_compute_dtype\` to match (float16 on the older GPU).

## 3. The model learns to write the customer's message

**Symptom:** the loss falls nicely, but at inference the fine-tune sometimes repeats the system prompt or
writes a fake customer turn before its JSON.
**Cause:** loss was computed on **every** token. Checking one batch showed it:

    label tokens counted in loss: 113 of 113

The model was trained to generate the system prompt and the user message too. Trying the obvious switch
on this model failed loudly:

    ValueError: The chat template is not training-compatible (missing prefix-preservation or
    \`{% generation %}\` markers) and patching is not supported for this template.

(\`assistant_only_loss=True\` needs a chat template that marks the assistant span.)
**Fix:** use the **prompt-completion** format — prompt = system and user turns, completion = the assistant
turn. TRL then masks the prompt by default: 51 of 113 tokens counted, all of them the reply. Always print
one batch's labels before a long run.

## 4. "Target modules not found"

**Symptom:**

    NoMatchingPeftModuleError: Target modules {'value', 'query'} not found in the base model.

**Cause:** module names copied from a BERT tutorial onto a Llama-style model, whose layers are \`q_proj\`,
\`v_proj\` and so on.
**Fix:** list them: \`sorted({n.split(".")[-1] for n, m in model.named_modules() if type(m).__name__ ==
"Linear"})\`, or use \`target_modules="all-linear"\`. The quiet cousin of this bug is worse: targets that
match only a few layers, so training "works" with almost nothing trainable — always read
\`print_trainable_parameters()\`.

## 5. Great on the test set, odd in production

**Symptom:** evaluation scores are excellent; agents say production drafts ignore the escalation rule.
**Cause:** the serving code built the prompt without the system message (the template then injected its
default "helpful assistant" prompt) and without \`add_generation_prompt=True\`. The model is seeing inputs
unlike anything it was trained on.
**Fix:** one function, \`build_messages(user_text)\`, used by the training-data builder, the evaluation
script and the server. Add a test that renders the production prompt and compares it with a training
example's prompt.

## 6. The adapter loads but the output is garbage

**Symptom:** \`PeftModel.from_pretrained(base, "adapter/")\` runs, but the output is nonsense, or loading
fails with shape-mismatch errors.
**Cause:** the adapter was trained on a different base model — another size, or the base rather than the
instruct variant, or a newer revision. An adapter is a correction to **one specific** set of weights.
**Fix:** read \`base_model_name_or_path\` from \`adapter_config.json\`, load exactly that model (pin the
revision), and keep the base id and revision in your model registry next to the adapter.

## The debugging order

Print versions → print one rendered training example → print one batch's labels → read
\`print_trainable_parameters()\` → run 10 steps and watch the loss move → only then start the long run.`,
    mcqs: [
      mcq('A colleague\'s SFT run on a free notebook GPU fails at once with "Your setup doesn\'t support bf16/gpu". The notebook has an older 16 GB GPU. What change fixes it?', [
        ['Set bf16=False and fp16=True in the SFTConfig for that GPU', true],
        ['Set use_cpu=True, because training on this GPU is not supported', false],
        ['Lower the learning rate, since bf16 errors come from large updates', false],
        ['Load the base model in 4-bit, which removes the need for bf16 support', false],
      ], 'TRL defaults to bf16, which older GPUs lack; switching to fp16 keeps mixed precision on that GPU. Moving to the CPU throws away the GPU, the learning rate has nothing to do with dtype support, and a 4-bit base still needs a supported compute dtype.'),
      mcq('You print one batch and see that every token, including the system prompt, has a label other than -100. What is the effect on training?', [
        ['The model is also trained to generate the system and user text', true],
        ['The loss is undefined, so training stops after the first few steps', false],
        ['Only the system prompt is learnt, and the assistant reply is ignored', false],
        ['Nothing changes, because the trainer masks the prompt at loss time', false],
      ], 'Labels of -100 are ignored by the loss; anything else is a target, so the model learns to produce prompt text as well as replies, which can leak into generations. The loss is perfectly defined, replies are learnt too, and nothing masks them later — that is what the labels are for.'),
      mcq('A LoraConfig copied from a notebook has r=16, target_modules=["q_proj"] and layers_to_transform=[0]. On an 8B model (hidden 4096) PEFT reports 131,072 trainable parameters. What has happened?', [
        ['Only the first layer\'s q_proj is adapted, so the run trains almost nothing', true],
        ['LoRA always reports a small number because it counts only the B matrices', false],
        ['The adapter is fine, since large models need fewer trainable parameters', false],
        ['PEFT has frozen most adapters because the rank was set too low for 8B', false],
      ], '16 × (4096 + 4096) = 131,072 is exactly one q_proj adapter, so layers_to_transform restricted LoRA to layer 0 and the run will appear to work while changing almost nothing. PEFT counts both A and B, larger models do not need fewer adapters, and rank never freezes layers.'),
      mcq('An adapter trained on a model\'s base variant is loaded on its instruct variant of the same size. Loading succeeds. What should you expect?', [
        ['Unreliable output, since the adapter corrects weights it was not trained on', true],
        ['A shape-mismatch error, since PEFT refuses any other model in all cases', false],
        ['Better output, since the instruct variant adds chat skills to the adapter', false],
        ['Identical output, since adapters depend only on the architecture and size', false],
      ], 'Same-size variants share shapes, so loading works, but the adapter learnt a correction relative to different weights and the result is unpredictable. Shape errors appear only when sizes differ, and nothing guarantees that the combination is better or identical.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_FINE_TUNING_PRACTICE',
    notes: `Work each exercise on paper or in your venv before reading the answer. The numbers come from the
runs in this topic, so you can check them.

## Exercise 1 — route the requirement (easy)

For each, say prompt, RAG or fine-tune, in one line: (a) answers must quote this month's tariff sheet;
(b) every reply must be valid JSON with five fixed keys, at 15 lakh calls a month; (c) a legal team
wants answers only from contracts each lawyer may see; (d) replies must sound like the brand's agents,
in Hinglish when the customer writes Hinglish.

**Answer:** (a) RAG — changing facts, cited. (b) Prompt with structured output first; fine-tune if the
eval set or the cost at that volume justifies it. (c) RAG with permission filters — weights cannot
enforce access. (d) Prompt first; fine-tune on reviewed agent replies if tone stays inconsistent.

## Exercise 2 — break-even (easy)

A 2,000-token prompt becomes 200 tokens after a fine-tune; 5 lakh calls a month. How many input tokens
a month are saved?

**Answer:** 1,800 × 500,000 = 900,000,000, i.e. 900 million. Saving = 900 × P_in per month, set against
the serving and upkeep cost of the fine-tuned model.

## Exercise 3 — validate a row (easy)

Which checks fail for \`{"messages": [{"role": "user", "content": "bill high"}, {"role": "assistant",
"content": "{\\"intent\\": \\"billing\\", \\"reply\\": \\"ok\\", \\"escalate\\": \\"yes\\"}"}]}\`?

**Answer:** no system turn; unknown intent 'billing' (not in the five); escalate is a string, not a bool.
Three problems — and the reply "ok" is a quality problem no schema check catches.

## Exercise 4 — LoRA parameters (medium)

Hidden size 2048, q_proj 2048 × 2048, k_proj and v_proj 512 × 2048, 22 layers. r = 16 on q, k, v.

**Answer:** q: 16 × 4,096 = 65,536; k and v: 16 × 2,560 = 40,960 each. Per layer 147,456; × 22 =
**3,244,032**.

## Exercise 5 — memory (medium)

Can you fully fine-tune a 3B model on a 40 GB GPU with Adam in mixed precision?

**Answer:** about 3 × 16 = 48 GB before activations — no. LoRA on a 16-bit base (6 GB of weights) fits
easily; QLoRA is not even needed.

## Exercise 6 — steps (medium)

42 training rows, \`per_device_train_batch_size=4\`, \`gradient_accumulation_steps=2\`, 3 epochs. How many
optimiser steps, and what is the effective batch size?

**Answer:** 42 / 4 = 11 micro-batches per epoch (the last one has 2 rows) → about 6 optimiser steps per
epoch with accumulation 2, so **18 steps** for 3 epochs — what the trainer reported. Effective batch = 4 ×
2 = 8. With so few steps, warm-up of 0.1 is about 2 steps.

## Exercise 7 — read the masking (medium)

A batch shows "label tokens counted in loss: 113 of 113" for messages format, and "51 of 113" after you
switch to prompt-completion. What are the other 62 tokens?

**Answer:** the system prompt, the user message and the chat-template markers up to and including the
\`<|im_start|>assistant\` line. They are now context only, not targets.

## Exercise 8 — read the curves (medium)

Training loss falls 2.1 → 0.4 → 0.1 → 0.03 over four epochs; validation loss 1.9 → 0.6 → 0.7 → 0.9.
Which checkpoint do you keep, and what do you change?

**Answer:** the epoch-2 checkpoint (lowest validation loss). The model is memorising from epoch 3: train
for fewer epochs, lower the learning rate or add data; use \`load_best_model_at_end=True\` with an
evaluation each epoch. Then confirm with the task metrics, not loss alone.

## Exercise 9 — choose the adapter settings (hard)

A 7B model, one 24 GB GPU, 3,000 examples of up to 1,024 tokens, a task of intent plus reply.

**Answer:** QLoRA or 16-bit LoRA both fit (16-bit weights ≈ 14 GB; tight with 1,024-token activations, so
QLoRA is the safer start). r = 16, alpha = 32, all-linear, dropout 0.05, learning rate 2e-4, 2–3 epochs,
gradient checkpointing, batch 2 × accumulation 8. Evaluate each epoch on a by-source split.

## Exercise 10 — serving choice (hard)

Twelve corporate clients each want their own tone, on one GPU. Merge twelve models or serve adapters?

**Answer:** serve one base model with twelve LoRA adapters loaded at run time (vLLM's multi-LoRA) and
pick the adapter per request. Twelve merged copies would need twelve times the GPU memory.`,
    mcqs: [
      mcq('A run has 1,000 rows, per-device batch 8, gradient accumulation 4, one GPU and 2 epochs. Roughly how many optimiser steps will it take?', [
        ['About 62, since 125 micro-batches per epoch divided by 4 is about 31', true],
        ['About 250, since 1,000 rows divided by 8 is 125, done for 2 epochs', false],
        ['About 16, since one step is taken after every 8 × 4 × 2 = 64 rows', false],
        ['About 500, since each of the 2 epochs takes 1,000 divided by 4 steps', false],
      ], 'Each optimiser step consumes 8 × 4 = 32 rows, so one epoch is about 31 steps and two epochs about 62. 250 counts micro-batches, not optimiser steps; 16 wrongly multiplies the epoch count into the batch; 500 ignores the per-device batch.'),
      mcq('Training loss keeps falling while validation loss has risen for two evaluations in a row. What does that most directly show?', [
        ['The model has begun to memorise the training set rather than generalise', true],
        ['The learning rate is too low, so the model has not yet learnt the task', false],
        ['The validation set is too easy and should be replaced by harder examples', false],
        ['The adapter rank is too small to represent what the task actually needs', false],
      ], 'Diverging curves — train down, validation up — are the classic sign of overfitting, so stop earlier or regularise. Too low a learning rate makes both losses fall slowly, an easy validation set would not make its loss rise, and too small a rank shows up as both losses staying high.'),
      mcq('Which hyperparameter pair do practitioners usually adjust together, because both scale how big the LoRA update is?', [
        ['lora_alpha and the learning rate', true],
        ['lora_dropout and the number of epochs', false],
        ['max_length and the per-device batch size', false],
        ['target_modules and the warm-up steps', false],
      ], 'The adapter output is multiplied by alpha / r, and the learning rate scales every update, so the two interact closely and are tuned as one knob. Dropout and epochs relate to overfitting, max_length and batch size to memory, and target modules and warm-up are separate decisions.'),
      mcq('The validator passes a row whose reply is the single word "ok" in valid JSON with a known intent. What does this tell you about dataset checks?', [
        ['Schema checks catch structure only; reply quality needs human or judge review', true],
        ['The validator is broken, since every quality issue should fail the schema', false],
        ['Short replies are harmless because the trainer drops rows under 10 tokens', false],
        ['The row is fine, because the model learns tone from the system prompt alone', false],
      ], 'Code checks can enforce JSON, enums and types, but not whether a reply is helpful; review a sample by hand or with a calibrated judge, and set rules such as a minimum length. Schema checks are not meant to judge quality, the trainer drops nothing for being short, and the model copies whatever replies it is shown.'),
      mcq('Twelve corporate clients each want a differently toned assistant, served from one GPU. What is the most memory-efficient serving design?', [
        ['One base model with twelve LoRA adapters chosen per request at run time', true],
        ['Twelve merged models, each quantised to 4-bit so all twelve fit together', false],
        ['One merged model trained on all twelve tones with a client tag in the prompt', false],
        ['Twelve hosted fine-tunes, since self-hosting several tones is not possible', false],
      ], 'Adapters are a few MB each and share one copy of the base weights, so a multi-LoRA server can pick one per request. Twelve merged 4-bit copies still multiply the weight memory, a single mixed model blurs the tones, and self-hosting several adapters is exactly what multi-LoRA serving supports.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_FINE_TUNING_INTERVIEW_QUESTION',
    notes: `Fine-tuning questions in Generative AI Engineer interviews test judgement first and mechanics second.
Answer the "should we" before the "how", and use numbers.

## Question 1 — "Our chatbot doesn't know our products. Should we fine-tune it?"

**Model answer:** "Probably not for that. Product knowledge changes and needs citing, so I'd put it in
retrieval — index the catalogue and FAQs and ground every answer. Fine-tuning is the right tool for stable
behaviour: a fixed output format, a house tone, a narrow classification. I'd first build an evaluation set
of a few hundred real questions and measure a well-prompted model with RAG. If a gap remains that is about
behaviour, say the format breaks 4% of the time or the tone is off, and it costs us, then I'd consider a
LoRA fine-tune — and it ships only if it beats the prompted baseline on that set."

**Follow-up:** "We tried RAG and the answers are still wrong." — "Then I'd look at retrieval before the
model: recall@k on the eval set, chunking, filters, re-ranking. If retrieval finds the right passage and the
model still answers badly, I'd check the prompt and the model size, and only then fine-tune on examples
that include retrieved context, so the model learns to use it."

## Question 2 — "Explain LoRA. Why does it work, and what are r and alpha?"

**Model answer:** "LoRA freezes the original weights and learns a low-rank correction, W plus B times A
scaled by alpha over r, where A and B are thin matrices of rank r. B starts at zero, so training starts from
the base model. For a 576-by-576 projection with r equals 8 that is 9,216 trainable numbers instead of
331,776. Across a small model with all linear layers at r equals 16 I measured about 3.5% trainable.
Gradients and optimiser states exist only for the adapters, which is where the memory saving comes from.
It works because the update a fine-tune needs tends to be low-rank. alpha scales the update; I keep it at
r or 2r and tune the learning rate."

**Follow-up:** "And QLoRA?" — "The frozen base is stored in 4-bit NF4 and de-quantised on the fly; the
adapters stay 16-bit. A 7B model's weights drop from about 14 to about 4 GB, so it trains on one 16 GB
GPU. It's slower per step and I'd re-evaluate what I actually serve."

## Question 3 — "How do you know your fine-tune is better?"

**Model answer:** "A held-out test set that the training data never touched, split by source or time so
near-duplicates can't leak. I compare three systems on it: the base model with my best prompt, the
fine-tune, and, if relevant, a larger hosted model. Metrics match the task — JSON validity, intent
accuracy, escalation recall for a support model — plus a small general-ability set to catch forgetting.
Loss curves tell me training worked; they don't tell me the product is better."

**Follow-up:** "The fine-tune wins on your set but users complain." — "Then my test set doesn't match
traffic. I'd sample failing production cases, check the serving prompt matches the training prompt
exactly, add those cases to the test set, and re-run all three systems."

## Question 4 — "How would you serve it?"

**Model answer:** "Either merge the adapter into the base weights and serve one model, or keep the adapter
separate and load it at run time. For one task I merge — simpler and no adapter overhead. For many
customers or tasks on one GPU, I serve the base model once with several adapters, for example vLLM with
LoRA enabled, behind an OpenAI-compatible endpoint, so the application code is the same as for a hosted
model. For a laptop or edge box I'd convert the merged model to a quantised GGUF for Ollama and re-run the
evaluation on that quantised build."`,
    mcqs: [
      mcq('An interviewer asks how you would prove a fine-tune is worth shipping. Which answer is strongest?', [
        ['Beat a well-prompted base model on a by-source held-out set using task metrics', true],
        ['Show that training and validation loss both fell steadily during all epochs', false],
        ['Show five side-by-side outputs where the fine-tuned model is clearly better', false],
        ['Show that the fine-tune scores higher than the base model with no prompt at all', false],
      ], 'The right comparison is against the best cheap alternative — a well-prompted base model — on held-out data that cannot leak, measured with the metrics the product cares about. Loss curves show training worked, five examples are anecdotes, and beating an unprompted model is an easy, misleading bar.'),
      mcq('In an interview you are asked why LoRA saves so much memory. Which explanation is accurate?', [
        ['Optimiser states and gradients are kept only for the small adapter matrices', true],
        ['The base model is compressed to a few MB once the adapters are attached', false],
        ['LoRA trains one layer at a time, so only one layer sits in memory at once', false],
      ], 'Adam keeps two moments and a master copy per trainable parameter; with LoRA those exist only for the adapters, while the frozen base just sits in memory. The base is not compressed by LoRA (that is QLoRA\'s 4-bit loading), and all layers are trained together.'),
      mcq('Asked how to serve fine-tunes for many enterprise customers, what should you say?', [
        ['One shared base model with per-customer adapters picked at request time', true],
        ['A merged model per customer, each on its own GPU, so no request can mix', false],
        ['A single model trained on every customer\'s data with names in the prompt', false],
      ], 'Adapters are small and a multi-LoRA server shares the base weights, so many customers fit on one GPU while each gets their own behaviour. A GPU per customer is costly, and one model trained on all customers\' data both blurs behaviour and risks one customer\'s data surfacing for another.'),
    ],
  },

  /* ── MINI_PROJECT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_FINE_TUNING_MINI_PROJECT',
    notes: `# Mini Project — A Fine-Tuned Support-Reply Model

A mobile operator's customer-care team in Hyderabad handles chats in English, Hindi, Telugu-English and
Hinglish. Agents want a first draft for every incoming message, in a fixed JSON shape their console
already understands:

    {"intent": "<one of the allowed intents>", "reply": "<the draft, under 70 words>", "escalate": true|false}

The head of customer care has three conditions: "Never tell an agent not to escalate a stolen-SIM or fraud
chat. Sound like our best agents, not like a robot. And the chat logs stay on our servers." Your job is to
find out whether a small open model fine-tuned with LoRA beats a well-prompted small open model on this task
— and to serve whichever wins behind an OpenAI-compatible endpoint the console can call.

## What you start with

- \`data/chats_export.jsonl\`: about 3,000 anonymised first messages with the agent's first reply, the
  resolved intent, whether the chat was transferred, the date, and a template id for messages generated
  from templates. About 5% are duplicates or near-duplicates; some rows have broken JSON in the reply or an
  intent outside the allowed list. Some still contain phone numbers — your scrubber must catch them.
- \`data/intents.yaml\`: eight allowed intents with one-line definitions and which ones must always
  escalate (\`sim_block\`, \`fraud_report\`).
- The PII redaction functions and the evaluation-runner pattern from Evaluating and Guarding LLM
  Applications.
- Any free GPU notebook (Colab or Kaggle). The whole project fits a 0.5–2B-parameter open instruct
  model; a 7–8B model with QLoRA is an optional stretch. Your laptop CPU is enough for data preparation and
  for a 10-step smoke run of a 135M model before you spend GPU time.

## Deliverables

1. **\`prepare_data.py\`** — reads the export, scrubs PII, converts each row to the prompt-completion chat
   format with the production system prompt, validates every row (schema, intents, booleans, reply length),
   removes exact and near-duplicates, and writes \`train.jsonl\`, \`val.jsonl\` and \`test.jsonl\`. The split
   is **by date** (oldest for training, newest for testing) with no template id shared across splits.
   It prints a report: rows read, dropped by reason, per-intent counts per split, leaks found (must be 0).
2. **\`DATASET.md\`** — the source, every filter with its counts, the redaction rules, the split rule, and
   the SHA-256 of each output file.
3. **\`baseline.py\`** — the same small model with your best prompt (system prompt, schema, a few examples),
   evaluated on \`test.jsonl\`. This is the bar to beat. Spend real effort here: a weak baseline makes any
   fine-tune look good and an interviewer will ask.
4. **\`train.py\`** — TRL \`SFTTrainer\` with a PEFT \`LoraConfig\`. Pinned versions in \`requirements.txt\`. It
   prints \`print_trainable_parameters()\` and the label count of one batch (to prove only the reply is
   learnt), evaluates on \`val.jsonl\` each epoch, keeps the best checkpoint, and saves the adapter. Commit
   the loss curve as an image or a table from \`trainer.state.log_history\`.
5. **\`evaluate.py\`** — runs base, prompted base and fine-tune on \`test.jsonl\` with greedy decoding and
   reports: valid JSON %, intent accuracy, **escalation recall on must-escalate intents**, escalation
   precision, reply length, and 30 replies rated blind by you or a classmate for tone (1–5). Plus a
   20-question general-ability set (simple facts, arithmetic, a translation) run on base and fine-tune to
   detect forgetting.
6. **\`serve/\`** — the winner served behind an OpenAI-compatible endpoint: either vLLM with the adapter
   (\`--enable-lora\`) on the GPU, or the merged model on Ollama. A \`client.py\` that calls it with the
   OpenAI SDK and validates the JSON with Pydantic, falling back to "escalate to an agent" if validation
   fails.
7. **\`REPORT.md\`** — the comparison table, the decision with numbers, what you would need to make the
   fine-tune worth it if it lost, and the retraining plan when the base model changes.

## Milestones

- **Day 1 — data.** \`prepare_data.py\` runs end to end; the leak check prints 0; DATASET.md written.
- **Day 2 — baseline.** Prompted baseline evaluated; you know the numbers to beat.
- **Day 3 — smoke run, then the real run.** 10 steps on CPU with the 135M model to prove the pipeline and
  the masking; then the full run on the free GPU (\`fp16=True\` on older GPUs, \`bf16=True\` on newer ones).
- **Day 4 — evaluation.** All three systems on the test set; forgetting checked; tone rated blind.
- **Day 5 — serving and report.** Merged or adapter serving, client with validation, report.

## Acceptance checks

- \`prepare_data.py\` is deterministic: running it twice gives files with the same hashes.
- No test row shares a template id or normalised text with any training row.
- One printed training batch shows the system and user tokens masked (-100).
- Every metric for all three systems comes from the same test file and the same decoding settings.
- Escalation recall on must-escalate intents is reported separately and is at least as high for the
  shipped model as for the baseline — otherwise you do not ship the fine-tune, whatever the other numbers.
- The served model gives the same answers as in \`evaluate.py\` on ten test rows (same prompt builder).

## Common traps

- Comparing the fine-tune with an **unprompted** base model. Always compare against your best prompt.
- Training with one system prompt and serving with another, or letting the template inject its default.
- A random split on templated data, so the test set is full of siblings of training rows.
- Reading validation loss as the result. Loss is a training signal; the product metrics are the result.
- Forgetting that a quantised GGUF build is a different model — evaluate what you actually serve.`,
    assignment: {
      title: 'A Fine-Tuned Support-Reply Model',
      description: 'Build a validated, PII-scrubbed chat dataset from a support-chat export, fine-tune a small open model with LoRA using TRL, prove with a held-out evaluation whether it beats a well-prompted base model (including escalation recall and forgetting), and serve the winner behind an OpenAI-compatible endpoint.',
      instructions: `Complete the project described in this unit's brief and submit a repository link or a zip.

**Submit:**

1. \`prepare_data.py\`, \`baseline.py\`, \`train.py\`, \`evaluate.py\`, \`serve/\` with \`client.py\`, and a pinned
   \`requirements.txt\`. Do not commit model weights; commit the adapter's \`adapter_config.json\` and a
   download link or notebook output for the weights.
2. \`DATASET.md\` and \`REPORT.md\` as described in the brief, including the loss curve and the comparison
   table for base, prompted base and fine-tune.
3. The notebook you trained in, with its outputs, so the reviewer can see the real run.

**Before you submit,** go through the acceptance checks and record each result at the end of REPORT.md (for
example: "leaks: 0; masked tokens in batch: 71 of 128; escalation recall baseline/fine-tune: …; served and
evaluated answers identical on 10/10 rows").`,
      rubric: [
        { criterion: 'Dataset preparation', description: 'PII scrubbed before anything else; every row validated with drop reasons counted; exact and near-duplicates removed; a by-date split with no shared templates and a leak check of zero; DATASET.md with counts and file hashes; deterministic output.', maxPoints: 25 },
        { criterion: 'A real baseline', description: 'The same small model with a carefully built prompt and schema, evaluated on the same test file and decoding settings; its numbers are the stated bar.', maxPoints: 15 },
        { criterion: 'The training run', description: 'TRL SFTTrainer with a sensible LoraConfig; pinned versions; trainable parameters and one batch\'s masked labels printed; per-epoch validation with the best checkpoint kept; loss curve committed and interpreted.', maxPoints: 20 },
        { criterion: 'Evaluation and decision', description: 'Base, prompted base and fine-tune compared on JSON validity, intent accuracy, escalation recall and precision, blind tone ratings and a forgetting set; the ship decision follows the escalation rule and is justified with numbers.', maxPoints: 25 },
        { criterion: 'Serving', description: 'The winner behind an OpenAI-compatible endpoint (vLLM with the adapter, or a merged model on Ollama); a client that validates JSON with Pydantic and falls back to escalation; served answers match evaluated answers.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
    mcqs: [
      mcq('Your fine-tune beats the prompted baseline on intent accuracy by 6 points but has lower recall on stolen-SIM and fraud escalations. What does the brief say you do?', [
        ['Do not ship the fine-tune; escalation recall must not fall below the baseline', true],
        ['Ship it, since a 6-point accuracy gain outweighs a few escalation misses', false],
        ['Ship it with a higher temperature, so that it escalates a little more often', false],
        ['Retrain on the test set\'s missed escalations and then ship the result', false],
      ], 'The acceptance checks make must-escalate recall a hard gate because a missed stolen-SIM chat is the costliest error, so a model that regresses on it does not ship whatever else improved. Temperature does not fix a learnt behaviour, and training on test rows destroys the test set.'),
      mcq('Why does the brief insist on a by-date split with no template id shared between train and test?', [
        ['So the test set is genuinely unseen and the scores reflect real traffic', true],
        ['So the training set gets the newest data, which the model learns best from', false],
        ['So the trainer can shuffle rows without the loss becoming unstable', false],
      ], 'Random splits on templated or bursty chat data put near-copies on both sides, which inflates test scores; splitting by date and template keeps test data unseen, as production traffic is. The newest data goes to test here, not train, and splitting has nothing to do with loss stability.'),
    ],
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_FINE_TUNING_CHECKPOINT',
    notes: `Ten questions across the topic: when to fine-tune, datasets and chat templates, LoRA and QLoRA, the
training run, evaluating a fine-tune and serving it. Several give you numbers or an output; work out your
answer before reading the options.`,
    checkpoint: [
      mcq('A travel company wants its assistant to always answer in a fixed itinerary JSON and to know today\'s flight prices. Which split of work is right?', [
        ['Format from prompting or fine-tuning; prices fetched at run time by a tool', true],
        ['Both from a weekly fine-tune, since prices change only a few times a week', false],
        ['Both from retrieval, since a fixed JSON format is a kind of fact to look up', false],
        ['Prices from a fine-tune, format from retrieval of example itineraries', false],
      ], 'A stable output format is behaviour, which prompting or fine-tuning handles; prices change constantly and must come from a live source at request time. Weekly fine-tunes are stale and uncitable, retrieval does not enforce a format, and the last option swaps the tools round.'),
      mcq('A row\'s rendered training text ends with the assistant\'s JSON but no end-of-turn token. What will the fine-tuned model tend to do?', [
        ['Keep generating after its answer, since it never learnt where a reply stops', true],
        ['Refuse to answer, since the template marks the row as incomplete', false],
        ['Return empty output, since the trainer drops rows without an end token', false],
        ['Nothing different, since the server adds the end token at inference time', false],
      ], 'The model learns to stop by predicting the end-of-turn token after each reply; without it, generation runs past the answer. Templates do not mark rows incomplete, the trainer does not drop them, and the server cannot add a token the model never learnt to produce.'),
      ck('DL_TRANSFORMERS', 'With r = 16 and lora_alpha = 32, by what factor is B @ A scaled before it is added to W?', [
        ['2, because the scale is alpha divided by r', true],
        ['32, because alpha is applied as the scale directly', false],
        ['0.5, because the scale is r divided by alpha', false],
        ['16, because the rank sets the size of the update', false],
      ], 'LoRA adds (alpha / r) × B @ A, so 32 / 16 = 2. Alpha alone is not the multiplier, the ratio is not inverted, and r sets the shape of the matrices, not the scale.'),
      ck('DL_TRANSFORMERS', 'Why can QLoRA fine-tune a 7B model on a 16 GB GPU when 16-bit LoRA cannot?', [
        ['The frozen base is stored in 4-bit, cutting its weights to about 4 GB', true],
        ['QLoRA trains a quarter as many adapter parameters as standard LoRA does', false],
        ['QLoRA keeps the base model on the CPU and moves one layer at a time', false],
        ['QLoRA skips gradients for the attention layers to save their memory', false],
      ], 'In 16-bit the 7B weights alone are about 14 GB; NF4 storage brings them to about 4 GB, leaving room for adapters and activations. The adapter size is the same, the base stays on the GPU, and gradients still flow through every layer to the adapters.'),
      mcq('In an SFT run on prompt-completion data, which tokens count towards the loss by default in TRL?', [
        ['Only the completion tokens, with the prompt tokens masked to -100', true],
        ['Every token, prompt and completion alike, unless you mask them yourself', false],
        ['Only the system prompt, so that the model learns the instructions', false],
        ['Only the final token of each row, which is the end-of-turn marker', false],
      ], 'For prompt-completion datasets TRL masks the prompt by default, so the model is trained only on the reply (51 of 113 tokens in this topic\'s run). Messages-format data without assistant masking trains on everything, which is the bug to avoid.'),
      mcq('Training loss reaches 0.02 while validation loss is three times its lowest value. The run kept the final checkpoint. What should change first?', [
        ['Evaluate each epoch and keep the best checkpoint, with fewer epochs', true],
        ['Raise the learning rate so the model escapes the overfitted region', false],
        ['Increase the LoRA rank so the model has more room to generalise', false],
        ['Remove the validation set, since it disagrees with the training loss', false],
      ], 'Near-zero training loss with rising validation loss is overfitting; keeping the best validation checkpoint and training less is the direct fix. A higher learning rate or a bigger rank makes memorising easier, and dropping validation hides the problem.'),
      mcq('A fine-tune scores 97% intent accuracy on the test set, compared with 71% for the base model given no system prompt. What is missing before you can claim it helped?', [
        ['A comparison with the base model given your best prompt on the same set', true],
        ['A longer training run, to see whether accuracy reaches a full 100%', false],
        ['A second test set drawn from the same templates as the training data', false],
        ['The loss curve, which shows the true gain more reliably than accuracy', false],
      ], 'An unprompted base model is an easy bar; the claim needs the best cheap alternative — the well-prompted base — on the same data and decoding. More training, another leaky test set or a loss curve do not answer whether fine-tuning beat prompting.'),
      mcq('After fine-tuning, a model answers support chats well but now gets simple general questions wrong that the base model answered. What is this, and how do you catch it?', [
        ['Catastrophic forgetting; run a small general-ability set on both models', true],
        ['Overfitting on the test set; replace the test set with new chats', false],
        ['A chat-template mismatch; re-render the prompts with the default template', false],
        ['Quantisation loss; serve the model in 32-bit instead of 16-bit precision', false],
      ], 'Losing general ability after narrow training is catastrophic forgetting, measured by running a fixed general set on base and fine-tune. It is not about the support test set, a template mismatch would also hurt support answers, and the model was not quantised.'),
      mcq('You serve the adapter with vLLM and the console sends model="base-model-id" in each request. Replies look like the unadapted base model. What is wrong?', [
        ['Requests must name the LoRA module, or vLLM serves the base model alone', true],
        ['vLLM cannot apply LoRA adapters, so the adapter must be merged first', false],
        ['The adapter needs a 4-bit base under vLLM, so it was silently skipped', false],
        ['The console must send the adapter weights in the body of each request', false],
      ], 'With --enable-lora and --lora-modules name=path, the OpenAI-compatible server applies an adapter only when the request\'s model field uses that name; the base id gets the plain base model. vLLM does support LoRA, needs no 4-bit base, and never receives weights in requests.'),
      mcq('You merge an adapter, convert the model to a 4-bit GGUF for Ollama, and ship it after evaluating only the unmerged adapter. What is the risk?', [
        ['The served 4-bit build was never evaluated and may have lost task accuracy', true],
        ['Merged models cannot be converted to GGUF, so Ollama will fail to load it', false],
        ['Ollama ignores merged weights and runs the original base model instead', false],
        ['The adapter is applied twice at run time, doubling the size of its effect', false],
      ], 'Quantising to 4-bit changes the weights, and exact tasks such as JSON fields can degrade, so the build you serve must be evaluated itself. Merged models convert to GGUF normally, Ollama runs what you imported, and a merged model has no separate adapter to apply twice.'),
    ],
  },
];
