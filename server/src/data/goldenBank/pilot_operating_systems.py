# -*- coding: utf-8 -*-
"""
Phase 3 pilot — the 50 Golden Bank questions for OPERATING_SYSTEMS.

THE BLUEPRINT IS FROZEN. Every item names a family that already exists in
foundation-golden-bank-blueprint.csv, and the count per (family, difficulty) matches that
file's plannedD1..plannedD5 exactly. Nothing here redesigns a taxonomy, skill, concept, fact,
family or allocation; the generator refuses if it did.

EACH ENTRY IS (id, familyId, difficulty, prompt, correctAnswer, [three distractors], explanation).

The correct answer is stored SEPARATELY from the distractors rather than as a letter, for two
reasons. It makes the key impossible to mis-set — the defect found in the existing bank was a
key pointing at the wrong option — and it lets the generator place the answer at a position
chosen by a fixed rotation, so the correct letter is spread evenly instead of sitting on A fifty
times. A bank whose answer is usually A is answerable without reading it.

DISTRACTORS ARE THE BLUEPRINT'S NAMED MISCONCEPTIONS, not filler. Where the blueprint says the
productive distractor is the one students actually believe — a file manager mistaken for an
operating system, a permission on the file confused with one on its directory, free disk space
offered as a cure for a memory shortage — that belief is one of the three options.

DIFFICULTY IS REASONING DEMAND, NOT PROSE. D1 recognises, D2 takes one step, D3 takes several,
D4 diagnoses from evidence that rules alternatives out, D5 transfers to an arrangement nobody has
been taught or weighs a trade-off and names its cost.
"""

Q = []


def q(qid, family, diff, prompt, correct, distractors, explanation):
    assert len(distractors) == 3, qid
    Q.append({
        'id': qid, 'family': family, 'difficulty': diff, 'prompt': prompt,
        'correct': correct, 'distractors': list(distractors), 'explanation': explanation,
    })


# =========================================================================
# OS_FAM01_RESPONSIBILITY_IDENTIFICATION — D1 x3
# Given a described job, decide whether the OS is responsible for it.
# Three different resources: processor time, memory, storage.
# =========================================================================
q('GB_OS_001', 'OS_FAM01_RESPONSIBILITY_IDENTIFICATION', 'D1',
  'Two programs are running at the same time. Which of these is the operating system\'s job?',
  'Deciding which of them uses the processor next',
  ['Checking the spelling of text typed into one of them',
   'Working out the answer to a calculation one of them performs',
   'Deciding which of them matters more to the person\'s work'],
  'Sharing the processor between programs is the operating system\'s decision. Spell-checking '
  'belongs to the application, the arithmetic is carried out by the processor itself, and how '
  'much a program matters to someone is a judgement the operating system has no basis for.')

q('GB_OS_002', 'OS_FAM01_RESPONSIBILITY_IDENTIFICATION', 'D1',
  'A program is closed. Which of these does the operating system do?',
  'Reclaims the memory the program was using',
  ['Deletes the files the program created',
   'Removes the program from the machine',
   'Saves whatever the person had not yet saved'],
  'Memory handed to a program is taken back when it ends, so another program can use it. Closing '
  'a program does not delete its files, uninstall it, or save work on the person\'s behalf — each '
  'of those is a separate action somebody has to ask for.')

q('GB_OS_003', 'OS_FAM01_RESPONSIBILITY_IDENTIFICATION', 'D1',
  'A program asks to save a file. Which part decides where on the storage device the data is '
  'actually placed?',
  'The operating system',
  ['The program that asked to save it',
   'The person, through the name they gave the file',
   'The storage device itself, with no software involved'],
  'The program says what to save and under what name; where those bytes physically land is the '
  'operating system\'s decision, because it is the part that keeps track of what the device '
  'already holds. The name the person chose is a label, not a location.')

# =========================================================================
# OS_FAM14_OS_RECOGNITION — D1 x3, D2 x1
# From named software, identify which items are operating systems.
# =========================================================================
q('GB_OS_004', 'OS_FAM14_OS_RECOGNITION', 'D1',
  'Which of these is an operating system?',
  'Linux',
  ['Firefox', 'Microsoft Word', 'File Explorer'],
  'Linux manages the machine and everything else runs on top of it. A browser and a word '
  'processor are plainly applications; a file manager is the harder case, because it arrives '
  'with the system and looks like part of it, but it is an application that asks the operating '
  'system to do the work.')

