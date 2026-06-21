# Finance Module

> Purpose: Complete financial management for schools including fee structures, payments, receipts, payroll, and discounts.

---

## Responsibilities
- Fee structure creation and management
- Student fee assignment and tracking
- Payment processing and receipt generation
- Payroll management for staff
- Discount policies
- Financial audit logging

## Features
- Fee structures with multiple billing methods
- Student fee installments with Ethiopian calendar due dates
- Payment recording with receipt generation (PDF)
- Payroll: DRAFT → APPROVED → PAID workflow
- Discount policies (PERCENTAGE or FIXED_AMOUNT)
- Finance audit log for all transactions
- Finance-specific dashboard and reports

## Business Rules
- Currency: ETB (Ethiopian Birr) only
- School months = 10 (not 12). MONTHLY billing = 10 installments
- Due dates calculated using Ethiopian calendar
- Billing methods: FULL_PAYMENT, PER_TERM, MONTHLY, INSTALLMENT
- One `Fee` record per installment with amount + Ethiopian dueDate
- Payroll tax tracked per entry
- FinanceAuditLog records all financial transactions

## Database Entities
- `FeeStructure` — id, schoolId, name, billingMethod, amounts
- `StudentFee` — id, schoolId, studentId, feeStructureId, academicYearId, installments
- `Payment` — id, schoolId, studentFeeId, amount, date, method, reference
- `Receipt` — id, schoolId, paymentId, receiptNumber, pdfUrl
- `DiscountPolicy` — id, schoolId, type (PERCENTAGE/FIXED), value
- `FinanceProfile` — id, schoolId, name, role (employee)
- `FinanceAuditLog` — id, schoolId, action, entityType, entityId, changes
- `PayrollSalary` — id, schoolId, financeProfileId, amount, effectiveDate
- `PayrollRun` — id, schoolId, status (DRAFT/APPROVED/PAID), period
- `PayrollEntry` — id, schoolId, payrollRunId, financeProfileId, amount, tax

## Permissions
- `FINANCE`: Full finance operations
- `ADMIN`: View finance, approve payroll
- `SUPER_ADMIN`: Cross-school finance view

## Workflows
```
Create FeeStructure → Assign to Students → StudentFee installments generated
  → Student makes payment → Payment recorded → Receipt generated (PDF)

Payroll: Create PayrollRun (DRAFT) → Calculate entries → Approve → Mark PAID
  → Tax tracked per entry
```

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /finance/fee-structures | List fee structures |
| POST | /finance/fee-structures | Create fee structure |
| GET | /finance/student-fees | List student fees |
| POST | /finance/payments | Record payment |
| GET | /finance/receipts/:id | Get receipt PDF |
| GET | /finance/payroll/runs | List payroll runs |
| POST | /finance/payroll/runs | Create payroll run |
| PATCH | /finance/payroll/runs/:id/approve | Approve payroll |
| PATCH | /finance/payroll/runs/:id/pay | Mark as paid |

## Related Documents
- `docs/BUSINESS_RULES.md` (Section 2) — Finance rules
- `docs/FEATURES/Payments/README.md` — Payment specifics
- `backend/src/finance/` — Implementation
- `frontend/src/lib/api/finance.ts` — API client
