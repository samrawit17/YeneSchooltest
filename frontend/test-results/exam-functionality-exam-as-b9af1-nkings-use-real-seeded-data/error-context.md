# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: exam-functionality.spec.ts >> exam assessment, entry, review, publish, parent results, and rankings use real seeded data
- Location: exam-functionality.spec.ts:180:5

# Error details

```
Error: /academic-years failed: {"message":"Unauthorized","statusCode":401}

expect(received).toBeTruthy()

Received: false
```

# Test source

```ts
  1   | import { test, expect, Page, APIRequestContext } from '@playwright/test';
  2   | import crypto from 'crypto';
  3   | 
  4   | const baseURL = process.env.SMS_BASE_URL || 'http://localhost:3000';
  5   | const apiURL = process.env.SMS_API_URL || 'http://localhost:5000';
  6   | const password = process.env.SMS_TEST_PASSWORD || 'admin123';
  7   | const jwtSecret = process.env.SMS_JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
  8   | const targetClassId = 'cmojz1x0c005i136xa4jk2rzj';
  9   | const targetSectionId = 'cmojz1x0g005k136xdw0gm9zc';
  10  | 
  11  | type LoginResult = { access_token: string; user: any };
  12  | 
  13  | async function login(request: APIRequestContext, loginIdentifier: string): Promise<LoginResult> {
  14  |   const response = await request.post(`${apiURL}/auth/login`, {
  15  |     data: { loginIdentifier, password },
  16  |   });
  17  |   expect(response.ok(), `${loginIdentifier} login failed: ${await response.text()}`).toBeTruthy();
  18  |   return response.json();
  19  | }
  20  | 
  21  | function base64url(input: string | Buffer) {
  22  |   return Buffer.from(input).toString('base64url');
  23  | }
  24  | 
  25  | function makeToken(user: any) {
  26  |   const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  27  |   const payload = base64url(JSON.stringify({ email: user.email, sub: user.id, role: user.role }));
  28  |   const signature = crypto
  29  |     .createHmac('sha256', jwtSecret)
  30  |     .update(`${header}.${payload}`)
  31  |     .digest('base64url');
  32  |   return `${header}.${payload}.${signature}`;
  33  | }
  34  | 
  35  | function authForUser(user: any): LoginResult {
  36  |   return {
  37  |     access_token: makeToken(user),
  38  |     user: {
  39  |       id: user.id,
  40  |       email: user.email,
  41  |       username: user.username,
  42  |       name: user.name,
  43  |       role: user.role,
  44  |       schoolId: user.schoolId,
  45  |       calendarType: user.calendarType || 'ETHIOPIAN',
  46  |       theme: user.theme || 'SYSTEM',
  47  |       phone: user.phone || null,
  48  |       avatarUrl: user.avatarUrl || null,
  49  |       mustChangePassword: false,
  50  |       permissions: user.permissions || [],
  51  |     },
  52  |   };
  53  | }
  54  | 
  55  | async function installAuth(page: Page, auth: LoginResult) {
  56  |   await page.goto(baseURL);
  57  |   await page.evaluate(
  58  |     ({ token, user }) => {
  59  |       localStorage.setItem('token', token);
  60  |       localStorage.setItem('user', JSON.stringify(user));
  61  |     },
  62  |     { token: auth.access_token, user: auth.user },
  63  |   );
  64  | }
  65  | 
  66  | async function apiGet(request: APIRequestContext, token: string, path: string) {
  67  |   const response = await request.get(`${apiURL}${path}`, {
  68  |     headers: { Authorization: `Bearer ${token}` },
  69  |   });
> 70  |   expect(response.ok(), `${path} failed: ${await response.text()}`).toBeTruthy();
      |                                                                     ^ Error: /academic-years failed: {"message":"Unauthorized","statusCode":401}
  71  |   return response.json();
  72  | }
  73  | 
  74  | async function apiPost(request: APIRequestContext, token: string, path: string, data?: any) {
  75  |   const response = await request.post(`${apiURL}${path}`, {
  76  |     headers: { Authorization: `Bearer ${token}` },
  77  |     data,
  78  |   });
  79  |   expect(response.ok(), `${path} failed: ${await response.text()}`).toBeTruthy();
  80  |   return response.json();
  81  | }
  82  | 
  83  | function uniqueClassSections(items: any[]) {
  84  |   const pairs = new Map<string, { classId: string; sectionId: string }>();
  85  | 
  86  |   for (const item of items) {
  87  |     const classId = item.classId ?? item.class?.id ?? item.assessmentSubject?.classId;
  88  |     const sectionId = item.sectionId ?? item.section?.id ?? item.assessmentSubject?.sectionId;
  89  |     if (!classId || !sectionId) continue;
  90  |     pairs.set(`${classId}:${sectionId}`, { classId, sectionId });
  91  |   }
  92  | 
  93  |   return Array.from(pairs.values());
  94  | }
  95  | 
  96  | function classSectionsByClass(items: any[]) {
  97  |   const grouped = new Map<string, Set<string>>();
  98  | 
  99  |   for (const pair of uniqueClassSections(items)) {
  100 |     if (!grouped.has(pair.classId)) grouped.set(pair.classId, new Set());
  101 |     grouped.get(pair.classId)?.add(pair.sectionId);
  102 |   }
  103 | 
  104 |   return Array.from(grouped.entries()).map(([classId, sectionIds]) => ({
  105 |     classId,
  106 |     sectionIds: Array.from(sectionIds),
  107 |   }));
  108 | }
  109 | 
  110 | async function ensureTeacherAssessments(
  111 |   request: APIRequestContext,
  112 |   adminToken: string,
  113 |   teacherAuth: LoginResult,
  114 |   academicYearId: string,
  115 |   termId: string,
  116 | ) {
  117 |   let teacherAssessments = await apiGet(
  118 |     request,
  119 |     teacherAuth.access_token,
  120 |     `/assessments/teacher/me?academicYearId=${academicYearId}&termId=${termId}`,
  121 |   );
  122 |   const assignments = await apiGet(
  123 |     request,
  124 |     adminToken,
  125 |     `/class-subjects/by-teacher/${teacherAuth.user.id}`,
  126 |   );
  127 |   expect(assignments.length, 'real class-subject assignments for teacher').toBeGreaterThan(0);
  128 | 
  129 |   const title = `Playwright Full Subject Exam ${new Date().toISOString()}`;
  130 |   const created = await apiPost(request, adminToken, '/assessments', {
  131 |     title,
  132 |     type: 'MID_TERM',
  133 |     academicYearId,
  134 |     termId,
  135 |     startDate: new Date().toISOString(),
  136 |     endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  137 |     addToCalendar: false,
  138 |     subjects: assignments.map((assignment: any) => ({
  139 |       subjectId: assignment.subjectId,
  140 |       classId: assignment.classId,
  141 |       sectionId: assignment.sectionId,
  142 |       teacherId: teacherAuth.user.id,
  143 |       maxScore: 100,
  144 |       passMark: 50,
  145 |     })),
  146 |   });
  147 | 
  148 |   teacherAssessments = await apiGet(
  149 |     request,
  150 |     teacherAuth.access_token,
  151 |     `/assessments/teacher/me?academicYearId=${academicYearId}&termId=${termId}`,
  152 |   );
  153 |   return teacherAssessments.filter((item: any) => item.assessment?.title === title || item.title === title || created.id === item.assessmentId);
  154 | }
  155 | 
  156 | async function assertUsablePage(page: Page, path: string, expected: RegExp) {
  157 |   const errors: string[] = [];
  158 |   page.on('pageerror', (error) => errors.push(error.message));
  159 |   page.on('console', (message) => {
  160 |     if (message.type() === 'error') errors.push(message.text());
  161 |   });
  162 |   page.on('response', (response) => {
  163 |     if (response.status() >= 400) {
  164 |       errors.push(`${response.status()} ${response.url()}`);
  165 |     }
  166 |   });
  167 | 
  168 |   await page.goto(`${baseURL}${path}`, { waitUntil: 'domcontentloaded' });
  169 |   await expect(page.locator('body')).toContainText(expected, { timeout: 20000 });
  170 |   await expect(page.locator('body')).not.toContainText(/access denied|404|Unhandled Runtime Error/i);
```