# -*- coding: utf-8 -*-
"""
Wave 5 — BOOLEAN_ALGEBRA, 50 Golden Bank questions, all newly authored.

THIS SKILL ASKS WHAT AN EXPRESSION CAN BE REWRITTEN AS. Its neighbour asks what an expression is
worth. That is the whole of the boundary, and it is enforced item by item: the evaluation family
here exists only to establish precedence, and every family after it is about form — which law
licenses a step, which term adds nothing, which shorter expression is genuinely equal. Anything
answerable by filling in a table belongs to the other skill and is not here.

DE MORGAN IS THE ONE PLACE THE TWO SKILLS GENUINELY MEET, and it is written from the opposite
end. The logic bank asks which cases a denied condition admits; this bank pushes a complement
through a group and asks which algebraic form results. Neither is answerable by the other's
method, which is the test the blueprint set for keeping both.

THE COMPLEMENT IS WRITTEN AS A PRIME — A′ means NOT A. A bar cannot survive plain text, and
spelling it out as NOT would import the other skill's vocabulary into every stem.

ARITHMETIC IS THE PERMANENT ENEMY HERE AND IS USED AS A LURE THROUGHOUT. 1 + 1 = 1 appears
because it must; A + A = 2A appears as a wrong answer because that is what students write; and
the sum distributing over the product gets its own item precisely because ordinary algebra has no
such rule and students reject the step on that ground.
"""

Q = []


def q(qid, family, difficulty, prompt, correct, distractors, explanation,
      provenance='AUTHORED', source='', evidence=None, mode=None, hinge=None):
    assert len(distractors) == 3, qid
    it = {'id': qid, 'family': family, 'difficulty': difficulty, 'prompt': prompt,
          'correct': correct, 'distractors': list(distractors), 'explanation': explanation,
          'provenance': provenance, 'source': source}
    if evidence:
        it['evidence'] = evidence
    if mode:
        it['mode'] = mode
    if hinge:
        it['hinge'] = hinge
    Q.append(it)


# =========================================================================
# BA_FAM01_VALUES_AND_VARIABLES — D1 x4, D2 x1
# =========================================================================
q('GB_BA_001', 'BA_FAM01_VALUES_AND_VARIABLES', 'D1',
  'Which of these quantities can be held directly in a Boolean variable?',
  'Whether a switch is on',
  ['The number of items in a basket',
   'The temperature of a room',
   'A traffic light showing red, amber or green'],
  'A switch is on or it is not, which is exactly two states. The other three take more than two '
  'values and cannot be squeezed into one variable without losing something.')

q('GB_BA_002', 'BA_FAM01_VALUES_AND_VARIABLES', 'D1',
  'How many different values can a Boolean variable take?',
  'Two',
  ['One', 'Ten', 'Any number at all'],
  'A Boolean variable holds 0 or 1 and nothing else. Every operation in this algebra is defined '
  'on that basis.')

q('GB_BA_003', 'BA_FAM01_VALUES_AND_VARIABLES', 'D1',
  'A door sensor reports open or closed and nothing else. Can its reading be held in a Boolean '
  'variable?',
  'Yes, because it has exactly two states',
  ['No, because open and closed are words rather than numbers',
   'No, because the reading changes over time',
   'Only once the two states have been renamed 0 and 1'],
  'What matters is the number of states, not what they are called. Renaming them is a '
  'presentation choice made after the decision, not a condition on it.')

q('GB_BA_004', 'BA_FAM01_VALUES_AND_VARIABLES', 'D1',
  'An expression is built only from Boolean variables. What values can the expression itself '
  'take?',
  'Only 0 or 1',
  ['Any whole number', 'Any value between 0 and 1', 'It depends how many variables it contains'],
  'Every operation in this algebra returns 0 or 1, so combining Boolean values can never produce '
  'anything else however long the expression grows.')

