/**
 * Career-track content: SIEM, Detection and Triage (CY_SIEM_DETECTION), Cybersecurity Analyst, batch CY2.
 *
 * The SOC analyst's core loop on open-source tools: collect and normalise logs, search them in a SIEM
 * (Wazuh / Elastic, with Splunk SPL for comparison), write detections as Sigma rules, tune them with
 * numbers, triage what they raise, and measure the SOC. Strictly defensive: attack techniques are named
 * only where a detection needs them. Builds on batch CY1 (Windows event logs and Sysmon, Linux logs,
 * Suricata and Zeek), referred to by title and not re-taught.
 *
 * Every number and output shown was produced by running the code on synthetic data (pandas 3, pySigma 1.5
 * with the Elasticsearch backend). Wazuh rules, KQL and SPL were written from their documentation and not
 * run; the notes say so where they appear. Default skill SIEM_MONITORING; ck('THREAT_MODELLING', ...) marks
 * the questions about ATT&CK mapping and coverage.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_CY_SIEM_DETECTION_BUNDLES: PilotBundle[] = [
  /* ── LOG_PIPELINE ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_SIEM_DETECTION_LOG_PIPELINE',
    notes: `A SOC can only detect what it collects, and can only search together what it has made to look
alike. When an L2 analyst asks "what did 10.20.1.77 do between 14:00 and 14:15?", the answer sits in a
Linux server's \`auth.log\`, a Windows file server's Security log, the firewall and DNS — four formats, four
clocks. This lesson is the plumbing that turns them into one searchable timeline. You read most of these
sources one at a time in **Windows for Defenders**, **Hardening and Monitoring Linux Servers** and
**Network Detection with Suricata and Zeek**; now they go into one place.

## Which logs matter

Start from the questions you will have to answer during an incident, not from "collect everything":

| Source | Examples | Answers |
|---|---|---|
| Identity | Domain controller Security log (4624, 4625, 4768, 4769), VPN, SSO/MFA | Who logged in, from where, and did it fail? |
| Endpoint | Windows Security, Sysmon, PowerShell logs, Linux \`auth.log\`/journald, auditd, EDR | What ran, as whom, started by what? |
| Network | Firewall, DNS resolver, web proxy, Zeek, Suricata | Who talked to whom, and what did they look up? |
| Cloud | Provider audit logs, sign-in logs | Who changed what in the tenant? |
| Application | Internet-banking login, core banking admin actions | What did the business system see? |

For a small bank the first five to switch on are: authentication on domain controllers and VPN, process
creation (Sysmon event 1 or Security 4688 with command lines), DNS queries, firewall and proxy egress, and
admin changes (group membership, new accounts). They cover most of what an attacker must do.

## Collection

- **Agents** on the host (Wazuh agent, Elastic Agent, Winlogbeat) read local logs, buffer when the network
  is down and send over TLS. Best for endpoints and servers.
- **Syslog forwarding** (rsyslog, syslog-ng) from network devices and Linux. Use TCP with TLS; UDP syslog
  drops messages silently under load, and a gap you cannot see is the worst kind.
- **Windows Event Forwarding** collects from many Windows machines to one collector without a third-party agent.
- **API pulls** for cloud and SaaS audit logs, on a schedule, with a checkpoint so nothing is missed or doubled.

Whatever the route, monitor the pipeline itself: an alert when a source goes quiet ("no events from FS-01 for
30 minutes") catches broken agents, full disks and attackers who stop the logging service.

## Parsing and a common schema

A raw line is a string; a SIEM needs fields. Parsing turns
\`Failed password for invalid user admin0 from 10.20.1.77 port 50000 ssh2\` into
\`event.outcome=failure\`, \`user.name=admin0\`, \`source.ip=10.20.1.77\`. Then a **common schema** gives the
same meaning the same name everywhere. Elastic's ECS (Elastic Common Schema) is the open one most tools
speak: \`@timestamp\`, \`event.code\`, \`event.outcome\`, \`user.name\`, \`source.ip\`, \`host.name\`,
\`process.command_line\`, \`process.parent.executable\`. Without it, the Windows log says \`IpAddress\`, the
firewall says \`src\`, sshd says nothing at all, and every search has to know all three.

Normalise **values** as well as names: lower-case user names (Windows gives you \`Administrator\`,
\`ADMINISTRATOR\` and \`administrator\` for one account), strip \`COOPBANK\\\` into \`user.domain\`, cut host names
to one form (\`FS-01.coopbank.local\` → \`fs-01\`), and map outcomes to one vocabulary (\`success\`/\`failure\`).
Keep the untouched line in \`event.original\` so you can always go back to the evidence.

## Time is the field that breaks correlation

Store every timestamp in **UTC**, with the zone attached, and convert to IST only on screen. Two traps:

- Classic syslog (RFC 3164) lines carry no year and no zone: \`Oct 21 14:05:00\`. The collector must know the
  sender's zone. Read an IST server's line as UTC and the event lands five and a half hours late. RFC 5424
  syslog carries a full ISO timestamp with an offset — prefer it.
- Clocks drift. Synchronise every source to NTP; CERT-In's directions also ask organisations in India to
  synchronise ICT clocks to the NTP servers they name and to keep logs for a rolling period within India.
  Read the current directions for the exact terms rather than trusting a summary.

Keep two times: \`@timestamp\` (when it happened) and \`event.ingested\` (when the SIEM got it). A growing gap
between them is pipeline lag, and a detection that looks back only five minutes misses late events.

## The run: two formats, one schema

The lab generates an sshd \`auth.log\` from \`bank-web-01\` (IST, no year) and Windows Security events from
\`FS-01\` as JSON lines (UTC, \`Z\`). The parsers, cut down:

    SSH_RE = re.compile(r'^(?P<ts>\\w{3} \\d{2} \\d{2}:\\d{2}:\\d{2}) (?P<host>\\S+) sshd\\[\\d+\\]: '
                        r'(?P<result>Accepted|Failed) (?P<method>\\S+) for (?:invalid user )?(?P<user>\\S+) from (?P<ip>\\S+)')

    def parse_ssh(line, year=2026, tz=IST):
        m = SSH_RE.match(line)
        local = datetime.strptime(f"{year} {m['ts']}", '%Y %b %d %H:%M:%S').replace(tzinfo=tz)
        return {'@timestamp': local.astimezone(timezone.utc), 'event.dataset': 'linux.sshd',
                'event.outcome': 'success' if m['result'] == 'Accepted' else 'failure',
                'user.name': m['user'].lower(), 'source.ip': m['ip'], 'host.name': m['host'].lower()}

    def parse_win(line):
        e = json.loads(line)
        return {'@timestamp': datetime.fromisoformat(e['TimeCreated'].replace('Z', '+00:00')),
                'event.dataset': 'windows.security', 'event.code': str(e['EventID']),
                'event.outcome': {4624: 'success', 4625: 'failure'}.get(e['EventID'], 'unknown'),
                'user.name': e['TargetUserName'].lower(), 'source.ip': e['IpAddress'],
                'host.name': e['Computer'].split('.')[0].lower()}

Note \`event.code\` is a **string**: Elastic stores it as a keyword, and \`4625\` the number and \`"4625"\` the string
do not compare equal in pandas. The worked example puts both sources in one frame and finds what neither shows alone.

## Retention and volume

Size storage as events per second × average bytes per event × seconds per day × days kept, then add the index
overhead your SIEM documents. Keep recent data "hot" and searchable, older data on cheaper storage, and decide
retention from the law, the regulator (RBI expects banks to monitor and keep logs; check the current circulars
for co-operative banks) and how far back a slow intrusion may need you to look.`,
    workedExample: `**Task.** One branch PC is suspected of guessing passwords on two servers. Show it from both
sources together, in UTC.

After parsing, 104 events sit in one DataFrame (52 sshd, 52 Windows). The rows for the suspect IP, sorted
by \`@timestamp\`:

    @timestamp                event.dataset    event.code event.outcome user.name     source.ip  host.name
    2026-10-21 08:35:00+00:00 linux.sshd       NaN        failure       admin0        10.20.1.77 bank-web-01
    2026-10-21 08:35:07+00:00 windows.security 4625       failure       administrator 10.20.1.77 fs-01
    2026-10-21 08:35:20+00:00 linux.sshd       NaN        failure       admin1        10.20.1.77 bank-web-01
    2026-10-21 08:35:27+00:00 windows.security 4625       failure       administrator 10.20.1.77 fs-01

The two servers interleave seven seconds apart — one actor. Count failures per source in five-minute windows:

    fails = df[df['event.outcome'] == 'failure']
    win = (fails.set_index('@timestamp').groupby('source.ip').resample('5min')
           .agg(failures=('event.outcome', 'size'), hosts=('host.name', 'nunique'),
                users=('user.name', 'nunique')))
    print(win[win.failures >= 10])

    source.ip  @timestamp                 failures  hosts  users
    10.20.1.77 2026-10-21 08:35:00+00:00        24      2      4

Twenty-four failures, **two hosts, four user names** in five minutes: password guessing across servers
(ATT&CK T1110 Brute Force). Neither source alone shows "two hosts".

**What a time-zone mistake does.** Parse the same \`auth.log\` with \`tz=timezone.utc\`:

    ssh attack window if read as UTC : 2026-10-21 14:05:00+00:00 -> 2026-10-21 14:08:40+00:00
    ssh attack window if read as IST : 2026-10-21 08:35:00+00:00

The sshd half now sits five and a half hours after the Windows half. The grouped count drops to 12 per window,
\`hosts\` becomes 1, and a "10 failures on 2+ hosts" correlation never fires. Nothing errors; the data is simply
wrong. This is why the zone is decided per source, at collection, and tested with a known event.`,
    mcqs: [
      mcq('A branch server sends classic RFC 3164 syslog lines such as "Oct 21 14:05:00 bank-web-01 sshd[4410]: ...". What must the collector be told for the timestamps to be right?',
        [['The sender\'s time zone, and the year, because the line carries neither', true],
         ['Nothing, because syslog timestamps are always written in UTC by convention', false],
         ['The sender\'s port, because the port number encodes the source\'s locale', false],
         ['The NTP server the sender uses, so the collector can correct the drift', false]],
        'RFC 3164 lines have month, day and time only — no year, no zone — so the collector must supply both. They are not UTC by convention (most Linux servers log local time); NTP keeps the clock accurate but does not tell the collector which zone the text is in.'),
      mcq('Windows events for one account arrive as "Administrator", "ADMINISTRATOR" and "administrator". What should the pipeline do?',
        [['Lower-case user.name at ingest and keep the original line in event.original', true],
         ['Leave the values untouched so the evidence is not altered in any way at all', false],
         ['Drop the events whose case differs from the directory\'s spelling of the name', false],
         ['Store three separate user records so the analyst can see each spelling used', false]],
        'Normalising the value makes one search find all three; keeping event.original preserves the evidence, so nothing is lost. Leaving values raw splits one account into three in every count, and dropping events throws away real activity.'),
      mcq('The SIEM shows @timestamp 08:35 UTC but event.ingested 09:20 UTC for a batch of firewall events. What does the gap tell you first?',
        [['The pipeline is lagging, so short look-back detections may miss these events', true],
         ['The firewall clock is wrong by forty-five minutes and needs NTP fixing now', false],
         ['The events are forged, because genuine events are always ingested at once', false],
         ['Nothing useful, since event.ingested is only used for billing the SIEM', false]],
        'event.ingested is when the SIEM received the event; a 45-minute gap is lag in collection or parsing. A clock error would shift @timestamp itself, not create a gap to ingest time, and lag has ordinary causes (buffering, a backlog) rather than forgery.'),
    ],
    checkpoint: [
      mcq('A small co-operative bank can afford only five log sources in its first month. Which set gives the most detection value?',
        [['Domain controller and VPN authentication, process creation, DNS, firewall/proxy egress, admin changes', true],
         ['Web server access logs, printer spool logs, the HR system, the canteen ordering app and Wi-Fi association logs', false],
         ['Every application debug log, so that nothing an attacker does can possibly be missed later', false],
         ['Antivirus update logs, backup job logs, patch reports, licence logs and UPS power logs', false]],
        'Authentication, process creation, DNS, egress and admin changes cover what almost every intrusion must do: log in, run something, look something up, talk out and gain privilege. Debug logs are huge and low-value, and operational logs answer operations questions, not security ones.'),
      mcq('After normalisation, a search for source.ip 10.20.1.77 finds the Windows failures but none of the sshd failures from the same minutes. The sshd events are present in the index. What is the most likely cause?',
        [['The sshd parser wrote the IP to a different field name, so the shared field is empty', true],
         ['sshd does not record the source IP address of a failed login, so there is nothing there to find', false],
         ['The search is case-sensitive and the IP address was stored in upper case', false],
         ['Windows events always win when two sources report the same source address', false]],
        'If the events exist but a search on the common field misses them, the field mapping is the suspect — for example the parser left it in "ip" instead of "source.ip". sshd does log the source IP ("from 10.20.1.77"), and IP addresses have no case.'),
      mcq('Why should the pipeline alert when a source such as FS-01 sends no events for 30 minutes?',
        [['A quiet source may mean a broken agent or an attacker who stopped logging', true],
         ['Because the SIEM licence is charged per source and idle sources waste the money paid', false],
         ['So that the analyst can delete the source and reduce the volume the SIEM must store', false]],
        'Detections cannot fire on events that never arrive, so a quiet source is invisible unless the pipeline itself is watched; stopping a logging service is also a known defence-evasion step. Licensing and deletion have nothing to do with the detection gap.'),
    ],
  },

  /* ── SIEM_PLATFORM ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_SIEM_DETECTION_SIEM_PLATFORM',
    notes: `A SIEM (security information and event management) is four things joined together: collection,
parsing, a search store, and rules that turn matching events into alerts. You built the first two in the
last lesson. This one is the store and the rules, on two free stacks a student can run at home — Wazuh and
Elastic — with Splunk's SPL alongside, because many Indian MSSPs and banks run Splunk and interviewers ask for it.

## How the pieces fit

    agents / syslog / APIs  →  parsing (decoders, ingest pipelines)  →  index (search store)
                                          ↓
                                rules (match, count, correlate)  →  alerts  →  analyst queue / ticket

- **Wazuh**: an agent on each host sends to the Wazuh manager. The manager's *decoders* extract fields and its
  *rules* (XML, with levels from 0 to 15) decide what becomes an alert. Alerts and events go to the Wazuh
  indexer (built on OpenSearch) and are searched in the Wazuh dashboard.
- **Elastic**: Elastic Agent or Beats ship events, ingest pipelines parse them into ECS, Elasticsearch stores
  them, and Kibana searches them (KQL, Lucene, ES|QL) and runs detection rules.
- **Splunk**: forwarders send to indexers; searches are written in SPL; add-ons give the field names.

The tools differ; the work is the same: get events in with the right fields, search them, and let rules raise the
ones a human must see.

## A Wazuh rule (written from the documentation, not run in this lab)

Wazuh ships rules for sshd. A local rule builds on them — here, many failures from one source in two minutes.
Custom rules go in \`/var/ossec/etc/rules/local_rules.xml\` with IDs in the range Wazuh reserves for local rules
(from 100000):

    <group name="local,sshd,">
      <rule id="100100" level="10" frequency="8" timeframe="120">
        <if_matched_sid>5760</if_matched_sid>
        <same_source_ip />
        <description>sshd: 8 failed logins from one source in 2 minutes</description>
        <mitre><id>T1110</id></mitre>
      </rule>
    </group>

\`if_matched_sid\` names the built-in rule this one counts (5760 is sshd's "authentication failed" in the
current rule set, while a failure for a user that does not exist may match a different built-in rule — confirm
on your install by pasting a log line into \`/var/ossec/bin/wazuh-logtest\`, which
shows the decoder and every rule that matched). Always test a rule with \`wazuh-logtest\` before restarting the manager.

## Searching in Kibana: KQL

KQL (Kibana Query Language) filters documents; it does not count or group. Typical searches over ECS fields:

    event.code:4625 and winlog.event_data.LogonType:(3 or 10)
    source.ip:10.20.1.77 and event.outcome:failure
    process.name:powershell.exe and process.command_line:*-enc*
    not user.name:svc_backup and host.name:fs-01

Wazuh's dashboard is built on OpenSearch Dashboards, whose DQL is almost the same syntax. Remember that keyword
fields match exact values: \`user.name:Administrator\` does not find \`administrator\` unless the pipeline
lower-cased it or the mapping provides a case-insensitive field.

## Counting: ES|QL and the pandas twin

To count, group and threshold, use ES|QL in recent Kibana versions (not run here; check the function names
against your version's documentation):

    FROM logs-*
    | WHERE event.code == "4625" AND @timestamp > NOW() - 1 hour
    | EVAL bucket = DATE_TRUNC(5 minutes, @timestamp)
    | STATS failures = COUNT(*), users = COUNT_DISTINCT(user.name) BY source.ip, bucket
    | WHERE failures >= 10
    | SORT failures DESC

This is the same operation as the pandas \`groupby('source.ip').resample('5min')\` you ran in the last lesson, and
learning both pays: in an interview take-home you often get a CSV, not a SIEM.

## The same searches in SPL (not run)

Splunk field names depend on the add-on that parsed the data; with the Windows add-on they look like this:

    index=wineventlog EventCode=4625 (Logon_Type=3 OR Logon_Type=10)
    | bin _time span=5m
    | stats count AS failures dc(user) AS users BY _time src_ip
    | where failures >= 10

    index=sysmon EventCode=1 Image="*\\\\powershell.exe" CommandLine="*-enc*"
    | table _time host user ParentImage CommandLine

Read the shape: \`search terms | transforming command | filter\`. KQL is the first part only; ES|QL and SPL do all three.

## Correlation

A rule on one event ("4625") is noise; a rule on a pattern is a signal. The useful patterns are:

- **Threshold**: N events of a kind by one key in a window (failures per source).
- **Distinct count**: one source failing against many accounts — password spraying looks like 1–2 tries for
  each of 40 users, which a per-user threshold never sees.
- **Sequence**: A then B by the same key within a window — many failures and then a success for the same user
  (possible T1078 Valid Accounts after guessing).
- **Rarity**: first time this user logged in to this host, or a process never seen before on this server.

Each is a group-by on normalised fields. That is why the last lesson's normalisation is not optional: a
sequence across sshd and Windows needs the same \`user.name\` and \`source.ip\` in both.

## What the analyst does in the console

Pivot: from an alert, click the host, then the user, then the source IP, widening the time window each time.
Save searches you repeat, and write down the query with the time range in every note you hand on — "I searched
\`source.ip:10.20.1.77\` from 08:00 to 09:30 UTC and found 24 failures on 2 hosts" is evidence; "I checked the
SIEM" is not.`,
    workedExample: `**Task.** Write a "failures then success" correlation — many failures for a user and then a
successful login by the same user from the same source within ten minutes — and test it on the lab data.

In pandas over the normalised frame from the last lesson:

    auth = df.sort_values('@timestamp')
    fails = auth[auth['event.outcome'] == 'failure']
    oks   = auth[auth['event.outcome'] == 'success']
    pairs = oks.merge(fails, on=['user.name', 'source.ip'], suffixes=('_ok', '_fail'))
    pairs = pairs[(pairs['@timestamp_fail'] < pairs['@timestamp_ok']) &
                  (pairs['@timestamp_ok'] - pairs['@timestamp_fail'] <= pd.Timedelta('10min'))]
    hits = pairs.groupby(['user.name', 'source.ip', '@timestamp_ok']).size()
    print(hits[hits >= 5])

On the lab data this prints an empty series: the guessing from 10.20.1.77 never succeeded, and the ordinary
users' occasional single failures fall below five:

    Series([], dtype: int64)

That is the right answer, but prove the rule can fire at all. Append five failures 30 seconds apart and one
success three minutes later for a test user, and run again:

    user.name  source.ip   @timestamp_ok
    test.user  10.20.1.99  2026-10-21 10:03:00+00:00    5

A rule that has never fired on a positive test case is untested, not quiet.

The same correlation in ES|QL needs a join on time that is awkward to express; in practice teams use the SIEM's
sequence features (Elastic's EQL \`sequence by user.name [authentication where event.outcome == "failure"]
with runs=5 [authentication where event.outcome == "success"]\`, written from the documentation and not run) or a
Wazuh rule chained with \`if_matched_sid\` and \`same_user\`. Whichever you use, keep the pandas version as the
test oracle: the SIEM rule must agree with it on the same sample.`,
    mcqs: [
      mcq('An analyst writes the KQL search event.code:4625 and wants the number of failures per source IP in 5-minute windows. What is the problem?',
        [['KQL only filters documents; counting and grouping need ES|QL, an aggregation or a visualisation', true],
         ['KQL can count, but only when the field name is written entirely in upper-case letters', false],
         ['The event code must be quoted as a string or KQL returns every document in the index', false],
         ['KQL groups automatically by source.ip when the index contains Windows security events with that field', false]],
        'KQL is a filter language: it selects documents but has no stats or group-by. ES|QL (STATS ... BY), an aggregation in a visualisation, or SPL\'s stats does the counting. Field case and quoting are not the issue here.'),
      mcq('A Wazuh analyst has written a new local rule and wants to know, before restarting the manager, whether it matches a sample sshd line. What should they use?',
        [['wazuh-logtest, pasting the line to see the decoder and every rule that matches', true],
         ['A restart of the manager, then wait to see whether an alert appears in the dashboard', false],
         ['The dashboard\'s DQL bar, searching for the new rule id across the last seven days', false],
         ['tcpdump on the manager, to check that the agent\'s packets carry the expected rule', false]],
        'wazuh-logtest runs a line through the decoders and rules offline and shows which ones fire, so the rule is tested without touching production. Restarting first risks breaking the manager; DQL searches past alerts, which a new rule has not produced; packets do not carry rules.'),
      mcq('Password spraying tries one or two common passwords against forty different accounts from one source. Which correlation catches it when a per-user threshold of five failures does not?',
        [['Distinct count of user.name per source.ip in a window, alerting on many users', true],
         ['A per-user threshold lowered to one failure, so every typo becomes an alert', false],
         ['A sequence rule that needs a success to follow five failures for one account', false],
         ['A rarity rule on the process that the domain controller ran to check passwords', false]],
        'Spraying spreads attempts thinly across users, so any per-user count stays low; counting distinct users per source shows one source touching many accounts. Lowering the threshold to one drowns the queue, and a sequence needs several failures for one user, which spraying avoids.'),
    ],
    checkpoint: [
      mcq('An L1 analyst\'s escalation note says "Checked the SIEM, saw failures from the branch PC." What should it say instead?',
        [['The exact query, the time range in UTC, and the counts it returned, such as 24 failures on 2 hosts', true],
         ['A screenshot of the SIEM home page showing that the analyst was logged in at the time', false],
         ['Only the alert ID, because the L2 analyst can always re-run whatever search is needed', false],
         ['A longer description of the branch, its staff and its opening hours so that L2 understands the business context', false]],
        'A query, a time range and a count are reproducible evidence; L2 can re-run them and build on them. A screenshot of the home page proves nothing, and an alert ID alone forces L2 to redo the work and may not reproduce the same view.'),
      mcq('In a Splunk search "index=wineventlog EventCode=4625 | bin _time span=5m | stats count BY _time src_ip | where count >= 10", what does the part after the first pipe do?',
        [['It puts events in 5-minute buckets, counts each source per bucket and keeps counts of 10 or more', true],
         ['It filters the raw events down to those whose own count field already holds a value of ten or more', false],
         ['It reindexes the data in 5-minute files so that the next search will run faster', false],
         ['It forwards the matching events to the source IP so that the host can block them', false]],
        'bin groups _time into 5-minute buckets, stats count BY _time src_ip counts each source in each bucket, and where filters the counted rows. Raw events have no count field before stats creates it, and SPL searches neither reindex nor send anything to hosts.'),
      mcq('A Wazuh local rule uses if_matched_sid with the built-in sshd failure rule, frequency 8 and timeframe 120, plus same_source_ip. When does it fire?',
        [['When the sshd failure rule has matched 8 times from one source IP within 120 seconds', true],
         ['When any 8 sshd lines of any kind arrive within 120 minutes from all sources together', false],
         ['When one sshd failure arrives and the source IP has appeared in 8 earlier alerts', false]],
        'frequency and timeframe count matches of the referenced rule within the window (timeframe is in seconds), and same_source_ip makes the count per source. It does not count every sshd line, does not use minutes, and does not look at earlier alerts.'),
    ],
  },

  /* ── DETECTION_ENGINEERING ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_SIEM_DETECTION_DETECTION_ENGINEERING',
    notes: `A saved search that someone remembers to run is not a detection. A detection is a written-down
idea — "this behaviour, seen in this data, means this, and here is what to do" — that runs on its own, is tested,
and is changed through review like code. That practice is **detection engineering**, and its common language
is **Sigma**: a vendor-neutral YAML format that converts to Elastic, Splunk, Wazuh-adjacent and many other
query languages, so one rule serves the whole SOC.

## Start from a behaviour, not an indicator

An IP address on a block-list changes tomorrow; a behaviour does not. "Office starts PowerShell with an encoded
command" catches every campaign that uses the trick, whatever its infrastructure. Write the hypothesis first:

- **Behaviour**: PowerShell launched with \`-EncodedCommand\` or a short form of it, which hides the script
  from a casual reader (ATT&CK T1059.001, PowerShell, under T1059 Command and Scripting Interpreter).
- **Data**: process creation with full command lines — Sysmon event 1 or Security 4688 with command-line
  auditing on (see **Windows for Defenders: Event Logs and Sysmon**).
- **Expected false positives**: software deployment and backup agents that wrap scripts this way.
- **Response**: decode the command (in a sandbox or with a decoder, never by running it), check the parent.

## The Sigma rule

    title: PowerShell Started with an Encoded Command
    id: 6f1c2a3e-1d0b-4c8a-9a51-2c5e7b0d4a11
    status: experimental
    description: Detects powershell.exe launched with -EncodedCommand (or a short form).
    tags:
      - attack.execution
      - attack.t1059.001
    logsource:
      category: process_creation
      product: windows
    detection:
      selection_img:
        Image|endswith:
          - '\\powershell.exe'
          - '\\pwsh.exe'
      selection_flag:
        CommandLine|contains:
          - ' -enc '
          - ' -encodedcommand '
          - ' -ec '
      condition: selection_img and selection_flag
    falsepositives:
      - Software deployment and backup agents that wrap their scripts in encoded commands
    level: medium

How to read it:

- **logsource** says which data the rule needs; the converter uses it to pick the index and field mapping.
- A **map** (several keys under one selection) means AND; a **list** of values means OR.
- **Modifiers** after \`|\`: \`contains\`, \`startswith\`, \`endswith\`, \`re\`, \`cidr\`, \`all\` (every list value
  must match), and \`windash\`, which expands \`-e\` to its \`/e\` and Unicode-dash spellings.
- String matches are **case-insensitive** by default, so \`-EncodedCommand\` and \`-encodedcommand\` both match.
- **condition** combines selections: \`selection and not filter\`, \`1 of selection_*\`, \`all of them\`.
- **id** is a UUID that never changes, so tickets and metrics can follow the rule through edits.

## Converting with pySigma

The rule is not useful until it becomes a query in your SIEM. pySigma does it, with a **backend** (the target
language) and a **pipeline** (the field mapping):

    from sigma.collection import SigmaCollection
    from sigma.backends.elasticsearch import LuceneBackend, ESQLBackend
    from sigma.pipelines.elasticsearch.windows import ecs_windows

    rules = SigmaCollection.from_yaml(open('rules/powershell_encoded.yml').read())
    print(LuceneBackend().convert(rules)[0])
    print(LuceneBackend(ecs_windows()).convert(rules)[0])

Real output, pySigma 1.5:

    (Image:(*\\\\powershell.exe OR *\\\\pwsh.exe)) AND (CommandLine:(*\\ \\-enc\\ * OR *\\ \\-encodedcommand\\ * OR *\\ \\-ec\\ *))
    (process.executable.caseless:(*\\\\powershell.exe OR *\\\\pwsh.exe)) AND (process.command_line:(*\\ \\-enc\\ * OR ...))

The first query uses Sigma's field names (\`Image\`, \`CommandLine\`) and finds **nothing** in an ECS index; the
\`ecs_windows\` pipeline rewrites them to \`process.executable\` and \`process.command_line\`. Forgetting the
pipeline is the most common reason a converted rule never fires. The same rule as ES|QL:

    from * metadata _id, _index, _version | where (ends_with(process.executable.caseless, "\\\\powershell.exe") or
      ends_with(process.executable.caseless, "\\\\pwsh.exe")) and (process.command_line like "* -enc *" or ...)

From the command line the same is \`sigma convert -t lucene -p ecs_windows rules/\` with sigma-cli (not run here).

## Mapping to ATT&CK

Tag what the rule actually sees. This rule sees execution through PowerShell, so \`attack.t1059.001\`; it does
not see how the attacker got in, so it does not get a phishing tag even if phishing usually comes first. The
tags feed the coverage map in **SOC Dashboards and Metrics**; a wrong tag makes the map lie. A second rule in
the lab, "Member Added to a Privileged Group" (events 4728/4732, target group Administrators or Domain Admins),
is tagged \`attack.t1098\` (Account Manipulation) and \`attack.persistence\`.

## Testing against labelled samples

A rule is tested like a function: inputs with known answers. The lab has 391 synthetic process events, 6 of them
labelled malicious. A small evaluator applies the rule's logic (field mapping, modifiers, case-insensitivity) to
each event and counts:

    original  {'alerts': 90, 'tp': 5, 'fp': 85, 'fn': 1, 'precision': 0.06, 'recall': 0.83}

Two problems in one line: 85 false alarms (the next lesson) and **one miss** — the worked example finds it.

## Keeping detections in Git

    detections/
      rules/windows/powershell_encoded.yml
      tests/powershell_encoded/positive/*.json   # must alert
      tests/powershell_encoded/negative/*.json   # must not alert
      pipelines/coopbank_fields.yml              # your own field mapping, if ECS is not enough

Every change is a pull request; CI converts every rule (a conversion error fails the build), runs the positive
and negative samples, and a second analyst reviews the logic and the false-positive notes. Move \`status\` from
\`experimental\` to \`test\` to \`stable\` as the rule earns trust in production.`,
    workedExample: `**Task.** The encoded-PowerShell rule has recall 0.83 on the labelled set. Find the miss and fix
the rule, without making precision worse.

List the malicious events the rule did not match:

    for e in events:
        if e['label'] == 'malicious' and not rule(e):
            print('MISSED:', e['process.command_line'][:40], e['user.name'], e['host.name'])

    MISSED: powershell.exe -e SQBFAFgAIAAoAE4AZQB3AC anil.m br-pc-07

powershell.exe accepts several shortened forms of \`-EncodedCommand\` — \`-e\`, \`-ec\`, \`-enc\` and longer
prefixes. The rule listed three spellings and the attacker used another. Two fixes:

1. Add \`' -e '\` to the list. Re-running the evaluator gives
   \`{'alerts': 91, 'tp': 6, 'fp': 85, 'fn': 0, 'precision': 0.07, 'recall': 1.0}\` — recall 1.0, one more alert,
   no new false positive. The trailing space matters: \`' -e'\` alone would also match \`-ExecutionPolicy\`.
2. Use \`CommandLine|windash|contains\`. pySigma expands it; for \`' -e '\` the Lucene output is
   \`process.command_line:(*\\ \\-e\\ * OR *\\ \\/e\\ * OR ...)\` plus three Unicode-dash variants, because
   PowerShell also accepts \`/e\` and typographic dashes.

Then add the missed event to \`tests/powershell_encoded/positive/\` so the miss can never come back unnoticed,
and write in the PR what was missed and why. This is the habit: every miss in production becomes a test case.

Precision is still 0.07 — 85 of 91 alerts are the backup and deployment agents. Fixing that is tuning, and it
gets its own lesson because doing it carelessly hides the attacks you just learned to catch.`,
    mcqs: [
      mcq('A Sigma rule converted with pySigma\'s Lucene backend and no pipeline searches CommandLine:(*\\ \\-enc\\ *). The Elastic index stores ECS fields. What happens?',
        [['The query returns nothing, because the ECS index has process.command_line, not CommandLine', true],
         ['The query works, because Elasticsearch maps Sigma\'s generic field names to ECS fields automatically', false],
         ['The query fails with a syntax error, because Lucene does not support wildcards', false],
         ['The query returns every document, because an unknown field matches all values', false]],
        'Without a pipeline the backend keeps Sigma\'s generic field names; Elasticsearch does not translate them, so a search on a field no document has returns zero hits silently. Lucene supports wildcards, and an unknown field matches nothing, not everything.'),
      mcq('In a Sigma detection, a selection has Image|endswith with two values and CommandLine|contains with three values. How do they combine?',
        [['Image matches either value AND CommandLine matches any one of the three', true],
         ['Image matches both values AND CommandLine matches all three values together', false],
         ['Image matches either value OR CommandLine matches any one of the three values', false],
         ['Every one of the five values must appear somewhere in the same command line', false]],
        'In Sigma a list of values is OR and the keys of one map are AND. "All values must match" needs the |all modifier, and keys in one selection are never ORed together.'),
      mcq('Why does a detection repository run every rule\'s positive and negative samples in CI on each pull request?',
        [['So a change that breaks a rule or makes it noisy fails before reaching production', true],
         ['Because the SIEM refuses to load any rule that has not been signed by the CI system first', false],
         ['To produce the ATT&CK tags automatically from the samples that are stored with the rule', false],
         ['So that the samples are uploaded to the SIEM and appear as test alerts for the analysts', false]],
        'Samples are the rule\'s unit tests: positives prove it still fires, negatives prove a change did not add noise. SIEMs do not require CI signatures, tags are written by the engineer, and test samples should not be sent to analysts as alerts.'),
    ],
    checkpoint: [
      mcq('A Sigma rule matches CommandLine|contains: \' -enc \'. An attacker runs powershell.exe -EnCoDeDcOmMaNd ... with the full parameter name. Which statement is correct?',
        [['It is missed, but not because of case: \' -enc \' needs a space after enc, and the full name has none', true],
         ['It is missed because Sigma string matching is case-sensitive and the case differs', false],
         ['It is caught, because contains matches any value that starts with the same letters', false],
         ['It is caught, because Sigma expands every parameter to its full name before matching', false]],
        'Sigma matching is case-insensitive, so case is not the problem; but the value \' -enc \' includes a trailing space, and " -encodedcommand " continues with letters, so the substring is absent. That is why the rule lists the full name separately. contains is a substring test, and Sigma does not expand parameters.'),
      ck('THREAT_MODELLING', 'A rule fires when a user is added to the Domain Admins group (events 4728/4732). Which ATT&CK mapping fits what the rule actually observes?',
        [['T1098 Account Manipulation, under the persistence tactic', true],
         ['T1566 Phishing, since most intrusions in banks begin with an email', false],
         ['T1486 Data Encrypted for Impact, since admins can deploy ransomware', false],
         ['T1110 Brute Force, since admin passwords are usually guessed first', false]],
        'Map what the data shows: a change to a privileged group\'s membership is account manipulation used for persistence or privilege. Phishing, encryption and brute force may come before or after, but this rule cannot see them, and tagging them would make the coverage map claim detections that do not exist.'),
      mcq('A detection engineer edits a stable rule\'s logic. What should happen to its id field?',
        [['Keep the same UUID, so tickets, metrics and history still follow the rule', true],
         ['Generate a new UUID on every edit, so each version can be told apart in the SIEM', false],
         ['Replace it with the ATT&CK technique ID, so the rule is grouped with its technique', false]],
        'The id is the rule\'s permanent identity; versions are tracked in Git history and the date/modified fields. A new UUID on each edit breaks the link to past alerts and metrics, and technique IDs are shared by many rules, so they cannot be an identity.'),
    ],
  },

  /* ── TUNING ────────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_SIEM_DETECTION_TUNING',
    notes: `The encoded-PowerShell rule now catches all six malicious events — and raises 91 alerts to do it. An L1
analyst who closes 85 backup-agent alerts a day will close the 86th without reading it. That is **alert fatigue**,
and it is how real intrusions get "seen" by a SOC and still missed. Tuning fixes it; careless tuning creates a
blind spot that no dashboard shows. This lesson is about telling the two apart with numbers.

## The four outcomes

| | Rule fired | Rule did not fire |
|---|---|---|
| **Malicious** | true positive (TP) | false negative (FN) — the miss |
| **Benign** | false positive (FP) — the noise | true negative (TN) |

Add a fifth that analysts meet daily: the **benign true positive** — the rule worked exactly as written, and the
activity was authorised (the IT team's approved admin-group change). It is not a rule defect; it is a process
question (should approved changes carry a ticket number the rule can check?).

- **Precision** = TP / (TP + FP): of the alerts raised, how many were real. Drives analyst workload.
- **Recall** = TP / (TP + FN): of the real events, how many were caught. Drives what you miss.

Tuning trades one against the other. The job is to raise precision **without losing recall**, and to prove it.

## Baseline first

Before writing an exclusion, find out what "normal" is. Group the false positives by the fields that explain them:

    fp = [e for e in events if rule(e) and e['label'] == 'benign']
    Counter((e['process.parent.executable'].split('\\\\')[-1], e['user.name']) for e in fp)

    Counter({('agent.exe', 'svc_backup'): 60, ('CcmExec.exe', 'SYSTEM'): 25})

Two sources explain all 85: the bank's backup agent running as \`svc_backup\`, and the software-deployment
client running as \`SYSTEM\`. On real data, baseline over two to four weeks so weekly and month-end jobs appear.

## Allow-lists done safely

An exclusion should describe the benign activity **as narrowly as the data allows**, using fields an attacker
cannot easily choose:

- Combine fields: parent executable path **and** account (and host group, if you have it). One field alone
  is almost always too broad.
- Prefer fields the attacker does not control: the full parent image path over a command-line string (any
  attacker can add the text "backup" to a command line).
- Write down why, link the change ticket, and give the exclusion an owner and a review date.

Two versions, measured on the same 391 events:

    filter_backup:
      ParentImage|endswith: '\\CoopBackup\\agent.exe'
      User: 'svc_backup'
    filter_deploy:
      ParentImage: 'C:\\Windows\\CCM\\CcmExec.exe'
      User: 'SYSTEM'
    condition: selection_img and selection_flag and not filter_backup and not filter_deploy

versus the "quick" one an exhausted analyst writes:

    filter_accounts:
      User:
        - 'svc_backup'
        - 'SYSTEM'
    condition: selection_img and selection_flag and not filter_accounts

## The numbers

    original           {'alerts': 90, 'tp': 5, 'fp': 85, 'fn': 1, 'precision': 0.06, 'recall': 0.83}
    add -e short form  {'alerts': 91, 'tp': 6, 'fp': 85, 'fn': 0, 'precision': 0.07, 'recall': 1.0}
    narrow allow-list  {'alerts': 6, 'tp': 6, 'fp': 0, 'fn': 0, 'precision': 1.0, 'recall': 1.0}
    broad allow-list   {'alerts': 4, 'tp': 4, 'fp': 0, 'fn': 2, 'precision': 1.0, 'recall': 0.67}
       hidden by broad: svc_backup srv-03 cmd.exe
       hidden by broad: SYSTEM srv-01 WmiPrvSE.exe

Both tuned rules show **precision 1.0**. Looked at through the alert queue alone, they are equally good — the
queue cannot show you what never arrived. Only the labelled set reveals that the broad version is blind to a
stolen service account (T1078 Valid Accounts) and to anything that runs as SYSTEM — exactly what an intruder
who has gained a foothold looks like. Precision alone never justifies a tuning change; report recall next to it.

The narrow rule converts cleanly (pySigma, \`ecs_windows\`):

    ... AND (NOT (process.parent.executable.caseless:*\\\\CoopBackup\\\\agent.exe AND user.name:svc_backup))
        AND (NOT (process.parent.executable.caseless:C\\:\\\\Windows\\\\CCM\\\\CcmExec.exe AND user.name:SYSTEM))

## Thresholds are tuning too

For counting rules, sweep the threshold over the data and look at both columns. On the lab's authentication data
(failures per source per five minutes):

    threshold  1: alerts=20 true=1 false=19
    threshold  2: alerts= 1 true=1 false=0
    threshold 10: alerts= 1 true=1 false=0
    threshold 25: alerts= 0 true=0 false=0

Anywhere from 2 to 24 works here because synthetic data separates cleanly; production data will not. Choose the
threshold with headroom below the smallest real attack you have seen, not just above the noisiest benign day.

## Other levers

- **Severity**: keep the rule, lower its level, and let it add to a host's risk score instead of paging anyone.
- **Grouping and suppression**: one alert per host per hour, with a count, instead of sixty identical alerts.
- **Fix the source**: ask the backup team to stop using encoded commands; the best exclusion is one you no longer need.

Honesty about measurement: recall needs known-bad samples. Build them from your own past incidents and from
authorised adversary-emulation runs in a lab, keep them in the rule's test folder, and re-measure after every change.`,
    workedExample: `**Task.** The tuning ticket says "remove svc_backup from the PowerShell rule, it's noisy". Decide whether
to approve it.

1. **Measure the noise.** Group the rule's false positives by parent and account:
   \`('agent.exe', 'svc_backup'): 60\`. The noise is the backup agent, not the account as a whole.
2. **Measure the proposal.** An account-only exclusion for svc_backup and SYSTEM gives precision 1.0 but recall
   0.67: it hides \`svc_backup srv-03 cmd.exe\` — the service account used from a command shell on the core
   banking database server — and \`SYSTEM srv-01 WmiPrvSE.exe\`.
3. **Counter-propose.** Exclude parent path **and** account: precision 1.0, recall 1.0, 6 alerts instead of 91.
4. **Write it up in the PR:**

        Rule: PowerShell Started with an Encoded Command (6f1c2a3e-...)
        Change: exclude backup agent (parent ...\\CoopBackup\\agent.exe AND user svc_backup)
                and deployment client (parent C:\\Windows\\CCM\\CcmExec.exe AND user SYSTEM)
        Before: 91 alerts, precision 0.07, recall 1.0 (391 labelled events)
        After:   6 alerts, precision 1.00, recall 1.0
        Rejected: account-only exclusion, recall 0.67 (hides svc_backup from cmd.exe on srv-03)
        Owner: SOC detection team. Review: in 90 days or when the backup product changes.

5. **Add a negative test** (one backup-agent event that must not alert) and a **positive test** (svc_backup from
   cmd.exe that must alert), so a future "quick fix" fails CI.

The decision rests on the recall line, which the alert queue could never have shown.`,
    mcqs: [
      mcq('After tuning, a rule\'s alerts drop from 91 a day to 4 and every remaining alert is malicious. What must you check before calling the tuning a success?',
        [['Recall on a labelled set, because the queue cannot show attacks the exclusion now hides', true],
         ['Nothing more, because precision of 1.0 proves the rule is now as good as it can be', false],
         ['The average time analysts spend per alert, because fewer alerts must mean faster work', false],
         ['That the rule\'s severity was raised, because a quieter rule should page more urgently', false]],
        'Precision only describes alerts that fired; an over-broad exclusion can give precision 1.0 while dropping real attacks, as the account-only allow-list did (recall 0.67). Analyst time and severity are separate questions.'),
      mcq('A noisy rule fires on a nightly job. Which exclusion is the safest?',
        [['The job\'s full parent executable path AND its service account, with an owner and review date', true],
         ['Any command line that contains the word "backup", since the job\'s script name includes it', false],
         ['The service account alone, because the job always runs as that one account on every server', false],
         ['Every server in the data-centre range, because the job only ever runs on servers there', false]],
        'Combining fields the attacker cannot easily choose keeps the exclusion narrow, and an owner and review date stop it rotting. A command-line keyword is attacker-controlled, and an account-only or range-wide exclusion hides anything that account or those servers do.'),
      mcq('The IT team adds a user to the local Administrators group under an approved change ticket, and the privileged-group rule fires. How should the analyst classify it?',
        [['A benign true positive: the rule worked and the activity was authorised', true],
         ['A false positive, so the rule should be changed to ignore the IT team', false],
         ['A false negative, because the rule should have known the change was approved', false],
         ['A true positive that must be escalated to L2 as a confirmed incident', false]],
        'The rule saw exactly what it was written to see, and the activity was legitimate — a benign true positive. Calling it a false positive invites an exclusion for the IT team, which is precisely the account an intruder would want unwatched.'),
    ],
    checkpoint: [
      mcq('A rule raised 40 alerts: 10 were malicious. Two other malicious events in the same data were not alerted. What are its precision and recall?',
        [['Precision 0.25 and recall about 0.83', true],
         ['Precision 0.83 and recall 0.25', false],
         ['Precision 0.20 and recall about 0.75', false],
         ['Precision 0.25 and recall 0.20', false]],
        'Precision = TP/(TP+FP) = 10/40 = 0.25. Recall = TP/(TP+FN) = 10/(10+2) ≈ 0.83. The swapped pair confuses the two definitions; 0.20 and 0.75 come from dividing by the wrong totals.'),
      mcq('Two tuned versions of a rule both show precision 1.0 on last week\'s alerts. Version A excludes an account; version B excludes the account only when started by the backup agent\'s path. Which statement is right?',
        [['B is safer: the labelled set may show A missing the account used from another parent', true],
         ['A and B are equivalent, because identical precision on the same week means identical behaviour', false],
         ['A is safer, because a simpler exclusion is less likely to contain a mistake', false]],
        'Equal precision says nothing about what each hides. A ignores everything that account does, including misuse of a stolen credential from cmd.exe; B ignores only the known benign pattern. Simplicity does not beat a measured recall loss.'),
      mcq('A brute-force rule\'s threshold is being chosen from a sweep. At 1 failure there are 20 alerts (1 true); from 2 to 24 there is 1 alert (1 true). Which choice is best supported?',
        [['A low value in the clean range, such as 5, leaving headroom below the smallest real attack', true],
         ['24, the highest value that still catches the attack, to minimise any future noise', false],
         ['1, because alerting on every single failure is the only way to be certain that recall stays at 1.0', false],
         ['Any value at all, because threshold choice does not change precision or recall', false]],
        'Choosing just under the observed attack (24) means a slightly slower attacker is missed; a low value in the clean range keeps headroom. A threshold of 1 drowns the queue (precision 0.05), and the sweep itself shows thresholds do change the numbers.'),
    ],
  },

  /* ── ALERT_TRIAGE ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_SIEM_DETECTION_ALERT_TRIAGE',
    notes: `Triage is most of an L1 analyst's shift at an MSSP in Hyderabad or a bank's SOC in Mumbai: an alert
arrives, and within minutes you must decide whether it is real, how urgent it is, and who must act. Do it the same
way every time. A fixed routine is what lets you go fast without skipping the step that mattered.

## The routine

1. **Acknowledge** the alert. The SLA clock usually starts at creation and the acknowledgement time is measured.
2. **Read the rule.** What behaviour does it detect, what are its documented false positives, what is the raw
   event behind it? Open the event, not just the alert title.
3. **Enrich**: who (user: role, department, privileged?), what (asset: owner, role, criticality), where (source
   and destination: internal or external, reputation), and history (has this rule fired on this host or user
   before, and how was it closed?).
4. **Look around**: other alerts and events for the same host and user, an hour either side. One alert is a
   data point; three on one host in ten minutes is a story.
5. **Decide**: true positive, benign true positive, false positive, or "cannot tell — escalate".
6. **Act and write it down**: close with a reason that someone else can check, or escalate with a note L2 can act
   on without redoing your work.

## Enrichment in code

SOAR platforms and SIEM plugins do enrichment automatically, but the logic is plain. The lab's function adds
context from a CMDB export, a directory export and a local threat-intelligence list, and computes an explainable
priority:

    INTERNAL_NETS = [ipaddress.ip_network(n) for n in ('10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16')]

    def enrich(alert: dict) -> dict:
        out = dict(alert)                                   # never overwrite what the SIEM sent
        asset = ASSETS.get(alert.get('host.name', '').lower())
        out['asset'] = asset or {'note': 'NOT IN CMDB - unknown asset'}
        out['user'] = USERS.get(alert.get('user.name', '').lower()) or {'note': 'NOT IN DIRECTORY'}
        ip = alert.get('destination.ip')
        if ip:
            addr = ipaddress.ip_address(ip)
            out['destination'] = {'ip': ip, 'internal': any(addr in n for n in INTERNAL_NETS),
                                  'reputation': REPUTATION.get(ip, 'no match')}
        sev = {'low': 1, 'medium': 2, 'high': 3, 'critical': 4}[alert['rule.severity']]
        score = sev * (asset['criticality'] if asset else 3)
        # +3 unknown asset, +5 privileged account, +10 destination on the CTI list (see the full script)
        ...
        out['triage'] = {'score': score, 'queue': 'P1' if score >= 14 else 'P2' if score >= 8 else 'P3', 'why': reasons}
        return out

Three alerts from the same rule, three different answers (real output, trimmed):

    BR-PC-07 / anil.m (Cashier) -> 198.51.100.23 internal: false, "known C2 (feed: internal CTI, 2026-10-20)"
      score 14, P1, why: severity medium x criticality 2; destination on CTI list
    srv-03 (core banking DB server) / svc_backup (privileged service account) -> 10.30.0.5 internal: true
      score 15, P1, why: severity medium x criticality 5; privileged account
    lab-pc-99 / guest1
      score 9, P2, why: severity medium x criticality 3 (unknown asset); asset not in CMDB

Same rule, same severity — and the priority differs because of context. That is the point of enrichment. The
\`why\` list matters as much as the score: an analyst must be able to see and challenge the reasoning.

Two cautions. Decide "internal" from **your own** network list: Python's \`ip.is_private\` is also true for the
documentation ranges such as 198.51.100.0/24, which would mark that C2 address as internal. And never upload an
internal file or customer data to a public sandbox or lookup site to "check" it — that is a data leak, and it can
tell an attacker you have found their tool. Use the SOC's approved, private tools.

## Severity is not priority

Severity is a property of the rule ("encoded PowerShell is medium"). Priority is a property of this alert in this
context (medium on the core banking server with a privileged account is P1). SLAs attach to priority. Typical SOC
SLAs set a time to acknowledge and a time to escalate per priority — the numbers are each SOC's own contract.

## The escalation note

Write it so the L2 analyst can act without asking you a single question:

    Alert: PowerShell Started with an Encoded Command (rule 6f1c2a3e), P1
    When: 2026-10-21 08:41 UTC (14:11 IST)        Host: br-pc-07 (Guntur branch, teller workstation)
    User: anil.m (Cashier, not privileged)        Parent: WINWORD.EXE
    What I found: decoded command begins "IEX (New-Obj" (in-memory download-and-run pattern);
      host contacted 198.51.100.23 (internal CTI list: known C2, 2026-10-20) 40 s later;
      no other alerts on this host in the last 24 h.
    Searches: host.name:br-pc-07 08:00-09:30 UTC; destination.ip:198.51.100.23 last 7 days (only br-pc-07).
    Assessment: likely true positive, malicious document (possible T1566 Phishing then T1059.001).
    Not done: host not isolated, user not contacted (awaiting L2 per playbook).

Facts, sources, searches with time ranges, an assessment kept apart from the facts, and what you did **not** do.

## What L1 does not do

Do not run or "test" the suspicious command, do not contact the user if insider activity is possible, and do not
isolate a host or disable an account unless the playbook gives L1 that authority. Containment decisions belong to
the incident response process covered in the next topic, **Incident Response**.`,
    workedExample: `**Task.** Triage the BR-PC-07 alert from the notes and decide what to do.

1. **Raw event.** Parent \`WINWORD.EXE\`, command \`powershell.exe -nop -w hidden -enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoA\`.
   Word starting PowerShell is rare in a bank branch; \`-w hidden\` hides the window. Already suspicious.
2. **Decode safely.** The encoded command is base64 of UTF-16LE text. Decode it as data, never execute it:

        import base64
        print(repr(base64.b64decode('SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoA').decode('utf-16-le')))
        'IEX (New-Obj'

   The fragment is the start of "invoke an expression built from a new object" — a common pattern for
   downloading a script and running it in memory. You do not need the rest to know it is not a backup job.
3. **Enrich.** The function returns P1 (score 14): a cashier's workstation, not privileged, but the host talked to an
   address on the internal CTI list as known C2.
4. **Look around.** Search the host for an hour either side, and search the C2 address across all hosts for seven
   days. If another branch PC appears, the incident is bigger than one machine — say so in the note.
5. **Decide.** True positive, likely a malicious Office document. Not a benign true positive: no change ticket, no
   IT parent process, a user account rather than a service.
6. **Escalate** with the note shown in the lesson, within the P1 escalation SLA, and record the time.

Each step took a query or a lookup, not a guess. If the decode had shown a known internal script and the
destination had been the bank's own update server, the same routine would have closed it as a false positive with
the evidence attached — triage is as much about closing confidently as about escalating.`,
    mcqs: [
      mcq('Two alerts from the same medium-severity rule arrive together: one on a teller workstation, one on the core banking database server under a privileged service account. Which do you take first, and why?',
        [['The database server: same severity, but asset criticality and the privileged account raise its priority', true],
         ['The teller workstation, because alerts should always be handled strictly in arrival order', false],
         ['Either one, because both alerts have the same severity and so must carry exactly the same priority in the queue', false],
         ['Neither yet, because a medium alert should wait until a high one confirms there is a problem', false]],
        'Severity belongs to the rule; priority to the alert in context. Asset criticality and a privileged account make the server alert more urgent. Strict arrival order ignores impact, and waiting for a high alert lets a real intrusion progress.'),
      mcq('An analyst\'s enrichment marks 198.51.100.23 as internal because ipaddress.ip_address(ip).is_private returned True. What is wrong?',
        [['is_private is also true for reserved ranges such as documentation blocks; use your own network list', true],
         ['Nothing, because any address that is_private accepts must belong to the organisation', false],
         ['The function needs ip_network instead of ip_address, or it returns True for any input it is given', false],
         ['is_private only works for IPv6 addresses and guesses at random for IPv4 addresses', false]],
        'Python counts the documentation ranges (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24) and other reserved blocks as private, so an external lab or test address reads as internal. "Internal" should mean the networks your organisation actually owns.'),
      mcq('Which escalation note gives an L2 analyst the most to act on?',
        [['Facts with sources, searches with UTC time ranges, an assessment kept separate, and what was not done', true],
         ['A short summary saying the alert looks bad and that L2 should take a look at it as soon as possible', false],
         ['The full raw JSON of every event on the host for the day, so that L2 has absolutely everything', false],
         ['The analyst\'s guess of the attacker\'s identity and motive, so that L2 can contact the police', false]],
        'A good note lets L2 continue without repeating work: verified facts, reproducible searches, a clearly marked assessment and the actions not yet taken. A vague summary forces rework, a raw dump hides the signal, and attribution is neither L1\'s job nor useful at this stage.'),
    ],
    checkpoint: [
      mcq('During triage of an encoded-PowerShell alert, what is the safe way to learn what the command does?',
        [['Decode the base64 (UTF-16LE) as text in a script or approved tool, without executing it', true],
         ['Run the command on your own SOC workstation after unplugging its network cable, then watch it', false],
         ['Upload the full command and host name to a public online sandbox for a verdict', false],
         ['Ask the user to run it again while you watch the process tree in the EDR console', false]],
        'Decoding treats the command as data and is enough to judge intent. Running it, even offline, executes possibly malicious code; public sandboxes leak internal data and can alert the attacker; asking the user to rerun it repeats the compromise.'),
      mcq('A rule fires for a host that is in no CMDB record and a user who is not in the directory. How should enrichment treat the missing context?',
        [['Flag the gaps and raise priority, because an unknown asset or account is itself worth explaining', true],
         ['Drop the alert, since without context it cannot be triaged and must therefore be a false positive', false],
         ['Assign the lowest priority, since an unknown machine is unlikely to hold anything of value', false]],
        'An unmanaged host or an account no one recognises is a finding in itself — rogue devices and backdoor accounts look exactly like this. Missing context is a reason to look harder, not a reason to close or deprioritise.'),
      mcq('What separates an alert\'s severity from its priority in a SOC?',
        [['Severity is fixed by the rule; priority is set per alert from context such as asset and user', true],
         ['Severity is set by the L1 analyst; priority is set by the SIEM vendor for every one of its customers', false],
         ['They are the same value written in two places for compatibility with older SIEMs', false],
         ['Priority is fixed by the rule; severity changes as the analyst learns about the alert', false]],
        'The rule author assigns severity once (how bad the behaviour usually is); triage and enrichment assign priority to this alert (how urgent it is here). SLAs attach to priority. The other options reverse or merge the two.'),
    ],
  },

  /* ── SOC_METRICS ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_SIEM_DETECTION_SOC_METRICS',
    notes: `A SOC dashboard earns its screen space only if someone makes a different decision because of it:
tune this rule, write that detection, add a night-shift analyst, fix that log source. Metrics that cannot change a
decision are decoration, and metrics computed wrongly are worse — they change decisions in the wrong direction.

## The timestamps behind the time metrics

Every incident record needs these, in UTC:

- **first malicious activity** — usually known only after investigation, from the timeline
- **detected** — the alert or report that started the response
- **acknowledged** — an analyst picked it up
- **contained / resolved** — the threat was stopped / the incident closed

From them: **MTTD** (mean time to detect) = detected − first malicious; **MTTA** (to acknowledge) = acknowledged −
detected; **MTTR** = resolved − detected. "R" is used for respond, resolve and recover by different teams — write
your definition on the dashboard. All three are only as good as the timestamps, which is one more reason the log
pipeline keeps UTC.

## The run: eight incidents

    id      severity  ttd_h  tta_h  ttr_h
    INC-101     high   0.33   0.17   3.67
    INC-102   medium   7.50   0.25   3.00
    INC-103      low   0.08   1.92   3.92
    INC-104     high  59.00   0.17  33.00
    INC-105   medium   0.20   0.13   0.80
    INC-106      low   0.50   0.67   1.67
    INC-107     high   0.13   0.12    NaN
    INC-108   medium   1.00   0.25  14.75

    MTTD mean  8.59 h | median 0.42 h
    MTTR mean  8.69 h | median 3.67 h | open incidents: 1
    p90 TTD 22.95 h | p90 TTR 22.05 h (resolved only, n=7)

computed with

    h = lambda s: s.dt.total_seconds() / 3600
    df['ttd_h'] = h(df.detected - df.first_malicious)
    df['ttr_h'] = h(df.resolved - df.detected)

Read it carefully. The **mean** MTTD of 8.6 hours describes no incident: seven were found within 7.5 hours, and
one (INC-104, a Friday-night intrusion found on Monday) took 59. The median (0.42 h) is the typical case; the p90
and the outlier itself are the story. Report median, p90 and the count, and list the outliers by name — INC-104
says "nobody watches the weekend", which a mean hides.

## Open incidents and SLAs

INC-107 is still open. Leave it out of MTTR and report it separately ("1 open, high severity, detected 2026-10-09 13:08") with its age. Filling its missing
time with 0 gives

    MTTR with the open incident counted as 0 h: 7.60 h  (looks better, is false)

— the dashboard improves because work is unfinished. Per-severity medians and SLA compliance complete the picture:

    by severity (median hours):   high ttd 0.33 ttr 18.33 | low ttd 0.29 ttr 2.79 | medium ttd 1.00 ttr 3.00
    acknowledged within SLA: 7 of 8 (88%)    # SLA: high 15 min, medium 1 h, low 1 h

## Alert volume and disposition

Per rule, per week: alerts raised, and how they were closed (true positive, benign true positive, false positive).
Sort by false positives. The top five noisy rules are the tuning backlog for the next sprint — this one table pays
for the whole dashboard. A rule with zero alerts for months needs a positive test, not a medal.

Be careful with per-analyst numbers. "Alerts closed per hour" rewards closing without reading. Measure quality
instead: escalations that L2 confirmed, closures that later turned out to be wrong.

## Detection coverage against ATT&CK

List the techniques that matter to your organisation (from threat intelligence and past incidents), join your
rules to them by tag, and mark whether each rule is tested:

    cov = priority.merge(rules, on='technique', how='left')
    cov['status'] = cov.apply(lambda r: 'gap' if pd.isna(r.rule)
                              else ('covered, tested' if r.tested else 'covered, untested'), axis=1)

                                  technique                                rule            status
                             T1566 Phishing                                   -               gap
                       T1078 Valid Accounts                                   -               gap
                          T1110 Brute Force Failed Network or RDP Logon (count)   covered, tested
    T1059 Command and Scripting Interpreter          PowerShell Encoded Command   covered, tested
            T1486 Data Encrypted for Impact     Mass File Rename on File Server covered, untested
                 T1098 Account Manipulation    Member Added to Privileged Group   covered, tested

    tested coverage: 3 of 6 priority techniques

Two honest rules: a technique counts as covered only by a **tested** rule, and one rule rarely covers a whole
technique (the PowerShell rule covers one way of using T1059, not all of them). Colour-filled ATT&CK matrices that
count any tag as coverage flatter the SOC. The gaps (phishing, valid accounts) become next quarter's detection
work, and the next topic, **Threat Intelligence and Hunting**, goes deeper into choosing the techniques.

## One dashboard per audience

- **L1 shift**: open queue by priority, SLA timers about to breach, sources that went quiet.
- **SOC manager**: weekly MTTD/MTTA/MTTR medians and p90, noisy rules, alerts per analyst-hour, coverage gaps.
- **CISO / bank management**: incidents by severity and trend, coverage of priority techniques, the risks the
  gaps leave open. No raw alert counts — "1.2 lakh alerts this month" informs no decision.

Build each in pandas first so you know the numbers are right, then in Kibana Lens or the Wazuh dashboard.`,
    mcqs: [
      mcq('Seven incidents were detected within 8 hours and one took 59 hours, giving a mean time to detect of 8.6 hours. What should the dashboard show?',
        [['The median, the p90 and the count, with the 59-hour incident named as an outlier', true],
         ['Only the mean, since it already includes every incident that happened in the period', false],
         ['The mean with the 59-hour incident removed, since outliers distort the average', false],
         ['The maximum of 59 hours, since the worst case is the only one that really matters', false]],
        'The mean describes no real incident; median and p90 describe typical and bad cases, and naming the outlier exposes its cause (no weekend monitoring). Deleting the outlier hides the most important finding, and the maximum alone loses the typical case.'),
      mcq('One incident is still open. A colleague\'s MTTR code uses ttr.fillna(0).mean(). What is the effect?',
        [['MTTR falls, because the unfinished incident counts as resolved instantly', true],
         ['MTTR rises, because pandas treats a missing value as the largest possible time', false],
         ['Nothing, because mean() already skips missing values whether or not fillna is used', false],
         ['The code raises an error, because fillna cannot be applied to a timedelta column', false]],
        'fillna(0) turns the open incident into a 0-hour resolution, lowering the mean (7.60 h against 8.69 h in the lab). mean() alone would skip the NaN, but fillna runs first; and the column here is float hours, so no error occurs. Report open incidents separately.'),
      mcq('A manager proposes ranking L1 analysts by alerts closed per hour. What is the main risk?',
        [['It rewards closing alerts without investigating them, so real attacks get closed as noise', true],
         ['It is illegal under Indian labour law to measure the output of individual employees', false],
         ['It is impossible to compute, because SIEMs do not record who closed each alert', false],
         ['It always favours the night shift, because far more alerts arrive at night than during the day', false]],
        'A speed metric with no quality check pushes analysts to close fast, the opposite of what a SOC needs. Measure quality — escalations L2 confirmed, closures later reopened — alongside workload. SIEM and ticketing tools do record who closed what.'),
    ],
    checkpoint: [
      mcq('Which pair of timestamps defines time to detect for an incident?',
        [['The attacker\'s first action, known from the investigation, and the first alert', true],
         ['The alert being created in the SIEM and the analyst acknowledging it in the ticket queue', false],
         ['The analyst acknowledging the alert and the incident finally being closed in the ticket', false],
         ['The first log event ingested by the SIEM that day and the alert being created for it', false]],
        'Time to detect runs from when the attacker first acted to when the SOC knew. Alert to acknowledgement is time to acknowledge, acknowledgement to closure is part of response, and the first event of the day has nothing to do with the incident.'),
      ck('THREAT_MODELLING', 'A SOC\'s ATT&CK matrix shows T1486 Data Encrypted for Impact as covered because one rule carries the tag, but the rule has never been tested. How should coverage be reported?',
        [['As covered but untested, not counted until a positive test proves the rule fires', true],
         ['As fully covered, because the tag shows that a detection exists for that technique', false],
         ['As a gap, and the rule should be deleted because untested rules are worse than none', false]],
        'A tag shows intent, not capability; only a rule proven to fire on representative samples covers a technique. Reporting it as covered flatters the SOC, while deleting it throws away work that one test could validate.'),
      ck('THREAT_MODELLING', 'A bank\'s SOC has tested rules for T1110 Brute Force, T1059 and T1098, and nothing for T1566 Phishing or T1078 Valid Accounts, both of which appear in its past incidents. What should the coverage review conclude?',
        [['Phishing and valid-accounts detections are the priority gaps for the next detection work', true],
         ['Coverage is adequate, because three of the five techniques is above half of the list', false],
         ['The SOC should add more brute-force rules, because that technique is already well understood', false],
         ['Past incidents should be ignored when choosing techniques, because attackers change methods', false]],
        'Coverage is judged against the techniques that matter to this organisation, and techniques seen in its own incidents are the strongest evidence. A fraction says nothing about which gaps hurt; doubling down on covered techniques leaves the real gaps open.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_SIEM_DETECTION_DEBUGGING',
    notes: `Detection failures are quiet. A broken web page shows an error; a broken detection shows nothing, and
nothing is exactly what a quiet day looks like. So you debug detections by **testing with a known answer**: a
sample event that must match, a time window you know contains the attack, an incident whose numbers you can work
out by hand. Every case below was run on the lab data; the outputs are real.

## 1. The rule that never fires: field names

**Symptom.** The encoded-PowerShell Sigma rule is deployed to Elastic. Weeks pass with zero alerts, and nobody
notices — until an incident review finds the attack in the logs.

**Cause.** It was converted without a processing pipeline, so the query searches Sigma's generic fields
(\`Image\`, \`CommandLine\`) in an index that stores ECS fields (\`process.executable\`, \`process.command_line\`).
Run against the labelled events with no field mapping and with the ECS mapping:

    1. no field mapping : {'alerts': 0, 'tp': 0, 'fp': 0, 'fn': 6, 'precision': 0.0, 'recall': 0.0}
       ecs field mapping : {'alerts': 90, 'tp': 5, 'fp': 85, 'fn': 1, 'precision': 0.06, 'recall': 0.83}

**Fix.** Convert with the pipeline that matches your data (\`LuceneBackend(ecs_windows())\`, or
\`sigma convert -t lucene -p ecs_windows\`), and make CI run every rule's positive sample against the **converted**
query, not just the YAML. Search the index for one known field value before trusting any rule.

## 2. Case: the exact match that matches a third

**Symptom.** A hunt for failed logons to the built-in admin account finds 4 events from 10.20.1.77. The incident
timeline later shows 12.

**Cause.** Windows wrote the same account three ways, and the search compared raw strings exactly:

    2. exact "administrator" : 4 of 12
       lower() then compare   : 12 of 12

In Elastic the same thing happens on keyword fields, which match exact values.

**Fix.** Lower-case user names at ingest (the log pipeline lesson), or search a case-insensitive field if your
mapping provides one. Sigma rules are case-insensitive by default, but a hand-written KQL or pandas filter is not.

## 3. Time zone: the window that contains nothing

**Symptom.** The branch manager reports "suspicious logins around 2 pm". The analyst searches 14:00–14:15 and finds
nothing; the ticket is closed as "no evidence".

**Cause.** The SIEM stores UTC. 14:00 IST is 08:30 UTC.

    3. 14:00-14:15 read as UTC : 0 | as IST : 12

**Fix.** Convert the reported local time to UTC before searching (\`pd.Timestamp('2026-10-21 14:00',
tz='Asia/Kolkata')\`), or set the SIEM's display zone deliberately and write the zone in every note. Widen the first
search; a person's "around 2 pm" can be off by an hour.

## 4. Type: the event code that is a string

**Symptom.** A pandas detection \`df[df['event.code'] == 4625]\` returns no rows, although failures are visible.

**Cause.** The pipeline stores \`event.code\` as a string, as ECS does:

    == 4625   : 0
    == '4625' : 21

**Fix.** Compare with \`'4625'\`, and check \`df.dtypes\` before writing a filter. The same trap appears when
\`pd.read_json\` leaves \`@timestamp\` as text (it does in pandas 3 for this column name); convert with
\`pd.to_datetime(df['@timestamp'], utc=True, format='ISO8601')\` before resampling.

## 5. The allow-list that hides real attacks

**Symptom.** After tuning, the PowerShell rule has precision 1.0 and everybody is pleased. Two months later an
intruder using the backup service account is found by an outside party.

**Cause.** The exclusion was on the account alone:

    broad allow-list   {'alerts': 4, 'tp': 4, 'fp': 0, 'fn': 2, 'precision': 1.0, 'recall': 0.67}
       hidden by broad: svc_backup srv-03 cmd.exe
       hidden by broad: SYSTEM srv-01 WmiPrvSE.exe

**Fix.** Exclude the benign **pattern** (parent path and account), measure recall on labelled positives before
merging, and add the hidden events as positive tests. Review exclusions on a schedule; each has an owner.

## 6. The dashboard metric computed wrongly

**Symptom.** The monthly report shows MTTR improving from 8.7 to 7.6 hours. Nothing in the SOC changed.

**Cause.** The report's code filled the open incident's missing resolution time with zero:

    MTTR mean  8.69 h | median 3.67 h | open incidents: 1
    MTTR with the open incident counted as 0 h: 7.60 h  (looks better, is false)

A second fault sat beside it: the headline was a mean, which one 59-hour incident dominates (MTTD mean 8.59 h,
median 0.42 h).

**Fix.** Compute MTTR on resolved incidents only and report open ones with their age; show median and p90 with the
count; recompute one incident by hand and check the dashboard agrees.

## The habit

For every rule and every metric keep one case whose answer you know. Most of these faults pass review because the
query is syntactically fine — only a known answer shows that it is wrong.`,
    mcqs: [
      mcq('A converted Sigma rule has produced zero alerts in Elastic for a month. What is the first check?',
        [['Run the converted query against a known positive sample in the index to see whether it matches', true],
         ['Lower the rule\'s severity, because zero alerts usually means it is set too high to display', false],
         ['Delete the rule, because a month without alerts proves the behaviour does not occur here', false],
         ['Restart Elasticsearch, because rules stop firing when the cluster has been up for too long', false]],
        'Silence is ambiguous: no attacks, or a broken query (field names, case, type). A known positive settles it in minutes. Severity does not hide alerts, a month of silence proves nothing about the behaviour, and restarts do not fix query logic.'),
      mcq('A user reports suspicious activity "at about 2 pm" on 21 October. The SIEM stores UTC and shows UTC. Which first search window is best?',
        [['08:00 to 09:30 UTC, which covers about an hour around 14:00 IST', true],
         ['14:00 to 14:15 UTC, matching the time the user gave as closely as possible', false],
         ['13:30 to 14:30 UTC, an hour around the time the user gave, read as UTC', false],
         ['The whole of 21 October in IST, without converting, to be completely safe', false]],
        '14:00 IST is 08:30 UTC; a window around it allows for a vague report. Searching 14:00 UTC looks 5.5 hours late. Searching a whole day is not wrong but is slow and noisy for a first look, and the zone still has to be handled.'),
      mcq('df[df["event.code"] == 4625] returns no rows, yet failed logons are visible in df. What is the likely cause?',
        [['event.code holds strings such as "4625", so comparing with the integer 4625 matches nothing', true],
         ['pandas cannot compare a column with a constant and needs a for loop over the rows', false],
         ['Windows failed logons use event code 4624, so 4625 is simply the wrong code to filter on here', false],
         ['The DataFrame must be sorted by @timestamp before any filter returns rows', false]],
        'ECS keeps event.code as a keyword string, and "4625" != 4625 in pandas. Vectorised comparison works fine without loops, 4625 is the failed-logon code (4624 is success), and sorting does not affect filtering.'),
      mcq('A tuning change produced precision 1.0, but the labelled set shows recall dropping from 1.0 to 0.67. What should the reviewer do?',
        [['Reject it; ask for a narrower exclusion and add the missed events as tests', true],
         ['Approve it, because precision 1.0 means the analysts will never again see a false positive', false],
         ['Approve it, but raise the rule\'s severity so the remaining alerts get more attention', false],
         ['Reject it and remove the exclusion entirely, keeping all 85 false positives as they were', false]],
        'The change trades real detections for quiet, so it fails review; the fix is a narrower exclusion that removes the noise without the blind spot. Severity does not bring back hidden events, and going back to 85 false positives ignores that a better tuning exists.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_SIEM_DETECTION_PRACTICE',
    notes: `Ten exercises, easiest first. Do each on paper or in Python before reading the answer. Run the
Python ones on the lab data or on data you generate.

## 1. Parse and convert (easy)

The line \`Oct 21 23:50:12 bank-web-01 sshd[811]: Failed password for deploy from 10.20.1.41 port 50122 ssh2\`
comes from a server set to IST. Give \`@timestamp\` in UTC, \`event.outcome\`, \`user.name\` and \`source.ip\`.

**Answer.** 23:50:12 IST − 5:30 = **2026-10-21 18:20:12 UTC** (same date here; a line at 02:00 IST would move to
the previous day). \`failure\`, \`deploy\`, \`10.20.1.41\`.

## 2. KQL (easy)

Find failed Remote Desktop logons for the user \`priya.s\` on any host.

**Answer.** \`event.code:4625 and winlog.event_data.LogonType:10 and user.name:priya.s\` — LogonType 10 is
RemoteInteractive. Remember the field values must match the pipeline's normalisation (lower-case user).

## 3. A Sigma rule (medium)

Write a Sigma rule for "a local or domain user account was created" (Security event 4720) and map it.

**Answer.**

    title: User Account Created
    status: experimental
    tags:
      - attack.persistence
      - attack.t1136
    logsource:
      product: windows
      service: security
    detection:
      selection:
        EventID: 4720
      condition: selection
    falsepositives:
      - Joiner process run by the identity team
    level: low

T1136 is Create Account. Low severity: it is common and legitimate; its value is in correlation (created at 02:00,
then added to an admin group).

## 4. Precision and recall (easy)

A rule raised 120 alerts last week; 18 were malicious. A review found 6 more malicious events it missed. Compute
precision and recall.

**Answer.** Precision 18/120 = **0.15**. Recall 18/(18+6) = **0.75**.

## 5. Choose the exclusion (medium)

A rule on "scheduled task created" fires 300 times a week, all from the patching tool
\`C:\\Program Files\\PatchAgent\\pagent.exe\` running as \`svc_patch\`. Write the safest filter.

**Answer.** Parent image path **and** account, ideally limited to the server group it runs on:

    filter_patch:
      ParentImage: 'C:\\Program Files\\PatchAgent\\pagent.exe'
      User: 'svc_patch'
    condition: selection and not filter_patch

Not \`User: svc_patch\` alone (a stolen credential would vanish), and not \`CommandLine|contains: 'patch'\` (the
attacker chooses the command line).

## 6. Spraying in pandas (medium)

Write the pandas that finds a source failing against 10 or more distinct users in 10 minutes.

**Answer.**

    f = df[df['event.outcome'] == 'failure'].set_index('@timestamp')
    w = f.groupby('source.ip').resample('10min').agg(users=('user.name', 'nunique'))
    print(w[w.users >= 10])

On the mini project's generator data this finds exactly one window (25 users from 10.40.3.44); the most distinct
users any benign source failed against in ten minutes was 1.

## 7. KQL to SPL (medium)

Translate \`process.name:powershell.exe and process.parent.name:winword.exe\` to SPL for Sysmon data.

**Answer.** \`index=sysmon EventCode=1 Image="*\\\\powershell.exe" ParentImage="*\\\\winword.exe"\`
\`| table _time host User ParentImage CommandLine\`. Field names depend on the add-on; check them in the field list.
SPL matching of field values is case-insensitive, unlike Elastic keyword fields.

## 8. The right MTTD (medium)

Five incidents had times to detect of 0.5, 2, 1, 30 and 0.25 hours. Give the mean and the median, and say which
belongs on the dashboard.

**Answer.** Mean 33.75/5 = **6.75 h**; sorted 0.25, 0.5, 1, 2, 30 → median **1 h**. Show the median (and p90 or the
outlier named): the 30-hour incident deserves its own line, not to be averaged into a number that describes no one.

## 9. The escalation note (medium)

Facts: alert "Member Added to Privileged Group" at 20:35 UTC; \`user07\` added to Domain Admins by \`it.admin2\` on
\`kv-dc01\`; no change ticket mentions it; \`it.admin2\` logged in from \`10.40.3.44\`, a branch PC, ten minutes earlier.
Write the note.

**Answer.** Must contain: the alert and time in UTC and IST (02:05 IST), the change (who added whom to which
group, on which DC), the missing ticket, the unusual source (an admin account used from a branch PC at night), the
searches you ran with time ranges, an assessment kept separate ("likely unauthorised; possible T1078 Valid
Accounts then T1098 Account Manipulation"), and what you did not do (account not disabled; awaiting L2).

## 10. Coverage (hard)

Your rules are tagged T1110, T1059.001, T1098 and T1136; only the first three have positive tests. Your priority
list is T1566, T1078, T1110, T1059, T1098, T1136. Write the coverage table and the next two detections to build.

**Answer.** Tested: T1110, T1059 (PowerShell only — partial), T1098. Untested: T1136. Gaps: T1566, T1078. Next:
a positive test for the T1136 rule (cheapest win), then a T1078 detection such as "admin account logged in from a
non-admin workstation" — valid-accounts misuse is in the scenario of exercise 9 and nothing currently sees it.`,
    mcqs: [
      mcq('A server in IST writes "Oct 22 02:15:00" in a classic syslog line. What is the UTC timestamp?',
        [['21 October, 20:45 UTC', true],
         ['22 October, 07:45 UTC', false],
         ['22 October, 20:45 UTC', false],
         ['21 October, 02:15 UTC', false]],
        'IST is UTC+5:30, so subtract five and a half hours: 02:15 on the 22nd becomes 20:45 on the 21st. Adding the offset gives 07:45, keeping the date gives the wrong day, and keeping the clock time ignores the zone altogether.'),
      mcq('A rule raised 50 alerts, 20 of them malicious, and missed 5 malicious events. What are precision and recall?',
        [['Precision 0.40, recall 0.80', true],
         ['Precision 0.80, recall 0.40', false],
         ['Precision 0.40, recall 0.20', false],
         ['Precision 0.36, recall 0.80', false]],
        'Precision = 20/50 = 0.40; recall = 20/(20+5) = 0.80. The swapped pair confuses the two; 0.20 divides by the wrong total, and 0.36 wrongly adds the misses to the alert count.'),
      mcq('Which KQL finds failed Remote Desktop logons for one user, given normalised ECS fields?',
        [['event.code:4625 and winlog.event_data.LogonType:10 and user.name:priya.s', true],
         ['event.code:4624 and winlog.event_data.LogonType:10 and user.name:priya.s', false],
         ['event.code:4625 and winlog.event_data.LogonType:3 and user.name:priya.s', false],
         ['event.code:4625 or winlog.event_data.LogonType:10 or user.name:priya.s', false]],
        '4625 is a failed logon and LogonType 10 is RemoteInteractive (RDP); "and" requires all three. 4624 is a success, type 3 is a network logon, and "or" would return every failure, every RDP logon and everything the user did.'),
      mcq('A detection engineer needs a Sigma rule for new accounts created at odd hours. Which statement about the 4720 rule is right?',
        [['Alone it is low value; its worth is in correlation with odd hours and group changes', true],
         ['It should be high severity, because creating an account is always an attack technique', false],
         ['It cannot be written in Sigma, because Sigma only supports process creation events', false],
         ['It needs no false-positive notes, because only attackers ever create accounts', false]],
        'The identity team creates accounts legitimately, so the event alone is noise; created-at-02:00-then-added-to-admins is the signal. Sigma covers any log source with a logsource definition, and the joiner process is the documented false positive.'),
      mcq('Five incidents took 0.5, 2, 1, 30 and 0.25 hours to detect. Which summary is most honest?',
        [['Median 1 h, with the 30-hour incident reported separately with its cause', true],
         ['Mean 6.75 h, because the mean uses every incident and so is the fairest', false],
         ['Median 1 h, with the 30-hour incident dropped as a data-entry error', false],
         ['Mean 0.94 h, computed after removing the largest value from the set', false]],
        'The median describes the typical case and the outlier is the finding to explain. The mean of 6.75 h describes no incident, and dropping or trimming the 30-hour case without evidence it is an error hides the most important result.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_SIEM_DETECTION_INTERVIEW_QUESTION',
    notes: `SOC L1/L2 interviews at MSSPs, banks and GCCs test one thing above all: do you have a method, or do
you guess? Answer in steps, name the data you would look at, and say what would change your mind. Practise these
aloud; each is followed by the follow-up a good interviewer asks when your first answer is good.

## Q1. "You get an alert: 30 failed logins for one user, then a success. Walk me through it."

**Model answer.** "First I acknowledge it and read the raw events, not just the title. I check the source IPs: one
internal workstation, many sources, or something external through the VPN? Then I enrich: is the user privileged,
which asset did they log into, is that normal for them — I'd search their last 30 days of successful logons for the
same source and host. I look an hour either side for other alerts on that user and host, and at what the session
did after the success: process creation, new services, group changes. If the source is unusual and the session
did anything sensitive, I treat it as a likely account compromise (T1110 then T1078), escalate to L2 with my
searches and time ranges, and recommend a credential reset per the playbook. If it was their own workstation and
the session was ordinary, I'd check the helpdesk for a locked-out user and close it with that evidence."

**Follow-up: "The user says it was them, they forgot the password. Do you close it?"** "Not on their word alone.
I check it fits: their usual workstation, working hours, a helpdesk reset ticket, no unusual activity after. If any
of those fails — say the success came from a different IP than the failures — I keep it open; an attacker who has
the password would also want the user to believe it was them."

## Q2. "One of our rules fires 500 times a day. How would you fix it?"

**Model answer.** "I'd measure before changing anything: group a week of its alerts by the fields that explain
them — parent process, account, host — and see how much one or two benign patterns account for. Then a narrow
exclusion on the pattern, on fields the attacker can't easily set: parent path plus service account, not a
keyword in the command line. Then I'd prove it with numbers: precision before and after, and recall on labelled
positive samples. In a lab I tuned an encoded-PowerShell rule from 91 alerts to 6 with recall held at 1.0, and
rejected an account-only exclusion that also gave precision 1.0 but dropped recall to 0.67. The change goes in
through a pull request with those numbers and an owner and review date for the exclusion."

**Follow-up: "How do you know you haven't made it blind?"** "Recall on known-bad samples — past incidents and
authorised emulation in a lab — kept as tests in the rule's folder and run in CI, so a later change that hides
them fails the build. I'd also watch the rule's volume: a sudden drop to zero is a signal to test it, not a success."

## Q3. "We're a small bank starting a SOC. Which logs would you onboard first, and what goes wrong?"

**Model answer.** "Authentication on the domain controllers and VPN, process creation with command lines on
endpoints and servers, DNS, firewall and proxy egress, and admin changes like group membership. Those answer who
logged in, what ran, what it looked up and who it talked to. The things that go wrong are mostly plumbing:
time zones — classic syslog has no zone, so a server in IST read as UTC shifts events by five and a half hours
and breaks every correlation; fields that differ by source, so I'd normalise to ECS; case in user names; and
sources that silently stop, so I'd alert when a source goes quiet. I'd also check the retention the regulator and
CERT-In's directions expect, rather than guess."

**Follow-up: "How would you prove the timestamps are right?"** "Generate a known event — log in to a test account
on each source at a time I write down — and check it lands at the right UTC time in the SIEM. And compare
\`@timestamp\` with \`event.ingested\` to see pipeline lag."

## Q4. "What's MTTD, and how would you improve ours?"

**Model answer.** "Time from the attacker's first action to our detection — so it needs the investigation's
timeline, not just the alert time. I'd report the median and p90 rather than the mean, because one weekend
incident can make the mean meaningless. To improve it I'd look at the slowest incidents: were they slow because no
rule existed (a coverage gap against ATT&CK), because a rule fired and was closed as noise (tuning and triage), or
because nobody was watching (staffing at night and weekends)? Each has a different fix."

**Follow-up: "Our MTTR dropped this month. Good news?"** "Maybe. First I'd check how it's computed — if open
incidents count as zero or get excluded silently, unfinished work makes it look better. I'd recompute one incident
by hand and look at the open ones and their age."`,
    mcqs: [
      mcq('In an interview you are asked to triage "many failures then a success" for one user. Which opening shows method?',
        [['Read the raw events, check the sources, enrich the user and host, then look at what the session did', true],
         ['Disable the account at once, because a success after failures always means the account is compromised', false],
         ['Close it if the user is senior, because senior staff are trusted and often mistype their passwords', false],
         ['Ask the interviewer which SIEM product is used, since the answer depends entirely on the tool', false]],
        'Interviewers want a repeatable method: evidence first, context next, then what happened after the success. Disabling at once skips verification and may exceed L1 authority; seniority is not evidence; and the method is the same in any SIEM.'),
      mcq('An interviewer asks how you would show that tuning a noisy rule did not make it blind. Which answer is strongest?',
        [['Measure recall on labelled known-bad samples kept as tests and run in CI on every change', true],
         ['Point out that the alert volume dropped, which shows the noise has been removed', false],
         ['Say that the analysts stopped complaining about the rule after the change was made', false],
         ['Explain that the exclusion was written by a senior engineer and reviewed by a manager', false]],
        'Only recall on known positives measures blindness, and keeping them as CI tests protects against future changes. Lower volume and happier analysts are exactly what a blinding change also produces, and seniority does not measure anything.'),
      mcq('Asked "our MTTR dropped this month — good news?", which response is best?',
        [['Check how open incidents are handled in the calculation and recompute one incident by hand first', true],
         ['Yes, because a lower MTTR always means the SOC is resolving incidents faster than before', false],
         ['No, because a lower MTTR usually means analysts are closing incidents without actually fixing them first', false],
         ['It cannot be known, because MTTR is not a meaningful metric for a security team', false]],
        'A drop can be real or an artefact (open incidents counted as zero, silent exclusions). Verifying the calculation comes before celebrating or blaming. MTTR is meaningful when defined and computed carefully.'),
    ],
  },

  /* ── MINI_PROJECT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_SIEM_DETECTION_MINI_PROJECT',
    notes: `## The scenario

Krishna Valley Co-operative Bank (a fictional bank) has a head office in Vijayawada and four branches. It runs a
domain controller (\`kv-dc01\`), a file server (\`kv-fs01\`), a core banking database server (\`kv-cbs-db01\`), an
internet-banking web server (\`kv-web01\`, Linux), and 28 branch PCs (\`kv-br1-pc01\` … \`kv-br4-pc07\`). About 30 staff
accounts, plus service accounts for backup (\`svc_backup\`) and patching (\`svc_patch\`). The bank's new IT security
officer has asked you, as the SOC analyst of a small MSSP, to stand up detection for it on open-source tools and
show — with numbers — what the SOC can and cannot see.

You have no real bank data, and you must not use any. **You generate a week of synthetic logs yourself**, with
labelled attack scenarios and labelled benign look-alikes. Generating the data is part of the skill: you decide what
normal looks like, which is exactly what baselining in a real SOC requires.

## The data you generate

Seven days, starting on a Monday, in four sources with deliberately different formats:

1. **Windows Security events** (JSON lines, UTC with \`Z\`) from the DC, file server and database server: 4624,
   4625 (with LogonType), 4688 or Sysmon-style process creation with command line and parent, 4720, 4728/4732.
2. **sshd auth.log** from \`kv-web01\` in classic syslog format, **IST, no year**.
3. **Firewall log** as CSV (UTC): time, source IP, destination IP, destination port, action.
4. **DNS query log** as JSON lines: time, client IP, query name.

Background activity follows office hours (09:00–19:00 IST, quieter on Sunday), with ordinary typos, the backup
agent's nightly encoded PowerShell on the servers, the patching tool's scheduled tasks, and one approved change
that adds a user to the local Administrators group with a ticket number in the change log.

**Seed at least six labelled scenarios** (\`label: malicious\` plus a \`scenario\` name), for example:

- password spraying from a branch PC against 25 accounts on the DC at night;
- guessing passwords on \`kv-web01\` over SSH and on the file server from the same internal IP within minutes;
- a teller PC where \`WINWORD.EXE\` starts PowerShell with an encoded command, followed by DNS and firewall
  connections to an address you put on a small local CTI list (use the documentation range 198.51.100.0/24);
- \`svc_backup\` used from \`cmd.exe\` on \`kv-cbs-db01\` (a stolen service account);
- a new account created at 02:00 IST and added to Domain Admins with no change ticket;
- an admin account logging in from a branch PC it has never used.

A starting point for the generator (it writes the background and the spraying scenario; extend it):

    random.seed(2026)
    START = datetime(2026, 11, 2, 0, 0, tzinfo=timezone.utc)          # Monday 05:30 IST
    def emit(t, label, scenario, **fields):
        events.append({'@timestamp': t.isoformat(), 'label': label, 'scenario': scenario, **fields})
    ...
    t0 = START + timedelta(days=1, hours=20, minutes=40)               # Wednesday 02:10 IST
    for i, u in enumerate(random.sample(USERS, 25)):
        emit(t0 + timedelta(seconds=12 * i), 'malicious', 'spray', **{'event.code': '4625',
             'event.outcome': 'failure', 'user.name': u, 'host.name': 'kv-dc01', 'source.ip': '10.40.3.44'})

Run as written it produces 2,825 identity events, 25 of them malicious; the spraying shows as one ten-minute window
with 25 distinct users from \`10.40.3.44\`, against at most 1 for any benign source. When you read it back with
\`pd.read_json(..., lines=True)\`, \`@timestamp\` stays text; convert it with
\`pd.to_datetime(df['@timestamp'], utc=True, format='ISO8601')\`.

Keep labels and scenario names **out of** the data your detections read (store them in a separate answer file or
drop the columns before detection) — a detection that peeks at the label is not a detection.

## Deliverables

1. **\`generate.py\`** — seeded and repeatable; a README table of every scenario, its time in IST and UTC, and the
   ATT&CK technique it represents (IDs only where you are certain).
2. **\`normalise.py\`** — the four formats into one ECS-like table (UTC \`@timestamp\`, \`event.dataset\`,
   \`event.code\` as string, \`event.outcome\`, lower-cased \`user.name\`, \`source.ip\`, \`destination.ip\`,
   \`host.name\`, \`process.*\`, \`dns.question.name\`), with tests for the time-zone conversion and case handling.
3. **Five Sigma rules** in \`rules/\`, each with a stable id, ATT&CK tags, false-positive notes and a level;
   converted with pySigma (\`LuceneBackend(ecs_windows())\` or ES|QL) with the real output saved in
   \`converted/\`. At least one counting rule (threshold or distinct count) implemented in pandas, with the
   equivalent ES|QL or SPL written and marked "not run".
4. **Tests**: for each rule, positive and negative sample events and a script that evaluates the rule against them
   and against the whole week, printing alerts, TP, FP, FN, precision and recall.
5. **\`TUNING.md\`** — for at least two rules, the before/after numbers, the exclusion and why it is narrow, and
   one rejected tuning option with the recall it would have cost.
6. **Triage notes** — every alert your tuned rules raise, triaged: disposition, evidence, and for true positives
   an escalation note in the format from Alert Triage. Use an enrichment function with a CMDB, directory and CTI
   list you create.
7. **Metrics** — an incident table built from your true positives (first malicious from your scenario table,
   detected from the alert, plausible acknowledged/resolved times you record), with median and p90 MTTD/MTTR,
   open incidents reported separately, SLA compliance, alerts and false positives per rule, and an ATT&CK
   coverage table marking tested, untested and gaps.
8. **A dashboard** — one page for the bank's security officer: a few charts from pandas/matplotlib, or Kibana if
   you run Elastic at home, and a one-paragraph reading of what it shows.

## Milestones

- **Day 1**: generator and normaliser; check one event per source by hand in UTC.
- **Day 2**: five rules, converted, with positive and negative tests passing.
- **Day 3**: evaluate on the week, tune, write \`TUNING.md\`.
- **Day 4**: triage, enrichment, incident table, metrics and dashboard; write the README.

## Acceptance checks

- Changing the random seed changes the data but not the README's method; the scenarios still appear.
- Every converted query in \`converted/\` was produced by pySigma, not typed by hand.
- No rule reads \`label\` or \`scenario\`.
- At least one scenario is **not** detected by your five rules, and the coverage table says so honestly.
- All numbers in the README match what the scripts print.

Everything stays defensive and synthetic: no real bank data, no scanning or attacking any system, and no malware —
the "malicious" events are rows you write, not programs you run.`,
    assignment: {
      title: 'Mini Project: Detections for a Small Bank\'s SOC',
      description: 'Generate a labelled week of synthetic logs for a small co-operative bank, normalise four formats into one schema, write and test five Sigma detections mapped to ATT&CK, tune them with measured precision and recall, triage what they raise, and build the SOC metrics and dashboard.',
      instructions: `Build the project described in this unit's notes, using only synthetic data you generate. Submit a repository
link or a zip.

**Submit:**

1. \`generate.py\` with a README table of every seeded scenario (IST and UTC times, ATT&CK technique).
2. \`normalise.py\` and its tests (time zone, case, types).
3. \`rules/\` with five Sigma rules, \`converted/\` with the real pySigma output, and \`tests/\` with positive and
   negative samples plus the evaluation script and its printed results.
4. \`TUNING.md\` with before/after precision and recall for at least two rules and one rejected option.
5. \`TRIAGE.md\` with a disposition for every alert and escalation notes for the true positives.
6. \`metrics.py\`, the incident table, the coverage table and the dashboard with a short reading of it.

**Before you submit,** go through the acceptance checks in the notes and point to where each is met.`,
      rubric: [
        { criterion: 'Synthetic data and normalisation', description: 'Repeatable generator with realistic background and labelled scenarios; four formats normalised to one schema in UTC with tested time-zone, case and type handling; labels kept away from detections.', maxPoints: 20 },
        { criterion: 'Detections', description: 'Five Sigma rules with stable ids, correct ATT&CK tags, false-positive notes and levels; real pySigma conversions; at least one counting rule with its SIEM query written and marked as not run.', maxPoints: 20 },
        { criterion: 'Testing and tuning', description: 'Positive and negative tests for every rule; precision and recall before and after tuning; narrow exclusions justified; a rejected option shown with the recall it would have cost.', maxPoints: 20 },
        { criterion: 'Triage', description: 'Every alert dispositioned with evidence; enrichment with explainable priority; escalation notes with facts, searches and UTC time ranges, a separate assessment and what was not done.', maxPoints: 20 },
        { criterion: 'Metrics, coverage and reporting', description: 'MTTD/MTTR as median and p90 with open incidents separate; SLA compliance; per-rule noise; honest coverage table including undetected scenarios; a dashboard and README whose numbers match the scripts.', maxPoints: 20 },
      ],
      totalPoints: 100,
    },
    mcqs: [
      mcq('Your generator writes a label column marking each event malicious or benign. How should the detections use it?',
        [['Not at all: drop it before detection and use it only afterwards to score the results', true],
         ['As a filter, so the detections only examine events that are already marked malicious', false],
         ['As one input among others, weighting each event by its label when computing alerts', false],
         ['As the SIEM\'s severity field, so that the dashboard can colour the alerts by label', false]],
        'The label is the answer key; a detection that reads it measures nothing. It is used after the fact to compute TP, FP and FN. Filtering or weighting by it, or turning it into severity, leaks the answer into the detection.'),
      mcq('In the project\'s coverage table, one of your seeded scenarios is not detected by any of your five rules. What should the table show?',
        [['The scenario\'s technique marked as a gap, with a note of what detection would cover it', true],
         ['Nothing, since the scenario can be removed from the generator so the table looks complete', false],
         ['The technique marked as covered, since the scenario was written by you and so is known', false],
         ['The technique marked as covered by the closest rule, even though that rule did not fire', false]],
        'An honest coverage table is the point of the exercise: a gap shown with a plan is useful to the bank\'s security officer, while hiding it or claiming coverage from a rule that did not fire produces exactly the flattering map the lesson warns against.'),
    ],
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_SIEM_DETECTION_CHECKPOINT',
    notes: `Ten questions across the topic: log collection and normalisation, searching in a SIEM, Sigma
detections and ATT&CK mapping, tuning with precision and recall, triage, and SOC metrics. Each has one best answer;
read every option before choosing.`,
    checkpoint: [
      mcq('An IST server\'s sshd lines are ingested as if they were UTC. What goes wrong in the SIEM?',
        [['Its events land 5.5 hours late, so correlations with correctly timed sources stop matching', true],
         ['Its events are rejected, because the SIEM refuses lines whose time zone is not declared', false],
         ['Nothing, because the SIEM converts every timestamp to IST before storing the events', false],
         ['Its events land 5.5 hours early, so they appear before the activity that caused them', false]],
        'Reading 14:05 IST as 14:05 UTC places the event at what is really 19:35 IST, five and a half hours late, so it no longer lines up with sources timed correctly. SIEMs accept such lines silently, and they do not convert unlabelled local times correctly on their own.'),
      mcq('Why does a SOC normalise different sources into one schema such as ECS?',
        [['So one search or rule on fields like source.ip and user.name covers every source at once', true],
         ['So the original raw log lines can be deleted to save storage once they have been parsed', false],
         ['Because ECS encrypts the fields, which the regulator requires for all stored security logs', false],
         ['Because a SIEM cannot index any event that does not already arrive in ECS format', false]],
        'A shared schema means the same meaning has the same name, so cross-source searches and correlations work. Raw lines should be kept (event.original) as evidence, ECS is a naming standard not encryption, and SIEMs index many formats.'),
      mcq('An analyst needs the number of failed logons per source IP per 5 minutes in Kibana. Which tool fits?',
        [['ES|QL with STATS ... BY source.ip and a 5-minute time bucket', true],
         ['A KQL query, which groups the results by the first field it names', false],
         ['A Sigma rule, which returns counts when it is converted to Lucene', false],
         ['The Discover table sorted by source.ip, then counted by scrolling', false]],
        'Counting and grouping need an aggregation language such as ES|QL (or a visualisation). KQL only filters, a plain Sigma rule converts to a filter query, and counting by hand is slow and error-prone.'),
      mcq('A converted Sigma rule searches Image and CommandLine but the index has process.executable and process.command_line. What fixes it?',
        [['Converting with a processing pipeline, such as ecs_windows, that maps the field names', true],
         ['Renaming the fields in every stored document to match the Sigma rule\'s generic names', false],
         ['Rewriting the rule in KQL by hand and deleting the Sigma version from the repository', false],
         ['Adding the |contains modifier to every field so the names no longer need to match', false]],
        'A pipeline translates Sigma\'s generic fields to the target schema at conversion time, keeping one rule portable. Rewriting stored data is impractical and breaks every other search, abandoning Sigma loses portability and tests, and modifiers change value matching, not field names.'),
      ck('THREAT_MODELLING', 'A rule detects Office applications starting PowerShell with an encoded command. Which ATT&CK tag describes what the rule itself observes?',
        [['attack.t1059.001, PowerShell under Command and Scripting Interpreter', true],
         ['attack.t1566, Phishing, because the document probably arrived by email', false],
         ['attack.t1486, Data Encrypted for Impact, because the command is encoded', false],
         ['attack.t1110, Brute Force, because the attacker guessed the user\'s password', false]],
        'Tag the behaviour the data shows: PowerShell execution. Phishing may have delivered the document, but this rule cannot see email; "encoded" is not encryption for impact; and nothing here involves password guessing. Wrong tags make the coverage map claim detections that do not exist.'),
      mcq('After an exclusion, a rule has precision 1.0 and recall 0.67 on the labelled set; before, precision was 0.07 and recall 1.0. What is the right conclusion?',
        [['The exclusion removed noise but also hid a third of real attacks; find a narrower one', true],
         ['The exclusion is ideal, because precision has improved more than recall has fallen', false],
         ['The labelled set must be wrong, because an exclusion cannot lower a rule\'s recall', false],
         ['The rule should be deleted, because neither version reaches 1.0 on both measures', false]],
        'Recall falling means attacks now go unalerted; the goal is to cut false positives without that loss, which a narrower exclusion achieved in the lab (1.0 and 1.0). Exclusions certainly can lower recall, and deleting the rule loses all detection.'),
      mcq('Which exclusion for a backup agent\'s encoded PowerShell is narrowest and hardest for an attacker to abuse?',
        [['Parent image ending \\CoopBackup\\agent.exe AND user svc_backup', true],
         ['User svc_backup on any host and with any parent process at all', false],
         ['Command line containing the word backup, in any letter case', false],
         ['Any host whose name starts with srv-, the server naming prefix', false]],
        'Pairing the parent path with the account excludes only the agent\'s own behaviour. The account alone hides a stolen credential, a command-line keyword is chosen by the attacker, and a host prefix blinds the rule on every server.'),
      mcq('During triage, a cashier\'s workstation shows Word starting PowerShell, and enrichment finds the destination on the internal CTI list. What is the right next step for an L1 analyst?',
        [['Escalate to L2 as a likely true positive with evidence, staying within the playbook', true],
         ['Close it as a benign true positive, because Word often runs PowerShell for its normal macros', false],
         ['Reimage the workstation at once, so that no time is wasted on writing up the investigation', false],
         ['Email the cashier to ask whether they opened a document recently before doing anything else', false]],
        'The evidence points to a malicious document, so L1 escalates with a note L2 can act on and stays within the playbook\'s authority. Calling it benign ignores the CTI match, reimaging destroys evidence and exceeds L1\'s role, and contacting the user first may tip off an insider or spread confusion.'),
      mcq('An incident table has one high-severity incident still open. How should MTTR be reported?',
        [['On resolved incidents only, as median and p90, with the open incident listed separately with its age', true],
         ['With the open incident counted as 0 hours, so that every incident without exception is included in the average', false],
         ['With the open incident counted as the longest MTTR seen so far, as a cautious estimate', false],
         ['Not at all until every incident is closed, since a partial figure cannot be meaningful', false]],
        'Resolution time does not exist yet for an open incident, so it is reported separately and not invented. Counting it as zero flatters the metric, substituting the maximum is an arbitrary guess, and withholding the metric until all incidents close means never reporting it.'),
      mcq('A SOC manager wants a dashboard that drives decisions. Which panel best earns its place?',
        [['Alerts and false positives per rule, sorted by false positives, as next sprint\'s tuning backlog', true],
         ['Total alerts this month as one large number, to show the board how busy the SOC has been', false],
         ['Alerts closed per hour for each analyst, to rank the whole team and reward the fastest closers each week', false],
         ['A world map of every external IP seen, coloured by country, refreshed every few seconds', false]],
        'A per-rule false-positive table tells the team exactly which rules to tune next. A raw total informs no decision, a speed ranking rewards closing without investigating, and a live map of IPs looks impressive but changes nothing anyone does.'),
    ],
  },
];
