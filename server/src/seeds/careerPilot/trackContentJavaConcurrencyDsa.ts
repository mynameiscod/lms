/**
 * Career-track content: Java concurrency and the JVM (JT_JAVA_CONCURRENCY) and DSA in Java over
 * linear structures (JT_JAVA_DSA_LINEAR).
 *
 * Concurrency is taught through what can actually happen when two threads run the code — the lost
 * update, the deadlock, the task that never ran — because that is what an interviewer probes and
 * what breaks in production. DSA is taught again in Java, because the years teach it in Python and
 * a Java candidate is asked to write Java: every concept unit names a classic problem, solves it in
 * full, and states its cost and edge cases.
 *
 * Attribution: JT_JAVA_CONCURRENCY is single-skill and names none. JT_JAVA_DSA_LINEAR is
 * multi-skill, so every checkpoint question names the one skill it measures, taken from its own
 * unit's skillKeys (or, for the closing units, from the topic's seven).
 *
 * The runner is Java 15: the two graded exercises use nothing newer, though the notes teach Java 17.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const CONCURRENCY: PilotBundle[] = [
  /* ══ JT_JAVA_CONCURRENCY — Java Concurrency ═════════════════════════════════════════════ */
  {
    unitCode: 'JT_JAVA_CONCURRENCY_THREADS',
    notes: `A **thread** is an independent path of execution inside one process. Every Java program starts
with one — the \`main\` thread — and can start more. Threads share the process's heap (its objects)
but each has its own stack (its local variables and call frames).

## Starting a thread

    Runnable job = () -> System.out.println("working on " + Thread.currentThread().getName());

    Thread t = new Thread(job, "worker-1");
    t.start();      // a NEW thread runs job.run()
    t.join();       // main waits here until worker-1 finishes
    System.out.println("done");

Pass a \`Runnable\` (the work) to a \`Thread\` (the worker) rather than extending \`Thread\`: the work
stays a plain object you can later hand to a thread pool, and your class is free to extend
something else.

## start() versus run()

\`start()\` asks the JVM to create a new thread and call \`run()\` on it. Calling \`run()\` yourself
is an ordinary method call: it executes on the **current** thread, and nothing runs in parallel.
Calling \`start()\` twice on the same \`Thread\` throws \`IllegalThreadStateException\` — a thread
object is single-use.

## Order is not guaranteed

    Thread a = new Thread(() -> System.out.println("A"));
    Thread b = new Thread(() -> System.out.println("B"));
    a.start(); b.start();

This can print \`A B\` or \`B A\`. The scheduler decides, and the answer can change between runs. If
order matters, you must enforce it — with \`join()\`, or by passing results, never by hoping.

## sleep and join

\`Thread.sleep(500)\` pauses the *current* thread for at least 500 ms. \`t.join()\` pauses the current
thread until \`t\` terminates. Both throw the checked \`InterruptedException\`, which is how another
thread asks this one to stop waiting. Do not swallow it silently: restore the flag with
\`Thread.currentThread().interrupt()\` or let it propagate.

## The lifecycle

\`Thread.getState()\` reports one of: **NEW** (created, not started), **RUNNABLE** (running or ready
to run), **BLOCKED** (waiting for a monitor lock), **WAITING** / **TIMED_WAITING** (in \`join\`,
\`wait\` or \`sleep\`), and **TERMINATED** (its \`run\` returned or threw).

## Daemon threads

The JVM exits when every **non-daemon** thread has finished. A thread marked
\`t.setDaemon(true)\` (before \`start()\`) does not keep the JVM alive — useful for background
housekeeping, dangerous for work that must complete.

## Common mistakes

- Calling \`run()\` and believing the work is concurrent.
- Reading a result the worker writes without \`join()\`ing first.
- Using \`sleep\` to "wait long enough" for another thread instead of \`join\`.`,
    workedExample: `**Goal: count words in two files at the same time, then print the total.**

    long[] counts = new long[2];
    Thread t1 = new Thread(() -> counts[0] = countWords("a.txt"));
    Thread t2 = new Thread(() -> counts[1] = countWords("b.txt"));
    t1.start(); t2.start();
    t1.join();  t2.join();
    System.out.println(counts[0] + counts[1]);

Each thread writes its own slot, so they never touch the same element. The two \`join()\` calls do
two jobs: main waits for the work, and \`join\` guarantees that everything the worker wrote is
visible to main afterwards (a *happens-before* edge). Remove the joins and main may print 0 — not
because the work failed, but because it had not finished, or its writes were not yet visible.`,
    mcqs: [
      mcq('In Java, what happens when you call t.run() on a Thread object instead of t.start()?',
        [['run() executes on the calling thread, so nothing runs in parallel', true], ['A new thread starts, exactly as with start()', false], ['The JVM throws IllegalThreadStateException, since the thread was never started', false], ['The thread is queued and runs after main ends', false]],
        'run() is an ordinary method call. Only start() asks the JVM to create a new thread, which then calls run() on that new thread.'),
      mcq('Two Java threads are started one after the other, each printing one letter. What can you say about the output order?',
        [['Either order is possible and can vary between runs', true], ['The thread started first always prints first, as start() runs in order', false], ['The thread created last always prints first', false], ['Both letters print on a single interleaved line', false]],
        'start() only makes a thread eligible to run; the OS scheduler decides when. Without join or another coordination tool there is no ordering guarantee.'),
      mcq('A Java program starts one daemon thread and one non-daemon thread, then main returns. When does the JVM exit?',
        [['When the non-daemon thread finishes', true], ['Immediately, as soon as main returns', false], ['Only when both threads have finished', false], ['When the daemon thread finishes', false]],
        'The JVM keeps running while any non-daemon thread is alive. Daemon threads do not hold it open and are stopped abruptly when it exits.'),
    ],
    checkpoint: [
      mcq('A Java Thread has been constructed but start() has not been called yet. What does getState() return?',
        [['NEW', true], ['RUNNABLE', false], ['WAITING', false], ['BLOCKED', false]],
        'A thread is NEW from construction until start() is called; only then does it become RUNNABLE.'),
      mcq('What happens if a Java program calls start() a second time on a Thread that has already finished?',
        [['It throws IllegalThreadStateException', true], ['The same Runnable runs again on a new thread', false], ['Nothing happens; the call is ignored', false], ['The thread restarts from its last line', false]],
        'A Thread object is single-use. Once started, starting it again throws; to run the work again, create a new Thread or use a pool.'),
      mcq('Main starts worker t, which fills a list, and main then prints the list size. Which call makes the print reliable?',
        [['t.join() before printing', true], ['Thread.sleep(100) before printing', false], ['t.run() after t.start()', false], ['Thread.yield() before printing', false]],
        'join waits for t to terminate and guarantees its writes are visible afterwards. sleep only guesses at timing and yield gives no guarantee at all.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_CONCURRENCY_SYNCHRONIZATION',
    notes: `When two threads read and write the same variable, the result can depend on timing. That is a
**race condition**, and the classic example is a counter.

## The lost update

    class Counter {
        private int count = 0;
        void increment() { count++; }
        int get() { return count; }
    }
    // two threads each call increment() 100_000 times

The result is often less than 200 000. \`count++\` is three steps: read \`count\`, add one, write it
back. If both threads read 41, both write 42, and one increment is lost. Nothing throws; the number
is simply wrong, and differently wrong on each run.

## synchronized

    synchronized void increment() { count++; }
    synchronized int get() { return count; }

Every object has a **monitor lock**. A \`synchronized\` instance method acquires the lock of
\`this\`; a \`synchronized static\` method acquires the lock of the \`Class\` object. Only one thread
can hold a given lock at a time, so the read-add-write now happens as one unit. Releasing a lock
also **publishes** the writes made while holding it to the next thread that acquires it — which is
why \`get()\` must be synchronized too.

A block lets you lock less, or lock a private object nobody else can grab:

    private final Object lock = new Object();
    void increment() { synchronized (lock) { count++; } }

## volatile

\`volatile boolean running\` guarantees **visibility**: a write by one thread is seen by the next
read in any thread. It does **not** make \`count++\` atomic. Use it for a flag one thread writes and
others read; use a lock (or an atomic) when a value is read and then written based on what was read.

## Deadlock

    // thread 1                       // thread 2
    synchronized (a) {                synchronized (b) {
        synchronized (b) { ... }          synchronized (a) { ... }
    }                                 }

Thread 1 holds \`a\` and waits for \`b\`; thread 2 holds \`b\` and waits for \`a\`. Neither can move,
forever. A deadlock needs a cycle of waiting, so break the cycle: **acquire locks in one global
order** (always \`a\` then \`b\`), hold locks for as short a time as possible, and never call unknown
code while holding one. \`ReentrantLock.tryLock(timeout)\` lets a thread give up instead of waiting
forever.

## Reentrancy

Java's monitors are **reentrant**: a thread holding a lock can enter another \`synchronized\` method
on the same object without blocking itself.`,
    workedExample: `**Goal: make a bank transfer between two accounts safe without deadlocking.**

    void transfer(Account from, Account to, long amount) {
        Account first  = from.id < to.id ? from : to;
        Account second = from.id < to.id ? to : from;
        synchronized (first) {
            synchronized (second) {
                from.balance -= amount;
                to.balance   += amount;
            }
        }
    }

Locking \`from\` then \`to\` looks natural, but transfer(A, B) and transfer(B, A) running together
would lock in opposite orders — a deadlock. Ordering by \`id\` means every thread locks the
lower-id account first, so no cycle of waiting can form. Both balances change under both locks, so
no thread ever sees money that is in neither account.`,
    mcqs: [
      mcq('Why can two threads each running count++ 1000 times on a shared int field finish with a total below 2000?',
        [['count++ is a read, an add and a write that can interleave', true], ['The int field overflows when two threads write it at the same moment', false], ['The JVM drops writes made by non-main threads', false], ['count++ is atomic, so the total is always exact', false]],
        'Both threads can read the same old value and both write old+1, so one increment disappears. The fix is a lock or an AtomicInteger.'),
      mcq('Which statement about the Java keyword volatile is correct?',
        [['It makes writes visible across threads but not count++ atomic', true], ['It makes every operation on the field atomic', false], ['It locks the field so one thread uses it at a time', false], ['It stops the field being cached or moved by the garbage collector', false]],
        'volatile is a visibility guarantee only. A read-modify-write such as count++ is still three steps that can interleave.'),
      mcq('Thread 1 locks A then B; thread 2 locks B then A. What is the standard way to make this deadlock impossible?',
        [['Make both threads acquire A before B', true], ['Mark both lock objects as volatile', false], ['Add Thread.sleep between the two locks', false], ['Give one thread a higher priority', false]],
        'Deadlock needs a cycle of waiting. A single global lock order removes the cycle; sleeping or priorities only change the odds.'),
    ],
    checkpoint: [
      mcq('A synchronized instance method and a synchronized static method in the same class run at once on two threads. Do they block each other?',
        [['No — one locks the instance, the other the Class object', true], ['Yes — all synchronized methods in a class share one lock', false], ['Yes — static methods lock every instance of the class', false], ['No — static methods cannot be synchronized at all', false]],
        'An instance method locks this; a static method locks ClassName.class. Different monitors, so they do not exclude each other.'),
      mcq('A thread inside synchronized method a() calls synchronized method b() on the same object. What happens?',
        [['It enters b() at once, because monitors are reentrant', true], ['It deadlocks, because it waits for a lock that it already holds itself', false], ['It throws IllegalMonitorStateException', false], ['It releases the lock for a() before entering b()', false]],
        'Java intrinsic locks are reentrant: the holder can acquire the same lock again, and the lock is released when the outermost block exits.'),
      mcq('A worker loops while (!stop) and another thread sets stop = true, yet the loop never ends. What is the smallest correct fix?',
        [['Declare the stop field volatile', true], ['Make the stop field static', false], ['Call Thread.yield() in the loop', false], ['Make the stop field final', false]],
        'Without volatile (or a lock) the worker may never see the write. volatile guarantees each read sees the latest write, which is all a one-writer flag needs.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_CONCURRENCY_EXECUTORS',
    notes: `Creating a \`Thread\` per task does not scale: threads are expensive to create, and a thousand of
them will exhaust memory. An **ExecutorService** keeps a pool of threads and feeds tasks to them.

## A fixed pool

    ExecutorService pool = Executors.newFixedThreadPool(4);
    try {
        pool.submit(() -> System.out.println("task on " + Thread.currentThread().getName()));
    } finally {
        pool.shutdown();
    }

Four threads serve every task submitted; extra tasks wait in the pool's queue.

## Callable and Future

A \`Runnable\` returns nothing. A \`Callable<T>\` returns a value and may throw a checked exception.
\`submit\` returns a \`Future<T>\` — a handle to a result that may not exist yet:

    Future<Integer> f = pool.submit(() -> slowSquare(12));
    // ... do other work ...
    int result = f.get();            // blocks until the task finishes

\`get()\` blocks. If the task threw, \`get()\` throws \`ExecutionException\`, with the original
exception as its cause — so a failing task is silent until somebody calls \`get()\`.
\`get(2, TimeUnit.SECONDS)\` gives up with \`TimeoutException\`.

## invokeAll

    List<Callable<Long>> jobs = List.of(() -> sum(1, 500), () -> sum(501, 1000));
    long total = 0;
    for (Future<Long> f : pool.invokeAll(jobs)) total += f.get();

\`invokeAll\` waits for every task and returns the futures **in the order the tasks were given**, so
the output is deterministic even though the tasks ran in parallel.

## Shutting down

\`shutdown()\` stops accepting tasks and lets queued ones finish. \`shutdownNow()\` interrupts the
running tasks and returns those never started. \`awaitTermination(timeout, unit)\` waits for the pool
to finish. A pool you never shut down keeps its non-daemon threads alive, and your program does not
exit.

## Which pool

- \`newFixedThreadPool(n)\` — bounded threads; for CPU work, n ≈ number of cores.
- \`newCachedThreadPool()\` — grows without limit; fine for short bursts, risky under load.
- \`newSingleThreadExecutor()\` — tasks run one at a time, in order.
- \`newScheduledThreadPool(n)\` — delayed and periodic tasks.

## CompletableFuture

\`CompletableFuture\` chains steps without blocking:

    CompletableFuture.supplyAsync(() -> fetchPrice("INFY"))
        .thenApply(p -> p * 1.18)
        .thenAccept(System.out::println);

\`supplyAsync\` runs on the common ForkJoinPool unless you pass an executor; \`thenApply\`
transforms, \`thenCombine\` joins two results, \`exceptionally\` recovers from failure, and \`join()\`
waits for the final value.`,
    workedExample: `**Goal: fetch three prices in parallel and print them in a fixed order.**

    ExecutorService pool = Executors.newFixedThreadPool(3);
    try {
        Future<Double> a = pool.submit(() -> fetch("INFY"));
        Future<Double> b = pool.submit(() -> fetch("TCS"));
        Future<Double> c = pool.submit(() -> fetch("WIPRO"));
        System.out.println(a.get() + " " + b.get() + " " + c.get());
    } finally {
        pool.shutdown();
    }

All three fetches start before any \`get()\` is called, so the total wait is roughly the slowest
fetch, not the sum. Reading the futures in a fixed order fixes the print order regardless of which
fetch finishes first. The \`finally\` makes sure the pool shuts down even if a \`get()\` throws.`,
    mcqs: [
      mcq('A task submitted to an ExecutorService throws an exception. When does the submitting code find out?',
        [['When it calls get() on the Future, as an ExecutionException', true], ['Immediately, from inside the submit() call', false], ['Never, since pools discard every task exception', false], ['When shutdown() is later called, wrapped as an InterruptedException', false]],
        'submit captures the exception in the Future. It surfaces only through get(), wrapped in ExecutionException with the original as its cause.'),
      mcq('What is the difference between shutdown() and shutdownNow() on an ExecutorService?',
        [['shutdown lets queued tasks finish; shutdownNow interrupts and drains them', true], ['shutdown interrupts running tasks at once; shutdownNow lets them all finish first', false], ['They are aliases and behave identically', false], ['shutdownNow waits for completion; shutdown returns at once', false]],
        'shutdown is graceful: no new tasks, existing ones complete. shutdownNow interrupts running tasks and returns the list never started.'),
      mcq('Why does pool.invokeAll(tasks) give deterministic output when you print each future result in turn?',
        [['Its futures come back in the same order as the tasks list', true], ['It runs the tasks one at a time on a single thread', false], ['It sorts the results before returning them', false], ['It only returns the futures of the tasks that completed successfully', false]],
        'The tasks still run in parallel, but the returned list matches the input order, so reading it in order prints in a fixed order.'),
    ],
    checkpoint: [
      mcq('main submits tasks to Executors.newFixedThreadPool(4) but never shuts the pool down. What happens when main returns?',
        [['The JVM keeps running, held open by the pool threads', true], ['The JVM exits and the pool threads are killed', false], ['The pool shuts itself down automatically after the last task finishes', false], ['An exception is thrown when main returns', false]],
        'Pool threads from Executors are non-daemon, so they keep the JVM alive waiting for more tasks. Always call shutdown, usually in finally.'),
      mcq('Which interface should a task implement if it must return a value to the code that submitted it?',
        [['Callable<T>', true], ['Runnable', false], ['Thread', false], ['Executor', false]],
        'Callable.call returns T and may throw checked exceptions; Runnable.run returns void. submit(Callable) gives back a Future<T> holding the value.'),
      mcq('In CompletableFuture.supplyAsync(() -> load()).thenApply(x -> x * 2), which pool runs load() if none is passed?',
        [['The common ForkJoinPool', true], ['A new thread created per call', false], ['The thread that called supplyAsync', false], ['A cached pool owned by the JVM', false]],
        'Without an executor argument, the async methods use ForkJoinPool.commonPool(). Passing your own executor is common for blocking I/O work.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_CONCURRENCY_CONCURRENT_UTILS',
    notes: `Writing \`synchronized\` around everything works but is slow and easy to get wrong. The
\`java.util.concurrent\` package gives you building blocks that are already correct.

## Atomics

    AtomicInteger hits = new AtomicInteger();
    hits.incrementAndGet();          // atomic count++
    hits.addAndGet(5);
    hits.compareAndSet(10, 0);       // set to 0 only if it is currently 10

Atomics use a CPU **compare-and-swap** instruction instead of a lock: read the value, compute the new
one, and write it only if nobody changed it in between — retrying otherwise. For one counter or
flag they are faster than a lock and cannot deadlock. \`LongAdder\` is better still for a counter
many threads hammer and few threads read.

## ConcurrentHashMap

\`HashMap\` is not thread-safe: concurrent puts can lose entries or corrupt the table.
\`ConcurrentHashMap\` lets many threads read and write at once, locking only small parts of the
table. Its single operations are atomic — but a **sequence** of them is not:

    // WRONG: two threads can both see null and both put 1
    if (map.get(word) == null) map.put(word, 1);
    else map.put(word, map.get(word) + 1);

    // RIGHT: one atomic operation
    map.merge(word, 1, Integer::sum);
    map.computeIfAbsent(key, k -> new ArrayList<>()).add(value);

\`merge\`, \`compute\`, \`computeIfAbsent\` and \`putIfAbsent\` do the check and the update as one step.
\`ConcurrentHashMap\` does not allow \`null\` keys or values, because \`get\` returning \`null\` must
mean "absent".

## Why Collections.synchronizedList is not enough

\`Collections.synchronizedList(list)\` locks each call. Iteration is many calls, so another thread can
add mid-loop and you get \`ConcurrentModificationException\` — unless you wrap the loop in
\`synchronized (list) { ... }\` yourself. \`CopyOnWriteArrayList\` copies the array on every write;
iterators see a snapshot and never throw. It suits lists read far more than written, such as
listener lists.

## Blocking queues and coordination

\`BlockingQueue\` (\`ArrayBlockingQueue\`, \`LinkedBlockingQueue\`) is the producer–consumer tool:
\`put\` waits while the queue is full, \`take\` waits while it is empty. \`CountDownLatch\` lets one
thread wait until N events have happened; \`Semaphore\` limits how many threads use a resource at
once.`,
    workedExample: `**Goal: count words across many files with a pool of threads.**

    ConcurrentHashMap<String, Integer> freq = new ConcurrentHashMap<>();
    ExecutorService pool = Executors.newFixedThreadPool(4);
    for (Path file : files) {
        pool.submit(() -> {
            for (String w : readWords(file)) freq.merge(w, 1, Integer::sum);
        });
    }
    pool.shutdown();
    pool.awaitTermination(1, TimeUnit.MINUTES);

\`merge\` reads the old count and writes the new one as one atomic step, so no count is lost even
when two threads see the same word at once. \`awaitTermination\` after \`shutdown\` makes main wait
for the last file before it reads the map.`,
    mcqs: [
      mcq('Several threads call hits.incrementAndGet() on a shared AtomicInteger. Why is no increment lost?',
        [['It retries a compare-and-swap until its update applies', true], ['It holds a synchronized lock on the field for every single increment', false], ['It runs every increment on the main thread', false], ['It stores one copy of the value per thread', false]],
        'Atomics read, compute and conditionally write with a CPU compare-and-swap, retrying if another thread changed the value first.'),
      mcq('Which ConcurrentHashMap call safely increments a per-word count when many threads update it?',
        [['map.merge(word, 1, Integer::sum)', true], ['map.put(word, map.get(word) + 1)', false], ['map.putIfAbsent(word, 1) on every call', false], ['if (map.containsKey(word)) map.put(word, 1)', false]],
        'merge performs the read and the write as one atomic operation. Separate get and put calls let two threads read the same old value.'),
      mcq('A listener list is read on every event and changed only at startup. Which collection fits it best?',
        [['CopyOnWriteArrayList', true], ['ArrayList', false], ['LinkedList', false], ['Collections.synchronizedList over a LinkedList', false]],
        'CopyOnWriteArrayList makes writes expensive but reads and iteration lock-free and safe, which is the right trade for read-mostly lists.'),
    ],
    checkpoint: [
      mcq('What does a ConcurrentHashMap do when you call put(null, "x")?',
        [['It throws NullPointerException', true], ['It stores the entry under a special null bucket', false], ['It silently ignores the call', false], ['It stores the value under the key "null"', false]],
        'ConcurrentHashMap rejects null keys and values so that get returning null can only mean the key is absent, which matters under concurrency.'),
      mcq('One thread iterates a Collections.synchronizedList while another adds to it. What can happen?',
        [['ConcurrentModificationException, unless the loop holds the list lock', true], ['Nothing; every operation, including iteration, is locked automatically by the wrapper', false], ['The add waits automatically until the loop ends', false], ['The iterator shows a frozen snapshot of the list', false]],
        'Each method call is locked, but a loop is many calls. The caller must synchronize on the list for the whole iteration.'),
      mcq('Main must wait until five worker threads have each finished loading data. Which utility fits most directly?',
        [['CountDownLatch with a count of 5', true], ['A Semaphore with 5 permits', false], ['An AtomicInteger checked in a busy loop', false], ['A CopyOnWriteArrayList of results', false]],
        'Each worker calls countDown() and main calls await(), which returns once the count reaches zero. A Semaphore limits concurrency instead.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_CONCURRENCY_JVM_MEMORY',
    notes: `The JVM divides the memory it manages into areas with different jobs. The two you must be able to
explain are the **stack** and the **heap**.

## The stack

Each thread has its own stack. Every method call pushes a **frame** holding that call's parameters
and local variables; returning pops it. Primitives declared locally live in the frame; for objects,
the frame holds only a **reference**.

    void greet() {
        int n = 3;                          // n: in greet's frame
        String s = new String("hi");        // s (the reference): in the frame
    }                                       // the String object: on the heap

The stack is small (often around 512 KB–1 MB per thread, set with \`-Xss\`). Recursion that never
reaches its base case keeps pushing frames until the JVM throws **StackOverflowError**.

## The heap

Every object and array lives on the heap, shared by all threads. Sizes are set with \`-Xms\`
(initial) and \`-Xmx\` (maximum). When the heap is full and garbage collection cannot free enough,
the JVM throws **OutOfMemoryError: Java heap space**. Class metadata lives in **Metaspace**, outside
the heap; loading endless classes exhausts it instead.

## Garbage collection: reachability

The garbage collector frees objects that are **unreachable** — that no chain of references leads to
from a **GC root**. Roots include local variables in live stack frames, static fields, and active
threads. Reference counting is not used, so two objects that point only at each other are still
collected once nothing else reaches them.

    List<int[]> cache = new ArrayList<>();      // a static field in real code
    cache.add(new int[1_000_000]);              // reachable for as long as cache is

That is how Java "leaks" memory: not by forgetting to free, but by keeping a reference — a growing
static map, a listener never removed — so the GC is not allowed to free it.

## Generations

Most objects die young, so the heap is split. New objects go to the **young generation**, which is
collected often and cheaply; survivors are promoted to the **old generation**, collected less often.
Java 17's default collector, **G1**, divides the heap into regions and aims for short pauses.
\`System.gc()\` is only a request the JVM may ignore.

## Strings

String literals are interned in the **string pool** (on the heap since Java 7), so two equal
literals share one object — which is why \`==\` sometimes "works" on strings and must never be
relied on; use \`equals\`.

## Reading the two errors

- **StackOverflowError**: one thread went too deep — almost always runaway recursion. The stack
  trace repeats the same frames.
- **OutOfMemoryError**: the heap is full of reachable objects — a leak, or a genuinely too-small
  \`-Xmx\`. A heap dump shows what is holding the memory.`,
    mcqs: [
      mcq('Inside a method, Java code runs Point p = new Point(1, 2). Where do the reference p and the Point object live?',
        [['p in the stack frame; the Point on the heap', true], ['Both p and the Point in the stack frame', false], ['Both p and the Point on the heap', false], ['p on the heap; the Point in Metaspace', false]],
        'Local variables live in the current frame on the thread stack. Objects created with new always live on the heap; the frame holds only the reference.'),
      mcq('Two Java objects reference only each other, and nothing else references either. What does the garbage collector do?',
        [['Collects both, since neither is reachable from a GC root', true], ['Keeps both forever, since each of their reference counts is still 1', false], ['Collects one and keeps the other', false], ['Throws OutOfMemoryError at the next collection', false]],
        'The JVM traces reachability from GC roots rather than counting references, so a cycle with no path from a root is garbage.'),
      mcq('A recursive Java method has no base case. Which error ends the program?',
        [['StackOverflowError', true], ['OutOfMemoryError: Java heap space', false], ['NullPointerException', false], ['IllegalStateException', false]],
        'Each call pushes a frame onto the thread stack. Unbounded recursion fills the stack, which is a separate, much smaller area than the heap.'),
    ],
    checkpoint: [
      mcq('A service adds every request object to a static HashMap and never removes any. Heap use climbs until it crashes. Why does GC not free them?',
        [['A static field is a GC root, so every entry stays reachable', true], ['HashMap entries are stored outside the heap', false], ['The collector never runs while requests arrive', false], ['Static fields are freed only when System.gc() is called explicitly by the code', false]],
        'Static fields are roots, and the map references every entry, so all of them are reachable and the collector must keep them. That is a Java memory leak.'),
      mcq('Which JVM option sets the maximum size of the heap?',
        [['-Xmx', true], ['-Xss', false], ['-Xms', false], ['-XX:MaxMetaspaceSize', false]],
        '-Xmx is the maximum heap and -Xms the initial heap. -Xss sets each thread stack size, and MaxMetaspaceSize caps class metadata.'),
      mcq('Why does the JVM split the heap into a young and an old generation?',
        [['Most objects die young, so collecting new ones often is cheap', true], ['Old objects must be stored in a separate, slower physical memory chip', false], ['Each thread needs its own private generation', false], ['Young objects are stored on the stack instead', false]],
        'The generational hypothesis: most objects are short-lived. Frequent, small young-generation collections reclaim them cheaply, while long-lived ones are promoted.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_CONCURRENCY_DEBUGGING',
    notes: `Concurrency bugs rarely fail the same way twice, so you debug them by reading the code for the
known shapes, not by rerunning until it breaks. Five shapes cover most of what you will meet.

## Bug 1: the lost update

    static int sold = 0;
    // 8 threads each run: for (int i = 0; i < 10_000; i++) sold++;
    System.out.println(sold);   // prints 71 342, then 76 908, never 80 000

**Diagnosis.** A total that is too small and different every run is the signature of an unprotected
read-modify-write. \`sold++\` is read, add, write; two threads read the same value and one write is
lost. **Fix:** \`AtomicInteger sold\` with \`incrementAndGet()\`, or increment inside
\`synchronized\` on one shared lock. Making \`sold\` \`volatile\` does **not** fix it.

## Bug 2: the deadlock from lock order

    void move(Box from, Box to) {
        synchronized (from) { synchronized (to) { ... } }
    }
    // thread 1: move(a, b)      thread 2: move(b, a)

**Diagnosis.** The program hangs with no CPU use. A thread dump (\`jstack <pid>\`, or the debugger's
thread view) shows each thread BLOCKED, each holding the lock the other wants — the dump literally
says "Found one Java-level deadlock". **Fix:** acquire both locks in a fixed global order (for
example, by id), whatever the argument order.

## Bug 3: run() instead of start()

    Thread t = new Thread(this::download);
    t.run();
    showSpinner();      // only appears after the download finishes

**Diagnosis.** The "background" work blocks the caller, and \`Thread.currentThread().getName()\`
inside \`download\` prints \`main\`. **Fix:** \`t.start()\`.

## Bug 4: the pool nobody shut down

    ExecutorService pool = Executors.newFixedThreadPool(4);
    pool.submit(this::report);
    // main ends ... and the program never exits

**Diagnosis.** All the work is done but the JVM stays up: a thread dump shows \`pool-1-thread-*\`
threads WAITING for tasks. **Fix:** \`pool.shutdown()\` in a \`finally\`, plus \`awaitTermination\` if
main needs the results first.

## Bug 5: check-then-act on a ConcurrentHashMap

    if (!sessions.containsKey(user)) {
        sessions.put(user, new Session(user));   // two threads both create one
    }

**Diagnosis.** A thread-safe map does not make *two* calls atomic. Between the check and the put,
another thread can do the same check. **Fix:** \`sessions.computeIfAbsent(user, Session::new)\`.

## The method

1. Identify every piece of state more than one thread touches.
2. For each, ask: is every read-then-write done as one atomic step, under one lock?
3. For each lock, ask: what else is held while taking it, and in what order?
4. For hangs, take a thread dump before guessing.`,
    mcqs: [
      mcq('A shared total is updated with total += amount by six threads. The final value is wrong by a different amount on every run. What is the cause?',
        [['An unprotected read-modify-write losing updates', true], ['Integer overflow in the total field', false], ['The threads were started with run() not start()', false], ['The garbage collector freeing the total', false]],
        'A result that is too small and changes each run is the signature of lost updates: += reads, adds and writes as separate steps.'),
      mcq('A Java program hangs at 0% CPU. A thread dump shows two threads BLOCKED, each holding a monitor the other is waiting for. What is it?',
        [['A deadlock caused by inconsistent lock ordering', true], ['A livelock caused by too many retries', false], ['A memory leak filling the heap', false], ['Starvation from low thread priority', false]],
        'Two threads each holding one lock and waiting for the other is a cycle of waiting — a deadlock. Livelock would show CPU in use.'),
      mcq('Logging Thread.currentThread().getName() inside a task you thought was in the background prints "main". What is the likely bug?',
        [['The code called run() instead of start()', true], ['The thread was not marked as a daemon', false], ['The executor uses a single thread', false], ['The thread was never given a name', false]],
        'run() executes the task on the caller, which is main. start() would have run it on the new thread with its own name.'),
      mcq('Code checks if (!map.containsKey(k)) then calls map.put(k, v) on a ConcurrentHashMap, and duplicate objects get created. What is the fix?',
        [['Use map.computeIfAbsent(k, key -> v) as one call', true], ['Replace the map with a plain HashMap', false], ['Mark the map field as volatile', false], ['Call containsKey a second time before put', false]],
        'Each call is atomic but the pair is not; another thread can pass the check in between. computeIfAbsent checks and inserts atomically.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_CONCURRENCY_PRACTICE',
    notes: `Work these without looking back at the notes. Each one is small; the point is that the safe
version becomes what you write first.

## Exercise 1 — Two workers, one result

Start two threads that each sum half of an \`int[]\` into their own slot of a \`long[2]\`. Join both
and print the total. Then remove the joins and explain what can be printed.

## Exercise 2 — Fix the counter three ways

A class with \`int count\` is incremented 100 000 times by each of four threads. Fix it with
\`synchronized\`, then with \`AtomicInteger\`, then with \`LongAdder\`. Say which you would choose for a
counter read once a minute and written constantly.

## Exercise 3 — A deadlock you build on purpose

Write two threads that lock \`a\` then \`b\`, and \`b\` then \`a\`, with a short sleep between the two
locks so the deadlock is reliable. Take a thread dump with \`jstack\` and find the line that names the
deadlock. Then fix it with a lock order.

## Exercise 4 — Word frequency with a pool

Given a list of sentences, count words on a \`newFixedThreadPool(3)\` into a \`ConcurrentHashMap\`
using \`merge\`. Shut the pool down and wait for termination before printing the map sorted by key.

## Exercise 5 — The graded exercise: parallel range sums

Read \`n\` and \`k\`. Split 1..n into \`k\` parts — each part has \`n / k\` numbers and the last part
also takes the remainder — sum each part as a \`Callable<Long>\` on a fixed pool of \`k\` threads,
and print each part and the total in a fixed order. The output must be identical on every run,
even though the parts finish in any order. This one is auto-graded.`,
    mcqs: [
      mcq('You sum ranges on a thread pool and print each Future result in a for loop over the futures list. Why is the output order fixed?',
        [['The loop reads the futures in submission order, waiting on each', true], ['The pool runs the tasks in submission order on one thread', false], ['Futures complete in the order they were created', false], ['println is synchronized, so it sorts the lines', false]],
        'get() blocks until that specific task finishes, so reading the list in order prints in order even if a later task finished first.'),
      mcq('Four threads increment a counter that is read once a minute and written constantly. Which is the best fit?',
        [['LongAdder', true], ['A volatile long', false], ['A synchronized ArrayList', false], ['A plain long with Thread.yield()', false]],
        'LongAdder spreads contended updates across cells and sums them on read, so heavy writes do not fight over one value. volatile is not atomic.'),
      mcq('Summing 1..1_000_000 in parallel, a student stores each part in an int. What goes wrong?',
        [['The sums overflow int, so a long is needed', true], ['The parts are added in the wrong order', false], ['The pool rejects tasks that return int', false], ['Nothing; int holds values up to 2^63', false]],
        'The total is about 5×10^11, far past Integer.MAX_VALUE (about 2.1×10^9). Each part and the total must be long.'),
      mcq('A program calls pool.shutdown() and then immediately prints a ConcurrentHashMap the tasks fill. Some counts are missing. Why?',
        [['shutdown does not wait; awaitTermination is needed first', true], ['shutdown cancels every task still in the queue', false], ['ConcurrentHashMap hides entries written by pool threads', false], ['merge only applies after the pool is closed', false]],
        'shutdown only stops new submissions and returns at once. awaitTermination blocks until the queued and running tasks are done.'),
      mcq('Your deliberate-deadlock program from Exercise 3 hangs. Which tool shows which thread holds which lock?',
        [['A thread dump taken with jstack', true], ['A heap dump taken with jmap', false], ['The garbage collector log', false], ['javac with the -Xlint flag', false]],
        'A thread dump lists each thread, its state, the monitors it holds and the one it waits for, and reports Java-level deadlocks explicitly.'),
    ],
    assignment: {
      title: 'Parallel Range Sums on an ExecutorService',
      description: 'Split 1..n into k parts, sum each part on a thread pool, and print the parts and total deterministically.',
      instructions: `Read two integers **n** and **k** from standard input (1 ≤ k ≤ n ≤ 10 000 000).

Split the numbers 1..n into **k** consecutive parts. Let \`size = n / k\` (integer division). Part
**i** (counting from 1) covers \`(i - 1) * size + 1\` to \`i * size\`, except the **last** part, which
runs to **n** and so also takes the remainder.

Sum each part as a \`Callable<Long>\` submitted to \`Executors.newFixedThreadPool(k)\`. Then print,
in order, one line per part and a final total:

    Part 1: <sum>
    Part 2: <sum>
    ...
    Total: <sum>

Example: input \`10 3\` gives parts 1..3, 4..6 and 7..10:

    Part 1: 6
    Part 2: 15
    Part 3: 34
    Total: 55

Requirements:

- The work must actually run on the pool — one task per part.
- The output must be identical on every run, whatever order the tasks finish in.
- Use \`long\` for sums: the total for n = 1 000 000 is 500 000 500 000.
- Shut the pool down in a \`finally\` block so the program exits.`,
      rubric: [
        { criterion: 'Correct parts and total', description: 'Every test passes, including the remainder going to the last part.', maxPoints: 40 },
        { criterion: 'Work runs on the pool', description: 'One Callable<Long> per part submitted to a fixed pool of k threads.', maxPoints: 25 },
        { criterion: 'Deterministic output', description: 'Results are read from the futures in part order, not printed by the tasks.', maxPoints: 20 },
        { criterion: 'Clean shutdown', description: 'shutdown() in finally; sums held in long, with no overflow.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'java',
        starter: `import java.util.*;
import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) throws Exception {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        int k = in.nextInt();

        // TODO: create a fixed pool of k threads
        // TODO: submit one Callable<Long> per part (the last part takes the remainder)
        // TODO: print "Part i: <sum>" for each part in order, then "Total: <sum>"
        // TODO: shut the pool down in a finally block
    }
}
`,
        tests: [
          { input: '10 2\n', expectedOutput: 'Part 1: 15\nPart 2: 40\nTotal: 55' },
          { input: '10 3\n', expectedOutput: 'Part 1: 6\nPart 2: 15\nPart 3: 34\nTotal: 55' },
          { input: '1 1\n', expectedOutput: 'Part 1: 1\nTotal: 1' },
          { input: '7 7\n', expectedOutput: 'Part 1: 1\nPart 2: 2\nPart 3: 3\nPart 4: 4\nPart 5: 5\nPart 6: 6\nPart 7: 7\nTotal: 28', isHidden: true },
          { input: '100000 4\n', expectedOutput: 'Part 1: 312512500\nPart 2: 937512500\nPart 3: 1562512500\nPart 4: 2187512500\nTotal: 5000050000', isHidden: true },
          { input: '1000000 7\n', expectedOutput: 'Part 1: 10204132653\nPart 2: 30612255102\nPart 3: 51020377551\nPart 4: 71428500000\nPart 5: 91836622449\nPart 6: 112244744898\nPart 7: 132653867347\nTotal: 500000500000', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },
  {
    unitCode: 'JT_JAVA_CONCURRENCY_INTERVIEW_QUESTION',
    notes: `Three questions asked in nearly every Java backend interview. Say the answers aloud; the
interviewer is listening for whether you know what actually happens, not for the vocabulary.

## Q1. "What is the difference between a process and a thread?"

**Model answer.** A process is a running program with its own memory space — one JVM is one
process. A thread is a path of execution inside a process. Threads of the same process share the
heap, so they can share objects cheaply, but each has its own stack and program counter. That
sharing is the whole trade-off: communication is fast, and it is also exactly why we need
synchronization. Processes are isolated — one crashing does not corrupt another's memory — but
talking between them needs sockets, pipes or files.

**Follow-up:** "Which is cheaper to create?" — A thread, because no new address space is created.
That said, a Java platform thread is still an OS thread with its own stack, which is why we pool
them rather than creating one per request.

## Q2. "What is the difference between synchronized and volatile?"

**Model answer.** Both deal with visibility, but only \`synchronized\` gives mutual exclusion.
\`volatile\` guarantees that a write to the field is seen by subsequent reads in other threads, and
stops the compiler reordering around it — it fits a status flag one thread sets and others read.
\`synchronized\` lets only one thread at a time run the block for a given lock, which makes a
compound action like \`count++\` or check-then-put atomic, and it also publishes the writes made
inside it. So: \`volatile\` for a single independent read or write; a lock or an atomic for anything
read-then-write.

**Follow-up:** "So is a volatile int counter safe?" — No. \`count++\` on a volatile is still three
steps, and two threads can lose an update. I would use \`AtomicInteger\`.

## Q3. "How do you avoid deadlock?"

**Model answer.** A deadlock needs four conditions at once — mutual exclusion, hold-and-wait, no
pre-emption and a circular wait — so breaking any one prevents it, and circular wait is the one we
control. Concretely: acquire locks in a single global order; hold them for as short a time as
possible and never call unknown code (a callback, a remote call) while holding one; prefer
higher-level tools like \`ConcurrentHashMap\` and executors that avoid explicit locking; and where a
wait could cycle, use \`ReentrantLock.tryLock\` with a timeout and back off.

**Follow-up:** "How would you find one in production?" — Take a thread dump with \`jstack\` or from
the monitoring tool. The JVM detects monitor deadlocks and prints "Found one Java-level deadlock"
with the threads and the locks involved.

**Bonus, often next:** "Why use an ExecutorService rather than new Thread?" — A pool reuses threads
instead of paying creation cost per task, bounds how many run at once so load cannot exhaust
memory, gives results and exceptions back through \`Future\`, and lets you shut everything down in
one call.`,
    mcqs: [
      mcq('In an interview you are asked what threads of one Java process share. Which answer is accurate?',
        [['The heap; each thread keeps its own stack', true], ['Their stacks; each thread keeps its own heap', false], ['Nothing; each thread has a private memory space', false], ['The heap and the stack, but not static fields', false]],
        'Objects and static fields on the heap are shared by all threads in the JVM. Each thread has a private stack for its own frames and locals.'),
      mcq('An interviewer asks why a team would prefer an ExecutorService to creating new Thread objects for each request. Which is the strongest reason?',
        [['It reuses and bounds threads, and returns results via Future', true], ['It makes every task run faster on a single core', false], ['It removes any need for synchronization in tasks that share mutable state', false], ['It lets tasks share one stack to save memory', false]],
        'Pooling saves creation cost and caps concurrency; Futures carry results and exceptions back. Tasks sharing state still need synchronization.'),
      mcq('Which of the four deadlock conditions does a global lock-ordering rule remove?',
        [['Circular wait', true], ['Mutual exclusion', false], ['No pre-emption', false], ['Bounded waiting', false]],
        'If every thread takes locks in the same order, no thread can wait for a lock held by a thread that is waiting for it, so no cycle forms.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_CONCURRENCY_CHECKPOINT',
    notes: `Ten questions across the whole topic: threads, races and locks, executors, concurrent collections
and JVM memory. Most show code and ask what it does. Trace each one as if two threads were really
running it.`,
    checkpoint: [
      mcq('A thread calls Thread.sleep(1000) while holding a synchronized lock. What happens to the lock during the sleep?',
        [['It stays held, so other threads still block on it', true], ['It is released during the sleep and reacquired automatically afterwards', false], ['It is transferred to the next waiting thread', false], ['The JVM throws IllegalMonitorStateException', false]],
        'sleep keeps every lock the thread holds. Object.wait() is the call that releases the monitor while waiting.'),
      mcq('Thread t = new Thread(() -> System.out.print("x")); t.start(); t.join(); System.out.print("y"); What is printed?',
        [['xy, always', true], ['yx, always', false], ['xy or yx, depending on timing', false], ['Only y, because t never runs', false]],
        'join blocks main until t finishes, so x is printed before main continues to print y.'),
      mcq('Four threads each call list.add(i) 1000 times on one shared java.util.ArrayList. Which outcome is possible?',
        [['Fewer than 4000 items, or an ArrayIndexOutOfBoundsException', true], ['Exactly 4000 items every time', false], ['A compile error, because ArrayList is not thread-safe', false], ['A deadlock between the four threads', false]],
        'ArrayList is unsynchronized: concurrent adds can overwrite each other or race on the resize, losing items or throwing.'),
      mcq('A class has synchronized void inc() { count++; } and int get() { return count; } with no synchronization on get. What is the risk?',
        [['A reader may see a stale value, since get takes no lock', true], ['inc() can still lose updates between two writers', false], ['get() will deadlock with inc()', false], ['There is no risk; inc being synchronized covers get', false]],
        'Visibility is only guaranteed between threads that use the same lock. The reader must also synchronize, or the field must be volatile.'),
      mcq('Future<Integer> f = pool.submit(() -> 10 / 0); What happens at f.get()?',
        [['ExecutionException with an ArithmeticException as its cause', true], ['ArithmeticException thrown directly from f.get(), not wrapped in anything', false], ['get() returns null', false], ['get() blocks forever', false]],
        'The pool catches the task failure and stores it; get rethrows it wrapped in ExecutionException.'),
      mcq('Which call releases a monitor lock while the thread waits, so another thread can enter the synchronized block?',
        [['Object.wait()', true], ['Thread.sleep()', false], ['Thread.yield()', false], ['Thread.join() on another thread', false]],
        'wait() must be called holding the lock, and it releases it until notified. sleep and yield keep every lock held.'),
      mcq('AtomicInteger a = new AtomicInteger(5); boolean ok = a.compareAndSet(4, 9); What are ok and a.get()?',
        [['false and 5', true], ['true and 9', false], ['false and 9', false], ['true and 4', false]],
        'compareAndSet only writes when the current value equals the expected one. 5 is not 4, so nothing changes and it returns false.'),
      mcq('A web app calls Executors.newCachedThreadPool() and submits one slow task per incoming request. Under heavy load, what is the risk?',
        [['Unbounded threads, which can exhaust memory', true], ['Tasks queue forever on a single thread', false], ['Requests are rejected after the 16th thread', false], ['The pool falls back to running tasks on main', false]],
        'A cached pool creates a new thread whenever none is idle. With slow tasks and many requests it can create thousands of threads.'),
      mcq('A recursive method computes factorial(100_000) without memoisation or iteration. What is the most likely failure?',
        [['StackOverflowError from too many frames', true], ['OutOfMemoryError from a full heap', false], ['A deadlock on the call stack', false], ['ConcurrentModificationException', false]],
        'A hundred thousand nested calls each need a stack frame; the default thread stack is far smaller, so the stack overflows first.'),
      mcq('After Object o = new Object(); o = null; is the original object guaranteed to be freed at once?',
        [['No; it is only eligible for collection at the next GC', true], ['Yes; assigning null frees it at once', false], ['No; objects are never freed while main runs', false], ['Yes, but only if System.gc() was called', false]],
        'Dropping the last reference makes the object unreachable and so eligible. The collector frees it whenever it next runs, which you do not control.'),
    ],
  },
];

const DSA_LINEAR: PilotBundle[] = [
  /* ══ JT_JAVA_DSA_LINEAR — DSA in Java: Linear Structures ════════════════════════════════ */
  {
    unitCode: 'JT_JAVA_DSA_LINEAR_COMPLEXITY',
    notes: `Big-O describes how the work a piece of code does **grows** as the input grows. You find it by
asking how many times the innermost operation runs for an input of size n, then keeping only the
fastest-growing term and dropping constants.

## Counting in Java code

    for (int i = 0; i < n; i++) sum += a[i];                 // O(n)

    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++) if (a[i] == a[j]) ... // n(n-1)/2 → O(n²)

    for (int i = 1; i < n; i *= 2) steps++;                  // O(log n)

A loop that halves or doubles is logarithmic; two nested loops over the input are quadratic; two
loops one *after* the other are still O(n).

## The hidden cost is in the library call

A single line can hide a loop. What the Java collections actually cost:

| Operation | ArrayList | LinkedList | HashMap / HashSet |
|---|---|---|---|
| get(i) | O(1) | O(n) | — |
| add at end | O(1) amortised | O(1) | put O(1) average |
| add / remove at index 0 | O(n) | O(1) | — |
| contains | O(n) | O(n) | O(1) average |

"Amortised" means an occasional \`add\` copies the whole array into a bigger one (about 1.5×), but
spread over many adds the cost per add is constant. A \`HashMap\` lookup is O(1) on average; since
Java 8 a crowded bucket becomes a balanced tree, so the worst case is O(log n), not O(n).

## A classic: contains duplicate

**Problem.** Return true if any value appears twice in an \`int[]\`.

    static boolean hasDuplicate(int[] nums) {
        Set<Integer> seen = new HashSet<>();
        for (int x : nums) {
            if (!seen.add(x)) return true;   // add returns false if x was already there
        }
        return false;
    }

**Cost.** One pass, O(1) average per \`add\`: **O(n) time, O(n) space.** The nested-loop version is
O(n²) time and O(1) space; sorting first (\`Arrays.sort\` then compare neighbours) is O(n log n) time
and needs no set. That trade — time for space — is the conversation an interviewer wants.

## Two Java traps

- \`list.contains(x)\` inside a loop over the list is O(n²), even though it reads like one loop.
- \`s = s + piece\` in a loop copies the whole string every time: O(n²) characters. Use a
  \`StringBuilder\`, whose \`append\` is amortised O(1).

## Space

Space counts the extra memory the algorithm allocates, plus the recursion depth: a recursive
function that goes n deep uses O(n) stack even if it allocates nothing. Edge cases to check in every
cost claim: an empty input, one element, and all elements equal.`,
    mcqs: [
      mcq('What is the time cost of calling list.remove(0) on a java.util.ArrayList of n elements?',
        [['O(n), because every later element shifts left', true], ['O(1), because the index is known', false], ['O(log n), because the list is halved', false], ['O(n log n), because the list is re-sorted after the removal', false]],
        'ArrayList is backed by an array. Removing the first element copies the remaining n-1 elements one place left.'),
      mcq('A Java method loops i over 0..n-1 and calls list.contains(a[i]) on an ArrayList of size n each time. What is its time complexity?',
        [['O(n²)', true], ['O(n)', false], ['O(n log n)', false], ['O(log n)', false]],
        'contains on an ArrayList is a linear scan. Doing an O(n) scan n times is quadratic even though only one loop is written.'),
      mcq('Why is ArrayList.add(x) at the end described as amortised O(1)?',
        [['Rare resizes copy the array, but averaged over all adds it is constant', true], ['It never copies the array because capacity is unlimited', false], ['It is always O(n), but with a constant factor far too small to ever matter in practice', false], ['It allocates a linked node per element, so nothing is copied', false]],
        'When capacity runs out the array grows by about half and is copied. Those copies are rare enough that the total cost over n adds is O(n).'),
    ],
    checkpoint: [
      ck('DSA_COMPLEXITY', 'In Java, a loop runs for (int i = 1; i < n; i *= 2). How many times does its body run, in Big-O terms?',
        [['O(log n)', true], ['O(n)', false], ['O(n / 2)', false], ['O(√n)', false]],
        'i doubles each time, so it reaches n after about log₂ n steps.'),
      ck('DSA_COMPLEXITY', 'What is the time cost of linkedList.get(n / 2) on a java.util.LinkedList of n elements?',
        [['O(n)', true], ['O(1)', false], ['O(log n)', false], ['O(n²)', false]],
        'A linked list has no index. get walks node by node from the nearer end, which is about n/2 steps — still O(n).'),
      ck('DSA_COMPLEXITY', 'A Java method builds a result with String s = ""; then s = s + c for each of n characters. What is the total work?',
        [['O(n²), since each + copies the string built so far', true], ['O(n), since each + appends just one character to the end of s', false], ['O(n log n), since the string doubles in size', false], ['O(1), since string literals are interned', false]],
        'Strings are immutable, so each concatenation creates a new string copying all previous characters: 1 + 2 + ... + n. StringBuilder makes it O(n).'),
    ],
  },
  {
    unitCode: 'JT_JAVA_DSA_LINEAR_ARRAY_PATTERNS',
    notes: `Most array and string questions are a nested loop in disguise. Two patterns turn that O(n²) into
O(n): **two pointers** and the **sliding window**.

## Two pointers: pair with a target sum in a sorted array

**Problem (Two Sum II).** Given a sorted \`int[]\` and a target, return the 1-based positions of two
numbers that add up to it, or \`[-1, -1]\`.

    static int[] pairSum(int[] a, int target) {
        int lo = 0, hi = a.length - 1;
        while (lo < hi) {
            int sum = a[lo] + a[hi];
            if (sum == target) return new int[] { lo + 1, hi + 1 };
            if (sum < target) lo++;      // need a bigger sum: move the small end up
            else hi--;                   // need a smaller sum: move the big end down
        }
        return new int[] { -1, -1 };
    }

**Why it is correct.** If \`a[lo] + a[hi]\` is too small, \`a[lo]\` cannot pair with anything — every
other partner is ≤ \`a[hi]\`. So \`lo\` can be discarded. The same argument discards \`hi\` when the sum
is too big. **O(n) time, O(1) space.** It depends entirely on the array being sorted. Other
two-pointer uses: reversing in place, removing duplicates from a sorted array, checking a palindrome.

## Sliding window: maximum sum of k consecutive elements

    static long maxWindowSum(int[] a, int k) {
        long window = 0;
        for (int i = 0; i < k; i++) window += a[i];
        long best = window;
        for (int i = k; i < a.length; i++) {
            window += a[i] - a[i - k];   // add the new right element, drop the old left one
            best = Math.max(best, window);
        }
        return best;
    }

Recomputing each window would be O(n·k); sliding it is **O(n) time, O(1) space**. Use \`long\` —
summing many large \`int\`s overflows.

## Variable-size windows

When the window's size is not fixed — "the longest substring with no repeated character" — move the
right edge every step and the left edge only when the window becomes invalid:

    for (int right = 0; right < s.length(); right++) {
        // add s.charAt(right) to the window
        // while the window is invalid: remove s.charAt(left) and left++
        // record right - left + 1
    }

Each index enters and leaves the window at most once, so this is O(n) even with the inner \`while\`.

## Edge cases to test

An empty array (\`a.length - 1\` is -1, so the two-pointer loop simply does not run), a single
element, \`k\` larger than the array (guard it), all-equal values, and negative numbers — which break
"shrink when the sum is too big" windows, because adding an element can make a sum smaller.`,
    mcqs: [
      mcq('In the two-pointer pair-sum on a sorted Java int[], a[lo] + a[hi] is less than the target. Which move is correct?',
        [['lo++, because a[lo] cannot pair with any remaining element', true], ['hi--, because a[hi] is now too large to be part of any valid pair', false], ['Both lo++ and hi-- together, to keep the window balanced', false], ['Restart the scan with hi reset to the last index again', false]],
        'Every partner left for a[lo] is at most a[hi], and even a[hi] is too small, so a[lo] is useless and the low pointer moves up.'),
      mcq('A fixed window of size k slides across a Java int[] of length n. What is the cost of updating the window sum at each step?',
        [['O(1): add the entering element, subtract the leaving one', true], ['O(k): re-add every element currently inside the window from scratch', false], ['O(log k): the window elements are kept in a heap', false], ['O(n): the whole array is rescanned for each window', false]],
        'Only two elements change between neighbouring windows, so the running sum updates in constant time and the scan is O(n) overall.'),
      mcq('Why can a variable-size sliding window with an inner while loop still run in O(n)?',
        [['Each index is added once and removed at most once', true], ['The inner loop runs at most twice per outer step', false], ['The JIT compiler merges the nested loops into one', false], ['The window never grows past a constant size', false]],
        'The left pointer only moves forward, so across the whole run it advances at most n times in total — amortised O(1) per step.'),
    ],
    checkpoint: [
      ck('DSA_ARRAYS', 'You apply the two-pointer pair-sum method to an unsorted Java int[]. What goes wrong?',
        [['It can miss a valid pair, since discarding is no longer safe', true], ['It throws an IllegalArgumentException on the very first comparison', false], ['It still finds every pair, but now runs in O(n²)', false], ['It returns the same pair twice in the result', false]],
        'The discard argument relies on order: in an unsorted array a smaller sum does not prove a[lo] has no partner.'),
      ck('DSA_ARRAYS', 'For maximum sum of k consecutive elements, why should the Java window sum be a long rather than an int?',
        [['Adding many large ints can overflow an int', true], ['A long is faster to add than an int', false], ['An int[] cannot be summed into an int', false], ['Math.max only accepts long arguments, never int ones', false]],
        'An int holds about ±2.1 billion. A window of many values near that size overflows silently and wraps negative.'),
      ck('DSA_ARRAYS', 'Which problem is the natural fit for a sliding window rather than two pointers from opposite ends?',
        [['Longest run of at most two distinct values', true], ['Pair in a sorted array summing to a target', false], ['Reversing an int[] in place without a copy', false], ['Checking whether a string is a palindrome', false]],
        'A contiguous range that grows and shrinks while a condition holds is a window. The others meet in the middle from both ends.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_DSA_LINEAR_LINKED_LISTS',
    notes: `A singly linked list is a chain of nodes, each holding a value and a reference to the next node.
In an interview you are expected to write the node class yourself rather than use
\`java.util.LinkedList\`.

    class ListNode {
        int val;
        ListNode next;
        ListNode(int val) { this.val = val; }
    }

The list *is* its head reference. An empty list is \`head == null\`, and the last node's \`next\` is
\`null\`.

## Insert and delete

    ListNode n = new ListNode(5);    // insert at the front: O(1)
    n.next = head;
    head = n;

    // delete the first node with value x
    ListNode dummy = new ListNode(0);
    dummy.next = head;
    ListNode cur = dummy;
    while (cur.next != null && cur.next.val != x) cur = cur.next;
    if (cur.next != null) cur.next = cur.next.next;
    head = dummy.next;

The **dummy node** in front of the head means deleting the head is not a special case. Use it
whenever the head might change.

## The classic: reverse a linked list

    static ListNode reverse(ListNode head) {
        ListNode prev = null, cur = head;
        while (cur != null) {
            ListNode next = cur.next;   // 1. remember the rest of the list
            cur.next = prev;            // 2. point this node backwards
            prev = cur;                 // 3. advance prev
            cur = next;                 // 4. advance cur
        }
        return prev;                    // the old tail is the new head
    }

**O(n) time, O(1) space.** The order of the four lines matters: if you overwrite \`cur.next\` before
saving it, the rest of the list is lost. Trace it on \`1 → 2 → 3\` and on an empty list (returns
\`null\`) and a single node (returns itself).

## Fast and slow pointers

Move \`slow\` one step and \`fast\` two steps.

    static ListNode middle(ListNode head) {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
        }
        return slow;    // for an even length, the second of the two middles
    }

    static boolean hasCycle(ListNode head) {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) return true;   // same node, compared by reference
        }
        return false;
    }

In a cycle the fast pointer gains one node per step on the slow one, so it must land on it
(Floyd's algorithm): **O(n) time, O(1) space**, versus O(n) space for a \`HashSet<ListNode>\` of
visited nodes. The loop condition checks \`fast\` *and* \`fast.next\` — dropping either one gives a
\`NullPointerException\` on lists of certain lengths.`,
    mcqs: [
      mcq('In the iterative reversal of a Java singly linked list, why must next = cur.next be saved before cur.next = prev?',
        [['Overwriting cur.next first loses the rest of the list', true], ['Java requires a local variable before assigning a field', false], ['prev is null on the first step, so the write would throw', false], ['It lets the loop run in O(1) instead of O(n)', false]],
        'Once cur.next points backwards, the only reference to the remaining nodes is gone unless it was saved first.'),
      mcq('Why does a dummy node placed before head simplify deleting from a Java linked list?',
        [['Deleting the real head becomes like deleting any node', true], ['It makes every deletion O(1), whatever the position of the node', false], ['It stops the garbage collector freeing the list', false], ['It removes the need to check for null at the tail', false]],
        'With a dummy, every real node has a predecessor, so one rule — prev.next = prev.next.next — covers the head too.'),
      mcq('The cycle check compares slow == fast on ListNode objects. Why is == right here rather than equals?',
        [['It asks if both refer to the same node, not equal values', true], ['equals cannot be called on a user-defined class', false], ['== compares the val fields of the two ListNode objects directly', false], ['equals would loop forever once inside a cycle', false]],
        'Two different nodes may hold equal values. A cycle means the very same node is reached again, which is reference equality.'),
    ],
    checkpoint: [
      ck('DSA_LINKED_LIST', 'What does the iterative reverse(head) return when called with head == null?',
        [['null, since the loop never runs', true], ['A new node with the value 0', false], ['It throws a NullPointerException', false], ['A one-node list holding null', false]],
        'cur starts as null, so the while loop is skipped and prev, initialised to null, is returned — the correct empty list.'),
      ck('DSA_LINKED_LIST', 'The middle-finding loop is written while (fast.next != null), without checking fast itself. What happens on a list with an even number of nodes?',
        [['A NullPointerException once fast becomes null', true], ['It returns the first of the two middle nodes', false], ['It loops forever on the last pair of nodes', false], ['It returns the tail node instead of a middle', false]],
        'With an even length, fast.next.next eventually sets fast to null, and the next fast.next dereferences null.'),
      ck('DSA_LINKED_LIST', 'Floyd cycle detection is used instead of a HashSet of visited nodes. What does it save?',
        [['O(n) extra space; it needs only O(1)', true], ['Time; it runs in O(log n) instead', false], ['Nothing; both of them use O(1) space', false], ['The need to define a ListNode class', false]],
        'Both are O(n) time, but the set stores up to n references while two pointers need constant space.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_DSA_LINEAR_STACKS_QUEUES',
    notes: `A **stack** is last-in, first-out; a **queue** is first-in, first-out. In modern Java both are
\`ArrayDeque\`:

    Deque<Character> stack = new ArrayDeque<>();
    stack.push('(');          // add to top
    stack.peek();             // look at top (null if empty)
    stack.pop();              // remove top (throws if empty)

    Queue<Integer> queue = new ArrayDeque<>();
    queue.offer(1);           // add to tail
    queue.poll();             // remove head (null if empty)

All of these are O(1). Do not use the legacy \`java.util.Stack\` — it extends \`Vector\`, so every call
is synchronized for no benefit, and it exposes index access a stack should not have. \`ArrayDeque\`
also rejects \`null\` elements, which keeps \`peek\` returning \`null\` unambiguous.

## Classic 1: valid parentheses

**Problem.** Is a string of \`()[]{}\` correctly matched and nested?

    static boolean isValid(String s) {
        Deque<Character> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(') stack.push(')');
            else if (c == '[') stack.push(']');
            else if (c == '{') stack.push('}');
            else if (stack.isEmpty() || stack.pop() != c) return false;
        }
        return stack.isEmpty();
    }

Pushing the **expected closer** makes the comparison one line. The two edge cases are the ones people
miss: a closer with an empty stack (\`")("\`) and openers left over at the end (\`"(("\`). **O(n) time,
O(n) space.**

## Classic 2: next greater element (a monotonic stack)

**Problem.** For each element, the first larger element to its right, or -1.

    static int[] nextGreater(int[] a) {
        int[] res = new int[a.length];
        Arrays.fill(res, -1);
        Deque<Integer> stack = new ArrayDeque<>();      // indices, values decreasing
        for (int i = 0; i < a.length; i++) {
            while (!stack.isEmpty() && a[stack.peek()] < a[i]) {
                res[stack.pop()] = a[i];                // a[i] is their answer
            }
            stack.push(i);
        }
        return res;
    }

For \`[2, 1, 5, 3]\` the result is \`[5, 5, -1, -1]\`. Each index is pushed once and popped at most
once, so it is **O(n)**, not O(n²). Store **indices** on the stack: you need to know where to write
the answer.

## Queues for simulation and BFS

A queue processes things in arrival order: a printer queue, customers at a counter, or the next layer
of a breadth-first search. A typical exercise — "every second, the person at the front is served once
and rejoins the back if they still need service" — is a loop of \`poll\`, work, and \`offer\`.`,
    mcqs: [
      mcq('Why is ArrayDeque preferred over java.util.Stack for a stack in modern Java?',
        [['Stack extends Vector, so every call is needlessly synchronized', true], ['Stack can only hold primitive values, never objects', false], ['ArrayDeque accepts null elements as values, while Stack rejects them', false], ['Stack.pop() has to shift every element, costing O(n)', false]],
        'Stack is a legacy class built on synchronized Vector. ArrayDeque is unsynchronized, faster, and its Deque interface is the recommended stack API.'),
      mcq('In the valid-parentheses check, the input is "(()". Which line returns false?',
        [['The final return stack.isEmpty(), as one opener is left', true], ['The pop comparison made on the first ")" character', false], ['The empty-stack check that is made on the very first character', false], ['None of them; the method returns true for this input', false]],
        'Every closer matches, but one "(" is never closed, so the stack is non-empty at the end.'),
      mcq('Why does the next-greater-element solution push indices onto the stack instead of values?',
        [['The index says which result slot to fill on a pop', true], ['A Deque cannot store int values, even when they are boxed to Integer', false], ['Indices are smaller numbers and so save memory', false], ['Storing values would make the stack increasing', false]],
        'When a larger element arrives, the popped entries need their answer written to res[index]; a bare value does not say where.'),
    ],
    checkpoint: [
      ck('DSA_STACK', 'Deque<Integer> d = new ArrayDeque<>(); d.push(1); d.push(2); d.push(3); What does d.pop() return?',
        [['3', true], ['1', false], ['2', false], ['null', false]],
        'push adds to the front and pop removes from the front, so the last element pushed comes out first.'),
      ck('DSA_STACK', 'What does nextGreater return for the Java array {4, 3, 2, 1}?',
        [['{-1, -1, -1, -1}', true], ['{3, 2, 1, -1}', false], ['{-1, 4, 3, 2}', false], ['{1, 1, 1, -1}', false]],
        'The array is strictly decreasing, so no element has a larger element to its right and every slot keeps its -1.'),
      ck('DSA_STACK', 'Queue<Integer> q = new ArrayDeque<>(); q.offer(1); q.offer(2); q.poll(); q.offer(3); What does q.peek() return?',
        [['2', true], ['1', false], ['3', false], ['null', false]],
        'The queue holds 1, 2; poll removes 1; offer adds 3 at the tail; the head is now 2.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_DSA_LINEAR_HASHING',
    notes: `When a brute-force solution asks "have I seen this before?" or "how many of these are there?" inside
a loop, a \`HashMap\` or \`HashSet\` usually turns O(n²) into O(n), because lookups are O(1) on
average.

## Classic 1: two-sum, returning indices

**Problem.** Return the indices of the two numbers in an unsorted \`int[]\` that add to \`target\`.

    static int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> indexOf = new HashMap<>();      // value → index
        for (int i = 0; i < nums.length; i++) {
            Integer j = indexOf.get(target - nums[i]);
            if (j != null) return new int[] { j, i };
            indexOf.put(nums[i], i);
        }
        return new int[0];
    }

Look up the complement **before** inserting the current number, so an element never pairs with
itself (\`[3, 4]\`, target 6, must not return \`[0, 0]\`). Duplicates still work: \`[3, 3]\` finds the
first 3 when it reaches the second. **O(n) time, O(n) space.**

## Classic 2: first non-repeating character

    static int firstUnique(String s) {
        Map<Character, Integer> count = new HashMap<>();
        for (char c : s.toCharArray()) count.merge(c, 1, Integer::sum);
        for (int i = 0; i < s.length(); i++) {
            if (count.get(s.charAt(i)) == 1) return i;
        }
        return -1;
    }

Two passes: count, then scan in the original order. For lowercase letters only, an \`int[26]\` indexed
by \`c - 'a'\` does the same job with less overhead.

## Classic 3: group anagrams

    static Collection<List<String>> group(String[] words) {
        Map<String, List<String>> groups = new HashMap<>();
        for (String w : words) {
            char[] cs = w.toCharArray();
            Arrays.sort(cs);
            groups.computeIfAbsent(new String(cs), k -> new ArrayList<>()).add(w);
        }
        return groups.values();
    }

Anagrams share a **canonical key** — the sorted letters. Cost: O(n · m log m) for n words of length m.

## The equals/hashCode contract

A hash map finds a key by \`hashCode()\` and then confirms with \`equals()\`. If you use your own class
as a key you must override **both**, consistently: equal objects must have equal hash codes. Override
only \`equals\` and two equal keys land in different buckets, so \`get\` returns \`null\`. And never
mutate a field used in \`hashCode\` while the object is a key — the entry becomes unreachable.

## Edge cases

Empty input, a single element, all elements the same, negative numbers (fine as keys), and the
\`Integer\` caching trap: compare \`Integer\` values from a map with \`equals\` or unbox them; \`==\` on
two \`Integer\`s above 127 compares references.`,
    mcqs: [
      mcq('In the Java two-sum with a HashMap, why is the complement looked up before nums[i] is put into the map?',
        [['So an element is never paired with itself', true], ['Because put would overwrite the complement', false], ['Because HashMap.get fails on a fresh key', false], ['To keep the map entries sorted by index', false]],
        'With target 6 and nums[i] = 3, inserting first would let the lookup find the same 3 and return the same index twice.'),
      mcq('A class Point overrides equals but not hashCode, and is used as a HashMap key. What happens with an equal Point passed to get?',
        [['Usually null, as it hashes to a different bucket', true], ['It always finds the entry by calling equals', false], ['It throws a ClassCastException at runtime', false], ['The class fails to compile until hashCode exists', false]],
        'Object.hashCode is identity-based, so two equal points get different hashes and the map searches the wrong bucket.'),
      mcq('Grouping anagrams in Java, which key puts "listen" and "silent" in the same group?',
        [['The word letters sorted, as a new String', true], ['The word itself, converted to lower case', false], ['The word length, boxed as an Integer', false], ['The first letter of the word, as a char', false]],
        'Anagrams have the same letters in a different order, so sorting gives an identical canonical string, "eilnst".'),
    ],
    checkpoint: [
      ck('DSA_HASHING', 'For lowercase-only strings, why can an int[26] replace a HashMap<Character, Integer> for counting letters?',
        [['c - \'a\' maps each letter to a fixed index 0 to 25', true], ['A HashMap cannot use a char value as its key', false], ['An int array keeps the letters sorted for free as they are counted', false], ['A HashMap would count uppercase letters twice', false]],
        'With a known small alphabet, the letter itself gives the index, so there is no hashing or boxing — the same O(n) with less overhead.'),
      ck('DSA_HASHING', 'What does twoSum return for nums = {2, 7, 11, 15} and target 9?',
        [['{0, 1}', true], ['{1, 0}', false], ['{2, 7}', false], ['An empty array', false]],
        'At i = 1, 9 - 7 = 2 is in the map at index 0, so it returns {j, i} = {0, 1} — indices, not values.'),
      ck('DSA_HASHING', 'Integer a = map.get("x"), b = map.get("y"); both hold 500. Why can a == b be false?',
        [['== compares references; only -128..127 are cached', true], ['HashMap stores a rounded copy of each value it is given', false], ['The value 500 overflows the Integer type', false], ['get returns a String rather than an Integer', false]],
        'Autoboxing reuses cached Integer objects only for small values. Two boxed 500s are different objects; use equals or compare ints.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_DSA_LINEAR_RECURSION',
    notes: `A recursive method solves a problem by calling itself on a smaller version of it. Every correct one
has two parts: a **base case** that answers directly, and a **recursive case** that makes the input
strictly smaller so the base case is always reached.

    static int sumDigits(int n) {
        if (n < 10) return n;                 // base case
        return n % 10 + sumDigits(n / 10);     // smaller input
    }

## The call stack

Each call gets its own frame with its own \`n\`. \`sumDigits(472)\` waits on \`sumDigits(47)\`, which
waits on \`sumDigits(4)\`; \`4\` returns, then \`7 + 4\`, then \`2 + 11 = 13\`. Recursion n levels deep
costs **O(n) stack space**, and Java does not optimise tail calls — very deep recursion throws
\`StackOverflowError\`, so a depth in the tens of thousands is a reason to write a loop.

## Backtracking: choose, explore, un-choose

**Classic: generate all subsets of an array.**

    static List<List<Integer>> subsets(int[] nums) {
        List<List<Integer>> out = new ArrayList<>();
        build(nums, 0, new ArrayList<>(), out);
        return out;
    }

    static void build(int[] nums, int i, List<Integer> current, List<List<Integer>> out) {
        if (i == nums.length) {                    // decided every element
            out.add(new ArrayList<>(current));     // store a COPY
            return;
        }
        build(nums, i + 1, current, out);           // exclude nums[i]
        current.add(nums[i]);                       // choose
        build(nums, i + 1, current, out);           // include nums[i]
        current.remove(current.size() - 1);         // un-choose
    }

Each element is either in or out: **2ⁿ subsets, O(n · 2ⁿ) time** counting the copies. Two bugs are
classic. Adding \`current\` itself instead of a copy leaves \`out\` holding 2ⁿ references to one list
that ends empty. Forgetting the un-choose step leaks choices into sibling branches.
\`current.remove(current.size() - 1)\` removes by **index**; \`current.remove(x)\` with an \`Integer\`
would remove by value.

## Permutations

    static void permute(List<Integer> cur, boolean[] used, int[] nums, List<List<Integer>> out) {
        if (cur.size() == nums.length) { out.add(new ArrayList<>(cur)); return; }
        for (int i = 0; i < nums.length; i++) {
            if (used[i]) continue;
            used[i] = true;  cur.add(nums[i]);
            permute(cur, used, nums, out);
            used[i] = false; cur.remove(cur.size() - 1);
        }
    }

n! orderings, **O(n · n!)**. Resetting \`used[i]\` and removing the last element are the un-choose.

## Writing one

State in a sentence what the method returns for an input; write the base case for the smallest
input (empty, zero, one element); assume the call on the smaller input works, and use it. Then trace
the smallest non-trivial case by hand.`,
    mcqs: [
      mcq('In the Java subsets backtracking, out.add(current) is written instead of out.add(new ArrayList<>(current)). What does out contain at the end?',
        [['2ⁿ references to one list, which ends empty', true], ['Every subset, stored correctly', false], ['Only the full set, repeated 2ⁿ times', false], ['Nothing, since the code fails to compile', false]],
        'All entries point to one mutable list. Backtracking removes everything from it by the end, so every entry shows an empty list.'),
      mcq('Inside the backtracking, current is a List<Integer>. Why remove the last choice with current.remove(current.size() - 1)?',
        [['It removes by index; remove(Integer) removes by value', true], ['remove(Object) is not defined on an ArrayList', false], ['It is faster than clearing and rebuilding the whole list each time', false], ['It re-sorts the list after the element is removed', false]],
        'List has remove(int index) and remove(Object o). Passing a boxed value calls the second, which may remove a different occurrence.'),
      mcq('How much stack space does a Java recursion that goes n levels deep use, ignoring any data it allocates?',
        [['O(n), one frame per active call', true], ['O(1), since frames are reused', false], ['O(log n), since frames are shared', false], ['O(n²), since each frame copies the last', false]],
        'Every call that has not returned keeps its frame on the stack. Java does not perform tail-call elimination.'),
    ],
    checkpoint: [
      ck('DSA_RECURSION', 'What does sumDigits(9045) return, with base case if (n < 10) return n?',
        [['18', true], ['9', false], ['45', false], ['0', false]],
        '5 + sumDigits(904) = 5 + 4 + sumDigits(90) = 5 + 4 + 0 + 9 = 18.'),
      ck('DSA_RECURSION', 'How many lists does the subsets method produce for an input array of 4 elements?',
        [['16', true], ['4', false], ['8', false], ['24', false]],
        'Each element is independently included or excluded, so there are 2⁴ = 16 subsets, including the empty one.'),
      ck('DSA_RECURSION', 'A permutation backtracking forgets used[i] = false after the recursive call. What goes wrong?',
        [['Later branches find no unused numbers, so lists go missing', true], ['Every permutation is produced exactly twice, once per recursive branch', false], ['It always throws a StackOverflowError', false], ['The permutations come out in reverse order', false]],
        'Without un-choosing, numbers stay marked as used after their branch, so siblings cannot pick them and their lists never fill.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_DSA_LINEAR_SORTING_SEARCHING',
    notes: `## Sorting with the library

    int[] a = {5, 2, 9};
    Arrays.sort(a);                               // primitives: dual-pivot quicksort

    String[] names = {"Ravi", "anu", "Kiran"};
    Arrays.sort(names, String.CASE_INSENSITIVE_ORDER);

    List<Student> list = ...;
    list.sort(Comparator.comparingInt(Student::getMarks).reversed()
                        .thenComparing(Student::getName));

Both are O(n log n) on average. For objects Java uses TimSort, which is **stable** — equal elements
keep their original order — so sorting by name and then by marks leaves equal marks in name order.
Write a comparator with \`Integer.compare(a, b)\` or \`Comparator.comparingInt\`, never \`a - b\`: the
subtraction overflows for large values of opposite sign and gives the wrong sign.

## Merge sort by hand

    static void mergeSort(int[] a, int lo, int hi) {          // sorts a[lo..hi]
        if (lo >= hi) return;                                  // 0 or 1 element
        int mid = lo + (hi - lo) / 2;
        mergeSort(a, lo, mid);
        mergeSort(a, mid + 1, hi);
        int[] tmp = new int[hi - lo + 1];
        int i = lo, j = mid + 1, k = 0;
        while (i <= mid && j <= hi) tmp[k++] = (a[i] <= a[j]) ? a[i++] : a[j++];
        while (i <= mid) tmp[k++] = a[i++];
        while (j <= hi)  tmp[k++] = a[j++];
        System.arraycopy(tmp, 0, a, lo, tmp.length);
    }

Split in half, sort each half, merge. log n levels with O(n) merging per level: **O(n log n) time in
every case, O(n) extra space.** \`<=\` in the merge keeps it stable.

## The classic: binary search

    static int binarySearch(int[] a, int target) {
        int lo = 0, hi = a.length - 1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            if (a[mid] == target) return mid;
            if (a[mid] < target) lo = mid + 1;
            else hi = mid - 1;
        }
        return -1;
    }

**O(log n) time, O(1) space**, on sorted data only. Three details decide correctness: the range is
**inclusive** (\`hi = a.length - 1\`, so the loop is \`lo <= hi\`); both updates move **past** \`mid\`
(otherwise a range can stop shrinking and loop forever); and \`mid\` is \`lo + (hi - lo) / 2\`,
because \`(lo + hi) / 2\` overflows when both are above about a billion.

## Lower bound: the first position ≥ target

    int lo = 0, hi = a.length;                 // half-open [lo, hi)
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] < target) lo = mid + 1; else hi = mid;
    }
    // lo is the first index with a[lo] >= target (a.length if none)

This finds the first occurrence among duplicates and the insertion point. \`Arrays.binarySearch\`
returns *some* matching index — not necessarily the first — or \`-(insertionPoint) - 1\` when absent.`,
    mcqs: [
      mcq('Why is (a, b) -> a - b a risky Comparator<Integer> in Java?',
        [['a - b can overflow and return the wrong sign', true], ['A comparator must return only -1, 0 or 1', false], ['Subtraction is not allowed on Integer objects', false], ['It quietly sorts in descending order instead', false]],
        'With a near Integer.MAX_VALUE and b negative, a - b wraps around to a negative number. Integer.compare never overflows.'),
      mcq('A list is sorted by name, then sorted again by marks with list.sort. What happens to two students with equal marks?',
        [['They stay in name order, as the object sort is stable', true], ['Their relative order becomes unpredictable', false], ['They are reversed relative to their earlier name order by the sort', false], ['One of them is dropped as a duplicate entry', false]],
        'List.sort and Arrays.sort on objects use TimSort, which is stable: equal elements keep their previous relative order.'),
      mcq('What does Arrays.binarySearch(new int[]{10, 20, 30}, 25) return?',
        [['-3', true], ['-1', false], ['2', false], ['-2', false]],
        '25 would be inserted at index 2. For a missing key the method returns -(insertionPoint) - 1 = -(2) - 1 = -3.'),
    ],
    checkpoint: [
      ck('DSA_SORTING', 'What is the worst-case time of merge sort on n Java ints, and why does it not degrade like quicksort can?',
        [['O(n log n); it always splits exactly in half', true], ['O(n²); an already sorted input unbalances it', false], ['O(n); each merge step is linear in the input', false], ['O(log n); every level halves the remaining work', false]],
        'Merge sort splits by position, not by a pivot value, so every input gives log n levels of O(n) merging.'),
      ck('DSA_SORTING', 'In the inclusive binary search, the update hi = mid is used instead of hi = mid - 1. What can happen?',
        [['An infinite loop once lo equals hi and the target is absent', true], ['The method returns the wrong index whenever there is an exact match', false], ['An ArrayIndexOutOfBoundsException on the first pass', false], ['Nothing changes, since both updates are equivalent', false]],
        'With lo == hi == mid and a[mid] > target, hi stays at mid, the range never shrinks and lo <= hi stays true.'),
      ck('DSA_SORTING', 'Using the half-open lower-bound loop on {1, 2, 2, 2, 5} with target 2, what is lo at the end?',
        [['1', true], ['2', false], ['3', false], ['4', false]],
        'Lower bound finds the first index whose value is at least 2, which is index 1 — the first of the three 2s.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_DSA_LINEAR_DEBUGGING',
    notes: `DSA bugs cluster around boundaries: the first and last element, the empty input, the largest value.
These five appear in interview code constantly. For each, read the broken code, say what input
breaks it, and say why.

## Bug 1: off-by-one in binary search

    int lo = 0, hi = a.length - 1;
    while (lo < hi) {              // BUG
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) return mid;
        if (a[mid] < target) lo = mid + 1; else hi = mid - 1;
    }
    return -1;

**Breaks on:** \`{7}\` with target 7 — the loop never runs, so it returns -1. More generally, the
target at the position where \`lo\` and \`hi\` meet is never checked. **Diagnosis:** \`hi\` is
inclusive, so the range \`[lo, hi]\` is non-empty while \`lo <= hi\`. **Fix:** \`while (lo <= hi)\`.
Pick one convention — inclusive \`[lo, hi]\` or half-open \`[lo, hi)\` — and make the loop condition
and both updates agree with it.

## Bug 2: integer overflow in the midpoint

    int mid = (lo + hi) / 2;       // BUG for very large ranges

**Breaks on:** indices above about 1.07 billion — \`lo + hi\` passes \`Integer.MAX_VALUE\`, wraps
negative, and \`a[mid]\` throws \`ArrayIndexOutOfBoundsException\`. The same bug hides in binary search
on an answer range like \`0..2_000_000_000\`. **Fix:** \`lo + (hi - lo) / 2\`, or \`(lo + hi) >>> 1\`.

## Bug 3: the missing base case

    static int countDown(int n) {
        return 1 + countDown(n - 1);        // BUG: never stops
    }

**Breaks on:** every input, with \`StackOverflowError\`. A stack trace with the same line repeated
hundreds of times is the signature. A subtler version has a base case that is skipped:
\`if (n == 0)\` with a step of \`n - 2\` misses 0 for odd n. **Fix:** a base case every input reaches —
\`if (n <= 0) return 0;\`.

## Bug 4: the null next pointer

    while (cur.next != null) {
        if (cur.next.val == x) cur.next = cur.next.next;
        cur = cur.next;                     // BUG
    }

**Breaks on:** deleting the last node — \`cur.next\` becomes \`null\`, then \`cur = cur.next\` sets
\`cur\` to \`null\`, and the loop condition \`cur.next\` throws \`NullPointerException\`. It also skips the
node after every deletion. **Fix:** advance only when nothing was deleted:
\`if (...) cur.next = cur.next.next; else cur = cur.next;\`. Also check \`head == null\` first.

## Bug 5: modifying a list while iterating

    for (Integer x : list) {
        if (x % 2 == 0) list.remove(x);      // BUG
    }

**Breaks on:** most lists with an even number in them: \`ConcurrentModificationException\`. The
for-each loop uses an iterator that notices the list changed under it. **Fix:**
\`list.removeIf(x -> x % 2 == 0)\`, or use the iterator's own \`it.remove()\`, or loop backwards by
index.

## The method

Before running anything, try the code by hand on: the empty input, one element, two elements, the
target at the first and at the last position, and the target absent.`,
    mcqs: [
      mcq('A Java binary search uses hi = a.length - 1 with the loop while (lo < hi). Which input returns the wrong answer?',
        [['A one-element array whose element is the target', true], ['A long array with the target in the exact middle', false], ['Any array in which the target value is missing', false], ['An array whose elements are all negative numbers', false]],
        'With one element lo == hi, so lo < hi is false at once and the method returns -1 without checking the only element.'),
      mcq('Why can int mid = (lo + hi) / 2 throw ArrayIndexOutOfBoundsException on a huge Java array?',
        [['lo + hi can pass Integer.MAX_VALUE and wrap negative', true], ['Integer division always rounds the midpoint upward', false], ['Java arrays cannot hold more than 2^16 elements', false], ['The JVM rejects any division inside an array index', false]],
        'The sum overflows before the division, producing a negative mid. lo + (hi - lo) / 2 never exceeds hi.'),
      mcq('A recursive method fails with StackOverflowError and the trace shows the same line hundreds of times. What is the most likely cause?',
        [['A base case that is missing or never reached', true], ['A list being modified while it is iterated', false], ['An int overflow in a loop counter variable', false], ['A HashMap key class with no hashCode method', false]],
        'Endless recursion keeps pushing frames until the stack is exhausted; the repeated frame is the call that never stops.'),
      mcq('A for-each loop over an ArrayList calls list.remove(x) when x is even, and throws ConcurrentModificationException. What is the cleanest fix?',
        [['list.removeIf(x -> x % 2 == 0)', true], ['Wrap the loop in a synchronized block', false], ['Catch the exception and keep looping', false], ['Change the ArrayList to a LinkedList', false]],
        'The for-each iterator fails fast when the list changes underneath it. removeIf (or iterator.remove) changes the list safely.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_DSA_LINEAR_PRACTICE',
    notes: `Solve each in Java without looking at the notes, then state the time and space cost before you run
it. Test the empty and one-element cases every time.

## Exercise 1 — Move zeroes

Move every 0 in an \`int[]\` to the end, keeping the order of the other elements, in place. (Two
pointers: one reads, one writes. O(n), O(1).)

## Exercise 2 — Remove the n-th node from the end

Given a linked list head and n, remove the n-th node from the end in one pass. (A dummy node, and a
lead pointer n steps ahead.)

## Exercise 3 — Daily temperatures

For each day, how many days until a warmer one, or 0. (A monotonic stack of indices — the same shape
as next greater element.)

## Exercise 4 — Valid anagram

Are two strings anagrams? Write it with an \`int[26]\`, then with a \`HashMap\`, and say when the map is
necessary.

## Exercise 5 — Search a rotated sorted array

\`{4, 5, 6, 7, 0, 1, 2}\`: find a target in O(log n). (At each \`mid\`, one half is sorted; decide
whether the target lies in it.)

## Exercise 6 — The graded exercise: longest substring without repeating characters

Read one line and print the length of its longest substring with no repeated character. A
variable-size sliding window with a \`HashMap<Character, Integer>\` of last-seen positions solves it
in O(n). This one is auto-graded.`,
    mcqs: [
      mcq('For "abba", a sliding window stores each character last index. At the second "a", the map says index 0 but left is already 2. What must the code do?',
        [['Keep left at 2, as index 0 is outside the window', true], ['Move left to 1, one place past the old "a"', false], ['Reset left to 0 and restart the whole scan', false], ['Remove "a" from the map and skip the character', false]],
        'A stale entry from before the window must not move left backwards. Only move left when the last-seen index is at or after left.'),
      mcq('Moving zeroes to the end in place with a read pointer and a write pointer costs what?',
        [['O(n) time and O(1) extra space', true], ['O(n²) time and O(1) extra space', false], ['O(n log n) time and O(n) extra space', false], ['O(n) time and O(n) extra space', false]],
        'One pass copies each non-zero forward to the write position, then the tail is filled with zeroes; no second array is needed.'),
      mcq('To remove the n-th node from the end in one pass, how far ahead does the lead pointer start?',
        [['n steps ahead of the trailing pointer', true], ['Half the list length ahead of it', false], ['One step ahead, moving two at a time', false], ['At the tail, found by a first pass', false]],
        'When the lead reaches the end, the trailing pointer is n nodes behind it — just before the node to remove.'),
      mcq('Daily temperatures asks, for each day, how many days until a warmer one. Why is a monotonic stack the right structure?',
        [['Each day waits on it until a warmer day pops it', true], ['The days must first be sorted by temperature', false], ['A queue would return the answers in reverse', false], ['It allows binary search over the future days', false]],
        'It is next greater element with a distance: popped index i gets answer current - i. Each day is pushed and popped once, so O(n).'),
      mcq('When does a valid-anagram check need a HashMap rather than an int[26]?',
        [['When the strings may hold any Unicode character', true], ['When the strings are longer than 26 characters', false], ['When the strings contain repeated letters', false], ['When the two strings have different lengths', false]],
        'int[26] only covers a to z. For arbitrary characters the alphabet is unbounded, so a map keyed by character is needed.'),
    ],
    assignment: {
      title: 'Longest Substring Without Repeating Characters',
      description: 'A variable-size sliding window in Java: read a string and print its longest run of distinct characters.',
      instructions: `Read **one line** from standard input: a string of 1 to 100 000 characters with no spaces
(letters, digits and symbols).

Print a single integer: the length of the **longest substring** (a contiguous run) in which no
character appears twice.

Examples:

| Input | Output | Why |
|---|---|---|
| \`abcabcbb\` | \`3\` | "abc" |
| \`bbbbb\` | \`1\` | "b" |
| \`pwwkew\` | \`3\` | "wke" — "pwke" is a subsequence, not a substring |

Requirements:

- Solve it in **O(n)** with a sliding window: move the right edge every step, and move the left edge
  only when the new character is already inside the window.
- A remembered position from *before* the window must not move the left edge backwards — "abba" has
  the answer 2, and code that forgets this prints 3.
- Write the time and space cost of your solution in a comment at the top of \`main\`.`,
      rubric: [
        { criterion: 'Correct length', description: 'Every test passes, including repeated runs, a single character and stale positions such as "abba".', maxPoints: 50 },
        { criterion: 'Linear sliding window', description: 'Each index enters and leaves the window at most once; no nested rescans of the window.', maxPoints: 30 },
        { criterion: 'Stated cost', description: 'Time O(n) and space O(min(n, alphabet)) stated and justified in a comment.', maxPoints: 20 },
      ],
      totalPoints: 100,
      coding: {
        language: 'java',
        starter: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        String s = in.nextLine().trim();

        // TODO: slide a window over s, tracking where each character was last seen
        // TODO: print the length of the longest window with no repeated character
    }
}
`,
        tests: [
          { input: 'abcabcbb\n', expectedOutput: '3' },
          { input: 'bbbbb\n', expectedOutput: '1' },
          { input: 'pwwkew\n', expectedOutput: '3' },
          { input: 'abba\n', expectedOutput: '2', isHidden: true },
          { input: 'dvdf\n', expectedOutput: '3', isHidden: true },
          { input: 'tmmzuxt\n', expectedOutput: '5', isHidden: true },
          { input: 'a\n', expectedOutput: '1', isHidden: true },
          { input: 'abcdefghij\n', expectedOutput: '10', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },
  {
    unitCode: 'JT_JAVA_DSA_LINEAR_INTERVIEW_QUESTION',
    notes: `The four linear-structure questions asked most in Java coding rounds. Interviewers grade the
explanation as much as the code: say the brute force, say why it is slow, then say the better idea
and its cost **before** you type.

## Q1. "Reverse a singly linked list."

**Say aloud.** "I'll walk the list once with three references — \`prev\`, \`cur\` and \`next\`. At each
node I save \`cur.next\`, point \`cur.next\` back at \`prev\`, and step both forward. When \`cur\` is
null, \`prev\` is the new head. That's O(n) time and O(1) space. For an empty list it returns null,
for one node it returns that node."

    ListNode prev = null, cur = head;
    while (cur != null) { ListNode next = cur.next; cur.next = prev; prev = cur; cur = next; }
    return prev;

**Follow-up:** "Now do it recursively." — \`reverse(head.next)\` returns the new head; then
\`head.next.next = head; head.next = null;\`. Same O(n) time but O(n) stack, so for very long lists the
iterative version is safer in Java.

## Q2. "Detect a cycle in a linked list."

**Say aloud.** "The simple way is a \`HashSet\` of visited nodes — O(n) time and O(n) space. I can do
it in O(1) space with Floyd's: a slow pointer moving one step and a fast pointer moving two. If there
is no cycle, fast reaches null. If there is one, fast gains a node each step, so it must meet slow."

**Follow-up:** "Where does the cycle start?" — After they meet, move one pointer back to the head and
step both one at a time; they meet again at the cycle's first node.

## Q3. "Two-sum: return the indices of two numbers that add to the target."

**Say aloud.** "Brute force checks every pair — O(n²). Instead I'll keep a \`HashMap\` from value to
index. For each number I look up \`target - num\`; if it's there I have my pair, otherwise I store
this number. Looking up before storing stops a number pairing with itself. O(n) time, O(n) space."

**Follow-up:** "What if the array is sorted?" — Two pointers from both ends: O(n) time and O(1)
space, no map.

## Q4. "Is this string of brackets valid?"

**Say aloud.** "Every closer must match the most recent unmatched opener — last in, first out — so
it's a stack. I push the expected closer for each opener, and for each closer I pop and compare. It
fails if the stack is empty when a closer arrives or non-empty at the end. O(n) time, O(n) space.
I'll use \`ArrayDeque\`, not the legacy \`Stack\` class."

**Follow-up:** "Only one bracket type?" — Then a counter is enough: +1 for \`(\`, -1 for \`)\`, fail if
it goes negative, and it must end at 0. O(1) space.`,
    mcqs: [
      mcq('You reverse a Java linked list recursively instead of iteratively. What changes in the complexity?',
        [['Space rises from O(1) to O(n) for the call stack', true], ['Time rises from O(n) to O(n²) for the extra calls', false], ['Nothing changes; both versions use O(1) space', false], ['Time falls to O(log n), as the list is halved', false]],
        'Each recursive call holds a frame until the end of the list is reached, so n frames are live at once. Time stays O(n).'),
      mcq('After Floyd slow and fast pointers meet inside a cycle, how do you find the node where the cycle begins?',
        [['Reset one to head; step both by one until they meet', true], ['The meeting node is always where the cycle starts', false], ['Keep stepping fast by two until it reaches head', false], ['Count the cycle length, then return the head node', false]],
        'The distance from head to the cycle start equals the distance from the meeting point to the start, so stepping both by one meets there.'),
      mcq('For valid brackets with only "(" and ")", what can replace the stack?',
        [['A counter that never goes negative and ends at 0', true], ['A boolean flag that is set on every "("', false], ['A HashSet holding every position seen', false], ['Sorting the string and comparing halves', false]],
        'With one bracket type there is nothing to match except the count of open brackets, so a counter gives O(1) space.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_DSA_LINEAR_CHECKPOINT',
    notes: `Ten questions across the whole topic: complexity, arrays and windows, linked lists, stacks and
queues, hashing, recursion, and sorting and searching. Each one is a piece of Java to trace or a
decision to make. Work them by hand before choosing.`,
    checkpoint: [
      ck('DSA_COMPLEXITY', 'A Java method sorts an int[] with Arrays.sort and then scans it once for adjacent duplicates. What is its overall time complexity?',
        [['O(n log n)', true], ['O(n)', false], ['O(n²)', false], ['O(log n)', false]],
        'The sort costs O(n log n) and the scan O(n). The larger term dominates, so the total is O(n log n).'),
      ck('DSA_ARRAYS', 'Reversing an int[] in place by swapping a[i] and a[n - 1 - i], how far must i go?',
        [['Up to, but not including, n / 2', true], ['All the way up to n - 1', false], ['Up to and including n / 2 + 1', false], ['Only as far as n / 4', false]],
        'Each swap fixes two positions. Going past the middle swaps the pairs back and undoes the work.'),
      ck('DSA_LINKED_LIST', 'ListNode a = new ListNode(1); a.next = new ListNode(2); a.next.next = a; What does hasCycle(a) return?',
        [['true', true], ['false', false], ['It throws a NullPointerException', false], ['It never returns', false]],
        'Node 2 points back to node 1, forming a cycle. Floyd moves fast two steps per round and meets slow, so it returns true.'),
      ck('DSA_STACK', 'Which string makes the valid-parentheses method fail on the empty-stack check rather than at the end?',
        [['"])"', true], ['"(("', false], ['"([])"', false], ['"{"', false]],
        'The first character is a closer and the stack is empty, so it returns false immediately. "((" and "{" fail at the final isEmpty, and "([])" is valid.'),
      ck('DSA_HASHING', 'Counting word frequencies, a student writes map.put(w, map.get(w) + 1) for each word. What happens on the first occurrence of a word?',
        [['A NullPointerException from unboxing null', true], ['The count is correctly set to 1', false], ['The count is set to 0 for that word', false], ['The word is skipped without any error', false]],
        'get returns null for an absent key, and null + 1 unboxes null. merge(w, 1, Integer::sum) or getOrDefault avoids it.'),
      ck('DSA_RECURSION', 'static int f(int n) { if (n == 0) return 0; return n + f(n - 2); } What does f(5) do?',
        [['Throws StackOverflowError, as n skips 0', true], ['Returns 9, the sum of 5, 3 and 1', false], ['Returns 15, the sum of 1 through 5', false], ['Returns 5, after a single call', false]],
        'Stepping by 2 from an odd number goes 5, 3, 1, -1 and never hits 0, so the base case is never reached. The guard should be n <= 0.'),
      ck('DSA_SORTING', 'Students are sorted with Comparator.comparingInt(Student::getMarks).reversed(). In what order are they?',
        [['Highest marks first', true], ['Lowest marks first', false], ['Alphabetical by name', false], ['Original insertion order', false]],
        'comparingInt sorts ascending by marks, and reversed() flips it to descending.'),
      ck('DSA_SORTING', 'A binary search returns the first index where a[i] >= target. What does it return for target 99 in {1, 5, 9}?',
        [['3, the array length', true], ['2, the last index', false], ['-1, meaning absent', false], ['0, the first index', false]],
        'No element is at least 99, so the insertion point is the end of the array — the half-open search finishes with lo = a.length.'),
      ck('DSA_HASHING', 'Which Java structure answers "has this value been seen?" in O(1) average time with no value attached?',
        [['HashSet<Integer>', true], ['ArrayList<Integer>', false], ['TreeMap<Integer, Integer>', false], ['ArrayDeque<Integer>', false]],
        'HashSet.add and contains are O(1) on average. ArrayList and ArrayDeque search linearly; TreeMap is O(log n).'),
      ck('DSA_ARRAYS', 'In the fixed-size window maximum, the first loop sums a[0..k-1] but k is larger than a.length. What happens?',
        [['ArrayIndexOutOfBoundsException unless k is checked', true], ['It returns the sum of the whole array', false], ['It returns 0 because no window fits', false], ['It returns the single largest element', false]],
        'The loop reads a[i] for i up to k-1, past the end of the array. Validate k <= a.length before sliding.'),
    ],
  },
];

export const TRACK_JAVA_CONCURRENCY_DSA_BUNDLES: PilotBundle[] = [...CONCURRENCY, ...DSA_LINEAR];
