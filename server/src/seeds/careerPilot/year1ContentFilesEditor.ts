/**
 * T_FILES and T_EDITOR — the filesystem, basic file commands, and the editor a student works in.
 *
 * ── WHY THESE TOPICS ──────────────────────────────────────────────────────────────────────
 *
 * Both are UNIVERSAL and FOUNDATION: every later unit that asks a student to run a program, open
 * a data file or fix a bug quietly assumes they can say where a file is, read an error that names
 * a path, and move around a project in an editor. Nobody is born knowing any of it, and the hour
 * lost to "No such file or directory" in week one is an hour that teaches nothing.
 *
 * ── THE LINE T_FILES HOLDS ────────────────────────────────────────────────────────────────
 *
 * The filesystem as a TREE, a path as a route through it, and a small set of commands (pwd, ls,
 * cd, mkdir, cp, mv, rm, cat, less, head, tail, chmod) understood well enough to predict what
 * they will do before pressing Enter. Streams, redirection, pipes, grep and scripting belong to
 * T_SHELL_PIPELINES and are not taught here. Linux and macOS terminals are the centre; Windows
 * equivalents are named where a student is likely to meet them.
 *
 * Checkpoint questions name the one skill each measures: FILE_SYSTEMS_PERMISSIONS for the model
 * (trees, paths, permission bits, what a name does and does not decide) and SHELL_COMMANDS for
 * choosing and predicting a command.
 *
 * ── THE LINE T_EDITOR HOLDS ───────────────────────────────────────────────────────────────
 *
 * Editor-agnostic ideas — a project folder, saved versus unsaved, semantic navigation, search
 * that knows its blind spots, a debugger instead of scattered prints — made concrete with VS Code
 * as the running example. Extensions and shortcut drills are separate units and are not repeated.
 */

import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string, skillKey?: string,
): PilotMcq => ({
  question,
  options: options.map(([text, isCorrect]) => ({ text, isCorrect })),
  explanation,
  ...(skillKey ? { skillKey } : {}),
});

const FS = 'FILE_SYSTEMS_PERMISSIONS';
const SH = 'SHELL_COMMANDS';

