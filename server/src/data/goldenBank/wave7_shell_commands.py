# -*- coding: utf-8 -*-
"""
Wave 7 — SHELL_COMMANDS, 50 Golden Bank questions, all newly authored.

NO COMMAND IS EVER SPELLED. Every one is described by what it does — "a command that copies", "a
command that removes" — because a question rewarding recall of a flag measures memory of a manual
page and dates with the next release. What is measured is what a command would act on, what it
would leave behind, and what it would destroy.

THIS SKILL ISSUES ONE COMMAND; ITS SIBLING COMPOSES SEVERAL. No family here mentions a pipe or a
redirection, and no family in SHELL_PIPELINES turns on what an individual command does. The two
divide cleanly and are kept that way, because a bank that blurred them would measure one skill
twice and neither well.

THE DANGEROUS ANSWER IS ALMOST ALWAYS "IT ACTS ON MORE THAN YOU MEANT". A pattern that matches an
unexpected name, a name split in two by a space, a recursive option reaching further than the
visible contents. Every stem in those families writes out the directory so the reach can be
counted rather than guessed.

A NAME CONTAINING A SPACE PRODUCES A COMMAND THAT SUCCEEDS ON TWO WRONG THINGS rather than one
that fails. That is the answer worth measuring, and it is why quoting matters more than it looks.
"""

Q = []


def q(qid, family, difficulty, prompt, correct, distractors, explanation,
      provenance='AUTHORED', source='', evidence=None, mode=None, hinge=None):
    assert len(distractors) == 3, qid
    it = {'id': qid, 'family': family, 'difficulty': difficulty, 'prompt': prompt,
          'correct': correct, 'distractors': list(distractors), 'explanation': explanation,
          'provenance': provenance, 'source': source}
    if evidence:
        it['evidence'] = evidence
    if mode:
        it['mode'] = mode
    if hinge:
        it['hinge'] = hinge
    Q.append(it)


# =========================================================================
# SC_FAM01_LINE_ANATOMY — D1 x4, D2 x1
# =========================================================================
q('GB_SC_001', 'SC_FAM01_LINE_ANATOMY', 'D1',
  'A command line names a command, then a setting that changes how it behaves, then a file. Which '
  'part is the thing being acted on?',
  'The file',
  ['The command name', 'The setting', 'All three equally'],
  'The command says what to do and the setting adjusts how, leaving the file as what it is done '
  'to. The three parts have distinct roles.')

q('GB_SC_002', 'SC_FAM01_LINE_ANATOMY', 'D1',
  'What is the purpose of a setting given on a command line?',
  'To change how the command behaves',
  ['To name what the command acts on',
   'To say where the output should go',
   'To name the user running the command'],
  'A setting adjusts behaviour and does not supply the target. Confusing the two is what makes a '
  'command act on nothing or on the wrong thing.')

q('GB_SC_003', 'SC_FAM01_LINE_ANATOMY', 'D1',
  'A command line lists three file names after the command. What does that usually mean?',
  'The command acts on all three',
  ['The command acts on the first and ignores the rest',
   'The command acts on the last only',
   'The command will refuse, since it expects one file'],
  'Most commands accept several targets and act on each. That is what makes a pattern expanding '
  'to many names work at all.')

q('GB_SC_004', 'SC_FAM01_LINE_ANATOMY', 'D1',
  'Why does the order of the parts on a command line matter?',
  'Because the command has to be named first and its targets identified as targets',
  ['Because commands run their parts left to right as separate steps',
   'Because the last part is always ignored',
   'It does not matter; the parts can be given in any order'],
  'The command name comes first because it decides how everything after it is read. Settings and '
  'targets are then distinguished by their form.')

q('GB_SC_005', 'SC_FAM01_LINE_ANATOMY', 'D2',
  'A user means to act on a file named in a certain way and the command reports that it cannot '
  'find a file with that name, while also behaving unusually. The name resembles the form a '
  'setting takes. What has most likely happened?',
  'The name was read as a setting rather than as a target',
  ['The file has been deleted',
   'The command does not accept targets',
   'The command was misspelled'],
  'A target that looks like a setting is read as one, so the command adjusts its behaviour and '
  'finds no target at all. Files whose names begin like settings need marking as targets '
  'explicitly.')

