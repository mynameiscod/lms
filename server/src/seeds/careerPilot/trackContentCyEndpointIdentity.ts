/**
 * Career-track content: Endpoint and Identity Security (CY_ENDPOINT_IDENTITY), Cybersecurity Analyst,
 * batch CY1.
 *
 * Defensive only. The topic teaches how a SOC analyst reads Windows and Linux logs, understands Active
 * Directory authentication, hardens servers, runs identity controls (joiners, movers, leavers, MFA,
 * privileged access) and works an EDR alert — on systems the student owns or is authorised to work on.
 * Attack techniques are named in a sentence (with the MITRE ATT&CK name) only where a detection or a
 * control needs them; nothing here shows how to carry one out.
 *
 * It builds on the years' T_LINUX, T2_LINUX and T3_LINUX (users, permissions, processes, logs, SSH),
 * T2_SECURITY (authentication versus authorisation, password storage) and T3_AUTH (sessions, tokens,
 * revocation) and refers back to them in a sentence rather than re-teaching them.
 *
 * Every pandas / Python snippet was run on synthetic Windows event JSON, a synthetic auth.log and a
 * journald export, and the printed output is the real output. PowerShell AD cmdlets, auditpol, wevtutil,
 * auditd rules and Sysmon commands are written from their documentation and were not run against a
 * domain or a server. Skills: IAM_FUNDAMENTALS by default; WINDOWS_FOR_DEFENDERS and
 * ENDPOINT_PROTECTION are OPERATING_SYSTEMS, LINUX_HARDENING_LOGS is LINUX_ADMIN.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_CY_ENDPOINT_IDENTITY_BUNDLES: PilotBundle[] = [
  /* ── WINDOWS_FOR_DEFENDERS ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_ENDPOINT_IDENTITY_WINDOWS_FOR_DEFENDERS',
    notes: `Most laptops in an Indian bank, an IT services company or a GCC run Windows, and most SOC
alerts at an MSSP in Hyderabad end with an analyst reading Windows events. In Year 1 you learnt where a
Linux machine writes down what happened; Windows does the same in the **event log**, a structured
database of records, each with a source (provider), an **Event ID**, a time and named fields.

## The logs an analyst opens

- **Security** — logons, account and group changes, process creation, policy changes. Only the system
  writes here, and only what the **audit policy** tells it to record.
- **System** — services, drivers, shutdowns. Event 7045 (a new service was installed) lives here.
- **Application** — whatever programs choose to write.
- **Applications and Services Logs** — per-component logs. The three you will use most are
  Microsoft-Windows-PowerShell/Operational (event 4104, script block logging, records the PowerShell
  code that actually ran), Microsoft-Windows-Windows Defender/Operational (1116 malware detected, 1117
  action taken) and Microsoft-Windows-Sysmon/Operational once Sysmon is installed.

## Security event IDs worth knowing by heart

    4624  an account logged on successfully       4625  an account failed to log on
    4634  logoff                                    4672  special privileges assigned to a new logon (an admin)
    4648  logon with explicitly supplied credentials (runas, "connect as")
    4688  a new process was created                 4720  a user account was created
    4722  account enabled   4725 disabled   4726 deleted   4724 password reset by someone else
    4728  member added to a security-enabled GLOBAL group (e.g. Domain Admins)
    4732  member added to a security-enabled LOCAL group (e.g. the machine's Administrators)
    4740  account locked out                        1102  the Security audit log was cleared

On a domain controller you also get 4768 (Kerberos ticket-granting ticket requested), 4769 (service
ticket requested), 4771 (Kerberos pre-authentication failed) and 4776 (NTLM credential validation);
the Active Directory lesson reads those.

**4624 and 4625 carry a Logon Type**: 2 interactive (at the keyboard), 3 network (a file share, most
remote access to a service), 4 batch (scheduled task), 5 service, 7 unlock, 10 remote interactive
(RDP), 11 cached interactive (a laptop logging on with no domain controller in reach). A burst of
type 3 failures from one IP is very different from a user mistyping at their desk (type 2).

**4625 also carries Status and SubStatus codes.** 0xC000006A is a wrong password for a real account;
0xC0000064 is a user name that does not exist; 0xC0000234 is a locked account; 0xC0000072 a disabled
one. Many failures with 0xC0000064 across many names is somebody guessing names. Many 0xC000006A
against one name is somebody guessing a password.

## Audit policy decides what exists

An event you never configured is an event you will never see. Process creation (4688) is not audited
by default, and even when it is, the command line is empty until the Group Policy setting **"Include
command line in process creation events"** is enabled. A defender checks the policy before trusting
the absence of a record:

    auditpol /get /category:*                      # what is being audited (run as administrator)

Log size matters too: a 20 MB Security log on a busy server can roll over in hours. CERT-In's 2022
directions ask organisations to keep logs of their ICT systems for 180 days, which in practice means
forwarding them to a central store (a SIEM such as Wazuh or Elastic) rather than relying on the
machine.

## Reading events from the command line

    Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4625; StartTime=(Get-Date).AddHours(-1)}
    wevtutil qe Security /q:"*[System[(EventID=4625)]]" /c:5 /rd:true /f:text

FilterHashtable filters inside the event log service, so it is fast; piping everything into
Where-Object reads the whole log first. Both commands need an elevated prompt for the Security log.

## What Sysmon adds

Sysmon (System Monitor, a free Sysinternals tool) is a driver and service that writes much richer
events than the built-in audit policy, driven by an XML configuration:

    sysmon64.exe -accepteula -i sysmonconfig.xml   # install with a config
    sysmon64.exe -c sysmonconfig.xml               # update the config later

    Event 1   process creation, with full command line, hashes and the parent's command line
    Event 3   network connection (process, source and destination IP and port)
    Event 10  one process opened another (used to watch access to lsass.exe)
    Event 11  file created
    Event 13  registry value set (Run keys and other persistence places)
    Event 22  DNS query, with the process that made it

Nobody writes a Sysmon config from scratch: start from a maintained community config
(SwiftOnSecurity's sysmon-config or Olaf Hartong's sysmon-modular) and tune out the noise your own
estate makes. Without filtering, events 3 and 11 alone will flood your SIEM.

## A story told in events

Read them in order and a sequence becomes a narrative: fourteen 4625s for one user from one IP in a
minute, then a 4624 type 3 from the same IP (the guess worked), a 4688 running **net group "Domain
Admins" /domain** (looking around), a 4720 creating helpdesk_tmp, a 4732 adding it to the local
Administrators group (persistence), and a 1102 (covering tracks). Each event alone has an innocent
explanation; the chain does not. That is the core skill of this lesson: put events in time order per
user and per host, and ask what story they tell. The worked example does exactly that with pandas.`,
    workedExample: `**Task.** A Security-log export from one server (JSON, one object per event) has
arrived from the SIEM. Find a failed-logon burst followed by a success, then list what that account did
next. The data is synthetic; the code and output are real.

    import pandas as pd

    df = pd.read_json("security_events.json", convert_dates=["TimeCreated"])
    df["LogonType"] = df["LogonType"].astype("Int64")   # NaN on non-logon rows made it float
    print(df["EventID"].value_counts().sort_index().to_string())

    logons = df[df["EventID"].isin([4624, 4625])].sort_values("TimeCreated")
    fails = logons[logons["EventID"] == 4625]
    win = (fails.set_index("TimeCreated")
                .groupby(["TargetUserName", "IpAddress"])["EventID"]
                .rolling("5min").count()
                .rename("fails_5min").reset_index())
    burst = (win[win["fails_5min"] >= 10]
             .groupby(["TargetUserName", "IpAddress"])["TimeCreated"].max().reset_index())

    succ = logons[logons["EventID"] == 4624][["TimeCreated", "TargetUserName", "IpAddress", "LogonType"]]
    hits = burst.merge(succ, on=["TargetUserName", "IpAddress"], suffixes=("_lastfail", "_success"))
    hits = hits[(hits["TimeCreated_success"] > hits["TimeCreated_lastfail"]) &
                (hits["TimeCreated_success"] - hits["TimeCreated_lastfail"] <= pd.Timedelta("10min"))]
    print(hits.to_string(index=False))

Output:

    EventID
    1102     1
    4624     3
    4625    17
    4688     1
    4720     1
    4732     1
    TargetUserName  IpAddress TimeCreated_lastfail TimeCreated_success  LogonType
           priya.k 10.20.5.77  2026-03-14 02:31:49 2026-03-14 02:31:58          3

Three failures for rahul.m at his own keyboard (type 2, 127.0.0.1) followed by a success did NOT
trigger: the threshold of 10 in 5 minutes separates a forgotten password from guessing. Now the
follow-on activity:

    after = df[(df["TimeCreated"] > hits["TimeCreated_success"].iloc[0]) &
               df["EventID"].isin([4688, 4720, 4728, 4732, 1102])]

            TimeCreated  EventID SubjectUserName TargetUserName   MemberName
    2026-03-14 02:33:40     4688         priya.k            NaN          NaN
    2026-03-14 02:36:12     4720         priya.k   helpdesk_tmp          NaN
    2026-03-14 02:36:30     4732         priya.k Administrators helpdesk_tmp
    2026-03-14 02:41:02     1102         priya.k            NaN          NaN

In 4732 TargetUserName is the **group** and MemberName the account added — a common misreading. The
note to the L2: "priya.k: 14 failed network logons from 10.20.5.77 then success at 02:31:58; within ten
minutes a new account helpdesk_tmp was created and made a local admin, and the Security log was
cleared. Recommend disabling priya.k and helpdesk_tmp and isolating 10.20.5.77 pending review."`,
    mcqs: [
      mcq('An analyst at an MSSP searches a client server for 4688 events to see what ran during an incident and finds none at all. What is the most likely explanation?', [
        ['Process-creation auditing was never enabled in the audit policy, so Windows did not record it', true],
        ['4688 only appears in the System log, so the analyst searched the wrong log for process starts', false],
        ['Windows writes 4688 only for processes started by administrators, and none ran during that window', false],
        ['The server is a domain controller, and DCs send their process events to the forest root instead', false],
      ], 'Windows records only what the audit policy asks for, and "Audit Process Creation" is off by default. 4688 belongs to the Security log, not System; it is written for any user\'s process once enabled; and domain controllers log their own processes locally like any other machine.'),
      mcq('A 4625 burst shows SubStatus 0xC0000064 for forty different user names from one workstation in two minutes. What does that pattern most suggest?', [
        ['Someone trying many account names, most of which do not exist in the domain', true],
        ['One real user repeatedly typing the wrong password for their own account', false],
        ['A service account whose stored password expired and is retrying on schedule', false],
        ['Forty locked-out accounts that the helpdesk must unlock one at a time', false],
      ], '0xC0000064 means the user name does not exist, and forty names in two minutes from one source is name guessing. A user mistyping would give 0xC000006A for one name; an expired service password gives one name repeatedly; locked accounts show 0xC0000234.'),
      mcq('Your SIEM is drowning in Sysmon events 3 and 11 from every laptop after a fresh Sysmon rollout. What is the right first step?', [
        ['Start from a maintained community config and add exclusions for known-good noisy processes', true],
        ['Uninstall Sysmon and rely only on the built-in Security log, which records the same things', false],
        ['Raise the SIEM licence limit so that every network and file event can be kept for 180 days', false],
      ], 'Sysmon is meant to be tuned through its XML config; community configs already exclude much of the noise and you exclude your own known-good software on top. The built-in Security log does not record network connections or file creation the way Sysmon does, and buying more ingestion keeps the noise instead of removing it.'),
    ],
    checkpoint: [
      mcq('A 4624 event for a file-server login shows Logon Type 10. What kind of logon was it?', [
        ['A Remote Desktop (RDP) session onto that machine', true],
        ['Access to a shared folder over the network (SMB)', false],
        ['A scheduled task running under a stored account', false],
        ['A user unlocking a workstation at the keyboard', false],
      ], 'Type 10 is RemoteInteractive, which is RDP. A share access is type 3 (network), a scheduled task is type 4 (batch) and an unlock is type 7. On a file server, an unexpected type 10 deserves a question because users rarely need to RDP onto one.'),
      mcq('An alert shows event 4732 with TargetUserName "Administrators" and MemberName "helpdesk_tmp". How should the analyst read it?', [
        ['The account helpdesk_tmp was added to the machine\'s local Administrators group', true],
        ['The Administrators account was renamed to helpdesk_tmp by the subject account', false],
        ['helpdesk_tmp was removed from Administrators by an account cleanup script', false],
        ['A domain-wide global group called Administrators gained helpdesk_tmp as its owner', false],
      ], '4732 is "a member was added to a security-enabled local group": TargetUserName names the group and MemberName the account added. A rename, a removal and a global-group change are different events (4781, 4733 and 4728). Adding a fresh account to Administrators is a classic persistence step, so it is worth an alert.'),
      mcq('During triage you see event 1102 on a server at 02:41, ten minutes after a suspicious logon. Why does it raise the severity?', [
        ['It records that the Security log was cleared, which destroys evidence on that machine', true],
        ['It records a failed Kerberos ticket request that the domain controller later retried', false],
        ['It records a routine log rollover that happens whenever the log file reaches its size cap', false],
      ], '1102 is written when someone clears the Security audit log, and clearing logs after a suspicious logon is a classic attempt to hide activity (MITRE: Indicator Removal: Clear Windows Event Logs). Rollover overwrites old events silently without 1102, and Kerberos failures are 4771 on a DC. It is also why logs must be forwarded to a SIEM as they are written.'),
    ],
  },

  /* ── ACTIVE_DIRECTORY ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_ENDPOINT_IDENTITY_ACTIVE_DIRECTORY',
    notes: `Almost every Indian bank, insurer and large IT employer runs **Active Directory (AD)**: one
directory that knows every user, computer and group, and decides who may log on where. If AD falls, the
whole estate falls, so a SOC watches it more closely than anything else. You already know from Year 2
that authentication (who you are) is separate from authorisation (what you may do); AD does both.

## The pieces

- **Domain** (e.g. corp.example.in) — a security boundary with its own users, computers and policies.
  Several domains that trust each other form a **forest**.
- **Domain controllers (DCs)** — the servers that hold the directory database and answer every logon.
  Whoever controls a DC controls the domain, so DCs are the crown jewels.
- **Users, computers and groups**, organised into **Organisational Units (OUs)** — folders that
  Group Policy can target.
- **Group Policy Objects (GPOs)** — settings pushed to machines and users: password rules, audit
  policy, firewall, who may log on locally. A defender changes security settings at scale through GPOs.
- **Privileged groups**: Domain Admins, Enterprise Admins, Schema Admins, the built-in Administrators,
  and the "operators" groups (Account, Server, Backup, Print Operators), which are more powerful than
  their names suggest.

## How a domain logon looks: Kerberos

Kerberos is the default. Simplified, for Priya logging on to her laptop and then opening a file share:

1. Her laptop proves to the DC that she knows her password (pre-authentication) and asks for a
   **ticket-granting ticket (TGT)**. The DC logs **4768**. A wrong password gives **4771** with failure
   code 0x18 instead.
2. To open \\\\fs01\\finance her laptop presents the TGT and asks for a **service ticket** for the file
   server. The DC logs **4769**, naming the service.
3. The laptop hands the service ticket to fs01, which logs **4624, Logon Type 3**, Authentication
   Package Kerberos — on fs01, not on the DC.

TGTs are signed with the key of a special account, **krbtgt**; that is why its password is reset
twice after a serious domain compromise. Kerberos needs clocks within about five minutes of each
other, which is why time sync failures break logons.

## NTLM, the older fallback

NTLM is challenge-response: the server sends a challenge, the client answers with a value derived
from the password hash, and for a domain account the DC checks it and logs **4776**. It appears when
something is reached by IP address instead of name, with old applications and with local accounts. It
is weaker than Kerberos (it is the protocol that Pass the Hash, MITRE T1550.002, abuses), so many
organisations audit NTLM use and reduce it over time.

## Reading logons in practice

- Many 4771 (code 0x18) or 4625 events across **many accounts** from one source, a few per account:
  **password spraying** (MITRE T1110.003) — one common password tried against everyone, kept under
  the lockout threshold.
- Many 4740 lockouts at once: often an application with an old stored password, sometimes spraying
  that went over the threshold. Check the caller computer name in the event before panicking.
- A burst of 4769 requests for many service accounts from one user, with encryption type 0x17 (RC4):
  the pattern defenders look for to catch **Kerberoasting** (MITRE T1558.003). The control is long,
  random service-account passwords (or group managed service accounts) and disabling RC4.
- 4728 / 4732 / 4756 on a privileged group outside a change ticket: always an alert.

## The misconfigurations defenders fix first

A health review of a real domain almost always finds the same list:

1. **Too many privileged accounts.** Fifty Domain Admins, half of them nested through other groups,
   some for people who left. Target: a handful of named admin accounts, separate from everyday
   accounts, used only on admin workstations.

        Get-ADGroupMember "Domain Admins" -Recursive | Select-Object Name, SamAccountName

2. **Stale accounts.** Enabled users and computers that have not logged on for 90 days. They are
   unmonitored doors.

        Search-ADAccount -AccountInactive -TimeSpan 90.00:00:00 -UsersOnly |
            Where-Object Enabled | Select-Object SamAccountName, LastLogonDate

   LastLogonDate comes from lastLogonTimestamp, which replicates lazily (it can lag by up to about
   two weeks), so a 90-day threshold tolerates it and a 7-day one does not.

3. **Weak password policy and passwords that never expire** on service accounts. Check with
   Get-ADDefaultDomainPasswordPolicy; use fine-grained password policies for admins and service
   accounts; prefer group managed service accounts, whose passwords AD rotates itself.

4. **The same local Administrator password on every machine** (it came from one image). Deploy
   **Windows LAPS**, which gives each machine its own random local admin password stored in AD.

5. **Unconstrained delegation** on computers or accounts other than DCs — a legacy setting that lets
   a server act as any user who connects to it. Find it, replace it with constrained delegation, and
   mark admin accounts "Account is sensitive and cannot be delegated" (or put them in Protected Users).

        Get-ADComputer -Filter {TrustedForDelegation -eq $true} | Select-Object Name

6. **Kerberos pre-authentication disabled** on some accounts, a box someone ticked years ago. Untick it.

These commands use the ActiveDirectory PowerShell module from RSAT and only read the directory. Run
them on a domain you are authorised to review — at work with a ticket, or in your own lab.`,
    workedExample: `**Task.** On Monday at 09:10 the SOC sees this sequence (trimmed fields, times in IST) for
one user, kiran.s, across a domain controller DC01 and a file server FS02. Explain it in plain words and
decide whether it is an incident.

    DC01  09:02:11  4771  kiran.s  Client 10.40.2.31  Failure Code 0x18
    DC01  09:02:19  4771  kiran.s  Client 10.40.2.31  Failure Code 0x18
    DC01  09:02:30  4768  kiran.s  Client 10.40.2.31  Result 0x0
    DC01  09:03:02  4769  kiran.s  Service FS02$       Client 10.40.2.31
    FS02  09:03:02  4624  kiran.s  Type 3  Package Kerberos  Source 10.40.2.31
    DC01  09:05:44  4769  kiran.s  Service FS02$       Client 10.40.2.31

**Step 1 — the failures.** Two 4771s with code 0x18 mean two wrong passwords during Kerberos
pre-authentication, from 10.40.2.31. Look up that IP in DHCP or the asset list: it is kiran.s's own
laptop, WS-KIRAN.

**Step 2 — the success.** 4768 with result 0x0 means the DC issued a TGT: the third attempt was right.

**Step 3 — the use.** 4769 for service FS02$ is a service ticket for the file server, and FS02 logs the
matching 4624 type 3 via Kerberos from the same IP. The second 4769 a few minutes later is normal ticket
renewal or a second share.

**Step 4 — compare with what an attack would look like.** Guessing would show many failures, often for
many accounts, from a host that is not the user's own; here it is two typos on Monday morning from the
user's laptop. A logon that worked after failures from an IP outside the office range, or a burst of
4769s for many different service accounts, would be different stories.

**Step 5 — verdict and note.** Benign: "kiran.s mistyped twice at 09:02 on own laptop WS-KIRAN, then
logged on and opened FS02 shares. No action." Write the note even for benign cases — the next analyst
who sees kiran.s in an alert will read it, and tuning a rule needs a record of its false positives.

The habit to take away: identify every IP and host, put DC and member-server events on one timeline,
and know which machine writes which event (4768/4769/4771/4776 on the DC, 4624/4625 on the machine
being logged on to).`,
    mcqs: [
      mcq('An analyst wants to see the logon record for a user who opened a share on FS01 via Kerberos. Where is the 4624 for that access written?', [
        ['On FS01, the server being accessed, with Logon Type 3', true],
        ['On the domain controller, beside the 4768 for the ticket', false],
        ['On the user\'s laptop, as the client that asked for access', false],
      ], 'A 4624 is written by the machine being logged on to — here FS01, as a network (type 3) logon. The DC writes the Kerberos events 4768 and 4769, and the client writes its own interactive logon, not the remote one. Knowing who writes what tells you which logs to collect.'),
      mcq('A review of corp.example.in finds 47 members of Domain Admins once nested groups are expanded. What should the defender recommend first?', [
        ['Reduce it to a few named admin accounts, separate from everyday user accounts', true],
        ['Rename the Domain Admins group so an outsider cannot find the privileged accounts', false],
        ['Leave membership alone and add an alert for every Domain Admin logon in the SIEM', false],
        ['Remove all nested groups but keep every person who is currently in the group', false],
      ], 'Each extra Domain Admin is another account whose compromise loses the domain, so the fix is fewer, separate admin accounts. Renaming does not change the group\'s well-known SID, alerting on 47 accounts\' everyday logons only produces noise, and flattening nesting keeps the same people with the same power.'),
      mcq('Which AD finding is the textbook use-case for deploying Windows LAPS?', [
        ['Every laptop shares the same local Administrator password from the build image', true],
        ['Domain user passwords are only eight characters long under the default domain policy', false],
        ['Service accounts in the domain have passwords that are set never to expire', false],
      ], 'Windows LAPS gives each machine its own random local admin password, stored in AD and rotated, so one leaked password no longer opens every machine. Domain password length is fixed through the password policy, and service-account passwords through fine-grained policies or group managed service accounts.'),
    ],
    checkpoint: [
      mcq('On a domain controller, 4771 events with failure code 0x18 appear for 300 different accounts from one IP, two or three per account, over ten minutes. What is the best reading?', [
        ['Password spraying: one or two common passwords tried against many accounts under the lockout limit', true],
        ['Kerberoasting: service tickets for many service accounts being requested from one workstation', false],
        ['A mass lockout from an application that kept retrying with an old stored service password', false],
        ['Clock skew between the DC and the client, which makes every Kerberos request fail with 0x18', false],
      ], '0x18 is a bad password at pre-authentication, and a few attempts per account across hundreds of accounts from one source is spraying. Kerberoasting shows as 4769 service-ticket requests, an application retry hits one account, and clock skew gives a different error (0x25) for all requests.'),
      mcq('A health check lists five application servers with "trusted for delegation to any service". What is the defender\'s fix?', [
        ['Replace it with constrained delegation and mark admin accounts as sensitive and not delegable', true],
        ['Move the five servers into the Domain Controllers OU so the setting becomes standard there', false],
        ['Leave it as configured but reset the five computer account passwords every thirty days', false],
      ], 'Unconstrained delegation lets a server act as anyone who connects to it, so it is replaced by constrained delegation to named services, and privileged accounts are protected from delegation. Moving servers into the DC OU spreads DC-level trust, and rotating computer passwords does not remove the delegation.'),
      mcq('Search-ADAccount reports 120 enabled user accounts with no logon in over 90 days. What is the safest next step?', [
        ['Confirm with HR and owners, disable them, and delete after a waiting period', true],
        ['Delete all 120 at once, since an account unused for 90 days cannot be needed', false],
        ['Reset their passwords to a random value and leave the accounts enabled as they are', false],
        ['Exclude them from monitoring, because accounts nobody uses produce no useful alerts', false],
      ], 'Disabling first is reversible: if a seasonal or long-leave user complains, re-enable; if nobody does, delete later. Deleting at once loses SIDs and access you may need back, a reset leaves an enabled unmonitored door, and an unused account suddenly logging on is exactly what monitoring should catch.'),
    ],
  },

  /* ── LINUX_HARDENING_LOGS ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_ENDPOINT_IDENTITY_LINUX_HARDENING_LOGS',
    notes: `Most servers behind an Indian payments app or a GCC's internal tools are Linux. In Year 3 you
logged on over SSH, read permissions and found a service's log. Here you look at the same machine as a
defender: shrink the ways in, make every privileged action carry a name, and know which log line means
trouble.

## SSH: the front door

sshd reads /etc/ssh/sshd_config. The settings a hardening review checks:

    PermitRootLogin no              # log in as a named user, then sudo
    PasswordAuthentication no       # keys only: nothing to guess
    PubkeyAuthentication yes
    PermitEmptyPasswords no
    MaxAuthTries 3                  # default is 6
    X11Forwarding no
    AllowUsers deploy anita         # or AllowGroups ssh-users

Two behaviours catch people out. **For most keywords sshd uses the first value it reads**, and modern
Ubuntu's sshd_config begins with **Include /etc/ssh/sshd_config.d/*.conf** — so a drop-in such as a
cloud image's 50-cloud-init.conf saying PasswordAuthentication yes wins over your "no" further down.
Do not trust the file; ask sshd what it will actually do:

    sudo sshd -T | grep -Ei 'permitrootlogin|passwordauthentication|maxauthtries'
    sudo sshd -t && sudo systemctl reload ssh   # test syntax first; the unit is sshd on RHEL

Keep a second session open while you change SSH settings, so a mistake does not lock you out.

A small checker, run on our synthetic config, applies the first-value rule:

    def effective(text):
        seen = {}
        for raw in text.splitlines():
            line = raw.split("#", 1)[0].strip()
            if not line:
                continue
            key, _, value = line.partition(" ")
            key = key.lower()
            if key == "match":
                break          # Match blocks apply conditionally; review them separately
            seen.setdefault(key, value.strip())
        return seen

Against a config with PermitRootLogin yes, PasswordAuthentication yes, MaxAuthTries 6 and X11Forwarding
yes it printed:

    FAIL permitrootlogin: is yes, want no - log in as a named user and use sudo, so every action has a name
    FAIL passwordauthentication: is yes, want no - keys cannot be guessed; passwords can be sprayed
    FAIL x11forwarding: is yes, want no - a server does not need a GUI tunnel
    FAIL maxauthtries: is 6, want 3 - fewer guesses per connection

A checker on the file is a quick audit across a hundred servers; sshd -T on each is the ground truth.

## Users and sudo

- Give people their own accounts; shared logins like "admin" make every log line anonymous.
- Grant sudo through a group (%sysadmins ALL=(ALL:ALL) ALL) edited with **visudo**, which refuses to
  save a broken file. Prefer specific commands over ALL for service roles.
- **NOPASSWD** on ALL turns any stolen session into root without a prompt. Use it, if at all, for one
  narrow command.
- Remove leavers' accounts and their keys in ~/.ssh/authorized_keys — a key outlives a password reset.

Every sudo use is logged with who, where and what, which is why a named sudo is better than a root login:

    Mar 14 02:12:41 web01 sudo:   deploy : TTY=pts/0 ; PWD=/home/deploy ; USER=root ; COMMAND=/usr/bin/cat /etc/shadow

## Where the evidence lives

- **/var/log/auth.log** on Debian and Ubuntu, **/var/log/secure** on RHEL family: sshd, sudo, su, PAM.
- **journald**: journalctl -u ssh --since "1 hour ago"; -o json gives one JSON object per line,
  with __REALTIME_TIMESTAMP in microseconds since the epoch, UTC.