q('GB_OS_005', 'OS_FAM14_OS_RECOGNITION', 'D1',
  'Three of these are operating systems. Which one is not?',
  'File Explorer',
  ['Android', 'Windows', 'macOS'],
  'File Explorer is a program for browsing files; the operating system underneath it is what '
  'actually reads the disk. Android, Windows and macOS each manage a machine\'s resources for '
  'every other program on it.')

q('GB_OS_006', 'OS_FAM14_OS_RECOGNITION', 'D1',
  'A phone runs Android and a laptop runs Windows. What kind of software are both of these?',
  'Operating systems',
  ['Applications the owner chose to install',
   'Web browsers',
   'Device drivers'],
  'Both manage their machine\'s processor, memory, storage and devices on behalf of everything '
  'else running there, which is what makes something an operating system. A driver is a much '
  'smaller piece of software that handles one device, under the operating system.')

q('GB_OS_007', 'OS_FAM14_OS_RECOGNITION', 'D2',
  'A machine already has Windows installed. Linux is then installed alongside it, and the person '
  'chooses between the two each time the machine starts. Which statement is correct?',
  'Both are operating systems, and only one manages the machine at a time',
  ['Linux becomes an application running inside Windows',
   'The machine now has two file managers but still one operating system',
   'Windows must be removed before Linux can manage the machine'],
  'An operating system takes charge of the whole machine, so two of them cannot be in charge at '
  'once — but both can be installed, with the choice made at startup. Neither is running inside '
  'the other, and neither has to be removed for the other to work.')

# =========================================================================
# OS_FAM15_PROCESS_TERM_RECOGNITION — D1 x2, D2 x1
# Choose the term that names the described thing. Vocabulary, not reasoning.
# =========================================================================
q('GB_OS_008', 'OS_FAM15_PROCESS_TERM_RECOGNITION', 'D1',
  'A text editor is installed on a machine, but nobody has opened it. What is the correct term '
  'for the editor as it sits on the disk?',
  'A program',
  ['A process', 'A driver', 'A directory'],
  'On disk it is a program: a stored set of instructions, doing nothing. It only becomes a '
  'process once it is loaded and running.')

q('GB_OS_009', 'OS_FAM15_PROCESS_TERM_RECOGNITION', 'D1',
  'Someone opens that text editor and it appears on screen. What is the correct term for the '
  'copy now running in memory?',
  'A process',
  ['A program', 'A file', 'An operating system'],
  'The running copy is a process — the program in execution, with memory of its own. The program '
  'is still on the disk, unchanged, and could be started again as a second process.')

q('GB_OS_010', 'OS_FAM15_PROCESS_TERM_RECOGNITION', 'D2',
  'Which statement uses the terms "program" and "process" correctly?',
  'A program is stored on disk; a process is that program running in memory',
  ['A process is stored on disk; a program is that process running in memory',
   'A program and a process are two names for the same thing',
   'A process is a program that has finished running'],
  'The distinction is between the stored instructions and a running copy of them. Swapping the '
  'terms, treating them as synonyms, or attaching "process" to something that has ended all lose '
  'the one difference the words exist to mark.')

# =========================================================================
# OS_FAM16_FILE_VS_DIRECTORY — D1 x2
# Which described items are files, which are directories, what a directory holds.
# =========================================================================
q('GB_OS_011', 'OS_FAM16_FILE_VS_DIRECTORY', 'D1',
  'What does a directory actually contain?',
  'Entries naming the files and directories inside it',
  ['The data of every file inside it, joined together',
   'Only files, never other directories',
   'A copy of each file inside it'],
  'A directory holds names and references, not the data itself — which is why moving a file '
  'between directories does not touch its contents. Directories can also contain other '
  'directories, which is what makes the structure a tree.')

q('GB_OS_012', 'OS_FAM16_FILE_VS_DIRECTORY', 'D1',
  'Which of these reliably tells you that something is a file rather than a directory?',
  'Nothing in the name does; the system records which it is',
  ['Its name ends with a dot and an extension',
   'Its name is longer than a directory\'s would be',
   'It appears lower down in a listing'],
  'An extension is part of a name and nothing more — a directory may be named with one and a '
  'file may have none. Which of the two something is, is recorded by the system, not inferred '
  'from how the name looks.')

