import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DisciplineService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.disciplineIncident.create({
      data: {
        ...data,
        severity: data.severity || 'MEDIUM',
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
  }

  async getIncidents(schoolId: string, filters?: {
    studentId?: string;
    severity?: string;
    status?: string;
  }) {
    const where: any = { schoolId };
    
    if (filters?.studentId) {
      where.studentId = filters.studentId;
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

  async getIncidentById(id: string) {
    return this.prisma.disciplineIncident.findUnique({
      where: { id },
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

  async updateIncident(id: string, data: {
    title?: string;
    description?: string;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    status?: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'ESCALATED';
    actionTaken?: string;
    outcome?: string;
  }) {
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

  async deleteIncident(id: string) {
    return this.prisma.disciplineIncident.delete({
      where: { id },
    });
  }

  async getStudentIncidents(studentId: string) {
    return this.prisma.disciplineIncident.findMany({
      where: { studentId },
      orderBy: { incidentDate: 'desc' },
      include: {
        reporter: {
          select: { name: true },
        },
      },
    });
  }
}