# ===========================================
# DEVELOPMENT BUILD
# ===========================================

# Dependencies stage
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps --no-audit --loglevel=error --ignore-scripts

# Development stage
FROM node:20-slim AS development

WORKDIR /app

EXPOSE 3000

CMD ["npm", "run", "dev"]

# ===========================================
# PRODUCTION BUILD
# ===========================================

# Builder stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps --no-audit --loglevel=error --ignore-scripts

COPY . .

RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nodejs

COPY package*.json ./

RUN npm install --legacy-peer-deps --omit=dev --no-audit --loglevel=error --ignore-scripts

COPY --from=builder /app/.next/standalone ./.next/standalone
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.mjs ./

RUN mkdir -p .next/cache && chown -R nodejs:nodejs .next

RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000').then((res) => process.exit(res.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", ".next/standalone/server.js"]
