import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PeriodTimeService {
  constructor(private prisma: PrismaService) {}

  async findAll(schoolId: string) {
    return this.prisma.periodTime.findMany({
      where: { schoolId },
      orderBy: { periodNumber: 'asc' },
    });
  }

  async create(data: any, schoolId: string) {
    return this.prisma.periodTime.create({
      data: {
        schoolId,
        periodNumber: data.periodNumber,
        startTime: data.startTime,
        endTime: data.endTime,
      },
    });
  }

  async update(id: string, schoolId: string, data: any) {
    const existing = await this.prisma.periodTime.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Period time not found');

    return this.prisma.periodTime.update({
      where: { id },
      data: {
        periodNumber: data.periodNumber,
        startTime: data.startTime,
        endTime: data.endTime,
      },
    });
  }

  async delete(id: string, schoolId: string) {
    const existing = await this.prisma.periodTime.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Period time not found');

    return this.prisma.periodTime.delete({ where: { id } });
  }
}
