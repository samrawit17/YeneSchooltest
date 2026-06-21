# Database Design — YeneSchool

> Purpose: Database architecture, patterns, migration strategy, and entity relationships.

---

## 1. Overview

- **Database**: PostgreSQL 16
- **ORM**: Prisma 7 (`@prisma/client` + `@prisma/adapter-pg`)
- **Schema File**: `backend/prisma/schema.prisma` (2673 lines, 59 data models + 36 enums)
- **ID Strategy**: `cuid()` — Prisma's default ID generator for all models
- **Connection Pooling**: `@prisma/adapter-pg` with configurable pool size/timeouts

---

## 2. Multi-Tenancy (CRITICAL)

Every tenant-scoped table has a `schoolId String` field. Data isolation is enforced at the query level:

```prisma
model StudentProfile {
  id       String @id @default(cuid())
  schoolId String
  // ...
}
```

Rules:
- All queries **must** filter by `schoolId`
- `schoolId` comes from JWT, never from request body
- Cross-school data access is only possible for `SUPER_ADMIN`

---

## 3. Enums (36)

| Enum | Values |
|------|--------|
| `Role` | SUPER_ADMIN, ADMIN, IT_MANAGER, REGISTRAR, TEACHER, STUDENT, PARENT, FINANCE |
| `AttendanceStatus` | PRESENT, ABSENT, LATE, HALF_DAY, LEAVE, HOLIDAY, EXCUSED |
| `AttendanceRecordStatus` | PRESENT, ABSENT, LATE, EXCUSED |
| `SessionStatus` | NOT_SUBMITTED, SUBMITTED |
| `AssessmentStatus` | DRAFT, ACTIVE, LOCKED, COMPLETED |
| `AssessmentScoreStatus` | DRAFT, SUBMITTED |
| `ExamType` | MID_TERM, FINAL, QUIZ, PRACTICAL, ASSIGNMENT |
| `NationalExamType` | GRADE_6_REGIONAL, GRADE_8_REGIONAL, GRADE_12_ESLCE |
| `NationalExamSource` | NEAEA, REGIONAL_BUREAU, MANUAL |
| `NationalExamBatchStatus` | DRAFT, IMPORTED, PUBLISHED |
| `NationalExamResultStatus` | PENDING, PASS, FAIL, WITHHELD, ABSENT |
| `EnrollmentStatus` | PENDING, APPROVED, REJECTED, WAITLISTED |
| `EnrollmentRequestStatus` | PENDING, DOCUMENTS_PENDING, APPROVED, REJECTED, WAITLISTED, CANCELLED |
| `PaymentStatus` | PENDING, PAID, PARTIAL, OVERDUE, CANCELLED |
| `PayrollFrequency` | MONTHLY |
| `PayrollRunStatus` | DRAFT, APPROVED, PAID, CANCELLED |
| `PayrollEntryStatus` | PENDING, APPROVED, PAID, HELD |
| `PayrollPaymentMethod` | CASH, BANK_TRANSFER, CHEQUE |
| `GradeStatus` | DRAFT, SUBMITTED, APPROVED, REJECTED |
| `ReportCardStatus` | DRAFT, PUBLISHED, ARCHIVED |
| `CurriculumType` | SEMESTER, QUARTER, TERM, CUSTOM |
| `CalendarType` | GREGORIAN, ETHIOPIAN |
| `CommunicationStatus` | OPEN, ACKNOWLEDGED, CLOSED |
| `CommunicationCategory` | ACADEMIC, ATTENDANCE, DISCIPLINE, HEALTH, GENERAL |
| `ContentType` | LESSON, HOMEWORK, ASSIGNMENT |
| `ResourceType` | WORKSHEET, READING_MATERIAL, HANDOUT, EXAM_PREP, OTHER |
| `SubmissionStatus` | PENDING, SUBMITTED, GRADED, LATE, MISSING |
| `LessonStatus` | DRAFT, PENDING_REVIEW, PUBLISHED, COVERED, MISSED, RESCHEDULED |
| `DisciplineSeverity` | LOW, MEDIUM, HIGH, CRITICAL |
| `DisciplineStatus` | OPEN, INVESTIGATING, RESOLVED, ESCALATED |
| `PracticeExamStatus` | DRAFT, READY, ACTIVE, ARCHIVED |
| `PracticeExamAttemptStatus` | IN_PROGRESS, SUBMITTED, EXPIRED |
| `PracticeExamQuestionType` | MCQ, TRUE_FALSE, SHORT_ANSWER |
| `PracticeExamOption` | A, B, C, D |
| `SeatingMode` | SINGLE_GRADE, GRADE_RANGE |
| `PlanTier` | CORE, STANDARD, ULTIMATE |
| `DocumentTemplateType` | CERTIFICATE, ID_CARD |
| `ThemePreference` | LIGHT, DARK, SYSTEM |

