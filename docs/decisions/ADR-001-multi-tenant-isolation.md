# ADR-001: Multi-Tenant Data Isolation Strategy

**Status:** Accepted | **Date:** 2024-01-15 | **Author:** HUMAN Tech PLC

## Context
YeneSchool serves multiple schools from a single deployment. We need to ensure complete data isolation between tenants.

## Decision
Use **database-level isolation** via a `schoolId` column on every tenant-scoped table rather than separate databases per tenant.

## Rationale
- Simpler to manage (one database, one connection pool)
- Easier migrations and schema updates
- Lower operational overhead
- SUPER_ADMIN cross-tenant queries are straightforward
- Prisma makes scoped queries natural

## Consequences
- Every query must include `schoolId` filter — enforced by code review and TenantGuard
- Risk of data leaks if developer forgets schoolId — mitigated by strong conventions
- Indexes must include schoolId for query performance
- Redis keys must also be namespaced

## Alternatives Considered
- **Separate databases per school**: Stronger isolation but complex operational overhead
- **Separate schemas per school**: PostgreSQL schema-per-tenant — better isolation but more complex migrations
