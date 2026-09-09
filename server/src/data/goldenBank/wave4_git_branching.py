# -*- coding: utf-8 -*-
"""
Wave 4 — GIT_BRANCHING, 50 Golden Bank questions, all newly authored.

TWO BELIEFS DO ALL THE DAMAGE HERE. The first is that a branch is a copy of the folder, which makes
branching feel expensive and merging feel impossible. The second is that any two changes to one
file clash, which makes students avoid branching altogether. The conflict families are built so
that most stems do NOT conflict: different files, different regions of one file, and identical
changes to one line all merge silently, and only genuinely competing text needs a decision.

"MISSING FROM THIS BRANCH" IS NOT "LOST". The diagnostic families exist to separate those two, and
every wrong-branch item is written so that the work demonstrably still exists somewhere.

EVERY EXPLANATION STATES ITS OWN ANSWER in the words the key holds.
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
# GB_FAM01_BRANCH_PURPOSE — D1 x4, D2 x1
# =========================================================================
q('GB_GBR_001', 'GB_FAM01_BRANCH_PURPOSE', 'D1',
  'What does branching make possible that working in a single line of history does not?',
  'Carrying unfinished work forward without disturbing the version that already works',
  ['Keeping a spare copy of the project in case of accident',
   'Giving each person on the team a project of their own',
   'Storing files that are too large to record'],
  'A branch lets half-done work be recorded and returned to, so it allows carrying unfinished work '
  'forward without disturbing the version that already works. In one line, unfinished work and '
  'working code have to share the same commits.')

q('GB_GBR_002', 'GB_FAM01_BRANCH_PURPOSE', 'D1',
  'Is a branch a copy of the project folder?',
  'No; it is a second line of history over the same folder',
  ['Yes; each branch gets a folder of its own',
   'Yes, though only the changed files are duplicated',
   'No; it is a copy of the most recent commit'],
  'There is one folder and one recorded history, so a branch is a second line of history over the '
  'same folder. Believing it duplicates the project is what makes branching feel expensive.')

q('GB_GBR_003', 'GB_FAM01_BRANCH_PURPOSE', 'D1',
  'Two features are being built at the same time. What does giving each one a branch achieve?',
  'Either can be finished and recorded without the other\'s half-done work coming with it',
  ['Each feature gets a separate backup',
   'Each feature gets its own shared copy',
   'The two features are combined automatically when they are done'],
  'The two sets of commits stay apart until somebody joins them, so either can be finished and '
  'recorded without the other\'s half-done work coming with it. Nothing is combined until a merge '
  'is asked for.')

q('GB_GBR_004', 'GB_FAM01_BRANCH_PURPOSE', 'D1',
  'Can work done on a branch be brought back into the main line later?',
  'Yes; merging is what joins the two histories',
  ['No; a branch is a permanent separation',
   'Only by copying the files across by hand',
   'Only if no further commits were made on the main line'],
  'Branches are made to be rejoined, and merging is what joins the two histories. Commits made on '
  'the main line in the meantime do not prevent it.')

q('GB_GBR_005', 'GB_FAM01_BRANCH_PURPOSE', 'D2',
  'Why is a branch preferred to simply keeping a second copy of the folder while an experiment is '
  'tried?',
  'The two histories can be recombined afterwards, which two folders cannot be',
  ['A branch takes up less room on the disk',
   'A branch is quicker to switch between',
   'A branch cannot produce a clash'],
  'Two folders leave somebody comparing files by hand at the end, whereas the two histories can be '
  'recombined afterwards, which two folders cannot be. Space and speed are side effects rather '
  'than the reason.')

# =========================================================================
# GB_FAM02_BRANCH_NATURE — D1 x3, D2 x1
# =========================================================================
q('GB_GBR_006', 'GB_FAM02_BRANCH_NATURE', 'D1',
  'What is created at the moment a new branch is made?',
  'A name that points at the commit you are currently on',
  ['A copy of every file in the project',
   'A new folder alongside the existing one',
   'A new shared copy of the project'],
  'Making a branch records a name that points at the commit you are currently on and nothing else. '
  'That is why it is instant however large the project is.')

q('GB_GBR_007', 'GB_FAM02_BRANCH_NATURE', 'D1',
  'Do the files in the working folder change at the moment a branch is created?',
  'No; nothing changes until commits are made or another branch is switched to',
  ['Yes; they are reset to the last recorded state',
   'Yes; a second set of them appears',
   'Yes; any unrecorded work is cleared away first'],
  'Creating a branch is a note about history rather than an operation on files, so nothing changes '
  'until commits are made or another branch is switched to. Unrecorded work is left exactly where '
  'it was.')

q('GB_GBR_008', 'GB_FAM02_BRANCH_NATURE', 'D1',
  'Does creating a branch require a shared copy of the project?',
  'No; branches are local until somebody sends them',
  ['Yes; branches exist on the shared copy',
   'Yes, unless the project has never been shared at all',
   'Only the first branch requires one'],
  'Branching is a local act like committing, so branches are local until somebody sends them. A '
  'project that has never been shared can have as many as it likes.')

q('GB_GBR_009', 'GB_FAM02_BRANCH_NATURE', 'D2',
  'A project of 500 files has six branches. How many copies of those files are sitting on the '
  'disk?',
  'One working folder, plus one recorded history that all six branches read from',
  ['Six, one for each branch',
   'Six, but only of the files that differ between branches',
   'Three thousand, one set per branch'],
  'Branches are names into a single recorded history, so there is one working folder, plus one '
  'recorded history that all six branches read from. The count of branches has almost no bearing '
  'on the size of the project.')

# =========================================================================
# GB_FAM03_MERGE_PURPOSE — D1 x3, D2 x1
# =========================================================================
q('GB_GBR_010', 'GB_FAM03_MERGE_PURPOSE', 'D1',
  'What does a merge produce?',
  'One branch that now holds the work of both',
  ['A third branch holding the work of both',
   'Two branches that are now identical',
   'One branch holding whichever work was newer'],
  'Merging joins one line into another, leaving one branch that now holds the work of both. No '
  'third branch is created and nothing is chosen on grounds of age.')

q('GB_GBR_011', 'GB_FAM03_MERGE_PURPOSE', 'D1',
  'A branch called feature is merged into a branch called main. Which of the two changes?',
  'main only',
  ['Both of them', 'feature only', 'Neither; a new branch receives the result'],
  'A merge has a direction, and the work travels into the branch being merged into, so main only '
  'changes. feature is left exactly as it was.')

q('GB_GBR_012', 'GB_FAM03_MERGE_PURPOSE', 'D1',
  'Does merging a branch remove that branch?',
  'No; it stays exactly where it was',
  ['Yes, as part of the merge',
   'Yes, once it has no commits left to contribute',
   'Yes, as soon as the merge is sent to the shared copy'],
  'A merge copies work into another line and leaves the source alone, so the branch stays exactly '
  'where it was. Deleting it afterwards is a separate decision somebody makes.')

q('GB_GBR_013', 'GB_FAM03_MERGE_PURPOSE', 'D2',
  'After feature has been merged into main, which branches hold the feature work?',
  'Both, since main received a copy and feature still has its own',
  ['main only, because the work moved there',
   'feature only, until main is sent',
   'A new branch created by the merge'],
  'Merging copies rather than moves, so both hold the work: main received a copy and feature still '
  'has its own. What feature does not have is anything main gained from elsewhere.')

# =========================================================================
# GB_FAM04_COMMIT_PLACEMENT — D2, D3
# =========================================================================
q('GB_GBR_014', 'GB_FAM04_COMMIT_PLACEMENT', 'D2',
  'You switch to a branch called feature and make two commits. Which branch holds them?',
  'feature',
  ['main, because that is the project\'s real line',
   'Both, since they are commits to the same project',
   'Neither, until they are merged somewhere'],
  'Commits land on whichever branch is current at the time, so feature holds them. They reach '
  'anywhere else only through a merge.')

q('GB_GBR_015', 'GB_FAM04_COMMIT_PLACEMENT', 'D3',
  'The sequence was: on main, commit A; switch to feature, commit B; switch back to main, commit '
  'C. Which commits does main hold?',
  'A and C',
  ['A, B and C', 'A only', 'B and C'],
  'B was made while feature was current and the other two while main was, so main holds A and C. '
  'Switching away and back does not carry work with it.')

# =========================================================================
# GB_FAM05_SWITCH_EFFECT — D2, D3
# =========================================================================
q('GB_GBR_016', 'GB_FAM05_SWITCH_EFFECT', 'D2',
  'A file was added and committed on feature. You switch to main, where that file was never '
  'created. What is in the folder?',
  'The file is not there, because the folder now shows what main holds',
  ['The file is still there, since it exists on the disk',
   'The file is there but empty',
   'The switch is refused while that file exists'],
  'Switching rewrites the working folder to match the branch being switched to, so the file is not '
  'there, because the folder now shows what main holds. The folder always reflects one branch at a '
  'time.')

q('GB_GBR_017', 'GB_FAM05_SWITCH_EFFECT', 'D3',
  'That file has vanished from the folder after the switch. Has the work been lost?',
  'No; it is recorded on the other branch and reappears on switching back',
  ['Yes; switching discarded it',
   'Yes, unless it had been sent to the shared copy first',
   'No; it is still in the folder but hidden from view'],
  'Being absent from the folder and being lost are different things: it is recorded on the other '
  'branch and reappears on switching back. Only unrecorded work is ever at risk here.')

# =========================================================================
# GB_FAM06_BRANCH_ISOLATION — D2, D3, D4
# =========================================================================
q('GB_GBR_018', 'GB_FAM06_BRANCH_ISOLATION', 'D2',
  'Three commits are made on feature. What does main hold afterwards?',
  'Exactly what it held before',
  ['The three commits as well',
   'The newest of the three commits',
   'Nothing, until it is brought up to date'],
  'Work on one branch has no effect on another, so main holds exactly what it held before. It is '
  'older than feature rather than out of date in any broken sense.')

q('GB_GBR_019', 'GB_FAM06_BRANCH_ISOLATION', 'D3',
  'Both branches contain a file called config.txt. The copy on feature is edited and committed. '
  'What does the copy on main contain?',
  'Its own version, unchanged',
  ['The edited version, since the two files share a name',
   'An empty file, until the branches are merged',
   'The edited version, marked as coming from another branch'],
  'A shared name does not make a shared file across two lines of history, so the copy on main '
  'holds its own version, unchanged. The two versions meet only in a merge.')

q('GB_GBR_020', 'GB_FAM06_BRANCH_ISOLATION', 'D4',
  'A teammate says main is out of date, because feature has newer commits on it. Is anything wrong '
  'with main?',
  'No; main is a different line, and being newer does not make feature authoritative',
  ['Yes; the newest commits anywhere are the real state of the project',
   'Yes; main has to be brought up to date before it can be used',
   'No; main will catch up by itself once feature is sent'],
  'Newer and correct are different claims, so nothing is wrong: main is a different line, and '
  'being newer does not make feature authoritative. main is precisely the version that was last '
  'agreed to work.',
  evidence='because feature has newer commits on it')

# =========================================================================
# GB_FAM07_MERGE_RESULT — D2, D3, D4
# =========================================================================
q('GB_GBR_021', 'GB_FAM07_MERGE_RESULT', 'D2',
  'feature changed a.txt and main changed b.txt. feature is merged into main. What does main hold '
  'now?',
  'Both changes',
  ['The change to a.txt only',
   'The change to b.txt only',
   'Neither, until somebody settles which is right'],
  'The two branches touched different files, so main now holds both changes. There is nothing for '
  'anybody to choose between.')

q('GB_GBR_022', 'GB_FAM07_MERGE_RESULT', 'D3',
  'Immediately after that merge, what does feature hold?',
  'Its own change only; the merge did not alter it',
  ['Both changes, since the two branches are now joined',
   'Nothing; its work moved into main',
   'Both changes, once the merge has been sent'],
  'The merge wrote into main and left the source alone, so feature holds its own change only; the '
  'merge did not alter it. Giving feature main\'s work takes a merge in the other direction.')

q('GB_GBR_023', 'GB_FAM07_MERGE_RESULT', 'D4',
  'A developer working on feature expects to see their teammate\'s b.txt change and cannot find '
  'it. Both changes are present on main. What has happened?',
  'The merge updated main only, and feature has never been given main\'s work',
  ['The merge stopped part way through',
   'The b.txt change was discarded during the merge',
   'feature has to be sent before it receives anything'],
  'Both changes are on main, which shows the merge worked: the merge updated main only, and '
  'feature has never been given main\'s work. Merging main into feature is what would bring it '
  'across.',
  evidence='Both changes are present on main')

# =========================================================================
# GB_FAM08_DIVERGENCE_READING — D2, D3, D4
# =========================================================================
q('GB_GBR_024', 'GB_FAM08_DIVERGENCE_READING', 'D2',
  'main runs c1, then c2, then c3. feature was started from c2 and has c4 and c5 on it. Which '
  'commits are on both branches?',
  'c1 and c2',
  ['c1, c2 and c3', 'All five of them', 'None of them'],
  'feature was started at c2 and everything up to that point came with it, so c1 and c2 are on '
  'both branches. c3 was added to main afterwards.')

q('GB_GBR_025', 'GB_FAM08_DIVERGENCE_READING', 'D3',
  'From that same pair of branches, which commits exist only on feature?',
  'c4 and c5',
  ['c3, c4 and c5', 'c5 only', 'None; every commit is shared'],
  'Only the commits made after the branch was started belong to it alone, so c4 and c5 exist only '
  'on feature. c3 belongs only to main, which is a different question.')

q('GB_GBR_026', 'GB_FAM08_DIVERGENCE_READING', 'D4',
  'A developer says the two branches went their separate ways at c3, because c3 is the newest '
  'commit on main. Where did they actually separate?',
  'At c2, the last commit the two branches have in common',
  ['At c3, as the developer said',
   'At c4, the first commit made on feature',
   'At c1, where the project began'],
  'The separation is where the shared history stops, which is at c2, the last commit the two '
  'branches have in common. c3 was made on main after the branches had already parted.',
  evidence='because c3 is the newest commit on main')

# =========================================================================
# GB_FAM09_CONFLICT_CAUSE — D2, D3, D4
# =========================================================================
q('GB_GBR_027', 'GB_FAM09_CONFLICT_CAUSE', 'D2',
  'One branch changed a.txt and the other changed b.txt. Does merging them clash?',
  'No; changes to different files cannot compete',
  ['Yes; any two sets of changes have to be reconciled',
   'Yes, if the two files sit in the same folder',
   'Only if the files are large'],
  'A clash needs two candidate versions of the same text, so no; changes to different files cannot '
  'compete. The merge completes without anybody being asked anything.')

q('GB_GBR_028', 'GB_FAM09_CONFLICT_CAUSE', 'D3',
  'Both branches changed the same file: one edited the first line and the other edited the last '
  'line of a long file. Does merging clash?',
  'No; the two edits are in different places in the file',
  ['Yes; both branches touched the same file',
   'Yes; a file can only be changed on one branch at a time',
   'Only if the two commits were made on the same day'],
  'Changes are compared region by region rather than file by file, so no; the two edits are in '
  'different places in the file. Both edits end up in the merged version.')

q('GB_GBR_029', 'GB_FAM09_CONFLICT_CAUSE', 'D4',
  'Both branches changed the very same line of the very same file, and both changed it to the same '
  'text. Does merging clash?',
  'No; there is nothing to choose between when the two results agree',
  ['Yes; the same line was written on both branches',
   'Yes; identical edits on one line are the hardest case',
   'Only if the two commit messages differ'],
  'A clash is a question that needs an answer, and the two branches already agree, so no; there is '
  'nothing to choose between when the two results agree. What produces a clash is two different '
  'texts competing for one place.',
  evidence='and both changed it to the same text')

# =========================================================================
# GB_FAM10_CONFLICT_RESOLUTION — D2, D3, D4
# =========================================================================
q('GB_GBR_030', 'GB_FAM10_CONFLICT_RESOLUTION', 'D2',
  'A merge has left a file holding a marked block: an opening marker, a line reading greeting = '
  '"Hello", a dividing marker, a line reading greeting = "Hi", and a closing marker. What must the '
  'resolved file contain?',
  'One chosen greeting line, with all three marker lines taken out',
  ['Both greeting lines, with the markers kept as a record of what happened',
   'Both greeting lines, with the markers taken out',
   'Neither greeting line, with the markers taken out'],
  'Resolving means deciding what the file should say, so it must end with one chosen greeting '
  'line, with all three marker lines taken out. Keeping both would leave the variable set twice.')

q('GB_GBR_031', 'GB_FAM10_CONFLICT_RESOLUTION', 'D3',
  'A marked block appears in a list of allowed countries: one branch added India to the list and '
  'the other added Kenya, at the same position. Both additions are wanted. What should the '
  'resolved list contain?',
  'India and Kenya, one after the other, with the markers taken out',
  ['India only, with the markers taken out',
   'Kenya only, since it was added on the branch being merged in',
   'India and Kenya, with the markers left in to show the history'],
  'Marked blocks are not always a choice between alternatives, and here the list should hold India '
  'and Kenya, one after the other, with the markers taken out. Picking a side would silently drop '
  'a wanted entry.')

q('GB_GBR_032', 'GB_FAM10_CONFLICT_RESOLUTION', 'D4',
  'A file was committed while it still contained the marker lines, and the project now refuses to '
  'run. What happened?',
  'The clash was recorded rather than settled, so the markers are now part of the file',
  ['The merge broke the file as it was being written',
   'The file was resolved while the wrong branch was current',
   'The markers are harmless, so the failure has another cause'],
  'The markers are ordinary text as far as everything else is concerned, so the clash was recorded '
  'rather than settled, and the markers are now part of the file. Whatever reads the file meets '
  'lines it cannot make sense of.',
  evidence='while it still contained the marker lines, and the project now refuses to run')

# =========================================================================
# GB_FAM11_HISTORY_SHAPE — D3, D4
# =========================================================================
q('GB_GBR_033', 'GB_FAM11_HISTORY_SHAPE', 'D3',
  'A history splits into two lines after c2 and the two lines come back together at c6. How many '
  'lines of work does c6 draw on?',
  'Two',
  ['One', 'Three', 'It cannot be told from the shape'],
  'A point where two lines rejoin draws on both of them, so c6 draws on two. The split at c2 and '
  'the join at c6 are the two ends of the same pair of lines.')

q('GB_GBR_034', 'GB_FAM11_HISTORY_SHAPE', 'D4',
  'Somebody reads that shape as a single top-to-bottom sequence and concludes that c4 must have '
  'been written after c5. What have they missed?',
  'The two lines ran alongside each other, so their commits are not in one single order',
  ['The listing is printed with the oldest entry first',
   'c4 and c5 were both made on the same branch',
   'The point where the lines rejoined is where they had separated'],
  'A merged history is not a queue, so the two lines ran alongside each other, and their commits '
  'are not in one single order. c4 and c5 may have been written on the same afternoon by two '
  'people.',
  evidence='reads that shape as a single top-to-bottom sequence')

# =========================================================================
# GB_FAM12_WRONG_BRANCH_DIAGNOSIS — D3, D4
# =========================================================================
q('GB_GBR_035', 'GB_FAM12_WRONG_BRANCH_DIAGNOSIS', 'D3',
  'Yesterday\'s work does not appear on main. It does appear on feature, where the commits were '
  'made. What happened?',
  'The work was committed onto the branch that was current at the time, which was not main',
  ['The work was lost when the branch was switched',
   'main was reset to an earlier state',
   'The work was never committed at all'],
  'The commits exist and they exist somewhere specific, so the work was committed onto the branch '
  'that was current at the time, which was not main. Merging is what puts it where it was wanted.')

q('GB_GBR_036', 'GB_FAM12_WRONG_BRANCH_DIAGNOSIS', 'D4',
  'A file you wrote is not in the folder, the history of the current branch never mentions it, and '
  'a colleague can see it listed on another branch. What is the situation?',
  'The work exists on that other branch, and this branch has simply never had it',
  ['The work was deleted and will have to be written again',
   'The shared copy has not been brought down recently enough',
   'The file was added to the ignore list by mistake'],
  'A colleague seeing it on a branch settles that it was recorded, so the work exists on that '
  'other branch, and this branch has simply never had it. Nothing has been deleted and nothing '
  'needs fetching.',
  evidence='a colleague can see it listed on another branch')

# =========================================================================
# GB_FAM13_UNMERGED_DIAGNOSIS — D3, D4, D5 x3
# =========================================================================
q('GB_GBR_037', 'GB_FAM13_UNMERGED_DIAGNOSIS', 'D3',
  'The export feature is finished and committed on a branch of its own, and it does not appear on '
  'main. What was not done?',
  'The export branch was never merged into main',
  ['The export work was never committed',
   'main was never sent to the shared copy',
   'The export branch was deleted before it could be used'],
  'The work is recorded and it is recorded elsewhere, so the export branch was never merged into '
  'main. Everything up to the merge was done.')

q('GB_GBR_038', 'GB_FAM13_UNMERGED_DIAGNOSIS', 'D4',
  'main has been sent to the shared copy and the export feature still does not appear there. The '
  'export branch is itself committed and sent. What is missing?',
  'The merge; sending a branch does not put its work into another branch',
  ['The export commits, which were never made',
   'A second send of the export branch',
   'A fetch by whoever is looking at the shared copy'],
  'Both branches reached the shared copy and neither contains the other\'s work, so what is '
  'missing is the merge; sending a branch does not put its work into another branch. Sending and '
  'merging solve different problems.',
  evidence='The export branch is itself committed and sent')

q('GB_GBR_039', 'GB_FAM13_UNMERGED_DIAGNOSIS', 'D5',
  'Three branches were finished and only two of the three appear in main. Which check identifies '
  'the one that was left out?',
  'Ask which branches have already been merged into main, rather than which branches have commits',
  ['Look at the newest commit message on main',
   'Check that each of the three branches was sent to the shared copy',
   'Compare how many commits each branch contains'],
  'Every branch has commits, so the presence of commits separates nothing: ask which branches have '
  'already been merged into main, rather than which branches have commits. Sending is irrelevant '
  'to whether main contains the work.',
  mode='TRANSFER', hinge='only two of the three appear in main')

q('GB_GBR_040', 'GB_FAM13_UNMERGED_DIAGNOSIS', 'D5',
  'To be safe, somebody merges all three branches into main again. Two of them had already been '
  'merged. What happens to those two?',
  'Nothing changes, because a merge that brings nothing new is not an error',
  ['Their work is duplicated in the files',
   'The merge is refused because they were merged once already',
   'Their earlier merges are undone and redone'],
  'A merge brings across whatever the target does not already have, and here that is nothing, so '
  'nothing changes: a merge that brings nothing new is not an error. It is a safe thing to do and '
  'a poor way to find out what was missing.',
  mode='TRANSFER', hinge='merges all three branches into main again')

q('GB_GBR_041', 'GB_FAM13_UNMERGED_DIAGNOSIS', 'D5',
  'A feature appears on the shared copy\'s main and not on your main. Both are called main. What '
  'is the explanation?',
  'Your copy has not been given the newer commits that the shared copy holds',
  ['The feature was never merged into main at all',
   'The feature was merged into the wrong branch',
   'Two unrelated branches happen to share one name'],
  'The merge clearly happened, because the shared copy shows it, so your copy has not been given '
  'the newer commits that the shared copy holds. A branch name refers to a local line and a shared '
  'line that can be at different points.',
  mode='EDGE', hinge='A feature appears on the shared copy')

# =========================================================================
# GB_FAM14_MERGE_ORDER_TRANSFER — D4, D5 x4
# =========================================================================
q('GB_GBR_042', 'GB_FAM14_MERGE_ORDER_TRANSFER', 'D4',
  'Branches A and B both change the same line of one file, and both have to reach main. Every '
  'order listed below can be carried out. Which settles that line the fewest times?',
  'Merge A into main, then merge B into main',
  ['Merge A into B, then B into main, then A into main as well',
   'Merge B into A and A into B, then merge both into main',
   'Merge A into main, then A into B, then B into main'],
  'The competing line has to be settled wherever the two meet, so merging A into main, then B into '
  'main brings them together exactly once. Every other order brings them together in a second '
  'place and asks the same question again.',
  evidence='Every order listed below can be carried out')

q('GB_GBR_043', 'GB_FAM14_MERGE_ORDER_TRANSFER', 'D5',
  'A long-running branch can take main\'s newer work regularly, or wait and take it all at the '
  'end. What does waiting cost?',
  'One large settlement at the end, over changes nobody remembers, instead of several small ones',
  ['Nothing; the same work is done either way',
   'The branch becomes impossible to merge at all',
   'The commits made on the branch are lost'],
  'The total difference is the same and the shape of the work is not, so waiting buys one large '
  'settlement at the end, over changes nobody remembers, instead of several small ones. Deciding '
  'between two edits is far easier the week they were written.',
  mode='TRADEOFF', hinge='or wait and take it all at the end')

q('GB_GBR_044', 'GB_FAM14_MERGE_ORDER_TRANSFER', 'D5',
  'During a series of merges, the very same competing line had to be settled twice. What does that '
  'tell you?',
  'The merges were ordered so that the unsettled change was carried into two different places',
  ['The first settlement was decided wrongly',
   'The tool failed to record the first settlement',
   'Two people settled it differently at the same moment'],
  'A settled line stays settled where it was settled, so the merges were ordered so that the '
  'unsettled change was carried into two different places. The repetition is a property of the '
  'route, not of the decision.',
  mode='TRANSFER', hinge='the very same competing line had to be settled twice')

q('GB_GBR_045', 'GB_FAM14_MERGE_ORDER_TRANSFER', 'D5',
  'Why does merging each branch into main one at a time keep the settling in one place?',
  'Every competing change meets the others where the work will finally live, and nowhere else',
  ['It is quicker than any other route',
   'It removes the possibility of a clash',
   'It allows the branches to be deleted sooner'],
  'Nothing is combined in an intermediate branch, so every competing change meets the others where '
  'the work will finally live, and nowhere else. Clashes still occur; each is simply decided once.',
  mode='TRANSFER', hinge='merging each branch into main one at a time')

q('GB_GBR_046', 'GB_FAM14_MERGE_ORDER_TRANSFER', 'D5',
  'Some teams merge main into every feature branch daily, which keeps each settlement small. What '
  'does that habit cost?',
  'Each branch fills up with merges that have nothing to do with the work it was made for',
  ['Nothing; it is free and always worth doing',
   'The branches can no longer be merged back into main',
   'The settlements grow larger rather than smaller'],
  'The benefit is real and so is the price: each branch fills up with merges that have nothing to '
  'do with the work it was made for. Reading such a branch later means separating its own commits '
  'from everybody else\'s.',
  mode='TRADEOFF', hinge='merge main into every feature branch daily')

# =========================================================================
# GB_FAM15_BRANCH_STRATEGY — D4, D5 x3
# =========================================================================
q('GB_GBR_047', 'GB_FAM15_BRANCH_STRATEGY', 'D4',
  'A single piece of work will take about two weeks and touches four files. Which branching '
  'approach fits it?',
  'One branch for that piece of work, merged when it is finished',
  ['One branch for each of the four files',
   'One branch for the developer, used for this and everything after it',
   'No branch at all; commit the work straight onto main'],
  'The unit that gets merged should be the unit that is useful, which here is one branch for that '
  'piece of work, merged when it is finished. Four file branches would have to be merged together '
  'before any of them meant anything.',
  evidence='will take about two weeks and touches four files')

q('GB_GBR_048', 'GB_FAM15_BRANCH_STRATEGY', 'D5',
  'Some teams give each person one branch and keep it forever. That does work. What does it cost?',
  'Two unrelated pieces of work share one branch, so neither can be merged until both are done',
  ['Nothing; it is simply easier to remember',
   'Each person then needs a shared copy of their own',
   'Clashes between people become impossible'],
  'The branch stops matching any unit of work, so two unrelated pieces of work share one branch, '
  'and neither can be merged until both are done. A finished feature waits behind an unfinished '
  'one for no reason.',
  mode='TRADEOFF', hinge='give each person one branch and keep it forever')

q('GB_GBR_049', 'GB_FAM15_BRANCH_STRATEGY', 'D5',
  'Giving every file its own branch does make competing edits rare. What does it cost?',
  'A change that spans three files becomes three branches that only work once all three are merged',
  ['Nothing; smaller branches are better in every way',
   'Files can no longer be renamed or moved',
   'The recorded history becomes shorter than it should be'],
  'Rarity of clashes is bought at the price of coherence: a change that spans three files becomes '
  'three branches that only work once all three are merged. Any one of them merged alone leaves '
  'main broken.',
  mode='TRADEOFF', hinge='Giving every file its own branch')

q('GB_GBR_050', 'GB_FAM15_BRANCH_STRATEGY', 'D5',
  'What should decide how much work belongs on one branch?',
  'The smallest amount that can be merged and still be worth having on its own',
  ['The number of files the work touches',
   'The number of people who will work on it',
   'The number of days it is expected to take'],
  'A branch exists to be merged, so the measure is the smallest amount that can be merged and '
  'still be worth having on its own. Counting files, people or days describes the work rather than '
  'what makes it safe to combine.',
  mode='TRANSFER', hinge='how much work belongs on one branch')
