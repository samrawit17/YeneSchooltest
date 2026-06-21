# Infrastructure Module

> Purpose: Caching, rate limiting, Redis management, and system-wide infrastructure services.

---

## Responsibilities
- Redis connection and cache management
- Rate limiting for API endpoints
- Cache key management
- System health monitoring

## Features
- Redis service with configurable connection
- Cache service with TTL management
- Rate limiting guard (decorator-based)
- Cache invalidation patterns
- Multi-tenant Redis key namespacing

## Services
- `CacheService` — Generic cache wrapper with get/set/delete
- `RedisService` — Direct Redis operations
- `RateLimitGuard` — Endpoint-level rate limiting
- `RateLimitDecorator` — `@RateLimit({ limit: 5, windowMs: 60000 })`

## Redis Key Convention
```
school:{schoolId}:resource:{id}:{field}
```

## Related Documents
- `backend/src/infrastructure/`
- `docs/SECURITY.md` — Rate limiting details
- `ARCHITECTURE.md` (Section 4.2)
