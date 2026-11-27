/**
 * Career-track content, .NET Full Stack + AI batch N1: async C# and the .NET runtime (JT_CS_ASYNC) and
 * DSA in C# over linear structures (JT_CS_DSA_LINEAR).
 *
 * Async is taught through what actually happens when the code runs — which thread continues after an
 * await, where an exception goes, why .Result can hang — because that is what breaks in an ASP.NET
 * Core service and what an interviewer probes. It has no auto-graded exercise: whether code is
 * correctly concurrent cannot be judged from what it prints.
 *
 * DSA is taught again in C#, because the years teach it in Python and a .NET candidate is asked to
 * write C#: every concept unit names a classic problem, solves it in full, and states its cost and
 * edge cases. The graded exercise (subarray sum equals k) runs on Mono, about C# 7, so its starter
 * uses a classic Main.
 *
 * Attribution: JT_CS_ASYNC is single-skill and names none. JT_CS_DSA_LINEAR is multi-skill, so every
 * checkpoint question names the one skill it measures, from its unit's own skillKeys (or, for the
 * closing units, from the topic's seven).
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const ASYNC: PilotBundle[] = [
  /* ══ JT_CS_ASYNC — Async C# and the .NET Runtime ═══════════════════════════════════════ */
  {
    unitCode: 'JT_CS_ASYNC_TASKS',
    notes: `A **thread** is an independent path of execution inside a process. Every C# program starts on one
thread — the main thread — and can run work on others. Threads share the process's heap (its
objects) but each has its own stack (its locals and call frames).

## The thread pool

Creating an operating-system thread is expensive: it reserves about 1 MB of stack and costs a
system call. So .NET keeps a **thread pool** — a set of worker threads it creates once and reuses.
You almost never write \`new Thread(...)\` in application code; you hand work to the pool.

    using System.Threading;

    var t = new Thread(() => Console.WriteLine("on a dedicated thread"));
    t.Start();   // a new OS thread runs the lambda
    t.Join();    // the caller waits until it finishes

That works, but it is the old way. The modern unit of work is a **Task**.

## Task and Task<T>

A \`Task\` is a *promise of work that will finish later*. \`Task<T>\` is one that finishes with a value
of type \`T\`. A task has a \`Status\` (\`Running\`, \`RanToCompletion\`, \`Faulted\`, \`Canceled\`) and,
when it is a \`Task<T>\`, a \`Result\`.

    using System.Threading.Tasks;

    Task<long> sumTask = Task.Run(() =>
    {
        long sum = 0;
        for (int i = 1; i <= 1_000_000; i++) sum += i;
        return sum;
    });

    Console.WriteLine("main keeps going while the pool adds");
    long total = await sumTask;          // or sumTask.Result in old code — see the next lesson
    Console.WriteLine(total);            // 500000500000

\`Task.Run\` queues the lambda to the thread pool and returns immediately with a task that represents
it. The caller is free to do other work, and later **awaits** the task to get the value.

## Waiting for a result: await, Wait and Result

| Way | What it does | Exceptions |
|---|---|---|
| \`await task\` | frees the current thread until the task finishes, then continues | rethrows the original exception |
| \`task.Wait()\` | blocks the current thread until it finishes | wraps it in \`AggregateException\` |
| \`task.Result\` | blocks, then returns the value | wraps it in \`AggregateException\` |

    Task bad = Task.Run(() => throw new InvalidOperationException("no stock"));
    try { bad.Wait(); }
    catch (AggregateException ex)           // NOT InvalidOperationException
    {
        Console.WriteLine(ex.InnerException.Message);   // no stock
    }

\`await\` unwraps the exception for you, which is one of many reasons to prefer it. Blocking with
\`.Wait()\` or \`.Result\` also holds a thread hostage while doing nothing — the pool has to create
more threads to keep up, and in some environments it deadlocks outright (next lesson).

## CPU-bound versus I/O-bound

This distinction decides everything that follows:

- **CPU-bound** work keeps a processor busy: resizing an image, hashing a million passwords.
  \`Task.Run\` moves it off the current thread so a UI stays responsive, or splits it across cores.
- **I/O-bound** work waits on something outside the process: an HTTP call, a database query, a
  file read. No thread needs to be busy while the network card does its job. Methods like
  \`HttpClient.GetStringAsync\` already return a \`Task\`; you just \`await\` them. Wrapping them in
  \`Task.Run\` wastes a pool thread.

In a web API almost everything is I/O-bound, which is why ASP.NET Core code is \`async\` from the
controller down to the database call.

## Starting several tasks

    Task<int> a = Task.Run(() => SlowSquare(3));
    Task<int> b = Task.Run(() => SlowSquare(4));
    int sum = await a + await b;    // both were already running before the first await

Starting both before awaiting either lets them overlap. Writing \`await Task.Run(...)\` twice in a
row would run them one after the other.

## Common mistakes

- Using \`new Thread\` for short jobs instead of the pool.
- Wrapping an already-async I/O call in \`Task.Run\`.
- Catching \`InvalidOperationException\` around \`.Wait()\` — the exception arrives wrapped.
- Awaiting each task immediately after starting it, so nothing actually overlaps.`,
    workedExample: `**Goal: checksum three large files at the same time and print the results in a fixed order.**

    string[] paths = { "a.bin", "b.bin", "c.bin" };

    Task<string>[] jobs = new Task<string>[paths.Length];
    for (int i = 0; i < paths.Length; i++)
    {
        string p = paths[i];                       // copy: each lambda gets its own path
        jobs[i] = Task.Run(() => Sha256Of(p));     // CPU-bound hashing goes to the pool
    }

    string[] hashes = await Task.WhenAll(jobs);    // waits for all three, results in array order
    for (int i = 0; i < paths.Length; i++)
        Console.WriteLine($"{paths[i]}  {hashes[i]}");

Three decisions matter. Hashing is CPU-bound, so \`Task.Run\` is right here (for downloading the
files it would not be). All three tasks are started before anything is awaited, so they overlap.
And the output order comes from the **array**, not from which task finished first —
\`Task.WhenAll\` returns results in the order the tasks were passed, so the print is deterministic
even though the hashing is not.`,
    mcqs: [
      mcq('In C#, Task.Run(() => Compute()) is called. Where does Compute() run?',
        [['On a thread-pool worker thread, while the caller continues', true], ['On the calling thread, before Task.Run returns to it', false], ['On a brand-new dedicated OS thread that is created just for this call', false], ['On the UI thread, after the current event handler ends', false]],
        'Task.Run queues the delegate to the .NET thread pool and returns a Task at once; a pool worker picks it up and runs it.'),
      mcq('A C# method calls task.Wait() on a Task that threw InvalidOperationException. What does the catch block actually receive?',
        [['An AggregateException wrapping the InvalidOperationException', true], ['The InvalidOperationException itself, rethrown exactly as the task threw it', false], ['A TaskCanceledException, as the task did not complete', false], ['Nothing; Wait() swallows exceptions from the task', false]],
        'Wait() and Result wrap task failures in AggregateException. Only await rethrows the original exception directly.'),
      mcq('Which of these is I/O-bound work that should be awaited directly, not wrapped in Task.Run, in an ASP.NET Core action?',
        [['await httpClient.GetStringAsync(url)', true], ['Resizing a 4000-pixel image in memory', false], ['Computing SHA-256 of a large byte array', false], ['Sorting ten million integers in a List<int>', false]],
        'An HTTP call spends its time waiting on the network; no thread needs to be busy. The other three keep a CPU busy.'),
    ],
    checkpoint: [
      mcq('Task<int> a = Task.Run(() => Slow(1)); Task<int> b = Task.Run(() => Slow(2)); int s = await a + await b; Do the two Slow calls overlap?',
        [['Yes; both tasks were started before either was awaited', true], ['No; await a stops b from starting until the first task a has finished', false], ['No; Task.Run runs each delegate on the calling thread', false], ['Only if the method is marked with [Parallel]', false]],
        'Task.Run starts each task immediately. Awaiting a only pauses this method; b is already running on another pool thread.'),
      mcq('A C# Task<string> finished by throwing an exception that nobody caught. What is its Status?',
        [['Faulted', true], ['Canceled', false], ['RanToCompletion', false], ['WaitingForActivation', false]],
        'A task that ends with an unhandled exception is Faulted. Canceled is reserved for an OperationCanceledException tied to its token.'),
      mcq('Why does .NET run Task.Run work on a thread pool instead of creating a new Thread per call?',
        [['Creating OS threads is costly, so pool threads are reused', true], ['Pool threads skip the garbage collector entirely', false], ['A new Thread object can never hand a return value back to its caller', false], ['The pool runs every task on one core to avoid races', false]],
        'Each OS thread reserves a stack and costs a system call to create. The pool keeps workers alive and reuses them for many short tasks.'),
    ],
  },
  {
    unitCode: 'JT_CS_ASYNC_ASYNC_AWAIT',
    notes: `\`async\` and \`await\` (C# 5 and later) let you write code that waits for I/O without holding a thread,
while still reading top to bottom like ordinary code.

## What an async method looks like

    public async Task<Order> GetOrderAsync(int id)
    {
        string json = await _http.GetStringAsync($"/orders/{id}");   // waits without a thread
        return JsonSerializer.Deserialize<Order>(json)!;
    }

- \`async\` on the method lets you use \`await\` inside it, and makes the compiler rewrite the method
  into a state machine.
- The declared return type is \`Task<Order>\`, but the body \`return\`s an \`Order\` — the compiler wraps
  it in the task.
- By convention the name ends in **Async**.
- Return \`Task\` when there is no value, \`Task<T>\` when there is one. (\`ValueTask<T>\` exists for hot
  paths that usually finish synchronously; use \`Task\` until a profiler says otherwise.)

## What await actually does

When execution reaches \`await someTask\`:

1. If the task is **already complete**, the method simply continues — no thread switch at all.
2. If not, the method **returns to its caller** at that point, handing back an incomplete task. The
   current thread is free to do other work.
3. When \`someTask\` completes, the rest of the method (the *continuation*) is scheduled to run —
   in a console app or ASP.NET Core on any thread-pool thread.

    static async Task<int> LoadAsync()
    {
        Console.Write("A");
        await Task.Delay(100);     // returns to the caller here
        Console.Write("B");
        return 1;
    }

    Task<int> t = LoadAsync();     // prints A, then comes back
    Console.Write("C");
    await t;
    Console.Write("D");            // whole output: ACBD

Everything before the first incomplete \`await\` runs **synchronously** on the caller's thread. That
is why "A" prints before "C".

## Async all the way down

An async method should be awaited by an async caller, all the way up to the entry point — a
controller action in ASP.NET Core, \`async Task Main\` (C# 7.1+) or top-level statements in a console
app. Mixing in a blocking call breaks the chain:

    public IActionResult Get(int id)
    {
        var order = _repo.GetOrderAsync(id).Result;   // DON'T: blocks a request thread
        return Ok(order);
    }

## The .Result deadlock

In an environment with a **SynchronizationContext** that allows one thread at a time — a WinForms
or WPF UI thread, or classic ASP.NET on .NET Framework — this deadlocks:

    // on the UI thread
    string s = DownloadAsync().Result;

1. \`DownloadAsync\` hits an \`await\`, captures the UI context, and returns an incomplete task.
2. \`.Result\` blocks the UI thread waiting for that task.
3. The download finishes; the continuation must run **on the UI thread** (the captured context).
4. The UI thread is blocked in step 2. Neither can proceed — a deadlock, with 0% CPU.

ASP.NET Core has **no** SynchronizationContext, so this exact deadlock does not happen there — but
blocking still starves the thread pool under load, so the rule stands: **don't block on async
code; await it.**

## ConfigureAwait(false)

    string json = await _http.GetStringAsync(url).ConfigureAwait(false);

\`ConfigureAwait(false)\` tells the await *not* to resume on the captured context. Library code (a
NuGet package that may be called from a UI app) uses it on every await. In ASP.NET Core application
code it changes nothing, since there is no context to capture.

## async void

    async void OnSaveClicked(object sender, EventArgs e) { ... }   // only for event handlers

An \`async void\` method returns nothing the caller can await, so the caller cannot know when it
finishes, and an exception thrown inside it cannot be caught by the caller — it is raised on the
context and typically **crashes the process**. Use \`async Task\` everywhere except event handlers.

## Exceptions

An exception thrown inside an \`async Task\` method is stored in the returned task (status
\`Faulted\`). It surfaces when someone awaits the task — so an un-awaited task can fail silently.

    Task t = SaveAsync();      // throws inside — nothing happens here
    // ...
    await t;                   // the exception is rethrown here

## Common mistakes

- \`.Result\` or \`.Wait()\` on a task in application code.
- \`async void\` for anything that is not an event handler.
- Forgetting to await a task (the compiler warns with CS4014 — read the warning).
- An \`async\` method with no \`await\` inside: it runs entirely synchronously (warning CS1998).`,
    workedExample: `**Goal: turn a blocking repository method into a correct async one.**

Before:

    public Customer Find(int id)
    {
        using var conn = new SqlConnection(_cs);
        conn.Open();
        return conn.QuerySingle<Customer>("select * from Customers where Id = @id", new { id });
    }

After:

    public async Task<Customer> FindAsync(int id, CancellationToken ct = default)
    {
        await using var conn = new SqlConnection(_cs);
        await conn.OpenAsync(ct);
        return await conn.QuerySingleAsync<Customer>(
            new CommandDefinition("select * from Customers where Id = @id", new { id }, cancellationToken: ct));
    }

What changed, and why:

1. The return type became \`Task<Customer>\` and the name gained \`Async\`.
2. Every blocking call has an async twin (\`OpenAsync\`, \`QuerySingleAsync\`) that is awaited, so no
   thread waits on the database.
3. \`await using\` (C# 8+) disposes the connection asynchronously.
4. A \`CancellationToken\` is accepted and passed down, so an abandoned HTTP request stops the query.
5. Every caller now changes too — the controller becomes \`async Task<IActionResult>\` and awaits
   \`FindAsync\`. That ripple is "async all the way down", and it is expected.`,
    mcqs: [
      mcq('static async Task<int> F() { Console.Write("1"); await Task.Delay(50); Console.Write("2"); return 0; } In Main: var t = F(); Console.Write("3"); t.Wait(); What does the console show?',
        [['132', true], ['123', false], ['312', false], ['321', false]],
        'Code before the first incomplete await runs synchronously, so 1 prints; F then returns to Main, which prints 3; after the delay, 2 prints.'),
      mcq('Why should an async C# method return Task rather than void, unless it is an event handler?',
        [['Callers can await a Task and catch what it throws', true], ['A void method cannot contain any await expression', false], ['Task methods always run on a background thread', false], ['async void methods are rejected by the compiler', false]],
        'async void gives the caller nothing to await, so it cannot know when the work ends, and its exceptions escape to the context and can crash the app.'),
      mcq('In a WPF button handler, string s = LoadAsync().Result; hangs forever while LoadAsync awaits an HTTP call. Why?',
        [['The continuation needs the UI thread, which .Result is blocking', true], ['HttpClient refuses to send requests from a UI thread in a WPF application', false], ['.Result waits only for tasks started with Task.Run', false], ['The HTTP call is cancelled when the button is clicked', false]],
        'The await captured the UI context, so the rest of LoadAsync must run on the UI thread — which is stuck inside .Result. Each waits for the other.'),
    ],
    checkpoint: [
      mcq('An async C# method is declared as async Task<int> CountAsync(). What type does its return statement hand back?',
        [['An int, which the compiler wraps in the Task', true], ['A Task<int> that the method builds itself with Task.FromResult', false], ['A Task, since the int is discarded', false], ['An object, boxed by the async machinery', false]],
        'Inside an async method you return the value itself; the compiler-generated state machine completes the returned Task<int> with it.'),
      mcq('A C# library method used by WPF and ASP.NET Core apps awaits a stream read. What does adding .ConfigureAwait(false) to that await do?',
        [['Resumes the method without returning to the captured context', true], ['Runs the stream read synchronously on the calling thread instead', false], ['Suppresses any exception that the stream read throws', false], ['Makes the awaited stream read impossible to cancel', false]],
        'It tells the await not to marshal the continuation back to the SynchronizationContext, which avoids the UI deadlock and saves a hop.'),
      mcq('Task t = SaveAsync(); is called without await, and SaveAsync throws inside after its first await. What does the calling method see?',
        [['Nothing; the exception sits in the task until it is awaited', true], ['The exception is thrown straight away at the Task t = SaveAsync() line', false], ['An AggregateException is thrown at the next statement', false], ['The compiler refuses to build code that does not await', false]],
        'An async Task method stores its exception in the task it returned. Unless someone awaits or inspects the task, the failure goes unnoticed.'),
    ],
  },
  {
    unitCode: 'JT_CS_ASYNC_WHENALL_CANCEL',
    notes: `Once each call is async, the next win is running independent calls **at the same time**, and
stopping them when nobody needs the answer any more.

## Sequential versus concurrent

    // Sequential: about 300 + 200 + 400 = 900 ms
    var user    = await _users.GetAsync(id);
    var orders  = await _orders.GetForUserAsync(id);
    var reviews = await _reviews.GetForUserAsync(id);

    // Concurrent: about max(300, 200, 400) = 400 ms
    Task<User>          userTask    = _users.GetAsync(id);
    Task<List<Order>>   ordersTask  = _orders.GetForUserAsync(id);
    Task<List<Review>>  reviewsTask = _reviews.GetForUserAsync(id);

    await Task.WhenAll(userTask, ordersTask, reviewsTask);
    var page = new ProfilePage(userTask.Result, ordersTask.Result, reviewsTask.Result);

The three calls are started (the methods are called) before anything is awaited, so the waits
overlap. After \`await Task.WhenAll\`, reading \`.Result\` is safe — every task is already complete, so
it does not block.

Only do this when the calls are independent. If the second call needs the first's result, they
must be sequential. And beware shared resources: an EF Core \`DbContext\` does **not** allow two
operations at once on the same instance.

## Task.WhenAll with values

    int[] ids = { 4, 8, 15 };
    Product[] products = await Task.WhenAll(ids.Select(id => _api.GetProductAsync(id)));

\`Task.WhenAll\` over \`Task<T>\` returns \`T[]\` in the **same order as the tasks**, regardless of which
finished first.

## When several tasks fail

\`Task.WhenAll\` waits for **all** tasks, even after one fails. Then:

- \`await Task.WhenAll(...)\` rethrows **one** exception — the first in the aggregated list.
- The task returned by \`WhenAll\` holds them all in \`.Exception.InnerExceptions\`.

    Task all = Task.WhenAll(t1, t2, t3);
    try { await all; }
    catch (Exception first)
    {
        foreach (var ex in all.Exception!.InnerExceptions)
            _log.LogError(ex, "one of the calls failed");
    }

## Task.WhenAny: the first to finish

    Task<string> primary = _primary.GetAsync(key);
    Task<string> mirror  = _mirror.GetAsync(key);
    Task<string> winner  = await Task.WhenAny(primary, mirror);
    string value = await winner;      // await again to get the value or the exception

\`WhenAny\` returns the task that finished first (it never throws itself). The loser keeps running
unless you cancel it.

## Cancellation with CancellationToken

.NET cancellation is **cooperative**: you cannot kill a task, you can only ask it to stop.

    using var cts = new CancellationTokenSource();
    cts.CancelAfter(TimeSpan.FromSeconds(2));         // a timeout

    try
    {
        string body = await _http.GetStringAsync(url, cts.Token);
    }
    catch (OperationCanceledException)
    {
        Console.WriteLine("gave up after 2 seconds");
    }

- A \`CancellationTokenSource\` owns the "cancel" button; its \`.Token\` is passed down to everything.
- Async APIs that accept a token stop and throw \`OperationCanceledException\` (or its subclass
  \`TaskCanceledException\`) when it fires.
- Your own loops check it: \`ct.ThrowIfCancellationRequested();\` at the top of each iteration.
- A task that ends this way has status **Canceled**, not Faulted.

In ASP.NET Core, add a \`CancellationToken\` parameter to an action and the framework passes one that
fires when the client disconnects — pass it on to EF Core and \`HttpClient\`.

## Timeouts

- \`cts.CancelAfter(...)\` or \`new CancellationTokenSource(TimeSpan)\` — cancels the work itself.
- \`await task.WaitAsync(TimeSpan.FromSeconds(2))\` (.NET 6+) — stops *waiting* and throws
  \`TimeoutException\`, but the underlying work keeps going unless it was also given a token.

## Linking tokens

    using var linked = CancellationTokenSource.CreateLinkedTokenSource(requestToken);
    linked.CancelAfter(TimeSpan.FromSeconds(5));
    await _slowService.RunAsync(linked.Token);   // stops on client disconnect OR after 5 s

## Common mistakes

- Awaiting each call in turn when the calls are independent.
- Running two queries concurrently on one \`DbContext\`.
- Catching only \`TaskCanceledException\` — catch \`OperationCanceledException\`, which covers both.
- Accepting a token and never passing it on, so cancellation does nothing.`,
    mcqs: [
      mcq('Three independent C# async calls take 300 ms, 200 ms and 400 ms. All three are started, then awaited with Task.WhenAll. About how long does it take?',
        [['About 400 ms, the longest single call', true], ['About 900 ms, the sum of all three calls', false], ['About 300 ms, the average of the three', false], ['About 200 ms, the shortest single call', false]],
        'The waits overlap, so the whole thing takes as long as the slowest call, plus a little overhead.'),
      mcq('Inside a C# loop that processes 10 000 rows, how should the code honour a CancellationToken ct it was given?',
        [['Call ct.ThrowIfCancellationRequested() on each pass of the loop', true], ['Call Thread.Abort() on the worker thread when ct fires', false], ['Nothing is needed; the runtime stops the loop by itself', false], ['Wrap the whole loop in a lock statement on the token', false]],
        'Cancellation in .NET is cooperative: code checks the token and throws OperationCanceledException itself. Thread.Abort is not supported on .NET Core.'),
      mcq('Task<string> w = await Task.WhenAny(primary, mirror); and the mirror finishes first by throwing. What happens at that await line?',
        [['Nothing is thrown; w is the faulted mirror task', true], ['The mirror exception is rethrown at once by WhenAny', false], ['WhenAny waits on for primary, since mirror failed', false], ['An AggregateException with one inner error is thrown', false]],
        'WhenAny completes successfully with whichever task finished first, faulted or not. The exception only surfaces when you await w itself.'),
    ],
    checkpoint: [
      mcq('await Task.WhenAll(a, b) where both a and b throw InvalidOperationException. How many exceptions does the catch block receive, and where are the rest?',
        [['One is thrown; the WhenAll task Exception holds both', true], ['Two are thrown, one after the other, to the catch block', false], ['An AggregateException with both is thrown by the await', false], ['Only the second; the first is dropped by the runtime', false]],
        'await rethrows a single exception. Keep a reference to the WhenAll task and read its Exception.InnerExceptions to log every failure.'),
      mcq('var cts = new CancellationTokenSource(); cts.Cancel(); then await Task.Delay(1000, cts.Token); What happens?',
        [['A TaskCanceledException is thrown right away', true], ['The delay runs the full second, then returns', false], ['The delay returns at once without any error', false], ['An ObjectDisposedException is thrown at once', false]],
        'The token is already cancelled, so the delay task completes as Canceled and awaiting it throws TaskCanceledException, a subclass of OperationCanceledException.'),
      mcq('An ASP.NET Core action starts two queries at once on the same EF Core DbContext and awaits Task.WhenAll. What is the likely result?',
        [['An InvalidOperationException about a second operation on the context', true], ['Both queries run in parallel on one shared database connection', false], ['EF Core silently runs the queries one after the other for you', false], ['A deadlock, because both queries hold the same table lock', false]],
        'A DbContext is not thread-safe and allows one operation at a time; EF Core detects the overlap and throws. Use separate contexts or await in turn.'),
    ],
  },
  {
    unitCode: 'JT_CS_ASYNC_THREAD_SAFETY',
    notes: `When two threads read and write the same data, the result can depend on timing. That is a **race
condition**, and the classic example is a counter.

## The lost update

    int hits = 0;
    Parallel.For(0, 100_000, i => hits++);
    Console.WriteLine(hits);     // 61 873, then 74 210 … rarely 100 000

\`hits++\` is three steps: read \`hits\`, add one, write it back. Two threads can both read 500, both
compute 501, and both write 501 — one increment is lost. The total is too small and different every
run: that signature means an unprotected read-modify-write.

## Fix 1: Interlocked for one number

    Parallel.For(0, 100_000, i => Interlocked.Increment(ref hits));   // always 100 000

\`Interlocked.Increment\`, \`Add\`, \`Exchange\` and \`CompareExchange\` do the whole read-modify-write as
one atomic CPU instruction. They are the cheapest fix, but only work on a single variable.

## Fix 2: lock for anything bigger

    private readonly object _gate = new();
    private decimal _balance;

    public bool Withdraw(decimal amount)
    {
        lock (_gate)
        {
            if (_balance < amount) return false;   // check ...
            _balance -= amount;                    // ... then act, with no gap between
            return true;
        }
    }

\`lock\` lets one thread at a time run the block for a given lock object. Use a **private** object
created for the purpose — never \`lock (this)\`, a \`Type\` or a string, which outside code can also
lock. (C# 13 on .NET 9 adds a dedicated \`System.Threading.Lock\` type; \`lock (object)\` is what you
will see everywhere else.)

**You cannot \`await\` inside a \`lock\`** — the compiler rejects it (CS1996), because the code after the
await may resume on a different thread from the one that took the lock. For async code use
\`SemaphoreSlim\`:

    private readonly SemaphoreSlim _sem = new(1, 1);

    await _sem.WaitAsync();
    try   { await RefreshCacheAsync(); }
    finally { _sem.Release(); }

## Fix 3: concurrent collections

\`List<T>\` and \`Dictionary<TKey,TValue>\` are **not** thread-safe: concurrent writes can lose items,
corrupt the internal arrays or throw. \`System.Collections.Concurrent\` has safe versions:

    var counts = new ConcurrentDictionary<string, int>();
    Parallel.ForEach(words, w => counts.AddOrUpdate(w, 1, (_, old) => old + 1));

- \`ConcurrentDictionary\` — \`TryAdd\`, \`GetOrAdd\`, \`AddOrUpdate\` are atomic.
- \`ConcurrentQueue<T>\`, \`ConcurrentBag<T>\` — producer/consumer lists.
- \`Channel<T>\` (System.Threading.Channels) — async producer/consumer pipelines.

A thread-safe collection does not make **two** calls atomic:

    if (!cache.ContainsKey(key))          // two threads can both pass this check
        cache[key] = Load(key);           // and both load
    // instead:
    var value = cache.GetOrAdd(key, k => Load(k));

Note that \`GetOrAdd\`'s factory can still run more than once under contention — only one result is
stored. If \`Load\` must run exactly once, store a \`Lazy<T>\`.

## Deadlock

    // thread 1                 // thread 2
    lock (a) {                  lock (b) {
        lock (b) { ... }            lock (a) { ... }
    }                           }

Each thread holds one lock and waits for the other: the program hangs at 0% CPU. The fix is a
**global lock order** — always take \`a\` before \`b\`, whatever the arguments — and holding locks for
as little as possible, never while calling unknown code.

## Common mistakes

- \`count++\` on shared state from several tasks.
- Locking on \`this\` or on a different object in different methods.
- Check-then-act split across two calls on a concurrent collection.
- Trying to \`await\` inside \`lock\` and then "fixing" it with \`.Result\`.`,
    mcqs: [
      mcq('Parallel.For(0, 50_000, i => total++); prints 41 377 one run and 46 902 the next. What is the cause?',
        [['total++ is a read-modify-write and updates are lost', true], ['Parallel.For skips some iterations when it is busy', false], ['The int total overflows after about 32 000 additions', false], ['The JIT reorders the loop and drops the late iterations', false]],
        'Two threads read the same value and write back the same incremented value, so one increment vanishes. Interlocked.Increment fixes it.'),
      mcq('A C# method must refresh a cache with await RefreshAsync() while no other caller refreshes it. Which tool fits?',
        [['SemaphoreSlim(1, 1) with await WaitAsync() and Release in finally', true], ['lock (_gate) { await RefreshAsync(); } around the call', false], ['Interlocked.Increment on a flag before calling the method', false], ['Marking the cache field volatile so writes are visible', false]],
        'await is not allowed inside lock (CS1996). SemaphoreSlim supports asynchronous waiting and gives the same one-at-a-time guarantee.'),
      mcq('Why is lock (this) discouraged inside a public C# class?',
        [['Outside code can lock the same object and cause deadlocks', true], ['The compiler rejects lock on this inside any instance method', false], ['lock (this) makes every field in the class read-only', false], ['It locks every instance of the class at once, not just this one', false]],
        'Any caller holding a reference can also lock it, so you no longer control who holds your lock. A private readonly object avoids that.'),
    ],
    checkpoint: [
      mcq('var d = new Dictionary<string, int>(); several tasks run d[word] = d.GetValueOrDefault(word) + 1; at the same time. What can happen?',
        [['Lost counts, or the dictionary internals get corrupted', true], ['Every count comes out correct, since each single call is very short', false], ['A compile error, as Dictionary is not thread-safe', false], ['Each task gets its own private copy of the dictionary', false]],
        'Dictionary is not thread-safe. Concurrent writes can lose updates or damage its buckets; use ConcurrentDictionary.AddOrUpdate instead.'),
      mcq('Thread 1 runs lock (a) { lock (b) { } } and thread 2 runs lock (b) { lock (a) { } }. The app sometimes hangs at 0% CPU. What fixes it?',
        [['Make both threads take a before b, in one fixed order', true], ['Replace each lock with a call to Monitor.TryEnter(a)', false], ['Add Thread.Sleep(10) between the two lock statements', false], ['Mark both lock objects a and b as volatile fields', false]],
        'The hang is a deadlock from opposite lock orders. A single global order means no thread can hold one lock while waiting for the other.'),
      mcq('Which statement about ConcurrentDictionary.GetOrAdd(key, k => Load(k)) is accurate?',
        [['Under contention Load can run twice, but only one value is stored', true], ['Load is guaranteed to run exactly once per key, however many threads call it', false], ['GetOrAdd takes a global lock on the whole dictionary', false], ['It throws if two threads ask for the same key at once', false]],
        'GetOrAdd is atomic about what it stores, not about running the factory. Wrap the value in Lazy<T> when the factory must run once.'),
    ],
  },
  {
    unitCode: 'JT_CS_ASYNC_MEMORY_GC',
    notes: `.NET manages memory for you, but how it does so explains performance problems, interview questions
and a whole category of resource leaks.

## Stack and heap

- The **stack** holds each method call's frame: its parameters and local variables. It is per
  thread, small (about 1 MB by default), and freed automatically when the method returns.
- The **managed heap** holds objects created with \`new\` for reference types. It is shared by all
  threads and cleaned up by the **garbage collector (GC)**.

## Value types and reference types in memory

    struct Point { public int X, Y; }       // value type
    class Customer { public string Name; }  // reference type

    void M()
    {
        int count = 3;                    // the int lives in M's frame
        Point p = new Point();            // the whole Point lives in M's frame
        Customer c = new Customer();      // the reference lives in the frame, the object on the heap
    }

A value type's data lives **wherever it is declared**: in a local, in the stack frame; as a field
of a class, inside that object on the heap; in an array, inside the array on the heap. "Structs
live on the stack" is a simplification interviewers like to catch out.

Assigning a value type copies the data; assigning a reference type copies the reference, so two
variables point at one object.

## Boxing

    int n = 5;
    object o = n;      // boxing: a new heap object holding a copy of 5
    n = 6;
    Console.WriteLine(o);   // 5
    int back = (int)o;      // unboxing: copy the value out

Boxing allocates. A loop that boxes on every iteration — adding \`int\`s to a non-generic
\`ArrayList\`, or passing a struct as \`object\` — creates garbage for the GC. Generics
(\`List<int>\`) avoid it.

## How the garbage collector decides

The GC frees objects that are **unreachable**: no chain of references leads to them from a *root*
(a local variable on some thread's stack, a static field, a CPU register). It does not count
references, so two objects pointing at each other are still collected once nothing reaches them.

Setting a variable to \`null\` makes an object *eligible*; it is freed whenever the GC next runs,
which you do not control. Calling \`GC.Collect()\` yourself is almost always wrong.

## Generations

Most objects die young, so the heap is split by age:

- **Gen 0** — new objects. Collected often and cheaply.
- **Gen 1** — survived one collection; a buffer between young and old.
- **Gen 2** — long-lived objects (caches, singletons). Collected rarely; a full collection is
  expensive.
- **Large Object Heap (LOH)** — objects of 85 000 bytes or more (big arrays) go straight here and are
  reported as generation 2. Allocating many short-lived large arrays is a classic performance bug;
  \`ArrayPool<T>.Shared\` rents and returns buffers instead.

## IDisposable: memory is not the only resource

The GC knows about managed memory. It does **not** know that a \`FileStream\` holds an OS file handle
or a \`SqlConnection\` holds a pooled connection. Those types implement \`IDisposable\`, and you must
call \`Dispose()\` — deterministically, as soon as you are done:

    using (var reader = new StreamReader("orders.csv"))
    {
        Console.WriteLine(reader.ReadLine());
    }   // reader.Dispose() runs here, even if an exception was thrown

    using var conn = new SqlConnection(cs);   // C# 8 using declaration: disposed at end of scope

When several \`using\` blocks are nested, they dispose in reverse order — the last one acquired is
released first.

## Finalisers

A finaliser (\`~MyType()\`) runs on a GC thread at some unknown time after an object becomes
unreachable. It is a last-chance safety net for unmanaged handles, not a cleanup strategy: objects
with finalisers survive an extra collection and cost more. The standard pattern is: \`Dispose()\`
does the cleanup and calls \`GC.SuppressFinalize(this)\`; the finaliser only exists if the class
directly owns an unmanaged handle (rare — \`SafeHandle\` does it for you).

## Leaks in a garbage-collected language

The GC cannot free what is still reachable. The usual .NET "memory leak" is:

- a static \`List\` or \`Dictionary\` used as a cache that only ever grows;
- an event handler subscribed to a long-lived publisher and never unsubscribed (the publisher's
  delegate list keeps the subscriber alive);
- a \`HttpClient\` created per request, exhausting sockets (use \`IHttpClientFactory\`).`,
    mcqs: [
      mcq('A C# class Order has a field of type struct Money. Where does the Money data of a new Order live?',
        [['On the heap, inside the Order object', true], ['On the stack of the method that created the order', false], ['In a separate heap object the Order points to', false], ['In a static area shared by every Order instance', false]],
        'A value type is stored where it is declared. As a field of a class, it is part of that object, which is on the heap.'),
      mcq('int n = 5; object o = n; n = 6; Console.WriteLine(o); What is printed?',
        [['5', true], ['6', false], ['0', false], ['System.Int32', false]],
        'Boxing copies the value into a new heap object. Changing n afterwards does not touch the boxed copy, so o still holds 5.'),
      mcq('Why must a C# program call Dispose on a SqlConnection rather than wait for the garbage collector?',
        [['The GC frees memory, not connections, and runs at unknown times', true], ['The GC never collects any object that implements IDisposable', false], ['A SqlConnection is a struct, so the GC never sees it', false], ['Dispose makes the next garbage collection run more often', false]],
        'The GC only reclaims managed memory when it decides to. The pooled connection would stay held until then; Dispose releases it immediately.'),
    ],
    checkpoint: [
      mcq('Two C# objects reference each other, and nothing else references either of them. What does the garbage collector do?',
        [['Collects both, since neither is reachable from a root', true], ['Keeps both forever, since each holds the other alive', false], ['Collects one and keeps the other one as the survivor', false], ['Throws an exception reporting a reference cycle', false]],
        'The .NET GC traces reachability from roots; it does not count references. An isolated cycle is unreachable and is freed.'),
      mcq('A C# service allocates a new byte[200_000] on every request and discards it. Where do these arrays go, and why does it hurt?',
        [['The Large Object Heap, collected only with gen 2', true], ['Gen 0, where short-lived arrays are freed almost for free', false], ['The stack, so a deep request can overflow it', false], ['Gen 1, which is cleared on every allocation', false]],
        'Objects of 85 000 bytes or more go to the LOH, which is only collected with expensive gen 2 collections. ArrayPool<byte>.Shared avoids the churn.'),
      mcq('A long-lived publisher keeps a page subscribed through publisher.Changed += page.OnChanged; and the page is never unsubscribed. What happens to the page?',
        [['It stays alive, as the event delegate references it', true], ['It is collected once no local variable refers to it', false], ['It is disposed automatically by the event system', false], ['The event is removed when the page leaves scope', false]],
        'The publisher event holds a delegate whose target is the page, so the page stays reachable as long as the publisher lives — a classic .NET leak.'),
    ],
  },
  {
    unitCode: 'JT_CS_ASYNC_DEBUGGING',
    notes: `Async and threading bugs rarely fail the same way twice, so you debug them by recognising the
shape in the code, not by rerunning until it breaks. These seven cover most of what you will meet
in a .NET service.

## Fault 1: the request that never returns

    public IActionResult Report() => Ok(_service.BuildAsync().Result);

**Symptom.** In a WPF app or classic ASP.NET: hangs at 0% CPU. In ASP.NET Core under load: response
times climb and the thread-pool thread count keeps rising (thread-pool starvation).
**Cause.** Blocking on async code. **Fix.** Make the action \`async Task<IActionResult>\` and \`await\`
the call.

## Fault 2: the exception nobody saw

    _ = SendWelcomeEmailAsync(user);     // fire and forget
    return Ok();

**Symptom.** Users report missing emails; the logs show nothing. **Cause.** The task faulted and was
never awaited, so its exception was stored and dropped. **Fix.** Await it, or move the work to a
background queue (\`Channel<T>\` plus a hosted service) that logs failures.

## Fault 3: async void crashing the process

    async void ProcessMessage(Message m) { await _repo.SaveAsync(m); }

**Symptom.** The whole service dies with an unhandled exception from a thread-pool thread; a
\`try/catch\` around the call never fires. **Cause.** \`async void\` — the caller has no task to catch
through. **Fix.** \`async Task\`, and await it.

## Fault 4: the lost update

    private int _processed;
    await Parallel.ForEachAsync(files, async (f, ct) => { await HandleAsync(f, ct); _processed++; });

**Symptom.** The "processed" count is lower than the number of files, by a different amount each
run. **Cause.** \`_processed++\` from several threads. **Fix.** \`Interlocked.Increment(ref _processed)\`.

## Fault 5: the sequential "parallel" code

    foreach (var id in ids)
        results.Add(await _api.GetAsync(id));       // 50 ids × 200 ms = 10 s

**Symptom.** An endpoint takes seconds although each call is fast. **Cause.** Each call is awaited
before the next starts. **Fix.** Start them all and \`await Task.WhenAll(ids.Select(_api.GetAsync))\`
— with a limit (\`SemaphoreSlim\` or \`Parallel.ForEachAsync\` with \`MaxDegreeOfParallelism\`) if the
downstream service cannot take 50 at once.

## Fault 6: cancellation that does nothing

    public async Task<List<Row>> SearchAsync(string q, CancellationToken ct)
        => await _db.Rows.Where(r => r.Text.Contains(q)).ToListAsync();   // token not passed

**Symptom.** Users close the page but the database keeps running the expensive query. **Cause.**
The token is accepted and never passed on. **Fix.** \`ToListAsync(ct)\` — and pass it to every call
that takes one.

## Fault 7: the second operation on a DbContext

    var a = _db.Orders.CountAsync();
    var b = _db.Customers.CountAsync();
    await Task.WhenAll(a, b);

**Symptom.** \`InvalidOperationException: A second operation was started on this context instance
before a previous operation completed.\` **Cause.** \`DbContext\` is not thread-safe. **Fix.** Await
them in turn, or use two contexts (\`IDbContextFactory<T>\`).

## The method

1. Search for \`.Result\`, \`.Wait()\`, \`async void\` and \`_ =\` — each is a suspect.
2. List every piece of state more than one task touches; check each read-modify-write.
3. Follow every \`CancellationToken\` parameter to see where it stops being passed.
4. For a hang, take a dump (\`dotnet-dump collect\`, then \`dotnet-dump analyze\` and \`clrstack -all\`)
   or pause in the debugger's Parallel Stacks window before guessing.`,
    mcqs: [
      mcq('An ASP.NET Core API slows down badly under load, and dotnet-counters shows the thread-pool thread count climbing. The code calls _svc.LoadAsync().Result in many actions. What is the cause?',
        [['Blocking on async code is starving the thread pool', true], ['The garbage collector is pausing on every request', false], ['LoadAsync is running on the UI thread of the server', false], ['Kestrel limits the API to one request at a time', false]],
        'Each .Result holds a pool thread idle while it waits; under load the pool runs out of free threads and grows slowly. Await instead.'),
      mcq('A try/catch around a call to an async void method in C# never catches the exception, and the service crashes. Why?',
        [['async void returns no task, so its exception escapes the caller', true], ['The exception is caught but logged only at the debug level', false], ['async void methods cannot throw exceptions of their own', false], ['The catch only works if the call is wrapped in Task.Run', false]],
        'The caller of an async void method returns at the first await and has nothing to observe. The later exception is raised on the context or thread pool.'),
      mcq('A C# loop awaits _api.GetAsync(id) for 50 ids in turn; each call takes 200 ms and the endpoint takes 10 seconds. What is the fix?',
        [['Start all calls, then await Task.WhenAll on them', true], ['Wrap each await in Task.Run to free up the thread', false], ['Add ConfigureAwait(false) to each await in the loop', false], ['Call .Result instead of await inside the foreach', false]],
        'Awaiting inside the loop makes the calls sequential. Starting them first lets the waits overlap; add a concurrency limit if the server needs one.'),
      mcq('An EF Core search method takes a CancellationToken ct but calls ToListAsync() with no arguments. Users cancel and the query keeps running. What is wrong?',
        [['The token is never passed, so EF Core cannot cancel', true], ['ToListAsync ignores tokens on every database provider', false], ['Cancellation only works for methods returning void', false], ['The query must be wrapped in a lock to be cancelled', false]],
        'Cancellation is cooperative: only code that receives the token can stop. Passing ct to ToListAsync lets EF Core cancel the database command.'),
    ],
  },
  {
    unitCode: 'JT_CS_ASYNC_PRACTICE',
    notes: `Work these in a console app (\`dotnet new console\`, .NET 8). None is graded automatically — whether
async code is correct cannot be judged from what it prints — so for each, write down **before
running** what you expect, then explain any difference.

## Exercise 1 — Watch the threads

Write \`async Task StepAsync(string name)\` that prints \`name\` and
\`Environment.CurrentManagedThreadId\`, awaits \`Task.Delay(100)\`, and prints them again. Call it
three times from \`Main\` with \`await\`. Which thread ids change across the await, and why is that
fine in a console app?

## Exercise 2 — Sequential versus concurrent

Write a fake \`Task<int> FetchAsync(int id)\` that waits \`200 * id\` ms and returns \`id * 10\`. Time
(with \`Stopwatch\`) fetching ids 1, 2 and 3 one after another, then with \`Task.WhenAll\`. Predict both
times first. Then make id 2 throw and print **every** exception from the \`WhenAll\` task, not just
the one \`await\` rethrows.

## Exercise 3 — A timeout and a cancel key

Run a loop that prints a dot every 300 ms until cancelled. Cancel it after 2 seconds with
\`CancelAfter\`, **or** earlier when the user presses Enter (read the key on another task and call
\`cts.Cancel()\`). Catch \`OperationCanceledException\` and print how many dots were printed.

## Exercise 4 — Break it, then fix it three ways

Increment a shared \`int\` 100 000 times from \`Parallel.For\`. Print the result five times and note
how it varies. Fix it with \`Interlocked\`, then with \`lock\`, then by giving each iteration its own
local total (\`Parallel.For\` with \`localInit\` / \`localFinally\`). Time all three.

## Exercise 5 — Word counts from many files

Read every \`.txt\` file in a folder concurrently with \`File.ReadAllTextAsync\`, and count words into a
\`ConcurrentDictionary<string, int>\` with \`AddOrUpdate\`. Print the ten most frequent words. Then
replace the dictionary with a plain \`Dictionary\` and see what goes wrong.

## Exercise 6 — Find the leak

Create a static \`event EventHandler Tick\` and a class \`Widget\` that subscribes in its constructor.
Create 100 000 widgets in a loop without keeping them, call \`GC.Collect()\`, and print
\`GC.GetTotalMemory(true)\`. Then unsubscribe in \`Dispose\`, wrap each widget in \`using\`, and compare.`,
    mcqs: [
      mcq('In Exercise 1, a console app prints the managed thread id before and after await Task.Delay(100), and the ids differ. What explains it?',
        [['The continuation ran on whichever pool thread was free', true], ['The await created a brand-new dedicated OS thread', false], ['Task.Delay always moves the method back to the main thread', false], ['The thread id is randomised every time it is read', false]],
        'A console app has no SynchronizationContext, so after the await the rest of the method runs on any available thread-pool thread.'),
      mcq('In Exercise 2, FetchAsync(1), FetchAsync(2) and FetchAsync(3) wait 200, 400 and 600 ms. With Task.WhenAll, what total time should you predict?',
        [['About 600 ms', true], ['About 1200 ms', false], ['About 400 ms', false], ['About 200 ms', false]],
        'The three waits overlap, so the total is the longest single wait, 600 ms. Awaiting them one by one would take 1200 ms.'),
      mcq('In Exercise 3, why should the dot loop catch OperationCanceledException rather than only TaskCanceledException?',
        [['ThrowIfCancellationRequested throws the base type, not the subclass', true], ['TaskCanceledException cannot be caught from a loop body', false], ['CancelAfter throws TimeoutException, which derives from it', false], ['OperationCanceledException also covers every IOException', false]],
        'TaskCanceledException derives from OperationCanceledException. Your own token checks throw the base class, so catching the base covers both.'),
      mcq('In Exercise 4, why is the localInit / localFinally version of Parallel.For usually the fastest of the three fixes?',
        [['Each worker adds to its own total and merges once at the end', true], ['It turns off the race detector built into the .NET runtime', false], ['It runs every iteration on a single thread to avoid locks', false], ['It skips the iterations whose results would be thrown away', false]],
        'Interlocked and lock contend on every one of 100 000 increments. Per-thread totals touch shared state only once per worker.'),
      mcq('In Exercise 6, widgets subscribed to a static event are never collected. Which change lets the GC free them?',
        [['Unsubscribe from the event in Dispose, and dispose each widget', true], ['Call GC.Collect() twice in a row instead of only once', false], ['Mark the Widget class as sealed so the GC can find it', false], ['Set each widget variable to null at the end of the loop body each time', false]],
        'The static event delegate list references every subscriber, so they stay reachable. Removing the handler is the only way to break that reference.'),
    ],
  },
  {
    unitCode: 'JT_CS_ASYNC_INTERVIEW_QUESTION',
    notes: `Three questions asked in nearly every .NET backend interview. Say the answers aloud; the interviewer
is listening for whether you know what actually happens, not for the vocabulary.

## Q1. "What does await actually do? Does it create a new thread?"

**Model answer.** No, \`await\` does not create a thread. The compiler turns an async method into a
state machine. When execution reaches an \`await\` on a task that is not yet complete, the method
returns an incomplete task to its caller and the current thread is released to do other work. When
the awaited task completes, the rest of the method is scheduled as a continuation — on the captured
SynchronizationContext if there is one (a UI thread), otherwise on a thread-pool thread. For
I/O-bound work like a database or HTTP call, no thread is busy at all while we wait; the operating
system signals completion. That is why async improves a web server's **throughput**: the same
threads can serve more requests, even though each request is not faster.

**Follow-up:** "When would you use Task.Run then?" — For CPU-bound work you want off the current
thread, such as keeping a desktop UI responsive. Not in ASP.NET Core to "make something async":
that just moves the blocking to another pool thread.

## Q2. "Why can .Result or .Wait() deadlock?"

**Model answer.** In an environment with a single-threaded SynchronizationContext — a WPF or
WinForms UI thread, or classic ASP.NET — an \`await\` captures that context and must resume on it.
If the code on that thread then blocks with \`.Result\`, the thread is stuck waiting for the task, and
the task's continuation is waiting for the thread. Neither can move. The fixes are to await all the
way up, and in library code to use \`ConfigureAwait(false)\` so continuations do not need the
context. ASP.NET Core has no SynchronizationContext, so it does not deadlock this way, but blocking
still wastes pool threads and causes starvation under load. Blocking also wraps exceptions in
\`AggregateException\`.

**Follow-up:** "Is there ever a place to block?" — Rarely: at the very top of a program that cannot
be async. Since C# 7.1, \`Main\` itself can be \`async Task Main\`, so even that case is mostly gone.

## Q3. "How does the .NET garbage collector work?"

**Model answer.** It is a tracing, generational, compacting collector. It starts from roots — static
fields, locals on each thread's stack, CPU registers — and marks every object it can reach;
everything else is garbage, so reference cycles are not a problem. Objects start in generation 0,
and survivors are promoted to 1 and then 2. Because most objects die young, gen 0 collections are
frequent and cheap and gen 2 collections are rare. Objects of 85 000 bytes or more go on the Large
Object Heap, which is collected with gen 2. After marking, the GC compacts the heap so allocation
stays a fast pointer bump. The GC manages memory only — files, sockets and connections are released
with \`IDisposable\` and \`using\`.

**Follow-up:** "Can you have a memory leak in .NET?" — Yes, by keeping objects reachable: an
ever-growing static cache, or an event subscription to a long-lived object that is never removed.`,
    mcqs: [
      mcq('An interviewer asks whether awaiting an HTTP call in an ASP.NET Core action makes that single request faster. What is the accurate answer?',
        [['No; it frees the thread so the server handles more requests', true], ['Yes; the call is split across several CPU cores at once', false], ['Yes; await caches the response for the next caller', false], ['No; it makes each request slower and has no benefit', false]],
        'Async I/O improves scalability, not the latency of one call: while the request waits, its thread serves other requests.'),
      mcq('What does the .NET garbage collector use to decide that an object is garbage?',
        [['It is unreachable from any root, such as a static or local', true], ['Its reference count, kept by the runtime, has dropped to zero', false], ['It has not been read for a full GC cycle', false], ['Its Dispose method has already been called', false]],
        'The GC traces references from roots and frees whatever it cannot reach. It does not reference-count, and Dispose does not free memory.'),
      mcq('Why does library code commonly use ConfigureAwait(false) on its awaits?',
        [['So callers that block on the UI thread do not deadlock it', true], ['So the awaited operation runs synchronously and faster', false], ['So exceptions are wrapped in AggregateException', false], ['So the library works without needing a CancellationToken', false]],
        'Without the captured context the continuation can run on a pool thread, so a caller blocking the UI thread cannot starve it of the thread it needs.'),
    ],
  },
  {
    unitCode: 'JT_CS_ASYNC_CHECKPOINT',
    notes: `Ten questions across the whole topic: tasks, async and await, WhenAll and cancellation, thread
safety, and memory. Most show code and ask what it does. Trace each one as if the threads were
really running it.`,
    checkpoint: [
      mcq('static async Task<int> G() { return 7; } has no await inside. When var t = G(); returns, what is t.Status?',
        [['RanToCompletion', true], ['WaitingForActivation', false], ['Running', false], ['Created', false]],
        'With no await, the whole method runs synchronously before returning, so the task it hands back is already complete (with warning CS1998).'),
      mcq('try { Task.Run(() => throw new FormatException()).Wait(); } catch (FormatException) { Console.Write("F"); } catch (AggregateException) { Console.Write("A"); } What is printed?',
        [['A', true], ['F', false], ['FA', false], ['Nothing; the exception is lost', false]],
        'Wait() wraps the task failure in AggregateException, so the FormatException handler is skipped and the AggregateException handler runs.'),
      mcq('int n = 0; Parallel.For(0, 1000, i => Interlocked.Increment(ref n)); Console.WriteLine(n); What is printed?',
        [['1000, every time', true], ['A number at or below 1000 that varies', false], ['0, since n is captured by value', false], ['It does not compile: n is passed by ref', false]],
        'Interlocked.Increment makes each read-modify-write atomic, so no update is lost and the total is always 1000.'),
      mcq('A C# developer writes lock (_gate) { await SaveAsync(); }. What happens?',
        [['It does not compile: await is not allowed in a lock body', true], ['It compiles and holds the lock until SaveAsync completes', false], ['It compiles but releases the lock at the await point', false], ['It compiles and deadlocks on the first call every time', false]],
        'The compiler reports CS1996. The code after await could resume on another thread, which could not release a Monitor it does not own. Use SemaphoreSlim.'),
      mcq('An ASP.NET Core action takes a CancellationToken parameter. When does that token fire on its own?',
        [['When the client aborts the HTTP request', true], ['When the action has run for thirty seconds', false], ['When any other request throws an exception', false], ['Never; the action must cancel the token itself', false]],
        'ASP.NET Core binds it to HttpContext.RequestAborted, which fires when the client disconnects, so passing it on stops wasted work.'),
      mcq('string[] r = await Task.WhenAll(Fetch("a", 300), Fetch("b", 100)); where Fetch returns its name after the given delay in ms. What is r[0]?',
        [['"a", as results follow the order the tasks were passed', true], ['"b", as WhenAll lists results in the order they complete', false], ['It depends on which pool thread happened to run each task', false], ['null, as the first task finished last', false]],
        'Task.WhenAll returns results in argument order, not completion order, so r is { "a", "b" } every time.'),
      mcq('A C# loop adds an int to a non-generic ArrayList one million times. What extra cost does this create compared with List<int>?',
        [['A heap allocation per item, as each int is boxed', true], ['No extra cost; ArrayList stores ints unboxed', false], ['Each Add copies every item already in the list', false], ['The ArrayList is pinned and can never be collected', false]],
        'ArrayList stores object, so every int is boxed into a new heap object. List<int> stores the ints directly in its array.'),
      mcq('using (var a = new Res("A")) using (var b = new Res("B")) { } where Res.Dispose prints its name. What is printed?',
        [['BA', true], ['AB', false], ['A only', false], ['Nothing; Dispose waits for the GC', false]],
        'using blocks dispose in reverse order of acquisition: b was acquired last, so it is disposed first.'),
      mcq('After await task.WaitAsync(TimeSpan.FromSeconds(2)) throws TimeoutException, what is the state of the original work?',
        [['It keeps running unless it was also given a token', true], ['It is aborted at once by the runtime on timeout', false], ['It is rolled back to the state it had before it began', false], ['It is paused and resumes on the next await', false]],
        'WaitAsync only stops this caller from waiting. Stopping the work itself needs a CancellationToken that the work observes.'),
      mcq('A singleton service keeps a static Dictionary<string, Report> cache that only ever grows. Memory rises for days. What is happening?',
        [['The cached reports stay reachable, so the GC can never free them', true], ['The garbage collector is turned off for every singleton service', false], ['Dictionary pins its entries to the Large Object Heap forever', false], ['The reports are finalised but their memory is not returned', false]],
        'A static field is a GC root. Everything reachable from it lives forever; the fix is a bounded cache such as MemoryCache with size limits or expiry.'),
    ],
  },
];

