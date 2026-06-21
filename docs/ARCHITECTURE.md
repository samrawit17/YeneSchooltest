# YeneSchool — Full Architecture Context File

> **Purpose**: Single source of truth for AI agents working on this codebase. Read this first before making any changes.
>
> **AI agent onboarding**: After this file, read `AGENTS.md` for the first-read protocol, task routing, and documentation index.

---

## 1. Project Identity

| Field | Value |
|---|---|
| Product | **YeneSchool** (School Management System) |
| Company | HUMAN Tech PLC — Addis Ababa, Ethiopia |
| Former name | `lama-dev-next-dashboard` (package.json still reflects this) |
| Status | ~50% complete (many features scaffolded, some incomplete) |
| Version | 0.5.0 |

---

## 2. Tech Stack (Actual)

| Layer | Technology |
|---|---|
| Backend API | NestJS 11 (TypeScript) — port **8001** |
| Database | PostgreSQL 16 via **Prisma 7** ORM |
| Connection pooling | `@prisma/adapter-pg` with configurable pool size/timeouts |
| Cache / Queue | Redis 7 |
| Frontend | Next.js 14 (App Router, React 18) — port **8000** |
| Styling | Tailwind CSS 3 + Shadcn/ui + Radix UI primitives |
| State (server) | **TanStack Query v5** (`@tanstack/react-query`) |
| State (client) | **Zustand** (theme, language, UI) + React Context (auth, calendar, subscription, breadcrumb) |
| HTTP client | **Axios** with interceptors for 401/403/503 |
| Forms | React Hook Form + Zod |
| Charts | Recharts, Visx |
| Calendar | react-big-calendar + `ethiopian-calendar-new` + `ethiopian-date` |
| i18n | **Custom system**: Zustand store + JSON message files (`frontend/src/messages/*.json`) + message registry |
| Offline DB | **Dexie.js** (IndexedDB wrapper) for offline attendance |
| Notifications | Web Push API (`web-push` npm package) |
| File handling | Multer (uploads), Sharp (images), ExcelJS (spreadsheets), PDFKit/PDF-lib (PDF), Archiver (zip) |
| Auth | JWT (cookie-based) + Passport.js strategies |
| RBAC | 8 roles with fine-grained permissions |
| Reverse proxy | **Nginx** with rate limiting |
| Containerization | Docker / Docker Compose |
| Target server | Hetzner |

---

## 3. Directory Layout

