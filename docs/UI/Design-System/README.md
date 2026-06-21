# Design System — YeneSchool

> Purpose: Design tokens, colors, typography, spacing, and visual guidelines.

---

## Colors

Defined in `frontend/src/app/globals.css` as CSS custom properties.

### Primary Palette
```
--primary: #2563eb       (Blue 600)
--primary-foreground: #ffffff
--primary-light: #3b82f6  (Blue 500)
--primary-dark: #1d4ed8   (Blue 700)
```

### Semantic Colors
```
--success: #16a34a        (Green 600)
--warning: #d97706        (Amber 600)
--danger:  #dc2626        (Red 600)
--info:    #0891b2        (Cyan 600)
```

### Neutrals
```
--background: #ffffff / #0a0a0a (light/dark)
--foreground: #0a0a0a / #ffffff
--muted: #f5f5f5 / #1a1a1a
--border: #e5e7eb / #2a2a2a
```

## Typography

- **Font**: Lexend Deca (variable weight)
- **Sizes**: Tailwind default scale (text-sm, text-base, text-lg, etc.)
- **Headings**: Tailwind font-weight classes (font-semibold, font-bold)

## Icons

- **Library**: Lucide React
- **Usage**: Import and use as components
  ```typescript
  import { User, Settings, LogOut } from 'lucide-react';
  ```

## Spacing

- Tailwind default spacing scale
- Components use consistent padding: `p-4` (cards), `p-6` (modals), `gap-4` (grids)

## Dark Mode

- Strategy: `class` on `<html>` element
- Managed by `ThemeProvider` + `themeStore` (Zustand)
- All components use Tailwind `dark:` variants

## Related Documents

- `frontend/src/app/globals.css` — Full variable definitions
- `frontend/src/lib/themeStore.ts` — Theme state management
- `frontend/src/components/ThemeProvider.tsx` — Theme provider
