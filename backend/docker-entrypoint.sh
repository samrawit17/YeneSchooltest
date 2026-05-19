#!/bin/bash
set -euo pipefail

log() {
  echo "[entrypoint] $1"
}

describe_database_target() {
  node <<'EOF'
const databaseUrl = process.env.DATABASE_POOL_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.log('DATABASE_URL is not set');
  process.exit(0);
}

try {
  const parsed = new URL(databaseUrl);
  const dbName = parsed.pathname.replace(/^\//, '') || '<unknown>';
  console.log(`${parsed.hostname}:${parsed.port || 5432}/${dbName}`);
} catch {
  console.log('DATABASE_URL is set but could not be parsed');
}
EOF
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

  if [[ "${PRISMA_SCHEMA_SYNC:-migrate}" == "push" ]]; then
    log "Synchronizing Prisma schema with db push..."
    npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss
  elif [[ "${RUN_MIGRATIONS:-1}" == "1" ]]; then
    log "Applying Prisma migrations..."
    if npx prisma migrate deploy --schema=./prisma/schema.prisma; then
      log "Prisma migrations applied successfully."
    else
      if [[ "${NODE_ENV:-development}" == "development" ]]; then
        log "Prisma migrate deploy failed. Falling back to prisma db push."
        npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss
      else
        log "Prisma migrate deploy failed."
        exit 1
      fi
    fi
  else
    log "Skipping Prisma migrations because RUN_MIGRATIONS is not 1."
  fi

  if [[ "${NODE_ENV:-development}" == "development" && "${PRISMA_SKIP_SEED:-0}" != "1" ]]; then
    log "Seeding development database..."
    npm run prisma:seed
  fi
}

wait_for_postgres
log "Database target: $(describe_database_target)"
log "Expected Docker database for this stack: postgres:5432/lemarisms"
bootstrap_database

log "Starting application..."
exec "$@"
