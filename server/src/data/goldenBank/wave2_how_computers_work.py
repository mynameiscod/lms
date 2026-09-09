# -*- coding: utf-8 -*-
"""
Wave 2 — HOW_COMPUTERS_WORK, 50 Golden Bank questions.

15 come from the existing bank (3 kept, 8 rewritten, 4 remapped from PROGRAMMING_FUNDAMENTALS) and
35 are new. This is the largest legacy pool in the whole bank.

EIGHT PHASE-2 KEEPS ARE REWRITTEN, AND SEVEN OF THEM FOR THE SAME REASON. HCW_FAM02 requires a
boundary case in every variant — a driver, firmware, the operating system itself — because
classifying a keyboard as hardware measures nothing. The legacy items offered a CPU, RAM and a
motherboard against a spreadsheet, which anyone can separate without holding the distinction. The
same applies to the items whose wrong options were "A website is RAM" and "Browsers are CPUs".

THE PROGRAM-AND-PROCESS FACT IS SHARED WITH OPERATING_SYSTEMS AND FRAMED DIFFERENTLY HERE. The
blueprint says so explicitly: the operating system items ask what the two things are called, and
these ask what exists on disk, what exists in memory, and what remains afterwards. The cross-skill
similarity check over the whole bank is what confirms the two did not converge.
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
# HCW_FAM01_IPO_LABELLING — D1 x4 (legacy), D2 x1 (legacy)
# =========================================================================
q('GB_HCW_001', 'HCW_FAM01_IPO_LABELLING', 'D1',
  'A calculator is given 2 and 3, adds them, and shows 5. Which part is the input?',
  '2 and 3',
  ['5', 'The addition', 'The display'],
  'The input is what the task is given to work with, which here is 2 and 3. The 5 is what comes '
  'out, the addition is the work done in between, and the display is equipment rather than any '
  'part of the task.',
  provenance='LEGACY_REMAP', source='4aaf3d')

q('GB_HCW_002', 'HCW_FAM01_IPO_LABELLING', 'D1',
  'Marks are entered into a grade calculator and a grade is produced. Which part is the output?',
  'The grade',
  ['The marks', 'The comparison of each mark against a threshold', 'The storage the marks came '
   'from'],
  'The grade is what the task produces, and the output is always what a task produces. The marks '
  'are what it was given, and comparing them against thresholds is the work that turns one into '
  'the other.',
  provenance='LEGACY_REMAP', source='48d498')

q('GB_HCW_003', 'HCW_FAM01_IPO_LABELLING', 'D1',
  'A temperature in Celsius is converted to Fahrenheit. Which part is the processing?',
  'Applying the conversion formula',
  ['The Celsius value', 'The Fahrenheit value', 'The thermometer that took the reading'],
  'Processing is the work that turns what was given into what is produced. The two temperatures '
  'are the input and the output, and the thermometer is outside the task altogether.',
  provenance='LEGACY_REMAP', source='4972cf')

q('GB_HCW_004', 'HCW_FAM01_IPO_LABELLING', 'D1',
  'A program reads a list of readings and writes a summary file to disk. Nothing appears on the '
  'screen. What is the output?',
  'The summary file written to disk',
  ['Nothing, because nothing appeared on the screen',
   'The list of readings',
   'The reading of the list'],
  'Output is what the task produces, wherever it goes. A file on disk is as much an output as '
  'something displayed — equating output with the screen is what makes this worth asking.',
  provenance='LEGACY_REMAP', source='4b4d74')

q('GB_HCW_005', 'HCW_FAM01_IPO_LABELLING', 'D2',
  'Which sequence describes how a simple computing task proceeds?',
  'Input, then processing, then output',
  ['Output, then input, then processing',
   'Processing, then output, then input',
   'Input, then output, then processing'],
  'Something has to be given before it can be worked on, and worked on before a result exists. '
  'Every other order needs a result before the work that produces it.',
  provenance='LEGACY_KEEP', source='391875')

# =========================================================================
# HCW_FAM02_HW_SW_CLASSIFICATION — D1 x3 (2 legacy)   (boundary case in every variant)
# =========================================================================
q('GB_HCW_006', 'HCW_FAM02_HW_SW_CLASSIFICATION', 'D1',
  'Which of these is hardware?',
  'A hard disk',
  ['A printer driver', 'An operating system', 'A spreadsheet application'],
  'A hard disk is a physical object; the other three are all instructions. A driver is the '
  'confusing case, because it exists to operate a physical device and is itself software.',
  provenance='LEGACY_REWRITE', source='39b6ac')

q('GB_HCW_007', 'HCW_FAM02_HW_SW_CLASSIFICATION', 'D1',
  'Which of these is software?',
  'The operating system',
  ['The processor', 'The memory modules', 'The motherboard'],
  'An operating system is a set of instructions, however much it feels like part of the machine '
  'because it arrives with it. The other three are physical components.',
  provenance='LEGACY_REWRITE', source='3ed5c2')

q('GB_HCW_008', 'HCW_FAM02_HW_SW_CLASSIFICATION', 'D1',
  'A printer driver is best described as which of these?',
  'Software, because it is a set of instructions, even though its job is to operate hardware',
  ['Hardware, because it is part of the printer',
   'Hardware, because it is installed with the printer',
   'Neither, because it sits between the two'],
  'What decides the classification is whether something is physical or is instructions, not what '
  'it works on or where it came from. A driver operates a device and is itself entirely made of '
  'instructions.')

# =========================================================================
# HCW_FAM03_PROGRAM_NATURE — D2, D3
# =========================================================================
q('GB_HCW_009', 'HCW_FAM03_PROGRAM_NATURE', 'D2',
  'A program is written to add two numbers. Someone gives it a word instead of a number. What '
  'does it do?',
  'Whatever its instructions say for that case, and if they say nothing it fails',
  ['Works out that a number was meant and asks again',
   'Ignores the word and adds nothing',
   'Corrects the word to the nearest number'],
  'A program does exactly what it was told and nothing else; behaviour nobody wrote does not '
  'happen. Expecting it to infer what was meant is the belief that makes later debugging '
  'bewildering.')

q('GB_HCW_010', 'HCW_FAM03_PROGRAM_NATURE', 'D3',
  'A program handles every case its author thought of and behaves strangely on one they did not. '
  'What does that tell you about programs in general?',
  'A program contains only the cases someone wrote; an unconsidered case has no defined behaviour',
  ['The program has learned a behaviour of its own',
   'The machine substituted a reasonable default',
   'The program is faulty in a way unrelated to its instructions'],
  'There is no part of a program that was not written, so a case nobody handled falls through to '
  'whatever the surrounding instructions happen to do. That is why an unexpected input produces '
  'strange behaviour rather than a sensible one.')

# =========================================================================
# HCW_FAM04_PROGRAM_PROCESS_DISTINCTION — D2, D3, D4
# =========================================================================
q('GB_HCW_011', 'HCW_FAM04_PROGRAM_PROCESS_DISTINCTION', 'D2',
  'An application is closed. What is left on the machine?',
  'The application\'s files on storage, unchanged; what it held in working memory is gone',
  ['Nothing; closing an application removes it from the machine',
   'Everything, including what it held in working memory',
   'Only the documents it created, not the application itself'],
  'The files on storage are what was installed and they are untouched by closing. What ends is '
  'the running copy, along with whatever it was holding in memory at the time.')

q('GB_HCW_012', 'HCW_FAM04_PROGRAM_PROCESS_DISTINCTION', 'D3',
  'The same application is started twice, so two windows are open. What exists on the machine?',
  'One copy on storage, and two running copies each with its own working memory',
  ['One copy on storage and one running copy, shown in two windows',
   'Two copies on storage and two running copies',
   'One copy on storage and two running copies sharing one block of memory'],
  'Starting a program does not duplicate it on disk; it creates another running copy from the '
  'same stored one. Each running copy gets its own working memory, which is why one can be busy '
  'while the other is idle.')

q('GB_HCW_013', 'HCW_FAM04_PROGRAM_PROCESS_DISTINCTION', 'D4',
  'A machine is restarted. Afterwards the application is still installed but everything it had '
  'been showing is gone. The application was never uninstalled and its files were not deleted. '
  'What accounts for both facts?',
  'The stored files survived the restart; the running copy and its working memory did not',
  ['The application was reinstalled automatically during the restart',
   'The restart cleared the storage and the application was restored from a backup',
   'The application saved its state and then deleted it'],
  'Two things have to be explained at once: something survived and something did not, and the '
  'split falls exactly between storage and working memory. Nothing reinstalled or restored '
  'anything — the files were never gone.',
  evidence='The application was never uninstalled and its files were not deleted')

# =========================================================================
# HCW_FAM05_WORKING_MEMORY_EFFECT — D2 (legacy), D3 (legacy)
# =========================================================================
q('GB_HCW_014', 'HCW_FAM05_WORKING_MEMORY_EFFECT', 'D2',
  'Three programs are open and one of them is closed. What happens to the machine\'s available '
  'working memory?',
  'It increases, because the memory that program was using is released',
  ['It stays the same, because memory is consumed permanently once used',
   'It increases, but the space freed is on the disk rather than in memory',
   'It stays the same, because each machine uses a fixed amount of memory whatever runs'],
  'Working memory is lent to a running program and taken back when it ends. Nothing is consumed '
  'permanently, and the space released is memory rather than storage.',
  provenance='LEGACY_REWRITE', source='39e40a')

q('GB_HCW_015', 'HCW_FAM05_WORKING_MEMORY_EFFECT', 'D3',
  'A student opens many applications and the machine becomes slow. Which resource is most likely '
  'under pressure?',
  'Working memory',
  ['The keyboard', 'The printer', 'The webcam'],
  'Each open application holds working memory, and once there is not enough the machine spends '
  'its time moving data in and out of storage. Nothing about opening applications loads the '
  'peripherals.',
  provenance='LEGACY_KEEP', source='38a79c')

# =========================================================================
# HCW_FAM06_DIGITAL_REPRESENTATION_RECOGNITION — D1 x3
# =========================================================================
q('GB_HCW_016', 'HCW_FAM06_DIGITAL_REPRESENTATION_RECOGNITION', 'D1',
  'How is a photograph stored on a computer?',
  'As numbers describing the picture',
  ['As a very small physical picture',
   'As a description in words of what the picture shows',
   'Photographs cannot be stored; only their file names can'],
  'Everything a computer holds is held as numbers, whatever it looks like when shown. The image '
  'a person sees is produced from those numbers when it is displayed.')

q('GB_HCW_017', 'HCW_FAM06_DIGITAL_REPRESENTATION_RECOGNITION', 'D1',
  'Text, images and sound are stored on a computer in what form?',
  'All three as numbers',
  ['Text as letters, images as pictures, sound as waves',
   'Text as numbers, and images and sound in their own separate forms',
   'Only text as numbers; the rest are stored as files'],
  'A single kind of storage holds all of them, which is why one file can contain several and why '
  'any of them can be copied by the same mechanism. What differs is how the numbers are '
  'interpreted.')

q('GB_HCW_018', 'HCW_FAM06_DIGITAL_REPRESENTATION_RECOGNITION', 'D1',
  'Two files hold the same numbers but are opened by different programs, and one shows an image '
  'while the other produces noise. How is that possible?',
  'The numbers carry no meaning of their own; the program decides how to interpret them',
  ['One of the two programs is faulty',
   'The files must actually hold different numbers',
   'The numbers change when a different program opens them'],
  'Storage holds numbers and nothing more, so what those numbers represent is a matter of how '
  'they are read. This is exactly why opening a file with the wrong program produces nonsense '
  'rather than an error.')

# =========================================================================
# HCW_FAM07_PERSISTENCE_REASONING — D2 (legacy), D3 (legacy)
# =========================================================================
q('GB_HCW_019', 'HCW_FAM07_PERSISTENCE_REASONING', 'D2',
  'Which of these normally keeps its contents after the power is switched off?',
  'A solid-state drive',
  ['Working memory', 'The processor cache', 'A processor register'],
  'Storage is designed to hold data without power; the other three hold what is needed while the '
  'machine is running and lose it when it stops. That is the whole reason saving exists.',
  provenance='LEGACY_KEEP', source='3945d3')

q('GB_HCW_020', 'HCW_FAM07_PERSISTENCE_REASONING', 'D3',
  'A document was saved an hour ago and has been edited since without being saved again. The '
  'machine loses power. What is on the disk afterwards?',
  'The version saved an hour ago; the later edits are gone',
  ['The document with all the edits, saved automatically at shutdown',
   'Nothing, because the document was open when the power failed',
   'The edits only, since they were the most recent change'],
  'Saving is what puts data on storage, and edits that were never saved existed only in working '
  'memory. The saved version is untouched by the failure, which is why the loss is partial rather '
  'than total.',
  provenance='LEGACY_REWRITE', source='380965')

# =========================================================================
# HCW_FAM08_OS_ROLE_IN_STACK — D2 (legacy), D3, D4
# =========================================================================
q('GB_HCW_021', 'HCW_FAM08_OS_ROLE_IN_STACK', 'D2',
  'Where does an application sit in relation to the operating system and the hardware?',
  'The application asks the operating system, which reaches the hardware',
  ['The application reaches the hardware, and the operating system watches',
   'The hardware calls the application, which reports to the operating system',
   'The application and the hardware deal with each other directly, with no operating system '
   'involved'],
  'The operating system sits in the middle and is asked for everything an application cannot do '
  'itself. Leaving it out of the path is the commonest way the arrangement is misdescribed.',
  provenance='LEGACY_REWRITE', source='c67f3b')

q('GB_HCW_022', 'HCW_FAM08_OS_ROLE_IN_STACK', 'D3',
  'A word processor saves a document. Put the parts in the order the request passes through them.',
  'Word processor, operating system, storage device',
  ['Word processor, storage device, operating system',
   'Operating system, word processor, storage device',
   'Word processor, storage device'],
  'The application makes the request, the operating system carries it out, and the device does '
  'what it is told. Each other order either reverses two neighbours or removes the layer that '
  'makes the request possible.')

q('GB_HCW_023', 'HCW_FAM08_OS_ROLE_IN_STACK', 'D4',
  'The same word processor saves documents to a hard disk on one machine and to a network location '
  'on another, and the application was not changed between them. What does that show about the '
  'arrangement?',
  'The application asks for a save and the operating system decides how to carry it out, so the '
  'difference never reaches the application',
  ['The application contains code for both kinds of destination and chooses between them',
   'The two machines run different versions of the application',
   'A network location is treated as a hard disk by the hardware itself'],
  'An unchanged application producing correct behaviour on two very different destinations means '
  'the difference is handled below it. If the application drove the hardware itself, it would '
  'need to know which kind it was talking to.',
  evidence='the application was not changed between them')

# =========================================================================
# HCW_FAM09_APP_VS_OS_SELECTION — D2 (legacy), D3
# =========================================================================
q('GB_HCW_024', 'HCW_FAM09_APP_VS_OS_SELECTION', 'D2',
  'Which responsibility belongs to the operating system rather than to an application?',
  'Deciding how much working memory each running program may use',
  ['Checking the spelling in a document',
   'Drawing a chart from a table of figures',
   'Deciding what a document should say'],
  'Sharing the machine among every program is the operating system\'s job, and no single '
  'application could do it without affecting the others. The other three are jobs one application '
  'does for one person.',
  provenance='LEGACY_REWRITE', source='3e378b')

q('GB_HCW_025', 'HCW_FAM09_APP_VS_OS_SELECTION', 'D3',
  'A file manager ships with the operating system and lets a person copy files. Is copying files '
  'the operating system\'s job or the file manager\'s?',
  'The file manager asks; the operating system performs the copy',
  ['The file manager performs the copy itself, since it ships with the system',
   'The operating system performs the copy, and the file manager is part of it',
   'Neither; the storage device performs the copy on its own'],
  'Arriving with the system does not make a program part of it. The file manager is an '
  'application that presents the request, and the work of reading and writing belongs to the '
  'layer below.')

# =========================================================================
# HCW_FAM10_BOOT_ORDERING — D2, D3
# =========================================================================
q('GB_HCW_026', 'HCW_FAM10_BOOT_ORDERING', 'D2',
  'Put the stages of starting a machine in order.',
  'Firmware checks the hardware, the operating system loads, applications can start',
  ['The operating system loads, firmware checks the hardware, applications can start',
   'Applications start, the operating system loads, firmware checks the hardware',
   'The desktop appears, the operating system loads behind it, applications can start'],
  'Nothing can run until the hardware has been checked and the operating system is in charge. The '
  'last option describes what a person sees rather than what happens, which is why it is '
  'believed.')

q('GB_HCW_027', 'HCW_FAM10_BOOT_ORDERING', 'D3',
  'A machine has been switched on and the firmware checks have completed, but the operating '
  'system has not finished loading. What cannot have happened yet?',
  'No application can have started',
  ['No hardware can have been powered',
   'No data can have been read from storage',
   'Nothing at all can have happened'],
  'Applications depend on the operating system for everything, so none can run before it is '
  'ready. The hardware is already powered and storage has already been read — that is how the '
  'operating system is being loaded.')

# =========================================================================
# HCW_FAM11_NETWORK_SCOPE — D2 (legacy), D3
# =========================================================================
q('GB_HCW_028', 'HCW_FAM11_NETWORK_SCOPE', 'D2',
  'Which statement about the internet and the web is correct?',
  'The web is one service that runs on the internet',
  ['The internet and the web are two names for the same thing',
   'The internet is one service that runs on the web',
   'The web is the collection of cables and the internet is the pages carried over them'],
  'The internet is the network that connects machines; the web is one of the things carried over '
  'it, alongside email and much else. Treating the two as identical is close to universal and is '
  'why the distinction is worth measuring directly.',
  provenance='LEGACY_REWRITE', source='e456e9')

q('GB_HCW_029', 'HCW_FAM11_NETWORK_SCOPE', 'D3',
  'Two machines in one office are connected so they can share files, with no connection to '
  'anything outside. Is that a network?',
  'Yes; a network is machines connected so they can exchange data, whatever its size',
  ['No; a network must be connected to the internet',
   'No; two machines are too few to form a network',
   'Yes, but only while files are actually being transferred'],
  'What makes something a network is the connection and the exchange, not the scale or whether '
  'the outside world is reachable. The internet is a very large network of networks, which makes '
  'it an example rather than a requirement.')

# =========================================================================
# HCW_FAM12_CLIENT_SERVER_ROLES — D2 (legacy), D4 x2
# =========================================================================
q('GB_HCW_030', 'HCW_FAM12_CLIENT_SERVER_ROLES', 'D2',
  'A browser requests a page and a remote machine sends it back. Which side is the client?',
  'The browser, because it made the request',
  ['The remote machine, because it holds the page',
   'The browser, because it is running on the smaller machine',
   'Neither; both are servers of the page'],
  'The roles are defined by who asks and who answers in a particular exchange. Size and which '
  'side owns the data are irrelevant to which is which.',
  provenance='LEGACY_REWRITE', source='e31a7b')

q('GB_HCW_031', 'HCW_FAM12_CLIENT_SERVER_ROLES', 'D4',
  'A machine answers requests for pages, and while doing so it requests records from a database '
  'on another machine. It is one machine taking part in two exchanges. What are its roles?',
  'Server in the first exchange and client in the second',
  ['Server in both, because it is a server machine',
   'Client in both, because it is making a request',
   'Neither, because a machine cannot hold two roles'],
  'Role belongs to an exchange rather than to hardware, so one machine can be answering in one '
  'conversation and asking in another at the same moment. A model that fixes the role to the '
  'machine cannot describe this at all.',
  evidence='It is one machine taking part in two exchanges')

q('GB_HCW_032', 'HCW_FAM12_CLIENT_SERVER_ROLES', 'D4',
  'A laptop shares a folder so that a large office machine can read files from it. The office '
  'machine is far more powerful and is the one usually called a server. Which is the client here?',
  'The office machine, because in this exchange it is the one making the request',
  ['The laptop, because it is the smaller machine',
   'The office machine, because it is normally a server',
   'Neither; the roles cannot be assigned when a laptop shares files'],
  'The request decides it, and here the powerful machine is the one asking. Assigning the role by '
  'size or by habit gives the wrong answer, which is exactly what this arrangement is chosen to '
  'expose.',
  evidence='The office machine is far more powerful and is the one usually called a server')

# =========================================================================
# HCW_FAM13_ABSTRACTION_RECOGNITION — D3, D4 x2, D5 x3
# =========================================================================
q('GB_HCW_033', 'HCW_FAM13_ABSTRACTION_RECOGNITION', 'D3',
  'A program saves a file without containing any instructions about what kind of disk it is being '
  'saved to. What detail is being hidden from it, and by what?',
  'How this particular device stores data, hidden by the operating system and the device driver',
  ['Nothing is hidden; every disk works identically',
   'The file\'s contents, hidden by the operating system',
   'The name of the file, hidden until the save completes'],
  'Devices differ considerably and the program is written as though they did not, which is only '
  'possible because a layer below it absorbs the difference. What is hidden is the mechanism, not '
  'the data.')

q('GB_HCW_034', 'HCW_FAM13_ABSTRACTION_RECOGNITION', 'D4',
  'A team argues that hiding hardware detail from applications must lose capability, since less '
  'information is available. Applications on the system can still reach the lower detail when '
  'they ask for it explicitly. What does that show?',
  'The detail is hidden by default rather than made unavailable, so nothing is lost',
  ['The team is right, and the capability is genuinely lost',
   'The applications reaching the detail are breaking the arrangement',
   'The detail is only reachable because the system is badly built'],
  'Hiding and removing are different things: the ordinary path does not require the detail, and a '
  'program that genuinely needs it can still ask. The argument assumes the two are the same.',
  evidence='Applications on the system can still reach the lower detail when they ask for it '
           'explicitly')

q('GB_HCW_035', 'HCW_FAM13_ABSTRACTION_RECOGNITION', 'D4',
  'A new kind of storage device is released. Existing applications save to it correctly without '
  'being modified. Only a driver was written for it. What does that demonstrate?',
  'The applications were written against what the layer below promises, not against any particular '
  'device',
  ['The new device was designed to imitate an older one exactly',
   'The applications were updated automatically when the driver was installed',
   'Storage devices have all worked the same way for a long time'],
  'Thousands of unchanged applications working with something that did not exist when they were '
  'written is only possible if none of them referred to a device directly. The single new driver '
  'is where the difference was absorbed.',
  evidence='Only a driver was written for it')

q('GB_HCW_036', 'HCW_FAM13_ABSTRACTION_RECOGNITION', 'D5',
  'What would change if every application had to know the make and model of the disk it wrote to?',
  'Every application would need updating for every new device, and a new device would be unusable '
  'until they were',
  ['Applications would run faster, since a layer would be removed',
   'Nothing much; applications could simply ask the user which device it is',
   'Only the operating system would need to change'],
  'Removing the hidden layer moves its work into every program above it, so the cost is paid once '
  'per application rather than once per device. Asking the user does not help, because the '
  'application would still need the instructions for each kind.',
  mode='TRANSFER', hinge='if every application had to know the make and model of the disk')

q('GB_HCW_037', 'HCW_FAM13_ABSTRACTION_RECOGNITION', 'D5',
  'A layer that hides detail also costs something. What is the trade, and when is paying it not '
  'worth it?',
  'It costs some speed and some control at every crossing; it is not worth it where a program '
  'genuinely needs the detail the layer removes',
  ['It costs nothing; hiding detail is always the better choice',
   'It costs storage, and is not worth it on small machines',
   'It costs correctness, since hidden detail cannot be checked'],
  'Every request that crosses a boundary does a little more work and gives up some direct control, '
  'which almost every program is glad to trade away. The exception is code whose whole purpose is '
  'the detail — which is why drivers exist below the boundary rather than above it.',
  mode='TRADEOFF', hinge='A layer that hides detail also costs something')

q('GB_HCW_038', 'HCW_FAM13_ABSTRACTION_RECOGNITION', 'D5',
  'A person uses a phone app to send a message and knows nothing about how it travels. Is that the '
  'same kind of hiding as an application not knowing what disk it writes to?',
  'Yes; in both cases a layer promises an outcome and absorbs the mechanism, and in both the '
  'detail exists and can be examined',
  ['No; the person simply has not learned it, whereas the application genuinely cannot know',
   'No; hiding from a person is convenience, and hiding from a program is a technical limit',
   'Yes, but only because messages and files are both stored as numbers'],
  'The pattern is the same at every level: something above relies on a promise and does not '
  'restate the mechanism. Whether the thing above is a person or a program changes who benefits, '
  'not what is happening.',
  mode='TRANSFER', hinge='Is that the same kind of hiding as an application not knowing what disk '
                         'it writes to')

# =========================================================================
# HCW_FAM14_MODEL_DIAGNOSIS — D3, D4 x2, D5 x3
# =========================================================================
q('GB_HCW_039', 'HCW_FAM14_MODEL_DIAGNOSIS', 'D3',
  'Someone explains: "You type a letter, the keyboard sends it to the processor, the processor '
  'works out what you meant to type, and the letter appears on screen." Which step is wrong?',
  'The processor working out what was meant',
  ['The keyboard sending the letter',
   'The processor being involved at all',
   'The letter appearing on screen'],
  'Nothing in the machine infers intention; it carries out instructions about the character it '
  'was given. The other three steps are accurate descriptions of what happens.')

q('GB_HCW_040', 'HCW_FAM14_MODEL_DIAGNOSIS', 'D4',
  'Someone explains: "When you save, the application writes the bytes onto the disk itself, the '
  'operating system records the file name, and the disk keeps the data after shutdown." Two of '
  'those three steps are correct. Which is wrong?',
  'The application writing the bytes onto the disk itself',
  ['The operating system recording the file name',
   'The disk keeping the data after shutdown',
   'None; all three are correct'],
  'Applications do not reach hardware; they ask the operating system, which does both the '
  'recording and the writing. The other two steps describe what genuinely happens, which is what '
  'makes locating the single wrong one the work.',
  evidence='Two of those three steps are correct')

q('GB_HCW_041', 'HCW_FAM14_MODEL_DIAGNOSIS', 'D4',
  'Someone explains: "Closing a program frees its memory, deletes its temporary files, and removes '
  'the program from the disk so it must be reinstalled." Each step is something that could be '
  'made to happen; only one happens automatically on closing. Which two are wrong?',
  'Deleting temporary files and removing the program from the disk',
  ['Freeing memory and deleting temporary files',
   'Freeing memory and removing the program from the disk',
   'None; all three happen'],
  'Releasing memory is automatic; tidying temporary files is something a program may choose to do '
  'and often does not; and nothing about closing uninstalls anything. The three are separated by '
  'who does them and when, not by whether they are possible.',
  evidence='only one happens automatically on closing')

q('GB_HCW_042', 'HCW_FAM14_MODEL_DIAGNOSIS', 'D5',
  'Someone explains: "A file is stored as a picture on the disk, the operating system finds it by '
  'name, and the application displays it." Which step is wrong, and what does believing it lead to '
  'later?',
  'The storage step; believing a file holds its appearance makes file formats and conversion '
  'impossible to understand',
  ['The finding step; believing it makes folders impossible to understand',
   'The display step; believing it makes screens impossible to understand',
   'None is wrong, so nothing follows'],
  'Storage holds numbers, and the picture is produced from them when displayed. A student who '
  'thinks the appearance is what is stored has no way to make sense of two formats holding the '
  'same image, or of a conversion that changes the numbers and not the picture.',
  mode='TRANSFER', hinge='what does believing it lead to later')

q('GB_HCW_043', 'HCW_FAM14_MODEL_DIAGNOSIS', 'D5',
  'Someone explains: "The machine is slow because the disk is full, so there is nowhere for the '
  'programs to run." Which part of the model is confused?',
  'Programs run in working memory, not on the disk; a full disk and a memory shortage are '
  'different problems',
  ['Nothing; a full disk does slow a machine',
   'Disks do not become full; only memory does',
   'Programs do run on the disk, so the explanation is right'],
  'The conclusion may even be true — a full disk can slow a machine, because there is no room for '
  'the overflow that a memory shortage relies on. What is wrong is the reason given, which places '
  'running programs on the disk.',
  mode='TRANSFER', hinge='so there is nowhere for the programs to run')

q('GB_HCW_044', 'HCW_FAM14_MODEL_DIAGNOSIS', 'D5',
  'Two explanations of the same behaviour both reach the correct conclusion, and one of them rests '
  'on a wrong model. Why does it matter which one a student holds?',
  'A wrong model happens to agree here and will give wrong answers on the next case, which nobody '
  'will know to check',
  ['It does not matter, since both reach the right conclusion',
   'It matters only if the student has to explain the reasoning aloud',
   'The wrong model is safer, since it is simpler'],
  'Models are used again, and one that agrees by coincidence on a familiar case has no reason to '
  'agree on an unfamiliar one. The danger is that the earlier success is taken as evidence the '
  'model works.',
  mode='TRANSFER', hinge='one of them rests on a wrong model')

# =========================================================================
# HCW_FAM15_LAYER_OWNERSHIP_TRANSFER — D4, D5 x2
# =========================================================================
q('GB_HCW_045', 'HCW_FAM15_LAYER_OWNERSHIP_TRANSFER', 'D4',
  'A machine must limit how much of the network any single program may use. Every application '
  'could technically measure its own usage. Where does the capability belong?',
  'The operating system, since only it can see every program and enforce a limit across them',
  ['Each application, since each knows best what it needs',
   'Each application, since it is simpler to implement there',
   'The network hardware, since the limit concerns the network'],
  'That every application could do it is exactly what makes the question worth asking. A limit '
  'across programs cannot be enforced by any one of them — a program that declined to measure '
  'itself would be unaffected — so it belongs where every program is visible.',
  evidence='Every application could technically measure its own usage')

q('GB_HCW_046', 'HCW_FAM15_LAYER_OWNERSHIP_TRANSFER', 'D5',
  'A machine should run a backup at 2 am whether or not anyone is logged in. Should that belong to '
  'an application or to the operating system?',
  'The operating system, since running something at a time with nobody present is a service every '
  'application would otherwise reimplement',
  ['An application, since backing up is a particular job for a person',
   'An application, since only it knows what to back up',
   'Neither; a task with nobody present cannot be run'],
  'Two things are being placed, not one: what to copy is a job for an application, and running '
  'something at a time regardless of who is present is a general service. Splitting them is the '
  'reasoning, and it puts the scheduling below and the backup above.',
  mode='TRANSFER', hinge='whether or not anyone is logged in')

q('GB_HCW_047', 'HCW_FAM15_LAYER_OWNERSHIP_TRANSFER', 'D5',
  'A capability could be placed in the operating system, where every application gets it, or in a '
  'library each application chooses to use. What does each placement cost?',
  'In the system it is available everywhere and hard to change; in a library it is easy to change '
  'and each application must adopt it',
  ['In the system it costs nothing; a library is always the worse choice',
   'In a library it costs nothing; the system is always the worse choice',
   'They are equivalent, since the same code runs either way'],
  'Placing something low makes it universal and slow to change, because everything above depends '
  'on it. Placing it in a library keeps it changeable at the price of applications that never '
  'adopt it — which is why the choice depends on how settled the capability is.',
  mode='TRADEOFF', hinge='or in a library each application chooses to use')

# =========================================================================
# HCW_FAM16_STACK_TRACE_TRANSFER — D4, D5 x2
# =========================================================================
q('GB_HCW_048', 'HCW_FAM16_STACK_TRACE_TRANSFER', 'D4',
  'A messaging application captures a photograph using the camera. Every route offered below is a '
  'coherent description of some arrangement. Which one describes what actually happens?',
  'Application, operating system, camera driver, camera',
  ['Application, camera driver, operating system, camera',
   'Application, camera',
   'Operating system, application, camera driver, camera'],
  'The request starts in the application, is passed to the operating system, and reaches the '
  'device through its driver. The second route reverses two neighbours, the third omits both '
  'middle layers, and the fourth has the operating system originating a request nobody made.',
  evidence='Every route offered below is a coherent description of some arrangement')

q('GB_HCW_049', 'HCW_FAM16_STACK_TRACE_TRANSFER', 'D5',
  'An application sends data over a network, a device it has never been shown. By the same '
  'reasoning used for saving a file, what path does the request take?',
  'Application, operating system, network driver, network hardware',
  ['Application, network hardware',
   'Application, network driver, network hardware',
   'Network hardware, operating system, application'],
  'The arrangement does not change with the device: the application asks, the operating system '
  'carries out, the driver knows the specifics. Reaching the driver without passing through the '
  'operating system would let an application address hardware directly, which is exactly what the '
  'arrangement prevents.',
  mode='TRANSFER', hinge='a device it has never been shown')

q('GB_HCW_050', 'HCW_FAM16_STACK_TRACE_TRANSFER', 'D5',
  'A new device is invented that fits none of the existing categories. Predict what has to be '
  'written for applications to use it, and what does not.',
  'A driver has to be written; the operating system and the applications above it do not have to '
  'change',
  ['Every application has to be updated to recognise the device',
   'The operating system has to be rewritten to include the new category',
   'Nothing; a new device is usable as soon as it is connected'],
  'The pattern generalises because the layers were arranged to make it generalise: the piece that '
  'knows a device is the driver, and everything above it was written against a promise rather '
  'than a device. A device with no driver is simply not usable, so something does have to be '
  'written.',
  mode='TRANSFER', hinge='A new device is invented that fits none of the existing categories')
