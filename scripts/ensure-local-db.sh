#!/usr/bin/env bash
# Prepare a local PostgreSQL database for `npm run dev` (no Cloud SQL required).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

LOCAL_DATABASE_URL='postgresql://channel:channel@localhost:5432/channel_connect?schema=public'

load_env() {
  if [ -f .env ]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
  fi
}

ensure_env_file() {
  if [ ! -f .env ]; then
    echo "==> Creating .env from .env.example"
    cp .env.example .env
    load_env
    return
  fi

  load_env

  if [ -z "${DATABASE_URL:-}" ] || [[ "${DATABASE_URL}" == file:* ]]; then
    echo "==> Updating DATABASE_URL for local PostgreSQL (was SQLite or unset)"
    if grep -q '^DATABASE_URL=' .env; then
      if [[ "$(uname)" == Darwin ]]; then
        sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=\"${LOCAL_DATABASE_URL}\"|" .env
      else
        sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"${LOCAL_DATABASE_URL}\"|" .env
      fi
    else
      printf '\nDATABASE_URL="%s"\n' "$LOCAL_DATABASE_URL" >> .env
    fi
    load_env
  fi
}

db_host() {
  node -e '
    const url = new URL(process.env.DATABASE_URL);
    process.stdout.write(url.hostname);
  '
}

db_port() {
  node -e '
    const url = new URL(process.env.DATABASE_URL);
    process.stdout.write(url.port || "5432");
  '
}

port_open() {
  local host="$1"
  local port="$2"
  node -e "
    const net = require('net');
    const socket = net.connect({ host: '${host}', port: Number('${port}'), timeout: 1500 }, () => {
      socket.end();
      process.exit(0);
    });
    socket.on('error', () => process.exit(1));
    socket.on('timeout', () => { socket.destroy(); process.exit(1); });
  "
}

wait_for_port() {
  local host="$1"
  local port="$2"
  local attempts="${3:-30}"
  local i=1
  while [ "$i" -le "$attempts" ]; do
    if port_open "$host" "$port"; then
      return 0
    fi
    echo "==> Waiting for PostgreSQL at ${host}:${port} (${i}/${attempts})..."
    sleep 2
    i=$((i + 1))
  done
  return 1
}

start_local_postgres() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Error: PostgreSQL is not reachable and Docker is not installed." >&2
    echo "Start Postgres yourself or run: npm run db:up" >&2
    exit 1
  fi

  if ! docker compose version >/dev/null 2>&1; then
    echo "Error: PostgreSQL is not reachable and docker compose is unavailable." >&2
    exit 1
  fi

  echo "==> Starting local Postgres (docker compose)"
  docker compose up -d postgres
}

ensure_env_file

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: DATABASE_URL is not set. Copy .env.example to .env and try again." >&2
  exit 1
fi

if [[ "${DATABASE_URL}" != postgresql://* && "${DATABASE_URL}" != postgres://* ]]; then
  echo "Error: DATABASE_URL must be a PostgreSQL connection string for local development." >&2
  echo "Cloud SQL is only used in GCP deploys. For local preview, use:" >&2
  echo "  ${LOCAL_DATABASE_URL}" >&2
  exit 1
fi

HOST="$(db_host)"
PORT="$(db_port)"

if [ "$HOST" = "localhost" ] || [ "$HOST" = "127.0.0.1" ]; then
  if ! port_open "$HOST" "$PORT"; then
    start_local_postgres
    wait_for_port "$HOST" "$PORT" || {
      echo "Error: PostgreSQL did not become ready at ${HOST}:${PORT}." >&2
      exit 1
    }
  fi
fi

echo "==> Applying Prisma schema"
npx prisma db push --skip-generate >/dev/null

echo "==> Ensuring demo seed data (skipped if database is not empty)"
npm run db:seed --silent

echo "==> Local database ready"