# =========================================================================
# OS_FAM11_STARTUP_DEPENDENCY — D2 x1
# Identify what must already be running before a described thing can start.
# =========================================================================
q('GB_OS_013', 'OS_FAM11_STARTUP_DEPENDENCY', 'D2',
  'A machine is switched on and someone immediately tries to open a spreadsheet application. '
  'Why can it not start yet?',
  'The operating system it depends on is not running yet',
  ['The application loads the operating system, and that takes time',
   'The application\'s own files have not been read from the disk yet',
   'The processor has not finished its first calculation'],
  'An application needs the operating system for everything it does — memory, files, the screen '
  '— so it cannot run before the operating system does. The dependency runs one way: the '
  'operating system does not wait for the application, and the application does not load it.')

# =========================================================================
# OS_FAM13_INTERFACE_EQUIVALENCE — D2 x1, D3 x1
# Whether a described task can be done from either interface, and what actually differs.
# =========================================================================
q('GB_OS_014', 'OS_FAM13_INTERFACE_EQUIVALENCE', 'D2',
  'A file can be renamed by typing a command, or by clicking it and typing a new name. What is '
  'happening in the two cases?',
  'The same operating system service is asked to do the same thing, in two different ways',
  ['The typed command changes the file directly, while the click asks the operating system to',
   'Each interface keeps its own separate record of the files',
   'The typed command does something the graphical interface is unable to do'],
  'Both are ways of asking the operating system to rename a file, and it is the operating system '
  'that does it either way. What differs is how the request is expressed, not what happens '
  'underneath or who carries it out.')

q('GB_OS_015', 'OS_FAM13_INTERFACE_EQUIVALENCE', 'D3',
  'Someone is told that a particular task "can only be done from the command line". What is the '
  'most accurate reading of that claim?',
  'The graphical tools installed happen not to offer it, though the system itself can do it',
  ['The operating system refuses to perform that task when a graphical program asks',
   'The task needs privileges that only the command line is granted',
   'The task changes files, and graphical programs cannot change files'],
  'Both interfaces ask the same operating system for the same services, so a claim like this is '
  'about which tools expose the task, not about what the system permits. Nothing about arriving '
  'through a graphical program changes what is allowed or what is possible.')

# =========================================================================
# OS_FAM04_MULTITASKING_MECHANISM — D2 x1, D3 x1
# How multitasking appears simultaneous, and what limits it.
# =========================================================================
q('GB_OS_016', 'OS_FAM04_MULTITASKING_MECHANISM', 'D2',
  'A machine with one processor core appears to run a browser, a music player and an editor at '
  'the same time. What is actually happening?',
  'The operating system switches between them fast enough that the switching is not noticed',
  ['All three run at the same instant, because one core can handle three things at once',
   'Each program has been given a processor core of its own',
   'Two are paused entirely until the third is closed'],
  'One core executes one thing at a time, so simultaneity is an appearance produced by switching '
  'quickly. If any of the other options were true there would be nothing for a scheduler to '
  'decide.')

q('GB_OS_017', 'OS_FAM04_MULTITASKING_MECHANISM', 'D3',
  'On a single-core machine, more and more programs are opened. Every one of them keeps '
  'responding, but everything feels slower. What accounts for this?',
  'The same processor time is now divided among more programs, so each waits longer for its turn',
  ['The processor runs more slowly as the number of programs grows',
   'Each new program takes a share of the speed of the machine\'s memory',
   'The operating system adds a delay deliberately, to keep the machine stable'],
  'The amount of processor time per second is fixed; opening more programs does not create more '
  'of it, it only divides it further, so each program\'s turn comes round less often. The '
  'processor itself has not changed speed, and nothing is being slowed on purpose.')

# =========================================================================
# OS_FAM02_RESOURCE_ALLOCATION — D2, D3, D4
# Predict what happens when two programs need the same resource at once.
# =========================================================================
q('GB_OS_018', 'OS_FAM02_RESOURCE_ALLOCATION', 'D2',
  'Two programs both ask to use the printer at the same moment. What happens?',
  'The operating system lets one use it and makes the other wait',
  ['Both print at once, and the pages come out interleaved',
   'The second program\'s request fails and it reports an error',
   'The two programs agree between themselves which goes first'],
  'Arbitrating between competing requests is the operating system\'s job, and waiting is the '
  'normal outcome — not failure, not interleaved output, and not a negotiation, since the two '
  'programs have no way to reach each other.')

