import { ProgrammingLanguage } from '../models/Assignment';
import { withExecutionSlot, isQueueTimeout } from './executionQueue';

interface ExecutionInput {
  code: string;
  language: ProgrammingLanguage;
  input: string;
  expectedOutput: string;
  timeLimit: number;  // in ms
  memoryLimit: number; // in MB
  comparisonMode?: 'lenient' | 'exact' | 'case_insensitive' | 'numeric';
}

interface ExecutionResult {
  passed: boolean;
  output: string;
  error?: string;
  executionTime: number; // in ms
  memoryUsed: number; // in MB
  compilationError?: string;
}

/**
 * Code Runner Service
 * 
 * For real code execution, self-host Piston (already in docker-compose.yml as
 * the `piston` service). After it is up, install the language runtimes once:
 *   ./scripts/piston-init.sh
 * The server reaches it via PISTON_URL=http://piston:2000/api/v2 (set in compose).
 *
 * Falls back to smart simulation mode if no Piston URL configured. Simulation
 * does NOT run real code — it pattern-matches common problems — so always use
 * Piston for trustworthy output/grading.
 */
class CodeRunnerService {
  private pistonUrl: string | null;
  private useRealExecution: boolean;

  constructor() {
    // Only use real execution if PISTON_URL is explicitly set to a local instance
    this.pistonUrl = process.env.PISTON_URL || null;
    this.useRealExecution = !!this.pistonUrl && !this.pistonUrl.includes('emkc.org');
    
    if (this.useRealExecution) {
      console.log('🚀 [CODE RUNNER] Using Piston API at:', this.pistonUrl);
    } else {
      console.log('⚠️ [CODE RUNNER] Using simulation mode. Set PISTON_URL for real execution.');
    }
  }

  async execute(input: ExecutionInput): Promise<ExecutionResult> {
    // HTML / CSS are markup, not executable programs. Piston has no runtime for
    // them ("html-5 runtime is unknown"), so never send them there — grade them
    // by comparing the rendered markup/structure against the expected output.
    if (input.language === ProgrammingLanguage.HTML || input.language === ProgrammingLanguage.CSS) {
      return this.evaluateMarkup(input);
    }
    if (this.useRealExecution && this.pistonUrl) {
      return this.executeWithPiston(input);
    }
    return this.simulateExecution(input);
  }

  /**
   * Grade HTML/CSS (web) submissions without code execution.
   *
   * There is no browser/DOM on the server, so we can't render the page. Instead
   * we check that the student's markup contains the structure (tags) and the
   * visible data (text) described by the test case's expected output. This is
   * forgiving about whitespace, attributes, casing and ordering, while still
   * verifying the required elements and content are present.
   */
  private evaluateMarkup(input: ExecutionInput): ExecutionResult {
    const { code, expectedOutput } = input;

    // No expected output configured → nothing to assert against; treat as a pass
    // so the student at least sees their markup echoed back.
    if (!expectedOutput || !expectedOutput.trim()) {
      return { passed: true, output: code || '', executionTime: 1, memoryUsed: 0 };
    }

    if (!code || !code.trim()) {
      return { passed: false, output: '', error: 'No markup submitted', executionTime: 0, memoryUsed: 0 };
    }

    // Visible text content (tags stripped), normalized for comparison
    const textOf = (s: string) =>
      s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    const codeLower = code.toLowerCase();
    const expectedText = textOf(expectedOutput);
    const actualText = textOf(code);

    // 1) Every meaningful token from the expected output must appear in the markup
    const tokens = expectedText.split(' ').filter(t => t.length > 0);
    const missingTokens = tokens.filter(t => !actualText.includes(t));

    // 2) Every HTML tag used in the expected output must appear in the markup
    const expectedTags = Array.from(expectedOutput.matchAll(/<\s*([a-zA-Z][a-zA-Z0-9]*)/g)).map(m => m[1].toLowerCase());
    const requiredTags = Array.from(new Set(expectedTags));
    const missingTags = requiredTags.filter(t => !new RegExp(`<\\s*${t}[\\s/>]`).test(codeLower));

    const passed = missingTokens.length === 0 && missingTags.length === 0;

    let error: string | undefined;
    if (!passed) {
      const parts: string[] = [];
      if (missingTags.length) parts.push(`missing element(s): ${missingTags.map(t => `<${t}>`).join(', ')}`);
      if (missingTokens.length) parts.push(`missing content: ${missingTokens.slice(0, 8).join(', ')}${missingTokens.length > 8 ? '…' : ''}`);
      error = `Output does not match the expected structure — ${parts.join('; ')}`;
    }

    return { passed, output: code, executionTime: 1, memoryUsed: 0, error };
  }

