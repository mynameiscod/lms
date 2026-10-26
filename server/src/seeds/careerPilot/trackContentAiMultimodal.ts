/**
 * Career-track content: Multimodal AI (AI_MULTIMODAL), the AI tracks, batch AI2.
 * Images in (vision-language models), documents in (invoices, forms, scans, with the model's reading
 * checked in code), speech in and out (transcription, word error rate, text-to-speech), images out
 * (diffusion, editing, and India's likeness, copyright and labelling concerns) and retrieval over decks
 * and reports that mix text, tables and figures. Builds on the shared AI core (AI_LLM_INTERNALS,
 * AI_RAG_DEEP, AI_EVAL_SAFETY, AI_PRODUCTION) and JT_AI_PY, which are referred back to, not re-taught.
 * Every snippet that needs no key was run in a venv (Pillow, Pydantic, jiwer, transformers with a tiny
 * Whisper checkpoint and an MMS text-to-speech model, sentence-transformers clip-ViT-B-32 and
 * all-MiniLM-L6-v2, Chroma in memory); printed output is real. Hosted calls are written against the
 * OpenAI Python SDK and say they need a key. No prices and no hosted model names: models come from
 * configuration (VISION_MODEL, STT_MODEL, TTS_MODEL, IMAGE_MODEL).
 * Skills: GENAI_APP_PATTERNS by default; LLM_FUNDAMENTALS for VISION_INPUTS and SPEECH.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_AI_MULTIMODAL_BUNDLES: PilotBundle[] = [
  /* ── VISION_INPUTS ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_MULTIMODAL_VISION_INPUTS',
    notes: `A vision-language model (VLM) is the decoder you met in How LLMs Work with one extra front end.
An **image encoder** cuts the picture into small patches, turns each patch into a vector, and a
projection layer maps those vectors into the same space as text-token embeddings. From then on the
model attends over "image tokens" and text tokens alike and predicts the next text token. Three
engineering facts follow directly from that design:

- **An image costs tokens.** More patches mean more tokens, more cost and more latency.
- **Detail depends on resolution.** The provider resizes your image and often splits it into tiles.
  Text that is 8 pixels tall after resizing is simply not there for the model to read.
- **It is still a text predictor.** When a field is blurred, the model does not say "blurred" by
  default; it predicts a plausible value. Plausible is not the same as correct.

## What it reads well, and badly

Good: describing a scene, reading clear printed text, screenshots of apps and error dialogs, the
gist of a chart, classifying a photo (damaged parcel or not), comparing two images side by side.

Weak: small or faint text, exact counts ("how many bottles on the shelf"), precise positions and
measurements, rotated or upside-down pages, handwriting, dense tables, and small Indic-script text.
Plan the feature around the strengths and put a check behind every weakness you cannot avoid.

## Sending an image

Two ways: a public **URL** the provider fetches, or the bytes inline as a **base64 data URL**. For
private data (a customer's KYC photo, an internal screenshot) use base64 or a short-lived signed URL;
never make the file public just so a model can fetch it. Resize on your side first: you pay for
pixels the provider will throw away anyway, and the request gets smaller.

    import base64, io
    from PIL import Image, ImageOps

    def to_data_url(path: str, max_side: int = 1536) -> str:
        im = ImageOps.exif_transpose(Image.open(path))   # honour the phone's rotation flag
        im = im.convert("RGB")
        im.thumbnail((max_side, max_side))                # keeps aspect ratio, only shrinks
        buf = io.BytesIO()
        im.save(buf, format="JPEG", quality=85)
        b64 = base64.b64encode(buf.getvalue()).decode("ascii")
        print("resized to", im.size, "-", len(buf.getvalue()), "bytes,", len(b64), "base64 chars")
        return f"data:image/jpeg;base64,{b64}"

Run on a 3000 x 4000 phone photo (190,348 bytes), it printed:

    resized to (1152, 1536) - 28625 bytes, 38168 base64 chars

Base64 adds a third (28,625 x 4/3 = 38,167, rounded up to a multiple of 4). The image goes into a
user message as one **content part** next to the text part:

    messages = [
        {"role": "system", "content": "You read product labels. Reply only with JSON."},
        {"role": "user", "content": [
            {"type": "text", "text": "Extract mrp_rupees and best_before (MM/YYYY) from this label."},
            {"type": "image_url", "image_url": {"url": url, "detail": "high"}},
        ]},
    ]

The Responses API uses \`{"type": "input_text", ...}\` and \`{"type": "input_image", "image_url": url}\`
instead; the idea is identical. \`detail\` ("low", "high", "auto") trades tokens for resolution. Low
detail is a small fixed budget, fine for "is this a photo of a parcel?" and useless for reading an MRP.

## Resolution and cost, measured

Do not guess image tokens. The provider's vision page explains its resizing and tiling, but the
reliable number is the one it bills: send the same prompt with and without the image and compare
\`usage.prompt_tokens\`. Do it for your real image sizes at each detail level, then multiply by the
price per million input tokens from the price page. Cropping to the region that matters (the label,
not the whole shelf) usually beats sending a bigger image: fewer tokens, and the text is larger.

## Structured output about an image

Everything from Generative AI in Python still applies: a Pydantic schema, schema-constrained output,
validation on your side. What changes is that a field may genuinely be unreadable, so the schema
must let the model say so:

    from pydantic import BaseModel, Field

    class ShelfLabel(BaseModel):
        product_name: str | None = Field(description="null if not printed or not legible")
        mrp_rupees: float | None = Field(description="the MRP as printed; null if not legible")
        best_before: str | None = Field(description="MM/YYYY; null if not legible")
        label_fully_visible: bool

    resp = client.chat.completions.parse(            # needs an API key
        model=VISION_MODEL, messages=messages, response_format=ShelfLabel, temperature=0)
    label = resp.choices[0].message.parsed

Then check it in code: MRP within a sane range for the category, best-before not in the past for
stock on the shelf, product name matching your catalogue (fuzzy match). A null is a good outcome; it
goes to a person. A confident wrong value is the outcome to design against.

## Checking accuracy

Accuracy for image extraction is **per field**, on a labelled set of your own images: 40–100 real
photos covering the bad cases (glare, angle, a thumb over the label, low light). For each field count
exact matches, nulls and confidently wrong values separately. "The model said it was 95% confident"
is not a measurement; models' self-reported confidence is poorly calibrated. Re-run the set whenever
the prompt, the resizing or the model changes, exactly as the evaluation topic taught.

## Privacy

Photos carry more than you asked for: faces in the background, an Aadhaar card on the table, a
phone number on a parcel. Under the DPDP Act that is personal data you are now processing and
possibly sending abroad. Crop to the region you need, blur faces when they are not the point, and
check the provider's data-retention terms before the first production image goes out.`,
    workedExample: `**Problem:** a distributor's field app asks sales reps in Pune to photograph shelf labels so the
system can record MRP and best-before date per product. The first version sends the whole shelf
photo at low detail and asks for "the MRP and expiry".

**Step 1 — build a labelled set.** 40 real photos, with the true MRP and best-before typed by a person.
Include the hard ones: glare from a tube light, labels at an angle, two products in one frame.

**Step 2 — measure per field, splitting the outcomes.** Suppose the first run gives:

    field        exact   null   wrong
    mrp           31      2      7
    best_before   18      9     13

MRP is 31/40 = 77.5% exact, but the number that matters is the **7 confidently wrong** values: they
go straight into the ledger. Best-before is worse: 13 wrong out of 31 answered (42%).

**Step 3 — find the cause before changing the prompt.** Looking at the 13 wrong dates: most are
small dot-matrix print. At low detail the whole shelf is squeezed into a small budget and the date
is a few pixels tall. That is a resolution problem, not a prompt problem.

**Step 4 — fix the input.** The app now asks the rep to frame one label, the server applies
\`ImageOps.exif_transpose\`, resizes to 1536 px on the long side and sends \`detail: "high"\`. The schema
gains \`label_fully_visible\` and nullable fields, and the prompt says "return null rather than guess".

**Step 5 — re-measure on the same 40 photos.**

    field        exact   null   wrong
    mrp           37      2      1
    best_before   30      8      2

Wrong values fall from 7 to 1 and from 13 to 2. The nulls (10 fields) go to a review screen that
shows the photo next to the empty field.

**Step 6 — add code checks for what is left.** MRP must be within the catalogue range for that SKU;
best-before must be after the delivery date. Both remaining wrong values would have failed one of
these, so they also reach the review screen. Cost is checked by comparing \`usage.prompt_tokens\` with
and without the image at the new size and multiplying by the price per million input tokens.

**Lesson:** the improvement came from the image (framing, rotation, resolution) and from allowing
"I can't read it", not from clever wording.`,
    mcqs: [
      mcq('A grocery app sends 4000 x 3000 shelf photos at "low" detail and the model keeps misreading the small best-before dates. Which change is most likely to help?', [
        ['Crop to the label, resize sensibly and send it at high detail', true],
        ['Raise the temperature so the model tries several different readings of it', false],
        ['Send the full-size photo unchanged so no pixels are lost', false],
        ['Add "read very carefully" in capitals to the system prompt', false],
      ], 'At low detail the image is squeezed into a small budget, so tiny text is gone before the model sees it. Cropping makes the text larger and high detail keeps it. Sending the full photo still gets resized by the provider, and neither temperature nor emphatic wording can recover pixels that are not there.'),
      mcq('A 30,000-byte JPEG is sent inline as a base64 data URL. Roughly how many characters does the base64 part add to the request?', [
        ['About 40,000, since base64 grows data by a third', true],
        ['About 30,000, since base64 keeps the byte count', false],
        ['About 15,000, since base64 compresses the image data as it encodes', false],
      ], 'Base64 encodes every 3 bytes as 4 characters, so 30,000 bytes become 40,000 characters. It is an encoding for safe transport in JSON, not a compression scheme, so the request always gets bigger than the file.'),
      mcq('A shelf-label schema has "mrp_rupees: float" with no null allowed, and blurry photos come back with neat but wrong prices. What is the best schema change?', [
        ['Make the field nullable and tell the model to return null when unreadable', true],
        ['Add a "confidence" float field and auto-accept any value scored above 0.9 by the model', false],
        ['Change the type to str so the model can copy the blur exactly', false],
      ], 'A required number forces the model to predict a plausible value even when it cannot read one. Allowing null gives it an honest way out, and nulls go to a person. Self-reported confidence is poorly calibrated, so a 0.9 threshold would still let confident wrong values through.'),
    ],
    checkpoint: [
      mcq('Why does sending a larger image to a vision-language model usually cost more input tokens?', [
        ['The image is cut into patches and each patch becomes tokens the model attends over', true],
        ['The provider charges by file size in bytes, regardless of the image dimensions', false],
        ['Larger images are converted into OCR text first, and that text is then billed', false],
      ], 'A VLM encodes an image as patch vectors projected into the token stream, so more pixels (up to the provider\'s resize limit) mean more image tokens. Billing follows tokens, not bytes, and a VLM does not run a separate OCR pass whose text is billed.'),
      mcq('A team wants to know exactly how many input tokens its typical 1536-pixel receipt photos cost at high detail. What is the most reliable way to find out?', [
        ['Send the same prompt with and without the image and compare prompt_tokens in usage', true],
        ['Multiply the file size in kilobytes by the provider\'s tokens-per-kilobyte ratio', false],
        ['Count the characters of the base64 string and divide that count by four', false],
      ], 'The usage field reports what you are billed, so the difference with and without the image is the image\'s real cost at that size and detail. Tokens are not derived from file size or base64 length; those numbers depend on compression, not on what the model sees.'),
      ck('GENAI_APP_PATTERNS', 'A KYC-assist feature photographs PAN cards at a bank branch. Which design best handles a card the model cannot read cleanly?', [
        ['Nullable fields, format checks in code, and any null or failure routed to staff', true],
        ['Retry the call up to five times and keep whichever reading appears most often overall', false],
        ['Ask for a confidence score and auto-accept everything that scores above 0.95', false],
      ], 'Unreadable inputs need a path to a person, and code checks catch values that look fine but are malformed. Majority voting over retries can agree on the same wrong reading, and self-reported confidence is not calibrated enough to gate identity data on.'),
    ],
  },

  /* ── DOCUMENT_AI ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_MULTIMODAL_DOCUMENT_AI',
    notes: `Accounts-payable teams in India receive invoices as digital PDFs, scanned PDFs, phone photos and
WhatsApp forwards. Document AI turns them into rows a ledger can trust. The model is one step of
five, and the steps around it are where reliability comes from.

## The pipeline

1. **Ingest and classify.** Check whether a PDF has a text layer first (\`pypdf\`'s \`extract_text()\`
   returns real text for a digital invoice). A digital invoice needs no OCR and no vision model to
   read characters; only scans and photos do. Then classify: invoice, credit note, delivery challan.
2. **Read.** OCR, a vision model, or both (below).
3. **Extract to a schema.** Pydantic model, schema-constrained output, nullable fields.
4. **Validate in code.** Formats, checksums, arithmetic, business rules.
5. **Route.** Clean documents go straight through; anything that fails a check goes to a person.

## OCR versus a vision model

- **An OCR engine** (Tesseract, PaddleOCR, a cloud document-OCR service) returns text with bounding
  boxes and per-word confidence. It is cheap, repeatable, can run on your own servers, and tells
  you *where* each word is. It does not know which number is the grand total.
- **A vision model** understands layout and labels, copes with hundreds of supplier templates, and
  returns JSON directly. But it can produce a plausible number that is not on the page, it usually
  gives no coordinates, it costs per page, and a hosted one takes the document off your network.
- **Hybrid** is common in production: OCR text plus the page image, both in the prompt, so the model
  maps labels to values and the OCR text keeps the characters honest. Coordinates from OCR let the
  review screen highlight the exact spot on the page.

## Validation the model cannot talk its way past

A GSTIN is 15 characters: a two-digit state code, the holder's 10-character PAN, an entity number,
the letter Z (by default) and a check character computed from the first 14. Format and checksum
catch most misreads:

    import re
    CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    GSTIN_RE = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$")

    def gstin_check_char(first14: str) -> str:
        total = 0
        for i, ch in enumerate(first14):
            product = CHARS.index(ch) * (2 if i % 2 else 1)
            total += product // 36 + product % 36
        return CHARS[(36 - total % 36) % 36]

    def validate_gstin(g: str) -> str | None:
        g = g.strip().upper()
        if not GSTIN_RE.match(g):
            return "bad format"
        if gstin_check_char(g[:14]) != g[14]:
            return f"checksum: expected {gstin_check_char(g[:14])}"
        return None

On a made-up but well-formed GSTIN and four misreadings of it:

    29AABCK1234M1ZG   -> None
    29AABCK1234M1Z0   -> checksum: expected G
    29AABCK1234M1Z    -> bad format
    29AABCK1234MIZG   -> checksum: expected Z
    29AABCK1243M1ZG   -> checksum: expected F

The fourth is the classic OCR swap, "1" read as "I": the format allows a letter there, the checksum
does not. The fifth swaps two digits and is caught too. A valid checksum proves the string is
well-formed, not that it belongs to this supplier; match it against your vendor master as well.

Then the arithmetic. Use \`Decimal\`, never \`float\`, for money:

    def reconcile(inv: Invoice, tol=Decimal("1.00")) -> list[str]:
        problems = []
        for i, it in enumerate(inv.items, 1):
            if abs(it.quantity * it.unit_price - it.amount) > tol:
                problems.append(f"line {i}: {it.quantity} x {it.unit_price} = "
                                f"{it.quantity * it.unit_price}, invoice says {it.amount}")
        lines = sum((it.amount for it in inv.items), Decimal("0"))
        if abs(lines - inv.taxable_value) > tol:
            problems.append(f"lines sum to {lines}, taxable value says {inv.taxable_value}")
        computed = inv.taxable_value + inv.cgst + inv.sgst + inv.igst
        if abs(computed - inv.grand_total) > tol:
            problems.append(f"taxable + tax = {computed}, grand total says {inv.grand_total}")
        return problems

The tolerance of one rupee allows for rounding on the printed invoice. Add the rules your finance
team already applies: an invoice charges IGST (inter-state) or CGST plus SGST (intra-state), never
both; the invoice date is not in the future; the invoice number is not already in the ledger for
this supplier (duplicates are the commonest real fraud).

## Human review, designed

Route on **evidence**, not on the model's self-reported confidence: any validation failure, any null
in a required field, an amount above a threshold, a supplier seen for the first time. The review
screen shows the page crop next to each field (OCR boxes make that possible) so a reviewer checks
in seconds rather than re-typing. Every correction is saved: it is your next evaluation case. And
sample a small share of the auto-approved invoices every week, because a pipeline that never sends
anything to review has stopped being checked, not started being perfect.

## Measuring it

Field-level accuracy on a labelled set of real invoices (one per supplier template, plus scans and
photos), the share auto-approved, and the error rate among the auto-approved, which must stay near
zero. The straight-through rate is the business number; the auto-approved error rate is the one that
stops you being trusted with the ledger.`,
    workedExample: `**Problem:** an invoice from a Bengaluru kitchenware supplier is extracted by a vision model into
this Pydantic model (abridged):

    class Invoice(BaseModel):
        invoice_number: str = Field(min_length=1, max_length=16)
        invoice_date: date
        supplier_gstin: str              # field_validator calls validate_gstin
        items: list[LineItem] = Field(min_length=1)
        taxable_value: Decimal
        cgst: Decimal = Decimal("0")
        sgst: Decimal = Decimal("0")
        igst: Decimal = Decimal("0")
        grand_total: Decimal

The model returned JSON with two lines: 12 tiffin boxes at 450.00 = 5400.00 and 6 bottles at 620.00 =
3720.00, taxable value 9120.00, CGST and SGST 820.80 each (9% of 9120), grand total 10761.60.

**Step 1 — parse and validate.**

    inv = Invoice.model_validate_json(model_output)
    print("parsed:", inv.invoice_number, inv.grand_total, len(inv.items), "items")
    print("reconcile:", reconcile(inv))

printed:

    parsed: KT/24-25/0187 10761.60 2 items
    reconcile: []

Clean: straight through.

**Step 2 — the misread.** On a crumpled scan of the same invoice the model read the second amount as
3270.00. The JSON is valid and every field has the right type; nothing in the schema can object.
Reconciliation does:

    reconcile misread: ['line 2: 6 x 620.00 = 3720.00, invoice says 3270.00',
                        'lines sum to 8670.00, taxable value says 9120.00']

Two independent checks disagree with the extracted amount. The invoice goes to review with line 2
highlighted; the reviewer sees 3720 on the page and corrects it in one click.

**Step 3 — a bad GSTIN.** Another extraction returned the supplier GSTIN ending in 6 instead of G:

    ('supplier_gstin',) -> Value error, GSTIN 29AABCK1234M1Z6: checksum: expected G

**Step 4 — save the corrections.** Both documents and their corrected values go into the evaluation
set, tagged "scan" and "checksum". Next month's prompt or model change is tested against them.

**Lesson:** the model did the reading; the arithmetic and the checksum decided whether the reading
could be trusted.`,
    mcqs: [
      mcq('An accounts team receives a mix of e-mailed PDF invoices generated by billing software and phone photos from small vendors. What should the pipeline check first?', [
        ['Whether each PDF has a text layer, so digital ones skip OCR entirely', true],
        ['Whether a vision model can be used for every file to keep one code path', false],
        ['Whether OCR confidence is high enough on the generated PDFs as well', false],
        ['Whether each phone photo can be converted to PDF before extraction', false],
      ], 'A PDF from billing software already contains its exact text, so extracting it is free and error-free; only scans and photos need OCR or a vision model. Forcing everything through a vision model adds cost and misreads to files that had perfect text, and wrapping a photo in a PDF does not give it a text layer.'),
      mcq('A model reads a GSTIN as 29AABCK1234MIZG, with the letter I where the printed invoice has the digit 1. Which check catches it?', [
        ['The check character, because the format alone allows a letter there', true],
        ['The 15-character length check that runs before any other validation', false],
        ['The regex, because that position only ever accepts a digit from 1 to 9', false],
      ], 'The entity-number position accepts 1–9 or A–Z, so "I" is well-formed and the length is still 15. The check character, computed from the first 14 characters, changes when any of them changes, so the misread fails the checksum.'),
      mcq('Line amounts summed with Python floats give 5999.700000000001 for three items of 1999.90, and the equality check against 5999.70 fails. What is the right fix?', [
        ['Parse money as Decimal and compare within a stated rupee tolerance', true],
        ['Round every amount to one decimal place before adding them together', false],
        ['Convert everything to int rupees by truncating the paise completely', false],
      ], 'Binary floats cannot represent most decimal fractions exactly, so sums drift. Decimal keeps paise exact, and a small tolerance allows for rounding printed on the invoice. Rounding to one place or dropping paise throws away real money and makes genuine mismatches invisible.'),
    ],
    checkpoint: [
      mcq('In an invoice pipeline, which signal is the best reason to send a document to human review?', [
        ['A failed reconciliation or checksum, or a required field returned as null', true],
        ['The model\'s self-reported confidence for the document falling below 0.8', false],
        ['The document being longer than one page, whatever the extraction says', false],
      ], 'Validation failures and nulls are evidence that something is wrong with the reading. A model\'s self-reported confidence is poorly calibrated, and page count says nothing about whether this particular extraction is correct.'),
      mcq('Why do many production document pipelines give the vision model both the page image and OCR text?', [
        ['The model maps labels to values while OCR keeps characters and positions honest', true],
        ['It doubles the context, which forces the model to answer more slowly and carefully', false],
        ['OCR text is what the provider bills for, so the image then becomes free to send', false],
      ], 'A vision model is good at layout ("this number is the grand total"), and OCR is good at exact characters with coordinates for the review screen. More context does not make a model more careful, and the image is billed in tokens regardless.'),
      mcq('An invoice pipeline has sent nothing to review for three weeks. What should the team conclude and do?', [
        ['Nothing proves it is right; audit a sample of auto-approved invoices', true],
        ['The model has become reliable; switch off the review screen to save staff time', false],
        ['The thresholds are too strict; loosen them so the queue stays empty for good', false],
      ], 'An empty review queue can mean the checks stopped firing (a changed template, a broken validator), not that the readings are perfect. Sampling auto-approved invoices is the only way to measure the error rate among them. Loosening thresholds or removing review makes the blind spot worse.'),
    ],
  },

  /* ── SPEECH ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_MULTIMODAL_SPEECH',
    notes: `A voice feature is three models in a row: speech-to-text (STT), the LLM you already know, and
text-to-speech (TTS). Each adds error and latency, and each needs its own measurement.

## How Whisper-style transcription works

Audio is resampled to 16 kHz mono and turned into a **log-mel spectrogram**: a picture of which
frequencies are loud at each moment. An encoder reads about 30 seconds of it at a time; a decoder,
the same kind as an LLM's, generates the transcript as text tokens. So the behaviour you learnt for
LLMs carries over: it predicts plausible words, it can be steered with a prompt, and on silence or
noise it can **hallucinate** text that was never spoken (repeated phrases, a polite sign-off). Cut
silence with voice-activity detection before transcribing, and treat a transcript as a reading, not
a fact.

## Transcribing locally

A tiny Whisper checkpoint runs on a laptop CPU through Hugging Face transformers. Passing a NumPy
array avoids needing ffmpeg to decode files:

    import soundfile as sf
    from transformers import pipeline

    asr = pipeline("automatic-speech-recognition", model="openai/whisper-tiny")
    audio, sr = sf.read("reply.wav", dtype="float32")            # mono, 16 kHz
    out = asr({"raw": audio, "sampling_rate": sr}, return_timestamps=True,
              generate_kwargs={"language": "english", "task": "transcribe"})
    print(out["text"])
    for c in out["chunks"]:
        print(c["timestamp"], c["text"])

The audio was made by a local TTS model from "Your refund of two thousand rupees has been processed.
It will reach your bank account in three working days." It printed:

     Your refund of 2,000 rupees has been processed it will reach your bank account in free working days.
    (0.0, 6.0)  Your refund of 2,000 rupees has been processed it will reach your bank account in free working days.

Two different kinds of difference: "2,000" is a formatting choice, "free" for "three" is a real error,
and on a refund promise it is the word that matters most. A larger checkpoint makes fewer errors and
is slower; that trade is measured, not assumed.

The hosted equivalent (needs a key):

    with open("call.wav", "rb") as f:
        tr = client.audio.transcriptions.create(
            model=STT_MODEL, file=f, language="en",
            prompt="UPI, NEFT, IFSC, Paytm, PhonePe, KYC",    # vocabulary hint
            response_format="verbose_json", timestamp_granularities=["segment"])
    for seg in tr.segments:
        print(seg.start, seg.end, seg.text)

The \`prompt\` is a hint of style and vocabulary: listing UPI, IFSC and your product names makes them
much likelier to be spelt right.

## Indian accents and code-mixed speech

Large multilingual models handle Indian-accented English well; small ones much less so. Code-mixed
speech ("mera refund abhi tak nahi aaya, please check karo") is harder: there is no single language
setting for Hinglish, and the output script varies (Devanagari, Latin, sometimes Urdu script for
the same words). Decide what script your downstream code expects, try the language setting both
ways on your own recordings, and normalise. For Indian languages beyond Hindi, test models built for
them: AI4Bharat publishes open Indian-language speech models and the government's Bhashini platform
offers speech services; benchmark them on your audio alongside the general models.

## Timestamps and speaker labels, in outline

Segment timestamps come with the transcript. **Diarisation** (who spoke when) is usually a separate
model, such as pyannote, whose speaker turns are merged with the transcript by overlapping times.
Call-centre analytics need it ("did the agent read the disclosure?"); a voice bot talking to one
person often does not.

## Word error rate

WER = (substitutions + deletions + insertions) / words in the reference. With jiwer:

    import jiwer
    ref = "my upi payment of two thousand rupees failed but the money was debited"
    hyp = "my up payment of 2000 rupees failed but money was debited"
    o = jiwer.process_words(ref, hyp)
    print(f"WER={o.wer:.3f}", f"S={o.substitutions} D={o.deletions} I={o.insertions}")

    WER=0.308 S=2 D=2 I=0

Four rules make WER meaningful. **Normalise first**: lower-case, strip punctuation and agree on how
numbers are written. On the refund audio, scoring with only case and punctuation removed gave
\`WER: 0.158\` (3 errors in 19 words), and two of those three are "two thousand" against "2000". With
numbers normalised, the one real error, "free", is what remains. **Compute corpus WER**, total errors
over total words, not the mean of per-utterance WERs: for a 2-word and a 12-word utterance with one
error in the short one, jiwer gave corpus 0.077 against a mean of 0.25. **Report it per slice**:
accent, noise, phone versus headset, Hinglish versus English. **Weight what matters**: an error in
an amount or a date is worse than a dropped "the", so track entity accuracy alongside WER. For
scripts with uncertain word boundaries, character error rate (\`jiwer.cer\`) is fairer.

## Text-to-speech for replies

    with client.audio.speech.with_streaming_response.create(       # needs a key
            model=TTS_MODEL, voice=VOICE, input=reply_text, response_format="mp3") as r:
        r.stream_to_file("reply.mp3")

Locally, an MMS VITS model in transformers produced 6.14 seconds of 16 kHz audio for the refund sentence.
Write replies for the ear: short sentences, amounts spelt the way a person says them ("two thousand
rupees", not "Rs.2,000/-"), no tables or markdown. Test how Indian names and place names sound.

## The latency budget

The silence a caller hears is STT finishing, plus the LLM's first tokens, plus TTS producing the
first audio. Stream each stage into the next: transcribe in chunks, stream LLM tokens, and start
speaking the first sentence while the rest is generated. Measure the gap per stage with the tracing
you set up in the production topic. And tell callers they are being recorded and by whom: a voice
recording is personal data under the DPDP Act, and cloning anyone's voice needs their consent.`,
    workedExample: `**Problem:** a lending app's voice bot transcribes Hinglish support calls. The team reports "WER
22%, good enough" from one number averaged over 300 calls. Complaints say the bot mishears amounts.

**Step 1 — check how the number was computed.** It was the mean of per-call WERs, scored on raw text.
Recompute as corpus WER (total errors / total reference words) after a normaliser that lower-cases,
strips punctuation and writes numbers one agreed way:

    tf = jiwer.Compose([jiwer.ToLowerCase(), jiwer.RemovePunctuation(),
                        jiwer.RemoveMultipleSpaces(), jiwer.Strip(),
                        jiwer.ReduceToListOfListOfWords()])
    jiwer.wer(refs, hyps, reference_transform=tf, hypothesis_transform=tf)

(numbers are mapped to words by your own function before this step).

**Step 2 — slice it.** Suppose corpus WER comes out like this:

    slice                   calls   words   errors   WER
    English, headset          90    9,000      630   7.0%
    Hinglish, headset        120   12,000    1,560  13.0%
    Hinglish, phone speaker   90    7,500    1,800  24.0%
    overall                  300   28,500    3,990  14.0%

Overall is 3,990 / 28,500 = 14.0%; the "22%" was inflated by many short calls where one error is a
large share. But one slice is far worse than the rest.

**Step 3 — measure the words that matter.** Tag every amount, date and loan number in the references
and count how many came through exactly: suppose 91% in English but 68% on speaker-phone Hinglish.
That matches the complaints better than any WER number.

**Step 4 — fix the cause in that slice.** Add a vocabulary prompt ("EMI, NACH, UPI, foreclosure"),
run voice-activity detection to drop silence, and test a larger checkpoint and an Indian-language
model on the speaker-phone slice only. Most importantly, the bot now **reads amounts back** ("Did you
say four thousand five hundred rupees?") before acting on them.

**Step 5 — re-measure the same slices** and keep the table in the release notes, so next month's model
change is compared slice by slice, not on one blended number.`,
    mcqs: [
      mcq('A reference transcript has 20 words. The system output has 2 substituted words, 1 missing word and 1 extra word. What is the word error rate?', [
        ['20%, because all three kinds of error count over 20 reference words', true],
        ['15%, because inserted extra words are not counted against the system at all', false],
        ['10%, because only substituted words are counted as genuine errors', false],
      ], 'WER is (S + D + I) / N = (2 + 1 + 1) / 20 = 0.20. Insertions count: a transcript that adds words is wrong too. Counting only substitutions would hide both dropped and invented words.'),
      mcq('A Whisper-style model transcribes 40 seconds of hold music and returns a polite closing sentence that nobody said. What is the most effective fix?', [
        ['Run voice-activity detection and skip segments that contain no speech', true],
        ['Set the language parameter to English so it stops inventing words there', false],
        ['Lower the audio sample rate so the background music becomes much quieter', false],
      ], 'The decoder predicts plausible text even when there is no speech, so the fix is not to give it non-speech audio. The language setting does not stop hallucination on music, and resampling changes quality, not whether music is present.'),
      mcq('A support bot\'s replies read out "Rs.2,000/- will be credited by 15-11" in a confusing way. What should the reply step do before TTS?', [
        ['Rewrite the text for speech: "two thousand rupees by the fifteenth of November"', true],
        ['Switch to a different voice so that the punctuation and dates are pronounced more clearly', false],
        ['Send the text with markdown bold on the amount so it is spoken with stress', false],
      ], 'TTS reads the characters it is given, and abbreviations and date shorthand are ambiguous aloud. Writing the reply the way a person says it fixes the cause. A new voice still reads the same ambiguous text, and markdown is not speech emphasis.'),
    ],
    checkpoint: [
      mcq('What does a Whisper-style speech model actually take as its input before the encoder?', [
        ['A log-mel spectrogram of the audio, resampled to 16 kHz mono, in 30-second windows', true],
        ['The raw MP3 bytes, which the encoder reads directly as if they were text tokens', false],
        ['A phoneme sequence produced first by a separate pronunciation dictionary model', false],
      ], 'Audio is resampled and converted into a log-mel spectrogram, which the encoder reads in windows of about 30 seconds; the decoder then generates text tokens. Compressed bytes are decoded first, and Whisper-style models do not use a separate phoneme stage.'),
      mcq('Two utterances: one of 2 words with 1 error, one of 12 words with no errors. Which WER should a team report for the set?', [
        ['Corpus WER, 1/14 or about 0.07, because it weights every reference word equally', true],
        ['The mean of per-utterance WERs, 0.25, because each call should count exactly the same', false],
        ['The best utterance\'s WER, 0.0, because it shows what the system can achieve', false],
      ], 'Corpus WER divides total errors by total reference words, so a short utterance cannot dominate the figure; jiwer gives 0.077 here against a mean of 0.25. Averaging per-utterance rates overweights short calls, and reporting the best case is not a measurement.'),
      ck('GENAI_APP_PATTERNS', 'A voice bot feels slow: callers wait in silence after they stop speaking. Which change cuts the gap most?', [
        ['Stream every stage and start speaking the first sentence while the rest is generated', true],
        ['Wait for the complete LLM reply so TTS can produce the whole answer in one request', false],
        ['Transcribe the whole call at the end so the speech model sees all of the context', false],
      ], 'The silence is the sum of STT, the LLM\'s first tokens and TTS\'s first audio, so overlapping the stages shrinks it. Waiting for the full reply or the full call adds every stage end to end, which is exactly what makes the bot feel slow.'),
    ],
  },

  /* ── IMAGE_GENERATION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_MULTIMODAL_IMAGE_GENERATION',
    notes: `Generated images show up in real products: banner variations for a festive sale, product shots on
a clean background, illustrations for a learning app, "try this sofa in your room" previews. The
engineering is easy; the judgement about what you may generate is where teams get into trouble.

## Diffusion, in outline

A diffusion model is trained by taking real images, adding noise step by step until only noise is
left, and teaching a network to predict and remove the noise at each step. Generation runs that in
reverse: start from random noise and denoise over a number of steps, with each step **conditioned**
on an embedding of your text prompt. Most current models work in a compressed **latent** space rather
than on pixels, which makes them fast enough to serve.

Settings you will meet with open models (Hugging Face diffusers):

- **Steps**: more denoising steps, more detail and more time; past a point, no visible gain.
- **Guidance scale**: how strongly the prompt steers each step. Too low drifts off the prompt, too high
  gives harsh, over-saturated images.
- **Seed**: the starting noise. Same seed, prompt and settings give the same image on the same setup,
  which is how you reproduce a result a designer liked.
- **Negative prompt**: what to steer away from ("blurry, extra fingers, watermark").

Some hosted APIs generate images with a model that is part of a larger multimodal LLM rather than a
classic diffusion pipeline; the product questions below are the same either way.

## Prompting for images

An image prompt is a brief to an illustrator: **subject**, **setting**, **style**, **composition**
(framing, angle, empty space for a headline), **lighting**, **colour palette**, **aspect ratio**.
"A brass diya on a dark wooden table, warm side light, shallow depth of field, empty space on the
right for text, product photography" works; "Diwali image" gets you a cliché. Keep brand prompts as
versioned templates, like any other prompt.

Text inside generated images has improved but is still unreliable, worst for Indic scripts. Generate
the picture without text and draw the headline, price and offer in your own layout code with a real
font. The price on a banner must be exactly right, so it should never be generated.

## The API

    resp = client.images.generate(                     # needs a key
        model=IMAGE_MODEL,
        prompt=prompt,
        size="1024x1024",
        n=1,
    )
    img = resp.data[0]          # b64_json or url, depending on the model and settings

Editing (**inpainting**) takes the original image, a **mask** marking the region to change, and a
prompt for that region: replace the background behind a product, remove a stray object, extend a
picture to a wider banner (outpainting).

    resp = client.images.edit(model=IMAGE_MODEL, image=open("sofa.png", "rb"),
                              mask=open("mask.png", "rb"), prompt="a sunlit Mumbai flat, white walls")

Read the parameter list for your model on the provider's page: supported sizes, output formats and
which edit options exist differ between models. Locally, diffusers' \`AutoPipelineForText2Image\` runs
open models on a GPU with the steps, guidance and seed above.

## Likeness: real people need consent

Generating or editing an image of a **real, identifiable person** is where most of the harm is:
deepfakes of film stars endorsing products they never touched, a colleague's photo edited into
something humiliating, a politician "saying" something before an election. In India, courts have
granted well-known people orders protecting their name, image, voice and likeness from unauthorised
commercial use and from AI imitation, and a photograph of a person is personal data under the DPDP
Act. For a product feature this means:

- **Written consent** from the person, for that purpose, before using their face or voice, and a way
  to withdraw it. A model release from a photo shoot does not automatically cover AI variations.
- **Block named public figures** in prompts and refuse uploaded photos of people for edits unless
  the uploader is that person and has agreed to the terms.
- **No sexual content involving real people, and nothing involving minors, ever.** Moderate both the
  prompt and the generated output; providers do this too, and you should not rely on theirs alone.

## Copyright

Who owns an AI-generated image, and whether it can be protected by copyright at all, is unsettled in
Indian law and differs between countries. Meanwhile some risks are clear: prompting "in the style of"
a living illustrator for commercial work invites a dispute, reproducing a recognisable character or
a competitor's logo is infringement whatever tool drew it, and uploading copyrighted photos to edit
needs the rights to them. Keep the prompt, model, seed and date with each asset so you can show how
it was made, and have legal review the provider's terms on output ownership and indemnity.

## Labelling generated content

The Indian government has issued advisories and amended rules for online platforms pushing towards
clear labels on synthetically generated content, including deepfakes; check the current text with
your legal team before launch rather than relying on a summary. Good practice that meets the spirit
everywhere: a visible "AI-generated" label where users will see the image, provenance metadata
embedded in the file (the C2PA "content credentials" standard is widely supported), and never
stripping the provider's own markers. Inside the company, log every generation: who asked, the
prompt, the output, and what was published.`,
    workedExample: `**Problem:** a D2C ethnic-wear brand wants a feature: marketers type a brief, the system makes festive
banner backgrounds, and shoppers can "see this saree on a model". The first prototype accepts any
prompt and any uploaded photo.

**Step 1 — split the feature by risk.**

    capability                         risk     decision
    backgrounds, props, patterns       low      allowed, logged
    products on a plain background     low      allowed; product photo is ours
    generated (non-real) models        medium   allowed; no named people, labelled
    edits of an uploaded person photo  high     only the shopper's own photo, with consent
    named celebrity or politician      high     refused

**Step 2 — keep the facts out of the picture.** The banner prompt template asks for "empty space on
the left third, no text, no logos". Headline, price and offer are drawn by the layout service with
the brand font, so ₹1,499 can never come out as ₹1,4999.

**Step 3 — guard the prompt and the output.** A prompt check refuses named public figures (a list
plus a classifier), "in the style of" plus an artist name, and competitors' brand names. Each output
goes through image moderation before anyone sees it.

**Step 4 — consent for "try it on yourself".** The upload screen says what will happen to the photo,
how long it is kept, and that it is not used for anything else; the shopper ticks consent, and can
delete it. Photos of anyone other than the shopper are not allowed by the terms, and a face check
against the account's profile photo is considered and rejected as too invasive; review of reports
handles abuse instead.

**Step 5 — label and record.** Every generated image carries a visible "AI-generated" tag in the
app and content-credential metadata in the file. A generations table stores user, prompt template
version, filled prompt, model, seed, output hash and publication status.

**Step 6 — get sign-off.** Legal reviews the provider's terms on output ownership and the current
labelling requirements; the decision table from Step 1 goes in the design document.`,
    mcqs: [
      mcq('A festive-sale banner needs the exact text "Flat 40% off till Sunday" in Hindi and English. What is the reliable way to produce it?', [
        ['Generate the picture with empty space and draw the text in layout code', true],
        ['Put the exact text in quotes in the prompt and regenerate until it is right', false],
        ['Generate in English only and ask the image model to translate it into Hindi', false],
      ], 'Text rendered by image models is still unreliable, especially in Indic scripts, and an offer must be exactly right. Drawing it with a real font is deterministic. Regenerating until it looks right wastes calls and still risks a wrong character slipping through review.'),
      mcq('With an open diffusion model, a designer loved one result and wants the same image tomorrow with only the colour palette changed. What must be kept?', [
        ['The seed, along with the model, steps and guidance used that day', true],
        ['Only the prompt text, as diffusion models give identical images each run', false],
        ['The negative prompt, which on its own fixes the composition between runs', false],
      ], 'Generation starts from random noise chosen by the seed; the same seed, prompt, model and settings reproduce the image. Without the seed the same prompt gives a different picture, and a negative prompt only steers away from things, it does not fix the starting point.'),
      mcq('A marketer asks the tool to put a famous cricketer into a product advert "as a fun mock-up for internal use only". What should the system do?', [
        ['Refuse: a real person\'s likeness needs their consent whatever the stated use', true],
        ['Allow it, because an internal mock-up is never published outside the company', false],
        ['Allow it with a visible "AI-generated" label in a corner of the advert image', false],
      ], 'Using a real person\'s likeness without consent is the core harm, and "internal only" mock-ups leak. Indian courts have protected celebrities\' likeness against unauthorised commercial and AI use. A label does not turn a non-consensual endorsement into a consensual one.'),
    ],
    checkpoint: [
      mcq('In outline, how does a diffusion model produce an image from a text prompt?', [
        ['It starts from noise and removes predicted noise step by step, guided by the prompt', true],
        ['It searches its stored training images for the closest match and then edits that picture', false],
        ['It predicts pixels left to right, top to bottom, the way an LLM writes text', false],
      ], 'Diffusion learns to remove noise; generation runs that in reverse from random noise, with each step conditioned on the prompt embedding. It does not retrieve and edit a stored image, and it is not a raster-order pixel predictor.'),
      mcq('Which practice best meets the expectation that AI-generated images in an Indian consumer app are identifiable as such?', [
        ['A visible label in the app plus provenance metadata such as content credentials', true],
        ['A sentence in the terms of service saying that some images may be AI-made', false],
        ['Stripping all metadata from images so that no personal data can leak out', false],
      ], 'Users should be able to tell at the point they see the image, and provenance metadata lets other platforms tell too. A line in the terms nobody reads does not label anything, and stripping metadata removes the very markers that identify synthetic content.'),
      mcq('A shopper uploads a photo of a friend to the "try the outfit on" feature. Which design handles this best?', [
        ['Terms limit uploads to the user\'s own photo, with consent recorded and reports reviewed', true],
        ['Accept any photo, because the friend is not a customer, has no account and agreed to nothing', false],
        ['Accept any photo but blur the face afterwards so nobody can recognise it', false],
      ], 'Editing an identifiable person\'s photo needs that person\'s agreement, and a photo is personal data under the DPDP Act. Having no account does not remove the friend\'s rights, and blurring the face defeats the feature while the edit still happens without consent.'),
    ],
  },

  /* ── MULTIMODAL_RAG ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_MULTIMODAL_MULTIMODAL_RAG',
    notes: `Real enterprise documents are not prose: a quarterly business review is 30 slides of charts, an
RBI-style circular has tables, a maintenance manual is diagrams with labels. Text-only RAG (which you
built properly in RAG in Depth) indexes the words around a chart and loses the chart. Multimodal RAG
keeps the figures searchable and lets the answer point at the figure that supports it.

## Three ways to index a mixed document

**1. Turn everything into text.** At ingestion, a vision model writes a caption for every figure
("Bar chart of monthly UPI volume, July to September; September highest") and converts every table to
markdown. Those become ordinary chunks with metadata pointing at the page and the image file. Your
existing embedding model, hybrid search and re-ranker all keep working. This is the default choice.

**2. One embedding space for images and text.** CLIP-style models embed images and text into the same
vector space, so a text query can retrieve an image directly. Useful for photos (product catalogues,
site-inspection photos); weak for charts and tables, as the measurements below show.

**3. Retrieve page images.** Newer retrievers embed a screenshot of each whole page and match the query
against it with late interaction (the ColPali family), skipping OCR and captioning. Strong on
visually rich pages, heavier to store and serve. Worth knowing; evaluate it on your documents before
adopting it.

## CLIP, measured

With sentence-transformers' \`clip-ViT-B-32\`, four simple drawn images (a bar chart, a pie chart, a page
of text lines and a grid table) and four text queries:

    model = SentenceTransformer("clip-ViT-B-32")
    img_emb = model.encode(images, convert_to_tensor=True, normalize_embeddings=True)
    q_emb = model.encode(queries, convert_to_tensor=True, normalize_embeddings=True)
    sims = util.cos_sim(q_emb, img_emb)

printed:

                                         bar.png    pie.png   text.png  table.png
    a bar chart                           0.289      0.294      0.236      0.263 -> pie.png
    a pie chart showing market share      0.250      0.332      0.189      0.217 -> pie.png
    a page of printed text                0.168      0.177      0.222      0.202 -> text.png
    a table with rows and columns         0.243      0.257      0.294      0.312 -> table.png

Three of four are right, but every score sits between 0.17 and 0.33, the margins are a few
hundredths, and "a bar chart" retrieved the pie chart. CLIP learnt from photos and their captions;
it sees "chart-like", not the numbers on the axes, so it cannot answer "which month was highest".

Worse, scores are not comparable across modalities. The same pie-chart query scored **0.332** against
the pie-chart image but **0.746** against an unrelated sentence ("Our revenue grew in every quarter of
the financial year."). Text-to-text similarities sit in a higher band than text-to-image ones, the
**modality gap**, so if images and text share one index under one ranking, text chunks win almost
every time. Keep image vectors in their own collection and merge result lists by rank (reciprocal
rank fusion from RAG in Depth), or caption the images and stay in text.

## Caption-then-embed, with the page kept

    ef = SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
    col = chromadb.EphemeralClient().create_collection(
        "deck", embedding_function=ef, configuration={"hnsw": {"space": "cosine"}})
    col.add(ids=[r[0] for r in rows], documents=[r[4] for r in rows],
            metadatas=[{"kind": r[1], "page": r[2], **({"image": r[3]} if r[3] else {})}
                       for r in rows])
    res = col.query(query_texts=[q], n_results=2)

Rows were a text chunk (page 2), a bar-chart caption (page 4), a markdown table (page 6) and a
pie-chart caption (page 7). Printed as (id, page, kind, similarity):

    Which month had the most UPI transactions? -> [('q3-p4-fig1', 4, 'figure', 0.635), ('q3-p2-text', 2, 'text', 0.297)]
    What share of complaints were about refunds? -> [('q3-p7-fig2', 7, 'figure', 0.584), ('q3-p2-text', 2, 'text', 0.233)]
    MDR for fuel -> [('q3-p6-table', 6, 'table', 0.51), ('q3-p4-fig1', 4, 'figure', 0.056)]

Each question found the right figure or table with a clear margin, and the metadata says which page
and which image file to show.

## Answering with the figure

Retrieval gives you chunks and their pages. For generation, send the retrieved text **and the image
of each retrieved figure** (or the whole page) to a vision model, so the answer is read from the
chart itself rather than from a caption that might have summarised away the number. Instruct it to
cite \`[page 4, figure 1]\` and to say when the figure does not show the answer. In the interface, show
the cited figure next to the answer: a person checks a chart in a second.

## What to get right at ingestion

- Store, per chunk: document, page, kind (text, table, figure), bounding box if you have one, the image
  path, and the caption model and prompt version.
- Caption with the surrounding text in the prompt (slide title, axis labels), and ask for numbers the
  chart shows, not adjectives.
- Keep tables as tables (markdown or HTML); flattening them into a sentence loses the rows.
- Scanned pages go through the document pipeline from Document AI first.
- Evaluate with the golden-set method from RAG in Depth: questions whose answer is only in a figure,
  only in a table, and only in text, with retrieval recall reported for each kind separately.`,
    workedExample: `**Problem:** a payments company wants an assistant over 40 quarterly-review decks. Text-only RAG
answers "What drove complaints in Q3?" with "Complaints were discussed on slide 7", because the answer
is in a pie chart and the only text on slide 7 is its title.

**Step 1 — build a golden set by kind.** 60 questions: 20 answered only by a chart, 20 only by a table,
20 only by text. Suppose text-only RAG gets recall@5 of 0.85 on text questions, 0.40 on tables (the
PDF parser flattened them) and 0.10 on charts.

**Step 2 — caption and convert at ingestion.** Each slide image goes to a vision model with the slide
title and this instruction: "Describe the chart type, axes, and every labelled value. Do not
interpret." Tables are extracted as markdown. Each becomes a chunk with page, kind and image path:

    q3-p7-fig2 | figure | p7 | q3/p7_fig2.png |
    "Pie chart of complaint reasons: failed payment 46%, refund delay 31%, KYC 23%."

**Step 3 — re-measure.** Suppose recall@5 becomes 0.86 on text, 0.80 on tables and 0.75 on charts. The
remaining chart misses are line charts with many unlabelled points, where captions are vague.

**Step 4 — answer from the image, not only the caption.** For retrieved figures, the generation call
sends the image itself plus the caption:

    content = [{"type": "text", "text": question_with_context}]
    for hit in figure_hits:
        content.append({"type": "image_url", "image_url": {"url": to_data_url(hit["image"])}})

with the instruction "Answer from the figures and text given. Cite [page N]. If they do not contain
the answer, say so."

**Step 5 — show the evidence.** The UI shows "Failed payments were the largest share of Q3 complaints
(46%) [page 7]" with the pie chart beside it.

**Step 6 — keep score by kind.** The golden set report now has three recall columns, so a parser or
caption-prompt change that breaks tables shows up as a table regression, not a blur in one number.`,
    mcqs: [
      mcq('A team puts CLIP image vectors and text-chunk vectors into one collection and ranks them together. Image results almost never appear. What is the most likely reason?', [
        ['Text-to-text scores sit in a higher band than text-to-image ones', true],
        ['CLIP image vectors use more dimensions, so they cannot be compared', false],
        ['The vector database silently drops vectors that came from images', false],
      ], 'This is the modality gap: in the run above an unrelated sentence scored 0.746 against a query while the matching image scored 0.332. Both vectors have the same dimension in CLIP, and databases do not drop vectors by source; ranking them together simply favours text.'),
      mcq('Users ask "which month had the highest UPI volume?" about bar charts in a deck. Which indexing approach most directly makes that answerable?', [
        ['A vision model captions each chart with its labelled values at ingestion', true],
        ['CLIP image embeddings, because they encode the bar heights of each chart', false],
        ['Indexing only the slide titles, because the chart sits under its title', false],
      ], 'A caption that states the values turns the chart into searchable, quotable text. CLIP encodes what the image looks like, not the numbers on its axes, and a slide title such as "Q3 volumes" does not contain the answer.'),
      mcq('A multimodal RAG answer quotes a percentage from a chart caption, and the caption turns out to have rounded it wrongly. What change prevents this?', [
        ['Send the retrieved figure image to the answering model alongside the caption', true],
        ['Ask the captioning model to write longer captions so that nothing is missed', false],
        ['Raise top-k so that more captions about the same chart are retrieved together', false],
      ], 'The caption exists for retrieval; the answer should be read from the source, the chart itself. Longer captions can still be wrong, and more captions about the same chart repeat the same mistake.'),
    ],
    checkpoint: [
      mcq('For a policy assistant over manuals full of tables and labelled diagrams, which indexing strategy should a team start with?', [
        ['Caption figures and convert tables to markdown, then reuse the text pipeline', true],
        ['Embed every page image with CLIP and drop the text layer to keep one index', false],
        ['Index the text only, and tell users to open the PDF whenever a diagram matters', false],
      ], 'Text-ifying figures and tables keeps hybrid search, re-ranking and evaluation from the text pipeline working, and covers what text-only RAG misses. CLIP alone is weak on tables and diagrams and throws away searchable text; ignoring figures leaves the hardest questions unanswered.'),
      mcq('Which metadata is most important to store with each figure chunk in a multimodal index?', [
        ['The document, page, image path and the caption prompt version used', true],
        ['The image width and height in pixels and the file\'s compression level', false],
        ['The vision model\'s confidence score for how well it read the chart', false],
      ], 'Page and image path let you cite and show the figure and send it to the answering model; the prompt version tells you which captions to regenerate when the prompt changes. Pixel size and compression rarely matter to answering, and self-reported confidence is not reliable.'),
      ck('LLM_FUNDAMENTALS', 'Why does a CLIP-style model retrieve photos of products well but struggle with "which quarter had the highest revenue" over bar charts?', [
        ['It learnt from photos and captions, so it encodes the look, not axis values', true],
        ['It can only embed square images, and bar charts are usually wide', false],
        ['Its text encoder ignores numbers, so any query with a number fails', false],
      ], 'CLIP was trained to match images with their captions, so it represents what an image depicts ("a bar chart") rather than the values plotted. It resizes non-square images, and numbers in a query do not make the text encoder fail; they simply have nothing to match in the image vector.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_MULTIMODAL_DEBUGGING',
    notes: `Multimodal bugs hide in the input (an image the model never saw properly, audio it should not
have been given), in the measuring (a WER that counts formatting), and in what you trusted the model
to do. Debug the input and the instrument before blaming the model. Each case below is a real failure
pattern; the outputs quoted were produced in a Python venv.

## 1. The receipt that was read sideways

**Symptom:** photos from one Android phone model come back with nonsense fields; the same receipts
photographed on another phone are fine. The images look upright in the gallery app.

**Cause:** the phone saves the pixels sideways and an EXIF orientation flag saying "rotate 90°". Gallery
apps honour the flag; \`Image.open\` followed by \`thumbnail\` and \`save\` does not, and saving drops the
flag. The model received a sideways receipt.

**Fix:** \`im = ImageOps.exif_transpose(Image.open(path))\` before resizing. Add three rotated photos to the
evaluation set so it cannot quietly come back.

## 2. "a bar chart" retrieves the pie chart

**Symptom:** a CLIP-indexed deck search returns the wrong chart for simple chart queries.

**Cause:** CLIP scores for chart images are low and close together. The real run:

    a bar chart                           0.289      0.294      0.236      0.263 -> pie.png

The bar chart lost to the pie chart by 0.005. CLIP encodes "looks like a chart", not which kind or
what it shows.

**Fix:** caption figures with a vision model and retrieve the captions; with captions, "a bar chart"
found the bar-chart figure with similarity 0.544. Use CLIP for photos, where it is strong.

## 3. Images that never win

**Symptom:** a single Chroma collection holds text chunks embedded with CLIP's text encoder and figures
embedded with its image encoder. Figures never appear in the top 5.

**Cause:** the modality gap. A query scored 0.746 against an unrelated sentence and 0.332 against the
matching image. Under one ranking, text always wins.

**Fix:** separate collections per modality, each queried for its own top-k, merged by rank (reciprocal
rank fusion), or captions in the text index instead.

## 4. A perfect transcript with a 16% WER

**Symptom:** the team listens to a test clip, finds one wrong word, and the report says WER 0.158.

**Cause:** the reference says "two thousand rupees", the transcript "2,000 rupees". After stripping
punctuation that is "two thousand" against "2000": one substitution plus one deletion. Only the third
error, "free" for "three", is a real mishearing.

**Fix:** normalise numbers (and dates, currency symbols, common spellings) the same way on both sides
before scoring, and keep a separate entity-accuracy check, because "free" for "three" in "three
working days" is the error that hurts.

## 5. The invoice with one problem, or two?

**Symptom:** the validation log for an invoice shows one error, a bad GSTIN. A reviewer fixes it, and
on re-validation a second error appears: IGST and CGST were both charged.

**Cause:** Pydantic runs \`model_validator(mode="after")\` only once every field has validated. With a
field error, the cross-field rule never ran, so the first report was not the full list:

    ('supplier_gstin',) -> Value error, GSTIN 29AABCK1234M1Z6: checksum: expected G

**Fix:** treat "these are all the problems" as false whenever field errors exist; after a correction,
always re-validate the whole document. Or run independent business checks (tax type, reconciliation)
in a separate function that works on the raw extracted dict too.

## 6. Totals that match on paper and fail in code

**Symptom:** three items of 1999.90 and a total of 5999.70; the check reports a mismatch.

**Cause:** \`sum([1999.9, 1999.9, 1999.9])\` is \`5999.700000000001\` in binary floating point, so
\`== 5999.7\` is \`False\`.

**Fix:** parse money as \`Decimal\` from the string the model returned, never via float, and compare within a
stated tolerance. Put a test on exactly this case.`,
    mcqs: [
      mcq('Receipts photographed on one phone model extract badly, though they look upright on the phone. Resizing with Pillow happens before sending. What is the likely cause?', [
        ['The EXIF orientation flag is ignored, so the model gets the image sideways', true],
        ['That phone\'s camera shoots at a lower resolution than the provider accepts', false],
        ['The JPEG quality setting in Pillow is too low for the model to read the text', false],
        ['That phone saves images as PNG, which vision models cannot read correctly', false],
      ], 'Many phones store sideways pixels plus a rotation flag; galleries honour it, Pillow\'s resize and save do not, and the flag is dropped. ImageOps.exif_transpose fixes it. Resolution and JPEG quality would affect every phone similarly, and PNG is a supported format.'),
      mcq('A test clip sounds perfectly transcribed apart from one word, yet jiwer reports WER 0.158 on 19 words. What should you check first?', [
        ['Whether numbers and formatting are normalised identically on both sides', true],
        ['Whether jiwer is counting characters instead of words by default here', false],
        ['Whether the audio sample rate was 16 kHz for the speech model\'s input', false],
        ['Whether the reference transcript was typed in a different language', false],
      ], 'Three errors in 19 words is 0.158; "two thousand" against "2000" alone accounts for two of them. Normalising numbers leaves the one real error. jiwer.wer counts words, and a sample-rate or language problem would garble far more than one word.'),
      mcq('An invoice validation reports only a GSTIN error; after the GSTIN is fixed, a tax-type error appears. Why did the first run miss it?', [
        ['The after-validator runs only once every individual field has validated', true],
        ['Pydantic reports at most one error per model, so the rest were dropped', false],
        ['The tax-type rule was cached from an earlier run and silently skipped', false],
        ['The extracted JSON changed between runs because the model is random', false],
      ], 'Field errors stop Pydantic before model-level "after" validators run, so cross-field rules never executed. Pydantic does report many field errors at once, and nothing is cached; the same JSON was simply validated in two stages.'),
      mcq('Figures embedded with CLIP\'s image encoder and text chunks embedded with its text encoder share one collection. Figures never reach the top 5. What is the right fix?', [
        ['Query separate collections per modality and merge the results by rank', true],
        ['Multiply every image score by two so they compete with the text scores', false],
        ['Switch the collection from cosine distance to inner product distance', false],
        ['Store the images at a higher resolution so their vectors become stronger', false],
      ], 'Text-to-text similarities sit in a higher band than text-to-image ones, so one ranking favours text. Rank-based fusion of separate lists sidesteps the incomparable scales. A fixed multiplier is a fragile guess, inner product on normalised vectors is the same ranking as cosine, and resolution does not close the gap.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_MULTIMODAL_PRACTICE',
    notes: `Work each exercise on paper or in a notebook first, then check the answer.

## Exercise 1 — the content parts (easy)

Write the \`messages\` list for a chat-completions call that sends one system instruction ("You check
delivery photos.") and a user turn with the text "Is the parcel damaged? Reply yes or no." and one
image at \`data_url\`, at low detail.

**Answer:**

    [{"role": "system", "content": "You check delivery photos."},
     {"role": "user", "content": [
         {"type": "text", "text": "Is the parcel damaged? Reply yes or no."},
         {"type": "image_url", "image_url": {"url": data_url, "detail": "low"}}]}]

Low detail is right here: damage is visible at low resolution, and it is the cheapest setting.

## Exercise 2 — base64 size (easy)

A resized photo is 45,000 bytes. How many base64 characters does it add, and why might it matter?
**Answer:** 45,000 x 4 / 3 = 60,000 characters. Request size limits and upload time, especially from a
phone on a weak mobile connection; resize and compress before encoding.

## Exercise 3 — which reader? (medium)

For each, choose text layer, OCR, vision model or hybrid: (a) a PDF invoice from billing software;
(b) 5,000 identical government forms scanned in one format; (c) photos of invoices from hundreds of
small suppliers with different layouts.
**Answer:** (a) the text layer, no reading model at all; (b) OCR with fixed regions, cheap and
repeatable for one layout; (c) a vision model, ideally with OCR text alongside (hybrid) for exact
characters and boxes for the review screen.

## Exercise 4 — reconcile by hand (medium)

Lines: 4 x 250.00 = 1000.00 and 3 x 180.00 = 504.00. Taxable value 1540.00, CGST 138.60, SGST 138.60,
grand total 1817.20. List every problem.
**Answer:** line 2 is wrong (3 x 180 = 540.00, not 504.00, a digit swap). With 540.00 the lines sum to
1540.00, matching the taxable value, so the line amount is the misread, not the total. 9% of 1540 is
138.60, and 1540 + 277.20 = 1817.20 matches. One problem: line 2's amount.

## Exercise 5 — word error rate (medium)

Reference: "please block my debit card ending four two one" (9 words). Hypothesis: "please lock my
debit card and ending for two one". Count S, D, I and WER.
**Answer:** "block" → "lock" (S), "and" inserted (I), "four" → "for" (S). S = 2, D = 0, I = 1; WER =
3 / 9 = 0.333. Note that "four" → "for" changes the card number: an entity error.

## Exercise 6 — corpus WER (medium)

Three calls: 10 words with 1 error, 50 words with 4 errors, 40 words with 5 errors. Give the corpus WER
and the mean of per-call WERs.
**Answer:** corpus = 10 / 100 = 0.10. Per call: 0.10, 0.08, 0.125; mean = 0.305 / 3 ≈ 0.102. Close here
because the calls are similar lengths; with very short calls the two diverge sharply.

## Exercise 7 — the image feature decision (medium)

A matrimony app wants "make my profile photo look professional" (background and lighting edits on the
user's own photo) and "show me with a celebrity". Decide each.
**Answer:** the first is acceptable with consent, clear retention terms and a visible note that the
photo is AI-edited, since profile photos are used to judge real people. The second is refused: it
uses a real person's likeness without their consent and creates a fake association.

## Exercise 8 — design multimodal retrieval (hard)

A hospital wants to search 300 equipment manuals with wiring diagrams and specification tables.
Sketch the ingestion and how you would evaluate it.
**Answer:** parse each PDF; text chunks as usual; tables to markdown; each diagram captioned by a vision
model given the section heading and asked for labels and part numbers; metadata = manual, page, kind,
image path, caption prompt version. Hybrid search (part numbers need BM25). Generation receives the
retrieved diagram images, cites the page, and the UI shows the diagram. Golden set split into
text-only, table-only and diagram-only questions with recall@k for each.

## Exercise 9 — GSTIN check by hand (hard)

Using the algorithm in Document AI, why does swapping two adjacent digits of a GSTIN almost always fail
the checksum, while a validated GSTIN can still be wrong for the invoice?
**Answer:** positions alternate weights 1 and 2, so swapping neighbours changes which digit is doubled
and changes the sum (the run caught 1234 → 1243). But a checksum only proves the string is
well-formed; a correctly formed GSTIN of a different supplier passes. Match it against the vendor
master too.`,
    mcqs: [
      mcq('A delivery app only needs to know whether a parcel in a photo looks crushed. Which detail setting is most sensible?', [
        ['Low, because the damage is visible at low resolution and it costs least', true],
        ['High, because the model must read the tracking label to decide damage', false],
        ['Auto, because the provider always picks the cheapest setting for you', false],
      ], 'Whether a box is crushed is a coarse visual judgement, so low detail is enough and cheapest. Reading the label is a different task that this question does not need, and "auto" chooses based on the image, not necessarily the cheapest option.'),
      mcq('Lines 4 x 250.00 = 1000.00 and 3 x 180.00 = 504.00 sit on an invoice whose taxable value is 1540.00. What has most likely gone wrong?', [
        ['Line 2 was misread; 540.00 makes the lines match the taxable value', true],
        ['The taxable value was misread; it should be the line sum of 1504.00', false],
        ['The quantities were misread; 3 should be 2.8 to give exactly 504.00', false],
      ], 'Quantity times price on line 2 gives 540.00, and with that value the lines sum to the taxable value, so two checks agree the amount was misread. Changing the taxable value would contradict the line arithmetic, and a fractional quantity of tiffin boxes makes no sense.'),
      mcq('Reference "please block my debit card ending four two one", hypothesis "please lock my debit card and ending for two one". What is the WER?', [
        ['3 out of 9, about 0.33: two substitutions and one inserted word', true],
        ['2 out of 9, about 0.22: inserted words do not count as errors', false],
        ['3 out of 10, 0.30: the hypothesis length is the right denominator', false],
      ], '"block"→"lock" and "four"→"for" are substitutions and "and" is an insertion; WER divides by the 9 reference words. Insertions are errors, and the denominator is the reference length, not the hypothesis length.'),
      mcq('A matrimony app wants a feature that places the user beside a film star they choose. What is the right product decision?', [
        ['Refuse it, since it uses a real person\'s likeness without their consent', true],
        ['Allow it as long as the generated image carries a visible "AI-generated" label', false],
        ['Allow it if the user agrees to terms stating that the image is a joke', false],
      ], 'The film star has not agreed, and a fake association on a matrimony profile is exactly the misuse likeness protections exist for. A label or the user\'s own agreement does not supply the consent of the person depicted.'),
      mcq('Searching 300 equipment manuals for part numbers like "XR-4471-B" in wiring diagrams, which retrieval set-up works best?', [
        ['Diagram captions with part numbers, retrieved by hybrid BM25 and dense search', true],
        ['CLIP embeddings of each diagram image, searched with the part number as text', false],
        ['Dense embeddings of the captions only, since keyword search ignores captions', false],
      ], 'Exact identifiers are where keyword search shines, and captions that list part numbers make diagrams findable by them; hybrid search keeps semantic matching too. CLIP does not read part numbers from diagrams, and BM25 indexes caption text like any other text.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_MULTIMODAL_INTERVIEW_QUESTION',
    notes: `Multimodal questions in AI-engineer interviews are almost always system design with one sharp
follow-up. The interviewer wants to see where you put checks, not which model you would call.

## Question 1 — "Design a system that processes 50,000 supplier invoices a month."

**A strong answer:** "Five stages. Ingest from e-mail and upload, de-duplicate by file hash, and check
for a text layer: digital PDFs need no OCR. Read scans and photos with a vision model given the page
image plus OCR text, so it gets layout from the image and exact characters and boxes from OCR. Extract
into a Pydantic schema with nullable fields. Validate in code: GSTIN format and checksum, matched to the
vendor master; line arithmetic and totals in Decimal with a one-rupee tolerance; IGST or CGST plus SGST,
not both; invoice number not already booked for that supplier. Anything failing goes to a review
screen that highlights the field on the page; corrections become evaluation cases. I'd report
straight-through rate and, separately, error rate among auto-approved invoices, measured by sampling."

**Follow-up: "The vision model is replaced next quarter. How do you know nothing broke?"**
"Run the labelled evaluation set (one invoice per supplier template plus the scan and photo cases
from past corrections) on both models, compare per-field accuracy and the share of confidently wrong
values, and roll out behind a flag to a small share of traffic while watching review-queue rates."

## Question 2 — "How would you evaluate a voice bot for Hindi-English support calls?"

**A strong answer:** "Separately per stage. For speech-to-text, corpus WER after a normaliser we agree
on (numbers, punctuation, script), sliced by language mix, accent region, and phone versus headset,
plus exact-match accuracy on amounts, dates and account numbers, because those errors cost money.
For the LLM, the usual evaluation set on transcribed input, including transcripts with realistic
errors. For TTS, listening tests on names and amounts. End to end, task success and time to first
audio per turn."

**Follow-up: "WER is 9% overall but complaints are rising. What do you do?"**
"Look at the slices: an overall number hides a bad slice, often speaker-phone or code-mixed calls.
Then look at entity accuracy, because 9% made of dropped fillers is harmless and 9% made of amounts
is not. Fix that slice (vocabulary prompt, voice-activity detection, a model tuned for Indian
languages) and add read-back confirmation for amounts."

## Question 3 — "Our deck search can't answer questions about charts. Fix it."

**A strong answer:** "The answers are in figures, and text-only RAG indexes the words around them.
At ingestion I'd caption each figure with a vision model, giving it the slide title and asking for the
chart type, axes and labelled values, and convert tables to markdown. Those become chunks with page
and image path in the metadata, so they go through the same hybrid search and re-ranking. At answer
time I'd send the retrieved figure images to the vision model too, so numbers are read from the chart,
and show the cited figure in the UI. I'd measure recall separately on chart, table and text questions."

**Follow-up: "Why not just embed the images with CLIP?"**
"CLIP encodes what an image looks like, not the values on its axes, and its text-to-image scores sit
far below text-to-text ones, so a shared index favours text. In a quick test, 'a bar chart' even
retrieved a pie chart. CLIP is the right tool for photos, like product images."

## Question 4 — "Marketing wants generated ads featuring a famous actor. What do you say?"

**A strong answer:** "Not without a signed agreement from the actor covering AI-generated use: a
person's likeness is protected, Indian courts have stopped unauthorised AI imitation of well-known
people, and it would be a false endorsement. What I can offer is generated backgrounds and products,
fictional models, with text drawn by our layout code, a visible AI label, provenance metadata and a
log of every generation."`,
    mcqs: [
      mcq('In an invoice-pipeline design interview, which metric best shows the pipeline can be trusted with the ledger?', [
        ['The error rate among auto-approved invoices, measured by regular sampling', true],
        ['The straight-through rate, meaning the share of invoices that skip human review entirely', false],
        ['The average model latency per page across all invoices in the month', false],
      ], 'Straight-through rate is the efficiency number, but it rises just as well when checks stop firing. Only sampling what was auto-approved measures the errors that reach the ledger. Latency matters for cost and throughput, not correctness.'),
      mcq('A voice bot\'s overall WER is 9% while complaints about wrong amounts rise. What should the engineer look at first?', [
        ['WER by slice and the exact-match accuracy of amounts and account numbers', true],
        ['A larger speech model, since a 9% overall WER is above most benchmarks', false],
        ['The LLM\'s temperature, since the complaints must come from its replies', false],
      ], 'An overall figure can hide one bad slice, and WER treats a dropped "the" the same as a wrong amount; entity accuracy matches the complaint. Swapping models without knowing the failing slice is a guess, and the complaints point at what was heard, not how the reply was worded.'),
      mcq('Asked why not to index deck charts with CLIP alone, which answer is most accurate?', [
        ['It encodes appearance rather than plotted values, and its scores trail text', true],
        ['It cannot process images that are wider than they are tall, which most slides are', false],
        ['It needs a GPU at query time, which makes it too slow for a search box', false],
      ], 'CLIP matches images to captions by appearance, so chart values are not in the vector, and text-to-image similarities sit below text-to-text ones. It resizes images of any shape, and a CLIP query embedding is cheap enough to compute on a CPU.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_MULTIMODAL_CHECKPOINT',
    notes: `Ten scenario questions across the topic: vision inputs, document extraction and validation, speech and
word error rate, image generation and its limits, and multimodal retrieval. Where there is arithmetic,
do it before reading the options.`,
    checkpoint: [
      ck('LLM_FUNDAMENTALS', 'A vision model returns a confident but wrong MRP for a blurred label. Why does that happen, rather than an "unreadable" reply?', [
        ['It predicts the most plausible next tokens, and a price is plausible', true],
        ['Its image encoder sharpens blurred regions before the decoder reads them', false],
        ['It falls back to a remembered price for that product from its training', false],
      ], 'A VLM is still a next-token predictor; unless the schema and prompt allow null, the likeliest continuation is a well-formed price. There is no sharpening step, and while training data may influence guesses, the core reason is plausible prediction, not lookup.'),
      ck('LLM_FUNDAMENTALS', 'Sending a 4000 x 3000 photo instead of a 1500 x 1125 crop of the same label usually changes what, at high detail?', [
        ['More tokens and cost, and the label text may end up smaller after resizing', true],
        ['Nothing at all, because every provider resizes images to one fixed size first', false],
        ['Better accuracy, because the model always reads the original full pixels', false],
      ], 'The provider resizes to its limits and tiles, so a big photo costs more tokens while the label occupies a smaller share of what survives. Not every image becomes one fixed size, and the model never sees beyond the provider\'s resize limit.'),
      mcq('An extraction returns a well-formed GSTIN that passes the checksum. What else should the pipeline check before booking the invoice?', [
        ['That it matches the supplier\'s GSTIN in the vendor master', true],
        ['That its first two digits are even, for a registered firm', false],
        ['That the model\'s confidence for that field is above 0.9', false],
      ], 'A checksum shows the string is well-formed, not that it belongs to this supplier; a valid GSTIN of another business passes too. There is no rule about even state codes, and self-reported confidence does not establish identity.'),
      mcq('Lines sum to 8670.00, the taxable value says 9120.00, and quantity times price on line 2 is 3720.00 against an extracted 3270.00. What should happen?', [
        ['Route to review with line 2 highlighted; two checks point at that amount', true],
        ['Auto-correct the taxable value to 8670.00 so that the lines and total agree', false],
        ['Accept the invoice, since a single misread line is within normal tolerance', false],
      ], 'Both the line arithmetic and the sum point to a misread 3720 → 3270, and a person confirms against the page in seconds. Changing the taxable value would book the wrong amount, and a 450-rupee discrepancy is far outside a rounding tolerance.'),
      ck('LLM_FUNDAMENTALS', 'A reference has 25 words; the transcript has 2 substitutions, 2 deletions and 1 insertion. What is the WER?', [
        ['0.20, from five errors over 25 reference words', true],
        ['0.16, from four errors as insertions do not count', false],
        ['0.21, from five errors over 24 transcript words', false],
      ], 'WER = (S + D + I) / N = 5 / 25 = 0.20, with N the reference length. Insertions are errors, and dividing by the transcript\'s length would make a system that drops words look better.'),
      ck('LLM_FUNDAMENTALS', 'Support calls are code-mixed Hindi and English. The transcripts switch between Devanagari and Latin script for the same words. What is the most sensible first step?', [
        ['Decide the script downstream code needs, test language settings and normalise', true],
        ['Set the language to Hindi, since that setting guarantees Devanagari on all output', false],
        ['Ignore it, since WER treats both scripts of the same word as a match anyway', false],
      ], 'Code-mixed speech has no single language setting, so choose the target script, test settings on your own audio and normalise before scoring or parsing. A Hindi setting does not guarantee consistent script for English words, and WER compares strings, so different scripts count as errors.'),
      mcq('A product team wants generated festive banners that include the price "₹1,499". What is the right design?', [
        ['Generate the art with space left, and draw the price with the layout code', true],
        ['Put the price in the prompt and check every banner by eye before it ships', false],
        ['Use a higher guidance scale so the model follows the price text exactly', false],
      ], 'Prices must be exactly right, and generated text is unreliable; drawing it in code is deterministic. Human checking of every banner catches some errors but not all, and a higher guidance scale strengthens the prompt\'s pull without making text rendering exact.'),
      mcq('A shopping app lets users edit photos with AI. Which set of controls best fits Indian expectations on likeness and labelling?', [
        ['Consent for real people\'s images, refusals for public figures, visible labels', true],
        ['A watermark on outputs is enough, since any image with one may be shared', false],
        ['Blocking only sexual content, since likeness rules apply to film studios', false],
      ], 'Real people need to consent to their likeness being used, named public figures are the commonest deepfake target, and labelling synthetic images is the direction Indian rules have taken. A watermark alone does not supply consent, and likeness protection applies to people, not just studios.'),
      mcq('A deck assistant must answer questions whose answers are only in charts. Which pipeline is most reliable?', [
        ['Caption charts for retrieval, then send the chart images to the answering model', true],
        ['Embed the charts with CLIP and answer only from the CLIP similarity scores found', false],
        ['Index slide titles, and let the model infer chart values from the title text', false],
      ], 'Captions make charts findable, and reading the image at answer time keeps numbers faithful to the source. CLIP scores rank images but contain no values to answer from, and a title rarely states the numbers.'),
      mcq('A multimodal golden set reports recall@5 of 0.80 overall. Why should the team split it by question kind (text, table, figure)?', [
        ['A table or figure regression can hide inside a healthy overall number', true],
        ['Recall@5 cannot be computed at all when figures are mixed with text', false],
        ['Splitting by kind always raises the recall reported for each part', false],
      ], 'If text questions dominate, a parser change that breaks tables barely moves the overall figure; per-kind recall exposes it. Recall works the same for any chunk kind, and splitting does not raise numbers, it shows where they are low.'),
    ],
  },
];
