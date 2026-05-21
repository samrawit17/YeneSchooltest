# School Management System Backend

This repository contains a full-stack School Management System. The backend is a NestJS API backed by PostgreSQL through Prisma, with Redis used for cache and distributed rate-limit state when `REDIS_URL` is configured.

This README is intentionally backend-focused. The API catalog below is derived from the controller decorators under `backend/src/**/*.controller.ts` and currently documents 470 declared HTTP endpoints. The codebase does not define a centralized OpenAPI/Swagger schema or response DTOs for every route, so response entries identify the concrete controller return type when present, file-stream responses where explicit, or the service/controller result that Nest serializes as JSON.

## Project Overview

The backend provides the server-side system of record for a multi-school management platform. Its core responsibilities are:

- Authentication, user provisioning, profile management, password changes, password reset support, and avatar upload.
- Role and permission enforcement for school-scoped users and platform-level super admins.
- Academic setup: schools, school settings, academic years, terms, classes, sections, subjects, class-subject assignments, timetables, period times, and calendars.
- Student lifecycle: enrollment requests, registrar approval/rejection, class assignment, parent linkage, bulk upload, credential generation, ID card generation, and offline sync payloads.
- Teaching workflows: lessons, homework submissions, assessments, exams, grading, report cards, promotions, attendance, and teacher dashboards.
- Operations workflows: finance, communications, messaging, announcements, events, notifications, siren/bell scheduling, templates, search, data quality checks, and role dashboards.

## Backend Tech Stack

| Concern | Implementation |
|---|---|
| HTTP framework | NestJS 11 with Express adapter |
| Runtime | Node.js 20 in Docker images |
| Database | PostgreSQL with Prisma Client 7 and `@prisma/adapter-pg` |
| Authentication | Passport local strategy for login and Passport JWT strategy for authenticated routes |
| Authorization | Role decorators, permission decorators, tenant checks, and optional subscription feature checks |
| Validation | Global Nest `ValidationPipe` with `transform: true` and `whitelist: true` |
| Caching/rate state | Redis RESP client with in-memory fallback |
| Scheduling | `@nestjs/schedule` module is registered |
| Uploads/exports | Multer interceptors for uploads; controller/service generated CSV, PDF, XLSX, and ZIP downloads |

## Source Map

| Path | Responsibility |
|---|---|
| `backend/src/main.ts` | Application bootstrap, CORS, trust proxy, cookies, static assets, validation, JSON body limit, port binding |
| `backend/src/app.module.ts` | Root module that wires all backend feature modules |
| `backend/src/auth` | Login, JWT validation, user registration, user CRUD, password reset/change, auth guards/decorators |
| `backend/src/rbac` | Role and permission management APIs |
| `backend/src/prisma` | Global Prisma service and PostgreSQL pool adapter |
| `backend/src/infrastructure` | Global cache, Redis client, and rate-limit guard |
| `backend/src/platform-settings` | Platform settings API and global maintenance mode interceptor |
| `backend/src/*/*.controller.ts` | HTTP route declarations |
| `backend/src/*/*.service.ts` | Business logic and Prisma query orchestration |
| `backend/src/**/dto/*.ts` | Request DTOs used by the validation pipe where controllers use typed bodies/queries |
| `backend/prisma/schema.prisma` | Database schema, relations, enums, and Prisma client generator |
| `backend/prisma/migrations` | SQL migrations committed with the project |
| `backend/prisma/seed.ts` | Development seed flow |
| `backend/docker-entrypoint.sh` | Container startup: wait for PostgreSQL, generate Prisma client, run migrate/db push, optionally seed |

## System Architecture

The backend follows the standard NestJS module pattern:

```text
HTTP request
  -> Express/Nest adapter
  -> global RateLimitGuard
  -> global MaintenanceModeInterceptor
  -> route guards: JwtAuthGuard, LocalAuthGuard, RolesGuard, PermissionsGuard, SubscriptionGuard
  -> upload interceptors when declared
  -> global ValidationPipe for DTO/query/body transformation and whitelisting
  -> controller method
  -> feature service
  -> PrismaService and PostgreSQL
  -> optional CacheService/RedisService or external push/webhook helper
  -> Nest response serialization or explicit file stream
```

There is no global route prefix in `main.ts`. Most routes are mounted directly from their controller paths, while some controllers intentionally use `api/...` prefixes such as `/api/sync`, `/api/siren`, and `/api/period-time`.

## Request Lifecycle

