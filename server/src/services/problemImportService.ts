import * as XLSX from 'xlsx';
import { PB_LANGUAGE_KEYS } from '../config/problemBankTaxonomy';
import { Actor, createProblem, normalizeInput, ProblemInput, queueVerification, PbError } from './problemBankService';

/**
 * Bulk import — JSON, CSV or Excel into the Problem Bank.
 *
 * Two steps, like every serious importer: `preview` parses and validates every row and changes
 * nothing; `commit` creates the rows the author kept. Problems land as drafts, and any row that
 * carries a reference solution is queued for verification — which also fills in expected
 * outputs a file left blank, so an author can import inputs + a solution and let the judge
 * produce the answers.
 *
 * ── SPREADSHEET COLUMNS ─────────────────────────────────────────────────────────────────────
 * title, difficulty, marks, topics, tags, companies (lists separated by | or ,),
 * available_to (careerpilot, lms, both or none — blank uses the import's own choice),
 * statement, input_format, output_format, constraints, hints (separated by ||), editorial,
 * time_limit_ms, comparison,
 * tests_json — a JSON array [{"input","output","sample","weight"}], OR numbered columns
 *   sample_input_1 / sample_output_1 …, test_input_1 / test_output_1 … ,
 * starter_<lang>, solution_<lang>, header_<lang>, footer_<lang> for lang in python, java, cpp…
 */

export const MAX_IMPORT_ROWS = 1000;

export interface ImportRow {
  row: number;
  title: string;
  problem: ProblemInput;
  errors: string[];
  warnings: string[];
  publishable: boolean;
}

import { looseKey, looseRow, textCell, codeCell, flagCell, unusedColumns } from './importText';

const splitList = (v: unknown) => String(v ?? '').split(/\s*[|,]\s*/).map((s) => s.trim()).filter(Boolean);
/**
 * The optional available_to column: careerpilot, lms, both (or "careerpilot|lms"), none. Blank
 * leaves the row to the import's own choice.
 */
function audienceColumn(v: string): { audiences?: string[] } {
  const t = v.trim().toLowerCase();
  if (!t) return {};
  if (t === 'both' || t === 'all') return { audiences: ['lms', 'careerpilot'] };
  if (t === 'none') return { audiences: [] };
  return { audiences: splitList(t).map((x) => (x === 'cp' || x === 'career pilot' ? 'careerpilot' : x)) };
}

/** Open (sample) tests a numbered column set gets when the sheet does not say: the 2 open + 3 hidden convention. */
export const DEFAULT_OPEN_TESTS = 2;

