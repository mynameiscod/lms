/**
 * T3_TREES_BST and T3_HEAPS — eleven units. Year 3.
 *
 * ── WHAT THESE TWO TOPICS ARE FOR ─────────────────────────────────────────────────────────
 *
 * A second-year knows arrays and maps. These are the first two structures where the shape of
 * the data is doing work the student did not ask for, and both are taught the same way: what
 * the structure PROMISES, what it does NOT promise, and what happens when the promise breaks.
 *
 * The heap topic exists mostly to kill one misconception. Students reliably believe a heap is
 * sorted, print one, and conclude it is broken. It promises the top and nothing else, and that
 * single sentence is most of what the topic is for.
 *
 * The BST topic carries the year's most useful piece of honesty: a plain BST's O(log n) is not
 * a guarantee, it is a hope about the insertion order, and inserting sorted data turns it into
 * a linked list. That is why balancing exists, and why the third unit teaches the IDEA of
 * balancing rather than a red-black tree from memory — nobody implements one at work, and
 * everybody has to know what the library is doing for them.
 *
 * Both topics are single-skill (DSA_TREES, DSA_HEAPS), so the seeder derives attribution and
 * neither appears in year3SkillAttribution.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TREES_HEAPS_BUNDLES: PilotBundle[] = [
  /* ══ T3_TREES_BST ═══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_TREES_BST_TREES',
    notes: `A tree is the shape you get whenever one thing contains other things: a filesystem,
a comment thread, a DOM, an org chart, a JSON document, a parsed expression. You have been
using trees for two years without calling them that.

**The definition is small.** A node, and a list of children. Nothing else.

    class Node:
        def __init__(self, value):
            self.value = value
            self.children = []

A **binary** tree restricts that to at most two children, usually called left and right, which
is what makes the code short enough to write on a whiteboard.

**Vocabulary you need, because interviews use it:** the **root** has no parent; a **leaf** has
no children; the **depth** of a node is its distance from the root; the **height** of the tree
is the depth of its deepest node.

## Why recursion fits

A tree is defined in terms of itself — a node's children are trees. So code shaped the same way
fits it exactly, and code shaped differently fights it:

    def count(node):
        if node is None:
            return 0
        return 1 + sum(count(c) for c in node.children)

Two lines that would be a stack and a loop otherwise. **The base case is the empty tree**, and
forgetting it is the single most common tree bug there is.

## Three ways to walk one

For a binary tree, the three orders differ only in *when you visit the node itself*:

- **Pre-order** — node, left, right. Use it when the parent must be handled first: copying a
  tree, printing an indented outline, serialising.
- **In-order** — left, node, right. On a binary *search* tree this yields the values in sorted
  order, which is the next unit's whole point.
- **Post-order** — left, right, node. Use it when children must be handled first: computing a
  directory's size, freeing memory, evaluating an expression tree.

**Breadth-first** is the fourth, and it is not recursive — it uses a queue and visits level by
level. Reach for it when "nearest" matters rather than "deepest".

**The order is not a detail.** Deleting a directory tree pre-order deletes the parent before its
contents and fails. Sizing it post-order works. Choosing the wrong one produces code that is
correct on a three-node example and wrong on a real one.

## The cost

Every traversal visits every node once: **O(n) time**. The space is the recursion depth, which
is **O(h)** — fine for a balanced tree at about log n, and a stack overflow on a tree that has
degenerated into a chain, which is the next unit.`,
    mcqs: [
      mcq('Why does recursion suit trees so well?',
        [['A tree is defined in terms of smaller trees', true],
          ['Recursion is faster than an explicit stack here', false],
          ['Trees have no cycles, so it always terminates', false],
          ['The children are stored as a list already', false]],
        'Code shaped like the data fits it; code shaped differently fights it.'),
      mcq('Which traversal would you use to compute a directory’s total size?',
        [['Post-order, so the children are done first', true],
          ['Pre-order, so the parent is reached first', false],
          ['In-order, so the entries come out sorted', false],
          ['Breadth-first, so each level completes first', false]],
        'A directory’s size is not known until every child’s size is.'),
      mcq('The space a recursive traversal uses is proportional to:',
        [['The height of the tree', true],
          ['The number of nodes in it', false],
          ['The number of leaves it has', false],
          ['The largest number of children', false]],
        'One stack frame per level, which is why a degenerate tree overflows it.'),
      mcq('The most common bug when writing a recursive tree function is:',
        [['Leaving out the empty-tree base case', true],
          ['Recursing into the same child twice', false],
          ['Choosing the wrong traversal order', false],
          ['Returning before visiting the right child', false]],
        'The empty tree is the case that ends the recursion, and it is easy to forget.'),
    ],
    checkpoint: [
      mcq('The height of a tree is:',
        [['The depth of its deepest node', true],
          ['The number of levels below the root', false],
          ['The longest list of children any node has', false],
          ['The count of nodes on the leftmost path', false]],
        'Depth is measured per node; height is the tree’s deepest one.'),
      mcq('Breadth-first traversal differs from the other three in that it:',
        [['Uses a queue rather than recursion', true],
          ['Visits each node more than once', false],
          ['Requires the tree to be balanced', false],
          ['Cannot be used on a binary tree', false]],
        'Level by level, which is what you want when "nearest" matters.'),
      mcq('Deleting a directory tree pre-order fails because:',
        [['The parent goes before its contents do', true],
          ['The traversal never reaches the leaves', false],
          ['Deleting a node invalidates the recursion', false],
          ['The order visits some nodes twice over', false]],
        'Post-order is the one that handles children first, which is what deletion needs.'),
    ],
  },

  {
    unitCode: 'T3_TREES_BST_BST',
    notes: `A binary search tree adds one rule to a binary tree:

> Everything in a node's left subtree is smaller than it. Everything in its right subtree is
> larger.

That rule applies at **every** node, not just the root, and "the rule holds locally but not
globally" is the classic broken-BST bug.

## What the rule buys

**Search becomes a decision rather than a scan.** At each node, one comparison discards an
entire subtree:

    def find(node, target):
        if node is None:
            return None
        if target == node.value:
            return node
        return find(node.left if target < node.value else node.right, target)

On a tree of a million nodes with a good shape, that is about twenty comparisons.

**In-order traversal yields sorted output, free.** No sort call, no extra pass. That is the
property a sorted array has and a hash map does not, and it is the reason to choose a tree at
all.

**Range queries work.** "Every value between 40 and 90" is a walk of the relevant subtrees. A
hash map cannot answer that without looking at every key.

## What it costs — and this is the part students are not told

**O(log n) is not a guarantee. It is a hope about the insertion order.**

Insert 1, 2, 3, 4, 5 into an empty BST in that order. Every value is larger than the last, so
every one goes right:

    1
     \\
      2
       \\
        3
         \\
          4

That is a linked list wearing a tree's type. Search is now **O(n)**, and the structure is worse
than the array you replaced, because it costs a pointer per element as well.

**Sorted input is not a rare case.** Ids from a database, timestamps from a log, names read in
order — inserting real data into a plain BST is one of the most reliable ways to build the worst
possible tree.

## Deletion, which is where the bugs live

Three cases. A leaf just goes. A node with one child is replaced by that child. A node with two
children cannot simply be removed — you replace its value with its **in-order successor** (the
smallest value in its right subtree) and then delete that successor, which by construction has
at most one child.

Most BST bugs are in the third case, and the giveaway is a tree that is still correct for a
while and then silently loses values.`,
    mcqs: [
      mcq('The BST ordering rule applies:',
        [['At every node, not only at the root', true],
          ['Only between a node and its direct children', false],
          ['Only along the path from the root down', false],
          ['To the leaves once the tree is complete', false]],
        'Locally correct and globally wrong is the classic broken-BST bug.'),
      mcq('Inserting already-sorted values into a plain BST produces:',
        [['A chain, with search back at linear cost', true],
          ['A balanced tree, since the order is known', false],
          ['A tree of half the expected height', false],
          ['A structure that rejects the later inserts', false]],
        'Every value is larger than the last, so every one goes right.'),
      mcq('Which question can a BST answer that a hash map cannot?',
        [['Every value between forty and ninety', true],
          ['Whether a particular value is present', false],
          ['How many values are stored in total', false],
          ['Whether two values collide with each other', false]],
        'Order is the whole reason to pick a tree over a map.'),
      mcq('Deleting a node with two children requires:',
        [['Replacing it with its in-order successor', true],
          ['Promoting whichever child is deeper', false],
          ['Rebuilding the subtree beneath it', false],
          ['Marking it deleted and leaving it there', false]],
        'The successor has at most one child, so removing it is the easy case.'),
    ],
    checkpoint: [
      mcq('"O(log n) is a hope, not a guarantee" means:',
        [['The shape depends on the order values arrived in', true],
          ['The bound holds on average across many trees', false],
          ['The cost varies with the values being stored', false],
          ['The analysis ignores the cost of comparisons', false]],
        'Same values, different insertion order, completely different cost.'),
      mcq('A degenerate BST is worse than the array it replaced because:',
        [['It is linear to search and costs a pointer per element', true],
          ['It cannot answer range queries any more', false],
          ['It has to be rebuilt before it can be read', false],
          ['Its in-order traversal stops being sorted', false]],
        'You pay the tree’s overhead and get the array’s cost.'),
      mcq('Sorted input into a plain BST is worth worrying about because:',
        [['Real data often arrives in order', true],
          ['Sorting is a common preprocessing step', false],
          ['The insert operation is slower on sorted data', false],
          ['Balanced trees reject duplicate values', false]],
        'Ids, timestamps and alphabetical names all arrive sorted.'),
    ],
  },

  {
    unitCode: 'T3_TREES_BST_BALANCING_IDEA',
    notes: `The previous unit ended with a BST that had become a linked list. Balancing is the
answer, and this unit teaches the **idea** rather than an implementation.

That is deliberate. You will almost certainly never write a red-black tree at work — the
language ships one. You will absolutely have to know what it is doing and when it is the wrong
choice, and those are different knowledge.

## The idea

A balanced tree notices when one side has grown deeper than the other and **rearranges itself**
so the heights stay close. The rearrangement is called a **rotation**: a local reshuffle of
three nodes that changes the shape and preserves the ordering rule.

    Before (right-heavy)        After a left rotation
        A                              B
         \\                            / \\
          B           ──►             A   C
           \\
            C

Nothing moved that breaks the BST rule — A is still left of B, C is still right of it. The
height went from 3 to 2. That is the whole trick, applied automatically on every insert and
delete.

## What it costs

- **Inserts and deletes get slower** by a constant factor: the tree has to check the balance and
  sometimes rotate.
- **Memory per node goes up**: a colour bit, or a stored height.
- **The code gets much harder**, which is why you use the library.

**In exchange, O(log n) stops being a hope and becomes a guarantee.** The worst case and the
average case converge, and that is worth more in production than a slightly faster average,
because the worst case is what pages you at 3am.

## The named ones, briefly

- **AVL** — strictly balanced, so lookups are the fastest of these; more rotations on write.
  Good for read-heavy work.
- **Red-black** — loosely balanced, fewer rotations on write. The usual default, and what most
  standard libraries use.
- **B-tree** — many children per node rather than two. Designed for disk and pages, which is why
  it is what your database index actually is.

**The useful takeaway:** when you use an ordered map in any language, this is what is underneath
it, and that is why its lookup is slower than a hash map's but it can answer range queries.

## When not to use a tree at all

If you never need order — no ranges, no sorted iteration, no nearest — then a hash map is
simpler and faster, and reaching for a balanced tree is paying for a property you do not use.`,
    mcqs: [
      mcq('What does a rotation do?',
        [['Reshuffles a few nodes, keeping the ordering rule', true],
          ['Rebuilds the subtree from its sorted values', false],
          ['Swaps the values held in two nodes', false],
          ['Moves the deepest node up to the root', false]],
        'A local change that reduces height without breaking left-smaller, right-larger.'),
      mcq('The real gain from a balanced tree is that:',
        [['The worst case and the average case converge', true],
          ['Lookups become faster than a hash map’s', false],
          ['Inserts cost less than on a plain BST', false],
          ['Less memory is needed for each node', false]],
        'The worst case is what pages you at 3am, so removing it is worth a constant factor.'),
      mcq('A B-tree differs from AVL and red-black trees in that it:',
        [['Holds many children per node, for disk pages', true],
          ['Guarantees a stricter balance than either', false],
          ['Does not require rotations when writing', false],
          ['Stores its values only at the leaves', false]],
        'Which is why your database index is one.'),
      mcq('If a problem never needs order, a balanced tree is:',
        [['Paying for a property you do not use', true],
          ['Still preferable for its predictable cost', false],
          ['Equivalent in cost to a hash map', false],
          ['The safer choice as the data grows', false]],
        'A hash map is simpler and faster when ranges and sorted iteration are not wanted.'),
    ],
    checkpoint: [
      mcq('Why does this unit not have you implement a red-black tree?',
        [['You will use one, not write one', true],
          ['The implementation is too long for the time', false],
          ['Rotations are covered in a later topic', false],
          ['AVL trees are the more common choice', false]],
        'Knowing what the library does and being able to write it are different knowledge.'),
      mcq('AVL against red-black, in one line:',
        [['Stricter balance, faster reads, more rotations', true],
          ['Looser balance, faster reads, fewer rotations', false],
          ['Identical performance with different code', false],
          ['Stricter balance with lower memory per node', false]],
        'Which is why red-black is the usual library default and AVL suits read-heavy work.'),
      mcq('An ordered map in a standard library is usually backed by:',
        [['A balanced tree', true],
          ['A hash table with sorted buckets', false],
          ['A sorted array rebuilt on insert', false],
          ['A skip list over the raw values', false]],
        'Which is why its lookup is slower than a hash map’s and it can do ranges.'),
    ],
  },

  {
    unitCode: 'T3_TREES_BST_DEBUGGING',
    notes: `Five tree bugs, each with the symptom that gives it away.

## 1. The missing base case

    def height(node):
        return 1 + max(height(node.left), height(node.right))

**Symptom:** \`AttributeError: 'NoneType' object has no attribute 'left'\`, or a
RecursionError. **Cause:** no \`if node is None\`. This is the most common tree bug in
existence and it is always the first thing to check.

## 2. Locally valid, globally broken

    def is_bst(node):
        if node is None:
            return True
        if node.left and node.left.value > node.value:
            return False
        if node.right and node.right.value < node.value:
            return False
        return is_bst(node.left) and is_bst(node.right)

**Symptom:** it passes on every small example and accepts a tree that is not a BST.
**Cause:** the rule is checked between a node and its direct children only. This tree passes and
should not:

        10
       /  \\
      5    15
          /
         3

3 is in 10's right subtree and is smaller than 10. **Fix:** carry a permitted range down the
recursion — \`is_bst(node, low, high)\` — rather than comparing neighbours.

## 3. Depth confused with height

Off by exactly one, or inverted. **Symptom:** a single node reports 0 where 1 was wanted, or the
balance check is backwards. **Cause:** two conventions exist and the code mixes them. Pick one,
write it in a docstring, and make the tests use the same one.

## 4. Losing the subtree on delete

    node = None   # <-- this rebinds a local name and changes nothing

**Symptom:** deletion appears to work and the value is still there next time. **Cause:** the
parent's pointer was never updated. Deletion must return the new subtree and the caller must
reassign: \`node.left = delete(node.left, value)\`.

## 5. Recursion depth on a degenerate tree

**Symptom:** works in every test, RecursionError in production. **Cause:** the tests used
balanced trees and production inserted sorted ids. The tree is 50,000 deep and the default
recursion limit is 1,000. **Fix:** balance the tree, or make the traversal iterative. Note that
this is a **data** bug by the four-way split, not a code bug — the code was always like this.`,
    mcqs: [
      mcq('An is_bst that compares only a node and its direct children:',
        [['Accepts trees that break the rule further down', true],
          ['Rejects valid trees with duplicate values', false],
          ['Fails whenever the tree is unbalanced', false],
          ['Works correctly but takes quadratic time', false]],
        'Carry a permitted range down the recursion instead of comparing neighbours.'),
      mcq('Deletion seems to work and the value is back next time. The cause is:',
        [['The parent’s pointer was never reassigned', true],
          ['The successor was removed from the wrong side', false],
          ['The node was a leaf and needed no handling', false],
          ['The tree rebalanced itself after the delete', false]],
        'Rebinding a local name changes nothing; delete must return the new subtree.'),
      mcq('Tests pass and production raises RecursionError. That is:',
        [['A data bug — production inserted sorted values', true],
          ['A code bug that the tests failed to cover', false],
          ['An environment bug from a lower stack limit', false],
          ['A timing bug that only appears under load', false]],
        'The code was always like this; the shape of the real data is what changed.'),
      mcq('The first thing to check in any misbehaving recursive tree function is:',
        [['Whether the empty case is handled', true],
          ['Whether the traversal order is right', false],
          ['Whether the tree is actually balanced', false],
          ['Whether the values are comparable', false]],
        'It is the most common tree bug there is, by a distance.'),
    ],
    checkpoint: [
      mcq('A single node reports height 0 in one function and 1 in another. That is:',
        [['Two conventions mixed in one codebase', true],
          ['An off-by-one error in the recursion', false],
          ['A missing base case in one of the two', false],
          ['A difference between depth and balance', false]],
        'Both conventions are valid; pick one, document it, and test against it.'),
      mcq('Fixing the degenerate-tree RecursionError properly means:',
        [['Balancing the tree or iterating instead', true],
          ['Raising the interpreter’s recursion limit', false],
          ['Rejecting input that arrives already sorted', false],
          ['Catching the error and retrying the traversal', false]],
        'Raising the limit moves the failure rather than removing it.'),
    ],
  },

  {
    unitCode: 'T3_TREES_BST_PRACTICE',
    notes: `Three exercises. The first two are the ones an interview asks; the third is the one
that catches the bug from the debugging unit.

Work them without looking anything up. If you reach for a reference, note what for — that note
is what tells you which of these to repeat.`,
    coding: [
      {
        title: 'Validate a BST properly',
        description: `Read a tree as lines of \`parent child L|R\`, with the root being the node
that is never a child. Node values are integers.

Print \`yes\` if it is a valid binary search tree and \`no\` otherwise. An empty input is
\`yes\`.

The naive version — comparing each node only with its direct children — passes three of these
cases and fails two.`,
        starter: `import sys

edges = [l.split() for l in sys.stdin if l.split()]

# TODO: build the tree, find the root, and validate it.
# Carry a permitted range down rather than comparing neighbours.
`,
        language: 'python',
        tests: [
          { input: '10 5 L\n10 15 R\n', expectedOutput: 'yes' },
          { input: '10 5 L\n10 15 R\n15 3 L\n', expectedOutput: 'no' },
          { input: '', expectedOutput: 'yes' },
          { input: '20 10 L\n10 25 R\n', expectedOutput: 'no', isHidden: true },
          { input: '8 3 L\n8 10 R\n3 1 L\n3 6 R\n6 4 L\n6 7 R\n', expectedOutput: 'yes', isHidden: true },
        ],
      },
      {
        title: 'Lowest common ancestor',
        description: `Same input format, then a final line with two values.

Print the value of the deepest node that has both of them somewhere beneath it (a node counts as
beneath itself). Print \`none\` if either value is not in the tree.

Do not collect the two root-to-node paths and compare them. Solve it in one pass.`,
        starter: `import sys

lines = [l for l in sys.stdin.read().split(chr(10)) if l.strip()]
edges = [l.split() for l in lines[:-1]]
a, b = lines[-1].split()

# TODO: one pass, returning the deepest node with both below it
`,
        language: 'python',
        tests: [
          { input: '3 5 L\n3 1 R\n5 6 L\n5 2 R\n1 0 L\n1 8 R\n5 2\n', expectedOutput: '5' },
          { input: '3 5 L\n3 1 R\n5 6 L\n5 2 R\n6 1\n', expectedOutput: '3' },
          { input: '3 5 L\n3 1 R\n5 9\n', expectedOutput: 'none' },
          { input: '1 2 L\n2 3 L\n3 4 L\n4 2\n', expectedOutput: '2', isHidden: true },
          { input: '7 7\n', expectedOutput: 'none', isHidden: true },
        ],
      },
      {
        title: 'Depth without recursion',
        description: `Same input format. Print the height of the tree — the number of nodes on
the longest root-to-leaf path. Empty input prints \`0\`.

**Do this iteratively.** The hidden case is a chain fifty thousand deep, which a recursive
solution will not survive.`,
        starter: `import sys

edges = [l.split() for l in sys.stdin if l.split()]

# TODO: iterative. A queue or an explicit stack, not recursion.
`,
        language: 'python',
        tests: [
          { input: 'a b L\na c R\nb d L\n', expectedOutput: '3' },
          { input: 'r x L\n', expectedOutput: '2' },
          { input: '', expectedOutput: '0' },
          { input: 'p q L\np r R\n', expectedOutput: '2', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Trees Practice',
      description: 'Validate a BST, find a lowest common ancestor, and measure height without recursion.',
      instructions: `Complete all three exercises, then answer briefly:

1. For the first: give a tree that the naive neighbour-comparison version accepts and that is
   not a valid BST. Draw it or write it as edges.
2. For the second: say what the two-paths approach would cost in time and space, and what yours
   costs.
3. For the third: say at roughly what depth a recursive version fails on your machine, and why
   raising the recursion limit is not the fix.
4. Which of the three did you need to look something up for? Name the thing.`,
      rubric: [
        { criterion: 'Validation, properly', description: 'Range carried down; the two adversarial cases fail as they should.', maxPoints: 25 },
        { criterion: 'A counterexample', description: 'A concrete tree the naive check wrongly accepts.', maxPoints: 15 },
        { criterion: 'Ancestor in one pass', description: 'Correct, including the absent-value case, without building two paths.', maxPoints: 25 },
        { criterion: 'Costs compared', description: 'Both approaches costed in time and space.', maxPoints: 15 },
        { criterion: 'Iterative height', description: 'Survives a deep chain, with the recursion limit addressed.', maxPoints: 20 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

edges = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: '10 5 L\n10 15 R\n', expectedOutput: 'yes' },
          { input: '10 5 L\n10 15 R\n15 3 L\n', expectedOutput: 'no' },
          { input: '20 10 L\n10 25 R\n', expectedOutput: 'no', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 25,
      },
    },
    checkpoint: [
      mcq('Validating a BST correctly requires:',
        [['A permitted range carried down the recursion', true],
          ['A comparison at each node with both children', false],
          ['An in-order walk collected into a list', false],
          ['A check that the tree is also balanced', false]],
        'Neighbour comparison is the version that passes small examples and is wrong.'),
      mcq('The two-paths approach to lowest common ancestor costs:',
        [['Extra space proportional to the height', true],
          ['Extra time proportional to the node count', false],
          ['The same as the one-pass version exactly', false],
          ['Less space but more time than one pass', false]],
        'Two stored paths, each as long as the tree is deep.'),
      mcq('An iterative traversal is preferred on a deep tree because:',
        [['The stack is on the heap and can grow', true],
          ['It visits fewer nodes than recursion does', false],
          ['It does not need the tree to be balanced', false],
          ['It uses less memory per node visited', false]],
        'The call stack has a hard limit; a list does not.'),
    ],
  },

  {
    unitCode: 'T3_TREES_BST_MINI_PROJECT',
    notes: `Build an ordered index and prove it does something a hash map cannot.

The brief is deliberately about the **comparison**. Anyone can implement a BST; the thing worth
showing is that you know when it is the right answer and when it is an expensive way to be
slower than a dictionary.

Budget around two hours, with a real measurement in it rather than an estimate.`,
    assignment: {
      title: 'Mini Project — An Ordered Index',
      description: 'Build a BST-backed index, measure it against a hash map, and show where each one wins.',
      instructions: `**Build**

An index over records that supports:

- \`insert(key, value)\`
- \`get(key)\`
- \`range(low, high)\` — every value whose key falls between the two, **in order**
- \`keys_in_order()\`
- \`delete(key)\`, including the two-child case

Back it with a binary search tree you write yourself. Do not use a library tree.

**Measure**

Build a second version backed by a plain dictionary, with \`range\` implemented the only way a
dictionary can — by scanning.

With at least 100,000 records, time and report:

1. \`get\` on both.
2. \`range\` over a narrow slice on both.
3. \`keys_in_order()\` on both.

**Break it deliberately**

4. Insert your keys in **sorted** order and re-run the \`get\` timing. Report the numbers and
   the height of the tree before and after.
5. Say in one sentence what that experiment proves about a plain BST.

**Then answer**

6. For each of the three operations, say which structure won and by roughly how much.
7. Describe one real feature where you would choose the tree, and one where the dictionary is
   obviously right.
8. Say what you would actually use in production instead of your own tree, and why.

**Submit** the implementation, the timing numbers as a small table, and the answers to 5–8.`,
      rubric: [
        { criterion: 'A working ordered index', description: 'All five operations correct, including two-child deletion.', maxPoints: 25 },
        { criterion: 'Real measurements', description: 'Timings at a realistic size, reported as numbers rather than claims.', maxPoints: 20 },
        { criterion: 'The degeneration experiment', description: 'Sorted insertion run, heights reported, conclusion stated.', maxPoints: 20 },
        { criterion: 'Where each one wins', description: 'Per operation, with an honest sense of the margin.', maxPoints: 15 },
        { criterion: 'Two real features', description: 'One that needs order, one that plainly does not.', maxPoints: 10 },
        { criterion: 'What you would really use', description: 'Names a production answer and says why yours is not it.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Why does the brief require the sorted-insertion experiment?',
        [['It is the case that turns the tree into a list', true],
          ['It is the fastest way to build a large tree', false],
          ['Sorted data is the normal production case', false],
          ['It tests the delete path more thoroughly', false]],
        'Measuring the degeneration is more convincing than being told about it.'),
      mcq('The brief asks what you would use in production instead. The point is:',
        [['Knowing when not to write your own', true],
          ['Showing familiarity with the standard library', false],
          ['Comparing your code against a mature one', false],
          ['Demonstrating the tree was only an exercise', false]],
        'Building one to learn and shipping one are different decisions.'),
      mcq('Which operation should the dictionary win most clearly?',
        [['A single get by key', true],
          ['A range over a narrow slice', false],
          ['Iterating the keys in order', false],
          ['Finding the smallest key stored', false]],
        'Constant time against about log n, with no comparisons at all.'),
    ],
  },

  /* ══ T3_HEAPS ═══════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_HEAPS_HEAP_SHAPE',
    notes: `**A heap is not sorted.** Print one and it will look like garbage. That is the single
most common misconception about this structure, and almost everything else follows from
understanding why it is fine.

## The promise

A heap makes exactly one guarantee:

> Every node is smaller than both of its children. (A min-heap. Flip it for a max-heap.)

That is all. Nothing is said about how two siblings compare, or about anything that is not on a
parent-child path. So:

    [1, 3, 2, 7, 4, 5]

is a perfectly valid min-heap, and it is not sorted. 3 comes before 2, and that is allowed
because they are not on the same path.

**What the promise gets you is the top.** The smallest element is at index 0, always, in
constant time. And that is enough for an enormous number of real problems.

## Why it is fast

**Maintaining "sorted" is expensive. Maintaining "the top is right" is cheap.**

A sorted structure has to place a new element correctly relative to all n others. A heap only
has to place it correctly relative to its ancestors — about log n of them:

- **push:** put it at the end, then swap it upward while it is smaller than its parent.
- **pop:** take index 0, move the last element into its place, then swap it downward.

Both are **O(log n)**, and peeking at the top is **O(1)**.

## It is an array, not nodes

A heap is always a **complete** tree — every level full except possibly the last, which fills
left to right. That means it can live in a flat array with no pointers at all:

    parent(i) = (i - 1) // 2
    left(i)   = 2 * i + 1
    right(i)  = 2 * i + 2

No allocation per node, and the whole thing is contiguous in memory, which is a large part of
why it is fast in practice as well as on paper.

## What it cannot do

- **Find an arbitrary element.** That is a full scan, O(n). A heap is not a search structure.
- **Iterate in order.** The only way is to pop everything, which destroys it.
- **Answer a range query.** Nothing in the promise supports it.

**Building from scratch:** pushing n items one at a time is O(n log n). Heapifying an existing
array in place is **O(n)**, which surprises people and is worth knowing — if you have all the
data up front, do not push it in a loop.`,
    mcqs: [
      mcq('What does a min-heap guarantee?',
        [['Every node is smaller than its own children', true],
          ['The array it is stored in is sorted ascending', false],
          ['Each level holds smaller values than the next', false],
          ['Siblings appear in increasing order', false]],
        'Nothing is promised about anything off a parent-child path.'),
      mcq('Why is maintaining a heap cheaper than maintaining sorted order?',
        [['A new element is only placed against its ancestors', true],
          ['Heaps hold fewer elements for the same data', false],
          ['Comparisons in a heap are cheaper to perform', false],
          ['Sorting requires the data to be copied first', false]],
        'About log n comparisons rather than a position among all n.'),
      mcq('A heap can be stored in a flat array because:',
        [['It is always a complete tree', true],
          ['Its elements are in sorted positions', false],
          ['It never needs to grow beyond its size', false],
          ['Its height is always exactly log n', false]],
        'Completeness is what makes the index arithmetic work with no gaps.'),
      mcq('Building a heap from data you already hold should use:',
        [['Heapify, which is linear', true],
          ['A loop of pushes, which is simpler', false],
          ['A sort followed by a copy', false],
          ['Repeated insertion at the front', false]],
        'O(n) against O(n log n), for exactly the same result.'),
    ],
    checkpoint: [
      mcq('`[1, 3, 2, 7, 4, 5]` as a min-heap is:',
        [['Valid, since 3 and 2 are not on one path', true],
          ['Invalid, because 3 appears before 2', false],
          ['Invalid, because the last level is not full', false],
          ['Valid only if it is read as a max-heap', false]],
        'The promise is about parents and children, not about array order.'),
      mcq('Finding an arbitrary value in a heap costs:',
        [['Linear time, since it is not a search structure', true],
          ['Logarithmic time, like insertion does', false],
          ['Constant time, using the index arithmetic', false],
          ['Linear time only when the heap is unbalanced', false]],
        'The only element you can find quickly is the top one.'),
      mcq('In an array-backed heap, the parent of index i is at:',
        [['(i - 1) // 2', true], ['i // 2', false], ['2 * i + 1', false], ['(i + 1) // 2', false]],
        'The inverse of the two child formulas, for zero-based indexing.'),
    ],
  },

  {
    unitCode: 'T3_HEAPS_PRIORITY_QUEUES',
    notes: `A priority queue is the interface; a heap is the usual implementation. Learning to
**recognise the shape** matters more than either, because the problems that need one rarely say
so.

## The tell

> Repeatedly, I need the best remaining item, and what counts as best does not change, and new
> items keep arriving.

If all three hold, it is a priority queue. Sorting will not do, because the set keeps changing;
scanning for the minimum will not do, because you do it n times and it costs O(n) each.

## Four problems that are this shape

**Top-k from a stream.** The ten largest of ten million, without holding ten million.

Counter-intuitively you use a **min**-heap of size k for the k **largest**. The smallest of your
current best k sits at the top, so each new element needs one comparison: bigger than the top?
Replace it. Smaller? Discard it. Memory is O(k) rather than O(n), and that is the difference
between fitting in memory and not.

**Merging sorted sequences.** Ten sorted files into one. A heap holding the current head of each
file gives you the next output value in log k, and you never load a whole file.

**Scheduling.** Jobs with priorities, or timers ordered by fire time. The event loop under most
async runtimes is a heap of callbacks keyed on when they are due.

**Shortest path.** Dijkstra's algorithm is breadth-first search with a priority queue instead of
a queue, which is why it handles edges of differing cost. The later graph unit builds on exactly
this.

## Two practical notes that cause real bugs

**Most standard libraries only give you a min-heap.** For a max-heap, push the negated value and
negate on the way out, or wrap items in a comparator object. Forgetting the negation on the way
out is a bug that produces plausible, wrong answers.

**Ties compare the next field.** Pushing \`(priority, task)\` and hitting two equal priorities
makes the heap compare \`task\`, which may not be comparable at all — a \`TypeError\` under load
and never in testing. Push \`(priority, counter, task)\` with an always-increasing counter. It
breaks ties deterministically and makes the queue stable as a side effect.

## What it is not for

If you need the items in order *as a whole*, sort them. If you need to look items up, use a map.
A priority queue is for when you want the best one, repeatedly, from a changing set.`,
    mcqs: [
      mcq('For the k largest items in a huge stream, you use:',
        [['A min-heap of size k', true],
          ['A max-heap of size k', false],
          ['A min-heap holding everything', false],
          ['A sorted list truncated to k', false]],
        'The smallest of your current best sits on top, so each new item takes one comparison.'),
      mcq('Pushing `(priority, task)` tuples breaks when:',
        [['Two priorities tie and the tasks are not comparable', true],
          ['The priority values are negative numbers', false],
          ['The queue grows beyond its initial size', false],
          ['Two identical tasks are pushed at once', false]],
        'A TypeError under load and never in testing. Add an increasing counter.'),
      mcq('Dijkstra’s algorithm is breadth-first search with:',
        [['A priority queue in place of the queue', true],
          ['A stack in place of the queue', false],
          ['A visited set added to the queue', false],
          ['The edges sorted before traversal', false]],
        'Which is exactly what lets it handle edges of differing cost.'),
      mcq('Which situation is NOT a priority queue?',
        [['Needing every item in sorted order at once', true],
          ['Repeatedly taking the most urgent job', false],
          ['Merging several sorted files together', false],
          ['Firing timers in the order they are due', false]],
        'If you want the whole thing ordered, sort it — that is what sorting is for.'),
    ],
    checkpoint: [
      mcq('The memory advantage of the top-k heap is:',
        [['O(k) rather than O(n)', true],
          ['O(log n) rather than O(n)', false],
          ['O(1) rather than O(k)', false],
          ['O(n) rather than O(n log n)', false]],
        'Which is the difference between fitting in memory and not, on a real stream.'),
      mcq('A max-heap from a min-heap library is usually done by:',
        [['Negating on the way in and on the way out', true],
          ['Reversing the array after each operation', false],
          ['Popping from the end rather than the front', false],
          ['Sorting the underlying array descending', false]],
        'Forgetting the second negation gives plausible, wrong answers.'),
      mcq('Adding an increasing counter to each pushed tuple:',
        [['Breaks ties deterministically and makes it stable', true],
          ['Speeds up comparisons between equal priorities', false],
          ['Prevents duplicate tasks from being queued', false],
          ['Lets the queue be iterated in insertion order', false]],
        'Stability comes free, which is a real bonus rather than the reason.'),
    ],
  },

  {
    unitCode: 'T3_HEAPS_DEBUGGING',
    notes: `Four heap bugs. Two of them produce wrong answers that look right, which is what
makes them worth a unit.

## 1. "The heap is broken, it isn't sorted"

**Symptom:** a report that printing the heap gives nonsense. **Cause:** the expectation, not the
code. The heap promises the top. **This is not a bug**, and recognising that saves an afternoon.

The real question to ask the reporter: *which operation gave you a wrong answer?* If the answer
is "none, it just looks wrong", there is nothing to fix.

## 2. Max-heap by negation, half-applied

    heapq.heappush(h, -score)
    best = heapq.heappop(h)        # <-- still negative

**Symptom:** scores come out negative, or a comparison that should be "greater" behaves as
"less". **Cause:** negated on the way in, not on the way out. **Why it is nasty:** downstream
code often keeps working on negatives and produces a plausible ranking that is upside down.

## 3. Mutating an item after it is in the heap

    task.priority = 1          # it is already in the heap
    heapq.heappush(h, task)    # now it is in there twice

**Symptom:** the wrong item comes out, or one comes out twice. **Cause:** the heap ordered the
item on the value it had at push time and has no idea it changed. **Fix:** do not mutate queued
items. Push a new entry and mark the old one cancelled, checking that flag on pop — that is what
real schedulers do.

## 4. Top-k with the wrong heap

    # "ten largest" with a max-heap of size 10
    heappush(h, -value)
    if len(h) > 10:
        heappop(h)             # <-- discards the LARGEST

**Symptom:** the answer is the ten *smallest*, or ten arbitrary values. **Cause:** popping from
a max-heap removes the biggest, which is the one you wanted to keep. **Fix:** min-heap of size
k for the k largest — evict the top, which is the smallest of your current best.

## The habit that catches all four

**Assert the invariant in tests, do not eyeball the array.** Write \`is_heap(array)\` — every
element no greater than its children — and call it after each operation. It takes five minutes,
it fails loudly and precisely, and it removes the entire class.`,
    mcqs: [
      mcq('"The heap prints unsorted" is:',
        [['Not a bug, and worth saying so', true],
          ['A sign the heap property was violated', false],
          ['Caused by heapify on unsorted input', false],
          ['A symptom of a half-applied negation', false]],
        'Ask which operation gave a wrong answer. If none did, there is nothing to fix.'),
      mcq('Negating on push but not on pop is dangerous because:',
        [['Downstream code produces a plausible, inverted ranking', true],
          ['The heap property stops holding after a pop', false],
          ['The values overflow on large inputs', false],
          ['Comparisons start raising type errors', false]],
        'Wrong answers that look right are worse than a crash.'),
      mcq('Mutating an item already in the heap causes:',
        [['Ordering against the value it had when pushed', true],
          ['An immediate error when the heap is next read', false],
          ['The heap to re-sort itself on the next pop', false],
          ['A duplicate entry to be created automatically', false]],
        'The heap has no way to know. Push a new entry and cancel the old one.'),
      mcq('Using a max-heap of size k for the k largest fails because:',
        [['Popping removes the largest, which you wanted', true],
          ['A max-heap cannot be limited to size k', false],
          ['It costs more than a min-heap per push', false],
          ['The heap property breaks once k is exceeded', false]],
        'Evict the smallest of your current best, which is the top of a min-heap.'),
    ],
    checkpoint: [
      mcq('The habit that removes this whole class of bug is:',
        [['Asserting the heap invariant in tests', true],
          ['Printing the heap after each operation', false],
          ['Using a library heap rather than your own', false],
          ['Copying the heap before modifying it', false]],
        'Five minutes to write, and it fails loudly and precisely.'),
      mcq('The way real schedulers handle a changed priority is:',
        [['Push a new entry and mark the old cancelled', true],
          ['Re-heapify the whole queue after the change', false],
          ['Remove the old entry by scanning for it', false],
          ['Keep priorities immutable once assigned', false]],
        'Cheaper than a scan, and the cancelled flag is checked on pop.'),
    ],
  },

  {
    unitCode: 'T3_HEAPS_PRACTICE',
    notes: `Two exercises with the shape interviews use, and one that punishes the wrong heap.

Write \`is_heap\` for yourself first if you want the debugging unit's habit to stick.`,
    coding: [
      {
        title: 'Top k from a stream',
        description: `First line: an integer k. Second line: a list of integers, which you should
treat as a stream you cannot re-read and cannot hold entirely.

Print the k largest, **in descending order**, space separated. If fewer than k values exist,
print all of them in descending order. If k is 0, print nothing at all.

Your working memory must be O(k). The hidden case checks that you used the right heap.`,
        starter: `import sys, heapq

k = int(sys.stdin.readline())
stream = (int(x) for x in sys.stdin.readline().split())

# TODO: a min-heap of size k. Do not build a list of everything.
`,
        language: 'python',
        tests: [
          { input: '3\n5 1 9 3 7 2\n', expectedOutput: '9 7 5' },
          { input: '1\n4 4 4\n', expectedOutput: '4' },
          { input: '5\n2 1\n', expectedOutput: '2 1' },
          { input: '0\n1 2 3\n', expectedOutput: '' },
          { input: '2\n-5 -1 -9\n', expectedOutput: '-1 -5', isHidden: true },
        ],
      },
      {
        title: 'Merge sorted sequences',
        description: `First line: an integer n. Then n lines, each a sorted list of integers,
ascending.

Print all the values merged into one ascending line, space separated. An n of 0 prints nothing.

Concatenating and sorting passes the visible cases and is not the exercise. Hold one value per
sequence and take the smallest each time — that is the approach that works when the sequences
are files too large to load.`,
        starter: `import sys, heapq

data = sys.stdin.read().split(chr(10))
n = int(data[0])
seqs = [[int(x) for x in data[i + 1].split()] for i in range(n)]

# TODO: a heap of size n holding the current head of each sequence
`,
        language: 'python',
        tests: [
          { input: '3\n1 4 7\n2 5 8\n3 6 9\n', expectedOutput: '1 2 3 4 5 6 7 8 9' },
          { input: '2\n1 2 3\n\n', expectedOutput: '1 2 3' },
          { input: '0\n', expectedOutput: '' },
          { input: '2\n-3 0\n-5 -1 2\n', expectedOutput: '-5 -3 -1 0 2', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Heaps Practice',
      description: 'Top-k from a stream and a k-way merge, both with bounded memory.',
      instructions: `Complete both exercises, then answer:

1. For the first: explain, in two sentences, why the k **largest** needs a **min**-heap. Then
   say what goes wrong with a max-heap of size k — specifically, what answer comes out.
2. For the first: state the time and the memory cost in terms of n and k.
3. For the second: state the cost of your merge, and the cost of concatenating everything and
   sorting. Say at what point the difference starts to matter.
4. For the second: say what changes if the sequences are files of ten million lines each. Which
   approach still works?
5. Did you write \`is_heap\`? If so, say whether it caught anything.`,
      rubric: [
        { criterion: 'Top-k, bounded', description: 'Correct output, working memory O(k), right heap for the job.', maxPoints: 25 },
        { criterion: 'Why min for largest', description: 'Explains the eviction, and names the wrong answer a max-heap gives.', maxPoints: 20 },
        { criterion: 'The merge', description: 'Correct across empty, negative and uneven sequences.', maxPoints: 25 },
        { criterion: 'Both costs stated', description: 'Merge against concatenate-and-sort, with where it starts to matter.', maxPoints: 20 },
        { criterion: 'The file question', description: 'Identifies which approach survives sequences too large to load.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys, heapq

k = int(sys.stdin.readline())
stream = (int(x) for x in sys.stdin.readline().split())
`,
        tests: [
          { input: '3\n5 1 9 3 7 2\n', expectedOutput: '9 7 5' },
          { input: '0\n1 2 3\n', expectedOutput: '' },
          { input: '2\n-5 -1 -9\n', expectedOutput: '-1 -5', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 25,
      },
    },
    checkpoint: [
      mcq('The working memory of a correct top-k solution is:',
        [['Proportional to k', true],
          ['Proportional to n', false],
          ['Proportional to log n', false],
          ['Constant, regardless of k', false]],
        'Which is the entire reason to use a heap rather than sorting the stream.'),
      mcq('Concatenating and sorting instead of merging fails when:',
        [['The sequences are too large to hold at once', true],
          ['The sequences contain negative values', false],
          ['The number of sequences is very large', false],
          ['The sequences are of differing lengths', false]],
        'The merge holds one value per sequence; the sort holds everything.'),
      mcq('A k-way merge with a heap costs, per output value:',
        [['About log k', true], ['About log n', false], ['About k', false], ['Constant time', false]],
        'The heap only ever holds one head per sequence.'),
    ],
  },

  {
    unitCode: 'T3_HEAPS_MINI_PROJECT',
    notes: `Build a job scheduler. It is the most honest use of a priority queue there is, and
it forces you to meet the two bugs the debugging unit warned about rather than read about them.

Budget around two hours. The interesting part is cancellation, and the brief is written so you
cannot avoid it.`,
    assignment: {
      title: 'Mini Project — A Job Scheduler',
      description: 'A priority queue scheduler with priorities, deterministic ties, cancellation and a changed priority.',
      instructions: `**Build a scheduler** supporting:

- \`schedule(job, priority, run_at)\` — returns a handle.
- \`run_due(now)\` — runs every job whose time has come, most urgent first, and reports what ran
  in order.
- \`cancel(handle)\` — the job must not run.
- \`reprioritise(handle, new_priority)\` — the job runs at its new position.
- \`pending()\` — how many jobs are waiting.

Use a heap. Do not scan a list for the next job.

**The three things the brief is really testing**

1. **Ties must be deterministic.** Two jobs with the same priority and time must run in a
   defined order, and your tests must prove it. Say in a comment what you push and why.
2. **Cancellation must not scan.** Removing an arbitrary element from a heap is O(n). Solve it
   the way real schedulers do and explain your approach.
3. **Reprioritising must not mutate a queued item.** Show what you do instead, and add a test
   that would fail if you mutated it.

**Test it**

Write tests for at least: two jobs tied on priority and time; a job cancelled before it runs; a
job cancelled after \`run_due\` has already passed over it; a job reprioritised from last to
first; and an empty scheduler.

**Measure**

With 100,000 pending jobs, time \`run_due\` for a single due job. Then implement \`pending()\`
badly — as a scan of the heap array counting uncancelled jobs — and time it. Report both.

**Write up, briefly**

1. What you push onto the heap, field by field, and why each field is there.
2. How cancellation works and what it costs.
3. What your cancelled entries do to memory over a long run, and what you would do about it.
4. Where your scheduler would break first if it ran for a year.

**Submit** the implementation, the tests, the two timings, and answers to 1–4.`,
      rubric: [
        { criterion: 'A heap-backed scheduler', description: 'All five operations work and nothing scans for the next job.', maxPoints: 20 },
        { criterion: 'Deterministic ties', description: 'A defined order, explained, with a test that proves it.', maxPoints: 15 },
        { criterion: 'Cancellation without a scan', description: 'The real approach, with its cost stated.', maxPoints: 20 },
        { criterion: 'Reprioritising safely', description: 'No mutation of a queued item, with a test that would catch it.', maxPoints: 15 },
        { criterion: 'Tests at the edges', description: 'All five listed cases covered, including the empty scheduler.', maxPoints: 15 },
        { criterion: 'The long run', description: 'Honest about cancelled-entry growth and where a year would break it.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Cancelling a job by removing it from the heap costs:',
        [['Linear time, because the element must be found', true],
          ['Logarithmic time, like a normal pop', false],
          ['Constant time, using the stored handle', false],
          ['Logarithmic time only if it is near the top', false]],
        'Which is why real schedulers mark it cancelled and check on pop instead.'),
      mcq('Cancelled entries left in the queue are a problem because:',
        [['They accumulate, and memory grows over a long run', true],
          ['They break the heap property over time', false],
          ['They slow every push by a constant factor', false],
          ['They are eventually run by mistake', false]],
        'Which is why the brief asks what you would do about it.'),
      mcq('A test that would fail if you mutated a queued item must:',
        [['Reprioritise a job and assert the new run order', true],
          ['Check the item’s priority field after the change', false],
          ['Confirm the heap still contains the same count', false],
          ['Assert that the handle remains valid afterwards', false]],
        'Mutating changes the field and not the position, so only order catches it.'),
    ],
  },
];
