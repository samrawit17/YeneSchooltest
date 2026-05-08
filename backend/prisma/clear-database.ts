/**
 * Script to clear all data from the database EXCEPT:
 * - Seed file users (admins, staff, teacher, student, parent, etc.)
 * - All other data is deleted
 * 
 * Seed users preserved:
 * - superadmin@example.com (SUPER_ADMIN)
 * - admin@springfieldhigh.edu (ADMIN)
 * - registrar@springfieldhigh.edu (REGISTRAR)
 * - teacher@springfieldhigh.edu (TEACHER)
 * - student@springfieldhigh.edu (STUDENT)
 * - parent@springfieldhigh.edu (PARENT)
 * - finance@springfieldhigh.edu (FINANCE)
 *
 * Run with: npx ts-node prisma/clear-database.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// List of seed user emails to preserve
const SEED_USER_EMAILS = [
  'superadmin@example.com',
  'admin@springfieldhigh.edu',
  'registrar@springfieldhigh.edu',
  'teacher@springfieldhigh.edu',
  'student@springfieldhigh.edu',
  'parent@springfieldhigh.edu',
  'finance@springfieldhigh.edu',
];

async function main() {
  console.log('🚀 Starting database cleanup...');
  console.log('⚠️  This will delete ALL data except seed file users and related profiles\n');

  try {
    console.log('🗑️  Deleting all data (except seed users)...');

    // Messages and communications
    await prisma.messageRead.deleteMany();
    console.log('  ✓ MessageRead cleared');
    
    await prisma.message.deleteMany();
    console.log('  ✓ Message cleared');
    
    await prisma.conversationParticipant.deleteMany();
    console.log('  ✓ ConversationParticipant cleared');
    
    await prisma.conversation.deleteMany();
    console.log('  ✓ Conversation cleared');

    // Chat
    await prisma.chatMessage.deleteMany();
    console.log('  ✓ ChatMessage cleared');
    
    await prisma.chatParticipant.deleteMany();
    console.log('  ✓ ChatParticipant cleared');
    
    await prisma.chatRoom.deleteMany();
    console.log('  ✓ ChatRoom cleared');

    // Unified Content model (replaces Lesson, Homework, Assignment)
    await prisma.contentSubmission.deleteMany();
    console.log('  ✓ ContentSubmission cleared');
    
    await prisma.contentAttachment.deleteMany();
    console.log('  ✓ ContentAttachment cleared');
    
    await prisma.contentResource.deleteMany();
    console.log('  ✓ ContentResource cleared');
    
    await prisma.content.deleteMany();
    console.log('  ✓ Content cleared');
    
    await prisma.syllabusMapping.deleteMany();
    console.log('  ✓ SyllabusMapping cleared');

    // Grades
    await prisma.gradeScore.deleteMany();
    console.log('  ✓ GradeScore cleared');
    
    await prisma.gradeChangeLog.deleteMany();
    console.log('  ✓ GradeChangeLog cleared');
    
    await prisma.subjectGrade.deleteMany();
    console.log('  ✓ SubjectGrade cleared');
    
    await prisma.grade.deleteMany();
    console.log('  ✓ Grade cleared');
    
    await prisma.gradingComponent.deleteMany();
    console.log('  ✓ GradingComponent cleared');
    
    await prisma.gradeScale.deleteMany();
    console.log('  ✓ GradeScale cleared');

    await prisma.studentAssessmentScore.deleteMany();
    console.log('  ✓ StudentAssessmentScore cleared');

    await prisma.assessmentSubject.deleteMany();
    console.log('  ✓ AssessmentSubject cleared');

    await prisma.assessmentWeight.deleteMany();
    console.log('  ✓ AssessmentWeight cleared');

    await prisma.assessment.deleteMany();
    console.log('  ✓ Assessment cleared');

    // Exam related
    await prisma.examSeating.deleteMany();
    console.log('  ✓ ExamSeating cleared');
    
    await prisma.examResult.deleteMany();
    console.log('  ✓ ExamResult cleared');
    
    await prisma.exam.deleteMany();
    console.log('  ✓ Exam cleared');

    // Report cards
    await prisma.reportCard.deleteMany();
    console.log('  ✓ ReportCard cleared');

    // Attendance
    await prisma.attendanceRecord.deleteMany();
    console.log('  ✓ AttendanceRecord cleared');
    
    await prisma.attendanceSession.deleteMany();
    console.log('  ✓ AttendanceSession cleared');
    
    await prisma.attendance.deleteMany();
    console.log('  ✓ Attendance cleared');

    // Finance
    await prisma.receipt.deleteMany();
    console.log('  ✓ Receipt cleared');
    
    await prisma.payment.deleteMany();
    console.log('  ✓ Payment cleared');
    
    await prisma.studentFee.deleteMany();
    console.log('  ✓ StudentFee cleared');
    
    await prisma.feeStructure.deleteMany();
    console.log('  ✓ FeeStructure cleared');
    
    await prisma.discountPolicy.deleteMany();
    console.log('  ✓ DiscountPolicy cleared');
    
    await prisma.financeProfile.deleteMany();
    console.log('  ✓ FinanceProfile cleared');

    await prisma.teacherProfile.deleteMany();
    console.log('  ✓ TeacherProfile cleared');
    
    await prisma.department.deleteMany();
    console.log('  ✓ Department cleared');

    // Transport
    // await prisma.transportAssignment.deleteMany();
    // console.log('  ✓ TransportAssignment cleared');
    
    // await prisma.transport.deleteMany();
    // console.log('  ✓ Transport cleared');

    // Documents
    await prisma.document.deleteMany();
    console.log('  ✓ Document cleared');

    // Timetable
    await prisma.timetableSlot.deleteMany();
    console.log('  ✓ TimetableSlot cleared');
    
    await prisma.timetable.deleteMany();
    console.log('  ✓ Timetable cleared');

    // Assignments removed - now using unified Content model

    // Teacher assignments
    await prisma.teacherSubjectAssignment.deleteMany();
    console.log('  ✓ TeacherSubjectAssignment cleared');

    // Class subjects
    await prisma.classSubject.deleteMany();
    console.log('  ✓ ClassSubject cleared');

    // Sections and Classes
    await prisma.section.deleteMany();
    console.log('  ✓ Section cleared');
    
    await prisma.class.deleteMany();
    console.log('  ✓ Class cleared');

    // Subjects
    await prisma.subject.deleteMany();
    console.log('  ✓ Subject cleared');

    // Grade levels
    await prisma.gradeLevel.deleteMany();
    console.log('  ✓ GradeLevel cleared');

    // Academic years
    await prisma.term.deleteMany();
    console.log('  ✓ Term cleared');
    
    await prisma.academicYear.deleteMany();
    console.log('  ✓ AcademicYear cleared');

    // Student/Parent related
    await prisma.parentStudent.deleteMany();
    console.log('  ✓ ParentStudent cleared');
    
    await prisma.parentProfile.deleteMany();
    console.log('  ✓ ParentProfile cleared');
    
    await prisma.studentProfile.deleteMany();
    console.log('  ✓ StudentProfile cleared');
    
    await prisma.studentClass.deleteMany();
    console.log('  ✓ StudentClass cleared');
    
    await prisma.enrollment.deleteMany();
    console.log('  ✓ Enrollment cleared');

    // Communications
    await prisma.communicationReply.deleteMany();
    console.log('  ✓ CommunicationReply cleared');
    
    await prisma.communication.deleteMany();
    console.log('  ✓ Communication cleared');

    // Announcements
    await prisma.announcement.deleteMany();
    console.log('  ✓ Announcement cleared');

    // Notifications
    await prisma.notification.deleteMany();
    console.log('  ✓ Notification cleared');

    // School events
    await prisma.schoolEvent.deleteMany();
    console.log('  ✓ SchoolEvent cleared');

    // Auth related (keep users but clear tokens/logs)
    await prisma.passwordResetToken.deleteMany();
    console.log('  ✓ PasswordResetToken cleared');
    
    await prisma.pendingCredential.deleteMany();
    console.log('  ✓ PendingCredential cleared');
    
    await prisma.credentialGenerationLog.deleteMany();
    console.log('  ✓ CredentialGenerationLog cleared');

    // School settings
    await prisma.schoolSetting.deleteMany();
    console.log('  ✓ SchoolSetting cleared');
    
    await prisma.schoolYearCounter.deleteMany();
    console.log('  ✓ SchoolYearCounter cleared');

    // Platform settings
    await prisma.platformSetting.deleteMany();
    console.log('  ✓ PlatformSetting cleared');

    // RBAC (clear permissions but keep structure)
    await prisma.userPermission.deleteMany();
    console.log('  ✓ UserPermission cleared');
    
    await prisma.rolePermission.deleteMany();
    console.log('  ✓ RolePermission cleared');
    
    await prisma.permission.deleteMany();
    console.log('  ✓ Permission cleared');

    // Schools (last - but keep the records if needed)
    // Note: This will cascade delete many related records
    // Uncomment if you want to delete schools too
    // await prisma.school.deleteMany();
    // console.log('  ✓ School cleared');

    // Delete all non-seed users
    console.log('\n👤 Deleting non-seed users...');
    const deleteResult = await prisma.user.deleteMany({
      where: {
        email: { notIn: SEED_USER_EMAILS },
      },
    });
    console.log(`✓ Deleted ${deleteResult.count} non-seed users`);

    console.log('\n✅ Database cleanup completed!');
    console.log('📊 Seed file users preserved (admins, staff, teacher, student, parent)');
    
    // Show remaining user count
    const userCount = await prisma.user.count();
    console.log(`📋 Total users remaining: ${userCount}`);
    
    // Show users by role
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: true
    });
    console.log('\n📊 Users by role:');
    usersByRole.forEach((group) => {
      console.log(`   ${group.role}: ${group._count}`);
    });

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('\n👋 Database cleanup script finished.');
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
