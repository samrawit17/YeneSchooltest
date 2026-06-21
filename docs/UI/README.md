# UI Documentation — YeneSchool

> Purpose: Design system, component library, page structure, and user flow documentation.

---

## Contents

| Section | Description |
|---------|-------------|
| [Design System](Design-System/README.md) | Colors, typography, spacing, branding |
| [Components](Components/README.md) | UI component library (Shadcn + custom) |
| [Pages](Pages/README.md) | Page structure and routing |
| [User Flows](User-Flows/README.md) | End-to-end user workflows |

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS 3.4
- **Component Library**: Shadcn UI (Radix UI primitives)
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Calendar**: react-big-calendar with Ethiopian calendar adapter

## Theme

- Dark/Light/System mode via Zustand `themeStore`
- Custom CSS variables in `globals.css`
- Tailwind dark mode via `class` strategy

## Layout Structure

```
RootLayout (fonts, providers)
└── (dashboard)/Layout (sidebar + navbar + breadcrumb + footer)
    ├── admin/     → School admin pages
    ├── teacher/   → Teacher pages
    ├── student/   → Student pages
    ├── parent/    → Parent pages
    ├── finance/   → Finance pages
    └── superadmin/ → Platform admin pages
```

## Related Documents

- `frontend/src/app/globals.css` — Global styles and theme variables
- `frontend/src/components/` — Component implementations
- `docs/CODING_STANDARDS.md` (Section 3) — Frontend conventions
