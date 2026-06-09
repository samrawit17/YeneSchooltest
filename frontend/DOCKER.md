# School Management System - Docker Deployment Guide

This document provides comprehensive instructions for deploying the SMS application using Docker.

## Quick Start

### Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB of available RAM
- 20GB of available disk space

### Production Deployment

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the .env file with your secure credentials:**
   ```bash
   nano .env
   ```

3. **Build and start all services:**
   ```bash
   docker-compose up -d --build
   ```

4. **Check service status:**
   ```bash
   docker-compose ps
   ```

5. **View logs:**
   ```bash
   # All services
   docker-compose logs -f
   
   # Specific service
   docker-compose logs -f backend
   docker-compose logs -f frontend
   ```

### Access the Application

- **Frontend:** http://localhost
- **Backend API:** http://localhost/api
- **Backend Health:** http://localhost/api/health

---

## Development with Docker

For development, use the development compose file:

```bash
docker-compose -f docker-compose.dev.yml up -d --build
```

This provides:
- Hot reload for both frontend and backend
- Source code mounted as volumes
- Debugging support (port 9229 exposed)

---

## Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Nginx (Port 80)                        │
│                    Reverse Proxy / Load Balancer            │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
┌─────────────────────┐    ┌─────────────────────┐
│   Frontend          │    │    Backend          │
│   (Next.js)         │    │    (NestJS)         │
│   Port 8000         │    │    Port 8001        │
└─────────────────────┘    └──────────┬────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                             │
                    ▼                             ▼
           ┌─────────────────┐          ┌─────────────────┐
           │   PostgreSQL    │          │     Redis       │
           │   Database      │          │     Cache       │
           │   Port 5432    │          │    Port 6379   │
           └─────────────────┘          └─────────────────┘
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_USER` | PostgreSQL username | `usman` |
| `DB_PASSWORD` | PostgreSQL password | (required) |
| `DB_NAME` | PostgreSQL database name | `sms_db` |
| `REDIS_PASSWORD` | Redis password | (required) |
| `JWT_SECRET` | JWT signing secret | (required) |
| `WEB_PUSH_PUBLIC_KEY` | VAPID public key | (provided) |
| `WEB_PUSH_PRIVATE_KEY` | VAPID private key | (provided) |
| `WEB_PUSH_CONTACT_EMAIL` | VAPID contact email | (provided) |

---

## Common Commands

### Stop all services
```bash
docker-compose down
```

### Stop and remove volumes (data loss)
```bash
docker-compose down -v
```

### Rebuild specific service
```bash
docker-compose up -d --build backend
docker-compose up -d --build frontend
```

### Run database migrations
```bash
docker-compose exec backend npx prisma migrate deploy
```

### Reset database (development only)
```bash
docker-compose exec backend npx prisma migrate reset
```

### Access container shell
```bash
docker-compose exec backend sh
docker-compose exec frontend sh
```

### Check resource usage
```bash
docker stats
```

---

## Troubleshooting

### Backend fails to start
1. Check PostgreSQL is healthy: `docker-compose ps`
2. Check logs: `docker-compose logs backend`
3. Verify DATABASE_URL is correct in .env file

### Frontend shows connection errors
1. Verify backend is running and healthy
2. Check nginx logs: `docker-compose logs nginx`
3. Verify NEXT_PUBLIC_API_URL is correct

### Database connection issues
1. Ensure postgres container is running: `docker-compose ps`
2. Wait for postgres to be fully healthy
3. Check database credentials in .env

### Redis connection issues
1. Ensure redis container is running
2. Verify REDIS_PASSWORD matches

### Container restart loop
1. Check logs: `docker-compose logs <service>`
2. Verify all required environment variables are set
3. Check resource availability (CPU, Memory)

---

## Security Notes

1. **Change default passwords** in .env before production deployment
2. **Use strong JWT_SECRET** - generate a secure random string
3. **Keep .env file private** - never commit to version control
4. **Run as non-root** - containers run as non-root user by default
5. **Enable firewall** - only expose port 80 externally if needed

---

## Performance Tuning

### For Production

1. **Configure resource limits** in docker-compose.yml:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '2'
         memory: 2G
   ```

2. **Enable Redis persistence** (already configured)

3. **Use nginx caching** for static assets

### For Development

1. Increase Docker desktop resource allocation
2. Use volume mounts for hot reload (already configured)
3. Disable verbose logging in production

---

## Backup and Restore

### Backup Database
```bash
docker-compose exec postgres pg_dump -U usman sms_db > backup.sql
```

### Restore Database
```bash
docker-compose exec -T postgres psql -U usman sms_db < backup.sql
```

### Backup Redis
```bash
docker-compose exec redis redis-cli -a YOUR_PASSWORD SAVE
docker cp sms_redis:/data/dump.rdb ./redis_backup.rdb
```
