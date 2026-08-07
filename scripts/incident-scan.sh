#!/bin/bash
# ============================================================================
# Compromise scan — run as root ON THE VPS, immediately after boot.
#   bash scripts/incident-scan.sh 2>&1 | tee /root/scan-$(date +%F-%H%M).txt
#
# READ-ONLY. It reports and never deletes, so it is safe to run before you have
# decided anything. Findings are prefixed [!!] (act on this) or [ok].
#
# Tuned for how this box was actually attacked:
#   2026-07-23 — XMRig as /usr/local/bin/systemd + a watchdog that SIGKILLed
#                any >200% CPU process (which is what was breaking deploys).
#   2026-08-07 — stopped again by the host's malware detection.
# The Redis-cron vector is checked explicitly because unauthenticated Redis on
# 0.0.0.0:6379 was left open the whole time between those two dates.
#
# NOTE ON STYLE: every loop below reads via `done < <(...)` rather than
# `... | while read`. A piped while-loop runs in a SUBSHELL, so the FINDINGS
# counter would be lost and the summary would cheerfully report "no indicators"
# after printing a screen of them. Keep it this way.
# ============================================================================
set -uo pipefail

RED=$'\033[0;31m'; GRN=$'\033[0;32m'; YEL=$'\033[1;33m'; NC=$'\033[0m'
FINDINGS=0
hit() { echo "${RED}[!!]${NC} $*"; FINDINGS=$((FINDINGS+1)); }
ok()  { echo "${GRN}[ok]${NC} $*"; }
sec() { echo ""; echo "${YEL}──── $* ────${NC}"; }

echo "════════════════════════════════════════════"
echo "  Compromise scan — $(hostname) — $(date)"
echo "════════════════════════════════════════════"

# ── Known indicators from the July incident ────────────────────────────────
sec "1. Known IOCs (July 2026 XMRig)"
for f in /usr/local/bin/systemd /usr/local/bin/free_proc.sh \
         /etc/systemd/system/systemd.service /etc/systemd/system/observed.service; do
  if [ -e "$f" ]; then hit "IOC present: $f"; else ok "absent: $f"; fi
done

# ── Cron: where a Redis-based attack lands ─────────────────────────────────
sec "2. Cron (the Redis write target)"
# An attacker with unauthenticated Redis does CONFIG SET dir /var/spool/cron,
# so entries here that nobody wrote by hand are the signature of that exact path.
for d in /var/spool/cron /var/spool/cron/crontabs; do
  [ -d "$d" ] || continue
  for c in "$d"/*; do
    [ -e "$c" ] || continue
    echo "  ── $c"
    sed 's/^/     /' "$c"
    if grep -qEi 'curl|wget|base64|/dev/tcp|\.onion|redis|xmr|pool' "$c" 2>/dev/null; then
      hit "Suspicious cron content in $c (download-and-execute pattern)"
    fi
  done
done
while read -r f; do
  [ -n "$f" ] && hit "cron file modified since 2026-07-01: $f"
done < <(find /etc/cron.d /etc/cron.hourly /etc/cron.daily /etc/cron.weekly \
              /etc/cron.monthly -type f -newermt '2026-07-01' 2>/dev/null)
while read -r f; do
  [ -n "$f" ] && hit "Download-and-execute pattern in $f"
done < <(grep -REil 'curl|wget|base64 -d' /etc/cron.d /etc/crontab 2>/dev/null)

# ── systemd persistence ────────────────────────────────────────────────────
sec "3. systemd units changed recently"
while read -r u; do
  [ -n "$u" ] || continue
  hit "unit modified since 2026-07-01: $u"
  grep -HE '^(ExecStart|Description)=' "$u" 2>/dev/null | sed 's/^/       /'
done < <(find /etc/systemd/system /lib/systemd/system /run/systemd/system \
              -name '*.service' -newermt '2026-07-01' 2>/dev/null)

# ── SSH access ─────────────────────────────────────────────────────────────
sec "4. SSH keys and config"
for ak in /root/.ssh/authorized_keys /home/*/.ssh/authorized_keys; do
  [ -f "$ak" ] || continue
  echo "  ── $ak ($(wc -l < "$ak") keys)"
  awk '{print "     " $NF}' "$ak"
  hit "REVIEW BY HAND: every key in $ak — root was owned, a key may have been added"
done
while read -r line; do
  [ -n "$line" ] || continue
  case "$line" in
    "passwordauthentication no"|"permitrootlogin without-password"|\
    "permitrootlogin no"|"pubkeyauthentication yes")
      ok "sshd: $line" ;;
    *) hit "sshd WEAK: $line" ;;
  esac
done < <(sshd -T 2>/dev/null | grep -E '^(permitrootlogin|passwordauthentication|pubkeyauthentication) ')

# ── Preload / profile persistence ──────────────────────────────────────────
sec "5. Loader and shell persistence"
if [ -s /etc/ld.so.preload ]; then
  hit "/etc/ld.so.preload is non-empty (classic rootkit hook)"; cat /etc/ld.so.preload
else ok "ld.so.preload clean"; fi
if [ -s /etc/rc.local ]; then hit "/etc/rc.local exists — inspect it"; else ok "no rc.local"; fi
while read -r f; do
  [ -n "$f" ] && hit "Suspicious shell-init content in $f"
