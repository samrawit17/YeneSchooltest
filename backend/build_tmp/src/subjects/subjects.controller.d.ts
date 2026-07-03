import { SubjectsService } from './subjects.service';
export declare class SubjectsController {
    private subjectsService;
    constructor(subjectsService: SubjectsService);
    create(req: any, body: {
        name: string;
        code?: string;
        isActive?: boolean;
        academicYearId?: string;
    }): Promise<{
        id: string;
        name: string;
        description: string | null;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        grade: number | null;
        code: string | null;
        academicYearId: string | null;
        credits: number | null;
        colorCode: string | null;
    } | {
        success: boolean;
        message: string;
    }>;
    findAll(req: any): Promise<({
        academicYear: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        name: string;
        description: string | null;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        grade: number | null;
        code: string | null;
        academicYearId: string | null;
        credits: number | null;
        colorCode: string | null;
    })[] | {
        success: boolean;
        message: string;
    }>;
    findOne(id: string): Promise<{
        school: {
            id: string;
            name: string;
            email: string;
            isActive: boolean;
            phone: string | null;
            createdAt: Date;
            updatedAt: Date;
            enrollmentKey: string | null;
            code: string | null;
            publicUrlSlug: string;
            address: string | null;
            timezone: string;
            logoUrl: string | null;
            settings: string | null;
            planId: string | null;
            planAssignedAt: Date | null;
        };
        academicYear: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        name: string;
        description: string | null;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        grade: number | null;
        code: string | null;
        academicYearId: string | null;
        credits: number | null;
        colorCode: string | null;
    }>;
    update(id: string, body: {
        name?: string;
        code?: string;
        isActive?: boolean;
    }): Promise<{
        id: string;
        name: string;
        description: string | null;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        grade: number | null;
        code: string | null;
        academicYearId: string | null;
        credits: number | null;
        colorCode: string | null;
    }>;
    delete(id: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        grade: number | null;
        code: string | null;
        academicYearId: string | null;
        credits: number | null;
        colorCode: string | null;
    }>;
}