- **last** (successful logins, from wtmp), **lastb** (failed, from btmp), **lastlog** (last login per user).
- **auditd**: kernel-level auditing of files and system calls. Watch rules on identity files:

        -w /etc/passwd -p wa -k identity
        -w /etc/shadow -p wa -k identity
        -w /etc/sudoers -p wa -k priv_change
        -w /etc/sudoers.d/ -p wa -k priv_change

  Put them in /etc/audit/rules.d/hardening.rules, load with augenrules --load, search with
  ausearch -k identity -i, summarise logins with aureport --auth.

## Log lines that mean trouble

    Failed password for invalid user oracle from 203.0.113.45 port 50002 ssh2   # name guessing
    Failed password for root from 203.0.113.45 port 50001 ssh2                  # password guessing
    Accepted password for deploy from 203.0.113.45 port 50020 ssh2              # ...and it worked
    deploy : ... USER=root ; COMMAND=/usr/bin/cat /etc/shadow                   # reading password hashes
    useradd[...]: new user: name=support2                                       # a new account

Accepted **publickey** from an office IP is normal. Accepted **password** on a server that should be
key-only means the hardening is not what you think. The worked example parses an auth.log with pandas
and finds the burst-then-success pattern.

## Beyond the checklist

fail2ban (bans an IP after repeated failures by adding a firewall rule), a firewall allowing SSH only
from the VPN or bastion range, unattended security updates, and forwarding auth logs to the SIEM so a
cleared local log (an attacker can truncate auth.log as root) is not the only copy. The CIS Benchmarks
for your distribution are the standard checklist auditors in Indian banks will ask about.`,
    workedExample: `**Task.** A synthetic /var/log/auth.log from web01 (15 sshd lines plus a PAM and a sudo
line). Find any source IP with a run of failures followed by a success within 15 minutes.

    import re
    import pandas as pd

    PAT = re.compile(r"^(?P<ts>\\w{3} +\\d+ [\\d:]{8}) (?P<host>\\S+) sshd\\[\\d+\\]: "
                     r"(?P<result>Failed|Accepted) (?P<method>\\S+) for (?:invalid user )?(?P<user>\\S+) "
                     r"from (?P<ip>[\\d.]+) port \\d+")
    rows = [m.groupdict() for m in map(PAT.match, open("auth.log")) if m]
    df = pd.DataFrame(rows)
    df["ts"] = pd.to_datetime("2026 " + df["ts"], format="%Y %b %d %H:%M:%S")  # syslog has no year
    print(len(df), "sshd auth lines parsed")
    print(df.groupby(["ip", "result"]).size().unstack(fill_value=0).to_string())

    fails, ok = df[df["result"] == "Failed"], df[df["result"] == "Accepted"]
    susp = []
    for _, s in ok.iterrows():
        prior = fails[(fails["ip"] == s["ip"]) & (fails["ts"] < s["ts"]) &
                      (fails["ts"] >= s["ts"] - pd.Timedelta("15min"))]
        if len(prior) >= 5:
            susp.append({"ip": s["ip"], "user": s["user"], "success_at": s["ts"],
                         "fails_before": len(prior), "users_tried": prior["user"].nunique()})
    print(pd.DataFrame(susp).to_string(index=False))

