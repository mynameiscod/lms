/**
 * Unit-specific content for the Programming spine: conditions and functions.
 *
 * ── WHY THESE TOPICS FIRST ────────────────────────────────────────────────────────────────
 *
 * Prerequisite order, not module order. Almost everything later in Year 1 — DSA, databases,
 * the web track, every project — assumes a student can already express a decision and name a
 * piece of work. A unit authored before the units it depends on would be content nobody can
 * reach, and the composer would prove it by never scheduling it.
 *
 * ── THE BAR EACH BUNDLE HAS TO CLEAR ──────────────────────────────────────────────────────
 *
 * Written against ONE unit's title, description and stated learning outcomes. The test a
 * reviewer should apply: move this text to a sibling unit and it must become obviously wrong.
 * "Conditions let you make decisions" passes schema validation and fails that test, which is
 * why the duplication detector in contentDuplicationService is run over the result rather than
 * trusted to the author.
 *
 * ── WHAT IS DELIBERATELY ABSENT ───────────────────────────────────────────────────────────
 *
 * No video. A row pointing at a URL nobody has filmed raises a readiness number and teaches
 * nobody, and Foundation V1 treats video as optional for exactly that reason. The gap is
 * reported by the readiness audit instead of papered over.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

/* ══════════════════════════════════════════════════════════════════════════════════════════
 * T_CONDITIONS — deciding between alternatives
 * ════════════════════════════════════════════════════════════════════════════════════════ */

