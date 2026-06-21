# Siren / Bell Module

> Purpose: Automated bell/siren scheduling and hardware integration.

---

## Status: ⚠️ Partial — Hardware webhook contract may need definition

## Responsibilities
- Schedule bell/siren rings
- Configure ring times per period
- Hardware integration via webhook
- Manual siren control

## Features
- Siren schedules (daily, weekly patterns)
- Siren events log (when bells actually rang)
- Hardware configuration (webhook URL for physical siren systems)
- Period time integration (ring bells at period start/end)
- Manual siren trigger
- Siren listener on frontend (plays audio via browser)
- Multiple schedule types (regular, exam, break, emergency)

## Database Entities
- `SirenSchedule` — id, schoolId, name, type, dayOfWeek, time, duration, enabled
- `SirenEvent` — id, schoolId, scheduledTime, actualRingTime, status, triggeredBy
- `SirenHardwareConfig` — id, schoolId, webhookUrl, apiKey, enabled, lastTestedAt
- `PeriodTime` — id, schoolId, name, startTime, endTime, type (REGULAR/BREAK/LUNCH)

## Permissions
- `ADMIN`: Manage siren schedules and hardware config
- All roles: Siren audio playback

## Related Documents
- `backend/src/siren/`
- `frontend/src/lib/api/siren*.ts` (6 API modules)
- `frontend/src/components/siren/siren-listener.tsx`
- `frontend/src/app/(dashboard)/admin/siren-management/`
