/**
 * Career-track content: Serverless on AWS (CL_SERVERLESS), Cloud & DevOps Engineer, batch CL2.
 *
 * What a cloud engineer builds when there are no servers to look after: Lambda functions and their limits, HTTP
 * APIs on API Gateway with authorisers and throttles, SQS and SNS for decoupling (visibility timeouts, dead-letter
 * queues, fan-out, idempotent consumers), EventBridge rules and Step Functions workflows, and a SAM template that
 * deploys, tests and observes the whole thing as one unit. It builds on Year 3's "Compute and Storage, Chosen",
 * "Building the Pipeline" and "Knowing Before a User Tells You" and on CL1's IAM, DynamoDB and networking lessons,
 * referred to by title rather than re-taught. Azure equivalents are named in a line; CL_AZURE teaches them.
 *
 * One fictional company runs through the topic: KiranaKart, a Hyderabad quick-commerce grocery start-up running
 * in AWS Mumbai (ap-south-1). Every boto3 output quoted in the notes is real output from boto3 1.43 against moto
 * 5.2 (mock AWS); the Lambda handlers were run locally in Python with hand-built events, the pytest suite for the
 * SQS consumer was run against moto, the SAM template was parsed with a YAML loader that accepts CloudFormation
 * tags, and the Step Functions definition was registered with moto and checked for dangling state names. Lambda
 * invocation inside AWS, Step Functions executions, sam build/deploy/local and all AWS CLI commands were written
 * from the documentation and NOT run; the notes say so. No prices: the notes describe the pricing model only.
 *
 * Skill: CLOUD_COMPUTE (the topic's only skill), so no checkpoint question needs ck().
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_CL_SERVERLESS_BUNDLES: PilotBundle[] = [
  /* ── LAMBDA_BASICS ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_SERVERLESS_LAMBDA_BASICS',
    notes: `In Year 3's "Compute and Storage, Chosen" serverless was one line: give the cloud a function, it runs on
demand, you pay for use. KiranaKart, a Hyderabad grocery start-up promising delivery in fifteen minutes, now wants
its order checks, invoice PDFs and nightly reports to run that way in AWS Mumbai (ap-south-1). This lesson is what
a Lambda function really is, how it is triggered, which limits bite, and when it is the wrong tool.

## The execution model

A **function** is your code plus configuration (runtime, handler, memory, timeout, environment variables) plus an
**execution role** — the IAM role the code runs as (CL1's "Roles, Temporary Credentials and IAM Identity Center").
When a request arrives and no idle **execution environment** exists, Lambda creates one (a small microVM), loads
your code and runs everything at module level: the **init phase**. Then it calls your handler: the **invoke phase**.
After the response the environment is kept warm for a while and reused for the next request, so module-level work
is paid once. Two rules follow:

- One environment handles **one request at a time**. Twenty simultaneous requests need twenty environments.
- **Concurrency ≈ requests per second × average duration in seconds.** 400 requests/s at 0.25 s needs about 100
  concurrent environments; the same traffic at 2 s needs 800.

## A Python handler

    import json, logging, os
    logger = logging.getLogger()
    logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))
    PINCODES = {"500032", "500081", "500084"}     # module level: loaded once per environment

    def handler(event, context):
        failures = []
        for record in event["Records"]:
            try:
                order = json.loads(record["body"])
                if order["pincode"] not in PINCODES:
                    raise ValueError(f"pincode {order['pincode']} not served")
                logger.info(json.dumps({"order_id": order["order_id"], "result": "valid"}))
            except (KeyError, ValueError, json.JSONDecodeError) as e:
                logger.warning(json.dumps({"message_id": record["messageId"], "error": str(e)}))
                failures.append({"itemIdentifier": record["messageId"]})
        return {"batchItemFailures": failures}

The handler name is file.function (app.handler). **event** is a dict whose shape depends on the trigger; **context**
carries the request id, the function name and get_remaining_time_in_millis(). Run locally with a hand-built SQS
event of three records, it printed:

    INFO {"order_id": "KK-1001", "result": "valid"}
    WARNING {"message_id": "m-2", "error": "pincode 110001 not served"}
    WARNING {"message_id": "m-3", "error": "Expecting value: line 1 column 1 (char 0)"}
    {'batchItemFailures': [{'itemIdentifier': 'm-2'}, {'itemIdentifier': 'm-3'}]}

Testing a handler is calling a function with a dict. Keep business logic in plain functions the handler calls.

## Three ways a function is invoked

    Style               Who calls                         On error
    Synchronous         API Gateway, function URL, SDK    the caller gets the error and decides
    Asynchronous        S3, SNS, EventBridge              Lambda retries (twice by default), then a
                                                          failure destination or DLQ if configured
    Event source        SQS, Kinesis, DynamoDB Streams    Lambda polls and sends batches; a failed
    mapping (polling)                                     batch returns to the queue or stream

Knowing which style you are in tells you who retries and where a failed event ends up — the first question in
every serverless incident.

## Creating a function from Python

Against moto (mock AWS), so the ARNs are fake but the parameters are the real API:

    lam.create_function(
        FunctionName="order-validator", Runtime="python3.12", Role=role_arn,
        Handler="app.handler", Code={"ZipFile": zip_bytes},
        Timeout=10, MemorySize=256, Architectures=["arm64"],
        Environment={"Variables": {"ORDERS_TABLE": "orders", "LOG_LEVEL": "INFO"}})
    lam.create_event_source_mapping(EventSourceArn=queue_arn, FunctionName="order-validator",
        BatchSize=10, FunctionResponseTypes=["ReportBatchItemFailures"])

    Timeout        10
    MemorySize     256
    Architectures  ['arm64']
    State          Active
    mapping: Enabled 10 ['ReportBatchItemFailures']

The role's trust policy names lambda.amazonaws.com; AWSLambdaBasicExecutionRole lets it write CloudWatch Logs.
Who may *invoke* the function is separate: a **resource-based policy** (lam.add_permission with Principal
s3.amazonaws.com and a SourceArn) lets S3 call it. Execution role = what the function can do; resource policy =
who can call it.

## The limits that matter

- **Timeout** up to 900 seconds (15 minutes); the default is 3 seconds, which surprises everyone once.
- **Memory** 128 MB to 10,240 MB, and **CPU scales with memory**: a slow CPU-bound function often gets faster and
  no more expensive at a higher setting. Measure, do not guess.
- **/tmp** is 512 MB by default, configurable up to 10 GB, and lives only as long as the environment.
- **Package**: 50 MB zipped for direct upload, 250 MB unzipped including layers; container images up to 10 GB.
- **Concurrency**: a regional quota per account (commonly 1,000; new accounts can start lower — check Service
  Quotas). Past it, invocations are throttled (TooManyRequestsException). **Reserved concurrency** caps one
  function and guarantees it that share; **provisioned concurrency** keeps environments initialised in advance.

## Cold starts

A cold start is the init phase a user waits through. Big packages, heavy imports (pandas for a ten-line check) and
work done before it is needed make it worse. Do: keep the package lean, create SDK clients at module level so warm
requests reuse them, and use arm64 where your libraries allow. For latency-critical paths, provisioned
concurrency or SnapStart (available for recent Python runtimes) remove most of it. For an SQS consumer or a nightly
report nobody notices a cold start, so do not pay to remove it there.

## Layers

A **layer** is a zip of libraries or shared code mounted under /opt; a function can use up to five. Useful for a
shared internal library. For heavy dependencies (ML models, PDF engines) a container image is often simpler.

## What Lambda is bad at

- Work longer than 15 minutes: use Step Functions to split it, or ECS/Fargate (CL_KUBERNETES).
- Steady, high, predictable load: at some volume a container fleet costs less — model both in the calculator.
- Thousands of short-lived database connections: put RDS Proxy in front, or use DynamoDB.
- Long-lived connections, local state, GPUs: not what Lambda is for.

## Cost and Azure

You pay per request and per **GB-second** (memory × duration), plus data transfer; a monthly free allowance
exists — read the Lambda pricing page and use the calculator, with a budget alarm set first. A 256 MB function
running 200 ms uses 0.25 × 0.2 = 0.05 GB-seconds per call. Azure Functions is the equivalent (CL_AZURE).`,
    workedExample: `**Scenario.** KiranaKart's sale opens at 7 p.m. Order validation takes 200 ms normally; at the
opening peak the team expects 600 orders per second. Last sale, the PostgreSQL behind it slowed and validation took
2 seconds. Size the function and protect everything else in the account.

**1. Normal peak.** 600 × 0.2 = 120 concurrent environments. Comfortable under a 1,000 regional quota.

**2. Slow-database peak.** 600 × 2 = 1,200. That exceeds the regional quota, so not only the validator is
throttled — every function in the account and region competes for the same pool, including payments.

**3. Cap the validator.** Reserved concurrency of 200 guarantees it 200 and stops it taking more. At 2 s per call it
can now finish only 100 orders per second; the rest are throttled — better than taking payments down, but orders
are rejected.

**4. Buffer instead of reject.** Put an SQS queue between the API and the validator (next lessons). The API accepts
the order into the queue in milliseconds; the event source mapping's maximum concurrency (say 50) drains it at the
speed the database can bear. A sale-day spike becomes a queue that empties over a few minutes.

**5. Check the numbers you can.** Memory: CPU-bound validation timed at 128, 256 and 512 MB, picking the cheapest
GB-seconds. Timeout: 10 s (five times the slow case), not 900. Cold starts: irrelevant behind a queue.

**6. Alarms.** Throttles, Errors, Duration p99 and ConcurrentExecutions on the function; the queue's oldest-message
age once it exists.

**Result.** Concurrency was computed, not hoped for; one function can no longer starve the account; and the spike
is absorbed by a queue rather than by customers.`,
    mcqs: [
      mcq('KiranaKart\'s validator handles 300 requests per second and each call takes about 0.5 seconds. Roughly how many concurrent execution environments does it need?', [
        ['About 150, because concurrency is rate times duration', true],
        ['About 300, one environment for every request per second', false],
        ['About 600, because every request needs two environments', false],
        ['Exactly one, since a warm environment serves all requests', false],
      ], 'Each environment serves one request at a time, so concurrency is about 300 × 0.5 = 150. Counting one per request per second ignores duration, nothing needs two environments, and a single warm environment cannot run parallel requests.'),
      mcq('A function creates its boto3 DynamoDB client inside the handler on every call. What does moving it to module level change?', [
        ['Warm invocations reuse the client created during the init phase', true],
        ['The client is then shared by every environment of the function', false],
        ['Lambda no longer charges for the time spent creating the client', false],
        ['The execution role is no longer needed for calls to DynamoDB', false],
      ], 'Module-level code runs once per environment in the init phase, so later invocations in the same environment reuse the client. Environments do not share memory, init time is not free, and the client still signs requests with the execution role.'),
      mcq('An S3 upload should trigger a thumbnail function, but S3 gets AccessDenied when it tries to invoke it. What is missing?', [
        ['A resource-based policy on the function allowing s3.amazonaws.com', true],
        ['An s3:GetObject permission in the function\'s own execution role', false],
        ['A larger memory setting so the function can accept the S3 event', false],
        ['Reserved concurrency, which Lambda requires for any S3 trigger', false],
      ], 'Who may invoke a function is controlled by its resource-based policy (add_permission with the S3 principal and source ARN). The execution role controls what the function itself can do once running, memory has nothing to do with permission, and reserved concurrency is optional.'),
    ],
    checkpoint: [
      mcq('A PDF report job takes 25 minutes on a large month. Why is a single Lambda function the wrong home for it?', [
        ['Lambda stops any invocation at 15 minutes, its maximum timeout', true],
        ['Lambda cannot write files larger than a few kilobytes to /tmp', false],
        ['Lambda functions are only allowed to run between 6 a.m. and midnight', false],
        ['Lambda bills a fixed full hour for any run longer than ten minutes', false],
      ], 'The maximum timeout is 900 seconds, so the job must be split (Step Functions) or run on containers. /tmp holds 512 MB by default and up to 10 GB, there is no time-of-day rule, and billing is per GB-second, not per hour.'),
      mcq('Which invocation style describes an SQS queue triggering a Lambda function?', [
        ['An event source mapping in which Lambda polls the queue for batches', true],
        ['Asynchronous: SQS pushes each message to Lambda and forgets about it', false],
        ['Synchronous: SQS waits for the response before accepting new messages', false],
        ['Scheduled: Lambda reads the queue once every minute on a fixed timer', false],
      ], 'For SQS, Lambda runs pollers that fetch batches and invoke the function; failed messages return to the queue. SQS never pushes to Lambda, it does not wait for responses before accepting sends, and polling is continuous, not a one-minute schedule.'),
      mcq('One noisy function used the whole regional concurrency during a sale and the payment function was throttled. What prevents this?', [
        ['Reserved concurrency to cap the noisy function and protect payments', true],
        ['Raising both functions\' memory so each request completes faster', false],
        ['Moving the payment function to arm64 so that it draws from a separate pool', false],
        ['A layer shared by both functions so they reuse environments', false],
      ], 'Reserved concurrency caps a function and guarantees that share to it, so one function cannot starve the rest. More memory may shorten calls but does not cap them, architecture does not create a separate concurrency pool, and layers are code packaging only.'),
    ],
  },

  /* ── API_GATEWAY ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_SERVERLESS_API_GATEWAY',
    notes: `KiranaKart's mobile app needs to place orders and read their status. In Year 3 you built such an API in a web