q('GB_OS_019', 'OS_FAM02_RESOURCE_ALLOCATION', 'D3',
  'Two programs are both reading large amounts of data from the same disk. Neither fails, but '
  'each is slower than it would be alone. What explains this?',
  'The operating system is giving each of them turns at a device that serves one request at a time',
  ['The disk halves its own speed whenever two programs use it',
   'Each program is waiting for the other to finish before it begins',
   'The operating system has lowered the priority of both programs'],
  'The device can serve one request at a time, so two streams of requests are interleaved and '
  'each program spends part of its time waiting. Neither is blocked outright — that is why both '
  'still finish — and the disk has not changed speed.')

q('GB_OS_020', 'OS_FAM02_RESOURCE_ALLOCATION', 'D4',
  'Two programs request the same device. In one case the second program waits and then succeeds; '
  'in another the second program is refused straight away. What decides which of these happens?',
  'Whether the operating system queues requests for that device or grants one program exclusive use',
  ['Whether the second program was written to cope with waiting',
   'Which of the two programs the person started first',
   'Whether the two programs belong to the same application'],
  'Both outcomes are the operating system arbitrating; they differ in the policy it applies to '
  'that resource. Some resources are shared by taking turns, others are handed to one holder '
  'until released, and it is that choice — not the program, its author or its start time — that '
  'produces waiting rather than refusal.')

# =========================================================================
# OS_FAM03_PROCESS_COMPARISON — D2, D3, D4
# How many processes exist in a described situation, and what each has of its own.
# =========================================================================
q('GB_OS_021', 'OS_FAM03_PROCESS_COMPARISON', 'D2',
  'The same text editor is started twice, so two editor windows are open, each holding a '
  'different document. How many processes are running?',
  'Two, each with memory of its own',
  ['One, because only one editor is installed',
   'One, because both windows show the same program',
   'Two, sharing a single block of memory between them'],
  'Each start produces a separate process with its own memory, whatever the windows look like. '
  'One installed program can be running as many independent processes at once.')

q('GB_OS_022', 'OS_FAM03_PROCESS_COMPARISON', 'D3',
  'Two copies of the same editor are running. The zoom level is changed in one of them, and the '
  'other is unaffected. Why?',
  'Each running copy holds its own memory, so a value set in one does not exist in the other',
  ['The setting is written to disk only when the program closes',
   'The two copies take turns, and the change has not reached the second one yet',
   'Zoom affects only the display and is not part of a program\'s state'],
  'The two processes came from one program but do not share memory, so a value one holds is '
  'invisible to the other. There is no delay involved and nothing is waiting to be written — '
  'the second copy simply never had that value.')

q('GB_OS_023', 'OS_FAM03_PROCESS_COMPARISON', 'D4',
  'The same editor is opened twice. Changing a preference in one copy leaves the other '
  'unchanged. Both are then closed, the editor is opened again, and the preference has changed. '
  'What accounts for both observations together?',
  'The preference was written to a file that a copy reads when it starts, while the running copies '
  'each kept their own value in memory',
  ['Once the first copy closed, the second was able to read its memory',
   'Closing a process passes its memory on to the next process that starts',
   'The operating system merges the memory of processes from the same program when they end'],
  'Two facts have to hold at once: the running copies were isolated, and something outlived both '
  'of them. Memory explains the first, a file on disk explains the second. The other options all '
  'require one process to reach another\'s memory, which is exactly what the operating system '
  'prevents.')

# =========================================================================
# OS_FAM06_MEMORY_ISOLATION — D2, D3, D4
# What a process can and cannot reach, and what becomes of its memory when it exits.
# =========================================================================
q('GB_OS_024', 'OS_FAM06_MEMORY_ISOLATION', 'D2',
  'A program holds a password in memory while it runs. Another program running at the same time '
  'tries to read that memory. What happens?',
  'The operating system does not allow it; each process reaches only its own memory',
  ['It succeeds, because running programs share the machine\'s memory',
   'It succeeds, provided both programs were started by the same person',
   'It succeeds, but the value that comes back is scrambled'],
  'Keeping processes out of one another\'s memory is one of the operating system\'s core jobs, '
  'and it does not depend on who started them. The attempt is refused outright rather than '
  'allowed and obscured.')

q('GB_OS_025', 'OS_FAM06_MEMORY_ISOLATION', 'D3',
  'A program that had been using a large amount of memory is closed. What becomes of that memory?',
  'The operating system reclaims it and can hand it to another program',
  ['It stays reserved for that program in case it is started again',
   'It is cleared only when the machine is restarted',
   'It goes to the next program that asks, with the previous contents still in it'],
  'Memory is lent for as long as a process exists and taken back when it ends, which is what '
  'lets a machine run far more programs over a day than would fit at once. It is not held in '
  'reserve, and it is not passed on still carrying the last process\'s data.')

