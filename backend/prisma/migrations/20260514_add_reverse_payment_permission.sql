INSERT INTO "Permission" (id, name, module, action, description)
VALUES (
  'perm-finance-payments-reverse',
  'finance:payments:reverse',
  'finance',
  'payments:reverse',
  'Reverse recorded payments'
)
ON CONFLICT (name) DO UPDATE
SET module = EXCLUDED.module,
    action = EXCLUDED.action,
    description = EXCLUDED.description;

INSERT INTO "RolePermission" (id, role, "permissionId")
SELECT
  'role-finance-payments-reverse',
  'FINANCE',
  id
FROM "Permission"
WHERE name = 'finance:payments:reverse'
ON CONFLICT (role, "permissionId") DO NOTHING;
