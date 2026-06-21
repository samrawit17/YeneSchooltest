# Pages — YeneSchool

> Purpose: Page structure, routing, and layout documentation.

---

## Complete Route Structure (129 page routes)

```
/                                    → Public landing page (1131 lines)
/sign-in                             → Login page (619 lines)
/enroll                              → Student self-enrollment
/enrollments                         → Enrollment management
/enrollments/pending                 → Pending enrollments
/forgot-password                     → Password reset request
/change-password                     → Password change
/access-denied                       → 403/404 pages
/schools/[slug]                      → School public page
/schools/[slug]/login                → School-specific login
/s/[code]                            → Short URL redirect
/s/[code]/login                      → Short URL login

/(dashboard)                         → Authenticated routes
├── /                                → Role-aware dashboard home
│
├── /admin/                          → School admin (21 sub-routes)
│   ├── /                            → Admin dashboard
│   ├── /academic-years              → Academic year management
│   ├── /assessments                 → Assessment calendar
│   ├── /assessments/[id]            → Assessment detail/edit
│   ├── /assignments                 → Assignment management
│   ├── /attendance                  → Attendance management
│   ├── /bulk-upload                 → CSV/Excel bulk import
│   ├── /class-sections              → Class and section management
│   ├── /class-sections/[id]         → Class detail
│   ├── /communications              → Communication book
│   ├── /credentials                 → Bulk credential generation
│   ├── /discipline                  → Discipline incidents
│   ├── /discipline/create           → New incident
│   ├── /discipline/[id]             → Incident detail
│   ├── /enrollment                  → Enrollment approval
│   ├── /exams                       → Exam management
│   ├── /exams/entry-progress        → Score entry progress
│   ├── /exams/publish               → Publish exam results
│   ├── /exams/rankings              → Student rankings
│   ├── /exams/seating               → Seating plans
│   ├── /id-cards                    → ID card generation
│   ├── /period-times                → Period time config
│   ├── /practice-exams              → Practice exams list
│   ├── /practice-exams/manage       → Create/edit practice exams
│   ├── /promotion                   → Student promotion
│   ├── /report-cards                → Report card management
│   ├── /report-cards/[id]           → Report card detail
│   ├── /report-cards/certificate-template → Certificate templates
│   ├── /reports/data-consistency    → Data quality reports
│   ├── /reports/parent-presentation → Parent presentation reports
│   ├── /siren-management            → Bell/siren control
│   ├── /teacher-leaderboard         → Teacher leaderboard
│   └── /timetable                   → Timetable management
│
├── /teacher/                        → Teacher portal (10 sub-routes)
│   ├── /                            → Teacher dashboard
│   ├── /attendance                  → Mark attendance
│   ├── /discipline                  → Report discipline
│   ├── /exams                       → Exam management
│   ├── /grading                     → Gradebook
│   ├── /lessons                     → Lesson plans
│   ├── /lessons/[id]                → Lesson detail
│   ├── /lessons/[id]/edit           → Edit lesson
│   ├── /my-class                    → My classes overview
│   ├── /my-class/[id]               → Class detail
│   ├── /online-exams                → Online/practice exams
│   ├── /online-exams/manage         → Manage online exams
│   ├── /online-exams/submissions    → Review submissions
│   └── /timetable                   → My timetable
│
├── /student/                        → Student portal (7 sub-routes)
│   ├── /                            → Student dashboard
│   ├── /attendance                  → My attendance
│   ├── /exams                       → My exams
│   ├── /grades                      → My grades
│   ├── /lessons                     → My lessons
│   ├── /lessons/[id]                → Lesson detail
│   ├── /practice-exams              → Take practice exams
│   ├── /practice-exams/[attemptId]  → Exam attempt
│   └── /timetable                   → My timetable
│
├── /parent/                         → Parent portal (12 sub-routes)
│   ├── /                            → Parent dashboard
│   ├── /attendance                  → Children attendance
│   ├── /children                    → Children list
│   ├── /children/[id]               → Child detail
│   ├── /children/[id]/attendance     → Child attendance
│   ├── /children/[id]/fees          → Child fees
│   ├── /children/[id]/results       → Child results
│   ├── /discipline                  → Children discipline
│   ├── /fees                        → Fee overview
│   ├── /grades                      → Children grades
│   ├── /lessons                     → Children lessons
│   ├── /lessons/[id]                → Lesson detail
│   └── /timetable                   → Children timetable
│
├── /finance/                        → Finance portal (3 sub-routes)
│   ├── /                            → Finance dashboard
│   ├── /payroll                     → Payroll management
│   └── /reports                     → Finance reports
│
├── /registrar/                      → Registrar portal (3 sub-routes)
│   ├── /                            → Registrar dashboard
│   ├── /national-exams              → National exam results
│   └── /school-leaving              → School leaving certs
│
├── /superadmin/                     → Super admin (6 sub-routes)
│   ├── /                            → Platform dashboard
│   ├── /admins                      → Admin management
│   ├── /backups                     → Backup management
│   ├── /subscription                → Subscription overview
│   ├── /subscription/plans          → Plan management
│   └── /subscription/schools        → School subscriptions
│
├── /list/                           → List views (17 sub-routes)
│   ├── /announcements               → All announcements
│   ├── /announcements/[id]          → Announcement detail
│   ├── /assignments                 → All assignments
│   ├── /calendar                    → School calendar
│   ├── /communications              → All communications
│   ├── /exams                       → All exams
│   ├── /finance                     → All finance records
│   ├── /parents                     → All parents
│   ├── /parents/[id]                → Parent detail
│   ├── /parents/[id]/edit           → Edit parent
│   ├── /results                     → All results
│   ├── /schools                     → All schools (superadmin)
│   ├── /schools/[id]/settings       → School settings
│   ├── /staff                       → All staff
│   ├── /staff/[id]                  → Staff detail
│   ├── /students                    → All students
│   ├── /students/[id]               → Student detail
│   ├── /students/[id]/communications → Student communications
│   ├── /students/[id]/edit          → Edit student
│   ├── /teachers                    → All teachers
│   ├── /teachers/[id]               → Teacher detail
│   ├── /teachers/[id]/edit          → Edit teacher
│   ├── /timetable-slots             → All timetable slots
│   ├── /users                       → All users
│   ├── /users/[id]                  → User detail
│   └── /users/[id]/edit             → Edit user
│
├── /attendance                      → Attendance (standalone route)
├── /it-manager                      → IT Manager dashboard
├── /messages                        → Internal messaging
├── /notifications                   → Notification history
├── /platform-settings               → Platform settings (superadmin)
├── /profile                         → User profile
├── /settings                        → User settings
├── /settings/school                 → School settings
└── /help                            → Help page
```

## Layout Hierarchy

```
RootLayout (providers.tsx)
├── QueryClientProvider
│   └── AuthProvider
│       └── CalendarProvider
│           └── ThemeProvider
│               └── RouteTransition
│                   └── SubscriptionWrapper
│                       └── Page Content

(dashboard)/Layout
├── Navbar (user, notifications, search, language)
├── Sidebar (Menu - role-aware)
├── Breadcrumb
├── Main Content
└── Footer
```

## Related Documents

- `frontend/src/app/` — Page implementations
- `frontend/src/app/(dashboard)/layout.tsx` — Dashboard layout
- `docs/UI/Components/README.md` — Component usage on pages
