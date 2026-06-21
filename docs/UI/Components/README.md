# UI Components — YeneSchool

> Purpose: Catalog of shared UI components and their usage.

---

## Shadcn UI Primitives

Located in `frontend/src/components/ui/`. These are Radix-based accessible primitives:

- `Button`, `Card`, `Dialog`, `DropdownMenu`, `Select`, `Input`, `Label`
- `Table`, `Tabs`, `Avatar`, `Badge`, `Checkbox`, `RadioGroup`
- `Switch`, `Tooltip`, `Popover`, `ScrollArea`, `Progress`, `Separator`
- `AlertDialog`, `Collapsible`, `Toggle`, `ToggleGroup`

## Form Components (14)

Located in `frontend/src/components/forms/`:

| Component | Purpose |
|-----------|---------|
| `AcademicYearForm` | Create/edit academic years |
| `ClassForm` | Create/edit classes |
| `ClassSubjectForm` | Assign subjects/teachers to classes |
| `EnrollmentForm` | Student enrollment form |
| `EventForm` | School event creation |
| `ParentChildLinkForm` | Link parent to student |
| `SchoolAdminForm` | Create/edit school admin users |
| `SchoolForm` | Create/edit schools |
| `SectionForm` | Create/edit sections |
| `SubjectForm` | Create/edit subjects |
| `TermForm` | Create/edit terms |
| `TimetableSlotForm` | Timetable slot management |
| `UnifiedStaffForm` | Unified staff creation form |
| `UnifiedStudentForm` | Unified student creation form |

## Application Components

| Component | File | Description |
|-----------|------|-------------|
| Navbar | `components/Navbar.tsx` | Top navigation bar with user menu, notifications, search, language switch |
| Menu | `components/Menu.tsx` | Role-aware sidebar navigation |
| Breadcrumb | `components/Breadcrumb.tsx` | Dynamic breadcrumb trail |
| Table | `components/Table.tsx` | Data table with sorting, filtering |
| TableSearch | `components/TableSearch.tsx` | Search input for data tables |
| Pagination | `components/Pagination.tsx` | Page navigation |
| FormModal | `components/FormModal.tsx` | Modal wrapper for forms |
| InputField | `components/InputField.tsx` | Form input with label + error |
| GlobalSearch | `components/GlobalSearch.tsx` | Cross-entity search |
| BigCalendar | `components/BigCalendar.tsx` | Full calendar view |
| WeeklyCalendar | `components/WeeklyCalendar.tsx` | Week-at-a-glance calendar |
| ThemeProvider | `components/ThemeProvider.tsx` | Dark/light/system theme wrapper |
| ToastProvider | `components/ToastProvider.tsx` | Sonner toast notifications |
| RouteTransition | `components/RouteTransition.tsx` | Page transition animations |
| FeatureGuard | `components/FeatureGuard.tsx` | Subscription-based feature gating |
| AccessDenied | `components/AccessDenied.tsx` | 403 page |
| PushNotificationManager | `components/PushNotificationManager.tsx` | Web Push subscription UI |
| StudentIdCard | `components/StudentIdCard.tsx` | Printable student ID card |

## Feature-Specific Components

Located in `frontend/src/components/<module>/`:

- `finance/` — Financial UI components
- `forms/` — Reusable form components
- `siren/` — Bell/siren control UI
- `timetable/` — Timetable display components
- `communications/` — Messaging UI
- `announcement/` — Announcement components
- `students/` — Student-related components
- `filters/` — Filter UI components
- `translation/` — Translation UI
- `charts/` — Recharts/Visx chart wrappers

## Related Documents

- `docs/UI/Design-System/README.md` — Design tokens
- `frontend/src/components/` — Implementation
- `docs/CODING_STANDARDS.md` (Section 3.2) — Component conventions
