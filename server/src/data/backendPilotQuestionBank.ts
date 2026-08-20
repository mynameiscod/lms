/**
 * Backend Engineer pilot question bank — FOUNDATION and BUILD only.
 *
 * WHY THESE EIGHT SKILLS. Not intuition: the engine was run. For BACKEND_ENGINEER,
 * expandSkillScope + rankSkills select DSA_COMPLEXITY, COMMUNICATION, DB_FUNDAMENTALS,
 * DEBUGGING, DSA_ARRAYS and DSA_STRINGS at FOUNDATION, adding GIT_FUNDAMENTALS and HTTP at
 * BUILD. Weight does not enter the ranking — `allowedSkillDifficulty` admits only
 * FOUNDATION-difficulty skills at the first stage and the tie-break is alphabetical, so
 * PROGRAMMING_FUNDAMENTALS and SQL_JOINS are never asked there however heavily the
 * blueprint weights them. Content follows the engine.
 *
 * WHY NOT REUSE THE EXISTING BANK. It was written for a Java/frontend LMS syllabus. Its
 * 965 Java items map to JAVA_* skills that no role blueprint references; its 144 "array"
 * items are JavaScript map/filter API trivia, which measures an API and not array
 * reasoning; its "communication" subject is quantitative aptitude ("next number in the
 * series: 2, 4, 6, 8"). Mapping any of those would make the generator green while making
 * every score a lie. What could honestly be reused is reused — see EXISTING_REUSE below.
 *
 * DIFFICULTY IS HONEST. EASY is single-concept recognition, MEDIUM needs a comparison or a
 * short chain of reasoning, HARD needs a trade-off or several steps. Nothing is labelled up
 * to satisfy a policy quota; the fallback in selectItems exists for exactly that shortfall.
 *
 * Every item is mcq_single with one correct option, three plausible distractors and an
 * explanation, because that is what assessmentAnswerGradingService grades deterministically.
 */

export interface PilotQuestion {
  /** Stable natural key. Idempotency depends on it; never reuse or renumber. */
  key: string;
  skillKey: string;
  difficulty: 'easy' | 'medium' | 'hard';
  subject: string;
  topic: string;
  question: string;
  options: string[];
  /** Index into `options`. */
  correctIndex: number;
  explanation: string;
}

const Q = (
  key: string, skillKey: string, difficulty: PilotQuestion['difficulty'],
  topic: string, question: string, options: string[], correctIndex: number, explanation: string,
): PilotQuestion => ({
  key, skillKey, difficulty, subject: 'CareerPilot — Backend Foundations', topic,
  question, options, correctIndex, explanation,
});

