# -*- coding: utf-8 -*-
"""
Wave 7 — SHELL_PIPELINES, 50 Golden Bank questions, all newly authored.

THE WHOLE SKILL RESTS ON ONE FACT: ERRORS AND ORDINARY OUTPUT SHARE A SCREEN AND NOT A CHANNEL.
Everything else follows. Redirecting output leaves errors on the screen; piping output does not
carry errors to the next stage; a log that captured everything except the reason for the failure
captured exactly what it was told to. Several families exist only to make that consequence
visible.

NO FAMILY HERE TURNS ON WHAT AN INDIVIDUAL COMMAND DOES. Its sibling skill measures that. Stages
are described by behaviour — "a stage that keeps only lines containing a word", "a stage that
counts lines" — so the measurement is what flows between them rather than which tool is which.

EVERY INPUT IS WRITTEN OUT IN THE STEM. Filters are described rather than spelled, and the data
they act on is given, so every answer is derivable rather than recalled.

ONE FAMILY DELIBERATELY CONTAINS A PAIR OF STAGES THAT COMMUTE. A student who has learned that
order always matters has learned a slogan; the useful skill is seeing which reorderings change the
result and which do not.

THE EMPTIED FILE IS THE SHARPEST ITEM IN THE SKILL. A redirection that replaces empties its target
before the command runs, so a command that produces nothing still destroys what was there. That
loses real data and is invisible until somebody looks.
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
# SP_FAM01_CHANNEL_RECOGNITION — D1 x4, D2 x1
# =========================================================================
q('GB_SP_001', 'SP_FAM01_CHANNEL_RECOGNITION', 'D1',
  'A command produces results and also produces a warning. Do the two travel on the same channel?',
  'No; results go on the ordinary output channel and warnings on the error channel',
  ['Yes; everything a command produces travels together',
   'Yes, unless the command is told otherwise',
   'No; warnings are not produced by commands at all'],
  'Two separate outgoing channels exist and both are shown on the screen by default. Sharing a '
  'screen is what makes them look like one.')

q('GB_SP_002', 'SP_FAM01_CHANNEL_RECOGNITION', 'D1',
  'How many channels does a command typically have?',
  'Three: one incoming and two outgoing',
  ['One, used for everything', 'Two, one in and one out',
   'Four, one for each kind of message'],
  'Input arrives on one channel and output leaves on two, separated into ordinary results and '
  'errors. The separation is what makes the two independently routable.')

q('GB_SP_003', 'SP_FAM01_CHANNEL_RECOGNITION', 'D1',
  'A command reports that a file could not be opened. Which channel carries that message?',
  'The error channel',
  ['The ordinary output channel', 'The incoming channel',
   'Neither; failures are not written to a channel'],
  'Anything reporting that something went wrong belongs on the error channel. Keeping it apart is '
  'what lets results be captured cleanly.')

q('GB_SP_004', 'SP_FAM01_CHANNEL_RECOGNITION', 'D1',
  'Why are results and errors kept on separate channels?',
  'So that results can be sent somewhere without the errors going with them',
  ['So that errors can be displayed in a different colour',
   'So that errors are produced faster',
   'So that a command can produce only one of the two'],
  'Separation exists to make the two routable independently. Capturing results into a file while '
  'still seeing problems on the screen is the everyday consequence.')

q('GB_SP_005', 'SP_FAM01_CHANNEL_RECOGNITION', 'D2',
  'A user watching a terminal sees results and an error message appear together and concludes '
  'they are on one channel. What is wrong with the conclusion?',
  'Both channels point at the screen by default, which is why they appear together',
  ['Nothing; appearing together means one channel',
   'The error must have been written to the output channel by mistake',
   'The two appeared together by coincidence'],
  'The screen is the default destination for both, so the evidence is consistent with either '
  'account. Sending one of them elsewhere is what makes the separation visible.')

# =========================================================================
# SP_FAM02_REDIRECTION_EFFECT — D1 x3, D2 x1
# =========================================================================
q('GB_SP_006', 'SP_FAM02_REDIRECTION_EFFECT', 'D1',
  'A command output is sent to a file instead of the screen. What appears on the screen?',
  'Nothing from the ordinary output channel',
  ['The output, as well as going to the file',
   'A summary of the output',
   'The output, delayed until the command finishes'],
  'Redirecting moves the output rather than copying it. The screen sees none of what went to the '
  'file.')

q('GB_SP_007', 'SP_FAM02_REDIRECTION_EFFECT', 'D1',
  'A command that produces no output at all has its output redirected to a new file. Is the file '
  'created?',
  'Yes, and it is empty',
  ['No, since there was nothing to write',
   'No, and the command fails',
   'Yes, containing a message saying there was no output'],
  'The file is prepared before the command runs, so it exists whether or not anything is written. '
  'That preparation is what makes the emptying behaviour matter.')

q('GB_SP_008', 'SP_FAM02_REDIRECTION_EFFECT', 'D1',
  'What does redirecting a command output achieve?',
  'It sends that channel to a file rather than to the screen',
  ['It saves a copy while still showing it',
   'It changes what the command produces',
   'It makes the command run faster'],
  'The destination changes and the content does not. The command behaves identically and its '
  'output ends up somewhere else.')

q('GB_SP_009', 'SP_FAM02_REDIRECTION_EFFECT', 'D2',
  'A user redirects a command output to a file and is surprised to see a message still appear on '
  'the screen. What is the explanation?',
  'The message was on the error channel, which was not redirected',
  ['The redirection failed',
   'The file was full',
   'The command wrote the message twice'],
  'Only the ordinary output channel was sent to the file. Errors continue to the screen unless '
  'they are redirected as well.')

# =========================================================================
# SP_FAM03_PIPE_MEANING — D1 x3, D2 x1
# =========================================================================
q('GB_SP_010', 'SP_FAM03_PIPE_MEANING', 'D1',
  'Two commands are joined by a pipe. What does the second receive?',
  'The ordinary output of the first, as its incoming channel',
  ['The name of the first command as an argument',
   'The errors produced by the first',
   'Nothing; the two simply run one after the other'],
  'The pipe connects one outgoing channel to the next incoming one. The second command reads it '
  'as though it were typed in.')

q('GB_SP_011', 'SP_FAM03_PIPE_MEANING', 'D1',
  'Do errors from the first command travel down a pipe to the second?',
  'No; a pipe carries the ordinary output channel only',
  ['Yes; everything the first produces is passed on',
   'Yes, but only if the first command fails',
   'No; errors stop the pipeline entirely'],
  'The error channel is not what the pipe connects, so errors go to the screen as usual. This is '
  'why an error can appear while the pipeline continues.')

q('GB_SP_012', 'SP_FAM03_PIPE_MEANING', 'D1',
  'Three commands are joined by two pipes. What does the third receive?',
  'The output of the second',
  ['The output of the first',
   'The outputs of the first and second combined',
   'The original input to the first'],
  'Each pipe connects one stage to the next, so each stage sees only what its immediate '
  'predecessor produced.')

q('GB_SP_013', 'SP_FAM03_PIPE_MEANING', 'D2',
  'A user pipes a command output into a second command and finds the second acting on nothing. '
  'The first produced only errors and no ordinary output. Why did the second receive nothing?',
  'Errors do not travel down a pipe, and there was no ordinary output to send',
  ['The pipe was written incorrectly',
   'The second command cannot read from a pipe',
   'The first command finished too quickly'],
  'The first command did produce something and put it on the channel the pipe does not carry. The '
  'second correctly received an empty input.')

# =========================================================================
# SP_FAM04_STAGE_INPUT — D2 x1, D3 x1
# =========================================================================
q('GB_SP_014', 'SP_FAM04_STAGE_INPUT', 'D2',
  'A file of ten lines is fed into a stage that keeps only lines containing the word error, and '
  'three lines contain it. That stage output goes to a stage that counts lines. What does the '
  'counting stage receive?',
  'Three lines',
  ['Ten lines', 'Seven lines', 'One line'],
  'The counting stage sees what reached it, which is what the filter let through. The original '
  'ten are no longer available to it.')

q('GB_SP_015', 'SP_FAM04_STAGE_INPUT', 'D3',
  'Twenty lines are fed through a stage keeping only lines containing "warn", which passes eight, '
  'and then through a stage keeping only lines containing "disk", which passes two of those '
  'eight. What does a fourth stage receive?',
  'Two lines',
  ['Twenty lines', 'Eight lines', 'Ten lines'],
  'Each stage narrows what the next one sees, so the fourth receives what survived both filters. '
  'The counts at earlier points are not recoverable later in the chain.')

# =========================================================================
# SP_FAM05_REPLACE_VS_ADD — D2 x1, D3 x1
# =========================================================================
q('GB_SP_016', 'SP_FAM05_REPLACE_VS_ADD', 'D2',
  'A file already contains fifty lines. A command producing three lines has its output redirected '
  'into that file in the replacing form. What does the file contain afterwards?',
  'The three new lines only',
  ['Fifty-three lines', 'The fifty original lines only',
   'The three new lines followed by the fifty original ones'],
  'The replacing form empties the file first. Adding to the end is a different form that would '
  'have given fifty-three.')

q('GB_SP_017', 'SP_FAM05_REPLACE_VS_ADD', 'D3',
  'A file contains a week of records. A command that turns out to produce no output at all has '
  'its output redirected into that file in the replacing form. What does the file contain '
  'afterwards?',
  'Nothing; it was emptied before the command ran and nothing replaced the contents',
  ['The week of records, since the command wrote nothing',
   'The week of records, plus an empty line',
   'Nothing, and the file no longer exists'],
  'Emptying happens as the redirection is set up rather than as output arrives. A command that '
  'produces nothing still destroys what was there.')

# =========================================================================
# SP_FAM06_ERROR_ROUTING — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_SP_018', 'SP_FAM06_ERROR_ROUTING', 'D2',
  'A command output is redirected to a log file. The command produces an error. Where does the '
  'error appear?',
  'On the screen',
  ['In the log file, with the output',
   'Nowhere; it is discarded',
   'In a separate file created automatically'],
  'Only the ordinary output channel was redirected. The error channel still points at the screen.')

q('GB_SP_019', 'SP_FAM06_ERROR_ROUTING', 'D3',
  'A scheduled job runs with its output redirected to a log and nobody watching the screen. It '
  'fails with an error. Where does the error go?',
  'To wherever the error channel points, which is not the log',
  ['Into the log, alongside the output',
   'To the person who scheduled the job',
   'Nowhere; scheduled jobs produce no errors'],
  'The redirection covered one channel and the job has no screen. Capturing the error channel as '
  'well is what makes a scheduled job diagnosable.')

q('GB_SP_020', 'SP_FAM06_ERROR_ROUTING', 'D4',
  'A team investigates a failure and finds their log file contains the output up to the point of '
  'failure and no explanation of it. Only the ordinary output channel was redirected into the '
  'log, and the explanation was produced on the error channel. Why is the explanation missing?',
  'It went to the error channel, which was never redirected into the log',
  ['The command failed before it could write the explanation',
   'The log file was truncated at the point of failure',
   'The command produced no explanation at all'],
  'The log is complete for what it was told to capture. Directing the error channel to the same '
  'file is what would have included the reason.',
  evidence='Only the ordinary output channel was redirected into the log')

# =========================================================================
# SP_FAM07_CHAIN_RESULT — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_SP_021', 'SP_FAM07_CHAIN_RESULT', 'D2',
  'The lines "apple", "banana", "apricot" and "cherry" pass through a stage that keeps only lines '
  'beginning with the letter a, and then through a stage that converts to upper case. What '
  'emerges?',
  'APPLE and APRICOT',
  ['apple and apricot', 'APPLE, BANANA, APRICOT and CHERRY', 'APPLE only'],
  'Two lines survive the filter and both are then converted. The order of the two stages gives '
  'filtered-then-converted rather than the reverse.')

q('GB_SP_022', 'SP_FAM07_CHAIN_RESULT', 'D3',
  'The lines "10", "3", "7" and "22" pass through a stage that keeps only lines of exactly one '
  'character, and then through a stage that sorts. What emerges?',
  '3 and 7, in that order',
  ['3, 7, 10 and 22 in order', '10, 3, 7 and 22 unchanged', '7 and 3, in that order'],
  'Only the two single-character lines survive, and sorting them puts 3 before 7. The two-digit '
  'lines never reach the sorting stage.')

q('GB_SP_023', 'SP_FAM07_CHAIN_RESULT', 'D4',
  'Six lines pass through a stage that removes duplicates, leaving four, and then through a stage '
  'that keeps only lines containing the letter x, of which three of the original six qualified '
  'and two survived the deduplication. Each stage acts on what the previous stage produced rather '
  'than on the original six. What emerges?',
  'Two lines',
  ['Three lines', 'Four lines', 'Six lines'],
  'The filter sees the deduplicated four rather than the original six, so two qualify. Applying '
  'the filter to the original set would have given three.',
  evidence='Each stage acts on what the previous stage produced rather than on the original six')

# =========================================================================
# SP_FAM08_COUNT_INTERPRETATION — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_SP_024', 'SP_FAM08_COUNT_INTERPRETATION', 'D2',
  'A file of one hundred lines is filtered to those containing the word failed, and the result is '
  'counted. The count reads twelve. What does twelve refer to?',
  'The lines containing the word failed',
  ['The lines in the file', 'The lines not containing the word',
   'The number of times the word appears'],
  'The counting stage counts what reached it, which is what the filter passed. The size of the '
  'original file is no longer visible at that point.')

q('GB_SP_025', 'SP_FAM08_COUNT_INTERPRETATION', 'D3',
  'A line contains the word failed three times. A pipeline filters for that word and counts '
  'lines. How much does that line contribute to the count?',
  'One, since the stage counts lines rather than occurrences',
  ['Three, once for each occurrence',
   'Nothing, since duplicates within a line are ignored',
   'It cannot be determined'],
  'Filtering keeps the line once and counting counts lines. Counting occurrences would need a '
  'different stage.')

q('GB_SP_026', 'SP_FAM08_COUNT_INTERPRETATION', 'D4',
  'A pipeline filters a log for errors, removes duplicate lines, and counts what remains, giving '
  'four. A team reports that four errors occurred. Duplicate lines were removed before the count, '
  'so identical errors occurring many times contribute one each. What does four actually count?',
  'Four distinct error lines, however many times each occurred',
  ['Four error occurrences in total',
   'Four lines in the original log',
   'Four different files containing errors'],
  'The deduplication stage is what separates the two readings. One error repeated a thousand '
  'times contributes one to this figure.',
  evidence='Duplicate lines were removed before the count')

# =========================================================================
# SP_FAM09_STAGE_ISOLATION — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_SP_027', 'SP_FAM09_STAGE_ISOLATION', 'D2',
  'A stage in the middle of a pipeline receives lines. Can it tell which file they came from?',
  'No; it receives the lines and nothing about their origin',
  ['Yes; the file name travels with the lines',
   'Yes, if the first stage read a file',
   'Only if the pipeline has exactly two stages'],
  'A stage sees the content arriving on its incoming channel and nothing else. Including the file '
  'name in the content is what makes it available.')

q('GB_SP_028', 'SP_FAM09_STAGE_ISOLATION', 'D3',
  'The same filtering stage is used once with its output going to the screen and once with its '
  'output going to a file. Does it behave differently?',
  'No; it produces the same output either way',
  ['Yes; it produces less output when writing to a file',
   'Yes; it formats differently for a file',
   'Only if the file already exists'],
  'A stage does not know where its output is going, so it cannot behave differently. Some tools '
  'do adjust their formatting when writing to a screen, and that is a deliberate feature rather '
  'than the general rule.')

q('GB_SP_029', 'SP_FAM09_STAGE_ISOLATION', 'D4',
  'A team wants a middle stage in a pipeline to behave differently when it is the last stage. A '
  'stage receives its input and produces its output without any information about what comes '
  'after it. What follows?',
  'It cannot, since nothing tells a stage what follows it',
  ['It can, by checking whether its output goes to a screen',
   'It can, by counting the stages in the pipeline',
   'It can, by asking the previous stage'],
  'Independence from context is what makes stages composable at all. Passing the intention in as '
  'a setting is how the requirement actually gets met.',
  evidence='A stage receives its input and produces its output without any information about what '
           'comes after it')

# =========================================================================
# SP_FAM10_INPUT_SOURCE — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_SP_030', 'SP_FAM10_INPUT_SOURCE', 'D2',
  'A command can be given a file as a named target, or the same file can be supplied on its '
  'incoming channel. What is the difference from the command point of view?',
  'In one case it knows the file name and in the other it receives only the contents',
  ['There is no difference at all',
   'In one case the content arrives faster',
   'In one case the content is read-only'],
  'The contents are identical and the knowledge of where they came from is not. That is why one '
  'form can report a file name in its output and the other cannot.')

q('GB_SP_031', 'SP_FAM10_INPUT_SOURCE', 'D3',
  'A command that normally prints the file name alongside each matching line is given its input '
  'on the incoming channel instead of as a named file. What happens to the file names in its '
  'output?',
  'They are absent, since the command was never told a name',
  ['They appear as before',
   'They appear as the word input',
   'The command refuses to run'],
  'The command cannot report what it was not given. Supplying the file as a named target is what '
  'restores the names.')

q('GB_SP_032', 'SP_FAM10_INPUT_SOURCE', 'D4',
  'A script searches several files and reports which file each match came from. A colleague '
  'rewrites it to feed the files in on the incoming channel instead. The rewritten form supplies '
  'only the contents, so the command is never told which file a line came from. What is lost?',
  'The file names, since the command receives contents with no indication of their source',
  ['Nothing; the same matches are found either way',
   'The matches themselves, since the search cannot work this way',
   'The order of the results'],
  'The same lines are found and their provenance is not. Naming the files as targets is what '
  'keeps the report usable.',
  evidence='The rewritten form supplies only the contents, so the command is never told which '
           'file a line came from')

# =========================================================================
# SP_FAM11_EMPTY_RESULT_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_SP_033', 'SP_FAM11_EMPTY_RESULT_DIAGNOSIS', 'D3',
  'A pipeline of four stages produces nothing. How should the responsible stage be found?',
  'Run the first stage alone, then the first two, and so on until the output disappears',
  ['Rewrite the pipeline from scratch',
   'Assume the last stage is at fault, since it produced the empty result',
   'Check whether the input file exists and stop there'],
  'Stopping at each point shows where the content is lost. The last stage produced the visible '
  'empty result and need not be the stage that emptied it.')

q('GB_SP_034', 'SP_FAM11_EMPTY_RESULT_DIAGNOSIS', 'D4',
  'A pipeline produces nothing. Running the first two stages alone produces forty lines, and '
  'running the first three produces nothing. The output survives two stages and disappears after '
  'the third. Which stage is responsible?',
  'The third, since the content was present before it and absent after',
  ['The fourth, since the pipeline ends with no output',
   'The first, since it read the input',
   'The second, since it passed forty lines'],
  'Bisecting the pipeline locates the loss precisely. The fourth stage received nothing and had '
  'nothing to lose.',
  evidence='The output survives two stages and disappears after the third')

# =========================================================================
# SP_FAM12_MISSING_ERROR_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_SP_035', 'SP_FAM12_MISSING_ERROR_DIAGNOSIS', 'D3',
  'A user saw an error on screen while a command output was being written to a file. The file '
  'does not contain the error. Why not?',
  'The error travelled on a channel that was not being written to the file',
  ['The file was written before the error occurred',
   'The error was too long to fit',
   'The command removed the error from the file'],
  'What went to the file is what was redirected there. The screen showed the other channel, which '
  'nothing captured.')

q('GB_SP_036', 'SP_FAM12_MISSING_ERROR_DIAGNOSIS', 'D4',
  'A pipeline captures its final output to a file. A stage in the middle produces an error, which '
  'appears on the screen. The team expected it in the file. A pipe carries only the ordinary '
  'output channel, so a middle stage error never enters the pipeline. Why is it not in the file?',
  'The error never entered the pipeline, so it could not reach the file at the end of it',
  ['The error was overwritten by later output',
   'The final stage discarded it',
   'The file captured only the last stage output and the error came from an earlier one'],
  'Each stage error channel goes to the screen independently of the pipe. Redirecting each '
  'stage error channel, or the whole pipeline, is what captures them.',
  evidence='A pipe carries only the ordinary output channel, so a middle stage error never enters '
           'the pipeline')

# =========================================================================
# SP_FAM13_ORDER_REASONING — D3 x1, D4 x1, D5 x3
# =========================================================================
q('GB_SP_037', 'SP_FAM13_ORDER_REASONING', 'D3',
  'A pipeline filters lines containing a word and then counts them. The two stages are swapped so '
  'that counting comes first. What changes?',
  'The result becomes the count of all lines rather than of the matching ones',
  ['Nothing; the same number is produced',
   'The result becomes zero',
   'The filter stops working'],
  'Counting first produces a single number, which the filter then examines. The filter is looking '
  'at a count rather than at the lines.')

q('GB_SP_038', 'SP_FAM13_ORDER_REASONING', 'D4',
  'A pipeline sorts lines and then removes duplicates. A colleague swaps the two so that '
  'duplicates are removed first. Removing duplicates does not depend on the order lines arrive '
  'in, and sorting does not depend on whether duplicates are present. Does the result change?',
  'No; the two stages commute here and the final set of lines is the same',
  ['Yes; duplicates can only be removed from sorted input',
   'Yes; the output will be unsorted',
   'Yes; some duplicates will survive'],
  'Neither stage needs what the other provides, so the order is free. Some tools remove only '
  'adjacent duplicates, which would make sorting a prerequisite, and this stem describes one that '
  'does not.',
  evidence='Removing duplicates does not depend on the order lines arrive in')

q('GB_SP_039', 'SP_FAM13_ORDER_REASONING', 'D5',
  'A pipeline takes the first ten lines and then filters for a word, producing two results. '
  'Swapping the two stages produces ten results. Taking the first ten before filtering limits the '
  'filter to those ten, while filtering first lets the whole input be searched. Which order '
  'answers the question "what are the first ten matching lines"?',
  'Filtering first, then taking ten, since the ten must be chosen from the matches',
  ['Taking ten first, then filtering, since ten is the limit',
   'Either; both produce the first ten matching lines',
   'Neither; the question needs a different pipeline'],
  'The two orders answer different questions, and only one of them is the question asked. Taking '
  'ten first answers "how many of the first ten match".',
  mode='TRANSFER',
  hinge='Taking the first ten before filtering limits the filter to those ten')

q('GB_SP_040', 'SP_FAM13_ORDER_REASONING', 'D5',
  'A pipeline processes a very large file. One stage filters out ninety per cent of the lines and '
  'one stage is slow and expensive per line. The expensive stage costs the same per line wherever '
  'it sits, and the filter reduces the number of lines reaching whatever follows it. Where should '
  'the expensive stage go?',
  'After the filter, so that it processes a tenth as many lines',
  ['Before the filter, so that no line is missed',
   'Either; the total work is the same',
   'Before the filter, so that the filter sees processed lines'],
  'Both orders give the same result here and not the same cost. Where the expensive stage changes '
  'what the filter would match, the orders stop being interchangeable and the cost argument no '
  'longer applies.',
  mode='TRADEOFF',
  hinge='The expensive stage costs the same per line wherever it sits')

q('GB_SP_041', 'SP_FAM13_ORDER_REASONING', 'D5',
  'A team moves a filtering stage earlier in a pipeline for speed, and the results change. The '
  'stage that used to run before the filter altered the lines in a way that affected whether the '
  'filter matched them. Why did the results change?',
  'The filter now sees the unaltered lines, and it matches them differently',
  ['Moving a stage earlier always changes the results',
   'The pipeline became too fast for the filter',
   'The filter was damaged by the move'],
  'Reordering is free only when neither stage affects what the other does. Here one stage was '
  'changing the very text the filter examines.',
  mode='EDGE',
  hinge='The stage that used to run before the filter altered the lines in a way that affected '
        'whether the filter matched them')

# =========================================================================
# SP_FAM14_PIPELINE_CHOICE — D4 x1, D5 x4
# =========================================================================
q('GB_SP_042', 'SP_FAM14_PIPELINE_CHOICE', 'D4',
  'A team needs the number of distinct users appearing in a log. Each line names one user and a '
  'user may appear many times. Users repeat across lines and the requirement is a count of '
  'distinct users rather than of lines. Which pipeline fits?',
  'Extract the user from each line, remove duplicates, then count',
  ['Extract the user from each line, then count',
   'Count the lines, then remove duplicates',
   'Remove duplicate lines, then count'],
  'Deduplication has to come between extraction and counting. Removing duplicate whole lines '
  'leaves a user appearing under different remaining text more than once.',
  evidence='Users repeat across lines and the requirement is a count of distinct users rather '
           'than of lines')

q('GB_SP_043', 'SP_FAM14_PIPELINE_CHOICE', 'D5',
  'A team wants a log file both captured to disk and visible on screen as it runs. Redirecting '
  'sends the output to one destination instead of the other rather than to both. Which approach '
  'fits?',
  'A stage that writes to a file and passes the same content onward',
  ['Redirect to the file, since it can be read afterwards',
   'Leave it on the screen, since it can be copied out',
   'Run the command twice, once for each destination'],
  'Redirecting is a move rather than a copy, so neither single destination meets the requirement. '
  'Running twice would produce two separate runs that need not agree.',
  mode='TRANSFER',
  hinge='Redirecting sends the output to one destination instead of the other rather than to both')

q('GB_SP_044', 'SP_FAM14_PIPELINE_CHOICE', 'D5',
  'A scheduled job must leave a record of everything that happened, including why it failed. '
  'Errors travel on a separate channel and are not captured by redirecting the ordinary output '
  'alone. What must the arrangement do?',
  'Capture both channels, since the reason for a failure travels on the error channel',
  ['Capture the ordinary output channel, which contains everything',
   'Capture the error channel only, since failures are what matter',
   'Capture neither, and rely on the reported result value'],
  'Capturing one channel leaves half the record missing, and which half depends on how the job '
  'went. The reported result value says that it failed and never why.',
  mode='EDGE',
  hinge='Errors travel on a separate channel and are not captured by redirecting the ordinary '
        'output alone')

q('GB_SP_045', 'SP_FAM14_PIPELINE_CHOICE', 'D5',
  'A team can build a report as one long pipeline of eight stages, or as a script with named '
  'intermediate steps. The pipeline is shorter to write and must be understood and modified by '
  'people joining the team throughout the year. The report will be modified repeatedly by people '
  'who did not write it. Which fits?',
  'The named steps, since the work is maintenance by people who did not write it',
  ['The pipeline, since it is shorter',
   'The pipeline, since fewer intermediate files are created',
   'Either, since the two produce the same report'],
  'Both produce the same report, so correctness cannot decide it. Eight anonymous stages have to '
  'be reconstructed from scratch by every reader.',
  mode='TRADEOFF',
  hinge='The report will be modified repeatedly by people who did not write it')

q('GB_SP_046', 'SP_FAM14_PIPELINE_CHOICE', 'D5',
  'A team must process a file too large to fit in memory. One approach reads the whole file into '
  'memory and sorts it; another passes it through a chain of stages, each handling a line at a '
  'time. The file is larger than the memory available and a chain of stages holds only what it is '
  'currently processing. Which fits?',
  'The chain of stages, since it never holds the whole file at once',
  ['The in-memory sort, since sorting is faster in memory',
   'Either, since both process the same file',
   'The in-memory sort, with the file split into pieces first'],
  'The constraint is what has to be held simultaneously rather than what is processed in total. '
  'Splitting first is a real technique and reintroduces the work the chain avoids.',
  mode='TRADEOFF',
  hinge='The file is larger than the memory available')

# =========================================================================
# SP_FAM15_COMPOSITION_TRANSFER — D4 x1, D5 x3
# =========================================================================
q('GB_SP_047', 'SP_FAM15_COMPOSITION_TRANSFER', 'D4',
  'A data platform lets steps be chained, each consuming what the previous produced. A step in the '
  'middle needs a value that was present in the original input and removed by an earlier step. '
  'Each step sees only what its predecessor produced, and the value was removed before this step. '
  'What follows?',
  'The value is unavailable to it, and an earlier step must carry it forward',
  ['The step can request the original input',
   'The step can ask the platform for the missing value',
   'The value is restored automatically when needed'],
  'The described chain has the same isolation as a pipeline, and the same consequence. Anything '
  'a later step needs has to survive every step before it.',
  evidence='Each step sees only what its predecessor produced, and the value was removed before '
           'this step')

q('GB_SP_048', 'SP_FAM15_COMPOSITION_TRANSFER', 'D5',
  'A processing framework reports success for a chain when the final step succeeds. A middle step '
  'fails, produces nothing, and the final step succeeds on the empty input. The final step '
  'succeeded on an empty input and the chain is judged by the final step alone. What does the '
  'reported success mean?',
  'Only that the last step ran without error, which an empty input allowed it to do',
  ['That every step in the chain succeeded',
   'That the chain produced correct output',
   'That the middle step recovered from its failure'],
  'Judging a chain by its last step hides failures upstream, exactly as a pipeline can. Checking '
  'each step, or checking that the output is non-empty, is what closes the gap.',
  mode='TRANSFER',
  hinge='The final step succeeded on an empty input and the chain is judged by the final step '
        'alone')

q('GB_SP_049', 'SP_FAM15_COMPOSITION_TRANSFER', 'D5',
  'A build system chains tasks so that each consumes the previous output. A team adds a task that '
  'writes a report to the screen and passes nothing onward. Each task consumes what the previous '
  'produced, and this one produces nothing. What happens to the tasks after it?',
  'They receive nothing, so the chain effectively ends there',
  ['They receive the report that was written to the screen',
   'They receive the output of the task before it',
   'They fail with an error about the missing input'],
  'Writing to the screen is not the same as passing something on, and the chain carries only what '
  'is passed. A task meant to observe without interrupting has to pass its input through '
  'unchanged.',
  mode='EDGE', hinge='this one produces nothing')

q('GB_SP_050', 'SP_FAM15_COMPOSITION_TRANSFER', 'D5',
  'A team must decide whether to build a transformation as one large step or as five small ones '
  'chained together. The five would each be independently testable and would pass data between '
  'them; the one large step would hold everything internally. Five chained steps can each be '
  'tested on their own, while one large step can only be tested end to end. Which fits a system '
  'that must be verified in detail?',
  'The five chained steps, since each can be checked independently',
  ['The one large step, since it has fewer moving parts',
   'The one large step, since passing data between steps is expensive',
   'Either, since both produce the same transformation'],
  'Composability buys exactly what the requirement asks for, which is the ability to check the '
  'parts. Where verification did not matter, the single step and its lower overhead would be a '
  'reasonable choice.',
  mode='TRADEOFF',
  hinge='Five chained steps can each be tested on their own, while one large step can only be '
        'tested end to end')
