# Platform Settings Module

> Purpose: Global platform-level configuration and maintenance mode.

---

## Responsibilities
- Manage global platform settings (key/value)
- Maintenance mode toggle
- System-wide configuration
- Settings validation

## Features
- Key-value settings store
- Maintenance mode flag (returns 503 with maintenance event)
- Settings grouped by category
- Settings history and audit
- Type-specific value storage (string, number, boolean, JSON)

## Database Entities
- `PlatformSetting` — id, key, value, type, description, updatedAt

## Key Settings
| Key | Type | Description |
|-----|------|-------------|
| MAINTENANCE_MODE | boolean | Enable maintenance mode |
| MAX_FILE_SIZE | number | Max file upload size (bytes) |
| DEFAULT_LANGUAGE | string | Default system language |
| VAPID_KEYS | json | Web Push VAPID keys |

## Permissions
- `SUPER_ADMIN`: Full platform settings management

## Related Documents
- `backend/src/platform-settings/`
- `frontend/src/lib/api/platform.ts`
