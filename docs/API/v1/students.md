# Students API v1

> Student profile and enrollment endpoints.

---

## GET /students

List students. Scoped to `schoolId` from JWT.

**Query Params:** `?classId=xxx&page=1&limit=20&search=name`

**Response:**
```json
{
  "data": [
    {
      "id": "cuid...",
      "firstName": "Abebe",
      "lastName": "Kebede",
      "studentCode": "SCH-2024-001",
      "gender": "MALE",
      "dateOfBirth": "2008-05-12",
      "class": { "id": "...", "name": "Grade 10A" }
    }
  ],
  "total": 150,
  "page": 1
}
```

---

## POST /students

Create student.

**Request:**
```json
{
  "firstName": "Abebe",
  "lastName": "Kebede",
  "gender": "MALE",
  "dateOfBirth": "2008-05-12", // Ethiopian date
  "classId": "cuid...",
  "parentId": "cuid...", // optional
  "address": "Addis Ababa",
  "phone": "+251911123456"
}
```

---

## GET /students/:id

Get student details with enrollments, class, parents.

---

## PATCH /students/:id

Update student profile.

---

## POST /students/bulk

Bulk import students via CSV/Excel file. Multipart form-data.
