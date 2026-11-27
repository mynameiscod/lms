/**
 * Career-track content (.NET Full Stack + AI, batch N1): getting started with C# and .NET
 * (JT_CS_START) and C# fundamentals (JT_CS_BASICS).
 *
 * A student on this track can program — the years taught them Python — but has probably never
 * written C#. So C# is taught from the first program, and nearly every question is about one
 * specific snippet: "does this compile, and what does it print?". The notes teach modern C#
 * (.NET 8, C# 12) and say when a feature needs C# 9, 10, 11 or 12. The graded exercises are
 * classic C# (a `class Program` with `static void Main`), because the runner is Mono 6.12 (≈ C# 7).
 *
 * Attribution: JT_CS_START is multi-skill (CSHARP_BASICS, IDE_PROFICIENCY), so every checkpoint
 * question names the skill it measures, from its own unit's skillKeys or, for the topic checkpoint,
 * from the topic's list. JT_CS_BASICS is single-skill, so its questions name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_CS_CORE_BUNDLES: PilotBundle[] = [
  /* ══ JT_CS_START — Getting Started with C# and .NET ═════════════════════════════════════ */
  {
    unitCode: 'JT_CS_START_DOTNET_CLR',
    notes: `C# is a language; .NET is the platform that builds and runs it. Most confusion in the first
week comes from mixing up the pieces, so name them first.

## The pipeline

    Program.cs  --C# compiler (Roslyn)-->  Hello.dll (IL + metadata)  --CLR + JIT-->  machine code

- **The C# compiler** (called Roslyn) reads \`.cs\` files and writes an **assembly** — a \`.dll\`
  (or \`.exe\`) containing **IL** (Intermediate Language, also called CIL or MSIL) plus metadata
  describing every type and method. IL is not machine code for your CPU.
- **The CLR** (Common Language Runtime) loads the assembly, checks it, manages memory with the
  **garbage collector**, handles exceptions and threads, and runs the code.
- **The JIT** (just-in-time compiler) lives inside the CLR. The first time a method is called it
  compiles that method's IL to native code for the machine it is running on; later calls reuse it.
- **The base class library (BCL)** — \`System\`, \`System.Collections.Generic\`, \`System.IO\` … —
  ships with the runtime.

Because every .NET language (C#, F#, VB.NET) compiles to the same IL, a C# project can use a
library written in F#. That is what "Common Language" means.

## SDK versus runtime

- The **.NET runtime** is what a machine needs to *run* a .NET app: the CLR plus the BCL. There is
  also the **ASP.NET Core runtime** for web apps.
- The **.NET SDK** is what a developer installs to *build* one: the compiler, the \`dotnet\` CLI,
  templates, MSBuild and NuGet — plus a runtime.

    > dotnet --version          (the SDK that this folder will use)
    8.0.403
    > dotnet --list-sdks
    8.0.403 [C:\\Program Files\\dotnet\\sdk]
    > dotnet --list-runtimes
    Microsoft.NETCore.App 8.0.10 [...]
    Microsoft.AspNetCore.App 8.0.10 [...]

If \`dotnet\` is "not recognized", the SDK is not installed or \`C:\\Program Files\\dotnet\` is not on
PATH. If \`dotnet --list-runtimes\` works but \`dotnet build\` says "No .NET SDKs were found", the
machine has only a runtime.

## Names that confuse everybody

- **.NET Framework** (1.0–4.8) is the old, Windows-only platform. It is still maintained but gets
  no new features.
- **.NET Core** (1.0–3.1) was the cross-platform rewrite. From version 5 it dropped "Core" and is
  just **.NET** — .NET 5, 6, 7, 8, 9. When a job post says ".NET", it means this line.
- **LTS** releases (.NET 6, 8, 10) get three years of support; the odd ones get eighteen months.
  Most companies run .NET 8.
- C# has its own version numbers: .NET 8 ships C# 12. The language version follows the target
  framework unless you change it.

## Cross-platform

The same \`Hello.dll\` runs on Windows, Linux and macOS, because each platform has its own CLR
that JIT-compiles the same IL. The IL is portable; the runtime is built per platform — exactly the
JVM's arrangement in Java.

## Interview traps

- "Is C# compiled or interpreted?" — compiled twice: to IL by the C# compiler, then to native code
  by the JIT at run time. It is never interpreted line by line.
- Managed code is code run by the CLR (garbage-collected, type-checked); unmanaged code — a C++
  DLL, say — runs outside it.
- AOT: .NET 8 can also publish **Native AOT**, compiling everything to native code ahead of time
  for fast start-up, at the cost of some reflection features.`,
    workedExample: `**Problem.** A classmate says: "I installed .NET from a link in a tutorial. \`dotnet run\`
says *No .NET SDKs were found*." Diagnose it.

1. Run \`dotnet --list-runtimes\`. It prints \`Microsoft.NETCore.App 8.0.10\` — so a **runtime** is
   installed and the \`dotnet\` host works.
2. Run \`dotnet --list-sdks\`. It prints nothing. There is no SDK, so there is no compiler and no
   \`build\`/\`run\` commands — the tutorial link was the "Run apps" download.
3. Install the **.NET 8 SDK** (not the runtime) and open a new terminal.
4. \`dotnet --list-sdks\` now shows \`8.0.403\`, and \`dotnet run\` builds and runs.

The reasoning: running a finished .dll needs only the CLR and the class library; building one
needs the compiler, which only the SDK contains.`,
    mcqs: [
      mcq('dotnet build succeeds for a console project named Hello. What does bin/Debug/net8.0/Hello.dll contain?',
        [['IL code plus metadata, which the CLR JIT-compiles at run time', true], ['Native x64 machine code that runs without any .NET runtime', false], ['The original C# source, compressed to save space on disk', false], ['A Python-style bytecode cache, rebuilt on every launch', false]],
        'The C# compiler emits Intermediate Language and metadata into the assembly. The CLR loads it and the JIT turns each method into native code the first time it runs.'),
      mcq('A library written in F# is referenced from your C# project and just works. What makes that possible?',
        [['Both languages compile to the same IL that the CLR runs', true], ['The C# compiler translates F# source code into C# first', false], ['Visual Studio converts the library when you add it', false], ['F# and C# are the same language with different file names', false]],
        'The "common" in Common Language Runtime: every .NET language produces IL and metadata, so their assemblies can call each other freely.'),
      mcq('When does the JIT compiler turn a method into native code?',
        [['The first time that method is called while the app runs', true], ['When dotnet build writes the dll into the bin folder', false], ['When the .csproj file is restored by NuGet', false], ['Once at install time, compiling every method in the assembly', false]],
        'JIT means just in time: methods are compiled on first call, then the native code is reused. Ahead-of-time compilation (Native AOT) is a separate publish option.'),
    ],
    checkpoint: [
      ck('CSHARP_BASICS', 'A build server has the .NET 8 runtime but no SDK. Which command fails there?',
        [['dotnet build, because there is no compiler', true], ['dotnet App.dll, running an already-built app', false], ['dotnet --list-runtimes, listing what is installed', false], ['dotnet --info, printing the host details', false]],
        'The runtime-only install has the dotnet host and the CLR, so listing runtimes and running a built dll work. Building needs the compiler and MSBuild, which only the SDK ships.'),
      ck('CSHARP_BASICS', 'A job post asks for ".NET 8". Which platform is that?',
        [['The cross-platform line that continued from .NET Core 3.1', true], ['.NET Framework 4.8, the Windows-only line, renamed in 2023', false], ['A Windows-only update to the .NET Framework line', false], ['Mono, the runtime that Unity games are built on', false]],
        '.NET Core dropped "Core" at version 5. .NET 5, 6, 7 and 8 are the cross-platform continuation; .NET Framework stopped at 4.8 and gets fixes only.'),
      ck('CSHARP_BASICS', 'An interviewer asks: "Is C# an interpreted language?" Which answer is accurate?',
        [['No — it compiles to IL, and the JIT compiles IL to native code', true], ['Yes — the CLR reads the .cs files line by line at run time', false], ['Yes — IL is interpreted, so the code never becomes native', false], ['No — the compiler emits native code for each OS directly', false]],
        'C# goes through two compilers: Roslyn to IL at build time, and the JIT to machine code at run time. Native AOT is an opt-in that does both ahead of time.'),
    ],
  },
  {
    unitCode: 'JT_CS_START_FIRST_PROGRAM',
    notes: `## Creating and running a console app

    > dotnet new console -n Hello
    > cd Hello
    > dotnet run
    Hello, World!

\`dotnet new console\` creates two files that matter: \`Hello.csproj\` (the project) and
\`Program.cs\`. \`dotnet run\` restores packages, builds, and runs in one step.

## Top-level statements (C# 9+)

Open \`Program.cs\` from the .NET 6+ template and it is one line:

    Console.WriteLine("Hello, World!");

There is no class and no \`Main\`. Since **C# 9**, a project may have *one* file of
**top-level statements**; the compiler wraps them in a generated \`Program\` class and \`Main\`
method for you. **Implicit usings** (C# 10 / .NET 6+, switched on in the .csproj) add
\`using System;\` and a few others to every file, which is why \`Console\` needs no \`using\`.

## The classic form — learn this one too

    using System;

    namespace Hello
    {
        class Program
        {
            static void Main(string[] args)
            {
                Console.WriteLine("Hello, " + (args.Length > 0 ? args[0] : "stranger"));
            }
        }
    }

Many company codebases, every tutorial before 2021, and most online judges (including this
course's grader) use it. Read it as:

- \`using System;\` — lets you write \`Console\` instead of \`System.Console\`.
- \`namespace Hello\` — groups types; C# 10 also allows a file-scoped \`namespace Hello;\`.
- \`static void Main(string[] args)\` — the entry point. Capital **M**. It must be \`static\`.
  It may return \`void\` or \`int\` (the exit code), may omit \`args\`, and since C# 7.1 may be
  \`static async Task Main\`. It does not have to be \`public\`.
- \`args\` holds only the arguments: \`dotnet run -- Priya\` gives \`args[0] == "Priya"\`. Unlike C,
  the program name is not \`args[0]\`.

C# is case-sensitive: \`console.writeline\` does not compile. Statements end with \`;\` and blocks
use braces — indentation means nothing to the compiler.

## Running without dotnet run

    > dotnet build
    > dotnet bin/Debug/net8.0/Hello.dll
    > bin\\Debug\\net8.0\\Hello.exe          (Windows also gets a small launcher exe)

## The errors everyone meets first

    Program.cs(5,40): error CS1002: ; expected
    Program.cs(6,13): error CS0103: The name 'Consle' does not exist in the current context
    Program.cs(7,22): error CS0029: Cannot implicitly convert type 'string' to 'int'
    error CS5001: Program does not contain a static 'Main' method suitable for an entry point
    error CS8804: Only one compilation unit can have top-level statements.

Read the **file(line,column)**, the **code** (CS1002…) and the message. CS5001 usually means
\`main\` in lower case or a missing \`static\`. CS8804 appears when you add a second file with
top-level statements — move that code into a method or a class.

## Comments

    // to the end of the line
    /* a block */
    /// <summary>XML doc comment, shown by IntelliSense</summary>`,
    mcqs: [
      mcq('A new .NET 8 console project\'s Program.cs is just Console.WriteLine("Hi");. Where is Main?',
        [['The compiler generates it around the top-level statements', true], ['It is hidden inside the .csproj file as an XML element', false], ['.NET 8 programs no longer have any entry point method', false], ['It is in a Program.Designer.cs file that the IDE hides from view', false]],
        'Since C# 9, top-level statements are wrapped by the compiler in a generated Program class with a Main method. The program still has an entry point; you just do not write it.'),
      mcq('You rename static void Main to static void main and build. What happens?',
        [['Build fails with CS5001: no suitable static Main entry point', true], ['It builds and runs normally, because C# ignores case', false], ['It builds, then throws a MissingMethodException when it is run', false], ['The compiler renames the method back to Main for you', false]],
        'C# is case-sensitive and the entry point must be named Main. With no Main and no top-level statements, the compiler reports CS5001.'),
      mcq('dotnet run -- Priya Rao is used to start a classic Main(string[] args). What is args.Length?',
        [['2', true], ['3, because the program name comes first', false], ['1, because the arguments are joined', false], ['0, because dotnet run swallows them', false]],
        'Everything after -- is passed to the program, split on spaces: "Priya" and "Rao". C# does not put the program name in args.'),
    ],
    checkpoint: [
      ck('CSHARP_BASICS', 'You add Helper.cs containing Console.WriteLine("help"); next to a top-level Program.cs. What does the build say?',
        [['CS8804 — only one file may have top-level statements', true], ['Nothing — both files run, Program.cs first and then Helper.cs', false], ['CS1002 — a semicolon is expected in Helper.cs', false], ['It builds, but Helper.cs is silently skipped', false]],
        'Top-level statements define the entry point, so a project may have them in one file only. Code in other files must live inside types and methods.'),
      ck('CSHARP_BASICS', 'Which of these is NOT a valid C# entry point?',
        [['public static string Main(string[] args)', true], ['static int Main(string[] args)', false], ['static void Main()', false], ['private static void Main(string[] a)', false]],
        'Main may return void, int, Task or Task<int>, may omit its parameter and may be private. A string return type is not allowed, so that program has no entry point.'),
      ck('CSHARP_BASICS', 'The build reports Program.cs(12,9): error CS0103: The name \'Consloe\' does not exist. What do the numbers mean?',
        [['Line 12, column 9 of Program.cs is where the error is', true], ['12 errors were found and 9 of them are warnings', false], ['Error number 12 out of 9 compiled files in all', false], ['The program reached line 12 when it crashed at run time', false]],
        'Compiler messages give the file, then (line,column), then the error code and text. CS0103 is a misspelt or undeclared name — here, Console.'),
    ],
  },
  {
    unitCode: 'JT_CS_START_IDE',
    notes: `Either IDE works for this track. Visual Studio (Windows) is what most .NET companies use;
VS Code with the **C# Dev Kit** extension runs everywhere. JetBrains Rider is the third common
choice. Learn one well — the debugger more than anything else.

## Visual Studio

- **Solution** (\`.sln\`): a container that opens several projects together. **Solution
  Explorer** shows it.
- File ▸ New ▸ Project ▸ *Console App*. Tick "Do not use top-level statements" if you want the
  classic \`Main\`.
- **F5** — build and run *with* the debugger. **Ctrl+F5** — run without it (the console window
  stays open).
- **Ctrl+Shift+B** — build only. Errors appear in the **Error List** with their CS codes;
  double-click one to jump to it.
- **Ctrl+.** — Quick Actions: add a missing \`using\`, generate a method, rename. (VS Code: the same
  light bulb, Ctrl+.)
- **F12** — go to definition; **Shift+F12** — find all references; **Ctrl+R, Ctrl+R** — rename
  everywhere.

## VS Code

Install the .NET SDK, then the **C# Dev Kit** extension. Open the folder that contains the
\`.csproj\` or \`.sln\`. Run with **F5** (it creates \`.vscode/launch.json\` the first time) or
from the terminal with \`dotnet run\`. A console app that reads input should run in the
integrated terminal — set \`"console": "integratedTerminal"\` in launch.json if Console.ReadLine
seems to hang.

## The debugger — the reason to use an IDE

    int total = 0;
    for (int i = 1; i <= 10; i++)
    {
        total += i;          // F9 here: a red dot appears
    }
    Console.WriteLine(total);

- **F9** toggles a breakpoint. **F5** runs to it.
- **F10** Step Over — run this line, stop at the next.
- **F11** Step Into — go inside the method this line calls.
- **Shift+F11** Step Out — finish this method, stop in the caller.
- **Locals / Autos** show the variables in scope; **Watch** shows expressions you add.
- **Immediate Window** (VS) / **Debug Console** (VS Code) evaluates any expression right now:
  type \`total * 2\` and press Enter.
- **Conditional breakpoint**: right-click the red dot ▸ Conditions ▸ \`i == 7\`. The loop now stops
  only once — essential when the bug appears on iteration 9,000.
- When an exception is thrown, the debugger stops on the throwing line and shows the exception
  with its message — read it before anything else.

## Habits that pay

- Build often; fix the first error first.
- Turn on "format on save" and let the IDE indent.
- Keep warnings visible. A warning like CS8602 ("dereference of a possibly null reference") is
  the compiler finding tomorrow's crash today.`,
    mcqs: [
      mcq('In Visual Studio, which key runs the program with the debugger attached?',
        [['F5', true], ['Ctrl+F5', false], ['F9', false], ['Ctrl+Shift+B', false]],
        'F5 starts debugging. Ctrl+F5 runs without the debugger, F9 toggles a breakpoint, and Ctrl+Shift+B only builds.'),
      mcq('Stopped on total = Calculate(price, qty);, you want to see what happens inside Calculate. Which key?',
        [['F11, Step Into', true], ['F10, Step Over the whole line', false], ['Shift+F11, Step Out of here', false], ['F9, toggle a breakpoint', false]],
        'Step Into enters the method called on the current line. Step Over would run Calculate completely and stop on the next line.'),
      mcq('A loop runs 10,000 times and the bug appears when id is 4521. What is the efficient way to stop there?',
        [['A conditional breakpoint with the condition id == 4521', true], ['Press F10 about 4,521 times, then watch the id', false], ['Add Console.WriteLine to print all 10,000 id values', false], ['Run the program in Release mode to make it stop earlier', false]],
        'A breakpoint condition is evaluated each pass and only breaks when it is true, so the debugger stops exactly on the failing iteration.'),
    ],
    checkpoint: [
      ck('IDE_PROFICIENCY', 'Paused at a breakpoint, you want the value of price * qty * 1.18m without changing code. Where do you type it?',
        [['The Immediate Window or Debug Console', true], ['The Error List, which shows all values', false], ['The .csproj file, in a new property', false], ['Solution Explorer, on the source file', false]],
        'The Immediate Window (Visual Studio) and the Debug Console (VS Code) evaluate any expression in the current stack frame using the live variable values.'),
      ck('IDE_PROFICIENCY', 'Console shows "The type or namespace name \'List<>\' could not be found". What does Ctrl+. offer first?',
        [['Add using System.Collections.Generic;', true], ['Install a NuGet package named List', false], ['Rename List<> to ArrayList everywhere', false], ['Delete the line that declares the List', false]],
        'Quick Actions suggest the missing using directive for a known type. List<T> is part of the base class library, so nothing needs installing.'),
      ck('IDE_PROFICIENCY', 'In VS Code, a console app started with F5 seems to hang at Console.ReadLine(). What is the usual fix?',
        [['Set "console": "integratedTerminal" in launch.json', true], ['Replace ReadLine with Console.Read for each character', false], ['Reinstall the .NET SDK and restart the editor', false], ['Run the program as an administrator', false]],
        'The default Debug Console cannot send keyboard input to the program. Running it in the integrated terminal gives ReadLine a real stdin to read from.'),
    ],
  },
  {
    unitCode: 'JT_CS_START_PROJECTS_NUGET',
    notes: `## The project file

A modern **SDK-style** \`.csproj\` is short:

    <Project Sdk="Microsoft.NET.Sdk">
      <PropertyGroup>
        <OutputType>Exe</OutputType>
        <TargetFramework>net8.0</TargetFramework>
        <ImplicitUsings>enable</ImplicitUsings>
        <Nullable>enable</Nullable>
      </PropertyGroup>
      <ItemGroup>
        <PackageReference Include="Newtonsoft.Json" Version="13.0.3" />
      </ItemGroup>
    </Project>

- Every \`.cs\` file under the project folder is compiled automatically — you never list them.
- \`OutputType\` \`Exe\` makes a runnable app; without it you get a class library (\`.dll\` only).
- \`TargetFramework\` picks the .NET version; \`net8.0\` means C# 12 by default.
- \`Nullable\` turns on nullable reference warnings; \`ImplicitUsings\` adds common usings.
- A web API uses \`Sdk="Microsoft.NET.Sdk.Web"\`.

## Solutions with several projects

Real apps split code: a web API, a class library of business logic, a test project.

    > dotnet new sln -n Shop
    > dotnet new classlib -n Shop.Core
    > dotnet new console -n Shop.App
    > dotnet new xunit -n Shop.Tests
    > dotnet sln add Shop.Core Shop.App Shop.Tests
    > dotnet add Shop.App reference Shop.Core
    > dotnet add Shop.Tests reference Shop.Core

A **project reference** lets Shop.App use the public types of Shop.Core. References go one way:
if Shop.Core also referenced Shop.App, the build fails with a circular dependency.

## NuGet

NuGet is .NET's package manager (like pip or Maven). Packages live on nuget.org.

    > dotnet add Shop.App package Newtonsoft.Json

adds the \`<PackageReference>\` line. On build, **restore** downloads the package into the global
cache (\`~/.nuget/packages\`) — not into your repo. That is why \`bin/\` and \`obj/\` go in
\`.gitignore\` and a fresh clone builds after \`dotnet restore\` (which \`build\` runs for you).
Packages a package needs come along automatically (**transitive** dependencies).

## The commands

    dotnet restore        download packages
    dotnet build          compile (Debug by default) into bin/Debug/net8.0/
    dotnet run            build + run the project in this folder
    dotnet test           build + run the test projects
    dotnet publish -c Release -o out     a folder ready to deploy
    dotnet clean          delete build outputs

**Debug vs Release**: Debug keeps code un-optimised for the debugger; Release is optimised and is
what you deploy.

**Publish options**: *framework-dependent* (the default — small, needs the .NET runtime on the
server) or *self-contained* (\`-r linux-x64 --self-contained\` — bundles the runtime, larger, runs
on a machine with no .NET installed).

## When a build fails after adding a package

- \`NU1101: Unable to find package\` — misspelt name or no internet/feed access.
- \`NU1202: Package X is not compatible with net8.0\` — the package targets something else; pick
  another version.
- \`CS0246: The type or namespace name 'JsonConvert' could not be found\` — the package is in the
  *other* project, or the \`using Newtonsoft.Json;\` is missing.`,
    workedExample: `**Problem.** Build a two-project solution where a console app uses a library, and ship it.

    > dotnet new sln -n Fees
    > dotnet new classlib -n Fees.Core
    > dotnet new console -n Fees.App
    > dotnet sln add Fees.Core Fees.App
    > dotnet add Fees.App reference Fees.Core

In \`Fees.Core/FeeCalculator.cs\`:

    namespace Fees.Core;
    public static class FeeCalculator
    {
        public static decimal WithGst(decimal amount) => amount * 1.18m;
    }

In \`Fees.App/Program.cs\`:

    using Fees.Core;
    Console.WriteLine(FeeCalculator.WithGst(1000m));   // 1180.00

1. \`dotnet run --project Fees.App\` prints \`1180.00\` (decimal keeps the scale of 1.18m × 1000m).
2. Make the class \`internal\` instead of \`public\` and build: **CS0122** — another project can only
   see public types. Put it back.
3. \`dotnet publish Fees.App -c Release -o out\` produces \`out/Fees.App.dll\`, \`out/Fees.Core.dll\`
   and a launcher. Copy the folder to a server with the .NET 8 runtime and run
   \`dotnet Fees.App.dll\`.

The project reference is why Fees.Core.dll is copied into the output automatically.`,
    mcqs: [
      mcq('You add a new file Invoice.cs to a project folder. What must you change in the .csproj?',
        [['Nothing — SDK-style projects compile every .cs file in the folder', true], ['Add a <Compile Include="Invoice.cs" /> line inside an ItemGroup element', false], ['Add Invoice.cs to the PackageReference list', false], ['Run dotnet sln add Invoice.cs to register the file', false]],
        'SDK-style projects glob all .cs files under the project directory. Listing files explicitly was needed in old .NET Framework projects only.'),
      mcq('Where does dotnet restore put the Newtonsoft.Json package by default?',
        [['In the global NuGet cache under the user profile', true], ['In a packages folder next to the .sln that you commit to git', false], ['Inside the .csproj file as embedded base64', false], ['In the bin folder only, deleted on every build', false]],
        'Packages are cached once per machine (~/.nuget/packages) and shared by every project. The repo only records the PackageReference.'),
      mcq('Shop.App references Shop.Core, and someone adds a reference from Shop.Core back to Shop.App. Result?',
        [['The build fails, because project references cannot be circular', true], ['Both projects merge into one assembly at build time', false], ['It works; the second reference is silently ignored', false], ['NuGet downloads a copy of each project to break the loop', false]],
        'Each project must build before the projects that use it, so a cycle has no valid order. Shared code belongs in a lower project both can reference.'),
    ],
    checkpoint: [
      ck('IDE_PROFICIENCY', 'You must deploy to a Linux VM that has no .NET installed and you cannot install it. Which publish fits?',
        [['dotnet publish -c Release -r linux-x64 --self-contained', true], ['dotnet publish -c Release, the framework-dependent default', false], ['dotnet build -c Release, then copy the bin folder', false], ['dotnet pack, then install the package on the VM', false]],
        'Self-contained publishing bundles the runtime with the app for a specific platform (the runtime identifier), so the target needs no .NET install.'),
      ck('IDE_PROFICIENCY', 'Fees.App references Fees.Core, but the build says CS0122: \'FeeCalculator\' is inaccessible. Why?',
        [['FeeCalculator is internal, so other projects cannot see it', true], ['Fees.Core has not been added to the NuGet cache', false], ['The two projects target different C# versions', false], ['A project reference only works for static classes', false]],
        'internal (the default for top-level types) means visible within the same assembly only. A type used from another project must be public.'),
      ck('IDE_PROFICIENCY', 'A teammate commits the bin and obj folders. What is the right fix?',
        [['Remove them and list bin/ and obj/ in .gitignore', true], ['Keep them, because restore needs bin to find packages', false], ['Commit the ~/.nuget/packages folder alongside them', false], ['Rename them to build/ so that git ignores them', false]],
        'bin and obj are generated by every build and differ per machine. A clean clone recreates them with dotnet build, so they never belong in source control.'),
    ],
  },
  {
    unitCode: 'JT_CS_START_INPUT_OUTPUT',
    notes: `Every coding round reads from standard input and prints to standard output. In C# that is
\`Console.ReadLine\` in and \`Console.WriteLine\` out — and a few habits that keep the parsing
safe.

## Reading

\`Console.ReadLine()\` returns the next line as a \`string\`, **without** the newline, or **null**
when the input has ended. There is no \`nextInt\`: you read a line and convert it.

    string line = Console.ReadLine();          // "42"
    int n = int.Parse(line);                   // 42

    // Several numbers on one line: "3  8 15"
    string[] parts = Console.ReadLine().Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
    int a = int.Parse(parts[0]);
    int b = int.Parse(parts[1]);

    // A whole line of numbers into an array
    int[] nums = Array.ConvertAll(parts, int.Parse);

\`Split(' ')\` on \`"3  8"\` gives \`"3"\`, \`""\`, \`"8"\` — the empty string makes \`int.Parse\` throw.
\`RemoveEmptyEntries\` drops those. (.NET Core 2.0+ also has the shorter overload
\`Split(' ', StringSplitOptions.RemoveEmptyEntries)\`; the \`new[] { ' ' }\` form works everywhere,
including the grader.)

## Parse versus TryParse

    int.Parse("42")        // 42
    int.Parse(" 42 ")      // 42 — surrounding spaces are allowed
    int.Parse("4.5")       // FormatException
    int.Parse("")          // FormatException
    int.Parse(null)        // ArgumentNullException

    int age;
    if (int.TryParse(Console.ReadLine(), out age))
        Console.WriteLine("Next year: " + (age + 1));
    else
        Console.WriteLine("Not a number");

\`TryParse\` never throws: it returns \`false\` and sets the out variable to 0. Use \`Parse\` when
bad input is a bug (a judge's input), \`TryParse\` when it is expected (a user typing). C# 7 lets
you declare it inline: \`int.TryParse(s, out int age)\`.

## Writing

    Console.Write("No newline ");
    Console.WriteLine("then a newline");
    Console.WriteLine();                       // a blank line

Three ways to build the text:

    string name = "Asha"; double avg = 87.456;
    Console.WriteLine("Hi " + name + ", avg " + avg);              // concatenation
    Console.WriteLine("Hi {0}, avg {1:F2}", name, avg);            // composite format
    Console.WriteLine($"Hi {name}, avg {avg:F2}");                 // interpolation, C# 6+

Format specifiers after the colon: \`F2\` (fixed, 2 decimals), \`N2\` (thousands separators),
\`D4\` (integer padded with zeros: \`7\` → \`0007\`), \`X\` (hex), \`C\` (currency — avoid in judged
output). Alignment after a comma: \`{0,8}\` right-aligns in 8 characters, \`{0,-8}\` left-aligns:

    Console.WriteLine("[{0,-6}][{1,5}]", "ab", 42);    // [ab    ][   42]

## Culture — the bug that only appears on someone else's machine

\`double.Parse("3.5")\` and \`x.ToString("F2")\` use the machine's culture. On a German or French
setting the decimal separator is a comma, so \`"3.5"\` fails to parse and \`3.5\` prints as
\`3,50\`. For machine-readable input and output, pass the invariant culture:

    using System.Globalization;
    var inv = CultureInfo.InvariantCulture;
    double price = double.Parse("3.5", inv);
    Console.WriteLine(price.ToString("F2", inv));      // 3.50 everywhere

## Speed for big outputs

Each \`Console.WriteLine\` is a call into the console stream. Printing 200,000 lines that way can
be slow; build them in a \`StringBuilder\` and print once, or wrap output in a buffered writer.`,
    mcqs: [
      mcq('The input line is "10 20". What does int.Parse(Console.ReadLine()) do?',
        [['Throws FormatException, because the line holds two numbers', true], ['Returns 10 and leaves the " 20" part for the next ReadLine call', false], ['Returns 30, the sum of both numbers on the line', false], ['Returns 1020 after removing the space between them', false]],
        'ReadLine returns the whole line, and int.Parse needs the entire string to be one integer. Split the line first and parse each part.'),
      mcq('What does Console.WriteLine("[{0,-6}]|[{1,4}]", "id", 7); print?',
        [['[id    ]|[   7]', true], ['[    id]|[7   ]', false], ['[id]|[7]', false], ['[-6id]|[47]', false]],
        'A negative alignment left-aligns the value in that width, padding on the right; a positive one right-aligns it, padding on the left.'),
      mcq('Your program reads lines in a loop with while (true). How do you know the input has ended?',
        [['Console.ReadLine() returns null', true], ['Console.ReadLine() returns an empty string', false], ['Console.ReadLine() throws EndOfStreamException', false], ['Console.ReadLine() returns the text "EOF"', false]],
        'At end of input ReadLine returns null. An empty string is a genuine blank line, which is why while ((line = Console.ReadLine()) != null) is the standard loop.'),
    ],
    checkpoint: [
      ck('CSHARP_BASICS', 'A user types "abc". After bool ok = int.TryParse(input, out int n);, what are ok and n?',
        [['ok is false and n is 0', true], ['ok is false and n keeps its earlier value', false], ['It throws FormatException before ok is set', false], ['ok is true and n is the char code of a', false]],
        'TryParse never throws for bad text. It returns false and assigns the out parameter its default value, 0.'),
      ck('CSHARP_BASICS', 'The input "5   9" is split with line.Split(\' \'). What does int.Parse(parts[1]) do?',
        [['Throws FormatException, because parts[1] is an empty string', true], ['Returns 9, since Split always skips the repeated spaces', false], ['Returns 0 for the blank entry and carries on', false], ['Throws IndexOutOfRangeException at once', false]],
        'Split(\' \') makes an entry between every pair of spaces, so "5   9" gives "5", "", "", "9". Use StringSplitOptions.RemoveEmptyEntries to drop the empty ones.'),
      ck('CSHARP_BASICS', 'A judge expects 3.50, but on a teammate\'s laptop the program prints 3,50. What is the fix?',
        [['Format with CultureInfo.InvariantCulture', true], ['Use Console.Write instead of WriteLine', false], ['Store the value as a float instead', false], ['Replace F2 in the format string with N2', false]],
        'Number formatting follows the current culture, and many cultures use a comma as the decimal separator. The invariant culture always uses a dot.'),
    ],
  },
  {
    unitCode: 'JT_CS_START_DEBUGGING',
    notes: `First C# bugs fall into three groups: the compiler refuses the code, the program cannot start,
or it runs and throws or prints the wrong thing. Here are the faults you will actually meet, each
with its symptom, cause and fix.

## 1. The cascade of compiler errors

    int marks = 85
    Console.WriteLine("Marks: " + Marks);

**Symptom:** \`CS1002: ; expected\` on line 1, then \`CS0103: The name 'Marks' does not exist\`.
**Cause:** a missing semicolon, and C# names are case-sensitive (\`marks\` was declared).
**Fix:** fix the first error, rebuild, then the next. One missing brace can produce twenty errors
below it.

## 2. No entry point

**Symptom:** \`CS5001: Program does not contain a static 'Main' method suitable for an entry point\`.
**Cause:** \`static void main\` (lower case), a missing \`static\`, or a class library project
(\`OutputType\` missing) being run.
**Fix:** \`static void Main\`, or add \`<OutputType>Exe</OutputType>\`.

## 3. Two entry points

**Symptom:** \`CS0017: Program has more than one entry point defined\`, or \`CS8804\` with top-level
statements.
**Cause:** a practice file with its own \`Main\` copied into the project.
**Fix:** one \`Main\` per project — make the other a normal method, or a separate project.

## 4. The wrong number of numbers on a line

    int n = int.Parse(Console.ReadLine());    // input: "4 7"

**Symptom:** \`Unhandled exception. System.FormatException: The input string '4 7' was not in a
correct format.\`
**Cause:** the line holds two values; \`int.Parse\` wants exactly one.
**Fix:** \`Split\` with \`RemoveEmptyEntries\`, then parse each part.

## 5. Reading past the end

    while (true) { int x = int.Parse(Console.ReadLine()); total += x; }

**Symptom:** \`ArgumentNullException: Value cannot be null. (Parameter 's')\` after the last line.
**Cause:** at end of input \`ReadLine\` returns \`null\`.
**Fix:** \`string line; while ((line = Console.ReadLine()) != null) { ... }\`.

## 6. Integer division in an average

    int total = 250, count = 3;
    double avg = total / count;               // 83, not 83.33
    Console.WriteLine(avg.ToString("F2"));    // 83.00

**Symptom:** the decimals are always \`.00\`.
**Cause:** \`total / count\` is \`int / int\`, computed as an int *before* it is stored in the double.
**Fix:** \`(double)total / count\`.

## 7. The format string that throws

    Console.WriteLine("Name: {0}, Age: {1}", name);

**Symptom:** \`FormatException: Index (zero based) must be greater than or equal to zero and less
than the size of the argument list.\`
**Cause:** \`{1}\` has no matching argument. The compiler cannot see inside the string.
**Fix:** pass every argument, or use interpolation (\`$"Name: {name}"\`), which the compiler checks.

## 8. The "works on my machine" decimal

**Symptom:** \`double.Parse("2.5")\` throws on a laptop set to German.
**Cause:** culture-sensitive parsing expects \`2,5\` there.
**Fix:** pass \`CultureInfo.InvariantCulture\` to Parse and ToString for machine-readable data.

## Reading an unhandled exception

    Unhandled exception. System.FormatException: The input string 'abc' was not in a correct format.
       at System.Number.ThrowFormatException...
       at Program.Main(String[] args) in C:\\code\\Hello\\Program.cs:line 6

Find the first line that names **your** file — here line 6. The lines above it are inside .NET.
The exception type and message tell you *what*; your line tells you *where*. Change one thing,
re-run, and compare.`,
    mcqs: [
      mcq('After the last input line, int.Parse(Console.ReadLine()) throws ArgumentNullException. Why?',
        [['ReadLine returned null because input ended', true], ['The last line held a number with a decimal point', false], ['The input stream was opened twice by mistake', false], ['int.Parse cannot read the very last line of a file', false]],
        'At end of input ReadLine returns null, and int.Parse(null) throws ArgumentNullException. Loop while the line is not null.'),
      mcq('An average of 250 and 3 always prints 83.00. Which line fixes it?',
        [['double avg = (double)total / count;', true], ['double avg = (double)(total / count);', false], ['double avg = total / count * 1.0;', false], ['decimal avg = total / count;', false]],
        'Only casting an operand before dividing makes it floating-point division. The other forms divide two ints first, so the fraction is already lost.'),
      mcq('A stack trace has eight lines; the fifth is "at Program.Main(...) in Program.cs:line 14". Where do you look first?',
        [['Line 14 of Program.cs, the first frame in your own code', true], ['The top frame, which is always the line that has the bug', false], ['The bottom frame, where the runtime started up', false], ['Nowhere — rebuild in Release mode and re-run', false]],
        'Frames above yours are inside the .NET libraries doing what your code asked. The first frame in your file is where your code made the failing call.'),
      mcq('Console.WriteLine("{0} scored {1}", name); compiles but crashes. What kind of error is this?',
        [['A run-time FormatException: {1} has no argument', true], ['A compile error the IDE failed to highlight', false], ['A NullReferenceException, because name is null', false], ['A warning only — it prints "{1}" literally', false]],
        'The composite format string is just text to the compiler, so the missing argument is found only when the method runs. Interpolated strings avoid this class of bug.'),
    ],
  },
  {
    unitCode: 'JT_CS_START_PRACTICE',
    notes: `Work these from the terminal first — \`dotnet new console\`, \`dotnet run\` — so you see raw
compiler messages, then use the IDE's debugger.

## Exercise 1 — Hello with arguments

Make \`dotnet run -- Priya\` print \`Hello, Priya\`, and \`dotnet run\` with no argument print
\`Hello, stranger\`. Check \`args.Length\` before touching \`args[0]\`.

## Exercise 2 — Fix the build

    using system;
    class program
    {
        static void main(String[] args)
        {
            Console.Writeline("Ready")
        }
    }

There are four faults that stop the build (and one choice that is legal but unusual). List them
before fixing any, then fix and run.

## Exercise 3 — Two numbers, four results

Read two integers from one line (there may be several spaces between them) and print their sum,
difference, product, and the exact quotient to two decimals. For \`7   2\`: \`9\`, \`5\`, \`14\`,
\`3.50\`. What should happen for \`7 0\`? Decide, and print \`undefined\` for the quotient.

## Exercise 4 — A receipt line

Read an item name (may contain spaces), a quantity and a unit price, and print

    Blue Pen       x  3     45.00

using a composite format string: name left-aligned in 14, quantity right-aligned in 3, total
right-aligned in 9 with two decimals.

## Exercise 5 — Solution and package

Create a solution with a class library and a console app; reference the library from the app; add
the Humanizer package and print \`1234.ToWords()\`. Then publish the app with
\`dotnet publish -c Release -o out\` and run \`dotnet out/App.dll\`.

## Exercise 6 — Debugger drill

Sum 1..10 in a loop, set a breakpoint with the condition \`i == 7\`, and read \`total\` in Locals
before that line runs. (It is 21.) Then evaluate \`total * i\` in the Immediate Window.

The graded exercise below is a bill split: a full line of text, then numbers on the next line, then
decimal money — rounding included.`,
    mcqs: [
      mcq('In Exercise 2, which fault does the compiler report as CS0246 or CS0103 first?',
        [['using system; — the namespace is System, with a capital S', true], ['class program — class names must start with a capital', false], ['String args — it must be written string, in lower case', false], ['The braces — C# needs them on the same line as the method', false]],
        'C# is case-sensitive, so system is an unknown namespace. Lower-case class names are legal (just unconventional), and once using System is fixed, String is the same type as string.'),
      mcq('What does Console.WriteLine("{0,-5}|{1,6:F2}", "Pen", 4.5); print?',
        [['Pen  |  4.50', true], ['  Pen|  4.50', false], ['Pen|4.50', false], ['Pen  |4.5   ', false]],
        '{0,-5} left-aligns "Pen" in five characters; {1,6:F2} formats 4.5 as "4.50" and right-aligns it in six.'),
      mcq('What does 1250m / 4 evaluate to, and with which type?',
        [['312.5, a decimal', true], ['312, an int', false], ['312.5, a double', false], ['312.50, a string', false]],
        'The m suffix makes 1250m a decimal; dividing a decimal by an int promotes the int, so the result is the decimal 312.5.'),
      mcq('You need a share rounded to 2 decimals with halves going up (0.125 → 0.13). Which call is right?',
        [['Math.Round(x, 2, MidpointRounding.AwayFromZero)', true], ['Math.Round(x, 2), the default rounding mode', false], ['(int)(x * 100) / 100m, truncating the rest', false], ['Math.Floor(x * 100) / 100, rounding down', false]],
        'Math.Round defaults to banker\'s rounding (to even), which turns 0.125 into 0.12. AwayFromZero gives the schoolbook rule; casting and Floor just cut digits off.'),
      mcq('dotnet run is typed with no arguments. What does Console.WriteLine(args[0]); do?',
        [['Throws IndexOutOfRangeException', true], ['Prints an empty line and continues', false], ['Prints null and carries on running', false], ['Prints the project\'s name, taken from the .csproj', false]],
        'args is an empty array of length 0, so index 0 does not exist. Check args.Length first.'),
    ],
    assignment: {
      title: 'Split the Bill with a Tip',
      description: 'Read a name, then a bill amount, a head count and a tip percentage, and print the tip, the total and each person\'s share, rounded correctly to two decimals.',
      instructions: `Write a program that reads exactly this input:

- Line 1: the name of the person paying (it may contain spaces; ignore spaces at either end).
- Line 2: the bill amount (rupees, up to two decimals, e.g. \`1499.50\`), the number of people
  (an integer) and the tip percentage (an integer). They may be separated by more than one space.

It prints five lines:

    Hello, <name>!
    Subtotal: <amount to 2 decimals>
    Tip (<percent>%): <tip to 2 decimals>
    Total: <amount + tip, to 2 decimals>
    Each pays: <total / people, to 2 decimals>

**Example.** For the input

    Asha Rao
    1499.50 4 10

the output is

    Hello, Asha Rao!
    Subtotal: 1499.50
    Tip (10%): 149.95
    Total: 1649.45
    Each pays: 412.36

**Rules**

- Use \`decimal\` for money. Parse with \`CultureInfo.InvariantCulture\` and print every amount with
  \`.ToString("F2", CultureInfo.InvariantCulture)\`.
- Round the tip to 2 decimals **before** adding it, and round the share to 2 decimals, both with
  \`Math.Round(value, 2, MidpointRounding.AwayFromZero)\` — so 0.025 becomes 0.03.
- If the number of people is 0 or less, the last line is \`Each pays: n/a\`.
- Amounts can reach two billion rupees; nothing you compute may overflow.
- Print nothing else — no "Enter amount:" prompts.
- The grader runs C# 7 on Mono: use a classic \`class Program\` with \`static void Main()\`, and
  string concatenation or \`string.Format\` rather than newer features.

**How it is graded**

Your program is run against the example above and several hidden cases (a name with spaces around
it, a zero tip, a share below one rupee, a half-paisa that must round up, a huge bill, and nobody
to split it with). The output is compared line by line; spelling and punctuation matter.`,
      rubric: [
        { criterion: 'Correct output', description: 'All five lines are right for every test case, including the rounding of halves, a zero head count and very large bills.', maxPoints: 60 },
        { criterion: 'Input parsed safely', description: 'The name is read as a whole line and trimmed; the numbers are split with empty entries removed and parsed with the invariant culture into decimal and int.', maxPoints: 25 },
        { criterion: 'Readable', description: 'Variables are named for what they hold, rounding happens in one clearly written place, and there is no leftover prompt or debug output.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'csharp',
        starter: `using System;
using System.Globalization;

class Program
{
    static void Main()
    {
        CultureInfo inv = CultureInfo.InvariantCulture;
        string name = Console.ReadLine();
        string[] parts = Console.ReadLine().Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
        // TODO: trim the name; parse the amount (decimal), the people and the tip percent (int)
        // TODO: compute the tip and the share, rounding to 2 decimals with MidpointRounding.AwayFromZero
        // TODO: print the five lines, every amount with .ToString("F2", inv)
    }
}
`,
        tests: [
          { input: 'Asha Rao\n1499.50 4 10\n', expectedOutput: 'Hello, Asha Rao!\nSubtotal: 1499.50\nTip (10%): 149.95\nTotal: 1649.45\nEach pays: 412.36' },
          { input: 'Ravi\n100 3 0\n', expectedOutput: 'Hello, Ravi!\nSubtotal: 100.00\nTip (0%): 0.00\nTotal: 100.00\nEach pays: 33.33' },
          { input: '  Meera K  \n999.99   1   15\n', expectedOutput: 'Hello, Meera K!\nSubtotal: 999.99\nTip (15%): 150.00\nTotal: 1149.99\nEach pays: 1149.99', isHidden: true },
          { input: 'Team Lunch\n7 10 0\n', expectedOutput: 'Hello, Team Lunch!\nSubtotal: 7.00\nTip (0%): 0.00\nTotal: 7.00\nEach pays: 0.70', isHidden: true },
          { input: 'Sam\n0.50 2 5\n', expectedOutput: 'Hello, Sam!\nSubtotal: 0.50\nTip (5%): 0.03\nTotal: 0.53\nEach pays: 0.27', isHidden: true },
          { input: 'Arjun\n2000000000 7 18\n', expectedOutput: 'Hello, Arjun!\nSubtotal: 2000000000.00\nTip (18%): 360000000.00\nTotal: 2360000000.00\nEach pays: 337142857.14', isHidden: true },
          { input: 'Nobody Else\n500 0 10\n', expectedOutput: 'Hello, Nobody Else!\nSubtotal: 500.00\nTip (10%): 50.00\nTotal: 550.00\nEach pays: n/a', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 60,
      },
    },
  },
  {
    unitCode: 'JT_CS_START_INTERVIEW_QUESTION',
    notes: `Three questions a fresher .NET interview opens with, and answers that show understanding rather
than a memorised line.

## Q1. "What is the CLR, and what happens when you run a C# program?"

**Model answer.** "The C# compiler turns my source into an assembly — a dll containing IL, an
intermediate language, plus metadata about every type. When I run it, the CLR — the Common Language
Runtime — loads the assembly, verifies it, and the JIT compiler turns each method into native code
the first time it is called. The CLR also gives me garbage collection, exception handling and type
safety; that is what 'managed code' means."

**Follow-up:** "What is the difference between .NET Framework and .NET 8?" — "Framework is the
original Windows-only platform, now in maintenance at 4.8. .NET Core was the cross-platform rewrite;
from version 5 it is just called .NET. New work — ASP.NET Core APIs, containers on Linux — targets
.NET 8, the current long-term-support release."

## Q2. "What is the difference between the .NET SDK and the runtime?"

**Model answer.** "The runtime is what a machine needs to run a built app: the CLR and the base class
library, and for web apps the ASP.NET Core runtime. The SDK is what a developer needs to build one —
the compiler, MSBuild, the dotnet CLI commands, templates and NuGet — and it includes a runtime. A
production server needs only the runtime, or not even that if I publish self-contained."

**Follow-up:** "What does dotnet publish give you that build doesn't?" — "Publish produces a
deployable folder: Release configuration by default in .NET 8, all dependency dlls copied in, and
optionally the runtime itself or a single file. Build output is meant for running locally."

## Q3. A code question: "This crashes for some users. Why?"

    Console.Write("Price: ");
    double price = double.Parse(Console.ReadLine());
    Console.WriteLine("With GST: " + (price * 1.18).ToString("F2"));

**Model answer.** "Three ways it can fail. If the user types nothing at end of input, ReadLine
returns null and Parse throws ArgumentNullException. If they type 'abc', Parse throws
FormatException — for user input I would use double.TryParse and ask again. And Parse and ToString
follow the machine's culture, so on a German machine '2.5' does not parse and the output uses a
comma. For data I'd pass CultureInfo.InvariantCulture. Also, money should be decimal, not double."

**Follow-up:** "Why decimal for money?" — "double is binary floating point, so 0.1 has no exact
representation and sums drift; decimal is base-10 with 28–29 significant digits, so 0.1m + 0.2m is
exactly 0.3m."

## How to answer

One-sentence distinction first, then the mechanism, then a concrete consequence — "...and that is
why the server only needs the runtime". It sounds like someone who has shipped .NET, not read about
it.`,
    mcqs: [
      mcq('An interviewer asks what "managed code" means. Which answer is accurate?',
        [['Code executed by the CLR, with GC and type safety', true], ['Code that has been reviewed by a team manager', false], ['Code written only in C#, never in F# or VB.NET', false], ['Code compiled ahead of time with Native AOT only', false]],
        'Managed code runs under the CLR, which provides garbage collection, type checking and exception handling. Any .NET language produces it.'),
      mcq('Why is decimal preferred to double for an invoice total?',
        [['decimal stores base-10 fractions like 0.1 exactly', true], ['decimal is faster than double in every arithmetic operation', false], ['double cannot hold values larger than one million', false], ['decimal rounds every result to two places by itself', false]],
        'double is binary floating point, so many decimal fractions are approximations that drift when summed. decimal is base-10, which matches money. It is slower, not faster, and keeps its full scale.'),
      mcq('A production server runs your published, framework-dependent API. What must be installed on it?',
        [['The ASP.NET Core runtime of a matching major version', true], ['The full .NET SDK, so that it can rebuild the code on start-up', false], ['Visual Studio, to host the compiled application', false], ['Nothing at all — the dll already contains the CLR', false]],
        'Framework-dependent apps rely on a runtime installed on the machine. The SDK and IDE are build tools; only a self-contained publish brings its own runtime.'),
    ],
  },
  {
    unitCode: 'JT_CS_START_CHECKPOINT',
    notes: `Ten questions on the whole topic: .NET and the CLR, the first program, the IDE and debugger,
projects and NuGet, and reading input and printing output. Each is a situation from the first week
of a .NET job. Read every snippet as the compiler would, not as you hope it behaves.`,
    checkpoint: [
      ck('CSHARP_BASICS', 'What does the C# compiler write into Orders.dll for the CLR to run?',
        [['IL and metadata, JIT-compiled into native code at run time', true], ['Native machine code built separately for each operating system', false], ['A copy of every .cs file, compiled again on the first run', false], ['Java bytecode, which the CLR translates as the app runs', false]],
        'An assembly holds Intermediate Language plus metadata. The CLR loads it and the JIT compiles methods to the current CPU\'s code on first use.'),
      ck('CSHARP_BASICS', 'Program.cs contains: static void Main() { Console.WriteLine(args.Length); }. What happens?',
        [['A compile error: args does not exist in this Main', true], ['It prints 0, because args defaults to empty', false], ['It prints the number of command-line words', false], ['It throws NullReferenceException at run time', false]],
        'This Main declares no parameter, so the name args is not in scope (CS0103). Declare Main(string[] args) to receive the arguments.'),
      ck('CSHARP_BASICS', 'Input line: "  12  ". What does int.Parse(Console.ReadLine()) return?',
        [['12', true], ['A FormatException, because of the spaces', false], ['0, since the text is not clean', false], ['1, the number of tokens on the line', false]],
        'int.Parse allows leading and trailing white space by default. It is spaces between numbers, or other characters, that make it throw.'),
      ck('CSHARP_BASICS', 'double avg = 7 / 2; Console.WriteLine(avg); — what is printed?',
        [['3', true], ['3.5', false], ['3.50', false], ['4', false]],
        '7 / 2 is integer division, giving 3, which is then converted to the double 3.0. Console prints a whole-number double without a decimal point.'),
      ck('CSHARP_BASICS', 'Which loop reads every remaining input line and stops cleanly at the end?',
        [['while ((line = Console.ReadLine()) != null) { ... }', true], ['while (Console.ReadLine() != "") { ... }', false], ['for (int i = 0; i < Console.In.Length; i++) { ... }', false], ['do { line = Console.ReadLine(); } while (line.Length > 0);', false]],
        'ReadLine returns null at end of input. Testing for "" stops at the first blank line, TextReader has no Length, and line.Length throws once line is null.'),
      ck('IDE_PROFICIENCY', 'In Visual Studio you press Ctrl+F5 instead of F5. What changes?',
        [['The app runs without the debugger, so breakpoints are skipped', true], ['The app builds in Release mode and then publishes it to a folder', false], ['The breakpoints become conditional on their first hit only', false], ['Nothing — the two keys are aliases for the same command', false]],
        'Ctrl+F5 is Start Without Debugging: faster, and the console window waits for a key, but no breakpoint will be hit. F5 attaches the debugger.'),
      ck('IDE_PROFICIENCY', 'Stopped on var total = Sum(items); you press F10. Where does execution stop next?',
        [['On the next line, after Sum has run to completion', true], ['On the first line inside the Sum method', false], ['At the end of Main, skipping the remaining lines', false], ['At the next breakpoint, wherever it may be', false]],
        'F10 (Step Over) runs the whole current line, including any calls it makes, and stops at the next line. F11 would enter Sum.'),
      ck('IDE_PROFICIENCY', 'Which command adds Serilog to the Api project and records it in Api.csproj?',
        [['dotnet add Api package Serilog', true], ['dotnet add Api reference Serilog', false], ['dotnet new Serilog --project Api', false], ['dotnet restore Serilog into Api', false]],
        'add package writes a PackageReference and restores it. add reference is for project-to-project references, not NuGet packages.'),
      ck('IDE_PROFICIENCY', 'A colleague clones the repo and builds. Where do the NuGet packages come from?',
        [['Restore downloads them into the machine\'s NuGet cache', true], ['From the bin folder, which is committed with the code', false], ['They are compiled from source on the first build', false], ['From the .sln file, which embeds the packages', false]],
        'The project lists PackageReferences; dotnet build runs restore, which fetches any missing package from the feed into the global cache.'),
      ck('IDE_PROFICIENCY', 'Which project file setting makes dotnet build produce a runnable app rather than a library?',
        [['<OutputType>Exe</OutputType>', true], ['<TargetFramework>net8.0</TargetFramework>', false], ['<Nullable>enable</Nullable>', false], ['<ImplicitUsings>enable</ImplicitUsings>', false]],
        'OutputType Exe gives the assembly an entry point and an apphost launcher. The other properties set the .NET version and compiler features.'),
    ],
  },

  /* ══ JT_CS_BASICS — C# Fundamentals ═════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_CS_BASICS_TYPES',
    notes: `C# is **statically typed**: every variable has a type fixed at compile time, and the compiler
refuses code that mixes types carelessly. Coming from Python, this is the biggest change — and the
reason many bugs never reach run time.

## The built-in types you will use

| Type | Size | Holds | Literal |
|---|---|---|---|
| \`int\` | 32-bit | −2,147,483,648 … 2,147,483,647 | \`42\` |
| \`long\` | 64-bit | about ±9.2 × 10¹⁸ | \`42L\` |
| \`double\` | 64-bit | binary floating point, ~15–17 digits | \`4.2\` |
| \`float\` | 32-bit | binary floating point, ~7 digits | \`4.2f\` |
| \`decimal\` | 128-bit | base-10, 28–29 digits — money | \`4.2m\` |
| \`char\` | 16-bit | one UTF-16 code unit | \`'A'\` |
| \`bool\` | — | \`true\` / \`false\` only | \`true\` |
| \`string\` | reference | text, immutable | \`"hi"\` |
| \`byte\` | 8-bit | 0 … 255 | |

\`int\` is an alias for \`System.Int32\`, \`string\` for \`System.String\` — the same types under two
names. \`int.MaxValue\`, \`long.MinValue\` and \`double.Epsilon\` give the limits.

## Declaring

    int count = 10;
    double rate = 7.5;
    decimal fee = 1499.99m;          // without m: CS0664, a double literal can't become decimal
    float ratio = 0.5f;              // without f: CS0664 as well
    char grade = 'A';                // single quotes: a char; "A" is a string
    bool passed = count > 5;
    const double Gst = 0.18;         // a compile-time constant; cannot be reassigned

    var name = "Asha";               // var: the compiler infers string — still statically typed
    var big = 3000000000;            // uint — a literal takes the first of int, uint, long, ulong that fits
    var n = 5;                       // int
    // name = 5;                     // CS0029: cannot convert int to string

\`var\` is not Python's dynamic typing: the type is fixed from the initialiser and never changes.
Use it when the type is obvious from the right-hand side.

A local variable must be **definitely assigned** before it is read:

    int t;
    Console.WriteLine(t);            // CS0165: use of unassigned local variable 't'

Fields and array elements, by contrast, start at their default (0, false, null).

## Integer division and overflow

    Console.WriteLine(7 / 2);        // 3    — int / int is int; the fraction is dropped
    Console.WriteLine(7 / 2.0);      // 3.5
    Console.WriteLine(-7 / 2);       // -3   — truncates toward zero

    int max = int.MaxValue;
    max++;                           // -2147483648 — wraps silently (unchecked by default)
    int bad = checked(max + 1);      // throws OverflowException
    // int c = int.MaxValue + 1;     // CS0220: constants are checked at compile time

    int a = int.MaxValue;
    long wrong = a * 2;              // -2: multiplied as int, overflowed, THEN widened
    long right = (long)a * 2;        // 4294967294

Arithmetic is **unchecked** unless you write \`checked(...)\`, use a \`checked { }\` block, or turn on
\`<CheckForOverflowUnderflow>\` in the project. Choose \`long\` when sums can pass two billion.

## double versus decimal

    Console.WriteLine(0.1 + 0.2 == 0.3);      // False — binary fractions are approximate
    Console.WriteLine(0.1m + 0.2m == 0.3m);   // True  — decimal is base-10

\`double\` is fast and right for measurements and science. \`decimal\` is slower but exact for
base-10 values: **use decimal for money**. Mixing them needs a cast: \`decimal d = (decimal)rate;\`.

Dividing by zero: \`int\` and \`decimal\` throw \`DivideByZeroException\`; \`double\` gives
\`Infinity\` or \`NaN\` and carries on silently.

## Value types and reference types

\`int\`, \`double\`, \`decimal\`, \`char\`, \`bool\` and structs are **value types**: a variable holds
the value itself, and assignment copies it. \`string\`, arrays and classes are **reference types**:
the variable holds a reference to an object on the heap. This difference explains what methods can
change (the METHODS unit) and why arrays behave as they do (ARRAYS).`,
    workedExample: `**Problem.** A placement portal sums 50,000 students' fees of ₹49,999 each and reports a
negative total. Find and fix it.

    int fee = 49999;
    int students = 50000;
    int total = fee * students;
    Console.WriteLine(total);            // -1795017296

1. The true answer is 2,499,950,000 — more than \`int.MaxValue\` (2,147,483,647).
2. \`fee * students\` is int × int, so it is computed in 32 bits and wraps around silently.
3. Changing only the result type is not enough: \`long total = fee * students;\` still multiplies as
   int and then widens the already-wrong value.
4. Widen one operand **before** the multiplication:

       long total = (long)fee * students;   // 2499950000

5. Better still, money is decimal: \`decimal total = 49999m * students;\`.
6. To catch this class of bug in tests, wrap risky arithmetic in \`checked(...)\` — an
   OverflowException is far easier to find than a wrong number in a report.`,
    mcqs: [
      mcq('What does decimal price = 99.50; do?',
        [['Fails to compile — 99.50 is a double literal; it needs the m suffix', true], ['Compiles and stores 99.5 exactly in the decimal variable', false], ['Compiles but rounds the value to 100 when stored', false], ['Compiles, then throws InvalidCastException at run time', false]],
        'A literal with a decimal point is a double. There is no implicit conversion from double to decimal, so the compiler reports CS0664 and suggests 99.50m.'),
      mcq('int a = int.MaxValue; long r = a * 2; — what is r?',
        [['-2', true], ['4294967294', false], ['It throws an OverflowException', false], ['It does not compile', false]],
        'a * 2 is evaluated as int and wraps to -2 before being widened to long. Cast first: (long)a * 2 gives 4294967294.'),
      mcq('var count = 10; is followed by count = "ten";. What happens?',
        [['Compile error: count was inferred as int and stays an int', true], ['count becomes a string, as a Python variable would', false], ['count becomes 0, because "ten" does not parse as a number', false], ['A run-time InvalidCastException is thrown on that line', false]],
        'var asks the compiler to infer the type once, from the initialiser. count is an int for its whole life, and assigning a string is CS0029.'),
    ],
    checkpoint: [
      mcq('byte b = 255; b++; Console.WriteLine(b); — what is printed?',
        [['0', true], ['256', false], ['255', false], ['An OverflowException is thrown', false]],
        'byte holds 0 to 255. Increment is unchecked by default, so 255 + 1 wraps around to 0 without an error.'),
      mcq('Which declaration is the right choice for a bank balance in rupees and paise?',
        [['decimal balance = 1520.75m;', true], ['double balance = 1520.75;', false], ['float balance = 1520.75f;', false], ['int balance = 1520.75;', false]],
        'decimal is base-10, so paise are stored exactly and sums do not drift. double and float are binary approximations, and the int line does not compile.'),
      mcq('int x = 10, y = 0; Console.WriteLine(x / y); — what happens?',
        [['DivideByZeroException at run time', true], ['It prints Infinity and carries on', false], ['It prints 0, because nothing can be divided', false], ['A compile error, because y is zero', false]],
        'Integer (and decimal) division by zero throws. Only double and float division return Infinity or NaN. The compiler does not track the run-time value of y.'),
    ],
  },
  {
    unitCode: 'JT_CS_BASICS_CONVERSIONS_NULLABLE',
    notes: `## Implicit and explicit conversions

A conversion that can never lose information is **implicit**; one that might is **explicit** and
needs a cast.

    int i = 42;
    long l = i;                 // implicit: every int fits in a long
    double d = i;               // implicit
    int back = (int)l;          // explicit: a long might not fit
    int t = (int)3.99;          // 3  — casting truncates toward zero
    int u = (int)-3.99;         // -3
    // int bad = d;             // CS0266: an explicit conversion exists (are you missing a cast?)

A cast that does not fit wraps silently (unless \`checked\`):

    long huge = 3000000000L;
    Console.WriteLine((int)huge);      // -1294967296
    int v = 300;
    Console.WriteLine((byte)v);        // 44 (300 − 256)

**Small types are promoted.** Arithmetic on \`byte\` and \`short\` happens in \`int\`:

    byte b = 10;
    // b = b + 1;               // CS0266: b + 1 is an int
    b += 1;                     // fine — compound assignment casts back for you

## Parse, TryParse and Convert

    int a = int.Parse("123");             // 123; throws FormatException on "12a"
    double p = double.Parse("4.5", CultureInfo.InvariantCulture);
    bool ok = int.TryParse("12a", out int n);   // false, n = 0 (out int n is C# 7)

    int c = Convert.ToInt32("123");       // 123
    int z = Convert.ToInt32((string)null);// 0 — Convert treats null as zero; int.Parse(null) throws
    int r1 = Convert.ToInt32(2.5);        // 2 — Convert ROUNDS, to the even number on a tie
    int r2 = Convert.ToInt32(3.5);        // 4
    string s = 42.ToString();             // "42"

Know the difference: a cast **truncates** (\`(int)2.9\` is 2), \`Convert.ToInt32\` **rounds**
(\`Convert.ToInt32(2.9)\` is 3), and \`Math.Round\` rounds to even by default
(\`Math.Round(2.5)\` is 2) unless you pass \`MidpointRounding.AwayFromZero\`.

**char and numbers:** \`(int)'A'\` is 65, \`(char)66\` is \`'B'\`, and \`'7' - '0'\` is the int 7 — the
standard way to turn a digit character into its value.

**Boxing:** putting a value type in an \`object\` boxes it, and you can only unbox to the exact type:

    object o = 5;
    int ok2 = (int)o;           // fine
    long nope = (long)o;        // InvalidCastException — o holds an int, not a long

## Nullable value types: int?

A plain \`int\` can never be null (\`int x = null;\` is CS0037). When "no value" is meaningful — an
optional age, a missing mark — use \`int?\` (short for \`Nullable<int>\`):

    int? mark = null;
    Console.WriteLine(mark.HasValue);           // False
    Console.WriteLine(mark ?? -1);              // -1     — ?? gives a fallback
    Console.WriteLine(mark.GetValueOrDefault());// 0
    int m = mark.Value;                         // InvalidOperationException when null
    int? total = mark + 5;                      // null — arithmetic with null gives null
    Console.WriteLine(mark > 0);                // False
    Console.WriteLine(mark <= 0);               // False as well — comparisons with null are false

    mark ??= 0;                                 // C# 8: assign only if null

## null and reference types

A \`string\` (or any class) variable can hold \`null\`. Calling a member on null is the most common
crash in .NET:

    string city = null;
    int len = city.Length;                      // NullReferenceException
    int? len2 = city?.Length;                   // null — ?. stops at null (C# 6)
    int len3 = city?.Length ?? 0;               // 0

**Nullable reference types** (C# 8, on by default in new .NET 6+ projects via
\`<Nullable>enable</Nullable>\`) make the compiler track this. \`string\` then means "never null"
and \`string?\` means "may be null"; dereferencing a \`string?\` without a check gives warning
**CS8602**. The \`!\` operator (\`city!.Length\`) tells the compiler "trust me" — it removes the
warning, not the crash. These are warnings, not run-time checks.`,
    mcqs: [
      mcq('What does Console.WriteLine((int)7.9 + Convert.ToInt32(7.9)); print?',
        [['15', true], ['14', false], ['16', false], ['15.8', false]],
        'The cast truncates 7.9 to 7, and Convert.ToInt32 rounds it to 8, so the sum is 15.'),
      mcq('int? marks = null; int final = marks ?? 35; — what is final?',
        [['35', true], ['0', false], ['null', false], ['It does not compile', false]],
        'The null-coalescing operator returns its left operand when it has a value and the right one otherwise. marks is null, so final is 35.'),
      mcq('object o = 42; long l = (long)o; — what happens at run time?',
        [['InvalidCastException: a boxed int unboxes only to int', true], ['l becomes 42, because an int always fits in a long', false], ['l becomes 0, because the cast failed quietly', false], ['A compile error, since object cannot be cast', false]],
        'Unboxing must name the exact boxed type. Write (long)(int)o — unbox to int, then widen — to get 42.'),
    ],
    checkpoint: [
      mcq('int? stock = null; Console.WriteLine(stock < 5 || stock >= 5); — what is printed?',
        [['False', true], ['True', false], ['Nothing — the line throws an exception', false], ['It fails to compile', false]],
        'Every relational comparison involving a null int? is false, so both halves are false. A null value is neither below nor at-or-above 5.'),
      mcq('string name = null; int n = name?.Length ?? 0; — what is n?',
        [['0', true], ['null', false], ['-1', false], ['It throws NullReferenceException', false]],
        'name?.Length is null because name is null, and ?? replaces that null with 0. No member is called on the null reference.'),
      mcq('Which line compiles without a cast?',
        [['long total = someInt;', true], ['int count = someLong;', false], ['float f = someDouble;', false], ['byte b = someInt;', false]],
        'Widening int to long can never lose data, so it is implicit. Every other line narrows the value and needs an explicit cast.'),
    ],
  },
  {
    unitCode: 'JT_CS_BASICS_OPERATORS',
    notes: `## Arithmetic

    Console.WriteLine(17 / 5);       // 3
    Console.WriteLine(17 % 5);       // 2
    Console.WriteLine(-17 % 5);      // -2 — the remainder takes the sign of the left operand
    Console.WriteLine(17 % -5);      // 2
    Console.WriteLine(10.5 % 3);     // 1.5 — % works on doubles too

Because of the sign rule, test oddness with \`n % 2 != 0\`, not \`n % 2 == 1\` (which is false for
-3).

There is **no power operator**. \`^\` is bitwise XOR: \`2 ^ 3\` is \`1\`. Use \`Math.Pow(2, 10)\`, which
returns a \`double\` (1024).

## Precedence and associativity

From high to low: unary (\`!\`, \`-\`, \`++\`, casts) → \`* / %\` → \`+ -\` → comparisons
(\`< > <= >=\`) → \`== !=\` → \`&&\` → \`||\` → \`??\` → \`?:\` → assignment. Operators of equal
precedence group left to right (assignment groups right to left).

    Console.WriteLine(2 + 3 * 4 - 6 / 4);   // 13   (2 + 12 - 1)
    Console.WriteLine(10 / 3 * 3);          // 9    ((10 / 3) * 3)
    Console.WriteLine(10 * 3 / 3);          // 10

## Increment and decrement

\`i++\` gives the old value then increments; \`++i\` increments then gives the new value.

    int i = 5;
    int r = i++ + ++i;     // 5 + 7 = 12, and i is 7
    int q = 7;
    int w = q++ * 2 + q;   // 7 * 2 + 8 = 22, and q is 8

Operands are evaluated left to right in C# — this is defined behaviour, unlike C. It is still
unreadable: never write such lines in real code.

## String +

\`+\` with a string on either side concatenates, and evaluation is left to right:

    Console.WriteLine(1 + 2 + "3" + 4 + 5);   // 3345
    Console.WriteLine("A" + 1 + 1);           // A11
    Console.WriteLine('A' + 1 + "1");         // 661 — 'A' + 1 is the int 66

## Comparison and logical operators

\`==\`, \`!=\`, \`<\` … return \`bool\`. C# has no truthiness: \`if (count)\` does not compile for an
int, and \`a < b < c\` is CS0019 (a bool cannot be compared with an int).

\`&&\` and \`||\` **short-circuit**: the right side runs only if needed.

    if (name != null && name.Length > 3) ...   // safe: Length is not read when name is null
    if (list.Count == 0 || list[0] < 0) ...    // safe: list[0] is not read for an empty list

\`&\` and \`|\` on bools evaluate **both** sides every time. \`!\` is not.

## Compound assignment

\`x += 3\`, \`x -= 3\`, \`x *= 3\`, \`x /= 3\`, \`x %= 3\`. The right side is computed first:

    int u = 10;
    u -= 3 - 1;            // u = 10 - (3 - 1) = 8

\`short s = 5; s += 2;\` compiles (it casts back), but \`int x = 5; x += 2.7;\` is CS0266 — the right
side must be implicitly convertible to x's type.

## Ternary and null operators

    string label = score >= 40 ? "Pass" : "Fail";
    string size = n > 2 ? n > 5 ? "big" : "mid" : "small";   // nests right to left — use sparingly
    string shown = nickname ?? fullName;                        // first non-null

The two branches of \`?:\` must have compatible types: \`flag ? 1 : "one"\` does not compile.`,
    mcqs: [
      mcq('What does Console.WriteLine(2 ^ 3); print in C#?',
        [['1', true], ['8', false], ['6', false], ['It does not compile', false]],
        '^ is the bitwise exclusive-or operator: 010 XOR 011 is 001. For powers use Math.Pow(2, 3), which returns the double 8.'),
      mcq('int i = 3; int r = i++ * 2 + i; — what is r?',
        [['10', true], ['9', false], ['11', false], ['8', false]],
        'i++ yields 3 and then i becomes 4. So r = 3 * 2 + 4 = 10. C# evaluates operands strictly left to right.'),
      mcq('What does Console.WriteLine(5 + 5 + "5" + 5 + 5); print?',
        [['10555', true], ['55555', false], ['1510', false], ['25', false]],
        'Left to right: 5 + 5 is the int 10; adding "5" makes the string "105"; each later + appends text, giving "10555".'),
    ],
    checkpoint: [
      mcq('Why is (n % 2 == 1) a wrong test for "n is odd" in C#?',
        [['For negative odd n, n % 2 is -1, so the test is false', true], ['% is not defined for int operands in C#', false], ['It is true for even numbers greater than 100', false], ['% returns a double, which never equals exactly 1', false]],
        'The remainder takes the sign of the dividend, so -3 % 2 is -1. Test n % 2 != 0 to cover negative numbers.'),
      mcq('string s = null; if (s.Length > 0 && s != null) { } — what happens?',
        [['NullReferenceException, because s.Length runs first', true], ['Nothing — && checks s != null before anything else', false], ['A compile error: null cannot be compared this way', false], ['The if body runs, because null has a length of 0', false]],
        '&& evaluates left to right and only skips the right side. Here the dangerous check is on the left, so it runs on null. Put s != null first.'),
      mcq('int x = 20; x /= 3 + 1; — what is x?',
        [['5', true], ['7', false], ['6', false], ['It does not compile', false]],
        'The whole right side is evaluated first: 3 + 1 is 4, then x = 20 / 4 = 5. Compound assignment does not bind more tightly than the + on its right.'),
    ],
  },
  {
    unitCode: 'JT_CS_BASICS_CONDITIONS',
    notes: `## if, else if, else

    int marks = 72;
    if (marks >= 90)
    {
        Console.WriteLine("Distinction");
    }
    else if (marks >= 60)
    {
        Console.WriteLine("First class");
    }
    else
    {
        Console.WriteLine("Keep going");
    }

The condition must be a \`bool\`. C# has no truthiness, so these do not compile:

    if (count) { }         // CS0029: cannot convert int to bool
    if (x = 5) { }         // CS0029 too — the assignment bug from C is caught for ints

Always use braces. Without them only the next statement belongs to the \`if\`:

    if (balance < 0)
        Console.WriteLine("Overdrawn");
        Fine(balance);                 // runs every time — indentation is ignored

## The switch statement

    switch (day)
    {
        case 1:
        case 7:
            Console.WriteLine("Weekend");
            break;
        case 2:
            Console.WriteLine("Monday");
            break;
        default:
            Console.WriteLine("Weekday");
            break;
    }

- Stacked empty labels (\`case 1: case 7:\`) share one body.
- A non-empty section must **not fall through** to the next: forgetting \`break\` is a compile
  error, **CS0163**, not a silent bug as in C or Java. End a section with \`break\`, \`return\`,
  \`throw\`, or \`goto case 2;\` if you truly want to continue.
- \`switch\` works on integers, chars, strings, enums, and — with patterns — any type.

## Switch expressions (C# 8+)

When each branch only produces a value, a **switch expression** is shorter:

    string grade = marks switch
    {
        >= 90 => "A",              // relational patterns: C# 9+
        >= 75 => "B",
        >= 60 => "C",
        _     => "F"               // _ is the discard: "anything else"
    };

    string kind = code switch
    {
        "GET" or "HEAD" => "read",  // 'or' patterns: C# 9+
        "POST"          => "create",
        _               => "other"
    };

Arms are tried top to bottom, so order matters: put \`>= 90\` before \`>= 60\`. If no arm matches,
the compiler warns (CS8509) and a \`SwitchExpressionException\` is thrown at run time — so end with
\`_\`.

## Simple pattern matching

    object value = 42;
    if (value is int n && n > 0)            // type pattern with a declaration (C# 7)
        Console.WriteLine(n * 2);

    if (name is null) { }                   // null check that cannot be fooled by an overloaded ==
    if (name is not null) { }               // C# 9+

    string category = age switch
    {
        < 13 => "child",
        >= 13 and < 20 => "teen",           // 'and' patterns: C# 9+
        _ => "adult"
    };

## Choosing

Use \`if\`/\`else if\` for ranges and unrelated conditions, a \`switch\` statement when each case does
several things, and a switch expression when each case just picks a value.`,
    workedExample: `**Problem.** Map a delivery distance (km) to a fee: up to 5 km free, up to 15 km ₹40, up to
30 km ₹80, beyond that "not serviceable". Distance is non-negative.

First version, with \`if\`:

    static string Fee(int km)
    {
        if (km <= 5) return "0";
        else if (km <= 15) return "40";
        else if (km <= 30) return "80";
        else return "not serviceable";
    }

Because each test runs only when the earlier ones failed, \`km <= 15\` already means "between 6 and
15" — no need for \`km > 5 && km <= 15\`.

Modern version, a switch expression (C# 9 relational patterns):

    static string Fee(int km) => km switch
    {
        <= 5  => "0",
        <= 15 => "40",
        <= 30 => "80",
        _     => "not serviceable"
    };

Trace it: \`Fee(5)\` → first arm → "0". \`Fee(16)\` → skips \`<= 5\` and \`<= 15\` → "80". \`Fee(31)\` →
"not serviceable". Swap the first two arms and the compiler reports **CS8510** ("the pattern has
already been handled") for the \`<= 5\` arm — it can see that \`<= 15\` covers it. Order is the
logic.`,
    mcqs: [
      mcq('A switch section ends without break: case 1: Console.Write("one"); case 2: ... What happens?',
        [['Compile error CS0163: control cannot fall through', true], ['It prints "one" and then runs the case 2 code as well', false], ['It prints "one" and then leaves the switch quietly', false], ['A warning only; the program falls through at run time', false]],
        'C# forbids implicit fall-through from a section that has statements. End it with break, return, throw or an explicit goto case.'),
      mcq('int stock = 0; if (stock) Console.Write("in stock"); — what happens?',
        [['Compile error: an int cannot be used as a bool condition', true], ['It prints nothing, because 0 counts as false', false], ['It prints "in stock", because stock has a value', false], ['A run-time InvalidCastException on the if line', false]],
        'C# has no truthiness. An if condition must be of type bool, so write if (stock > 0).'),
      mcq('With the grade switch expression ordered >= 60 => "C", >= 90 => "A", _ => "F", what is the grade for 95?',
        [['It does not compile: the >= 90 arm is already covered', true], ['"A", because the best-matching arm is chosen', false], ['"C", and the code compiles with no complaint', false], ['"F", because two arms match and the discard wins', false]],
        'Arms are tested top to bottom, and >= 60 already covers every value >= 90. The compiler detects the unreachable arm and reports CS8510.'),
    ],
    checkpoint: [
      mcq('int t = 35; string s = t > 30 ? "hot" : t > 20 ? "warm" : "cool"; — what is s?',
        [['"hot"', true], ['"warm"', false], ['"cool"', false], ['It does not compile', false]],
        'The conditional operator nests to the right: t > 30 is true, so "hot" is chosen and the inner ?: is never evaluated.'),
      mcq('Which switch statement section is legal C#?',
        [['case "A": case "B": Console.Write("top"); break;', true], ['case "A": Console.Write("top"); case "B": break;', false], ['case "A" | "B": Console.Write("top")', false], ['case "A", "B" -> Console.Write("top");', false]],
        'Stacked empty labels may share a body that ends in break. The second option falls through (CS0163); the last two are not C# switch-statement syntax.'),
      mcq('object o = "42"; if (o is int n) Console.Write(n + 1); else Console.Write("no"); — output?',
        [['no', true], ['43', false], ['421', false], ['It throws InvalidCastException', false]],
        'The type pattern checks the run-time type. o holds a string, not an int, so the pattern fails without throwing and the else branch runs.'),
    ],
  },
  {
    unitCode: 'JT_CS_BASICS_LOOPS',
    notes: `## for — when you know the count

    for (int i = 0; i < 5; i++)
    {
        Console.Write(i + " ");            // 0 1 2 3 4
    }
    // Console.WriteLine(i);               // CS0103: i exists only inside the loop

The three parts — initialiser, condition, iterator — can be anything:

    for (int i = 10; i > 0; i /= 2) Console.Write(i + " ");   // 10 5 2 1
    for (int k = 0; k < 10; k += 3) { }                        // k is 0, 3, 6, 9; it stops at 12

## while and do-while — when you don't

    string line;
    while ((line = Console.ReadLine()) != null)      // condition tested before each pass
    {
        Console.WriteLine(line.ToUpper());
    }

    int choice;
    do                                               // body runs at least once
    {
        Console.Write("1-3: ");
    } while (!int.TryParse(Console.ReadLine(), out choice) || choice < 1 || choice > 3);

A \`while\` whose condition is false at the start never runs; a \`do-while\` always runs once.

## foreach — for every element

    int[] marks = { 72, 85, 64 };
    int sum = 0;
    foreach (int m in marks) sum += m;               // 221
    foreach (char c in "abc") Console.Write(c);      // strings are sequences of chars

\`foreach\` is read-only with respect to the loop variable: \`m = 0;\` inside is **CS1656**. And
you must not add to or remove from a \`List<T>\` while \`foreach\`-ing over it — the next step throws
\`InvalidOperationException: Collection was modified\`. Loop over a copy, or use a \`for\` loop
running backwards when removing.

## break and continue

    for (int i = 0; i < 10; i++)
    {
        if (i % 2 == 0) continue;     // skip the rest of this pass; the iterator i++ still runs
        if (i > 7) break;             // leave the loop entirely
        Console.Write(i + " ");       // 1 3 5 7
    }

\`break\` leaves only the **innermost** loop. To leave nested loops, put them in a method and
\`return\`, or use a flag.

## Nested loops

    for (int r = 1; r <= 3; r++)
    {
        for (int c = 1; c <= r; c++) Console.Write("*");
        Console.WriteLine();
    }
    // *
    // **
    // ***

Count the work: an inner loop that runs \`r\` times for \`r\` from 1 to n does n(n+1)/2 steps —
that is O(n²), and it is what a "nested loops" interview question is probing.

## Classic loop bugs

- **Off by one:** \`for (int i = 0; i <= arr.Length; i++)\` reads \`arr[arr.Length]\` and throws
  \`IndexOutOfRangeException\`.
- **The stray semicolon:** \`for (int i = 0; i < 3; i++); { ... }\` — the loop body is the empty
  statement and the block runs once. The compiler warns: CS0642, "possible mistaken empty
  statement".
- **No progress:** a \`while (i < 10)\` that never changes \`i\` runs forever.
- **Overflowing accumulators:** 13! no longer fits in an \`int\`; use \`long\` (20! fits).`,
    mcqs: [
      mcq('What does for (int i = 1; i < 20; i *= 3) Console.Write(i + " "); print?',
        [['1 3 9 ', true], ['1 3 9 27 ', false], ['3 9 ', false], ['1 4 7 10 13 16 19 ', false]],
        'i takes 1, 3 and 9; the next value, 27, fails i < 20, so the loop stops. i *= 3 multiplies rather than adds.'),
      mcq('int n = 0; do { n++; } while (n > 5); Console.Write(n); — what is printed?',
        [['1', true], ['0', false], ['6', false], ['The loop never ends', false]],
        'A do-while runs its body before testing the condition, so n becomes 1; then 1 > 5 is false and the loop ends.'),
      mcq('Inside foreach (int m in marks) you write m = m + 5;. What happens?',
        [['Compile error CS1656: the iteration variable is read-only', true], ['Every element of the marks array is increased by 5', false], ['Only the local copy changes; the array stays as it was', false], ['InvalidOperationException: the collection was modified', false]],
        'The foreach iteration variable cannot be assigned. To change elements, loop with for and write marks[i] += 5.'),
    ],
    checkpoint: [
      mcq('int sum = 0; for (int i = 0; i < 6; i++) { if (i == 4) break; if (i % 2 == 1) continue; sum += i; } — sum?',
        [['2', true], ['6', false], ['0', false], ['9', false]],
        'i = 0 adds 0; 1 is skipped; 2 adds 2; 3 is skipped; at i = 4 the loop breaks. So sum is 0 + 2 = 2.'),
      mcq('How many stars does for (int i = 0; i < 4; i++) for (int j = 0; j < i; j++) Console.Write("*"); print?',
        [['6', true], ['16', false], ['4', false], ['10', false]],
        'The inner loop runs i times for i = 0, 1, 2 and 3: 0 + 1 + 2 + 3 = 6 stars.'),
      mcq('Removing failed students with foreach (var s in list) if (s.Failed) list.Remove(s); throws. Which fix works?',
        [['Loop with for from the last index down to 0 and RemoveAt', true], ['Replace foreach with a while (true) loop over the list', false], ['Wrap the Remove call in a try/catch block and continue', false], ['Call list.Remove twice, so the indexes realign themselves', false]],
        'Changing a List during foreach invalidates the enumerator. Walking indexes backwards means a removal never shifts an element you have yet to visit. (list.RemoveAll(s => s.Failed) also works.)'),
    ],
  },
  {
    unitCode: 'JT_CS_BASICS_ARRAYS',
    notes: `An array is a fixed-size block of elements of one type. Its size is set when it is created and
never changes.

## Creating

    int[] marks = new int[5];                 // five zeros
    string[] names = new string[3];           // three nulls
    bool[] seen = new bool[4];                // four falses
    int[] primes = { 2, 3, 5, 7 };            // size 4, from the initialiser
    var days = new[] { "Mon", "Tue" };        // string[] inferred
    int[] squares = new int[] { 1, 4, 9 };

Elements start at the type's **default**: 0, false, '\\0', or null for reference types.

## Using

    marks[0] = 72;
    Console.WriteLine(marks.Length);          // 5 — a property, no parentheses
    Console.WriteLine(marks[5]);              // IndexOutOfRangeException: valid indexes are 0..4
    Console.WriteLine(primes[^1]);            // 7 — index from the end, C# 8+
    int[] middle = primes[1..3];              // { 3, 5 } — a range copies, end exclusive, C# 8+

    Console.WriteLine(primes);                // System.Int32[] — not the contents!
    Console.WriteLine(string.Join(", ", primes));   // 2, 3, 5, 7

## The Array class

    int[] a = { 5, 3, 8, 1 };
    Array.Sort(a);                            // a is now { 1, 3, 5, 8 }
    Array.Reverse(a);                         // { 8, 5, 3, 1 }
    int pos = Array.IndexOf(a, 3);            // 2; -1 when absent
    int bs = Array.BinarySearch(new[] { 1, 3, 5 }, 5);   // 2 — needs a sorted array
    Array.Resize(ref a, 6);                   // a new array of 6 with the old values copied
    int[] copy = (int[])a.Clone();            // a separate (shallow) copy

## Arrays are reference types

    int[] x = { 1, 2, 3 };
    int[] y = x;              // y refers to the SAME array
    y[0] = 99;
    Console.WriteLine(x[0]);  // 99

    int[] z = { 1, 2, 3 };
    Console.WriteLine(x == z);         // False — different arrays, even with equal contents
    Console.WriteLine(z.SequenceEqual(new[] { 1, 2, 3 }));   // True — needs using System.Linq

## Multidimensional (rectangular) arrays: int[,]

    int[,] grid = new int[3, 4];              // 3 rows, 4 columns, all zero
    grid[1, 2] = 7;
    Console.WriteLine(grid.Length);           // 12 — total elements
    Console.WriteLine(grid.GetLength(0));     // 3 — rows
    Console.WriteLine(grid.GetLength(1));     // 4 — columns

    int[,] m = { { 1, 2, 3 }, { 4, 5, 6 } };
    for (int r = 0; r < m.GetLength(0); r++)
    {
        for (int c = 0; c < m.GetLength(1); c++) Console.Write(m[r, c] + " ");
        Console.WriteLine();
    }

## Jagged arrays: int[][]

An array of arrays; each row can have its own length.

    int[][] rows = new int[3][];              // three rows, each null for now
    rows[0] = new[] { 1 };
    rows[1] = new[] { 2, 3, 4 };
    rows[2] = new int[0];
    Console.WriteLine(rows[1].Length);        // 3
    Console.WriteLine(rows[1][2]);            // 4 — note [1][2], not [1, 2]

Reading \`rows[0][0]\` before \`rows[0]\` is assigned throws \`NullReferenceException\`.

## When not to use an array

When the number of items is unknown — reading until input ends, adding as you go — use
\`List<int>\` (covered in Collections). Arrays fit fixed-size data: the days of the week, a grid, a
buffer, the input of a coding problem whose size \`n\` is given first.`,
    mcqs: [
      mcq('string[] cities = new string[3]; Console.WriteLine(cities[0].Length); — what happens?',
        [['NullReferenceException: the elements start as null', true], ['It prints 0, because the elements start as ""', false], ['IndexOutOfRangeException, since the array is empty', false], ['A compile error: cities[0] was never assigned', false]],
        'A new array of a reference type is filled with null. Reading Length on null throws NullReferenceException.'),
      mcq('int[,] seats = new int[4, 6]; — what are seats.Length and seats.GetLength(1)?',
        [['24 and 6', true], ['4 and 6', false], ['6 and 4', false], ['24 and 4', false]],
        'Length counts every element of a rectangular array (4 × 6 = 24). GetLength(1) is the size of the second dimension, 6.'),
      mcq('int[] a = { 4, 2 }; int[] b = a; b[1] = 9; Console.WriteLine(a[1]); — what is printed?',
        [['9', true], ['2', false], ['0', false], ['4', false]],
        'Arrays are reference types. b = a copies the reference, so both names refer to one array and the change shows through a.'),
    ],
    checkpoint: [
      mcq('int[] scores = { 3, 9, 4 }; Console.WriteLine(scores); — what is printed?',
        [['System.Int32[]', true], ['3, 9, 4', false], ['{ 3, 9, 4 }', false], ['394', false]],
        'Arrays do not override ToString, so WriteLine prints the type name. Use string.Join(", ", scores) to print the elements.'),
      mcq('int[][] tri = new int[3][]; Console.WriteLine(tri[2].Length); — what happens?',
        [['NullReferenceException: row 2 was never created', true], ['It prints 0, because every row starts out empty', false], ['It prints 3, the length of the outer array', false], ['A compile error: the row size is missing', false]],
        'new int[3][] creates only the outer array, whose three elements are null. Each row must be created with new int[n] before use.'),
      mcq('int[] v = { 7, 1, 5 }; Array.Sort(v); Console.Write(Array.IndexOf(v, 7)); — output?',
        [['2', true], ['0', false], ['-1', false], ['3', false]],
        'Array.Sort sorts in place, so v becomes { 1, 5, 7 } and 7 is now at index 2.'),
    ],
  },
  {
    unitCode: 'JT_CS_BASICS_STRINGS',
    notes: `\`string\` (an alias of \`System.String\`) is a reference type holding immutable UTF-16 text.
Three facts drive most string questions in C#: strings are **immutable**, \`==\` compares
**contents**, and \`Substring\` takes a **start and a length**.

## Immutable

    string city = "pune";
    city.ToUpper();                    // returns "PUNE" — and the result is thrown away
    Console.WriteLine(city);           // pune
    city = city.ToUpper();             // keep the new string
    // city[0] = 'P';                  // CS0200: the indexer is read-only

No string method changes the string it is called on; each returns a new one.

## == compares contents (unlike Java)

    string a = "admin";
    string b = Console.ReadLine();     // user types admin
    Console.WriteLine(a == b);         // True — string overloads == to compare characters
    Console.WriteLine(a.Equals(b));    // True
    Console.WriteLine(string.Equals("Admin", b, StringComparison.OrdinalIgnoreCase)); // True

\`==\` on two \`string\` variables compares text. (Cast both to \`object\` and \`==\` compares
references again — a reason to keep variables typed as \`string\`.)

Ordering: \`string.Compare(x, y, StringComparison.Ordinal)\` compares character codes, so
uppercase sorts before lowercase. \`"abc".CompareTo("abd")\` is negative.

## The methods you will use daily

    string s = "  Career Pilot  ";
    s.Trim()                     // "Career Pilot"   (TrimStart, TrimEnd too)
    string t = "CareerPilot";
    t.Length                     // 11 — a property: t.Length() is CS1955
    t[0]                         // 'C'
    t.IndexOf("Pilot")           // 6;   -1 when absent
    t.IndexOf('r', 3)            // 5 — the search starts at index 3
    t.LastIndexOf('e')           // 4
    t.Substring(6)               // "Pilot"
    t.Substring(0, 6)            // "Career" — (start, LENGTH), not (start, end)
    t.Contains("eer")            // True
    t.StartsWith("Car")          // True
    t.Replace("e", "3")          // "Car33rPilot"
    t.ToLower()                  // "careerpilot"
    t.Remove(1, 4)               // "CrPilot" — remove 4 characters from index 1
    t.Insert(6, " ")             // "Career Pilot"
    "7".PadLeft(3, '0')          // "007"
    new string('-', 5)           // "-----"
    string.IsNullOrWhiteSpace("  ")   // True
    string.Join("|", new[] { "a", "b" })   // "a|b"

\`Substring(start, length)\` throws \`ArgumentOutOfRangeException\` if it runs past the end:
\`"abc".Substring(2, 2)\` throws, while \`"abc".Substring(3)\` is \`""\`.

## Split

    "a,b,,c".Split(',')                    // ["a", "b", "", "c"]
    "a,b,".Split(',')                      // ["a", "b", ""] — C# keeps the trailing empty entry
    "  hi   there ".Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries)
                                           // ["hi", "there"]

## Building strings

    string name = "Asha"; int age = 21; double cgpa = 8.456;
    string s1 = "Name: " + name + ", age " + age;
    string s2 = string.Format("Name: {0}, CGPA {1:F2}", name, cgpa);
    string s3 = $"Name: {name}, CGPA {cgpa:F2}, next year {age + 1}";   // C# 6+
    string path = @"C:\\new\\tab";          // verbatim: backslashes are literal (length 10)
    string json = """{"id": 1}""";         // raw string literal, C# 11+

Concatenating \`null\` is safe: \`"a" + null\` is \`"a"\`.

## StringBuilder for loops

    string slow = "";
    for (int i = 0; i < 10000; i++) slow += i;      // copies the whole string every pass: O(n²)

    var sb = new StringBuilder();                    // using System.Text;
    for (int i = 0; i < 5; i++) sb.Append(i).Append(',');
    sb.Length--;                                     // drop the last comma
    Console.WriteLine(sb.ToString());                // 0,1,2,3,4

\`StringBuilder\` keeps one growable buffer and appends in place. Use it when building a string in a
loop; for joining a handful of pieces, \`+\` or interpolation is fine and clearer.

## Characters

    foreach (char ch in "Hello")
        if (char.IsUpper(ch)) Console.Write(ch);     // H
    int digit = '7' - '0';                           // 7
    char next = (char)('a' + 1);                     // 'b'
    char[] chars = "level".ToCharArray();
    Array.Reverse(chars);
    string back = new string(chars);                 // "level"`,
    workedExample: `**Problem.** Turn "  priya   SHARMA  " into "Priya Sharma" — trim, collapse spaces, and
capitalise each word.

    static string Capitalise(string word)
    {
        if (word.Length == 0) return word;
        return char.ToUpper(word[0]) + word.Substring(1).ToLower();
    }

    static string CleanName(string raw)
    {
        string[] words = raw.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
        for (int i = 0; i < words.Length; i++)
            words[i] = Capitalise(words[i]);
        return string.Join(" ", words);
    }

1. \`Split\` with \`RemoveEmptyEntries\` gives \`["priya", "SHARMA"]\` — the leading, trailing and
   repeated spaces disappear, so no separate \`Trim\` is needed.
2. \`Capitalise("SHARMA")\`: \`char.ToUpper('S')\` is \`'S'\`; \`"HARMA".ToLower()\` is \`"harma"\`.
   \`char + string\` is string concatenation, giving \`"Sharma"\`.
3. \`string.Join(" ", ...)\` puts exactly one space between words.
4. Edge cases: an all-space input gives an empty array and \`Join\` returns \`""\`; a one-letter word
   like \`"a"\` gives \`"A"\` because \`"a".Substring(1)\` is \`""\`, not an error.

Note the trap avoided: \`char.ToUpper(word[0]) + char.ToUpper(word[1])\` would add two char codes and
produce a number. At least one operand must be a string for \`+\` to concatenate.`,
    mcqs: [
      mcq('What does "Hyderabad".Substring(2, 4) return?',
        [['"dera"', true], ['"de"', false], ['"derab"', false], ['"yder"', false]],
        'The second argument is a length, not an end index: four characters starting at index 2 — d, e, r, a.'),
      mcq('string entered = Console.ReadLine(); /* user types yes */ Console.WriteLine(entered == "yes"); — output?',
        [['True', true], ['False — == compares references, not text', false], ['False — ReadLine keeps the newline at the end', false], ['It does not compile', false]],
        'In C#, string overloads == to compare characters, so a string read at run time equals an identical literal. ReadLine strips the line terminator.'),
      mcq('What is "x;y;;z;".Split(\';\').Length?',
        [['5', true], ['4', false], ['3', false], ['6', false]],
        'The pieces are "x", "y", "", "z" and a trailing "". Unlike Java, C# keeps trailing empty entries unless you pass RemoveEmptyEntries.'),
    ],
    checkpoint: [
      mcq('string code = "abc"; code[0] = \'X\'; — what happens?',
        [['Compile error: the string indexer is read-only', true], ['code becomes "Xbc", as a char array would', false], ['IndexOutOfRangeException at run time', false], ['code is unchanged, but it does compile', false]],
        'Strings are immutable, so the indexer has only a getter (CS0200). Build a new string, for example "X" + code.Substring(1).'),
      mcq('What does "  data  science ".Trim().Split(\' \').Length return?',
        [['3', true], ['2', false], ['4', false], ['6', false]],
        'Trim removes only the outer spaces, leaving "data  science". The two spaces in the middle produce an empty entry: "data", "", "science".'),
      mcq('Why use StringBuilder to build a 50,000-line report inside a loop?',
        [['String += copies all earlier text on every pass', true], ['String cannot hold more than 32,767 characters', false], ['StringBuilder output is thread-safe by default', false], ['+= does not compile inside a for loop body', false]],
        'Strings are immutable, so each += allocates a new string containing everything so far — quadratic work. StringBuilder appends into one buffer.'),
    ],
  },
  {
    unitCode: 'JT_CS_BASICS_METHODS',
    notes: `## Defining and calling

    static int Square(int x)
    {
        return x * x;
    }

    static void Greet(string name)
    {
        Console.WriteLine("Hello, " + name);
    }

    static double Average(int[] values) => values.Length == 0 ? 0 : (double)values.Sum() / values.Length;
                                           // expression-bodied method (C# 6+); Sum needs System.Linq

A method has an access modifier (default \`private\`), \`static\` or not, a return type (\`void\` for
none), a name in PascalCase, and parameters. Every path of a non-void method must return a value
(CS0161 otherwise).

**static and instance.** \`Main\` is \`static\`; it can call other \`static\` methods directly. Calling
an instance method from \`Main\` without an object is **CS0120**: "An object reference is required".
Until the OOP topic, make helper methods \`static\`.

## What gets passed: copies

C# passes arguments **by value** by default — the method gets a copy of the variable.

    static void Bump(int n) { n++; }
    int score = 5;
    Bump(score);
    Console.WriteLine(score);          // 5 — Bump changed its own copy

For a **reference type**, the copy is a copy of the *reference*. Both refer to one object, so
changes to the object are visible; reassigning the parameter is not:

    static void Zero(int[] a) { a[0] = 0; }          // changes the caller's array
    static void Replace(int[] a) { a = new int[] { 0 }; }   // only rebinds the local copy
    static void Shout(string s) { s = s + "!"; }     // strings are immutable: caller unchanged

## ref, out and in

    static void Bump(ref int n) { n++; }
    int score = 5;
    Bump(ref score);                   // score is now 6 — ref at the call site too

    static bool TryDivide(int a, int b, out int result)
    {
        if (b == 0) { result = 0; return false; }
        result = a / b;
        return true;
    }
    if (TryDivide(10, 3, out int q)) Console.WriteLine(q);   // 3

- \`ref\`: the caller's variable itself is passed. It must be **assigned before the call**
  (CS0165 otherwise); the method may read and change it.
- \`out\`: the method **must assign** it before returning (CS0177); the caller need not initialise
  it. It is how \`int.TryParse\` returns two things.
- \`in\` (C# 7.2): passed by reference but read-only — for large structs.

## params, optional and named arguments

    static int Sum(params int[] nums)
    {
        int t = 0;
        foreach (int n in nums) t += n;
        return t;
    }
    Sum(1, 2, 3);       // 6
    Sum();              // 0 — nums is an empty array, not null

    static string Label(string name, string prefix = "Ms.", bool upper = false)
        => upper ? (prefix + " " + name).ToUpper() : prefix + " " + name;
    Label("Rao");                      // "Ms. Rao"
    Label("Rao", upper: true);         // "MS. RAO" — named argument skips prefix

Optional parameters must come after the required ones (CS1737), and their defaults must be
compile-time constants. \`params\` must be the last parameter.

## Overloading

Several methods may share a name if their **parameter lists** differ:

    static void Show(int x)    => Console.WriteLine("int");
    static void Show(long x)   => Console.WriteLine("long");
    static void Show(double x) => Console.WriteLine("double");

    Show(5);       // int
    Show(5L);      // long
    Show(5f);      // double — float widens to double; there is no float overload
    Show('a');     // int — char converts implicitly to int

The compiler picks the most specific match at compile time. A different **return type alone** is
not an overload: two \`F()\` methods returning \`int\` and \`long\` is CS0111.

## Local functions and recursion

    static long Factorial(int n)
    {
        if (n <= 1) return 1;          // base case
        return n * Factorial(n - 1);
    }

C# 7 also allows a **local function** — a method declared inside another method, visible only
there. Deep recursion (tens of thousands of calls) overflows the stack, and a
\`StackOverflowException\` cannot be caught — it kills the process.`,
    mcqs: [
      mcq('static void Reset(int[] a) { a = new int[3]; } is called as Reset(data). What happens to data?',
        [['Nothing — only Reset\'s copy of the reference is reassigned', true], ['data becomes a new array of three zeros', false], ['data becomes null, because the old array is freed', false], ['A compile error: an array parameter needs ref', false]],
        'The reference is passed by value. Assigning a new array to a rebinds the local parameter; the caller\'s variable still refers to the original array.'),
      mcq('Overloads Show(long) and Show(double) exist, but no Show(int). Which runs for Show(7)?',
        [['Show(long), the better implicit conversion', true], ['Show(double), since it can hold any number', false], ['Neither — it fails to compile as ambiguous', false], ['Show(double), chosen because it is declared later', false]],
        'Both conversions are implicit, but int to long is better than int to double because long converts implicitly to double and not the reverse. So Show(long) wins.'),
      mcq('static void Load(out int count) { if (ready) count = 10; } — what does the compiler say?',
        [['CS0177: count must be assigned on every path', true], ['Nothing: out parameters may stay unassigned', false], ['CS0165: count is used before assignment', false], ['CS0120: an object reference is required', false]],
        'An out parameter must be definitely assigned before the method returns on every path. When ready is false, count is never set.'),
    ],
    checkpoint: [
      mcq('int marks = 40; AddGrace(ref marks); with static void AddGrace(ref int m) { m += 5; } — marks?',
        [['45', true], ['40', false], ['5', false], ['It does not compile', false]],
        'ref passes the caller\'s variable itself, so m += 5 changes marks. The ref keyword is required at both the declaration and the call.'),
      mcq('Which declaration does NOT compile?',
        [['static void Book(int seats = 1, string name)', true], ['static void Book(string name, int seats = 1)', false], ['static void Book(string name, params int[] seats)', false], ['static void Book(out int id, string name)', false]],
        'Optional parameters must follow all required ones (CS1737). The others are legal; an out parameter may appear in any position.'),
      mcq('static int Count(params string[] tags) => tags.Length; — what does Count() return?',
        [['0', true], ['It throws NullReferenceException', false], ['1', false], ['It does not compile', false]],
        'Calling a params method with no arguments passes an empty array, never null, so Length is 0.'),
    ],
  },
  {
    unitCode: 'JT_CS_BASICS_DEBUGGING',
    notes: `Fundamentals bugs are small and repeatable. Each fault below is one you will meet in your first
coding round in C#; learn the symptom so the cause comes to mind at once.

## 1. Integer division hiding in an average

    int total = 250, count = 3;
    double avg = total / count;              // 83

**Symptom:** the average is always a whole number. **Cause:** int / int is computed before the
assignment widens it. **Fix:** \`(double)total / count\`.

## 2. Silent overflow

    int fee = 49999, students = 50000;
    long total = fee * students;             // -1795017296

**Symptom:** a negative or impossibly small total. **Cause:** the multiplication runs in int and
wraps. **Fix:** \`(long)fee * students\`; use \`checked\` in tests to make it throw instead.

## 3. Off by one in a loop

    for (int i = 0; i <= marks.Length; i++) sum += marks[i];

**Symptom:** \`IndexOutOfRangeException: Index was outside the bounds of the array.\` **Cause:**
the last valid index is \`Length - 1\`. **Fix:** \`i < marks.Length\`, or \`foreach\`.

## 4. The discarded string result

    string code = " ab12 ";
    code.Trim();
    code.ToUpper();
    if (code == "AB12") ...                  // never true

**Symptom:** the comparison fails though the values "look" right. **Cause:** strings are
immutable; both results were thrown away. **Fix:** \`code = code.Trim().ToUpper();\`.

## 5. Substring with an end index

    string pan = "ABCDE1234F";
    string digits = pan.Substring(5, 9);     // ArgumentOutOfRangeException

**Symptom:** \`ArgumentOutOfRangeException: Index and length must refer to a location within the
string.\` **Cause:** the second argument is a length (Java and Python habits say "end"). **Fix:**
\`pan.Substring(5, 4)\` — "1234".

## 6. The null that arrived from outside

    string city = GetCityOrNull();
    if (city.Length > 0) ...                 // NullReferenceException

**Symptom:** \`NullReferenceException: Object reference not set to an instance of an object.\`
**Cause:** a member was used on null. **Fix:** check first — \`if (!string.IsNullOrEmpty(city))\`
— or \`city?.Length ?? 0\`. With nullable reference types on, the compiler's CS8602 warning pointed
at this line before you ran anything.

## 7. A method that "does nothing"

    static void Double(int x) { x = x * 2; }
    int n = 4; Double(n);                    // n is still 4

**Symptom:** the caller's value never changes. **Cause:** value parameters are copies. **Fix:**
return the result (\`n = Doubled(n);\`) — clearer than \`ref\`.

## 8. The loop that runs once

    for (int i = 0; i < 5; i++);
    {
        Console.WriteLine("tick");           // printed once
    }

**Symptom:** the body runs once regardless of the count. **Cause:** the \`;\` after the \`for\` is
the whole loop body. **Fix:** delete it — and read warning **CS0642** next time.

## The method

Reproduce with the smallest input. Read the exception type, its message, and the first stack frame
in your file. Put a breakpoint one line earlier and inspect the values — or use the Immediate
Window to evaluate \`total / count\` and \`(double)total / count\` side by side. Change one thing,
re-run, and compare.`,
    mcqs: [
      mcq('for (int i = 1; i <= nums.Length; i++) sum += nums[i]; throws. Which change fixes it?',
        [['Loop i from 0 while i < nums.Length', true], ['Loop i from 1 while i < nums.Length', false], ['Loop i from 0 while i <= nums.Length', false], ['Catch the exception, then keep the old bounds', false]],
        'Valid indexes run from 0 to Length - 1. Starting at 1 also skips the first element, and <= Length reads one past the end.'),
      mcq('string s = " ok "; s.Trim(); Console.Write(s.Length); — what is printed, and why?',
        [['4 — Trim returned a new string that was never kept', true], ['2 — Trim removed both spaces from s itself', false], ['3 — Trim removes only the leading space', false], ['0 — s is cleared by Trim when it is called', false]],
        'String methods never modify the string they are called on. Assign the result: s = s.Trim(); then Length is 2.'),
      mcq('An exception says "Index and length must refer to a location within the string". Which call is the likely cause?',
        [['Substring with an end index passed as the length', true], ['Split called with a separator that is not found', false], ['IndexOf searching for a character that is missing', false], ['Replace called on an empty string literal', false]],
        'That ArgumentOutOfRangeException message comes from Substring when start + length passes the end. IndexOf returns -1 and Split returns one piece rather than throwing.'),
      mcq('A method static void AddTax(decimal amount) { amount *= 1.18m; } leaves the bill unchanged. What is the cleanest fix?',
        [['Return the new value: static decimal WithTax(decimal amount)', true], ['Declare the amount parameter static so it is shared', false], ['Change decimal to double, because double is a reference type', false], ['Call the method twice so that the change persists', false]],
        'decimal is a value type passed by copy. Returning the result makes the data flow obvious; ref would also work but hides the change at the call site.'),
    ],
  },
  {
    unitCode: 'JT_CS_BASICS_PRACTICE',
    notes: `Write each of these from an empty \`class Program\` with a classic \`Main\`, reading from
standard input, before looking anything up.

## Exercise 1 — Number facts

Read an integer and print whether it is positive, negative or zero; even or odd; and how many
digits it has (\`-305\` has 3, \`0\` has 1). Test \`-7\` — \`n % 2 == 1\` gets it wrong.

## Exercise 2 — FizzBuzz with a switch expression

For 1 to n print Fizz, Buzz, FizzBuzz or the number, choosing with
\`(i % 3, i % 5) switch { (0, 0) => "FizzBuzz", (0, _) => "Fizz", (_, 0) => "Buzz", _ => i.ToString() }\`
(a tuple pattern, C# 8+). Then write it again with plain \`if\`s for a C# 7 grader.

## Exercise 3 — Second largest

Read n numbers into an \`int[]\` and print the second-largest **distinct** value, or \`NONE\`. One
pass, two variables, no sorting. Inputs to try: \`5 5 5\`, \`-1 -2\`, \`int.MinValue\` itself.

## Exercise 4 — Rotate an array

Read n, the array and k, and rotate it right by k (k may exceed n). Do it with a second array first,
then in place with three \`Array.Reverse\` calls.

## Exercise 5 — Character counts

Read a line and print how many letters, digits, spaces and other characters it has, using
\`char.IsLetter\`, \`char.IsDigit\` and \`char.IsWhiteSpace\` in a \`foreach\`.

## Exercise 6 — Methods with ref and out

Write \`static void MinMax(int[] a, out int min, out int max)\` and
\`static void Swap(ref int x, ref int y)\`, and call both from \`Main\`. What must \`MinMax\` do
when the array is empty?

The graded exercise below combines strings, arrays, loops and two helper methods — and its hidden
tests are mostly edge cases.`,
    mcqs: [
      mcq('In Exercise 3, why must the "largest so far" variable not start at 0?',
        [['With all-negative input, 0 would wrongly win', true], ['C# does not allow an int to start at 0 in a loop', false], ['0 would make the loop skip the first element', false], ['Starting at 0 makes the comparison throw an exception', false]],
        'Initialise from a real element (or int.MinValue with care). If every number is negative, a starting value of 0 is larger than all of them and is never replaced.'),
      mcq('What does (char)(\'a\' + 2) produce, and what does \'a\' + 2 produce?',
        [['\'c\' and the int 99', true], ['"a2" and the int 99', false], ['\'c\' and the string "c"', false], ['The int 99 for both of them', false]],
        'char + int is int arithmetic, giving 99. Casting back to char gives \'c\'. No string is involved unless one operand is a string.'),
      mcq('Rotating right by k when k may be larger than n: what should you do first?',
        [['Set k = k % n so the extra full turns are dropped', true], ['Loop k times, moving the array by one place each time', false], ['Throw an exception whenever k is larger than n', false], ['Set k = n - k, then rotate to the left by k', false]],
        'Rotating by n gives the same array, so only k % n matters. Rotating one step at a time is O(n·k) and slow; n - k without the modulo can go negative.'),
      mcq('char.IsLetterOrDigit(\'_\') returns what?',
        [['False', true], ['True', false], ['It throws ArgumentException', false], ['It does not compile', false]],
        'An underscore is punctuation, not a letter or a digit, so the method returns false — even though identifiers may contain it.'),
      mcq('Inside a static Main, you call an instance method Count(line) defined in the same class. What happens?',
        [['Compile error CS0120: an object reference is required', true], ['It runs, since methods in one class can always call each other', false], ['It runs, but a NullReferenceException may follow', false], ['The compiler makes Count static automatically', false]],
        'A static method has no this, so it cannot call an instance method without an object. Mark the helper static, or create an instance.'),
    ],
    assignment: {
      title: 'Sentence Statistics',
      description: 'Read one line of text and report the word count, the longest word, the words in reverse order, a capitalised version, and how many words are palindromes.',
      instructions: `Write a program that reads **one line** of text and prints five lines:

    Words: <number of words>
    Longest: <the longest word; the first one on a tie; - if there are no words>
    Reversed: <the words in reverse order, one space between them>
    Capitalised: <each word with its first letter upper case and the rest lower case>
    Palindromes: <how many words of length 2 or more read the same backwards, ignoring case>

Words are separated by one or more spaces, and the line may start or end with spaces.

**Example.** For the input

    Madam Arora teaches level maths

the output is

    Words: 5
    Longest: teaches
    Reversed: maths level teaches Arora Madam
    Capitalised: Madam Arora Teaches Level Maths
    Palindromes: 3

For \`  the   QUICK brown  fox  \` the output is \`Words: 4\`, \`Longest: QUICK\` (it ties with
"brown" and comes first), \`Reversed: fox brown QUICK the\`, \`Capitalised: The Quick Brown Fox\` and
\`Palindromes: 0\`.

**Rules**

- Split the line into a \`string[]\` with \`StringSplitOptions.RemoveEmptyEntries\`, and work on the
  array with loops.
- Write and use two methods: \`static string Capitalise(string word)\` and
  \`static bool IsPalindrome(string word)\`. Single-letter words such as "a" or "I" are not counted
  as palindromes.
- A line with no words (empty or only spaces) gives \`Words: 0\`, \`Longest: -\`, and nothing after
  \`Reversed:\` and \`Capitalised:\`. If there is no input line at all, \`Console.ReadLine()\`
  returns null — treat that as an empty line.
- The grader runs C# 7 on Mono: use a classic \`class Program\` with \`static void Main()\`, string
  concatenation or \`string.Format\`, and no newer features.

**How it is graded**

Your program is run against the two examples and several hidden cases (an empty line, no input at
all, single letters, mixed-case palindromes, a single word). Output is compared line by line;
trailing spaces at the end of a line are ignored.`,
      rubric: [
        { criterion: 'Correct output', description: 'All five lines are right for every test, including empty input, ties for the longest word, single-letter words and mixed case.', maxPoints: 60 },
        { criterion: 'Strings, arrays and loops', description: 'The line is split with empty entries removed and walked with loops; the reversed and capitalised lines are built without stray spaces.', maxPoints: 25 },
        { criterion: 'Methods and readability', description: 'Capitalise and IsPalindrome are written as separate static methods and used, names say what they hold, and there is no debug output.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'csharp',
        starter: `using System;

class Program
{
    // TODO: static string Capitalise(string word)
    // TODO: static bool IsPalindrome(string word)

    static void Main()
    {
        string line = Console.ReadLine();
        // TODO: treat a null line as empty, then split it into words (remove empty entries)
        // TODO: print Words, Longest, Reversed, Capitalised and Palindromes
    }
}
`,
        tests: [
          { input: 'Madam Arora teaches level maths\n', expectedOutput: 'Words: 5\nLongest: teaches\nReversed: maths level teaches Arora Madam\nCapitalised: Madam Arora Teaches Level Maths\nPalindromes: 3' },
          { input: '  the   QUICK brown  fox  \n', expectedOutput: 'Words: 4\nLongest: QUICK\nReversed: fox brown QUICK the\nCapitalised: The Quick Brown Fox\nPalindromes: 0' },
          { input: '   \n', expectedOutput: 'Words: 0\nLongest: -\nReversed:\nCapitalised:\nPalindromes: 0', isHidden: true },
          { input: '', expectedOutput: 'Words: 0\nLongest: -\nReversed:\nCapitalised:\nPalindromes: 0', isHidden: true },
          { input: 'a I wow\n', expectedOutput: 'Words: 3\nLongest: wow\nReversed: wow I a\nCapitalised: A I Wow\nPalindromes: 1', isHidden: true },
          { input: 'Noon\n', expectedOutput: 'Words: 1\nLongest: Noon\nReversed: Noon\nCapitalised: Noon\nPalindromes: 1', isHidden: true },
          { input: 'racecar Racecar RaceCars\n', expectedOutput: 'Words: 3\nLongest: RaceCars\nReversed: RaceCars Racecar racecar\nCapitalised: Racecar Racecar Racecars\nPalindromes: 2', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },
  {
    unitCode: 'JT_CS_BASICS_INTERVIEW_QUESTION',
    notes: `Three fundamentals questions from nearly every C# screening, with model answers and the
follow-up a good answer earns.

## Q1. "What is the difference between a value type and a reference type?"

**Model answer.** "A value-type variable holds the value itself — int, double, decimal, bool, char,
enums and structs. Assigning it copies the value, and it cannot be null unless it is a nullable
like int?. A reference-type variable holds a reference to an object on the managed heap — classes,
arrays, strings, delegates. Assigning it copies the reference, so two variables can refer to the
same object, and a change through one is visible through the other. That is why changing an
array's elements inside a method affects the caller, but changing an int parameter does not."

**Follow-up:** "string is a reference type — so why does it behave like a value?" — "Because it is
immutable and overloads ==. No method can change a string, so sharing a reference is never
visible, and == compares characters instead of references. If I cast both to object, == goes back
to comparing references."

## Q2. "Explain ref and out. When would you use each?"

**Model answer.** "Both pass the caller's variable by reference instead of a copy. With ref, the
caller must initialise the variable first and the method may read and change it — for example a
Swap(ref a, ref b). With out, the caller need not initialise it but the method must assign it on
every path before returning; it is the way to return an extra value, as int.TryParse returns both
success and the parsed number. In new code I prefer returning a value or a tuple, and keep out
for the Try pattern."

**Follow-up:** "What does passing an array with ref change?" — "Without ref, the method can modify
the array's elements but not make the caller's variable point to a different array. With ref, it
can do both — for example Array.Resize(ref arr, n) replaces the caller's array."

## Q3. A code question: "What does this print, and how would you fix it?"

    string result = "";
    for (int i = 0; i < 5; i++)
        result += i + ",";
    result.TrimEnd(',');
    Console.WriteLine(result);

**Model answer.** "It prints 0,1,2,3,4, with the trailing comma still there, because TrimEnd
returns a new string and the result is discarded — strings are immutable. I would write
result = result.TrimEnd(','). Better, I'd avoid the issue entirely with
string.Join(",", Enumerable.Range(0, 5)), and in a large loop I'd use a StringBuilder, since +=
copies the whole string every pass and makes the loop quadratic."

**Follow-up:** "When is += on strings fine?" — "For a few concatenations — the compiler even turns
a + b + c into a single String.Concat call. It is a loop with thousands of iterations where the
copying shows up."

## How to answer

Start with the one-line distinction, give the mechanism, and finish with the consequence you can
see in code. Interviewers listen for that last step.`,
    mcqs: [
      mcq('Which of these is a value type in C#?',
        [['decimal', true], ['string', false], ['int[]', false], ['object', false]],
        'decimal is a struct (System.Decimal), so it is a value type. string, arrays and object are reference types.'),
      mcq('int a = 5; int b = a; b = 9; and int[] x = {5}; int[] y = x; y[0] = 9; — what are a and x[0]?',
        [['a is 5 and x[0] is 9', true], ['a is 9 and x[0] is 9', false], ['a is 5 and x[0] is 5', false], ['a is 9 and x[0] is 5', false]],
        'Assigning an int copies the value, so a is unaffected. Assigning an array copies the reference, so x and y share one array and x[0] becomes 9.'),
      mcq('Why does int.TryParse use an out parameter rather than ref?',
        [['The caller need not initialise the variable first', true], ['out parameters are faster than ref ones for an int', false], ['ref parameters cannot be used with value types', false], ['out lets the method skip assigning the value', false]],
        'out means "the method will assign this", so callers can pass a fresh variable. The method must assign it — the opposite of skipping it.'),
    ],
  },
  {
    unitCode: 'JT_CS_BASICS_CHECKPOINT',
    notes: `Ten questions across C# fundamentals: types and overflow, conversions and nullables,
operators, conditions, loops, arrays, strings and methods. Each is a short snippet — predict what
the compiler and the runtime will do before you look at the options.`,
    checkpoint: [
      mcq('int seats = int.MaxValue; seats += 1; Console.WriteLine(seats); — what is printed?',
        [['-2147483648', true], ['2147483648', false], ['An OverflowException is thrown', false], ['2147483647', false]],
        'Integer arithmetic is unchecked by default, so the value wraps to int.MinValue. Use checked or long when a sum can pass two billion.'),
      mcq('What does Console.WriteLine(Convert.ToInt32(4.5) + (int)4.5); print?',
        [['8', true], ['9', false], ['10', false], ['It does not compile', false]],
        'Convert.ToInt32 rounds a tie to the even number, giving 4; the cast truncates to 4. So 4 + 4 = 8.'),
      mcq('int? bonus = null; int pay = 1000 + (bonus ?? 0); Console.WriteLine(pay); — output?',
        [['1000', true], ['An empty line, because the sum is null', false], ['It throws InvalidOperationException', false], ['It fails to compile', false]],
        'bonus ?? 0 replaces the null with 0 before the addition, so pay is an ordinary int, 1000. Without ??, 1000 + bonus would be a null int?.'),
      mcq('What does Console.WriteLine(-11 % 4 + 11 / -4); print?',
        [['-5', true], ['1', false], ['-6', false], ['5', false]],
        '-11 % 4 is -3 (the sign follows the dividend) and 11 / -4 truncates toward zero to -2, so the sum is -5.'),
      mcq('string level = marks switch { >= 80 => "high", >= 50 => "mid", _ => "low" }; — with marks = 50, what is level?',
        [['"mid"', true], ['"high"', false], ['"low"', false], ['It throws SwitchExpressionException', false]],
        'Arms are tried in order: 50 is not >= 80, but it is >= 50, so "mid" is chosen. The discard arm is never reached.'),
      mcq('int i = 0; while (i < 10) { i += 4; } Console.WriteLine(i); — what is printed?',
        [['12', true], ['8', false], ['10', false], ['16', false]],
        'i takes 4, 8 and then 12; the condition 12 < 10 is false, so the loop stops with i at 12.'),
      mcq('int[,] board = { { 1, 2 }, { 3, 4 }, { 5, 6 } }; Console.WriteLine(board[2, 0] + board.GetLength(0)); — output?',
        [['8', true], ['7', false], ['11', false], ['9', false]],
        'board[2, 0] is the first element of the third row, 5, and GetLength(0) is the number of rows, 3. 5 + 3 = 8.'),
      mcq('What does "Bengaluru".Substring(1, 3).ToUpper().IndexOf(\'G\') return?',
        [['2', true], ['3', false], ['-1', false], ['1', false]],
        'Substring(1, 3) is "eng", ToUpper gives "ENG", and \'G\' is at index 2.'),
      mcq('static void Fill(int[] a) { a[0] = 1; a = new int[] { 7 }; a[0] = 2; } — after Fill(data) with data = { 0 }, what is data[0]?',
        [['1', true], ['2', false], ['7', false], ['0', false]],
        'The first assignment changes the caller\'s array. Then a is rebound to a new array, so the later writes affect only that new array.'),
      mcq('Overloads Print(int) and Print(string) exist. Which runs for Print(\'Z\')?',
        [['Print(int), since char converts implicitly to int', true], ['Print(string), since \'Z\' is text', false], ['Neither; the call is ambiguous', false], ['Print(string) after a run-time conversion', false]],
        'There is an implicit numeric conversion from char to int but none from char to string, so Print(int) is chosen and receives 90.'),
    ],
  },
];