export const FILES_EDITOR_BUNDLES: PilotBundle[] = [
  // ─────────────────────────────────────────────────────────────────────────────────────────
  // T_FILES
  // ─────────────────────────────────────────────────────────────────────────────────────────
  {
    unitCode: 'T_FILES_FILESYSTEM_SHAPE',
    notes: `Every file on a Linux or macOS machine lives somewhere in ONE tree. The tree starts at a
single directory called the **root**, written \`/\`, and every directory can hold files and further
directories.

    /
    ├── etc/            system-wide configuration
    ├── home/
    │   └── priya/      priya's home directory
    │       ├── Desktop/
    │       └── projects/
    │           └── marks/
    │               └── marks.py
    ├── tmp/            temporary files, often cleared on restart
    └── usr/
        └── bin/        installed programs such as python3

A file's **path** is the route to it from the root: \`/home/priya/projects/marks/marks.py\`. The
slashes separate directory names; the last part is the file itself.

**Home is just a directory.** Your Desktop, Documents and Downloads folders are ordinary
directories inside your home directory — \`/home/priya/Desktop\` on Linux, \`/Users/priya/Desktop\`
on macOS. The file manager shows the same tree with pictures.

**Windows differs in two visible ways.** Each drive has its own tree, so there are several roots
(\`C:\`, \`D:\`), and the separator is a backslash: \`C:\\Users\\priya\\projects\`. The idea of a
tree of directories is exactly the same.

**A directory is a list of names.** It records which names it contains and where each file's data
is. That is why moving a 4 GB video into another directory on the same drive is instant: only the
two lists change, and the video's bytes never move.

**Names are exact.** On Linux, \`Marks.csv\` and \`marks.csv\` are two different files that can sit
side by side. Windows and macOS (by default) treat them as the same name, which is how code that
works on a laptop fails on a Linux server.

**The common misconception: the extension decides what a file is.** It does not. \`.txt\` or
\`.pdf\` is just the end of the name. Rename \`photo.jpg\` to \`photo.txt\` and the bytes are still a
JPEG; a text editor opening it shows nonsense. Programs use the extension as a hint, not a fact.

**Why this matters.** Every command you type, every "file not found" error and every import in a
program names a place in this tree. Once you can picture the tree, those stop being mysterious.
\`ls /\` shows the top of it on your own machine — try it.`,
    mcqs: [
      mcq('On a Linux machine, a folder contains both `Report.txt` and `report.txt`. What are they?',
        [['Two separate files, because Linux treats names as case-sensitive', true],
          ['The same file listed twice under two differently cased names', false],
          ['Impossible, since the second name would overwrite the first one', false],
          ['A file and its automatic backup copy made by the operating system', false]],
        'Linux compares names exactly, so the two spellings are different entries. Windows and default macOS would refuse the second name.'),
      mcq('You rename `lecture.mp4` to `lecture.txt`. What has happened to its contents?',
        [['Nothing: the bytes are still video, only the name changed', true],
          ['The video has been converted into plain text characters', false],
          ['The file is now empty, because text cannot hold a video', false],
          ['The contents are compressed to suit the new file type', false]],
        'The extension is part of the name and carries no power over the data. Renaming never converts anything.'),
      mcq('On a typical Linux system, where would you expect system-wide configuration files?',
        [['/etc', true], ['/tmp', false], ['/usr/bin', false], ['/home', false]],
        '/etc holds configuration for the whole system. /tmp is scratch space, /usr/bin holds programs and /home holds users\' own directories.'),
      mcq('The Desktop folder you see in the Linux file manager is, in the tree:',
        [['A directory inside your home, such as /home/priya/Desktop', true],
          ['A special area outside the tree that only the GUI can reach', false],
          ['The root directory itself, shown with a friendlier name', false],
          ['A copy of your home directory kept in sync with the real one', false]],
        'The file manager draws the same tree the terminal shows. Desktop is an ordinary directory with an ordinary path.'),
    ],
    checkpoint: [
      mcq('Moving a 4 GB video into another directory on the same drive finishes instantly. What does that tell you?',
        [['Directories list names, so only the two lists changed', true],
          ['The operating system copied the video in the background', false],
          ['The drive compressed the video before moving it across', false],
          ['The move failed silently and left the video where it was', false]],
        'A directory records names and where each file\'s data lives. Moving within one drive rewrites those entries and leaves the data untouched.', FS),
      mcq('A classmate\'s project is at `C:\\Users\\anu\\code` and yours is at `/home/anu/code`. What is the structural difference?',
        [['Windows has a tree per drive letter; Linux has a single root', true],
          ['Windows stores folders as a list, while Linux stores a tree', false],
          ['Linux has no home directories, so code lives under /home', false],
          ['Windows paths are relative, while Linux paths are absolute', false]],
        'Both are trees of directories. Windows starts a separate tree at each drive, while Linux and macOS hang everything, including other drives, from one /.', FS),
      mcq('What does `ls /` print?',
        [['The directories at the top of the tree, such as etc, home and tmp', true],
          ['The files and folders in your own home directory, such as Desktop', false],
          ['The contents of whichever directory the terminal is currently in', false],
          ['Every file on the whole machine, listed one path per line', false]],
        'The / argument names the root directory, so ls lists what sits directly inside it and nothing deeper.', SH),
    ],
  },
  {
    unitCode: 'T_FILES_PATHS',
    notes: `A path names a place in the tree. There are two ways to write one, and confusing them is
behind most "but the file is right there" errors.

**An absolute path starts at the root.** It begins with \`/\` and means the same thing wherever you
are:

    /home/ravi/college/sem1/maths.pdf

**A relative path starts from where you are now.** Every running program — your terminal included —
has a **current working directory**. A path without a leading \`/\` is read from there. If the
current directory is \`/home/ravi/college\`, then:

    sem1/maths.pdf

names exactly the same file.

**Three special names:**

- \`.\` is the current directory. \`./run.sh\` means "run.sh, here".
- \`..\` is the parent directory, one level up. \`../notes\` means "notes, beside the directory I am in".
- \`~\` is your home directory. \`~/college\` is \`/home/ravi/college\` for ravi.

You can chain \`..\`: from \`/home/ravi/college/sem1\`, the path \`../../downloads\` climbs to
\`/home/ravi\` and then enters \`downloads\`.

**\`~\` is a shell feature, not a directory.** The shell replaces it with your home path before the
command runs. Python does not: \`open("~/data.csv")\` looks for a directory literally named \`~\` and
fails. Use \`os.path.expanduser("~/data.csv")\` or an absolute path.

**The misconception that costs the most time: relative to the script.** A relative path in a
program is resolved against the current working directory of the PROCESS, not the folder the
script file sits in. A script at \`/home/ravi/tools/report.py\` that opens \`input.txt\`, run as
\`python tools/report.py\` from \`/home/ravi\`, looks for \`/home/ravi/input.txt\`.

**Spaces need quotes.** \`"My Projects/week 1"\` must be quoted, or the shell splits it into
separate words.

**On Windows** the same ideas hold: \`C:\\Users\\asha\\college\` is absolute, \`..\\sem1\` is relative,
and \`.\` and \`..\` mean what they mean on Linux.

**Why it matters.** Absolute paths are unambiguous but break when a project moves to another
machine; relative paths travel with the project but depend on where you run from. Knowing which
you wrote is how you know what will break.`,
    workedExample: `**Goal: from /home/priya/projects/marks, name /home/priya/notes/week1.txt both ways.**

The relevant part of the tree:

    /home/priya/
    ├── notes/
    │   └── week1.txt
    └── projects/
        └── marks/        <- you are here

**Absolute.** Start at the root and write every directory down to the file:

    /home/priya/notes/week1.txt

It works from anywhere, which is its whole point.

**Relative.** Work out the climb first, then the descent.

1. The target and the current directory share \`/home/priya\`. That is the meeting point.
2. From \`marks\`, one \`..\` reaches \`projects\`; a second reaches \`priya\`. So the climb is \`../..\`.
3. From \`priya\`, descend into \`notes\` and name the file.

    ../../notes/week1.txt

**Check it by walking it:** \`/home/priya/projects/marks\` → \`..\` → \`/home/priya/projects\` → \`..\`
→ \`/home/priya\` → \`notes\` → \`week1.txt\`. It lands on the file.

**A third way:** \`~/notes/week1.txt\` also works for priya in the shell, because the shell turns
\`~\` into \`/home/priya\` before the command runs.

**The wrong answer people give:** \`../notes/week1.txt\`. That climbs only once, to \`projects\`,
and looks for \`/home/priya/projects/notes/week1.txt\`, which does not exist.`,
    mcqs: [
      mcq('You are in `/home/ravi/college`. Which path names `/home/ravi/college/sem1/maths.pdf` relatively?',
        [['sem1/maths.pdf', true], ['/sem1/maths.pdf', false], ['../sem1/maths.pdf', false], ['college/sem1/maths.pdf', false]],
        'A relative path starts from the current directory, which already is college. A leading / would start from the root instead.'),
      mcq('From `/home/ravi/college/sem1`, the path `../../downloads` refers to:',
        [['/home/ravi/downloads', true], ['/home/ravi/college/downloads', false], ['/home/downloads', false], ['/downloads', false]],
        'The first .. reaches college and the second reaches ravi; downloads is then entered from /home/ravi.'),
      mcq('`open("~/data.csv")` in Python fails, although `data.csv` is in your home directory. Why?',
        [['Python does not expand ~, so it looks for a folder literally named ~', true],
          ['Python only accepts absolute paths, and ~/data.csv is a relative one', false],
          ['The file must be opened in binary mode when a path contains a symbol', false],
          ['The home directory is protected, so programs cannot read files there', false]],
        'The shell turns ~ into your home path; Python passes the string through unchanged. os.path.expanduser performs the expansion.'),
      mcq('Which of these paths means the same thing whatever the current directory is?',
        [['/var/log/syslog', true], ['log/syslog', false], ['./var/log/syslog', false], ['../log/syslog', false]],
        'Only a path beginning with / starts from the root. The others are all resolved from wherever you happen to be.'),
    ],
    checkpoint: [
      mcq('A script at `/home/ravi/tools/report.py` opens `"input.txt"`. You run `python tools/report.py` from `/home/ravi`. Where does it look?',
        [['/home/ravi/input.txt', true], ['/home/ravi/tools/input.txt', false], ['/input.txt', false], ['/home/input.txt', false]],
        'Relative paths are resolved against the current working directory of the process, which is /home/ravi, not the folder holding the script.', FS),
      mcq('From `/home/ravi/college/sem1`, which relative path names `/home/ravi/college/sem2/physics.txt`?',
        [['../sem2/physics.txt', true], ['../../sem2/physics.txt', false], ['./sem2/physics.txt', false], ['/sem2/physics.txt', false]],
        'One .. climbs to college, which contains sem2. Two would climb to ravi, where there is no sem2.', FS),
      mcq('In the command `ls ~/college`, what happens to the `~`?',
        [['The shell replaces it with your home path before ls runs', true],
          ['ls itself looks up your home directory when it sees the symbol', false],
          ['It names a real directory called ~ that sits inside the root', false],
          ['It stands for the directory the terminal was first opened in', false]],
        'Tilde expansion is done by the shell, which is why it works in the terminal and not inside a Python string.', SH),
    ],
  },
  {
    unitCode: 'T_FILES_NAVIGATION',
    notes: `A terminal has no window showing where you are. Three commands replace the file manager, and
a fourth habit makes them fast.

**\`pwd\` — where am I?** It prints the current working directory as an absolute path:

    $ pwd
    /home/meena/projects

Many prompts show a short form too, such as \`meena@laptop:~/projects$\`, where \`~\` is home.

**\`ls\` — what is here?**

    $ ls                  # names in the current directory
    $ ls -l               # one per line: permissions, owner, size, date
    $ ls -lh              # sizes as 4.2K or 1.3M instead of bytes
    $ ls -a               # include names starting with a dot
    $ ls -lt              # newest first
    $ ls ~/downloads      # somewhere else, without going there

**\`cd\` — go somewhere.** It takes an absolute or relative path:

    $ cd /var/log         # absolute
    $ cd projects/site    # relative to where you are
    $ cd ..               # up one level
    $ cd                  # no argument: straight home
    $ cd -                # back to the previous directory

\`cd\` changes only where THIS terminal is. It does not touch any file, and a second terminal
window has its own current directory — which is why a command can work in one window and fail in
another.

**Tab completion is the habit.** Type \`cd pro\` and press Tab; the shell fills in \`projects/\`.
Press Tab twice when several names match and it lists them. It saves typing, but its real value is
as a spelling check: if Tab completes nothing, the name you are typing does not exist where you
think it does, and you know before running anything.

**The misconception: \`cd\` can enter a file.** \`cd notes.txt\` fails with "Not a directory". Only
directories can be entered; to look inside a file you read it, which is the next unit.

**On Windows**, \`cd\` works the same in Command Prompt, \`cd\` with no argument prints the current
directory, and \`dir\` lists it. PowerShell also accepts \`pwd\`, \`ls\` and \`cd\` as aliases.

**Why it matters.** Every relative path is read from the current directory. The first move when
something cannot be found is \`pwd\`, and the second is \`ls\`: they turn a guess into a fact in two
seconds.`,
    mcqs: [
      mcq('What does `cd` with no argument do in bash or zsh?',
        [['Takes you straight to your home directory', true],
          ['Prints the current directory without moving', false],
          ['Moves you up one level to the parent directory', false],
          ['Returns you to the root directory of the tree', false]],
        'A bare cd goes home. Printing the current directory is pwd, and cd with no argument prints it only in Windows Command Prompt.'),
      mcq('You type `cd proj` and press Tab twice, and nothing appears. What does that tell you?',
        [['Nothing in the current directory has a name beginning with proj', true],
          ['The projects directory exists but you lack permission to enter it', false],
          ['Tab completion is switched off until you run a command first', false],
          ['There are too many matching names for the shell to list them', false]],
        'Tab completion reads the real directory. Silence means no match, which is worth knowing before you press Enter.'),
      mcq('What does `cd -` do?',
        [['Returns to the directory you were in before the last cd', true],
          ['Moves up one level, exactly the same as cd .. would', false],
          ['Goes to the root directory at the very top of the tree', false],
          ['Undoes the last file change made in the current directory', false]],
        'cd - swaps between the current and previous directory, which is handy when working in two places at once.'),
      mcq('Which command lists files with sizes shown as, for example, 4.2K and 1.3M?',
        [['ls -lh', true], ['ls -a', false], ['ls -t', false], ['pwd -h', false]],
        '-l gives the long listing with a size column and -h turns the byte counts into human-readable units.'),
    ],
    checkpoint: [
      mcq('Starting in `/home/meena`, you run `cd projects/site`, then `cd ../..`, then `cd /tmp`, then `cd -`. What does `pwd` print?',
        [['/home/meena', true], ['/tmp', false], ['/home/meena/projects/site', false], ['/home/meena/projects', false]],
        'cd ../.. from projects/site climbs back to /home/meena. cd /tmp moves away, and cd - returns to the previous directory, /home/meena.', SH),
      mcq('`cd report.pdf` fails with "Not a directory". What is the underlying reason?',
        [['Only directories can be entered; a file has no entries inside it', true],
          ['PDF files are locked while another program has them open', false],
          ['The name needs a trailing slash before cd can recognise it', false],
          ['cd requires an absolute path whenever the target is a file', false]],
        'A file is a leaf of the tree. You read a file\'s contents; you only cd into directories.', FS),
      mcq('You want to see what is in `~/downloads` without leaving your current directory. Which command?',
        [['ls ~/downloads', true], ['cd ~/downloads', false], ['pwd ~/downloads', false], ['ls -a', false]],
        'ls accepts a path argument, so you can inspect any directory while staying where you are. ls -a would list the current directory.', SH),
    ],
  },
  {
    unitCode: 'T_FILES_FILE_OPERATIONS',
    notes: `Four operations change the filesystem: create, copy, move and delete. Three of them can be
undone by hand. One cannot, and two of the others can quietly destroy data too.

**Create.**

    $ mkdir college                 # a new directory
    $ mkdir -p college/sem1/maths   # including any missing parents
    $ touch notes.txt               # an empty file (or update the date of an existing one)

Without \`-p\`, \`mkdir college/sem1\` fails with "No such file or directory" when \`college\` does not
exist yet.

**Copy.**

    $ cp notes.txt notes-backup.txt   # copy to a new name
    $ cp notes.txt archive/           # into an existing directory, same name
    $ cp -r project project-copy      # a directory and everything in it

\`cp\` refuses a directory without \`-r\` ("-r not specified; omitting directory").

**Move and rename are the same command.**

    $ mv draft.txt final.txt        # rename in place
    $ mv final.txt ~/college/       # move into another directory

**Delete.**

    $ rm old.txt                    # a file
    $ rm -r old-project             # a directory and everything inside
    $ rmdir empty-folder            # only works if it is empty

**What cannot be undone.** \`rm\` does not use a Recycle Bin or Trash. That is a feature of the
graphical file manager, not of the filesystem. A file removed with \`rm\` is gone.

**The quieter danger: overwriting.** If the destination already exists, \`cp\` and \`mv\` replace it
without asking. \`cp new.csv data.csv\` destroys yesterday's \`data.csv\` as surely as \`rm\` would.
Add \`-i\` to be asked first: \`cp -i\`, \`mv -i\`, \`rm -i\`.

**Destination rules.** \`cp notes.txt archive\` puts the file INSIDE \`archive\` if it is an existing
directory, and creates a file NAMED \`archive\` if it is not. The same command does two different
things depending on the tree, so check with \`ls\` when unsure.

**Patterns are expanded before the command runs.** In \`rm *.log\`, the shell replaces \`*.log\` with
every matching name, and \`rm\` receives that list. Run \`ls *.log\` first and you see exactly what
will be deleted. Names with spaces must be quoted: \`rm -r My Project\` asks \`rm\` to delete two
things called \`My\` and \`Project\`.

**The misconception: "I can always get it back."** Not from the terminal. Git, backups and cloud
sync are how deleted work comes back, and only if they were set up before the \`rm\`.

**On Windows**, Command Prompt uses \`mkdir\`, \`copy\`, \`move\`, \`del\` and \`rmdir /s\`; PowerShell
has \`New-Item\`, \`Copy-Item\`, \`Move-Item\` and \`Remove-Item\`, with \`cp\`, \`mv\` and \`rm\` as aliases.`,
    mcqs: [
      mcq('In one directory, what does `mv report.txt final.txt` do?',
        [['Renames report.txt to final.txt, leaving no file called report.txt', true],
          ['Copies report.txt into a new file called final.txt, keeping both', false],
          ['Moves report.txt into a directory named final.txt, creating it', false],
          ['Fails, because mv only moves files between different directories', false]],
        'Renaming is a move within the same directory. Keeping both would be cp.'),
      mcq('No file or directory called `archive` exists. What does `cp notes.txt archive` produce?',
        [['A new file named archive with the same contents as notes.txt', true],
          ['A new directory named archive that contains notes.txt inside it', false],
          ['An error, because the destination directory does not exist yet', false],
          ['A compressed archive file holding notes.txt and its metadata', false]],
        'cp only puts a file inside the destination when it is an existing directory. Otherwise the destination is taken as the new file name.'),
      mcq('`mkdir college/sem1` fails with "No such file or directory". The `college` directory does not exist. What fixes it?',
        [['mkdir -p college/sem1', true], ['mkdir -r college/sem1', false], ['touch college/sem1', false], ['cd college/sem1', false]],
        '-p creates any missing parent directories along the way. touch makes files, and there is nothing yet to cd into.'),
      mcq('Before running `rm *.tmp`, which habit tells you exactly what will be deleted?',
        [['Run ls *.tmp first and read the list it expands to', true],
          ['Run pwd first so you know which directory is affected', false],
          ['Add -r so rm confirms each file before deleting it', false],
          ['Run rm with no pattern first so it shows its targets', false]],
        'The shell expands the pattern the same way for ls as for rm, so ls previews the exact list. -r means recursive, not confirm.'),
    ],
    checkpoint: [
      mcq('Assuming no file named `copy.txt` exists yet, which of these operations cannot be reversed from the terminal?',
        [['rm draft.txt', true], ['mv draft.txt old/', false], ['cp draft.txt copy.txt', false], ['mkdir drafts', false]],
        'rm bypasses any Trash, so the file is gone. A move can be moved back, and a new copy or directory can simply be removed.', FS),
      mcq('You want to delete the directory `My Project` and run `rm -r My Project`. What does rm actually receive?',
        [['Two separate arguments, My and Project, to delete one by one', true],
          ['One argument, My Project, because the shell reads to line end', false],
          ['No arguments, since the shell rejects names that have spaces', false],
          ['A pattern that matches every name beginning with My or Project', false]],
        'The shell splits words at spaces before rm runs. Quoting, as in rm -r "My Project", keeps the name as one argument.', SH),
      mcq('`data.csv` holds a week of results. What happens when you run `cp new.csv data.csv`?',
        [['The old contents of data.csv are replaced with no warning', true],
          ['cp refuses, because the destination file already exists', false],
          ['cp saves the new file as data(1).csv beside the old one', false],
          ['cp appends the rows of new.csv to the end of data.csv', false]],
        'cp and mv overwrite an existing destination silently. The -i option makes them ask first.', FS),
    ],
  },
  {
    unitCode: 'T_FILES_VIEWING_FILES',
    notes: `You often need to see what is in a file without opening an editor: the first rows of a
dataset, the last errors in a log, or a config on a server with no graphical desktop. Four commands
cover almost every case, and choosing the right one matters more than any flag.

**\`cat\` — print the whole file.**

    $ cat notes.txt
    $ cat part1.txt part2.txt     # one after the other

Right for a short file. On a file of a million lines it scrolls for a long time and shows you only
the end.

**\`head\` — the beginning.**

    $ head sales.csv              # first 10 lines
    $ head -n 3 sales.csv         # first 3: the header row and two records

The quickest way to learn the shape of a data file before writing code against it.

**\`tail\` — the end.**

    $ tail -n 20 app.log          # last 20 lines
    $ tail -f app.log             # keep printing new lines as they are written

\`tail -f\` "follows" a growing file. Start it, reproduce the problem in another window, and watch
the error appear. \`Ctrl+C\` stops following; it does not change the file.

**\`less\` — read a large file page by page.**

    $ less server.log

Inside \`less\`: Space for the next page, \`b\` to go back, \`/timeout\` then Enter to search, \`n\` for
the next match, \`G\` for the end, \`g\` for the start, and \`q\` to quit. \`less\` reads only what it
needs to show, so a 3 GB log opens at once where an editor might stall trying to load all of it.

**Choosing:** a short file, \`cat\`; the header of a dataset, \`head\`; the latest entries of a log,
\`tail\`; anything long you want to explore, \`less\`; a log that is still being written, \`tail -f\`.

**When the output is garbage.** \`cat logo.png\` fills the screen with symbols, because \`cat\` prints
raw bytes and image bytes are not text. It can even leave the terminal displaying oddly; \`reset\`
fixes that. To find out what a file really holds, ask:

    $ file results.txt
    results.txt: PNG image data, 640 x 480, 8-bit/color RGBA

**The misconception: these commands open the file for editing.** They do not. Nothing you do in
\`cat\`, \`head\`, \`tail\` or \`less\` changes the file, which is exactly why they are safe on a
production server.

**On Windows**, Command Prompt has \`type\` and \`more\`; PowerShell's \`Get-Content\` takes
\`-TotalCount 10\`, \`-Tail 20\` and \`-Wait\` for the same jobs as head, tail and tail -f.`,
    mcqs: [
      mcq('You want the header row and first few records of a 500 MB CSV. Which command?',
        [['head -n 5 sales.csv', true], ['tail -n 5 sales.csv', false], ['cat sales.csv', false], ['file sales.csv', false]],
        'head shows the start of the file, where the header row is, and stops without reading the rest.'),
      mcq('What does `tail -f server.log` do after printing the last lines?',
        [['Keeps printing new lines as they are added, until Ctrl+C', true],
          ['Deletes the lines it has shown so the log does not grow', false],
          ['Opens the log for editing at its final line in the terminal', false],
          ['Exits immediately, because -f stands for the first ten lines', false]],
        '-f follows the file. It is the standard way to watch a log while reproducing a problem.'),
      mcq('Reading a long log in `less`, how do you jump to the next occurrence of "timeout"?',
        [['Type /timeout, press Enter, then press n for each next match', true],
          ['Press Ctrl+F and type timeout into the search box that opens', false],
          ['Quit, then run less again with timeout as a second argument', false],
          ['Press G, which searches downward for the last word you typed', false]],
        'In less, / starts a forward search and n repeats it. G jumps to the end of the file.'),
      mcq('`cat logo.png` fills the terminal with strange symbols. Why?',
        [['cat prints raw bytes, and image data is not readable text', true],
          ['The image is corrupted, so its data is unreadable to cat', false],
          ['The terminal cannot display files larger than one screen', false],
          ['cat only works on files whose names end in .txt or .csv', false]],
        'cat does no interpretation at all. The symbols are the image\'s bytes shown as if they were characters.'),
    ],
    checkpoint: [
      mcq('Which command shows the last 50 lines of `app.log`?',
        [['tail -n 50 app.log', true], ['head -n 50 app.log', false], ['less -n 50 app.log', false], ['cat -n 50 app.log', false]],
        'tail reads from the end. head reads from the start, and the other two do not take a line count in that way.', SH),
      mcq('`file results.txt` reports "JPEG image data". What does that tell you?',
        [['The contents are an image, whatever the name claims', true],
          ['The file will become text once opened in an editor', false],
          ['The file command has misread the .txt extension', false],
          ['The file is text that has been saved in JPEG format', false]],
        'file inspects the bytes, not the name. An extension is only part of the name and does not change the data.', FS),
      mcq('What does `head notes.txt` print when no line count is given?',
        [['The first 10 lines', true], ['The first 20 lines', false], ['The whole file', false], ['The first screenful', false]],
        'Both head and tail default to ten lines. -n chooses a different number.', SH),
    ],
  },
  {
    unitCode: 'T_FILES_PERMISSIONS',
    notes: `Linux and macOS decide who may do what to each file with nine bits, and \`ls -l\` shows them:

    $ ls -l
    -rw-r--r--  1 priya students  1204 Sep  3 10:12 notes.txt
    drwxr-x---  2 priya students  4096 Sep  3 10:15 project
    -rwxr-xr-x  1 priya students   310 Sep  3 10:20 backup.sh

**Reading the string.** The first character is the type: \`-\` a file, \`d\` a directory. The next
nine come in three groups of three:

    rw-   r--   r--
    owner group others

\`r\` read, \`w\` write, \`x\` execute, \`-\` not allowed. So \`notes.txt\` can be read and changed by
priya, and only read by the \`students\` group and everyone else. The owner and group are the two
names after the link count.

**Directories use the same letters differently.**

- \`r\` — list the names inside.
- \`w\` — create, delete or rename entries inside.
- \`x\` — enter the directory and reach anything within it.

This produces the two surprises everybody meets. Deleting a file needs \`w\` on the DIRECTORY, not
on the file. And reaching \`/home/priya/project/notes.txt\` needs \`x\` on every directory along the
way — a readable file inside a directory you cannot enter is unreachable.

**Numbers.** Each group is a sum of r = 4, w = 2, x = 1:

    644  rw-r--r--   ordinary files
    755  rwxr-xr-x   programs and directories others may use
    600  rw-------   private files, such as an SSH key
    700  rwx------   private directories

**Changing them with \`chmod\`.**

    $ chmod 600 secrets.txt       # set all nine bits at once
    $ chmod u+x backup.sh         # add execute for the owner (u)
    $ chmod g+w report.md         # add write for the group (g)
    $ chmod o-r notes.txt         # remove read for others (o)

The symbolic form changes only what you name, which makes it safer than a number when you want one
adjustment. \`chown\` changes the owner and normally needs administrator rights.

**The misconception: \`sudo\` fixes "Permission denied".** \`sudo\` runs a command as root, which
ignores permissions, so the error disappears — and the files it creates are owned by root. The next
time you run the command normally you get more "Permission denied" errors in your own project. Read
\`ls -l\` and fix the actual owner or bits instead. \`chmod 777\`, which lets anyone change the file,
is the same mistake in another form.

**On Windows**, NTFS uses access control lists rather than nine bits, viewed in a file's Security
properties or with \`icacls\`. Under WSL you see Linux permissions as described here.

**Why it matters.** Servers, shared lab machines, SSH keys and every script you write depend on
these bits. The later shell scripting unit assumes you can read them.`,
    mcqs: [
      mcq('A file shows `-rwxr-x---`. What can a user in the file\'s group do with it?',
        [['Read and execute it, but not change it', true],
          ['Read, change and execute it like the owner', false],
          ['Nothing at all, because the group bits are empty', false],
          ['Change it, but neither read it nor execute it', false]],
        'The middle three characters, r-x, belong to the group: read and execute are granted and write is not.'),
      mcq('What permission string does `chmod 644 notes.txt` give?',
        [['-rw-r--r--', true], ['-rwxr--r--', false], ['-rw-rw-r--', false], ['-r--r--r--', false]],
        '6 is 4 + 2, read and write, for the owner; 4 is read only for the group and for others.'),
      mcq('`old.txt` is `-rw-rw-rw-`, yet `rm old.txt` says "Permission denied". What is the likely cause?',
        [['You lack write permission on the directory that holds it', true],
          ['The file needs execute permission before it can be removed', false],
          ['rm always needs sudo when a file is writable by everyone', false],
          ['The file is open in an editor, which locks it against rm', false]],
        'Removing a file changes the directory\'s list of names, so it is the directory\'s w bit that counts, not the file\'s.'),
      mcq('You get "Permission denied" writing inside your own project, and a friend says to run everything with sudo. What is the best response?',
        [['Check ls -l first; sudo leaves root-owned files that fail again later', true],
          ['Use sudo, since root access is the normal way to write inside a project', false],
          ['Run chmod 777 on the project so that nobody is ever blocked again', false],
          ['Copy the project to /tmp, where every user can always write freely', false]],
        'sudo hides the cause and creates files your normal account cannot change. Finding the wrong owner or missing bit fixes it for good.'),
    ],
    checkpoint: [
      mcq('A directory shows `drwxr--r--`. Can a user who is neither the owner nor in its group `cd` into it?',
        [['No: entering a directory needs x, which others do not have', true],
          ['Yes: read permission on a directory is enough to enter it', false],
          ['Yes: any user may enter any directory, whatever its bits', false],
          ['No: entering a directory needs w, which others do not have', false]],
        'For a directory, x is the permission to enter and pass through. Others have only r, which lets them list names at most.', FS),
      mcq('Which command lets the owner run `backup.sh` without changing what anybody else is allowed to do?',
        [['chmod u+x backup.sh', true], ['chmod 777 backup.sh', false], ['chmod +r backup.sh', false], ['chmod 100 backup.sh', false]],
        'u+x adds execute for the owner and leaves every other bit as it was. A number sets all nine bits, and 100 would remove everyone\'s read and write.', SH),
      mcq('An SSH private key must be readable and writable by you and by nobody else. Which mode?',
        [['600', true], ['644', false], ['666', false], ['755', false]],
        '600 is rw------- : read and write for the owner, nothing for group or others. SSH refuses to use a key that others can read.', FS),
    ],
  },
  {
    unitCode: 'T_FILES_HIDDEN_AND_CONFIG',
    notes: `On Linux and macOS, a file or directory whose name begins with a dot is **hidden**: \`ls\` and
file managers leave it out unless asked. That is the entire mechanism — a naming convention, not a
special attribute and not a security feature.

    $ ls
    notes  projects
    $ ls -a
    .  ..  .bashrc  .config  .gitconfig  .ssh  notes  projects

\`ls -a\` shows everything, including \`.\` (this directory) and \`..\` (its parent). \`ls -la\` adds the
long listing. In a Linux file manager \`Ctrl+H\` toggles hidden files; in macOS Finder it is
\`Cmd+Shift+.\` (the full stop).

**Why hide them.** They are configuration: files you set up once and do not want cluttering every
listing. What usually lives in them:

- \`~/.bashrc\` — commands bash runs when it starts an interactive shell: aliases, prompt, PATH.
- \`~/.zshrc\` — the same for zsh, the default shell on macOS since 10.15 (Catalina).
- \`~/.gitconfig\` — your Git name, email and preferences, written by \`git config --global\`.
- \`~/.ssh/\` — SSH keys and connection settings.
- \`~/.config/\` — where many applications keep settings; VS Code on Linux uses \`~/.config/Code/\`.
- In a project: \`.git/\` (the whole repository history), \`.gitignore\`, \`.vscode/\` and often \`.env\`.

**Editing a shell config takes effect in NEW shells.** Add an alias to \`~/.bashrc\` and the terminal
you are typing in has already read the old file. Open a new terminal, or run \`source ~/.bashrc\`.
Copy the file before editing — \`cp ~/.bashrc ~/.bashrc.bak\` — because a mistake there breaks every
terminal you open afterwards.

**Patterns skip hidden names.** In bash, \`*\` does not match names that start with a dot. So

    $ cp -r project/* backup/

copies everything visible and leaves \`.git\`, \`.gitignore\` and \`.env\` behind. \`cp -r project backup\`
copies the directory itself, dotfiles included.

**The misconception: hidden means private.** A dot hides a name from casual listings and nothing
else. Who can read \`.env\` is decided by its permissions, and a \`.env\` full of passwords committed to
a public repository is public, dot or no dot.

**On Windows**, hidden is a real attribute set on the file rather than part of its name.
\`dir /a\` or PowerShell's \`Get-ChildItem -Force\` shows hidden items, and application settings
usually live under \`%APPDATA%\`, which is \`C:\\Users\\<name>\\AppData\\Roaming\`.

**Why it matters.** "It works on my machine" is very often a dotfile: an alias, a PATH entry or a
Git setting that exists on one computer and not another. Knowing where they live is how you find
the difference.`,
    mcqs: [
      mcq('`ls` in a freshly cloned repository shows no `.git` directory, yet Git commands work. Why?',
        [['Names starting with a dot are left out unless you use ls -a', true],
          ['Git keeps its data in a central database outside the project', false],
          ['.git is created only when the first git command runs inside', false],
          ['The directory is encrypted, so ls is not allowed to list it', false]],
        '.git is there all along. ls hides dot-names by default, and ls -a reveals them.'),
      mcq('You add an alias to `~/.bashrc`, but the terminal you are using says "command not found" for it. Why?',
        [['That shell read .bashrc when it started, before your edit', true],
          ['Aliases in .bashrc only work after the computer restarts', false],
          ['.bashrc is only read by root, not by an ordinary user', false],
          ['The file must be made executable before bash will read it', false]],
        'Shell config is read at start-up. Run source ~/.bashrc or open a new terminal to pick up the change.'),
      mcq('After `cp -r project/* backup/`, which files from `project` are missing in `backup`?',
        [['.gitignore and .env, because * does not match dot-names', true],
          ['Any subdirectories, because * matches only plain files', false],
          ['Files larger than the limit cp applies to patterns', false],
          ['None; the -r option copies every file that exists', false]],
        'The shell expands * before cp runs, and bash leaves dot-names out of that expansion. Copying the directory itself avoids the gap.'),
      mcq('Where does `git config --global user.email` store your email address by default?',
        [['~/.gitconfig', true], ['/etc/git/email', false], ['./.git/HEAD', false], ['~/.ssh/config', false]],
        'Global Git settings live in the hidden .gitconfig in your home directory; per-repository settings live in .git/config.'),
    ],
    checkpoint: [
      mcq('Renaming `secrets.txt` to `.secrets.txt` protects the passwords inside it how?',
        [['Not at all: it only hides the name from default listings', true],
          ['It encrypts the file so only the owner can read its text', false],
          ['It removes read permission for the group and for others', false],
          ['It prevents the file from being committed with Git', false]],
        'The dot is a listing convention. Permissions decide who can read a file, and Git commits dotfiles like any others.', FS),
      mcq('You suspect a project contains a `.env` file. Which command lists it along with its permissions and size?',
        [['ls -la', true], ['ls -l', false], ['ls -lh', false], ['ls -R', false]],
        '-a includes names beginning with a dot and -l adds permissions, owner and size. The others all skip hidden names.', SH),
      mcq('On a recent Mac you add an alias to `~/.bashrc`, but new terminal windows still do not have it. What is the likely reason?',
        [['The default shell is zsh, which reads ~/.zshrc instead', true],
          ['macOS hides .bashrc, so edits to it are never saved', false],
          ['Aliases must go in /etc/aliases on every macOS system', false],
          ['New terminals reuse the shell from the first window', false]],
        'macOS has used zsh by default since Catalina, and zsh does not read bash\'s config file. The alias belongs in ~/.zshrc.', SH),
    ],
  },
  {
    unitCode: 'T_FILES_ORGANISING_PRACTICE',
    notes: `No new commands. Everything here uses the tree, absolute and relative paths, \`pwd\`, \`ls\`,
\`cd\`, and creating, copying, moving and deleting — nothing about reading files, permissions or
hidden files yet. The tasks are the ones that arrive first: "tidy this folder", "put these where
they belong", "clear out what you no longer need".

**The method, for every task:**

1. **Where am I?** Run \`pwd\`. Every relative path you are about to type starts from here.
2. **What is here?** Run \`ls\`, or \`ls -l\` when sizes and dates help you decide.
3. **Say the target as a path** before choosing a command. Work out the climb with \`..\` first,
   then the descent. If you are unsure, write the absolute path; it cannot be misread.
4. **Create what is missing.** \`mkdir -p\` builds a directory and any missing parents in one go.
5. **Preview anything destructive.** Run \`ls\` with the same pattern before \`rm\` or \`mv\`, so you
   see exactly which names the shell will hand over.
6. **Check the result.** \`ls\` afterwards shows whether each file arrived, and under what name.

**The checklist that catches most mistakes:**

- Names containing spaces are quoted: \`"week 1"\`, not \`week 1\`.
- Directories need \`-r\` for \`cp\` and \`rm\`; \`rmdir\` only removes empty ones.
- \`mv\` and \`cp\` never create a destination directory for you.
- Does the destination already exist? If it is a directory the file goes inside; if it is a file,
  it is replaced without a warning. Add \`-i\` when that matters.
- \`rm\` has no Recycle Bin. Once it has run, the file is gone.
- If Tab will not complete a name, the name is wrong — stop and look.

**Predict, then run.** Before pressing Enter, say which files will move and where they will end up.
When the result matches, you understand the command; when it does not, you have found the exact
thing to learn before it cost you a file.`,
    mcqs: [
      mcq('In `~/downloads` you want every PDF moved into `~/college/sem1`, which does not exist yet. Which works?',
        [['mkdir -p ~/college/sem1, then mv *.pdf ~/college/sem1/', true],
          ['mv *.pdf ~/college/sem1 on its own, which creates the folder', false],
          ['cd ~/college/sem1, then mv ~/downloads/*.pdf into the folder', false],
          ['cp *.pdf ~/college/sem1/ on its own, then rm *.pdf afterwards', false]],
        'mv and cp never create a destination directory, and cd cannot enter one that does not exist. Create it first, then move.'),
      mcq('You are in `/home/sana/college/sem2/dsa`. Which command reaches `/home/sana/college/sem1/maths`?',
        [['cd ../../sem1/maths', true], ['cd ../sem1/maths', false], ['cd ../../../sem1/maths', false], ['cd /sem1/maths', false]],
        'One .. reaches sem2 and a second reaches college, which contains sem1. One climb too few looks for sem2/sem1.'),
      mcq('A directory called `old stuff` in the current directory must be deleted with everything inside. Which command?',
        [['rm -r "old stuff"', true], ['rm -r old stuff', false], ['rmdir "old stuff"', false], ['rm "old stuff"', false]],
        'The quotes keep the name as one argument and -r removes the contents. rmdir fails on a non-empty directory and plain rm refuses a directory.'),
      mcq('In `~/college`, `sem1` is an existing directory. Where does `cp timetable.pdf sem1` put the copy?',
        [['Inside sem1, still named timetable.pdf', true],
          ['Over a file called sem1, which it replaces', false],
          ['Nowhere, because cp needs -r to reach sem1', false],
          ['Beside sem1, under the new name sem1.pdf', false]],
        'When the destination is an existing directory the copy goes inside it and keeps its name. Only a destination that does not exist becomes a new file name.'),
      mcq('From `~/downloads` you run `mv report.csv ~/results/`, and `~/results` already holds a `report.csv`. What happens?',
        [['The older copy in results is replaced, with no warning', true],
          ['mv refuses, because that name is already taken there', false],
          ['The moved file is renamed report(1).csv automatically', false],
          ['mv stops and asks whether the old file may be replaced', false]],
        'mv and cp overwrite silently. The -i option is what makes them ask first, and it is worth using whenever the destination may already hold that name.'),
    ],
    checkpoint: [
      mcq('Starting in `/home/anu`, which single command creates `/home/anu/college/sem2/labs` when neither `college` nor `sem2` exists?',
        [['mkdir -p college/sem2/labs', true],
          ['mkdir college/sem2/labs', false],
          ['touch college/sem2/labs', false],
          ['cd college/sem2/labs', false]],
        'Only -p creates the missing parents. Without it mkdir fails, touch makes a file rather than a directory, and cd cannot enter what does not exist.', SH),
      mcq('You are in `/home/anu/college/sem2`. Which relative path names `/home/anu/downloads/timetable.pdf`?',
        [['../../downloads/timetable.pdf', true],
          ['../downloads/timetable.pdf', false],
          ['../../../downloads/timetable.pdf', false],
          ['/downloads/timetable.pdf', false]],
        'Two climbs reach /home/anu, which holds downloads. One climb stops at college, three go past anu, and a leading slash starts at the root.', FS),
      mcq('Which command moves every `.jpg` in the current directory into the existing directory `photos`?',
        [['mv *.jpg photos/', true],
          ['mv photos/ *.jpg', false],
          ['cp *.jpg photos/', false],
          ['rm *.jpg photos/', false]],
        'The sources come first and the destination last. Reversing them names the wrong destination, cp leaves the originals behind, and rm deletes instead of moving.', SH),
    ],
  },
  {
    unitCode: 'T_FILES_PRACTICE',
    notes: `No new commands. This builds on Organising Files from the Command Line: the same tree,
paths, \`pwd\`, \`ls\`, \`cd\`, creating, copying, moving and deleting — now with reading files,
permissions and hidden files added, applied to tasks the way they actually arrive: "share this with
a teammate", "back this up before you break it", "find out why this will not run".

**The method, for every task:**

1. **Where am I?** Run \`pwd\`. Every relative path you are about to type starts from here.
2. **What is here?** Run \`ls -la\`, so hidden files and permissions are in front of you too.
3. **Say the target as a path** before choosing a command. If you are unsure of a relative path,
   write the absolute one; it cannot be misread.
4. **Preview anything destructive.** Run the same pattern with \`ls -d\` before \`rm\`, and use \`-i\`
   when overwriting is possible.
5. **Check the result.** \`ls -l\` afterwards shows whether the file arrived, under the name and with
   the permissions you intended.

**The checklist that catches most mistakes:**

- Names containing spaces are quoted: \`"week 1"\`, not \`week 1\`.
- Directories need \`-r\` for \`cp\` and \`rm\`; \`rmdir\` only removes empty ones.
- \`mkdir -p\` when parent directories may not exist yet.
- Does the destination already exist? If it is a directory the file goes inside; if it is a file,
  it is overwritten.
- \`*\` skips dot-names, so copying \`dir/*\` leaves \`.git\` and \`.env\` behind.
- Before \`chmod\`, read \`ls -l\` and change only the bit that is wrong. Never \`chmod 777\`.
- For a directory, \`x\` is "enter" and \`w\` is "create or delete inside".
- No \`sudo\` inside your own home directory.
- If Tab will not complete a name, the name is wrong — stop and look.

**Predict, then run.** Before pressing Enter, say what the command will print or change. When the
result matches, you have evidence you understand it; when it does not, you have found exactly the
thing to learn, before it cost you a file.`,
    mcqs: [
      mcq('Your teammate is in the `team` group and must edit `report.md`, which is `-rw-r--r--` with owner you and group `team`. Which command?',
        [['chmod g+w report.md', true], ['chmod o+w report.md', false], ['chmod 777 report.md', false], ['chmod u+w report.md', false]],
        'Only the group needs write. o+w would let every user change it, and 777 also adds execute for everybody.'),
      mcq('`~/backup` exists and `~/backup/project-sep` does not. Which command backs up `~/project` completely, hidden files included?',
        [['cp -r ~/project ~/backup/project-sep', true],
          ['cp -r ~/project/* ~/backup/project-sep', false],
          ['mv ~/project ~/backup/project-sep', false],
          ['cp ~/project ~/backup/project-sep', false]],
        'Copying the directory itself includes its dotfiles. The * version skips them, mv removes the original, and cp without -r refuses a directory.'),
      mcq('`app.log` has 40,000 lines and you need only the 20 most recent. Which command?',
        [['tail -n 20 app.log', true], ['head -n 20 app.log', false], ['cat -n 20 app.log', false], ['ls -n 20 app.log', false]],
        'New lines are appended to the end of a log, so the latest twenty are its last twenty. head shows the oldest, and cat and ls do not select lines.'),
      mcq('`run.sh` is `-rw-r--r--` and `./run.sh` says "Permission denied". Which change lets only you run it?',
        [['chmod u+x run.sh', true], ['chmod a+x run.sh', false], ['chmod u+w run.sh', false], ['chmod 777 run.sh', false]],
        'Running needs the execute bit, and u limits it to the owner. a+x and 777 give it to everybody, and w is not what running checks.'),
      mcq('`ls` in your home directory does not list `.bashrc`, yet the shell reads it every time it starts. Why is it missing?',
        [['ls skips names that begin with a dot unless given -a', true],
          ['Configuration files live on a separate hidden disk', false],
          ['The file is only created when the shell next exits', false],
          ['ls shows a file only after it has been opened once', false]],
        'A leading dot is a naming convention that ls honours by default. The file is ordinary and sits in the home directory; ls -a shows it.'),
    ],
    checkpoint: [
      mcq('Before running `rm -r build*`, which command shows exactly what will be removed?',
        [['ls -d build*', true], ['ls -la', false], ['pwd build*', false], ['cat build*', false]],
        'ls -d with the same pattern lists the matching names themselves rather than the contents of matching directories.', SH),
      mcq('`~/shared` is `drwxr-x---`, owner priya, group team. A teammate in `team` cannot create a file there. Why?',
        [['The group has r and x but not w, and creating needs w', true],
          ['Only the owner may ever create files in a home directory', false],
          ['The group needs execute on each file before writing one', false],
          ['Creating a file needs read permission for others as well', false]],
        'Creating an entry changes the directory, which needs w on the directory. The group bits r-x allow listing and entering only.', FS),
      mcq('`cat notes/week3.txt` works in one terminal and says "No such file or directory" in another. What is the first thing to check?',
        [['The current directory in each, since the path is relative', true],
          ['Whether the file was deleted between the two commands', false],
          ['Whether the second terminal has permission to use cat', false],
          ['Whether todo.txt has been locked by the first terminal', false]],
        'Each terminal has its own working directory, and a relative path is read from it. pwd in both usually settles it.', FS),
    ],
  },
  {
    unitCode: 'T_FILES_DEBUGGING',
    notes: `Path and permission errors are short, precise and almost always read too quickly. The message
names the program, the path it tried and what went wrong. The skill is taking all three literally.

**The messages, and what each actually means:**

- **No such file or directory** — the path, exactly as the program saw it, does not exist. Wrong
  current directory, a typo, the wrong case, a missing parent directory, or a hidden extension.
- **Permission denied** — the path exists, but a permission bit is missing: on the file, or \`x\` on
  any directory along the way, or \`w\` on the directory you are creating something in.
- **Not a directory** / **Is a directory** — a file was used where a directory was needed, or the
  other way round: \`notes.txt/todo\`, \`cat project\`, \`rm project\` without \`-r\`.
- **command not found** — about the COMMAND, not a file argument. The program is not installed, or
  not on your PATH, or you typed \`deploy.sh\` where \`./deploy.sh\` was needed.

**The method.**

1. **Copy the exact path from the message.** Not the one you meant — the one the program used.
2. **Run \`pwd\`** if the path is relative. It is resolved from there.
3. **Walk the path from the left.** \`ls /srv\`, then \`ls /srv/course\`, and so on. The first step
   that fails is the fault. On Linux, \`namei -l /srv/course/notes.txt\` shows every component with
   its permissions in one go.
4. **Compare names exactly** with \`ls\`: case, spaces, and extensions such as \`marks.csv.txt\`
   that Windows hides by default. Tab completion is a quick oracle.
5. **For permissions, read \`ls -ld\` on the file AND its directories**, then fix the actual bit or
   owner. Reaching for \`sudo\` hides the cause.

**Worked symptoms:**

    $ python project/analyse.py
    FileNotFoundError: [Errno 2] No such file or directory: 'data/marks.csv'

\`pwd\` says \`/home/priya\`, so Python looked for \`/home/priya/data/marks.csv\`. The file is in
\`/home/priya/project/data\`. Fix: run from inside \`project\`, or build the path from the script's
own location with \`Path(__file__).parent / "data" / "marks.csv"\`.

    $ cat /home/priya/shared/notes.txt
    cat: /home/priya/shared/notes.txt: Permission denied

\`notes.txt\` is \`-rw-r--r--\`, which looks readable. \`ls -ld /home/priya\` shows \`drwx------\`:
nobody but priya can pass through her home directory, so the file cannot be reached.

    $ cd "~/college notes"
    cd: ~/college notes: No such file or directory

Inside quotes the shell does not expand \`~\`. Write \`cd ~/"college notes"\`.

    $ ./run.sh
    /usr/bin/env: 'bash\\r': No such file or directory

The file was saved with Windows line endings, so the first line asks for a program called
\`bash\` followed by an invisible carriage return. Convert it to LF line endings in the editor or
with \`dos2unix run.sh\`.

**Why this is a skill.** Each of these stops a beginner for an hour and an experienced developer
for a minute. The difference is not memory; it is reading the path in the message and checking it
one component at a time.`,
    mcqs: [
      mcq('`python analyse.py` works inside `~/project`, but `python project/analyse.py` from `~` raises FileNotFoundError for `data/marks.csv`. What is the cause?',
        [['The relative path is resolved from ~, the current working directory', true],
          ['Python cannot open data files from scripts in a subdirectory', false],
          ['The file permissions change when the script is run from home', false],
          ['data/marks.csv must be written with a leading slash to be found', false]],
        'The script looks for data/marks.csv under the current directory, which is now ~. Building the path from the script\'s location removes the dependence.'),
      mcq('`cat /srv/course/notes.txt` gives "Permission denied", yet `notes.txt` is `-rw-r--r--`. What should you check next?',
        [['Whether you have x on /srv and /srv/course along the path', true],
          ['Whether notes.txt also needs execute permission to be read', false],
          ['Whether cat is installed for your user or only for root', false],
          ['Whether the file is empty, which cat reports as denied', false]],
        'Reaching a file needs x on every directory above it. ls -ld on each, or namei -l on the full path, finds the blocked step.'),
      mcq('Running `./build.sh` prints `/usr/bin/env: \'python3\\r\': No such file or directory`, but python3 is installed. What is wrong?',
        [['The script has Windows line endings, so \\r follows the name', true],
          ['python3 is installed in a directory that is not on the PATH', false],
          ['The script is missing execute permission for its owner', false],
          ['env cannot start Python and only works for bash scripts', false]],
        'The carriage return shown as \\r became part of the interpreter name on the first line. Converting the file to LF endings fixes it.'),
      mcq('`deploy.sh` is in the current directory, but typing `deploy.sh` says "command not found". Why?',
        [['The current directory is not searched for commands; use ./deploy.sh', true],
          ['The script is missing its execute bit, which gives this exact error', false],
          ['Shell scripts can only be run by passing them to the sh command', false],
          ['The file must first be moved into /tmp before it can be run', false]],
        'A bare name is looked up only in the PATH directories. ./ gives an explicit path, and a missing execute bit would say Permission denied instead.'),
    ],
    checkpoint: [
      mcq('As an ordinary user, `touch /usr/local/share/app.conf` says "Permission denied". What is the actual cause?',
        [['You lack w on /usr/local/share, a directory owned by root', true],
          ['app.conf is read-only and cannot be updated by touch', false],
          ['touch can only create files inside your home directory', false],
          ['The /usr/local/share directory does not exist at all', false]],
        'Creating a file needs write permission on the directory. A missing directory would say No such file or directory instead.', FS),
      mcq('`cd "~/college notes"` fails with "No such file or directory", but the directory exists. Why?',
        [['The shell does not expand ~ inside quotes', true],
          ['cd cannot enter a directory whose name has spaces', false],
          ['Double quotes must be single quotes for cd to work', false],
          ['The directory needs x permission for the group', false]],
        'Tilde expansion happens only when ~ is unquoted. cd ~/"college notes" keeps the space safe and still expands the home path.', SH),
      mcq('`open("Marks.csv")` works on your Windows laptop but fails on the Linux server, where the file is `marks.csv`. Why?',
        [['Linux names are case-sensitive, so Marks.csv is a different name', true],
          ['Linux cannot open CSV files without an extra library installed', false],
          ['The server stores the file in a different encoding from Windows', false],
          ['Python on Linux only opens files named with all lower-case', false]],
        'Windows ignored the case difference; Linux compares names exactly. Matching the real name, as ls shows it, fixes it.', FS),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────────────────
  // T_EDITOR
  // ─────────────────────────────────────────────────────────────────────────────────────────
  {
    unitCode: 'T_EDITOR_CHOOSING_EDITOR',
    notes: `A code editor is where you will spend most of your working hours, so the first job is to have
one installed, pointed at the right folder, and set up so it does not work against you.

**Editor or IDE.** A code editor (VS Code, Sublime Text, Vim or Neovim) is general-purpose and gains
language support through extensions. An IDE (PyCharm, IntelliJ IDEA, Visual Studio) is built around
one language family and ships with more built in. Either is fine. This topic uses **VS Code** as the
example because it is free, runs on Windows, macOS and Linux, and handles every language in the
first year. Note that Visual Studio and Visual Studio Code are different products.

**The editor is not the language.** Installing VS Code does not install Python, a C compiler or
Node.js. Those are separate programs, and the editor must be told which one to use — in VS Code,
run "Python: Select Interpreter". A red "Import could not be resolved" on a library you installed
is very often the editor pointing at a different Python.

**Open a folder, not a file.** Use File > Open Folder on the project directory, or run \`code .\` in
a terminal inside it (on macOS, first run "Shell Command: Install 'code' command in PATH"). Search,
the integrated terminal, Git and language features all work from the folder you opened. A single
file opened on its own gets few of them.

**Learn one shortcut today: the Command Palette.** \`Ctrl+Shift+P\` (\`Cmd+Shift+P\` on macOS) opens a
box where every command can be searched by name. You never need to remember where a menu item is.

**Settings worth changing on day one** (File > Preferences > Settings, then search):

- **Auto Save** (\`files.autoSave\`) — or learn to read the tab: a filled dot means UNSAVED. Running a
  program runs the file on disk, so unsaved edits simply do not exist yet. This is the commonest
  "my change did nothing".
- **Tab size and spaces** (\`editor.tabSize\`, \`editor.insertSpaces\`) — four spaces for Python.
- **Line endings** (\`files.eol\`) — LF for code that will run on Linux.
- **Trim trailing whitespace** (\`files.trimTrailingWhitespace\`) and a readable font size.

**User and workspace settings.** User settings apply everywhere. A project can carry its own in
\`.vscode/settings.json\`; those override user settings for that folder, and committing them gives
every teammate the same behaviour.

**The integrated terminal** (View > Terminal) opens in the project folder, so the paths you type
match the files you see.

**Why it matters.** Most early "the computer is broken" moments are an unsaved file, the wrong
folder or the wrong interpreter. Ten minutes of setup removes all three.`,
    mcqs: [
      mcq('You install VS Code, write `hello.py`, and running it fails with "python: command not found". Why?',
        [['VS Code does not include Python; it must be installed separately', true],
          ['The file needs to be saved with a .vscode extension to run', false],
          ['Python programs can only be run from an IDE such as PyCharm', false],
          ['VS Code runs only one language, chosen when it is installed', false]],
        'The editor edits and launches code; the language runtime is a separate program it has to find.'),
      mcq('Why open the whole project folder in the editor instead of a single file?',
        [['Search, the terminal and language features work from that folder', true],
          ['A single file cannot be saved unless its folder is open as well', false],
          ['Opening a folder makes the editor compile every file in advance', false],
          ['The editor only highlights syntax in files inside an open folder', false]],
        'The opened folder is the editor\'s idea of the project. Project-wide search, Git and imports all resolve from it.'),
      mcq('An editor tab shows a filled dot instead of a close button. What does that mean?',
        [['The file has changes that have not yet been saved to disk', true],
          ['The file contains an error that the editor has detected', false],
          ['The file is read-only and any edits will be discarded', false],
          ['The file is being run in the terminal at this moment', false]],
        'The dot marks unsaved changes. A program run now uses the older version stored on disk.'),
      mcq('A project contains `.vscode/settings.json` with a tab size of 2, and your user settings say 4. What applies in that project?',
        [['2, because workspace settings override user settings there', true],
          ['4, because your user settings always take priority over files', false],
          ['An average of 3, since the editor combines the two values', false],
          ['Neither, since conflicting settings are ignored completely', false]],
        'Workspace settings are the more specific scope, so they win inside that folder and nowhere else.'),
    ],
    checkpoint: [
      mcq('You change a `print` line and rerun the program from the terminal, but the output is unchanged. The tab shows a dot. What happened?',
        [['The edit was never saved, so the old file on disk ran again', true],
          ['The terminal caches output and repeats the previous result', false],
          ['The editor runs a compiled copy made when it was first opened', false],
          ['print output is only refreshed after the editor is restarted', false]],
        'Programs read files from disk. Until the file is saved, your change exists only in the editor.'),
      mcq('Teammates on Windows keep saving scripts with CRLF line endings, which break on the Linux server. Which editor-level fix suits the whole team?',
        [['Set files.eol to LF in the committed workspace settings', true],
          ['Ask each person to switch their editor to a dark theme', false],
          ['Turn off Auto Save so the endings are not written to disk', false],
          ['Increase the tab size so the line endings are preserved', false]],
        'A workspace setting in .vscode/settings.json travels with the repository, so every copy of the editor saves LF.'),
      mcq('You cannot find where the "format on save" option lives in the menus. What is the most reliable route?',
        [['Search for it by name in the Settings editor or Command Palette', true],
          ['Reinstall the editor, since the option appears only on first run', false],
          ['Edit the editor\'s program files to switch the behaviour on', false],
          ['Look in each menu in turn until the option finally appears', false]],
        'Both the Settings editor and the Command Palette search every option by name, which is why neither needs memorising menus.'),
    ],
  },
  {
    unitCode: 'T_EDITOR_NAVIGATION',
    notes: `Past a few hundred lines, scrolling stops being a way to find anything. A real project is
hundreds of files, and reading code means jumping: to a file, to a line, to where a function is
defined and to everywhere it is used. Editors call these moves by different names; the moves
themselves are universal.

**Jump to a file by name.** Quick Open, \`Ctrl+P\` (\`Cmd+P\` on macOS), matches loosely: typing
\`gpacalc\` finds \`src/grades/gpa_calculator.py\`. You never need to open folders in the sidebar.

**Jump to a line.** \`Ctrl+G\`, then the number. Combined with Quick Open, a traceback's
\`grades.py, line 214\` becomes Quick Open, \`grades.py:214\`, Enter.

**Jump to a symbol.** In Quick Open, start with \`@\` to list the functions and classes in the
current file, or use \`#\` (or \`Ctrl+T\`) to search symbols across the whole project. The Outline view
and the breadcrumbs above the editor show the same structure.

**Go to Definition.** Put the cursor on a name and press \`F12\`, or Ctrl+click it (Cmd+click on
macOS). The editor opens the file where that function, class or variable is defined. **Peek
Definition** (\`Alt+F12\`) shows it in a small inline window without leaving your place.

**Find All References.** \`Shift+F12\` lists every place that particular symbol is used — the
question to ask before you change a function's parameters.

**Go Back.** After three jumps you want to return. Go Back (\`Alt+Left\` on Windows, \`Ctrl+-\` on
macOS; also in the Go menu) walks back through your navigation history, one jump at a time.

**Jump to the next problem.** \`F8\` moves to the next error or warning the editor has flagged.

**Where the intelligence comes from.** Definition and references are answered by a **language
server** — a program that understands the language, installed with the language's extension. It
knows that \`total\` in one function is not \`total\` in another.

**The misconception: Go to Definition is a text search.** It is not, which is why it is precise —
and also why it fails when language support is missing or pointed at the wrong interpreter. "No
definition found" on your own function usually means the editor does not understand the file,
not that the function is absent. Check that the language extension is installed and the right
interpreter is selected before doubting the code.

**Why it matters.** Most programming time is spent reading code, much of it written by someone
else. A student who can reach any definition in five seconds reads a codebase; one who scrolls
reads a file.`,
    mcqs: [
      mcq('You know a file called something like `payment_validator.py` is deep in a large project. What is the fastest way to open it?',
        [['Quick Open, then type part of the name such as payval', true],
          ['Expand the folders in the sidebar until the file appears', false],
          ['Run a project-wide text search for the word payment', false],
          ['Open the terminal and cd through each directory in turn', false]],
        'Quick Open matches file names loosely, so a few letters from the name are enough, wherever the file lives.'),
      mcq('You see `calculate_gpa(marks)` called and want to read the body of `calculate_gpa`, which is in another file. What do you use?',
        [['Go to Definition, with F12 or Ctrl+click on the name', true],
          ['Find in File, searching for the def keyword in this file', false],
          ['Go Back, which returns to where the function was written', false],
          ['Quick Open, typing the call exactly as it appears here', false]],
        'Go to Definition resolves the name to where it is defined, across files. Find in File searches only the current file.'),
      mcq('Before changing the order of a function\'s parameters, what should you ask the editor for?',
        [['Find All References, to see every call that will need updating', true],
          ['Peek Definition, to confirm the parameters are already correct', false],
          ['Go to Line, to check the number of the function\'s first line', false],
          ['The Outline view, to see where the function sits in its file', false]],
        'Every caller passes arguments in the old order. References lists them so none is missed.'),
      mcq('Go to Definition on your own function in a Python file says "No definition found". What is the most likely cause?',
        [['Python language support is missing or using the wrong interpreter', true],
          ['The function has been defined in a file that is not saved yet', false],
          ['Go to Definition only works on functions from the standard library', false],
          ['The function name is too short for the editor to be able to index', false]],
        'Definition lookups come from the language server. Without it, or with it misconfigured, the editor cannot resolve names.'),
    ],
    checkpoint: [
      mcq('You have jumped through three definitions and want to return to where you started. What is the quickest way?',
        [['Use Go Back repeatedly to retrace the navigation history', true],
          ['Close the three new tabs, which restores the original line', false],
          ['Scroll up through the first file until you recognise the code', false],
          ['Use Find All References on the last symbol you jumped to', false]],
        'The editor records each jump. Go Back retraces them in order, returning you to the exact line.'),
      mcq('A traceback says the error is in `grades.py, line 214`. What is the fastest way there?',
        [['Quick Open grades.py:214, or open it and use Go to Line', true],
          ['Open grades.py in the sidebar and scroll to line 214', false],
          ['Search the project for 214 and pick the matching result', false],
          ['Use Go to Definition on the word grades in the traceback', false]],
        'Quick Open accepts a line number after the file name, so a traceback location is one command away.'),
      mcq('You are renaming a local variable `total`. Why is Find All References more reliable than a text search for "total"?',
        [['It finds uses of that one symbol, not every word spelled the same', true],
          ['It searches faster because it reads only the files that are open', false],
          ['It also finds uses in files that the project has not saved yet', false],
          ['It ignores comments, which a text search cannot be told to skip', false]],
        'Other functions may have their own total, and the word appears inside names like subtotal. References follow meaning, not spelling.'),
    ],
  },
  {
    unitCode: 'T_EDITOR_SEARCH',
    notes: `Search is how you answer "where is this used?", "where did that message come from?" and "did I
leave any debug prints in?". Every editor has it; using it properly means knowing its options and,
more importantly, what it cannot see.

**Three scopes.**

- **Find in the current file:** \`Ctrl+F\` (\`Cmd+F\` on macOS). **Replace:** \`Ctrl+H\`
  (\`Cmd+Option+F\` on macOS).
- **Search across the project:** \`Ctrl+Shift+F\`. Results are grouped by file; clicking one opens
  it at the match.
- **Terminal:** \`grep -rn\`, covered in the shell pipelines topic, for machines with no editor.

**The three toggles in the search box:**

- **Match Case** — \`userId\` no longer matches \`UserId\`.
- **Match Whole Word** — \`total\` no longer matches \`subtotal\` or \`total_marks\`.
- **Use Regular Expression** — patterns instead of fixed text.

**Narrowing.** Expand the search panel's "files to include" and "files to exclude" boxes. \`src/**/*.py\`
limits a search to Python files under \`src\`; \`tests\` in the exclude box drops test files.

**A few regular expressions pay for themselves:**

    print\\s*\\(          print( with optional spaces: leftover debug prints
    user_?id             userid or user_id (turn Match Case off for userId too)
    ^def \\w+\\(          lines that start a Python function definition

Brackets and dots mean something in a regex, so a literal \`(\` is written \`\\(\`.

**What a project search misses:**

- **Excluded folders.** VS Code skips \`node_modules\` by default and respects \`.gitignore\`, so a
  virtual environment or build folder listed there is not searched.
- **Other spellings.** \`userId\` in JavaScript, \`user_id\` in Python and \`USER_ID\` in SQL are the same
  idea and three different strings.
- **Names built at run time.** \`getattr(report, "export_" + kind)\` calls \`export_pdf\` without ever
  writing that name.
- **Unsaved edits in other windows** and files outside the opened folder.

**The misconception: zero results means unused.** It means no match for that exact text in the
files that were searched. Before deleting something "nobody uses", check the excluded folders, the
other spellings and the dynamic calls.

**Replace All is a blunt tool.** Replacing \`count\` with \`total\` across a project also rewrites
\`account\`, \`discount\` and the word in every error message. Preview the results first, turn on
Match Whole Word, and for renaming a code identifier prefer **Rename Symbol** (\`F2\`), which uses the
language server and changes only that symbol.

**Why it matters.** Search is your fastest map of an unfamiliar codebase. Knowing its blind spots
is what separates "I checked" from "I checked properly".`,
    mcqs: [
      mcq('Searching for `total` also returns `subtotal` and `total_marks`. Which option removes those?',
        [['Match Whole Word', true], ['Match Case', false], ['Use Regular Expression', false], ['Files to exclude', false]],
        'Whole Word only matches total where it stands alone as a word. Match Case would still find it inside other names.'),
      mcq('A project-wide search finds nothing for a helper you know is defined in the project\'s `venv` folder. Why?',
        [['venv is ignored by the search, for example through .gitignore', true],
          ['Project search only looks inside files that are open in tabs', false],
          ['Helpers in a virtual environment are compiled and unreadable', false],
          ['Search needs Match Case on before it will look inside folders', false]],
        'Search respects ignore files and exclude settings by default. Folders like venv and node_modules are commonly skipped.'),
      mcq('With regular expressions on, which pattern finds calls such as `print(x)` and `print (x)`?',
        [['print\\s*\\(', true], ['print(', false], ['print.*', false], ['\\bprint\\b', false]],
        '\\s* allows optional spaces and \\( is a literal bracket. An unescaped ( starts a group, and the last two also match the word in comments.'),
      mcq('You must rename a function that is called in thirty files. Which editor feature is safest?',
        [['Rename Symbol, which changes only uses of that function', true],
          ['Replace All across the project with Match Case turned on', false],
          ['Find in File, repeated in each of the thirty files in turn', false],
          ['Quick Open, followed by editing the definition line only', false]],
        'Rename Symbol follows the language server\'s understanding of the code, so same-spelled text elsewhere is left alone.'),
    ],
    checkpoint: [
      mcq('A search for `userId` returns 3 results, but the bug report quotes `user_id` from the Python API layer. What should you conclude?',
        [['Search the other spellings too, such as the regex user_?id', true],
          ['The API layer is not part of the project and can be ignored', false],
          ['The three results are all the places the value is ever used', false],
          ['Search is broken and the editor should be restarted to fix it', false]],
        'Search matches exact text. The same concept is often spelled differently in each language or layer.'),
      mcq('After Replace All of `count` with `total` across the project, the code no longer runs. What most likely happened?',
        [['It also changed count inside other names, such as account', true],
          ['Replace All only updates files that are currently open', false],
          ['The replacement was applied twice, giving totaltotal', false],
          ['Replace All deletes the lines where it finds each match', false]],
        'Without Match Whole Word, every occurrence of the letters is replaced, including inside unrelated identifiers and strings.'),
      mcq('How do you limit a project search to Python files under the `src` folder?',
        [['Put src/**/*.py in the files to include box', true],
          ['Turn on Match Case and type .py in the query', false],
          ['Open src in a new window and use Find in File', false],
          ['Add src to the files to exclude box and search', false]],
        'The include pattern restricts which files are searched; ** matches any depth of subfolders.'),
    ],
  },
  {
    unitCode: 'T_EDITOR_RUNNING_AND_DEBUGGING',
    notes: `Adding \`print\` statements works for one value. Once the question is "what are all the values,
at this moment, and how did they get like that", a debugger is faster and shows you more. This unit
is how to use one, and how to read what the editor is already telling you.

**Two places messages appear, and they are different.**

- **The Problems panel** (\`Ctrl+Shift+M\`) and the squiggles under code come from the language server
  and linter reading your code WITHOUT running it: undefined names, syntax errors, wrong imports.
- **The Terminal** shows what happened when the code RAN. A Python traceback's last line is the
  error; the lowest frame in your own file is where it surfaced. Ctrl+click the \`file:line\` to jump
  there.

An empty Problems panel does not mean the program is correct. \`int("abc")\` is valid code that
fails only at run time.

**The debugger's controls** (VS Code shortcuts; every debugger has the same five ideas):

- **Breakpoint** — click the gutter left of a line number, or press \`F9\`. A red dot appears.
- **Start Debugging** — \`F5\`. The program runs until it reaches a breakpoint and PAUSES. It
  pauses BEFORE that line runs.
- **Step Over** (\`F10\`) — run the current line, including any function it calls, and stop at the next.
- **Step Into** (\`F11\`) — go inside the function called on this line.
- **Step Out** (\`Shift+F11\`) — finish the current function and stop back in its caller.
- **Continue** (\`F5\`) — run on to the next breakpoint.

While paused, the **Variables** panel shows every local value, **Watch** evaluates expressions you
type (\`len(marks)\`, \`total / count\`) at each pause, **Call Stack** shows how you got here — click a
frame to see its variables — and the **Debug Console** evaluates anything you like.

**Conditional breakpoints.** A loop fails on item 4,812 of 5,000. Right-click the gutter, choose
Add Conditional Breakpoint, and enter \`i == 4812\`. The program pauses only when it matters.

**The method.**

1. Reproduce the fault and read the traceback or the wrong output.
2. Put a breakpoint BEFORE the point where the value goes wrong, not on the crash line.
3. Predict the values you expect there.
4. Step, comparing each value with your prediction. The first line where they disagree is the bug.

**Worked symptoms:**

- *An average comes out far too low.* Watch \`total\` and \`count\` and step through the loop:
  \`total\` resets every iteration, because \`total = 0\` was indented inside the loop, so only the
  last mark is left when the loop ends.
- *A breakpoint is never hit.* The program was started with Run Without Debugging or from the
  terminal, or that line never executes — which is itself the clue: the condition guarding it is false.
- *The debugger seems frozen.* The program is waiting at \`input()\`; type the value in the terminal.
- *FileNotFoundError only under F5.* The debugger's working directory is the workspace folder, not
  the script's folder. Set \`"cwd"\` in \`.vscode/launch.json\`, or build paths from the script's location.

**The misconception: a paused line has already run.** It has not. If execution is paused on
\`total = total + mark\`, the Variables panel shows \`total\` BEFORE the addition. Press \`F10\` to see after.`,
    mcqs: [
      mcq('You set a breakpoint on line 12 and press F5. The program finishes and prints its output without ever pausing. What is the most likely explanation?',
        [['Line 12 never ran, or the program was started without debugging', true],
          ['Breakpoints only pause the program on lines that contain a print', false],
          ['The breakpoint was removed automatically when the file was saved', false],
          ['F5 runs the program at full speed and skips over any breakpoints', false]],
        'A breakpoint pauses only a debugged process that reaches that line. If it is skipped, check which branch the code took before it.'),
      mcq('Paused on `result = compute(data)`, you want to see what happens inside `compute`. Which control?',
        [['Step Into', true], ['Step Over', false], ['Step Out', false], ['Continue', false]],
        'Step Into enters the called function. Step Over would run the whole of compute and stop on the next line.'),
      mcq('A loop over 5,000 records crashes only on record 4,812. How do you pause exactly there?',
        [['Add a conditional breakpoint with the condition i == 4812', true],
          ['Set a normal breakpoint and press Continue 4,812 times', false],
          ['Add a print inside the loop and read all 5,000 lines out', false],
          ['Step Over repeatedly from the start of the loop to reach it', false]],
        'A conditional breakpoint evaluates the expression on each pass and pauses only when it is true.'),
      mcq('The Problems panel is empty, yet running the program ends with a TypeError. How can both be true?',
        [['Problems lists what static analysis sees; this error needs real values', true],
          ['The Problems panel only lists errors in files you have not yet saved', false],
          ['A TypeError is a warning, and warnings never appear in the panel', false],
          ['The terminal is showing an old error from an earlier run of the code', false]],
        'Static checks read code without running it. Many errors depend on the values present at run time and appear only in the terminal.'),
    ],
    checkpoint: [
      mcq('Execution is paused on the line `total = total + mark`, and the Variables panel shows `total` as 150. Has that line run yet?',
        [['No: 150 is the value before this line adds the mark', true],
          ['Yes: 150 is the new total after the mark was added', false],
          ['Partly: the right side has run but not the assignment', false],
          ['It depends on whether the line was reached by Step Into', false]],
        'The debugger stops before executing the highlighted line. Step Over runs it and shows the updated value.'),
      mcq('You pressed Step Into by mistake and are now deep inside a library function. How do you get back to your own code fastest?',
        [['Step Out until the paused line is back in your own function', true],
          ['Step Over every line of the library until it returns to you', false],
          ['Stop debugging and restart, since stepping cannot be undone', false],
          ['Delete the breakpoint, which returns execution to its line', false]],
        'Step Out finishes the current function and pauses in its caller, climbing one frame each time.'),
      mcq('`python analyse.py` from inside `src` works, but starting the same script with F5 raises FileNotFoundError for `data/marks.csv`. What is the likely cause?',
        [['The debugger runs with the workspace folder as its working directory', true],
          ['Files opened under the debugger must be given absolute paths only', false],
          ['The debugger cannot read CSV files until an extension is installed', false],
          ['F5 runs the last saved version, which did not yet contain the file', false]],
        'A relative path is read from the working directory, which the debugger sets to the workspace root by default. Set cwd in launch.json or build the path from the script.'),
    ],
  },
];