## 4. Data Models (59 tables)

### Core & Auth (5)
| Model | Key Fields | Relationships |
|-------|------------|---------------|
| `School` | id, name, slug, key, logo, address, phone | → User, AcademicYear, Class, etc. |
| `User` | id, email, password, role (enum), schoolId, name, active | → School, TeacherProfile, StudentProfile, ParentProfile |
| `Permission` | id, module, action, description | → RolePermission, UserPermission |
| `RolePermission` | id, role (enum), permissionId | → Permission |
| `UserPermission` | id, userId, permissionId, granted | → User, Permission |

### Academic Structure (8)
| Model | Key Fields | Relationships |
|-------|------------|---------------|
| `AcademicYear` | id, schoolId, name, startDate, endDate, isCurrent, curriculumType, calendarType | → School, Term, Class |
| `Term` | id, academicYearId, name, startDate, endDate, sequence | → AcademicYear, SubjectGrade |
| `GradeLevel` | id, schoolId, name, sequence | → Class |
| `Class` | id, schoolId, name, academicYearId, gradeLevelId, homeroomTeacherId | → Section, ClassSubject, StudentClass |
| `Section` | id, schoolId, classId, name, capacity, academicYearId | → Class, ClassSubject |
| `Subject` | id, schoolId, name, code, type | → ClassSubject, TeacherSubjectAssignment |
| `ClassSubject` | id, schoolId, classId, sectionId, subjectId, teacherId | → Class, Section, Subject, User(Teacher) |
| `TeacherSubjectAssignment` | id, schoolId, teacherId, subjectId, classId, sectionId, academicYearId | → User, Subject, Class, Section |

### People (6)
| Model | Key Fields | Relationships |
|-------|------------|---------------|
| `StudentProfile` | id, schoolId, userId, firstName, lastName, studentCode, gender, dateOfBirth, faydaNumber, rollNumber | → User, ParentStudent, StudentClass, StudentFee |
| `TeacherProfile` | id, schoolId, userId, firstName, lastName, employeeId, department, specialization | → User, Department |
| `ParentProfile` | id, schoolId, userId, firstName, lastName, phone, email | → User, ParentStudent |
| `ParentStudent` | id, schoolId, parentId, studentId, relationship (FATHER/MOTHER/GUARDIAN/OTHER) | → ParentProfile, StudentProfile |
| `StudentClass` | id, schoolId, studentId, classId, academicYearId | → StudentProfile, Class |
| `Department` | id, schoolId, name, headId | → TeacherProfile |

### Enrollment (2)
| Model | Key Fields | Relationships |
|-------|------------|---------------|
| `Enrollment` | id, schoolId, studentId, enrollmentDate, status | → StudentProfile |
| `EnrollmentRequest` | id, schoolId, studentName, grade, previousSchool, documents, status | → School |

### Attendance (3)
| Model | Key Fields | Relationships |
|-------|------------|---------------|
| `Attendance` | id, schoolId, studentId, date, status, classId | → StudentProfile |
| `AttendanceSession` | id, schoolId, classId, date, period, teacherId, status | → Class, User |
| `AttendanceRecord` | id, schoolId, sessionId, studentId, status, markedAt | → AttendanceSession, StudentProfile |

### Grading & Assessment (8)
| Model | Key Fields | Relationships |
|-------|------------|---------------|
| `Grade` | id, schoolId, studentId, examId, marks, grade | → StudentProfile, Exam |
| `SubjectGrade` | id, schoolId, studentId, classSubjectId, termId, totalScore, letterGrade, status | → StudentProfile, ClassSubject, Term |
| `GradingComponent` | id, schoolId, name, weight, maxScore, classSubjectId | → ClassSubject |
| `GradeScore` | id, schoolId, gradingComponentId, studentId, score, markedBy | → GradingComponent, StudentProfile |
| `GradeScale` | id, schoolId, name, gradeRanges (JSON) | → School |
| `GradeChangeLog` | id, schoolId, gradeScoreId, userId, oldValue, newValue, reason | → GradeScore, User |
| `Assessment` | id, schoolId, name, type, status, startDate, endDate | → AssessmentSubject |
| `AssessmentSubject` | id, schoolId, assessmentId, classId, sectionId, subjectId, teacherId | → Assessment, Class, Section, Subject |
| `StudentAssessmentScore` | id, schoolId, assessmentSubjectId, studentId, score, status | → AssessmentSubject, StudentProfile |
| `AssessmentWeight` | id, schoolId, assessmentType, weight, academicYearId | → AcademicYear |