q('GB_OS_026', 'OS_FAM06_MEMORY_ISOLATION', 'D4',
  'One program crashes. Every other program keeps running normally and the machine stays up. '
  'What does that tell you about how memory was arranged?',
  'Each process had memory of its own, so damage inside one could not reach the others',
  ['The crash happened before the program had been given any memory',
   'The operating system copied the other programs\' memory to disk in time',
   'The other programs had already finished using their memory'],
  'The survival of everything else is the evidence: a fault confined to one process is a fault '
  'that could not touch memory belonging to another. Had memory been shared, one program writing '
  'wrongly could have corrupted the rest.')

# =========================================================================
# OS_FAM07_PATH_REASONING — D2, D3, D4
# What a described path refers to, or which path reaches a given file.
# =========================================================================
q('GB_OS_027', 'OS_FAM07_PATH_REASONING', 'D2',
  'A machine holds /home/work/report.txt and /home/archive/report.txt. Which statement is correct?',
  'They are two different files that happen to share a name',
  ['They are one file, reachable by two different paths',
   'Only one of them can exist at a time',
   'The second one is a shortcut to the first'],
  'A name only has to be unique within its own directory, so the same name in two directories '
  'names two unrelated files. Editing one leaves the other exactly as it was.')

q('GB_OS_028', 'OS_FAM07_PATH_REASONING', 'D3',
  'The current directory is /home/work. A program is asked to open notes.txt. Which file does it '
  'open?',
  '/home/work/notes.txt',
  ['/notes.txt',
   '/home/notes.txt',
   'Whichever notes.txt was opened most recently'],
  'A name given without a leading slash is resolved against the current directory, so it means '
  'notes.txt inside /home/work. Nothing about the resolution depends on history — the same name '
  'from a different current directory would mean a different file.')

q('GB_OS_029', 'OS_FAM07_PATH_REASONING', 'D4',
  'A script finds data.txt when it is run from /home/work, and fails to find it when the very '
  'same script is run from /home. The file has not been moved or altered. What explains this?',
  'The script names the file relatively, so it is looked for in whatever directory the script is '
  'run from',
  ['The file\'s contents changed when the working directory changed',
   'Running from /home gives the script fewer permissions',
   'A file can only be opened from the directory that contains it'],
  'The script is unchanged and the file is unchanged, so what changed is the starting point the '
  'name is measured from — the signature of a relative path. Naming the file from the root '
  'instead would make the script behave the same wherever it is run.')

# =========================================================================
# OS_FAM09_DEVICE_INTERACTION — D2, D4
# Order the parts involved, and identify which part knows the device specifics.
# =========================================================================
q('GB_OS_030', 'OS_FAM09_DEVICE_INTERACTION', 'D2',
  'A word processor prints a document. Which describes the route the request takes?',
  'The application asks the operating system, which uses the printer\'s driver to reach the printer',
  ['The application reaches the printer directly',
   'The printer\'s driver is part of the application and reaches the printer from there',
   'The printer needs no software; the application sends it the page'],
  'Applications do not address hardware themselves. The operating system stands in between, and '
  'the driver is the piece that knows how this particular printer expects to be spoken to.')

q('GB_OS_031', 'OS_FAM09_DEVICE_INTERACTION', 'D4',
  'Two different printers are attached to a machine. The same application prints to both, and '
  'nothing about the application was changed to make that work. Which part knows how each '
  'printer expects to be addressed?',
  'Each printer\'s own driver',
  ['The application, which identifies the model when it starts',
   'The operating system, which contains instructions for every printer ever made',
   'The printer itself, which converts whatever it is sent'],
  'The application being identical for both is the evidence: whatever differs between the '
  'printers must be held somewhere the application is not. That is the driver — one per device, '
  'so a new printer means a new driver rather than a new version of every application.')

# =========================================================================
# OS_FAM05_SCHEDULING_REASONING — D3, D4, D5 x3
# Which process can run next and why the others cannot. A blocked process in every variant.
# =========================================================================
q('GB_OS_032', 'OS_FAM05_SCHEDULING_REASONING', 'D3',
  'Three programs are open. One is waiting for the person to type something, one has finished '
  'and exited, and one has calculations still to do. Which can the scheduler run next?',
  'The one with calculations still to do',
  ['The one waiting for typing, as it has waited longest',
   'The one that has exited, so that it releases its resources',
   'Any of them; the choice is made at random'],
  'Only a process that is ready can be given the processor. Waiting for input is not ready — '
  'running it would achieve nothing, because the thing it needs has not arrived — and a process '
  'that has exited no longer exists to be run.')

