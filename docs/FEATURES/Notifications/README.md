# Notifications Module

> Purpose: Push notification system for real-time alerts and updates.

---

## Responsibilities
- Web Push notification registration and sending
- Notification preference management per user
- Notification history and display
- Real-time alerts for events (grades published, fees due, etc.)

## Features
- Web Push API integration (`web-push` npm package)
- Push subscription management (subscribe/unsubscribe)
- Notification preferences (what to be notified about)
- Notification history with read/unread status
- Notification display in navbar + dedicated page

## Database Entities
- `Notification` — id, schoolId, userId, title, body, type, read, link, createdAt
- `NotificationPreference` — id, schoolId, userId, type (PUSH/EMAIL/SMS), enabled
- `PushSubscription` — id, schoolId, userId, endpoint, keys (p256dh, auth)

## Permissions
- All authenticated users: Manage own notifications
- `ADMIN`: Send school-wide notifications

## Workflows
```
User subscribes → PushSubscription saved
  → Backend sends notification → Web Push API delivers
    → User sees toast + notification in notification center

Notification events:
  - Grade published → Notify student + parents
  - Fee due → Notify parents
  - Attendance report → Notify parents
  - Exam schedule → Notify students
```

## Related Documents
- `docs/FEATURES/SMS/README.md` — SMS notifications
- `docs/FEATURES/Email/README.md` — Email notifications
- `backend/src/notification/` — Implementation
- `frontend/src/lib/push-notifications.ts` — Push registration
- `frontend/src/lib/api/notifications.ts` — API client