### Exams (7)
| Model | Key Fields | Relationships |
|-------|------------|---------------|
| `Exam` | id, schoolId, title, type, date, maxMarks, published | → ExamResult, ExamSeatingPlan |
| `ExamResult` | id, schoolId, examId, studentId, marksObtained, grade | → Exam, StudentProfile |
| `NationalExamResultBatch` | id, schoolId, year, type, source, status | → NationalExamResult |
| `NationalExamResult` | id, schoolId, batchId, studentId, year, type, totalScore, status | → NationalExamResultBatch, StudentProfile |
| `NationalExamSubjectResult` | id, schoolId, nationalExamResultId, subject, score | → NationalExamResult |
| `ExamSeatingPlan` | id, schoolId, examId, seatingMode, layout | → Exam, ExamSectionAssignment |
| `ExamSectionAssignment` | id, seatingPlanId, sectionId, room | → ExamSeatingPlan, ExamSectionStudent |
| `ExamSectionStudent` | id, assignmentId, studentId, seatNumber | → ExamSectionAssignment, StudentProfile |

### Practice Exams (4)
| Model | Key Fields | Relationships |
|-------|------------|---------------|
| `PracticeExam` | id, schoolId, title, description, type, timeLimit, status | → PracticeExamQuestion, PracticeExamAttempt |
| `PracticeExamQuestion` | id, practiceExamId, questionText, type, options (JSON), correctAnswer, points | → PracticeExam, PracticeExamAnswer |
| `PracticeExamAttempt` | id, practiceExamId, studentId, startedAt, completedAt, score, status | → PracticeExam, StudentProfile, PracticeExamAnswer |
| `PracticeExamAnswer` | id, attemptId, questionId, answer, isCorrect, pointsEarned | → PracticeExamAttempt, PracticeExamQuestion |

### Report Cards (2)
| Model | Key Fields | Relationships |
|-------|------------|---------------|
| `ReportCard` | id, schoolId, studentId, termId, status, marksJson, percentage, grade, rank, attendanceSummary | → StudentProfile, Term |
| `PromotionRecord` | id, schoolId, studentId, fromClassId, toClassId, academicYearId, status | → StudentProfile, Class |

### Finance (8)
| Model | Key Fields | Relationships |
|-------|------------|---------------|
| `FeeStructure` | id, schoolId, name, billingMethod, totalAmount, installments, academicYearId | → StudentFee |
| `StudentFee` | id, schoolId, studentId, feeStructureId, academicYearId, totalAmount, paidAmount, status | → StudentProfile, FeeStructure |
| `Payment` | id, schoolId, studentFeeId, amount, date, method, reference | → StudentFee, Receipt |
| `Receipt` | id, paymentId, receiptNumber, pdfUrl, generatedAt | → Payment |
| `DiscountPolicy` | id, schoolId, type (PERCENTAGE/FIXED), value, criteria | → School |
| `FinanceProfile` | id, schoolId, userId, role, department | → User |
| `FinanceAuditLog` | id, schoolId, userId, action, entityType, entityId, changes | → User |
| `PayrollSalary` | id, schoolId, financeProfileId, amount, effectiveDate | → FinanceProfile |
| `PayrollRun` | id, schoolId, status, period, totalAmount | → PayrollEntry |
| `PayrollEntry` | id, payrollRunId, financeProfileId, amount, tax, status | → PayrollRun, FinanceProfile |

### Communication (6)
| Model | Key Fields | Relationships |
|-------|------------|---------------|
| `Communication` | id, schoolId, studentId, authorId, category, subject, body, status | → StudentProfile, User, CommunicationReply |
| `CommunicationReply` | id, communicationId, authorId, body | → Communication, User |
| `Conversation` | id, schoolId, title | → ConversationParticipant, Message |
| `ConversationParticipant` | id, conversationId, userId, lastReadAt | → Conversation, User |
| `Message` | id, conversationId, senderId, body, createdAt | → Conversation, User, MessageRead |
| `MessageRead` | id, messageId, userId, readAt | → Message, User |

### Notifications (3)
| Model | Key Fields | Relationships |
|-------|------------|---------------|
| `Notification` | id, schoolId, userId, title, body, type, read | → User |
| `NotificationPreference` | id, schoolId, userId, type, enabled | → User |
| `PushSubscription` | id, schoolId, userId, endpoint, keys (JSON) | → User |

### Content & Lessons (5)
| Model | Key Fields | Relationships |
|-------|------------|---------------|
| `Content` | id, schoolId, type (LESSON/HOMEWORK/ASSIGNMENT), title, description, status, date | → ContentSubmission, ContentAttachment, ContentResource |
| `ContentSubmission` | id, schoolId, contentId, studentId, status, grade, feedback | → Content, StudentProfile |
| `ContentAttachment` | id, schoolId, contentId, fileUrl, type | → Content |
| `ContentResource` | id, schoolId, contentId, type, url | → Content |
| `SyllabusMapping` | id, schoolId, subjectId, gradeLevel, topic, code, objectives | → Subject |