q('GB_OS_033', 'OS_FAM05_SCHEDULING_REASONING', 'D4',
  'A program shows no sign of activity, yet the processor is mostly idle. Which explanation fits '
  'what is observed?',
  'It is waiting for something outside the processor, so processor time would not help it',
  ['The scheduler has given all the processor time to other programs',
   'The program has been given too little memory to run',
   'The processor is too slow for this program'],
  'An idle processor is the clue that settles it: if time were available and the program were '
  'ready, it would be running. Both the competition explanation and the too-slow explanation '
  'require a busy processor, and neither survives the evidence.')

q('GB_OS_034', 'OS_FAM05_SCHEDULING_REASONING', 'D5',
  'A machine runs one program that must react to typing without noticeable delay, and another '
  'that performs a long calculation nobody is waiting on. If the scheduler gave both equal turns '
  'of the same long length, what would go wrong and what would fix it?',
  'Typing would feel unresponsive during the calculation\'s turns; shorter turns would fix it',
  ['The calculation would never finish; giving it longer turns would fix it',
   'Both would fail, and only a second processor would fix it',
   'Nothing would go wrong; turn length does not affect how responsive a program feels'],
  'How long a turn lasts sets how long a ready program may have to wait for its next one, and '
  'that wait is exactly what a person notices while typing. Shortening turns costs a little '
  'efficiency in switching but buys responsiveness; the calculation still finishes either way, '
  'just later.')

q('GB_OS_035', 'OS_FAM05_SCHEDULING_REASONING', 'D5',
  'Every program on a machine is waiting for something — one for a key press, one for data from '
  'the network, one for a disk read. Nothing is ready to run. What does the scheduler do?',
  'Nothing runs until one of them stops waiting, and the processor sits idle',
  ['It picks whichever has waited longest and runs it anyway',
   'It reports an error, because a processor must always be executing something',
   'It divides the time equally among the three waiting programs'],
  'A scheduler chooses among ready processes, and here there are none, so there is nothing to '
  'choose. Running or sharing time between waiting processes would accomplish nothing, since '
  'what each needs has not arrived. An idle processor is a normal state, not a fault.')

q('GB_OS_036', 'OS_FAM05_SCHEDULING_REASONING', 'D5',
  'A single-processor machine must run two tasks: one continually checks that a robot arm will '
  'not collide with anything, and one produces a report needing several hours of processor time. '
  'Which arrangement is defensible, and what does it cost?',
  'Run the collision check whenever it is ready and let the report use what is left — the report '
  'takes longer to finish',
  ['Give the two equal turns of equal length — neither is affected',
   'Finish the report first and then start the collision check — both get what they need',
   'Run the collision check only while the report is waiting for the disk — nothing is delayed'],
  'One processor cannot give both tasks everything, so the question is what to give up. A late '
  'collision check is dangerous and a late report is not, so the check takes priority and the '
  'report pays in elapsed time. The other arrangements each claim the choice is free, and on a '
  'single processor it never is.')

# =========================================================================
# OS_FAM08_PERMISSION_DIAGNOSIS — D3, D4, D5 x3
# Whether an attempted action succeeds, and which permission decided it.
# =========================================================================
q('GB_OS_037', 'OS_FAM08_PERMISSION_DIAGNOSIS', 'D3',
  'A user may read a file but not change it. They open it, edit the text on screen, and try to '
  'save. What happens?',
  'Opening and editing on screen succeed; the save is refused',
  ['Opening is refused, because editing requires permission to change the file',
   'The save succeeds, because the file was opened successfully',
   'The save succeeds, but the change is discarded when the file is closed'],
  'Permissions govern what reaches the file, not what happens in the editor\'s own memory. '
  'Reading it in is allowed and changing the copy on screen touches nothing on disk; the refusal '
  'comes at the moment the change would be written back.')

q('GB_OS_038', 'OS_FAM08_PERMISSION_DIAGNOSIS', 'D4',
  'A user may read and change a particular file. They try to delete it and are refused. The '
  'file\'s own permissions have not changed. What explains the refusal?',
  'Deleting removes the file\'s entry from its directory, and they may not change that directory',
  ['A file cannot be deleted while the user is still able to read it',
   'Deletion always requires ownership of the file',
   'The file must be emptied of its contents before it can be deleted'],
  'Deleting is not an operation on the file\'s contents but on the directory that names it, so '
  'the permission that decides it sits on the directory. That is why full access to a file can '
  'still leave it undeletable.')

