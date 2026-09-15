/**
 * T_C_BASICS — C for the degree, the whole topic.
 *
 * ── WHY THIS TOPIC, AND WHO IT IS FOR ─────────────────────────────────────────────────────
 *
 * ACADEMIC, and never mandatory: it serves a university syllabus rather than a career path. It
 * is authored because Phase 21 measured it as the largest single source of genuine new learning
 * for a first-year who has already demonstrated the universal programming core — somebody fluent
 * in Python conditions and loops has still never declared a type, compiled a file or held an
 * address in a variable. Nothing here re-teaches what they have shown.
 *
 * ── THE LINE THIS TOPIC HOLDS ─────────────────────────────────────────────────────────────
 *
 * C taught as "Python with semicolons" produces students who pass the exam and learn nothing
 * about the machine. Every unit is about what C makes VISIBLE: that a value has a size, that a
 * program is compiled before it runs, that an array does not know its own length, and that an
 * address is just a number you can hold. Those are the ideas that survive after the syntax is
 * forgotten, and they are what higher-level languages spend their effort hiding.
 *
 * Checkpoint questions name the one skill each measures: C_CONTROL_FLOW for branching and
 * looping, C_BASICS for everything else.
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

const B = 'C_BASICS';
const F = 'C_CONTROL_FLOW';

export const C_BASICS_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'T_C_BASICS_WHY_C',
    notes: `C is fifty years old and still taught in almost every computer science degree. That is not
nostalgia. It is because C shows you the machine that other languages deliberately hide.

**What Python does for you that C does not:**

- **Memory.** In Python a list grows when you append. In C you decide how much memory a value
  needs, and if you ask for more while the program runs, you must give it back yourself.
- **Sizes.** A Python integer can be as large as you like. A C \`int\` has a fixed number of
  bytes, and a value that does not fit silently goes wrong.
- **Checking.** Python stops you reading past the end of a list. C lets you, and what happens
  next depends on whatever memory happened to be there.
- **Compilation.** Python reads your file and runs it. C is translated into machine code first,
  by a separate program, before anything runs at all.

**Where C is still the normal choice.** Operating system kernels, device drivers, firmware in
washing machines and cars, and the interpreters of other languages. CPython — the program that
runs your Python code — is written in C. When you call \`len()\` on a list, a C function answers.

**Why that matters to somebody who will write Python for a living.** Every "why is this slow",
"why did this use so much memory" and "what does passing by reference actually mean" question in
a higher-level language has its answer one layer down, and C is that layer. Students who have
held an address in a variable understand what a Python reference is; students who have not are
left memorising rules.

**What it costs.** Responsibility. C trusts you completely, which means a mistake that Python
would stop with a clear error becomes, in C, a program that runs and quietly produces the wrong
answer. Most of this topic is about learning to take that responsibility deliberately.`,
    mcqs: [
      mcq('Which of these does C make you handle that Python handles for you?',
        [['Deciding how much memory a value needs, and releasing what you allocate', true],
          ['Indenting code consistently, so the blocks can be recognised', false],
          ['Declaring which libraries the operating system should load first', false],
          ['Converting every number to text before it can be printed out', false]],
        'Memory management is the defining difference. Python allocates and frees behind the scenes; in C both are your job.'),
      mcq('CPython, the program that actually runs Python code, is written in:',
        [['C', true], ['Python itself', false], ['Java', false], ['Assembly only', false]],
        'Which is why understanding C explains so much about how Python behaves — a built-in like len() is a C function underneath.'),
      mcq('Why is a C program usually faster than the equivalent Python program?',
        [['It is compiled to machine code ahead of time, with no interpreter in between', true],
          ['C programs contain more keywords, so the processor can recognise them faster', false],
          ['Python programs are always longer, so they take more time to be read', false],
          ['C runs on the graphics card, while Python runs on the main processor', false]],
        'Compilation happens once, before the program runs. An interpreter does its translation work while the program is running.'),
      mcq('A student says "I will only ever write Python, so learning C is wasted." The strongest reply is:',
        [['C shows what higher-level languages hide: memory, sizes and cost', true],
          ['Every job interview includes at least one question about C', false],
          ['Python is going to be replaced by C in most companies soon', false],
          ['C is easier than Python once its syntax has been memorised', false]],
        'The value is the model of the machine, which transfers to every language, not the syntax, which does not.'),
    ],
    checkpoint: [
      mcq('Which is a real consequence of C having no garbage collector?',
        [['Memory you allocate stays allocated until your own code frees it', true],
          ['Variables are deleted as soon as they are given a new value', false],
          ['Programs can never use more memory than the stack provides', false],
          ['Every function must hand its memory back to the compiler', false]],
        'Nothing reclaims it for you. Forgetting to free memory in a long-running program is how a memory leak happens.', B),
      mcq('Where does C remain the usual choice today?',
        [['Operating system kernels and firmware on small devices', true],
          ['Spreadsheet formulas and business reporting dashboards', false],
          ['Training large language models from scratch in notebooks', false],
          ['Styling web pages so they work on a phone and a laptop', false]],
        'Wherever the program must be small, fast and close to the hardware, with no runtime underneath it.', B),
      mcq('Python\'s `len(items)` always knows a list\'s length. An array passed to a C function:',
        [['Does not carry its length, so the size must be passed separately', true],
          ['Stores its length in element zero, which you read before the rest', false],
          ['Reports its full length through sizeof inside the called function', false],
          ['Cannot be passed to a function at all without copying it first', false]],
        'A C array passed to a function arrives as the address of its first element and nothing more. The length is your responsibility.', B),
    ],
  },
  {
    unitCode: 'T_C_BASICS_COMPILE_AND_RUN',
    notes: `Running a C program is two separate steps, and keeping them separate in your head explains
most of the confusion beginners hit.

**Step 1 — compile.** A compiler reads your source file and produces an executable:

    $ gcc hello.c -o hello

\`gcc\` is the compiler, \`hello.c\` the source, and \`-o hello\` names the output. Leave out
\`-o\` and the executable is called \`a.out\`.

**Step 2 — run.** The executable is an ordinary program now, unrelated to the source file:

    $ ./hello

Change \`hello.c\` and run \`./hello\` again without recompiling, and you get the OLD behaviour.
This catches everybody once.

**The smallest complete program:**

    #include <stdio.h>

    int main(void) {
        printf("Hello\\n");
        return 0;
    }

\`#include <stdio.h>\` brings in the declaration of \`printf\`. \`main\` returns an \`int\`, and
that number becomes the program's exit status — \`0\` means success, which you can see with
\`echo $?\` straight after running it.

**Reading the compiler.** Errors stop the build; warnings do not, and that is exactly why warnings
matter. Compile with warnings switched on, always:

    $ gcc -Wall hello.c -o hello

\`-Wall\` enables the warnings for code that compiles but is almost certainly a mistake, such as
using a variable before giving it a value.

**When there are forty errors, read the first one.** A single missing brace or semicolon confuses
the compiler about everything after it, so later errors are frequently echoes of the first. Fix it,
recompile, and most of the rest usually disappear.

**Why the line number is often one too late.** A missing semicolon at the end of line 7 is only
noticed when the compiler reaches line 8 and finds something that cannot follow. So
\`expected ';' before 'return'\` on line 8 usually means look at the end of line 7.`,
    mcqs: [
      mcq('`gcc hello.c -o hello` produces:',
        [['An executable file named hello that can be run directly', true],
          ['A text file of assembly that must then be edited by hand', false],
          ['Output printed to the screen, with nothing written to disk', false],
          ['A Python script that does the same thing as the C program', false]],
        'Compiling produces a new file. Running it is a separate step, which is why editing the source changes nothing until you recompile.'),
      mcq('The compiler reports 40 errors. Where do you start?',
        [['The first one, because later errors are often caused by it', true],
          ['The last one, since it is closest to the end of the file', false],
          ['Whichever error mentions the line you edited most recently', false],
          ['Any of them; the order the compiler lists them in is random', false]],
        'One missing brace can derail the compiler for the rest of the file. Fixing the first error often removes dozens of others.'),
      mcq('`error: expected \';\' before \'return\'` points at line 8. The missing semicolon is most likely:',
        [['At the end of line 7, the statement just before it', true],
          ['At the start of line 8, before the word return', false],
          ['At the end of line 8, after the value being returned', false],
          ['In the #include line at the very top of the file', false]],
        'The compiler only notices a statement has not ended when it meets something that cannot follow it, which is on the next line.'),
      mcq('Why compile with `-Wall`?',
        [['It turns on warnings that flag likely bugs the compiler would otherwise accept', true],
          ['It makes the executable run faster by stripping out debug information', false],
          ['It allows the program to use all of the memory the machine has', false],
          ['It links every standard library, so no #include lines are needed', false]],
        'A warning is the compiler saying "this is legal, and it is probably not what you meant". Without -Wall most of them are silent.'),
    ],
    checkpoint: [
      mcq('A compiler warning, unlike an error:',
        [['Still produces an executable, but flags code that is probably wrong', true],
          ['Stops the build until the flagged line is fixed and recompiled', false],
          ['Only appears when the program is run, not when it is compiled', false],
          ['Means the compiler could not find one of the header files', false]],
        'Which is exactly why warnings are dangerous to ignore: the program builds, runs and misbehaves.', B),
      mcq('After `gcc hello.c` with no `-o` option, the executable is saved as:',
        [['a.out', true], ['hello', false], ['hello.exe', false], ['main', false]],
        'The historical default name. Naming the output with -o avoids overwriting one program with the next.', B),
      mcq('You edit `hello.c`, then run `./hello` without recompiling. What runs?',
        [['The old program, built from the source before your edit', true],
          ['The new version, because the shell recompiles automatically', false],
          ['Nothing, because the executable is deleted when the source changes', false],
          ['A mixture, with the changed lines taking effect and the rest old', false]],
        'The executable is a separate file with no connection to the source. Only recompiling updates it.', B),
    ],
  },
  {
    unitCode: 'T_C_BASICS_TYPES_AND_VARIABLES',
    notes: `In C, every variable is declared with a type before it is used, and the type decides how
many bytes it occupies and how those bytes are read.

    int count = 0;         // a whole number, usually 4 bytes
    double price = 19.99;  // a decimal, 8 bytes
    char grade = 'A';      // a single byte
    float ratio = 0.5f;    // a less precise decimal, 4 bytes

**Sizes are fixed, and not the same everywhere.** An \`int\` is commonly 4 bytes but the language
only promises a minimum. \`sizeof(int)\` tells you the truth on the machine you are compiling for,
and code that assumes a number instead of asking breaks when it moves.

**Integer division throws the remainder away.**

    int a = 7, b = 2;
    double r = a / b;      // r is 3.0, not 3.5

The division happens between two \`int\`s, producing \`3\`, and only then is it stored in a
\`double\`. To get 3.5, make one operand a double first: \`(double) a / b\`.

**A \`char\` is a small integer.** \`'A'\` is the number 65, so \`'A' + 1\` is \`'B'\`. That is not a
trick; it is what text is at the level C works at.

**An uninitialised variable holds garbage.**

    int total;
    printf("%d\\n", total);   // prints whatever was in that memory

Python would refuse to use a name that has no value. C gives you the leftover bytes from whatever
used that memory last, which is why a program can print different results on different runs with
the same input. Give every variable a value when you declare it.

**\`float\` versus \`double\`.** Prefer \`double\`. A \`float\` holds roughly seven significant
digits and a \`double\` about fifteen, and mixing them causes comparisons like
\`price == 19.99\` to fail because the literal \`19.99\` is a double while the variable stored a
less precise float copy.

**\`const\`** marks a value that must not change after initialisation. The compiler then refuses
any assignment to it, which turns a class of bug into a compile error.`,
    mcqs: [
      mcq('`int x; printf("%d", x);` prints:',
        [['Whatever value happened to be left in that memory', true],
          ['Zero, since C sets every new int to zero automatically', false],
          ['An error, because x was never given a value first', false],
          ['The largest value that an int is able to hold', false]],
        'C does not initialise local variables for you. The value is unpredictable, which is why results can differ between runs.'),
      mcq('`int a = 7, b = 2; double r = a / b;` What is r?',
        [['3.0, because the division happens on ints before the assignment', true],
          ['3.5, because the result is being stored in a double variable', false],
          ['3.5, since C promotes every division result to floating point', false],
          ['A compile error, because int and double cannot be mixed', false]],
        'The type of the destination does not affect the calculation. Cast one operand, as in (double) a / b, to keep the fraction.'),
      mcq('`char c = \'A\' + 1;` — what does c hold?',
        [['\'B\', since a char is a small integer', true],
          ['The two characters A and 1 joined together', false],
          ['A compile error, as characters cannot be added', false],
          ['The number 1, stored as a text character', false]],
        'Characters are numbers in C. \'A\' is 65, so adding one gives 66, which is \'B\'.'),
      mcq('Why write `sizeof(int)` rather than assuming an int is 4 bytes?',
        [['The size of int depends on the platform and the compiler used', true],
          ['sizeof is faster than writing the number directly in the code', false],
          ['The number 4 is not allowed as an array size in standard C', false],
          ['It rounds the size up to the nearest power of two for you', false]],
        'The language guarantees only a minimum. Asking the compiler keeps the code correct on a machine you have not tested.'),
    ],
    checkpoint: [
      mcq('Which declaration holds a decimal value most precisely?',
        [['`double d;`', true], ['`float f;`', false], ['`int i;`', false], ['`char c;`', false]],
        'A double has roughly fifteen significant digits against a float\'s seven, and int and char hold no fraction at all.', B),
      mcq('`float price = 19.99;` then `if (price == 19.99)` is false. Why?',
        [['19.99 is a double literal, and the float stored a less precise copy', true],
          ['The comparison operator in C only works correctly on integers', false],
          ['price was rounded up to 20 at the moment it was declared', false],
          ['Floats must be compared with = rather than with ==', false]],
        'The two values differ in the digits a float cannot keep. Use double consistently, and compare decimals within a tolerance.', B),
      mcq('Using a local variable before giving it a value in C:',
        [['Compiles, and reads whatever the memory already contained', true],
          ['Is rejected by the compiler as a syntax error', false],
          ['Always gives zero, which is why it is considered safe', false],
          ['Crashes immediately with a segmentation fault', false]],
        'It is legal and wrong. -Wall usually warns about it, which is one of the best reasons to compile with warnings on.', B),
    ],
  },
  {
    unitCode: 'T_C_BASICS_IO',
    notes: `\`printf\` writes formatted output and \`scanf\` reads formatted input. Both are driven by a
format string, and almost every bug in them is a format string that does not match the values.

**printf.** Each \`%\` specifier is replaced by the next argument, in order:

    int n = 3; double avg = 7.25; char g = 'B';
    printf("%d items, average %.2f, grade %c\\n", n, avg, g);

- \`%d\` int, \`%f\` double, \`%c\` char, \`%s\` string
- \`%.2f\` two decimal places; \`%5d\` at least five characters wide

A specifier that does not match its argument — \`printf("%d", 3.7)\` — is not converted for you. It
reads the bytes as if they were an int and prints nonsense.

**scanf needs addresses.**

    int n;
    scanf("%d", &n);

\`scanf\` must store the value somewhere, so it needs to know WHERE \`n\` lives. \`&n\` is that
address. Forget the \`&\` and \`scanf\` writes to whatever address the garbage value of \`n\`
happens to be — a crash if you are lucky.

**scanf's specifiers are stricter than printf's.** For a \`double\`, printf accepts \`%f\` but
scanf needs \`%lf\`, because it must know exactly how many bytes to write into.

**scanf returns how many values it successfully stored.** Check it:

    if (scanf("%d", &n) != 1) {
        printf("That was not a number\\n");
    }

If the input begins with a letter, nothing is stored and \`n\` keeps its old — possibly garbage —
value. Ignoring the return value is how a program carries on calculating with a number the user
never typed.

**The leftover newline.** After \`scanf("%d", &n)\`, the Enter key's newline is still waiting in
the input. A following \`scanf("%c", &c)\` reads that newline immediately. Writing \`" %c"\` with a
leading space tells scanf to skip whitespace first.

**Reading strings.** \`scanf("%s", name)\` stops at the first space and writes as many characters
as were typed, whether or not they fit. Give it a width one less than the array size —
\`scanf("%19s", name)\` for a 20-character array — so it cannot run past the end.`,
    mcqs: [
      mcq('Why does `scanf("%d", &n)` need the `&`?',
        [['scanf must know where n lives so it can write the value there', true],
          ['The & tells scanf to read a number rather than a character', false],
          ['It makes n constant, so the input cannot change it again later', false],
          ['It is optional; writing scanf("%d", n) behaves exactly the same', false]],
        'scanf stores into memory, so it needs an address. Without & it writes to a location chosen by n\'s garbage value.'),
      mcq('Which prints a double `x` with two decimal places?',
        [['`printf("%.2f", x)`', true], ['`printf("%2d", x)`', false], ['`printf("%d.2", x)`', false], ['`printf("%2.f", x)`', false]],
        'The precision goes after the dot. %2d is a width for an integer, and using it for a double prints garbage.'),
      mcq('`scanf("%d", &n)` returns 0. What happened?',
        [['The input did not start with a number, so nothing was stored', true],
          ['The user typed the number zero, and scanf returned that value', false],
          ['The value was read successfully and n now holds zero', false],
          ['scanf always returns 0 once it has finished successfully', false]],
        'The return value counts the items stored. Zero means n was not touched, so it still holds whatever it held before.'),
      mcq('Reading a double with `scanf("%f", &d)` gives a nonsense value. The fix is:',
        [['Use %lf, since scanf needs the exact size of a double', true],
          ['Use %d, since scanf converts integers into doubles itself', false],
          ['Declare d as a float, because scanf cannot read doubles', false],
          ['Add a space after %f so that the newline is consumed', false]],
        'printf promotes a float to double automatically, so %f works there. scanf writes into your memory and must be told the size.'),
    ],
    checkpoint: [
      mcq('`char name[10]; scanf("%s", name);` Why is this dangerous?',
        [['Input longer than nine characters is written past the end of the array', true],
          ['%s reads only the first character of whatever the user types in', false],
          ['Strings cannot be read with scanf and need a separate function', false],
          ['The array is freed as soon as scanf returns control to main', false]],
        'scanf does not know the array\'s size. A width, as in %9s, is what stops it overflowing.', B),
      mcq('`printf("%d", 3.7);` prints:',
        [['Garbage, because the specifier does not match the argument type', true],
          ['3, because printf truncates the value down to an integer', false],
          ['4, because printf rounds to the nearest whole number', false],
          ['3.7, since printf adapts the format to fit the value', false]],
        'printf does not convert between types. It reads the double\'s bytes as if they were an int.', B),
      mcq('After `scanf("%d", &n);` a following `scanf("%c", &c);` reads a newline. Why?',
        [['Pressing Enter left a newline in the input, and %c accepts it', true],
          ['%c always reads a newline first, before any other character', false],
          ['scanf adds a newline to the end of every value it stores', false],
          ['n and c share memory, so c receives the last byte of n', false]],
        '%d skips leading whitespace but %c does not. A leading space, as in " %c", tells scanf to skip it.', B),
    ],
  },
  {
    unitCode: 'T_C_BASICS_CONTROL_FLOW',
    notes: `Conditions and loops in C look almost exactly like the ones you already know. The
differences are small, and each one is a classic bug.

**Braces, always.**

    if (score >= 40) {
        printf("pass\\n");
    }

C allows the braces to be left off a one-line body. Do not. Somebody later adds a second line,
indents it to match, and it silently runs every time because only the first line was inside the
\`if\`.

**\`=\` is not \`==\`, and C will not stop you.**

    if (x = 5) { ... }     // assigns 5, and the condition is always true

An assignment is an expression whose value is the value assigned, so this compiles. \`-Wall\`
warns about it, which is one more reason to compile with warnings on.

**Truth is a number.** Before \`<stdbool.h\`, C had no boolean type: zero is false and ANY
non-zero value is true. \`if (count)\` means "if count is not zero".

**The three loops.**

    for (int i = 0; i < n; i++) { ... }   // known number of times
    while (balance > 0) { ... }           // until something changes
    do { ... } while (choice != 'q');     // at least once

\`do ... while\` checks its condition AFTER the body, so it always runs once — right for a menu that
must be shown before you can know whether to show it again.

**The semicolon that ruins an afternoon.**

    for (i = 0; i < 10; i++);
    {
        printf("%d\\n", i);
    }

The \`;\` after the \`for\` is an empty loop body. The loop runs ten times doing nothing, then the
block below runs once and prints \`10\`. It compiles cleanly.

**\`switch\` falls through.** Each \`case\` runs into the next unless it ends with \`break\`:

    switch (grade) {
        case 'A': printf("excellent\\n"); break;
        case 'B': printf("good\\n");      break;
        default:  printf("keep going\\n");
    }

Leave out a \`break\` and a grade of \`'A'\` prints both lines. Occasionally that is what you want;
usually it is a bug, and it is worth a comment when it is deliberate.`,
    mcqs: [
      mcq('`if (x = 5)` compiles. What does it do?',
        [['Assigns 5 to x, and the condition is always true', true],
          ['Compares x with 5, exactly as x == 5 would', false],
          ['Fails at run time, because assignment is not a condition', false],
          ['Checks whether x is large enough to hold the value 5', false]],
        'An assignment has a value, the value assigned. Five is non-zero, so the body always runs.'),
      mcq('`for (i = 0; i < 3; i++); { printf("hi"); }` prints hi how many times?',
        [['Once, because the semicolon ends the loop body', true],
          ['Three times, once for each iteration of the loop', false],
          ['Zero times, since the braces after it are ignored', false],
          ['Four times, counting the final test that fails', false]],
        'The semicolon is an empty statement and becomes the whole loop body. The braced block is ordinary code that runs afterwards.'),
      mcq('In a `switch`, a case that has no `break`:',
        [['Falls through, running the next case\'s statements as well', true],
          ['Is skipped entirely when its value is the one that matches', false],
          ['Causes a compile error, since break is always required', false],
          ['Returns from the function once its own statements finish', false]],
        'Fall-through is the default behaviour. Forgetting break is one of the commonest C bugs.'),
      mcq('Which loop always runs its body at least once?',
        [['do ... while', true], ['for', false], ['while', false], ['None of them', false]],
        'Its condition is tested after the body. A for or while loop tests first and may run zero times.'),
    ],
    checkpoint: [
      mcq('In C without `<stdbool.h>`, what counts as true in a condition?',
        [['Any non-zero value', true], ['Only the value 1', false], ['Only positive values', false], ['Any value other than 1', false]],
        'Zero is false and everything else is true, including negative numbers. That is why if (count) works.', F),
      mcq('`while (n > 0) n--;` starting with n = 4 leaves n as:',
        [['0', true], ['-1', false], ['1', false], ['4', false]],
        'The loop stops the first time n > 0 is false, which is when n reaches 0.', F),
      mcq('Why do many C style guides require braces even on a one-line if body?',
        [['A second line added later silently ends up outside the if', true],
          ['The compiler rejects an if statement written without braces', false],
          ['Braces make the compiled program run noticeably faster', false],
          ['Without braces, an else cannot be attached to that if', false]],
        'Indentation means nothing to the compiler. Only braces decide which statements belong to the condition.', F),
    ],
  },
  {
    unitCode: 'T_C_BASICS_FUNCTIONS',
    notes: `A C function is declared with its return type and the type of every parameter.

    int area(int width, int height) {
        return width * height;
    }

**Declare before you call.** The compiler reads the file top to bottom. If \`main\` calls \`area\`
and \`area\` is defined further down, the compiler has not seen it yet. A **prototype** — the first
line followed by a semicolon — tells it the signature in advance:

    int area(int width, int height);   // prototype

    int main(void) {
        printf("%d\\n", area(3, 4));
        return 0;
    }

    int area(int width, int height) { return width * height; }

Leave the prototype out and you get a warning like \`implicit declaration of function 'area'\`,
and the call may be compiled wrongly. Treat that warning as an error.

**Arguments are copied.** C passes every argument BY VALUE:

    void increment(int n) { n++; }

    int x = 5;
    increment(x);     // x is still 5

\`n\` is a copy of \`x\`. Changing the copy changes nothing in the caller. To let a function change
a caller's variable you pass the variable's ADDRESS — a pointer — which is the next units' subject.

**\`void\`** means the function returns nothing. A function declared to return \`int\` that reaches
its closing brace without a \`return\` gives the caller an undefined value; the compiler may only
warn.

**Arrays arrive as addresses.** An array argument is passed as the address of its first element,
so the function cannot know the length:

    double average(int values[], int count);

\`count\` is not optional decoration. Without it the function has no way to know where to stop.

**Header files.** Prototypes that other files need live in a \`.h\` file, which those files
\`#include\`. The function bodies stay in a \`.c\` file. That split is how a large C program is built
from many separately compiled pieces.`,
    mcqs: [
      mcq('Why does C need a prototype when a function is defined below main?',
        [['The compiler reads top to bottom and must know the signature first', true],
          ['The linker cannot find functions without a separate prototype', false],
          ['A prototype makes the function run faster each time it is called', false],
          ['A function defined below main is not allowed to take parameters', false]],
        'The prototype is a promise about the signature, made before the first call, so the call can be compiled correctly.'),
      mcq('`void inc(int n) { n++; }` called as `inc(x);` — what happens to x?',
        [['Nothing, because n is a copy of x', true],
          ['x increases by one, since n and x are the same variable', false],
          ['x is set to zero when the function returns to the caller', false],
          ['The program fails to compile, as void cannot change values', false]],
        'Every argument in C is passed by value. The function changes its own copy and then throws it away.'),
      mcq('A function declared `int area(int w, int h)` ends without a return statement. The caller receives:',
        [['An undefined value, and the compiler may only warn', true],
          ['Zero, which C returns automatically from any int function', false],
          ['w multiplied by h, the last expression that was calculated', false],
          ['A compile error that stops the program from being built', false]],
        'Only main gets an implicit return 0. Any other function that falls off its end without returning is a bug.'),
      mcq('What belongs in a header file such as `maths.h`?',
        [['Prototypes and constants other files need in order to call the code', true],
          ['The full body of every function, so that each compiles only once', false],
          ['The main function, since every program must include one', false],
          ['Variable values that change while the program is running', false]],
        'Declarations go in the header, definitions in the .c file. Putting bodies in headers causes duplicate definitions at link time.'),
    ],
    checkpoint: [
      mcq('To let a function change a variable that belongs to its caller, C code passes:',
        [['The variable\'s address, as a pointer parameter', true],
          ['The variable itself, which C passes by reference', false],
          ['A global copy that the function hands back afterwards', false],
          ['The name of the variable written as a string', false]],
        'C has no pass-by-reference. Passing an address is how a function reaches the caller\'s actual memory.', B),
      mcq('`double avg(int a[], int n)` — why is n needed?',
        [['The array parameter does not carry its own length', true],
          ['C requires every array function to take two parameters', false],
          ['n chooses which element of a is to be averaged', false],
          ['It sets the size of the array inside the function', false]],
        'Inside the function a is only an address. Without n there is no way to know where the data ends.', B),
      mcq('The compiler warns "implicit declaration of function sqr". Most likely:',
        [['sqr is called before any prototype or definition has been seen', true],
          ['sqr returns a value that the calling code then ignores', false],
          ['sqr has the same name as a variable declared in main', false],
          ['sqr was defined twice, once in each of two files', false]],
        'The compiler met a call to a function it knew nothing about. Adding the prototype above the call fixes it.', B),
    ],
  },
  {
    unitCode: 'T_C_BASICS_ARRAYS',
    notes: `A C array is a fixed number of values of one type, stored side by side in memory.

    int marks[5] = {70, 82, 64, 91, 55};

**The size is fixed when the array is declared.** There is no append. If you need room for more,
you declare a larger array or allocate memory yourself.

**Indices run from 0 to size − 1**, exactly as in Python. What is different is what happens
outside that range:

    marks[5] = 100;    // compiles, and writes past the end

**C does not check indices.** \`marks[5]\` is simply the memory straight after \`marks[4]\`, and
that memory may belong to another variable. Writing there can silently change a different
variable's value, corrupt data the program needs later, or crash — and which of those happens
can change with the compiler or the optimisation level. This is the bug class behind a large share
of real security vulnerabilities, and it is why "undefined behaviour" is a phrase worth
remembering.

**Partial initialisation fills the rest with zeros.** \`int a[5] = {1, 2};\` gives
\`{1, 2, 0, 0, 0}\`. An array declared with no initialiser at all, inside a function, is full of
garbage.

**Counting elements.** In the scope where the array was declared:

    int count = sizeof(marks) / sizeof(marks[0]);   // 5

That trick fails inside a function the array was passed to, because there it is only an address,
and \`sizeof\` gives the size of the address.

**Arrays cannot be assigned.** \`b = a;\` does not compile. Copying means copying each element, in
a loop or with \`memcpy\`.

**A string is a char array ending in \`'\\0'\`.**

    char word[] = "cat";    // 4 bytes: 'c' 'a' 't' '\\0'

The null character marks the end, because the array does not know its own length. \`strlen(word)\`
counts characters up to the null (3); \`sizeof(word)\` counts bytes in the array (4). A string
without its terminator makes every string function read on past the end, looking for one.`,
    mcqs: [
      mcq('`int a[5]; a[5] = 10;` compiles. What does it do?',
        [['Writes past the end, into memory that belongs to something else', true],
          ['Grows the array to six elements so that the value fits', false],
          ['Stores 10 in the last element, a[4], automatically', false],
          ['Is ignored at run time, since the index is out of range', false]],
        'Valid indices are 0 to 4. C does not check, so the write lands in whatever memory follows the array.'),
      mcq('`int a[5] = {1, 2};` leaves a[3] as:',
        [['0', true], ['2', false], ['An unpredictable leftover value', false], ['1', false]],
        'When an initialiser list is given, every element it does not mention is set to zero.'),
      mcq('`char s[] = "cat";` — how many bytes does s occupy?',
        [['4', true], ['3', false], ['1', false], ['8', false]],
        'Three characters plus the terminating null character that marks where the string ends.'),
      mcq('Why can you not write `b = a;` to copy one array into another?',
        [['Arrays are not assignable, so elements must be copied one by one', true],
          ['The = operator only works when both arrays are already sorted', false],
          ['b would become a second name for exactly the same array', false],
          ['Copying arrays requires both arrays to be declared global', false]],
        'The compiler rejects the assignment. A loop or memcpy copies the contents.'),
    ],
    checkpoint: [
      mcq('`sizeof(a) / sizeof(a[0])` gives the element count:',
        [['Only where a was declared, not inside a function it was passed to', true],
          ['Anywhere in the program, since arrays remember their own size', false],
          ['Only for arrays of int, and never for arrays of char', false],
          ['Only after the array has been completely filled with values', false]],
        'Passed to a function, the array becomes an address, and sizeof then measures the address instead.', B),
      mcq('An out-of-bounds write can change a different variable\'s value because:',
        [['C never checks indices, and neighbouring memory holds other data', true],
          ['The compiler moves variables around whenever an array grows', false],
          ['Arrays and variables share one name table in a C program', false],
          ['The operating system copies the array into that variable', false]],
        'The index is just an offset from the start of the array. Past the end, the offset lands on whatever is stored there.', B),
      mcq('How does a C string mark where it ends?',
        [['With a null character, written \'\\0\'', true],
          ['With its length stored in the first byte', false],
          ['At the end of the array it is stored in', false],
          ['With a newline character after the last letter', false]],
        'The array itself has no length information, so string functions read until they find the null.', B),
    ],
  },
  {
    unitCode: 'T_C_BASICS_POINTERS',
    notes: `A pointer is a variable whose value is a memory address. That is the whole idea, and
everything else follows from it.

    int x = 5;
    int *p = &x;    // p holds the address of x

- \`&x\` means "the address of x".
- \`int *p\` declares p as "a pointer to an int".
- \`*p\` means "the int stored at the address in p".

    *p = 9;         // x is now 9

Writing through \`*p\` changes \`x\`, because \`p\` points at \`x\`'s memory.

**Why pointers exist.** Three reasons, and each is something you cannot do without them in C:

1. **Changing a caller's variable.** Arguments are copied, so a function given \`x\` cannot
   change \`x\`. A function given \`&x\` can.
2. **Sharing without copying.** Passing the address of a large structure costs a few bytes;
   passing the structure copies all of it.
3. **Memory that outlives a function**, allocated while the program runs — which is how lists,
   trees and every other growing structure are built.

**The swap that works:**

    void swap(int *a, int *b) {
        int tmp = *a;
        *a = *b;
        *b = tmp;
    }

    swap(&x, &y);

The version taking \`int a, int b\` swaps two copies and leaves \`x\` and \`y\` untouched.

**Pointers and arrays.** An array's name, used in an expression, is the address of its first
element. So \`int *p = marks;\` points at \`marks[0]\`, and \`*(p + 2)\` is \`marks[2]\`. Adding 1 to
a pointer moves it one ELEMENT, not one byte.

**Three ways pointers go wrong:**

- **Uninitialised pointer.** \`int *p; *p = 3;\` writes to a random address.
- **NULL.** \`NULL\` means "points at nothing". Dereferencing it usually crashes. Check before use.
- **Dangling pointer.** Returning the address of a local variable: the variable is gone once the
  function returns, and the address now points at memory that will be reused.`,
    mcqs: [
      mcq('`int x = 5; int *p = &x; *p = 9;` — what is x now?',
        [['9', true], ['5', false], ['The address that is stored in p', false], ['0', false]],
        'p holds x\'s address, so writing through *p writes into x\'s memory.'),
      mcq('In `int *p = &x;`, what does p hold?',
        [['The memory address where x is stored', true],
          ['A copy of the value that x currently holds', false],
          ['The name of the variable x, stored as text', false],
          ['The number of bytes that x occupies', false]],
        'A pointer\'s value is an address. The * in the declaration says what type lives at that address.'),
      mcq('Why does `swap(int *a, int *b)` work where `swap(int a, int b)` does not?',
        [['It receives addresses, so it can change the caller\'s variables', true],
          ['Pointer parameters are faster, so the swap has time to finish', false],
          ['Functions with int parameters cannot use a temporary variable', false],
          ['The asterisk makes the parameters global for the duration of the call', false]],
        'With plain ints the function swaps two copies. With addresses it swaps the caller\'s actual values.'),
      mcq('Dereferencing a NULL pointer:',
        [['Usually crashes, because address zero is not usable memory', true],
          ['Returns zero, which is exactly why NULL is used as a default', false],
          ['Is caught by the compiler before the program ever runs', false],
          ['Creates a new variable at that address automatically', false]],
        'NULL is a deliberate "nothing". Checking a pointer against NULL before using it is basic C hygiene.'),
    ],
    checkpoint: [
      mcq('`int a[3] = {4, 5, 6}; int *p = a;` What is `*(p + 2)`?',
        [['6', true], ['5', false], ['4', false], ['The address of a[2]', false]],
        'p points at a[0]. Adding 2 moves two elements along, and * reads the value stored there.', B),
      mcq('A function returns the address of one of its own local variables. What goes wrong?',
        [['The variable no longer exists once the function has returned', true],
          ['The address is copied, so the caller sees a different value', false],
          ['The compiler refuses to return any address from a function', false],
          ['Nothing, since local variables live until the program ends', false]],
        'Locals disappear when the function returns. The pointer is left dangling at memory that will be reused.', B),
      mcq('The main reason pointers exist in C is:',
        [['Letting code share and change data without copying it', true],
          ['Making every C program run faster than it would without them', false],
          ['Replacing arrays, which are older and far less capable', false],
          ['Allowing variables to be named with symbols instead of words', false]],
        'Changing a caller\'s data, avoiding copies, and building structures that grow all depend on holding an address.', B),
    ],
  },
  {
    unitCode: 'T_C_BASICS_DEBUGGING',
    notes: `A C bug rarely announces itself. Python stops with a clear message; C keeps running with
corrupted memory until something unrelated falls over. The skill is narrowing down where it
actually went wrong.

**The failures, and what each looks like:**

- **Segmentation fault.** The program touched memory it may not use: a NULL or uninitialised
  pointer, an index far past the end of an array, or recursion so deep the stack ran out.
- **Different results on each run with the same input.** Almost always a variable used before it
  was given a value.
- **A wrong answer, no crash.** An index one past the end quietly overwriting a neighbouring
  variable, integer division dropping a fraction, or a \`switch\` missing a \`break\`.
- **A crash long after the real mistake.** Memory was corrupted early and only used later.

**The method.**

1. **Compile with \`-Wall -g\`.** \`-Wall\` catches many of these at compile time. \`-g\` keeps the
   information a debugger needs.
2. **Find the smallest input that reliably reproduces it.** A bug you can trigger every time is
   half solved.
3. **Get a backtrace.** Run under \`gdb\`, let it crash, then type \`bt\`:

        $ gdb ./program
        (gdb) run
        Program received signal SIGSEGV
        (gdb) bt
        #0  total (values=0x0, n=5) at stats.c:12
        #1  main () at stats.c:30

   This says the crash was inside \`total\`, called from line 30 of \`main\`, and that \`values\`
   was NULL. \`print n\` shows a variable's value at the moment of the crash.

4. **Let a sanitiser watch the memory.** Compiling with \`-fsanitize=address\` makes the program
   stop at the exact moment an out-of-bounds read or write happens, instead of whenever the damage
   is finally noticed.

**Why your debug printf never appeared.** Output to the terminal is buffered, and a crash can
destroy the buffer before it is written. Print debug messages to \`stderr\` with
\`fprintf(stderr, ...)\`, which is not buffered, or call \`fflush(stdout)\` after each one.`,
    mcqs: [
      mcq('A program prints different results on each run with the same input. The first suspect is:',
        [['A variable used before it was given a value', true],
          ['The compiler producing different machine code each time', false],
          ['The processor running the statements in a random order', false],
          ['printf buffering its output differently on some runs', false]],
        'An uninitialised variable holds whatever the memory contained, and that changes between runs.'),
      mcq('After a segfault, `bt` in gdb tells you:',
        [['Which chain of function calls was active when it crashed', true],
          ['The exact line where the bug was originally introduced', false],
          ['How much memory the program had used before it failed', false],
          ['Which variable was declared with the wrong type', false]],
        'The backtrace shows where the crash happened and how the program got there, which is where the search starts.'),
      mcq('Your debug `printf` never appears, although the crash happens after it. Why?',
        [['Output was buffered and lost when the program crashed', true],
          ['printf is disabled automatically in programs that crash', false],
          ['The crash happened before main had even started running', false],
          ['Debug output only appears when compiled with -Wall', false]],
        'stdout is buffered. fprintf(stderr, ...) or fflush(stdout) makes the message appear immediately.'),
      mcq('Compiling with `-fsanitize=address` helps because:',
        [['It reports an out-of-bounds access at the moment it happens', true],
          ['It removes out-of-bounds accesses from the program for you', false],
          ['It makes the program allocate twice the memory to be safe', false],
          ['It proves at compile time that no index is ever out of range', false]],
        'Without it the damage is only noticed later, somewhere unrelated. With it the program stops at the bad access itself.'),
    ],
    checkpoint: [
      mcq('`int *p; *p = 3;` crashes. The cause is:',
        [['p was never pointed at valid memory before being used', true],
          ['3 is too large to be stored through an int pointer', false],
          ['The asterisk should come after p in the assignment', false],
          ['Pointers can only store values when declared const', false]],
        'An uninitialised pointer holds a garbage address, and writing through it touches memory the program does not own.', B),
      mcq('A recursive function with no base case typically ends with:',
        [['A crash when the stack runs out of space', true],
          ['An infinite loop that never uses any extra memory', false],
          ['A compile error, since recursion must always be bounded', false],
          ['The function returning zero after a time limit', false]],
        'Every call uses stack space. Without a base case the calls never stop and the stack overflows.', B),
      mcq('The first step when a crash only happens on some inputs is:',
        [['Find the smallest input that reliably reproduces it', true],
          ['Rewrite the function that is most likely responsible', false],
          ['Add printf calls to every function in the program', false],
          ['Recompile with optimisation turned up to its highest level', false]],
        'A bug you can trigger on demand can be narrowed down. One that appears occasionally can only be guessed at.', B),
    ],
  },
  {
    unitCode: 'T_C_BASICS_PRACTICE',
    notes: `No new ideas. Everything here uses types, input and output, conditions, loops, functions,
arrays and pointers — the C a first-year exam expects — and nothing beyond it.

**The method, for every problem:**

1. **Read the question twice** and write down the inputs and the output you must produce.
2. **Write the declarations first**, choosing each type deliberately: does this value need a
   fraction? Could it be negative? How large can it get?
3. **Trace a small case on paper** before writing the loop.
4. **Compile with \`-Wall\`** and treat every warning as an error until you understand it.
5. **Test the boundaries**: zero items, one item, the largest size, a negative number.

**The checklist that catches most marks lost in C:**

- Every \`scanf\` argument has its \`&\` (except arrays and strings).
- \`%lf\` for reading a double, \`%f\` for printing one.
- Loops over an array of \`n\` elements use \`i < n\`, never \`i <= n\`.
- Division that needs a fraction has a \`(double)\` cast on one operand.
- Conditions use \`==\`, not \`=\`.
- Every \`case\` in a \`switch\` ends with \`break\` unless fall-through is intended and commented.
- Every function called before its definition has a prototype.
- Every string has room for its \`'\\0'\`.

**Trace before you compile.** Predict the output of your program for one input, then run it.
When the two agree you have evidence; when they disagree you have found the thing to learn.`,
    mcqs: [
      mcq('Which loop header visits every element of `int a[n]` exactly once?',
        [['`for (i = 0; i < n; i++)`', true],
          ['`for (i = 1; i <= n; i++)`', false],
          ['`for (i = 0; i <= n; i++)`', false],
          ['`for (i = n; i > 0; i++)`', false]],
        'Indices run from 0 to n − 1. Starting at 1 skips the first element; <= n reads one past the end.'),
      mcq('`int total = 0; for (i = 1; i <= 4; i++) total += i;` What is total?',
        [['10', true], ['4', false], ['9', false], ['15', false]],
        'The loop adds 1, 2, 3 and 4. Tracing the accumulator by hand is faster than guessing.'),
      mcq('To average `int sum` over `int n` items as a decimal, write:',
        [['`(double) sum / n`', true], ['`(double) (sum / n)`', false], ['`sum / n * 1.0`', false], ['`double(sum / n)`', false]],
        'The cast must happen before the division. The other forms divide two ints first, losing the fraction.'),
      mcq('Which call reads two integers correctly?',
        [['`scanf("%d %d", &a, &b)`', true],
          ['`scanf("%d %d", a, b)`', false],
          ['`scanf("%d, %d", &a)`', false],
          ['`scanf("%2d", &a, &b)`', false]],
        'Two specifiers, two addresses. Missing & or a missing argument both write to the wrong place.'),
      mcq('A function must return the larger of two ints. Which prototype fits?',
        [['`int larger(int a, int b);`', true],
          ['`void larger(int a, int b);`', false],
          ['`int larger(a, b);`', false],
          ['`larger(int, int) int;`', false]],
        'The return type comes first and every parameter needs a type. void would mean nothing is returned.'),
    ],
    checkpoint: [
      mcq('`for (i = 0; i < 10; i += 3)` runs its body how many times?',
        [['4', true], ['3', false], ['10', false], ['5', false]],
        'i takes the values 0, 3, 6 and 9. At 12 the condition fails.', F),
      mcq('Before submitting a C solution, which check catches the most common silent bug?',
        [['Test the boundary inputs, such as zero, one and the largest size', true],
          ['Remove every comment so the compiler has less text to read', false],
          ['Rename the variables so each one is a single letter long', false],
          ['Compile without warnings so the output is easier to read', false]],
        'Off-by-one and empty-input bugs are invisible on typical inputs and obvious on the boundaries.', B),
      mcq('`printf("%d", 10 / 4);` prints:',
        [['2', true], ['2.5', false], ['3', false], ['2.50', false]],
        'Both operands are ints, so the division is integer division and the remainder is discarded.', B),
    ],
  },
  {
    unitCode: 'T_C_BASICS_MINI_PROJECT',
    notes: `Build one small C program end to end: specified, compiled, broken, fixed and explained.
The program is modest on purpose. What is assessed is whether you handled the things C makes your
responsibility — input that is not what you expected, array bounds, and the warnings the compiler
gave you — rather than how many features you added.

**Why this is a project and not another exercise.** Every earlier unit handed you one idea at a
time. A real program uses all of them at once, and the bugs live where they meet: a \`scanf\` that
fails and leaves a counter holding garbage, which is then used as an array index. You only learn to
see those by writing something large enough to contain them.

**How to work:**

1. **Write the specification first** — inputs, outputs, and what happens on bad input — before any
   code.
2. **Build it in thin working slices.** Read the input and print it back. Then store it. Then
   calculate. Compile and run after every slice, so a new error can only be in the lines you just
   wrote.
3. **Compile with \`gcc -Wall -Wextra\` from the very first slice**, and keep the build free of
   warnings. Record each warning you met and what it meant.
4. **Attack your own program.** Type letters where numbers belong. Enter more items than the array
   holds. Enter none at all. Fix what breaks.
5. **Keep a log** of every bug: what you saw, what the cause was, and how you found it. The log is
   worth as much as the program.

**What good looks like.** A program that refuses bad input with a clear message instead of
calculating nonsense, that cannot write past the end of its arrays whatever it is given, that splits
its work into functions with prototypes, and a written account that shows you understood why each
fix was needed.

The brief, requirements and rubric are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — A C Program End to End',
      description: 'Write a marks-summary program in C that validates its input, stores it safely in a fixed-size array, reports statistics, and survives deliberately bad input. Submit the code, a bug log and a short explanation.',
      instructions: `**The program**

Write \`marks.c\`, a command-line program that summarises a class's marks.

1. It first reads how many students there are, \`n\`. The program supports at most 50 students.
2. It then reads \`n\` marks, each a whole number from 0 to 100.
3. It prints the number of students, the average to two decimal places, the highest mark, the
   lowest mark, and how many students scored 40 or above.

**Requirements**

- **Input validation.** If \`n\` is not a number, is less than 1, or is greater than 50, print a
  clear message and exit with a non-zero status. If a mark is not a number or is outside 0-100,
  print a message naming the problem and ask for that mark again. Check the return value of every
  \`scanf\`.
- **Safe storage.** Store the marks in an \`int\` array of size 50. No input, however long or
  malformed, may cause a read or write outside that array.
- **Functions.** Use at least three functions besides \`main\` — for example, reading one valid
  mark, computing the average, and finding the maximum and minimum. Declare them with prototypes
  above \`main\`. At least one function must take the array together with its length.
- **Correct arithmetic.** The average must keep its fraction: 7 marks totalling 500 averages 71.43,
  not 71.00.
- **A clean build.** \`gcc -Wall -Wextra marks.c -o marks\` must produce no warnings.

**Testing you must do and record**

Run the program on at least these inputs and record the output of each: a normal class of five; a
class of one; \`n\` of 0; \`n\` of 51; a letter typed instead of a mark; a mark of 101; and a mark of
-1.

**What to submit**

1. \`marks.c\`.
2. A **test record**: each input above with the program's actual output.
3. A **bug log** of at least three real bugs or warnings you met while building it — what you saw,
   what caused it, and how you found the cause.
4. A **short explanation** (200-300 words): why \`scanf\` needs \`&\`, how your program guarantees
   it never writes past the end of the array, and why the average needed a cast.`,
      rubric: [
        { criterion: 'Correct results', description: 'Count, average to two places, highest, lowest and pass count are all correct on normal input, including a class of one.', maxPoints: 20 },
        { criterion: 'Input validation', description: 'Every scanf return value is checked; invalid counts exit with a message and non-zero status; invalid marks are rejected and asked for again.', maxPoints: 25 },
        { criterion: 'Memory safety', description: 'No input can cause access outside the array; the array is passed to functions with its length.', maxPoints: 20 },
        { criterion: 'Structure and build', description: 'At least three functions with prototypes; the average keeps its fraction; the build produces no warnings under -Wall -Wextra.', maxPoints: 15 },
        { criterion: 'Testing, bug log and explanation', description: 'All required tests recorded with real output; at least three genuine bugs explained; the explanation is accurate about &, bounds and the cast.', maxPoints: 20 },
      ],
      totalPoints: 100,
    },
  },
];
