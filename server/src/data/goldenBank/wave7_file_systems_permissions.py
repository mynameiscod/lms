# -*- coding: utf-8 -*-
"""
Wave 7 — FILE_SYSTEMS_PERMISSIONS, 50 Golden Bank questions, all newly authored.

THE BANKED OPERATING SYSTEMS SKILL ASKS WHAT A PATH REFERS TO AND WHETHER SOMETHING IS A FILE OR A
DIRECTORY. Neither is re-asked. This skill starts at the next question in each case: how a relative
path resolves from a stated working directory, and what the three permissions actually permit —
including the one nobody expects, which is that removing a file is governed by the directory
listing it rather than by the file itself.

THE THREE PERMISSIONS ARE INDEPENDENT, NOT RANKED. Students arrive believing write implies read
and that the three form a ladder. Several families offer the ladder reading as a wrong answer,
because every later question breaks if it is held.

A USER IS JUDGED BY EXACTLY ONE CLASS, AND IT NEED NOT BE THE MOST GENEROUS. An owner with fewer
permissions than the group they belong to gets the owner permissions, which surprises almost
everyone and is where real access puzzles come from.

EVERY TREE IS WRITTEN OUT AND EVERY WORKING DIRECTORY IS STATED. Nothing here depends on guessing
a layout or on recalling how a particular system arranges its directories, so every answer is
derivable from the stem.

NO STEM SPELLS A COMMAND OR NAMES A SYSTEM. Permissions are described by what they allow, so this
survives any operating system and rewards no memory of a manual page.
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
# FS_FAM01_PATH_SHAPE — D1 x4, D2 x1
# =========================================================================
q('GB_FS_001', 'FS_FAM01_PATH_SHAPE', 'D1',
  'A path is written as /home/asha/notes.txt. Does its meaning depend on where you are?',
  'No; it begins at the top of the tree and means the same everywhere',
  ['Yes; every path is read from the current directory',
   'Yes, unless the current directory is the top of the tree',
   'It depends on whether the file exists'],
  'Starting at the top fixes the meaning completely. Where the reader happens to be changes '
  'nothing about where it points.')

q('GB_FS_002', 'FS_FAM01_PATH_SHAPE', 'D1',
  'A path is written as reports/june.txt. Does its meaning depend on where you are?',
  'Yes; it is read from wherever you currently are',
  ['No; it names one file wherever it is used',
   'No, because it contains a directory name',
   'Only if the file does not exist'],
  'Not starting at the top means starting from here, and here changes. The same path reaches '
  'different files from different places.')

q('GB_FS_003', 'FS_FAM01_PATH_SHAPE', 'D1',
  'Which of these paths means the same thing from every directory?',
  '/var/log/system.log',
  ['log/system.log', '../log/system.log', './system.log'],
  'Only the first begins at the top. The other three all start from wherever the reader is.')

q('GB_FS_004', 'FS_FAM01_PATH_SHAPE', 'D1',
  'What distinguishes the two kinds of path?',
  'Whether it starts at the top of the tree or from where you are',
  ['How many directory names it contains',
   'Whether the file it names exists',
   'Whether it ends in a file name or a directory name'],
  'Length and existence have nothing to do with it. A one-segment path can start at the top and a '
  'five-segment one need not.')

q('GB_FS_005', 'FS_FAM01_PATH_SHAPE', 'D2',
  'A student says a long path must start at the top of the tree because it is detailed. What is '
  'wrong?',
  'Length says nothing about it; a long path can still be read from where you are',
  ['Nothing; long paths always start at the top',
   'Long paths are always read from where you are',
   'The rule holds for paths of more than three segments'],
  'A path like a/b/c/d/e/f.txt is six segments and entirely relative. Only how it begins settles '
  'the question.')

# =========================================================================
# FS_FAM02_PERMISSION_MEANING — D1 x3, D2 x1
# =========================================================================
q('GB_FS_006', 'FS_FAM02_PERMISSION_MEANING', 'D1',
  'A user wants to see what is inside a file. Which permission does that need?',
  'Read',
  ['Write', 'Execute', 'All three'],
  'Reading the contents needs the read permission and nothing else. The other two govern '
  'different actions entirely.')

q('GB_FS_007', 'FS_FAM02_PERMISSION_MEANING', 'D1',
  'A user has write permission on a file and not read permission. What can they do?',
  'Change the contents without being able to see them',
  ['Both change and see the contents, since write includes read',
   'Neither, since write is useless without read',
   'See the contents but not change them'],
  'The three are independent rather than ranked, so having one grants nothing about the others. '
  'Writing without reading is unusual and entirely possible.')

q('GB_FS_008', 'FS_FAM02_PERMISSION_MEANING', 'D1',
  'Which statement about the three permissions is true?',
  'Each is granted separately and none implies another',
  ['Write implies read, since changing needs seeing',
   'Execute implies read and write',
   'They form a ladder, with each including the ones below'],
  'Independence is the whole design. The ladder reading is intuitive and makes every real access '
  'question come out wrong.')

q('GB_FS_009', 'FS_FAM02_PERMISSION_MEANING', 'D2',
  'A student cannot run a script and says it must be because they lack read permission on it. The '
  'read permission is granted and the execute permission is not. What is the actual obstacle?',
  'The missing execute permission, which is what running requires',
  ['The missing read permission, which running also requires',
   'Both permissions are needed and both are missing',
   'Nothing; the script should run'],
  'Running needs execute, and read is separately granted here. Assuming one permission covers '
  'another is what produces this diagnosis.')

# =========================================================================
# FS_FAM03_CLASS_RECOGNITION — D1 x3, D2 x1
# =========================================================================
q('GB_FS_010', 'FS_FAM03_CLASS_RECOGNITION', 'D1',
  'A file is owned by Asha. Asha opens it. Which set of permissions applies to her?',
  'The owner set',
  ['The group set', 'The everyone-else set',
   'Whichever of the three is most generous'],
  'She is the owner, so the owner set governs. The other two describe other people.')

q('GB_FS_011', 'FS_FAM03_CLASS_RECOGNITION', 'D1',
  'A file is owned by Asha and belongs to the group "editors". Ravi is in that group and is not '
  'the owner. Which set applies to Ravi?',
  'The group set',
  ['The owner set', 'The everyone-else set', 'The owner set and the group set together'],
  'Ravi falls into the group class, so that set governs him. He is judged by one set rather than '
  'a combination.')

q('GB_FS_012', 'FS_FAM03_CLASS_RECOGNITION', 'D1',
  'How many of the three sets apply to any one user?',
  'Exactly one',
  ['All three', 'One or two, depending on the file',
   'Whichever ones grant the action being attempted'],
  'A user falls into the first class that describes them and is judged by that set alone. '
  'Combining the sets is not how the decision is made.')

q('GB_FS_013', 'FS_FAM03_CLASS_RECOGNITION', 'D2',
  'A file is owned by Asha, whose owner set grants read only. It belongs to a group Asha is in, '
  'whose group set grants read and write. Can Asha write to the file?',
  'No; she is the owner, so the owner set governs and it grants no write',
  ['Yes; the group set grants write and she is in the group',
   'Yes; the most generous applicable set applies',
   'It cannot be determined without the everyone-else set'],
  'Being the owner is what decides which set is consulted, and it is not the most generous one '
  'here. This surprises almost everyone the first time they meet it.')

# =========================================================================
# FS_FAM04_RELATIVE_RESOLUTION — D2 x1, D3 x1
# =========================================================================
q('GB_FS_014', 'FS_FAM04_RELATIVE_RESOLUTION', 'D2',
  'The current directory is /home/asha. A path is written as reports/june.txt. Which file does it '
  'reach?',
  '/home/asha/reports/june.txt',
  ['/reports/june.txt', '/home/reports/june.txt', '/home/asha/june.txt'],
  'The relative path is joined to the current directory. Reading it from the top instead gives '
  'the first wrong answer.')

q('GB_FS_015', 'FS_FAM04_RELATIVE_RESOLUTION', 'D3',
  'The current directory is /var/www/site/public. A path is written as assets/img/logo.png. Which '
  'file does it reach?',
  '/var/www/site/public/assets/img/logo.png',
  ['/assets/img/logo.png',
   '/var/www/site/assets/img/logo.png',
   '/var/www/site/public/img/logo.png'],
  'Every segment of the relative path is appended to the current directory in order. Dropping one '
  'level or one segment produces the other answers.')

# =========================================================================
# FS_FAM05_HERE_AND_ABOVE — D2 x1, D3 x1
# =========================================================================
q('GB_FS_016', 'FS_FAM05_HERE_AND_ABOVE', 'D2',
  'A developer sitting in /home/asha/reports types a path made of two dots, a slash, and then '
  'notes.txt. Where does that land?',
  '/home/asha/notes.txt',
  ['/home/asha/reports/notes.txt', '/home/notes.txt', '/notes.txt'],
  'Two dots mean the directory above, which from reports is asha, and notes.txt is taken from '
  'there. A second climb would have reached /home.')

q('GB_FS_017', 'FS_FAM05_HERE_AND_ABOVE', 'D3',
  'A build script runs from /a/b/c/d and refers to ../../x/y.txt. How many levels does it climb, '
  'and where does it end up?',
  'Two levels, ending at /a/b/x/y.txt',
  ['One level, ending at /a/b/c/x/y.txt',
   'Three levels, ending at /a/x/y.txt',
   'Two levels, ending at /a/x/y.txt'],
  'Each pair of dots climbs once, so two pairs climb from d to b, giving Two levels, ending at '
  '/a/b/x/y.txt. Miscounting the climbs is what produces the other three.')

# =========================================================================
# FS_FAM06_PERMISSION_DECISION — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_FS_018', 'FS_FAM06_PERMISSION_DECISION', 'D2',
  'A file grants its owner read and write, its group read only, and everyone else nothing. Ravi '
  'is in the group and wants to read it. Is he allowed?',
  'Yes; the group set grants read',
  ['No; only the owner may read it',
   'Yes; he may read and write it',
   'It cannot be determined without knowing the owner'],
  'Ravi falls in the group class and that set grants read. It does not grant write, so that is '
  'where his permissions stop.')

q('GB_FS_019', 'FS_FAM06_PERMISSION_DECISION', 'D3',
  'Priya neither owns a document nor belongs to its group, and the everyone-else set on it '
  'permits reading and nothing more. She tries to save a change to it. What happens?',
  'The save is refused, since the class she falls into grants no write',
  ['The save succeeds, because two of the three sets do permit writing',
   'The save succeeds, because being able to read a file means being able to save it',
   'The outcome depends on who else is in the group'],
  'She is judged by the everyone-else class alone, and it stops at reading. What the owner and '
  'group are permitted has no bearing on her.')

q('GB_FS_020', 'FS_FAM06_PERMISSION_DECISION', 'D4',
  'A file grants its owner execute only, its group read and write, and everyone else read. Asha '
  'owns it and is also a member of the group. She wants to read it. A user is judged by the first '
  'class they fall into, and Asha is the owner. Is she allowed?',
  'No; the owner set grants execute only',
  ['Yes; her group membership grants read',
   'Yes; the everyone-else set grants read and she is a person like any other',
   'Yes; owners may always read their own files'],
  'The owner class is consulted and it grants no read, so the more generous sets never come into '
  'it. Owning a file does not carry any permission of its own.',
  evidence='A user is judged by the first class they fall into, and Asha is the owner')

# =========================================================================
# FS_FAM07_DIRECTORY_PERMISSIONS — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_FS_021', 'FS_FAM07_DIRECTORY_PERMISSIONS', 'D2',
  'What does read permission on a directory allow?',
  'Seeing the names of what is inside it',
  ['Reading the contents of the files inside it',
   'Reaching a file inside it whose name you know',
   'Adding a file to it'],
  'A directory holds names, so reading it lists names. What those files contain is governed by '
  'their own permissions.')

q('GB_FS_022', 'FS_FAM07_DIRECTORY_PERMISSIONS', 'D3',
  'A directory grants execute and not read. A user knows the exact name of a file inside it. What '
  'can they do?',
  'Reach that file by name, without being able to list what else is there',
  ['Nothing, since they cannot read the directory',
   'List the contents but not reach any file',
   'Both list the contents and reach the file'],
  'Execute on a directory permits passing through to something named. Read permits listing, and '
  'the two are separate.')

q('GB_FS_023', 'FS_FAM07_DIRECTORY_PERMISSIONS', 'D4',
  'A directory grants read and not execute. A user wants to open a file inside it. Reading the '
  'directory lists the names, and reaching anything inside requires execute, which is not granted. '
  'What happens?',
  'They can see the file name and cannot open it',
  ['They can open the file, since they can see it',
   'They can neither see nor open it',
   'They can open it but not see it listed'],
  'Being able to see a name is not being able to reach what it names. This combination produces '
  'the confusing result of a visible file that cannot be opened.',
  evidence='Reading the directory lists the names, and reaching anything inside requires execute, '
           'which is not granted')

# =========================================================================
# FS_FAM08_DELETION_GOVERNANCE — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_FS_024', 'FS_FAM08_DELETION_GOVERNANCE', 'D2',
  'Removing a file changes which thing?',
  'The directory that lists it',
  ['The file itself', 'Both the file and the directory equally',
   'Neither; removal is handled separately'],
  'The name is an entry in the directory, and removing the file removes that entry. That is why '
  'the directory permissions are what govern it.')

q('GB_FS_025', 'FS_FAM08_DELETION_GOVERNANCE', 'D3',
  'A file grants nobody write permission. Its directory grants write to everyone. Can an ordinary '
  'user remove the file?',
  'Yes; removal is governed by the directory, which grants write',
  ['No; the file grants no write permission',
   'No; both the file and the directory must grant write',
   'Only the owner of the file may remove it'],
  'The file own permissions govern changing its contents rather than its existence. A read-only '
  'file in a writable directory can be removed by anyone who can write to that directory.')

q('GB_FS_026', 'FS_FAM08_DELETION_GOVERNANCE', 'D4',
  'A team protects an important file by removing every write permission from it. It sits in a '
  'directory that grants write to everyone. Removing a file changes the directory that lists it, '
  'and the directory grants write to everyone. Is the file protected from deletion?',
  'No; anyone who can write to the directory can still remove it',
  ['Yes; a file with no write permission cannot be removed',
   'Yes, unless the user owns the file',
   'It depends on whether the file is currently open'],
  'The protection guards the contents and not the existence. Removing write from the directory is '
  'what would actually prevent deletion.',
  evidence='Removing a file changes the directory that lists it, and the directory grants write '
           'to everyone')

# =========================================================================
# FS_FAM09_SUMMARY_READING — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_FS_027', 'FS_FAM09_SUMMARY_READING', 'D2',
  'A summary reads rw-r--r--, in the order owner, group, everyone else, with each group of three '
  'in the order read, write, execute. What may the owner do?',
  'Read and write, but not execute',
  ['Read only', 'Read, write and execute', 'Write only'],
  'The first group of three is rw-, which grants read and write with execute absent. The dash '
  'marks a permission that is not granted.')

q('GB_FS_028', 'FS_FAM09_SUMMARY_READING', 'D3',
  'Two files are compared. One carries the summary r-xr-x--- and the other rwxr-x---. Groups of '
  'three run owner, then group, then everyone else; within each group the order is read, write, '
  'execute. What is the only difference between them?',
  'The owner may write on the second and not on the first',
  ['The group may write on the second and not on the first',
   'Everyone else gains read on the second',
   'There is no difference between the two'],
  'Only the second character differs, and it sits in the owner group at the write position. The '
  'remaining six characters are identical.')

q('GB_FS_029', 'FS_FAM09_SUMMARY_READING', 'D4',
  'A summary reads ---rwxrwx, in the order owner, group, everyone else, with each group in the '
  'order read, write, execute. The owner asks why they cannot open the file. The first group of '
  'three describes the owner and it grants nothing. What is the position?',
  'The owner is granted nothing, while everyone else has full access',
  ['The owner has full access, since owners always do',
   'The summary is invalid, since an owner cannot have fewer permissions than others',
   'The owner may read but not write'],
  'The arrangement is unusual and entirely legal, and the owner is judged by their own group of '
  'three. Owning the file carries no permission by itself.',
  evidence='The first group of three describes the owner and it grants nothing')

# =========================================================================
# FS_FAM10_PATH_EQUIVALENCE — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_FS_030', 'FS_FAM10_PATH_EQUIVALENCE', 'D2',
  'The current directory is /home/asha. Do the paths notes.txt and /home/asha/notes.txt reach the '
  'same file?',
  'Yes; the relative one resolves to the absolute one from here',
  ['No; they are written differently',
   'No; one is relative and one is absolute',
   'Only if the file exists'],
  'Resolving the relative path from the stated directory gives exactly the absolute one. Looking '
  'different is not being different.')

q('GB_FS_031', 'FS_FAM10_PATH_EQUIVALENCE', 'D3',
  'The current directory is /a/b. Do the paths ../b/c.txt and c.txt reach the same file?',
  'Yes; going up to /a and back into b returns to where you started',
  ['No; the first goes up a level and the second does not',
   'No; the first names b explicitly',
   'Only if /a/b contains a directory called b'],
  'Up one level and back down into the same directory is a round trip. Both paths resolve to '
  '/a/b/c.txt.')

q('GB_FS_032', 'FS_FAM10_PATH_EQUIVALENCE', 'D4',
  'A script uses the path data/input.csv and works when run from /home/asha/project. A colleague '
  'runs the same script from /home/asha and it fails. The path is relative and is resolved from '
  'whichever directory the script is run from. Which file was it looking for the second time?',
  '/home/asha/data/input.csv',
  ['/home/asha/project/data/input.csv',
   '/data/input.csv',
   '/home/asha/project/input.csv'],
  'The relative path was joined to the second directory rather than the first. Nothing moved and '
  'nothing about the script changed.',
  evidence='The path is relative and is resolved from whichever directory the script is run from')

# =========================================================================
# FS_FAM11_REFUSAL_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_FS_033', 'FS_FAM11_REFUSAL_DIAGNOSIS', 'D3',
  'A user cannot open /projects/secret/plan.txt. The file grants read to everyone. The directory '
  '/projects/secret grants the user nothing. What is blocking them?',
  'The directory on the way, which they cannot pass through',
  ['The file, which must be misconfigured',
   'The top of the tree, which is restricted',
   'Nothing; the file should open'],
  'Reaching a file requires passing through every directory on the way to it. A perfectly '
  'readable file inside an unreachable directory cannot be opened.')

q('GB_FS_034', 'FS_FAM11_REFUSAL_DIAGNOSIS', 'D4',
  'A user cannot open /var/data/reports/q1.txt. Every directory on the path grants them execute, '
  'and the file grants read to its owner and to nobody else. The user is not the owner and is not '
  'in the group. Every directory on the path is passable and the file grants read only to its '
  'owner. What is blocking them?',
  'The file itself, since the class they fall into is granted no read',
  ['A directory on the path, which they cannot pass through',
   'The group, which they are not a member of',
   'Nothing; the file should open'],
  'The path is clear all the way, which rules out the directories. Not being in the group is why '
  'they fall into the everyone-else class rather than being the obstacle itself.',
  evidence='Every directory on the path is passable and the file grants read only to its owner')

# =========================================================================
# FS_FAM12_WRONG_START_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_FS_035', 'FS_FAM12_WRONG_START_DIAGNOSIS', 'D3',
  'A command using the path config/settings.json worked yesterday from one directory and fails '
  'today. The file is still present and still readable when reached by its full path from the '
  'top. What is the likely cause?',
  'The command was run from a different directory, so the relative path resolved elsewhere',
  ['The file was moved',
   'The file permissions were changed',
   'The file was deleted and recreated'],
  'The file being reachable by its full path rules out both moving and permissions. What changed '
  'is where the relative path was resolved from.')

q('GB_FS_036', 'FS_FAM12_WRONG_START_DIAGNOSIS', 'D4',
  'A scheduled job using a relative path succeeds when a developer runs it by hand and fails when '
  'the scheduler runs it. The file is present and readable by the account the scheduler uses. The '
  'file is readable by the scheduler account and the path is relative. What is the likely cause?',
  'The scheduler starts the job in a different directory from the one the developer runs it in',
  ['The scheduler account lacks permission on the file',
   'The scheduler runs the job at a time when the file is absent',
   'The relative path is malformed'],
  'Permissions are stated to be in order, which leaves where the job starts. Schedulers commonly '
  'start jobs somewhere quite unlike a developer session.',
  evidence='The file is readable by the scheduler account and the path is relative')

# =========================================================================
# FS_FAM13_CHANGE_REASONING — D3 x1, D4 x1, D5 x3
# =========================================================================
q('GB_FS_037', 'FS_FAM13_CHANGE_REASONING', 'D3',
  'A file grants read to its owner only. Read is added to the everyone-else set so that one '
  'colleague can see it. Who gains access?',
  'Everyone on the system, not only that colleague',
  ['Only that colleague',
   'Only members of the file group',
   'Nobody, until the colleague is added to the group'],
  'The everyone-else set describes everyone outside the owner and the group. Adding the colleague '
  'to the group and granting the group instead is the narrower change.')

q('GB_FS_038', 'FS_FAM13_CHANGE_REASONING', 'D4',
  'A directory is granted write for everyone so that a team can add files to it. The directory '
  'already contains files belonging to several people. Write on a directory permits adding and '
  'removing entries, and the directory holds other people files. What else does the change '
  'permit?',
  'Anyone can now remove the files already in it, whoever owns them',
  ['Nothing else; only adding files is permitted',
   'Anyone can now change the contents of the files in it',
   'Anyone can now read the files in it'],
  'Adding and removing are the same permission on a directory. The contents of the existing files '
  'are still governed by their own permissions, which is why removal rather than modification is '
  'the exposure.',
  evidence='Write on a directory permits adding and removing entries, and the directory holds '
           'other people files')

q('GB_FS_039', 'FS_FAM13_CHANGE_REASONING', 'D5',
  'A team grants read to everyone on a directory so that a listing works, and is satisfied that '
  'the files inside remain private because their own permissions were not changed. Reading a '
  'directory lists the names inside it, and the names themselves may be revealing. What has been '
  'exposed?',
  'The file names, which may disclose more than the team intended',
  ['Nothing; the file contents are still protected',
   'The file contents, since directory read implies file read',
   'Nothing, since a listing is not access'],
  'The contents really are still protected and names are information in their own right. A '
  'directory of files named after clients or incidents discloses a great deal before anything is '
  'opened.',
  mode='EDGE',
  hinge='Reading a directory lists the names inside it, and the names themselves may be revealing')

q('GB_FS_040', 'FS_FAM13_CHANGE_REASONING', 'D5',
  'An administrator removes execute from a directory to stop people reaching a file inside it. A '
  'colleague points out that the file is also reachable through a second directory that still '
  'grants execute. Reaching a file requires passing through the directories on the route taken, '
  'and a second route is still open. What follows?',
  'The file is still reachable by the other route, so the change achieved little',
  ['The file is now unreachable, since one route is blocked',
   'The change has no effect at all on either route',
   'The second route will stop working automatically'],
  'Permissions apply along the route actually taken rather than to the file globally. Every route '
  'has to be considered, which is why access questions get harder as trees get linked.',
  mode='TRANSFER',
  hinge='Reaching a file requires passing through the directories on the route taken, and a '
        'second route is still open')

q('GB_FS_041', 'FS_FAM13_CHANGE_REASONING', 'D5',
  'A team removes write permission from a configuration file so that a running service cannot '
  'change it. The service runs as an account that owns the file. An owner may restore write '
  'permission on a file they own, and the service account owns this one. Does the change prevent '
  'the service from writing?',
  'No; the owner can grant write back to itself before writing',
  ['Yes; without write permission the service cannot write',
   'Yes, unless the service runs with administrative rights',
   'No, because permissions do not apply to running services'],
  'Ownership carries the ability to change permissions, which makes removing one from an owner a '
  'speed bump rather than a barrier. Changing the owner is what would actually prevent it.',
  mode='EDGE',
  hinge='An owner may restore write permission on a file they own')

# =========================================================================
# FS_FAM14_GRANT_CHOICE — D4 x1, D5 x4
# =========================================================================
q('GB_FS_042', 'FS_FAM14_GRANT_CHOICE', 'D4',
  'A log file must be readable by a monitoring account and by nobody else, and writable by the '
  'service that produces it. The service owns the file and the monitoring account can be placed '
  'in a group. Only two parties need access and one of them owns the file. What is the narrowest '
  'arrangement?',
  'Write for the owner, read for a group containing the monitoring account, nothing for everyone '
  'else',
  ['Read and write for everyone, since only two parties will use it',
   'Read for everyone and write for the owner',
   'Read and write for the owner and for the group'],
  'Each party gets exactly what it needs and nobody else gets anything. Granting the group write '
  'or everyone read both hand out access nobody asked for.',
  evidence='Only two parties need access and one of them owns the file')

q('GB_FS_043', 'FS_FAM14_GRANT_CHOICE', 'D5',
  'A shared directory must let team members add their own files and must stop them removing one '
  'another files. Write on a directory permits both adding and removing, and the two cannot be '
  'separated by the three ordinary permissions. What follows?',
  'The ordinary three permissions cannot express this, so an additional mechanism is needed',
  ['Grant write to the group, which permits adding only',
   'Grant write to the owner only, and let others add through the group',
   'Remove write from the directory and grant it on each file'],
  'Adding and removing are one permission, so no arrangement of the three achieves the split. '
  'Systems provide an extra directory setting for exactly this case, and recognising that the '
  'basic three cannot do it is the step that matters.',
  mode='EDGE',
  hinge='Write on a directory permits both adding and removing, and the two cannot be separated '
        'by the three ordinary permissions')

q('GB_FS_044', 'FS_FAM14_GRANT_CHOICE', 'D5',
  'A script must be runnable by a group and must not be readable by them, so that the group '
  'cannot see how it works. Running a script requires the system to read its text, so execute '
  'without read does not work for a script. What follows?',
  'The requirement cannot be met for a script, since running it requires reading it',
  ['Grant execute without read, which achieves exactly this',
   'Grant read without execute, and run it another way',
   'Grant both and rely on the group not to look'],
  'A compiled program can be executed without being readable, and a script cannot, because the '
  'interpreter has to read the text. The distinction is what makes this requirement impossible '
  'as stated.',
  mode='TRANSFER',
  hinge='Running a script requires the system to read its text')

q('GB_FS_045', 'FS_FAM14_GRANT_CHOICE', 'D5',
  'A team can grant read to everyone on a directory of documentation, or maintain a group '
  'containing every person who needs it. The documentation is public information and the group '
  'would need updating every time somebody joins or leaves. The content is public and the group '
  'requires ongoing maintenance. Which fits?',
  'Grant read to everyone, since the content is public and the group buys nothing',
  ['Maintain the group, since narrow permissions are always preferable',
   'Maintain the group, since it records who has access',
   'Grant read to everyone and also maintain the group'],
  'Narrowing is worth paying for when there is something to protect, and here there is not. The '
  'group would be maintenance in exchange for restricting access to information that is not '
  'restricted.',
  mode='TRADEOFF',
  hinge='The content is public and the group requires ongoing maintenance')

q('GB_FS_046', 'FS_FAM14_GRANT_CHOICE', 'D5',
  'An engineer is repeatedly blocked by permissions and proposes granting themselves full access '
  'to everything to save time. The permissions currently prevent a mistake in one area from '
  'affecting the others, and full access would remove that separation everywhere. What is the '
  'trade?',
  'Time saved against losing the containment that stops one mistake spreading',
  ['Nothing; full access is obviously correct for an engineer',
   'Nothing; full access is obviously wrong in every case',
   'Whether the engineer is trusted by their colleagues'],
  'The question is not about trust, since a trusted person makes mistakes too. What permissions '
  'buy here is that an error in one area stays there.',
  mode='TRADEOFF',
  hinge='The permissions currently prevent a mistake in one area from affecting the others')

# =========================================================================
# FS_FAM15_ACCESS_MODEL_TRANSFER — D4 x1, D5 x3
# =========================================================================
q('GB_FS_047', 'FS_FAM15_ACCESS_MODEL_TRANSFER', 'D4',
  'A document system records, for each document, an owner, a team, and a default for everyone '
  'else, with view and edit granted separately. A document grants its owner view only, its team '
  'view and edit, and everyone else view. The owner is also on the team. The owner class is '
  'consulted first and it grants view only. Can the owner edit it?',
  'No; the owner class grants view only',
  ['Yes; their team membership grants edit',
   'Yes; owners can always edit their own documents',
   'It cannot be determined from the description'],
  'The described system is the file permission model under other names, and the same conclusion '
  'follows. Being consulted first is what makes the owner class binding rather than a floor.',
  evidence='The owner class is consulted first and it grants view only')

q('GB_FS_048', 'FS_FAM15_ACCESS_MODEL_TRANSFER', 'D5',
  'A storage service grants list and read as separate permissions on a container. A team grants '
  'read and not list, and a user complains they cannot find anything. Read permits fetching an '
  'item whose name is known, and list permits discovering the names. What can the user do?',
  'Fetch any item whose name they already know, without being able to discover names',
  ['Nothing, since they cannot see what is there',
   'List the contents but not fetch anything',
   'Both list and fetch, since read implies list'],
  'This is directory execute and directory read under other names. The combination is deliberate '
  'in storage services, where names are often known in advance.',
  mode='TRANSFER',
  hinge='Read permits fetching an item whose name is known, and list permits discovering the '
        'names')

q('GB_FS_049', 'FS_FAM15_ACCESS_MODEL_TRANSFER', 'D5',
  'A repository grants a user write on a folder of files. A colleague argues this means the user '
  'can also delete the folder itself. Write on the folder governs what happens inside it, while '
  'removing the folder changes the thing that contains it. Is the colleague right?',
  'No; removing the folder is governed by whatever contains the folder',
  ['Yes; write on a folder includes removing it',
   'Yes, if the user also owns the folder',
   'It cannot be determined without knowing the repository'],
  'The same reasoning that puts file deletion under the directory puts folder deletion under the '
  'parent. Permission on a thing governs what happens inside it rather than its own existence.',
  mode='EDGE',
  hinge='Write on the folder governs what happens inside it, while removing the folder changes '
        'the thing that contains it')

q('GB_FS_050', 'FS_FAM15_ACCESS_MODEL_TRANSFER', 'D5',
  'A team must decide whether to grant access to a shared area by adding each person '
  'individually or by maintaining one group. People join and leave every month, and the same '
  'access is needed on forty separate areas. Individual grants would have to be made and removed '
  'on forty areas for every joiner and leaver. Which fits?',
  'The group, since membership is changed once rather than forty times per person',
  ['Individual grants, since they are more precise',
   'Individual grants, since groups grant more than is needed',
   'Either, since the resulting access is identical'],
  'The resulting access is identical, which is why correctness cannot decide it. What decides it '
  'is that one change to a group is forty changes avoided, and forty places to forget is forty '
  'places someone keeps access they should have lost.',
  mode='TRADEOFF',
  hinge='Individual grants would have to be made and removed on forty areas for every joiner and '
        'leaver')
