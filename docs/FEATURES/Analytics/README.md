# Analytics Module

> Purpose: Dashboard analytics, data visualization, and performance metrics.

---

## Responsibilities
- Role-specific dashboard aggregation
- Student performance analytics
- Financial analytics and trends
- Attendance statistics
- Custom chart and report generation

## Features
- Role-specific dashboards (admin, teacher, student, parent, finance)
- Performance trends with Recharts/Visx
- Financial summaries and projections
- Attendance rate calculations
- Exportable analytics reports

## Database Entities
- Dashboard data aggregated from: Grade, Attendance, Payment, StudentProfile, etc.
- No dedicated analytics tables — queries aggregate from existing models

## Permissions
- Each role sees analytics relevant to their scope
- `ADMIN`: Full school analytics
- `TEACHER`: Assigned class analytics
- `FINANCE`: Financial analytics only
- `SUPER_ADMIN`: Cross-school platform analytics

## Related Documents
- `backend/src/dashboard/` — Dashboard aggregation
- `frontend/src/app/(dashboard)/*/page.tsx` — Dashboard pages
- `frontend/src/components/charts/` — Chart components
