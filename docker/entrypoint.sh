#!/bin/sh
set -eu

mkdir -p /data
export DATABASE_URL="${DATABASE_URL:-file:/data/dev.db}"

cd /app

npx prisma db push --skip-generate

if [ "${SEED_DATABASE:-false}" = "true" ] && [ ! -f /data/.seeded ]; then
  echo "Seeding database..."
  npx tsx prisma/seed.ts
  touch /data/.seeded
fi

exec npm start
