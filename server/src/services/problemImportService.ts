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

const splitList = (v: unknown) => String(v ?? '').split(/\s*[|,]\s*/).map((s) => s.trim()).filter(Boolean);
const cell = (r: Record<string, any>, k: string) => {
  const v = r[k];
  return v === undefined || v === null ? '' : String(v);
};

function fromSpreadsheetRow(r: Record<string, any>): ProblemInput {
  // Header names are matched case- and space-insensitively.
  const row: Record<string, any> = {};
  for (const [k, v] of Object.entries(r)) row[k.trim().toLowerCase().replace(/[\s-]+/g, '_')] = v;

  let tests: any[] = [];
  const json = cell(row, 'tests_json') || cell(row, 'tests');
  if (json.trim()) {
    try { tests = JSON.parse(json); } catch { throw new Error('tests_json is not valid JSON.'); }
    if (!Array.isArray(tests)) throw new Error('tests_json must be a JSON array.');
  }
  for (const [prefix, isSample] of [['sample', true], ['test', false]] as const) {
    for (let i = 1; i <= 100; i++) {
      const inKey = `${prefix}_input_${i}`, outKey = `${prefix}_output_${i}`;
      if (!(inKey in row) && !(outKey in row)) { if (i > 1) break; continue; }
      if (!cell(row, inKey) && !cell(row, outKey)) continue;
      tests.push({ input: cell(row, inKey), output: cell(row, outKey), sample: isSample });
    }
  }

  const languages = PB_LANGUAGE_KEYS.map((l) => ({
    language: l,
    starterCode: cell(row, `starter_${l}`),
    solutionCode: cell(row, `solution_${l}`),
    headerCode: cell(row, `header_${l}`),
    footerCode: cell(row, `footer_${l}`),
  })).filter((l) => l.starterCode || l.solutionCode || l.headerCode || l.footerCode);

  return {
    title: cell(row, 'title'),
    kind: cell(row, 'kind').toLowerCase() === 'sql' ? 'sql' : 'code',
    difficulty: cell(row, 'difficulty'),
    marks: cell(row, 'marks') ? Number(cell(row, 'marks')) : undefined,
    topics: splitList(row.topics),
    tags: splitList(row.tags),
    companies: splitList(row.companies),
    statement: cell(row, 'statement') || cell(row, 'description'),
    inputFormat: cell(row, 'input_format'),
    outputFormat: cell(row, 'output_format'),
    constraints: cell(row, 'constraints'),
    hints: cell(row, 'hints').split('||').map((s) => s.trim()).filter(Boolean),
    editorial: cell(row, 'editorial'),
    sqlSetup: cell(row, 'sql_setup'),
    limits: { timeMs: cell(row, 'time_limit_ms') ? Number(cell(row, 'time_limit_ms')) : undefined },
    comparisonMode: (cell(row, 'comparison') || undefined) as any,
    languages,
    tests: tests.map((t) => ({
      input: String(t.input ?? ''), expectedOutput: String(t.expectedOutput ?? t.output ?? ''),
      isSample: !!(t.isSample ?? t.sample), weight: t.weight, explanation: t.explanation,
    })),
  };
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
    const wb = XLSX.read(Buffer.from(base64 || '', 'base64'), { type: 'buffer', raw: false });
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
    const missingOutputs = n.tests.some((t) => !t.expectedOutput.trim());
    if (missingOutputs && hasSolution) warnings.push('Missing expected outputs will be generated from the reference solution.');
    const errors = [...n.errors];
    if (missingOutputs && !hasSolution) errors.push('Some tests have no expected output and there is no reference solution to generate them.');
    return { row: i + 1, title: n.clean.title || `Row ${i + 1}`, problem: p, errors, warnings, publishable: !n.publishErrors.length };
  });
}

export async function commitImport(a: Actor, items: ProblemInput[], opts: { scope?: 'global' | 'tenant'; verify?: boolean }) {
  const rows = previewImport(items);
  const created: { row: number; id: string; title: string }[] = [];
  const skipped: { row: number; title: string; reason: string }[] = [];
  for (const r of rows) {
    if (r.errors.length) { skipped.push({ row: r.row, title: r.title, reason: r.errors.join(' ') }); continue; }
    try {
      const { problem } = await createProblem(a, { ...r.problem, scope: opts.scope || 'tenant', status: 'draft' }, 'import');
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

export function csvTemplate(): string {
  const headers = ['title', 'difficulty', 'marks', 'topics', 'tags', 'companies', 'statement', 'input_format', 'output_format',
    'constraints', 'hints', 'sample_input_1', 'sample_output_1', 'test_input_1', 'test_output_1', 'test_input_2', 'test_output_2',
    'starter_python', 'solution_python', 'solution_java'];
  const s = SAMPLE_PROBLEM;
  const java = s.languages![1].solutionCode!;
  const values = [s.title, s.difficulty, String(s.marks), 'basics|math', 'warm-up', '', s.statement!, s.inputFormat!, s.outputFormat!,
    s.constraints!, s.hints!.join('||'), '2 3', '5', '-4 10', '6', '1000000000 1000000000', '',
    s.languages![0].starterCode!, s.languages![0].solutionCode!, java];
  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  return `${headers.join(',')}\n${values.map(esc).join(',')}\n`;
}
