#!/bin/sh
set -e

echo "Aplicando migrations..."
./node_modules/.bin/prisma migrate deploy

if [ "$SEED_ON_START" = "true" ]; then
  echo "Executando seed (ignorado se o banco já tiver dados)..."
  node dist/prisma/seed.js
fi

exec node dist/src/server.js
