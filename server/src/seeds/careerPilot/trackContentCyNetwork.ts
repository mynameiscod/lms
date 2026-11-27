/**
 * Career-track content: Network Security for Analysts (CY_NETWORK_SECURITY), the Cybersecurity
 * Analyst track, batch CY1.
 *
 * Defensive only. The student learns to read traffic, configure and read a firewall, run network
 * detection (Suricata, Zeek) and reason about remote access — always on networks they own or are
 * authorised to monitor. Attack techniques are named (with the MITRE ATT&CK technique where it
 * helps) only so the detection or the control makes sense; nothing here teaches how to carry one out.
 *
 * Builds on T_NETWORKING (IP, ports, TCP/UDP, DNS), T3_SEC_NETWORK (what is listening, TLS
 * properly) and T3_SEC_THREATS; those ideas get one sentence, not a lesson. Every capture and log in
 * the notes is synthetic — built with scapy or written by hand, on documentation address ranges
 * (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24) and private 10.x lab ranges — and every Python
 * output shown was produced by running the code. Wireshark display filters, tshark, Suricata rules
 * and Zeek commands are written from their documentation; the notes say so where they appear.
 *
 * Skills: NETWORK_SECURITY by default; PROTOCOLS_FOR_DEFENDERS counts towards COMPUTER_NETWORKS.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_CY_NETWORK_SECURITY_BUNDLES: PilotBundle[] = [
  /* ── PACKET_ANALYSIS ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_NETWORK_SECURITY_PACKET_ANALYSIS',
    notes: `In Networking Basics you learnt what an IP address, a port and a TCP handshake are. A SOC analyst
uses the same ideas every shift, but from the other side: an alert says "10.10.0.23 talked to
203.0.113.50", and your job is to open the evidence and say **what that conversation was** — normal
work, a misconfiguration, or something to escalate. The evidence is a packet capture (pcap), or
the logs a sensor built from one.

## Capture only what you are allowed to capture

A capture contains everything on the wire: names, cookies, sometimes passwords sent in clear text,
personal data covered by the DPDP Act. So the rule is absolute: **capture only on machines and
networks you own, or where you have written authorisation**. At work, captures come from a sensor
on a SPAN (mirror) port or a network TAP that the network team set up for the SOC; at home, your
own laptop and your own Wi-Fi are your lab. Treat a pcap like any other evidence: store it
access-controlled, note where and when it was taken, and delete it when the case closes.

Wireshark is the GUI; **dumpcap** and **tshark** come with it for the command line:

    tshark -D                                          # list interfaces
    dumpcap -i 2 -a duration:300 -w home-lab.pcapng    # 5 minutes from interface 2
    dumpcap -i 2 -f "host 192.168.1.10 and not port 22" -w one-host.pcapng

The -f filter is a **capture filter** (BPF syntax, decides what is saved). Inside Wireshark you
mostly use **display filters** (Wireshark's own syntax, decides what is shown). They are different
languages — mixing them up is the most common beginner error, and the debugging unit returns to it.

## A capture we can all read: lab.pcap

For this topic we built a small capture with scapy instead of sniffing anything real: a laptop
(10.10.0.21) browsing three HTTPS sites, a host (10.10.0.23) making regular small connections out,
some DNS, and a burst of connection attempts from 10.10.0.66 against our own test server
10.10.0.10. Scapy reads it back, so we can do in Python what Wireshark's Statistics → Conversations
window does:

    from collections import defaultdict
    from scapy.all import rdpcap, IP, TCP, UDP

    pkts = rdpcap('lab.pcap')
    print('packets:', len(pkts))
    conv = defaultdict(lambda: {'pkts': 0, 'bytes': 0})
    for p in pkts:
        if IP in p and (TCP in p or UDP in p):
            l4 = p[TCP] if TCP in p else p[UDP]
            proto = 'tcp' if TCP in p else 'udp'
            if l4.sport < l4.dport:      # in this capture the lower port is the service
                key = (p[IP].dst, p[IP].src, l4.sport, proto, l4.dport)
            else:
                key = (p[IP].src, p[IP].dst, l4.dport, proto, l4.sport)
            conv[key]['pkts'] += 1
            conv[key]['bytes'] += len(p)

The full script also rolls the conversations up per client → server:service and prints:

    packets: 2249
    client       server          service  sessions  pkts  bytes
    10.10.0.23   203.0.113.50    tcp/443        12    96   7560
    10.10.0.21   198.51.100.10   tcp/443         3    24   6376
    10.10.0.21   198.51.100.20   tcp/443         3    24   6647
    10.10.0.21   198.51.100.30   tcp/443         3    24   6640
    10.10.0.21   10.10.0.2       udp/53          9    18   1395
    10.10.0.23   10.10.0.2       udp/53          6    12   1296
    10.10.0.66   10.10.0.10      1024 services, 2-3 packets each

That table is the first thing to look at in any capture: **who talked to whom, on what, how much**.
Six lines of ordinary-looking traffic and one line that is 1,024 different services on one host.

## Display filters you will type every day

    ip.addr == 10.10.0.23                      # either direction
    ip.src == 10.10.0.66 && tcp.port == 22
    tcp.flags.syn == 1 && tcp.flags.ack == 0   # connection attempts only
    tcp.flags.reset == 1                       # refusals and aborts
    dns && dns.flags.rcode == 3                # NXDOMAIN answers
    dns.qry.name contains "example.net"
    http.request.method == "POST"
    tls.handshake.type == 1                    # TLS ClientHello
    tcp.analysis.retransmission                # loss or a struggling path
    !(ip.addr == 10.10.0.2)                    # hide the resolver

Fields compare with ==, !=, >, contains, matches (a regex); combine with &&, ||, !. Right-click any
field in the packet details → **Apply as Filter** writes the filter for you, which is the quickest
way to learn field names.

## Reading one conversation

Pick a line and look at its packets: SYN, SYN-ACK, ACK (the handshake from Networking Basics), data
both ways, FIN from each side. **Follow → TCP Stream** (filter tcp.stream eq N) shows the whole
conversation as one transcript; for TLS that transcript is ciphertext, but the ClientHello still
tells you the server name the client asked for (more in the next unit). Three patterns tell you
most of what you need:

- **SYN → SYN-ACK → ACK → data → FIN**: a complete, normal connection.
- **SYN → RST-ACK**: the port is closed; the host refused.
- **SYN with no answer at all**: something dropped it (a firewall), or the host is down.

## Normal versus worth a closer look

You cannot call anything abnormal without knowing normal. On an office network normal is: DNS to
the internal resolver only, HTTPS to well-known services in working hours, some Windows and update
chatter. What makes an analyst look closer: one source touching many ports or many hosts; regular
connections at fixed intervals from a machine nobody is using; DNS names that look random; large
uploads to an address the organisation never uses; DNS sent straight to an outside server instead of
the internal resolver. None of these is proof. Each is a question you answer with more evidence.

## The command-line version (written from the tshark documentation; not run here)

    tshark -r lab.pcap -q -z conv,tcp           # the conversations table
    tshark -r lab.pcap -q -z io,phs             # protocol hierarchy
    tshark -r lab.pcap -Y "dns" -T fields -e frame.time -e ip.src -e dns.qry.name

At an MSSP you will mostly read what a sensor already summarised, but when an L2 analyst says
"pull the pcap for that hour", these are the commands you reach for.`,
    workedExample: `**Problem:** your L2 hands you lab.pcap with one line: "explain every conversation in this before we
decide anything". Use the conversations table above and the packets behind each line.

**1. 10.10.0.21 → three servers on 443, 3 sessions each, 24 packets per server.** Before each
session the laptop asked the resolver for a name (9 DNS sessions, all answered). Each session is a
full handshake, a few hundred bytes up and about 1.3 KB down, and FINs. That is a person browsing:
look up a name, connect, fetch, close. **Normal.**

**2. 10.10.0.21 and 10.10.0.23 → 10.10.0.2 on udp/53.** DNS to the internal resolver, which is
where DNS should go. The laptop's 9 queries are ordinary names. 10.10.0.23's 6 queries need a
closer look in the next unit (they are 62 characters long and every one got NXDOMAIN). **Normal
path, odd content.**

**3. 10.10.0.23 → 203.0.113.50 on 443, 12 sessions, 96 packets, 7,560 bytes.** Twelve small,
identical-sized connections; no DNS lookup for 203.0.113.50 appears before them, so the address was
already known (hard-coded or cached). Applying ip.addr == 203.0.113.50 and looking at the time
column shows a session roughly every minute. A person does not open the same site every 60 seconds
with the same 220 bytes. **Worth escalating** — it has the shape of a beacon (MITRE ATT&CK calls the
channel Application Layer Protocol, T1071), though a monitoring agent or an update check can look
the same. The next question is "what process on 10.10.0.23 makes this connection?", which is an
endpoint question, not a network one.

**4. 10.10.0.66 → 10.10.0.10, 1,024 services, 2 to 3 packets each.** The filter
tcp.flags.syn == 1 && tcp.flags.ack == 0 && ip.src == 10.10.0.66 shows 1,024 SYNs in about two
seconds, ports 1 to 1024 in order. Almost all were answered with RST-ACK (closed); 22, 80 and 443
answered SYN-ACK and 10.10.0.66 immediately sent RST without completing the handshake. That is a
port scan (Network Service Discovery, T1046). In our lab it is our own test, but in an office the
next step is to ask: is 10.10.0.66 the IT team's authorised scanner? If yes, note it as expected
noise; if nobody knows the machine, escalate.

**Written finding (what you send back):** "Four groups of traffic. Browsing from .21 and DNS to the
internal resolver are normal. .66 port-scanned .10 (ports 1–1024; 22, 80, 443 open) — confirm
whether it is authorised. .23 makes a 220-byte HTTPS connection to 203.0.113.50 about every minute
and sent six long DNS queries that all failed — recommend checking the process on .23 and
blocking 203.0.113.50 at the firewall while we look." Every claim names the packets that support it.`,
    mcqs: [
      mcq('A colleague at your MSSP types ip.addr == 10.10.0.23 into the dumpcap -f option and the capture refuses to start. Why?', [
        ['dumpcap -f takes a BPF capture filter, so it needs "host 10.10.0.23", not display-filter syntax', true],
        ['dumpcap needs the -Y option for any filter that names a single IP address in it', false],
        ['ip.addr is only valid for IPv6 traffic; IPv4 addresses must be written as ip4.addr', false],
        ['Capture filters must be wrapped in single quotes; the syntax itself is perfectly fine', false],
      ], 'Capture filters (-f) use BPF syntax such as host, port and net; display filters such as ip.addr == x are Wireshark\'s own language and only work when viewing or with tshark -Y. ip.addr covers IPv4 (ipv6.addr is the IPv6 field), and quoting is not the problem.'),
      mcq('In lab.pcap, 10.10.0.66 sent a SYN to port 23 of 10.10.0.10 and got RST-ACK back. What does that tell you?', [
        ['The host is up and reachable, but nothing is listening on port 23', true],
        ['A firewall between them silently dropped the SYN before it reached the host', false],
        ['The connection to port 23 succeeded and the session was then closed normally', false],
        ['The host is down, so the router answered on its behalf with a reset', false],
      ], 'A RST-ACK in reply to a SYN is the host itself refusing: it is alive but has no listener on that port. A silent drop by a firewall looks like no answer at all, a successful connection shows SYN-ACK and an ACK, and a down host produces silence or an ICMP unreachable, not a TCP reset.'),
      mcq('Which display filter shows only TCP connection attempts — the first packet of each handshake — in a capture?', [
        ['tcp.flags.syn == 1 && tcp.flags.ack == 0', true],
        ['tcp.flags.syn == 1 || tcp.flags.ack == 1', false],
        ['tcp.flags.syn == 1, which already excludes replies', false],
        ['tcp.flags == "S" written as a string comparison', false],
      ], 'The first packet of a handshake has SYN set and ACK clear; the SYN-ACK reply has both set, so tcp.flags.syn == 1 alone also shows every reply. The || version matches almost every TCP packet, and the flags field is not compared as a letter string in display filters.'),
    ],
    checkpoint: [
      mcq('A new SOC analyst wants to practise packet analysis and plans to run Wireshark on the hostel Wi-Fi to see what other students are browsing. What is the right advice?', [
        ['Do not: capture only on machines and networks you own or are authorised to monitor', true],
        ['It is fine as long as the capture is deleted straight afterwards and nothing from it is shared', false],
        ['It is fine because traffic on shared Wi-Fi is legally considered public data', false],
        ['Use a capture filter to keep only DNS, which contains no personal information', false],
      ], 'Capturing other people\'s traffic without authorisation is not allowed whatever you do with it afterwards — deleting it does not undo the capture. Shared Wi-Fi traffic is not public data, and DNS queries reveal a great deal about a person, so filtering to DNS does not make it acceptable.'),
      mcq('In a conversations table, one internal host has 2 to 3 packets each with 1,024 different ports on a single server, all within two seconds. What is the best first reading?', [
        ['A port scan of that server; next, check whether the source is an authorised scanner', true],
        ['A large file transfer split across many parallel ports to make the download finish faster', false],
        ['Normal behaviour of a web browser opening many tabs to the same web server', false],
        ['Retransmissions caused by packet loss on a congested office network link', false],
      ], 'One source, one target, many ports, two or three packets each in seconds is the shape of a scan (T1046). The next question is whether it is authorised. File transfers use one or a few connections, a browser uses ports 80/443 from many source ports, and retransmissions repeat the same connection rather than touching new ports.'),
      mcq('You need to read a whole HTTP conversation between a laptop and an internal server as one transcript. Which Wireshark feature does that?', [
        ['Follow → TCP Stream, which filters on tcp.stream eq N and joins the payloads', true],
        ['Statistics → Protocol Hierarchy, which lists the bytes each protocol carried', false],
        ['Statistics → Endpoints, which lists each address with its packet totals', false],
        ['Edit → Find Packet with a string search across all the packet bytes', false],
      ], 'Follow TCP Stream reassembles one connection into a readable transcript. Protocol Hierarchy and Endpoints are summaries of the whole capture, and Find Packet jumps to a single matching packet rather than rebuilding the conversation.'),
    ],
  },

  /* ── PROTOCOLS_FOR_DEFENDERS ──────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_NETWORK_SECURITY_PROTOCOLS_FOR_DEFENDERS',
    notes: `Almost everything a modern attack does on the network rides on three protocols: DNS, HTTP and TLS.
They are allowed out of every firewall, because the business cannot work without them, which is
exactly why they are abused. You know how they work from Networking Basics and Transport Security,
Properly; this unit is about how **normal** looks for each, so the abnormal stands out.

## DNS: the most useful log you have

Every connection to a name starts with a lookup, so DNS logs are a map of what every machine
wanted to reach — even when the connection itself is encrypted. Normal on an office network:

- Clients ask **only the internal resolver**; the resolver asks the internet. A laptop sending
  udp/53 straight to an outside address is bypassing your logging and filtering.
- Names are short, readable, and repeat: mail, docs, a bank, Windows Update.
- Most answers are NOERROR. A few NXDOMAIN (typos, old bookmarks) are normal.

What makes an analyst look closer:

- **Long, random-looking labels** under one domain. Data can be encoded into the name itself and
  the domain owner's name server receives it (MITRE: Application Layer Protocol: DNS, T1071.004, and
  Protocol Tunneling, T1572).
- **Many NXDOMAIN answers from one host**, especially for random names: malware using a domain
  generation algorithm (DGA, T1568.002) tries many names until one exists.
- **Unusual record types** in volume (lots of TXT or NULL queries from a desktop).
- **DNS over HTTPS** from a client to a public resolver: lookups vanish from your logs.

We can measure "random-looking" with Shannon entropy — bits per character — on the first label:

    import math
    from collections import Counter
    from scapy.all import rdpcap, IP, DNS, DNSQR

    def entropy(s):
        n = len(s)
        return 0.0 - sum(c / n * math.log2(c / n) for c in Counter(s).values())

    for p in rdpcap('lab.pcap'):
        if DNS in p and p[DNS].qr == 0:
            q = p[DNSQR].qname.decode().rstrip('.')
            print(p[IP].src, len(q), round(entropy(q.split('.')[0]), 2), q)

Run on lab.pcap, the first six of its 15 lines:

    10.10.0.21 15 0.0 www.example.com
    10.10.0.21 16 2.0 mail.example.org
    10.10.0.21 16 2.0 docs.example.net
    10.10.0.23 62 4.5 mxgedn73u55xtplpft7v4seh2kvj72ceuvw75efr6edt4syw.t.example.net
    10.10.0.23 62 4.45 b5wkh7dnsipzz7fk4zri3r2wyojfljooa7lqsaj2xuid5zzz.t.example.net
    10.10.0.23 62 4.28 zg6zdmen4khvdgajgxbenyjqwx6hh7566tfjgvq6kbnxjbtf.t.example.net

and the answers: all 9 of 10.10.0.21's were NOERROR; all 6 of 10.10.0.23's were NXDOMAIN.
A 48-character label of 32 possible characters cannot score above 5 bits; these score 4.2 to 4.5.
Ordinary words score about 2 to 3.5. **Entropy alone is a weak signal** — CDN names and some
cloud services have long hex labels too — but entropy plus length plus one host plus one domain
plus all NXDOMAIN is a strong one.

## HTTP: what still travels in clear text

Most web traffic is HTTPS now, but plain HTTP still turns up: internal apps, old devices, update
checks, and file downloads. In a capture or a proxy log, read the method, Host, URI, User-Agent,
status and size. Look closer at: executables or scripts downloaded over plain HTTP (Ingress Tool
Transfer, T1105); a User-Agent that is a script library (python-requests, curl) coming from a
receptionist's PC; POSTs of unusual size to a bare IP address with no Host name; and long runs of
404s from one source (someone or something guessing paths).

## TLS: encrypted, but not invisible

You cannot read the contents of TLS, and you should not need to. What you can see:

- **SNI** (server name indication) in the ClientHello: the name the client wants. Display filter:
  tls.handshake.extensions_server_name contains "example". A TLS connection to a bare IP with no
  SNI is unusual for a browser.
- **The certificate** (in TLS 1.2; TLS 1.3 encrypts it): self-signed, just issued, a name that does
  not match the SNI, or a free certificate on a domain registered last week.
- **The client fingerprint** (JA3, or the newer JA4): a hash of how the client builds its
  ClientHello. A browser and a malware family produce different fingerprints even to the same
  server. Zeek and Suricata can log these.
- **Timing and size**: TLS hides content, not rhythm.

## Periodicity: the shape of a beacon

Software that checks in with a controller connects on a timer, often with a little random jitter.
People do not. Measure the gaps between session starts per client → server:

    import statistics
    from collections import defaultdict
    from scapy.all import rdpcap, IP, TCP

    starts = defaultdict(list)     # SYN times per (client, server, port), scanner left out
    for p in rdpcap('lab.pcap'):
        if TCP in p and p[TCP].flags == 'S' and p[IP].src != '10.10.0.66':
            starts[(p[IP].src, p[IP].dst, p[TCP].dport)].append(float(p.time))
    for key, ts in starts.items():
        gaps = [b - a for a, b in zip(ts, ts[1:])]
        mean, sd = statistics.mean(gaps), statistics.pstdev(gaps)
        print(key, f'{len(ts)} sessions, mean gap {mean:.1f}s, sd {sd:.1f}s, cv {sd / mean:.2f}')

On lab.pcap:

    ('10.10.0.21', '198.51.100.10', 443) 3 sessions, mean gap 206.0s, sd 21.5s, cv 0.10
    ('10.10.0.23', '203.0.113.50', 443) 12 sessions, mean gap 60.0s, sd 1.4s, cv 0.02
    ('10.10.0.21', '198.51.100.20', 443) 3 sessions, mean gap 214.4s, sd 21.4s, cv 0.10
    ('10.10.0.21', '198.51.100.30', 443) 3 sessions, mean gap 217.3s, sd 2.9s, cv 0.01

The coefficient of variation (cv = sd / mean) near zero means "like clockwork". But look at the last
line: three sessions to docs.example.net also score 0.01, by chance. **Three gaps prove nothing;
twelve do.** Require a minimum count (say 10+) before you trust the number, and remember that
legitimate software beacons too — antivirus updates, monitoring agents, chat apps. The question
after "is it periodic?" is always "is this software we know about?"`,
    workedExample: `**Problem:** a Hyderabad MSSP's DNS dashboard flags host 10.10.0.23 for "high-entropy queries". Decide
whether it is worth an L2's time, using only DNS evidence and saying what each fact adds.

**Fact 1 — the names.** Six queries, each a 48-character label of a–z and 2–7 under t.example.net.
That alphabet (26 letters plus six digits) is base32, a common way to pack bytes into a hostname.
Entropy 4.2 to 4.5 bits on a 5-bit maximum: close to random.
*Adds:* the names are probably not chosen by a person or a normal application.

**Fact 2 — one domain.** All six share the parent t.example.net. Random noise spread across many
domains would suggest a DGA; many random labels under **one** domain suggests something is talking
to the name server of that one domain, with the label as the message.
*Adds:* the pattern looks like DNS used as a channel (T1071.004).

**Fact 3 — all NXDOMAIN.** The domain's name server answers "does not exist" every time. For a
channel that is fine: the message arrived when the query reached that server; the answer does not
matter.
*Adds:* failure answers do not mean nothing happened.

**Fact 4 — the same host.** 10.10.0.23 is also the host with the minute-by-minute HTTPS sessions to
203.0.113.50 (cv 0.02 over 12 sessions).
*Adds:* two independent odd behaviours on one machine is much stronger than either alone.

**What weakens it.** Some security and CDN products do use long encoded DNS names (some antivirus
reputation lookups work this way). So check: does the organisation run such a product, and is
t.example.net one of its domains?

**Decision:** escalate to L2 as "suspected DNS tunnelling and beaconing from 10.10.0.23", with the six
query names, the timestamps, the 12 HTTPS session times and the 203.0.113.50 address. Recommend
pulling the process list from the endpoint agent on .23. Do not block the domain yet without L2's
agreement: blocking tells whoever runs it that they have been noticed, and the incident response
lead may want to watch first. At a bank, the RBI-aligned incident procedure and CERT-In's six-hour
reporting window for notifiable incidents make it important to escalate promptly rather than sit on it.`,
    mcqs: [
      mcq('An office laptop sends DNS queries over udp/53 directly to an address on the internet instead of the internal resolver. Why does a defender care?', [
        ['The lookups skip the resolver\'s logging and filtering, so the SOC loses sight of them', true],
        ['Outside resolvers always return wrong answers, which will break the laptop\'s browsing', false],
        ['UDP port 53 traffic to the internet is encrypted, so nobody can tell what was asked', false],
        ['It doubles the DNS traffic on the network because every query is made twice', false],
      ], 'Policy usually forces DNS through the internal resolver because that is where queries are logged and bad domains blocked; going around it removes both. Public resolvers usually answer correctly, plain udp/53 is not encrypted, and the query is not duplicated.'),
      mcq('A host makes a 300-byte HTTPS connection to the same address 14 times, with gaps whose coefficient of variation is 0.03. What is the most accurate conclusion?', [
        ['It is clock-like, so find which program makes it before calling it malicious', true],
        ['It is certainly command-and-control traffic and the host should be wiped today', false],
        ['It cannot be anything worrying because the traffic to that address is encrypted', false],
        ['The low variation means a person is refreshing the page in a browser by hand', false],
      ], 'A low cv over enough sessions says "automated, on a timer", which beacons and also legitimate agents and updaters do, so the next step is identifying the process. Encryption hides content, not rhythm, and people never click with that regularity.'),
      ck('COMPUTER_NETWORKS', 'In a TLS 1.3 connection captured on your network, which of these can an analyst still read without any decryption key?', [
        ['The server name the client asked for, in the SNI field of its ClientHello', true],
        ['The server certificate, which is always sent in clear text in every TLS version', false],
        ['The HTTP request path, because only the response body is encrypted in TLS 1.3', false],
        ['The username, since TLS 1.3 sends login credentials before the encryption starts', false],
      ], 'The ClientHello, including SNI, is still in clear text (unless Encrypted Client Hello is used). TLS 1.3 encrypts the certificate, unlike TLS 1.2, and the HTTP request line and any credentials travel inside the encrypted tunnel.'),
    ],
    checkpoint: [
      mcq('One desktop produced 300 DNS queries in an hour, every one a different random-looking name under a different domain, almost all NXDOMAIN. Which explanation fits best?', [
        ['Malware using a domain generation algorithm, trying names until one resolves', true],
        ['A user typing website addresses quickly and making a lot of spelling mistakes', false],
        ['Normal behaviour of a browser pre-fetching the links on a long news web page', false],
        ['The internal resolver is down, so every lookup returns NXDOMAIN by default', false],
      ], 'Many random names across many domains, nearly all failing, is the DGA pattern (T1568.002). People do not produce 300 typos an hour, browser pre-fetching looks up real names that resolve, and a down resolver returns timeouts or SERVFAIL, not NXDOMAIN for random names from one desktop.'),
      mcq('Why is Shannon entropy of a DNS label, used on its own, a weak signal of DNS tunnelling?', [
        ['Legitimate CDNs and some security products also use long, random-looking labels', true],
        ['Entropy can only be calculated for labels of exactly 32 characters or longer', false],
        ['Tunnelling tools always use dictionary words, which give a low entropy score', false],
        ['Entropy measures packet size, which DNS keeps fixed whatever the name holds', false],
      ], 'Plenty of real services generate hex or encoded labels, so entropy alone produces false positives; it becomes strong combined with length, volume, one parent domain and failure codes. Entropy works on any length string, measures characters not packet size, and most tunnelling encodes data rather than using words.'),
      ck('COMPUTER_NETWORKS', 'A proxy log shows the receptionist\'s PC downloading a .exe over plain HTTP from a bare IP address with User-Agent "python-requests". Which detail is the strongest reason to look closer?', [
        ['A script library\'s User-Agent fetching an executable from a bare IP on that desktop', true],
        ['The request used HTTP rather than HTTPS, which no legitimate software uses any more', false],
        ['The file extension, because downloading any .exe file is a policy violation', false],
        ['The status code was 200, which only appears when a download is malicious', false],
      ], 'A reception PC has no reason to run a Python script that downloads executables from an IP with no host name — that combination matches tool transfer (T1105). Plenty of legitimate software still uses HTTP, IT does download installers, and 200 is the normal success code.'),
    ],
  },

  /* ── FIREWALLS_SEGMENTATION ───────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_NETWORK_SECURITY_FIREWALLS_SEGMENTATION',
    notes: `In What Is Listening, and Why you closed ports on one host. A firewall does the same job for a
whole network: it decides which flows are allowed between zones. Analysts rarely own the firewall,
but they read its logs every day, review rule changes, and are the first to notice when a rule is
wrong.

## Stateless and stateful

A **stateless** filter (a router ACL) judges each packet alone: source, destination, protocol,
port. To let replies back in you must write a rule for them, and that rule lets in anything that
looks like a reply. A **stateful** firewall keeps a connection table: when 10.20.4.33 opens a
connection to a web server, the replies are allowed because they belong to that connection, and an
unsolicited packet from outside is dropped. Every modern firewall — pfSense/OPNsense, Linux
nftables, cloud security groups, enterprise next-generation firewalls — is stateful.
Next-generation firewalls add application identification, user identity and threat signatures on
top, but rule logic is still the same.

## Rule order: the first match wins

Most firewalls read rules top to bottom and act on the **first** rule that matches; whatever
matches nothing falls to the **default** action, which must be deny. Order is therefore part of
the policy. A small evaluator shows why:

    from ipaddress import ip_address, ip_network

    RULES = [   # (name, src, dst, proto, port, action)
        ('allow-web-to-app',  '10.20.1.0/24',  '10.20.2.10/32', 'tcp', 8080, 'ALLOW'),
        ('allow-app-to-db',   '10.20.2.10/32', '10.20.3.5/32',  'tcp', 5432, 'ALLOW'),
        ('allow-admin-ssh',   '10.20.9.0/24',  '10.20.0.0/16',  'tcp', 22,   'ALLOW'),
        ('deny-users-to-db',  '10.20.4.0/24',  '10.20.3.0/24',  'any', None, 'DENY'),
        ('allow-users-any',   '10.20.4.0/24',  '0.0.0.0/0',     'any', None, 'ALLOW'),
    ]

    def decide(rules, src, dst, proto, port):
        for name, rsrc, rdst, rproto, rport, action in rules:
            if (ip_address(src) in ip_network(rsrc) and ip_address(dst) in ip_network(rdst)
                    and rproto in ('any', proto) and rport in (None, port)):
                return action, name
        return 'DENY', 'default'

Five flows through it:

    ('10.20.1.15', '10.20.2.10', 'tcp', 8080) -> ALLOW allow-web-to-app
    ('10.20.4.33', '10.20.3.5', 'tcp', 5432) -> DENY deny-users-to-db
    ('10.20.4.33', '198.51.100.7', 'tcp', 443) -> ALLOW allow-users-any
    ('10.20.1.15', '10.20.3.5', 'tcp', 5432) -> DENY default
    ('10.20.4.33', '10.20.9.5', 'tcp', 3389) -> ALLOW allow-users-any

Now move deny-users-to-db one line down, below allow-users-any, and run again:

    ('10.20.4.33', '10.20.3.5', 'tcp', 5432) -> ALLOW allow-users-any

The deny rule still exists, still looks right in a review, and **never fires** — it is shadowed by
a broader rule above it. A simple check (is an earlier rule's source, destination, protocol and port
the same or wider?) finds it:

    shadowed in reordered: [('deny-users-to-db', 'never reached, shadowed by', 'allow-users-any')]

Look also at the last flow in the first run: a user laptop reaching an **admin workstation on RDP**.
allow-users-any says 0.0.0.0/0, and "anywhere" includes every internal zone. The intent was "users
may reach the internet"; the rule says "users may reach everything". The fix is an explicit deny
from users to the internal ranges (10.0.0.0/8 and the rest) above the internet rule, or a
destination group that means "internet only".

## Zones and segmentation

A flat network — every machine able to reach every other — means one infected laptop can reach the
database, the backup server and the domain controller. **Segmentation** groups machines into zones
by trust and function and allows only the flows the business needs between them:

- **Users** (laptops, Wi-Fi): out to the internet through a proxy; to internal apps on their ports only.
- **DMZ** (public-facing web servers): reachable from the internet on 443; may talk only to the app tier.
- **Servers / app tier**: reachable from the DMZ and users on application ports.
- **Data** (databases, file stores): reachable only from the app servers that use them.
- **Management** (jump hosts, admin workstations): the only zone allowed to SSH/RDP into the others.
- **Guest and IoT** (visitor Wi-Fi, CCTV, printers): internet only, no internal access at all.

Least privilege on the network means **default deny between zones, and each allow rule names a
source, a destination, a port and a reason**. Remember egress too: most organisations filter what
comes in and allow everything out, which is how beacons and uploads leave. A server that only
serves requests rarely needs to start connections to the internet at all.

## Reading firewall logs

A typical log line (formats vary by vendor; this one is iptables/nftables with a log prefix):

    Oct 19 10:14:20 fw1 kernel: [DROP-USERS-DB] IN=eth2 OUT=eth3 SRC=10.20.4.33 DST=10.20.3.5 PROTO=TCP SPT=50311 DPT=5432 SYN

Read it as: which rule (the prefix), which direction (in on the users interface, out to data),
who, to what, which port, and the flags (a SYN: a new connection attempt). Patterns that matter:

- **Denies from inside to outside** — an internal host trying blocked ports or addresses; often
  malware or a misconfigured app.
- **Many denies from one source to many ports or hosts** — scanning from inside (T1046).
- **Allows that should not exist** — a user subnet reaching the data zone means a rule is wrong.
- **A sudden change in volume** on an allowed rule, especially large outbound transfers.

Every rule change should go through a change request with a reason and an owner; the SOC reviews
the firewall's audit log for changes nobody requested. For banks, the RBI's cyber-security framework
expects network segmentation and this kind of monitoring; for everyone, CERT-In's 2022 directions
expect logs to be kept (180 days) and clocks synchronised so that logs from different devices line up.`,
    workedExample: `**Problem:** a 40-person chartered accountancy firm in Pune has one flat network: staff laptops,
two file servers, a Tally server, CCTV recorders, a printer and guest Wi-Fi all on 192.168.1.0/24.
Design zones and the rule set, top to bottom.

**Step 1 — group by trust and function.**

    Zone       Subnet           Members
    STAFF      10.30.10.0/24    laptops, desktops
    SERVERS    10.30.20.0/24    file servers, Tally server
    MGMT       10.30.90.0/24    IT admin's workstation, the backup appliance
    IOT        10.30.50.0/24    CCTV recorders, printer
    GUEST      10.30.60.0/24    visitor Wi-Fi

**Step 2 — list the flows the business needs (and nothing else).** Staff open files (SMB 445) and
Tally (its port) on SERVERS; everyone except IoT goes to the internet on 80/443 through the proxy;
staff print (9100) to one printer address; IT administers everything from MGMT; the backup appliance
reads the file servers; CCTV talks only to its recorder.

**Step 3 — write rules, specific before general, deny before the broad allow.**

    1  MGMT    -> any internal  tcp 22,3389,445   ALLOW   admin access, logged
    2  STAFF   -> SERVERS       tcp 445, Tally    ALLOW   file shares and accounts
    3  STAFF   -> 10.30.50.20   tcp 9100          ALLOW   printing only to the printer
    4  GUEST   -> 10.0.0.0/8    any               DENY    guests never reach inside (logged)
    5  IOT     -> any           any               DENY    cameras do not need the internet (logged)
    6  STAFF   -> 10.0.0.0/8    any               DENY    stop lateral movement (logged)
    7  STAFF,GUEST -> internet  tcp 80,443        ALLOW   via proxy
    8  any     -> any           any               DENY    default, logged

Rule 6 sits above rule 7 for the reason the evaluator showed: "internet" written as 0.0.0.0/0 would
otherwise include SERVERS on every port. Rules 4 and 5 are logged because a denied guest or camera
trying to reach inside is exactly what the SOC wants to see.

**Step 4 — check with flows.** Staff laptop → file server 445: rule 2, allow. Staff laptop → another
laptop 445: rule 6, deny (this one stops ransomware spreading laptop to laptop). Guest phone →
Tally: rule 4, deny. CCTV recorder → internet: rule 5, deny. IT workstation → file server RDP:
rule 1, allow.

**Step 5 — what to watch in the logs.** Hits on rules 4, 5 and 6 (something inside trying where it
should not) and any change to rule 1 (who gets admin access).`,
    mcqs: [
      mcq('A firewall reads rules top to bottom. Rule 3 allows 10.20.4.0/24 to anywhere; rule 7 denies 10.20.4.0/24 to the database subnet. What happens to a user\'s connection to the database?', [
        ['Rule 3 matches first, so it is allowed and rule 7 never fires for that traffic', true],
        ['Rule 7 wins because a deny rule always overrides an allow rule in any position', false],
        ['The firewall merges both rules and applies whichever one is more specific', false],
        ['The connection is dropped because two rules matching the same flow conflict', false],
      ], 'In first-match firewalls, the first rule that matches decides; a later deny is shadowed by an earlier, broader allow. Deny does not automatically beat allow, most firewalls do not pick the most specific rule for you, and overlapping rules are not treated as an error.'),
      mcq('Why does a stateful firewall not need a separate rule to let a web server\'s replies back to a user who opened the connection?', [
        ['It tracks the connection and allows packets that belong to one it already permitted', true],
        ['Replies use port 443 on both ends, which every firewall allows back in automatically by default', false],
        ['Replies from a server are never filtered, because only outbound traffic is checked', false],
        ['The user\'s browser sends a separate permission request for each reply packet', false],
      ], 'A stateful firewall records the permitted connection and lets its return traffic through, while dropping unsolicited packets. The client side uses an ephemeral port, inbound traffic is definitely filtered, and browsers send no per-packet permission requests.'),
      mcq('In a segmented design, which zone should be the only one allowed to open SSH and RDP sessions into the server and data zones?', [
        ['The management zone, holding jump hosts and admin workstations', true],
        ['The user zone, since IT staff sit at ordinary desks with laptops', false],
        ['The DMZ, because it is in front of every other zone already', false],
      ], 'Administrative protocols should come only from a small, hardened management zone, so a compromised user laptop or a public web server cannot administer internal systems. Allowing them from users or the internet-facing DMZ is exactly the lateral path segmentation is meant to remove.'),
    ],
    checkpoint: [
      mcq('A rule reads "STAFF → 0.0.0.0/0, any, ALLOW — internet access". Why is it more permissive than its comment says?', [
        ['0.0.0.0/0 also matches every internal address, so staff can reach all internal zones', true],
        ['0.0.0.0/0 only matches broadcast traffic, so in practice no internet access works', false],
        ['The rule allows inbound connections from the internet to staff laptops as well', false],
        ['"any" protocol means it also allows the firewall\'s own management interface only', false],
      ], '0.0.0.0/0 means every IPv4 address, internal ranges included; the fix is an explicit deny to internal ranges above it or an "internet only" object. It is not a broadcast match, a source-to-destination rule does not open the reverse direction on a stateful firewall, and "any" protocol has nothing to do with the management interface.'),
      mcq('The firewall log shows 600 DENY entries in five minutes from one internal laptop to 120 internal addresses on port 445. What should the analyst make of it?', [
        ['Possible internal scanning or worm-like spread over SMB; isolate and check the host', true],
        ['Normal Windows file sharing, which always tries every machine on the local subnet at start-up', false],
        ['A firewall fault, since denied traffic never appears in the logs of a working one', false],
        ['Harmless, because every attempt was denied and so nothing can have happened', false],
      ], 'One host trying SMB on 120 internal machines is the shape of discovery or ransomware-style spread (T1046, Remote Services T1021); the denies are the evidence and the laptop needs checking. Windows does not do this normally, denied traffic is logged on purpose, and blocked attempts still tell you the source is doing something wrong.'),
      mcq('Most companies filter inbound traffic carefully but allow all outbound traffic. What does tighter egress filtering mainly protect against?', [
        ['Infected internal machines calling out to controllers and uploading data', true],
        ['Attackers on the internet connecting directly to internal database servers', false],
        ['Employees receiving phishing emails through the corporate mail gateway', false],
      ], 'Egress filtering limits what an already-compromised host can do: beacon out, fetch tools, exfiltrate. Inbound connections from the internet are an ingress problem, and phishing is handled by mail filtering and user awareness, not by outbound firewall rules.'),
    ],
  },
  /* ── IDS_SURICATA_ZEEK ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_NETWORK_SECURITY_IDS_SURICATA_ZEEK',
    notes: `Nobody reads pcaps for a whole network all day. A SOC puts **sensors** where the traffic passes — the
internet edge, between important zones, on a cloud traffic mirror — and lets two kinds of tool do
the reading: a **signature engine** that raises alerts, and a **network monitor** that writes a log
line for every connection and every protocol event. The open-source pair almost every SOC knows is
**Suricata** (signatures) and **Zeek** (logs). Security Onion bundles both; Wazuh and Elastic
dashboards usually sit on top of their output.

## Suricata: rules that say "this, exactly"

A Suricata rule has a header (action, protocol, source, direction, destination) and options in
brackets. Three local rules for the traffic we saw in lab.pcap:

    alert dns $HOME_NET any -> any any (msg:"LOCAL long DNS query under t.example.net"; dns.query; content:".t.example.net"; endswith; nocase; bsize:>50; classtype:bad-unknown; sid:1000001; rev:1;)

    alert tcp $HOME_NET any -> 203.0.113.50 any (msg:"LOCAL connection attempt to watched address 203.0.113.50"; flags:S,12; classtype:trojan-activity; sid:1000002; rev:1;)

    alert tcp any any -> $HOME_NET any (msg:"LOCAL possible SYN scan, 50 SYNs in 10s from one source"; flags:S,12; threshold:type both, track by_src, count 50, seconds 10; classtype:attempted-recon; sid:1000003; rev:1;)

Reading them:

- **alert / drop / pass**: alert only logs; drop needs Suricata running inline as an IPS.
- **$HOME_NET / $EXTERNAL_NET** come from suricata.yaml. If HOME_NET does not describe your network,
  rules written with it silently never match.
- **dns.query** is a sticky buffer: the content match applies to the query name only, not to any
  byte in the packet. Suricata has these for http.uri, http.user_agent, tls.sni and many more.
- **flags:S,12** means SYN set and nothing else that matters (12 says ignore the two congestion bits).
- **threshold** turns "one SYN" (useless) into "50 from one source in 10 seconds".
- **msg, sid, rev, classtype**: the analyst-facing name, a unique ID (1000000–1999999 is the range
  for your own local rules), a revision number you increase on every change, and the category from
  classification.config (which sets the default priority).

Running it over a capture, written from the Suricata documentation (Suricata is not installed on the
machine these notes were written on, so this was not run):

    suricata -T -c /etc/suricata/suricata.yaml -S local.rules          # test the rules load
    suricata -c /etc/suricata/suricata.yaml -S local.rules -k none -r lab.pcap -l ./out
    jq -c 'select(.event_type=="alert") | [.timestamp, .src_ip, .dest_ip, .alert.signature]' out/eve.json

-S loads only that rule file; -k none stops Suricata discarding packets with bad checksums (common
in captures taken on the sending machine, and in hand-built ones); eve.json is the JSON log every
SIEM ingests. In production you also run the **ET Open** ruleset, updated with suricata-update.

## Zeek: a log line for everything

Zeek does not decide what is bad. It turns traffic into structured logs: conn.log (every
connection), dns.log, http.log, ssl.log, files.log, x509.log, weird.log (protocol oddities) and
notice.log (when a script decides something deserves attention). From the Zeek documentation (not
run here):

    zeek -C -r lab.pcap                    # -C: ignore checksum errors; logs land in the current folder
    zeek-cut id.orig_h id.resp_h id.resp_p service conn_state < conn.log
    zeek -C -r lab.pcap LogAscii::use_json=T

The default log format is tab-separated with header lines starting with #, and the column names on
the #fields line. A hand-written conn.log for lab.pcap's traffic (shown aligned here; in the file
the separator is a tab):

    #fields ts             uid  id.orig_h   id.orig_p id.resp_h     id.resp_p proto service duration orig_bytes resp_bytes conn_state history
            1760000030.10  C1a  10.10.0.23  52000     203.0.113.50  443       tcp   ssl     0.33     220        90         SF         ShADadFf
            1760000400.00  C6f  10.10.0.66  61000     10.10.0.10    1         tcp   -       -        -          -          REJ        Sr

pandas reads it in four lines once you take the names from #fields:

    import pandas as pd

    def read_zeek(path):
        with open(path) as f:
            fields = next(line for line in f if line.startswith('#fields')).rstrip('\\n').split('\\t')[1:]
        return pd.read_csv(path, sep='\\t', comment='#', names=fields, na_values=['-', '(empty)'])

    conn = read_zeek('conn.log')
    conn['ts'] = pd.to_datetime(conn['ts'], unit='s', utc=True).dt.tz_convert('Asia/Kolkata')
    print(conn['conn_state'].value_counts().to_string())
    print(conn.nlargest(2, 'duration')[['id.orig_h', 'id.resp_h', 'id.resp_p', 'duration', 'resp_bytes']].to_string(index=False))
    print(conn.groupby('id.orig_h')['id.resp_p'].nunique().sort_values(ascending=False).to_string())

On our ten-line file it printed:

    conn_state
    SF      7
    REJ     2
    RSTO    1
     id.orig_h    id.resp_h  id.resp_p  duration  resp_bytes
    10.10.0.31    10.10.0.5        445   1840.20  48211903.0
    10.10.0.23 203.0.113.50        443      0.33        90.0
    id.orig_h
    10.10.0.66    3
    10.10.0.21    2
    10.10.0.23    2
    10.10.0.31    1

Two details matter. Zeek writes ts as UTC epoch seconds, so converting to Asia/Kolkata is what makes
it line up with the firewall and the user's "about 10 o'clock". And '-' must become NaN, or pandas
reads numeric columns as text (resp_bytes shows as a float because NaN forces it).

**conn_state** is the most useful column for an analyst: SF (normal setup and close), S0 (a SYN
with no answer — dropped or nothing there), REJ (refused with a reset), RSTO/RSTR (reset by the
originator or responder after setup), OTH (mid-stream, no handshake seen). A host with hundreds of
S0 and REJ is scanning or failing to reach something; it did not "connect" to anything.

## What each sees, and what both miss

- **Suricata** is precise on known patterns and noisy until tuned: a new rule set on a real network
  fires thousands of times a day. Tuning (suppressing a rule for one known host, raising a
  threshold, fixing HOME_NET) is part of the job. It cannot match content inside TLS.
- **Zeek** sees everything that passes it but judges nothing; you write the analytics (long
  connections, beacons, rare destinations, odd DNS) yourself, in a SIEM or in pandas.
- **Both** see only traffic that passes the sensor. Laptop-to-laptop traffic inside one switch,
  traffic in the cloud that is not mirrored, and anything over a VPN that ends past the sensor are
  invisible. Know where your sensors are before you say "there was no traffic".`,
    workedExample: `**Problem:** after loading ET Open on a new sensor at a Bengaluru GCC, one rule — "ET POLICY
curl User-Agent Outbound" — has fired 4,200 times in a day, almost all from 10.40.8.0/24. The L2 asks
you to "make it stop" without going blind.

**Step 1 — look before you touch.** Group the alerts by source and destination:

    jq -r 'select(.event_type=="alert" and .alert.signature_id==<that sid>) | "\\(.src_ip) \\(.dest_ip)"' eve.json | sort | uniq -c | sort -rn | head

Result (from the dashboard, summarised): 4,150 from three build servers in 10.40.8.0/24 to the
company's own artifact repository and a package mirror; 50 from scattered laptops to assorted sites.

**Step 2 — decide what is expected.** Build servers run curl all day; that is their job. Laptops
running curl are usually developers, but curl from a finance laptop would be interesting. So the
signal worth keeping is "curl from anywhere except the build servers".

**Step 3 — suppress narrowly, never disable.** In threshold.config:

    suppress gen_id 1, sig_id <that sid>, track by_src, ip 10.40.8.0/24

That silences the rule only for the build subnet. Disabling the rule entirely would also hide the
finance laptop. Write down why, who approved it, and a date to review it — suppressions that
nobody remembers become blind spots.

**Step 4 — check the result.** Re-run over yesterday's capture or watch a day of alerts: about 50 a
day should remain, each worth a glance.

**Step 5 — tell the dashboard owners.** A rule that went from 4,200 to 50 alerts will change a
trend chart; a short note avoids someone "investigating" the drop.

The method generalises: count, find the expected source, suppress for that source only, record it,
verify. Turning rules off because they are noisy is how SOCs miss the one alert that mattered.`,
    mcqs: [
      mcq('A local Suricata rule for an outbound beacon never fires, although the traffic is in the capture. The rule header reads alert tcp $EXTERNAL_NET any -> $HOME_NET 443. What is wrong?', [
        ['The direction is reversed: the beacon goes from HOME_NET out to the external server', true],
        ['Port 443 traffic is encrypted, so Suricata can never apply a rule header to it', false],
        ['$EXTERNAL_NET is not a valid variable and must be written as the word any', false],
        ['Suricata rules only fire when Suricata runs inline in IPS mode, never offline against a pcap', false],
      ], 'The header matches packets from EXTERNAL_NET to HOME_NET port 443, but the beacon flows from an internal host to an outside server on 443. Encryption hides payloads, not addresses and ports, EXTERNAL_NET is a standard variable, and alert rules work offline with -r.'),
      mcq('In Zeek\'s conn.log, a laptop has 300 rows to 300 different internal addresses on port 445, all with conn_state S0. What happened?', [
        ['It sent SYNs that got no reply at all; none of those connections were set up', true],
        ['It connected successfully to all 300 machines and then closed each session normally', false],
        ['It copied files from 300 machines, since S0 marks a completed SMB transfer', false],
        ['The responders rejected each attempt by sending back a TCP reset packet', false],
      ], 'S0 means a connection attempt was seen with no reply: nothing was established. SF is a normal setup and close, REJ is a refusal by reset, and conn_state says nothing about SMB file copies.'),
      mcq('Why does a Suricata rule use the dns.query keyword before content:".t.example.net"?', [
        ['So the content is matched only inside the DNS query name, not anywhere in the packet', true],
        ['Because content matching is disabled unless a protocol keyword comes immediately before', false],
        ['To make Suricata send a DNS query for that name and check whether it resolves', false],
        ['Because dns.query converts the match to a regular expression automatically', false],
      ], 'dns.query is a sticky buffer: the following content applies to the query name, which is precise and cheap. Content works without buffers (matching raw payload), Suricata never makes its own lookups, and regex needs pcre.'),
      mcq('Your team says "the IDS saw no traffic between the two laptops, so lateral movement is ruled out". Both laptops sit on the same access switch and the sensor is at the internet edge. What do you say?', [
        ['The sensor never saw that path; absence there proves nothing, so check endpoint logs', true],
        ['They are right, because any lateral movement must cross the internet edge first', false],
        ['They are right, as long as the edge Suricata sensor was running the full ET Open rule set that day', false],
      ], 'Traffic between two machines on one switch never reaches an edge sensor, so its silence tells you nothing; endpoint and switch logs are needed. Lateral movement is internal by definition, and no rule set can alert on traffic the sensor never receives.'),
    ],
    checkpoint: [
      mcq('What is the main difference between what Suricata and Zeek give a SOC analyst?', [
        ['Suricata raises alerts on rule matches; Zeek writes logs of all activity and leaves judging to you', true],
        ['Suricata only reads pcap files offline, while Zeek only works on live network interfaces', false],
        ['Suricata handles TCP and Zeek handles UDP, so a SOC runs both to cover all protocols', false],
        ['Zeek decrypts TLS traffic and Suricata does not, which is why Zeek has an ssl.log', false],
      ], 'Suricata is a signature engine producing alerts; Zeek is a network monitor producing structured logs for every connection and protocol event. Both run live and offline, both handle TCP and UDP, and Zeek\'s ssl.log holds handshake metadata, not decrypted content.'),
      mcq('A rule with sid:1000004 is edited to fix its content match. What should change in the rule besides the fix?', [
        ['Increase rev, so alerts show which version of the rule produced them', true],
        ['Change the sid to a new number, because a sid can only ever be loaded once', false],
        ['Change the classtype, since any edit changes what category the rule is in', false],
        ['Nothing else; Suricata tracks every rule edit automatically in eve.json', false],
      ], 'The sid identifies the rule for its lifetime and rev counts revisions, so alerts can be tied to the version that produced them. Changing the sid breaks history and suppressions, the classtype only changes if the meaning does, and Suricata does not track edits itself.'),
      mcq('A Zeek conn.log timestamp reads 1792386860.0 and the user says the problem started "around 10:44 in the morning". How do you line them up?', [
        ['Treat ts as UTC epoch seconds and convert it to IST (UTC+5:30) before comparing', true],
        ['Zeek writes ts in the sensor\'s local time, so it can be compared directly', false],
        ['Divide ts by 3,600 to get the hour of the day, then add the office opening time', false],
        ['Ignore the user\'s time, since only the sensor\'s clock is ever considered reliable', false],
      ], 'Zeek timestamps are seconds since the Unix epoch in UTC; converted to Asia/Kolkata this one is 10:44:20 IST. It is not local time, dividing by 3,600 gives hours since 1970, and a user\'s report is useful evidence to reconcile, not to discard.'),
    ],
  },

  /* ── ZERO_TRUST_REMOTE ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_NETWORK_SECURITY_ZERO_TRUST_REMOTE',
    notes: `Until about 2020 most Indian companies drew one line: inside the office network was trusted, outside
was not, and a **VPN** let remote staff come inside. Work-from-home, SaaS and cloud broke that
picture — the data lives in Microsoft 365, Google Workspace, Zoho and AWS, and the people are at
home in Nagpur. **Zero trust** is the answer most organisations are moving to. A SOC analyst needs
both: VPN logs are still everywhere, and zero-trust access produces the most useful identity
signals you will get.

## What a VPN does, and what it does not

A remote-access VPN (IPsec, an SSL/TLS VPN, WireGuard) builds an encrypted tunnel from the laptop to
a VPN gateway and gives the laptop an address on the internal network. It protects the traffic
from the café Wi-Fi to the office. What it does **not** do:

- **It does not limit what you reach once connected.** Many VPNs drop the user into a flat network:
  the sales intern's laptop can reach the HR database's port, because "it's on the VPN".
- **It trusts the connection, not each request.** Log in once at 9 a.m.; every request afterwards
  is trusted until the tunnel drops.
- **It says nothing about the device.** A personal laptop full of pirated software connects just as
  well as a managed one, unless posture checks are added.
- **The gateway itself is exposed to the internet.** VPN appliances and other edge devices are a
  favourite target; unpatched ones have been exploited widely, and MITRE lists the technique as
  External Remote Services (T1133). Patch them first and watch them closely.

**Split tunnelling** — only office-bound traffic goes through the tunnel, the rest goes straight to
the internet — saves bandwidth but means the SOC does not see that laptop's internet traffic. Full
tunnelling sends everything through the office and its proxy. Know which your organisation uses
before you conclude "the laptop made no suspicious connections".

## Zero trust: the principles

NIST SP 800-207 (Zero Trust Architecture) is the reference most organisations quote. Reduced to
what an analyst needs:

1. **Verify every request explicitly.** Each access is decided on who (strong authentication, MFA),
   from what device (managed? patched? disk encrypted? EDR running?), to what resource, from where,
   and when — not on "came from the internal network".
2. **Least privilege, per application.** A user gets access to the three applications their role
   needs, not to a network range. Access is granted for a session and re-checked.
3. **Assume breach.** Design as if an attacker is already inside: segment (micro-segmentation
   between workloads), encrypt internal traffic too, and log every decision for the SOC.

In practice this is built from an identity provider (Microsoft Entra ID, Okta, Google, Keycloak),
device management, and an access layer in front of applications — often called **ZTNA** (zero
trust network access) or an identity-aware proxy. The user opens the HR portal; the proxy checks
identity, MFA, device posture and policy, then connects them to that one application. The HR
portal is never exposed directly to the internet, and the user never gets a route to the HR subnet.

## VPN versus ZTNA, side by side

    Question                         VPN                          ZTNA / zero trust
    What is granted?                 a network (a route)          one application
    When is trust decided?           at login                     every request / session
    Is the device checked?           often not                    yes, posture is policy input
    What can a stolen login reach?   whatever the network allows  only that user's apps, with MFA
    What does the SOC see?           tunnel up/down, IP assigned  each access decision, with reasons

Neither is a product you switch on. Most organisations run both for years: ZTNA for web and SaaS
applications, a VPN kept for the few legacy systems that need network-level access, and
administrators reaching servers through a hardened jump host or a privileged access tool.

## What the analyst watches

- **VPN logs:** logins from countries or ISPs the user has never used; the same account connected
  from two cities at once ("impossible travel" — Delhi at 10:02 and Singapore at 10:20); many
  failed logins against many accounts (password spraying, T1110.003); a login at 3 a.m. followed by
  large transfers; a new device for a privileged account.
- **Gateway health:** the VPN appliance's version against the vendor's advisories, and new admin
  accounts or configuration changes on it — attackers who exploit an edge device often add a user.
- **ZTNA / identity logs:** access denied for device posture (unmanaged laptop trying the finance
  app), MFA fatigue (many push prompts the user keeps rejecting, then one approval), and a user
  suddenly requesting applications outside their role.

## India context

Indian banks follow the RBI's cyber-security expectations, which include strong authentication for
remote and privileged access and monitoring by a SOC; payments platforms built around UPI treat
every API call as a request to verify, which is the zero-trust idea at the application level.
CERT-In's 2022 directions require reporting notifiable incidents within six hours and keeping logs,
so VPN and access logs are not optional extras — they are evidence the organisation must be able to
produce. State only what your organisation's policy says when you write a report; quote the
regulation through your compliance team.`,
    mcqs: [
      mcq('A sales intern connected over the company VPN can reach the HR database\'s port, though the intern has no HR role. Which zero-trust principle is being broken?', [
        ['Least privilege: access should be to the apps the role needs, not a whole network', true],
        ['Encryption in transit: the VPN tunnel should have been using a much stronger cipher suite', false],
        ['Assume breach: the intern should be treated as an attacker and blocked outright', false],
        ['Multi-factor authentication: the intern logged in with only a password that day', false],
      ], 'The problem is scope: the VPN granted a network route instead of per-application access. The tunnel encryption is fine, assume breach does not mean blocking every employee, and MFA at login would not have stopped the reachable database port.'),
      mcq('The same employee account logs in to the VPN from Delhi at 10:02 and from Singapore at 10:20. What should the analyst do first?', [
        ['Treat it as impossible travel: check both sessions and confirm with the user out of band', true],
        ['Ignore it, because VPN providers often route users through other countries anyway', false],
        ['Block the Delhi session immediately, since only the foreign login can be genuine', false],
      ], 'Two locations too far apart to travel between in 18 minutes suggest a stolen credential; check device, IP and activity for both, and verify with the user by phone, not by email to the possibly compromised account. Dismissing it skips the check, and assuming which session is real is guessing.'),
      mcq('With split tunnelling on, a laptop\'s web browsing goes straight to the internet while office traffic uses the VPN. What does that mean for the SOC?', [
        ['The office proxy and sensors do not see that laptop\'s internet traffic', true],
        ['All of the laptop\'s traffic is now encrypted twice and the SOC sees nothing', false],
        ['The VPN gateway logs each website visited, so the proxy is no longer needed', false],
        ['The laptop cannot reach the office network at all while browsing the web', false],
      ], 'Split tunnelling sends internet-bound traffic directly from the laptop, bypassing the office proxy and network sensors, so endpoint telemetry has to cover it. Office traffic still goes through the tunnel, the gateway does not log browsing it never carries, and office access still works.'),
    ],
    checkpoint: [
      mcq('What does a ZTNA access layer grant a user, compared with a traditional remote-access VPN?', [
        ['A session to one application after checking identity and device, not a network route', true],
        ['A faster tunnel to the same internal network, using a newer and lighter encryption protocol', false],
        ['Permanent access to all company applications once the user has passed MFA once', false],
        ['Access only from inside the office, since zero trust does not support remote users', false],
      ], 'ZTNA brokers access to individual applications and decides on each session using identity, MFA and device posture. It is not just a faster VPN, it does not grant permanent blanket access, and remote work is exactly what it is designed for.'),
      mcq('A VPN appliance at the internet edge has a critical vulnerability published by its vendor. Why should it be patched before most internal servers?', [
        ['It is reachable by anyone on the internet and leads straight into the internal network', true],
        ['It stores every user\'s files, so an outage would delete company data permanently', false],
        ['It only affects performance, so patching it first keeps remote users happy', false],
      ], 'Edge devices are exposed to the whole internet and sit at the door to the internal network, which is why they are heavily targeted (External Remote Services, T1133). A VPN gateway does not store user files, and a published critical vulnerability is a security issue, not a performance one.'),
      mcq('An identity log shows 25 MFA push prompts to one user in ten minutes, all rejected, then one approved. What is the most likely explanation?', [
        ['MFA fatigue: someone with the password kept pushing until the user approved one', true],
        ['A broken authenticator app on the phone that sent the same prompt many times over by mistake', false],
        ['The user forgetting their password repeatedly and trying again each time', false],
        ['Normal behaviour when a user signs in on several devices at the same time', false],
      ], 'Repeated pushes the user did not start, ending in one approval, is the MFA-fatigue pattern: the password is already known. A forgotten password fails before MFA is sent, multiple devices produce a handful of prompts, not 25 rejected ones, and a broken app does not explain the rejections.'),
    ],
  },

  /* ── DEBUGGING ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_NETWORK_SECURITY_DEBUGGING',
    notes: `Network-security mistakes rarely announce themselves. A filter shows nothing and you conclude "no
traffic"; a rule never fires and you conclude "no attack". The habit this unit builds: when a tool
shows nothing, **prove the tool can see the thing** before trusting the nothing. Six broken cases,
each with the symptom, the cause and the fix.

## 1. The filter that matches nothing

**Symptom.** In lab.pcap you type dns.qry.name == "example.net" to find lookups under that domain.
Zero packets, though you know 10.10.0.23 made six.

**Cause.** == compares the whole field. The names are like mxgedn….t.example.net, so no packet's
query name equals "example.net".

**Fix.** dns.qry.name contains ".example.net", or a regex with matches. **Check** by first applying
the bare dns filter and confirming the packets you expect are there, then narrowing.

## 2. A display filter where a capture filter belongs

**Symptom.** dumpcap -i 2 -f "ip.addr == 10.10.0.23" -w x.pcapng fails with a filter syntax error.
A teammate "fixes" it by dropping -f and capturing everything for an hour — 6 GB of a busy link.

**Cause.** -f takes a BPF capture filter, a different language.

**Fix.** -f "host 10.10.0.23". Display-filter syntax goes in Wireshark's filter bar or tshark -Y.
Rule of thumb: BPF uses words (host, net, port, and, not); display filters use field names and
operators (ip.addr, ==, &&).

## 3. The Suricata rule that never fires

**Symptom.** You add

    alert dns $EXTERNAL_NET any -> $HOME_NET any (msg:"LOCAL long query under t.example.net"; dns.query; content:".T.EXAMPLE.NET"; endswith; sid:1000001; rev:1;)

run suricata -r lab.pcap -S local.rules, and eve.json has no alerts.

**Causes (three, stacked).** The direction is backwards: queries go from HOME_NET to the resolver,
not from outside in. The content is upper case without nocase, and DNS names in the capture are
lower case. And the hand-built capture's checksums were never computed, so without -k none
Suricata may discard the packets before any rule sees them.

**Fix.** $HOME_NET any -> any any, add nocase, run with -k none. Then **test with a known
positive**: a capture you know contains a matching query. A rule you have never seen fire is not a
rule you can rely on.

## 4. The rule that fires on everything

**Symptom.** alert tcp any any -> any any (msg:"LOCAL SYN seen"; flags:S; sid:1000010; rev:1;) gives
you an alert for every connection on the network.

**Cause.** A single SYN is normal; the rule has no notion of "too many".

**Fix.** Count per source with a threshold (count 50, seconds 10, track by_src), limit it to
$HOME_NET as destination, and add classtype:attempted-recon so it sorts sensibly. A rule's job is to
separate the rare from the normal; one that fires on normal traffic gets ignored, and then so does
everything else from that sensor.

## 5. Reading the capture wrong

**Symptom.** A ticket says: "Firewall is blocking 10.10.0.10 port 23 — we saw RST packets." Another
says: "10.10.0.66 connected to 1,024 services on the test server."

**Cause.** RST-ACK in reply to a SYN comes from the **host**: the port is closed. A firewall that
drops shows nothing (S0 in Zeek); one that rejects may send RST or ICMP, but then the reset comes
from the firewall's behaviour, not the server's — check the source address and the TTL. As for the
second ticket: 1,021 of those were refused and the other three were half-open, so 10.10.0.66
**connected to nothing**; it probed 1,024 ports.

**Fix.** Say what the packets show: "10.10.0.10 refused port 23 (RST-ACK from the host);
10.10.0.66 attempted 1,024 ports, 3 answered (22, 80, 443), no connection was completed."

**A related misread: time.** Zeek's ts is UTC; Wireshark shows the analyst's local time by default.
A beacon that "started at 04:44" in one report and "10:14" in another is the same event, 5 hours 30
minutes apart. Convert everything to one zone (state which) before building a timeline.

## 6. The deny rule that is never reached

**Symptom.** Policy says users must not reach the database subnet. The rule exists:
deny-users-to-db. Yet the database team sees connections from user laptops, and the firewall's
hit counter for deny-users-to-db is zero.

**Cause.** Rule order. allow-users-any (users → 0.0.0.0/0) sits above it; first match wins, so the
deny is shadowed. The evaluator from the firewalls unit shows exactly this:

    ('10.20.4.33', '10.20.3.5', 'tcp', 5432) -> ALLOW allow-users-any
    shadowed in reordered: [('deny-users-to-db', 'never reached, shadowed by', 'allow-users-any')]

**Fix.** Move specific denies above broad allows, and make "internet" mean internet (exclude internal
ranges). **Check** hit counters monthly: a deny rule with zero hits is either unnecessary or
shadowed, and you need to know which. A related classic: a temporary "allow any any" added at the
top during an outage and never removed — every rule below it is dead. Find it by sorting rules by
hit count and by date added.`,
    mcqs: [
      mcq('After adding a new Suricata rule, eve.json shows no alerts for it on the day\'s traffic. What is the right next step before reporting "no matching activity"?', [
        ['Run it over a capture known to contain a match and confirm it fires there', true],
        ['Report no matching activity, since Suricata always logs a rule that fails to load', false],
        ['Delete the rule and rely on the ET Open rules, which already cover every case', false],
        ['Restart the sensor twice, because new rules need two reloads before they apply', false],
      ], 'A rule that has never fired on a known positive may be broken (direction, case, buffer, HOME_NET, checksums). A rule can load cleanly and still never match, ET Open does not cover your local indicators, and there is no two-reload requirement.'),
      mcq('On an analyst\'s laptop set to IST, Wireshark shows a capture\'s first beacon at 10:14:20, but a colleague\'s Zeek-based report says 04:44:20 for the same connection. What explains the gap?', [
        ['Zeek ts is UTC; Wireshark showed IST, 5 hours 30 minutes ahead', true],
        ['Zeek logs the end of a connection, which happened hours after it started', false],
        ['One of the two tools read a different capture file from another day', false],
      ], 'The gap is exactly IST\'s UTC offset, so one view is UTC and the other local time. Zeek\'s ts is the connection start, and these beacons last under a second, so the gap is not duration; a different file would not differ by exactly 5:30.'),
      mcq('A firewall\'s hit counter shows zero hits in six months on the rule deny-guest-to-internal, yet guests regularly try internal printers. What is the most likely cause?', [
        ['An earlier, broader allow rule matches guest traffic first and shadows the deny', true],
        ['Deny rules never increase hit counters, which only count allowed connections', false],
        ['Guest devices use IPv6, which firewalls always allow without checking rules', false],
        ['The counter resets every day, so it will always show zero when someone checks', false],
      ], 'If traffic the deny should catch is happening and the deny has no hits, something above it is matching first. Deny rules do count hits, IPv6 is filtered by its own rules rather than allowed by default, and counters do not reset daily on their own.'),
      mcq('Zeek shows 1,024 rows from 10.10.0.66 to 10.10.0.10: 1,021 REJ and 3 RSTO with history ShR. Which summary is accurate?', [
        ['It probed 1,024 ports; 3 answered and no connection was ever completed', true],
        ['It connected to 1,024 services and exchanged data with three of them', false],
        ['A firewall blocked 1,021 ports and allowed the three busiest ones through', false],
      ], 'REJ is a refused attempt, and ShR means SYN, SYN-ACK, then the originator reset before completing the handshake, so no data was exchanged anywhere. The resets came from the host, which shows closed ports rather than firewall decisions.'),
    ],
  },

  /* ── PRACTICE ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_NETWORK_SECURITY_PRACTICE',
    notes: `Eight exercises. Do each on paper (or in Python where it says so) before reading the answer.

## 1. Filters (easy)

Write Wireshark display filters for: (a) everything to or from 192.0.2.40; (b) only connection
attempts to port 3389; (c) DNS answers that say the name does not exist; (d) TLS ClientHellos whose
server name contains "example".

**Answer.** (a) ip.addr == 192.0.2.40 (b) tcp.flags.syn == 1 && tcp.flags.ack == 0 && tcp.dstport ==
3389 (c) dns.flags.rcode == 3 (d) tls.handshake.type == 1 && tls.handshake.extensions_server_name
contains "example".

## 2. Capture filter (easy)

Write the dumpcap -f filter to save traffic for host 10.10.0.23 except SSH.

**Answer.** -f "host 10.10.0.23 and not port 22". BPF, not display-filter syntax.

## 3. Read the handshake (easy)

What does each sequence mean? (a) S, SA, A, PA, PA, FA, FA, A (b) S, RA (c) S, S, S with no reply.

**Answer.** (a) a normal connection with data both ways and a clean close (Zeek SF); (b) refused by
the host — closed port (REJ); (c) retransmitted SYNs, nothing answered — dropped by a firewall or the
host is down (S0).

## 4. Periodicity in Python (medium)

Session start times (seconds) from one host to one address:
0, 301, 598, 905, 1199, 1502, 1797, 2101, 2400, 2703. Compute mean gap, standard deviation and cv.
Is it periodic?

**Answer.**

    import statistics
    ts = [0, 301, 598, 905, 1199, 1502, 1797, 2101, 2400, 2703]
    gaps = [b - a for a, b in zip(ts, ts[1:])]
    m, sd = statistics.mean(gaps), statistics.pstdev(gaps)
    print(gaps, round(m, 1), round(sd, 1), round(sd / m, 3))

prints [301, 297, 307, 294, 303, 295, 304, 299, 303] 300.3 4.1 0.014. Nine gaps of about five
minutes with cv 0.014: clock-like. Next step: which process, and is it known software?

## 5. Entropy (medium)

Which label is more random-looking, and by how much: "payments" or "k3x9qz7p"?

**Answer.** Neither. With the entropy function from the protocols unit, entropy('payments') and
entropy('k3x9qz7p') both return 3.0: each label has eight characters and no character repeats, so
each scores log2(8) = 3 bits, the maximum for its length. **Entropy
cannot tell them apart** — on short labels it saturates at log2(length). That is why the detection
uses length plus entropy plus volume plus one domain, never entropy alone.

## 6. Rule order (medium)

Rules, first match wins: 1) GUEST → any, tcp 80,443, ALLOW; 2) GUEST → 10.0.0.0/8, any, DENY;
3) default DENY. A guest phone opens http://10.30.20.5 (the file server's web admin page). Allowed?
Fix it.

**Answer.** Allowed by rule 1: "any" includes 10.30.20.5, and port 80 matches. Rule 2 is shadowed for
web ports. Swap them: the internal deny goes first, the internet allow second.

## 7. Fix the Suricata rule (medium)

    alert http $HOME_NET any -> $EXTERNAL_NET any (msg:"LOCAL script UA outbound"; content:"python-requests"; sid:1000004;)

It fires on a developer's blog post that mentions python-requests, and the SOC lead asks for a
classtype and revision. Fix it.

**Answer.**

    alert http $HOME_NET any -> $EXTERNAL_NET any (msg:"LOCAL script User-Agent outbound"; flow:established,to_server; http.user_agent; content:"python-requests"; startswith; classtype:policy-violation; sid:1000004; rev:2;)

The sticky buffer http.user_agent limits the match to the header; flow:established,to_server
limits it to requests; rev goes up because the rule changed.

## 8. Zeek triage with pandas (harder)

Using read_zeek from the Zeek unit on a conn.log, write expressions for: (a) the five largest
uploads to non-internal addresses; (b) sources with more than 100 REJ or S0 rows.

**Answer.**

    ext = conn[~conn['id.resp_h'].str.startswith('10.')]
    print(ext.nlargest(5, 'orig_bytes')[['ts', 'id.orig_h', 'id.resp_h', 'orig_bytes']])
    failed = conn[conn['conn_state'].isin(['REJ', 'S0'])]
    print(failed.groupby('id.orig_h').size().loc[lambda s: s > 100])

orig_bytes is what the originator sent — for an internal client, the upload. For real networks use
the organisation's full list of internal ranges, not just "starts with 10.".`,
    mcqs: [
      mcq('Ten session start times from one host have gaps between 294 and 307 seconds. Which reading of the cv of 0.014 is right?', [
        ['The connections are timer-driven; now find the process and whether it is known', true],
        ['The connections are random, because a cv below 1 means no pattern at all exists', false],
        ['The host is definitely compromised, since only malware connects every five minutes', false],
        ['The sample is too small to judge, because cv needs at least 100 gaps to mean anything', false],
      ], 'A cv near zero over nine gaps means very regular, automated timing. Low cv means regular, not random; legitimate agents and updaters also run on timers; and nine consistent gaps are enough to call it periodic — three would not be.'),
      mcq('Why do the labels "payments" and "k3x9qz7p" get the same Shannon entropy score of 3.0?', [
        ['Both have eight distinct characters, and short labels cap entropy at log2 of their length', true],
        ['Entropy ignores digits, so k3x9qz7p is scored as the five letters kxqzp only', false],
        ['Both are eight characters long, and entropy measures only the length of a label', false],
        ['The function rounds to one decimal place, which hides the real difference', false],
      ], 'Each label has eight characters, all different, so each scores log2(8) = 3.0 bits — the maximum for its length. Entropy counts every character, depends on the character frequencies rather than length alone, and 3.0 is exact here, not a rounding effect.'),
      mcq('A guest Wi-Fi rule "GUEST → any, tcp 80,443, ALLOW" sits above "GUEST → 10.0.0.0/8, any, DENY". What can a guest reach?', [
        ['Internal web servers on 80 and 443, because the allow above catches them first', true],
        ['Nothing internal, because the deny names internal addresses more specifically', false],
        ['Only the internet, since "any" in firewall rules always means external addresses', false],
      ], 'First match wins, and "any" includes internal addresses, so guests reach internal web ports before the deny is considered. Firewalls do not choose the more specific rule for you, and "any" is not limited to the internet.'),
      mcq('In a Zeek conn.log, which column tells you how many bytes an internal client uploaded during a connection it started?', [
        ['orig_bytes, the payload bytes sent by the originator', true],
        ['resp_bytes, the payload bytes sent by the responder', false],
        ['duration, multiplied by the link\'s bandwidth in bytes', false],
        ['missed_bytes, which counts bytes sent to the internet', false],
      ], 'The originator is the side that opened the connection, so orig_bytes is what the client sent. resp_bytes is the reply direction, duration times bandwidth is not a byte count, and missed_bytes counts bytes the sensor failed to see.'),
      mcq('Which Suricata change stops a User-Agent rule firing when a web page merely mentions "python-requests" in its text?', [
        ['Put http.user_agent before the content so only that header is searched', true],
        ['Add nocase to the content, so the match becomes more precise than it was before', false],
        ['Change the action from alert to drop, so the page is simply blocked', false],
        ['Raise rev from 1 to 2, which tells Suricata the rule is now stricter', false],
      ], 'The http.user_agent sticky buffer restricts the match to the User-Agent header. nocase makes matching looser, drop changes what happens when it matches, not what matches, and rev is only a version label.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_NETWORK_SECURITY_INTERVIEW_QUESTION',
    notes: `SOC L1/L2 interviews at MSSPs, banks and GCCs test network security with scenarios, not definitions.
Four questions you will meet, a model answer, and the follow-up a good answer earns.

## Q1. "Our SIEM alerts that a laptop contacted an IP on a threat-intel list. Walk me through it."

**Model answer.** "First I check the alert itself: which laptop, which IP, which port, when, how many
times, and how good the intel source is — some feeds list shared hosting IPs that thousands of
legitimate sites use. Then I look at the network evidence: Zeek conn.log or firewall logs for all
connections from that laptop to that IP — one connection or a regular pattern? bytes in and out? —
and the DNS log for which name resolved to that IP, which often explains it (a CDN, an ad network).
If it is a single small connection to a shared host, I close it as a likely false positive with my
reasoning. If it is periodic, or there were uploads, or the name looks generated, I check the
endpoint: which process made the connection, using EDR. If that is unknown software, I escalate to
L2 with the timeline and recommend isolating the laptop."

**Follow-up:** "The IP is a big cloud provider's address. Does that change anything?" — Yes: a cloud
IP is shared, so the IP alone is weak; the domain name (from DNS or TLS SNI), the timing pattern and
the process carry the weight. Block by name or at the endpoint, not the whole IP range.

## Q2. "What is the difference between an IDS and an IPS, and where do Suricata and Zeek fit?"

**Model answer.** "An IDS watches a copy of traffic — from a SPAN port or TAP — and alerts; it cannot
stop anything. An IPS sits inline, so it can drop packets that match, but a false positive now breaks
real traffic and a crash can cut the link, so IPS rules are chosen carefully. Suricata can run in
either mode with signature rules. Zeek is neither, really: it is a network monitor that writes
structured logs of every connection and protocol event, and you build detections on those logs.
Most SOCs run both: Suricata for known-bad, Zeek for the evidence and for hunting."

**Follow-up:** "Which would you trust to tell you a laptop made a connection at 10:14?" — Zeek's
conn.log (or a firewall log), because it records every connection whether or not a rule matched.
Suricata only tells you when a rule fired.

## Q3. "Explain the TCP three-way handshake. How does a port scan look in logs?"

**Model answer.** "The client sends SYN, the server replies SYN-ACK if the port is open — or RST if it
is closed — and the client sends ACK. A SYN scan (T1046) sends SYNs to many ports and usually
resets instead of completing, so in Zeek you see one source with hundreds of rows to many ports,
mostly REJ with some S0 if a firewall drops, and the open ports as short resets after a SYN-ACK. In
the firewall you see many denies from one source across ports in seconds. The first question is
then whether the source is our authorised vulnerability scanner — many are — before escalating."

**Follow-up:** "How would you detect a slow scan, one port every five minutes?" — Thresholds over
seconds miss it; count distinct destination ports or hosts per source over hours or a day, and
compare with that source's normal. Zeek logs kept for weeks make this a simple aggregation.

## Q4. "VPN or zero trust — which would you recommend for a 300-person company moving to remote work?"

**Model answer.** "For their SaaS and web apps, zero-trust access: identity provider with MFA, device
posture checks, per-application access through a ZTNA or identity-aware proxy, so a stolen password
reaches only that user's apps and every access is logged. I would keep a VPN only for the few legacy
systems that need network access, restricted to the people who need them, and patch the VPN gateway
quickly because edge devices are targeted. Admin access goes through a jump host. And the SOC gets
both logs, so impossible travel and posture failures are monitored."

**Follow-up:** "The CFO says MFA is annoying. What do you say?" — Use phishing-resistant MFA (a
security key or passkey) where possible, and risk-based prompts so routine access from a managed
laptop does not ask every time, while new devices and countries always do. Never drop MFA for
privileged or finance accounts.`,
    mcqs: [
      mcq('An interviewer asks which log answers "did this laptop connect to 203.0.113.50 at 10:14?" when no Suricata rule matched that traffic. What is the best answer?', [
        ['Zeek conn.log or the firewall log, which record connections whether or not a rule fired', true],
        ['Suricata\'s eve.json, because it logs an alert for every connection the sensor sees', false],
        ['The DNS log, because every connection to an IP address needs a DNS lookup first', false],
      ], 'Connection logs record every flow regardless of signatures. eve.json alert events appear only when a rule matches (flow events need extra configuration), and a connection to a hard-coded IP needs no DNS lookup at all.'),
      mcq('In an interview you are told a threat-intel hit is on an IP belonging to a large cloud provider. What is the strongest point to make?', [
        ['The IP is shared, so the domain name, timing and process matter more than the address', true],
        ['Cloud provider addresses can never be malicious, so close it as a false positive', false],
        ['Block the provider\'s whole published address range at the perimeter firewall to be completely safe', false],
        ['Threat-intel lists never include cloud addresses, so the feed must be corrupted', false],
      ], 'Many customers share cloud IPs, so the address alone is weak evidence; names, behaviour and the endpoint process decide it. Attackers do use cloud hosting, blocking a provider\'s range breaks legitimate business, and feeds often include cloud addresses.'),
      mcq('Asked how to catch a slow port scan that probes one port every five minutes, which answer shows real understanding?', [
        ['Count distinct ports or hosts per source over hours or days against its normal', true],
        ['Lower the Suricata threshold to two SYNs in ten seconds from any single source', false],
        ['Watch for RST packets, because slow scans always produce more resets than fast ones', false],
      ], 'A slow scan stays under short time-window thresholds, so the window must be long and the baseline per source. A two-in-ten-seconds threshold would alert constantly on normal traffic and still miss a scan five minutes apart, and slow scans produce the same kind of resets, just spread out.'),
    ],
  },

  /* ── MINI_PROJECT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_NETWORK_SECURITY_MINI_PROJECT',
    notes: `## Scenario

You are an L1 analyst at an MSSP in Hyderabad. A client — a diagnostics clinic with a small office
network — calls on Monday afternoon: "the accounts PC has been slow since this morning and the
internet feels sluggish". The clinic has a Zeek sensor on its internet link and a mirror of the
office switch, and the MSSP keeps its logs. Your L2 asks for a findings note by end of day: what
happened on the network between 09:00 and 13:00 IST, what is noise and what is evidence, and which
indicators the SOC should watch.

**The network.** 10.50.0.2 is the router and DNS resolver; 10.50.0.5 the NAS (file server);
10.50.0.11 reception, 10.50.0.12 accounts, 10.50.0.13 and 10.50.0.14 doctors' laptops; 10.50.0.250
the IT vendor's vulnerability scanner. You are told two facts by the clinic: the vendor runs an
**authorised scan every Monday morning**, and the NAS **backs up to the clinic's cloud backup
provider at 12:30 daily**. Nothing else is known.

## The data — generate it

The evidence is synthetic, so everyone works on the same data. Run this in your Python environment
(scapy and pandas installed). It writes office_conn.log and office_dns.log (Zeek TSV) and
office_slice.pcap (packets for part of the traffic):

    import random
    from datetime import datetime, timezone, timedelta
    from scapy.all import IP, TCP, UDP, DNS, DNSQR, Raw, wrpcap

    random.seed(2026)
    IST = timezone(timedelta(hours=5, minutes=30))
    day = datetime(2026, 10, 19, 9, 0, tzinfo=IST).timestamp()
    conn, dns, n = [], [], 0

    def c(ts, src, sp, dst, dp, proto, svc, dur, ob, rb, state, hist, uid=None):
        global n; n += 1
        conn.append((round(ts, 3), uid or f'C{n:05d}', src, sp, dst, dp, proto, svc, dur, ob, rb, state, hist))

    def q(ts, src, name, rcode, answer):
        global n; n += 1
        dns.append((round(ts, 3), f'C{n:05d}', src, random.randint(49152, 65000), '10.50.0.2', 53, 'udp', name, 'A', rcode, answer))
        c(ts, src, dns[-1][3], '10.50.0.2', 53, 'udp', 'dns', 0.01, len(name) + 17, len(name) + 33, 'SF', 'Dd', dns[-1][1])

    staff = ['10.50.0.11', '10.50.0.12', '10.50.0.13', '10.50.0.14']
    sites = {'mail.example.com': '198.51.100.21', 'gst.example.gov.in': '198.51.100.31',
             'bank.example.co.in': '198.51.100.41', 'docs.example.org': '198.51.100.51'}
    for h in staff:
        for _ in range(60):
            t = day + random.uniform(0, 4 * 3600)
            name = random.choice(list(sites))
            q(t, h, name, 'NOERROR', sites[name])
            c(t + 0.05, h, random.randint(49152, 65000), sites[name], 443, 'tcp', 'ssl',
              round(random.uniform(0.5, 120), 2), random.randint(800, 9000), random.randint(5000, 400000), 'SF', 'ShADadFf')
    for i, port in enumerate(random.sample(range(1, 1025), 300)):
        for h in staff + ['10.50.0.5']:
            c(day + 1800 + i * 0.4, '10.50.0.250', 40000 + i, h, port, 'tcp', '-', None, None, None, 'REJ', 'Sr')
    q(day + 4350, '10.50.0.12', 'invoice-portal.example.com', 'NOERROR', '198.51.100.140')
    c(day + 4350.2, '10.50.0.12', 50110, '198.51.100.140', 80, 'tcp', 'http', 3.1, 412, 1_204_877, 'SF', 'ShADadFf')
    t = day + 4460
    while t < day + 4 * 3600:
        c(t, '10.50.0.12', random.randint(49152, 65000), '203.0.113.77', 443, 'tcp', 'ssl',
          round(random.uniform(0.3, 0.9), 2), random.randint(300, 420), random.randint(150, 260), 'SF', 'ShADadFf')
        t += 300 * random.uniform(0.9, 1.1)
    for i in range(40):
        label = ''.join(random.choice('abcdefghijklmnopqrstuvwxyz234567') for _ in range(52))
        q(day + 6000 + i * 37, '10.50.0.12', f'{label}.d.example.net', 'NXDOMAIN', '-')
    c(day + 9600, '10.50.0.12', 50777, '10.50.0.5', 445, 'tcp', 'smb', 412.6, 9_310, 61_448_120, 'SF', 'ShADadFf')
    c(day + 10320, '10.50.0.12', 50812, '203.0.113.77', 443, 'tcp', 'ssl', 388.0, 58_903_442, 41_220, 'SF', 'ShADadFf')
    c(day + 12600, '10.50.0.5', 51000, '198.51.100.80', 443, 'tcp', 'ssl', 1210.4, 902_114_550, 288_400, 'SF', 'ShADadFf')

    def write(path, name, fields, rows):
        with open(path, 'w', newline='\\n') as f:
            f.write('#separator \\\\x09\\n#set_separator\\t,\\n#empty_field\\t(empty)\\n#unset_field\\t-\\n')
            f.write(f'#path\\t{name}\\n#fields\\t' + '\\t'.join(fields) + '\\n')
            for r in sorted(rows):
                f.write('\\t'.join('-' if v is None else str(v) for v in r) + '\\n')
            f.write('#close\\t2026-10-19-13-00-00\\n')

    write('office_conn.log', 'conn', ['ts', 'uid', 'id.orig_h', 'id.orig_p', 'id.resp_h', 'id.resp_p', 'proto',
          'service', 'duration', 'orig_bytes', 'resp_bytes', 'conn_state', 'history'], conn)
    write('office_dns.log', 'dns', ['ts', 'uid', 'id.orig_h', 'id.orig_p', 'id.resp_h', 'id.resp_p', 'proto',
          'query', 'qtype_name', 'rcode_name', 'answers'], dns)

    pk = []   # packet slice: 10.50.0.12 with 203.0.113.77, and its d.example.net lookups
    for r in sorted(conn):
        ts, uid, src, sp, dst, dp = r[:6]
        if src == '10.50.0.12' and dst == '203.0.113.77':
            for i, (a, b, fl, data) in enumerate([(src, dst, 'S', 0), (dst, src, 'SA', 0), (src, dst, 'A', 0),
                    (src, dst, 'PA', min(r[9], 1400)), (dst, src, 'PA', min(r[10], 1400)),
                    (src, dst, 'FA', 0), (dst, src, 'FA', 0)]):
                s, d = (sp, dp) if a == src else (dp, sp)
                p = IP(src=a, dst=b) / TCP(sport=s, dport=d, flags=fl) / (Raw(b'\\x17' * data) if data else b'')
                p.time = ts + i * 0.02
                pk.append(p)
    for r in dns:
        if r[2] == '10.50.0.12' and r[7].endswith('d.example.net'):
            p = IP(src=r[2], dst='10.50.0.2') / UDP(sport=r[3], dport=53) / DNS(rd=1, qd=DNSQR(qname=r[7]))
            p.time = r[0]
            pk.append(p)
    wrpcap('office_slice.pcap', sorted(pk, key=lambda p: p.time))
    print(len(conn), 'conn rows,', len(dns), 'dns rows,', len(pk), 'packets')

It should print 2059 conn rows, 281 dns rows, 285 packets. If your numbers differ, check you copied
the seed and the order of the random calls exactly.

## Deliverables

1. **analysis.py** (or a notebook): loads both logs with the read_zeek function from the Zeek unit,
   converts ts to IST, and produces each table your note relies on — per-source summary, failed
   connection states, periodicity of outbound sessions (with a minimum session count), DNS length
   and entropy by source and parent domain, largest transfers in each direction.
2. **The pcap check:** open office_slice.pcap in Wireshark or with scapy and confirm two findings at
   packet level; give the display filters you used.
3. **Detections:** two Suricata rules and one Zeek-log query (pandas or SIEM pseudo-query) that would
   have caught the evidence earlier, each with msg, sid, rev and classtype, and a sentence on its
   likely false positives. Mark them "not run" unless you have a sensor.
4. **findings.md — one page:** a timeline in IST, a short "noise" section (what you ruled out and
   why), the evidence, your assessment with confidence, indicators to watch (addresses, domains,
   behaviours), and recommended next steps for L2 and the clinic.

## Milestones

- **M1 (30 min):** generate the data, load it, print row counts and the per-source summary.
- **M2 (45 min):** separate noise from evidence: account for the scanner, the backup, and normal
  browsing before you study anything else.
- **M3 (45 min):** build the timeline for the host that remains, with every entry tied to a log row.
- **M4 (30 min):** detections and the findings note.

## Rules of the exercise

Everything here is synthetic and stays on your machine. Do not look up, resolve or connect to any
address or domain in the data. Your note recommends actions; it does not take them — in a real SOC,
isolating a machine or blocking an address goes through the client's agreed procedure.`,
    assignment: {
      title: 'Investigating a Capture from a Suspected Incident',
      description: 'Analyse one morning of Zeek conn/dns logs and a packet slice from a clinic network, separate the authorised scan, the scheduled backup and normal browsing from the evidence, and write a findings note with a timeline, indicators and detections.',
      instructions: 'Generate the dataset with the script in the notes (2059 conn rows, 281 dns rows, 285 packets). Submit analysis.py (or a notebook) that produces every table you cite, the display filters used on office_slice.pcap, two Suricata rules and one log query with msg/sid/rev/classtype and false-positive notes (marked not run), and a one-page findings.md: IST timeline, noise ruled out with reasons, evidence, assessment with confidence, indicators to watch, next steps. Do not resolve or contact any address or domain from the data.',
      rubric: [
        { criterion: 'Noise separated from evidence', description: 'The authorised scan, the 12:30 backup and ordinary browsing are each identified with the log rows that show them and excluded with a stated reason, not ignored.', maxPoints: 20 },
        { criterion: 'Timeline and evidence', description: 'An IST timeline for the affected host in which every entry is tied to a specific log row or packet: first suspicious download, start of periodic sessions, DNS pattern, internal file access, large outbound transfer.', maxPoints: 25 },
        { criterion: 'Analysis code', description: 'analysis.py loads both logs correctly (#fields names, unset values, UTC to IST), computes periodicity with a minimum count, DNS length/entropy per parent domain and the transfer tables, and runs cleanly.', maxPoints: 20 },
        { criterion: 'Detections', description: 'Two valid-looking Suricata rules and one log query that target the observed behaviour, with msg, sid in the local range, rev and classtype, each with an honest false-positive note.', maxPoints: 15 },
        { criterion: 'Findings note', description: 'One page a client and an L2 can act on: assessment with confidence level, indicators, and next steps that respect the escalation process; no claims the data does not support.', maxPoints: 20 },
      ],
      totalPoints: 100,
    },
    mcqs: [
      mcq('In the clinic data, 10.50.0.250 has 1,500 REJ rows across five hosts on Monday morning. How should the findings note treat it?', [
        ['As noise: it matches the vendor\'s authorised Monday scan, stated with the rows that show it', true],
        ['As the main evidence, because 1,500 rejected connections is by far the largest anomaly present in the data', false],
        ['Leave it out of the note entirely, since authorised activity never needs mentioning', false],
      ], 'It fits a known, authorised activity, so it is ruled out — but explicitly, with the evidence, so the reader knows it was considered. Calling it the main finding ignores what the client told you, and silently omitting it leaves the L2 wondering whether you saw it.'),
      mcq('Which pair of conn.log rows from the accounts PC would most strengthen a suspicion of data theft?', [
        ['A large SMB read from the NAS followed minutes later by a large upload to the beaconed address', true],
        ['Many short HTTPS sessions to the bank site spread through the morning with small replies', false],
        ['DNS queries to the internal resolver for mail and documents sites that all returned NOERROR', false],
        ['The nightly NAS backup upload to the clinic\'s cloud provider at 12:30 in the afternoon', false],
      ], 'Data pulled from the file server and then sent out to the same address the PC has been beaconing to is the sequence collection then exfiltration over the C2 channel (T1041). Banking sessions and normal DNS are ordinary work, and the 12:30 upload comes from the NAS to the known backup provider.'),
    ],
  },

  /* ── CHECKPOINT ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_NETWORK_SECURITY_CHECKPOINT',
    notes: `Ten questions across the topic: reading captures, DNS/HTTP/TLS for defenders, firewall rules and
segmentation, Suricata and Zeek, and remote access. Answer from understanding; each question is a
situation a SOC analyst meets in the first year.`,
    checkpoint: [
      mcq('A capture shows a host sending SYN to an external server three times, about a second apart, with no reply of any kind. What is the best reading?', [
        ['Something dropped the packets — a firewall or an unreachable host — and no connection formed', true],
        ['The server refused the connection, which is how a closed port always responds', false],
        ['The connection succeeded, but the capture missed the server\'s replies because TLS encryption hid them from view', false],
        ['The host is scanning the server, since three SYNs is the threshold for a scan', false],
      ], 'Retransmitted SYNs with silence mean the attempt was dropped or the target is unreachable (Zeek S0). A closed port answers with RST, encryption does not hide TCP handshake packets, and three SYNs to one port is a retry, not a scan.'),
      ck('COMPUTER_NETWORKS', 'Which DNS pattern from a single office PC most deserves an analyst\'s attention?', [
        ['Dozens of long, random-looking labels under one parent domain, all answered NXDOMAIN', true],
        ['Repeated lookups for the company\'s mail server name throughout the working day', false],
        ['A few NXDOMAIN answers for misspelt shopping sites typed by the user at lunch', false],
        ['Lookups for a software vendor\'s update server shortly after the PC is switched on', false],
      ], 'Many encoded-looking labels under one domain is the shape of DNS used as a channel (T1071.004), and the failure answers do not mean nothing was sent. Repeat lookups for mail, a few typos and update checks are all normal.'),
      ck('COMPUTER_NETWORKS', 'A browser connects to a web server with TLS 1.3. Which item cannot be read from the capture without the keys?', [
        ['The server\'s certificate, because TLS 1.3 encrypts it', true],
        ['The server name, sent in the SNI of the ClientHello', false],
        ['The server\'s IP address and the TCP port, 443', false],
        ['The size and the timing of each encrypted TLS record sent', false],
      ], 'TLS 1.3 encrypts the certificate after the ServerHello, unlike TLS 1.2. The SNI is in the clear ClientHello unless Encrypted Client Hello is used, addresses and ports are in the IP and TCP headers, and record sizes and timing are always visible.'),
      mcq('A firewall review finds "allow-users-internet: USERS → 0.0.0.0/0 any" at rule 5 and "deny-users-servers: USERS → 10.30.20.0/24 any" at rule 9. What is the fix?', [
        ['Move the deny above the allow, or make the allow exclude internal ranges', true],
        ['Nothing, because the more specific deny rule is applied first automatically', false],
        ['Delete the deny, since rule 5 already covers what users are allowed to reach', false],
        ['Change the deny\'s action to reject so it takes priority over earlier allows', false],
      ], 'With first-match evaluation, the broad allow at rule 5 shadows the deny at rule 9, so users reach the servers. Firewalls do not reorder by specificity, deleting the deny leaves the hole open, and reject versus drop changes the response, not the order.'),
      mcq('Which network zone design best limits ransomware spreading from one infected staff laptop?', [
        ['Deny laptop-to-laptop traffic and allow staff only the server ports they need', true],
        ['Put every device on one large subnet so the IDS can watch all traffic at once', false],
        ['Allow all internal traffic but block every outbound connection to the internet', false],
      ], 'Segmentation with default deny between peers removes the SMB and RDP paths ransomware uses to spread (Remote Services, T1021). A flat network is what lets it spread, and blocking only the internet does nothing for internal movement.'),
      mcq('Zeek\'s conn.log for a laptop shows 400 rows to 400 internal addresses on port 445 within five minutes, mostly S0 and REJ. What should the analyst report?', [
        ['The laptop attempted SMB on 400 hosts and mostly failed — investigate that laptop', true],
        ['The laptop copied files from 400 file servers, since each row is a transfer', false],
        ['Nothing, because S0 and REJ rows are logged only when the sensor is overloaded', false],
        ['The 400 hosts attacked the laptop, since they each replied to its requests', false],
      ], 'One source probing SMB on hundreds of hosts is discovery or worm-like spread; S0 (no answer) and REJ (refused) show attempts, not transfers. These states are normal Zeek output, not overload artefacts, and the laptop was the originator, not the target.'),
      mcq('A new Suricata rule fires 3,000 times a day from three build servers running curl as part of their job. What is the best response?', [
        ['Suppress the rule for those servers only, record why, and keep it for every other host', true],
        ['Disable the rule everywhere, because a rule this noisy is useless to the SOC and only hides real alerts', false],
        ['Leave it alone, because the L1 team should review all 3,000 alerts every day', false],
      ], 'A narrow suppression keeps the signal (curl from an unexpected machine) while removing known, expected activity, and recording it keeps it reviewable. Disabling it blinds the SOC to the cases that matter, and 3,000 known-benign alerts a day trains analysts to ignore the rule.'),
      mcq('Your Suricata rule for an outbound beacon is written "alert tcp $HOME_NET any -> 203.0.113.50 any" but tests on a known capture produce no alert. Which check comes first?', [
        ['That HOME_NET in suricata.yaml includes the capture\'s internal address range', true],
        ['That the rule\'s classtype is high priority, since low-priority rules are skipped', false],
        ['That the capture is in pcapng format, as Suricata only alerts on that format', false],
      ], 'If HOME_NET does not cover the source addresses, the header never matches; checksum handling (-k none) is the other usual suspect. Classtype affects priority, not whether a rule is evaluated, and Suricata reads both pcap and pcapng.'),
      mcq('Why is a remote-access VPN alone weaker than zero-trust access when a user\'s password is stolen?', [
        ['The VPN grants a network route at login, so the thief reaches whatever that network allows', true],
        ['VPN tunnels are not encrypted end to end, so the thief can read every other user\'s traffic on the wire', false],
        ['VPNs cannot be used with MFA, so a password alone is always enough to connect', false],
        ['Zero-trust access hides passwords from users, so they can never be stolen at all', false],
      ], 'A VPN typically trusts the session from login and grants network-level reach; zero trust checks identity, MFA and device on each access to each application. VPN tunnels are encrypted, VPNs commonly support MFA, and zero trust does not make passwords impossible to steal — it limits what one buys.'),
      mcq('A finding note says "203.0.113.77 is malicious, block it". What would make it a note an L2 can act on?', [
        ['The supporting rows and times, why other explanations were ruled out, and a confidence level', true],
        ['A longer list of every IP address the host contacted that morning, without a summary', false],
        ['The analyst\'s opinion repeated in capital letters so the urgency is clear', false],
      ], 'An actionable finding ties each claim to evidence, shows what was ruled out (the scan, the backup), and states confidence so L2 can decide quickly. A raw dump moves the work to the reader, and emphasis is not evidence.'),
    ],
  },
];