# =========================================================================
# SC_FAM02_CURRENT_LOCATION — D1 x3, D2 x1
# =========================================================================
q('GB_SC_006', 'SC_FAM02_CURRENT_LOCATION', 'D1',
  'A command is given a file name with no path. Where does it look for the file?',
  'In the directory the session is currently in',
  ['In the user home directory always',
   'In the directory where the command itself is installed',
   'Everywhere on the machine'],
  'A bare name is read from wherever the session happens to be. That location is a property of '
  'the session rather than of the command.')

q('GB_SC_007', 'SC_FAM02_CURRENT_LOCATION', 'D1',
  'Is the current directory a property of the session or of the command being run?',
  'Of the session',
  ['Of the command', 'Of the user account', 'Of the machine'],
  'The session carries a current directory and every command run from it inherits that. Two '
  'sessions on the same machine can be in different places.')

q('GB_SC_008', 'SC_FAM02_CURRENT_LOCATION', 'D1',
  'Two terminal sessions are open on one machine. Must they be in the same directory?',
  'No; each keeps its own current directory',
  ['Yes; the machine has one current directory',
   'Yes, if the same user opened both',
   'Only if both are running commands'],
  'Each session tracks its own location independently. Moving around in one has no effect on the '
  'other.')

q('GB_SC_009', 'SC_FAM02_CURRENT_LOCATION', 'D2',
  'A user runs a command that works, moves to a different directory, and runs the identical '
  'command line, which now fails. Nothing on disk has changed. What explains it?',
  'The bare names in the command resolved to different places from the two directories',
  ['The command was corrupted by the move',
   'The command can only be run once per session',
   'The second directory has different permissions on the command'],
  'The command line is identical and what it names is not, because bare names depend on where '
  'they are read from. Using paths that begin at the top removes the dependence.')

# =========================================================================
# SC_FAM03_PURPOSE_MATCH — D1 x3, D2 x1
# =========================================================================
q('GB_SC_010', 'SC_FAM03_PURPOSE_MATCH', 'D1',
  'A user wants a second copy of a file, keeping the original. Which kind of command does that?',
  'One that copies',
  ['One that moves', 'One that removes', 'One that lists'],
  'Copying leaves the original where it was and creates a second. Moving would relocate the one '
  'file rather than producing two.')

q('GB_SC_011', 'SC_FAM03_PURPOSE_MATCH', 'D1',
  'A user wants to give a file a different name in the same directory. Which kind of command does '
  'that?',
  'One that moves',
  ['One that copies', 'One that removes', 'One that inspects'],
  'Renaming and relocating are the same operation: the entry changes and no second copy appears. '
  'Copying would leave the old name in place as well.')

q('GB_SC_012', 'SC_FAM03_PURPOSE_MATCH', 'D1',
  'A user wants to see what a text file contains without changing it. Which kind of command does '
  'that?',
  'One that displays contents',
  ['One that lists names in a directory',
   'One that copies the file',
   'One that changes the file permissions'],
  'Displaying contents and listing names answer different questions. A listing tells you the file '
  'is there and nothing about what is in it.')

q('GB_SC_013', 'SC_FAM03_PURPOSE_MATCH', 'D2',
  'A user wants to know which files in a directory were changed most recently. Which kind of '
  'command answers that?',
  'One that lists names together with their details',
  ['One that displays the contents of each file',
   'One that copies the directory somewhere else',
   'One that searches inside the files for text'],
  'The question is about the entries rather than the contents, so a detailed listing answers it. '
  'Opening every file would answer a different question slowly.')

