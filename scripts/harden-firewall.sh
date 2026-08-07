#!/bin/bash
# ============================================================================
# VPS firewall hardening — run as root ON THE VPS.
#   bash scripts/harden-firewall.sh
#
# WHY THIS EXISTS
# Docker publishes ports by writing DNAT rules into the nat table and filter
# rules into the DOCKER chain. Both are traversed BEFORE the INPUT chain that
# ufw manages, so `ufw deny 6379` does not close a Docker-published port — the
# packet never reaches INPUT. This is exactly how an "already firewalled" box
# ends up with world-readable Redis, which is how this server was mined twice.
#
# Docker deliberately leaves the DOCKER-USER chain alone across restarts, so
# that is where rules must go. This script is idempotent: it flushes its own
# rules before re-adding, so running it twice is safe.
# ============================================================================
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "❌ Run as root." >&2
  exit 1
fi

# Detect the public-facing interface from the default route rather than
# assuming eth0 (Hostinger images have used ens3/enp1s0).
EXT_IF="${EXT_IF:-$(ip route show default | awk '/default/ {print $5; exit}')}"
if [ -z "$EXT_IF" ]; then
  echo "❌ Could not detect the external interface. Set EXT_IF=<iface> and rerun." >&2
  exit 1
fi

echo "==> External interface: $EXT_IF"

# ── 1. Host firewall (ufw) — covers processes on the host, not containers ────
echo "==> [1/4] Configuring ufw for host services..."
if ! command -v ufw >/dev/null 2>&1; then
  apt-get update -qq && apt-get install -y -qq ufw
fi
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   comment 'SSH (key-only)'
ufw allow 80/tcp   comment 'HTTP - nginx redirect'
ufw allow 443/tcp  comment 'HTTPS - nginx'
ufw --force enable
echo "   ✅ ufw: only 22/80/443 inbound"

# ── 2. DOCKER-USER — the layer ufw genuinely cannot reach ───────────────────
# nginx runs on the HOST and proxies to 127.0.0.1:500x, so no container needs
# to be reachable from the internet at all. A blanket drop is therefore both
# correct and the strongest option: it holds even if someone later re-adds a
# "6379:6379" mapping by accident.
echo "==> [2/4] Installing DOCKER-USER rules (v4 + v6)..."
for IPT in iptables ip6tables; do
  command -v "$IPT" >/dev/null 2>&1 || continue

  # Create the chain if Docker has not yet (fresh boot, docker not started).
  $IPT -N DOCKER-USER 2>/dev/null || true

  # Remove only OUR rules so reruns don't stack duplicates.
  while $IPT -D DOCKER-USER -m comment --comment "lms-harden" -j RETURN 2>/dev/null; do :; done
  while $IPT -D DOCKER-USER -m comment --comment "lms-harden" -j DROP   2>/dev/null; do :; done

  # Return traffic for connections the containers themselves opened (npm,
  # Anthropic API, Brevo, Razorpay) must survive — insert this FIRST.
  $IPT -I DOCKER-USER 1 -m conntrack --ctstate RELATED,ESTABLISHED \
       -m comment --comment "lms-harden" -j RETURN

  # Anything arriving from the internet addressed to a container: drop.
  $IPT -A DOCKER-USER -i "$EXT_IF" \
       -m comment --comment "lms-harden" -j DROP
done
echo "   ✅ Internet → container traffic dropped (both IPv4 and IPv6)"

# ── 3. Persist across reboot ────────────────────────────────────────────────
echo "==> [3/4] Persisting rules..."
if ! command -v netfilter-persistent >/dev/null 2>&1; then
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq iptables-persistent
fi
netfilter-persistent save >/dev/null
echo "   ✅ Saved via netfilter-persistent"

# ── 4. fail2ban for SSH ────────────────────────────────────────────────────
# Key-only auth already blocks the original brute force, but fail2ban stops the
# noise and catches a future config regression before it is exploited.
echo "==> [4/4] Installing fail2ban..."
if ! command -v fail2ban-server >/dev/null 2>&1; then
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq fail2ban
fi
cat > /etc/fail2ban/jail.d/sshd.local <<'EOF'
[sshd]
enabled  = true
maxretry = 4
findtime = 10m
bantime  = 24h
EOF
systemctl enable --now fail2ban >/dev/null 2>&1 || true
systemctl restart fail2ban || true
echo "   ✅ fail2ban active on sshd"

echo ""
echo "==> Verification"
echo "--- listening sockets reachable from outside (should be ONLY 22/80/443) ---"
ss -tlnp | awk 'NR==1 || ($4 !~ /^127\.0\.0\.1:/ && $4 !~ /^\[::1\]:/)'
echo ""
echo "--- DOCKER-USER chain ---"
iptables -L DOCKER-USER -n --line-numbers
echo ""
echo "✅ Firewall hardening complete."
echo "   From your LAPTOP, confirm these all time out or refuse:"
echo "     nc -zv -w5 <VPS_IP> 6379   # Redis"
echo "     nc -zv -w5 <VPS_IP> 27017  # Mongo"
echo "     nc -zv -w5 <VPS_IP> 5001   # app, direct (must go via nginx)"
