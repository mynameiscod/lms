# Same VPS, clean disk — OS reinstall runbook

**Chosen path (2026-08-07).** Keep the same VPS and the same IP, but wipe the disk via the
provider's *Reinstall OS* and rebuild from git. This closes the rootkit question that
cleaning in place cannot, while avoiding a new server, a new bill, and a DNS change.

> ## ⛔ The one-way door
>
> **Reinstall OS destroys everything on the disk. There is no undo.** The database, the
> uploads, `/root/lms-backups`, the TLS certs, the SSH host keys — all gone.
>
> Steps 1–3 exist entirely to make step 4 safe. **Do not trigger the reinstall until step 3
> has printed `✅ SAFE TO WIPE`.** A dump you have not opened is a dump you do not have.

## The zero-loss requirement

The stated constraint is **not a single document lost**. That rules out "take a backup and
hope", and it specifically rules out trusting a document *count* — a restore that drops
three rows and adds three others counts equal. So this runbook does three things:

**1. Three independent copies, not one.** Different failure modes, so one bad copy is
survivable:

| Copy | What it is | Covers |
|---|---|---|
| **A** — `mongodump` | logical export (BSON) | the normal restore path |
| **B** — raw volume tar | the physical `/data/db` files | a corrupt or partial dump |
| **C** — provider snapshot | whole-disk image | everything, including anything forgotten |

**2. A per-document fingerprint, not a count.** `scripts/db-fingerprint.sh --deep` hashes
every document in every collection. Taken before the wipe, re-taken after the restore, and
`diff`ed. Verified to detect a single deleted document, and to detect a
delete-plus-insert that leaves counts identical.

**3. A full trial restore before the wipe, not after.** The dump is restored into a
throwaway container and fingerprinted while the original is still alive and comparable —
the only moment the comparison means anything.

> **Relevant history:** `scripts/restore.sh` was, until commit `7666a914`, printing
> "✅ Database restored" while restoring **zero documents** — `mongorestore` needs `--db`,
> and its errors were being discarded. Every archive in `/root/lms-backups` predates that
> fix and should be treated as unverified. This is precisely why nothing below is trusted
> without being opened and counted.

Related: [vps-recovery-hardening.md](./vps-recovery-hardening.md) (what went wrong and why),
[fresh-vps-deploy.md](./fresh-vps-deploy.md) (the new-server variant — steps 3–8 there are
nearly identical to steps 5–9 here).

---

## Step 0 — Snapshot, for evidence and for nerves

In the Hostinger panel, take a snapshot of the **stopped** VPS.

It is not a rollback you would ever want to *use* — restoring it restores the malware
too — but it preserves forensic evidence, and it means a botched extraction is not fatal.
Delete it once the new install has run clean for a week.

## Step 1 — Boot safely and take stock

Boot with Docker disabled, or `restart: unless-stopped` republishes Redis to the internet
before you can log in.

**Recovery/rescue mode:**

```bash
mount /dev/sda1 /mnt && chroot /mnt
systemctl disable docker docker.socket containerd
exit
```

Boot normally, then close the network *before* starting anything:

```bash
cd /root/lms
git fetch origin && git reset --hard origin/master
bash scripts/harden-firewall.sh
```

Now measure what has to move. Resource Library files can be large — nginx allows 1200M
uploads — so find out before you plan the transfer:

```bash
systemctl start docker
docker volume ls
docker run --rm -v lms-saas_uploads_data:/u alpine du -sh /u
du -sh /root/lms-backups 2>/dev/null
crontab -l 2>/dev/null                    # anything scheduled you would miss?
ls /etc/nginx/sites-available/            # should match nginx/ in the repo
```

If uploads run to several GB, budget for the copy in both directions, and consider
pushing that archive to object storage rather than round-tripping via your laptop.

## Step 2 — Extract everything

Start only Mongo, using the hardened compose (localhost-only) with the **old** password —
nothing is being rotated here, we are just reading the existing volume:

```bash
cat > /root/lms/.env <<'EOF'
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=password123
REDIS_PASSWORD=throwaway-extraction-only
JWT_SECRET=throwaway-extraction-only
ENCRYPTION_KEY=throwaway-extraction-only
EOF

cd /root/lms
docker-compose up -d mongodb
sleep 8
```