framework behind a server. Here the front door is **Amazon API Gateway**: it terminates HTTPS, routes requests,
checks who is calling, throttles them, and invokes a Lambda function for each request.

## Three kinds of API, and two lighter options

    Need                                     Choose
    A JSON API for a web or mobile app       HTTP API: simpler, lower latency, cheaper per request,
                                             native JWT authorisers, built-in CORS
    API keys and usage plans per client,     REST API: the older, richer product — request validation,
    request validation, caching, WAF,        response caching, AWS WAF, private APIs, usage plans
    private endpoints
    Chat, live order tracking                WebSocket API: long-lived connections, routes by message

Two other doors: a **Lambda function URL** (an HTTPS endpoint on one function, with IAM or no auth — fine for a
webhook or an internal tool) and an **Application Load Balancer** with Lambda targets (CL1's "Load Balancers and
CloudFront"). For a new public app API, start with an HTTP API and move to REST only for a feature you need.
Azure's equivalent is Azure API Management in front of Azure Functions.

## Routes and integrations

A **route** is a method and a path: POST /orders, GET /orders/{orderId}. Each route points to an **integration**,
here a Lambda proxy integration (AWS_PROXY) that passes the whole request to the function as the event. Built
against moto:

    api = gw.create_api(Name="kiranakart-orders", ProtocolType="HTTP", CorsConfiguration={
        "AllowOrigins": ["https://app.kiranakart.example"], "AllowMethods": ["GET", "POST"],
        "AllowHeaders": ["authorization", "content-type"], "MaxAge": 600})
    integ = gw.create_integration(ApiId=api["ApiId"], IntegrationType="AWS_PROXY",
        IntegrationUri=fn_arn, PayloadFormatVersion="2.0")
    gw.create_route(ApiId=api["ApiId"], RouteKey="POST /orders",
        Target=f"integrations/{integ['IntegrationId']}", AuthorizationType="JWT", AuthorizerId=auth_id)

    api: bvkaldmp HTTP https://bvkaldmp.execute-api.ap-south-1.amazonaws.com
    route: POST /orders JWT
    route: GET /orders/{orderId} JWT

API Gateway also needs permission to invoke the function — a resource-based policy on it with principal
apigateway.amazonaws.com (SAM adds it for you; by hand you add it, as in the Lambda lesson).

## The handler side

With payload format 2.0 the event carries routeKey, rawPath, headers, body (a string) and requestContext, including
the verified JWT claims. The function returns statusCode, headers and a string body:

    def handler(event, context):
        claims = event["requestContext"]["authorizer"]["jwt"]["claims"]
        try:
            body = json.loads(event.get("body") or "{}")
        except json.JSONDecodeError:
            return respond(400, {"error": "body is not JSON"})
        items = body.get("items") or []
        if not items:
            return respond(400, {"error": "items is required"})
        order_id = "KK-" + uuid.uuid4().hex[:8].upper()
        return respond(201, {"order_id": order_id, "customer": claims["sub"], "items": len(items)})

Run locally with three hand-built events (the uuid fixed for a stable output):

    201 {"order_id": "KK-3F2A9C1E", "customer": "cust-42", "items": 2}
    400 {"error": "items is required"}
    400 {"error": "body is not JSON"}

The customer id comes from the token's sub claim, never from the request body — a body can say anything.

## Authorisers: who is calling

- **JWT authoriser** (HTTP API): API Gateway validates a token from Amazon Cognito or any OIDC provider — issuer,
  audience, signature, expiry — before your code runs. A bad token gets 401 and costs you no invocation.
- **Lambda authoriser**: your function inspects the request (a header, a partner's signature) and returns allow or
  deny; cache its result for a few minutes so it is not called on every request.
- **IAM authorisation**: callers sign with SigV4 using AWS credentials — the right choice service-to-service inside
  AWS.
- **API keys are not authentication.** On a REST API they identify a client for a usage plan's quota; anyone who
  sees the key can send it.

## Throttling

API Gateway applies a per-account, per-region limit (by default 10,000 requests per second with a burst of 5,000;
check your quota) and you add stage and route limits. Requests over a limit get **429 Too Many Requests** without
reaching Lambda. Burst is the token bucket's size; rate is how fast it refills.

    stage: $default {'ThrottlingBurstLimit': 200, 'ThrottlingRateLimit': 100.0}
               {'POST /orders': {'ThrottlingBurstLimit': 50, 'ThrottlingRateLimit': 20.0}}

Set route limits from what the backend can take, not what the marketing team hopes for. Per-client quotas need a
REST API usage plan or your own logic. Throttling in API Gateway does not replace Lambda concurrency limits.

## CORS

A browser calling api.kiranakart.example from app.kiranakart.example first sends an OPTIONS **preflight**; unless
the response allows the origin, method and headers, the browser blocks the call (curl and Postman do not care, so
"works in Postman" proves nothing about CORS). On an HTTP API, set CorsConfiguration and API Gateway answers
preflights. On a REST API with proxy integration, your function must return Access-Control-Allow-Origin on real
responses too. List exact origins; "*" cannot be combined with credentials.

## Timeouts and the 202 pattern

API Gateway waits about 30 seconds for an integration at most, and a phone user will not wait that long anyway.
Work that may take longer (an invoice PDF, a refund with a bank call) is accepted, put on a queue, and answered
202 Accepted with an id the client can poll — the next lesson.

## Domains, stages and logs

Use a custom domain (api.kiranakart.example) with an ACM certificate in the same region for regional APIs, and
stages (or separate APIs per environment). Turn on **access logs** to CloudWatch Logs: the request id, route, status
and latency of every call is the first thing you read in an incident. Cost is per request (and data transfer);
check the API Gateway pricing page — HTTP APIs cost less per request than REST APIs.`,
    mcqs: [
      mcq('A new public JSON API for KiranaKart\'s mobile app needs JWT validation from Cognito and CORS, and nothing else special. Which API type fits best?', [
        ['An HTTP API, which has native JWT authorisers and CORS', true],
        ['A REST API, because only REST APIs can invoke Lambda functions', false],
        ['A WebSocket API, since mobile apps need a long-lived connection', false],
        ['No API at all; the app should call the Lambda Invoke API directly', false],
      ], 'HTTP APIs cover JWT authorisation and CORS simply and at lower cost. Both HTTP and REST APIs integrate with Lambda, WebSockets are for push and chat, and calling Invoke directly would require AWS credentials on every phone.'),
      mcq('The create-order handler reads the customer id from the request body\'s customer field. What is wrong with that?', [
        ['A caller can put any id in the body; the verified token claim is trustworthy', true],
        ['The body is base64 encoded with payload format 2.0 and cannot be parsed', false],
        ['API Gateway strips any field named customer from the body before invoking', false],
        ['Bodies over one kilobyte are cut off, so the field is sometimes missing', false],
      ], 'The JWT authoriser has verified the token, so the sub claim in requestContext identifies the caller; a body field is attacker-controlled. Bodies are only base64 encoded for binary content, no field is stripped, and there is no one-kilobyte cut.'),
      mcq('The React app gets "blocked by CORS policy" calling POST /orders, but the same request works from Postman. What is the most likely cause?', [
        ['The API\'s CORS settings do not allow the app\'s origin or headers', true],
        ['The Lambda function has crashed and returns a 500 for every call', false],
        ['The JWT authoriser rejects all requests that come from Postman', false],
        ['Postman sends requests through a VPN that API Gateway trusts more', false],
      ], 'CORS is enforced by browsers after a preflight, so a non-browser client succeeding points at the CORS configuration (origins, methods, headers such as authorization). A crashing function would fail in Postman too, the authoriser does not care about the client tool, and there is no VPN trust.'),
    ],
    checkpoint: [
      mcq('Requests above a route\'s throttle limit on an HTTP API receive which response, and does Lambda run for them?', [
        ['429 Too Many Requests, and the function is not invoked', true],
        ['503 Service Unavailable, after the function has already run', false],
        ['401 Unauthorized, and the function runs for a later retry', false],
        ['200 OK with an empty body, and the function runs afterwards', false],
      ], 'API Gateway rejects throttled requests itself with 429 before integration, so no invocation happens. 503 is not the throttle response, 401 is for failed authorisation, and a throttled request is never silently accepted.'),
      mcq('A partner\'s system calls KiranaKart\'s REST API with an API key in the x-api-key header. What does that key provide?', [
        ['Identification of the client for a usage plan\'s quota and throttle', true],
        ['Strong authentication, as the key is cryptographically tied to the caller', false],
        ['Encryption of the request body between the partner and API Gateway', false],
        ['Permission for the partner to call any AWS API in the account', false],
      ], 'API keys identify a client for usage plans; anyone holding the key can use it, so real authentication needs IAM, JWT or a Lambda authoriser. TLS encrypts the traffic, not the key, and the key grants nothing outside the API.'),
      mcq('Generating a GST invoice PDF can take 40 seconds. How should POST /invoices on the HTTP API handle it?', [
        ['Queue the work and return 202 Accepted with an id to poll', true],
        ['Set the HTTP API\'s integration timeout to 15 minutes', false],
        ['Run it in the authoriser so it starts before the route', false],
        ['Return 200 at once and generate the PDF inside the same call', false],
      ], 'An HTTP API waits at most 30 seconds for an integration, so long work is accepted onto a queue and the client polls or is notified. The timeout cannot be stretched to 15 minutes, an authoriser decides access only, and code after a returned response does not run.'),
    ],
  },
  /* ── MESSAGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_SERVERLESS_MESSAGING',
    notes: `When KiranaKart's API called billing, notifications and the warehouse one after another, a slow SMS provider made
checkout slow and a billing outage lost orders. A queue between the API and the work fixes both: the API puts the
order on a queue and answers at once; consumers take work at their own speed and retry when something fails.

## SQS in one picture

A producer sends a message; it is stored redundantly. A consumer **receives** it, which hides it for the
**visibility timeout**; if the consumer **deletes** it in time, it is gone; if not, it reappears and someone
receives it again. That is the whole reliability model — and the reason duplicates exist. Against moto, a second
receive while the first consumer holds the message returns nothing:

    m = sqs.receive_message(QueueUrl=q, VisibilityTimeout=30)["Messages"][0]
    second receive while invisible: []
    sqs.delete_message(QueueUrl=q, ReceiptHandle=m["ReceiptHandle"])

Settings you will set on every queue: **VisibilityTimeout** (default 30 seconds, up to 12 hours) longer than the
work takes; **MessageRetentionPeriod** (default 4 days, up to 14); **ReceiveMessageWaitTimeSeconds** up to 20 for
**long polling**, so empty receives do not burn requests. Message size is capped (check the current quota); put a
large payload in S3 and send its key.

## Standard versus FIFO

    Standard                                    FIFO (name ends in .fifo)
    Nearly unlimited throughput                 Lower throughput (higher with high-throughput mode)
    At-least-once: occasional duplicates        Exactly-once processing within a dedup window
    Best-effort ordering                        Strict order within a MessageGroupId

FIFO order is per **message group**: use the customer or wallet id, so one customer's debit and refund stay in
order while different customers are processed in parallel. Against moto, a repeated MessageDeduplicationId was
dropped and order held per group:

    sends: (cust-42, "debit 250", pay-1), (cust-42, "refund 250", pay-2),
           (cust-42, "debit 250", pay-1), (cust-77, "debit 99", pay-3)
    fifo received: [('cust-42', 'debit 250'), ('cust-42', 'refund 250'), ('cust-77', 'debit 99')]

A send without MessageGroupId fails: "MissingParameter ... The request must contain the parameter MessageGroupId."
Choose FIFO only when order or dedup really matters; standard plus an idempotent consumer is the common default.

## Dead-letter queues

A **poison message** — malformed, or for a pincode that does not exist — fails every time. Without a limit it
cycles for the whole retention period. A **redrive policy** moves a message to a **dead-letter queue** after
maxReceiveCount receives. With maxReceiveCount 3 and a 2-second visibility timeout, against moto:

    attempt 1: received, ApproximateReceiveCount=1 -> consumer fails, no delete
    attempt 2: received, ApproximateReceiveCount=2 -> consumer fails, no delete
    attempt 3: received, ApproximateReceiveCount=3 -> consumer fails, no delete
    attempt 4: nothing on orders
    in DLQ: {"order_id": "KK-1002", "pincode": "110001"}

Rules: a FIFO queue's DLQ must also be FIFO; give the DLQ a longer retention than the source; put a **CloudWatch
alarm on the DLQ's visible-message count above zero** — a DLQ nobody watches is a bin. After fixing the bug, move
messages back with a redrive (the console's "start DLQ redrive" or StartMessageMoveTask).

## SQS with Lambda

The event source mapping polls for you, invokes with batches (BatchSize), and deletes the batch when the function
succeeds. Two settings decide whether it behaves:

- **Queue visibility timeout at least six times the function timeout** (AWS's guidance), or a message is handed to
  a second invocation while the first is still working.
- **ReportBatchItemFailures**: return {"batchItemFailures": [{"itemIdentifier": id}]} and only those messages
  return to the queue. Without it, one bad record fails the batch and the nine good ones are processed again.

The mapping's **maximum concurrency** setting caps how many functions the queue drives — the knob that protects a
small database during a sale.

## SNS: one event, many subscribers

**SNS** pushes each published message to every subscription: SQS queues, Lambda, HTTPS endpoints, email, SMS.
**Fan-out** is SNS to several SQS queues, so each consumer has its own buffer and retries. A **filter policy** on
a subscription delivers only matching messages. Against moto, with cold-chain filtered to frozen and dairy:

    sns.publish(TopicArn=topic, Message=json.dumps({"order_id": oid}),
                MessageAttributes={"category": {"DataType": "String", "StringValue": cat}})

    billing        ['{"order_id": "KK-1001"}', '{"order_id": "KK-1003"}']
    notifications  ['{"order_id": "KK-1001"}', '{"order_id": "KK-1003"}']
    cold-chain     ['{"order_id": "KK-1003"}']

RawMessageDelivery=true delivered the bare body; without it each SQS message wraps the body in an SNS envelope
(Type, MessageId, Message...) and the consumer must unwrap it. **Permissions:** in real AWS the queue's access
policy must allow sns.amazonaws.com to SendMessage, with an aws:SourceArn condition naming the topic. moto does not
check this, so a fan-out that works in tests can deliver nothing in AWS. SNS FIFO topics exist for ordered fan-out
to FIFO queues.

## Idempotent consumers

At-least-once delivery means **every consumer must be safe to run twice**. Record what you have done, keyed by a
business id, with a conditional write, and skip the repeat. Against moto with DynamoDB:

    t.put_item(Item={"id": f"charge#{order['order_id']}", "status": "DONE"},
               ConditionExpression="attribute_not_exists(id)")

    charged: KK-1001
    duplicate, skipped: KK-1001
    charged: KK-1003
    charges made: ['KK-1001', 'KK-1003']

Use the business id (order id, payment id) rather than the SQS message id: a retried send from the producer
creates a new message id for the same order. Give the records a TTL so the table does not grow for ever. For calls
to outside systems, pass an idempotency key the provider honours (payment gateways do).

## Cost and Azure

SQS and SNS are billed per request (a batch of up to ten messages is one request) plus data transfer, with a free
monthly allowance — check the pricing pages. Batch sends and long polling cut the bill. Azure's equivalents are
Service Bus queues and topics, and Storage queues for the simple case.`,
    workedExample: `**Scenario.** A KiranaKart customer was charged twice for one order. Logs show the charge function
ran twice for the same order, 45 seconds apart. Setup: standard queue, visibility timeout 30 s, function timeout 60
s, the payment gateway sometimes slow.

**1. Reconstruct.** Invocation A received the message and called the gateway, which took 40 s. At 30 s the message
became visible again; invocation B received it and charged again. A then finished and deleted the message. Nothing
was "wrong" with SQS — at-least-once did exactly what it promises.

**2. Fix the timing.** Visibility timeout ≥ 6 × function timeout: 360 s. And the function's gateway client gets a
20 s timeout so one call cannot run for the full 60.

**3. Fix the design.** Even with correct timing, duplicates happen (a crash after charging but before deleting).
The consumer writes charge#KK-1001 with attribute_not_exists before calling the gateway, and passes the order id as
the gateway's idempotency key, so a second attempt is refused at both layers.

**4. What if the write succeeds but the charge fails?** Store status PENDING first, update to DONE after the
gateway confirms; a retry that finds PENDING asks the gateway for the order's status instead of charging blindly.

**5. Poison messages.** Redrive to a DLQ after 5 receives; alarm on DLQ depth above zero, routed to on-call.

**6. Batches.** ReportBatchItemFailures on, so one failed charge does not re-run nine good ones.

**7. Test.** In pytest with moto: deliver the same message twice and assert one charge; deliver a malformed one
and assert it alone is reported as failed.

**Result.** The duplicate is explained by the timing and made harmless by the design; either fix alone would have
left a gap.`,
    mcqs: [
      mcq('A Lambda consumer has a 60-second timeout and its SQS queue has the default 30-second visibility timeout. What will happen under load?', [
        ['Slow messages reappear and a second invocation processes them too', true],
        ['SQS refuses to attach the queue to a function with a longer timeout', false],
        ['Lambda extends the visibility timeout to match its own timeout', false],
        ['Messages taking over 30 seconds go straight to the dead-letter queue', false],
      ], 'Once the visibility timeout passes, the message is visible again and is handed to another invocation while the first is still working, producing duplicates. The mapping is allowed, Lambda does not extend it for you, and the DLQ is reached only after maxReceiveCount receives.'),
      mcq('KiranaKart wants a customer\'s wallet debit and refund processed in order, while different customers are handled in parallel. What should they use?', [
        ['A FIFO queue with the customer id as the MessageGroupId', true],
        ['A standard queue with the batch size of the mapping set to one', false],
        ['A FIFO queue with a single MessageGroupId shared by every message', false],
        ['An SNS topic with a separate filter policy per customer id', false],
      ], 'FIFO ordering is per message group, so grouping by customer keeps each customer\'s events in order and lets groups run in parallel. A standard queue does not guarantee order even with batch size one, a single group serialises everyone, and SNS filters do not order anything.'),
      mcq('An SNS topic fans out to three SQS queues. Integration tests with moto pass, but in AWS no messages reach the queues. What is the likely cause?', [
        ['The queue access policies do not allow SNS to send to them', true],
        ['SNS can deliver only to Lambda functions, never to SQS queues', false],
        ['RawMessageDelivery must be enabled before SNS delivers anything', false],
        ['The queues must be FIFO queues for SNS to deliver to them at all', false],
      ], 'Each queue needs a policy allowing sns.amazonaws.com to SendMessage with the topic as aws:SourceArn; moto does not enforce it. SNS delivers to SQS routinely, raw delivery only changes the body format, and standard topics deliver to standard queues.'),
    ],
    checkpoint: [
      mcq('A message for a non-existent pincode fails every time it is processed. Which setting stops it cycling for days?', [
        ['A redrive policy with a dead-letter queue and a maxReceiveCount', true],
        ['A longer MessageRetentionPeriod on the source queue of 14 days', false],
        ['Long polling with ReceiveMessageWaitTimeSeconds set to twenty seconds', false],
        ['A shorter visibility timeout, so failures are retried sooner', false],
      ], 'After maxReceiveCount receives, the redrive policy moves the poison message to the DLQ for inspection. Longer retention keeps it cycling longer, long polling only reduces empty receives, and a shorter visibility timeout makes it cycle faster.'),
      mcq('Why should an idempotent consumer key its "already done" record on the order id rather than the SQS message id?', [
        ['A producer retry sends the same order as a new message id', true],
        ['SQS message ids change every time a message is received', false],
        ['DynamoDB cannot store SQS message ids as partition keys', false],
        ['Message ids are encrypted and cannot be read by consumers', false],
      ], 'If the producer retries a send after a timeout, SQS creates a second message with a new id for the same order, so only a business key catches the duplicate. Message ids are stable across receives, they are ordinary strings DynamoDB can store, and consumers can read them.'),
      mcq('An order Lambda receives batches of ten SQS messages; one malformed message makes it raise an exception. What happens without partial batch responses?', [
        ['The whole batch returns to the queue, so nine good orders run again', true],
        ['Only the malformed message returns to the queue for another attempt', false],
        ['The whole batch is deleted, and the malformed order is lost for good', false],
        ['Lambda splits the batch automatically and retries each one alone', false],
      ], 'A failed invocation means the batch is not deleted, so every message in it becomes visible again and the good ones are reprocessed. Returning only the failed ones is what ReportBatchItemFailures adds, nothing is deleted on failure, and SQS mappings do not bisect batches.'),
    ],
  },

  /* ── EVENTBRIDGE_STEP ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_SERVERLESS_EVENTBRIDGE_STEP',
    notes: `Queues connect one producer to its consumers. As KiranaKart grows, an order placed matters to loyalty points,
the rider app, analytics and fraud checks, owned by different teams who should not have to ask the order team for
a new SNS subscription each time. And fulfilling an order is several steps that must happen in order, with retries
and an undo when payment fails. **EventBridge** handles the first problem; **Step Functions** the second.

## EventBridge: buses, events and rules

An **event bus** receives events. Every account has a **default bus** (AWS services publish there, such as EC2
state changes); you create **custom buses** for your own domain events; SaaS partners publish to partner buses.
An event is JSON with a fixed envelope — source, detail-type, detail, time, account, region — and your payload in
**detail**. A **rule** on a bus has an **event pattern** and up to five **targets** (Lambda, SQS, SNS, Step
Functions, another bus, an API destination for any HTTPS endpoint). Against moto:

    pattern = {"source": ["kiranakart.orders"], "detail-type": ["OrderPlaced"],
               "detail": {"total": [{"numeric": [">=", 500]}], "city": ["hyderabad", "bengaluru"]}}
    ev.put_rule(Name="big-orders-to-loyalty", EventBusName="kiranakart-orders", EventPattern=json.dumps(pattern))
    ev.put_targets(Rule="big-orders-to-loyalty", EventBusName="kiranakart-orders",
                   Targets=[{"Id": "loyalty", "Arn": loyalty_queue_arn}])

Three orders were put — 640 in Hyderabad, 180 in Hyderabad, 900 in Pune — and only one matched:

    FailedEntryCount: 0
    loyalty got: OrderPlaced {'order_id': 'KK-1001', 'total': 640, 'city': 'hyderabad'}

Patterns match exact values in a list, plus operators: numeric ranges, prefix, anything-but, exists. Matching is
**type-sensitive**: in a second moto run the same order sent with "total": "640" (a string) was not delivered, and
an event put on the **default** bus never reached a rule on the custom bus — both classic "my rule never fires"
causes. Detail that is not valid JSON is rejected at put time: FailedEntryCount 1, ErrorCode MalformedDetail. Check
FailedEntryCount on every put_events; it does not raise.

**Delivery.** Targets get events at least once. If a target fails, EventBridge retries (by default for up to 24
hours) and can then send the event to a **dead-letter queue** set on the target. **Input transformers** reshape an
event for a target. **Archive and replay** keeps events so you can re-send last Tuesday's after fixing a consumer.
A **schema registry** documents event shapes for other teams.

**Permissions** follow the SNS pattern: an SQS target needs a queue policy allowing events.amazonaws.com; a Lambda
target needs a resource-based policy; a Step Functions target needs a role EventBridge assumes.

## Schedules

    ev.put_rule(Name="nightly-slot-report", ScheduleExpression="cron(30 20 * * ? *)", State="ENABLED")

Cron expressions on rules are **UTC**: 20:30 UTC is 02:00 IST. For new work prefer **EventBridge Scheduler**,
which supports time zones (Asia/Kolkata), one-off schedules and flexible windows. Azure's equivalents are Event
Grid for events and Logic Apps or Durable Functions for workflows.

## Choreography versus orchestration

- **Choreography:** each service publishes events and reacts to others; no one is in charge. Loose coupling, easy
  to add a consumer — and hard to answer "where is order KK-1001 stuck?"
- **Orchestration:** one workflow calls each step in order and owns retries, timeouts and compensation. One place
  to look, explicit flow, a central dependency.

Use events between bounded contexts (orders announces OrderPlaced; loyalty decides what to do) and orchestration
inside a process whose steps must happen in order with an undo (reserve stock, charge, assign a rider).

## Step Functions

A **state machine** is JSON in the Amazon States Language. States: **Task** (do work — invoke Lambda, or call 200+
AWS services directly), **Choice**, **Parallel**, **Map** (the same steps for every item in a list), **Wait**,
**Pass**, **Succeed**, **Fail**. Part of KiranaKart's fulfilment flow:

    "ChargePayment": {
      "Type": "Task", "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": {"FunctionName": "arn:aws:lambda:ap-south-1:123456789012:function:charge-payment",
                     "Payload.$": "$"},
      "ResultPath": "$.payment",
      "Retry": [{"ErrorEquals": ["PaymentGatewayBusy"], "IntervalSeconds": 5, "MaxAttempts": 4,
                 "BackoffRate": 2.0, "MaxDelaySeconds": 30, "JitterStrategy": "FULL"}],
      "Catch": [{"ErrorEquals": ["States.ALL"], "ResultPath": "$.error", "Next": "ReleaseStock"}],
      "Next": "AssignRider"}

**Retry** re-runs the state on matching errors with exponential backoff: here waits of 5, 10, 20 and 30 seconds
(40 capped by MaxDelaySeconds), each randomised by full jitter, so up to five attempts. **Catch** routes a final
failure to another state; ResultPath "$.error" keeps the original input and adds the error, so ReleaseStock still
knows the order. That Catch to an undo step is the **saga** pattern: each step that changes the world has a
compensating step. ResultPath "$.payment" places a Task's result inside the input instead of replacing it.

The full definition (ReserveStock, a Choice on stock, ChargePayment, AssignRider, ReleaseStock, an SNS notify and a
Fail) was registered with moto and checked by a script: 7 states, no dangling Next targets.

    state machine: arn:aws:states:ap-south-1:123456789012:stateMachine:order-fulfilment
    execution: arn:aws:states:ap-south-1:123456789012:execution:order-fulfilment:KK-1001

Naming the execution after the order id makes a start idempotent: AWS rejects a second execution with the same name
in a Standard workflow (ExecutionAlreadyExists), unless it is the same input while the first is still running.

**Standard versus Express.** Standard workflows run for up to a year, execute each step exactly once, keep a
visual execution history for 90 days and are billed per state transition. Express workflows run for up to five
minutes, are at-least-once, log to CloudWatch, and are billed by requests and duration — for high-volume, short
flows. Long waits for a human or a partner use **.waitForTaskToken**; a step that starts a job and waits for it uses
**.sync** integrations.

**Visibility.** In the console every Standard execution shows which state it reached, the input and output of each
step and the error — the answer to "where is KK-1001 stuck?" that choreography lacks.`,
    workedExample: `**Scenario.** KiranaKart's fulfilment: reserve stock, charge the customer, assign a rider. If stock
is short, tell the customer. If the charge fails after retries, release the stock. Riders' app and analytics also
need to know about every placed order. Design it.

**1. Split the problem.** "Everyone needs to know an order was placed" is an event: the order service puts
OrderPlaced on the kiranakart-orders bus; loyalty, rider forecasting and analytics each own a rule. "Reserve, charge,
assign, undo on failure" is an ordered process with compensation: a Standard Step Functions workflow.

**2. Start the workflow.** A rule on the bus with pattern {"source": ["kiranakart.orders"], "detail-type":
["OrderPlaced"]} targets the state machine through a role EventBridge assumes. The execution name is the order id,
so a duplicate event cannot start a second fulfilment.

**3. States.** ReserveStock (Task) → InStock? (Choice on $.stock.reserved) → ChargePayment (Task, Retry on
PaymentGatewayBusy, Catch → ReleaseStock) → AssignRider (Task) → end. Out-of-stock and failed payments go to
NotifyFailure (SNS) and a Fail state named OrderNotFulfilled.

**4. Retries per step.** Throttling and timeouts retry everywhere. The charge retries 5/10/20/30 s with jitter. It
must be idempotent anyway (order id as the gateway's key), because a retry after a timeout may follow a charge that
actually went through.

**5. Express or Standard?** Thousands of orders an hour, each finishing in seconds, would fit Express on cost —
but the team wants exactly-once steps around money and the visual history for support. Standard, and revisit the
cost when volume justifies measuring it in the calculator.

**6. Check it.** The definition is validated (a script checks every Next exists; the console's Workflow Studio and
the validate-state-machine-definition API do more), registered in moto, and each Lambda is unit-tested on its own.

**Result.** Events for the many teams that want to know; one workflow for the steps that must happen in order and
be undone — and one console page that shows where any order is.`,
    mcqs: [
      mcq('A rule on the custom bus kiranakart-orders never fires, though the publisher reports success. The publisher calls put_events without EventBusName. Why?', [
        ['The events go to the default bus, which the rule is not attached to', true],
        ['put_events always fails silently when the bus name is not supplied', false],
        ['Rules on custom buses only match events coming directly from AWS services', false],
        ['The rule needs a schedule expression as well as an event pattern', false],
      ], 'Without EventBusName, events land on the default bus, and a rule only sees events on its own bus. The put succeeds (FailedEntryCount 0), custom bus rules match your own events, and a rule has either a pattern or a schedule.'),
      mcq('In a Step Functions Task, a Catch uses ResultPath "$.error" and routes to ReleaseStock. Why "$.error" rather than the default?', [
        ['It keeps the original input and adds the error, so the order id survives', true],
        ['It is required syntax; a Catch without ResultPath is rejected outright', false],
        ['It makes Step Functions retry the failed state once more before moving', false],
        ['It writes the error to CloudWatch Logs instead of passing it on to the next state', false],
      ], 'By default the error output replaces the state\'s input, and ReleaseStock would lose the order. ResultPath is optional, it does not trigger a retry (Retry does), and it shapes the data passed on rather than logging.'),
      mcq('Which situation is the best fit for an Express rather than a Standard Step Functions workflow?', [
        ['Validating and enriching 2,000 clickstream events per second, each under a second', true],
        ['A loan approval waiting up to three days for an underwriter to click approve', false],
        ['Charging a customer, where a step must never run twice for the same order', false],
        ['A month-end ledger close that runs for six hours across many batch jobs', false],
      ], 'Express suits high-volume, short (under five minutes) flows, billed by requests and duration. Long waits, exactly-once steps and multi-hour runs need Standard, which runs up to a year with exactly-once execution.'),
    ],
    checkpoint: [
      mcq('An EventBridge pattern has "total": [{"numeric": [">=", 500]}]. The producer sends "total": "640". What happens?', [
        ['No match, because a numeric filter does not match a string value', true],
        ['It matches, since EventBridge converts strings to numbers first', false],
        ['put_events fails with an error that names the total field', false],
        ['It matches only if the rule\'s target is a Lambda function', false],
      ], 'Pattern matching is type-sensitive, so the string "640" is not a number for the numeric operator, and the event is silently not matched. There is no conversion, the put itself succeeds, and targets do not change matching.'),
      mcq('Orders, loyalty, rider and analytics teams each react to an order being placed. Which design fits best?', [
        ['Orders publishes OrderPlaced to a bus; each team owns a rule', true],
        ['One state machine that calls all four teams\' services in turn', false],
        ['Orders calls each team\'s API synchronously during checkout', false],
        ['A single SQS queue that all four teams take messages from', false],
      ], 'Independent reactions to one fact are choreography: each team adds its own rule without changing the publisher. Orchestrating them couples orders to every team, synchronous calls slow checkout, and consumers sharing one queue each get only some messages.'),
      mcq('A Retry has IntervalSeconds 5, BackoffRate 2.0, MaxAttempts 3 and no MaxDelaySeconds. Without jitter, what are the waits before each retry?', [
        ['5, 10 and 20 seconds', true],
        ['5, 5 and 5 seconds', false],
        ['5, 7 and 9 seconds', false],
        ['2, 4 and 8 seconds', false],
      ], 'Each interval is the previous one multiplied by BackoffRate: 5, 10, 20. Equal waits ignore the backoff rate, adding 2 is linear rather than exponential, and the first interval is IntervalSeconds, not the rate.'),
    ],
  },
  /* ── SERVERLESS_OPS ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_SERVERLESS_SERVERLESS_OPS',
    notes: `KiranaKart now has two functions, an HTTP API, a queue with a DLQ, a table and an event bus. Created by clicking,
nobody could rebuild them, staging would drift from production, and a deploy would be a person remembering steps
— Year 3's "A Pipeline, Not a Person Remembering". This lesson packages the whole app as one template, deploys it
per environment, tests it at three levels and watches it in production.

## AWS SAM in outline

The **AWS Serverless Application Model** is a CloudFormation extension: the line Transform:
AWS::Serverless-2016-10-31 lets you write short resource types (AWS::Serverless::Function, ::HttpApi, ::SimpleTable)
that expand into the full CloudFormation resources at deploy time. Plain CloudFormation resources (queues, tables,
alarms) sit beside them. The heart of KiranaKart's template:

    Transform: AWS::Serverless-2016-10-31
    Parameters:
      Stage: {Type: String, AllowedValues: [dev, prod], Default: dev}
    Globals:
      Function:
        Runtime: python3.12
        Architectures: [arm64]
        MemorySize: 256
        Timeout: 10
        Tracing: Active
        Environment:
          Variables: {STAGE: !Ref Stage, LOG_LEVEL: INFO}
    Resources:
      ProcessOrderFunction:
        Type: AWS::Serverless::Function
        Properties:
          CodeUri: src/
          Handler: process_order.handler
          Timeout: 30
          Environment:
            Variables: {TABLE_NAME: !Ref OrdersTable, BUS_NAME: !Ref OrdersBus}
          Policies:
            - DynamoDBCrudPolicy: {TableName: !Ref OrdersTable}
            - EventBridgePutEventsPolicy: {EventBusName: !Ref OrdersBus}
          Events:
            FromQueue:
              Type: SQS
              Properties:
                Queue: !GetAtt OrdersQueue.Arn
                BatchSize: 10
                FunctionResponseTypes: [ReportBatchItemFailures]
      OrdersQueue:
        Type: AWS::SQS::Queue
        Properties:
          VisibilityTimeout: 180
          RedrivePolicy: {deadLetterTargetArn: !GetAtt OrdersDLQ.Arn, maxReceiveCount: 5}

The full template (HTTP API with stage throttling, CreateOrderFunction with an HttpApi event and
SQSSendMessagePolicy, the DLQ, a PAY_PER_REQUEST table, a bus named with !Sub 'kiranakart-orders-\${Stage}', a DLQ
alarm and an ApiUrl output) was parsed with PyYAML using a loader that accepts the !Ref, !GetAtt and !Sub tags (plain
yaml.safe_load rejects them), and a script confirmed every !Ref and !GetAtt names a real resource or parameter:

    OrdersApi              AWS::Serverless::HttpApi
    CreateOrderFunction    AWS::Serverless::Function
    ProcessOrderFunction   AWS::Serverless::Function
    OrdersQueue            AWS::SQS::Queue
    OrdersDLQ              AWS::SQS::Queue
    OrdersTable            AWS::DynamoDB::Table
    OrdersBus              AWS::Events::EventBus
    DlqAlarm               AWS::CloudWatch::Alarm
    unknown refs: []

Note the queue's 180-second visibility timeout: six times the 30-second function timeout. An Events entry of type
SQS creates the event source mapping and the polling permissions; an HttpApi event creates the route and the invoke
permission. That wiring is most of what SAM saves you.

## Build and deploy

    sam validate --lint
    sam build                      # installs requirements.txt per function into .aws-sam/
    sam deploy --guided            # first time: stack name, region, parameters -> samconfig.toml
    sam deploy --config-env prod   # later: non-interactive, from samconfig.toml
    sam delete --stack-name kiranakart-orders-dev

(These need the SAM CLI and an account; they were not run here.) Deploy creates a CloudFormation change set, so
you can review what will change before it is applied, and a failed deploy rolls back. SAM is not the only choice:
the CDK writes the same in Python, and Terraform (CL_TERRAFORM) covers serverless resources too. Pick one per
repository.

## Environments and configuration

- **One template, a parameter per environment**, deployed as separate stacks — ideally in separate dev and prod
  accounts (CL1's "Multi-Account Setups, Tags and Guardrails").
- **Environment variables** for non-secret settings: table names, log level, feature flags.
- **Secrets** (the payment gateway key) in Secrets Manager or SSM Parameter Store SecureString, read at init and
  cached; never in an environment variable in the template, and never in Git.
- **Aliases and versions**: publish a version on each deploy and point a live alias at it. SAM's AutoPublishAlias
  with a DeploymentPreference (for example Canary10Percent5Minutes) shifts traffic gradually and rolls back on an
  alarm — Year 3's "Getting It Back Off Again", automated.

## Permissions per function

Each function gets **its own role** with only what it needs. SAM **policy templates** (DynamoDBCrudPolicy,
SQSSendMessagePolicy, EventBridgePutEventsPolicy, S3ReadPolicy and others) produce least-privilege statements scoped
to one resource. CreateOrderFunction can send to one queue and nothing else; ProcessOrderFunction can use one table
and one bus. A single shared "LambdaFullAccess" role means one compromised function can do everything any of them
can.

## Testing at three levels

**1. Unit tests on the handler, with moto.** The SQS consumer was tested this way: a fixture creates the table and
bus inside mock_aws, then reloads the handler module so its module-level clients are created inside the mock.

    def test_redelivered_message_is_not_processed_twice(env):
        body = json.dumps({"order_id": "KK-2", "total": 180})
        env.handler(sqs_event(body), None)
        assert env.process(json.loads(body)) == "duplicate"

    def test_only_the_bad_record_is_reported(env):
        out = env.handler(sqs_event(json.dumps({"order_id": "KK-3", "total": 99}), "{broken"), None)
        assert out == {"batchItemFailures": [{"itemIdentifier": "m-2"}]}

    3 passed in 1.82s

**2. Local emulation.** sam local invoke ProcessOrderFunction -e events/sqs.json runs the function in a Docker
container shaped like Lambda; sam local start-api serves the HTTP API on localhost. Good for event-shape bugs; it
does not reproduce IAM, real queues or quotas. (Not run here: it needs Docker.)

**3. Integration tests in a real dev stack.** Deploy the stack to the dev account, send a real order through the
API, assert it reaches the table and the event appears; then tear the stack down. This is the only level that
catches a missing queue policy or IAM permission — the bugs moto does not model.

## Observing a serverless app

- **Logs:** each function writes to /aws/lambda/<name>. Log JSON with the order id and request id so CloudWatch
  Logs Insights can follow one order across functions. **Powertools for AWS Lambda (Python)** gives structured
  logging, metrics and tracing helpers, plus batch and idempotency utilities. Set log retention; the default keeps
  logs for ever, and you pay for it.
- **Metrics to alarm on:** Lambda Errors, Throttles, Duration (p99) and ConcurrentExecutions; SQS
  ApproximateAgeOfOldestMessage (the queue is falling behind) and DLQ ApproximateNumberOfMessagesVisible above
  zero; API Gateway 5xx and latency; Step Functions ExecutionsFailed.
- **Tracing:** Tracing: Active sends X-Ray traces, so one request's path through API Gateway, Lambda, SQS and
  DynamoDB is drawn with timings.

Azure's equivalents are Bicep or ARM templates with the Functions Core Tools, and Application Insights for
observation.`,
    workedExample: `**Scenario.** KiranaKart's dev team deploys by zipping code and uploading it in the console. Last week
someone changed the production queue's visibility timeout by hand and orders were processed twice. Move them to a
repeatable setup.

**1. Inventory.** List every resource the app uses (two functions, HTTP API, queue, DLQ, table, bus, alarm) and every
setting someone changed by hand. These become the template.

**2. Template.** Write template.yaml with Globals for runtime, architecture, timeout and tracing; a Stage parameter;
per-function policy templates; the queue at 6 × the consumer's timeout; the DLQ alarm. Lint with sam validate --lint.

**3. Two stacks.** kiranakart-orders-dev in the dev account and kiranakart-orders-prod in the prod account, each
from samconfig.toml config-envs. Console edits in prod are now drift: CloudFormation drift detection shows them, and
the next deploy reverts them. Make the console read-only for the team in prod.

**4. Tests in the pipeline.** pytest with moto runs on every pull request (the three tests above); after a merge,
deploy to dev, run the integration test that sends a real order, then deploy to prod with a canary alias and a
rollback alarm on Errors.

**5. Secrets.** The gateway key moves from an environment variable to Secrets Manager; the function's policy allows
reading that one secret.

**6. Watch it.** Dashboards for the alarms listed in the notes; log retention 30 days on every log group.

**7. Teardown practice.** sam delete on the dev stack, then a fresh deploy from scratch: if that fails, something
still depends on a manual step.

**Result.** The visibility timeout that caused the incident is now a reviewed line in a template, and no one can
change production without a pull request.`,
    mcqs: [
      mcq('Why does plain yaml.safe_load fail on a SAM template that uses !Ref and !GetAtt?', [
        ['Those are custom YAML tags the safe loader has no constructor for', true],
        ['SAM templates must be JSON and YAML is only for documentation', false],
        ['The Transform line makes the file invalid as YAML until deployed', false],
        ['YAML forbids keys that start with a capital letter such as Resources', false],
      ], 'CloudFormation\'s short-form intrinsics are YAML tags; a loader needs constructors for them (or a CloudFormation-aware library). Templates can be YAML or JSON, Transform is an ordinary key, and YAML keys may be capitalised.'),
      mcq('ProcessOrderFunction must write to one DynamoDB table and put events on one bus. Which permission setup is right?', [
        ['Its own role with DynamoDBCrudPolicy and EventBridgePutEventsPolicy scoped to them', true],
        ['A shared role for every function with AdministratorAccess to keep deploys simple', false],
        ['AmazonDynamoDBFullAccess and AmazonEventBridgeFullAccess on a shared team role', false],
        ['No role at all, because SAM functions inherit the deploying user\'s permissions', false],
      ], 'Per-function roles from SAM policy templates are least privilege, scoped to the named table and bus. Admin or full-access managed policies let one compromised function reach everything, and functions never run with the deployer\'s credentials.'),
      mcq('Which bug will only an integration test against a real dev stack catch, not a pytest suite using moto?', [
        ['An SQS queue policy that does not allow SNS to deliver messages', true],
        ['A handler that returns all ten records instead of the one that failed', false],
        ['A duplicate message charged twice because no conditional write exists', false],
        ['A KeyError when the incoming SQS body is missing the order id field', false],
      ], 'moto does not enforce resource policies, so a missing queue policy passes locally and fails in AWS. The other three are logic bugs in the handler that unit tests with moto catch.'),
    ],
    checkpoint: [
      mcq('In a SAM template, what does an Events entry of Type SQS on a function create when deployed?', [
        ['An event source mapping and the permissions to poll that queue', true],
        ['A new SQS queue owned by the function with default settings', false],
        ['An SNS subscription forwarding the queue\'s messages to Lambda', false],
        ['A CloudWatch alarm on the queue\'s age of oldest message', false],
      ], 'The SQS event expands into an event source mapping plus the receive and delete permissions on the queue named in Queue. The queue itself is a separate resource, no SNS is involved, and alarms must be declared.'),
      mcq('The payment gateway\'s secret key is currently an environment variable in template.yaml. Where should it go?', [
        ['Secrets Manager or a SecureString parameter, read and cached by the function', true],
        ['A Globals entry, so every function shares one copy of the secret value', false],
        ['The function\'s handler file, so it is not visible in the template at all', false],
        ['A Lambda layer, because layer contents are encrypted with the account key', false],
      ], 'Secrets belong in a secret store with access granted per function, read at init and cached. Globals and handler files still put the secret in Git, and a layer is ordinary code packaging, not a secret store.'),
      mcq('Which metric best shows that an SQS-driven pipeline is falling behind during a sale?', [
        ['ApproximateAgeOfOldestMessage on the queue rising steadily', true],
        ['NumberOfMessagesSent on the queue being higher than usual', false],
        ['The Lambda function\'s average Duration falling slightly', false],
        ['The API\'s 4xx count rising as customers enter bad pincodes', false],
      ], 'A growing age of the oldest message means work arrives faster than it is processed. More sends alone may be absorbed, shorter durations are good news, and 4xx errors are client mistakes, not backlog.'),
    ],
  },
  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_SERVERLESS_DEBUGGING',
    notes: `Six things that go wrong with serverless apps. For each: the symptom you see, the cause, and the one change that
fixes it. Before changing anything, answer two questions: **which invocation style is this** (synchronous,
asynchronous, or a polling event source), and **who retries**. Outputs marked (moto) or (local) were really
produced; the others are AWS behaviour from the documentation.

## 1. "Task timed out after 3.00 seconds"

**Symptom.** The new invoice function works in the developer's test with a small order and times out in staging.
The log shows Task timed out after 3.00 seconds; Duration is exactly 3000 ms every time.

**Cause.** The function was created without a Timeout, so it got the default of **3 seconds**. Calling the GST
service and writing to S3 takes longer for a real order. A duration exactly equal to the timeout is the tell.

**Fix.** Set a timeout from measured duration with headroom (here 15 s), and give the HTTP client its own shorter
timeout so a hung dependency fails fast with a clear error instead of eating the whole budget. Check
context.get_remaining_time_in_millis() before starting a slow step. Do not jump to 900 seconds: a long timeout
hides hangs and holds concurrency.

## 2. Invoice emails sent twice

**Symptom.** Customers sometimes get the same invoice email twice, a little over 30 seconds apart. Only when the
email provider is slow.

**Cause.** The SQS queue has the default 30-second visibility timeout and the function's timeout is 60 seconds.
When a send takes longer than 30 seconds, the message becomes visible and a second invocation sends it too.

**Fix.** Queue visibility timeout at least six times the function timeout (360 s), and make the consumer idempotent:
record invoice#<order id> with a conditional write before sending, skip if it exists. Timing reduces duplicates;
idempotency makes the rest harmless.

## 3. One bad order and the whole batch reruns (local)

**Symptom.** A batch with one malformed message fails; the nine valid orders in it are processed again and again
until the bad one reaches the DLQ.

**Cause.** The handler raised on the bad record, so the whole batch went back to the queue.

**Fix.** Catch per record and return partial failures, with ReportBatchItemFailures enabled on the mapping. Run
locally on three records, the validator returned only the two failures:

    {'batchItemFailures': [{'itemIdentifier': 'm-2'}, {'itemIdentifier': 'm-3'}]}

Without the FunctionResponseTypes setting on the mapping, Lambda ignores this return value — set both.

## 4. AccessDeniedException only in production

**Symptom.** Deploys to dev work; in prod every order fails with: User: arn:aws:sts::123456789012:assumed-role/
process-order-role/process-order is not authorized to perform: dynamodb:PutItem on resource:
arn:aws:dynamodb:ap-south-1:123456789012:table/orders-prod because no identity-based policy allows the
dynamodb:PutItem action.

**Cause.** Read the message: it names the role, the action and the resource. The policy was hand-written with
table/orders-dev in it; in prod the table is orders-prod.

**Fix.** Scope the policy with a reference to the table resource (DynamoDBCrudPolicy with TableName: !Ref
OrdersTable), never a hard-coded name. Then the same template is correct in every stage.

## 5. The EventBridge rule that never fires (moto)

**Symptom.** Loyalty points stopped for big orders after the order service was refactored. put_events reports
FailedEntryCount 0.

**Cause.** Two changes in the refactor, each enough on its own. Against moto, with a rule for total ≥ 500 on the
kiranakart-orders bus:

    string total  delivered=0      # "total": "640" — numeric match needs a number
    default bus   delivered=0      # EventBusName omitted — the event went to the default bus
    number total  delivered=1

**Fix.** Send numbers as JSON numbers and pass EventBusName explicitly. Add a contract test that puts a sample event
and asserts the rule matches (the TestEventPattern API in AWS), and a CloudWatch alarm when the rule's
MatchedEvents drops to zero during business hours.

## 6. Blocked by CORS, but only in the browser

**Symptom.** The web app shows: Access to fetch at 'https://api.kiranakart.example/orders' from origin
'https://app.kiranakart.example' has been blocked by CORS policy: Response to preflight request doesn't pass access
control check. The same call with curl succeeds.

**Cause.** The app now sends an authorization header. The browser's preflight asks Access-Control-Request-Headers:
authorization, content-type; the HTTP API's CorsConfiguration allows only content-type, so the preflight fails.

**Fix.** Add authorization to AllowHeaders (as in the API Gateway lesson's configuration). Do not "fix" it with
AllowOrigins "*": that does not add the header, and opening every origin to a credentialed API is the bug you get
next.`,
    mcqs: [
      mcq('A function\'s log shows Duration exactly 3000 ms and "Task timed out" on every call. What should you suspect first?', [
        ['It runs with the default 3-second timeout that nobody changed', true],
        ['The function has run out of memory and Lambda killed the process', false],
        ['The account has hit its regional concurrency quota and throttles', false],
        ['The handler name in the configuration points to the wrong file', false],
      ], 'A duration identical to 3 seconds is the default timeout cutting the call off. Out-of-memory errors report memory exhaustion, throttling prevents the invocation from starting, and a wrong handler fails immediately with an import error.'),
      mcq('A consumer returns batchItemFailures correctly, yet a batch with one bad record still reprocesses all ten. What is missing?', [
        ['ReportBatchItemFailures in the event source mapping\'s response types', true],
        ['A FIFO queue, because only FIFO queues support partial batch responses', false],
        ['A larger batch window so Lambda has time to read the returned value', false],
        ['A second DLQ attached to the Lambda function as an on-failure target', false],
      ], 'Lambda honours the partial batch response only when FunctionResponseTypes includes ReportBatchItemFailures. Standard queues support it too, the batch window controls batching not responses, and a destination does not change which messages return to the queue.'),
      mcq('An AccessDeniedException names the role, dynamodb:PutItem and table/orders-prod. The policy lists table/orders-dev. What is the right fix?', [
        ['Reference the table resource in the policy instead of a hard-coded name', true],
        ['Add dynamodb:* on all resources to the role so it works in every stage', false],
        ['Rename the production table to orders-dev so the policy matches it', false],
        ['Retry the call, since IAM changes take a few minutes to reach Lambda', false],
      ], 'Building the policy from the template\'s table reference makes it correct for every stage and keeps it least privilege. A wildcard grants far too much, renaming prod tables hides the bug, and the error is not a propagation delay but a wrong resource.'),
      mcq('After a refactor, put_events returns FailedEntryCount 0 but the loyalty rule receives nothing. Which check comes first?', [
        ['Compare the published event and bus with the rule\'s pattern and bus', true],
        ['Raise the Lambda concurrency of the loyalty function that is the target', false],
        ['Recreate the event bus, since buses can silently stop routing events', false],
        ['Switch the rule to a scheduled rule so it fires on a fixed timer', false],
      ], 'A successful put that matches nothing points at the event (field types, source, detail-type) or the bus it was sent to. The target never ran, so its concurrency is irrelevant, buses do not stop routing, and a schedule changes the meaning of the rule.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_SERVERLESS_PRACTICE',
    notes: `Nine exercises, easiest first. Work each on paper or in Python before reading the answer.

## 1. Concurrency (easy)

A coupon-check function handles 250 requests per second at 0.8 s each. How many concurrent environments, and is a
reserved concurrency of 300 enough?

**Answer.** 250 × 0.8 = 200. Yes, 300 leaves 50% headroom; if duration doubles to 1.6 s it needs 400 and starts
throttling — so also alarm on Duration.

## 2. GB-seconds (easy)

A 512 MB function runs 300 ms per call, 2 million times a month. How many GB-seconds?

**Answer.** 0.5 GB × 0.3 s = 0.15 GB-s per call; × 2,000,000 = 300,000 GB-s, plus 2 million requests. Multiply each
by the current price from the Lambda pricing page for ap-south-1, subtract the free allowance, and compare with
doubling memory if that halves duration (same GB-seconds, faster responses).

## 3. Visibility timeout (easy)

An SQS-triggered function has a 45-second timeout. What visibility timeout should the queue have?

**Answer.** At least 6 × 45 = 270 seconds, per AWS's guidance — enough for retries inside a batch window without a
message being handed out twice.

## 4. Who calls, who retries (easy)

For each, name the invocation style: (a) a photo upload to S3 makes a thumbnail; (b) POST /orders on an HTTP API;
(c) an SQS queue of refunds; (d) a report at 02:00 IST every day.

**Answer.** (a) asynchronous — Lambda retries and then a failure destination; (b) synchronous — the client sees the
error and decides; (c) event source mapping — failed messages return to the queue and then the DLQ;
(d) EventBridge Scheduler invoking asynchronously.

## 5. Cron in UTC (medium)

Write the schedule expression for a rule that runs every day at 06:00 IST.

**Answer.** IST is UTC+5:30, so 00:30 UTC: cron(30 0 * * ? *). Or use EventBridge Scheduler with the time zone
Asia/Kolkata and write 06:00 directly.

## 6. An event pattern (medium)

Match OrderCancelled events from kiranakart.orders where the city starts with "hyd" and the reason is anything
except "customer_request".

**Answer.**

    {"source": ["kiranakart.orders"], "detail-type": ["OrderCancelled"],
     "detail": {"city": [{"prefix": "hyd"}],
                "reason": [{"anything-but": "customer_request"}]}}

Checked against moto with a rule and an SQS target: (hyderabad, out_of_stock) delivered 1; (hyderabad,
customer_request) delivered 0; (pune, out_of_stock) delivered 0.

## 7. A retry schedule (medium)

Retry with IntervalSeconds 2, BackoffRate 3.0, MaxAttempts 4, MaxDelaySeconds 30, no jitter. List the waits.

**Answer.** 2, 6, 18, then 54 capped to 30 seconds. Four retries after the first attempt: five attempts in all,
about 56 seconds of waiting.

## 8. FIFO groups (medium)

A wallet service must apply each user's top-ups and payments in order. One engineer proposes MessageGroupId
"wallet" for every message. What is wrong, and what should it be?

**Answer.** One group means one message at a time for all users — strict order nobody needed and a throughput
ceiling. Use the wallet or user id: order within each user, parallel across users. Add a MessageDeduplicationId
from the transaction id so a producer retry is dropped.

## 9. Review a template (harder)

    ApiFunction:
      Type: AWS::Serverless::Function
      Properties:
        Handler: api.handler
        Timeout: 900
        Policies: [AmazonDynamoDBFullAccess]
        Environment:
          Variables: {GATEWAY_SECRET: sk_live_example_do_not_use}

Find three problems.

**Answer.** (1) A 900-second timeout on an API function: the HTTP API gives up at 30 seconds anyway, and hung calls
hold concurrency — use about 10. (2) AmazonDynamoDBFullAccess gives every table in the account; use
DynamoDBReadPolicy or DynamoDBCrudPolicy scoped to the one table. (3) A secret in the template ends up in Git and in
the console; put it in Secrets Manager and grant read on that secret only.`,
    mcqs: [
      mcq('A function runs at 1,024 MB for 400 ms per call. How many GB-seconds do 500,000 calls use?', [
        ['200,000 GB-seconds', true],
        ['400,000 GB-seconds', false],
        ['204,800 GB-seconds', false],
        ['500,000 GB-seconds', false],
      ], '1 GB × 0.4 s = 0.4 GB-s per call, times 500,000 is 200,000. 400,000 doubles the duration, 204,800 wrongly treats 1,024 MB as 1.024 GB (Lambda counts 1,024 MB as 1 GB), and 500,000 counts one GB-second per call regardless of duration.'),
      mcq('Which schedule expression runs an EventBridge rule at 09:00 IST every day?', [
        ['cron(30 3 * * ? *)', true],
        ['cron(0 9 * * ? *)', false],
        ['cron(30 14 * * ? *)', false],
        ['rate(9 hours)', false],
      ], 'Rule cron expressions are UTC and IST is UTC+5:30, so 09:00 IST is 03:30 UTC. cron(0 9 ...) fires at 14:30 IST, 14:30 UTC is 20:00 IST, and rate(9 hours) runs every nine hours from creation rather than at a time of day.'),
      mcq('KiranaKart\'s refund consumer has a 120-second timeout. What is the smallest queue visibility timeout that follows AWS\'s guidance?', [
        ['720 seconds', true],
        ['120 seconds', false],
        ['180 seconds', false],
        ['43,200 seconds', false],
      ], 'The guidance is at least six times the function timeout: 6 × 120 = 720. Equal to the timeout leaves no margin for batch windows and retries, 180 is only 1.5 times, and 12 hours is the maximum allowed, not the smallest that works.'),
      mcq('A Retry has IntervalSeconds 3, BackoffRate 2.0, MaxAttempts 5 and MaxDelaySeconds 20. What is the wait before the fifth retry?', [
        ['20 seconds, because 48 is capped by MaxDelaySeconds', true],
        ['48 seconds, because each wait doubles from three onwards', false],
        ['15 seconds, because three is added for each retry made', false],
        ['3 seconds, because MaxDelaySeconds resets the backoff', false],
      ], 'The waits are 3, 6, 12, 24 and 48, and MaxDelaySeconds caps each at 20, so the fourth and fifth are 20. Ignoring the cap gives 48, adding three is linear backoff, and the cap limits waits rather than resetting them.'),
      mcq('A food-delivery app needs each rider\'s location updates in order but riders in parallel. Which MessageGroupId should its FIFO queue use?', [
        ['The rider id, so order holds per rider and riders run in parallel', true],
        ['One fixed value, so every update in the system is in a single order', false],
        ['A random UUID per message, so the queue spreads load most evenly', false],
        ['The city name, so updates from one city stay together in one group', false],
      ], 'Ordering is per group, so the rider id gives exactly the order needed and parallelism across riders. One fixed group serialises everyone, random groups give no ordering, and a city group serialises thousands of riders who do not need it.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_SERVERLESS_INTERVIEW_QUESTION',
    notes: `Four questions cloud and DevOps interviewers in Bengaluru and Hyderabad really ask about serverless, with an
answer that would get you to the next round and the follow-up that comes when you answer well. Say the trade-off
out loud; "it depends" without saying on what scores nothing.

## Q1. "When would you not use Lambda?"

**Model answer.** "Lambda is great for spiky, event-driven, short work: an API with uneven traffic, processing
uploads, queue consumers, scheduled jobs. I'd not use it for work over 15 minutes, which is its hard limit; for
steady high load where a container fleet is cheaper — I'd model both in the calculator; for anything holding
long-lived connections or local state; for GPUs; or when hundreds of concurrent functions would open connections
to a small relational database, unless I put RDS Proxy in front. And I would watch cold starts on
a latency-critical path."

**Follow-up: "Our checkout API's p99 must be under 150 ms. What about cold starts?"** "First measure: on a
lean Python function the init is usually small, and most requests hit warm environments. Keep the package small,
avoid heavy imports at module level, create clients once. If p99 still breaks, provisioned concurrency on the live
alias keeps environments initialised; SnapStart is another option on recent Python runtimes. I'd size provisioned
concurrency from rate times duration at peak, and schedule it up before a sale."

## Q2. "How do you make an SQS consumer reliable?"

**Model answer.** "Assume at-least-once delivery. The consumer is idempotent: a conditional write keyed on the
business id before the side effect, so a redelivery is skipped. Visibility timeout at least six times the function
timeout. A redrive policy to a DLQ with a sensible maxReceiveCount, an alarm on DLQ depth above zero, and a
redrive once the bug is fixed. Partial batch responses so one bad record doesn't replay the batch. And an alarm on
the age of the oldest message so I know when we fall behind."

**Follow-up: "The side effect is a call to a payment gateway. Your write succeeds, then the call times out. Now
what?"** "I don't know whether the charge happened. So I store PENDING before calling and pass the order id as the
gateway's idempotency key. On retry, PENDING means 'ask the gateway for this order's status', not 'charge again'.
If the gateway doesn't support idempotency keys, I'd reconcile against its settlement report."

## Q3. "Design order intake for a sale day with fifty times normal traffic."

**Model answer.** "Separate accepting an order from processing it. API Gateway with route throttles sized to what
we can accept, a small Lambda that validates and puts the order on SQS, returning 202 with an order id. Consumers
drain the queue with a maximum concurrency set from what the database can take; the queue absorbs the spike. Order
events go to EventBridge for loyalty, riders and analytics. Reserved concurrency so intake can't starve payments.
Before the sale: check the Lambda and API Gateway quotas, raise them through Service Quotas if needed, load-test in
a staging account, and pre-warm with provisioned concurrency on the intake function."

**Follow-up: "The database is down for ten minutes in the middle of the sale."** "Intake keeps accepting into the
queue. Consumers fail and messages return; I'd rather they back off than burn into the DLQ, so maxReceiveCount is
high enough to cover an outage of that length, or I turn the mapping off and on again. When the database is back,
the backlog drains at the capped concurrency. Customers see 'order received' and a short delay instead of errors."

## Q4. "Step Functions or events between services — how do you choose?"

**Model answer.** "Events for 'this happened, whoever cares can react': publisher and subscribers stay independent.
Orchestration for a business process with ordered steps, timeouts and compensation, like reserve-charge-assign with a
release on failure. Step Functions gives me Retry and Catch per step and a visual history showing where each
order is, which choreography makes hard."

**Follow-up: "Standard or Express?"** "Standard for long or money-moving flows: exactly-once steps, up to a year,
90 days of visual history, priced per state transition. Express for high-volume short flows under five minutes,
at-least-once, priced by requests and duration. I'd compare them for our volume in the calculator."`,
    mcqs: [
      mcq('An interviewer asks how you would protect a small RDS database from hundreds of concurrent Lambda consumers. Which answer is strongest?', [
        ['Cap the queue mapping\'s maximum concurrency and use RDS Proxy for pooling', true],
        ['Raise the account\'s regional Lambda quota so throttling never happens at all', false],
        ['Switch every consumer to provisioned concurrency so connections stay open', false],
      ], 'Capping concurrency limits connections and RDS Proxy pools them, so the database sees a bounded load. A higher quota allows even more connections, and provisioned concurrency keeps environments warm without limiting how many connect.'),
      mcq('Asked about a payment call that timed out after your idempotency record was written, what should your answer include?', [
        ['A PENDING state and the gateway\'s idempotency key, then checking status on retry', true],
        ['Deleting the record and charging again, because a timeout means it never went through', false],
        ['Sending the message to the DLQ straight away so that a person can charge it by hand', false],
      ], 'A timeout leaves the outcome unknown, so the retry must ask the gateway for the order\'s status, protected by its idempotency key. Charging again risks a double charge, and sending every timeout to a human does not scale on a sale day.'),
      mcq('For a sale day at fifty times normal traffic, what is the core idea an interviewer listens for?', [
        ['Accept orders into a queue fast, and process them at a controlled rate', true],
        ['Call every downstream service synchronously so failures show up at once', false],
        ['Increase every function\'s memory to the maximum so each call is quicker', false],
      ], 'Decoupling intake from processing lets the queue absorb the spike while consumers work at what the database can bear. Synchronous calls spread one slow dependency to checkout, and more memory does not bound load on downstream systems.'),
    ],
  },
  /* ── MINI_PROJECT ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_SERVERLESS_MINI_PROJECT',
    notes: `## The scenario

**TazaBasket** (fictional) delivers groceries and fresh vegetables in Chennai and Coimbatore within thirty minutes.
Today a single Flask server takes orders, charges the customer, books a rider and sends the SMS, all inside one HTTP
request. During a Pongal sale the SMS provider slowed down, every checkout waited on it, the server ran out of
workers, and orders were lost with no record of which ones. The founders want an order pipeline that keeps
accepting orders when something downstream is slow, never loses or double-processes one, and can be rebuilt from a
repository. You are building it on AWS in Mumbai (ap-south-1), serverless end to end.

## What the founders asked for, and what it means

- "Checkout must never wait for SMS or riders." The API only validates and enqueues; it answers 202 with an order
  id in well under a second.
- "Never lose an order, never charge twice." SQS between the API and processing; an idempotent consumer keyed on
  the order id; a dead-letter queue with an alarm for orders that keep failing.
- "Other teams want to know about orders." Processing publishes OrderAccepted and OrderRejected events to a custom
  EventBridge bus; the notification and rider teams own their rules.
- "We must be able to rebuild it." One SAM template (or CDK/Terraform if you prefer — say why), two environments
  from the same template, nothing created by hand.
- "No surprises on the bill." A budget alarm before anything is created; everything torn down after the demo.

## Data you are given

- Order request: {"items": [{"sku": "TOMATO-1KG", "qty": 2}], "pincode": "600040", "slot": "18:00-18:30"}.
- Served pincodes: a list of about forty Chennai and Coimbatore pincodes (make up a plausible list; put it in a
  JSON file loaded at init).
- Expected load: about 5 orders a second normally, about 150 a second in the first ten minutes of a sale.
- Downstream: a "stock service" you fake with a DynamoDB table of SKUs and quantities.

## Architecture to build

1. **HTTP API** with POST /orders and GET /orders/{orderId}, a JWT authoriser (a Cognito user pool, or for the moto
   version an authoriser configuration plus a handler that reads claims), CORS for one web origin, and route
   throttles you justify from the load numbers.
2. **CreateOrder function**: validates the body, takes the customer id from the token, writes the order as
   RECEIVED, sends a message to the orders queue, returns 202.
3. **Orders queue** (standard) with a visibility timeout of six times the consumer's timeout and a redrive policy
   to a DLQ; a CloudWatch alarm on DLQ depth above zero.
4. **ProcessOrder function**: event source mapping with partial batch responses and a maximum concurrency;
   idempotent with a conditional write; reserves stock; sets the order ACCEPTED or REJECTED; puts an event on the
   bus; checks FailedEntryCount.
5. **EventBridge bus** tazabasket-orders with two rules: OrderAccepted to a notifications queue (stand-in for
   SMS), and OrderAccepted with total ≥ 500 to a loyalty queue. Queue policies that let EventBridge deliver.
6. **Optional stretch:** replace ProcessOrder's steps with a Step Functions workflow (reserve, charge stub,
   assign-rider stub, release on failure) started by the queue consumer, with the order id as the execution name.

## Safety and cost rules (read before milestone 1)

1. Create an AWS Budget with an email alert at a small amount before creating anything. Screenshot it.
2. Build and test everything first against **moto** and plain Python — free and repeatable.
3. A live deploy is optional and short: sam deploy to a dev stack, run the demo, then sam delete and show the
   stack gone. Set log group retention so logs do not accumulate.
4. No real keys, account ids or secrets in the repository; use 123456789012 and fake values in documents. No
   function role with full-access managed policies.

## Deliverables

1. **template.yaml** (SAM) with Globals, a Stage parameter, per-function policy templates, the queue, DLQ, table,
   bus, rules, alarm and outputs. A script that parses it with a CloudFormation-tag-aware YAML loader and checks
   that every !Ref and !GetAtt names a real resource; sam validate --lint output if you have the SAM CLI.
2. **src/** with the two handlers, business logic in plain functions.
3. **tests/** with pytest and moto: a valid order flows to ACCEPTED and an event is put; a duplicate message
   does not reserve stock twice; a malformed message is the only one reported in batchItemFailures; a poison
   message reaches the DLQ after maxReceiveCount receives; an OrderAccepted event with total 640 reaches the
   loyalty queue and one with "total": "640" does not. Paste the real pytest output.
4. **load-and-limits.md**: concurrency for both functions at normal and sale load (rate × duration), the reserved
   or maximum concurrency you chose and why, the route throttles, and which quotas you would check in Service
   Quotas before a sale.
5. **README**: a diagram, decisions and trade-offs, one thing moto accepted that real AWS refuses (for example, a
   Lambda Timeout above 900 seconds, or a fan-out without a queue policy), the live demo evidence and teardown
   proof if you deployed, and a runbook: "orders are stuck" — what to check, in order.

## Milestones

- **Day 1 — intake.** Budget alarm; the CreateOrder handler with unit tests on hand-built API events (200, 400,
  202 paths); the API defined in the template.
- **Day 2 — queue and consumer.** Queue, DLQ, ProcessOrder with idempotency and partial batch responses; the
  duplicate and poison tests passing in moto.
- **Day 3 — events.** Bus, rules and queue policies; the event tests including the string-versus-number case.
- **Day 4 — template and limits.** Complete template, parse check, load-and-limits.md, alarms.
- **Day 5 — evidence.** README and runbook; optional live deploy of under an hour with teardown proof.

## How it will be judged

A reviewer runs your tests, reads your template and asks "what happens if this fails?" at every arrow in your
diagram. A pipeline whose every failure has a named destination and an alarm scores higher than a bigger one
nobody can explain.`,
    assignment: {
      title: 'An Event-Driven Order Pipeline: TazaBasket on AWS Serverless',
      description: 'Build, test and document an order pipeline for a Chennai grocery delivery start-up: an HTTP API that accepts orders and returns 202, an SQS queue with a dead-letter queue, an idempotent Lambda consumer with partial batch responses, EventBridge rules that notify downstream teams, and one SAM template that deploys it all per environment.',
      instructions: `1. Create an AWS Budget alert before building anything, and keep secrets and real account ids out of the repository.
2. Write template.yaml (SAM) with Globals, a Stage parameter, the HTTP API with a JWT authoriser, CORS and justified route throttles, two functions with per-function policy templates, the orders queue (visibility timeout six times the consumer timeout) with a redrive policy to a DLQ, the orders table, the tazabasket-orders bus and its two rules, queue policies for EventBridge, a DLQ alarm and outputs.
3. Write a parse check that loads the template with a CloudFormation-tag-aware YAML loader and confirms every !Ref and !GetAtt names a resource or parameter.
4. Implement CreateOrder (validate, customer id from the token, write RECEIVED, enqueue, return 202) and ProcessOrder (conditional write for idempotency, stock reservation, ACCEPTED or REJECTED, put_events with a FailedEntryCount check, partial batch responses).
5. Write pytest tests with moto for: a valid order reaching ACCEPTED with an event; a duplicate message not reserving stock twice; a malformed record being the only batch failure; a poison message reaching the DLQ; the loyalty rule matching a numeric total and not a string one. Paste the real output.
6. Write load-and-limits.md with concurrency at normal and sale load, the concurrency caps and throttles you chose, and the quotas to check before a sale.
7. Finish the README: diagram, trade-offs, one moto-versus-AWS difference, live-demo and teardown evidence if deployed, and an "orders are stuck" runbook in checking order.`,
      rubric: [
        { criterion: 'Intake API', description: 'Validates input, takes identity from the token, enqueues and returns 202 quickly; JWT authoriser, exact CORS origins and route throttles justified from the load numbers.', maxPoints: 15 },
        { criterion: 'Queue, DLQ and consumer reliability', description: 'Visibility timeout of six times the consumer timeout; redrive to a DLQ with an alarm; idempotent consumer keyed on the order id; partial batch responses; maximum concurrency chosen from the downstream limit.', maxPoints: 25 },
        { criterion: 'Events and routing', description: 'Custom bus with correct patterns and targets; FailedEntryCount checked; queue policies that let EventBridge deliver; numeric matching understood and tested.', maxPoints: 15 },
        { criterion: 'Template and permissions', description: 'One SAM template for every environment; per-function least-privilege policy templates; no secrets in the template; the parse check passes and references are all valid.', maxPoints: 20 },
        { criterion: 'Tests and evidence', description: 'pytest with moto covers the happy path, duplicates, a malformed record, the DLQ and event matching, with real output pasted; a moto-versus-AWS difference identified; teardown proof if deployed.', maxPoints: 15 },
        { criterion: 'Limits, diagram and runbook', description: 'Concurrency computed from rate and duration; quotas to check named; a clear diagram; an "orders are stuck" runbook that checks API, queue age, DLQ, function errors and throttles in order.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    mcqs: [
      mcq('TazaBasket expects 150 orders a second at a sale opening, and ProcessOrder takes 0.4 seconds. How much concurrency will it use if nothing caps it?', [
        ['About 60 environments', true],
        ['About 150 environments', false],
        ['About 375 environments', false],
        ['About 4 environments', false],
      ], 'Concurrency is rate times duration: 150 × 0.4 = 60. 150 ignores duration, 375 divides by the duration instead of multiplying, and four confuses the duration with a count.'),
      mcq('The README must name one thing moto accepted that real AWS would refuse. Which example is genuine?', [
        ['Creating a Lambda function with a Timeout of 1,200 seconds', true],
        ['Sending to a FIFO queue without giving a MessageGroupId', false],
        ['Putting an event whose Detail field is not valid JSON', false],
        ['Querying a DynamoDB table on an attribute that is not a key', false],
      ], 'moto created a function with Timeout 1,200, which AWS rejects because the maximum is 900 seconds. moto did reject the other three, as AWS does: a missing MessageGroupId, malformed Detail, and a query missing the key schema element.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_SERVERLESS_CHECKPOINT',
    notes: `Ten questions across the topic: Lambda's execution model and limits, API Gateway, SQS and SNS, EventBridge and
Step Functions, and packaging, testing and observing a serverless app. Answer without notes; the result shows
which lesson to revisit.`,
    checkpoint: [
      mcq('Twenty requests arrive at the same instant for a function with no warm environments. What does Lambda do?', [
        ['Creates up to twenty environments, each running init then one request', true],
        ['Creates one environment and runs the twenty requests on threads inside it', false],
        ['Queues nineteen requests until the first environment finishes its work', false],
        ['Rejects nineteen of them, as only one cold start is allowed at a time', false],
      ], 'Each environment handles one request at a time, so concurrent requests scale out to more environments, each with its own init phase. Lambda does not multiplex requests on threads, does not queue synchronous calls behind one environment, and allows many cold starts at once within the concurrency quota.'),
      mcq('A CPU-heavy image function at 128 MB takes 8 seconds. Why might raising its memory make it faster at a similar cost?', [
        ['Lambda allocates CPU in proportion to the memory setting', true],
        ['More memory lets Lambda keep the image on a faster SSD', false],
        ['Higher memory settings are billed per request, not by time', false],
        ['Larger functions skip the init phase on each invocation', false],
      ], 'CPU scales with memory, so a CPU-bound function can finish proportionally faster, keeping GB-seconds roughly the same. Memory does not choose a disk, all settings are billed by GB-second, and init still happens per new environment.'),
      mcq('Which pairing of an API Gateway authorisation method with its use is correct?', [
        ['IAM authorisation with SigV4 for one AWS service calling another', true],
        ['API keys for proving a mobile user\'s identity on each request', false],
        ['A JWT authoriser for checking AWS credentials signed with SigV4', false],
        ['CORS settings for stopping unauthenticated users calling the API', false],
      ], 'IAM authorisation verifies SigV4-signed requests from AWS principals. API keys identify clients for quotas and are not identity, JWT authorisers validate OIDC tokens rather than SigV4 signatures, and CORS only tells browsers which origins may read responses.'),
      mcq('A consumer has a 60-second timeout. Which SQS settings follow the guidance for a Lambda-driven queue?', [
        ['Visibility 360 s, a redrive policy to a DLQ, long polling', true],
        ['Visibility 30 s, no DLQ, so failures retry for four days', false],
        ['Visibility 60 s, a DLQ with maxReceiveCount set to one', false],
        ['Visibility 12 hours, so that no message is ever seen twice', false],
      ], 'Six times the function timeout avoids handing a message out while it is still being processed, and a DLQ catches poison messages. 30 s causes duplicates and endless retries, maxReceiveCount 1 sends every transient failure to the DLQ, and 12 hours delays genuine retries for half a day.'),
      mcq('A new order should reach billing, notifications and analytics, each with its own retries. What is the standard AWS pattern?', [
        ['An SNS topic fanning out to one SQS queue per consumer', true],
        ['One SQS queue that all three consumers poll and share', false],
        ['A FIFO queue whose message groups are named per consumer', false],
        ['Three Lambda functions chained so each calls the next', false],
      ], 'SNS copies each message to every subscribed queue, so each consumer has its own buffer, retries and DLQ. Consumers sharing a queue split the messages between them, FIFO groups order messages rather than copy them, and chaining couples every consumer to the previous one.'),
      mcq('A consumer may see the same order twice. Which design makes the second delivery harmless?', [
        ['A conditional write on the order id before the side effect', true],
        ['A longer retention period so duplicates expire on the queue', false],
        ['Deleting the message before processing to avoid redelivery', false],
        ['A shorter function timeout so duplicates have no time to run', false],
      ], 'A conditional write (attribute_not_exists) records the work once and the repeat is skipped. Retention does not remove duplicates, deleting first loses the order if processing then fails, and a shorter timeout does not stop a second delivery.'),
      mcq('EventBridge cron rules are evaluated in UTC. A report must run at 23:00 IST daily. Which expression is right?', [
        ['cron(30 17 * * ? *)', true],
        ['cron(0 23 * * ? *)', false],
        ['cron(30 4 * * ? *)', false],
        ['cron(0 17 * * ? *)', false],
      ], 'IST is UTC+5:30, so 23:00 IST is 17:30 UTC. cron(0 23) runs at 04:30 IST the next day, 04:30 UTC is 10:00 IST, and 17:00 UTC is 22:30 IST.'),
      mcq('In a Step Functions workflow, the charge step fails after all retries and stock must be released. Which feature routes to the undo step?', [
        ['A Catch on the charge state with Next set to ReleaseStock', true],
        ['A Choice state placed before the charge to predict failure', false],
        ['A Retry with MaxAttempts set to zero on the charge state', false],
        ['A Wait state that pauses until the payment gateway recovers', false],
      ], 'Catch handles errors left after Retry and sends the execution to a compensating state. A Choice cannot see a failure that has not happened, zero retries just fails sooner, and a Wait does nothing about the stock already reserved.'),
      mcq('Which statement about testing a serverless app is accurate?', [
        ['moto tests handler logic but not IAM or queue policies, so a dev stack is still needed', true],
        ['sam local reproduces IAM, quotas and real queues, so no cloud tests are ever required', false],
        ['Unit tests cannot call handlers, because Lambda handlers run only inside AWS itself', false],
        ['Integration tests should run against production so they see real customer traffic', false],
      ], 'moto checks API calls and logic but does not enforce resource policies or quotas, so an integration test in a dev stack catches the rest. sam local emulates the runtime, not IAM or quotas; handlers are plain functions you can call in pytest; and tests belong in dev, not production.'),
      mcq('After a deploy, which alarm tells you first that a queue-driven Lambda is failing on some messages for good?', [
        ['The DLQ\'s visible-message count going above zero', true],
        ['The source queue\'s NumberOfMessagesSent increasing', false],
        ['The function\'s ConcurrentExecutions falling to zero', false],
        ['The API\'s count of 4xx responses rising slightly', false],
      ], 'Messages land in the DLQ only after failing maxReceiveCount times, so any message there is a permanent failure to act on. More sends is just traffic, zero concurrency may mean an idle queue, and 4xx responses are client errors at the API.'),
    ],
  },
];