Output:

    15 sshd auth lines parsed
    result        Accepted  Failed
    ip
    10.0.4.12            1       1
    203.0.113.45         1      12
              ip   user          success_at  fails_before  users_tried
    203.0.113.45 deploy 2026-03-14 02:12:10            12            6

The optional **(?:invalid user )?** matters: without it the regex silently skips the failures for
names that do not exist — the most telling lines. 10.0.4.12 (anita, publickey, one later typo) is
normal. 203.0.113.45 tried six user names and got in as deploy **with a password**, then ran sudo cat
/etc/shadow: an incident. The same success in the journald export reads:

    j = pd.read_json("ssh_journal.json", lines=True, dtype={"__REALTIME_TIMESTAMP": str})
    j["ts"] = (pd.to_datetime(j["__REALTIME_TIMESTAMP"].astype("int64"), unit="us", utc=True)
                 .dt.tz_convert("Asia/Kolkata"))
    #                        ts                                                  MESSAGE
    # 2026-03-14 07:42:10+05:30 Accepted password for deploy from 203.0.113.45 port 50020 ssh2

Same event, 07:42 IST versus 02:12 in auth.log (the server writes UTC). Always state the time zone in
your note. Response: disable password authentication, lock deploy and rotate its credentials, block the
IP, and check what else deploy did after 02:12.`,
    mcqs: [
      mcq('An engineer set PasswordAuthentication no at the bottom of sshd_config and reloaded, yet password logins still work on an Ubuntu cloud server. What is the most likely cause?', [
        ['A file in sshd_config.d, included near the top, sets it to yes first, and the first value wins', true],
        ['sshd caches its settings until the next reboot, so reloading the service changed nothing', false],
        ['PasswordAuthentication only applies to root, while other users follow PAM rules instead', false],
        ['The setting must be written in lower case, and sshd ignores keywords typed in mixed case', false],
      ], 'Ubuntu\'s sshd_config includes sshd_config.d/*.conf at the top, and sshd keeps the first value it reads, so a drop-in such as 50-cloud-init.conf wins; sshd -T shows the effective value. A reload does re-read the config, the option applies to all users, and keywords are case-insensitive.'),
      mcq('Why does a security baseline prefer "PermitRootLogin no" plus sudo over letting admins SSH in as root?', [
        ['Each privileged action is then logged against a named person rather than a shared root account', true],
        ['sudo runs commands faster than a root shell because it skips the kernel permission checks', false],
        ['Root logins over SSH are always unencrypted, while normal user logins use the full cipher', false],
      ], 'With named accounts and sudo, auth.log records who ran what as root, and access can be removed per person. sudo does not skip permission checks or speed anything up, and SSH encrypts a root session exactly like any other.'),
      mcq('Which auditd rule records writes and attribute changes to /etc/sudoers so they can be searched by a key?', [
        ['-w /etc/sudoers -p wa -k priv_change', true],
        ['-w /etc/sudoers -p r -k priv_change', false],
        ['-a /etc/sudoers -p x -k priv_change', false],
        ['-w /etc/sudoers -p rx -k priv_change', false],
      ], '-w sets a watch on a path, -p wa watches writes and attribute changes, and -k attaches a key for ausearch -k. -p r would record reads only, missing the change; -a adds a syscall rule and does not take a path like that; -p rx records reads and executions, again missing every change to the file.'),
    ],
    checkpoint: [
      mcq('In /var/log/auth.log you see "Accepted password for deploy from 203.0.113.45" on a server meant to be key-only. What does it tell the analyst?', [
        ['Password logins are actually enabled, and an external IP got in with one', true],
        ['The deploy user\'s public key was accepted, and "password" is just a log label', false],
        ['sshd rejected the login after logging it, because key-only mode was set', false],
        ['The line comes from sudo, recording deploy\'s password being re-entered', false],
      ], '"Accepted password" means password authentication succeeded, so the hardening is not in effect and an outside source logged in. A key login reads "Accepted publickey"; sshd does not log "Accepted" for a rejected login; and sudo lines are written by sudo, not sshd.'),
      mcq('Which command shows the settings sshd will actually apply, after includes and defaults are resolved?', [
        ['sudo sshd -T', true],
        ['cat /etc/ssh/sshd_config', false],
        ['systemctl status ssh', false],
        ['sudo sshd -t -f /etc/ssh/sshd_config', false],
      ], 'sshd -T prints the effective configuration after reading every included file and default. cat shows one file and misses drop-ins and defaults, systemctl status only shows whether the service runs, and sshd -t (lower-case) checks syntax without printing the settings.'),
      mcq('A sudoers line reads "%devs ALL=(ALL) NOPASSWD: ALL". Why does a hardening review flag it?', [
        ['Any session of any devs member becomes root with no further prompt', true],
        ['It stops devs from using sudo at all until a password is configured', false],
        ['It hides devs\' sudo commands so they are no longer written to auth.log', false],
      ], 'NOPASSWD: ALL lets any devs member, or anyone who has hijacked their session, run anything as root without proving who they are again. It does not block sudo, and sudo still logs every command — the problem is the missing re-authentication and the breadth of ALL.'),
    ],
  },

  /* ── IAM_MFA ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_ENDPOINT_IDENTITY_IAM_MFA',
    notes: `Most breaches that reach the news start with an identity: a password that was phished, an
