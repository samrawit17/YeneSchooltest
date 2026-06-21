# Auth API v1

> Authentication and user management endpoints.

---

## POST /auth/login

Authenticate user and return JWT cookie.

**Request:**
```json
{
  "email": "admin@school.com",
  "password": "securepassword"
}
```

**Response:** `200 OK`
- Sets HTTP-only cookie `token=<jwt>`
- Body: `{ "user": { "id", "email", "role", "schoolId", "name" } }`

**Rate Limit:** 5 requests per minute

---

## POST /auth/register

Register a new user (admin only for creating users, self-registration for students).

**Request:**
```json
{
  "email": "newuser@school.com",
  "password": "securepassword",
  "name": "New User",
  "role": "TEACHER"
}
```

**Rate Limit:** 5 requests per 10 minutes

---

## POST /auth/forgot-password

Request password reset email.

**Request:** `{ "email": "user@school.com" }`

**Rate Limit:** 3 requests per minute

---

## POST /auth/reset-password

Reset password with token.

**Request:** `{ "token": "reset-token", "password": "newpassword" }`

---

## GET /auth/users/me

Get current authenticated user's profile.

**Headers:** Cookie: `token=<jwt>`

**Response:** `{ "id", "email", "role", "schoolId", "name", "profile" }`

---

## GET /auth/users

List users (admin only). Query params: `?role=TEACHER&page=1&limit=20`

---

## POST /auth/users

Create user (admin only).

**Request:**
```json
{
  "email": "teacher@school.com",
  "password": "temp123",
  "name": "Teacher Name",
  "role": "TEACHER"
}
```

---

## PATCH /auth/users/:id

Update user (admin only).

---

## DELETE /auth/users/:id

Deactivate user (admin only, soft delete).
