import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const ts = Date.now();
  const schoolId = process.env.SCHOOL_ID || 'school-001';
  const password = process.env.PASSWORD || 'TempPass123!';
  const hashed = await bcrypt.hash(password, 10);

  const studentEmail = process.env.STUDENT_EMAIL || `student.seed.${ts}@example.com`;
  const parentEmail = process.env.PARENT_EMAIL || `parent.seed.${ts}@example.com`;

  console.log('Seeding one student and one parent:');

  // Create student user
  const studentUser = await prisma.user.create({
    data: {
      email: studentEmail,
      password: hashed,
      name: `Seed Student ${ts}`,
      role: Role.STUDENT,
      schoolId,
    },
  });

  const studentProfile = await prisma.studentProfile.create({
    data: {
      userId: studentUser.id,
      schoolId,
      studentCode: `STU-${ts}`,
      studentId: `STU-${ts}`,
      enrollmentStatus: 'APPROVED',
      academicYear: '2025-2026',
      className: 'Grade 1',
      section: 'A',
      rollNumber: '01',
      gender: 'Other',
    },
  });

  // Create parent user
  const parentUser = await prisma.user.create({
    data: {
      email: parentEmail,
      password: hashed,
      name: `Seed Parent ${ts}`,
      role: Role.PARENT,
      schoolId,
    },
  });

  const parentProfile = await prisma.parentProfile.create({
    data: {
      userId: parentUser.id,
      schoolId,
      phone: '+1-555-0000',
      address: 'Seed Address',
    },
  });

  // Link parent to student
  const parentStudent = await prisma.parentStudent.create({
    data: {
      parentId: parentProfile.id,
      studentId: studentProfile.id,
      schoolId,
      relation: 'GUARDIAN',
      isVerified: true,
      isPrimary: true,
      emergencyContact: true,
    },
  });

  console.log('Seed completed:');
  console.log(`  Student email: ${studentEmail}  password: ${password}`);
  console.log(`  Student user id: ${studentUser.id}  profile id: ${studentProfile.id}`);
  console.log(`  Parent email: ${parentEmail}  password: ${password}`);
  console.log(`  Parent user id: ${parentUser.id}  profile id: ${parentProfile.id}`);
  console.log(`  ParentStudent link id: ${parentStudent.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
