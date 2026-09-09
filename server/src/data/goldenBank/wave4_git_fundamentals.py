# -*- coding: utf-8 -*-
"""
Wave 4 — GIT_FUNDAMENTALS, 50 Golden Bank questions, all newly authored.

THE MISSING-CHANGE FAMILIES ARE THE POINT OF THE SKILL. "My change is gone" has exactly three
causes — never staged, never committed, never sent — and a student who cannot separate them repeats
the whole sequence and learns nothing. The diagnostic items are written so that the stem rules out
all but one, and the D5 items ask what a blind repeat actually established, which is nothing.

WORK THAT WAS NEVER RECORDED IS NOT PROTECTED BY ANYTHING. Being "under version control" is the
belief that loses the laptop.

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
# GF_FAM01_VERSION_CONTROL_PURPOSE — D1 x4, D2 x1
# =========================================================================
q('GB_GF_001', 'GF_FAM01_VERSION_CONTROL_PURPOSE', 'D1',
  'What does version control give a project that keeping dated copies of the folder does not?',
  'A recorded history that can be returned to, with a note of what each change was',
  ['A safe copy of the current files',
   'A way of sending files to other people',
   'Somewhere to keep files that are too large for a disk'],
  'Dated copies preserve states without saying anything about them, whereas version control keeps '
  'a recorded history that can be returned to, with a note of what each change was. Being able to '
  'ask which change did what is the part copying cannot provide.')

q('GB_GF_002', 'GF_FAM01_VERSION_CONTROL_PURPOSE', 'D1',
  'Does a project under version control save the work automatically as it is typed?',
  'No; work enters the history only when it is deliberately recorded',
  ['Yes; every change is captured as it is made',
   'Yes; a snapshot is taken every few minutes',
   'Yes; each time the editor saves the file'],
  'Recording is an act somebody performs, so work enters the history only when it is deliberately '
  'recorded. Believing otherwise is exactly why unrecorded work gets lost.')

q('GB_GF_003', 'GF_FAM01_VERSION_CONTROL_PURPOSE', 'D1',
  'A file is deleted by accident, a week after the change to it was recorded. What can version '
  'control do?',
  'Bring the file back as it was in the recorded history',
  ['Nothing; it records changes rather than files',
   'Bring it back only if the folder was copied beforehand',
   'Bring back only the most recent version of the whole project'],
  'Anything that was recorded remains available, so version control can bring the file back as it '
  'was in the recorded history. No separate copy of the folder is needed for that.')

q('GB_GF_004', 'GF_FAM01_VERSION_CONTROL_PURPOSE', 'D1',
  'Why does each recorded change carry a written message?',
  'So the history says why a change was made, and not only what altered',
  ['So the changed file can be found again by name',
   'Because the tool refuses to store anything without text',
   'To record who was sitting at the machine'],
  'The message is the part a person reads months later, so the history says why a change was made, '
  'and not only what altered. The difference between the two states is already recorded without it.')

q('GB_GF_005', 'GF_FAM01_VERSION_CONTROL_PURPOSE', 'D2',
  'A student copies their project folder every evening and keeps the copies. What does that '
  'practice still not give them?',
  'The ability to see which individual change caused something and to return to just that point',
  ['A second copy of the files',
   'Protection against the disk failing',
   'The ability to work without a network'],
  'Nightly copies give states of a whole day and nothing finer, so they lack the ability to see '
  'which individual change caused something and to return to just that point. A day\'s work '
  'arrives as one undivided lump.')

# =========================================================================
# GF_FAM02_REPOSITORY_RECOGNITION — D1 x3, D2 x1
# =========================================================================
q('GB_GF_006', 'GF_FAM02_REPOSITORY_RECOGNITION', 'D1',
  'Besides the files as they stand now, what does a repository hold?',
  'The recorded history of the project',
  ['Only the files as they stand now',
   'A link to the website the project came from',
   'The settings of the editor being used'],
  'A repository is the project plus the recorded history of the project, which is what makes '
  'earlier states reachable. Without the history it would be an ordinary folder.')

q('GB_GF_007', 'GF_FAM02_REPOSITORY_RECOGNITION', 'D1',
  'Does starting a repository require an account on a website?',
  'No; it exists on the machine where it was created',
  ['Yes; a repository lives on a website by definition',
   'Yes, unless the project is never shared with anybody',
   'Only once the first change has been recorded'],
  'Creating a repository is a local act, so it exists on the machine where it was created. Sharing '
  'it later is a separate decision that adds a second copy.')

q('GB_GF_008', 'GF_FAM02_REPOSITORY_RECOGNITION', 'D1',
  'For a repository on your own machine, where is the recorded history kept?',
  'Inside the project folder itself',
  ['On the website the project is shared through',
   'In the editor that opened the project',
   'In a backup folder elsewhere on the disk'],
  'The history travels with the project, because it is kept inside the project folder itself. '
  'Copying the folder copies the history along with it.')

q('GB_GF_009', 'GF_FAM02_REPOSITORY_RECOGNITION', 'D2',
  'A project has been under version control on one laptop for six months and has never been '
  'shared with anybody. Is its history real?',
  'Yes; a complete history exists locally with no shared copy involved',
  ['No; a history only begins once the project is shared',
   'Only the most recent recorded change is kept',
   'Yes, but it is discarded when the machine is restarted'],
  'Nothing about a history depends on anybody else seeing it, so yes; a complete history exists '
  'locally with no shared copy involved. What such a project lacks is a second copy, not a '
  'history.')

# =========================================================================
# GF_FAM03_COMMAND_PURPOSE — D1 x3, D2 x1
# =========================================================================
q('GB_GF_010', 'GF_FAM03_COMMAND_PURPOSE', 'D1',
  'What does git add do?',
  'Marks a change to be included in the next recorded commit',
  ['Records the change into the history',
   'Sends the change to the shared copy',
   'Creates a new file in the project'],
  'It moves a change one step along, no further: it marks a change to be included in the next '
  'recorded commit. Nothing is written into the history until a commit is made.')

q('GB_GF_011', 'GF_FAM03_COMMAND_PURPOSE', 'D1',
  'What does git commit do?',
  'Records the marked changes into the local history',
  ['Marks changes so that they can be recorded later',
   'Sends the recorded changes to the shared copy',
   'Brings other people\'s changes down from the shared copy'],
  'A commit records the marked changes into the local history and stops there. Reaching the shared '
  'copy takes a further command.')

q('GB_GF_012', 'GF_FAM03_COMMAND_PURPOSE', 'D1',
  'What does git log do?',
  'Shows the recorded history without changing anything',
  ['Records a new change into the history',
   'Sends the history to the shared copy',
   'Removes the oldest entries from the history'],
  'It is a reading command, so it shows the recorded history without changing anything. Nothing it '
  'prints alters the project or the history.')

q('GB_GF_013', 'GF_FAM03_COMMAND_PURPOSE', 'D2',
  'A change has just been committed. Is it now on the shared copy?',
  'No; committing records it locally, and sending it is a separate step',
  ['Yes; committing publishes the change',
   'Yes, once the editor is closed',
   'Only if the file was marked before being committed'],
  'The two acts are deliberately separate, so no; committing records it locally, and sending it is '
  'a separate step. Believing the commit published it is what leaves a teammate looking at old '
  'code.')

# =========================================================================
# GF_FAM04_STAGING_VS_COMMITTED — D2, D3
# =========================================================================
q('GB_GF_014', 'GF_FAM04_STAGING_VS_COMMITTED', 'D2',
  'A file has been edited and marked for the next commit, and no commit has been made. Is the '
  'change in the history?',
  'No; marking it only says it should go into the next commit',
  ['Yes; marking it records it',
   'Partly; the first half of the change is recorded',
   'Yes, as soon as the editor saves the file'],
  'Marking and recording are different steps, so no; marking it only says it should go into the '
  'next commit. Until the commit runs, the history is unchanged.')

q('GB_GF_015', 'GF_FAM04_STAGING_VS_COMMITTED', 'D3',
  'A file is edited, marked for the next commit, edited a second time, and then committed with no '
  'further marking. Which version was recorded?',
  'The version as it stood when it was marked',
  ['The version as it stood at the moment of the commit',
   'Both versions, as two entries',
   'Nothing, because the file changed after being marked'],
  'Marking captures the content at that moment, so the version as it stood when it was marked is '
  'what the commit recorded. The second edit is still sitting in the folder, unrecorded.')

# =========================================================================
# GF_FAM05_COMMIT_CONTENTS — D2, D3
# =========================================================================
q('GB_GF_016', 'GF_FAM05_COMMIT_CONTENTS', 'D2',
  'Three files have been changed and only one of them has been marked. A commit is made. Which '
  'changes does it record?',
  'The change to the marked file only',
  ['The changes to all three files',
   'The change to whichever file was edited most recently',
   'None, because all three have to be marked first'],
  'A commit records what was marked and nothing else, so it holds the change to the marked file '
  'only. The other two changes remain in the folder, unrecorded.')

q('GB_GF_017', 'GF_FAM05_COMMIT_CONTENTS', 'D3',
  'Two files were marked. One of the two was then edited again before the commit was made. How '
  'much does the commit hold, and in what form?',
  'Both files, with the re-edited one as it stood when it was marked',
  ['Both files, each as it stands now',
   'Only the file that was not edited again',
   'Only the file that was edited again'],
  'Marking fixes what will be recorded for each file separately, so the commit holds both files, '
  'with the re-edited one as it stood when it was marked. The later edit needs marking of its own '
  'before it can be recorded.')

# =========================================================================
# GF_FAM06_STATE_AFTER_COMMANDS — D2, D3, D4
# =========================================================================
q('GB_GF_018', 'GF_FAM06_STATE_AFTER_COMMANDS', 'D2',
  'A brand new file notes.md is created in the project folder and nothing else is done. What does '
  'a status check report about it?',
  'That it is a new file the project is not yet tracking',
  ['That it is marked to go into the next commit',
   'That it has been recorded into the history',
   'Nothing, because new files are picked up automatically'],
  'Creating a file is not a step in the recording sequence, so the status reports that it is a new '
  'file the project is not yet tracking. It has to be marked before it can be recorded.')

q('GB_GF_019', 'GF_FAM06_STATE_AFTER_COMMANDS', 'D3',
  'The commands run were: edit a.txt, git add a.txt, git commit, then edit a.txt again. What state '
  'is a.txt in?',
  'Recorded once, and changed again since that recording',
  ['Recorded, with nothing outstanding',
   'Marked to go into the next commit',
   'Not part of the project any more'],
  'The commit captured the first edit and the second came afterwards, so a.txt is recorded once, '
  'and changed again since that recording. The second edit is unmarked and unrecorded.')

q('GB_GF_020', 'GF_FAM06_STATE_AFTER_COMMANDS', 'D4',
  'Both a.txt and b.txt were edited, then only a.txt was marked before the commit ran. What is '
  'true of b.txt afterwards?',
  'It is still in the folder with its change intact, and it is not in the history',
  ['It was recorded alongside a.txt',
   'It was removed from the folder by the commit',
   'Its change was discarded when the commit ran'],
  'Committing takes what was marked and leaves everything else exactly as it was, so b.txt is '
  'still in the folder with its change intact, and it is not in the history. A commit never '
  'removes or discards unmarked work.',
  evidence='then only a.txt was marked before the commit ran')

# =========================================================================
# GF_FAM07_LOCAL_VS_REMOTE — D2, D3, D4
# =========================================================================
q('GB_GF_021', 'GF_FAM07_LOCAL_VS_REMOTE', 'D2',
  'You have just committed a change. Can a teammate see it yet?',
  'No; not until it has been sent to the shared copy',
  ['Yes; as soon as it is committed',
   'Yes, once they reload the page they are looking at',
   'Only if they happen to be online at that moment'],
  'The commit reached your own history and nothing else, so no; not until it has been sent to the '
  'shared copy. Their view of the project is built from what the shared copy holds.')

q('GB_GF_022', 'GF_FAM07_LOCAL_VS_REMOTE', 'D3',
  'You have made three commits today and sent none of them. What does the shared copy hold?',
  'The history as it stood before today\'s three commits',
  ['All three commits',
   'The newest of the three commits',
   'Nothing, since it is now out of step'],
  'Nothing has travelled, so the shared copy holds the history as it stood before today\'s three '
  'commits. It is not out of step in the sense of being broken; it is simply older.')

q('GB_GF_023', 'GF_FAM07_LOCAL_VS_REMOTE', 'D4',
  'A student reports that a month of work has disappeared after their laptop was wiped and '
  'rebuilt. They had committed everything carefully and had never sent anything. Where does the '
  'work exist now?',
  'Nowhere; the only copy was the local history on that laptop',
  ['On the shared copy, since everything was committed',
   'On the shared copy, but only the most recent commit',
   'Still on the laptop, recoverable through the editor'],
  'Committing carefully protected the work from mistakes inside the folder and from nothing else, '
  'so it exists nowhere; the only copy was the local history on that laptop. Sending is what puts '
  'a copy somewhere the machine cannot take with it.',
  evidence='They had committed everything carefully and had never sent anything')

# =========================================================================
# GF_FAM08_PUSH_PULL_EFFECT — D2, D3, D4
# =========================================================================
q('GB_GF_024', 'GF_FAM08_PUSH_PULL_EFFECT', 'D2',
  'You send your commits to the shared copy. Do your teammate\'s commits arrive on your machine at '
  'the same time?',
  'No; bringing changes down is a separate step',
  ['Yes; sending exchanges work in both directions',
   'Yes, as long as nothing conflicts',
   'Only their most recent commit arrives'],
  'Sending moves work one way only, so no; bringing changes down is a separate step. Nothing '
  'arrives until it is asked for.')

q('GB_GF_025', 'GF_FAM08_PUSH_PULL_EFFECT', 'D3',
  'You have two commits and also some edits you have not committed. You send. What reaches the '
  'shared copy?',
  'The two commits only; the uncommitted edits stay on your machine',
  ['Everything currently in the folder',
   'Nothing, until the edits are committed as well',
   'The uncommitted edits, which are the newest work'],
  'Only recorded work can travel, so the two commits only reach the shared copy; the uncommitted '
  'edits stay on your machine. They are not refused; they were never part of what was sent.')

q('GB_GF_026', 'GF_FAM08_PUSH_PULL_EFFECT', 'D4',
  'You bring your teammate\'s changes down while holding your own uncommitted edits to a different '
  'file that nobody else touched. What happens to your edits?',
  'They are left exactly as they are',
  ['They are overwritten by the incoming version of the project',
   'They are committed automatically as part of the operation',
   'They are discarded so that the incoming work can be applied'],
  'Incoming work only touches what it actually changes, and nobody else changed that file, so your '
  'edits are left exactly as they are. Uncommitted edits to a file the incoming work does change '
  'are the case that is refused instead.',
  evidence='uncommitted edits to a different file that nobody else touched')

# =========================================================================
# GF_FAM09_HISTORY_READING — D2, D3, D4
# =========================================================================
q('GB_GF_027', 'GF_FAM09_HISTORY_READING', 'D2',
  'A history is listed newest first: Fix totals rounding; Add export button; Add report page; '
  'Start the project. Which change was made first?',
  'Start the project',
  ['Fix totals rounding', 'Add export button', 'Add report page'],
  'The listing runs newest first, so the earliest change is the one at the bottom, Start the '
  'project. Reading the list top-down as a sequence of events reverses the chronology.')

q('GB_GF_028', 'GF_FAM09_HISTORY_READING', 'D3',
  'From that same listing, which entry introduced the export button?',
  'Add export button',
  ['Fix totals rounding, since it is the newest entry',
   'Start the project, since the project contains it now',
   'Add report page, since the button is on that page'],
  'Each entry records the change its message describes, so the button arrived with Add export '
  'button. The newest entry describes only the change it made.')

q('GB_GF_029', 'GF_FAM09_HISTORY_READING', 'D4',
  'A newcomer reads only the newest message in that listing and concludes that the project is a '
  'rounding fix. What have they misread?',
  'A message describes one change, while the project is the result of all the changes together',
  ['The listing is ordered oldest first, so they read the wrong end',
   'The newest entry replaces the ones before it',
   'The messages describe intentions rather than changes that were made'],
  'The order was read correctly and the meaning was not: a message describes one change, while the '
  'project is the result of all the changes together. Reading the whole list is what describes the '
  'project.',
  evidence='reads only the newest message in that listing')

# =========================================================================
# GF_FAM10_IGNORE_BEHAVIOUR — D2, D3, D4
# =========================================================================
q('GB_GF_030', 'GF_FAM10_IGNORE_BEHAVIOUR', 'D2',
  'A file is added to the ignore list before it has ever been recorded. What happens to that file?',
  'It stays in the folder and is never offered for recording',
  ['It is deleted from the folder',
   'It is hidden so the editor cannot open it',
   'It is recorded once and then left alone'],
  'Ignoring changes what the tool pays attention to and not what exists, so the file stays in the '
  'folder and is never offered for recording. It is fully usable by everything else on the '
  'machine.')

q('GB_GF_031', 'GF_FAM10_IGNORE_BEHAVIOUR', 'D3',
  'An ignored file is edited heavily. What does a status check report about it?',
  'Nothing at all',
  ['That it has changed, marked as ignored',
   'That it is waiting to be recorded',
   'A warning that an ignored file was modified'],
  'An ignored file is outside what the tool reports on, so a status check says nothing at all '
  'about it. Silence here is the expected result rather than a sign of a problem.')

q('GB_GF_032', 'GF_FAM10_IGNORE_BEHAVIOUR', 'D4',
  'A configuration file was committed months ago. It has now been added to the ignore list, and it '
  'still keeps appearing as changed. Why?',
  'Ignoring applies to files that are not already recorded, and this one is',
  ['The entry in the ignore list is spelled wrongly',
   'The ignore list takes effect only after the next commit',
   'The file has to be edited once more before ignoring starts'],
  'The file is already part of the recorded project, and ignoring applies to files that are not '
  'already recorded, and this one is. It has to be removed from tracking before the ignore entry '
  'has any effect.',
  evidence='It has now been added to the ignore list, and it still keeps appearing as changed')

# =========================================================================
# GF_FAM11_UNCOMMITTED_RISK — D3, D4
# =========================================================================
q('GB_GF_033', 'GF_FAM11_UNCOMMITTED_RISK', 'D3',
  'A project folder is deleted. It held commits that had been sent, commits that had not been '
  'sent, and edits that were never committed. What survives?',
  'Only the commits that had been sent',
  ['Everything, because the project was under version control',
   'Every commit, whether it had been sent or not',
   'Nothing whatever'],
  'Only a copy that lives somewhere else survives the folder, so only the commits that had been '
  'sent do. Being under version control protects nothing that never left the folder.')

q('GB_GF_034', 'GF_FAM11_UNCOMMITTED_RISK', 'D4',
  'Work that had been marked for the next commit, but not committed, was lost with the folder. A '
  'student says marking it should have protected it. Why did it not?',
  'Marking only says what the next commit will contain, and stores nothing outside that folder',
  ['Marking protects text files but not other kinds',
   'The marking is cleared whenever the machine shuts down',
   'The deletion removed the marking before it could take effect'],
  'Marking is a step towards recording rather than a place of safety: it only says what the next '
  'commit will contain, and stores nothing outside that folder. It is one step short of even a '
  'local copy.',
  evidence='A student says marking it should have protected it')

# =========================================================================
# GF_FAM12_COMMAND_SELECTION — D3, D4
# =========================================================================
q('GB_GF_035', 'GF_FAM12_COMMAND_SELECTION', 'D3',
  'The goal is to get the change currently in the folder into the local history, and to do nothing '
  'else. What achieves exactly that?',
  'Mark the change, then commit it',
  ['Mark the change',
   'Mark the change, commit it, then send it',
   'Send the project to the shared copy'],
  'Two steps are needed and only two, so the answer is to mark the change, then commit it. Sending '
  'as well would achieve the goal and more than the goal.')

q('GB_GF_036', 'GF_FAM12_COMMAND_SELECTION', 'D4',
  'Everything wanted is already committed locally. The goal is to let a teammate see that work, '
  'changing nothing else about the project. What achieves exactly that?',
  'Send the commits to the shared copy',
  ['Commit again with a clearer message',
   'Bring their changes down first, which carries yours up as part of the exchange',
   'Mark every file again and commit'],
  'The work is recorded and simply has not travelled, so send the commits to the shared copy. '
  'Bringing their changes down moves work in the other direction only and would also alter the '
  'local project.',
  evidence='The goal is to let a teammate see that work, changing nothing else about the project')

# =========================================================================
# GF_FAM13_MISSING_CHANGE_DIAGNOSIS — D3, D4, D5 x3
# =========================================================================
q('GB_GF_037', 'GF_FAM13_MISSING_CHANGE_DIAGNOSIS', 'D3',
  'A teammate cannot see your change. Your own history shows the commit, and the shared copy does '
  'not. Which step was missed?',
  'The commit was never sent',
  ['The change was never marked',
   'The change was never committed',
   'The teammate has not looked recently enough'],
  'The change reached your history and stopped there, so the commit was never sent. Both earlier '
  'steps clearly happened, because the commit exists.')

q('GB_GF_038', 'GF_FAM13_MISSING_CHANGE_DIAGNOSIS', 'D4',
  'Your history does not contain the change at all. The file in the folder contains it, and a '
  'status check lists the file as changed. Which step was missed?',
  'The change was never committed',
  ['The change was committed but never sent',
   'The file is on the ignore list',
   'The history listing is being filtered'],
  'The status check proves the tool can see the file and the history proves nothing was recorded, '
  'so the change was never committed. An ignored file would not be listed as changed at all.',
  evidence='a status check lists the file as changed')

q('GB_GF_039', 'GF_FAM13_MISSING_CHANGE_DIAGNOSIS', 'D5',
  'Three omissions produce the same complaint that a change is missing: it was never marked, never '
  'committed, or never sent. Which single check separates them fastest?',
  'Look at the local history: if the commit is absent it was never committed, and if it is present '
  'it was never sent',
  ['Send again and see whether the teammate can see it',
   'Ask the teammate to look again in a few minutes',
   'Redo the whole sequence from the beginning'],
  'The local history divides the three cases in one look: if the commit is absent it was never '
  'committed, and if it is present it was never sent. Marking is then separated from committing by '
  'the status check, which is the second question rather than the first.',
  mode='TRANSFER', hinge='it was never marked, never committed, or never sent')

q('GB_GF_040', 'GF_FAM13_MISSING_CHANGE_DIAGNOSIS', 'D5',
  'Somebody repeats the whole sequence — mark, commit, send — and the missing change appears. What '
  'has that established about the original cause?',
  'Nothing; every step was repeated, so it cannot say which one had been missed',
  ['That the change had never been marked',
   'That the send had failed the first time',
   'That the shared copy had been out of date'],
  'Repeating everything guarantees the outcome and destroys the evidence: nothing; every step was '
  'repeated, so it cannot say which one had been missed. The same person will meet the same '
  'problem next week with nothing learned.',
  mode='TRANSFER', hinge='repeats the whole sequence')

q('GB_GF_041', 'GF_FAM13_MISSING_CHANGE_DIAGNOSIS', 'D5',
  'The change is in your history and on the shared copy, and the teammate still cannot see it in '
  'their project. What is left to explain it?',
  'They have not brought the newer commits down into their own copy',
  ['The change was never committed after all',
   'The file is on the ignore list',
   'The send reported success but did nothing'],
  'Both copies you can inspect contain the change, so the remaining gap is on their side: they '
  'have not brought the newer commits down into their own copy. Their folder is as old as their '
  'last fetch.',
  mode='TRANSFER', hinge='on the shared copy, and the teammate still cannot see it')

# =========================================================================
# GF_FAM14_RECOVERY_REASONING — D4, D5 x4
# =========================================================================
q('GB_GF_042', 'GF_FAM14_RECOVERY_REASONING', 'D4',
  'A file was deleted and that deletion was committed. Three further commits have been made since, '
  'and all three are wanted. What restores the file without losing them?',
  'Take the file back from the commit before the deletion and record that as a new change',
  ['Undo the last four commits',
   'Delete the folder and fetch a fresh copy from the shared copy',
   'Nothing; the file is gone from the project'],
  'The wanted work sits after the mistake, so the repair has to move forwards rather than '
  'backwards: take the file back from the commit before the deletion and record that as a new '
  'change. Undoing four commits would take the three wanted ones with it.',
  evidence='Three further commits have been made since, and all three are wanted')

q('GB_GF_043', 'GF_FAM14_RECOVERY_REASONING', 'D5',
  'An hour of work that was never committed has been lost. Can the history bring it back?',
  'No; the history holds only what was recorded into it',
  ['Yes, from the shared copy',
   'Yes, from the marked-but-uncommitted work',
   'Yes, from the most recent commit'],
  'Recovery reaches exactly as far back as recording did, so no; the history holds only what was '
  'recorded into it. The most recent commit restores the state before the hour began, which is not '
  'the same as recovering the hour.',
  mode='TRANSFER', hinge='An hour of work that was never committed has been lost')

q('GB_GF_044', 'GF_FAM14_RECOVERY_REASONING', 'D5',
  'A bad commit can be undone by rewriting the history so that it never existed, or by recording a '
  'new commit that reverses its effect. What does the rewrite cost once the bad commit has already '
  'been shared?',
  'Everybody else still holds it, and their history no longer agrees with yours',
  ['Nothing; the rewritten history is simply tidier',
   'The reversing approach becomes impossible afterwards',
   'The files themselves are lost along with the entry'],
  'A rewrite changes only your copy, so everybody else still holds it, and their history no longer '
  'agrees with yours. A reversing commit costs a visible entry and keeps every copy in step.',
  mode='TRADEOFF', hinge='rewriting the history so that it never existed')

q('GB_GF_045', 'GF_FAM14_RECOVERY_REASONING', 'D5',
  'A student fixes a confusing project state by deleting the folder and fetching a fresh copy from '
  'the shared copy. What have they lost?',
  'Every commit that had not been sent, and every edit that had not been committed',
  ['Nothing; the shared copy holds the whole project',
   'Only the edits that had not been committed',
   'Only the most recent commit'],
  'The fresh copy contains what was sent and nothing else, so they have lost every commit that had '
  'not been sent, and every edit that had not been committed. It is the most common way of '
  'destroying real work while apparently doing something safe.',
  mode='TRANSFER', hinge='deleting the folder and fetching a fresh copy')

q('GB_GF_046', 'GF_FAM14_RECOVERY_REASONING', 'D5',
  'Three pieces of work exist: one committed and sent, one committed but not sent, and one edited '
  'but never committed. Which of them can be recovered from the shared copy alone?',
  'Only the one that was committed and sent',
  ['All three of them',
   'The two that were committed',
   'None of them'],
  'The shared copy holds exactly what reached it, so only the one that was committed and sent can '
  'come back from there. The other two exist on the local machine or nowhere.',
  mode='EDGE', hinge='one committed and sent, one committed but not sent')

# =========================================================================
# GF_FAM15_WORKFLOW_TRANSFER — D4, D5 x3
# =========================================================================
q('GB_GF_047', 'GF_FAM15_WORKFLOW_TRANSFER', 'D4',
  'You and a teammate have both changed the project since the last time it was shared. Which order '
  'of operations loses nothing?',
  'Commit your work, bring theirs down, settle anything that clashes, then send',
  ['Send first, so that your work is in place before theirs',
   'Bring theirs down first, before committing your own work',
   'Copy your files aside, bring theirs down, then copy yours back over'],
  'Recording your work first makes it recoverable whatever happens next, so commit your work, '
  'bring theirs down, settle anything that clashes, then send. Every other order either risks your '
  'work or quietly discards theirs.',
  evidence='both changed the project since the last time it was shared')

q('GB_GF_048', 'GF_FAM15_WORKFLOW_TRANSFER', 'D5',
  'Why is committing before bringing other people\'s work down the safer order?',
  'Your work is recorded before anything else touches the folder, so it can be recovered whatever '
  'follows',
  ['It makes the incoming work arrive faster',
   'It prevents clashes from happening at all',
   'It sends your work up at the same time'],
  'The risky moment is when somebody else\'s changes land in your folder, and committing first '
  'means your work is recorded before anything else touches the folder, so it can be recovered '
  'whatever follows. Clashes still happen; they simply stop being dangerous.',
  mode='TRANSFER', hinge='committing before bringing other people')

q('GB_GF_049', 'GF_FAM15_WORKFLOW_TRANSFER', 'D5',
  'Copying your files aside, bringing the shared work down, and copying your files back over does '
  'keep your own work. What does it cost?',
  'It silently overwrites whatever your teammate changed in those same files',
  ['Nothing; it is the simplest approach available',
   'It loses your own work instead of theirs',
   'It leaves the history unreadable afterwards'],
  'The copy back is a blind overwrite, so it silently overwrites whatever your teammate changed in '
  'those same files. Nothing reports the loss, because as far as the tool is concerned you simply '
  'made those changes yourself.',
  mode='TRADEOFF', hinge='copying your files back over does')

q('GB_GF_050', 'GF_FAM15_WORKFLOW_TRANSFER', 'D5',
  'An attempt to send is refused, with a message saying the shared copy holds work you do not '
  'have. What does that refusal protect against?',
  'Replacing your teammate\'s commits with a history that never contained them',
  ['Sending a file that is too large to store',
   'Recording a commit without a message',
   'Two people editing the same line of the same file'],
  'Your history does not include their commits, so sending it as it stands would mean replacing '
  'your teammate\'s commits with a history that never contained them. The refusal is what forces '
  'you to bring their work down first.',
  mode='TRANSFER', hinge='the shared copy holds work you do not have')
