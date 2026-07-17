# ===========================================
# DEVELOPMENT BUILD
# ===========================================

FROM node:20-slim AS development

ARG DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ENV DATABASE_URL=${DATABASE_URL}
ENV NPM_CONFIG_FETCH_RETRIES=5
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000
ENV NPM_CONFIG_FETCH_TIMEOUT=300000

WORKDIR /app

# Network: Debian mirrors blocked on this network (Fastly CDN 403)
# Fail fast with 10s timeout so build doesn't hang
RUN timeout 10 sh -c 'apt-get update -y 2>/dev/null && apt-get install -y --no-install-recommends openssl ca-certificates postgresql-client 2>/dev/null && rm -rf /var/lib/apt/lists/*' || \
    echo "[WARN] Skipped apt (network blocked). Using pre-installed packages from base image."

COPY package*.json ./

RUN npm install --legacy-peer-deps --prefer-offline --no-audit --loglevel=error

COPY . .

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 8001 9229

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["npm", "start"]

# ===========================================
# PRODUCTION BUILD
# ===========================================

FROM node:20-slim AS builder

ARG DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ENV DATABASE_URL=${DATABASE_URL}
ENV NPM_CONFIG_FETCH_RETRIES=5
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000
ENV NPM_CONFIG_FETCH_TIMEOUT=300000

WORKDIR /app

# Network: Debian mirrors blocked on this network (Fastly CDN 403)
# Fail fast with 10s timeout so build doesn't hang
RUN timeout 10 sh -c 'apt-get update -y 2>/dev/null && apt-get install -y --no-install-recommends openssl ca-certificates postgresql-client 2>/dev/null && rm -rf /var/lib/apt/lists/*' || \
    echo "[WARN] Skipped apt (network blocked). Using pre-installed packages from base image."

COPY package*.json ./

RUN npm ci --legacy-peer-deps --prefer-offline --no-audit --loglevel=error --ignore-scripts

COPY . .

RUN npm run build

# Production runtime
FROM node:20-slim AS production

ARG DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ENV DATABASE_URL=${DATABASE_URL}
ENV NPM_CONFIG_FETCH_RETRIES=5
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000
ENV NPM_CONFIG_FETCH_TIMEOUT=300000

WORKDIR /app

# Network: Debian mirrors blocked on this network (Fastly CDN 403)
# Fail fast with 10s timeout so build doesn't hang
RUN timeout 10 sh -c 'apt-get update -y 2>/dev/null && apt-get install -y --no-install-recommends openssl ca-certificates postgresql-client 2>/dev/null && rm -rf /var/lib/apt/lists/*' || \
    echo "[WARN] Skipped apt (network blocked). Using pre-installed packages from base image."

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nodejs

COPY package*.json ./

RUN npm ci --legacy-peer-deps --omit=dev --no-audit --loglevel=error --ignore-scripts

COPY prisma ./prisma/
RUN npx prisma generate

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY docker-entrypoint.sh /app/docker-entrypoint.sh

COPY *.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY prisma.config.ts ./

RUN chmod +x /app/docker-entrypoint.sh

RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "const port = process.env.PORT || 8001; fetch('http://127.0.0.1:' + port + '/health').then((res) => process.exit(res.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