### 2a. The fingerprint — take this FIRST

Everything later is compared against this file. Take it before anything else touches the
database, and `--deep` because the requirement is *no document lost*:

```bash
cd /root/lms
bash scripts/db-fingerprint.sh --deep | tee /root/FINGERPRINT-BEFORE.txt
tail -2 /root/FINGERPRINT-BEFORE.txt      # note TOTAL_DOCUMENTS — memorise this number
```

The script refuses to emit an empty or truncated fingerprint, so if it prints a file at
all, that file is trustworthy.

### 2b. Copy A — logical dump

```bash
docker exec -e MONGO_ROOT_USERNAME -e MONGO_ROOT_PASSWORD lms-mongodb sh -c \
  'mongodump --uri="mongodb://$MONGO_ROOT_USERNAME:$MONGO_ROOT_PASSWORD@localhost:27017/lms-saas?authSource=admin" --out=/data/dump --gzip'
```

`mongodump` prints a per-collection document count. **Read it** — the totals must match
`FINGERPRINT-BEFORE.txt`. Then package it:

```bash
docker cp lms-mongodb:/data/dump /root/lms-dump
tar -czf /root/lms-dump.tar.gz -C /root lms-dump
```

### 2c. Copy B — raw volume (the independent one)

A physical copy of Mongo's data files. If the logical dump turns out to be flawed, this is
a completely different representation of the same data, produced by a different code path.
**Stop Mongo first** — copying live data files gives you a torn, unusable snapshot:

```bash
docker-compose stop mongodb
docker run --rm -v lms-saas_mongodb_data:/d -v /root:/out alpine \
  tar -czf /out/lms-mongo-volume.tar.gz -C /d .
docker-compose start mongodb          # bring it back for the rest of the steps
ls -lh /root/lms-mongo-volume.tar.gz
```

### 2d. Uploads and reference files

```bash
docker run --rm -v lms-saas_uploads_data:/u -v /root:/out alpine \
  tar -czf /out/lms-uploads.tar.gz -C /u .

# Count the files, so the restore can be checked against a number.
docker run --rm -v lms-saas_uploads_data:/u alpine sh -c 'find /u -type f | wc -l' \
  | tee /root/UPLOADS-FILECOUNT.txt
```

### 2e. Pull everything to your laptop

```bash
scp -i ~/.ssh/github-ci root@187.124.97.56:/root/lms-dump.tar.gz            .
scp -i ~/.ssh/github-ci root@187.124.97.56:/root/lms-mongo-volume.tar.gz    .
scp -i ~/.ssh/github-ci root@187.124.97.56:/root/lms-uploads.tar.gz         .
scp -i ~/.ssh/github-ci root@187.124.97.56:/root/FINGERPRINT-BEFORE.txt     .
scp -i ~/.ssh/github-ci root@187.124.97.56:/root/UPLOADS-FILECOUNT.txt      .
scp -i ~/.ssh/github-ci -r root@187.124.97.56:/root/lms-backups             ./old-backups
```

Verify the transfers arrived intact — a truncated `scp` is silent:

```bash
# On the VPS
md5sum /root/lms-dump.tar.gz /root/lms-mongo-volume.tar.gz /root/lms-uploads.tar.gz
# On the laptop — the three hashes must match exactly
md5sum lms-dump.tar.gz lms-mongo-volume.tar.gz lms-uploads.tar.gz
```

**Then put a second copy somewhere that is not your laptop** — cloud drive, external disk,
anything. Between the wipe and the verified restore, these archives are the only existing
copy of your production database. A laptop failure in that window is total loss.

Also copy the **old `server/.env`** to your laptop — **not to reuse**, but as a checklist of
which integrations were configured, so nothing is forgotten when you re-enter keys:

```bash
scp -i ~/.ssh/github-ci root@187.124.97.56:/root/lms/server/.env ./OLD-env-REFERENCE-DO-NOT-REUSE
```

> **Do not migrate the TLS certificates.** Their private keys sat on a root-compromised
> host, so they are compromised. Step 7 issues fresh ones, and step 9 revokes the old.

## Step 3 — 🚦 Prove the dump is good (the gate)