```
/home/usman/Desktop/SMS/
├── backend/                  # NestJS API server (port 8001)
│   ├── src/
│   │   ├── main.ts           # Bootstrap: CORS, security headers, validation, cookie parser
│   │   ├── app.module.ts     # Root module — imports 51 feature modules
│   │   ├── app.controller.ts # /health, /, /protected, /admin, /permissions
│   │   ├── app.service.ts
│   │   ├── prisma/            # PrismaModule (global), PrismaService (connection pool)
│   │   ├── auth/              # AuthModule — login, register, JWT, passwords, user CRUD
│   │   ├── rbac/              # Role-based access control (RolePermission, UserPermission)
│   │   ├── school/            # School CRUD (tenant root)
│   │   ├── student/           # Student profiles
│   │   ├── teacher/           # Teacher profiles
│   │   ├── parent/            # Parent profiles
│   │   ├── registrar/         # Registrar operations
│   │   ├── academic-year/     # Academic years (Ethiopian/Gregorian), terms
│   │   ├── class/             # Classes (grade + section groups)
│   │   ├── section/           # Sections/streams (A, B, C...)
│   │   ├── subjects/          # Subject definitions
│   │   ├── class-subject/     # Links subjects to class+section with assigned teachers
│   │   ├── timetable-slot/    # Timetable management
│   │   ├── period-time/       # Configurable period times
│   │   ├── enrollment/        # Student enrollment + self-registration
│   │   ├── calendar/          # Calendar operations
│   │   ├── calendar/attendance/ # Offline-first attendance module
│   │   ├── grading/           # Grading system (components, scores, scales, workflow)
│   │   ├── assessments/       # Assessment scheduling + score entry
│   │   ├── exams/             # Exam management (midterm/final/quiz), seating, national exams
│   │   ├── practice-exams/    # Online MCQ/True-False/Short Answer with auto-grading
│   │   ├── report-card/       # Report card generation (DRAFT→PUBLISHED→ARCHIVED)
│   │   ├── finance/           # Full financial management
│   │   ├── communication/     # Student-parent-teacher communication book
│   │   ├── messaging/         # Internal real-time messaging
│   │   ├── announcement/      # School announcements
│   │   ├── event/             # School events
│   │   ├── notification/      # Push notifications (Web Push)
│   │   ├── lesson/            # Content model (lessons/homework/assignments)
│   │   ├── siren/             # Bell/siren scheduling + hardware webhook
│   │   ├── discipline/        # Student discipline tracking
│   │   ├── sync/              # Offline data sync + conflict resolution
│   │   ├── bulk-upload/       # CSV/Excel bulk import
│   │   ├── dashboard/         # Role-specific dashboard aggregation
│   │   ├── search/            # Global search across entities
│   │   ├── credential/        # Credential generation (usernames/passwords)
│   │   ├── templates/         # Document templates (ID cards, certificates)
│   │   ├── subscription/      # Plans/subscriptions (CORE/STANDARD/ULTIMATE)
│   │   ├── platform-settings/ # Global platform settings (key/value)
│   │   ├── school-settings/   # Per-school settings
│   │   ├── data-quality/      # Data integrity checks
│   │   ├── backup/            # Database backup management
│   │   ├── audit/             # System audit logging
│   │   ├── translation/       # Multi-language translation (Azure/Google/disabled)
│   │   └── infrastructure/    # Rate limiting, system-wide concerns
│   ├── prisma/
│   │   └── schema.prisma      # Database schema — 2673 lines, 50+ models
│   └── Dockerfile             # Multi-stage build (builder→production)
│
├── frontend/                  # Next.js 14 application (port 8000)
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx             # Root layout (fonts, providers, dark mode)
│   │   │   ├── providers.tsx          # Provider hierarchy
│   │   │   ├── page.tsx               # Public landing page (1131 lines)
│   │   │   ├── globals.css            # Tailwind + shadcn styles
│   │   │   ├── sign-in/               # Login page (619 lines)
│   │   │   ├── enroll/                # Student self-enrollment
│   │   │   ├── enrollments/           # Enrollment management
│   │   │   ├── forgot-password/
│   │   │   ├── change-password/
│   │   │   ├── access-denied/         # 403/404 pages
│   │   │   ├── schools/               # School-specific pages
│   │   │   ├── s/                     # Short URL redirects
│   │   │   ├── api/                   # Next.js API route handlers
│   │   │   └── (dashboard)/           # Authenticated dashboard routes
│   │   │       ├── layout.tsx         # Sidebar + navbar + breadcrumb + footer
│   │   │       ├── page.tsx           # Role-aware dashboard home
│   │   │       ├── admin/             # Admin role: attendance, exams, finance, timetable, etc.
│   │   │       ├── teacher/           # Teacher role: grading, lessons, attendance, exams
│   │   │       ├── student/           # Student role: grades, timetable, attendance, lessons
│   │   │       ├── parent/            # Parent role: children, fees, grades, discipline
│   │   │       ├── finance/           # Finance role: fees, payments, payroll, reports
│   │   │       ├── superadmin/        # Super admin: schools, admins, backups, subscriptions
│   │   │       ├── list/              # Generic list views (users, staff, exams, etc.)
│   │   │       ├── settings/          # Settings pages
│   │   │       ├── messages/          # Internal messaging
│   │   │       ├── notifications/     # Push notification history
│   │   │       ├── profile/           # User profile
│   │   │       └── help/              # Help page
│   │   │
│   │   ├── components/                # Shared UI components
│   │   │   ├── Navbar.tsx             # Top nav: user, notifications, search, language
│   │   │   ├── Menu.tsx               # Role-aware sidebar menu
│   │   │   ├── Breadcrumb.tsx         # Dynamic breadcrumbs
│   │   │   ├── Table.tsx / TableSearch.tsx / Pagination.tsx  # Data table kit
│   │   │   ├── FormModal.tsx / InputField.tsx               # Form components
│   │   │   ├── GlobalSearch.tsx       # Cross-entity search
│   │   │   ├── BigCalendar.tsx / WeeklyCalendar.tsx         # Calendar views
│   │   │   ├── ThemeProvider.tsx      # Dark/light/system theme
│   │   │   ├── ToastProvider.tsx      # Sonner toasts
│   │   │   ├── RouteTransition.tsx    # Page transition animations
│   │   │   ├── FeatureGuard.tsx       # Subscription-based feature gating
│   │   │   ├── AccessDenied.tsx
│   │   │   ├── PushNotificationManager.tsx
│   │   │   ├── StudentIdCard.tsx
│   │   │   ├── charts/               # Recharts/Visx chart components
│   │   │   ├── ui/                   # Shadcn primitives (button, card, dialog, etc.)
│   │   │   ├── finance/
│   │   │   ├── forms/
│   │   │   ├── siren/
│   │   │   ├── timetable/
│   │   │   ├── communications/
│   │   │   ├── announcement/
│   │   │   ├── students/
│   │   │   ├── filters/
│   │   │   └── translation/
│   │   │
│   │   ├── context/                   # React Contexts
│   │   │   ├── AuthContext.tsx         # Auth state: user, login, logout, updateUser
│   │   │   ├── CalendarContext.tsx     # Gregorian vs Ethiopian calendar
│   │   │   ├── AcademicYearContext.tsx # Active academic year
│   │   │   ├── BreadcrumbContext.tsx   # Breadcrumb trail
│   │   │   └── SubscriptionContext.tsx # Plan/feature gating
│   │   │
│   │   ├── lib/                       # Utilities, stores, API layer
│   │   │   ├── api/
│   │   │   │   ├── core.ts            # Axios instance + interceptors (401→sign-in, 403→access-denied, 503→maintenance)
│   │   │   │   ├── index.ts           # Re-exports all 41 API modules
│   │   │   │   ├── auth.ts            # Login, logout, register, user CRUD, passwords
│   │   │   │   ├── schools.ts         # School CRUD
│   │   │   │   ├── students.ts        # Student profiles + registrar ops
│   │   │   │   ├── teachers.ts        # Teacher profiles
│   │   │   │   ├── classes.ts         # Class + section CRUD
│   │   │   │   ├── academics.ts       # Academic years, terms
│   │   │   │   ├── subjects.ts        # Subjects
│   │   │   │   ├── admin.ts           # Roles, permissions, auto-assignment, credentials, dashboard
│   │   │   │   ├── assessment.ts      # Assessments, exams, grading
│   │   │   │   ├── attendance.ts      # Attendance sessions, records
│   │   │   │   ├── finance.ts         # Fee structures, payments, payroll, discounts
│   │   │   │   ├── content.ts         # Announcements, events, lessons
│   │   │   │   ├── communications.ts  # Communication book + messaging
│   │   │   │   ├── notifications.ts   # User notifications
│   │   │   │   ├── enrollment.ts      # Enrollment requests
│   │   │   │   ├── operations.ts      # Calendar, exam seating, national exams, search
│   │   │   │   ├── people.ts          # Parents, discipline
│   │   │   │   ├── practice-exams.ts  # Practice exams, attempts, submissions
│   │   │   │   ├── reporting.ts       # Report cards, promotion
│   │   │   │   ├── subscription.ts    # Plans, subscriptions
│   │   │   │   ├── superadmin.ts      # Super admin dashboard, stats
│   │   │   │   ├── templates.ts       # Document templates
│   │   │   │   ├── translation.ts     # Text translation
│   │   │   │   ├── bulk-upload.ts     # CSV/Excel batch imports
│   │   │   │   ├── data-quality.ts    # Data consistency reports
│   │   │   │   ├── entry-progress.ts  # Assessment entry progress
│   │   │   │   ├── platform.ts        # Platform settings
│   │   │   │   ├── school-settings.ts # Per-school settings
│   │   │   │   ├── timetable.ts       # Admin timetable
│   │   │   │   ├── timetable-slots.ts # Timetable slots
│   │   │   │   ├── siren*.ts          # 6 siren API modules (schedules, events, hardware, control, period-time)
│   │   │   │   ├── parent.ts          # Parent dashboard
│   │   │   │   └── types.ts           # Shared API types
│   │   │   │
│   │   │   ├── query-keys.ts          # Centralized TanStack Query cache keys (170 lines)
│   │   │   ├── themeStore.ts          # Zustand — theme preference (light/dark/system)
│   │   │   ├── languageStore.ts       # Zustand — language (en/am/ar/om/so)
│   │   │   ├── uiStore.ts            # Zustand — sidebar state, etc.
│   │   │   ├── calendar-utils.ts      # Ethiopian calendar conversion (ethiopian-calendar-new)
│   │   │   ├── ethiopian-calendar.ts  # Additional Ethiopian date utilities
│   │   │   ├── grade-system.ts        # Grade range definitions (KG-12, 9-12, etc.)
│   │   │   ├── finance-labels.ts      # Finance-related label mappings
│   │   │   ├── notification-display.ts
│   │   │   ├── push-notifications.ts  # Push notification registration
│   │   │   ├── student-code.ts        # Student code generation
│   │   │   ├── timetable.ts           # Timetable display utilities
│   │   │   ├── school-resolver.ts     # Resolve school by slug/key/id
│   │   │   ├── asset-url.ts           # Asset URL resolution
│   │   │   ├── sanitize.ts            # Input sanitization
│   │   │   ├── utils.ts               # General utilities
│   │   │   ├── data.ts                # Static/mock data
│   │   │   ├── version.ts             # APP_VERSION constant
│   │   │   ├── db.ts                  # Dexie.js IndexedDB setup
│   │   │   ├── db/                    # IndexedDB database definitions
│   │   │   └── offline/               # Offline sync service + README
│   │   │
│   │   ├── hooks/                     # Custom React hooks
│   │   │   ├── useDebounce.ts
│   │   │   ├── useFormDrafts.ts       # Form draft auto-save
│   │   │   ├── useNetworkStatus.tsx   # Online/offline detection
│   │   │   ├── useOfflineAttendance.ts
│   │   │   ├── useProfileData.ts
│   │   │   ├── useSchoolFeatureSetting.ts
│   │   │   ├── useSubscription.ts
│   │   │   └── useTranslations.ts     # i18n translation hook
│   │   │
│   │   └── messages/                  # i18n JSON message files
│   │       ├── en.json                # English
│   │       ├── am.json                # Amharic
│   │       ├── ar.json                # Arabic
│   │       ├── om.json                # Oromo
│   │       ├── so.json                # Somali
│   │       └── registry.ts            # Message loading registry
│   │
│   └── Dockerfile                     # Multi-stage build (standalone output)
│
├── nginx/
│   └── nginx.conf                     # Reverse proxy: SSL, rate limiting, /api/→backend:8001, /→frontend:8000
│
├── docker-compose.yml                 # Production: postgres + redis + backend + frontend + nginx
├── docker-compose.dev.yml             # Development compose
├── Dockerfile                         # Root-level (frontend) Dockerfile
├── README.md
├── DOCKER.md
├── .env.example
└── docs/
    ├── technical-documentation.md
    ├── school-system-proposal.pdf
    ├── edutrack-pro-proposal.html
    └── practice-exam-mock-questions.csv
```

