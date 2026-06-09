# ===========================================
# DEVELOPMENT BUILD
# ===========================================

# Dependencies stage
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./

RUN npm install --prefer-offline --no-audit --loglevel=error || npm install --no-audit --loglevel=error

# Development stage
FROM node:20-alpine AS development

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY . .

ENV PORT=8000

EXPOSE 8000

CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]

# ===========================================
# PRODUCTION BUILD
# ===========================================

# Builder stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install --prefer-offline --no-audit --loglevel=error || npm install --no-audit --loglevel=error

COPY . .

RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY package*.json ./

RUN npm ci --omit=dev --prefer-offline --no-audit --loglevel=error

COPY --from=builder /app/.next/standalone ./.next/standalone
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.mjs ./

RUN mkdir -p .next/cache && chown -R nodejs:nodejs .next

RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 8000

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:8000').then((res) => process.exit(res.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", ".next/standalone/server.js"]