**This is the step that makes the wipe safe. It is a pass/fail gate, not a look-over.**
Run it on your **laptop**, with Docker Desktop running, while the old VPS is still alive —
if anything fails you can go straight back and re-extract.

### 3a. Restore copy A into a throwaway container

```bash
cd <wherever the archives are>
tar -xzf lms-dump.tar.gz

docker rm -f verify-mongo 2>/dev/null
docker run -d --name verify-mongo mongo:latest
sleep 10

docker cp lms-dump verify-mongo:/data/verify
# --db is REQUIRED. Without it mongorestore skips every file, restores 0
# documents, and still exits 0 — this is the bug that was in restore.sh.
docker exec verify-mongo mongorestore --gzip --drop --db lms-saas /data/verify/lms-saas
```

Read the final line: `N document(s) restored successfully. 0 document(s) failed`. If
anything failed, stop here.

### 3b. Fingerprint it and diff — the actual gate

```bash
CONTAINER=verify-mongo AUTH=none bash /path/to/lms-saas/scripts/db-fingerprint.sh --deep \
  > FINGERPRINT-AFTER.txt

# Normalise the container-name header, then compare everything else.
if diff <(sed 's/container=[^ ]*/container=X/' FINGERPRINT-BEFORE.txt) \
        <(sed 's/container=[^ ]*/container=X/' FINGERPRINT-AFTER.txt); then
  echo "✅ SAFE TO WIPE — every document, in every collection, byte-identical"
else
  echo "❌ DO NOT WIPE — the restore does not match the source"
fi
```

**`✅ SAFE TO WIPE` is the only acceptable output.** Any diff line means a collection lost
documents, gained documents, or had content change. Do not proceed; re-extract instead.

### 3c. Prove the app itself runs on the restored data

Matching bytes is necessary but not sufficient — indexes and app assumptions matter too.
Point a local server at the verified database and log in:

```bash
docker run -d --name verify-app --link verify-mongo:mongodb \
  -e MONGODB_URI="mongodb://mongodb:27017/lms-saas" \
  -e JWT_SECRET=localtest -e ENCRYPTION_KEY=localtest2 \
  -e NODE_ENV=production -p 127.0.0.1:5099:5000 \
  lms-server:latest
sleep 20
curl -sf http://127.0.0.1:5099/api/health && echo " ✅ app boots against the restored data"
docker logs verify-app 2>&1 | grep -iE 'error|failed' | head
```

Open <http://127.0.0.1:5099>, log in as yourself, and confirm a batch, a curriculum and a
CareerPilot member all render. Then clean up:

```bash
docker rm -f verify-app verify-mongo
```

### 3d. Check the uploads archive

```bash
tar -tzf lms-uploads.tar.gz | grep -c .          # compare to UPLOADS-FILECOUNT.txt
tar -tzf lms-uploads.tar.gz | grep -iE '\.(php|sh|jsp|exe|elf|py|pl)$' \
  && echo "⚠️ remove these before restoring" || echo "✅ no executables in uploads"
```

### 3e. Final checklist before the one-way door

Every box must be ticked:

- [ ] `FINGERPRINT-BEFORE.txt` exists and its `TOTAL_DOCUMENTS` looks right
- [ ] `✅ SAFE TO WIPE` printed from 3b
- [ ] The app booted and you logged in against the restored data (3c)
- [ ] Upload file count matches, no executables
- [ ] `md5sum` of all three archives matches between VPS and laptop
- [ ] A **second copy** of the archives exists off the laptop
- [ ] Copy B (`lms-mongo-volume.tar.gz`) is on the laptop too, untouched, as the fallback
- [ ] The provider snapshot from step 0 exists

Only now continue.

**Only when the counts match and the spot-checks look right, continue.**

Store `lms-dump.tar.gz` somewhere off your laptop too (cloud drive). Right now it is the
only copy of your production database.

## Step 4 — Reinstall the OS

Hostinger panel → your VPS → **Reinstall OS** (or *Rebuild*):

- **Ubuntu 24.04 LTS**, clean — no control panel, no preinstalled Docker image
- **Select your SSH key** in the reinstall dialog if the panel offers it. If it only offers
  a root password, that is fine — but add your key and lock password auth down immediately;
  `provision-vps.sh` refuses to run until a key is present, which is the guard for exactly
  this.

