import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface HelpSeedItem {
  role: string;
  title: string;
  content: string;
  summary: string;
  category: string;
  linkUrl?: string;
  tags: string;
  order: number;
}

@Injectable()
export class HelpSeedService {
  private readonly logger = new Logger(HelpSeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  private readonly articles: HelpSeedItem[] = [
    // ===== SUPER_ADMIN =====
    { role: 'SUPER_ADMIN', title: 'Schools Registry', content: 'Open the school registry and manage school records.', summary: '', category: 'quick_link', linkUrl: '/list/schools', tags: 'schools, registry, manage', order: 1 },
    { role: 'SUPER_ADMIN', title: 'School Admins', content: 'Create and manage school administrator accounts.', summary: '', category: 'quick_link', linkUrl: '/superadmin/admins', tags: 'admins, administrators, accounts', order: 2 },
    { role: 'SUPER_ADMIN', title: 'Subscriptions', content: 'Review subscription plans and billing status.', summary: '', category: 'quick_link', linkUrl: '/superadmin/subscription', tags: 'subscriptions, billing, plans', order: 3 },
    { role: 'SUPER_ADMIN', title: 'Roles & Permissions', content: 'Review permission structure across the platform.', summary: '', category: 'quick_link', linkUrl: '/list/roles', tags: 'roles, permissions, access', order: 4 },
    { role: 'SUPER_ADMIN', title: 'Add a New School', content: 'Create the school first, then assign its admin user.\nSteps:\n1. Open Schools and create the school profile.\n2. Go to School Admins and create or assign the school admin.\n3. Review subscription setup if the school requires access immediately.', summary: 'Create the school first, then assign its admin user.', category: 'task', linkUrl: '/list/schools', tags: 'school, create, add, new, admin', order: 5 },
    { role: 'SUPER_ADMIN', title: 'Fix Access Issues', content: 'Start from roles and permissions before checking route pages.\nSteps:\n1. Open Roles & Permissions.\n2. Confirm the role has the required permission set.\n3. If needed, re-check the affected page with that user account.', summary: 'Start from roles and permissions before checking route pages.', category: 'task', linkUrl: '/list/roles', tags: 'access, permissions, roles, issues, fix', order: 6 },
    { role: 'SUPER_ADMIN', title: 'Use School-Specific Pages', content: 'Use school-specific pages for operational work; keep platform actions at the super admin level.', summary: '', category: 'support_tip', tags: 'school, operations, platform', order: 7 },
    { role: 'SUPER_ADMIN', title: 'Check Roles and School Assignment', content: 'When a page fails for a school user, check both role permissions and school assignment.', summary: '', category: 'support_tip', tags: 'roles, permissions, school, assignment, troubleshooting', order: 8 },

    // ===== ADMIN =====
    { role: 'ADMIN', title: 'Dashboard', content: 'View school-level metrics and activity.', summary: '', category: 'quick_link', linkUrl: '/admin', tags: 'dashboard, metrics, school', order: 1 },
    { role: 'ADMIN', title: 'School Settings', content: 'Set school profile, logo, curriculum, grading, attendance, finance, and feature settings.', summary: '', category: 'quick_link', linkUrl: '/settings', tags: 'settings, school, configuration', order: 2 },
    { role: 'ADMIN', title: 'Academic Years', content: 'Create terms, quarters, or semesters and keep the active year correct.', summary: '', category: 'quick_link', linkUrl: '/admin/academic-years', tags: 'academic, years, terms, quarters, semesters', order: 3 },
    { role: 'ADMIN', title: 'Classes & Sections', content: 'Manage classes, sections, capacity, and grade structure.', summary: '', category: 'quick_link', linkUrl: '/admin/class-sections', tags: 'classes, sections, grades', order: 4 },
    { role: 'ADMIN', title: 'Students & Staff', content: 'Maintain students, parents, teachers, registrar, finance, and IT users.', summary: '', category: 'quick_link', linkUrl: '/list/students', tags: 'students, staff, teachers, parents', order: 5 },
    { role: 'ADMIN', title: 'Assessments', content: 'Create quiz, attendance, mid, final, worksheet, and test assessment structures.', summary: '', category: 'quick_link', linkUrl: '/admin/assessments', tags: 'assessments, exams, quizzes, tests', order: 6 },
    { role: 'ADMIN', title: 'Entry Progress', content: 'Track whether teachers have entered all required assessment scores.', summary: '', category: 'quick_link', linkUrl: '/admin/exams/entry-progress', tags: 'entry, progress, scores, exams', order: 7 },
    { role: 'ADMIN', title: 'Publish Results', content: 'Publish report cards, calculate ranking, and notify parents and students.', summary: '', category: 'quick_link', linkUrl: '/admin/exams/publish', tags: 'publish, results, report cards, ranking', order: 8 },
    { role: 'ADMIN', title: 'Performance Brief', content: 'Download the parent-facing term, quarter, or semester performance brief.', summary: '', category: 'quick_link', linkUrl: '/admin/reports/parent-presentation', tags: 'performance, brief, reports, parents', order: 9 },
    { role: 'ADMIN', title: 'Report Cards', content: 'Review generated report cards and certificate readiness.', summary: '', category: 'quick_link', linkUrl: '/admin/report-cards', tags: 'report cards, certificates', order: 10 },
    { role: 'ADMIN', title: 'Communication Book', content: 'Review and follow up on parent-teacher communications.', summary: '', category: 'quick_link', linkUrl: '/list/communications', tags: 'communication, messages, parents, teachers', order: 11 },
    { role: 'ADMIN', title: 'Announcements', content: 'Create or review school announcements.', summary: '', category: 'quick_link', linkUrl: '/list/announcements', tags: 'announcements, notifications', order: 12 },
    { role: 'ADMIN', title: 'Start a New Academic Period', content: 'Use this sequence before teachers enter any attendance or scores.\nSteps:\n1. Open School Settings and confirm the curriculum type: term, quarter, or semester.\n2. Create or activate the academic year and its periods.\n3. Configure classes, sections, subjects, timetable, and teacher assignments.', summary: 'Use this sequence before teachers enter any attendance or scores.', category: 'task', linkUrl: '/admin/academic-years', tags: 'academic, period, term, setup, new year', order: 13 },
    { role: 'ADMIN', title: 'Onboard Students', content: 'Use enrollment or bulk tools depending on the intake size.\nSteps:\n1. Process admissions through Enrollments for individual intake.\n2. Use Bulk Upload for large imports.\n3. Generate credentials only after student, parent, and class placement records are confirmed.', summary: 'Use enrollment or bulk tools depending on the intake size.', category: 'task', linkUrl: '/admin/enrollment', tags: 'students, enrollment, onboard, bulk upload', order: 14 },
    { role: 'ADMIN', title: 'Run Assessment to Publish', content: 'This is the main exam flow from setup to parent-visible results.\nSteps:\n1. Create assessments and include the needed types: quiz, attendance, mid, final, worksheet, and test.\n2. Assign subjects, classes, sections, and teachers so each teacher sees the right mark-entry work.\n3. Use Entry Progress to confirm every required score is entered before publishing.\n4. Open Publish Results to publish report cards; ranking is calculated automatically during publish.', summary: 'This is the main exam flow from setup to parent-visible results.', category: 'task', linkUrl: '/admin/exams/publish', tags: 'assessments, exams, publish, results, workflow', order: 15 },
    { role: 'ADMIN', title: 'Prepare Certificates and Report Cards', content: 'Keep certificate readiness separate from the result publish decision.\nSteps:\n1. Configure the certificate template once the school logo and report card fields are ready.\n2. Publish results from the publish page when marks and report cards are complete.\n3. Use Report Cards to verify student-level outputs and certificate downloads.', summary: 'Keep certificate readiness separate from the result publish decision.', category: 'task', linkUrl: '/admin/report-cards/certificate-template', tags: 'certificates, report cards, templates', order: 16 },
    { role: 'ADMIN', title: 'Present Term Performance to Parents', content: 'Use the performance brief for admin-led parent meetings, not student-only reports.\nSteps:\n1. Open Performance Brief and choose the academic year and comparison periods.\n2. Review average result, attendance, pass rate, improving classes, weak subjects, and class comparison.\n3. Download PDF for presentation or Excel for analysis.', summary: 'Use the performance brief for admin-led parent meetings.', category: 'task', linkUrl: '/admin/reports/parent-presentation', tags: 'performance, parents, meeting, presentation, brief', order: 17 },
    { role: 'ADMIN', title: 'Monitor Attendance Quality', content: 'Teachers take today\'s attendance, while admin monitors coverage and missing sessions.\nSteps:\n1. Use Admin Attendance to review class coverage and missing submissions.\n2. Ask teachers to submit attendance only for the current day from their attendance page.\n3. Use Communication Book or announcements for attendance follow-up when parents need to know.', summary: 'Teachers take today\'s attendance, while admin monitors coverage.', category: 'task', linkUrl: '/admin/attendance', tags: 'attendance, monitoring, teachers, coverage', order: 18 },
    { role: 'ADMIN', title: 'Publish Results is Source of Truth', content: 'Publish Results is the parent-visible source of truth for results and ranking.', summary: '', category: 'support_tip', tags: 'publish, results, truth, parent', order: 19 },
    { role: 'ADMIN', title: 'Entry Progress Before Publishing', content: 'Entry Progress should come before Publish Results; it prevents publishing incomplete assessment work.', summary: '', category: 'support_tip', tags: 'entry, progress, publish, assessment', order: 20 },
    { role: 'ADMIN', title: 'Certificate Readiness', content: 'Certificate readiness can be fixed from the certificate-template page without blocking normal report-card publish.', summary: '', category: 'support_tip', tags: 'certificate, template, report card', order: 21 },
    { role: 'ADMIN', title: 'Performance Brief for Meetings', content: 'Use Performance Brief for parent meetings because it compares periods at class and subject level.', summary: '', category: 'support_tip', tags: 'performance, brief, meetings, parents', order: 22 },
    { role: 'ADMIN', title: 'Access Denied Troubleshooting', content: 'If a page shows access-denied, check the first API request that page makes, not only the visible route.', summary: '', category: 'support_tip', tags: 'access, denied, troubleshooting, api', order: 23 },

    // ===== TEACHER =====
    { role: 'TEACHER', title: 'Dashboard', content: 'Open your classroom summary and recent activity.', summary: '', category: 'quick_link', linkUrl: '/teacher', tags: 'dashboard, classroom, activity', order: 1 },
    { role: 'TEACHER', title: 'My Classes', content: 'View assigned classes and students.', summary: '', category: 'quick_link', linkUrl: '/teacher/my-class', tags: 'classes, students, assigned', order: 2 },
    { role: 'TEACHER', title: 'Attendance', content: 'Take and submit attendance for today only.', summary: '', category: 'quick_link', linkUrl: '/teacher/attendance', tags: 'attendance, take, submit', order: 3 },
    { role: 'TEACHER', title: 'Lessons', content: 'Create and manage lesson content.', summary: '', category: 'quick_link', linkUrl: '/teacher/lessons', tags: 'lessons, content, teaching', order: 4 },
    { role: 'TEACHER', title: 'Marks Entry', content: 'Enter assessment scores assigned to you.', summary: '', category: 'quick_link', linkUrl: '/teacher/grading', tags: 'marks, grades, scores, assessment', order: 5 },
    { role: 'TEACHER', title: 'Timetable', content: 'View assigned sessions using the school calendar and time format.', summary: '', category: 'quick_link', linkUrl: '/teacher/timetable', tags: 'timetable, schedule, sessions', order: 6 },
    { role: 'TEACHER', title: 'Communication Book', content: 'Send and review parent or student communication.', summary: '', category: 'quick_link', linkUrl: '/list/communications', tags: 'communication, parents, students, messages', order: 7 },
    { role: 'TEACHER', title: 'Take Attendance Correctly', content: 'Work from the assigned session and submit after review.\nSteps:\n1. Open Attendance from the teacher area.\n2. Select the correct session or class.\n3. Only today is editable; past and future dates are read-only.\n4. Mark records and submit the session after verifying absences and lateness.', summary: 'Work from the assigned session and submit after review.', category: 'task', linkUrl: '/teacher/attendance', tags: 'attendance, take, submit, today', order: 8 },
    { role: 'TEACHER', title: 'Send a Communication Note', content: 'Use Communication Book for tracked parent or student messaging.\nSteps:\n1. Open Communication Book and start a new message.\n2. Search only for students related to your assigned classes.\n3. Send the note and use the conversation thread for follow-up replies.', summary: 'Use Communication Book for tracked parent or student messaging.', category: 'task', linkUrl: '/list/communications', tags: 'communication, message, parents, students', order: 9 },
    { role: 'TEACHER', title: 'Enter Assessment Scores', content: 'Use Marks Entry for your assigned assessment subjects.\nSteps:\n1. Open Marks Entry and choose the correct academic period and subject.\n2. Enter scores for quiz, attendance, mid, final, worksheet, or test when assigned.\n3. Review values before submission to avoid correction cycles.', summary: 'Use Marks Entry for your assigned assessment subjects.', category: 'task', linkUrl: '/teacher/grading', tags: 'assessment, scores, marks, grading, entry', order: 10 },
    { role: 'TEACHER', title: 'Communication Search', content: 'If a student does not appear in your communication search, verify that the student is in your homeroom or teaching classes.', summary: '', category: 'support_tip', tags: 'communication, search, student, homeroom', order: 11 },
    { role: 'TEACHER', title: 'Attendance Locked to Today', content: 'Attendance is intentionally locked to today, so future attendance cannot be submitted in advance.', summary: '', category: 'support_tip', tags: 'attendance, locked, today', order: 12 },
    { role: 'TEACHER', title: 'Check Academic Year and Class', content: 'When attendance or grading looks incomplete, confirm the active academic year and class assignment first.', summary: '', category: 'support_tip', tags: 'attendance, grading, academic year, class', order: 13 },

    // ===== STUDENT =====
    { role: 'STUDENT', title: 'Dashboard', content: 'Open your personal student overview.', summary: '', category: 'quick_link', linkUrl: '/student', tags: 'dashboard, student, overview', order: 1 },
    { role: 'STUDENT', title: 'Timetable', content: 'See your current class schedule.', summary: '', category: 'quick_link', linkUrl: '/student/timetable', tags: 'timetable, schedule, classes', order: 2 },
    { role: 'STUDENT', title: 'Attendance', content: 'Review your attendance history.', summary: '', category: 'quick_link', linkUrl: '/student/attendance', tags: 'attendance, history', order: 3 },
    { role: 'STUDENT', title: 'Grades', content: 'Check published academic results.', summary: '', category: 'quick_link', linkUrl: '/student/grades', tags: 'grades, results, academic', order: 4 },
    { role: 'STUDENT', title: 'Lessons', content: 'Open lesson materials and learning content.', summary: '', category: 'quick_link', linkUrl: '/student/lessons', tags: 'lessons, materials, learning', order: 5 },
    { role: 'STUDENT', title: 'Fees', content: 'View fee information and balances.', summary: '', category: 'quick_link', linkUrl: '/student/fees', tags: 'fees, payments, balances', order: 6 },
    { role: 'STUDENT', title: 'Find Your Class Schedule', content: 'Use the timetable page for current periods and planning.\nSteps:\n1. Open Timetable from your student area.\n2. Review the current day or upcoming schedule.\n3. Use Calendar for event-level dates outside normal class periods.', summary: 'Use the timetable page for current periods and planning.', category: 'task', linkUrl: '/student/timetable', tags: 'timetable, schedule, classes, planning', order: 7 },
    { role: 'STUDENT', title: 'Check Your Academic Progress', content: 'Use grades for marks and exams for formal exam records.\nSteps:\n1. Open Grades for published academic performance.\n2. Check report-card style pages when your school publishes formal results.\n3. Contact your teacher if a result appears missing or incorrect.', summary: 'Use grades for marks and exams for formal exam records.', category: 'task', linkUrl: '/student/grades', tags: 'grades, progress, academic, exams', order: 8 },
    { role: 'STUDENT', title: 'Missing Content', content: 'If a lesson or grade is missing, it may not be published or assigned yet.', summary: '', category: 'support_tip', tags: 'missing, lesson, grade, published', order: 9 },
    { role: 'STUDENT', title: 'Use Announcements and Calendar', content: 'Use announcements and calendar for school-wide updates outside your class pages.', summary: '', category: 'support_tip', tags: 'announcements, calendar, updates', order: 10 },

    // ===== PARENT =====
    { role: 'PARENT', title: 'Dashboard', content: 'Open your parent overview.', summary: '', category: 'quick_link', linkUrl: '/parent', tags: 'dashboard, parent', order: 1 },
    { role: 'PARENT', title: 'Children', content: 'Review your linked student profiles.', summary: '', category: 'quick_link', linkUrl: '/parent/children', tags: 'children, students, profiles', order: 2 },
    { role: 'PARENT', title: 'Grades', content: 'Check published grades and rankings for your children.', summary: '', category: 'quick_link', linkUrl: '/parent/grades', tags: 'grades, rankings, children', order: 3 },
    { role: 'PARENT', title: 'Attendance', content: 'Review attendance history for your children.', summary: '', category: 'quick_link', linkUrl: '/parent/attendance', tags: 'attendance, history, children', order: 4 },
    { role: 'PARENT', title: 'Fees', content: 'Track fees, balances, and payment history.', summary: '', category: 'quick_link', linkUrl: '/parent/fees', tags: 'fees, payments, balances', order: 5 },
    { role: 'PARENT', title: 'Communication Book', content: 'Send and review communication with teachers.', summary: '', category: 'quick_link', linkUrl: '/list/communications', tags: 'communication, teachers, messages', order: 6 },
    { role: 'PARENT', title: 'Check Your Child\'s Academic Status', content: 'Use published results, attendance, timetable, and finance pages together.\nSteps:\n1. Open Grades after the school publishes results.\n2. Switch or review the correct child if you have multiple children.\n3. Check attendance and fees for the same child before raising a follow-up.\n4. Use Communication Book for follow-up questions to teachers.', summary: 'Use published results, attendance, timetable, and finance pages together.', category: 'task', linkUrl: '/parent/grades', tags: 'academic, status, children, grades, attendance', order: 7 },
    { role: 'PARENT', title: 'Send a Message to a Teacher', content: 'Use Communication Book for trackable school communication.\nSteps:\n1. Open Communication Book.\n2. Choose the related child or conversation.\n3. Send the message and continue replies in the same thread.', summary: 'Use Communication Book for trackable school communication.', category: 'task', linkUrl: '/list/communications', tags: 'message, teacher, communication', order: 8 },
    { role: 'PARENT', title: 'Missing Child', content: 'If a child is missing from your account, the parent-student relationship may need to be linked in the system.', summary: '', category: 'support_tip', tags: 'child, missing, link, relationship', order: 9 },
    { role: 'PARENT', title: 'Grades Visibility', content: 'Grades and ranking appear after admin publishes results; draft teacher entries are not parent-visible.', summary: '', category: 'support_tip', tags: 'grades, visibility, publish, draft', order: 10 },
    { role: 'PARENT', title: 'Use Communication Book', content: 'Use Communication Book for academic follow-up instead of relying only on announcements.', summary: '', category: 'support_tip', tags: 'communication, follow-up, announcements', order: 11 },

    // ===== IT_MANAGER =====
    { role: 'IT_MANAGER', title: 'Dashboard', content: 'Open the IT operations dashboard.', summary: '', category: 'quick_link', linkUrl: '/it-manager', tags: 'dashboard, it, operations', order: 1 },
    { role: 'IT_MANAGER', title: 'School Settings', content: 'Configure school-level technical settings.', summary: '', category: 'quick_link', linkUrl: '/settings', tags: 'settings, technical, configuration', order: 2 },
    { role: 'IT_MANAGER', title: 'Class & Sections', content: 'Maintain structure and related academic mappings.', summary: '', category: 'quick_link', linkUrl: '/admin/class-sections', tags: 'classes, sections, structure', order: 3 },
    { role: 'IT_MANAGER', title: 'Assignments', content: 'Review teacher-class assignment coverage.', summary: '', category: 'quick_link', linkUrl: '/admin/assignments', tags: 'assignments, teachers, classes', order: 4 },
    { role: 'IT_MANAGER', title: 'Siren Management', content: 'Manage bell schedules and siren configuration.', summary: '', category: 'quick_link', linkUrl: '/admin/siren-management', tags: 'siren, bell, schedule, configuration', order: 5 },
    { role: 'IT_MANAGER', title: 'Credentials', content: 'Generate and review login credentials.', summary: '', category: 'quick_link', linkUrl: '/admin/credentials', tags: 'credentials, login, passwords', order: 6 },
    { role: 'IT_MANAGER', title: 'Prepare School for New Term', content: 'Check settings, academic-year status, structure, timetable, and assignments.\nSteps:\n1. Verify school settings, logo, curriculum type, and feature switches.\n2. Verify the active academic year and periods.\n3. Review classes, sections, and subject allocations.\n4. Check timetable and teacher assignments for gaps.', summary: 'Check settings, academic-year status, structure, timetable, and assignments.', category: 'task', linkUrl: '/settings', tags: 'term, setup, school, preparation', order: 7 },
    { role: 'IT_MANAGER', title: 'Support Exam Operations', content: 'IT Manager can help academic setup without owning people-management decisions.\nSteps:\n1. Confirm assessment setup, subject assignments, and teacher visibility.\n2. Use Entry Progress to locate missing score-entry work.\n3. Use Publish Results only after admin confirms the academic data is final.', summary: 'IT Manager can help academic setup without owning people-management decisions.', category: 'task', linkUrl: '/admin/exams/entry-progress', tags: 'exams, support, entry progress, publish', order: 8 },
    { role: 'IT_MANAGER', title: 'Support Login and Access Issues', content: 'Start from credentials, then role permissions, then page-specific checks.\nSteps:\n1. Confirm the user can log in and has the right role.\n2. Review credentials or regenerate them if necessary.\n3. If access still fails, inspect the target page\'s role and permission requirements.', summary: 'Start from credentials, then role permissions, then page-specific checks.', category: 'task', linkUrl: '/admin/credentials', tags: 'login, access, credentials, troubleshooting', order: 9 },
    { role: 'IT_MANAGER', title: 'IT Manager Scope', content: 'IT Manager should keep academic configuration access, but avoid student, parent, and staff create/update/delete work unless policy explicitly allows it.', summary: '', category: 'support_tip', tags: 'scope, permissions, it manager', order: 10 },
    { role: 'IT_MANAGER', title: 'Upload Troubleshooting', content: 'For uploaded logos or files, check whether the page resolves /uploads assets through the backend or frontend public path.', summary: '', category: 'support_tip', tags: 'uploads, troubleshooting, files', order: 11 },
    { role: 'IT_MANAGER', title: 'Route Failure Debugging', content: 'When a route fails, verify whether the backend gate or the frontend helper request is the first blocker.', summary: '', category: 'support_tip', tags: 'routes, debugging, backend, frontend', order: 12 },

    // ===== REGISTRAR =====
    { role: 'REGISTRAR', title: 'Dashboard', content: 'Open registrar-focused metrics and workflow status.', summary: '', category: 'quick_link', linkUrl: '/registrar', tags: 'dashboard, registrar, metrics', order: 1 },
    { role: 'REGISTRAR', title: 'Students', content: 'Manage student records and profiles.', summary: '', category: 'quick_link', linkUrl: '/list/students', tags: 'students, records, profiles', order: 2 },
    { role: 'REGISTRAR', title: 'Enrollments', content: 'Process incoming student admissions.', summary: '', category: 'quick_link', linkUrl: '/admin/enrollment', tags: 'enrollments, admissions, students', order: 3 },
    { role: 'REGISTRAR', title: 'Promotion', content: 'Promote students to the next level.', summary: '', category: 'quick_link', linkUrl: '/admin/promotion', tags: 'promotion, students, next level', order: 4 },
    { role: 'REGISTRAR', title: 'Credentials', content: 'Generate account credentials for users.', summary: '', category: 'quick_link', linkUrl: '/admin/credentials', tags: 'credentials, accounts, login', order: 5 },
    { role: 'REGISTRAR', title: 'Report Cards', content: 'Review published report-card records when registrar support is needed.', summary: '', category: 'quick_link', linkUrl: '/admin/report-cards', tags: 'report cards, results', order: 6 },
    { role: 'REGISTRAR', title: 'Performance Brief', content: 'Download term, quarter, or semester summaries for parent presentations.', summary: '', category: 'quick_link', linkUrl: '/admin/reports/parent-presentation', tags: 'performance, brief, summaries', order: 7 },
    { role: 'REGISTRAR', title: 'Process a New Student', content: 'Move from enrollment approval to full active record setup.\nSteps:\n1. Review and approve the enrollment.\n2. Confirm class placement and supporting details.\n3. Generate credentials if the student account should be active immediately.', summary: 'Move from enrollment approval to full active record setup.', category: 'task', linkUrl: '/admin/enrollment', tags: 'student, enrollment, approve, credentials', order: 8 },
    { role: 'REGISTRAR', title: 'Run Student Promotion', content: 'Review destination classes before applying promotions.\nSteps:\n1. Open Promotion and select the source class.\n2. Verify the destination class and eligible students.\n3. Apply the promotion only after the target structure is confirmed.', summary: 'Review destination classes before applying promotions.', category: 'task', linkUrl: '/admin/promotion', tags: 'promotion, students, classes', order: 9 },
    { role: 'REGISTRAR', title: 'Support Published Reports', content: 'Use report-card pages for verification.\nSteps:\n1. Open Report Cards to confirm which students have published results.\n2. Use Performance Brief when admin needs a parent-facing period comparison.\n3. Send corrections back to admin or teachers before republishing if marks are wrong.', summary: 'Use report-card pages for verification.', category: 'task', linkUrl: '/admin/report-cards', tags: 'reports, report cards, verification', order: 10 },
    { role: 'REGISTRAR', title: 'Sensitive Actions', content: 'Promotion and grading actions are sensitive; confirm academic year and class mapping before saving.', summary: '', category: 'support_tip', tags: 'promotion, grading, sensitive, verify', order: 11 },
    { role: 'REGISTRAR', title: 'Publish Page', content: 'The publish page is enough for releasing results; registrar support should focus on student records and report-card verification.', summary: '', category: 'support_tip', tags: 'publish, results, registrar, verification', order: 12 },

    // ===== FINANCE =====
    { role: 'FINANCE', title: 'Dashboard', content: 'Open the finance dashboard and reporting overview.', summary: '', category: 'quick_link', linkUrl: '/finance', tags: 'dashboard, finance, reporting', order: 1 },
    { role: 'FINANCE', title: 'Fee Structures', content: 'Create or review fee structures from the finance dashboard.', summary: '', category: 'quick_link', linkUrl: '/finance', tags: 'fee, structures, finance', order: 2 },
    { role: 'FINANCE', title: 'Payments', content: 'Record payments, review balances, and reverse mistakes when needed.', summary: '', category: 'quick_link', linkUrl: '/finance', tags: 'payments, balances, finance', order: 3 },
    { role: 'FINANCE', title: 'Announcements', content: 'Check school-wide updates that may affect finance work.', summary: '', category: 'quick_link', linkUrl: '/list/announcements', tags: 'announcements, updates, finance', order: 4 },
    { role: 'FINANCE', title: 'Set Up Fees for a Period', content: 'Create the fee structure before generating student fees.\nSteps:\n1. Open Finance and select the active academic year and period.\n2. Create the fee structure for the needed class, term, quarter, or semester.\n3. Generate student fees after class and student records are confirmed.', summary: 'Create the fee structure before generating student fees.', category: 'task', linkUrl: '/finance', tags: 'fees, setup, period, structure', order: 5 },
    { role: 'FINANCE', title: 'Record and Follow Up Payments', content: 'Record payments only against the correct student fee record.\nSteps:\n1. Search the student and open their fee balance.\n2. Record the payment with the correct method and amount.\n3. Use reminders or reports for outstanding balances after payments are saved.', summary: 'Record payments only against the correct student fee record.', category: 'task', linkUrl: '/finance', tags: 'payments, record, follow up, balances', order: 6 },
    { role: 'FINANCE', title: 'Clean Data', content: 'Finance pages depend on clean student and fee structures; verify those before diagnosing report mismatches.', summary: '', category: 'support_tip', tags: 'finance, data, clean, verification', order: 7 },
    { role: 'FINANCE', title: 'Announcements and Calendar', content: 'Announcements and calendar can affect collection windows and school operations, so keep them in view.', summary: '', category: 'support_tip', tags: 'announcements, calendar, collections', order: 8 },
  ];

  async seed() {
    const count = await this.prisma.helpArticle.count();
    if (count > 0) {
      this.logger.log(`Help articles already seeded (${count} existing), skipping.`);
      return count;
    }

    await this.prisma.helpArticle.createMany({
      data: this.articles.map((a) => ({
        role: a.role as any,
        title: a.title,
        content: a.content,
        summary: a.summary,
        category: a.category,
        linkUrl: a.linkUrl,
        tags: a.tags,
        order: a.order,
      })),
    });

    const created = await this.prisma.helpArticle.count();
    this.logger.log(`Seeded ${created} help articles`);
    return created;
  }
}
