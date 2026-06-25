# ARCHITECTURE

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Frontend     │────▶│  Backend API     │────▶│  PostgreSQL   │
│  Next.js:8000 │     │  NestJS:8001     │     │  + Prisma     │
└──────────────┘     └────────┬─────────┘     └──────────────┘
                              │
                       ┌──────▼──────┐
                       │  Redis 7    │
                       │  (cache/q)  │
                       └─────────────┘
```

## Frontend
- Next.js 14 App Router (React 18)
- TanStack Query v5 for server state
- Zustand for theme/language/UI
- React Context for auth, academic year, calendar
- Dexie.js for offline attendance storage
- Tailwind CSS + Shadcn/ui + Radix UI
- Axios with 401/403/503 interceptors

## Backend
- NestJS 11 with 51+ feature modules
- Prisma 7 ORM with `@prisma/adapter-pg`
- Passport.js JWT cookie auth
- RBAC with 8 roles (SUPER_ADMIN, ADMIN, TEACHER, STUDENT, PARENT, REGISTRAR, FINANCE, HR)
- File handling: Multer, Sharp, ExcelJS, PDFKit, Archiver
- Web Push API for notifications

## Database
- PostgreSQL 16, ~95 models + 36 enums
- Key entities: School, User, StudentProfile, TeacherProfile, ParentProfile, Class, Section, Subject, TimetableSlot, Grade, Fee, Attendance
- Multi-tenant isolation via `schoolId` column on every tenant-scoped table

## Key Flows
- **Auth**: Login → JWT cookie → Role guard → schoolId from JWT
- **Multi-tenant**: Every query scoped by JWT schoolId. Redis keys prefixed `school:{schoolId}:`
- **i18n**: Language stored in Zustand → messages loaded from `frontend/src/messages/registry.ts` by module namespace
- **Calendar**: Ethiopian calendar primary. Academic year Meskerem–Sene (Sep–Jun). `ethiopian-calendar-new` library.

## Directory Layout
```
├── backend/src/
│   ├── prisma/          PrismaModule (global)
│   ├── auth/            Login, register, JWT, passwords
│   ├── rbac/            Role/permission guards
│   ├── <module>/        Feature modules (51+)
│   └── main.ts          Bootstrap
├── frontend/src/
│   ├── app/
│   │   ├── (dashboard)/ Role-specific routes
│   │   ├── sign-in/     Login page
│   │   └── ...          Public pages
│   ├── components/      Shared UI
│   ├── lib/api/         API clients
│   ├── lib/             Stores, DB, utils
│   └── messages/        i18n registry + files
```
