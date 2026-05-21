# Builder stage
FROM node:20-slim AS builder

WORKDIR /app

ENV NPM_CONFIG_FETCH_RETRIES=5
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000
ENV NPM_CONFIG_FETCH_TIMEOUT=300000

COPY package*.json ./

RUN npm ci --legacy-peer-deps --no-audit --loglevel=error --ignore-scripts

COPY . .

RUN npm run build

# Production stage
FROM node:20-slim AS production

WORKDIR /app

ENV NPM_CONFIG_FETCH_RETRIES=5
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000
ENV NPM_CONFIG_FETCH_TIMEOUT=300000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nodejs

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/next.config.mjs ./

RUN npm ci --omit=dev --legacy-peer-deps --no-audit --loglevel=error --ignore-scripts

RUN mkdir -p .next/cache && chown -R nodejs:nodejs .next

RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000').then((res) => process.exit(res.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["npm", "run", "start", "--", "-H", "0.0.0.0", "-p", "3000"]

# ===========================================
# DEVELOPMENT BUILD
# ===========================================

FROM node:20-slim AS deps

WORKDIR /app

ENV NPM_CONFIG_FETCH_RETRIES=5
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000
ENV NPM_CONFIG_FETCH_TIMEOUT=300000

COPY package*.json ./

RUN npm install --legacy-peer-deps --no-audit --loglevel=error --ignore-scripts

FROM node:20-slim AS development

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./

ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

CMD ["npm", "run", "dev"]