---

## 4. Multi-Tenancy (CRITICAL — Every AI Must Enforce This)

YeneSchool is a **multi-tenant SaaS** — all schools share one PostgreSQL database. Data isolation is **not optional**.

### 4.1 Database-Level Isolation

- Every tenant-scoped table has a `schoolId String` column (Prisma camelCase).
- Every query **must** include `WHERE schoolId = :schoolId`.
- The `User` model has `schoolId` — every JWT carries it. Extract and use it in every DB call.

### 4.2 Redis Key Namespacing

- All Redis keys **must** be namespaced: `school:{schoolId}:resource:{id}`.
- Never use unscoped keys like `user:123` or `session:abc`.

### 4.3 Auth & Middleware

- `schoolId` is extracted from the JWT in every authenticated request.
- NestJS Guards (`JwtAuthGuard`, `TenantGuard`) validate `req.user.schoolId` before any DB/Redis operation.
- Never derive `schoolId` from request body/params alone — always from verified JWT.

### 4.4 AI Coding Rules for Multi-Tenancy

- When writing any NestJS service method that queries the DB, **always include `schoolId` as a parameter and in the `where` clause**.
- When writing any Redis `get`/`set`/`del`, **always prefix the key with `school:{schoolId}:`**.
- Flag any code that does `findMany()` or `SELECT *` without a `schoolId` filter as a **security bug**.

