import { AnnouncementService } from './announcement.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto/announcement.dto';
import { StorageService } from '../storage/storage.service';
import { Role } from '../auth/types/role.enum';
interface AuthenticatedRequest extends Request {
    user: {
        id: string;
        role: Role;
        schoolId?: string;
    };
}
export declare class AnnouncementController {
    private readonly announcementService;
    private readonly storageService;
    constructor(announcementService: AnnouncementService, storageService: StorageService);
    findPublic(schoolId?: string): Promise<{
        id: string;
        createdAt: Date;
        school: {
            name: string;
        };
        content: string;
        startDate: Date;
        endDate: Date | null;
        priority: string | null;
        title: string;
    }[]>;
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
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        academicYearId: string | null;
        startDate: Date;
        endDate: Date | null;
        priority: string | null;
        title: string;
        attachments: string | null;
        createdById: string;
        visibleTo: string | null;
        isPublic: boolean;
        location: string | null;
        isPinned: boolean;
        pinnedAt: Date | null;
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
        academicYear: {
            id: string;
            name: string;
            isActive: boolean;
        } | null;
        createdBy: {
            id: string;
            name: string;
            email: string | null;
        };
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        academicYearId: string | null;
        startDate: Date;
        endDate: Date | null;
        priority: string | null;
        title: string;
        attachments: string | null;
        createdById: string;
        isPublic: boolean;
        location: string | null;
        isPinned: boolean;
        pinnedAt: Date | null;
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
        academicYear: {
            id: string;
            name: string;
            isActive: boolean;
        } | null;
        createdBy: {
            id: string;
            name: string;
            email: string | null;
        };
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        academicYearId: string | null;
        startDate: Date;
        endDate: Date | null;
        priority: string | null;
        title: string;
        attachments: string | null;
        createdById: string;
        isPublic: boolean;
        location: string | null;
        isPinned: boolean;
        pinnedAt: Date | null;
    } | {
        success: boolean;
        message: string;
    }>;
    update(id: string, req: AuthenticatedRequest, body: UpdateAnnouncementDto): Promise<({
        school: {
            id: string;
            name: string;
        };
        academicYear: {
            id: string;
            name: string;
            isActive: boolean;
        } | null;
        createdBy: {
            id: string;
            name: string;
            email: string | null;
        };
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        academicYearId: string | null;
        startDate: Date;
        endDate: Date | null;
        priority: string | null;
        title: string;
        attachments: string | null;
        createdById: string;
        visibleTo: string | null;
        isPublic: boolean;
        location: string | null;
        isPinned: boolean;
        pinnedAt: Date | null;
    }) | {
        success: boolean;
        message: string;
    }>;
    delete(id: string, req: AuthenticatedRequest): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        academicYearId: string | null;
        startDate: Date;
        endDate: Date | null;
        priority: string | null;
        title: string;
        attachments: string | null;
        createdById: string;
        visibleTo: string | null;
        isPublic: boolean;
        location: string | null;
        isPinned: boolean;
        pinnedAt: Date | null;
    } | {
        success: boolean;
        message: string;
    }>;
    attachFile(id: string, file: Express.Multer.File, req: AuthenticatedRequest): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        academicYearId: string | null;
        startDate: Date;
        endDate: Date | null;
        priority: string | null;
        title: string;
        attachments: string | null;
        createdById: string;
        visibleTo: string | null;
        isPublic: boolean;
        location: string | null;
        isPinned: boolean;
        pinnedAt: Date | null;
    }>;
    removeAttachment(id: string, attachmentIndex: number, req: AuthenticatedRequest): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        academicYearId: string | null;
        startDate: Date;
        endDate: Date | null;
        priority: string | null;
        title: string;
        attachments: string | null;
        createdById: string;
        visibleTo: string | null;
        isPublic: boolean;
        location: string | null;
        isPinned: boolean;
        pinnedAt: Date | null;
    }>;
    togglePin(id: string, pinned: boolean, req: AuthenticatedRequest): Promise<{
        school: {
            id: string;
            name: string;
        };
        academicYear: {
            id: string;
            name: string;
            isActive: boolean;
        } | null;
        createdBy: {
            id: string;
            name: string;
            email: string | null;
        };
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        academicYearId: string | null;
        startDate: Date;
        endDate: Date | null;
        priority: string | null;
        title: string;
        attachments: string | null;
        createdById: string;
        visibleTo: string | null;
        isPublic: boolean;
        location: string | null;
        isPinned: boolean;
        pinnedAt: Date | null;
    }>;
}
export {};
