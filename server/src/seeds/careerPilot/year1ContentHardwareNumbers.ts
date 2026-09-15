/**
 * T_HARDWARE and T_NUMBER_SYSTEMS — how a computer runs, and how it counts.
 *
 * ── WHY THESE TOPICS, AND WHO THEY ARE FOR ────────────────────────────────────────────────
 *
 * UNIVERSAL, and the first thing a first-year meets. Every later topic assumes a working model of
 * the machine: that a program lives in RAM while it runs and on storage when it does not, that the
 * processor executes tiny instructions one after another, that the operating system stands between
 * a program and every device, and that all of it — text, pictures, numbers, instructions — is bits.
 * Students without that model memorise symptoms ("restart it", "it is slow, buy more RAM"); students
 * with it can reason about what the machine is actually doing.
 *
 * ── THE LINE THESE TOPICS HOLD ────────────────────────────────────────────────────────────
 *
 * T_HARDWARE is the model, not the parts catalogue. No unit asks for specification sheets or brand
 * names; each explains one layer by what it does and what goes wrong when it is missing, and
 * T_HARDWARE_DEBUGGING turns the model into diagnosis of a slow machine. Two boundaries are kept on
 * purpose. T_HARDWARE_BINARY_REPRESENTATION says that everything is a bit pattern and that meaning
 * comes from interpretation; every piece of conversion arithmetic belongs to T_NUMBER_SYSTEMS.
 * T_HARDWARE_COMPILE_VS_RUN is conceptual — source, translation, machine code, compiler versus
 * interpreter — and leaves the hands-on gcc workflow to T_C_BASICS_COMPILE_AND_RUN.
 *
 * T_NUMBER_SYSTEMS is the arithmetic: place value, conversion in both directions, hexadecimal,
 * sizes and units, two's complement and overflow. It stops at representation. The gate-level adder
 * is T_BOOLEAN_ADDER's, and tracing a wrong numeric result back to its representation is
 * T_NUMBER_SYSTEMS_DEBUGGING's.
 *
 * Checkpoint questions in T_HARDWARE name the one skill each measures: COMPUTER_ARCHITECTURE for
 * the components and how they store and move data, HOW_COMPUTERS_WORK for what happens when a
 * program runs, saves, loads or fails. T_NUMBER_SYSTEMS has a single skill, so its questions carry
 * none.
 */

import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string, skillKey?: string,
): PilotMcq => ({
  question,
  options: options.map(([text, isCorrect]) => ({ text, isCorrect })),
  explanation,
  ...(skillKey ? { skillKey } : {}),
});

const H = 'HOW_COMPUTERS_WORK';
const A = 'COMPUTER_ARCHITECTURE';

