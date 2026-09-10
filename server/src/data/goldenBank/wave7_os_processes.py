# -*- coding: utf-8 -*-
"""
Wave 7 — OS_PROCESSES, 50 Golden Bank questions, all newly authored.

THIS SKILL BEGINS WHERE THE BANKED OPERATING SYSTEMS SKILL STOPS. That skill already asks what a
process is, how it differs from a program, and how many processes a described situation contains.
None of that is re-asked here. Every family below is about what happens to a process across its
life: the number it is given and what that number does and does not mean, the conditions it moves
between, who started it and what becomes of it when they end, what it leaves behind, and what a
request to stop actually does.

THE TWO KINDS OF WAITING ARE THE SPINE OF THE SKILL. A process waiting for the processor and a
process waiting for input are both "not running" and have entirely different remedies. Several
families turn on distinguishing them, and a stem that does not separate them measures nothing.

ASKING AND FORCING ARE TREATED AS GENUINELY DIFFERENT THROUGHOUT, because the consequence is
whether unsaved work survives. A student who thinks both are instant will one day force-stop
something mid-write.

THE IDENTIFIER REUSE FAMILY FEEDS THE WRONG-TARGET DIAGNOSIS FAMILY. A number recorded yesterday
may name something else today, the command to act on it succeeds, and the wrong thing stops. That
the command reports success is stated in every stem of that family, because it is what makes the
fault survive.

NO STEM NAMES A DISTRIBUTION, A SHELL OR A COMMAND. Everything is described by what it does, so
nothing here rewards recalling a flag from a manual page.
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
# OP_FAM01_IDENTIFIER_ROLE — D1 x4, D2 x1
# =========================================================================
q('GB_OP_001', 'OP_FAM01_IDENTIFIER_ROLE', 'D1',
  'A running process is given a number by the system. What does that number identify?',
  'This particular run of the program',
  ['The program on disk', 'The user who started it', 'The position of the program in a menu'],
  'The number belongs to one run and not to the program. Starting the same program again '
  'produces a different number.')

q('GB_OP_002', 'OP_FAM01_IDENTIFIER_ROLE', 'D1',
  'A program is stopped and started again. What happens to the number it was given?',
  'The new run receives a different number',
  ['The same number is reused for the new run',
   'The number is kept because the program is the same',
   'The program has no number until it finishes'],
  'Each run is a separate process and gets its own number. Expecting the number to follow the '
  'program is what makes stale numbers dangerous later.')

q('GB_OP_003', 'OP_FAM01_IDENTIFIER_ROLE', 'D1',
  'The same program is started three times at once. How many numbers are in play?',
  'Three, one for each run',
  ['One, since it is the same program',
   'One, with the three runs sharing it',
   'None, since only one program is involved'],
  'Three separate runs mean three separate processes, each with its own number. What they have '
  'in common is the program they were started from.')

q('GB_OP_004', 'OP_FAM01_IDENTIFIER_ROLE', 'D1',
  'Why does anything wanting to act on a running process need its number?',
  'Because the number is how a particular run is named',
  ['Because the number records how long it has been running',
   'Because the number states how much memory it may use',
   'Because the number gives its position in the start order'],
  'The number is an address for one run. Without it there would be no way to say which of several '
  'runs an instruction applies to.')

q('GB_OP_005', 'OP_FAM01_IDENTIFIER_ROLE', 'D2',
  'A script records the number of a process it started, so that it can stop it later. A colleague '
  'says it should record the program name instead. What is the weakness of using the name?',
  'Several runs of the same program may exist, and the name does not say which is meant',
  ['Program names change too often to rely on',
   'Program names cannot be recorded in a script',
   'There is no weakness; the name is more reliable'],
  'The name identifies the program and the number identifies the run. When only one run exists '
  'the two agree, which is why the weakness stays hidden until it does not.')

# =========================================================================
# OP_FAM02_STATE_NAMING — D1 x3, D2 x1
# =========================================================================
q('GB_OP_006', 'OP_FAM02_STATE_NAMING', 'D1',
  'A process has asked to read from a file and is waiting for the data to arrive. What condition '
  'is it in?',
  'Blocked, waiting on something outside itself',
  ['Using the processor', 'Ready and waiting for the processor', 'Finished'],
  'It cannot proceed until the data arrives, so giving it the processor would achieve nothing. '
  'That is what distinguishes this from waiting for a turn.')

q('GB_OP_007', 'OP_FAM02_STATE_NAMING', 'D1',
  'A process has everything it needs and is simply waiting for its turn on the processor. What '
  'condition is it in?',
  'Ready, waiting only for the processor',
  ['Blocked, waiting on something outside itself', 'Using the processor', 'Finished'],
  'Nothing is missing except a turn, so it could run the instant one is available. A blocked '
  'process could not.')

q('GB_OP_008', 'OP_FAM02_STATE_NAMING', 'D1',
  'Two processes are both described as "not running". What distinguishes them?',
  'Whether each is waiting only for a turn or waiting for something else entirely',
  ['How long each has existed',
   'How much memory each is using',
   'Nothing; not running is a single condition'],
  'Adding processors would help one and not the other, which is why the two are kept apart. '
  'Lumping them together makes every performance question unanswerable.')

q('GB_OP_009', 'OP_FAM02_STATE_NAMING', 'D2',
  'A machine has many processes that are not running, and adding a faster processor makes no '
  'difference. What does that suggest about them?',
  'They were waiting on something other than the processor',
  ['They were waiting for the processor and the new one is too slow',
   'They have all finished',
   'The measurement must have been taken incorrectly'],
  'Processes waiting for a turn would have benefited from a faster processor. That nothing '
  'changed points at waits the processor cannot end.')

# =========================================================================
# OP_FAM03_PARENT_CHILD — D1 x3, D2 x1
# =========================================================================
q('GB_OP_010', 'OP_FAM03_PARENT_CHILD', 'D1',
  'A terminal session is used to start a long-running task. What is the relationship between the '
  'two processes?',
  'The terminal session started the task',
  ['The task started the terminal session',
   'The task runs inside the terminal session as part of it',
   'The two are unrelated once both are running'],
  'One started the other, and that relationship is recorded. It is a relationship between two '
  'separate processes rather than one containing the other.')

q('GB_OP_011', 'OP_FAM03_PARENT_CHILD', 'D1',
  'When one process starts another, what is recorded about the pair?',
  'Which one started the other',
  ['Which one will finish first',
   'That the two must finish together',
   'That the two share their memory'],
  'The starting relationship is kept and is what lets a process be told how its children fared. '
  'Nothing about it forces them to end together.')

q('GB_OP_012', 'OP_FAM03_PARENT_CHILD', 'D1',
  'A process starts three others. How is it related to them?',
  'It is the starter of all three, and they are unrelated to one another',
  ['The three are copies of it',
   'The three run inside it',
   'The three are related to each other as well as to it'],
  'Each has the same starter and no relationship to its siblings. Nothing connects them except '
  'where they came from.')

q('GB_OP_013', 'OP_FAM03_PARENT_CHILD', 'D2',
  'A student says that stopping a process automatically stops everything it started, because the '
  'children run inside it. What is wrong with the reasoning?',
  'The children are separate processes; the relationship records who started whom and does not '
  'contain them',
  ['Nothing; children always stop with their starter',
   'The children stop only if they were started recently',
   'The reasoning is right for programs and wrong for scripts'],
  'Containment is the wrong picture. Each child is a process in its own right with its own number '
  'and its own life.')

# =========================================================================
# OP_FAM04_STATE_TRANSITION — D2 x1, D3 x1
# =========================================================================
q('GB_OP_014', 'OP_FAM04_STATE_TRANSITION', 'D2',
  'A process that was using the processor asks to read from a slow device. What happens to its '
  'condition?',
  'It moves from using the processor to waiting for the device',
  ['It moves from using the processor to waiting for a turn',
   'It keeps the processor until the data arrives',
   'It finishes'],
  'The request cannot be satisfied at once, so holding the processor would waste it. The move is '
  'made so that something else can run.')

q('GB_OP_015', 'OP_FAM04_STATE_TRANSITION', 'D3',
  'A process was waiting for data, and the data has now arrived. What condition is it in '
  'immediately afterwards?',
  'Ready, waiting for a turn on the processor',
  ['Using the processor straight away',
   'Still waiting for the data',
   'Finished, since its request has been satisfied'],
  'Its obstacle has gone and a free processor has not appeared. It joins the queue for a turn '
  'rather than resuming instantly.')

# =========================================================================
# OP_FAM05_FOREGROUND_BACKGROUND — D2 x1, D3 x1
# =========================================================================
q('GB_OP_016', 'OP_FAM05_FOREGROUND_BACKGROUND', 'D2',
  'A task is started so that the terminal prompt returns immediately and the task keeps running. '
  'How was it started?',
  'In the background, so it does not hold the terminal',
  ['In the foreground, so it holds the terminal',
   'In the foreground, with the prompt shown early',
   'It was not started at all, which is why the prompt returned'],
  'Holding the terminal is exactly what a foreground task does. The prompt returning is the '
  'observable sign that this one is not.')

q('GB_OP_017', 'OP_FAM05_FOREGROUND_BACKGROUND', 'D3',
  'A task running in the background prints a message. Where does the message appear?',
  'On the terminal, interleaved with whatever else is there',
  ['Nowhere, since background tasks produce no output',
   'In a file, since background output is always redirected',
   'On the terminal only after the task finishes'],
  'Not holding the terminal is not the same as being disconnected from it. The message arrives '
  'in the middle of whatever the user is doing, which is why background output is usually sent '
  'elsewhere deliberately.')

# =========================================================================
# OP_FAM06_EXIT_RESULT — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_OP_018', 'OP_FAM06_EXIT_RESULT', 'D2',
  'A process finishes. What does it report about how it went?',
  'A value saying whether it succeeded',
  ['Everything it printed while running',
   'How long it ran for',
   'Nothing; a finished process reports nothing'],
  'The reported value is a small signal about success, separate from anything printed. Whatever '
  'started it can read that value.')

q('GB_OP_019', 'OP_FAM06_EXIT_RESULT', 'D3',
  'A task prints several pages of output and then reports failure. What follows?',
  'It failed, whatever it printed along the way',
  ['It succeeded, since it produced output',
   'It partly succeeded, in proportion to the output',
   'The two reports contradict each other and one must be wrong'],
  'Printing and reporting are different channels and do not contradict each other. A task can do '
  'a great deal of work and still not achieve what it was asked to.')

q('GB_OP_020', 'OP_FAM06_EXIT_RESULT', 'D4',
  'A script runs a task and decides what to do next by reading what the task printed, searching '
  'the output for the word "error". The task reports failure through its result value and prints '
  'nothing containing that word. The script inspects the printed text and never reads the '
  'reported result value. What happens?',
  'The script treats the failure as a success, because it never looked at the result',
  ['The script detects the failure from the reported value',
   'The script fails to run, since the task failed',
   'The script detects the failure from the absence of output'],
  'The signal was there and the script was reading the wrong channel. Searching output for words '
  'is fragile in exactly this way, since the wording is not guaranteed.',
  evidence='The script inspects the printed text and never reads the reported result value')

# =========================================================================
# OP_FAM07_STOP_REQUEST_EFFECT — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_OP_021', 'OP_FAM07_STOP_REQUEST_EFFECT', 'D2',
  'A process is politely asked to stop. What can it do about the request?',
  'Notice it and tidy up before ending',
  ['Nothing; it ends immediately',
   'Refuse it permanently and continue as though nothing happened',
   'Pass the request to whatever started it'],
  'The polite request is deliverable and the process decides how to respond. That opportunity is '
  'the whole difference between the two ways of stopping something.')

q('GB_OP_022', 'OP_FAM07_STOP_REQUEST_EFFECT', 'D3',
  'A process is stopped outright rather than asked. What can it do about it?',
  'Nothing; it ends without any opportunity to prepare',
  ['Tidy up first, then end',
   'Save its work and then end',
   'Refuse if it is holding a file open'],
  'The forced stop is not delivered to the process to be handled. Anything it was part-way '
  'through is left as it was.')

q('GB_OP_023', 'OP_FAM07_STOP_REQUEST_EFFECT', 'D4',
  'A process writing a large file is stopped outright. A colleague expects the file to be either '
  'complete or absent. Being stopped outright gives the process no opportunity to finish or to '
  'remove what it had already written. What is the likely state of the file?',
  'Partly written, being neither complete nor absent',
  ['Complete, since the write had started',
   'Absent, since the process did not finish',
   'Complete but marked as incomplete'],
  'Nothing arranges for a half-written file to be cleaned up unless the process does it, and it '
  'was given no chance. Asking politely would have let it either finish or remove the file.',
  evidence='Being stopped outright gives the process no opportunity to finish or to remove what '
           'it had already written')

# =========================================================================
# OP_FAM08_SURVIVAL — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_OP_024', 'OP_FAM08_SURVIVAL', 'D2',
  'A process that started another finishes first. What happens to the one it started?',
  'It keeps running',
  ['It stops immediately', 'It is suspended until a new starter appears',
   'It restarts from the beginning'],
  'The relationship records who started whom and does not tie their lives together. The child '
  'continues and is adopted by something else.')

q('GB_OP_025', 'OP_FAM08_SURVIVAL', 'D3',
  'A user starts a long task from a terminal and then closes the terminal window. The task is '
  'still running afterwards. Is that surprising?',
  'No; the task is a separate process and does not end because its starter did',
  ['Yes; closing the terminal should have stopped the task',
   'Yes; the task should have been suspended',
   'No, but only because the task was started in the background'],
  'Whether it was started in the background affects the terminal rather than survival. Some '
  'setups do arrange for tasks to be stopped when a session ends, and that is an arrangement '
  'rather than the default behaviour.')

q('GB_OP_026', 'OP_FAM08_SURVIVAL', 'D4',
  'A deployment script starts a server process and then exits. Hours later the server is still '
  'running and nobody knows how to stop it, because the script that started it is gone. The '
  'server survived its starter and the number it was given was never recorded anywhere. What is '
  'the difficulty?',
  'The server is running with no record of its number, so it has to be found before it can be '
  'stopped',
  ['The server should have stopped when the script exited',
   'The server cannot be stopped once its starter has gone',
   'The script must still be running somewhere'],
  'Survival is the expected behaviour and the missing record is the problem. A listing of running '
  'processes will find it; recording the number at start time would have avoided the search.',
  evidence='The server survived its starter and the number it was given was never recorded '
           'anywhere')

# =========================================================================
# OP_FAM09_IDENTIFIER_REUSE — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_OP_027', 'OP_FAM09_IDENTIFIER_REUSE', 'D2',
  'A process ends. What happens to the number it was using?',
  'It becomes available for a later process',
  ['It is retired and never used again',
   'It is kept in case the process restarts',
   'It is transferred to whatever started the process'],
  'Numbers are a finite supply and are reissued once free. That is why one recorded some time ago '
  'may now name something entirely different.')

q('GB_OP_028', 'OP_FAM09_IDENTIFIER_REUSE', 'D3',
  'A number was written into a file yesterday when a process was started. What can be concluded '
  'from it today?',
  'That some process had that number yesterday; nothing certain about today',
  ['That the same process still has it',
   'That no process has it now',
   'That the process finished, since the number was recorded'],
  'The number may name the original process, a completely different one, or nothing at all. '
  'Checking what is actually running is what distinguishes the three.')

q('GB_OP_029', 'OP_FAM09_IDENTIFIER_REUSE', 'D4',
  'A monitoring script records a number at start time and checks each hour whether a process with '
  'that number is running, reporting the service as healthy if one is. A number becomes available '
  'when its process ends and may then be given to something unrelated. What is wrong with the '
  'check?',
  'A different process may now hold that number, so the check can report health when the service '
  'has died',
  ['The check is sound, since the number is unique',
   'The check will report failure even when the service is running',
   'The check should be run more often than hourly'],
  'Presence of the number is not presence of the service. Comparing the program name as well, or '
  'asking the service itself, is what makes the check mean something.',
  evidence='A number becomes available when its process ends and may then be given to something '
           'unrelated')

# =========================================================================
# OP_FAM10_LISTING_INTERPRETATION — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_OP_030', 'OP_FAM10_LISTING_INTERPRETATION', 'D2',
  'A listing of running processes is produced. What does it describe?',
  'The situation at the moment it was taken',
  ['The situation continuously as it changes',
   'Every process that has run since the machine started',
   'Every process that will run today'],
  'The listing is a snapshot. Anything that started or ended after it was taken is not reflected '
  'in it.')

q('GB_OP_031', 'OP_FAM10_LISTING_INTERPRETATION', 'D3',
  'A process a user expected to find does not appear in a listing. What follows?',
  'It was not running at that moment; whether it ran earlier is a separate question',
  ['It has never run', 'It is running but hidden',
   'It has finished successfully'],
  'Absence from a snapshot says only that it was not there then. It may have ended a second '
  'earlier, successfully or otherwise.')

q('GB_OP_032', 'OP_FAM10_LISTING_INTERPRETATION', 'D4',
  'A listing shows one process using a very high share of the processor. A team concludes it has '
  'been overloading the machine all morning. The listing describes the instant it was taken and '
  'says nothing about the hours before it. What does the listing support?',
  'That the process was busy at that instant, and nothing about the morning',
  ['That the process has been busy all morning',
   'That the process is faulty',
   'That the machine is short of processors'],
  'One instant is one instant. Sampling repeatedly, or consulting a record kept over time, is '
  'what would support a claim about the morning.',
  evidence='The listing describes the instant it was taken and says nothing about the hours '
           'before it')

# =========================================================================
# OP_FAM11_UNRESPONSIVE_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_OP_033', 'OP_FAM11_UNRESPONSIVE_DIAGNOSIS', 'D3',
  'A process is politely asked to stop and does not. It is waiting for a reply from a machine '
  'that is not responding. Why has the request had no effect?',
  'It cannot act on the request while it is blocked waiting',
  ['The request was not delivered',
   'The process has crashed and can no longer receive anything',
   'The process is refusing the request deliberately'],
  'A blocked process is not running any instructions, so it cannot notice the request. When the '
  'wait ends it would act on it, and the wait may not end.')

q('GB_OP_034', 'OP_FAM11_UNRESPONSIVE_DIAGNOSIS', 'D4',
  'A process ignores a polite stop request. It is mid-way through writing a file. Forcing it '
  'would end it at once and would leave the file part-written, while waiting risks waiting '
  'indefinitely. What is the trade being made?',
  'Ending it now at the cost of a part-written file, against waiting for a wait that may not end',
  ['Nothing; forcing it is always correct here',
   'Nothing; waiting is always correct here',
   'Whether the process is important enough to keep'],
  'Both options have a real cost and the stem states both. Which is right depends on whether the '
  'part-written file can be recovered from, which is a question about this file.',
  evidence='Forcing it would end it at once and would leave the file part-written, while waiting '
           'risks waiting indefinitely')

# =========================================================================
# OP_FAM12_WRONG_TARGET_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_OP_035', 'OP_FAM12_WRONG_TARGET_DIAGNOSIS', 'D3',
  'An administrator stops a process using a number from a note made last week. The command '
  'reports success, and an unrelated service goes down. What most likely happened?',
  'The number now belonged to the unrelated service',
  ['The command was mistyped',
   'The original process had a dependency on the service',
   'The command failed silently and something else caused the outage'],
  'The command reporting success means it found and stopped a process with that number. The '
  'number was reissued between last week and today.')

q('GB_OP_036', 'OP_FAM12_WRONG_TARGET_DIAGNOSIS', 'D4',
  'A cleanup job stops every process whose number appears in a list built at midnight. It runs at '
  'six, reports every stop as successful, and two unrelated services are found stopped. The job '
  'reported success for every number, and success means a process with that number was found and '
  'stopped. What happened?',
  'Some of those numbers had been reissued to other processes in the six hours since the list was '
  'built',
  ['The job failed and the outage has another cause',
   'The original processes had been restarted with the same numbers',
   'The list was built incorrectly at midnight'],
  'Every stop succeeding is the evidence: each number named a live process. The list was correct '
  'when it was built and had six hours to go stale.',
  evidence='The job reported success for every number, and success means a process with that '
           'number was found and stopped')

# =========================================================================
# OP_FAM13_LIFECYCLE_REASONING — D3 x1, D4 x1, D5 x3
# =========================================================================
q('GB_OP_037', 'OP_FAM13_LIFECYCLE_REASONING', 'D3',
  'A process created a temporary file at the start of its run and removes it just before '
  'finishing. It is stopped outright halfway through. What is left behind?',
  'The temporary file, since the removal never happened',
  ['Nothing; temporary files are always cleaned up',
   'The temporary file, but it will be removed automatically later',
   'Nothing, since the process did not finish'],
  'Cleaning up was something the process was going to do and it was not given the chance. Nothing '
  'else knows the file was temporary.')

q('GB_OP_038', 'OP_FAM13_LIFECYCLE_REASONING', 'D4',
  'A process holds a lock while it works and releases it when it finishes. It is stopped outright. '
  'Releasing the lock was something the process did on finishing, and it was given no opportunity '
  'to do anything. What is the state of the lock?',
  'Still held, with no process holding it, so anything waiting for it waits indefinitely',
  ['Released, since the process is gone',
   'Released after a short delay',
   'Held by whatever started the process'],
  'A lock that outlives its holder is the classic consequence of forcing a stop. Locks that are '
  'released automatically when the holder disappears exist and have to be built that way '
  'deliberately.',
  evidence='Releasing the lock was something the process did on finishing, and it was given no '
           'opportunity to do anything')

q('GB_OP_039', 'OP_FAM13_LIFECYCLE_REASONING', 'D5',
  'A service is restarted every night by stopping it outright and starting it again. It has '
  'worked for months. It writes to a file continuously, and the stop can land at any point in a '
  'write. What is the position?',
  'It has been fortunate; a stop landing mid-write will eventually corrupt the file',
  ['It is safe, since months of success is strong evidence',
   'It is safe, since restarts are a normal operation',
   'It is unsafe, and the corruption has certainly already happened'],
  'Months without incident is evidence that the window is narrow rather than that it is absent. '
  'Asking politely first, and forcing only if the request is ignored, closes it.',
  mode='EDGE',
  hinge='It writes to a file continuously, and the stop can land at any point in a write')

q('GB_OP_040', 'OP_FAM13_LIFECYCLE_REASONING', 'D5',
  'A process starts a child and finishes immediately. The child runs for an hour and then fails. '
  'The starter has already finished, so there is nothing left to receive a report of how the '
  'child fared. What happens to the information that it failed?',
  'It has nowhere to go, so the failure is unreported unless the child recorded it itself',
  ['It is reported to whatever adopted the child',
   'It is reported to the user who started the original process',
   'It is kept until the starter is restarted'],
  'The reported value goes to whatever is waiting for it and nothing is. This is why long-running '
  'work started this way has to write its own record of what happened.',
  mode='TRANSFER',
  hinge='The starter has already finished, so there is nothing left to receive a report')

q('GB_OP_041', 'OP_FAM13_LIFECYCLE_REASONING', 'D5',
  'A process finishes successfully in one second, every time it is run, and a monitoring system '
  'that checks once a minute never sees it running. The process exists for one second in every '
  'sixty and the check samples one instant per minute. What does the monitoring establish?',
  'Almost nothing; a process this short is unlikely to be caught by a check this infrequent',
  ['That the process is never running',
   'That the process fails to start',
   'That the process finishes too quickly to be useful'],
  'The absence is what sampling predicts rather than evidence of anything. Recording each run as '
  'it happens is what would answer the question the monitoring was trying to answer.',
  mode='EDGE',
  hinge='The process exists for one second in every sixty and the check samples one instant per '
        'minute')

# =========================================================================
# OP_FAM14_INTERVENTION_CHOICE — D4 x1, D5 x4
# =========================================================================
q('GB_OP_042', 'OP_FAM14_INTERVENTION_CHOICE', 'D4',
  'A process is consuming a great deal of processor time and is part-way through writing a report '
  'file. It is not blocked and it responds to requests. It is responsive and mid-write, so it can '
  'be asked and can tidy up. How should it be stopped?',
  'Ask it politely, so that it can finish or remove the part-written file',
  ['Force it, since it is consuming resources now',
   'Force it, since polite requests are unreliable',
   'Leave it, since stopping it risks the file'],
  'Both conditions for the polite route are present. Forcing would end it faster and leave the '
  'file in the state this family exists to warn about.',
  evidence='It is responsive and mid-write, so it can be asked and can tidy up')

q('GB_OP_043', 'OP_FAM14_INTERVENTION_CHOICE', 'D5',
  'A process is blocked waiting on a machine that will not respond, holding no files open, and is '
  'preventing a deployment. It has been asked politely and has not reacted. It holds no files '
  'open and cannot act on a polite request while it is blocked. What should be done?',
  'Force it, since nothing is at risk and the polite route cannot work while it is blocked',
  ['Keep waiting, since the polite request may still be acted on',
   'Restart the machine, since the process cannot be stopped',
   'Ask politely again, in case the first request was lost'],
  'The two facts together settle it: the polite route is unavailable and forcing costs nothing '
  'here. Repeating a request that cannot be noticed changes nothing.',
  mode='TRANSFER',
  hinge='It holds no files open and cannot act on a polite request while it is blocked')

q('GB_OP_044', 'OP_FAM14_INTERVENTION_CHOICE', 'D5',
  'A team wants a script to stop a service reliably. A colleague proposes forcing it immediately, '
  'because polite requests sometimes go unanswered. The service tidies up when asked politely, '
  'and forcing gives it no opportunity to do so. What is the better arrangement?',
  'Ask politely, wait a stated period, and force only if it has not ended',
  ['Force immediately, since it is reliable',
   'Ask politely and never force, since forcing risks the tidy-up',
   'Ask politely twice before forcing'],
  'Forcing immediately gives up the tidy-up in every case to handle the case where it is needed. '
  'Never forcing leaves the script unable to finish when a process is stuck.',
  mode='TRADEOFF',
  hinge='The service tidies up when asked politely, and forcing gives it no opportunity to do so')

q('GB_OP_045', 'OP_FAM14_INTERVENTION_CHOICE', 'D5',
  'A process must be stopped, and a colleague proposes stopping everything started by the same '
  'session to be thorough. That session also started an unrelated long-running job that has been '
  'running for hours. Stopping everything from the session would also stop the unrelated job, '
  'which nobody asked to stop. What follows?',
  'Only the intended process should be stopped, since the broader action reaches something '
  'unrelated',
  ['Stop everything from the session, since thoroughness is safer',
   'Stop everything from the session, since the jobs are related by their starter',
   'Stop nothing, since the two cannot be separated'],
  'Sharing a starter is not sharing a purpose. The two jobs are separate processes and can be '
  'addressed separately by their own numbers.',
  mode='EDGE',
  hinge='Stopping everything from the session would also stop the unrelated job')

q('GB_OP_046', 'OP_FAM14_INTERVENTION_CHOICE', 'D5',
  'A team can stop a stuck process now, losing the state that would explain why it stuck, or '
  'leave it and investigate while it is still stuck. The service is degraded but working, and the '
  'stuck state is the only evidence of why this keeps happening. What should decide?',
  'Whether the recurring cause is worth more than restoring full service immediately',
  ['Stopping it, since service always comes first',
   'Investigating, since understanding always comes first',
   'Neither; the process should be left indefinitely'],
  'Both have a real cost and the stem supplies what makes it a genuine choice: the service is '
  'degraded rather than down, and this is the only chance to see the cause. Capturing the state '
  'and then stopping it is often the way to have both.',
  mode='TRADEOFF',
  hinge='the stuck state is the only evidence of why this keeps happening')

# =========================================================================
# OP_FAM15_MODEL_TRANSFER — D4 x1, D5 x3
# =========================================================================
q('GB_OP_047', 'OP_FAM15_MODEL_TRANSFER', 'D4',
  'A container platform gives each running container an identifier, records which one launched '
  'which, and reports a result value when one ends. A container is launched by another that then '
  'exits. The platform records the launching relationship and nothing in the description says a '
  'launched container ends with its launcher. What happens to the launched container?',
  'It keeps running, since nothing described ties its life to its launcher',
  ['It stops, since its launcher has gone',
   'It is suspended until the launcher returns',
   'It cannot be determined without knowing the platform'],
  'The described model is the process model under another name, and the same conclusion follows '
  'from it. A platform could arrange otherwise and this description does not.',
  evidence='The platform records the launching relationship and nothing in the description says a '
           'launched container ends with its launcher')

q('GB_OP_048', 'OP_FAM15_MODEL_TRANSFER', 'D5',
  'A job scheduler gives each run an identifier and reuses identifiers once a run has completed. '
  'A dashboard stores identifiers and displays the status of whatever currently holds each one. '
  'Identifiers are reused after completion and the dashboard looks up whatever holds one now. '
  'What will the dashboard eventually show?',
  'The status of an unrelated later run, presented as though it were the original',
  ['Nothing, once the original run has completed',
   'The status of the original run, retained after completion',
   'An error, since the identifier no longer exists'],
  'This is identifier reuse in a different setting and produces the same fault. Recording the '
  'start time alongside the identifier is what lets the dashboard tell the two apart.',
  mode='TRANSFER',
  hinge='Identifiers are reused after completion and the dashboard looks up whatever holds one '
        'now')

q('GB_OP_049', 'OP_FAM15_MODEL_TRANSFER', 'D5',
  'A platform sends a shutdown request to a running task and stops it outright if it has not '
  'ended within thirty seconds. A team writes a task that takes two minutes to save its state on '
  'shutdown. The task needs two minutes to tidy up and will be stopped outright after thirty '
  'seconds. What will happen?',
  'It will be stopped part-way through saving, every time',
  ['It will be allowed to finish saving, since it responded to the request',
   'It will be stopped only if the platform is under load',
   'It will never receive the shutdown request'],
  'Responding to the request is not the same as finishing within the window. Saving faster, or '
  'saving continuously so that shutdown has little to do, is what fits the platform.',
  mode='EDGE',
  hinge='The task needs two minutes to tidy up and will be stopped outright after thirty seconds')

q('GB_OP_050', 'OP_FAM15_MODEL_TRANSFER', 'D5',
  'A team must decide whether a background worker should record its own outcome to a log or rely '
  'on the system that started it to capture the result value. The starter exits immediately after '
  'launching the worker, so nothing is waiting to receive a result value. Which should they '
  'choose?',
  'The worker should record its own outcome, since nothing will be there to receive a reported '
  'result',
  ['Rely on the starter, since result values are the standard mechanism',
   'Rely on the starter, since logs can be lost',
   'Neither is needed, since failures are always visible'],
  'The reported value goes to whatever is waiting, and the stem states that nothing will be. '
  'Where the starter waits, relying on the result value would be the simpler choice.',
  mode='TRANSFER',
  hinge='The starter exits immediately after launching the worker, so nothing is waiting to '
        'receive a result value')
