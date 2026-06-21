# Dashboards Module

> Purpose: Role-specific dashboard aggregation and data presentation.

---

## Responsibilities
- Aggregate data from multiple modules per role
- Provide role-relevant KPIs and metrics
- Serve dashboard data via dedicated API endpoints

## Features
- **Admin Dashboard**: Student count, teacher count, attendance rate, financial summary, exam stats
- **Teacher Dashboard**: My classes, pending grading, upcoming lessons, today's timetable
- **Student Dashboard**: My grades, upcoming exams, today's timetable, attendance
- **Parent Dashboard**: Children overview, recent grades, pending fees, attendance
- **Registrar Dashboard**: Pending enrollments, student stats, document verification queue
- **Superadmin Dashboard**: All schools overview, subscription stats, system health, backup status
- **Finance Dashboard**: Fee collection summary, pending payments, payroll status
- **IT Manager Dashboard**: System status, user management, technical metrics

## Database Entities
- No dedicated tables — uses aggregation queries across all modules

## Permissions
- Role-based: each dashboard service serves only its role

## Related Documents
- `backend/src/dashboard/` — 6 role-specific dashboard services
- `frontend/src/app/(dashboard)/page.tsx` — Role-aware home page
- `frontend/src/components/charts/` — Chart components
