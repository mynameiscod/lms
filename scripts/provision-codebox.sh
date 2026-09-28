#!/bin/bash
# ============================================================================
# Provision a DEDICATED code-execution host ("codebox") — Piston and nothing else.
#
#   ssh root@<NEW_IP>
#   git clone <repo> /root/lms && cd /root/lms
#   bash scripts/provision-codebox.sh <app-server-ip>
#
#   e.g. bash scripts/provision-codebox.sh 187.124.97.56
#
# WHY THIS BOX EXISTS
#
# Piston runs arbitrary student code as a PRIVILEGED container. On the app server
# that container sits beside student records, the CRM, VoicePilot and MongoDB, so
# a container escape reaches all of it. Here it reaches a machine holding nothing.
# It also stops Java compilations — ~7s of a saturated core each — competing with
# the API for the same CPUs.
#
# ONE RULE, PERMANENTLY: nothing else is ever installed here. No database, no
# application, no credential. The moment something valuable lives on this box the
# entire security argument is gone.
#
# This is deliberately NOT provision-vps.sh: that script builds an application
# server (nginx, TLS, Mongo, Redis, app .env). None of it belongs here.
#
# Idempotent: safe to re-run.
# ============================================================================
set -euo pipefail

RED=$'\033[0;31m'; GRN=$'\033[0;32m'; YEL=$'\033[1;33m'; NC=$'\033[0m'
step() { echo ""; echo "${YEL}==> $*${NC}"; }
ok()   { echo "${GRN}   OK $*${NC}"; }
die()  { echo "${RED}!! $*${NC}" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run as root."

# The ONLY address allowed to reach the execution API. Required: Piston has no
# authentication whatsoever, so whoever can reach port 2000 runs code as root.
APP_SERVER_IP="${1:-${APP_SERVER_IP:-}}"
[ -n "$APP_SERVER_IP" ] || die "App server IP required.
   Usage: bash scripts/provision-codebox.sh <app-server-ip>"
echo "$APP_SERVER_IP" | grep -qE '^[0-9]{1,3}(\.[0-9]{1,3}){3}$' \
  || die "'$APP_SERVER_IP' is not an IPv4 address."

[ -s /root/.ssh/authorized_keys ] || die "/root/.ssh/authorized_keys is empty.
   Install your key first or SSH hardening will lock you out."

# ── Base ────────────────────────────────────────────────────────────────────
step "[1/6] Base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg ufw fail2ban unattended-upgrades >/dev/null
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
systemctl enable --now unattended-upgrades >/dev/null 2>&1 || true
ok "base packages + unattended upgrades"

# ── Docker ──────────────────────────────────────────────────────────────────
step "[2/6] Docker"
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >/dev/null
fi
systemctl enable --now docker
ok "docker $(docker --version | awk '{print $3}' | tr -d ,)"

# Piston's entrypoint requires PURE cgroup v2. Fail here with a clear message
# rather than in a crash loop later.
[ "$(stat -fc %T /sys/fs/cgroup)" = "cgroup2fs" ] \
  || die "This host is not using pure cgroup v2. Piston's entrypoint will refuse to start."
ok "cgroup v2 confirmed"

# ── Firewall — BEFORE anything listens ──────────────────────────────────────
step "[3/6] Firewall"
ufw allow 22/tcp >/dev/null
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw --force enable >/dev/null
ok "ufw active, SSH allowed"

# THE IMPORTANT PART. Docker inserts its own iptables rules AHEAD of ufw, so a
# published container port is reachable from the internet no matter what ufw
# says. DOCKER-USER is the one chain Docker consults first and never rewrites,
# so container access control must live there.
#
# These go in ufw's after.rules and NOT in iptables-persistent. On Ubuntu 24.04,
# `apt-get install iptables-persistent` (1.0.20) REMOVES ufw as a conflicting
# package, and under `-y -qq` it does so silently. On 2026-09-24 that left a box
# with an active ufw *service*, no ufw *binary*, and a firewall surviving only as
# a frozen iptables snapshot that a reboot would have discarded. Never both.
#
# awk, not sed or a string replace: the chain declaration must come BEFORE any -A
# rule in the same table block, and the anchor must be a COMMIT at the START of a
# line. Matching the bare word "COMMIT" hits it inside ufw's own
# "don't delete the 'COMMIT' line" comment and splices the file in half.
AFTER=/etc/ufw/after.rules
if grep -q "CodeBegun: sandbox access control" "$AFTER" 2>/dev/null; then
  ok "sandbox rules already present in after.rules"
else
  awk -v ip="$APP_SERVER_IP" '
    /^\*filter$/ && !d { print; print ":DOCKER-USER - [0:0]"; d=1; next }
    /^COMMIT$/ && !c {
      print "# CodeBegun: sandbox access control. Piston has NO authentication --"
      print "# whoever reaches port 2000 executes code as root on this box."
      print "-A DOCKER-USER -p tcp --dport 2000 -s " ip " -j ACCEPT"
      print "-A DOCKER-USER -p tcp --dport 2000 -j DROP"
      print "-A DOCKER-USER -j RETURN"
      print; c=1; next
    }
    { print }
  ' "$AFTER" > "$AFTER.new" && mv "$AFTER.new" "$AFTER"
  ok "sandbox rules written to after.rules"
fi

ufw --force enable >/dev/null
# Prove it parses now rather than discovering it at the next reboot.
ufw reload >/dev/null 2>&1 || die "ufw could not reload - after.rules is invalid"
iptables -L DOCKER-USER -n | grep -q "dpt:2000" || die "sandbox rules did not apply"
ok "port 2000 restricted to $APP_SERVER_IP (survives reboot)"

# ── SSH hardening ───────────────────────────────────────────────────────────
step "[4/6] SSH hardening (key-only)"
cat > /etc/ssh/sshd_config.d/00-hardening.conf <<'EOF'
PasswordAuthentication no
PermitRootLogin prohibit-password
KbdInteractiveAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
X11Forwarding no
EOF
for f in /etc/ssh/sshd_config /etc/ssh/sshd_config.d/50-cloud-init.conf; do
  [ -f "$f" ] && sed -i -E 's/^[[:space:]]*(PasswordAuthentication|PermitRootLogin)[[:space:]]+yes/# &/I' "$f"
done
sshd -t || die "sshd config invalid — NOT reloading."
systemctl reload ssh 2>/dev/null || systemctl reload sshd
ok "password auth disabled"

# ── Piston ──────────────────────────────────────────────────────────────────
step "[5/6] Piston"
mkdir -p /root/codebox
cp "$(dirname "$0")/codebox-compose.yml" /root/codebox/docker-compose.yml
cd /root/codebox
docker compose config --quiet || die "compose file invalid"
docker compose up -d
sleep 8
docker ps --filter name=codebox-piston --format '{{.Status}}' | grep -q '^Up' \
  || die "piston did not start. docker logs codebox-piston"
ok "piston running"

# ── Runtimes ────────────────────────────────────────────────────────────────
step "[6/6] Language runtimes"
echo "   Versions MUST match the app server exactly, or a student's code can"
echo "   behave differently after the switch."
PISTON_CONTAINER=codebox-piston bash "$(dirname "$0")/piston-init.sh" || true

# The package downloads come from GitHub release assets and DO time out. An
# unhandled ETIMEDOUT crashes Piston outright (observed 2026-09-24), so verify
# the count and re-run rather than trusting a zero exit code.
n=$(curl -s --max-time 10 http://localhost:2000/api/v2/runtimes | grep -o language | wc -l)
echo ""
if [ "$n" -ge 13 ]; then
  ok "$n runtimes installed"
else
  echo "${YEL}   Only $n/13 runtimes installed — a download timed out.${NC}"
  echo "   Re-run this script, or install the missing ones individually:"
  echo "     curl -X POST http://localhost:2000/api/v2/packages \\"
  echo "       -H 'Content-Type: application/json' -d '{\"language\":\"python\",\"version\":\"3.10.0\"}'"
fi

cat <<EOF

${GRN}codebox ready.${NC}

  Verify:      python3 scripts/verify-codebox.py   (run on this host)
  From app:    curl http://$(hostname -I | awk '{print $1}'):2000/api/v2/runtimes
  Point at it: Platform Settings -> Code Execution -> Sandbox URL
                 http://$(hostname -I | awk '{print $1}'):2000/api/v2

  The old sandbox stays running as the rollback. Switching back is the same
  settings field, and takes effect on the next execution.
EOF
