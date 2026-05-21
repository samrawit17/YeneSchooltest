import { EventService } from './event.service';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';
import { Role } from '../auth/types/role.enum';
interface AuthenticatedRequest extends Request {
    user: {
        id: string;
        role: Role;
        schoolId?: string;
    };
}
export declare class EventController {
    private eventService;
    constructor(eventService: EventService);
    create(req: AuthenticatedRequest, body: CreateEventDto): Promise<({
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
        startDate: Date;
        endDate: Date | null;
        title: string;
        category: string | null;
        description: string | null;
        color: string | null;
        createdById: string;
        location: string | null;
        audience: string | null;
    }) | {
        success: boolean;
        message: string;
    }>;
    findAll(req: AuthenticatedRequest, role?: string): Promise<({
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
        startDate: Date;
        endDate: Date | null;
        title: string;
        category: string | null;
        description: string | null;
        color: string | null;
        createdById: string;
        location: string | null;
        audience: string | null;
    })[] | {
        success: boolean;
        message: string;
    }>;
    getUpcomingCount(req: AuthenticatedRequest, role?: string): Promise<{
        success: boolean;
        message: string;
        count?: undefined;
    } | {
        count: number;
        success?: undefined;
        message?: undefined;
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
    findOne(id: string, req: AuthenticatedRequest): Promise<({
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
        startDate: Date;
        endDate: Date | null;
        title: string;
        category: string | null;
        description: string | null;
        color: string | null;
        createdById: string;
        location: string | null;
        audience: string | null;
    }) | {
        success: boolean;
        message: string;
    }>;
    update(id: string, req: AuthenticatedRequest, body: UpdateEventDto): Promise<({
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
        startDate: Date;
        endDate: Date | null;
        title: string;
        category: string | null;
        description: string | null;
        color: string | null;
        createdById: string;
        location: string | null;
        audience: string | null;
    }) | {
        success: boolean;
        message: string;
    }>;
    delete(id: string, req: AuthenticatedRequest): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date | null;
        title: string;
        category: string | null;
        description: string | null;
        color: string | null;
        createdById: string;
        location: string | null;
        audience: string | null;
    } | {
        success: boolean;
        message: string;
    }>;
}
export {};