# =========================================================================
# SC_FAM04_NAVIGATION_RESULT — D2 x1, D3 x1
# =========================================================================
q('GB_SC_014', 'SC_FAM04_NAVIGATION_RESULT', 'D2',
  'A session starts in /home/asha, moves into reports, and then moves up one level. Where is it?',
  '/home/asha',
  ['/home/asha/reports', '/home', '/'],
  'Moving in and then back up returns to the starting point, which is /home/asha. One further '
  'move up would have reached the directory above it.')

q('GB_SC_015', 'SC_FAM04_NAVIGATION_RESULT', 'D3',
  'A session starts in /var/log, moves up two levels, and then moves into tmp. Where is it?',
  '/tmp',
  ['/var/tmp', '/var/log/tmp', '/tmp/log'],
  'Two levels up from /var/log reaches the top of the tree, and entering tmp from there gives '
  '/tmp. Climbing only one level would have left the session inside /var.')

# =========================================================================
# SC_FAM05_LISTING_CONTENT — D2 x1, D3 x1
# =========================================================================
q('GB_SC_016', 'SC_FAM05_LISTING_CONTENT', 'D2',
  'A plain listing of a directory produces no output. What follows?',
  'Nothing was shown, which does not establish that the directory is empty',
  ['The directory is definitely empty',
   'The directory does not exist',
   'The user lacks permission to read it'],
  'Entries whose names mark them as hidden are left out of a plain listing. An empty result and '
  'an empty directory are different things.')

q('GB_SC_017', 'SC_FAM05_LISTING_CONTENT', 'D3',
  'A directory contains a subdirectory holding four files. A plain listing of the directory shows '
  'one entry. Why?',
  'A listing shows what is in the directory, and the subdirectory is one entry',
  ['The listing failed to read the subdirectory',
   'The four files are hidden',
   'The listing shows only the first entry'],
  'The subdirectory is a single entry however much is inside it. Reaching inside is a separate '
  'request.')

# =========================================================================
# SC_FAM06_COPY_MOVE_EFFECT — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_SC_018', 'SC_FAM06_COPY_MOVE_EFFECT', 'D2',
  'A file is moved from one directory to another. What exists afterwards?',
  'One file, in the new directory',
  ['Two files, one in each directory',
   'One file, in the old directory',
   'Two files, both in the new directory'],
  'Moving relocates the single file rather than duplicating it. Copying is what would leave two.')

q('GB_SC_019', 'SC_FAM06_COPY_MOVE_EFFECT', 'D3',
  'A file called report.txt is copied into a directory that already contains a different file '
  'called report.txt. What is the likely result?',
  'The existing file is replaced by the copy, and its previous contents are gone',
  ['The copy is refused because the name is taken',
   'The copy is renamed automatically to avoid the clash',
   'Both files exist afterwards under the same name'],
  'Most such commands overwrite without asking. Two entries cannot share one name in a '
  'directory, so one of them has to go.')

q('GB_SC_020', 'SC_FAM06_COPY_MOVE_EFFECT', 'D4',
  'A user copies notes.txt into a backup directory each evening. Tonight the backup directory '
  'already holds a notes.txt from last night, which they wanted to keep. The copy replaces any '
  'file of the same name in the destination, and both files are called notes.txt. What happens '
  'to last night version?',
  'It is replaced and its contents are lost',
  ['It is kept, since the two came from different days',
   'It is renamed automatically before the copy arrives',
   'The copy is refused, leaving last night version intact'],
  'Nothing about the file records which day it came from, so the name is all the command sees. '
  'Including a date in the destination name is what would keep both.',
  evidence='The copy replaces any file of the same name in the destination, and both files are '
           'called notes.txt')

# =========================================================================
# SC_FAM07_PATTERN_MATCH — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_SC_021', 'SC_FAM07_PATTERN_MATCH', 'D2',
  'A directory contains a.txt, b.txt, c.log and notes.txt. A pattern matching anything ending in '
  '.txt is used. Which entries are selected?',
  'a.txt, b.txt and notes.txt',
  ['a.txt and b.txt only', 'Every entry in the directory', 'c.log only'],
  'The pattern selects by name and every name ending in .txt qualifies, including the longer '
  'one. The log file does not.')