q('GB_BA_005', 'BA_FAM01_VALUES_AND_VARIABLES', 'D2',
  'A student stores a traffic light state in one Boolean variable, reasoning that a light is '
  'either red or not red. What is lost?',
  'The difference between amber and green, which both count as not red',
  ['Nothing; a light really is either red or not red',
   'The ability to record whether the light is red',
   'The order in which the three colours follow each other'],
  'The two-state reading is accurate and throws away two thirds of the information. Anything '
  'needing to act differently on amber and green cannot be built on this variable.')

# =========================================================================
# BA_FAM02_NOTATION_READING — D1 x3, D2 x1
# =========================================================================
q('GB_BA_006', 'BA_FAM02_NOTATION_READING', 'D1',
  'In Boolean notation the plus sign stands for one of the operations. Which?',
  'OR',
  ['AND', 'NOT', 'Ordinary addition'],
  'The plus sign is borrowed from arithmetic and means OR here. Keeping the arithmetic reading '
  'is the single most productive mistake in the topic.')

q('GB_BA_007', 'BA_FAM02_NOTATION_READING', 'D1',
  'In Boolean algebra, what is 1 + 1?',
  '1',
  ['2', '0', '10'],
  'The plus is an OR, and an OR of two ones is 1. There is no value 2 anywhere in this algebra '
  'for the arithmetic answer to land on.')

q('GB_BA_008', 'BA_FAM02_NOTATION_READING', 'D1',
  'In Boolean notation, two variables written side by side as AB mean what?',
  'A AND B',
  ['A OR B', 'A multiplied by B in the ordinary sense', 'A followed by B in time'],
  'Adjacency stands for the product, which in this algebra is AND. The notation is borrowed from '
  'arithmetic and the meaning is not.')

q('GB_BA_009', 'BA_FAM02_NOTATION_READING', 'D2',
  'A student evaluates the Boolean expression 1 + 1 + 1 and writes 3. What has gone wrong?',
  'The plus sign means OR here, and an OR comes to 1 as soon as any part is 1',
  ['Nothing; 1 + 1 + 1 really is 3',
   'The plus sign means AND, so the answer should be 1',
   'The expression is not well formed and cannot be evaluated'],
  'Adding more ones cannot push the value past 1, because the operation is not addition. The '
  'answer would be 1 for any number of terms.')

# =========================================================================
# BA_FAM03_GATE_BEHAVIOUR — D1 x3, D2 x1
# =========================================================================
q('GB_BA_010', 'BA_FAM03_GATE_BEHAVIOUR', 'D1',
  'An AND gate is given the inputs 1 and 0. What does it output?',
  '0',
  ['1', 'Both 0 and 1', 'Nothing, because the inputs disagree'],
  'An AND gate outputs 1 only when every input is 1, so a single 0 forces the output to 0.')

q('GB_BA_011', 'BA_FAM03_GATE_BEHAVIOUR', 'D1',
  'A gate outputs 1 exactly when its two inputs differ from each other. What is it called?',
  'XOR',
  ['OR', 'AND', 'NAND'],
  'Outputting 1 on differing inputs and 0 on matching ones is what XOR does. An OR would also '
  'output 1 when both inputs are 1.')

q('GB_BA_012', 'BA_FAM03_GATE_BEHAVIOUR', 'D1',
  'An OR gate and an XOR gate are given the same two inputs. In which case do they disagree?',
  'When both inputs are 1',
  ['When both inputs are 0', 'When exactly one input is 1', 'They never disagree'],
  'The two agree on three of the four input combinations. Both inputs being 1 is the only case '
  'that separates them, which is why it is the case worth testing.')

q('GB_BA_013', 'BA_FAM03_GATE_BEHAVIOUR', 'D2',
  'A NAND gate is given the inputs 1 and 1, and a student answers 1 by treating it as an AND. '
  'What is the output, and why?',
  '0, because NAND is an AND followed by an inversion',
  ['1, because both of its inputs are 1',
   '1, because NAND behaves like an OR in this case',
   '0, because a NAND gate always outputs 0'],
  'The AND part gives 1 and the inversion turns it into 0. A NAND does not always output 0; it '
  'outputs 0 only when an AND would have output 1.')

