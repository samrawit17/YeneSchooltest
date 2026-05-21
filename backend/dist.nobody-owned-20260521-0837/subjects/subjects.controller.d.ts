import { SubjectsService } from './subjects.service';
export declare class SubjectsController {
    private subjectsService;
    constructor(subjectsService: SubjectsService);
    create(req: any, body: {
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
    } | {
        success: boolean;
        message: string;
    }>;
    findAll(req: any): Promise<{
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
    }[] | {
        success: boolean;
        message: string;
    }>;
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
    update(id: string, body: {
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
