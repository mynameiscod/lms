# Same VPS, clean disk — OS reinstall runbook

**Chosen path (2026-08-07).** Keep the same VPS and the same IP, but wipe the disk via the
provider's *Reinstall OS* and rebuild from git. This closes the rootkit question that
cleaning in place cannot, while avoiding a new server, a new bill, and a DNS change.

> ## ⛔ The one-way door
>
> **Reinstall OS destroys everything on the disk. There is no undo.** The database, the
> uploads, `/root/lms-backups`, the TLS certs, the SSH host keys — all gone.
>
> Steps 1–3 exist entirely to make step 4 safe. **Do not trigger the reinstall until
> step 3 has actually restored your dump into a throwaway container and printed real
> document counts.** A dump you have not opened is a dump you do not have.

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

Dump the database:

```bash
docker exec -e MONGO_ROOT_USERNAME=admin -e MONGO_ROOT_PASSWORD=password123 lms-mongodb sh -c \
  'mongodump --uri="mongodb://$MONGO_ROOT_USERNAME:$MONGO_ROOT_PASSWORD@localhost:27017/lms-saas?authSource=admin" --out=/data/dump --gzip'

# Record the true collection counts NOW, to compare against after the restore.
docker exec -e MONGO_ROOT_USERNAME=admin -e MONGO_ROOT_PASSWORD=password123 lms-mongodb sh -c \
 'mongosh --quiet -u "$MONGO_ROOT_USERNAME" -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin lms-saas --eval "
    db.getCollectionNames().sort().forEach(c => print(c + \" \" + db[c].countDocuments()))
 "' | tee /root/PRE-WIPE-COUNTS.txt

docker cp lms-mongodb:/data/dump /root/lms-dump
tar -czf /root/lms-dump.tar.gz -C /root lms-dump
```

Package the uploads:

```bash
docker run --rm -v lms-saas_uploads_data:/u -v /root:/out alpine \
  tar -czf /out/lms-uploads.tar.gz -C /u .
```

Pull everything to your laptop:

```bash
scp -i ~/.ssh/github-ci root@187.124.97.56:/root/lms-dump.tar.gz      .
scp -i ~/.ssh/github-ci root@187.124.97.56:/root/lms-uploads.tar.gz   .
scp -i ~/.ssh/github-ci root@187.124.97.56:/root/PRE-WIPE-COUNTS.txt  .
scp -i ~/.ssh/github-ci -r root@187.124.97.56:/root/lms-backups       ./old-backups
```

Also copy the **old `server/.env`** to your laptop — **not to reuse**, but as a checklist of
which integrations were configured, so nothing is forgotten when you re-enter keys:

```bash
scp -i ~/.ssh/github-ci root@187.124.97.56:/root/lms/server/.env ./OLD-env-REFERENCE-DO-NOT-REUSE
```

> **Do not migrate the TLS certificates.** Their private keys sat on a root-compromised
> host, so they are compromised. Step 7 issues fresh ones, and step 9 revokes the old.

## Step 3 — 🚦 Prove the dump is good (the gate)

**This is the step that makes the wipe safe. Do not skip it.** On your **laptop**, with
Docker Desktop running:

```bash
tar -xzf lms-dump.tar.gz

docker run -d --name verify-mongo -p 127.0.0.1:27099:27017 mongo:latest
sleep 8
docker cp lms-dump/lms-saas verify-mongo:/data/verify
# --db is required; without it mongorestore skips every file and still exits 0.
docker exec verify-mongo mongorestore --gzip --drop --db lms-saas /data/verify

docker exec verify-mongo mongosh --quiet lms-saas --eval '
  db.getCollectionNames().sort().forEach(c => print(c + " " + db[c].countDocuments()))
' | tee RESTORED-COUNTS.txt
```

Compare against what you recorded before:

```bash
diff PRE-WIPE-COUNTS.txt RESTORED-COUNTS.txt && echo "✅ counts match — safe to wipe"
```

Sanity-check the things you would most hate to lose:

```bash
docker exec verify-mongo mongosh --quiet lms-saas --eval '
  print("users:        " + db.users.countDocuments());
  print("tenants:      " + db.tenants.countDocuments());
  print("curriculums:  " + db.learningcurriculums.countDocuments());
  print("passport atts:" + db.passportattempts.countDocuments());
  print("payments:     " + db.payments.countDocuments());
  printjson(db.users.findOne({ email: "gsivaprasad2009@gmail.com" }, { email:1, role:1 }));
'
docker rm -f verify-mongo
```

Also confirm the uploads archive is intact and free of anything executable:

```bash
tar -tzf lms-uploads.tar.gz | wc -l
tar -tzf lms-uploads.tar.gz | grep -iE '\.(php|sh|jsp|exe|elf|py|pl)$' \
  && echo "⚠️ remove these before restoring" || echo "✅ no executables in uploads"
```

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
# From your laptop. PRE-WIPE-COUNTS.txt goes back too — it was destroyed with the
# disk, and the restore check below compares against it.
scp -i ~/.ssh/github-ci lms-dump.tar.gz      root@187.124.97.56:/root/
scp -i ~/.ssh/github-ci lms-uploads.tar.gz   root@187.124.97.56:/root/
scp -i ~/.ssh/github-ci PRE-WIPE-COUNTS.txt  root@187.124.97.56:/root/
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

# Confirm the restore landed in the right database, with the right counts.
docker exec -e MONGO_ROOT_USERNAME -e MONGO_ROOT_PASSWORD lms-mongodb sh -c \
 'mongosh --quiet -u "$MONGO_ROOT_USERNAME" -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin lms-saas --eval "
    db.getCollectionNames().sort().forEach(c => print(c + \" \" + db[c].countDocuments()))
 "' > /root/POST-RESTORE-COUNTS.txt
diff /root/POST-RESTORE-COUNTS.txt <(cat /root/PRE-WIPE-COUNTS.txt 2>/dev/null) \
  && echo "✅ counts match the pre-wipe snapshot"
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