# =========================================================================
# BA_FAM04_EXPRESSION_EVALUATION — D2 x1, D3 x1
# =========================================================================
q('GB_BA_014', 'BA_FAM04_EXPRESSION_EVALUATION', 'D2',
  'Evaluate A + BC with A = 1, B = 1 and C = 0, given that the product binds before the sum.',
  '1',
  ['0', '2', 'It cannot be determined'],
  'The product BC comes to 0, and 1 + 0 is 1. Working strictly left to right would give 0 '
  'instead, which is why the binding has to be respected.')

q('GB_BA_015', 'BA_FAM04_EXPRESSION_EVALUATION', 'D3',
  'Evaluate AB + XY with A = 1, B = 1, X = 1 and Y = 0, given that products bind before sums.',
  '1',
  ['0', '2', 'It cannot be determined'],
  'The first product comes to 1 and the second to 0, and 1 + 0 is 1. Taken strictly left to '
  'right the expression would come to 0, so the two readings genuinely differ here.')

# =========================================================================
# BA_FAM05_CONSTANT_LAWS — D2 x1, D3 x1
# =========================================================================
q('GB_BA_016', 'BA_FAM05_CONSTANT_LAWS', 'D2',
  'A simplification reaches the term A + 1, in which 1 is the constant. What does that term '
  'become?',
  '1',
  ['A', '0', 'It cannot be simplified any further'],
  'An OR is 1 as soon as any part is 1, and one part here is already 1, so the value is 1 '
  'whatever A happens to be. It is A · 1 that leaves A untouched.')

q('GB_BA_017', 'BA_FAM05_CONSTANT_LAWS', 'D3',
  'A working line reads A · 0 + B · 1, where 0 and 1 are the constants. Which single variable '
  'does the line reduce to?',
  'B',
  ['A + B', '0', '1'],
  'The first product is 0 whatever A is, and the second leaves B alone, so the whole reduces to '
  'B. The two constants behave in opposite ways and are easy to exchange.')

# =========================================================================
# BA_FAM06_SELF_AND_COMPLEMENT_LAWS — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_BA_018', 'BA_FAM06_SELF_AND_COMPLEMENT_LAWS', 'D2',
  'During a rewrite the same variable turns up twice joined by a sum, as A + A. What does that '
  'collapse to?',
  'A',
  ['2A', '1', '0'],
  'Combining a value with itself under OR changes nothing, so the result is A. There is no value '
  '2A in this algebra for the arithmetic answer to be.')

q('GB_BA_019', 'BA_FAM06_SELF_AND_COMPLEMENT_LAWS', 'D3',
  'A line of working contains A · A′, in which A′ is the complement of A. What does that '
  'product come to?',
  '0',
  ['1', 'A', 'A′'],
  'One of the two is 0 in every case, and a product with a 0 in it is 0. The companion law, '
  'with a sum in place of the product, gives 1.')

q('GB_BA_020', 'BA_FAM06_SELF_AND_COMPLEMENT_LAWS', 'D4',
  'A student simplifies A + A′ to A, reasoning that combining a variable with itself leaves it '
  'unchanged. A and A′ are not the same variable: one of them is 1 whenever the other is 0, so '
  'their sum is 1 in every case. What is the correct result?',
  '1',
  ['A', '0', 'A′'],
  'The step the student used applies to A + A, where both terms really are the same. Here the '
  'terms are opposites, so between them they always supply a 1.',
  evidence='one of them is 1 whenever the other is 0')

