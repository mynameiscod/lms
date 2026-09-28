#!/bin/bash
# ============================================================================
# Install the versioned nginx vhost, showing the drift before overwriting it.
#
#   bash scripts/install-nginx-conf.sh            # diff only, changes nothing
#   bash scripts/install-nginx-conf.sh --apply    # back up, install, test, reload
#
# WHY THIS EXISTS
#
# The live vhost was hand-edited during the 22 September incident and again on
# 24 September, and neither edit came back to the repository. The consequences were
# not cosmetic: the rule that serves /static/ from a directory copied by hand was
# invisible to anyone reading the repo, un-reviewable in a diff, and armed to blank
# the site on the next client-side deploy. A host rebuild could not have restored
# any of it.
#
# So the repo file is the source of truth, and this script is the only way it gets
# onto the box. It refuses to install a config nginx rejects, and it keeps a dated
# backup of whatever it replaced.
#
# IT SHOWS THE DIFF FIRST, ALWAYS. If somebody fixed something live and did not
# commit it, that fix is about to be destroyed — and the diff is the last chance to
# notice. Read it before passing --apply.
# ============================================================================
set -euo pipefail

RED=$'\033[0;31m'; GRN=$'\033[0;32m'; YEL=$'\033[1;33m'; NC=$'\033[0m'

APPLY=false
[ "${1:-}" = "--apply" ] && APPLY=true

SITE="platform.codebegun.com"
SRC="$(cd "$(dirname "$0")/.." && pwd)/nginx/$SITE.conf"
DST="/etc/nginx/sites-available/$SITE"
LINK="/etc/nginx/sites-enabled/$SITE"

[ -f "$SRC" ] || { echo "${RED}Not found: $SRC${NC}" >&2; exit 1; }
[ "$(id -u)" -eq 0 ] || { echo "${RED}Run as root.${NC}" >&2; exit 1; }

echo "Source : $SRC"
echo "Target : $DST"
echo ""

if [ -f "$DST" ]; then
  if diff -u "$DST" "$SRC" > /tmp/nginx-drift.diff 2>&1; then
    echo "${GRN}The live config already matches the repository. Nothing to do.${NC}"
    exit 0
  fi
  echo "${YEL}=== DRIFT: live (-) vs repository (+) ===${NC}"
  cat /tmp/nginx-drift.diff
  echo ""
  echo "${YEL}Anything marked '-' that is not also '+' is about to be REMOVED from the live config.${NC}"
  echo "If one of those lines is a fix somebody made on the box, commit it to $SRC first."
  echo ""
else
  echo "${YEL}No live config at $DST — this will be a fresh install.${NC}"
fi

if [ "$APPLY" != true ]; then
  echo "Dry run. Nothing changed. Re-run with --apply to install."
  exit 0
fi

# ── Back up, then install ───────────────────────────────────────────────────
if [ -f "$DST" ]; then
  BACKUP="$DST.$(date +%Y%m%d-%H%M%S).bak"
  cp -a "$DST" "$BACKUP"
  echo "Backed up live config to $BACKUP"
fi

cp "$SRC" "$DST"
ln -sfn "$DST" "$LINK"

# The active-slot include is deploy state, not configuration, so it may not exist
# on a fresh box. nginx -t fails on a missing include, which would look like a bad
# config rather than a box that has never deployed.
if [ ! -f /etc/nginx/active-slot.conf ]; then
  echo "server 127.0.0.1:5001;" > /etc/nginx/active-slot.conf
  echo "${YEL}Created /etc/nginx/active-slot.conf pointing at the blue slot (5001).${NC}"
  echo "${YEL}The next deploy will set it correctly.${NC}"
fi

mkdir -p /var/www/lms-static/static

# ── Test before reloading. A bad config must not take the site down ─────────
if ! nginx -t; then
  echo "${RED}nginx rejected the config. Restoring the backup and NOT reloading.${NC}" >&2
  if [ -n "${BACKUP:-}" ] && [ -f "$BACKUP" ]; then
    cp -a "$BACKUP" "$DST"
    nginx -t >/dev/null 2>&1 && echo "Backup restored and verified."
  fi
  exit 1
fi

nginx -s reload
echo "${GRN}Installed and reloaded.${NC}"

# ── Say plainly whether the static directory is actually usable ─────────────
if [ -f /var/www/lms-static/index.html ]; then
  echo ""
  echo "Static root: $(find /var/www/lms-static/static -type f 2>/dev/null | wc -l) file(s), " \
       "index.html dated $(date -r /var/www/lms-static/index.html '+%Y-%m-%d %H:%M')"
  echo "It is deploy-image.sh's job to keep that current. It is no longer copied by hand."
else
  echo ""
  echo "${YEL}/var/www/lms-static holds no index.html yet. The next deploy populates it;${NC}"
  echo "${YEL}until then /static/ falls through to the container via try_files.${NC}"
fi
