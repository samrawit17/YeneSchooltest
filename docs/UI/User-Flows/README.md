# User Flows — YeneSchool

> Purpose: End-to-end user workflows for key operations.

---

## 1. Enrollment Flow

```mermaid
graph TD
    A[Student visits school page] --> B[Selects school]
    B --> C[Fills enrollment form]
    C --> D[Uploads documents]
    D --> E[EnrollmentRequest PENDING]
    E --> F{Admin/Registrar reviews}
    F -->|Approve| G[StudentProfile created]
    F -->|Reject| H[Email notification with reason]
    G --> I[User account created]
    I --> J[Class assigned]
    J --> K[Parent linked]
```

## 2. Grading Flow

```mermaid
graph TD
    A[Teacher creates GradingComponents] --> B[Enters scores per student]
    B --> C[SubjectGrade DRAFT]
    C --> D[Teacher submits]
    D --> E[SUBMITTED]
    E --> F{Admin reviews}
    F -->|Approve| G[APPROVED - visible to students]
    F -->|Reject| H[REJECTED - teacher revises]
    H --> B
```

## 3. Fee Payment Flow

```mermaid
graph TD
    A[Admin creates FeeStructure] --> B[Fees assigned to students]
    B --> C[Student installments generated]
    C --> D[Finance records payment]
    D --> E[Receipt generated PDF]
    E --> F[Payment reflected in student account]
```

## 4. Attendance Flow

```mermaid
graph TD
    A[Teacher opens attendance] --> B{Online?}
    B -->|Yes| C[Mark attendance - saved to DB]
    B -->|No| D[Mark attendance - saved to IndexedDB]
    D --> E{Network restored?}
    E -->|Yes| F[Auto-sync to backend]
    E -->|No| G[Stored locally until online]
    F --> H[Conflict resolution if needed]
```

## 5. Report Card Flow

```mermaid
graph TD
    A[Grades compiled] --> B[Attendance summary added]
    B --> C[Teacher remarks entered]
    C --> D[DRAFT report card]
    D --> E[Admin publishes]
    E --> F[PUBLISHED - visible to student/parent]
    F --> G[ARCHIVED at year end]
```

## 6. Payroll Flow

```mermaid
graph TD
    A[Finance creates PayrollRun] --> B[DRAFT]
    B --> C[Salary entries calculated]
    C --> D[Finance approves]
    D --> E[APPROVED]
    E --> F[Mark as PAID]
    F --> G[PayrollEntry records per employee]
    G --> H[Tax tracked]
```

## Related Documents

- `docs/BUSINESS_RULES.md` — Detailed business rules for each flow
- `docs/FEATURES/*/README.md` — Feature-specific workflows