export const HARDWARE_NUMBERS_BUNDLES: PilotBundle[] = [
  /* ─────────────────────────────── T_HARDWARE ─────────────────────────────── */
  {
    unitCode: 'T_HARDWARE_WHAT_IS_A_COMPUTER',
    notes: `A computer is a machine that takes in data, processes it by following a list of
instructions, gives out results, and keeps data for later. **Input, processing, output and
storage** — every computer does all four, whether it is a phone, a laptop, a server in a data
centre or the controller inside a washing machine.

**The four stages, on a phone paying a shop by scanning a QR code:**

- **Input.** The camera captures the QR code; the touchscreen reports where your finger pressed.
- **Processing.** The processor decodes the image into a merchant ID and an amount, and encrypts
  your PIN before anything is sent.
- **Output.** The screen shows the confirmation, the speaker plays a tone, and the radio sends the
  request to the bank.
- **Storage.** The transaction is written to the phone's flash storage, so the history is still
  there tomorrow.

**What makes it a computer rather than just a machine: the stored program.** An old pocket
calculator had its behaviour wired into its circuits. A computer keeps its instructions in memory
as data, alongside the data they work on, so loading different instructions turns the same
hardware into a word processor, a game or a compiler. This idea, usually associated with John von
Neumann, is why one laptop runs thousands of different programs without a single change to its
circuits.

**The parts that do each job.** Input devices (keyboard, mouse, microphone, sensors). The CPU,
which does the processing. Main memory (RAM), which holds the program and data in use right now.
Storage (SSD or hard disk), which keeps data when the power is off. Output devices (screen,
speakers, printer). Some devices do two jobs: a touchscreen is input and output, and a network
card both receives and sends.

**A common misconception.** "The computer" is often taken to mean the thing with a keyboard and a
monitor. By the definition that matters, a smart TV, a car's engine control unit and a card-payment
terminal are all computers, because each runs stored instructions over input to produce output.
A keyboard on its own is not; it is an input device that a computer reads.

**Why it matters to a programmer.** Every program you write has the same shape: read input,
process it, produce output, and perhaps store something. When a program misbehaves, asking which
stage is wrong — did it read what I think, calculate correctly, print correctly, save at all — is
the first step of nearly every diagnosis.`,
    mcqs: [
      mcq('A smart electricity meter records usage every 30 minutes and sends the readings to the supplier overnight. Which stage is the overnight send?',
        [['Output, since data leaves the device for another system', true],
          ['Input, since the supplier is receiving the reading', false],
          ['Storage, since the reading has already been recorded', false],
          ['Processing, since the reading is being transformed', false]],
        'Data leaving the device, whether to a screen or across a network, is output. The supplier\'s system treats the same data as its input, but from the meter\'s side it is going out.'),
      mcq('What is the stored-program idea that makes a computer general-purpose?',
        [['Instructions are kept in memory as data, so new ones can be loaded', true],
          ['Every program is wired permanently into the circuits at the factory', false],
          ['Programs are stored on disk so they survive when the power is off', false],
          ['The processor stores its results before displaying them on screen', false]],
        'Because instructions are just data in memory, the same hardware becomes a different machine whenever different instructions are loaded. Surviving a power cut is about storage, not about what makes the machine general-purpose.'),
      mcq('Which of these devices performs both input and output?',
        [['A touchscreen', true], ['A keyboard', false], ['A printer', false], ['A microphone', false]],
        'A touchscreen displays images (output) and reports touches (input). A keyboard and microphone only provide input, and a printer only produces output.'),
      mcq('Why is a car\'s engine control unit counted as a computer?',
        [['It runs stored instructions on sensor input to produce control outputs', true],
          ['It has a screen that shows the driver the engine\'s current state', false],
          ['It is connected to the internet so that it can receive updates', false],
          ['It contains a battery, which lets it keep working with the engine off', false]],
        'What makes something a computer is running stored instructions over input to produce output. A screen, an internet connection and a battery are all optional.'),
    ],
    checkpoint: [
      mcq('An invoicing program shows every invoice correctly, but after the computer restarts all of them are gone. Which of the four stages has failed?',
        [['Storage, because nothing was kept beyond the program\'s run', true],
          ['Output, because the invoices were displayed on the screen', false],
          ['Processing, because the totals must have been calculated wrongly', false],
          ['Input, because the invoice details were typed in by the user', false]],
        'The invoices were read, calculated and shown correctly, so input, processing and output worked. Data that vanishes on restart was never written to storage.', H),
      mcq('Which component holds the program and the data a computer is using right now?',
        [['RAM, the main memory the processor reads from', true],
          ['The SSD, where the installed program files are kept', false],
          ['The CPU\'s clock, which counts through each instruction', false],
          ['The network card, which buffers everything it receives', false]],
        'A running program and its data are held in main memory. The SSD keeps the program\'s file, but it is copied into RAM to run.', A),
      mcq('Why can one laptop run a browser, a compiler and a game without any change to its circuits?',
        [['Each program is just instructions loaded into memory as data', true],
          ['The processor contains separate circuits built for each application', false],
          ['The operating system rewires the chip whenever a program is opened', false],
          ['Each program brings its own small processor inside its install file', false]],
        'That is the stored-program idea: the hardware stays the same and only the instructions in memory change.', A),
    ],
  },
  {
    unitCode: 'T_HARDWARE_CPU',
    notes: `The CPU (central processing unit) does one thing extremely quickly: it carries out
instructions, one after another. Each instruction is tiny — add these two numbers, copy this value
from memory, jump to a different instruction if the last result was zero. Everything a program does
is built from billions of these.

**The fetch-execute cycle.** The processor repeats these steps for as long as it is switched on:

1. **Fetch.** The **program counter** (PC), a small storage slot inside the CPU, holds the memory
   address of the next instruction. The CPU reads the instruction at that address and moves the
   PC on to the one after it.
2. **Decode.** The **control unit** works out what the instruction means: which operation, and
   which values it uses.
3. **Execute.** The operation is carried out. Arithmetic and comparisons happen in the
   **arithmetic logic unit** (ALU), and results go into a **register** — one of a handful of very
   fast storage slots inside the CPU — or back out to memory.

A **jump** is how an \`if\` or a loop exists at this level: executing it changes the PC, so the next
fetch comes from somewhere other than the following instruction.

**A trace.** Suppose memory holds, at address 100, "load the value at address 200 into register R1";
at 101, "add 1 to R1"; at 102, "store R1 at address 200". Starting with the PC at 100, three turns
of the cycle add one to the value stored at address 200 — which is all \`count = count + 1\` becomes.

**The clock.** The steps are timed by a clock signal. A 3.5 GHz clock ticks 3.5 billion times a
second.

**A common misconception: a higher GHz figure means a faster processor.** Speed also depends on
how much work each tick achieves. A newer design may complete more instructions per cycle, have more
cache so it waits less for memory, or predict jumps better. Two processors with the same GHz figure
can differ by a factor of two on real programs.

**Cores.** A multi-core CPU is several processors on one chip, each running its own fetch-execute
cycle. They help only when the work is split between them: a program written to use one core runs
no faster on an eight-core chip.

**Why it matters.** One line of Python becomes many machine instructions, and each costs time. When
you later ask why one version of a program is faster than another, the answer is almost always that
it executes fewer instructions or spends less time waiting for memory.`,
    mcqs: [
      mcq('During the fetch step, what does the program counter provide?',
        [['The memory address of the next instruction to be read', true],
          ['The number of instructions the program has completed so far', false],
          ['The result of the last arithmetic operation that ran', false],
          ['The speed at which the clock is currently ticking', false]],
        'The PC is an address, not a count. The CPU fetches from that address and then moves the PC on.'),
      mcq('How does a processor carry out a loop at the level of its instructions?',
        [['A jump instruction sets the program counter back to an earlier address', true],
          ['The control unit copies the loop body into memory once per repetition', false],
          ['The ALU counts the repetitions and stops the clock when it finishes', false],
          ['The loop runs on a separate core while the main core waits for it', false]],
        'Changing the program counter makes the next fetch return to the start of the loop body. No copying or extra core is involved.'),
      mcq('Laptop A has a 4.2 GHz processor and laptop B a 3.6 GHz one, of different designs. What can you conclude about their speed on a real program?',
        [['Nothing certain, since work done per tick and cache also matter', true],
          ['A is about 17% faster, in proportion to the clock frequencies', false],
          ['A is faster on every program, although the gap may be small', false],
          ['B is faster, because a slower clock produces fewer errors', false]],
        'Clock frequency alone does not decide speed. A design that does more per tick, or waits less for memory, can beat a faster clock.'),
      mcq('Where inside the CPU are the results of arithmetic first held?',
        [['In registers, small fast storage locations inside the processor', true],
          ['In RAM, which the ALU writes to directly after each operation', false],
          ['On the SSD, so that results survive if the power is cut', false],
          ['In the program counter, which stores every calculated value', false]],
        'Registers sit inside the CPU and are the fastest storage there is. Results are written out to RAM only when an instruction says so.'),
    ],
    checkpoint: [
      mcq('Which order describes one turn of the processor\'s cycle?',
        [['Fetch the instruction, decode it, then execute it', true],
          ['Decode the instruction, fetch its data, then execute it', false],
          ['Execute the instruction, then fetch and decode its result', false],
          ['Fetch the data, execute the instruction, then decode it', false]],
        'The CPU cannot decode an instruction it has not yet read, and cannot execute one it has not decoded.', A),
      mcq('A single-threaded program takes 40 seconds on a 4-core laptop. On a 16-core machine with the same kind of core, it will most likely take:',
        [['About 40 seconds, because it only uses one core at a time', true],
          ['About 10 seconds, as four times the cores do four times the work', false],
          ['About 20 seconds, since extra cores help any program a little', false],
          ['Much longer, since the OS must now manage many more cores', false]],
        'Extra cores only help work that has been split between them. A program that uses one core gets the same one core\'s speed.', H),
      mcq('The instruction at address 300 is a jump to address 120. After it executes, what does the next fetch read?',
        [['The instruction stored at address 120', true],
          ['The instruction stored at address 301', false],
          ['The instruction stored at address 121', false],
          ['The value held in register R1 at address 300', false]],
        'Executing the jump sets the program counter to 120, so that is where the next fetch happens. Address 301 would be next only without the jump.', A),
    ],
  },
  {
    unitCode: 'T_HARDWARE_MEMORY_HIERARCHY',
    notes: `A processor can execute billions of instructions a second, but only if the data it needs
is there when it asks. No single kind of memory is fast, large and cheap at once, so a computer
uses several, arranged as a **hierarchy**.

    Level        Typical size          Rough time to read
    Registers    a few dozen values    under a nanosecond
    L1 cache     tens of kilobytes     about a nanosecond
    L2/L3 cache  megabytes             a few to tens of nanoseconds
    RAM          8 to 32 gigabytes     about 100 nanoseconds
    SSD          hundreds of GB        tens to hundreds of microseconds
    Hard disk    terabytes             several milliseconds

Each step down is **larger and cheaper per byte, and slower**. The gaps are huge: if reading from
L1 cache took one second, reading from RAM would take a minute or two, an SSD around a day, and a
hard disk several months.

**The cache is the trick that makes this work.** Cache memory sits on the processor chip. When the
CPU needs a value from RAM, a copy of it and its neighbours is kept in cache, because programs tend
to use the same data again soon (**temporal locality**) and to use data stored next to it
(**spatial locality**). A loop walking through an array in order finds most elements already
waiting in cache.

**Why a program runs faster the second time.** The first time you open an application after
starting the machine, its files are read from the SSD. The operating system keeps recently read
file data in spare RAM, so the second launch reads from RAM instead, and within the program the
data it uses most is already in the CPU's cache.

**Why not make all memory as fast as cache?** Cost and physics. Cache memory uses several
transistors to store each bit, so a gigabyte of it would cost far more than a gigabyte of RAM and
take far more space on the chip. The levels below RAM are cheaper still, and they also keep data
when the power is off, which the faster kinds cannot do.

**A common misconception: more RAM makes any computer faster.** Extra RAM helps only if the machine
was running short of it. A laptop that never uses more than half its RAM gains almost nothing from
doubling it, because the bottleneck was somewhere else.

**Why it matters.** Many "why is this slow" questions are really "where is the data". Code that
reads the same file repeatedly, or jumps around memory at random, can be many times slower than
code doing the same work with data that stays close to the processor.`,
    mcqs: [
      mcq('Which order runs from fastest to slowest to read?',
        [['Register, L1 cache, RAM, SSD', true],
          ['L1 cache, register, RAM, SSD', false],
          ['Register, RAM, L1 cache, SSD', false],
          ['RAM, register, L1 cache, SSD', false]],
        'Registers are inside the CPU itself, cache is on the CPU chip, RAM is on the motherboard, and the SSD is a separate device.'),
      mcq('Why is a computer\'s entire memory not built from cache-speed memory?',
        [['That memory costs far more per byte, so enough of it is unaffordable', true],
          ['Cache memory loses its contents too quickly to hold a whole program', false],
          ['The processor is able to address only a few megabytes of fast memory', false],
          ['Fast memory keeps data after power-off, which programs do not want', false]],
        'Fast memory needs more transistors per bit, so it is expensive and bulky. The hierarchy gives near-cache speed for most reads at near-RAM cost.'),
      mcq('A photo editor takes 9 seconds to open the first time after the machine boots and 2 seconds the second time. The best explanation is:',
        [['The OS kept the program\'s files in RAM, so the drive was not reread', true],
          ['The program recompiled itself into faster code during the first run', false],
          ['The processor raised its clock speed after recognising the program', false],
          ['The SSD moved the files nearer its read head for the second opening', false]],
        'The operating system holds recently read file data in spare RAM. An SSD has no read head at all, so that distractor describes a hard disk, and even then it is not how it works.'),
      mcq('Why does a small cache help so much when it holds only a tiny fraction of the data?',
        [['Programs keep reusing recent data and data stored close to it', true],
          ['The cache compresses data so a small amount of it holds everything', false],
          ['The processor predicts every future value and stores only those', false],
          ['Most of the data a program uses is never read at all after loading', false]],
        'Locality means the data needed next is usually data used recently or stored nearby, and that is exactly what the cache keeps.'),
    ],
    checkpoint: [
      mcq('Moving from registers towards disk storage in the memory hierarchy, each level is generally:',
        [['Larger and cheaper per byte, but slower to access', true],
          ['Faster and larger, but more expensive per byte', false],
          ['Smaller and slower, but cheaper to manufacture', false],
          ['The same speed, but cheaper as capacity increases', false]],
        'Speed is traded for size and cost at every step. If a level were larger, cheaper and faster, the one above it would not exist.', A),
      mcq('A laptop with 8 GB of RAM never uses more than 5 GB, even with everything open. Upgrading it to 16 GB will most likely:',
        [['Change little, because memory was not the thing running short', true],
          ['Double overall speed, since the processor has twice the room', false],
          ['Make the SSD faster, because it no longer stores the programs', false],
          ['Double the cache size, because cache is a portion of RAM', false]],
        'Extra RAM only helps a machine that was running out. Cache is separate memory on the processor chip, and the SSD still stores the programs.', H),
      mcq('Summing a large array in index order is usually faster than visiting its elements in a random order. Why?',
        [['Neighbouring elements arrive in cache together, so fewer slow RAM reads', true],
          ['Random order forces the processor to recompute each element\'s value', false],
          ['The operating system locks the array whenever it is read out of order', false],
          ['Index order lets the compiler skip adding about half of the elements', false]],
        'Spatial locality: reading one element brings its neighbours into cache. Random order misses the cache and waits on RAM far more often.', A),
    ],
  },
  {
    unitCode: 'T_HARDWARE_STORAGE',
    notes: `Memory and storage are not the same thing, and the difference is one question: **what is
left when the power goes off?**

**Volatile and non-volatile.** RAM is **volatile**: it holds data only while it has power, and a
power cut empties it completely. Storage — an SSD, a hard disk, a USB flash drive, an SD card — is
**non-volatile**: its contents survive being switched off for years.

**What "saving" actually does.** While you type in an editor, the text exists only in the editor's
memory, in RAM. Saving copies it to storage. A power cut one second before saving loses the new
text; one second after, it survives. Autosave is simply the program saving for you every so often.

**The two main storage technologies.**

- **Hard disk drive (HDD).** Magnetic platters spinning, commonly at 5,400 or 7,200 revolutions a
  minute, with an arm that moves a read head across them. Every read waits for the arm to move
  and the platter to turn, which takes milliseconds. Cheap per gigabyte, so still used for large
  archives.
- **Solid-state drive (SSD).** Flash memory chips with no moving parts. A random read takes well
  under a millisecond, which is why an old laptop given an SSD starts in a fraction of the time.
  Each flash cell survives a limited number of writes, which the drive manages for you.

**A write is not always on the drive when you think it is.** For speed, the operating system
collects writes in RAM and sends them to the drive in batches. A program that "wrote" a file a
moment ago may not yet have its data on the device. That is why you eject a USB drive before pulling
it out, and why a database explicitly asks the operating system to finish writing before it
reports a transaction as done.

**What this means inside a program.** Every variable lives in RAM. When the program ends — normally,
by crashing, or because the power went — all of them are gone. A to-do app that keeps tasks in a
list starts empty next time unless it wrote them to a file or a database. Persistence is something a
program must do deliberately.

**A common misconception.** "The program is on my disk, so its data is too." The program's file is
on the disk. When you run it, the operating system copies its instructions into RAM, and everything
it calculates lives there until the program explicitly writes it out.

**Why it matters.** What must survive a restart, when to write it, and what happens if the power
fails halfway through a write are design decisions in every real program, from a game's save slot
to a bank's ledger.`,
    mcqs: [
      mcq('A student is typing an assignment and the power fails before they press save. Why is the new text lost?',
        [['It existed only in RAM, which loses everything without power', true],
          ['The SSD erases any file that was open when the power was cut', false],
          ['The editor deletes unsaved text when it detects a shutdown', false],
          ['The text was on disk, but its file name had not been chosen', false]],
        'Unsaved work lives in the editor\'s memory. RAM is volatile, so the text vanished with the power; the SSD was never involved.'),
      mcq('Why does replacing a hard disk with an SSD make an old laptop start so much faster?',
        [['Reads need no moving arm or spinning platter, so each is far quicker', true],
          ['The SSD contains its own processor that runs the operating system', false],
          ['An SSD holds a copy of RAM, so programs never need to be loaded', false],
          ['SSDs store more gigabytes, so files are spread out less widely', false]],
        'Starting up reads thousands of small files. On a hard disk each read waits for mechanical movement; flash has none.'),
      mcq('Why should a USB drive be ejected before it is unplugged?',
        [['Recent writes may still be waiting in RAM, not yet on the drive', true],
          ['Ejecting erases temporary files the drive would otherwise keep', false],
          ['Unplugging without ejecting reformats the drive the next time', false],
          ['The drive needs a signal to stop its platter spinning safely', false]],
        'Ejecting tells the operating system to finish every pending write. A flash drive has no platter, so the last option describes the wrong technology.'),
      mcq('A to-do app stores tasks in a Python list. The user adds five tasks, closes the app and reopens it. What do they see?',
        [['An empty list, as the tasks were never written to storage', true],
          ['All five tasks, since Python saves variables when it exits', false],
          ['All five, because the app\'s file on disk holds its variables', false],
          ['The last task only, which Python keeps in its history file', false]],
        'The list lived in RAM and disappeared when the program ended. Only data the program writes to a file or database persists.'),
    ],
    checkpoint: [
      mcq('Which of these keeps its contents when the power is switched off?',
        [['Flash memory in an SSD', true], ['Main memory (RAM)', false], ['CPU cache memory', false], ['CPU registers', false]],
        'Flash stores charge that remains without power. Registers, cache and RAM are all volatile.', A),
      mcq('A payments server shows "Payment complete" before it has written the record to storage, and loses power a second later. What is the risk?',
        [['The payment may be lost though the customer was told it succeeded', true],
          ['The record is duplicated, because the write repeats after restart', false],
          ['Nothing, since the message proves the record reached the drive', false],
          ['The drive is damaged, because it was switched off while idle', false]],
        'Until the record is on non-volatile storage it can vanish. That is why reliable systems confirm only after the write has finished.', H),
      mcq('For 4 TB of archived video that is rarely read, why might a hard disk still be chosen over an SSD?',
        [['It costs much less per gigabyte, and access speed matters little', true],
          ['It reads video faster, because the files are read in order', false],
          ['It is more robust to drops, since it has no delicate chips', false],
          ['It is the only kind of drive able to hold more than 2 TB', false]],
        'For large data that is seldom read, price per gigabyte dominates. Hard disks are in fact more fragile, having moving parts, and SSDs larger than 2 TB are common.', A),
    ],
  },
  {
    unitCode: 'T_HARDWARE_OS_ROLE',
    notes: `An operating system (OS) is the program that runs all the other programs. Windows, macOS,
Linux, Android and iOS are operating systems. The central part, the **kernel**, is loaded when the
machine starts and stays in control until it is switched off.

**What it does on your behalf, every second:**

- **Shares the CPU.** A laptop may have 8 cores and 300 processes. The **scheduler** gives each
  process a slice of time, a few milliseconds, and switches between them so quickly that they
  appear to run at once.
- **Shares memory.** Each process gets its own memory space. A process cannot read or overwrite
  another's memory; if it tries, the OS stops it, which is what a crash message such as
  "segmentation fault" or "access violation" reports.
- **Talks to devices.** A **device driver** is OS code that knows how to operate one particular
  kind of hardware. Your program never needs to know which model of SSD or network card is fitted.
- **Provides files.** The file system turns raw blocks on a drive into named files and folders, and
  checks who is allowed to read or change each one.

**System calls.** An ordinary program cannot touch the hardware. The processor runs it in a
restricted **user mode**, in which instructions that talk to devices are refused; only the kernel
runs with full access. To use a device, a program asks the kernel through a **system call**. When
Python runs \`open("marks.txt").read()\`, the interpreter makes system calls to open and read the
file. The kernel checks permissions, finds the file's blocks through the file system, asks the SSD
driver to read them, and copies the bytes into the program's memory.

**Why nothing talks to the disk directly.** Three reasons. **Safety:** a buggy program cannot
corrupt other programs' files or the OS itself. **Sharing:** two programs writing to one drive at
once would destroy each other's data without a referee. **Portability:** the same program works on
any drive the OS supports.

**A common misconception.** "The operating system is the desktop, the windows and the start menu."
Those are programs running on top of it. A Linux server in a data centre, with no screen at all,
has a complete operating system; the part that matters is the kernel, which a user never sees.

**Why it matters.** Many failures a programmer meets are the OS refusing a request: "file not
found", "permission denied", "out of memory", "address already in use". Reading each as "the OS
said no, and here is why" is the start of fixing it.`,
    mcqs: [
      mcq('A laptop has 8 cores and 300 running processes. How do they all appear to run at once?',
        [['The OS scheduler gives each a short turn and switches very quickly', true],
          ['Each process is given a fraction of a core\'s circuits permanently', false],
          ['Processes not visible on the screen are frozen until they are opened', false],
          ['The CPU runs all 300 in the same instant using its many registers', false]],
        'Time-slicing: each process runs for milliseconds before the scheduler switches. Background processes are not frozen; they take their turns too.'),
      mcq('Why can a Python program not send commands straight to the SSD controller?',
        [['User programs run in a restricted mode that refuses device access', true],
          ['Python has no instructions for writing bytes, only for text files', false],
          ['The SSD accepts commands only from programs written in C', false],
          ['Direct commands work, but they are slower than asking the OS', false]],
        'The processor enforces user mode, whatever language the program is written in. Device access goes through system calls to the kernel.'),
      mcq('A program tries to read memory belonging to another process. What normally happens?',
        [['The OS stops the program, because each process has its own memory', true],
          ['It reads the data, since all RAM is shared among running programs', false],
          ['The other process is paused until the first one finishes reading', false],
          ['The processor returns zeros to hide the other program\'s values', false]],
        'Memory protection keeps processes apart. An attempt to reach outside a process\'s own memory ends that process with an error.'),
      mcq('What is a device driver?',
        [['OS code that knows how to operate one particular kind of hardware', true],
          ['A cable and chip that connects a device to the motherboard', false],
          ['An application that shows the user which devices are attached', false],
          ['Firmware stored in the CPU that boots the machine at power-on', false]],
        'Drivers are software. They let the rest of the OS, and every program, use a device without knowing its details.'),
    ],
    checkpoint: [
      mcq('When a Python script calls `open(\'data.csv\')`, what actually locates the file\'s bytes on the drive?',
        [['The kernel, through a system call and the file system', true],
          ['The Python interpreter, by scanning the drive itself', false],
          ['The SSD, which searches its chips for the file name', false],
          ['The CPU cache, which stores a map of every file', false]],
        'The interpreter asks; the kernel\'s file system maps the name to blocks and the driver reads them. A drive knows nothing about file names.', H),
      mcq('A crashing application does not take the whole operating system down with it. Which hardware feature makes that possible?',
        [['A processor mode that stops ordinary programs touching hardware', true],
          ['A second CPU core reserved for the operating system alone', false],
          ['A backup copy of the OS held in the SSD\'s own memory chips', false],
          ['A cache that restores each program as soon as it crashes', false]],
        'Because applications run in user mode with their own protected memory, a fault in one cannot overwrite the kernel or other processes.', A),
      mcq('A Linux server has no monitor, desktop or mouse. Does it have an operating system?',
        [['Yes; the kernel manages processes, memory, devices and files', true],
          ['No; an OS is the desktop and windows, which this machine lacks', false],
          ['Only partly; the kernel starts only when a screen is attached', false],
          ['No; servers run programs straight on the processor for speed', false]],
        'The desktop is just one program. The operating system is the kernel and the services around it, and a server needs them as much as a laptop does.', H),
    ],
  },
  {
    unitCode: 'T_HARDWARE_BINARY_REPRESENTATION',
    notes: `Inside a computer there is no letter A, no photograph and no song. There are only
**bits**: things that are in one of two states, written 0 and 1.

**A bit is a physical thing.** In RAM it is a tiny capacitor that is charged or not. In the
processor it is a wire at a high or low voltage. In flash storage it is charge trapped in a cell,
and on a hard disk a patch of surface magnetised one way or the other. The physics differs; the
machine only ever has to tell two states apart.

**A pattern means nothing until something interprets it.** The same eight bits

    01000001

can be the whole number 65, the letter A in a text file, the brightness of one colour in a pixel
(65 out of a maximum of 255, a dim shade), or part of an instruction when the processor fetches
it. The bits are identical in every case. **The meaning comes from the program reading them.**

**Text.** A **character encoding** is an agreed table from characters to numbers. ASCII covers
English letters, digits and punctuation: A is 65, a is 97, and the digit character 0 is 48. So the
character "7" in a text file is not the value seven; it is the code 55, and a program must convert
it before doing arithmetic. **Unicode** gives a number to every character in every script — the
Latin alphabet, Devanagari, Tamil, emoji — and **UTF-8** stores each one using one to four bytes,
with ASCII characters staying at one byte. Why that makes character counts and byte counts differ
comes up again when you work with strings.

**Images.** A picture is a grid of pixels, and each pixel is commonly three numbers: how much red,
green and blue, each 0 to 255 in one byte. An uncompressed 1920 × 1080 image is 1920 × 1080 × 3
bytes, about 6 MB. Formats such as PNG and JPEG exist to store that in far less.

**Sound.** A microphone's signal is measured many times a second — 44,100 times for CD-quality
audio — and each measurement is stored as a number.

**Numbers and instructions.** Whole numbers are stored as binary place values in a fixed number of
bits; how to convert them and what fixed widths mean is the subject of number systems. Machine
instructions are bit patterns too, which is why a program can be stored in memory like any data.

**A common misconception: a file's extension decides what is inside it.** Renaming photo.jpg to
photo.txt changes none of its bits. A text editor that opens it shows garbage because it interprets
image bytes as characters. The extension is only a hint to software about which interpretation to
use.

**Why it matters.** Garbled accented names in a CSV, "this file is corrupt" after a rename, and a
number that will not add because it was read as text are all the same fault: the right bits read
with the wrong interpretation.`,
    mcqs: [
      mcq('The byte 01000001 is stored in memory. What does it represent?',
        [['Whatever the program reading it interprets it as', true],
          ['The number 65, since memory holds only numbers', false],
          ['The letter A, since bytes are decoded as text', false],
          ['A machine instruction, since the CPU reads all bytes', false]],
        'A bit pattern has no meaning of its own. The same byte is 65 to an integer reader, A to a text reader and a colour value to an image reader.'),
      mcq('Why does the character "7" in a text file not hold the value seven?',
        [['Text stores a code for the digit\'s symbol, which is 55 in ASCII', true],
          ['Digits are stored as small images of their shapes, not as values', false],
          ['Every character is stored as its position in the English alphabet', false],
          ['The file compresses small numbers into a single shared bit', false]],
        'In text, every character, including a digit, is an encoding code. A program must convert the text "7" into the number 7 before it can calculate with it.'),
      mcq('Roughly how many bytes does an uncompressed 1920 × 1080 image with 3 bytes per pixel occupy?',
        [['About 6.2 million', true], ['About 2.1 million', false], ['About 5,760', false], ['About 3,000', false]],
        'There are 1920 × 1080 = 2,073,600 pixels, and three bytes each gives 6,220,800 bytes. About 2.1 million counts the pixels but forgets the bytes per pixel.'),
      mcq('A file named photo.jpg is renamed photo.txt and opened in a text editor, which shows garbled symbols. What happened?',
        [['The same bytes were interpreted as characters instead of image data', true],
          ['Renaming converted the image into a different, damaged encoding', false],
          ['The text editor corrupted the file by opening it in the wrong mode', false],
          ['The extension change deleted the image header from the file', false]],
        'Renaming changes no bytes. Rename it back and it opens as a photo again, which proves the data was never damaged.'),
    ],
    checkpoint: [
      mcq('Which physical form does a single bit take in a computer\'s main memory?',
        [['A tiny capacitor that is either charged or not', true],
          ['A spot magnetised in one of two directions', false],
          ['A light pulse that is either on or off', false],
          ['A transistor switching between ten voltage levels', false]],
        'RAM stores each bit as charge on a capacitor. Magnetised regions are how a hard disk stores bits, and light pulses carry bits in optical fibre.', A),
      mcq('A CSV exported from one program shows the name "José" as "JosÃ©" when opened in another. What is the most likely cause?',
        [['The file was written in one text encoding and read in another', true],
          ['The second program has a font without the letter e installed', false],
          ['The bits of the file were damaged while it was being copied', false],
          ['Accented letters cannot be stored in a CSV file in any form', false]],
        'The é was saved as two UTF-8 bytes and each byte was read as a separate character in an older encoding. The bits are intact; the interpretation is wrong.', H),
      mcq('Why does UTF-8 store an English word in one byte per letter but need more bytes per letter for a Tamil word?',
        [['ASCII characters use one byte, and other scripts use two to four', true],
          ['Tamil letters are stored as small images rather than as numbers', false],
          ['Each Tamil letter is stored twice, once for each reading direction', false],
          ['English text is compressed automatically, while other text is not', false]],
        'UTF-8 keeps the ASCII range at one byte and uses longer byte sequences for everything else; Tamil characters take three bytes each.', A),
    ],
  },
  {
    unitCode: 'T_HARDWARE_COMPILE_VS_RUN',
    notes: `A processor understands exactly one language: **machine code**, the bit patterns of its
own instruction set. The code you write is **source code**, which is text. Something has to
translate one into the other, and the two ways of doing it explain a great deal about how languages
behave.

**Machine code is specific to a processor family.** Most Windows laptops use x86-64 processors;
phones and recent Macs use ARM. An "add" instruction for one is a different bit pattern from the
other, so machine code built for one family does not run on the other without translation. It is
also packaged differently for each operating system.

**A compiler translates ahead of time.** It reads the whole source program, checks it, and produces
a new file of machine code — an **executable**. Running the program later means running that file;
the source and the compiler are no longer needed. Many mistakes are reported before the program has
run at all. The cost is that you must recompile after every change, and build a separate executable
for each processor and operating system. C, C++, Rust and Go normally work this way.

**An interpreter translates while running.** An interpreter is itself a program, already compiled
for your machine, that reads your source and carries out what it says as it goes. Nothing new is
produced, you can run straight after editing, and the same source runs anywhere the interpreter is
installed. The cost is speed, because translation work happens every time the program runs.

**Most real systems mix the two.**

- **Python.** CPython first compiles the whole file into **bytecode**, a compact instruction set
  for an imaginary machine, then its virtual machine executes that bytecode. That is why a syntax
  error anywhere in the file stops it before even the first line runs, while a misspelt variable
  name is reported only when that line is reached.
- **Java.** The compiler produces bytecode files; the Java Virtual Machine runs them and compiles
  frequently used parts into machine code while the program runs, which is called just-in-time
  (JIT) compilation.

**From executable to running program.** When you start a compiled program, the operating system
loads its machine code into RAM, creates a process for it, and points the processor at its first
instruction. From then on it is fetch-execute, exactly as for any other program.

**A common misconception: a language is either compiled or interpreted.** That is a property of a
language's implementation, not of the language. Python has an interpreter and also compilers; C
interpreters exist. The accurate question is how a particular tool runs the code.

**Why it matters.** It tells you when to expect errors (before running, or only when a line is
reached), why an executable will not run on another kind of machine, and where speed differences
between languages come from. The practical compile-and-run workflow in C is covered in the C unit
on compiling.`,
    mcqs: [
      mcq('What does a compiler produce from a source file?',
        [['A translated program, such as machine code, to run later', true],
          ['The program\'s output, printed as each line is translated', false],
          ['A corrected copy of the source with its errors fixed', false],
          ['A list of every value the program will calculate', false]],
        'A compiler\'s output is another program. Running it is a separate later step, and a compiler reports errors rather than fixing them.'),
      mcq('A Python file has invalid syntax on line 40. Nothing runs, not even the print on line 1. Why?',
        [['CPython translates the whole file to bytecode before running any', true],
          ['Python runs the file from the bottom up, so line 40 comes first', false],
          ['The print on line 1 is buffered and discarded when line 40 fails', false],
          ['The interpreter reads each line twice and stops at the first error', false]],
        'Compiling to bytecode happens for the whole file first, and a syntax error stops that step, so no bytecode runs at all.'),
      mcq('An executable compiled for an ARM laptop is copied to an x86 Windows PC and will not run. Why?',
        [['Its machine code uses ARM instructions that the x86 chip lacks', true],
          ['The file was corrupted when it was copied between two machines', false],
          ['Executables run only on the machine where they were compiled', false],
          ['Windows needs the source file beside the executable to run it', false]],
        'Machine code is tied to a processor family. The same executable runs on any compatible machine, not only the one that built it, and needs no source.'),
      mcq('Where does Java\'s approach sit between compiling and interpreting?',
        [['Source is compiled to bytecode, which a virtual machine then runs', true],
          ['Source is interpreted line by line with no translation at all', false],
          ['Source is compiled straight to machine code for one processor', false],
          ['Source is converted to Python, which is then interpreted', false]],
        'Java compiles once to portable bytecode, and the JVM executes it, compiling the busiest parts to machine code while it runs.'),
    ],
    checkpoint: [
      mcq('A Python script prints the results of lines 1 to 29, then crashes with a NameError on line 30. What does that show?',
        [['Some errors are found only when the line is actually executed', true],
          ['Python compiled line 30 before lines 1 to 29 and saved the error', false],
          ['The script was compiled to machine code and line 30 was skipped', false],
          ['Lines 1 to 29 contain the real mistake that line 30 reported', false]],
        'The file compiled to bytecode without complaint; whether a name exists is checked only when line 30 runs.', H),
      mcq('When you start a compiled program, what does the operating system do first?',
        [['Loads its machine code into RAM and starts the CPU at its entry point', true],
          ['Compiles the source code again to check that nothing has changed', false],
          ['Sends the executable to the CPU cache, which runs programs directly', false],
          ['Interprets the executable one line at a time, as Python does', false]],
        'An executable is already machine code. The OS places it in memory, creates a process, and the processor begins fetching its instructions.', A),
      mcq('A team must ship one program file that runs on Windows, macOS and Linux PCs without rebuilding it for each. Which approach fits best?',
        [['Distribute bytecode for a virtual machine installed on each system', true],
          ['Distribute one native executable compiled on the fastest machine', false],
          ['Distribute a Windows executable, as the others run those natively', false],
          ['Distribute machine code, since all three share one file format', false]],
        'Bytecode is the same everywhere and each system\'s virtual machine runs it. Native executables are tied to one processor family and one operating system\'s format.', H),
    ],
  },
  {
    unitCode: 'T_HARDWARE_PRACTICE',
    notes: `No new ideas. Everything here uses the four stages, the processor, the memory hierarchy,
storage, the operating system, representation as bits, and translation from source to machine code.
The skill being practised is tracing an everyday action through all of them without skipping a
layer.

**The method, for any action:**

1. **Name the action and its end points.** What starts it (a click, a key, a timer, a network
   message) and what visible result ends it.
2. **Walk the four stages.** What is the input, what processing happens, what is output, and is
   anything stored?
3. **Name the layer at each step.** Hardware, operating system, or the application program. A step
   that touches a device must pass through the OS.
4. **Ask where the data is at that moment.** Register, cache, RAM or storage — and would it survive
   the power going off right now?
5. **Ask how it is represented.** Characters in an encoding, pixels, samples, numbers, or machine
   instructions.
6. **Ask what was translated.** Is the program running as machine code, or as bytecode inside an
   interpreter?

**A worked trace: double-clicking notes.txt.**

- The mouse reports a click; the OS's driver receives it and passes it to the desktop program,
  which works out that the click was on the icon for notes.txt.
- The OS finds the program associated with .txt files, loads its executable from the SSD into RAM
  (or reuses the copy already cached), creates a process and schedules it.
- The CPU runs the editor's machine code. The editor makes system calls to open and read the file;
  the kernel's file system finds its blocks and the SSD driver reads them into the editor's memory.
- The editor interprets those bytes as UTF-8 characters and draws them; the graphics driver puts
  the pixels on the screen.
- Nothing has been written. Close the editor without changes and storage is exactly as it was.

**The checklist that catches most wrong answers:**

- Unsaved work is in RAM, not on the drive.
- Programs never reach a device directly; the kernel does it for them.
- "Faster the second time" usually means data was already in RAM or cache.
- Extra cores help only work that has been split between them.
- A file's bytes mean nothing until a program chooses how to interpret them.
- An executable is tied to a processor family and an operating system; bytecode is not.`,
    mcqs: [
      mcq('You press a key in a text editor and the letter appears. Which sequence is right?',
        [['Keyboard → OS driver → editor updates its text in RAM → screen redrawn', true],
          ['Keyboard → SSD stores the letter → CPU reads it back → screen redrawn', false],
          ['Keyboard → editor reads the key directly → CPU cache → screen output', false],
          ['Keyboard → screen shows the letter → OS later informs the editor', false]],
        'The key reaches the editor through the OS, the change lives in RAM, and the display is redrawn. Nothing touches the drive until the file is saved.'),
      mcq('A spreadsheet has been edited for an hour but not saved. Where are the latest changes?',
        [['In RAM belonging to the spreadsheet process, and nowhere else', true],
          ['In the file on the SSD, which is updated as each cell changes', false],
          ['In the CPU cache, which keeps any data edited in the last hour', false],
          ['In the OS\'s file cache, which writes edits to disk each minute', false]],
        'Until the program writes the file, the edits exist only in its memory. The OS file cache holds data the program has already asked to write, and nothing was.'),
      mcq('You type `print(2 + 3)` into a Python file and run it. Which order of events is right?',
        [['Source → bytecode → CPython runs it → a system call sends 5 out', true],
          ['Source → the CPU reads the text directly → 5 appears on screen', false],
          ['Source → machine code saved as an .exe → Windows runs the .exe', false],
          ['Source → the OS evaluates 2 + 3 → Python displays the returned 5', false]],
        'CPython compiles the file to bytecode and executes it; printing asks the OS to write to the terminal. The CPU never reads source text, and no executable file is produced.'),
      mcq('A phone camera takes a photo, and after a restart it is still in the gallery. Which order of stages took place?',
        [['Input, processing, storage, and output when the gallery shows it', true],
          ['Output, processing, input, and storage when the gallery shows it', false],
          ['Storage, input, processing, and output when the gallery shows it', false],
          ['Input, output, processing, and storage when the gallery shows it', false]],
        'The sensor provides input, the processor turns it into image data, the image is written to flash so it survives the restart, and the gallery later outputs it.'),
      mcq('A 12 MB song file on a phone is played. Which description of its data is accurate?',
        [['Bytes read from flash into RAM are interpreted as sound samples', true],
          ['The song is streamed from flash directly to the speaker as text', false],
          ['The bytes are compiled into machine code before they are played', false],
          ['The CPU registers hold the whole song while it is being played', false]],
        'The player reads the file through the OS into its memory and interprets the bytes as audio. A song is data, not a program, and registers hold only a few values.'),
    ],
    checkpoint: [
      mcq('You open a PDF, read it, and close it without changing anything. What has been written to its file on storage?',
        [['Nothing; opening and reading only copies bytes into RAM', true],
          ['A new copy, since every opened file is saved again on close', false],
          ['The pages you viewed, which the reader stores for next time', false],
          ['A lock marker that remains in the file until the next reboot', false]],
        'Reading a file copies its bytes into the program\'s memory and leaves the file on the drive untouched.', H),
      mcq('A laptop slows to a crawl while copying a 30 GB folder to an old USB hard disk, yet the CPU is almost idle. Where is the bottleneck?',
        [['The drive, which cannot accept data as fast as it is supplied', true],
          ['The CPU, which must translate every byte into machine code', false],
          ['RAM, since the whole 30 GB folder is loaded into it first', false],
          ['The OS scheduler, which gives the copy no CPU time at all', false]],
        'An idle CPU means the machine is waiting, not calculating. A slow mechanical drive at the end of a USB cable is the resource at its limit.', A),
      mcq('A program\'s loop counter is updated millions of times a second. Where is that value most likely kept while the loop runs?',
        [['In a CPU register, or in cache very close to the processor', true],
          ['On the SSD, which records each update as the loop progresses', false],
          ['In the OS kernel, which counts iterations for every program', false],
          ['In the graphics card, which handles any repeated arithmetic', false]],
        'A value used that often stays at the top of the memory hierarchy. Anything slower would make each iteration wait.', A),
    ],
  },
  {
    unitCode: 'T_HARDWARE_DEBUGGING',
    notes: `"The computer is slow" is a symptom, not a diagnosis. Reinstalling software, restarting at
random or buying more RAM sometimes helps by luck. The reliable method is to find which resource is
at its limit and what is using it.

**The four resources, and what running out of each looks like:**

- **CPU.** One process near the top of the list using a full core, fans loud. Often a program stuck
  in a loop, or genuinely heavy work such as a video export.
- **Memory.** RAM close to full and the drive busy at the same time. The OS is **swapping**: moving
  memory it cannot fit out to the drive and back again. Because a drive is far slower than RAM, the
  whole machine becomes sluggish, not just slightly slower.
- **Storage.** Drive activity at or near 100% for long periods, often on an old hard disk during
  start-up or a large copy.
- **Network.** CPU, memory and disk all quiet, yet a page or download crawls. The machine is
  waiting for data to arrive.

**The method.**

1. **Describe the symptom precisely.** Slow always, or after twenty minutes? Every program, or one?
   Only on first launch?
2. **Measure.** Task Manager on Windows, Activity Monitor on macOS, or \`top\` on Linux shows CPU,
   memory, disk and network use per process.
3. **Find the resource at its limit**, then the process responsible.
4. **Form one hypothesis, change one thing, and measure again.** If the numbers do not move, the
   hypothesis was wrong.

**Worked symptom → cause examples.**

- **Everything slow; memory 96%, disk 100%, CPU 20%.** RAM is exhausted and the system is swapping.
  Forty browser tabs are holding 6 GB. Close them and the disk goes quiet. More RAM would help
  here, because memory genuinely is the limit.
- **A game is smooth for ten minutes, then the frame rate halves, and the reported CPU speed has
  dropped from 4.1 to 2.0 GHz.** **Thermal throttling**: the processor slows itself to limit heat.
  Blocked vents or dust are the usual cause, not a software fault.
- **A Python script never finishes; on an 8-core Windows machine it shows about 12.5% CPU.** Task
  Manager reports a share of all cores, and one core flat out is one eighth of eight. The script is
  stuck in a loop on a single core. In \`top\` on Linux the same process shows about 100%, because
  there 100% means one whole core.
- **An app is slow only on its first launch after a reboot.** Its files are being read from storage;
  afterwards the OS has them cached in RAM. Normal, unless the drive is failing.

**A common misconception: slow means the processor is too weak.** In practice a nearly idle CPU is
very common on a slow machine. If the processor is not busy, a faster one will not help; the machine
is waiting on memory, storage or the network.`,
    mcqs: [
      mcq('A laptop becomes slow; Task Manager shows memory at 97%, the disk at 100% and the CPU at 20%. The most likely cause is:',
        [['RAM is full, so the OS is swapping memory to and from the disk', true],
          ['The CPU is too slow, so tasks queue up while waiting to be run', false],
          ['The disk is failing, so reads are being retried again and again', false],
          ['A virus is using the disk, since normal programs use the CPU', false]],
        'High memory with high disk activity is the signature of swapping. The CPU at 20% rules out a processor bottleneck.'),
      mcq('A gaming laptop runs smoothly for ten minutes, then its frame rate halves while the reported CPU speed drops from 4.1 to 2.0 GHz. The likely cause is:',
        [['Thermal throttling, as the chip slows itself down to limit heat', true],
          ['A memory leak, as the game has used up the RAM it started with', false],
          ['The graphics driver has crashed and the CPU is drawing frames', false],
          ['A power plan lowers speed after ten minutes to save battery', false]],
        'A processor that is hot reduces its own clock speed to protect itself. A falling GHz figure after sustained load points straight at heat.'),
      mcq('On an 8-core Windows machine, a Python script stuck in an infinite loop shows about 12.5% CPU. Why not 100%?',
        [['Task Manager shows a share of all cores, and the script uses one', true],
          ['Python limits every script to one-eighth of the processor time', false],
          ['The loop is waiting on the disk for most of every second it runs', false],
          ['Windows throttles programs once it detects an infinite loop', false]],
        'One core at full load is 100% ÷ 8 = 12.5% of the whole processor. The number is a clue that one core is flat out, not that the script is idle.'),
      mcq('A web page takes 30 seconds to load, yet CPU, memory and disk are all nearly idle. The next thing to examine is:',
        [['The network, because the machine is waiting for data to arrive', true],
          ['The CPU cache, because idle readings hide how full the cache is', false],
          ['The SSD, since idle disk activity means it has stopped working', false],
          ['The RAM modules, because low usage suggests one has failed', false]],
        'When every local resource is quiet, the machine is waiting on something outside it. Idle readings mean those parts are not the bottleneck.'),
    ],
    checkpoint: [
      mcq('A friend says their slow laptop needs Windows reinstalling. What should be done before any reinstall?',
        [['Measure which resource is at its limit, and which process uses it', true],
          ['Replace the processor, since slowness is nearly always the CPU', false],
          ['Delete temporary files, which fixes most slow machines outright', false],
          ['Buy more RAM, which speeds up every machine whatever the cause', false]],
        'Without a measurement every fix is a guess. Knowing the saturated resource and the process tells you what to change.', H),
      mcq('Why does a machine that has run out of RAM become far slower, rather than just slightly slower?',
        [['Swapped memory must come back from a drive, far slower than RAM', true],
          ['The CPU halves its clock speed whenever the RAM is completely full', false],
          ['The OS closes and reopens each program every time memory is needed', false],
          ['Programs must recompile themselves to fit into the RAM that remains', false]],
        'Reads from even a fast SSD take hundreds to thousands of times longer than reads from RAM, so every swapped page costs a large delay.', A),
      mcq('A program is slow only the first time it opens after a reboot. What does that point to?',
        [['Its files are read from storage until the OS has them cached in RAM', true],
          ['The processor has not yet warmed up to its full operating speed', false],
          ['The program is being compiled again each time the machine boots', false],
          ['The SSD must spin up to full speed after the machine has restarted', false]],
        'After a reboot the OS file cache is empty, so the first launch reads from the drive. An SSD has nothing to spin up.', A),
    ],
  },

  /* ─────────────────────────────── T_NUMBER_SYSTEMS ─────────────────────────────── */
  {
    unitCode: 'T_NUMBER_SYSTEMS_WHY_BINARY',
    notes: `Computers count in twos because building reliable circuits that distinguish two states is
easy, and building ones that distinguish ten is not.

**Two states survive noise.** In a circuit powered at 3.3 V, a common rule reads anything above
about 2 V as 1 and anything below about 0.8 V as 0. A signal meant to be 3.3 V that arrives at
2.9 V, because of interference or a long wire, is still clearly a 1. Now imagine ten levels on the
same wire to represent the digits 0 to 9: they would be only about a third of a volt apart, and the
same interference would turn a 7 into a 6. Every stage of a circuit would have to measure voltages
precisely, instead of just deciding high or low.

**Two states are what switches do.** A transistor used as a switch is either conducting or not.
Billions of them on one chip, each only ever on or off, are cheap to make and fast to change.

**Two states match logic.** True and false, AND, OR and NOT map directly onto on and off, which is
how arithmetic can be built out of logic gates.

**Binary was not the only choice ever tried.** ENIAC, one of the first electronic computers, stored
decimal digits. Binary won because it was more reliable and simpler to build, not because another
base is mathematically impossible.

**Place value, in any base.** You already know decimal: in 305, the 3 means three hundreds, because
each place is worth ten times the place to its right.

    decimal places:   ... 1000  100  10  1
    binary places:    ...    8    4   2  1

Binary works the same way with two digits, 0 and 1, and each place worth **twice** the place to its
right. The rightmost place is worth 1, then 2, 4, 8, 16 and so on. A binary digit is called a
**bit**.

**How many patterns do n bits give?** One bit: 2 (0, 1). Two bits: 4 (00, 01, 10, 11). Three bits:
8. Every extra bit doubles the count, which is why the sizes you meet in computing — 256, 1024,
65,536 — are powers of two.

**A common misconception: computers use binary because binary arithmetic is faster.** Binary is
chosen for reliable physical representation. Given a reliable ten-level circuit, decimal arithmetic
would be perfectly possible; nobody has found one that is as cheap, fast and robust.

**Why it matters.** Once you accept that everything is built from two states, the rest of this
topic — conversion, hexadecimal, fixed sizes and negative numbers — is just learning to read those
states the way the machine does.`,
    mcqs: [
      mcq('Why do digital circuits use two voltage levels rather than ten?',
        [['Two widely separated levels are easy to tell apart despite noise', true],
          ['Binary arithmetic needs fewer steps than decimal for every sum', false],
          ['Ten levels would require ten times as much electricity to run', false],
          ['Early programmers found 0 and 1 easier to write than 0 to 9', false]],
        'The choice is about physical reliability: small voltage errors cannot turn a clear high into a low.'),
      mcq('In a 3.3 V circuit, a signal meant to be 1 arrives at 2.9 V because of interference. How is it read?',
        [['As 1, because it is still well above the threshold for a high', true],
          ['As 0, because any voltage lower than 3.3 V counts as low', false],
          ['As an error, since only exactly 3.3 V is accepted as a 1', false],
          ['As a value between 0 and 1, of roughly 0.88', false]],
        'A digital input decides high or low against thresholds. Anything comfortably above the high threshold is a 1, which is exactly what makes binary robust.'),
      mcq('How many different patterns can three bits make?',
        [['8', true], ['6', false], ['3', false], ['9', false]],
        'Each bit doubles the number of patterns: 2 × 2 × 2 = 8, from 000 to 111.'),
      mcq('In the decimal numeral 305, what does the 3 stand for?',
        [['Three hundreds, as each place is worth ten times the next', true],
          ['Three units, as the digit is read on its own like any other', false],
          ['Three tens, since the zero between them adds nothing', false],
          ['Three thousands, counting the places from the left', false]],
        'Place value: the 3 is in the hundreds place, and the zero holds the tens place empty. Binary uses exactly the same idea with powers of two.'),
    ],
    checkpoint: [
      mcq('Was binary the only possible choice for building an electronic computer?',
        [['No; decimal machines were built, but binary proved more reliable', true],
          ['Yes; electronic circuits cannot represent more than two states', false],
          ['Yes; mathematics proves no other base can support calculation', false],
          ['No; but only binary can store text, so decimal was abandoned', false]],
        'ENIAC stored decimal digits. Binary won on reliability and cost, not because other bases were impossible.'),
      mcq('Each binary place is worth how much compared with the place to its right?',
        [['Twice as much', true], ['Ten times as much', false], ['One more', false], ['Half as much', false]],
        'The places are 1, 2, 4, 8, 16 and so on. Ten times as much is the rule for decimal.'),
      mcq('A designer proposes storing each decimal digit as one of ten voltage levels on a wire. What is the main practical problem?',
        [['Neighbouring levels are so close that small noise changes the digit', true],
          ['The wire could only ever store the digits 0 to 9 and no letters', false],
          ['Decimal digits cannot be added by any kind of electronic circuit', false],
          ['A ten-level wire would store less information than a binary one', false]],
        'Squeezing ten levels into the same voltage range leaves little margin between them, so interference that binary shrugs off would corrupt the data.'),
    ],
  },
  {
    unitCode: 'T_NUMBER_SYSTEMS_BINARY_DECIMAL',
    notes: `Converting between binary and decimal is a skill of speed as much as understanding. Learn
the place values by heart, then both directions become quick.

    place value:  128   64   32   16    8    4    2    1

**Binary to decimal: add the places that hold a 1.**

    1 0 1 1 0 1 1 0
    128 + 32 + 16 + 4 + 2 = 182

Write the place values above the bits, starting from the RIGHT with 1, and add those under a 1.

**Decimal to binary, method 1: take away the largest place that fits.** For 45: 32 fits (13 left),
16 does not, 8 fits (5 left), 4 fits (1 left), 2 does not, 1 fits (0 left). Mark each place used
with 1 and each skipped place with 0, from 32 down: \`101101\`.

**Decimal to binary, method 2: divide by two and keep the remainders.**

    45 ÷ 2 = 22 remainder 1
    22 ÷ 2 = 11 remainder 0
    11 ÷ 2 =  5 remainder 1
     5 ÷ 2 =  2 remainder 1
     2 ÷ 2 =  1 remainder 0
     1 ÷ 2 =  0 remainder 1

Read the remainders from the **bottom up**: \`101101\`. The first remainder is the rightmost bit.
Reading them top-down gives the bits in reverse, which is the most common mistake in this method.

**Checks that catch errors without redoing the work:**

- **Odd or even.** The last bit is 1 exactly when the number is odd, because every other place is a
  multiple of two. 45 is odd, and \`101101\` ends in 1.
- **Range.** n bits hold at most 2ⁿ − 1, so 8 bits reach 255. A conversion of 300 into 8 bits is
  wrong before you start.
- **Doubling.** Adding a 0 on the right doubles the value: \`101\` is 5 and \`1010\` is 10.

**A common misconception.** Reading \`1010\` as "one thousand and ten". Written without context,
\`10\` could mean ten or two, which is why code marks binary with a prefix: \`0b1010\` in Python is
the value ten.

**Checking your answer in Python.** \`bin(45)\` gives \`'0b101101'\`, and \`int('101101', 2)\` gives
\`45\`. Use them to check practice, not to replace it; exams and interviews expect it by hand.`,
    workedExample: `**Goal: convert 200 to binary both ways, then convert it back.**

Subtraction: 128 fits (72 left). 64 fits (8 left). 32 does not. 16 does not. 8 fits (0 left). 4, 2
and 1 do not. Writing 1 for each place used, from 128 down: \`11001000\`.

Division: 200 ÷ 2 = 100 r 0; 100 ÷ 2 = 50 r 0; 50 ÷ 2 = 25 r 0; 25 ÷ 2 = 12 r 1; 12 ÷ 2 = 6 r 0;
6 ÷ 2 = 3 r 0; 3 ÷ 2 = 1 r 1; 1 ÷ 2 = 0 r 1. Reading the remainders from the bottom up: \`11001000\`.
The two methods agree.

Back to decimal: the 1s are in the 128, 64 and 8 places, and 128 + 64 + 8 = 200.

Checks: 200 is even and the last bit is 0; 200 is below 255, so eight bits are enough.`,
    mcqs: [
      mcq('What is the binary number 1101 in decimal?',
        [['13', true], ['11', false], ['1101', false], ['14', false]],
        'The 1s sit in the 8, 4 and 1 places, so 8 + 4 + 1 = 13. Eleven would be 1011.'),
      mcq('What is 37 written in binary?',
        [['100101', true], ['101001', false], ['100111', false], ['110101', false]],
        '37 = 32 + 4 + 1, so the 32, 4 and 1 places hold a 1. 101001 is the same bits reversed, which is 41.'),
      mcq('Converting 12 by repeated division by two gives the remainders 0, 0, 1, 1, in the order they were produced. What is 12 in binary?',
        [['1100', true], ['0011', false], ['1010', false], ['0110', false]],
        'The first remainder is the rightmost bit, so read them from last to first: 1100, which is 8 + 4 = 12. Reading them in order gives 0011, which is 3.'),
      mcq('Without converting it fully, how can you tell that 1011010 is an even number?',
        [['Its last bit is 0, and every other place is a multiple of two', true],
          ['It has an even number of 1s, which always makes a number even', false],
          ['Its first bit is 1, which marks every even number in binary', false],
          ['It has seven digits, and any odd-length binary number is even', false]],
        'Only the 1s place can make a number odd. The count of 1s is irrelevant: 11 in binary has two 1s and is 3.'),
    ],
    checkpoint: [
      mcq('What is 11111111 in decimal?',
        [['255', true], ['256', false], ['128', false], ['8', false]],
        '128 + 64 + 32 + 16 + 8 + 4 + 2 + 1 = 255, one less than 256, the next power of two.'),
      mcq('Appending a 0 to the right of any binary number does what to its value?',
        [['Doubles it', true], ['Multiplies it by ten', false], ['Adds one to it', false], ['Leaves it unchanged', false]],
        'Every existing bit moves one place left, into a place worth twice as much. In decimal, appending a 0 multiplies by ten for the same reason.'),
      mcq('What is 150 written in binary?',
        [['10010110', true], ['01101001', false], ['10010111', false], ['10100110', false]],
        '150 = 128 + 16 + 4 + 2. 01101001 is those bits reversed (105), 10010111 is 151, and 10100110 is 166.'),
    ],
  },
  {
    unitCode: 'T_NUMBER_SYSTEMS_HEX',
    notes: `Binary is how the machine stores numbers, but long strings of bits are hard for people to
read. **Hexadecimal** (base 16) is the shorthand programmers use for them.

**Sixteen digits.** Hex needs sixteen symbols, so after 0 to 9 it uses A to F:

    hex:     0 1 2 3 4 5 6 7 8 9  A  B  C  D  E  F
    decimal: 0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15

**The key fact: one hex digit is exactly four bits.** Four bits have 16 patterns and hex has 16
digits, so each hex digit stands for one four-bit group, with no arithmetic across groups:

    0000 0   0100 4   1000 8   1100 C
    0001 1   0101 5   1001 9   1101 D
    0010 2   0110 6   1010 A   1110 E
    0011 3   0111 7   1011 B   1111 F

**Binary to hex: group four bits at a time, starting from the right.**

    11010110  →  1101 0110  →  D6

If the leftmost group is short, pad it with 0s on the left: \`101101\` becomes \`0010 1101\`, which is
\`2D\`. Grouping from the left instead gives \`1011 01\`, a wrong answer, and is the commonest mistake.

**Hex to binary:** replace each digit with its four bits. \`0x3F\` is \`0011 1111\`.

**Hex to decimal: place values are powers of 16.** \`0xD6\` = 13 × 16 + 6 = 214. Check against the
binary: 128 + 64 + 16 + 4 + 2 = 214.

**Why programmers use it.** A byte is always exactly two hex digits, from \`00\` to \`FF\` (0 to 255),
and you can see the bits at a glance. Decimal hides them: nobody can see the bits of 214 without
working them out.

- **Colours.** \`#FF8800\` is three bytes: red \`FF\` (255), green \`88\` (136), blue \`00\` (0), an
  orange.
- **Memory addresses**, shown in debuggers as values such as \`0x7ffd4a2c\`.
- **Byte dumps, hardware addresses and error codes**, all written as pairs of hex digits.

**Prefixes.** Because \`10\` could mean ten, sixteen or two, code marks the base: \`0x10\` is hex
(sixteen), \`0b10\` binary (two), and a CSS colour uses \`#\`.

**A common misconception: hex is a different kind of data.** It is only a way of writing a number.
\`0xFF\`, \`255\` and \`0b11111111\` are the same value, stored as the same bits.`,
    mcqs: [
      mcq('What is the binary value 1011 1110 written in hex?',
        [['BE', true], ['EB', false], ['B14', false], ['1110', false]],
        '1011 is B and 1110 is E, in the same order as the bits. EB swaps the groups, and B14 writes the decimal value of the second group.'),
      mcq('The CSS colour #00FF00 describes which colour?',
        [['Pure green: no red, full green and no blue', true],
          ['Pure red: full red, no green and no blue', false],
          ['A mid grey, equal parts of every colour', false],
          ['Pure blue: no red, no green and full blue', false]],
        'The three byte pairs are red, green and blue in that order. Only the middle pair, green, is FF.'),
      mcq('Why do programmers write bytes in hex rather than in decimal?',
        [['Each hex digit is exactly four bits, so bits can be read off at sight', true],
          ['Hex values take less memory in RAM than the same values in decimal', false],
          ['The processor can only execute numbers written in hexadecimal form', false],
          ['Hex can represent negative numbers, which decimal is unable to do', false]],
        'Hex is notation for people. The stored bits are identical whichever base is used to write the value.'),
      mcq('What is 0x3C in decimal?',
        [['60', true], ['312', false], ['42', false], ['51', false]],
        '3 × 16 + 12 = 60. Writing 3 then 12 side by side gives 312, and treating the 3 as tens gives 42.'),
    ],
    checkpoint: [
      mcq('Binary 101101 converted to hex is:',
        [['2D', true], ['B1', false], ['B4', false], ['45', false]],
        'Group from the right: 10 1101, padded to 0010 1101, which is 2D. Grouping from the left gives B1 or B4, and 45 is the value in decimal.'),
      mcq('How many hex digits are needed to write any 32-bit value?',
        [['8', true], ['4', false], ['16', false], ['32', false]],
        'Each hex digit covers four bits, and 32 ÷ 4 = 8.'),
      mcq('What does the colour #808080 look like?',
        [['A mid grey, with red, green and blue each at 128', true],
          ['A dark red, since 80 is the only channel value present', false],
          ['Near black, since 80 is small out of a maximum of 255', false],
          ['Bright white, since all three channels are the same', false]],
        '0x80 is 128, about half of 255, and equal red, green and blue make a grey. Reading 80 as decimal is what makes it seem dark.'),
    ],
  },
  {
    unitCode: 'T_NUMBER_SYSTEMS_BITS_AND_BYTES',
    notes: `A **bit** is one binary digit. A **byte** is eight bits, the unit memory and files are
measured in. Half a byte, four bits, is sometimes called a nibble, and is exactly one hex digit.

**How many values fit: n bits give 2ⁿ patterns.** As unsigned whole numbers they run from 0 to
2ⁿ − 1.

    bits   patterns                  unsigned range
    1      2                         0 to 1
    8      256                       0 to 255
    16     65,536                    0 to 65,535
    24     16,777,216                0 to 16,777,215
    32     4,294,967,296             0 to 4,294,967,295
    64     about 1.8 × 10^19         0 to 2^64 − 1

Each extra bit doubles the count. Those numbers turn up everywhere once you know them: a byte holds
0 to 255, which is why each colour channel stops at 255; 24-bit colour gives 16,777,216 colours;
IPv4 addresses are 32 bits, so there are about 4.3 billion of them.

**Sizes of files and memory: two sets of units.**

- **Decimal (SI) units**, used by drive makers and network speeds: 1 kB = 1,000 bytes,
  1 MB = 1,000,000 bytes, 1 GB = 10^9 bytes.
- **Binary units**: 1 KiB = 1,024 bytes, 1 MiB = 1,024² = 1,048,576 bytes,
  1 GiB = 1,024³ = 1,073,741,824 bytes.

Windows measures in binary units but labels them "GB". So a "500 GB" drive, 500 × 10^9 bytes, is
shown as about 465 GB: 500,000,000,000 ÷ 1,073,741,824 ≈ 465.7. Nothing is missing; two
programs are counting in different units.

**Bits versus bytes in speeds.** Network speeds are quoted in bits per second (Mbps), and file
sizes in bytes (MB). Divide by 8: a 100 Mbps connection moves at most 12.5 MB of data a second.
The lower-case b is bits and upper-case B is bytes, and confusing them is out by a factor of eight.

**A common misconception: a kilobyte is always 1,024 bytes.** Both conventions are in use. When the
exact number matters — allocating memory, sizing a buffer — check which one a tool means.

**Why it matters.** Fixed sizes decide what a value can hold. A field declared as one byte cannot
store 300, a 16-bit counter cannot count past 65,535, and a size that is out by a factor of 8 or of
1,024 is a bug that tests on small data never reveal.`,
    mcqs: [
      mcq('How many different values can a 10-bit number represent?',
        [['1,024', true], ['1,000', false], ['20', false], ['1,023', false]],
        '2¹⁰ = 1,024 patterns. The largest unsigned value is 1,023, one less, because counting starts at 0.'),
      mcq('A broadband plan advertises 200 Mbps. Roughly how fast will a large file download, in megabytes per second?',
        [['25 MB per second', true], ['200 MB per second', false], ['1,600 MB per second', false], ['20 MB per second', false]],
        'Mbps is megabits. Eight bits make a byte, so 200 ÷ 8 = 25 MB per second at most.'),
      mcq('A new "1 TB" drive shows about 931 GB in Windows. Why?',
        [['The maker counts powers of 1,000 and Windows counts powers of 1,024', true],
          ['About 7% of the drive is reserved to hold the file system itself', false],
          ['The drive is faulty and part of its storage has already been lost', false],
          ['Windows hides the space used by the recycle bin from the totals', false]],
        '10^12 bytes ÷ 1,073,741,824 bytes per GiB ≈ 931. The whole difference is the unit, not reserved or lost space.'),
      mcq('What is the largest value an unsigned 16-bit number can hold?',
        [['65,535', true], ['65,536', false], ['32,767', false], ['16,000', false]],
        'Sixteen bits give 65,536 patterns, from 0 to 65,535. 32,767 is the largest value when one bit is used for the sign.'),
    ],
    checkpoint: [
      mcq('Adding one bit to an unsigned number\'s width does what to how many values it can hold?',
        [['Doubles it', true], ['Adds one more value', false], ['Adds 256 values', false], ['Multiplies it by eight', false]],
        'Every existing pattern can now appear with the new bit as 0 or as 1, so the count doubles.'),
      mcq('Each pixel of an image uses 24 bits for its colour. How many distinct colours are possible?',
        [['16,777,216', true], ['16,777,215', false], ['72', false], ['24', false]],
        '2²⁴ = 16,777,216 patterns, each a different colour. 16,777,215 is the largest value, which is one less than the number of values.'),
      mcq('A 4 MB photo is sent over a 16 Mbps connection. Ignoring overhead, about how long does it take?',
        [['2 seconds', true], ['0.25 seconds', false], ['4 seconds', false], ['32 seconds', false]],
        '4 MB is 32 megabits, and 32 ÷ 16 = 2 seconds. Treating MB and Mbps as the same unit gives 0.25 seconds, eight times too fast.'),
    ],
  },
  {
    unitCode: 'T_NUMBER_SYSTEMS_NEGATIVE_AND_OVERFLOW',
    notes: `A fixed number of bits has a fixed number of patterns. Storing negative numbers means
giving some of those patterns negative meanings, and every fixed width has an edge where the
numbers run out.

**The idea that does not work well: sign and magnitude.** Use the top bit for the sign and the rest
for the size, so \`00000101\` is 5 and \`10000101\` is −5. It gives two zeros (\`00000000\` and
\`10000000\`), and ordinary binary addition gives wrong answers when the signs differ.

**Two's complement: what every modern computer uses.** The top bit keeps its place value but
counts as **negative**. In 8 bits the places are:

    −128   64   32   16    8    4    2    1

So \`11111011\` = −128 + 64 + 32 + 16 + 8 + 2 + 1 = −5, and \`11111111\` = −1.

**Negating a number: invert every bit, then add 1.**

    5          00000101
    invert     11111010
    add 1      11111011    = −5

Doing it again returns to 5. A number is negative exactly when its top bit is 1.

**Why this scheme wins.** There is only one zero, and the same adder circuit adds signed and unsigned
numbers alike: 5 + (−5) is \`00000101\` + \`11111011\` = \`1 00000000\`, and the carry out of the top
bit is discarded, leaving 0.

**Ranges.** With n bits, two's complement holds −2ⁿ⁻¹ to 2ⁿ⁻¹ − 1. There is one more negative value
than positive, because zero takes a pattern with a 0 top bit.

    8 bits    −128 to 127
    16 bits   −32,768 to 32,767
    32 bits   −2,147,483,648 to 2,147,483,647

**Overflow: when the result does not fit.** The bits wrap around.

- **Unsigned:** 255 + 1 in 8 bits is \`11111111\` + 1 = \`1 00000000\`; the ninth bit is lost, leaving 0.
  How the adder loses it is covered in the Boolean topic.
- **Signed:** 127 + 1 is \`01111111\` + 1 = \`10000000\`, which reads as **−128**. Two positives have
  produced a negative.

**Why a counter goes negative.** A 32-bit signed view counter at 2,147,483,647 that receives one
more view becomes −2,147,483,648. YouTube met exactly this in 2014, when one video passed that
count and the counter was moved to 64 bits. Unix time stored as a signed 32-bit count of seconds
since 1970 overflows in January 2038, for the same reason.

**What languages do.** Java's \`int\` wraps silently as shown. In C, signed overflow is undefined
behaviour, so the compiler is allowed to assume it never happens, while unsigned arithmetic wraps.
Python's integers grow to use as many bits as a value needs, so plain Python never overflows — but
fixed-width types, such as NumPy arrays of int32, still do.

**A common misconception: overflow causes an error.** In most languages the hardware simply keeps
the bits that fit, and the program carries on with a wrong number. Nothing stops unless you check.`,
    mcqs: [
      mcq('In 8-bit two\'s complement, what value does 11111110 represent?',
        [['−2', true], ['254', false], ['−126', false], ['−1', false]],
        '−128 + 64 + 32 + 16 + 8 + 4 + 2 = −2. 254 is the unsigned reading, and −126 is the sign-and-magnitude reading.'),
      mcq('What is −12 in 8-bit two\'s complement?',
        [['11110100', true], ['10001100', false], ['11110011', false], ['11101100', false]],
        '12 is 00001100; inverting gives 11110011 and adding 1 gives 11110100. 10001100 is sign and magnitude, and 11110011 forgets to add the 1.'),
      mcq('An 8-bit signed counter holds 127 and is incremented, wrapping in two\'s complement. What does it hold now?',
        [['−128', true], ['128', false], ['0', false], ['−127', false]],
        '01111111 + 1 = 10000000, and with the top place worth −128 that pattern is −128. The value 128 does not exist in 8-bit signed.'),
      mcq('Why is two\'s complement used instead of sign and magnitude for negative numbers?',
        [['One adder works for both signs, and there is only one zero', true],
          ['It stores larger positive values in the same number of bits', false],
          ['It keeps the sign in a separate bit, so it is easier to read', false],
          ['It needs one bit fewer, since the sign is implied by the value', false]],
        'Sign and magnitude has two zeros and needs special handling to add mixed signs. Both schemes reach the same largest positive value, 127 in 8 bits.'),
    ],
    checkpoint: [
      mcq('What range of values can a 16-bit two\'s complement integer hold?',
        [['−32,768 to 32,767', true], ['−32,767 to 32,767', false], ['0 to 65,535', false], ['−65,536 to 65,535', false]],
        '−2¹⁵ to 2¹⁵ − 1. The extra negative value exists because zero uses one of the patterns with a 0 top bit; 0 to 65,535 is the unsigned range.'),
      mcq('A Java program adds two large positive int values and prints a negative total. What happened?',
        [['The sum passed the int maximum and wrapped into the negative range', true],
          ['Java treats very large sums as negative to flag them as errors', false],
          ['One of the values was secretly negative before the addition', false],
          ['The processor ran out of cache while adding such large numbers', false]],
        'Java\'s int is 32-bit two\'s complement. Past 2,147,483,647 the top bit becomes 1, and the pattern reads as negative.'),
      mcq('Adding 2,147,483,647 and 1 in plain Python gives 2,147,483,648 with no problem. Why?',
        [['Python integers grow to use as many bits as the value needs', true],
          ['Python stores every integer in 64 bits, which never overflow', false],
          ['Python detects the overflow and silently corrects the result', false],
          ['Python stores numbers as decimal text instead of in binary', false]],
        'Python\'s int has no fixed width. A 64-bit integer would handle this sum but could still overflow; Python\'s integers cannot.'),
    ],
  },
  {
    unitCode: 'T_NUMBER_SYSTEMS_PRACTICE',
    notes: `No new ideas. Everything here uses place value, conversion between binary, decimal and
hex, sizes and units, two's complement and overflow. The goal is speed with accuracy, and the habit
of checking an answer before trusting it.

**The method, for every question:**

1. **Identify the base and the width.** Look for a prefix: \`0b\` is binary, \`0x\` or \`#\` is hex, no
   prefix is usually decimal. Note whether the value is 8, 16 or 32 bits, and whether it is signed.
2. **Write the place values** above the digits: 128 down to 1 for a byte, powers of 16 for hex, and
   −128 in the top place when an 8-bit value is signed.
3. **Convert the quickest way.** Binary to hex and back by four-bit groups, from the right. Decimal
   to binary by subtracting the largest place that fits.
4. **Check before moving on.** Use at least one of the checks below.

**The checklist that catches most lost marks:**

- The last bit of an odd number is 1.
- An unsigned n-bit value is at most 2ⁿ − 1: 255 for 8 bits, 65,535 for 16.
- A signed value whose top bit is 1 is negative.
- Group hex digits from the right, padding the leftmost group with 0s.
- Remainders in the division method are read from the bottom up.
- Two's complement negation is invert AND add 1.
- Mbps is bits; MB is bytes; divide by 8.
- A GiB is 1,073,741,824 bytes; a GB may mean 10^9. Check which the question uses.
- Wrap-around: an unsigned 8-bit result is the true result minus 256 when it exceeds 255.

**Checking with Python.** \`bin(n)\`, \`hex(n)\` and \`int(text, base)\` confirm a hand answer:
\`int('ff', 16)\` is 255 and \`hex(255)\` is \`'0xff'\`. For signed 8-bit wrap-around,
\`(n + 128) % 256 - 128\` gives the value an 8-bit signed variable would hold. Work by hand first;
the tools are for checking.`,
    mcqs: [
      mcq('A sensor sends the byte 0xA7. What is it as an unsigned decimal value?',
        [['167', true], ['107', false], ['177', false], ['−89', false]],
        '10 × 16 + 7 = 167. Writing A as 10 next to 7 gives 107, and −89 is the signed reading of the same byte.'),
      mcq('A game stores a score in an unsigned 8-bit value. The score is 250 and the player gains 10 points. What is stored?',
        [['4', true], ['260', false], ['255', false], ['−6', false]],
        '260 does not fit in 8 bits, so it wraps: 260 − 256 = 4. The value does not stop at 255; the extra bit is simply lost.'),
      mcq('Which Python expression checks that the binary value 110010 is 50?',
        [['`int(\'110010\', 2)`', true], ['`int(\'110010\')`', false], ['`bin(110010)`', false], ['`hex(\'110010\')`', false]],
        'int with base 2 reads the text as binary and gives 50. Without the base it reads decimal one hundred and ten thousand and ten, and bin converts the other way.'),
      mcq('A value is logged as 0x1F4. Written in binary, it is:',
        [['0001 1111 0100', true], ['0001 1111 0010', false], ['0100 1111 0001', false], ['0001 1110 0100', false]],
        'Replace each hex digit with its four bits: 1 is 0001, F is 1111, 4 is 0100. That is 256 + 128 + 64 + 32 + 16 + 4 = 500.'),
      mcq('A file is exactly 3 GiB. How many bytes is that?',
        [['3,221,225,472', true], ['3,000,000,000', false], ['3,072,000,000', false], ['3,145,728,000', false]],
        'One GiB is 1,073,741,824 bytes, and three of them are 3,221,225,472. 3,000,000,000 would be 3 GB in decimal units.'),
    ],
    checkpoint: [
      mcq('An 8-bit signed reading from a temperature sensor is 11101100. What temperature does it report?',
        [['−20', true], ['236', false], ['−108', false], ['−19', false]],
        '−128 + 64 + 32 + 8 + 4 = −20. 236 is the unsigned reading, −108 the sign-and-magnitude reading, and −19 comes from inverting without adding 1.'),
      mcq('A classmate converts decimal 300 into an 8-bit unsigned byte. Which check shows at once that something is wrong?',
        [['An 8-bit unsigned value cannot exceed 255, so 300 does not fit', true],
          ['An even number must end in a 1 bit, which is easy to check', false],
          ['Each hex digit is eight bits, so 300 needs three hex digits', false],
          ['Values above 256 are always written as negatives in 8 bits', false]],
        'Eight bits reach at most 255, so no correct 8-bit answer exists. An even number ends in 0, and a hex digit is four bits.'),
      mcq('Which pair shows the same value written in two bases?',
        [['0x40 and 64', true], ['0x40 and 40', false], ['0b1000 and 16', false], ['0x10 and 10', false]],
        '0x40 is 4 × 16 = 64. 0x10 is sixteen rather than ten, and 0b1000 is eight.'),
    ],
  },
];
