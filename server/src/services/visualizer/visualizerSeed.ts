/**
 * Starter content for the Code Visualizer library.
 *
 * Every program here stays inside what the Java instrumenter traces today — array literals,
 * for/while, if/else, static methods, System.out. `new int[n]` is not traced yet, so the
 * arrays are written as literals. The test suite instruments every solution below, so a
 * seed that stops being traceable fails CI rather than a student's first click.
 */

export interface SeedItem {
  kind: 'problem' | 'concept';
  title: string;
  slug: string;
  topic: string;
  difficulty: 'beginner' | 'easy' | 'medium' | 'hard';
  summary: string;
  order: number;
  statement?: string;
  examples?: { input: string; output: string; explanation?: string }[];
  constraints?: string;
  breakdown?: {
    plainEnglish: string; input: string; output: string;
    walkthrough: string[]; steps: string[]; edgeCases: string[];
  };
  starterCode?: string;
  solutionCode?: string;
  animation?: 'array_bars' | 'array_cells' | 'none';
  timeComplexity?: string;
  spaceComplexity?: string;
  complexityNote?: string;
  conceptWidget?: string;
  body?: string;
}

export const VISUALIZER_SEED: SeedItem[] = [
  /* ── Concepts ─────────────────────────────────────────────────────────────── */
  {
    kind: 'concept',
    title: 'What is Time Complexity?',
    slug: 'time-complexity',
    topic: 'Foundations',
    difficulty: 'beginner',
    order: 1,
    summary: 'Why some programs slow down badly as the input grows — and how Big-O names that growth.',
    conceptWidget: 'time_complexity',
    timeComplexity: 'O(1), O(log n), O(n), O(n log n), O(n²)',
    body:
      'Time complexity does not measure seconds. Seconds depend on the machine, the language and '
      + 'what else is running. It counts how many basic steps a program takes, and — the part that '
      + 'matters — how that count GROWS when the input gets bigger.\n\n'
      + 'Move the slider to change n, the size of the input. Watch how each kind of algorithm reacts. '
      + 'At n = 10 they all look fast. At n = 1,000 the difference is the gap between a program that '
      + 'answers instantly and one that never finishes.',
  },
  {
    kind: 'concept',
    title: 'What is Space Complexity?',
    slug: 'space-complexity',
    topic: 'Foundations',
    difficulty: 'beginner',
    order: 2,
    summary: 'How much extra memory a program needs, and how the computer lays variables and arrays out.',
    conceptWidget: 'space_complexity',
    spaceComplexity: 'O(1) vs O(n)',
    body:
      'Every variable your program creates takes a box of memory. An int takes 4 bytes in Java; '
      + 'an array of n ints takes n boxes side by side.\n\n'
      + 'Space complexity asks: as the input grows, how much EXTRA memory does the program need? '
      + 'Swapping two numbers needs one spare box (temp) no matter how big the array is — that is '
      + 'O(1). Copying the whole array needs n new boxes — that is O(n). Step through both below.',
  },

  /* ── Problems ─────────────────────────────────────────────────────────────── */
  {
    kind: 'problem',
    title: 'Find the Largest Number',
    slug: 'find-maximum',
    topic: 'Arrays',
    difficulty: 'beginner',
    order: 10,
    summary: 'Walk the array once, remembering the biggest value seen so far.',
    statement:
      'Given an array of integers, print the largest value in it.\n\n'
      + 'Use the array {4, 9, 2, 11, 7}.',
    examples: [{ input: '{4, 9, 2, 11, 7}', output: '11', explanation: '11 is bigger than every other element.' }],
    constraints: '1 ≤ length ≤ 100. Values fit in an int.',
    breakdown: {
      plainEnglish: 'Look at every number once and tell me which one is the biggest.',
      input: 'An array of whole numbers, like {4, 9, 2, 11, 7}.',
      output: 'One number — the largest one in the array.',
      walkthrough: [
        'Start by assuming the first number, 4, is the biggest.',
        'Look at 9. Is 9 > 4? Yes — now the biggest is 9.',
        'Look at 2. Is 2 > 9? No — keep 9.',
        'Look at 11. Is 11 > 9? Yes — now the biggest is 11.',
        'Look at 7. Is 7 > 11? No — keep 11. Done: the answer is 11.',
      ],
      steps: [
        'Store the first element in a variable called max.',
        'Loop from the second element to the end.',
        'If the current element is bigger than max, replace max with it.',
        'After the loop, print max.',
      ],
      edgeCases: [
        'An array with one element — that element is the answer.',
        'All negative numbers — do not start max at 0, or you will print 0 wrongly.',
        'The largest value appears twice — that is fine, it is still the answer.',
      ],
    },
    starterCode:
`public class Main {
    public static void main(String[] args) {
        int[] arr = {4, 9, 2, 11, 7};
        int max = arr[0];
        // TODO: loop through arr and update max

        System.out.println(max);
    }
}
`,
    solutionCode:
`public class Main {
    public static void main(String[] args) {
        int[] arr = {4, 9, 2, 11, 7};
        int max = arr[0];
        for (int i = 1; i < arr.length; i++) {
            if (arr[i] > max) {
                max = arr[i];
            }
        }
        System.out.println(max);
    }
}
`,
    animation: 'array_bars',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    complexityNote: 'Each element is compared once, so n elements cost n − 1 comparisons. Only one extra variable (max) is used, however long the array is.',
  },
  {
    kind: 'problem',
    title: 'Linear Search',
    slug: 'linear-search',
    topic: 'Searching',
    difficulty: 'beginner',
    order: 20,
    summary: 'Check each slot in turn until you find the target.',
    statement:
      'Given an array and a target value, print the index where the target is found, or -1 if it '
      + 'is not in the array.\n\nUse the array {7, 3, 9, 5, 1} and the target 5.',
    examples: [
      { input: 'arr = {7, 3, 9, 5, 1}, target = 5', output: '3', explanation: 'arr[3] is 5.' },
      { input: 'arr = {7, 3, 9, 5, 1}, target = 8', output: '-1', explanation: '8 is not in the array.' },
    ],
    constraints: '1 ≤ length ≤ 100.',
    breakdown: {
      plainEnglish: 'Go through the list one by one. The moment you see the number you want, say where it was.',
      input: 'An array of numbers, and one number to look for (the target).',
      output: 'The position (index) of the target, or -1 if it is not there.',
      walkthrough: [
        'Index 0 holds 7. Is 7 == 5? No.',
        'Index 1 holds 3. Is 3 == 5? No.',
        'Index 2 holds 9. Is 9 == 5? No.',
        'Index 3 holds 5. Is 5 == 5? Yes — the answer is 3. Stop looking.',
      ],
      steps: [
        'Set a result variable to -1 (meaning "not found yet").',
        'Loop over every index i.',
        'If arr[i] equals the target, store i in result and stop the loop.',
        'Print result.',
      ],
      edgeCases: [
        'The target is the very first element — the answer is 0, not 1.',
        'The target is not present — print -1.',
        'The target appears twice — print the FIRST index.',
      ],
    },
    starterCode:
`public class Main {
    public static void main(String[] args) {
        int[] arr = {7, 3, 9, 5, 1};
        int target = 5;
        int result = -1;
        // TODO: find target and store its index in result

        System.out.println(result);
    }
}
`,
    solutionCode:
`public class Main {
    public static void main(String[] args) {
        int[] arr = {7, 3, 9, 5, 1};
        int target = 5;
        int result = -1;
        for (int i = 0; i < arr.length; i++) {
            if (arr[i] == target) {
                result = i;
                break;
            }
        }
        System.out.println(result);
    }
}
`,
    animation: 'array_cells',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    complexityNote: 'In the worst case — target missing or last — every element is checked once. Best case is 1 check, when the target is first.',
  },
  {
    kind: 'problem',
    title: 'Reverse an Array',
    slug: 'reverse-array',
    topic: 'Two Pointers',
    difficulty: 'easy',
    order: 30,
    summary: 'Swap from both ends toward the middle — the classic two-pointer move.',
    statement:
      'Reverse the array in place (without making a new array) and print it.\n\n'
      + 'Use the array {1, 2, 3, 4, 5, 6}.',
    examples: [{ input: '{1, 2, 3, 4, 5, 6}', output: '6 5 4 3 2 1' }],
    constraints: '1 ≤ length ≤ 100. Do not create a second array.',
    breakdown: {
      plainEnglish: 'Flip the order of the numbers, using only the array you were given.',
      input: 'An array of numbers.',
      output: 'The same numbers, last first, printed with spaces.',
      walkthrough: [
        'Put one finger on the first number (1) and one on the last (6). Swap them: {6,2,3,4,5,1}.',
        'Move both fingers inward: 2 and 5. Swap: {6,5,3,4,2,1}.',
        'Move inward again: 3 and 4. Swap: {6,5,4,3,2,1}.',
        'The fingers have met in the middle — stop.',
      ],
      steps: [
        'left = 0, right = last index.',
        'While left < right: swap arr[left] and arr[right] using a temp variable.',
        'Move left forward by one and right back by one.',
        'Print the array.',
      ],
      edgeCases: [
        'An odd-length array — the middle element stays where it is.',
        'One element — nothing to swap.',
        'Using left <= right instead of < swaps the middle element with itself: harmless, but wasted work.',
      ],
    },
    starterCode:
`public class Main {
    public static void main(String[] args) {
        int[] arr = {1, 2, 3, 4, 5, 6};
        int left = 0;
        int right = arr.length - 1;
        // TODO: swap from both ends toward the middle

        for (int i = 0; i < arr.length; i++) {
            System.out.print(arr[i] + " ");
        }
    }
}
`,
    solutionCode:
`public class Main {
    public static void main(String[] args) {
        int[] arr = {1, 2, 3, 4, 5, 6};
        int left = 0;
        int right = arr.length - 1;
        while (left < right) {
            int temp = arr[left];
            arr[left] = arr[right];
            arr[right] = temp;
            left = left + 1;
            right = right - 1;
        }
        for (int i = 0; i < arr.length; i++) {
            System.out.print(arr[i] + " ");
        }
    }
}
`,
    animation: 'array_cells',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    complexityNote: 'n/2 swaps, and n/2 is still O(n). The only extra memory is temp, left and right — the same three boxes for any size of array.',
  },
  {
    kind: 'problem',
    title: 'Bubble Sort',
    slug: 'bubble-sort',
    topic: 'Sorting',
    difficulty: 'easy',
    order: 40,
    summary: 'Compare neighbours and swap them until the biggest values bubble to the end.',
    statement:
      'Sort the array in ascending order using bubble sort, then print it.\n\n'
      + 'Use the array {12, 5, 3, 8, 2, 10}.',
    examples: [{ input: '{12, 5, 3, 8, 2, 10}', output: '2 3 5 8 10 12' }],
    constraints: '1 ≤ length ≤ 50.',
    breakdown: {
      plainEnglish: 'Keep comparing each pair of neighbours. If the left one is bigger, swap them. Repeat until nothing is out of order.',
      input: 'An unsorted array of numbers.',
      output: 'The same numbers from smallest to largest, printed with spaces.',
      walkthrough: [
        'Pass 1: compare 12 and 5 → swap. 12 and 3 → swap. 12 and 8 → swap. 12 and 2 → swap. 12 and 10 → swap. Now 12 is at the end, in its final place.',
        'Pass 2: do the same for the rest. 10 ends up second from the end.',
        'Each pass puts one more big number in its final place.',
        'After n − 1 passes, everything is sorted.',
      ],
      steps: [
        'Outer loop i from 0 to n − 2: one pass per iteration.',
        'Inner loop j from 0 to n − 2 − i: the last i elements are already sorted, so skip them.',
        'If arr[j] > arr[j + 1], swap them with a temp variable.',
        'Print the array.',
      ],
      edgeCases: [
        'Inner loop running to j < n instead of n − 1 − i reads arr[j + 1] past the end — ArrayIndexOutOfBounds.',
        'An already-sorted array still does every comparison in this simple version.',
        'Equal values are not swapped (> not >=), so bubble sort is stable.',
      ],
    },
    starterCode:
`public class Main {
    public static void main(String[] args) {
        int[] arr = {12, 5, 3, 8, 2, 10};
        int n = arr.length;
        // TODO: bubble sort arr

        for (int i = 0; i < n; i++) {
            System.out.print(arr[i] + " ");
        }
    }
}
`,
    solutionCode:
`public class Main {
    public static void main(String[] args) {
        int[] arr = {12, 5, 3, 8, 2, 10};
        int n = arr.length;
        for (int i = 0; i < n - 1; i++) {
            for (int j = 0; j < n - 1 - i; j++) {
                if (arr[j] > arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                }
            }
        }
        for (int i = 0; i < n; i++) {
            System.out.print(arr[i] + " ");
        }
    }
}
`,
    animation: 'array_bars',
    timeComplexity: 'O(n²)',
    spaceComplexity: 'O(1)',
    complexityNote: 'Two nested loops: about n × n / 2 comparisons. For 6 elements that is 15; for 1,000 elements it is nearly 500,000. Sorting happens in place, so the only extra memory is temp.',
  },
  {
    kind: 'problem',
    title: 'Binary Search',
    slug: 'binary-search',
    topic: 'Searching',
    difficulty: 'easy',
    order: 50,
    summary: 'Halve a sorted range every step — why log n beats n.',
    statement:
      'Given a SORTED array and a target, print the index of the target using binary search, or -1 if '
      + 'it is not present.\n\nUse {2, 5, 8, 12, 16, 23, 38, 56, 72, 91} and the target 23.',
    examples: [{ input: 'arr = {2, 5, 8, 12, 16, 23, 38, 56, 72, 91}, target = 23', output: '5' }],
    constraints: 'The array is sorted ascending. 1 ≤ length ≤ 1000.',
    breakdown: {
      plainEnglish: 'Like finding a word in a dictionary: open the middle, decide which half the word must be in, and throw the other half away.',
      input: 'A sorted array and a target number.',
      output: 'The index of the target, or -1.',
      walkthrough: [
        'Range is index 0..9. Middle is 4, holding 16. 23 > 16, so it must be on the right: range becomes 5..9.',
        'Middle of 5..9 is 7, holding 56. 23 < 56, so go left: range becomes 5..6.',
        'Middle of 5..6 is 5, holding 23. Found it at index 5 — in 3 steps, not 6.',
      ],
      steps: [
        'low = 0, high = last index.',
        'While low <= high: mid = (low + high) / 2.',
        'If arr[mid] == target, that is the answer.',
        'If arr[mid] < target, move low to mid + 1; otherwise move high to mid − 1.',
        'If the loop ends, the target is not there: -1.',
      ],
      edgeCases: [
        'The array MUST be sorted, or binary search gives wrong answers silently.',
        'Using low < high instead of <= misses a target in a one-element range.',
        'Forgetting the + 1 / − 1 when moving low or high can loop forever.',
      ],
    },
    starterCode:
`public class Main {
    public static void main(String[] args) {
        int[] arr = {2, 5, 8, 12, 16, 23, 38, 56, 72, 91};
        int target = 23;
        int low = 0;
        int high = arr.length - 1;
        int result = -1;
        // TODO: binary search

        System.out.println(result);
    }
}
`,
    solutionCode:
`public class Main {
    public static void main(String[] args) {
        int[] arr = {2, 5, 8, 12, 16, 23, 38, 56, 72, 91};
        int target = 23;
        int low = 0;
        int high = arr.length - 1;
        int result = -1;
        while (low <= high) {
            int mid = (low + high) / 2;
            if (arr[mid] == target) {
                result = mid;
                break;
            } else if (arr[mid] < target) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        System.out.println(result);
    }
}
`,
    animation: 'array_cells',
    timeComplexity: 'O(log n)',
    spaceComplexity: 'O(1)',
    complexityNote: 'Each step throws away half of what is left. 10 elements need at most 4 steps; 1,000,000 elements need at most 20.',
  },
];