account that should have been removed, an admin who had more access than the job needed. **Identity
and Access Management (IAM)** is the discipline that keeps the right people holding the right access,
for as long as they need it and no longer. In Year 3 you built authentication and authorisation into an
API; here the question is organisational — thousands of people, hundreds of applications.

## The identity lifecycle: joiners, movers, leavers

- **Joiner** — HR creates the employee record; IAM creates accounts and grants the **role's** access
  (a Finance analyst gets Finance-Users and the ERP viewer role), not a copy of a colleague's access.
- **Mover** — changes team. New access is added, and **old access must be removed**. Movers are where
  privilege silently piles up ("access creep"): a person who worked in Finance, then Sales, then IT
  holds all three.
- **Leaver** — on the last working day, accounts are disabled, sessions and tokens revoked, keys and
  VPN certificates withdrawn. A leaver's account that still works is one of the most common audit
  findings in Indian banks and IT firms alike.

The source of truth is HR (who works here, in which role), not the directory. Automation (an HR system
feeding the directory or an identity governance tool) is the target; a periodic **access review**
comparing the two is the safety net.

## Least privilege, in practice

- **Role-based access control (RBAC)**: permissions go to roles, people get roles. Reviewing 30 roles
  is possible; reviewing 3,000 individual grants is not.
- **Separation of duties**: the person who raises a payment cannot approve it. Bank auditors test this
  in core banking and ERP roles.
- **Separate admin accounts**: priya.k reads email; priya.k-adm administers servers, has no mailbox and
  is used only from an admin workstation. A phishing link opened as priya.k then cannot touch servers.
- **Access recertification**: every quarter or half-year, managers confirm their team's access. It
  only works if reviewers see meaningful role names, not "GRP_FIN_0173".

## MFA, and why its forms are not equal

Multi-factor authentication combines something you know, have and are. Ranked from weakest to
strongest against today's attacks:

1. **SMS OTP** — far better than a password alone, but exposed to SIM swap and to real-time phishing
   pages that ask for the OTP and replay it.
2. **TOTP authenticator apps** — no SIM risk, still phishable in real time.
3. **Push approval** — convenient, but attackers send prompts until a tired user taps Approve (MITRE:
   Multi-Factor Authentication Request Generation, often called MFA fatigue). **Number matching**,
   where the user types the number shown on the login screen, defeats most of it.
4. **FIDO2 security keys and passkeys** — phishing-resistant: the browser binds the credential to the
   real site, so a look-alike domain gets nothing. The target for admins and high-risk users.

India context: UPI already combines device binding (something you have — the registered SIM and phone)
with a PIN (something you know), and Aadhaar authentication offers OTP and biometric factors. The same
reasoning applies inside a company. What MFA does **not** protect against: a session token stolen after
login (you met revocation in Year 3), and a help desk that resets MFA for a caller without verifying them.

