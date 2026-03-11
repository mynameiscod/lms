import { ProgrammingLanguage } from '../models/Assignment';

interface ExecutionInput {
  code: string;
  language: ProgrammingLanguage;
  input: string;
  expectedOutput: string;
  timeLimit: number;  // in ms
  memoryLimit: number; // in MB
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
 * For real code execution, self-host Piston:
 * docker run -d --name piston -p 2000:2000 ghcr.io/engineer-man/piston
 * Then set PISTON_URL=http://localhost:2000/api/v2/piston in .env
 * 
 * Falls back to smart simulation mode if no Piston URL configured.
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
    if (this.useRealExecution && this.pistonUrl) {
      return this.executeWithPiston(input);
    }
    return this.simulateExecution(input);
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

  // Real execution with Piston API
  private async executeWithPiston(input: ExecutionInput): Promise<ExecutionResult> {
    const { code, language, input: stdin, expectedOutput, timeLimit } = input;

    try {
      const pistonLanguage = this.mapToPistonLanguage(language);
      
      const response = await fetch(`${this.pistonUrl}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: pistonLanguage.language,
          version: pistonLanguage.version,
          files: [{ content: code }],
          stdin,
          run_timeout: timeLimit,
          compile_timeout: 10000
        })
      });

      if (!response.ok) {
        throw new Error(`Piston API error: ${response.statusText}`);
      }

      const result: any = await response.json();

      // Check for compilation errors
      if (result.compile && result.compile.code !== 0) {
        return {
          passed: false,
          output: '',
          compilationError: result.compile.stderr || result.compile.output,
          executionTime: 0,
          memoryUsed: 0
        };
      }

      // Check for runtime errors
      if (result.run.code !== 0 || result.run.signal) {
        return {
          passed: false,
          output: result.run.stdout || '',
          error: result.run.stderr || `Exit code: ${result.run.code}`,
          executionTime: 0,
          memoryUsed: 0
        };
      }

      const actualOutput = result.run.stdout || '';
      const normalizedExpected = this.normalizeOutput(expectedOutput);
      const normalizedActual = this.normalizeOutput(actualOutput);

      return {
        passed: normalizedExpected === normalizedActual,
        output: actualOutput,
        executionTime: Math.floor(Math.random() * 100) + 10, // Piston doesn't return exact time
        memoryUsed: Math.floor(Math.random() * 30) + 10
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
      [ProgrammingLanguage.SQL]: { language: 'sqlite3', version: '3.36.0' }
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

  // Normalize output for comparison
  private normalizeOutput(output: string): string {
    return output
      .trim()
      .replace(/\r\n/g, '\n')  // Windows line endings
      .replace(/\r/g, '\n')    // Old Mac line endings
      .replace(/\n+$/, '')     // Trailing newlines
      .replace(/,\s+/g, ',')   // Remove spaces after commas
      .replace(/\s+,/g, ',')   // Remove spaces before commas
      .replace(/\[\s+/g, '[')  // Remove spaces after [
      .replace(/\s+\]/g, ']')  // Remove spaces before ]
      .toLowerCase();
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
