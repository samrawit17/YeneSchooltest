#!/bin/bash
set -euo pipefail

log() {
  echo "[entrypoint] $1"
}

wait_for_postgres() {
  if [[ -z "${DATABASE_URL:-}" ]]; then
    log "DATABASE_URL is not set; skipping database readiness check."
    return
  fi

  log "Waiting for PostgreSQL to accept connections..."
  node <<'EOF'
const net = require('node:net');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  process.exit(0);
}

const url = new URL(databaseUrl);
const host = url.hostname;
const port = Number(url.port || 5432);
const maxAttempts = 60;
let attempt = 0;

const tryConnect = () => {
  attempt += 1;
  const socket = net.createConnection({ host, port });

  socket.setTimeout(2000);

  socket.once('connect', () => {
    socket.end();
    process.exit(0);
  });

  const retry = () => {
    socket.destroy();
    if (attempt >= maxAttempts) {
      console.error(`PostgreSQL not reachable at ${host}:${port} after ${maxAttempts} attempts.`);
      process.exit(1);
    }
    setTimeout(tryConnect, 2000);
  };

  socket.once('error', retry);
  socket.once('timeout', retry);
};

tryConnect();
EOF
}

bootstrap_database() {
  log "Generating Prisma client for container environment..."
  npx prisma generate --schema=./prisma/schema.prisma

  log "Applying Prisma schema..."
  if npx prisma migrate deploy --schema=./prisma/schema.prisma; then
    log "Prisma migrations applied successfully."
  else
    if [[ "${NODE_ENV:-development}" == "development" ]]; then
      log "Prisma migrate deploy failed. Falling back to prisma db push for development."
      npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss --skip-generate
    else
      log "Prisma migrate deploy failed in non-development mode."
      exit 1
    fi
  fi

  if [[ "${NODE_ENV:-development}" == "development" && "${PRISMA_SKIP_SEED:-0}" != "1" ]]; then
    log "Seeding development database..."
    npm run prisma:seed
  fi
}

wait_for_postgres
bootstrap_database

log "Starting application..."
exec "$@"
