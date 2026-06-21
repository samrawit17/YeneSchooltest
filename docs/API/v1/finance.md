# Finance API v1

> Fee structures, payments, payroll, and receipt endpoints.

---

## GET /finance/fee-structures

List fee structures for school.

---

## POST /finance/fee-structures

Create fee structure.

**Request:**
```json
{
  "name": "Annual Tuition 2024",
  "billingMethod": "MONTHLY",
  "totalAmount": 15000,
  "installments": 10,
  "academicYearId": "cuid..."
}
```

---

## GET /finance/student-fees

List student fees. Query: `?studentId=xxx&academicYearId=xxx`

---

## POST /finance/payments

Record a payment.

**Request:**
```json
{
  "studentFeeId": "cuid...",
  "amount": 1500,
  "method": "CASH",
  "reference": "REC-001",
  "notes": "March installment"
}
```

**Response:** `{ "payment": {...}, "receipt": { "id": "...", "receiptNumber": "R-2024-001" } }`

---

## GET /finance/receipts/:id

Download receipt PDF.

---

## GET /finance/payroll/runs

List payroll runs.

---

## POST /finance/payroll/runs

Create payroll run (DRAFT).

---

## PATCH /finance/payroll/runs/:id/approve

Approve payroll run.

---

## PATCH /finance/payroll/runs/:id/pay

Mark payroll as paid.
