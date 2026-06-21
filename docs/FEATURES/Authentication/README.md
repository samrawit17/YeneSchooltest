# Authentication Module

> Purpose: User authentication, registration, password management, and session handling.

---

## Responsibilities
- User login/logout with JWT-based authentication
- User registration (admin-created + self-service)
- Password hashing (bcrypt) and reset flow
- Session management via HTTP-only cookies
- Role-based route protection

## Features
- JWT auth with Passport.js strategies (Local, JWT)
- Cookie-based token storage
- `POST /auth/login` with rate limiting (5 req/min)
- `POST /auth/register` limited to 5 req/10min
- `POST /auth/forgot-password` limited to 3 req/min
- `GET /auth/users/me` — current user profile
- User CRUD for admin roles
- Axios interceptor handles 401 → redirect to sign-in

## Business Rules
- Passwords hashed with bcrypt (never stored in plaintext)
- JWT expires after 7 days (configurable)
- JWT contains: `userId`, `role`, `schoolId`
- Session storage holds minimal user info (id, role, schoolId) for page refresh resilience
- Full profile fetched via `GET /auth/users/me` on each mount

## Database Entities
- `User` — id, email, password, role, schoolId, name, active
- `PasswordResetToken` — id, userId, token, expiresAt

## Permissions
- `SUPER_ADMIN`: Full user management across all schools
- `ADMIN`: User management within own school
- Other roles: Read own profile only

## Workflows
```
Login → POST /auth/login → JWT cookie → Frontend stores minimal user
  → AuthContext on mount → GET /auth/users/me → Full profile

Forgot Password → POST /auth/forgot-password → Email with reset link
  → GET /auth/reset-password/:token → New password form
  → POST /auth/reset-password → Password updated
```

## API Endpoints
| Method | Path | Auth | Rate Limit |
|--------|------|------|------------|
| POST | /auth/login | No | 5/min |
| POST | /auth/register | No | 5/10min |
| POST | /auth/forgot-password | No | 3/min |
| POST | /auth/reset-password | No | — |
| GET | /auth/users/me | Yes | — |
| GET | /auth/users | Admin | — |
| POST | /auth/users | Admin | — |
| PATCH | /auth/users/:id | Admin | — |
| DELETE | /auth/users/:id | Admin | — |

## Related Documents
- `docs/SECURITY.md` — Auth security details
- `ARCHITECTURE.md` (Section 5) — Auth flow diagram
- `backend/src/auth/` — Implementation
- `frontend/src/context/AuthContext.tsx` — Frontend auth state
- `frontend/src/lib/api/auth.ts` — API client
