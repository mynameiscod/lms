/**
 * T_APTITUDE_REASONING and T_APTITUDE_DATA — placement aptitude, both topics.
 *
 * ── WHY THESE TOPICS, AND WHO THEY ARE FOR ────────────────────────────────────────────────
 *
 * ACADEMIC, and aimed at one moment: the online aptitude round that almost every campus
 * placement process puts in front of a first-year before any technical interview. Those rounds
 * are timed, multiple choice and built from a small, stable set of question families — series,
 * analogies, blood relations, directions, seating, syllogisms, and data interpretation over a
 * table or chart. A student who has met each family once, with its method and its trap, scores
 * very differently from one meeting them cold.
 *
 * ── THE LINE THESE TOPICS HOLD ────────────────────────────────────────────────────────────
 *
 * Every unit teaches a METHOD and the TRAP that its distractors are built from, because aptitude
 * options are not random: each wrong option is the answer a predictable mistake produces. The
 * reasoning topic ends with a DEBUG unit that examines those tempting wrong answers directly.
 *
 * The data topic stays at aptitude-test level — percentage change, successive changes, ratio
 * sharing, weighted averages, estimation. It deliberately does NOT re-teach statistics: choosing
 * between mean and median, spread, and misleading charts belong to T_STATS and are not repeated.
 *
 * Checkpoint questions name the one skill each measures. Reasoning: APTITUDE_REASONING_SERIES for
 * number and letter series and pattern analogies, APTITUDE_REASONING_LOGIC for relations,
 * directions, seating, syllogisms and word-relationship analogies. Data:
 * APTITUDE_DATA_INTERPRETATION for computing from tables, charts, percentages, ratios and
 * averages; PATTERN_RECOGNITION for spotting a trend, a shortcut or a close-enough estimate.
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

const LOGIC = 'APTITUDE_REASONING_LOGIC';
const SERIES = 'APTITUDE_REASONING_SERIES';
const DI = 'APTITUDE_DATA_INTERPRETATION';
const PATTERN = 'PATTERN_RECOGNITION';

export const APTITUDE_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'T_APTITUDE_REASONING_NUMBER_SERIES',
    notes: `A number series question gives five or six terms and asks for the next one, or for the one
term that does not belong. There are only a handful of rules in common use, so the method is to
test them in a fixed order rather than stare at the numbers waiting for inspiration.

**The order to test, fastest first:**

1. **Differences.** Write the gap between each pair of neighbours. Constant gaps, gaps that grow
   by a fixed amount, or gaps that double are the most common patterns of all.
2. **Second differences.** If the gaps are not obvious, take the gaps of the gaps.
3. **Ratios.** If the terms grow quickly, divide: ×2, ×3, or ×2 then +1.
4. **Two series interleaved.** If the terms go up and down, read positions 1, 3, 5 and 2, 4, 6
   as separate series.
5. **Known sequences.** Squares, cubes, primes, factorials — or one of them plus a constant.

**Worked examples.**

    3, 7, 15, 31, 63, ?     gaps 4, 8, 16, 32   -> next gap 64  -> 127
    2, 6, 12, 20, 30, ?     gaps 4, 6, 8, 10    -> next gap 12  -> 42
    5, 11, 8, 14, 11, 17, ? alternating +6, -3  -> 17 - 3       -> 14
    1, 2, 6, 24, 120, ?     x2, x3, x4, x5      -> x6           -> 720

The first can also be read as "double and add one" (3 × 2 + 1 = 7). Two descriptions of the
same rule must give the same next term, which is a free check.

**The trap: a rule that fits only some of the terms.** Seeing 2, 4, 8 at the start and answering
"doubling" without checking the fourth term is the commonest wrong answer, and the options are
built to reward it. A rule is only a rule when it produces EVERY given term. Check the last two
terms before you look at the options.

**Odd one out.** Apply the rule to the terms that clearly fit, then find the single term it does
not produce. In 3, 6, 12, 24, 46, 96 the doubling rule gives 48 where 46 stands, and 96 is still
twice 48, which confirms 46 is the misfit.

**Time.** A series should take under a minute. If differences, ratios and interleaving all fail
within that, mark it and move on — the rule you have not spotted will not appear by staring.`,
    mcqs: [
      mcq('What comes next in the series 4, 9, 19, 39, 79, ?',
        [['159', true], ['158', false], ['119', false], ['160', false]],
        'Each term is double the previous plus one: 79 × 2 + 1 = 159. The gaps 5, 10, 20, 40 double as well, so the next gap is 80.'),
      mcq('What comes next in the series 2, 5, 10, 17, 26, ?',
        [['37', true], ['35', false], ['36', false], ['40', false]],
        'The gaps are 3, 5, 7, 9, so the next is 11 and 26 + 11 = 37. Equivalently each term is a square plus one: 6² + 1 = 37.'),
      mcq('What comes next in the series 20, 17, 22, 19, 24, 21, ?',
        [['26', true], ['18', false], ['23', false], ['25', false]],
        'The steps alternate −3 and +5, so after 21 comes 21 + 5 = 26. Reading positions 1, 3, 5 alone gives 20, 22, 24, whose next is 26 too.'),
      mcq('Which term is wrong in the series 3, 6, 12, 24, 46, 96?',
        [['46', true], ['24', false], ['96', false], ['12', false]],
        'Every term doubles the one before, so 24 should be followed by 48. The final 96 is exactly 48 × 2, confirming 46 is the misfit.'),
    ],
    checkpoint: [
      mcq('What comes next in the series 7, 10, 16, 25, 37, ?',
        [['52', true], ['49', false], ['50', false], ['55', false]],
        'The gaps are 3, 6, 9, 12, growing by 3, so the next gap is 15 and 37 + 15 = 52. Answering 49 repeats the last gap instead.', SERIES),
      mcq('What comes next in the series 2, 3, 5, 7, 11, 13, ?',
        [['17', true], ['15', false], ['19', false], ['16', false]],
        'These are the prime numbers in order. The prime after 13 is 17; 15 is not prime, and 19 skips a prime.', SERIES),
      mcq('What comes next in the series 1, 2, 6, 24, 120, ?',
        [['720', true], ['600', false], ['240', false], ['840', false]],
        'The multipliers are ×2, ×3, ×4, ×5, so the next is ×6: 120 × 6 = 720. Repeating ×5 gives the distractor 600.', SERIES),
    ],
  },
  {
    unitCode: 'T_APTITUDE_REASONING_LETTER_SERIES',
    notes: `A letter series is a number series in disguise. Convert each letter to its position in the
alphabet, solve the number series, and convert back. The only new skills are doing that
conversion quickly and handling the end of the alphabet.

**Know the positions without counting.** Counting on your fingers from A costs ten seconds a
letter. Two anchors remove most of that:

- **EJOTY** — E, J, O, T, Y are 5, 10, 15, 20, 25. Any letter is at most two steps from one of
  them: M is two before O, so 13.
- **Opposite letters add to 27.** A–Z, B–Y, C–X, and so on, because 1 + 26 = 27. The opposite
  of G (7) is 27 − 7 = 20, which is T.

**Worked examples.**

    B, E, H, K, ?     2, 5, 8, 11       +3 each      -> 14 = N
    Z, X, U, Q, ?     26, 24, 21, 17    -2, -3, -4   -> 17 - 5 = 12 = L
    AZ, BY, CX, ?     first +1, second -1 (opposites) -> DW
    W, A, E, ?        23, 1, 5          +4 wrapping  -> 9 = I

**Wrapping past Z.** The alphabet is a circle in these questions. W is 23, and 23 + 4 = 27,
which is 27 − 26 = 1, the letter A. Whenever a sum passes 26, subtract 26.

**Groups of letters.** In ACE, BDF, CEG, ? treat each position as its own series. First letters
A, B, C go up by one; so do the second and third. The answer is DFH. Also check the pattern
inside a group — here each group skips one letter — because a question may keep that fixed while
moving the starting letter by a larger step.

**Missing-letter blocks.** A string such as

    a b _ d a _ c d _ b c d

is a short block repeated. Find the block length first (here four: a b c d), write the block
underneath, and the blanks fall out: c, b, a. Guessing blanks one at a time invites choosing
letters that fit locally but break the repetition.

**The trap.** Miscounting a single position — calling R 17 instead of 18 — gives an answer one
letter away from correct, and the options almost always include that neighbour. Convert with the
EJOTY anchors, then convert your answer back and check it sits exactly where the rule says.`,
    mcqs: [
      mcq('What comes next in the letter series C, F, J, O, ?',
        [['U', true], ['T', false], ['S', false], ['V', false]],
        'The positions 3, 6, 10, 15 rise by 3, 4, 5, so the next step is 6: 15 + 6 = 21, which is U. Repeating +5 gives T.'),
      mcq('In the pairs AZ, BY, CX, which letter is paired with G?',
        [['T', true], ['S', false], ['U', false], ['H', false]],
        'Each pair is a letter and its opposite, and opposites add to 27. G is 7, so its partner is 27 − 7 = 20, which is T.'),
      mcq('What comes next in the series KM, LN, MO, ?',
        [['NP', true], ['NO', false], ['OP', false], ['MN', false]],
        'Both letters move forward one place each time: K, L, M, N and M, N, O, P. The next pair is NP.'),
      mcq('Which letters, in order, fill the blanks in p q _ s p _ r s _ q r s?',
        [['r q p', true], ['r p q', false], ['q r p', false], ['p r q', false]],
        'The block p q r s repeats three times. Writing it under the string puts r, q and p in the three gaps.'),
    ],
    checkpoint: [
      mcq('What comes next in the letter series Y, V, S, P, ?',
        [['M', true], ['N', false], ['L', false], ['O', false]],
        'The positions 25, 22, 19, 16 fall by 3 each time, so the next is 13, which is M.', SERIES),
      mcq('What comes next in the letter groups BDF, GIK, LNP, ?',
        [['QSU', true], ['QRS', false], ['PRT', false], ['RTV', false]],
        'Each group starts five letters after the last (B, G, L, Q) and skips one letter inside the group, so Q is followed by S and U.', SERIES),
      mcq('What comes next in the letter series T, X, B, F, ?',
        [['J', true], ['I', false], ['K', false], ['A', false]],
        'The rule is +4 with wrapping: T (20) to X (24), then 28 − 26 = 2 is B, then F (6), and 6 + 4 = 10 is J.', SERIES),
    ],
  },
  {
    unitCode: 'T_APTITUDE_REASONING_ANALOGIES',
    notes: `An analogy is written A : B :: C : ? and read "A is to B as C is to what". The method is one
sentence long: **name the relationship between A and B in words, then apply exactly that sentence
to C.** Students who look at the options first pick whichever word feels connected to C, and
the distractors are all words connected to C.

**Word analogies — the relationships that recur:**

- **Tool and user:** Scalpel : Surgeon.
- **Maker and made:** Author : Novel, Composer : Symphony.
- **Instrument and what it measures:** Thermometer : Temperature.
- **Individual and group:** Wolf : Pack, Bee : Swarm.
- **Part and whole:** Petal : Flower.
- **Degree:** Warm : Hot, Drizzle : Downpour.

A good sentence is specific. "A thermometer is related to temperature" fits too many answers;
"a thermometer is the instrument that measures temperature" fits only one.

**Direction matters.** Pen : Writer is tool-then-user, so Scalpel : ? is Surgeon. Writer : Pen
is user-then-tool, so Surgeon : ? is Scalpel. The same four words appear either way, which is
exactly why an option in the wrong order looks right at a glance. Say the sentence with the pair
in the order given.

**Number analogies.** Find the operation that turns the first number into the second, then test
it on every example pair given, because a single pair usually fits several operations:

    2 : 8 :: 3 : 27 :: 5 : ?

2 → 8 could be ×4 or a cube. 3 → 27 rules out ×4. The rule is cubing, so the answer is 125.
Similarly 3 : 10 :: 6 : 37 is "square and add one", which is why 8 pairs with 65.

**Letter analogies.** Convert to positions. AC : FH is +5 on each letter (A→F, C→H), so
KM : PR. ACE : BDF is +1 on each letter.

**The trap.** When only one example pair is given, more than one rule may fit it. Then the
options decide: test each candidate rule, and prefer the one that produces exactly one option.
If two rules each produce a different option, reread the question — you have missed a second
example or a word such as "cube".`,
    mcqs: [
      mcq('Thermometer is to temperature as barometer is to:',
        [['Pressure', true], ['Weather', false], ['Altitude', false], ['Humidity', false]],
        'A thermometer is the instrument that measures temperature, and a barometer is the instrument that measures atmospheric pressure.'),
      mcq('Complete the analogy 2 : 8 :: 3 : 27 :: 5 : ?',
        [['125', true], ['25', false], ['45', false], ['135', false]],
        'The pair 3 : 27 rules out multiplying by four, leaving cubing: 5 × 5 × 5 = 125.'),
      mcq('Complete the letter analogy BD : FH :: JL : ?',
        [['NP', true], ['MO', false], ['NO', false], ['OQ', false]],
        'Each letter moves forward four places: B to F and D to H. So J (10) becomes N (14) and L (12) becomes P (16).'),
      mcq('Author is to novel as composer is to:',
        [['Symphony', true], ['Orchestra', false], ['Piano', false], ['Conductor', false]],
        'An author creates a novel, so the composer\'s answer is the work a composer creates. An orchestra performs it and a piano plays it.'),
    ],
    checkpoint: [
      mcq('Complete the analogy 3 : 10 :: 6 : 37 :: 8 : ?',
        [['65', true], ['64', false], ['17', false], ['73', false]],
        'Each second number is the square of the first plus one: 3² + 1 = 10 and 6² + 1 = 37, so 8² + 1 = 65.', SERIES),
      mcq('Complete the letter analogy ACE : BDF :: MOQ : ?',
        [['NPR', true], ['NOP', false], ['OQS', false], ['LNP', false]],
        'Every letter moves forward one place, so M, O, Q become N, P, R.', SERIES),
      mcq('Wolf is to pack as fish is to:',
        [['School', true], ['Pond', false], ['Net', false], ['Fin', false]],
        'The relationship is individual to group: wolves form a pack and fish swim in a school. A pond is where fish live, not their group.', LOGIC),
    ],
  },
  {
    unitCode: 'T_APTITUDE_REASONING_BLOOD_RELATIONS',
    notes: `Blood relation questions describe a family in sentences and ask how two people are related.
Holding three generations in your head while reading is where marks are lost. **Draw the tree.**
It takes fifteen seconds and removes almost every error.

**The notation.**

- A square for a male, a circle for a female, a plain dot when the gender is NOT stated.
- A double horizontal line between a married couple.
- A single horizontal line between siblings.
- A vertical line down from parents to their child, so each generation sits on its own row.

Test convention: brothers and sisters are taken to share parents, and a person's "mother" is the
wife of that person's father, unless the question says otherwise.

**Read the sentence from the far end.** "He is the only son of my mother's father."

1. My mother's father — my maternal grandfather.
2. His only son — my mother's brother.
3. So he is my maternal uncle.

Working backwards from the speaker, one relation at a time, is far safer than trying to picture
the final answer at once.

**Worked example.** A is B's sister. C is B's mother. D is C's father. How is A related to D?

    D (male)
    |
    C (female)
    |
    B --- A (female)

A is a daughter of C, and C is a daughter of D, so A is D's **granddaughter**.

**The trap: inventing a gender.** "P is Q's sibling; Q is the child of R. How is R related to
P?" The only correct answer is **parent**. Nothing says whether R is a father or a mother, and an
option saying "father" is there to catch the reader who assumed. Names are no help either:
questions deliberately use letters, or names that do not settle it. Mark unknown genders with a
dot and refuse to answer "brother" when only "sibling" is known.

**"Only son" and "only daughter" identify somebody.** "My father's only son", said by a man,
is the speaker himself. "My mother's only daughter", said by a man, is his sister. These phrases
are how questions point back at the speaker or pin down one person.

**Coded relations.** Some questions define symbols: A + B means A is the mother of B, A − B means
A is the brother of B. Translate each symbol into a sentence, draw each sentence, and read the
answer off the drawing. P + Q − R means P is Q's mother and Q is R's brother, so P is also R's
mother.`,
    mcqs: [
      mcq('Pointing to a photograph, Arjun says, "Her mother is the only daughter of my mother." How is Arjun related to the woman in the photograph?',
        [['Maternal uncle', true], ['Brother', false], ['Father', false], ['Cousin', false]],
        'The only daughter of Arjun\'s mother is Arjun\'s sister. The woman\'s mother is that sister, so Arjun is her mother\'s brother — her maternal uncle.'),
      mcq('M is the mother of N. N is the brother of O. O is the father of P. How is M related to P?',
        [['Grandmother', true], ['Mother', false], ['Aunt', false], ['Great-grandmother', false]],
        'N and O are siblings, so M is O\'s mother too. O is P\'s father, which makes M the mother of P\'s father: P\'s grandmother.'),
      mcq('S is the child of T. U is T\'s only sibling, and V is U\'s son. How is V related to S?',
        [['Cousin', true], ['Brother', false], ['Nephew', false], ['Uncle', false]],
        'S\'s parent T and V\'s parent U are siblings, so S and V are children of siblings — first cousins.'),
      mcq('If A + B means A is the mother of B, and A − B means A is the brother of B, what does P + Q − R mean?',
        [['P is the mother of R', true], ['P is the grandmother of R', false], ['R is the brother of P', false], ['P is the aunt of R', false]],
        'P + Q says P is Q\'s mother, and Q − R says Q is R\'s brother. Siblings share a mother, so P is R\'s mother too.'),
    ],
    checkpoint: [
      mcq('Pointing to a boy, Meena says, "He is the son of the only son of my father\'s father." How is the boy related to Meena?',
        [['Brother', true], ['Cousin', false], ['Nephew', false], ['Uncle', false]],
        'The only son of Meena\'s father\'s father is Meena\'s own father. The boy is her father\'s son, so he is her brother.', LOGIC),
      mcq('G is the husband of H. H is the sister of I. I is the father of J. How is G related to J?',
        [['Uncle', true], ['Father', false], ['Grandfather', false], ['Brother-in-law', false]],
        'H is the sister of J\'s father, so H is J\'s aunt, and her husband G is J\'s uncle. G is brother-in-law to I, not to J.', LOGIC),
      mcq('R is a sibling of S, and S is the son of T. Which statement must be true?',
        [['T is a parent of R', true], ['R is a son of T', false], ['R is the brother of S', false], ['T is the father of R', false]],
        'Siblings share parents, so T is R\'s parent. Neither R\'s gender nor T\'s is ever stated, which rules out son, brother and father.', LOGIC),
    ],
  },
  {
    unitCode: 'T_APTITUDE_REASONING_DIRECTIONS',
    notes: `Direction sense questions describe a walk — so many metres north, turn right, so many metres
more — and ask where the walker ends up. Every one of them is solved by **drawing the path**
with north at the top of the page. Students who try to track it mentally lose their bearings at
the second turn.

**Left and right depend on which way you are facing.** This is the whole difficulty:

    Facing    Left    Right
    North     West    East
    South     East    West
    East      North   South
    West      South   North

Facing south, a left turn takes you EAST. If that feels wrong, turn your page upside down and
look — or physically turn in your chair. Right is a 90-degree clockwise turn from wherever you
face; left is 90 degrees anticlockwise.

**Worked example.** Walk 5 km north, turn right and walk 3 km, turn right and walk 9 km. Where
are you?

Use coordinates, east as x and north as y. Start (0, 0). North 5 → (0, 5). Facing north, right
is east: 3 km → (3, 5). Facing east, right is south: 9 km → (3, −4). You are 3 km east and 4 km
south of the start, which is south-east, and the straight-line distance is 5 km by Pythagoras
(3² + 4² = 5²).

**Shortest distance.** Add up the net east–west movement and the net north–south movement
separately, then combine them: distance = √(x² + y²). The sides 3-4-5, 6-8-10 and 5-12-13 come
up constantly. Adding every leg of the walk gives the distance travelled, not the distance from
the start, and it is always among the options.

**Shadows.** The sun rises in the east, so in the morning shadows fall towards the WEST; in the
evening they fall towards the EAST. Questions avoid noon, when the shadow is short and its
direction depends on latitude and season. A question says "his shadow fell to his left one morning": the shadow points west, and
west is on your left when you face north, so he was facing north.

**Where versus which way.** "In which direction is she from the start?" asks about her position.
"Which direction is she facing?" asks about her last turn. They are different questions and have
different answers, and each is usually an option for the other.

**The trap.** Turning left or right as if you were still facing north. Label the facing direction
on your sketch at every turn, before you draw the next leg.`,
    mcqs: [
      mcq('Kiran faces south, turns left, and then turns left again. Which way does Kiran face now?',
        [['North', true], ['South', false], ['West', false], ['East', false]],
        'Facing south, a left turn faces east; facing east, a left turn faces north. Two left turns always reverse the starting direction.'),
      mcq('A cyclist rides 6 km east and then 8 km north. How far is the cyclist from the start in a straight line?',
        [['10 km', true], ['14 km', false], ['2 km', false], ['12 km', false]],
        'The two legs are at right angles, so the distance is √(6² + 8²) = √100 = 10 km. Fourteen km is the distance travelled.'),
      mcq('Neha walks 4 km west, turns left and walks 3 km, then turns left again and walks 4 km. Where is she relative to her start?',
        [['3 km south', true], ['3 km north', false], ['5 km south-west', false], ['11 km west', false]],
        'Facing west, left is south: 3 km south. Facing south, left is east: 4 km east cancels the 4 km west, leaving her 3 km south.'),
      mcq('At 5 p.m., Ravi\'s shadow falls directly in front of him. Which way is he facing?',
        [['East', true], ['West', false], ['North', false], ['South', false]],
        'In the evening the sun is in the west, so shadows point east. A shadow in front of him means he faces east.'),
    ],
    checkpoint: [
      mcq('Anu walks 3 km north, turns right and walks 2 km, then turns right again and walks 3 km. In which direction is she from her starting point?',
        [['East', true], ['North-east', false], ['West', false], ['South', false]],
        'North 3, then right (east) 2, then right (south) 3 brings her back level with the start, 2 km to the east.', LOGIC),
      mcq('Facing north, Sameer turns 90° clockwise, then 180°, then 90° anticlockwise. Which direction does he face now?',
        [['South', true], ['North', false], ['East', false], ['West', false]],
        'North turned 90° clockwise is east; a further 180° is west; 90° anticlockwise from west is south.', LOGIC),
      mcq('Early one morning, Vikram\'s shadow falls exactly to his left. Which direction is Vikram facing?',
        [['North', true], ['South', false], ['East', false], ['West', false]],
        'Morning sun is in the east, so the shadow points west. West is on the left of someone facing north.', LOGIC),
    ],
  },
  {
    unitCode: 'T_APTITUDE_REASONING_SEATING',
    notes: `Seating and arrangement puzzles give a list of people and a list of clues, and ask several
questions about the final arrangement. They reward being systematic far more than being clever.

**The method.**

1. **Draw the empty seats first** — a numbered row, or a circle of marks — and write which way
   the people face.
2. **Place the definite clues first.** "C sits in the middle" or "K is at the right end" fixes a
   seat. Clues that only relate two people wait.
3. **Attach relative clues to people already placed.** "A is immediately right of C" is now a
   definite seat.
4. **Branch when you must.** If a clue allows two positions, draw both cases and let later clues
   kill one.
5. **Check every clue against the final drawing** before answering.

**Worked example.** Five friends sit in a row facing north. C is in the middle. A is immediately
right of C. B sits at an end, next to E. Seats 1 to 5 run left to right.

    C = 3, A = 4.  B at an end: seat 1 or 5.
    If B = 5, E must be 4 — taken by A.  So B = 1, E = 2, D = 5.
    Row: B E C A D

**Facing direction changes left and right.**

- Facing north (towards the top of the page): their left is the left of your drawing.
- **Facing south: their left is your right.** A row facing south is a mirror image.
- **Around a table facing the centre: left is clockwise, right is anticlockwise.** Picture the
  person at the bottom of the circle looking up; their left hand points to the left of the page,
  which is the clockwise direction from where they sit.
- Facing outwards, both are reversed.

"Second to the left of E" means count two seats in E's left direction, not "somewhere to the
left". "Between A and B" means somewhere between unless the clue says "immediately".

**Positions from both ends.** In a row of n people, a person kth from the right is
(n − k + 1)th from the left. With Ram 14th from the left and Shyam 12th from the right in a row
of 20, Shyam is 9th from the left, and the people strictly between them are seats 10 to 13:
four people. Forgetting the "+ 1" gives five.

**The trap.** Drawing a south-facing row as if it faced north. Write the facing direction on
your sketch before you place anybody.`,
    mcqs: [
      mcq('P, Q, R, S and T sit in a row facing north. R is at the extreme left. T is second to the right of R. Q is immediately right of T. S is not next to R. Who sits in the middle?',
        [['T', true], ['P', false], ['Q', false], ['S', false]],
        'R takes seat 1, T seat 3 and Q seat 4. S cannot be in seat 2 next to R, so S is in seat 5 and P in seat 2, leaving T in the middle.'),
      mcq('Four students sit in a row facing south. Asha is second from the west end. Bala is immediately to Asha\'s right and Chitra immediately to her left. Who sits at the west end?',
        [['Bala', true], ['Chitra', false], ['Asha', false], ['Dev', false]],
        'Facing south, a person\'s right hand points west. So Bala is just west of Asha, at the west end, and Chitra is just east of her.'),
      mcq('Six friends sit around a round table facing the centre, clockwise in the order A, B, C, D, E, F. Who is immediately to the left of C?',
        [['D', true], ['B', false], ['E', false], ['F', false]],
        'For people facing the centre, left is the clockwise direction. The next seat clockwise from C is D.'),
      mcq('In a row of 20 students, Ram is 14th from the left and Shyam is 12th from the right. How many students sit between them?',
        [['4', true], ['6', false], ['5', false], ['3', false]],
        'Shyam is 20 − 12 + 1 = 9th from the left. The students strictly between seats 9 and 14 are in seats 10 to 13: four.'),
    ],
    checkpoint: [
      mcq('J, K, L, M and N sit in a row facing north. K is at the right end. M is immediately left of K. J is in the middle. N is not at an end. Who is at the left end?',
        [['L', true], ['N', false], ['J', false], ['M', false]],
        'K is in seat 5, M in seat 4 and J in seat 3. N cannot take an end, so N is in seat 2 and L is left with seat 1.', LOGIC),
      mcq('Eight people sit around a round table facing the centre, clockwise in the order P, Q, R, S, T, U, V, W. Who is third to the right of S?',
        [['P', true], ['V', false], ['Q', false], ['W', false]],
        'Facing the centre, right is anticlockwise. Counting anticlockwise from S gives R, Q, then P. Counting clockwise gives the trap V.', LOGIC),
      mcq('Tara and Uma sit facing each other across a table, and the window is on Tara\'s right. Where is the window relative to Uma?',
        [['On Uma\'s left', true], ['On Uma\'s right', false], ['Directly behind Uma', false], ['Directly behind Tara', false]],
        'Two people facing each other have their left and right sides reversed, so whatever is on Tara\'s right is on Uma\'s left.', LOGIC),
    ],
  },
  {
    unitCode: 'T_APTITUDE_REASONING_SYLLOGISMS',
    notes: `A syllogism question gives two or three statements, which you must accept as true however odd
they sound, and asks which conclusion DEFINITELY follows. "All cats are machines" is a legal
statement here. What is tested is the logic, not your knowledge of cats.

**The four statement types.**

    All A are B          every A is inside B
    No A is B            A and B do not overlap at all
    Some A are B         at least one A is a B
    Some A are not B     at least one A is outside B

**"Some" means AT LEAST one — possibly all.** This is the single most tested point. "Some
students are athletes" does not tell you that some students are NOT athletes; every student might
be one. Reading "some" as "some but not all" is the trap behind a large share of wrong answers.
Equally, no statement in these questions means "exactly" anything unless it says so.

**The method: try to break the conclusion.** Draw the statements as circles, but draw them in
the way that is LEAST favourable to the conclusion. A conclusion follows only if it is true in
every drawing the statements allow. If you can draw one legal picture where it is false, it does
not follow.

**Worked example 1.** All cats are animals. Some animals are pets. Does "some cats are pets"
follow? Draw the cat circle inside the animal circle, then put the pet circle overlapping animals
but away from cats. Both statements hold and no cat is a pet, so the conclusion does **not**
follow — however natural it sounds.

**Worked example 2.** Some pens are books. No book is a table. The pens that are books sit inside
the book circle, which never touches tables, so "some pens are not tables" **follows**. "No pen is
a table" does not: other pens, outside the book circle, may be tables.

**Rules worth knowing.**

- "All A are B" gives "Some A are B" and "Some B are A", but never "All B are A". (Placement
  tests assume every group named in a statement has at least one member; formal logic does not,
  which is why a mathematics course may reject this step.)
- "No A is B" gives "No B is A".
- "All A are B" with "No B is C" gives "No A is C".
- Two "some" statements together give no definite conclusion.

**Possibility questions.** Some questions ask whether a conclusion is POSSIBLE. It is possible if
at least one legal drawing makes it true, and it is not possible only if every drawing makes it
false. "All pilots are travellers; some travellers are artists" makes "some pilots are artists"
possible but not certain.

**The trap.** Using what is true in the real world, or reading "some" as "not all". Decide from
the drawings alone.`,
    mcqs: [
      mcq('Statements: All engineers are graduates. Some graduates are singers. Which conclusion definitely follows?',
        [['Some graduates are engineers', true], ['Some engineers are singers', false], ['All singers are graduates', false], ['No engineer is a singer', false]],
        'Engineers lie inside graduates, so some graduates are engineers. The singers may or may not overlap the engineers, so neither singer conclusion is certain.'),
      mcq('Statements: No fruit is a vegetable. All apples are fruits. Which conclusion definitely follows?',
        [['No apple is a vegetable', true], ['Some vegetables are apples', false], ['All fruits are apples', false], ['Some apples are vegetables', false]],
        'Apples lie entirely inside fruits, and fruits never touch vegetables, so no apple can be a vegetable.'),
      mcq('Statements: Some doctors are writers. All writers are readers. Which conclusion definitely follows?',
        [['Some doctors are readers', true], ['All readers are writers', false], ['All doctors are readers', false], ['No doctor is a reader', false]],
        'The doctors who are writers are inside the writer circle, which lies inside readers, so at least those doctors are readers.'),
      mcq('Statements: All pilots are travellers. Some travellers are artists. Which conclusion is possible but not certain?',
        [['Some pilots are artists', true], ['All pilots are travellers', false], ['Some travellers are pilots', false], ['No pilot is a traveller', false]],
        'The artists may overlap the pilots or sit among the other travellers, so it is possible but not certain. Two options are certain and one is impossible.'),
    ],
    checkpoint: [
      mcq('Statements: Some boxes are cartons. No carton is a crate. Which conclusion definitely follows?',
        [['Some boxes are not crates', true], ['No box is a crate', false], ['Some crates are boxes', false], ['Some cartons are crates', false]],
        'The boxes that are cartons can never be crates, so some boxes are not crates. Other boxes might be crates, so "no box is a crate" is not certain.', LOGIC),
      mcq('Statements: All keys are metals. No metal is a plastic. Which conclusion definitely follows?',
        [['No key is a plastic', true], ['Some keys are plastics', false], ['All metals are keys', false], ['Some plastics are metals', false]],
        'Keys lie inside metals, and metals never overlap plastics, so no key can be a plastic.', LOGIC),
      mcq('From the statement "Some students are athletes", a candidate concludes "Some students are not athletes". Does this follow?',
        [['No, because "some" allows that all are', true], ['Yes, because "some" rules out all of them', false], ['Yes, provided there are many students', false], ['No, because "some" means exactly one', false]],
        '"Some" means at least one, possibly all. A drawing with every student an athlete satisfies the statement and breaks the conclusion.', LOGIC),
    ],
  },
  {
    unitCode: 'T_APTITUDE_REASONING_PRACTICE',
    notes: `No new ideas. This set mixes every reasoning family from the topic — number and letter series,
analogies, blood relations, directions, seating and syllogisms — because that is how they appear
in a real aptitude round: shuffled, timed, and with no heading to tell you which method to use.

**The method, for every question:**

1. **Name the family first.** Terms in a row: series. "Is to": analogy. A family: draw a tree.
   A walk: draw the path. People and seats: draw the seats. "All/some/no": draw circles.
2. **Apply that family's method on paper,** however easy it looks. The drawing is faster than
   recovering from a wrong guess.
3. **Predict the answer before reading the options.** Options are built from mistakes, and reading
   them first invites you to pick the one that looks familiar.
4. **Check the answer against the question, not your working.** Does the series rule produce
   every term? Does the arrangement satisfy every clue?

**The checklist that catches most lost marks:**

- The series rule fits the LAST terms, not just the first three.
- Letter positions checked with the EJOTY anchors, and wrapping handled past Z.
- No gender assumed that the question did not state.
- Left and right taken from the direction the person is FACING.
- Around a table facing the centre, left is clockwise.
- Position from the other end is n − k + 1.
- "Some" read as "at least one", and a conclusion accepted only if no drawing breaks it.

**Time strategy.** Placement rounds usually allow under a minute per question. Take two passes:
answer everything you can solve within about 45 seconds on the first pass, mark the rest, and
return to them with the time left. A seating puzzle carrying four questions is worth a careful
two minutes because the one drawing answers all of them; a single stubborn series is not.

**Trace your mistakes.** After the set, for every wrong answer, write which checklist item would
have caught it. The list you produce is your personal version of the checklist above.`,
    mcqs: [
      mcq('What comes next in the series 2, 6, 7, 21, 22, 66, ?',
        [['67', true], ['198', false], ['68', false], ['69', false]],
        'The steps alternate ×3 and +1: 2 × 3 = 6, 6 + 1 = 7, and so on. After ×3 gives 66, the next step is +1, giving 67.'),
      mcq('What comes next in the letter series Z, W, S, N, ?',
        [['H', true], ['I', false], ['G', false], ['J', false]],
        'The positions 26, 23, 19, 14 fall by 3, 4, 5, so the next fall is 6: 14 − 6 = 8, which is H.'),
      mcq('Pointing to a woman, Nikhil says, "She is the wife of my father\'s only son." How is the woman related to Nikhil?',
        [['Wife', true], ['Sister-in-law', false], ['Mother', false], ['Sister', false]],
        'Nikhil is a son of his father, so his father\'s only son is Nikhil himself. The woman is Nikhil\'s wife.'),
      mcq('Rohan walks 10 m south, turns left and walks 6 m, turns left and walks 10 m, then turns right and walks 4 m. Where is he relative to the start?',
        [['10 m east', true], ['2 m east', false], ['10 m west', false], ['6 m east', false]],
        'Facing south, left is east (6 m); facing east, left is north (10 m back level); facing north, right is east (4 m). He ends 6 + 4 = 10 m east.'),
      mcq('Statements: Some teachers are poets. Some poets are painters. What can be concluded about teachers and painters?',
        [['Nothing definite follows about the two groups', true], ['Some of the teachers must also be painters', false], ['None of the teachers can possibly be painters', false], ['Every poet must also be one of the teachers', false]],
        'Two "some" statements give no definite conclusion. The painting poets may or may not be the teaching poets, and both drawings are legal.'),
    ],
    checkpoint: [
      mcq('What comes next in the series 3, 5, 9, 17, 33, ?',
        [['65', true], ['49', false], ['66', false], ['64', false]],
        'Each term is double the previous minus one: 33 × 2 − 1 = 65. The gaps 2, 4, 8, 16 double as well, so the next gap is 32.', SERIES),
      mcq('In a row of 30 people, Lata is 11th from the left and Mohan is 8th from the right. How many people sit between them?',
        [['11', true], ['12', false], ['10', false], ['19', false]],
        'Mohan is 30 − 8 + 1 = 23rd from the left. The people strictly between seats 11 and 23 number 23 − 11 − 1 = 11.', LOGIC),
      mcq('A is the son of B. B is the daughter of C. C is the husband of D. How is D related to A?',
        [['Grandmother', true], ['Mother', false], ['Grandfather', false], ['Aunt', false]],
        'D is C\'s wife and so B\'s mother. B is A\'s mother, which makes D the mother of A\'s mother: A\'s grandmother.', LOGIC),
    ],
  },
  {
    unitCode: 'T_APTITUDE_REASONING_DEBUGGING',
    notes: `In a well-made aptitude question, every wrong option is the correct answer to a slightly
different question — the one you get by making a common mistake. That is why the wrong answer
feels right: you did real work to reach it. The skill in this unit is to examine a tempting
answer and find the step where it went wrong, BEFORE committing to it.

**The habit: ask what mistake would produce each option.** Once you have an answer, look at the
others and explain where each came from. If you cannot explain a distractor, it may be the right
answer and yours the mistake. If your own answer is exactly what a known mistake produces, redo
the working.

**The traps that produce most distractors, with examples.**

**1. A rule that fits only the first terms.** In 2, 4, 8, 14, 22, ? the start looks like doubling,
which predicts 44. But 8 → 14 is not doubling. The gaps are 2, 4, 6, 8, so the next is 10 and the
answer is 32. A student who repeats the last gap answers 30; one who doubles answers 44. Both
options will be there.

**2. Reversing an "all".** "All managers are employees" does not give "all employees are
managers". Draw managers as a small circle inside a large employee circle and the reversal is
visibly false.

**3. Reading "some" as "not all".** "Some phones are cameras" allows every phone to be a camera,
so "some phones are not cameras" does not follow.

**4. Assuming a gender.** "Pat is Sam's sibling" does not make Pat a brother. The option "brother"
is there for the reader who filled the gap with a guess.

**5. Left and right from the wrong viewpoint.** Facing south, left is east. Facing the centre of
a round table, left is clockwise. A student who answers as if everybody faced north picks the
mirror-image seat, which is always an option.

**6. Counting positions without the + 1.** The kth from the right in a row of n is
(n − k + 1)th from the left. Dropping the 1 puts the answer one seat away.

**7. Distance travelled instead of distance from the start.** Walking 6 km east then 8 km north
covers 14 km and ends 10 km away. Both numbers are options.

**Worked examination.** Question: Z, W, S, N, ? A student answers I.

- The positions are 26, 23, 19, 14, falling by 3, 4, 5.
- I is 9, a fall of 5 again — the student repeated the last step.
- The fall grows each time, so the next is 6: 14 − 6 = 8, which is H.

Naming the mistake ("repeated the last step") is what stops you making it next time.`,
    mcqs: [
      mcq('For the series 2, 4, 8, 14, 22, ? a student answered 30. What did they miss?',
        [['The gaps grow by 2 each time, so the next is 10', true], ['The terms double, so the next term must be 44', false], ['The series alternates, so the next term is 16', false], ['The gaps are primes, so the next gap is 11', false]],
        'The gaps are 2, 4, 6, 8, so the next gap is 10 and the answer is 32. Repeating the last gap of 8 is what produced 30.'),
      mcq('From "All managers are employees", a student concluded "All employees are managers". What did they miss?',
        [['An "all" statement cannot be reversed', true], ['The statement needed "some" to be valid', false], ['The two groups must be kept separate', false], ['"All" statements give no conclusions', false]],
        'Managers form a circle inside the employee circle. Employees outside the manager circle exist in a legal drawing, so the reversal fails.'),
      mcq('Six people sit around a round table facing the centre. Asked who is immediately left of Farah, a student chose her anticlockwise neighbour. What did they miss?',
        [['Facing the centre, left is clockwise', true], ['A round table has no left or right', false], ['Left is counted from the table\'s head', false], ['The answer is whoever sits opposite', false]],
        'For someone facing the centre, their left hand points in the clockwise direction. The anticlockwise neighbour is on Farah\'s right.'),
      mcq('"Pat is Sam\'s sibling, and Sam is Chris\'s daughter." A student answered that Pat is Chris\'s son. What did they miss?',
        [['Pat\'s gender is never stated anywhere', true], ['Sam must be Pat\'s brother, not sister', false], ['Chris is Pat\'s grandparent, not parent', false], ['Siblings do not share the same parent', false]],
        'The statements make Pat a child of Chris, but "sibling" carries no gender. "Son" fills a gap the question left open.'),
    ],
    checkpoint: [
      mcq('For the series 3, 6, 11, 18, 27, ? a student answers 36, reasoning that the jump of 9 repeats. What is the correct answer?',
        [['38', true], ['36', false], ['37', false], ['54', false]],
        'The jumps are 3, 5, 7, 9, rising by 2, so the next jump is 11 and 27 + 11 = 38.', SERIES),
      mcq('Om faces south and turns left. A student says Om now faces west. Which way does Om actually face?',
        [['East', true], ['West', false], ['North', false], ['South', false]],
        'The student turned left as if facing north. Facing south, a person\'s left hand points east.', LOGIC),
      mcq('Statements: Some phones are cameras. All cameras are gadgets. A student concludes "All phones are gadgets". Which conclusion actually follows?',
        [['Some phones are gadgets', true], ['All phones are gadgets', false], ['All gadgets are cameras', false], ['No phone is a gadget', false]],
        'Only the phones that are cameras are certainly gadgets. Other phones may lie outside the gadget circle, so "all" does not follow.', LOGIC),
    ],
  },
  {
    unitCode: 'T_APTITUDE_DATA_READING_TABLES',
    notes: `A data interpretation set starts with a table and asks four or five questions about it. The
arithmetic is rarely hard. The marks are lost by reading the number next to the right one, or the
right number in the wrong unit.

**Read the frame before the numbers.** Spend ten seconds on:

- **The title** — what is being counted, and over what period.
- **The unit** — "in thousands", "Rs lakh", "%". A value of 45 in a column headed "Rs lakh" is
  Rs 45,00,000.
- **Row and column headings** — which dimension runs down and which runs across.
- **Totals and shares** — is a column an absolute count, or a percentage of something?

**Worked example.** Sales of a product, in thousands of units:

    Region    2022   2023   2024
    North      120    150    165
    South       90     90    108
    East        60     75     60

*Total sales in 2023?* Read DOWN the 2023 column: 150 + 90 + 75 = 315 thousand units — not the
North row across the years, which also adds three numbers.

*Which region grew most from 2022 to 2024?* North +45, South +18, East 0, so North.

*Which grew fastest in percentage terms?* North 45 ÷ 120 = 37.5%; South 18 ÷ 90 = 20%. North
again — but the two questions are different, and in other tables they give different answers.

**The method for each question.**

1. Underline the exact quantity asked for: which row, which column, which unit.
2. Put a finger (or the cursor) on the row and another on the column, and read the cell where
   they meet.
3. Write the unit next to the number you copy, so it survives into the answer.
4. Compute only what is asked. A question about 2023 needs nothing from 2022.

**Shares need their base.** A column "Market share (%)" with a note "Market size 2,000 units"
means a 35% share is 0.35 × 2,000 = 700 units. The 35 alone is not a number of units.

**The traps.** The adjacent column, especially when years sit side by side. A total row that you
add in again as if it were a region. An answer in thousands when the options are in units — the
options will contain both, three zeros apart. And "increase" read as "percentage increase", or the
reverse.`,
    mcqs: [
      mcq('Students by branch (Year 1 / Year 2): CSE 180 / 160, ECE 120 / 130, Mech 90 / 65. How many students are in Year 2 altogether?',
        [['355', true], ['390', false], ['745', false], ['345', false]],
        'Add the Year 2 figures only: 160 + 130 + 65 = 355. The Year 1 column totals 390, and 745 adds both years.'),
      mcq('Students by branch (Year 1 / Year 2): CSE 180 / 160, ECE 120 / 130, Mech 90 / 65. Which branch has the largest fall from Year 1 to Year 2?',
        [['Mech', true], ['CSE', false], ['ECE', false], ['No branch fell', false]],
        'Mech falls by 90 − 65 = 25 and CSE by 180 − 160 = 20, while ECE rises by 10. Mech\'s fall is the largest.'),
      mcq('A table headed "Revenue (Rs lakh)" shows 45 for 2023 and 54 for 2024. What was the increase in rupees?',
        [['Rs 9,00,000', true], ['Rs 9,000', false], ['Rs 90,000', false], ['Rs 9', false]],
        'The increase is 54 − 45 = 9 lakh, and one lakh is 1,00,000, so the increase is Rs 9,00,000.'),
      mcq('A table gives market shares A 40%, B 35%, C 25%, and a note says the market size is 2,000 units. How many units did B sell?',
        [['700', true], ['35', false], ['350', false], ['800', false]],
        'B sold 35% of 2,000, which is 0.35 × 2,000 = 700 units. The share is not itself a count, and 800 is A\'s figure.'),
    ],
    checkpoint: [
      mcq('Monthly rainfall in mm: Jun 180, Jul 260, Aug 220, Sep 140. What is the total rainfall from July to September?',
        [['620 mm', true], ['800 mm', false], ['480 mm', false], ['640 mm', false]],
        'July to September is 260 + 220 + 140 = 620 mm. Including June gives 800 mm, and stopping at August gives 480 mm.', DI),
      mcq('Car sales in units: Q1 400, Q2 460, Q3 530, Q4 610. Which describes the trend?',
        [['Rising, by a larger amount each quarter', true], ['Rising, by the same amount each quarter', false], ['Rising, by a smaller amount each quarter', false], ['Rising until Q3, and then falling in Q4', false]],
        'The quarter-on-quarter increases are 60, 70 and 80, so sales rise and the rise itself grows each quarter.', PATTERN),
      mcq('Stock table: laptops — Store A 48, Store B 36; tablets — Store A 30, Store B 42. How many more devices does Store B hold than Store A?',
        [['0', true], ['12', false], ['6', false], ['18', false]],
        'Store A holds 48 + 30 = 78 and Store B holds 36 + 42 = 78. The laptop and tablet differences of 12 cancel exactly.', DI),
    ],
  },
  {
    unitCode: 'T_APTITUDE_DATA_CHARTS',
    notes: `Charts carry the same data as tables, arranged so that one kind of comparison is easy. Reading
a chart well means knowing which comparison each type is built for, and what it makes hard.

**Bar charts compare categories.** Read the value at the top of each bar against the gridlines.
When a bar ends between gridlines, estimate from the halfway point and check whether the options
are far enough apart for an estimate to be enough — they usually are.

**Stacked bars** put segments on top of each other. The top of a segment is a running total, not
the segment's value: a segment running from 120 to 200 is worth 80. Only the bottom segment can
be read straight off the axis.

**Line charts show change over time.** The slope of each segment is the change between two
points. The steepest segment is the largest ABSOLUTE change — which is not necessarily the largest
PERCENTAGE change, because the same rise from a lower starting value is a larger percentage.

**Pie charts show shares of one total.**

- A sector's share = its angle ÷ 360. Angle = share × 3.6 degrees per percent.
- Value = share × total. A sector of 54° in a Rs 60,000 budget is 54 ÷ 360 = 15%, so Rs 9,000.
- Useful angles: 90° is 25%, 72° is 20%, 36° is 10%, 18° is 5%.

**Worked example.** A monthly budget of Rs 40,000 has rent at 108° and food at 90°.
Rent = 108 ÷ 360 = 30% = Rs 12,000. Food = 25% = Rs 10,000. Rent exceeds food by 18°, which is
5% of the budget, Rs 2,000 — a quicker route than computing both.

**The pie trap: shares are not sizes.** Two pie charts for different years can show a category's
share falling while its actual number rises, because the total grew. IT at 25% of 400 staff is
100 people; IT at 20% of 600 staff is 120 people. Whenever two pies are compared, multiply each
share by its own total before saying anything rose or fell.

**The line trap: equal slopes, shrinking growth.** A population rising by the same number of
people every year draws a straight line. Its percentage growth is FALLING each year, because the
same increase is divided by an ever larger base.

(Charts that mislead through their axes are covered in the statistics topic; here the chart is
assumed honest and the task is reading it accurately and quickly.)`,
    mcqs: [
      mcq('In a pie chart of a Rs 60,000 budget, the travel sector measures 54°. How much is spent on travel?',
        [['Rs 9,000', true], ['Rs 32,400', false], ['Rs 5,400', false], ['Rs 6,000', false]],
        'The share is 54 ÷ 360 = 15%, and 15% of Rs 60,000 is Rs 9,000. Treating 54 as a percentage gives Rs 32,400.'),
      mcq('A line chart of website visitors reads Mon 200, Tue 260, Wed 300, Thu 330, Fri 340. Between which two consecutive days is the line steepest?',
        [['Mon to Tue', true], ['Thu to Fri', false], ['Wed to Thu', false], ['Tue to Wed', false]],
        'The daily rises are 60, 40, 30 and 10. The largest rise, Monday to Tuesday, is the steepest segment.'),
      mcq('Pie charts show IT as 25% of 400 staff in 2023 and 20% of 600 staff in 2024. What happened to the number of IT staff?',
        [['It rose from 100 to 120', true], ['It fell, since 25% became 20%', false], ['It fell from 120 to 100', false], ['It stayed the same at 100', false]],
        'Multiply each share by its own total: 25% of 400 is 100 and 20% of 600 is 120. The share fell while the number rose.'),
      mcq('A stacked bar for March shows an Online segment from 0 to 120 and an In-store segment on top of it from 120 to 200. How many in-store sales were there?',
        [['80', true], ['200', false], ['120', false], ['320', false]],
        'A stacked segment is worth the distance from its bottom to its top: 200 − 120 = 80. The top of the bar, 200, is the combined total.'),
    ],
    checkpoint: [
      mcq('In a pie chart, what angle does a sector representing 35% of the total have?',
        [['126°', true], ['35°', false], ['135°', false], ['105°', false]],
        'Each percent is 3.6 degrees, so 35 × 3.6 = 126°.', DI),
      mcq('A bar chart of exports (Rs crore) shows 2021 50, 2022 60, 2023 75, 2024 90. Which year had the largest percentage growth over the year before?',
        [['2023', true], ['2024', false], ['2022', false], ['2023 and 2024 equally', false]],
        'Growth was 10 ÷ 50 = 20% in 2022, 15 ÷ 60 = 25% in 2023 and 15 ÷ 75 = 20% in 2024. The absolute rises tie; the percentages do not.', DI),
      mcq('A line chart of a town\'s population is a straight rising line: the same number of people is added every year. What is true of the yearly percentage growth?',
        [['It falls a little every year', true], ['It stays the same every year', false], ['It rises a little every year', false], ['It cannot be judged from a line', false]],
        'The same increase is divided by a larger population each year, so the percentage growth shrinks even though the line is straight.', PATTERN),
    ],
  },
  {
    unitCode: 'T_APTITUDE_DATA_PERCENTAGES',
    notes: `Percentages carry more aptitude marks than any other single idea, and almost every mistake
comes from dividing by the wrong base.

**Percentage change always divides by the ORIGINAL value.**

    percentage change = (new − old) ÷ old × 100

A price rising from Rs 12,000 to Rs 15,000 rises by 3,000 ÷ 12,000 = 25%. Dividing by the new
price gives 20%, and 20% will be an option.

**Percent is not percentage points.** An interest rate moving from 4% to 5% has risen by
**1 percentage point**, and by **25%** (1 ÷ 4). A news headline saying "rose 1%" is wrong on
both counts. When a question's quantity is already a percentage, read carefully which of the two
it asks for.

**Successive changes multiply; they do not add.** A 20% rise multiplies by 1.2, a 20% fall by
0.8. So a 20% rise followed by a 20% fall multiplies by 1.2 × 0.8 = 0.96, a net 4% FALL, not
zero. The shortcut for changes of a% then b% (falls negative):

    net change = a + b + (a × b) ÷ 100

- +20 then −20: 20 − 20 − 400 ÷ 100 = −4%.
- +10 then +10: 10 + 10 + 1 = 21%.
- +50 then −50: 50 − 50 − 25 = −25%. A 50% fall does not undo a 50% rise.

**Going backwards.** After a 25% rise a salary is Rs 50,000. The original is NOT 50,000 minus
25%. The rise multiplied the original by 1.25, so divide: 50,000 ÷ 1.25 = Rs 40,000.

**"More than" and "less than" use different bases.** If A is 25% more than B, then A = 1.25B, so
B = A ÷ 1.25 = 0.8A — B is 20% less than A. For a rise of r%, the matching fall is r ÷ (100 + r)
× 100.

**Fractions to know by sight.**

    50% = 1/2     25% = 1/4     20% = 1/5     12.5% = 1/8
    33⅓% = 1/3   16⅔% = 1/6   37.5% = 3/8   62.5% = 5/8   87.5% = 7/8

37.5% of 640 is 3/8 of 640: 640 ÷ 8 = 80, and 80 × 3 = 240. No decimals needed.

**The trap.** Using the new value as the base, adding successive percentages, or reversing a rise
by subtracting the same percentage. Each produces an option, every time.`,
    mcqs: [
      mcq('A phone\'s price rises from Rs 12,000 to Rs 15,000. What is the percentage increase?',
        [['25%', true], ['20%', false], ['30%', false], ['3%', false]],
        'The rise is 3,000 on an original price of 12,000, and 3,000 ÷ 12,000 = 25%. Dividing by the new price gives the trap 20%.'),
      mcq('An unemployment rate moves from 4% to 5%. Which statement is correct?',
        [['It rose by 1 percentage point, which is 25%', true], ['It rose by 1%, which is 1 percentage point', false], ['It rose by 20%, which is 1 percentage point', false], ['It rose by 25 percentage points in total', false]],
        'The difference 5 − 4 is one percentage point. As a proportion of the original rate it is 1 ÷ 4 = 25%.'),
      mcq('A price is raised by 20%, and the new price is then cut by 20%. What is the net effect?',
        [['A 4% decrease', true], ['No change', false], ['A 4% increase', false], ['A 2% decrease', false]],
        'The price is multiplied by 1.2 and then 0.8, and 1.2 × 0.8 = 0.96, a 4% decrease. The cut applies to the larger price.'),
      mcq('After a 25% increase, a salary is Rs 50,000. What was the salary before the increase?',
        [['Rs 40,000', true], ['Rs 37,500', false], ['Rs 45,000', false], ['Rs 62,500', false]],
        'The increase multiplied the original by 1.25, so the original is 50,000 ÷ 1.25 = 40,000. Taking 25% off 50,000 gives the trap 37,500.'),
    ],
    checkpoint: [
      mcq('A town\'s population rises by 10% in one year and by 10% again the next. What is the overall increase?',
        [['21%', true], ['20%', false], ['11%', false], ['19%', false]],
        'Two rises of 10% multiply the population by 1.1 × 1.1 = 1.21, an increase of 21%. The second rise applies to a larger base.', DI),
      mcq('If A is 25% more than B, by what percentage is B less than A?',
        [['20%', true], ['25%', false], ['33.3%', false], ['80%', false]],
        'A = 1.25B, so B = A ÷ 1.25 = 0.8A, which is 20% less than A. The base changes from B to A.', DI),
      mcq('Recognising 37.5% as a simple fraction, what is 37.5% of 640?',
        [['240', true], ['224', false], ['256', false], ['250', false]],
        '37.5% is 3/8, and 640 ÷ 8 × 3 = 240. The option 224 is 35% and 256 is 40%.', PATTERN),
    ],
  },
  {
    unitCode: 'T_APTITUDE_DATA_RATIOS',
    notes: `A ratio compares quantities by how many PARTS each has. Almost every ratio question is solved
by finding the value of one part and multiplying.

**Sharing in a ratio.** Divide Rs 7,200 in the ratio 2 : 3 : 4.

    total parts = 2 + 3 + 4 = 9
    one part    = 7,200 ÷ 9 = 800
    shares      = 1,600, 2,400, 3,200

Check: the shares add back to 7,200.

**The trap: a ratio is not a fraction of the total.** In a ratio 3 : 5, the first quantity is
3/8 of the total, not 3/5. 3/5 is the first quantity as a fraction of the SECOND. Questions that
share a total always need the parts added first.

**Using a difference.** Boys and girls are 5 : 3 and there are 12 more boys. The difference is
5 − 3 = 2 parts, so one part is 6, and the class has 8 × 6 = 48 students (30 boys, 18 girls).
Whatever is known — a total, a difference, one share — tells you how many parts it is worth.

**Combining two ratios.** A : B = 2 : 3 and B : C = 4 : 5. B is 3 parts in one and 4 in the
other, so scale both to make B the same: multiply the first by 4 and the second by 3.

    A : B = 8 : 12,  B : C = 12 : 15   ->   A : B : C = 8 : 12 : 15

So A : C = 8 : 15. Writing 2 : 5 by joining the outer numbers directly ignores that B's parts
were different sizes.

**Direct and inverse proportion.** If one quantity doubles when the other doubles, they are in
direct proportion (cost and quantity). If one halves when the other doubles, the proportion is
inverse (workers and days for a fixed job). For inverse proportion the product stays fixed:
6 workers × 10 days = 60 worker-days, so 4 workers need 60 ÷ 4 = 15 days.

**Changing a ratio by adding.** 40 litres of milk and water in 3 : 1 holds 30 L milk and 10 L
water. To reach 3 : 2, the milk stays at 30, so water must be 20: add 10 litres. Keep the
quantity that does not change fixed and scale around it.

**Comparing ratios quickly.** To compare 5 : 8 with 7 : 11, cross-multiply: 5 × 11 = 55 and
7 × 8 = 56, so 7 : 11 is the larger. No decimals needed.`,
    mcqs: [
      mcq('Rs 4,500 is divided between Asha and Bhanu in the ratio 4 : 5. How much does Asha receive?',
        [['Rs 2,000', true], ['Rs 2,500', false], ['Rs 3,600', false], ['Rs 1,125', false]],
        'There are 4 + 5 = 9 parts, each worth 4,500 ÷ 9 = 500, so Asha gets 4 × 500 = Rs 2,000. Taking 4/5 of the total gives Rs 3,600.'),
      mcq('If A : B = 2 : 3 and B : C = 4 : 5, what is A : C?',
        [['8 : 15', true], ['2 : 5', false], ['8 : 12', false], ['10 : 12', false]],
        'Scale to make B equal: A : B = 8 : 12 and B : C = 12 : 15, so A : C = 8 : 15.'),
      mcq('In a class the ratio of boys to girls is 5 : 3, and there are 12 more boys than girls. How many students are in the class?',
        [['48', true], ['32', false], ['96', false], ['60', false]],
        'The difference of 5 − 3 = 2 parts is 12 students, so one part is 6 and the class has 8 × 6 = 48.'),
      mcq('Six workers finish a job in 10 days. At the same rate, how many days would four workers take?',
        [['15 days', true], ['About 6.7 days', false], ['8 days', false], ['12 days', false]],
        'The job needs 6 × 10 = 60 worker-days, so four workers take 60 ÷ 4 = 15 days. Fewer workers means more days, not fewer.'),
    ],
    checkpoint: [
      mcq('A profit of Rs 9,600 is shared among three partners in the ratio 3 : 4 : 5. What is the largest share?',
        [['Rs 4,000', true], ['Rs 3,200', false], ['Rs 2,400', false], ['Rs 4,800', false]],
        'There are 12 parts of 9,600 ÷ 12 = 800 each, so the largest share is 5 × 800 = Rs 4,000.', DI),
      mcq('A 40-litre mixture of milk and water is in the ratio 3 : 1. How much water must be added to make the ratio 3 : 2?',
        [['10 litres', true], ['20 litres', false], ['5 litres', false], ['15 litres', false]],
        'The mixture holds 30 L milk and 10 L water. For 3 : 2 with the milk fixed at 30 L, water must be 20 L, so add 10 L.', DI),
      mcq('Comparing them as fractions, which of these ratios is the largest?',
        [['2 : 3', true], ['7 : 11', false], ['5 : 8', false], ['3 : 5', false]],
        'As decimals they are 0.667, 0.636, 0.625 and 0.6. Cross-multiplying pairs, such as 2 × 11 = 22 against 7 × 3 = 21, gives the same order.', PATTERN),
    ],
  },
  {
    unitCode: 'T_APTITUDE_DATA_AVERAGES',
    notes: `Aptitude average questions are almost never "add these and divide". They combine groups,
change a group, or average speeds — and in each the obvious method gives a wrong option.

**Work with totals, not averages.** An average is a total shared equally, and totals can be
added and subtracted where averages cannot. Convert every average into a total first:
total = average × count.

**Combining groups: the weighted average.** Class A has 30 students averaging 60; class B has
20 averaging 70.

    totals    30 × 60 = 1,800    20 × 70 = 1,400
    combined  3,200 ÷ 50 = 64

The obvious answer, 65, averages the two averages as if the classes were the same size. The
combined average always lies between the two, closer to the larger group.

When groups are given as percentages, the percentages are the weights: 30% averaging 80 and 70%
averaging 50 gives 0.3 × 80 + 0.7 × 50 = 24 + 35 = 59.

**Adding, removing or replacing one item.**

- Five numbers average 24 (total 120). One is removed and the rest average 22 (total 88). The
  removed number is 120 − 88 = 32.
- A batsman averages 45 over 10 innings (total 450). To average 47 over 11, he needs a total of
  517, so 67 in the eleventh innings.
- The average weight of 8 people rises by 1.5 kg when one person of 60 kg is replaced. The total
  rose by 8 × 1.5 = 12 kg, so the newcomer weighs 60 + 12 = 72 kg.

**Average speed is not the average of the speeds.** Driving 120 km at 60 km/h and back at
40 km/h takes 2 hours and 3 hours: 240 km in 5 hours is 48 km/h, not 50. The slower leg lasts
longer, so it carries more weight. For two EQUAL distances the shortcut is
2ab ÷ (a + b) = 2 × 60 × 40 ÷ 100 = 48.

**The deviation shortcut.** To average 97, 103, 99, 106, 98, pick a round base of 100 and
average the differences instead: −3, +3, −1, +6, −2 sum to +3, and 3 ÷ 5 = 0.6, so the average is
100.6. The numbers you actually handle are tiny.

(This unit is about computing averages quickly. Which average best describes a data set — mean,
median or mode — belongs to the statistics topic.)`,
    mcqs: [
      mcq('Section A has 40 students averaging 72 marks and Section B has 60 students averaging 62. What is the combined average?',
        [['66', true], ['67', false], ['64', false], ['68', false]],
        'The totals are 40 × 72 = 2,880 and 60 × 62 = 3,720, so the average is 6,600 ÷ 100 = 66. The simple average of 72 and 62 is 67.'),
      mcq('A car travels 120 km to a town at 60 km/h and returns along the same road at 40 km/h. What is its average speed for the round trip?',
        [['48 km/h', true], ['50 km/h', false], ['45 km/h', false], ['52 km/h', false]],
        'The trip takes 2 + 3 = 5 hours for 240 km, so the average is 240 ÷ 5 = 48 km/h. The slower leg lasts longer and pulls it below 50.'),
      mcq('The average of five numbers is 24. When one number is removed, the average of the remaining four is 22. Which number was removed?',
        [['32', true], ['2', false], ['24', false], ['26', false]],
        'The total falls from 5 × 24 = 120 to 4 × 22 = 88, so the removed number is 120 − 88 = 32.'),
      mcq('The average weight of 8 people rises by 1.5 kg when a person weighing 60 kg is replaced by a newcomer. How much does the newcomer weigh?',
        [['72 kg', true], ['61.5 kg', false], ['66 kg', false], ['69 kg', false]],
        'The total weight rose by 8 × 1.5 = 12 kg, so the newcomer weighs 60 + 12 = 72 kg. Adding only 1.5 kg ignores the other seven people.'),
    ],
    checkpoint: [
      mcq('In an exam, 30% of candidates averaged 80 marks and the remaining 70% averaged 50. What is the overall average?',
        [['59', true], ['65', false], ['71', false], ['56', false]],
        'Weight each average by its share: 0.3 × 80 + 0.7 × 50 = 24 + 35 = 59. Swapping the weights gives 71, and ignoring them gives 65.', DI),
      mcq('A batsman averages 45 runs over 10 innings. How many must he score in the 11th innings to raise his average to 47?',
        [['67', true], ['47', false], ['49', false], ['69', false]],
        'He needs a total of 11 × 47 = 517 against 10 × 45 = 450 so far, so 517 − 450 = 67 runs.', DI),
      mcq('Using 100 as a base, what is the average of 97, 103, 99, 106 and 98?',
        [['100.6', true], ['103', false], ['100.3', false], ['101', false]],
        'The deviations −3, +3, −1, +6 and −2 sum to +3, and 3 ÷ 5 = 0.6, so the average is 100.6. The direct total 503 ÷ 5 agrees.', PATTERN),
    ],
  },
  {
    unitCode: 'T_APTITUDE_DATA_SPEED_TECHNIQUES',
    notes: `A data interpretation section is usually designed so that computing every answer exactly
does not fit in the time. The techniques here get the right option without the full calculation,
and they work because the options are rarely close together.

**1. Look at the options before calculating.** If they are 3,000, 2,400, 3,600 and 3,300, you
need an answer good to about 5%, not to the last digit. 49.8% of 6,012 is "half of 6,000", so
3,000 — the exact value, 2,994, changes nothing.

**2. Round to friendly numbers.** (398 × 51) ÷ 99 is close to 400 × 50 ÷ 100 = 200. The exact
value is about 205. Round in opposite directions where you can, so the errors cancel.

**3. Eliminate with the last digit.** 23 × 47 must end in 1, because 3 × 7 = 21. If only one
option ends in 1, you are done without multiplying. Combine with size: 23 × 47 is a little under
25 × 45 ≈ 1,100.

**4. Split percentages into easy pieces.** 10% is a decimal-point shift, 5% is half of that,
1% another shift. 17.5% of 480 = 10% (48) + 5% (24) + 2.5% (12) = 84.

**5. Use the fraction table.** 12.5% = 1/8, 62.5% = 5/8, 16⅔% = 1/6. 62.5% of 1,440 is
1,440 ÷ 8 × 5 = 900.

**6. Compare fractions by cross-multiplying or against a benchmark.** Is 7/12 or 3/5 larger?
7 × 5 = 35 and 3 × 12 = 36, so 3/5. Or compare each with 0.6: 7/12 is just below it.

**7. Estimate percentage change from rounded values.** Sales from 4,812 to 6,011 rose by about
1,200 on about 4,800, which is 25%. Remember the base is the OLD value: 1,200 on 6,000 would
suggest 20%, and that option will be there.

**Knowing when to skip.** Set a budget — about a minute a question — and a rule: if after half
the budget you do not yet know the METHOD, mark the question and move on. Questions on one table
share their reading time, so finish a set you have started before abandoning it; a lone question
on a new chart is the one to skip first.

**The trap.** Estimating when the options are close. If two options differ by less than your
rounding error, stop estimating and calculate — estimation is a tool for spread-out options, not
a replacement for arithmetic.`,
    mcqs: [
      mcq('Without exact calculation, 49.8% of 6,012 is closest to which value?',
        [['3,000', true], ['2,400', false], ['3,600', false], ['3,300', false]],
        '49.8% is almost exactly half, and half of about 6,000 is 3,000. The exact value, 2,994, is nowhere near the other options.'),
      mcq('Which of these fractions is the largest: 7/12, 11/19, 4/7 or 3/5?',
        [['3/5', true], ['7/12', false], ['11/19', false], ['4/7', false]],
        'Against the benchmark 0.6, 3/5 equals it while 7/12 ≈ 0.583, 11/19 ≈ 0.579 and 4/7 ≈ 0.571 all fall short.'),
      mcq('Using the last digit alone, which of these is 23 × 47?',
        [['1,081', true], ['1,084', false], ['1,127', false], ['987', false]],
        'Since 3 × 7 = 21, the product must end in 1, and only 1,081 does. Checking: 23 × 50 − 23 × 3 = 1,150 − 69 = 1,081.'),
      mcq('Splitting the percentage into 10%, 5% and 2.5%, what is 17.5% of 480?',
        [['84', true], ['72', false], ['96', false], ['88', false]],
        '10% of 480 is 48, 5% is 24 and 2.5% is 12, which add to 84. The option 72 is only 15%.'),
    ],
    checkpoint: [
      mcq('The value of (398 × 51) ÷ 99 is closest to which of these?',
        [['200', true], ['150', false], ['250', false], ['400', false]],
        'Rounding gives 400 × 50 ÷ 100 = 200. The exact value is about 205, still far closer to 200 than to 250.', PATTERN),
      mcq('Using 62.5% = 5/8, what is 62.5% of 1,440?',
        [['900', true], ['864', false], ['936', false], ['720', false]],
        '1,440 ÷ 8 = 180, and 180 × 5 = 900. The option 864 is 60% and 936 is 65%.', DI),
      mcq('Using only the last digit, which of these is the product 67 × 38?',
        [['2,546', true], ['2,548', false], ['2,543', false], ['2,552', false]],
        'Since 7 × 8 = 56, the product ends in 6, and only 2,546 does. Checking: 67 × 40 − 67 × 2 = 2,680 − 134 = 2,546.', PATTERN),
    ],
  },
  {
    unitCode: 'T_APTITUDE_DATA_PRACTICE',
    notes: `No new ideas. This set mixes tables, charts, percentages, ratios and averages the way a
placement data interpretation section does: numbers you must first find, then compute with,
under a clock.

**The method, for every question:**

1. **Read the frame** — title, unit, what each row and column is — before any question.
2. **Underline the quantity asked for,** including its unit and its period.
3. **Write the calculation before doing it.** "13 ÷ 65" catches a wrong base before you have
   spent time dividing.
4. **Glance at the options** to decide how exact you need to be.
5. **Sanity-check the answer**: a combined average between the two group averages, shares that
   add back to the total, a percentage growth that matches the size of the rise.

**The checklist that catches most lost marks:**

- Percentage change divides by the OLD value.
- Percentage points are not percent.
- Successive changes multiply: +20% then −20% is −4%.
- Reversing a rise divides by (1 + r), never subtracts r%.
- A ratio's share of a total uses the SUM of the parts.
- Combined averages go through totals; average speed goes through total time.
- Pie charts: multiply the share by its own total before comparing years.
- Units: lakh, crore, thousand — the options differ by exactly those factors.

**Time strategy.** Read the table or chart once, carefully, for up to a minute: that minute is
shared by every question on it. Then aim for about a minute per question. Answer the ones that
need a single lookup first, then the calculations, and estimate wherever the options are spread
out. If a question needs a figure the data does not give, it is usually testing whether you
notice — not an invitation to assume one.

**After the set**, rework each wrong answer and name the checklist item that would have caught
it. A mistake with a name is one you can stop making.`,
    mcqs: [
      mcq('Enrolments on an online platform, in thousands: 2021 40, 2022 50, 2023 65, 2024 78. What was the percentage growth from 2023 to 2024?',
        [['20%', true], ['13%', false], ['16.7%', false], ['30%', false]],
        'The rise is 78 − 65 = 13 thousand on a base of 65, and 13 ÷ 65 = 20%. Dividing by 78 gives 16.7%, and 30% is the 2023 growth.'),
      mcq('Enrolments on an online platform, in thousands: 2021 40, 2022 50, 2023 65, 2024 78. What is the ratio of 2021 enrolments to 2024 enrolments?',
        [['20 : 39', true], ['39 : 20', false], ['1 : 2', false], ['4 : 7', false]],
        '40 : 78 simplifies by 2 to 20 : 39. The reversed order answers a different question, and 1 : 2 is only an approximation.'),
      mcq('Enrolments on an online platform, in thousands: 2021 40, 2022 50, 2023 65, 2024 78. What was the average yearly enrolment over the four years?',
        [['58.25 thousand', true], ['59 thousand', false], ['77.67 thousand', false], ['46.6 thousand', false]],
        'The total is 40 + 50 + 65 + 78 = 233 thousand over 4 years, so 233 ÷ 4 = 58.25 thousand. Averaging only the first and last years gives 59.'),
      mcq('A college\'s 1,200 students are split by club: Coding 30%, Music 25%, Sports 45%. How many more students are in Sports than in Coding?',
        [['180', true], ['15', false], ['540', false], ['360', false]],
        'The difference in share is 45% − 30% = 15%, and 15% of 1,200 is 180. The bare 15 is percentage points, not students.'),
      mcq('A shop sells 60 items at a profit of Rs 50 each and 40 items at a profit of Rs 25 each. What is the average profit per item?',
        [['Rs 40', true], ['Rs 37.50', false], ['Rs 42.50', false], ['Rs 30', false]],
        'Total profit is 60 × 50 + 40 × 25 = 4,000 on 100 items, so Rs 40 each. Averaging 50 and 25 directly ignores the different quantities.'),
    ],
    checkpoint: [
      mcq('A share price falls by 20% and then rises by 25%. What is the net change?',
        [['No net change', true], ['A 5% increase', false], ['A 5% decrease', false], ['A 1% decrease', false]],
        'The price is multiplied by 0.8 and then by 1.25, and 0.8 × 1.25 = 1. Adding the percentages instead suggests a 5% increase.', DI),
      mcq('Quarterly profits in Rs lakh are 18, 24, 32 and 42. If the pattern of increases continues, what will the fifth quarter\'s profit be?',
        [['54', true], ['52', false], ['56', false], ['50', false]],
        'The increases are 6, 8 and 10, growing by 2, so the next increase is 12 and 42 + 12 = 54.', PATTERN),
      mcq('One class of 25 students averages 64 marks and another of 35 students averages 76. What is the average of all 60 students?',
        [['71', true], ['70', false], ['72', false], ['69', false]],
        'The totals are 25 × 64 = 1,600 and 35 × 76 = 2,660, so 4,260 ÷ 60 = 71. The simple average of 64 and 76 is 70.', DI),
    ],
  },
];
