# Business Rules — YeneSchool

> Purpose: Comprehensive catalog of business rules, validation logic, and domain constraints.

---

## 1. Academic Calendar Rules

| Rule | Description |
|------|-------------|
| R1 | Academic year runs Meskerem (Month 1) to Sene (Month 10), approximately Sep–Jun |
| R2 | Ethiopian calendar has 13 months: 12 × 30 days + Pagume (5–6 days) |
| R3 | Curriculum periods: SEMESTER (2), TRIMESTER (3), QUARTER (4), or CUSTOM |
| R4 | A school year must have at least one active term |
| R5 | Only one academic year can be `IS_CURRENT` per school at a time |

### Semester Mapping
| Semester | Ethiopian Months | Gregorian |
|----------|-----------------|-----------|
| Semester 1 | Meskerem–Tahsas (1–4) | Sep–Dec |
| Semester 2 | Tir–Sene (5–10) | Jan–Jun |

### Trimester Mapping
| Trimester | Ethiopian Months | Gregorian |
|-----------|-----------------|-----------|
| Trimester 1 | Meskerem–Hidar (1–3) | Sep–Nov |
| Trimester 2 | Tahsas–Megabit (4–7) | Dec–Mar |
| Trimester 3 | Miazia–Sene (8–10) | Apr–Jun |

---

## 2. Billing & Finance Rules

| Rule | Description |
|------|-------------|
| F1 | Currency is always ETB (Ethiopian Birr) |
| F2 | School months = 10 (not 12). MONTHLY billing generates 10 installments |
| F3 | Due dates calculated using Ethiopian calendar, not Gregorian |
| F4 | Billing methods: FULL_PAYMENT, PER_TERM, MONTHLY, INSTALLMENT |
| F5 | One `Fee` record per installment with amount + Ethiopian dueDate |
| F6 | Discount policies can be PERCENTAGE or FIXED_AMOUNT |
| F7 | Payroll workflow: DRAFT → APPROVED → PAID |
| F8 | Tax tracked per payroll entry |

---

## 3. Enrollment Rules

| Rule | Description |
|------|-------------|
| E1 | Self-enrollment creates PENDING EnrollmentRequest |
| E2 | Admin/Registrar must approve before StudentProfile + User are created |
| E3 | Enrollment requires: student name, grade, previous school, documents |
| E4 | A student can only be enrolled in one active class per academic year |
| E5 | Student code is auto-generated per school (configurable prefix + sequence) |

---

## 4. Grading Rules

| Rule | Description |
|------|-------------|
| G1 | Teachers create GradingComponents (CA, Midterm, Final, etc.) per subject |
| G2 | Grade lifecycle: DRAFT → SUBMITTED → APPROVED / REJECTED |
| G3 | GradeChangeLog tracks every modification |
| G4 | GradeScale defines letter grade ranges (A, B, C, D, F) per school |
| G5 | Final grade is computed from weighted components |

---

## 5. Report Card Rules

| Rule | Description |
|------|-------------|
| RC1 | Report card lifecycle: DRAFT → PUBLISHED → ARCHIVED |
| RC2 | PUBLISHED report cards are visible to students and parents |
| RC3 | ARCHIVED report cards are historical and cannot be modified |
| RC4 | Report cards include: grades, attendance summary, teacher remarks |

---

## 6. Attendance Rules

| Rule | Description |
|------|-------------|
| A1 | Attendance can be taken offline and synced when online |
| A2 | Conflict resolution: server timestamp wins by default |
| A3 | Attendance records tied to AttendanceSession (date + period + class) |
| A4 | Statuses: PRESENT, ABSENT, LATE, EXCUSED |

---

## 7. RBAC Rules

| Rule | Description |
|------|-------------|
| RB1 | 8 roles: SUPER_ADMIN, ADMIN, IT_MANAGER, REGISTRAR, TEACHER, STUDENT, PARENT, FINANCE |
| RB2 | SUPER_ADMIN has unrestricted access across all schools |
| RB3 | ADMIN role is per-school — cannot access other schools' data |
| RB4 | PARENT role only sees their linked children's data |
| RB5 | Permissions are defined in `DEFAULT_ROLE_PERMISSIONS` (backend) |
| RB6 | Custom permissions can be assigned via `UserPermission` overrides |

---

## 8. Multi-Tenancy Rules

| Rule | Description |
|------|-------------|
| MT1 | All schools share one PostgreSQL database |
| MT2 | Data isolation via `schoolId` column on every tenant-scoped table |
| MT3 | Redis keys namespaced: `school:{schoolId}:resource:{id}` |
| MT4 | `schoolId` extracted from JWT, never from request body |
| MT5 | SUPER_ADMIN can bypass school scoping for platform operations |
| MT6 | Subscription plans (CORE/STANDARD/ULTIMATE) gate feature access |

---

## 9. Timetable Rules

| Rule | Description |
|------|-------------|
| T1 | Timetable slots are per class-section combination |
| T2 | PeriodTimes define start/end times configurable per school |
| T3 | A teacher can only be assigned to one class-subject at a time slot |
| T4 | Break/lunch periods are defined in PeriodTime with type indicators |

---

## 10. Exam Rules

| Rule | Description |
|------|-------------|
| X1 | Exam seating plans generate random or arranged seating |
| X2 | National exam results track subject-level performance |
| X3 | Practice exams support: MCQ, True/False, Short Answer, with auto-grading |
| X4 | Exam results cannot be modified after PUBLISHED status |

---

## 11. Communication Rules

| Rule | Description |
|------|-------------|
| C1 | Communication book: structured parent-teacher communication about students |
| C2 | Internal messaging: real-time chat between school staff |
| C3 | Announcements: school-wide or targeted (by class/grade) |
| C4 | Notifications: Web Push to subscribed devices |

---

## 12. Validation Rules (Cross-Cutting)

| Rule | Description |
|------|-------------|
| V1 | All IDs must be valid UUIDs (`@IsUUID()`) |
| V2 | Ethiopian dates must conform to format YYYY-MM-DD in Ethiopian calendar |
| V3 | File uploads limited to 10MB (base64) |
| V4 | Email addresses must be unique within a school |
| V5 | Student codes must be unique within a school per academic year |

---

## 13. Related Documents

- `ARCHITECTURE.md` — System architecture
- `docs/FEATURES/*/README.md` — Feature-specific rules
- `docs/SECURITY.md` — Security validation rules
- `docs/DATABASE.md` — Schema constraints

---

> **Last updated**: June 2026
