# Feature Modules — YeneSchool

> Purpose: Index of ALL feature modules with status, backend module, frontend API, and page routes.

---

**Legend**: ✅ Complete | ⚠️ Partial | ❌ Not started

| # | Module | Status | Backend Module | Frontend API | Frontend Pages |
|---|--------|--------|----------------|--------------|----------------|
| 1 | Academic Years | ✅ | `academic-year/` | `api/academic-years.ts` | `/admin/academic-years` |
| 2 | AI Assistant | ❌ | — | — | — |
| 3 | Analytics | ⚠️ | `dashboard/` | various | Role dashboards |
| 4 | Announcements | ✅ | `announcement/` | `api/content.ts` | `/list/announcements/` |
| 5 | Assessments | ✅ | `assessments/` | `api/assessment.ts` | `/admin/assessments/` |
| 6 | Assignments | ⚠️ | `lesson/` | `api/content.ts` | `/admin/assignments` |
| 7 | Attendance | ✅ | `calendar/attendance/` | `api/attendance.ts` | `/admin/attendance`, `/teacher/attendance`, `/student/attendance` |
| 8 | Audit Logging | ✅ | `audit/` | — | — |
| 9 | Authentication | ✅ | `auth/` | `api/auth.ts` | `/sign-in` |
| 10 | Auto Assignment | ✅ | `auto-assignment/` | `api/admin.ts` | — |
| 11 | Backup | ⚠️ | `backup/` | — | `/superadmin/backups` |
| 12 | Bulk Upload | ✅ | `bulk-upload/` | `api/bulk-upload.ts` | `/admin/bulk-upload` |
| 13 | Calendar | ✅ | `calendar/` | `api/operations.ts` | `/list/calendar` |
| 14 | Class Management | ✅ | `class/` | `api/classes.ts` | `/admin/class-sections/` |
| 15 | Class-Subject | ✅ | `class-subject/` | `api/classes.ts` | `/admin/class-sections/[id]` |
| 16 | Communication Book | ✅ | `communication/` | `api/communications.ts` | `/admin/communications`, `/list/communications` |
| 17 | Credentials | ✅ | `credential/` | `api/admin.ts` | `/admin/credentials` |
| 18 | Dashboards | ✅ | `dashboard/` | role-specific | Role home pages |
| 19 | Data Quality | ✅ | `data-quality/` | `api/data-quality.ts` | `/admin/reports/data-consistency` |
| 20 | Departments | ✅ | — | — | — |
| 21 | Discipline | ✅ | `discipline/` | `api/people.ts` | `/admin/discipline/`, `/teacher/discipline/` |
| 22 | Enrollment | ✅ | `enrollment/` | `api/enrollment.ts` | `/enroll`, `/admin/enrollment` |
| 23 | Events | ✅ | `event/` | `api/content.ts` | — |
| 24 | Examinations | ⚠️ | `exams/` | `api/assessment.ts` | `/admin/exams/` (5 sub-routes) |
| 25 | Finance | ✅ | `finance/` | `api/finance.ts` | `/finance/` |
| 26 | Gradebook | ✅ | `grading/` | `api/assessment.ts` | `/teacher/grading` |
| 27 | ID Cards | ✅ | — | — | `/admin/id-cards` |
| 28 | Infrastructure | ✅ | `infrastructure/` | — | — |
| 29 | Lessons | ✅ | `lesson/` | `api/content.ts` | `/teacher/lessons/`, `/student/lessons/` |
| 30 | Library | ❌ | — | — | — |
| 31 | Messaging | ✅ | `messaging/` | `api/communications.ts` | `/messages` |
| 32 | Multi-tenancy | ✅ | Cross-cutting | — | — |
| 33 | Notifications | ✅ | `notification/` | `api/notifications.ts` | `/notifications` |
| 34 | Parent Portal | ✅ | `parent/` | `api/parent.ts` | `/parent/*` (12 sub-routes) |
| 35 | Payments | ✅ | `finance/` | `api/finance.ts` | `/finance/` |
| 36 | Period Times | ✅ | `period-time/` | `api/siren-period-time.ts` | `/admin/period-times` |
| 37 | Platform Settings | ✅ | `platform-settings/` | `api/platform.ts` | `/platform-settings` |
| 38 | Practice Exams | ⚠️ | `practice-exams/` | `api/practice-exams.ts` | `/admin/practice-exams`, `/student/practice-exams/` |
| 39 | Promotion | ⚠️ | `report-card/` | `api/reporting.ts` | `/admin/promotion` |
| 40 | RBAC | ✅ | `rbac/` | `api/admin.ts` | — |
| 41 | Registrar | ✅ | `registrar/` | `api/enrollment.ts` | `/registrar/` |
| 42 | Report Cards | ⚠️ | `report-card/` | `api/reporting.ts` | `/admin/report-cards/` |
| 43 | Reports | ⚠️ | — | `api/reporting.ts` | `/admin/reports/` |
| 44 | School Settings | ✅ | `school-settings/` | `api/school-settings.ts` | `/settings/school` |
| 45 | Schools | ✅ | `school/` | `api/schools.ts` | `/schools/` |
| 46 | Search | ✅ | `search/` | — | GlobalSearch component |
| 47 | Sections | ✅ | `section/` | `api/classes.ts` | `/admin/class-sections/` |
| 48 | Settings | ✅ | — | `api/school-settings.ts`, `api/platform.ts` | `/settings`, `/settings/school` |
| 49 | Siren/Bell | ⚠️ | `siren/` | `api/siren*.ts` (6 modules) | `/admin/siren-management` |
| 50 | Staff | ✅ | — | — | `/list/staff/` |
| 51 | Student Portal | ✅ | `student/` | `api/students.ts` | `/student/*` (7 sub-routes) |
| 52 | Subjects | ✅ | `subjects/` | `api/subjects.ts` | — |
| 53 | Subscription | ✅ | `subscription/` | `api/subscription.ts` | `/superadmin/subscription/` |
| 54 | Sync (Offline) | ⚠️ | `sync/` | — | — |
| 55 | Teacher Portal | ✅ | `teacher/` | `api/teachers.ts` | `/teacher/*` (10 sub-routes) |
| 56 | Templates | ✅ | `templates/` | `api/templates.ts` | — |
| 57 | Timetable | ✅ | `timetable-slot/` | `api/timetable.ts`, `api/timetable-slots.ts` | `/admin/timetable/`, `/teacher/timetable`, `/student/timetable` |
| 58 | Translation | ⚠️ | `translation/` | `api/translation.ts` | — |
| 59 | Transport | ❌ | — | — | — |
| 60 | Hostel | ❌ | — | — | — |
| 61 | Inventory | ❌ | — | — | — |
| 62 | Library | ❌ | — | — | — |
| 63 | SMS | ❌ | — | — | — |
| 64 | Email | ❌ | — | — | — |
