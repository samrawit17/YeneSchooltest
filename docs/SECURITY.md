# Security Guidelines — YeneSchool

> Purpose: Security policies, authentication flow, data protection, and audit requirements.

---

## 1. Authentication

### 1.1 Flow
```
Login → POST /auth/login → LocalStrategy.validate() → JWT in HTTP cookie
                                                     → Frontend stores minimal user in sessionStorage
                                                     → AuthContext verifies via GET /auth/users/me on mount
```

### 1.2 Token Management
- JWT stored in HTTP-only cookie (not accessible to JavaScript)
- JWT contains: `userId`, `role`, `schoolId`
- JWT expires: 7 days (configurable via `JWT_EXPIRATION`)
- Cookie is sent automatically with `withCredentials: true` in Axios

### 1.3 Session Storage
```typescript
// Minimal — only for page refresh resilience
sessionStorage.setItem('user', JSON.stringify({ id, role, schoolId }));
// Full profile fetched on mount via /auth/users/me
```

---

## 2. Authorization (RBAC)

### 2.1 Guard Chain
```
Request → JwtAuthGuard (validates token)
        → RolesGuard (checks role)
        → PermissionsGuard (checks specific permissions)
        → TenantGuard (validates schoolId)
```

### 2.2 Role Access Matrix

| Role | Data Scope | Read | Write | Admin |
|------|-----------|------|-------|-------|
| SUPER_ADMIN | All schools | All | All | All |
| ADMIN | Own school | All school data | All | Full |
| IT_MANAGER | Own school | Technical data | Limited | No |
| REGISTRAR | Own school | Students, classes | Enrollment | No |
| TEACHER | Own school | Assigned classes | Grading, lessons | No |
| STUDENT | Self | Own data | Never | No |
| PARENT | Linked children | Children's data | Never | No |
| FINANCE | Own school | Finance data | Finance ops | No |

---

## 3. Multi-Tenancy Isolation

- Every DB query includes `where: { schoolId }`
- `schoolId` extracted from JWT — never from request body/params
- Redis keys namespaced: `school:{schoolId}:resource:{id}`
- SUPER_ADMIN is the only role that can bypass school scoping

---

## 4. Data Protection

| Category | Requirement |
|----------|-------------|
| Passwords | bcrypt hashing (never stored in plaintext) |
| PII | No console.log of student/teacher PII in production |
| File uploads | Scanned, limited to 10MB, stored in Cloudflare R2 |
| API responses | Whitelisted fields via class-transformer |
| Input validation | class-validator with whitelist: true, forbidNonWhitelisted: true |

---

## 5. Axios Response Interceptors

| Status | Action |
|--------|--------|
| 401 | Redirect to `/sign-in` |
| 403 | Redirect to `/access-denied` (details in sessionStorage) |
| 503 (MAINTENANCE_MODE) | Dispatch `sms:maintenance-mode` custom event |
| Other errors | Generic error toast |

---

## 6. Rate Limiting (Nginx)

| Zone | Limit | Target |
|------|-------|--------|
| auth_login | 5 req/min | Prevent brute force |
| auth_reset | 3 req/min | Prevent spam |
| auth_register | 5 req/10min | Prevent bot registrations |
| api_global | 120 req/min | General API protection |

---

## 7. Pre-PR Security Checklist

- [ ] All new DB queries include `schoolId` in `where` clause
- [ ] All new Redis keys follow `school:{schoolId}:` prefix
- [ ] No raw SQL strings (Prisma query builder only)
- [ ] No `console.log` with PII in production code
- [ ] All new endpoints protected by `JwtAuthGuard` + guards
- [ ] DTOs validated with `class-validator`
- [ ] Ethiopian date calculations use library, not raw Date math
- [ ] CORS origin validated against whitelist
- [ ] File uploads have type/size validation
- [ ] New environment variables documented in `.env.example`

---

## 8. Audit Logging

- `AuditLog` model tracks all sensitive operations
- Audit entries include: `userId`, `schoolId`, `action`, `entityType`, `entityId`, `changes`, `timestamp`
- Finance operations have additional `FinanceAuditLog` entries

---

## 9. Related Documents

- `ARCHITECTURE.md` — Auth and RBAC details
- `docs/BUSINESS_RULES.md` — Permission rules
- `docs/DEPLOYMENT.md` — Infrastructure security
- `backend/src/auth/` — Auth module implementation
- `backend/src/rbac/` — Permission system implementation

---

> **Last updated**: June 2026
