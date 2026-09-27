#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# VORTEX workspace restore — run after a sandbox reset.
#
# Source code, backend/.env and the PostgreSQL data dir (~/.vortex/pgdata,
# and ~/.vortex/pgbin if the portable PostgreSQL fallback was used) persist
# across resets; node_modules does NOT. This script rebuilds everything
# around the persisted data:
#
#   1. Reinstalls npm dependencies (workspaces) + regenerates Prisma client
#   2. Repairs the persisted PG data dir:
#        - removes stale postmaster.pid
#        - restores 0700 permissions (snapshots reset them)
#        - recreates the always-empty PG system dirs (snapshots drop them)
#   3. Starts PostgreSQL via db-setup.sh (apt if available, else the portable
#      pgserver-wheel binaries — same real PostgreSQL server either way) and
#      verifies app connectivity
#
# Usage:  bash scripts/restore.sh
# Then start the apps:  npm run dev   (from repo root, runs API :4000 + web :5173)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"
BASEDIR="$HOME/.vortex"
DATADIR="$BASEDIR/pgdata"
PORTABLE_DIR="$BASEDIR/pgbin"

echo "── 1/3  npm dependencies + Prisma client"
if [ ! -d "$ROOT/node_modules" ]; then
  npm install --no-audit --no-fund
  echo "   installed"
else
  echo "   already present"
fi
(cd backend && npx prisma generate >/dev/null 2>&1)
echo "   prisma client generated"

echo "── 2/3  Repair PG data dir"
if [ ! -d "$DATADIR" ]; then
  echo "   PG data dir missing — scripts/db-setup.sh will initialize a fresh cluster"
else
  rm -f "$DATADIR/postmaster.pid"                       # stale PID from before the reset
  mkdir -p "$DATADIR"/{pg_commit_ts,pg_dynshmem,pg_notify,pg_replslot,pg_serial,pg_snapshots,pg_stat,pg_stat_tmp,pg_tblspc,pg_twophase}
  mkdir -p "$DATADIR"/pg_wal/{archive_status,summaries} "$DATADIR"/pg_logical/{mappings,snapshots} "$DATADIR"/base/pgsql_tmp
  chmod 700 "$DATADIR" "$DATADIR"/{pg_commit_ts,pg_dynshmem,pg_notify,pg_replslot,pg_serial,pg_snapshots,pg_stat,pg_stat_tmp,pg_tblspc,pg_twophase} 2>/dev/null || true
  echo "   permissions + empty system dirs restored"
fi

echo "── 3/3  Start PostgreSQL"
bash scripts/db-setup.sh

# Resolve whichever binary set db-setup.sh ended up using (apt vs portable).
PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)"
if [ -z "$PGBIN" ] && [ -d "$PORTABLE_DIR/bin" ]; then
  PGBIN="$PORTABLE_DIR/bin"
  export LD_LIBRARY_PATH="$PORTABLE_DIR/lib:$PORTABLE_DIR/vendor-libs${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
fi

"$PGBIN/pg_isready" -h /tmp -p 5433
USERS=$("$PGBIN/psql" -h /tmp -p 5433 -U vortex -d vortex -tAc 'SELECT count(*) FROM "User";' 2>/dev/null || echo "?")
echo "   ✓ database online — $USERS users intact"

echo ""
echo "Restore complete. Start the apps with:  npm run dev"
echo "  • Frontend  http://localhost:5173"
echo "  • API       http://localhost:4000/api/v1/health"
echo ""
echo "Note: if PostgreSQL is running via the portable fallback, export this"
echo "before running backend commands directly (npm run dev already needs it"
echo "only for the DB connection itself, which uses TCP — this is only"
echo "needed if you invoke psql/pg_ctl/etc. manually):"
echo "  export LD_LIBRARY_PATH=$PORTABLE_DIR/lib:$PORTABLE_DIR/vendor-libs"
