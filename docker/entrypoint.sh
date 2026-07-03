#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: DATABASE_URL is required (PostgreSQL connection string)." >&2
  exit 1
fi

cd /app

echo "Waiting for database and applying schema..."
i=1
while [ "$i" -le 30 ]; do
  if npx prisma db push --skip-generate; then
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "Error: database not ready after 30 attempts." >&2
    exit 1
  fi
  echo "Database not ready, retrying ($i/30)..."
  i=$((i + 1))
  sleep 5
done

if [ "${SEED_DATABASE:-false}" = "true" ]; then
  echo "Seeding database (skipped if data already exists)..."
  npx tsx prisma/seed.ts
fi

exec npm start
