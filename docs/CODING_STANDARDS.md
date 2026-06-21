# Coding Standards — YeneSchool

> Purpose: Consistent code conventions across the entire project.

---

## 1. General Principles

- **TypeScript everywhere** — No plain JavaScript in backend or frontend
- **Type safety first** — Avoid `any`, use proper types/interfaces
- **Imports**: Use path aliases (`@/` for frontend, no barrel re-exports beyond `api/index.ts`)
- **Naming**: `camelCase` for variables/functions, `PascalCase` for classes/types/interfaces, `UPPER_CASE` for constants
- **File naming**: `kebab-case.ts` for files (e.g., `grade-system.ts`, `student-code.ts`)

---

## 2. Backend (NestJS)

### 2.1 Module Structure
```
src/<module>/
├── <module>.module.ts       # @Module decorator
├── <module>.controller.ts   # Routes
├── <module>.service.ts      # Business logic
├── <module>.types.ts        # Interfaces, types
├── dto/                     # Request/response DTOs
│   ├── create-<entity>.dto.ts
│   └── update-<entity>.dto.ts
└── __tests__/               # Tests
```

### 2.2 Service Pattern
```typescript
@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(schoolId: string): Promise<StudentProfile[]> {
    return this.prisma.studentProfile.findMany({
      where: { schoolId },
    });
  }

  async findOne(schoolId: string, id: string): Promise<StudentProfile | null> {
    return this.prisma.studentProfile.findFirst({
      where: { id, schoolId }, // ALWAYS include schoolId
    });
  }
}
```

### 2.3 Validation
- `class-validator` decorators on all DTOs
- `@IsUUID()` on all ID fields
- Custom `@IsEthiopianDate()` for Ethiopian date strings
- Global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true`
- Body parser limit: 10MB

### 2.4 Error Handling
- Throw `HttpException` subclasses only (not raw DB errors)
- Log with `schoolId` context in all log entries
- Never expose internal error details in production

### 2.5 Guards
- Every endpoint needs at minimum `JwtAuthGuard`
- Role/permission checks via `RolesGuard` and `PermissionsGuard`
- Tenant isolation via `TenantGuard`

---

## 3. Frontend (Next.js)

### 3.1 Directory Conventions
```
src/
├── app/                          # Next.js App Router pages
│   ├── (dashboard)/              # Authenticated routes
│   │   ├── layout.tsx            # Sidebar + navbar + breadcrumb
│   │   ├── admin/                # Admin role pages
│   │   ├── teacher/              # Teacher role pages
│   │   └── ...
│   ├── sign-in/                  # Public pages
│   └── page.tsx                  # Landing page
├── components/                   # Shared components
│   ├── ui/                       # Shadcn primitives
│   ├── forms/                    # Form components
│   └── <module>/                 # Feature-specific components
├── context/                      # React Context providers
├── hooks/                        # Custom hooks
├── lib/                          # Utilities, stores, API
│   ├── api/                      # API client modules
│   └── *Store.ts                 # Zustand stores
├── messages/                     # i18n JSON files
└── types/                        # Global type definitions
```

### 3.2 Component Structure
```typescript
// Functional components only
// Props interface defined above component
// Named exports preferred

interface StudentTableProps {
  schoolId: string;
  classId?: string;
}

export function StudentTable({ schoolId, classId }: StudentTableProps) {
  // Implementation
}
```

### 3.3 State Management Rules
| State Type | Tool | Location |
|---|---|---|
| Server data | TanStack Query | `lib/api/*.ts` |
| Theme/Language/UI | Zustand | `lib/*Store.ts` |
| Auth/Calendar/AcademicYear | React Context | `context/` |
| Offline | Dexie.js | `lib/db/` |

### 3.4 TanStack Query Conventions
```typescript
// Centralized query keys in lib/query-keys.ts
const queryKeys = {
  students: (schoolId: string) => ['students', schoolId],
  student: (schoolId: string, id: string) => ['students', schoolId, id],
};

// Usage
const { data } = useQuery({
  queryKey: queryKeys.students(schoolId),
  queryFn: () => api.getStudents(schoolId),
  staleTime: 60_000,
  gcTime: 300_000,
});
```

### 3.5 API Client Pattern
```typescript
// lib/api/students.ts
import { api } from './core';

export const getStudents = (schoolId: string, params?: StudentFilters) =>
  api.get(`/students`, { params: { schoolId, ...params } });

export const getStudent = (schoolId: string, id: string) =>
  api.get(`/students/${id}`, { params: { schoolId } });
```

### 3.6 i18n Usage
```typescript
// Never embed strings directly — always use translations
const { t } = useTranslations();
return <div>{t('students.title')}</div>;
```

---

## 4. Database

- Prisma ORM only — no raw SQL
- All IDs: `cuid()` (Prisma default)
- All tenant tables: `schoolId` field
- Add `@updatedAt` for modification tracking
- Index frequently queried fields
- Cascade deletes carefully — prefer soft deletes

---

## 5. Testing

- Backend: Jest (`*.spec.ts` files co-located with source)
- Frontend: Playwright for E2E
- Run tests before every PR

---

## 6. Git Conventions

- Branch: `feature/<name>`, `fix/<name>`, `chore/<name>`
- Commits: Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`)
- No commits to `main` directly — PRs only

---

## 7. Related Documents

- `docs/AGENTS.md` — Agent-specific conventions
- `ARCHITECTURE.md` — Architecture patterns
- `docs/TECH_STACK.md` — Technology versions

---

> **Last updated**: June 2026