1. `main.ts` creates a `NestExpressApplication` from `AppModule`.
2. CORS is enabled with reflected origins, standard HTTP methods, and credentials support.
3. Express trust proxy is configured from `TRUST_PROXY` or defaults to `1`.
4. `cookie-parser` enables JWT extraction from the `Authentication` cookie.
5. Static assets are served from `backend/public` when present.
6. The global `ValidationPipe` transforms incoming data and strips properties not declared on DTOs.
7. JSON request bodies are accepted up to `10mb`.
8. The global `RateLimitGuard` runs for every route unless a route is explicitly decorated to skip it. It emits `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers.
9. The global `MaintenanceModeInterceptor` blocks authenticated non-super-admin traffic when platform maintenance mode is enabled, except for configured auth/platform settings paths.
10. Route-level guards enforce login, roles, permissions, tenant isolation, and subscription feature access.
11. Controllers delegate business work to services. Services use `PrismaService` for persistence and throw Nest HTTP exceptions for invalid state.
12. Nest serializes returned objects as JSON, or the controller/service writes files to the Express response when `@Res()` is used.

## Middleware, Guards, and Interceptors

| Layer | File | Purpose | Request-flow effect |
|---|---|---|---|
| CORS | `backend/src/main.ts` | Allows browser clients to call the API with credentials | Adds CORS headers, including on early 4xx parse errors |
| Cookie parser | `backend/src/main.ts` | Reads cookies for JWT extraction | Enables `JwtStrategy` to read the `Authentication` cookie |
| Static assets | `backend/src/main.ts` | Serves files from `public` | Used by upload/template flows that expose stored assets under public paths |
| Validation pipe | `backend/src/main.ts` | DTO transformation and whitelisting | Invalid DTO values produce `400 Bad Request`; undeclared DTO fields are stripped |
| JSON body parser | `backend/src/main.ts` | Allows larger JSON payloads | Supports base64 images/documents up to `10mb` |
| `RateLimitGuard` | `backend/src/infrastructure/rate-limit/rate-limit.guard.ts` | Global per-route/per-actor rate limiting | Uses Redis when available, memory otherwise; rejects excess requests with `429` |
| `MaintenanceModeInterceptor` | `backend/src/platform-settings/maintenance-mode.interceptor.ts` | Platform-wide maintenance gate | Returns `503` with code `MAINTENANCE_MODE` for authenticated non-super-admin users while enabled |
| `LocalAuthGuard` | `backend/src/auth/guards/local-auth.guard.ts` | Username/email/phone plus password login | Populates `req.user` for `/auth/login` or rejects with `401` |
| `JwtAuthGuard` | `backend/src/auth/guards/jwt-auth.guard.ts` | Authenticates JWTs | Accepts `Authentication` cookie first, then Bearer token; populates `req.user` |
| `RolesGuard` | `backend/src/auth/guards/roles.guard.ts` | Enforces `@Roles(...)` | Rejects authenticated users whose normalized role is not in the route role list |
| `PermissionsGuard` | `backend/src/auth/guards/permissions.guard.ts` | Enforces `@Permissions(...)` and tenant checks | Combines default role permissions, role permissions, and user overrides; blocks cross-school access when `schoolId` conflicts |
| `SubscriptionGuard` | `backend/src/subscription/guards/subscription.guard.ts` | Enforces `@RequiresFeature(...)` | Blocks school-scoped users without required plan features |
| Multer interceptors | Route controllers | File upload handling | Converts multipart file fields into `Express.Multer.File` buffers |

## Authentication and Authorization

- Login uses `LocalStrategy` with `loginIdentifier` as the username field. The identifier may be a username, email, or phone number according to the strategy comment and service behavior.
- Successful login signs a JWT containing `email`, `sub`, and `role` and returns `access_token` plus a `user` object. It also sets an HTTP-only `Authentication` cookie with a 24-hour max age.
- `JwtStrategy` extracts JWTs from the `Authentication` cookie first and then from the `Authorization: Bearer <token>` header.
- User permissions are assembled during JWT validation from default role permissions, persisted role permissions, and user-specific permission overrides. IT manager forbidden permissions are removed before the request user object is returned.
- `PermissionsGuard` implements multi-tenant isolation by comparing the authenticated user's `schoolId` with `schoolId` found in body, path params, or query values.
- Super admins are treated as platform-level users and the guard rejects super-admin users that have a `schoolId` assigned.

Current roles in `backend/src/auth/types/role.enum.ts` are:

```text
SUPER_ADMIN, ADMIN, IT_MANAGER, REGISTRAR, TEACHER, STUDENT, PARENT, FINANCE
```

## Business Logic Modules

| Domain | Modules | Core logic |
|---|---|---|
| Identity and access | `auth`, `rbac`, `credential` | Login/logout, role-scoped registration, user CRUD, password reset/change, profile photo upload, permissions, role permissions, generated credentials, CSV export of credentials |
| Tenancy and settings | `school`, `school-settings`, `platform-settings`, `subscription` | School records, logos, school-level key/value settings, platform flags, maintenance mode, plans, subscriptions, feature checks |
| Academic structure | `academic-year`, `class`, `section`, `subjects`, `class-subject`, `timetable-slot`, `period-time`, `calendar` | Academic years and terms, class/section capacity, homeroom teachers, subject assignments, timetable creation/auto-generation, Ethiopian/Gregorian calendar helpers |
| Student lifecycle | `student`, `parent`, `registrar`, `enrollment`, `auto-assignment`, `bulk-upload`, `sync` | Student profiles, parent links, enrollment request tokens, approval/rejection, auto assignment, CSV imports, offline attendance/student sync |
| Teaching and assessment | `teacher`, `lesson`, `assessments`, `exams`, `grading`, `report-card` | Teacher assignments, lessons/homework, assessment setup and score entry, exams, seating plans, grading workflow, report card generation/publishing, promotion |
| Operations | `attendance`, `finance`, `communication`, `messaging`, `announcement`, `event`, `notification`, `siren`, `templates`, `search`, `data-quality`, `dashboard`, `discipline` | Daily attendance, fees/payments/receipts/audits, parent-teacher communications, internal messaging, push notifications, siren schedule/hardware webhooks, document templates, cross-entity search, dashboards, discipline incidents |

Design decisions visible in the code:

- Controllers stay thin and mostly delegate to feature services.
- Services own tenant scoping, relational loading, transactional writes, and domain validation.
- Prisma is a global module so feature services share a single `PrismaService` provider.
- Redis is optional. Cache and rate-limit logic fall back to in-memory state when `REDIS_URL` is unset or Redis commands fail.
- Permission checks combine static role defaults with database-backed role and user permission entries.
- The system uses explicit route decorators instead of a generated OpenAPI contract.

## Database Layer

The Prisma schema is in `backend/prisma/schema.prisma`. PostgreSQL is the only datasource provider declared.

Primary model groups:

- Tenant root: `School`, `SchoolSetting`, `SchoolSettings`, `PlatformSetting`, `Plan`, `Subscription`.
- Identity/RBAC: `User`, `Permission`, `RolePermission`, `UserPermission`, `PasswordResetToken`, `CredentialGenerationLog`, `PendingCredential`.
- Academic structure: `AcademicYear`, `Term`, `GradeLevel`, `Class`, `Section`, `Subject`, `ClassSubject`, `TeacherSubjectAssignment`, `Timetable`, `TimetableSlot`, `PeriodTime`.
- People and enrollment: `StudentProfile`, `TeacherProfile`, `ParentProfile`, `ParentStudent`, `StudentClass`, `Enrollment`, `EnrollmentRequest`, `Department`, `Document`.
- Assessment/results: `Exam`, `ExamResult`, `Assessment`, `AssessmentSubject`, `StudentAssessmentScore`, `AssessmentWeight`, `Grade`, `SubjectGrade`, `GradeScore`, `GradeScale`, `GradeChangeLog`, `ReportCard`, `PromotionRecord`.
- Finance: `FinanceProfile`, `FeeStructure`, `DiscountPolicy`, `StudentFee`, `Payment`, `Receipt`, `FinanceAuditLog`.
- Attendance: `Attendance`, `AttendanceSession`, `AttendanceRecord`.
- Communication and notifications: `Announcement`, `SchoolEvent`, `Communication`, `CommunicationReply`, `Notification`, `NotificationPreference`, `PushSubscription`, `ChatRoom`, `ChatParticipant`, `ChatMessage`, `Conversation`, `ConversationParticipant`, `Message`, `MessageRead`.
- Operations/content: `DisciplineIncident`, `SirenSchedule`, `SirenEvent`, `SirenHardwareConfig`, `Template`, `SyllabusMapping`, `Content`, `ContentSubmission`, `ContentAttachment`, `ContentResource`.

Important relationships and patterns:

- `School` is the tenant anchor for most operational models. Most service queries include `schoolId` directly or through related records.
- `User` optionally belongs to a school. Super admins are expected to be platform-level users without `schoolId`.
- Students, parents, and teachers are modeled as `User` rows plus profile/link tables.
- `StudentClass` links students to classes, sections, and academic years.
- `ClassSubject` and `TeacherSubjectAssignment` represent subject delivery and teacher assignment.
- Attendance is session-based: `AttendanceSession` groups `AttendanceRecord` rows.
- Finance separates configured fees (`FeeStructure`) from assigned student fees (`StudentFee`) and payments/receipts.
- Messaging uses conversation/message/read tables separate from communication tickets/replies.
- Query patterns include Prisma `findMany`, `findFirst`, `upsert`, `createMany`, `deleteMany`, `groupBy`, `$transaction`, and a limited set of raw SQL queries for data quality/search-like cases and startup enum compatibility.

Schema model inventory:

`School`, `Template`, `PlatformSetting`, `Plan`, `Subscription`, `SchoolSetting`, `SchoolSettings`, `SchoolYearCounter`, `User`, `Permission`, `RolePermission`, `UserPermission`, `GradeLevel`, `Enrollment`, `StudentClass`, `StudentProfile`, `DisciplineIncident`, `ParentProfile`, `ParentStudent`, `AcademicYear`, `Term`, `Class`, `Section`, `Subject`, `ClassSubject`, `Exam`, `ExamResult`, `ReportCard`, `PromotionRecord`, `Grade`, `SubjectGrade`, `Assessment`, `AssessmentSubject`, `StudentAssessmentScore`, `AssessmentWeight`, `GradeChangeLog`, `FinanceAuditLog`, `GradingComponent`, `GradeScore`, `GradeScale`, `TeacherSubjectAssignment`, `TeacherProfile`, `Department`, `FinanceProfile`, `FeeStructure`, `DiscountPolicy`, `StudentFee`, `Payment`, `Receipt`, `Attendance`, `AttendanceSession`, `AttendanceRecord`, `Announcement`, `Notification`, `NotificationPreference`, `PushSubscription`, `ChatRoom`, `ChatParticipant`, `ChatMessage`, `Conversation`, `ConversationParticipant`, `Message`, `MessageRead`, `Timetable`, `TimetableSlot`, `PeriodTime`, `SirenSchedule`, `SirenEvent`, `SirenHardwareConfig`, `Document`, `SchoolEvent`, `PasswordResetToken`, `CredentialGenerationLog`, `PendingCredential`, `Communication`, `CommunicationReply`, `SyllabusMapping`, `EnrollmentRequest`, `ExamSeating`, `ExamSeatingPlan`, `ExamSectionAssignment`, `ExamSectionStudent`, `Content`, `ContentSubmission`, `ContentAttachment`, `ContentResource`

Schema enum inventory:

`PlanTier`, `DisciplineSeverity`, `DisciplineStatus`, `ResourceType`, `SubmissionStatus`, `Role`, `EnrollmentStatus`, `PaymentStatus`, `ExamType`, `AssessmentStatus`, `AssessmentScoreStatus`, `ThemePreference`, `AttendanceStatus`, `AttendanceRecordStatus`, `SessionStatus`, `ReportCardStatus`, `DocumentTemplateType`, `CurriculumType`, `CalendarType`, `GradeStatus`, `CommunicationStatus`, `CommunicationCategory`, `LessonStatus`, `EnrollmentRequestStatus`, `SeatingMode`, `ContentType`

## Error Handling Strategy

The project uses Nest's default exception handling. There is no custom global exception filter in `backend/src`.

Common error shapes follow Nest defaults, for example:

```json
{
  "statusCode": 400,
  "message": "Validation failed or service-specific message",
  "error": "Bad Request"
}
```

Observed error strategy:

- Guards return or throw `401 Unauthorized`, `403 Forbidden`, `429 Too Many Requests`, or `503 Service Unavailable` before controller logic runs.
- DTO validation failures are produced by the global `ValidationPipe` as `400 Bad Request`.
- Services throw Nest exceptions such as `BadRequestException`, `UnauthorizedException`, `ForbiddenException`, `NotFoundException`, and `ConflictException` for domain failures.
- Some controllers catch service errors and rethrow `HttpException` with route-specific messages.
- File download endpoints write headers and buffers directly to the Express response.

## Security Considerations

- Passwords are hashed with bcrypt before persistence. Existing validation compares plaintext credentials with bcrypt hashes.
- JWTs are signed with `JWT_SECRET`; Docker compose provides development defaults, but production must provide a strong secret.
- The JWT cookie is HTTP-only and uses `secure: true` only when `NODE_ENV=production`.
- CORS allows reflected origins with credentials. This is convenient for development but should be reviewed for production deployment policy.
- `PermissionsGuard` provides tenant isolation when request body, params, or query include `schoolId`.
- Rate limiting is global. Defaults are `RATE_LIMIT_MAX=120` and `RATE_LIMIT_WINDOW_SEC=60`; `/auth/login` has a stricter `5/60s` decorator.
- Maintenance mode can block authenticated non-super-admin traffic through platform settings.
- File upload routes use Multer. Some services additionally validate file presence, size, or mimetype; review each upload service when changing upload behavior.
- Enrollment tokens are encrypted/decrypted with AES-256-GCM using `ENCRYPTION_KEY` or a fallback default key. Production should set `ENCRYPTION_KEY`.
- Web push requires VAPID key environment variables. Compose files include development defaults.

## Deployment and Runtime Configuration

### Local backend commands

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

The backend listens on `PORT` or `5000` by default.

### Docker commands

```bash
# Production-like full stack

docker compose up -d --build

# Development full stack with hot reload

docker compose -f docker-compose.dev.yml up --build
```

The container entrypoint waits for PostgreSQL, generates Prisma Client, applies migrations or `prisma db push` depending on environment, optionally seeds in development, and then starts Nest.

### Backend environment variables

| Variable | Used by | Purpose/default visible in code or compose |
|---|---|---|
| `PORT` | `main.ts` | HTTP port; defaults to `5000` |
| `NODE_ENV` | auth cookie, Prisma pool, Docker | Enables secure cookies in production and controls pool idle behavior |
| `DATABASE_URL` | Prisma config, entrypoint, seed | Primary PostgreSQL connection string |
| `DATABASE_POOL_URL` | `PrismaService` | Preferred runtime PostgreSQL pool URL when set |
| `DATABASE_POOL_MAX` | `PrismaService` | PostgreSQL pool size; defaults to `25` |
| `DATABASE_POOL_CONNECTION_TIMEOUT_MS` | `PrismaService`, seed | Pool connection timeout; defaults to `5000` |
| `DATABASE_POOL_IDLE_TIMEOUT_MS` | `PrismaService`, seed | Pool idle timeout; defaults to `30000` |
| `DATABASE_SEED_POOL_MAX` | seed | Seed script pool size; compose defaults to `2` |
| `JWT_SECRET` | `AuthModule`, `JwtStrategy` | JWT signing and validation secret |
| `REDIS_URL` | `RedisService` | Optional Redis connection for cache/rate-limit state |
| `RATE_LIMIT_MAX` | `RateLimitGuard` | Default request limit per window; defaults to `120` |
| `RATE_LIMIT_WINDOW_SEC` | `RateLimitGuard` | Default rate-limit window; defaults to `60` seconds |
| `TRUST_PROXY` | `main.ts` | Express trust proxy setting; defaults to `1` |
| `WEB_PUSH_PUBLIC_KEY` | `NotificationService` | VAPID public key and frontend push key source |
| `WEB_PUSH_PRIVATE_KEY` | `NotificationService` | VAPID private key |
| `WEB_PUSH_CONTACT_EMAIL` | `NotificationService` | VAPID subject; defaults to `mailto:admin@example.com` in service fallback |
| `ENCRYPTION_KEY` | `EnrollmentService` | Key material for enrollment token encryption; code has a development fallback |
| `FRONTEND_URL` | `EnrollmentController` | Frontend enrollment URL base; defaults to `http://localhost:3000` |
| `ATTENDANCE_CUTOFF_DISABLED` | `AttendanceService` | Disables attendance cutoff logic when configured |
| `DISABLE_ATTENDANCE_CUTOFF` | `AttendanceService` | Alternate cutoff-disable flag |
| `PRISMA_SCHEMA_SYNC` | `docker-entrypoint.sh` | `push` runs `prisma db push`; otherwise migrations are used |
| `RUN_MIGRATIONS` | `docker-entrypoint.sh` | Controls migration execution; compose defaults to `1` |
| `PRISMA_SKIP_SEED` | `docker-entrypoint.sh` | Skips development seed when `1` |
| `SEED_SUPERADMIN_PASSWORD` | `prisma/seed.ts` | Seed super admin password; defaults to `12345678` |

