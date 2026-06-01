import { PrismaService } from '../prisma/prisma.service';
export declare class SubjectsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(data: {
        schoolId: string;
        name: string;
        code?: string;
        isActive?: boolean;
    }): Promise<{
        grade: number | null;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        code: string | null;
        isActive: boolean;
        description: string | null;
        credits: number | null;
        colorCode: string | null;
    }>;
    findAll(schoolId: string): Promise<{
        grade: number | null;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        code: string | null;
        isActive: boolean;
        description: string | null;
        credits: number | null;
        colorCode: string | null;
    }[]>;
    findOne(id: string): Promise<{
        school: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            email: string;
            enrollmentKey: string | null;
            code: string | null;
            phone: string | null;
            address: string | null;
            timezone: string;
            logoUrl: string | null;
            isActive: boolean;
            settings: string | null;
            planId: string | null;
            planAssignedAt: Date | null;
        };
    } & {
        grade: number | null;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        code: string | null;
        isActive: boolean;
        description: string | null;
        credits: number | null;
        colorCode: string | null;
    }>;
    update(id: string, data: {
        name?: string;
        code?: string;
        isActive?: boolean;
    }): Promise<{
        grade: number | null;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        code: string | null;
        isActive: boolean;
        description: string | null;
        credits: number | null;
        colorCode: string | null;
    }>;
    delete(id: string): Promise<{
        grade: number | null;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        code: string | null;
        isActive: boolean;
        description: string | null;
        credits: number | null;
        colorCode: string | null;
    }>;
}