q('GB_SC_022', 'SC_FAM07_PATTERN_MATCH', 'D3',
  'A directory contains report.txt, report1.txt, report2.txt and a subdirectory called reports '
  'holding three more .txt files. A pattern matching anything ending in .txt is used. Which '
  'entries are selected?',
  'The three .txt files in this directory, and none of those inside the subdirectory',
  ['All six .txt files, including those in the subdirectory',
   'Only report.txt, since the others have digits',
   'The subdirectory as well, since its name begins with report'],
  'A pattern of this kind selects entries in the directory it is applied to and does not descend. '
  'The subdirectory name does not end in .txt.')

q('GB_SC_023', 'SC_FAM07_PATTERN_MATCH', 'D4',
  'A directory contains data.csv, data_old.csv, .data_hidden.csv and archive.csv. A user applies a '
  'pattern matching anything beginning with data. A general pattern does not match names beginning '
  'with a dot, and one of the four begins with one. Which entries are selected?',
  'data.csv and data_old.csv',
  ['data.csv, data_old.csv and .data_hidden.csv',
   'data.csv only',
   'All four entries'],
  'Names beginning with a dot are excluded from ordinary patterns deliberately, so the hidden '
  'file is left out. Archive.csv does not begin with data.',
  evidence='A general pattern does not match names beginning with a dot')

# =========================================================================
# SC_FAM08_DESTRUCTIVE_EFFECT — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_SC_024', 'SC_FAM08_DESTRUCTIVE_EFFECT', 'D2',
  'A file is removed with a command that deletes it. Where does it go?',
  'Nowhere; it is gone and there is no bin to recover it from',
  ['To a recycle bin, from which it can be restored',
   'To a temporary directory for a period',
   'To the directory above, renamed'],
  'A command-line removal does not pass through a bin. Recovery afterwards depends on a backup '
  'having been taken.')

q('GB_SC_025', 'SC_FAM08_DESTRUCTIVE_EFFECT', 'D3',
  'A directory contains four files. A removal command is applied with a pattern matching anything '
  'ending in .tmp, and three of the four end in .tmp. What is lost?',
  'The three .tmp files, without any confirmation being asked',
  ['All four files',
   'Nothing, until the user confirms',
   'The three .tmp files, after a confirmation prompt'],
  'The pattern selects three names and the command acts on each. Nothing asks first unless it has '
  'been set up to.')

q('GB_SC_026', 'SC_FAM08_DESTRUCTIVE_EFFECT', 'D4',
  'A user means to remove files ending in .bak and types a pattern that matches everything '
  'instead. The directory holds twelve files, three of them .bak. The pattern selects all twelve '
  'names and the command acts on each without asking. What is lost?',
  'All twelve files',
  ['The three .bak files only',
   'Nothing, since the pattern was clearly a mistake',
   'The three .bak files, with the rest reported as errors'],
  'The command has no way to know which of the twelve were intended. Listing what a pattern '
  'matches before removing is the habit this exists to justify.',
  evidence='The pattern selects all twelve names and the command acts on each without asking')

# =========================================================================
# SC_FAM09_TREE_REACH — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_SC_027', 'SC_FAM09_TREE_REACH', 'D2',
  'A command is told to work throughout a tree, starting at a directory. How far does it reach?',
  'Everything below that directory, at every depth',
  ['Only the immediate contents',
   'Only the directories, not the files',
   'Only two levels down'],
  'Working throughout a tree means every level below the starting point. Depth is not limited '
  'unless something limits it.')

q('GB_SC_028', 'SC_FAM09_TREE_REACH', 'D3',
  'A directory holds two files and one subdirectory. That subdirectory holds three files and '
  'another subdirectory holding one file. A command working throughout the tree is applied to the '
  'top directory. How many files does it reach?',
  'Six',
  ['Two', 'Five', 'Three'],
  'Two at the top, three in the first subdirectory and one deeper: Six in all. Counting only the '
  'entries directly inside the starting directory would give a much smaller answer.')

