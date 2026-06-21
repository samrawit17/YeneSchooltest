# Subscription Module

> Purpose: School subscription plans, feature gating, and billing tier management.

---

## Responsibilities
- Define subscription plans (CORE/STANDARD/ULTIMATE)
- Assign plans to schools
- Gate features based on subscription tier
- Track subscription status and expiry

## Features
- Plan tiers: CORE → STANDARD → ULTIMATE
- Feature array per plan (JSON list of enabled features)
- Subscription start/end date management
- Subscription status (ACTIVE/DRAFT/CANCELLED/EXPIRED)
- FeatureGuard component for frontend gating
- SubscriptionGuard for backend endpoint protection
- Plan management UI for superadmin
- School subscription assignment

## Database Entities
- `Plan` — id, name (CORE/STANDARD/ULTIMATE), features (JSON), price, durationDays
- `Subscription` — id, schoolId, planId, startDate, endDate, status, autoRenew

## Feature Gating Flow
```
Frontend: <FeatureGuard feature="advanced_reports">
            <AdvancedReportsComponent />
          </FeatureGuard>

Backend: @Subscription('advanced_reports')
         @Get('advanced-reports')
         getAdvancedReports() { ... }
```

## Permissions
- `SUPER_ADMIN`: Full subscription management
- `ADMIN`: View own school's subscription

## Related Documents
- `backend/src/subscription/`
- `frontend/src/components/FeatureGuard.tsx`
- `frontend/src/context/SubscriptionContext.tsx`
- `frontend/src/lib/api/subscription.ts`