# =========================================================================
# BA_FAM07_DISTRIBUTION — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_BA_021', 'BA_FAM07_DISTRIBUTION', 'D2',
  'Expand A(B + C).',
  'AB + AC',
  ['AB + C', 'A + BC', 'ABC'],
  'The A multiplies each term inside the bracket, giving AB + AC. Leaving the C without its A is '
  'the commonest slip and changes the value.')

q('GB_BA_022', 'BA_FAM07_DISTRIBUTION', 'D3',
  'Which expression is equivalent to A + BC?',
  '(A + B)(A + C)',
  ['AB + AC', '(A + B)C', 'A + B + C'],
  'The sum distributes over the product here, giving (A + B)(A + C). This direction has no '
  'counterpart in ordinary arithmetic, which is why it looks wrong at first.')

q('GB_BA_023', 'BA_FAM07_DISTRIBUTION', 'D4',
  'A student refuses to accept that A + BC equals (A + B)(A + C), on the grounds that ordinary '
  'arithmetic has no such rule. Boolean algebra allows the sum to distribute over the product as '
  'well as the product over the sum, which ordinary arithmetic does not. Is the equality '
  'correct?',
  'Yes, and the arithmetic analogy is exactly what misleads here',
  ['No; the student is right that no such rule exists',
   'Yes, but only in the cases where A is 1',
   'No; the correct expansion is AB + AC'],
  'Checking all eight combinations confirms it. The algebra is only borrowing arithmetic '
  'notation, and it is not obliged to borrow arithmetic limitations with it.',
  evidence='allows the sum to distribute over the product as well as the product over the sum')

# =========================================================================
# BA_FAM08_ABSORPTION — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_BA_024', 'BA_FAM08_ABSORPTION', 'D2',
  'An expression is written as A + AB, so that its second term is the product of the first '
  'variable with another. What does the whole reduce to?',
  'A',
  ['AB', 'A + B', 'B'],
  'Whenever AB is 1, A is already 1, so the second term never adds a case. The whole expression '
  'therefore reduces to A.')

q('GB_BA_025', 'BA_FAM08_ABSORPTION', 'D3',
  'An expression reads X(X + Y). Which single variable is it equal to?',
  'X',
  ['Y', 'XY', 'X + Y'],
  'The bracket is 1 whenever X is 1, so the product is 1 exactly when X is, and 0 otherwise. The '
  'same absorption appears here with the two operations exchanged.')

q('GB_BA_026', 'BA_FAM08_ABSORPTION', 'D4',
  'A student simplifies A + A′B to A, using the step that turns A + AB into A. The second term '
  'here contains A′ rather than A, so the two terms do not share a variable in the way that step '
  'requires. What does A + A′B equal?',
  'A + B',
  ['A', 'A′B', 'AB'],
  'When A is 0 the expression comes to B, so the result is A + B rather than A alone. Absorption '
  'needs the same variable in both terms, and a complement is a different variable.',
  evidence='the two terms do not share a variable in the way that step requires')

# =========================================================================
# BA_FAM09_STEP_JUSTIFICATION — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_BA_027', 'BA_FAM09_STEP_JUSTIFICATION', 'D2',
  'A line of working turns A · 1 into A. Which law licenses it?',
  'The identity law for the product',
  ['The complement law', 'The absorption law', 'The distributive law'],
  'Multiplying by 1 leaves a value unchanged, which is what the identity law states. The others '
  'are all real laws that say nothing about this step.')

q('GB_BA_028', 'BA_FAM09_STEP_JUSTIFICATION', 'D3',
  'A line of working turns A(B + C) into AB + AC. Which law licenses it?',
  'The distributive law',
  ['The absorption law', 'The identity law', 'The complement law'],
  'Spreading a factor across a sum is distribution. Absorption would remove a term rather than '
  'expand one.')

