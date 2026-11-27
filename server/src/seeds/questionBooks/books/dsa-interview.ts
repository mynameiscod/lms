import { SeedBook, Y1_Y2 } from '../types';

const book: SeedBook = {
  slug: 'dsa-interview',
  title: 'DSA Interview Questions',
  kind: 'topic',
  subject: 'Data Structures and Algorithms',
  description:
    'The 40 DSA questions freshers meet most: complexity, arrays, linked lists, hashing, sorting, trees, graphs and DP, with clear approaches and Python solutions.',
  color: '#7c3aed',
  emblem: '🧩',
  audience: 'all',
  stages: Y1_Y2,
  tracks: [],
  order: 40,
  chapters: [
    {
      title: 'Complexity, arrays and strings',
      questions: [
        {
          q: `What is Big-O notation and why do interviewers care about it?`,
          d: 'easy',
          at: 'TCS, Infosys, Wipro',
          a: `Big-O describes how the running time (or memory) of an algorithm **grows as the input size n grows**, ignoring constants and smaller terms. It usually describes the worst case.

Common classes, fastest to slowest:
- **O(1)** constant: reading \`arr[i]\`, a dict lookup on average.
- **O(log n)** logarithmic: binary search, halving the problem each step.
- **O(n)** linear: one loop over the array.
- **O(n log n)**: merge sort, heap sort, efficient sorting.
- **O(n²)** quadratic: two nested loops, bubble sort.
- **O(2ⁿ)** exponential: trying every subset, naive recursive Fibonacci.

Rules of thumb: drop constants (O(2n) is O(n)), keep the dominant term (O(n² + n) is O(n²)), sequential steps add, nested steps multiply.

Interviewers care because two correct solutions can differ hugely at scale: for n = 10⁶, O(n log n) is about 2 × 10⁷ steps while O(n²) is 10¹² steps, the difference between milliseconds and hours. Always state both **time and space** complexity of your solution before being asked.`,
          tip: `After writing any solution, say its time and space complexity out loud. Interviewers expect it without prompting.`,
        },
        {
          q: `Two Sum: given an array and a target, return the indices of the two numbers that add up to the target.`,
          d: 'easy',
          at: 'Amazon, Zoho, Accenture',
          a: `**Brute force:** check every pair with two loops, O(n²) time.

**Better, one pass with a hash map:** walk the array once. For each number \`x\`, the partner you need is \`target - x\`. If that partner has already been seen, you have the answer; otherwise store \`x\` with its index and move on. A dictionary gives O(1) average lookups.

\`\`\`python
def two_sum(nums, target):
    seen = {}                      # value -> index
    for i, x in enumerate(nums):
        need = target - x
        if need in seen:
            return [seen[need], i]
        seen[x] = i
    return []

print(two_sum([2, 7, 11, 15], 9))  # [0, 1]
\`\`\`

**Complexity:** O(n) time, O(n) extra space for the dictionary.

If the array is **sorted**, you can use two pointers instead (one at each end, move left up if the sum is small, right down if it is large) for O(n) time and O(1) space. Mention this variant; it is a common follow-up.`,
          tip: `Check for the partner before inserting the current number, so an element is never paired with itself.`,
        },
        {
          q: `Check whether a string is a palindrome, ignoring case and non-alphanumeric characters.`,
          d: 'easy',
          at: 'TCS, Cognizant, Capgemini',
          a: `A palindrome reads the same forwards and backwards ("A man, a plan, a canal: Panama").

**Two-pointer approach:** put one pointer at the start and one at the end. Skip characters that are not letters or digits, compare the rest in lowercase, and move both pointers inwards. If any pair differs, it is not a palindrome.

\`\`\`python
def is_palindrome(s):
    i, j = 0, len(s) - 1
    while i < j:
        if not s[i].isalnum():
            i += 1
        elif not s[j].isalnum():
            j -= 1
        else:
            if s[i].lower() != s[j].lower():
                return False
            i += 1
            j -= 1
    return True

print(is_palindrome("A man, a plan, a canal: Panama"))  # True
\`\`\`

**Complexity:** O(n) time, O(1) extra space.

The short Pythonic version, \`t = [c.lower() for c in s if c.isalnum()]; return t == t[::-1]\`, is also O(n) time but uses O(n) extra space. Show it, but explain that the two-pointer version avoids the copy.`,
        },
        {
          q: `How do you check whether two strings are anagrams of each other?`,
          d: 'easy',
          at: 'Infosys, Zoho',
          a: `Two strings are anagrams if they contain exactly the same characters with the same counts ("listen" and "silent").

**Option 1, sort both:** if the sorted strings are equal, they are anagrams. O(n log n) time.

**Option 2, count characters (better):** count each character of the first string, subtract counts using the second, and check that everything ends at zero. Lengths must match first.

\`\`\`python
def is_anagram(a, b):
    if len(a) != len(b):
        return False
    count = {}
    for ch in a:
        count[ch] = count.get(ch, 0) + 1
    for ch in b:
        if count.get(ch, 0) == 0:
            return False
        count[ch] -= 1
    return True

print(is_anagram("listen", "silent"))  # True
\`\`\`

**Complexity:** O(n) time. Space is O(k) where k is the number of distinct characters, effectively O(1) for a fixed alphabet such as 26 lowercase letters (you could even use a list of 26 counters).

In Python, \`collections.Counter(a) == Counter(b)\` does the same in one line; mention it, but be ready to write the manual version.`,
        },
        {
          q: `Find the contiguous subarray with the largest sum (Kadane's algorithm).`,
          d: 'medium',
          at: 'Amazon, Microsoft, Flipkart',
          a: `Brute force tries every subarray, O(n²) or worse. **Kadane's algorithm** does it in one pass.

**Idea:** walk through the array keeping \`current\`, the best sum of a subarray that **ends at this index**. At each element you either extend the previous subarray or start fresh from this element, whichever is larger: \`current = max(x, current + x)\`. Track the best \`current\` ever seen.

If the running sum becomes negative, carrying it forward can only hurt, so starting over is better. That is the whole insight.

\`\`\`python
def max_subarray(nums):
    current = best = nums[0]
    for x in nums[1:]:
        current = max(x, current + x)
        best = max(best, current)
    return best

print(max_subarray([-2, 1, -3, 4, -1, 2, 1, -5, 4]))  # 6  ([4, -1, 2, 1])
\`\`\`

**Complexity:** O(n) time, O(1) space.

Initialising with \`nums[0]\` (not 0) makes it correct when every number is negative; the answer is then the largest single element. Interviewers often test exactly that case.`,
          tip: `Test with an all-negative array like [-3, -1, -2]. The answer is -1, not 0.`,
        },
        {
          q: `Find the length of the longest substring without repeating characters.`,
          d: 'medium',
          at: 'Amazon, Adobe, Paytm',
          a: `This is the classic **sliding window** problem. For "abcabcbb" the answer is 3 ("abc").

**Approach:** keep a window \`[left, right]\` that never contains a repeat. Move \`right\` one step at a time. Store the last index where each character was seen. If the new character was seen **inside the current window**, jump \`left\` to just past that earlier position. After each step, the window length \`right - left + 1\` is a candidate answer.

\`\`\`python
def length_of_longest_substring(s):
    last = {}          # char -> last index seen
    left = best = 0
    for right, ch in enumerate(s):
        if ch in last and last[ch] >= left:
            left = last[ch] + 1
        last[ch] = right
        best = max(best, right - left + 1)
    return best

print(length_of_longest_substring("abcabcbb"))  # 3
print(length_of_longest_substring("pwwkew"))    # 3
\`\`\`

**Complexity:** O(n) time since each index is visited once, O(k) space for the dictionary (k distinct characters).

The check \`last[ch] >= left\` matters: a character seen before the window started is not a repeat. Forgetting it breaks inputs like "abba".`,
        },
        {
          q: `Rotate an array to the right by k steps, in place.`,
          d: 'medium',
          at: 'Microsoft, Zoho',
          a: `Rotating [1,2,3,4,5,6,7] right by 3 gives [5,6,7,1,2,3,4].

**Simple approach:** build a new array where element \`i\` goes to \`(i + k) % n\`. O(n) time but O(n) extra space.

**In place with the reversal trick:**
1. Reduce \`k = k % n\` (rotating by n changes nothing).
2. Reverse the whole array: [7,6,5,4,3,2,1].
3. Reverse the first k elements: [5,6,7,4,3,2,1].
4. Reverse the remaining n − k elements: [5,6,7,1,2,3,4].

\`\`\`python
def rotate(nums, k):
    n = len(nums)
    k %= n

    def reverse(i, j):
        while i < j:
            nums[i], nums[j] = nums[j], nums[i]
            i += 1
            j -= 1

    reverse(0, n - 1)
    reverse(0, k - 1)
    reverse(k, n - 1)

a = [1, 2, 3, 4, 5, 6, 7]
rotate(a, 3)
print(a)  # [5, 6, 7, 1, 2, 3, 4]
\`\`\`

**Complexity:** O(n) time, O(1) extra space.

Forgetting \`k %= n\` is the most common bug: with k larger than n the indices go out of range.`,
        },
        {
          q: `Trapping rain water: given bar heights, compute how much water is trapped after it rains.`,
          d: 'hard',
          at: 'Amazon, Google, Goldman Sachs',
          a: `Water above bar \`i\` equals \`min(tallest bar to its left, tallest bar to its right) - height[i]\`, if that is positive.

**Prefix arrays:** precompute left-max and right-max arrays, then sum. O(n) time, O(n) space.

**Two pointers (optimal):** keep \`left\` and \`right\` pointers and the maximum seen from each side. Always move the side with the **smaller** max: the water on that side is limited by its own max, because the other side is known to be at least as tall.

\`\`\`python
def trap(height):
    left, right = 0, len(height) - 1
    left_max = right_max = 0
    water = 0
    while left < right:
        if height[left] < height[right]:
            left_max = max(left_max, height[left])
            water += left_max - height[left]
            left += 1
        else:
            right_max = max(right_max, height[right])
            water += right_max - height[right]
            right -= 1
    return water

print(trap([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]))  # 6
\`\`\`

**Complexity:** O(n) time, O(1) space.

In an interview, explain the per-bar formula first, then the prefix-array version, then optimise to two pointers. Showing that progression earns more credit than jumping straight to the trick.`,
          tip: `Start from the per-bar formula min(leftMax, rightMax) - height. Every solution is just a faster way to get those two maxima.`,
        },
      ],
    },
    {
      title: 'Linked lists, stacks and queues',
      questions: [
        {
          q: `Array vs linked list: what are the differences and when would you use each?`,
          d: 'easy',
          at: 'TCS, Wipro, HCL',
          a: `**Array:** elements sit in one contiguous block of memory.
- Access by index is **O(1)** because the address is computed directly.
- Inserting or deleting in the middle is **O(n)**, since later elements must shift.
- Cache friendly: neighbouring elements are loaded together, so loops are fast.
- Fixed size in languages like C/Java; Python's \`list\` is a dynamic array that resizes automatically (append is amortised O(1)).

**Linked list:** each node stores a value and a pointer to the next node, scattered across memory.
- Access by position is **O(n)**: you must walk from the head.
- Insert or delete is **O(1)** once you hold a reference to the node (just relink pointers).
- Extra memory per node for the pointer(s); poor cache locality.
- Grows and shrinks freely without resizing.

**Use an array** when you read by index often, the size is fairly stable, or speed of iteration matters (most real code). **Use a linked list** when you insert and remove at the ends or in the middle frequently and already have node references, for example in queues, LRU caches, or undo history.

A doubly linked list adds a \`prev\` pointer so you can delete a node in O(1) and walk backwards.`,
          tip: `Say "contiguous memory" and "random access" for arrays, "pointer per node" and "O(1) insert at a known node" for lists.`,
        },
        {
          q: `Reverse a singly linked list.`,
          d: 'easy',
          at: 'Amazon, Infosys, Zoho',
          a: `Walk the list once and flip each \`next\` pointer to point backwards. You need three references: \`prev\` (the already-reversed part), \`curr\` (the node being processed) and \`nxt\` (saved so you do not lose the rest of the list).

Steps for each node: save \`curr.next\`, point \`curr.next\` at \`prev\`, move \`prev\` to \`curr\`, move \`curr\` to the saved next. When \`curr\` becomes \`None\`, \`prev\` is the new head.

\`\`\`python
class Node:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next

def reverse_list(head):
    prev, curr = None, head
    while curr:
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt
    return prev

# 1 -> 2 -> 3  becomes  3 -> 2 -> 1
head = reverse_list(Node(1, Node(2, Node(3))))
while head:
    print(head.val, end=" ")
    head = head.next
\`\`\`

**Complexity:** O(n) time, O(1) extra space.

A recursive version also works (reverse the rest, then make \`head.next.next = head\` and \`head.next = None\`), but it uses O(n) call-stack space and can hit Python's recursion limit on long lists. Prefer the iterative one and mention the trade-off.`,
          tip: `Draw three boxes on paper and move the arrows by hand before coding. It prevents losing the rest of the list.`,
        },
        {
          q: `How do you detect a cycle in a linked list?`,
          d: 'medium',
          at: 'Amazon, Microsoft, Samsung',
          a: `**Hash set approach:** walk the list storing each node; if you meet a node already in the set, there is a cycle. O(n) time, O(n) space.

**Floyd's tortoise and hare (optimal):** move a \`slow\` pointer one step and a \`fast\` pointer two steps at a time. If there is no cycle, \`fast\` reaches the end. If there is a cycle, \`fast\` enters it and gains one node on \`slow\` every step, so they must eventually meet.

\`\`\`python
def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False
\`\`\`

**Complexity:** O(n) time, O(1) space.

**Common follow-up, find where the cycle starts:** after they meet, move one pointer back to \`head\` and advance both **one step** at a time; the node where they meet again is the start of the cycle. This works because the distance from the head to the cycle start equals the distance from the meeting point to the cycle start (going around the loop).

\`\`\`python
def cycle_start(head):
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
        if slow is fast:
            slow = head
            while slow is not fast:
                slow, fast = slow.next, fast.next
            return slow
    return None
\`\`\``,
        },
        {
          q: `Find the middle node of a linked list in one pass.`,
          d: 'easy',
          at: 'Cognizant, Zoho',
          a: `Counting the nodes and then walking to \`n // 2\` takes two passes. To do it in **one pass**, use two pointers: \`slow\` moves one step and \`fast\` moves two steps. When \`fast\` reaches the end, \`slow\` has covered half the distance and sits at the middle.

\`\`\`python
def middle_node(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow
\`\`\`

For an odd-length list 1→2→3→4→5 it returns 3. For an even-length list 1→2→3→4 it returns 3, the **second** of the two middles. If the interviewer wants the first middle (2), change the loop condition to \`while fast.next and fast.next.next\`.

**Complexity:** O(n) time, O(1) space.

This same fast/slow pattern appears in cycle detection, checking whether a linked list is a palindrome (find the middle, reverse the second half, compare), and splitting a list for merge sort. Recognising the pattern is the real point of the question.`,
        },
        {
          q: `Merge two sorted linked lists into one sorted list.`,
          d: 'medium',
          at: 'Amazon, Adobe, Infosys',
          a: `Compare the heads of both lists, attach the smaller node to the result, and advance that list. When one list runs out, attach whatever remains of the other (it is already sorted).

A **dummy head node** removes the special case of choosing the first node: you always append to \`tail.next\`, and return \`dummy.next\` at the end.

\`\`\`python
class Node:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next

def merge_two_lists(a, b):
    dummy = tail = Node(0)
    while a and b:
        if a.val <= b.val:
            tail.next, a = a, a.next
        else:
            tail.next, b = b, b.next
        tail = tail.next
    tail.next = a if a else b
    return dummy.next
\`\`\`

For 1→3→5 and 2→4→6 the result is 1→2→3→4→5→6.

**Complexity:** O(n + m) time, O(1) extra space, because existing nodes are relinked rather than copied.

Using \`<=\` keeps equal values in their original order (a stable merge). This function is the core of **merge sort on linked lists** and of the follow-up "merge k sorted lists", which is solved with a min-heap in O(N log k).`,
          tip: `The dummy-node trick saves you from messy "is the result empty?" checks in many list problems.`,
        },
        {
          q: `Valid parentheses: check whether a string of brackets ()[]{} is balanced.`,
          d: 'easy',
          at: 'Amazon, TCS, Zoho',
          a: `Use a **stack**, because the most recently opened bracket must be the first one closed (last in, first out).

**Approach:** scan the string. Push every opening bracket. For a closing bracket, the stack must be non-empty and its top must be the matching opener; pop it. At the end, the string is valid only if the stack is empty (no unclosed openers).

\`\`\`python
def is_valid(s):
    pairs = {')': '(', ']': '[', '}': '{'}
    stack = []
    for ch in s:
        if ch in '([{':
            stack.append(ch)
        elif ch in pairs:
            if not stack or stack[-1] != pairs[ch]:
                return False
            stack.pop()
    return not stack

print(is_valid("({[]})"))  # True
print(is_valid("([)]"))    # False
print(is_valid("(("))      # False
\`\`\`

**Complexity:** O(n) time, O(n) space in the worst case (all openers).

Two easy-to-miss cases: a closing bracket when the stack is empty (for example ")("), and leftover openers at the end. A plain counter only works when there is a single bracket type; with three types you need the stack to catch "([)]".`,
        },
        {
          q: `Implement a queue using two stacks.`,
          d: 'medium',
          at: 'Amazon, Flipkart, Oracle',
          a: `A queue is FIFO, a stack is LIFO. Two stacks reversed twice give FIFO order.

- \`inbox\`: every \`push\` goes here.
- \`outbox\`: \`pop\` and \`peek\` read from here. **Only when outbox is empty**, move everything from inbox to outbox. That move reverses the order, so the oldest element ends up on top.

\`\`\`python
class MyQueue:
    def __init__(self):
        self.inbox = []
        self.outbox = []

    def push(self, x):
        self.inbox.append(x)

    def _shift(self):
        if not self.outbox:
            while self.inbox:
                self.outbox.append(self.inbox.pop())

    def pop(self):
        self._shift()
        return self.outbox.pop()

    def peek(self):
        self._shift()
        return self.outbox[-1]

    def empty(self):
        return not self.inbox and not self.outbox

q = MyQueue()
q.push(1); q.push(2); q.push(3)
print(q.pop(), q.peek())  # 1 2
\`\`\`

**Complexity:** push is O(1). pop/peek are **amortised O(1)**: each element is moved from inbox to outbox at most once over its lifetime, even though a single pop may move many elements. Space is O(n).

Key point to explain: moving only when outbox is empty is what keeps the order correct and the cost amortised. In real Python code you would use \`collections.deque\`, which supports O(1) appends and pops at both ends.`,
        },
        {
          q: `Design an LRU (Least Recently Used) cache with O(1) get and put.`,
          d: 'hard',
          at: 'Amazon, Microsoft, Swiggy',
          a: `An LRU cache holds at most \`capacity\` items; when full, it evicts the item used longest ago. Both \`get\` and \`put\` must be O(1).

**Classic design:** a **hash map** (key → node) for O(1) lookup plus a **doubly linked list** ordered by recency for O(1) move-to-front and remove-from-back. On every access, move the node to the "most recent" end; on overflow, remove the node at the "least recent" end and delete its key from the map.

In Python, \`collections.OrderedDict\` is exactly that structure (a dict backed by a doubly linked list), so the solution is short:

\`\`\`python
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.data = OrderedDict()

    def get(self, key):
        if key not in self.data:
            return -1
        self.data.move_to_end(key)          # mark as most recent
        return self.data[key]

    def put(self, key, value):
        if key in self.data:
            self.data.move_to_end(key)
        self.data[key] = value
        if len(self.data) > self.capacity:
            self.data.popitem(last=False)   # evict least recent

c = LRUCache(2)
c.put(1, 1); c.put(2, 2); c.get(1); c.put(3, 3)
print(c.get(2))  # -1, key 2 was evicted
\`\`\`

**Complexity:** O(1) for both operations, O(capacity) space.

Many interviewers will then ask you to build it **without OrderedDict**: write a \`Node\` class with \`prev\`/\`next\`, keep dummy head and tail nodes, and implement \`remove(node)\` and \`add_to_front(node)\`. Explain the design first so you can do either.`,
          tip: `Name both parts: hash map for O(1) lookup, doubly linked list for O(1) reordering. That sentence is half the answer.`,
        },
      ],
    },
    {
      title: 'Hashing, searching and sorting',
      questions: [
        {
          q: `How does a hash map work, and what is a collision?`,
          d: 'medium',
          at: 'Infosys, Amazon, Oracle',
          a: `A hash map stores key–value pairs in an array of **buckets**. A **hash function** turns the key into an integer, and \`hash(key) % number_of_buckets\` picks the bucket. Lookup, insert and delete are therefore **O(1) on average**: compute the index and go straight there.

A **collision** happens when two different keys land in the same bucket. It is unavoidable because there are far more possible keys than buckets. Two common ways to handle it:
- **Chaining:** each bucket holds a small list of entries; search that list for the exact key. (Java's \`HashMap\` does this, switching long chains to balanced trees.)
- **Open addressing:** if the slot is taken, probe other slots (next slot, quadratic steps, or a second hash) until a free one is found. Python's \`dict\` uses open addressing.

The **load factor** (items ÷ buckets) controls performance. When it passes a threshold (around 0.66–0.75), the table **resizes**, usually doubling, and rehashes everything. That one step is O(n), but it is rare, so insertion stays amortised O(1).

**Worst case** is O(n) when many keys collide (a poor hash function or a crafted attack).

Keys must be **hashable and immutable**: in Python you can use a tuple as a key but not a list, because a list's hash would change if it were modified.`,
          tip: `Cover four words: hash function, bucket, collision, resize. Then give average O(1) and worst O(n).`,
        },
        {
          q: `Implement binary search on a sorted array.`,
          d: 'easy',
          at: 'TCS, Wipro, Zoho',
          a: `Binary search works only on **sorted** data. Compare the target with the middle element: if equal, done; if the target is smaller, discard the right half; otherwise discard the left half. Each step halves the search space.

\`\`\`python
def binary_search(arr, target):
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if arr[mid] == target:
            return mid
        if arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1

print(binary_search([1, 3, 5, 7, 9, 11], 7))  # 3
print(binary_search([1, 3, 5, 7, 9, 11], 4))  # -1
\`\`\`

**Complexity:** O(log n) time (a million elements need about 20 comparisons), O(1) space. A recursive version uses O(log n) stack space.

Classic bugs:
- Using \`lo < hi\` with \`hi = mid - 1\` misses the last element; keep the loop condition and updates consistent.
- Writing \`lo = mid\` instead of \`mid + 1\` can loop forever.
- In C/Java, \`(lo + hi) / 2\` can overflow; write \`lo + (hi - lo) / 2\`. Python integers do not overflow, but mention you know this.

Variants asked often: first/last occurrence of a value, insert position, square root, and "binary search on the answer". Python's \`bisect\` module implements the lower/upper-bound versions.`,
        },
        {
          q: `What is the time complexity of quicksort in the worst case, and why?`,
          d: 'medium',
          at: 'Infosys, Amazon, Accenture',
          a: `Quicksort picks a **pivot**, partitions the array into elements smaller and larger than the pivot, and recursively sorts both parts.

- **Average / best case: O(n log n).** If the pivot splits the array roughly in half, there are about log n levels of recursion, and each level does O(n) partitioning work in total.
- **Worst case: O(n²).** If the pivot is always the smallest or largest element, one side is empty and the other has n − 1 elements. The recursion becomes n levels deep, with work n + (n−1) + ... + 1 = n(n+1)/2, which is O(n²).

**When does the worst case happen?** Classic trigger: choosing the first or last element as pivot on an array that is **already sorted** or reverse sorted. Arrays with many equal elements can also degrade with a simple two-way partition.

**How it is avoided in practice:**
- Pick a **random pivot** or the **median of three** (first, middle, last).
- Use three-way partitioning (less / equal / greater) for many duplicates.
- **Introsort** (used by C++ \`std::sort\`) switches to heap sort if recursion gets too deep, guaranteeing O(n log n).

**Space:** O(log n) average for the recursion stack, O(n) in the worst case. Quicksort sorts in place and is **not stable**.

Despite the bad worst case, quicksort is often fastest in practice due to good cache behaviour and small constants.`,
          tip: `Give the cause in one line: "pivot is always the min or max, e.g. a sorted array with first-element pivot, so depth becomes n."`,
        },
        {
          q: `Merge sort vs quicksort: which would you choose, and what does "stable sort" mean?`,
          d: 'medium',
          at: 'Microsoft, TCS Digital',
          a: `**Merge sort** splits the array in half, sorts each half recursively, then merges the two sorted halves.
- Always **O(n log n)**, best, average and worst.
- Needs **O(n) extra space** for merging arrays.
- **Stable.**
- Great for linked lists (merging needs no extra array) and for **external sorting** of data too large for memory.

**Quicksort** partitions around a pivot.
- O(n log n) average, **O(n²) worst case**.
- **In place**, only O(log n) stack space on average.
- **Not stable.**
- Usually faster in practice for arrays in memory thanks to cache locality.

A **stable sort** keeps elements with equal keys in their original relative order. Example: sorting students by marks when the list is already ordered by name; a stable sort keeps names in order within the same marks. This matters when you sort by several keys one after another.

**Which to choose:** need guaranteed O(n log n) or stability → merge sort. Memory is tight and average speed matters → quicksort (with a random pivot).

Python's built-in \`sorted()\` and \`list.sort()\` use **Timsort**, a hybrid of merge sort and insertion sort: stable, O(n log n) worst case, and very fast on partially sorted data.

\`\`\`python
def merge_sort(a):
    if len(a) <= 1:
        return a
    mid = len(a) // 2
    left, right = merge_sort(a[:mid]), merge_sort(a[mid:])
    out, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            out.append(left[i]); i += 1
        else:
            out.append(right[j]); j += 1
    return out + left[i:] + right[j:]
\`\`\``,
        },
        {
          q: `Find the kth largest element in an unsorted array.`,
          d: 'medium',
          at: 'Amazon, Flipkart, Walmart',
          a: `**Sort and index:** \`sorted(nums)[-k]\`. Simple, O(n log n) time.

**Min-heap of size k (the expected answer):** keep a min-heap containing the k largest elements seen so far. Push each number; if the heap grows beyond k, pop the smallest. At the end, the heap's top (the smallest of the k largest) is the kth largest.

\`\`\`python
import heapq

def find_kth_largest(nums, k):
    heap = []
    for x in nums:
        heapq.heappush(heap, x)
        if len(heap) > k:
            heapq.heappop(heap)
    return heap[0]

print(find_kth_largest([3, 2, 1, 5, 6, 4], 2))        # 5
print(find_kth_largest([3, 2, 3, 1, 2, 4, 5, 5, 6], 4))  # 4
\`\`\`

**Complexity:** O(n log k) time, O(k) space. Much better than sorting when k is small, and it works on a stream of data too.

**Quickselect** (follow-up): use quicksort's partition but recurse only into the side that contains the answer. **O(n) average**, O(n²) worst case, O(1) extra space if done in place. Use a random pivot to make the worst case unlikely.

Python's \`heapq.nlargest(k, nums)[-1]\` is a one-liner using the same heap idea. Note that \`heapq\` is a **min-heap**; for a max-heap, push negated values.`,
          tip: `For "kth largest" use a min-heap; for "kth smallest" use a max-heap. The heap top is the boundary you want.`,
        },
        {
          q: `Find the first non-repeating character in a string.`,
          d: 'easy',
          at: 'Zoho, Amazon, Capgemini',
          a: `For "leetcode" the answer is 'l'; for "loveleetcode" it is 'v'; for "aabb" there is none.

**Two passes with a count table:** first count how many times each character appears. Then scan the string again **in its original order** and return the first character whose count is 1. Scanning the string (not the dictionary) is what guarantees "first".

\`\`\`python
def first_unique_char(s):
    count = {}
    for ch in s:
        count[ch] = count.get(ch, 0) + 1
    for i, ch in enumerate(s):
        if count[ch] == 1:
            return i          # or return ch
    return -1

print(first_unique_char("leetcode"))      # 0  ('l')
print(first_unique_char("loveleetcode"))  # 2  ('v')
print(first_unique_char("aabb"))          # -1
\`\`\`

**Complexity:** O(n) time (two linear passes), O(k) space for k distinct characters, which is O(1) for a fixed alphabet.

The brute-force version, checking each character against every other one, is O(n²); mention it, then improve. \`collections.Counter(s)\` builds the count table in one line.

Follow-up for a **stream of characters**: keep counts plus a queue of candidates, and pop from the front of the queue while its count exceeds 1.`,
        },
        {
          q: `Merge overlapping intervals.`,
          d: 'medium',
          at: 'Google, Amazon, Microsoft',
          a: `Given [[1,3],[2,6],[8,10],[15,18]], the result is [[1,6],[8,10],[15,18]].

**Approach:** sort the intervals by start time. Then walk through them keeping a result list. If the current interval starts **at or before** the end of the last merged interval, they overlap, so extend the last end to \`max(last end, current end)\`. Otherwise, append the current interval as a new block.

Sorting is the key step: after sorting, any interval that overlaps the current block must come right after it.

\`\`\`python
def merge(intervals):
    intervals.sort(key=lambda iv: iv[0])
    merged = []
    for start, end in intervals:
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged

print(merge([[1, 3], [2, 6], [8, 10], [15, 18]]))  # [[1, 6], [8, 10], [15, 18]]
print(merge([[1, 4], [4, 5]]))                      # [[1, 5]]
print(merge([[1, 10], [2, 3]]))                     # [[1, 10]]
\`\`\`

**Complexity:** O(n log n) time for sorting, plus O(n) for the scan. O(n) space for the output.

Watch two details: use \`max\` when extending (an interval can be fully contained in the previous one, like [2,3] inside [1,10]), and confirm with the interviewer whether touching intervals such as [1,4] and [4,5] count as overlapping.`,
        },
        {
          q: `Search for a target in a sorted array that has been rotated at an unknown pivot.`,
          d: 'hard',
          at: 'Amazon, Microsoft, Adobe',
          a: `Example: [4,5,6,7,0,1,2] is a sorted array rotated at index 4. Find 0 in O(log n), so a linear scan is not acceptable.

**Key insight:** when you split at \`mid\`, **at least one half is always sorted**. Check which half is sorted by comparing \`nums[lo]\` with \`nums[mid]\`. Then see whether the target lies inside that sorted half's range; if yes, search there, otherwise search the other half.

\`\`\`python
def search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[lo] <= nums[mid]:                 # left half sorted
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        else:                                     # right half sorted
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1
            else:
                hi = mid - 1
    return -1

print(search([4, 5, 6, 7, 0, 1, 2], 0))  # 4
print(search([4, 5, 6, 7, 0, 1, 2], 3))  # -1
print(search([1], 1))                    # 0
\`\`\`

**Complexity:** O(log n) time, O(1) space.

Use \`<=\` in \`nums[lo] <= nums[mid]\` so the case \`lo == mid\` (two elements left) is handled. If the array can contain **duplicates**, you sometimes cannot tell which half is sorted (e.g. [1,1,1,3,1]); then shrink with \`lo += 1\`, and the worst case becomes O(n).`,
          tip: `Say the invariant first: "one half is always sorted". Then the code is just deciding which half and checking the range.`,
        },
      ],
    },
    {
      title: 'Trees and graphs',
      questions: [
        {
          q: `What is the difference between a binary tree and a binary search tree? Explain inorder, preorder and postorder traversals.`,
          d: 'easy',
          at: 'TCS, Infosys, Wipro',
          a: `A **binary tree** is any tree where each node has at most two children. A **binary search tree (BST)** adds an ordering rule: for every node, **all** values in its left subtree are smaller and **all** values in its right subtree are larger.

That rule lets a BST search, insert and delete in **O(h)**, where h is the height: O(log n) when balanced, but O(n) if it degenerates into a chain (for example, inserting already-sorted values). Self-balancing trees such as AVL and red-black trees keep h at O(log n).

**Depth-first traversals**, named by when the root is visited:
- **Inorder** (left, root, right): on a BST this gives values in **sorted order**.
- **Preorder** (root, left, right): useful to copy or serialise a tree.
- **Postorder** (left, right, root): useful to delete a tree or evaluate expression trees, since children are handled before the parent.

\`\`\`python
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def inorder(node, out):
    if node:
        inorder(node.left, out)
        out.append(node.val)
        inorder(node.right, out)
    return out

root = TreeNode(4, TreeNode(2, TreeNode(1), TreeNode(3)), TreeNode(6))
print(inorder(root, []))  # [1, 2, 3, 4, 6]
\`\`\`

Each traversal is O(n) time and O(h) space for the recursion stack.`,
          tip: `Remember "in = sorted" for BSTs. Many BST questions (validate, kth smallest) are just an inorder traversal.`,
        },
        {
          q: `BFS vs DFS: how do they differ and when would you use each?`,
          d: 'easy',
          at: 'Amazon, Zoho, Samsung',
          a: `Both visit every reachable node of a graph or tree in **O(V + E)** time; they differ in order.

**Breadth-First Search (BFS):** explores level by level, all neighbours first, then their neighbours. Uses a **queue**.
- Finds the **shortest path in an unweighted graph** (fewest edges).
- Level order traversal of trees, nearest-something problems, spreading processes ("rotting oranges").
- Memory can be large on wide graphs: the queue may hold a whole level.

**Depth-First Search (DFS):** goes as deep as possible along one path, then backtracks. Uses a **stack** or recursion.
- Cycle detection, topological sort, connected components, path existence, backtracking (mazes, permutations).
- Memory is O(height/depth), often smaller, but deep recursion can overflow the stack.

\`\`\`python
from collections import deque

def bfs(graph, start):
    seen, order, q = {start}, [], deque([start])
    while q:
        node = q.popleft()
        order.append(node)
        for nb in graph[node]:
            if nb not in seen:
                seen.add(nb)
                q.append(nb)
    return order

def dfs(graph, node, seen=None):
    seen = seen if seen is not None else set()
    seen.add(node)
    for nb in graph[node]:
        if nb not in seen:
            dfs(graph, nb, seen)
    return seen

g = {1: [2, 3], 2: [4], 3: [4], 4: []}
print(bfs(g, 1))  # [1, 2, 3, 4]
\`\`\`

Always keep a **visited set** in graphs; without it, cycles make both searches loop forever.`,
        },
        {
          q: `Level order traversal of a binary tree (return the values level by level).`,
          d: 'medium',
          at: 'Amazon, Microsoft, Paytm',
          a: `This is BFS on a tree. Use a **queue** seeded with the root. The trick to separate levels: at the start of each round, note how many nodes are in the queue; that is exactly the current level. Pop that many nodes, record their values, and push their children, which form the next level.

\`\`\`python
from collections import deque

class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def level_order(root):
    if not root:
        return []
    result, q = [], deque([root])
    while q:
        level = []
        for _ in range(len(q)):
            node = q.popleft()
            level.append(node.val)
            if node.left:
                q.append(node.left)
            if node.right:
                q.append(node.right)
        result.append(level)
    return result

root = TreeNode(3, TreeNode(9), TreeNode(20, TreeNode(15), TreeNode(7)))
print(level_order(root))  # [[3], [9, 20], [15, 7]]
\`\`\`

**Complexity:** O(n) time (each node enqueued and dequeued once), O(w) space where w is the maximum width of the tree, up to about n/2 for the last level of a complete tree.

Use \`collections.deque\`, not a list: \`list.pop(0)\` is O(n). Common variations built on this exact code: zigzag traversal (reverse every other level), right side view (last value of each level), and the average or maximum of each level.`,
        },
        {
          q: `Find the maximum depth (height) of a binary tree.`,
          d: 'easy',
          at: 'Infosys, Amazon, Zoho',
          a: `The depth of a tree is the number of nodes on the longest path from the root down to a leaf.

**Recursive idea:** an empty tree has depth 0. Otherwise the depth is 1 (for the current node) plus the larger of the depths of the left and right subtrees. This is a postorder computation: children first, then the parent.

\`\`\`python
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def max_depth(root):
    if root is None:
        return 0
    return 1 + max(max_depth(root.left), max_depth(root.right))

root = TreeNode(3, TreeNode(9), TreeNode(20, TreeNode(15), TreeNode(7)))
print(max_depth(root))  # 3
\`\`\`

**Complexity:** O(n) time since every node is visited once. Space is O(h) for the recursion stack: O(log n) for a balanced tree, O(n) for a skewed one.

**Iterative alternative:** run a level order traversal (BFS) and count the levels. This avoids recursion limits on very deep, skewed trees.

This "answer for the node = combine answers of its children" pattern solves many tree problems: diameter of a tree, checking if a tree is balanced, path sums, and counting nodes. Once you see it, these problems become variations of the same five lines.`,
        },
        {
          q: `Find the lowest common ancestor (LCA) of two nodes in a binary search tree.`,
          d: 'medium',
          at: 'Amazon, Microsoft, Goldman Sachs',
          a: `The LCA of nodes p and q is the deepest node that has both as descendants (a node counts as its own descendant).

**Use the BST property:** start at the root.
- If both p and q are **smaller** than the current node, the LCA is in the left subtree.
- If both are **larger**, go right.
- Otherwise they split here (one on each side, or one of them equals the current node), so the current node is the LCA.

\`\`\`python
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def lca_bst(root, p, q):
    node = root
    while node:
        if p.val < node.val and q.val < node.val:
            node = node.left
        elif p.val > node.val and q.val > node.val:
            node = node.right
        else:
            return node
    return None
\`\`\`

For the BST with root 6, children 2 and 8, the LCA of 2 and 8 is 6; the LCA of 2 and 4 (4 being under 2) is 2.

**Complexity:** O(h) time (O(log n) when balanced), O(1) space with this iterative version.

**Follow-up, a general binary tree (not a BST):** recurse into both children. If p or q is the current node, return it. If both the left and right calls return non-null, the current node is the LCA; otherwise pass up whichever side is non-null. That takes O(n) time.`,
          tip: `State the split rule clearly: "the LCA is the first node where p and q go to different sides."`,
        },
        {
          q: `Check whether a binary tree is a valid binary search tree.`,
          d: 'medium',
          at: 'Amazon, Adobe, Oracle',
          a: `**Common wrong answer:** checking only that \`left.val < node.val < right.val\` for each node. It fails for a tree like 5 → left 3 → right 6: every parent–child pair looks fine, but 6 sits in the left subtree of 5.

**Correct approach, pass down valid ranges:** each node must lie strictly between a lower and an upper bound. Going left, the current value becomes the new upper bound; going right, it becomes the new lower bound.

\`\`\`python
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def is_valid_bst(root):
    def check(node, low, high):
        if node is None:
            return True
        if not (low < node.val < high):
            return False
        return (check(node.left, low, node.val) and
                check(node.right, node.val, high))
    return check(root, float('-inf'), float('inf'))

good = TreeNode(2, TreeNode(1), TreeNode(3))
bad = TreeNode(5, TreeNode(3, None, TreeNode(6)), TreeNode(7))
print(is_valid_bst(good), is_valid_bst(bad))  # True False
\`\`\`

**Complexity:** O(n) time, O(h) space for recursion.

**Alternative:** do an inorder traversal and check that values come out **strictly increasing**, keeping only the previous value. Same complexity.

Ask the interviewer whether duplicates are allowed; that decides between \`<\` and \`<=\`.`,
        },
        {
          q: `Number of islands: count groups of connected '1's in a 2D grid.`,
          d: 'medium',
          at: 'Amazon, Google, Samsung',
          a: `Treat the grid as a graph: each land cell ('1') connects to land cells up, down, left and right. The answer is the number of **connected components** of land.

**Approach:** scan every cell. When you find unvisited land, that is a new island: increase the count and **flood-fill** it with DFS or BFS, marking every connected land cell as visited (here by setting it to '0'), so it is never counted again.

\`\`\`python
def num_islands(grid):
    if not grid:
        return 0
    rows, cols = len(grid), len(grid[0])

    def sink(r, c):
        stack = [(r, c)]
        grid[r][c] = '0'
        while stack:
            r, c = stack.pop()
            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nr, nc = r + dr, c + dc
                if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == '1':
                    grid[nr][nc] = '0'
                    stack.append((nr, nc))

    count = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1':
                count += 1
                sink(r, c)
    return count

grid = [list("11000"), list("11000"), list("00100"), list("00011")]
print(num_islands(grid))  # 3
\`\`\`

**Complexity:** O(rows × cols) time, since every cell is processed a constant number of times. Space is O(rows × cols) in the worst case for the stack.

The explicit stack avoids Python's recursion limit on big grids. If modifying the input is not allowed, keep a separate \`visited\` set. Union-Find is another valid approach.`,
          tip: `Mark a cell visited when you push it, not when you pop it, or the same cell gets pushed many times.`,
        },
        {
          q: `How do you detect a cycle in a directed graph and produce a topological order (e.g. course schedule)?`,
          d: 'hard',
          at: 'Amazon, Microsoft, Uber',
          a: `**Topological order** lists the nodes of a directed graph so that every edge u → v has u before v (e.g. take prerequisite courses first). It exists **only if the graph has no cycle**, so one algorithm answers both questions.

**Kahn's algorithm (BFS):**
1. Compute the **in-degree** (number of incoming edges) of every node.
2. Put all nodes with in-degree 0 into a queue; they have no prerequisites.
3. Pop a node, add it to the order, and decrease the in-degree of each neighbour. Any neighbour that reaches 0 joins the queue.
4. If the order contains all n nodes, it is valid. If some nodes never reach in-degree 0, they are stuck in a **cycle**.

\`\`\`python
from collections import deque

def topo_sort(n, edges):          # edges: list of (u, v) meaning u before v
    graph = [[] for _ in range(n)]
    indeg = [0] * n
    for u, v in edges:
        graph[u].append(v)
        indeg[v] += 1
    q = deque(i for i in range(n) if indeg[i] == 0)
    order = []
    while q:
        u = q.popleft()
        order.append(u)
        for v in graph[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)
    return order if len(order) == n else []   # [] means a cycle exists

print(topo_sort(4, [(0, 1), (0, 2), (1, 3), (2, 3)]))  # [0, 1, 2, 3]
print(topo_sort(2, [(0, 1), (1, 0)]))                  # []
\`\`\`

**Complexity:** O(V + E) time and space.

**DFS alternative:** colour nodes white (unvisited), grey (on the current path), black (done). Reaching a **grey** node means a back edge, which is a cycle. Appending nodes when they turn black and reversing gives a topological order.`,
          tip: `For undirected graphs a visited set plus parent check finds cycles; directed graphs need in-degrees or the grey/black colouring.`,
        },
      ],
    },
    {
      title: 'Recursion, greedy and dynamic programming',
      questions: [
        {
          q: `What is recursion? What is a base case, and what happens without one?`,
          d: 'easy',
          at: 'TCS, Cognizant, Infosys',
          a: `**Recursion** is when a function solves a problem by calling itself on a smaller version of the same problem. Every recursive function needs two parts:
- A **base case**: the smallest input answered directly, without another call.
- A **recursive case**: reduce the problem and call the function again, moving closer to the base case.

\`\`\`python
def factorial(n):
    if n <= 1:          # base case
        return 1
    return n * factorial(n - 1)   # recursive case

print(factorial(5))  # 120
\`\`\`

Each call is placed on the **call stack** with its own local variables until it returns. factorial(5) waits for factorial(4), which waits for factorial(3), and so on; the results multiply back up as the calls return.

**Without a base case** (or if the input never reaches it), the function keeps calling itself until the stack runs out of space: a **stack overflow**. Python stops earlier with \`RecursionError: maximum recursion depth exceeded\` (default limit about 1000).

**Cost:** recursion uses O(depth) stack space, here O(n). Any recursion can be rewritten as a loop, sometimes with an explicit stack.

Recursion shines for naturally recursive structures: trees, divide and conquer (merge sort), and backtracking. Naive recursion can repeat work heavily (Fibonacci is O(2ⁿ)); caching results, called **memoization**, fixes that and leads into dynamic programming.`,
          tip: `Write the base case first, every time. Then check that each recursive call moves strictly toward it.`,
        },
        {
          q: `Climbing stairs: you can climb 1 or 2 steps at a time. In how many distinct ways can you reach step n?`,
          d: 'easy',
          at: 'Amazon, Zoho, Accenture',
          a: `To stand on step n, your last move came either from step n−1 (a 1-step) or from step n−2 (a 2-step). So:

**ways(n) = ways(n−1) + ways(n−2)**, with ways(1) = 1 and ways(2) = 2.

This is the Fibonacci recurrence, and it is the standard introduction to **dynamic programming**.

**Naive recursion** recomputes the same values again and again: O(2ⁿ) time. Store results instead. Since each value needs only the previous two, you can keep just two variables.

\`\`\`python
def climb_stairs(n):
    if n <= 2:
        return n
    prev, curr = 1, 2          # ways(1), ways(2)
    for _ in range(3, n + 1):
        prev, curr = curr, prev + curr
    return curr

print(climb_stairs(2))  # 2  (1+1, 2)
print(climb_stairs(3))  # 3  (1+1+1, 1+2, 2+1)
print(climb_stairs(5))  # 8
\`\`\`

**Complexity:** O(n) time, O(1) space.

Walk the interviewer through the progression: recursion (exponential) → memoization with a dictionary or \`functools.lru_cache\` (O(n) time and space) → bottom-up table → two variables. Follow-ups: allow steps of 1, 2 or 3 (add a third term), or forbid certain steps (set their ways to 0).`,
        },
        {
          q: `Greedy vs dynamic programming: what is the difference, and how do you decide which to use?`,
          d: 'medium',
          at: 'Microsoft, Amazon, Infosys',
          a: `**Greedy:** at every step, take the choice that looks best **right now** and never revisit it. Fast and simple, but correct only when local best choices are guaranteed to build a global best answer (the **greedy-choice property**).
Examples that work: activity selection (pick the meeting that ends earliest), fractional knapsack (take the best value per kg first), Huffman coding, Dijkstra, Kruskal and Prim.

**Dynamic programming (DP):** solve every relevant subproblem once, store the answers, and combine them, effectively trying all choices without repeating work. It needs:
- **Optimal substructure:** the best answer is built from best answers to subproblems.
- **Overlapping subproblems:** the same subproblems recur, so caching pays off.
Examples: 0/1 knapsack, coin change with arbitrary coins, longest common subsequence, edit distance.

**Classic contrast, coin change:** with Indian coins {1, 2, 5, 10}, greedy (take the largest coin that fits) gives the minimum number of coins. With coins {1, 3, 4} and amount 6, greedy picks 4+1+1 (3 coins) but the best is 3+3 (2 coins). DP gets it right.

**How to decide:**
1. Try to find a counter-example to the greedy rule on small inputs. If you find one, use DP.
2. If you cannot, and can argue that a greedy choice is never worse (an exchange argument), greedy is fine and usually faster.

Typical costs: greedy is often O(n log n) because of a sort; DP is often O(n × something) time and space.`,
          tip: `The coin set {1, 3, 4} with amount 6 is the quickest counter-example to show greedy can fail.`,
        },
        {
          q: `Coin change: find the minimum number of coins needed to make an amount.`,
          d: 'medium',
          at: 'Amazon, Flipkart, PhonePe',
          a: `Given coins [1, 2, 5] and amount 11, the answer is 3 (5 + 5 + 1). Return −1 if the amount cannot be made. Greedy fails for some coin sets, so use **DP**.

**State:** \`dp[x]\` = fewest coins that make amount x.
**Base:** \`dp[0] = 0\`.
**Transition:** for every coin c ≤ x, \`dp[x] = min(dp[x], dp[x - c] + 1)\`: use coin c last, and the rest is an already-solved smaller amount.

Fill the table from 0 up to the amount. Unreachable amounts stay at "infinity".

\`\`\`python
def coin_change(coins, amount):
    INF = amount + 1                 # larger than any real answer
    dp = [0] + [INF] * amount
    for x in range(1, amount + 1):
        for c in coins:
            if c <= x and dp[x - c] + 1 < dp[x]:
                dp[x] = dp[x - c] + 1
    return dp[amount] if dp[amount] != INF else -1

print(coin_change([1, 2, 5], 11))  # 3
print(coin_change([2], 3))         # -1
print(coin_change([1, 3, 4], 6))   # 2  (greedy would say 3)
\`\`\`

**Complexity:** O(amount × number of coins) time, O(amount) space.

**Related variant, number of ways to make the amount:** \`ways[0] = 1\`, and loop over **coins in the outer loop**, amounts inner: \`ways[x] += ways[x - c]\`. Putting coins outside counts combinations (1+2 and 2+1 counted once) instead of permutations. Interviewers like to ask why the loop order matters.`,
        },
        {
          q: `Explain the 0/1 knapsack problem and how dynamic programming solves it.`,
          d: 'hard',
          at: 'Amazon, Goldman Sachs, Samsung',
          a: `You have n items, each with a weight and a value, and a bag of capacity W. Choose items to **maximise total value** without exceeding W. Each item is taken whole or not at all (0/1), so the greedy "best value per kg" rule fails; it only works for the fractional version.

Trying every subset is O(2ⁿ). **DP** fixes this.

**State:** \`dp[i][w]\` = best value using the first i items with capacity w.
**Choice for item i:** skip it, giving \`dp[i-1][w]\`, or take it if it fits, giving \`value[i] + dp[i-1][w - weight[i]]\`. Keep the larger.

This can be compressed to a **1D array**, as long as capacities are iterated **from high to low**, so each item is used at most once:

\`\`\`python
def knapsack(weights, values, W):
    dp = [0] * (W + 1)               # dp[w] = best value with capacity w
    for wt, val in zip(weights, values):
        for w in range(W, wt - 1, -1):   # backwards: each item used once
            dp[w] = max(dp[w], dp[w - wt] + val)
    return dp[W]

print(knapsack([1, 3, 4, 5], [1, 4, 5, 7], 7))  # 9  (items with weights 3 and 4)
\`\`\`

**Complexity:** O(n × W) time; O(W) space with the 1D array (O(n × W) for the 2D table). This is called **pseudo-polynomial**, because it depends on the numeric value of W, not just the input size.

If you iterate capacities **forwards**, an item can be reused, which solves the **unbounded** knapsack instead. Explaining that difference is a strong signal in interviews. Similar problems: subset sum, partition into equal sums, target sum.`,
          tip: `Say "take it or leave it" for each item, then explain why the 1D loop runs backwards. Those two points carry the answer.`,
        },
        {
          q: `Find the length of the longest common subsequence (LCS) of two strings.`,
          d: 'hard',
          at: 'Amazon, Microsoft, Oracle',
          a: `A **subsequence** keeps characters in order but may skip some (unlike a substring, which must be contiguous). For "abcde" and "ace", the LCS is "ace", length 3.

**State:** \`dp[i][j]\` = LCS length of the first i characters of a and the first j characters of b.
**Transition:**
- If \`a[i-1] == b[j-1]\`, the characters match and extend the LCS: \`dp[i][j] = dp[i-1][j-1] + 1\`.
- Otherwise, drop one character from either string and keep the better: \`dp[i][j] = max(dp[i-1][j], dp[i][j-1])\`.
**Base:** row 0 and column 0 are 0 (an empty string has no common subsequence).

\`\`\`python
def lcs(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[m][n]

print(lcs("abcde", "ace"))  # 3
print(lcs("abc", "def"))    # 0
\`\`\`

**Complexity:** O(m × n) time and space. Space can be cut to O(min(m, n)) by keeping only two rows, since each row needs just the previous one.

To print the subsequence itself, walk back from \`dp[m][n]\`: on a match, take the character and go diagonally; otherwise move toward the larger neighbour. LCS underlies \`diff\` tools, DNA comparison and the edit distance problem.`,
        },
        {
          q: `Generate all subsets (the power set) of a list of distinct numbers.`,
          d: 'medium',
          at: 'Amazon, Adobe, Zoho',
          a: `For [1, 2, 3] there are 2³ = 8 subsets: [], [1], [2], [3], [1,2], [1,3], [2,3], [1,2,3].

**Backtracking:** for each element, there are two choices, include it or not. Build a current subset step by step; at each level, record the current subset, then try adding each remaining element, recurse, and **undo** the choice (pop) before trying the next one. That undo step is what "backtracking" means.

\`\`\`python
def subsets(nums):
    result, current = [], []

    def backtrack(start):
        result.append(current[:])        # copy the current subset
        for i in range(start, len(nums)):
            current.append(nums[i])      # choose
            backtrack(i + 1)             # explore
            current.pop()                # un-choose

    backtrack(0)
    return result

print(subsets([1, 2, 3]))
# [[], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], [3]]
\`\`\`

**Complexity:** O(n × 2ⁿ) time: there are 2ⁿ subsets and copying each takes up to O(n). O(n) extra space for the recursion and current list, not counting the output.

**Iterative alternative:** start with \`[[]]\`; for each number, add it to a copy of every existing subset. Or use bitmasks: numbers 0 to 2ⁿ − 1, where bit i says whether \`nums[i]\` is included.

Appending \`current[:]\` (a copy) is essential. Appending \`current\` itself stores the same list object 8 times, and every entry ends up empty. The same choose/explore/un-choose template solves permutations, combination sum and N-Queens.`,
          tip: `Learn the choose, explore, un-choose template once; permutations, combinations and N-Queens all reuse it.`,
        },
        {
          q: `Word break: can a string be split into a sequence of words from a given dictionary?`,
          d: 'hard',
          at: 'Amazon, Google, Walmart',
          a: `Example: s = "applepenapple", words = ["apple", "pen"] → True ("apple pen apple"). s = "catsandog", words = ["cats", "dog", "sand", "and", "cat"] → False.

Trying every split recursively is exponential because the same suffixes are re-checked many times. Use **DP** over prefixes.

**State:** \`dp[i]\` is True if the first i characters \`s[:i]\` can be fully split into dictionary words.
**Base:** \`dp[0] = True\` (the empty prefix).
**Transition:** \`dp[i]\` is True if there is some j < i with \`dp[j]\` True and \`s[j:i]\` in the dictionary.

Put the words in a **set** for O(1) lookups, and only look back as far as the longest word.

\`\`\`python
def word_break(s, words):
    word_set = set(words)
    max_len = max(map(len, word_set), default=0)
    dp = [False] * (len(s) + 1)
    dp[0] = True
    for i in range(1, len(s) + 1):
        for j in range(max(0, i - max_len), i):
            if dp[j] and s[j:i] in word_set:
                dp[i] = True
                break
    return dp[len(s)]

print(word_break("applepenapple", ["apple", "pen"]))                    # True
print(word_break("catsandog", ["cats", "dog", "sand", "and", "cat"]))  # False
\`\`\`

**Complexity:** O(n × L) substring checks, where L is the longest word length (O(n²) without that limit); each slice and hash costs up to O(L), so O(n × L²) overall. O(n) space for the table.

A top-down version with memoization (\`functools.lru_cache\` on the start index) is equally valid. Follow-up "Word Break II" asks for all sentences, which needs backtracking plus memoization and can produce exponentially many answers.`,
          tip: `Define dp[i] in words before coding: "the first i characters can be split". A clear state definition makes DP problems easy to explain.`,
        },
      ],
    },
  ],
};

export default book;
