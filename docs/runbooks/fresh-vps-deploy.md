# Fresh VPS deploy (rebuild after compromise)

Rebuilding onto a clean host instead of cleaning the old one. The old box was
root-compromised twice, and no scan can disprove a rootkit — this is the only path that
ends with actually knowing the server is clean.

**The governing rule: nothing executable crosses from old to new.** Not the images, not
`server/.env`, not `authorized_keys`, not systemd units, not the Docker volumes. The only
thing that crosses is a **mongodump** (inert BSON) and your **uploads** (inspected first).
Everything else is rebuilt from git and freshly issued credentials.

**And: the old box never initiates a connection to the new one.** Data goes old → laptop →
new. A compromised host given an SSH route to your clean host is how you rebuild twice.

---

## Order

| Step | What | Old box | New box |
|---|---|---|---|
| 1 | Provision + harden | — | ✅ |
| 2 | Extract data | ✅ (briefly) | — |
| 3 | Rotate every credential | — | — |
| 4 | Restore data | — | ✅ |
| 5 | Ship the app image | — | ✅ |
| 6 | DNS + TLS cutover | — | ✅ |
| 7 | Verify + audit | — | ✅ |
| 8 | Decommission | ✅ destroy | — |

---

## Step 1 — Provision the new VPS

Create it with **Ubuntu 24.04 LTS**, and add your SSH key in the provider's panel at create
time so the box never has password login enabled. Keep the old VPS **stopped** throughout.

From your laptop, confirm key login works *before* anything else:

```bash
ssh -i ~/.ssh/github-ci root@<NEW_IP> 'echo ok'
```

Then:

```bash
ssh -i ~/.ssh/github-ci root@<NEW_IP>
git clone https://github.com/<you>/lms-saas.git /root/lms
cd /root/lms
bash scripts/provision-vps.sh
```

> **Private repo?** The new box has no GitHub credentials yet, so the clone fails. Generate
> a key *on the new box* and register it as a **deploy key** (read-only) on the repo — do
> not copy the old server's key across, it is one of the things being retired:
> ```bash
> ssh-keygen -t ed25519 -N "" -f /root/.ssh/id_ed25519 -C "lms-vps-$(date +%F)"
> cat /root/.ssh/id_ed25519.pub   # → GitHub → repo → Settings → Deploy keys → Add
> git clone git@github.com:<you>/lms-saas.git /root/lms
> ```
> Revoke the **old** server's deploy keys in the same screen while you are there.

This installs Docker, nginx, certbot, ufw + `DOCKER-USER` rules, fail2ban and
unattended-upgrades; hardens SSH to key-only (refusing to proceed if no key is installed);
generates four fresh secrets into `/root/lms/.env`; and starts Mongo and Redis bound to
localhost. It ends by asserting that 6379/27017/5001/5002 are not publicly bound.

> **Save `/root/lms/.env` to your password manager now.** Losing `ENCRYPTION_KEY` means
> re-entering every API key in Platform Settings.

## Step 2 — Extract data from the old box

Boot the old VPS **with Docker disabled**, exactly as in
[vps-recovery-hardening.md](./vps-recovery-hardening.md) step 2 — otherwise
`restart: unless-stopped` republishes Redis before you can log in.

```bash
# In recovery/rescue mode:
mount /dev/sda1 /mnt && chroot /mnt
systemctl disable docker docker.socket containerd
exit
```

Boot normally, then close the network before starting anything:

```bash
cd /root/lms
git fetch origin && git reset --hard origin/master   # get the hardened compose
bash scripts/harden-firewall.sh

# Minimal .env so the hardened compose starts. The OLD Mongo password, because
# we are only reading the existing volume — not rotating anything here.
cat > /root/lms/.env <<'EOF'
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=password123
REDIS_PASSWORD=throwaway-not-used-for-the-dump
JWT_SECRET=throwaway-not-used-for-the-dump
ENCRYPTION_KEY=throwaway-not-used-for-the-dump
EOF

systemctl start docker
docker-compose up -d mongodb          # localhost-only now
```

Dump the database and package the uploads:

```bash
docker exec -e MONGO_ROOT_USERNAME=admin -e MONGO_ROOT_PASSWORD=password123 lms-mongodb sh -c \
  'mongodump --uri="mongodb://$MONGO_ROOT_USERNAME:$MONGO_ROOT_PASSWORD@localhost:27017/lms-saas?authSource=admin" --out=/data/dump --gzip'
docker cp lms-mongodb:/data/dump /root/lms-dump
tar -czf /root/lms-dump.tar.gz -C /root lms-dump

docker run --rm -v lms-saas_uploads_data:/u -v /root:/out alpine \
  tar -czf /out/lms-uploads.tar.gz -C /u .
```