q('GB_BA_029', 'BA_FAM09_STEP_JUSTIFICATION', 'D4',
  'A line of working turns A + A′ into 1, and a student names the idempotent law, which is the '
  'law turning A + A into A. The term being combined here is A′ rather than a second copy of A, '
  'so the idempotent law does not reach it. Which law licenses the step?',
  'The complement law',
  ['The idempotent law', 'The absorption law', 'The distributive law'],
  'A variable together with its complement covers both cases, and recording that is precisely '
  'what the complement law does. The other law named would have given A rather than 1, so it is '
  'the wrong answer as well as the wrong justification.',
  evidence='The term being combined here is A′ rather than a second copy of A')

# =========================================================================
# BA_FAM10_CIRCUIT_TO_EXPRESSION — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_BA_030', 'BA_FAM10_CIRCUIT_TO_EXPRESSION', 'D2',
  'Inputs A and B are fed to an AND gate, and the output of that gate is fed to an inverter. '
  'What does the circuit compute?',
  '(AB)′',
  ['AB', 'A′B′', 'A′ + B'],
  'The AND is formed first and the inversion is applied to its result, which is written (AB)′. '
  'Inverting the inputs instead would be a different circuit.')

q('GB_BA_031', 'BA_FAM10_CIRCUIT_TO_EXPRESSION', 'D3',
  'Inputs A and B are each passed through their own inverter, and the two inverter outputs are '
  'then fed to an OR gate. What does the circuit compute?',
  'A′ + B′',
  ['A + B', '(A + B)′', 'A′B′'],
  'Each input is complemented before the combining, and the combining is a sum, giving A′ + B′. '
  'Where the inversion sits relative to the gate is the whole of the difference.')

q('GB_BA_032', 'BA_FAM10_CIRCUIT_TO_EXPRESSION', 'D4',
  'One circuit inverts A and B separately and then combines them with an AND gate. Another '
  'combines A and B with an OR gate and then inverts the result. The inversion happens before '
  'the combining in the first circuit and after it in the second, which is the only structural '
  'difference. What is true of the two?',
  'They compute the same thing',
  ['The first computes A′B′ and the second computes A′ + B′',
   'The second computes AB',
   'They differ whenever A and B differ from each other'],
  'The first is A′B′ and the second is (A + B)′, and pushing the complement inward turns the '
  'second into the first. This is the case where moving the inversion across the gate happens to '
  'cost nothing, provided the gate changes with it.',
  evidence='The inversion happens before the combining in the first circuit and after it in the '
           'second')

# =========================================================================
# BA_FAM11_INVALID_STEP_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_BA_033', 'BA_FAM11_INVALID_STEP_DIAGNOSIS', 'D3',
  'A simplification reads: Step 1, A + AB. Step 2, A(1 + B). Step 3, A · B. Step 4, AB. Which '
  'step is not licensed?',
  'Step 3',
  ['Step 2', 'Step 4', 'No step is wrong'],
  'The bracket comes to 1, so Step 3 should have produced A · 1 and then A. The factoring before '
  'it is legitimate, and the line after it merely tidies a result that was already wrong.')

q('GB_BA_034', 'BA_FAM11_INVALID_STEP_DIAGNOSIS', 'D4',
  'A simplification reads: Step 1, A + A. Step 2, 2A. Step 3, A. The final answer is right, and '
  'step 2 imports a rule from ordinary arithmetic under which no Boolean variable can ever take '
  'the value 2. Which step is not licensed?',
  'Step 2',
  ['Step 1', 'Step 3', 'None of them, since the answer is correct'],
  'Passing through a value the algebra does not contain is not licensed however the working '
  'lands. A correct answer reached by an unavailable route will not stay correct on the next '
  'expression.',
  evidence='no Boolean variable can ever take the value 2')

# =========================================================================
# BA_FAM12_EQUIVALENCE_VERIFICATION — D3 x1, D4 x1
# =========================================================================
q('GB_BA_035', 'BA_FAM12_EQUIVALENCE_VERIFICATION', 'D3',
  'A rewrite turns A + AB into A. It has been checked with A = 1 and B = 0, and with A = 1 and B '
  '= 1, and the two forms agreed both times. What still needs checking?',
  'The rows where A is 0',
  ['Nothing; two agreeing rows are enough',
   'The rows where B is 0',
   'Nothing, because the rewrite applies a known law'],
  'Only half the combinations have been tried, and both tried have A set to 1. The rows where A '
  'is 0 are untouched and are where a faulty absorption would show.')

