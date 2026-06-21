# Project Overview — YeneSchool

> Purpose: High-level product vision, goals, and context for all contributors.

---

## 1. Product Identity

| Attribute | Value |
|-----------|-------|
| **Product Name** | YeneSchool |
| **Tagline** | Modern School Management for Ethiopian Schools |
| **Company** | HUMAN Tech PLC — Addis Ababa, Ethiopia |
| **Former Name** | `lama-dev-next-dashboard` (legacy package references) |
| **Version** | 0.5.0 (~50% complete) |
| **Status** | Active development — many features scaffolded, some incomplete |

---

## 2. Vision

YeneSchool is a comprehensive, multi-tenant School Management System (SMS) designed specifically for Ethiopian schools. It handles the full lifecycle of school operations — from enrollment to graduation, attendance to examinations, and fee collection to payroll.

### Core Differentiators
- **Ethiopian Calendar Native**: Built for the Ethiopian calendar system (13 months, unique academic year timing)
- **Multi-Tenant SaaS**: One platform serving hundreds of schools with full data isolation
- **Offline-First**: Attendance and critical operations work without internet
- **Multi-Language**: English, Amharic, Arabic, Oromo, Somali
- **Role-Specific Dashboards**: 8 distinct roles with tailored experiences

---

## 3. Target Market

- **Primary**: Private schools in Ethiopia (KG through Grade 12)
- **Secondary**: International schools operating in Ethiopia
- **Scale**: 1–5000+ students per school, single to multi-campus

---

## 4. Core Modules

| Module | Status | Description |
|--------|--------|-------------|
| Authentication & RBAC | ✅ Complete | JWT auth, 8 roles, fine-grained permissions |
| Multi-Tenancy | ✅ Complete | School-level isolation, Redis namespacing |
| School Management | ✅ Complete | CRUD, settings, subscription plans |
| Student Management | ✅ Complete | Profiles, enrollment, documents |
| Teacher Management | ✅ Complete | Profiles, subject assignment |
| Parent Management | ✅ Complete | Profiles, child linking |
| Attendance | ✅ Complete | Offline-first, Ethiopian calendar aware |
| Timetable | ✅ Complete | Period-based, slot management |
| Examinations | ⚠️ Partial | Seating plans exist, full pipeline in progress |
| Gradebook | ✅ Complete | Components, scores, scales, approval workflow |
| Report Cards | ⚠️ Partial | DRAFT→PUBLISHED→ARCHIVED workflow |
| Finance | ✅ Complete | Fee structures, payments, payroll, receipts |
| Practice Exams | ⚠️ Partial | MCQ/True-False auto-grading in progress |
| Communication | ✅ Complete | Internal messaging, announcement system |
| Notifications | ✅ Complete | Web Push, preferences |
| Siren/Bell System | ⚠️ Partial | Hardware webhook contract needed |
| Discipline | ✅ Complete | Incident tracking |
| Offline Sync | ⚠️ Partial | SyncService scaffolded, conflict resolution may need work |
| Bulk Upload | ✅ Complete | CSV/Excel import |
| Translation | ⚠️ Partial | Azure/Google provider config needed |

---

## 5. Architecture Philosophy

```
                  ┌─────────────┐
                  │   Nginx     │  ← SSL termination, rate limiting, reverse proxy
                  └──────┬──────┘
                         │
              ┌──────────┴──────────┐
              │                     │
      ┌───────▼───────┐    ┌───────▼───────┐
      │  Next.js 14   │    │   NestJS 11   │
      │  Frontend     │    │   Backend API │
      │  :8000        │    │   :8001       │
      └───────────────┘    └───────┬───────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
             ┌──────▼─────┐ ┌─────▼─────┐ ┌──────▼─────┐
             │ PostgreSQL │ │   Redis   │ │Cloudflare  │
             │   (Prisma) │ │  Cache/Q  │ │   R2 (obj)│
             └────────────┘ └───────────┘ └────────────┘
```

---

## 6. Key Design Decisions

1. **Monorepo with separate backend/frontend** — Clear separation of concerns
2. **Prisma ORM** — Type-safe DB access, easy migrations
3. **Multi-tenancy at DB level** — `schoolId` on every table (simpler than separate DBs for now)
4. **Custom i18n** — Not next-intl; Zustand store + JSON files
5. **Offline with Dexie.js** — IndexedDB wrapper for attendance
6. **Ethiopian calendar via `ethiopian-calendar-new`** — Dedicated library for date conversion

---

## 7. Release Roadmap

| Phase | Focus | Target |
|-------|-------|--------|
| Alpha | Core features, single school pilot | Current |
| Beta | Multi-school, finance, exams | Q3 2026 |
| v1.0 | Full feature set, production ready | Q4 2026 |
| v2.0 | AI Assistant, advanced analytics | Q1 2027 |

---

## 8. Related Documents

| Document | Link |
|----------|------|
| Full Architecture | `docs/ARCHITECTURE.md` |
| Tech Stack | `docs/TECH_STACK.md` |
| Business Rules | `docs/BUSINESS_RULES.md` |
| Database | `docs/DATABASE.md` |
| Roadmap | `docs/ROADMAP.md` |
| Board Proposal | `SMS_Board_Proposal.md` (root) |

---

> **Last updated**: June 2026 | **Maintainer**: HUMAN Tech PLC
