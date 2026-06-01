CREATE TABLE IF NOT EXISTS "PayrollSalary" (
  "id" TEXT PRIMARY KEY,
  "schoolId" TEXT NOT NULL,
  "staffUserId" TEXT NOT NULL,
  "baseSalary" DOUBLE PRECISION NOT NULL,
  "allowances" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "bankName" TEXT,
  "bankAccount" TEXT,
  "tinNumber" TEXT,
  "payFrequency" TEXT NOT NULL DEFAULT 'MONTHLY',
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PayrollSalary_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PayrollSalary_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "PayrollSalary_school_staff_key" ON "PayrollSalary"("schoolId", "staffUserId");
CREATE INDEX IF NOT EXISTS "PayrollSalary_school_active_idx" ON "PayrollSalary"("schoolId", "isActive");
CREATE INDEX IF NOT EXISTS "PayrollSalary_staff_idx" ON "PayrollSalary"("staffUserId");

CREATE TABLE IF NOT EXISTS "PayrollRun" (
  "id" TEXT PRIMARY KEY,
  "schoolId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "periodMonth" INTEGER NOT NULL,
  "periodYear" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "grossAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "deductionsAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "netAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "entryCount" INTEGER NOT NULL DEFAULT 0,
  "createdById" TEXT,
  "approvedById" TEXT,
  "paidById" TEXT,
  "paymentDate" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PayrollRun_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PayrollRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "PayrollRun_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "PayrollRun_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "PayrollRun_period_month_check" CHECK ("periodMonth" BETWEEN 1 AND 12),
  CONSTRAINT "PayrollRun_status_check" CHECK ("status" IN ('DRAFT', 'APPROVED', 'PAID', 'CANCELLED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "PayrollRun_school_period_key" ON "PayrollRun"("schoolId", "periodYear", "periodMonth");
CREATE INDEX IF NOT EXISTS "PayrollRun_school_status_idx" ON "PayrollRun"("schoolId", "status");
CREATE INDEX IF NOT EXISTS "PayrollRun_created_by_idx" ON "PayrollRun"("createdById");
CREATE INDEX IF NOT EXISTS "PayrollRun_approved_by_idx" ON "PayrollRun"("approvedById");
CREATE INDEX IF NOT EXISTS "PayrollRun_paid_by_idx" ON "PayrollRun"("paidById");

CREATE TABLE IF NOT EXISTS "PayrollEntry" (
  "id" TEXT PRIMARY KEY,
  "runId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "staffUserId" TEXT NOT NULL,
  "salaryId" TEXT,
  "baseSalary" DOUBLE PRECISION NOT NULL,
  "allowances" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "bonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "grossPay" DOUBLE PRECISION NOT NULL,
  "netPay" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "paymentMethod" TEXT,
  "transactionReference" TEXT,
  "paidAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PayrollEntry_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PayrollEntry_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PayrollEntry_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PayrollEntry_salaryId_fkey" FOREIGN KEY ("salaryId") REFERENCES "PayrollSalary"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "PayrollEntry_status_check" CHECK ("status" IN ('PENDING', 'APPROVED', 'PAID', 'HELD'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "PayrollEntry_run_staff_key" ON "PayrollEntry"("runId", "staffUserId");
CREATE INDEX IF NOT EXISTS "PayrollEntry_school_status_idx" ON "PayrollEntry"("schoolId", "status");
CREATE INDEX IF NOT EXISTS "PayrollEntry_staff_idx" ON "PayrollEntry"("staffUserId");
CREATE INDEX IF NOT EXISTS "PayrollEntry_salary_idx" ON "PayrollEntry"("salaryId");

INSERT INTO "Permission" (id, name, module, action, description)
VALUES
  ('perm-finance-payroll-read', 'finance:payroll:read', 'finance', 'payroll:read', 'View payroll salaries and runs'),
  ('perm-finance-payroll-manage', 'finance:payroll:manage', 'finance', 'payroll:manage', 'Create payroll salaries and runs'),
  ('perm-finance-payroll-approve', 'finance:payroll:approve', 'finance', 'payroll:approve', 'Approve payroll runs'),
  ('perm-finance-payroll-pay', 'finance:payroll:pay', 'finance', 'payroll:pay', 'Mark payroll entries as paid')
ON CONFLICT (name) DO UPDATE
SET module = EXCLUDED.module,
    action = EXCLUDED.action,
    description = EXCLUDED.description;

INSERT INTO "RolePermission" (id, role, "permissionId")
SELECT 'role-finance-payroll-read', 'FINANCE', id FROM "Permission" WHERE name = 'finance:payroll:read'
ON CONFLICT (role, "permissionId") DO NOTHING;

INSERT INTO "RolePermission" (id, role, "permissionId")
SELECT 'role-finance-payroll-manage', 'FINANCE', id FROM "Permission" WHERE name = 'finance:payroll:manage'
ON CONFLICT (role, "permissionId") DO NOTHING;

INSERT INTO "RolePermission" (id, role, "permissionId")
SELECT 'role-finance-payroll-approve', 'FINANCE', id FROM "Permission" WHERE name = 'finance:payroll:approve'
ON CONFLICT (role, "permissionId") DO NOTHING;

INSERT INTO "RolePermission" (id, role, "permissionId")
SELECT 'role-finance-payroll-pay', 'FINANCE', id FROM "Permission" WHERE name = 'finance:payroll:pay'
ON CONFLICT (role, "permissionId") DO NOTHING;