const DSA_LINEAR: PilotBundle[] = [
  /* ══ JT_CS_DSA_LINEAR — DSA in C#: Linear Structures ═══════════════════════════════════ */
  {
    unitCode: 'JT_CS_DSA_LINEAR_COMPLEXITY',
    notes: `Big-O describes how the work a piece of code does **grows** as the input grows. You find it by
asking how many times the innermost operation runs for an input of size n, then keeping only the
fastest-growing term and dropping constants. You learned this in Python; the ideas are identical in
C#. What is new is knowing what the **.NET collections** cost, because a single innocent-looking
method call can hide a loop.

## Counting operations

    // O(n): one pass
    static long Sum(int[] a)
    {
        long total = 0;
        foreach (int x in a) total += x;
        return total;
    }

    // O(n²): a pass inside a pass
    static bool HasDuplicate(int[] a)
    {
        for (int i = 0; i < a.Length; i++)
            for (int j = i + 1; j < a.Length; j++)
                if (a[i] == a[j]) return true;
        return false;
    }

    // O(log n): the range halves each step
    static int Steps(int n)
    {
        int steps = 0;
        while (n > 1) { n /= 2; steps++; }
        return steps;
    }

Two loops one after the other are O(n + n) = O(n). Two loops over **different** inputs are
O(n + m), not O(n). A loop that halves its range is O(log n); doing that n times is O(n log n),
which is the cost of a good sort.

## What the C# collections cost

| Operation | Cost | Why |
|---|---|---|
| \`array[i]\`, \`list[i]\` | O(1) | index straight into the backing array |
| \`list.Add(x)\` | O(1) amortised | occasionally copies into an array twice as big |
| \`list.Insert(0, x)\`, \`list.RemoveAt(0)\` | O(n) | shifts every later element |
| \`list.Contains(x)\`, \`list.IndexOf(x)\`, \`list.Remove(x)\` | O(n) | linear search |
| \`dict[key]\`, \`dict.ContainsKey\`, \`hashSet.Contains\` | O(1) average | hashing |
| \`SortedDictionary\` / \`SortedSet\` add, remove, find | O(log n) | balanced tree |
| \`linkedList.AddFirst\` / \`AddLast\` / \`RemoveFirst\` | O(1) | relinks two nodes |
| \`stack.Push\` / \`Pop\`, \`queue.Enqueue\` / \`Dequeue\` | O(1) | (amortised for the push side) |
| \`Array.Sort\`, \`list.Sort\` | O(n log n) | introsort |

The hidden-loop trap:

    for (int i = 0; i < n; i++)
        if (!seen.Contains(x[i]))      // seen is a List<int>: O(n) each time
            seen.Add(x[i]);            // whole loop: O(n²)

Making \`seen\` a \`HashSet<int>\` turns the same loop into O(n). In an interview, stating that swap
and its reason is worth more than the code.

## Strings are immutable

\`string\` in C# never changes; every \`+\` builds a new string and copies both parts. So:

    string s = "";
    for (int i = 0; i < n; i++) s += i;      // O(n²) characters copied in total

    var sb = new StringBuilder();
    for (int i = 0; i < n; i++) sb.Append(i); // O(n) amortised
    string result = sb.ToString();

\`s.Substring(i, len)\` copies \`len\` characters, so it is O(len), not O(1). (\`ReadOnlySpan<char>\` and
\`s.AsSpan(i, len)\` slice without copying — common in performance code.)

## LINQ is not free

\`list.Where(...).Count()\` is a pass; \`list.OrderBy(...)\` is a sort, O(n log n). A LINQ call inside
a loop, such as \`items.Any(i => i.Id == id)\` for each of n ids, is O(n²). Build a \`HashSet\` or a
\`Dictionary\` first.

## Space complexity

Extra memory counts too. A new array of n elements is O(n) space; a few variables are O(1). A
recursive method that goes n calls deep uses O(n) stack even if it allocates nothing — and C#'s
default 1 MB stack overflows at a few thousand to tens of thousands of frames.

## Input sizes in a coding round

As a rule of thumb, about 10⁸ simple operations run in roughly a second. So for n = 10⁵, O(n²) =
10¹⁰ is far too slow and you need O(n log n) or O(n); for n ≤ 20, even O(2ⁿ) is fine.`,
    workedExample: `**Problem: given an int[] and a target, is there a pair that sums to the target?**

**Brute force — O(n²) time, O(1) space.**

    for (int i = 0; i < a.Length; i++)
        for (int j = i + 1; j < a.Length; j++)
            if (a[i] + a[j] == target) return true;
    return false;

**Sort, then two pointers — O(n log n) time, O(1) extra space (if sorting in place is allowed).**

    Array.Sort(a);
    int lo = 0, hi = a.Length - 1;
    while (lo < hi)
    {
        int s = a[lo] + a[hi];
        if (s == target) return true;
        if (s < target) lo++; else hi--;
    }
    return false;

**HashSet — O(n) time, O(n) space.**

    var seen = new HashSet<int>();
    foreach (int x in a)
    {
        if (seen.Contains(target - x)) return true;
        seen.Add(x);
    }
    return false;

Three answers, three trade-offs. Say all three in an interview: the brute force shows you
understand the problem; the sort version wins when memory is tight; the HashSet version wins when
time matters and the input may not be modified. And notice the edge case: if \`a[i] + a[j]\` could
overflow \`int\`, add them as \`long\`.`,
    mcqs: [
      mcq('A C# loop runs n times and calls list.Contains(x) on a List<int> that grows to n items. What is the total time?',
        [['O(n²), as each Contains is a linear search', true], ['O(n), as Contains is a hash lookup', false], ['O(n log n), as List<int> is kept sorted', false], ['O(1), as Contains is cached after the first call', false]],
        'List<T>.Contains scans the list, so n calls on up to n items cost O(n²). A HashSet<int> makes each check O(1) on average.'),
      mcq('A C# method builds a report with s += line; inside a loop over n lines. Why is it slow for large n?',
        [['Each += copies the whole string built so far', true], ['string += is evaluated lazily at the end of the loop', false], ['C# strings are limited to 65 535 characters', false], ['The loop variable is boxed on each iteration', false]],
        'Strings are immutable, so each concatenation allocates a new string and copies everything; the total is O(n²) characters. Use StringBuilder.'),
      mcq('Which .NET operation is O(n) on a List<int> with n items, rather than O(1)?',
        [['list.RemoveAt(0)', true], ['list[n / 2]', false], ['list.Add(42) without a resize', false], ['list.Count', false]],
        'Removing the first element shifts every remaining element one place left. Indexing, Count and an Add with spare capacity are constant time.'),
    ],
    checkpoint: [
      ck('DSA_COMPLEXITY', 'for (int i = 1; i < n; i *= 2) for (int j = 0; j < n; j++) work++; What is the time complexity in C#?',
        [['O(n log n)', true], ['O(n²)', false], ['O(log n)', false], ['O(n)', false]],
        'The outer loop doubles i, so it runs about log₂ n times; the inner loop runs n times for each, giving n log n.'),
      ck('DSA_COMPLEXITY', 'A C# method takes an int[] of n items and a string of m characters and loops once over each, one loop after the other. What is its cost?',
        [['O(n + m)', true], ['O(n × m)', false], ['O(n)', false], ['O(max(n, m)²)', false]],
        'Sequential loops over different inputs add their costs. Neither size can be dropped, since either one may be the larger.'),
      ck('DSA_COMPLEXITY', 'For each of n order ids, C# code runs orders.Any(o => o.Id == id) on a List of n orders. Which change makes the whole thing O(n)?',
        [['Build a HashSet<int> of order ids once, then use Contains', true], ['Replace Any with FirstOrDefault inside the same loop', false], ['Call orders.Sort() once before the loop over the ids', false], ['Swap the List<Order> for an array of Order objects', false]],
        'Any is a linear scan, so n scans of n orders is O(n²). One O(n) pass to build a HashSet makes each lookup O(1) on average.'),
    ],
  },
  {
    unitCode: 'JT_CS_DSA_LINEAR_ARRAY_PATTERNS',
    notes: `Most array and string questions in a coding round are one of two patterns in disguise. Learn to
recognise them and the O(n²) brute force becomes an O(n) loop.

## Arrays and strings in C#

    int[] a = { 4, 1, 7 };            // fixed length: a.Length
    var list = new List<int> { 4, 1, 7 };  // growable: list.Count
    string s = "racecar";             // s.Length, s[i] is a char; strings are immutable
    char[] chars = s.ToCharArray();   // mutable copy — change it, then new string(chars)

\`s[i]\` gives a \`char\`, and \`c - 'a'\` gives its offset in the alphabet as an \`int\` — the standard way
to index an \`int[26]\` of letter counts. Accessing past the end throws
\`IndexOutOfRangeException\` (for an array or string) or \`ArgumentOutOfRangeException\` (for a list).

## Pattern 1: two pointers from both ends

Use it when the data is **sorted**, or when you compare the two ends of something.

    static bool IsPalindrome(string s)
    {
        int i = 0, j = s.Length - 1;
        while (i < j)
        {
            if (s[i] != s[j]) return false;
            i++; j--;
        }
        return true;
    }

Each step moves at least one pointer inward, so the loop runs at most n times: O(n) time, O(1)
space. The same shape reverses an array in place, finds a pair with a target sum in a sorted array,
and solves "container with most water".

## Pattern 2: two pointers in the same direction (read and write)

Use it to filter or compact an array **in place**.

    // remove duplicates from a sorted array; return the new length
    static int Dedupe(int[] a)
    {
        if (a.Length == 0) return 0;
        int write = 1;
        for (int read = 1; read < a.Length; read++)
            if (a[read] != a[write - 1]) a[write++] = a[read];
        return write;
    }

## Pattern 3: fixed-size sliding window

"Maximum sum of any k consecutive elements." The brute force re-adds k numbers for each start:
O(n·k). The window adds the element that enters and subtracts the one that leaves: O(n).

    static long MaxWindowSum(int[] a, int k)
    {
        long window = 0, best = long.MinValue;
        for (int i = 0; i < a.Length; i++)
        {
            window += a[i];
            if (i >= k) window -= a[i - k];          // drop the element that left
            if (i >= k - 1) best = Math.Max(best, window);
        }
        return best;
    }

For \`{2, 1, 5, 1, 3, 2}\` with k = 3 this returns 9 (5 + 1 + 3). Validate \`k <= a.Length\` first.

## Pattern 4: variable-size sliding window

"Shortest subarray with sum at least S" (all numbers positive). Grow the window on the right; while
it satisfies the condition, record it and shrink from the left.

    static int ShortestAtLeast(int[] a, int target)
    {
        int left = 0, best = int.MaxValue;
        long sum = 0;
        for (int right = 0; right < a.Length; right++)
        {
            sum += a[right];
            while (sum >= target)
            {
                best = Math.Min(best, right - left + 1);
                sum -= a[left++];
            }
        }
        return best == int.MaxValue ? 0 : best;
    }

Each index enters the window once and leaves at most once, so it is O(n) even though there is a
loop inside a loop. This only works because every number is **positive** — adding grows the sum,
removing shrinks it. With negative numbers the window cannot decide when to shrink; that problem
needs prefix sums and a dictionary (see the Hashing lesson).

## Prefix sums

    long[] prefix = new long[a.Length + 1];
    for (int i = 0; i < a.Length; i++) prefix[i + 1] = prefix[i] + a[i];
    // sum of a[l..r] inclusive = prefix[r + 1] - prefix[l]   — O(1) per query

Use \`long\` whenever sums of many \`int\`s could pass about 2.1 billion. C# integer arithmetic wraps
silently on overflow by default (\`int.MaxValue + 1\` is \`int.MinValue\`); it only throws inside a
\`checked\` block.

## Recognising which pattern

- Sorted input, pair or triple → two pointers from both ends.
- In-place filter or compaction → read and write pointers.
- "k consecutive" → fixed window. "Longest/shortest subarray such that …" with non-negative
  values → variable window.
- Many range-sum queries, or negative numbers → prefix sums.`,
    workedExample: `**Problem: longest substring with no repeated character.** \`"abcabcbb"\` → 3 ("abc").

A variable window \`[left, right]\` that never contains a duplicate. Remember the last index of each
character; when the incoming character was last seen **inside** the window, jump \`left\` past it.

    static int LongestUnique(string s)
    {
        var last = new Dictionary<char, int>();
        int left = 0, best = 0;
        for (int right = 0; right < s.Length; right++)
        {
            char c = s[right];
            if (last.TryGetValue(c, out int seenAt) && seenAt >= left)
                left = seenAt + 1;
            last[c] = right;
            best = Math.Max(best, right - left + 1);
        }
        return best;
    }

Trace \`"abba"\`: at index 2 ('b', last seen at 1) left jumps to 2. At index 3 ('a', last seen at 0)
the old position 0 is **before** left, so left must stay at 2 — that is what \`seenAt >= left\` is
for. Without it, left would jump back to 1 and the answer would wrongly be 3 instead of 2.

Cost: each index is visited once, so O(n) time; the dictionary holds at most one entry per distinct
character, so O(min(n, alphabet)) space. (\`out int seenAt\` is C# 7 syntax; older code declares the
variable first.)`,
    mcqs: [
      mcq('A C# fixed-size window finds the largest sum of k consecutive elements. Each step adds a[i]. What else must it do once i >= k?',
        [['Subtract a[i - k], the element leaving the window', true], ['Subtract a[i - 1], the element just before i', false], ['Re-add the k elements of the window from scratch', false], ['Reset the window sum to zero and start again', false]],
        'Adding the entering element and subtracting the leaving one keeps the window sum in O(1) per step, giving O(n) overall.'),
      mcq('Why does the shrink-from-the-left variable window fail for "shortest subarray with sum at least S" when the array has negative numbers?',
        [['Removing an element can raise the sum, so shrinking is no longer safe', true], ['C# cannot store a negative running sum in a long variable', false], ['The window would need to start from the right end instead', false], ['Negative numbers make the array impossible to traverse in O(n)', false]],
        'The window relies on adding raising the sum and removing lowering it. A negative number breaks that, so prefix sums with a dictionary are needed.'),
      mcq('C# code computes long[] prefix with prefix[i + 1] = prefix[i] + a[i]. What gives the sum of a[2..5] inclusive?',
        [['prefix[6] - prefix[2]', true], ['prefix[5] - prefix[2]', false], ['prefix[5] - prefix[1]', false], ['prefix[6] - prefix[1]', false]],
        'prefix[k] is the sum of the first k elements. a[2..5] is the first 6 elements minus the first 2, so prefix[6] - prefix[2].'),
    ],
    checkpoint: [
      ck('DSA_ARRAYS', 'int[] a = { 2, 1, 5, 1, 3, 2 }; the fixed-window method returns the largest sum of 3 consecutive elements. What does it return?',
        [['9', true], ['8', false], ['11', false], ['6', false]],
        'The windows sum to 8, 7, 9 and 6. The largest, 9, is 5 + 1 + 3.'),
      ck('DSA_ARRAYS', 'A C# method checks a palindrome with i = 0, j = s.Length - 1 and loops while (i < j). What does it do for the empty string ""?',
        [['Returns true without entering the loop', true], ['Throws IndexOutOfRangeException at s[j]', false], ['Returns false, as an empty string has no middle', false], ['Loops forever, since i and j never cross', false]],
        'j starts at -1, so i < j is false immediately and the method returns true without ever indexing the string.'),
      ck('DSA_ARRAYS', 'A C# loop sums int values into an int total, and the true sum is 3 000 000 000. What does C# do by default?',
        [['Wraps around silently to a negative value', true], ['Throws an OverflowException at the overflowing addition', false], ['Promotes the total variable to long automatically', false], ['Stops adding at int.MaxValue and keeps that value', false]],
        'C# integer arithmetic is unchecked by default, so the total wraps past int.MaxValue. Only a checked context throws OverflowException.'),
    ],
  },
  {
    unitCode: 'JT_CS_DSA_LINEAR_LINKED_LISTS',
    notes: `A **linked list** is a chain of nodes, each holding a value and a reference to the next node. In
C#, a class variable *is* a reference, so a node class is all you need.

## The node class

    public class ListNode
    {
        public int Val;
        public ListNode? Next;              // ? = may be null (nullable reference types, C# 8+)
        public ListNode(int val, ListNode? next = null) { Val = val; Next = next; }
    }

    var head = new ListNode(1, new ListNode(2, new ListNode(3)));   // 1 -> 2 -> 3

Interview questions almost always use a hand-written node like this. .NET also has
\`LinkedList<T>\`, a **doubly** linked list with \`AddFirst\`, \`AddLast\`, \`Remove(node)\` — all O(1) —
but you rarely use it in practice: \`List<T>\` is faster for almost everything because its elements
sit next to each other in memory.

## Traversal

    for (ListNode? cur = head; cur != null; cur = cur.Next)
        Console.Write(cur.Val + " ");

Always guard \`cur != null\` before reading \`cur.Next\` or \`cur.Val\`; forgetting is a
\`NullReferenceException\`.

## Insertion and deletion

Inserting at the head is O(1): \`head = new ListNode(0, head);\`. Inserting or deleting anywhere else
needs the node **before** the position, and that walk costs O(n).

Deleting every node with a given value is where the **dummy node** earns its place — it removes the
special case of deleting the head:

    static ListNode? RemoveAll(ListNode? head, int x)
    {
        var dummy = new ListNode(0, head);
        ListNode cur = dummy;
        while (cur.Next != null)
        {
            if (cur.Next.Val == x) cur.Next = cur.Next.Next;   // unlink, stay put
            else cur = cur.Next;                               // advance only if kept
        }
        return dummy.Next;
    }

## Reversal

    static ListNode? Reverse(ListNode? head)
    {
        ListNode? prev = null, cur = head;
        while (cur != null)
        {
            ListNode? next = cur.Next;   // 1. save the rest
            cur.Next = prev;             // 2. point back
            prev = cur;                  // 3. step prev
            cur = next;                  // 4. step cur
        }
        return prev;                     // the old tail is the new head
    }

O(n) time, O(1) space. The order of the four lines matters: overwrite \`cur.Next\` before saving it and
the rest of the list is lost.

## Fast and slow pointers

Two references moving at different speeds solve a family of problems in one pass and O(1) space.

    // middle node: slow moves 1, fast moves 2
    ListNode slow = head, fast = head;
    while (fast != null && fast.Next != null)
    {
        slow = slow.Next!;
        fast = fast.Next.Next;
    }
    // slow is the middle (for an even length, the second of the two middles)

    // cycle detection (Floyd)
    static bool HasCycle(ListNode? head)
    {
        ListNode? slow = head, fast = head;
        while (fast != null && fast.Next != null)
        {
            slow = slow!.Next;
            fast = fast.Next.Next;
            if (slow == fast) return true;    // reference equality: the same node
        }
        return false;
    }

If there is a cycle, fast gains one node per step and must land on slow; if not, fast reaches null.

## Merging two sorted lists

    static ListNode? Merge(ListNode? a, ListNode? b)
    {
        var dummy = new ListNode(0);
        var tail = dummy;
        while (a != null && b != null)
        {
            if (a.Val <= b.Val) { tail.Next = a; a = a.Next; }
            else               { tail.Next = b; b = b.Next; }
            tail = tail.Next;
        }
        tail.Next = a ?? b;              // attach whatever remains
        return dummy.Next;
    }

## Edge cases to try every time

The empty list (\`head == null\`), one node, two nodes, and the operation at the head and at the
tail.`,
    mcqs: [
      mcq('In a C# reversal loop, a student writes cur.Next = prev; before saving cur.Next into a variable. What goes wrong?',
        [['The rest of the list is lost after the first node', true], ['The list is reversed but its last node is dropped', false], ['Nothing; the CLR keeps the old Next reference alive', false], ['It throws a NullReferenceException on the first node', false]],
        'Overwriting cur.Next destroys the only reference to the remaining nodes, so the loop cannot continue past the first node.'),
      mcq('Why does a dummy node simplify deleting nodes from a C# singly linked list?',
        [['Every node, including the head, then has a node before it', true], ['It doubles the list so the deletion can run backwards', false], ['It stops the garbage collector freeing the deleted nodes', false], ['It turns the list into a LinkedList<T> with O(1) removal', false]],
        'Deletion needs the previous node. A dummy in front of the head removes the special case of deleting the head itself.'),
      mcq('A C# middle-node method moves slow by one and fast by two while fast != null && fast.Next != null. For 1 -> 2 -> 3 -> 4 -> 5 -> 6, where does slow end?',
        [['At the node holding 4', true], ['At the node holding 3', false], ['At the node holding 5', false], ['At the node holding 6', false]],
        'slow visits 2, 3, 4 while fast visits 3, 5, then null. With an even length this loop stops on the second of the two middles.'),
    ],
    checkpoint: [
      ck('DSA_LINKED_LIST', 'var a = new ListNode(1); a.Next = new ListNode(2); a.Next.Next = a; What does HasCycle(a), using slow and fast pointers, return?',
        [['true', true], ['false', false], ['It throws a NullReferenceException', false], ['It never returns', false]],
        'Node 2 points back to node 1, so there is a cycle. fast laps slow within a couple of steps and the method returns true.'),
      ck('DSA_LINKED_LIST', 'Merge is called on the sorted lists 1 -> 4 and 2 -> 3 -> 9. After the loop ends, what does tail.Next = a ?? b attach?',
        [['The node 9, which is all that is left of b', true], ['The node 4, which is all that is left of a', false], ['null, as both lists are fully used up', false], ['The dummy node, closing the list into a ring', false]],
        'The loop takes 1, 2, 3, 4 and stops when a is null. b still holds 9, and a ?? b picks it, finishing the merged list.'),
      ck('DSA_LINKED_LIST', 'What is the cost of deleting the last node of a singly linked list in C# when you only hold a reference to the head?',
        [['O(n), as you must walk to the second-to-last node', true], ['O(1), as the head stores a pointer to the tail', false], ['O(log n), by halving the list with fast pointers', false], ['O(1), by setting the head node to null', false]],
        'A singly linked node knows only its successor, so reaching the node before the tail takes a full walk of the list.'),
    ],
  },
  {
    unitCode: 'JT_CS_DSA_LINEAR_STACKS_QUEUES',
    notes: `A **stack** is last in, first out (LIFO); a **queue** is first in, first out (FIFO). .NET has both as
generic classes in \`System.Collections.Generic\`, each with O(1) operations.

## Stack<T> and Queue<T>

    var stack = new Stack<int>();
    stack.Push(1); stack.Push(2); stack.Push(3);
    Console.WriteLine(stack.Peek());   // 3 — look, don't remove
    Console.WriteLine(stack.Pop());    // 3
    Console.WriteLine(stack.Count);    // 2

    var queue = new Queue<string>();
    queue.Enqueue("a"); queue.Enqueue("b");
    Console.WriteLine(queue.Dequeue()); // a
    Console.WriteLine(queue.Peek());    // b

\`Pop\`, \`Peek\` and \`Dequeue\` on an **empty** collection throw \`InvalidOperationException\`. Check
\`Count > 0\` first, or use \`TryPop\`, \`TryPeek\` and \`TryDequeue\` (.NET Core 2.0 and later), which
return \`false\` instead of throwing:

    if (stack.TryPop(out int top)) Console.WriteLine(top);

Enumerating a \`Stack<T>\` (with \`foreach\`, or \`string.Join\`) yields items from the **top** down.

## Pattern 1: matching brackets

Every closer must match the most recent unmatched opener — last in, first out.

    static bool IsBalanced(string s)
    {
        var pairs = new Dictionary<char, char> { [')'] = '(', [']'] = '[', ['}'] = '{' };
        var stack = new Stack<char>();
        foreach (char c in s)
        {
            if (c == '(' || c == '[' || c == '{') stack.Push(c);
            else if (pairs.TryGetValue(c, out char open))
            {
                if (stack.Count == 0 || stack.Pop() != open) return false;
            }
        }
        return stack.Count == 0;          // leftover openers mean unbalanced
    }

Two failure points: a closer arriving with an empty stack, and openers left at the end.

## Pattern 2: monotonic stack — next greater element

For each element, find the first larger element to its right. Brute force is O(n²). A stack that
keeps only "candidates" gives O(n):

    static int[] NextGreater(int[] a)
    {
        var result = new int[a.Length];
        var stack = new Stack<int>();             // values to the right, decreasing from top
        for (int i = a.Length - 1; i >= 0; i--)
        {
            while (stack.Count > 0 && stack.Peek() <= a[i]) stack.Pop();
            result[i] = stack.Count == 0 ? -1 : stack.Peek();
            stack.Push(a[i]);
        }
        return result;
    }
    // { 4, 5, 2, 25 } -> { 5, 25, 25, -1 }

Each element is pushed once and popped at most once, so the inner \`while\` costs O(n) in total.
The same shape answers "daily temperatures", "stock span" and "largest rectangle in a histogram".

## Pattern 3: queue simulations and BFS order

A queue processes things in arrival order: print jobs, a round-robin scheduler, or a breadth-first
search (the non-linear DSA topic).

    // the "hot potato" game: every k-th person is eliminated
    static string LastStanding(List<string> people, int k)
    {
        var q = new Queue<string>(people);
        while (q.Count > 1)
        {
            for (int i = 1; i < k; i++) q.Enqueue(q.Dequeue());   // pass the potato
            q.Dequeue();                                           // k-th person is out
        }
        return q.Dequeue();
    }

## A queue from two stacks

A classic interview question: push onto an \`inbox\` stack; to dequeue, if the \`outbox\` stack is
empty, pop everything from \`inbox\` onto \`outbox\` (reversing it), then pop \`outbox\`. Each element
moves at most twice, so dequeue is O(1) **amortised**.

## Other .NET options

- \`LinkedList<T>\` as a deque — \`AddFirst\`, \`AddLast\`, \`RemoveFirst\`, \`RemoveLast\` are all O(1).
- \`PriorityQueue<TElement, TPriority>\` (.NET 6+) — dequeues by priority, not arrival; covered with
  heaps in the next topic.`,
    mcqs: [
      mcq('var s = new Stack<int>(); s.Push(1); s.Push(2); s.Push(3); Console.WriteLine(string.Join(",", s)); What is printed?',
        [['3,2,1', true], ['1,2,3', false], ['3', false], ['1', false]],
        'Enumerating a Stack<T> yields items from the top down, so the most recently pushed value comes first.'),
      mcq('A C# bracket checker reads "(]". At which point does it return false?',
        [['When ] pops ( and the pair does not match', true], ['At the end, as the stack is not empty', false], ['When ( is pushed onto an empty stack', false], ['It returns true, as both are brackets', false]],
        'The closer ] expects [ but the top of the stack is (, so the mismatch is caught at once.'),
      mcq('The C# next-greater-element loop has a while inside a for. Why is it still O(n)?',
        [['Each element is pushed once and popped at most once', true], ['The while loop runs at most twice per element', false], ['Stack<T>.Pop sorts the elements as they leave', false], ['The for loop skips the elements that were popped', false]],
        'Across the whole run there are n pushes and at most n pops, so the total work of every while iteration together is O(n).'),
    ],
    checkpoint: [
      ck('DSA_STACK', 'var q = new Queue<int>(); q.Enqueue(1); q.Enqueue(2); q.Enqueue(3); q.Dequeue(); Console.WriteLine(q.Peek()); What is printed?',
        [['2', true], ['1', false], ['3', false], ['It throws InvalidOperationException', false]],
        'Dequeue removes 1, the first item in. Peek then shows the new front without removing it, which is 2.'),
      ck('DSA_STACK', 'What happens when C# code calls Pop() on an empty Stack<int>?',
        [['It throws InvalidOperationException', true], ['It returns 0, the default for int', false], ['It returns -1 to signal the stack is empty', false], ['It throws IndexOutOfRangeException', false]],
        'Pop, Peek and Dequeue on an empty collection throw InvalidOperationException. TryPop returns false instead of throwing.'),
      ck('DSA_STACK', 'Running the monotonic-stack NextGreater on { 6, 3, 8, 1 }, what is the result?',
        [['{ 8, 8, -1, -1 }', true], ['{ 8, 8, -1, 1 }', false], ['{ 3, 8, 1, -1 }', false], ['{ -1, 8, -1, -1 }', false]],
        'The first larger value to the right of 6 is 8, of 3 is 8, and nothing to the right of 8 or 1 is larger, so both get -1.'),
    ],
  },
  {
    unitCode: 'JT_CS_DSA_LINEAR_HASHING',
    notes: `When a brute force asks "have I seen this before?" or "how many times?" inside a loop, a hash
table turns that question from O(n) into O(1) average. In C# that is \`Dictionary<TKey, TValue>\`
and \`HashSet<T>\`.

## The two tools

    var seen = new HashSet<int>();
    bool added = seen.Add(5);        // true — it was new
    added = seen.Add(5);             // false — already present, nothing changes
    bool has = seen.Contains(5);     // true

    var count = new Dictionary<string, int>();
    count["apple"] = 3;              // set or overwrite
    int n = count["apple"];          // 3
    // count["pear"] -> KeyNotFoundException

\`HashSet.Add\` returning \`false\` for a duplicate is handy: "first repeated element" is one loop
with \`if (!seen.Add(x)) return x;\`.

## Counting safely

Reading a missing key with the indexer throws. Three safe ways to count:

    // 1. TryGetValue — works on every .NET version
    count.TryGetValue(word, out int c);   // c is 0 when absent
    count[word] = c + 1;

    // 2. GetValueOrDefault — .NET Core 2.0+
    count[word] = count.GetValueOrDefault(word) + 1;

    // 3. LINQ when you have the whole list
    var freq = words.GroupBy(w => w).ToDictionary(g => g.Key, g => g.Count());

## Problem: two-sum (indices)

    static int[] TwoSum(int[] a, int target)
    {
        var indexOf = new Dictionary<int, int>();       // value -> index
        for (int i = 0; i < a.Length; i++)
        {
            if (indexOf.TryGetValue(target - a[i], out int j)) return new[] { j, i };
            indexOf[a[i]] = i;                           // store AFTER checking
        }
        return Array.Empty<int>();
    }
    // { 3, 2, 4 }, target 6 -> { 1, 2 }

Checking before storing stops an element pairing with itself (3 + 3 with only one 3).

## Problem: first non-repeating character

    static char FirstUnique(string s)
    {
        var freq = new Dictionary<char, int>();
        foreach (char c in s) freq[c] = freq.GetValueOrDefault(c) + 1;
        foreach (char c in s) if (freq[c] == 1) return c;   // second pass in original order
        return '_';
    }
    // "swiss" -> 'w'

Two passes: one to count, one to find the first with count 1 **in the string's order** — iterating
the dictionary instead would not reliably give string order.

## Problem: group anagrams

    static List<List<string>> GroupAnagrams(string[] words)
    {
        var groups = new Dictionary<string, List<string>>();
        foreach (string w in words)
        {
            char[] key = w.ToCharArray();
            Array.Sort(key);
            string k = new string(key);                     // "eat", "tea", "ate" -> "aet"
            if (!groups.TryGetValue(k, out var list)) groups[k] = list = new List<string>();
            list.Add(w);
        }
        return groups.Values.ToList();
    }

Note \`new string(key)\`: calling \`key.ToString()\` on a \`char[]\` gives \`"System.Char[]"\`, not the
letters — a bug that makes every word land in one group.

## Problem: subarray sum equals k (with negatives)

Prefix sums plus a dictionary of "how many prefixes had this sum". A subarray \`(i, j]\` sums to k
exactly when \`prefix[j] - prefix[i] == k\`, so at each position count earlier prefixes equal to
\`prefix - k\`:

    var seenSums = new Dictionary<long, int> { [0] = 1 };   // the empty prefix
    long prefix = 0, total = 0;
    foreach (int x in a)
    {
        prefix += x;
        if (seenSums.TryGetValue(prefix - k, out int c)) total += c;
        seenSums[prefix] = seenSums.GetValueOrDefault(prefix) + 1;
    }

O(n) time and space, and it works with negative numbers where a sliding window cannot.

## Keys and equality

A dictionary finds keys with \`GetHashCode\` and \`Equals\`. \`int\`, \`string\`, tuples and **records**
(C# 9+) implement both by value, so they make good keys. A plain \`class\` uses reference equality:
two different objects with the same fields are different keys unless you override both methods.
And never mutate an object while it is a key — its hash changes and the dictionary can no longer
find it.

## Cost

Average O(1) per operation; the worst case (every key in one bucket) is O(n). Iteration order of a
\`Dictionary\` is not something to rely on — use \`SortedDictionary\` when you need keys in order.`,
    mcqs: [
      mcq('var set = new HashSet<string>(); set.Add("x"); bool r = set.Add("x"); What is r, and how many items does set hold?',
        [['r is false and set holds 1 item', true], ['r is true and set holds 2 items', false], ['r is false and set holds 2 items', false], ['It throws an ArgumentException on the second Add', false]],
        'HashSet.Add returns false when the item is already present and leaves the set unchanged, unlike Dictionary.Add, which throws for a duplicate key.'),
      mcq('A C# group-anagrams method uses char[] key = w.ToCharArray(); Array.Sort(key); and then groups by key.ToString(). Every word lands in one group. Why?',
        [['char[].ToString() returns "System.Char[]" for every word', true], ['Array.Sort sorts the characters in descending order', false], ['Dictionary cannot use a string as its key type', false], ['ToCharArray returns the same array for every word', false]],
        'Arrays do not override ToString, so every key is the type name. new string(key) builds the sorted letters as the key.'),
      mcq('In the C# two-sum method, why does the loop look up target - a[i] before storing a[i] in the dictionary?',
        [['So an element is never paired with itself', true], ['So the dictionary never needs to resize', false], ['So the indices come out in descending order', false], ['So duplicate values throw an exception', false]],
        'With target 6 and a single 3, storing first would find the 3 itself. Checking first only matches elements seen earlier.'),
    ],
    checkpoint: [
      ck('DSA_HASHING', 'var d = new Dictionary<string, int>(); int n = d["pear"]; What happens in C#?',
        [['A KeyNotFoundException is thrown', true], ['n is set to 0, the default for int', false], ['The key "pear" is added with value 0', false], ['n is set to null', false]],
        'The Dictionary indexer throws for a missing key when reading. TryGetValue or GetValueOrDefault return a default instead.'),
      ck('DSA_HASHING', 'The two-pass FirstUnique method counts characters, then scans the string again. What does it return for "swiss"?',
        [["'w'", true], ["'s'", false], ["'i'", false], ["'_'", false]],
        "s appears three times; w and i once each. Scanning in string order, w comes first, so the answer is 'w'."),
      ck('DSA_HASHING', 'A plain C# class Point { public int X, Y; } with no overrides is used as a Dictionary key. A new Point with the same X and Y is looked up. What happens?',
        [['It is not found, as the class compares by reference', true], ['It is found, as C# compares all fields by default', false], ['It does not compile, as classes cannot be keys', false], ['It is found only if the dictionary is a SortedDictionary', false]],
        'Without overriding Equals and GetHashCode, a class uses reference identity. A record, or the overrides, would compare by value.'),
    ],
  },
  {
    unitCode: 'JT_CS_DSA_LINEAR_RECURSION',
    notes: `A **recursive** method calls itself on a smaller version of the problem. Every recursive method
needs two things: a **base case** that returns without recursing, and a recursive step that
**moves toward** the base case.

## The shape

    static long Factorial(int n)
    {
        if (n <= 1) return 1;            // base case
        return n * Factorial(n - 1);     // smaller problem
    }

    static int SumFrom(int[] a, int i)
    {
        if (i == a.Length) return 0;     // nothing left
        return a[i] + SumFrom(a, i + 1);
    }
    // SumFrom(new[] { 3, 4, 5 }, 0) == 12

## The call stack

Each call gets its own **stack frame** holding its parameters and locals. \`Factorial(4)\` pushes
frames for 4, 3, 2, 1; the base case returns 1, and the frames unwind multiplying on the way back.

The default stack in .NET is about 1 MB per thread. A recursion that goes too deep throws
\`StackOverflowException\` — and in .NET this one **cannot be caught**: the process is terminated.
So recursion depth must be bounded: fine for a balanced tree (depth log n), dangerous for a linked
list of a million nodes. When depth could be large, convert to a loop with an explicit
\`Stack<T>\`.

## Overlapping subproblems

    static int Fib(int n) => n <= 1 ? n : Fib(n - 1) + Fib(n - 2);   // Fib(6) == 8

This makes about 2ⁿ calls, because \`Fib(n - 2)\` is computed again inside \`Fib(n - 1)\`. Cache
results in a \`Dictionary<int, long>\` (memoisation) or build bottom-up and it is O(n). That idea is
dynamic programming, the last lesson of the next topic.

## Backtracking: choose, explore, un-choose

Backtracking builds candidates one decision at a time and undoes each decision after exploring it.

    // all subsets of { 1, 2, 3 }
    static void Subsets(int[] a, int i, List<int> current, List<List<int>> result)
    {
        if (i == a.Length) { result.Add(new List<int>(current)); return; }   // copy!

        current.Add(a[i]);                     // choose: include a[i]
        Subsets(a, i + 1, current, result);    // explore
        current.RemoveAt(current.Count - 1);   // un-choose

        Subsets(a, i + 1, current, result);    // explore without a[i]
    }

Output order: \`[1,2,3] [1,2] [1,3] [1] [2,3] [2] [3] []\` — 2³ = 8 subsets. The \`new
List<int>(current)\` copy is essential: \`current\` is one list being changed throughout, and adding
the reference itself would leave \`result\` holding eight references to the same (finally empty) list.

    // all permutations of the characters of a string
    static void Permute(char[] chars, int start, List<string> result)
    {
        if (start == chars.Length) { result.Add(new string(chars)); return; }
        for (int i = start; i < chars.Length; i++)
        {
            (chars[start], chars[i]) = (chars[i], chars[start]);   // choose (tuple swap, C# 7+)
            Permute(chars, start + 1, result);                     // explore
            (chars[start], chars[i]) = (chars[i], chars[start]);   // un-choose
        }
    }

n distinct characters give n! permutations; the cost is O(n · n!) — fine for n ≤ 8 or so, hopeless
for 15.

## Pruning

Backtracking gets fast by abandoning a branch as soon as it cannot succeed: in "subsets that sum to
a target" with positive numbers, stop exploring once the running sum passes the target.

## Writing a recursive solution

1. Define precisely what the method returns for its arguments.
2. Write the base case(s) — the smallest inputs, including empty.
3. Assume the recursive call works on the smaller input (the "leap of faith") and combine.
4. Check every path reaches a base case — a step of \`n - 2\` from an odd n skips \`n == 0\`.`,
    mcqs: [
      mcq('What happens when a C# program recurses so deeply that it throws StackOverflowException?',
        [['The process is terminated; a catch block cannot handle it', true], ['A catch (Exception) block can handle it and carry on', false], ['The runtime grows the stack and continues the recursion', false], ['The method returns default(T) from the deepest frame', false]],
        'Since .NET 2.0, a stack overflow cannot be caught; the CLR tears the process down. Bound the depth or use an explicit Stack<T>.'),
      mcq('A C# Subsets method does result.Add(current); instead of result.Add(new List<int>(current)); at the base case. What does result end up holding?',
        [['Eight references to the same list, empty at the end', true], ['The eight correct subsets, in the usual order', false], ['Only the first subset, [1, 2, 3], added eight times', false], ['A compile error, as List<int> cannot be added twice', false]],
        'Every entry is the same list object, which is changed throughout and finally emptied by the un-choose steps. A copy is needed at each base case.'),
      mcq('static int Fib(int n) => n <= 1 ? n : Fib(n - 1) + Fib(n - 2); Why does Fib(45) take several seconds in C#?',
        [['The same subproblems are recomputed, about 2ⁿ calls', true], ['The int result overflows and the call retries itself', false], ['Expression-bodied methods are interpreted, not compiled', false], ['Each call allocates a new array on the managed heap', false]],
        'Fib(n - 2) is recomputed inside Fib(n - 1), and so on down, so calls grow exponentially. Memoisation makes it O(n).'),
    ],
    checkpoint: [
      ck('DSA_RECURSION', 'static int Fib(int n) => n <= 1 ? n : Fib(n - 1) + Fib(n - 2); What does Fib(6) return?',
        [['8', true], ['13', false], ['5', false], ['6', false]],
        'The sequence from Fib(0) runs 0, 1, 1, 2, 3, 5, 8, so Fib(6) is 8.'),
      ck('DSA_RECURSION', 'static int G(int n) { if (n == 0) return 0; return 1 + G(n - 2); } What happens on G(7)?',
        [['It recurses past 0 until the stack overflows', true], ['It returns 4 after four calls', false], ['It returns 3, the number of steps taken', false], ['It returns 0, from the base case', false]],
        'From 7 the argument goes 5, 3, 1, -1 … and never equals 0, so the base case is never reached. The guard should be n <= 0.'),
      ck('DSA_RECURSION', 'The backtracking Permute method is run on the 4 distinct characters of "abcd". How many strings does it add to result?',
        [['24', true], ['16', false], ['12', false], ['4', false]],
        'n distinct items have n! orderings, and 4! = 24. (16 would be the number of subsets.)'),
    ],
  },
  {
    unitCode: 'JT_CS_DSA_LINEAR_SORTING_SEARCHING',
    notes: `You will rarely write a sort in production C# — \`Array.Sort\` and \`List<T>.Sort\` are fast and tested —
but interviews ask you to sort by custom rules, to implement merge sort, and above all to write a
correct binary search.

## Sorting with the library

    int[] a = { 3, 1, 2 };
    Array.Sort(a);                                   // { 1, 2, 3 }, in place

    var people = new List<Person> { ... };
    people.Sort((x, y) => x.Age.CompareTo(y.Age));   // by age, ascending
    people.Sort((x, y) => y.Age.CompareTo(x.Age));   // descending: swap x and y

    // by age, then by name for ties
    people.Sort((x, y) =>
    {
        int byAge = x.Age.CompareTo(y.Age);
        return byAge != 0 ? byAge : string.CompareOrdinal(x.Name, y.Name);
    });

A comparison returns a negative number if x comes first, positive if y comes first, zero if they
tie. Use \`CompareTo\`, not \`x.Age - y.Age\`: subtraction can overflow for large or negative values and
silently give the wrong sign.

**Stability.** \`Array.Sort\` and \`List<T>.Sort\` use introsort and are **not stable** — items that
compare equal may change order. LINQ's \`OrderBy\` / \`ThenBy\` **is** stable and returns a new
sequence:

    var sorted = people.OrderBy(p => p.Age).ThenBy(p => p.Name).ToList();

**Strings.** Default string comparison is culture-aware. For codes, ids and anything machine-made,
pass \`StringComparer.Ordinal\`, which compares character codes — so \`"Apple"\` sorts before
\`"banana"\` because uppercase letters have smaller codes.

## Merge sort by hand

Split in half, sort each half recursively, merge the two sorted halves.

    static void MergeSort(int[] a, int[] tmp, int lo, int hi)   // sorts a[lo..hi)
    {
        if (hi - lo < 2) return;                 // 0 or 1 element: sorted
        int mid = lo + (hi - lo) / 2;
        MergeSort(a, tmp, lo, mid);
        MergeSort(a, tmp, mid, hi);

        int i = lo, j = mid, k = lo;
        while (i < mid && j < hi) tmp[k++] = a[i] <= a[j] ? a[i++] : a[j++];   // <= keeps it stable
        while (i < mid) tmp[k++] = a[i++];
        while (j < hi)  tmp[k++] = a[j++];
        Array.Copy(tmp, lo, a, lo, hi - lo);
    }

O(n log n) time in every case — log n levels of halving, O(n) merging per level — and O(n) extra
space for \`tmp\`. Taking from the left half on ties (\`<=\`) makes it stable. Quicksort is also
O(n log n) on average and sorts in place, but degrades to O(n²) with bad pivots.

## Binary search

On **sorted** data, compare with the middle and discard half: O(log n).

    static int BinarySearch(int[] a, int target)
    {
        int lo = 0, hi = a.Length - 1;          // inclusive range [lo, hi]
        while (lo <= hi)                        // non-empty while lo <= hi
        {
            int mid = lo + (hi - lo) / 2;       // never overflows
            if (a[mid] == target) return mid;
            if (a[mid] < target) lo = mid + 1;
            else hi = mid - 1;
        }
        return -1;
    }

Three details decide whether it is correct:

1. **Loop condition matches the range.** Inclusive \`[lo, hi]\` → \`while (lo <= hi)\`.
2. **Both updates shrink the range.** \`lo = mid + 1\` and \`hi = mid - 1\`; \`lo = mid\` can loop forever.
3. **The midpoint cannot overflow.** \`(lo + hi) / 2\` wraps negative when \`lo + hi\` passes
   \`int.MaxValue\`; \`lo + (hi - lo) / 2\` cannot.

## The library's binary search

\`Array.BinarySearch(a, x)\` and \`list.BinarySearch(x)\` return the index if found. If **not** found
they return a **negative** number: the bitwise complement (\`~\`) of the index where \`x\` would be
inserted.

    int[] a = { 1, 5, 9 };
    int r = Array.BinarySearch(a, 6);   // -3
    int insertAt = ~r;                  // 2: 6 belongs before 9

## Lower bound: the first position >= target

Many questions ("first occurrence", "insert position", "smallest value that satisfies …") are a
lower bound. Use a half-open range \`[lo, hi)\`:

    static int LowerBound(int[] a, int target)
    {
        int lo = 0, hi = a.Length;
        while (lo < hi)
        {
            int mid = lo + (hi - lo) / 2;
            if (a[mid] < target) lo = mid + 1; else hi = mid;
        }
        return lo;                         // a.Length if every element is smaller
    }

## Binary search on the answer

When the answer is a number in a range and "can we do it with x?" is yes for every x above some
point, binary-search x itself — for example the minimum ship capacity to deliver packages in D
days. Each check is O(n), so the whole thing is O(n log range).`,
    mcqs: [
      mcq('int[] a = { 1, 5, 9 }; int r = Array.BinarySearch(a, 6); What is r?',
        [['-3', true], ['-1', false], ['2', false], ['-2', false]],
        'Not found, so it returns the bitwise complement of the insertion index. 6 would go at index 2, and ~2 is -3.'),
      mcq('Why is people.Sort((x, y) => x.Score - y.Score) risky in C#, compared with x.Score.CompareTo(y.Score)?',
        [['The subtraction can overflow and give the wrong sign', true], ['A lambda cannot be passed to List<T>.Sort at all', false], ['Subtraction always sorts in descending order', false], ['CompareTo makes the sort stable, subtraction does not', false]],
        'With large or negative scores, x - y can wrap past int.MinValue or int.MaxValue and flip sign. CompareTo always returns the right sign.'),
      mcq('A C# list of orders already sorted by date is re-sorted by customer with List<T>.Sort. Within one customer, are the orders still in date order?',
        [['Not guaranteed, as List<T>.Sort is not stable', true], ['Yes, because List<T>.Sort is always a stable sort', false], ['Yes, as long as the comparison returns zero on ties', false], ['No, they are always reversed into newest first', false]],
        'List<T>.Sort uses introsort, which is unstable. OrderBy(o => o.Customer) is stable and keeps the date order within each customer.'),
    ],
    checkpoint: [
      ck('DSA_SORTING', 'The LowerBound method with a half-open range returns the first index where a[i] >= target. What does it return for target 99 in { 1, 5, 9 }?',
        [['3, the array length', true], ['2, the last index', false], ['-1, meaning not found', false], ['0, the first index', false]],
        'No element is at least 99, so the search keeps moving lo right and finishes with lo == a.Length, the insertion point at the end.'),
      ck('DSA_SORTING', 'A C# binary search uses int lo = 0, hi = a.Length - 1; while (lo < hi). Which input makes it return -1 wrongly?',
        [['{ 7 } searching for 7', true], ['{ 1, 2, 3 } searching for 2', false], ['{ 1, 2, 3 } searching for 9', false], ['An empty array searching for 7', false]],
        'With one element lo equals hi, so lo < hi is false and the loop never checks it. An inclusive range needs while (lo <= hi).'),
      ck('DSA_SORTING', 'Merge sort is run on an array of one million ints. What are its time and extra space?',
        [['O(n log n) time and O(n) extra space', true], ['O(n²) time and O(1) extra space', false], ['O(n log n) time and O(1) extra space', false], ['O(n) time and O(log n) extra space', false]],
        'There are log n levels and each merges n elements; the merge writes into a temporary array of size n.'),
    ],
  },
  {
    unitCode: 'JT_CS_DSA_LINEAR_DEBUGGING',
    notes: `DSA bugs cluster around boundaries: the first and last element, the empty input, the largest value.
These seven appear in C# interview code constantly. For each, read the broken code, say what input
breaks it, and say why.

## Fault 1: off-by-one in binary search

    int lo = 0, hi = a.Length - 1;
    while (lo < hi) { ... }           // BUG

**Symptom:** \`{ 7 }\` searching for 7 returns -1. **Cause:** \`hi\` is inclusive, so the range is
non-empty while \`lo <= hi\`; the last candidate is never checked. **Fix:** \`while (lo <= hi)\`.

## Fault 2: the overflowing midpoint

    int mid = (lo + hi) / 2;          // BUG for huge ranges

**Symptom:** \`IndexOutOfRangeException\` with a negative index, or an infinite loop, only on big
inputs or when binary-searching an answer range like 0 to 2 000 000 000. **Cause:** \`lo + hi\` passes
\`int.MaxValue\` and wraps negative (C# arithmetic is unchecked by default). **Fix:**
\`lo + (hi - lo) / 2\`.

## Fault 3: modifying a List inside foreach

    foreach (int x in list)
        if (x % 2 == 0) list.Remove(x);   // BUG

**Symptom:** \`InvalidOperationException: Collection was modified; enumeration operation may not
execute.\` **Cause:** the enumerator detects the list changed under it. **Fix:**
\`list.RemoveAll(x => x % 2 == 0);\` or loop backwards by index.

## Fault 4: reading a missing dictionary key

    count[word] = count[word] + 1;    // BUG on the first occurrence

**Symptom:** \`KeyNotFoundException\` on the first word. **Fix:**
\`count[word] = count.GetValueOrDefault(word) + 1;\` or \`TryGetValue\`.

## Fault 5: the null Next pointer

    while (cur.Next != null)
    {
        if (cur.Next.Val == x) cur.Next = cur.Next.Next;
        cur = cur.Next;                   // BUG
    }

**Symptom:** \`NullReferenceException\` when the last node is deleted, and nodes skipped after each
deletion. **Cause:** the loop always advances, even onto a null. **Fix:** advance only in an \`else\`;
check \`head == null\` first.

## Fault 6: the int that should be long

    int sum = 0;
    foreach (int x in a) sum += x;        // a has 200 000 values up to 10^9

**Symptom:** a negative or plainly wrong total on large tests only. **Cause:** silent wrap-around.
**Fix:** \`long sum\`. Wrap a suspicious block in \`checked { ... }\` while debugging to make overflow
throw \`OverflowException\` instead of hiding.

## Fault 7: the shared list in backtracking

    if (i == a.Length) { result.Add(current); return; }   // BUG

**Symptom:** every subset in the output is the same (often empty) list. **Cause:** \`result\` holds
references to the one \`current\` list. **Fix:** \`result.Add(new List<int>(current));\`.

## The method

Before running anything, trace the code by hand on: the empty input, one element, two elements, the
target at the first and at the last position, the target absent, and the largest allowed values.`,
    mcqs: [
      mcq('foreach (var x in list) if (x < 0) list.Remove(x); throws in C#. What is the exception and the cleanest fix?',
        [['InvalidOperationException; use list.RemoveAll(x => x < 0)', true], ['IndexOutOfRangeException; loop with for from index 0', false], ['NullReferenceException; check list != null before looping', false], ['ArgumentException; call list.Clear() before the loop', false]],
        'The List enumerator fails when the list is modified during foreach. RemoveAll filters in one pass without an enumerator.'),
      mcq('A C# solution passes small tests but prints a negative total for 200 000 values up to 10^9. What is the bug?',
        [['The sum is an int and wraps silently on overflow', true], ['foreach skips elements once the array is large', false], ['Console.WriteLine cannot print values over 2^31', false], ['The array is too large and is partly garbage collected', false]],
        'The real total is far past int.MaxValue and C# arithmetic is unchecked by default, so it wraps. Declare the sum as long.'),
      mcq('Counting words with count[w] = count[w] + 1; throws on the very first word. Which exception, and why?',
        [['KeyNotFoundException, as the indexer reads a missing key', true], ['NullReferenceException, as the int value is null', false], ['InvalidOperationException, as the dictionary is empty', false], ['ArgumentNullException, as the word is not yet a key', false]],
        'Reading a missing key with the Dictionary indexer throws KeyNotFoundException. GetValueOrDefault or TryGetValue gives 0 instead.'),
      mcq('A binary search on the answer range 0 to 2 000 000 000 loops forever or throws. Which line is the likely culprit?',
        [['int mid = (lo + hi) / 2;', true], ['if (Feasible(mid)) hi = mid;', false], ['while (lo < hi)', false], ['return lo;', false]],
        'lo + hi can exceed int.MaxValue and wrap negative, so mid is garbage. lo + (hi - lo) / 2 stays in range.'),
    ],
  },
  {
    unitCode: 'JT_CS_DSA_LINEAR_PRACTICE',
    notes: `Solve each in C# without looking at the notes, then state the time and space cost before you run it.
Test the empty and one-element cases every time.

## Exercise 1 — Move zeroes

Move every 0 in an \`int[]\` to the end, keeping the order of the other elements, in place. (Read and
write pointers. O(n), O(1).)

## Exercise 2 — Remove the n-th node from the end

Given a \`ListNode\` head and n, remove the n-th node from the end in one pass. (A dummy node, and a
lead pointer n steps ahead.)

## Exercise 3 — Daily temperatures

For each day, how many days until a warmer one, or 0. (A \`Stack<int>\` of indices — the same shape
as next greater element.)

## Exercise 4 — Longest run of consecutive numbers

\`{ 100, 4, 200, 1, 3, 2 }\` → 4 (1, 2, 3, 4). Do it in O(n) with a \`HashSet<int>\`: only start counting
from a number whose predecessor is **not** in the set.

## Exercise 5 — Search a rotated sorted array

\`{ 4, 5, 6, 7, 0, 1, 2 }\`: find a target in O(log n). (At each \`mid\`, one half is sorted; decide
whether the target lies in it.)

## Exercise 6 — The graded exercise: subarrays that sum to k

Read an array of integers — **negative numbers allowed** — and a target k, and print how many
contiguous subarrays sum to exactly k. A sliding window cannot do this (negatives break it); prefix
sums with a \`Dictionary<long, int>\` can, in O(n). This one is auto-graded.`,
    mcqs: [
      mcq('In Exercise 4, why does the HashSet solution only start counting from x when x - 1 is not in the set?',
        [['So each run is counted once, keeping the total work O(n)', true], ['So the numbers are visited in ascending sorted order', false], ['So duplicate values are removed from the input array', false], ['So the set never needs to grow past its starting size', false]],
        'Starting only at the beginning of a run means each number is stepped over once in total. Starting everywhere would be O(n²).'),
      mcq('In Exercise 6, the array is { 1, -1, 1 } and k = 1. Why can a shrink-from-the-left sliding window not be trusted here?',
        [['A negative number means shrinking can raise the sum', true], ['The window cannot hold more than two elements at once', false], ['k = 1 is too small for a window to start from', false], ['C# cannot compare a long sum with an int target', false]],
        'The window assumes adding grows the sum and removing shrinks it. Negatives break that, so valid subarrays get skipped.'),
      mcq('In Exercise 6, why must the prefix-sum dictionary start with the entry 0 -> 1 before the loop?',
        [['So subarrays that start at index 0 are counted', true], ['So the dictionary has a key and does not throw', false], ['So zero values in the array are skipped', false], ['So the count starts at one instead of zero', false]],
        'A subarray from the start sums to k when the prefix itself equals k, i.e. when prefix - k is 0. The empty prefix provides that 0.'),
      mcq('In Exercise 2, how far ahead of the trailing pointer does the lead pointer start, to remove the n-th node from the end in one pass?',
        [['n steps ahead', true], ['n + 2 steps ahead', false], ['One step, then moving twice as fast', false], ['At the tail, found in a first pass', false]],
        'When the lead reaches the last node, the trailing pointer is n nodes behind it, just before the node to unlink (starting both at a dummy).'),
      mcq('In Exercise 5, at mid in { 4, 5, 6, 7, 0, 1, 2 }, how do you know which half is sorted?',
        [['If a[lo] <= a[mid], the left half is sorted', true], ['The left half is always the sorted half', false], ['If a[mid] is even, the right half is sorted', false], ['Compare a[mid] with the target value itself', false]],
        'Only one side contains the rotation point. If a[lo] <= a[mid] there is no drop on the left, so it is sorted; otherwise the right is.'),
    ],
    assignment: {
      title: 'Count the Subarrays That Sum to k',
      description: 'Prefix sums and a Dictionary in C#: count contiguous subarrays with an exact sum, negatives included, in O(n).',
      instructions: `Read from standard input:

- Line 1: two integers **n** and **k** (1 ≤ n ≤ 200 000, |k| ≤ 10¹⁴).
- Line 2: **n** integers a₁ … aₙ, separated by spaces (|aᵢ| ≤ 10⁹). Negative numbers and zeros are
  allowed.

Print a single integer: the number of **contiguous** subarrays whose elements sum to exactly **k**.

Examples:

| Input | Output | Why |
|---|---|---|
| \`5 3\` / \`1 2 1 2 1\` | \`4\` | [1,2], [2,1], [1,2], [2,1] |
| \`3 0\` / \`1 -1 0\` | \`3\` | [1,-1], [0], [1,-1,0] |
| \`1 5\` / \`5\` | \`1\` | the single element |

Requirements:

- Solve it in **O(n)**: keep a running prefix sum and a \`Dictionary<long, int>\` (or \`long\` counts)
  of how many earlier prefixes had each sum. A nested loop over every subarray is O(n²) — about
  2 × 10¹⁰ steps at n = 200 000, far too slow.
- Use \`long\` for the prefix sums **and** for the answer: sums reach 2 × 10¹⁴, and an array of
  200 000 zeros with k = 0 has 20 000 100 000 subarrays.
- **The grader runs C# 7 on Mono:** use a classic \`class Program { static void Main() }\`; do not
  use top-level statements, records or \`$""\` strings. Read the input with \`Console.ReadLine()\`.
- Write the time and space cost of your solution in a comment at the top of \`Main\`.`,
      rubric: [
        { criterion: 'Correct count', description: 'Every test passes, including negatives, zeros, k = 0 and values that overflow int.', maxPoints: 50 },
        { criterion: 'Linear prefix-sum solution', description: 'One pass with a Dictionary of prefix-sum counts, seeded with the empty prefix; no nested loop over subarrays.', maxPoints: 30 },
        { criterion: 'Overflow-safe and costed', description: 'Prefix sums and the answer are long; time O(n) and space O(n) stated in a comment.', maxPoints: 20 },
      ],
      totalPoints: 100,
      coding: {
        language: 'csharp',
        starter: `using System;
using System.Collections.Generic;

class Program
{
    static void Main()
    {
        string[] first = Console.ReadLine().Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
        int n = int.Parse(first[0]);
        long k = long.Parse(first[1]);

        string[] parts = Console.ReadLine().Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
        long[] a = new long[n];
        for (int i = 0; i < n; i++) a[i] = long.Parse(parts[i]);

        // TODO: keep a running prefix sum and a Dictionary<long, int> of how many prefixes had each sum
        // TODO: for each element, add the number of earlier prefixes equal to (prefix - k)
        // TODO: print the count (a long)
    }
}
`,
        tests: [
          { input: '5 3\n1 2 1 2 1\n', expectedOutput: '4' },
          { input: '3 0\n1 -1 0\n', expectedOutput: '3' },
          { input: '1 5\n5\n', expectedOutput: '1' },
          { input: '4 100\n1 2 3 4\n', expectedOutput: '0', isHidden: true },
          { input: '6 2000000000\n1000000000 1000000000 -1000000000 1000000000 1000000000 0\n', expectedOutput: '6', isHidden: true },
          { input: '300 3\n2 -2 1 5 2 2 -4 4 2 4 3 -2 3 -3 1 -3 -3 3 4 4 -4 0 3 -1 -2 -1 5 4 -1 -1 4 -4 -4 -2 -1 0 5 0 3 -3 -1 4 4 -2 0 4 2 -4 1 -4 2 -1 2 -3 -1 -1 -1 5 -1 -5 -3 -4 2 -5 -2 -2 -1 -3 3 0 0 4 1 2 -5 1 -1 0 2 -2 0 5 -3 0 4 1 -5 2 2 -1 3 2 -2 3 5 0 -3 1 2 4 1 2 -5 5 -5 -3 -1 3 -2 4 -3 3 -1 -1 -5 -2 2 4 3 5 1 4 -2 -5 -3 0 2 2 2 0 2 5 2 -4 1 -3 2 -1 -2 2 -2 -1 -3 -2 -4 0 5 2 0 4 3 -2 0 0 -4 4 -2 -5 1 -1 -4 -4 -4 -4 3 2 2 -2 -3 0 5 -2 -4 4 -2 5 -3 -3 1 5 -3 3 -2 4 -2 0 3 0 2 2 -3 -4 3 -5 -4 0 0 -1 2 1 1 -2 -1 -1 1 -2 5 5 1 -1 4 -3 -5 -1 -1 5 5 -5 -1 -1 -4 4 -2 5 2 5 3 0 2 4 -2 3 1 1 1 -5 5 3 -5 2 -2 4 3 5 0 4 -3 -4 -3 4 3 -3 -2 4 3 2 2 -3 4 4 3 -3 -4 -5 -3 -2 0 0 -5 -2 1 4 -3 -5 -3 3 0 2 1 -4 3 -1 2 1 -2 -4 1 1 3 -1 -5 5 3 3 -3 -3 2 5 -1 0\n', expectedOutput: '1069', isHidden: true },
          { input: '3000 0\n' + new Array(3000).fill('0').join(' ') + '\n', expectedOutput: '4501500', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },
  {
    unitCode: 'JT_CS_DSA_LINEAR_INTERVIEW_QUESTION',
    notes: `Three linear-structure questions asked constantly in .NET coding rounds. Interviewers grade the
explanation as much as the code: say the brute force, say why it is slow, then say the better idea
and its cost **before** you type.

## Q1. "Reverse a singly linked list."

**Say aloud.** "I'll walk the list once with three references — \`prev\`, \`cur\` and \`next\`. At each
node I save \`cur.Next\`, point \`cur.Next\` back at \`prev\`, and step both forward. When \`cur\` is null,
\`prev\` is the new head. That's O(n) time and O(1) space. An empty list returns null, and one node
returns itself."

    ListNode? prev = null, cur = head;
    while (cur != null) { var next = cur.Next; cur.Next = prev; prev = cur; cur = next; }
    return prev;

**Follow-up:** "Now do it recursively." — \`var newHead = Reverse(head.Next); head.Next.Next = head;
head.Next = null; return newHead;\` with base case \`head == null || head.Next == null\`. Same O(n) time
but O(n) stack, and in .NET a stack overflow kills the process, so for long lists I would ship the
iterative one.

## Q2. "Find two numbers that add up to a target — return their indices."

**Say aloud.** "Brute force checks every pair: O(n²). Instead I'll keep a \`Dictionary<int, int>\` from
value to index. For each number I look up \`target - num\`; if it's there I have my pair, otherwise I
store this number. Looking up before storing stops a number pairing with itself. O(n) time, O(n)
space."

**Follow-up:** "What if the array is sorted?" — Two pointers from both ends: if the sum is too small
move the left pointer right, if too big move the right pointer left. O(n) time and O(1) space, no
dictionary. **And if the values are near int.MaxValue?** — add them as \`long\` so the comparison
cannot overflow.

## Q3. "Is this string of brackets valid?"

**Say aloud.** "Every closer must match the most recent unmatched opener — last in, first out — so
it's a stack. I push each opener; for each closer I check the stack is not empty and that the popped
opener matches. At the end the stack must be empty. O(n) time and O(n) space. I'll use
\`Stack<char>\` and a small dictionary from closer to opener so adding a bracket type is one line."

**Follow-up:** "Only one bracket type?" — A counter is enough: +1 for \`(\`, -1 for \`)\`, fail if it ever
goes negative, and it must end at 0. O(1) space.

**Bonus, often next:** "Which .NET collection would you use for a queue, and what does Dequeue do
when it is empty?" — \`Queue<T>\`, O(1) enqueue and dequeue; \`Dequeue\` on an empty queue throws
\`InvalidOperationException\`, so I check \`Count\` or use \`TryDequeue\`.`,
    mcqs: [
      mcq('You reverse a C# linked list recursively instead of iteratively. What changes, and why does it matter in .NET?',
        [['Stack use grows to O(n), and an overflow ends the process', true], ['Time rises to O(n²) because each call copies the list', false], ['Nothing changes; the JIT turns the recursion into a loop', false], ['Time falls to O(log n) because the list is split in two', false]],
        'Each call keeps a frame until the end is reached. A StackOverflowException cannot be caught in .NET, so long lists favour the loop.'),
      mcq('An interviewer says the two-sum input array is already sorted. What should replace the Dictionary?',
        [['Two pointers from both ends, for O(1) extra space', true], ['A SortedDictionary, for O(log n) lookups', false], ['A binary search for every pair of elements', false], ['A HashSet of every pairwise sum in the array', false]],
        'Sorted input lets the pointers move inward based on whether the sum is too small or too big, so no extra structure is needed.'),
      mcq('For a valid-brackets check with only "(" and ")", what can replace the Stack<char>?',
        [['A counter that never goes below 0 and ends at 0', true], ['A bool flag that flips on every "(" character', false], ['A HashSet of the positions of every bracket', false], ['Sorting the string and comparing the two halves', false]],
        'With one bracket type there is nothing to match but the number of open brackets, so a counter gives O(1) space.'),
    ],
  },
  {
    unitCode: 'JT_CS_DSA_LINEAR_CHECKPOINT',
    notes: `Ten questions across the whole topic: complexity, arrays and windows, linked lists, stacks and
queues, hashing, recursion, and sorting and searching. Each one is a piece of C# to trace or a
decision to make. Work them by hand before choosing.`,
    checkpoint: [
      ck('DSA_COMPLEXITY', 'A C# method calls Array.Sort on an int[] and then scans it once for equal neighbours. What is its overall time complexity?',
        [['O(n log n)', true], ['O(n)', false], ['O(n²)', false], ['O(log n)', false]],
        'The sort costs O(n log n) and the scan O(n). The larger term dominates, so the total is O(n log n).'),
      ck('DSA_ARRAYS', 'The C# Dedupe method with read and write pointers runs on the sorted array { 1, 1, 2, 3, 3 }. What length does it return?',
        [['3', true], ['5', false], ['2', false], ['4', false]],
        'The write pointer keeps 1, 2 and 3, skipping each repeat of the previous kept value, so the new length is 3.'),
      ck('DSA_LINKED_LIST', 'The iterative Reverse method is given the list 1 -> 2 -> 3. What does the returned head print when traversed?',
        [['3 2 1', true], ['1 2 3', false], ['3 only', false], ['1 only', false]],
        'Each node is pointed back at its predecessor, and prev ends on the old tail, 3, which now leads 3 -> 2 -> 1.'),
      ck('DSA_STACK', 'Which input makes the C# IsBalanced method return false because a closer arrives with an empty stack?',
        [['")("', true], ['"(("', false], ['"([])"', false], ['"{"', false]],
        'The first character is a closer and the stack is empty, so it fails at once. "((" and "{" fail at the final Count check, and "([])" is valid.'),
      ck('DSA_HASHING', 'var seen = new HashSet<int>(); foreach (int x in new[] { 4, 7, 2, 7, 4 }) if (!seen.Add(x)) { Console.Write(x); break; } What is printed?',
        [['7', true], ['4', false], ['2', false], ['Nothing is printed', false]],
        'Add returns false for the first value already present. 4, 7 and 2 are new; the second 7 is the first repeat, so 7 is printed.'),
      ck('DSA_RECURSION', 'The Subsets backtracking method is run on an array of 5 distinct numbers. How many lists end up in result?',
        [['32', true], ['120', false], ['25', false], ['10', false]],
        'Each number is either included or not, so there are 2⁵ = 32 subsets, including the empty one. 120 would be the permutations.'),
      ck('DSA_SORTING', 'var w = new List<string> { "banana", "Apple", "cherry" }; w.Sort(StringComparer.Ordinal); What is the order?',
        [['Apple, banana, cherry', true], ['banana, cherry, Apple', false], ['banana, Apple, cherry', false], ['cherry, banana, Apple', false]],
        'Ordinal comparison uses character codes; uppercase A (65) is below lowercase b (98), so "Apple" comes first.'),
      ck('DSA_HASHING', 'The prefix-sum counter for "subarray sum equals k" runs on { 2, 2, 2 } with k = 4. What does it return?',
        [['2', true], ['1', false], ['3', false], ['0', false]],
        'The prefixes are 2, 4 and 6. At 4 the dictionary holds the empty prefix 0, and at 6 it holds 2, so two subarrays sum to 4.'),
      ck('DSA_COMPLEXITY', 'Why is LinkedList<T> usually slower than List<T> in .NET for a simple loop over every element, even though both are O(n)?',
        [['List<T> stores items side by side, which suits the CPU cache', true], ['LinkedList<T> copies each node into an array before reading it', false], ['LinkedList<T> boxes every element, even for value types', false], ['The foreach loop over a LinkedList<T> is O(n log n)', false]],
        'A List<T> walks one contiguous array; a linked list chases references to nodes scattered across the heap, missing the cache far more often.'),
      ck('DSA_SORTING', 'A list of people in sign-up order is sorted with people.OrderBy(p => p.Age).ToList(). Two people share an age. What is their order?',
        [['Their sign-up order, as OrderBy is stable', true], ['Reversed, as OrderBy flips ties', false], ['Unpredictable, as OrderBy is introsort', false], ['Alphabetical, as OrderBy compares names on ties', false]],
        'LINQ OrderBy is a stable sort, so elements with equal keys keep their relative order — here, the order in which they signed up.'),
    ],
  },
];

export const TRACK_CS_ASYNC_DSA_BUNDLES: PilotBundle[] = [...ASYNC, ...DSA_LINEAR];
