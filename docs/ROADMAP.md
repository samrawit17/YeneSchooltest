# Product Roadmap — YeneSchool

> Purpose: Development roadmap, release phases, and feature priorities.

---

## 1. Current Status

**Version**: 0.5.0 | **Completion**: ~50% | **Phase**: Alpha

---

## 2. Release Phases

### Phase 1: Alpha (Current)
**Goal**: Core functionality for single-school pilot

| Feature | Status |
|---------|--------|
| Authentication & RBAC | ✅ Complete |
| School Management | ✅ Complete |
| Student Management | ✅ Complete |
| Teacher Management | ✅ Complete |
| Parent Management | ✅ Complete |
| Class & Section Management | ✅ Complete |
| Subject Management | ✅ Complete |
| Timetable | ✅ Complete |
| Attendance (online) | ✅ Complete |
| Gradebook | ✅ Complete |
| Finance (fees, payments) | ✅ Complete |
| Communication Book | ✅ Complete |
| Announcements | ✅ Complete |
| Notifications | ✅ Complete |
| Siren/Bell System | ⚠️ Partial |
| Internal Messaging | ✅ Complete |

### Phase 2: Beta (Q3 2026)
**Goal**: Multi-school readiness, exam management, reporting

| Feature | Priority |
|---------|----------|
| Full Exam Management | High |
| Report Cards (complete workflow) | High |
| Practice Exams (auto-grading pipeline) | High |
| Offline Sync (conflict resolution) | High |
| Payroll (complete) | Medium |
| Bulk Upload (student/staff) | Medium |
| Data Quality Dashboard | Medium |
| Document Templates (ID cards, certs) | Low |

### Phase 3: v1.0 (Q4 2026)
**Goal**: Production-ready for multi-school deployment

| Feature | Priority |
|---------|----------|
| Library Management | High |
| Inventory Management | High |
| Transport Management | High |
| Hostel Management | High |
| Discipline Module (enhanced) | Medium |
| Advanced Reporting | Medium |
| Backup/Restore UI | Medium |
| Translation Service (Azure/Google) | Medium |
| Performance Optimization | High |
| Security Audit | High |

### Phase 4: v2.0 (Q1 2027)
**Goal**: AI-powered platform

| Feature | Priority |
|---------|----------|
| AI Assistant (chatbot for staff) | High |
| Predictive Analytics (student performance) | High |
| Automated Report Generation | Medium |
| Smart Timetable Builder | Medium |
| Anomaly Detection (finance, attendance) | Medium |
| Voice Assist (Amharic/English) | Low |

---

## 3. Known Incomplete Areas

| Area | Gap |
|------|-----|
| Report Cards | Publish/archive workflow may be partially implemented |
| Practice Exams | Full grading pipeline needs verification |
| Offline Sync | SyncService and conflict resolution — verify completeness |
| Siren Hardware Webhook | Webhook contract needs definition |
| Translation Providers | Azure/Google integration needs configuration |
| Backup/Restore | UI may be incomplete |
| Parent Dashboard | Verify full feature parity |
| Student Promotion | PromotionRecord exists, logic may need review |

---

## 4. Technical Debt

- [ ] Package name still `lama-dev-next-dashboard` in frontend package.json
- [ ] Some files may have old project references in comments
- [ ] Test coverage gaps (backend tests exist, frontend E2E minimal)
- [ ] Swagger/OpenAPI documentation not yet generated
- [ ] Error boundaries need expansion

---

## 5. Related Documents

- `docs/PROJECT_OVERVIEW.md` — Product vision
- `docs/FEATURES/*/README.md` — Feature specs
- `ARCHITECTURE.md` (Section 15) — Known incomplete areas

---

> **Last updated**: June 2026
