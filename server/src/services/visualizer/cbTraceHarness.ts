/**
 * The Java side of the tracer: a class appended to the student's own file.
 *
 * ── WHY IT IS IN THE SAME FILE ─────────────────────────────────────────────────────────────
 *
 * Piston's `files` field is an array, and Phase 0 assumed a harness could be shipped as a
 * second entry. It cannot: for Java, Piston compiles `files[0]` ONLY. A second `.java` file is
 * written into the job directory and never compiled, so the harness has to be a second
 * top-level class in the same source file.
 *
 * Two consequences, both load-bearing:
 *
 *   1. ORDER MATTERS. Java's single-file source launcher runs the FIRST class declared, so the
 *      student's class must stay first and this is appended after it. Putting it first fails
 *      with "can't find main method".
 *
 *   2. IT CANNOT BE `public`. A file may hold only one public top-level class, and that slot
 *      belongs to the student's. Package-private is exactly right anyway.
 *
 * ── AND WHY IT USES NO IMPORTS ─────────────────────────────────────────────────────────────
 *
 * The student's file may have no import statements, and injecting them would shift their line
 * numbers. Everything here is either `java.lang` (implicit) or fully qualified.
 *
 * ── ALL OUTPUT GOES THROUGH HERE ───────────────────────────────────────────────────────────
 *
 * `System.out.print` is rewritten to `CBTrace.out(...)`, which records a STDOUT event and does
 * NOT write to stdout itself. That is not tidiness — it is required for correctness. Trace
 * lines are recognised by the sentinel appearing at the START of a line, and `print` (no
 * newline) would leave the cursor mid-line, so the next trace line would begin after the
 * student's text and be unparseable. With every write funnelled through here, stdout is
 * nothing but trace lines and the program's output is reconstructed from the STDOUT events.
 *
 * Instrumentation is only ever applied in VISUALIZE mode, so Run and Submit grading — which
 * read real stdout — are untouched by this.
 */

/** Must match TRACE_SENTINEL in ../../types/executionEvents.ts. */
export const HARNESS_SENTINEL = '##CBTRACE##';

/** Must match TRACE_EVENT_LIMIT in ../../types/executionEvents.ts. */
export const HARNESS_EVENT_LIMIT = 5000;

/** Must match VALUE_REPR_LIMIT / ARRAY_ELEMENT_LIMIT in ../../types/executionEvents.ts. */
export const HARNESS_REPR_LIMIT = 200;
export const HARNESS_ARRAY_LIMIT = 100;

/** The class name injected into the student's file. Collisions are checked for before use. */
export const HARNESS_CLASS = 'CBTrace';

/**
 * The harness source.
 *
 * Deliberately one long string rather than a file read at runtime: it must be in the compiled
 * server bundle, and a missing file at run time would surface as a compile error inside a
 * student's program, which is the most confusing possible place for it.
 */
