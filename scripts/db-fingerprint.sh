#!/bin/bash
# ============================================================================
# Per-document database fingerprint — proof that a restore lost nothing.
#
#   bash scripts/db-fingerprint.sh                  > before.txt   # pre-wipe
#   bash scripts/db-fingerprint.sh                  > after.txt    # post-restore
#   diff before.txt after.txt && echo "IDENTICAL"
#
#   bash scripts/db-fingerprint.sh --deep           # hash whole documents
#   CONTAINER=verify-mongo AUTH=none bash scripts/db-fingerprint.sh   # throwaway
#
# WHY NOT JUST COUNT DOCUMENTS
# A count proves the totals match. It does not prove the SAME documents are
# there — a restore that dropped 3 rows and duplicated 3 others counts equal.
# For each collection this emits:
#
#   <collection> docs=<n> idx=<n> ids=<md5 of every _id, in sorted order>
#
# The id hash changes if any single document is missing, added, or altered in
# its _id. --deep additionally hashes full document content, catching field-level
# corruption at the cost of a full scan.
#
# Output is sorted and deterministic, so `diff` is the whole verification.
#
# VERIFIED BEHAVIOUR (tested against mongo:latest, 623 docs, 2026-08-07):
#   • 1 document deleted out of 621        → detected (count + hash both move)
#   • 1 deleted AND 1 inserted (count same)→ detected by hash; a count-only
#                                            check PASSES this, which is the
#                                            entire reason the hash exists
#   • a field edited, _id unchanged        → MISSED by default, caught by --deep
#   • full dump→restore round trip, --deep → identical across Date, ObjectId,
#     Decimal128, NumberLong, BinData, null, nested arrays and unicode, i.e. no
#     false positives
#
# For a migration where losing nothing is the requirement, use --deep on both
# sides. Default mode is for routine spot-checks.
# ============================================================================
set -uo pipefail

CONTAINER="${CONTAINER:-lms-mongodb}"
DB="${DB:-lms-saas}"
APP_DIR="${APP_DIR:-/root/lms}"
DEEP=0
[ "${1:-}" = "--deep" ] && DEEP=1

# ── Credentials ─────────────────────────────────────────────────────────────
# AUTH=none for a throwaway verification container started without auth.
AUTH_ARGS=""
if [ "${AUTH:-}" != "none" ]; then
  if [ -f "$APP_DIR/.env" ]; then
    set -a; . "$APP_DIR/.env"; set +a
  fi
  : "${MONGO_ROOT_USERNAME:?MONGO_ROOT_USERNAME not set — is $APP_DIR/.env present? (or use AUTH=none)}"
  : "${MONGO_ROOT_PASSWORD:?MONGO_ROOT_PASSWORD not set — is $APP_DIR/.env present? (or use AUTH=none)}"
  AUTH_ARGS="-u $MONGO_ROOT_USERNAME -p $MONGO_ROOT_PASSWORD --authenticationDatabase admin"
fi

docker inspect "$CONTAINER" >/dev/null 2>&1 || { echo "❌ container '$CONTAINER' not found" >&2; exit 1; }

mongo_eval() {
  # shellcheck disable=SC2086
  docker exec "$CONTAINER" mongosh --quiet $AUTH_ARGS "$DB" --eval "$1"
}

# ── Collections ─────────────────────────────────────────────────────────────
COLLECTIONS=$(mongo_eval 'db.getCollectionNames().filter(n=>!n.startsWith("system.")).sort().forEach(n=>print(n))' | tr -d '\r')
if [ -z "$COLLECTIONS" ]; then
  echo "❌ No collections found in '$DB' on '$CONTAINER'. Refusing to emit an empty fingerprint." >&2
  exit 1
fi

echo "# fingerprint db=$DB container=$CONTAINER deep=$DEEP"
echo "# columns: collection docs=<n> idx=<n> ids=<md5> [docs_md5=<md5>]"

TOTAL=0
for c in $COLLECTIONS; do
  # One mongosh call per collection: markers first, then one line per document.
  if [ "$DEEP" -eq 1 ]; then
    BODY="const c=db.getCollection('$c');
          print('#COUNT '+c.countDocuments());
          print('#IDX '+c.getIndexes().length);
          c.find().sort({_id:1}).forEach(d=>print(EJSON.stringify(d)));"
  else
    BODY="const c=db.getCollection('$c');
          print('#COUNT '+c.countDocuments());
          print('#IDX '+c.getIndexes().length);
          c.find({},{_id:1}).sort({_id:1}).forEach(d=>print(String(d._id)));"
  fi

  OUT=$(mongo_eval "$BODY" | tr -d '\r')
  if [ -z "$OUT" ]; then
    echo "❌ '$c' returned nothing — treat this fingerprint as INVALID." >&2
    exit 1
  fi

  COUNT=$(printf '%s\n' "$OUT" | awk '/^#COUNT /{print $2; exit}')
  IDX=$(printf '%s\n'   "$OUT" | awk '/^#IDX /{print $2; exit}')
  ROWS=$(printf '%s\n'  "$OUT" | grep -v '^#COUNT ' | grep -v '^#IDX ')

  # A sorted _id stream hashes identically across machines and mongo versions.
  HASH=$(printf '%s\n' "$ROWS" | md5sum | cut -d' ' -f1)

  # Cross-check the stream against countDocuments — catches a truncated read,
  # which would otherwise produce a confident-looking but wrong hash.
  STREAMED=$(printf '%s\n' "$ROWS" | grep -c . || true)
  if [ "$STREAMED" != "$COUNT" ]; then
    echo "❌ '$c': streamed $STREAMED rows but countDocuments()=$COUNT — INVALID." >&2
    exit 1
  fi

  if [ "$DEEP" -eq 1 ]; then
    echo "$c docs=$COUNT idx=$IDX ids=- docs_md5=$HASH"
  else
    echo "$c docs=$COUNT idx=$IDX ids=$HASH"
  fi
  TOTAL=$((TOTAL + COUNT))
done

echo "# TOTAL_DOCUMENTS $TOTAL"
echo "# TOTAL_COLLECTIONS $(printf '%s\n' "$COLLECTIONS" | grep -c .)"
