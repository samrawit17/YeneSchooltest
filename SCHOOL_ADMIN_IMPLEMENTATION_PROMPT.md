# School Admin Implementation Prompt

Use this prompt for an AI coding agent working in the SMS repo.

## Prompt

```text
Implement a full `SCHOOL_ADMIN` role across both backend and frontend in this SMS codebase.

Repo:
- /home/usman/Desktop/SMS

Context:
- HR functionality has been removed from the system.
- The current `ADMIN` role is too overloaded and is being used like an IT/operator role.
- We need a new `SCHOOL_ADMIN` role that is superior to normal `ADMIN` within a single school.
- `SCHOOL_ADMIN` should own school-level authority such as staff/user creation and update.
- Existing `ADMIN` should become a narrower operational role, not the highest school authority.

Goal:
- Add a new `SCHOOL_ADMIN` role end-to-end.
- Re-scope permissions so `SCHOOL_ADMIN` is the highest school-scoped role.
- Keep `SUPER_ADMIN` as the platform-wide role above all schools.
- Reduce `ADMIN` so it no longer implicitly has full staff-management authority unless explicitly intended.

Required behavior:

1. Role hierarchy
- `SUPER_ADMIN`: platform owner across all schools
- `SCHOOL_ADMIN`: highest authority within one school
- `ADMIN`: operational / IT / support role inside one school
- Keep existing functional roles:
  - `REGISTRAR`
  - `FINANCE`
  - `TEACHER`
  - `PARENT`
  - `STUDENT`

2. `SCHOOL_ADMIN` responsibilities
- Create staff users
- Update staff users
- Deactivate staff users
- Manage school-level settings
- Access full school dashboard
- Manage teachers, registrar, finance, parents, students, classes, sections, timetable, announcements, events
- Access finance module only if current school rules allow it in the existing permission model

3. `ADMIN` responsibilities after the split
- Treat `ADMIN` as operational/IT support, not the highest school authority
- Remove or reduce these from `ADMIN` unless there is a strong existing business need:
  - broad staff user creation
  - broad staff user deactivation
  - full user management over all staff
- Preserve only the operational permissions that still make sense

4. Backend work
- Add `SCHOOL_ADMIN` to:
  - role enum(s)
  - Prisma schema role enum
  - seed data where appropriate
  - auth logic
  - permissions maps
  - decorators/guards usage wherever role checks are explicit
- Update:
  - `DEFAULT_ROLE_PERMISSIONS`
  - any `@Roles(...)` decorators
  - dashboard role routing
  - search permissions
  - messaging permissions if school admins should be included in staff messaging
  - credential generation and user creation logic
  - any school settings access checks
- Ensure any backend logic that currently assumes `ADMIN` is the top school role is revised to use `SCHOOL_ADMIN`

5. Frontend work
- Add `SCHOOL_ADMIN` support to:
  - auth/user role typings
  - route guards / access checks
  - dashboard landing logic
  - menu visibility
  - access denied role maps
  - user forms and filters
  - sign-in redirect
  - any profile or user detail displays
- Decide which pages should move from `ADMIN` to `SCHOOL_ADMIN`
- Keep current UI behavior consistent, but update visibility and permissions correctly

6. User-management ownership
- Staff/user creation and editing should belong to `SCHOOL_ADMIN`
- If there are existing “create admin” or “create staff” flows:
  - review whether they should be:
    - `SUPER_ADMIN` only
    - `SCHOOL_ADMIN` only
    - both
- Make the ownership explicit in code

7. Migration expectations
- Do not break existing `SUPER_ADMIN`
- Do not leave stale role strings like `"school_admin"` or `"SCHOOL_ADMIN"` only in one layer
- Keep backend and frontend role names fully aligned
- If seeds or sample data need a school admin account, add one
- If existing seed users currently use `ADMIN` but should really be `SCHOOL_ADMIN`, update them deliberately

8. Validation
- Run targeted scans for:
  - `Role.ADMIN`
  - `SCHOOL_ADMIN`
  - `"ADMIN"`
  - `"SCHOOL_ADMIN"`
  - role-based redirects
  - role-based menu visibility
- Run:
  - backend Prisma validation
  - backend TypeScript check
  - frontend TypeScript check if possible
- If frontend typecheck fails due to unrelated existing repo issues, say so clearly and separate them from the `SCHOOL_ADMIN` change

9. Deliverable standard
- This is not a partial refactor.
- Make the role real and usable end-to-end.
- Do not stop after adding the enum.
- Update runtime ownership, permissions, routing, seed data, and UI visibility together.

Implementation guidance:
- Prefer a permission-driven design where possible, but still add the dedicated `SCHOOL_ADMIN` role.
- Be careful with existing `ADMIN` checks because many of them may really mean “top school authority”.
- Where ambiguous:
  - `SUPER_ADMIN` stays above all
  - `SCHOOL_ADMIN` should be used for school ownership
  - `ADMIN` should be narrowed

Files likely involved:
- backend/prisma/schema.prisma
- backend/prisma/seed.ts
- backend/src/auth/types/role.enum.ts
- backend/src/auth/constants/default-permissions.constant.ts
- backend/src/dashboard/**
- backend/src/search/**
- backend/src/credential/**
- backend/src/school-settings/**
- backend/src/auth/**
- frontend/src/context/AuthContext.tsx
- frontend/src/components/Menu.tsx
- frontend/src/components/AccessDenied.tsx
- frontend/src/components/Breadcrumb.tsx
- frontend/src/app/sign-in/page.tsx
- frontend/src/app/(dashboard)/page.tsx
- frontend/src/app/(dashboard)/**
- frontend/src/components/UserDetailPage.tsx

Output format:
- Summarize the new role model
- List what `SCHOOL_ADMIN` can do
- List what `ADMIN` can no longer do after the split
- List files changed
- Report verification results and any remaining unrelated repo issues
```

## Recommended filename for agent output

If the agent needs to create notes or a summary, prefer:
- `SCHOOL_ADMIN_IMPLEMENTATION_NOTES.md`

## Intent

This prompt is designed to force a full role implementation rather than a shallow enum-only change.
