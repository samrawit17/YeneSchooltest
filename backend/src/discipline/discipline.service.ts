import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class DisciplineService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async verifyParentChild(
    parentId: string,
    studentId: string,
    schoolId: string,
  ): Promise<boolean> {
    const parentProfile = await this.prisma.parentProfile.findFirst({
      where: { userId: parentId, schoolId },
      select: { id: true },
    });
    if (!parentProfile) return false;

    const studentProfile = await this.prisma.studentProfile.findFirst({
      where: { schoolId, OR: [{ id: studentId }, { userId: studentId }] },
      select: { id: true },
    });
    if (!studentProfile) return false;

    const link = await this.prisma.parentStudent.findFirst({
      where: {
        parentId: parentProfile.id,
        studentId: studentProfile.id,
        schoolId,
      },
      select: { id: true },
    });

    return Boolean(link);
  }

  async createIncident(data: {
    schoolId: string;
    studentId: string;
    reportedBy: string;
    incidentDate: Date;
    title: string;
    description: string;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    actionTaken?: string;
  }) {
    // Resolve studentProfile ID robustly
    const studentProfile = await this.prisma.studentProfile.findFirst({
      where: {
        schoolId: data.schoolId,
        OR: [
          { id: data.studentId },
          { userId: data.studentId },
          { studentId: data.studentId },
          { studentCode: data.studentId },
        ],
      },
      select: { id: true, userId: true },
    });

    if (!studentProfile) {
      throw new NotFoundException(`Student profile not found for identifier: ${data.studentId}`);
    }

    // Find parents linked to this student
    const parentLinks = await this.prisma.parentStudent.findMany({
      where: { studentId: studentProfile.id, schoolId: data.schoolId },
      include: { parent: { select: { userId: true } } },
    });

    const incident = await this.prisma.disciplineIncident.create({
      data: {
        schoolId: data.schoolId,
        studentId: studentProfile.id,
        reportedBy: data.reportedBy,
        incidentDate: data.incidentDate,
        title: data.title,
        description: data.description,
        severity: data.severity || 'MEDIUM',
        actionTaken: data.actionTaken,
        status: 'OPEN',
      },
      include: {
        student: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
        reporter: {
          select: { name: true, email: true },
        },
      },
    });

    // Notify all parents linked to this student
    const parentUserIds = parentLinks
      .map((link) => link.parent.userId)
      .filter(Boolean);

    if (parentUserIds.length > 0) {
      const studentName = incident.student?.user?.name || 'Student';
      const severityLabel = incident.severity.toLowerCase();
      await this.notificationService.createBulkNotifications({
        schoolId: data.schoolId,
        userIds: parentUserIds,
        title: 'Discipline Record',
        message: `A ${severityLabel} severity incident "${incident.title}" has been recorded for ${studentName}.`,
        type: 'DISCIPLINE_INCIDENT_CREATED',
        actionUrl: '/parent/discipline',
        metadata: {
          incidentId: incident.id,
          studentName,
          severity: incident.severity,
          title: incident.title,
        },
      });
    }

    return incident;
  }

  async getIncidents(schoolId: string, filters?: {
    studentId?: string;
    severity?: string;
    status?: string;
  }) {
    const where: any = { schoolId };
    
    if (filters?.studentId) {
      // Resolve studentProfile ID robustly
      const studentProfile = await this.prisma.studentProfile.findFirst({
        where: {
          schoolId,
          OR: [
            { id: filters.studentId },
            { userId: filters.studentId },
            { studentId: filters.studentId },
            { studentCode: filters.studentId },
          ],
        },
        select: { id: true },
      });
      where.studentId = studentProfile ? studentProfile.id : filters.studentId;
    }
    if (filters?.severity) {
      where.severity = filters.severity;
    }
    if (filters?.status) {
      where.status = filters.status;
    }

    return this.prisma.disciplineIncident.findMany({
      where,
      include: {
        student: {
          include: {
            user: {
              select: { name: true, email: true, avatarUrl: true },
            },
          },
        },
        reporter: {
          select: { name: true, email: true },
        },
      },
      orderBy: { incidentDate: 'desc' },
    });
  }

  async getIncidentById(id: string, schoolId: string) {
    return this.prisma.disciplineIncident.findFirst({
      where: { id, schoolId },
      include: {
        student: {
          include: {
            user: {
              select: { name: true, email: true, avatarUrl: true },
            },
          },
        },
        reporter: {
          select: { name: true, email: true },
        },
      },
    });
  }

  async updateIncident(id: string, schoolId: string, data: {
    title?: string;
    description?: string;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    status?: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'ESCALATED';
    actionTaken?: string;
    outcome?: string;
  }) {
    const existing = await this.prisma.disciplineIncident.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Discipline incident not found');

    return this.prisma.disciplineIncident.update({
      where: { id },
      data,
      include: {
        student: {
          include: {
            user: {
              select: { name: true },
            },
          },
        },
      },
    });
  }

  async deleteIncident(id: string, schoolId: string) {
    const existing = await this.prisma.disciplineIncident.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Discipline incident not found');

    return this.prisma.disciplineIncident.delete({
      where: { id },
    });
  }

  async getStudentIncidents(studentId: string, schoolId: string) {
    const studentProfile = await this.prisma.studentProfile.findFirst({
      where: {
        schoolId,
        OR: [
          { id: studentId },
          { userId: studentId },
          { studentId: studentId },
          { studentCode: studentId },
        ],
      },
      select: { id: true },
    });

    if (!studentProfile) return [];

    return this.prisma.disciplineIncident.findMany({
      where: { studentId: studentProfile.id, schoolId },
      orderBy: { incidentDate: 'desc' },
      include: {
        reporter: {
          select: { name: true },
        },
      },
    });
  }
}