## Privileged access management (PAM)

- Inventory every privileged account: domain and cloud admins, database admins, root on servers,
  service accounts, break-glass accounts.
- **Just-in-time** elevation: admin rights granted for a ticket and a time window, then removed, rather
  than held permanently.
- **Vaulting**: shared and service credentials live in a vault, checked out, rotated after use.
- **Session recording** for admin sessions into production — RBI expects banks to control and monitor
  privileged access, and recordings answer the auditor's "who did what" question.
- **Break-glass accounts**: one or two emergency admin accounts, excluded from SSO dependencies, with
  long random passwords in a sealed process, and an alert on every single use.

## Service accounts and other non-humans

Service accounts, API keys and cloud workload identities usually outnumber people and are reviewed
least. Each needs an owner, the narrowest rights, no interactive logon, and a rotation plan.

## What the SOC watches

New members of privileged groups, MFA method changes followed by a sign-in from a new location, a
leaver account authenticating, many MFA prompts denied then one approved, sign-ins from two distant
countries within an hour ("impossible travel"), and service accounts logging on interactively. Each
is a SIEM rule over identity logs. The worked example runs an access review in Python.`,
    workedExample: `**Task.** An HR export and an Active Directory export for a small finance team (synthetic).
Produce the joiners, movers and leavers findings an auditor would expect, plus privileged members.

    hr:  emp_id,name,status,department,last_day          ad:  sam,emp_id,enabled,department,groups,last_logon
         E101,Priya Kumar,ACTIVE,Finance,                      priya.k,E101,True,Finance,Finance-Users;SAP-Approvers,2026-03-14
         E102,Rahul Mehta,ACTIVE,IT,                           rahul.m,E102,True,IT,IT-Users;Domain Admins,2026-03-14
         E103,Sneha Rao,EXITED,Finance,2026-02-28              sneha.r,E103,True,Finance,Finance-Users;SAP-Approvers,2026-03-10
         E104,Arjun Das,ACTIVE,Sales,                          arjun.d,E104,True,Finance,Finance-Users;Sales-Users,2026-03-12
         E105,Fatima Shaikh,ACTIVE,HR,                         svc_report,,True,,Domain Admins,2025-06-01

Join on the employee ID — never on names, which differ between systems:

    m = ad.merge(hr, on="emp_id", how="outer", suffixes=("_ad", "_hr"), indicator=True)

    findings = []
    for _, r in m.iterrows():
        if r["_merge"] == "right_only" and r["status"] == "ACTIVE":
            findings.append(("JOINER_NO_ACCOUNT", r["name"], "active in HR, no AD account"))
        elif r["_merge"] == "left_only":
            findings.append(("ORPHAN_ACCOUNT", r["sam"], "AD account with no HR record"))
        elif r["status"] == "EXITED" and r["enabled"]:
            findings.append(("LEAVER_STILL_ENABLED", r["sam"], f"left {r['last_day']}, still enabled"))
            if r["last_logon"] > r["last_day"]:
                findings.append(("LEAVER_LOGON_AFTER_EXIT", r["sam"], f"logged on {r['last_logon']}"))
        elif r["department_ad"] != r["department_hr"]:
            findings.append(("MOVER_STALE_ACCESS", r["sam"],
                             f"HR says {r['department_hr']}, AD says {r['department_ad']}"))
        if r["_merge"] != "right_only" and "Domain Admins" in str(r["groups"]).split(";"):
            findings.append(("PRIVILEGED_MEMBER", r["sam"], "member of Domain Admins - confirm it is approved"))

Output:

                    finding           who                                           detail
             ORPHAN_ACCOUNT    svc_report                     AD account with no HR record
          PRIVILEGED_MEMBER    svc_report member of Domain Admins - confirm it is approved
          PRIVILEGED_MEMBER       rahul.m member of Domain Admins - confirm it is approved
       LEAVER_STILL_ENABLED       sneha.r                   left 2026-02-28, still enabled
    LEAVER_LOGON_AFTER_EXIT       sneha.r                             logged on 2026-03-10
         MOVER_STALE_ACCESS       arjun.d                   HR says Sales, AD says Finance
          JOINER_NO_ACCOUNT Fatima Shaikh                      active in HR, no AD account

