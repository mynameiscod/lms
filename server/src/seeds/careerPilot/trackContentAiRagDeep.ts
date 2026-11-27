/**
 * Career-track content: RAG in Depth and Vector Databases (AI_RAG_DEEP), the AI tracks, batch AI1.
 *
 * Students have already built basic RAG twice — the language-free concepts in JT_AI_CONCEPTS and
 * the Python version (Chroma/pgvector basics, RAG by hand and with LangChain) in JT_AI_PY. This
 * topic is the part that decides whether retrieval actually finds the right passage: parsing,
 * chunking, choosing and testing an embedding model, vector database internals and filters,
 * hybrid search with re-ranking, query rewriting and routing, and measuring all of it with a
 * golden set. Basic ideas are referred back to in a sentence, not re-taught.
 *
 * Every snippet that needs no paid key was run (sentence-transformers all-MiniLM-L6-v2, a
 * multilingual MiniLM, Chroma and Qdrant in memory, rank-bm25, the ms-marco MiniLM cross-encoder)
 * and the printed numbers are the real ones. pgvector SQL is written from its documented syntax.
 * Calls to a chat model need an API key and are marked as such. No prices or model versions.
 *
 * Skills: RAG_FUNDAMENTALS by default; EMBEDDING_MODELS → VECTOR_EMBEDDINGS; VECTOR_DATABASES and
 * HYBRID_RERANK → VECTOR_DATABASES (trackSkillAttribution). Other checkpoint skills use ck().
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_AI_RAG_DEEP_BUNDLES: PilotBundle[] = [
  /* ── PARSING_CHUNKING ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_RAG_DEEP_PARSING_CHUNKING',
    notes: `**Most bad RAG answers are decided before the model is called — at ingestion.** You built a
pipeline in Python with AI (embed, store, retrieve, prompt). It worked on three tidy Markdown files.
A real company hands you 400 PDFs: scanned forms, two-column layouts, tables of allowances by
grade, headers and footers on every page. If the text that comes out of parsing is garbage, or a
chunk holds half an answer, no embedding model or prompt can rescue it.

## Parsing: get clean text with its structure

Pick the parser by document type, and **look at its output** before you chunk anything:

- **Digital PDFs** (exported from Word): \`pypdf\` or PyMuPDF (\`pymupdf\`) extract the text layer.
  PyMuPDF is faster and keeps reading order better on multi-column pages.
- **Scanned PDFs** have no text layer — extraction returns empty strings. You need OCR
  (Tesseract, or a cloud document-AI service). Detect it: if a page yields under ~20 characters, flag it.
- **Layout-heavy documents** (tables, forms): layout-aware tools such as \`unstructured\`, Docling or
  a document-AI service return elements typed as Title, NarrativeText, Table, ListItem.
- **HTML** (an intranet wiki): BeautifulSoup, keeping \`h1\`–\`h3\` as headings and dropping nav bars,
  cookie banners and footers.
- **DOCX**: \`python-docx\` gives paragraphs with their style names ("Heading 2"), which is structure for free.

A minimal page-by-page PDF reader that keeps the page number for citations:

    from pypdf import PdfReader

    def read_pdf(path: str) -> list[dict]:
        pages = []
        for n, page in enumerate(PdfReader(path).pages, start=1):
            text = page.extract_text() or ""
            pages.append({"source": path, "page": n, "text": text,
                          "needs_ocr": len(text.strip()) < 20})
        return pages

Then **clean**: remove the repeated header and footer (a line that appears on most pages is
boilerplate — count line frequencies across pages and drop the frequent ones), re-join words
hyphenated across line breaks, and normalise whitespace. Never "clean" numbers or units.

## Tables: turn rows into sentences

A travel policy's allowance table, extracted as text, often becomes \`L1-L3 Rs 3,500 Economy / 3AC\`
with the header three lines away. Separated from its header, the row means nothing to an embedding
model. Rewrite each row with its header, so every chunk stands alone:

    rows = [["Grade", "Hotel per night (metro)", "Travel class"],
            ["L1-L3", "Rs 3,500", "Economy / 3AC"],
            ["L4-L6", "Rs 6,000", "Economy / 2AC"]]
    header, *body = rows
    for row in body:
        print("; ".join(f"{h}: {v}" for h, v in zip(header, row)))

prints

    Grade: L1-L3; Hotel per night (metro): Rs 3,500; Travel class: Economy / 3AC
    Grade: L4-L6; Hotel per night (metro): Rs 6,000; Travel class: Economy / 2AC

Small tables can also be kept whole as one Markdown chunk; large ones go row by row.

## Three ways to chunk

**Fixed size** — cut every N characters with an overlap. Simple and predictable, but blind:

    def fixed_chunks(text: str, size: int, overlap: int) -> list[str]:
        step = size - overlap
        return [text[i:i + size] for i in range(0, len(text), step) if text[i:i + size].strip()]

On a leave policy with \`size=120, overlap=20\`, the second chunk was
\`'not be carried forward.\\nIt is credited on 1 January.\\n\\n## Earned leave\\nEarned leave accrues at
1.5 days per month of serv'\` — the end of one section glued to half a sentence of the next.

**Recursive** — try the biggest natural separator first (blank line), and only fall back to lines,
sentences and spaces for a piece that is still too long. This is what LangChain's
\`RecursiveCharacterTextSplitter\` does; written out:

    def recursive_chunks(text, size, seps=("\\n\\n", "\\n", ". ", " ")):
        if len(text) <= size:
            return [text] if text.strip() else []
        sep = next((s for s in seps if s in text), None)
        if sep is None:                                   # nothing left to split on: hard cut
            return [text[i:i + size] for i in range(0, len(text), size)]
        rest = seps[seps.index(sep) + 1:]
        chunks, current = [], ""
        for piece in text.split(sep):
            candidate = current + sep + piece if current else piece
            if len(candidate) <= size:
                current = candidate                       # keep packing pieces together
            else:
                if current:
                    chunks.append(current)
                if len(piece) > size:                     # one piece too big: split it finer
                    chunks.extend(recursive_chunks(piece, size, rest))
                    current = ""
                else:
                    current = piece
        if current.strip():
            chunks.append(current)
        return chunks

The same policy at \`size=200\` gave three chunks of 152, 144 and 115 characters, one per leave type.

**Structure-aware** — split on the document's own headings, then size-limit each section, and
**prefix every chunk with its heading path**. "Up to 30 days can be carried forward" is ambiguous;
"Leave Policy > Earned leave — Up to 30 days can be carried forward" is not. This is the default to
reach for with policies, manuals and wikis.

## Size and overlap

- Chunks of roughly 200–500 tokens suit most question answering. Too small and answers are split
  across chunks; too large and one vector averages several topics, so it matches nothing strongly.
- Overlap of 10–15% protects a sentence near a boundary. Structure-aware chunks need little.
- Measure size in **tokens** when you must stay under the embedding model's input limit — many small
  models silently truncate (all-MiniLM-L6-v2 reads only 256 word-piece tokens).
- Do not argue about sizes: the retrieval-evaluation unit shows how to compare two settings with numbers.

## Keep every chunk's source

Each chunk carries a stable id and the metadata you will need later:

    {"id": "leave-policy.pdf#p3#2", "source": "leave-policy.pdf", "page": 3,
     "section": "Leave Policy > Earned leave", "doc_version": "2026-04",
     "company_id": 17, "text": "Leave Policy > Earned leave\\nEarned leave accrues ..."}

\`source\` and \`page\` make citations possible; \`section\` helps both retrieval and the reader;
\`doc_version\` and an effective date let you retire superseded policies; \`company_id\` is the filter
that keeps tenants apart. A chunk without its source is an answer nobody can check.`,
    workedExample: `**Problem: an HR portal answers "Can I carry casual leave forward?" with "Yes, up to 30 days" —
which is the rule for earned leave.**

**1. Look at the chunk that was retrieved.** The fixed-size splitter (\`size=120, overlap=20\`) had
produced:

    'not be carried forward.\\nIt is credited on 1 January.\\n\\n## Earned leave\\nEarned leave accrues at 1.5 days per month of serv'

The chunk holds the end of the casual-leave section and the start of the earned-leave one, with no
heading for the first half. The model saw "carried forward" and "Earned leave" together and merged them.

**2. Switch to heading-aware chunking.** Walk the lines; when a \`#\` heading appears, flush the
buffer under the current heading path and update the path:

    import re

    def heading_chunks(markdown: str, source: str, size: int = 400) -> list[dict]:
        out, path, buf = [], {}, []
        def flush():
            body = "\\n".join(buf).strip()
            if body:
                title = " > ".join(v for _, v in sorted(path.items()))
                for piece in recursive_chunks(body, size):
                    out.append({"id": f"{source}#{len(out)}", "source": source,
                                "section": title, "text": f"{title}\\n{piece}"})
            buf.clear()
        for line in markdown.splitlines():
            m = re.match(r"^(#{1,6})\\s+(.*)", line)
            if m:
                flush()
                level = len(m.group(1))
                path = {k: v for k, v in path.items() if k < level}   # drop deeper levels
                path[level] = m.group(2).strip()
            else:
                buf.append(line)
        flush()
        return out

**3. Check the output, chunk by chunk:**

    leave-policy.md#0 | Leave Policy > Casual leave | 148
    leave-policy.md#1 | Leave Policy > Earned leave | 156
    leave-policy.md#2 | Leave Policy > Maternity leave | 126

and chunk 1 reads, in full:

    Leave Policy > Earned leave
    Earned leave accrues at 1.5 days per month of service. Up to 30 days can be carried forward.
    Encashment is allowed only at exit.

**4. Re-ask.** The casual-leave chunk now says "Casual leave cannot be carried forward" under its own
heading, it is retrieved first, and the answer is correct and cites \`leave-policy.md#0\`.

**5. Lock it in.** Add the question and its expected chunk id to the golden set, so a later change to
chunking that breaks it shows up as a number, not a complaint from an employee.`,
    mcqs: [
      mcq('An ingestion job runs pypdf over a set of scanned joining forms and every chunk comes out as an empty string. What is going on?', [
        ['The scans have no text layer, so they need OCR before chunking', true],
        ['pypdf needs a larger chunk_size set before it returns any text', false],
        ['The PDFs are encrypted and pypdf silently strips the text out', false],
        ['The embedding model rejected the text and blanked those chunks', false],
      ], 'A scanned page is an image; text extraction reads only a text layer, which a scan does not have. Detect near-empty pages and send them to OCR. Chunk size has nothing to do with extraction, which happens first.'),
      mcq('A travel policy table is extracted as separate lines like "L4-L6  Rs 6,000  Economy / 2AC", far from its header row. What should ingestion do with it?', [
        ['Drop the table, since embedding models cannot read numbers at all', false],
        ['Rewrite each row with its column headers so every chunk stands alone', true],
        ['Store the whole PDF page as one chunk so the header stays nearby', false],
      ], 'A row without its headers is meaningless to an embedding model and to the LLM. "Grade: L4-L6; Hotel per night (metro): Rs 6,000" can be found and read on its own. A whole page as one chunk mixes topics and dilutes the vector.'),
      mcq('Why does a structure-aware chunker prefix each chunk with its heading path, such as "Leave Policy > Earned leave"?', [
        ['Chroma rejects a chunk that is stored without a heading field', false],
        ['It makes each chunk shorter, so more chunks fit in the prompt', false],
        ['The chunk keeps context its sentences rely on to make sense', true],
        ['The heading text stops the chunk being split across two pages', false],
      ], 'Sentences like "Up to 30 days can be carried forward" depend on the heading for meaning. The prefix puts that meaning into the embedding and into what the model reads. It makes the chunk slightly longer, not shorter.'),
    ],
    checkpoint: [
      mcq('A team chunks its HR handbook at 2,000 tokens per chunk "so nothing gets cut off", and retrieval for narrow questions gets worse. What is the likeliest reason?', [
        ['Each vector averages many topics, so none of them matches strongly', true],
        ['Large chunks are always rejected by the vector database\'s index', false],
        ['The overlap becomes too small a share of each chunk to be useful', false],
      ], 'A chunk covering leave, travel and appraisals produces one vector somewhere in the middle of those topics, so a precise question matches it weakly. Overlap is not the issue; a mid-sized, single-topic chunk retrieves better.'),
      ck('VECTOR_EMBEDDINGS', 'Chunks of about 1,500 characters are embedded with all-MiniLM-L6-v2, and questions about the last paragraph of each chunk never match it. Why?', [
        ['The model reads only its first 256 tokens and drops the rest', true],
        ['Cosine similarity favours the first words of every passage', false],
        ['The vectors need normalising before the last part counts', false],
        ['Overlap between chunks hides the last paragraph from the search', false],
      ], 'all-MiniLM-L6-v2 has a max_seq_length of 256 word-piece tokens; anything after that is truncated and never reaches the vector. Size chunks in tokens to fit the model. Normalising changes length, not which tokens were read.'),
      mcq('Every chunk of a 60-page policy PDF begins with "Acme Technologies Pvt Ltd — Confidential — Page N". What should ingestion do?', [
        ['Keep it, since the company name helps every search find the file', false],
        ['Detect lines repeated on most pages and strip them before chunking', true],
        ['Raise chunk_overlap so the repeated line is merged between chunks', false],
        ['Embed the header separately and subtract it from each chunk vector', false],
      ], 'Boilerplate repeated on every page makes all chunks look alike and wastes tokens. Counting line frequency across pages and removing the frequent ones is the standard clean-up. Vector subtraction is not a reliable way to remove text.'),
    ],
  },

  /* ── EMBEDDING_MODELS ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_RAG_DEEP_EMBEDDING_MODELS',
    notes: `**The embedding model decides what "similar" means for your whole system.** You met embeddings in
Building with LLMs: text in, a vector out, close vectors for related text. This unit is about
choosing one — and the only reliable way to choose is to test candidates on **your** documents and
**your** users' questions. Leaderboards rank models on public datasets; your HR portal is not one.

## What to compare

- **Dimension** — 384, 768, 1,024, 1,536, 3,072… More dimensions can hold finer distinctions, but
  every vector costs dimension × 4 bytes as float32: a million 768-dimension vectors is about 3 GB
  before the index. Some models let you truncate the vector to fewer dimensions (trained for it);
  only do that if the model documents it.
- **Maximum input length** — tokens beyond the limit are silently dropped. Chunk to fit.
- **Languages** — an English-only model will not match a Hindi question to an English policy.
- **Domain** — general models know everyday language; legal, medical or code search may need a domain
  model or fine-tuning.
- **Hosted or local** — a hosted API (OpenAI, Cohere, Google…) needs no GPU and charges per token;
  a local sentence-transformers model is free per call, keeps documents on your servers (useful under
  India's DPDP Act when policies contain personal data), and needs CPU/GPU capacity you run.
- **Query/document prefixes** — some models (E5, BGE and others) expect "query: " and "passage: "
  prefixes, or an instruction, and score worse without them. Read the model card.

## Normalisation and cosine similarity

Cosine similarity compares direction, not length. Normalise vectors to length 1 and cosine becomes a
dot product — what most stores compute fastest:

    import numpy as np
    from sentence_transformers import SentenceTransformer

    model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    docs = ["Employees get 12 days of casual leave a year; it cannot be carried forward.",
            "Earned leave accrues at 1.5 days per month and up to 30 days carry forward.",
            "Hotel stays in metro cities are reimbursed up to the limit for your grade.",
            "Claims for travel expenses must be filed within 30 days of returning."]
    D = model.encode(docs, normalize_embeddings=True)
    print(D.shape, D.dtype, round(float(np.linalg.norm(D[0])), 4))

prints \`(4, 384) float32 1.0\`. Without normalising, use \`sentence_transformers.util.cos_sim\`; for
the first two documents both routes gave 0.6377. Set the vector store's metric to match: cosine for
cosine-trained models, or dot product on normalised vectors (the same ranking). Mixing L2 distance with
unnormalised vectors from a cosine model gives subtly different, worse rankings.

## Test on your own questions

Write 20–50 real questions (from the helpdesk inbox, not invented by you) with the chunk that answers
each, and score every candidate. Four questions against those four documents:

    queries = ["How many casual leaves do I get?",
               "Can unused leave be moved to next year?",
               "What is the hotel limit in Mumbai?",
               "chhutti kitni milti hai saal mein?"]
    Q = model.encode(queries, normalize_embeddings=True)
    S = Q @ D.T
    print(S.round(2)); print(S.argmax(axis=1))

all-MiniLM-L6-v2 printed:

    [[ 0.27  0.31  0.11  0.02]
     [ 0.62  0.49  0.26  0.28]
     [ 0.26  0.17  0.47  0.12]
     [ 0.04  0.04  0.15 -0.03]]
    [1 0 2 2]

Two of four are plainly wrong (the second question matched the casual-leave chunk, which says leave
cannot be carried forward — defensible, though the earned-leave chunk is the fuller answer). "How many
casual leaves" ranked the **earned** leave chunk first (0.31 vs 0.27) — close topics with shared words are exactly where small models wobble. The Hinglish question
matched the expense-claims chunk with a score of 0.15, which is noise. You would never have seen
either by reading a leaderboard.

## Multilingual and Hinglish

Indian users type in English, in Hindi, and very often in Hinglish — Hindi in Latin script. The same
test with \`paraphrase-multilingual-MiniLM-L12-v2\` (also 384 dimensions), plus the question in
Devanagari, "साल में कितनी छुट्टी मिलती है?":

- The Devanagari question now goes to a leave chunk (0.29) instead of the hotel chunk.
- The romanised Hinglish question still fails — every score is near zero.

Multilingual models are trained on Hindi in Devanagari; romanised Hinglish is a different, messier
input. Practical fixes: rewrite or translate the question into English before retrieval (the
query-transformation unit), add Hinglish examples to the golden set, and lean on keyword search for
names and codes. Do not assume "multilingual" on a model card covers how your users actually type.

## Changing models later

Vectors from two models are not comparable (you met this in Python with AI). A model change means
re-embedding the corpus, so store \`embedding_model\` with every vector, build the new collection
beside the old one, run the golden set on both, and switch the alias only when the new one wins.

## A short decision rule

Start with a small, cheap, well-known model and a golden set. Change model only when the numbers say
retrieval — not chunking, not the prompt — is the weak stage, and when the candidate beats the
current model on your set by a margin that will survive more questions.`,
    workedExample: `**Problem: choose between two local embedding models for an HR assistant used across offices in
Pune, Noida and Chennai. Users ask in English and Hindi.**

**1. Build the candidate list.** \`all-MiniLM-L6-v2\` (English, 384 dims, 256 tokens) and
\`paraphrase-multilingual-MiniLM-L12-v2\` (50+ languages, 384 dims). Same dimension, so storage is
equal; the multilingual model is slower per chunk because it has 12 layers instead of 6.

**2. Write the test.** Five questions, one per user pattern seen in the helpdesk log: a plain English
question, a paraphrase with no shared words, a city-specific question, Hinglish, and Hindi in
Devanagari. Each has one correct chunk.

**3. Score both models with the same code:**

    for name in ["sentence-transformers/all-MiniLM-L6-v2",
                 "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"]:
        m = SentenceTransformer(name)
        D = m.encode(docs, normalize_embeddings=True)
        Q = m.encode(queries, normalize_embeddings=True)
        print(name, (Q @ D.T).argmax(axis=1))

The English model printed \`[1 0 2 2 2]\`, the multilingual one \`[1 1 2 2 1]\` (correct answers:
\`[0 1 2 0 0]\`). Counted strictly, the English model gets one of five and the multilingual model two.
Both miss question 0 (casual vs earned leave). The multilingual model gets the paraphrase right and
sends the Devanagari question to a leave chunk (earned, not casual); neither handles Hinglish.

**4. Read the numbers honestly.** Five questions is far too few to decide on — but it already shows
two facts a decision needs: (a) Hindi users are better served by the multilingual model; (b) Hinglish
is not solved by either model, so a query rewrite into English is needed whatever is chosen.

**5. Decide.** Take the multilingual model, add a rewrite step for non-English questions, grow the
set to 50 questions from real logs, and re-run. The casual-versus-earned confusion is a job for
hybrid search: the word "casual" is an exact keyword match that BM25 will not miss.`,
    mcqs: [
      mcq('A team stores one million chunks as 768-dimension float32 vectors. Roughly how much memory do the raw vectors take, before any index?', [
        ['About 3 GB, since each vector takes 768 × 4 bytes', true],
        ['About 768 MB, since each dimension takes one byte', false],
        ['About 30 GB, since float32 needs 40 bytes per value', false],
      ], 'float32 is 4 bytes, so 768 × 4 = 3,072 bytes per vector, about 3 GB for a million. The index (HNSW links) adds more on top. One byte per value is int8 quantisation, not float32.'),
      mcq('An E5-family embedding model gives disappointing results, and the model card says inputs should start with "query: " or "passage: ". What should you do?', [
        ['Ignore the prefixes, since they only matter while training the model', false],
        ['Add "query: " to questions and "passage: " to chunks, then re-test', true],
        ['Add both prefixes to every chunk so that it can match either kind', false],
        ['Switch the distance metric to L2 to make up for the missing prefix', false],
      ], 'Models trained with prefixes expect them at inference; questions and passages get different prefixes. Leaving them out, or giving both to every chunk, puts inputs where the model was not trained. The metric does not compensate for this.'),
      mcq('Vectors from a cosine-trained model are stored unnormalised in an index set to L2 (Euclidean) distance. What is the effect?', [
        ['Every query fails with a metric mismatch error from the index', false],
        ['Rankings are the same as cosine, because L2 and cosine always agree', false],
        ['Rankings drift from cosine, since L2 also counts vector length', true],
      ], 'For unit-length vectors L2 distance and cosine give the same order; for unnormalised ones L2 also rewards or penalises vector length, so rankings differ. No error is raised, which is why this goes unnoticed.'),
    ],
    checkpoint: [
      mcq('An HR assistant\'s users write in Hinglish ("chhutti kitni milti hai?"). A multilingual embedding model fixed Hindi in Devanagari script but not these. What is the most dependable next step?', [
        ['Rewrite the question into English before retrieval, and test it', true],
        ['Raise the similarity threshold so wrong matches are filtered out', false],
        ['Use a larger dimension so the model can hold the extra language', false],
        ['Translate every policy document into Hinglish and embed it again', false],
      ], 'Romanised Hinglish is poorly represented even in multilingual models. A rewrite into English lets the existing English chunks match, and the golden set confirms it. A higher threshold only refuses more; dimension size does not add a language.'),
      mcq('Two embedding models top a public leaderboard within a point of each other. How should a team pick one for its policy-search product?', [
        ['Take the higher-ranked one, since the leaderboard measured retrieval', false],
        ['Score both on its own questions and documents, and take the winner', true],
        ['Take the one with more dimensions, since it can hold finer meanings', false],
      ], 'Leaderboards use public datasets that may look nothing like your documents or your users\' wording. Your own golden set is the only test that reflects your product. More dimensions cost more and do not guarantee better retrieval.'),
      mcq('A company switches from a hosted embedding API to a local sentence-transformers model of the same dimension. What must happen to the stored vectors?', [
        ['Nothing, since the two models produce vectors of the same size', false],
        ['Normalise the old vectors again so they fit the new model\'s space', false],
        ['Re-embed every chunk with the new model, then compare the two', true],
        ['Keep both, and average old and new vectors at query time', false],
      ], 'Each model has its own vector space; equal dimensions do not make them comparable. Build a new collection with the new model, compare both on the golden set, then switch. Averaging vectors from two spaces produces meaningless points.'),
    ],
  },

  /* ── VECTOR_DATABASES ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_RAG_DEEP_VECTOR_DATABASES',
    notes: `**A vector database is an index over vectors plus a document store plus filters.** In Python with
AI you added chunks to Chroma and ran one pgvector query. Now the parts that matter in production:
how the index finds neighbours fast, why filtering is harder than it looks, and how documents are
updated and deleted without leaving stale chunks behind.

## The vocabulary

- **Collection** (Chroma, Qdrant) or **table** (pgvector): one set of vectors of one dimension, one
  distance metric, usually one embedding model.
- **Point / record**: an id, a vector, and a **payload** (Qdrant) or **metadata** (Chroma) — the JSON
  you filter on and cite from: source, page, section, company_id, effective date.
- **Distance**: cosine, dot product or Euclidean (L2). Set it when you create the collection; it
  cannot be changed afterwards without rebuilding. Chroma's default is L2 — set cosine explicitly.

## Exact versus approximate search

**Exact (brute-force)** search compares the query with every vector: perfect results, cost growing
linearly with the collection. Below roughly a hundred thousand vectors it is often fast enough, and
it is what Chroma's tiny collections and Qdrant's in-memory local mode do (Qdrant even warns that
\`search_params\` have no effect in local mode, because it is always brute force).

**Approximate nearest neighbour (ANN)** indexes trade a little recall for a lot of speed:

- **HNSW** (Hierarchical Navigable Small World) — a layered graph. Each vector links to about \`m\`
  neighbours; a search enters at the sparse top layer, walks greedily towards the query, and drops
  down layer by layer. \`ef_construction\` (build effort) and \`m\` set index quality and memory;
  \`ef_search\` (query effort) sets how many candidates a search keeps — higher is slower and finds
  more true neighbours. HNSW is the default in Qdrant, Chroma and most pgvector setups.
- **IVF** (inverted file) — cluster the vectors into \`lists\` with k-means, and at query time search
  only the \`probes\` nearest clusters. Builds faster and uses less memory than HNSW, but must be built
  after data is loaded (the clusters come from the data) and recall depends on \`probes\`.

Approximate means you must **measure recall of the index itself**: run a sample of queries exactly and
with the index, and compare the top 10s. Tune \`ef_search\` or \`probes\` until it is above ~0.95.

## Chroma with metadata filters

    import chromadb

    client = chromadb.EphemeralClient()          # PersistentClient(path=...) or HttpClient in real use
    col = client.get_or_create_collection("policies", configuration={"hnsw": {"space": "cosine"}})
    col.upsert(ids=[c["id"] for c in chunks], documents=[c["text"] for c in chunks],
               embeddings=vecs.tolist(),
               metadatas=[{"doc": c["doc"], "company": c["company"], "year": c["year"]} for c in chunks])

    res = col.query(query_embeddings=q, n_results=2,
                    where={"$and": [{"company": "acme"}, {"year": {"$gte": 2025}}]})

With five chunks (two Acme leave chunks, a current and a 2024 Acme travel chunk, one Globex leave
chunk) and the question "how many casual leaves?", this returned \`leave.md#0\` at distance 0.617 and
\`leave.md#1\` at 0.79 — Chroma reports **distance** (1 − cosine), so lower is better. The Globex chunk
and the 2024 chunk were never candidates. Pass \`embeddings\` yourself: if you pass only \`documents\`,
Chroma embeds them with its own default model, which is not the one you query with.

## Qdrant with payload filters

    from qdrant_client import QdrantClient, models

    qc = QdrantClient(":memory:")                # QdrantClient(url="http://localhost:6333") in real use
    qc.create_collection("policies",
        vectors_config=models.VectorParams(size=384, distance=models.Distance.COSINE))
    qc.upsert("policies", points=[models.PointStruct(id=pid, vector=v, payload=meta) for ...])

    flt = models.Filter(must=[
        models.FieldCondition(key="company", match=models.MatchValue(value="acme")),
        models.FieldCondition(key="year", range=models.Range(gte=2025))])
    hits = qc.query_points("policies", query=qvec, query_filter=flt, limit=2).points

Same data, same answer: \`leave.md#0\` (score 0.383) then \`leave.md#1\` (0.21). Qdrant returns
**similarity**, higher is better — note the opposite convention from Chroma. In a real server, create a
**payload index** on every field you filter by (\`qc.create_payload_index("policies", "company",
field_schema=models.PayloadSchemaType.KEYWORD)\`), or filtered searches slow down as the data grows.

Qdrant point ids must be unsigned integers or UUIDs — \`"leave.md#0"\` raises
\`ValueError: Point id leave.md#0 is not a valid UUID\`. Derive a stable UUID from your chunk id with
\`uuid.uuid5(uuid.NAMESPACE_URL, "leave.md#0")\` and keep the readable id in the payload.

## Why filtering is hard for ANN

An HNSW search finds the nearest neighbours and a filter removes some. Filter **after** the search and a
strict filter (one tenant among hundreds) can leave you with zero results. Good engines filter **during**
the graph walk (Qdrant does, using payload indexes; pgvector's newer versions offer iterative index
scans for the same problem). Know which your store does, and test a small tenant explicitly.

## pgvector

Vectors in PostgreSQL, next to your relational data, with SQL filters, joins, transactions and backups:

    CREATE EXTENSION IF NOT EXISTS vector;
    CREATE TABLE policy_chunks (
        id text PRIMARY KEY, company_id int NOT NULL, source text NOT NULL, page int,
        section text, effective_from date, content text NOT NULL, embedding vector(384) NOT NULL);
    CREATE INDEX ON policy_chunks USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
    CREATE INDEX ON policy_chunks (company_id);

    SET hnsw.ef_search = 100;
    SELECT id, source, page, content, 1 - (embedding <=> $1) AS score
    FROM policy_chunks WHERE company_id = $2
    ORDER BY embedding <=> $1 LIMIT 5;

\`<=>\` is cosine distance, \`<->\` L2, \`<#>\` negative inner product; the operator in \`ORDER BY\` must
match the index's operator class (\`vector_cosine_ops\` for \`<=>\`) or the index is not used. For IVF:
\`USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)\` and \`SET ivfflat.probes = 10\`.
(The SQL here follows pgvector's documented syntax; it was not run for these notes.)

## Updating and deleting

Policies change. Ingestion must replace a document's chunks, not add to them:

- **Delete by source, then insert**: Chroma \`col.delete(where={"doc": "travel.md"})\`; Qdrant
  \`qc.delete("policies", points_selector=models.FilterSelector(filter=...))\`; SQL \`DELETE ... WHERE
  source = $1\`. In the run above, deleting \`travel.md\` took both stores from 5 chunks to 3.
- **Upsert by stable id** for edits that keep the chunk structure: upserting the same Qdrant id twice
  left one point with the newer payload; \`INSERT ... ON CONFLICT (id) DO UPDATE\` in Postgres.
- If a new version has fewer chunks than the old, upsert alone leaves orphans — delete by source.
- Payload-only changes (mark a policy superseded) need no re-embedding: Qdrant \`set_payload\`, Chroma
  \`update(ids=..., metadatas=...)\`.

## Which one?

Chroma for prototypes and small embedded apps; Qdrant when vectors are the main workload and you need
fast filtered search at scale; pgvector when you already run Postgres and want one database with SQL
filters and transactions. Choose on operations, not benchmarks.`,
    mcqs: [
      mcq('A Chroma query returns a distance of 0.617 for the best chunk and 0.79 for the second. A teammate says the second is the better match because its number is higher. Who is right?', [
        ['The teammate, since a higher number always means more similar', false],
        ['Neither, since Chroma distances cannot be compared across chunks', false],
        ['Not the teammate: Chroma reports distance, so lower is closer', true],
      ], 'Chroma returns a distance (for cosine, 1 − similarity), so 0.617 is closer than 0.79. Qdrant returns a similarity score where higher is better — the conventions are opposite, which is a common source of inverted thresholds.'),
      mcq('Upserting `PointStruct(id="leave.md#0", ...)` into Qdrant raises "Point id leave.md#0 is not a valid UUID". What is the right fix?', [
        ['Use uuid5 of the chunk id as the point id, and keep it in the payload', true],
        ['Use random uuid4 values so every upsert gets its own new point id', false],
        ['Strip the "#0" so the id becomes the plain file name "leave.md"', false],
        ['Switch to a Qdrant collection type that accepts string ids', false],
      ], 'Qdrant ids are unsigned integers or UUIDs. uuid5 is deterministic, so re-ingesting the same chunk upserts the same point. uuid4 is random, so every run would add duplicates; dropping the suffix makes all chunks of a file collide.'),
      mcq('In pgvector, an HNSW index is built with `vector_cosine_ops`, but the query orders by `embedding <-> $1`. What happens?', [
        ['pgvector converts the operator to cosine and uses the index', false],
        ['The index is not used, since <-> is L2 and needs vector_l2_ops', true],
        ['The query fails with an error until the operator is changed', false],
        ['Results come back in reverse order, highest distance first', false],
      ], 'An index serves only the operator of its operator class. <-> is Euclidean distance, so Postgres falls back to a sequential scan — correct results, but slowly, and silently. Use <=> with vector_cosine_ops.'),
    ],
    checkpoint: [
      mcq('An HR assistant serves 300 companies from one HNSW collection. It retrieves the top 10 and then keeps only the caller\'s company. Small companies often get nothing. What is the fix?', [
        ['Filter on company inside the search, backed by a payload index', true],
        ['Increase the top k from 10 to 50 so small companies show up too', false],
        ['Give small companies\' chunks a score boost before ranking them', false],
        ['Rebuild the HNSW index with a larger m so it links more vectors', false],
      ], 'Post-filtering lets other tenants fill the top 10. Filtering during the search (Qdrant with a payload index, a WHERE clause in pgvector) ranks only the caller\'s chunks. A bigger k only makes the failure rarer; it is still a leak-prone design.'),
      mcq('The travel policy is revised from 14 chunks to 9. Ingestion upserts the 9 new chunks by id. What goes wrong?', [
        ['Five old chunks stay in the store and can still be retrieved', true],
        ['The upsert fails because the chunk count no longer matches', false],
        ['The nine new chunks are ignored because their ids already exist', false],
      ], 'Upsert replaces chunks whose ids match and leaves the rest. Ids 9 to 13 from the old version survive as orphans quoting the old rules. Delete by source first (or delete ids not in the new set), then insert.'),
      mcq('A team moves from brute-force search to an HNSW index and wants to know what it lost. What should it measure?', [
        ['Average query latency before and after, since speed was the goal', false],
        ['Overlap of the HNSW top 10 with exact top 10 on sample queries', true],
        ['Memory used by the index compared with the raw vectors alone', false],
        ['The share of queries that return exactly k results after the change', false],
      ], 'HNSW is approximate, so its cost is recall: some true nearest neighbours are missed. Comparing its results with exact search on a sample shows how many, and ef_search can be raised until that recall is acceptable.'),
    ],
  },

  /* ── HYBRID_RERANK ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_RAG_DEEP_HYBRID_RERANK',
    notes: `**Vector search finds meaning; keyword search finds exact words. Production retrieval usually wants
both, then a re-ranker to put the best few on top.** Employees ask "When is Form 12BB due?", "what
does EXP-71 cover?", "LTA rules" — codes, acronyms and names where one exact token matters more than
the overall meaning.

## BM25 in one paragraph

BM25 scores a chunk by the query words it contains, weighted by how rare each word is across the
corpus (IDF), with diminishing returns for repeats and a correction for long chunks. No model, no
GPU, instant to build. With \`rank-bm25\`:

    import re, numpy as np
    from rank_bm25 import BM25Okapi

    def tokenize(text: str) -> list[str]:
        return re.findall(r"[a-z0-9]+", text.lower())

    bm25 = BM25Okapi([tokenize(t) for t in texts])
    scores = bm25.get_scores(tokenize("When is Form 12BB due?"))

Its weaknesses are the vector model's strengths: no synonyms ("travel bill" never matches "expense
claim"), no paraphrase, and — with a naive tokenizer — no stemming ("claim" and "claimed" are different
words) and no stop-word handling.

## Where each one fails — real runs

A ten-chunk HR and travel corpus, BM25 and all-MiniLM-L6-v2 side by side:

- **"what is the deadline to file my travel bill?"** BM25's top hit was the **cab fares** chunk
  (3.22): it matched "the", "to" and "travel". Vector search found the right chunk, "Expense claims must
  be submitted in the portal within 30 days" (0.454). Removing stop words stopped the cab-fare match
  but BM25 still could not find the answer — the question and the chunk share no meaningful word.
- **"How often can I claim LTA?"** BM25 ranked the Form 12BB chunk first ("...to claim HRA and LTA
  exemptions" contains "claim"; the LTA chunk says "claimed"). Vector search ranked the LTA policy first.
- **"EXP-71"** against four expense-code chunks (EXP-07, EXP-17, EXP-70, EXP-71): vector scores were
  0.27, 0.302, 0.344, 0.329 — right answer, by a margin of 0.015, which will not survive a bigger
  corpus. BM25 with a tokenizer that keeps \`exp-71\` as one token scored 0.9 for the right chunk and 0
  for the others.

Neither is reliably better; they fail on different questions. That is the case for combining them.

## Reciprocal rank fusion (RRF)

BM25 scores (0 to ~10) and cosine scores (−1 to 1) are on different scales, so you cannot add them.
RRF ignores scores and uses only **ranks**:

    def rrf(*ranked_lists, k=60):
        scores = {}
        for ranked in ranked_lists:
            for rank, doc_id in enumerate(ranked, start=1):
                scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (k + rank)
        return sorted(scores.items(), key=lambda kv: kv[1], reverse=True)

A chunk ranked first by both lists scores 2/61 ≈ 0.0328; one ranked first by one list and absent from
the other gets 1/61 ≈ 0.0164. \`k=60\` (from the original paper) damps the difference between ranks 1
and 2 so that agreement between lists matters more than one list's top spot. For "travel bill", RRF
put the expense-claims chunk first (0.0318) — BM25's wrong first choice was outvoted. Retrieve 20–50
from each list, fuse, keep the top 20 for re-ranking.

Qdrant can do this inside one query, with a dense and a sparse vector per point:

    res = qc.query_points("policies",
        prefetch=[models.Prefetch(query=dense_vec, using="dense", limit=20),
                  models.Prefetch(query=sparse_vec, using="sparse", limit=20)],
        query=models.FusionQuery(fusion=models.Fusion.RRF), limit=5)

(the collection is created with \`sparse_vectors_config={"sparse":
models.SparseVectorParams(modifier=models.Modifier.IDF)}\`). For "How often can I claim LTA?" it
returned the LTA chunk and the Form 12BB chunk tied at 0.833 — fusion alone could not separate them.

## Cross-encoder re-ranking

An embedding model (a **bi-encoder**) encodes question and chunk separately and compares vectors —
fast, because chunk vectors are precomputed, but each side never sees the other. A **cross-encoder**
reads question and chunk **together** in one pass and outputs a relevance score. Much more accurate,
much slower — too slow for a million chunks, ideal for the top 20.

    from sentence_transformers import CrossEncoder

    ce = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
    def rerank(q: str, cand_ids: list[str], top: int = 3):
        s = ce.predict([(q, text_of[i]) for i in cand_ids])
        order = np.argsort(-s)[:top]
        return [(cand_ids[i], round(float(s[i]), 2)) for i in order]

For "LTA rules", BM25 and vector disagreed and RRF tied them (0.0325 each); the cross-encoder scored
the LTA policy 5.18 and the Form 12BB chunk −0.69 — a clear decision. Scores from this model are
unbounded logits, not probabilities: compare them within one question, and set any "nothing relevant"
threshold from your golden set. Hosted re-rankers (Cohere, Voyage, Jina and others) do the same job by
API; a local cross-encoder keeps documents in-house.

## The pipeline, and its cost

    question → BM25 top 20  ┐
                            ├→ RRF → top 20 → cross-encoder → top 5 → prompt
    question → vector top 20┘

Re-ranking is the slow stage: 20 short pairs through the MiniLM cross-encoder took about 0.4 seconds
on an ordinary laptop CPU when these notes were written. A GPU, batching, or a hosted re-ranker is much
faster — time it against your latency budget, and re-rank 20 candidates, not 200. Then check on
the golden set that each stage pays for itself; on the small set in the evaluation unit, hybrid alone
was **worse** than vector alone, and only hybrid plus re-ranking matched it.`,
    workedExample: `**Problem: a policy assistant answers expense-code questions wrongly about one time in five.
"What does EXP-17 cover?" sometimes returns EXP-71's rules.**

**1. Reproduce.** Vector scores for "EXP-71" over the four code chunks were 0.27, 0.302, 0.344 and
0.329: the right chunk wins by 0.015. A model that reads "EXP-71" as word pieces sees EXP-17, EXP-70
and EXP-71 as nearly the same string. On a larger corpus, the margin vanishes.

**2. Add BM25 — with a tokenizer that keeps codes whole.** The default \`[a-z0-9]+\` splits "exp-71"
into "exp" and "71". Use \`[a-z0-9]+(?:-[a-z0-9]+)*\`, which turned "What does EXP-17 cover?" into
\`['what', 'does', 'exp-17', 'cover']\`. BM25 then scored the EXP-17 chunk 0.82 and the others 0.

**3. But watch the stop words.** "what is exp-70 for" gave the EXP-71 chunk 0.9 and EXP-70 only 0.82:
the word "for" appears in the EXP-71 chunk ("relocation costs for transfers"). Tokenize the query and
the chunks the same way and drop a short stop-word list from both.

**4. Fuse with RRF**, 20 candidates from each list, and **re-rank** the top 20 with the cross-encoder.
Where BM25 is confident (an exact code), it pulls the chunk into both lists' top ranks; where the
question is a paraphrase, the vector list carries it.

**5. Measure, per question type.** Split the golden set: code and acronym questions, paraphrased
questions, plain questions. Report recall@5 for vector-only and hybrid+rerank on each slice. The
improvement shows up where you expect it — on codes — and the slice report proves the paraphrase
questions did not get worse.

**6. Ship with a guard.** Log, for every answer, the BM25 rank, vector rank and re-ranker score of the
chunks used. When a complaint comes in, you can see which stage chose the wrong passage.`,
    mcqs: [
      mcq('Why does reciprocal rank fusion combine BM25 and vector results by rank rather than by adding their scores?', [
        ['The two scores are on different scales, so a sum would be skewed', true],
        ['Adding the scores is too slow when there are many candidate chunks', false],
        ['Vector scores can be negative, and a negative sum breaks the sort', false],
        ['Ranks are more precise than scores, which get rounded on the way', false],
      ], 'BM25 scores run from 0 to around 10, cosine from −1 to 1; summed, BM25 would dominate. Ranks put both lists on one scale. Speed is not the reason, and negative numbers sort perfectly well.'),
      mcq('A bi-encoder and a cross-encoder can both score a question against a chunk. Why is the cross-encoder used only on the top 20 or so candidates?', [
        ['It cannot be used on more than 20 chunks because of its token limit', false],
        ['It must run once per pair at query time, so it is too slow for all', true],
        ['Its scores are only meaningful when compared within a short list', false],
      ], 'A cross-encoder reads question and chunk together, so nothing can be precomputed: scoring a million chunks means a million model runs per question. The bi-encoder\'s chunk vectors are computed once at ingestion, which is why it does the first pass.'),
      mcq('BM25 ranks a cab-fare chunk first for "what is the deadline to file my travel bill?". Looking at the matched words shows "the", "to" and "travel". What is the first fix to make?', [
        ['Raise the BM25 k1 parameter so that repeated words count for less', false],
        ['Replace BM25 with vector search, since BM25 cannot handle questions', false],
        ['Remove stop words from the query and the chunks when tokenizing', true],
        ['Lowercase the chunks but keep the query\'s capitals as they are', false],
      ], 'Words like "the" and "to" carry no meaning but still add score. Removing stop words on both sides stops that. BM25 still needs vector search for paraphrases, which is why hybrid search exists, but dropping it loses exact-code matching.'),
    ],
    checkpoint: [
      mcq('In RRF with k=60, chunk A is ranked 1st by BM25 and absent from the vector list; chunk B is ranked 2nd by both. Which ranks higher after fusion?', [
        ['B, since 2/62 ≈ 0.0323 is more than 1/61 ≈ 0.0164', true],
        ['A, since a first place always outranks two second places', false],
        ['They tie, since each one received two points of evidence', false],
      ], 'RRF sums 1/(k + rank) over lists: A gets 1/61, B gets 1/62 + 1/62. Agreement between two retrievers outweighs one retriever\'s top spot — which is what fusion is for.'),
      mcq('After adding a cross-encoder, a developer sets "drop chunks scoring below 0.5" because "0.5 is a probability midpoint". Relevant chunks start disappearing. Why?', [
        ['The model outputs unbounded scores, so 0.5 is not a midpoint', true],
        ['Cross-encoders score relevant chunks below 0.5 only in Hindi', false],
        ['The threshold should be applied before re-ranking, not after it', false],
        ['Cross-encoders only work when the threshold is set to exactly zero', false],
      ], 'ms-marco cross-encoders return raw logits — the run in the notes gave 7.33 and −11.35 — so a relevant chunk can score below 0.5. Any threshold must be read off a golden set for that model, not assumed.'),
      mcq('Employees search for policy codes like "HR-114" and "EXP-71", and vector search keeps confusing similar codes. Which change helps most directly?', [
        ['A larger embedding model with more dimensions for the codes', false],
        ['Smaller chunks, so that each code sits in a chunk of its own', false],
        ['Hybrid search with BM25, with a tokenizer that keeps codes whole', true],
        ['A higher HNSW ef_search, so the index walks to more candidates', false],
      ], 'Exact identifiers are what keyword search is good at and embeddings are bad at — near-identical strings land near each other. ef_search improves index recall, not the model\'s inability to tell 17 from 71.'),
    ],
  },

  /* ── QUERY_TRANSFORM ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_RAG_DEEP_QUERY_TRANSFORM',
    notes: `**Users do not type search queries; they type messages.** "And for L5?" after a question about
hotel limits. "chhutti kitni milti hai?" "my manager said something about LTA, how does that work and
can I claim it for Goa and do I need tickets". Embedding these raw retrieves badly. A cheap model call
before retrieval — to rewrite, split or route the question — is often the biggest single improvement
after chunking.

## 1. Follow-ups into standalone questions

In a chat, the second message depends on the first:

    user:      What is the hotel limit in metro cities for L3?
    assistant: Up to Rs 3,500 per night [1].
    user:      And for L5?

"And for L5?" embedded alone matches nothing useful. **Condense** it with the history into a question
that stands alone, and retrieve with that — but answer the user's actual message with the history:

    CONDENSE = (
        "Rewrite the user's last message as one standalone question for searching company policy "
        "documents. Resolve pronouns and references using the conversation. Keep names, codes, grades "
        "and numbers exactly. Do not answer it. Reply with only the question."
    )

    def standalone_question(client, model: str, history: list[dict], message: str) -> str:
        if not history:
            return message                              # first turn: nothing to resolve
        transcript = "\\n".join(f"{m['role']}: {m['content']}" for m in history[-6:])
        resp = client.chat.completions.create(
            model=model, temperature=0, max_tokens=80,
            messages=[{"role": "system", "content": CONDENSE},
                      {"role": "user", "content": f"Conversation:\\n{transcript}\\n\\nLast message: {message}"}])
        return (resp.choices[0].message.content or message).strip()

Expected output: "What is the hotel limit in metro cities for grade L5?". (This call needs an API key;
any chat model works, and a small, fast one is the right choice — it runs on every turn.) Keep only the
last few turns, skip the call on the first turn, and **log** the rewritten question beside the
original: when retrieval fails, the rewrite is the first suspect.

## 2. Translating or normalising the language

The embedding unit showed romanised Hinglish defeating both an English and a multilingual model. The
same condense call can also say "write the question in English". "chhutti kitni milti hai saal mein?"
becomes "How many days of leave do employees get per year?" — which the English chunks match. Answer in
the user's language afterwards if the product wants that; retrieve in the documents' language.

## 3. Multi-query: several searches for one question

One question can need several passages — "Can I claim LTA for a Goa trip, and do I need to keep the
tickets?" asks about eligibility **and** proof. Or one phrasing can just miss. Generate a few queries,
retrieve for each, and fuse with RRF (from the hybrid unit):

    MULTI = ("Write 3 different search queries that together cover everything needed to answer the "
             "question. One per line, no numbering.")

    def multi_query_search(client, model, question, search, k=5):
        resp = client.chat.completions.create(model=model, temperature=0.3, max_tokens=120,
            messages=[{"role": "system", "content": MULTI}, {"role": "user", "content": question}])
        queries = [question] + [q.strip() for q in (resp.choices[0].message.content or "").splitlines() if q.strip()]
        ranked_lists = [[doc_id for doc_id, _ in search(q, k=20)] for q in queries[:4]]
        return rrf(*ranked_lists)[:k]

Always keep the **original** question as one of the queries — a bad rewrite should not be able to lose
what the user typed. Cost: one extra model call and N searches; worth it for complex questions, wasted
on "how many casual leaves?". Some teams only decompose when the question is long or contains "and".

**HyDE** (hypothetical document embeddings) is a cousin: ask the model to write a short *fake answer*,
embed that, and search with it — answers look more like chunks than questions do. It helps when
questions and documents are written very differently; it hurts when the model's fake answer is wrong
in a way that pulls the wrong chunk. Measure before adopting it.

## 4. Routing to the right index

A company has HR policies, travel and expenses, and IT security — maybe in separate collections, with
different owners and access rules. Routing sends a question to the right one(s). The cheapest router
compares the question with a description of each index:

    ROUTES = {
        "hr_policies":     "Leave, holidays, attendance, maternity, notice period, appraisal and HR rules",
        "travel_expenses": "Business travel, hotels, flights, trains, cabs, per diem and expense claims",
        "it_security":     "Laptops, passwords, VPN, phishing, lost devices and IT security rules",
    }
    names = list(ROUTES)
    R = model.encode(list(ROUTES.values()), normalize_embeddings=True)

    def route(question: str, min_score: float = 0.25) -> list[str]:
        s = R @ model.encode([question], normalize_embeddings=True)[0]
        best = [names[i] for i in np.argsort(-s) if s[i] >= min_score][:2]
        return best or names                         # unsure: search everything

With all-MiniLM-L6-v2 this printed:

    Can I book a cab to the airport?    [0.12 0.35 0.  ]   ['travel_expenses']
    How many sick days do I have?       [0.16 0.04 0.03]   ['hr_policies', 'travel_expenses', 'it_security']
    I clicked a weird link in an email  [-0.12 -0.03 0.13] ['hr_policies', 'travel_expenses', 'it_security']
    Who won the IPL?                    [-0.06 0.06 0.07]  ['hr_policies', 'travel_expenses', 'it_security']

Note what happened. Only the cab question cleared the threshold; "sick days" and "weird link" scored
too low against short descriptions and fell back to searching everything. That fallback is what saved
them: a router that is **unsure must widen the search, never narrow it to a guess**. To do better:

- **An LLM classifier with structured output** — the model returns \`{"routes": ["hr_policies"]}\` from a
  fixed enum (you built structured output in Python with AI). More accurate on vague questions, one
  more call.
- **Rules first** for the obvious: a code starting "EXP-" goes to expenses.
- **A few labelled examples per route** instead of one description, scoring the question against the
  nearest example.

"Who won the IPL?" is out of scope; routing should not invent a home for it. Let retrieval's threshold
find nothing and the assistant say it answers only company-policy questions.

## Routing for permissions too

Routing can also carry **who may see what**: a contractor's question is never routed to the
salary-bands index. That must be enforced by a filter or a separate collection the user's role cannot
reach — not by the router's judgement, which a cleverly worded question can steer.

## Measure every transform

Each transform is a model call that can be wrong. Run the golden set with and without it, and include
follow-up and Hinglish questions in the set — otherwise the transform cannot show its value, and the
cost is all you will see.`,
    workedExample: `**Problem: in an HR chat assistant, second and third questions get poor answers, though the same
questions asked fresh are answered well.**

**1. Look at what was retrieved.** The log shows the retriever embedding the raw message. Turn 2 was
"And for L5?"; the top chunk was the cab-fare policy (it mentions grades), not the hotel table.

**2. Add a condense step.** Before retrieval, call a small model with the last six messages and the
CONDENSE prompt. Turn 2 becomes "What is the hotel limit in metro cities for grade L5?". The hotel
table row "Grade: L4-L6; Hotel per night (metro): Rs 6,000" is now the top chunk.

**3. Keep the answer step honest.** The answer prompt still gets the full recent conversation plus the
retrieved chunks, so the reply reads naturally ("For L5 it is up to Rs 6,000 per night [1]"). Only the
**search** uses the rewritten question.

**4. Guard the rewrite.** The rewrite must keep grades, codes and numbers exactly. Add a check: every
token in the original that looks like a code or number (\`L5\`, \`EXP-71\`, \`12BB\`) must appear in the
rewrite; if not, search with both the original and the rewrite and fuse.

**5. Skip it when it cannot help.** The first message of a conversation has nothing to resolve, so no
call is made. That keeps the median latency unchanged.

**6. Prove it.** Add 15 follow-up conversations to the golden set, each with the chunk the last turn
needs. Recall@5 on those, before and after the condense step, is the number that justifies an extra
model call per turn — and the plain questions in the set show nothing else got worse.`,
    mcqs: [
      mcq('A chat assistant condenses "And for L5?" into "What is the hotel limit in metro cities for grade L5?". Which text should the final answer prompt receive?', [
        ['The recent conversation, the user\'s message and the retrieved chunks', true],
        ['Only the rewritten question and the chunks, so history is not needed', false],
        ['Only the original "And for L5?" with no chunks, as the user typed it', false],
      ], 'The rewrite exists to search well. The answer should respond to what the user actually said in context, so it gets the conversation and the chunks. Dropping history makes the reply read oddly and loses details the rewrite might have missed.'),
      mcq('In multi-query retrieval, why should the user\'s original question stay in the list of queries next to the generated ones?', [
        ['The vector database needs at least one query that is in English', false],
        ['A bad rewrite then cannot lose what the user actually typed', true],
        ['RRF requires an odd number of ranked lists to break its ties', false],
        ['Generated queries cannot be embedded with the same model', false],
      ], 'Generated queries can drift or drop a code. Keeping the original as one ranked list means its results still take part in fusion. RRF works with any number of lists, and every query is embedded with the same model.'),
      mcq('An embedding router scores "How many sick days do I have?" below the threshold for every route. What should it do?', [
        ['Send it to the route with the highest score, however low it is', false],
        ['Reply that the question is outside what the assistant answers', false],
        ['Search every index and let retrieval\'s threshold decide', true],
        ['Ask the user to choose an index from a dropdown before searching', false],
      ], 'Low router confidence means the router does not know, not that the question is out of scope. Widening the search is safe; guessing a single route risks missing the answer, and refusing would wrongly turn away an ordinary HR question.'),
    ],
    checkpoint: [
      mcq('Users of an HR bot often type in romanised Hinglish and retrieval over English policies fails. Where does a translation step belong?', [
        ['Before retrieval, rewriting the question into English for search', true],
        ['After retrieval, translating the chunks into Hinglish for the user', false],
        ['At ingestion, storing a Hinglish copy of every chunk in the index', false],
      ], 'The failure is the search: a Hinglish query vector does not match English chunks. Rewriting the query into the documents\' language fixes retrieval; the answer can still be written in the user\'s language. Translating chunks after retrieval is too late.'),
      mcq('A team adds HyDE — embedding a model-written fake answer instead of the question. Recall improves on paraphrases but drops on questions about exact limits and dates. Why?', [
        ['The fake answer invents figures that pull in the wrong chunks', true],
        ['HyDE answers are too long for the embedding model\'s input limit', false],
        ['The fake answer is embedded with a different model than the chunks', false],
        ['HyDE disables the metadata filters used by the vector database', false],
      ], 'A hypothetical answer can contain wrong numbers or dates, and the search then follows them to chunks with similar wrong figures. That is why HyDE must be measured per question type, not adopted on faith.'),
      mcq('A router sends questions to a "salary bands" index only when it judges the user is a manager. Why is that unsafe?', [
        ['A worded question can steer a router, so access needs a filter', true],
        ['Routers cannot read the user\'s role from the conversation history', false],
        ['Salary data must never be stored in a vector database at all', false],
        ['The salary index would be searched too rarely to stay accurate', false],
      ], 'Routing is a model\'s judgement and can be manipulated by the question text. Permissions must be enforced by filters or collections the user\'s role cannot reach, checked in code. Storing such data in a vector store is fine with proper access control.'),
    ],
  },

  /* ── RETRIEVAL_EVAL ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_RAG_DEEP_RETRIEVAL_EVAL',
    notes: `**Every change in this topic — chunk size, embedding model, hybrid search, a re-ranker, a query
rewrite — is a bet. A golden set turns the bet into a number.** In Python with AI you checked whether
the right source appeared in the answer. Here you measure the retrieval stage on its own, so you can
tell a retrieval failure from a generation failure, and compare two designs on the same questions.

## The golden set

A list of questions, each with the passages that answer it:

    GOLDEN = [
        ("How many casual leaves do I get in a year?",              {"leave#0"}),
        ("Can I carry earned leave into next year?",                {"leave#1"}),
        ("Do I need a medical certificate for two days off sick?",  {"leave#2"}),
        ("How often can I claim LTA?",                              {"leave#3"}),
        ("Which train class can an L2 employee book?",              {"travel#0"}),
        ("Where is the hotel limit for my grade?",                  {"travel#1"}),
        ("what is the deadline to file my travel bill?",            {"travel#2"}),
        ("Is the Uber to the airport paid back?",                   {"travel#3"}),
        ("I lost my laptop on the metro, what now?",                {"it#0"}),
        ("When must I give payroll my rent receipts declaration?",  {"it#1"}),
    ]

Where the questions come from decides whether the number means anything:

- **Real questions** from helpdesk tickets, search logs or a pilot — not ones you wrote while looking at
  the document (those copy its wording, and every system looks good).
- **Paraphrases** with no shared words ("Uber to the airport" vs "cab fares"), **codes and acronyms**,
  **follow-ups**, **Hinglish**, and **unanswerable** questions (expected set empty — for those you check
  that the best score stays under the threshold).
- **Size**: 50–200 questions is a working set. With 10, one question is 10 percentage points.

## Label passages, not chunk ids

Chunk ids change when chunking changes — exactly the change you most want to measure. Store each
answer as **source plus a short exact quote**, and count a chunk as relevant if it comes from that
source and contains the quote:

    {"q": "Can I carry earned leave into next year?",
     "answers": [{"source": "leave-policy.pdf", "quote": "Up to 30 days of earned leave can be carried forward"}]}

    def is_relevant(chunk: dict, answers: list[dict]) -> bool:
        return any(chunk["source"] == a["source"] and a["quote"] in chunk["text"] for a in answers)

Now the same golden set scores a 200-character and a 500-character chunking. (Pick quotes short enough
not to straddle a chunk boundary.)

## Recall@k and MRR

**Recall@k** — of the relevant passages, the fraction that appear in the top k. With one relevant
passage per question it is simply "was it in the top k?", averaged over questions. Choose k as the
number of chunks your prompt actually receives: if the model sees five chunks, recall@5 is the number
that limits answer quality.

**MRR** (mean reciprocal rank) — for each question, 1 / (rank of the first relevant chunk), 0 if none;
averaged. A right answer at rank 1 scores 1, at rank 2 scores 0.5, at rank 3 scores 0.33. It rewards
putting the answer on top, which matters when a model leans on the first chunk.

    def recall_at_k(ranked: list[str], relevant: set[str], k: int) -> float:
        return len(set(ranked[:k]) & relevant) / len(relevant)

    def reciprocal_rank(ranked: list[str], relevant: set[str]) -> float:
        for rank, doc_id in enumerate(ranked, start=1):
            if doc_id in relevant:
                return 1.0 / rank
        return 0.0

    print(recall_at_k(["a", "b", "c"], {"c", "d"}, 3), reciprocal_rank(["a", "b", "c"], {"c", "d"}))

prints \`0.5 0.3333333333333333\` — one of the two relevant items was found, the first one at rank 3.

Related metrics you will meet: **precision@k** (how much of the top k is relevant — matters when chunks
cost tokens), **hit rate** (recall@k with one relevant item), and **nDCG** (graded relevance, when some
passages are better answers than others).

## Comparing four designs

The ten questions above, over the ten-chunk HR and travel corpus, four retrieval designs:

    system         recall@1 recall@3 MRR
    bm25           0.70 0.90 0.820  ['How often can I claim LTA?', 'Which train class can an L2 employee book?', 'what is the deadline to file my travel bill?']
    vector         1.00 1.00 1.000  []
    hybrid         0.90 1.00 0.950  ['How often can I claim LTA?']
    hybrid+rerank  1.00 1.00 1.000  []

(the list is the questions each design missed at rank 1). Three lessons, all real:

1. **Hybrid was worse than vector alone here.** BM25's errors ("LTA" matching "claim" in the wrong
   chunk) leaked into the fusion. Hybrid search is not automatically an improvement.
2. **The re-ranker repaired it** — but on this set it only matched vector search; it did not beat it.
3. **The set is too easy and too small.** Vector search scored 1.00, so the set cannot show any
   improvement any more — it has saturated. Add harder questions (codes like EXP-71, Hinglish,
   follow-ups) until the best system misses some. A benchmark nobody fails measures nothing.

## Making decisions on the numbers

- Change **one thing** at a time and re-run the whole set.
- Look at the **misses**, not only the averages; the list above told us exactly which question BM25
  hurt.
- Report by **slice** (codes, paraphrases, Hinglish, follow-ups): a change can help one slice and hurt
  another while the average stays flat.
- Treat small differences on small sets as noise: on 50 questions, 0.82 vs 0.84 is one question.
- Track **latency and cost** beside quality: a re-ranker that adds 0.4 s for +0.01 recall may not be worth it.
- Keep the set **versioned** in the repository and run it in CI on retrieval changes (the evaluation
  topic builds that gate). Retrieval metrics need no LLM, so they are fast and free to run.

## Retrieval or generation?

If recall@5 is high and answers are still wrong, the model is ignoring or misreading good context — a
prompt or model problem. If recall@5 is low, no prompt will fix it. Measure retrieval first; the next
topic adds faithfulness and answer metrics (Ragas and others) on top.`,
    workedExample: `**Problem: the team must choose chunk size 200 or 500 characters for the policy assistant, and two
engineers disagree.**

**1. Fix the golden set first.** 60 real questions from the HR inbox, each labelled with a source and a
quote — not chunk ids, because both chunkings produce different ids. 8 are unanswerable.

**2. Build both indexes** from the same parsed text, same embedding model, same hybrid + re-rank
pipeline. Only chunk size differs.

**3. Score both with the same function:**

    def evaluate(search, golden, k):
        r = m = 0.0
        misses = []
        for item in golden:
            ranked = search(item["q"])                       # list of chunk dicts, best first
            hits = [is_relevant(c, item["answers"]) for c in ranked]
            r += any(hits[:k])
            m += next((1 / (i + 1) for i, h in enumerate(hits) if h), 0.0)
            if not any(hits[:k]):
                misses.append(item["q"])
        return r / len(golden), m / len(golden), misses

(run over the 52 answerable questions; the 8 unanswerable ones are checked separately, by whether
the top re-ranker score stays below the refusal threshold).

**4. Read the result.** Suppose 200-character chunks give recall@5 0.81 and 500-character chunks 0.88,
with MRR 0.66 and 0.71. The difference is about four questions out of 52 — real but modest. The miss
list shows the 200-character version failing on table rows split from their headers, a parsing issue
the bigger chunks happened to hide.

**5. Decide, and say why.** Choose 500, because it wins on recall@5 — the number that limits what the
model sees — and fix the table-row parsing anyway, since it would bite at any size. Record the scores,
the set version and the commit in the pull request, so the next change starts from a known baseline.

(The numbers in step 4 are an illustration of how to read the result; the method is what to copy.)`,
    mcqs: [
      mcq('A golden-set question has one relevant chunk, which a search returns at rank 4. What are its recall@3 and reciprocal rank?', [
        ['recall@3 = 0 and reciprocal rank = 0.25', true],
        ['recall@3 = 0.25 and reciprocal rank = 0', false],
        ['recall@3 = 1 and reciprocal rank = 0.25', false],
        ['recall@3 = 0 and reciprocal rank = 0.75', false],
      ], 'The chunk is outside the top 3, so recall@3 is 0; it is first found at rank 4, so the reciprocal rank is 1/4. Recall@k ignores everything below k, while MRR still gives partial credit for a lower rank.'),
      mcq('Why should a golden set label each answer as a source plus a short quote rather than as a chunk id like "leave#3"?', [
        ['Chunk ids change when chunking changes, which is what you compare', true],
        ['Quotes are smaller to store than chunk ids in the evaluation file', false],
        ['Vector databases do not return chunk ids along with their results', false],
      ], 'A different chunk size produces different chunks and different ids, so id labels only work for the chunking they were made for. A quote can be found in whichever chunk holds it. Storage size is irrelevant, and stores do return ids.'),
      mcq('On a 10-question golden set every design scores recall@3 of 1.00. What should the team conclude?', [
        ['Retrieval is solved, so effort should go into the prompt instead', false],
        ['The set has saturated and needs harder, more varied questions', true],
        ['Recall@3 is the wrong metric and should be replaced by nDCG', false],
        ['Any of the designs can ship, since all of them are equally good', false],
      ], 'When every system scores perfectly, the set can no longer tell them apart or show an improvement. Adding codes, paraphrases, Hinglish and follow-ups makes it discriminate again. Switching metric on the same easy questions does not help.'),
    ],
    checkpoint: [
      mcq('A RAG assistant gives wrong answers, and its recall@5 on the golden set is 0.95. Where should the team look first?', [
        ['At the prompt and model, since the right chunks are reaching it', true],
        ['At the chunking, since a high recall means chunks are too large', false],
        ['At the embedding model, since recall@5 hides embedding errors', false],
      ], 'With the right passage in the top 5 almost always, retrieval is doing its job; the generation step is misusing good context. If recall were low, no prompt change could fix the answers.'),
      mcq('Adding a re-ranker moves recall@5 from 0.84 to 0.85 on a 50-question set and adds 0.4 seconds per question. What is the soundest reading?', [
        ['A gain of about one question, likely noise, for a real latency cost', true],
        ['A clear improvement, since any rise in recall is worth shipping', false],
        ['A failure, since a re-ranker should always add at least 0.10', false],
        ['A sign the golden set is broken, since recall barely changed', false],
      ], 'On 50 questions, 0.01 is half a question — within noise. The latency is certain. The right move is to check the misses and the MRR, enlarge the set, and decide with cost in view; there is no fixed gain a re-ranker must deliver.'),
      mcq('Hybrid search lowers average recall@5 slightly, but a slice report shows it rising on code questions and falling on paraphrases. What does this tell the team?', [
        ['That the average hid two effects, and paraphrase losses need a fix', true],
        ['That hybrid search is broken and should be removed straight away', false],
        ['That the code questions should be dropped from the golden set', false],
      ], 'Slices reveal what an average hides: BM25 helps exact codes and its noise hurts paraphrases. The fix might be stop-word handling, fusion weights or a re-ranker — then re-measure both slices. Removing the questions that show a gain hides the evidence.'),
    ],
  },

  /* ── DEBUGGING ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_RAG_DEEP_DEBUGGING',
    notes: `**Retrieval bugs rarely crash. They return confident, plausible, wrong passages.** The method is the
same every time: take one failing question, print what each stage produced — parsed text, chunks,
the rewritten query, BM25 ranks, vector ranks, fused ranks, re-ranker scores — and find the first stage
whose output is wrong. Fix that stage only, then re-run the golden set.

## 1. The dimension error after "just switching the model"

**Symptom.** Ingestion worked. After changing the query side to a hosted embedding model, every
search fails:

    chromadb.errors.InvalidArgumentError: Collection expecting embedding with dimension of 384, got 1536

**Cause.** The collection was filled with 384-dimension vectors from a local model; queries now come
from a 1,536-dimension model. (Qdrant says the same thing as \`Vector dimension error: expected dim:
384, got 1536\`.) The loud failure is the lucky case — a same-size swap would have failed silently.

**Fix.** One embedding function used by both ingestion and query, configured in one place; store the
model name in collection metadata and check it on start-up; re-embed into a new collection when the
model changes.

## 2. The inverted threshold

**Symptom.** Moving from Qdrant to Chroma, the assistant now answers nonsense confidently and refuses
questions it used to answer.

**Cause.** The filter \`if score >= 0.5: keep\` was copied across. Qdrant returns cosine **similarity**
(higher is better); Chroma returns **distance** (1 − similarity, lower is better). The code is now keeping
the worst chunks and dropping the best.

**Fix.** Convert at the boundary — \`similarity = 1 - distance\` for Chroma's cosine space — so the rest of
the code sees one convention, and add a test with one obviously relevant and one irrelevant chunk.

## 3. The chunk count that doubles

**Symptom.** After the nightly re-ingest, "How many casual leaves?" returns the same passage three
times, and the collection count grows every night.

**Cause.** Qdrant point ids were made with \`uuid.uuid4()\` — random, so every run inserts new points
instead of replacing old ones.

**Fix.** \`uuid.uuid5(uuid.NAMESPACE_URL, chunk_id)\` gives the same UUID for the same chunk every run, so
upsert replaces. And delete by \`source\` before inserting, for documents whose chunk count shrinks.

## 4. BM25 that never matches codes

**Symptom.** Hybrid search was added for "Form 12BB" questions, but BM25 contributes nothing for them.

**Cause.** Chunks were tokenized with \`re.findall(r"[a-z0-9]+", text.lower())\`; the query with
\`question.split()\`. The query became \`['When', 'is', 'Form', '12BB', 'due?']\` — capitals and a
question mark — and the Form 12BB chunk scored 0.0. Tokenized the same way as the chunks
(\`['when', 'is', 'form', '12bb', 'due']\`), it scored 3.93 and ranked first.

**Fix.** One \`tokenize()\` function, used for both. Unit-test it on codes like \`12BB\`, \`EXP-71\`, \`L4\`.

## 5. "Re-chunking destroyed recall"

**Symptom.** After changing chunk size from 500 to 300 characters, recall@5 drops from 0.86 to 0.11
and the team prepares to revert.

**Cause.** The golden set labels answers with chunk ids (\`leave#3\`). New chunking, new ids: the
"relevant" ids now point at different text, so the metric measures nothing.

**Fix.** Relabel as source + quote and count a chunk relevant if it contains the quote. Then compare the
two chunkings again — on a measurement that survives the change.

## 6. The pgvector query that got slow

**Symptom.** Search took 8 ms in testing and 1.5 s in production with two million rows. \`EXPLAIN\` shows
\`Seq Scan on policy_chunks\`.

**Cause.** The index is \`USING hnsw (embedding vector_cosine_ops)\` but the query orders by
\`embedding <-> $1\` (L2). An index serves only its own operator, so Postgres scanned every row.

**Fix.** Order by \`<=>\` to match \`vector_cosine_ops\`, and confirm with \`EXPLAIN\` that the plan shows an
index scan. Keep \`EXPLAIN\` of the main query in the repository's tests or runbook. (The SQL follows
pgvector's documented syntax; it was not run for these notes.)`,
    mcqs: [
      mcq('After a provider switch, Chroma raises "Collection expecting embedding with dimension of 384, got 1536" on every query. What is the correct fix?', [
        ['Re-embed into a new collection using the model used for queries', true],
        ['Truncate each 1,536-dimension query vector to its first 384 values', false],
        ['Pad the stored 384-dimension vectors with zeros up to 1,536', false],
        ['Recreate the collection with dimension checks switched off', false],
      ], 'The two models produce vectors in different spaces, so neither truncating nor padding makes them comparable — those just hide the error and return nonsense. Ingestion and queries must use the same model, which means re-embedding.'),
      mcq('A filter `if score >= 0.5` worked with Qdrant. Copied into a Chroma version, the bot keeps irrelevant chunks and drops relevant ones. What changed?', [
        ['Chroma returns distances, where lower values mean closer', true],
        ['Chroma scores fall between 0 and 100, so 0.5 always passes', false],
        ['Chroma normalises vectors, so every score lands near 0.5', false],
      ], 'Qdrant reports similarity (higher is better); Chroma reports distance (lower is better). The same comparison selects the opposite chunks. Convert to one convention at the store boundary and test it.'),
      mcq('Each nightly re-ingest into Qdrant adds a full extra copy of every chunk. The code builds point ids with uuid.uuid4(). What is the fix?', [
        ['Delete the collection before every run and rebuild it from scratch', false],
        ['Use uuid5 of the chunk id so each chunk keeps the same point id', true],
        ['Use the chunk text\'s length as an integer id for every point', false],
        ['Store the uuid4 in the payload and de-duplicate results at query time', false],
      ], 'uuid4 is random, so every run inserts new points. uuid5 is deterministic: the same chunk id gives the same UUID, and upsert replaces. Rebuilding nightly causes downtime; text length collides; query-time de-duplication hides a growing store.'),
      mcq('Recall@5 collapses from 0.86 to 0.11 right after chunk size is changed, while answers in manual testing look fine. What is the likeliest explanation?', [
        ['The golden set labels chunk ids, which the new chunking renumbered', true],
        ['Smaller chunks always lose most of their meaning in the embedding', false],
        ['The vector index must be retrained after any change in chunk size', false],
        ['Recall@5 is undefined when chunks are shorter than the questions', false],
      ], 'A collapse that manual testing does not confirm points at the measurement. Chunk-id labels are only valid for the chunking that made them; source-plus-quote labels survive re-chunking.'),
    ],
  },

  /* ── PRACTICE ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_RAG_DEEP_PRACTICE',
    notes: `Work each exercise on paper or in a notebook before reading the answer. They go from quick
calculations to design decisions. The libraries are the ones used in this topic: sentence-transformers,
Chroma, Qdrant, rank-bm25.

## Exercise 1 — memory (easy)

A company has 250,000 chunks, embedded with a 1,024-dimension model, stored as float32. How much memory
do the raw vectors need?

**Answer.** 1,024 × 4 bytes = 4,096 bytes per vector; × 250,000 ≈ 1.02 GB (about 0.95 GiB), before the
HNSW graph and payloads. If memory is tight: a model with fewer dimensions, a model that supports
shortened vectors, or quantisation in the store.

## Exercise 2 — recall@5 and MRR (easy)

Four questions, each with one relevant chunk, found at ranks 1, 3, 7 and "not in the top 20". Compute
recall@5 and MRR (over the top 20).

**Answer.** Recall@5: ranks 1 and 3 are in the top 5 → 2/4 = 0.50. MRR: (1 + 1/3 + 1/7 + 0) / 4 =
(1 + 0.333 + 0.143) / 4 ≈ 0.369.

## Exercise 3 — RRF by hand (easy)

BM25 ranks: [A, B, C]. Vector ranks: [C, D, A]. With k = 60, give the fused order.

**Answer.** A: 1/61 + 1/63 = 0.01639 + 0.01587 = 0.03226. C: 1/63 + 1/61 = 0.03226 (a tie with A).
B: 1/62 = 0.01613. D: 1/62 = 0.01613. Order: A and C tied, then B and D tied. Ties are common with RRF —
which is one reason to re-rank afterwards.

## Exercise 4 — pick the chunking (medium)

For each source, choose a parsing and chunking approach: (a) an HR handbook exported from Word with
Heading 1/2 styles; (b) a scanned 2009 travel circular; (c) a travel-allowance table by grade and city
type; (d) an intranet FAQ page in HTML.

**Answer.** (a) python-docx, split by heading styles, prefix the heading path, size-limit sections.
(b) OCR first (it has no text layer), then recursive chunking; check the OCR on numbers by eye.
(c) Each row rewritten with its column headers ("Grade: L4-L6; City: metro; Hotel per night: ..."), one
row or a small group per chunk. (d) BeautifulSoup, drop navigation and footers, one chunk per
question-and-answer pair, with the question kept in the chunk.

## Exercise 5 — a Chroma filter (medium)

Write the \`where\` clause for: company "acme", status not "superseded", and effective year 2025 or later.

**Answer.**

    where={"$and": [{"company": "acme"},
                    {"status": {"$ne": "superseded"}},
                    {"year": {"$gte": 2025}}]}

Chroma needs \`$and\` to combine more than one condition.

## Exercise 6 — the same filter in Qdrant (medium)

**Answer.**

    models.Filter(
        must=[models.FieldCondition(key="company", match=models.MatchValue(value="acme")),
              models.FieldCondition(key="year", range=models.Range(gte=2025))],
        must_not=[models.FieldCondition(key="status", match=models.MatchValue(value="superseded"))])

and a payload index on \`company\`, \`year\` and \`status\` in a real deployment.

## Exercise 7 — the tokenizer (medium)

Write a BM25 tokenizer that lowercases, keeps codes like \`EXP-71\` and \`12BB\` whole, and drops a small
stop-word list. Test it on "What does EXP-71 cover for L4?".

**Answer.**

    STOP = {"a", "an", "the", "to", "of", "in", "on", "for", "and", "or", "is", "are",
            "what", "my", "i", "can", "do", "does"}

    def tokenize(text: str) -> list[str]:
        words = re.findall(r"[a-z0-9]+(?:-[a-z0-9]+)*", text.lower())
        return [w for w in words if w not in STOP]

gives \`['exp-71', 'cover', 'l4']\`. Use the same function for chunks and queries.

## Exercise 8 — design the golden set (hard)

A policy assistant is launching for 2,000 employees. Plan a 60-question golden set: where the questions
come from, which slices, and how answers are labelled.

**Answer.** Questions from the last six months of HR and travel helpdesk tickets, rewritten only to
remove personal data. Slices: plain (20), paraphrases with no shared words (10), codes and acronyms
(8), follow-ups with their previous turn (8), Hinglish or Hindi (6), unanswerable (8). Labels: source
document plus a short exact quote, reviewed by someone from HR. Versioned in the repository, with a
note of who labelled what.

## Exercise 9 — read the numbers (hard)

Vector-only: recall@5 0.78, MRR 0.61. Hybrid + re-rank: recall@5 0.86, MRR 0.74, +0.35 s latency. The
code-question slice went 0.50 → 0.90; the paraphrase slice 0.85 → 0.83. Ship it?

**Answer.** Very likely yes: the gain is large, concentrated where hybrid search is expected to help,
and the paraphrase drop is one question or so. Check that the latency fits the product's budget, look
at the paraphrase question that was lost, and re-run after any fix to confirm.`,
    mcqs: [
      mcq('500,000 chunks are embedded at 384 dimensions in float32. How much do the raw vectors take?', [
        ['About 768 MB, at 1,536 bytes per vector', true],
        ['About 192 MB, at 384 bytes per vector', false],
        ['About 7.7 GB, at 15,360 bytes per vector', false],
      ], 'Each float32 is 4 bytes: 384 × 4 = 1,536 bytes; × 500,000 = 768,000,000 bytes. 384 bytes per vector would be one byte per value, which is int8 quantisation, not float32.'),
      mcq('Five questions find their single relevant chunk at ranks 2, 1, 1, 5 and nowhere. What is the MRR?', [
        ['(0.5 + 1 + 1 + 0.2 + 0) / 5 = 0.54', true],
        ['(2 + 1 + 1 + 5 + 0) / 5 = 1.8', false],
        ['(0.5 + 1 + 1 + 0.2) / 4 = 0.675', false],
        ['(1 + 1 + 1 + 1 + 0) / 5 = 0.8', false],
      ], 'MRR averages 1/rank over all questions, counting a question with no relevant result as 0. Leaving the miss out of the average inflates the score; averaging ranks is a different and less useful number.'),
      mcq('Which Qdrant filter keeps Acme\'s chunks but excludes those whose status is "superseded"?', [
        ['must on company = acme, plus must_not on status = superseded', true],
        ['should on company = acme, plus should on status = superseded', false],
        ['must on company = acme, plus must on status = superseded', false],
      ], 'must conditions all have to hold and must_not conditions must all fail, which is exactly "Acme and not superseded". should means at least one holds; must on status = superseded would keep only the superseded chunks.'),
      mcq('An HR intranet FAQ page in HTML is being ingested. Which chunking keeps answers findable?', [
        ['One chunk per question-and-answer pair, with the question kept in it', true],
        ['Fixed 1,000-character chunks across the whole page, navigation included', false],
        ['One chunk for the whole page, so that every answer shares context', false],
        ['Only the answers as chunks, since questions are already in the user\'s query', false],
      ], 'A Q&A pair is a natural unit and the question text matches how users ask. Dropping the question loses that match; fixed cuts split answers and keep menus; one big chunk averages every topic together.'),
      mcq('In RRF with k=60, chunk X is 1st in BM25 and 3rd in vector; chunk Y is 3rd in BM25 and 1st in vector. How do they compare?', [
        ['They tie, since each gets 1/61 + 1/63 from the two lists', true],
        ['X wins, since BM25 is listed first and breaks the tie', false],
        ['Y wins, since vector ranks count for more than BM25 ranks', false],
      ], 'RRF is symmetric across lists unless you add weights: both chunks receive 1/61 + 1/63 ≈ 0.0323. Ties like this are one reason to put a re-ranker after fusion.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_RAG_DEEP_INTERVIEW_QUESTION',
    notes: `RAG questions at AI-engineer interviews in Bengaluru and Hyderabad are rarely "what is RAG?". They are
"it doesn't work — what do you do?" and "why that and not this?". Answer with a method and numbers;
the follow-up tests whether you have actually built one.

## Question 1 — "Our RAG bot gives wrong answers. How do you debug it?"

**Model answer.** "First I separate retrieval from generation. I take a sample of failing questions and
check whether the passage that answers each one was in the chunks sent to the model. If it was, the
problem is the prompt or the model — it ignored or misread good context. If it was not, it is
retrieval, and I go stage by stage: was the document parsed correctly — tables, scanned pages? Is the
answer inside one chunk or split across two? Did the query match it — by vector, by keyword? Was it
ranked below k? Then I build a golden set from real questions, measure recall@5 and MRR, fix the worst
stage, and re-measure. Without the set I'd be fixing anecdotes."

**Follow-up: "Recall@5 is 0.9 but answers are still wrong. Now what?"** "Then retrieval is mostly fine.
I'd check whether the right chunk is buried among four distractors — MRR tells me — and whether the
prompt tells the model to answer only from sources and cite them. I'd measure faithfulness: is each
claim in the answer supported by a cited chunk? And I'd look at whether conflicting chunks are
retrieved, like an old and a new version of the same policy — that's a metadata filter fix."

## Question 2 — "Explain hybrid search and re-ranking. When would you not use them?"

**Model answer.** "Vector search matches meaning but is weak on exact tokens — codes like EXP-71, names,
acronyms. BM25 matches exact words but not paraphrases. Hybrid runs both and fuses the ranked lists,
usually with reciprocal rank fusion, because their scores are on different scales. A cross-encoder
re-ranker then reads the question and each of the top 20 or so candidates together, which is more
accurate than comparing separate embeddings, and reorders them. I'd skip them when the golden set shows
no gain — in one small test I ran, hybrid alone was worse than vector alone — or when the latency budget
can't take the re-ranker; on a CPU, scoring 20 pairs took about 0.4 seconds."

**Follow-up: "Why can't you just add the BM25 and cosine scores?"** "Different scales — BM25 is
unbounded, cosine is −1 to 1 — so the sum is dominated by BM25. You could normalise each list's scores,
but normalisation is sensitive to outliers. RRF uses only ranks, so it needs no tuning beyond k, which
is usually 60."

## Question 3 — "How does HNSW work, and what are you trading off?"

**Model answer.** "It is a layered graph. Each vector is linked to a few close neighbours; upper layers
are sparse and act like express lanes. A search starts at the top, moves greedily towards the query, and
descends, keeping a candidate list of size ef_search at the bottom layer. You trade recall for speed and
memory: higher m and ef_construction make a better graph that takes more memory and build time; higher
ef_search finds more of the true neighbours but is slower. It's approximate, so I measure its recall
against exact search on sample queries and raise ef_search until it's above about 0.95."

**Follow-up: "What goes wrong when you filter, say by tenant?"** "If the filter runs after the search, a
small tenant's chunks may not be among the nearest neighbours at all, so you get few or no results. You
want the filter applied during the graph walk — Qdrant does this with payload indexes — and you test a
small tenant explicitly. For strict isolation, a collection per tenant is the simplest guarantee."

## Question 4 — "Design retrieval over HR policies for 300 client companies."

**Model answer (outline).** "Structure-aware parsing, chunks with source, page, section, company_id,
version and effective date. One collection with company_id as an indexed payload filter applied in
every query — enforced in server code from the logged-in user, never from the request body. Hybrid
search plus re-ranking, a condense step for follow-ups, and a golden set per large client plus a shared
one. Re-ingestion deletes by source and upserts with deterministic ids. Superseded policies are kept but
filtered out by effective date, so we can answer 'what was the rule last year' when asked."

**Follow-up: "A client asks you to delete all their data."** "Delete every point with their
company_id from the vector store, their source files and parsed text, and any cache keyed by them; then
verify with a count query that returns zero. With a collection per tenant it's a single drop."`,
    mcqs: [
      mcq('An interviewer says recall@5 is 0.9 but answers are still often wrong. Which line of investigation fits best?', [
        ['Check faithfulness, distractor chunks and conflicting policy versions', true],
        ['Switch to a larger embedding model, since retrieval must be weak', false],
        ['Increase chunk size so that every answer has more context in it', false],
      ], 'With the answer passage almost always retrieved, the weak stage is generation or conflicting context. A new embedding model or bigger chunks change retrieval, which the metric says is already working.'),
      mcq('Asked why HNSW search with a strict tenant filter can return no results, which answer is right?', [
        ['A post-search filter removes all neighbours if none are the tenant\'s', true],
        ['HNSW indexes cannot store payloads, so the filter has nothing to read', false],
        ['The filter changes the distance metric for the tenant\'s vectors', false],
        ['ef_search is reset to zero whenever a filter is supplied with a query', false],
      ], 'If filtering happens after the approximate search, the nearest neighbours may all belong to other tenants. Filtering during the graph walk, with a payload index, avoids that. Payloads are stored alongside vectors; the metric is unaffected.'),
      mcq('An interviewer asks how a multi-tenant RAG service should decide which company_id to filter on. What is the right answer?', [
        ['From the authenticated user on the server, never from the request', true],
        ['From a company_id field the client app sends with every question', false],
        ['From the router model, which infers the company from the question', false],
      ], 'Anything in the request body can be changed by the caller, and a model\'s inference can be steered by the question. The tenant must come from the server-side session or token, which the caller cannot forge.'),
    ],
  },

  /* ── MINI_PROJECT ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_RAG_DEEP_MINI_PROJECT',
    notes: `## The scenario

You join the internal-tools team at a 3,000-person IT services company with offices in Hyderabad,
Bengaluru and Pune. HR and the travel desk answer the same questions all day: "How many casual leaves
do I have?", "Can an L4 book 2AC to Chennai?", "What is the hotel limit in Mumbai?", "By when must I
file my travel claim?", "How often can I claim LTA?". The policies exist as PDFs on the intranet, some
of them five years old, some superseded.

You will build **policy search with answers and citations**, and — the point of this project — prove
with numbers that each improvement you make actually improves retrieval.

## The data

Build a corpus of **10–15 policy documents**, at least 40 pages in total:

- Leave policy, travel and expenses policy (with a **table** of allowances by grade and city type),
  LTA and tax-declaration guide, IT security policy, work-from-home policy, code of conduct.
- At least **one scanned PDF** (print a page and scan it, or save an image as PDF) and at least **one
  superseded version** of a policy (an older travel policy with different limits).
- Write them yourself from public templates of Indian company policies, or use your college's or a
  public-sector organisation's published HR rules. Use invented company names and no real personal data.

Then build a **golden set of at least 40 questions** (target 60): real questions you collect from
friends or seniors working in companies, not ones written while reading the PDF. Include paraphrases
with no shared words, codes and acronyms (LTA, 12BB, grade codes, expense codes), at least five
follow-up pairs, at least five Hinglish or Hindi questions, and at least five unanswerable questions.
Label each answer as **source file + short exact quote**.

## What you build

    policy-rag/
      ingest.py          # parse → clean → chunk → embed → upsert (idempotent)
      search.py          # BM25 + vector + RRF + cross-encoder re-rank, with metadata filters
      answer.py          # condense follow-ups, build the prompt, answer with [n] citations
      eval_retrieval.py  # recall@1, recall@5, MRR, by slice, with the list of misses
      golden.jsonl       # the labelled questions
      api.py             # FastAPI: POST /ask {question, history} → {answer, sources, answered}
      REPORT.md          # the numbers after each step, and your decisions
      tests/

Stack: Python, sentence-transformers (any embedding model you justify), **Qdrant or pgvector** (Chroma is
allowed for milestone 1 only), rank-bm25 or Qdrant sparse vectors, a cross-encoder re-ranker. For the
answer step use any chat model via the OpenAI-compatible SDK with your own key, or a local model through
Ollama if you have no key. Retrieval and its evaluation must run **without** any API key.

## Requirements

1. **Ingestion** keeps page numbers; detects pages that need OCR and either OCRs them or reports them;
   turns allowance-table rows into self-contained text; chunks by structure with heading paths; stores
   source, page, section, policy version and effective date. Running it twice leaves the chunk count unchanged.
2. **Search** filters out superseded policies by default (a flag can include them), runs hybrid search
   with RRF, re-ranks the top 20, and returns the top 5 with every stage's rank for debugging.
3. **Answers** cite \`[n]\`, mapped by your code to source file and page; when the best re-ranker score
   is below a threshold you chose from the golden set, it returns \`answered: false\` without a model call.
4. **Follow-ups** are condensed into standalone questions; the rewrite is logged.
5. **Evaluation** prints recall@1, recall@5 and MRR overall and per slice, plus the misses.

## Milestones

1. **Baseline (day 1–2).** Simple recursive chunking, vector search only. Run the golden set: this is
   your baseline recall@5. Commit the number.
2. **Parsing and chunking (day 3).** Structure-aware chunks, table rows, header/footer removal, OCR
   handling. Re-run.
3. **Vector database (day 4).** Move to Qdrant or pgvector with filters for policy version; idempotent
   re-ingest; prove the superseded travel policy no longer answers.
4. **Hybrid and re-rank (day 5).** BM25 + RRF, then the cross-encoder. Re-run after **each**, separately.
5. **Query transformation (day 6).** Condense follow-ups; translate Hinglish/Hindi for search. Re-run
   the follow-up and Hinglish slices.
6. **Answering and API (day 7).** Citations, threshold, FastAPI endpoint, tests with a fake model.

## REPORT.md

A table with one row per milestone: recall@1, recall@5, MRR, the slice that moved most, latency per
question, and one sentence on why you kept or reverted the change. At least one change should have
made something **worse** — say which and what you did. Close with the five questions your final system
still gets wrong and why.

## Common traps

- A golden set written from the PDFs — every system scores 1.0 and you learn nothing.
- Chunk-id labels that break when chunking changes.
- Tokenizing BM25 queries and chunks differently.
- Comparing scores across Chroma (distance) and Qdrant (similarity).
- Old travel limits still answering because superseded chunks were never filtered.`,
    assignment: {
      title: 'RAG over a Company\'s HR and Travel Policy Documents',
      description: 'Index 10–15 HR and travel policy documents in Qdrant or pgvector with hybrid search and re-ranking, answer with citations, and report recall@5 before and after each improvement on a labelled golden set.',
      instructions: `1. Build the corpus (10–15 policies, at least 40 pages, one scanned PDF, one superseded policy) and a
   golden set of at least 40 real questions with slices and source + quote labels.
2. Commit a baseline: recursive chunks, vector search only, with recall@1, recall@5 and MRR.
3. Improve in order — parsing and chunking, vector database with filters, hybrid search, re-ranking,
   query transformation — and re-run the golden set after each step.
4. Add grounded answers with [n] citations mapped by code, a refusal threshold chosen from the golden
   set, and a FastAPI POST /ask endpoint with tests that use a fake model.
5. Write REPORT.md: the table of numbers per step, what you kept or reverted and why, and the
   remaining failures. Submit the repository link and a short screen recording of three questions.`,
      rubric: [
        { criterion: 'Ingestion and chunking', description: 'Pages, tables and scanned pages handled; structure-aware chunks with source, page, section, version; re-ingest is idempotent.', maxPoints: 20 },
        { criterion: 'Vector database and filters', description: 'Qdrant or pgvector with the right metric, deterministic ids, filters for superseded policies applied inside the search.', maxPoints: 15 },
        { criterion: 'Hybrid search and re-ranking', description: 'BM25 with a consistent tokenizer, RRF fusion and a cross-encoder on the top candidates, with per-stage ranks logged.', maxPoints: 20 },
        { criterion: 'Golden set and evaluation', description: 'Real questions with slices and quote labels; recall@1, recall@5 and MRR overall and per slice, with misses listed.', maxPoints: 25 },
        { criterion: 'Answers, API and report', description: 'Citations mapped by code, a measured refusal threshold, condensed follow-ups, a tested FastAPI endpoint, and a report whose decisions follow the numbers.', maxPoints: 20 },
      ],
      totalPoints: 100,
    },
    mcqs: [
      mcq('In the policy project, the old travel policy keeps answering hotel-limit questions with outdated limits. What is the intended fix?', [
        ['Filter on effective date or version inside the vector search', true],
        ['Delete the old policy file so it can never be retrieved again', false],
        ['Tell the model in the prompt to prefer the newest-looking chunk', false],
      ], 'Version metadata plus a filter in the query reliably excludes superseded rules while keeping them available for "what was the rule last year". Deleting loses history; a prompt instruction leaves it to the model\'s guess.'),
      mcq('Why does the project ask for the golden set to be re-run after each improvement separately, rather than once at the end?', [
        ['So that each change is credited or blamed on its own number', true],
        ['Because the vector store must be rebuilt between every run', false],
        ['Because recall@5 cannot be computed on more than one change', false],
        ['So that the report has enough rows to look complete on review', false],
      ], 'Measured together, a change that helped can hide one that hurt. One change per run shows which to keep, which to revert, and which to fix — the decisions the report has to justify.'),
    ],
  },

  /* ── CHECKPOINT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_RAG_DEEP_CHECKPOINT',
    notes: `Ten questions across the whole topic: parsing and chunking, embedding models, vector databases,
hybrid search and re-ranking, query transformation, and measuring retrieval. Each is a situation from
a real RAG system — decide what is happening and what to do, without looking things up.`,
    checkpoint: [
      mcq('An employee asks "Can I carry casual leave forward?" and the bot answers with the earned-leave rule. The retrieved chunk ends one section and starts the next. What is the root fix?', [
        ['Chunk by headings and prefix each chunk with its heading path', true],
        ['Raise chunk_overlap so the next section is repeated in full', false],
        ['Add "do not mix up leave types" to the system prompt', false],
        ['Retrieve more chunks so the right section is also included', false],
      ], 'The chunk crosses a section boundary and loses which heading each sentence belongs to. Structure-aware chunks with heading paths keep each rule with its own section. More overlap or more chunks keep the confusion; a prompt rule does not fix the input.'),
      ck('VECTOR_EMBEDDINGS', 'Testing an embedding model on its own helpdesk questions, a team finds "How many casual leaves do I get?" ranks the earned-leave chunk above the casual-leave one. What does this most directly show?', [
        ['Close topics confuse this model, so keyword search should help', true],
        ['The vectors were not normalised, so cosine scores are invalid', false],
        ['The model\'s dimension is too small to store the word "casual"', false],
      ], 'Small models often blur closely related passages that share most words. An exact keyword like "casual" is what BM25 catches, so hybrid search is the natural fix. Normalisation does not change the ranking under cosine; dimension is not a vocabulary.'),
      ck('VECTOR_EMBEDDINGS', 'A model card says the model expects "query: " before questions and "passage: " before documents. Ingestion added "passage: " but the search code sends bare questions. What is the effect?', [
        ['Quality drops quietly, since queries arrive in an untrained form', true],
        ['Every search fails with a dimension error from the database', false],
        ['Nothing changes, since only the documents need the prefix', false],
        ['Results improve, since bare questions are closer to passages', false],
      ], 'A prefix-trained model places a bare question somewhere it was not trained to, so similarities degrade without any error. Both sides need their own prefix as the model card says.'),
      ck('VECTOR_DATABASES', 'Moving a search from Qdrant to Chroma, a developer keeps `if score >= 0.5` and the bot starts quoting irrelevant chunks. What explains it?', [
        ['Chroma returns distance, so the filter now keeps the worst chunks', true],
        ['Chroma\'s scores are percentages, so every chunk passes 0.5', false],
        ['Chroma has no metadata filters, so all tenants\' chunks appear', false],
      ], 'Qdrant reports similarity (higher is better) and Chroma reports distance (lower is better), so the same test selects opposite chunks. Chroma does support metadata filters; its scores are not percentages.'),
      ck('VECTOR_DATABASES', 'A pgvector table has `USING hnsw (embedding vector_cosine_ops)`, and the slow query orders by `embedding <-> $1`. What does EXPLAIN most likely show, and why?', [
        ['A sequential scan, since <-> is L2 and the index is for cosine', true],
        ['An index scan, since pgvector maps <-> onto cosine on its own', false],
        ['A syntax error, since <-> is not a pgvector operator at all', false],
      ], 'An index answers only its own operator: vector_cosine_ops serves <=>. With <-> (Euclidean) the planner scans every row — correct but slow. <-> is a valid pgvector operator, so there is no error to warn you.'),
      ck('VECTOR_DATABASES', 'In RRF with k=60, which chunk scores highest: P (1st in BM25 only), Q (2nd in both lists) or R (1st in vector, 10th in BM25)?', [
        ['Q, with 2/62 ≈ 0.0323, just above R at about 0.0307', true],
        ['P, since a first place outranks every other combination', false],
        ['R, since a vector first place counts for more than BM25', false],
        ['P and R tie, since each holds a first place in one list', false],
      ], 'Q: 1/62 + 1/62 ≈ 0.0323. R: 1/61 + 1/70 ≈ 0.0307. P: 1/61 ≈ 0.0164. RRF rewards agreement across lists and treats both lists equally unless you weight them.'),
      mcq('In a chat about hotel limits, the next message is "And for L5?". Retrieval returns the cab-fare policy. What fixes this?', [
        ['Rewrite the message with the history into a standalone question', true],
        ['Embed the entire conversation as one query for every turn', false],
        ['Lower the similarity threshold so that more chunks get through', false],
        ['Answer follow-ups from the chunks retrieved on the first turn', false],
      ], 'A condense step turns "And for L5?" into "What is the hotel limit in metro cities for grade L5?", which retrieves the right row. Embedding the whole conversation blurs topics; reusing old chunks fails when the follow-up needs a different passage.'),
      mcq('An embedding router is unsure where to send a question — every route scores below its threshold. What is the safe behaviour?', [
        ['Search all indexes and let retrieval\'s threshold decide', true],
        ['Send it to the highest-scoring route, however low its score', false],
        ['Refuse, telling the user that the question is out of scope', false],
      ], 'An unsure router should widen the search, not guess. Guessing risks missing the answer in another index; refusing would turn away ordinary questions the documents can answer. Retrieval\'s own threshold handles truly out-of-scope questions.'),
      mcq('One relevant chunk per question; a search returns it at ranks 1, 2, 4 and not at all for four questions. What are recall@3 and MRR?', [
        ['recall@3 = 0.50 and MRR ≈ 0.44', true],
        ['recall@3 = 0.75 and MRR ≈ 0.58', false],
        ['recall@3 = 0.50 and MRR ≈ 0.58', false],
        ['recall@3 = 0.75 and MRR ≈ 0.44', false],
      ], 'Ranks 1 and 2 are in the top 3, so recall@3 = 2/4 = 0.50. MRR = (1 + 0.5 + 0.25 + 0) / 4 = 0.4375. Counting rank 4 inside the top 3, or leaving the miss out of the average, gives the wrong figures.'),
      mcq('Hybrid search lowers recall@5 on a 10-question golden set from 1.00 to 0.90. What is the soundest next step?', [
        ['Inspect the missed question, then enlarge the set with harder cases', true],
        ['Ship hybrid search anyway, since hybrid is better in production', false],
        ['Drop the missed question, since it is unfair to the BM25 half', false],
        ['Replace recall@5 with MRR, since MRR is gentler on single misses', false],
      ], 'On ten questions, one miss is ten points: look at why it failed, and grow the set — a set where vector search scores a perfect 1.00 has saturated and cannot show gains. Shipping on belief or editing the set or metric to suit a design defeats measurement.'),
    ],
  },
];
