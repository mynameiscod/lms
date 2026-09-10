# -*- coding: utf-8 -*-
"""
Wave 8 — IDE_PROFICIENCY, 50 Golden Bank questions, all newly authored.

NO EDITOR IS EVER NAMED AND NO MENU IS EVER DESCRIBED. A question asking where a command lives
measures memory of one product and is wrong after the next release. Every capability here is
described by what it answers — "a search that finds where a name is defined", "a report of every
place a name is used" — so the skill survives any tool and any version.

THIS IS NOT DEBUGGING. The banked debugging skill measures method once something has failed: what
would reproduce it, which hypothesis the evidence supports. Nothing here starts from a failure.
What is measured is what the tool is telling you and how far that can be trusted — what a search
covered, what a rename reached, what a marker is claiming, and what the absence of a marker
establishes.

THE ANSWER IS ALMOST ALWAYS "NARROWER THAN YOU THINK". A search covered what it was pointed at. A
usage report found what the tool could see. A clean report means the tool found nothing it checks
for. Every one of those is a genuine and limited result, and treating any of them as a verdict is
the failure this skill exists to catch.

BOTH DIRECTIONS OF MISTRUST ARE MEASURED. Editing correct code to silence a stale warning is
expensive and common; so is dismissing every inconvenient marker as stale. The family that
measures one contains the other.
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
# ID_FAM01_FEATURE_MATCH — D1 x4, D2 x1
# =========================================================================
q('GB_ID_001', 'ID_FAM01_FEATURE_MATCH', 'D1',
  'A developer wants to know where a function was written. Which kind of feature answers that?',
  'One that jumps to where a name is defined',
  ['One that lists every place the name is used',
   'One that searches the project for matching text',
   'One that renames the name everywhere'],
  'Finding the definition and finding the uses are opposite questions. A text search would find '
  'both and force the developer to sort them out by eye.')

q('GB_ID_002', 'ID_FAM01_FEATURE_MATCH', 'D1',
  'A developer wants to know everywhere a function is called before changing it. Which kind of '
  'feature answers that?',
  'One that reports every place the name is used',
  ['One that jumps to where the name is defined',
   'One that renames the name everywhere',
   'One that reformats the file'],
  'The question is about uses rather than the definition. Renaming would change them rather than '
  'reporting them.')

q('GB_ID_003', 'ID_FAM01_FEATURE_MATCH', 'D1',
  'A developer wants to find every place a particular phrase appears in comments. Which kind of '
  'feature answers that?',
  'One that searches for matching text',
  ['One that jumps to where a name is defined',
   'One that reports where a name is used',
   'One that renames a name everywhere'],
  'Comments carry no meaning the tool understands, so a text search is the right instrument. The '
  'meaning-aware features would ignore them entirely.')

q('GB_ID_004', 'ID_FAM01_FEATURE_MATCH', 'D1',
  'What distinguishes a text search from a search that understands the code?',
  'One matches characters and the other matches the thing a name refers to',
  ['One is faster than the other',
   'One works on saved files and the other on open ones',
   'One is case sensitive and the other is not'],
  'A text search finds a name inside a comment and inside a longer word. A meaning-aware search '
  'finds the specific thing and skips coincidental matches.')

q('GB_ID_005', 'ID_FAM01_FEATURE_MATCH', 'D2',
  'A developer uses a text search to find every call to a function named "run" and receives '
  'hundreds of results. What accounts for that?',
  'The text appears inside longer words, comments and unrelated names',
  ['The function really is called hundreds of times',
   'The search covered too many directories',
   'The search was case insensitive'],
  'A short common name matches a great deal of text that has nothing to do with it. A '
  'meaning-aware usage report would have found only the calls.')

# =========================================================================
# ID_FAM02_SEARCH_SCOPE — D1 x3, D2 x1
# =========================================================================
q('GB_ID_006', 'ID_FAM02_SEARCH_SCOPE', 'D1',
  'A project-wide search returns no results for a name. What does that establish?',
  'That the name was not found in what the search covered',
  ['That the name does not appear in the project',
   'That the name has been deleted',
   'That the name was never used'],
  'A search reports on what it looked at. What it looked at is a separate question with its own '
  'answer.')

q('GB_ID_007', 'ID_FAM02_SEARCH_SCOPE', 'D1',
  'A project excludes a directory of generated files from searching. A name used only there is '
  'searched for. What is reported?',
  'No results, because the excluded directory was not examined',
  ['The uses in the excluded directory',
   'A warning that a directory was skipped',
   'An error, since the name exists'],
  'Exclusions are silent by design, so the search simply reports nothing. Knowing what is '
  'excluded is what makes an empty result interpretable.')

q('GB_ID_008', 'ID_FAM02_SEARCH_SCOPE', 'D1',
  'Which question does an empty search result answer?',
  'Whether the text was found in the searched files',
  ['Whether the text exists anywhere in the project',
   'Whether the text was ever used',
   'Whether the code compiles'],
  'The result is about the files examined and nothing beyond them. Widening the claim is where '
  'the mistake gets made.')

q('GB_ID_009', 'ID_FAM02_SEARCH_SCOPE', 'D2',
  'A developer searches for a function name, finds no results, and deletes the function as '
  'unused. It breaks the build. What did the search fail to cover?',
  'Somewhere the name is used that the search did not examine',
  ['The definition of the function itself',
   'The comments in the project',
   'The most recently edited files'],
  'Something used the function and the search did not look there — an excluded directory, a '
  'configuration file, or a name assembled at run time. The empty result was accurate and '
  'narrower than it appeared.')

# =========================================================================
# ID_FAM03_INDICATOR_MEANING — D1 x3, D2 x1
# =========================================================================
q('GB_ID_010', 'ID_FAM03_INDICATOR_MEANING', 'D1',
  'A line is underlined in an editor with a note suggesting a shorter way to write it. What kind '
  'of claim is that?',
  'A style suggestion, not a statement that the code is wrong',
  ['A statement that the code will fail',
   'A statement that the code will not compile',
   'A statement that the code has been tested'],
  'Suggestions about how something is written are separate from claims that it is broken. Both '
  'appear as underlines and mean different things.')

q('GB_ID_011', 'ID_FAM03_INDICATOR_MEANING', 'D1',
  'A marker reports that a name cannot be found. What kind of claim is that?',
  'That the tool could not resolve the name, which usually means the code will not build',
  ['That the code is badly written',
   'That the code is slow',
   'That the code has not been saved'],
  'An unresolvable name is a claim about correctness rather than style. It is the kind of marker '
  'worth acting on immediately.')

q('GB_ID_012', 'ID_FAM03_INDICATOR_MEANING', 'D1',
  'Two editors show different markers on the same file. What does that indicate?',
  'That the two are checking for different things',
  ['That one of the two is faulty',
   'That the file changed between the two',
   'That one editor is a newer version'],
  'A marker is one tool opinion, and different tools hold different opinions. Neither is a '
  'property of the code itself.')

q('GB_ID_013', 'ID_FAM03_INDICATOR_MEANING', 'D2',
  'A developer treats every underline in their editor as something that must be removed before '
  'committing. What is the weakness?',
  'Style suggestions and genuine faults are being treated as one thing',
  ['Nothing; a clean file is always better',
   'Underlines cannot be removed',
   'The editor will re-add them anyway'],
  'Some markers report code that will not build and others express a preference. Treating them '
  'alike either wastes time or lets a real fault through in the noise.')

# =========================================================================
# ID_FAM04_DEFINITION_LOOKUP — D2 x1, D3 x1
# =========================================================================
q('GB_ID_014', 'ID_FAM04_DEFINITION_LOOKUP', 'D2',
  'A developer follows a function name to its definition and arrives somewhere. What has the tool '
  'done?',
  'Taken them to where it worked out the name is defined',
  ['Searched the project for matching text',
   'Guessed based on the file currently open',
   'Taken them to the first definition alphabetically'],
  'The jump rests on the tool understanding of the code. That understanding can be wrong, which '
  'is why the destination is worth glancing at.')

q('GB_ID_015', 'ID_FAM04_DEFINITION_LOOKUP', 'D3',
  'Two different modules each define a function with the same name, and a developer follows one '
  'call. What determines where they land?',
  'Which definition the tool has worked out this call refers to',
  ['Which definition appears first in the project',
   'Which file was most recently edited',
   'Which module has the shorter name'],
  'The tool resolves the call the way the language would, and lands on that one. Where two '
  'definitions genuinely could apply, some tools offer a choice instead.')

# =========================================================================
# ID_FAM05_USAGE_COMPLETENESS — D2 x1, D3 x1
# =========================================================================
q('GB_ID_016', 'ID_FAM05_USAGE_COMPLETENESS', 'D2',
  'A usage report lists eight places a function is called. What does it establish?',
  'That the tool found eight; whether there are others depends on what it could see',
  ['That the function is called exactly eight times',
   'That the function is called from eight files',
   'That the function is safe to change'],
  'The report covers what the tool understood. Calls constructed at run time or made from '
  'configuration are outside what it can resolve.')

q('GB_ID_017', 'ID_FAM05_USAGE_COMPLETENESS', 'D3',
  'A project calls some functions by name assembled from a string at run time. A usage report for '
  'one such function shows no results. What follows?',
  'The report cannot see calls of that kind, so the absence proves nothing',
  ['The function is genuinely unused',
   'The report has failed and should be run again',
   'The function is called from a different project'],
  'A name that only exists as text at run time is invisible to a meaning-aware search. A plain '
  'text search would find the string.')

# =========================================================================
# ID_FAM06_RENAME_REACH — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_ID_018', 'ID_FAM06_RENAME_REACH', 'D2',
  'A developer renames a function through the editor. What is changed?',
  'The definition and every use the tool recognised',
  ['Every occurrence of that text in the project',
   'The definition only',
   'The definition and the uses in the open file only'],
  'The rename follows the tool understanding of what refers to what. A text-based replacement '
  'would change every occurrence including coincidental ones.')

q('GB_ID_019', 'ID_FAM06_RENAME_REACH', 'D3',
  'A function name also appears in a comment and in a configuration file. A rename is performed '
  'through the editor. What happens to those two?',
  'Both are left unchanged, since neither is a use the tool recognises',
  ['Both are updated along with the code',
   'The comment is updated and the configuration file is not',
   'The configuration file is updated and the comment is not'],
  'Neither a comment nor a configuration entry is code the tool resolves. Both have to be found '
  'and changed separately.')

q('GB_ID_020', 'ID_FAM06_RENAME_REACH', 'D4',
  'A developer renames a class through the editor, the project builds cleanly, and the '
  'application fails at start-up. The class name appears in a configuration file that is read at '
  'run time, and a rename changes only what the tool recognises as code. What happened?',
  'The configuration still names the old class, and nothing checked it at build time',
  ['The rename missed some of the code',
   'The build succeeded incorrectly',
   'The new name conflicts with an existing one'],
  'Building cleanly is exactly what makes this hard to anticipate. The configuration is read at '
  'run time and nothing connects it to the rename.',
  evidence='The class name appears in a configuration file that is read at run time')

# =========================================================================
# ID_FAM07_TERMINAL_LOCATION — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_ID_021', 'ID_FAM07_TERMINAL_LOCATION', 'D2',
  'A terminal is opened inside an editor. Which directory does it usually start in?',
  'The root of the project being edited',
  ['The directory of the file currently open',
   'The user home directory',
   'The directory where the editor is installed'],
  'The project root is the common convention, and it need not match the open file. Which one a '
  'given tool uses is worth checking rather than assuming.')

q('GB_ID_022', 'ID_FAM07_TERMINAL_LOCATION', 'D3',
  'A file is open at a path several directories below the project root, and a terminal is opened '
  'inside the editor. A relative path that works when running from the file own directory is '
  'typed in. What happens?',
  'It resolves from the project root instead and does not reach the intended file',
  ['It resolves from the file directory as intended',
   'The terminal refuses the path',
   'The terminal moves to the file directory automatically'],
  'The terminal location and the open file location are independent. A relative path is resolved '
  'from wherever the terminal actually is.')

q('GB_ID_023', 'ID_FAM07_TERMINAL_LOCATION', 'D4',
  'A command works when typed into the editor terminal and fails when a colleague runs the '
  'identical command from their own shell. The command contains a relative path and the two '
  'terminals were started in different directories. What is the cause?',
  'The relative path resolves from a different directory in each case',
  ['The colleague lacks permission on the file',
   'The editor modifies the command before running it',
   'The command depends on the editor being open'],
  'The command line is identical and what it names is not. Using a path from the project root, or '
  'moving to a known directory first, removes the dependence.',
  evidence='The command contains a relative path and the two terminals were started in different '
           'directories')

# =========================================================================
# ID_FAM08_RUN_ENVIRONMENT — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_ID_024', 'ID_FAM08_RUN_ENVIRONMENT', 'D2',
  'A developer presses run in an editor. What executes the code?',
  'An interpreter or compiler installed separately, chosen by a setting',
  ['The editor itself',
   'The operating system directly',
   'Whichever tool was used to write the code'],
  'The editor hands the work to something else and displays the result. Which something is a '
  'configuration choice.')

q('GB_ID_025', 'ID_FAM08_RUN_ENVIRONMENT', 'D3',
  'Three versions of a language are installed on a machine. Which one runs the code when the '
  'developer presses run?',
  'Whichever the project or editor setting names',
  ['The newest installed version',
   'The oldest installed version',
   'Whichever was installed most recently'],
  'A setting decides, and it may name a version quite unlike what the developer expects. Nothing '
  'about being newest gives a version priority.')

q('GB_ID_026', 'ID_FAM08_RUN_ENVIRONMENT', 'D4',
  'A developer installs a library and the editor still reports that it cannot be found when the '
  'code runs. The library was installed into one environment and the editor is configured to run '
  'the code with a different one. What is the cause?',
  'The library and the run configuration point at different environments',
  ['The library failed to install',
   'The editor needs restarting to see new libraries',
   'The library is incompatible with the code'],
  'The install succeeded and put the library somewhere the running code never looks. Pointing the '
  'run configuration at the same environment resolves it.',
  evidence='The library was installed into one environment and the editor is configured to run '
           'the code with a different one')

# =========================================================================
# ID_FAM09_MARKER_VS_OUTCOME — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_ID_027', 'ID_FAM09_MARKER_VS_OUTCOME', 'D2',
  'A file shows no markers of any kind. What does that establish about running it?',
  'Nothing; the tool found nothing it checks for',
  ['That it will run correctly',
   'That it will compile and run without error',
   'That it has been tested'],
  'A clean file means the checks the tool performs found nothing. Whether the code does the right '
  'thing is not among those checks.')

q('GB_ID_028', 'ID_FAM09_MARKER_VS_OUTCOME', 'D3',
  'A file shows several markers and the program runs correctly. Is that contradictory?',
  'No; markers may report style preferences or checks the running code does not depend on',
  ['Yes; a marked file cannot run correctly',
   'Yes; the program must be failing silently',
   'No, but only because the markers are stale'],
  'Plenty of markers report things that are not errors. The program running says nothing about '
  'whether the suggestions were worth taking.')

q('GB_ID_029', 'ID_FAM09_MARKER_VS_OUTCOME', 'D4',
  'A program fails when run, and the developer looks for a marked line to explain it. The file '
  'shows no markers at all. The tool reports nothing and the program failed at run time on '
  'something the tool does not check. What follows?',
  'The fault is of a kind the tool does not examine, so the markers cannot help here',
  ['The tool has failed to update its markers',
   'The program failure must be unrelated to the code',
   'The file must be reopened for the markers to appear'],
  'Most run-time faults — a wrong value, a missing file, a bad assumption — are invisible to a '
  'tool reading the code. Looking to the markers for them is looking in the wrong place.',
  evidence='The tool reports nothing and the program failed at run time on something the tool '
           'does not check')

# =========================================================================
# ID_FAM10_EXTENSION_ROLE — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_ID_030', 'ID_FAM10_EXTENSION_ROLE', 'D2',
  'A developer installs an extension giving their editor knowledge of a language. What has become '
  'possible?',
  'The editor can understand and check code in that language',
  ['The language is now installed and can run code',
   'Code in that language will now compile',
   'The editor can run the code without anything else'],
  'The extension teaches the editor about the language. Running the code needs the language '
  'itself, installed separately.')

q('GB_ID_031', 'ID_FAM10_EXTENSION_ROLE', 'D3',
  'A developer installs a language extension, writes code, and finds the editor understands it '
  'perfectly while pressing run produces an error saying the command is not found. What is '
  'missing?',
  'The language itself, which the extension does not install',
  ['A second extension for running code',
   'A restart of the editor',
   'A project configuration file'],
  'The two capabilities come from different places and are easy to conflate. Understanding the '
  'code and being able to execute it are separate installations.')

q('GB_ID_032', 'ID_FAM10_EXTENSION_ROLE', 'D4',
  'A developer opens a file in a language for which no extension is installed. No markers appear '
  'anywhere in the file. Without an extension the editor has no knowledge of the language, so it '
  'has nothing to check the file against. What does the absence of markers establish?',
  'Nothing at all; the editor has nothing to check the file against',
  ['That the file is free of errors',
   'That the file is empty',
   'That the file will run correctly'],
  'This is the strongest form of the trap: a clean file that has not been examined. Installing '
  'the extension often produces a page of markers on the same unchanged file.',
  evidence='Without an extension the editor has no knowledge of the language')

# =========================================================================
# ID_FAM11_STALE_MARKER_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_ID_033', 'ID_FAM11_STALE_MARKER_DIAGNOSIS', 'D3',
  'A marker reports that a name cannot be found. The developer has just created that name in '
  'another file. What is the likely explanation?',
  'The tool has not re-examined the project since the name was created',
  ['The name was created incorrectly',
   'The name must be created in the same file',
   'The tool has found a second name with the same spelling'],
  'The tool reports what was true when it last looked. Prompting it to re-examine the project is '
  'the usual remedy.')

q('GB_ID_034', 'ID_FAM11_STALE_MARKER_DIAGNOSIS', 'D4',
  'A developer changes correct code to remove a marker, and the program stops working. The marker '
  'described the code as it had been several edits earlier and no longer applied. What went '
  'wrong?',
  'The marker was out of date and the code it described had already been corrected',
  ['The marker was accurate and the change was made incorrectly',
   'The program failure is unrelated to the change',
   'The marker should have been reported as an error rather than a warning'],
  'Editing working code to satisfy a stale claim is the expensive direction of this fault. '
  'Confirming that the marker still applies before acting on it is what prevents it.',
  evidence='The marker described the code as it had been several edits earlier')

# =========================================================================
# ID_FAM12_WRONG_ENVIRONMENT_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_ID_035', 'ID_FAM12_WRONG_ENVIRONMENT_DIAGNOSIS', 'D3',
  'Code runs correctly from a terminal and fails in the editor with an error about a missing '
  'library. What is the likely cause?',
  'The editor is running the code with a different environment from the terminal',
  ['The library was never installed',
   'The editor cannot run code with libraries',
   'The code is different in the two cases'],
  'The same code succeeding in one place and failing in another points at what is running it. '
  'The library exists somewhere, or the terminal run would have failed too.')

q('GB_ID_036', 'ID_FAM12_WRONG_ENVIRONMENT_DIAGNOSIS', 'D4',
  'A developer follows an installation instruction, sees it report success, and the editor still '
  'cannot find the library. The install ran in one environment and the editor is configured to '
  'use another, and both are present on the machine. What should they check?',
  'Which environment the editor is configured to use, and whether the install went to that one',
  ['Whether the install genuinely succeeded',
   'Whether the library supports their operating system',
   'Whether the editor needs reinstalling'],
  'Both reports are accurate about different environments. Making the install and the run '
  'configuration agree is the whole of the fix.',
  evidence='The install ran in one environment and the editor is configured to use another')

# =========================================================================
# ID_FAM13_TOOL_SILENCE_REASONING — D3 x1, D4 x1, D5 x3
# =========================================================================
q('GB_ID_037', 'ID_FAM13_TOOL_SILENCE_REASONING', 'D3',
  'A tool that checks for unused variables reports nothing on a file. What has been established?',
  'That it found no unused variables',
  ['That the file has no problems',
   'That every variable is used correctly',
   'That the file is well written'],
  'The claim is exactly as wide as what the tool checks. Everything outside that remains '
  'unexamined.')

q('GB_ID_038', 'ID_FAM13_TOOL_SILENCE_REASONING', 'D4',
  'A team runs three tools over a file and all report nothing. They conclude the file is correct. '
  'The three tools between them check formatting, unused names and type consistency, and none '
  'examines whether the logic is right. What has been established?',
  'That the file passes those three kinds of check, which do not include whether it does the '
  'right thing',
  ['That the file is correct',
   'That the file has no faults of any kind',
   'Nothing, since automated tools are unreliable'],
  'Three narrow checks passing is genuinely worth something and is not a verdict on behaviour. '
  'Tests are what examine whether the code does what was wanted.',
  evidence='none examines whether the logic is right')

q('GB_ID_039', 'ID_FAM13_TOOL_SILENCE_REASONING', 'D5',
  'A developer relies on the absence of markers as their only check before committing. Their '
  'editor has no extension installed for one of the languages in the project. Files in that '
  'language are never examined, and their cleanliness is indistinguishable from a file that has '
  'passed every check. What is the position?',
  'Files in that language pass unchecked, and nothing in the editor distinguishes them from '
  'checked ones',
  ['All files are checked equally',
   'Files in that language will show an error about the missing extension',
   'The editor will refuse to open files it cannot check'],
  'The absence of a marker means the same thing visually whether the file passed or was never '
  'looked at. A check that runs outside the editor removes the ambiguity.',
  mode='EDGE',
  hinge='Files in that language are never examined, and their cleanliness is indistinguishable '
        'from a file that has passed every check')

q('GB_ID_040', 'ID_FAM13_TOOL_SILENCE_REASONING', 'D5',
  'A team adds a rule that no code may be committed while any marker is showing. Some markers '
  'report genuine faults and others express style preferences that the team disagrees with. The '
  'rule treats a preference the team rejects and a genuine fault as equally blocking. What will '
  'happen?',
  'People will silence the preferences they disagree with, and the habit will extend to genuine '
  'faults',
  ['Every genuine fault will be fixed before committing',
   'The style preferences will gradually be adopted',
   'Nothing; the rule is unambiguous and workable'],
  'A rule that blocks on things the team considers wrong teaches people to suppress markers. '
  'Configuring the tool to stop reporting the unwanted preferences keeps the rule meaningful.',
  mode='TRANSFER',
  hinge='The rule treats a preference the team rejects and a genuine fault as equally blocking')

q('GB_ID_041', 'ID_FAM13_TOOL_SILENCE_REASONING', 'D5',
  'A developer notices that a tool stops reporting a particular kind of problem after a '
  'configuration change somebody made months ago. The tool has been silent on that check since '
  'the change, and silence looks identical whether a check is passing or disabled. What follows '
  'about the intervening months?',
  'Nothing was being checked, and every clean report since then said less than it appeared to',
  ['The problems were fixed, which is why reporting stopped',
   'The tool has been failing and should be reinstalled',
   'The check was reporting nothing because there was nothing to report'],
  'A disabled check and a passing check produce the same silence. Reviewing what is enabled is '
  'the only way to tell one from the other.',
  mode='EDGE',
  hinge='silence looks identical whether a check is passing or disabled')

# =========================================================================
# ID_FAM14_ROUTE_CHOICE — D4 x1, D5 x4
# =========================================================================
q('GB_ID_042', 'ID_FAM14_ROUTE_CHOICE', 'D4',
  'A developer must find every place a method is called before changing its signature. The method '
  'has a common name that also appears in comments and inside longer words. The question is about '
  'calls to one specific method rather than about occurrences of the text. Which approach fits?',
  'A usage report, which resolves the name rather than matching the text',
  ['A text search for the method name',
   'A text search restricted to one directory',
   'Reading each file in the project'],
  'The text search would return a great deal that has nothing to do with the method. Reading '
  'every file would work and is the slowest route available.',
  evidence='The question is about calls to one specific method rather than about occurrences of '
           'the text')

q('GB_ID_043', 'ID_FAM14_ROUTE_CHOICE', 'D5',
  'A developer must find every place a configuration key is referenced. The key is named as a '
  'string in code and in several configuration files. The key exists only as text and is never a '
  'name the tool resolves. Which approach fits?',
  'A text search, since the key is text everywhere it appears',
  ['A usage report, which understands the code',
   'Following the key to its definition',
   'Renaming the key and seeing what breaks'],
  'Meaning-aware features resolve names in code and a string is not one. Renaming to see what '
  'breaks would work and destroys the running system to answer a question.',
  mode='TRANSFER', hinge='The key exists only as text and is never a name the tool resolves')

q('GB_ID_044', 'ID_FAM14_ROUTE_CHOICE', 'D5',
  'A developer must rename something referenced both as code and as a string in configuration. '
  'The name appears both as code the tool resolves and as text in files it does not. What '
  'approach fits?',
  'The rename feature for the code, followed by a text search for the remaining occurrences',
  ['The rename feature alone, which handles both',
   'A text replacement alone, which handles both',
   'Neither; the name should not be changed'],
  'Each instrument covers one half and neither covers both. A text replacement alone would also '
  'change coincidental matches inside longer words.',
  mode='TRADEOFF',
  hinge='The name appears both as code the tool resolves and as text in files it does not')

q('GB_ID_045', 'ID_FAM14_ROUTE_CHOICE', 'D5',
  'A developer can spend ten minutes learning a feature that would answer this question in '
  'seconds, or twenty minutes answering it by hand. They will face this question several times a '
  'week. The question recurs several times a week and the feature answers it in seconds. What '
  'follows?',
  'Learn the feature, since the cost is paid once and the saving recurs',
  ['Answer it by hand, since twenty minutes is not long',
   'Answer it by hand this time and learn the feature later',
   'Neither; the question should be avoided'],
  'A one-off cost against a recurring saving is settled by the recurrence. For a question asked '
  'once, doing it by hand would be the right answer.',
  mode='TRADEOFF', hinge='The question recurs several times a week')

q('GB_ID_046', 'ID_FAM14_ROUTE_CHOICE', 'D5',
  'A developer needs to know what a program actually does at a particular point. They can read '
  'the code carefully or run it and observe. The code is short and calls into several libraries '
  'whose behaviour they do not know. Reading the code would require understanding libraries they '
  'have never used. Which fits?',
  'Running it and observing, since reading requires knowledge they do not have',
  ['Reading it carefully, since reading is always more reliable',
   'Reading it carefully, since the code is short',
   'Neither; they should ask a colleague'],
  'Reading is the better route when the code is self-contained, and here it is not. The length of '
  'the code is not what makes it readable.',
  mode='TRADEOFF',
  hinge='Reading the code would require understanding libraries they have never used')

# =========================================================================
# ID_FAM15_EDITOR_TRANSFER — D4 x1, D5 x3
# =========================================================================
q('GB_ID_047', 'ID_FAM15_EDITOR_TRANSFER', 'D4',
  'An unfamiliar tool advertises a check that reports every function never called from anywhere '
  'in the project. It reports three functions. The check examines calls it can resolve within the '
  'project and cannot see calls made from outside it. What has it established?',
  'That three functions have no resolvable call within the project, which is narrower than being '
  'unused',
  ['That three functions are unused and can be deleted',
   'That the project contains only three unnecessary functions',
   'Nothing; such checks are unreliable'],
  'Functions called from another project, from configuration or by name at run time are outside '
  'what it can see. The report is genuinely useful as a list of candidates to investigate.',
  evidence='The check examines calls it can resolve within the project and cannot see calls made '
           'from outside it')

q('GB_ID_048', 'ID_FAM15_EDITOR_TRANSFER', 'D5',
  'An unfamiliar tool offers to apply a fix automatically wherever it finds a particular pattern. '
  'A developer applies it across a large project. The tool applies its change wherever the '
  'pattern matches, without regard to whether each match was intended to be that way. What should '
  'they do before accepting?',
  'Review what it changed, since a matching pattern is not always a mistake',
  ['Accept it, since the tool found genuine matches',
   'Accept it, since automatic fixes are tested by their authors',
   'Reject it, since automatic fixes are never safe'],
  'The tool is right about the pattern and cannot know which occurrences were deliberate. '
  'Reviewing the change is the step that separates the two.',
  mode='TRANSFER',
  hinge='The tool applies its change wherever the pattern matches')

q('GB_ID_049', 'ID_FAM15_EDITOR_TRANSFER', 'D5',
  'A developer moves to an unfamiliar editor and finds that a search returns far fewer results '
  'than the same search in their previous one. The new editor excludes files listed as ignored by '
  'the project, and the previous one did not. Which is right?',
  'Neither; the two are answering different questions and the developer has to know which they '
  'want',
  ['The previous editor, since more results is more complete',
   'The new editor, since ignored files should not be searched',
   'The new editor, since fewer results are easier to read'],
  'Searching generated files is sometimes exactly what is wanted and sometimes noise. Knowing '
  'which behaviour a tool has is what makes an empty result interpretable.',
  mode='EDGE',
  hinge='The new editor excludes files listed as ignored by the project, and the previous one did '
        'not')

q('GB_ID_050', 'ID_FAM15_EDITOR_TRANSFER', 'D5',
  'A team must decide whether their agreed checks should run in the editor, in a step everyone '
  'runs before committing, or both. Editor checks give immediate feedback and can be configured '
  'away individually, while a shared step runs the same way for everyone. Immediate feedback is '
  'per-developer and configurable, and the shared step is identical for everyone. Which fits a '
  'team that needs the checks actually applied?',
  'Both, with the shared step as the one that decides and the editor as the one that gives '
  'feedback early',
  ['The editor alone, since feedback is most useful while writing',
   'The shared step alone, since it is the one that counts',
   'Either, since the checks are the same'],
  'Each covers what the other cannot: the editor is fast and optional, the shared step is '
  'authoritative and late. Choosing one gives up either the speed or the guarantee.',
  mode='TRADEOFF',
  hinge='Immediate feedback is per-developer and configurable, and the shared step is identical '
        'for everyone')
