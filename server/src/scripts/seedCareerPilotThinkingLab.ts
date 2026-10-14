/**
 * Seed the 30 CareerPilot Thinking Lab problems — the member's daily challenge sequence.
 *
 *   npx ts-node src/scripts/seedCareerPilotThinkingLab.ts <tenantId>            # dry run
 *   npx ts-node src/scripts/seedCareerPilotThinkingLab.ts <tenantId> --apply
 *
 * In production, against the compiled build:
 *   docker exec lms-server-<slot> node dist/scripts/seedCareerPilotThinkingLab.js <tenantId>
 *   docker exec lms-server-<slot> node dist/scripts/seedCareerPilotThinkingLab.js <tenantId> --apply
 *
 * WHAT THIS IS. A CareerPilot member has no batch, so the Thinking Lab used to have nothing to
 * give them. The controller now serves members the tenant's CareerPilot bank in `order`, one new
 * problem per day (services/thinkingLabMemberDaily.ts). These 30 are that bank: interview-style
 * thinking problems climbing from easy hashing to hard design (LRU cache, rate limiter).
 *
 * VERIFIED BEFORE IT WAS WRITTEN. Every problem's reference solution was run on every test case,
 * checked against an independent brute-force solution, and fuzzed on 300 random inputs. The
 * expected outputs below are the reference program's real output. Tests are stdin/stdout, so a
 * member can answer in Python, JavaScript, Java or C++.
 *
 * IDEMPOTENT. Matched on tenantId + title. A re-run updates the authored fields (statement, tests,
 * hints, order…) and leaves the counters (timesAssigned, timesSolved, attemptCount) and `active`
 * alone, so an admin who switched a problem off keeps it off. Nothing is ever deleted.
 *
 * Only `audiences: ['careerpilot']` — these never appear to LMS students.
 *
 * Plain mongoose + dotenv: no ts-node-only features, so the compiled dist/ file runs as is.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ThinkingProblem from '../models/ThinkingProblem';

dotenv.config();

interface SeedProblem {
  order: number;
  title: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  xp: number;
  estimatedMinutes: number;
  statement: string;
  constraints: string;
  hints: string[];
  expectedTimeComplexity: string;
  expectedSpaceComplexity: string;
  starterCode: string;
  referenceSolution: string;
  examples: { input: string; expectedOutput: string; explanation: string }[];
  testCases: { input: string; expectedOutput: string; hidden: boolean }[];
}

// Generated from the verified problem set — edit the source and re-verify rather than by hand.
export const PROBLEMS: SeedProblem[] = [
  {
    "order": 1,
    "title": "Two Sum Indices",
    "category": "Hashing",
    "difficulty": "easy",
    "xp": 50,
    "estimatedMinutes": 10,
    "statement": "You are given an array of n integers and a target value. Exactly one pair of different positions i < j has nums[i] + nums[j] == target. Print that pair of positions (0-based).\n\nThe slow way checks every pair. The thinking way: as you walk the array once, ask what partner value the current number needs, and whether you have already met it.\n\nInput\nLine 1: n target\nLine 2: n integers\n\nOutput\nTwo indices i j (i < j), separated by a space.\n\nWhat this trains: turning a \"search for a partner\" question into a constant-time lookup.",
    "constraints": "2 <= n <= 100000\n-10^9 <= nums[i], target <= 10^9\nExactly one valid pair exists.",
    "hints": [
      "For a number x, the partner you need is fully determined. Write down what it is.",
      "A loop inside a loop asks \"have I seen the partner?\" in O(n). Which data structure answers that question in O(1)?",
      "Walk left to right. Before storing the current value, check whether its partner is already stored, and remember each value's index as you go."
    ],
    "expectedTimeComplexity": "O(n)",
    "expectedSpaceComplexity": "O(n)",
    "starterCode": "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    n, target = int(data[0]), int(data[1])\n    nums = list(map(int, data[2:2 + n]))\n    # Find i < j with nums[i] + nums[j] == target and print \"i j\"\n\nmain()\n",
    "referenceSolution": "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    n, target = int(data[0]), int(data[1])\n    nums = list(map(int, data[2:2 + n]))\n    seen = {}\n    for j, x in enumerate(nums):\n        need = target - x\n        if need in seen:\n            print(seen[need], j)\n            return\n        if x not in seen:\n            seen[x] = j\n\nmain()\n",
    "examples": [
      {
        "input": "4 9\n2 7 11 15\n",
        "expectedOutput": "0 1",
        "explanation": "nums[0] + nums[1] = 2 + 7 = 9."
      },
      {
        "input": "3 6\n3 2 4\n",
        "expectedOutput": "1 2",
        "explanation": "2 + 4 = 6, at positions 1 and 2."
      },
      {
        "input": "2 6\n3 3\n",
        "expectedOutput": "0 1",
        "explanation": "The same value twice is fine — they are different positions."
      }
    ],
    "testCases": [
      {
        "input": "4 9\n2 7 11 15\n",
        "expectedOutput": "0 1",
        "hidden": false
      },
      {
        "input": "3 6\n3 2 4\n",
        "expectedOutput": "1 2",
        "hidden": false
      },
      {
        "input": "2 6\n3 3\n",
        "expectedOutput": "0 1",
        "hidden": false
      },
      {
        "input": "5 -8\n-3 -5 10 1 -2\n",
        "expectedOutput": "0 1",
        "hidden": true
      },
      {
        "input": "6 0\n4 -1 7 9 1 13\n",
        "expectedOutput": "1 4",
        "hidden": true
      },
      {
        "input": "4 2000000000\n1000000000 5 7 1000000000\n",
        "expectedOutput": "0 3",
        "hidden": true
      },
      {
        "input": "7 15\n1 2 3 4 5 6 9\n",
        "expectedOutput": "5 6",
        "hidden": true
      },
      {
        "input": "5 10\n9 8 7 6 1\n",
        "expectedOutput": "0 4",
        "hidden": true
      }
    ]
  },
  {
    "order": 2,
    "title": "First Unique Character",
    "category": "Hashing",
    "difficulty": "easy",
    "xp": 50,
    "estimatedMinutes": 10,
    "statement": "Given a string of lowercase letters, print the index of the first character that appears exactly once in the whole string. If no such character exists, print -1.\n\nReasoning to practise: you cannot know a character is unique until you have seen the whole string — so how many passes do you need, and what do you remember between them?\n\nInput\nOne line: the string s.\n\nOutput\nA single integer — the 0-based index, or -1.",
    "constraints": "1 <= |s| <= 100000\ns contains only 'a'-'z'.",
    "hints": [
      "Can you decide that s[0] is unique without looking at every other character?",
      "Separate the job into two passes: one to learn something about every character, one to answer.",
      "First pass: count how often each letter occurs. Second pass: walk the string in order and stop at the first letter whose count is 1."
    ],
    "expectedTimeComplexity": "O(n)",
    "expectedSpaceComplexity": "O(1) — at most 26 counters",
    "starterCode": "import sys\n\ndef main():\n    s = sys.stdin.read().strip()\n    # Print the index of the first character that occurs exactly once, or -1\n\nmain()\n",
    "referenceSolution": "import sys\nfrom collections import Counter\n\ndef main():\n    s = sys.stdin.read().strip()\n    count = Counter(s)\n    for i, ch in enumerate(s):\n        if count[ch] == 1:\n            print(i)\n            return\n    print(-1)\n\nmain()\n",
    "examples": [
      {
        "input": "leetcode\n",
        "expectedOutput": "0",
        "explanation": "'l' at index 0 never repeats."
      },
      {
        "input": "loveleetcode\n",
        "expectedOutput": "2",
        "explanation": "'l', 'o' and 'e' repeat; 'v' at index 2 is the first unique one."
      },
      {
        "input": "aabb\n",
        "expectedOutput": "-1",
        "explanation": "Every character repeats, so the answer is -1."
      }
    ],
    "testCases": [
      {
        "input": "leetcode\n",
        "expectedOutput": "0",
        "hidden": false
      },
      {
        "input": "loveleetcode\n",
        "expectedOutput": "2",
        "hidden": false
      },
      {
        "input": "aabb\n",
        "expectedOutput": "-1",
        "hidden": false
      },
      {
        "input": "z\n",
        "expectedOutput": "0",
        "hidden": true
      },
      {
        "input": "abcabcd\n",
        "expectedOutput": "6",
        "hidden": true
      },
      {
        "input": "aaaaaaaaab\n",
        "expectedOutput": "9",
        "hidden": true
      },
      {
        "input": "abacabad\n",
        "expectedOutput": "3",
        "hidden": true
      },
      {
        "input": "xxyyzzx\n",
        "expectedOutput": "-1",
        "hidden": true
      }
    ]
  },
  {
    "order": 3,
    "title": "Valid Anagram",
    "category": "Hashing",
    "difficulty": "easy",
    "xp": 50,
    "estimatedMinutes": 10,
    "statement": "Two words are anagrams when one can be rearranged into the other — same letters, same number of times each. Given two lowercase strings, print YES if they are anagrams and NO otherwise.\n\nReasoning to practise: what is the \"fingerprint\" of a word that ignores order but keeps counts?\n\nInput\nLine 1: s\nLine 2: t\n\nOutput\nYES or NO.",
    "constraints": "1 <= |s|, |t| <= 100000\nOnly 'a'-'z'.",
    "hints": [
      "If the lengths differ, can they ever be anagrams?",
      "Order does not matter, but how many times each letter appears does. What summary of a word keeps only that?",
      "Count the 26 letters of s, subtract the counts of t, and check every counter ends at zero (sorting both also works, in O(n log n))."
    ],
    "expectedTimeComplexity": "O(n)",
    "expectedSpaceComplexity": "O(1)",
    "starterCode": "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    s, t = data[0], data[1]\n    # Print YES if t is a rearrangement of s, otherwise NO\n\nmain()\n",
    "referenceSolution": "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    s, t = data[0], data[1]\n    if len(s) != len(t):\n        print(\"NO\")\n        return\n    count = [0] * 26\n    for a, b in zip(s, t):\n        count[ord(a) - 97] += 1\n        count[ord(b) - 97] -= 1\n    print(\"YES\" if all(c == 0 for c in count) else \"NO\")\n\nmain()\n",
    "examples": [
      {
        "input": "anagram\nnagaram\n",
        "expectedOutput": "YES",
        "explanation": "Both use a×3, n, g, r, m."
      },
      {
        "input": "rat\ncar\n",
        "expectedOutput": "NO",
        "explanation": "'t' in the first word has no match in the second."
      },
      {
        "input": "ab\nabc\n",
        "expectedOutput": "NO",
        "explanation": "Different lengths can never be anagrams."
      }
    ],
    "testCases": [
      {
        "input": "anagram\nnagaram\n",
        "expectedOutput": "YES",
        "hidden": false
      },
      {
        "input": "rat\ncar\n",
        "expectedOutput": "NO",
        "hidden": false
      },
      {
        "input": "ab\nabc\n",
        "expectedOutput": "NO",
        "hidden": false
      },
      {
        "input": "a\na\n",
        "expectedOutput": "YES",
        "hidden": true
      },
      {
        "input": "aabbcc\nabcabc\n",
        "expectedOutput": "YES",
        "hidden": true
      },
      {
        "input": "aabbcc\naabbcd\n",
        "expectedOutput": "NO",
        "hidden": true
      },
      {
        "input": "listen\nsilent\n",
        "expectedOutput": "YES",
        "hidden": true
      },
      {
        "input": "aaab\nabbb\n",
        "expectedOutput": "NO",
        "hidden": true
      }
    ]
  },
  {
    "order": 4,
    "title": "Valid Palindrome",
    "category": "Two Pointers",
    "difficulty": "easy",
    "xp": 50,
    "estimatedMinutes": 10,
    "statement": "A sentence is a palindrome if, after keeping only letters and digits and ignoring upper/lower case, it reads the same forwards and backwards. Print YES or NO.\n\nReasoning to practise: compare from both ends at once and decide what to skip, instead of building a cleaned copy.\n\nInput\nOne line of text (may contain spaces and punctuation).\n\nOutput\nYES or NO.",
    "constraints": "0 <= length <= 100000\nPrintable ASCII characters.\nA line with no letters or digits counts as a palindrome.",
    "hints": [
      "Which characters matter, and which should be skipped entirely?",
      "Put one finger at the start and one at the end. When is it safe to move each finger inward?",
      "Advance the left pointer past non-alphanumerics, move the right pointer back the same way, compare lowercase characters, and stop at the first mismatch."
    ],
    "expectedTimeComplexity": "O(n)",
    "expectedSpaceComplexity": "O(1)",
    "starterCode": "import sys\n\ndef main():\n    line = sys.stdin.read().rstrip('\\n')\n    # Print YES if the letters and digits read the same both ways (ignoring case), else NO\n\nmain()\n",
    "referenceSolution": "import sys\n\ndef main():\n    s = sys.stdin.read().rstrip('\\n')\n    i, j = 0, len(s) - 1\n    while i < j:\n        if not s[i].isalnum():\n            i += 1\n        elif not s[j].isalnum():\n            j -= 1\n        elif s[i].lower() != s[j].lower():\n            print(\"NO\")\n            return\n        else:\n            i += 1\n            j -= 1\n    print(\"YES\")\n\nmain()\n",
    "examples": [
      {
        "input": "A man, a plan, a canal: Panama\n",
        "expectedOutput": "YES",
        "explanation": "Keeping letters only: amanaplanacanalpanama — the same both ways."
      },
      {
        "input": "race a car\n",
        "expectedOutput": "NO",
        "explanation": "raceacar is not the same reversed."
      },
      {
        "input": "No 'x' in Nixon\n",
        "expectedOutput": "YES",
        "explanation": "noxinnixon reversed is noxinnixon."
      }
    ],
    "testCases": [
      {
        "input": "A man, a plan, a canal: Panama\n",
        "expectedOutput": "YES",
        "hidden": false
      },
      {
        "input": "race a car\n",
        "expectedOutput": "NO",
        "hidden": false
      },
      {
        "input": "No 'x' in Nixon\n",
        "expectedOutput": "YES",
        "hidden": false
      },
      {
        "input": ",.;!\n",
        "expectedOutput": "YES",
        "hidden": true
      },
      {
        "input": "0P\n",
        "expectedOutput": "NO",
        "hidden": true
      },
      {
        "input": "ab2ba\n",
        "expectedOutput": "YES",
        "hidden": true
      },
      {
        "input": "Was it a car or a cat I saw?\n",
        "expectedOutput": "YES",
        "hidden": true
      },
      {
        "input": "abca\n",
        "expectedOutput": "NO",
        "hidden": true
      }
    ]
  },
  {
    "order": 5,
    "title": "Remove Duplicates from Sorted Array",
    "category": "Two Pointers",
    "difficulty": "easy",
    "xp": 50,
    "estimatedMinutes": 12,
    "statement": "You are given a sorted array. Remove the duplicates in place so each value appears once, keeping the original order. Print how many unique values there are (k), and then those k values.\n\nReasoning to practise: a slow \"write\" pointer and a fast \"read\" pointer moving through the same array.\n\nInput\nLine 1: n\nLine 2: n integers in non-decreasing order\n\nOutput\nLine 1: k\nLine 2: the k unique values, space-separated",
    "constraints": "1 <= n <= 100000\n-10^9 <= nums[i] <= 10^9\nnums is sorted in non-decreasing order.",
    "hints": [
      "Because the array is sorted, where can a duplicate of a value possibly be?",
      "Keep two positions: one reading every element, one marking where the next unique value should be written.",
      "Write nums[read] to nums[write] only when it differs from the last value written; k is the final write position."
    ],
    "expectedTimeComplexity": "O(n)",
    "expectedSpaceComplexity": "O(1) extra",
    "starterCode": "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    n = int(data[0])\n    nums = list(map(int, data[1:1 + n]))\n    # Print k, then the k unique values on the next line\n\nmain()\n",
    "referenceSolution": "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    n = int(data[0])\n    nums = list(map(int, data[1:1 + n]))\n    write = 1\n    for read in range(1, n):\n        if nums[read] != nums[write - 1]:\n            nums[write] = nums[read]\n            write += 1\n    print(write)\n    print(\" \".join(map(str, nums[:write])))\n\nmain()\n",
    "examples": [
      {
        "input": "3\n1 1 2\n",
        "expectedOutput": "2\n1 2",
        "explanation": "Two unique values remain: 1 and 2."
      },
      {
        "input": "10\n0 0 1 1 1 2 2 3 3 4\n",
        "expectedOutput": "5\n0 1 2 3 4",
        "explanation": "Five unique values."
      },
      {
        "input": "1\n7\n",
        "expectedOutput": "1\n7",
        "explanation": "A single element is already unique."
      }
    ],
    "testCases": [
      {
        "input": "3\n1 1 2\n",
        "expectedOutput": "2\n1 2",
        "hidden": false
      },
      {
        "input": "10\n0 0 1 1 1 2 2 3 3 4\n",
        "expectedOutput": "5\n0 1 2 3 4",
        "hidden": false
      },
      {
        "input": "1\n7\n",
        "expectedOutput": "1\n7",
        "hidden": false
      },
      {
        "input": "5\n4 4 4 4 4\n",
        "expectedOutput": "1\n4",
        "hidden": true
      },
      {
        "input": "6\n-3 -1 0 2 5 9\n",
        "expectedOutput": "6\n-3 -1 0 2 5 9",
        "hidden": true
      },
      {
        "input": "8\n-5 -5 -5 0 0 1000000000 1000000000 1000000000\n",
        "expectedOutput": "3\n-5 0 1000000000",
        "hidden": true
      },
      {
        "input": "2\n1 2\n",
        "expectedOutput": "2\n1 2",
        "hidden": true
      }
    ]
  },
  {
    "order": 6,
    "title": "Best Time to Buy and Sell Stock",
    "category": "Greedy",
    "difficulty": "easy",
    "xp": 50,
    "estimatedMinutes": 12,
    "statement": "prices[i] is a stock's price on day i. You may buy on one day and sell on a LATER day, once. Print the maximum profit you can make, or 0 if no profitable trade exists.\n\nReasoning to practise: for each possible selling day, what single fact about the past do you need?\n\nInput\nLine 1: n\nLine 2: n prices\n\nOutput\nThe maximum profit.",
    "constraints": "1 <= n <= 100000\n0 <= prices[i] <= 10^9",
    "hints": [
      "Fix the day you sell. Which buying day would you want?",
      "You never need the whole past — only one number from it, updated as you walk forward.",
      "Track the minimum price seen so far; at each day compare price - minSoFar with the best profit."
    ],
    "expectedTimeComplexity": "O(n)",
    "expectedSpaceComplexity": "O(1)",
    "starterCode": "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    n = int(data[0])\n    prices = list(map(int, data[1:1 + n]))\n    # Print the best profit from one buy followed by one later sell (0 if none)\n\nmain()\n",
    "referenceSolution": "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    n = int(data[0])\n    prices = list(map(int, data[1:1 + n]))\n    lowest = prices[0]\n    best = 0\n    for p in prices[1:]:\n        best = max(best, p - lowest)\n        lowest = min(lowest, p)\n    print(best)\n\nmain()\n",
    "examples": [
      {
        "input": "6\n7 1 5 3 6 4\n",
        "expectedOutput": "5",
        "explanation": "Buy at 1 (day 1), sell at 6 (day 4): profit 5."
      },
      {
        "input": "5\n7 6 4 3 1\n",
        "expectedOutput": "0",
        "explanation": "Prices only fall, so do not trade: 0."
      },
      {
        "input": "2\n1 2\n",
        "expectedOutput": "1",
        "explanation": "Buy at 1, sell at 2."
      }
    ],
    "testCases": [
      {
        "input": "6\n7 1 5 3 6 4\n",
        "expectedOutput": "5",
        "hidden": false
      },
      {
        "input": "5\n7 6 4 3 1\n",
        "expectedOutput": "0",
        "hidden": false
      },
      {
        "input": "2\n1 2\n",
        "expectedOutput": "1",
        "hidden": false
      },
      {
        "input": "1\n5\n",
        "expectedOutput": "0",
        "hidden": true
      },
      {
        "input": "7\n3 8 1 2 9 0 4\n",
        "expectedOutput": "8",
        "hidden": true
      },
      {
        "input": "4\n1000000000 0 1000000000 0\n",
        "expectedOutput": "1000000000",
        "hidden": true
      },
      {
        "input": "6\n2 4 1 7 5 11\n",
        "expectedOutput": "10",
        "hidden": true
      }
    ]
  },
  {
    "order": 7,
    "title": "Balanced Brackets",
    "category": "Stacks",
    "difficulty": "easy",
    "xp": 50,
    "estimatedMinutes": 12,
    "statement": "A string of brackets ()[]{} is balanced when every opening bracket is closed by the same type, in the right order. Print YES if the string is balanced, NO otherwise.\n\nReasoning to practise: when a closing bracket arrives, which opening bracket must it match — and what structure always hands you that one?\n\nInput\nOne line: the bracket string.\n\nOutput\nYES or NO.",
    "constraints": "1 <= |s| <= 100000\ns contains only ()[]{}",
    "hints": [
      "Counting opens and closes is not enough — try \"([)]\". What extra information do you need?",
      "The bracket that must close next is always the most recently opened one that is still open.",
      "Push every opening bracket; on a closing bracket the stack must be non-empty and its top must be the matching opener. At the end the stack must be empty."
    ],
    "expectedTimeComplexity": "O(n)",
    "expectedSpaceComplexity": "O(n)",
    "starterCode": "import sys\n\ndef main():\n    s = sys.stdin.read().strip()\n    # Print YES if every bracket is closed in the right order, otherwise NO\n\nmain()\n",
    "referenceSolution": "import sys\n\ndef main():\n    s = sys.stdin.read().strip()\n    pair = {')': '(', ']': '[', '}': '{'}\n    stack = []\n    for ch in s:\n        if ch in '([{':\n            stack.append(ch)\n        else:\n            if not stack or stack[-1] != pair[ch]:\n                print(\"NO\")\n                return\n            stack.pop()\n    print(\"YES\" if not stack else \"NO\")\n\nmain()\n",
    "examples": [
      {
        "input": "()[]{}\n",
        "expectedOutput": "YES",
        "explanation": "Each pair closes immediately."
      },
      {
        "input": "([)]\n",
        "expectedOutput": "NO",
        "explanation": "']' arrives while '(' is the most recent open bracket."
      },
      {
        "input": "{[]}\n",
        "expectedOutput": "YES",
        "explanation": "Properly nested."
      }
    ],
    "testCases": [
      {
        "input": "()[]{}\n",
        "expectedOutput": "YES",
        "hidden": false
      },
      {
        "input": "([)]\n",
        "expectedOutput": "NO",
        "hidden": false
      },
      {
        "input": "{[]}\n",
        "expectedOutput": "YES",
        "hidden": false
      },
      {
        "input": "(\n",
        "expectedOutput": "NO",
        "hidden": true
      },
      {
        "input": ")(\n",
        "expectedOutput": "NO",
        "hidden": true
      },
      {
        "input": "((({{{[[[]]]}}})))\n",
        "expectedOutput": "YES",
        "hidden": true
      },
      {
        "input": "([]{}){[()]}\n",
        "expectedOutput": "YES",
        "hidden": true
      },
      {
        "input": "(((\n",
        "expectedOutput": "NO",
        "hidden": true
      }
    ]
  },
  {
    "order": 8,
    "title": "Maximum Sum of K Consecutive Days",
    "category": "Sliding Window",
    "difficulty": "easy",
    "xp": 50,
    "estimatedMinutes": 12,
    "statement": "A shop logged its profit (possibly negative) for n days. Find the best run of exactly k consecutive days — the one with the largest total — and print that total.\n\nReasoning to practise: when the window slides one day forward, what changes? Only two numbers.\n\nInput\nLine 1: n k\nLine 2: n integers\n\nOutput\nThe maximum sum of any k consecutive values.",
    "constraints": "1 <= k <= n <= 100000\n-10^4 <= a[i] <= 10^4",
    "hints": [
      "Summing every window from scratch costs O(n·k). What work is repeated between neighbouring windows?",
      "Moving the window by one day adds one value and removes one value.",
      "Sum the first k values, then for i from k to n-1 add a[i], subtract a[i-k], and keep the best total."
    ],
    "expectedTimeComplexity": "O(n)",
    "expectedSpaceComplexity": "O(1)",
    "starterCode": "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    n, k = int(data[0]), int(data[1])\n    a = list(map(int, data[2:2 + n]))\n    # Print the largest sum of k consecutive values\n\nmain()\n",
    "referenceSolution": "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    n, k = int(data[0]), int(data[1])\n    a = list(map(int, data[2:2 + n]))\n    window = sum(a[:k])\n    best = window\n    for i in range(k, n):\n        window += a[i] - a[i - k]\n        best = max(best, window)\n    print(best)\n\nmain()\n",
    "examples": [
      {
        "input": "6 3\n2 1 5 1 3 2\n",
        "expectedOutput": "9",
        "explanation": "Days 2-4: 5 + 1 + 3 = 9."
      },
      {
        "input": "5 2\n-1 -2 -3 -4 -5\n",
        "expectedOutput": "-3",
        "explanation": "All negative: the best pair is -1 + -2 = -3."
      },
      {
        "input": "4 4\n1 2 3 4\n",
        "expectedOutput": "10",
        "explanation": "k = n, so the only window is the whole array."
      }
    ],
    "testCases": [
      {
        "input": "6 3\n2 1 5 1 3 2\n",
        "expectedOutput": "9",
        "hidden": false
      },
      {
        "input": "5 2\n-1 -2 -3 -4 -5\n",
        "expectedOutput": "-3",
        "hidden": false
      },
      {
        "input": "4 4\n1 2 3 4\n",
        "expectedOutput": "10",
        "hidden": false
      },
      {
        "input": "1 1\n-7\n",
        "expectedOutput": "-7",
        "hidden": true
      },
      {
        "input": "8 3\n4 -1 -2 10 -3 5 -10 6\n",
        "expectedOutput": "12",
        "hidden": true
      },
      {
        "input": "6 1\n3 -5 9 2 9 -1\n",
        "expectedOutput": "9",
        "hidden": true
      },
      {
        "input": "7 5\n10000 10000 10000 10000 10000 -10000 10000\n",
        "expectedOutput": "50000",
        "hidden": true
      }
    ]
  },
  {
    "order": 9,
    "title": "Merge Two Sorted Lists",
    "category": "Linked Lists",
    "difficulty": "easy",
    "xp": 50,
    "estimatedMinutes": 15,
    "statement": "Two singly linked lists are each sorted in non-decreasing order. Merge them into one sorted list and print its values.\n\nTreat them as linked lists: at any moment you may only look at the current head of each list. Reasoning to practise: which of the two heads can safely be placed next?\n\nInput\nLine 1: n, followed by the n values of the first list (n may be 0)\nLine 2: m, followed by the m values of the second list (m may be 0)\n\nOutput\nThe merged values, space-separated.",
    "constraints": "0 <= n, m <= 50000, n + m >= 1\n-10^9 <= value <= 10^9\nBoth lists are sorted.",
    "hints": [
      "Of all remaining values, the smallest must be at one of the two heads. Why?",
      "Repeatedly take the smaller head and advance only that list. What happens when one list runs out?",
      "Use a dummy head and a tail pointer; attach the smaller node each step, then attach whatever remains of the other list in one go."
    ],
    "expectedTimeComplexity": "O(n + m)",
    "expectedSpaceComplexity": "O(1) extra (relinking nodes)",
    "starterCode": "import sys\n\ndef main():\n    data = list(map(int, sys.stdin.read().split()))\n    n = data[0]\n    a = data[1:1 + n]\n    m = data[1 + n]\n    b = data[2 + n:2 + n + m]\n    # Print the merged sorted list, space-separated\n\nmain()\n",
    "referenceSolution": "import sys\n\nclass Node:\n    def __init__(self, val, nxt=None):\n        self.val, self.next = val, nxt\n\ndef build(values):\n    head = None\n    for v in reversed(values):\n        head = Node(v, head)\n    return head\n\ndef main():\n    data = list(map(int, sys.stdin.read().split()))\n    n = data[0]\n    a = build(data[1:1 + n])\n    m = data[1 + n]\n    b = build(data[2 + n:2 + n + m])\n    dummy = tail = Node(0)\n    while a and b:\n        if a.val <= b.val:\n            tail.next, a = a, a.next\n        else:\n            tail.next, b = b, b.next\n        tail = tail.next\n    tail.next = a or b\n    out = []\n    node = dummy.next\n    while node:\n        out.append(node.val)\n        node = node.next\n    print(\" \".join(map(str, out)))\n\nmain()\n",
    "examples": [
      {
        "input": "3 1 2 4\n3 1 3 4\n",
        "expectedOutput": "1 1 2 3 4 4",
        "explanation": "Taking the smaller head each time gives 1 1 2 3 4 4."
      },
      {
        "input": "0\n2 0 5\n",
        "expectedOutput": "0 5",
        "explanation": "The first list is empty; the result is the second list."
      },
      {
        "input": "1 -1\n0\n",
        "expectedOutput": "-1",
        "explanation": "The second list is empty."
      }
    ],
    "testCases": [
      {
        "input": "3 1 2 4\n3 1 3 4\n",
        "expectedOutput": "1 1 2 3 4 4",
        "hidden": false
      },
      {
        "input": "0\n2 0 5\n",
        "expectedOutput": "0 5",
        "hidden": false
      },
      {
        "input": "1 -1\n0\n",
        "expectedOutput": "-1",
        "hidden": false
      },
      {
        "input": "4 1 1 1 1\n2 1 1\n",
        "expectedOutput": "1 1 1 1 1 1",
        "hidden": true
      },
      {
        "input": "3 -10 -5 0\n4 -7 -6 100 200\n",
        "expectedOutput": "-10 -7 -6 -5 0 100 200",
        "hidden": true
      },
      {
        "input": "5 1 3 5 7 9\n5 2 4 6 8 10\n",
        "expectedOutput": "1 2 3 4 5 6 7 8 9 10",
        "hidden": true
      },
      {
        "input": "2 1000000000 1000000000\n1 -1000000000\n",
        "expectedOutput": "-1000000000 1000000000 1000000000",
        "hidden": true
      }
    ]
  },
  {
    "order": 10,
    "title": "First and Last Position",
    "category": "Binary Search",
    "difficulty": "medium",
    "xp": 70,
    "estimatedMinutes": 15,
    "statement": "Given a sorted array and a target, print the first and last index at which the target appears. If it does not appear, print -1 -1.\n\nScanning is O(n). Reasoning to practise: binary search that does not stop at the first match, but keeps narrowing toward a boundary.\n\nInput\nLine 1: n target\nLine 2: n integers in non-decreasing order (the line is empty when n = 0)\n\nOutput\nfirst last",
    "constraints": "0 <= n <= 100000\n-10^9 <= values, target <= 10^9\nAim for O(log n).",
    "hints": [
      "A normal binary search finds SOME occurrence. What question would find the leftmost one?",
      "Search for a boundary: the first index whose value is >= target. A similar boundary gives the end.",
      "first = lowerBound(target); last = lowerBound(target + 1) - 1. If first == n or a[first] != target, the answer is -1 -1."
    ],
    "expectedTimeComplexity": "O(log n)",
    "expectedSpaceComplexity": "O(1)",
    "starterCode": "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    n, target = int(data[0]), int(data[1])\n    a = list(map(int, data[2:2 + n]))\n    # Print the first and last index of target, or -1 -1\n\nmain()\n",
    "referenceSolution": "import sys\n\ndef lower_bound(a, x):\n    lo, hi = 0, len(a)\n    while lo < hi:\n        mid = (lo + hi) // 2\n        if a[mid] < x:\n            lo = mid + 1\n        else:\n            hi = mid\n    return lo\n\ndef main():\n    data = sys.stdin.read().split()\n    n, target = int(data[0]), int(data[1])\n    a = list(map(int, data[2:2 + n]))\n    first = lower_bound(a, target)\n    if first == n or a[first] != target:\n        print(-1, -1)\n        return\n    print(first, lower_bound(a, target + 1) - 1)\n\nmain()\n",
    "examples": [
      {
        "input": "6 8\n5 7 7 8 8 10\n",
        "expectedOutput": "3 4",
        "explanation": "8 sits at indices 3 and 4."
      },
      {
        "input": "6 6\n5 7 7 8 8 10\n",
        "expectedOutput": "-1 -1",
        "explanation": "6 is not present."
      },
      {
        "input": "0 0\n\n",
        "expectedOutput": "-1 -1",
        "explanation": "An empty array contains nothing."
      }
    ],
    "testCases": [
      {
        "input": "6 8\n5 7 7 8 8 10\n",
        "expectedOutput": "3 4",
        "hidden": false
      },
      {
        "input": "6 6\n5 7 7 8 8 10\n",
        "expectedOutput": "-1 -1",
        "hidden": false
      },
      {
        "input": "0 0\n\n",
        "expectedOutput": "-1 -1",
        "hidden": false
      },
      {
        "input": "1 4\n4\n",
        "expectedOutput": "0 0",
        "hidden": true
      },
      {
        "input": "7 2\n2 2 2 2 2 2 2\n",
        "expectedOutput": "0 6",
        "hidden": true
      },
      {
        "input": "5 11\n1 3 5 7 9\n",
        "expectedOutput": "-1 -1",
        "hidden": true
      },
      {
        "input": "5 -1\n1 3 5 7 9\n",
        "expectedOutput": "-1 -1",
        "hidden": true
      },
      {
        "input": "8 5\n1 2 3 4 5 6 7 8\n",
        "expectedOutput": "4 4",
        "hidden": true
      }
    ]
  },
  {
    "order": 11,
    "title": "Longest Substring Without Repeats",
    "category": "Sliding Window",
    "difficulty": "medium",
    "xp": 70,
    "estimatedMinutes": 20,
    "statement": "Given a string, find the length of the longest contiguous substring in which no character repeats.\n\nReasoning to practise: a window that grows on the right and shrinks on the left only when a rule is broken — never restarting from scratch.\n\nInput\nOne line: the string s (no spaces).\n\nOutput\nThe length of the longest substring with all distinct characters.",
    "constraints": "1 <= |s| <= 100000\ns contains printable ASCII characters other than space.",
    "hints": [
      "Checking every substring is O(n^2) or worse. When a repeat appears, do you really need to start over?",
      "Keep a window [left, right] with no repeats. When s[right] is already inside, how far must left jump?",
      "Remember the last index of each character. On a repeat, move left to max(left, lastIndex + 1); the answer is the largest right - left + 1."
    ],
    "expectedTimeComplexity": "O(n)",
    "expectedSpaceComplexity": "O(min(n, alphabet))",
    "starterCode": "import sys\n\ndef main():\n    s = sys.stdin.read().strip()\n    # Print the length of the longest substring with no repeated character\n\nmain()\n",
    "referenceSolution": "import sys\n\ndef main():\n    s = sys.stdin.read().strip()\n    last = {}\n    left = 0\n    best = 0\n    for right, ch in enumerate(s):\n        if ch in last and last[ch] >= left:\n            left = last[ch] + 1\n        last[ch] = right\n        best = max(best, right - left + 1)\n    print(best)\n\nmain()\n",
    "examples": [
      {
        "input": "abcabcbb\n",
        "expectedOutput": "3",
        "explanation": "\"abc\" has length 3."
      },
      {
        "input": "bbbbb\n",
        "expectedOutput": "1",
        "explanation": "Only \"b\" — length 1."
      },
      {
        "input": "pwwkew\n",
        "expectedOutput": "3",
        "explanation": "\"wke\" has length 3 (\"pwke\" is not contiguous)."
      }
    ],
    "testCases": [
      {
        "input": "abcabcbb\n",
        "expectedOutput": "3",
        "hidden": false
      },
      {
        "input": "bbbbb\n",
        "expectedOutput": "1",
        "hidden": false
      },
      {
        "input": "pwwkew\n",
        "expectedOutput": "3",
        "hidden": false
      },
      {
        "input": "a\n",
        "expectedOutput": "1",
        "hidden": true
      },
      {
        "input": "abba\n",
        "expectedOutput": "2",
        "hidden": true
      },
      {
        "input": "dvdf\n",
        "expectedOutput": "3",
        "hidden": true
      },
      {
        "input": "abcdefghijklmnopqrstuvwxyz\n",
        "expectedOutput": "26",
        "hidden": true
      },
      {
        "input": "tmmzuxt\n",
        "expectedOutput": "5",
        "hidden": true
      }
    ]
  },
  {
    "order": 12,
    "title": "Subarray Sum Equals K",
    "category": "Hashing",
    "difficulty": "medium",
    "xp": 70,
    "estimatedMinutes": 20,
    "statement": "Count the contiguous subarrays whose elements add up to exactly k. Values can be negative, so a sliding window will not work.\n\nReasoning to practise: a subarray sum is the difference of two prefix sums — so \"how many subarrays end here?\" becomes \"how many earlier prefixes had a particular value?\".\n\nInput\nLine 1: n k\nLine 2: n integers\n\nOutput\nThe number of subarrays with sum k.",
    "constraints": "1 <= n <= 100000\n-1000 <= a[i] <= 1000\n-10^7 <= k <= 10^7",
    "hints": [
      "Write the sum of a[i..j] using prefix sums P. What equation must hold?",
      "For a fixed end j you need the number of earlier prefixes equal to P[j] - k. How can you know that instantly?",
      "Keep a hash map from prefix sum to how many times it has occurred (start with {0: 1}); at each step add map[P - k] to the answer, then record P."
    ],
    "expectedTimeComplexity": "O(n)",
    "expectedSpaceComplexity": "O(n)",
    "starterCode": "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    n, k = int(data[0]), int(data[1])\n    a = list(map(int, data[2:2 + n]))\n    # Print how many contiguous subarrays sum to k\n\nmain()\n",
    "referenceSolution": "import sys\nfrom collections import defaultdict\n\ndef main():\n    data = sys.stdin.read().split()\n    n, k = int(data[0]), int(data[1])\n    a = list(map(int, data[2:2 + n]))\n    seen = defaultdict(int)\n    seen[0] = 1\n    prefix = 0\n    count = 0\n    for x in a:\n        prefix += x\n        count += seen[prefix - k]\n        seen[prefix] += 1\n    print(count)\n\nmain()\n",
    "examples": [
      {
        "input": "3 2\n1 1 1\n",
        "expectedOutput": "2",
        "explanation": "[1,1] at positions 0-1 and 1-2."
      },
      {
        "input": "3 3\n1 2 3\n",
        "expectedOutput": "2",
        "explanation": "[1,2] and [3]."
      },
      {
        "input": "5 0\n1 -1 1 -1 1\n",
        "expectedOutput": "6",
        "explanation": "Six subarrays sum to 0, e.g. [1,-1], [-1,1], [1,-1,1,-1]..."
      }
    ],
    "testCases": [
      {
        "input": "3 2\n1 1 1\n",
        "expectedOutput": "2",
        "hidden": false
      },
      {
        "input": "3 3\n1 2 3\n",
        "expectedOutput": "2",
        "hidden": false
      },
      {
        "input": "5 0\n1 -1 1 -1 1\n",
        "expectedOutput": "6",
        "hidden": false
      },
      {
        "input": "1 5\n5\n",
        "expectedOutput": "1",
        "hidden": true
      },
      {
        "input": "4 0\n0 0 0 0\n",
        "expectedOutput": "10",
        "hidden": true
      },
      {
        "input": "6 7\n3 4 7 2 -3 1\n",
        "expectedOutput": "3",
        "hidden": true
      },
      {
        "input": "5 -2\n-1 -1 2 -2 0\n",
        "expectedOutput": "5",
        "hidden": true
      },
      {
        "input": "3 100\n1 2 3\n",
        "expectedOutput": "0",
        "hidden": true
      }
    ]
  },
  {
    "order": 13,
    "title": "Container With Most Water",
    "category": "Two Pointers",
    "difficulty": "medium",
    "xp": 70,
    "estimatedMinutes": 20,
    "statement": "n vertical lines stand at positions 0..n-1 with heights h[i]. Two lines plus the x-axis form a container; it holds min(h[i], h[j]) * (j - i) units of water. Print the largest amount any container can hold.\n\nReasoning to practise: start with the widest container and argue which side can never be part of a better answer.\n\nInput\nLine 1: n\nLine 2: n heights\n\nOutput\nThe maximum area.",
    "constraints": "2 <= n <= 100000\n0 <= h[i] <= 10000",
    "hints": [
      "Start with the two outermost lines. If you move one inward the width shrinks — what must improve to compensate?",
      "The water level is set by the SHORTER line. Could keeping the shorter line and moving the taller one ever help?",
      "Two pointers at both ends: record the area, then always move the pointer at the shorter line inward, until they meet."
    ],
    "expectedTimeComplexity": "O(n)",
    "expectedSpaceComplexity": "O(1)",
    "starterCode": "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    n = int(data[0])\n    h = list(map(int, data[1:1 + n]))\n    # Print the most water two lines can hold\n\nmain()\n",
    "referenceSolution": "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    n = int(data[0])\n    h = list(map(int, data[1:1 + n]))\n    i, j = 0, n - 1\n    best = 0\n    while i < j:\n        best = max(best, min(h[i], h[j]) * (j - i))\n        if h[i] < h[j]:\n            i += 1\n        else:\n            j -= 1\n    print(best)\n\nmain()\n",
    "examples": [
      {
        "input": "9\n1 8 6 2 5 4 8 3 7\n",
        "expectedOutput": "49",
        "explanation": "Lines at 1 (height 8) and 8 (height 7): 7 * 7 = 49."
      },
      {
        "input": "2\n1 1\n",
        "expectedOutput": "1",
        "explanation": "Only one container: 1 * 1."
      },
      {
        "input": "5\n4 3 2 1 4\n",
        "expectedOutput": "16",
        "explanation": "The two 4s at the ends: 4 * 4 = 16."
      }
    ],
    "testCases": [
      {
        "input": "9\n1 8 6 2 5 4 8 3 7\n",
        "expectedOutput": "49",
        "hidden": false
      },
      {
        "input": "2\n1 1\n",
        "expectedOutput": "1",
        "hidden": false
      },
      {
        "input": "5\n4 3 2 1 4\n",
        "expectedOutput": "16",
        "hidden": false
      },
      {
        "input": "2\n0 10000\n",
        "expectedOutput": "0",
        "hidden": true
      },
      {
        "input": "6\n1 2 4 3 2 1\n",
        "expectedOutput": "6",
        "hidden": true
      },
      {
        "input": "7\n2 3 10 5 7 8 9\n",
        "expectedOutput": "36",
        "hidden": true
      },
      {
        "input": "4\n10000 10000 10000 10000\n",
        "expectedOutput": "30000",
        "hidden": true
      }
    ]
  },
  {
    "order": 14,
    "title": "Next Greater Element",
    "category": "Stacks",
    "difficulty": "medium",
    "xp": 70,
    "estimatedMinutes": 20,
    "statement": "For every element of an array, print the first element to its RIGHT that is strictly greater. If there is none, print -1 for that position.\n\nReasoning to practise: a monotonic stack — keep only the elements that are still waiting for their answer.\n\nInput\nLine 1: n\nLine 2: n integers\n\nOutput\nn integers, space-separated.",
    "constraints": "1 <= n <= 100000\n-10^9 <= a[i] <= 10^9",
    "hints": [
      "For each element you could scan right until something bigger appears — O(n^2). Which elements are still waiting at any moment?",
      "If a new value is bigger than some waiting elements, it is the answer for all of them at once. What order are the waiting elements in?",
      "Keep a stack of indices with decreasing values. For each new value, pop every smaller one and set its answer to the new value, then push the new index; leftovers get -1."
    ],
    "expectedTimeComplexity": "O(n)",
    "expectedSpaceComplexity": "O(n)",
    "starterCode": "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    n = int(data[0])\n    a = list(map(int, data[1:1 + n]))\n    # Print, for each element, the next strictly greater element to its right (or -1)\n\nmain()\n",
    "referenceSolution": "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    n = int(data[0])\n    a = list(map(int, data[1:1 + n]))\n    ans = [-1] * n\n    stack = []\n    for i, x in enumerate(a):\n        while stack and a[stack[-1]] < x:\n            ans[stack.pop()] = x\n        stack.append(i)\n    print(\" \".join(map(str, ans)))\n\nmain()\n",
    "examples": [
      {
        "input": "4\n4 5 2 25\n",
        "expectedOutput": "5 25 25 -1",
        "explanation": "4 -> 5, 5 -> 25, 2 -> 25, 25 has nothing to its right."
      },
      {
        "input": "4\n13 7 6 12\n",
        "expectedOutput": "-1 12 12 -1",
        "explanation": "13 has no greater element; 7 and 6 both find 12."
      },
      {
        "input": "1\n9\n",
        "expectedOutput": "-1",
        "explanation": "A single element has no right side."
      }
    ],
    "testCases": [
      {
        "input": "4\n4 5 2 25\n",
        "expectedOutput": "5 25 25 -1",
        "hidden": false
      },
      {
        "input": "4\n13 7 6 12\n",
        "expectedOutput": "-1 12 12 -1",
        "hidden": false
      },
      {
        "input": "1\n9\n",
        "expectedOutput": "-1",
        "hidden": false
      },
      {
        "input": "5\n5 4 3 2 1\n",
        "expectedOutput": "-1 -1 -1 -1 -1",
        "hidden": true
      },
      {
        "input": "5\n1 2 3 4 5\n",
        "expectedOutput": "2 3 4 5 -1",
        "hidden": true
      },
      {
        "input": "6\n2 2 2 3 2 2\n",
        "expectedOutput": "3 3 3 -1 -1 -1",
        "hidden": true
      },
      {
        "input": "7\n-5 -10 0 -1 8 -20 7\n",
        "expectedOutput": "0 0 8 8 -1 7 -1",
        "hidden": true
      }
    ]
  },
  {
    "order": 15,
    "title": "Evaluate Reverse Polish Notation",
    "category": "Stacks",
    "difficulty": "medium",
    "xp": 70,
    "estimatedMinutes": 20,
    "statement": "Evaluate an arithmetic expression written in Reverse Polish (postfix) notation, e.g. \"2 1 + 3 *\" means (2 + 1) * 3. Operators are + - * /. Division between integers truncates toward zero (7 / -2 = -3).\n\nReasoning to practise: an operator always applies to the two most recent unconsumed values.\n\nInput\nOne line: tokens separated by spaces.\n\nOutput\nThe integer result.",
    "constraints": "1 <= tokens <= 10000\nThe expression is valid, never divides by zero, and every intermediate value fits in a 64-bit signed integer.",
    "hints": [
      "Read left to right. When you meet an operator, which two numbers does it use?",
      "The operands are the two most recent results that have not been used yet — which structure gives you \"most recent\" first?",
      "Push numbers on a stack; on an operator pop b then a, push a op b. Take care that division truncates toward zero, not toward minus infinity."
    ],
    "expectedTimeComplexity": "O(n)",
    "expectedSpaceComplexity": "O(n)",
    "starterCode": "import sys\n\ndef main():\n    tokens = sys.stdin.read().split()\n    # Evaluate the postfix expression and print the integer result\n\nmain()\n",
    "referenceSolution": "import sys\n\ndef main():\n    tokens = sys.stdin.read().split()\n    stack = []\n    for t in tokens:\n        if t in ('+', '-', '*', '/'):\n            b = stack.pop()\n            a = stack.pop()\n            if t == '+':\n                stack.append(a + b)\n            elif t == '-':\n                stack.append(a - b)\n            elif t == '*':\n                stack.append(a * b)\n            else:\n                q = abs(a) // abs(b)\n                stack.append(q if (a >= 0) == (b >= 0) else -q)\n        else:\n            stack.append(int(t))\n    print(stack[-1])\n\nmain()\n",
    "examples": [
      {
        "input": "2 1 + 3 *\n",
        "expectedOutput": "9",
        "explanation": "(2 + 1) * 3 = 9."
      },
      {
        "input": "4 13 5 / +\n",
        "expectedOutput": "6",
        "explanation": "13 / 5 = 2 (truncated), then 4 + 2 = 6."
      },
      {
        "input": "10 6 9 3 + -11 * / * 17 + 5 +\n",
        "expectedOutput": "22",
        "explanation": "Works out to 22."
      }
    ],
    "testCases": [
      {
        "input": "2 1 + 3 *\n",
        "expectedOutput": "9",
        "hidden": false
      },
      {
        "input": "4 13 5 / +\n",
        "expectedOutput": "6",
        "hidden": false
      },
      {
        "input": "10 6 9 3 + -11 * / * 17 + 5 +\n",
        "expectedOutput": "22",
        "hidden": false
      },
      {
        "input": "42\n",
        "expectedOutput": "42",
        "hidden": true
      },
      {
        "input": "7 -2 /\n",
        "expectedOutput": "-3",
        "hidden": true
      },
      {
        "input": "-7 2 /\n",
        "expectedOutput": "-3",
        "hidden": true
      },
      {
        "input": "3 4 - 5 *\n",
        "expectedOutput": "-5",
        "hidden": true
      },
      {
        "input": "1000000 1000000 * 1000 *\n",
        "expectedOutput": "1000000000000000",
        "hidden": true
      }
    ]
  },
  {
    "order": 16,
    "title": "Merge Overlapping Meetings",
    "category": "Greedy",
    "difficulty": "medium",
    "xp": 70,
    "estimatedMinutes": 20,
    "statement": "You have n meetings, each a time interval [start, end]. Merge every group of overlapping meetings into one block and print the blocks in order of start time. Intervals that merely touch (one ends at 4, the next starts at 4) also merge.\n\nReasoning to practise: after sorting, an interval can only ever merge with the block you are currently building.\n\nInput\nLine 1: n\nNext n lines: start end\n\nOutput\nOne merged block per line: start end",
    "constraints": "1 <= n <= 100000\n0 <= start <= end <= 10^9\nMeetings are given in any order.",
    "hints": [
      "Overlaps are hard to find in random order. What ordering makes overlapping meetings sit next to each other?",
      "Once meetings are ordered by start, compare each one only with the block you are building. When does it extend that block, and when does it start a new one?",
      "Sort by start. If the next start <= current block's end, set end = max(end, next end); otherwise output the block and start a new one."
    ],
    "expectedTimeComplexity": "O(n log n)",
    "expectedSpaceComplexity": "O(n)",
    "starterCode": "import sys\n\ndef main():\n    data = list(map(int, sys.stdin.read().split()))\n    n = data[0]\n    meetings = [(data[1 + 2 * i], data[2 + 2 * i]) for i in range(n)]\n    # Print the merged blocks, one \"start end\" per line, sorted by start\n\nmain()\n",
    "referenceSolution": "import sys\n\ndef main():\n    data = list(map(int, sys.stdin.read().split()))\n    n = data[0]\n    meetings = sorted((data[1 + 2 * i], data[2 + 2 * i]) for i in range(n))\n    merged = [list(meetings[0])]\n    for s, e in meetings[1:]:\n        if s <= merged[-1][1]:\n            merged[-1][1] = max(merged[-1][1], e)\n        else:\n            merged.append([s, e])\n    print(\"\\n\".join(f\"{s} {e}\" for s, e in merged))\n\nmain()\n",
    "examples": [
      {
        "input": "4\n1 3\n2 6\n8 10\n15 18\n",
        "expectedOutput": "1 6\n8 10\n15 18",
        "explanation": "[1,3] and [2,6] overlap into [1,6]."
      },
      {
        "input": "2\n1 4\n4 5\n",
        "expectedOutput": "1 5",
        "explanation": "Touching meetings merge into [1,5]."
      },
      {
        "input": "3\n5 7\n1 2\n3 4\n",
        "expectedOutput": "1 2\n3 4\n5 7",
        "explanation": "Nothing overlaps; the blocks are just sorted."
      }
    ],
    "testCases": [
      {
        "input": "4\n1 3\n2 6\n8 10\n15 18\n",
        "expectedOutput": "1 6\n8 10\n15 18",
        "hidden": false
      },
      {
        "input": "2\n1 4\n4 5\n",
        "expectedOutput": "1 5",
        "hidden": false
      },
      {
        "input": "3\n5 7\n1 2\n3 4\n",
        "expectedOutput": "1 2\n3 4\n5 7",
        "hidden": false
      },
      {
        "input": "1\n0 0\n",
        "expectedOutput": "0 0",
        "hidden": true
      },
      {
        "input": "3\n1 10\n2 3\n4 5\n",
        "expectedOutput": "1 10",
        "hidden": true
      },
      {
        "input": "5\n6 8\n1 9\n2 4\n4 7\n20 21\n",
        "expectedOutput": "1 9\n20 21",
        "hidden": true
      },
      {
        "input": "4\n0 1000000000\n5 6\n999999999 1000000000\n7 7\n",
        "expectedOutput": "0 1000000000",
        "hidden": true
      }
    ]
  },
  {
    "order": 17,
    "title": "Spiral Matrix",
    "category": "Simulation",
    "difficulty": "medium",
    "xp": 70,
    "estimatedMinutes": 20,
    "statement": "Print all values of an r x c matrix in clockwise spiral order, starting at the top-left corner: across the top row, down the right column, back along the bottom row, up the left column, then the same for the inner ring.\n\nReasoning to practise: simulate carefully with four shrinking boundaries, and handle a ring that is a single row or column.\n\nInput\nLine 1: r c\nNext r lines: c integers each\n\nOutput\nr*c integers, space-separated, in spiral order.",
    "constraints": "1 <= r, c <= 300\n-1000 <= value <= 1000",
    "hints": [
      "Trace a 3x3 and a 3x4 matrix by hand. What changes after you finish each side?",
      "Keep four boundaries — top, bottom, left, right — and shrink one after walking each side.",
      "Loop while top <= bottom and left <= right; walk right, down, then left only if top <= bottom, then up only if left <= right. Those last two checks stop a single row or column being printed twice."
    ],
    "expectedTimeComplexity": "O(r * c)",
    "expectedSpaceComplexity": "O(1) extra",
    "starterCode": "import sys\n\ndef main():\n    data = list(map(int, sys.stdin.read().split()))\n    r, c = data[0], data[1]\n    grid = [data[2 + i * c: 2 + (i + 1) * c] for i in range(r)]\n    # Print the values in clockwise spiral order\n\nmain()\n",
    "referenceSolution": "import sys\n\ndef main():\n    data = list(map(int, sys.stdin.read().split()))\n    r, c = data[0], data[1]\n    g = [data[2 + i * c: 2 + (i + 1) * c] for i in range(r)]\n    top, bottom, left, right = 0, r - 1, 0, c - 1\n    out = []\n    while top <= bottom and left <= right:\n        for j in range(left, right + 1):\n            out.append(g[top][j])\n        top += 1\n        for i in range(top, bottom + 1):\n            out.append(g[i][right])\n        right -= 1\n        if top <= bottom:\n            for j in range(right, left - 1, -1):\n                out.append(g[bottom][j])\n            bottom -= 1\n        if left <= right:\n            for i in range(bottom, top - 1, -1):\n                out.append(g[i][left])\n            left += 1\n    print(\" \".join(map(str, out)))\n\nmain()\n",
    "examples": [
      {
        "input": "3 3\n1 2 3\n4 5 6\n7 8 9\n",
        "expectedOutput": "1 2 3 6 9 8 7 4 5",
        "explanation": "Outer ring 1 2 3 6 9 8 7 4, then the centre 5."
      },
      {
        "input": "3 4\n1 2 3 4\n5 6 7 8\n9 10 11 12\n",
        "expectedOutput": "1 2 3 4 8 12 11 10 9 5 6 7",
        "explanation": "The inner ring is a single row: 6 7."
      },
      {
        "input": "1 1\n42\n",
        "expectedOutput": "42",
        "explanation": "A single cell."
      }
    ],
    "testCases": [
      {
        "input": "3 3\n1 2 3\n4 5 6\n7 8 9\n",
        "expectedOutput": "1 2 3 6 9 8 7 4 5",
        "hidden": false
      },
      {
        "input": "3 4\n1 2 3 4\n5 6 7 8\n9 10 11 12\n",
        "expectedOutput": "1 2 3 4 8 12 11 10 9 5 6 7",
        "hidden": false
      },
      {
        "input": "1 1\n42\n",
        "expectedOutput": "42",
        "hidden": false
      },
      {
        "input": "1 4\n1 2 3 4\n",
        "expectedOutput": "1 2 3 4",
        "hidden": true
      },
      {
        "input": "4 1\n1\n2\n3\n4\n",
        "expectedOutput": "1 2 3 4",
        "hidden": true
      },
      {
        "input": "2 2\n1 2\n3 4\n",
        "expectedOutput": "1 2 4 3",
        "hidden": true
      },
      {
        "input": "4 3\n1 2 3\n4 5 6\n7 8 9\n10 11 12\n",
        "expectedOutput": "1 2 3 6 9 12 11 10 7 4 5 8",
        "hidden": true
      },
      {
        "input": "5 5\n1 2 3 4 5\n6 7 8 9 10\n11 12 13 14 15\n16 17 18 19 20\n21 22 23 24 25\n",
        "expectedOutput": "1 2 3 4 5 10 15 20 25 24 23 22 21 16 11 6 7 8 9 14 19 18 17 12 13",
        "hidden": true
      }
    ]
  },
  {
    "order": 18,
    "title": "House Robber",
    "category": "DP",
    "difficulty": "medium",
    "xp": 70,
    "estimatedMinutes": 20,
    "statement": "Houses on a street hold some money each. You cannot take from two ADJACENT houses (the alarm links neighbours). Print the most money you can collect.\n\nReasoning to practise: define the best answer for the first i houses in terms of smaller answers — the core move of dynamic programming.\n\nInput\nLine 1: n\nLine 2: n non-negative integers\n\nOutput\nThe maximum total.",
    "constraints": "1 <= n <= 100000\n0 <= money[i] <= 10000",
    "hints": [
      "Greedy \"take the biggest\" fails on 2 1 1 2. Think about the LAST house instead: you either take it or you do not.",
      "If you take house i you cannot take i-1. So best(i) depends only on best(i-1) and best(i-2).",
      "best(i) = max(best(i-1), best(i-2) + money[i]). Two running variables are enough — no table needed."
    ],
    "expectedTimeComplexity": "O(n)",
    "expectedSpaceComplexity": "O(1)",
    "starterCode": "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    n = int(data[0])\n    money = list(map(int, data[1:1 + n]))\n    # Print the most money you can take without robbing two neighbours\n\nmain()\n",
    "referenceSolution": "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    n = int(data[0])\n    money = list(map(int, data[1:1 + n]))\n    prev2, prev1 = 0, 0\n    for m in money:\n        prev2, prev1 = prev1, max(prev1, prev2 + m)\n    print(prev1)\n\nmain()\n",
    "examples": [
      {
        "input": "4\n1 2 3 1\n",
        "expectedOutput": "4",
        "explanation": "Houses 0 and 2: 1 + 3 = 4."
      },
      {
        "input": "5\n2 7 9 3 1\n",
        "expectedOutput": "12",
        "explanation": "Houses 0, 2 and 4: 2 + 9 + 1 = 12."
      },
      {
        "input": "4\n2 1 1 2\n",
        "expectedOutput": "4",
        "explanation": "Houses 0 and 3: 4 — greedy picking would miss this."
      }
    ],
    "testCases": [
      {
        "input": "4\n1 2 3 1\n",
        "expectedOutput": "4",
        "hidden": false
      },
      {
        "input": "5\n2 7 9 3 1\n",
        "expectedOutput": "12",
        "hidden": false
      },
      {
        "input": "4\n2 1 1 2\n",
        "expectedOutput": "4",
        "hidden": false
      },
      {
        "input": "1\n5\n",
        "expectedOutput": "5",
        "hidden": true
      },
      {
        "input": "2\n3 10\n",
        "expectedOutput": "10",
        "hidden": true
      },
      {
        "input": "6\n0 0 0 0 0 0\n",
        "expectedOutput": "0",
        "hidden": true
      },
      {
        "input": "8\n10 1 1 10 1 1 10 1\n",
        "expectedOutput": "30",
        "hidden": true
      },
      {
        "input": "7\n10000 10000 10000 10000 10000 10000 10000\n",
        "expectedOutput": "40000",
        "hidden": true
      }
    ]
  },
  {
    "order": 19,
    "title": "Level Order Traversal",
    "category": "Trees",
    "difficulty": "medium",
    "xp": 70,
    "estimatedMinutes": 20,
    "statement": "A binary tree is given in level order, with \"null\" marking a missing child (the same format LeetCode uses). Print the values level by level: the root on the first line, its children on the second, and so on, left to right.\n\nReasoning to practise: breadth-first search, and knowing exactly where one level ends and the next begins.\n\nInput\nOne line: the level-order tokens, e.g. 3 9 20 null null 15 7\n\nOutput\nOne line per level, values space-separated.",
    "constraints": "1 <= nodes <= 10000\nThe root is never null.\n-10^4 <= value <= 10^4",
    "hints": [
      "Which traversal visits nodes in order of their distance from the root?",
      "A queue gives you breadth-first order. How do you know when one level has been fully processed?",
      "At the start of each round, the queue holds exactly one level — record its size, pop that many nodes, print them, and push their children."
    ],
    "expectedTimeComplexity": "O(n)",
    "expectedSpaceComplexity": "O(n)",
    "starterCode": "import sys\n\ndef main():\n    tokens = sys.stdin.read().split()\n    # Build the tree from the level-order tokens (\"null\" = no child),\n    # then print each level on its own line\n\nmain()\n",
    "referenceSolution": "import sys\nfrom collections import deque\n\ndef parse_tree(tokens):\n    # Level-order with \"null\" for missing children (LeetCode style).\n    if not tokens or tokens[0] == 'null':\n        return None, {}, {}\n    val = {0: int(tokens[0])}\n    left, right = {}, {}\n    queue = [0]\n    head = 0\n    i = 1\n    nxt = 1\n    while i < len(tokens) and head < len(queue):\n        node = queue[head]\n        head += 1\n        if i < len(tokens) and tokens[i] != 'null':\n            val[nxt] = int(tokens[i]); left[node] = nxt; queue.append(nxt); nxt += 1\n        i += 1\n        if i < len(tokens) and tokens[i] != 'null':\n            val[nxt] = int(tokens[i]); right[node] = nxt; queue.append(nxt); nxt += 1\n        i += 1\n    return val, left, right\n\ndef main():\n    tokens = sys.stdin.read().split()\n    val, left, right = parse_tree(tokens)\n    queue = deque([0])\n    lines = []\n    while queue:\n        level = []\n        for _ in range(len(queue)):\n            node = queue.popleft()\n            level.append(val[node])\n            if node in left:\n                queue.append(left[node])\n            if node in right:\n                queue.append(right[node])\n        lines.append(\" \".join(map(str, level)))\n    print(\"\\n\".join(lines))\n\nmain()\n",
    "examples": [
      {
        "input": "3 9 20 null null 15 7\n",
        "expectedOutput": "3\n9 20\n15 7",
        "explanation": "Level 0: 3. Level 1: 9 20. Level 2: 15 7."
      },
      {
        "input": "1\n",
        "expectedOutput": "1",
        "explanation": "Just the root."
      },
      {
        "input": "1 2 3 4 null null 5\n",
        "expectedOutput": "1\n2 3\n4 5",
        "explanation": "4 is the left child of 2; 5 is the right child of 3."
      }
    ],
    "testCases": [
      {
        "input": "3 9 20 null null 15 7\n",
        "expectedOutput": "3\n9 20\n15 7",
        "hidden": false
      },
      {
        "input": "1\n",
        "expectedOutput": "1",
        "hidden": false
      },
      {
        "input": "1 2 3 4 null null 5\n",
        "expectedOutput": "1\n2 3\n4 5",
        "hidden": false
      },
      {
        "input": "1 null 2 null 3 null 4\n",
        "expectedOutput": "1\n2\n3\n4",
        "hidden": true
      },
      {
        "input": "5 4 8 11 null 13 4 7 2 null null null 1\n",
        "expectedOutput": "5\n4 8\n11 13 4\n7 2 1",
        "hidden": true
      },
      {
        "input": "-1 -2 -3 -4 -5 -6 -7\n",
        "expectedOutput": "-1\n-2 -3\n-4 -5 -6 -7",
        "hidden": true
      },
      {
        "input": "10 null 20 30\n",
        "expectedOutput": "10\n20\n30",
        "hidden": true
      }
    ]
  },
  {
    "order": 20,
    "title": "Validate a Binary Search Tree",
    "category": "Trees",
    "difficulty": "medium",
    "xp": 70,
    "estimatedMinutes": 20,
    "statement": "A binary search tree requires, for EVERY node, that all values in its left subtree are strictly smaller and all values in its right subtree are strictly larger. Given a tree in level order (\"null\" for missing children), print YES if it is a valid BST and NO otherwise.\n\nReasoning to practise: checking only a node against its direct children is not enough — each node inherits a valid range from all of its ancestors.\n\nInput\nOne line: level-order tokens.\n\nOutput\nYES or NO.",
    "constraints": "1 <= nodes <= 10000\nThe root is never null.\n-10^9 <= value <= 10^9",
    "hints": [
      "Try 5 1 4 null null 3 6 and also 5 4 6 null null 3 7. Does comparing each node with its children catch both mistakes?",
      "Every node must lie inside a range set by its ancestors. How does the range change when you go left, or go right?",
      "Pass (low, high) down: the left child gets (low, node), the right child gets (node, high). Any value outside its open range means NO. (An in-order traversal must also be strictly increasing.)"
    ],
    "expectedTimeComplexity": "O(n)",
    "expectedSpaceComplexity": "O(h) for the stack",
    "starterCode": "import sys\n\ndef main():\n    tokens = sys.stdin.read().split()\n    # Build the tree from the level-order tokens (\"null\" = no child),\n    # then print YES if it is a valid BST, otherwise NO\n\nmain()\n",
    "referenceSolution": "import sys\n\ndef parse_tree(tokens):\n    # Level-order with \"null\" for missing children (LeetCode style).\n    if not tokens or tokens[0] == 'null':\n        return None, {}, {}\n    val = {0: int(tokens[0])}\n    left, right = {}, {}\n    queue = [0]\n    head = 0\n    i = 1\n    nxt = 1\n    while i < len(tokens) and head < len(queue):\n        node = queue[head]\n        head += 1\n        if i < len(tokens) and tokens[i] != 'null':\n            val[nxt] = int(tokens[i]); left[node] = nxt; queue.append(nxt); nxt += 1\n        i += 1\n        if i < len(tokens) and tokens[i] != 'null':\n            val[nxt] = int(tokens[i]); right[node] = nxt; queue.append(nxt); nxt += 1\n        i += 1\n    return val, left, right\n\ndef main():\n    tokens = sys.stdin.read().split()\n    val, left, right = parse_tree(tokens)\n    stack = [(0, float('-inf'), float('inf'))]\n    while stack:\n        node, low, high = stack.pop()\n        v = val[node]\n        if not (low < v < high):\n            print(\"NO\")\n            return\n        if node in left:\n            stack.append((left[node], low, v))\n        if node in right:\n            stack.append((right[node], v, high))\n    print(\"YES\")\n\nmain()\n",
    "examples": [
      {
        "input": "2 1 3\n",
        "expectedOutput": "YES",
        "explanation": "1 < 2 < 3."
      },
      {
        "input": "5 1 4 null null 3 6\n",
        "expectedOutput": "NO",
        "explanation": "4 is in the right subtree of 5 but is smaller than 5."
      },
      {
        "input": "5 4 6 null null 3 7\n",
        "expectedOutput": "NO",
        "explanation": "3 is below 6 (fine for 6) but it sits in the right subtree of 5, so NO."
      }
    ],
    "testCases": [
      {
        "input": "2 1 3\n",
        "expectedOutput": "YES",
        "hidden": false
      },
      {
        "input": "5 1 4 null null 3 6\n",
        "expectedOutput": "NO",
        "hidden": false
      },
      {
        "input": "5 4 6 null null 3 7\n",
        "expectedOutput": "NO",
        "hidden": false
      },
      {
        "input": "1\n",
        "expectedOutput": "YES",
        "hidden": true
      },
      {
        "input": "1 1\n",
        "expectedOutput": "NO",
        "hidden": true
      },
      {
        "input": "10 5 15 2 7 12 20 null null 6 8\n",
        "expectedOutput": "YES",
        "hidden": true
      },
      {
        "input": "10 5 15 2 7 12 20 null null 6 11\n",
        "expectedOutput": "NO",
        "hidden": true
      },
      {
        "input": "-5 null 0 null 1000000000\n",
        "expectedOutput": "YES",
        "hidden": true
      }
    ]
  },
  {
    "order": 21,
    "title": "Number of Islands",
    "category": "Graphs",
    "difficulty": "medium",
    "xp": 70,
    "estimatedMinutes": 20,
    "statement": "A map is a grid of '1' (land) and '0' (water). An island is a group of land cells connected up, down, left or right (not diagonally). Print how many islands there are.\n\nReasoning to practise: treat the grid as a graph and use flood fill — every time you find unvisited land, you have found a new island, so mark all of it.\n\nInput\nLine 1: r c\nNext r lines: a string of c characters, each '0' or '1'\n\nOutput\nThe number of islands.",
    "constraints": "1 <= r, c <= 300",
    "hints": [
      "When you meet a land cell, how much of the map belongs to the same island?",
      "Once an island is counted, its cells must never be counted again. How do you mark them?",
      "Scan every cell; on an unvisited '1', add one to the count and BFS/DFS from it marking all connected land as visited (an explicit queue avoids recursion limits)."
    ],
    "expectedTimeComplexity": "O(r * c)",
    "expectedSpaceComplexity": "O(r * c)",
    "starterCode": "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    r, c = int(data[0]), int(data[1])\n    grid = data[2:2 + r]\n    # Print how many islands of '1's there are (4-directional)\n\nmain()\n",
    "referenceSolution": "import sys\nfrom collections import deque\n\ndef main():\n    data = sys.stdin.read().split()\n    r, c = int(data[0]), int(data[1])\n    grid = [list(row) for row in data[2:2 + r]]\n    islands = 0\n    for i in range(r):\n        for j in range(c):\n            if grid[i][j] == '1':\n                islands += 1\n                grid[i][j] = '0'\n                queue = deque([(i, j)])\n                while queue:\n                    x, y = queue.popleft()\n                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):\n                        nx, ny = x + dx, y + dy\n                        if 0 <= nx < r and 0 <= ny < c and grid[nx][ny] == '1':\n                            grid[nx][ny] = '0'\n                            queue.append((nx, ny))\n    print(islands)\n\nmain()\n",
    "examples": [
      {
        "input": "4 5\n11110\n11010\n11000\n00000\n",
        "expectedOutput": "1",
        "explanation": "All the land is connected: one island."
      },
      {
        "input": "4 5\n11000\n11000\n00100\n00011\n",
        "expectedOutput": "3",
        "explanation": "Three separate islands."
      },
      {
        "input": "1 1\n0\n",
        "expectedOutput": "0",
        "explanation": "No land at all."
      }
    ],
    "testCases": [
      {
        "input": "4 5\n11110\n11010\n11000\n00000\n",
        "expectedOutput": "1",
        "hidden": false
      },
      {
        "input": "4 5\n11000\n11000\n00100\n00011\n",
        "expectedOutput": "3",
        "hidden": false
      },
      {
        "input": "1 1\n0\n",
        "expectedOutput": "0",
        "hidden": false
      },
      {
        "input": "3 3\n101\n010\n101\n",
        "expectedOutput": "5",
        "hidden": true
      },
      {
        "input": "1 7\n1011101\n",
        "expectedOutput": "3",
        "hidden": true
      },
      {
        "input": "3 3\n111\n111\n111\n",
        "expectedOutput": "1",
        "hidden": true
      },
      {
        "input": "5 4\n1001\n0110\n0000\n1111\n0001\n",
        "expectedOutput": "4",
        "hidden": true
      }
    ]
  },
  {
    "order": 22,
    "title": "Shortest Path in a Grid",
    "category": "Graphs",
    "difficulty": "medium",
    "xp": 70,
    "estimatedMinutes": 25,
    "statement": "A maze is a grid of '.' (open) and '#' (wall). Starting at the top-left cell, reach the bottom-right cell moving up, down, left or right through open cells. Print the minimum number of moves, or -1 if it cannot be reached (including when the start or end is a wall).\n\nReasoning to practise: in an unweighted graph, breadth-first search reaches every cell by the shortest route first.\n\nInput\nLine 1: r c\nNext r lines: a string of c characters\n\nOutput\nThe minimum number of moves, or -1.",
    "constraints": "1 <= r, c <= 500",
    "hints": [
      "Depth-first search finds A path. Why might it not be the shortest?",
      "Explore cells in rounds: everything 1 move away, then everything 2 moves away… Which structure processes nodes in that order?",
      "BFS from (0,0) with a distance grid; set a neighbour's distance when you first see it and never revisit. The answer is the distance of the bottom-right cell."
    ],
    "expectedTimeComplexity": "O(r * c)",
    "expectedSpaceComplexity": "O(r * c)",
    "starterCode": "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    r, c = int(data[0]), int(data[1])\n    grid = data[2:2 + r]\n    # Print the fewest moves from top-left to bottom-right, or -1\n\nmain()\n",
    "referenceSolution": "import sys\nfrom collections import deque\n\ndef main():\n    data = sys.stdin.read().split()\n    r, c = int(data[0]), int(data[1])\n    grid = data[2:2 + r]\n    if grid[0][0] == '#' or grid[r - 1][c - 1] == '#':\n        print(-1)\n        return\n    dist = [[-1] * c for _ in range(r)]\n    dist[0][0] = 0\n    queue = deque([(0, 0)])\n    while queue:\n        x, y = queue.popleft()\n        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):\n            nx, ny = x + dx, y + dy\n            if 0 <= nx < r and 0 <= ny < c and grid[nx][ny] == '.' and dist[nx][ny] == -1:\n                dist[nx][ny] = dist[x][y] + 1\n                queue.append((nx, ny))\n    print(dist[r - 1][c - 1])\n\nmain()\n",
    "examples": [
      {
        "input": "3 3\n...\n.#.\n...\n",
        "expectedOutput": "4",
        "explanation": "Around the wall: 4 moves."
      },
      {
        "input": "3 3\n.#.\n##.\n...\n",
        "expectedOutput": "-1",
        "explanation": "The start is boxed in by walls: -1."
      },
      {
        "input": "1 1\n.\n",
        "expectedOutput": "0",
        "explanation": "Already at the goal: 0 moves."
      }
    ],
    "testCases": [
      {
        "input": "3 3\n...\n.#.\n...\n",
        "expectedOutput": "4",
        "hidden": false
      },
      {
        "input": "3 3\n.#.\n##.\n...\n",
        "expectedOutput": "-1",
        "hidden": false
      },
      {
        "input": "1 1\n.\n",
        "expectedOutput": "0",
        "hidden": false
      },
      {
        "input": "1 1\n#\n",
        "expectedOutput": "-1",
        "hidden": true
      },
      {
        "input": "2 2\n..\n.#\n",
        "expectedOutput": "-1",
        "hidden": true
      },
      {
        "input": "4 5\n.....\n####.\n.....\n.####\n",
        "expectedOutput": "-1",
        "hidden": true
      },
      {
        "input": "5 5\n.#...\n.#.#.\n.#.#.\n.#.#.\n...#.\n",
        "expectedOutput": "16",
        "hidden": true
      }
    ]
  },
  {
    "order": 23,
    "title": "Reverse Nodes in Groups of K",
    "category": "Linked Lists",
    "difficulty": "hard",
    "xp": 100,
    "estimatedMinutes": 25,
    "statement": "Given a singly linked list and k, reverse the nodes k at a time. If the number of nodes left at the end is less than k, leave them in their original order. Print the resulting list.\n\nReasoning to practise: pointer surgery — reversing a segment and stitching it back between the part before it and the part after it, without losing either end.\n\nInput\nLine 1: n k\nLine 2: n values (the list, head first)\n\nOutput\nThe values of the new list, space-separated.",
    "constraints": "1 <= k <= n <= 100000\n-10^9 <= value <= 10^9\nOnly O(1) extra pointer space is expected (no copying values into arrays in an interview).",
    "hints": [
      "Before reversing a group, how do you know a full group of k nodes exists?",
      "Reversing a group changes which node comes first and which comes last. Which two outside nodes must be re-linked to it afterwards?",
      "Keep a pointer to the node before the group. Check k nodes ahead exist; reverse those k links; connect the previous tail to the new group head and the old group head (now its tail) to the node after the group; move on."
    ],
    "expectedTimeComplexity": "O(n)",
    "expectedSpaceComplexity": "O(1)",
    "starterCode": "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    n, k = int(data[0]), int(data[1])\n    values = list(map(int, data[2:2 + n]))\n    # Build a linked list from values, reverse every full group of k, and print it\n\nmain()\n",
    "referenceSolution": "import sys\n\nclass Node:\n    def __init__(self, val, nxt=None):\n        self.val, self.next = val, nxt\n\ndef main():\n    data = sys.stdin.read().split()\n    n, k = int(data[0]), int(data[1])\n    head = None\n    for v in reversed(data[2:2 + n]):\n        head = Node(int(v), head)\n    dummy = Node(0, head)\n    before = dummy\n    while True:\n        check = before\n        for _ in range(k):\n            check = check.next\n            if check is None:\n                break\n        if check is None:\n            break\n        first = before.next\n        after = check.next\n        prev, cur = after, first\n        while cur is not after:\n            cur.next, prev, cur = prev, cur, cur.next\n        before.next = check\n        before = first\n    out = []\n    node = dummy.next\n    while node:\n        out.append(node.val)\n        node = node.next\n    print(\" \".join(map(str, out)))\n\nmain()\n",
    "examples": [
      {
        "input": "5 2\n1 2 3 4 5\n",
        "expectedOutput": "2 1 4 3 5",
        "explanation": "Groups (1 2) and (3 4) reverse; 5 is left alone."
      },
      {
        "input": "5 3\n1 2 3 4 5\n",
        "expectedOutput": "3 2 1 4 5",
        "explanation": "Only (1 2 3) is a full group."
      },
      {
        "input": "4 1\n1 2 3 4\n",
        "expectedOutput": "1 2 3 4",
        "explanation": "k = 1 changes nothing."
      }
    ],
    "testCases": [
      {
        "input": "5 2\n1 2 3 4 5\n",
        "expectedOutput": "2 1 4 3 5",
        "hidden": false
      },
      {
        "input": "5 3\n1 2 3 4 5\n",
        "expectedOutput": "3 2 1 4 5",
        "hidden": false
      },
      {
        "input": "4 1\n1 2 3 4\n",
        "expectedOutput": "1 2 3 4",
        "hidden": false
      },
      {
        "input": "1 1\n7\n",
        "expectedOutput": "7",
        "hidden": true
      },
      {
        "input": "6 6\n1 2 3 4 5 6\n",
        "expectedOutput": "6 5 4 3 2 1",
        "hidden": true
      },
      {
        "input": "6 3\n1 2 3 4 5 6\n",
        "expectedOutput": "3 2 1 6 5 4",
        "hidden": true
      },
      {
        "input": "9 4\n-1 -2 -3 -4 5 6 7 8 9\n",
        "expectedOutput": "-4 -3 -2 -1 8 7 6 5 9",
        "hidden": true
      },
      {
        "input": "7 2\n1 1 2 2 3 3 4\n",
        "expectedOutput": "1 1 2 2 3 3 4",
        "hidden": true
      }
    ]
  },
  {
    "order": 24,
    "title": "Sliding Window Maximum",
    "category": "Queues",
    "difficulty": "hard",
    "xp": 100,
    "estimatedMinutes": 25,
    "statement": "A window of size k slides across an array one step at a time. For every position of the window, print the maximum value inside it.\n\nReasoning to practise: a double-ended queue that keeps only candidates that could still become a maximum — anything smaller and older than a new value is useless forever.\n\nInput\nLine 1: n k\nLine 2: n integers\n\nOutput\nn - k + 1 integers, space-separated.",
    "constraints": "1 <= k <= n <= 100000\n-10^4 <= a[i] <= 10^4\nAim for O(n); O(n·k) will be too slow for large inputs.",
    "hints": [
      "When a new, larger value enters the window, can any smaller value already inside ever be the maximum again?",
      "Keep the useful candidates in order of position with decreasing values. Which end do you remove from when a value expires, and which when a bigger value arrives?",
      "Deque of indices: pop from the back while the back value <= new value, push the new index, pop from the front if it left the window, and the front is the maximum once i >= k-1."
    ],
    "expectedTimeComplexity": "O(n)",
    "expectedSpaceComplexity": "O(k)",
    "starterCode": "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    n, k = int(data[0]), int(data[1])\n    a = list(map(int, data[2:2 + n]))\n    # Print the maximum of every window of size k\n\nmain()\n",
    "referenceSolution": "import sys\nfrom collections import deque\n\ndef main():\n    data = sys.stdin.read().split()\n    n, k = int(data[0]), int(data[1])\n    a = list(map(int, data[2:2 + n]))\n    dq = deque()\n    out = []\n    for i, x in enumerate(a):\n        while dq and a[dq[-1]] <= x:\n            dq.pop()\n        dq.append(i)\n        if dq[0] <= i - k:\n            dq.popleft()\n        if i >= k - 1:\n            out.append(a[dq[0]])\n    print(\" \".join(map(str, out)))\n\nmain()\n",
    "examples": [
      {
        "input": "8 3\n1 3 -1 -3 5 3 6 7\n",
        "expectedOutput": "3 3 5 5 6 7",
        "explanation": "Windows [1 3 -1] -> 3, [3 -1 -3] -> 3, [-1 -3 5] -> 5, then 5, 6, 7."
      },
      {
        "input": "1 1\n1\n",
        "expectedOutput": "1",
        "explanation": "One window, one value."
      },
      {
        "input": "5 5\n4 2 12 3 8\n",
        "expectedOutput": "12",
        "explanation": "k = n: a single window whose maximum is 12."
      }
    ],
    "testCases": [
      {
        "input": "8 3\n1 3 -1 -3 5 3 6 7\n",
        "expectedOutput": "3 3 5 5 6 7",
        "hidden": false
      },
      {
        "input": "1 1\n1\n",
        "expectedOutput": "1",
        "hidden": false
      },
      {
        "input": "5 5\n4 2 12 3 8\n",
        "expectedOutput": "12",
        "hidden": false
      },
      {
        "input": "6 2\n9 8 7 6 5 4\n",
        "expectedOutput": "9 8 7 6 5",
        "hidden": true
      },
      {
        "input": "6 2\n1 2 3 4 5 6\n",
        "expectedOutput": "2 3 4 5 6",
        "hidden": true
      },
      {
        "input": "7 3\n5 5 5 5 5 5 5\n",
        "expectedOutput": "5 5 5 5 5",
        "hidden": true
      },
      {
        "input": "9 4\n-7 -8 7 5 7 1 6 0 -10000\n",
        "expectedOutput": "7 7 7 7 7 6",
        "hidden": true
      }
    ]
  },
  {
    "order": 25,
    "title": "Minimum Ship Capacity",
    "category": "Binary Search",
    "difficulty": "hard",
    "xp": 100,
    "estimatedMinutes": 25,
    "statement": "Packages must ship in the given order within d days. Each day you load packages in order until the next one would exceed the ship's capacity. Print the smallest capacity that ships everything within d days.\n\nReasoning to practise: \"binary search on the answer\" — you cannot compute the capacity directly, but for any guess you can quickly CHECK whether it works, and the check is monotonic.\n\nInput\nLine 1: n d\nLine 2: n package weights\n\nOutput\nThe minimum capacity.",
    "constraints": "1 <= d <= n <= 50000\n1 <= weight <= 500",
    "hints": [
      "If capacity C works, does every capacity larger than C also work? What does that tell you about the shape of the answer?",
      "Given a capacity, you can count the days needed greedily in one pass. What is the smallest capacity that could ever work, and the largest you would ever need?",
      "Binary search C between max(weights) and sum(weights); for each mid, count days by filling greedily. If days <= d, try smaller; otherwise go larger."
    ],
    "expectedTimeComplexity": "O(n log(sum of weights))",
    "expectedSpaceComplexity": "O(1)",
    "starterCode": "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    n, d = int(data[0]), int(data[1])\n    w = list(map(int, data[2:2 + n]))\n    # Print the least ship capacity that ships everything, in order, within d days\n\nmain()\n",
    "referenceSolution": "import sys\n\ndef days_needed(w, cap):\n    days, load = 1, 0\n    for x in w:\n        if load + x > cap:\n            days += 1\n            load = 0\n        load += x\n    return days\n\ndef main():\n    data = sys.stdin.read().split()\n    n, d = int(data[0]), int(data[1])\n    w = list(map(int, data[2:2 + n]))\n    lo, hi = max(w), sum(w)\n    while lo < hi:\n        mid = (lo + hi) // 2\n        if days_needed(w, mid) <= d:\n            hi = mid\n        else:\n            lo = mid + 1\n    print(lo)\n\nmain()\n",
    "examples": [
      {
        "input": "10 5\n1 2 3 4 5 6 7 8 9 10\n",
        "expectedOutput": "15",
        "explanation": "Capacity 15: [1..5] [6 7] [8] [9] [10]."
      },
      {
        "input": "6 3\n3 2 2 4 1 4\n",
        "expectedOutput": "6",
        "explanation": "Capacity 6: [3 2] [2 4] [1 4]."
      },
      {
        "input": "5 4\n1 2 3 1 1\n",
        "expectedOutput": "3",
        "explanation": "Capacity 3: [1 2] [3] [1 1]."
      }
    ],
    "testCases": [
      {
        "input": "10 5\n1 2 3 4 5 6 7 8 9 10\n",
        "expectedOutput": "15",
        "hidden": false
      },
      {
        "input": "6 3\n3 2 2 4 1 4\n",
        "expectedOutput": "6",
        "hidden": false
      },
      {
        "input": "5 4\n1 2 3 1 1\n",
        "expectedOutput": "3",
        "hidden": false
      },
      {
        "input": "1 1\n500\n",
        "expectedOutput": "500",
        "hidden": true
      },
      {
        "input": "5 5\n7 2 9 4 1\n",
        "expectedOutput": "9",
        "hidden": true
      },
      {
        "input": "5 1\n7 2 9 4 1\n",
        "expectedOutput": "23",
        "hidden": true
      },
      {
        "input": "8 3\n10 50 10 10 10 10 10 50\n",
        "expectedOutput": "60",
        "hidden": true
      }
    ]
  },
  {
    "order": 26,
    "title": "Coin Change — Fewest Coins",
    "category": "DP",
    "difficulty": "hard",
    "xp": 100,
    "estimatedMinutes": 25,
    "statement": "Given coin denominations (unlimited supply of each) and an amount, print the fewest coins that add up exactly to the amount, or -1 if it cannot be made.\n\nReasoning to practise: greedy \"largest coin first\" fails (coins 1 3 4, amount 6). Build the answer for every smaller amount and reuse it.\n\nInput\nLine 1: n amount\nLine 2: n coin values\n\nOutput\nThe minimum number of coins, or -1.",
    "constraints": "1 <= n <= 12\n1 <= coin <= 10000\n0 <= amount <= 10000",
    "hints": [
      "Try greedy on coins 1 3 4 with amount 6. Why does it fail?",
      "The last coin you use is one of the n denominations. If you knew the best answer for amount - coin, what would the answer for amount be?",
      "dp[0] = 0; for a from 1 to amount, dp[a] = 1 + min(dp[a - c]) over coins c <= a with dp[a - c] reachable. Unreached amounts stay at infinity, which becomes -1."
    ],
    "expectedTimeComplexity": "O(n * amount)",
    "expectedSpaceComplexity": "O(amount)",
    "starterCode": "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    n, amount = int(data[0]), int(data[1])\n    coins = list(map(int, data[2:2 + n]))\n    # Print the fewest coins that make amount exactly, or -1\n\nmain()\n",
    "referenceSolution": "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    n, amount = int(data[0]), int(data[1])\n    coins = list(map(int, data[2:2 + n]))\n    INF = float('inf')\n    dp = [0] + [INF] * amount\n    for a in range(1, amount + 1):\n        for c in coins:\n            if c <= a and dp[a - c] + 1 < dp[a]:\n                dp[a] = dp[a - c] + 1\n    print(dp[amount] if dp[amount] != INF else -1)\n\nmain()\n",
    "examples": [
      {
        "input": "3 11\n1 2 5\n",
        "expectedOutput": "3",
        "explanation": "5 + 5 + 1: three coins."
      },
      {
        "input": "1 3\n2\n",
        "expectedOutput": "-1",
        "explanation": "Only 2s: 3 cannot be made."
      },
      {
        "input": "3 6\n1 3 4\n",
        "expectedOutput": "2",
        "explanation": "3 + 3 = two coins (greedy 4 + 1 + 1 uses three)."
      }
    ],
    "testCases": [
      {
        "input": "3 11\n1 2 5\n",
        "expectedOutput": "3",
        "hidden": false
      },
      {
        "input": "1 3\n2\n",
        "expectedOutput": "-1",
        "hidden": false
      },
      {
        "input": "3 6\n1 3 4\n",
        "expectedOutput": "2",
        "hidden": false
      },
      {
        "input": "2 0\n7 3\n",
        "expectedOutput": "0",
        "hidden": true
      },
      {
        "input": "3 7\n2 4 6\n",
        "expectedOutput": "-1",
        "hidden": true
      },
      {
        "input": "4 10000\n1 7 13 9999\n",
        "expectedOutput": "2",
        "hidden": true
      },
      {
        "input": "2 23\n5 9\n",
        "expectedOutput": "3",
        "hidden": true
      },
      {
        "input": "3 100\n3 7 405\n",
        "expectedOutput": "16",
        "hidden": true
      }
    ]
  },
  {
    "order": 27,
    "title": "Course Schedule — Minimum Semesters",
    "category": "Graphs",
    "difficulty": "hard",
    "xp": 100,
    "estimatedMinutes": 30,
    "statement": "There are n courses numbered 1..n and m prerequisite rules \"a b\", meaning course a must be finished in an EARLIER semester than course b. You can take any number of courses in one semester. Print the minimum number of semesters needed to finish every course, or -1 if the rules contain a cycle and it is impossible.\n\nReasoning to practise: topological ordering by levels (Kahn's algorithm) — and noticing that a cycle shows up as courses that never become free.\n\nInput\nLine 1: n m\nNext m lines: a b\n\nOutput\nThe minimum number of semesters, or -1.",
    "constraints": "1 <= n <= 10000\n0 <= m <= 50000\n1 <= a, b <= n",
    "hints": [
      "Which courses can you take in the very first semester?",
      "After a semester ends, some courses lose their last unmet prerequisite. Process the courses in rounds — what does a round correspond to?",
      "Count in-degrees; start with every course of in-degree 0; each round removes the current layer and decrements its successors, collecting those that reach 0. Count the rounds; if fewer than n courses were taken, there is a cycle: -1."
    ],
    "expectedTimeComplexity": "O(n + m)",
    "expectedSpaceComplexity": "O(n + m)",
    "starterCode": "import sys\n\ndef main():\n    data = list(map(int, sys.stdin.read().split()))\n    n, m = data[0], data[1]\n    rules = [(data[2 + 2 * i], data[3 + 2 * i]) for i in range(m)]\n    # Print the minimum number of semesters, or -1 if impossible\n\nmain()\n",
    "referenceSolution": "import sys\n\ndef main():\n    data = list(map(int, sys.stdin.read().split()))\n    n, m = data[0], data[1]\n    nxt = [[] for _ in range(n + 1)]\n    indeg = [0] * (n + 1)\n    for i in range(m):\n        a, b = data[2 + 2 * i], data[3 + 2 * i]\n        nxt[a].append(b)\n        indeg[b] += 1\n    layer = [c for c in range(1, n + 1) if indeg[c] == 0]\n    taken = 0\n    semesters = 0\n    while layer:\n        semesters += 1\n        taken += len(layer)\n        new_layer = []\n        for c in layer:\n            for d in nxt[c]:\n                indeg[d] -= 1\n                if indeg[d] == 0:\n                    new_layer.append(d)\n        layer = new_layer\n    print(semesters if taken == n else -1)\n\nmain()\n",
    "examples": [
      {
        "input": "3 2\n1 3\n2 3\n",
        "expectedOutput": "2",
        "explanation": "Semester 1: courses 1 and 2. Semester 2: course 3."
      },
      {
        "input": "3 3\n1 2\n2 3\n3 1\n",
        "expectedOutput": "-1",
        "explanation": "1 -> 2 -> 3 -> 1 is a cycle: impossible."
      },
      {
        "input": "4 0\n",
        "expectedOutput": "1",
        "explanation": "No rules: everything fits in one semester."
      }
    ],
    "testCases": [
      {
        "input": "3 2\n1 3\n2 3\n",
        "expectedOutput": "2",
        "hidden": false
      },
      {
        "input": "3 3\n1 2\n2 3\n3 1\n",
        "expectedOutput": "-1",
        "hidden": false
      },
      {
        "input": "4 0\n",
        "expectedOutput": "1",
        "hidden": false
      },
      {
        "input": "1 0\n",
        "expectedOutput": "1",
        "hidden": true
      },
      {
        "input": "5 4\n1 2\n2 3\n3 4\n4 5\n",
        "expectedOutput": "5",
        "hidden": true
      },
      {
        "input": "6 6\n1 2\n1 3\n2 4\n3 4\n4 5\n6 5\n",
        "expectedOutput": "4",
        "hidden": true
      },
      {
        "input": "2 1\n2 2\n",
        "expectedOutput": "-1",
        "hidden": true
      },
      {
        "input": "4 3\n1 2\n1 2\n3 4\n",
        "expectedOutput": "2",
        "hidden": true
      }
    ]
  },
  {
    "order": 28,
    "title": "Longest Common Subsequence",
    "category": "DP",
    "difficulty": "hard",
    "xp": 100,
    "estimatedMinutes": 30,
    "statement": "A subsequence keeps some characters of a string in their original order (not necessarily adjacent). Given two strings, print the length of their longest common subsequence. This is the heart of diff tools and DNA alignment.\n\nReasoning to practise: a two-dimensional DP — decide what happens to the last characters of both prefixes.\n\nInput\nLine 1: a\nLine 2: b\n\nOutput\nThe length of the longest common subsequence.",
    "constraints": "1 <= |a|, |b| <= 2000\nLowercase letters only.",
    "hints": [
      "Compare the LAST characters of a and b. What can you conclude if they are equal? If they differ?",
      "Define L(i, j) as the answer for the first i characters of a and the first j of b. Write it in terms of smaller i and j.",
      "If a[i-1] == b[j-1] then L(i,j) = L(i-1,j-1) + 1, else max(L(i-1,j), L(i,j-1)); fill the table row by row (one previous row is enough)."
    ],
    "expectedTimeComplexity": "O(|a| * |b|)",
    "expectedSpaceComplexity": "O(min(|a|, |b|)) with a rolling row",
    "starterCode": "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    a, b = data[0], data[1]\n    # Print the length of the longest common subsequence of a and b\n\nmain()\n",
    "referenceSolution": "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    a, b = data[0], data[1]\n    prev = [0] * (len(b) + 1)\n    for i in range(1, len(a) + 1):\n        cur = [0] * (len(b) + 1)\n        ai = a[i - 1]\n        for j in range(1, len(b) + 1):\n            if ai == b[j - 1]:\n                cur[j] = prev[j - 1] + 1\n            else:\n                cur[j] = cur[j - 1] if cur[j - 1] > prev[j] else prev[j]\n        prev = cur\n    print(prev[len(b)])\n\nmain()\n",
    "examples": [
      {
        "input": "abcde\nace\n",
        "expectedOutput": "3",
        "explanation": "\"ace\" appears in order in both."
      },
      {
        "input": "abc\nabc\n",
        "expectedOutput": "3",
        "explanation": "Identical strings: the whole string."
      },
      {
        "input": "abc\ndef\n",
        "expectedOutput": "0",
        "explanation": "Nothing in common."
      }
    ],
    "testCases": [
      {
        "input": "abcde\nace\n",
        "expectedOutput": "3",
        "hidden": false
      },
      {
        "input": "abc\nabc\n",
        "expectedOutput": "3",
        "hidden": false
      },
      {
        "input": "abc\ndef\n",
        "expectedOutput": "0",
        "hidden": false
      },
      {
        "input": "a\na\n",
        "expectedOutput": "1",
        "hidden": true
      },
      {
        "input": "bsbininm\njmjkbkjkv\n",
        "expectedOutput": "1",
        "hidden": true
      },
      {
        "input": "aaaa\naa\n",
        "expectedOutput": "2",
        "hidden": true
      },
      {
        "input": "abcbdab\nbdcaba\n",
        "expectedOutput": "4",
        "hidden": true
      },
      {
        "input": "xmjyauz\nmzjawxu\n",
        "expectedOutput": "4",
        "hidden": true
      }
    ]
  },
  {
    "order": 29,
    "title": "LRU Cache Simulator",
    "category": "Design",
    "difficulty": "hard",
    "xp": 150,
    "estimatedMinutes": 30,
    "statement": "Simulate a Least-Recently-Used cache with a fixed capacity. Operations:\n  PUT key value — insert or update key. If the cache is full and key is new, first evict the least recently used key.\n  GET key — print the value, or -1 if absent.\nBoth a successful GET and any PUT make that key the most recently used.\n\nReasoning to practise: designing a structure where lookup AND \"move to most recent\" AND \"evict oldest\" are all O(1) — a hash map pointing into a doubly linked list.\n\nInput\nLine 1: capacity q\nNext q lines: an operation\n\nOutput\nOne line per GET: the value or -1.",
    "constraints": "1 <= capacity <= 10000\n1 <= q <= 100000\n0 <= key, value <= 10^9\nThere is at least one GET.",
    "hints": [
      "A list ordered by recent use makes eviction easy but lookup slow; a hash map is the opposite. What if you used both?",
      "To move a node to the front in O(1) you must be able to unlink it from the middle. What kind of list allows that?",
      "Hash map key -> node in a doubly linked list (most recent at one end). GET/PUT unlink and re-insert at the recent end; on overflow remove the node at the other end and delete its key from the map."
    ],
    "expectedTimeComplexity": "O(1) per operation",
    "expectedSpaceComplexity": "O(capacity)",
    "starterCode": "import sys\n\ndef main():\n    lines = sys.stdin.read().split('\\n')\n    capacity, q = map(int, lines[0].split())\n    for line in lines[1:1 + q]:\n        parts = line.split()\n        # parts is ['PUT', key, value] or ['GET', key]\n\nmain()\n",
    "referenceSolution": "import sys\n\nclass Node:\n    __slots__ = ('key', 'val', 'prev', 'next')\n    def __init__(self, key=0, val=0):\n        self.key, self.val, self.prev, self.next = key, val, None, None\n\ndef main():\n    lines = sys.stdin.read().split('\\n')\n    capacity, q = map(int, lines[0].split())\n    head, tail = Node(), Node()          # head.next = most recent, tail.prev = least recent\n    head.next, tail.prev = tail, head\n    index = {}\n    out = []\n\n    def unlink(node):\n        node.prev.next, node.next.prev = node.next, node.prev\n\n    def push_front(node):\n        node.prev, node.next = head, head.next\n        head.next.prev = node\n        head.next = node\n\n    for line in lines[1:1 + q]:\n        parts = line.split()\n        if parts[0] == 'GET':\n            node = index.get(int(parts[1]))\n            if node is None:\n                out.append('-1')\n            else:\n                unlink(node)\n                push_front(node)\n                out.append(str(node.val))\n        else:\n            key, val = int(parts[1]), int(parts[2])\n            node = index.get(key)\n            if node is not None:\n                node.val = val\n                unlink(node)\n                push_front(node)\n            else:\n                if len(index) == capacity:\n                    lru = tail.prev\n                    unlink(lru)\n                    del index[lru.key]\n                node = Node(key, val)\n                index[key] = node\n                push_front(node)\n    print(\"\\n\".join(out))\n\nmain()\n",
    "examples": [
      {
        "input": "2 9\nPUT 1 1\nPUT 2 2\nGET 1\nPUT 3 3\nGET 2\nPUT 4 4\nGET 1\nGET 3\nGET 4\n",
        "expectedOutput": "1\n-1\n-1\n3\n4",
        "explanation": "GET 1 makes key 1 recent, so PUT 3 evicts key 2; PUT 4 then evicts key 1."
      },
      {
        "input": "1 4\nPUT 5 50\nGET 5\nPUT 6 60\nGET 5\n",
        "expectedOutput": "50\n-1",
        "explanation": "Capacity 1: adding key 6 evicts key 5."
      },
      {
        "input": "2 5\nPUT 1 10\nPUT 1 20\nGET 1\nPUT 2 30\nGET 1\n",
        "expectedOutput": "20\n20",
        "explanation": "Updating an existing key changes its value and does not evict anything."
      }
    ],
    "testCases": [
      {
        "input": "2 9\nPUT 1 1\nPUT 2 2\nGET 1\nPUT 3 3\nGET 2\nPUT 4 4\nGET 1\nGET 3\nGET 4\n",
        "expectedOutput": "1\n-1\n-1\n3\n4",
        "hidden": false
      },
      {
        "input": "1 4\nPUT 5 50\nGET 5\nPUT 6 60\nGET 5\n",
        "expectedOutput": "50\n-1",
        "hidden": false
      },
      {
        "input": "2 5\nPUT 1 10\nPUT 1 20\nGET 1\nPUT 2 30\nGET 1\n",
        "expectedOutput": "20\n20",
        "hidden": false
      },
      {
        "input": "3 1\nGET 1\n",
        "expectedOutput": "-1",
        "hidden": true
      },
      {
        "input": "2 7\nPUT 1 1\nPUT 2 2\nPUT 1 100\nPUT 3 3\nGET 1\nGET 2\nGET 3\n",
        "expectedOutput": "100\n-1\n3",
        "hidden": true
      },
      {
        "input": "3 10\nPUT 1 1\nPUT 2 2\nPUT 3 3\nGET 1\nGET 2\nPUT 4 4\nGET 3\nGET 1\nGET 2\nGET 4\n",
        "expectedOutput": "1\n2\n-1\n1\n2\n4",
        "hidden": true
      },
      {
        "input": "2 8\nPUT 0 0\nPUT 1000000000 1000000000\nGET 1000000000\nPUT 7 7\nGET 0\nGET 7\nGET 1000000000\nGET 8\n",
        "expectedOutput": "1000000000\n-1\n7\n1000000000\n-1",
        "hidden": true
      }
    ]
  },
  {
    "order": 30,
    "title": "API Rate Limiter",
    "category": "Design",
    "difficulty": "hard",
    "xp": 150,
    "estimatedMinutes": 30,
    "statement": "An API allows each user at most L requests in any sliding window of W seconds. Requests arrive as \"t user\" with non-decreasing timestamps t (in seconds). A request at time t is ALLOWED if that user has fewer than L allowed requests with timestamps in (t - W, t]; otherwise it is DENIED. Denied requests do not count toward the limit.\n\nReasoning to practise: a sliding-window log per user — expire old entries from the front, check the size, append to the back. This is a real system-design interview question.\n\nInput\nLine 1: L W q\nNext q lines: t user\n\nOutput\nOne line per request: ALLOW or DENY.",
    "constraints": "1 <= L <= 1000\n1 <= W <= 10^6\n1 <= q <= 100000\n0 <= t <= 10^9, non-decreasing\nuser is a word of letters and digits.",
    "hints": [
      "For one user at time t, which of their earlier requests still matter?",
      "Requests leave the window in the same order they entered it. Which structure lets you drop the oldest and add the newest cheaply?",
      "Per user keep a queue of ALLOWED timestamps. On a request, pop from the front while front <= t - W; if the size is < L, append t and print ALLOW, otherwise print DENY."
    ],
    "expectedTimeComplexity": "O(q) amortised",
    "expectedSpaceComplexity": "O(users * L)",
    "starterCode": "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    L, W, q = int(data[0]), int(data[1]), int(data[2])\n    for i in range(q):\n        t, user = int(data[3 + 2 * i]), data[4 + 2 * i]\n        # Print ALLOW or DENY for this request\n\nmain()\n",
    "referenceSolution": "import sys\nfrom collections import deque, defaultdict\n\ndef main():\n    data = sys.stdin.read().split()\n    L, W, q = int(data[0]), int(data[1]), int(data[2])\n    log = defaultdict(deque)\n    out = []\n    for i in range(q):\n        t, user = int(data[3 + 2 * i]), data[4 + 2 * i]\n        window = log[user]\n        while window and window[0] <= t - W:\n            window.popleft()\n        if len(window) < L:\n            window.append(t)\n            out.append(\"ALLOW\")\n        else:\n            out.append(\"DENY\")\n    print(\"\\n\".join(out))\n\nmain()\n",
    "examples": [
      {
        "input": "2 10 5\n1 alice\n2 alice\n3 alice\n11 alice\n12 alice\n",
        "expectedOutput": "ALLOW\nALLOW\nDENY\nALLOW\nALLOW",
        "explanation": "At t=3 alice already has 2 requests in (-7, 3]: DENY. At t=11 the request from t=1 has expired."
      },
      {
        "input": "1 5 4\n0 a\n0 b\n4 a\n5 a\n",
        "expectedOutput": "ALLOW\nALLOW\nDENY\nALLOW",
        "explanation": "Users are limited separately; at t=5 the request from t=0 is outside (0, 5]."
      },
      {
        "input": "3 100 3\n7 u1\n7 u1\n7 u1\n",
        "expectedOutput": "ALLOW\nALLOW\nALLOW",
        "explanation": "Three requests at the same second, limit 3: all allowed."
      }
    ],
    "testCases": [
      {
        "input": "2 10 5\n1 alice\n2 alice\n3 alice\n11 alice\n12 alice\n",
        "expectedOutput": "ALLOW\nALLOW\nDENY\nALLOW\nALLOW",
        "hidden": false
      },
      {
        "input": "1 5 4\n0 a\n0 b\n4 a\n5 a\n",
        "expectedOutput": "ALLOW\nALLOW\nDENY\nALLOW",
        "hidden": false
      },
      {
        "input": "3 100 3\n7 u1\n7 u1\n7 u1\n",
        "expectedOutput": "ALLOW\nALLOW\nALLOW",
        "hidden": false
      },
      {
        "input": "1 1 3\n5 x\n5 x\n6 x\n",
        "expectedOutput": "ALLOW\nDENY\nALLOW",
        "hidden": true
      },
      {
        "input": "2 3 7\n1 a\n1 b\n2 a\n2 a\n3 b\n4 a\n4 a\n",
        "expectedOutput": "ALLOW\nALLOW\nALLOW\nDENY\nALLOW\nALLOW\nDENY",
        "hidden": true
      },
      {
        "input": "2 1000000 4\n0 bob\n999999 bob\n1000000 bob\n1000001 bob\n",
        "expectedOutput": "ALLOW\nALLOW\nALLOW\nDENY",
        "hidden": true
      },
      {
        "input": "1 10 5\n0 z\n3 z\n9 z\n10 z\n11 z\n",
        "expectedOutput": "ALLOW\nDENY\nDENY\nALLOW\nDENY",
        "hidden": true
      }
    ]
  }
];

/** Structural guarantees the Thinking Lab relies on. Refuses to write anything if one fails. */
export function validateProblems(list: SeedProblem[]): string[] {
  const errors: string[] = [];
  const titles = new Set<string>();
  list.forEach((p, i) => {
    const at = `#${i + 1} ${p.title}`;
    if (p.order !== i + 1) errors.push(`${at}: order ${p.order}, expected ${i + 1}`);
    if (titles.has(p.title)) errors.push(`${at}: duplicate title`);
    titles.add(p.title);
    if (p.hints.length !== 3) errors.push(`${at}: needs exactly 3 hints`);
    if (p.testCases.length < 6) errors.push(`${at}: needs at least 6 test cases`);
    if (p.testCases.filter(t => t.hidden).length < 3) errors.push(`${at}: needs at least 3 hidden test cases`);
    if (p.testCases.some(t => !String(t.expectedOutput).trim())) errors.push(`${at}: empty expected output`);
    if (!p.examples.length) errors.push(`${at}: no examples`);
    if (!p.referenceSolution.trim() || !p.starterCode.trim()) errors.push(`${at}: missing starter or reference`);
  });
  return errors;
}

