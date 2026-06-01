import { PrismaService } from '../prisma/prisma.service';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import { SubscriptionService } from '../subscription/subscription.service';
export interface CreateSchoolDto {
    name: string;
    email: string;
    address?: string;
    phone?: string;
}
export interface UpdateSchoolDto {
    name?: string;
    email?: string;
    address?: string;
    phone?: string;
    code?: string;
    logoUrl?: string;
}
export declare class SchoolService {
    private prismaService;
    private platformSettingsService;
    private subscriptionService;
    constructor(prismaService: PrismaService, platformSettingsService: PlatformSettingsService, subscriptionService: SubscriptionService);
    createSchool(createSchoolDto: CreateSchoolDto): Promise<({
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
    private enforceMaxSchoolsAllowed;
    private parsePositiveInteger;
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
    } | null>;
    getSchoolByEnrollmentKey(enrollmentKey: string): Promise<{
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
    } | null>;
    updateSchool(id: string, data: UpdateSchoolDto): Promise<{
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
    deleteSchool(id: string): Promise<{
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
    uploadLogo(schoolId: string, file: Express.Multer.File): Promise<string>;
}