  // Smart simulation - tries to understand the code logic
  private async simulateExecution(input: ExecutionInput): Promise<ExecutionResult> {
    const { code, language, input: stdin, expectedOutput } = input;

    // Simulate execution time
    const executionTime = Math.floor(Math.random() * 150) + 20;
    const memoryUsed = Math.floor(Math.random() * 30) + 10;

    try {
      // First check for syntax errors
      const syntaxError = this.checkSyntaxErrors(code, language);
      if (syntaxError) {
        return {
          passed: false,
          output: '',
          compilationError: syntaxError,
          executionTime: 0,
          memoryUsed: 0
        };
      }

      // Try to simulate the output based on code analysis
      const simulatedOutput = this.analyzeAndSimulate(code, language, stdin);
      
      const normalizedExpected = this.normalizeOutput(expectedOutput);
      const normalizedActual = this.normalizeOutput(simulatedOutput);
      
      return {
        passed: normalizedExpected === normalizedActual,
        output: simulatedOutput,
        executionTime,
        memoryUsed
      };
    } catch (error) {
      return {
        passed: false,
        output: '',
        error: error instanceof Error ? error.message : 'Simulation error',
        executionTime: 0,
        memoryUsed: 0
      };
    }
  }

  // Basic syntax error checking
  private checkSyntaxErrors(code: string, language: ProgrammingLanguage): string | null {
    // Check for balanced braces/brackets/parentheses
    const balanceError = this.checkBracketBalance(code);
    if (balanceError) return balanceError;

    // Language-specific checks
    switch (language) {
      case ProgrammingLanguage.JAVA:
        return this.checkJavaSyntax(code);
      case ProgrammingLanguage.C:
      case ProgrammingLanguage.CPP:
        return this.checkCSyntax(code);
      case ProgrammingLanguage.PYTHON:
        return this.checkPythonSyntax(code);
      case ProgrammingLanguage.JAVASCRIPT:
      case ProgrammingLanguage.TYPESCRIPT:
        return this.checkJSSyntax(code);
      default:
        return null;
    }
  }

  // Check bracket balance
  private checkBracketBalance(code: string): string | null {
    // Remove strings and comments to avoid false positives
    const cleaned = code
      .replace(/"(?:[^"\\]|\\.)*"/g, '""')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');

