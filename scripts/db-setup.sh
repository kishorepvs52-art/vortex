#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# VORTEX — idempotent PostgreSQL setup
# Installs PostgreSQL if missing, keeps the cluster data inside
# /home/user/.vortex/pgdata (survives sandbox resets), runs it on
# port 5433, and ensures role `vortex` + database `vortex` exist.
# Usage: bash scripts/db-setup.sh
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

PGPORT=5433
BASEDIR=/home/user/.vortex
DATADIR=$BASEDIR/pgdata
LOGFILE=$BASEDIR/pg.log

pgbin() { ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1; }
PGBIN="$(pgbin || true)"

if [ -z "$PGBIN" ]; then
  echo "[db] PostgreSQL not installed — installing via apt..."
  sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq >/dev/null
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql postgresql-client >/dev/null
  PGBIN="$(pgbin)"
fi
echo "[db] Using PostgreSQL binaries: $PGBIN"

mkdir -p "$BASEDIR"

if [ ! -f "$DATADIR/PG_VERSION" ]; then
  echo "[db] Initializing cluster at $DATADIR ..."
  rm -rf "$DATADIR"
  "$PGBIN/initdb" -D "$DATADIR" -U "$(whoami)" -E UTF8 --auth-local=trust --auth-host=scram-sha-256 >/dev/null
  {
    echo "port = $PGPORT"
    echo "listen_addresses = 'localhost'"
    echo "unix_socket_directories = '/tmp'"
    echo "max_connections = 60"
    echo "shared_buffers = 128MB"
  } >> "$DATADIR/postgresql.conf"
fi

if ! "$PGBIN/pg_isready" -h /tmp -p "$PGPORT" -q 2>/dev/null; then
  echo "[db] Starting PostgreSQL on :$PGPORT ..."
  "$PGBIN/pg_ctl" -D "$DATADIR" -l "$LOGFILE" -w start >/dev/null
fi

# Admin operations run over the local trust socket (no password needed)
PSQL="$PGBIN/psql -h /tmp -p $PGPORT -U $(whoami) -d postgres -tA"
$PSQL -c "SELECT 1 FROM pg_roles WHERE rolname='vortex'" | grep -q 1 || \
  $PSQL -c "CREATE ROLE vortex LOGIN PASSWORD 'vortex_dev';" >/dev/null
$PSQL -c "SELECT 1 FROM pg_database WHERE datname='vortex'" | grep -q 1 || \
  $PSQL -c "CREATE DATABASE vortex OWNER vortex;" >/dev/null

echo "[db] ✓ PostgreSQL ready → postgresql://vortex:vortex_dev@localhost:$PGPORT/vortex"