---

## 5. Auth System (Actual Implementation)

### 5.1 Auth Flow

```
Login Page → POST /auth/login → LocalStrategy.validate() → JWT token in HTTP cookie
                                                                   │
                                                    Frontend stores minimal user in sessionStorage
                                                                   │
                                                     AuthContext checks GET /auth/users/me on mount
                                                                   │
                                                    Routes guarded by role checks in Menu component
                                                                   │
                                                    Backend enforces via Guards: JwtAuthGuard, RolesGuard, PermissionsGuard
```

### 5.2 Session Storage

```typescript
// Minimal session user stored for page refreshes
sessionStorage.setItem('user', JSON.stringify({ id, role, schoolId }));

// Full profile fetched via /auth/users/me on each mount
```

### 5.3 Axios Interceptors (core.ts)

| HTTP Status | Behavior |
|---|---|
| 401 | Redirect to `/sign-in` |
| 403 | Redirect to `/access-denied` with details in sessionStorage |
| 503 (MAINTENANCE_MODE) | Dispatch `sms:maintenance-mode` custom event |
| 404 (protected routes) | Redirect to `/access-denied` |

---

## 6. RBAC System — 8 Roles

| Role | Description | Key Permissions |
|---|---|---|
| `SUPER_ADMIN` | Platform-wide — all schools | `*` (everything) |
| `ADMIN` | Per-school administration | Users, students, teachers, classes, exams, fees, announcements, reports |
| `IT_MANAGER` | Technical admin | Users read, classes, sections, timetable, announcements, events, dashboard |
| `REGISTRAR` | Enrollment & records | Student CRUD, document upload, enrollment approval |
| `TEACHER` | Academic instruction | Exams, grading, attendance, lessons, announcements |
| `STUDENT` | Personal view-only | Exam read, grades read, attendance read, timetable read |
| `PARENT` | Children's progress | Students read, grades read, fees read, attendance read, timetable read |
| `FINANCE` | Financial operations | Fee structures, payments, receipts, payroll, reports |

