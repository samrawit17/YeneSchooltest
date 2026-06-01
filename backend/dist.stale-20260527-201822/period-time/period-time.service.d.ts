import { PrismaService } from '../prisma/prisma.service';
export declare class PeriodTimeService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(schoolId: string): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startTime: string;
        endTime: string;
        periodNumber: number;
    }[]>;
    create(data: any, schoolId: string): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startTime: string;
        endTime: string;
        periodNumber: number;
    }>;
    update(id: string, schoolId: string, data: any): Promise<{
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