function fromSpreadsheetRow(r: Record<string, any>): ProblemInput {
  // Column names are matched without case, spaces, underscores or hyphens ("Sample Input 1" = sample_input_1).
  const { row, original } = looseRow(r);
  const used = new Set<string>();
  const get = (...names: string[]) => {
    for (const n of names) { const k = looseKey(n); if (k in row) { used.add(k); if (String(row[k]).trim() !== '') return row[k]; } }
    return '';
  };
  const has = (...names: string[]) => names.some((n) => looseKey(n) in row);

  let tests: any[] = [];
  const json = get('tests_json', 'tests', 'test_cases_json', 'testcases');
  if (json.trim()) {
    try { tests = JSON.parse(json); } catch { throw new Error('tests_json is not valid JSON.'); }
    if (!Array.isArray(tests)) throw new Error('tests_json must be a JSON array.');
  }
  /*
   * Numbered tests, in any of the names authors use. Explicit kinds first: sample/example/open/visible
   * are shown to the learner, test/hidden are not. Then plain numbered ones (input_1, tc1_input,
   * test_case_1_input …): a hidden column says which; with none, the first two are open and the
   * rest hidden — the 2 open + 3 hidden convention. Open tests are listed before hidden ones.
   */
  const numbered: any[] = [];
  const SAMPLE = [['sample_input_', 'sample_output_'], ['example_input_', 'example_output_'], ['open_input_', 'open_output_'], ['visible_input_', 'visible_output_'], ['public_input_', 'public_output_']];
  const HIDDEN = [['test_input_', 'test_output_'], ['hidden_input_', 'hidden_output_'], ['private_input_', 'private_output_']];
  for (let i = 1; i <= 50; i++) {
    for (const [pairs, isSample] of [[SAMPLE, true], [HIDDEN, false]] as const) {
      for (const [inP, outP] of pairs) {
        const input = get(`${inP}${i}`), output = get(`${outP}${i}`, `${outP.replace('output', 'expected')}${i}`);
        if (input || output) numbered.push({ input: textCell(input), output: textCell(output), sample: isSample });
      }
    }
    const inNames = [`input_${i}`, `tc${i}_input`, `test_case_${i}_input`, `testcase${i}_input`, `case_${i}_input`];
    const outNames = [`output_${i}`, `expected_output_${i}`, `expected_${i}`, `tc${i}_expected`, `tc${i}_output`, `test_case_${i}_output`, `test_case_${i}_expected`, `testcase${i}_output`, `case_${i}_output`];
    const flagNames = [`hidden_${i}`, `is_hidden_${i}`, `tc${i}_hidden`, `test_case_${i}_hidden`, `input_${i}_hidden`, `case_${i}_hidden`];
    const input = get(...inNames), output = get(...outNames);
    if (input || output) {
      const flag = flagCell(get(...flagNames));
      numbered.push({ input: textCell(input), output: textCell(output), sample: flag === undefined ? (has(...flagNames) ? false : i <= DEFAULT_OPEN_TESTS) : !flag });
    }
  }
  tests.push(...numbered.filter((t) => t.sample), ...numbered.filter((t) => !t.sample));

  const languages = PB_LANGUAGE_KEYS.map((l) => ({
    language: l,
    starterCode: codeCell(get(`starter_${l}`, `starter_code_${l}`, `${l}_starter`)),
    solutionCode: codeCell(get(`solution_${l}`, `solution_code_${l}`, `${l}_solution`)),
    headerCode: codeCell(get(`header_${l}`)),
    footerCode: codeCell(get(`footer_${l}`)),
  })).filter((l) => l.starterCode || l.solutionCode || l.headerCode || l.footerCode);

  const title = get('title', 'name', 'problem_title', 'problem_name', 'question_title');
  const out: ProblemInput & { __unused?: string[] } = {
    title,
    kind: get('kind', 'type').toLowerCase() === 'sql' ? 'sql' : 'code',
    difficulty: (get('difficulty', 'level') || '').toLowerCase() as any,
    marks: get('marks', 'points', 'score') ? Number(get('marks', 'points', 'score')) : undefined,
    topics: splitList(get('topics', 'topic')),
    tags: splitList(get('tags', 'tag')),
    companies: splitList(get('companies', 'company')),
    ...audienceColumn(get('available_to', 'audience', 'for')),
    statement: textCell(get('statement', 'description', 'problem_statement', 'problem_description', 'question', 'problem')),
    inputFormat: textCell(get('input_format', 'input_description', 'input_spec')),
    outputFormat: textCell(get('output_format', 'output_description', 'output_spec')),
    constraints: textCell(get('constraints', 'constraint', 'limits')),
    hints: textCell(get('hints', 'hint')).split('||').map((h) => h.trim()).filter(Boolean),
    editorial: textCell(get('editorial', 'approach', 'explanation')),
    sqlSetup: codeCell(get('sql_setup', 'setup_sql')),
    limits: { timeMs: get('time_limit_ms', 'time_limit') ? Number(get('time_limit_ms', 'time_limit')) : undefined },
    comparisonMode: (get('comparison', 'comparison_mode') || undefined) as any,
    languages,
    tests: tests.map((t) => ({
      input: String(t.input ?? ''), expectedOutput: String(t.expectedOutput ?? t.output ?? ''),
      isSample: !!(t.isSample ?? t.sample), weight: t.weight, explanation: t.explanation,
    })),
  };
  const unused = unusedColumns(original, used);
  if (unused.length) out.__unused = unused;
  return out;
}