Permissions defined in `DEFAULT_ROLE_PERMISSIONS` (backend) + `rolePermissions` map in `AuthContext.tsx` (frontend).

---

## 7. Data Flow

### 7.1 Frontend → Backend

```
React Component
    → useQuery/useMutation (TanStack Query)
        → API Module (lib/api/*.ts)
            → Axios core (lib/api/core.ts)
                → HTTP (withCredentials: true)
                    → NestJS Controller
                        → Service Layer
                            → PrismaService
                                → PostgreSQL
```

### 7.2 State Management Split

| State Type | Technology | Examples |
|---|---|---|
| Server state | TanStack Query | Students, teachers, classes, finance data |
| Client state | Zustand | Theme (`themeStore`), language (`languageStore`), UI (`uiStore`) |
| App-wide state | React Context | Auth, calendar type, academic year, subscription |
| Offline data | Dexie.js (IndexedDB) | Attendance records when offline |

### 7.3 Offline Attendance Flow

```
Teacher takes attendance offline
    → Dexie.js IndexedDB stores locally
        → useNetworkStatus detects online
            → sync-service.ts pushes to backend
                → POST /sync → SyncModule resolves conflicts
                    → Server merges or flags SyncConflict
```

---

## 8. Database Schema Overview (50+ Models)

### Core
`School`, `User`, `Permission`, `RolePermission`, `UserPermission`

### Academic
`AcademicYear`, `Term`, `Class`, `Section`, `Subject`, `ClassSubject`, `GradeLevel`

### People
`StudentProfile`, `TeacherProfile`, `ParentProfile`, `ParentStudent`, `StudentClass`