q('GB_SC_029', 'SC_FAM09_TREE_REACH', 'D4',
  'A user applies a removal command throughout a tree, meaning to clear one subdirectory, and '
  'gives the parent directory by mistake. The parent holds nine files of its own and four '
  'subdirectories. Working throughout a tree reaches every level below the directory given, and '
  'the directory given was the parent. What is lost?',
  'The nine files, all four subdirectories and everything inside them',
  ['Only the one subdirectory that was intended',
   'The nine files only, with the subdirectories left alone',
   'The four subdirectories only, with the nine files left alone'],
  'Naming the parent hands the command the whole tree beneath it. This single mistake is the '
  'reason for listing what a command would reach before running it.',
  evidence='Working throughout a tree reaches every level below the directory given')

# =========================================================================
# SC_FAM10_NAME_SPLITTING — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_SC_030', 'SC_FAM10_NAME_SPLITTING', 'D2',
  'A file is named "my report.txt", with a space in the middle. It is given to a command '
  'unquoted. What does the command receive?',
  'Two separate targets, "my" and "report.txt"',
  ['One target, "my report.txt"',
   'One target, "myreport.txt"',
   'Nothing, since the name is invalid'],
  'A space separates one part of a command line from the next, so the name arrives as two. '
  'Quoting is what keeps it together.')

q('GB_SC_031', 'SC_FAM10_NAME_SPLITTING', 'D3',
  'A removal command is given the unquoted name "old notes.txt" in a directory that happens to '
  'contain a file called old and a file called notes.txt. What is removed?',
  'Both old and notes.txt',
  ['Nothing, since no file is called old notes.txt',
   'Only the file called old',
   'A file called oldnotes.txt, if one exists'],
  'The command receives two names, both of which exist, and removes both. It succeeds completely '
  'and does entirely the wrong thing.')

q('GB_SC_032', 'SC_FAM10_NAME_SPLITTING', 'D4',
  'A script builds a file name from a value that sometimes contains a space, and passes it '
  'unquoted to a command. Most of the time the value has no space and the script works. An '
  'unquoted value containing a space arrives as two separate targets rather than one. What '
  'happens on the day it does?',
  'The command acts on two things instead of one, and reports success',
  ['The command fails and the script stops',
   'The command acts on the first part and ignores the second',
   'The script refuses to build the name'],
  'Nothing detects the split, so the failure is silent and intermittent. That the script has '
  'worked for months is exactly what makes the day it does not so confusing.',
  evidence='An unquoted value containing a space arrives as two separate targets rather than one')

# =========================================================================
# SC_FAM11_NOT_FOUND_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_SC_033', 'SC_FAM11_NOT_FOUND_DIAGNOSIS', 'D3',
  'A command reports that a file does not exist. The user can see the file listed in a window on '
  'the same machine. What is the most likely explanation?',
  'The session is in a different directory from the one being viewed',
  ['The file was deleted a moment ago',
   'The command lacks permission to see it',
   'The file name contains an invisible character'],
  'The command looked where the session is and the window is showing somewhere else. Both '
  'reports are accurate about different places.')

q('GB_SC_034', 'SC_FAM11_NOT_FOUND_DIAGNOSIS', 'D4',
  'A command reports that a file does not exist. A listing of the current directory shows a file '
  'whose name looks identical. The listing shows the name and the command searched the same '
  'directory, so the two names must differ in something not visible. What is the likely cause?',
  'The two names differ in something that does not show, such as a trailing space or a differing '
  'character',
  ['The session is in a different directory',
   'The user lacks permission on the file',
   'The command was misspelled'],
  'Being in the wrong directory is ruled out by the stem, which leaves the names themselves. '
  'Names that look identical and differ invisibly are a genuine and maddening case.',
  evidence='The listing shows the name and the command searched the same directory')