export const CB_TRACE_HARNESS = `
/* ─────────────────────────────────────────────────────────────────────────────
 * Appended by CodeTrace. Not written by the student.
 * Emits one JSON event per line, each prefixed with ${HARNESS_SENTINEL}.
 * ───────────────────────────────────────────────────────────────────────────── */
class ${HARNESS_CLASS} {
  private static final String S = "${HARNESS_SENTINEL}";
  private static final int LIMIT = ${HARNESS_EVENT_LIMIT};
  private static int seq = 0;
  private static boolean capped = false;
  /* The program's own output, kept so it can be reported as events instead of written
     to stdout, where it would break trace-line parsing. */
  private static final StringBuilder outBuf = new StringBuilder();

  /* ── emission ───────────────────────────────────────────────────────────── */

  private static void emit(String body) {
    if (capped) return;
    if (seq >= LIMIT) {
      capped = true;
      seq++;
      System.out.println(S + "{\\"sequence\\":" + seq
        + ",\\"eventType\\":\\"TRACE_LIMIT_EXCEEDED\\",\\"line\\":0}");
      System.out.flush();
      return;
    }
    seq++;
    System.out.println(S + "{\\"sequence\\":" + seq + "," + body + "}");
  }

  /** JSON string escaping. Control characters must be escaped or the line is unparseable. */
  private static String q(String raw) {
    if (raw == null) return "null";
    StringBuilder b = new StringBuilder("\\"");
    for (int i = 0; i < raw.length(); i++) {
      char c = raw.charAt(i);
      if (c == '"') b.append("\\\\\\"");
      else if (c == '\\\\') b.append("\\\\\\\\");
      else if (c == '\\n') b.append("\\\\n");
      else if (c == '\\r') b.append("\\\\r");
      else if (c == '\\t') b.append("\\\\t");
      else if (c < 0x20) b.append(String.format("\\\\u%04x", (int) c));
      else b.append(c);
    }
    return b.append("\\"").toString();
  }

  private static String cut(String s) {
    if (s == null) return "null";
    return s.length() <= ${HARNESS_REPR_LIMIT} ? s : s.substring(0, ${HARNESS_REPR_LIMIT}) + "\\u2026";
  }

  /* ── value rendering ────────────────────────────────────────────────────────
     Overloads rather than a single Object parameter: Java would box a primitive and
     an int[] would print as a hash code. Each shape gets its own. */

  private static String val(String kind, String type, String repr, boolean trunc) {
    return "{\\"kind\\":" + q(kind) + ",\\"typeName\\":" + q(type)
         + ",\\"repr\\":" + q(cut(repr)) + (trunc ? ",\\"truncated\\":true" : "") + "}";
  }

  static String v(int x)     { return val("primitive", "int", String.valueOf(x), false); }
  static String v(long x)    { return val("primitive", "long", String.valueOf(x), false); }
  static String v(double x)  { return val("primitive", "double", String.valueOf(x), false); }
  static String v(float x)   { return val("primitive", "float", String.valueOf(x), false); }
  static String v(short x)   { return val("primitive", "short", String.valueOf(x), false); }
  static String v(byte x)    { return val("primitive", "byte", String.valueOf(x), false); }
  static String v(boolean x) { return val("primitive", "boolean", String.valueOf(x), false); }
  static String v(char x)    { return val("primitive", "char", String.valueOf(x), false); }
  static String v(String x)  { return x == null ? val("null", "String", "null", false)
                                                : val("string", "String", x, x.length() > ${HARNESS_REPR_LIMIT}); }

  private static String arr(String type, int len, String body, boolean trunc) {
    return "{\\"kind\\":\\"array\\",\\"typeName\\":" + q(type)
         + ",\\"repr\\":" + q(cut(body)) + ",\\"length\\":" + len
         + (trunc ? ",\\"truncated\\":true" : "") + "}";
  }
  static String v(int[] a) {
    if (a == null) return val("null", "int[]", "null", false);
    int n = Math.min(a.length, ${HARNESS_ARRAY_LIMIT});
    StringBuilder b = new StringBuilder("[");
    for (int i = 0; i < n; i++) { if (i > 0) b.append(", "); b.append(a[i]); }
    if (n < a.length) b.append(", \\u2026");
    return arr("int[]", a.length, b.append("]").toString(), n < a.length);
  }
  static String v(long[] a) {
    if (a == null) return val("null", "long[]", "null", false);
    return arr("long[]", a.length, java.util.Arrays.toString(a), false);
  }
  static String v(double[] a) {
    if (a == null) return val("null", "double[]", "null", false);
    return arr("double[]", a.length, java.util.Arrays.toString(a), false);
  }
  static String v(char[] a) {
    if (a == null) return val("null", "char[]", "null", false);
    return arr("char[]", a.length, new String(a), false);
  }
  static String v(boolean[] a) {
    if (a == null) return val("null", "boolean[]", "null", false);
    return arr("boolean[]", a.length, java.util.Arrays.toString(a), false);
  }
  static String v(String[] a) {
    if (a == null) return val("null", "String[]", "null", false);
    return arr("String[]", a.length, java.util.Arrays.toString(a), false);
  }
  /* Last resort. toString() is whatever the class provides, which may be a hash code —
     reported as 'unsupported' so the UI can say so rather than show it as a value. */
  static String v(Object x) {
    if (x == null) return val("null", "null", "null", false);
    return val("unsupported", x.getClass().getSimpleName(), String.valueOf(x), false);
  }

  /* ── events ─────────────────────────────────────────────────────────────── */

  static void start(int line, String cls) {
    emit("\\"eventType\\":\\"EXECUTION_START\\",\\"line\\":" + line + ",\\"scope\\":" + q(cls));
  }
  static void enter(int line, String scope) {
    emit("\\"eventType\\":\\"METHOD_ENTER\\",\\"line\\":" + line + ",\\"scope\\":" + q(scope));
  }
  static void ret(int line, String scope) {
    emit("\\"eventType\\":\\"METHOD_RETURN\\",\\"line\\":" + line + ",\\"scope\\":" + q(scope));
  }
  static void decl(int line, String scope, String name, String value) {
    emit("\\"eventType\\":\\"VARIABLE_DECLARE\\",\\"line\\":" + line
       + ",\\"scope\\":" + q(scope) + ",\\"name\\":" + q(name) + ",\\"value\\":" + value);
  }
  static void assign(int line, String scope, String name, String value) {
    emit("\\"eventType\\":\\"VARIABLE_ASSIGN\\",\\"line\\":" + line
       + ",\\"scope\\":" + q(scope) + ",\\"name\\":" + q(name) + ",\\"value\\":" + value);
  }
  /**
   * Without a previous value.
   *
   * Capturing the old value needs a statement injected BEFORE the assignment, which is only
   * legal where the assignment sits directly inside a block -- 'if (x) arr[0]=1;' would put
   * assignment outside the if. Rather than brace every bare body, the instrumenter omits the
   * previous value and the schema leaves it optional. Reporting the NEW value as the old one,
   * which is what reading the slot after the write would give, would be a lie the UI would
   * then draw a swap animation from.
   */
  static void awrite(int line, String scope, String name, int index, String value) {
    emit("\\"eventType\\":\\"ARRAY_WRITE\\",\\"line\\":" + line
       + ",\\"scope\\":" + q(scope) + ",\\"name\\":" + q(name) + ",\\"index\\":" + index
       + ",\\"value\\":" + value);
  }

  static void awrite(int line, String scope, String name, int index, String prev, String value) {
    emit("\\"eventType\\":\\"ARRAY_WRITE\\",\\"line\\":" + line
       + ",\\"scope\\":" + q(scope) + ",\\"name\\":" + q(name) + ",\\"index\\":" + index
       + ",\\"previousValue\\":" + prev + ",\\"value\\":" + value);
  }
  static void loopEnter(int line, String scope, String id) {
    emit("\\"eventType\\":\\"LOOP_ENTER\\",\\"line\\":" + line
       + ",\\"scope\\":" + q(scope) + ",\\"loopId\\":" + q(id));
  }
  static void loopExit(int line, String scope, String id) {
    emit("\\"eventType\\":\\"LOOP_EXIT\\",\\"line\\":" + line
       + ",\\"scope\\":" + q(scope) + ",\\"loopId\\":" + q(id));
  }
  static void iter(int line, String scope, String id, int n, String name, String value) {
    emit("\\"eventType\\":\\"LOOP_ITERATION\\",\\"line\\":" + line
       + ",\\"scope\\":" + q(scope) + ",\\"loopId\\":" + q(id) + ",\\"iteration\\":" + n
       + (name == null ? "" : ",\\"name\\":" + q(name) + ",\\"value\\":" + value));
  }

  /* ── conditions ─────────────────────────────────────────────────────────────
     Returns what it was given, so it can wrap a condition in place. Two forms:
     cmp() knows both operands and can report '8 > 3'; cond() knows only the outcome
     and reports no resolved text rather than an invented one. */

  static boolean cmp(int line, String scope, String src, long l, String op, long r) {
    boolean res = false;
    if (op.equals(">")) res = l > r;
    else if (op.equals("<")) res = l < r;
    else if (op.equals(">=")) res = l >= r;
    else if (op.equals("<=")) res = l <= r;
    else if (op.equals("==")) res = l == r;
    else if (op.equals("!=")) res = l != r;
    emit("\\"eventType\\":\\"CONDITION_EVALUATE\\",\\"line\\":" + line
       + ",\\"scope\\":" + q(scope) + ",\\"expression\\":" + q(src)
       + ",\\"resolved\\":" + q(l + " " + op + " " + r)
       + ",\\"result\\":" + res);
    return res;
  }

  static boolean cond(int line, String scope, String src, boolean res) {
    emit("\\"eventType\\":\\"CONDITION_EVALUATE\\",\\"line\\":" + line
       + ",\\"scope\\":" + q(scope) + ",\\"expression\\":" + q(src)
       + ",\\"result\\":" + res);
    return res;
  }

  /* ── the program's own output ───────────────────────────────────────────── */

  static void out(int line, String scope, String text) {
    String t = text == null ? "null" : text;
    outBuf.append(t);
    emit("\\"eventType\\":\\"STDOUT\\",\\"line\\":" + line
       + ",\\"scope\\":" + q(scope) + ",\\"text\\":" + q(t));
  }
  static void out(int line, String scope, int x)     { out(line, scope, String.valueOf(x)); }
  static void out(int line, String scope, long x)    { out(line, scope, String.valueOf(x)); }
  static void out(int line, String scope, double x)  { out(line, scope, String.valueOf(x)); }
  static void out(int line, String scope, char x)    { out(line, scope, String.valueOf(x)); }
  static void out(int line, String scope, boolean x) { out(line, scope, String.valueOf(x)); }
  static void out(int line, String scope, Object x)  { out(line, scope, String.valueOf(x)); }

  static void outln(int line, String scope, String text) {
    out(line, scope, (text == null ? "null" : text) + "\\n");
  }
  static void outln(int line, String scope, int x)     { outln(line, scope, String.valueOf(x)); }
  static void outln(int line, String scope, long x)    { outln(line, scope, String.valueOf(x)); }
  static void outln(int line, String scope, double x)  { outln(line, scope, String.valueOf(x)); }
  static void outln(int line, String scope, char x)    { outln(line, scope, String.valueOf(x)); }
  static void outln(int line, String scope, boolean x) { outln(line, scope, String.valueOf(x)); }
  static void outln(int line, String scope, Object x)  { outln(line, scope, String.valueOf(x)); }
  static void outln(int line, String scope)            { out(line, scope, "\\n"); }

  /* ── failure ────────────────────────────────────────────────────────────── */

  /**
   * Reported, then re-thrown. Re-throwing keeps the program's real exit code and the real
   * stack trace on stderr; swallowing it would tell the student their program finished.
   */
  static void thrown(int line, String scope, Throwable t) {
    String type = t.getClass().getName();
    if (type.startsWith("java.lang.")) type = type.substring(10);
    emit("\\"eventType\\":\\"EXCEPTION\\",\\"line\\":" + line
       + ",\\"scope\\":" + q(scope) + ",\\"exceptionType\\":" + q(type)
       + ",\\"exceptionMessage\\":" + q(String.valueOf(t.getMessage()))
       + ",\\"explanation\\":" + q(explain(t)));
    System.out.flush();
  }

  /**
   * A plain-English cause, for the exception types a beginner actually hits.
   *
   * Returns "" when there is nothing TRUE to say. An invented explanation is worse than
   * none: a student who is told the wrong reason stops looking for the right one.
   */
  private static String explain(Throwable t) {
    String n = t.getClass().getSimpleName();
    String m = t.getMessage() == null ? "" : t.getMessage();
    if (n.equals("ArrayIndexOutOfBoundsException")) {
      return "The array does not have that slot. " + m
           + ". Valid indexes run from 0 to length minus 1.";
    }
    if (n.equals("StringIndexOutOfBoundsException")) {
      return "That character position is outside the string. " + m;
    }
    if (n.equals("NullPointerException")) {
      return "Something that was never given a value was used as though it had one.";
    }
    if (n.equals("ArithmeticException")) {
      return m.contains("zero") ? "Division by zero. Integer division cannot divide by 0." : m;
    }
    if (n.equals("NumberFormatException")) {
      return "Text that does not look like a number was converted to one. " + m;
    }
    if (n.equals("StackOverflowError")) {
      return "A method called itself too many times \\u2014 usually recursion with no base case.";
    }
    if (n.equals("NegativeArraySizeException")) {
      return "An array cannot have a negative length. " + m;
    }
    return "";
  }

  static void done(int line, String cls) {
    emit("\\"eventType\\":\\"EXECUTION_COMPLETE\\",\\"line\\":" + line + ",\\"scope\\":" + q(cls));
    System.out.flush();
  }
}
`;
