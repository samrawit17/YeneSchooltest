# SMS - School Management System

A full-stack School Management System built with **Next.js** (frontend) and **NestJS** (backend), backed by **Prisma/PostgreSQL**.

## 📁 Project Structure

```
SMS/
├── backend/          # NestJS API server
│   ├── src/
│   │   ├── auth/           # Authentication & authorization
│   │   ├── academic-year/  # Academic years & terms
│   │   ├── assessments/    # Grading & assessments
│   │   ├── attendance/     # Attendance tracking
│   │   ├── calendar/       # Calendar & events
│   │   ├── class/          # Class management
│   │   ├── communication/  # Messaging system
│   │   ├── enrollment/     # Student enrollment
│   │   ├── finance/        # Fees & payments
│   │   ├── grading/        # Grade management
│   │   ├── hr/             # HR & staff management
│   │   ├── notification/   # Notifications
│   │   ├── parent/         # Parent portal
│   │   ├── school/         # School settings
│   │   ├── student/        # Student management
│   │   ├── teacher/        # Teacher portal
│   │   ├── timetable-slot/ # Timetable management
│   │   ├── siren/          # Siren/bell system
│   │   └── ...
│   ├── prisma/          # Database schema & migrations
│   └── package.json
│
├── frontend/         # Next.js client
│   ├── src/
│   │   ├── app/           # Next.js app router pages
│   │   │   ├── (dashboard)/  # Protected dashboard routes
│   │   │   ├── api/          # API proxy routes
│   │   │   └── ...
│   │   ├── components/    # Reusable UI components
│   │   ├── lib/           # API clients, utilities, hooks
│   │   │   ├── api/         # Modular API layer (50+ modules)
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   └── query-keys.ts # Centralized React Query keys
│   │   ├── context/        # React contexts (Auth, AcademicYear, etc.)
│   │   └── ...
│   └── package.json
│
├── nginx/            # Nginx configuration
├── docker-compose.yml
└── README.md
```

## 🚀 Tech Stack

### Backend
- **Framework:** NestJS (TypeScript)
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** JWT + Role-based access control (RBAC)
- **Roles:** SUPER_ADMIN, ADMIN, TEACHER, STUDENT, PARENT, REGISTRAR, FINANCE, HR

### Frontend
- **Framework:** Next.js 14 (App Router)
- **State:** React Query (TanStack Query) + React Context
- **UI:** Shadcn/ui + Tailwind CSS
- **Forms:** React Hook Form + Zod validation
- **Language:** TypeScript (strict)

## 🎯 Features

### Academic Management
- Academic years & terms (Semesters/Quarters/Terms)
- Class & section management
- Subject assignment
- Timetable management with grid view

### User Management
- Multi-role authentication (6+ roles)
- Student enrollment & approval workflow
- Teacher assignment to classes/subjects
- Parent-child linking

### Grading & Assessments
- Multiple assessment types (CA, Mid, Final)
- Grade entry with bulk operations
- Report cards & promotions
- Grade review workflow (Teacher → Registrar)

### Attendance
- Offline-first attendance with sync
- Class-wise attendance tracking
- Student attendance reports

### Communication
- Internal messaging system
- Announcements by role
- Push notifications (webhook support)
- Email/SMS integration ready

### Finance
- Student fee management
- Payment tracking
- Payroll management
- Financial reports

### Siren/Bell System
- Configurable period times
- Siren schedules by day
- Hardware integration (webhook support)
- Manual & automatic triggering

## 🛠️ Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env  # Configure DATABASE_URL, JWT_SECRET, etc.
npx prisma migrate dev
npm run start:dev
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.local.example .env.local  # Configure NEXT_PUBLIC_API_URL
npm run dev
```

### Docker Setup
```bash
docker-compose up -d
```

## 📡 API Architecture

### Backend (NestJS)
- **50+ modules** following NestJS modular architecture
- Each feature has: `*.controller.ts`, `*.service.ts`, `*.module.ts`
- Global RBAC guards & decorators
- Prisma for type-safe database access

### Frontend (Next.js)
- **Modular API layer:** `frontend/src/lib/api/`
  - 50+ API modules (one per backend module)
  - Centralized exports via `lib/api.ts` barrel
  - Type-safe API calls with axios interceptors
- **React Query:** Centralized query keys in `lib/query-keys.ts`
- **Custom hooks:** Extracted data logic (e.g., `useProfileData`)
- **Offline support:** IndexedDB + sync service for attendance

## 🔐 Environment Variables

### Backend (`backend/.env`)
```
DATABASE_URL="postgresql://user:pass@localhost:5432/sms"
JWT_SECRET="your-secret-key"
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL="http://localhost:5000"
```

## 🧪 Development

### Backend
```bash
cd backend
npm run start:dev    # Development with hot reload
npm run test       # Unit tests
npm run lint        # Linting
```

### Frontend
```bash
cd frontend
npm run dev          # Next.js dev server
npm run build        # Production build
npx tsc --noEmit  # TypeScript check
```

## 📦 Database Schema

Key models (see `backend/prisma/schema.prisma`):
- User (with roles)
- School
- Student, Teacher, Parent
- Class, Section, Subject
- AcademicYear, Term
- Attendance, Grade, Assessment
- Fee, Payment
- Message, Announcement
- SirenSchedule, PeriodTime

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- Check `DOCKER.md` for Docker deployment
- See `documentation.html` for detailed docs
- Open an issue on GitHub for bugs/feature requests

---

**Built with ❤️ using Next.js, NestJS, and Prisma**