async function main() {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  if (!tenantId || tenantId.startsWith('--')) {
    console.error('Usage: seedCareerPilotThinkingLab <tenantId> [--apply]');
    process.exit(1);
  }
  const problems = validateProblems(PROBLEMS);
  if (problems.length) {
    console.error('Refusing to seed — the problem set is malformed:\n  ' + problems.join('\n  '));
    process.exit(1);
  }
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) { console.error('MONGODB_URI is not set'); process.exit(1); }
  await mongoose.connect(uri);

  console.log(`\n${apply ? '=== APPLYING ===' : '=== DRY RUN — nothing will be written ==='}  tenant ${tenantId}\n`);

  let created = 0, updated = 0, unchanged = 0;
  for (const p of PROBLEMS) {
    const fields = {
      title: p.title,
      category: p.category,
      difficulty: p.difficulty,
      language: 'python',
      statement: p.statement,
      examples: p.examples,
      constraints: p.constraints,
      starterCode: p.starterCode,
      testCases: p.testCases,
      hints: p.hints,
      referenceSolution: p.referenceSolution,
      expectedTimeComplexity: p.expectedTimeComplexity,
      expectedSpaceComplexity: p.expectedSpaceComplexity,
      xp: p.xp,
      estimatedMinutes: p.estimatedMinutes,
      tags: ['careerpilot-daily', p.category.toLowerCase().replace(/\s+/g, '-')],
      order: p.order,
      audiences: ['careerpilot'],
      source: 'manual',
    };
    const existing: any = await ThinkingProblem.findOne({ tenantId, title: p.title }).lean();
    if (!existing) {
      created++;
      console.log(`  + ${String(p.order).padStart(2)}  ${p.title}  (${p.difficulty}, ${p.category})`);
      if (apply) await ThinkingProblem.create({ tenantId, active: true, ...fields });
      continue;
    }
    const changed = (Object.keys(fields) as (keyof typeof fields)[])
      .filter(k => JSON.stringify(existing[k]) !== JSON.stringify(fields[k]));
    if (!changed.length) { unchanged++; continue; }
    updated++;
    console.log(`  ~ ${String(p.order).padStart(2)}  ${p.title}  [${changed.join(', ')}]`);
    if (apply) await ThinkingProblem.updateOne({ _id: existing._id }, { $set: fields });
  }

  const bank = await ThinkingProblem.countDocuments({ tenantId, active: true, audiences: 'careerpilot' });
  console.log(`\n${PROBLEMS.length} problems: ${created} new, ${updated} updated, ${unchanged} unchanged.`);
  console.log(`Active CareerPilot Thinking Lab bank for this tenant${apply ? '' : ' (before this run)'}: ${bank}`);
  if (!apply) console.log('\nDry run only. Re-run with --apply to write.');
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch(async (e) => {
    console.error(e);
    await mongoose.disconnect().catch(() => undefined);
    process.exit(1);
  });
}
