# VPS recovery + hardening runbook

**Context:** the VPS was mined in July 2026 and stopped again by the host's malware
detection on 2026-08-07. The July cleanup removed the miner but left the entry point
open, which is why it recurred. This runbook closes the entry points and rebuilds trust
in the box, in an order that does not break the platform.

**Do the steps in order.** Step 2 must happen before the machine is reachable from the
internet, and step 5 must happen before step 6 or the app will fail to reach Mongo.

---

## What was actually wrong

| # | Issue | Why it mattered |
|---|---|---|
| 1 | Redis on `0.0.0.0:6379`, no password | Scanners `CONFIG SET dir /var/spool/cron` → root crontab → miner reinstalls itself on a timer. **This is the reinfection vector.** |
| 2 | Mongo on `0.0.0.0:27017` as `admin` / `password123` | Full data read/write from anywhere; also the ransom-wipe pattern. |
| 3 | `ufw` could not close either | Docker's rules sit in the `DOCKER` chain, ahead of `INPUT`. `ufw deny 6379` was a no-op. |
| 4 | App on `0.0.0.0:5001/5002` | Anyone could bypass nginx, its TLS and its logging. |
| 5 | Piston `privileged: true` | Runs student-submitted code with effective host root. |
| 6 | `JWT_SECRET` defaulted to `your-secret-key-change-this` | See the warning in step 5 — if the compose `.env` was missing, this public string signed every admin token. |
| 7 | Secrets never rotated after a 15.5h root compromise | Attacker had `server/.env`: Razorpay, Anthropic, Brevo, 100ms, DB creds. |

Fixed in [`docker-compose.yml`](../../docker-compose.yml), [`scripts/harden-firewall.sh`](../../scripts/harden-firewall.sh),
[`scripts/backup.sh`](../../scripts/backup.sh), [`scripts/restore.sh`](../../scripts/restore.sh).

---

## Step 1 — Snapshot before you touch anything

In the Hostinger panel, take a snapshot/backup of the stopped VPS. It preserves evidence
and gives you a rollback if a hardening step goes wrong. Do this while the box is *off* —
it is the only moment you get a clean, quiescent image.

## Step 2 — Stop Docker from auto-starting before you boot

Containers have `restart: unless-stopped`, and the VPS still holds the **old** compose file.
Boot it normally and Redis is back on the public internet within seconds — before you can
log in. Close that race first.

**Preferred — recovery/rescue mode** (Hostinger panel → Recovery):

```bash
mount /dev/sda1 /mnt          # confirm the device in the rescue shell first
chroot /mnt
systemctl disable docker docker.socket containerd
exit
```

Then boot normally. Nothing is exposed.

**If recovery mode is not available** — boot, then paste this immediately into the panel's
**VNC console** (not SSH; VNC is up sooner):

```bash
systemctl stop docker docker.socket containerd; systemctl disable docker docker.socket containerd
```

Assume a short exposure window happened, and treat step 3 as mandatory rather than optional.

## Step 3 — Scan before you trust it

```bash
cd /root/lms
git fetch origin && git reset --hard origin/master
bash scripts/incident-scan.sh 2>&1 | tee /root/scan-$(date +%F-%H%M).txt
```

Read-only; it never deletes. Work through every `[!!]`. Pay closest attention to:

- **cron entries nobody wrote** — the signature of the Redis attack path
- **a running process whose binary was deleted** — near-certain malware
- **extra keys in `/root/.ssh/authorized_keys`** — how they walk back in after every cleanup

Capture before deleting, so the entry point stays visible:

```bash
mkdir -p /root/incident-$(date +%F)
cp -a <suspicious-file> /root/incident-$(date +%F)/
```

## Step 4 — Firewall

```bash
bash scripts/harden-firewall.sh
```

Sets ufw to 22/80/443 only, installs the `DOCKER-USER` rules that ufw cannot express,
persists them across reboot, and enables fail2ban on sshd.

Verify **from your laptop**, not from the server — all three must fail:

```bash
nc -zv -w5 <VPS_IP> 6379
nc -zv -w5 <VPS_IP> 27017
nc -zv -w5 <VPS_IP> 5001
```

## Step 5 — Generate new secrets

```bash
cd /root/lms
cp .env.example .env
chmod 600 .env
for i in 1 2 3; do openssl rand -base64 36 | tr -d '/+=' | cut -c1-40; done
```

Fill `/root/lms/.env`. **Put the OLD Mongo password in for now** — step 6 rotates it, and
the app must be able to authenticate in between:

```ini
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=password123      # old, on purpose — step 6 changes it
REDIS_PASSWORD=<generated>
JWT_SECRET=<generated>
```

> ⚠️ **Check this now.** The old compose had `JWT_SECRET: ${JWT_SECRET:-your-secret-key-change-this}`.
> If `/root/lms/.env` did not previously exist or did not define `JWT_SECRET`, then production
> has been signing tokens with that literal public string — which is in git, and lets anyone
> mint a valid SUPER_ADMIN token. Confirm with:
> ```bash
> docker exec lms-server-blue printenv JWT_SECRET
> ```
> If it comes back `your-secret-key-change-this`, treat every account as compromised: rotate
> the secret (below), and afterwards review admin users and recent `passport_membership`
> payments for anything you did not authorise.