q('GB_OS_039', 'OS_FAM08_PERMISSION_DIAGNOSIS', 'D5',
  'On a shared machine, a user may add files to a directory but may not list what it contains. '
  'What can that user do?',
  'Add a file, and open one whose exact name they already know, but not discover what else is there',
  ['Nothing at all, since they cannot see the directory',
   'Everything, since being able to add files implies being able to see them',
   'Only add files; anything they add becomes unreachable to them'],
  'The two permissions are independent, so a directory can accept new entries while refusing to '
  'reveal the ones it holds. Reaching a file by its exact name does not require listing, which is '
  'what makes a drop-off directory possible at all.')

q('GB_OS_040', 'OS_FAM08_PERMISSION_DIAGNOSIS', 'D5',
  'The owner of a file removes their own permission to change it, then tries to edit it. What '
  'happens, and why?',
  'The edit is refused; ownership decides who may set the permissions, not what the current ones '
  'allow',
  ['The edit succeeds; an owner is never restricted by permissions',
   'The edit is refused permanently, as the owner cannot restore the permission',
   'The edit succeeds, and the permission is restored automatically'],
  'Permissions are checked as they stand, so an owner who has removed a permission is refused '
  'like anyone else. What ownership still gives them is the ability to grant it back — the '
  'refusal is real but not permanent.')

q('GB_OS_041', 'OS_FAM08_PERMISSION_DIAGNOSIS', 'D5',
  'A user is allowed to run a program but not to read its contents. Is that a meaningful '
  'combination?',
  'Yes; they can use the program without being able to inspect or copy how it works',
  ['No; running a program requires reading its instructions, so the two amount to one permission',
   'Yes, but only for programs that need no input',
   'No; a program that cannot be read cannot be loaded into memory at all'],
  'Loading the program is done by the operating system on the user\'s behalf, and permission to '
  'run it is a separate decision from permission to open and read it as a file. That separation '
  'is precisely what allows a program to be offered for use without being handed over.')

# =========================================================================
# OS_FAM10_PRIVILEGE_BOUNDARY — D3, D4, D5 x2
# Whether a normal program may act itself or must ask the kernel.
# =========================================================================
q('GB_OS_042', 'OS_FAM10_PRIVILEGE_BOUNDARY', 'D3',
  'An ordinary program needs to write data to a disk. What must it do?',
  'Ask the kernel, which performs the access on its behalf',
  ['Write to the disk hardware directly',
   'Wait until no other program is using the disk, then write directly',
   'Ask the person to grant it access to the hardware'],
  'Ordinary programs run with limited privilege and cannot touch hardware at all, whether or not '
  'anything else is using it. Every such action is a request to the kernel, which decides whether '
  'to carry it out.')

q('GB_OS_043', 'OS_FAM10_PRIVILEGE_BOUNDARY', 'D4',
  'A program started by an administrator still cannot write to the disk hardware directly; it '
  'goes through the kernel like any other program. Why?',
  'The boundary is a property of how a program runs, not of which account started it',
  ['The administrator account had not been granted all of its rights',
   'The program was not written to make use of its administrator rights',
   'Administrators can reach hardware only after the machine is restarted'],
  'Two different things are being confused. An administrator account may be permitted more — more '
  'files, more settings — but it is still an ordinary program that runs, and ordinary programs '
  'ask the kernel. Wider permissions do not move the boundary.')

q('GB_OS_044', 'OS_FAM10_PRIVILEGE_BOUNDARY', 'D5',
  'A machine stays usable when an ordinary program contains a serious fault, but can stop '
  'altogether when a driver running with kernel privilege contains one. What accounts for the '
  'difference?',
  'The ordinary program is confined by the boundary and can damage only its own state; '
  'kernel-privileged code is not confined',
  ['Drivers are larger, so faults in them are more serious',
   'Ordinary programs are checked for faults before they are allowed to run',
   'The operating system restarts ordinary programs automatically but cannot restart drivers'],
  'What matters is not the size or quality of the code but which side of the boundary it runs on. '
  'Inside the confinement a fault reaches one process; outside it, the same kind of fault can '
  'reach anything.')

