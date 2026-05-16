import { test, expect, APIRequestContext, Page } from '@playwright/test';
import crypto from 'crypto';

const baseURL = process.env.SMS_BASE_URL || 'http://localhost:3000';
const apiURL = process.env.SMS_API_URL || 'http://localhost:5000';
const password = process.env.SMS_TEST_PASSWORD || 'admin123';
const jwtSecret = process.env.SMS_JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const targetClassId = process.env.SMS_TEST_CLASS_ID || 'cmojz1x0c005i136xa4jk2rzj';
const targetSectionId = process.env.SMS_TEST_SECTION_ID || 'cmojz1x0g005k136xdw0gm9zc';

type LoginResult = { access_token: string; user: any };

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

function authForUser(user: any, schoolId: string): LoginResult {
  return {
    access_token: makeToken(user),
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      schoolId,
      calendarType: 'ETHIOPIAN',
      theme: 'SYSTEM',
      mustChangePassword: false,
      permissions: [],
    },
  };
}

async function login(request: APIRequestContext, loginIdentifier: string): Promise<LoginResult> {
  const response = await request.post(`${apiURL}/auth/login`, {
    data: { loginIdentifier, password },
  });
  expect(response.ok(), `${loginIdentifier} login failed: ${await response.text()}`).toBeTruthy();
  return response.json();
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

async function apiPut(request: APIRequestContext, token: string, path: string, data?: any) {
  const response = await request.put(`${apiURL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
  expect(response.ok(), `${path} failed: ${await response.text()}`).toBeTruthy();
  return response.json();
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

async function assertUsablePage(page: Page, path: string, expected: RegExp) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !/^Failed to load resource:/i.test(message.text())) {
      errors.push(message.text());
    }
  });
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });

  await page.goto(`${baseURL}${path}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(expected, { timeout: 20000 });
  await expect(page.locator('body')).not.toContainText(/access denied|404|Unhandled Runtime Error/i);
  expect(
    errors.filter((error) => !/favicon|_next\/static|_next\/image|Failed to fetch RSC payload/i.test(error)),
    `${path} browser errors`,
  ).toEqual([]);
}

test('professional assessment to certificate generation flow with five teachers and six assessment types', async ({
  page,
  request,
}) => {
  test.setTimeout(180000);

  const admin = await login(request, process.env.SMS_TEST_ADMIN_LOGIN || 'admin001');
  const parent = await login(request, process.env.SMS_TEST_PARENT_LOGIN || 'PR-002');

  const years = await apiGet(request, admin.access_token, '/academic-years');
  const activeYear = years.find((year: any) => year.isActive) ?? years[0];
  expect(activeYear, 'active academic year').toBeTruthy();
  const terms = await apiGet(request, admin.access_token, `/academic-years/${activeYear.id}/terms`);
  const currentTerm = await apiGet(request, admin.access_token, '/academic-years/terms/current');
  const term = terms.find((item: any) => item.id === currentTerm?.id) ?? terms.find((item: any) => item.isActive) ?? terms[0];
  expect(term, 'active term').toBeTruthy();

  await apiPut(request, admin.access_token, '/assessments/config/weights', {
    weights: [
      { type: 'QUIZ', percentage: 15 },
      { type: 'ATTENDANCE', percentage: 10 },
      { type: 'MID', percentage: 20 },
      { type: 'FINAL', percentage: 30 },
      { type: 'WORKSHEET', percentage: 10 },
      { type: 'TEST', percentage: 15 },
    ],
  });

  const runId = Date.now().toString(36);
  const staffPayload = {
    academicYear: activeYear.name,
    staff: Array.from({ length: 5 }, (_, index) => ({
      name: `PW Assessment Teacher ${index + 1} ${runId}`,
      email: `pw.teacher.${runId}.${index + 1}@springfieldhigh.edu`,
      role: 'TEACHER',
      generateCredentials: false,
      username: `pwteacher${runId}${index + 1}`,
      password,
    })),
  };
  const createdStaff = await apiPost(request, admin.access_token, '/credentials/staff/create', staffPayload);
  expect(createdStaff.staff, 'created teachers').toHaveLength(5);

  const subjects: Array<{ id: string; name?: string; code?: string }> = [];
  for (let index = 0; index < 5; index += 1) {
    const subject = await apiPost(request, admin.access_token, '/subjects', {
      name: `PW Subject ${index + 1} ${runId}`,
      code: `PW${runId}${index + 1}`,
      isActive: true,
    });
    subjects.push(subject);
    await apiPost(request, admin.access_token, '/class-subjects', {
      classId: targetClassId,
      sectionId: targetSectionId,
      subjectId: subject.id,
      academicYearId: activeYear.id,
      teacherId: createdStaff.staff[index].id,
    });
  }

  const teacherAuths = [];
  for (const staff of createdStaff.staff) {
    const auth = authForUser(staff, admin.user.schoolId);
    teacherAuths.push(auth);
    const assignments = await apiGet(request, admin.access_token, `/class-subjects/by-teacher/${staff.id}?academicYearId=${activeYear.id}`);
    expect(assignments.some((item: any) => item.classId === targetClassId && item.sectionId === targetSectionId), `${staff.name} assignment`).toBeTruthy();
  }

  const assessmentTypes = ['QUIZ', 'ATTENDANCE', 'MID', 'FINAL', 'WORKSHEET', 'TEST'];
  const createdAssessmentSubjects: any[] = [];
  for (let typeIndex = 0; typeIndex < assessmentTypes.length; typeIndex += 1) {
    const type = assessmentTypes[typeIndex];
    const assessment = await apiPost(request, admin.access_token, '/assessments', {
      title: `PW ${type} Assessment ${runId}`,
      type,
      academicYearId: activeYear.id,
      termId: term.id,
      startDate: new Date(Date.now() + typeIndex * 60000).toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + typeIndex * 60000).toISOString(),
      addToCalendar: false,
      subjects: subjects.map((subject, index) => ({
        subjectId: subject.id,
        classId: targetClassId,
        sectionId: targetSectionId,
        teacherId: createdStaff.staff[index].id,
        maxScore: 100,
        passMark: type === 'ATTENDANCE' ? 0 : 50,
      })),
    });
    expect(assessment.id, `${type} assessment id`).toBeTruthy();
  }

  for (let index = 0; index < teacherAuths.length; index += 1) {
    const teacherAssessments = await apiGet(
      request,
      teacherAuths[index].access_token,
      `/assessments/teacher/me?academicYearId=${activeYear.id}&termId=${term.id}`,
    );
    const owned = teacherAssessments.filter((item: any) =>
      assessmentTypes.includes(item.assessment?.type ?? item.type) &&
      (item.subjectId ?? item.subject?.id) === subjects[index].id &&
      (item.classId ?? item.class?.id) === targetClassId &&
      (item.sectionId ?? item.section?.id) === targetSectionId,
    );
    expect(owned.length, `assessment subjects for ${createdStaff.staff[index].name}`).toBeGreaterThanOrEqual(assessmentTypes.length);
    createdAssessmentSubjects.push(...owned);

    for (const item of owned) {
      const assessmentSubjectId = item.assessmentSubjectId ?? item.id;
      const entry = await apiGet(request, teacherAuths[index].access_token, `/assessments/subjects/${assessmentSubjectId}/score-entry`);
      expect(entry.students.length, `${item.assessment?.type ?? item.type} ${item.subject?.name ?? item.subjectName} students`).toBeGreaterThan(0);
      await apiPost(request, teacherAuths[index].access_token, `/assessments/subjects/${assessmentSubjectId}/scores`, {
        scores: entry.students.map((student: any, studentIndex: number) => ({
          studentId: student.studentId ?? student.id,
          score: Math.min(Number(entry.maxScore ?? item.maxScore ?? 100), 72 + index + studentIndex),
          remarks: `PW ${item.assessment?.type ?? item.type} mark by ${createdStaff.staff[index].name}`,
        })),
      });
    }
  }

  expect(createdAssessmentSubjects.length, 'created assessment subject coverage').toBeGreaterThanOrEqual(30);

  const firstSubjectEntry = await apiGet(
    request,
    teacherAuths[0].access_token,
    `/assessments/subjects/${createdAssessmentSubjects[0].assessmentSubjectId ?? createdAssessmentSubjects[0].id}/score-entry`,
  );
  await apiPost(request, teacherAuths[0].access_token, '/grading/teacher/grades/bulk', {
    grades: firstSubjectEntry.students.map((student: any, index: number) => ({
      studentId: student.studentId ?? student.id,
      subjectId: subjects[0].id,
      classId: targetClassId,
      sectionId: targetSectionId,
      academicYear: activeYear.id,
      termId: term.id,
      caScore: 25 + index,
      midScore: 25,
      finalScore: 35,
      remark: 'PW publish-ready grade entry',
    })),
  });

  const review = await apiGet(request, admin.access_token, `/grading/registrar/assessments?academicYearId=${activeYear.id}&termId=${term.id}`);
  expect(Array.isArray(review), 'registrar review payload').toBeTruthy();

  await apiPost(request, admin.access_token, '/grading/admin/calculate-rankings', {
    academicYearId: activeYear.id,
    termId: term.id,
    classId: targetClassId,
    sectionId: targetSectionId,
  });

  const generated = await apiPost(request, admin.access_token, '/report-cards/bulk-generate', {
    classId: targetClassId,
    sectionId: targetSectionId,
    academicYearId: activeYear.id,
    termId: term.id,
    termName: term.name,
  });
  expect(generated.generated, 'generated report cards').toBeGreaterThan(0);

  const published = await apiPost(request, admin.access_token, '/report-cards/publish/class', {
    academicYearId: activeYear.id,
    termId: term.id,
    classId: targetClassId,
    notifyStudents: true,
    notifyParents: true,
  });
  expect(published.published, 'published report cards').toBeGreaterThan(0);

  const cards = await apiGet(
    request,
    admin.access_token,
    `/report-cards?classId=${targetClassId}&academicYear=${encodeURIComponent(activeYear.name)}&term=${encodeURIComponent(term.name)}&status=PUBLISHED`,
  );
  expect(cards.length, 'published report cards list').toBeGreaterThan(0);
  const reportCardId = cards[0].id;

  const certificatePayload = await apiGet(request, admin.access_token, `/report-cards/${reportCardId}/certificate`);
  expect(certificatePayload.reportCard?.student?.name, 'certificate student name').toBeTruthy();
  expect(certificatePayload.reportCard?.id, 'certificate report card id').toBe(reportCardId);

  const certificatePdf = await request.get(`${apiURL}/report-cards/${reportCardId}/certificate-pdf`, {
    headers: { Authorization: `Bearer ${admin.access_token}` },
  });
  expect(certificatePdf.ok(), `certificate PDF failed: ${await certificatePdf.text()}`).toBeTruthy();
  expect(certificatePdf.headers()['content-type']).toContain('application/pdf');
  expect((await certificatePdf.body()).length, 'certificate PDF byte size').toBeGreaterThan(1000);

  const childrenPayload = await apiGet(request, parent.access_token, '/parents/me/children');
  const children = Array.isArray(childrenPayload) ? childrenPayload : childrenPayload.children;
  expect(children.length, 'parent children').toBeGreaterThan(0);
  const childId = children[0].student?.id ?? children[0].studentId ?? children[0].id;
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
  expect(publishedParentCards.length, 'parent published report cards').toBeGreaterThan(0);

  await installAuth(page, admin);
  await assertUsablePage(page, '/admin/assessments', /Assessment|Exam|Create/i);
  await assertUsablePage(page, '/admin/exams', /Exam|Assessment/i);
  await assertUsablePage(page, '/admin/exams/entry-progress', /Entry|Progress|Teacher/i);
  await assertUsablePage(page, '/admin/exams/publish', /Publish|Checklist|Results/i);
  await assertUsablePage(page, '/admin/exams/rankings', /Ranking|Rank|Class/i);

  const teacherBrowserAuth = await login(request, createdStaff.staff[0].username);
  await installAuth(page, teacherBrowserAuth);
  await assertUsablePage(page, '/teacher/grading', /Grading|Grade|Student|Subject/i);

  await installAuth(page, parent);
  await assertUsablePage(page, '/parent/grades', /Grade|Result|Child/i);
});
