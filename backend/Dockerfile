# ===========================================
# DEVELOPMENT BUILD
# ===========================================

# Development stage
FROM node:20-slim AS development

# Install dependencies for Prisma
RUN apt-get update && apt-get install -y --no-install-recommends \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm install --prefer-offline --no-audit --loglevel=error

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Copy entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Expose ports
EXPOSE 5000 9229

# Use entrypoint instead of direct CMD
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["npm", "run", "start:watch"]

# ===========================================
# PRODUCTION BUILD
# ===========================================

# Production build stage
FROM node:20-slim AS builder

# Install dependencies for Prisma
RUN apt-get update && apt-get install -y --no-install-recommends \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --prefer-offline --no-audit --loglevel=error

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# ===========================================
# PRODUCTION RUNTIME
# ===========================================

# Production runtime
FROM node:20-slim AS production

# Install dependencies for Prisma
RUN apt-get update && apt-get install -y --no-install-recommends \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy Prisma schema and generated client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY docker-entrypoint.sh /app/docker-entrypoint.sh

# Copy config files
COPY *.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

RUN chmod +x /app/docker-entrypoint.sh

# Change ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:5000/health').then((res) => process.exit(res.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "dist/main"]
