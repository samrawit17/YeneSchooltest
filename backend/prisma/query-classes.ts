import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Test the exact query used in getStudentsForAttendance
  const classId = 'cmmv57h6e0049yvrc90zsw0qi';
  const schoolId = 'school-001';
  const sectionId = 'cmmv57h6n004byvrc2ocznd6b';

  // Query the class with academicYear include
  const classDataById = await prisma.class.findFirst({
    where: {
      id: classId,
      schoolId: schoolId,
    },
    include: { 
      sections: true,
      academicYear: true 
    },
  });

  console.log('Class data:', JSON.stringify(classDataById, null, 2));
  console.log('academicYear:', classDataById?.academicYear);

  // Query StudentClass without academicYear filter
  const studentClassWhere: any = {
    schoolId: schoolId,
    classId: classDataById?.id,
  };

  if (sectionId) {
    studentClassWhere.sectionId = sectionId;
  }

  console.log('studentClassWhere:', studentClassWhere);

  const studentClasses = await prisma.studentClass.findMany({
    where: studentClassWhere,
    include: {
      student: {
        include: {
          studentProfile: true,
        },
      },
    },
  });

  console.log('StudentClass records found:', studentClasses.length);
  console.log('StudentClass records:', JSON.stringify(studentClasses.slice(0, 2), null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