### Events & Announcements (2)
| Model | Key Fields | Relationships |
|-------|------------|---------------|
| `SchoolEvent` | id, schoolId, title, description, startDate, endDate, category, assessmentId | → Assessment |
| `Announcement` | id, schoolId, title, body, priority, targetRoles | → School |

### Scheduling (5)
| Model | Key Fields | Relationships |
|-------|------------|---------------|
| `TimetableSlot` | id, schoolId, classId, sectionId, subjectId, teacherId, periodTimeId, dayOfWeek | → Class, Section, Subject, User, PeriodTime |
| `PeriodTime` | id, schoolId, name, startTime, endTime, type | → School |
| `SirenSchedule` | id, schoolId, name, type, dayOfWeek, time, duration, enabled | → School |
| `SirenEvent` | id, schoolId, scheduledTime, actualRingTime, status, triggeredBy | → School |
| `SirenHardwareConfig` | id, schoolId, webhookUrl, apiKey, enabled | → School |

### Documents (2)
| Model | Key Fields | Relationships |
|-------|------------|---------------|
| `Document` | id, schoolId, entityType, entityId, type, url | → Polymorphic |
| `Template` | id, schoolId, name, type, layout (JSON), variables | → School |

### System (9)
| Model | Key Fields | Relationships |
|-------|------------|---------------|
| `PlatformSetting` | id, key, value, type, description | — (global) |
| `SchoolSetting` | id, schoolId, key, value | → School |
| `SchoolSettings` | id, schoolId, calendarType, defaultAcademicYearId, assessmentTypes (JSON) | → School |
| `SchoolYearCounter` | id, schoolId, academicYearId, entityType, counter, prefix | → School, AcademicYear |
| `PasswordResetToken` | id, userId, token, expiresAt | → User |
| `PendingCredential` | id, schoolId, userId, username, tempPassword, delivered | → User |
| `CredentialGenerationLog` | id, schoolId, userId, count, timestamp | → User |
| `SyncConflict` | id, schoolId, entityType, entityId, clientData, serverData, resolved | → School |
| `SyncLog` | id, schoolId, userId, operationCount, conflicts, status | → School |
| `SystemAuditLog` | id, schoolId, userId, action, entityType, entityId, oldValues, newValues | → User |
| `DisciplineIncident` | id, schoolId, studentId, type, severity, description, date, location, reportedBy, action, status | → StudentProfile |
| `TranslationCache` | id, schoolId, sourceText, sourceLang, targetLang, translatedText, provider | → School |

### Subscription (2)
| Model | Key Fields | Relationships |
|-------|------------|---------------|
| `Plan` | id, name, tier (enum), features (JSON), price, durationDays | → Subscription |
| `Subscription` | id, schoolId, planId, startDate, endDate, status, autoRenew | → School, Plan |

---

## 4. Key Relationships

```
School 1──N User
School 1──N AcademicYear
School 1──N Class
School 1──N Subject
AcademicYear 1──N Term
Class 1──N Section
Class 1──N ClassSubject
ClassSubject N──1 TeacherProfile
StudentProfile N──M ParentProfile (via ParentStudent)
StudentProfile N──M Class (via StudentClass)
StudentProfile 1──N StudentFee
FeeStructure 1──N StudentFee
```

---

## 5. Migration Strategy

```bash
# Generate Prisma client after schema changes
cd backend && npx prisma generate

# Create migration
cd backend && npx prisma migrate dev --name <migration_name>

# Apply to production
cd backend && npx prisma migrate deploy

# In dev/reset scenarios
cd backend && npx prisma db push
```

Migrations run automatically at container startup via `docker-entrypoint.sh`.

---

## 6. Schema Change Guidelines

1. **Always add `schoolId`** to new tenant-scoped models
2. **Use `cuid()`** for all primary keys
3. **Add `@updatedAt`** to models that track modification time
4. **Use enums** for fixed sets (e.g., `BillingMethod`, `CurriculumPeriod`)
5. **Add indexes** for frequently queried fields (schoolId, userId, createdAt)
6. **Never delete columns** without a deprecation period — use a soft-delete approach first
7. **Document relationships** in the schema with comments for non-obvious associations

---

## 7. Common Query Patterns

```typescript
// Scoped query (ALWAYS)
async findBySchool(schoolId: string) {
  return this.prisma.studentProfile.findMany({ where: { schoolId } });
}

// Scoped + related
async findWithRelations(schoolId: string, studentId: string) {
  return this.prisma.studentProfile.findFirst({
    where: { id: studentId, schoolId },
    include: { parentStudents: { include: { parent: true } } },
  });
}
```

---

## 8. Related Documents

- `backend/prisma/schema.prisma` — Full schema definition
- `ARCHITECTURE.md` (Section 8) — Entity overview
- `docs/BUSINESS_RULES.md` — Validation and business logic

---

> **Last updated**: June 2026