# =========================================================================
# SC_FAM12_OVERMATCH_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_SC_035', 'SC_FAM12_OVERMATCH_DIAGNOSIS', 'D3',
  'A user intends to act on files beginning with log and finds that a directory called logs was '
  'affected too. Why?',
  'The pattern matched the directory name as well, since it also begins with log',
  ['Directories are always included regardless of the pattern',
   'The command treats directories as files',
   'The directory was affected by a different command'],
  'A pattern matches names, and a directory has a name like anything else. Nothing about being a '
  'directory exempts it.')

q('GB_SC_036', 'SC_FAM12_OVERMATCH_DIAGNOSIS', 'D4',
  'A user applies a pattern intending to select three files and twelve entries are affected. The '
  'directory contains twelve entries in total. The pattern matched every entry in the directory '
  'rather than the three intended. What does that indicate about the pattern?',
  'It was general enough to match every name present',
  ['It matched only files and there were twelve files',
   'It matched the three intended files three times each',
   'The command ignored the pattern entirely'],
  'Twelve of twelve is the signature of a pattern that constrains nothing. Listing what a pattern '
  'expands to before acting is what turns this into a non-event.',
  evidence='The pattern matched every entry in the directory rather than the three intended')

# =========================================================================
# SC_FAM13_FORESIGHT_REASONING — D3 x1, D4 x1, D5 x3
# =========================================================================
q('GB_SC_037', 'SC_FAM13_FORESIGHT_REASONING', 'D3',
  'A user is about to remove files matching a pattern and wants to know first what would go. What '
  'should they do?',
  'Apply the same pattern to a command that only lists',
  ['Run the removal and watch what happens',
   'Take a backup of the directory',
   'Remove the files one at a time'],
  'Listing with the identical pattern shows exactly the set the removal would act on. A backup '
  'is a good habit and answers a different question.')

q('GB_SC_038', 'SC_FAM13_FORESIGHT_REASONING', 'D4',
  'A user plans a destructive command and takes a full backup first. A colleague says they should '
  'still list what the command would affect. A backup allows recovery afterwards and does not '
  'show what the command would act on beforehand. Is the colleague right?',
  'Yes; the backup allows recovery and does not tell them what is about to happen',
  ['No; the backup makes the listing unnecessary',
   'No; listing and backing up achieve the same thing',
   'Yes, but only if the backup might be incomplete'],
  'Recovering from a mistake and avoiding one are different goods, and the backup only offers the '
  'first. Noticing that a pattern matches twelve things rather than three costs nothing.',
  evidence='A backup allows recovery afterwards and does not show what the command would act on '
           'beforehand')

q('GB_SC_039', 'SC_FAM13_FORESIGHT_REASONING', 'D5',
  'A user lists what a pattern matches, sees the expected three files, and then runs the removal '
  'ten minutes later. In the intervening ten minutes another process created four more files '
  'matching the same pattern. What happens?',
  'Seven files are removed, since the pattern is evaluated again when the removal runs',
  ['Three files are removed, as listed',
   'Three files are removed and the four new ones are reported as errors',
   'The removal is refused because the directory changed'],
  'The listing described the directory at the moment it ran, and the pattern is expanded afresh. '
  'On a directory something else writes to, the gap between checking and acting is the risk.',
  mode='EDGE',
  hinge='In the intervening ten minutes another process created four more files matching the same '
        'pattern')

q('GB_SC_040', 'SC_FAM13_FORESIGHT_REASONING', 'D5',
  'A team wants a script to remove old files safely. A colleague proposes having it print what it '
  'would remove and do nothing, until somebody has read the output. Printing without acting lets '
  'the set be checked before anything is destroyed. What does the proposal buy?',
  'The chance to see the set before anything is destroyed, at the cost of a second run',
  ['Nothing; the script will remove the same files either way',
   'A guarantee that the right files are removed',
   'Protection against the directory changing between the two runs'],
  'It buys review and guarantees nothing, since the set can change between the two runs. That '
  'remaining gap is why this is a safeguard rather than a proof.',
  mode='TRANSFER',
  hinge='Printing without acting lets the set be checked before anything is destroyed')