### Enrollment
`Enrollment`, `EnrollmentRequest`

### Attendance
`Attendance`, `AttendanceSession`, `AttendanceRecord`

### Grading & Assessment
`Grade`, `SubjectGrade`, `GradeScale`, `GradingComponent`, `GradeScore`, `GradeChangeLog`
`Assessment`, `AssessmentSubject`, `StudentAssessmentScore`, `AssessmentWeight`

### Exams
`Exam`, `ExamResult`, `NationalExamResult`, `NationalExamResultBatch`, `NationalExamSubjectResult`
`ExamSeatingPlan`, `ExamSectionAssignment`, `ExamSectionStudent`

### Practice Exams
`PracticeExam`, `PracticeExamQuestion`, `PracticeExamAttempt`, `PracticeExamAnswer`

### Report Cards
`ReportCard`, `PromotionRecord`

### Finance
`FeeStructure`, `StudentFee`, `Payment`, `Receipt`, `DiscountPolicy`
`FinanceProfile`, `FinanceAuditLog`, `PayrollSalary`, `PayrollRun`, `PayrollEntry`

### Communication
`Communication`, `CommunicationReply`, `Conversation`, `ConversationParticipant`, `Message`, `MessageRead`

### Notifications
`Notification`, `NotificationPreference`, `PushSubscription`

### Content
`Content`, `ContentSubmission`, `ContentAttachment`, `ContentResource`, `SyllabusMapping`

### School Events
`SchoolEvent`, `Announcement`

### Scheduling
`TimetableSlot`, `PeriodTime`, `SirenSchedule`, `SirenEvent`, `SirenHardwareConfig`

### Documents
`Document`, `Template`

### Other
`PlatformSetting`, `SchoolSetting`, `SchoolSettings`, `SchoolYearCounter`
`PasswordResetToken`, `PendingCredential`, `CredentialGenerationLog`
`SyncConflict`, `SyncLog`, `AuditLog`, `DisciplineIncident`
`TranslationCache`, `Subscription`, `Plan`, `Department`
`TeacherSubjectAssignment`

---

## 9. Ethiopian Calendar & Finance Rules (CRITICAL)

### 9.1 Ethiopian Calendar Facts

- **13 months**: 12 months × 30 days + Pagume (5–6 days intercalary)
- Ethiopian New Year: ~September 11 Gregorian
- Academic year: **Meskerem (Month 1) → Sene (Month 10)**, i.e., Sep–Jun
- Library used: `ethiopian-calendar-new` (functions: `toEthiopian`, `toGregorian`)
- Also: `ethiopian-date` package, react-big-calendar with Ethiopian adapter
- Ethiopian months: Meskerem, Tikemet, Hidar, Tahsas, Ter, Yekatit, Megabit, Miyazia, Ginbot, Sene, Hamle, Nehase, Pagume

### 9.2 Curriculum Periods

| Period | Ethiopian Months | Approx. Gregorian |
|---|---|---|
| Semester 1 | Meskerem–Tahsas (1–4) | Sep–Dec |
| Semester 2 | Tir–Sene (5–10) | Jan–Jun |
| Trimester 1 | Meskerem–Hidar (1–3) | Sep–Nov |
| Trimester 2 | Tahsas–Megabit (4–7) | Dec–Mar |
| Trimester 3 | Miazia–Sene (8–10) | Apr–Jun |

### 9.3 Billing Methods

| Method | Description |
|---|---|
| `FULL_PAYMENT` | One payment for the whole year |
| `PER_TERM` | One payment per semester/trimester/quarter |
| `MONTHLY` | 10 equal monthly payments (school months only, not 12) |
| `INSTALLMENT` | Custom installment count per student |

### 9.4 Finance Service Rules

- Installment count for `MONTHLY` = number of school months (typically 10, not 12)
- Due dates calculated using Ethiopian calendar — never add 30-day intervals to Gregorian dates
- Currency: always `ETB` (Ethiopian Birr) — use the `ETB` constant
- One `Fee` record per installment with: `amount`, `dueDate` (Ethiopian), `schoolId`, `studentId`, `academicYearId`

---

## 10. Backend Conventions (NestJS)

