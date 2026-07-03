import { SchoolService } from './school.service';
export declare class SchoolController {
    private readonly schoolService;
    constructor(schoolService: SchoolService);
    private ensureCanReadSchool;
    private getMutationContext;
    createSchool(body: {
        name: string;
        email: string;
        address?: string;
        phone?: string;
    }): Promise<({
        plan: {
            id: string;
            name: string;
            description: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            tier: import("@prisma/client").$Enums.PlanTier;
            features: string[];
        } | null;
    } & {
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
    }) | null>;
    getSchools(page?: string, limit?: string): Promise<{
        data: {
            studentCount: number;
            plan: {
                id: string;
                name: string;
                description: string | null;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                tier: import("@prisma/client").$Enums.PlanTier;
                features: string[];
            } | null;
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
        }[];
        total: number;
        activeTotal: number;
        totalStudents: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getSchoolById(id: string, req: any): Promise<{
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
    }>;
    updateSchool(id: string, body: {
        name?: string;
        email?: string;
        address?: string;
        phone?: string;
        code?: string;
        publicUrlSlug?: string;
        logo?: string;
        logoUrl?: string;
    }, req: any): Promise<{
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
    }>;
    uploadLogo(id: string, file: Express.Multer.File, req: any): Promise<{
        url: string;
    }>;
    deleteSchool(id: string): Promise<{
        message: string;
    }>;
}
