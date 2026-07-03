import { PrismaService } from '../prisma/prisma.service';
import { EventBusService } from '../core/events/event-bus.service';
export declare class PermissionsService {
    private prismaService;
    private eventBus;
    constructor(prismaService: PrismaService, eventBus: EventBusService);
    createPermission(data: {
        name: string;
        description: string;
        module: string;
        action: string;
    }): Promise<{
        module: string;
        id: string;
        name: string;
        action: string;
        description: string | null;
    }>;
    getPermissions(): Promise<{
        module: string;
        id: string;
        name: string;
        action: string;
        description: string | null;
    }[]>;
    getPermissionById(id: string): Promise<{
        module: string;
        id: string;
        name: string;
        action: string;
        description: string | null;
    } | null>;
    getPermissionByName(name: string): Promise<{
        module: string;
        id: string;
        name: string;
        action: string;
        description: string | null;
    } | null>;
    updatePermission(id: string, data: {
        name?: string;
        description?: string;
        module?: string;
        action?: string;
    }): Promise<{
        module: string;
        id: string;
        name: string;
        action: string;
        description: string | null;
    }>;
    deletePermission(id: string): Promise<void>;
    getPermissionsByModule(module: string): Promise<{
        module: string;
        id: string;
        name: string;
        action: string;
        description: string | null;
    }[]>;
}
