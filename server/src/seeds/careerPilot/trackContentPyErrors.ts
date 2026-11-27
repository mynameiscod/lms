/**
 * Career-track content: exceptions and files in Python (JT_PY_ERRORS), for the Python tracks.
 *
 * The Python tracks teach the language from the first program, the way Core Java and Core C# do.
 * Students arrive knowing types, conditions, loops, lists, strings, dicts and sets, and functions;
 * this topic is what happens when things go wrong — exceptions, the traceback, try/except/else/
 * finally, raising your own — and the file work that goes wrong most often: text files, CSV and
 * JSON, and logging instead of print. Writing your own context managers, type hints in depth and
 * dataclasses belong to the later Modern Python topic; here with open(...) is simply used.
 *
 * Python is examined the way it is written: a short snippet and "what does this print, or what
 * does it raise?". Every quoted output was run; the graded exercise is plain Python 3.10 (the
 * runner) and reads standard input only, because the grader has no file system — the "file" is
 * simulated by the input lines.
 *
 * Attribution: the topic is single-skill (PYTHON_ERROR_HANDLING), so every checkpoint question
 * names that skill. Practice mcqs name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const S = 'PYTHON_ERROR_HANDLING';

export const TRACK_PY_ERRORS_BUNDLES: PilotBundle[] = [
  /* ══ JT_PY_ERRORS — Exceptions and Files ═══════════════════════════════════════════════ */
  {
    unitCode: 'JT_PY_ERRORS_EXCEPTIONS',
    notes: `An **exception** is Python's way of saying "this line cannot do what you asked". When it
happens, Python stops running the current line, creates an exception **object** that describes
the problem, and starts unwinding: out of the current function, into the one that called it, and
so on. If nothing catches it on the way, the program ends and prints a **traceback**.

    prices = {"pen": 20, "ink": 45}
    print("Looking up")
    print(prices["pencil"])
    print("Never printed")

prints \`Looking up\`, then stops:

    Traceback (most recent call last):
      File "C:\\work\\shop.py", line 3, in <module>
        print(prices["pencil"])
    KeyError: 'pencil'

Nothing after line 3 runs. An exception is not a crash of Python itself — it is a normal,
catchable event, and the next unit is about catching it.

## Reading a traceback with functions in it

    def average(marks):
        return sum(marks) / len(marks)

    def report(student):
        return f"{student['name']}: {average(student['marks'])}"

    print(report({"name": "Ravi", "marks": []}))

    Traceback (most recent call last):
      File "C:\\work\\report.py", line 7, in <module>
        print(report({"name": "Ravi", "marks": []}))
      File "C:\\work\\report.py", line 5, in report
        return f"{student['name']}: {average(student['marks'])}"
      File "C:\\work\\report.py", line 2, in average
        return sum(marks) / len(marks)
    ZeroDivisionError: division by zero

"Most recent call last" is the rule: the **bottom** is where it happened.

1. **Last line** — the exception type and its message. Read this first.
2. **The frame just above it** — the file, line number and function where it was raised
   (\`average\`, line 2), with the source line.
3. **Frames further up** — who called that function, back to \`<module>\`, the top level of the
   script. Use them to ask *why* bad data reached line 2: \`report\` passed an empty list.

The fix is rarely on the last line. \`average\` is correct for any non-empty list; the question
is whether an empty list should ever reach it.

Python 3.11 and newer also draw \`^^^^\` markers under the exact part of the line that failed.
Older versions show only the line; the reading order is the same.

## The hierarchy

Every exception is an instance of a class, and the classes form a tree. Catching a class also
catches all of its subclasses, so the tree decides what an \`except\` matches.

    BaseException
     ├── SystemExit            raised by sys.exit()
     ├── KeyboardInterrupt     the user pressed Ctrl+C
     └── Exception             everything a program normally handles
          ├── ArithmeticError
          │    └── ZeroDivisionError
          ├── LookupError
          │    ├── IndexError
          │    └── KeyError
          ├── ValueError
          │    └── UnicodeDecodeError (via UnicodeError)
          ├── TypeError
          ├── AttributeError
          ├── NameError
          ├── OSError
          │    ├── FileNotFoundError
          │    ├── FileExistsError
          │    ├── PermissionError
          │    └── IsADirectoryError
          ├── ImportError
          │    └── ModuleNotFoundError
          ├── RuntimeError
          └── StopIteration

\`SystemExit\` and \`KeyboardInterrupt\` sit **beside** \`Exception\`, not under it, on purpose:
code that catches \`Exception\` should still let the user stop the program.

## The exceptions you will meet every week

    int("12.5")              ValueError: invalid literal for int() with base 10: '12.5'
    "Total: " + 40           TypeError: can only concatenate str (not "int") to str
    [10, 20][2]              IndexError: list index out of range
    {"a": 1}["b"]            KeyError: 'b'
    None.strip()             AttributeError: 'NoneType' object has no attribute 'strip'
    print(totl)              NameError: name 'totl' is not defined
    7 / 0                    ZeroDivisionError: division by zero
    open("missing.txt")      FileNotFoundError: [Errno 2] No such file or directory: 'missing.txt'
    import requets           ModuleNotFoundError: No module named 'requets'

A few distinctions interviewers like:

- **ValueError vs TypeError.** TypeError: the *type* is wrong for the operation (\`"a" + 1\`).
  ValueError: the type is right but the *value* is not (\`int("abc")\` — a string, but not one
  that spells a number).
- **AttributeError on NoneType** almost always means a function returned \`None\` where you
  expected a value — often a function that forgot its \`return\`, or a method like
  \`list.sort()\` that changes the list and returns \`None\`.
- **KeyError vs IndexError.** Both are \`LookupError\`s: a missing dictionary key, or a sequence
  position past the end.
- A **SyntaxError** is not raised while the program runs: it is found while Python compiles the
  file, so no line of it runs at all.

## Exceptions are objects

    try:
        int("4o")
    except ValueError as e:
        print(type(e).__name__)   # ValueError
        print(e)                  # invalid literal for int() with base 10: '4o'
        print(e.args)             # ("invalid literal for int() with base 10: '4o'",)

\`str(e)\` is the message; \`type(e).__name__\` is the class name; \`e.args\` holds whatever was
passed when it was created.

## Common mistakes

- Reading the top of a traceback first. The top is the outermost call; the cause is at the bottom.
- Assuming the line in the last frame is where the bug is. It is where the bad value was noticed.
- Thinking an exception is the same as an error message. It is an object that travels up the
  calls until someone catches it — which is what makes handling possible.`,
    workedExample: `**Problem.** A script that prints a stock report stops with:

    Traceback (most recent call last):
      File "C:\\work\\stock.py", line 12, in <module>
        main()
      File "C:\\work\\stock.py", line 9, in main
        print(format_row(item))
      File "C:\\work\\stock.py", line 4, in format_row
        return item["name"].upper() + " " + str(item["qty"])
    AttributeError: 'NoneType' object has no attribute 'upper'

Find the cause.

1. **Last line.** \`AttributeError\` on \`NoneType\`: something was \`None\` and \`.upper()\` was
   called on it.
2. **Last frame.** \`format_row\`, line 4. The only \`.upper()\` is on \`item["name"]\`, so
   \`item["name"]\` is \`None\`. It is not a KeyError, so the key exists — its value is \`None\`.
3. **Next frame up.** \`main\`, line 9, passed \`item\`. Look at where \`main\` builds its items:

        items = [{"name": "pen", "qty": 4}, {"name": None, "qty": 0}]

   One record has no name. That is the real defect: the data, not \`format_row\`.
4. **Decide the fix.** Either the data must never contain a nameless item (fix where it is
   created), or \`format_row\` must handle it (\`(item["name"] or "UNNAMED").upper()\`). Choose
   by asking which is true of the real data.

The reasoning: type and message first, then the last frame for *where*, then the frames above
for *why*. The exception names the symptom; the frames lead you to the cause.`,
    mcqs: [
      mcq('Which exception does the expression {"a": 1}["b"] raise?',
        [['IndexError', false], ['KeyError', true], ['ValueError', false], ['NameError', false]],
        'Subscripting a dict with a key it does not hold raises KeyError, with the missing key as its message. IndexError is for sequence positions; NameError is for an undefined variable name.'),
      mcq('A traceback has four "File ..." frames. Which one shows the line where the exception was actually raised?',
        [['The first frame, right under the Traceback header', false], ['The frame that mentions <module>, wherever it is', false], ['The last frame, directly above the error line', true], ['The frame with the highest line number in it', false]],
        '"Most recent call last" means frames are listed from the outermost call down to the innermost. The innermost call, where the exception was raised, is the frame just above the type and message.'),
      mcq('int("12.5") stops the program. Which exception is it, and why that one?',
        [['TypeError, because a str is not an int', false], ['ValueError: right type, wrong value', true], ['ArithmeticError, since 12.5 has a fraction', false], ['SyntaxError, as "12.5" is not a valid literal', false]],
        'int() accepts strings, so the type is fine; this particular string does not spell a whole number, which is a ValueError. A TypeError would mean an argument of the wrong type, like int([1]).'),
    ],
    checkpoint: [
      ck(S, 'What does print(issubclass(KeyError, LookupError), issubclass(KeyboardInterrupt, Exception)) print?',
        [['True True', false], ['False False', false], ['False True', false], ['True False', true]],
        'KeyError (like IndexError) is a LookupError. KeyboardInterrupt derives from BaseException directly, not from Exception, so that except Exception still lets Ctrl+C stop a program.'),
      ck(S, 'result = [3, 1, 2].sort() is followed by result.append(4). Which exception is raised, and why?',
        [['AttributeError, since sort() returned None', true], ['TypeError, since a sorted list is now frozen', false], ['IndexError, since append goes past the end', false], ['No exception; result is [1, 2, 3, 4]', false]],
        'list.sort() sorts in place and returns None, so result is None, and None has no append attribute. sorted([3, 1, 2]) would have returned a new list.'),
      ck(S, 'A script\'s first line is print("start") and line 9 has a missing closing bracket. What happens when it is run?',
        [['start is printed, then a SyntaxError for line 9', false], ['A SyntaxError is shown and nothing is printed', true], ['start is printed and line 9 is skipped quietly', false], ['A NameError is raised as line 9 is reached', false]],
        'Python compiles the whole file before running any of it, and a syntax error stops the compile. No statement runs, not even the print on line 1.'),
    ],
  },
  {
    unitCode: 'JT_PY_ERRORS_TRY_EXCEPT',
    notes: `Catching an exception means saying: "if this specific thing goes wrong here, I know what to
do instead." The tools are \`try\`, \`except\`, \`else\` and \`finally\`.

## try and except

    text = input("Quantity: ")
    try:
        qty = int(text)
    except ValueError:
        print(f"{text!r} is not a whole number")
        qty = 0
    print("Using", qty)

If \`int(text)\` raises \`ValueError\`, Python jumps to the matching \`except\`, runs it, and carries
on **after** the whole statement. If nothing is raised, the \`except\` is skipped.

## Several excepts, and the order they are checked

    try:
        share = total / int(people)
    except ValueError:
        print("people must be a number")
    except ZeroDivisionError:
        print("people cannot be zero")

The \`except\` clauses are tried **top to bottom** and the **first match wins**. Because catching
a class also catches its subclasses, put the specific one first:

    try:
        value = settings[key]
    except KeyError:             # specific first
        value = default
    except LookupError:          # anything else that is a lookup failure
        ...

The reverse order is not an error in Python — the \`KeyError\` clause is simply never reached.
That is worse than an error, because nothing tells you.

One clause can catch several types with a **tuple**:

    except (ValueError, TypeError) as e:
        print("bad input:", e)

\`as e\` binds the exception object. The name is deleted when the \`except\` block ends, so use
it inside the block; after it, \`e\` no longer exists.

## else: the success path

    try:
        qty = int(text)
    except ValueError:
        print("not a number")
    else:
        print("ordering", qty)       # only when the try raised nothing

\`else\` runs only if the \`try\` finished without an exception. Why not put the line inside the
\`try\`? Because then a bug in it — say a \`ValueError\` from somewhere else — would be caught by
an \`except\` that was written for \`int(text)\` and reported with the wrong message. Keep the
\`try\` to the lines that can raise the exception you are handling; put what follows in \`else\`.
An exception raised **inside** \`else\` is not caught by that statement's \`except\` clauses.

## finally: cleanup that always happens

    print("connecting")
    try:
        send_report()
    finally:
        print("disconnecting")       # runs whether send_report worked, raised or returned

\`finally\` runs on every way out: normal completion, an exception (caught or not), \`return\`,
\`break\` or \`continue\`. If the exception was not caught, it continues upward **after**
\`finally\` has run. Use it to release something — close a connection, delete a temporary file.
For files, \`with\` (unit 4) does this for you.

The full shape, in the order Python requires:

    try:
        ...
    except SomeError:
        ...
    else:
        ...
    finally:
        ...

## Never a bare except

    try:
        process(order)
    except:                 # catches EVERYTHING
        pass

A bare \`except:\` catches \`BaseException\`: \`KeyboardInterrupt\` (Ctrl+C no longer stops the
program), \`SystemExit\` (\`sys.exit()\` stops working), and every bug — a typo's \`NameError\`, a
wrong \`TypeError\`. With \`pass\`, all of it vanishes without a trace.

- Catch the **specific** exception you expect and know how to handle.
- If you genuinely need a catch-all (the top of a web request handler, a worker loop), use
  \`except Exception as e:\` and **log it** — never silently pass.

## Handling means deciding

Every \`except\` should do one of these, deliberately:

1. **Recover** — use a default, ask again, skip the record and count it.
2. **Report and stop** — tell the user what was wrong and exit cleanly.
3. **Translate** — raise a clearer exception for the caller (next unit).

"Print something and carry on as if nothing happened" is usually none of these.

## Traps

- A \`return\` inside \`finally\` replaces the try's return value **and silently discards an
  exception** that was on its way out. Never return from \`finally\`.
- \`except ValueError, TypeError:\` is a \`SyntaxError\` in Python 3 — the tuple needs brackets.
- A very wide \`try\` (thirty lines) catches exceptions from lines you never meant to protect.`,
    workedExample: `**Problem.** Read a line like \`3 of 12\` (done, total) and print the percentage done.
Report a non-number and a total of zero with different messages, and always print \`---\` at the
end.

    line = input()
    try:
        done_text, _, total_text = line.split()
        done = int(done_text)
        total = int(total_text)
    except ValueError:
        print("Expected: <done> of <total>, as whole numbers")
    else:
        try:
            print(f"{done / total:.0%} done")
        except ZeroDivisionError:
            print("Total cannot be zero")
    finally:
        print("---")

Trace three inputs:

- \`3 of 12\` — the try succeeds, \`else\` prints \`25% done\`, \`finally\` prints \`---\`.
- \`three of 12\` — \`int("three")\` raises \`ValueError\`; the except prints the format message;
  \`else\` is skipped; \`finally\` prints \`---\`.
- \`3 of 0\` — the try succeeds, so \`else\` runs; the division raises \`ZeroDivisionError\`, which
  the **inner** try catches. Then \`---\`.

Two points of design. The unpacking \`a, _, b = line.split()\` raises \`ValueError\` too when the
line has the wrong number of words, so one \`except\` covers "wrong shape" and "not a number".
And the division sits in \`else\`, with its own handler, because a zero total is a different
problem with a different message — mixing it into the first \`try\` would need a second except
there and hide which line failed.`,
    mcqs: [
      mcq(`What does this print?

    try:
        n = int("7")
    except ValueError:
        print("bad")
    else:
        print("ok", n)
    finally:
        print("done")`,
        [['ok 7, then done', true], ['bad, then done', false], ['ok 7 only', false], ['done, then ok 7', false]],
        'int("7") succeeds, so except is skipped and else runs, printing "ok 7". finally runs last on every path, so "done" follows.'),
      mcq(`What does this print?

    try:
        {}["k"]
    except LookupError:
        print("lookup")
    except KeyError:
        print("key")`,
        [['key', false], ['lookup', true], ['lookup, then key', false], ['A SyntaxError for the order', false]],
        'Except clauses are checked top to bottom and the first match wins. KeyError is a LookupError, so the first clause catches it and the KeyError clause is never reached. Python does not flag the order.'),
      mcq('Why is a bare except: worse than except Exception:?',
        [['It is slower, as Python checks every class', false], ['It cannot bind the exception with as e', false], ['It also traps KeyboardInterrupt and SystemExit', true], ['It only works when the try has one statement', false]],
        'A bare except catches BaseException, so Ctrl+C and sys.exit() are swallowed along with every bug. except Exception leaves those two to do their job.'),
    ],
    checkpoint: [
      ck(S, `What does this print?

    def fetch():
        try:
            return "try"
        finally:
            print("cleanup", end=" ")

    print(fetch())`,
        [['try cleanup', false], ['cleanup', false], ['cleanup try', true], ['try', false]],
        'return "try" evaluates its value, then finally runs before the function actually returns, printing "cleanup ". Only then does the outer print receive and print "try".'),
      ck(S, `What happens here?

    try:
        n = int("4")
    except ValueError:
        print("caught")
    else:
        print(10 // (n - 4))`,
        [['caught is printed', false], ['ZeroDivisionError escapes uncaught', true], ['0 is printed', false], ['caught, then 0, are printed', false]],
        'The try succeeds, so else runs, and 10 // 0 raises ZeroDivisionError there. An exception raised in else is not handled by that statement\'s except clauses — and it is not a ValueError anyway.'),
      ck(S, `What does this print?

    def risky():
        try:
            raise KeyError("id")
        finally:
            return "quiet"

    print(risky())`,
        [['quiet', true], ["KeyError: 'id'", false], ['None', false], ['quiet, then the KeyError', false]],
        'A return in finally replaces whatever was leaving the function, including an exception. The KeyError is discarded without a trace, which is exactly why returning from finally is a bug.'),
    ],
  },
  {
    unitCode: 'JT_PY_ERRORS_RAISING',
    notes: `Catching is half the story. Your own functions should **raise** when they are asked to do
something impossible, so the caller finds out at once instead of three functions later.

## raise

    def set_discount(percent):
        if not 0 <= percent <= 100:
            raise ValueError(f"discount must be 0-100, got {percent}")
        return percent / 100

    set_discount(120)
    # ValueError: discount must be 0-100, got 120

\`raise\` takes an exception **instance** (or a class, which Python instantiates with no
message). Pick the built-in type that describes the problem:

- \`ValueError\` — right type, unacceptable value (a negative quantity, an empty name).
- \`TypeError\` — the wrong kind of object altogether.
- \`KeyError\` / \`LookupError\` — the thing asked for does not exist.
- \`RuntimeError\` — the program is in a state where this cannot be done.

Always write a message that says what was wrong **and** what the value was. \`raise ValueError()\`
with no message makes the next person reopen the code.

## Re-raising

Sometimes you want to note a failure and still let it continue upward. A bare \`raise\` inside an
\`except\` re-raises the exception being handled, traceback intact:

    try:
        rows = load(path)
    except FileNotFoundError:
        print("load failed for", path)
        raise

## Custom exceptions

When your code has failures of its own — an order that breaks a business rule, a config that is
wrong — give them their own class. It is a normal class that inherits from \`Exception\`:

    class OrderError(Exception):
        """Base class for everything that can go wrong with an order."""

    class OutOfStock(OrderError):
        def __init__(self, sku, wanted, available):
            super().__init__(f"{sku}: wanted {wanted}, only {available} left")
            self.sku = sku
            self.wanted = wanted
            self.available = available

    try:
        raise OutOfStock("PEN-01", 5, 2)
    except OrderError as e:
        print(e)              # PEN-01: wanted 5, only 2 left
        print(e.available)    # 2

The points that matter:

- Inherit from **Exception**, never from \`BaseException\`.
- Name it for the problem, conventionally ending in \`Error\` (\`OutOfStock\` reads fine too).
- Pass the message to \`super().__init__\` so \`str(e)\` and the traceback show it.
- Store the useful values as attributes so a handler can act on them, not parse the message.
- A small **base class** for your module (\`OrderError\`) lets callers catch all of your
  failures with one clause, or a specific one when it matters.

Most custom exceptions need nothing more than \`class PaymentDeclined(OrderError): pass\`.

## Chaining: raise ... from

When you catch a low-level exception and raise a clearer one, keep the original as the cause:

    def read_port(settings):
        try:
            return int(settings["port"])
        except KeyError as e:
            raise ConfigError("settings has no 'port'") from e
        except ValueError as e:
            raise ConfigError(f"port is not a number: {settings['port']!r}") from e

The traceback then shows both, joined by *"The above exception was the direct cause of the
following exception"*, and the original is stored in \`err.__cause__\`.

If you raise inside an \`except\` **without** \`from\`, Python still remembers the first one (in
\`__context__\`) and prints *"During handling of the above exception, another exception
occurred"* — which reads like a second bug. Use \`from e\` when the new exception is a
translation of the old one. \`raise NewError(...) from None\` hides the original entirely; use it
only when it truly adds nothing.

## EAFP and LBYL

Two styles for "this might not work":

    # LBYL — look before you leap
    if "port" in settings and settings["port"].isdigit():
        port = int(settings["port"])
    else:
        port = 8080

    # EAFP — easier to ask forgiveness than permission
    try:
        port = int(settings["port"])
    except (KeyError, ValueError):
        port = 8080

Python generally prefers **EAFP**: the check and the action cannot drift apart, it handles cases
you would forget to test for (\`"²".isdigit()\` is True, but \`int("²")\` raises), and with files it avoids the race where
a file is deleted between \`exists()\` and \`open()\`. LBYL is right when the check is cheap, the
failure is common, and there is no exception that says it precisely.

## When should a function raise?

- **Raise** when the caller broke the contract (bad argument) or the work cannot be done.
- **Return a value** (\`None\`, an empty list) when "nothing found" is a normal, expected result
  — and say so in the docstring. \`dict.get\` returns \`None\`; \`dict[key]\` raises.
- Do not use \`assert\` to validate input: it is removed when Python runs with \`-O\`.`,
    workedExample: `**Problem.** Write \`withdraw(balance, amount)\` for a wallet. It returns the new
balance; an amount that is not positive is a programming error; an amount larger than the
balance is a business failure the caller must handle and show to the user.

    class WalletError(Exception):
        pass

    class InsufficientFunds(WalletError):
        def __init__(self, balance, amount):
            super().__init__(f"cannot withdraw {amount}, balance is {balance}")
            self.shortfall = amount - balance

    def withdraw(balance, amount):
        if amount <= 0:
            raise ValueError(f"amount must be positive, got {amount}")
        if amount > balance:
            raise InsufficientFunds(balance, amount)
        return balance - amount

    for amount in (300, 900, -5):
        try:
            print("new balance", withdraw(500, amount))
        except InsufficientFunds as e:
            print("declined:", e, "| short by", e.shortfall)
        except ValueError as e:
            print("bug in caller:", e)

Output:

    new balance 200
    declined: cannot withdraw 900, balance is 500 | short by 400
    bug in caller: amount must be positive, got -5

Why two kinds: \`ValueError\` says "the code that called me is wrong" — fix the code.
\`InsufficientFunds\` says "this request cannot be granted" — tell the user, with the shortfall
taken from an attribute rather than parsed out of a string. The base class \`WalletError\` lets
a payments screen catch every wallet failure in one clause later.`,
    mcqs: [
      mcq(`What does this print?

    class AppError(Exception): pass
    class StockError(AppError): pass

    try:
        raise StockError("only 2 left")
    except AppError as e:
        print(type(e).__name__, e)`,
        [['AppError only 2 left', false], ['StockError only 2 left', true], ['StockError StockError', false], ['Nothing; StockError escapes', false]],
        'except AppError matches any subclass, so it catches the StockError. type(e) is still the class that was raised, and str(e) is the message passed to it.'),
      mcq(`What does this print?

    try:
        try:
            int("x")
        except ValueError as e:
            raise RuntimeError("config broken") from e
    except RuntimeError as err:
        print(type(err.__cause__).__name__)`,
        [['RuntimeError', false], ['NoneType', false], ['ValueError', true], ['Exception', false]],
        'raise ... from e stores the original exception in __cause__. The handler caught the RuntimeError, and its cause is the ValueError from int("x").'),
      mcq('Which of these is the EAFP way to read a quantity that may be missing from the stock dict?',
        [['if "ink" in stock: qty = stock["ink"], else: qty = 0', false], ['try: qty = stock["ink"], except KeyError: qty = 0', true], ['qty = stock["ink"] if len(stock) > 0 else 0', false], ['assert "ink" in stock, then qty = stock["ink"]', false]],
        'EAFP means doing the operation and handling the exception if it fails. The in check is look-before-you-leap; the len check tests the wrong thing; assert is removed under -O.'),
    ],
    checkpoint: [
      ck(S, `What does this print?

    class LimitError(Exception):
        def __init__(self, limit):
            super().__init__(f"over limit {limit}")
            self.limit = limit

    try:
        raise LimitError(50)
    except LimitError as e:
        print(e.limit, e)`,
        [['50 over limit 50', true], ['50 LimitError(50)', false], ['over limit 50 50', false], ['50 50', false]],
        'e.limit is the attribute set in __init__. Printing e uses str(e), which is the message handed to super().__init__.'),
      ck(S, `What does this print?

    def load():
        try:
            return int("q")
        except ValueError:
            print("logging", end=" ")
            raise

    try:
        load()
    except ValueError:
        print("handled")`,
        [['logging', false], ['handled', false], ['logging handled', true], ['logging, then a traceback', false]],
        'The inner except prints "logging " and the bare raise sends the same ValueError on up. The outer try catches it and prints "handled".'),
      ck(S, 'A function apply_discount(price, percent) is called with percent=-15. What should it do?',
        [['Return price unchanged so the caller carries on', false], ['Print a warning, then apply 15 percent anyway', false], ['Return None, so the caller can check the result', false], ['raise ValueError with a message giving the value', true]],
        'A negative percentage breaks the function\'s contract, so it should fail loudly at the point of the mistake. Returning a value or guessing hides the bug and lets a wrong price travel on.'),
    ],
  },
  {
    unitCode: 'JT_PY_ERRORS_FILES',
    notes: `Most real programs read data from files and write results to them. Files are also where
exceptions you cannot prevent come from: the file is missing, locked, or in a strange encoding.

## open, and why with

    with open("notes.txt", "w", encoding="utf-8") as f:
        f.write("first line\\n")
        f.write("second line\\n")

    with open("notes.txt", encoding="utf-8") as f:
        text = f.read()
    print(text)

\`open\` returns a **file object**. \`with\` guarantees the file is **closed** when the block ends —
normally, by \`return\`, or by an exception — so data is flushed to disk and the operating system
gets its handle back. Without \`with\` you would need \`try\`/\`finally: f.close()\` every time.
After the block, \`f.closed\` is \`True\`; reading from it raises \`ValueError\`.

## Modes

    "r"   read (the default); FileNotFoundError if it does not exist
    "w"   write; creates the file, or EMPTIES an existing one first
    "a"   append; creates the file, or adds to the end
    "x"   create; FileExistsError if it already exists — a safe "w"
    "b"   added to any of these for bytes: "rb", "wb" (images, PDFs, zips)

\`"w"\` is the dangerous one: opening an important file with it destroys the contents at once,
before you write a single character.

## Always pass encoding

A text file is bytes on disk; the **encoding** says how bytes map to characters. If you leave
it out, Python uses the operating system's default — UTF-8 on macOS and Linux, often cp1252 on
Windows. A file written on one and read on the other can raise:

    UnicodeDecodeError: 'charmap' codec can't decode byte 0x81 in position 14 ...

or quietly show \`â‚¹\` instead of \`₹\`. Write \`encoding="utf-8"\` on every text \`open\`; then the
same code behaves the same everywhere.

## Reading

    with open("marks.txt", encoding="utf-8") as f:
        for line in f:                     # one line at a time, newline included
            line = line.rstrip("\\n")       # or .strip() to drop spaces too
            if line:
                print(line)

- Iterating the file reads **one line at a time**, so a 5 GB log uses almost no memory. Prefer
  it to \`f.read()\` (the whole file as one string) and \`f.readlines()\` (a list of every line)
  for anything large.
- Each line **keeps its \`\\n\`**. \`line == "done"\` is never true for \`"done\\n"\` — strip first.
  \`int(" 42\\n")\` happens to work, because \`int\` ignores surrounding whitespace, which hides the
  problem until you compare strings.
- \`f.readline()\` reads one line; it returns \`""\` at the end of the file.

## Writing

\`write\` does **not** add a newline, and takes only strings:

    with open("report.txt", "w", encoding="utf-8") as f:
        f.write(f"Total: {total}\\n")
        print("Generated by report.py", file=f)     # print can write to a file too

## Paths with pathlib

\`pathlib.Path\` treats a path as an object, joins with \`/\`, and uses the right separator on
every operating system:

    from pathlib import Path

    data_dir = Path("data") / "2026"
    report = data_dir / "may.csv"
    print(report.name, report.stem, report.suffix)   # may.csv may .csv
    print(report.parent.name)                       # 2026

    data_dir.mkdir(parents=True, exist_ok=True)     # create the folders if missing
    report.write_text("sku,qty\\n", encoding="utf-8")
    print(report.read_text(encoding="utf-8"))
    print(report.exists(), report.is_file())

    for p in Path("data").glob("*/*.csv"):           # every CSV one level down
        print(p)

\`read_text\` and \`write_text\` open, read or write, and close in one call — ideal for small files.

## Relative paths are relative to where you ran Python

\`open("data.txt")\` looks in the **current working directory** — the folder the terminal was in
— not the folder the script lives in. Run \`python tools/clean.py\` from the project root and
\`"data.txt"\` means \`./data.txt\`, not \`tools/data.txt\`. For files that ship with the script:

    HERE = Path(__file__).parent
    with open(HERE / "data.txt", encoding="utf-8") as f:
        ...

## The exceptions files raise

    FileNotFoundError     reading a path that does not exist
    FileExistsError       mode "x" on a path that exists
    PermissionError       no rights, or the file is open in Excel on Windows
    IsADirectoryError     the path is a folder (Windows reports PermissionError)
    UnicodeDecodeError    the bytes are not valid in the encoding you named

All but the last are \`OSError\`s. Handle the ones the user can fix:

    try:
        text = Path(name).read_text(encoding="utf-8")
    except FileNotFoundError:
        print(f"No such file: {name}")
    except PermissionError:
        print(f"Cannot read {name}: is it open in another program?")`,
    workedExample: `**Problem.** A folder \`logs\` holds daily files like \`2026-11-04.log\`. Each line is
\`LEVEL message\`. Write \`summary.txt\` with the number of ERROR lines in each file, skipping
files that cannot be read and saying which.

    from pathlib import Path

    log_dir = Path("logs")
    results = []
    for path in sorted(log_dir.glob("*.log")):
        try:
            with open(path, encoding="utf-8") as f:
                errors = 0
                for line in f:
                    if line.startswith("ERROR "):
                        errors += 1
        except (PermissionError, UnicodeDecodeError) as e:
            print(f"skipped {path.name}: {type(e).__name__}")
            continue
        results.append(f"{path.stem}: {errors}")

    with open(log_dir / "summary.txt", "w", encoding="utf-8") as out:
        for row in results:
            out.write(row + "\\n")
    print(f"wrote {len(results)} rows")

Decisions:

1. **glob + sorted** — the files in date order, whatever order the OS lists them.
2. **Iterating each file** — line by line, so a huge log costs no memory.
3. **startswith("ERROR ")** — the space stops \`ERRORS\` or \`ERROR_RATE\` matching; the trailing
   \`\\n\` does not matter because we compare the start.
4. **Catch only what a log can do** — an unreadable or wrongly encoded file is skipped and
   named; anything else (a bug) still stops the program.
5. **\`continue\` in the except** — so \`errors\` from a failed file is never appended.
6. **\`"w"\` for the summary** — it is regenerated from scratch each run, so emptying it is right.`,
    mcqs: [
      mcq(`What does this print?

    from pathlib import Path
    p = Path("reports") / "2026" / "may.csv"
    print(p.name, p.suffix, p.stem)`,
        [['may.csv .csv may', true], ['may .csv may.csv', false], ['reports/2026 .csv may', false], ['may.csv csv may', false]],
        'name is the last part with its extension, suffix is the extension including its dot, and stem is the name without the extension.'),
      mcq(`What does this print?

    with open("log.txt", "w", encoding="utf-8") as f:
        f.write("first")
    with open("log.txt", "a", encoding="utf-8") as f:
        f.write("second")
    print(open("log.txt", encoding="utf-8").read())`,
        [['second', false], ['first and second on two lines', false], ['firstsecond', true], ['first', false]],
        '"w" creates the file with "first", and "a" adds to the end. write adds no newline, so the two strings run together.'),
      mcq('A script reads a UTF-8 file fine on a Mac but raises UnicodeDecodeError on Windows. What is the fix?',
        [['Open the file in binary mode and decode it by hand', false], ['Pass encoding="utf-8" to open', true], ['Catch UnicodeDecodeError and skip the file there', false], ['Rename the file so it ends in .utf8 on Windows', false]],
        'Without encoding, open uses the platform default — UTF-8 on the Mac, often cp1252 on Windows. Naming the encoding makes the read identical on every machine.'),
    ],
    checkpoint: [
      ck(S, `What does this print?

    from pathlib import Path
    Path("t.txt").write_text("a\\nb\\n", encoding="utf-8")
    with open("t.txt", encoding="utf-8") as f:
        print(f.readlines())`,
        [["['a', 'b']", false], ["['a\\n', 'b\\n']", true], ["['a\\nb\\n']", false], ["['a', 'b', '']", false]],
        'readlines returns one string per line, and each keeps its newline character. Strip them yourself if you do not want them.'),
      ck(S, `The file w.txt holds the two lines x and y. What does this print?

    count = 0
    with open("w.txt", encoding="utf-8") as f:
        for line in f:
            if line == "y":
                count += 1
    print(count)`,
        [['1', false], ['2', false], ['0', true], ['It raises ValueError', false]],
        'Every line read from a file ends in "\\n" (the last one too, if the file ends with a newline), so line is "y\\n", never "y". Comparing line.strip() would count 1.'),
      ck(S, 'notes.txt already exists. What does open("notes.txt", "x", encoding="utf-8") do?',
        [['Empties notes.txt and opens it for writing', false], ['Opens it for appending to the end of it', false], ['Opens it read-only, as x means examine', false], ['Raises FileExistsError and changes nothing', true]],
        'Mode "x" is exclusive creation: it only creates a new file. If the path exists it raises FileExistsError, which makes it a safe alternative to "w".'),
    ],
  },
  {
    unitCode: 'JT_PY_ERRORS_CSV_JSON',
    notes: `Two formats carry most of the data you will move around: **CSV** for tables (exports from
Excel, databases, reports) and **JSON** for structured data (APIs, config files). Python's
standard library reads and writes both.

## CSV with csv.reader and csv.writer

    import csv

    with open("orders.csv", newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)              # ['order_id', 'city', 'amount']
        for row in reader:
            print(row)                     # ['1042', 'Pune, MH', '1250']

Why not \`line.split(",")\`? Because a CSV field may contain a comma inside quotes —
\`1042,"Pune, MH",1250\` has **three** fields — and quotes inside quotes are doubled. The \`csv\`
module handles all of that.

Two rules:

- **Open with \`newline=""\`.** The csv module handles line endings itself. Without it, writing
  on Windows produces a blank line between every row.
- **Every value is a string.** \`row[2]\` is \`"1250"\`. Convert it: \`int(row[2])\`. That
  conversion is where bad data shows up, as a \`ValueError\`.

Writing:

    rows = [["sku", "qty"], ["PEN-01", 40], ["INK-02", 5]]
    with open("stock.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerows(rows)             # or writer.writerow(one_row)

Numbers are written with \`str()\`; a field containing a comma is quoted for you.

## DictReader and DictWriter

Refer to columns by name instead of position:

    with open("orders.csv", newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):      # the first line becomes the keys
            amount = int(row["amount"])
            print(row["city"], amount)

Each row is a dict like \`{'order_id': '1042', 'city': 'Pune, MH', 'amount': '1250'}\`. Values
are still strings, and an empty cell is \`""\`, not \`None\`. A misspelled column name is a
\`KeyError\`.

    fields = ["city", "orders", "revenue"]
    with open("by_city.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerow({"city": "Pune", "orders": 3, "revenue": 4100})

\`fieldnames\` fixes the column order. A dict with a key not in \`fieldnames\` raises
\`ValueError\`; a missing key writes an empty cell.

## JSON with the json module

JSON looks like Python dicts and lists, with a few differences:

    Python             JSON
    dict               object  {"key": ...}   keys must be strings
    list, tuple        array   [...]
    str                string  "..." (double quotes only)
    int, float         number
    True / False       true / false
    None               null

Four functions — **s** for string:

    import json

    order = {"id": 1042, "items": ["pen", "ink"], "paid": True, "coupon": None}
    text = json.dumps(order)                # dict -> JSON text
    print(text)   # {"id": 1042, "items": ["pen", "ink"], "paid": true, "coupon": null}
    back = json.loads(text)                 # JSON text -> dict

    with open("order.json", "w", encoding="utf-8") as f:
        json.dump(order, f, indent=2)       # write to a file, pretty-printed
    with open("order.json", encoding="utf-8") as f:
        again = json.load(f)                # read from a file

Round-trip surprises:

- A **tuple** comes back as a **list**.
- **Non-string keys** become strings: \`{1: "a"}\` comes back as \`{'1': 'a'}\`.
- A \`set\`, a \`datetime\` or your own object cannot be dumped — \`TypeError: Object of type set
  is not JSON serializable\`. Convert first (\`sorted(s)\`, \`d.isoformat()\`).
- Non-ASCII text is escaped (\`"\\u20b9"\`) unless you pass \`ensure_ascii=False\`.

## When the data is bad

    try:
        config = json.loads(text)
    except json.JSONDecodeError as e:
        print(f"config is not valid JSON: {e}")   # ... line 3 column 5 (char 41)

\`JSONDecodeError\` is a subclass of \`ValueError\`, and its message gives the line and column.
Common causes: single quotes (\`{'a': 1}\` is Python, not JSON), a trailing comma, or comments.

## CSV to JSON

    import csv, json

    with open("orders.csv", newline="", encoding="utf-8") as f:
        orders = []
        for row in csv.DictReader(f):
            row["amount"] = int(row["amount"])     # strings to real types first
            orders.append(row)

    with open("orders.json", "w", encoding="utf-8") as f:
        json.dump(orders, f, indent=2)

Convert the types **before** dumping, or the JSON will be full of \`"1250"\` strings that every
consumer has to convert again.

## Trying it without a file

\`io.StringIO\` is a string that behaves like an open file — handy in the REPL and in tests:

    import csv, io
    rows = list(csv.reader(io.StringIO('7,"Pune, MH",4\\n')))
    print(rows)          # [['7', 'Pune, MH', '4']]`,
    workedExample: `**Problem.** \`payments.csv\` has columns \`name,amount,status\`. Some amounts are blank
or not numbers. Write \`summary.json\` with the total of PAID payments per name, and print how
many rows were skipped and why.

    import csv, json

    totals = {}
    skipped = {}
    with open("payments.csv", newline="", encoding="utf-8") as f:
        for line_no, row in enumerate(csv.DictReader(f), start=2):
            try:
                amount = float(row["amount"])
            except ValueError:
                reason = "blank amount" if not row["amount"].strip() else "bad amount"
                skipped[reason] = skipped.get(reason, 0) + 1
                print(f"line {line_no}: {reason} {row['amount']!r}")
                continue
            if row["status"].strip().upper() == "PAID":
                totals[row["name"]] = totals.get(row["name"], 0) + amount

    with open("summary.json", "w", encoding="utf-8") as f:
        json.dump(totals, f, indent=2, sort_keys=True)
    print("skipped:", skipped)

Points:

1. \`start=2\` — line 1 is the header, so the first data row is line 2 of the file, which is
   what a person opening it in an editor will see.
2. \`float("")\` raises \`ValueError\` just like \`float("abc")\`; the handler tells them apart for
   a clearer report.
3. Status is normalised (\`strip().upper()\`) because spreadsheets produce \`paid \` and \`Paid\`.
4. A missing **column** would raise \`KeyError\` — deliberately not caught: a file without an
   \`amount\` column is the wrong file, and the program should stop and say so.
5. \`sort_keys=True\` makes the JSON identical from run to run, so changes are easy to review.`,
    mcqs: [
      mcq('What does print(json.dumps({"ok": True, "n": None})) print?',
        [['{"ok": true, "n": null}', true], ["{'ok': True, 'n': None}", false], ['{"ok": "True", "n": "None"}', false], ['{"ok": true, "n": none}', false]],
        'json.dumps writes JSON, not Python: double-quoted keys, true for True and null for None. The single-quoted form is how Python prints a dict.'),
      mcq(`What does this print?

    import csv, io
    rows = list(csv.DictReader(io.StringIO("name,qty\\npen,3\\n")))
    print(rows[0]["qty"] * 2)`,
        [['6', false], ['33', true], ['TypeError', false], ["['3', '3']", false]],
        'The csv module never converts types, so rows[0]["qty"] is the string "3", and multiplying a string by 2 repeats it. int(rows[0]["qty"]) * 2 would give 6.'),
      mcq('Why should a CSV file be opened with newline="" when writing it on Windows?',
        [['Without it, csv refuses to write any rows', false], ['Or each row is followed by an empty line', true], ['It makes the module quote every field', false], ['It strips the newline from the header row', false]],
        'csv.writer ends each row with \\r\\n itself. In text mode Windows then turns the \\n into \\r\\n again, so spreadsheets show a blank row after each one. newline="" stops that translation.'),
    ],
    checkpoint: [
      ck(S, 'What does print(json.loads(json.dumps({1: "a", "t": (2, 3)}))) print?',
        [["{1: 'a', 't': (2, 3)}", false], ["{'1': 'a', 't': [2, 3]}", true], ["{1: 'a', 't': [2, 3]}", false], ["{'1': 'a', 't': (2, 3)}", false]],
        'JSON object keys are always strings, so 1 comes back as "1", and JSON has no tuple, so (2, 3) is written as an array and read back as a list.'),
      ck(S, 'A config file contains {\'debug\': true}. json.load raises on it. Which except clause catches the error?',
        [['except KeyError', false], ['except TypeError', false], ['except ValueError', true], ['except SyntaxError', false]],
        'Single quotes are not valid JSON, so json.load raises json.JSONDecodeError, a subclass of ValueError. Catching json.JSONDecodeError itself would be more precise.'),
      ck(S, `What does this print?

    import csv, io
    row = next(csv.reader(io.StringIO('7,"Pune, MH",4\\n')))
    print(len(row), row[1])`,
        [['4 "Pune', false], ['3 "Pune, MH"', false], ['4 Pune', false], ['3 Pune, MH', true]],
        'The quotes mark one field that contains a comma, so the reader returns three fields and removes the quotes. line.split(",") would have produced four broken pieces.'),
    ],
  },
  {
    unitCode: 'JT_PY_ERRORS_LOGGING',
    notes: `\`print\` is fine while you write a script. In a program that runs on a server, or for days,
you need to know **when** something happened, **where** in the code, and **how serious** it
was — and to turn the detail up or down without editing code. That is the \`logging\` module.

## Levels

    DEBUG      10   detail for the developer: values, branches taken
    INFO       20   normal events: started, file loaded, 120 rows written
    WARNING    30   something odd that was handled: a retry, a default used
    ERROR      40   an operation failed
    CRITICAL   50   the program cannot continue

A logger has a level and drops every message below it. The default is **WARNING**:

    import logging
    logging.info("starting")           # dropped
    logging.warning("disk at 91%")     # shown

prints only \`WARNING:root:disk at 91%\`, and on **stderr**, not stdout.

## basicConfig, once, at the start

    import logging

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    logging.info("loaded %d rows", 120)
    # 2026-11-06 10:15:02,481 INFO root: loaded 120 rows

Useful format fields: \`%(asctime)s\` (time), \`%(levelname)s\`, \`%(name)s\` (the logger),
\`%(message)s\`, \`%(filename)s\` and \`%(lineno)d\`, \`%(funcName)s\`. Add
\`filename="app.log"\` to write to a file instead of the terminal.

\`basicConfig\` configures the logging system **only the first time** it is called; later calls
do nothing (unless you pass \`force=True\`). Call it once, in the script you run — never in a
module that others import.

## A logger per module

    # orders.py
    import logging
    log = logging.getLogger(__name__)      # named "orders"

    def place(order_id, qty):
        log.debug("placing %s x%d", order_id, qty)
        if qty > 100:
            log.warning("large order %s: %d units", order_id, qty)
        ...

\`getLogger(__name__)\` gives each module its own named logger, so the log line says which
module wrote it, and you can raise or lower one module's level
(\`logging.getLogger("orders").setLevel(logging.DEBUG)\`). Messages from every logger flow up to
the root, which \`basicConfig\` set up.

## Pass values as arguments, not f-strings

    log.debug("cart %s has %d items", cart_id, len(items))     # preferred
    log.debug(f"cart {cart_id} has {len(items)} items")        # works, but always formats

With the \`%s\` style the message is built **only if** it will be shown. A DEBUG line inside a
loop costs almost nothing when DEBUG is off. Use \`%s\` for anything, \`%d\` for integers,
\`%.2f\` for floats.

## Logging an exception

    try:
        charge(card, amount)
    except PaymentError:
        log.exception("charge failed for order %s", order_id)
        raise

\`log.exception\` logs at **ERROR** level **and appends the full traceback**. Call it only inside
an \`except\` block. \`log.error(..., exc_info=True)\` does the same; \`log.error("failed: %s", e)\`
records only the message — and the traceback, the most useful part, is lost.

## What to log at which level

    log.debug("parsed row %d: %r", n, row)            # only while investigating
    log.info("import finished: %d ok, %d skipped", ok, bad)
    log.warning("price missing for %s, using 0", sku)
    log.error("could not write %s: %s", path, e)
    log.critical("database unreachable, stopping")

Never log passwords, tokens, card numbers or full personal data — logs are copied, shipped and
kept for a long time.

## print or logging?

- **print** is for the program's actual **output** — the report the user asked for, the answer
  to a coding problem.
- **logging** is for **diagnostics** about the run. It can be silenced, sent to a file, or
  turned up to DEBUG for one module, all without changing the code that produces the output.`,
    workedExample: `**Problem.** A nightly import script uses \`print\` everywhere. Make it production-ready:
INFO by default, DEBUG with a \`--verbose\` flag, timestamps, and a full traceback when a row
fails — without stopping the import.

    import logging
    import sys

    log = logging.getLogger("importer")

    def import_rows(rows):
        ok = failed = 0
        for n, row in enumerate(rows, start=1):
            log.debug("row %d: %r", n, row)
            try:
                save(row)
            except ValueError:
                log.exception("row %d rejected", n)
                failed += 1
            else:
                ok += 1
        log.info("import done: %d saved, %d rejected", ok, failed)
        if failed:
            log.warning("%d rows need attention", failed)
        return failed

    if __name__ == "__main__":
        logging.basicConfig(
            level=logging.DEBUG if "--verbose" in sys.argv else logging.INFO,
            format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
        )
        failures = import_rows(load_rows())
        sys.exit(1 if failures else 0)

What changed and why:

1. **basicConfig under \`if __name__ == "__main__"\`** — it runs only when this file is the
   program, so importing \`import_rows\` from a test configures nothing.
2. **\`log.debug\` per row** — invisible at INFO, there when you pass \`--verbose\`.
3. **\`log.exception\`** — each rejected row is logged with its traceback, and the loop goes on.
4. **\`%-8s\`** pads the level so the columns line up when you read the file.
5. **Exit code 1 on failures** — the scheduler that runs the job can tell it went wrong, which
   no print statement could do.`,
    mcqs: [
      mcq(`With no logging configuration at all, what appears when this runs?

    import logging
    logging.info("starting")
    logging.warning("disk at 91%")`,
        [['Both lines, each prefixed with its level', false], ['WARNING:root:disk at 91%', true], ['Nothing, as logging is off by default', false], ['starting, then disk at 91%, plainly', false]],
        'The root logger starts at WARNING, so the INFO message is dropped. The default format is LEVEL:loggername:message, written to stderr.'),
      mcq('Inside an except block, what does log.exception("upload failed") record that log.error("upload failed") does not?',
        [['The current time of day', false], ['The name of the logger', false], ['The full traceback', true], ['A CRITICAL level tag', false]],
        'log.exception logs at ERROR level, like log.error, but appends the traceback of the exception being handled. That traceback is what tells you where it broke.'),
      mcq(`What appears on the console?

    import logging
    logging.basicConfig(level=logging.INFO, format="%(levelname)s|%(message)s")
    logging.debug("a")
    logging.info("b")
    logging.error("c")`,
        [['DEBUG|a, INFO|b and ERROR|c', false], ['ERROR|c, on its own', false], ['INFO|b and then ERROR|c', true], ['b and c, with no level shown', false]],
        'The level is INFO, so DEBUG messages are dropped and INFO and above are shown, each in the given levelname|message format.'),
    ],
    checkpoint: [
      ck(S, 'A logger\'s level is set to ERROR. Which of log.warning, log.error and log.critical produce output?',
        [['warning, error and critical', false], ['error and critical', true], ['only critical', false], ['only error', false]],
        'A logger drops messages below its level. ERROR is 40, so ERROR and CRITICAL (50) pass and WARNING (30) is dropped.'),
      ck(S, `What does this print?

    import logging
    logging.basicConfig(level=logging.WARNING)
    logging.basicConfig(level=logging.DEBUG)
    logging.info("hello")`,
        [['INFO:root:hello', false], ['DEBUG:root:hello', false], ['hello', false], ['Nothing', true]],
        'basicConfig only configures logging the first time it is called; the second call is ignored. The root level stays WARNING, so the INFO message is dropped.'),
      ck(S, 'Why is log.debug("rows: %s", rows) preferred to log.debug(f"rows: {rows}") in a loop?',
        [['f-strings are not allowed in logging calls', false], ['The %s form escapes characters for safety', false], ['The text is built only if DEBUG is enabled', true], ['The %s form also adds the line number shown', false]],
        'With arguments, logging formats the message only when a handler will emit it. The f-string is built on every call, even when DEBUG is off and the line is thrown away.'),
    ],
  },
  {
    unitCode: 'JT_PY_ERRORS_DEBUGGING',
    notes: `Five exception and file bugs that pass a quick test and fail later. In each: the symptom,
the cause, and the one change that fixes it.

## 1. The except that hides a typo

    def total_price(cart):
        try:
            total = 0
            for item in carts:
                total += item["price"] * item["qty"]
            return total
        except:
            return 0

**Symptom:** every cart totals 0, and nothing is logged. **Cause:** \`carts\` is a typo for
\`cart\`, which raises \`NameError\` — and the bare \`except\` turns that bug into a plausible
number. **Fix:** catch only what you expect (\`except KeyError:\` for a missing field), and let
programming errors raise. Better still, decide whether a malformed item should be skipped,
reported or rejected, instead of returning 0 for the whole cart.

## 2. A try that is too wide

    try:
        user = users[user_id]
        send_email(user["email"], build_message(user))
    except KeyError:
        print("Unknown user", user_id)

**Symptom:** "Unknown user 42" for a user who certainly exists. **Cause:** \`build_message\`
reads \`user["first_name"]\`, the record has \`"name"\`, and that \`KeyError\` lands in the handler
written for a missing user. **Fix:** protect only the lookup:

    try:
        user = users[user_id]
    except KeyError:
        print("Unknown user", user_id)
    else:
        send_email(user["email"], build_message(user))

## 3. The line that never matches

    with open("blocked.txt", encoding="utf-8") as f:
        blocked = f.readlines()
    if username in blocked:
        deny()

**Symptom:** blocked users get in. **Cause:** \`readlines\` keeps each \`\\n\`, so \`blocked\` is
\`["asha\\n", "ravi\\n"]\` and \`"asha" in blocked\` is \`False\`. **Fix:**
\`blocked = set(f.read().splitlines())\` — \`splitlines\` drops the newlines, and a set makes
each \`in\` check fast.

## 4. except clauses in the wrong order

    try:
        qty = int(text)
        price = PRICES[sku]
    except Exception:
        print("Something went wrong")
    except ValueError:
        print("Quantity must be a number")

**Symptom:** the helpful message never appears. **Cause:** \`ValueError\` is an \`Exception\`, so
the first clause takes it, and Python does **not** warn that the second is unreachable. **Fix:**
specific clauses first, and only add the general one if there is a real reason to.

## 5. It works on my machine

    with open("customers.csv") as f:
        for row in csv.reader(f):
            ...

**Symptom:** fine on the developer's Mac; on the Windows server,
\`UnicodeDecodeError: 'charmap' codec can't decode byte 0x9d\` at a customer named "Zoë".
**Cause:** no \`encoding\`, so the platform default (cp1252 on Windows) was used to read a UTF-8
file. **Fix:** \`open("customers.csv", newline="", encoding="utf-8")\`. If a file came from Excel
with a byte-order mark, \`encoding="utf-8-sig"\` drops it.

## Also on the list

- \`except ValueError, TypeError:\` — a \`SyntaxError\` in Python 3; write
  \`except (ValueError, TypeError):\`.
- \`return\` inside \`finally\` — silently swallows the exception that was propagating.
- \`raise CustomError("...")\` inside an \`except\` without \`from e\` — the traceback says
  "During handling of the above exception, another exception occurred", which looks like two
  bugs. Add \`from e\`.

## How to approach any exception bug

1. Read the traceback's **last line**, then the **last frame**. 2. If there is no traceback but
the result is wrong, look for an \`except\` that is catching more than it should — temporarily
add \`raise\` inside it and run again. 3. For file bugs, print \`repr(line)\` — it shows the
\`\\n\`, the spaces and the strange characters that \`print\` hides.`,
    mcqs: [
      mcq('In bug 1, every cart totals 0 and no error appears. What is the real cause?',
        [['sum() returns 0 for a generator expression', false], ['A NameError from the typo is caught and hidden', true], ['item["qty"] is a string, so the product is 0', false], ['The function returns before the loop has run', false]],
        'carts is not defined, so the expression raises NameError, and the bare except converts it into the return value 0. The symptom is a wrong number, far from the actual typo.'),
      mcq('In bug 2, why does a KeyError from build_message print "Unknown user"?',
        [['send_email turns every error into a KeyError', false], ['users[user_id] is looked up a second time', false], ['The try also wraps build_message and its lookups', true], ['KeyError is raised whenever an e-mail bounces', false]],
        'Any KeyError raised anywhere in the try block, including inside build_message, goes to the same handler. Keeping only the users lookup in the try, and the rest in else, separates the two.'),
      mcq('In bug 3, what is the value of "asha" in ["asha\\n", "ravi\\n"]?',
        [['True, as in ignores the trailing newlines', false], ['False, since the strings differ by "\\n"', true], ['True, because "asha" is a prefix of one', false], ['It raises TypeError comparing the strings', false]],
        'in on a list tests equality with each element, and "asha" is not equal to "asha\\n". Stripping each line when reading fixes the comparison.'),
      mcq(`What does this print?

    try:
        int("x")
    except Exception:
        print("general")
    except ValueError:
        print("value")`,
        [['value', false], ['general, then value', false], ['A SyntaxError for the order', false], ['general', true]],
        'Except clauses are tried in order and ValueError is a subclass of Exception, so the first clause matches. Python raises no error about the unreachable ValueError clause.'),
      mcq('A program parses "except ValueError, TypeError:". What happens on Python 3.10?',
        [['It catches both of the exceptions', false], ['It catches ValueError and names it TypeError', false], ['A SyntaxError, before anything runs', true], ['It catches only TypeError, the last named', false]],
        'Python 3 requires the types to be in parentheses: except (ValueError, TypeError):. The old Python 2 spelling is rejected at compile time with "multiple exception types must be parenthesized".'),
    ],
  },
  {
    unitCode: 'JT_PY_ERRORS_PRACTICE',
    notes: `No new ideas — repetition until handling an exception is a decision, not a reflex. Write
each exercise from an empty file, run it with good **and** bad input, and read the traceback
before you add any \`except\`.

## Exercise 1 — Ask until it is a number

Keep asking for an age with \`input()\` until the user types a whole number from 1 to 120. A
non-number and an out-of-range number get different messages. Use \`try\`/\`except
ValueError\`/\`else\`, and put the range check in \`else\`.

## Exercise 2 — Trace finally

Predict, then run:

    def step(n):
        try:
            print("try", end=" ")
            return 10 // n
        except ZeroDivisionError:
            print("zero", end=" ")
            return -1
        finally:
            print("finally", end=" ")

    print(step(5))
    print(step(0))

## Exercise 3 — A custom exception with data

Write \`class InvalidMarks(Exception)\` that stores the bad value as \`.marks\`. \`grade(marks)\`
raises it outside 0–100 and returns a letter otherwise. Catch it and print the stored value
from the attribute, not from the message.

## Exercise 4 — Translate with from

\`read_port(settings)\` takes a dict and returns \`int(settings["port"])\`. Turn both the
\`KeyError\` and the \`ValueError\` into a \`ConfigError\` raised \`from e\`. Print
\`type(err.__cause__).__name__\` to prove the original survived.

## Exercise 5 — Count lines safely

Write \`count_lines(path)\` with \`with open(..., encoding="utf-8")\` and a \`for\` loop. Call it on
a file that exists and one that does not, catch \`FileNotFoundError\`, and print its message.

## The graded exercise — Split the bill

The grader has no files, so the "file" is standard input: each line is one record of a trip's
expenses, and some are malformed. You parse each line, catch each kind of failure **separately**,
raise and catch one exception of your own, and finish with a summary. The order of the checks is
specified exactly, because one bad line can have more than one problem.`,
    mcqs: [
      mcq('What does Exercise 2 print on its two lines?',
        [['try finally 2, then try zero finally -1', true], ['try 2 finally, then try zero -1 finally', false], ['try finally 2, then try zero -1', false], ['finally try 2, then finally try zero -1', false]],
        'Each call prints "try " and evaluates its return value, then finally prints "finally " before the value reaches print. With 0, the except prints "zero " and returns -1, and finally still runs first.'),
      mcq('In Exercise 3, why read the bad value from e.marks rather than from str(e)?',
        [['str(e) is always empty for a custom exception', false], ['An attribute is data; the message is only text', true], ['e.marks is faster to read than the message', false], ['str() cannot be called on an exception at all', false]],
        'The message is for people and its wording may change. An attribute gives the handler the actual value with its type intact, with no string parsing.'),
      mcq('In the graded exercise, float("") is called on a blank amount field. Which exception is raised?',
        [['TypeError', false], ['KeyError', false], ['ValueError', true], ['None is returned', false]],
        'An empty string is still a string, but it does not spell a number, so float raises ValueError ("could not convert string to float"). That is why a blank amount is reported as not a number.'),
      mcq('In the graded exercise the share is amount / people with people == 0. What does Python do with a float divided by 0?',
        [['Returns inf, as IEEE floats allow', false], ['Raises ZeroDivisionError', true], ['Returns 0.0 for a zero people count', false], ['Returns nan and prints a warning', false]],
        'Unlike some languages, Python raises ZeroDivisionError for float division by zero as well as integer division. You catch it like any other exception.'),
    ],
    assignment: {
      title: 'Split the Bill with Error Handling',
      description: 'Read expense records line by line, work out each person\'s share in rupees, and report malformed records without crashing — catching each kind of failure separately and using one exception of your own.',
      instructions: `Write a Python program that reads expense records from standard input until the input
ends. Think of the input as a CSV file with no header: each line is one record.

**Input**

Each line has four fields separated by commas:

    description,amount,currency,people

for example \`Dinner,1200,INR,4\`. Spaces around a field are ignored. Blank lines are skipped and
are not counted as errors, but they **do** count when numbering lines: the first line of input
is line 1, the next is line 2, and so on, blank or not.

Exchange rates to rupees (they are already in the starter):

    RATES = {"INR": 1.0, "USD": 83.0, "EUR": 90.0}

**Rules — check each line in exactly this order**

1. Split it on commas and strip each field. If there are not exactly 4 fields, **raise your own
   exception**: define \`class RecordError(Exception)\` and raise
   \`RecordError(f"expected 4 fields, got {n}")\`.
2. Convert the amount with \`float()\` and the people count with \`int()\`. If either fails
   (\`abc\`, \`2.5\` people, a blank field), that is a \`ValueError\`: report \`not a number\`.
3. If the amount or the people count is negative, raise \`RecordError("negative value")\`.
4. Look the currency up in \`RATES\`, in uppercase (\`usd\` is accepted). An unknown code is a
   \`KeyError\`: report \`unknown currency <CODE>\` with the code in uppercase.
5. The share is \`amount * rate / people\`. If people is 0, that is a \`ZeroDivisionError\`: report
   \`no one to split between\`.

Catch \`RecordError\`, \`ValueError\`, \`KeyError\` and \`ZeroDivisionError\` in **separate**
\`except\` clauses. Never use a bare \`except\` or \`except Exception\`.

**Output**

As each line is processed, print one of:

    <description>: <share in rupees, 2 decimals> INR each
    Line <n>: <reason>

where \`<reason>\` is the RecordError's message or one of the three reports above. After the last
line, print:

    Valid: <number of valid records>
    Errors: <number of bad records>
    Total: <sum of the valid amounts in rupees, 2 decimals> INR

**Example**

Input:

    Dinner,1200,INR,4
    Taxi,abc,INR,2
    Museum,25,USD,4
    Snacks,90,GBP,3
    Hotel,5000,INR,0

Output:

    Dinner: 300.00 INR each
    Line 2: not a number
    Museum: 518.75 INR each
    Line 4: unknown currency GBP
    Line 5: no one to split between
    Valid: 2
    Errors: 3
    Total: 3275.00 INR

(Museum: 25 × 83 = 2075 rupees, 518.75 each. Total: 1200 + 2075.)

**How it is graded**

Your program is run against every test case — the examples you can see and several you cannot,
covering blank lines, spaces, lowercase currencies, too many or too few fields, negatives, and
lines with more than one problem — and scored on how many it passes. Output is compared line by
line. A reviewer uses the rubric for the handling marks.`,
      rubric: [
        { criterion: 'Correct output', description: 'Every share, error line, line number and summary line is right for every test case, including blank lines, mixed case, too many fields and lines with several problems.', maxPoints: 60 },
        { criterion: 'Exception handling', description: 'RecordError is a subclass of Exception and is raised for the field count and negatives; ValueError, KeyError and ZeroDivisionError are caught in separate clauses; nothing is caught with a bare except or except Exception.', maxPoints: 30 },
        { criterion: 'Structure and reading', description: 'Parsing lives in a function that raises rather than prints, the try covers only the parse and the division, and input is read until it ends with no fixed line count.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

RATES = {"INR": 1.0, "USD": 83.0, "EUR": 90.0}


# TODO: define RecordError, your own exception for a line with the wrong shape or a negative value


def parse_record(line):
    """Return (description, amount_in_inr, people) for one line, or raise an exception."""
    # TODO: split on commas and strip each field; raise RecordError if there are not 4
    # TODO: convert the amount with float() and the people count with int()
    # TODO: raise RecordError if either is negative, then look the currency up in RATES
    return None


def main():
    valid = 0
    errors = 0
    total = 0.0
    for number, line in enumerate(sys.stdin, start=1):
        line = line.strip()
        if not line:
            continue
        # TODO: call parse_record and work out the share inside try
        # TODO: catch RecordError, ValueError, KeyError and ZeroDivisionError separately
    print(f"Valid: {valid}")
    print(f"Errors: {errors}")
    print(f"Total: {total:.2f} INR")


main()
`,
        tests: [
          { input: 'Dinner,1200,INR,4\nTaxi,abc,INR,2\nMuseum,25,USD,4\nSnacks,90,GBP,3\nHotel,5000,INR,0\n', expectedOutput: 'Dinner: 300.00 INR each\nLine 2: not a number\nMuseum: 518.75 INR each\nLine 4: unknown currency GBP\nLine 5: no one to split between\nValid: 2\nErrors: 3\nTotal: 3275.00 INR' },
          { input: 'Lunch,450,INR,3\nParking,40,INR\nRefund,-200,INR,2\nTrain,10,EUR,7\n', expectedOutput: 'Lunch: 150.00 INR each\nLine 2: expected 4 fields, got 3\nLine 3: negative value\nTrain: 128.57 INR each\nValid: 2\nErrors: 2\nTotal: 1350.00 INR' },
          { input: '  Tea , 100 , inr , 3\n\nCake,12.5,usd,5\n', expectedOutput: 'Tea: 33.33 INR each\nCake: 207.50 INR each\nValid: 2\nErrors: 0\nTotal: 1137.50 INR', isHidden: true },
          { input: 'just text\na,1,INR,2.5\nb,x,XYZ,0\nc,5,ABC,-1\nd,,INR,1\n', expectedOutput: 'Line 1: expected 4 fields, got 1\nLine 2: not a number\nLine 3: not a number\nLine 4: negative value\nLine 5: not a number\nValid: 0\nErrors: 5\nTotal: 0.00 INR', isHidden: true },
          { input: 'Fuel,3000,INR,2\n\nToll,1,2,3,4\nFee,0,EUR,0\n', expectedOutput: 'Fuel: 1500.00 INR each\nLine 3: expected 4 fields, got 5\nLine 4: no one to split between\nValid: 1\nErrors: 2\nTotal: 3000.00 INR', isHidden: true },
          { input: '\nFree walk,0,INR,3\nBoat,30,eur,4\nGift,5,gbp,1\n', expectedOutput: 'Free walk: 0.00 INR each\nBoat: 675.00 INR each\nLine 4: unknown currency GBP\nValid: 2\nErrors: 1\nTotal: 2700.00 INR', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },
  {
    unitCode: 'JT_PY_ERRORS_INTERVIEW_QUESTION',
    notes: `Three exception questions from real Python interviews, each with an answer that works and
the follow-up a good answer earns.

## Q1. "Walk me through try, except, else and finally. When does each run?"

**Model answer.** "\`try\` holds the code that might raise. If it raises, Python checks the
\`except\` clauses top to bottom and runs the first one whose type matches — a class matches its
subclasses too, so specific types go first. \`else\` runs only if the \`try\` raised nothing; I
put the success path there so the \`try\` stays small and a bug in the follow-on code is not
caught by a handler written for something else. \`finally\` runs on every exit — success,
exception, \`return\`, \`break\` — and is for cleanup. If no clause matched, the exception
continues outward after \`finally\` has run."

    try:
        qty = int(text)
    except ValueError:
        qty = 1
    else:
        log.info("qty %d", qty)
    finally:
        log.debug("parsed %r", text)

**Follow-up:** "What if \`finally\` has a \`return\`?" — "It overrides the try's return value
and silently discards an exception that was propagating, so I never return from \`finally\`."
And "why not a bare \`except\`?" — "It catches \`KeyboardInterrupt\` and \`SystemExit\` too, and
every bug. I catch the specific type, or \`except Exception\` with logging at a top-level
boundary."

## Q2. "What do EAFP and LBYL mean, and which does Python prefer?"

**Model answer.** "LBYL — look before you leap — checks first: \`if key in d: value = d[key]\`.
EAFP — easier to ask forgiveness than permission — just does it and handles the failure:
\`try: value = d[key] except KeyError: ...\`. Python leans to EAFP. The check and the action
can't drift apart, it covers cases I would forget to check, and it avoids races: a file can be
deleted between \`os.path.exists\` and \`open\`, so I open it and catch \`FileNotFoundError\`.
When the 'failure' is the common case and the check is cheap, LBYL — or \`d.get(key, default)\`
— reads better."

**Follow-up:** "Isn't an exception slow?" — "Entering a \`try\` costs almost nothing; raising
costs more. If most lookups fail, use \`get\` or a check; if failure is rare, EAFP is both clear
and fast."

## Q3. "How would you design the exceptions for a module you are writing?"

**Model answer.** "One base class for the module, inheriting from \`Exception\` — say
\`class BillingError(Exception)\` — and a few specific subclasses for failures a caller can act
on differently, like \`CardDeclined\` and \`InvoiceNotFound\`. They carry the useful values as
attributes, not just in the message. For programming mistakes by the caller I raise built-ins —
\`ValueError\`, \`TypeError\`. When I catch a low-level exception and raise my own, I chain it with
\`raise ... from e\` so the original traceback is kept."

    class BillingError(Exception):
        pass

    class CardDeclined(BillingError):
        def __init__(self, reason):
            super().__init__(f"card declined: {reason}")
            self.reason = reason

**Follow-up:** "What does \`from e\` change?" — "The original goes into \`__cause__\` and the
traceback says 'the direct cause of the following exception'. Without it, Python still keeps
\`__context__\`, but the message reads 'during handling, another exception occurred', which
looks like a second bug. \`from None\` hides the original."

## Delivering it

Say the rule in one sentence, show three lines of code, then name the trap — \`return\` in
\`finally\`, the bare \`except\`, the missing \`from\`. Interviewers listen for the trap.`,
    mcqs: [
      mcq('An interviewer asks when the else block of a try statement runs. Which answer is right?',
        [['Always, after try, whatever happened', false], ['Only when the try raised no exception', true], ['Only when an except clause has run', false], ['Only when the exception was not caught', false]],
        'else is the success path: it runs when the try block completed without raising. It is skipped when an exception occurred, whether or not an except handled it.'),
      mcq('Why does EAFP avoid a race condition when opening a file?',
        [['open() locks the file before checking that it exists', false], ['The file can vanish between the exists() check and open()', true], ['os.path.exists is always slower than calling open() directly', false], ['EAFP code runs in one thread, so no race can happen', false]],
        'With LBYL another process can delete the file after the check and before the open, so the check proves nothing. Opening and catching FileNotFoundError handles that moment too.'),
      mcq(`What does this print?

    try:
        try:
            [][0]
        except IndexError:
            raise LookupError("empty") from None
    except LookupError as e:
        print(e.__cause__, e.__suppress_context__)`,
        [['IndexError True', false], ['None False', false], ['IndexError False', false], ['None True', true]],
        'from None sets __cause__ to None and __suppress_context__ to True, so the traceback does not show the IndexError. The original is still stored in __context__, just not displayed.'),
    ],
  },
  {
    unitCode: 'JT_PY_ERRORS_CHECKPOINT',
    notes: `Ten questions across the topic: exceptions and the traceback, try/except/else/finally,
raising and custom exceptions, files and paths, CSV and JSON, and logging. Most are a short
snippet. For each, decide first whether an exception is raised, which one, and which clause (if
any) catches it — then what is printed and in what order.`,
    checkpoint: [
      ck(S, `What does this print?

    def parse(text):
        try:
            value = int(text)
        except ValueError:
            print("bad", end=" ")
            value = 0
        finally:
            print("end", end=" ")
        return value

    print(parse("x9"))`,
        [['bad end 0', true], ['end bad 0', false], ['bad 0 end', false], ['bad end x9', false]],
        'int("x9") raises ValueError, so the except prints "bad " and sets value to 0. finally then prints "end ", and the function returns 0, which the outer print shows last.'),
      ck(S, 'Which pair lists exceptions that except OSError would catch?',
        [['ValueError and KeyError', false], ['FileNotFoundError and PermissionError', true], ['UnicodeDecodeError and TypeError', false], ['ImportError and RuntimeError', false]],
        'FileNotFoundError, PermissionError, FileExistsError and IsADirectoryError are all OSError subclasses. UnicodeDecodeError is a ValueError, raised while decoding the bytes.'),
      ck(S, `What does this print?

    stock = {"pen": 4}
    try:
        left = stock["ink"]
    except KeyError:
        left = 0
    else:
        left -= 1
    print(left)`,
        [['3', false], ['-1', false], ['0', true], ["KeyError: 'ink'", false]],
        'The lookup raises KeyError, so the except sets left to 0 and else, which runs only on success, is skipped. Nothing subtracts from it.'),
      ck(S, `What does this print?

    class PaymentError(Exception):
        pass

    e = PaymentError("card declined", 402)
    print(e.args)`,
        [["('card declined', 402)", true], ["'card declined'", false], ['card declined 402', false], ['PaymentError(402)', false]],
        'An exception keeps every argument it was created with in the args tuple. With more than one argument, str(e) shows that whole tuple, which is why a single message argument is the norm.'),
      ck(S, `What happens here?

    try:
        x = int("5")
    except ValueError as e:
        pass
    print(e)`,
        [['It prints 5', false], ['It prints an empty line', false], ['It prints None', false], ['It raises NameError', true]],
        'The except block never ran, so e was never bound. (Even when it does run, Python deletes the as name at the end of the block.) Using e afterwards raises NameError.'),
      ck(S, 'A script in C:\\proj\\tools\\clean.py calls open("rules.txt"). It is run from C:\\proj with python tools\\clean.py. Where does Python look for rules.txt?',
        [['C:\\proj\\tools\\rules.txt, next to the script', false], ['C:\\proj\\rules.txt, the working directory', true], ['In each folder on PATH, in order, until found', false], ['In the Python install folder\'s Lib directory', false]],
        'A relative path is resolved against the current working directory, the folder the terminal was in, not the script\'s folder. Path(__file__).parent / "rules.txt" would find the file beside the script.'),
      ck(S, 'What does print(json.dumps({"tags": ("a", "b"), "done": False})) print?',
        [['{"tags": ("a", "b"), "done": False}', false], ['{"tags": ["a", "b"], "done": false}', true], ["{'tags': ['a', 'b'], 'done': false}", false], ['{"tags": "a, b", "done": false}', false]],
        'JSON has no tuple, so a tuple is written as an array; False is written as false; and every string, keys included, uses double quotes.'),
      ck(S, `What does this print?

    import csv, io
    text = "sku,price\\nA1,10\\nB2,\\n"
    for r in csv.DictReader(io.StringIO(text)):
        print(repr(r["price"]))`,
        [["'10' and then ''", true], ["10 and then None", false], ["'10' and then None", false], ["10 and then ''", false]],
        'DictReader values are always strings, so the first price is \'10\', not 10, and an empty cell is the empty string, not None. Converting is your job, and float("") will raise ValueError.'),
      ck(S, 'A worker loop must keep running when one job fails, and the team must be able to find out why later. Which handler fits?',
        [['except: pass, so that no job can stop the loop', false], ['except Exception: print("job failed"), then go on', false], ['except Exception: log.exception("job %s", job_id)', true], ['except BaseException: log.error("job failed")', false]],
        'log.exception records the message and the full traceback at ERROR level, and except Exception still lets Ctrl+C and sys.exit through. The others hide the cause or catch BaseException.'),
      ck(S, `What does this print?

    def check(qty):
        if qty < 0:
            raise ValueError(f"qty {qty}")
        return qty

    results = []
    for q in (2, -1, 3):
        try:
            results.append(check(q))
        except ValueError as e:
            results.append(str(e))
    print(results)`,
        [["[2, 'qty -1', 3]", true], ['[2, 3]', false], ["[2, 'qty -1']", false], ["[2, ValueError('qty -1'), 3]", false]],
        'check(-1) raises, the handler appends the message text instead, and the loop continues to 3. The exception is caught inside the loop, so it does not stop it.'),
    ],
  },
];
