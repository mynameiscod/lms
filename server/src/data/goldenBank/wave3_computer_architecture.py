# -*- coding: utf-8 -*-
"""
Wave 3 — COMPUTER_ARCHITECTURE, 50 Golden Bank questions.

4 come from the existing bank (1 kept, 1 rewritten, 2 remapped from HOW_COMPUTERS_WORK) and 46 are
new.

THE BOTTLENECK FAMILY IS DELIBERATELY KEPT APART FROM THE OPERATING_SYSTEMS ONE. Both diagnose a
limiting resource, and the blueprint flags the overlap. These items ask which component to change
and what the change would buy, from hardware symptoms; the operating-system items ask which
resource has been exhausted, from the behaviour of running programs. Different evidence, different
question, and the cross-skill similarity check over the whole bank confirms the two did not
converge.

ONE REWRITE CHANGES WHAT IS MEASURED, NOT JUST HOW. The legacy item asked for binary 1010 in
decimal, which is base conversion; CA_FAM12 measures that one representation underlies every kind
of data and that interpretation supplies the meaning. Conversion arithmetic can be done without
holding that idea at all.
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
# CA_FAM01_CPU_ROLE_SELECT — D1 x4, D2 x1 (legacy)
# =========================================================================
q('GB_CA_001', 'CA_FAM01_CPU_ROLE_SELECT', 'D1',
  'Which of these jobs is done by the processor?',
  'Carrying out the instructions a program contains',
  ['Keeping files so they survive a restart',
   'Deciding which program is allowed to run next',
   'Holding the pictures shown on the screen'],
  'The processor executes instructions; that is what it is for. Keeping files is storage, '
  'deciding what runs next is the operating system\'s decision, and holding an image is memory.')

q('GB_CA_002', 'CA_FAM01_CPU_ROLE_SELECT', 'D1',
  'Is the processor where a computer\'s files are kept?',
  'No; files are kept on storage, and the processor holds almost nothing',
  ['Yes; the processor holds everything the machine has',
   'Yes, but only the files currently open',
   'No; files are kept in the operating system'],
  'The processor works on values handed to it and keeps only a few at a time. Confusing it with '
  'storage makes the rest of the machine\'s arrangement impossible to explain.')

q('GB_CA_003', 'CA_FAM01_CPU_ROLE_SELECT', 'D1',
  'Is the processor hardware or software?',
  'Hardware; it is a physical component',
  ['Software; it is a set of instructions',
   'Software; it is part of the operating system',
   'Neither; it is a way of describing what a machine does'],
  'The processor is a physical part that instructions are given to. Instructions are what run on '
  'it, which is exactly the distinction the question turns on.')

q('GB_CA_004', 'CA_FAM01_CPU_ROLE_SELECT', 'D1',
  'A machine displays an image on screen. Which part of that is the processor\'s job?',
  'Working out the values that describe the image',
  ['Holding the image while it is displayed',
   'Turning the values into light on the panel',
   'Deciding which application may use the screen'],
  'The processor computes; other parts hold the result, display it, and arbitrate access to it. '
  'Attributing everything the machine does to the processor is the error being probed.')

q('GB_CA_005', 'CA_FAM01_CPU_ROLE_SELECT', 'D2',
  'Which component mainly executes program instructions?',
  'The processor',
  ['Working memory', 'The storage drive', 'The keyboard'],
  'Instructions are fetched from memory and carried out by the processor. Memory holds them and '
  'storage keeps them between runs; neither performs them.',
  provenance='LEGACY_REMAP', source='3d6bf6')

# =========================================================================
# CA_FAM02_OPERATION_ROUTING — D2, D3
# =========================================================================
q('GB_CA_006', 'CA_FAM02_OPERATION_ROUTING', 'D2',
  'Two numbers are added together. Which unit performs the addition?',
  'The arithmetic and logic unit',
  ['The control unit', 'Working memory', 'The operating system'],
  'The arithmetic and logic unit is the part built to carry arithmetic out. The control unit '
  'decides what happens next, memory holds the values, and the operating system issues no '
  'arithmetic of its own here.')

q('GB_CA_007', 'CA_FAM02_OPERATION_ROUTING', 'D3',
  'Two values are compared to see which is larger. Which unit performs the comparison?',
  'The arithmetic and logic unit, which handles logic as well as arithmetic',
  ['The control unit, since a comparison controls what happens next',
   'Working memory, where the two values are held',
   'The operating system, which decides the outcome'],
  'The unit\'s name covers logic as well as arithmetic, and a comparison is a logic operation. '
  'That its result then influences what runs next is a separate step performed by the control '
  'unit.')

# =========================================================================
# CA_FAM03_CONTROL_VS_COMPUTE — D2, D3
# =========================================================================
q('GB_CA_008', 'CA_FAM03_CONTROL_VS_COMPUTE', 'D2',
  'What does the control unit do?',
  'Works out what each instruction means and directs the other parts accordingly',
  ['Performs the calculations the instructions ask for',
   'Holds the program while it runs',
   'Stores the results of each instruction'],
  'The control unit interprets and directs; it produces no values of its own. Reading "control" '
  'as "does the work" is exactly the misreading the name invites.')

q('GB_CA_009', 'CA_FAM03_CONTROL_VS_COMPUTE', 'D3',
  'An instruction says to multiply two values. Which part decides that a multiplication is what '
  'is wanted, and which part produces the answer?',
  'The control unit decides; the arithmetic and logic unit produces the answer',
  ['The arithmetic and logic unit decides and produces the answer',
   'The control unit decides and produces the answer',
   'Working memory decides; the control unit produces the answer'],
  'Interpreting the instruction and performing it are two jobs done by two parts. Assigning both '
  'to one of them collapses the distinction the two units exist to make.')

# =========================================================================
# CA_FAM04_REGISTER_PLACEMENT — D2, D3
# =========================================================================
q('GB_CA_010', 'CA_FAM04_REGISTER_PLACEMENT', 'D2',
  'What do registers hold?',
  'The few values the processor is working with at this moment',
  ['The whole of the program currently running',
   'Files that must survive a restart',
   'A copy of everything in working memory'],
  'Registers hold a very small number of values, right where the work happens. Anything larger '
  'lives further out, in memory or on storage.')

q('GB_CA_011', 'CA_FAM04_REGISTER_PLACEMENT', 'D3',
  'How do registers compare with working memory?',
  'Far faster and far smaller',
  ['Faster and larger', 'Slower and smaller', 'The same speed, and simply nearer'],
  'Speed and capacity run in opposite directions across the whole arrangement, and registers sit '
  'at the fast, tiny end of it. Being both faster and larger would remove the reason for having '
  'memory at all.')

# =========================================================================
# CA_FAM05_RAM_PURPOSE — D1 x3, D2 x1
# =========================================================================
q('GB_CA_012', 'CA_FAM05_RAM_PURPOSE', 'D1',
  'What happens to the contents of working memory when a machine is switched off?',
  'They are lost',
  ['They are kept until the machine is switched on again',
   'They are written to storage automatically',
   'They are kept for a few hours and then lost'],
  'Working memory holds what is needed while the machine runs and keeps nothing without power. '
  'That is precisely why saving a file writes it somewhere else.')

q('GB_CA_013', 'CA_FAM05_RAM_PURPOSE', 'D1',
  'Which of these is kept in working memory while a program runs?',
  'The values the program is currently using',
  ['The program\'s files, permanently',
   'The operating system\'s installation, permanently',
   'Nothing; a running program uses only the processor'],
  'Working memory holds what is in use now, and gives it up when the program ends. Permanent '
  'copies of anything live on storage.')

q('GB_CA_014', 'CA_FAM05_RAM_PURPOSE', 'D1',
  'Does adding more working memory make the processor faster?',
  'No; it lets more be held at once, which is a different thing',
  ['Yes; more memory means faster calculation',
   'Yes; the processor runs at the speed of the memory',
   'No; adding memory has no effect on anything'],
  'More memory removes the need to shuffle data to and from storage, which can make a machine '
  'feel much faster without the processor doing anything more quickly. The two are separate '
  'quantities.')

q('GB_CA_015', 'CA_FAM05_RAM_PURPOSE', 'D2',
  'A machine has plenty of storage and very little working memory. What is the likely effect?',
  'Programs run, but the machine spends much of its time moving data between memory and storage',
  ['Programs cannot be installed at all',
   'Programs run at full speed, since storage makes up the difference',
   'The processor runs more slowly to compensate'],
  'Storage can stand in for memory and is far slower, so the work still happens and takes much '
  'longer. Installation depends on storage, which the machine has.')

# =========================================================================
# CA_FAM06_STORAGE_SELECTION — D2, D3
# =========================================================================
q('GB_CA_016', 'CA_FAM06_STORAGE_SELECTION', 'D2',
  'A value must still be available after the machine has been switched off and on again. Where '
  'should it be kept?',
  'On storage',
  ['In working memory', 'In a processor register', 'In the processor cache'],
  'Only storage keeps its contents without power. Each of the other three is faster and loses '
  'everything when the machine stops.')

q('GB_CA_017', 'CA_FAM06_STORAGE_SELECTION', 'D3',
  'A value is read millions of times while a program runs and does not need to survive the '
  'program ending. Where is it best kept?',
  'In working memory, or nearer the processor still',
  ['On storage, so that it is safe',
   'On storage, since it is read so often',
   'Nowhere; a value read that often should be recomputed each time'],
  'The requirement is speed and not survival, which points inward rather than outward. Keeping it '
  'on storage would make every one of those millions of reads far slower for a guarantee nobody '
  'asked for.')

# =========================================================================
# CA_FAM07_HIERARCHY_ORDERING — D2, D3, D4 x2
# =========================================================================
q('GB_CA_018', 'CA_FAM07_HIERARCHY_ORDERING', 'D2',
  'Order these from fastest to slowest: working memory, a processor register, a storage drive.',
  'Register, working memory, storage drive',
  ['Working memory, register, storage drive',
   'Storage drive, working memory, register',
   'Register, storage drive, working memory'],
  'Speed increases with nearness to the processor, so registers lead and storage trails. The '
  'ordering by capacity runs the other way.')

q('GB_CA_019', 'CA_FAM07_HIERARCHY_ORDERING', 'D3',
  'Order the same three from largest capacity to smallest.',
  'Storage drive, working memory, register',
  ['Register, working memory, storage drive',
   'Working memory, storage drive, register',
   'They are all about the same size'],
  'Capacity runs opposite to speed, so the slowest layer is the largest. Getting both orders the '
  'same way round is the answer that shows the trade-off has not landed.')

q('GB_CA_020', 'CA_FAM07_HIERARCHY_ORDERING', 'D4',
  'Someone proposes building a machine whose memory is as fast as a register and as large as a '
  'storage drive. Every layer of the existing arrangement exists because no such thing is '
  'available. What is wrong with the proposal?',
  'Nothing is wrong with wanting it; the arrangement exists precisely because speed and capacity '
  'cannot both be maximised affordably',
  ['Nothing; such memory already exists and is simply not used',
   'Registers cannot be made larger under any circumstances',
   'A single layer would be slower than several'],
  'The proposal describes exactly what would make the hierarchy unnecessary, which is why the '
  'hierarchy exists. The obstacle is cost and physics rather than an oversight in how machines '
  'are built.',
  evidence='Every layer of the existing arrangement exists because no such thing is available')

q('GB_CA_021', 'CA_FAM07_HIERARCHY_ORDERING', 'D4',
  'A machine\'s cache is described as being larger than its working memory. Every other layer in '
  'the machine follows the usual arrangement. Why is that description suspect?',
  'Cache sits nearer the processor than memory, so it is faster and correspondingly smaller',
  ['Cache and memory are the same thing under two names',
   'Cache is always exactly half the size of memory',
   'Nothing is suspect; cache size varies freely'],
  'Each layer trades capacity for speed against the one beyond it, and cache is on the fast side '
  'of memory. A layer that was both faster and larger would make the layer beyond it pointless.',
  evidence='Every other layer in the machine follows the usual arrangement')

# =========================================================================
# CA_FAM08_IO_CLASSIFICATION — D1 x3 (1 legacy)   (both-directions cases forced)
# =========================================================================
q('GB_CA_022', 'CA_FAM08_IO_CLASSIFICATION', 'D1',
  'Which pair contains one input device and one output device?',
  'Keyboard and monitor',
  ['Monitor and speaker', 'Mouse and scanner', 'Printer and speaker'],
  'A keyboard brings data in and a monitor sends it out. Each of the other pairs has both devices '
  'travelling in the same direction.',
  provenance='LEGACY_REMAP', source='376b2e')

q('GB_CA_023', 'CA_FAM08_IO_CLASSIFICATION', 'D1',
  'A touchscreen displays images and registers where it is touched. How should it be classified?',
  'Both input and output',
  ['Output only, because it is a screen',
   'Input only, because it is touched',
   'Neither, because it does both'],
  'Classification follows what the data does, and here it travels in both directions. Deciding '
  'from the device category rather than from the data is what makes a screen look like output '
  'only.')

q('GB_CA_024', 'CA_FAM08_IO_CLASSIFICATION', 'D1',
  'A storage drive has data written to it and read from it. How should it be classified?',
  'Both input and output',
  ['Neither; storage is a separate category',
   'Output only, since data is written to it',
   'Input only, since data is read from it'],
  'Data travels into the drive and back out of it, so both directions occur. Treating storage as '
  'a category outside the classification is the answer that avoids applying the rule at all.')

# =========================================================================
# CA_FAM09_COMPONENT_COMMUNICATION — D2, D3
# =========================================================================
q('GB_CA_025', 'CA_FAM09_COMPONENT_COMMUNICATION', 'D2',
  'What does a bus do?',
  'Carries signals between components along a shared route',
  ['Stores data on the way between components',
   'Connects exactly two components to each other',
   'Converts data from one form to another'],
  'A bus is a route rather than a place, and several components share it. Storing anything is the '
  'job of memory, and a shared route is what makes a bus different from a direct connection.')

q('GB_CA_026', 'CA_FAM09_COMPONENT_COMMUNICATION', 'D3',
  'A value is read from memory into the processor. Besides the value itself, what else must travel?',
  'Which location is wanted, and a signal saying that a read is what is being asked for',
  ['Nothing else; the value alone is enough',
   'The whole of the surrounding memory, from which the value is picked',
   'The instruction that asked for the value'],
  'Memory has to be told where to look and what to do, so an address and a control signal '
  'accompany the data. Believing only data travels is the half-formed model this measures.')

# =========================================================================
# CA_FAM10_CYCLE_ORDERING — D2, D3
# =========================================================================
q('GB_CA_027', 'CA_FAM10_CYCLE_ORDERING', 'D2',
  'Put the stages of handling one instruction in order.',
  'Fetch, decode, execute',
  ['Decode, fetch, execute', 'Fetch, execute, decode', 'Execute, fetch, decode'],
  'An instruction has to be collected before it can be interpreted, and interpreted before it can '
  'be carried out. Decoding first would require understanding something not yet obtained.')

q('GB_CA_028', 'CA_FAM10_CYCLE_ORDERING', 'D3',
  'How many times does that sequence of stages run while a program of a thousand instructions '
  'executes?',
  'About a thousand times, once for each instruction',
  ['Once, covering the whole program',
   'Three times, once per stage',
   'Once per line of source code the programmer wrote'],
  'The cycle handles a single instruction and repeats for the next, which is what makes a '
  'processor able to run a program of any length. Treating it as covering the whole program '
  'misses the repetition entirely.')

# =========================================================================
# CA_FAM11_DATA_FLOW_TRACE — D3, D4 x2, D5 x2
# =========================================================================
q('GB_CA_029', 'CA_FAM11_DATA_FLOW_TRACE', 'D3',
  'An instruction adds a value held in memory to one already in the processor. Where does the '
  'memory value go first?',
  'Into a register inside the processor',
  ['Straight into the arithmetic and logic unit from memory',
   'Onto storage, and then into the processor',
   'Into the control unit, which performs the addition'],
  'Values are brought into registers before they are operated on, which is what registers are '
  'for. The arithmetic unit works on what the registers hold rather than reaching into memory '
  'itself.')

q('GB_CA_030', 'CA_FAM11_DATA_FLOW_TRACE', 'D4',
  'A result has just been computed. Someone says it is written directly to the storage drive. The '
  'program did not ask for anything to be saved. Where does it actually go?',
  'Into a register, and then to memory if the program keeps it',
  ['To the storage drive, as they said',
   'Back into the control unit for checking',
   'Nowhere; it is used and discarded within the arithmetic unit'],
  'Reaching storage requires an explicit request, and none was made. A computed value lands in a '
  'register and travels no further unless the program stores it.',
  evidence='The program did not ask for anything to be saved')

q('GB_CA_031', 'CA_FAM11_DATA_FLOW_TRACE', 'D4',
  'A single instruction is traced and the value appears never to enter a register at all, going '
  'straight from memory to the arithmetic unit. Every other instruction in the trace does use a '
  'register. What is the likely explanation?',
  'The trace has omitted the step; the register is where operands are held for the arithmetic unit',
  ['This instruction is a special kind that bypasses registers',
   'The arithmetic unit contains its own memory for such cases',
   'The value was small enough not to need a register'],
  'One instruction behaving unlike every other in the same trace points at the record rather than '
  'at the machine. Operands reach the arithmetic unit through registers, and the size of a value '
  'does not change that.',
  evidence='Every other instruction in the trace does use a register')

q('GB_CA_032', 'CA_FAM11_DATA_FLOW_TRACE', 'D5',
  'Trace where a value is at each point while one instruction adds it to another: it begins on the '
  'storage drive and the program has just started. What is the full path?',
  'Storage to memory, memory to a register, register to the arithmetic unit, result back to a '
  'register',
  ['Storage to the arithmetic unit, result to memory',
   'Storage to a register, register to memory, memory to the arithmetic unit',
   'Memory to the arithmetic unit, result to storage'],
  'Each layer hands on to the next one inward, and the result comes back out the way it went in. '
  'Skipping memory or reaching the arithmetic unit from storage removes a step the machine cannot '
  'do without.',
  mode='TRANSFER', hinge='it begins on the storage drive and the program has just started')

q('GB_CA_033', 'CA_FAM11_DATA_FLOW_TRACE', 'D5',
  'A value is used repeatedly by a tight piece of code. Where would you expect it to be after the '
  'first few uses, and why?',
  'In a register or cache, because the machine keeps recently used values near the processor',
  ['Written back to storage after each use, for safety',
   'In working memory, since that is where all values live',
   'Recomputed each time, since holding it costs space'],
  'Repeated use is exactly the condition the inner layers exist for, so a value read again and '
  'again is kept close. Writing it out after each use would pay the largest cost available on '
  'every use.',
  mode='TRANSFER', hinge='A value is used repeatedly by a tight piece of code')

# =========================================================================
# CA_FAM12_REPRESENTATION_REASONING — D2 (legacy), D3 (legacy, rewritten)
# =========================================================================
q('GB_CA_034', 'CA_FAM12_REPRESENTATION_REASONING', 'D2',
  'Which digit values are used in binary?',
  '0 and 1',
  ['0 to 9', '1 and 2', 'A and B'],
  'Binary uses exactly two digit values. Everything a machine holds — numbers, text, images, '
  'sound — is built from them.',
  provenance='LEGACY_KEEP', source='ad1f40')

q('GB_CA_035', 'CA_FAM12_REPRESENTATION_REASONING', 'D3',
  'The same pattern of bits is opened as a number by one program and as text by another, and each '
  'shows something different. How is that possible?',
  'The bits carry no meaning of their own; what they represent is decided by how they are '
  'interpreted',
  ['One of the two programs has misread the bits',
   'The bits change depending on which program opens them',
   'Text and numbers are stored in different ways, so one of the two is wrong'],
  'Storage holds patterns and nothing else, and meaning is supplied by whatever reads them. This '
  'is why opening a file with the wrong program shows nonsense rather than reporting an error.',
  provenance='LEGACY_REWRITE', source='b66479')

# =========================================================================
# CA_FAM13_BOTTLENECK_DIAGNOSIS — D3, D4 x2, D5 x3
# =========================================================================
q('GB_CA_036', 'CA_FAM13_BOTTLENECK_DIAGNOSIS', 'D3',
  'A machine copying large files between drives shows the processor almost idle throughout. Which '
  'component limits the work?',
  'The drives',
  ['The processor', 'Working memory', 'The display'],
  'An idle processor cannot be what is holding the work up. Copying moves data between drives and '
  'is limited by how fast they can read and write it.')

q('GB_CA_037', 'CA_FAM13_BOTTLENECK_DIAGNOSIS', 'D4',
  'A task takes far longer than expected. The processor sits near idle, the drives are busy '
  'continuously, and there is ample free memory. Someone proposes a faster processor. Would it '
  'help?',
  'No; the processor is not what the work is waiting on, so a faster one would sit idle just as '
  'often',
  ['Yes; a faster processor speeds up every task',
   'Yes; the drives would be driven harder by a faster processor',
   'No; more memory is what is needed'],
  'The evidence names the busy component and the idle one, which settles where the limit is. '
  'Adding memory would not help either, since the stem says there is already plenty.',
  evidence='The processor sits near idle, the drives are busy continuously, and there is ample '
           'free memory')

q('GB_CA_038', 'CA_FAM13_BOTTLENECK_DIAGNOSIS', 'D4',
  'A calculation runs slowly. The processor is fully used, the drives are quiet and memory is '
  'largely free. Which change would help most?',
  'A faster processor, or spreading the work across more of them',
  ['A larger storage drive', 'More working memory', 'A faster network connection'],
  'The fully used component is the one holding the work up, and here it is the processor. Each '
  'other change addresses a resource the evidence shows is not under pressure.',
  evidence='The processor is fully used, the drives are quiet and memory is largely free')

q('GB_CA_039', 'CA_FAM13_BOTTLENECK_DIAGNOSIS', 'D5',
  'A machine is upgraded with a much faster processor and the task it was bought for runs barely '
  'faster. What does that tell you, and what should be measured next?',
  'The processor was not the limit; measure which component is busy while the task runs',
  ['The upgrade was faulty and should be replaced',
   'The task cannot be made faster by any hardware',
   'The processor must be faster still'],
  'An upgrade that changes nothing is evidence about where the limit is not, which narrows the '
  'search rather than exhausting it. Buying a faster version of the same component again is what '
  'the observation argues against.',
  mode='TRANSFER', hinge='runs barely faster')

q('GB_CA_040', 'CA_FAM13_BOTTLENECK_DIAGNOSIS', 'D5',
  'After a component is upgraded and the task speeds up, the same task is now limited by a '
  'different component. Is that a sign the upgrade was wrong?',
  'No; relieving one limit always exposes the next one, and the task did get faster',
  ['Yes; a correct upgrade removes the limit entirely',
   'Yes; the new limit shows the wrong component was chosen',
   'No, but the second limit means the first was not a limit at all'],
  'Something is always the slowest part, so removing one bottleneck necessarily reveals another. '
  'Whether the upgrade was worth it is settled by how much faster the task became, not by whether '
  'a limit remains.',
  mode='TRANSFER', hinge='the same task is now limited by a different component')

q('GB_CA_041', 'CA_FAM13_BOTTLENECK_DIAGNOSIS', 'D5',
  'Two upgrades are affordable and only one can be bought. One removes a limit that costs the '
  'task ten minutes a day; the other removes a limit costing two minutes a day and is cheaper. '
  'How should the choice be made?',
  'By comparing what each buys against what each costs, since the larger saving is not '
  'automatically the better purchase',
  ['Always the larger saving, since time matters most',
   'Always the cheaper one, since budgets are limited',
   'Neither; both limits should be removed together'],
  'Two quantities are in play and neither dominates by itself, so the decision needs both. A rule '
  'that looks only at the saving, or only at the price, is a preference standing in for a '
  'calculation.',
  mode='TRADEOFF', hinge='the other removes a limit costing two minutes a day and is cheaper')

# =========================================================================
# CA_FAM14_TRADEOFF_DECISION — D4 x2, D5 x3
# =========================================================================
q('GB_CA_042', 'CA_FAM14_TRADEOFF_DECISION', 'D4',
  'A machine is needed to hold a very large archive that is read rarely, and the budget is tight. '
  'Speed is explicitly not a priority. Which configuration is defensible?',
  'A large, slower drive, accepting that reads take longer',
  ['The fastest drive available, at whatever capacity fits the budget',
   'A large amount of working memory instead of storage',
   'A configuration that is fastest, largest and cheapest at once'],
  'The stated priorities are capacity and cost, and the answer gives up the thing that was said '
  'not to matter. The last option claims to win on every axis, which is what the trade-off says '
  'is unavailable.',
  evidence='Speed is explicitly not a priority')

q('GB_CA_043', 'CA_FAM14_TRADEOFF_DECISION', 'D4',
  'A machine must serve a small dataset to many users as quickly as possible, and capacity is not '
  'a concern. The whole dataset fits comfortably in memory. Which configuration is defensible?',
  'Enough memory to hold the dataset, and a fast processor, with modest storage',
  ['The largest storage drive available',
   'Minimal memory, with the dataset read from storage each time',
   'A configuration chosen for lowest cost across every component'],
  'The stated priority is speed for a small dataset, and the stem confirms it fits in memory, '
  'which removes the reason to buy capacity. Reading from storage each time gives up exactly what '
  'was asked for.',
  evidence='The whole dataset fits comfortably in memory')

q('GB_CA_044', 'CA_FAM14_TRADEOFF_DECISION', 'D5',
  'A supplier claims a configuration that is faster, larger and cheaper than every alternative. '
  'What is the first thing to check?',
  'What it gives up that the comparison did not measure — durability, reliability, or how the '
  'figures were obtained',
  ['Nothing; a better configuration is simply better',
   'Whether the price includes delivery',
   'Whether the components are from the same manufacturer'],
  'Winning on every axis at once is what the trade-off says does not happen, so the claim points '
  'at an axis nobody compared. That is a reason to look harder rather than to reject it outright.',
  mode='TRANSFER', hinge='faster, larger and cheaper than every alternative')

q('GB_CA_045', 'CA_FAM14_TRADEOFF_DECISION', 'D5',
  'A budget can buy either much more memory or a much faster processor. The workload is not yet '
  'known. What follows?',
  'The choice cannot be made responsibly yet; what the workload spends its time on is what decides '
  'it',
  ['Buy the processor, since it affects everything',
   'Buy the memory, since it is more flexible',
   'Split the budget evenly between the two'],
  'Which component matters is a property of the work rather than of the machine, so an unknown '
  'workload leaves the question genuinely open. Splitting evenly is a way of avoiding the '
  'decision rather than making it.',
  mode='TRADEOFF', hinge='The workload is not yet known')

q('GB_CA_046', 'CA_FAM14_TRADEOFF_DECISION', 'D5',
  'A configuration is chosen for a workload and the workload later changes character entirely. '
  'What does that say about the original decision?',
  'It may have been right when it was made; a decision is judged on what was known then, and the '
  'configuration should now be revisited',
  ['It was wrong, since the configuration no longer suits the work',
   'It was right, and the workload should be changed back',
   'It says nothing, since hardware decisions cannot be judged'],
  'A choice made well on the information available can be overtaken by events, and treating that '
  'as an error discourages making any decision at all. What follows is a fresh decision rather '
  'than a verdict on the old one.',
  mode='TRADEOFF', hinge='the workload later changes character entirely')

# =========================================================================
# CA_FAM15_HIERARCHY_TRANSFER — D4 x2, D5 x2
# =========================================================================
q('GB_CA_047', 'CA_FAM15_HIERARCHY_TRANSFER', 'D4',
  'A workload reads one small table over and over while streaming a very large file past it once. '
  'The table is far smaller than memory and the file is far larger. Which layer does the work '
  'depend on most?',
  'Memory, to hold the small table, while the large file is read from storage as it goes',
  ['Storage, since the file dominates the data volume',
   'Registers, since the table is small',
   'Cache alone, since the table is read repeatedly'],
  'The two parts of the workload have different needs and each lands on a different layer. The '
  'table is what is read repeatedly and must therefore be held close; the file is read once and '
  'has nowhere else to be.',
  evidence='The table is far smaller than memory and the file is far larger')

q('GB_CA_048', 'CA_FAM15_HIERARCHY_TRANSFER', 'D4',
  'A workload holds a dataset slightly larger than the machine\'s memory and touches all of it '
  'constantly. The processor is idle much of the time. Which layer decides how fast it runs?',
  'Storage, because the part that will not fit is fetched from there again and again',
  ['The processor, since it does the work',
   'Registers, since every value passes through them',
   'Memory, since the dataset is nearly small enough to fit'],
  'Being slightly too large is the worst case: almost everything fits, and the small remainder is '
  'fetched from the slowest layer constantly. An idle processor confirms the wait is elsewhere.',
  evidence='The processor is idle much of the time')

q('GB_CA_049', 'CA_FAM15_HIERARCHY_TRANSFER', 'D5',
  'A dataset just fits in memory, and it then grows by a few per cent. Performance falls off a '
  'cliff rather than degrading gently. Why?',
  'The part that no longer fits is fetched from storage repeatedly, and storage is far slower '
  'rather than slightly slower',
  ['Memory becomes slower as it fills',
   'The processor throttles itself when memory is full',
   'The growth was larger than reported'],
  'The layers differ by large factors rather than small ones, so crossing from one to the next is '
  'a step rather than a slope. A few per cent more data can move a large share of the accesses to '
  'a layer orders of magnitude slower.',
  mode='TRANSFER', hinge='it then grows by a few per cent')

q('GB_CA_050', 'CA_FAM15_HIERARCHY_TRANSFER', 'D5',
  'A colleague suggests that keeping data in the fastest available layer is always the right '
  'choice. When does that advice fail?',
  'Whenever the data does not fit; a layer that is faster and too small does not hold the data at '
  'all',
  ['Never; faster is always better',
   'Whenever the data is read only once, since speed is wasted',
   'Whenever the data must survive a restart, since fast layers are less reliable'],
  'Capacity is a constraint rather than a preference, so the fastest layer is only a candidate if '
  'the data fits in it. Reading data once is a weaker objection — speed still helps, it simply '
  'helps less.',
  mode='TRANSFER', hinge='keeping data in the fastest available layer is always the right choice')
