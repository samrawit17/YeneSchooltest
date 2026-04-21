import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding schools...');

  // Create schools for student enrollment
  const schools = [
    {
      id: 'school-001',
      name: 'Springfield High School',
      email: 'admin@springfieldhigh.edu',
      phone: '+1-555-0101',
      address: '123 Main Street, Springfield, IL 62701',
      timezone: 'America/Chicago',
      isActive: true,
    },
   
  ];

  for (const school of schools) {
    await prisma.school.upsert({
      where: { id: school.id },
      update: {},
      create: school,
    });
    console.log(`Created school: ${school.name}`);
  }

  console.log('Seeding permissions and role assignments...');

  // Define permissions based on FIXED PERMISSION PHILOSOPHY
  // Format: <resource>:<action>
  const permissions = [
    // School permissions (SuperAdmin only)
    { name: 'school:create', module: 'school', action: 'create', description: 'Create schools' },
    { name: 'school:read', module: 'school', action: 'read', description: 'View schools' },
    { name: 'school:update', module: 'school', action: 'update', description: 'Update schools' },
    { name: 'school:deactivate', module: 'school', action: 'deactivate', description: 'Deactivate schools' },

    // User permissions (Admin only, scoped)
    { name: 'user:create', module: 'user', action: 'create', description: 'Create users' },
    { name: 'user:read', module: 'user', action: 'read', description: 'View users' },
    { name: 'user:update', module: 'user', action: 'update', description: 'Update users' },
    { name: 'user:deactivate', module: 'user', action: 'deactivate', description: 'Deactivate users' },

    // Student & Enrollment permissions
    { name: 'student:create', module: 'student', action: 'create', description: 'Create students' },
    { name: 'student:read', module: 'student', action: 'read', description: 'View students' },
    { name: 'student:update', module: 'student', action: 'update', description: 'Update students' },
    { name: 'student:approve_enrollment', module: 'student', action: 'approve_enrollment', description: 'Approve student enrollment' },

    // Parent permissions
    { name: 'parent:create', module: 'parent', action: 'create', description: 'Create parent accounts' },
    { name: 'parent:read', module: 'parent', action: 'read', description: 'View parent profiles' },
    { name: 'parent:update', module: 'parent', action: 'update', description: 'Update parent profiles' },
    { name: 'parent:link_student', module: 'parent', action: 'link_student', description: 'Link parents to students' },
    { name: 'parent:unlink_student', module: 'parent', action: 'unlink_student', description: 'Unlink parents from students' },

    // Teacher permissions
    { name: 'teacher:create', module: 'teacher', action: 'create', description: 'Create teachers' },
    { name: 'teacher:read', module: 'teacher', action: 'read', description: 'View teachers' },
    { name: 'teacher:update', module: 'teacher', action: 'update', description: 'Update teachers' },

    // Class & Section permissions
    { name: 'class:create', module: 'class', action: 'create', description: 'Create classes' },
    { name: 'class:read', module: 'class', action: 'read', description: 'View classes' },
    { name: 'class:update', module: 'class', action: 'update', description: 'Update classes' },
    { name: 'section:create', module: 'section', action: 'create', description: 'Create sections' },
    { name: 'section:read', module: 'section', action: 'read', description: 'View sections' },
    { name: 'section:update', module: 'section', action: 'update', description: 'Update sections' },
    { name: 'section:delete', module: 'section', action: 'delete', description: 'Delete sections' },

    // Timetable permissions
    { name: 'timetable:create', module: 'timetable', action: 'create', description: 'Create timetables' },
    { name: 'timetable:read', module: 'timetable', action: 'read', description: 'View timetables' },
    { name: 'timetable:update', module: 'timetable', action: 'update', description: 'Update timetables' },

    // Attendance permissions
    { name: 'attendance:take', module: 'attendance', action: 'take', description: 'Take attendance' },
    { name: 'attendance:read', module: 'attendance', action: 'read', description: 'View attendance records' },
    { name: 'attendance:update', module: 'attendance', action: 'update', description: 'Update attendance records' },

    // Exams & Results permissions
    { name: 'exam:create', module: 'exam', action: 'create', description: 'Create exams' },
    { name: 'exam:read', module: 'exam', action: 'read', description: 'View exams' },
    { name: 'result:publish', module: 'result', action: 'publish', description: 'Publish results' },
    { name: 'result:read', module: 'result', action: 'read', description: 'View results' },

    // Fees permissions (legacy/basic)
    { name: 'fee:create', module: 'fee', action: 'create', description: 'Create fees' },
    { name: 'fee:read', module: 'fee', action: 'read', description: 'View fees' },
    { name: 'fee:collect', module: 'fee', action: 'collect', description: 'Collect fees' },

    // Finance module permissions (new)
    { name: 'finance:fee_structure:create', module: 'finance', action: 'fee_structure:create', description: 'Create fee structures' },
    { name: 'finance:fee_structure:read', module: 'finance', action: 'fee_structure:read', description: 'Read fee structures' },
    { name: 'finance:fee_structure:update', module: 'finance', action: 'fee_structure:update', description: 'Update fee structures' },
    { name: 'finance:fee_structure:delete', module: 'finance', action: 'fee_structure:delete', description: 'Delete fee structures' },
    { name: 'finance:student_fees:generate', module: 'finance', action: 'student_fees:generate', description: 'Generate student fees' },
    { name: 'finance:student_fees:read', module: 'finance', action: 'student_fees:read', description: 'Read student fees' },
    { name: 'finance:payments:record', module: 'finance', action: 'payments:record', description: 'Record payments' },
    { name: 'finance:reports:read', module: 'finance', action: 'reports:read', description: 'View finance reports' },

    // Announcements permissions
    { name: 'announcement:create', module: 'announcement', action: 'create', description: 'Create announcements' },
    { name: 'announcement:read', module: 'announcement', action: 'read', description: 'View announcements' },
    // Events permissions
    { name: 'event:create', module: 'event', action: 'create', description: 'Create events' },
    { name: 'event:read', module: 'event', action: 'read', description: 'View events' },

    // Dashboard permissions (view only - content is role-filtered)
    { name: 'dashboard:view', module: 'dashboard', action: 'view', description: 'View dashboard' },

    // HR permissions
    { name: 'employee:create', module: 'employee', action: 'create', description: 'Create employees' },
    { name: 'employee:read', module: 'employee', action: 'read', description: 'View employees' },
    { name: 'employee:update', module: 'employee', action: 'update', description: 'Update employees' },
    { name: 'employee:delete', module: 'employee', action: 'delete', description: 'Delete employees' },
    { name: 'payroll:create', module: 'payroll', action: 'create', description: 'Create payroll' },
    { name: 'payroll:read', module: 'payroll', action: 'read', description: 'View payroll' },
    { name: 'payroll:process', module: 'payroll', action: 'process', description: 'Process payroll' },
    { name: 'payroll:update', module: 'payroll', action: 'update', description: 'Update payroll' },
    { name: 'salary:create', module: 'salary', action: 'create', description: 'Create salary structure' },
    { name: 'salary:read', module: 'salary', action: 'read', description: 'View salary structure' },
    { name: 'salary:update', module: 'salary', action: 'update', description: 'Update salary structure' },
    { name: 'salary:delete', module: 'salary', action: 'delete', description: 'Delete salary structure' },
    { name: 'attendance:create', module: 'attendance', action: 'create', description: 'Record attendance' },
    { name: 'attendance:read', module: 'attendance', action: 'read', description: 'View attendance' },
    { name: 'hr:read', module: 'hr', action: 'read', description: 'View HR dashboard' },
  ];

  // Create permissions
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: permission,
    });
  }

  // Define role permissions based on FIXED PERMISSION PHILOSOPHY
  const rolePermissions = [
    // SUPER_ADMIN (VERY LIMITED) - Only school and user management
    { role: Role.SUPER_ADMIN, permissionName: 'school:create' },
    { role: Role.SUPER_ADMIN, permissionName: 'school:read' },
    { role: Role.SUPER_ADMIN, permissionName: 'school:update' },
    { role: Role.SUPER_ADMIN, permissionName: 'school:deactivate' },
    { role: Role.SUPER_ADMIN, permissionName: 'user:read' },
    { role: Role.SUPER_ADMIN, permissionName: 'dashboard:view' },

    // ADMIN (FULL SCHOOL CONTROL)
    // User management
    { role: Role.ADMIN, permissionName: 'user:create' },
    { role: Role.ADMIN, permissionName: 'user:read' },
    { role: Role.ADMIN, permissionName: 'user:update' },
    { role: Role.ADMIN, permissionName: 'user:deactivate' },
    // Student management
    { role: Role.ADMIN, permissionName: 'student:create' },
    { role: Role.ADMIN, permissionName: 'student:read' },
    { role: Role.ADMIN, permissionName: 'student:update' },
    { role: Role.ADMIN, permissionName: 'student:approve_enrollment' },
    // Parent management
    { role: Role.ADMIN, permissionName: 'parent:create' },
    { role: Role.ADMIN, permissionName: 'parent:read' },
    { role: Role.ADMIN, permissionName: 'parent:update' },
    { role: Role.ADMIN, permissionName: 'parent:link_student' },
    { role: Role.ADMIN, permissionName: 'parent:unlink_student' },
    // Teacher management
    { role: Role.ADMIN, permissionName: 'teacher:create' },
    { role: Role.ADMIN, permissionName: 'teacher:read' },
    { role: Role.ADMIN, permissionName: 'teacher:update' },
    // Class & Section
    { role: Role.ADMIN, permissionName: 'class:create' },
    { role: Role.ADMIN, permissionName: 'class:read' },
    { role: Role.ADMIN, permissionName: 'class:update' },
    { role: Role.ADMIN, permissionName: 'section:create' },
    { role: Role.ADMIN, permissionName: 'section:read' },
    { role: Role.ADMIN, permissionName: 'section:update' },
    { role: Role.ADMIN, permissionName: 'section:delete' },
    // Timetable
    { role: Role.ADMIN, permissionName: 'timetable:create' },
    { role: Role.ADMIN, permissionName: 'timetable:read' },
    { role: Role.ADMIN, permissionName: 'timetable:update' },
    // Announcements
    { role: Role.ADMIN, permissionName: 'announcement:create' },
    { role: Role.ADMIN, permissionName: 'announcement:read' },
    // Events
    { role: Role.ADMIN, permissionName: 'event:create' },
    { role: Role.ADMIN, permissionName: 'event:read' },
    // Attendance (Admin can view reports and override records, but cannot take attendance)
    { role: Role.ADMIN, permissionName: 'attendance:read' },
    { role: Role.ADMIN, permissionName: 'attendance:update' },
    // Dashboard
    { role: Role.ADMIN, permissionName: 'dashboard:view' },

    // REGISTRAR
    { role: Role.REGISTRAR, permissionName: 'student:create' },
    { role: Role.REGISTRAR, permissionName: 'student:read' },
    { role: Role.REGISTRAR, permissionName: 'student:update' },
    { role: Role.REGISTRAR, permissionName: 'student:approve_enrollment' },
    { role: Role.REGISTRAR, permissionName: 'class:read' },
    { role: Role.REGISTRAR, permissionName: 'section:read' },
    { role: Role.REGISTRAR, permissionName: 'timetable:read' },
    { role: Role.REGISTRAR, permissionName: 'dashboard:view' },
    { role: Role.REGISTRAR, permissionName: 'announcement:read' },
    { role: Role.REGISTRAR, permissionName: 'announcement:create' },
    // Events
    { role: Role.REGISTRAR, permissionName: 'event:read' },

    // TEACHER
    { role: Role.TEACHER, permissionName: 'attendance:take' },
    { role: Role.TEACHER, permissionName: 'attendance:read' },
    { role: Role.TEACHER, permissionName: 'teacher:read' },
    { role: Role.TEACHER, permissionName: 'exam:read' },
    { role: Role.TEACHER, permissionName: 'result:publish' },
    { role: Role.TEACHER, permissionName: 'timetable:read' },
    { role: Role.TEACHER, permissionName: 'announcement:read' },
    { role: Role.TEACHER, permissionName: 'dashboard:view' },
    // Events
    { role: Role.TEACHER, permissionName: 'event:read' },

    // STUDENT
    { role: Role.STUDENT, permissionName: 'attendance:read' },
    { role: Role.STUDENT, permissionName: 'result:read' },
    { role: Role.STUDENT, permissionName: 'fee:read' },
    { role: Role.STUDENT, permissionName: 'timetable:read' },
    { role: Role.STUDENT, permissionName: 'announcement:read' },
    { role: Role.STUDENT, permissionName: 'dashboard:view' },
    // Events
    { role: Role.STUDENT, permissionName: 'event:read' },

    // PARENT
    { role: Role.PARENT, permissionName: 'attendance:read' },
    { role: Role.PARENT, permissionName: 'result:read' },
    { role: Role.PARENT, permissionName: 'fee:read' },
    { role: Role.PARENT, permissionName: 'announcement:read' },
    { role: Role.PARENT, permissionName: 'dashboard:view' },
    // Events
    { role: Role.PARENT, permissionName: 'event:read' },

    // FINANCE (legacy)
    { role: Role.FINANCE, permissionName: 'fee:create' },
    { role: Role.FINANCE, permissionName: 'fee:read' },
    { role: Role.FINANCE, permissionName: 'fee:collect' },
    { role: Role.FINANCE, permissionName: 'dashboard:view' },

    // ADMIN (finance module)
    { role: Role.ADMIN, permissionName: 'finance:fee_structure:create' },
    { role: Role.ADMIN, permissionName: 'finance:fee_structure:read' },
    { role: Role.ADMIN, permissionName: 'finance:fee_structure:update' },
    { role: Role.ADMIN, permissionName: 'finance:fee_structure:delete' },
    { role: Role.ADMIN, permissionName: 'finance:student_fees:generate' },
    { role: Role.ADMIN, permissionName: 'finance:student_fees:read' },
    { role: Role.ADMIN, permissionName: 'finance:payments:record' },
    { role: Role.ADMIN, permissionName: 'finance:reports:read' },

    // FINANCE (finance module)
    { role: Role.FINANCE, permissionName: 'finance:fee_structure:create' },
    { role: Role.FINANCE, permissionName: 'finance:fee_structure:read' },
    { role: Role.FINANCE, permissionName: 'finance:fee_structure:update' },
    { role: Role.FINANCE, permissionName: 'finance:fee_structure:delete' },
    { role: Role.FINANCE, permissionName: 'finance:student_fees:generate' },
    { role: Role.FINANCE, permissionName: 'finance:student_fees:read' },
    { role: Role.FINANCE, permissionName: 'finance:payments:record' },
    { role: Role.FINANCE, permissionName: 'finance:reports:read' },
    
    // HR
    { role: Role.HR, permissionName: 'employee:create' },
    { role: Role.HR, permissionName: 'employee:read' },
    { role: Role.HR, permissionName: 'employee:update' },
    { role: Role.HR, permissionName: 'employee:delete' },
    { role: Role.HR, permissionName: 'payroll:create' },
    { role: Role.HR, permissionName: 'payroll:read' },
    { role: Role.HR, permissionName: 'payroll:process' },
    { role: Role.HR, permissionName: 'payroll:update' },
    { role: Role.HR, permissionName: 'salary:create' },
    { role: Role.HR, permissionName: 'salary:read' },
    { role: Role.HR, permissionName: 'salary:update' },
    { role: Role.HR, permissionName: 'salary:delete' },
    { role: Role.HR, permissionName: 'hr:read' },
    { role: Role.HR, permissionName: 'dashboard:view' },
  ];

  // Create role permissions
  for (const rp of rolePermissions) {
    const permission = await prisma.permission.findUnique({
      where: { name: rp.permissionName },
    });
    if (permission) {
      // First try to delete any existing record, then create new
      await prisma.rolePermission.deleteMany({
        where: { role: rp.role, permissionId: permission.id },
      });
      await prisma.rolePermission.create({
        data: { role: rp.role, permissionId: permission.id },
      });
    }
  }

  // Create a default SUPER_ADMIN user for testing
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'superadmin@example.com' },
    update: {
      username: 'superadmin',
    },
    create: {
      email: 'superadmin@example.com',
      username: 'superadmin',
      password: hashedPassword,
      name: 'Super Admin',
      role: Role.SUPER_ADMIN,
    },
  });

  // Create test users linked to school-001
  
  // 1. Admin user
  await prisma.user.upsert({
    where: { email: 'admin@springfieldhigh.edu' },
    update: {},
    create: {
      email: 'admin@springfieldhigh.edu',
      username: 'admin001',
      password: hashedPassword,
      name: 'School Admin',
      role: Role.ADMIN,
      schoolId: 'school-001',
    },
  });

  // 1b. HR user
  const hrUser = await prisma.user.upsert({
    where: { email: 'hr@springfieldhigh.edu' },
    update: {},
    create: {
      email: 'hr@springfieldhigh.edu',
      username: 'hr001',
      password: hashedPassword,
      name: 'HR Manager',
      role: Role.HR,
      schoolId: 'school-001',
    },
  });

  // Create HR profile
  await prisma.hrProfile.upsert({
    where: { userId: hrUser.id },
    update: {},
    create: {
      userId: hrUser.id,
      schoolId: 'school-001',
      employeeId: 'EMP-HR-001',
      designation: 'HR Manager',
      joiningDate: new Date(),
    },
  });

  // 2. Teacher user
  await prisma.user.upsert({
    where: { email: 'teacher@springfieldhigh.edu' },
    update: {},
    create: {
      email: 'teacher@springfieldhigh.edu',
      username: 'teacher001',
      password: hashedPassword,
      name: 'John Teacher',
      role: Role.TEACHER,
      schoolId: 'school-001',
    },
  });

  // 3. Student user
  const studentUser = await prisma.user.upsert({
    where: { email: 'student@springfieldhigh.edu' },
    update: {},
    create: {
      email: 'student@springfieldhigh.edu',
      username: 'student001',
      password: hashedPassword,
      name: 'Jane Student',
      role: Role.STUDENT,
      schoolId: 'school-001',
    },
  });

  // Create student profile
  const studentProfile = await prisma.studentProfile.upsert({
    where: { id: 'student-profile-001' },
    update: {},
    create: {
      id: 'student-profile-001',
      userId: studentUser.id,
      schoolId: 'school-001',
      studentCode: 'STU-2024-001',
      studentId: 'STU-2024-001',
      enrollmentStatus: 'APPROVED',
      academicYear: '2024-2025',
      className: 'Grade 10',
      section: 'A',
      rollNumber: '01',
      gender: 'Female',
    },
  });

  // 4. Parent user
  const parentUser = await prisma.user.upsert({
    where: { email: 'parent@springfieldhigh.edu' },
    update: {},
    create: {
      email: 'parent@springfieldhigh.edu',
      username: 'parent001',
      password: hashedPassword,
      name: 'John Parent',
      role: Role.PARENT,
      schoolId: 'school-001',
    },
  });

  // Create parent profile
  const parentProfile = await prisma.parentProfile.upsert({
    where: { userId: parentUser.id },
    update: {},
    create: {
      userId: parentUser.id,
      schoolId: 'school-001',
      phone: '+1-555-0199',
      address: '123 Parent Street, Springfield, IL',
    },
  });

  // Link parent to student
  await prisma.parentStudent.upsert({
    where: {
      parentId_studentId: {
        parentId: parentProfile.id,
        studentId: studentProfile.id,
      },
    },
    update: {},
    create: {
      parentId: parentProfile.id,
      studentId: studentProfile.id,
      schoolId: 'school-001',
      relation: 'FATHER',
      isVerified: true,
      isPrimary: true,
      emergencyContact: true,
    },
  });

  // 5. Registrar user
  await prisma.user.upsert({
    where: { email: 'registrar@springfieldhigh.edu' },
    update: {},
    create: {
      email: 'registrar@springfieldhigh.edu',
      username: 'registrar001',
      password: hashedPassword,
      name: 'Sarah Registrar',
      role: Role.REGISTRAR,
      schoolId: 'school-001',
      phone: '+1-555-0198',
    },
  });

  console.log('Created test users:');
  console.log('  - superadmin@example.com / admin123 (Super Admin)');
  console.log('  - admin@springfieldhigh.edu / admin123 (School Admin)');
  console.log('  - hr@springfieldhigh.edu / admin123 (HR Manager)');
  console.log('  - registrar@springfieldhigh.edu / admin123 (Registrar)');
  console.log('  - teacher@springfieldhigh.edu / admin123 (Teacher)');
  console.log('  - student@springfieldhigh.edu / admin123 (Student)');
  console.log('  - parent@springfieldhigh.edu / admin123 (Parent - linked to Jane Student)');
  console.log('  - finance@springfieldhigh.edu / admin123 (Finance Manager)');

  // ==================== ADDITIONAL SEED DATA ====================
  console.log('Seeding additional data...');

  // Query for existing academic year (admin creates these)
  const academicYear = await prisma.academicYear.findFirst({
    where: { schoolId: 'school-001', isActive: true },
  });

  if (!academicYear) {
    console.log('No active academic year found for school-001. Skipping class, timetable, and finance seeding.');
  } else {
    console.log(`Using existing academic year: ${academicYear.name}`);
  }

  if (academicYear) {
    // Only create classes if academic year exists
    const classes = [
      { id: 'class-9-a', name: 'Grade 9', grade: 9, section: 'A' },
      { id: 'class-9-b', name: 'Grade 9', grade: 9, section: 'B' },
      { id: 'class-10-a', name: 'Grade 10', grade: 10, section: 'A' },
      { id: 'class-10-b', name: 'Grade 10', grade: 10, section: 'B' },
      { id: 'class-11-a', name: 'Grade 11', grade: 11, section: 'A' },
    ];

    for (const cls of classes) {
      await prisma.class.upsert({
        where: { id: cls.id },
        update: {},
        create: {
          id: cls.id,
          name: cls.name,
          grade: cls.grade,
          section: cls.section,
          academicYearId: academicYear.id,
          schoolId: 'school-001',
        },
      });
    }
    console.log('Created classes: Grade 9 (A,B), Grade 10 (A,B), Grade 11 (A)');

    // 3. Create Sections (linked to classes)
    const sections = [
      { id: 'section-a', name: 'A', classId: 'class-9-a' },
      { id: 'section-b', name: 'B', classId: 'class-9-b' },
      { id: 'section-a-10', name: 'A', classId: 'class-10-a' },
      { id: 'section-b-10', name: 'B', classId: 'class-10-b' },
      { id: 'section-a-11', name: 'A', classId: 'class-11-a' },
    ];

    for (const section of sections) {
      await prisma.section.upsert({
        where: { id: section.id },
        update: {},
        create: {
          id: section.id,
          name: section.name,
          classId: section.classId,
          capacity: 30,
        },
      });
    }
    console.log('Created sections: A, B for each class');
  }

  // 4. Create 5 Subjects - use unique IDs to avoid conflicts
  const subjects = [
    { id: 'subj-math-new', name: 'Mathematics', code: 'MATH' },
    { id: 'subj-english-new', name: 'English', code: 'ENG' },
    { id: 'subj-physics-new', name: 'Physics', code: 'PHY' },
    { id: 'subj-chemistry-new', name: 'Chemistry', code: 'CHEM' },
    { id: 'subj-biology-new', name: 'Biology', code: 'BIO' },
  ];

  for (const subject of subjects) {
    try {
      await prisma.subject.create({
        data: {
          id: subject.id,
          name: subject.name,
          code: subject.code,
          schoolId: 'school-001',
          isActive: true,
        },
      });
    } catch (e) {
      // Subject may already exist, skip
    }
  }
  console.log('Created subjects: Mathematics, English, Physics, Chemistry, Biology');

  // 5. Create teacher profile for existing teacher (only 1 teacher)
  const existingTeacher = await prisma.user.findUnique({ where: { email: 'teacher@springfieldhigh.edu' } });
  if (existingTeacher) {
    await prisma.teacherProfile.upsert({
      where: { userId: existingTeacher.id },
      update: {},
      create: {
        userId: existingTeacher.id,
        schoolId: 'school-001',
        employeeId: 'TEA-001',
        designation: 'Teacher',
        hireDate: new Date(),
      },
    });
  }
  console.log('Created teacher profile for existing teacher');

  // 6. Create Finance role user
  const financeUser = await prisma.user.upsert({
    where: { email: 'finance@springfieldhigh.edu' },
    update: {},
    create: {
      email: 'finance@springfieldhigh.edu',
      username: 'finance001',
      password: hashedPassword,
      name: 'Finance Manager',
      role: Role.FINANCE,
      schoolId: 'school-001',
      phone: '+1-555-0197',
    },
  });
  console.log('Created finance user');

  // 7. Update existing student profile (only 1 student kept)
  const existingStudent = await prisma.user.findUnique({ where: { email: 'student@springfieldhigh.edu' } });

  if (existingStudent) {
    await prisma.studentProfile.upsert({
      where: { id: 'student-profile-001' },
      update: {},
      create: {
        id: 'student-profile-001',
        userId: existingStudent.id,
        schoolId: 'school-001',
        studentId: 'STU-001',
        studentCode: 'STU-001',
        gender: 'FEMALE',
        enrollmentStatus: 'APPROVED',
        academicYear: '2025-2026',
        className: 'Grade 10',
        section: 'A',
        rollNumber: '1',
      },
    });
  }
  console.log('Updated existing student profile');

  // Only create timetable and finance data if academic year exists
  if (academicYear) {
    // 8. Create Timetable Slots for the single Teacher
    const timetableSlots = [
      // Teacher (Biology - Grade 11)
      { teacherEmail: 'teacher@springfieldhigh.edu', classId: 'class-11-a', sectionId: 'section-a-11', subjectId: 'subj-biology-new', dayOfWeek: 1, startTime: '13:00', endTime: '14:00' },
      { teacherEmail: 'teacher@springfieldhigh.edu', classId: 'class-11-a', sectionId: 'section-a-11', subjectId: 'subj-biology-new', dayOfWeek: 2, startTime: '13:00', endTime: '14:00' },
    ];

    for (const slot of timetableSlots) {
      try {
        const teacher = await prisma.user.findUnique({ where: { email: slot.teacherEmail } });
        if (teacher) {
          await prisma.timetableSlot.upsert({
            where: { id: `slot-${slot.teacherEmail}-${slot.dayOfWeek}-${slot.startTime}` },
            update: {},
            create: {
              id: `slot-${slot.teacherEmail}-${slot.dayOfWeek}-${slot.startTime}`,
              classId: slot.classId,
              sectionId: slot.sectionId,
              subjectId: slot.subjectId,
              teacherId: teacher.id,
              dayOfWeek: slot.dayOfWeek,
              startTime: slot.startTime,
              endTime: slot.endTime,
              academicYearId: academicYear.id,
              schoolId: 'school-001',
            },
          });
        }
      } catch (e) {
        // Skip if there's an error
      }
    }
    console.log('Created timetable slots for teachers');

    // 9. Seed minimal finance data: active fee structures and student fees
    console.log('Seeding finance data...');
    // Create fee structures for Grade 10, AY 2025-2026
    const tuition = await prisma.feeStructure.upsert({
      where: { id: 'fs-2025-g10-tuition' },
      update: {},
      create: {
        id: 'fs-2025-g10-tuition',
        schoolId: 'school-001',
        academicYearId: academicYear.id,
        grade: 10,
        feeType: 'TUITION',
        amount: 6000,
        semester: 1,
        description: 'Semester 1 Tuition - Grade 10',
        isActive: true,
      },
    });
    const library = await prisma.feeStructure.upsert({
      where: { id: 'fs-2025-g10-library' },
      update: {},
      create: {
        id: 'fs-2025-g10-library',
        schoolId: 'school-001',
        academicYearId: academicYear.id,
        grade: 10,
        feeType: 'LIBRARY',
        amount: 500,
        semester: 1,
        description: 'Library Fee - Semester 1',
        isActive: true,
      },
    });
    const exam = await prisma.feeStructure.upsert({
      where: { id: 'fs-2025-g10-exam' },
      update: {},
      create: {
        id: 'fs-2025-g10-exam',
        schoolId: 'school-001',
        academicYearId: academicYear.id,
        grade: 10,
        feeType: 'EXAM',
        amount: 300,
        semester: 1,
        description: 'Exam Fee - Semester 1',
        isActive: true,
      },
    });

    // Generate StudentFee records for the single student
    // Enroll the single student in a class
    const studentForFees = await prisma.user.findUnique({ where: { email: 'student@springfieldhigh.edu' } });
    
    if (studentForFees) {
      // Check if already enrolled
      const existingEnrollment = await prisma.studentClass.findFirst({
        where: { studentId: studentForFees.id, academicYear: academicYear.name },
      });
      
      if (!existingEnrollment) {
        await prisma.studentClass.create({
          data: {
            studentId: studentForFees.id,
            classId: 'class-10-a',
            sectionId: 'section-a-10',
            academicYear: academicYear.name,
            schoolId: 'school-001',
          },
        });
      }
      console.log('Enrolled student in class');
      
      // Create student fees for the single student
      for (const fs of [tuition, library, exam]) {
        const exists = await prisma.studentFee.findFirst({
          where: { studentId: studentForFees.id, feeStructureId: fs.id, academicYearId: academicYear.id },
        });
        if (!exists) {
          await prisma.studentFee.create({
            data: {
              schoolId: 'school-001',
              studentId: studentForFees.id,
              feeStructureId: fs.id,
              academicYearId: academicYear.id,
              totalAmount: fs.amount,
              discount: 0,
              finalAmount: fs.amount,
              status: 'PENDING',
            },
          });
        }
      }
      console.log('Seeded finance: fee structures and student fees for single student');
    }
  }

  console.log('Additional seeding completed!');

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