### Backend npm scripts

| Command | Description |
|---|---|
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run build` | Generate Prisma Client and compile Nest with `tsc` builder |
| `npm run start` | Start Nest |
| `npm run start:dev` | Start development watcher through `scripts/dev-watch.cjs` |
| `npm run start:debug` | Start Nest in debug/watch mode |
| `npm run start:prod` | Run `dist/main.js` |
| `npm run lint` | Run ESLint with fixes |
| `npm run test` | Run Jest unit tests |
| `npm run test:e2e` | Run Jest e2e config |
| `npm run prisma:seed` | Seed the database |

## API Documentation

Base URL in local development is usually `http://localhost:5000`. Unless a route explicitly streams a file, successful responses are Nest-serialized JSON or strings returned from the controller/service. Routes using DTO bodies are validated by the global validation pipe. Inline object bodies are listed by field names when they are declared in the controller signature. Path parameters are shown in each route; query parameters and bodies are listed in the request input column.

Common error cases across the catalog:

- `400 Bad Request`: invalid DTO/body/query data or service-level domain validation failure.
- `401 Unauthorized`: missing, invalid, expired JWT, or invalid login credentials.
- `403 Forbidden`: role, permission, tenant, or subscription feature denial.
- `404 Not Found`: requested entity does not exist or is not visible to the tenant.
- `409 Conflict`: uniqueness or state conflict where services throw `ConflictException`.
- `429 Too Many Requests`: global or route-specific rate limit exceeded.
- `503 Service Unavailable`: maintenance mode for authenticated non-super-admin users on non-exempt paths.

