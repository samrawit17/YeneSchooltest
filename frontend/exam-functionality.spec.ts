import { test, expect, Page, APIRequestContext } from '@playwright/test';
import crypto from 'crypto';

const baseURL = process.env.SMS_BASE_URL || 'http://localhost:3000';
const apiURL = process.env.SMS_API_URL || 'http://localhost:5000';
const password = process.env.SMS_TEST_PASSWORD || 'admin123';
const jwtSecret = process.env.SMS_JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const targetClassId = 'cmojz1x0c005i136xa4jk2rzj';
const targetSectionId = 'cmojz1x0g005k136xdw0gm9zc';

type LoginResult = { access_token: string; user: any };

async function login(request: APIRequestContext, loginIdentifier: string): Promise<LoginResult> {
  const response = await request.post(`${apiURL}/auth/login`, {
    data: { loginIdentifier, password },
  });
  expect(response.ok(), `${loginIdentifier} login failed: ${await response.text()}`).toBeTruthy();
  return response.json();
}

function base64url(input: string | Buffer) {
  return Buffer.from(input).toString('base64url');
}

function makeToken(user: any) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({ email: user.email, sub: user.id, role: user.role }));
  const signature = crypto
    .createHmac('sha256', jwtSecret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

function authForUser(user: any): LoginResult {
  return {
    access_token: makeToken(user),
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      schoolId: user.schoolId,
      calendarType: user.calendarType || 'ETHIOPIAN',
      theme: user.theme || 'SYSTEM',
      phone: user.phone || null,
      avatarUrl: user.avatarUrl || null,
      mustChangePassword: false,
      permissions: user.permissions || [],
    },
  };
}

async function installAuth(page: Page, auth: LoginResult) {
  await page.goto(baseURL);
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    },
    { token: auth.access_token, user: auth.user },
  );
}

