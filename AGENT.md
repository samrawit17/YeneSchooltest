# AGENT.md

Read this first. Only read other docs if the task requires them.

## PROJECT
YeneSchool — Multi-tenant school management system for Ethiopia. ~50% complete.

## STACK
- Backend: NestJS 11, Prisma 7, PostgreSQL 16, Redis 7
- Frontend: Next.js 14 (App Router), React 18, Tailwind CSS, Shadcn/ui
- State: TanStack Query (server), Zustand (UI/theme), React Context (auth/calendar)
- Auth: JWT (cookie) + Passport + RBAC (8 roles)
- i18n: Custom system (EN, AM, AR, OM, SO) + Ethiopian calendar
- Offline: Dexie.js (IndexedDB) for attendance

## ARCHITECTURE
- `backend/` — NestJS API on port 8001
- `frontend/` — Next.js app on port 8000
- `docker-compose.yml` — Full stack (Nginx reverse proxy, PostgreSQL, Redis)
- Multi-tenancy: `schoolId` in every DB query from JWT

## CORE MODULES (62 total)
✅ Complete: Auth, RBAC, Students, Teachers, Parents, Enrollment, Classes, Sections, Subjects, Timetable, Attendance, Gradebook, Finance, Announcements, Messaging, Discipline, Calendar, Notifications, School Settings
⚠️ Partial: Analytics, Assignments, Exams, Practice Exams, Promotion, Report Cards, Reports, Siren/Bell, Sync, Translation, Backup, AI Assistant
❌ Not started: Library, Transport, Hostel, Inventory, SMS, Email

## CODING RULES
- TypeScript everywhere, no `any`
- `kebab-case.ts` for files, `camelCase` vars, `PascalCase` types
- Path aliases: `@/` on frontend
- Backend: NestJS module pattern (controller → service → Prisma)
- Every DB query includes `schoolId`
- `class-validator` DTOs with `@IsUUID()` on IDs
- `JwtAuthGuard` + role guards on all endpoints
- No raw SQL — Prisma only
- No PII in logs

## DO NOT
- Suggest unlisted libraries without strong justification
- Alter auth flow without reading `backend/src/auth/` first
- Remove or bypass `schoolId` filtering
- Change API response shape without updating frontend API client
- Log student names, parent phones, or other PII