<details>
<summary>Academic Year (17 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `POST` | `/academic-years` | Create academic year | `body: CreateAcademicYearDto` | JSON result from createAcademicYear() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/academic-years` | Get academic years | `query: schoolId` | JSON result from getAcademicYears() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/academic-years/active` | Get active academic year | `query: schoolId` | JSON result from getActiveAcademicYear() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/academic-years/:id` | Get academic year by id | - | JSON result from getAcademicYearById() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PUT` | `/academic-years/:id` | Update academic year | `body: UpdateAcademicYearDto` | JSON result from updateAcademicYear() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PUT` | `/academic-years/:id/activate` | Activate academic year | - | JSON result from activateAcademicYear() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PUT` | `/academic-years/:id/curriculum-type` | Update curriculum type | `body: { curriculumType }` | JSON result from updateCurriculumType() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/academic-years/:id` | Delete academic year | - | JSON result from deleteAcademicYear() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/academic-years/terms/current` | Get the current term for a school | `query: schoolId` | JSON result from getCurrentTerm() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/academic-years/:id/terms` | Get all terms for a specific academic year | - | JSON result from getTermsByAcademicYear() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/academic-years/:id/terms` | Create a custom term/period for an academic year | `body: CreateTermDto` | JSON result from createTerm() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/academic-years/terms/:termId` | Get a specific term by ID | - | JSON result from getTermById() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PUT` | `/academic-years/terms/:termId` | Update a term/period | `body: UpdateTermDto` | JSON result from updateTerm() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PUT` | `/academic-years/terms/:termId/lock` | Lock or unlock a term/period | `body: { isLocked: boolean }` | JSON result from lockTerm() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/academic-years/terms/:termId` | Delete a term/period | - | JSON result from deleteTerm() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/academic-years/:id/period-weights` | Get period weights for an academic year | - | JSON result from getPeriodWeights() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/academic-years/:id/validate-weights` | Validate period weights (check if they sum to 100%) | - | JSON result from validatePeriodWeights() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Announcement (6 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `POST` | `/announcements` | Create announcement | `body: CreateAnnouncementDto` | JSON result from create() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/announcements` | List announcements | `query: role` | JSON result from findAll() | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/announcements/active-count` | Get active count | `query: role` | JSON result from getActiveCount() | 401 missing/invalid JWT; 429 rate limit; 503 maintenance mode |
| `GET` | `/announcements/:id` | Get one announcement | - | JSON result from findOne() | 401 missing/invalid JWT; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PUT` | `/announcements/:id` | Update announcement | `body: UpdateAnnouncementDto` | JSON result from update() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/announcements/:id` | Delete announcement | - | JSON result from delete() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>App (5 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `GET` | `/health` | Get health | - | JSON { status, timestamp } | 429 rate limit |
| `GET` | `/` | Get hello | - | text string | 429 rate limit |
| `GET` | `/protected` | Get protected | - | JSON result from getProtected() | 401 missing/invalid JWT; 429 rate limit; 503 maintenance mode |
| `GET` | `/admin` | Get admin | - | JSON result from getAdmin() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/permissions` | Get permissions | - | JSON result from getPermissions() | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Assessments (15 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `GET` | `/assessments/teacher/me` | Get teacher assessments | `query: ListAssessmentsFilterDto` | JSON result from getTeacherAssessments() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/assessments/subjects/:id/score-entry` | Get score entry | - | JSON result from getScoreEntry() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/assessments/subjects/:id/scores` | Save scores | `body: SaveAssessmentScoresDto` | JSON result from saveScores() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/assessments/student/upcoming` | Get student upcoming | `query: academicYearId` | JSON result from getStudentUpcoming() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/assessments/student/results` | Get student results | `query: academicYearId, termId` | JSON result from getStudentResults() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/assessments/parent/child/:childId/upcoming` | Get parent upcoming | `query: academicYearId` | JSON result from getParentUpcoming() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/assessments/parent/child/:childId/results` | Get parent results | `query: academicYearId, termId` | JSON result from getParentResults() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/assessments/registrar/missing-marks` | Get missing marks | `query: ListAssessmentsFilterDto` | JSON result from getMissingMarks() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/assessments/config/weights` | Get weights | - | JSON result from getWeights() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `PUT` | `/assessments/config/weights` | Update weights | `body: UpdateAssessmentWeightsDto` | JSON result from updateWeights() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/assessments` | Create assessment | `body: CreateAssessmentDto` | JSON result from createAssessment() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/assessments` | List assessments | `query: ListAssessmentsFilterDto` | JSON result from listAssessments() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/assessments/:id` | Get assessment by id | - | JSON result from getAssessmentById() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/assessments/:id/subjects` | Add subjects | `body: AddAssessmentSubjectsDto` | JSON result from addSubjects() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/assessments/:id/lock` | Lock assessment | - | JSON result from lockAssessment() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Attendance (20 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `GET` | `/attendance/today` | Get today's timetable slots for the authenticated teacher | `query: AttendanceQueryDto` | JSON result from getTodayTimetable() | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `POST` | `/attendance/session/:slotId` | Open/create an attendance session for a timetable slot | `body: CreateAttendanceSessionDto` | JSON result from createSession() | 401 missing/invalid JWT; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/attendance/students` | Get students for a class (for attendance marking) | `query: classId, sectionId, className, section, date` | JSON result from getStudentsForAttendance() | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/attendance/session/:id` | Get a specific attendance session | - | JSON result from getSession() | 401 missing/invalid JWT; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/attendance/session/:sessionId/records` | Mark attendance for multiple students | `body: BulkMarkAttendanceDto` | JSON result from markAttendance() | 401 missing/invalid JWT; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PUT` | `/attendance/session/:id/submit` | Submit an attendance session (locks it) | - | JSON result from submitSession() | 401 missing/invalid JWT; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/attendance/me` | Get the authenticated student's own attendance | `query: AttendanceQueryDto` | JSON result from getMyAttendance() | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/attendance/me/summary` | Get attendance summary for the authenticated student | `query: AttendanceQueryDto` | JSON result from getMySummary() | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/attendance/student/:id` | Get attendance for a specific student (student's own, parent's child) | `query: AttendanceQueryDto` | JSON result from getStudentAttendance() | 401 missing/invalid JWT; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/attendance/student/:id/summary` | Get attendance summary for a specific student | `query: AttendanceQueryDto` | JSON result from getStudentSummary() | 401 missing/invalid JWT; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/attendance/sessions` | Get all attendance sessions with filters (Admin only) | `query: startDate, endDate, classId, status, grade, section` | JSON result from getAllSessions() | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/attendance/summary` | Get attendance summary (Admin only) | `query: AttendanceQueryDto` | JSON result from getSummary() | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/attendance/missing` | Get classes with no attendance recorded for a given date (Admin only) | `query: date, grade, section` | JSON result from getMissing() | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `POST` | `/attendance/missing/notify` | Notify homeroom teachers about missing attendance (Admin only) | `query: date, grade, section` | JSON result from notifyMissing() | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `POST` | `/attendance/check-reminders` | Manually trigger the attendance reminder check (for testing) | - | JSON result from triggerReminderCheck() | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `PUT` | `/attendance/record/:id` | Override an attendance record (Admin only) | `body: OverrideAttendanceDto` | JSON result from overrideRecord() | 401 missing/invalid JWT; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/attendance/dashboard/teacher` | Get teacher dashboard data | - | JSON result from getTeacherDashboard() | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/attendance/dashboard/student` | Get student dashboard data | - | JSON result from getStudentDashboard() | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/attendance/dashboard/parent/:studentId` | Get parent dashboard data for a specific child | - | JSON result from getParentDashboard() | 401 missing/invalid JWT; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/attendance/dashboard/admin` | Get admin dashboard data | `query: date, startDate, endDate, grade, section, range` | JSON result from getAdminDashboard() | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Auth (22 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `POST` | `/auth/login` | Login | - | JSON auth payload; sets Authentication cookie | 401 invalid credentials; 429 rate limit; custom rate limit 5/60s |
| `POST` | `/auth/logout` | Logout | - | JSON message; clears Authentication cookie | 401 missing/invalid JWT; 429 rate limit |
| `POST` | `/auth/register/admin` | SUPER_ADMIN creates ADMIN | `body: { email, password, name, schoolId }` | JSON result from registerAdmin() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/auth/register/it-manager` | SUPER_ADMIN creates IT_MANAGER | `body: { email, password, name, schoolId }` | JSON result from registerItManager() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/auth/register/teacher` | ADMIN creates TEACHER | `body: { email, name }` | JSON result from registerTeacher() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/auth/register/student` | ADMIN creates STUDENT | `body: { email, password, name }` | JSON result from registerStudent() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/auth/register/parent` | ADMIN creates PARENT | `body: { email, password, name }` | JSON result from registerParent() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/auth/register/registrar` | ADMIN creates REGISTRAR | `body: { email, password, name }` | JSON result from registerRegistrar() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/auth/register/student-self` | STUDENT self-registration and enrollment | `body: { email, password, name, schoolId, academicYear, gradeId, gender, address, phone, emergencyContact, ... }; files: multipart` | JSON result from registerStudentSelf() | 400 invalid body/file; 429 rate limit |
| `GET` | `/auth/users` | Get users | `query: role` | JSON result from getUsers() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/auth/users/teachers` | Get teachers | `query: page, limit, search` | JSON result from getTeachers() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/auth/users/me` | Get current user | - | JSON result from getCurrentUser() | 401 missing/invalid JWT; 429 rate limit; 503 maintenance mode |
| `GET` | `/auth/users/:id` | Get user | - | JSON result from getUser() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PUT` | `/auth/users/me` | Update current user | `body: { name, phone, avatarUrl, theme }` | JSON result from updateCurrentUser() | 401 missing/invalid JWT; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `PUT` | `/auth/users/:id` | Update user | `body: { email, password, name }` | JSON result from updateUser() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/auth/users/:id/avatar` | Upload user avatar | `file: multipart` | JSON result from uploadUserAvatar() | 401 missing/invalid JWT; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PATCH` | `/auth/users/me/theme` | Update theme | `body: { theme }` | JSON result from updateTheme() | 401 missing/invalid JWT; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/auth/users/:id` | Delete user | - | JSON result from deleteUser() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/auth/change-password` | Change password on first login (enforced when mustChangePassword is true) | `body: { currentPassword, newPassword, confirmPassword }` | JSON result from changePassword() | 401 missing/invalid JWT; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/auth/request-password-reset` | Request password reset (sends reset token) | `body: { username }` | JSON result from requestPasswordReset() | 400 invalid body/file; 429 rate limit |
| `POST` | `/auth/reset-password` | Reset password using token | `body: { token, newPassword, confirmPassword }` | JSON result from resetPassword() | 400 invalid body/file; 429 rate limit |
| `POST` | `/auth/admin/reset-user-password/:userId` | Admin forces password reset for a user | `body: { temporaryPassword }` | JSON result from adminResetUserPassword() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Auto Assignment (6 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `POST` | `/auto-assignment/enrollments/:enrollmentId/auto-assign` | Trigger auto-assignment for a specific enrollment This is called after enrollment is approved | - | JSON AutoAssignmentResult | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/auto-assignment/bulk` | Bulk auto-assignment for multiple enrollments Useful for batch operations Body: { enrollmentIds: string[] } | `body: { enrollmentIds }` | JSON AutoAssignmentResult[] | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/auto-assignment/enrollments/:enrollmentId/reassign` | Re-run auto-assignment for a student Use this if a previous assignment needs to be redone | - | JSON AutoAssignmentResult | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/auto-assignment/students/:studentId/assignment` | Get current assignment info for a student | - | JSON result from getStudentAssignment() | 401 missing/invalid JWT; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/auto-assignment/capacity` | Get class capacity information for a grade Useful for planning and reporting | `query: academicYear, grade` | JSON result from getClassCapacity() | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `POST` | `/auto-assignment/approve-and-assign` | Trigger auto-assignment on enrollment approval This is an alternative endpoint that combines approval + assignment Body: { enrollmentId: string } | `body: { enrollmentId }` | JSON AutoAssignmentResult | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Bulk Upload (9 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `POST` | `/bulk-upload/staff` | Upload and process bulk STAFF from CSV file | `body: BulkUploadDto; file: multipart` | JSON result from uploadBulkStaff() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/bulk-upload/students-auto` | Upload and process bulk STUDENTS with auto-assignment from CSV file | `body: BulkUploadDto; file: multipart` | JSON result from uploadBulkStudentsAuto() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/bulk-upload/report` | Download credential report as CSV | `body: { credentials }` | text/csv download | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/bulk-upload/template` | Get sample CSV template | `query: type` | text/csv download | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/bulk-upload/credentials` | Get pending credentials for the school | `query: includeSent, role, limit, offset` | JSON result from getPendingCredentials() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `POST` | `/bulk-upload/credentials/:id/mark-sent` | Mark a credential as sent | `body: { sentVia }` | JSON result from markCredentialSent() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/bulk-upload/credentials/:id/delete` | Delete a pending credential | - | JSON result from deleteCredential() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/bulk-upload/credentials/export` | Export credentials as CSV | `query: includeSent, role` | text/csv download | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `POST` | `/bulk-upload/rebalance` | Rebalance students in a specific grade across sections | `body: { gradeName, academicYear }` | JSON result from rebalanceSections() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Calendar (6 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `GET` | `/calendar/ethiopian-year` | Get current Ethiopian year Returns the current Ethiopian year based on today's Gregorian date | - | JSON result from getCurrentEthiopianYear() | 429 rate limit |
| `GET` | `/calendar/current` | Get current date information in both calendars | - | JSON result from getCurrentDate() | 429 rate limit |
| `GET` | `/calendar/convert` | Convert a specific Gregorian date to Ethiopian date | `query: date` | JSON result from convertDate() | 429 rate limit |
| `GET` | `/calendar/convert-to-gregorian` | Convert Ethiopian date to Gregorian | `query: year, month, day` | JSON result from convertToGregorian() | 429 rate limit |
| `GET` | `/calendar/school/:schoolId/mode` | Get calendar mode for a specific school | - | JSON result from getSchoolCalendarMode() | 404 missing resource; 429 rate limit |
| `GET` | `/calendar/new-year-check` | Check if Ethiopian new year period (around September 11) | `query: date` | JSON result from checkNewYear() | 429 rate limit |

</details>

<details>
<summary>Class (9 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `POST` | `/classes` | Create class | `body: any` | JSON result from create() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/classes` | List classs | `query: academicYearId` | JSON result from findAll() | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/classes/:id` | Get one class | - | JSON result from findOne() | 401 missing/invalid JWT; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/classes/grades/list` | Get grades | - | JSON result from getGrades() | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/classes/search` | Search | `query: q, academicYearId` | JSON result from search() | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `PUT` | `/classes/:id` | Update class | `body: any` | JSON result from update() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PUT` | `/classes/:id/homeroom-teacher` | Set homeroom teacher | `body: any` | JSON result from setHomeroomTeacher() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/classes/:id/students` | Get students by class | `query: sectionId, search, page, limit, orderBy` | JSON result from getStudentsByClass() | 401 missing/invalid JWT; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/classes/:id/stats` | Note: Class deletion is not included in the new permission philosophy | `query: sectionId` | JSON result from getClassStats() | 401 missing/invalid JWT; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Class Subject (9 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `POST` | `/class-subjects` | Create class subject assignment | `body: CreateClassSubjectDto` | JSON result from create() | 401 missing/invalid JWT; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/class-subjects/bulk-assign` | Bulk assign | `body: BulkAssignDto` | JSON result from bulkAssign() | 401 missing/invalid JWT; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/class-subjects` | List class subject assignments | `query: academicYearId` | JSON result from findAll() | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/class-subjects/matrix` | Get matrix | `query: academicYearId` | JSON result from getMatrix() | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/class-subjects/by-class/:classId` | Find by class | `query: sectionId` | JSON result from findByClass() | 401 missing/invalid JWT; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/class-subjects/by-teacher/:teacherId` | Find by teacher | `query: academicYearId` | JSON result from findByTeacher() | 401 missing/invalid JWT; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/class-subjects/:id` | Get one class subject assignment | - | JSON result from findOne() | 401 missing/invalid JWT; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PUT` | `/class-subjects/:id` | Update class subject assignment | `body: UpdateClassSubjectDto` | JSON result from update() | 401 missing/invalid JWT; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/class-subjects/:id` | Delete class subject assignment | - | JSON result from delete() | 401 missing/invalid JWT; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Communication (9 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `POST` | `/communications` | Create a new communication entry Teachers, Admins, Parents can create | `body: CreateCommunicationDto` | JSON result from createCommunication() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/communications` | Get communications list with filtering | `query: CommunicationQueryDto` | JSON result from getCommunications() | 401 missing/invalid JWT; 429 rate limit; 503 maintenance mode |
| `GET` | `/communications/unread-count` | Get unread communications count | - | JSON result from getUnreadCount() | 401 missing/invalid JWT; 429 rate limit; 503 maintenance mode |
| `GET` | `/communications/my-count` | Get my communications count (user-specific count for menu/navbar) Returns count of communications relevant to the current user | `query: status` | JSON result from getMyCount() | 401 missing/invalid JWT; 429 rate limit; 503 maintenance mode |
| `GET` | `/communications/:id` | Get a single communication by ID | - | JSON result from getCommunicationById() | 401 missing/invalid JWT; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PUT` | `/communications/:id/status` | Update communication status (OPEN -> CLOSED) | `body: UpdateCommunicationStatusDto` | JSON result from updateStatus() | 401 missing/invalid JWT; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/communications/:id` | Delete a communication (Admin only) | - | JSON result from deleteCommunication() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/communications/:id/replies` | Add a reply to a communication (Parents/Teachers/Admins can reply) | `body: CreateCommunicationReplyDto` | JSON result from addReply() | 401 missing/invalid JWT; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/communications/replies/:replyId` | Delete a reply | - | JSON result from deleteReply() | 401 missing/invalid JWT; 404 missing resource; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Credential (16 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `GET` | `/credentials/preview/student/:schoolId` | Generate a preview of the next student admission number | `query: academicYear` | JSON result from previewStudentId() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/credentials/preview/staff/:schoolId` | Generate a preview of the next staff ID | `query: role, academicYear` | JSON result from previewStaffId() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/credentials/generate/bulk` | Generate bulk credentials for export | `body: GenerateCredentialsDto` | JSON result from generateBulkCredentials() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/credentials/students/bulk` | Bulk create students with auto-generated credentials | `body: BulkStudentCreationDto` | JSON result from bulkCreateStudents() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/credentials/staff/bulk` | Bulk create staff with auto-generated credentials | `body: { staff, name, email, role, phone, academicYear }` | JSON result from bulkCreateStaff() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/credentials/staff/create` | Unified staff creation - supports both auto-generated and custom credentials | `body: CreateStaffDto` | JSON result from createStaff() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/credentials/students/create` | Unified student creation - supports both auto-generated and custom credentials | `body: { students, name, email, phone, motherName, motherPhone, parentEmail, generateCredentials, username, password, ... }` | JSON result from createStudents() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/credentials/export/csv` | Export credentials to CSV | `body: BulkCredentialResult[]` | text/csv download | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/credentials/slips` | Generate credential slips for printing | `body: BulkCredentialResult[]` | JSON result from generateCredentialSlips() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/credentials/validate-password` | Validate password strength | `body: { password: string }` | JSON result from validatePassword() | 401 missing/invalid JWT; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/credentials/check-username/:username` | Check username uniqueness | - | JSON result from checkUsername() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/credentials` | List all credentials (pending and sent) | `query: status, role, search, page, limit` | JSON result from listCredentials() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/credentials/stats` | Get credential statistics | - | JSON result from getCredentialStats() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `POST` | `/credentials/:id/send` | Mark credential as sent | `body: { sentVia: string = 'MANUAL' }` | JSON result from markAsSent() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/credentials/:id` | Delete a pending credential | - | JSON result from deleteCredential() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/credentials/assign-roll-numbers` | Assign roll numbers by alphabet order | `body: { academicYearId }` | JSON result from assignRollNumbersByAlphabet() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Dashboard (8 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `GET` | `/dashboard` | Get dashboard | - | JSON UniversalDashboardResponseDto | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/dashboard/teacher` | Role-specific endpoints (optional, for direct access) | - | JSON UniversalDashboardResponseDto | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/dashboard/student` | Get student dashboard | - | JSON UniversalDashboardResponseDto | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/dashboard/parent` | Get parent dashboard | - | JSON UniversalDashboardResponseDto | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/dashboard/admin` | Get admin dashboard | - | JSON UniversalDashboardResponseDto | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/dashboard/it-manager` | Get it manager dashboard | - | JSON UniversalDashboardResponseDto | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/dashboard/registrar` | Get registrar dashboard | - | JSON UniversalDashboardResponseDto | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/dashboard/superadmin` | Get superadmin dashboard | - | JSON UniversalDashboardResponseDto | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Data Quality (1 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `GET` | `/data-quality/student-consistency` | Get student consistency report | - | JSON result from getStudentConsistencyReport() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Discipline (6 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `POST` | `/discipline` | Create incident | `body: CreateIncidentDto & { reportedBy: string }` | JSON result from createIncident() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/discipline` | Get incidents | `query: studentId, severity, status` | JSON result from getIncidents() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/discipline/student/:studentId` | Get student incidents | - | JSON result from getStudentIncidents() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/discipline/:id` | Get incident | - | JSON result from getIncident() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PUT` | `/discipline/:id` | Update incident | `body: UpdateIncidentDto` | JSON result from updateIncident() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/discipline/:id` | Delete incident | - | JSON result from deleteIncident() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Enrollment (17 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `GET` | `/enrollment/schools` | List schools available for public enrollment | - | JSON result from getPublicSchools() | 429 rate limit |
| `POST` | `/enrollment/request` | Create a new enrollment request | `body: CreateEnrollmentRequestDto` | JSON result from createEnrollmentRequest() | 400 invalid body/file; 429 rate limit |
| `GET` | `/enrollment/capacity/:grade` | Check enrollment capacity for a grade (public) | `query: schoolId` | JSON result from checkCapacity() | 404 missing resource; 429 rate limit |
| `GET` | `/enrollment/grades` | Get available grades for enrollment (public) | `query: schoolId` | JSON result from getAvailableGrades() | 429 rate limit |
| `GET` | `/enrollment/status` | Check if enrollment is open for a school (public) | `query: schoolId` | JSON result from getEnrollmentStatus() | 429 rate limit |
| `GET` | `/enrollment/requests` | List enrollment requests (Admin/Registrar) | `query: EnrollmentQueryDto` | JSON result from listRequests() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/enrollment/stats` | Get enrollment statistics | `query: schoolId, academicYearId` | JSON result from getStats() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/enrollment/requests/:id` | Get single enrollment request | `query: schoolId` | JSON result from getRequest() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/enrollment/requests/:id/approve` | Approve enrollment request | `query: schoolId` | JSON result from approveEnrollment() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/enrollment/requests/:id/reject` | Reject enrollment request | `body: { reason: string }; query: schoolId` | JSON result from rejectEnrollment() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/enrollment/requests/:id/waitlist` | Waitlist enrollment request | `query: schoolId` | JSON result from waitlistEnrollment() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/enrollment/requests/:id` | Cancel enrollment request (by requester or admin) | `query: schoolId` | JSON result from cancelEnrollment() | 401 missing/invalid JWT; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/enrollment/requests/:id/send-credentials` | Send credentials to approved student | `body: { sendEmail, sendSms }; query: schoolId` | JSON result from sendCredentials() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/enroll` | Enrollment landing page Returns JSON with school info for frontend to redirect | `query: key` | JSON result from enrollmentLanding() | 429 rate limit |
| `GET` | `/enroll/verify` | Verify enrollment token (for frontend to validate) | `query: token` | JSON result from verifyToken() | 429 rate limit |
| `POST` | `/enroll/approve` | Approve enrollment with auto-section assignment | `body: ApproveEnrollmentDto` | JSON result from approveEnrollment() | 400 invalid body/file; 429 rate limit |
| `POST` | `/enroll/reject` | Reject enrollment | `body: RejectEnrollmentDto` | JSON result from rejectEnrollment() | 400 invalid body/file; 429 rate limit |

</details>

<details>
<summary>Event (7 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `POST` | `/events` | Create event | `body: CreateEventDto` | JSON result from create() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/events` | List events | `query: role` | JSON result from findAll() | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/events/upcoming-count` | Get upcoming count | `query: role` | JSON result from getUpcomingCount() | 401 missing/invalid JWT; 429 rate limit; 503 maintenance mode |
| `GET` | `/events/active-count` | Get active count | `query: role` | JSON result from getActiveCount() | 401 missing/invalid JWT; 429 rate limit; 503 maintenance mode |
| `GET` | `/events/:id` | Get one event | - | JSON result from findOne() | 401 missing/invalid JWT; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PUT` | `/events/:id` | Update event | `body: UpdateEventDto` | JSON result from update() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/events/:id` | Delete event | - | JSON result from delete() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Exams (22 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `POST` | `/exams` | ==================== ADMIN ENDPOINTS ==================== | `body: CreateExamDto` | JSON result from createExam() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/exams` | Get exams | `query: GetExamsFilterDto` | JSON result from getExams() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/exams/teacher/me` | ==================== TEACHER ENDPOINTS (static routes before :id) ==================== | `query: academicYearId, termId` | JSON result from getTeacherExams() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/exams/student/upcoming` | ==================== STUDENT ENDPOINTS (static routes before :id) ==================== | - | JSON result from getMyUpcomingExams() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/exams/student/results` | Get my results | - | JSON result from getMyResults() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/exams/parent/child/:childId/upcoming` | ==================== PARENT ENDPOINTS (static routes before :id) ==================== | - | JSON result from getChildUpcomingExams() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/exams/parent/child/:childId/results` | Get child results | - | JSON result from getChildResults() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/exams/form-data/assessment` | ==================== FORM DATA ENDPOINTS (static routes before :id) ==================== | `query: any` | JSON result from getAssessmentFormData() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `POST` | `/exams/publish` | Publish term results | `body: { academicYear, termId, classId }` | JSON result from publishTermResults() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/exams/:id/results` | Enter exam results | `body: BulkExamResultDto` | JSON result from enterExamResults() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/exams/:id` | ==================== PARAMETERIZED ROUTES (after static ones) ==================== | - | JSON result from getExamById() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PUT` | `/exams/:id` | Update exam | `body: UpdateExamDto` | JSON result from updateExam() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/exams/:id` | Delete exam | - | JSON result from deleteExam() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/exams/seating/plans` | Get all seating plans for the school | - | JSON SeatingPlanResponseDto[] | 401 missing/invalid JWT; 403 role denied; 403 subscription feature; 429 rate limit; 503 maintenance mode |
| `GET` | `/exams/seating/type/:examType/seating-plan` | Get seating plan by exam type (MID_TERM, FINAL, etc.) | - | JSON SeatingPlanResponseDto / null | 401 missing/invalid JWT; 403 role denied; 403 subscription feature; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/exams/seating/type/:examType/seating-plan` | Create a new seating plan for an exam type | `body: CreateSeatingPlanDto` | JSON SeatingPlanResponseDto | 401 missing/invalid JWT; 403 role denied; 403 subscription feature; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/exams/seating/plan/:id/students` | Delete student assignments (for regeneration) | - | JSON result from deleteSeatingStudents() | 401 missing/invalid JWT; 403 role denied; 403 subscription feature; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/exams/seating/plan/:id/generate` | Generate seating assignments for a plan | - | JSON SeatingOverviewResponseDto | 401 missing/invalid JWT; 403 role denied; 403 subscription feature; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/exams/seating/plan/:id` | Get seating overview | - | JSON SeatingOverviewResponseDto | 401 missing/invalid JWT; 403 role denied; 403 subscription feature; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/exams/seating/plan/:id/print` | Generate printable PDF seating list | - | application/pdf download | 401 missing/invalid JWT; 403 role denied; 403 subscription feature; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/exams/seating/plan/:id/excel` | Export seating to Excel | - | XLSX download | 401 missing/invalid JWT; 403 role denied; 403 subscription feature; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/exams/seating/plan/:id` | Delete seating plan and all associated data | - | JSON void | 401 missing/invalid JWT; 403 role denied; 403 subscription feature; 404 missing resource; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Finance (28 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `POST` | `/finance/fee-structures` | Create fee structure | `body: CreateFeeStructureDto` | JSON result from createFeeStructure() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/finance/fee-structures` | List fee structures | `query: schoolId, academicYearId, termId` | JSON result from listFeeStructures() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `PUT` | `/finance/fee-structures/:id` | Update fee structure | `body: { schoolId: string }; body: UpdateFeeStructureDto` | JSON result from updateFeeStructure() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/finance/fee-structures/:id` | Delete fee structure | `query: schoolId` | JSON result from deleteFeeStructure() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/finance/fee-structures` | Clear fee structures | `query: schoolId, academicYearId` | JSON result from clearFeeStructures() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `POST` | `/finance/student-fees/generate` | Generate student fees | `body: GenerateStudentFeesDto` | JSON result from generateStudentFees() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/finance/student-fees` | List student fees | `query: StudentFeesQueryDto` | JSON result from listStudentFees() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `POST` | `/finance/payments/record` | Record payment | `body: RecordPaymentDto` | JSON result from recordPayment() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/finance/payments/:paymentId/reverse` | Reverse payment | `body: { schoolId, reason }` | JSON result from reversePayment() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/finance/reminders/period-fees` | Send period fee reminders | `body: { schoolId, termId }` | JSON result from sendPeriodFeeReminders() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/finance/reports/daily` | Daily report | `query: ReportQueryDto` | JSON result from dailyReport() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/finance/payments` | Get all payments | `query: schoolId` | JSON result from getAllPayments() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/finance/reports/monthly` | Monthly report | `query: schoolId, month, year` | JSON result from monthlyReport() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/finance/reports/outstanding` | Outstanding | `query: schoolId, academicYearId, termId, calendarType` | JSON result from outstanding() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `POST` | `/finance/fees/mark-overdue` | Mark overdue | `body: { schoolId, academicYearId, termId }` | JSON result from markOverdue() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/finance/reports/overdue` | Overdue report | `query: schoolId, academicYearId, termId` | JSON result from overdueReport() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/finance/audit-logs` | Audit logs | `query: schoolId, entityType, entityId, limit` | JSON result from auditLogs() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/finance/reports/student/:studentId/history` | Student history | `query: schoolId` | JSON result from studentHistory() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/finance/student-fees/:studentId` | Student fee summary endpoint for parent/student portal | `query: schoolId, academicYearId, termId` | JSON result from getStudentFeeSummary() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/finance/curriculum-info` | Get curriculum info and terms for finance module | `query: schoolId, academicYearId` | JSON result from getCurriculumInfo() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `POST` | `/finance/fee-calculation/installments` | Calculate installment fees based on school's fee collection mode Returns the breakdown without creating anything | `body: CalculateInstallmentFeesDto` | JSON result from calculateInstallmentFees() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/finance/fee-structures/generate-installments` | Auto-generate installment fee structures based on school's fee collection mode Creates multiple fee structures from a single annual fee | `body: GenerateInstallmentFeesDto` | JSON result from generateInstallmentFees() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/finance/fee-collection-mode` | Get fee collection mode for a school | `query: schoolId` | JSON result from getFeeCollectionMode() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `POST` | `/finance/discount-policies` | Create a new discount policy | `body: { name, discountType, discountValue, isActive, criteria }` | JSON result from createDiscountPolicy() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/finance/discount-policies` | List all discount policies | `query: includeInactive` | JSON result from listDiscountPolicies() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `PUT` | `/finance/discount-policies/:id` | Update a discount policy | `body: { name, discountType, discountValue, isActive, criteria }` | JSON result from updateDiscountPolicy() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/finance/discount-policies/:id` | Delete a discount policy | - | JSON result from deleteDiscountPolicy() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/finance/student-fees/:studentFeeId/apply-discount` | Apply discount policy to a student's fee | `body: { discountPolicyId }` | JSON result from applyDiscountPolicy() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Grading (41 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `GET` | `/grading/teacher/assignments` | Get teacher's assigned subjects for grade entry | `query: academicYear` | JSON result from getTeacherAssignments() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/grading/teacher/students` | Get students for grade entry | `query: academicYear, termId, classId, sectionId, subjectId` | JSON result from getStudentsForGradeEntry() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `POST` | `/grading/teacher/grades` | Enter grade for a student | `body: CreateGradeDto` | JSON result from enterGrade() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/grading/teacher/grades/bulk` | Bulk enter grades for multiple students | `body: BulkGradeEntryDto` | JSON result from bulkEnterGrades() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/grading/teacher/grades/bulk-csv` | Bulk upload grades from CSV file | `body: { academicYear, termId, classId, sectionId, subjectId, assessmentType }; file: multipart` | JSON result from bulkUploadFromCsv() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/grading/teacher/grades/template` | Download CSV template for grade entry | `query: classId, sectionId, subjectId, academicYear` | JSON result from downloadTemplate() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `PUT` | `/grading/teacher/grades/:id/draft` | Save grade as draft | - | JSON result from saveDraft() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PUT` | `/grading/teacher/grades/:id/submit` | Submit grade to registrar | - | JSON result from submitToRegistrar() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/grading/teacher/grades/submit-all` | Submit all grades for a subject to registrar | `query: academicYear, termId, classId, sectionId, subjectId` | JSON result from submitAllToRegistrar() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/grading/registrar/review` | Get submitted grades for review | `query: GradeFilterDto` | JSON result from getGradesForReview() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/grading/registrar/assessments` | Get assessment scores for review | `query: GradeFilterDto` | JSON result from getAssessmentScoresForReview() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `PUT` | `/grading/registrar/grades/:id/review` | Review a grade (approve/reject) | `body: ApproveGradeDto` | JSON result from reviewGrade() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/grading/registrar/grades/bulk-approve` | Bulk approve grades | `body: { gradeIds: string[] }` | JSON result from bulkApproveGrades() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/grading/registrar/grades/bulk-reject` | Bulk reject grades | `body: { gradeIds, comment }` | JSON result from bulkRejectGrades() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/grading/registrar/reports/subject` | Get subject performance report | `query: academicYear, termId, subjectId` | JSON result from getSubjectPerformanceReport() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/grading/registrar/reports/class` | Get class summary report | `query: academicYear, termId, classId, sectionId` | JSON result from getClassSummaryReport() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/grading/student/grades` | Get own grades | `query: academicYear, termId` | JSON result from getStudentGrades() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/grading/parent/grades/:studentId` | Get child's grades with analysis (GPA, ranking, curriculum periods) | `query: academicYear, termId` | JSON result from getChildGradesWithAnalysis() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/grading/admin/calculate-rankings` | Calculate rankings for curriculum period (usually called when term ends) | `body: { academicYearId, termId, classId, sectionId }` | JSON result from calculateRankings() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/grading/admin/grading-components` | Create grading components | `body: GradingComponentDto[]` | JSON result from createGradingComponents() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/grading/admin/grading-components` | Get grading components | - | JSON result from getGradingComponents() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/grading/teacher/assessment-types` | Get assessment types config (for teachers - lightweight version) | - | JSON result from getTeacherAssessmentTypes() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/grading/parent/grading-components` | Get grading components for parents viewing published report cards | - | JSON result from getParentGradingComponents() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/grading/admin/assessment-types` | Get assessment types config (admin only) | - | JSON result from getAssessmentTypes() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `POST` | `/grading/admin/assessment-types` | Create assessment types config (admin only) | `body: { code, name, percentage }` | JSON result from createAssessmentTypes() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/grading/admin/grade-scales` | Create grade scale | `body: GradeScaleDto[]` | JSON result from createGradeScales() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/grading/admin/grade-scales` | Get grade scale | - | JSON result from getGradeScale() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `POST` | `/grading/admin/teacher-assignments` | Assign teacher to subject/class/section | `body: TeacherAssignmentDto` | JSON result from assignTeacher() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/grading/admin/teacher-assignments/:id` | Remove teacher assignment | - | JSON result from removeTeacherAssignment() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/grading/student/final-grades` | Student: View final aggregated grades with period breakdown Dynamically calculates based on curriculum type and period weights | `query: academicYear, classId, studentId` | JSON result from getStudentFinalGrades() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/grading/parent/final-grades/:studentId` | Parent: View child's final aggregated grades with period breakdown | `query: academicYear, classId` | JSON result from getChildFinalGrades() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/grading/subject/final-grade` | Calculate final grade for a specific subject | `query: studentId, subjectId, academicYear` | JSON result from calculateSubjectFinalGrade() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/grading/student/financial-clearance` | Verify student financial clearance - check if student can receive grades Returns whether student has any outstanding fees | `query: studentId, academicYear, termId, checkOverdueOnly` | JSON result from verifyFinancialClearance() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/grading/admin/entry-progress` | Get mark entry progress - percentage of grades entered per subject/class | `query: academicYear, term` | JSON result from getEntryProgress() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `POST` | `/grading/admin/send-reminder` | Send reminder to teachers who haven't completed grade entry | `body: { academicYear, term }` | JSON result from sendReminder() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/grading/admin/publish-checklist` | Get publish checklist - assessments ready to be published | `query: academicYear, term` | JSON result from getPublishChecklist() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `POST` | `/grading/admin/bulk-publish` | Bulk publish results to students and parents | `body: { assessmentIds, notifyParents }` | JSON result from bulkPublish() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/grading/admin/promotion-list` | Get promotion list - students with promotion recommendations | `query: academicYear` | JSON result from getPromotionList() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `POST` | `/grading/admin/promotion-override` | Override promotion recommendation for a student | `body: { studentId, recommendation }` | JSON result from overridePromotion() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/grading/admin/confirm-promotions` | Confirm promotions for the academic year | `body: { academicYear, notifyParents }` | JSON result from confirmPromotions() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/grading/admin/bulk-confirm-promotions` | Bulk confirm all promotions | `body: { academicYear, notifyParents }` | JSON result from bulkConfirmPromotions() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Lesson (15 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `POST` | `/lessons` | Create Lesson Bundle - All-in-One lesson creation Includes: Lesson + Homework + Resources + Ethiopian curriculum tags | `body: CreateLessonBundleDto` | JSON result from createBundle() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `PUT` | `/lessons/bundle/:id` | Update Lesson Bundle | `body: UpdateLessonBundleDto` | JSON result from updateBundle() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PATCH` | `/lessons/:id/submit-review` | Submit lesson for review (DRAFT -> PENDING_REVIEW) | - | JSON result from submitForReview() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PATCH` | `/lessons/:id/approve` | Approve lesson (PENDING_REVIEW -> PUBLISHED) - HoD only | - | JSON result from approveLesson() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PATCH` | `/lessons/:id/reject` | Reject lesson (PENDING_REVIEW -> DRAFT) - HoD only | `body: { reason: string }` | JSON result from rejectLesson() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/lessons/pending-review` | Get lessons pending review (For HoD dashboard) | `query: departmentId` | JSON result from getPendingReview() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `POST` | `/lessons/homework/:homeworkId/submit` | Submit homework (Student) | `body: SubmitHomeworkDto` | JSON result from submitHomework() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/lessons/submissions/:submissionId/grade` | Grade homework (Teacher) | `body: GradeHomeworkDto` | JSON result from gradeHomework() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/lessons/coverage/report` | Get Lesson Coverage Report | `query: LessonCoverageQueryDto` | JSON result from getCoverageReport() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/lessons/:id/with-lock` | Get lesson with content lock check (for students with outstanding fees) | - | JSON result from getLessonWithLock() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/lessons` | NOTE: legacy simple create removed. Use POST /lessons with the bundle payload. | `query: LessonQueryDto` | JSON result from findAll() | 401 missing/invalid JWT; 429 rate limit; 503 maintenance mode |
| `GET` | `/lessons/form-data` | Get form data | - | JSON result from getFormData() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/lessons/:id` | Get one lesson | - | JSON result from findOne() | 401 missing/invalid JWT; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PUT` | `/lessons/:id` | Update lesson | `body: UpdateLessonDto` | JSON result from update() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/lessons/:id` | Delete lesson | - | JSON result from delete() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Messaging (6 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `GET` | `/messages/staff` | List staff | `query: search` | JSON result from listStaff() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `POST` | `/messages/conversation` | Create conversation | `body: CreateConversationDto` | JSON result from createConversation() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/messages` | List conversations | - | JSON result from listConversations() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/messages/:conversationId` | Get conversation messages | - | JSON result from getConversationMessages() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/messages/:conversationId` | Send message | `body: SendMessageDto` | JSON result from sendMessage() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PATCH` | `/messages/read/:messageId` | Mark read | - | JSON result from markRead() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Notification (10 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `GET` | `/notifications` | Get notifications | `query: unreadOnly, limit, type, types, category` | JSON result from getNotifications() | 401 missing/invalid JWT; 429 rate limit; 503 maintenance mode |
| `GET` | `/notifications/categories` | Get categories | - | JSON result from getCategories() | 401 missing/invalid JWT; 429 rate limit; 503 maintenance mode |
| `GET` | `/notifications/unread-count` | Get unread count | `query: types` | JSON result from getUnreadCount() | 401 missing/invalid JWT; 429 rate limit; 503 maintenance mode |
| `GET` | `/notifications/preferences` | Get preferences | - | JSON result from getPreferences() | 401 missing/invalid JWT; 429 rate limit; 503 maintenance mode |
| `PUT` | `/notifications/preferences` | Update preferences | `body: UpdateNotificationPreferencesDto` | JSON result from updatePreferences() | 401 missing/invalid JWT; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/notifications/push/public-key` | Get push public key | - | JSON result from getPushPublicKey() | 401 missing/invalid JWT; 429 rate limit; 503 maintenance mode |
| `POST` | `/notifications/push/subscriptions` | Save push subscription | `body: SavePushSubscriptionDto` | JSON result from savePushSubscription() | 401 missing/invalid JWT; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/notifications/push/subscriptions` | Remove push subscription | `body: RemovePushSubscriptionDto` | JSON result from removePushSubscription() | 401 missing/invalid JWT; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/notifications/:id/read` | Mark as read | - | JSON result from markAsRead() | 401 missing/invalid JWT; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/notifications/mark-all-read` | Mark all as read | `body: { types }` | JSON result from markAllAsRead() | 401 missing/invalid JWT; 400 invalid body/file; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Parent (11 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `GET` | `/parents/me/profile` | Get current parent's profile with children Parent can only view their own profile | - | JSON result from getMyProfile() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/parents/me/children` | Get current parent's children Parent can only view their own children | - | JSON result from getMyChildren() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/parents/me/teachers` | Get my related teachers | - | JSON result from getMyRelatedTeachers() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/parents/me/children/:childId` | Get a specific child details for current parent Parent can only view their own children's details | - | JSON result from getMyChildById() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/parents` | Get all parents for a school School read roles can view parent directory | `query: search, page, limit` | JSON result from getParents() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/parents/:id` | Get parent by ID School read roles can view parent profiles | - | JSON result from getParentById() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PUT` | `/parents/:id` | Update parent profile Only ADMIN can update parent profiles | `body: UpdateParentDto` | JSON result from updateParent() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/parents` | Create a new parent (without linking to student) Only ADMIN can create parents | `body: CreateParentDto` | JSON result from createParent() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/parents/create-and-link` | Create parent and link to student in one operation This is the recommended flow for adding parents Only ADMIN can perform this action | `body: CreateParentAndLinkDto` | JSON result from createParentAndLink() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/parents/link` | Link existing parent to student Only ADMIN can perform this action | `body: LinkParentToStudentDto` | JSON result from linkParentToStudent() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/parents/unlink/:parentId/:studentId` | Unlink parent from student Only ADMIN can perform this action | - | JSON result from unlinkParentFromStudent() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Period Time (4 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `GET` | `/api/period-time` | List period times | - | JSON result from findAll() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `POST` | `/api/period-time` | Create period time | `body: any` | JSON result from create() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `PUT` | `/api/period-time/:id` | Update period time | `body: any` | JSON result from update() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/api/period-time/:id` | Delete period time | - | JSON result from delete() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Platform Settings (6 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `GET` | `/platform/settings` | Get all settings | - | JSON result from getAllSettings() | 401 missing/invalid JWT; 429 rate limit |
| `GET` | `/platform/settings/flags` | Get feature flags | - | JSON result from getFeatureFlags() | 401 missing/invalid JWT; 429 rate limit |
| `GET` | `/platform/settings/:key` | Get setting | - | JSON result from getSetting() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit |
| `PUT` | `/platform/settings/:key` | Set setting | `body: { value }` | JSON result from setSetting() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 404 missing resource; 429 rate limit |
| `DELETE` | `/platform/settings/:key` | Delete setting | - | JSON result from deleteSetting() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit |
| `POST` | `/platform/settings/batch` | Batch update | `body: Record<string, any>` | JSON result from batchUpdate() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit |

</details>

<details>
<summary>Rbac (10 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `POST` | `/permissions` | Create permission | `body: { name, description, module, action }` | JSON result from createPermission() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/permissions` | Get permissions | - | JSON result from getPermissions() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/permissions/:id` | Get permission by id | - | JSON result from getPermissionById() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/permissions/module/:module` | Get permissions by module | - | JSON result from getPermissionsByModule() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PUT` | `/permissions/:id` | Update permission | `body: { name, description, module, action }` | JSON result from updatePermission() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/permissions/:id` | Delete permission | - | JSON result from deletePermission() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/roles` | Get all roles | - | JSON result from getAllRoles() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/roles/:role/permissions` | Get role permissions | - | JSON result from getRolePermissions() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/roles/:role/permissions` | Assign permission to role | `body: { permissionId }` | JSON result from assignPermissionToRole() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/roles/:role/permissions/:permissionId` | Remove permission from role | - | JSON result from removePermissionFromRole() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Registrar (11 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `POST` | `/registrar/students` | Create student account (ADMIN or REGISTRAR) | `body: { email, name, academicYear, gradeId, gender, address, phone, emergencyContact, name, phone, ... }` | JSON result from createStudent() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/registrar/students` | Get all students for the school | `query: status, grade` | JSON result from getStudents() | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/registrar/students/:id` | Get student by ID | - | JSON result from getStudentById() | 401 missing/invalid JWT; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PUT` | `/registrar/students/:id` | Update student details | `body: { name, gender, address, phone, emergencyContact, name, phone, relationship, guardianName, guardianPhone, ... }` | JSON result from updateStudent() | 401 missing/invalid JWT; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/registrar/enrollments/pending` | Get pending enrollments | - | JSON result from getPendingEnrollments() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/registrar/enrollments` | Get all enrollments with optional status filter | `query: status, page` | JSON result from getEnrollments() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `POST` | `/registrar/enrollments/:id/approve` | Approve enrollment with class assignment (manual) | `body: { className, section, rollNumber }` | JSON result from approveEnrollment() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/registrar/enrollments/:id/auto-approve` | Approve enrollment with automatic class/section assignment | - | JSON result from approveEnrollmentAuto() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/registrar/enrollments/:id/reject` | Reject enrollment | `body: { rejectionReason: string }` | JSON result from rejectEnrollment() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/registrar/students/:id/assign-class` | Assign/Update class for student | `body: { className, section, rollNumber }` | JSON result from assignClass() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/registrar/students/:id/documents` | Upload documents for student | `body: { documents: any[] }` | JSON result from uploadDocuments() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Report Card (29 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `GET` | `/promotion/candidates/:classId` | Get promotion candidates | `query: { academicYear }` | JSON result from getPromotionCandidates() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/promotion/next-classes/:classId` | Get next class options | `query: { toAcademicYear }` | JSON result from getNextClassOptions() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/promotion/single` | Promote student | `body: { studentId, fromClassId, toClassId, fromAcademicYear, toAcademicYear }` | JSON result from promoteStudent() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/promotion/bulk` | Bulk promote | `body: { fromClassId, toClassId, fromAcademicYear, toAcademicYear, studentIds, promoteAll, minAverageGrade, minAttendance }` | JSON result from bulkPromote() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/promotion/history` | Get promotion history | `query: { academicYear, classId, status }` | JSON result from getPromotionHistory() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `POST` | `/report-cards/generate` | Generate report card | `body: { studentId, classId, sectionId, academicYearId, termId, termName }` | JSON result from generateReportCard() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/report-cards/bulk-generate` | Bulk generate | `body: { classId, sectionId, academicYearId, termId, termName }` | JSON result from bulkGenerate() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/report-cards` | Get report cards | `query: { classId, academicYear, term, status, studentId }` | JSON result from getReportCards() | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/report-cards/publish-summary` | Get publish summary | `query: { academicYearId, termId }` | JSON result from getPublishSummary() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/report-cards/parent-presentation` | Get parent presentation report | `query: { academicYearId, fromTermId, toTermId, classId }` | JSON result from getParentPresentationReport() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/report-cards/parent-presentation/pdf` | Download parent presentation pdf | `query: { academicYearId, fromTermId, toTermId, classId }` | application/pdf download | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/report-cards/parent-presentation/excel` | Download parent presentation excel | `query: { academicYearId, fromTermId, toTermId, classId }` | XLSX download | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/report-cards/student/published` | Get my published report cards | `query: { academicYear, term }` | JSON result from getMyPublishedReportCards() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/report-cards/student/:studentId` | Get student report cards | - | JSON result from getStudentReportCards() | 401 missing/invalid JWT; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/report-cards/parent/:childId/published` | Get published report cards for parent | `query: { academicYear, term }` | JSON result from getPublishedReportCardsForParent() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/report-cards/class/:classId` | Get class report cards | `query: { academicYear, term }` | JSON result from getClassReportCards() | 401 missing/invalid JWT; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/report-cards/certificate-template` | Get certificate template | - | JSON result from getCertificateTemplate() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `PUT` | `/report-cards/certificate-template` | Save certificate template | `body: { template }` | JSON result from saveCertificateTemplate() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/report-cards/certificate-template/watermark` | Upload certificate watermark | `file: multipart` | JSON result from uploadCertificateWatermark() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/report-cards/:id/certificate` | Get certificate payload | - | JSON result from getCertificatePayload() | 401 missing/invalid JWT; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/report-cards/:id/certificate-pdf` | Generate certificate pdf | - | application/pdf download | 401 missing/invalid JWT; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/report-cards/certificate-pdf/bulk` | Generate certificate bulk zip | `body: { reportCardIds }` | application/zip download | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/report-cards/:id` | Get report card by id | - | JSON result from getReportCardById() | 401 missing/invalid JWT; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PUT` | `/report-cards/:id/remarks` | Update remarks | `body: { teacherRemarks, principalRemarks, coCurricular, behavior }` | JSON result from updateRemarks() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PUT` | `/report-cards/publish` | Publish report cards | `body: { ids }` | JSON result from publishReportCards() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/report-cards/publish/class` | Publish results for class | `body: { academicYearId, termId, classId, notifyStudents, notifyParents }` | JSON result from publishResultsForClass() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `PUT` | `/report-cards/unpublish` | Unpublish report cards | `body: { ids }` | JSON result from unpublishReportCards() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/report-cards/calculate-ranks` | Calculate ranks | `body: { classId, academicYear, term }` | JSON result from calculateRanks() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/report-cards/:id` | Delete report card | - | JSON result from deleteReportCard() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>School (6 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `POST` | `/schools` | Create school | `body: { name, email, address, phone }` | JSON result from createSchool() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/schools` | Get schools | - | JSON result from getSchools() | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/schools/:id` | Get school by id | - | JSON result from getSchoolById() | 401 missing/invalid JWT; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PUT` | `/schools/:id` | Update school | `body: { name, email, address, phone, code, logo, logoUrl }` | JSON result from updateSchool() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/schools/:id/logo` | Upload logo | `file: multipart` | JSON result from uploadLogo() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/schools/:id` | Delete school | - | JSON result from deleteSchool() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>School Settings (5 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `GET` | `/schools/:schoolId/settings` | Get all settings | - | JSON result from getAllSettings() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/schools/:schoolId/settings/:key` | Get setting | - | JSON result from getSetting() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PUT` | `/schools/:schoolId/settings/:key` | Set setting | `body: { value }` | JSON result from setSetting() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/schools/:schoolId/settings/:key` | Delete setting | - | JSON result from deleteSetting() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/schools/:schoolId/settings/batch` | Batch update | `body: Record<string, any>` | JSON result from batchUpdate() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Search (1 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `GET` | `/search` | Search | `query: q` | JSON result from search() | 401 missing/invalid JWT; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Section (6 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `GET` | `/sections` | Note: Section creation is now handled automatically via bulk upload Manual section creation is disabled to maintain randomized distribution | `query: classId, classIds, search` | JSON result from findAll() | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/sections/:id` | Get one section | - | JSON result from findOne() | 401 missing/invalid JWT; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PUT` | `/sections/:id` | Update section | `body: any` | JSON result from update() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PUT` | `/sections/:id/homeroom-teacher` | Note: Auto-creation is also handled via bulk upload | `body: any` | JSON result from setHomeroomTeacher() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/sections/:id` | Delete section | - | JSON result from delete() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PUT` | `/sections/sync-capacity` | Sync all section capacities to match school setting DEFAULT_SECTION_CAPACITY | - | JSON result from syncCapacity() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Siren (10 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `GET` | `/api/siren/schedules` | ==================== SCHEDULES (CRUD) ==================== | - | JSON result from getSchedules() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `POST` | `/api/siren/schedules` | Create schedule | `body: any` | JSON result from createSchedule() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `PUT` | `/api/siren/schedules/:id` | Update schedule | `body: any` | JSON result from updateSchedule() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/api/siren/schedules/:id` | Delete schedule | - | JSON result from deleteSchedule() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/api/siren/events` | ==================== EVENTS (HISTORY) ==================== | `query: limit` | JSON result from getEvents() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/api/siren/hardware` | ==================== HARDWARE (CONFIG + TEST) ==================== | - | JSON result from getHardwareConfig() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `POST` | `/api/siren/hardware` | Save hardware config | `body: any` | JSON result from saveHardwareConfig() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `PUT` | `/api/siren/hardware/:id` | Update hardware config | `body: any` | JSON result from updateHardwareConfig() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/api/siren/hardware/test` | Test hardware | `body: { webhookUrl, timeout }` | JSON result from testHardware() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/api/siren/trigger` | ==================== MANUAL TRIGGER ==================== | `body: { type }` | JSON result from manualTrigger() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Student (17 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `POST` | `/students` | Create student | `body: CreateStudentDto` | JSON result from createStudent() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/students` | FIXED: Handle classId param for attendance/offline cache (proxies ClassService.getStudentsByClass) | `query: classId, sectionId, section, status, grade, page, limit, search, rollNumber` | JSON result from getStudents() | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/students/id-cards` | Get students for id cards | `query: grade, section, academicYear, search, studentIds` | JSON result from getStudentsForIdCards() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/students/id-cards/template` | Get id card template | - | JSON result from getIdCardTemplate() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `PUT` | `/students/id-cards/template` | Save id card template | `body: { template }` | JSON result from saveIdCardTemplate() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/students/id-cards/template/watermark` | Upload id card watermark | `file: multipart` | JSON result from uploadIdCardWatermark() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/students/id-cards/:studentId/pdf` | Generate id card pdf | - | application/pdf download | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/students/id-cards/bulk-pdf` | Generate id cards bulk pdf | `body: { studentIds }` | application/zip download | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/students/:id` | Get student by id | - | JSON result from getStudentById() | 401 missing/invalid JWT; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PUT` | `/students/:id` | Update student | `body: UpdateStudentDto` | JSON result from updateStudent() | 401 missing/invalid JWT; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/students/me/class` | Get my class assignment | - | JSON result from getMyClassAssignment() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/students/homeroom/me` | Get my homeroom students | - | JSON result from getMyHomeroomStudents() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/students/enrollments/pending` | Get pending enrollments | - | JSON result from getPendingEnrollments() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `POST` | `/students/enrollments/:id/approve` | Approve enrollment | `body: ApproveEnrollmentDto` | JSON result from approveEnrollment() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/students/enrollments/:id/reject` | Reject enrollment | `body: { rejectionReason: string }` | JSON result from rejectEnrollment() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/students/:id/assign-class` | REGISTRAR: Assign/Update class for student | `body: AssignClassDto` | JSON result from assignClass() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/students/:id/documents` | REGISTRAR: Upload documents for student | `body: { documents: any[] }` | JSON result from uploadDocuments() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Subjects (5 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `POST` | `/subjects` | Create subject | `body: { name, code, isActive }` | JSON result from create() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/subjects` | List subjects | - | JSON result from findAll() | 401 missing/invalid JWT; 429 rate limit; 503 maintenance mode |
| `GET` | `/subjects/:id` | Get one subject | - | JSON result from findOne() | 401 missing/invalid JWT; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PUT` | `/subjects/:id` | Update subject | `body: { name, code, isActive }` | JSON result from update() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/subjects/:id` | Delete subject | - | JSON result from delete() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Subscription (13 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `GET` | `/subscription/plans` | Get all plans | - | JSON result from getAllPlans() | 401 missing/invalid JWT; 429 rate limit; 503 maintenance mode |
| `GET` | `/subscription/plans/:id` | Get plan by id | - | JSON result from getPlanById() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/subscription/plans` | Create plan | `body: { name, tier, description, features }` | JSON result from createPlan() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `PUT` | `/subscription/plans/:id` | Update plan | `body: { name, description, features, isActive }` | JSON result from updatePlan() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/subscription/plans/:id` | Delete plan | - | JSON result from deletePlan() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/subscription/assign` | Assign plan to school | `body: { schoolId, planId }` | JSON result from assignPlanToSchool() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/subscription/school/:schoolId` | Get school plan | - | JSON result from getSchoolPlan() | 401 missing/invalid JWT; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/subscription/school/:schoolId/subscription` | Get school subscription | - | JSON result from getSchoolSubscription() | 401 missing/invalid JWT; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/subscription/subscription` | Create subscription | `body: { schoolId, planId, endDate }` | JSON result from createSubscription() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `PUT` | `/subscription/subscription/:id` | Update subscription | `body: { status, endDate }` | JSON result from updateSubscription() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/subscription/plan/:planId/schools` | Get schools by plan | - | JSON result from getSchoolsByPlan() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/subscription/schools` | Get schools with plans | `query: planId` | JSON result from getSchoolsWithPlans() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/subscription/check-feature` | Check feature | `query: schoolId, feature` | JSON result from checkFeature() | 401 missing/invalid JWT; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Sync (7 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `POST` | `/api/sync/attendance` | Sync one attendance payload | `body: SyncAttendanceDto` | JSON SyncResponseDto | 401 missing/invalid JWT; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/api/sync/attendance/batch` | Batch sync attendance | `body: BatchSyncDto` | JSON result from batchSyncAttendance() | 401 missing/invalid JWT; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/api/sync/students` | Get students for offline sync | `body: { classIds, sectionIds }` | JSON result from getStudentsForOffline() | 401 missing/invalid JWT; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/api/sync/conflicts` | List sync conflicts | - | JSON result from getConflicts() | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `POST` | `/api/sync/conflicts/:id/resolve` | Resolve conflict | `body: { resolution, data }` | JSON result from resolveConflict() | 401 missing/invalid JWT; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/api/sync/status` | Get sync status | - | JSON SyncStatusDto | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/api/sync/health` | Get sync health | - | JSON { status, timestamp } | 401 missing/invalid JWT; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Teacher (4 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `GET` | `/teachers` | Get teachers | `query: page, limit, search, status, classId, sectionId, subject` | JSON result from getTeachers() | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/teachers/:id` | Get teacher by id | - | JSON result from getTeacherById() | 401 missing/invalid JWT; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/teachers/me/assignments` | Get the authenticated teacher's assigned classes and sections Keep this static route before :id/assignments so "me" is not treated as a teacher id and routed through the admin-only endpoint. | - | JSON result from getMyAssignments() | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/teachers/:id/assignments` | Get teacher assignments | - | JSON result from getTeacherAssignments() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Templates (4 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `GET` | `/templates` | List templates | `query: type` | JSON result from list() | 401 missing/invalid JWT; 403 role denied; 429 rate limit; 503 maintenance mode |
| `POST` | `/templates/upload` | Upload | `body: { name, type }; file: multipart` | JSON result from upload() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `PATCH` | `/templates/:id/activate` | Activate | - | JSON result from activate() | 401 missing/invalid JWT; 403 role denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/templates/fields` | Save fields | `body: { template_id, fields }` | JSON result from saveFields() | 401 missing/invalid JWT; 403 role denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |

</details>

<details>
<summary>Timetable Slot (11 endpoints)</summary>

| Method | Route | Description | Request input | Response | Error cases |
|---|---|---|---|---|---|
| `POST` | `/timetable-slots` | Create timetable slot | `body: CreateTimetableSlotDto` | JSON result from create() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `GET` | `/timetable-slots` | List timetable slots | `query: dayOfWeek, classId, teacherId, academicYearId` | JSON result from findAll() | 401 missing/invalid JWT; 403 permission/tenant denied; 429 rate limit; 503 maintenance mode |
| `GET` | `/timetable-slots/class/:classId` | Find by class | - | JSON result from findByClass() | 401 missing/invalid JWT; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/timetable-slots/teacher/:teacherId` | Find by teacher | - | JSON result from findByTeacher() | 401 missing/invalid JWT; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `POST` | `/timetable-slots/bulk` | Bulk create | `body: { slots }` | JSON result from bulkCreate() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `POST` | `/timetable-slots/auto-generate` | Auto generate | `body: { classId, sectionId, academicYearId, apply, periodRequirements, classSubjectId, periodsPerWeek }` | JSON result from autoGenerate() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/timetable-slots/class/:classId/section/:sectionId` | Delete by class section | - | JSON result from deleteByClassSection() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/timetable-slots/grid/class/:classId` | Get timetable grid | `query: sectionId, academicYearId` | JSON result from getTimetableGrid() | 401 missing/invalid JWT; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `GET` | `/timetable-slots/:id` | Get one timetable slot | - | JSON result from findOne() | 401 missing/invalid JWT; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `PATCH` | `/timetable-slots/:id` | Update timetable slot | `body: UpdateTimetableSlotDto` | JSON result from update() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 400 invalid body/file; 404 missing resource; 429 rate limit; 503 maintenance mode |
| `DELETE` | `/timetable-slots/:id` | Delete timetable slot | - | JSON result from delete() | 401 missing/invalid JWT; 403 role denied; 403 permission/tenant denied; 404 missing resource; 429 rate limit; 503 maintenance mode |

</details>
