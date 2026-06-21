# Contributing Guide — YeneSchool

> Purpose: How to contribute, development workflow, and PR requirements.

---

## 1. Development Setup

```bash
# Prerequisites
node >= 20
npm or bun
docker & docker-compose

# 1. Clone
git clone <repo> && cd SMS

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Start infrastructure
docker-compose -f docker-compose.dev.yml up -d postgres redis

# 4. Setup database
cd backend && npx prisma migrate dev

# 5. Start dev servers
# Terminal 1: backend
cd backend && npm run start:dev    # :8001

# Terminal 2: frontend
cd frontend && npm run dev         # :8000

# 6. Open browser
open http://localhost:8000
```

---

## 2. Development Workflow

```
1. Pick a task from ROADMAP.md or issue tracker
2. Create branch: git checkout -b feature/<name>
3. Read relevant docs in docs/ directory
4. Implement changes
5. Update docs (see Section 4)
6. Run tests: cd backend && npm test
7. Run lint: cd frontend && npm run lint
8. Create PR
```

---

## 3. PR Requirements

- [ ] Code follows `docs/CODING_STANDARDS.md`
- [ ] No console.log with PII
- [ ] All DB queries include `schoolId` where applicable
- [ ] All Redis keys namespaced with `school:{schoolId}`
- [ ] New endpoints have proper guards
- [ ] DTOs validated with class-validator
- [ ] Tests pass (backend)
- [ ] Related docs updated
- [ ] .env.example updated if new env vars added

---

## 4. Documentation Update Responsibility

| Change | Must Update |
|--------|-------------|
| New feature | `docs/FEATURES/<Module>/README.md` |
| New API endpoint | `docs/API/v1/<resource>.md` |
| Schema change | `docs/DATABASE.md` + `schema.prisma` |
| New business rule | `docs/BUSINESS_RULES.md` |
| Architecture change | `ARCHITECTURE.md` |
| Security change | `docs/SECURITY.md` |
| UI component change | `docs/UI/Components/<name>.md` |
| New dependency | `docs/TECH_STACK.md` |
| Environment variable | `.env.example` + `docs/DEPLOYMENT.md` |

---

## 5. Code Review Checklist

- Multi-tenancy enforced correctly?
- Ethiopian calendar used appropriately?
- Error messages user-friendly?
- Loading/error/empty states handled in UI?
- Permission checks correct for the role?
- Offline behavior considered?

---

## 6. Getting Help

- Read `ARCHITECTURE.md` first
- Check `docs/FEATURES/` for module specs
- Check `docs/decisions/` for architecture decisions
- Ask in project communication channel

---

> **Last updated**: June 2026