function fromJson(item: any): ProblemInput {
  const langs = Array.isArray(item.languages) ? item.languages
    : item.languages && typeof item.languages === 'object'
      ? Object.entries(item.languages).map(([language, v]: [string, any]) => ({ language, ...(typeof v === 'string' ? { starterCode: v } : v) }))
      : [];
  // Also accept { solutions: {python: "..."}, starters: {...} } — a common export shape.
  for (const [key, field] of [['solutions', 'solutionCode'], ['starters', 'starterCode']] as const) {
    if (item[key] && typeof item[key] === 'object') {
      for (const [language, code] of Object.entries(item[key])) {
        const existing = langs.find((l: any) => l.language === language);
        if (existing) existing[field] = code; else langs.push({ language, [field]: code });
      }
    }
  }
  return {
    ...item,
    statement: item.statement ?? item.description ?? '',
    languages: langs,
    tests: (item.tests || item.testCases || []).map((t: any) => ({
      input: String(t.input ?? ''), expectedOutput: String(t.expectedOutput ?? t.output ?? ''),
      isSample: !!(t.isSample ?? t.sample ?? (t.hidden === false)), weight: t.weight, explanation: t.explanation,
    })),
  };
}

/** Parse an uploaded file (base64) or pasted JSON into problem inputs. */
export function parseImport(filename: string, base64: string | undefined, text: string | undefined): ProblemInput[] {
  const name = (filename || '').toLowerCase();
  if (text !== undefined || name.endsWith('.json')) {
    const src = text !== undefined ? text : Buffer.from(base64 || '', 'base64').toString('utf8');
    let data: any;
    try { data = JSON.parse(src); } catch (e: any) { throw new PbError(`That is not valid JSON: ${e.message}`); }
    const arr = Array.isArray(data) ? data : Array.isArray(data?.problems) ? data.problems : [data];
    return arr.map(fromJson);
  }
  if (/\.(csv|xlsx|xls)$/.test(name)) {
    // raw: a CSV cell is kept exactly as typed. Without it the reader guesses types, so "007"
    // loses its zeros and a test input like "0 5" becomes the date 5/1/00.
    const wb = XLSX.read(Buffer.from(base64 || '', 'base64'), { type: 'buffer', raw: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) throw new PbError('The file has no sheets.');
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '', raw: false });
    return rows.map((r, i) => {
      try { return fromSpreadsheetRow(r); } catch (e: any) { return { title: String(r.title || `Row ${i + 2}`), __error: e.message } as any; }
    });
  }
  throw new PbError('Upload a .json, .csv, .xlsx or .xls file.');
}

export function previewImport(items: ProblemInput[]): ImportRow[] {
  if (items.length > MAX_IMPORT_ROWS) throw new PbError(`At most ${MAX_IMPORT_ROWS} problems per import — split the file.`);
  return items.map((p: any, i) => {
    if (p.__error) return { row: i + 1, title: p.title, problem: p, errors: [p.__error], warnings: [], publishable: false };
    const n = normalizeInput(p);
    const hasSolution = n.clean.languages.some((l: any) => l.solutionCode.trim());
    const warnings = [...n.warnings];
    if (p.__unused?.length) warnings.push(`Columns not read: ${p.__unused.join(', ')}. Check their names against the template.`);
    const missingOutputs = n.tests.some((t) => !t.expectedOutput.trim());
    if (missingOutputs && hasSolution) warnings.push('Missing expected outputs will be generated from the reference solution.');
    const errors = [...n.errors];
    if (missingOutputs && !hasSolution) errors.push('Some tests have no expected output and there is no reference solution to generate them.');
    return { row: i + 1, title: n.clean.title || `Row ${i + 1}`, problem: p, errors, warnings, publishable: !n.publishErrors.length };
  });
}

export async function commitImport(a: Actor, items: ProblemInput[], opts: { scope?: 'global' | 'tenant'; verify?: boolean; audiences?: string[] }) {
  // The import's "Available to" choice, for rows that do not say (an available_to column wins).
  const chosen = Array.isArray(opts.audiences) ? opts.audiences : [];
  const rows = previewImport(items);
  const created: { row: number; id: string; title: string }[] = [];
  const skipped: { row: number; title: string; reason: string }[] = [];
  for (const r of rows) {
    if (r.errors.length) { skipped.push({ row: r.row, title: r.title, reason: r.errors.join(' ') }); continue; }
    try {
      const audiences = Array.isArray(r.problem.audiences) ? r.problem.audiences : chosen;
      const { problem } = await createProblem(a, { ...r.problem, audiences, scope: opts.scope || 'tenant', status: 'draft' }, 'import');
      created.push({ row: r.row, id: String(problem._id), title: problem.title });
      if (opts.verify !== false && problem.languages.some((l) => l.solutionCode.trim())) {
        await queueVerification(null, String(problem._id)).catch(() => undefined);
      }
    } catch (e: any) {
      skipped.push({ row: r.row, title: r.title, reason: e?.message || 'Could not be created' });
    }
  }
  return { created, skipped };
}

