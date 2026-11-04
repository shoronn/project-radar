#!/bin/sh
# Runs as the unprivileged "app" user (see Dockerfile USER).
# 1. checks the data volume is writable  2. migrates the schema + seeds the admin  3. starts gunicorn
set -e

DATA_DIR="${DATA_DIR:-/data}"

if ! mkdir -p "$DATA_DIR" 2>/dev/null || ! touch "$DATA_DIR/.write-test" 2>/dev/null; then
  echo "[entrypoint] ERROR: $DATA_DIR is not writable by uid $(id -u)." >&2
  echo "[entrypoint] Use a Docker *volume* mount for $DATA_DIR (Coolify: Persistent Storage > Volume Mount)," >&2
  echo "[entrypoint] or, for a bind mount, run on the host: chown -R 10001:10001 <host-path>" >&2
  exit 1
fi
rm -f "$DATA_DIR/.write-test"

python "$(dirname "$0")/bootstrap.py"
exec "$@"