q('GB_BA_036', 'BA_FAM12_EQUIVALENCE_VERIFICATION', 'D4',
  'A rewrite turns A + A′B into AB. On the row where A = 1 and B = 1 the two forms agree. On the '
  'row where A = 1 and B = 0 the original comes to 1 and the rewrite comes to 0, so the two '
  'differ. Is the rewrite correct?',
  'No, and that row shows it',
  ['Yes, since they agree where both variables are 1',
   'Yes; the two are the same law written two ways',
   'It cannot be decided until all four rows have been checked'],
  'A single disagreeing row settles the question, and the remaining rows cannot rescue it. '
  'Checking every row is thorough and is not required once a failure has been found.',
  evidence='the original comes to 1 and the rewrite comes to 0')

# =========================================================================
# BA_FAM13_DE_MORGAN_REWRITE — D3 x1, D4 x1, D5 x3
# =========================================================================
q('GB_BA_037', 'BA_FAM13_DE_MORGAN_REWRITE', 'D3',
  'Rewrite (AB)′ with the complement pushed inward.',
  'A′ + B′',
  ['A′B′', '(A + B)′', 'AB'],
  'Pushing a complement through a product turns it into a sum of complements, giving A′ + B′. '
  'Complementing the variables and leaving the product alone is the half-done version.')

q('GB_BA_038', 'BA_FAM13_DE_MORGAN_REWRITE', 'D4',
  'A student rewrites (A + B)′ as A′ + B′, complementing each variable and leaving the sum as it '
  'was. Pushing a complement inward changes the operation as well as the variables, and the sum '
  'here has been left unchanged. What is the correct rewrite?',
  'A′B′',
  ['A′ + B′', '(AB)′', 'AB'],
  'The sum has to become a product as the complement moves inside, giving A′B′. With A true and '
  'B false the original is 0 and the student form is 1, which shows the two apart.',
  evidence='the sum here has been left unchanged')

q('GB_BA_039', 'BA_FAM13_DE_MORGAN_REWRITE', 'D5',
  'An expression reads (A′)′. A student says a complement can only be pushed inward when it '
  'covers a group of two or more variables, so this one cannot be simplified. A complement over '
  'a single complemented variable simply returns the variable, since reversing a two-valued '
  'quantity twice restores it. What does it equal?',
  'A',
  ['A′', '1', '0'],
  'Two reversals cancel, so the expression is just A. The rule about groups is about which '
  'operation changes; it never made a lone complement immovable.',
  mode='EDGE', hinge='reversing a two-valued quantity twice restores it')

q('GB_BA_040', 'BA_FAM13_DE_MORGAN_REWRITE', 'D5',
  'A requirement is described as: it is not the case that the account is active and the balance '
  'is positive. A team must restate it as two checks, each about a single fact, joined by one '
  'operation. The complement covers both facts together, so pushing it inward will change the '
  'operation that joins them. What do they get?',
  'The account is not active, or the balance is not positive',
  ['The account is not active, and the balance is not positive',
   'The account is active, or the balance is positive',
   'The account is not active, and the balance is positive'],
  'Denying a requirement of both leaves a requirement of either failure, so the joining '
  'operation becomes a sum. Keeping it as a product would exclude an active account with a '
  'negative balance, which the original clearly covers.',
  mode='TRANSFER',
  hinge='The complement covers both facts together, so pushing it inward will change the '
        'operation that joins them')

