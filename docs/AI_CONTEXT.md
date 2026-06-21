# AI_CONTEXT.md — Context Loading Guide for AI Agents

> Purpose: Minimize token usage while maximizing AI understanding. Load only what you need for your task.

---

## 1. Minimum Viable Context (MVC)

For simple tasks, read only these files:

```text
ARCHITECTURE.md          → Overall system understanding
docs/AGENTS.md           → Agent rules
docs/CODING_STANDARDS.md → Code conventions
backend/prisma/schema.prisma → DB models (if touching data)
```

---

## 2. Context Loading by Task Type

### New Feature Development
```
MVC (above) +
docs/PROJECT_OVERVIEW.md        → Product context
docs/FEATURES/<Module>/README.md → Feature spec
docs/API/v1/<resource>.md       → API contract
docs/BUSINESS_RULES.md          → Constraints
backend/src/<module>/           → Reference implementation
frontend/src/lib/api/<module>.ts → Existing API client
```

### Bug Fix
```
ARCHITECTURE.md (sections 4-7)  → Multi-tenancy, auth, data flow
docs/SECURITY.md                → Security checklist
backend/src/<module>/           → Module code
backend/src/prisma/schema.prisma → Relevant models
frontend/src/lib/api/<module>.ts → API client
```

### Database Schema Change
```
backend/prisma/schema.prisma    → Full schema
docs/DATABASE.md                → DB design patterns
docs/BUSINESS_RULES.md          → Data validation rules
docs/API/v1/*.md                → All affected API specs
```

### UI Change
```
docs/UI/Design-System/README.md → Design tokens, colors, typography
docs/UI/Components/<name>.md    → Component spec
docs/UI/User-Flows/<flow>.md    → User flow
frontend/src/components/        → Existing components
```

### DevOps / Deployment
```
docs/DEPLOYMENT.md              → Deployment procedures
docker-compose.yml              → Service configuration
Dockerfile                      → Build configuration
nginx/nginx.conf                → Reverse proxy config
```

---

## 3. Context Priority Levels

| Priority | Files | When to Load |
|----------|-------|--------------|
| **P0** | `ARCHITECTURE.md`, `AGENTS.md`, `schema.prisma` | Every session |
| **P1** | `TECH_STACK.md`, `CODING_STANDARDS.md`, `DATABASE.md` | Every session |
| **P2** | `PROJECT_OVERVIEW.md`, `BUSINESS_RULES.md`, `SECURITY.md` | Feature/bug work |
| **P3** | Feature docs, API docs, UI docs | Task-specific |
| **P4** | `ROADMAP.md`, `CONTRIBUTING.md`, `DEPLOYMENT.md` | Planning/ops |

---

## 4. Context Window Budget

Assume 100k token context. Allocate wisely:

```
ARCHITECTURE.md           ~3k tokens  (read once, cache)
AGENTS.md                 ~2k tokens  (read once, cache)
TECH_STACK.md             ~1k tokens  (read once, cache)
CODING_STANDARDS.md       ~3k tokens  (read once, cache)
DATABASE.md               ~2k tokens  (read once, cache)
schema.prisma             ~8k tokens  (read once, cache)
--- Total baseline:      ~19k tokens ---

Feature module code       ~15k tokens (task-specific)
API spec                  ~5k tokens  (task-specific)
Business rules           ~3k tokens  (task-specific)
--- Remaining:           ~58k tokens for code generation ---
```

---

## 5. Incremental Loading Strategy

1. **Session start**: Load P0 + P1 files (~19k tokens)
2. **Understand task**: Load relevant P2 files (~6k tokens)
3. **Execute**: Load P3 files for the specific module (~20k tokens)
4. **Generate**: Use remaining context for code

If you hit context limits:
- Drop P4 files
- Drop feature docs for unrelated modules
- Reference `docs/decisions/` only when relevant

---

## 6. Cache Strategy

Files that change rarely and can be cached across sessions:
- `PROJECT_OVERVIEW.md`
- `TECH_STACK.md`
- `CODING_STANDARDS.md`
- `docs/decisions/*.md`

Files that change frequently and should be re-read:
- `backend/prisma/schema.prisma`
- `docs/DATABASE.md`
- `docs/BUSINESS_RULES.md`
- Feature-specific docs

---

## 7. Synchronization Warning

If your context contains stale versions of these docs, request the user to update them.
The docs in `docs/` are the single source of truth — not your training data.

---

> **Tip**: When debugging, start with `ARCHITECTURE.md` section 14 (Security Checklist) and section 15 (Known Incomplete Areas).
