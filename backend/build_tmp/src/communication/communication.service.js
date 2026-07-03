"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunicationService = void 0;
const common_1 = require("@nestjs/common");
const localization_1 = require("../core/localization");
const prisma_service_1 = require("../prisma/prisma.service");
const notification_service_1 = require("../notification/notification.service");
const create_communication_dto_1 = require("./dto/create-communication.dto");
let CommunicationService = class CommunicationService {
    prisma;
    notificationService;
    adminRoles = new Set(['ADMIN', 'IT_MANAGER', 'SUPER_ADMIN']);
    constructor(prisma, notificationService) {
        this.prisma = prisma;
        this.notificationService = notificationService;
    }
    async getAcademicYearDateRange(schoolId, academicYearId) {
        if (!academicYearId) {
            return null;
        }
        const academicYear = await this.prisma.academicYear.findFirst({
            where: { id: academicYearId, schoolId },
            select: { startDate: true, endDate: true },
        });
        if (!academicYear) {
            throw new localization_1.LocalizedException('communication.academic_year_not_found_561c725b', undefined, common_1.HttpStatus.NOT_FOUND, 'Academic year not found');
        }
        return {
            gte: academicYear.startDate,
            lte: academicYear.endDate,
        };
    }
    async createCommunication(schoolId, createdById, creatorRole, dto) {
        const targetUserId = dto.studentId?.trim();
        const subject = dto.subject?.trim();
        const message = dto.message?.trim();
        const classId = dto.classId?.trim() || undefined;
        if (!targetUserId) {
            throw new localization_1.LocalizedException('communication.a_recipient_is_required_93310a26', undefined, undefined, 'A recipient is required');
        }
        if (!subject) {
            throw new localization_1.LocalizedException('communication.subject_is_required_84d86d02', undefined, undefined, 'Subject is required');
        }
        if (!message) {
            throw new localization_1.LocalizedException('communication.message_is_required_caf57bac', undefined, undefined, 'Message is required');
        }
        const creator = await this.prisma.user.findUnique({
            where: { id: createdById },
            select: { schoolId: true },
        });
        const effectiveSchoolId = schoolId || creator?.schoolId;
        let targetUser;
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
            throw new localization_1.LocalizedException('communication.target_user_not_found_in_this_school_07223705', undefined, common_1.HttpStatus.NOT_FOUND, 'Target user not found in this school');
        }
        isTargetStudent = targetUserRecord.role === 'STUDENT';
        targetUser = targetUserRecord;
        const resolvedSchoolId = effectiveSchoolId || targetUser.schoolId;
        if (isTargetStudent && creatorRole === 'TEACHER') {
            const [homeroomSections, classSubjectAssignments, timetableAssignments] = await Promise.all([
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
                throw new localization_1.LocalizedException('communication.you_can_only_create_communications_for_students_in_your_clas_0f25fc23', undefined, common_1.HttpStatus.FORBIDDEN, 'You can only create communications for students in your classes or homeroom');
            }
            const studentInAssignedSection = await this.prisma.studentClass.findFirst({
                where: {
                    schoolId: resolvedSchoolId,
                    studentId: targetUser.id,
                    OR: assignedPairs,
                },
            });
            if (!studentInAssignedSection) {
                throw new localization_1.LocalizedException('communication.you_can_only_create_communications_for_students_in_your_clas_0f25fc23', undefined, common_1.HttpStatus.FORBIDDEN, 'You can only create communications for students in your classes or homeroom');
            }
        }
        if (creatorRole === 'PARENT') {
            const parentProfile = await this.prisma.parentProfile.findFirst({
                where: {
                    userId: createdById,
                    schoolId: resolvedSchoolId,
                },
            });
            if (!parentProfile) {
                throw new localization_1.LocalizedException('communication.parent_profile_not_found_ad089d27', undefined, common_1.HttpStatus.FORBIDDEN, 'Parent profile not found');
            }
            if (isTargetStudent) {
                const parentRelation = await this.prisma.parentStudent.findFirst({
                    where: {
                        parentId: parentProfile.id,
                        studentId: targetUser.studentProfile?.id,
                    },
                });
                if (!parentRelation) {
                    throw new localization_1.LocalizedException('communication.you_can_only_create_communications_for_your_own_children_71181cfa', undefined, common_1.HttpStatus.FORBIDDEN, 'You can only create communications for your own children');
                }
            }
            else {
                if (targetUser.role !== 'TEACHER') {
                    throw new localization_1.LocalizedException('communication.parents_can_only_create_communications_for_their_own_childre_3f8b542b', undefined, common_1.HttpStatus.FORBIDDEN, 'Parents can only create communications for their own children or related teachers');
                }
                const isRelatedTeacher = await this.isTeacherLinkedToParentChildren(createdById, targetUser.id, resolvedSchoolId);
                if (!isRelatedTeacher) {
                    throw new localization_1.LocalizedException('communication.you_can_only_create_communications_for_teachers_linked_to_yo_c0d66e48', undefined, common_1.HttpStatus.FORBIDDEN, 'You can only create communications for teachers linked to your children');
                }
            }
        }
        const communication = await this.prisma.communication.create({
            data: {
                schoolId: effectiveSchoolId || targetUser.schoolId,
                studentId: targetUser.id,
                createdById,
                classId,
                subject,
                message,
                status: 'OPEN',
                category: dto.category || create_communication_dto_1.CommunicationCategory.GENERAL,
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
        if (isTargetStudent && targetUser.studentProfile?.parents) {
            const notificationPromises = targetUser.studentProfile.parents
                .filter((parentRelation) => parentRelation.parent.user &&
                parentRelation.parent.user.id !== createdById)
                .map((parentRelation) => this.notificationService.createNotification({
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
            }));
            await Promise.allSettled(notificationPromises);
        }
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
    async getCommunications(schoolId, userId, userRole, query) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const skip = (page - 1) * limit;
        const whereClause = await this.getBaseRbacWhereClause(schoolId, userId, userRole);
        const academicYearDateRange = await this.getAcademicYearDateRange(schoolId, query.academicYearId);
        if (academicYearDateRange) {
            whereClause.createdAt = academicYearDateRange;
        }
        if (query.studentId) {
            whereClause.studentId = query.studentId;
        }
        if (query.classId) {
            whereClause.classId = query.classId;
        }
        if (query.status &&
            ['OPEN', 'ACKNOWLEDGED', 'CLOSED'].includes(query.status)) {
            whereClause.status = query.status;
        }
        if (query.category &&
            ['ACADEMIC', 'ATTENDANCE', 'DISCIPLINE', 'HEALTH', 'GENERAL'].includes(query.category)) {
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
    async getUnreadCount(schoolId, userId, userRole) {
        const baseWhere = await this.getBaseRbacWhereClause(schoolId, userId, userRole);
        const whereClause = { ...baseWhere, status: 'OPEN' };
        const count = await this.prisma.communication.count({
            where: whereClause,
        });
        return { count };
    }
    async getMyCommunicationsCount(schoolId, userId, userRole, status) {
        const whereClause = await this.getBaseRbacWhereClause(schoolId, userId, userRole);
        if (status && ['OPEN', 'ACKNOWLEDGED', 'CLOSED'].includes(status)) {
            whereClause.status = status;
        }
        const count = await this.prisma.communication.count({
            where: whereClause,
        });
        return { count };
    }
    async getCommunicationById(schoolId, userId, userRole, communicationId, academicYearId) {
        const academicYearDateRange = await this.getAcademicYearDateRange(schoolId, academicYearId);
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
            throw new localization_1.LocalizedException('communication.communication_not_found_21ef8c8b', undefined, common_1.HttpStatus.NOT_FOUND, 'Communication not found');
        }
        if (communication.schoolId !== schoolId) {
            throw new localization_1.LocalizedException('communication.access_denied_08de2fda', undefined, common_1.HttpStatus.FORBIDDEN, 'Access denied');
        }
        if (academicYearDateRange &&
            (communication.createdAt < academicYearDateRange.gte ||
                communication.createdAt > academicYearDateRange.lte)) {
            throw new localization_1.LocalizedException('communication.communication_not_found_21ef8c8b', undefined, common_1.HttpStatus.NOT_FOUND, 'Communication not found');
        }
        await this.verifyAccess(communication, userId, userRole);
        return communication;
    }
    async updateStatus(schoolId, userId, userRole, communicationId, dto) {
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
            throw new localization_1.LocalizedException('communication.communication_not_found_21ef8c8b', undefined, common_1.HttpStatus.NOT_FOUND, 'Communication not found');
        }
        if (communication.schoolId !== schoolId) {
            throw new localization_1.LocalizedException('communication.access_denied_08de2fda', undefined, common_1.HttpStatus.FORBIDDEN, 'Access denied');
        }
        await this.verifyAccess(communication, userId, userRole);
        const isCreator = communication.createdById === userId;
        const isAdmin = this.adminRoles.has(userRole);
        const isTargetUser = communication.studentId === userId;
        let isParent = false;
        if (userRole === 'PARENT') {
            const parentProfile = await this.prisma.parentProfile.findFirst({
                where: { userId, schoolId },
            });
            if (parentProfile && communication.student.studentProfile) {
                isParent = communication.student.studentProfile.parents.some((p) => p.parentId === parentProfile.id);
            }
        }
        if (!isCreator && !isAdmin && !isParent && !isTargetUser) {
            throw new localization_1.LocalizedException('communication.you_do_not_have_permission_to_update_this_communication_11e118e7', undefined, common_1.HttpStatus.FORBIDDEN, 'You do not have permission to update this communication');
        }
        if (dto.status === create_communication_dto_1.CommunicationStatus.OPEN && !isAdmin) {
            throw new localization_1.LocalizedException('communication.only_admins_can_reopen_closed_communications_0d4c873b', undefined, common_1.HttpStatus.FORBIDDEN, 'Only admins can reopen closed communications');
        }
        if (dto.status !== create_communication_dto_1.CommunicationStatus.ACKNOWLEDGED &&
            dto.status !== create_communication_dto_1.CommunicationStatus.CLOSED &&
            dto.status !== create_communication_dto_1.CommunicationStatus.OPEN) {
            throw new localization_1.LocalizedException('communication.you_can_only_acknowledge_close_or_reopen_communications_198920d3', undefined, common_1.HttpStatus.FORBIDDEN, 'You can only acknowledge, close, or reopen communications');
        }
        if (communication.status === create_communication_dto_1.CommunicationStatus.CLOSED &&
            dto.status !== create_communication_dto_1.CommunicationStatus.OPEN) {
            throw new localization_1.LocalizedException('communication.this_communication_is_already_closed_486fec86', undefined, common_1.HttpStatus.FORBIDDEN, 'This communication is already closed');
        }
        if (dto.status === create_communication_dto_1.CommunicationStatus.OPEN &&
            communication.status === create_communication_dto_1.CommunicationStatus.CLOSED &&
            !isAdmin) {
            throw new localization_1.LocalizedException('communication.only_admins_can_reopen_closed_communications_0d4c873b', undefined, common_1.HttpStatus.FORBIDDEN, 'Only admins can reopen closed communications');
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
        if (dto.status === create_communication_dto_1.CommunicationStatus.CLOSED &&
            communication.createdById !== userId) {
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
        if (dto.status === create_communication_dto_1.CommunicationStatus.ACKNOWLEDGED &&
            communication.createdById !== userId) {
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
        if (dto.status === create_communication_dto_1.CommunicationStatus.OPEN &&
            communication.createdById !== userId) {
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
    async deleteCommunication(schoolId, userId, userRole, communicationId) {
        if (!this.adminRoles.has(userRole)) {
            throw new localization_1.LocalizedException('communication.only_administrators_can_delete_communications_be7f3be9', undefined, common_1.HttpStatus.FORBIDDEN, 'Only administrators can delete communications');
        }
        const communication = await this.prisma.communication.findUnique({
            where: { id: communicationId },
        });
        if (!communication) {
            throw new localization_1.LocalizedException('communication.communication_not_found_21ef8c8b', undefined, common_1.HttpStatus.NOT_FOUND, 'Communication not found');
        }
        if (communication.schoolId !== schoolId) {
            throw new localization_1.LocalizedException('communication.access_denied_08de2fda', undefined, common_1.HttpStatus.FORBIDDEN, 'Access denied');
        }
        await this.prisma.communication.delete({
            where: { id: communicationId },
        });
        return { message: 'Communication deleted successfully' };
    }
    async addReply(schoolId, userId, userRole, communicationId, dto) {
        const message = dto.message?.trim();
        if (!message) {
            throw new localization_1.LocalizedException('communication.reply_message_is_required_a0ac57c5', undefined, undefined, 'Reply message is required');
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
            throw new localization_1.LocalizedException('communication.communication_not_found_21ef8c8b', undefined, common_1.HttpStatus.NOT_FOUND, 'Communication not found');
        }
        if (communication.schoolId !== schoolId) {
            throw new localization_1.LocalizedException('communication.access_denied_08de2fda', undefined, common_1.HttpStatus.FORBIDDEN, 'Access denied');
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
        const sender = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, role: true },
        });
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
        }
        else if (['TEACHER', 'ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
            if (communication.student.studentProfile) {
                const notificationPromises = communication.student.studentProfile.parents
                    .filter((parentRelation) => parentRelation.parent.user &&
                    parentRelation.parent.user.id !== userId)
                    .map((parentRelation) => this.notificationService.createNotification({
                    schoolId,
                    userId: parentRelation.parent.user.id,
                    title: 'New Reply to Communication',
                    message: `${sender?.name} replied to "${communication.subject}": ${this.previewText(message)}`,
                    type: 'MESSAGE_RECEIVED',
                    actionUrl: `/list/communications?conversationId=${communicationId}`,
                    metadata: { communicationId, replyId: reply.id },
                }));
                await Promise.allSettled(notificationPromises);
            }
            else if (communication.createdById !== userId) {
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
    async deleteReply(schoolId, userId, userRole, replyId) {
        const reply = await this.prisma.communicationReply.findUnique({
            where: { id: replyId },
            include: { communication: true },
        });
        if (!reply) {
            throw new localization_1.LocalizedException('communication.reply_not_found_aeaa8649', undefined, common_1.HttpStatus.NOT_FOUND, 'Reply not found');
        }
        if (reply.communication.schoolId !== schoolId) {
            throw new localization_1.LocalizedException('communication.access_denied_08de2fda', undefined, common_1.HttpStatus.FORBIDDEN, 'Access denied');
        }
        const isSender = reply.senderId === userId;
        const isAdmin = this.adminRoles.has(userRole);
        if (!isSender && !isAdmin) {
            throw new localization_1.LocalizedException('communication.you_can_only_delete_your_own_replies_cbc1895b', undefined, common_1.HttpStatus.FORBIDDEN, 'You can only delete your own replies');
        }
        await this.prisma.communicationReply.delete({
            where: { id: replyId },
        });
        return { message: 'Reply deleted successfully' };
    }
    async getBaseRbacWhereClause(schoolId, userId, userRole) {
        const baseWhere = { schoolId };
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
                return { schoolId, id: { notIn: [] } };
            }
            const studentProfileIds = parentProfile.children.map((c) => c.studentId);
            const studentProfiles = await this.prisma.studentProfile.findMany({
                where: { id: { in: studentProfileIds }, schoolId },
                select: { userId: true },
            });
            const allowedStudentIds = studentProfiles.map((s) => s.userId);
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
        }
        else if (userRole === 'TEACHER') {
            const accessibleStudentIds = await this.getTeacherAccessibleStudentIds(schoolId, userId);
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
        }
        else if (userRole === 'STUDENT') {
            return {
                schoolId,
                AND: [
                    { schoolId },
                    {
                        OR: [{ studentId: userId }, { createdById: userId }],
                    },
                ],
            };
        }
        else if (userRole === 'REGISTRAR') {
            return { schoolId };
        }
        return { schoolId };
    }
    async verifyAccess(communication, userId, userRole, preFetched) {
        if (['ADMIN', 'SUPER_ADMIN', 'REGISTRAR'].includes(userRole)) {
            return true;
        }
        if (communication.createdById === userId) {
            return true;
        }
        if (userRole === 'STUDENT') {
            if (communication.studentId === userId) {
                return true;
            }
            throw new localization_1.LocalizedException('communication.access_denied_08de2fda', undefined, common_1.HttpStatus.FORBIDDEN, 'Access denied');
        }
        if (userRole === 'PARENT') {
            const parentProfile = preFetched?.parentProfile ||
                (await this.prisma.parentProfile.findFirst({
                    where: { userId, schoolId: communication.schoolId },
                }));
            if (!parentProfile) {
                throw new localization_1.LocalizedException('communication.parent_profile_not_found_ad089d27', undefined, common_1.HttpStatus.FORBIDDEN, 'Parent profile not found');
            }
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
                throw new localization_1.LocalizedException('communication.student_profile_not_found_75599cef', undefined, common_1.HttpStatus.FORBIDDEN, 'Student profile not found');
            }
            const parentRelation = await this.prisma.parentStudent.findFirst({
                where: {
                    parentId: parentProfile.id,
                    studentId: studentProfile.id,
                },
            });
            if (!parentRelation) {
                throw new localization_1.LocalizedException('communication.access_denied_08de2fda', undefined, common_1.HttpStatus.FORBIDDEN, 'Access denied');
            }
            return true;
        }
        if (userRole === 'TEACHER') {
            const accessibleStudentIds = await this.getTeacherAccessibleStudentIds(communication.schoolId, userId);
            if (communication.createdById === userId ||
                communication.studentId === userId ||
                (communication.createdBy?.role === 'PARENT' &&
                    accessibleStudentIds.includes(communication.studentId))) {
                return true;
            }
            throw new localization_1.LocalizedException('communication.access_denied_08de2fda', undefined, common_1.HttpStatus.FORBIDDEN, 'Access denied');
        }
        throw new localization_1.LocalizedException('communication.access_denied_08de2fda', undefined, common_1.HttpStatus.FORBIDDEN, 'Access denied');
    }
    previewText(message, maxLength = 50) {
        const normalized = message.trim().replace(/\s+/g, ' ');
        if (normalized.length <= maxLength) {
            return normalized;
        }
        return `${normalized.slice(0, maxLength)}...`;
    }
    async isTeacherLinkedToParentChildren(parentUserId, teacherUserId, schoolId) {
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
        const childUserIds = parentProfile?.children
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
        const relationChecks = [
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
    async getTeacherAccessibleStudentIds(schoolId, teacherUserId) {
        const [homeroomSections, classSubjectAssignments, timetableAssignments] = await Promise.all([
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
        return Array.from(new Set(studentClasses.map((item) => item.studentId).filter(Boolean)));
    }
    getTeacherIncomingWhereClause(schoolId, userId) {
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
    async safeNotify(payload) {
        try {
            await this.notificationService.createNotification(payload);
        }
        catch (error) {
            console.error('Communication notification dispatch failed', {
                userId: payload.userId,
                type: payload.type,
                error,
            });
        }
    }
};
exports.CommunicationService = CommunicationService;
exports.CommunicationService = CommunicationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService])
], CommunicationService);
//# sourceMappingURL=communication.service.js.map