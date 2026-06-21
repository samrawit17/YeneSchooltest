# Grading API v1

> Grading components, scores, and approval endpoints.

---

## GET /grading/components

List grading components. Query: `?classSubjectId=xxx`

---

## POST /grading/components

Create grading component.

**Request:**
```json
{
  "classSubjectId": "cuid...",
  "name": "Continuous Assessment",
  "weight": 40,
  "maxScore": 100
}
```

---

## GET /grading/scores

Get scores. Query: `?componentId=xxx&studentId=xxx`

---

## POST /grading/scores

Enter score.

**Request:**
```json
{
  "gradingComponentId": "cuid...",
  "studentId": "cuid...",
  "score": 85
}
```

---

## POST /grading/submit

Submit grades for approval.

**Request:**
```json
{
  "classSubjectId": "cuid...",
  "termId": "cuid..."
}
```

---

## POST /grading/approve

Approve submitted grades (admin only).

**Request:**
```json
{
  "classSubjectId": "cuid...",
  "termId": "cuid..."
}
```