    const stack: string[] = [];
    const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
    const opens = new Set(['(', '[', '{']);

    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];
      if (opens.has(char)) {
        stack.push(char);
      } else if (pairs[char]) {
        if (stack.length === 0 || stack.pop() !== pairs[char]) {
          return `Syntax Error: Unmatched '${char}' at position ${i}`;
        }
      }
    }

    if (stack.length > 0) {
      const unclosed = stack[stack.length - 1];
      return `Syntax Error: Unclosed '${unclosed}'`;
    }

    return null;
  }

  // Java-specific syntax checks
  private checkJavaSyntax(code: string): string | null {
    // Check for loops with missing semicolons: for(int i = 0 i < n; i++)
    const forLoopPattern = /for\s*\(\s*(?:int|long|float|double|var)\s+\w+\s*=\s*[^;]+\s+\w+\s*[<>=!]/;
    if (forLoopPattern.test(code)) {
      return 'Syntax Error: Missing semicolon in for loop initialization';
    }

    // Check for missing semicolons after statements (but not after braces)
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Skip empty lines, comments, lines ending with { } or starting with keywords
      if (!line || 
          line.startsWith('//') || 
          line.startsWith('/*') ||
          line.startsWith('*') ||
          line.endsWith('{') || 
          line.endsWith('}') ||
          line.endsWith(',') ||
          line.startsWith('import') ||
          line.startsWith('package') ||
          line.startsWith('public class') ||
          line.startsWith('class') ||
          line.startsWith('if') ||
          line.startsWith('else') ||
          line.startsWith('for') ||
          line.startsWith('while') ||
          line.startsWith('try') ||
          line.startsWith('catch') ||
          line.startsWith('@')) {
        continue;
      }
    }

    // Check for class name not matching Main (common requirement)
    if (!code.includes('class Main') && !code.includes('class Solution')) {
      // Just a warning, not an error for now
    }

    return null;
  }

  // C/C++ syntax checks
  private checkCSyntax(code: string): string | null {
    // Check for loops with missing semicolons
    const forLoopPattern = /for\s*\(\s*(?:int|long|float|double|auto)\s+\w+\s*=\s*[^;]+\s+\w+\s*[<>=!]/;
    if (forLoopPattern.test(code)) {
      return 'Syntax Error: Missing semicolon in for loop initialization';
    }
    return null;
  }

  // Python syntax checks
  private checkPythonSyntax(code: string): string | null {
    // Check for using { } instead of indentation
    if (code.includes('{') && !code.includes('dict') && !code.includes('set')) {
      // Might be using C-style braces
    }

    // Check for missing colons after if/for/while/def/class
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trimEnd();
      const trimmed = line.trim();
      if ((trimmed.startsWith('if ') || 
           trimmed.startsWith('elif ') ||
           trimmed.startsWith('else') ||
           trimmed.startsWith('for ') ||
           trimmed.startsWith('while ') ||
           trimmed.startsWith('def ') ||
           trimmed.startsWith('class ')) && 
          !trimmed.endsWith(':') && 
          !trimmed.includes('#')) {
        return `Syntax Error: Missing colon at line ${i + 1}: "${trimmed}"`;
      }
    }

    // Check for using semicolons
    if (code.includes(';') && !code.includes('";') && !code.includes("';")) {
      // Just a style warning - semicolons are valid in Python
    }

    return null;
  }

  // JavaScript/TypeScript syntax checks
  private checkJSSyntax(code: string): string | null {
    // Check for common JS mistakes
    // Missing closing parenthesis in arrow functions
    const arrowCount = (code.match(/=>/g) || []).length;
    if (arrowCount > 0) {
      // Basic check - could be expanded
    }
    return null;
  }

  // Analyze code and try to produce simulated output
  private analyzeAndSimulate(code: string, language: ProgrammingLanguage, input: string): string {
    const codeLower = code.toLowerCase();
    const inputTrimmed = input.trim();
    const inputNum = parseInt(inputTrimmed, 10);
    
    // ============================================
    // Prime Number Detection
    // ============================================
    if (codeLower.includes('prime') || 
        codeLower.includes('isprime') || 
        codeLower.includes('is_prime') ||
        (codeLower.includes('%') && codeLower.includes('for') && codeLower.includes('sqrt'))) {
      
      if (!isNaN(inputNum)) {
        const isPrime = this.checkPrime(inputNum);
        
        // Detect output format from code
        if (code.includes('"Prime"') || code.includes("'Prime'")) {
          return isPrime ? 'Prime' : 'Not Prime';
        }
        if (code.includes('"prime"') || code.includes("'prime'")) {
          return isPrime ? 'prime' : 'not prime';
        }
        if (code.includes('Yes') || code.includes('YES')) {
          return isPrime ? 'Yes' : 'No';
        }
        if (code.includes('true') || code.includes('True')) {
          return isPrime ? 'true' : 'false';
        }
        // Default format
        return isPrime ? 'Prime' : 'Not Prime';
      }
    }

    // ============================================
    // Even/Odd Detection
    // ============================================
    if ((codeLower.includes('even') || codeLower.includes('odd')) && 
        (codeLower.includes('%') || codeLower.includes('mod'))) {
      if (!isNaN(inputNum)) {
        const isEven = inputNum % 2 === 0;
        if (code.includes('Even') || code.includes('Odd')) {
          return isEven ? 'Even' : 'Odd';
        }
        return isEven ? 'even' : 'odd';
      }
    }

    // ============================================
    // Fibonacci Detection
    // ============================================
    if (codeLower.includes('fibonacci') || codeLower.includes('fib')) {
      if (!isNaN(inputNum) && inputNum >= 0 && inputNum <= 30) {
        return String(this.fibonacci(inputNum));
      }
    }

    // ============================================
    // Factorial Detection
    // ============================================
    if (codeLower.includes('factorial') || codeLower.includes('fact')) {
      if (!isNaN(inputNum) && inputNum >= 0 && inputNum <= 20) {
        return String(this.factorial(inputNum));
      }
    }

    // ============================================
    // Remove Duplicates from Array
    // ============================================
    if (codeLower.includes('duplicate') || codeLower.includes('unique') || 
        codeLower.includes('linkedhashset') || codeLower.includes('set<')) {
      const arrayMatch = inputTrimmed.match(/^\[(.+)\]$/);
      if (arrayMatch) {
        try {
          const elements = arrayMatch[1].split(',').map(s => s.trim());
          const uniqueElements = [...new Set(elements)];
          return '[' + uniqueElements.join(', ') + ']';
        } catch (e) {
          // Continue to fallback
        }
      }
    }

    // ============================================
    // Reverse String Detection
    // ============================================
    if (codeLower.includes('reverse') && !codeLower.includes('array')) {
      if (inputTrimmed && !inputTrimmed.startsWith('[')) {
        return inputTrimmed.split('').reverse().join('');
      }
    }

    // ============================================
    // Palindrome Detection
    // ============================================
    if (codeLower.includes('palindrome')) {
      if (inputTrimmed) {
        const cleaned = inputTrimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
        const isPalindrome = cleaned === cleaned.split('').reverse().join('');
        if (code.includes('true') || code.includes('True') || code.includes('false')) {
          return isPalindrome ? 'true' : 'false';
        }
        return isPalindrome ? 'Yes' : 'No';
      }
    }

    // ============================================
    // Second Largest Element
    // ============================================
    if (codeLower.includes('second') && (codeLower.includes('largest') || codeLower.includes('max'))) {
      const arrayMatch = inputTrimmed.match(/^\[(.+)\]$/);
      if (arrayMatch) {
        try {
          const nums = arrayMatch[1].split(',').map(s => parseInt(s.trim(), 10));
          const uniqueSorted = [...new Set(nums)].sort((a, b) => b - a);
          if (uniqueSorted.length >= 2) {
            return String(uniqueSorted[1]);
          }
        } catch (e) {
          // Continue to fallback
        }
      }
    }

    // ============================================
    // Binary Search
    // ============================================
    if (codeLower.includes('binary') && codeLower.includes('search')) {
      // Input format: [1,2,3,4,5],3
      const bsMatch = inputTrimmed.match(/^\[(.+)\],\s*(\d+)$/);
      if (bsMatch) {
        try {
          const nums = bsMatch[1].split(',').map(s => parseInt(s.trim(), 10));
          const target = parseInt(bsMatch[2], 10);
          const index = nums.indexOf(target);
          return String(index);
        } catch (e) {
          // Continue to fallback
        }
      }
    }

    // ============================================
    // Two Sum Problem
    // ============================================
    if (codeLower.includes('two') && codeLower.includes('sum')) {
      const twoSumMatch = inputTrimmed.match(/^\[(.+)\],\s*(\d+)$/);
      if (twoSumMatch) {
        try {
          const nums = twoSumMatch[1].split(',').map(s => parseInt(s.trim(), 10));
          const target = parseInt(twoSumMatch[2], 10);
          for (let i = 0; i < nums.length; i++) {
            for (let j = i + 1; j < nums.length; j++) {
              if (nums[i] + nums[j] === target) {
                return '[' + i + ', ' + j + ']';
              }
            }
          }
          return '[-1, -1]';
        } catch (e) {
          // Continue to fallback
        }
      }
    }

    // ============================================
    // Reverse Array/Linked List
    // ============================================
    if (codeLower.includes('reverse') && (codeLower.includes('array') || codeLower.includes('list') || codeLower.includes('linked'))) {
      const arrayMatch = inputTrimmed.match(/^\[(.+)\]$/);
      if (arrayMatch) {
        try {
          const elements = arrayMatch[1].split(',').map(s => s.trim());
          return '[' + elements.reverse().join(', ') + ']';
        } catch (e) {
          // Continue to fallback
        }
      }
    }

    // Fallback to pattern extraction
    return this.extractSimulatedOutput(code, language, input);
  }

  // Helper: Check if number is prime
  private checkPrime(n: number): boolean {
    if (n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;
    for (let i = 5; i * i <= n; i += 6) {
      if (n % i === 0 || n % (i + 2) === 0) return false;
    }
    return true;
  }

  // Helper: Calculate fibonacci
  private fibonacci(n: number): number {
    if (n <= 1) return n;
    let a = 0, b = 1;
    for (let i = 2; i <= n; i++) {
      const temp = a + b;
      a = b;
      b = temp;
    }
    return b;
  }

  // Helper: Calculate factorial
  private factorial(n: number): number {
    if (n <= 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  }

  /**
   * Real execution, behind the concurrency cap.
   *
   * Everything that reaches Piston goes through here, so the cap is global: assignments,
   * the Practice Lab and drills all draw from the same pool of slots rather than each
   * having their own and collectively overwhelming the box.
   */
  private async executeWithPiston(input: ExecutionInput): Promise<ExecutionResult> {
    try {
      return await withExecutionSlot(() => this.executeOnPiston(input));
    } catch (e: any) {
      if (isQueueTimeout(e)) {
        // Say what actually happened. The old code called every kill a time limit and
        // told students to look for an infinite loop in code that had none.
        return {
          passed: false, output: '',
          error: 'The server is busy right now — too many programs running at once. Wait a few seconds and press Run again. Your code has not been changed.',
          executionTime: 0, memoryUsed: 0,
        };
      }
      throw e;
    }
  }

  private async executeOnPiston(input: ExecutionInput): Promise<ExecutionResult> {
    const { code, language, input: stdin, expectedOutput, timeLimit } = input;
    const startedAt = Date.now();

    try {
      const pistonLanguage = this.mapToPistonLanguage(language);
      
      // For Java, filename MUST match the public class name or Piston fails to compile
      let fileName: string | undefined;
      if (language === ProgrammingLanguage.JAVA) {
        const classMatch = code.match(/public\s+class\s+(\w+)/);
        fileName = classMatch ? `${classMatch[1]}.java` : 'Main.java';
      }
      
      // On this Piston build, compiled languages (Java/C++/…) compile INSIDE the
      // run stage, and a cold javac+JVM start alone can use ~13-14s of CPU. So run
      // limits must be generous enough to cover compilation, otherwise the job is
      // SIGKILLed mid-run ("Killed") AFTER printing output and a correct solution
      // is scored 0. A clean Java run measured ~13.5s CPU, so floor at 20s and
      // allow up to 30s (matches PISTON_RUN_* caps in docker-compose) rather than
      // the per-test timeLimit, which is far too small for compiled languages.
      const runLimit = Math.min(Math.max(timeLimit || 5000, 20000), 30000);
      const requestBody = {
        language: pistonLanguage.language,
        version: pistonLanguage.version,
        files: [{ name: fileName, content: code }],
        stdin: stdin || '',
        run_timeout: runLimit,
        run_cpu_time: runLimit,
        // Must not exceed Piston's configured caps (PISTON_COMPILE_* = 20000),
        // or Piston rejects the request with HTTP 400.
        compile_timeout: 20000,
        compile_cpu_time: 20000,
      };

      console.log('[PISTON] Request:', JSON.stringify({
        language: requestBody.language,
        version: requestBody.version,
        fileName,
        codeLength: code?.length,
        stdin: stdin?.substring(0, 50),
        run_timeout: requestBody.run_timeout
      }));

      const response = await fetch(`${this.pistonUrl}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        // Piston refuses with 429 when its own job limit is reached. That is the sandbox
        // saying "busy", not the student's code failing, and it must not surface as a
        // scary API error.
        if (response.status === 429) {
          return {
            passed: false, output: '',
            error: 'The server is busy right now — too many programs running at once. Wait a few seconds and press Run again.',
            executionTime: Date.now() - startedAt, memoryUsed: 0,
          };
        }
        console.error('[PISTON] Error response:', response.status, errorBody);
        throw new Error(`Piston API error: ${response.statusText} - ${errorBody}`);
      }

      const result: any = await response.json();

      // Compilation errors from the dedicated compile stage
      if (result.compile && result.compile.code !== 0) {
        return {
          passed: false,
          output: '',
          compilationError: result.compile.stderr || result.compile.output || 'Compilation failed',
          executionTime: 0,
          memoryUsed: 0
        };
      }

      const runStderr = (result.run.stderr || '').trim();

      // Run stage failed or was killed
      if (result.run.code !== 0 || result.run.signal) {
        // Some packages (Java) compile in the run stage and report compile
        // failures via run.stderr — surface those as a compilation error.
        if (/\berror:|compilation failed|cannot find symbol|';' expected|is public, should be declared/i.test(runStderr)) {
          return {
            passed: false,
            output: '',
            compilationError: runStderr,
            executionTime: 0,
            memoryUsed: 0
          };
        }

        const elapsed = Date.now() - startedAt;
        const killed = !!result.run.signal || result.run.code === null;

        /**
         * A SIGKILL means "we stopped it", not "it looped forever".
         *
         * Under load a correct program is killed for being slow, and the old message
         * accused the student of an infinite loop — so they hunted a bug that did not
         * exist and reported the product as broken. A program that produced output before
         * dying, or that died well under the limit, was starved of CPU, not looping.
         */
        const producedOutput = !!(result.run.stdout || '').trim();
        const wellUnderLimit = elapsed < runLimit * 0.6;
        const starved = killed && (producedOutput || wellUnderLimit);

        const errorMsg = runStderr
          || (starved
              ? 'The server was busy and had to stop your program before it finished. This is not a problem with your code — press Run again in a few seconds.'
              : killed
                ? 'Time limit exceeded — your program ran too long (check for an infinite loop, or reading input that was never provided).'
                : `Program exited with code ${result.run.code}`);

        return {
          passed: false,
          output: result.run.stdout || '',
          error: errorMsg,
          // Real elapsed time. This was hardcoded to 0, which is why every failed test
          // showed "0ms" and made a 32-second starvation look instantaneous.
          executionTime: elapsed,
          memoryUsed: 0
        };
      }

      const actualOutput = result.run.stdout || '';

      // Report REAL figures when this Piston build provides them, and 0 when it
      // doesn't, so callers can hide the metric. These used to be Math.random(),
      // which meant every "Execution Time / Memory Used" the students saw was
      // fabricated. `memory` is bytes; wall/cpu_time are milliseconds.
      const wall = Number(result.run.wall_time ?? result.run.cpu_time ?? 0);
      const memBytes = Number(result.run.memory ?? 0);

      return {
        passed: this.compareOutputs(expectedOutput, actualOutput, input.comparisonMode),
        output: actualOutput,
        executionTime: Number.isFinite(wall) && wall > 0 ? Math.round(wall) : 0,
        memoryUsed: Number.isFinite(memBytes) && memBytes > 0 ? Math.round((memBytes / (1024 * 1024)) * 10) / 10 : 0,
      };

    } catch (error) {
      console.error('Piston execution error:', error);
      return {
        passed: false,
        output: '',
        error: error instanceof Error ? error.message : 'Execution failed',
        executionTime: 0,
        memoryUsed: 0
      };
    }
  }

  // Map our language enum to Piston language/version
  private mapToPistonLanguage(language: ProgrammingLanguage): { language: string; version: string } {
    const mapping: Record<ProgrammingLanguage, { language: string; version: string }> = {
      [ProgrammingLanguage.JAVASCRIPT]: { language: 'javascript', version: '18.15.0' },
      [ProgrammingLanguage.TYPESCRIPT]: { language: 'typescript', version: '5.0.3' },
      [ProgrammingLanguage.PYTHON]: { language: 'python', version: '3.10.0' },
      [ProgrammingLanguage.JAVA]: { language: 'java', version: '15.0.2' },
      [ProgrammingLanguage.CPP]: { language: 'c++', version: '10.2.0' },
      [ProgrammingLanguage.C]: { language: 'c', version: '10.2.0' },
      [ProgrammingLanguage.CSHARP]: { language: 'csharp', version: '6.12.0' },
      [ProgrammingLanguage.GO]: { language: 'go', version: '1.16.2' },
      [ProgrammingLanguage.RUST]: { language: 'rust', version: '1.68.2' },
      [ProgrammingLanguage.SQL]: { language: 'sqlite3', version: '3.36.0' },
      [ProgrammingLanguage.HTML]: { language: 'html', version: '5' },
      [ProgrammingLanguage.CSS]: { language: 'css', version: '3' }
    };

    return mapping[language] || { language: 'javascript', version: '18.15.0' };
  }

  // Extract simulated output from code (basic pattern matching)
  private extractSimulatedOutput(code: string, language: ProgrammingLanguage, input: string): string {
    // This is a simplified simulation
    // In reality, you would need actual code execution
    
    // For demo purposes, look for console.log, print, System.out.println patterns
    
    // Pattern 1: Direct print statements with values
    const printPatterns = [
      /console\.log\s*\(\s*['"`](.+?)['"`]\s*\)/g,  // JavaScript
      /print\s*\(\s*['"`](.+?)['"`]\s*\)/g,          // Python
      /System\.out\.println\s*\(\s*['"`](.+?)['"`]\s*\)/g, // Java
      /printf\s*\(\s*['"`](.+?)['"`]/g,              // C/C++
      /Console\.WriteLine\s*\(\s*['"`](.+?)['"`]\s*\)/g // C#
    ];

    for (const pattern of printPatterns) {
      const matches = code.matchAll(pattern);
      const outputs: string[] = [];
      for (const match of matches) {
        outputs.push(match[1]);
      }
      if (outputs.length > 0) {
        return outputs.join('\n');
      }
    }

    // Pattern 2: Check for arithmetic operations with output
    // Look for simple Hello World type patterns
    if (code.toLowerCase().includes('hello')) {
      if (code.includes('Hello World') || code.includes('Hello, World')) {
        return 'Hello World';
      }
      return 'Hello';
    }

    // Pattern 3: Try to extract computed values (basic math)
    if (input) {
      try {
        const numbers = input.split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
        if (numbers.length >= 2) {
          // Check if code looks like sum operation
          if (code.includes('+') && (code.includes('sum') || code.includes('add'))) {
            return String(numbers.reduce((a, b) => a + b, 0));
          }
          // Check if code looks like multiplication
          if (code.includes('*') && (code.includes('product') || code.includes('multiply'))) {
            return String(numbers.reduce((a, b) => a * b, 1));
          }
          // Check if code looks like finding max
          if (code.includes('max') || code.includes('Math.max')) {
            return String(Math.max(...numbers));
          }
          // Check if code looks like finding min
          if (code.includes('min') || code.includes('Math.min')) {
            return String(Math.min(...numbers));
          }
        }
      } catch {
        // Ignore parsing errors
      }
    }

    // Default: Return empty or simulated success
    // In a real scenario, this should be actual code execution
    return '';
  }

  // Normalize output for comparison. Ignores differences that are invisible to
  // the student and never meaningful to a problem: line-ending style, trailing
  // whitespace on each line (e.g. a stray space from print(x + " ")), and
  // trailing blank lines. Content and internal spacing are preserved.
  private normalizeOutput(output: string, mode: string = 'lenient'): string {
    let s = (output || '')
      .replace(/\r\n?/g, '\n')                 // normalize CRLF / CR → LF
      .split('\n')
      .map((line) => line.replace(/[ \t]+$/, '')) // strip trailing spaces/tabs per line
      .join('\n')
      .replace(/\n+$/, '')                      // drop trailing blank lines
      .trim();
    if (mode === 'exact') return s;
    // Lenient (default): also trim leading whitespace per line and collapse internal
    // runs of spaces/tabs — a correct answer shouldn't fail on stray/extra spacing.
    s = s.split('\n').map((line) => line.trim().replace(/[ \t]+/g, ' ')).join('\n');
    if (mode === 'case_insensitive') s = s.toLowerCase();
    return s;
  }

  // Compare expected vs actual output under the assignment's comparison mode.
  private compareOutputs(expected: string, actual: string, mode: string = 'lenient'): boolean {
    const m = mode || 'lenient';
    if (m === 'numeric') {
      // Token-wise compare; numbers match within a small tolerance (5.0 == 5).
      const toks = (s: string) => (s || '').replace(/\r\n?/g, '\n').trim().split(/\s+/).filter(Boolean);
      const e = toks(expected), a = toks(actual);
      if (e.length !== a.length) return false;
      for (let i = 0; i < e.length; i++) {
        const en = Number(e[i]), an = Number(a[i]);
        if (!isNaN(en) && !isNaN(an)) { if (Math.abs(en - an) > 1e-6) return false; }
        else if (e[i] !== a[i]) return false;
      }
      return true;
    }
    return this.normalizeOutput(expected, m) === this.normalizeOutput(actual, m);
  }

  // Get available languages
  async getAvailableLanguages(): Promise<string[]> {
    try {
      const response = await fetch(`${this.pistonUrl}/runtimes`);
      const runtimes = await response.json() as any[];
      return runtimes.map((r: any) => r.language);
    } catch {
      console.error('Failed to fetch Piston runtimes');
      return Object.values(ProgrammingLanguage);
    }
  }

  // Check if service is healthy
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.pistonUrl}/runtimes`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export default new CodeRunnerService();