Rotating `JWT_SECRET` logs every user out once. That is intended.

## Step 6 — Rotate the Mongo password (two steps, order matters)

`MONGO_INITDB_ROOT_PASSWORD` is only read when the data volume is **empty**. On your existing
volume it does nothing — changing it in `.env` alone just breaks authentication. Change it
inside Mongo first:

```bash
systemctl enable --now docker
cd /root/lms
docker-compose up -d mongodb redis          # now bound to 127.0.0.1 only

docker exec -it lms-mongodb mongosh -u admin -p password123 --authenticationDatabase admin
```

```javascript
use admin
db.changeUserPassword("admin", "<NEW_MONGO_PASSWORD>")
db.auth("admin", "<NEW_MONGO_PASSWORD>")   // must return { ok: 1 }
exit
```

Then update `/root/lms/.env` with the new password and recreate:

```bash
docker-compose up -d --force-recreate mongodb redis
docker exec lms-redis redis-cli -a "$REDIS_PASSWORD" ping    # → PONG
```

## Step 7 — Bring the app up and verify Piston

```bash
docker-compose up -d --no-build server-blue
curl -sf http://127.0.0.1:5001/api/health && echo " ✅ healthy"
```

Piston no longer runs `privileged: true`, so **verify code execution explicitly** — it is
core to assignments, Practice Lab and CareerPilot:

```bash
curl -s -X POST http://127.0.0.1:5001/api/health >/dev/null
docker exec lms-piston sh -c 'curl -s -X POST http://127.0.0.1:2000/api/v2/execute \
  -H "Content-Type: application/json" \
  -d "{\"language\":\"python\",\"version\":\"3.12.0\",\"files\":[{\"content\":\"print(6*7)\"}]}"'
```

Expect `42` in `run.stdout`. Then run one real submission through the UI (Practice Lab →
a coding problem → Submit) — that also finally settles whether `sqlite3` is installed in
Piston, which has been unverified since July.

**If Piston cannot run jobs**, restore the old setting as a temporary measure — in
`docker-compose.yml`, replace the `cap_add` / `security_opt` block with `privileged: true`,
then `docker-compose up -d --force-recreate piston`. It is not the reinfection vector, so
this is an acceptable stopgap; just do not leave it there indefinitely.

## Step 8 — Rotate the application secrets

Root was owned for ~15.5 hours with `server/.env` readable on disk. Every one of these must
be regenerated **at the provider**, not just changed locally:

- [ ] Razorpay key + secret (money — do this first)
- [ ] Anthropic API key *(also fixes the "credit balance too low" mock-interview outage if that key was being abused)*
- [ ] OpenAI API key
- [ ] Brevo (email) API key
- [ ] 100ms credentials
- [ ] Meta App Secret (leads webhook)
- [ ] Root password (`passwd`) — even with password auth off, it is used at the console
- [ ] Every key in `/root/.ssh/authorized_keys` you cannot personally account for

Then restart both slots so the new `server/.env` is picked up.

## Step 9 — Restore normal operation

```bash
echo blue > /root/lms/.active-slot
echo "server 127.0.0.1:5001;" > /etc/nginx/active-slot.conf
nginx -t && nginx -s reload
curl -sf https://platform.codebegun.com/api/health && echo " ✅ live"
```

---

## Ongoing checks

Weekly, and after any compose change:

```bash
# Must list ONLY 22, 80, 443.
ss -tlnp | grep -v '127.0.0.1:' | grep -v '\[::1\]:'

# Must show the two lms-harden rules.
iptables -L DOCKER-USER -n --line-numbers
```

Add to cron so a regression surfaces on its own:

```
0 6 * * * /root/lms/scripts/incident-scan.sh > /root/scan-$(date +\%F).txt 2>&1
```

## The rule that prevents a third incident

**Never write a bare `PORT:PORT` mapping in `docker-compose.yml`.** Always
`127.0.0.1:PORT:PORT`. A bare mapping is published to the whole internet *and* bypasses
ufw, and that single line is the entire reason this happened twice. If a service genuinely
needs external reach, it goes behind nginx — never via a published container port.

To reach Mongo or Redis from your laptop, tunnel over SSH instead of republishing:

```bash
ssh -i ~/.ssh/github-ci -L 27017:127.0.0.1:27017 root@<VPS_IP>
# then point Compass at mongodb://admin:<pw>@127.0.0.1:27017/lms-saas?authSource=admin
```

## Honest note on rebuilding

Everything above closes the known holes. It does not *prove* the host is clean — after a
root compromise, a rootkit can hide from exactly the checks in `incident-scan.sh`. Given
this box has now been compromised twice, provisioning a fresh VPS and deploying onto it
with this hardened config is the only way to actually know. The data moves with
`scripts/backup.sh` → `scripts/restore.sh`, so the cost is mostly DNS and an afternoon.
