import {
  BadRequestException,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import {
  CreateCommunicationDto,
  CreateCommunicationReplyDto,
  UpdateCommunicationStatusDto,
  CommunicationQueryDto,
  CommunicationStatus,
  CommunicationCategory,
} from './dto/create-communication.dto';

@Injectable()
export class CommunicationService {
  private readonly adminRoles = new Set(['ADMIN', 'IT_MANAGER', 'SUPER_ADMIN']);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  // ==================== COMMUNICATION CRUD ====================

  /**
   * Create a new communication entry
   * Teachers, Admins, and Parents can create communications
   */
  async createCommunication(
    schoolId: string,
    createdById: string,
    creatorRole: string,
    dto: CreateCommunicationDto,
  ) {
    const targetUserId = dto.studentId?.trim();
    const subject = dto.subject?.trim();
    const message = dto.message?.trim();
    const classId = dto.classId?.trim() || undefined;

    if (!targetUserId) {
      throw new BadRequestException('A recipient is required');
    }
    if (!subject) {
      throw new BadRequestException('Subject is required');
    }
    if (!message) {
      throw new BadRequestException('Message is required');
    }

    const creator = await this.prisma.user.findUnique({
      where: { id: createdById },
      select: { schoolId: true },
    });

    const effectiveSchoolId = schoolId || creator?.schoolId;

    // For admins, allow sending to any user (staff, students, parents)
    // For non-admins, verify student exists and belongs to the same school
    let targetUser: any;
    let isTargetStudent = false;

    const schoolFilter = effectiveSchoolId
      ? { schoolId: effectiveSchoolId }
      : {};

    let targetUserRecord = await this.prisma.user.findFirst({
      where: {
        id: targetUserId,
        ...schoolFilter,
      },
      include: {
        studentProfile: {
          include: {
            parents: {
              include: {
                parent: {
                  include: { user: true },
                },
              },
            },
          },
        },
      },
    });

    // Backward-compatible fallback: allow passing StudentProfile.id as studentId.
    if (!targetUserRecord) {
      const profile = await this.prisma.studentProfile.findFirst({
        where: {
          id: targetUserId,
          ...(effectiveSchoolId ? { schoolId: effectiveSchoolId } : {}),
        },
        select: { userId: true },
      });

      if (profile?.userId) {
        targetUserRecord = await this.prisma.user.findFirst({
          where: {
            id: profile.userId,
            ...schoolFilter,
          },
          include: {
            studentProfile: {
              include: {
                parents: {
                  include: {
                    parent: {
                      include: { user: true },
                    },
                  },
                },
              },
            },
          },
        });
      }
    }

    if (!targetUserRecord) {
      throw new NotFoundException('Target user not found in this school');
    }

    isTargetStudent = targetUserRecord.role === 'STUDENT';
    targetUser = targetUserRecord;
    const resolvedSchoolId = effectiveSchoolId || targetUser.schoolId;

    // If target is a student and creator is a teacher, verify they teach this student's class
    if (isTargetStudent && creatorRole === 'TEACHER') {
      const [homeroomSections, classSubjectAssignments, timetableAssignments] =
        await Promise.all([
          this.prisma.section.findMany({
            where: {
              homeroomTeacherId: createdById,
              class: {
                schoolId: resolvedSchoolId,
              },
            },
            select: {
              id: true,
              classId: true,
            },
          }),
          this.prisma.classSubject.findMany({
            where: {
              teacherId: createdById,
              class: {
                schoolId: resolvedSchoolId,
              },
            },
            select: {
              classId: true,
              sectionId: true,
            },
          }),
          this.prisma.timetableSlot.findMany({
            where: {
              teacherId: createdById,
              class: {
                schoolId: resolvedSchoolId,
              },
            },
            select: {
              classId: true,
              sectionId: true,
            },
          }),
        ]);

      const assignedPairs = [
        ...homeroomSections.map((item) => ({
          classId: item.classId,
          sectionId: item.id,
        })),
        ...classSubjectAssignments.map((item) => ({
          classId: item.classId,
          sectionId: item.sectionId,
        })),
        ...timetableAssignments.map((item) => ({
          classId: item.classId,
          sectionId: item.sectionId,
        })),
      ];

      if (assignedPairs.length === 0) {
        throw new ForbiddenException(
          'You can only create communications for students in your classes or homeroom',
        );
      }

      const studentInAssignedSection = await this.prisma.studentClass.findFirst(
        {
          where: {
            schoolId: resolvedSchoolId,
            studentId: targetUser.id,
            OR: assignedPairs,
          },
        },
      );

      if (!studentInAssignedSection) {
        throw new ForbiddenException(
          'You can only create communications for students in your classes or homeroom',
        );
      }
    }

    // Parents can only message their own children or teachers linked to them.
    if (creatorRole === 'PARENT') {
      const parentProfile = await this.prisma.parentProfile.findFirst({
        where: {
          userId: createdById,
          schoolId: resolvedSchoolId,
        },
      });

      if (!parentProfile) {
        throw new ForbiddenException('Parent profile not found');
      }

      if (isTargetStudent) {
        const parentRelation = await this.prisma.parentStudent.findFirst({
          where: {
            parentId: parentProfile.id,
            studentId: targetUser.studentProfile?.id,
          },
        });

        if (!parentRelation) {
          throw new ForbiddenException(
            'You can only create communications for your own children',
          );
        }
      } else {
        if (targetUser.role !== 'TEACHER') {
          throw new ForbiddenException(
            'Parents can only create communications for their own children or related teachers',
          );
        }

        const isRelatedTeacher = await this.isTeacherLinkedToParentChildren(
          createdById,
          targetUser.id,
          resolvedSchoolId,
        );

        if (!isRelatedTeacher) {
          throw new ForbiddenException(
            'You can only create communications for teachers linked to your children',
          );
        }
      }
    }

    // Create communication
    const communication = await this.prisma.communication.create({
      data: {
        schoolId: effectiveSchoolId || targetUser.schoolId,
        studentId: targetUser.id,
        createdById,
        classId,
        subject,
        message,
        status: 'OPEN',
        category: dto.category || CommunicationCategory.GENERAL,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, role: true },
        },
        student: {
          select: { id: true, name: true },
        },
        class: {
          select: { id: true, name: true, section: true },
        },
      },
    });

    // Notify parents of the student about new communication. Notification failures
    // should not block communication creation.
    if (isTargetStudent && targetUser.studentProfile?.parents) {
      const notificationPromises = targetUser.studentProfile.parents
        .filter(
          (parentRelation: any) =>
            parentRelation.parent.user &&
            parentRelation.parent.user.id !== createdById,
        )
        .map((parentRelation: any) =>
          this.notificationService.createNotification({
            schoolId: effectiveSchoolId || targetUser.schoolId,
            userId: parentRelation.parent.user.id,
            title: 'New Communication Entry',
            message: `A new note has been added for ${targetUser.name}: ${subject}`,
            type: 'COMMUNICATION',
            actionUrl: `/list/communications?conversationId=${communication.id}`,
            metadata: {
              communicationId: communication.id,
              studentId: targetUserId,
            },
          }),
        );
      await Promise.allSettled(notificationPromises);
    }

    // For non-student targets (staff, parents), notify the target user directly
    if (!isTargetStudent && targetUser.id !== createdById) {
      await this.safeNotify({
        schoolId: effectiveSchoolId || targetUser.schoolId,
        userId: targetUser.id,
        title: 'New Communication Entry',
        message: `A new note has been added: ${subject}`,
        type: 'COMMUNICATION',
        actionUrl: `/list/communications?conversationId=${communication.id}`,
        metadata: {
          communicationId: communication.id,
          targetUserId,
        },
      });
    }

    return communication;
  }

  /**
   * Get communications with filtering
   * Role-based access control applied
   */
  async getCommunications(
    schoolId: string,
    userId: string,
    userRole: string,
    query: CommunicationQueryDto,
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const whereClause: any = await this.getBaseRbacWhereClause(
      schoolId,
      userId,
      userRole,
    );

    // Apply filters
    if (query.studentId) {
      whereClause.studentId = query.studentId;
    }
    if (query.classId) {
      whereClause.classId = query.classId;
    }
    // Only apply status filter if it's a valid enum value
    if (
      query.status &&
      ['OPEN', 'ACKNOWLEDGED', 'CLOSED'].includes(query.status)
    ) {
      whereClause.status = query.status;
    }
    // Apply category filter
    if (
      query.category &&
      ['ACADEMIC', 'ATTENDANCE', 'DISCIPLINE', 'HEALTH', 'GENERAL'].includes(
        query.category,
      )
    ) {
      whereClause.category = query.category;
    }
    if (query.createdById) {
      whereClause.createdById = query.createdById;
    }
    if (query.search) {
      whereClause.OR = [
        { subject: { contains: query.search } },
        { message: { contains: query.search } },
      ];
    }

    const [communications, total] = await Promise.all([
      this.prisma.communication.findMany({
        where: whereClause,
        include: {
          createdBy: {
            select: { id: true, name: true, role: true },
          },
          student: {
            select: {
              id: true,
              name: true,
              studentProfile: {
                select: {
                  className: true,
                  section: true,
                },
              },
            },
          },
          class: {
            select: { id: true, name: true, section: true },
          },
          replies: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              message: true,
              createdAt: true,
              sender: {
                select: { id: true, name: true, role: true },
              },
            },
          },
          _count: {
            select: { replies: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.communication.count({ where: whereClause }),
    ]);

    return {
      data: communications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get unread communications count
   */
  async getUnreadCount(schoolId: string, userId: string, userRole: string) {
    const baseWhere = await this.getBaseRbacWhereClause(
      schoolId,
      userId,
      userRole,
    );
    const whereClause = { ...baseWhere, status: 'OPEN' };

    const count = await this.prisma.communication.count({
      where: whereClause,
    });

    return { count };
  }

  /**
   * Get count of communications relevant to the current user
   * Used for menu/navbar badges - returns user-specific counts
   */
  async getMyCommunicationsCount(
    schoolId: string,
    userId: string,
    userRole: string,
    status?: string,
  ) {
    const whereClause = await this.getBaseRbacWhereClause(
      schoolId,
      userId,
      userRole,
    );

    // Apply status filter if provided
    if (status && ['OPEN', 'ACKNOWLEDGED', 'CLOSED'].includes(status)) {
      whereClause.status = status;
    }

    const count = await this.prisma.communication.count({
      where: whereClause,
    });

    return { count };
  }

  /**
   * Get a single communication by ID
   */
  async getCommunicationById(
    schoolId: string,
    userId: string,
    userRole: string,
    communicationId: string,
  ) {
    const communication = await this.prisma.communication.findUnique({
      where: { id: communicationId },
      include: {
        createdBy: {
          select: { id: true, name: true, role: true },
        },
        student: {
          select: { id: true, name: true },
        },
        class: {
          select: { id: true, name: true, section: true },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            message: true,
            createdAt: true,
            sender: {
              select: { id: true, name: true, role: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!communication) {
      throw new NotFoundException('Communication not found');
    }

    if (communication.schoolId !== schoolId) {
      throw new ForbiddenException('Access denied');
    }

    await this.verifyAccess(communication, userId, userRole);

    return communication;
  }

  /**
   * Update communication status (only OPEN -> CLOSED)
   */
  async updateStatus(
    schoolId: string,
    userId: string,
    userRole: string,
    communicationId: string,
    dto: UpdateCommunicationStatusDto,
  ) {
    const communication = await this.prisma.communication.findUnique({
      where: { id: communicationId },
      include: {
        student: {
          include: {
            studentProfile: {
              include: {
                parents: {
                  include: {
                    parent: {
                      include: { user: true },
                    },
                  },
                },
              },
            },
          },
        },
        createdBy: true,
      },
    });

    if (!communication) {
      throw new NotFoundException('Communication not found');
    }

    if (communication.schoolId !== schoolId) {
      throw new ForbiddenException('Access denied');
    }

    await this.verifyAccess(communication, userId, userRole);

    // Allow the recipient teacher on direct parent->teacher threads to manage status too.
    const isCreator = communication.createdById === userId;
    const isAdmin = this.adminRoles.has(userRole);
    const isTargetUser = communication.studentId === userId;

    let isParent = false;
    if (userRole === 'PARENT') {
      const parentProfile = await this.prisma.parentProfile.findFirst({
        where: { userId, schoolId },
      });
      if (parentProfile && communication.student.studentProfile) {
        isParent = communication.student.studentProfile.parents.some(
          (p) => p.parentId === parentProfile.id,
        );
      }
    }

    if (!isCreator && !isAdmin && !isParent && !isTargetUser) {
      throw new ForbiddenException(
        'You do not have permission to update this communication',
      );
    }

    // Validate status - allow OPEN to ACKNOWLEDGED or CLOSED
    // Admins can also reopen closed communications (change to OPEN)
    if (dto.status === CommunicationStatus.OPEN && !isAdmin) {
      throw new ForbiddenException(
        'Only admins can reopen closed communications',
      );
    }

    if (
      dto.status !== CommunicationStatus.ACKNOWLEDGED &&
      dto.status !== CommunicationStatus.CLOSED &&
      dto.status !== CommunicationStatus.OPEN
    ) {
      throw new ForbiddenException(
        'You can only acknowledge, close, or reopen communications',
      );
    }

    // Check current status - admins can reopen closed communications
    if (
      communication.status === CommunicationStatus.CLOSED &&
      dto.status !== CommunicationStatus.OPEN
    ) {
      throw new ForbiddenException('This communication is already closed');
    }

    // If trying to reopen, only admins can do it
    if (
      dto.status === CommunicationStatus.OPEN &&
      communication.status === CommunicationStatus.CLOSED &&
      !isAdmin
    ) {
      throw new ForbiddenException(
        'Only admins can reopen closed communications',
      );
    }

    const updated = await this.prisma.communication.update({
      where: { id: communicationId },
      data: { status: dto.status },
      include: {
        createdBy: {
          select: { id: true, name: true, role: true },
        },
        student: {
          select: { id: true, name: true },
        },
      },
    });

    // Notify relevant parties about status change
    if (
      dto.status === CommunicationStatus.CLOSED &&
      communication.createdById !== userId
    ) {
      // Notify the creator that it was closed
      await this.safeNotify({
        schoolId,
        userId: communication.createdById,
        title: 'Communication Closed',
        message: `Your communication "${communication.subject}" has been closed`,
        type: 'COMMUNICATION',
        actionUrl: `/list/communications?conversationId=${communicationId}`,
        metadata: { communicationId, newStatus: dto.status },
      });
    }

    // Notify relevant parties about acknowledgment
    if (
      dto.status === CommunicationStatus.ACKNOWLEDGED &&
      communication.createdById !== userId
    ) {
      // Notify the creator that it was acknowledged
      await this.safeNotify({
        schoolId,
        userId: communication.createdById,
        title: 'Communication Acknowledged',
        message: `Your communication "${communication.subject}" has been acknowledged`,
        type: 'COMMUNICATION',
        actionUrl: `/list/communications?conversationId=${communicationId}`,
        metadata: { communicationId, newStatus: dto.status },
      });
    }

    // Notify relevant parties about reopening
    if (
      dto.status === CommunicationStatus.OPEN &&
      communication.createdById !== userId
    ) {
      // Notify relevant parties that it was reopened
      await this.safeNotify({
        schoolId,
        userId: communication.createdById,
        title: 'Communication Reopened',
        message: `Your communication "${communication.subject}" has been reopened`,
        type: 'COMMUNICATION',
        actionUrl: `/list/communications?conversationId=${communicationId}`,
        metadata: { communicationId, newStatus: dto.status },
      });
    }

    return updated;
  }

  /**
   * Delete a communication (Admin only)
   */
  async deleteCommunication(
    schoolId: string,
    userId: string,
    userRole: string,
    communicationId: string,
  ) {
    if (!this.adminRoles.has(userRole)) {
      throw new ForbiddenException(
        'Only administrators can delete communications',
      );
    }

    const communication = await this.prisma.communication.findUnique({
      where: { id: communicationId },
    });

    if (!communication) {
      throw new NotFoundException('Communication not found');
    }

    if (communication.schoolId !== schoolId) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.communication.delete({
      where: { id: communicationId },
    });

    return { message: 'Communication deleted successfully' };
  }

  // ==================== REPLIES ====================

  /**
   * Add a reply to a communication (Parents/Teachers/Admins can reply)
   */
  async addReply(
    schoolId: string,
    userId: string,
    userRole: string,
    communicationId: string,
    dto: CreateCommunicationReplyDto,
  ) {
    const message = dto.message?.trim();
    if (!message) {
      throw new BadRequestException('Reply message is required');
    }

    const communication = await this.prisma.communication.findUnique({
      where: { id: communicationId },
      include: {
        student: {
          include: {
            studentProfile: {
              include: {
                parents: {
                  include: {
                    parent: {
                      include: { user: true },
                    },
                  },
                },
              },
            },
          },
        },
        createdBy: true,
      },
    });

    if (!communication) {
      throw new NotFoundException('Communication not found');
    }

    if (communication.schoolId !== schoolId) {
      throw new ForbiddenException('Access denied');
    }

    await this.verifyAccess(communication, userId, userRole);

    const reply = await this.prisma.communicationReply.create({
      data: {
        communicationId,
        senderId: userId,
        message,
      },
      include: {
        sender: {
          select: { id: true, name: true, role: true, avatarUrl: true },
        },
      },
    });

    // Notify relevant parties about the reply
    const sender = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, role: true },
    });

    // If parent replies, notify the creator (teacher/admin)
    if (userRole === 'PARENT' && communication.createdById !== userId) {
      await this.safeNotify({
        schoolId,
        userId: communication.createdById,
        title: 'New Reply to Communication',
        message: `${sender?.name} replied to "${communication.subject}": ${this.previewText(message)}`,
        type: 'MESSAGE_RECEIVED',
        actionUrl: `/list/communications?conversationId=${communicationId}`,
        metadata: { communicationId, replyId: reply.id },
      });
    } else if (['TEACHER', 'ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      // Student-targeted communications notify linked parents. Direct parent->teacher
      // threads should notify the original creator instead.
      if (communication.student.studentProfile) {
        const notificationPromises =
          communication.student.studentProfile.parents
            .filter(
              (parentRelation: any) =>
                parentRelation.parent.user &&
                parentRelation.parent.user.id !== userId,
            )
            .map((parentRelation: any) =>
              this.notificationService.createNotification({
                schoolId,
                userId: parentRelation.parent.user.id,
                title: 'New Reply to Communication',
                message: `${sender?.name} replied to "${communication.subject}": ${this.previewText(message)}`,
                type: 'MESSAGE_RECEIVED',
                actionUrl: `/list/communications?conversationId=${communicationId}`,
                metadata: { communicationId, replyId: reply.id },
              }),
            );
        await Promise.allSettled(notificationPromises);
      } else if (communication.createdById !== userId) {
        await this.safeNotify({
          schoolId,
          userId: communication.createdById,
          title: 'New Reply to Communication',
          message: `${sender?.name} replied to "${communication.subject}": ${this.previewText(message)}`,
          type: 'MESSAGE_RECEIVED',
          actionUrl: `/list/communications?conversationId=${communicationId}`,
          metadata: { communicationId, replyId: reply.id },
        });
      }
    }

    return reply;
  }

  /**
   * Delete a reply (creator or admin only)
   */
  async deleteReply(
    schoolId: string,
    userId: string,
    userRole: string,
    replyId: string,
  ) {
    const reply = await this.prisma.communicationReply.findUnique({
      where: { id: replyId },
      include: { communication: true },
    });

    if (!reply) {
      throw new NotFoundException('Reply not found');
    }

    if (reply.communication.schoolId !== schoolId) {
      throw new ForbiddenException('Access denied');
    }

    const isSender = reply.senderId === userId;
    const isAdmin = this.adminRoles.has(userRole);

    if (!isSender && !isAdmin) {
      throw new ForbiddenException('You can only delete your own replies');
    }

    await this.prisma.communicationReply.delete({
      where: { id: replyId },
    });

    return { message: 'Reply deleted successfully' };
  }

  // ==================== HELPER METHODS ====================

  /**
   * Get base RBAC where clause for communication queries
   * Centralized logic to avoid DRY violations
   */
  private async getBaseRbacWhereClause(
    schoolId: string,
    userId: string,
    userRole: string,
  ): Promise<any> {
    const baseWhere: any = { schoolId };

    if (userRole === 'PARENT') {
      const parentProfile = await this.prisma.parentProfile.findFirst({
        where: { userId, schoolId },
        include: {
          children: {
            where: {
              student: { schoolId },
            },
            select: { studentId: true },
          },
        },
      });

      if (!parentProfile) {
        // Return impossible condition that matches no records
        return { schoolId, id: { notIn: [] } };
      }

      const studentProfileIds = parentProfile.children.map((c) => c.studentId);

      const studentProfiles = await this.prisma.studentProfile.findMany({
        where: { id: { in: studentProfileIds }, schoolId },
        select: { userId: true },
      });

      const allowedStudentIds = studentProfiles.map((s) => s.userId);

      // Parents see communications about their children OR communications they created
      return {
        schoolId,
        AND: [
          { schoolId },
          {
            OR: [
              { studentId: { in: allowedStudentIds } },
              { createdById: userId },
            ],
          },
        ],
      };
    } else if (userRole === 'TEACHER') {
      const accessibleStudentIds = await this.getTeacherAccessibleStudentIds(
        schoolId,
        userId,
      );

      // Teachers see conversations they created, direct threads addressed to
      // them, and parent-created communications about students they teach.
      return {
        schoolId,
        AND: [
          { schoolId },
          {
            OR: [
              { createdById: userId },
              { studentId: userId },
              ...(accessibleStudentIds.length > 0
                ? [
                    {
                      AND: [
                        { studentId: { in: accessibleStudentIds } },
                        {
                          createdBy: {
                            role: 'PARENT',
                          },
                        },
                      ],
                    },
                  ]
                : []),
            ],
          },
        ],
      };
    } else if (userRole === 'STUDENT') {
      // Students see communications about themselves OR communications they created
      return {
        schoolId,
        AND: [
          { schoolId },
          {
            OR: [{ studentId: userId }, { createdById: userId }],
          },
        ],
      };
    } else if (userRole === 'REGISTRAR') {
      // Registrars see all communications in their school
      return { schoolId };
    }
    // ADMIN and SUPER_ADMIN can see all communications in their school
    return { schoolId };
  }

  /**
   * Verify user has access to the communication
   * Optimized to use pre-fetched relations when available
   */
  private async verifyAccess(
    communication: any,
    userId: string,
    userRole: string,
    preFetched?: {
      parentProfile?: any;
      studentProfile?: any;
    },
  ) {
    // Admins and registrars have full access within their school
    if (['ADMIN', 'SUPER_ADMIN', 'REGISTRAR'].includes(userRole)) {
      return true;
    }

    // Creator has access
    if (communication.createdById === userId) {
      return true;
    }

    // Student can see their own communications
    if (userRole === 'STUDENT') {
      if (communication.studentId === userId) {
        return true;
      }
      throw new ForbiddenException('Access denied');
    }

    // Parent can see their children's communications
    if (userRole === 'PARENT') {
      // Use pre-fetched profile if available, otherwise fetch
      const parentProfile =
        preFetched?.parentProfile ||
        (await this.prisma.parentProfile.findFirst({
          where: { userId, schoolId: communication.schoolId },
        }));

      if (!parentProfile) {
        throw new ForbiddenException('Parent profile not found');
      }

      // Use pre-fetched student profile if available
      let studentProfile = preFetched?.studentProfile;
      if (!studentProfile) {
        studentProfile = await this.prisma.studentProfile.findFirst({
          where: {
            userId: communication.studentId,
            schoolId: communication.schoolId,
          },
        });
      }

      if (!studentProfile) {
        throw new ForbiddenException('Student profile not found');
      }

      const parentRelation = await this.prisma.parentStudent.findFirst({
        where: {
          parentId: parentProfile.id,
          studentId: studentProfile.id,
        },
      });

      if (!parentRelation) {
        throw new ForbiddenException('Access denied');
      }

      return true;
    }

    // Teachers can also access direct threads addressed to them.
    if (userRole === 'TEACHER') {
      const accessibleStudentIds = await this.getTeacherAccessibleStudentIds(
        communication.schoolId,
        userId,
      );

      if (
        communication.createdById === userId ||
        communication.studentId === userId ||
        (communication.createdBy?.role === 'PARENT' &&
          accessibleStudentIds.includes(communication.studentId))
      ) {
        return true;
      }
      throw new ForbiddenException('Access denied');
    }

    throw new ForbiddenException('Access denied');
  }

  private previewText(message: string, maxLength = 50): string {
    const normalized = message.trim().replace(/\s+/g, ' ');
    if (normalized.length <= maxLength) {
      return normalized;
    }

    return `${normalized.slice(0, maxLength)}...`;
  }

  private async isTeacherLinkedToParentChildren(
    parentUserId: string,
    teacherUserId: string,
    schoolId: string,
  ): Promise<boolean> {
    const parentProfile = await this.prisma.parentProfile.findFirst({
      where: { userId: parentUserId, schoolId },
      include: {
        children: {
          where: {
            student: { schoolId },
          },
          select: {
            student: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    });

    const childUserIds =
      parentProfile?.children
        .map((child) => child.student.userId)
        .filter(Boolean) || [];

    if (childUserIds.length === 0) {
      return false;
    }

    const [classSubjectAssignments, timetableAssignments] = await Promise.all([
      this.prisma.classSubject.findMany({
        where: {
          teacherId: teacherUserId,
          class: {
            schoolId,
          },
        },
        select: {
          classId: true,
          sectionId: true,
        },
      }),
      this.prisma.timetableSlot.findMany({
        where: {
          teacherId: teacherUserId,
          class: {
            schoolId,
          },
        },
        select: {
          classId: true,
          sectionId: true,
        },
      }),
    ]);
    const assignedPairs = [
      ...classSubjectAssignments,
      ...timetableAssignments,
    ].map((item) => ({
      classId: item.classId,
      sectionId: item.sectionId,
    }));

    const relationChecks: Prisma.StudentClassWhereInput[] = [
      {
        class: {
          homeroomTeacherId: teacherUserId,
        },
      },
      {
        section: {
          homeroomTeacherId: teacherUserId,
        },
      },
      ...assignedPairs,
    ];

    const linkedStudentClass = await this.prisma.studentClass.findFirst({
      where: {
        schoolId,
        studentId: { in: childUserIds },
        OR: relationChecks,
      },
      select: { id: true },
    });

    return Boolean(linkedStudentClass);
  }

  private async getTeacherAccessibleStudentIds(
    schoolId: string,
    teacherUserId: string,
  ): Promise<string[]> {
    const [homeroomSections, classSubjectAssignments, timetableAssignments] =
      await Promise.all([
        this.prisma.section.findMany({
          where: {
            homeroomTeacherId: teacherUserId,
            class: {
              schoolId,
            },
          },
          select: {
            id: true,
            classId: true,
          },
        }),
        this.prisma.classSubject.findMany({
          where: {
            teacherId: teacherUserId,
            class: {
              schoolId,
            },
          },
          select: {
            classId: true,
            sectionId: true,
          },
        }),
        this.prisma.timetableSlot.findMany({
          where: {
            teacherId: teacherUserId,
            class: {
              schoolId,
            },
          },
          select: {
            classId: true,
            sectionId: true,
          },
        }),
      ]);

    const assignedPairs = [
      ...homeroomSections.map((item) => ({
        classId: item.classId,
        sectionId: item.id,
      })),
      ...classSubjectAssignments.map((item) => ({
        classId: item.classId,
        sectionId: item.sectionId,
      })),
      ...timetableAssignments.map((item) => ({
        classId: item.classId,
        sectionId: item.sectionId,
      })),
    ];

    if (assignedPairs.length === 0) {
      return [];
    }

    const studentClasses = await this.prisma.studentClass.findMany({
      where: {
        schoolId,
        OR: assignedPairs,
      },
      select: {
        studentId: true,
      },
    });

    return Array.from(
      new Set(studentClasses.map((item) => item.studentId).filter(Boolean)),
    );
  }

  private getTeacherIncomingWhereClause(schoolId: string, userId: string) {
    return {
      schoolId,
      AND: [
        { schoolId },
        {
          OR: [
            { studentId: userId },
            {
              AND: [
                { createdById: userId },
                {
                  replies: {
                    some: {
                      sender: {
                        role: 'PARENT',
                      },
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    };
  }

  private async safeNotify(
    payload: Parameters<NotificationService['createNotification']>[0],
  ) {
    try {
      await this.notificationService.createNotification(payload);
    } catch (error) {
      // Notification delivery should not fail the main communication flow.
      console.error('Communication notification dispatch failed', {
        userId: payload.userId,
        type: payload.type,
        error,
      });
    }
  }
}
