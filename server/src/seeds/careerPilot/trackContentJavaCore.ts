/**
 * Career-track content: getting started with Java (JT_JAVA_START) and Java fundamentals
 * (JT_JAVA_BASICS).
 *
 * Java is examined the way it is written: a short program and "does this compile, and what does it
 * print?". So nearly every question here is about one specific snippet. The notes teach Java 17;
 * the graded exercises are plain Java 11-style code, because the runner is Java 15.
 *
 * Attribution: both topics are multi-skill. Every checkpoint question names the one skill it
 * measures, taken from its own unit's skillKeys (concept units) or from the topic's list
 * (debugging, practice, interview and checkpoint units). Practice mcqs name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_JAVA_CORE_BUNDLES: PilotBundle[] = [
  /* ══ JT_JAVA_START — Getting Started with Java ══════════════════════════════════════════ */
  {
    unitCode: 'JT_JAVA_START_JDK_JVM',
    notes: `Java source code is not run directly. It goes through two steps, and three acronyms name
the pieces that do them.

## The pipeline

    Hello.java  --javac-->  Hello.class (bytecode)  --java-->  JVM runs it on this machine

- **javac** is the compiler. It reads \`.java\` source and writes \`.class\` files containing
  **bytecode** — instructions for an imaginary machine, not for your CPU.
- **The JVM** (Java Virtual Machine) is that machine, implemented as a program. It loads the
  bytecode, checks it, interprets it, and compiles the hot parts to real machine code while the
  program runs (the JIT compiler).
- **The JRE** (Java Runtime Environment) is the JVM plus the standard library (\`java.lang\`,
  \`java.util\` …) — everything needed to *run* a program.
- **The JDK** (Java Development Kit) is the JRE plus the tools to *build* one: \`javac\`, \`jar\`,
  \`javadoc\`, \`jshell\`, the debugger.

So JDK ⊃ JRE ⊃ JVM. A developer installs a JDK. Since Java 11 vendors no longer ship a separate
JRE download; you install a JDK (Temurin, Oracle, Corretto…) and it contains the runtime.

## Why "write once, run anywhere"

The \`.class\` file is the same on Windows, Linux and macOS. What differs is the JVM: each
operating system gets its own JVM build, and each one runs the same bytecode. Java is portable
because the *bytecode* is portable — the JVM itself is very much platform-specific.

## Checking your install

    > java -version
    openjdk version "17.0.9" 2023-10-17
    > javac -version
    javac 17.0.9

If \`java -version\` works but \`javac\` is "not recognized", you have a runtime on your PATH but not
the JDK's \`bin\` folder. Set \`JAVA_HOME\` to the JDK folder and put \`%JAVA_HOME%\\bin\` on PATH.

## Versions

Long-term-support releases are 8, 11, 17 and 21. Most companies you will interview with run 11,
17 or 21. A class compiled for a newer version will not load on an older JVM:
\`UnsupportedClassVersionError ... class file version 61.0\` means the code was compiled for 17
and is being run on something older.

## Interview traps

- "Is Java compiled or interpreted?" — both: compiled to bytecode by javac, then interpreted and
  JIT-compiled by the JVM.
- "Is the JVM platform independent?" — no. Bytecode is; the JVM is written per platform.
- The JIT is part of the JVM, not of javac.`,
    workedExample: `**Problem.** A teammate says: "I installed Java, but the build says javac is missing."
Diagnose it.

1. Run \`java -version\`. It prints \`17.0.9\`, so a runtime is on the PATH.
2. Run \`javac -version\`. "not recognized" — the compiler is not on the PATH.
3. Run \`where java\` (Windows) or \`which java\`. It points into
   \`C:\\Program Files\\Common Files\\Oracle\\Java\\javapath\`, a runtime shim, not a JDK.
4. Install a JDK, set \`JAVA_HOME=C:\\Program Files\\Eclipse Adoptium\\jdk-17\`, and put
   \`%JAVA_HOME%\\bin\` first on PATH. Open a new terminal; both commands now report 17.

The reasoning: running needs the JVM, building needs javac, and only the JDK has javac.`,
    mcqs: [
      mcq('You run javac Hello.java successfully. Which file appears next to the source?',
        [['Hello.class, holding bytecode for the JVM', true], ['Hello.exe, a native Windows program', false], ['Hello.jar, a zipped runnable archive', false], ['Hello.obj, native machine code for this CPU only', false]],
        'javac writes one .class file per class, containing bytecode. It never produces native executables; a .jar is built separately with the jar tool or Maven.'),
      mcq('The same Hello.class runs on Windows and on Linux. What makes that possible?',
        [['Each OS has its own JVM that reads the same bytecode', true], ['javac embeds machine code for every operating system', false], ['The class file is recompiled from source on each launch', false], ['Linux and Windows share one CPU instruction set', false]],
        'Bytecode is platform-neutral; the JVM is not. Every platform ships its own JVM build, and each executes identical bytecode — that is the "run anywhere" promise.'),
      mcq('A server prints UnsupportedClassVersionError when starting your app. What is the likely cause?',
        [['It was compiled for a newer Java than the server runs', true], ['The main method was declared without the static keyword', false], ['The class name does not match the name of the file', false], ['The server has a JDK installed instead of a plain JRE', false]],
        'Each class file records the Java version it targets. An older JVM refuses class files from a newer version, so compile for the oldest runtime you deploy to or upgrade the server.'),
    ],
    checkpoint: [
      ck('JAVA_BASICS', 'Which of these does a JDK contain that a runtime-only install would not?',
        [['The javac compiler and tools like jar and jshell', true], ['The JVM that executes bytecode at run time', false], ['The java.lang and java.util standard classes', false], ['The garbage collector that frees unused heap objects', false]],
        'The JVM, the standard library and the garbage collector are all needed just to run a program. Only the development tools — javac, jar, jshell, javadoc — distinguish a JDK.'),
      ck('JAVA_BASICS', 'An interviewer asks: "Is the JVM itself platform independent?" What is the accurate answer?',
        [['No — bytecode is portable, but each OS needs its own JVM', true], ['Yes — one JVM binary runs unchanged on every system', false], ['Yes — the JVM is written in pure Java, so it runs anywhere', false], ['No — and for that reason bytecode differs per OS too', false]],
        'Portability lives in the bytecode. The JVM is native software built separately for Windows, Linux and macOS, which is precisely what lets one class file run on all three.'),
      ck('JAVA_BASICS', 'Where does just-in-time (JIT) compilation of a Java program happen?',
        [['Inside the JVM, while the program is running', true], ['Inside javac, when the .java file is compiled', false], ['Inside the jar tool, when packaging classes', false], ['In the operating system loader before main runs', false]],
        'javac only produces bytecode. The JVM watches which methods run often and compiles those to native machine code during execution — that is the JIT.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_START_FIRST_PROGRAM',
    notes: `Every Java program starts at a method with one exact signature, inside a class.

## The smallest program

    public class Main {
        public static void main(String[] args) {
            System.out.println("Hello, CareerPilot");
        }
    }

Save it as **Main.java** — a public class must live in a file with exactly its name, case
included. Then:

    > javac Main.java      (creates Main.class)
    > java Main            (no .java, no .class)
    Hello, CareerPilot

Since Java 11 you can also run a single file directly with \`java Main.java\`; it compiles in
memory and runs. Fine for experiments, but real projects compile.

## Reading the signature

- \`public\` — the JVM, outside your class, must be able to call it.
- \`static\` — it runs before any object exists, so it belongs to the class.
- \`void\` — it returns nothing; the exit status comes from \`System.exit\`.
- \`String[] args\` — command-line arguments. \`java Main a b\` gives \`args.length == 2\`.

## The errors everyone meets first

    Main.java:3: error: ';' expected
            System.out.println("Hi")
                                    ^

The caret points at where the compiler *noticed* the problem, which is just after the missing
semicolon. Read the first error first; later errors are often consequences of it.

    Main.java:3: error: cannot find symbol
            system.out.println("Hi");
            ^
      symbol:   variable system

Java is case-sensitive: \`system\` is not \`System\`.

    error: class main is public, should be declared in a file named main.java

The class is called \`main\` but the file is \`Main.java\`.

    Error: Main method not found in class Main, please define the main method as:
       public static void main(String[] args)

This one compiles fine and fails when you run it — you wrote \`static void Main\` (capital M).
Leaving out \`static\` gives the similar "Main method is not static in class Main". And \`java Main.class\` fails with "Could not find or load main class
Main.class", because \`java\` takes a class name, not a file name.

## print, println

\`System.out.print\` leaves the cursor on the same line; \`println\` adds a newline after.

    System.out.print("A");
    System.out.print("B");
    System.out.println("C");
    System.out.println("D");

prints \`ABC\` then \`D\` on the next line.

## Interview traps

- Can main be overloaded? Yes, but the JVM only calls \`main(String[])\`.
- \`String... args\` is also accepted — varargs is an array.
- Comments: \`//\` to end of line, \`/* */\` block, \`/** */\` Javadoc.`,
    mcqs: [
      mcq('A file named Greeting.java contains "public class Main { ... }". What happens on javac Greeting.java?',
        [['Compile error: public class Main must be in Main.java', true], ['It compiles and produces Greeting.class only', false], ['It compiles, but java Greeting fails at run time', false], ['It compiles and the class is renamed to Greeting', false]],
        'A public top-level class must be declared in a file of the same name. The compiler refuses the file until the class or the file is renamed.'),
      mcq('What does this print? System.out.print("1"); System.out.println("2"); System.out.print("3");',
        [['12 on the first line, then 3 on the next', true], ['1, 2 and 3 each on a separate line', false], ['123 on a single line, with nothing after', false], ['1 on the first line, then 23 on the next', false]],
        'print does not end the line, so 1 and 2 share it; println then ends it, and 3 starts a new line.'),
      mcq('A class has "public void main(String[] args)" (no static). What happens?',
        [['It compiles, but launching it fails with an error', true], ['javac rejects it with a missing static keyword error', false], ['It runs normally; static is optional for main methods', false], ['The JVM creates an object and calls main on it', false]],
        'Without static the method is a legal instance method, so it compiles. The launcher requires public static void main(String[]) and stops with "Main method is not static in class Main".'),
    ],
    checkpoint: [
      ck('JAVA_BASICS', 'After javac Main.java succeeds, which command runs the program?',
        [['java Main', true], ['java Main.class', false], ['javac -run Main', false], ['run Main.class', false]],
        'The java launcher takes a class name, not a file name. "java Main.class" looks for a class literally called Main.class and fails.'),
      ck('JAVA_BASICS', 'The compiler reports "cannot find symbol ... variable system" on line 4. What is the most likely fix?',
        [['Change system to System — Java names are case-sensitive', true], ['Add import java.lang.system; at the top of the file', false], ['Declare a variable named system before line 4', false], ['Rename the source file so that it matches the class', false]],
        'System is a class in java.lang, imported automatically. Lower-case system is an unknown name, so the compiler treats it as an undeclared variable.'),
      ck('JAVA_BASICS', 'Running "java Main red green" — what is args.length inside main?',
        [['2', true], ['3', false], ['0', false], ['1', false]],
        'args holds only the arguments after the class name: "red" and "green". Unlike C, the program name is not included.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_START_INTELLIJ',
    notes: `IntelliJ IDEA is the IDE most Java teams use. The Community edition is free and enough for
everything in this track except Spring-specific tooling.

## A project

**New Project → Java**, choose the JDK (IntelliJ can download one), and pick a build system —
"IntelliJ" for a scratch project, **Maven** for anything real. Code lives under \`src\` (or
\`src/main/java\` with Maven). Right-click the source folder → **New → Java Class**.

## Typing less

- \`psvm\` + Tab → \`public static void main(String[] args) {}\`
- \`sout\` + Tab → \`System.out.println();\`
- \`fori\` + Tab → an indexed for loop
- **Alt+Enter** on anything red or yellow: quick fixes (add import, create method, cast).
- **Ctrl+Space** completion; **Ctrl+Alt+L** reformat; **Shift+Shift** search everywhere;
  **Shift+F6** rename a symbol everywhere it is used (safer than find-and-replace).

(macOS uses Cmd for Ctrl in most of these.)

## Running

The green arrow in the gutter next to \`main\` runs the class. **Ctrl+Shift+F10** runs the class
under the cursor; **Shift+F10** re-runs the last configuration. Program input is typed into the
Run window at the bottom — click into it before typing, otherwise your keystrokes go to the
editor.

## Debugging — the skill that pays for itself

Click in the gutter to set a **breakpoint** (a red dot) on a line, then start with **Debug**
(Shift+F9) instead of Run. Execution stops *before* that line runs.

    int total = 0;
    for (int i = 1; i <= 3; i++) {
        total += i * 10;      // breakpoint here
    }
    System.out.println(total);   // 60

At the breakpoint the Variables pane shows \`i = 1, total = 0\`. Then:

- **F8 Step Over** — run this line, stop at the next one.
- **F7 Step Into** — go inside the method being called on this line.
- **Shift+F8 Step Out** — finish this method, return to the caller.
- **F9 Resume** — run to the next breakpoint.
- **Evaluate Expression** (Alt+F8) — compute \`total * 2\` without editing code.
- Right-click a breakpoint → **Condition** \`i == 3\` to stop only on that iteration.

## Common mistakes

- Running a different file than you edited — check the run configuration name at the top.
- Red code that "compiles fine in the terminal": the project SDK is not set
  (File → Project Structure → SDK).
- Using println debugging for a loop of 10,000 iterations instead of a conditional breakpoint.`,
    mcqs: [
      mcq('A breakpoint sits on the line "total += i * 10;". When the debugger first stops there, what has happened?',
        [['The line has not run yet; total still has its old value', true], ['The line has already run once and total was updated', false], ['The whole loop finished before execution paused there', false], ['Nothing; breakpoints only pause on method declarations', false]],
        'A breakpoint suspends execution before the marked line executes, so the Variables pane shows the values going into that line.'),
      mcq('Stopped on "int tax = calculateTax(price);", you want to see inside calculateTax. Which action?',
        [['Step Into (F7)', true], ['Step Over (F8)', false], ['Step Out (Shift+F8)', false], ['Resume Program (F9)', false]],
        'Step Into enters the called method. Step Over would run calculateTax completely and stop on the next line of the current method.'),
      mcq('A loop runs 5,000 times and fails only when i is 4321. What is the efficient way to inspect it?',
        [['A breakpoint with the condition i == 4321', true], ['Press F8 until i reaches the value 4321', false], ['Print i on every pass and scroll the output', false], ['Comment out the loop and test 4321 manually', false]],
        'A conditional breakpoint stops only when its expression is true, so the debugger lands directly on the failing iteration with all variables visible.'),
    ],
    checkpoint: [
      ck('IDE_PROFICIENCY', 'In IntelliJ, typing psvm and pressing Tab inserts what?',
        [['A public static void main(String[] args) method', true], ['A System.out.println() statement in place', false], ['A private static final constant declaration', false], ['A new public class named after the file currently open', false]],
        'psvm is the live template for the main method; sout inserts System.out.println(). Both save typing the most common boilerplate.'),
      ck('IDE_PROFICIENCY', 'You need to rename a method used in 14 files. What is the safe way in IntelliJ?',
        [['Rename refactoring (Shift+F6) on the method name', true], ['Find and Replace the text across the whole project', false], ['Edit the declaration and then fix every red error', false], ['Copy the method under the new name and keep the old', false]],
        'Rename refactoring changes the declaration and every real reference, and skips unrelated text that happens to match, which a plain find-and-replace would also change.'),
      ck('IDE_PROFICIENCY', 'Paused in a debugger inside a helper method, you want to get back to the line that called it. Which action?',
        [['Step Out (Shift+F8)', true], ['Step Into (F7)', false], ['Step Over (F8)', false], ['Stop the debug session', false]],
        'Step Out runs the rest of the current method and pauses back in the caller, right after the call returns.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_START_MAVEN',
    notes: `Compiling one file with javac is fine. A real project has dozens of classes, libraries it
depends on, tests, and has to produce a jar the same way on every machine. Maven does that.

## The standard layout

    my-app/
      pom.xml
      src/main/java/com/codebegun/App.java
      src/main/resources/          (config files)
      src/test/java/com/codebegun/AppTest.java
      target/                      (generated — never commit it)

Because every Maven project looks like this, any Java developer can open yours and know where
things are.

## pom.xml

    <project>
      <modelVersion>4.0.0</modelVersion>
      <groupId>com.codebegun</groupId>
      <artifactId>my-app</artifactId>
      <version>1.0-SNAPSHOT</version>
      <properties>
        <maven.compiler.release>17</maven.compiler.release>
      </properties>
      <dependencies>
        <dependency>
          <groupId>com.google.code.gson</groupId>
          <artifactId>gson</artifactId>
          <version>2.10.1</version>
        </dependency>
        <dependency>
          <groupId>org.junit.jupiter</groupId>
          <artifactId>junit-jupiter</artifactId>
          <version>5.10.0</version>
          <scope>test</scope>
        </dependency>
      </dependencies>
    </project>

\`groupId:artifactId:version\` (the "coordinates") identify any library. Declare a dependency and
Maven downloads it — and everything *it* depends on (transitive dependencies) — from Maven
Central into \`~/.m2/repository\`, once, for every project on the machine. \`scope test\` means
JUnit is on the classpath for tests only and is not shipped.

\`SNAPSHOT\` marks a version still in development; a release like \`1.0.0\` must never change.

## The lifecycle

    mvn compile     compile src/main/java into target/classes
    mvn test        compile, then run the tests
    mvn package     compile, test, then build target/my-app-1.0-SNAPSHOT.jar
    mvn install     package, then copy the jar into ~/.m2 for other local projects
    mvn clean       delete target/

Each phase runs **every phase before it**. \`mvn package\` runs the tests, and a failing test
stops the build — which is the point. (\`-DskipTests\` exists; using it to "fix" a build hides
the failure.)

## Running the jar

    > java -jar target/my-app-1.0-SNAPSHOT.jar
    no main manifest attribute, in target/my-app-1.0-SNAPSHOT.jar

A plain jar does not say which class has \`main\`. Configure the \`maven-jar-plugin\` with a
\`mainClass\`, or run \`java -cp target/my-app-1.0-SNAPSHOT.jar com.codebegun.App\`. A jar that
also needs Gson at run time needs the dependencies too (the shade or assembly plugin builds a
"fat jar"), which is what Spring Boot's plugin does for you later.

## Common mistakes

- Putting code in \`src/\` directly — Maven only compiles \`src/main/java\`.
- Committing \`target/\` to Git.
- Adding a jar by hand to the project instead of declaring the dependency.`,
    mcqs: [
      mcq('You run mvn package and one unit test fails. What is the result?',
        [['The build fails and no jar is produced', true], ['The jar is built and the failure is only logged', false], ['Maven skips that test and builds the jar anyway', false], ['The jar is built without the failing test class', false]],
        'package comes after test in the lifecycle, and a test failure fails the build. That gate is the reason tests run on every package.'),
      mcq('Where does Maven store the Gson jar after downloading it for your project?',
        [['In the local repository under ~/.m2/repository', true], ['Inside src/main/resources of this project', false], ['Directly in the target/classes directory', false], ['In the JDK lib folder, beside the standard jars', false]],
        'Dependencies go to the local repository once per machine and are shared by every Maven project, so each library is downloaded only once.'),
      mcq('A dependency is declared with <scope>test</scope>. What does that mean?',
        [['Usable in src/test/java only; not shipped with the app', true], ['Downloaded only when you run mvn test explicitly', false], ['Its own tests are run before your project builds', false], ['It is a trial version of the library that expires after testing', false]],
        'Test scope puts the library on the test classpath only. Main code cannot import it and it is not included in what you deploy.'),
    ],
    checkpoint: [
      ck('IDE_PROFICIENCY', 'Which three elements together identify a library in Maven?',
        [['groupId, artifactId and version', true], ['name, packaging and description', false], ['groupId, mainClass and scope', false], ['artifactId, url and license', false]],
        'Maven coordinates are groupId:artifactId:version. The other fields describe a project or a dependency but do not identify it.'),
      ck('IDE_PROFICIENCY', 'java -jar target/app.jar prints "no main manifest attribute". What is wrong?',
        [['The jar does not declare which class contains main', true], ['The class files inside the jar are corrupted', false], ['The project failed its tests during packaging', false], ['Java cannot run any jar built by Maven directly', false]],
        'java -jar reads Main-Class from the manifest. A default Maven jar has none; configure the jar plugin mainClass or run with -cp and the class name.'),
      ck('IDE_PROFICIENCY', 'A teammate put App.java in my-app/src/App.java and Maven compiles nothing. Why?',
        [['Maven only compiles sources under src/main/java', true], ['The class must be named Main for Maven to find it', false], ['Maven needs the file to be listed inside pom.xml', false], ['Sources must be compiled with javac before Maven', false]],
        'Maven works by convention: main sources go in src/main/java, tests in src/test/java. A file outside that layout is simply not a source file to it.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_START_INPUT_OUTPUT',
    notes: `Every coding round and every online judge gives your program text on **standard input**
and compares what you print with an expected answer, character for character.

## Reading with Scanner

    import java.util.Scanner;

    public class Main {
        public static void main(String[] args) {
            Scanner sc = new Scanner(System.in);
            int n = sc.nextInt();
            double price = sc.nextDouble();
            String word = sc.next();          // one token, stops at whitespace
            System.out.println(n + " " + price + " " + word);
        }
    }

Input \`3 49.5 pen\` (on one line or three) prints \`3 49.5 pen\`. \`nextInt\`, \`nextDouble\` and
\`next\` read **tokens** separated by any whitespace; \`nextLine\` reads the rest of the current
line, spaces included.

## The nextInt / nextLine trap

    int age = sc.nextInt();        // input: 21⏎Asha Rao⏎
    String name = sc.nextLine();   // name is "" !

\`nextInt\` consumes \`21\` but leaves the newline after it. \`nextLine\` then reads up to that
newline — an empty string. Fix: call \`sc.nextLine();\` once to discard the rest of the line, or
read every line with \`nextLine\` and convert with \`Integer.parseInt(line.trim())\`.

## Reading until the input ends

    while (sc.hasNextInt()) {
        sum += sc.nextInt();
    }

## Faster input for large data

Scanner is slow for 10⁵+ numbers. Competitive code uses

    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    String[] parts = br.readLine().trim().split("\\\\s+");
    int a = Integer.parseInt(parts[0]);

(\`readLine\` throws \`IOException\`, so \`main\` declares \`throws IOException\`.)

## Printing

    int qty = 3; double total = 149.5; String item = "Notebook";
    System.out.println(item + " x" + qty);            // Notebook x3
    System.out.printf("%s: %d @ %.2f%n", item, qty, total);
    // Notebook: 3 @ 149.50
    System.out.printf("[%5d][%-6s]%n", 42, "ab");    // [   42][ab    ]
    String line = String.format("%.1f%%", 12.345);   // "12.3%"

\`%d\` integers, \`%f\` decimals (\`%.2f\` = 2 places, rounded), \`%s\` anything, \`%n\` newline,
\`%%\` a literal percent. Passing a \`double\` to \`%d\` throws
\`IllegalFormatConversionException\` at run time — the compiler does not check format strings.

## Common mistakes

- Printing prompts like "Enter n:" in a judged problem — that text is extra output and fails.
- Trailing spaces or a missing newline where the judge is strict.
- \`System.out.println(1 + 2 + " items")\` prints \`3 items\`, but
  \`System.out.println("items " + 1 + 2)\` prints \`items 12\`: \`+\` runs left to right and
  becomes concatenation once a String is involved.`,
    mcqs: [
      mcq('Input is "7" on line one and "New Delhi" on line two. Code: int n = sc.nextInt(); String city = sc.nextLine(); What is city?',
        [['An empty string ""', true], ['"New Delhi"', false], ['"New"', false], ['null', false]],
        'nextInt leaves the newline after 7 unread, so nextLine returns the empty remainder of line one. Discard it with an extra nextLine() first.'),
      mcq('What does System.out.printf("%.2f|%4d%n", 3.14159, 7); print?',
        [['3.14|   7', true], ['3.14159|7', false], ['3.14|7   ', false], ['3.1|0007', false]],
        '%.2f rounds to two decimals; %4d right-aligns the integer in a field four characters wide, padding with spaces on the left.'),
      mcq('What does System.out.println("Total: " + 4 + 5); print?',
        [['Total: 45', true], ['Total: 9', false], ['Total: 4 5', false], ['It does not compile', false]],
        '+ is evaluated left to right. "Total: " + 4 is already a String, so + 5 appends "5". Write "Total: " + (4 + 5) to add first.'),
    ],
    checkpoint: [
      ck('JAVA_BASICS', 'Input line is "  Asha   Rao ". What does sc.next() return first?',
        [['"Asha"', true], ['"  Asha"', false], ['"Asha   Rao"', false], ['" "', false]],
        'next() skips leading whitespace and returns one token, stopping at the next whitespace. Use nextLine() to keep the spaces inside a full name.'),
      ck('JAVA_BASICS', 'What happens at run time with System.out.printf("%d%n", 2.5);?',
        [['IllegalFormatConversionException is thrown', true], ['It prints 2 after truncating the decimal', false], ['It prints 3 after rounding to an integer', false], ['The compiler rejects the format string at build time', false]],
        '%d requires an integral argument. Format strings are checked only at run time, so a double for %d compiles and then throws.'),
      ck('JAVA_BASICS', 'A judged problem expects only "42". Your program prints "Enter number: 42". What happens?',
        [['Wrong answer — the prompt text is extra output', true], ['Accepted — judges ignore any text that comes before a number', false], ['Accepted — only the last line is compared', false], ['Runtime error — prompts are not allowed', false]],
        'The judge compares the whole output. Any prompt, label or extra space the problem did not ask for makes the output differ.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_START_DEBUGGING',
    notes: `The first Java bugs fall into three groups: the compiler refuses the code, the launcher
cannot start it, or it runs and prints the wrong thing. Each has its own way of being found.

## 1. The compiler refuses — read the first error

    public class Main {
        public static void main(String[] args) {
            int marks = 85
            System.out.println("Marks: " + Marks);
        }
    }

    Main.java:3: error: ';' expected
            int marks = 85
                          ^
    1 error

Only one error is reported because the parser stopped. Add the \`;\` and compile again:

    Main.java:4: error: cannot find symbol
            System.out.println("Marks: " + Marks);
                                           ^
      symbol:   variable Marks

Case matters: \`marks\` was declared. Fix, recompile, repeat — always from the **first** error.

## 2. The launcher refuses

    > java Main
    Error: Could not find or load main class Main
    Caused by: java.lang.ClassNotFoundException: Main

Causes, in order of likelihood: you are in the wrong folder (no Main.class here); you never
compiled; the class has a \`package com.x;\` line, so it must be run from the source root as
\`java com.x.Main\`.

## 3. It runs, but the answer is wrong — the input trap

    Scanner sc = new Scanner(System.in);
    System.out.print("Roll number: ");
    int roll = sc.nextInt();
    System.out.print("Full name: ");
    String name = sc.nextLine();
    System.out.println(roll + " -> [" + name + "]");

The program never waits for the name and prints \`101 -> []\`. Printing the value inside
brackets made the empty string visible — a habit worth keeping. The cause is the newline
\`nextInt\` left behind. Fix:

    int roll = Integer.parseInt(sc.nextLine().trim());
    String name = sc.nextLine();

## 4. It crashes on input

    Exception in thread "main" java.util.InputMismatchException
        at java.base/java.util.Scanner.nextInt(Scanner.java:2212)
        at Main.main(Main.java:6)

Read the stack trace bottom-up to your own file: line 6 called \`nextInt\` and the next token was
not an integer — perhaps \`12.5\` or \`twelve\`. The bug is the mismatch between what the code
expects and what arrived.

## 5. Formatted output that crashes

    System.out.printf("Average: %d%n", total / 3.0);
    // IllegalFormatConversionException: d != java.lang.Double

Use \`%.2f\` for a double.

## The method

Reproduce with the smallest input, read the message and the line number, form one hypothesis,
change one thing, re-run. Changing three things at once tells you nothing about which one
mattered.`,
    mcqs: [
      mcq('javac reports 9 errors in a file you just edited. Where should you start?',
        [['At the first error; later ones may be caused by it', true], ['At the last error, since it is nearest the end', false], ['At whichever error message is the shortest and easiest one', false], ['Nowhere — rewrite the file from the start again', false]],
        'One missing brace or semicolon confuses the parser for everything after it. Fixing the first error and recompiling often clears several of the others.'),
      mcq('java Main says "Could not find or load main class Main", yet Main.java compiles. What do you check first?',
        [['That you are in the folder where Main.class was written', true], ['That the main method returns int rather than void', false], ['That the JDK version is newer than the JRE version', false], ['That Main.java has been saved with UTF-8 encoding', false]],
        'The launcher searches the classpath, by default the current directory. Running from a different folder, or before compiling, gives exactly this error.'),
      mcq('The stack trace says InputMismatchException at Main.main(Main.java:6). What does it tell you?',
        [['Line 6 read a number, but the next token was not one', true], ['Line 6 has a syntax error the compiler missed', false], ['The input stream was empty when line 6 ran', false], ['Line 6 printed a value of the wrong data type', false]],
        'nextInt and friends throw InputMismatchException when the next token cannot be parsed as the requested type. An empty stream throws NoSuchElementException instead.'),
      mcq('Why print a value as "[" + name + "]" while debugging, rather than just name?',
        [['Brackets make empty strings and stray spaces visible', true], ['println cannot print a String variable on its own', false], ['Brackets force the value to be converted to a String', false], ['It stops the value from being cached by the JVM', false]],
        'An empty string or trailing spaces print as nothing visible. Wrapping the value shows its exact boundaries, which is how the nextLine trap gets spotted.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_START_PRACTICE',
    notes: `Work these without the IDE's help first — compile from the terminal so you see the raw
compiler messages — then check in IntelliJ.

## Exercise 1 — Hello with arguments

Write \`Main\` so that \`java Main Priya\` prints \`Hello, Priya\` and \`java Main\` with no
argument prints \`Hello, stranger\`. (Check \`args.length\`.)

## Exercise 2 — Fix the compile

    public class main {
        public static void Main(string[] args) {
            System.out.println("Ready")
        }
    }

Saved as Main.java. List every problem before fixing any (there are four), then fix and run it.

## Exercise 3 — Read two numbers

Read two integers from one line and print their sum, difference, product and the quotient to two
decimals, each on its own line. For \`7 2\`: \`9\`, \`5\`, \`14\`, \`3.50\`.

## Exercise 4 — Receipt formatting

Read an item name (may contain spaces), a quantity and a unit price, and print a line like

    Blue Pen       x  3     45.00

with \`printf\`: name left-aligned in 14 characters, quantity right-aligned in 3, total
right-aligned in 9 with two decimals.

## Exercise 5 — Maven

Create a Maven project, add Gson as a dependency, and print \`new Gson().toJson(new int[]{1,2,3})\`.
Run \`mvn package\` and run the jar with \`java -cp\`. Then add a deliberately failing test and
watch \`mvn package\` refuse to build.

## Exercise 6 — Debugger drill

Put a breakpoint inside a loop that sums 1..10, make it conditional on \`i == 7\`, and read
\`total\` in the Variables pane before the line runs. (It is 21.)

The graded exercise below is Exercise 3's shape with a name in front — reading a full line and
then numbers, which is exactly where the input trap lives.`,
    mcqs: [
      mcq('With the input "7 2", what does System.out.printf("%.2f%n", 7 / 2); do?',
        [['Throws an exception, because 7 / 2 is an int', true], ['Prints 3.50, the exact decimal quotient', false], ['Prints 3.00 after converting 3 to a double', false], ['Fails to compile because of the int argument', false]],
        '7 / 2 is integer division, giving the int 3, and %f requires a floating-point argument, so printf throws IllegalFormatConversionException. Use 7 / 2.0 or cast first.'),
      mcq('Which reads a whole line such as "Blue Pen" into one String?',
        [['sc.nextLine()', true], ['sc.next()', false], ['sc.nextString()', false], ['sc.readWord()', false]],
        'nextLine returns everything up to the end of the line. next() stops at the first space, and the other two methods do not exist on Scanner.'),
      mcq('java Main is run with no arguments. What does "System.out.println(args[0]);" do?',
        [['Throws ArrayIndexOutOfBoundsException', true], ['Prints null for the missing value and carries on', false], ['Prints an empty line and continues', false], ['Prints the class name, Main', false]],
        'With no arguments args is an empty array of length 0, so index 0 does not exist. Check args.length before reading it.'),
      mcq('What does System.out.printf("[%-6s]%n", "ab"); print?',
        [['[ab    ]', true], ['[    ab]', false], ['[ab]', false], ['[-6ab]', false]],
        'A width of 6 pads the value to six characters, and the minus flag left-aligns it, so the padding goes on the right.'),
      mcq('Which command runs the tests but does not build a jar?',
        [['mvn test', true], ['mvn package', false], ['mvn install', false], ['mvn clean package', false]],
        'test is the phase before package. package, install and clean package all go past test and produce the jar.'),
    ],
    assignment: {
      title: 'Split the Bill',
      description: 'Read a name on one line and a bill total and a head count on the next, then print a greeting, the total, each share to two decimals, and the rupees left over.',
      instructions: `Write a program that reads exactly this input:

- Line 1: the name of the person paying (it may contain spaces; ignore spaces at either end).
- Line 2: two integers — the bill total in rupees and the number of people.

It prints four lines:

    Hello, <name>!
    Total: <total>
    Each pays: <share to 2 decimals>
    Remainder: <rupees left over when the total is split in whole rupees>

**Example.** For the input

    Asha Rao
    1250 4

the output is

    Hello, Asha Rao!
    Total: 1250
    Each pays: 312.50
    Remainder: 2

For \`Ravi\` and \`100 3\`, the last two lines are \`Each pays: 33.33\` and \`Remainder: 1\`.

**Rules**

- Print nothing else — no "Enter name:" prompts.
- \`total / people\` with two ints is integer division. The share must be the exact decimal
  value, rounded to two places by \`printf("%.2f")\`.
- The remainder is what \`%\` gives you.
- Totals can be as large as two billion; check that nothing you compute overflows an \`int\`.

**How it is graded**

Your program is run against the examples above and several hidden cases, and the output is
compared line by line. Spelling, capitals and punctuation matter.`,
      rubric: [
        { criterion: 'Correct output', description: 'All four lines are right for every test case, including a name with surrounding spaces and a share below one rupee.', maxPoints: 60 },
        { criterion: 'Input read correctly', description: 'The full name is read as a line and the numbers after it, without the program skipping or mis-reading the name.', maxPoints: 25 },
        { criterion: 'Readable', description: 'Variables are named for what they hold, and the decimal division is written so the reason for it is obvious.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'java',
        starter: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // TODO: read the name (a whole line), then the total and the number of people
        // TODO: print the greeting, the total, each share to 2 decimals and the remainder
    }
}
`,
        tests: [
          { input: 'Asha Rao\n1250 4\n', expectedOutput: 'Hello, Asha Rao!\nTotal: 1250\nEach pays: 312.50\nRemainder: 2' },
          { input: 'Ravi\n100 3\n', expectedOutput: 'Hello, Ravi!\nTotal: 100\nEach pays: 33.33\nRemainder: 1' },
          { input: 'Meera Krishnan\n999 1\n', expectedOutput: 'Hello, Meera Krishnan!\nTotal: 999\nEach pays: 999.00\nRemainder: 0', isHidden: true },
          { input: 'Team Lead\n7 10\n', expectedOutput: 'Hello, Team Lead!\nTotal: 7\nEach pays: 0.70\nRemainder: 7', isHidden: true },
          { input: '  Arjun  \n2000000000 7\n', expectedOutput: 'Hello, Arjun!\nTotal: 2000000000\nEach pays: 285714285.71\nRemainder: 5', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 60,
      },
    },
  },
  {
    unitCode: 'JT_JAVA_START_INTERVIEW_QUESTION',
    notes: `Three questions asked in almost every fresher Java interview, with answers that show
understanding rather than a memorised line.

## Q1. "What is the difference between the JDK, the JRE and the JVM?"

**Model answer.** "The JVM is the virtual machine that executes bytecode — it loads class files,
verifies them, interprets them and JIT-compiles the hot paths to native code. The JRE is the JVM
plus the standard class library, which is everything needed to *run* a Java program. The JDK is
the JRE plus development tools — javac, jar, jshell, the debugger — so it is what you need to
*build* one. Since Java 11 you normally just install a JDK, which includes the runtime."

**Follow-up:** "So is Java platform independent?" — "The bytecode is. The JVM is not: there is a
separate JVM for each operating system and CPU, and that is what lets the same class file run on
all of them."

## Q2. "Explain public static void main(String[] args). What if I remove static?"

**Model answer.** "\`public\` so the launcher, from outside the class, can call it. \`static\`
because no object exists yet when the program starts — the JVM calls it on the class. \`void\`
because a return value would have nowhere to go; the exit code is set with \`System.exit\`.
\`args\` holds the command-line arguments. Without \`static\` the code still compiles — it is a
valid instance method — but launching fails with 'Main method is not static'."

**Follow-up:** "Can you overload main?" — "Yes, but the launcher only ever calls the
\`String[]\` version; the others are ordinary methods." (Java 21 adds preview "instance main
methods"; mention it only if asked about recent versions.)

## Q3. "Why does my program skip reading the name after reading the age?"

This is asked as a code question:

    int age = sc.nextInt();
    String name = sc.nextLine();

**Model answer.** "\`nextInt\` reads the number but leaves the line terminator in the buffer.
\`nextLine\` reads up to the next line terminator, finds it immediately, and returns an empty
string. I'd either consume the leftover with an extra \`sc.nextLine()\` after \`nextInt\`, or read
every line with \`nextLine\` and parse numbers with \`Integer.parseInt\`, which keeps the reading
consistent."

**Follow-up:** "Scanner is slow for a million numbers — what would you use?" —
"\`BufferedReader\` with \`readLine\` and \`split\`, or a \`StreamTokenizer\`; Scanner uses regular
expressions for every token, which is what makes it slow."

## How to answer

Lead with the one-sentence distinction, then the mechanism, then a concrete consequence. An
answer that ends with "...and that is why you get *this* error" sounds like someone who has
written Java, not read about it.`,
    mcqs: [
      mcq('An interviewer asks what you need on a server that only runs a finished jar. Best answer?',
        [['Just a Java runtime of a high enough version', true], ['A full JDK, because jars must be recompiled', false], ['Maven, to resolve the jar dependencies first', false], ['IntelliJ, to provide the run configuration', false]],
        'Running needs the JVM and standard library — a runtime. Compilers, Maven and IDEs are build-time tools. (Many teams still deploy a JDK image, but it is not required.)'),
      mcq('Why is main declared static?',
        [['The JVM calls it before any object of the class exists', true], ['Static methods run faster than instance methods', false], ['It stops other classes from calling main by name', false], ['Only static methods may take a String array', false]],
        'At start-up there is no instance to call an instance method on, so the entry point has to belong to the class itself.'),
      mcq('Why is Scanner slow for very large inputs compared with BufferedReader?',
        [['It matches every token with regular expressions', true], ['It reads the input one byte per system call, with no buffer', false], ['It converts all the input text to uppercase', false], ['It cannot read more than one line at a time', false]],
        'Scanner parses tokens with regex-based matching, which is flexible but costly. BufferedReader reads big chunks of characters and leaves the parsing to you.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_START_CHECKPOINT',
    notes: `Ten questions on the whole topic: the JDK and JVM, compiling and running, IntelliJ,
Maven, and reading input and printing output. Each is a situation you will meet in the first
week of a Java job. Read every snippet as the compiler would, not as you hope it behaves.`,
    checkpoint: [
      ck('JAVA_BASICS', 'You compile with JDK 21 and deploy to a server running Java 17. The app fails to start. Why?',
        [['Classes compiled for 21 cannot load on a 17 JVM', true], ['A 17 JVM needs every jar to be signed first', false], ['Java 17 servers require a separate JRE install', false], ['The main method signature changed in Java 21', false]],
        'Class files carry their target version and older JVMs reject newer ones. Compile with --release 17 (or maven.compiler.release 17) to target the server.'),
      ck('JAVA_BASICS', 'File Main.java holds "public class Main" with "static public void main(String[] a)". Does it run?',
        [['Yes — modifier order and the parameter name are free', true], ['No — public must be written before static', false], ['No — the parameter has to be named args', false], ['It compiles but the launcher cannot find it', false]],
        'Modifiers may appear in any order and the parameter can have any name. What the launcher needs is public, static, void, the name main and a String[] parameter.'),
      ck('JAVA_BASICS', 'What is printed by System.out.println(10 + 20 + "px" + 10 + 20);?',
        [['30px1020', true], ['1020px1020', false], ['30px30', false], ['60px', false]],
        'Evaluation is left to right: 10 + 20 is 30 (numbers), then "px" makes it a String, after which each + appends text: "30px" + "10" + "20".'),
      ck('JAVA_BASICS', 'Input: "3" then "Hello World" on the next line. Which code stores "Hello World" in msg?',
        [['int n = sc.nextInt(); sc.nextLine(); String msg = sc.nextLine();', true], ['int n = sc.nextInt(); String msg = sc.nextLine();', false], ['int n = sc.nextInt(); String msg = sc.next();', false], ['String msg = sc.nextLine(); int n = sc.nextInt();', false]],
        'The extra nextLine() discards the newline left after 3. Without it msg is empty; next() would read only "Hello"; reading the line first would get "3".'),
      ck('JAVA_BASICS', 'What does System.out.printf("%.1f%%%n", 45.678); print?',
        [['45.7%', true], ['45.6%', false], ['45.678%', false], ['45.7%%', false]],
        '%.1f rounds to one decimal place (45.7), %% prints a single percent sign, and %n ends the line.'),
      ck('JAVA_BASICS', 'BufferedReader.readLine() is used in main. What must main also have to compile?',
        [['A throws IOException clause, or a try/catch', true], ['An import of java.util.Scanner as well', false], ['The static keyword removed from main', false], ['A call to System.exit(0) at the very end of the method', false]],
        'readLine declares the checked exception IOException, so the caller must either catch it or declare it with throws.'),
      ck('IDE_PROFICIENCY', 'In IntelliJ, code turns red on an unknown class name ArrayList. What does Alt+Enter offer?',
        [['To add the import java.util.ArrayList', true], ['To rename ArrayList to a known class', false], ['To delete the line that uses it', false], ['To download ArrayList from Maven Central', false]],
        'Alt+Enter shows context actions; for an unresolved standard class the first one is the import. ArrayList is part of the JDK, so nothing needs downloading.'),
      ck('IDE_PROFICIENCY', 'You run mvn clean install. What ends up in ~/.m2/repository?',
        [['Your project jar, for other local projects to use', true], ['Only the downloaded dependencies of the project', false], ['The compiled test classes and their reports', false], ['A backup of src/ before the clean phase ran', false]],
        'install runs everything up to package and then copies the built artifact into the local repository, where other projects can declare it as a dependency.'),
      ck('IDE_PROFICIENCY', 'Which Maven folder holds unit tests so they never ship in the jar?',
        [['src/test/java', true], ['src/main/test', false], ['test/java', false], ['src/main/java/test', false]],
        'Test sources live in src/test/java. They compile to target/test-classes and are run by mvn test, but are not packaged into the main jar.'),
      ck('IDE_PROFICIENCY', 'Stopped at a breakpoint, you want the value of price * qty without editing code. What do you use?',
        [['Evaluate Expression in the debugger', true], ['Step Into on the multiplication', false], ['A new println, then re-run it all', false], ['Rebuild the project with Maven and run it again', false]],
        'Evaluate Expression computes any expression in the current frame, using the live variable values, with no code change or restart.'),
    ],
  },

  /* ══ JT_JAVA_BASICS — Java Fundamentals ═════════════════════════════════════════════════ */
  {
    unitCode: 'JT_JAVA_BASICS_PRIMITIVES',
    notes: `Java is statically typed: every variable has a type fixed at compile time. There are
eight **primitive** types, which hold a value directly; everything else is a reference to an
object.

## The eight primitives

    type     size     range / notes                        default (fields)
    byte     8 bit    -128 .. 127                           0
    short    16 bit   -32,768 .. 32,767                     0
    int      32 bit   about ±2.1 billion                    0
    long     64 bit   about ±9.2 × 10^18                    0L
    float    32 bit   ~7 significant digits                 0.0f
    double   64 bit   ~15 significant digits                0.0
    char     16 bit   one UTF-16 code unit, 0 .. 65,535     '\\u0000'
    boolean  —        true or false (not 0/1)               false

Use \`int\` for counts, \`long\` for anything that can pass 2 billion (milliseconds, phone numbers
as numbers, sums of large values), \`double\` for measurements, \`boolean\` for flags.

## Literals

    int count = 1_000_000;          // underscores are allowed for readability
    long big = 3_000_000_000L;      // without L: "integer number too large"
    float ratio = 0.75f;            // without f: "possible lossy conversion from double"
    double pi = 3.14159;
    char grade = 'A';               // single quotes; "A" is a String
    int hex = 0xFF;                 // 255

## Overflow is silent

    int max = Integer.MAX_VALUE;    // 2147483647
    System.out.println(max + 1);    // -2147483648

Integer arithmetic wraps around with no error. \`long ms = 365 * 24 * 60 * 60 * 1000;\`
overflows *before* being stored, even though the variable is a \`long\`, because the right side is all
\`int\`. Write \`365L * 24 * ...\` so the arithmetic is done in \`long\`. \`Math.addExact\` throws
instead of wrapping when you need to detect it.

## Integer division

    System.out.println(7 / 2);      // 3   (both int: the fraction is dropped)
    System.out.println(-7 / 2);     // -3  (truncates toward zero)
    System.out.println(7 / 2.0);    // 3.5
    double avg = 7 / 2;             // 3.0 — divided as ints, then widened
    System.out.println(5 / 0);      // ArithmeticException: / by zero
    System.out.println(5.0 / 0);    // Infinity

## Floating point is approximate

    System.out.println(0.1 + 0.2);  // 0.30000000000000004

Never use \`double\` for money; use \`long\` paise or \`BigDecimal\`. Never compare doubles with
\`==\`; check \`Math.abs(a - b) < 1e-9\`.

## char is a number

    char c = 'A';
    System.out.println(c + 1);          // 66
    System.out.println((char) (c + 1)); // B

## Local variables have no default

    int total;
    System.out.println(total);   // compile error: variable total might not have been initialized

Fields and array elements get defaults; local variables must be assigned before use.

## var (Java 10+)

\`var name = "Asha";\` infers \`String\`. The type is still fixed — \`var\` is not dynamic typing.`,
    mcqs: [
      mcq('What does this print? int x = Integer.MAX_VALUE; x++; System.out.println(x);',
        [['-2147483648', true], ['2147483648', false], ['2147483647', false], ['An ArithmeticException', false]],
        'int arithmetic wraps on overflow without any error. One past the maximum is the minimum value, -2147483648.'),
      mcq('Which declaration fails to compile?',
        [['float rate = 2.5;', true], ['double rate = 2.5f;', false], ['long n = 2500;', false], ['int n = 0x1F;', false]],
        '2.5 is a double literal, and narrowing double to float is not done implicitly. The fix is 2.5f. The others are widening conversions or plain int literals.'),
      mcq("What does System.out.println('a' + 1); print?",
        [['98', true], ['b', false], ['a1', false], ['97', false]],
        "char is a numeric type: 'a' is 97, and char + int gives an int, 98. Casting with (char) would print b; a String would be needed to print a1."),
    ],
    checkpoint: [
      ck('JAVA_BASICS', 'What is the value of avg? double avg = 9 / 2;',
        [['4.0', true], ['4.5', false], ['4', false], ['5.0', false]],
        '9 / 2 is evaluated first as int division, giving 4; only then is 4 widened to the double 4.0. Write 9 / 2.0 to get 4.5.'),
      ck('JAVA_BASICS', 'long ms = 30 * 24 * 60 * 60 * 1000; — why is ms wrong?',
        [['The product overflows as int before it is stored', true], ['long cannot hold a value as large as 2.5 billion', false], ['The literal 1000 needs an L suffix to compile', false], ['Multiplication of five values loses precision', false]],
        'Every operand is an int, so the multiplication runs in int and wraps past 2^31 - 1. Making the first operand 30L forces long arithmetic throughout.'),
      ck('JAVA_BASICS', 'Inside a method: int count; System.out.println(count); — what happens?',
        [['Compile error: count might not have been initialized', true], ['It prints 0, the default value for an int', false], ['It prints a random value left in memory', false], ['It throws NullPointerException at run time', false]],
        'Local variables get no default value, and the compiler refuses any read before a definite assignment. Only fields and array elements default to 0.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_BASICS_CASTING_WRAPPERS',
    notes: `Converting between types is where a lot of quiet data loss happens, and the wrapper
classes add a comparison trap that interviewers love.

## Widening is automatic

    byte → short → int → long → float → double
              char ↗

A smaller type goes into a bigger one with no cast: \`long l = 42; double d = l;\`. (long → float
can lose precision but is still allowed implicitly.)

## Narrowing needs a cast, and can lose data

    double price = 99.99;
    int rupees = (int) price;          // 99 — truncated, not rounded
    int rounded = (int) Math.round(price);  // 100
    int big = 300;
    byte b = (byte) big;               // 44 — 300 - 256, the high bits are discarded
    byte c = (byte) 200;               // -56

A cast tells the compiler "I accept the loss". It never checks the value fits.

## Compound assignment hides a cast

    short s = 10;
    s = s + 1;    // compile error: s + 1 is an int
    s += 1;       // compiles — += casts back to short
    int i = 5;
    i += 2.7;     // compiles; i is 7

## Strings to numbers and back

    int n = Integer.parseInt("42");        // 42
    double d = Double.parseDouble("3.5");
    String s = String.valueOf(42);         // "42"
    String t = "" + 42;                    // also "42"
    Integer.parseInt("42.0");              // NumberFormatException
    Integer.parseInt(" 42");               // NumberFormatException — trim first

## Wrapper classes and autoboxing

Each primitive has a wrapper: \`Integer\`, \`Long\`, \`Double\`, \`Character\`, \`Boolean\`… Collections
hold objects only, so \`List<Integer>\`, never \`List<int>\`. The compiler converts automatically:

    Integer boxed = 7;          // autoboxing: Integer.valueOf(7)
    int raw = boxed;            // unboxing: boxed.intValue()

## The == trap

    Integer a = 127, b = 127;
    System.out.println(a == b);       // true
    Integer x = 128, y = 128;
    System.out.println(x == y);       // false
    System.out.println(x.equals(y));  // true

\`==\` on objects compares references. \`Integer.valueOf\` caches the values -128 to 127, so small
numbers share one object and larger ones do not. **Compare wrapper values with \`equals\`** (or
unbox to \`int\`).

## Unboxing null

    Integer stock = null;
    int left = stock;    // NullPointerException

A missing value from a map or a database column is \`null\`; unboxing it crashes. Check first.

## Interview traps

- \`(int) 3.99\` is 3; \`(int) -3.99\` is -3 (truncation toward zero).
- \`Math.round(2.5)\` is 3 but \`Math.round(-2.5)\` is -2 (rounds half up).
- \`new Integer(5)\` is deprecated; use \`Integer.valueOf(5)\`.`,
    mcqs: [
      mcq('What does this print? Integer p = 1000, q = 1000; System.out.println(p == q);',
        [['false', true], ['true', false], ['It does not compile', false], ['NullPointerException', false]],
        '== compares the two Integer references. 1000 is outside the -128..127 cache, so autoboxing creates two distinct objects. p.equals(q) would be true.'),
      mcq('What is the value of b after: byte b = (byte) 130;',
        [['-126', true], ['130', false], ['127', false], ['2', false]],
        'A byte holds -128..127. Casting keeps only the low 8 bits: 130 - 256 = -126. The cast does not clamp the value to the maximum.'),
      mcq('Which line fails to compile, given short s = 5;?',
        [['s = s * 2;', true], ['s *= 2;', false], ['s++;', false], ['int t = s * 2;', false]],
        's * 2 is an int expression and cannot be assigned to a short without a cast. Compound assignment and ++ include an implicit cast, so they compile.'),
    ],
    checkpoint: [
      ck('JAVA_BASICS', 'What does (int) 7.99 + (int) -7.99 evaluate to?',
        [['0', true], ['1', false], ['-1', false], ['2', false]],
        'Casting a double to int truncates toward zero: (int) 7.99 is 7 and (int) -7.99 is -7, so the sum is 0.'),
      ck('JAVA_BASICS', 'Map lookup returns null into Integer qty; then int n = qty; runs. What happens?',
        [['NullPointerException while unboxing', true], ['n becomes 0 as a default value', false], ['The compiler rejects the assignment', false], ['n becomes -1 to signal a miss', false]],
        'Unboxing calls qty.intValue() behind the scenes, and calling a method on null throws NullPointerException.'),
      ck('JAVA_BASICS', 'Which call throws NumberFormatException?',
        [['Integer.parseInt("12.0")', true], ['Integer.parseInt("-12")', false], ['Double.parseDouble("12")', false], ['Integer.parseInt("+12")', false]],
        'parseInt accepts an optional sign and digits only, so "12.0" fails. A double parser happily accepts "12".'),
    ],
  },
  {
    unitCode: 'JT_JAVA_BASICS_OPERATORS',
    notes: `Most operator questions in an interview are "what is the value of this expression?". The
rules are few; apply them mechanically.

## Arithmetic and remainder

    System.out.println(17 % 5);    // 2
    System.out.println(-17 % 5);   // -2   (sign follows the left operand)
    System.out.println(17 % -5);   // 2
    System.out.println(5.5 % 2);   // 1.5

So \`n % 2 == 1\` misses negative odd numbers; test oddness with \`n % 2 != 0\`.

## Increment and decrement

    int a = 5;
    int b = a++;    // b = 5, a = 6  (use, then increment)
    int c = ++a;    // a = 7, c = 7  (increment, then use)

    int i = 5;
    i = i++;
    System.out.println(i);   // 5

The last one: \`i++\` yields 5 and sets \`i\` to 6, then the assignment stores the 5 back. Never
write \`i = i++\`.

    int x = 2;
    int y = x++ + ++x;   // 2 + 4 = 6, x is 4

Operands are evaluated left to right, so the left \`x++\` gives 2 (x becomes 3), then \`++x\`
makes x 4 and gives 4.

## Comparison and logic

\`==  !=  <  <=  >  >=\` give a boolean. \`&&\` and \`||\` **short-circuit**: the right side is not
evaluated if the left already decides the result.

    String name = null;
    if (name != null && name.length() > 3) { ... }   // safe
    if (name != null & name.length() > 3) { ... }    // NullPointerException

\`&\` and \`|\` on booleans evaluate both sides. On ints they are bitwise: \`6 & 3\` is 2,
\`6 | 3\` is 7, \`6 ^ 3\` is 5.

## The ternary operator

    String result = marks >= 40 ? "Pass" : "Fail";

## Precedence (high to low, the part you need)

    ++ --  !         unary
    *  /  %
    +  -
    <  <=  >  >=
    ==  !=
    &&
    ||
    ?:
    =  +=  -= ...

    System.out.println(2 + 3 * 4);         // 14
    System.out.println((2 + 3) * 4);       // 20
    System.out.println(10 - 4 - 3);        // 3  (left to right)
    boolean ok = 5 > 3 || 1 / 0 > 0;       // true — || never evaluates 1 / 0

When in doubt, add parentheses: the next reader will not have the table memorised either.

## Interview traps

- \`=\` vs \`==\`: \`if (x = 5)\` does not compile in Java (an int is not a boolean) — but
  \`if (flag = true)\` does, and is always true.
- Shift: \`1 << 3\` is 8; \`-16 >> 2\` is -4; \`-16 >>> 28\` is 15 (unsigned shift).
- \`Math.abs(Integer.MIN_VALUE)\` is still negative — there is no positive counterpart.`,
    mcqs: [
      mcq('What does this print? int a = 3; int b = a++ * 2 + a; System.out.println(b);',
        [['10', true], ['9', false], ['11', false], ['12', false]],
        'Left to right: a++ yields 3 and sets a to 4, so 3 * 2 = 6, then + a adds 4, giving 10.'),
      mcq('What is the value of -13 % 4 in Java?',
        [['-1', true], ['3', false], ['1', false], ['-3', false]],
        'Java remainder takes the sign of the dividend. -13 / 4 truncates to -3, and -13 - (-3 × 4) = -1.'),
      mcq('String s = null; which expression evaluates to false without throwing?',
        [['s != null && s.isEmpty()', true], ['s != null & s.isEmpty()', false], ['s.isEmpty() && s != null', false], ['!s.isEmpty() || s == null', false]],
        '&& skips its right side when the left is false, so isEmpty is never called on null. The others all call a method on s and throw NullPointerException.'),
    ],
    checkpoint: [
      ck('JAVA_BASICS', 'What is printed? int k = 10; k = k++ + k--; System.out.println(k);',
        [['21', true], ['20', false], ['19', false], ['22', false]],
        'k++ yields 10 and k becomes 11; k-- then yields 11 and k becomes 10; the sum 21 is assigned, overwriting k.'),
      ck('JAVA_BASICS', 'What does System.out.println(1 + 2 * 3 - 4 / 2); print?',
        [['5', true], ['7', false], ['2', false], ['3', false]],
        '* and / bind tighter: 2 * 3 = 6 and 4 / 2 = 2, then left to right 1 + 6 - 2 = 5.'),
      ck('JAVA_BASICS', 'boolean flag = false; if (flag = true) System.out.println("on"); — what happens?',
        [['It prints "on", because flag is assigned true', true], ['Compile error: = is not allowed in a condition', false], ['Nothing is printed, because flag was false', false], ['It prints "on" only when assertions are enabled', false]],
        'flag = true is an assignment whose value is true, and a boolean is a valid condition, so it compiles and always runs the branch. With an int the same mistake would not compile.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_BASICS_CONDITIONS',
    notes: `## if / else if / else

    int marks = 72;
    if (marks >= 90) {
        System.out.println("A");
    } else if (marks >= 75) {
        System.out.println("B");
    } else if (marks >= 60) {
        System.out.println("C");
    } else {
        System.out.println("Fail");
    }
    // C

Branches are tested top to bottom and only the **first** true one runs. Put the narrowest
condition first: testing \`marks >= 60\` before \`marks >= 90\` would print C for 95.

Always use braces. Without them only one statement belongs to the \`if\`:

    if (balance < 0)
        System.out.println("Overdrawn");
        sendAlert();          // runs every time — indentation means nothing to javac

And a stray semicolon ends the \`if\` immediately: \`if (x > 0); { ... }\` runs the block always.

## The classic switch — and fall-through

    int day = 3;
    switch (day) {
        case 1:
            System.out.println("Mon");
        case 3:
            System.out.println("Wed");
        case 4:
            System.out.println("Thu");
            break;
        default:
            System.out.println("Other");
    }
    // Wed
    // Thu

Execution jumps to the matching \`case\` and then **falls through** every following case until a
\`break\`. Forgetting \`break\` is the classic switch bug. Fall-through is occasionally useful to
group labels:

    case "SAT":
    case "SUN":
        System.out.println("Weekend");
        break;

A switch works on \`int\`, \`char\`, \`byte\`, \`short\`, their wrappers, \`String\` (compared with
\`equals\`) and enums — not \`long\`, \`double\` or \`boolean\`. Switching on a \`null\` String throws
NullPointerException.

## Switch expressions (Java 14+)

    String type = switch (day) {
        case 1, 2, 3, 4, 5 -> "Weekday";
        case 6, 7 -> "Weekend";
        default -> "Invalid";
    };

Arrow cases **never fall through**, several labels share a case, and the switch produces a
value. As an expression it must be exhaustive — leave out \`default\` on an int and it will not
compile. A block that computes a value uses \`yield\`:

    int fee = switch (plan) {
        case "BASIC" -> 999;
        case "PRO" -> {
            int base = 1999;
            yield base + 500;
        }
        default -> 0;
    };

## Choosing

- Ranges (\`marks >= 75\`) → \`if\`; a switch matches exact values only.
- One variable against many fixed values → \`switch\`, preferably the arrow form.
- Comparing Strings in an \`if\`: \`"YES".equals(answer)\`, never \`answer == "YES"\`.

## Interview traps

- Duplicate case labels do not compile.
- \`default\` can appear anywhere; with fall-through, its position matters.
- The ternary \`?:\` is an expression; \`if\` is a statement.`,
    mcqs: [
      mcq('What does this print? int n = 2; switch (n) { case 1: System.out.print("a"); case 2: System.out.print("b"); case 3: System.out.print("c"); default: System.out.print("d"); }',
        [['bcd', true], ['b', false], ['bd', false], ['abcd', false]],
        'Execution starts at case 2 and, with no break anywhere, falls through case 3 and default, printing b, c and d.'),
      mcq('Which type can NOT be used as the selector of a switch?',
        [['long', true], ['String', false], ['char', false], ['Integer', false]],
        'switch supports int and smaller integral types, their wrappers, String and enums. long, float, double and boolean are not allowed.'),
      mcq('What is result? int x = 7; String result = switch (x % 3) { case 0 -> "fizz"; case 1 -> "one"; default -> "two"; };',
        [['"one"', true], ['"two"', false], ['"fizz"', false], ['It does not compile', false]],
        '7 % 3 is 1, so the case 1 arrow is chosen. Arrow cases never fall through, and default makes the expression exhaustive.'),
    ],
    checkpoint: [
      ck('JAVA_CONTROL_FLOW', 'int score = 95; if (score > 50) print("pass"); else if (score > 90) print("distinction"); — what prints?',
        [['Only "pass"', true], ['Only "distinction"', false], ['"pass" then "distinction"', false], ['Nothing at all', false]],
        'Only the first true branch of an if-else-if chain runs. 95 > 50 is true, so the distinction check is never reached; the narrower test must come first.'),
      ck('JAVA_CONTROL_FLOW', 'int t = 5; if (t > 10); { System.out.println("hot"); } — what happens?',
        [['"hot" is printed, since the if ends at the ;', true], ['Nothing prints, because 5 is not over 10', false], ['Compile error: an empty if is not allowed', false], ['"hot" is printed only when t exceeds 10', false]],
        'The semicolon is an empty statement and is the entire body of the if. The braces that follow are an ordinary block that always runs.'),
      ck('JAVA_CONTROL_FLOW', 'An int switch expression has cases 1 and 2 but no default. What happens?',
        [['Compile error: the switch expression is not exhaustive', true], ['It returns 0 for any value without a case', false], ['It throws an exception for an unmatched value', false], ['It returns null for any value without a case', false]],
        'A switch expression must produce a value for every possible input. For an int that means a default is required; the compiler rejects it otherwise.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_BASICS_LOOPS',
    notes: `## for — when you know the count

    for (int i = 1; i <= 5; i++) {
        System.out.print(i + " ");
    }
    // 1 2 3 4 5

Initialise once, test before every pass, update after every pass. \`i\` exists only inside the
loop.

## while — when you loop until something happens

    int n = 1234, digits = 0;
    while (n > 0) {
        n /= 10;
        digits++;
    }
    System.out.println(digits);   // 4

## do-while — the body runs at least once

    int choice;
    do {
        choice = sc.nextInt();
    } while (choice < 1 || choice > 3);

The test is at the bottom, so even a false condition runs the body once — right for a menu that
must be shown before you know the answer. Note the \`;\` after the \`while\`.

## for-each — reading every element

    int[] marks = {70, 85, 90};
    int sum = 0;
    for (int m : marks) {
        sum += m;
    }
    // sum = 245

\`m\` is a **copy** of each element. \`m = 0;\` inside the loop changes nothing in the array. Use
an indexed loop when you need the index or want to modify elements.

## break and continue

    for (int i = 1; i <= 10; i++) {
        if (i % 3 == 0) continue;   // skip the rest of this pass
        if (i > 7) break;            // leave the loop entirely
        System.out.print(i + " ");
    }
    // 1 2 4 5 7

In nested loops \`break\` leaves only the innermost loop. A label leaves an outer one:

    outer:
    for (int r = 0; r < 3; r++) {
        for (int c = 0; c < 3; c++) {
            if (r * c == 2) break outer;
            System.out.print(r + "" + c + " ");
        }
    }
    // 00 01 02 10 11

## Nested loops — a pattern

    for (int row = 1; row <= 3; row++) {
        for (int col = 1; col <= row; col++) {
            System.out.print("*");
        }
        System.out.println();
    }
    // *
    // **
    // ***

The inner loop runs fully for every pass of the outer one: 1 + 2 + 3 = 6 stars.

## Common mistakes

- Off-by-one: \`i <= arr.length\` reads one past the end.
- Forgetting to change the loop variable in a \`while\` → an infinite loop.
- \`for (int i = 0; i < 10; i++);\` — the semicolon is the whole loop body.
- Modifying a list inside a for-each over it → ConcurrentModificationException (later topic).
- Using \`double\` as a loop counter: \`for (double d = 0; d != 1.0; d += 0.1)\` never stops,
  because 0.1 added ten times is not exactly 1.0.`,
    mcqs: [
      mcq('What does this print? int i = 10; do { System.out.print(i + " "); i++; } while (i < 5);',
        [['10 ', true], ['Nothing at all', false], ['10 11 12 13 14 ', false], ['It loops forever', false]],
        'A do-while tests its condition after the body, so the body runs once and prints 10 before 11 < 5 is found false.'),
      mcq('How many times is "x" printed? for (int a = 0; a < 3; a++) for (int b = a; b < 3; b++) System.out.print("x");',
        [['6', true], ['9', false], ['3', false], ['4', false]],
        'The inner loop starts at a: it runs 3 times when a is 0, 2 times when a is 1 and once when a is 2, totalling 6.'),
      mcq('What does this print? int[] v = {1, 2, 3}; for (int e : v) { e = e * 10; } System.out.println(v[0]);',
        [['1', true], ['10', false], ['0', false], ['It does not compile', false]],
        'The for-each variable is a copy of each element. Assigning to e changes the copy only; the array still holds 1, 2, 3.'),
    ],
    checkpoint: [
      ck('JAVA_CONTROL_FLOW', 'What is printed? int s = 0; for (int i = 1; i <= 10; i++) { if (i % 2 == 0) continue; s += i; } System.out.println(s);',
        [['25', true], ['30', false], ['55', false], ['20', false]],
        'continue skips the even values, so only the odd numbers 1, 3, 5, 7 and 9 are added, giving 25.'),
      ck('JAVA_CONTROL_FLOW', 'In two nested for loops, a plain break inside the inner loop does what?',
        [['Ends the inner loop; the outer loop continues', true], ['Ends both loops and continues after them', false], ['Ends the whole method that holds the loops', false], ['Skips to the next pass of the inner loop', false]],
        'break leaves only the innermost enclosing loop or switch. To leave the outer loop too, label it and use break label.'),
      ck('JAVA_CONTROL_FLOW', 'What happens? int count = 0; while (count < 3); { count++; }',
        [['It loops forever: the ; is the entire loop body', true], ['It runs the block three times and then stops', false], ['Compile error: a while needs a non-empty body', false], ['It runs the block once and then stops at 1', false]],
        'The semicolon is an empty body, so the loop keeps testing count < 3 with count stuck at 0. The braces afterwards never get a chance to run.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_BASICS_ARRAYS',
    notes: `An array is a fixed-size, indexed block of values of one type. Its length is set when it is
created and can never change.

## Creating

    int[] marks = new int[5];               // {0, 0, 0, 0, 0}
    String[] names = new String[3];         // {null, null, null}
    boolean[] seen = new boolean[4];        // all false
    int[] primes = {2, 3, 5, 7};            // initializer: length 4
    double[] prices;                        // declared, not created yet
    prices = new double[]{9.5, 20.0};       // initializer outside a declaration needs new

Elements get default values: 0 for numbers, \`false\` for boolean, \`'\\u0000'\` for char, and
\`null\` for objects.

## Indexing and length

    System.out.println(primes.length);      // 4 — a field, no parentheses
    System.out.println(primes[0]);          // 2
    System.out.println(primes[primes.length - 1]);  // 7
    primes[4] = 11;   // ArrayIndexOutOfBoundsException: Index 4 out of bounds for length 4

Valid indexes are \`0\` to \`length - 1\`. (Strings use \`length()\`, a method; arrays use
\`length\`, a field; lists use \`size()\`.)

## Printing and common utilities

    int[] a = {5, 2, 9, 1};
    System.out.println(a);                    // [I@1b6d3586 — type and hash, not contents
    System.out.println(Arrays.toString(a));   // [5, 2, 9, 1]
    Arrays.sort(a);                           // a is now [1, 2, 5, 9] — sorts in place
    int pos = Arrays.binarySearch(a, 5);      // 2 (array must be sorted)
    int[] copy = Arrays.copyOf(a, 6);         // [1, 2, 5, 9, 0, 0]
    Arrays.fill(a, 7);                        // [7, 7, 7, 7]

(\`import java.util.Arrays;\`)

## Arrays are objects — assignment copies the reference

    int[] x = {1, 2, 3};
    int[] y = x;
    y[0] = 99;
    System.out.println(x[0]);                 // 99 — same array
    System.out.println(x == y);               // true
    int[] z = {99, 2, 3};
    System.out.println(x == z);               // false — different arrays
    System.out.println(Arrays.equals(x, z));  // true — same contents

## A typical algorithm: find the largest

    int[] temps = {31, 28, 35, 33};
    int max = temps[0];                // not 0 — all values could be negative
    for (int i = 1; i < temps.length; i++) {
        if (temps[i] > max) max = temps[i];
    }
    // 35

## 2D arrays

    int[][] grid = new int[3][4];    // 3 rows, 4 columns
    grid[1][2] = 5;
    System.out.println(grid.length);      // 3 (rows)
    System.out.println(grid[0].length);   // 4 (columns)

    int[][] m = {{1, 2, 3}, {4, 5, 6}};
    for (int r = 0; r < m.length; r++) {
        for (int c = 0; c < m[r].length; c++) {
            System.out.print(m[r][c] + " ");
        }
        System.out.println();
    }
    // 1 2 3
    // 4 5 6
    System.out.println(Arrays.deepToString(m));   // [[1, 2, 3], [4, 5, 6]]

A 2D array is an array of arrays, so rows can differ in length (**jagged**):
\`int[][] tri = new int[3][]; tri[0] = new int[1]; tri[1] = new int[2];\` — use \`m[r].length\`,
never a fixed column count.

## Interview traps

- \`int[] a = new int[0];\` is legal: an empty array.
- \`int a[]\` also compiles (C style) but \`int[] a\` is the Java convention.
- For a 1D array of objects, \`new String[3]\` creates no Strings — three nulls.`,
    mcqs: [
      mcq('What does this print? int[] p = {4, 8, 15}; int[] q = p; q[1] = 0; System.out.println(Arrays.toString(p));',
        [['[4, 0, 15]', true], ['[4, 8, 15]', false], ['[0, 8, 15]', false], ['[4, 0, 0]', false]],
        'q = p copies the reference, not the array. Both names point at one array, so a change through q is visible through p.'),
      mcq('What does this do? String[] s = new String[2]; System.out.println(s[1].length());',
        [['Throws NullPointerException', true], ['Prints 0', false], ['Prints 2', false], ['Fails to compile', false]],
        'new String[2] creates two null slots, not two empty Strings. Calling length() on null throws NullPointerException.'),
      mcq('For int[][] g = new int[4][6];, what are g.length and g[0].length?',
        [['4 and 6', true], ['6 and 4', false], ['24 and 6', false], ['4 and 24', false]],
        'The first dimension is the number of rows (the outer array\'s length) and each row is an int[6], so 4 and 6.'),
    ],
    checkpoint: [
      ck('JAVA_ARRAYS', 'int[] a = {3, 6, 9}; for (int i = 0; i <= a.length; i++) sum += a[i]; — what happens?',
        [['ArrayIndexOutOfBoundsException when i is 3', true], ['It sums all three values and prints 18', false], ['Compile error: <= cannot be used with length', false], ['It skips the last element and sums to 9', false]],
        'The valid indexes are 0, 1 and 2. With <= the loop also tries a[3], which does not exist, so it throws on the last pass.'),
      ck('JAVA_ARRAYS', 'int[] a = {1, 2}; int[] b = {1, 2}; what do a == b and Arrays.equals(a, b) return?',
        [['false and true', true], ['true and true', false], ['false and false', false], ['true and false', false]],
        '== compares references and these are two separate arrays. Arrays.equals compares length and every element, which match.'),
      ck('JAVA_ARRAYS', 'What does System.out.println(Arrays.toString(new double[3])); print?',
        [['[0.0, 0.0, 0.0]', true], ['[null, null, null]', false], ['[0, 0, 0]', false], ['[]', false]],
        'A new double array is filled with the default 0.0, and Arrays.toString prints each element in double format.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_BASICS_STRINGS',
    notes: `\`String\` is the most used class in Java, and three of its properties cause most of the
bugs: it is immutable, it is compared with \`equals\`, and it is indexed from 0.

## Immutable

    String s = "java";
    s.toUpperCase();
    System.out.println(s);        // java — unchanged
    s = s.toUpperCase();
    System.out.println(s);        // JAVA

No String method changes the string. Each returns a new one, which you must keep.

## == versus equals

    String a = "hello";
    String b = "hello";
    String c = new String("hello");
    System.out.println(a == b);        // true  — both literals are the same pooled object
    System.out.println(a == c);        // false — new always makes a new object
    System.out.println(a.equals(c));   // true  — same characters
    String in = sc.next();             // user types hello
    System.out.println(in == a);       // false — built at run time, not pooled

\`==\` asks "same object?"; \`equals\` asks "same characters?". That \`a == b\` happens to be true is
the **string pool** at work, and relying on it is a bug waiting for run-time input. Always use
\`equals\` (or \`equalsIgnoreCase\`), and put the literal first to be null-safe:
\`"yes".equals(answer)\`.

## The methods you will use daily

    String t = "  Career Pilot  ";
    t.trim()                   // "Career Pilot"   (strip() also handles Unicode spaces)
    String u = "CareerPilot";
    u.length()                 // 11
    u.charAt(0)                // 'C'
    u.indexOf("Pilot")         // 6
    u.indexOf('z')             // -1  (not found)
    u.substring(6)             // "Pilot"
    u.substring(0, 6)          // "Career" — end index is exclusive
    u.contains("eer")          // true
    u.startsWith("Car")        // true
    u.replace('e', '3')        // "Car33rPilot"
    u.toLowerCase()            // "careerpilot"
    "a,b,,c".split(",")        // ["a", "b", "", "c"]  (length 4)
    String.join("-", "x", "y") // "x-y"
    "b".compareTo("a")         // 1  (positive: "b" sorts after "a")
    "".isEmpty()               // true;  "  ".isBlank() is true (Java 11)

\`substring(begin, end)\` takes characters from \`begin\` up to but not including \`end\`, so
its length is \`end - begin\`.

## Building strings in a loop: StringBuilder

    String out = "";
    for (int i = 0; i < 5; i++) out += i;    // creates a new String every pass

    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < 5; i++) sb.append(i).append(',');
    sb.setLength(sb.length() - 1);           // drop the last comma
    System.out.println(sb);                  // 0,1,2,3,4
    System.out.println(new StringBuilder("level").reverse());  // level

\`+=\` in a loop copies the whole string each time — O(n²) for n pieces. \`StringBuilder\` is
mutable and appends in place. \`StringBuffer\` is the same but synchronized (thread-safe and
slower); in single-threaded code use \`StringBuilder\`.

Note: \`StringBuilder\` does **not** override \`equals\`; compare with
\`sb1.toString().equals(sb2.toString())\`.

## char and String

    String w = "hello";
    int vowels = 0;
    for (char ch : w.toCharArray()) {
        if ("aeiou".indexOf(ch) >= 0) vowels++;
    }
    // 2
    char d = '7';
    int digit = d - '0';                     // 7
    System.out.println(Character.isDigit(d)); // true

## Interview traps

- \`"a" + 'b' + 1\` is \`"ab1"\`, but \`'a' + 'b' + "1"\` is \`"1951"\` (97 + 98 = 195 first).
- \`s.length\` (no parentheses) does not compile; arrays use \`.length\`, strings \`.length()\`.
- \`"abc".substring(3)\` is \`""\`, not an error; \`substring(4)\` throws.`,
    mcqs: [
      mcq('What does this print? String s = "Mumbai"; s.replace("M", "m"); System.out.println(s);',
        [['Mumbai', true], ['mumbai (replace changed s)', false], ['mumbai with every M changed', false], ['It does not compile', false]],
        'replace returns a new String and leaves s untouched; the result was never assigned, so s is still "Mumbai".'),
      mcq('What is "programming".substring(3, 7)?',
        [['"gram"', true], ['"gramm"', false], ['"ogra"', false], ['"ramm"', false]],
        'Characters at indexes 3, 4, 5 and 6 — g, r, a, m. The end index 7 is excluded, so the length is 7 - 3 = 4.'),
      mcq("What does System.out.println('a' + 'b' + \"c\"); print?",
        [['195c', true], ['abc', false], ['ab c', false], ['97 98 c', false]],
        "Left to right: 'a' + 'b' is char arithmetic, 97 + 98 = 195, and only then is \"c\" concatenated."),
    ],
    checkpoint: [
      ck('JAVA_BASICS', 'String input = sc.next(); /* user types admin */ if (input == "admin") ... — why does the check fail?',
        [['== compares references; input is a new object', true], ['next() keeps the newline at the end of input', false], ['String literals are always stored in uppercase', false], ['== on Strings compares only their lengths', false]],
        'A String read at run time is a new object, not the pooled literal, so == is false even with identical characters. Use "admin".equals(input).'),
      ck('JAVA_BASICS', 'Why prefer StringBuilder over += when joining 10,000 pieces in a loop?',
        [['+= copies the whole String each pass; append does not', true], ['+= only works on Strings below 1,000 characters', false], ['StringBuilder is thread-safe, while String is not', false], ['+= does not compile inside a for loop body', false]],
        'Strings are immutable, so each += builds a brand-new String containing all previous text — quadratic work. StringBuilder grows one buffer in place. (StringBuffer is the thread-safe one.)'),
      ck('JAVA_BASICS', 'What is "a:b::c".split(":").length?',
        [['4', true], ['3', false], ['5', false], ['2', false]],
        'The empty text between the two adjacent colons is kept as an empty String, giving "a", "b", "" and "c". Only trailing empty strings are dropped.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_BASICS_METHODS',
    notes: `A method is a named, reusable piece of code with inputs (parameters) and at most one output
(the return value).

## Defining and calling

    public class Main {
        static int square(int n) {
            return n * n;
        }
        static void greet(String name) {
            System.out.println("Hi " + name);
        }
        public static void main(String[] args) {
            int s = square(7);          // 49
            greet("Asha");              // Hi Asha
        }
    }

The signature is the **name plus the parameter types**. \`static\` lets \`main\` call it without an
object (calling a non-static method from \`main\` gives "non-static method cannot be referenced
from a static context"). A non-void method must return on every path:

    static String grade(int m) {
        if (m >= 40) return "Pass";
    }   // compile error: missing return statement

## Java is always pass-by-value

The method receives a **copy** of each argument.

    static void addBonus(int salary) { salary += 1000; }
    int pay = 5000;
    addBonus(pay);
    System.out.println(pay);        // 5000

For objects, the value copied is the **reference**. The method can change the object it points
to, but cannot make the caller's variable point somewhere else:

    static void fill(int[] arr) { arr[0] = 42; }
    static void replace(int[] arr) { arr = new int[]{7, 7}; }

    int[] data = {1, 2};
    fill(data);       // data is {42, 2} — same array, modified
    replace(data);    // data is still {42, 2} — only the copy was redirected

    static void swap(int a, int b) { int t = a; a = b; b = t; }   // swaps nothing for the caller

"Java passes objects by reference" is the wrong answer in an interview: it passes references
by value.

## Overloading

Several methods may share a name if their **parameter lists** differ:

    static int add(int a, int b)            { return a + b; }
    static double add(double a, double b)   { return a + b; }
    static int add(int a, int b, int c)     { return a + b + c; }

    add(2, 3)        // 5    → int version
    add(2.0, 3)      // 5.0  → 3 is widened to double
    add(1, 2, 3)     // 6

The return type alone cannot distinguish overloads — \`int f()\` and \`long f()\` together do not
compile. When choosing, the compiler prefers an exact match, then **widening**, then **boxing**,
then **varargs**:

    static void show(long x)    { System.out.println("long"); }
    static void show(Integer x) { System.out.println("Integer"); }
    show(5);   // long — widening beats boxing

## Varargs

    static int sum(int... nums) {       // nums is an int[]
        int t = 0;
        for (int n : nums) t += n;
        return t;
    }
    sum();          // 0
    sum(4, 5, 6);   // 15

Only one varargs parameter, and it must be last.

## Recursion, briefly

    static int fact(int n) { return n <= 1 ? 1 : n * fact(n - 1); }   // fact(5) = 120

Without a base case it recurses until \`StackOverflowError\`.

## Good methods

One job, a verb name (\`calculateTax\`, \`isValidEmail\`), few parameters, and return values rather
than printing from deep inside — a method that returns can be tested and reused.`,
    mcqs: [
      mcq('What does this print? static void inc(int v) { v++; } ... int n = 9; inc(n); inc(n); System.out.println(n);',
        [['9', true], ['11', false], ['10', false], ['It does not compile', false]],
        'Each call gets its own copy of n. Incrementing the copy has no effect on the caller, so n stays 9.'),
      mcq('Which pair of methods can NOT both be declared in one class?',
        [['int calc(int a) and long calc(int a)', true], ['int calc(int a) and int calc(long a)', false], ['int calc(int a) and int calc(int a, int b)', false], ['int calc(int a) and int calc(int... a)', false]],
        'Overloads must differ in their parameter lists. Two methods with the same name and the same parameters but a different return type clash, and the class fails to compile.'),
      mcq('Given show(double d) and show(Integer i), which runs for show(4)?',
        [['show(double)', true], ['show(Integer)', false], ['It is ambiguous and fails', false], ['Neither — no int version', false]],
        'Overload resolution tries widening before boxing. int widens to double in the first phase, so show(double) is chosen and boxing to Integer is never considered.'),
    ],
    checkpoint: [
      ck('JAVA_METHODS', 'static void reset(int[] a) { a = new int[3]; } — after reset(arr) where arr is {5, 6, 7}, what is arr?',
        [['Still {5, 6, 7}', true], ['{0, 0, 0}', false], ['null', false], ['{5, 6, 7, 0, 0, 0}', false]],
        'The parameter a is a copy of the reference. Reassigning it points only the copy at a new array; the caller\'s arr is unchanged.'),
      ck('JAVA_METHODS', 'static String level(int x) { if (x > 0) return "pos"; else if (x < 0) return "neg"; } — what happens?',
        [['Compile error: missing return statement', true], ['It returns null when x is zero', false], ['It returns an empty String for zero', false], ['It throws an exception for zero only', false]],
        'The compiler checks that every path returns. When x is 0 neither branch returns, so the method is rejected; add a final return or an else.'),
      ck('JAVA_METHODS', 'main calls an instance method greet() directly and fails to compile. Why?',
        [['main is static, so it has no object to call greet on', true], ['greet must be declared before main in the file', false], ['Instance methods may not print to System.out', false], ['greet needs to be marked public to be called', false]],
        'A static method has no this. Either make greet static or create an object and call it on that.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_BASICS_DEBUGGING',
    notes: `These are the bugs every Java fundamentals reviewer sees weekly. Each compiles (except the
first), which is what makes them dangerous.

## 1. A compiler error you should be able to read

    double average = total / count;
    int rounded = average;
    // error: incompatible types: possible lossy conversion from double to int

The compiler refuses to drop the decimals silently. Decide what you want: \`(int) average\`
truncates, \`(int) Math.round(average)\` rounds.

## 2. Integer division

    int total = 245, count = 3;
    double average = total / count;
    System.out.println(average);    // 81.0, expected 81.666...

\`total / count\` runs as int division before the result is widened. Fix:
\`(double) total / count\`. Note \`(double) (total / count)\` is still wrong — the cast comes too
late.

## 3. Comparing Strings with ==

    String role = sc.nextLine();    // admin
    if (role == "admin") {
        System.out.println("Welcome");
    }
    // prints nothing

The read String is a different object from the literal. \`"admin".equals(role)\` fixes it.
Diagnosis tip: print \`role.equals("admin")\` and \`role == "admin"\` side by side.

## 4. Off-by-one

    int[] scores = {80, 92, 75};
    for (int i = 1; i <= scores.length; i++) {
        System.out.println(scores[i]);
    }
    // 92, 75, then ArrayIndexOutOfBoundsException: Index 3 out of bounds for length 3

Two bugs: starting at 1 skips the first element; \`<=\` runs past the end. The exception message
gives the bad index and the length — compare them.

## 5. NullPointerException

    String[] names = new String[3];
    names[0] = "Asha";
    for (String n : names) {
        System.out.println(n.toUpperCase());
    }
    // ASHA, then NullPointerException

Since Java 15 (on by default) the message says exactly what was null:
\`Cannot invoke "String.toUpperCase()" because "n" is null\`. An array of objects starts full of
nulls; only index 0 was filled.

## 6. Missing break

    switch (plan) {
        case "BASIC": price = 999;
        case "PRO":   price = 1999;
        default:      price = 0;
    }
    // price is 0 for every plan

Each case falls into the next, and the last assignment wins. Add \`break\`, or use the arrow form
\`case "BASIC" -> price = 999;\`, which cannot fall through.

## 7. The nextInt / nextLine trap

    int n = sc.nextInt();
    for (int i = 0; i < n; i++) {
        String line = sc.nextLine();
        System.out.println("[" + line + "]");
    }
    // input 2 / red / blue  prints [] and [red]

The first nextLine reads the empty rest of the line holding 2. Add \`sc.nextLine();\` after
\`nextInt\`.

## How to find these

Read the exception type and line, then print (or watch in the debugger) the values going into
that line. Integer division, a null element and an off-by-one index are all visible the moment
you look at the actual values rather than the ones you expected.`,
    mcqs: [
      mcq('int sum = 7, n = 2; double avg = (double) (sum / n); — what is avg, and why?',
        [['3.0 — the int division happens before the cast', true], ['3.5 — the cast makes the division a double one', false], ['4.0 — casting to double rounds the result up', false], ['It fails to compile: you cannot cast that', false]],
        'The parentheses make sum / n run first, as ints, giving 3; casting 3 afterwards gives 3.0. Cast an operand instead: (double) sum / n.'),
      mcq('An exception reads "Index 5 out of bounds for length 5". What is the usual cause?',
        [['A loop condition of i <= arr.length', true], ['The array was declared without a size', false], ['The array contains null elements', false], ['The array was sorted before the loop', false]],
        'Valid indexes stop at length - 1. Reaching index == length almost always means the loop used <= where it needed <.'),
      mcq('Every plan prices at 0 in a switch with three case labels and default but no break statements. Why?',
        [['Each case falls through to default, which sets 0', true], ['String switches always choose the default case', false], ['A switch on a String compares with ==, not equals', false], ['default runs first, before any case is checked', false]],
        'Without break, execution continues from the matched case through every later one, and the last assignment — in default — overwrites the earlier ones.'),
      mcq('Java 17 reports: Cannot invoke "String.length()" because "parts[2]" is null. Where do you look?',
        [['At where parts[2] should have been assigned', true], ['At the String class, for a bug in length()', false], ['At the JVM settings, for too little memory', false], ['At the import list, for a missing package', false]],
        'Helpful NullPointerException messages name the null expression. The fix is upstream, wherever parts[2] was expected to be filled and was not.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_BASICS_PRACTICE',
    notes: `Write each of these from a blank \`Main\`, reading from standard input, before looking
anything up.

## Exercise 1 — Number facts

Read an integer and print whether it is positive, negative or zero, even or odd, and how many
digits it has (\`-305\` has 3). Test with 0 and a negative odd number — \`n % 2 == 1\` gets that
one wrong.

## Exercise 2 — FizzBuzz with a switch expression

For 1 to n print \`Fizz\`, \`Buzz\`, \`FizzBuzz\` or the number, choosing with
\`switch ((i % 3 == 0 ? 1 : 0) + (i % 5 == 0 ? 2 : 0))\`.

## Exercise 3 — Second largest

Read n numbers into an array and print the second-largest distinct value, or \`NONE\`. Do it in
one pass with two variables, without sorting.

## Exercise 4 — Palindrome and vowels

Read a line, and print whether it is a palindrome ignoring case and spaces, and how many vowels
it has. Do it once with \`StringBuilder.reverse\` and once with two indexes moving inward.

## Exercise 5 — Matrix transpose

Read r, c and an r × c grid, and print its transpose. Then print the sum of each row and each
column.

## Exercise 6 — Methods

Rewrite Exercise 3 so that \`main\` only reads input and prints, and a method
\`static int secondLargest(int[] a)\` does the work. Write \`static boolean isPrime(int n)\` and
print the primes in the array.

The graded exercise below combines arrays, a loop that tracks several values, a method, and
building output with StringBuilder.`,
    mcqs: [
      mcq('To find the largest value in an int array that may be all negative, what should max start as?',
        [['The first element of the array', true], ['0', false], ['-1', false], ['Integer.MAX_VALUE', false]],
        'Starting at 0 or -1 is wrong when every element is smaller; MAX_VALUE is never beaten. The first element (or Integer.MIN_VALUE) is always safe.'),
      mcq('Which test is true for every odd int, including negative ones?',
        [['n % 2 != 0', true], ['n % 2 == 1', false], ['n / 2 == 1', false], ['n % 2 > 0', false]],
        'For a negative odd n, n % 2 is -1, so tests for == 1 or > 0 fail. Checking != 0 covers both signs.'),
      mcq('What does new StringBuilder("ab").append(1).append(2).reverse() produce?',
        [['21ba', true], ['ba21', false], ['ab12', false], ['ab3', false]],
        'append adds text, not sums: "ab12". reverse then reverses the whole buffer to "21ba".'),
      mcq('Summing 100,000 numbers of up to a billion each, what type should the total be?',
        [['long', true], ['int', false], ['short', false], ['float', false]],
        'The sum can reach 10^14, far past int\'s 2.1 billion. long holds it exactly; float would lose precision.'),
      mcq('Transposing a 2 × 3 matrix, what are the dimensions of the result array?',
        [['new int[3][2]', true], ['new int[2][3]', false], ['new int[3][3]', false], ['new int[6][1]', false]],
        'The transpose swaps rows and columns: element [i][j] moves to [j][i], so 2 rows of 3 become 3 rows of 2.'),
    ],
    assignment: {
      title: 'Array Report',
      description: 'Read n integers into an array and print their sum, maximum, minimum, how many are even, and the numbers in reverse order.',
      instructions: `Write a program that reads:

- Line 1: an integer n (1 ≤ n ≤ 1000).
- Line 2: n integers separated by spaces. Each is between -2,000,000,000 and 2,000,000,000.

It prints exactly five lines:

    Sum: <sum of all numbers>
    Max: <largest>
    Min: <smallest>
    Evens: <how many numbers are even>
    Reversed: <the numbers in reverse order, separated by single spaces>

**Example.** For the input

    5
    4 9 2 7 5

the output is

    Sum: 27
    Max: 9
    Min: 2
    Evens: 2
    Reversed: 5 7 2 9 4

For \`4\` and \`-3 -8 -1 -6\` the output is \`Sum: -18\`, \`Max: -1\`, \`Min: -8\`, \`Evens: 2\`,
\`Reversed: -6 -1 -8 -3\`.

**Rules**

- Store the numbers in an \`int[]\`, then work on the array.
- Do not use \`Arrays.sort\` or streams; walk the array with loops.
- Write a method \`static boolean isEven(int x)\` and use it. Remember that negative even numbers
  are even, and 0 is even.
- Think about where max and min start — the second example is all negative.
- Three numbers near two billion add up to more than an \`int\` can hold.
- No trailing space after the last reversed number.

**How it is graded**

Your program is run against the examples and several hidden cases (a single number, zeros and
negatives, very large values). Output is compared line by line.`,
      rubric: [
        { criterion: 'Correct output', description: 'All five lines are right for every test case, including one element, all-negative values and sums beyond the int range.', maxPoints: 60 },
        { criterion: 'Arrays and loops', description: 'The numbers are stored in an int array and walked with loops; max and min start from a real element, and no sorting is used.', maxPoints: 25 },
        { criterion: 'Method and readability', description: 'An isEven method is written and used, variables are well named, and the reversed line is built without a trailing space.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'java',
        starter: `import java.util.Scanner;

public class Main {
    // TODO: write static boolean isEven(int x)

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] numbers = new int[n];
        // TODO: read the n numbers into the array
        // TODO: compute and print Sum, Max, Min, Evens and Reversed
    }
}
`,
        tests: [
          { input: '5\n4 9 2 7 5\n', expectedOutput: 'Sum: 27\nMax: 9\nMin: 2\nEvens: 2\nReversed: 5 7 2 9 4' },
          { input: '4\n-3 -8 -1 -6\n', expectedOutput: 'Sum: -18\nMax: -1\nMin: -8\nEvens: 2\nReversed: -6 -1 -8 -3' },
          { input: '1\n42\n', expectedOutput: 'Sum: 42\nMax: 42\nMin: 42\nEvens: 1\nReversed: 42', isHidden: true },
          { input: '6\n10 0 -10 20 -20 3\n', expectedOutput: 'Sum: 3\nMax: 20\nMin: -20\nEvens: 5\nReversed: 3 -20 20 -10 0 10', isHidden: true },
          { input: '3\n2000000000 2000000000 2000000000\n', expectedOutput: 'Sum: 6000000000\nMax: 2000000000\nMin: 2000000000\nEvens: 3\nReversed: 2000000000 2000000000 2000000000', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },
  {
    unitCode: 'JT_JAVA_BASICS_INTERVIEW_QUESTION',
    notes: `Three fundamentals questions that appear in nearly every Java screening, with model answers
and the follow-up a good answer earns.

## Q1. "What is the difference between == and equals()?"

**Model answer.** "\`==\` compares the values of the two operands. For primitives that is the
numeric value; for objects the value is a reference, so \`==\` asks whether both sides are the
*same object*. \`equals\` is a method that a class overrides to define *logical* equality —
\`String\` compares characters, \`Integer\` compares the number. So two Strings read from input
with the same text are \`equals\` but not \`==\`. The default \`equals\` in \`Object\` is just \`==\`,
which is why a class you write needs to override it."

    String a = "pilot", b = new String("pilot");
    System.out.println(a == b);       // false
    System.out.println(a.equals(b));  // true

**Follow-up:** "Then why does \`Integer x = 100, y = 100; x == y\` print true?" — "Autoboxing uses
\`Integer.valueOf\`, which caches -128 to 127, so both refer to one cached object. At 1000 it
prints false. It's the same reference comparison; the cache just hides it for small numbers."

## Q2. "Why is String immutable in Java?"

**Model answer.** "Four reasons. The **string pool**: literals are shared between all code, which
is only safe if nobody can change them. **Security**: file paths, class names and URLs are
Strings, and a value checked for permission must not change afterwards. **Hashing**: a String
caches its hashCode, so it is a fast, reliable HashMap key — a mutable key could change and get
lost in the map. **Thread safety**: an immutable object can be shared between threads without
locking."

**Follow-up:** "What do you use when you need to build a string?" — "\`StringBuilder\`, which is
mutable, so appending in a loop is linear rather than quadratic. \`StringBuffer\` is the same
API with synchronized methods; I'd only use it if one builder were really shared between
threads, which is rare."

## Q3. "Is Java pass-by-value or pass-by-reference?"

**Model answer.** "Always pass-by-value. For a primitive, the method gets a copy of the number.
For an object, the method gets a copy of the *reference* — so it can mutate the object the
reference points to, and the caller will see that, but reassigning the parameter only redirects
the copy."

    static void rename(StringBuilder sb) { sb.append("!"); sb = new StringBuilder("new"); }
    StringBuilder s = new StringBuilder("hi");
    rename(s);
    System.out.println(s);   // hi!

**Follow-up:** "So how would you write a swap of two ints?" — "You can't through parameters.
Return the result, or swap two elements inside an array you pass in, because the array object is
shared."

## Delivering it

State the distinction in one sentence, show a three-line example, and name the trap. The
follow-up is where the interviewer separates memorised answers from understanding — have the
Integer cache, StringBuilder and the swap answers ready.`,
    mcqs: [
      mcq('Which is NOT a reason given for String being immutable?',
        [['It lets the JVM skip garbage-collecting Strings', true], ['Pooled literals can be shared safely', false], ['Its hashCode can be cached for map keys', false], ['It can be shared across threads safely', false]],
        'Strings are garbage-collected like any other object. Pool sharing, a cacheable hash and thread safety are the real benefits of immutability.'),
      mcq('static void m(StringBuilder b) { b = new StringBuilder("x"); b.append("y"); } — after m(sb) where sb holds "a", what is sb?',
        [['"a"', true], ['"xy"', false], ['"ay"', false], ['"axy"', false]],
        'b is reassigned before append, so append works on the new builder. The caller\'s reference still points to the original "a".'),
      mcq('What is the default behaviour of equals() for a class that does not override it?',
        [['It compares references, exactly like ==', true], ['It compares every field value one by one', false], ['It compares the results of toString()', false], ['It always returns false for two objects', false]],
        'Object.equals returns this == obj. Logical equality exists only when a class overrides equals (and then hashCode too).'),
    ],
  },
  {
    unitCode: 'JT_JAVA_BASICS_CHECKPOINT',
    notes: `Ten questions across Java fundamentals: types and casting, operators, conditions and switch,
loops, arrays, strings and methods. Each one is a snippet to trace by hand — write down the value
of each variable after each line rather than guessing from the shape of the code.`,
    checkpoint: [
      ck('JAVA_BASICS', 'What does System.out.println(5 / 2 + 5 / 2.0); print?',
        [['4.5', true], ['5.0', false], ['4.0', false], ['5', false]],
        '5 / 2 is int division giving 2; 5 / 2.0 is 2.5. Adding int 2 to double 2.5 gives the double 4.5.'),
      ck('JAVA_BASICS', 'Integer a = 50, b = 50; Integer c = 500, d = 500; what are a == b and c == d?',
        [['true and false', true], ['true and true', false], ['false and false', false], ['false and true', false]],
        'Autoboxing reuses cached Integer objects for -128..127, so a and b are one object. 500 is outside the cache, so c and d are two objects.'),
      ck('JAVA_BASICS', 'String s = "data"; s.concat("base"); s = s + "!"; — what is s now?',
        [['"data!"', true], ['"database!"', false], ['"database"', false], ['"data"', false]],
        'concat returns a new String that is thrown away. Only the reassignment s = s + "!" changes what s refers to.'),
      ck('JAVA_CONTROL_FLOW', 'char g = \'B\'; switch (g) { case \'A\': x = 1; case \'B\': x = 2; case \'C\': x = 3; break; default: x = 0; } — what is x?',
        [['3', true], ['2', false], ['0', false], ['1', false]],
        "Execution enters at case 'B', sets 2, falls through to case 'C' which sets 3, and then break stops it before default."),
      ck('JAVA_CONTROL_FLOW', 'How many lines does this print? for (int i = 10; i > 0; i -= 3) System.out.println(i);',
        [['4', true], ['3', false], ['5', false], ['10', false]],
        'i takes the values 10, 7, 4 and 1, all greater than 0. The next value, -2, fails the test, so four lines are printed.'),
      ck('JAVA_CONTROL_FLOW', 'int n = 0; while (n < 5) { n++; if (n == 3) break; } System.out.println(n); — what prints?',
        [['3', true], ['5', false], ['2', false], ['4', false]],
        'n is incremented before the check, so on the third pass n becomes 3, break ends the loop, and 3 is printed.'),
      ck('JAVA_ARRAYS', 'int[][] t = {{1}, {2, 3}, {4, 5, 6}}; what is t[2].length + t.length?',
        [['6', true], ['5', false], ['9', false], ['4', false]],
        't has 3 rows, so t.length is 3; row t[2] is {4, 5, 6} with length 3. 3 + 3 = 6. Rows of a jagged array have their own lengths.'),
      ck('JAVA_ARRAYS', 'int[] a = {3, 1, 2}; int[] b = a; Arrays.sort(b); — what is a[0]?',
        [['1', true], ['3', false], ['2', false], ['0', false]],
        'b refers to the same array as a, and Arrays.sort sorts in place, so a is now {1, 2, 3}.'),
      ck('JAVA_METHODS', 'static int twice(int x) { x = x * 2; return x; } — after int v = 4; int w = twice(v);, what are v and w?',
        [['4 and 8', true], ['8 and 8', false], ['4 and 4', false], ['8 and 4', false]],
        'The method doubles its own copy and returns it. v is untouched (4), and w receives the returned 8.'),
      ck('JAVA_METHODS', 'Overloads print(int... v) and print(int a, int b) exist. Which runs for print(1, 2)?',
        [['print(int a, int b)', true], ['print(int... v)', false], ['Neither; the call is ambiguous', false], ['Both, in declaration order', false]],
        'The compiler considers varargs only after exact, widening and boxing matches fail. The fixed two-parameter version matches exactly, so it wins.'),
    ],
  },
];
