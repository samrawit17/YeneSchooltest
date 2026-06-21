# Tech Stack — YeneSchool

> Purpose: Defines every technology used, its version, and purpose.

---

## 1. Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **NestJS** | 11.x | Application framework |
| **Node.js** | 20 (LTS) | Runtime |
| **TypeScript** | 5.7 | Language |
| **Prisma** | 7.8 | ORM + migrations |
| **Prisma Adapter** | `@prisma/adapter-pg` 7.8 | PostgreSQL connection pool |
| **PostgreSQL** | 16 | Primary database |
| **Redis** | 7 | Cache, queue, session store |
| **JWT** | `@nestjs/jwt` | Authentication tokens |
| **Passport** | 0.7 + `passport-jwt`, `passport-local` | Auth strategies |
| **class-validator** | 0.14 | DTO validation |
| **class-transformer** | 0.5 | Request/response serialization |
| **bcrypt** | 6 | Password hashing |
| **ioredis** | 5.11 | Redis client |
| **Multer** | 2 | File upload handling |
| **Sharp** | 0.34 | Image processing |
| **ExcelJS** | 4.4 | Spreadsheet generation |
| **PDFKit** | 0.18 | PDF generation |
| **pdf-lib** | 1.17 | PDF manipulation |
| **Archiver** | 8 | ZIP archive creation |
| **web-push** | 3.6 | Web Push notifications |
| **QRCode** | 1.5 | QR code generation |
| **ethiopian-calendar-new** | 1.1 | Ethiopian date conversion |
| **@nestjs/schedule** | 6.1 | Cron jobs, scheduled tasks |

---

## 2. Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 14.2 | React framework (App Router) |
| **React** | 18 | UI library |
| **TypeScript** | 5 | Language |
| **Tailwind CSS** | 3.4 | Utility-first CSS |
| **Shadcn UI** | latest | Component primitives (Radix-based) |
| **Radix UI** | various | Accessible UI primitives |
| **TanStack Query** | 5.90 | Server state management |
| **Zustand** | 5.0 | Client state (theme, language, UI) |
| **Zod** | 3.25 | Schema validation |
| **React Hook Form** | 7.71 | Form handling |
| **Axios** | 1.7 | HTTP client |
| **Recharts** | 2.12 | Charts |
| **Visx** | 4 | Visualization components |
| **react-big-calendar** | 1.13 | Calendar views |
| **Framer Motion** | 11 | Animations |
| **Lucide React** | 0.563 | Icons |
| **Sonner** | 2.0 | Toast notifications |
| **Dexie.js** | 4.3 | IndexedDB for offline data |
| **ethiopian-calendar-new** | 1.1 | Ethiopian date utils |
| **ethiopian-date** | 0.0.6 | Ethiopian date types |
| **date-fns** | 4.1 | Date formatting |
| **CMDK** | 1.1 | Command palette |
| **class-variance-authority** | 0.7 | Component variants |
| **tailwind-merge** | 3.4 | Tailwind class merging |
| **tailwindcss-animate** | 1.0 | Animation utilities |

---

## 3. Infrastructure

| Technology | Version | Purpose |
|------------|---------|---------|
| **Docker** | latest | Containerization |
| **Docker Compose** | v2 | Service orchestration |
| **Nginx** | alpine | Reverse proxy, SSL, rate limiting |
| **Cloudflare R2** | — | Object storage (documents, images) |
| **Hetzner** | — | Production VPS hosting |

---

## 4. Development Tools

| Tool | Purpose |
|------|---------|
| **ESLint** | Code linting (backend + frontend) |
| **Prettier** | Code formatting (backend only) |
| **Jest** | Testing (backend) |
| **Playwright** | E2E testing (frontend) |
| **Swagger/OpenAPI** | API documentation (planned) |

---

## 5. State Management Architecture

```typescript
// SERVER STATE → TanStack Query
import { useQuery } from '@tanstack/react-query';
const { data } = useQuery({ queryKey: ['students', schoolId], queryFn: () => api.getStudents(schoolId) });

// CLIENT STATE → Zustand
import { useThemeStore } from '@/lib/themeStore';
const { theme, setTheme } = useThemeStore();

// APP STATE → React Context
import { useAuth } from '@/context/AuthContext';
const { user, login, logout } = useAuth();

// OFFLINE DATA → Dexie.js
import { db } from '@/lib/db';
await db.attendanceRecords.add(record);
```

---

## 6. i18n Architecture

```
Custom system (not next-intl):
  frontend/src/messages/
    ├── en.json    → English (default)
    ├── am.json    → Amharic
    ├── ar.json    → Arabic
    ├── om.json    → Oromo
    ├── so.json    → Somali
    └── registry.ts → Message loader

  frontend/src/lib/languageStore.ts → Zustand store for language preference
  frontend/src/hooks/useTranslations.ts → useTranslations() hook
```

---

## 7. Related Documents

- `ARCHITECTURE.md` — Full architecture with data flow diagrams
- `docs/DATABASE.md` — Database design and patterns
- `docs/DEPLOYMENT.md` — Docker and deployment setup
- `docs/CODING_STANDARDS.md` — Code conventions for each layer

---

> **Last updated**: June 2026
