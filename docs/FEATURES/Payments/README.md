# Payments Module

> Purpose: Payment processing, receipt generation, and financial transaction management.

---

## Responsibilities
- Payment recording against student fees
- Receipt generation (PDF)
- Payment method tracking
- Payment history and reconciliation

## Features
- Payment recording (cash, bank transfer, mobile money)
- PDF receipt generation (PDFKit)
- Payment history per student
- Payment reconciliation reports
- Partial payment support

## Business Rules
- Currency: ETB (Ethiopian Birr)
- Receipts are sequentially numbered per school
- Payments can be partial (against an installment)
- Full payment required for certain billing methods

## Database Entities
- `Payment` — id, schoolId, studentFeeId, amount, date, method, reference, notes
- `Receipt` — id, schoolId, paymentId, receiptNumber, pdfUrl, generatedAt

## Related Documents
- `docs/FEATURES/Finance/README.md` — Main finance module
- `docs/BUSINESS_RULES.md` (Section 2) — Billing rules
- `backend/src/finance/` — Implementation
