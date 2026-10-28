/**
 * Career-track content: Streaming (DE_STREAMING), Data Engineer, batch DE3.
 *
 * When a pipeline should run continuously instead of on a schedule, and how to build one that neither loses nor
 * double-counts events: event time versus processing time, Kafka's topics, partitions, keys, offsets and consumer
 * groups, delivery guarantees and idempotent sinks, Spark Structured Streaming with windows, watermarks, state and
 * checkpoints, and the managed services (Kinesis, MSK, Event Hubs, Debezium for CDC). It builds on DE1's "Idempotent,
 * Restartable Loads" and "Database Extracts" (watermarks, CDC in outline) and DE2's Apache Spark topic; those are
 * referred to by title, not re-taught.
 *
 * One fictional company runs through the topic: ThaliGo, a Hyderabad food-delivery app, with order events, rider
 * GPS pings and UPI payment events, all synthetic. What was run, and how: Kafka partitioning used kafka-python's
 * murmur2 (the Java client's hash); consumer groups, offsets, commits and the idempotent producer were simulated in
 * plain Python; confluent-kafka 2.16 / kafka-python 3.0 client code was py_compiled and its configs constructed
 * (librdkafka validates them without a broker), but no broker ran. Spark Structured Streaming 3.5.9 ran for real in
 * local mode on a file source with a memory sink and foreachBatch into DuckDB; on Windows that needed a lab-only
 * local-filesystem shim for checkpoints (students should use WSL2 or Docker). Kinesis ran against moto (moto's
 * sequence numbers are not realistic, so none are quoted). Event Hubs code was checked against azure-eventhub's
 * signatures; MSK, the Spark Kafka source and Debezium are written from documentation and not run.
 *
 * Skill: BATCH_STREAM_PROCESSING (the topic's only skill).
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_DE_STREAMING_BUNDLES: PilotBundle[] = [
  /* ── BATCH_VS_STREAM ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_STREAMING_BATCH_VS_STREAM',
    notes: `Everything so far in this track ran on a schedule: an hourly API pull, a nightly Spark job, a dbt run after the
load. That is **batch**: collect data for a period, process the whole period, publish the result. Most data in
most companies is still processed this way, and should be. Streaming is the exception you must be able to justify.

## Three ways to process the same events

ThaliGo, a Hyderabad food-delivery app, emits an event every time an order changes state (placed, accepted,
picked up, delivered) and every few seconds from each rider's phone (a GPS ping). The same events can be processed
three ways:

    batch         every hour or day: read the period's files, compute, overwrite the output partition
                  latency: the schedule plus the run time (an hour to a day)
    micro-batch   every few seconds to minutes: read what arrived since the last run, update the result
                  latency: seconds to minutes (Spark Structured Streaming's default mode)
    streaming     each event processed as it arrives, results updated continuously
                  latency: milliseconds to a second (Flink, Kafka Streams; Spark's continuous mode is experimental)

Micro-batch is the middle that most "real-time" data pipelines actually use. A dashboard refreshed every 30 seconds
does not need per-event processing; it needs small batches run often and reliably.

## What streaming costs

Lower latency is never free. Compared with the nightly job, a streaming pipeline:

- **Runs all the time.** A cluster or consumer process is up 24x7, so you pay for compute every hour, including
  3 a.m. when nobody looks at the dashboard. Batch pays only while it runs.
- **Has state.** A running total or a 5-minute window must be remembered between events, checkpointed, and
  recovered after a crash (STREAM_PROCESSING).
- **Must decide when an answer is final.** A batch job for 28 October runs after the day ends and sees the whole
  day. A stream emitting "orders between 12:00 and 12:05" must decide how long to wait for stragglers.
- **Is harder to fix.** A wrong batch output is fixed by rerunning the partition ("Idempotent, Restartable Loads").
  A wrong stream output needs a replay from a retained log, which only works if the log still has the data.
- **Needs on-call.** If the job dies at 2 a.m., the dashboard is stale by 2:05.

## Event time and processing time

Every event has two times, and confusing them is the most common streaming bug.

- **Event time** — when it happened: the phone's timestamp when the rider tapped "delivered".
- **Processing time** — when your pipeline saw it: the moment it arrived at the consumer.

They differ because networks, phones and queues delay things. A simulation of 6,000 "delivered" events between
12:00 and 12:10 (95% arrive within 3 seconds, 4% within 3 minutes, 1% from phones offline in a basement or lift
for 10 to 30 minutes) printed:

    minute  by_event_time  by_processing_time
    12:00             545                 498
    12:01             610                 586
    12:05             597                 574
    12:09             622                 627
    events from 12:00-12:09 that arrived after 12:10: 108
    arrived more than  1 min after their minute closed: 197
    arrived more than  5 min after their minute closed: 62
    arrived more than 15 min after their minute closed: 46

Counting by processing time gives the wrong count for every minute: 12:00 shows 498 instead of 545, because 47 of
its events had not arrived yet. Business questions ("deliveries per minute", "UPI payments in the sale's first
hour") are about event time. So a stream must group by event time, and must decide how long to keep a minute open
for late events — the **watermark** (STREAM_PROCESSING). Here, waiting 5 minutes catches all but 62 of 6,000;
waiting 15 catches all but 46; nothing waits forever.

Processing time is right for operational questions about the pipeline itself: how many events did the consumer
handle per second, how far behind is it.

## When streaming is worth it

Ask what action the fresher number enables, and what a delay costs.

    use case                                   needs              why
    fraud check on a UPI payment               streaming, <1 s    the decision blocks the payment
    rider ETA and live order tracking          streaming          the customer is watching the map
    surge pricing per zone                     micro-batch, ~1 min a minute-old demand count is fine
    ops dashboard for a sale-day war room      micro-batch        30-second refresh is plenty
    daily finance reconciliation               batch              must see the complete, settled day
    marketing attribution, monthly reports     batch              nobody acts on it within the hour
    ML training data                           batch              trained daily or weekly anyway

Two traps. "The business wants real-time" usually means "fresher than tomorrow morning"; an hourly batch is often
the right answer, at a fraction of the effort. And streaming is not a substitute for batch: finance numbers still
come from a batch job over the complete data, even when a stream shows a live estimate.

## Lambda and Kappa, briefly

Interviewers still ask. The **Lambda** architecture runs two pipelines: a stream for fast approximate numbers and a
batch job that later recomputes the exact ones. It works, but the same logic lives in two codebases that drift
apart. The **Kappa** architecture keeps one streaming pipeline and a long-retained log (Kafka); to fix or change
the logic, you replay the log through the new version. Most teams today do something in between: one engine used
in both modes (Spark runs the same DataFrame code as batch or as a stream), and a lakehouse table (Delta, Iceberg)
that the stream appends to and a nightly batch corrects.

## The building blocks of the rest of this topic

    log / broker      Kafka, Kinesis, Event Hubs: durable, ordered, replayable storage for events (KAFKA_BASICS)
    guarantees        what happens on retries and crashes, and how not to double-count (DELIVERY_SEMANTICS)
    processor         Spark Structured Streaming: windows, watermarks, state, checkpoints (STREAM_PROCESSING)
    managed services  who runs the brokers, and CDC from databases (MANAGED_STREAMING)`,
    workedExample: `**Scenario.** ThaliGo's ops head asks for "real-time" order numbers for the Diwali sale. Three teams want
something: the ops war room wants orders and cancellations per zone; finance wants the day's GMV by restaurant;
the risk team wants to stop a payment if the same UPI handle pays from five phones in a minute. Decide batch,
micro-batch or streaming for each, and say what each choice costs.

**1. Ask what the number triggers.** The war room moves riders between zones: a decision every few minutes, made
by people looking at a screen. Finance closes the books the next morning. Risk must decide before the payment
completes, in well under a second.

**2. Risk: streaming.** The decision blocks a payment, so it cannot wait for a batch. It needs per-event
processing with state (payments per UPI handle in the last minute), kept in memory or a fast store, run by an
always-on service. This is the expensive one, and it is justified because a missed fraud costs money directly.

**3. War room: micro-batch, 30 to 60 seconds.** A Spark Structured Streaming job reading the order topic,
counting by zone in 5-minute event-time windows, writing to a table the dashboard polls. It allows a few minutes
for late events and accepts that the last window's number will still move a little. A 30-second refresh is
indistinguishable from "real-time" to a person watching a screen, and costs far less than per-event processing.

**4. Finance: batch, nightly.** Finance must reconcile with the payment gateway's settlement file, which arrives
the next morning; UPI payments can be reversed hours later. A streaming GMV would be fast and wrong. The nightly
job reads the complete day, joins settlements, and overwrites the day's partition.

**5. Say the trade-off aloud.** "The stream gives the war room a live estimate; the batch gives finance the number
of record. If they disagree, the batch number wins, and the difference should be small: late events and reversals."

**Result.** One streaming service (risk), one micro-batch job (ops), one batch job (finance) — instead of making
everything streaming because the request said "real-time". The cost of each is sized to the decision it serves.`,
    mcqs: [
      mcq('ThaliGo counts deliveries per minute by the time each event reaches the consumer. The 12:00 count is 498, but 545 deliveries happened that minute. What explains the gap?', [
        ['It counts by processing time, so events delayed past 12:01 land in later minutes', true],
        ['The consumer drops events that arrive out of order, so 47 deliveries were lost', false],
        ['Phones send events in batches every minute, so the first minute is always short', false],
        ['The broker deduplicates events with the same timestamp, merging 47 of them together', false],
      ], 'Grouping by arrival time puts a 12:00 delivery that arrived at 12:01:30 in the 12:01 bucket. Nothing was lost or merged: the events are all there, just counted in the wrong minute. The fix is to group by event time and wait for late events.'),
      mcq('Finance asks for a streaming GMV pipeline so they can close the books faster. Which reply is the soundest?', [
        ['Keep the nightly batch as the number of record, since reversals and settlements arrive late', true],
        ['Build the stream, since a stream that sees each payment once is always more accurate than batch', false],
        ['Build the stream and drop the batch job, since running both doubles the cloud cost for no benefit', false],
      ], 'Settlement files and UPI reversals arrive hours later, so only a job over the complete, settled day gives the right figure. A stream sees events sooner, not more correctly; a live estimate can sit beside the batch, but cannot replace it.'),
      mcq('Which statement about Spark Structured Streaming\'s default execution mode is accurate?', [
        ['It runs micro-batches: small batch jobs over newly arrived data, every few seconds', true],
        ['It processes each event the instant it arrives, with millisecond latency by default', false],
        ['It runs once a day like a batch job unless a trigger interval is set in the code', false],
        ['It needs a Kafka Streams cluster underneath and only orchestrates that cluster', false],
      ], 'Structured Streaming plans each trigger as a small batch over the new data; per-event continuous mode exists but is experimental. With no trigger set it starts the next micro-batch as soon as the previous one finishes, and it runs on Spark itself, not Kafka Streams.'),
    ],
    checkpoint: [
      mcq('For which ThaliGo use case is per-event streaming clearly justified?', [
        ['Blocking a UPI payment when one handle pays from five phones in a minute', true],
        ['Monthly marketing attribution reports for the brand and growth teams', false],
        ['Rebuilding the restaurant dimension table after the nightly menu sync', false],
        ['A dashboard of orders per zone that the ops team checks every 30 minutes', false],
      ], 'The fraud decision must happen before the payment completes, so nothing slower works. Monthly reports and nightly dimension loads are batch by nature, and a dashboard checked every 30 minutes is well served by micro-batch or even hourly batch.'),
      mcq('A rider marks an order delivered at 21:04:10 in a basement; the event reaches the pipeline at 21:19:40. Which time should "deliveries per 5 minutes" use?', [
        ['21:04:10, the event time, so it counts in the 21:00-21:05 window', true],
        ['21:19:40, the processing time, since that is when the data became known', false],
        ['Whichever is later, so that the window is never reopened after closing', false],
      ], 'The business question is when deliveries happened, which is event time. Processing time would put it in 21:15-21:20 and undercount 21:00-21:05. Whether the late event is still accepted depends on the watermark, but the window it belongs to is decided by event time.'),
      mcq('What is the main weakness of the Lambda architecture that the Kappa architecture tries to remove?', [
        ['The same logic is written twice, for the batch and the stream, and the two drift apart', true],
        ['It cannot replay history, because events are deleted once the batch layer reads them', false],
        ['It has no way to give low-latency results, since everything waits for the batch layer', false],
        ['It needs one Kafka topic per consumer, so topics multiply with every new dashboard', false],
      ], 'Lambda keeps a fast stream path and a correct batch path, so every change is made in two codebases. Kappa keeps one streaming path and replays a long-retained log instead. Lambda does give low latency (that is its stream path) and does not force topics per consumer.'),
    ],
  },

  /* ── KAFKA_BASICS ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_STREAMING_KAFKA_BASICS',
    notes: `Apache Kafka is the log most streaming pipelines are built on: the order service writes events to it, and any
number of consumers (the lake loader, the fraud service, the ETA model) read them, each at its own pace. Kinesis
and Event Hubs (MANAGED_STREAMING) use the same ideas under other names, so learn them here once.

## The model

    broker      a Kafka server; a cluster has several (3 is the usual minimum in production)
    topic       a named stream of events, e.g. orders.events.v1
    partition   a topic is split into partitions; each is an append-only log stored on a broker
    offset      a record's position in its partition: 0, 1, 2, ... never reused
    replica     each partition is copied to replication.factor brokers; one leader, the rest followers
    producer    writes records (key, value, headers, timestamp) to a topic
    consumer    reads records; consumers sharing a group.id split the partitions between them

A record is not deleted when it is read. It stays until **retention** removes it (by time, 7 days by default, or by
size), so a new consumer can read from the start, and a fixed consumer can go back and reread. That is the
difference from a queue such as SQS or RabbitMQ, where a message is gone once acknowledged. Modern Kafka runs its
own metadata quorum (**KRaft**); older clusters used ZooKeeper, which Kafka 4.0 removed.

## Keys decide partitions, and partitions decide order

Kafka guarantees order **within a partition** only. The producer chooses the partition from the record's key: the
Java client's default is murmur2(key) modulo the partition count. kafka-python ships the same murmur2 function, so
this was run against it:

    from kafka.partitioner.default import murmur2
    def partition_for(key, n):
        return (murmur2(key.encode()) & 0x7fffffff) % n

    order-1001 -> 0     order-1002 -> 0     order-1003 -> 4     rider-77 -> 3     rider-77 -> 3

The same key always lands on the same partition, so all events for order-1001 (PLACED, ACCEPTED, PICKED_UP,
DELIVERED) arrive in order. Events for different orders on different partitions have no order relative to each
other, and do not need one. **Choose the key as the entity whose events must stay in order**: order_id for order
events, rider_id for GPS pings, account_id for a ledger.

Records with no key are spread across partitions (current clients fill one partition's batch, then move on, the
"sticky" behaviour), so they have no per-entity order at all.

Watch for three things:

- **Hot keys.** Keying 100,000 order events by restaurant_id, where one big biryani chain sends 30% of orders, gave
  partitions of 11,870 / 11,174 / 11,842 / 11,902 / 11,626 / **41,586**. Keyed by order_id the six were all near
  16,600. One consumer handles the hot partition and falls behind while the others idle.
- **Changing the partition count moves keys.** Going from 6 to 8 partitions sent 74,862 of 100,000 keys (74.9%)
  to a different partition. For a while, an order's old events sit on one partition and new ones on another, so
  per-key order breaks across the change. Choose the count up front with room to grow (12 or 24 rather than 3), and
  plan increases.
- **Clients hash differently.** confluent-kafka (built on librdkafka) defaults to a CRC32-based partitioner, not
  murmur2. Computed the same way, 8,350 of 10,000 keys landed differently. If a Java service and a Python service
  write the same topic with the same keys, set partitioner to murmur2_random in the Python client so they agree.

## Consumer groups

Consumers with the same group.id share a topic's partitions: each partition goes to exactly one member, and a
member may own several. Kafka's range assignment, simulated for one topic of 6 partitions:

    2 consumers: {'c1': [0, 1, 2], 'c2': [3, 4, 5]}
    4 consumers: {'c1': [0, 1], 'c2': [2, 3], 'c3': [4], 'c4': [5]}
    7 consumers: {'c1': [0], 'c2': [1], ... 'c6': [5], 'c7': []}

The seventh consumer gets nothing: **parallelism within a group is capped by the partition count**. A different
group.id is an independent reader with its own offsets — the lake loader and the fraud service each see every
event.

When a member joins, leaves or stops responding, the group **rebalances**. With the older eager protocol, every
member gives up all its partitions until the new assignment is ready, so the whole group pauses. When c1 died in a
three-member group, the range assignor moved partitions [0, 1, 3]; a sticky assignment moved only c1's [0, 1].
The cooperative-sticky strategy (partition.assignment.strategy = cooperative-sticky) moves only what must move,
and the others keep consuming.

## Offsets and lag

The group stores a **committed offset** per partition: the next record to read. After a restart, a consumer resumes
from it. auto.offset.reset (earliest or latest) applies only when the group has no committed offset yet. Two
numbers to watch in production:

    lag = log-end offset - committed offset      (per partition, summed per group)

Steady lag is fine; lag that keeps growing means consumers are slower than producers. DELIVERY_SEMANTICS covers
when to commit.

## Durability settings

replication.factor=3 keeps three copies. With acks=all the leader confirms a write only after every in-sync
replica has it, and min.insync.replicas=2 refuses writes when fewer than two copies are in sync, so an
acknowledged event survives a broker failure. Creating such a topic with confluent-kafka (written from the
documentation; no broker in this lab):

    from confluent_kafka.admin import AdminClient, NewTopic
    admin = AdminClient({"bootstrap.servers": "localhost:9092"})
    topic = NewTopic("orders.events.v1", num_partitions=12, replication_factor=3,
                     config={"retention.ms": str(7 * 24 * 3600 * 1000), "min.insync.replicas": "2"})
    for name, fut in admin.create_topics([topic]).items():
        fut.result()          # raises if creation failed

**Compaction** (cleanup.policy=compact) is the other retention mode: Kafka keeps at least the latest record per
key, so a topic of "current restaurant status" stays small and a new consumer can rebuild the latest state. A
record with a null value (a tombstone) marks the key for deletion.

## Producing and consuming in Python

    producer = Producer({"bootstrap.servers": "localhost:9092", "enable.idempotence": True,
                         "acks": "all", "linger.ms": 20, "compression.type": "lz4"})
    producer.produce("orders.events.v1", key=event["order_id"],
                     value=json.dumps(event).encode(), on_delivery=on_delivery)
    producer.poll(0)          # serve delivery callbacks
    ...
    producer.flush(10)        # before exit: returns how many are still unsent

produce() only queues the record; delivery happens in the background, and on_delivery reports success or failure.
Without flush() at the end, a script can exit with records still queued. With no broker running, flush(2)
returned 1 here: the one record was still waiting. Topic names: use a convention and a version suffix
(domain.entity.event.v1), since changing an event's shape incompatibly means a new topic.`,
    workedExample: `**Scenario.** ThaliGo is creating a topic for rider GPS pings: 40,000 riders at peak, one ping every 4 seconds,
about 300 bytes each. The ETA service needs each rider's pings in order. Choose the key, the partition count,
retention and durability, and say what consumer parallelism you get.

**1. Rate.** 40,000 / 4 = 10,000 pings per second at peak, about 3 MB/s. Modest for Kafka; a few partitions could
carry the bytes. The partition count is set by consumer parallelism and growth, not raw throughput, here.

**2. Key.** The ETA service needs one rider's pings in order, so key = rider_id. Not zone_id: zones are uneven
(a tech-park zone at lunch is a hot key), and a rider crosses zones, which would split their pings across
partitions and lose their order.

**3. Partition count.** The ETA service's consumer group will run up to 12 instances at peak, and the business
expects to triple riders. 24 partitions gives headroom without a later increase, which would move about three
quarters of the keys (6 to 8 moved 74.9% in the lab) and break per-rider order during the change. With 40,000
riders hashed by murmur2, each partition gets about 1,700 riders; no single rider is hot.

**4. Retention.** Pings are useful for minutes, but replay after a bug needs some history: 3 days by time
(retention.ms = 259200000). The lake loader copies every ping to S3 within minutes, so long-term history lives in
the lake, not the broker.

**5. Durability.** replication.factor=3, min.insync.replicas=2, producers with acks=all and idempotence on. A lost
ping is not a disaster, but these are the cluster defaults the platform team uses, and making one topic an
exception confuses the next engineer.

**6. Consumers.** Group eta-service with up to 12 members: 2 partitions each. Group lake-loader: 2 members. The
fraud team adds group rider-anomaly later and reads from earliest without disturbing anyone. A 25th ETA instance
would sit idle.

**Result.** Topic rider.pings.v1: 24 partitions, key rider_id, RF 3, min ISR 2, retention 3 days, cleanup
delete (not compact: every ping matters, not only the latest).`,
    mcqs: [
      mcq('ThaliGo keys order events by order_id on a 12-partition topic. Which ordering does Kafka then guarantee?', [
        ['Events of one order are read in the order they were written', true],
        ['Every event on the whole topic is read in global time order, across partitions', false],
        ['Events of one restaurant are read in the order written', false],
        ['Events are ordered by event time inside each partition', false],
      ], 'Order is guaranteed within a partition, and one key always maps to one partition, so a single order\'s events stay in sequence. Across partitions there is no order, a restaurant\'s orders spread over many partitions, and Kafka orders by write position, not by the timestamp inside the event.'),
      mcq('A consumer group for a 6-partition topic is scaled from 6 to 9 instances to cut lag. What happens?', [
        ['Three instances get no partitions, so throughput does not rise', true],
        ['Kafka splits each partition so that all nine instances share work', false],
        ['Each partition is read by 1.5 instances on average, so lag falls', false],
        ['The group rejects the three new members until a broker is added', false],
      ], 'Within a group each partition belongs to one member, so parallelism stops at six. Kafka never splits a partition between members of a group, and it does not reject extra members: they join and stay idle as standbys. To scale further, increase partitions (and accept that keys move).'),
      mcq('A new consumer group starts with auto.offset.reset=latest on a topic holding 3 days of events. What does it read first?', [
        ['Only records produced after it joins, skipping the retained history', true],
        ['All 3 days of retained records first, then the new ones as they arrive', false],
        ['The last record of each partition again, then everything after it', false],
        ['Whatever offset another group most recently committed on the topic', false],
      ], 'With no committed offset, latest starts at the end of each partition, so the history is skipped; earliest would read all of it. Offsets are per group, so another group\'s position is irrelevant. Once the group commits, the reset setting is no longer used.'),
    ],
    checkpoint: [
      mcq('An order-events topic is keyed by restaurant_id, and one chain sends 30% of orders. One consumer lags while five idle. What is the fix?', [
        ['Key by order_id, which spreads load evenly and still keeps each order in sequence', true],
        ['Add six more consumers to the group so that the hot partition is shared between them', false],
        ['Raise the partition count from 6 to 12, which splits the chain over two partitions', false],
        ['Turn on compaction so the hot partition keeps only the latest event for each chain', false],
      ], 'The hot key puts 30% of events on one partition; keying by the entity whose order matters (the order) spreads them evenly. Extra consumers cannot share one partition, more partitions still hash the one key to one partition, and compaction would throw events away.'),
      mcq('A team increases a keyed topic from 6 to 8 partitions on a busy afternoon. What should they expect?', [
        ['Most keys map to a new partition, so a key\'s old and new events can be read out of order', true],
        ['Existing records are rehashed into the new partitions, so consumers must reread from the start', false],
        ['Nothing changes for existing keys, since Kafka remembers the partition each key used before', false],
      ], 'The partition is hash modulo count, so changing the count remaps most keys (74.9% in the lab) while old records stay where they are; during the change one key has events on two partitions. Kafka neither moves old records nor remembers key placement.'),
      mcq('What does consumer lag measure for a partition?', [
        ['Log-end offset minus the group\'s committed offset', true],
        ['Seconds between the event time and the processing time of each event', false],
        ['Number of replicas that are out of the ISR set', false],
        ['Records deleted by retention before being read', false],
      ], 'Lag is how many records have been written but not yet consumed and committed by that group. Event-time delay is a different measure, out-of-sync replicas are a broker health metric, and records lost to retention are a consequence of lag that grew too large.'),
    ],
  },

  /* ── DELIVERY_SEMANTICS ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_STREAMING_DELIVERY_SEMANTICS',
    notes: `Networks drop acknowledgements, consumers crash halfway through a batch, and rebalances hand a partition to a new
owner mid-stream. Every streaming pipeline therefore has to answer one question: after a failure, is each event
counted zero times, once, or twice? For a ThaliGo UPI payments feed the answer has to be "once", and this lesson is
how you get there.

## The three guarantees

    at-most-once    an event is never processed twice, but may be lost
    at-least-once   an event is never lost, but may be processed more than once
    exactly-once    each event affects the result once, even across retries and crashes

On the consumer side, the guarantee comes down to **when you commit the offset relative to when the result
becomes durable**. A simulation with a 10-record partition, a consumer reading 4 at a time, and one crash after
processing pay-005:

    commit_first : rows=8 duplicates=0 missing=['pay-006', 'pay-007']
    commit_after : rows=12 duplicates=2 missing=[]

- **Commit first, then process** (at-most-once). The batch 4-7 was committed, then the process died after 4 and 5;
  on restart it resumed at 8. pay-006 and pay-007 are gone for good.
- **Process, then commit** (at-least-once). The crash came before the commit, so the restart reread 4-7, and 4
  and 5 were written twice.

Losing payments is not acceptable, so the default for data pipelines is **at-least-once plus a sink that ignores
duplicates**. In the same simulation, writing the at-least-once output into a table with payment_id as the primary
key and ON CONFLICT DO NOTHING:

    idempotent sink: (10, 1045) expected: (10, 1045)

Twelve deliveries, ten rows, the right total. This is what "effectively exactly-once" means in practice.

## The consumer, written for at-least-once

Auto-commit (enable.auto.commit=true, the default) commits on a timer in the background, which can commit records
you have not finished writing (loss) or not commit ones you have (duplicates). Turn it off and commit yourself,
after the write (confluent-kafka; py_compiled, configuration accepted by librdkafka, no broker run):

    consumer = Consumer({"bootstrap.servers": "localhost:9092", "group.id": "payments-to-lake",
                         "auto.offset.reset": "earliest", "enable.auto.commit": False,
                         "partition.assignment.strategy": "cooperative-sticky"})
    consumer.subscribe(["payments.events.v1"])
    while True:
        msgs = consumer.consume(num_messages=500, timeout=1.0)
        rows = [json.loads(m.value()) for m in msgs if not m.error()]
        if rows:
            upsert_payments(rows)                  # 1. make the result durable
            consumer.commit(asynchronous=False)    # 2. then move the group's offsets

Commit per batch, not per message: a synchronous commit is a round trip to the broker. If the process dies between
1 and 2, the batch is reread and the upsert absorbs it.

## Making the sink idempotent

The duplicate has to be recognisable, so every event needs a stable unique id set where it was created
(payment_id, or event_id generated by the producer) — not an id assigned by the consumer, which differs on reread.

- **Insert-if-absent** on the event id: INSERT ... ON CONFLICT (payment_id) DO NOTHING, or MERGE in a warehouse.
- **Upsert to latest state** keyed by entity, with a version guard so an older event cannot overwrite a newer one
  (the same guard as "Idempotent, Restartable Loads").
- **Aggregates are the hard case.** "amount = amount + new" is not idempotent: a replayed batch adds twice. Either
  deduplicate the events before aggregating, or record which batch ids were applied, in the same transaction as the
  totals, and skip a batch already applied. Spark's foreachBatch gives you the batch id for exactly this
  (STREAM_PROCESSING).
- **Side effects** (an SMS to the customer, a refund call) cannot be undone. Record "sent for payment_id" in a
  table and check it first, or pass an idempotency key the receiving API deduplicates on.

## The producer side

A producer retries when it does not get an acknowledgement in time. If the write had in fact succeeded and only
the acknowledgement was lost, the retry writes the event again. A simulation of a partition with and without the
broker's duplicate check:

    idempotence=False: log=['ride-501 completed', 'ride-502 completed', 'ride-502 completed']
    idempotence=True:  log=['ride-501 completed', 'ride-502 completed']

With **enable.idempotence** the producer gets a producer id and numbers every batch per partition; the broker
discards a batch whose sequence number it has already written. It requires acks=all, and librdkafka refuses to
start otherwise; the lab's attempt with acks=1 failed at construction with:

    Failed to create producer: \`acks\` must be set to \`all\` when \`enable.idempotence\` is true

The Java client has had idempotence on by default since Kafka 3.0; confluent-kafka (librdkafka) does not, so set
it explicitly. It only removes duplicates caused by the producer's own retries. If your application calls
produce() twice for the same payment (say, after its own crash), those are two different records; the consumer's
dedup on payment_id still matters.

## Kafka transactions: exactly-once inside Kafka

For a consume-transform-produce job (read orders, enrich them, write orders.enriched), Kafka can make the output
records and the input offsets commit together, atomically:

    producer = Producer({"bootstrap.servers": "...", "transactional.id": "order-enricher-1"})
    producer.init_transactions()
    ...
    producer.begin_transaction()
    for m in msgs:
        producer.produce("orders.enriched.v1", key=m.key(), value=enrich(m.value()))
    producer.send_offsets_to_transaction(consumer.position(consumer.assignment()),
                                         consumer.consumer_group_metadata())
    producer.commit_transaction()

Downstream consumers must set isolation.level=read_committed, or they see records from aborted transactions too.
The limit: this is exactly-once only from Kafka to Kafka. The moment the output is a Postgres table, an S3 file or
an email, Kafka's transaction cannot cover it, and you are back to an idempotent sink.

## The outbox: getting events out of a database without losing them

The order service saves the order to Postgres and then publishes the event. If it crashes between the two, the
order exists with no event (or, the other way round, an event for an order that rolled back). The **outbox
pattern**: write the event into an outbox table in the same database transaction as the order, and let a separate
process (or CDC with Debezium, MANAGED_STREAMING) publish the outbox rows to Kafka. The publish is at-least-once,
and the event carries the outbox row id, so consumers deduplicate on it.

## The rule to remember

End-to-end exactly-once is a property of the whole pipeline, not a switch: replayable source + at-least-once
delivery + idempotent or transactional sink. If any one is missing, say which guarantee you actually have.`,
    workedExample: `**Scenario.** ThaliGo's merchant-payouts job reads payments.events.v1 and keeps a running total per restaurant
in Postgres: UPDATE payouts SET amount = amount + :x WHERE restaurant_id = :r, then commits the offsets. After a
rebalance during the sale, three restaurants' totals are higher than the payment gateway's report. Find the cause
and fix it so totals are right after any crash or rebalance.

**1. Find which guarantee the job has.** It writes, then commits: at-least-once. A rebalance revoked a partition
after the UPDATE but before the commit; the new owner reread from the committed offset and added the same payments
again. Nothing is wrong with Kafka; the sink is not idempotent.

**2. Reject the tempting fixes.** Committing before the UPDATE would turn duplicates into losses. Committing after
every message narrows the window but does not close it, and makes the job slower. Turning on producer idempotence
does nothing here: the duplicates come from the consumer rereading, not the producer retrying.

**3. Make each payment count once.** Store events, not just totals:

    CREATE TABLE payment_events (payment_id text PRIMARY KEY, restaurant_id text,
                                 amount_paise bigint, event_time timestamptz);
    INSERT INTO payment_events VALUES (...) ON CONFLICT (payment_id) DO NOTHING;

Totals become a query or a view over payment_events (SUM by restaurant), or a table refreshed from it. A reread
batch inserts nothing new.

**4. If totals must be incremental**, keep a table of applied (topic, partition, offset-range) or batch ids, and in
one Postgres transaction: check it, apply the increments, insert the marker, commit. A replayed batch finds its
marker and is skipped. The Kafka offset commit can still fail afterwards; that only causes a harmless replay.

**5. Prove it.** A test feeds the same batch twice and asserts the totals are unchanged; another kills the consumer
between the database commit and the offset commit and checks the restaurant totals match the gateway report.

**6. Repair the past.** Recompute the three restaurants' totals from the events (or the lake copy of the topic) and
reconcile against the gateway report before payouts run.

**Result.** At-least-once delivery stays; the sink absorbs duplicates. Rebalances and crashes now cost a replay,
never a wrong payout.`,
    mcqs: [
      mcq('A consumer commits offsets as soon as it receives a batch, then writes the batch to S3. The process is killed mid-write. What happens to that batch?', [
        ['It is lost: the restart begins after the committed offsets', true],
        ['It is written twice: the restart rereads the entire batch', false],
        ['It is safe: Kafka keeps uncommitted writes and retries them', false],
        ['It is written once: S3 rejects a second write of the same key', false],
      ], 'Committing before the work is durable is at-most-once: the group\'s position has already moved past the batch, so the restart skips it. Rereading happens when the commit comes after the write, Kafka knows nothing about your S3 write, and S3 happily overwrites or adds objects.'),
      mcq('ThaliGo turns on enable.idempotence in its payment producer. Which duplicate does that prevent?', [
        ['A batch rewritten when the producer retries after a lost ack', true],
        ['A payment the app produced twice after its own process crashed', false],
        ['A batch reread by the consumer after a rebalance in its group', false],
        ['A payment the gateway sent twice to ThaliGo\'s webhook endpoint', false],
      ], 'The broker drops a retried batch whose producer id and sequence number it has already written. Two separate produce() calls are two different records, consumer rereads happen after the broker, and webhook duplicates arrive before Kafka; all of those need dedup on a business id.'),
      mcq('A job reads orders from Kafka and writes enriched orders back to another Kafka topic using transactions. What must its downstream consumers set?', [
        ['isolation.level=read_committed, so they skip records from aborted transactions', true],
        ['enable.auto.commit=false, so they never read records from aborted transactions', false],
        ['auto.offset.reset=earliest, so they read records only after each commit marker', false],
      ], 'Aborted transactional records are physically in the log; only read_committed consumers filter them out. Auto-commit controls when a consumer saves its own position, and auto.offset.reset only decides where a new group starts.'),
    ],
    checkpoint: [
      mcq('A payments consumer must never lose an event, and the warehouse table has payment_id as a primary key. Which design gives a correct result?', [
        ['Process then commit, inserting with ON CONFLICT (payment_id) DO NOTHING', true],
        ['Commit then process, so each offset is committed before the insert runs', false],
        ['Auto-commit every 5 seconds, with plain INSERTs into the payments table', false],
        ['Process then commit, inserting with a new UUID generated for every row', false],
      ], 'Committing after the write never loses events, and the key on payment_id absorbs the replays that causes. Commit-first loses events on a crash, auto-commit can do either, and a fresh UUID per row makes every replayed duplicate look like a new payment.'),
      mcq('A streaming job keeps "amount = amount + batch_sum" per merchant in Postgres. How do you make a replayed batch harmless?', [
        ['Record the applied batch id in the same transaction and skip ids already recorded', true],
        ['Commit Kafka offsets before running the UPDATE, so a batch can never be replayed', false],
        ['Enable producer idempotence on the upstream service that writes the payments topic', false],
        ['Run the UPDATE twice and compare results, rolling back if they turn out different', false],
      ], 'An increment is not idempotent, so the job must remember which batches it has applied, atomically with the totals. Committing offsets first trades duplicates for losses, producer idempotence does not stop consumer replays, and running twice doubles the problem.'),
      mcq('Which pipeline can honestly be called end-to-end exactly-once?', [
        ['Kafka source, Spark with checkpoints, and an upsert sink keyed on event id', true],
        ['Kafka source with idempotent producers and a consumer that sends one SMS', false],
        ['A Kafka transaction whose consumer writes rows straight into Postgres', false],
        ['Auto-committed consumer that appends each event to a CSV file in S3', false],
      ], 'A replayable source, tracked progress and an idempotent sink together make every event count once. An SMS is a side effect no Kafka setting can undo, Kafka transactions do not cover a Postgres write, and auto-commit with appends can both lose and duplicate.'),
    ],
  },

  /* ── STREAM_PROCESSING ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_STREAMING_STREAM_PROCESSING',
    notes: `Spark Structured Streaming treats a stream as a table that keeps growing. You write the same DataFrame code you
wrote in the Apache Spark topic; Spark runs it again and again on the new rows (micro-batches) and keeps whatever it
must remember between runs. Everything below ran on PySpark 3.5.9 in local mode, with a file source and an
in-memory sink, unless it says otherwise.

## Sources, sinks and the query

    source     Kafka (the usual), files arriving in a folder, Kinesis/Event Hubs via connectors, "rate" for tests
    sink       Delta/Parquet files, Kafka, foreachBatch (any batch writer), memory and console (tests only)
    trigger    how often a micro-batch runs: default (as soon as the last finished), processingTime="30 seconds",
               or availableNow=True (process everything there now, then stop: a stream run like a batch job)

Reading ThaliGo's order events from Kafka (written from the Spark documentation; needs the spark-sql-kafka-0-10
package matching your Spark version, not run here):

    raw = (spark.readStream.format("kafka")
           .option("kafka.bootstrap.servers", "broker1:9092")
           .option("subscribe", "orders.events.v1")
           .option("startingOffsets", "earliest")
           .option("maxOffsetsPerTrigger", 200000)
           .load())
    orders = (raw.select(F.from_json(F.col("value").cast("string"), schema).alias("e"))
                 .select("e.*"))

Kafka's value arrives as bytes: cast it to a string and parse it with from_json and an explicit schema (the Spark
topic's nested-data lesson). Spark tracks the Kafka offsets in its own checkpoint, not in a consumer group, so
consumer-group lag tools do not see a Spark job's progress unless you publish it.

## Windows by event time

    agg = (orders.withWatermark("event_time", "10 minutes")
           .groupBy(F.window("event_time", "5 minutes"), "zone")
           .agg(F.count("*").alias("orders"), F.sum("amount").alias("amount")))

F.window("event_time", "5 minutes") makes tumbling windows: 12:00-12:05, 12:05-12:10, each event in exactly one.
F.window(col, "10 minutes", "5 minutes") makes sliding windows (each event in two), and F.session_window(col,
"15 minutes") groups a user's events until a 15-minute gap. All three use the event's own time, which is what the
business asked for (BATCH_VS_STREAM).

## Watermarks: how long to wait for late events

withWatermark("event_time", "10 minutes") tells Spark: the watermark is the largest event time seen so far minus
10 minutes. It does two jobs: Spark **finalises and forgets** windows that end at or before the watermark, and it
**drops** a late event whose window has already been finalised. Without it, state for every window ever seen would
be kept forever.

Note the precise rule for windowed aggregations: what matters is the event's window, not the event alone. In a
second lab run (10-minute windows, 5-minute delay), an event at 10:07 arrived when the watermark was already 10:09
and was still counted, because its window 10:00-10:10 had not ended; an event at 10:12 arriving at watermark 10:22
was dropped, because 10:10-10:20 had. "Older than the watermark" is a fine rule of thumb, but not exact.

The lab fed four files of Madhapur orders through that query, one file per micro-batch. The late ones: o6 at 12:04
arrives after o5 at 12:12; o8 at 12:02 arrives after o7 at 12:21.

    file 1: o1 12:01, o2 12:03, o3 12:06, o4 12:07
    file 2: o5 12:12, o6 12:04          (o6 late, but within 10 minutes)
    file 3: o7 12:21
    file 4: o8 12:02, o9 12:23          (o8 late by 19 minutes)

With **outputMode("append")**, the progress of each micro-batch printed:

    batch 0: in=4 watermark=1970   stateRows=2 droppedLate=0 out=0
    batch 1: in=0 watermark=11:57  stateRows=2 droppedLate=0 out=0
    batch 2: in=2 watermark=11:57  stateRows=3 droppedLate=0 out=0
    batch 3: in=0 watermark=12:02  stateRows=3 droppedLate=0 out=0
    batch 4: in=1 watermark=12:02  stateRows=4 droppedLate=0 out=0
    batch 5: in=0 watermark=12:11  stateRows=2 droppedLate=0 out=2
    batch 6: in=2 watermark=12:11  stateRows=2 droppedLate=1 out=0
    batch 7: in=0 watermark=12:13  stateRows=2 droppedLate=0 out=0
    sink after all four files:
        12:00 - 12:05  3 orders  730
        12:05 - 12:10  2 orders  530

Read it slowly:

- The watermark is computed at the end of a batch and used by the next one (batch 0 printed the epoch,
  1970-01-01: no watermark yet). After file 1 (max 12:07) it became
  11:57; after file 2 (max 12:12), 12:02; after file 3 (max 12:21), 12:11. The batches with in=0 are Spark's
  no-data batches, run just to apply the new watermark.
- o6 (12:04) arrived while the watermark was 11:57, so it was accepted: the 12:00 window has 3 orders, 730.
- Append mode writes a window **once, when it is final**: only when the watermark passed its end. Both early
  windows appeared together in batch 5, when the watermark reached 12:11. Until then the sink showed nothing.
- o8 (12:02) arrived when the watermark was 12:11: droppedLate=1, and the 12:00 window stayed at 3. Its 999 is
  nowhere in the result. Count dropped rows in production; a sudden jump means a source is delayed.
- stateRows fell from 4 to 2 at batch 5: the two finalised windows were removed from state.

With **outputMode("update")**, the same input wrote a row each time a window changed. The memory sink is an
append-only table, so it kept every version (an excerpt):

    12:00 - 12:05  2  550     (batch 0)
    12:00 - 12:05  3  730     (batch 2: o6 arrived)
    12:20 - 12:25  1  300     (batch 4)
    12:20 - 12:25  2  450     (batch 6: o9)

Update mode is faster to show numbers but emits revisions, so its sink must **upsert** by window and key, not
append. Complete mode rewrites the whole result each batch, for small results only. One rule to know: append mode
with an aggregation and no watermark is refused, because no window could ever be final:

    AnalysisException: Append output mode not supported when there are streaming aggregations on
    streaming DataFrames/DataSets without watermark

Choosing the delay is a business trade-off: 10 minutes means the dashboard's final numbers come 10 minutes after
each window, and anything later is dropped (or sent to a side table by a separate batch job).

## State and checkpoints

Windows, dropDuplicates, stream-stream joins and session windows are **stateful**: Spark keeps state in a state
store (in memory with files behind it by default; set the RocksDB provider for large state) and saves it, with the
source offsets, in the **checkpoint location**:

    .option("checkpointLocation", "s3://thaligo-lake/_checkpoints/orders_by_zone/")

The checkpoint is what makes a restart resume exactly where it stopped. In the lab, a query restarted on the same
checkpoint processed no batches again ("after restart, new batches: []"). Rules: one checkpoint folder per query,
on durable storage, never shared; never delete it to "fix" a job (that restarts from startingOffsets); and some
query changes (a different aggregation, a renamed grouping column) are incompatible with an existing checkpoint.

## Deduplication and foreachBatch

For at-least-once sources, drop duplicates by event id within the watermark (Spark 3.5+):

    dedup = (payments.withWatermark("event_time", "10 minutes")
             .dropDuplicatesWithinWatermark(["payment_id"]))

To write to something Spark has no streaming sink for (a DuckDB, Postgres or warehouse table with MERGE), use
foreachBatch: Spark hands your function each micro-batch as an ordinary DataFrame plus its batch id. The lab
redelivered payment p2 in the second file, and upserted merchant totals into DuckDB, recording each batch id in the
same transaction and skipping ids already applied (DELIVERY_SEMANTICS):

    def upsert(df, batch_id):
        rows = df.groupBy("merchant").agg(F.count("*").alias("n"), F.sum("amount").alias("amt")).collect()
        ...  # BEGIN; skip if batch_id in applied_batches; INSERT ... ON CONFLICT DO UPDATE; record batch_id; COMMIT
    q = (dedup.writeStream.foreachBatch(upsert)
         .option("checkpointLocation", ".../chk/pay").start())

    dedupeWithinWatermark numDroppedDuplicateRows: batch 2 -> 1
    [('chai-point', 2, 130), ('dosa-hub', 2, 210)]

The duplicate p2 was dropped, and the totals are right. foreachBatch is at-least-once (a batch can be re-run after a
crash with the same batch id), which is why the batch-id check is there.

## Running it for real

Monitor q.lastProgress (input rate, processing rate, batch duration, state rows, dropped rows): if batch duration
exceeds the trigger interval, the job is falling behind. Run it on EMR, Databricks or Synapse/Fabric like any Spark
job, with the checkpoint on S3 or ADLS. On a Windows laptop, Spark needs Hadoop's native helpers to write
checkpoints; use WSL2 or a Docker image, as in the Spark topic.`,
    workedExample: `**Scenario.** ThaliGo's war-room dashboard shows orders per zone per 5 minutes. Ops complains that the number
for the current window jumps around, and that totals for 20:00-20:05 are sometimes lower than the next morning's
batch report. The job uses outputMode("update"), a 2-minute watermark, and appends to a Delta table. Fix it.

**1. Why the numbers jump.** Update mode emits a new row every time a window changes. Appending those rows to Delta
keeps every revision (the lab's memory sink showed 12:00-12:05 twice: 2 orders, then 3). The dashboard picks
whichever row it reads first. Either keep update mode and MERGE each micro-batch into the table by (window, zone)
via foreachBatch, so the table holds one current row per window; or switch to append mode, where each window is
written once, when final.

**2. Choose the mode by what ops needs.** The war room wants the current window moving live, so update mode with
an upsert is right for the live table. Finance-style reporting later wants final numbers only: append mode into a
second table, or the nightly batch.

**3. Why totals are low.** A 2-minute watermark closes each window 2 minutes after the stream passes its end, and
drops anything that arrives for a closed window. Rider
phones in basements send "delivered" events 10 to 30 minutes late (1% in the BATCH_VS_STREAM simulation). Check
the evidence first: the stateOperators metric numRowsDroppedByWatermark in the query progress. If it is in the
hundreds each evening, the watermark is too tight.

**4. Pick a new delay from data.** Measure processing time minus event time over a week: if the 99.9th percentile
is 14 minutes, a 15-minute watermark keeps nearly everything. The cost: final windows arrive 15 minutes later,
and state holds 15 minutes more windows (three more 5-minute windows per zone; small).

**5. Keep the long tail.** Events later than 15 minutes still exist in Kafka and the lake. The nightly batch
recomputes the day from the lake and overwrites the day's partition, so the reported numbers are complete.

**6. Deploy safely.** Before reusing the checkpoint, check the change against the Spark guide's list of changes
allowed between restarts (changing the grouping columns or the aggregation is not). Keep the checkpoint folder,
roll the job, and watch lastProgress for a few batches.

**Result.** The live table holds one row per window and zone (upserted), the watermark matches how late data
really is, dropped rows are monitored, and the nightly batch remains the number of record.`,
    mcqs: [
      mcq('A streaming query counts orders in 5-minute windows with withWatermark("event_time", "10 minutes"). The largest event time so far is 12:21. Which arriving event is dropped?', [
        ['An order at 12:02, whose window ended before the 12:11 watermark', true],
        ['An order at 12:12, which falls inside the 12:10-12:15 window that is still open', false],
        ['An order at 12:20, which arrived after the 12:21 order had', false],
        ['An order at 12:23, which is newer than any seen up to now', false],
      ], 'The watermark is 12:21 minus 10 minutes, 12:11, and the 12:00-12:05 window ended before it, so the 12:02 event is dropped (the lab showed droppedLate=1). The 12:12 event belongs to the still-open 12:10-12:15 window, out-of-order events in open windows are accepted, and newer events simply advance the watermark.'),
      mcq('In append mode with a 10-minute watermark, when is the 12:00-12:05 window written to the sink?', [
        ['Once, after the watermark passes 12:05, with its final count', true],
        ['Every micro-batch, with the running count as of that micro-batch', false],
        ['Immediately at 12:05 by the clock, whatever events exist', false],
        ['Only when the query is stopped and its state is flushed', false],
      ], 'Append mode emits a window once it can no longer change, which is when the watermark moves past its end. Emitting every batch is update mode, wall-clock time plays no part in event-time windows, and stopping the query does not flush unfinished windows.'),
      mcq('Why does foreachBatch code that upserts totals record the batch_id it applied?', [
        ['After a crash Spark may re-run a batch with the same id, which must not apply twice', true],
        ['Spark requires every foreachBatch function to return the batch_id it just wrote', false],
        ['The batch_id is the Kafka offset, which the sink needs in order to sort its rows', false],
      ], 'foreachBatch is at-least-once: a batch whose function ran but whose commit did not complete is re-run with the same id, so a non-idempotent write needs that check. The function returns nothing, and the batch id is Spark\'s micro-batch counter, not a Kafka offset.'),
    ],
    checkpoint: [
      mcq('A streaming aggregation with outputMode("append") fails to start with "Append output mode not supported when there are streaming aggregations ... without watermark". What is the fix?', [
        ['Add withWatermark on the event-time column before the aggregation', true],
        ['Set a checkpointLocation so that state can be saved between runs', false],
        ['Use trigger(availableNow=True) so the query runs as a batch once', false],
        ['Replace the window with a groupBy on processing time instead', false],
      ], 'Without a watermark no window is ever final, so append mode has nothing it can safely emit. A checkpoint location is needed anyway but does not fix this, availableNow does not change the rule, and grouping by processing time would answer the wrong business question.'),
      mcq('A team deletes a streaming job\'s checkpoint folder to clear an error and restarts it. What is the most likely result?', [
        ['It restarts from startingOffsets, losing its state and reprocessing or skipping data', true],
        ['It resumes from the last processed offsets, which Spark also stores in the driver', false],
        ['It resumes normally, because the Kafka consumer group still has the committed offsets', false],
        ['It refuses to start until the original checkpoint folder has been restored from backup', false],
      ], 'The checkpoint is where Spark keeps source offsets and state; without it the query is new, starting at startingOffsets (earliest or latest) with empty windows. Spark does not rely on consumer-group commits, the driver keeps nothing durable, and a missing folder is simply created afresh.'),
      mcq('A live dashboard table is fed by outputMode("update"). What must the sink do with each micro-batch?', [
        ['Upsert by window and key, since a window can be emitted several times', true],
        ['Append every row, since update mode emits each window exactly once', false],
        ['Truncate the table and insert, since update mode sends the full result', false],
        ['Ignore rows for closed windows, since they are emitted after the end', false],
      ], 'Update mode sends a window again every time its aggregate changes, so the sink must replace the old row. Exactly-once emission is append mode, the full result each time is complete mode, and closed windows are not re-emitted.'),
    ],
  },

  /* ── MANAGED_STREAMING ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_STREAMING_MANAGED_STREAMING',
    notes: `Running Kafka yourself means patching brokers, replacing failed disks, rebalancing partitions across machines and
being paged when a broker dies. Most teams with a small platform team buy that work from the cloud provider. The
ideas from KAFKA_BASICS carry over; the names change.

    idea              Kafka             Kinesis Data Streams        Azure Event Hubs
    stream            topic             stream                      event hub (inside a namespace)
    unit of order     partition         shard                       partition
    ordering key      key               partition key               partition key
    position          offset            sequence number             offset / sequence number
    reader group      consumer group    KCL application name        consumer group
    progress store    __consumer_offsets  DynamoDB lease table (KCL)  Blob Storage checkpoints
    capacity          brokers           shards, or on-demand        throughput / processing units

## Amazon Kinesis Data Streams

A stream has shards. Each shard owns a range of a 128-bit hash space; the partition key's MD5 hash decides the
shard. Run against moto (a local mock of AWS) with 2 shards:

    k = boto3.client("kinesis", region_name="ap-south-1")
    k.create_stream(StreamName="rider-locations", ShardCount=2)
    resp = k.put_records(StreamName="rider-locations",
                         Records=[{"Data": json.dumps(p).encode(), "PartitionKey": p["rider_id"]}
                                  for p in pings])

    shardId-000000000000  hash keys 0.000e+00 .. 1.701e+38
    shardId-000000000001  hash keys 1.701e+38 .. 3.403e+38
    rider-0 md5 as integer = 2.961e+38 -> shardId-000000000001
    rider-1 md5 as integer = 1.197e+38 -> shardId-000000000000
    FailedRecordCount: 0

Reading a shard from the start with a shard iterator, the pings came back per rider in order:

    it = k.get_shard_iterator(StreamName="rider-locations", ShardId=sid,
                              ShardIteratorType="TRIM_HORIZON")["ShardIterator"]
    out = k.get_records(ShardIterator=it, Limit=100)
    shardId-000000000000 [('rider-1', 1), ('rider-3', 3), ('rider-1', 5), ('rider-3', 7)]

To resume after a crash, store the last sequence number processed per shard and ask for
ShardIteratorType="AFTER_SEQUENCE_NUMBER": the lab got [2, 4, 6] after the first record. Nobody writes that by hand
in production. The **Kinesis Client Library (KCL)** assigns shards to workers and stores checkpoints in a DynamoDB
lease table; Lambda, Spark (via a connector), Flink and Firehose all consume Kinesis for you.

What to know:

- **Capacity.** In provisioned mode each shard has a fixed write and read throughput, and you split or merge
  shards to scale. On-demand mode scales shards for you and charges for data in and out rather than per shard.
  Exceeding a shard's limit returns ProvisionedThroughputExceededException.
- **put_records can partly fail.** The call succeeds but FailedRecordCount says how many records were rejected;
  each failed entry has an ErrorCode. Retry only those, with backoff. Code that ignores FailedRecordCount loses data
  silently (DEBUGGING).
- **Retention** is 24 hours by default and can be extended (at extra cost) up to a year. Readers sharing a shard
  share its read throughput; **enhanced fan-out** gives each registered consumer its own.
- **Pricing model**: per shard-hour plus per PUT unit in provisioned mode; per GB in and out in on-demand mode;
  extras for extended retention and enhanced fan-out. Check the pricing page, and set a budget alarm first.

**Amazon Data Firehose** (formerly Kinesis Data Firehose) is the no-code delivery service: it buffers records by
size or time and writes them to S3, Redshift or OpenSearch, optionally converting JSON to Parquet. For "land every
event in the lake every few minutes", Firehose is often all you need.

## Amazon MSK

MSK runs Apache Kafka for you: AWS provisions brokers, replaces failed ones and patches them. You still design
topics, partitions, keys and retention, and write normal Kafka clients; your confluent-kafka code from KAFKA_BASICS
works unchanged except for authentication (TLS, SASL/SCRAM or IAM). **MSK Serverless** removes broker sizing
entirely. **MSK Connect** runs Kafka Connect connectors such as Debezium. Choose MSK over Kinesis when you already
use Kafka, need Kafka's ecosystem (Connect, Kafka Streams, compaction), or want to stay portable across clouds;
choose Kinesis for a small team that wants the least to operate on AWS.

## Azure Event Hubs

A **namespace** holds **event hubs** (topics), each with partitions and consumer groups. Producers send batches;
consumers checkpoint to Blob Storage. Checked against the azure-eventhub SDK's signatures (no Azure account used):

    producer = EventHubProducerClient.from_connection_string(CONN)
    with producer:
        batch = producer.create_batch(partition_key="ord-1001")   # same key -> same partition
        batch.add(EventData(json.dumps(event)))
        producer.send_batch(batch)

    def on_event(partition_context, event):
        handle(event.body_as_str())
        partition_context.update_checkpoint(event)                # after processing
    consumer = EventHubConsumerClient.from_connection_string(
        CONN, consumer_group="$Default", checkpoint_store=BlobCheckpointStore.from_connection_string(...))
    consumer.receive(on_event=on_event, starting_position="-1")   # "-1": from the start

Event Hubs (Standard tier and above) also exposes a **Kafka endpoint**: existing Kafka clients connect on port 9093
with SASL_SSL and the namespace connection string, without code changes. **Capture** writes every event to Blob
Storage or ADLS on a time or size window, Firehose's counterpart. Capacity is bought in throughput units
(Standard) or processing units (Premium); store connection strings in Key Vault, or better, use Entra ID.

## Change data capture with Debezium

DE1's "Database Extracts" pulled changed rows with a watermark query and noted that it misses hard deletes. CDC
reads the database's own change log instead (PostgreSQL's WAL through a logical replication slot, MySQL's binlog)
and emits every insert, update and delete as an event. **Debezium** is the open-source standard; it runs as Kafka
Connect connectors (self-managed, MSK Connect, or Debezium Server for Kinesis and Event Hubs). A PostgreSQL
connector, in outline (from the Debezium documentation):

    {"name": "thaligo-orders-cdc",
     "config": {"connector.class": "io.debezium.connector.postgresql.PostgresConnector",
                "database.hostname": "orders-db.internal", "database.port": "5432",
                "database.user": "debezium", "database.dbname": "orders",
                "topic.prefix": "thaligo", "table.include.list": "public.orders",
                "plugin.name": "pgoutput", "slot.name": "debezium_orders"}}

Changes to public.orders go to the topic thaligo.public.orders. Each event's value has before, after, source
(with the log position, lsn for Postgres) and op: c (insert), u (update), d (delete), r (row read during the
initial snapshot). On Postgres, before is null for updates unless the table has REPLICA IDENTITY FULL. A delete is
followed by a tombstone (null value) so a compacted topic can forget the key.

Applying those events to a lake table must be idempotent and must ignore stale events. The lab applied six events,
including one redelivered update and one older update arriving late, with an upsert guarded by the log position
(WHERE excluded.lsn > orders.lsn) and a soft delete:

    [(1, 'DELIVERED', 450, 120, 0), (2, 'PLACED', 300, 130, 1)]

Order 1 stayed DELIVERED despite the late PICKED_UP (lsn 115 < 120), and order 2 is marked deleted. Operating CDC
means watching the replication slot: if the connector stops, Postgres keeps WAL for the slot and the database disk
fills. Alert on slot lag. AWS DMS is the managed alternative on AWS.

## What managed services take off your hands, and what they do not

They take: servers, disks, patching, broker failover, scaling (fully, in on-demand and serverless modes). They do
not take: choosing keys and partition counts, delivery guarantees, idempotent sinks, schema changes, consumer lag
monitoring, or cost control. Everything in DELIVERY_SEMANTICS still applies on Kinesis and Event Hubs.`,
    workedExample: `**Scenario.** ThaliGo is moving its rider-ping pipeline to AWS. A team of three data engineers, no Kafka
experience. Requirements: about 10,000 pings a second at dinner peak and a tenth of that at 4 a.m.; per-rider order
for the ETA service; every ping in S3 as Parquet within 10 minutes; replay of the last 3 days after a bug. Choose
the services and configure them.

**1. Broker: Kinesis Data Streams, on-demand.** Three engineers new to Kafka should not run brokers, and even MSK
needs Kafka knowledge (partitions, rebalances, client tuning). Load swings tenfold between night and dinner;
on-demand mode scales shards without anyone splitting them, and is billed by data volume. If load becomes steady
and large, provisioned mode may cost less; revisit with a month of numbers.

**2. Partition key: rider_id.** Same reasoning as on Kafka: per-rider order is needed, and 40,000 riders hash
evenly across shards. Not zone_id (hot zones at lunch).

**3. Retention: extend to 3 days** for replay. The default 24 hours would not cover a bug noticed on Monday that
started on Saturday. Extended retention costs extra, so do not set a year "to be safe".

**4. Lake landing: Amazon Data Firehose** reading the stream, buffering by size or time (well within 10 minutes),
converting JSON to Parquet with a Glue table schema, and writing to s3://thaligo-lake/raw/rider_pings/ partitioned
by date and hour. No code to run or monitor beyond Firehose's own delivery metrics.

**5. ETA consumer.** A KCL application (or a Lambda with the stream as event source for simpler logic); the KCL
stores shard checkpoints in DynamoDB. The service must tolerate replays, since checkpoints are periodic: it updates
each rider's latest position only if the ping's sequence or event time is newer than the stored one.

**6. Producers.** The ping API calls put_records in batches and retries only the entries listed as failed, with
backoff. A CloudWatch alarm on throttled writes and on the consumer's iterator age (how far behind it is: the
Kinesis version of lag).

**7. The Azure answer, in one line.** Event Hubs with Capture to ADLS, partition key rider_id, consumers
checkpointing to Blob Storage.

**Result.** Kinesis on-demand + Firehose + KCL: nothing for the team to patch, with ordering, replay and the lake
landing covered. The guarantees are still the team's job: idempotent consumer, partial-failure retries, lag alarms.`,
    mcqs: [
      mcq('A producer calls Kinesis put_records with 500 pings. The call returns HTTP 200 with FailedRecordCount = 37. What should the code do?', [
        ['Retry just the 37 records with an ErrorCode, after a backoff', true],
        ['Nothing, since HTTP 200 means Kinesis stored all 500 pings', false],
        ['Resend all 500 records at once, so none of them is missing', false],
        ['Split the stream into more shards before sending anything', false],
      ], 'put_records is not all-or-nothing: the response marks each failed entry, and only those need resending, after backing off from the throttling. Treating 200 as success loses 37 pings, resending everything duplicates 463, and resharding may help later but does not deliver these records.'),
      mcq('ThaliGo already runs Kafka Connect and Kafka Streams jobs on its own servers. Which AWS service lets it keep that code while handing off broker operations?', [
        ['Amazon MSK, with MSK Connect for the connectors', true],
        ['Kinesis Data Streams in its on-demand capacity mode', false],
        ['Amazon Data Firehose writing straight into Amazon S3', false],
        ['Amazon SQS FIFO queues with content-based deduplication', false],
      ], 'MSK is managed Apache Kafka, so Kafka clients, Connect and Streams keep working. Kinesis and Firehose have different APIs, and SQS is a queue that deletes messages once processed, with no partitions or replay.'),
      mcq('A Debezium update event for public.orders arrives with "before": null. What is the most likely reason?', [
        ['The table lacks REPLICA IDENTITY FULL, so Postgres logs only the new row', true],
        ['The row was inserted in this event, so it has no earlier version to show', false],
        ['The connector is still in its snapshot phase, where updates lack before', false],
        ['The event is a tombstone that marks a deleted key for topic compaction', false],
      ], 'With the default replica identity, PostgreSQL does not write the old row image to the WAL, so Debezium cannot fill before for updates. An insert would have op c, snapshot rows have op r, and a tombstone has a null value altogether, not a null before.'),
    ],
    checkpoint: [
      mcq('In Kinesis Data Streams, what decides which shard a record is written to?', [
        ['The MD5 hash of its partition key, matched to the shard hash-key ranges', true],
        ['Round-robin across the shards, so every shard receives the same number of records', false],
        ['The record\'s timestamp, so each shard covers a slice of event time', false],
        ['The sequence number Kinesis assigns, taken modulo the shard count', false],
      ], 'Each shard owns a range of the 128-bit hash space and the key\'s MD5 falls in exactly one (the lab showed rider-0 at 2.961e+38 going to shard 1). Kinesis does not round-robin or split by time, and sequence numbers are assigned after the shard is chosen.'),
      mcq('A Debezium connector on the orders database is stopped for a week while the team investigates a bug. What risk grows meanwhile?', [
        ['The replication slot keeps WAL on the database server, which can fill its disk', true],
        ['Kafka deletes the whole topic after seven days, so the connector must take a new snapshot', false],
        ['Debezium forgets the tables it captures and must be reconfigured from scratch', false],
      ], 'A logical replication slot makes Postgres retain WAL until the consumer confirms it, so a stopped connector lets WAL pile up on the primary. Topic retention deletes old records, not the topic, and the connector keeps its configuration and offsets.'),
      mcq('What does a managed streaming service such as Kinesis or Event Hubs NOT take off a data engineer\'s hands?', [
        ['Making consumers idempotent so a replay does not double-count', true],
        ['Replacing failed broker machines and their attached disks', false],
        ['Patching the broker software with security updates', false],
        ['Replicating stored events across availability zones', false],
      ], 'Servers, disks, patching and replication are exactly what the provider runs. Delivery semantics live in your code: checkpoints are periodic, so replays happen, and only an idempotent consumer makes them harmless.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_STREAMING_DEBUGGING',
    notes: `Six things that go wrong in ThaliGo's streaming code. For each: the symptom, the cause, and the one change that
fixes it. Messages marked "lab" were produced on this course's machine (confluent-kafka 2.16, PySpark 3.5.9, moto);
the others are written from the documentation, because no broker or cloud account was used.

## 1. The events that never left the script

**Symptom.** A backfill script reads 20,000 old orders from Postgres and calls producer.produce() for each. It
prints "done" and exits in two seconds. The topic has 14,000 new records, not 20,000. No error anywhere.

**Cause.** produce() only places the record in the client's local queue; a background thread sends it. The script
exited with records still queued, and they were thrown away. In the lab, with no broker reachable, flush(2)
returned 1: one record still unsent after the timeout.

**Fix.** Call producer.flush(timeout) before exiting and check its return value (records still undelivered), and
register on_delivery to log each failure:

    remaining = producer.flush(30)
    if remaining:
        raise RuntimeError(f"{remaining} records not delivered")

In a long-running producer, call poll(0) regularly so delivery callbacks run and the queue does not fill up
(BufferError: Local: Queue full).

## 2. A configuration that silently did nothing, or loudly failed

**Symptom.** A consumer written with kafka-python settings pasted into confluent-kafka will not start (lab):

    KafkaError{code=_INVALID_ARG,val=-186,str="No such configuration property: "bootstrap.server""}

**Cause.** confluent-kafka takes librdkafka's dotted property names (bootstrap.servers, group.id,
enable.auto.commit); kafka-python takes Python keyword arguments (bootstrap_servers, group_id). And
this one also dropped the final s of bootstrap.servers. librdkafka rejects unknown names at construction, which is
a gift: kafka-python likewise refused an argument it did not know (KafkaConfigurationError: Unrecognized configs,
lab).

**Fix.** Copy property names from the client's own documentation, and build the client in a unit test so a typo
fails in CI rather than in production. The related lab error, "acks must be set to all when enable.idempotence is
true", is the same kind of protection.

## 3. Rider pings out of order

**Symptom.** The ETA model sees riders jump backwards on the map. Pings for rider-77 arrive in the order 4, 2, 5, 3.

**Cause.** The producer sends with key=None. Keyless records are spread over partitions, and consumers read
partitions in parallel, so one rider's pings land on several partitions and interleave arbitrarily.

**Fix.** Produce with key=rider_id. The same key always maps to the same partition (rider-77 -> 3 in the lab, every
time), and order within a partition is guaranteed. If a key's order must survive retries too, keep idempotence on:
it is what keeps retried batches in sequence.

## 4. The consumer group that never stops rebalancing

**Symptom.** Lag on payments.events.v1 keeps rising. Consumer logs show the members repeatedly leaving and
rejoining; the same records are processed again and again. librdkafka logs a message that the application's
maximum poll interval (300000 ms) was exceeded and that it is leaving the group.

**Cause.** Each loop fetches 500 records and writes them to the warehouse one row at a time, which takes over five
minutes during the sale. A consumer that does not poll within max.poll.interval.ms is considered stuck and is
removed; its partitions are reassigned, its uncommitted records reread, and the new owner hits the same wall.

**Fix.** Make each loop finish well inside the interval: smaller batches (num_messages=100), and a bulk write
(COPY or a staged file plus MERGE) instead of row-by-row inserts. Raise max.poll.interval.ms only if the slow
work is genuinely necessary, since a higher value also delays detecting a truly stuck consumer.

## 5. Kinesis records that vanished on a busy night

**Symptom.** The lake has about 2% fewer rider pings than the app sent on sale night. No exceptions were logged.

**Cause.** The producer calls put_records and treats any successful call as success. Under throttling, Kinesis
accepts the call but rejects individual records: FailedRecordCount is non-zero, and those entries carry ErrorCode
ProvisionedThroughputExceededException. (The lab's moto run reported FailedRecordCount: 0; the field is always
there to check.)

**Fix.** After every put_records, collect the entries with an ErrorCode and retry only those with exponential
backoff; alarm on throttling; move to on-demand mode or add shards if throttling is routine.

## 6. Window counts that change when the job is slow

**Symptom.** The orders-per-5-minutes table shows a dip from 21:00 to 21:10 every day the cluster is busy, and a
spike right after. The nightly batch shows no dip.

**Cause.** The query groups by F.window(F.current_timestamp(), "5 minutes"): processing time. When the job falls
behind, events arrive at the job late and are counted in later windows. The BATCH_VS_STREAM simulation showed the
same shift: 498 instead of 545 for 12:00.

**Fix.** Window on the event's own time column with a watermark:

    orders.withWatermark("event_time", "15 minutes").groupBy(F.window("event_time", "5 minutes"), "zone")

and monitor numRowsDroppedByWatermark, so you know what the watermark throws away.`,
    mcqs: [
      mcq('A one-off Python script produces 20,000 events with confluent-kafka and exits; only 14,000 reach the topic, and no error is printed. What is the most likely cause?', [
        ['It exited without flush(), discarding records still queued', true],
        ['The topic has too few partitions to accept 20,000 records', false],
        ['The broker deduplicated 6,000 records having equal keys', false],
        ['The consumer group committed offsets before reading them', false],
      ], 'produce() is asynchronous; records sit in a local queue until sent, and exiting without flush() drops them. Partition count does not cap records, the broker never deduplicates by key, and consumer offsets cannot remove records from a topic.'),
      mcq('A consumer group keeps rebalancing and reprocessing the same records, and the log mentions the maximum poll interval being exceeded. What is the root cause?', [
        ['Processing one fetched batch takes longer than max.poll.interval.ms', true],
        ['The topic has more partitions than the group has consumers in it', false],
        ['Auto-commit is off, so the broker evicts members that do not commit', false],
        ['The producers send without keys, so batches arrive out of order', false],
      ], 'A member that does not call poll within the interval is treated as stuck and removed, triggering a rebalance; the slow batch is then reread by the next owner. More partitions than consumers is normal, manual commits do not cause eviction, and key choice affects order, not group membership.'),
      mcq('The lake holds 2% fewer events than producers sent to Kinesis on a sale night, with no exceptions logged. What should you check first in the producer?', [
        ['Whether it reads FailedRecordCount and retries the failed entries', true],
        ['Whether its partition keys are spread over enough distinct values', false],
        ['Whether its records are JSON rather than Avro, which is smaller', false],
        ['Whether it uses TRIM_HORIZON iterators instead of LATEST ones', false],
      ], 'put_records returns success even when some records were throttled; ignoring FailedRecordCount loses them silently. Key spread affects throttling but not whether the code retries, the format affects size not delivery, and iterators are a consumer setting.'),
      mcq('Orders-per-window numbers dip whenever the streaming job runs slowly, while the nightly batch shows no dip. Which line of the query is the likely culprit?', [
        ['F.window(F.current_timestamp(), "5 minutes")', true],
        ['withWatermark("event_time", "15 minutes")', false],
        ['outputMode("update") with a MERGE upsert', false],
        ['option("maxOffsetsPerTrigger", 200000)', false],
      ], 'Windowing on current_timestamp() groups by processing time, so slowness moves events into later windows. A watermark on event time drops only very late events, update mode with MERGE keeps one row per window, and maxOffsetsPerTrigger limits batch size without changing which window an event belongs to.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_STREAMING_PRACTICE',
    notes: `Nine exercises, easiest first. Do each on paper or in a scratch file before reading the answer. The numbers in
the answers were checked by running: the watermark exercise on PySpark 3.5.9, the retry function against a fake
client that throttles every third record, the CDC exercise in SQLite.

## Exercise 1 — Batch, micro-batch or streaming? (easy)

For each ThaliGo need, choose one and give the reason in a line: (a) a restaurant's weekly sales email; (b) blocking
a coupon code used from 20 accounts on one device in 10 minutes; (c) the sale-day war-room map of open orders per
zone; (d) the GST report for the quarter; (e) the "your order is 2 minutes away" notification.

**Answer.** (a) Batch: nobody acts within the week. (b) Streaming: the block must happen before the coupon is
redeemed. (c) Micro-batch, 30-60 s: people watching a map do not need per-event latency. (d) Batch: it must be
complete and reconciled. (e) Streaming: it is triggered by each GPS ping crossing a distance threshold.

## Exercise 2 — Choose the key (easy)

Choose the Kafka key for: (a) order status events; (b) a ledger of wallet credits and debits; (c) restaurant menu
updates on a compacted topic; (d) app click-stream events used only for hourly counts.

**Answer.** (a) order_id: an order's states must stay in sequence. (b) wallet_id (account): a balance depends on
the order of its debits and credits. (c) restaurant_id (or menu_item_id): compaction keeps the latest record per
key, which must be the entity. (d) No ordering need: session_id spreads well; null keys are also fine, but a key
helps if per-session analysis comes later. Never a low-cardinality field such as city.

## Exercise 3 — Consumer groups (easy)

orders.events.v1 has 12 partitions. Group A runs 4 consumers, group B runs 15. How many partitions does each
consumer in each group own, and does either group see fewer than all events?

**Answer.** A: 3 each. B: 12 consumers own 1 each, 3 are idle. Both groups see every event: groups are independent,
each with its own offsets. Adding consumers to B does nothing until partitions are added.

## Exercise 4 — Lag arithmetic (medium)

Producers write 2,000 events/s at dinner peak; the lake-loader group handles 1,500/s. (a) How fast does lag grow?
(b) After 30 minutes, what is the lag? (c) A fix raises consumption to 2,600/s while production stays at 2,000/s:
how long until lag is zero?

**Answer.** (a) 500/s. (b) 500 x 1,800 s = 900,000 events. (c) It drains at 600/s: 900,000 / 600 = 1,500 s =
25 minutes. If retention were shorter than the time behind, events would be deleted before being read: lag alarms
exist to prevent exactly that.

## Exercise 5 — Name the guarantee (medium)

What does each consumer loop give, and what happens if it crashes in the middle?

    # (a)                                  # (b)
    msgs = consumer.consume(500, 1.0)      msgs = consumer.consume(500, 1.0)
    consumer.commit(asynchronous=False)    write_rows(msgs)
    write_rows(msgs)                       consumer.commit(asynchronous=False)

**Answer.** (a) At-most-once: a crash during write_rows loses the rest of the batch, since the offsets have already
moved. (b) At-least-once: a crash after write_rows but before commit rereads the batch, so write_rows must be
idempotent (an upsert on the event id). (b) plus an idempotent write is the usual choice.

## Exercise 6 — Watermark trace (medium)

A query counts events in 10-minute tumbling windows with withWatermark("event_time", "5 minutes") and append mode.
Each line is one micro-batch: [10:02, 10:08], [10:14, 10:01], [10:07, 10:16], [10:27], [10:12]. Which events are
dropped, and when is each window written?

**Answer (checked on Spark).** Watermarks after each batch: 10:03, 10:09, 10:11, 10:22. 10:01 arrives at watermark
10:03 and 10:07 at 10:09; both are kept, because their window 10:00-10:10 has not ended. When the watermark passes
10:10 (after the third batch), 10:00-10:10 is written with 4 events (10:02, 10:08, 10:01, 10:07). After the fourth
batch the watermark is 10:22, so 10:10-10:20 is written with 2 (10:14, 10:16). 10:12 then arrives for a closed
window and is dropped (dropped=1). 10:20-10:30 (10:27) stays in state until the watermark passes 10:30.

## Exercise 7 — Idempotent sink SQL (medium)

Write the Postgres statement that stores a payment event so a redelivered event changes nothing, given columns
payment_id, merchant_id, amount_paise, event_time.

**Answer.**

    INSERT INTO payment_events (payment_id, merchant_id, amount_paise, event_time)
    VALUES (%s, %s, %s, %s)
    ON CONFLICT (payment_id) DO NOTHING;

with payment_id the primary key. Totals are then a SUM over payment_events, never an increment applied per message.

## Exercise 8 — Retry only what failed (harder)

Write put_all(client, stream, records) for Kinesis that retries only the failed entries of put_records, with
backoff, and raises if some still fail after 5 attempts.

**Answer.**

    def put_all(client, stream, records, max_attempts=5):
        pending = records
        for attempt in range(max_attempts):
            resp = client.put_records(StreamName=stream, Records=pending)
            if resp["FailedRecordCount"] == 0:
                return
            pending = [rec for rec, res in zip(pending, resp["Records"]) if "ErrorCode" in res]
            time.sleep(min(2 ** attempt * 0.1, 5) * random.uniform(0.5, 1.0))
        raise RuntimeError(f"{len(pending)} records still failing after {max_attempts} attempts")

Against a fake client that throttled every third record on the first call, 10 records were stored in 2 calls,
10 unique. The response's Records list is in the same order as the request, which is what makes the zip correct.

## Exercise 9 — Apply CDC events (harder)

A replica table receives Debezium events in this arrival order, each with its lsn: r order 1 PLACED (100); c order
2 PLACED (110); u order 1 DELIVERED (120); d order 2 (130); u order 1 DELIVERED (120) again; u order 1 PICKED_UP
(115). With an upsert that applies a change only if its lsn is newer, and soft deletes, what is the final table?

**Answer.** Order 1: DELIVERED, lsn 120 (the redelivery changes nothing, and PICKED_UP at 115 is older, so it is
ignored). Order 2: marked deleted at lsn 130. The SQLite run printed
[(1, 'DELIVERED', 450, 120, 0), (2, 'PLACED', 300, 130, 1)]. Without the lsn guard, order 1 would end as PICKED_UP:
wrong.`,
    mcqs: [
      mcq('Producers write 3,000 events/s and a consumer group handles 2,400/s for 20 minutes. What is the lag at the end, assuming it started at zero?', [
        ['720,000 events', true],
        ['600 events', false],
        ['48,000 events', false],
        ['3,600,000 events', false],
      ], 'Lag grows by the difference in rates, 600 events per second, for 1,200 seconds: 720,000. 600 is the per-second gap, 48,000 forgets to convert minutes to seconds, and 3,600,000 counts everything produced instead of what was left unread.'),
      mcq('A topic has 8 partitions. Group X has 3 consumers and group Y has 10. Which statement is true?', [
        ['Both groups read every event; Y has 2 idle members', true],
        ['Each group reads half the events, split by group id', false],
        ['Y reads events faster, since all 10 members get work', false],
        ['X misses some partitions until it has 8 consumers', false],
      ], 'Different groups are independent readers of the whole topic. Within Y only 8 members can own a partition, so 2 idle; X\'s 3 members share all 8 partitions (3, 3 and 2), so nothing is missed.'),
      mcq('With 10-minute windows and a 5-minute watermark delay, an event at 10:07 arrives when the watermark is 10:09. What does Spark do with it?', [
        ['Counts it, because the 10:00-10:10 window has not yet closed', true],
        ['Drops it, because its event time is older than the watermark', false],
        ['Counts it in the 10:10-10:20 window, the current one at arrival', false],
        ['Holds it until the watermark passes 10:10, then discards it', false],
      ], 'For a windowed aggregation the question is whether the event\'s window is still open; 10:00-10:10 ends after 10:09, so the event is counted (the lab run did exactly this). Being older than the watermark alone does not drop it, windows are assigned by event time, and Spark does not hold rows to discard later.'),
      mcq('A ledger topic must keep each wallet\'s credits and debits in order. Which key should its producer use?', [
        ['wallet_id', true],
        ['transaction_id', false],
        ['merchant_category', false],
        ['None (null key)', false],
      ], 'Order is per partition and a key always maps to one partition, so keying by wallet keeps that wallet\'s entries in sequence. A transaction id scatters one wallet across partitions, a category is low-cardinality and hot, and null keys give no per-wallet order at all.'),
      mcq('Why does the Kinesis retry helper zip the request records with resp["Records"]?', [
        ['The response lists results in the order of the request entries', true],
        ['The response returns only failed records, so zip filters them', false],
        ['Kinesis needs the original records sent back to acknowledge them', false],
      ], 'put_records returns one result per input record, in order, with ErrorCode on the failed ones; zipping pairs each record with its result. Successful entries are in the response too, and nothing has to be sent back to acknowledge anything.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_STREAMING_INTERVIEW_QUESTION',
    notes: `Four questions that come up in data engineer interviews at product companies, GCCs and fintechs, with an answer
that would score well and the follow-up a good interviewer asks next. Say them aloud; about two minutes each.

## Q1. "Explain Kafka partitions and consumer groups. How would you scale a slow consumer?"

**Model answer.** "A topic is split into partitions, each an ordered, append-only log. The producer picks a
partition by hashing the key, so all events for one key, say one order, land on one partition and stay in order.
There is no order across partitions. A consumer group shares the partitions: each partition goes to one member, so
the group's parallelism is capped at the partition count. To scale a slow consumer I first find where the time
goes. If the processing is slow, I batch the writes, since row-by-row inserts are the usual culprit. If it is
genuinely CPU-bound, I add members up to the partition count. Beyond that I increase partitions, knowing that it
remaps most keys, so per-key order breaks briefly; I would do it in a quiet period. I would also check for a hot key:
if one partition has most of the lag, more consumers will not help; a better key will."

**Follow-up.** "What happens when a consumer dies?" — "The group coordinator notices missed heartbeats or a missed
poll and rebalances: its partitions go to other members, which resume from the last committed offsets. Anything it
processed but had not committed is processed again, which is why the sink must be idempotent. Cooperative-sticky
assignment moves only that consumer's partitions instead of pausing everyone."

## Q2. "What do at-least-once and exactly-once mean? How do you get exactly-once into a warehouse?"

**Model answer.** "At-least-once means no event is lost but some may be processed twice; you get it by committing
offsets only after the result is durable. Exactly-once means each event affects the result once. Kafka can do that
Kafka-to-Kafka with idempotent producers and transactions, committing the output and the input offsets together.
For a warehouse, Kafka's transaction does not reach the warehouse, so I build it from three parts: a replayable
source, at-least-once delivery, and an idempotent write: MERGE or INSERT ON CONFLICT keyed on an event id created by
the producer. For aggregates I record applied batch ids in the same transaction. Then a replay changes nothing. I
prove it with a test that loads the same batch twice."

**Follow-up.** "Does enable.idempotence give you exactly-once?" — "Only for the producer's own retries: the broker
drops a retried batch it already has. It does not stop the application producing the same event twice, or a
consumer rereading after a crash."

## Q3. "What is a watermark, and how do you handle late data?"

**Model answer.** "Events carry an event time, but arrive late because of networks and offline phones. When
aggregating by event-time windows, the job must decide when a window is final. In Spark, withWatermark sets the
watermark to the maximum event time seen minus a delay; windows that end before it are finalised and their state
dropped, and events arriving for them are dropped too. Choosing the delay is a trade-off: longer catches more late
events but delays final results and holds more state. I would measure the real delay distribution, set the
watermark around the 99.9th percentile, monitor numRowsDroppedByWatermark, and let the nightly batch over the lake
recompute the day completely, so very late events still reach the reported numbers."

**Follow-up.** "Append or update mode for the dashboard?" — "Update mode with a MERGE in foreachBatch for the live
table, so the current window moves; append mode for a table of final windows that downstream jobs consume, since
each window appears there once."

## Q4. "Design a pipeline that lands app events in the lake within 5 minutes."

**Model answer.** "Producers write to Kafka or Kinesis, keyed by user or session id, with idempotence on. For pure
landing, a managed connector is enough: Firehose from Kinesis, an S3 sink connector on MSK Connect, or Event Hubs
Capture. They buffer by time and size and write Parquet to a date and hour partitioned path. If I need parsing,
deduplication or enrichment, a Spark Structured Streaming job with a one- to two-minute trigger, a checkpoint on S3,
and dropDuplicatesWithinWatermark on event_id, writing to a Delta or Iceberg table. Monitoring: consumer lag or
iterator age, files per partition, and a freshness check on the table. Small files from frequent writes get
compacted by a scheduled job."

**Follow-up.** "Why not just micro-batch every minute with a batch job?" — "Possible, but then I am rebuilding what
the streaming engine gives me: offset tracking, exactly-once file commits, recovery. availableNow triggers are a good
middle ground: the same streaming code run every few minutes by the orchestrator, stopping when it has caught up."`,
    mcqs: [
      mcq('An interviewer asks how you would cut lag on a consumer group that already has as many members as partitions. Which answer is strongest?', [
        ['Check for a hot key and slow writes first, then add partitions if needed', true],
        ['Add more consumers to the group, since each new member takes a share of the lag off the others', false],
        ['Turn on auto-commit so that offsets advance faster than processing', false],
        ['Raise the topic\'s retention so the backlog can never be deleted', false],
      ], 'At the partition limit, extra members idle; the real gains are fixing a skewed key or row-by-row writes, and only then repartitioning. Auto-commit only moves offsets (risking loss), and longer retention protects the backlog without shrinking it.'),
      mcq('Asked "how do you get exactly-once from Kafka into Snowflake?", which answer shows the right understanding?', [
        ['At-least-once delivery plus a MERGE keyed on a producer-created event id', true],
        ['Enable Kafka transactions, which extend their commit to the warehouse', false],
        ['Set enable.idempotence on the producer, which removes all duplicates', false],
        ['Use auto-commit with a short interval so that no event is ever replayed', false],
      ], 'Kafka\'s guarantees stop at Kafka, so the warehouse write must absorb replays with an idempotent MERGE. Transactions do not reach external systems, producer idempotence only covers its own retries, and auto-commit can both lose and replay.'),
      mcq('In an interview you propose a 2-minute watermark for delivery events. The interviewer says 1% of events arrive 10-30 minutes late. What is the best reply?', [
        ['Size the delay from the measured lateness and let a nightly batch fill the rest', true],
        ['Remove the watermark entirely, so that every late event is counted however late it is', false],
        ['Window on processing time instead, so that no event is ever counted as late', false],
      ], 'The delay should come from the real lateness distribution, with a batch recompute for the long tail. With no watermark, state grows without limit and append mode cannot emit, and processing-time windows count events in the wrong window.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_STREAMING_CHECKPOINT',
    notes: `Ten questions across the topic: batch versus streaming, Kafka, delivery guarantees, Spark Structured Streaming and
managed services. Answer without notes; the result shows which lesson to revisit.`,
    checkpoint: [
      mcq('ThaliGo\'s finance team wants daily GMV that matches the payment gateway\'s settlement file. Which processing fits?', [
        ['A nightly batch over the complete, settled day', true],
        ['A stream that updates GMV on every payment event', false],
        ['A micro-batch every 30 seconds, appending totals', false],
        ['Per-event streaming with a one-minute watermark', false],
      ], 'Settlements and reversals arrive after the day ends, so only a batch over the complete day matches the gateway. Faster pipelines give an earlier estimate, not the number of record, and an appended running total would also double-count.'),
      mcq('Rider pings are produced with key=None to a 12-partition topic. What does the ETA service observe?', [
        ['One rider\'s pings can arrive out of order', true],
        ['All pings arrive in one global time order', false],
        ['All pings go to partition 0 by default', false],
        ['The producer refuses records with no key', false],
      ], 'Keyless records are spread across partitions, and partitions are read in parallel, so a rider\'s pings interleave. Kafka has no global order, keyless records are not pinned to partition 0, and a null key is allowed.'),
      mcq('A topic has 6 partitions and its consumer group runs 8 consumers. How many consumers sit idle?', [
        ['2', true],
        ['0', false],
        ['6', false],
        ['8', false],
      ], 'Each partition is owned by one member of a group, so 6 members work and 2 wait as standbys. None would be idle only with 8 or more partitions; 6 and 8 confuse partitions with idle members.'),
      mcq('Which consumer sequence gives at-least-once delivery?', [
        ['Write the batch durably, then commit its offsets', true],
        ['Commit the batch offsets, then write the batch', false],
        ['Auto-commit on a timer while writing in a thread', false],
      ], 'Committing only after the write means a crash leads to a reread, never a gap. Committing first can skip records on a crash (at-most-once), and timer-based auto-commit can do either.'),
      mcq('With enable.idempotence=true, what does the broker do with a retried batch it has already written?', [
        ['Discards it, recognising its producer id and sequence number', true],
        ['Writes it again, and marks the second copy with a duplicate header', false],
        ['Rejects it and makes the producer raise a fatal exception', false],
        ['Accepts it only if the consumer has not yet read the first', false],
      ], 'The idempotent producer numbers batches per partition, and the broker silently drops one it has already appended. No duplicate copy is written, the retry is not an error to the application, and consumers play no part.'),
      mcq('A Spark query uses 5-minute windows and a 10-minute watermark. The maximum event time so far is 18:40. Which window can be finalised now?', [
        ['18:25-18:30, which ended before the 18:30 watermark', true],
        ['18:30-18:35, which ends at or after the watermark', false],
        ['18:35-18:40, which holds the most recent events', false],
        ['None, until the query is stopped and restarted', false],
      ], 'The watermark is 18:40 minus 10 minutes, 18:30, and windows ending at or before it are final: 18:25-18:30 and everything earlier. 18:30-18:35 and later are still open, and finalisation does not wait for a restart.'),
      mcq('Why must each Structured Streaming query have its own durable checkpoint location?', [
        ['It holds the query\'s offsets and state, so a restart resumes exactly', true],
        ['It stores the output rows, so the sink can be rebuilt after failure', false],
        ['It caches the Kafka records, so the topic can use short retention', false],
        ['It records the consumer group, so Kafka can show the job\'s lag', false],
      ], 'Offsets and state in the checkpoint are what let a query restart from where it stopped; sharing or losing it corrupts or resets progress. Output lives in the sink, records stay in Kafka, and Spark does not use consumer-group commits.'),
      mcq('A foreachBatch function MERGEs each micro-batch into a warehouse table. What guarantee does foreachBatch itself give?', [
        ['At-least-once: a batch may run again after a crash', true],
        ['Exactly-once: Spark never re-runs a batch function', false],
        ['At-most-once: a failed batch is skipped on restart', false],
      ], 'If the function ran but the batch was not recorded as committed, Spark re-runs it with the same batch id, so the write must be idempotent. Spark does not promise a single run, and it does not skip failed batches.'),
      mcq('A three-person team needs rider pings on AWS with per-rider order, a 3-day replay window and no brokers to manage. Which setup fits?', [
        ['Kinesis on-demand, key rider_id, retention extended to 3 days', true],
        ['Self-managed Kafka on EC2, key zone_id, retention left at 7 days', false],
        ['SQS standard queue, with message group ids set to the rider ids', false],
        ['Kinesis provisioned, 1 shard, key a random UUID for each ping', false],
      ], 'On-demand Kinesis removes shard management, rider_id keeps each rider in order, and extended retention covers replay. Self-managed Kafka means brokers to run (and zone keys are hot), SQS standard queues are not ordered and delete on processing, and random keys lose per-rider order.'),
      mcq('Debezium emits an update for order 1 with lsn 115 after the replica already holds lsn 120 for that order. What should the apply step do?', [
        ['Ignore it, since a change with an older lsn must not overwrite a newer one', true],
        ['Apply it, since the latest event to arrive always reflects the current row', false],
        ['Delete the row, since an out-of-order event means the row is corrupted', false],
        ['Stop the pipeline, since Debezium never delivers events out of sequence', false],
      ], 'The log position orders changes; guarding the upsert with "newer lsn only" keeps the replica correct under replays and reordering (the lab run kept DELIVERED). Arrival order is not change order, deleting loses data, and redelivery after restarts is normal, so stopping is wrong.'),
    ],
  },
];