q('GB_SC_041', 'SC_FAM13_FORESIGHT_REASONING', 'D5',
  'A user is about to run a destructive command and cannot decide whether the risk justifies the '
  'time spent checking. The command would act on a directory holding work that exists nowhere '
  'else. The material exists in no other copy, so a mistake could not be undone. What follows?',
  'The check is worth its cost, since a mistake here cannot be undone',
  ['The check is unnecessary, since the command is simple',
   'The check is unnecessary if the user is experienced',
   'The command should not be run at all'],
  'Irreversibility is what makes checking worth the time rather than the complexity of the '
  'command. The same command against a directory with a backup would be a different decision.',
  mode='EDGE', hinge='The material exists in no other copy')

# =========================================================================
# SC_FAM14_COMMAND_CHOICE — D4 x1, D5 x4
# =========================================================================
q('GB_SC_042', 'SC_FAM14_COMMAND_CHOICE', 'D4',
  'A user must place a file in a second directory while keeping it available in the first. The '
  'file must remain in the original directory and must also be present in the second. Which '
  'command fits?',
  'One that copies',
  ['One that moves', 'One that removes and recreates', 'One that renames'],
  'Keeping both requires a duplicate, which is what copying produces. Moving satisfies the second '
  'requirement and breaks the first.',
  evidence='The file must remain in the original directory and must also be present in the second')

q('GB_SC_043', 'SC_FAM14_COMMAND_CHOICE', 'D5',
  'A user must clear temporary files from a directory that also holds work in progress. The '
  'temporary files all end in .tmp and no file of value ends in .tmp. Only .tmp files are to go '
  'and no valuable file carries that ending. Which approach fits?',
  'A removal restricted to a pattern matching .tmp, applied to that directory only',
  ['A removal applied throughout the tree, to be thorough',
   'A removal of everything, followed by restoring the work in progress',
   'Removing the files one by one after inspecting each'],
  'The pattern is exactly as wide as the requirement. Working throughout the tree reaches '
  'directories nobody mentioned, and inspecting each by hand is unnecessary given the stated '
  'rule.',
  mode='TRANSFER', hinge='Only .tmp files are to go and no valuable file carries that ending')

q('GB_SC_044', 'SC_FAM14_COMMAND_CHOICE', 'D5',
  'A user must remove a directory and everything in it. A colleague suggests removing the files '
  'first and then the directory, to be careful. Working throughout the tree does both in one step '
  'and reaches the same set of things. What is the difference between the two approaches?',
  'None in what is destroyed; the careful route only makes the set visible along the way',
  ['The careful route destroys less',
   'The careful route is safer because it can be stopped partway',
   'The single command destroys more than the careful route'],
  'Both end with the same directory gone. What the slower route offers is the chance to notice '
  'something unexpected before it is too late, and it can indeed be stopped partway — which is a '
  'reason to prefer it and not a difference in reach.',
  mode='EDGE', hinge='Working throughout the tree does both in one step')

q('GB_SC_045', 'SC_FAM14_COMMAND_CHOICE', 'D5',
  'A user must rename two hundred files according to a rule. They can do it by hand or write a '
  'short loop. The rule is mechanical and applies to every one of the two hundred files in the '
  'same way. Which fits?',
  'The loop, since the rule is uniform and two hundred repetitions invite mistakes',
  ['By hand, since a loop might affect the wrong files',
   'By hand, since two hundred is not many',
   'The loop, but only after renaming ten by hand first'],
  'Uniformity is what makes the work automatable and repetition is what makes doing it by hand '
  'error-prone. Testing the loop on a copy first is a sensible refinement rather than a reason to '
  'avoid it.',
  mode='TRADEOFF',
  hinge='The rule is mechanical and applies to every one of the two hundred files in the same way')