Pull both to your **laptop** (laptop initiates; the old box never reaches out):

```bash
scp -i ~/.ssh/github-ci root@<OLD_IP>:/root/lms-dump.tar.gz    .
scp -i ~/.ssh/github-ci root@<OLD_IP>:/root/lms-uploads.tar.gz .
```

Then **power the old VPS off** and leave it off.

> ⚠️ **Inspect the uploads before they go anywhere near the new box.** They are
> attacker-writable user content, and they get served over HTTP:
> ```bash
> tar -tzf lms-uploads.tar.gz | grep -iE '\.(php|sh|jsp|exe|elf|py|pl)$'
> ```
> Anything listed should be deleted from the archive, not migrated.

## Step 3 — Rotate every credential

Root was owned for ~15.5h with the DB reachable, so treat **all** of these as public.
Regenerate at the provider — changing them locally is not rotation:

- [ ] **Razorpay** key + secret (money first)
- [ ] **Anthropic** API key
- [ ] **OpenAI** API key
- [ ] **Brevo** (email) API key
- [ ] **100ms** credentials
- [ ] **Meta** App Secret (leads webhook)
- [ ] **WhatsApp / OTP** provider credentials
- [ ] Any key in the old `authorized_keys` you cannot personally account for

> **Why every one of these, without exception.** Platform Settings encrypts API keys into
> MongoDB with `ENCRYPTION_KEY`, which **fell back to `JWT_SECRET`** when unset — and
> `JWT_SECRET` itself fell back to the literal `your-secret-key-change-this`, a string
> that is public in this repo's git history. If the old compose `.env` was missing or
> lacked `JWT_SECRET`, then every stored API key was encrypted with a publicly known key,
> in a database that was reachable from the internet behind `admin`/`password123`.
> Assume they were read.

These get entered in **Platform Settings in the UI** after the app is up (step 7), not in
`server/.env`.

## Step 4 — Restore the data

Copy the dump from your laptop to the new box:

```bash
scp -i ~/.ssh/github-ci lms-dump.tar.gz    root@<NEW_IP>:/root/
scp -i ~/.ssh/github-ci lms-uploads.tar.gz root@<NEW_IP>:/root/
```

On the new box:

```bash
cd /root && tar -xzf lms-dump.tar.gz
set -a; . /root/lms/.env; set +a

docker cp /root/lms-dump/lms-saas lms-mongodb:/data/restore
docker exec -e MONGO_ROOT_USERNAME -e MONGO_ROOT_PASSWORD lms-mongodb sh -c \
  'mongorestore --uri="mongodb://$MONGO_ROOT_USERNAME:$MONGO_ROOT_PASSWORD@localhost:27017/?authSource=admin" --drop --gzip /data/restore'
docker exec lms-mongodb rm -rf /data/restore
```

**Now drop the old encrypted secrets.** They were encrypted with the old key, they are
compromised, and leaving them causes a confusing failure rather than a clean "unset":

```bash
docker exec -e MONGO_ROOT_USERNAME -e MONGO_ROOT_PASSWORD lms-mongodb sh -c \
  'mongosh --quiet -u "$MONGO_ROOT_USERNAME" -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin lms-saas \
   --eval "print(db.systemsettings.deleteMany({ isSecret: true }).deletedCount + \" encrypted settings removed\")"'
```

Restore uploads (after the inspection in step 2):

```bash
docker volume create lms-saas_uploads_data
docker run --rm -v lms-saas_uploads_data:/u -v /root:/in alpine \
  sh -c 'tar -xzf /in/lms-uploads.tar.gz -C /u'
```

## Step 5 — Ship the app image

Built on your laptop, never on the server — the VPS has no build toolchain now, and that
is intentional.

```bash
# Laptop. Start Docker Desktop first.
cd d:/Simple_CB_LMS/Codebegun/lms-saas
docker build -t lms-server:latest .

# Guardrail: must list exactly 2 FILES (main.<hash>.js and its .map).
docker run --rm --entrypoint sh lms-server:latest -c "grep -rl 'localhost:5000' client/build/"

docker save lms-server:latest | gzip > lms-server.tar.gz
scp -i ~/.ssh/github-ci lms-server.tar.gz root@<NEW_IP>:/tmp/
```

On the new box:

```bash
gunzip -c /tmp/lms-server.tar.gz | docker load
cd /root/lms
docker tag lms-server:latest lms-server-blue:latest
docker-compose up -d --no-build --no-deps server-blue
curl -sf http://127.0.0.1:5001/api/health && echo " ✅ healthy"
```

## Step 6 — DNS + TLS

Only now point the domain at the new box, so users never land on a half-configured host.

1. Update the `A` record for `platform.codebegun.com` → `<NEW_IP>` (drop TTL to 300 an hour
   beforehand if you can, so the cutover is quick).
2. Wait for propagation: `dig +short platform.codebegun.com`
3. Issue the certificate — `nginx/platform.codebegun.com.conf` references
   `/etc/letsencrypt/live/...`, so nginx will not start until the cert exists:

```bash
certbot --nginx -d platform.codebegun.com -d www.platform.codebegun.com \
        --agree-tos -m gsivaprasad2009@gmail.com --redirect
cp /root/lms/nginx/platform.codebegun.com.conf /etc/nginx/sites-available/platform.codebegun.com
nginx -t && systemctl reload nginx
systemctl list-timers | grep -i certbot     # confirm auto-renewal is armed
```

## Step 7 — Verify, then audit

```bash
curl -sf https://platform.codebegun.com/api/health && echo " ✅ live"
```

**Confirm the secrets are real, not fallbacks:**

```bash
docker exec lms-server-blue printenv JWT_SECRET ENCRYPTION_KEY
# Neither may be 'your-secret-key-change-this' or 'fallback-key-32-chars-minimum!!',
# and the two must differ from each other.
docker logs lms-server-blue 2>&1 | grep -i 'could not decrypt' || echo "✅ no decrypt failures"
```

**Re-enter the rotated API keys** in Platform Settings, then exercise each path:

- [ ] Log in as a normal student
- [ ] Practice Lab → a **SQL** problem → Submit *(also finally settles whether `sqlite3` is installed in Piston — unverified since July)*
- [ ] Practice Lab → a **coding** problem → Submit *(confirms Piston works without `privileged: true`; if it fails, see step 7 of the hardening runbook for the one-line revert)*
- [ ] Resume → Score *(needs the Anthropic/OpenAI key)*
- [ ] A ₹499 CareerPilot checkout in Razorpay **test** mode
- [ ] An email send (Brevo) and a WhatsApp OTP

**Audit the restored data for anything the attacker left in it.** The dump came from a
compromised database, so the rows themselves are suspect even though the format is inert:

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

Anything you do not recognise: deactivate it before you announce the migration.

Finally, delete the leftover test member noted in the CareerPilot memory
(`qa.careerpilot.test@codebegun.com`) if it is no longer needed.

## Step 8 — Decommission the old VPS

Once the new box has served real traffic for 24–48h:

1. Keep the provider snapshot from step 1 of the hardening runbook (evidence).
2. Keep `lms-dump.tar.gz` offline as a rollback.
3. **Destroy** the old VPS — do not repurpose it. It has been root-owned twice.
4. Remove its IP from anything that still references it: DNS, monitoring, provider
   firewall rules, and any `known_hosts` entry on your laptop.

---

## Steady state

```bash
# Weekly — and after ANY docker-compose change.
ss -tlnp | grep -v '127.0.0.1:' | grep -v '\[::1\]:'   # must be ONLY 22/80/443
iptables -L DOCKER-USER -n                              # must show the lms-harden rules
bash /root/lms/scripts/incident-scan.sh
```

Cron it so a regression surfaces without you looking:

```
0 6 * * * /root/lms/scripts/incident-scan.sh > /root/scan-$(date +\%F).txt 2>&1
0 3 * * * /root/lms/scripts/backup.sh
```

**Back up off-box.** A backup that lives only on the server is gone in exactly the scenario
you need it.

### The two rules that prevent a third incident

1. **Never write a bare `PORT:PORT` in `docker-compose.yml`** — always `127.0.0.1:PORT:PORT`.
   A bare mapping publishes to the internet *and* bypasses ufw, and that one line is the
   entire reason this happened twice. External reach goes through nginx; laptop access to
   Mongo goes through an SSH tunnel:
   ```bash
   ssh -i ~/.ssh/github-ci -L 27017:127.0.0.1:27017 root@<NEW_IP>
   ```
2. **Never let a secret have a working fallback.** `JWT_SECRET:-your-secret-key-change-this`
   meant a missing env file produced a running, publicly-forgeable system instead of a
   loud failure. Compose now uses `${VAR:?message}` everywhere for exactly this reason.