done < <(grep -lEi 'curl|wget|base64 -d|/dev/tcp' /root/.bashrc /root/.profile \
              /etc/profile /etc/profile.d/* 2>/dev/null)
if command -v atq >/dev/null 2>&1; then
  if [ -n "$(atq 2>/dev/null)" ]; then hit "pending at(1) jobs: $(atq)"; else ok "no at jobs"; fi
fi

# ── Running processes ──────────────────────────────────────────────────────
sec "6. Processes"
echo "  Top CPU:"
ps -eo pid,ppid,user,pcpu,pmem,etime,comm --sort=-pcpu 2>/dev/null | head -8 | sed 's/^/     /'
while read -r pid comm; do
  [ -n "$pid" ] && hit "High-CPU process: pid=$pid comm=$comm exe=$(readlink -f "/proc/$pid/exe" 2>/dev/null)"
done < <(ps -eo pid,pcpu,comm --no-headers 2>/dev/null | awk '$2>80 {print $1" "$3}')
# A binary deleted from disk but still running is a near-certain malware sign:
# legitimate services are not unlinked while live.
while read -r l; do
  [ -n "$l" ] && hit "Running process whose binary was DELETED from disk: $l"
done < <(ls -l /proc/*/exe 2>/dev/null | grep -i '(deleted)')
while read -r l; do
  [ -n "$l" ] && hit "Known miner process name: $l"
done < <(pgrep -af 'xmrig|kdevtmpfsi|kinsing|minerd|cpuminer|stratum' 2>/dev/null)

# ── Network ────────────────────────────────────────────────────────────────
sec "7. Network exposure and egress"
echo "  Listening on non-loopback (should be ONLY 22/80/443):"
ss -tlnp 2>/dev/null | awk 'NR==1 || ($4 !~ /^127\.0\.0\.1:/ && $4 !~ /^\[::1\]:/)' | sed 's/^/     /'
for port in 6379 27017 5001 5002 2000; do
  if ss -tln 2>/dev/null | grep -qE "(0\.0\.0\.0|\[::\]):$port"; then
    hit "Port $port is bound to ALL interfaces — must be 127.0.0.1 only"
  else
    ok "port $port not publicly bound"
  fi
done
# Mining pools overwhelmingly use these ports (8029 is the one used in July).
while read -r l; do
  [ -n "$l" ] && hit "Egress to a common mining-pool port: $l"
done < <(ss -tnp 2>/dev/null | awk '$5 ~ /:(3333|4444|5555|7777|8029|14444|45560)$/')

# ── Filesystem ─────────────────────────────────────────────────────────────
sec "8. Executables in world-writable paths"
found_tmp=0
while read -r f; do
  [ -n "$f" ] || continue
  hit "executable in a world-writable dir: $f"; found_tmp=1
done < <(find /tmp /var/tmp /dev/shm -maxdepth 2 -type f -executable 2>/dev/null)
[ "$found_tmp" -eq 0 ] && ok "no executables in /tmp, /var/tmp, /dev/shm"

# ── Package integrity ──────────────────────────────────────────────────────
sec "9. Package integrity"
if command -v debsums >/dev/null 2>&1; then
  n=0
  while read -r l; do
    [ -n "$l" ] || continue
    hit "modified packaged file: $l"; n=$((n+1))
    [ "$n" -ge 20 ] && break
  done < <(debsums -s 2>&1 | grep -v '^debsums:')
  [ "$n" -eq 0 ] && ok "debsums: no modified system binaries"
else
  echo "  debsums not installed — 'apt-get install -y debsums' to verify system binaries."
  echo "  This is how you would catch a trojaned ps/ls/ss that hides the miner from"
  echo "  every other check in this script."
fi

# ── Auth log ───────────────────────────────────────────────────────────────
sec "10. Recent auth activity"
if [ -f /var/log/auth.log ]; then
  fails=$(grep -c 'Failed password' /var/log/auth.log 2>/dev/null || echo 0)
  echo "  Failed password attempts in current auth.log: $fails"
  [ "$fails" -gt 100 ] && hit "$fails failed password attempts — brute force in progress"
  if grep -q 'Accepted password' /var/log/auth.log 2>/dev/null; then
    hit "A PASSWORD login SUCCEEDED — password auth must be disabled entirely"
  else
    ok "no successful password logins (key-only is holding)"
  fi
  echo "  Successful logins (last 15):"
  grep -E 'Accepted (password|publickey)' /var/log/auth.log 2>/dev/null | tail -15 | sed 's/^/     /'
fi
echo "  Recent logins:"; last -n 10 2>/dev/null | sed 's/^/     /'

echo ""
echo "════════════════════════════════════════════"
if [ "$FINDINGS" -eq 0 ]; then
  echo "${GRN}  No indicators found.${NC}"
  echo "  A clean scan is NOT proof the host is clean — a competent rootkit hides"
  echo "  from exactly these checks. After a root compromise, rebuilding onto a"
  echo "  fresh VPS is the only way to actually know."
else
  echo "${RED}  $FINDINGS finding(s) need your attention.${NC}"
  echo "  Do not just delete them — capture first, so the entry point stays visible:"
  echo "    mkdir -p /root/incident-\$(date +%F) && cp -a <file> /root/incident-\$(date +%F)/"
fi
echo "════════════════════════════════════════════"
