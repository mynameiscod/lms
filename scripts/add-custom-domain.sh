#!/bin/bash
# ============================================================================
# Serve an institute on its own domain (e.g. lms.college.edu).
#
#   sudo bash /root/lms/scripts/add-custom-domain.sh lms.college.edu [admin-email]
#
# Before running:
#   1. The college has pointed DNS at this server (CNAME to platform.codebegun.com,
#      or an A record to this server's IP).
#   2. The platform administrator set the domain in Tenant Management and
#      "Check DNS" passed. Until it passes the app does not treat the domain as
#      the institute's, so running this early is harmless but pointless.
#
# What it does:
#   - writes /etc/nginx/sites-available/custom-<domain> (+ sites-enabled link) from nginx/custom-domain.conf.template
#     (the same locations as platform.codebegun.com: static bundle, sockets, uploads,
#      kill switch), proxied to the SAME active blue/green slot;
#   - gets a Let's Encrypt certificate for the domain with certbot, which adds the
#     443 block and the http→https redirect;
#   - tests nginx before every reload, and removes its file again if the test fails.
#
# Re-running for the same domain is safe (it rewrites the file, certbot renews/keeps).
# To remove a domain: delete both files (sites-available + sites-enabled), reload nginx,
# then `certbot delete --cert-name <domain>`.
# ============================================================================
set -euo pipefail

DOMAIN="$(echo "${1:-}" | tr 'A-Z' 'a-z' | sed -E 's#^https?://##; s#/.*$##')"
EMAIL="${2:-admin@codebegun.com}"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE="$REPO_DIR/nginx/custom-domain.conf.template"
TARGET="/etc/nginx/sites-available/custom-${DOMAIN}"
LINK="/etc/nginx/sites-enabled/custom-${DOMAIN}"   # same layout as platform.codebegun.com (install-nginx-conf.sh)

if [[ ! "$DOMAIN" =~ ^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$ ]]; then
  echo "Usage: $0 <domain> [admin-email]   e.g. $0 lms.college.edu" >&2
  exit 1
fi
if [[ "$DOMAIN" == *codebegun.com ]]; then
  echo "That is a platform domain — use the institute's own domain." >&2
  exit 1
fi
[ -f "$TEMPLATE" ] || { echo "Template not found: $TEMPLATE" >&2; exit 1; }
command -v certbot >/dev/null || { echo "certbot is not installed (apt install certbot python3-certbot-nginx)." >&2; exit 1; }

echo "==> DNS for $DOMAIN"
getent ahosts "$DOMAIN" | awk '{print "    " $1}' | sort -u || echo "    (no DNS answer yet)"

echo "==> Writing $TARGET"
sed "s/__DOMAIN__/${DOMAIN}/g" "$TEMPLATE" > "$TARGET"
ln -sf "$TARGET" "$LINK"
if ! nginx -t; then
  echo "nginx rejected the new file — removing it." >&2
  rm -f "$LINK" "$TARGET"
  exit 1
fi
systemctl reload nginx

echo "==> Certificate"
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect

nginx -t && systemctl reload nginx
echo
echo "✅ https://${DOMAIN} now serves the institute. Open it and check the login page shows its logo."
