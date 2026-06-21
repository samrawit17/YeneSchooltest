# SMS Module

> Purpose: SMS notification integration for school communications.

---

## Status: ⚠️ Planned (not yet implemented)

## Proposed Responsibilities
- Send SMS notifications to parents and staff
- SMS template management
- Delivery status tracking
- Integration with Ethiopian SMS providers

## Proposed Features
- SMS sending for: attendance alerts, fee reminders, exam schedules, emergency notifications
- SMS templates with variable substitution
- Delivery reports
- Integration with local SMS gateways

## Proposed Integration
```
Backend SMS Service → SMS Provider API (e.g., Ethio Telecom, Safaricom)
  → Delivery status callback → Updated in database
```

## Related Documents
- `docs/FEATURES/Notifications/README.md` — Multi-channel notifications
- `docs/FEATURES/Email/README.md` — Email notifications