q('GB_BA_041', 'BA_FAM13_DE_MORGAN_REWRITE', 'D5',
  'An expression reads (A + B + C)′. A student pushes complements inward two variables at a time '
  'and is unsure whether the rule reaches three. The rule applies however many parts the group '
  'has, because a group of three can be treated as one part joined to another and the step '
  'repeated. What does the expression equal?',
  'A′B′C′',
  ['A′ + B′ + C′', 'A′B′ + C′', '(ABC)′'],
  'Grouping two of the three, applying the step, and applying it again to the remaining pair '
  'gives A′B′C′. The number of parts never mattered; only the operation joining them does.',
  mode='EDGE',
  hinge='a group of three can be treated as one part joined to another and the step repeated')

# =========================================================================
# BA_FAM14_FORM_CHOICE — D4 x1, D5 x4
# =========================================================================
q('GB_BA_042', 'BA_FAM14_FORM_CHOICE', 'D4',
  'Four forms are offered as simplifications of A + AB, and the criterion is the fewest '
  'variables. Any form offered must first be equal to the original, and one of the forms below '
  'is shorter than the rest and is not equal to A + AB. Which form should be chosen?',
  'A',
  ['B', 'A + B', 'AB'],
  'A + AB reduces to A, so A is both correct and the shortest correct option. B is shorter still '
  'and is simply a different expression, which is why equality has to be settled before length '
  'is considered.',
  evidence='one of the forms below is shorter than the rest and is not equal to A + AB')

q('GB_BA_043', 'BA_FAM14_FORM_CHOICE', 'D5',
  'Two equivalent forms of a condition are available. One uses three gates of a kind the board '
  'has in abundance. The other uses two gates, one of them a kind the board has only one of, '
  'already committed elsewhere. Both forms compute exactly the same thing. Which should be '
  'built?',
  'The three-gate form, because the two-gate form needs a part that is not available',
  ['The two-gate form, because fewer gates is always the better outcome',
   'The two-gate form, with the committed gate shared between the two uses',
   'Neither; the condition should be redesigned from scratch'],
  'Gate count is a proxy for cost, and here the real cost is a part that does not exist to be '
  'used. Sharing a committed gate would change what the other circuit does.',
  mode='TRADEOFF', hinge='a kind the board has only one of, already committed elsewhere')

q('GB_BA_044', 'BA_FAM14_FORM_CHOICE', 'D5',
  'A condition can be written in a long form that follows the requirement sentence by sentence, '
  'or in a shorter equivalent form that no longer resembles it. The requirement changes about '
  'twice a year, and each change is checked against the written condition by a non-specialist. '
  'Which form fits?',
  'The long form, because a non-specialist has to be able to check it against the requirement',
  ['The short form, because shorter expressions contain fewer mistakes',
   'The short form, because it evaluates more quickly',
   'Either, since the two are equivalent'],
  'Equivalence means the machine cannot tell them apart, and the reader can. The work being '
  'optimised here is the twice-yearly check, not the evaluation.',
  mode='TRADEOFF', hinge='checked against the written condition by a non-specialist')

q('GB_BA_045', 'BA_FAM14_FORM_CHOICE', 'D5',
  'A team simplifies a condition and reaches a form containing only one of the three original '
  'variables. They suspect an error, since a variable has vanished. A variable vanishes exactly '
  'when the expression turns out not to depend on it, which is a legitimate result rather than a '
  'sign of a mistake. What should they do?',
  'Check the simplification against every combination, and accept it if it holds',
  ['Reject the simplification, since no variable may disappear',
   'Put the missing variables back into the form',
   'Accept it without checking, since the laws were applied correctly'],
  'A vanishing variable is a finding worth having: it says the condition never depended on it. '
  'The way to tell a finding from a mistake is to check, not to assume either way.',
  mode='EDGE', hinge='A variable vanishes exactly when the expression turns out not to depend on '
                     'it')

