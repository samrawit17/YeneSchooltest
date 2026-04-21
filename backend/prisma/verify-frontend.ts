
import { PrismaClient, Role, GradeStatus, ReportCardStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const schoolId = 'school-001';
  const academicYearId = 'cmnvlwfjy000xmf4ampxivrrq';
  const termId = 'cmnvlwfkl000ymf4ax2ksmioq';
  const termName = 'Quarter 1';
  const adminId = (await prisma.user.findFirst({ where: { role: Role.ADMIN } }))?.id || 'admin-id';

  console.log('Re-running targeted workflow test with explicit status checks...');

  // 1. Get subjects
  const subjects = await prisma.subject.findMany({
    where: { schoolId }
  });

  // 2. Get students in Grade 9 - A (as a sample)
  const studentsIn9A = await prisma.studentClass.findMany({
    where: { classId: 'cmnvlwfms0021mf4a9n23cof0', academicYear: '2018' },
    include: { student: { select: { id: true, name: true } } }
  });

  console.log(`Processing ${studentsIn9A.length} students in Grade 9 - A...`);

  for (const sc of studentsIn9A) {
    console.log(`  Seeding grades for: ${sc.student.name} (${sc.student.id})`);
    for (const subject of subjects) {
      const totalScore = 75 + Math.floor(Math.random() * 20); // High scores
      
      await prisma.subjectGrade.upsert({
        where: {
          studentId_subjectId_academicYear_termId: {
            studentId: sc.student.id,
            subjectId: subject.id,
            academicYear: academicYearId,
            termId: termId
          }
        },
        update: {
          totalScore,
          status: GradeStatus.APPROVED,
          gradeLetter: 'B'
        },
        create: {
          schoolId,
          studentId: sc.student.id,
          subjectId: subject.id,
          classId: sc.classId,
          sectionId: sc.sectionId,
          academicYear: academicYearId,
          termId: termId,
          totalScore,
          status: GradeStatus.APPROVED,
          gradeLetter: 'B'
        }
      });
    }

    // Upsert Report Card and ensure it is PUBLISHED
    await prisma.reportCard.upsert({
      where: {
        studentId_academicYear_term: {
          studentId: sc.student.id,
          academicYear: academicYearId,
          term: termName
        }
      },
      update: {
        status: ReportCardStatus.PUBLISHED,
        publishedAt: new Date(),
        percentage: 85
      },
      create: {
        schoolId,
        studentId: sc.student.id,
        classId: sc.classId,
        sectionId: sc.sectionId,
        academicYear: academicYearId,
        term: termName,
        status: ReportCardStatus.PUBLISHED,
        publishedAt: new Date(),
        percentage: 85,
        generatedById: adminId
      }
    });
  }

  console.log('Targeted data update complete. Please check the frontend for students in Grade 9 - A.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