export const CONDITIONS_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'T_CONDITIONS_IF',
    notes: `Everything you have written so far runs top to bottom, every line, every time. \`if\` is
the first construct that lets a program *not* do something.

    age = 20
    if age >= 18:
        print("You may vote.")

The expression after \`if\` is evaluated once. If it is true, the indented block runs; if it is
false, the block is skipped entirely and execution continues after it. Nothing else happens —
there is no "else" here, so a seventeen-year-old simply sees no output at all.

**Indentation is the block.** In Python there are no braces. The lines belonging to the \`if\` are
exactly the lines indented under it, and the first line that returns to the outer indentation is
outside the condition again:

    if age >= 18:
        print("You may vote.")
        print("Bring ID.")
    print("Next, please.")

The first two lines are conditional. The third always runs. Getting this wrong is the single most
common early mistake, and it produces a program that is *silently* wrong rather than one that
crashes.

**A condition is an expression that produces a boolean.** \`age >= 18\` is not a special piece of
if-syntax; it is an ordinary comparison you could have written on its own:

    over_18 = age >= 18      # True
    if over_18:
        ...

Comparisons available to you: \`==\` equal, \`!=\` not equal, \`<\`, \`<=\`, \`>\`, \`>=\`.

**\`=\` is not \`==\`.** One assigns, the other compares. Python refuses \`if age = 18:\` outright, which
is a kindness — in C the same line compiles and quietly assigns.`,
    workedExample: `**Goal: charge a lower fare to passengers under twelve.**

Start with what the program must decide. There is one decision — is this passenger a child? — so
there is one condition.

    age = int(input("Age: "))
    fare = 100

    if age < 12:
        fare = 50

    print("Fare:", fare)

Trace it with \`age = 8\`:

1. \`fare\` becomes 100.
2. \`8 < 12\` is True, so the block runs and \`fare\` becomes 50.
3. \`print\` reports 50.

Now trace \`age = 30\`:

1. \`fare\` becomes 100.
2. \`30 < 12\` is False, so the block is skipped.
3. \`print\` reports 100.

Notice the shape: the default was set *before* the condition, and the condition only overrides it.
That is why no \`else\` is needed. A beginner often writes the same thing as two branches, which
works but says the same thing twice and gives two places to edit when the full fare changes.

One more trace, \`age = 12\`: \`12 < 12\` is False, so a twelve-year-old pays full fare. Is that what
the brief meant by "under twelve"? Yes — and this is exactly the boundary worth checking every
time you write a comparison.`,
    mcqs: [
      mcq('What does a program do when an `if` condition is false and there is no `else`?',
        [['Skips the indented block and carries on with the next unindented line', true],
          ['Stops the program', false],
          ['Runs the block once anyway', false],
          ['Raises an error', false]],
        'A bare `if` is "do this only sometimes". False simply means the block contributes nothing; execution continues normally after it.'),
      mcq('Which line always prints, whatever `n` is?\n\n    if n > 0:\n        print("A")\n        print("B")\n    print("C")',
        [['C', true], ['A and B', false], ['B and C', false], ['All three', false]],
        'A and B are indented under the `if`, so they are the conditional block. C returns to the outer level and is therefore outside the condition.'),
      mcq('Why does Python reject `if score = 10:`?',
        [['`=` assigns a value; a condition needs a comparison, which is `==`', true],
          ['Conditions cannot mention numbers', false],
          ['`score` must be a boolean', false],
          ['The colon is in the wrong place', false]],
        'Assignment is a statement, not an expression producing a boolean. Python refuses it here on purpose — in C the equivalent compiles and silently assigns.'),
      mcq('`if temperature > 30:` — what is the type of `temperature > 30`?',
        [['A boolean, True or False', true],
          ['A number', false],
          ['A string', false],
          ['It has no type; it is if-syntax', false]],
        'It is an ordinary expression you could assign to a variable. `if` merely consumes the boolean it produces.'),
    ],
    checkpoint: [
      mcq('A passenger aged exactly 12 with `if age < 12:` pays which fare?',
        [['Full fare, since `12 < 12` is False', true],
          ['Child fare, because 12 is the stated cut-off', false],
          ['It depends on what the else branch does', false],
          ['The program raises an error on the boundary', false]],
        'Boundary values are where comparison bugs live. `<` excludes the boundary; `<=` would include it.'),
      mcq('What is wrong with this?\n\n    if balance >= amount:\n    print("Approved")',
        [['The block under `if` is not indented, so Python raises IndentationError', true],
          ['`>=` should be `>`, since a balance equal to the amount cannot pay it', false],
          ['It needs an else branch, because Python requires both outcomes', false],
          ['Nothing; Python accepts a one-line body here', false]],
        'Indentation is how Python delimits the block. A colon with nothing indented after it has no body.'),
    ],
  },
  {
    unitCode: 'T_CONDITIONS_ELSE',
    notes: `A bare \`if\` handles "sometimes do this". \`else\` handles "otherwise do that instead", and
\`elif\` handles the case where there are more than two possibilities.

    if score >= 50:
        print("Pass")
    else:
        print("Fail")

Exactly one of the two blocks runs. Never both, never neither.

**\`elif\` is a chain, and the chain stops at the first match.**

    if score >= 75:
        grade = "Distinction"
    elif score >= 50:
        grade = "Pass"
    else:
        grade = "Fail"

With \`score = 80\`, the first test is true, \`grade\` becomes "Distinction", and *the rest of the
chain is never evaluated*. This is the property that makes order load-bearing.

**Order matters, and getting it backwards produces a program that runs perfectly and is wrong.**
Reverse the two tests:

    if score >= 50:
        grade = "Pass"
    elif score >= 75:
        grade = "Distinction"

Now \`score = 80\` matches the first branch and is graded "Pass". The \`elif\` is unreachable — not
by 80, not by anything, because every score that satisfies \`>= 75\` also satisfies \`>= 50\`. No
error is raised. Nobody gets a Distinction, ever.

The rule that prevents it: **in a chain of overlapping thresholds, order from most restrictive to
least.**

**A chain of separate \`if\`s is not the same thing.**

    if score >= 75: grade = "Distinction"
    if score >= 50: grade = "Pass"

Each is independent, so both run for 80 and the second overwrites the first. \`elif\` exists
precisely to say "these are alternatives", and it is also faster, because it stops testing.`,
    workedExample: `**Goal: convert a percentage to a letter grade — A (≥80), B (≥65), C (≥50), F below.**

Write the boundaries out first, highest to lowest: 80, 65, 50, everything else. That ordering *is*
the chain.

    marks = int(input("Marks: "))

    if marks >= 80:
        grade = "A"
    elif marks >= 65:
        grade = "B"
    elif marks >= 50:
        grade = "C"
    else:
        grade = "F"

    print(grade)

Trace \`marks = 67\`:

1. \`67 >= 80\` — False. Move on.
2. \`67 >= 65\` — True. \`grade = "B"\`. **The chain ends here**; the \`>= 50\` test is never run.
3. Print B.

Now deliberately break it by moving the C test to the top:

    if marks >= 50:
        grade = "C"
    elif marks >= 65:
        grade = "B"
    ...

Trace \`marks = 90\`: the first test is true, so grade is "C" and the program stops testing. A
ninety becomes a C, with no error and no warning. Every branch below the first is dead code.

The check to run on any chain you write: take the *highest* value you expect and walk the tests in
order. If it matches something other than the top branch, the order is wrong.`,
    mcqs: [
      mcq('How many blocks run in a single if / elif / elif / else chain?',
        [['Exactly one', true], ['All that are true', false], ['At most two', false], ['None if the first is false', false]],
        'The chain is a set of alternatives. The first true test wins and the rest are not evaluated; `else` catches everything unmatched.'),
      mcq('Why is `elif marks >= 75` unreachable after `if marks >= 50`?',
        [['Every value that satisfies >= 75 already satisfies >= 50, so the first branch always claims it', true],
          ['`elif` cannot follow a `>=` test', false],
          ['75 is greater than 50', false],
          ['It is reachable', false]],
        'Overlapping thresholds must be ordered most restrictive first. Otherwise the looser test shadows the tighter one completely.'),
      mcq('Replacing `elif` with a second `if` changes the behaviour how?',
        [['Both tests are evaluated, so a later assignment can overwrite an earlier one', true],
          ['No change at all', false],
          ['The second becomes unreachable', false],
          ['It raises a SyntaxError', false]],
        'Separate `if`s are independent statements. `elif` says "only if nothing above matched", which is both the meaning you want and less work.'),
      mcq('For the A/B/C/F chain above, which input proves the ordering is correct?',
        [['A high value like 90 — it must reach the top branch, not a lower one', true],
          ['0, because it must be F', false],
          ['A negative number', false],
          ['Any value; ordering cannot be tested', false]],
        'The failure mode is a loose test shadowing a strict one, so the diagnostic input is the one that should match the strictest branch.'),
    ],
    checkpoint: [
      mcq('`score = 50` against: `if score > 50: "Pass" elif score == 50: "Borderline" else: "Fail"`',
        [['Borderline', true], ['Pass', false], ['Fail', false], ['Both Pass and Borderline', false]],
        '`50 > 50` is False, so the chain moves to the next test, which matches exactly.'),
      mcq('A grading chain gives everyone the same grade regardless of marks. Most likely cause?',
        [['The loosest condition is first, so it claims every input', true],
          ['The `else` branch is missing, so the last case never runs', false],
          ['The marks are not integers, so the comparisons never match', false],
          ['Indentation, which has put the branches inside one another', false]],
        'One branch claiming everything is the signature of a mis-ordered chain — the widest test placed at the top.'),
    ],
  },
  {
    unitCode: 'T_CONDITIONS_BOOLEAN_OPERATORS',
    notes: `One condition answers one question. \`and\`, \`or\` and \`not\` let you ask a compound one.

    if age >= 18 and has_id:
        print("Entry allowed")

- \`A and B\` is true only when **both** are true.
- \`A or B\` is true when **at least one** is true — including when both are.
- \`not A\` flips a boolean.

**\`or\` is inclusive.** Everyday English often means "one or the other, not both"; Python never
does. \`raining or cold\` is true on a day that is both.

**The trap: you cannot omit the left-hand side.**

    if day == "Saturday" or "Sunday":     # WRONG — and it does not crash

Python reads this as \`(day == "Saturday") or ("Sunday")\`. A non-empty string is truthy, so the
right-hand side is always true, so the whole condition is always true. Every day is a weekend.
The correct form repeats the variable:

    if day == "Saturday" or day == "Sunday":

or, better, uses membership:

    if day in ("Saturday", "Sunday"):

**Short-circuiting.** \`and\` stops as soon as it finds a false; \`or\` stops as soon as it finds a
true. This is not just an optimisation — it is how you write a safe guard:

    if n != 0 and total / n > 5:

If \`n\` is zero the left side is false, the right side is never evaluated, and the division never
happens. Swap the order and you get a ZeroDivisionError.

**Precedence: \`not\` binds tightest, then \`and\`, then \`or\`.** So \`a or b and c\` means
\`a or (b and c)\`. When a condition mixes the two, parenthesise it even where you do not have to —
the reader should not have to remember the table.`,
    workedExample: `**Goal: a library allows borrowing if the member is active AND has fewer than 5 books out, OR is a staff member.**

Translate the sentence clause by clause, then bracket according to the English.

    can_borrow = (active and books_out < 5) or staff

The parentheses are doing real work. Without them, precedence still groups \`and\` first, so it
happens to mean the same thing — but the reader has to know that. Write them.

Trace three members:

| active | books_out | staff | (active and books_out<5) | or staff | result |
|---|---|---|---|---|---|
| True | 2 | False | True | True or False | **True** |
| True | 7 | False | False | False or False | **False** |
| False | 9 | True | False | False or True | **True** |

The third row is the interesting one: a staff member borrows even while inactive with nine books
out. Is that the rule the library wanted? The English said so. If it did not, the fix is not a new
operator — it is a corrected sentence:

    can_borrow = staff or (active and books_out < 5 and books_out >= 0)

Now the guard case. Suppose the limit depends on an average:

    if books_out > 0 and total_days / books_out > 30:

Written in this order, a member with zero books never reaches the division. Reversed, they crash.
Short-circuiting is the whole reason the order is not arbitrary.`,
    mcqs: [
      mcq('`if day == "Sat" or "Sun":` — why is this always true?',
        [['It parses as `(day == "Sat") or ("Sun")`, and the non-empty string "Sun" is truthy', true],
          ['`or` is not allowed with strings', false],
          ['It compares day to both correctly', false],
          ['It raises a TypeError', false]],
        'Each side of `or` is evaluated independently. The bare string is a truthy value, not a comparison, so the whole expression can never be false.'),
      mcq('Why does `if n != 0 and total / n > 5:` never divide by zero?',
        [['`and` short-circuits: a false left side means the right side is never evaluated', true],
          ['Python catches the error silently', false],
          ['Division by zero returns 0', false],
          ['It does divide by zero', false]],
        'Short-circuit evaluation is what makes a guard clause work, and it is why the order of the two operands is not interchangeable.'),
      mcq('`a or b and c` groups as:',
        [['`a or (b and c)`', true], ['`(a or b) and c`', false], ['Left to right', false], ['It is a SyntaxError', false]],
        '`and` binds tighter than `or`. Correct, easy to misread, and the reason to parenthesise mixed expressions anyway.'),
      mcq('`raining or cold` on a day that is both raining and cold evaluates to:',
        [['True — `or` is inclusive', true], ['False', false], ['An error', false], ['Depends on order', false]],
        'Everyday English often means exclusive-or; Python never does. Both-true still satisfies `or`.'),
    ],
    checkpoint: [
      mcq('Rewrite `if x == 1 or x == 2 or x == 3:` most clearly as:',
        [['`if x in (1, 2, 3):`', true],
          ['`if x == 1 or 2 or 3:`', false],
          ['`if x == (1, 2, 3):`', false],
          ['`if x and 1, 2, 3:`', false]],
        'Membership says the intent directly. The second option is the classic bug — it is always true.'),
      mcq('`not (a and b)` is equivalent to:',
        [['`(not a) or (not b)`', true], ['`(not a) and (not b)`', false], ['`a or b`', false], ['`not a and b`', false]],
        "De Morgan's law. Negating an `and` flips it to an `or` and negates both sides."),
    ],
  },
  {
    unitCode: 'T_CONDITIONS_NESTING',
    notes: `A nested condition is an \`if\` inside the block of another \`if\`. It is the right tool when
the inner question **only makes sense** once the outer one is settled.

    if logged_in:
        if is_admin:
            show_admin_panel()

Asking whether somebody is an admin is meaningless before you know they are logged in, so the
nesting reflects a real dependency.

**Most nesting is not like that.** This is the common case:

    if age >= 18:
        if has_id:
            allow()

Here the two questions are independent — both must simply be true. Nesting states that as a
hierarchy it does not have, and it costs a level of indentation for nothing. Flattened:

    if age >= 18 and has_id:
        allow()

**The test for whether nesting is earned:** can the inner condition be evaluated on its own, at
the top of the function, without the outer one being true? If yes, it is an \`and\` wearing a
disguise.

**The other cure is the guard clause — return early.** Deep nesting usually appears when several
things must be checked before the real work:

    def withdraw(account, amount):
        if account.active:
            if amount > 0:
                if account.balance >= amount:
                    account.balance -= amount
                    return "ok"
                else:
                    return "insufficient funds"
            else:
                return "invalid amount"
        else:
            return "account closed"

Every \`else\` is far from the \`if\` it belongs to, and the one line that matters is buried four
levels deep. Inverted:

    def withdraw(account, amount):
        if not account.active:
            return "account closed"
        if amount <= 0:
            return "invalid amount"
        if account.balance < amount:
            return "insufficient funds"

        account.balance -= amount
        return "ok"

Same logic, no nesting, and each failure sits next to its reason. **Handle the exceptional cases
first and leave the main path unindented at the bottom** — that is the shape to reach for.`,
    workedExample: `**Goal: flatten a discount rule that arrived three levels deep.**

The original:

    if customer_type == "member":
        if order_total > 1000:
            if not used_coupon:
                discount = 15
            else:
                discount = 10
        else:
            discount = 5
    else:
        discount = 0

Step one — ask of each nesting whether the inner question depends on the outer. \`order_total >
1000\` is perfectly meaningful for a non-member; so is \`used_coupon\`. None of the nesting is
earned; it is three independent tests arranged as a tree.

Step two — enumerate the outcomes as a flat table:

| member | >1000 | coupon | discount |
|---|---|---|---|
| no | — | — | 0 |
| yes | no | — | 5 |
| yes | yes | yes | 10 |
| yes | yes | no | 15 |

Step three — write the table as a chain, most specific first:

    if customer_type != "member":
        discount = 0
    elif order_total <= 1000:
        discount = 5
    elif used_coupon:
        discount = 10
    else:
        discount = 15

Four lines of logic, one level of indentation, and the table can be read straight off it. The
non-member case is now a guard at the top — the same early-return shape, expressed as the first
link of a chain.

A caution: flattening is only safe when you have enumerated the outcomes. Rewriting by eye and
"simplifying" is how a branch quietly changes meaning. Build the table first.`,
    mcqs: [
      mcq('When is nesting genuinely the right structure?',
        [['When the inner condition is meaningless unless the outer one is true', true],
          ['Whenever there are two conditions', false],
          ['When the conditions use different variables', false],
          ['Never', false]],
        'Nesting expresses dependency. Two independent conditions that must both hold are an `and`, and writing them as a tree claims a hierarchy that is not there.'),
      mcq('`if a:` containing only `if b:` containing `do()` is equivalent to:',
        [['`if a and b: do()`', true], ['`if a or b: do()`', false], ['`if not a: do()`', false], ['Nothing simpler', false]],
        'A nested `if` with no `else` at either level is exactly a conjunction, and the flat form makes that visible.'),
      mcq('What does a guard clause do to the main path of a function?',
        [['Leaves it unindented at the bottom, after the exceptional cases have returned', true],
          ['Wraps it in a try block', false],
          ['Moves it into a nested else', false],
          ['Deletes the error handling', false]],
        'Returning early on each failure means the remaining code has already earned the right to run, so it needs no indentation.'),
      mcq('Before flattening a three-level condition, the safe first step is:',
        [['Enumerate every combination of outcomes as a table', true],
          ['Rename the variables', false],
          ['Add comments', false],
          ['Rewrite it by eye and test afterwards', false]],
        'Flattening by eye is how a branch silently changes meaning. The table is the specification the flat version must reproduce.'),
    ],
    checkpoint: [
      mcq('Rewrite with guard clauses:\n\n    if file_exists:\n        if readable:\n            process()\n        else:\n            return "unreadable"\n    else:\n        return "missing"',
        [['Return early on each failure, then `process()` with no nesting left', true],
          ['`if file_exists and readable: process()`, with no other branches', false],
          ['Leave it as it is; two levels of nesting is already clear enough', false],
          ['Swap the two conditions, so the cheaper test is evaluated first', false]],
        'The second option loses both error messages. Guard clauses keep each failure beside its reason and unindent the real work.'),
      mcq('A function has five levels of indentation before its first useful line. The likeliest fix is:',
        [['Invert the checks into early returns', true],
          ['Add more comments', false],
          ['Combine everything into one long `and`', false],
          ['Split it across two files', false]],
        'A single long `and` loses the distinct failure reasons. Inverting preserves them and removes the nesting.'),
    ],
  },
  {
    unitCode: 'T_CONDITIONS_TRUTHINESS',
    notes: `\`if\` does not require a boolean. It requires something Python can *interpret* as one, and
every value in the language can be interpreted.

**Falsy values — the complete list for what you will meet this year:**

    False, None, 0, 0.0, "" (empty string), [] (empty list),
    {} (empty dict), () (empty tuple), set()

**Everything else is truthy.** Including \`"False"\`, \`"0"\`, \`[0]\` and \`-1\`. The rule is "empty or
zero is false", not "looks negative is false".

This is why the idiomatic emptiness check is short:

    if not items:
        print("Nothing to show")

rather than \`if len(items) == 0:\`. Both work; the first is what Python programmers write.

**Where it bites: a valid zero.**

    def apply_discount(price, discount):
        if discount:
            return price - discount
        return price

Pass \`discount = 0\` and the branch is skipped — which happens to be right here. But the same
shape elsewhere is a real bug:

    if quantity:
        record(quantity)

An order of 0 items is a legitimate value that this silently drops. When zero is meaningful, test
for what you actually mean:

    if quantity is not None:

**\`None\` is not \`False\`, and \`==\` is not \`is\`.** \`None\` means "no value"; \`False\` is a value. Use
\`is None\` / \`is not None\` for the first — identity, not equality, because \`None\` is a singleton
and because a custom \`__eq__\` can lie about equality.

**The trap that reads correctly and is not:**

    if value == True:

For \`value = 1\` this is true, because \`1 == True\`. For \`value = "yes"\` it is false, even though
\`"yes"\` is truthy. Never compare to \`True\` — write \`if value:\` and mean it.`,
    workedExample: `**Goal: find the bug in a search function that "sometimes returns nothing".**

    def find_user(users, name):
        match = [u for u in users if u["name"] == name]
        if match:
            return match[0]
        return None

    def greet(users, name):
        user = find_user(users, name)
        if user:
            print("Hello,", user["name"])
        else:
            print("Not found")

This looks fine and mostly works. Now add a user whose record is legitimately empty of extras:

    users = [{"name": "Asha", "tags": []}, {"name": "", "id": 7}]

Call \`greet(users, "")\`. \`find_user\` finds the record with the empty name and returns
\`{"name": "", "id": 7}\` — a non-empty dict, therefore truthy — so \`if user:\` passes and it prints
\`Hello, \`. Slightly odd, but not the bug.

The real failure is one level up. Change \`find_user\` to return the *name* instead of the record:

    return match[0]["name"]

Now \`greet\` receives \`""\`, which is falsy, so it prints "Not found" for a user that was found.
The function did its job; the caller's truthiness test destroyed the answer.

The fix is to test for the thing you mean:

    user = find_user(users, name)
    if user is not None:
        print("Hello,", user)
    else:
        print("Not found")

**The general rule this illustrates:** truthiness is safe when the only two states are "something"
and "nothing". The moment a legitimate value can itself be empty or zero, test against \`None\`
explicitly.`,
    mcqs: [
      mcq('Which of these is TRUTHY?',
        [['"0"', true], ['0', false], ['[]', false], ['None', false]],
        'A string containing the character zero is a non-empty string. Emptiness, not appearance, decides truthiness.'),
      mcq('`if not items:` is the idiomatic way to test that a list is:',
        [['Empty', true], ['Full', false], ['Sorted', false], ['Not None', false]],
        'An empty list is falsy, so `not items` is True exactly when it is empty. Note it is also True when `items` is None — which is sometimes a bug.'),
      mcq('Why is `if quantity:` a risky test for an order quantity?',
        [['A legitimate quantity of 0 is falsy and would be silently skipped', true],
          ['Integers cannot be used in conditions', false],
          ['It raises a TypeError for 0', false],
          ['It is not risky', false]],
        'Zero is a meaningful quantity. When zero is valid data rather than absence, test `is not None` instead.'),
      mcq('Why prefer `if x is None:` over `if x == None:`?',
        [['None is a singleton, so identity is the exact question — and a custom `__eq__` cannot lie about it', true],
          ['`==` does not work with None', false],
          ['`is` is faster to type', false],
          ['They differ only in style', false]],
        'Identity asks "is this the None object". Equality asks a class to answer, and a class can answer wrongly.'),
    ],
    checkpoint: [
      mcq('`value = 0` — which prints?\n\n    if value:\n        print("A")\n    elif value is not None:\n        print("B")\n    else:\n        print("C")',
        [['B', true], ['A', false], ['C', false], ['Nothing', false]],
        '0 is falsy so the first test fails, but 0 is not None, so the second succeeds. This pair is exactly how you separate "zero" from "absent".'),
      mcq('`if flag == True:` behaves differently from `if flag:` when flag is:',
        [['"yes" — truthy, but not equal to True', true],
          ['True', false],
          ['False', false],
          ['They never differ', false]],
        'Comparing to True tests equality with the boolean, not truthiness. Any truthy non-boolean fails it.'),
    ],
  },
  {
    unitCode: 'T_CONDITIONS_DEBUGGING',
    notes: `Conditions fail in a way that makes them harder to debug than most code: **a wrong
condition usually does not crash.** It runs, produces an answer, and the answer is wrong. There is
no traceback to read, so you need a method rather than a stack trace.

**The four failures, and what each looks like from outside.**

1. **Inverted comparison.** \`<\` where \`>\` was meant. Symptom: the behaviour is exactly backwards
   — everybody passes who should fail.
2. **Wrong boundary.** \`<\` where \`<=\` was meant. Symptom: correct for almost every input and
   wrong for exactly one value. This is why boundary inputs are the first thing to test.
3. **Mis-ordered chain.** A loose test above a strict one. Symptom: one branch claims everything
   below it; some branch is never reached by any input.
4. **Always-true condition.** Usually \`x == 1 or 2\`. Symptom: the branch runs for every input,
   including obviously wrong ones.

**The method: do not edit. Observe first.**

The instinct when a condition misbehaves is to flip an operator and re-run. That sometimes works,
which is the problem — it teaches you nothing and often moves the bug. Instead:

    print(f"score={score!r} type={type(score)} test={score >= 50}")

Print three things: the **value**, its **type**, and the **result of the comparison itself**. Most
condition bugs are visible in that one line, because they are one of:

- the value is not what you assumed (\`'50'\` as a string, not \`50\`)
- the type is not what you assumed (\`input()\` always returns \`str\`; \`"9" > "10"\` is True, because
  strings compare character by character)
- the comparison is right and the *branch* is the problem

**Then bisect the truth table.** For a compound condition, print each operand separately:

    print(active, books_out < 5, staff)

One of them is not what you expected. You now know which clause to look at, rather than staring at
the whole expression.

**Finally, test the boundary deliberately.** For any threshold \`n\`, run \`n-1\`, \`n\` and \`n+1\`. Off-by-
one is the most common condition bug in existence and those three inputs catch it every time.`,
    workedExample: `**A broken program. Diagnose it without changing anything at random.**

The brief: print "Eligible" for applicants aged 18 to 60 inclusive.

    age = input("Age: ")

    if age >= 18 and age <= 60:
        print("Eligible")
    else:
        print("Not eligible")

Running it with 25 gives:

    TypeError: '>=' not supported between instances of 'str' and 'int'

This one does crash, and the traceback names the cause precisely: a \`str\` is being compared to an
\`int\`. \`input()\` returns text, always. Fix:

    age = int(input("Age: "))

Now it runs. Test the boundaries — 17, 18, 60, 61:

| input | expected | actual |
|---|---|---|
| 17 | Not eligible | Not eligible |
| 18 | Eligible | Eligible |
| 60 | Eligible | Eligible |
| 61 | Not eligible | Not eligible |

Correct. Now a second version of the same brief that does **not** crash:

    if age > 18 and age < 60:

Run the same four inputs: 18 gives "Not eligible" and 60 gives "Not eligible". Both wrong, and
nothing reports it. The word in the brief was *inclusive*, and \`>\` / \`<\` exclude the boundary.

Notice what found it: not reading the code, but running the boundary values. Had we tested only
25 and 70, both versions would have looked identical and correct.

**One more, the silent kind:**

    if age >= 18 or age <= 60:

Every integer satisfies at least one of these, so everybody is eligible — a five-year-old
included. The diagnostic: print the operands.

    print(age >= 18, age <= 60)      # 5 -> False True

\`False or True\` is True. The bug is the operator, not the numbers, and one print line showed it.`,
    coding: [
      {
        title: 'Diagnose and repair a grading chain',
        description: `This function is meant to return "A" for 80+, "B" for 65-79, "C" for 50-64 and "F" below 50. Every input currently returns the same grade.

Do not rewrite it from scratch. First work out WHY the wrong branch is chosen, then make the smallest change that fixes it.`,
        starter: `def grade(marks):
    if marks >= 50:
        return "C"
    elif marks >= 65:
        return "B"
    elif marks >= 80:
        return "A"
    else:
        return "F"

print(grade(int(input())))`,
        language: 'python',
        tests: [
          { input: '90', expectedOutput: 'A' },
          { input: '70', expectedOutput: 'B' },
          { input: '55', expectedOutput: 'C' },
          { input: '20', expectedOutput: 'F' },
          { input: '80', expectedOutput: 'A', isHidden: true },
          { input: '65', expectedOutput: 'B', isHidden: true },
          { input: '50', expectedOutput: 'C', isHidden: true },
        ],
      },
    ],
    mcqs: [
      mcq('A condition produces the wrong answer but no error. What does that tell you?',
        [['The expression is valid Python; the logic is wrong, so there is no traceback to read', true],
          ['The interpreter is faulty', false],
          ['There is a missing import', false],
          ['The variable is undefined', false]],
        'This is what makes condition bugs distinctive: they are semantically wrong and syntactically fine, so observation replaces the stack trace.'),
      mcq('`age = input("Age: ")` then `if age >= 18:` raises a TypeError. Why?',
        [['`input()` returns a string, and a string cannot be compared to an integer with >=', true],
          ['`age` is undefined', false],
          ['18 must be quoted', false],
          ['The prompt is too long', false]],
        'Every value from `input()` is text. Converting at the point of input is the fix; converting at the point of comparison scatters the same conversion everywhere.'),
      mcq('Which three inputs best test a threshold at 50?',
        [['49, 50, 51', true], ['0, 50, 100', false], ['1, 2, 3', false], ['50 only', false]],
        'Off-by-one lives exactly at the boundary. Values far from it pass under both correct and incorrect operators.'),
      mcq('The best first debugging action for a misbehaving compound condition is:',
        [['Print each operand separately to see which one is not what you assumed', true],
          ['Flip the operator and re-run', false],
          ['Delete the else branch', false],
          ['Add a try/except', false]],
        'Flipping operators sometimes works, which is why it is dangerous — it teaches nothing and often relocates the bug.'),
    ],
    checkpoint: [
      mcq('`if x == 1 or 2:` runs for every input. The cause is:',
        [['`2` is evaluated as a truthy value in its own right, not as a comparison', true],
          ['`or` behaves differently with numbers than it does with booleans', false],
          ['`x` is a string, so the comparison with 1 is never going to match', false],
          ['Missing parentheses around `x == 1`, which changes the precedence', false]],
        'Each side of `or` is a separate expression. A bare non-zero literal is always truthy, so the whole condition can never be false.'),
      mcq('`"9" > "10"` evaluates to True. Why?',
        [['Strings compare character by character, and "9" comes after "1"', true],
          ['Python compares the lengths of the two strings before their content', false],
          ['It is a long-standing bug in how Python orders numeric strings', false],
          ['It evaluates to False, because 9 is smaller than 10 numerically', false]],
        'Lexicographic comparison, not numeric. It is the classic symptom of forgetting to convert input, and it produces wrong answers without crashing.'),
    ],
  },
  {
    unitCode: 'T_CONDITIONS_PRACTICE',
    notes: `No new ideas in this unit. Everything below uses \`if\`, \`elif\`, \`else\`, the comparison
operators, \`and\` / \`or\` / \`not\`, and truthiness — and nothing else.

The purpose is fluency. A construct you can explain but have to think about is not yet a tool;
the point of repetition is to get conditions to the stage where they cost no attention, so the
attention is available for the problem.

**Work these without looking anything up.** If you find yourself checking what \`elif\` does, stop
and re-read that unit rather than pushing through — practice cements whatever you are doing,
including the wrong thing.

**A checklist to apply to every answer before you run it:**

1. What is the type of each value being compared? \`input()\` gives text.
2. Is each boundary \`<\` or \`<=\`? Say the brief's wording out loud: "under", "at least", "up to".
3. If there is a chain, is the strictest test first?
4. If there is an \`or\`, does each side repeat the variable?
5. What happens at exactly the boundary, and at zero, and at empty?

**Trace before running.** Pick one input, walk the branches on paper, write down the answer you
expect, and only then run it. When the two disagree you have learned something; when you run
first you have only learned what the program does.`,
    mcqs: [
      mcq('A shop gives free delivery on orders of at least 500. Which condition is right?',
        [['`if total >= 500:`', true], ['`if total > 500:`', false], ['`if total <= 500:`', false], ['`if total = 500:`', false]],
        '"At least" includes the boundary, so `>=`. An order of exactly 500 must qualify.'),
      mcq('`x = 5` — what does this print?\n\n    if x > 10:\n        print("big")\n    elif x > 3:\n        print("medium")\n    elif x > 1:\n        print("small")',
        [['medium', true], ['small', false], ['medium and small', false], ['nothing', false]],
        'The chain stops at the first true test. `5 > 3` matches, so `x > 1` is never evaluated even though it is also true.'),
      mcq('Which correctly tests that a year is a leap year?',
        [['`(year % 4 == 0 and year % 100 != 0) or year % 400 == 0`', true],
          ['`year % 4 == 0`', false],
          ['`year % 4 == 0 or year % 100 == 0`', false],
          ['`year % 4 == 0 and year % 400 == 0`', false]],
        'Divisible by 4, except centuries, except those divisible by 400. 1900 is not a leap year; 2000 is — test both against each option.'),
      mcq('A user must be 13 or older AND have a parent email if under 18. Which is right?',
        [['`if age >= 13 and (age >= 18 or parent_email):`', true],
          ['`if age >= 13 and age >= 18 and parent_email:`', false],
          ['`if age >= 13 or parent_email:`', false],
          ['`if age >= 18 and parent_email:`', false]],
        'The second locks out every adult without a parent email. The parenthesised `or` says "either already an adult, or has consent".'),
      mcq('`password` must be non-empty and at least 8 characters. Safest order?',
        [['`if password and len(password) >= 8:`', true],
          ['`if len(password) >= 8 and password:`', false],
          ['`if len(password) >= 8:`', false],
          ['`if password:`', false]],
        'If `password` could be None, `len(None)` raises. Testing truthiness first short-circuits and protects the call.'),
      mcq('Which value makes `if not items:` True?',
        [['`[]`', true], ['`[0]`', false], ['`["a"]`', false], ['`[False]`', false]],
        'Only the empty list is falsy. A list containing a falsy element is still a non-empty list.'),
    ],
    coding: [
      {
        title: 'Ticket pricing with three rules',
        description: `Read an age from input and print the ticket price.

- Under 5: 0
- 5 to 17 inclusive: 60
- 18 to 59 inclusive: 120
- 60 and over: 80

Print only the number. Get the boundaries exactly right — 5, 17, 18, 59 and 60 are all tested.`,
        starter: `age = int(input())
# your code here`,
        language: 'python',
        tests: [
          { input: '3', expectedOutput: '0' },
          { input: '5', expectedOutput: '60' },
          { input: '17', expectedOutput: '60' },
          { input: '18', expectedOutput: '120' },
          { input: '59', expectedOutput: '120', isHidden: true },
          { input: '60', expectedOutput: '80', isHidden: true },
          { input: '4', expectedOutput: '0', isHidden: true },
        ],
      },
      {
        title: 'Classify a number without a chain that lies',
        description: `Read an integer and print exactly one of: "negative", "zero", "small" (1-9), "large" (10 or more).

The obvious mistakes here are a mis-ordered chain and a boundary that excludes 10. Trace 0, 1, 9 and 10 before you run it.`,
        starter: `n = int(input())
# your code here`,
        language: 'python',
        tests: [
          { input: '-4', expectedOutput: 'negative' },
          { input: '0', expectedOutput: 'zero' },
          { input: '1', expectedOutput: 'small' },
          { input: '9', expectedOutput: 'small' },
          { input: '10', expectedOutput: 'large' },
          { input: '999', expectedOutput: 'large', isHidden: true },
          { input: '-1', expectedOutput: 'negative', isHidden: true },
        ],
      },
    ],
    checkpoint: [
      mcq('You have written a chain and one branch never runs for any input. The cause is almost always:',
        [['A looser condition placed above a stricter one', true],
          ['A missing else', false],
          ['Wrong indentation', false],
          ['The branch is unnecessary', false]],
        'An unreachable branch is the signature of a mis-ordered chain — every value that would have matched it was already claimed above.'),
      mcq('Before running any conditional you have just written, the most valuable habit is:',
        [['Pick an input, predict the branch on paper, then compare with what runs', true],
          ['Run it and read the output, which shows which branch was taken', false],
          ['Add a print statement in every branch before running it once', false],
          ['Wrap it in a try/except so a wrong branch cannot crash anything', false]],
        'Running first tells you what the program does. Predicting first tells you whether your model of it is right, which is the thing being trained.'),
    ],
  },
  {
    unitCode: 'T_CONDITIONS_MINI_PROJECT',
    notes: `You have the whole of conditions now: \`if\`, \`elif\`, \`else\`, comparisons, boolean
operators, truthiness and the debugging method. This unit is one small program built end to end
and then explained.

**Why building beats another exercise.** A practice question hands you the decision structure —
"print A if x > 5". A real brief does not. It describes behaviour in English and leaves you to
work out how many decisions there are, what order they go in, and which boundaries are inclusive.
That translation step is the actual skill, and it only appears when nobody has done it for you.

**The shape of the work.**

1. **Read the brief and list the decisions.** Write them as plain sentences before any code. If
   you cannot list them, you do not yet understand the brief — go back to it.
2. **Decide the order.** Overlapping thresholds run strictest first. Independent checks that must
   all hold become one \`and\`. Exceptional cases become guard clauses at the top.
3. **Write the boundary table.** For every threshold, note whether the brief's wording includes
   it. "Over 18" and "18 or over" are different programs.
4. **Implement.** Keep it flat — if you reach three levels of indentation, look for a guard clause
   you have not used.
5. **Test the boundaries.** For each threshold \`n\`, run \`n-1\`, \`n\`, \`n+1\`. Then run the empty or
   zero case.
6. **Write the explanation.** Two or three sentences per decision: what it tests, why it is in
   that position, and which boundary rule you chose and why.

**The explanation is not paperwork.** It is where you discover that branch three can never run, or
that you guessed at a boundary the brief actually specified. Writing it down is the last and
cheapest test.

The brief itself, the acceptance criteria and what to submit are in the assignment attached to
this unit.`,
    assignment: {
      title: 'Mini Project — Exam Result Classifier',
      description: `Build a small program that turns a set of marks into a result, applying rules that overlap and interact. It is deliberately larger than a single condition and deliberately smaller than anything needing loops or functions.`,
      instructions: `**The brief**

A college classifies a student's year from three subject marks, each out of 100.

Apply these rules, in whatever structure you judge correct:

1. If any single subject is below 35, the result is "FAIL" regardless of the average.
2. Otherwise compute the average of the three marks.
3. Average 75 or above: "DISTINCTION"
4. Average 60 up to but not including 75: "FIRST CLASS"
5. Average 50 up to but not including 60: "SECOND CLASS"
6. Average 35 up to but not including 50: "PASS"
7. A student who would otherwise get DISTINCTION but has any subject below 50 is capped at
   "FIRST CLASS".

Read three integers, print exactly one result word or phrase, nothing else.

**What to submit**

1. Your program in a single \`.py\` file.
2. A short written explanation (roughly 200-350 words) covering:
   - how many decisions you identified and in what order you placed them, and why that order
   - for each threshold, whether it is inclusive or exclusive and which words in the brief told
     you so
   - how you implemented rule 7, and why you chose that structure over the alternatives
   - the boundary inputs you tested and what each proved
3. Your test table: at minimum the inputs you ran for rules 1, 3, 4, 5, 6 and 7, with expected
   and actual output for each.

**Constraints**

- Conditions only. No loops and no functions — both are taught later, and using them here hides
  the decision structure this project is about.
- No external libraries.

**Worked boundary hints, so you test the right things**

\`35 35 35\` must not be FAIL. \`34 90 90\` must be FAIL. \`80 80 49\` must be FIRST CLASS, not
DISTINCTION. Getting all three right is most of the marks.`,
      rubric: [
        {
          criterion: 'Correctness on the rules',
          description: 'All seven rules implemented. Rule 1 short-circuits before the average is considered; rule 7 correctly caps a would-be distinction.',
          maxPoints: 30,
        },
        {
          criterion: 'Boundary handling',
          description: 'Inclusive and exclusive thresholds match the brief exactly. 35, 50, 60 and 75 all behave as specified, demonstrated by the submitted test table.',
          maxPoints: 25,
        },
        {
          criterion: 'Structure of the decisions',
          description: 'Chain ordered strictest-first with no unreachable branch. Failure cases handled as guards rather than deep nesting. No condition repeated unnecessarily.',
          maxPoints: 20,
        },
        {
          criterion: 'Written explanation',
          description: 'Explains the ordering and the boundary choices with reference to the wording of the brief, not merely restating what the code does.',
          maxPoints: 15,
        },
        {
          criterion: 'Testing evidence',
          description: 'A test table covering every rule plus the three hinted boundary cases, with expected and actual output recorded.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },
];

/** Every bundle in this file, in the order a student meets them. */
export const PROGRAMMING_SPINE_BUNDLES: PilotBundle[] = [
  ...CONDITIONS_BUNDLES,
];