export const BACKEND_PILOT_QUESTIONS: PilotQuestion[] = [

  /* ── DSA_COMPLEXITY — cost of operations, never syntax ──────────────────── */
  Q('CP_CPLX_01', 'DSA_COMPLEXITY', 'easy', 'Big-O basics',
    'An operation is described as O(1). What does that mean?',
    ['It always takes exactly one millisecond',
     'Its cost stays the same no matter how large the input grows',
     'It runs once per item in the input',
     'It is the fastest possible algorithm for any problem'], 1,
    'O(1) is constant time: the work does not grow with input size. It says nothing about the actual milliseconds.'),

  Q('CP_CPLX_02', 'DSA_COMPLEXITY', 'easy', 'Linear search cost',
    'You scan an unsorted list of n items one by one looking for a value. What is the worst-case time complexity?',
    ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], 2,
    'In the worst case the value is last or absent, so all n items are examined — O(n).'),

  Q('CP_CPLX_03', 'DSA_COMPLEXITY', 'medium', 'Logarithmic growth',
    'Binary search runs on a sorted array of about 1,000,000 items. Roughly how many comparisons does it need in the worst case?',
    ['About 20', 'About 1,000', 'About 500,000', 'About 1,000,000'], 0,
    'Binary search halves the range each step, so it needs about log₂(1,000,000) ≈ 20 comparisons.'),

  Q('CP_CPLX_04', 'DSA_COMPLEXITY', 'medium', 'Nested loops',
    'A function loops from 1 to n, and inside that loop it loops from 1 to n again, doing constant work. What is its time complexity?',
    ['O(n)', 'O(n log n)', 'O(n²)', 'O(2ⁿ)'], 2,
    'Each of the n outer steps performs n inner steps, giving n × n = O(n²).'),

  Q('CP_CPLX_05', 'DSA_COMPLEXITY', 'medium', 'Comparing growth rates',
    'For a large input n, which algorithm will generally finish sooner?',
    ['One that is O(n²)', 'One that is O(n log n)', 'They are the same', 'It depends only on the programming language'], 1,
    'n log n grows far more slowly than n². At n = 1,000,000 that is roughly 20 million steps against a million million.'),

  Q('CP_CPLX_06', 'DSA_COMPLEXITY', 'hard', 'Amortised cost',
    'A dynamic array doubles its capacity whenever it becomes full, copying the existing elements across. What is the amortised cost of a single append?',
    ['O(1) amortised, because the occasional copy is spread across many cheap appends',
     'O(n), because every append may copy the whole array',
     'O(log n), because the capacity doubles',
     'O(n²), because copying happens repeatedly'], 0,
    'Doubling makes copies rare and their total cost across n appends is proportional to n, so each append averages constant time — even though one individual append can cost O(n).'),

  /* ── COMMUNICATION — professional practice, not grammar or aptitude ──────── */
  Q('CP_COMM_01', 'COMMUNICATION', 'easy', 'Clarifying requirements',
    'A ticket says only: "Make the report page faster." What is the most useful first response?',
    ['Start rewriting the database queries immediately',
     'Ask which part feels slow and what response time would count as fixed',
     'Reply that the ticket is unclear and close it',
     'Wait until someone raises it again'], 1,
    'A vague request needs a concrete target before any work starts. Asking what "fast enough" means prevents days spent optimising the wrong thing.'),

  Q('CP_COMM_02', 'COMMUNICATION', 'easy', 'Raising blockers',
    'You have been stuck for two days waiting for database access nobody has granted. What should you have done?',
    ['Kept waiting quietly so as not to seem incapable',
     'Raised the blocker the first day, naming exactly what you need and from whom',
     'Worked on an unrelated task and said nothing',
     'Escalated straight to the head of engineering on day one'], 1,
    'Blockers are raised early and specifically. Silence turns a five-minute permission request into two lost days.'),

  Q('CP_COMM_03', 'COMMUNICATION', 'easy', 'Daily standup',
    'Which is the most useful standup update?',
    ['"Still working on the same thing."',
     '"Finished the login fix; starting on password reset; blocked on staging credentials."',
     'A detailed walkthrough of every file you edited yesterday',
     '"Nothing to report."'], 1,
    'A good update is short and answers three things: what moved, what is next, and what is in the way.'),

  Q('CP_COMM_04', 'COMMUNICATION', 'easy', 'Explaining to a non-technical colleague',
    'A product manager asks what a bug you found does. What is the best explanation?',
    ['"There is a null dereference in the checkout serializer."',
     '"Customers paying with saved cards see an error and cannot complete checkout."',
     '"It is complicated, I will just fix it."',
     '"The stack trace shows a NullPointerException at line 214."'], 1,
    'Lead with who is affected and what they experience. The stack trace matters to you; the impact matters to them.'),

  Q('CP_COMM_05', 'COMMUNICATION', 'medium', 'Ambiguous requirements',
    'A specification says the system "should support many users at once". What is the best question to ask?',
    ['"Which framework should I use?"',
     '"How many users at the same time, and how quickly should pages respond under that load?"',
     '"Do you want it to be fast?"',
     '"Should I use a database?"'], 1,
    'Turning "many" into a number and a response-time target makes the requirement testable. Without that, nobody can say whether it was met.'),

  Q('CP_COMM_06', 'COMMUNICATION', 'medium', 'Written clarity in a pull request',
    'What belongs in a pull request description?',
    ['Only the ticket number',
     'What changed, why it changed, and how it was tested',
     'A line-by-line restatement of the diff',
     'Nothing — the code speaks for itself'], 1,
    'A reviewer needs intent and evidence. The diff already shows what changed; it cannot show why, or what you checked.'),

  /* ── DB_FUNDAMENTALS — relational concepts (EASY reused from existing bank) ── */
  Q('CP_DBF_01', 'DB_FUNDAMENTALS', 'medium', 'Foreign keys',
    'What does a FOREIGN KEY constraint enforce?',
    ['That the column values are unique',
     'That a value in this column matches an existing row in another table',
     'That the column can never be null',
     'That the table is automatically indexed'], 1,
    'A foreign key enforces referential integrity: it stops rows pointing at parents that do not exist.'),

  Q('CP_DBF_02', 'DB_FUNDAMENTALS', 'medium', 'Primary keys',
    'Why must a primary key be both unique and non-null?',
    ['To make the table sort faster',
     'So every row can be identified unambiguously',
     'Because SQL will not run without one',
     'To reduce the storage the table uses'], 1,
    'The primary key is the row\'s identity. A duplicate or missing value would make a row impossible to address.'),

  Q('CP_DBF_03', 'DB_FUNDAMENTALS', 'medium', 'Normalisation basics',
    'A `students` table has a `subjects` column containing "maths,physics,chemistry". Which rule does this break, and what is the fix?',
    ['Nothing is wrong — this is a normal design',
     'It breaks first normal form; the subjects belong in their own rows in a related table',
     'It breaks third normal form; the column should be indexed',
     'It breaks second normal form; the column should be renamed'], 1,
    'First normal form requires one value per column. A comma-separated list cannot be queried, joined or constrained properly.'),

  Q('CP_DBF_04', 'DB_FUNDAMENTALS', 'medium', 'What an index costs',
    'What is the main trade-off of adding an index to a large, frequently-updated table?',
    ['It makes reads faster but writes slower and uses more storage',
     'It makes both reads and writes faster',
     'It has no cost at all',
     'It makes writes faster but reads slower'], 0,
    'An index is a second structure the database maintains. Matching reads get faster; every insert, update and delete must also update the index.'),

  /* ── DEBUGGING — EASY only; the 18 existing `debug` items supply HARD ─────── */
  Q('CP_DBG_01', 'DEBUGGING', 'easy', 'Reading an error',
    'Your program stops with a NullPointerException. What does that tell you?',
    ['The program ran out of memory',
     'Something was used as an object while holding no value',
     'A number was divided by zero',
     'A file could not be found'], 1,
    'It means a reference that held nothing was used as though it held an object. The stack trace names the line.'),

  Q('CP_DBG_02', 'DEBUGGING', 'easy', 'First step after a failure',
    'A test that passed yesterday fails after your change. What should you do first?',
    ['Revert everything you wrote today',
     'Reproduce it and read the failure message carefully',
     'Rerun the whole suite until it passes',
     'Add a try/catch so it stops failing'], 1,
    'Reproduce, then read. The message usually names the expectation and the actual value, which is most of the diagnosis.'),

  Q('CP_DBG_03', 'DEBUGGING', 'easy', 'Tracing a logical defect',
    'A loop meant to print 10 items prints 11. Where is the defect most likely to be?',
    ['In the print statement itself',
     'In the loop\'s boundary condition',
     'In the size of the collection',
     'In the compiler'], 1,
    'Printing one item too many is the classic off-by-one: a `<=` where `<` was meant, or a start index of 0 against a count of 10.'),

  /* ── DEBUGGING (HARD) and DB_FUNDAMENTALS (EASY) ──────────────────────────
     The pack must stand on its own. These two bands were originally left to the
     existing bank — 18 `debug` assessment items and the `Sql introduction` set — which
     exist in production but not in a fresh environment, so a clean install could not
     build a BUILD paper. Reuse is still wired up and still adds depth; it is no longer
     load-bearing.                                                                     */

  Q('CP_DBG_04', 'DEBUGGING', 'hard', 'Reasoning about an intermittent defect',
    'A service works in testing but fails for roughly one request in a thousand in production, always with a different record. What is the most productive first hypothesis?',
    ['The production database is corrupt',
     'Something is shared between concurrent requests that should not be — state, a cached object or a connection',
     'The compiler optimised the code incorrectly',
     'The server needs more memory'], 1,
    'Rare, non-reproducible, request-dependent failures point at concurrency: state that is safe when one request runs at a time and unsafe when several do. Load is the variable that testing lacked.'),

  Q('CP_DBG_05', 'DEBUGGING', 'hard', 'Narrowing by bisection',
    'A bug appeared somewhere in the last 200 commits and you can reliably reproduce it. What is the fastest way to find the commit that introduced it?',
    ['Read all 200 commit diffs in order',
     'Test the midpoint commit, then keep halving the range based on whether the bug is present',
     'Revert all 200 commits and reapply them one at a time',
     'Ask whoever committed most often'], 1,
    'Bisection turns 200 candidates into about 8 tests because each test halves the range — the same log₂ reasoning as binary search, applied to history.'),

  Q('CP_DBF_05', 'DB_FUNDAMENTALS', 'easy', 'Rows and columns',
    'In a relational table of employees, what does a single ROW represent?',
    ['One column heading', 'One employee record', 'The whole table', 'A database connection'], 1,
    'A row is one record — one employee. Columns are the attributes each record has.'),

  Q('CP_DBF_06', 'DB_FUNDAMENTALS', 'easy', 'What a table is',
    'Which best describes a table in a relational database?',
    ['A single value',
     'A named collection of rows, all sharing the same columns',
     'A file of unstructured text',
     'A connection to the server'], 1,
    'A table gives every row the same shape, which is what makes the data queryable and constrainable.'),

  Q('CP_CPLX_07', 'DSA_COMPLEXITY', 'hard', 'Hidden cost inside a loop',
    'A loop runs n times, and on each pass it searches a plain unsorted list of n items. What is the overall complexity, and what would fix it?',
    ['O(n) — nothing needs fixing',
     'O(n²) — replacing the list with a hash set makes each lookup O(1), giving O(n) overall',
     'O(n log n) — sorting the list first is the only option',
     'O(log n) — the loop dominates'], 1,
    'n passes × O(n) search = O(n²). The search is the expensive part, and a hash set reduces each lookup to constant time.'),

  Q('CP_STR_06', 'DSA_STRINGS', 'hard', 'Cost of repeated concatenation',
    'In a loop running n times, you build a result by concatenating one character onto an immutable string each pass. Why can this become O(n²)?',
    ['Because each concatenation copies the whole string built so far',
     'Because strings cannot hold more than n characters',
     'Because the loop runs twice for every character',
     'Because comparison is slower than assignment'], 0,
    'An immutable string cannot be extended in place, so each pass allocates and copies everything accumulated so far — 1 + 2 + … + n copies, which is O(n²). A mutable builder avoids it.'),

  /* ── DSA_ARRAYS — traversal and indexing reasoning, never a language API ─── */
  Q('CP_ARR_01', 'DSA_ARRAYS', 'easy', 'Indexing',
    'In a zero-indexed array of 10 elements, what is the index of the last element?',
    ['10', '9', '1', 'It depends on the language'], 1,
    'Indices run 0 to n-1, so the tenth element sits at index 9. Using 10 is the classic out-of-bounds error.'),

  Q('CP_ARR_02', 'DSA_ARRAYS', 'easy', 'Random access cost',
    'Reading the element at a known index in an array takes how long?',
    ['Constant time, because the address is computed directly',
     'Time proportional to the index, because it counts forward',
     'Time proportional to the array length',
     'It depends on the values stored'], 0,
    'Array elements sit in contiguous memory, so the address is a single calculation — O(1) regardless of position.'),

  Q('CP_ARR_03', 'DSA_ARRAYS', 'medium', 'Two-pointer reasoning',
    'Given a SORTED array, you must decide whether any two values add up to a target, using no extra memory. What is the efficient approach?',
    ['Check every possible pair with two nested loops',
     'Start one pointer at each end and move them inward based on whether the sum is too big or too small',
     'Sort the array again and take the first two values',
     'Store every value in a set and look each one up'], 1,
    'Because the array is sorted, a sum that is too large means moving the right pointer left, and too small means moving the left pointer right. That is O(n) time and no extra memory.'),

  Q('CP_ARR_04', 'DSA_ARRAYS', 'medium', 'Prefix sums',
    'You must answer thousands of "what is the sum between index i and j" queries on an array that never changes. What preparation makes each query fastest?',
    ['Sort the array first',
     'Precompute a running total array once, then answer each query with one subtraction',
     'Re-add the range on every query',
     'Store the array in a hash map'], 1,
    'With prefix sums, sum(i..j) is prefix[j] - prefix[i-1]: O(n) preparation once, then O(1) per query.'),

  Q('CP_ARR_05', 'DSA_ARRAYS', 'medium', 'Cost of inserting at the front',
    'What is the cost of inserting a new element at the FRONT of an array holding n elements?',
    ['O(1) — arrays are designed for this',
     'O(n) — every existing element shifts one position',
     'O(log n) — the array is halved',
     'O(n²) — every element moves n times'], 1,
    'There is no gap at the front, so all n elements must shift up one place. This is why a queue built on a plain array is a poor choice.'),

  /* ── DSA_STRINGS — traversal, counting, substring reasoning ──────────────── */
  Q('CP_STR_01', 'DSA_STRINGS', 'easy', 'Length and indexing',
    'How many characters does the string "hello" contain, and what is the index of \'h\' in a zero-indexed string?',
    ['5 characters, index 0', '5 characters, index 1', '4 characters, index 0', '6 characters, index 1'], 0,
    'Five characters, and the first sits at index 0 — the same indexing rule as arrays.'),

  Q('CP_STR_02', 'DSA_STRINGS', 'easy', 'Reversing a string',
    'Which approach reverses a string in place without extra storage?',
    ['Swap the first and last characters, then move both positions inward until they meet',
     'Copy every character into a new string backwards',
     'Sort the characters in descending order',
     'Remove each character and add it to a list'], 0,
    'Swapping inward from both ends touches each character once and needs no second string.'),

  Q('CP_STR_03', 'DSA_STRINGS', 'easy', 'Counting characters',
    'You need to know how many times each character appears in a string. What is the natural approach?',
    ['Sort the string and count runs of identical characters',
     'Walk the string once, keeping a count per character in a map or fixed-size array',
     'Compare every character with every other character',
     'Convert the string to a number'], 1,
    'A single pass with a frequency table is O(n). Comparing every pair would be O(n²) for the same answer.'),

  Q('CP_STR_04', 'DSA_STRINGS', 'medium', 'Palindrome reasoning',
    'To check whether "A man, a plan, a canal: Panama" is a palindrome, what must happen first?',
    ['Nothing — compare the string directly with its reverse',
     'Ignore case and non-letter characters, then compare inward from both ends',
     'Sort the characters and compare',
     'Split the string on spaces'], 1,
    'The definition here ignores punctuation, spacing and case. Normalise first, then compare inward — otherwise the commas defeat the comparison.'),

  Q('CP_STR_05', 'DSA_STRINGS', 'hard', 'Choosing the cheaper method',
    'You must decide whether two very long strings are anagrams of each other. Which is more efficient, and why?',
    ['Sorting both and comparing, because sorting is always fast',
     'Counting each character once and comparing the two counts, because that is O(n) against sorting\'s O(n log n)',
     'Comparing every character of one against every character of the other',
     'Both approaches cost exactly the same'], 1,
    'A frequency count visits each character once in both strings — O(n). Sorting costs O(n log n). Both are correct; only one scales.'),

  /* ── GIT_FUNDAMENTALS ────────────────────────────────────────────────────── */
  Q('CP_GIT_01', 'GIT_FUNDAMENTALS', 'easy', 'Committing',
    'What does `git commit` do?',
    ['Uploads your changes to the remote repository',
     'Records the currently staged changes as a new point in your local history',
     'Downloads the latest changes from your team',
     'Discards your uncommitted work'], 1,
    'A commit records staged changes locally. Nothing reaches the remote until you push.'),

  Q('CP_GIT_02', 'GIT_FUNDAMENTALS', 'easy', 'Staging',
    'What is the purpose of `git add`?',
    ['To create a new branch',
     'To choose which changes will go into the next commit',
     'To permanently save changes to the server',
     'To add a new file to the project only'], 1,
    'Staging lets you commit some of your changes and not others, so one commit can be one coherent idea.'),

  Q('CP_GIT_03', 'GIT_FUNDAMENTALS', 'easy', 'Branching',
    'Why would you create a branch before starting a new feature?',
    ['Branches make the code run faster',
     'So your work is isolated from the main line until it is ready',
     'Because Git refuses commits on the main branch',
     'To make a backup copy of the repository'], 1,
    'A branch is an independent line of development. The main branch stays releasable while the feature is unfinished.'),

  Q('CP_GIT_04', 'GIT_FUNDAMENTALS', 'medium', 'Fetch versus pull',
    'What is the difference between `git fetch` and `git pull`?',
    ['They are two names for the same command',
     'fetch downloads remote changes without touching your working branch; pull downloads and then merges them into it',
     'fetch uploads your commits; pull downloads them',
     'pull only works on the main branch'], 1,
    'fetch is the safe look — it updates your view of the remote. pull is fetch plus a merge, which can change your working branch immediately.'),

  Q('CP_GIT_05', 'GIT_FUNDAMENTALS', 'medium', 'Merge conflicts',
    'What causes a merge conflict?',
    ['Two branches changed the same lines of the same file differently',
     'One branch has more commits than the other',
     'Someone forgot to run `git add`',
     'The remote repository is offline'], 0,
    'Git merges automatically when changes do not overlap. When both sides edited the same lines it cannot choose, so it asks you.'),

  /* ── HTTP — methods, status codes, semantics ─────────────────────────────── */
  Q('CP_HTTP_01', 'HTTP', 'easy', 'Status codes',
    'A request returns HTTP 404. What does that mean?',
    ['The server crashed while handling the request',
     'The requested resource was not found',
     'The client is not authenticated',
     'The request succeeded with no content to return'], 1,
    '404 Not Found means the server understood the request but has nothing at that address.'),

  Q('CP_HTTP_02', 'HTTP', 'medium', 'GET versus POST',
    'What is the essential difference between GET and POST?',
    ['GET is faster than POST',
     'GET asks for a resource and should not change server state; POST submits data and is expected to change it',
     'POST can only be used with HTML forms',
     'GET is encrypted and POST is not'], 1,
    'The distinction is semantic, not performance. GET is safe — repeating it should leave the server unchanged.'),

  Q('CP_HTTP_03', 'HTTP', 'medium', 'Idempotency',
    'Which is idempotent — sending the same request twice has the same effect as sending it once?',
    ['POST, because it always creates the same record',
     'PUT, because it sets a resource to a given state',
     'Neither is idempotent',
     'Both are equally idempotent'], 1,
    'PUT replaces a resource with the state you supply, so repeating it changes nothing further. POST typically creates another record each time.'),

  Q('CP_HTTP_04', 'HTTP', 'medium', 'Status code families',
    'An API returns 500 for one request and 400 for another. What does that tell you about where each fault lies?',
    ['Both are the client\'s fault',
     '500 means the server failed; 400 means the request itself was invalid',
     'Both are the server\'s fault',
     '500 means success and 400 means failure'], 1,
    '4xx blames the request — fix the client. 5xx blames the server — the request may be perfectly valid.'),
];

/**
 * Items already in the bank that genuinely measure a pilot skill.
 *
 * Kept as selectors rather than ids: ids differ per environment, and a selector states the
 * reason a row qualifies. Everything here was read before being listed — the rejected
 * candidates are described in the header note.
 */
export const EXISTING_REUSE: { skillKey: string; sourceType: 'assessment_item' | 'question'; match: { field: string; value: string }; why: string }[] = [
  {
    skillKey: 'DEBUGGING', sourceType: 'assessment_item', match: { field: 'type', value: 'debug' },
    why: 'Genuine defect-location exercises ("which line causes the StackOverflowError in this binary search"). All graded difficulty 4 → HARD, which is exactly the band the authored EASY items do not cover.',
  },
  {
    skillKey: 'DB_FUNDAMENTALS', sourceType: 'question', match: { field: 'subject', value: 'Sql introduction' },
    why: 'Relational fundamentals — what a row is, what WHERE selects, counting rows. All EASY, complementing the authored MEDIUM items.',
  },
];
