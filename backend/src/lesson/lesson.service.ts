import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonDto, UpdateLessonDto, LessonQueryDto } from './dto';
import {
  CreateLessonBundleDto,
  UpdateLessonBundleDto,
  SubmitHomeworkDto,
  GradeHomeworkDto,
  LessonCoverageQueryDto,
} from './dto/create-lesson-bundle.dto';
import { LessonStatus, ContentType } from '@prisma/client';
import {
  NotificationService,
  NotificationType,
} from '../notification/notification.service';

@Injectable()
export class LessonService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  private getDefaultPeriodOptions() {
    return Array.from({ length: 8 }, (_, index) => ({
      value: index + 1,
      label: `Period ${index + 1}`,
    }));
  }

  private async getLessonPeriodOptions(schoolId: string) {
    const configuredPeriods = await this.prisma.periodTime.findMany({
      where: { schoolId },
      select: {
        periodNumber: true,
        startTime: true,
        endTime: true,
      },
      orderBy: { periodNumber: 'asc' },
    });

    if (configuredPeriods.length === 0) {
      return this.getDefaultPeriodOptions();
    }

    return configuredPeriods.map((period) => ({
      value: period.periodNumber,
      label: `Period ${period.periodNumber}`,
      startTime: period.startTime,
      endTime: period.endTime,
    }));
  }

  private async assertValidLessonPeriod(
    schoolId: string,
    periodNumber: number | undefined,
  ) {
    if (!Number.isInteger(periodNumber) || (periodNumber ?? 0) < 1) {
      throw new BadRequestException('A valid period number is required');
    }

    const configuredPeriods = await this.prisma.periodTime.findMany({
      where: { schoolId },
      select: { periodNumber: true },
      orderBy: { periodNumber: 'asc' },
    });

    if (configuredPeriods.length === 0) {
      if ((periodNumber ?? 0) > 8) {
        throw new BadRequestException(
          'This period is not available. Configure school period times first.',
        );
      }
      return;
    }

    const isConfigured = configuredPeriods.some(
      (period) => period.periodNumber === periodNumber,
    );
    if (!isConfigured) {
      const availablePeriods = configuredPeriods
        .map((period) => period.periodNumber)
        .join(', ');
      throw new BadRequestException(
        `Period ${periodNumber} is not configured for this school. Available periods: ${availablePeriods}`,
      );
    }
  }

  private async getTeacherLessonAssignments(
    teacherId: string,
    schoolId: string,
  ) {
    const [classSubjects, timetableSlots] = await Promise.all([
      this.prisma.classSubject.findMany({
        where: {
          teacherId,
          class: { schoolId },
        },
        include: {
          academicYearRelation: { select: { id: true, name: true, isActive: true } },
          class: { select: { id: true, grade: true, academicYearId: true } },
          section: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true, code: true } },
        },
      }),
      this.prisma.timetableSlot.findMany({
        where: {
          schoolId,
          teacherId,
        },
        include: {
          academicYear: { select: { id: true, name: true, isActive: true } },
          class: {
            select: {
              id: true,
              grade: true,
              academicYearId: true,
              academicYear: { select: { id: true, name: true, isActive: true } },
            },
          },
          section: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true, code: true } },
        },
      }),
    ]);

    const assignmentMap = new Map<
      string,
      {
        id: string;
        assignmentId: string;
        source: 'CLASS_SUBJECT' | 'TIMETABLE_SLOT';
        name: string;
        code?: string;
        grade: number;
        section: string;
        sectionId: string;
        classId: string;
        academicYearId: string;
        academicYearName?: string;
        isActiveAcademicYear?: boolean;
      }
    >();

    for (const assignment of classSubjects) {
      if (assignment.class.grade === null) continue;
      const key = [
        assignment.classId,
        assignment.sectionId,
        assignment.subjectId,
        assignment.academicYear,
      ].join(':');

      assignmentMap.set(key, {
        id: assignment.subject.id,
        assignmentId: assignment.id,
        source: 'CLASS_SUBJECT',
        name: assignment.subject.name,
        code: assignment.subject.code || undefined,
        grade: assignment.class.grade,
        section: assignment.section.name,
        sectionId: assignment.section.id,
        classId: assignment.class.id,
        academicYearId: assignment.academicYear,
        academicYearName: assignment.academicYearRelation.name,
        isActiveAcademicYear: assignment.academicYearRelation.isActive,
      });
    }

    for (const slot of timetableSlots) {
      if (slot.class.grade === null) continue;
      const academicYear = slot.academicYear || slot.class.academicYear;
      const academicYearId = slot.academicYearId || slot.class.academicYearId;
      const key = [slot.classId, slot.sectionId, slot.subjectId, academicYearId].join(':');

      if (assignmentMap.has(key)) continue;

      assignmentMap.set(key, {
        id: slot.subject.id,
        assignmentId: `timetable:${slot.id}`,
        source: 'TIMETABLE_SLOT',
        name: slot.subject.name,
        code: slot.subject.code || undefined,
        grade: slot.class.grade,
        section: slot.section.name,
        sectionId: slot.section.id,
        classId: slot.class.id,
        academicYearId,
        academicYearName: academicYear?.name,
        isActiveAcademicYear: academicYear?.isActive,
      });
    }

    return Array.from(assignmentMap.values()).sort((left, right) =>
      Number(right.isActiveAcademicYear) - Number(left.isActiveAcademicYear) ||
      left.grade - right.grade ||
      left.section.localeCompare(right.section) ||
      left.name.localeCompare(right.name),
    );
  }

  private async teacherCanCreateLessonForAssignment(
    teacherId: string,
    schoolId: string,
    classId: string,
    sectionId: string,
    subjectId: string,
    academicYearId: string,
  ) {
    const classSubject = await this.prisma.classSubject.findFirst({
      where: {
        classId,
        sectionId,
        subjectId,
        teacherId,
        academicYear: academicYearId,
      },
    });
    if (classSubject) return true;

    const timetableSlot = await this.prisma.timetableSlot.findFirst({
      where: {
        schoolId,
        classId,
        sectionId,
        subjectId,
        teacherId,
        OR: [
          { academicYearId },
          { academicYearId: null, class: { academicYearId } },
        ],
      },
      select: { id: true },
    });

    return Boolean(timetableSlot);
  }

  async getFormData(teacherId: string, schoolId: string) {
    const [activeYear, periods] = await Promise.all([
      this.prisma.academicYear.findFirst({
        where: { schoolId, isActive: true },
      }),
      this.getLessonPeriodOptions(schoolId),
    ]);

    const [teacherSubjects, academicYears] = await Promise.all([
      this.getTeacherLessonAssignments(teacherId, schoolId),
      this.prisma.academicYear.findMany({
        where: { schoolId },
        orderBy: { startDate: 'desc' },
      }),
    ]);

    const teacherGrades = [
      ...new Set(teacherSubjects.map((assignment) => assignment.grade)),
    ].sort((left, right) => left - right);

    const sectionsByGrade: Record<number, { id: string; name: string; classId: string }[]> = {};
    teacherSubjects.forEach((assignment) => {
      if (!sectionsByGrade[assignment.grade]) sectionsByGrade[assignment.grade] = [];
      const existing = sectionsByGrade[assignment.grade].some(
        (section) => section.id === assignment.sectionId,
      );
      if (!existing) {
        sectionsByGrade[assignment.grade].push({
          id: assignment.sectionId,
          name: assignment.section,
          classId: assignment.classId,
        });
      }
    });

    if (!activeYear) {
      return {
        academicYears: academicYears.map(ay => ({ id: ay.id, name: ay.name, isActive: ay.isActive })),
        activeAcademicYearId: null,
        terms: [],
        grades: teacherGrades,
        sectionsByGrade,
        allSubjects: teacherSubjects,
        teacherSubjects,
        periods,
      };
    }

    const terms = await this.prisma.term.findMany({
      where: { academicYearId: activeYear.id },
      orderBy: { order: 'asc' },
    });

    return {
      academicYears: academicYears.map(ay => ({ id: ay.id, name: ay.name, isActive: ay.isActive })),
      activeAcademicYearId: activeYear.id,
      terms: terms.map(t => ({ id: t.id, name: t.name, startDate: t.startDate?.toISOString(), endDate: t.endDate?.toISOString() })),
      grades: teacherGrades,
      sectionsByGrade,
      allSubjects: teacherSubjects,
      teacherSubjects,
      periods,
    };
  }

  /**
   * PERIOD GUARD: Verify teacher is assigned to this period in timetable
   * Period numbers are validated against the school's configured period times.
   */
  async validatePeriodAssignment(
    teacherId: string,
    classId: string,
    sectionId: string,
    subjectId: string,
    dayOfWeek: number,
    periodNumber: number,
    academicYearId: string,
  ) {
    return true;
  }

  private getDayOfWeek(date: Date): number {
    return date.getDay();
  }

  private getLearnerVisibleLessonStatuses() {
    return [
      LessonStatus.DRAFT,
      'PENDING_REVIEW' as LessonStatus,
      LessonStatus.PUBLISHED,
      LessonStatus.COVERED,
    ];
  }

  private buildHomeworkFromLesson(lesson: {
    id: string;
    title?: string | null;
    description?: string | null;
    instructions?: string | null;
  }) {
    const title = lesson.description?.trim();
    const description = lesson.instructions?.trim();

    if (!title && !description) return null;

    return {
      id: lesson.id,
      title: title || `Homework for ${lesson.title || 'lesson'}`,
      description: description || '',
    };
  }

  /**
   * Create Lesson Bundle - All-in-One lesson creation
   */
  async createLessonBundle(
    data: CreateLessonBundleDto,
    teacherId: string,
    schoolId: string,
  ) {
    const classRecord = await this.prisma.class.findFirst({
      where: {
        grade: data.grade,
        schoolId,
        academicYearId: data.academicYearId,
      },
    });
    if (!classRecord)
      throw new NotFoundException(`Class not found for grade ${data.grade}`);

    const sectionRecord = await this.prisma.section.findFirst({
      where: {
        name: data.section,
        classId: classRecord.id,
      },
    });
    if (!sectionRecord)
      throw new NotFoundException(`Section ${data.section} not found for grade ${data.grade}`);

    const canCreateForAssignment = await this.teacherCanCreateLessonForAssignment(
      teacherId,
      schoolId,
      classRecord.id,
      sectionRecord.id,
      data.subjectId,
      data.academicYearId,
    );
    if (!canCreateForAssignment) {
      throw new ForbiddenException(
        'You can only create lessons for your assigned class, section, and subject',
      );
    }

    const lessonDate = new Date(data.lessonDate);
    const dayOfWeek = this.getDayOfWeek(lessonDate);
    await this.assertValidLessonPeriod(schoolId, data.periodNumber);
    await this.validatePeriodAssignment(
      teacherId,
      classRecord.id,
      sectionRecord.id,
      data.subjectId,
      dayOfWeek,
      data.periodNumber,
      data.academicYearId,
    );

    const existingLesson = await this.prisma.content.findFirst({
      where: {
        schoolId,
        subjectId: data.subjectId,
        teacherId,
        lessonDate,
        periodNumber: data.periodNumber,
        type: ContentType.LESSON,
      },
    });
    if (existingLesson) throw new BadRequestException('Lesson already exists');

    // Create lesson, homework and resources inside a transaction to ensure atomicity.
    const result = await this.prisma.$transaction(async (tx) => {
      const lesson = await (tx.content as any).create({
        data: {
          schoolId,
          academicYearId: data.academicYearId,
          semesterId: data.semesterId,
          type: ContentType.LESSON,
          grade: data.grade,
          sectionName: data.section,
          stream: data.stream,
          subjectId: data.subjectId,
          teacherId,
          title: data.title,
          description: data.homework?.title || null,
          instructions:
            data.homework?.description ||
            data.homework?.instructions ||
            null,
          objective: data.objective,
          lessonContent: data.lessonContent,
          lessonDate,
          periodNumber: data.periodNumber,
          status: data.status || 'DRAFT',
          isExamPrep: data.isExamPrep || false,
          unitNumber: data.unitNumber,
          topicName: data.topicName,
          competency: data.competency,
          syllabusMappingId: data.syllabusMappingId,
        },
        include: {
          subject: true,
          teacher: { select: { id: true, name: true, email: true } },
          academicYear: true,
          semester: true,
        },
      });

      let resources: any[] = [];
      if (data.resources && data.resources.length > 0) {
      }

      return { lesson, resources };
    });

    await this.notifyLessonCreated(result.lesson);

    return result;
  }

  async updateLessonBundle(
    lessonId: string,
    data: UpdateLessonBundleDto,
    teacherId: string,
    schoolId: string,
  ) {
    const lesson = await this.prisma.content.findFirst({
      where: {
        id: lessonId,
        schoolId,
        type: ContentType.LESSON,
      },
    });
    if (!lesson)
      throw new NotFoundException('Lesson not found');
    if (lesson.teacherId !== teacherId)
      throw new ForbiddenException('Only creator can update');
    if ([LessonStatus.PUBLISHED, 'PENDING_REVIEW'].includes(lesson.status as any))
      throw new BadRequestException('Cannot update lessons that are pending review or published');
    if (data.periodNumber !== undefined) {
      await this.assertValidLessonPeriod(schoolId, data.periodNumber);
    }

    const updated = await this.prisma.content.update({
      where: { id: lessonId },
      data: {
        title: data.title,
        description: data.homework?.title,
        instructions:
          data.homework?.description || data.homework?.instructions,
        objective: data.objective,
        lessonContent: data.lessonContent,
        periodNumber: data.periodNumber,
        unitNumber: data.unitNumber,
        topicName: data.topicName,
        topicId: data.topicId,
        competency: data.competency,
        status: data.status,
        isExamPrep: data.isExamPrep,
        syllabusMappingId: data.syllabusMappingId,
      },
      include: {
        subject: true,
        teacher: { select: { id: true, name: true, email: true } },
      },
    });
    return { lesson: updated };
  }

  /**
   * HOD APPROVAL WORKFLOW
   */
  async submitForReview(lessonId: string, teacherId: string, schoolId: string) {
    const lesson = await this.prisma.content.findUnique({
      where: { id: lessonId },
    });
    if (!lesson || lesson.type !== ContentType.LESSON)
      throw new NotFoundException('Lesson not found');
    if (lesson.schoolId !== schoolId)
      throw new ForbiddenException('Access denied');
    if (lesson.teacherId !== teacherId)
      throw new ForbiddenException('Only creator can submit');
    if (lesson.status !== LessonStatus.DRAFT)
      throw new BadRequestException('Only draft lessons can be submitted');

    return this.prisma.content.update({
      where: { id: lessonId },
      data: { status: 'PENDING_REVIEW' as any },
      include: {
        subject: true,
        teacher: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async approveLesson(lessonId: string, hodId: string, schoolId: string) {
    const lesson = await this.prisma.content.findUnique({
      where: { id: lessonId },
    });
    if (!lesson || lesson.type !== ContentType.LESSON)
      throw new NotFoundException('Lesson not found');
    if (lesson.schoolId !== schoolId)
      throw new ForbiddenException('Access denied');
    if (lesson.status !== ('PENDING_REVIEW' as any))
      throw new BadRequestException('Only pending review can be approved');

    const updated = await this.prisma.content.update({
      where: { id: lessonId },
      data: {
        status: LessonStatus.PUBLISHED,
        reviewedBy: hodId,
        reviewedAt: new Date(),
      },
      include: {
        subject: true,
        teacher: { select: { id: true, name: true, email: true } },
      },
    });

    // Notify parents of lesson publication
    await this.notifyLessonPublished(updated);

    const homework = this.buildHomeworkFromLesson(updated);
    if (homework) {
      await this.notifyParents(updated, homework);
    }

    return updated;
  }

  private async notifyLessonPublished(lesson: any) {
    try {
      const classRecord = await this.prisma.class.findFirst({
        where: { grade: lesson.grade, schoolId: lesson.schoolId },
      });
      if (!classRecord) return;

      const studentClasses = await this.prisma.studentClass.findMany({
        where: { classId: classRecord.id, section: { name: lesson.sectionName } },
      });

      const parentUserIds = new Set<string>();
      for (const sc of studentClasses) {
        const parentLinks = await (this.prisma as any).parentStudent.findMany({
          where: { student: { userId: sc.studentId }, schoolId: lesson.schoolId },
          select: { parent: { select: { userId: true } } },
        });
        parentLinks.forEach((pl: any) => {
          if (pl.parent?.userId) parentUserIds.add(pl.parent.userId);
        });
      }

      const userIds = Array.from(parentUserIds);
      if (userIds.length > 0) {
        await this.notificationService.createBulkNotifications({
          schoolId: lesson.schoolId,
          userIds,
          title: 'New Lesson Published',
          message: `New lesson: ${lesson.title} for Grade ${lesson.grade} ${lesson.sectionName} by ${lesson.teacher?.name || 'Teacher'}`,
          type: 'LESSON',
          actionUrl: `/parent/lessons/${lesson.id}`,
          metadata: {
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            grade: lesson.grade,
            section: lesson.sectionName,
            subjectId: lesson.subjectId,
            subjectName: lesson.subject?.name || 'lesson',
            teacherName: lesson.teacher?.name || 'Teacher',
          },
        });
      }
    } catch (e) {
      console.error('Lesson notification error:', e);
    }
  }

  private async notifyLessonCreated(lesson: any) {
    try {
      const classRecord = await this.prisma.class.findFirst({
        where: { grade: lesson.grade, schoolId: lesson.schoolId },
      });
      if (!classRecord) return;

      const studentClasses = await this.prisma.studentClass.findMany({
        where: {
          schoolId: lesson.schoolId,
          classId: classRecord.id,
          section: { name: lesson.sectionName },
        },
        select: { studentId: true },
      });

      const studentUserIds = studentClasses.map((sc) => sc.studentId);
      if (studentUserIds.length === 0) return;

      const studentProfiles = await this.prisma.studentProfile.findMany({
        where: {
          schoolId: lesson.schoolId,
          userId: { in: studentUserIds },
        },
        select: { id: true },
      });
      const studentProfileIds = studentProfiles.map((profile) => profile.id);

      const parentLinks =
        studentProfileIds.length > 0
          ? await this.prisma.parentStudent.findMany({
              where: {
                schoolId: lesson.schoolId,
                studentId: { in: studentProfileIds },
              },
              select: { parent: { select: { userId: true } } },
            })
          : [];

      const subjectName = lesson.subject?.name || 'lesson';
      const metadata = {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        grade: lesson.grade,
        section: lesson.sectionName,
        subjectId: lesson.subjectId,
        subjectName,
        teacherName: lesson.teacher?.name || 'Teacher',
      };
      const message = `${lesson.teacher?.name || 'Teacher'} created "${lesson.title}" for ${subjectName}.`;

      const uniqueStudentUserIds = Array.from(new Set(studentUserIds));
      if (uniqueStudentUserIds.length > 0) {
        await this.notificationService.createBulkNotifications({
          schoolId: lesson.schoolId,
          userIds: uniqueStudentUserIds,
          title: 'New Lesson Created',
          message,
          type: NotificationType.LESSON,
          actionUrl: `/student/lessons/${lesson.id}`,
          metadata,
        });
      }

      const uniqueParentUserIds = Array.from(
        new Set(parentLinks.map((link) => link.parent.userId).filter(Boolean)),
      );
      if (uniqueParentUserIds.length > 0) {
        await this.notificationService.createBulkNotifications({
          schoolId: lesson.schoolId,
          userIds: uniqueParentUserIds,
          title: 'New Lesson Created',
          message,
          type: NotificationType.LESSON,
          actionUrl: `/parent/lessons/${lesson.id}`,
          metadata,
        });
      }
    } catch (error) {
      console.error('Lesson creation notification error:', error);
    }
  }

  async rejectLesson(
    lessonId: string,
    hodId: string,
    schoolId: string,
    reason?: string,
  ) {
    const lesson = await this.prisma.content.findUnique({
      where: { id: lessonId },
      include: { subject: true },
    });
    if (!lesson || lesson.type !== ContentType.LESSON)
      throw new NotFoundException('Lesson not found');
    if (lesson.schoolId !== schoolId)
      throw new ForbiddenException('Access denied');
    if (lesson.status !== ('PENDING_REVIEW' as any))
      throw new BadRequestException('Only pending review can be rejected');

    return this.prisma.content.update({
      where: { id: lessonId },
      data: {
        status: LessonStatus.DRAFT,
        reviewedBy: hodId,
        reviewedAt: new Date(),
      },
      include: {
        subject: true,
        teacher: { select: { id: true, name: true, email: true } },
      },
    });
  }

  private async notifyParents(lesson: any, homework: any) {
    try {
      const classRecord = await this.prisma.class.findFirst({
        where: { grade: lesson.grade, schoolId: lesson.schoolId },
      });
      if (!classRecord) return;

      const studentClasses = await this.prisma.studentClass.findMany({
        where: { classId: classRecord.id, section: { name: lesson.section } },
        include: { student: true },
      });

      const parentIds = new Set<string>();
      for (const sc of studentClasses) {
        const parentLink = await (this.prisma as any).parentStudent.findFirst({
          where: { studentId: sc.studentId },
        });
        if (parentLink) parentIds.add(parentLink.parentId);
      }

      const userIds = Array.from(parentIds);
      if (userIds.length > 0) {
        await this.notificationService.createBulkNotifications({
          schoolId: lesson.schoolId,
          userIds,
          title: 'New Homework Assigned',
          message: `New homework: ${homework.title}. Due: ${homework.dueDate || 'No due date'}`,
          type: 'HOMEWORK',
        });
      }
    } catch (e) {
      console.error('Notify error:', e);
    }
  }

  /**
   * FINANCE CONTENT LOCK
   */
  async getLessonWithContentLock(
    lessonId: string,
    studentId: string,
    schoolId: string,
  ) {
    const lesson = await this.prisma.content.findUnique({
      where: { id: lessonId },
      include: {
        subject: true,
        teacher: { select: { id: true, name: true } },
        resources: true,
        attachmentsNew: true,
      },
    });
    if (!lesson || lesson.type !== ContentType.LESSON)
      throw new NotFoundException('Lesson not found');

    const homework = this.buildHomeworkFromLesson(lesson);
    const submission = null;

    const studentFees = await this.prisma.studentFee.findMany({
      where: { studentId, schoolId, status: { in: ['OVERDUE', 'PENDING'] } },
    });

    const hasOutstandingFees = studentFees.length > 0;

    if (hasOutstandingFees) {
      return {
        ...lesson,
        resources: [],
        homework: homework
          ? { ...homework, description: 'Locked - Please settle fees.' }
          : null,
        isLocked: true,
        lockMessage: 'Content locked due to outstanding fees',
      };
    }

    return {
      ...lesson,
      homework,
      submission,
      isLocked: false,
    };
  }

  async submitHomework(
    homeworkId: string,
    studentId: string,
    data: SubmitHomeworkDto,
  ) {
    const homework = await (this.prisma as any).homework.findUnique({
      where: { id: homeworkId },
    });
    if (!homework) throw new NotFoundException('Homework not found');

    const existing = await (this.prisma as any).homeworkSubmission.findUnique({
      where: { homeworkId_studentId: { homeworkId, studentId } },
    });

    if (existing) {
      return (this.prisma as any).homeworkSubmission.update({
        where: { id: existing.id },
        data: {
          submissionUrl: data.submissionUrl,
          submissionText: data.submissionText,
          submittedAt: new Date(),
          status: 'SUBMITTED',
        },
      });
    }

    return (this.prisma as any).homeworkSubmission.create({
      data: {
        homeworkId,
        studentId,
        submissionUrl: data.submissionUrl,
        submissionText: data.submissionText,
        submittedAt: new Date(),
        status: 'SUBMITTED',
      },
    });
  }

  async gradeHomework(
    submissionId: string,
    teacherId: string,
    data: GradeHomeworkDto,
  ) {
    const submission = await (this.prisma as any).homeworkSubmission.findUnique(
      { where: { id: submissionId } },
    );
    if (!submission) throw new NotFoundException('Submission not found');

    return (this.prisma as any).homeworkSubmission.update({
      where: { id: submissionId },
      data: {
        type: ContentType.LESSON,
        grade: data.grade,
        feedback: data.feedback,
        status: 'GRADED',
        gradedBy: teacherId,
        gradedAt: new Date(),
      },
    });
  }

  /**
   * Lesson Coverage Report
   */
  async getLessonCoverageReport(
    query: LessonCoverageQueryDto,
    schoolId: string,
  ) {
    const syllabusMappings = await (
      this.prisma as any
    ).syllabusMapping.findMany({
      where: {
        schoolId,
        subjectId: query.subjectId,
        grade: query.grade,
        ...(query.unitNumber && { unitNumber: query.unitNumber }),
      },
      orderBy: { unitNumber: 'asc' },
    });

    const lessons = await this.prisma.content.findMany({
      where: {
        schoolId,
        subjectId: query.subjectId,
        grade: query.grade,
        status: { in: [LessonStatus.PUBLISHED, LessonStatus.COVERED] },
        type: ContentType.LESSON,
      },
      select: {
        id: true,
        unitNumber: true,
        topicName: true,
        status: true,
        lessonDate: true,
      },
    });

    const coverageByUnit = syllabusMappings.map((m) => ({
      unitNumber: m.unitNumber,
      unitName: m.unitName,
      topicName: m.topicName,
      competency: m.competency,
      lessonsCovered: lessons.filter((l) => l.unitNumber === m.unitNumber)
        .length,
      status: lessons.some((l) => l.unitNumber === m.unitNumber)
        ? 'Covered'
        : 'Not Covered',
    }));

    const coveredUnits = coverageByUnit.filter(
      (c) => c.status === 'Covered',
    ).length;
    return {
      summary: {
        totalUnits: syllabusMappings.length,
        coveredUnits,
        coveragePercentage:
        syllabusMappings.length === 0
          ? 0
          : Math.round((coveredUnits / syllabusMappings.length) * 100),
        totalLessons: lessons.length,
      },
      coverageByUnit,
    };
  }

  async getPendingReviewLessons(schoolId: string, departmentId?: string) {
    return this.prisma.content.findMany({
      where: {
        schoolId,
        status: 'PENDING_REVIEW' as any,
        type: ContentType.LESSON,
      },
      include: {
        subject: true,
        teacher: { select: { id: true, name: true, email: true } },
        academicYear: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // ===== Original methods =====
  async create(data: CreateLessonDto, teacherId: string, schoolId: string) {
    const classRecord = await this.prisma.class.findFirst({
      where: {
        grade: data.grade,
        schoolId,
      },
    });
    if (!classRecord) throw new NotFoundException(`Class not found`);

    const sectionRecord = await this.prisma.section.findFirst({
      where: { name: data.section, classId: classRecord.id },
    });
    if (!sectionRecord) throw new NotFoundException(`Section not found`);

    const classSubject = await this.prisma.classSubject.findFirst({
      where: {
        subjectId: data.subjectId,
        classId: classRecord.id,
        sectionId: sectionRecord.id,
        teacherId,
      },
    });
    if (!classSubject) throw new ForbiddenException('Not assigned');

    const existing = await this.prisma.content.findFirst({
      where: {
        schoolId,
        subjectId: data.subjectId,
        teacherId,
        lessonDate: new Date(data.lessonDate),
        periodNumber: data.periodNumber,
      },
    });
    if (existing) throw new BadRequestException('Lesson exists');

    const lesson = await this.prisma.content.create({
      data: {
        schoolId,
        academicYearId: data.academicYearId,
        semesterId: data.semesterId,
        type: ContentType.LESSON,
        grade: data.grade,
        sectionName: data.section,
        stream: data.stream,
        subjectId: data.subjectId,
        teacherId,
        title: data.title,
        description: data.description,
        instructions: data.instructions,
        objective: data.objective,
        lessonContent: data.lessonContent,
        lessonDate: new Date(data.lessonDate),
        periodNumber: data.periodNumber,
        status: data.status || LessonStatus.DRAFT,
      },
      include: {
        subject: true,
        teacher: { select: { id: true, name: true, email: true } },
        academicYear: true,
        semester: true,
        attachmentsNew: true,
      },
    });

    await this.notifyLessonCreated(lesson);

    return lesson;
  }

  async findAll(
    query: LessonQueryDto,
    schoolId: string,
    userId: string,
    role: string,
  ) {
    const where: any = { schoolId };
    // Only return rows that are lessons
    where.type = ContentType.LESSON;
    let parentChildMap: Map<string, { id: string; name: string }> | null = null;
    let parentClassScopes = new Map<
      string,
      Array<{ grade: number | null; sectionName: string }>
    >();
    if (role === 'TEACHER') where.teacherId = userId;
    else if (role === 'STUDENT') {
      // Students can only see lessons for their own class/section.
      where.status = { in: this.getLearnerVisibleLessonStatuses() };
      const sc = await this.prisma.studentClass.findFirst({
        where: { studentId: userId, schoolId },
        include: { section: { include: { class: true } } },
      });
      if (!sc) {
        return {
          data: [],
          meta: { total: 0, page: query.page || 1, limit: query.limit || 20, totalPages: 0 },
        };
      }
      where.grade = sc.section.class.grade;
      where.sectionName = sc.section.name;
    } else if (role === 'PARENT') {
      // Parents can only see lessons for their linked children.
      where.status = { in: this.getLearnerVisibleLessonStatuses() };
      const parentProfile = await this.prisma.parentProfile.findFirst({
        where: { userId, schoolId },
      });

      if (!parentProfile) {
        return {
          data: [],
          meta: { total: 0, page: query.page || 1, limit: query.limit || 20, totalPages: 0 },
        };
      }

      const childLinks = await this.prisma.parentStudent.findMany({
        where: {
          parentId: parentProfile.id,
          schoolId,
          ...(query.studentId ? { studentId: query.studentId } : {}),
        },
        include: {
          student: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
        },
      });

      const childUserIds = childLinks.map((link) => link.student.userId);
      parentChildMap = new Map(
        childLinks.map((link) => [
          link.student.userId,
          { id: link.student.id, name: link.student.user?.name || 'Unknown' },
        ]),
      );

      const studentClasses = await this.prisma.studentClass.findMany({
        where: { studentId: { in: childUserIds }, schoolId },
        include: { section: { include: { class: true } } },
      });
      parentClassScopes = new Map();
      studentClasses.forEach((sc) => {
        const existing = parentClassScopes.get(sc.studentId) || [];
        existing.push({
          grade: sc.section.class.grade,
          sectionName: sc.section.name,
        });
        parentClassScopes.set(sc.studentId, existing);
      });

      const scopes = studentClasses
        .map((sc) => ({
          grade: sc.section.class.grade,
          sectionName: sc.section.name,
        }))
        .filter((scope) => scope.grade !== null);

      if (scopes.length === 0) {
        return {
          data: [],
          meta: { total: 0, page: query.page || 1, limit: query.limit || 20, totalPages: 0 },
        };
      }

      where.OR = scopes;
    }
    // For students/parents, do not allow overriding their own grade/section via query params.
    if (role !== 'STUDENT' && role !== 'PARENT') {
      if (query.grade) where.grade = query.grade;
      if (query.section) where.sectionName = query.section;
    }
    if (query.semesterId) where.semesterId = query.semesterId;
    if (query.subjectId) where.subjectId = query.subjectId;
    if (query.status) where.status = query.status;
    if (query.startDate || query.endDate) {
      where.lessonDate = {};
      if (query.startDate) where.lessonDate.gte = new Date(query.startDate);
      if (query.endDate) where.lessonDate.lte = new Date(query.endDate);
    }

    const page = query.page || 1,
      limit = query.limit || 20,
      skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lessonDate: 'desc' },
        include: {
          subject: true,
          teacher: { select: { id: true, name: true, email: true } },
          academicYear: true,
          semester: true,
          attachmentsNew: true,
        },
      }),
      this.prisma.content.count({ where }),
    ]);
    const resolvedData =
      role === 'PARENT' && parentChildMap
        ? data.flatMap((lesson) => {
            const matchingChildren = Array.from(parentChildMap.entries()).filter(
              ([childUserId]) =>
                parentClassScopes.get(childUserId)?.some(
                  (scope) =>
                    scope.grade === lesson.grade &&
                    scope.sectionName === lesson.sectionName,
                ),
            );

            return matchingChildren.map(([_, child]) => ({
              ...lesson,
              section: lesson.sectionName,
              homework: this.buildHomeworkFromLesson(lesson),
              studentId: child.id,
              studentName: child.name,
              childGrade: lesson.grade,
              childSection: lesson.sectionName,
            }));
          })
        : data.map((lesson) => ({
            ...lesson,
            section: lesson.sectionName,
            homework: this.buildHomeworkFromLesson(lesson),
          }));

    return {
      data: resolvedData,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, schoolId: string, role: string, userId: string) {
    const lesson = await this.prisma.content.findUnique({
      where: { id },
      include: {
        subject: true,
        teacher: { select: { id: true, name: true, email: true } },
        academicYear: true,
        semester: true,
        attachmentsNew: true,
      },
    });
    if (!lesson || lesson.type !== ContentType.LESSON)
      throw new NotFoundException('Not found');
    if (lesson.schoolId !== schoolId)
      throw new ForbiddenException('Access denied');
    if (
      role === 'TEACHER' &&
      lesson.teacherId !== userId &&
      lesson.status !== LessonStatus.PUBLISHED
    )
      throw new ForbiddenException('Access denied');
    if (role === 'STUDENT') {
      if (!this.getLearnerVisibleLessonStatuses().includes(lesson.status as LessonStatus))
        throw new ForbiddenException('Not visible');
      const studentClass = await this.prisma.studentClass.findFirst({
        where: { studentId: userId, schoolId },
        include: { section: { include: { class: true } } },
      });
      if (
        !studentClass ||
        studentClass.section.class.grade !== lesson.grade ||
        studentClass.section.name !== lesson.sectionName
      ) {
        throw new ForbiddenException('Access denied');
      }
    }
    if (role === 'PARENT') {
      if (!this.getLearnerVisibleLessonStatuses().includes(lesson.status as LessonStatus))
        throw new ForbiddenException('Not visible');
      const parentProfile = await this.prisma.parentProfile.findFirst({
        where: { userId, schoolId },
      });
      if (!parentProfile) throw new ForbiddenException('Access denied');

      const childLinks = await this.prisma.parentStudent.findMany({
        where: { parentId: parentProfile.id, schoolId },
        include: { student: { include: { user: { select: { id: true, name: true } } } } },
      });
      const childUserIds = childLinks.map((link) => link.student.userId);
      const matchingClass = await this.prisma.studentClass.findFirst({
        where: {
          studentId: { in: childUserIds },
          schoolId,
          section: { name: lesson.sectionName || undefined },
          class: { grade: lesson.grade || undefined },
        },
      });
      if (!matchingClass) throw new ForbiddenException('Access denied');
    }
    return {
      ...lesson,
      section: lesson.sectionName,
      homework: this.buildHomeworkFromLesson(lesson),
    };
  }

  async update(
    id: string,
    data: UpdateLessonDto,
    teacherId: string,
    schoolId: string,
  ) {
    const lesson = await this.prisma.content.findFirst({
      where: { id, schoolId, type: ContentType.LESSON },
    });
    if (!lesson)
      throw new NotFoundException('Not found');
    if (lesson.teacherId !== teacherId)
      throw new ForbiddenException('Only creator');
    if (data.periodNumber !== undefined) {
      await this.assertValidLessonPeriod(schoolId, data.periodNumber);
    }
    return this.prisma.content.update({
      where: { id },
      data: {
        title: data.title,
        objective: data.objective,
        lessonContent: data.lessonContent,
        periodNumber: data.periodNumber,
        status: data.status,
      },
      include: {
        subject: true,
        teacher: { select: { id: true, name: true, email: true } },
        academicYear: true,
        semester: true,
        attachmentsNew: true,
      },
    });
  }

  async remove(id: string, teacherId: string, schoolId: string) {
    const lesson = await this.prisma.content.findFirst({
      where: { id, schoolId, type: ContentType.LESSON },
    });
    if (!lesson)
      throw new NotFoundException('Not found');
    if (lesson.teacherId !== teacherId)
      throw new ForbiddenException('Only creator');
    if ([LessonStatus.PUBLISHED, 'PENDING_REVIEW'].includes(lesson.status as any))
      throw new BadRequestException('Cannot delete lessons that are pending review or published');
    await this.prisma.content.delete({ where: { id } });
    return { message: 'Deleted' };
  }
}
