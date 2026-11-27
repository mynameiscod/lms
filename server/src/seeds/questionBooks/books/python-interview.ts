import { SeedBook, Y1_Y2 } from '../types';

const book: SeedBook = {
  slug: 'python-interview',
  title: 'Python Interview Questions',
  kind: 'topic',
  subject: 'Python',
  description: `The 40 Python questions freshers face most: data types, collections, functions, OOP, exceptions and generators, with short answers and runnable examples.`,
  color: '#15803d',
  emblem: '🐍',
  audience: 'all',
  stages: Y1_Y2,
  tracks: [],
  order: 50,
  chapters: [
    {
      title: `Basics and data types`,
      questions: [
        {
          q: `What is Python and what are its key features?`,
          d: 'easy',
          at: `TCS, Infosys, Wipro`,
          a: `Python is a **high-level, interpreted, general-purpose** programming language created by Guido van Rossum. It is popular because the code is short and easy to read.

Key features:
- **Interpreted**: code runs line by line, no separate compile step for you.
- **Dynamically typed**: you do not declare types; a variable gets its type from the value.
- **Multi-paradigm**: supports procedural, object-oriented and functional styles.
- **Large standard library** and huge ecosystem (Django, Flask, pandas, NumPy).
- **Portable**: the same code runs on Windows, Linux and macOS.
- **Indentation** defines blocks instead of braces.

\`\`\`python
name = "Asha"        # str, no type declaration
marks = [78, 91, 85]
print(name, "scored", max(marks))   # Asha scored 91
\`\`\``,
          tip: `Mention 4-5 features with one line each. Linking them to real uses (web, data, automation) sounds practical.`,
        },
        {
          q: `What is the difference between mutable and immutable types in Python?`,
          d: 'easy',
          at: `Infosys, Accenture, Capgemini`,
          a: `A **mutable** object can be changed after it is created. An **immutable** object cannot; any "change" creates a new object.

- Immutable: \`int\`, \`float\`, \`bool\`, \`str\`, \`tuple\`, \`frozenset\`
- Mutable: \`list\`, \`dict\`, \`set\`, user-defined objects (by default)

\`\`\`python
nums = [1, 2, 3]
print(id(nums))
nums.append(4)       # same object changed
print(id(nums))      # same id as before

s = "hi"
print(id(s))
s = s + "!"          # a new string is created
print(id(s))         # different id
\`\`\`

Why it matters: immutable objects can be used as dictionary keys and set items (they are hashable), and they are safe to share. Mutable objects passed to a function can be changed inside it, which affects the caller.`,
          tip: `Use id() in your example to prove whether the object changed or a new one was made.`,
        },
        {
          q: `What is the difference between \`is\` and \`==\` in Python?`,
          d: 'medium',
          at: `Infosys, Cognizant, Zoho`,
          a: `- \`==\` checks **value equality**: do the two objects hold the same data? (It calls \`__eq__\`.)
- \`is\` checks **identity**: are both names pointing to the **same object** in memory? (Same \`id()\`.)

\`\`\`python
a = [1, 2, 3]
b = [1, 2, 3]
c = a

print(a == b)   # True  - same values
print(a is b)   # False - two different lists
print(a is c)   # True  - same object
\`\`\`

Use \`is\` only for singletons such as \`None\`, \`True\` and \`False\`:

\`\`\`python
if result is None:
    print("no result")
\`\`\`

Be careful: \`x is 256\` may be True for small integers because CPython caches ints from -5 to 256, but that is an implementation detail. Never use \`is\` to compare numbers or strings.`,
          tip: `Say "== is value, is is identity" and give the None example. Mention small-int caching for bonus points.`,
        },
        {
          q: `How do you slice a string, and how do you reverse a string in Python?`,
          d: 'easy',
          at: `TCS, Wipro, HCL`,
          a: `Slicing uses \`s[start:stop:step]\`. \`start\` is included, \`stop\` is excluded, and \`step\` is the jump. Any part can be left out. Negative indexes count from the end.

\`\`\`python
s = "PYTHON"
print(s[0:2])    # PY
print(s[2:])     # THON
print(s[-3:])    # HON
print(s[::2])    # PTO
\`\`\`

The easiest way to reverse is a step of -1:

\`\`\`python
print(s[::-1])               # NOHTYP
print("".join(reversed(s)))  # NOHTYP
\`\`\`

Checking a palindrome becomes one line:

\`\`\`python
word = "madam"
print(word == word[::-1])    # True
\`\`\`

Slicing never raises an IndexError for out-of-range values; it just returns what is available. Strings are immutable, so slicing always returns a new string.`,
          tip: `Interviewers often follow up with "reverse without slicing" - be ready with a loop or reversed().`,
        },
        {
          q: `How do you swap two variables without using a temporary variable?`,
          d: 'easy',
          at: `TCS, Cognizant, Tech Mahindra`,
          a: `Python supports **tuple packing and unpacking**, so swapping is one line:

\`\`\`python
a, b = 5, 10
a, b = b, a
print(a, b)   # 10 5
\`\`\`

How it works: the right side \`b, a\` is first packed into a tuple \`(10, 5)\`, then unpacked into \`a\` and \`b\`.

If the interviewer asks for an arithmetic method (common in C-style questions):

\`\`\`python
a, b = 5, 10
a = a + b    # 15
b = a - b    # 5
a = a - b    # 10
print(a, b)  # 10 5
\`\`\`

Or with XOR for integers:

\`\`\`python
a, b = 5, 10
a = a ^ b
b = a ^ b
a = a ^ b
print(a, b)  # 10 5
\`\`\`

In real Python code always use the tuple version; it is clear and works for any type.`,
          tip: `Give the Pythonic answer first, then show the arithmetic trick to prove you know the logic.`,
        },
        {
          q: `What is PEP 8 and what are some of its main rules?`,
          d: 'easy',
          at: `Infosys, Accenture`,
          a: `**PEP 8** is the official style guide for Python code. PEP means Python Enhancement Proposal. Following it makes code readable and consistent across teams.

Main rules:
- Use **4 spaces** per indentation level, not tabs.
- Keep lines to about **79 characters**.
- Names: \`snake_case\` for variables and functions, \`PascalCase\` for classes, \`UPPER_CASE\` for constants.
- Two blank lines between top-level functions and classes, one between methods.
- Put imports at the top, one per line, grouped: standard library, third-party, local.
- Spaces around operators (\`x = a + b\`), no space before brackets.
- Compare with \`None\` using \`is\`, not \`==\`.

\`\`\`python
MAX_USERS = 100

class StudentRecord:
    def total_marks(self, marks):
        return sum(marks)
\`\`\`

Tools like \`flake8\`, \`pylint\` and \`black\` check or auto-format code to PEP 8.`,
          tip: `Naming conventions and 4-space indentation are the points most interviewers expect.`,
        },
        {
          q: `What is dynamic typing? What is the difference between \`type()\` and \`isinstance()\`?`,
          d: 'medium',
          at: `Cognizant, Capgemini`,
          a: `**Dynamic typing** means the type belongs to the value, not the variable. A name can point to an int now and a string later, and types are checked at run time.

\`\`\`python
x = 10
print(type(x))   # <class 'int'>
x = "ten"
print(type(x))   # <class 'str'>
\`\`\`

Python is also **strongly typed**: it will not silently mix types, so \`"5" + 5\` raises a \`TypeError\`.

\`type(obj)\` returns the exact class. \`isinstance(obj, cls)\` returns True if the object is of that class **or any subclass**.

\`\`\`python
class Animal: pass
class Dog(Animal): pass

d = Dog()
print(type(d) == Animal)      # False
print(isinstance(d, Animal))  # True
print(isinstance(5, (int, float)))  # True - tuple of types
\`\`\`

Prefer \`isinstance()\` for type checks because it respects inheritance.`,
          tip: `Saying "dynamically but strongly typed" shows you understand both ideas.`,
        },
        {
          q: `How is memory managed in Python?`,
          d: 'hard',
          at: `Zoho, Amazon, product companies`,
          a: `Python manages memory automatically using a **private heap**. You never free memory yourself.

1. **Reference counting**: every object keeps a count of how many references point to it. When the count reaches 0, the memory is freed immediately.
2. **Garbage collector** (the \`gc\` module): reference counting cannot free **cycles** (A refers to B, B refers to A). The generational garbage collector finds and frees such unreachable cycles.
3. **Memory pools** (pymalloc): small objects are allocated from pools for speed.

\`\`\`python
import sys

a = []
b = a
print(sys.getrefcount(a))  # 3 (a, b, and the function argument)

del b                      # count goes down
a = None                   # list count reaches 0, memory freed
\`\`\`

\`\`\`python
import gc
print(gc.collect())   # runs a collection, returns objects found
\`\`\`

\`del\` removes a name, not the object; the object is freed only when no references remain.`,
          tip: `Cover all three: reference counting, the cyclic GC and the private heap. Mention that del removes a name only.`,
        },
      ],
    },
    {
      title: `Lists, tuples, sets and dictionaries`,
      questions: [
        {
          q: `What is the difference between a list and a tuple?`,
          d: 'easy',
          at: `TCS, Infosys, Wipro, Accenture`,
          a: `| | List | Tuple |
|---|---|---|
| Syntax | \`[1, 2, 3]\` | \`(1, 2, 3)\` |
| Mutable | Yes | No |
| Speed | Slightly slower | Slightly faster, less memory |
| Dict key | Not allowed | Allowed (if items are hashable) |
| Methods | Many (\`append\`, \`remove\`, ...) | Only \`count\`, \`index\` |

\`\`\`python
nums = [1, 2, 3]
nums[0] = 10       # fine

point = (4, 5)
# point[0] = 9     # TypeError: 'tuple' object does not support item assignment

location = {(12.9, 77.5): "Bengaluru"}   # tuple as a key
\`\`\`

Use a **list** for a collection that will change (a cart, a list of marks). Use a **tuple** for fixed data (coordinates, RGB colours, returning several values from a function).

Note: a one-item tuple needs a comma: \`(5,)\`. \`(5)\` is just the int 5.`,
          tip: `Mention mutability first, then performance and dict keys. The (5,) trick is a nice extra.`,
        },
        {
          q: `When would you use a list, a set and a dictionary?`,
          d: 'easy',
          at: `Cognizant, Capgemini`,
          a: `- **List**: ordered, allows duplicates, accessed by index. Use for sequences where order matters.
- **Set**: unordered, **no duplicates**, very fast membership test (\`in\` is O(1) on average). Use to remove duplicates or for set maths.
- **Dictionary**: key-value pairs, keys unique, fast lookup by key, keeps insertion order (Python 3.7+). Use to map one thing to another.

\`\`\`python
marks = [80, 75, 80, 90]          # list keeps duplicates
print(set(marks))                 # {80, 90, 75}

a = {1, 2, 3}
b = {2, 3, 4}
print(a & b, a | b, a - b)        # {2, 3} {1, 2, 3, 4} {1}

student = {"name": "Ravi", "age": 21}
print(student["name"])            # Ravi
print(student.get("city", "NA"))  # NA
\`\`\`

Checking \`x in some_list\` is O(n), but \`x in some_set\` is O(1) on average, so convert to a set for repeated lookups.`,
          tip: `Back your answer with time complexity: list lookup O(n), set/dict lookup O(1) average.`,
        },
        {
          q: `What is a list comprehension? Give examples.`,
          d: 'easy',
          at: `Infosys, Accenture, Deloitte`,
          a: `A **list comprehension** builds a new list in a single, readable line. Format: \`[expression for item in iterable if condition]\`.

\`\`\`python
# squares of 1 to 5
squares = [x * x for x in range(1, 6)]
print(squares)   # [1, 4, 9, 16, 25]

# only even numbers
evens = [x for x in range(10) if x % 2 == 0]
print(evens)     # [0, 2, 4, 6, 8]

# if-else goes before the for
labels = ["even" if x % 2 == 0 else "odd" for x in range(4)]
print(labels)    # ['even', 'odd', 'even', 'odd']

# nested: flatten a matrix
matrix = [[1, 2], [3, 4]]
flat = [n for row in matrix for n in row]
print(flat)      # [1, 2, 3, 4]
\`\`\`

It is shorter and usually faster than a \`for\` loop with \`append\`. Avoid very long or deeply nested comprehensions; a normal loop is clearer then.`,
          tip: `Remember: a filter "if" goes at the end, an "if-else" expression goes at the start.`,
        },
        {
          q: `What are dictionary and set comprehensions?`,
          d: 'medium',
          at: `Cognizant, Wipro`,
          a: `They work like list comprehensions but build a dictionary or a set.

**Dict comprehension**: \`{key_expr: value_expr for item in iterable if condition}\`

\`\`\`python
squares = {x: x * x for x in range(1, 5)}
print(squares)   # {1: 1, 2: 4, 3: 9, 4: 16}

names = ["asha", "ravi", "kiran"]
lengths = {n: len(n) for n in names}
print(lengths)   # {'asha': 4, 'ravi': 4, 'kiran': 5}

# swap keys and values
prices = {"pen": 10, "book": 50}
by_price = {v: k for k, v in prices.items()}
print(by_price)  # {10: 'pen', 50: 'book'}

# keep only passing students
marks = {"A": 35, "B": 72, "C": 58}
passed = {k: v for k, v in marks.items() if v >= 40}
print(passed)    # {'B': 72, 'C': 58}
\`\`\`

**Set comprehension** uses braces without a colon:

\`\`\`python
words = ["hi", "hello", "hey", "hi"]
print({len(w) for w in words})   # {2, 3, 5}
\`\`\`

Note: \`{}\` alone is an empty dict; use \`set()\` for an empty set.`,
          tip: `The key-value swap and filter-by-value examples are commonly asked as live coding.`,
        },
        {
          q: `What is the difference between a shallow copy and a deep copy?`,
          d: 'medium',
          at: `Infosys, TCS Digital, Zoho`,
          a: `- **Assignment** (\`b = a\`) copies nothing; both names point to the same object.
- **Shallow copy** creates a new outer object, but the **inner objects are shared**.
- **Deep copy** creates a new outer object **and recursively copies all inner objects**.

\`\`\`python
import copy

a = [[1, 2], [3, 4]]
shallow = copy.copy(a)      # same as a[:] or list(a)
deep = copy.deepcopy(a)

a[0].append(99)

print(shallow)  # [[1, 2, 99], [3, 4]]  - inner list shared
print(deep)     # [[1, 2], [3, 4]]      - fully independent
\`\`\`

For a flat list of immutable items (like \`[1, 2, 3]\`), a shallow copy is enough. When the data has nested mutable objects (lists of lists, dicts of lists), use \`deepcopy\` to avoid changes leaking between copies.

Shallow copy ways: \`copy.copy(x)\`, \`x.copy()\`, \`x[:]\`, \`list(x)\`, \`dict(x)\`.`,
          tip: `Always show a nested list example; with a flat list both copies behave the same and the difference is invisible.`,
        },
        {
          q: `Why can't a list be used as a dictionary key? What does "hashable" mean?`,
          d: 'medium',
          at: `Amazon, Zoho, Freshworks`,
          a: `Dictionaries and sets find items using a **hash value**. An object is **hashable** if it has a hash that never changes during its lifetime and it can be compared with \`==\`.

Immutable built-ins (\`int\`, \`str\`, \`tuple\` of hashable items, \`frozenset\`) are hashable. Mutable ones (\`list\`, \`dict\`, \`set\`) are not, because if their contents changed, their hash would change and the dictionary could no longer find them.

\`\`\`python
d = {}
d[(1, 2)] = "tuple ok"
print(d)            # {(1, 2): 'tuple ok'}

# d[[1, 2]] = "x"   # TypeError: unhashable type: 'list'

print(hash("abc") == hash("abc"))   # True
\`\`\`

A tuple that contains a list is also unhashable:

\`\`\`python
# hash((1, [2]))   # TypeError: unhashable type: 'list'
\`\`\`

Fix: convert the list to a tuple, or a set to a \`frozenset\`, before using it as a key.`,
          tip: `Explain the reason (changing contents would change the hash), not just the rule.`,
        },
        {
          q: `What is the difference between \`append()\` and \`extend()\`, and between \`sort()\` and \`sorted()\`?`,
          d: 'easy',
          at: `TCS, HCL, Wipro`,
          a: `**append vs extend**
- \`append(x)\` adds \`x\` as **one item** at the end.
- \`extend(iterable)\` adds **each item** of the iterable.

\`\`\`python
a = [1, 2]
a.append([3, 4])
print(a)    # [1, 2, [3, 4]]

b = [1, 2]
b.extend([3, 4])
print(b)    # [1, 2, 3, 4]
\`\`\`

**sort vs sorted**
- \`list.sort()\` sorts the list **in place** and returns \`None\`. Works only on lists.
- \`sorted(iterable)\` returns a **new sorted list** and leaves the original unchanged. Works on any iterable.

\`\`\`python
nums = [3, 1, 2]
print(sorted(nums))   # [1, 2, 3]
print(nums)           # [3, 1, 2]

nums.sort(reverse=True)
print(nums)           # [3, 2, 1]

words = ["kiwi", "fig", "banana"]
print(sorted(words, key=len))   # ['fig', 'kiwi', 'banana']
\`\`\`

A common bug: \`nums = nums.sort()\` sets \`nums\` to \`None\`.`,
          tip: `Mention the nums = nums.sort() bug; it shows you have actually written Python.`,
        },
        {
          q: `How does a Python dictionary work internally, and what is the time complexity of its operations?`,
          d: 'hard',
          at: `Amazon, Zoho, product companies`,
          a: `A dictionary is a **hash table**. To store \`d[key] = value\`, Python:
1. Computes \`hash(key)\`.
2. Uses the hash to pick a slot in an internal array.
3. If the slot is taken by a different key (a **collision**), it probes other slots (open addressing) until it finds a free one or the matching key (checked with \`==\`).

When the table gets about two-thirds full, Python **resizes** it and re-inserts the keys. Since Python 3.7, dictionaries also **keep insertion order** (a compact layout stores entries in order, with a separate index table).

| Operation | Average | Worst |
|---|---|---|
| \`d[k]\`, \`d[k] = v\`, \`del d[k]\`, \`k in d\` | O(1) | O(n) |
| Iterating | O(n) | O(n) |

\`\`\`python
d = {"b": 2, "a": 1}
d["c"] = 3
print(list(d))      # ['b', 'a', 'c'] - insertion order kept
print("a" in d)     # True, O(1) on average
\`\`\`

The worst case O(n) happens only with many collisions, which is rare with good hashes.`,
          tip: `Use the words hash table, collision, open addressing and resizing. Note ordered dicts since 3.7.`,
        },
      ],
    },
    {
      title: `Functions, scope and modules`,
      questions: [
        {
          q: `What are \`*args\` and \`**kwargs\`?`,
          d: 'easy',
          at: `Infosys, Accenture, Cognizant`,
          a: `They let a function accept a **variable number of arguments**.

- \`*args\` collects extra **positional** arguments into a **tuple**.
- \`**kwargs\` collects extra **keyword** arguments into a **dictionary**.

The names \`args\` and \`kwargs\` are only a convention; the \`*\` and \`**\` do the work.

\`\`\`python
def show(*args, **kwargs):
    print(args)
    print(kwargs)

show(1, 2, 3, name="Asha", city="Pune")
# (1, 2, 3)
# {'name': 'Asha', 'city': 'Pune'}

def total(*nums):
    return sum(nums)

print(total(10, 20, 30))   # 60
\`\`\`

The same symbols **unpack** values when calling a function:

\`\`\`python
def greet(name, city):
    print(f"{name} from {city}")

data = {"name": "Ravi", "city": "Chennai"}
greet(**data)            # Ravi from Chennai
greet(*["Kiran", "Goa"]) # Kiran from Goa
\`\`\`

Order in a definition: normal params, \`*args\`, keyword-only params, \`**kwargs\`.`,
          tip: `Say "tuple" for args and "dict" for kwargs, and show unpacking at the call site too.`,
        },
        {
          q: `What is the mutable default argument problem in Python?`,
          d: 'medium',
          at: `Zoho, Amazon, Freshworks`,
          a: `Default values are evaluated **once, when the function is defined**, not each time it is called. If the default is mutable (a list or dict), every call that uses the default shares the **same object**.

\`\`\`python
def add_item(item, cart=[]):
    cart.append(item)
    return cart

print(add_item("pen"))    # ['pen']
print(add_item("book"))   # ['pen', 'book']  - surprise!
\`\`\`

The list keeps growing across calls because it is the same list.

**Fix**: use \`None\` as the default and create a new object inside:

\`\`\`python
def add_item(item, cart=None):
    if cart is None:
        cart = []
    cart.append(item)
    return cart

print(add_item("pen"))    # ['pen']
print(add_item("book"))   # ['book']
\`\`\`

You can see the shared default with \`add_item.__defaults__\`. Immutable defaults like numbers, strings and \`None\` are safe.`,
          tip: `Show the bug output first, then the None fix. This is one of the most asked Python "gotcha" questions.`,
        },
        {
          q: `What are lambda functions? How are they used with \`map()\`, \`filter()\` and \`sorted()\`?`,
          d: 'easy',
          at: `TCS, Wipro, Capgemini`,
          a: `A **lambda** is a small anonymous function written in one line: \`lambda arguments: expression\`. It can have many arguments but only **one expression**, whose value is returned.

\`\`\`python
square = lambda x: x * x
print(square(5))          # 25
\`\`\`

**map** applies a function to every item:

\`\`\`python
nums = [1, 2, 3, 4]
print(list(map(lambda x: x * 10, nums)))   # [10, 20, 30, 40]
\`\`\`

**filter** keeps items where the function returns True:

\`\`\`python
print(list(filter(lambda x: x % 2 == 0, nums)))   # [2, 4]
\`\`\`

**sorted** with a key:

\`\`\`python
students = [("Asha", 82), ("Ravi", 67), ("Kiran", 91)]
print(sorted(students, key=lambda s: s[1], reverse=True))
# [('Kiran', 91), ('Asha', 82), ('Ravi', 67)]
\`\`\`

\`map\` and \`filter\` return lazy iterators in Python 3, so wrap them in \`list()\` to see the values. For complex logic, use a normal \`def\` function.`,
          tip: `Mention that map/filter return iterators in Python 3, and that a list comprehension is often a clearer option.`,
        },
        {
          q: `Explain variable scope in Python (LEGB rule). What do \`global\` and \`nonlocal\` do?`,
          d: 'medium',
          at: `Infosys, Cognizant, Zoho`,
          a: `When Python looks up a name, it searches in this order, called **LEGB**:
1. **Local**: inside the current function.
2. **Enclosing**: inside any outer function (for nested functions).
3. **Global**: at the top level of the module.
4. **Built-in**: names like \`len\`, \`print\`.

Assigning to a name inside a function makes it **local** by default. To change an outer variable you need a keyword:

- \`global x\`: refers to the module-level \`x\`.
- \`nonlocal x\`: refers to \`x\` in the nearest enclosing function.

\`\`\`python
count = 0

def increase():
    global count
    count += 1

increase()
print(count)   # 1

def outer():
    total = 0
    def inner():
        nonlocal total
        total += 5
    inner()
    return total

print(outer())  # 5
\`\`\`

Without \`global\`, \`count += 1\` raises \`UnboundLocalError\`, because Python treats \`count\` as a local that is read before it is assigned.`,
          tip: `Explaining why UnboundLocalError happens shows real understanding of scope.`,
        },
        {
          q: `What is the difference between a module and a package? What does \`if __name__ == "__main__":\` mean?`,
          d: 'easy',
          at: `TCS, Accenture, Wipro`,
          a: `- A **module** is a single \`.py\` file containing functions, classes and variables.
- A **package** is a folder of modules, usually with an \`__init__.py\` file, which lets you organise code in a hierarchy.

\`\`\`python
# shop/
#   __init__.py
#   billing.py
#   cart.py

from shop.billing import make_invoice
import math
print(math.sqrt(16))   # 4.0
\`\`\`

Every module has a built-in variable \`__name__\`. When the file is **run directly**, \`__name__\` is \`"__main__"\`. When it is **imported**, \`__name__\` is the module's name.

\`\`\`python
# utils.py
def add(a, b):
    return a + b

if __name__ == "__main__":
    print(add(2, 3))   # runs only with: python utils.py
\`\`\`

This guard lets a file work both as a reusable module and as a script, without running test or demo code on import.`,
          tip: `Explain what __name__ holds in each case; that is the real answer, not just "it is the main function".`,
        },
        {
          q: `What is a virtual environment and why do we use it?`,
          d: 'easy',
          at: `Accenture, Deloitte, startups`,
          a: `A **virtual environment** is an isolated folder with its own Python interpreter and installed packages. Each project gets its own set of libraries, separate from the system Python and from other projects.

Why use one:
- Project A may need Django 4 and project B Django 5; both can live on one machine.
- Installing packages does not affect the system Python.
- You can record exact versions so teammates and servers get the same setup.

\`\`\`python
# Terminal commands (shown as comments)
# python -m venv venv              create
# venv/Scripts/activate            activate on Windows
# source venv/bin/activate         activate on Linux / macOS
# pip install requests flask       install inside it
# pip freeze > requirements.txt    save versions
# pip install -r requirements.txt  recreate elsewhere
# deactivate                       leave it
\`\`\`

\`venv\` is built into Python 3. Other tools include \`virtualenv\`, \`conda\`, \`pipenv\` and \`poetry\`. The venv folder is not committed to Git; \`requirements.txt\` is.`,
          tip: `Mention requirements.txt and that the venv folder stays out of Git; it shows real project experience.`,
        },
        {
          q: `What is a closure in Python?`,
          d: 'medium',
          at: `Zoho, Freshworks`,
          a: `A **closure** is an inner function that **remembers variables from its enclosing function**, even after the outer function has finished running.

Three conditions:
1. There is a nested function.
2. The inner function uses a variable from the outer function.
3. The outer function returns the inner function.

\`\`\`python
def make_multiplier(n):
    def multiply(x):
        return x * n     # n comes from the outer function
    return multiply

double = make_multiplier(2)
triple = make_multiplier(3)

print(double(5))   # 10
print(triple(5))   # 15
\`\`\`

Even though \`make_multiplier\` has returned, \`double\` still remembers \`n = 2\`. You can see it with \`double.__closure__\`.

Uses: creating configured functions (like counters or formatters), hiding data without a class, and they are the basis of **decorators**.

\`\`\`python
def counter():
    count = 0
    def step():
        nonlocal count
        count += 1
        return count
    return step

c = counter()
print(c(), c(), c())   # 1 2 3
\`\`\``,
          tip: `Link closures to decorators; interviewers often ask them back to back.`,
        },
        {
          q: `What is a decorator? Write a simple decorator.`,
          d: 'hard',
          at: `Amazon, Zoho, Infosys (SP/DSE)`,
          a: `A **decorator** is a function that takes another function, adds some behaviour around it, and returns a new function, **without changing the original code**. The \`@name\` syntax is a shortcut for \`func = name(func)\`.

\`\`\`python
import time
from functools import wraps

def timer(func):
    @wraps(func)                     # keeps func's name and docstring
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        print(f"{func.__name__} took {time.time() - start:.4f}s")
        return result
    return wrapper

@timer
def add(a, b):
    return a + b

print(add(2, 3))
# add took 0.0000s
# 5
\`\`\`

A decorator that takes arguments needs one more level:

\`\`\`python
def repeat(n):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for _ in range(n):
                func(*args, **kwargs)
        return wrapper
    return decorator

@repeat(2)
def hello():
    print("hi")

hello()   # hi  hi
\`\`\`

Real uses: logging, timing, caching (\`functools.lru_cache\`), login checks in Flask/Django.`,
          tip: `Use *args, **kwargs in the wrapper and mention functools.wraps. Name a real use like login_required.`,
        },
      ],
    },
    {
      title: `OOP in Python`,
      questions: [
        {
          q: `What is \`self\` in Python?`,
          d: 'easy',
          at: `TCS, Wipro, Infosys`,
          a: `\`self\` is the **first parameter of an instance method** and refers to the **object the method is called on**. Through \`self\` the method reads and changes that object's attributes.

\`\`\`python
class Student:
    def __init__(self, name, marks):
        self.name = name      # attribute stored on this object
        self.marks = marks

    def show(self):
        print(f"{self.name}: {self.marks}")

s1 = Student("Asha", 88)
s2 = Student("Ravi", 74)
s1.show()   # Asha: 88
s2.show()   # Ravi: 74
\`\`\`

When you write \`s1.show()\`, Python actually calls \`Student.show(s1)\`, passing the object automatically as \`self\`.

Points to remember:
- \`self\` is not a keyword; it is a strong convention. Any name works, but always use \`self\`.
- You must write it explicitly in the method definition, unlike \`this\` in Java.
- Without \`self.\`, a variable inside a method is just a local variable and is lost when the method ends.`,
          tip: `Show that s1.show() is the same as Student.show(s1); it makes the concept click.`,
        },
        {
          q: `What is the difference between \`__init__\` and \`__new__\`?`,
          d: 'hard',
          at: `Zoho, Amazon, product companies`,
          a: `- \`__new__\` **creates** the object. It is a static method that receives the class (\`cls\`) and must **return a new instance**. It runs first.
- \`__init__\` **initialises** the object that \`__new__\` returned. It receives \`self\`, sets attributes and returns \`None\`.

\`\`\`python
class Demo:
    def __new__(cls, *args, **kwargs):
        print("1. __new__ creating")
        return super().__new__(cls)

    def __init__(self, value):
        print("2. __init__ setting value")
        self.value = value

d = Demo(10)
# 1. __new__ creating
# 2. __init__ setting value
\`\`\`

You rarely override \`__new__\`. Typical cases are subclassing immutable types (\`int\`, \`str\`, \`tuple\`), where the value must be set at creation, and patterns like a **singleton**:

\`\`\`python
class Config:
    _instance = None
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

print(Config() is Config())   # True
\`\`\`

If \`__new__\` does not return an instance of the class, \`__init__\` is not called.`,
          tip: `"__new__ creates, __init__ initialises" - then give the singleton or immutable-subclass use case.`,
        },
        {
          q: `What is inheritance? What types of inheritance does Python support?`,
          d: 'easy',
          at: `TCS, Cognizant, Accenture`,
          a: `**Inheritance** lets a class (child) reuse and extend the attributes and methods of another class (parent). It avoids repeating code and models "is-a" relationships.

\`\`\`python
class Employee:
    def __init__(self, name):
        self.name = name
    def work(self):
        return f"{self.name} is working"

class Developer(Employee):
    def work(self):                    # method overriding
        return f"{self.name} is coding"

print(Developer("Asha").work())   # Asha is coding
\`\`\`

Types supported by Python:
- **Single**: one child, one parent.
- **Multiple**: one child, many parents: \`class C(A, B)\`.
- **Multilevel**: A -> B -> C.
- **Hierarchical**: many children from one parent.
- **Hybrid**: a mix of the above.

\`\`\`python
class Flyer:  pass
class Swimmer: pass
class Duck(Flyer, Swimmer): pass   # multiple inheritance
print(Duck.__bases__)
\`\`\`

Use \`super()\` to call the parent's version of a method, and \`issubclass(Developer, Employee)\` to check the relationship. Unlike Java, Python supports multiple inheritance of classes directly.`,
          tip: `Name all five types and point out that Python, unlike Java, allows multiple inheritance of classes.`,
        },
        {
          q: `What is MRO (Method Resolution Order) and how does \`super()\` work?`,
          d: 'hard',
          at: `Zoho, Amazon, Infosys (SP)`,
          a: `**MRO** is the order in which Python searches classes for a method or attribute. It matters most with multiple inheritance. Python uses the **C3 linearisation** algorithm: a child comes before its parents, and parents keep the order you listed them in.

\`\`\`python
class A:
    def hello(self): print("A")
class B(A):
    def hello(self):
        print("B"); super().hello()
class C(A):
    def hello(self):
        print("C"); super().hello()
class D(B, C):
    def hello(self):
        print("D"); super().hello()

D().hello()     # D B C A
print([k.__name__ for k in D.__mro__])
# ['D', 'B', 'C', 'A', 'object']
\`\`\`

This is the classic **diamond problem**. \`super()\` does **not** simply mean "my parent"; it means "the **next class in the MRO** of the object". That is why \`B\`'s \`super()\` goes to \`C\`, not \`A\`, and \`A.hello\` runs only once.

You can view the order with \`ClassName.__mro__\` or \`ClassName.mro()\`. If no consistent order exists, Python raises a \`TypeError\` when the class is defined.`,
          tip: `Draw the diamond and say "super() means next in the MRO, not the parent". That line wins this question.`,
        },
        {
          q: `What is the difference between \`@staticmethod\` and \`@classmethod\`?`,
          d: 'medium',
          at: `Infosys, Capgemini, Zoho`,
          a: `| | Instance method | \`@classmethod\` | \`@staticmethod\` |
|---|---|---|---|
| First argument | \`self\` (object) | \`cls\` (class) | none |
| Can use object data | Yes | No | No |
| Can use class data | Yes | Yes | No (not directly) |

- A **classmethod** works with the class itself. Common use: **alternative constructors** (factory methods), and it works correctly with subclasses.
- A **staticmethod** is a plain function placed inside the class because it logically belongs there; it gets no automatic argument.

\`\`\`python
class Student:
    school = "CodeBegun"

    def __init__(self, name, age):
        self.name, self.age = name, age

    @classmethod
    def from_string(cls, text):        # factory
        name, age = text.split("-")
        return cls(name, int(age))

    @staticmethod
    def is_adult(age):                 # utility
        return age >= 18

s = Student.from_string("Ravi-21")
print(s.name, s.age)            # Ravi 21
print(Student.is_adult(16))     # False
\`\`\``,
          tip: `Give a real use for each: classmethod as a factory (from_string), staticmethod as a helper/validator.`,
        },
        {
          q: `What are dunder (magic) methods? What is the difference between \`__str__\` and \`__repr__\`?`,
          d: 'medium',
          at: `Zoho, Freshworks, Infosys`,
          a: `**Dunder methods** ("double underscore") are special methods Python calls automatically for built-in operations. Defining them lets your objects work with operators and functions like \`len()\`, \`+\` and \`print()\`.

Common ones: \`__init__\`, \`__str__\`, \`__repr__\`, \`__len__\`, \`__eq__\`, \`__lt__\`, \`__add__\`, \`__getitem__\`, \`__iter__\`, \`__call__\`.

\`\`\`python
class Money:
    def __init__(self, amount):
        self.amount = amount
    def __add__(self, other):
        return Money(self.amount + other.amount)
    def __eq__(self, other):
        return self.amount == other.amount
    def __str__(self):
        return f"Rs {self.amount}"
    def __repr__(self):
        return f"Money({self.amount})"

m = Money(100) + Money(50)
print(m)          # Rs 150     (uses __str__)
print([m])        # [Money(150)] (lists use __repr__)
print(m == Money(150))   # True
\`\`\`

- \`__str__\`: readable text for **users**, used by \`print()\` and \`str()\`.
- \`__repr__\`: unambiguous text for **developers**, ideally valid code to recreate the object. Used in the shell, in lists and by \`repr()\`. If \`__str__\` is missing, Python falls back to \`__repr__\`.`,
          tip: `Remember: __str__ is for users, __repr__ is for developers, and repr is the fallback.`,
        },
        {
          q: `How does Python support encapsulation? What do single and double underscores mean?`,
          d: 'medium',
          at: `Cognizant, Capgemini, Accenture`,
          a: `Python has no \`private\` keyword. Encapsulation works by **naming conventions** and properties.

- \`name\`: public.
- \`_name\` (one underscore): "internal, please don't use from outside". Only a convention; access still works.
- \`__name\` (two underscores): triggers **name mangling**. Python renames it to \`_ClassName__name\`, so it is hard to access by accident and is not overridden by subclasses.

\`\`\`python
class Account:
    def __init__(self, balance):
        self._owner = "Asha"
        self.__balance = balance

    @property
    def balance(self):             # read access
        return self.__balance

    def deposit(self, amount):
        if amount > 0:
            self.__balance += amount

acc = Account(1000)
acc.deposit(500)
print(acc.balance)               # 1500
# print(acc.__balance)           # AttributeError
print(acc._Account__balance)     # 1500 - mangled name still works
\`\`\`

So Python follows "we are all consenting adults": it signals intent rather than enforcing strict privacy. Use \`@property\` to give controlled access with validation.`,
          tip: `Say clearly that Python has no true private members, then explain name mangling with the _Class__attr form.`,
        },
        {
          q: `What is the difference between class attributes and instance attributes?`,
          d: 'medium',
          at: `Infosys, TCS Digital`,
          a: `- A **class attribute** is defined in the class body and is **shared by all objects** of the class.
- An **instance attribute** is set on \`self\` (usually in \`__init__\`) and belongs to **one object only**.

\`\`\`python
class Student:
    college = "ABC Engineering"     # class attribute
    count = 0

    def __init__(self, name):
        self.name = name            # instance attribute
        Student.count += 1

a = Student("Asha")
b = Student("Ravi")
print(a.college, b.college)   # ABC Engineering ABC Engineering
print(Student.count)          # 2

a.college = "XYZ"             # creates an instance attribute on a only
print(a.college, b.college)   # XYZ ABC Engineering
\`\`\`

Lookup order: Python checks the object's own attributes first, then the class. Assigning through an object creates a new instance attribute that **shadows** the class one.

Trap: a **mutable** class attribute (like a list) is shared, so \`self.items.append(x)\` changes it for every object. Create lists in \`__init__\` instead.`,
          tip: `Mention the shared mutable class attribute trap; it is the follow-up interviewers like.`,
        },
      ],
    },
    {
      title: `Exceptions, files and advanced features`,
      questions: [
        {
          q: `Explain \`try\`, \`except\`, \`else\` and \`finally\`.`,
          d: 'easy',
          at: `TCS, Wipro, Cognizant`,
          a: `- \`try\`: code that might raise an error.
- \`except\`: runs **only if** a matching exception happens.
- \`else\`: runs **only if no** exception happened.
- \`finally\`: runs **always**, error or not. Used for clean-up like closing files or connections.

\`\`\`python
def divide(a, b):
    try:
        result = a / b
    except ZeroDivisionError:
        print("Cannot divide by zero")
    except TypeError as e:
        print("Bad input:", e)
    else:
        print("Result:", result)
    finally:
        print("Done")

divide(10, 2)
# Result: 5.0
# Done

divide(10, 0)
# Cannot divide by zero
# Done
\`\`\`

Good practice:
- Catch **specific** exceptions, not a bare \`except:\`, which hides real bugs.
- Keep the \`try\` block small; put the success code in \`else\`.
- Catch several types at once with a tuple: \`except (ValueError, KeyError):\`.

\`finally\` runs even if the \`try\` block has a \`return\` statement.`,
          tip: `Explain why else exists (code that should run only on success) and warn against a bare except.`,
        },
        {
          q: `How do you raise an exception and create a custom exception?`,
          d: 'medium',
          at: `Infosys, Accenture, Zoho`,
          a: `Use \`raise\` to signal an error yourself. Create a custom exception by **inheriting from \`Exception\`** (or a more specific built-in exception).

\`\`\`python
class InsufficientBalanceError(Exception):
    def __init__(self, balance, amount):
        self.balance = balance
        self.amount = amount
        super().__init__(f"Need {amount}, have only {balance}")

def withdraw(balance, amount):
    if amount <= 0:
        raise ValueError("Amount must be positive")
    if amount > balance:
        raise InsufficientBalanceError(balance, amount)
    return balance - amount

try:
    withdraw(500, 800)
except InsufficientBalanceError as e:
    print("Error:", e)      # Error: Need 800, have only 500
\`\`\`

Other useful forms:

\`\`\`python
try:
    int("abc")
except ValueError as e:
    raise RuntimeError("Config is broken") from e   # chain the cause

try:
    pass
except KeyError:
    raise          # re-raise the same exception
\`\`\`

Custom exceptions make errors meaningful for your domain and let callers catch exactly the failures they can handle.`,
          tip: `Inherit from Exception, not BaseException. Mentioning "raise ... from e" is a strong extra.`,
        },
        {
          q: `How do you read and write files in Python? What are the file modes?`,
          d: 'easy',
          at: `TCS, HCL, Capgemini`,
          a: `Use \`open(path, mode)\`, preferably inside a \`with\` block so the file closes automatically.

| Mode | Meaning |
|---|---|
| \`r\` | read (default); error if the file does not exist |
| \`w\` | write; creates the file or **erases** existing content |
| \`a\` | append to the end; creates if missing |
| \`x\` | create; error if it already exists |
| \`b\` | binary, e.g. \`rb\`, \`wb\` for images |
| \`+\` | read and write, e.g. \`r+\` |

\`\`\`python
with open("notes.txt", "w", encoding="utf-8") as f:
    print("line one", file=f)   # print adds the newline for you
    print("line two", file=f)

with open("notes.txt", "a", encoding="utf-8") as f:
    print("line three", file=f)

with open("notes.txt", encoding="utf-8") as f:
    for line in f:              # reads one line at a time
        print(line.strip())
\`\`\`

Reading methods: \`read()\` (whole file as one string), \`readline()\` (one line), \`readlines()\` (list of lines). Looping over the file object is the most memory-efficient way for large files.`,
          tip: `Stress that "w" wipes the file and that looping line by line is best for big files.`,
        },
        {
          q: `What is a context manager and how does the \`with\` statement work?`,
          d: 'medium',
          at: `Zoho, Freshworks, Infosys`,
          a: `A **context manager** sets something up before a block and **cleans it up afterwards, even if an error occurs**. The \`with\` statement uses it. It is an object with two methods:
- \`__enter__\`: runs at the start; its return value goes to the \`as\` variable.
- \`__exit__\`: runs at the end, always (it receives exception details, if any).

\`\`\`python
class Timer:
    def __enter__(self):
        import time
        self.start = time.time()
        return self
    def __exit__(self, exc_type, exc, tb):
        import time
        print(f"took {time.time() - self.start:.3f}s")
        return False      # False = do not hide exceptions

with Timer():
    total = sum(range(1000000))
# took 0.0xxs
\`\`\`

An easier way uses \`contextlib\`:

\`\`\`python
from contextlib import contextmanager

@contextmanager
def opened(path):
    f = open(path, "w")
    try:
        yield f           # body of the with block runs here
    finally:
        f.close()
\`\`\`

Common built-in uses: files (\`with open(...)\`), locks in threading, database connections and transactions.`,
          tip: `Name __enter__ and __exit__, and say the clean-up runs even when an exception is raised.`,
        },
        {
          q: `What are generators and the \`yield\` keyword? How are they different from normal functions?`,
          d: 'medium',
          at: `Amazon, Zoho, Infosys (SP)`,
          a: `A **generator** is a function that uses \`yield\` instead of (or along with) \`return\`. Calling it does not run the body; it returns a **generator object**. Each \`next()\` runs the code until the next \`yield\`, hands back that value, and **pauses**, remembering its state.

\`\`\`python
def count_up(n):
    i = 1
    while i <= n:
        yield i
        i += 1

g = count_up(3)
print(next(g))   # 1
print(next(g))   # 2
print(list(g))   # [3]  - rest of the values
\`\`\`

Why use them: values are produced **lazily, one at a time**, so memory stays tiny even for huge or infinite sequences.

\`\`\`python
squares_list = [x * x for x in range(1000000)]   # stores 1M items
squares_gen  = (x * x for x in range(1000000))   # generator expression
print(sum(squares_gen))
\`\`\`

| Normal function | Generator |
|---|---|
| \`return\` ends it for good | \`yield\` pauses and resumes |
| returns one value | produces a series of values |
| result held in memory | values made on demand |

A generator can be iterated **only once**; after that it is exhausted.`,
          tip: `Use the words lazy, pauses and keeps state. Compare list memory vs generator memory.`,
        },
        {
          q: `What is the difference between an iterable and an iterator?`,
          d: 'hard',
          at: `Zoho, Amazon, Freshworks`,
          a: `- An **iterable** is anything you can loop over. It has an \`__iter__()\` method that returns an iterator. Examples: list, tuple, string, dict, set, file.
- An **iterator** is the object that actually produces values one by one. It has \`__next__()\` (returns the next value, raises \`StopIteration\` at the end) and \`__iter__()\` (returns itself).

\`\`\`python
nums = [10, 20]           # iterable, not an iterator
it = iter(nums)           # get an iterator
print(next(it))           # 10
print(next(it))           # 20
# next(it)                # StopIteration
\`\`\`

A \`for\` loop does exactly this: it calls \`iter()\` once, then \`next()\` repeatedly until \`StopIteration\`.

A custom iterator:

\`\`\`python
class Countdown:
    def __init__(self, start):
        self.current = start
    def __iter__(self):
        return self
    def __next__(self):
        if self.current <= 0:
            raise StopIteration
        self.current -= 1
        return self.current + 1

print(list(Countdown(3)))   # [3, 2, 1]
\`\`\`

A list can be looped many times (each loop gets a fresh iterator); an iterator is used up after one pass. Every generator is an iterator.`,
          tip: `Explain how a for loop works using iter() and next(); that shows you know the protocol.`,
        },
        {
          q: `What is the GIL (Global Interpreter Lock)?`,
          d: 'hard',
          at: `Amazon, Zoho, product companies`,
          a: `The **GIL** is a lock inside **CPython** (the standard Python interpreter) that lets **only one thread run Python bytecode at a time**, even on a multi-core CPU.

In simple words: you can start many threads, but they take turns running Python code; they do not run Python code truly in parallel.

**Why it exists**: CPython manages memory with reference counting. The GIL keeps those counts safe without putting a lock on every object, which keeps single-threaded code fast and C extensions simple.

**Effect**:
- **CPU-bound** work (heavy maths, image processing) does **not** speed up with threads.
- **I/O-bound** work (network calls, file or database access) **does** benefit, because a thread releases the GIL while waiting for I/O.

\`\`\`python
# CPU-bound: use processes to use all cores
from multiprocessing import Pool

def square(n):
    return n * n

if __name__ == "__main__":
    with Pool(4) as p:
        print(p.map(square, [1, 2, 3, 4]))   # [1, 4, 9, 16]
\`\`\`

Workarounds: \`multiprocessing\`, libraries like NumPy that release the GIL in C code, or other interpreters. Python 3.13 added an optional experimental free-threaded build without the GIL.`,
          tip: `Say it in one line first, then split CPU-bound vs I/O-bound. That split is what interviewers check.`,
        },
        {
          q: `When would you use multithreading, multiprocessing or asyncio in Python?`,
          d: 'hard',
          at: `Amazon, Freshworks, startups`,
          a: `| | Threading | Multiprocessing | asyncio |
|---|---|---|---|
| Runs as | threads in one process | separate processes | one thread, event loop |
| Memory | shared | separate (data copied) | shared |
| Affected by GIL | Yes | No | Yes (single thread) |
| Best for | I/O-bound, few tasks | **CPU-bound** work | **many** I/O-bound tasks |

- **Threading**: waiting on files, APIs or databases with a moderate number of tasks.
- **Multiprocessing**: heavy computation; each process has its own interpreter and GIL, so all cores are used.
- **asyncio**: thousands of network connections (web scraping, chat servers) using \`async\`/\`await\`; cheap to switch between tasks.

\`\`\`python
import asyncio

async def fetch(n):
    await asyncio.sleep(1)      # stands in for a network call
    return n * 2

async def main():
    results = await asyncio.gather(*(fetch(i) for i in range(3)))
    print(results)              # [0, 2, 4] after about 1 second, not 3

asyncio.run(main())
\`\`\`

\`\`\`python
from concurrent.futures import ThreadPoolExecutor
with ThreadPoolExecutor(max_workers=5) as ex:
    print(list(ex.map(len, ["a", "bb", "ccc"])))   # [1, 2, 3]
\`\`\``,
          tip: `Rule of thumb: CPU-bound means processes; I/O-bound means threads or asyncio. Tie it back to the GIL.`,
        },
      ],
    },
  ],
};

export default book;
