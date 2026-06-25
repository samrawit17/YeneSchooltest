# DOMAIN — Business Rules

## Academic Calendar
- Academic year: Meskerem (month 1) to Sene (month 10) — Sep to Jun
- Ethiopian calendar: 13 months (12 × 30 days + Pagume 5–6 days)
- Only one `IS_CURRENT` academic year per school at a time
- Curriculum periods: SEMESTER (2), TRIMESTER (3), QUARTER (4), CUSTOM
- At least one active term per school year

## Finance
- Currency: ETB (Ethiopian Birr)
- School months = 10 (not 12). MONTHLY billing = 10 installments
- Due dates use Ethiopian calendar
- Billing methods: FULL_PAYMENT, PER_TERM, MONTHLY, INSTALLMENT
- Discount: PERCENTAGE or FIXED_AMOUNT
- Payroll: DRAFT → APPROVED → PAID

## Enrollment
1. Student applies (self-registration or admin creates)
2. Admin reviews and approves/rejects
3. System generates student code on approval
4. Student assigned to class + section + academic year
5. StudentCode format: configurable per school (prefix + number)

## Attendance
- Offline-first: recorded in Dexie.js, synced when online
- Once approved by teacher/admin, attendance cannot be modified
- Tracks: present, absent, late, excused

## Grading
- Grade range: 0–100
- Pass mark: 50 (configurable per assessment)
- Gradebook workflow: DRAFT → PUBLISHED → ARCHIVED
- Report card statuses: DRAFT → PUBLISHED → ARCHIVED

## Timetable
- A class + section combination has one published timetable per academic year
- Timetable slots define: day, period, subject, teacher, room
- Period times are configurable per school

## Users & Roles
- 8 roles: SUPER_ADMIN, ADMIN, TEACHER, STUDENT, PARENT, REGISTRAR, FINANCE, HR
- SUPER_ADMIN manages schools and platform-level settings
- Teachers can edit only their assigned classes/subjects
- Parents can view only their linked children's data
- Students can view only their own data

## Multi-tenancy
- Every tenant-scoped DB table has a `schoolId` column
- Never derive schoolId from request body — always from JWT
- Each school has isolated: classes, sections, subjects, academic years, students, teachers, finances