Wait for it to finish and the IP to answer again. Your laptop will refuse to connect
because the host key changed — that is expected after a wipe, and correct:

```bash
ssh-keygen -R 187.124.97.56
ssh -i ~/.ssh/github-ci root@187.124.97.56 'echo ok'
```

If the panel gave you a password instead of taking a key:

```bash
ssh-copy-id -i ~/.ssh/github-ci.pub root@187.124.97.56
ssh -i ~/.ssh/github-ci root@187.124.97.56 'echo key-login-works'   # must succeed BEFORE provisioning
```

## Step 5 — Provision

```bash
ssh -i ~/.ssh/github-ci root@187.124.97.56
```

The box has no GitHub credentials now. Generate a key **on the box** and add it as a
read-only deploy key, then revoke the old server's deploy keys in the same GitHub screen —
they belonged to a compromised host:

```bash
ssh-keygen -t ed25519 -N "" -f /root/.ssh/id_ed25519 -C "lms-vps-$(date +%F)"
cat /root/.ssh/id_ed25519.pub     # → GitHub → repo → Settings → Deploy keys → Add

git clone git@github.com:mynameiscod/lms.git /root/lms
cd /root/lms
bash scripts/provision-vps.sh
```

That installs Docker, nginx, certbot, ufw + `DOCKER-USER` rules, fail2ban and
unattended-upgrades; hardens SSH to key-only; generates four fresh secrets into
`/root/lms/.env`; and starts Mongo and Redis bound to localhost.

**Save `/root/lms/.env` into your password manager immediately.** Losing `ENCRYPTION_KEY`
means re-entering every API key by hand.

## Step 6 — Restore the data

```bash
# From your laptop. FINGERPRINT-BEFORE.txt goes back too — it was destroyed with
# the disk, and it is what the final check compares against.
scp -i ~/.ssh/github-ci lms-dump.tar.gz          root@187.124.97.56:/root/
scp -i ~/.ssh/github-ci lms-uploads.tar.gz       root@187.124.97.56:/root/
scp -i ~/.ssh/github-ci FINGERPRINT-BEFORE.txt   root@187.124.97.56:/root/
scp -i ~/.ssh/github-ci UPLOADS-FILECOUNT.txt    root@187.124.97.56:/root/
```

On the VPS:

```bash
cd /root && tar -xzf lms-dump.tar.gz
set -a; . /root/lms/.env; set +a

# `--db lms-saas` is REQUIRED. Pointed at a directory of .bson.gz files without
# it, mongorestore prints "don't know what to do with file ..., skipping" for
# every collection, restores 0 documents, and STILL EXITS 0. Verified.
docker cp /root/lms-dump lms-mongodb:/data/restore
docker exec -e MONGO_ROOT_USERNAME -e MONGO_ROOT_PASSWORD lms-mongodb sh -c \
  'mongorestore --uri="mongodb://$MONGO_ROOT_USERNAME:$MONGO_ROOT_PASSWORD@localhost:27017/?authSource=admin" --drop --gzip --db lms-saas /data/restore/lms-saas'
docker exec lms-mongodb rm -rf /data/restore
```

**The zero-loss proof.** Same fingerprint, same comparison as the pre-wipe gate:

```bash
cd /root/lms
bash scripts/db-fingerprint.sh --deep > /root/FINGERPRINT-RESTORED.txt

if diff <(sed 's/container=[^ ]*/container=X/' /root/FINGERPRINT-BEFORE.txt) \
        <(sed 's/container=[^ ]*/container=X/' /root/FINGERPRINT-RESTORED.txt); then
  echo "✅ ZERO DATA LOSS CONFIRMED — every document matches the pre-wipe original"
else
  echo "❌ MISMATCH — do NOT go live. Restore copy B (lms-mongo-volume.tar.gz) instead."
fi
```

If this mismatches, you still hold copy B and the provider snapshot. Nothing is lost —
stop, and restore the raw volume instead:

```bash
# Fallback: replace the volume contents wholesale with the physical copy.
docker-compose stop mongodb
docker run --rm -v lms-saas_mongodb_data:/d -v /root:/in alpine \
  sh -c 'rm -rf /d/* && tar -xzf /in/lms-mongo-volume.tar.gz -C /d'
docker-compose start mongodb
# NOTE: copy B carries the OLD credentials, so rotate the Mongo password again
# (runbook vps-recovery-hardening.md step 6) before continuing.
```

**Drop the old encrypted API keys.** They were encrypted with the old `ENCRYPTION_KEY`,
they are compromised, and leaving them produces a confusing failure instead of a clean
"unset":

```bash
docker exec -e MONGO_ROOT_USERNAME -e MONGO_ROOT_PASSWORD lms-mongodb sh -c \
  'mongosh --quiet -u "$MONGO_ROOT_USERNAME" -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin lms-saas \
   --eval "print(db.systemsettings.deleteMany({ isSecret: true }).deletedCount + \" encrypted settings removed\")"'
```

Restore uploads:

```bash
docker volume create lms-saas_uploads_data
docker run --rm -v lms-saas_uploads_data:/u -v /root:/in alpine \
  sh -c 'tar -xzf /in/lms-uploads.tar.gz -C /u'

# Same principle as the database: count, do not assume.
RESTORED_FILES=$(docker run --rm -v lms-saas_uploads_data:/u alpine sh -c 'find /u -type f | wc -l')
echo "restored=$RESTORED_FILES expected=$(cat /root/UPLOADS-FILECOUNT.txt)"
[ "$RESTORED_FILES" = "$(tr -dc '0-9' < /root/UPLOADS-FILECOUNT.txt)" ] \
  && echo "✅ every uploaded file accounted for" \
  || echo "❌ upload count mismatch — re-extract before going live"
```

## Step 7 — Ship the image, then TLS

Build on your laptop — the VPS has no build toolchain now, and that is deliberate:

```bash
# Laptop; start Docker Desktop first.
cd d:/Simple_CB_LMS/Codebegun/lms-saas
docker build -t lms-server:latest .

# Guardrail: must list exactly 2 FILES (main.<hash>.js and its .map).
docker run --rm --entrypoint sh lms-server:latest -c "grep -rl 'localhost:5000' client/build/"

docker save lms-server:latest | gzip > lms-server.tar.gz
scp -i ~/.ssh/github-ci lms-server.tar.gz root@187.124.97.56:/tmp/
```

On the VPS:

```bash
gunzip -c /tmp/lms-server.tar.gz | docker load
cd /root/lms
docker tag lms-server:latest lms-server-blue:latest
docker-compose up -d --no-build --no-deps server-blue
curl -sf http://127.0.0.1:5001/api/health && echo " ✅ healthy"
```

DNS already points here — same IP — so issue certificates straight away.
`nginx/platform.codebegun.com.conf` references `/etc/letsencrypt/live/...`, so install it
only *after* the cert exists:

```bash
certbot --nginx -d platform.codebegun.com -d www.platform.codebegun.com \
        --agree-tos -m gsivaprasad2009@gmail.com --redirect
cp /root/lms/nginx/platform.codebegun.com.conf /etc/nginx/sites-available/platform.codebegun.com
nginx -t && systemctl reload nginx
systemctl list-timers | grep -i certbot      # auto-renewal armed
curl -sf https://platform.codebegun.com/api/health && echo " ✅ live"
```

## Step 8 — Rotate every credential, then verify

Root was owned ~15.5h with the database readable, and the settings encryption key had a
public fallback. Regenerate **at the provider** — changing a local value is not rotation:

- [ ] **Razorpay** key + secret (money first)
- [ ] **Anthropic** API key *(also clears up the "credit balance too low" outage if that key was being spent by someone else)*
- [ ] **OpenAI** API key
- [ ] **Brevo** (email) API key
- [ ] **100ms** credentials
- [ ] **Meta** App Secret (leads webhook)
- [ ] **WhatsApp / OTP** provider credentials

Enter them in **Platform Settings in the UI** (they encrypt into Mongo), using
`OLD-env-REFERENCE-DO-NOT-REUSE` only as a checklist of what existed.

Confirm no secret fell back to a default:

```bash
docker exec lms-server-blue printenv JWT_SECRET ENCRYPTION_KEY
# Neither may be 'your-secret-key-change-this' or 'fallback-key-32-chars-minimum!!',
# and they must differ from each other.
docker logs lms-server-blue 2>&1 | grep -i 'could not decrypt' || echo "✅ no decrypt failures"
```

Confirm nothing is exposed:

```bash
ss -tlnp | grep -v '127.0.0.1:' | grep -v '\[::1\]:'   # ONLY 22, 80, 443
iptables -L DOCKER-USER -n                              # the two lms-harden rules
bash scripts/incident-scan.sh
```

From your **laptop**, all three must fail:

```bash
nc -zv -w5 187.124.97.56 6379
nc -zv -w5 187.124.97.56 27017
nc -zv -w5 187.124.97.56 5001
```

Then exercise the app:

- [ ] Log in as a student
- [ ] Practice Lab → **SQL** problem → Submit *(finally settles whether `sqlite3` is installed in Piston — unverified since July)*
- [ ] Practice Lab → **coding** problem → Submit *(confirms Piston works without `privileged: true`; if it fails, the one-line revert is in [vps-recovery-hardening.md](./vps-recovery-hardening.md) step 7)*
- [ ] Resume → Score *(needs the Anthropic/OpenAI key)*
- [ ] CareerPilot ₹499 checkout in Razorpay **test** mode
- [ ] Email send + WhatsApp OTP
- [ ] A blue/green deploy: `./deploy-image.sh` should flip to green cleanly

Audit the restored data — it came out of a database an attacker could write to:

```bash
docker exec -e MONGO_ROOT_USERNAME -e MONGO_ROOT_PASSWORD lms-mongodb sh -c \
 'mongosh --quiet -u "$MONGO_ROOT_USERNAME" -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin lms-saas --eval "
    print(\"— privileged accounts —\");
    db.users.find({ role: { \$in: [\"SUPER_ADMIN\",\"TENANT_ADMIN\"] } },
                  { email:1, role:1, createdAt:1 }).sort({ createdAt:-1 }).forEach(printjson);
    print(\"— accounts created since the first compromise —\");
    print(db.users.countDocuments({ createdAt: { \$gte: new Date(\"2026-07-22\") } }) + \" users\");
    print(\"— paid memberships —\");
    db.payments.find({ purpose: \"passport_membership\", status: \"paid\" },
                     { amount:1, createdAt:1, userId:1 }).sort({ createdAt:-1 }).limit(20).forEach(printjson);
 "'
```

Deactivate anything you do not recognise before announcing that you are back.

## Step 9 — Close out

- [ ] **Revoke the old TLS certificates** — their private keys lived on a compromised host:
      `certbot revoke --cert-name platform.codebegun.com --reason keyCompromise` *(only for
      the OLD cert, if you kept a copy; the freshly issued one stays)*
- [ ] Revoke the old GitHub deploy keys, and any of the 6 old `authorized_keys` entries you
      cannot personally account for
- [ ] Delete the leftover CareerPilot test member `qa.careerpilot.test@codebegun.com`
- [ ] Set up **off-box backups** — a backup that only lives on the server is gone in exactly
      the scenario you need it:
      ```
      0 3 * * * /root/lms/scripts/backup.sh
      0 6 * * * /root/lms/scripts/incident-scan.sh > /root/scan-$(date +\%F).txt 2>&1
      ```
      then sync `/root/lms-backups` somewhere else on a schedule.
- [ ] Delete the step-0 snapshot once the new install has run clean for a week
- [ ] Keep `lms-dump.tar.gz` offline until you are confident

---

## The two rules that prevent a third incident

1. **Never write a bare `PORT:PORT` in `docker-compose.yml`** — always `127.0.0.1:PORT:PORT`.
   A bare mapping publishes to the internet *and* bypasses ufw, and that single line is the
   entire reason this happened twice. Reach Mongo from your laptop with a tunnel:
   ```bash
   ssh -i ~/.ssh/github-ci -L 27017:127.0.0.1:27017 root@187.124.97.56
   ```
2. **Never give a secret a working fallback.** `JWT_SECRET:-your-secret-key-change-this`
   turned a missing env file into a running, publicly-forgeable system instead of a loud
   crash. Compose now uses `${VAR:?message}` throughout for exactly this reason.