/* ── Templates ─────────────────────────────────────────────────────────────────────────────── */

export const SAMPLE_PROBLEM: ProblemInput = {
  title: 'Sum of Two Numbers',
  difficulty: 'easy',
  marks: 10,
  topics: ['basics', 'math'],
  tags: ['warm-up'],
  companies: [],
  statement: 'Read two integers **a** and **b** and print their sum.',
  inputFormat: 'A single line with two integers a and b.',
  outputFormat: 'Print a + b.',
  constraints: '-10^9 <= a, b <= 10^9',
  hints: ['The sum can exceed a 32-bit integer — use a 64-bit type.'],
  languages: [
    { language: 'python', starterCode: 'a, b = map(int, input().split())\n# print the sum\n', solutionCode: 'a, b = map(int, input().split())\nprint(a + b)\n' },
    { language: 'java', starterCode: 'import java.util.*;\n\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    // read a and b, print the sum\n  }\n}\n',
      solutionCode: 'import java.util.*;\n\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    long a = sc.nextLong(), b = sc.nextLong();\n    System.out.println(a + b);\n  }\n}\n' },
  ],
  tests: [
    { input: '2 3', expectedOutput: '5', isSample: true, explanation: '2 + 3 = 5' },
    { input: '-4 10', expectedOutput: '6', isSample: false },
    { input: '1000000000 1000000000', expectedOutput: '', isSample: false, weight: 2 },
  ],
};

/**
 * `complete`: every expected output filled in. A pool import publishes rows as they are and so
 * cannot generate a blank output from the reference solution, as the bank's own import does.
 */
export function csvTemplate(opts: { complete?: boolean } = {}): string {
  // Five tests per problem: 2 open (sample_*) the learner sees, 3 hidden (test_*) used to mark.
  const headers = ['title', 'difficulty', 'marks', 'topics', 'tags', 'companies', 'available_to', 'statement', 'input_format', 'output_format',
    'constraints', 'hints', 'sample_input_1', 'sample_output_1', 'sample_input_2', 'sample_output_2',
    'test_input_1', 'test_output_1', 'test_input_2', 'test_output_2', 'test_input_3', 'test_output_3',
    'starter_python', 'solution_python', 'solution_java'];
  const s = SAMPLE_PROBLEM;
  const java = s.languages![1].solutionCode!;
  const sum = [s.title, s.difficulty, String(s.marks), 'basics|math', 'warm-up', '', 'careerpilot', s.statement!, s.inputFormat!, s.outputFormat!,
    s.constraints!, s.hints!.join('||'),
    '2 3', '5', '10 20', '30',
    '-4 10', '6', '0 0', '0', '1000000000 1000000000', opts.complete ? '2000000000' : '',
    s.languages![0].starterCode!, s.languages![0].solutionCode!, java];
  // A pattern problem: each multi-line value is one quoted cell with real line breaks (Alt+Enter in
  // Excel). Typing it on one line with a backslash-n between the lines works too.
  const L = (...lines: string[]) => lines.join('\n');
  const pattern = ['Right-Angled Star Triangle', 'easy', '10', 'patterns|loops', 'nested-loops', '', 'careerpilot',
    L('Read an integer **n** and print a right-angled triangle of stars.', 'Row i has i stars.'), 'A single integer n.', 'n lines; line i has i stars.',
    '1 <= n <= 20', 'Use one loop for the rows and print i stars on row i.',
    '3', L('*', '**', '***'), '1', '*',
    '2', L('*', '**'), '4', L('*', '**', '***', '****'), '5', L('*', '**', '***', '****', '*****'),
    L('n = int(input())', '# print the triangle', ''), L('n = int(input())', 'for i in range(1, n + 1):', '    print("*" * i)', ''),
    L('import java.util.*;', '', 'public class Main {', '  public static void main(String[] args) {', '    int n = new Scanner(System.in).nextInt();',
      '    for (int i = 1; i <= n; i++) System.out.println("*".repeat(i));', '  }', '}', '')];
  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  return `${headers.join(',')}\n${sum.map(esc).join(',')}\n${pattern.map(esc).join(',')}\n`;
}