### 10.1 Service Method Pattern

```typescript
async findStudents(schoolId: string, filters?: StudentFilters): Promise<StudentProfile[]> {
  return this.prisma.studentProfile.findMany({
    where: { schoolId, ...filters },
  });
}
```

### 10.2 Validation

- `class-validator` decorators on all DTOs
- `@IsUUID()` on all ID fields
- Custom `@IsEthiopianDate()` for Ethiopian date strings (format: `YYYY-MM-DD`)
- Global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true`
- Body parser limit: 10MB (for base64-encoded file uploads)

### 10.3 Error Handling

- NestJS `HttpException` subclasses only — never raw DB errors
- Logger with `schoolId` in all log entries

### 10.4 Module Dependency Graph

```
PrismaModule (@Global — available everywhere without explicit import)
├── AuthModule (depends on: Prisma, Notification, Credential, Jwt, Passport)
├── FinanceModule (depends on: Prisma, Notification, Subscription)
├── NotificationModule (depends on: Prisma — exported for Auth, Finance, etc.)
├── SyncModule (depends on: Prisma)
├── BulkUploadModule (depends on: Prisma, Notification)
└── All other modules (depend on: Prisma)
```

---

## 11. Frontend Conventions

### 11.1 Provider Hierarchy (from providers.tsx)

```
QueryClientProvider (TanStack Query)
└── AuthProvider (AuthContext)
    └── CalendarProvider (Gregorian/Ethiopian)
        └── ThemeProvider (dark/light/system)
            └── RouteTransition (animations)
                └── SubscriptionWrapper (feature gating)