**Reading it.** sneha.r is not a hygiene finding but a possible **incident**: someone used a leaver's
account ten days after exit — escalate to the SOC, then disable. svc_report is a service account with
no owner and Domain Admin rights; find an owner, cut it to the rights its report needs, or disable it.
arjun.d moved to Sales but kept Finance access; remove Finance-Users after his manager confirms.
rahul.m's Domain Admin membership needs an approval on record and should move to a separate admin
account. Fatima's missing account is a joiner process gap, not a risk.`,
    mcqs: [
      mcq('An employee moved from Finance to Sales three months ago and still approves vendor payments in the ERP. Which lifecycle stage failed?', [
        ['Mover: new access was added but the old role was never removed', true],
        ['Joiner: the account was created with the wrong department code', false],
        ['Leaver: the Finance account was not disabled on the transfer day', false],
      ], 'A change of team is the mover stage, and the usual failure is adding the new role without removing the old one — access creep. The joiner stage happened years earlier, and a transfer is not a leaver event: the person still works there and keeps one identity.'),
      mcq('A bank wants phishing-resistant MFA for its server administrators. Which option meets that bar?', [
        ['FIDO2 security keys or passkeys bound to the real sign-in domain', true],
        ['SMS one-time passwords sent to a registered company mobile number', false],
        ['Push approvals in an authenticator app with a "deny" button shown', false],
        ['Six-digit TOTP codes generated by an app installed on the laptop', false],
      ], 'FIDO2 credentials are bound to the site\'s origin, so a look-alike phishing page cannot use them. SMS and TOTP codes can be typed into a fake page and replayed in real time, and plain push approvals fall to repeated prompts until a user taps Approve.'),
      mcq('Why should an admin use priya.k-adm for server work and priya.k for email and browsing?', [
        ['A phishing link opened as priya.k then has no rights to touch servers', true],
        ['Two accounts double the licences, which auditors read as more control', false],
        ['Admin accounts cannot receive MFA prompts, so a second one is needed', false],
      ], 'Separating everyday and privileged accounts means the account most exposed to phishing and malicious documents holds no admin rights. Licence counts prove nothing to an auditor, and admin accounts should have the strongest MFA, not none.'),
    ],
    checkpoint: [
      mcq('A user reports eleven MFA push prompts at 1 a.m. that they did not start; they denied them all. What does it tell the SOC?', [
        ['The password is probably known to someone else; reset it and review recent sign-ins', true],
        ['The authenticator app is faulty and should simply be reinstalled on the user\'s phone', false],
        ['MFA did its job, so the event can be closed with no further action from the SOC', false],
        ['The user\'s phone number was ported to a new SIM and the prompts were duplicated', false],
      ], 'A push is only sent after the first factor succeeds, so unexpected prompts mean someone has the password and is trying to wear the user down. MFA held this time, but the password must be reset; a faulty app does not invent prompts, and push MFA does not depend on the SIM.'),
      mcq('An access review finds a service account owned by nobody, with Domain Admin rights, last used eight months ago. What should happen first?', [
        ['Find an owner; if none appears, disable it and watch what breaks', true],
        ['Rotate its password and keep it as a spare emergency admin account', false],
        ['Give it to the help desk team so that someone is at least using it', false],
        ['Convert it into a normal user account so the admin rights stop applying', false],
      ], 'Every non-human identity needs an owner; one with no owner and no recent use should be disabled, which is reversible if a forgotten job depends on it. A spare admin account is a hidden backdoor, handing it out widens access, and converting the account type keeps its group memberships.'),
      mcq('In a bank\'s ERP, the same user can create a vendor and approve payments to it. Which principle does that violate?', [
        ['Separation of duties', true],
        ['Defence in depth', false],
        ['Secure by default', false],
        ['Fail closed on errors', false],
      ], 'Separation of duties requires that no single person can both start and approve a sensitive transaction, which is exactly what creating a vendor and paying it allows. Defence in depth is about layered controls, secure by default about safe initial settings, and failing closed about behaviour on errors.'),
    ],
  },

  /* ── ENDPOINT_PROTECTION ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_ENDPOINT_IDENTITY_ENDPOINT_PROTECTION',
    notes: `An L1 analyst's day at an MSSP in Bengaluru is mostly endpoint alerts. This lesson is what the
agent on each laptop records, what it can do, and how you work an alert from it.

## Antivirus, EDR, XDR

- **Antivirus (AV)** — checks files against signatures and some behaviour rules, and blocks or
  quarantines them. Microsoft Defender Antivirus is built into Windows. Good at known malware, weak at
  anything new or anything done with tools already on the machine (PowerShell, certutil, rundll32 —
  "living off the land").
- **EDR (Endpoint Detection and Response)** — an agent that **records** what happens (processes,
  command lines, network connections, file and registry changes, logons) and ships it to a console,
  raises behaviour-based alerts, and lets an analyst **respond** remotely. EDR assumes something will
  get past prevention and makes it visible.
- **XDR** — the vendor term for joining EDR with email, identity and network data in one console.

Free and open-source building blocks you can run at home: **Sysmon** for telemetry, the **Wazuh agent**
for log collection, file integrity monitoring and configuration assessment, **osquery** to ask the
fleet SQL questions, and **Velociraptor** for investigation and collection. Commercial EDRs work on the
same ideas.

## What an EDR records

For a process: image path, command line, hashes, user, start time, **parent process** and its command
line, signer, and what it did — files written, connections made, child processes. The single most useful
view in any EDR is the **process tree**, because malicious activity is usually visible in who started
whom:

- Office (WINWORD.EXE, EXCEL.EXE, OUTLOOK.EXE) starting cmd.exe, powershell.exe, wscript.exe or mshta.exe.
- powershell.exe with **-enc** (an encoded command) and a hidden window.
- A process named like a system binary in the wrong place: svchost.exe running from a user's
  AppData\\Local\\Temp. The real one lives in C:\\Windows\\System32 and its parent is services.exe.
- A browser or PDF reader writing an executable and then running it.

## Working an alert, step by step

1. **Read the alert** — rule name, host, user, time, severity. Note the time zone.
2. **Look at the tree** — parent, children, command lines. What started it? What did it start?
3. **Check reputation** — hash and domain in VirusTotal or your threat intel; signer. Do not upload
   a client's files to a public service: look up the hash only.
4. **Scope** — the same hash, command line or domain on other machines (an EDR search or osquery).
5. **Decide** — true positive, benign true positive (an admin's legitimate script), or false positive.
6. **Respond** if true: **isolate the host** (network containment — the agent cuts all traffic except to
   the console, so you can still investigate), kill the process, quarantine the file, collect evidence,
   then hand over per your runbook. Isolation of a production server is a business decision — call the
   owner first unless your playbook says otherwise.
7. **Write it up** — what, when, scope, evidence, actions, and what would detect it earlier.

## Reading a tree with pandas

Synthetic process-creation records (the fields Sysmon event 1 or any EDR gives), flagged with three
simple rules:

    OFFICE = {"WINWORD.EXE", "EXCEL.EXE", "POWERPNT.EXE", "OUTLOOK.EXE"}
    SHELLS = {"cmd.exe", "powershell.exe", "wscript.exe", "cscript.exe", "mshta.exe"}

    def why(r):
        reasons = []
        if r["Parent"].upper() in OFFICE and r["Image"].lower() in SHELLS:
            reasons.append("office app started a shell")
        if r["Image"].lower() == "powershell.exe" and " -enc" in r["CommandLine"].lower():
            reasons.append("encoded PowerShell")
        if r["Image"].lower() == "svchost.exe" and not r["Path"].lower().startswith(r"c:\\windows\\system32"):
            reasons.append("system name outside System32")
        return "; ".join(reasons)

    procs["Parent"] = procs["ParentProcessId"].map(procs.set_index("ProcessId")["Image"]).fillna("?")
    procs["flag"] = procs.apply(why, axis=1)

Output (the tree printed by a small recursive function from WINWORD.EXE's PID):

                UtcTime  ProcessId      Parent          Image                         flag
    2026-03-14 10:05:19       6020 WINWORD.EXE        cmd.exe   office app started a shell
    2026-03-14 10:05:19       6044     cmd.exe powershell.exe           encoded PowerShell
    2026-03-14 10:12:30       7420           ?    svchost.exe system name outside System32
    WINWORD.EXE (5312)
      cmd.exe (6020)
        powershell.exe (6044)

The same powershell.exe running "Get-Service" from explorer.exe was not flagged: the rule is about
**context**, not the binary. Word opened Invoice_March.docm (a macro-enabled document from Downloads),
which started a hidden encoded PowerShell — the user's laptop should be isolated and the document's
hash searched across the fleet. The svchost.exe in Temp with an unknown parent is a second finding.

## Prevention settings that cut alerts

Attack Surface Reduction rules in Microsoft Defender (for example, blocking Office applications from
creating child processes), blocking macros in files from the internet, application control (WDAC or
AppLocker) for servers, and tamper protection so the agent cannot be switched off by a local admin.
Each one turns a class of alerts into blocks.`,
    mcqs: [
      mcq('Which capability most clearly separates an EDR from traditional antivirus?', [
        ['It records process, network and file activity for investigation and lets you respond remotely', true],
        ['It scans files against a list of known malware signatures and quarantines the files that match', false],
        ['It updates its malware definitions several times a day from the vendor\'s cloud service', false],
      ], 'EDR\'s defining feature is telemetry plus response — a searchable record of what happened and actions like isolation. Signature scanning and frequent definition updates are what antivirus already does, and EDRs often include them too.'),
      mcq('An EDR shows EXCEL.EXE as the parent of mshta.exe on a payroll clerk\'s laptop. Why is that pair worth an alert?', [
        ['Spreadsheets have no business starting a script host, which is how macro malware often runs', true],
        ['mshta.exe is always malware and should be deleted from every Windows machine immediately', false],
        ['Excel is never allowed to start any child process, including its own printing and help helpers', false],
        ['The clerk lacks admin rights, and mshta.exe can only start from an administrator account', false],
      ], 'mshta.exe is a legitimate Windows binary, but an Office application launching it (or cmd, PowerShell, wscript) is a classic macro-malware chain, so the parent-child pair is the signal. Deleting system binaries breaks Windows, Excel legitimately starts some helpers, and mshta runs without admin rights.'),
      mcq('A confirmed true positive is on a production database server at a bank. Before pressing "Isolate host" in the EDR, what should the analyst do?', [
        ['Follow the runbook, which usually means informing the server owner, since isolation stops the service', true],
        ['Reboot the server first so the malicious process is killed before isolation is applied', false],
        ['Wait for the next maintenance window so that isolation does not cause an unplanned outage', false],
      ], 'Isolation cuts the server\'s network, so on production it is a business decision taken through the runbook and the owner, often quickly. Rebooting destroys memory evidence and may not remove persistence, and waiting days for a window leaves an active compromise running.'),
    ],
    checkpoint: [
      mcq('An EDR alert shows svchost.exe running from C:\\Users\\kavya\\AppData\\Local\\Temp. What makes it suspicious?', [
        ['The genuine svchost.exe runs from System32 with services.exe as its parent', true],
        ['svchost.exe should never run on a laptop, only on servers with roles installed', false],
        ['Programs in Temp are deleted at logoff, so it must have restarted itself there', false],
      ], 'Malware often borrows system process names; the real svchost.exe lives in C:\\Windows\\System32 and is started by services.exe. svchost runs on every Windows machine, and Temp is not cleared at logoff by default, so neither of those explains the alert.'),
      mcq('An L1 analyst wants to know whether a suspicious file hash from one laptop exists anywhere else in the company. Which step is this?', [
        ['Scoping', true],
        ['Containment', false],
        ['Eradication', false],
        ['Lessons learnt', false],
      ], 'Searching the fleet for the same hash, domain or command line establishes how far the activity spread, which is scoping. Containment (isolation) and eradication (removal) come after you know the scope, and lessons learnt is the review at the end.'),
      mcq('A client\'s EDR flags an unknown executable. Why should the analyst look up its hash rather than upload the file to a public scanning site?', [
        ['Uploaded files can be seen by others and may contain the client\'s confidential data', true],
        ['Public sites only accept hashes and will reject an uploaded executable outright', false],
        ['A hash lookup also removes the file from the endpoint as soon as it is seen as malicious', false],
      ], 'Files sent to public multi-scanner services can be shared with other users, leaking internal documents or tipping off an attacker. Those sites do accept uploads, and a lookup is read-only — it never changes the endpoint. Hash first; upload only with approval.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_ENDPOINT_IDENTITY_DEBUGGING',
    notes: `Detections and hardening fail quietly: no error, just an alert that never fires or a setting that
never applied. Each case below is a real class of mistake, with the symptom, the cause and the fix.
Read the symptom and guess the cause before reading on.

## 1. The rolling window that would not run

**Symptom.** A failed-logon detector on a SIEM export raises:

    ValueError: Each group within index must be monotonic. Sort the values in index first.

**Cause.** A time-based rolling window ("5min") needs each group's timestamps in order. The export came
in the order the SIEM returned it, not by time. Without groupby the message is "index values must be
monotonic".

**Fix.** Sort before setting the index:

    fails = fails.sort_values("TimeCreated")
    fails.set_index("TimeCreated").groupby("TargetUserName")["EventID"].rolling("5min").count()

## 2. The regex that missed the worst lines

**Symptom.** An auth.log parser reports 7 failed SSH logins; grep counts 13 "Failed password" lines.

**Cause.** The pattern was **Failed password for (\\S+) from (\\S+)**. For "Failed password for invalid
user oracle from ..." the word after "for" is "invalid", which is not followed by " from", so those
lines do not match — and those are the name-guessing lines that matter most.

**Fix.** Make the prefix optional, then reconcile with a dumb count every time:

    r"Failed password for (?:invalid user )?(\\S+) from ([\\d.]+)"
    grep -c "Failed password" auth.log    # the parser must agree with this

## 3. "PasswordAuthentication no" that did nothing

**Symptom.** After hardening, a scan still finds password logins accepted on an Ubuntu server.

**Cause.** sshd keeps the first value it reads, and /etc/ssh/sshd_config.d/50-cloud-init.conf, included
at the top, says yes.

**Fix.** Check the effective value with **sudo sshd -T | grep passwordauthentication**, fix the drop-in,
run **sudo sshd -t**, reload, and test a password login from a second session before closing the first.

## 4. Process-creation events with no command line

**Symptom.** A rule for "powershell -enc" never fires, though 4688 events for powershell.exe exist.

**Cause.** 4688 is audited but "Include command line in process creation events" is not enabled, so the
Process Command Line field is empty and the rule has nothing to match.

**Fix.** Enable the GPO setting (Administrative Templates > System > Audit Process Creation), confirm on
one machine that new 4688 events carry the command line, and add Sysmon event 1 or PowerShell 4104 for
more detail. Test every detection with a harmless trigger before trusting it.

## 5. Correlation off by five and a half hours

**Symptom.** A rule joining Windows failures to VPN logs finds nothing, though the analyst can see the
same user in both.

**Cause.** The Windows export was in UTC; the VPN appliance logged IST (+05:30) with no zone marker; and
syslog-style lines have no year. The join window of 10 minutes could never match.

**Fix.** Convert everything to timezone-aware UTC on ingestion:

    vpn["ts"] = pd.to_datetime(vpn["ts"]).dt.tz_localize("Asia/Kolkata").dt.tz_convert("UTC")
    win["ts"] = pd.to_datetime(win["ts"], utc=True)

## 6. The stale-account report that flagged active people

**Symptom.** A report of accounts "not logged on for 14 days" lists people who log on every morning.

**Cause.** LastLogonDate comes from lastLogonTimestamp, which AD only replicates when it is older than a
randomised interval of up to about two weeks. Short thresholds catch active users.

**Fix.** Use a threshold of 90 days for staleness; if you need exact recency, query lastLogon on every DC
and take the maximum, or use the logon events in the SIEM.`,
    mcqs: [
      mcq('A pandas detector on Windows 4625 events crashes with "index values must be monotonic" at the rolling("5min") line. What is the fix?', [
        ['Sort the rows by TimeCreated before setting it as the index', true],
        ['Convert TimeCreated to a string so pandas stops comparing it', false],
        ['Replace "5min" with an integer window of five rows instead', false],
        ['Drop duplicate timestamps, since rolling rejects any repeats', false],
      ], 'Time-based rolling windows require an ordered datetime index, so sorting fixes it. Converting to strings breaks the time window entirely, a five-row window counts rows instead of minutes, and duplicate timestamps are allowed — order is the issue.'),
      mcq('Your auth.log parser finds fewer SSH failures than grep -c "Failed password". Which lines is the regex most likely missing?', [
        ['Lines for user names that do not exist, which read "for invalid user <name>"', true],
        ['Lines that use IPv4 addresses, because \\S+ cannot match a dotted address', false],
        ['Lines written in the first second of a minute, since their seconds field reads "00"', false],
      ], 'sshd inserts "invalid user" before unknown names, so a pattern expecting the user right after "for" skips those lines. \\S+ matches a dotted IPv4 address fine, and a seconds field of 00 is still digits, so neither of those changes the count.'),
      mcq('A rule matching "powershell -enc" in 4688 events has never fired, though 4688s for powershell.exe exist. What should be checked first?', [
        ['Whether command-line auditing is on, as the Process Command Line field may be empty', true],
        ['Whether PowerShell is installed, since the 4688 might be for a different binary', false],
        ['Whether the SIEM licence includes Windows events from those particular machines', false],
      ], 'Without "Include command line in process creation events" the 4688 has the image but no command line, so a command-line rule can never match. The events already show powershell.exe running and already reach the SIEM, so installation and licensing are ruled out.'),
      mcq('A join between Windows events in UTC and VPN logs in IST with no zone marker finds no matches. What is the right fix?', [
        ['Localise the VPN times to Asia/Kolkata, then convert both sources to UTC', true],
        ['Widen the join window to six hours so the two sets of times can overlap', false],
        ['Strip the time zone from the Windows events so that both columns look alike', false],
        ['Subtract five hours from every Windows event and keep the join as it is', false],
      ], 'Timestamps must be made aware of their real zone and converted to one standard before joining. A six-hour window floods the join with false matches, stripping the zone loses the information, and subtracting five hours ignores the half hour (IST is +05:30) — and it moves the wrong side.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_ENDPOINT_IDENTITY_PRACTICE',
    notes: `Eight exercises, easiest first. Answer each on paper before reading the answer. Exercises 6 and
8 are for the venv: generate small synthetic files yourself — never pull logs from systems you are not
authorised to touch.

## 1. Name the event (warm-up)

Give the Windows Security event ID: (a) failed logon, (b) a user account was created, (c) a member was
added to Domain Admins, (d) the Security log was cleared, (e) a new process was created.

**Answer.** (a) 4625, (b) 4720, (c) 4728 (Domain Admins is a global group), (d) 1102, (e) 4688.

## 2. Logon types

A file server shows 4624 type 3, type 5 and type 10. Which one would you ask the owner about?

**Answer.** Type 10 (RDP). Type 3 is share access, the server's job; type 5 is a service starting.
Users rarely need an interactive desktop on a file server, so a type 10 needs an explanation.

## 3. Read the status

4625 events show SubStatus 0xC000006A for one account, 30 times in two minutes, from an IP outside the
office range. What is happening and what do you check next?

**Answer.** A wrong password for a real account, repeatedly, from outside: password guessing against
that account. Next, look for a 4624 for the same account and IP after the burst, check whether the
account locked (4740), and identify the IP.

## 4. Kerberos on a DC

Put in order and say which machine logs each: 4769, 4624 type 3, 4768.

**Answer.** 4768 (DC issues the TGT), 4769 (DC issues a service ticket), 4624 type 3 (the server
being accessed records the logon).

## 5. sshd review

    Include /etc/ssh/sshd_config.d/*.conf
    PermitRootLogin prohibit-password
    PasswordAuthentication no
    MaxAuthTries 6

and sshd_config.d/10-legacy.conf contains **PasswordAuthentication yes**. What is the effective
password setting, and which two lines would you change?

**Answer.** yes — the drop-in is read first. Remove or fix the drop-in, and set MaxAuthTries 3.
PermitRootLogin prohibit-password allows root with a key; most baselines want no.

## 6. Burst then success (venv)

Write synthetic Windows logon JSON with 12 failures for one user from one IP within three minutes and
a success a minute later, plus a user with 3 failures and a success. Using pandas, flag only the first.

**Answer.** Sort by time; group 4625s by (TargetUserName, IpAddress); rolling("5min").count(); keep
groups reaching 10; merge with 4624s on the same pair; keep successes within 10 minutes after the last
failure. Only the 12-failure user should appear — if the 3-failure user appears, your threshold or
grouping is wrong.

## 7. Joiners, movers, leavers

HR says E210 left on 31 January. AD shows E210 enabled, last logon 4 February, member of VPN-Users.
Classify it and say what you do.

**Answer.** A leaver still enabled, used after the exit date: treat it as a possible incident. Raise
it to the SOC lead, disable the account and revoke VPN certificates and sessions, then review what the
4 February session did. Fix the leaver process so HR exits trigger disabling.

## 8. Fleet hardening check (venv)

Given ten synthetic sshd_config texts, print a table: host, failing settings. Apply the first-value rule
and stop at the first Match block.

**Answer.** Parse each line (strip comments, split keyword and value, lower-case the keyword), keep the
first value per keyword with dict.setdefault, compare against a rules table with the wanted value and the
reason, and treat a missing keyword as the default (MaxAuthTries defaults to 6). On a real fleet confirm
with sshd -T on each host, because includes and defaults are resolved there.`,
    mcqs: [
      mcq('Which Windows event ID records a user being added to the Domain Admins group?', [
        ['4728, a member added to a security-enabled global group', true],
        ['4732, a member added to a security-enabled local group', false],
        ['4720, a user account was created in the domain directory', false],
        ['4672, special privileges assigned to a brand-new logon', false],
      ], 'Domain Admins is a global group, so additions to it are 4728. 4732 covers local groups such as a machine\'s Administrators, 4720 is account creation, and 4672 is written when an admin logs on — not when membership changes.'),
      mcq('In the Kerberos sequence for opening a file share, which event does the file server itself write?', [
        ['4624 with Logon Type 3', true],
        ['4768 for the TGT', false],
        ['4769 for the service ticket', false],
        ['4776 for validation', false],
      ], 'The server being accessed writes the 4624 network logon. 4768 and 4769 are written by the domain controller when it issues tickets, and 4776 is the DC validating an NTLM logon, not Kerberos.'),
      mcq('An HR export says an employee left on 31 January; AD shows the account enabled with a last logon on 4 February. How should the analyst classify it?', [
        ['A possible incident: a leaver\'s account was used after exit', true],
        ['A routine finding for the next quarterly access review cycle', false],
        ['A data-quality issue, since HR dates are often entered late', false],
      ], 'An enabled leaver account is a process failure, but one used after the exit date may mean someone else holds the credentials, so it goes to the SOC now. Leaving it for the quarterly review gives an intruder months, and assuming an HR typo skips the check that rules it out.'),
      mcq('An sshd_config has "PasswordAuthentication no" at line 40, and an included drop-in read at line 1 says "yes". What does sshd apply?', [
        ['yes, because sshd keeps the first value it reads', true],
        ['no, because the main config always overrides drop-ins', false],
        ['Neither; sshd refuses to start with conflicting values', false],
      ], 'For most keywords sshd uses the first value obtained, and the Include at the top means the drop-in is read first. The main file has no special priority, and conflicting values are not a syntax error — which is why sshd -T is the way to check.'),
      mcq('A practice detector flags both a 12-failure burst from an outside IP and a user who failed three times at her desk before logging in. What should change?', [
        ['Raise the threshold and group by user and source IP so typos do not count', true],
        ['Remove the success join, since every failure deserves its own alert anyway', false],
        ['Alert only on Logon Type 2, as remote guessing never uses network logons', false],
      ], 'Grouping by (user, source) and requiring around ten failures in a short window separates guessing from typos. Alerting on every failure buries the SOC in noise, and remote guessing shows up as network (type 3) or RDP (type 10) logons, not type 2, so that filter keeps the wrong events.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_ENDPOINT_IDENTITY_INTERVIEW_QUESTION',
    notes: `Four questions asked in nearly every SOC L1/L2 interview at MSSPs, banks and GCCs in India.
Interviewers want to hear that you know the event IDs, but more that you reason from evidence to a
decision and say what you would check next.

## Q1. "Which Windows event IDs do you look at for a suspected brute-force attack, and what do you look for?"

**Strong answer:** 4625 for failed logons and 4624 for successes, on the machine being logged on to;
on domain controllers 4771 (Kerberos pre-auth failed, code 0x18) and 4776 for NTLM, and 4740 for
lockouts. I group failures by target account and source IP over a short window, read the SubStatus
— 0xC000006A is a wrong password for a real account, 0xC0000064 a name that does not exist — and the
Logon Type, 3 for network and 10 for RDP. The question that matters is whether a **4624 from the same
source followed the burst**; if so, it is no longer an attempt but a compromise, and I look at what
that account did next — 4688, 4720, 4728/4732, 1102.

**Follow-up:** "Many accounts, two failures each, from one IP?" — That is password spraying, built to
stay under lockout. Threshold per source across accounts, not per account.

## Q2. "Walk me through Kerberos authentication in Active Directory as a defender would see it."

**Strong answer:** The client proves knowledge of the password and gets a TGT from the DC — 4768, or
4771 if pre-auth fails. To reach a service it presents the TGT and gets a service ticket — 4769, naming
the service. It presents that to the server, which logs 4624 type 3 with package Kerberos. TGTs are
signed with the krbtgt key. NTLM is the fallback, logged as 4776 on the DC, and is weaker, so we audit
and reduce it.

**Follow-up:** "What AD misconfigurations would you fix first?" — Excess privileged group members
including nested ones; stale enabled accounts; a weak password policy and never-expiring service
passwords; the same local admin password everywhere (deploy Windows LAPS); unconstrained delegation;
and pre-authentication disabled on accounts.

## Q3. "You get an EDR alert: WINWORD.EXE spawned powershell.exe with an encoded command. What do you do?"

**Strong answer:** Open the process tree and confirm the chain and the document — name, path, where it
came from (email, download). Check the hash and any domains or IPs the PowerShell contacted against
threat intel, looking up hashes rather than uploading client files. Scope: the same document hash,
sender or domain on other machines. It is very unlikely to be benign, so per the runbook I isolate the
laptop, preserve evidence, reset the user's password if credentials may be exposed, and escalate to L2
with a timeline. Then ask how to prevent it: blocking macros from the internet and an ASR rule stopping
Office from creating child processes.

**Follow-up:** "The user says they were only opening an invoice." — Very likely true. The user is the
victim; the question is what the macro did, not whether to blame them.

## Q4. "How do you secure a Linux server's SSH access, and how would you know it is being attacked?"

**Strong answer:** Keys only (PasswordAuthentication no), no root login, AllowUsers or AllowGroups,
MaxAuthTries 3, SSH reachable only from the VPN or bastion range, fail2ban, and named accounts with sudo
through a group, no NOPASSWD: ALL. I verify with sshd -T, because drop-ins in sshd_config.d are read
first and the first value wins. To detect, I watch auth.log or secure — "Failed password", "invalid
user", and above all "Accepted password" on a key-only server — plus sudo lines and auditd watches on
/etc/passwd, /etc/shadow and sudoers, forwarded to the SIEM.

**Follow-up:** "Why forward logs if they are on the server?" — An attacker with root can edit or
truncate local logs, and CERT-In expects logs to be retained for 180 days.`,
    mcqs: [
      mcq('An interviewer asks what single fact turns a brute-force alert from "attempt" into "incident". What is the best answer?', [
        ['A successful logon from the same source right after the run of failures', true],
        ['The number of failures going above one hundred within the hour window', false],
        ['The account in question being a member of the Domain Users group', false],
      ], 'Failures alone mean somebody tried; a 4624 (or "Accepted") from the same source afterwards means they got in, which changes the response. A large failure count is noisier but still an attempt, and almost every account is in Domain Users, so that tells you nothing.'),
      mcq('Asked "where does the 4769 event appear?", which answer shows you understand Kerberos?', [
        ['On the domain controller, when it issues a service ticket for a named service', true],
        ['On the file server, when the user first opens the shared folder on that server', false],
        ['On the client, when the laptop caches the TGT it received from the DC at logon', false],
      ], '4769 is the DC recording that it issued a service ticket, and it names the service requested. The file server records the resulting 4624 logon, and clients do not write 4769 for cached tickets.'),
      mcq('In an interview scenario, the user who opened a malicious invoice says "I only opened an attachment". What is the right attitude in your answer?', [
        ['Treat the user as the victim and focus on what the macro did and where else it is', true],
        ['Report the user to HR first, since opening attachments breaks company policy', false],
        ['Close the alert, as the user has confirmed the file came from a real vendor', false],
      ], 'Users opening invoices is normal work; blaming them makes people hide the next incident. The analyst\'s job is scope and impact. A user\'s word that a vendor sent it does not make the macro harmless — vendors\' mailboxes get compromised too.'),
    ],
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_ENDPOINT_IDENTITY_CHECKPOINT',
    notes: `Ten scenario questions across the topic: Windows events and Sysmon, Active Directory
authentication and misconfiguration, Linux hardening and logs, identity lifecycle and MFA, and EDR
triage. Decide your answer before reading the options.`,
    checkpoint: [
      ck('OPERATING_SYSTEMS', 'A SOC rule must catch an account being added to a workstation\'s local Administrators group. Which event ID should it match?', [
        ['4732', true],
        ['4728', false],
        ['4720', false],
        ['4624', false],
      ], '4732 is a member added to a security-enabled local group, which is what a machine\'s Administrators group is. 4728 is for global groups like Domain Admins, 4720 is account creation, and 4624 is a logon.'),
      ck('OPERATING_SYSTEMS', 'Which Sysmon event ID records a DNS query together with the process that made it?', [
        ['Event ID 22', true],
        ['Event ID 3', false],
        ['Event ID 11', false],
        ['Event ID 1', false],
      ], 'Sysmon event 22 is DNSEvent, logging the query and the requesting process. Event 3 is a network connection, 11 a file creation, and 1 a process creation — useful, but none records the DNS name lookup itself.'),
      mcq('At 09:00 on a DC, 4771 failures with code 0x18 hit 250 accounts from one internal IP, one or two per account. What should the analyst conclude?', [
        ['Likely password spraying from that host; find it and check for any later successes', true],
        ['Likely one user locked out after typing the wrong password at the start of the day', false],
        ['Likely a time-sync fault on the DC, which makes every pre-authentication request fail', false],
      ], 'Few failures per account across hundreds of accounts from one source is the spraying pattern, and the next question is whether any account then succeeded. A single user\'s typos hit one account, and clock skew produces a different failure code for everyone.'),
      mcq('An AD review finds application servers trusted for unconstrained delegation. What is the recommended change?', [
        ['Move them to constrained delegation and protect admin accounts from delegation', true],
        ['Add the servers to the Protected Users group so delegation becomes safe for them', false],
        ['Keep the setting and alert whenever an administrator logs on to those servers', false],
      ], 'Constrained delegation limits which services a server may act toward, and marking admin accounts as not delegable (or Protected Users for the accounts) stops their tickets being forwarded. Protected Users is for user accounts, not servers, and alerting leaves the risky setting in place.'),
      ck('LINUX_ADMIN', 'On a RHEL server, where should the analyst look first for sshd login failures written to a file?', [
        ['/var/log/secure', true],
        ['/var/log/auth.log', false],
        ['/var/log/messages', false],
        ['/var/log/lastlog', false],
      ], 'RHEL-family systems write sshd and sudo authentication messages to /var/log/secure; /var/log/auth.log is the Debian/Ubuntu equivalent. /var/log/messages holds general system messages, and lastlog is a binary record of each user\'s last login, not failures.'),
      ck('LINUX_ADMIN', 'A server must keep SSH open for named engineers only. Which pair of settings best achieves "keys only, no direct root"?', [
        ['PasswordAuthentication no and PermitRootLogin no', true],
        ['PermitEmptyPasswords no and X11Forwarding no', false],
        ['MaxAuthTries 3 together with PubkeyAuthentication yes', false],
      ], 'Disabling password authentication leaves keys as the only way in, and PermitRootLogin no forces engineers to log in by name and use sudo. Empty-password and X11 settings are worth having but do not achieve either goal, and MaxAuthTries only reduces guesses — passwords stay enabled.'),
      mcq('An HR-versus-AD reconciliation should join the two exports on which field?', [
        ['The employee ID, which both systems store unchanged', true],
        ['The display name, after converting both to lower case', false],
        ['The email address, which HR copies in on the joining day', false],
        ['The department, which tells you the expected group set', false],
      ], 'A stable unique identifier is the only safe join key. Names differ in spelling and initials between systems, email addresses change with marriage or rebrands and are often missing for non-mailbox accounts, and departments are what you are checking, not a key.'),
      mcq('Which MFA method still lets a real-time phishing page relay the code to the real site?', [
        ['TOTP codes from an authenticator app', true],
        ['FIDO2 security keys bound to the origin', false],
        ['Passkeys stored on the user\'s phone', false],
      ], 'A six-digit TOTP code typed into a fake page can be replayed to the real site within its time window. FIDO2 keys and passkeys sign a challenge bound to the genuine domain, so a look-alike site gets nothing usable — that is what phishing-resistant means.'),
      ck('OPERATING_SYSTEMS', 'An EDR tree shows OUTLOOK.EXE starting WINWORD.EXE, which starts powershell.exe -nop -w hidden -enc. What is the right L1 action under a standard runbook?', [
        ['Treat it as a true positive: isolate the laptop, preserve evidence, scope and escalate', true],
        ['Close it as benign, since Word is a signed Microsoft program that staff run every single day', false],
        ['Delete powershell.exe from the laptop so that the encoded command can no longer run', false],
      ], 'An attachment opened from mail spawning hidden encoded PowerShell is a classic malicious chain, so it is handled as a true positive. A signed parent does not make its children safe, and deleting a system binary breaks Windows without removing whatever already ran.'),
      ck('OPERATING_SYSTEMS', 'A detection on 4688 for encoded PowerShell has never fired, and the 4688 events show an empty Process Command Line. What fixes it?', [
        ['Enable "Include command line in process creation events" by Group Policy', true],
        ['Install PowerShell 7, since Windows PowerShell 5.1 does not log 4688 events', false],
        ['Switch the rule to match event 4624, which carries the full command line', false],
      ], 'The command-line field is populated only when that Group Policy setting is on; without it the rule has nothing to match. PowerShell\'s version does not control 4688, which Windows writes for every process, and 4624 is a logon event with no command line.'),
    ],
  },
];
