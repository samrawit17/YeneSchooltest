import { PrismaService } from '../prisma/prisma.service';
import { CreatePeriodTimeDto, UpdatePeriodTimeDto } from './dto/period-time.dto';
export declare class PeriodTimeService {
    private prisma;
    constructor(prisma: PrismaService);
    private readonly defaultMaxPeriodsPerDay;
    private timeToMinutes;
    private timesOverlap;
    private validatePeriodPayload;
    private getMaxPeriodsPerDay;
    private validateMaxPeriodsPerDay;
    private validatePeriodUniquenessAndOverlap;
    private assertNoCascadeSlotConflicts;
    private validateTimetableCascade;
    findAll(schoolId: string): Promise<{
        timetableSlotCount: number;
        canDelete: boolean;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startTime: string;
        endTime: string;
        periodNumber: number;
    }[]>;
    create(data: CreatePeriodTimeDto, schoolId: string): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startTime: string;
        endTime: string;
        periodNumber: number;
    }>;
    update(id: string, schoolId: string, data: UpdatePeriodTimeDto): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startTime: string;
        endTime: string;
        periodNumber: number;
    }>;
    delete(id: string, schoolId: string): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startTime: string;
        endTime: string;
        periodNumber: number;
    }>;
}
