# Deployment Guide — YeneSchool

> Purpose: Infrastructure setup, deployment procedures, environment configuration.

---

## 1. Architecture

```
Internet → Nginx (:80/:443) → Frontend (:8000) / Backend (:8001)
                                  ↓
                          PostgreSQL (:5432) + Redis (:6379)
```

## 2. Docker Services

| Service | Image | Port | Dependencies |
|---------|-------|------|--------------|
| postgres | postgres:16-alpine | 5432 | Volume: `postgres_data` |
| redis | redis:7-alpine | 6379 | None |
| backend | node:20-slim | 8001 | postgres, redis |
| frontend | node:20-slim | 8000 | backend |
| nginx | nginx:alpine | 80/443 | frontend, backend |

## 3. Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/veneschool
POSTGRES_USER=veneschool
POSTGRES_PASSWORD=<secure-password>
POSTGRES_DB=veneschool

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# JWT
JWT_SECRET=<random-64-char-string>
JWT_EXPIRATION=7d

# Backend
BACKEND_PORT=8001
CORS_ORIGIN=https://yourdomain.com
NODE_ENV=production

# Frontend
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Cloudflare R2
R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<key>
R2_SECRET_ACCESS_KEY=<secret>
R2_BUCKET_NAME=veneschool-uploads

# Web Push
VAPID_PUBLIC_KEY=<key>
VAPID_PRIVATE_KEY=<key>
VAPID_SUBJECT=mailto:admin@yourdomain.com
```

## 4. Deployment Steps

### Production (Docker Compose)

```bash
# 1. Clone and configure
git clone <repo> && cd SMS
cp .env.example .env  # Edit with production values

# 2. Build and start
docker-compose build
docker-compose up -d

# 3. Apply migrations
docker-compose exec backend npx prisma migrate deploy

# 4. Verify
docker-compose ps
curl https://yourdomain.com/api/health
```

### Manual (VPS without Docker)
```bash
# Backend
cd backend && npm install && npm run build && npm run start:prod

# Frontend
cd frontend && npm install && npm run build && npm run start:standalone
```

## 5. Nginx Rate Limiting

| Zone | Limit | Endpoint |
|------|-------|----------|
| auth_login | 5 req/min | `/api/auth/login` |
| auth_reset | 3 req/min | `/api/auth/forgot-password` |
| auth_register | 5 req/10min | `/api/auth/register*` |
| api_global | 120 req/min | All `/api/` |

## 6. Backup Strategy

```bash
# Database backup
docker-compose exec postgres pg_dump -U veneschool veneschool > backup-$(date +%Y%m%d).sql

# Restore
cat backup.sql | docker-compose exec -T postgres psql -U veneschool
```

## 7. Maintenance Mode

Set `MAINTENANCE_MODE=true` in `.env` to trigger frontend maintenance screen.
Backend returns 503 with `{ "maintenance": true }`; Axios interceptor shows maintenance page.

## 8. Related Documents

- `docker-compose.yml` — Production configuration
- `docker-compose.dev.yml` — Development configuration
- `Dockerfile` — Build instructions
- `nginx/nginx.conf` — Reverse proxy config
- `DOCKER.md` — Docker-specific notes
- `docs/SECURITY.md` — Security hardening

---

> **Last updated**: June 2026
