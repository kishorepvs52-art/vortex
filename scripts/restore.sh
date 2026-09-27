#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# VORTEX workspace restore — run after a sandbox reset.
#
# Source code, backend/.env and the PostgreSQL data dir (~/.vortex/pgdata)
# persist across resets; installed binaries and node_modules do NOT.
# This script rebuilds everything around the persisted data:
#
#   1. Reinstalls PostgreSQL 17 server binaries (apt)
#   2. Reinstalls npm dependencies (workspaces) + regenerates Prisma client
#   3. Repairs the persisted PG data dir:
#        - removes stale postmaster.pid
#        - restores 0700 permissions (snapshots reset them)
#        - recreates the always-empty PG system dirs (snapshots drop them)
#   4. Starts PostgreSQL via db-setup.sh and verifies app connectivity
#
# Usage:  bash scripts/restore.sh
# Then start the apps:  npm run dev   (from repo root, runs API :4000 + web :5173)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"
DATADIR="$HOME/.vortex/pgdata"

echo "── 1/4  PostgreSQL binaries"
if [ ! -x /usr/lib/postgresql/17/bin/pg_ctl ]; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq postgresql-17 >/dev/null
  echo "   installed"
else
  echo "   already present"
fi

echo "── 2/4  npm dependencies + Prisma client"
if [ ! -d "$ROOT/node_modules" ]; then
  npm install --no-audit --no-fund >/dev/null
  echo "   installed"
else
  echo "   already present"
fi
(cd backend && npx prisma generate >/dev/null 2>&1)
echo "   prisma client generated"

echo "── 3/4  Repair PG data dir"
if [ ! -d "$DATADIR" ]; then
  echo "   ✗ $DATADIR missing — run 'bash scripts/db-setup.sh --fresh' to init+seed a new cluster" >&2
  exit 1
fi
rm -f "$DATADIR/postmaster.pid"                       # stale PID from before the reset
mkdir -p "$DATADIR"/{pg_commit_ts,pg_dynshmem,pg_notify,pg_replslot,pg_serial,pg_snapshots,pg_stat,pg_stat_tmp,pg_tblspc,pg_twophase}
mkdir -p "$DATADIR"/pg_wal/{archive_status,summaries} "$DATADIR"/pg_logical/{mappings,snapshots} "$DATADIR"/base/pgsql_tmp
chmod 700 "$DATADIR" "$DATADIR"/{pg_commit_ts,pg_dynshmem,pg_notify,pg_replslot,pg_serial,pg_snapshots,pg_stat,pg_stat_tmp,pg_tblspc,pg_twophase}
echo "   permissions + empty system dirs restored"

echo "── 4/4  Start PostgreSQL"
bash scripts/db-setup.sh >/dev/null 2>&1 || bash scripts/db-setup.sh
pg_isready -h /tmp -p 5433
USERS=$(psql -h /tmp -p 5433 -U vortex -d vortex -tAc 'SELECT count(*) FROM "User";')
echo "   ✓ database online — $USERS users intact"

echo ""
echo "Restore complete. Start the apps with:  npm run dev"
echo "  • Frontend  http://localhost:5173"
echo "  • API       http://localhost:4000/api/v1/health"
