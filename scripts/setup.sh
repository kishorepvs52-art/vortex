#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# VORTEX — one-shot project setup
#   1. PostgreSQL cluster up (scripts/db-setup.sh)
#   2. backend/.env created from .env.example with fresh secrets
#   3. npm workspaces install
#   4. prisma generate + migrate + seed
# Usage: bash scripts/setup.sh
# ═══════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")/.."

echo "══ [1/4] Database ══"
bash scripts/db-setup.sh

echo "══ [2/4] Environment ══"
if [ ! -f backend/.env ]; then
  cp .env.example backend/.env
  for KEY in JWT_ACCESS_SECRET JWT_REFRESH_SECRET MEDIA_SIGNING_SECRET; do
    SECRET=$(openssl rand -hex 32)
    sed -i "s|^${KEY}=.*|${KEY}=${SECRET}|" backend/.env
  done
  echo "[setup] ✓ backend/.env generated with fresh random secrets"
else
  echo "[setup] ✓ backend/.env already exists"
fi

echo "══ [3/4] Dependencies ══"
npm install --no-audit --no-fund

echo "══ [4/4] Prisma ══"
npm run prisma:generate --workspace backend
if [ -d backend/prisma/migrations ] && [ -n "$(ls -A backend/prisma/migrations 2>/dev/null)" ]; then
  npm run prisma:deploy --workspace backend
else
  npm run prisma:migrate --workspace backend
fi
npm run seed --workspace backend || echo "[setup] (seed skipped/failed — run 'npm run seed' manually)"

echo ""
echo "✓ VORTEX setup complete. Start with: npm run dev"