async function apiGet(request: APIRequestContext, token: string, path: string) {
  const response = await request.get(`${apiURL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok(), `${path} failed: ${await response.text()}`).toBeTruthy();
  return response.json();
}

async function apiPost(request: APIRequestContext, token: string, path: string, data?: any) {
  const response = await request.post(`${apiURL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
  expect(response.ok(), `${path} failed: ${await response.text()}`).toBeTruthy();
  return response.json();
}

function uniqueClassSections(items: any[]) {
  const pairs = new Map<string, { classId: string; sectionId: string }>();

  for (const item of items) {
    const classId = item.classId ?? item.class?.id ?? item.assessmentSubject?.classId;
    const sectionId = item.sectionId ?? item.section?.id ?? item.assessmentSubject?.sectionId;
    if (!classId || !sectionId) continue;
    pairs.set(`${classId}:${sectionId}`, { classId, sectionId });
  }

  return Array.from(pairs.values());
}

function classSectionsByClass(items: any[]) {
  const grouped = new Map<string, Set<string>>();

  for (const pair of uniqueClassSections(items)) {
    if (!grouped.has(pair.classId)) grouped.set(pair.classId, new Set());
    grouped.get(pair.classId)?.add(pair.sectionId);
  }

  return Array.from(grouped.entries()).map(([classId, sectionIds]) => ({
    classId,
    sectionIds: Array.from(sectionIds),
  }));
}

async function ensureTeacherAssessments(
  request: APIRequestContext,
  adminToken: string,
  teacherAuth: LoginResult,
  academicYearId: string,
  termId: string,
) {
  let teacherAssessments = await apiGet(
    request,
    teacherAuth.access_token,
    `/assessments/teacher/me?academicYearId=${academicYearId}&termId=${termId}`,
  );
  const assignments = await apiGet(
    request,
    adminToken,
    `/class-subjects/by-teacher/${teacherAuth.user.id}`,
  );
  expect(assignments.length, 'real class-subject assignments for teacher').toBeGreaterThan(0);

  const title = `Playwright Full Subject Exam ${new Date().toISOString()}`;
  const created = await apiPost(request, adminToken, '/assessments', {
    title,
    type: 'MID_TERM',
    academicYearId,
    termId,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    addToCalendar: false,
    subjects: assignments.map((assignment: any) => ({
      subjectId: assignment.subjectId,
      classId: assignment.classId,
      sectionId: assignment.sectionId,
      teacherId: teacherAuth.user.id,
      maxScore: 100,
      passMark: 50,
    })),
  });

  teacherAssessments = await apiGet(
    request,
    teacherAuth.access_token,
    `/assessments/teacher/me?academicYearId=${academicYearId}&termId=${termId}`,
  );
  return teacherAssessments.filter((item: any) => item.assessment?.title === title || item.title === title || created.id === item.assessmentId);
}

async function assertUsablePage(page: Page, path: string, expected: RegExp) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto(`${baseURL}${path}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(expected, { timeout: 20000 });
  await expect(page.locator('body')).not.toContainText(/access denied|404|Unhandled Runtime Error/i);
  const relevantErrors = errors.filter(
    (error) =>
      !/favicon|_next\/static|_next\/image|Failed to fetch RSC payload|Failed to load resource/i.test(
        error,
      ),
  );
  expect(relevantErrors, `${path} browser errors`).toEqual([]);
}

test('exam assessment, entry, review, publish, parent results, and rankings use real seeded data', async ({
  page,
  request,
}) => {
  test.setTimeout(90000);
  const admin = authForUser({
    id: 'cmnsz7mgv006410jprakk268d',
    email: 'admin@springfieldhigh.edu',
    username: 'admin001',
    name: 'School Admin',
    role: 'ADMIN',
    schoolId: 'school-001',
  });
  const teacher = authForUser({
    id: 'cmnte97ov0080pp1e7rabj6e8',
    email: 'teacher@springfieldhigh.edu',
    username: 'teacher001',
    name: 'John Teacher',
    role: 'TEACHER',
    schoolId: 'school-001',
  });
  const parent = authForUser({
    id: 'cmojz22qn008z136x33i55s3j',
    email: 'parent.kalki.girma@email.com',
    username: 'PR-019',
    name: 'Parent of Kalki Girma',
    role: 'PARENT',
    schoolId: 'school-001',
  });

  const years = await apiGet(request, admin.access_token, '/academic-years');
  const activeYear = years.find((year: any) => year.isActive) ?? years[0];
  expect(activeYear, 'active academic year').toBeTruthy();
  const terms = await apiGet(request, admin.access_token, `/academic-years/${activeYear.id}/terms`);
  const currentTerm = await apiGet(request, admin.access_token, '/academic-years/terms/current');
  const term =
    terms.find((item: any) => item.id === currentTerm?.id) ??
    terms.find((item: any) => item.isActive) ??
    terms[0];
  expect(term, 'active term').toBeTruthy();

  const allTeacherAssessments = await ensureTeacherAssessments(
    request,
    admin.access_token,
    teacher,
    activeYear.id,
    term.id,
  );
  const teacherAssessments = allTeacherAssessments.filter((item: any) => {
    const classId = item.classId ?? item.class?.id ?? item.assessmentSubject?.classId;
    const sectionId = item.sectionId ?? item.section?.id ?? item.assessmentSubject?.sectionId;
    return classId === targetClassId && sectionId === targetSectionId;
  });
  expect(teacherAssessments.length, 'teacher assessment subject assignments').toBeGreaterThan(0);

  for (const item of teacherAssessments) {
    const assessmentSubjectId = item.assessmentSubjectId ?? item.id;
    const entry = await apiGet(
      request,
      teacher.access_token,
      `/assessments/subjects/${assessmentSubjectId}/score-entry`,
    );
    expect(entry.students.length, `${item.subject?.name ?? item.subjectName} students`).toBeGreaterThan(0);
    await apiPost(request, teacher.access_token, `/assessments/subjects/${assessmentSubjectId}/scores`, {
      scores: entry.students.map((student: any, index: number) => ({
        studentId: student.studentId ?? student.id,
        score: Math.min(Number(entry.maxScore ?? item.maxScore ?? 100), 70 + index),
        remarks: `Playwright real-data exam mark for ${item.subject?.name ?? item.subjectName ?? 'subject'}`,
      })),
    });
    await apiPost(request, teacher.access_token, '/grading/teacher/grades/bulk', {
      grades: entry.students.map((student: any, index: number) => ({
        studentId: student.studentId ?? student.id,
        subjectId: item.subjectId ?? item.subject?.id,
        classId: item.classId ?? item.class?.id,
        sectionId: item.sectionId ?? item.section?.id,
        academicYear: activeYear.id,
        termId: term.id,
        caScore: 20 + index,
        midScore: 25,
        finalScore: 35,
        remark: 'Playwright publish-ready grade entry',
      })),
    });
  }

  const review = await apiGet(
    request,
    admin.access_token,
    `/grading/registrar/assessments?academicYearId=${activeYear.id}&termId=${term.id}`,
  );
  expect(Array.isArray(review), 'registrar assessment review payload').toBeTruthy();

  const adminAssessments = await apiGet(
    request,
    admin.access_token,
    `/assessments?academicYearId=${activeYear.id}&termId=${term.id}`,
  );
  expect(adminAssessments.length, 'admin assessments list').toBeGreaterThan(0);

  const firstAssessment = adminAssessments[0];
  await apiPost(request, admin.access_token, `/assessments/${firstAssessment.id}/lock`);

  const classId =
    teacherAssessments[0].classId ??
    teacherAssessments[0].class?.id ??
    teacherAssessments[0].assessmentSubject?.classId;
  const sectionId =
    teacherAssessments[0].sectionId ??
    teacherAssessments[0].section?.id ??
    teacherAssessments[0].assessmentSubject?.sectionId;
  expect(classId, 'class id for rankings').toBeTruthy();

  await apiPost(request, admin.access_token, '/grading/admin/calculate-rankings', {
    academicYearId: activeYear.id,
    termId: term.id,
    classId,
    sectionId,
  });

  const publishChecklist = await apiGet(
    request,
    admin.access_token,
    `/grading/admin/publish-checklist?academicYear=${activeYear.name}&termId=${term.id}&classId=${classId}`,
  );
  expect(publishChecklist, 'publish checklist').toBeTruthy();

  const publishedClasses = [];
  for (const group of classSectionsByClass(teacherAssessments)) {
    let generatedCount = 0;
    for (const sectionId of group.sectionIds) {
      const generated = await apiPost(request, admin.access_token, '/report-cards/bulk-generate', {
        classId: group.classId,
        sectionId,
        academicYearId: activeYear.id,
        termId: term.id,
        termName: term.name,
      });
      generatedCount += generated.generated;
    }
    expect(generatedCount, `generated report cards for ${group.classId}`).toBeGreaterThan(0);
    const published = await apiPost(request, admin.access_token, '/report-cards/publish/class', {
      academicYearId: activeYear.id,
      termId: term.id,
      classId: group.classId,
      notifyStudents: true,
      notifyParents: true,
    });
    expect(published.published, `published report cards for ${group.classId}`).toBeGreaterThan(0);
    expect(published.notifiedParents, `parent notifications for ${group.classId}`).toBeGreaterThanOrEqual(0);
    publishedClasses.push(group.classId);
  }
  expect(publishedClasses.length, 'published class result batches').toBeGreaterThan(0);

  const childrenPayload = await apiGet(request, parent.access_token, '/parents/me/children');
  const children = Array.isArray(childrenPayload) ? childrenPayload : childrenPayload.children;
  expect(children.length, 'parent children').toBeGreaterThan(0);
  const childId = children[0].student?.id ?? children[0].studentId ?? children[0].id;
  expect(childId, 'parent child id').toBeTruthy();
  await apiGet(
    request,
    parent.access_token,
    `/assessments/parent/child/${childId}/results?academicYearId=${activeYear.id}&termId=${term.id}`,
  );
  const publishedParentCards = await apiGet(
    request,
    parent.access_token,
    `/report-cards/parent/${childId}/published?academicYear=${encodeURIComponent(activeYear.name)}&term=${encodeURIComponent(term.name)}`,
  );
  expect(publishedParentCards.length, 'published parent report cards').toBeGreaterThan(0);
  expect(publishedParentCards[0].publishedAt, 'parent report card published timestamp').toBeTruthy();

  await installAuth(page, admin);
  await assertUsablePage(page, '/admin/assessments', /Assessment|Exam|Create/i);
  await assertUsablePage(page, '/admin/exams', /Exam|Assessment/i);
  await assertUsablePage(page, '/admin/exams/entry-progress', /Entry|Progress|Teacher/i);
  await assertUsablePage(page, '/admin/exams/publish', /Publish|Checklist|Results/i);
  await assertUsablePage(page, '/admin/exams/rankings', /Ranking|Rank|Class/i);

  await installAuth(page, teacher);
  await assertUsablePage(page, '/teacher/grading', /Grading|Grade|Student|Subject/i);

  await installAuth(page, parent);
  await assertUsablePage(page, '/parent/grades', /Grade|Result|Child/i);
});
