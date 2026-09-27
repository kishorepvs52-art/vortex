#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# VORTEX — end-to-end smoke test against a RUNNING backend
# (npm run dev:backend, or `npm run dev`, must already be up).
#
# Exercises the real HTTP API against the real PostgreSQL database:
#   health → register → login → RBAC (401/403) → crop catalogue →
#   image upload + AI analysis → farmer sees result → admin stats
#
# Usage: bash scripts/smoke.sh [API_BASE]   (default http://localhost:4000/api/v1)
# ═══════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")/.."

BASE="${1:-http://localhost:4000/api/v1}"
PASS=0
FAIL=0

check() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  ✓ $desc"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $desc (expected $expected, got $actual)"
    FAIL=$((FAIL + 1))
  fi
}

echo "══ VORTEX smoke test — $BASE ══"

echo "── Health"
HEALTH_CODE=$(curl -s -o /tmp/vortex_smoke_health.json -w "%{http_code}" "$BASE/health")
check "GET /health → 200" "200" "$HEALTH_CODE"
python3 -c "
import json
d = json.load(open('/tmp/vortex_smoke_health.json'))
assert d['data']['database'] == 'connected', 'DB not connected!'
print('  ✓ database: connected — real PostgreSQL')
print(f\"  · AI provider: {d['data']['ai']['provider']} (isMock={d['data']['ai']['isMock']})\")"

echo "── Register a throwaway farmer"
EMAIL="smoke-$(date +%s)@vortex.app"
REG=$(curl -s -X POST "$BASE/auth/register" -H "Content-Type: application/json" -d "{
  \"email\": \"$EMAIL\", \"password\": \"Smoke@12345\", \"fullName\": \"Smoke Tester\", \"role\": \"FARMER\"
}")
TOKEN=$(echo "$REG" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['accessToken'])")
[ -n "$TOKEN" ] && check "POST /auth/register → token issued" "1" "1" || check "POST /auth/register → token issued" "1" "0"

echo "── /auth/me"
ME_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/auth/me" -H "Authorization: Bearer $TOKEN")
check "GET /auth/me → 200" "200" "$ME_CODE"

echo "── RBAC enforcement"
NOAUTH=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/admin/stats")
check "GET /admin/stats (no token) → 401" "401" "$NOAUTH"
FORBIDDEN=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/admin/stats" -H "Authorization: Bearer $TOKEN")
check "GET /admin/stats (farmer token) → 403" "403" "$FORBIDDEN"

echo "── Crop catalogue (real DB)"
CROPS=$(curl -s "$BASE/crops")
CROP_COUNT=$(echo "$CROPS" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['data']))")
[ "$CROP_COUNT" -gt 0 ] && check "GET /crops → non-empty" "1" "1" || check "GET /crops → non-empty" "1" "0"
CROP_ID=$(echo "$CROPS" | python3 -c "import json,sys; print(json.load(sys.stdin)['data'][0]['id'])")

echo "── Generate a synthetic test leaf image + real upload → AI pipeline"
TEST_IMG=/tmp/vortex_smoke_leaf.jpg
node -e "
require('sharp')({
  create: { width: 300, height: 300, channels: 3, background: { r: 90, g: 140, b: 60 } }
}).jpeg().toFile('$TEST_IMG').then(() => process.exit(0));
" --experimental-vm-modules 2>/dev/null || \
node --input-type=module -e "
import sharp from 'sharp';
await sharp({ create: { width: 300, height: 300, channels: 3, background: { r: 90, g: 140, b: 60 } } }).jpeg().toFile('$TEST_IMG');
" 2>/dev/null || (cd backend && node --input-type=module -e "
import sharp from 'sharp';
await sharp({ create: { width: 300, height: 300, channels: 3, background: { r: 90, g: 140, b: 60 } } }).jpeg().toFile('$TEST_IMG');
")

CREATE=$(curl -s -X POST "$BASE/analyses" -H "Authorization: Bearer $TOKEN" \
  -F "image=@$TEST_IMG;type=image/jpeg" \
  -F "cropTypeId=$CROP_ID" \
  -F "symptoms=smoke test synthetic leaf" \
  -F "locationText=Smoke Test City")
ANALYSIS_ID=$(echo "$CREATE" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['id'])")
[ -n "$ANALYSIS_ID" ] && check "POST /analyses → created" "1" "1" || check "POST /analyses → created" "1" "0"

sleep 2
RESULT=$(curl -s "$BASE/analyses/$ANALYSIS_ID" -H "Authorization: Bearer $TOKEN")
STATUS=$(echo "$RESULT" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['status'])")
echo "  · analysis status: $STATUS"
case "$STATUS" in
  AI_COMPLETED|EXPERT_REVIEW_PENDING) check "Analysis reached a terminal AI stage" "1" "1" ;;
  *) check "Analysis reached a terminal AI stage" "1" "0" ;;
esac
IS_MOCK=$(echo "$RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin)['data']; print(d['aiResult']['isMock'] if d.get('aiResult') else '?')")
echo "  · aiResult.isMock = $IS_MOCK (mock results are always labelled, never presented as real AI)"

echo ""
echo "══ $PASS passed, $FAIL failed ══"
rm -f /tmp/vortex_smoke_health.json "$TEST_IMG"
[ "$FAIL" -eq 0 ]
