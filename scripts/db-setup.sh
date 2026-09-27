#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# VORTEX — idempotent PostgreSQL setup
# Installs PostgreSQL if missing, keeps the cluster data inside
# /home/user/.vortex/pgdata (survives sandbox resets), runs it on
# port 5433, and ensures role `vortex` + database `vortex` exist.
#
# Two ways to obtain real PostgreSQL server binaries:
#   1. apt (preferred — system package, used when network allows it)
#   2. Portable binaries bundled inside the `pgserver` PyPI wheel
#      (same upstream PostgreSQL server compiled for manylinux —
#      used as a fallback in sandboxes without apt/Debian mirror
#      access but with PyPI access). This is still real PostgreSQL,
#      just obtained via a different distribution channel.
#
# Usage: bash scripts/db-setup.sh
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

PGPORT=5433
BASEDIR=/home/user/.vortex
DATADIR=$BASEDIR/pgdata
LOGFILE=$BASEDIR/pg.log
PORTABLE_DIR=$BASEDIR/pgbin

apt_pgbin() { ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1; }
portable_pgbin() { [ -d "$PORTABLE_DIR/bin" ] && echo "$PORTABLE_DIR/bin"; }

PGBIN="$(apt_pgbin || true)"

if [ -z "$PGBIN" ]; then
  PGBIN="$(portable_pgbin || true)"
fi

install_via_apt() {
  echo "[db] Trying PostgreSQL via apt..." >&2
  if sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq 2>/dev/null \
     && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql postgresql-client 2>/dev/null; then
    apt_pgbin
  else
    echo "[db] apt unavailable/unreachable in this environment." >&2
    return 1
  fi
}

install_via_pip_wheel() {
  echo "[db] Falling back to portable PostgreSQL binaries (pgserver wheel from PyPI)..." >&2
  mkdir -p "$BASEDIR/_pgwheel"
  if ! pip download pgserver -d "$BASEDIR/_pgwheel" --no-deps -q >&2; then
    echo "[db] ✗ Could not fetch portable PostgreSQL binaries (no network to PyPI either)." >&2
    return 1
  fi
  local WHEEL
  WHEEL=$(ls "$BASEDIR/_pgwheel"/pgserver-*.whl | head -1)
  mkdir -p "$PORTABLE_DIR.tmp"
  python3 -c "
import zipfile, sys
zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])
" "$WHEEL" "$PORTABLE_DIR.tmp" >&2
  rm -rf "$PORTABLE_DIR"
  mv "$PORTABLE_DIR.tmp/pgserver/pginstall" "$PORTABLE_DIR"
  # auditwheel vendors libpq/libecpg/libpgtypes with hashed filenames in a
  # sibling `pgserver.libs/` dir and patches rpaths to reference it — keep it.
  if [ -d "$PORTABLE_DIR.tmp/pgserver.libs" ]; then
    mv "$PORTABLE_DIR.tmp/pgserver.libs" "$PORTABLE_DIR/vendor-libs"
  fi
  chmod -R +x "$PORTABLE_DIR/bin"
  rm -rf "$PORTABLE_DIR.tmp" "$BASEDIR/_pgwheel"
  echo "[db] ✓ Portable PostgreSQL installed at $PORTABLE_DIR" >&2
  portable_pgbin
}

if [ -z "$PGBIN" ]; then
  PGBIN="$(install_via_apt || true)"
fi
if [ -z "$PGBIN" ]; then
  PGBIN="$(install_via_pip_wheel || true)"
fi
if [ -z "$PGBIN" ]; then
  echo "[db] ✗ Unable to obtain PostgreSQL binaries (no apt mirror, no PyPI access)." >&2
  echo "[db]   Install PostgreSQL manually and re-run this script." >&2
  exit 1
fi
echo "[db] Using PostgreSQL binaries: $PGBIN"

# Portable builds need their bundled libpq/libssl on the loader path.
if [[ "$PGBIN" == "$PORTABLE_DIR/bin" ]]; then
  export LD_LIBRARY_PATH="$PORTABLE_DIR/lib:$PORTABLE_DIR/vendor-libs${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
fi

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