q('GB_SC_046', 'SC_FAM14_COMMAND_CHOICE', 'D5',
  'A user must free space and can either remove old files or move them to slower storage. The '
  'files are needed a few times a year and cannot be regenerated. The files cannot be regenerated '
  'and are still wanted occasionally. Which fits?',
  'Moving them to slower storage, since they are still wanted and cannot be recreated',
  ['Removing them, since they are used only a few times a year',
   'Removing them, since space is the stated problem',
   'Leaving them where they are'],
  'Both facts point the same way: still wanted rules out removal and irreproducible makes removal '
  'irreversible. Rarity of use is an argument about where they live rather than whether they '
  'should exist.',
  mode='TRADEOFF',
  hinge='The files cannot be regenerated and are still wanted occasionally')

# =========================================================================
# SC_FAM15_UNFAMILIAR_COMMAND_TRANSFER — D4 x1, D5 x3
# =========================================================================
q('GB_SC_047', 'SC_FAM15_UNFAMILIAR_COMMAND_TRANSFER', 'D4',
  'A command is documented as acting on every entry below the directory it is given, following '
  'the tree to any depth, and as asking for no confirmation. A user gives it their home '
  'directory. It follows the tree to any depth from the directory given and asks for no '
  'confirmation. What would it act on?',
  'Everything anywhere below their home directory',
  ['Only the entries directly inside their home directory',
   'Only the files, leaving the directories alone',
   'Nothing, until the user confirms'],
  'The documented behaviour settles it without any need to recognise the command. Reading what a '
  'command says it does is what makes an unfamiliar one safe to reason about.',
  evidence='It follows the tree to any depth from the directory given and asks for no '
           'confirmation')

q('GB_SC_048', 'SC_FAM15_UNFAMILIAR_COMMAND_TRANSFER', 'D5',
  'A command is documented as taking a source and a destination, and as replacing the destination '
  'if it exists. A user gives it two file names by mistake in the wrong order. The command '
  'replaces whatever is at the destination, and the two names were supplied the wrong way round. '
  'What happens?',
  'The file they meant to keep is replaced by the one they meant to overwrite',
  ['The command refuses, since the order is wrong',
   'The command detects the mistake and swaps them',
   'Both files are left unchanged'],
  'The command cannot know which order was intended, and both names are valid in either position. '
  'The documented replacement behaviour is what makes the mistake destructive rather than '
  'harmless.',
  mode='TRANSFER',
  hinge='The command replaces whatever is at the destination, and the two names were supplied the '
        'wrong way round')

q('GB_SC_049', 'SC_FAM15_UNFAMILIAR_COMMAND_TRANSFER', 'D5',
  'A command is documented as expanding any pattern it is given before acting, and as acting on '
  'every resulting name. A user gives it a pattern in a directory they have not looked at. The '
  'pattern is expanded against a directory whose contents the user has not seen. What is the '
  'safest next step?',
  'List what the pattern expands to in that directory before running the command',
  ['Run the command, since the pattern was written carefully',
   'Run the command from a different directory',
   'Give the command a single file name instead of the pattern'],
  'The pattern is precise and the directory is unknown, so what it selects is unknown. Listing '
  'first converts an unknown set into a visible one.',
  mode='TRANSFER',
  hinge='The pattern is expanded against a directory whose contents the user has not seen')

q('GB_SC_050', 'SC_FAM15_UNFAMILIAR_COMMAND_TRANSFER', 'D5',
  'A command is documented as reporting success whether or not it found anything to act on. A '
  'script uses it and treats success as meaning the work was done. Success is reported even when '
  'nothing was found, so a successful result does not establish that anything happened. What is '
  'wrong with the script?',
  'It cannot distinguish work done from nothing found, since both report success',
  ['Nothing; success means the command ran correctly',
   'The command should be replaced, since reporting success is misleading',
   'The script should run the command twice to be certain'],
  'The command is behaving exactly as documented, which is why reading the documentation matters '
  'here. Checking that the expected change actually occurred is what the script has to do '
  'instead.',
  mode='EDGE', hinge='Success is reported even when nothing was found')