q('GB_OS_045', 'OS_FAM10_PRIVILEGE_BOUNDARY', 'D5',
  'Some systems take a driver out of the kernel and run it as an ordinary program instead. What '
  'does that buy, and what does it cost?',
  'A fault in it can no longer bring the whole system down, but every device request must now '
  'cross the boundary, which takes longer',
  ['It buys speed, because ordinary programs run with fewer checks',
   'It costs nothing, since the driver behaves identically wherever it runs',
   'It buys nothing, because a driver has kernel privilege wherever it runs'],
  'Moving code outside the boundary confines its faults, which is the gain. The price is paid on '
  'every single request, because what used to be an ordinary call now has to cross into the '
  'kernel and back. Whether that trade is worth taking depends on how often the device is used.')

# =========================================================================
# OS_FAM12_EXHAUSTION_DIAGNOSIS — D3, D4 x2, D5 x2
# Which resource is exhausted and what would relieve it. Symptoms must distinguish.
# =========================================================================
q('GB_OS_046', 'OS_FAM12_EXHAUSTION_DIAGNOSIS', 'D3',
  'A machine slows badly whenever several large programs are open, and the disk is active almost '
  'constantly. Closing one program restores normal speed. Which resource has run short?',
  'Memory — with too little, data is moved between memory and disk continually',
  ['Disk space, since the disk is so busy',
   'Processor time, since the programs are running slowly',
   'Network capacity'],
  'Constant disk activity that appears only when many programs are open, and stops when one is '
  'closed, points at memory rather than the disk itself: what is not fitting in memory has to be '
  'shuttled to and from the disk. A shortage of disk space would not be relieved by closing a '
  'program.')

q('GB_OS_047', 'OS_FAM12_EXHAUSTION_DIAGNOSIS', 'D4',
  'A machine refuses to save new files, and programs report failures when they try to write. It '
  'responds normally in every other way, and closing programs does not help. Which resource has '
  'run short, and what would relieve it?',
  'Storage space; deleting or moving files would relieve it',
  ['Memory; closing more programs would relieve it',
   'Processor time; waiting for other work to finish would relieve it',
   'Memory; restarting the machine would relieve it'],
  'Closing programs frees memory, and it made no difference, which rules memory out. Writes '
  'failing while everything else is normal points at somewhere to put the data, so the remedy is '
  'to free space rather than to free memory.')

q('GB_OS_048', 'OS_FAM12_EXHAUSTION_DIAGNOSIS', 'D4',
  'A machine stays responsive to typing and window switching, files save normally, but one '
  'calculation takes far longer than usual. A monitoring tool reports the processor fully used, '
  'with ample free memory and disk. Which resource is the limit?',
  'Processor time',
  ['Memory, in spite of what the tool reports',
   'Storage space',
   'The driver for the disk'],
  'Every other resource has been observed to be fine — saving works, memory and disk are free — '
  'and the one thing reported as fully consumed is the processor. The work is arriving faster '
  'than it can be executed, so the calculation waits its turn.')

q('GB_OS_049', 'OS_FAM12_EXHAUSTION_DIAGNOSIS', 'D5',
  'Adding memory to a machine that had been moving data between memory and disk constantly makes '
  'it much faster. Adding the same memory to a machine whose processor was already fully used '
  'changes almost nothing. Why?',
  'Extra memory helps only where a shortage of memory was what caused the extra work',
  ['The second machine\'s memory must have been installed incorrectly',
   'Memory improves speed only on machines that also have a fast disk',
   'The second machine needed faster memory rather than more of it'],
  'A remedy relieves the resource that was actually short. On the first machine the shortage of '
  'memory was creating disk work that then disappeared; on the second nothing was waiting on '
  'memory, so supplying more of it removes no obstacle at all.')

q('GB_OS_050', 'OS_FAM12_EXHAUSTION_DIAGNOSIS', 'D5',
  'A machine is short of memory. One suggestion is to let it use disk space as overflow. What '
  'does that buy, and what does it cost?',
  'Programs that would not otherwise fit can run, but reaching data held in the overflow is far '
  'slower than reaching memory',
  ['It buys nothing, because a disk cannot hold a program\'s working data',
   'It buys speed, because the disk is added to memory and the total is faster',
   'It costs nothing, as long as there is enough free disk space'],
  'The overflow buys capacity and pays for it in time, because disks are far slower than memory. '
  'That is why it rescues a machine that is slightly short and cripples one that is badly short: '
  'the more traffic goes to the overflow, the more the cost is paid.')
