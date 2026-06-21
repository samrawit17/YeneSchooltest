# AGENTS.md — AI Agent Instructions for YeneSchool

> **Read this first.** This file tells AI agents how to understand, navigate, and modify this codebase safely.

---

## 1. First-Read Protocol

When you start working on this project, read files in this exact order:

| Step | File | Why |
|------|------|-----|
| 1 | `docs/ARCHITECTURE.md` | Complete system architecture, all modules, data flow |
| 2 | `docs/AGENTS.md` (this) | Agent-specific instructions and conventions |
| 3 | `docs/AI_CONTEXT.md` | Context loading guide per task type |
| 4 | `docs/PROJECT_OVERVIEW.md` | Product vision, goals, market |
| 5 | `docs/TECH_STACK.md` | Technology choices and versions |
| 6 | `docs/CODING_STANDARDS.md` | Code style, patterns, conventions |
| 7 | `backend/prisma/schema.prisma` | Full database schema (95 models + 36 enums) |
| 8 | `docs/DATABASE.md` | DB design notes, migrations, patterns |

---

## 2. Task-Specific Reading Order

### Working on a specific feature module
1. `docs/FEATURES/<Module>/README.md`
2. `backend/src/<module>/` — NestJS module files
3. `frontend/src/lib/api/<module>.ts` — Frontend API client
4. `frontend/src/app/(dashboard)/<role>/<module>/` — Frontend pages

### Debugging a bug
1. `docs/AI_CONTEXT.md` — Debug mode checklist
2. `ARCHITECTURE.md` sections 4, 5, 7
3. `docs/SECURITY.md` — Common pitfalls
4. `backend/src/prisma/` — DB access patterns

### Adding a new API endpoint
1. `docs/CODING_STANDARDS.md`
2. `docs/API/v1/` — Existing API specs
3. `backend/src/<module>/` — Existing controller/service pattern
4. `backend/src/prisma/schema.prisma` — For any schema changes

### Modifying the database
1. `docs/DATABASE.md`
2. `backend/prisma/schema.prisma`
3. `docs/BUSINESS_RULES.md` — Validate business logic
4. `docs/API/v1/` — Update API specs after changes

### Deployment / DevOps
1. `docs/DEPLOYMENT.md`
2. `docker-compose.yml`
3. `Dockerfile`
4. `nginx/nginx.conf`

### Security review
1. `docs/SECURITY.md`
2. `docs/BUSINESS_RULES.md`
3. `backend/src/auth/`
4. `backend/src/rbac/`

---

## 3. Golden Rules

### 3.1 Multi-Tenancy is NOT optional
- Every DB query **must** include `schoolId` in the `where` clause.
- Every Redis key **must** be prefixed with `school:{schoolId}:`.
- Never derive `schoolId` from request body/params — always from JWT.
- Flag any `findMany()` or `SELECT *` without `schoolId` as a security bug.

### 3.2 Ethiopian Calendar is the Default
- Academic year: Meskerem (Month 1) to Sene (Month 10) — Sep to Jun.
- Finance: 10 school months, not 12. Monthly billing = 10 installments.
- Use `ethiopian-calendar-new` library functions, never raw `Date` math.
- Ethiopian months: Meskerem, Tikemet, Hidar, Tahsas, Ter, Yekatit, Megabit, Miyazia, Ginbot, Sene, Hamle, Nehase, Pagume.

### 3.3 Never Break Existing Functionality
- Before editing any file, read its imports and understand its dependencies.
- When changing a Prisma schema, run `npx prisma generate` and update affected services.
- When changing an API response shape, update the corresponding frontend API client in `frontend/src/lib/api/`.
- All existing tests must pass after your changes.

### 3.4 State Management Discipline
| State Type | Tool | Location |
|---|---|---|
| Server data | TanStack Query | `frontend/src/lib/api/*.ts` |
| Theme/Language/UI | Zustand | `frontend/src/lib/*Store.ts` |
| Auth/Calendar/AcademicYear | React Context | `frontend/src/context/` |
| Offline data | Dexie.js | `frontend/src/lib/db/` |

---

## 4. Documentation Update Requirements

Whenever you make changes, update the corresponding docs:

| Change | Docs to Update |
|--------|---------------|
| New feature module | `docs/FEATURES/<Module>/README.md` |
| New API endpoint | `docs/API/v1/<resource>.md` |
| Schema change | `docs/DATABASE.md` |
| New business rule | `docs/BUSINESS_RULES.md` |
| Security change | `docs/SECURITY.md` |
| Architecture change | `ARCHITECTURE.md` |
| UI component change | `docs/UI/Components/<component>.md` |
| New env variable | `.env.example` + `docs/DEPLOYMENT.md` |

---

## 5. AI Behavior Constraints

- **Do NOT** suggest libraries not already in `package.json` without strong justification.
- **Do NOT** change the auth flow without reading `backend/src/auth/` completely.
- **Do NOT** remove or alter `schoolId` filtering logic.
- **Do NOT** use raw SQL — Prisma query builder only.
- **Do NOT** log PII (student names, parent phone numbers) in production code.
- **DO** use `class-validator` decorators on all DTOs.
- **DO** include `@IsUUID()` on all ID fields.
- **DO** wrap all endpoints with `JwtAuthGuard` + appropriate role/permission guards.

---

## 6. Architecture Decisions Record

Key decisions documented in `docs/decisions/`:
- `ADR-001-multi-tenant-isolation.md` — Why schoolId at DB level
- `ADR-002-ethiopian-calendar.md` — Calendar handling strategy
- `ADR-003-offline-attendance.md` — Dexie.js for offline-first attendance

Read these before challenging existing patterns.

---

## 7. Communication Style

When responding to questions about this codebase:
- Reference files with their full path from repo root.
- Include line numbers for key code sections.
- State which role/actor is affected by a change.
- Mention whether a change affects backend, frontend, or both.

---

## 8. Quick Reference

```bash
# Backend
cd backend && npm run start:dev    # Development server on :8001
cd backend && npm run test          # Run tests
cd backend && npx prisma generate   # After schema changes
cd backend && npx prisma migrate deploy  # Apply migrations

# Frontend
cd frontend && npm run dev          # Development server on :8000
cd frontend && npm run lint         # Lint check

# Docker
docker-compose up -d                # Full stack
docker-compose -f docker-compose.dev.yml up -d  # Dev stack
```

---

> **Version**: 0.5.0 | **Last updated**: June 2026 | **Maintainer**: HUMAN Tech PLC
