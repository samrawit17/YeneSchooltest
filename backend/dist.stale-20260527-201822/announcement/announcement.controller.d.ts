import { AnnouncementService } from './announcement.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto/announcement.dto';
import { Role } from '../auth/types/role.enum';
interface AuthenticatedRequest extends Request {
    user: {
        id: string;
        role: Role;
        schoolId?: string;
    };
}
export declare class AnnouncementController {
    private announcementService;
    constructor(announcementService: AnnouncementService);
    create(req: AuthenticatedRequest, body: CreateAnnouncementDto): Promise<({
        school: {
            id: string;
            name: string;
        };
        createdBy: {
            id: string;
            name: string;
            email: string | null;
        };
    } & {
        content: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date | null;
        title: string;
        createdById: string;
        visibleTo: string | null;
        priority: string | null;
        attachments: string | null;
    }) | {
        success: boolean;
        message: string;
    }>;
    findAll(req: AuthenticatedRequest, role?: string): Promise<{
        visibleTo: string[];
        school: {
            id: string;
            name: string;
        };
        createdBy: {
            id: string;
            name: string;
            email: string | null;
        };
        content: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date | null;
        title: string;
        createdById: string;
        priority: string | null;
        attachments: string | null;
    }[] | {
        success: boolean;
        message: string;
    }>;
    getActiveCount(req: AuthenticatedRequest, role?: string): Promise<{
        success: boolean;
        message: string;
        count?: undefined;
    } | {
        count: number;
        success?: undefined;
        message?: undefined;
    }>;
    findOne(id: string, req: AuthenticatedRequest): Promise<{
        visibleTo: string[];
        school: {
            id: string;
            name: string;
        };
        createdBy: {
            id: string;
            name: string;
            email: string | null;
        };
        content: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date | null;
        title: string;
        createdById: string;
        priority: string | null;
        attachments: string | null;
    } | {
        success: boolean;
        message: string;
    }>;
    update(id: string, req: AuthenticatedRequest, body: UpdateAnnouncementDto): Promise<({
        school: {
            id: string;
            name: string;
        };
        createdBy: {
            id: string;
            name: string;
            email: string | null;
        };
    } & {
        content: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date | null;
        title: string;
        createdById: string;
        visibleTo: string | null;
        priority: string | null;
        attachments: string | null;
    }) | {
        success: boolean;
        message: string;
    }>;
    delete(id: string, req: AuthenticatedRequest): Promise<{
        content: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date | null;
        title: string;
        createdById: string;
        visibleTo: string | null;
        priority: string | null;
        attachments: string | null;
    } | {
        success: boolean;
        message: string;
    }>;
}
export {};
