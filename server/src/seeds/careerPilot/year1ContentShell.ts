/**
 * T_SHELL_PIPELINES — the complete topic, eight units.
 *
 * ── WHY THIS TOPIC ────────────────────────────────────────────────────────────────────────
 *
 * It is STANDARD-depth UNIVERSAL throughout, which makes it ADVANCED_UNIVERSAL to the composer
 * — the role every strong profile was failing with zero units against a floor of five. It also
 * contains T_SHELL_PIPELINES_PRACTICE, the last of the prerequisite chains blocking the systems
 * checkpoint, and adds a PRACTICE and an INTEGRATION unit.
 *
 * ── THE LINE THIS TOPIC HOLDS ─────────────────────────────────────────────────────────────
 *
 * Shell teaching usually degenerates into a command reference, which produces students who can
 * recite flags and cannot compose. Every unit here is about the IDEA that makes the shell work
 * — three streams, redirection as plumbing, the pipe as function composition, small tools that
 * each do one thing. A student should finish able to build a pipeline they have never seen
 * written down, which is the only skill that survives the specific commands being forgotten.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const SHELL_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'T_SHELL_PIPELINES_STREAMS',
    notes: `Every command has three streams. Understanding them is what makes everything else in
this topic possible.

- **stdin (0)** — where input comes from. Usually the keyboard.
- **stdout (1)** — normal output. Usually the terminal.
- **stderr (2)** — error output. Also usually the terminal.

**Why errors are a separate stream, when both go to the same screen.** Because they are separate
*channels*, they can be sent to different places. Send results to a file and errors stay visible;
send errors to a log and results stay clean.

    $ find / -name "*.conf" > results.txt

The matches go to the file. The "Permission denied" complaints still appear on screen, because
they travel on stderr and only stdout was redirected. That is not a flaw — it is the design
working: you get the data in the file and the problems in front of you.

Had they shared one stream, \`results.txt\` would be a mixture of filenames and error text, and
anything reading it would have to distinguish them by guessing.

**The consequence for pipelines.** A pipe carries **stdout only**. So in:

    $ find / -name "*.conf" | wc -l

\`wc\` counts only the matches; the permission errors go to your terminal, not into the count.
Again, exactly what you want.

**How to tell which stream something is on.** Send stdout away and see what remains:

    $ command > /dev/null

Anything still on screen is stderr.

**Exit status, the fourth channel.** Every command also returns a number: 0 for success,
non-zero for failure. \`echo $?\` shows the last one. It is what \`&&\` and \`||\` test, and it is how
a script knows whether the previous step worked — output is for humans, exit status is for
programs.`,
    mcqs: [
      mcq('`find / -name "*.conf" > results.txt` still shows "Permission denied" on screen. Why?',
        [['Those messages are on stderr, and only stdout was redirected', true],
          ['The redirection failed', false],
          ['find ignores redirection', false],
          ['The file is full', false]],
        'Two separate channels, and only one was sent to the file. The design means you get data in the file and problems in front of you.'),
      mcq('A pipe carries which stream?',
        [['stdout only', true], ['stdout and stderr', false], ['stderr only', false], ['All three', false]],
        'Which is why errors from the left-hand command appear on your terminal rather than being counted by the right-hand one.'),
      mcq('How can you tell whether a message is on stdout or stderr?',
        [['Redirect stdout to /dev/null — anything still visible is stderr', true],
          ['Check the colour', false],
          ['Errors always start with "Error"', false],
          ['You cannot tell', false]],
        'A five-second test that settles it, and it is the basis of controlling either stream separately.'),
      mcq('What is exit status for?',
        [['So a program can tell whether the previous command succeeded', true],
          ['Reporting errors to the user', false],
          ['Measuring runtime', false],
          ['Counting output lines', false]],
        'Output is for humans; exit status is for programs. It is what && and || actually test.'),
    ],
    checkpoint: [
      mcq('You want results in a file and errors in a separate log. This is possible because:',
        [['stdout and stderr are independent channels that can be redirected separately', true],
          ['The shell sorts the messages by type as the command produces them', false],
          ['Commands write to the two files directly, given the right flags', false],
          ['It is not possible; both streams end up interleaved in one place', false]],
        'The whole reason for two streams rather than one. Merged, a consumer would have to distinguish data from complaints by guessing.'),
      mcq('`echo $?` prints 0. That means:',
        [['The previous command succeeded', true],
          ['It produced no output', false],
          ['It produced one line', false],
          ['It failed', false]],
        'Zero is success and non-zero is failure, which is the reverse of what most people first expect.'),
    ],
  },
  {
    unitCode: 'T_SHELL_PIPELINES_REDIRECTION',
    notes: `Redirection sends a stream somewhere other than its default. It is plumbing: the command
does not know or care where its output goes.

**The operators:**

    command > file      # stdout to file, OVERWRITING it
    command >> file     # stdout to file, APPENDING
    command 2> file     # stderr to file
    command < file      # file as stdin
    command > file 2>&1 # both to the same file

**\`>\` destroys without asking.** \`command > important.txt\` truncates the file to empty *before*
the command runs — so even a command that fails immediately leaves you with nothing. This is the
single most expensive shell mistake there is, and the habit that prevents it is to reach for
\`>>\` unless you specifically mean to replace.

**\`2>&1\` reads oddly and the order matters.** It means "make stderr go wherever stdout is
currently going". So:

    command > file 2>&1     # stdout to file; then stderr to the same place. Both in the file.
    command 2>&1 > file     # stderr to the terminal (where stdout is NOW); then stdout to file.

The second looks equivalent and is not. The redirections are applied left to right, and \`2>&1\`
copies the *current* destination rather than tracking later changes.

**\`/dev/null\` is the bin.** Writing there discards:

    command 2> /dev/null      # silence errors, keep results
    command > /dev/null       # keep errors, discard results

The first is genuinely useful for a noisy \`find\`. Be careful with it in a script, though —
silencing errors you have not read is how a job fails quietly for a month.

**\`<\` is rarer than you expect**, because most commands take a filename argument directly.
\`sort < file\` and \`sort file\` do the same thing; the second is clearer.`,
    workedExample: `**Goal: capture the results of a search, keep the errors, and lose nothing.**

First attempt:

    $ find /etc -name "*.conf" > conf-list.txt

The filenames land in the file. The permission errors scroll past on screen and are gone when
the terminal is closed. For a quick look that is fine; for something you will investigate later
it is not.

Capture both, separately — usually what you want:

    $ find /etc -name "*.conf" > conf-list.txt 2> conf-errors.txt

Now the data is clean and the problems are kept.

Both to one file, in order:

    $ find /etc -name "*.conf" > everything.txt 2>&1

Now write the near-identical wrong version:

    $ find /etc -name "*.conf" 2>&1 > everything.txt

Read it left to right. \`2>&1\` runs first: stderr is pointed at wherever stdout currently goes,
which is still the terminal. Then \`> everything.txt\` moves stdout to the file. The result:
matches in the file, errors on screen — the opposite of the intent, and it looks correct.

**And the expensive one.** Suppose \`conf-list.txt\` already holds yesterday's results and you
mistype the command:

    $ find /etc -nam "*.conf" > conf-list.txt
    find: unknown predicate \`-nam'

The command failed instantly. \`conf-list.txt\` is now empty — the shell truncated it before
running anything. Yesterday's results are gone. \`>>\` would have appended nothing and left the
file intact, which is why it is the safer default habit.`,
    mcqs: [
      mcq('`command > file` where the command fails immediately leaves the file:',
        [['Empty — the shell truncates it before the command runs', true],
          ['Unchanged', false],
          ['Containing the error', false],
          ['Deleted', false]],
        'Truncation happens as the redirection is set up, not as output arrives. This is the most expensive shell mistake there is.'),
      mcq('`cmd 2>&1 > file` sends stderr where?',
        [['To the terminal — it copied stdout\'s destination BEFORE stdout was moved', true],
          ['To the file', false],
          ['To /dev/null', false],
          ['Nowhere', false]],
        'Redirections apply left to right and 2>&1 copies the current destination rather than tracking later changes.'),
      mcq('When is `2> /dev/null` risky?',
        [['In a script — silenced errors you never read hide a job failing for weeks', true],
          ['Never', false],
          ['Only with find', false],
          ['When the disk is full', false]],
        'Useful interactively to quieten a noisy search, dangerous anywhere the output is not being watched by a person.'),
      mcq('Why prefer `>>` as a default habit?',
        [['`>` destroys the existing contents before the command even runs', true],
          ['`>>` is faster', false],
          ['`>` does not work on all shells', false],
          ['`>>` creates the file', false]],
        'Both create the file if absent. Only one of them can lose data you wanted.'),
    ],
    checkpoint: [
      mcq('Capture results and errors into two separate files. Which is right?',
        [['`cmd > out.txt 2> err.txt`', true],
          ['`cmd > out.txt > err.txt`', false],
          ['`cmd >> out.txt 2>&1`', false],
          ['`cmd | out.txt`', false]],
        'The second redirects stdout twice, and the last two send both to one place. Separate targets need separate operators.'),
      mcq('`sort < file` versus `sort file`:',
        [['They do the same thing, and the second is clearer', true],
          ['The first is faster', false],
          ['The second does not work', false],
          ['The first sorts in place', false]],
        '`<` is rarer than expected because most commands accept a filename directly.'),
    ],
  },
  {
    unitCode: 'T_SHELL_PIPELINES_PIPES',
    notes: `A pipe sends one command's stdout straight into the next command's stdin. It is the
central idea of the shell, and it is function composition by another name.

    $ ls | wc -l

\`ls\` lists files; \`wc -l\` counts lines; together they count files. Neither knows the other
exists.

**Why this matters more than it first appears.** Rather than one program with a hundred options,
you have a dozen small programs and a way to combine them. The combinations were not anticipated
by anybody — \`ls | wc -l\` was never designed, it just works, because each tool reads lines and
writes lines.

**The design rules that make it work**, and they are worth knowing because they apply to code
you write too:

1. Each tool does **one** thing
2. Tools read from stdin and write to stdout by default
3. Output is **text, in lines** — so anything can consume anything

**Building a pipeline is incremental, and that is the technique.** Never write four stages and
run it. Write one, look:

    $ cat access.log
    $ cat access.log | grep "404"
    $ cat access.log | grep "404" | cut -d' ' -f7
    $ cat access.log | grep "404" | cut -d' ' -f7 | sort | uniq -c | sort -rn | head

Each step you can see, so when a stage produces nothing you know exactly which one and what it
received. Running the whole thing first and getting no output tells you only that something,
somewhere, was wrong.

**Only stdout flows through.** Errors from any stage go to your terminal, not into the next
command. Usually helpful; occasionally you want \`2>&1 |\` to pipe them too.

**Data flows, it does not accumulate.** Stages run concurrently, so \`head\` can finish and stop
the whole pipeline early rather than waiting for a huge file to be read completely.

**\`cat file | grep x\` works and is one process too many.** \`grep x file\` does the same. It is
harmless and universal, and worth knowing about so you can read other people's pipelines.`,
    mcqs: [
      mcq('`ls | wc -l` counts files even though neither command knows about the other because:',
        [['Both speak the same interface — lines of text on stdout and stdin', true],
          ['ls has a counting mode', false],
          ['The shell counts for them', false],
          ['wc understands file listings', false]],
        'A shared text-line interface is what makes combinations nobody designed work anyway.'),
      mcq('The right way to build a four-stage pipeline is:',
        [['Add one stage at a time, looking at the output after each', true],
          ['Write it all, then debug', false],
          ['Write it backwards', false],
          ['Test each command separately in isolation', false]],
        'Running the whole thing and getting nothing tells you only that something somewhere was wrong. Incremental tells you which stage.'),
      mcq('Errors from the middle of a pipeline go:',
        [['To your terminal — the pipe carries stdout only', true],
          ['Into the next command', false],
          ['To the last command', false],
          ['Are discarded', false]],
        'Usually what you want. `2>&1 |` is available for the cases where you do want them carried onward.'),
      mcq('Why can `head` make a pipeline over a huge file finish quickly?',
        [['Stages run concurrently, so head stopping can end the pipeline early', true],
          ['head reads the file backwards', false],
          ['The shell optimises it', false],
          ['It cannot; the whole file is read first', false]],
        'Data flows rather than accumulating, which is why a pipeline over a 10GB file can return in a moment.'),
    ],
    checkpoint: [
      mcq('Your four-stage pipeline produces nothing. What do you do?',
        [['Remove stages from the end until output appears; the last one removed is it', true],
          ['Rewrite it from scratch, one stage at a time, in a fresh command', false],
          ['Add `2>&1`, since a stage is probably writing to standard error', false],
          ['Check the input file exists, which is the only thing that can fail', false]],
        'Bisection works here exactly as it does in code, and it is why building incrementally is cheaper than debugging afterwards.'),
      mcq('`cat file | grep x` versus `grep x file`:',
        [['Identical output; the first uses one extra process', true],
          ['The first is faster', false],
          ['The second does not work with pipes', false],
          ['They differ on large files', false]],
        'Harmless and extremely common. Worth recognising so you can read other people\'s pipelines without puzzling over it.'),
    ],
  },
  {
    unitCode: 'T_SHELL_PIPELINES_GREP',
    notes: `\`grep\` prints the lines that match a pattern. It is the most used command in the shell
and the one worth knowing properly.

    $ grep "error" app.log           # lines containing error
    $ grep -i "error" app.log        # ignoring case
    $ grep -v "debug" app.log        # lines NOT containing debug
    $ grep -c "error" app.log        # count of matching lines
    $ grep -n "error" app.log        # with line numbers
    $ grep -r "TODO" src/            # recursively through a directory

**The flags that earn their keep:** \`-i\` case-insensitive, \`-v\` invert, \`-n\` line numbers,
\`-r\` recursive, \`-c\` count, \`-l\` list only filenames.

**\`-l\` is the one people miss.** When searching a codebase you usually want "which files mention
this", not every matching line. \`grep -rl "TODO" src/\` answers the question you actually had.

**Patterns are regular expressions**, and a handful covers almost everything:

    ^Error       # lines STARTING with Error
    failed$      # lines ENDING with failed
    .            # any single character
    [0-9]        # any digit
    colou?r      # optional u — matches color and colour
    \\d+          # one or more digits (with -E)

**Anchors are what make a search precise.** \`grep "404"\` matches a timestamp containing 404;
\`grep " 404 "\` is better; \`grep -E " 404 [0-9]+$"\` is precise. Start loose, look at the output,
tighten — the same incremental habit as building a pipeline.

**Quote your pattern, always.** Unquoted, the shell expands \`*\` and \`?\` against filenames
before grep ever sees them, which produces baffling results. \`grep "*.conf"\` and
\`grep *.conf\` are entirely different commands.

**grep in a pipeline is where it shines:**

    $ ps aux | grep nginx
    $ cat access.log | grep -v "healthcheck" | grep " 500 "

Filtering early keeps later stages small and fast.`,
    mcqs: [
      mcq('You want the FILES mentioning "TODO" rather than the matching lines. Which flag?',
        [['-l', true], ['-c', false], ['-n', false], ['-v', false]],
        'The one most people miss, and usually the question you actually had when searching a codebase.'),
      mcq('Why quote a grep pattern?',
        [['Unquoted, the shell expands * and ? against filenames before grep sees them', true],
          ['grep requires quotes', false],
          ['For readability', false],
          ['To allow spaces only', false]],
        '`grep *.conf` and `grep "*.conf"` are entirely different commands, and the first produces baffling results.'),
      mcq('`grep "^Error"` matches:',
        [['Lines starting with Error', true],
          ['Lines containing Error', false],
          ['Lines ending with Error', false],
          ['Lines not containing Error', false]],
        'The caret anchors to line start. Anchors are what turn an approximate search into a precise one.'),
      mcq('`grep "404"` on a web log matches more than you wanted. The best next step is:',
        [['Tighten the pattern using anchors or surrounding context, then look again', true],
          ['Add -i', false],
          ['Use -c instead', false],
          ['Pipe to head', false]],
        'A timestamp containing 404 matches too. Start loose, look, tighten — the same incremental habit as building a pipeline.'),
    ],
    checkpoint: [
      mcq('Exclude health-check noise from a log before filtering for errors. Which?',
        [['`grep -v healthcheck app.log | grep " 500 "`', true],
          ['`grep healthcheck app.log`', false],
          ['`grep -c " 500 " app.log`', false],
          ['`grep -l " 500 " app.log`', false]],
        'Filtering the noise out first keeps every later stage smaller, which matters on a large file.'),
      mcq('`grep -i "error"` differs from `grep "error"` how?',
        [['It also matches Error and ERROR', true],
          ['It counts instead of printing', false],
          ['It searches recursively', false],
          ['It inverts the match', false]],
        'Case is the commonest reason a search finds nothing when you were sure the text was there.'),
    ],
  },
  {
    unitCode: 'T_SHELL_PIPELINES_TRANSFORMING',
    notes: `Four small tools do most of the work in real pipelines. Each does one thing, which is
what makes them combinable.

**\`cut\` — take columns.**

    $ cut -d',' -f2 data.csv        # field 2, comma-separated
    $ cut -d' ' -f1,7 access.log    # fields 1 and 7, space-separated

\`-d\` is the delimiter, \`-f\` the fields. Note that \`cut\` treats *every* delimiter as a
separator, so runs of spaces produce empty fields — a real nuisance with aligned output, and
the reason \`awk\` exists.

**\`sort\` — order lines.**

    $ sort names.txt
    $ sort -n numbers.txt        # NUMERICALLY, not as text
    $ sort -rn numbers.txt       # numeric, descending
    $ sort -u names.txt          # sorted, duplicates removed

**\`-n\` is not optional when sorting numbers.** By default sort compares as text, so 10 comes
before 9 — the same lexicographic trap as \`"9" > "10"\` being true.

**\`uniq\` — collapse ADJACENT duplicates.**

    $ sort names.txt | uniq       # unique names
    $ sort names.txt | uniq -c    # with a count of each
    $ sort names.txt | uniq -d    # only the duplicated ones

**\`uniq\` only sees adjacent lines**, which is why it is almost always preceded by \`sort\`.
\`uniq\` alone on unsorted input silently under-reports, and nothing warns you.

**\`wc\` — count.** \`wc -l\` lines, \`-w\` words, \`-c\` bytes.

**The pattern these four form**, which is worth recognising as a shape:

    ... | sort | uniq -c | sort -rn | head

Count occurrences, then rank by frequency. Top error messages, most active users, commonest
response codes — all the same five words. Learn this one line and you can answer a surprising
proportion of "what is happening in this log" questions.`,
    workedExample: `**Goal: the ten most frequent error messages in a log, from nothing.**

Build incrementally and look at every stage.

    $ cat app.log | head -3
    2026-01-14 10:22:01 INFO  request received
    2026-01-14 10:22:03 ERROR database timeout
    2026-01-14 10:22:04 INFO  request complete

**1. Keep only errors.**

    $ grep "ERROR" app.log | head -3
    2026-01-14 10:22:03 ERROR database timeout
    2026-01-14 10:31:55 ERROR database timeout
    2026-01-14 10:33:02 ERROR invalid token

**2. Drop the timestamp,** keeping from field 4 onwards. The delimiter is a space:

    $ grep "ERROR" app.log | cut -d' ' -f4- | head -3
    database timeout
    database timeout
    invalid token

**3. Group identical messages together.** \`uniq\` needs adjacency, so sort first:

    $ grep "ERROR" app.log | cut -d' ' -f4- | sort | head -3
    database timeout
    database timeout
    invalid token

**4. Count each distinct message.**

    $ ... | sort | uniq -c
          2 database timeout
          1 invalid token

**5. Rank by frequency and take the top ten.** \`-rn\` because the count is a number and we want
the largest first:

    $ grep "ERROR" app.log | cut -d' ' -f4- | sort | uniq -c | sort -rn | head -10

**Now break it deliberately.** Drop the first \`sort\`:

    $ grep "ERROR" app.log | cut -d' ' -f4- | uniq -c | sort -rn | head

The two "database timeout" lines were adjacent in this small sample, so it happens to look
right. On a real log where they are separated by other messages, each appears as its own count
of 1 and the ranking is meaningless. **It produces a plausible wrong answer with no error**,
which is why \`sort | uniq\` is written as a pair.

And drop the \`-n\`:

    $ ... | uniq -c | sort -r | head

Now 9 sorts above 10, because text comparison puts "9" after "1". The top of your ranking is
simply wrong.`,
    mcqs: [
      mcq('Why is `uniq` almost always preceded by `sort`?',
        [['uniq only collapses ADJACENT duplicate lines', true],
          ['uniq requires sorted input to run', false],
          ['sort removes duplicates itself', false],
          ['For speed', false]],
        'On unsorted input uniq silently under-reports and nothing warns you, which produces a plausible wrong answer.'),
      mcq('`sort` without `-n` on a list of numbers gives:',
        [['Text ordering, so 10 sorts before 9', true],
          ['Correct numeric order', false],
          ['An error', false],
          ['Random order', false]],
        'The same lexicographic trap as "9" > "10" being true, and it quietly corrupts the top of any ranking.'),
      mcq('What does `sort | uniq -c | sort -rn | head` do?',
        [['Ranks distinct lines by how often they occur, most frequent first', true],
          ['Sorts and removes duplicates', false],
          ['Counts total lines', false],
          ['Finds the longest lines', false]],
        'One line that answers a surprising share of "what is happening in this log" questions.'),
      mcq('`cut -d\' \' -f2` on text with runs of multiple spaces behaves how?',
        [['Each space is a separator, so runs produce empty fields', true],
          ['Runs are treated as one separator', false],
          ['It errors', false],
          ['It trims automatically', false]],
        'A real nuisance with column-aligned output, and the main reason people reach for awk instead.'),
    ],
    checkpoint: [
      mcq('Which pipeline finds the three most common HTTP status codes in field 9?',
        [['`cut -d\' \' -f9 log | sort | uniq -c | sort -rn | head -3`', true],
          ['`cut -d\' \' -f9 log | uniq -c | head -3`', false],
          ['`sort log | cut -d\' \' -f9 | head -3`', false],
          ['`grep -c 200 log`', false]],
        'The second omits the sort before uniq and will under-count; the third sorts whole lines rather than the extracted field.'),
      mcq('A frequency ranking looks plausible but is wrong, with no error shown. Most likely cause?',
        [['`uniq` was used without sorting first', true],
          ['head was used', false],
          ['The file was too large', false],
          ['cut used the wrong delimiter', false]],
        'It is the failure mode that produces believable output, which makes it far more dangerous than one that produces nothing.'),
    ],
  },
  {
    unitCode: 'T_SHELL_PIPELINES_SCRIPTS',
    notes: `When you have typed a pipeline twice, save it. A script is a file of commands the shell
runs in order, and turning something you repeat into something you keep is where the shell stops
being a tool and becomes leverage.

    #!/bin/bash
    # top-errors.sh — the ten most frequent errors in a log

    grep "ERROR" "$1" | cut -d' ' -f4- | sort | uniq -c | sort -rn | head -10

Then:

    $ chmod +x top-errors.sh
    $ ./top-errors.sh app.log

**The shebang line.** \`#!/bin/bash\` tells the system which interpreter to use. Without it the
file is just text and \`./script.sh\` fails confusingly.

**Execute permission is separate from read permission.** \`chmod +x\` once, and "Permission
denied" on a file you can clearly read is almost always this.

**Arguments:** \`$1\`, \`$2\` for the first and second, \`$@\` for all, \`$#\` for how many.

**Quote every variable.** \`"$1"\` rather than \`$1\`. Unquoted, a filename containing a space
becomes two arguments and the script fails on exactly the files users create. This is the single
most common shell-script bug, and the fix is a habit rather than a rule to remember.

**Check your inputs**, because a script that assumes is a script that corrupts something at 2am:

    if [ $# -lt 1 ]; then
        echo "Usage: $0 <logfile>" >&2
        exit 1
    fi

    if [ ! -f "$1" ]; then
        echo "No such file: $1" >&2
        exit 1
    fi

Errors go to stderr with \`>&2\`, and a failure exits non-zero — so anything calling your script
can tell it failed. A script that prints "error" and exits 0 has lied to its caller.

**Three lines that prevent most disasters:**

    set -e      # stop at the first failing command
    set -u      # error on an undefined variable
    set -o pipefail   # a pipeline fails if ANY stage fails, not just the last

Without \`-e\` a script carries on after a failure and the later steps operate on nothing.
Without \`-u\` a typo'd variable is an empty string, and \`rm -rf "$DIR/"\` with an empty \`DIR\`
is a story people tell.`,
    mcqs: [
      mcq('Why quote `"$1"` rather than writing `$1`?',
        [['A filename containing a space would otherwise split into two arguments', true],
          ['Quotes are required by bash', false],
          ['It is faster', false],
          ['To allow numbers', false]],
        'The single most common shell-script bug, and it fails on exactly the filenames real users create.'),
      mcq('`./script.sh` gives "Permission denied" on a file you can read. The cause is:',
        [['The execute bit is not set — chmod +x', true],
          ['The shebang is wrong', false],
          ['The file is owned by root', false],
          ['A syntax error', false]],
        'Read and execute are separate permissions, and this message is specifically about the second.'),
      mcq('`set -u` protects against what?',
        [['A mistyped variable name silently becoming an empty string', true],
          ['Syntax errors', false],
          ['Missing files', false],
          ['Slow commands', false]],
        '`rm -rf "$DIR/"` with an empty DIR is the canonical disaster this one line prevents.'),
      mcq('Why send script errors to stderr and exit non-zero?',
        [['So the caller can distinguish output from errors and detect the failure', true],
          ['It is conventional only', false],
          ['stderr is faster', false],
          ['To make them red', false]],
        'A script that prints "error" and exits 0 has lied to whatever called it, and automation will carry on regardless.'),
    ],
    checkpoint: [
      mcq('Without `set -o pipefail`, a pipeline\'s exit status reflects:',
        [['Only the LAST command, so an earlier failure goes unnoticed', true],
          ['Only the FIRST command, so a later failure goes unnoticed', false],
          ['Any failing command, which is why the option rarely matters', false],
          ['Always zero, because a pipeline cannot report a failure', false]],
        '`badcommand | head` succeeds as far as the shell is concerned, which is why the option exists.'),
      mcq('What does the shebang line do?',
        [['Tells the system which interpreter should run the file', true],
          ['Is a comment with no effect', false],
          ['Sets execute permission', false],
          ['Imports bash functions', false]],
        'It starts with # so it looks like a comment, which is why its absence produces such a confusing failure.'),
    ],
  },
  {
    unitCode: 'T_SHELL_PIPELINES_PRACTICE',
    notes: `No new commands. Everything here uses streams, redirection, pipes, \`grep\`, \`cut\`,
\`sort\`, \`uniq\`, \`wc\` and scripts — answering real questions about real files, using only the
shell.

**Why "real questions" is the framing.** A shell exercise that says "use grep to find X" has
already done the hard part. The skill is going from "which users hit errors most often
yesterday" to a pipeline, and that translation is what these problems train.

**The method, every time:**

1. **Look at the data first.** \`head -5 file\`. You cannot choose a delimiter or a field number
   without seeing the shape.
2. **Say what you want in one sentence.** "Count distinct values in field 7, ranked."
3. **Build one stage at a time**, looking after each.
4. **Sanity-check the numbers.** If the total exceeds the line count, something is wrong.

**The checklist before trusting a result:**

- Did I \`sort\` before \`uniq\`? Otherwise the counts are silently wrong.
- Did I use \`-n\` on a numeric sort? Otherwise 10 sorts before 9.
- Is my delimiter right for THIS file? Tabs and runs of spaces are not the same as single
  spaces.
- Am I counting lines or occurrences? Two matches on one line is one line to \`grep -c\`.
- Did errors go where I expected, or are they mixed into my data?

**Estimate before running.** "This log has about 50,000 lines and maybe 200 are errors" —
then check. A result an order of magnitude from your estimate usually means the pipeline is
wrong, not that your intuition was.`,
    mcqs: [
      mcq('Count how many DISTINCT IP addresses appear in field 1 of a log. Which?',
        [['`cut -d\' \' -f1 log | sort -u | wc -l`', true],
          ['`cut -d\' \' -f1 log | wc -l`', false],
          ['`grep -c "\\." log`', false],
          ['`sort log | wc -l`', false]],
        'The second counts every occurrence rather than distinct values. `sort -u` collapses duplicates before counting.'),
      mcq('`grep -c "error" file` returns 5, but you know there are 8 occurrences. Why?',
        [['grep -c counts matching LINES, and some lines contain more than one match', true],
          ['grep missed three', false],
          ['Case sensitivity', false],
          ['The file changed', false]],
        '`grep -o "error" file | wc -l` counts occurrences. Knowing which question you asked is the point.'),
      mcq('Your frequency counts are all 1 and you expected clustering. The likely cause is:',
        [['uniq was run on unsorted input', true],
          ['The file is too large', false],
          ['Wrong grep pattern', false],
          ['Missing -c flag', false]],
        'The characteristic symptom: every distinct line reported once because duplicates were never adjacent.'),
      mcq('Before writing any pipeline, the first step is:',
        [['Look at the first few lines of the data', true],
          ['Decide which commands to use', false],
          ['Count the lines', false],
          ['Write the script file', false]],
        'A delimiter and a field number cannot be chosen without seeing the shape, and guessing is what produces empty output.'),
      mcq('Your total exceeds the number of lines in the file. What does that suggest?',
        [['The pipeline is counting something other than what you think', true],
          ['The file grew', false],
          ['Normal for logs', false],
          ['A rounding error', false]],
        'The sanity check that catches a wrong field or a double count before you act on the number.'),
    ],
    coding: [
      {
        title: 'Describe the pipeline for each question',
        description: `For each question, print the number of the correct pipeline, one per line.

Questions, in order:
1. How many lines contain "ERROR"?
2. What are the 3 most common values in field 5 (space-separated)?
3. How many distinct values are in field 2 (comma-separated)?

Pipelines:
1 = \`cut -d' ' -f5 f | sort | uniq -c | sort -rn | head -3\`
2 = \`grep -c ERROR f\`
3 = \`cut -d',' -f2 f | sort -u | wc -l\`

Print three lines: the pipeline number for question 1, then 2, then 3.`,
        starter: `# Print three numbers, one per line.
`,
        language: 'python',
        tests: [
          // Hidden deliberately: the task takes no input, so a visible case would print the key.
          { input: '', expectedOutput: '2\n1\n3', isHidden: true },
        ],
      },
    ],
    checkpoint: [
      mcq('Which check would catch a wrong delimiter fastest?',
        [['Run the cut stage alone and look at its output', true],
          ['Count the total lines', false],
          ['Add -i to grep', false],
          ['Run the whole pipeline and inspect the end', false]],
        'A wrong delimiter usually yields whole lines or empty fields, and that is obvious the moment you look at that stage alone.'),
      mcq('`sort -rn` versus `sort -r`:',
        [['`-n` compares numerically; without it 9 sorts above 10', true],
          ['They are the same', false],
          ['`-rn` reverses twice', false],
          ['`-r` is numeric by default', false]],
        'Silently corrupts the top of any frequency ranking, which is the part you were going to act on.'),
    ],
  },
  {
    unitCode: 'T_SHELL_PIPELINES_MINI_PROJECT',
    notes: `Find something you do by hand repeatedly and remove it with a script.

**Why a real task rather than a set exercise.** A prescribed script teaches the syntax. Finding
your own task teaches the part that matters: noticing that something is repetitive, deciding
what the script should do when reality does not match your assumption, and living with the
result afterwards. You will only do that honestly for something that actually annoys you.

**Candidates, if nothing comes to mind immediately:**

- Rename or reorganise a folder of files by date or type
- Extract a summary from a log or export you check regularly
- Back up a directory, keeping only the last N copies
- Convert a set of files from one format to another
- Set up a project skeleton you type out each time

**The part that is actually assessed: the failure cases.**

A script that works when everything is as expected is a recording of what you typed. A script
worth keeping handles what happens when it is not:

- The file does not exist, or is empty
- A filename contains a space, or a quote, or begins with a dash
- The script is run twice — does the second run do harm?
- The destination already exists
- The disk is full, or the input is much larger than expected
- It is run from a different directory than you assumed

**You do not need to handle all of these.** You need to have *thought* about each, handled the
ones that matter, and written down why the others are acceptable to ignore. "Running twice is
safe because the script appends with a timestamped name" is a complete answer. So is "this would
break on filenames with newlines, which cannot occur in this directory because the files are
generated by X".

**Test destructively.** Run it on an empty directory, on a file with a space in the name, and
twice in a row. Those three find most of it.

The brief, acceptance criteria and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — Automate Something You Do By Hand',
      description: `Write a shell script that removes a real repetitive task from your own workflow, with the failure cases handled deliberately rather than assumed away.`,
      instructions: `**The brief**

Identify something you genuinely do by hand more than once, and write a script that does it.

It must be a real task of yours. If nothing comes to mind, choose one of these and adapt it to
your actual files:

- Summarise a log or CSV you look at regularly
- Organise a downloads folder by file type or date
- Back up a directory, keeping only the most recent N backups
- Generate a project skeleton you create repeatedly

**Requirements**

1. A shebang line and execute permission.
2. \`set -euo pipefail\` at the top.
3. At least one argument, validated — a usage message to stderr and a non-zero exit when it is
   missing or wrong.
4. Every variable quoted.
5. Errors to stderr; success output to stdout.
6. Non-zero exit on any failure.
7. **Safe to run twice.** Either idempotent, or it refuses when it would do harm.
8. At least one pipeline using two or more of \`grep\`, \`cut\`, \`sort\`, \`uniq\`, \`wc\`.

**What to submit**

1. The script.
2. A **failure-case table** — every case from the list below, with either how you handled it or
   why ignoring it is acceptable for this script:

   | Case | Handled how, or why not applicable |
   |---|---|
   | Missing argument | |
   | File or directory does not exist | |
   | Empty input | |
   | Filename containing a space | |
   | Run twice in a row | |
   | Destination already exists | |
   | Run from a different directory | |

3. **Test evidence**: the output of running it (a) correctly, (b) with no arguments, (c) with a
   non-existent file, (d) twice in a row.

4. A short note (roughly 150-250 words): what the manual task was, how long it took, and what
   you decided NOT to handle and why.

**Constraints**

- Bash only. No Python.
- No \`rm -rf\` on a path built from a variable unless you have validated that variable and can
  say in the table exactly why it cannot be empty.

**Where the marks are.** The failure-case table is worth more than the script. A simple script
with a thoughtful table scores well above a clever script that assumes everything goes right.`,
      rubric: [
        {
          criterion: 'The script works',
          description: 'Performs a genuine repetitive task correctly, with at least one multi-stage pipeline, a shebang and execute permission.',
          maxPoints: 20,
        },
        {
          criterion: 'Robustness',
          description: 'set -euo pipefail present, every variable quoted, arguments validated, errors to stderr with a non-zero exit, and safe to run twice.',
          maxPoints: 30,
        },
        {
          criterion: 'Failure-case table',
          description: 'Every listed case addressed with either the handling or a stated reason it does not apply. Reasoned rather than dismissed.',
          maxPoints: 30,
        },
        {
          criterion: 'Test evidence',
          description: 'All four runs shown with their real output, including the two failure runs and the repeat run.',
          maxPoints: 20,
        },
      ],
      totalPoints: 100,
    },
  },
];
