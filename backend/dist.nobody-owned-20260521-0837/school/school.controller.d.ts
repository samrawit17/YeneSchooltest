import { SchoolService } from './school.service';
export declare class SchoolController {
    private readonly schoolService;
    constructor(schoolService: SchoolService);
    createSchool(body: {
        name: string;
        email: string;
        address?: string;
        phone?: string;
    }): Promise<({
        plan: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            isActive: boolean;
            description: string | null;
            tier: import("@prisma/client").$Enums.PlanTier;
            features: string[];
        } | null;
    } & {
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
    }) | null>;
    getSchools(): Promise<({
        plan: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            isActive: boolean;
            description: string | null;
            tier: import("@prisma/client").$Enums.PlanTier;
            features: string[];
        } | null;
    } & {
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
    })[]>;
    getSchoolById(id: string): Promise<{
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
    }>;
    updateSchool(id: string, body: {
        name?: string;
        email?: string;
        address?: string;
        phone?: string;
        code?: string;
        logo?: string;
        logoUrl?: string;
    }, req: any): Promise<{
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
    }>;
    uploadLogo(id: string, file: Express.Multer.File, req: any): Promise<{
        url: string;
    }>;
    deleteSchool(id: string): Promise<{
        message: string;
    }>;
}
