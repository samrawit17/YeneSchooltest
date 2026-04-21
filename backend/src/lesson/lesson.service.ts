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
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class LessonService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  /**
   * PERIOD GUARD: Verify teacher is assigned to this period in timetable
   * Ethiopian schools run on a strict 1-8 period schedule
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
    const timetableSlot = await this.prisma.timetableSlot.findFirst({
      where: {
        teacherId,
        classId,
        sectionId,
        subjectId,
        dayOfWeek,
        academicYearId,
      },
    });

    if (!timetableSlot) {
      const timetable = await this.prisma.timetable.findFirst({
        where: {
          teacherId,
          classId,
          sectionId,
          subjectId,
          day: dayOfWeek.toString(),
        },
      });
      if (!timetable) {
        throw new ForbiddenException(
          `You are not assigned to teach this subject during period ${periodNumber}. Please check your timetable.`,
        );
      }
    }
    return true;
  }

  private getDayOfWeek(date: Date): number {
    return date.getDay();
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
      },
    });
    if (!classRecord)
      throw new NotFoundException(`Class not found for grade ${data.grade}`);

    const sectionRecord = await this.prisma.section.findFirst({
      where: { name: data.section, classId: classRecord.id },
    });
    if (!sectionRecord)
      throw new NotFoundException(`Section ${data.section} not found`);

    const classSubject = await this.prisma.classSubject.findFirst({
      where: {
        subjectId: data.subjectId,
        classId: classRecord.id,
        sectionId: sectionRecord.id,
        teacherId,
      },
    });
    if (!classSubject)
      throw new ForbiddenException('Not assigned to teach this subject');

    const lessonDate = new Date(data.lessonDate);
    const dayOfWeek = this.getDayOfWeek(lessonDate);
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
      },
    });
    if (existingLesson) throw new BadRequestException('Lesson already exists');

    // Create lesson with nested homework using raw queries or simplified approach
    const lesson = await (this.prisma.content as any).create({
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

    // Create homework if provided
    let homework = null;
    if (data.homework) {
      homework = await (this.prisma as any).homework.create({
        data: {
          lessonId: lesson.id,
          schoolId,
          title: data.homework.title || `Homework for ${data.title}`,
          description: data.homework.description,
          instructions: data.homework.instructions,
          dueDate: data.homework.dueDate
            ? new Date(data.homework.dueDate)
            : null,
          totalPoints: data.homework.totalPoints,
          isExamPrep: data.homework.isExamPrep || false,
          isLocked: data.homework.isLocked || false,
        },
      });
    }

    // Create resources
    const resources: any[] = [];
    if (data.resources && data.resources.length > 0) {
      for (const resource of data.resources) {
        const created = await (this.prisma as any).lessonResource.create({
          data: {
            lessonId: lesson.id,
            schoolId,
            title: resource.title,
            description: resource.description,
            resourceType: resource.resourceType,
            fileUrl: resource.fileUrl,
            fileName: resource.fileName,
            fileSize: resource.fileSize,
            mimeType: resource.mimeType,
            isLocked: resource.isLocked || false,
            uploadedBy: teacherId,
          },
        });
        resources.push(created);
      }
    }

    return { lesson, homework, resources };
  }

  async updateLessonBundle(
    lessonId: string,
    data: UpdateLessonBundleDto,
    teacherId: string,
    schoolId: string,
  ) {
    const lesson = await this.prisma.content.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (lesson.schoolId !== schoolId)
      throw new ForbiddenException('Access denied');
    if (lesson.teacherId !== teacherId)
      throw new ForbiddenException('Only creator can update');
    if (lesson.status === LessonStatus.PUBLISHED)
      throw new BadRequestException('Cannot update published lesson');

    const updated = await this.prisma.content.update({
      where: { id: lessonId },
      data: {
        title: data.title,
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
    if (!lesson) throw new NotFoundException('Lesson not found');
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
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (lesson.schoolId !== schoolId)
      throw new ForbiddenException('Access denied');
    if (lesson.status !== ('PENDING_REVIEW' as any))
      throw new BadRequestException('Only pending review can be approved');

    const updated = await (this.prisma.content as any).update({
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

    // Notify parents of homework
    try {
      const homework = await (this.prisma as any).homework.findFirst({
        where: { lessonId },
      });
      if (homework) await this.notifyParents(updated, homework);
    } catch (e) {
      console.error('Notification error:', e);
    }

    return updated;
  }

  async rejectLesson(
    lessonId: string,
    hodId: string,
    schoolId: string,
    reason?: string,
  ) {
    const lesson = await this.prisma.content.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
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
    if (!lesson) throw new NotFoundException('Lesson not found');

    const homework = await (this.prisma as any).homework.findFirst({
      where: { lessonId },
    });
    const submission = homework
      ? await (this.prisma as any).homeworkSubmission.findFirst({
          where: { homeworkId: homework.id, studentId },
        })
      : null;

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
      homework: homework || null,
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
        coveragePercentage: Math.round(
          (coveredUnits / syllabusMappings.length) * 100,
        ),
        totalLessons: lessons.length,
      },
      coverageByUnit,
    };
  }

  async getPendingReviewLessons(schoolId: string, departmentId?: string) {
    return this.prisma.content.findMany({
      where: { schoolId, status: 'PENDING_REVIEW' as any },
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

    return this.prisma.content.create({
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
  }

  async findAll(
    query: LessonQueryDto,
    schoolId: string,
    userId: string,
    role: string,
  ) {
    const where: any = { schoolId };
    if (role === 'TEACHER') where.teacherId = userId;
    else if (role === 'STUDENT') {
      where.status = LessonStatus.PUBLISHED;
      const sc = await this.prisma.studentClass.findFirst({
        where: { studentId: userId },
        include: { section: { include: { class: true } } },
      });
      if (sc) {
        where.grade = sc.section.class.grade;
        where.section = sc.section.name;
      }
    }
    if (query.grade) where.grade = query.grade;
    if (query.section) where.section = query.section;
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
    return {
      data,
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
    if (!lesson) throw new NotFoundException('Not found');
    if (lesson.schoolId !== schoolId)
      throw new ForbiddenException('Access denied');
    if (
      role === 'TEACHER' &&
      lesson.teacherId !== userId &&
      lesson.status !== LessonStatus.PUBLISHED
    )
      throw new ForbiddenException('Access denied');
    if (role === 'STUDENT' && lesson.status !== LessonStatus.PUBLISHED)
      throw new ForbiddenException('Not published');
    return lesson;
  }

  async update(
    id: string,
    data: UpdateLessonDto,
    teacherId: string,
    schoolId: string,
  ) {
    const lesson = await this.prisma.content.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('Not found');
    if (lesson.schoolId !== schoolId)
      throw new ForbiddenException('Access denied');
    if (lesson.teacherId !== teacherId)
      throw new ForbiddenException('Only creator');
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
    const lesson = await this.prisma.content.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('Not found');
    if (lesson.schoolId !== schoolId)
      throw new ForbiddenException('Access denied');
    if (lesson.teacherId !== teacherId)
      throw new ForbiddenException('Only creator');
    if (lesson.status === LessonStatus.PUBLISHED)
      throw new BadRequestException('Cannot delete published');
    await this.prisma.content.delete({ where: { id } });
    return { message: 'Deleted' };
  }
}