```

### 11.2 Routes by Role

| Role | Routes available |
|---|---|
| SUPER_ADMIN | `/superadmin/*` — schools, admins, backups, subscription plans |
| ADMIN | `/admin/*` — full school management (academic, finance, exams, etc.) |
| IT_MANAGER | `/admin/*` (subset — technical/admin operations) |
| REGISTRAR | `/admin/enrollment/*`, `/list/users` |
| TEACHER | `/teacher/*` — grading, lessons, attendance, exams, timetable |
| STUDENT | `/student/*` — grades, timetable, attendance, lessons, practice exams |
| PARENT | `/parent/*` — children, fees, grades, discipline, attendance |
| FINANCE | `/finance/*` — fee structures, payments, payroll, reports |

### 11.3 State Management Rules

- All server data: TanStack Query (`staleTime: 60s`, `gcTime: 5min`)
- Theme: Zustand (`themeStore`)
- Language: Zustand (`languageStore`)
- UI state: Zustand (`uiStore`)
- Auth state: React Context (`AuthContext`)
- Calendar mode: React Context (`CalendarContext`)
- Active academic year: React Context (`AcademicYearContext`)
- Subscription plan: React Context (`SubscriptionContext`)

### 11.4 i18n System

- Custom system (not next-intl)
- JSON files per language: `en.json`, `am.json`, `ar.json`, `om.json`, `so.json`
- Message registry: `messages/registry.ts`
- Translation hook: `useTranslations.ts`
- Zustand store for language preference: `languageStore.ts`

---

## 12. Key Workflows

### 12.1 Enrollment Flow

```
Student visits public page → Selects school (by slug/key/id)
    → Fills enrollment form + uploads documents
        → EnrollmentRequest created (PENDING)
            → Admin/Registrar reviews + approves/rejects
                → StudentClass created → StudentProfile created → User created
                    → Parent linked (if existing or newly created)
```

### 12.2 Grading Workflow

```
Teacher creates GradingComponents (CA, Midterm, Final)
    → Enters GradeScore for each component per student
        → SubjectGrade computed (DRAFT)
            → Teacher submits (SUBMITTED)
                → Admin approves/rejects (APPROVED/REJECTED)
                    → GradeChangeLog tracks all changes
```

### 12.3 Report Card Workflow

```
DRAFT → Grades + Attendance + Remarks entered
    → PUBLISHED → Visible to students/parents
        → ARCHIVED → Historical record
```

### 12.4 Exam Seating Flow

```
Admin creates ExamSeatingPlan for an exam
    → Creates ExamSectionAssignment (rooms/halls)
        → Assigns ExamSectionStudent (individual seats)
            → Generates seating arrangement
```

### 12.5 Payroll Workflow

```
DRAFT → Salary entries calculated
    → APPROVED by finance admin
        → PAID → PayrollEntry records per employee
            → Tax tracked per entry
```

---

## 13. Docker Infrastructure

### 13.1 Services (docker-compose.yml)

| Service | Image | Port | Notes |
|---|---|---|---|
| postgres | postgres:16-alpine | 5432 | Persistent volume, health check |
| redis | redis:7-alpine | 6379 | Cache/queue |
| backend | node:20-slim | 8001 | Multi-stage build, prisma migrate on start |
| frontend | node:20-slim | 8000 | Standalone Next.js output |
| nginx | nginx:alpine | 80/443 | SSL termination, reverse proxy, rate limiting |

### 13.2 Nginx Rate Limiting

| Zone | Limit | Target |
|---|---|---|
| `auth_login` | 5 req/min | `/api/auth/login` |
| `auth_reset` | 3 req/min | `/api/auth/forgot-password` |
| `auth_register` | 5 req/10min | `/api/auth/register*` |
| `api_global` | 120 req/min | All `/api/` endpoints |

### 13.3 Backend Startup Sequence

```
docker-entrypoint.sh:
    1. Wait for PostgreSQL to be reachable
    2. Run: npx prisma migrate deploy (or prisma db push in dev)
    3. Optionally seed database in development
    4. Start Node.js application
```

---

## 14. Security Checklist (Run Before Every PR)

- [ ] All new DB queries include `schoolId` in `where` clause
- [ ] All new Redis keys follow `school:{schoolId}:` prefix pattern
- [ ] No raw SQL strings (Prisma query builder only)
- [ ] No `console.log` with student/teacher PII in production code
- [ ] All new API endpoints protected by `JwtAuthGuard` + appropriate role/permission guards
- [ ] DTOs validated with `class-validator` decorators
- [ ] Ethiopian date calculations use `ethiopian-calendar-new`, not raw `Date` math
- [ ] Finance calculations respect Ethiopian calendar months (10 school months, not 12)

---

## 15. Known Incomplete Areas

The following features are scaffolded but may have incomplete implementations:

| Area | Status |
|---|---|
| Report cards | Workflow defined, publishing may be partial |
| Practice exams | Question CRUD and attempts exist, full grading pipeline may need work |
| Offline sync | SyncService and conflict resolution — verify completeness |
| Siren/bell hardware webhook | Define the webhook contract if not yet implemented |
| Translation (Azure/Google) | Provider integration may need configuration |
| Backup/restore | Management UI may be incomplete |
| Parent dashboard | Verify full feature coverage |
| Student promotion | PromotionRecord exists, promotion logic may need review |

---

## 16. Original Project References

The project was originally scaffolded as `lama-dev-next-dashboard`. Some file headers, package names, or comments may still reference this. The final product name is **YeneSchool**.

```
package.json → "name": "lama-dev-next-dashboard", "version": "0.5.0"
```

---

## 17. Glossary

| Term | Meaning |
|---|---|
| `schoolId` | UUID identifying a tenant school |
| `academicYearId` | UUID for the school's current academic year |
| `curriculumPeriod` | `SEMESTER` \| `TRIMESTER` \| `QUARTER` \| `CUSTOM` |
| `billingMethod` | `FULL_PAYMENT` \| `PER_TERM` \| `MONTHLY` \| `INSTALLMENT` |
| `ETB` | Ethiopian Birr — the only supported currency |
| `GREGORIAN` / `ETHIOPIAN` | Calendar type toggle (per user preference) |
| Pagume | Ethiopian Month 13 (intercalary, 5–6 days) |
| Enkutatash | Ethiopian New Year (~September 11) |
| `cuid()` | Prisma's default ID generator (used for all model IDs) |

---

> **Last updated**: June 2026 — HUMAN Tech PLC, Addis Ababa, Ethiopia
>
> **AI agents**: Read this file first. It contains the exact architecture, not assumptions. Multi-tenancy and Ethiopian calendar rules are the top two areas where incorrect assumptions cause bugs.
