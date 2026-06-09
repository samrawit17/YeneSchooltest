# SMS - School Management System

A full-stack School Management System built with **Next.js** and **NestJS**. Supports multi-tenant schools with role-based access, offline-first attendance, and multi-language support (English, Amharic, Arabic, Oromo, Somali).

## Quick Start

```bash
# Backend
cd backend && npm install
cp .env.example .env
npx prisma migrate dev
npm run start:dev

# Frontend
cd frontend && npm install
cp .env.local.example .env.local
npm run dev
```

## Tech Stack

| Layer | Tech |
|-------|------|
| **Backend** | NestJS, PostgreSQL, Prisma |
| **Frontend** | Next.js 14 (App Router), Tailwind, Shadcn/ui |
| **Auth** | JWT + RBAC (8 roles) |

## Core Features

- **Academic** — Years, terms, classes, subjects, timetables, grade books, report cards
- **Attendance** — Offline-first tracking with auto-sync
- **Finance** — Fee management, installment plans, payment tracking
- **Communication** — Internal messaging, announcements, push notifications
- **Siren/Bell** — Configurable schedules with hardware webhook support
- **Multi-Language** — English, Amharic, Arabic, Oromo, Somali + Ethiopian calendar

## Roles

`SUPER_ADMIN` · `ADMIN` · `TEACHER` · `STUDENT` · `PARENT` · `REGISTRAR` · `FINANCE` · `HR`

## Environment

**Backend** (`.env`):
```
DATABASE_URL="postgresql://user:pass@localhost:5432/sms"
JWT_SECRET="your-secret-key"
TRANSLATION_PROVIDER="disabled" # azure | google | disabled
AZURE_TRANSLATOR_KEY=""         # required when provider is azure
GOOGLE_TRANSLATE_API_KEY=""     # required when provider is google
```

**Frontend** (`.env.local`):
```
NEXT_PUBLIC_API_URL="http://localhost:8001"
```

## Docker

```bash
docker compose up -d --build
```

For development with hot reload:

```bash
docker compose -f docker-compose.dev.yml up --build
```

Fresh clone notes:

- Root production Docker now boots with safe local defaults, including a fallback dev JWT secret.
- Development and production Docker stacks use separate named volumes, so switching between them does not corrupt credentials or reuse the wrong database state.
- Production app is available through `http://localhost` via nginx and directly on `http://localhost:8000` for frontend debugging.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start with hot reload |
| `npm run build` | Production build |
| `npm run test` | Run tests |
| `npx tsc --noEmit` | Type check |

## Contributing

1. Fork the repo
2. Create a branch (`git checkout -b feature/name`)
3. Commit and push
4. Open a Pull Request