q('GB_BA_046', 'BA_FAM14_FORM_CHOICE', 'D5',
  'A rule set is being reduced, and one proposed reduction removes a rule on the grounds that it '
  'never changes the outcome. The rule fires only in a case another rule already covers with the '
  'same outcome, and no case exists where the two disagree. Is the removal safe?',
  'Yes, because the rule settles no case the others do not settle the same way',
  ['No, because removing any rule changes behaviour',
   'Yes, but only if the rules are evaluated in a fixed order',
   'No, unless the rule is first shown to be unreachable'],
  'This is absorption in another costume: a term wholly inside another adds nothing. The rule '
  'need not be unreachable, only redundant, which is a weaker and easier thing to establish.',
  mode='TRANSFER', hinge='no case exists where the two disagree')

# =========================================================================
# BA_FAM15_SIMPLIFICATION_TRANSFER — D4 x1, D5 x3
# =========================================================================
q('GB_BA_047', 'BA_FAM15_SIMPLIFICATION_TRANSFER', 'D4',
  'An eligibility rule admits anyone who is a resident, and also admits anyone who is both a '
  'resident and employed. The second group lies entirely inside the first, and it adds nobody '
  'the first does not already admit. Who does the rule admit?',
  'Exactly the residents',
  ['Residents who are also employed',
   'Residents, plus employed people who are not residents',
   'Employed people'],
  'The second clause is decorative: everyone it names is already admitted. The rule is longer '
  'than it needs to be and admits exactly the same people as its first clause alone.',
  evidence='The second group lies entirely inside the first, and it adds nobody the first does '
           'not already admit')

q('GB_BA_048', 'BA_FAM15_SIMPLIFICATION_TRANSFER', 'D5',
  'A form has one field recording whether a customer has consented and a second recording '
  'whether they have not. Between them the two fields always cover every customer, and no '
  'customer can be recorded under both. What follows about storing both?',
  'One of the two is redundant, since each is fully determined by the other',
  ['Both must be kept, since they record different facts',
   'Both must be kept, in case a customer falls under neither',
   'Neither can be dropped, because consent is legally significant'],
  'Covering every case with no overlap is exactly the relationship between a value and its '
  'complement. Storing both invites the two to disagree, which is a state the data model says '
  'cannot happen.',
  mode='TRANSFER',
  hinge='the two fields always cover every customer, and no customer can be recorded under both')

q('GB_BA_049', 'BA_FAM15_SIMPLIFICATION_TRANSFER', 'D5',
  'A rule set has a rule for requests that are internal and another for requests that are not '
  'internal. A third rule is proposed for requests that are neither. Every request is either '
  'internal or not internal, with no third possibility, so the proposed rule can never fire. '
  'What does it contribute to the decision the rule set makes?',
  'Nothing, because no request can ever reach it',
  ['It covers a case the other two miss',
   'It makes the rule set safer against unexpected input',
   'It changes the outcome for requests that are internal'],
  'A value and its complement exhaust the possibilities between them, leaving no third case to '
  'catch. The rule is not harmful so much as inert, and it will mislead the next reader into '
  'thinking a third case exists.',
  mode='EDGE',
  hinge='Every request is either internal or not internal, with no third possibility')

q('GB_BA_050', 'BA_FAM15_SIMPLIFICATION_TRANSFER', 'D5',
  'A set of eight overlapping rules can be reduced to three that decide every case identically. '
  'The three are compact and correspond to nothing in the written policy, while the eight each '
  'match a policy clause by name. The policy is audited annually against the implementation. '
  'Which set should be kept?',
  'The eight, because each one has to be traced back to a policy clause at audit',
  ['The three, because fewer rules mean fewer mistakes',
   'The three, because they decide identically and evaluate faster',
   'Either, since the decisions they reach are the same'],
  'Reduction is worth having when nothing depends on the original shape, and here the annual '
  'audit depends on exactly that. The compact set would have to be re-expanded once a year to be '
  'checked at all.',
  mode='TRADEOFF', hinge='the eight each match a policy clause by name')
