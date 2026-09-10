# -*- coding: utf-8 -*-
"""
Wave 7 — OS_MEMORY, 50 Golden Bank questions, all newly authored.

THE BANKED OPERATING SYSTEMS SKILL ASSERTS THAT PROCESSES ARE ISOLATED. This skill explains why,
and then asks the questions that follow from it. The addresses a program sees are its own, which
is what makes two programs holding the same address a non-event; sharing therefore has to be
arranged rather than avoided; and a program that runs out of memory does not first receive a clear
message.

LIFETIME RATHER THAN SIZE IS THE RULE, AND SIZE IS WHAT STUDENTS REACH FOR. Which region a value
lives in is decided by how long it must last, not by how big it is. Several families offer size as
the criterion because that is the wrong answer everyone gives.

WHETHER THE LANGUAGE RECLAIMS MEMORY AUTOMATICALLY IS STATED IN EVERY STEM WHERE IT MATTERS. The
right answer differs between a language that reclaims and one that does not, so a stem that leaves
it unsaid has two defensible keys and measures nothing.

THE GROWTH FAMILY CONTAINS A PATTERN THAT IS NOT A FAULT. Memory that rises and then levels off is
a cache filling, and diagnosing it as a leak is how teams spend a week on nothing. A family where
every growth pattern is a leak teaches alarm rather than diagnosis.

DEEP RECURSION IS SEPARATED FROM EVERY OTHER MEMORY FAULT BY ONE OBSERVATION: it fails fast on a
tiny input. Every stem in that family states the input is small, because that is what rules out
the machine simply being short of memory.
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
# OM_FAM01_MEMORY_VS_STORAGE — D1 x4, D2 x1
# =========================================================================
q('GB_OM_001', 'OM_FAM01_MEMORY_VS_STORAGE', 'D1',
  'A variable holding a running total is in use while a program runs. Where does it live?',
  'In working memory, and it is lost when the program ends',
  ['On disk, since the program was loaded from disk',
   'On disk, because totals are important',
   'In both places at once'],
  'A value a program is using sits in working memory. Nothing puts it on disk unless the program '
  'deliberately writes it there.')

q('GB_OM_002', 'OM_FAM01_MEMORY_VS_STORAGE', 'D1',
  'A machine loses power while a program is running. What is lost?',
  'Whatever was only in working memory',
  ['Everything, including files already saved',
   'Nothing, since the machine will restore its state',
   'Only the program itself'],
  'Working memory does not survive without power and storage does. Files already written are '
  'unaffected.')

q('GB_OM_003', 'OM_FAM01_MEMORY_VS_STORAGE', 'D1',
  'A document is opened in an editor and changed but not saved. Where do the changes exist?',
  'In working memory only',
  ['In storage, since the file was opened from there',
   'In both, since editors save continuously',
   'Nowhere until the editor is closed'],
  'The unsaved changes have not reached the file. Saving is what copies them from working memory '
  'into storage.')

q('GB_OM_004', 'OM_FAM01_MEMORY_VS_STORAGE', 'D1',
  'Why is working memory used at all, when storage is much larger?',
  'Because it is far quicker to reach, which is what a running program needs',
  ['Because storage cannot hold running programs',
   'Because working memory is more reliable',
   'Because storage is only used for backups'],
  'Speed is the whole reason for the arrangement. Storage could hold everything and would be far '
  'too slow to work from directly.')

q('GB_OM_005', 'OM_FAM01_MEMORY_VS_STORAGE', 'D2',
  'A student says a file of two gigabytes cannot be processed on a machine with one gigabyte of '
  'working memory. What is wrong with the claim?',
  'The file can be processed a piece at a time, so the whole of it need never be in memory at '
  'once',
  ['Nothing; the file will not fit and cannot be processed',
   'The file can be processed because memory expands as needed',
   'The claim is right unless the file is compressed'],
  'Only what is held simultaneously has to fit. Reading a line, dealing with it and moving on '
  'keeps the requirement tiny however large the file is.')

# =========================================================================
# OM_FAM02_REGION_RECOGNITION — D1 x3, D2 x1
# =========================================================================
q('GB_OM_006', 'OM_FAM02_REGION_RECOGNITION', 'D1',
  'A value is needed only while one function call is in progress. Which region suits it?',
  'The region tied to the call, released when the call returns',
  ['The region for values outliving the call',
   'Storage, since the value is temporary',
   'Either; the choice makes no difference'],
  'Lifetime is what decides. A value needed only for the duration of a call belongs where it is '
  'released automatically at the end of it.')

q('GB_OM_007', 'OM_FAM02_REGION_RECOGNITION', 'D1',
  'A value must still exist after the call that created it has returned. Which region suits it?',
  'The region for values whose lifetime is not tied to a call',
  ['The region tied to the call',
   'Storage, since it must survive',
   'Either; the value survives regardless'],
  'The call-tied region is released when the call ends, which would take the value with it. '
  'Outliving a call means living somewhere the call does not control.')

q('GB_OM_008', 'OM_FAM02_REGION_RECOGNITION', 'D1',
  'What decides which of the two regions a value belongs in?',
  'How long it must last',
  ['How large it is', 'What type it has', 'How often it is used'],
  'Lifetime is the criterion. A small value that must outlive its call belongs in the '
  'longer-lived region, and a large one that need not can sit in the call-tied one.')

q('GB_OM_009', 'OM_FAM02_REGION_RECOGNITION', 'D2',
  'A student says large values always belong in the longer-lived region and small ones in the '
  'call-tied region. What is wrong with the rule?',
  'It uses size where lifetime is what matters, so it gets small long-lived values wrong',
  ['Nothing; size is the correct criterion',
   'It is right except for values of exactly one byte',
   'It is right for numbers and wrong for text'],
  'The rule happens to work often, because large things are frequently long-lived. It fails '
  'exactly where the two criteria disagree, and those are the cases that cause faults.')

# =========================================================================
# OM_FAM03_ADDRESS_MEANING — D1 x3, D2 x1
# =========================================================================
q('GB_OM_010', 'OM_FAM03_ADDRESS_MEANING', 'D1',
  'Two programs are running, and each holds a value at what it reports as the same address. Are '
  'they referring to the same memory?',
  'No; each program has its own addresses',
  ['Yes, since the addresses are identical',
   'Yes, if the two programs were started together',
   'It cannot be determined'],
  'The addresses a program sees are its own, and identical numbers in two programs point at '
  'different physical memory. This is what makes isolation possible rather than magical.')

q('GB_OM_011', 'OM_FAM03_ADDRESS_MEANING', 'D1',
  'A program prints an address and a developer wants to inspect that location from another '
  'program. What is the difficulty?',
  'The address means something only within the program that printed it',
  ['Addresses cannot be printed',
   'The address will have changed by the time it is read',
   'There is no difficulty; the address is universal'],
  'Handing the number to another program hands it a number that means something else there. '
  'Inspecting it requires going through the first program.')

q('GB_OM_012', 'OM_FAM03_ADDRESS_MEANING', 'D1',
  'What does a program address actually refer to?',
  'A location within that program own view of memory',
  ['A fixed location in the physical memory chips',
   'A position on disk',
   'A position in the list of running programs'],
  'The program view is translated to physical memory by the system, and the program never sees '
  'the physical location. That translation is what keeps programs apart.')

q('GB_OM_013', 'OM_FAM03_ADDRESS_MEANING', 'D2',
  'A program is run twice and prints a different address for the same variable each time. Is '
  'something wrong?',
  'No; where the program view is placed can differ between runs',
  ['Yes; the same variable should always have the same address',
   'Yes; the program is corrupting its own memory',
   'No, but only because the machine was restarted'],
  'Nothing guarantees the same placement from one run to the next, and some systems deliberately '
  'vary it. An address is meaningful within a run rather than across runs.')

# =========================================================================
# OM_FAM04_LIFETIME_REASONING — D2 x1, D3 x1
# =========================================================================
q('GB_OM_014', 'OM_FAM04_LIFETIME_REASONING', 'D2',
  'A value is placed in the call-tied region during a function call. When is that memory '
  'released?',
  'When the call returns',
  ['When the value is last used',
   'When the program ends',
   'When the memory is needed by something else'],
  'The release happens at the end of the call regardless of whether the value was still wanted. '
  'That automatic release is what the region is for.')

q('GB_OM_015', 'OM_FAM04_LIFETIME_REASONING', 'D3',
  'In a language that does not reclaim memory automatically, a value is obtained in the '
  'longer-lived region and the program stops referring to it. When is that memory released?',
  'Only when the program explicitly releases it',
  ['When the last reference to it disappears',
   'When the enclosing call returns',
   'Immediately, since nothing refers to it'],
  'Without automatic reclamation, no longer referring to memory does not free it. The memory '
  'stays held for as long as the program runs unless it is released deliberately.')

# =========================================================================
# OM_FAM05_CALL_DEPTH_EFFECT — D2 x1, D3 x1
# =========================================================================
q('GB_OM_016', 'OM_FAM05_CALL_DEPTH_EFFECT', 'D2',
  'A function calls a second, which calls a third. While the third is running, how many calls are '
  'holding space?',
  'Three, since all three are still in progress',
  ['One, the innermost', 'One, the outermost', 'None, until they return'],
  'A call that has not returned still holds its own space. All three are in progress at once, so '
  'all three are holding.')

q('GB_OM_017', 'OM_FAM05_CALL_DEPTH_EFFECT', 'D3',
  'A function calls itself a thousand times before any call returns. What does that do to the '
  'call-tied region?',
  'A thousand calls hold space simultaneously, which may exhaust it',
  ['Only one call holds space, since it is the same function',
   'Space is released as each call is entered',
   'Nothing, since the region grows without limit'],
  'Being the same function does not merge the calls; each has its own space. The region is '
  'considerably smaller than memory as a whole, which is why depth exhausts it first.')

# =========================================================================
# OM_FAM06_RELEASE_EFFECT — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_OM_018', 'OM_FAM06_RELEASE_EFFECT', 'D2',
  'In a language that reclaims memory automatically, a program stops referring to a large '
  'structure. What happens to the memory?',
  'It becomes available again once the system notices nothing refers to it',
  ['It stays held until the program ends',
   'It is released the instant the last reference disappears',
   'It must be released explicitly by the program'],
  'Automatic reclamation notices unreachable memory and takes it back, though not necessarily at '
  'the moment the last reference goes. The timing is the system decision rather than the '
  'program.')

q('GB_OM_019', 'OM_FAM06_RELEASE_EFFECT', 'D3',
  'In a language that reclaims automatically, a program keeps every structure it has ever created '
  'in a list it never empties. Is that memory reclaimed?',
  'No; the list still refers to them, so nothing is unreachable',
  ['Yes, since the program has finished using them',
   'Yes, once memory runs short',
   'No, because automatic reclamation does not work on lists'],
  'Reclamation acts on what nothing refers to, and the list refers to everything. This is how a '
  'language that reclaims automatically still runs out of memory.')

q('GB_OM_020', 'OM_FAM06_RELEASE_EFFECT', 'D4',
  'In a language that does not reclaim automatically, a function obtains memory each time it runs '
  'and never releases it. The function is called once per request. The language does not reclaim '
  'automatically and the function releases nothing it obtains. What happens over a day?',
  'Memory held rises with every request and is never given back',
  ['Memory is reclaimed when each call returns',
   'Memory is reclaimed when the request finishes',
   'Nothing; memory obtained once is reused on later calls'],
  'The call returning releases the call-tied region and not memory obtained for an indefinite '
  'lifetime. One request is unnoticeable and a day of requests is not.',
  evidence='The language does not reclaim automatically and the function releases nothing it '
           'obtains')

# =========================================================================
# OM_FAM07_PRESSURE_EFFECT — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_OM_021', 'OM_FAM07_PRESSURE_EFFECT', 'D2',
  'Programs on a machine together want more memory than the machine physically has. What happens?',
  'Some of it is kept in storage and fetched back when needed, which is much slower',
  ['The newest program is refused and stopped',
   'Every program is given an equal share and none exceeds it',
   'The machine stops immediately'],
  'Borrowing space from storage lets the machine keep going and costs a great deal of speed. '
  'Refusal comes later, if at all.')

q('GB_OM_022', 'OM_FAM07_PRESSURE_EFFECT', 'D3',
  'A machine short of memory becomes very slow, and a team checks and finds the processor is '
  'busy. Does that rule out memory as the cause?',
  'No; moving memory to and from storage keeps the processor busy',
  ['Yes; a busy processor means the processor is the bottleneck',
   'Yes; memory problems leave the processor idle',
   'No, but only if the machine has one processor'],
  'The processor being busy is consistent with memory pressure rather than evidence against it. '
  'What it is busy doing is the question worth asking.')

q('GB_OM_023', 'OM_FAM07_PRESSURE_EFFECT', 'D4',
  'A machine becomes slow at everything at once — unrelated programs, the interface, commands '
  'that normally return instantly. Every program on the machine is affected rather than one, and '
  'nothing was deployed. Which cause fits?',
  'Memory pressure, since it degrades everything on the machine rather than one program',
  ['A fault in one program, which is consuming the processor',
   'A slow disk affecting one program',
   'A network problem'],
  'A single program consuming the processor leaves other work slower and not uniformly '
  'unresponsive. Everything degrading together points at a resource everything depends on.',
  evidence='Every program on the machine is affected rather than one')

# =========================================================================
# OM_FAM08_SHARING_REASONING — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_OM_024', 'OM_FAM08_SHARING_REASONING', 'D2',
  'Two separate programs each hold a counter and one increments its own. Does the other see the '
  'change?',
  'No; each has its own memory unless sharing was arranged',
  ['Yes, since both run on the same machine',
   'Yes, if the two counters have the same name',
   'Only after both programs finish'],
  'Separate programs see separate memory by default. Sharing between them is something that has '
  'to be set up deliberately.')

q('GB_OM_025', 'OM_FAM08_SHARING_REASONING', 'D3',
  'A program is started twice, and each run keeps a list. One run adds an item. Does the other '
  'run see it?',
  'No; the two runs are separate and have separate memory',
  ['Yes, since both are running the same program',
   'Yes, since the list has the same name in both',
   'Only if the two were started at the same moment'],
  'Sharing a program does not mean sharing memory. Each run is its own process with its own view '
  'of memory.')

q('GB_OM_026', 'OM_FAM08_SHARING_REASONING', 'D4',
  'A team runs four copies of a service to handle more load, and finds that a value cached by one '
  'copy is not seen by the other three. The four copies are separate programs and no sharing was '
  'arranged between them. Why?',
  'Each copy has its own memory, so a cache in one is invisible to the rest',
  ['The cache is expiring too quickly',
   'The four copies are interfering with one another',
   'The value was never cached at all'],
  'This is the ordinary consequence of running separate copies, and it surprises teams because '
  'the code is identical. A cache shared between them has to live somewhere all four can reach.',
  evidence='The four copies are separate programs and no sharing was arranged between them')

# =========================================================================
# OM_FAM09_FOOTPRINT_REASONING — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_OM_027', 'OM_FAM09_FOOTPRINT_REASONING', 'D2',
  'A program reads a large file one line at a time, dealing with each line and keeping nothing. '
  'What decides how much memory it needs?',
  'The size of the largest single line',
  ['The size of the whole file',
   'The number of lines in the file',
   'The time the program takes to run'],
  'Only one line is held at any moment, so that is what has to fit. The total processed can be '
  'far larger than the memory available.')

q('GB_OM_028', 'OM_FAM09_FOOTPRINT_REASONING', 'D3',
  'A program reads the same large file by loading all of it into a list first. What decides how '
  'much memory it needs now?',
  'The size of the whole file',
  ['The size of the largest single line',
   'The number of lines only',
   'Nothing; the requirement is the same either way'],
  'Holding everything at once means everything has to fit. The two approaches process identical '
  'data and have completely different requirements.')

q('GB_OM_029', 'OM_FAM09_FOOTPRINT_REASONING', 'D4',
  'A program processes ten gigabytes of records and runs comfortably on a machine with two '
  'gigabytes of memory. A colleague says this is impossible. The program holds one record at a '
  'time and discards each before reading the next. Is it possible?',
  'Yes; what must fit is what is held at once rather than what is processed in total',
  ['No; ten gigabytes cannot be processed with two',
   'Yes, but only because the records are compressed',
   'Yes, but only if the machine borrows from storage'],
  'The total processed and the amount held simultaneously are different quantities, and only the '
  'second has to fit. Borrowing from storage is not needed here and would be slow if it were.',
  evidence='The program holds one record at a time and discards each before reading the next')

# =========================================================================
# OM_FAM10_EXHAUSTION_SYMPTOM — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_OM_030', 'OM_FAM10_EXHAUSTION_SYMPTOM', 'D2',
  'A program disappears with no message while doing memory-intensive work. What is one plausible '
  'explanation?',
  'The system stopped it because memory ran out',
  ['The program finished successfully',
   'The program is still running but hidden',
   'The user must have stopped it'],
  'A process stopped from outside because memory ran short leaves no message of its own. The '
  'silence is what makes this hard to recognise.')

q('GB_OM_031', 'OM_FAM10_EXHAUSTION_SYMPTOM', 'D3',
  'A program reports that it could not obtain memory and continues running in a reduced way. What '
  'has happened?',
  'A request for memory was refused, and the program handled the refusal',
  ['The program was stopped by the system and restarted',
   'The machine has no memory left at all',
   'The program is about to be stopped'],
  'A refused request is a different symptom from being stopped, and it is one the program can '
  'respond to. Being stopped from outside gives it no such opportunity.')

q('GB_OM_032', 'OM_FAM10_EXHAUSTION_SYMPTOM', 'D4',
  'A service disappears every few days with no message in its own log, and the machine log '
  'records that the system stopped it. The service own log ends mid-operation and the system log '
  'records the system stopping it. What does this indicate?',
  'The system stopped it from outside, most likely because memory ran short',
  ['The service crashed and failed to log the crash',
   'The service stopped itself deliberately',
   'The machine restarted'],
  'A service that crashed would usually record something, and one stopped from outside cannot. '
  'The two logs together distinguish the cases.',
  evidence='The service own log ends mid-operation and the system log records the system stopping '
           'it')

# =========================================================================
# OM_FAM11_GROWTH_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_OM_033', 'OM_FAM11_GROWTH_DIAGNOSIS', 'D3',
  'A service memory use rises steadily over a week under constant load and never falls. What does '
  'that indicate?',
  'Something is being obtained repeatedly and never released',
  ['Normal behaviour under sustained load',
   'A cache filling up',
   'Increasing traffic'],
  'Load is constant, so rising demand does not explain it. Growth that never levels off is the '
  'signature of memory that is never given back.')

q('GB_OM_034', 'OM_FAM11_GROWTH_DIAGNOSIS', 'D4',
  'A service memory use rises quickly for two hours after each restart and then stays flat for '
  'days. A team plans to spend a week hunting a leak. Memory rises and then levels off rather '
  'than continuing to rise. What does the pattern indicate?',
  'A cache filling to its limit, which is not a leak',
  ['A leak that pauses when the machine is busy',
   'A leak that is being partly reclaimed',
   'Memory pressure from other programs'],
  'A leak does not stop. Levelling off is what a bounded cache does, and the week would have been '
  'spent looking for something that is not there.',
  evidence='Memory rises and then levels off rather than continuing to rise')

# =========================================================================
# OM_FAM12_DEPTH_EXHAUSTION_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_OM_035', 'OM_FAM12_DEPTH_EXHAUSTION_DIAGNOSIS', 'D3',
  'A program fails within a second of starting, on an input of five items, on a machine with '
  'plenty of free memory. It uses a function that calls itself. What is the likely cause?',
  'The function is calling itself without ever stopping, exhausting the call-tied region',
  ['The machine is short of memory',
   'The input is too large',
   'Memory is leaking over time'],
  'Failing at once on five items rules out both a shortage and a leak, since neither would act '
  'that fast on that little. A call chain with no end exhausts a small region very quickly.')

q('GB_OM_036', 'OM_FAM12_DEPTH_EXHAUSTION_DIAGNOSIS', 'D4',
  'A program processing a list of three items fails immediately, while the machine reports '
  'fifteen gigabytes free. A colleague proposes adding memory. The input is three items and '
  'fifteen gigabytes are free, so the machine is not short of memory. What is the fault?',
  'A call chain with no end, which exhausts the small call-tied region regardless of free memory',
  ['A memory leak that has consumed the available memory',
   'The machine is short of memory despite what it reports',
   'The three items are unusually large'],
  'Adding memory would not touch the region that is actually full, which is sized separately and '
  'is far smaller. The failure being instant on three items is what points at depth.',
  evidence='The input is three items and fifteen gigabytes are free')

# =========================================================================
# OM_FAM13_SLOWDOWN_REASONING — D3 x1, D4 x1, D5 x3
# =========================================================================
q('GB_OM_037', 'OM_FAM13_SLOWDOWN_REASONING', 'D3',
  'One program on a machine is slow and everything else is normal. Does memory pressure explain '
  'it?',
  'No; memory pressure would slow the whole machine rather than one program',
  ['Yes; the program must be the one short of memory',
   'Yes; other programs may have enough memory',
   'It cannot be decided'],
  'Borrowing from storage affects everything competing for memory. A single slow program points '
  'somewhere within that program.')

q('GB_OM_038', 'OM_FAM13_SLOWDOWN_REASONING', 'D4',
  'A machine becomes slow at the same time each night. A team suspects memory pressure. Every '
  'program on the machine slows together at that time and a large report job runs then. What '
  'would confirm it?',
  'Checking whether memory in use rises at that time and storage activity rises with it',
  ['Checking whether the report job has grown longer',
   'Checking whether the processor is busy at that time',
   'Restarting the machine before the report job runs'],
  'The processor being busy is consistent with memory pressure and does not confirm it. Memory in '
  'use rising together with storage activity is what distinguishes it from anything else.',
  evidence='Every program on the machine slows together at that time')

q('GB_OM_039', 'OM_FAM13_SLOWDOWN_REASONING', 'D5',
  'A team doubles the memory on a machine that was slow, and it becomes fast. They conclude the '
  'cause was memory pressure. Doubling the memory removed the need to borrow from storage, and '
  'nothing else about the machine changed. Is the conclusion sound?',
  'Yes; the change addressed one thing and the symptom went with it',
  ['No; correlation is not causation and nothing has been shown',
   'No; the machine may have been restarted at the same time',
   'Yes, but only if the load was measured before and after'],
  'A single change followed by the symptom disappearing is genuine evidence, and this is what a '
  'controlled change looks like. Refusing to conclude anything from it is as unreasoning as '
  'concluding without it.',
  mode='EDGE',
  hinge='Doubling the memory removed the need to borrow from storage, and nothing else about the '
        'machine changed')

q('GB_OM_040', 'OM_FAM13_SLOWDOWN_REASONING', 'D5',
  'A service is slow and using far more memory than expected. A team adds memory and it stays '
  'slow, while the memory in use rises to fill the new space as well. Memory in use expands to '
  'fill whatever is provided, which is what a leak does and a genuine requirement does not. What '
  'does that indicate?',
  'Something is holding memory it does not need, so more memory is consumed rather than helping',
  ['The service genuinely needs even more memory',
   'The added memory was not configured correctly',
   'The slowness has a cause unrelated to memory'],
  'A real requirement would have been satisfied and levelled off. Expanding to fill whatever is '
  'available is what unbounded retention does, and adding memory postpones it rather than fixing '
  'it.',
  mode='TRANSFER',
  hinge='Memory in use expands to fill whatever is provided')

q('GB_OM_041', 'OM_FAM13_SLOWDOWN_REASONING', 'D5',
  'A program is slow and a team finds it is using only a small fraction of the available memory. '
  'A colleague concludes memory cannot be involved. The program holds very little at once and '
  'repeatedly reads data that no longer fits in the fastest layers of memory. Is the conclusion '
  'sound?',
  'No; how memory is accessed can matter even when the amount used is small',
  ['Yes; low memory use rules memory out entirely',
   'Yes, unless the machine is also running other programs',
   'No; the program must actually be using more than reported'],
  'Running out is one memory problem and access patterns are another. A program touching a large '
  'range unpredictably is slow while using very little.',
  mode='EDGE',
  hinge='The program holds very little at once and repeatedly reads data that no longer fits in '
        'the fastest layers of memory')

# =========================================================================
# OM_FAM14_ALLOCATION_CHOICE — D4 x1, D5 x4
# =========================================================================
q('GB_OM_042', 'OM_FAM14_ALLOCATION_CHOICE', 'D4',
  'A value is expensive to compute and is needed on every request. The machine has ample free '
  'memory and the value never changes. The value never changes and memory is not constrained. '
  'Should it be held or recomputed?',
  'Held, since it never changes and memory is not the scarce resource here',
  ['Recomputed, since holding values risks running out of memory',
   'Recomputed, since held values become stale',
   'Held, but only for a few minutes at a time'],
  'Both conditions that argue against holding are absent: it cannot go stale and memory is '
  'plentiful. Recomputing would pay the cost on every request for nothing.',
  evidence='The value never changes and memory is not constrained')

q('GB_OM_043', 'OM_FAM14_ALLOCATION_CHOICE', 'D5',
  'A team caches every result the service has ever computed, with no limit. The machine has ample '
  'memory today. A cache with no limit grows with every distinct request and there is no point at '
  'which it stops. What follows?',
  'It will eventually exhaust memory, however much there is, because nothing bounds it',
  ['It is safe while the machine has ample memory',
   'It is safe, since caches are reclaimed automatically',
   'It will level off once the common requests are cached'],
  'Levelling off requires the set of distinct requests to be bounded, which nothing has '
  'established. A limit on size or age is what turns this from a leak into a cache.',
  mode='TRANSFER', hinge='A cache with no limit grows with every distinct request')

q('GB_OM_044', 'OM_FAM14_ALLOCATION_CHOICE', 'D5',
  'A program can hold an entire dataset in memory and answer instantly, or read from storage each '
  'time and answer slowly. The dataset is four gigabytes, the machine has three, and holding it '
  'would force the machine to borrow from storage continuously. Holding four gigabytes on a '
  'three-gigabyte machine means borrowing from storage for every access. What follows?',
  'Holding it would be slower than reading from storage deliberately, since the borrowing happens '
  'anyway and unpredictably',
  ['Holding it is faster, since memory is faster than storage',
   'Holding it is faster, since the system manages the borrowing efficiently',
   'The two approaches perform identically'],
  'The intended benefit disappears once the data does not fit, and the borrowing is less '
  'efficient than reading deliberately would be. Reading a working subset into memory is the '
  'arrangement that gets the benefit.',
  mode='EDGE',
  hinge='Holding four gigabytes on a three-gigabyte machine means borrowing from storage for '
        'every access')

q('GB_OM_045', 'OM_FAM14_ALLOCATION_CHOICE', 'D5',
  'A team must choose between holding a value that becomes stale after a minute, and recomputing '
  'it each time at a cost of fifty milliseconds. Requests arrive a thousand times a second and a '
  'stale value would show a customer an out-of-date balance. A stale balance is shown to a '
  'customer, while recomputing costs fifty milliseconds per request. What should decide?',
  'Whether showing a balance up to a minute out of date is acceptable, since that is the cost of '
  'holding it',
  ['The request rate, since a thousand a second makes recomputing impossible',
   'The recomputation cost, since fifty milliseconds is small',
   'Neither; the value should be held and refreshed every second'],
  'The rate makes holding attractive and does not settle whether staleness is tolerable, which is '
  'a question about what the customer is being shown. Refreshing every second is a reasonable '
  'compromise that the stem gives no grounds to prefer.',
  mode='TRADEOFF', hinge='A stale balance is shown to a customer')

q('GB_OM_046', 'OM_FAM14_ALLOCATION_CHOICE', 'D5',
  'A service holds a large structure for the whole of its run because releasing and rebuilding it '
  'is complicated. It is used for one minute in every hour. The structure occupies memory for '
  'fifty-nine minutes in every hour during which nothing uses it. What is the trade?',
  'Memory held almost all the time against the complexity of building it when needed',
  ['Nothing; holding it is obviously correct',
   'Nothing; rebuilding it is obviously correct',
   'Whether the structure can be made smaller'],
  'Both sides are real: the memory is genuinely wasted and the rebuilding is genuinely '
  'complicated. Which wins depends on whether that memory is needed for anything else.',
  mode='TRADEOFF',
  hinge='The structure occupies memory for fifty-nine minutes in every hour during which nothing '
        'uses it')

# =========================================================================
# OM_FAM15_RESOURCE_MODEL_TRANSFER — D4 x1, D5 x3
# =========================================================================
q('GB_OM_047', 'OM_FAM15_RESOURCE_MODEL_TRANSFER', 'D4',
  'A system provides a pool of twenty connections. Code takes one for each request and returns it '
  'when finished. One path through the code takes a connection and returns early without '
  'returning it. Connections are taken from a fixed pool and this path never returns the one it '
  'took. What happens over time?',
  'The pool empties and later requests wait for a connection that never comes',
  ['Nothing; unreturned connections are reclaimed automatically',
   'The pool grows to meet demand',
   'Only the affected path fails, and other requests are unaffected'],
  'This is a leak in a different resource and behaves exactly the same way. Every request '
  'eventually suffers, not only the ones taking the faulty path.',
  evidence='Connections are taken from a fixed pool and this path never returns the one it took')

q('GB_OM_048', 'OM_FAM15_RESOURCE_MODEL_TRANSFER', 'D5',
  'A program opens files and relies on them being closed when it ends. It runs for months and '
  'opens thousands of files a day. The limit on open files applies while the program runs and the '
  'program does not end for months. What is the difficulty?',
  'The limit is reached long before the program ends, so relying on that cleanup fails',
  ['Nothing; files are always closed when a program ends',
   'The files will be closed automatically when memory runs short',
   'The program will slow down but continue'],
  'Cleanup at exit is real and arrives far too late for a program that does not exit. This is the '
  'same shape as memory obtained and never released.',
  mode='TRANSFER',
  hinge='The limit on open files applies while the program runs and the program does not end for '
        'months')

q('GB_OM_049', 'OM_FAM15_RESOURCE_MODEL_TRANSFER', 'D5',
  'A team is told that a resource is released automatically when the code holding it goes out of '
  'scope. They wrap every use in that construct and one path exits by throwing an error before '
  'reaching it. The construct releases the resource when scope is left, and an error leaves scope '
  'in the same way a normal return does. What happens on that path?',
  'The resource is still released, since leaving scope by an error is still leaving scope',
  ['The resource leaks, since the error skipped the release',
   'The resource leaks, since errors bypass automatic cleanup',
   'The behaviour depends on the type of error'],
  'This is why the construct exists rather than a manual release at the end of a block. The path '
  'that would leak under a manual release is exactly the one it protects.',
  mode='EDGE',
  hinge='an error leaves scope in the same way a normal return does')

q('GB_OM_050', 'OM_FAM15_RESOURCE_MODEL_TRANSFER', 'D5',
  'A team must decide whether to give each request its own connection or share one across all '
  'requests. Connections are limited and a shared one would serialise every request behind a '
  'single point. Connections are a bounded resource and sharing one forces requests to queue. '
  'What follows?',
  'Neither extreme fits; a bounded pool shared among requests is what the constraint implies',
  ['One per request, since that is simplest',
   'One shared, since connections are limited',
   'One per request, with the limit raised as needed'],
  'One per request exhausts the bound and one shared destroys concurrency, and the constraint '
  'rules out both. A pool sized to the bound is the arrangement the two facts point at.',
  mode='TRADEOFF',
  hinge='Connections are a bounded resource and sharing one forces requests to queue')
