import { PrismaService } from '../prisma/prisma.service';
import { EventBusService } from '../core/events/event-bus.service';
import { Role } from '../auth/types/role.enum';
export declare class RolesService {
    private prismaService;
    private eventBus;
    constructor(prismaService: PrismaService, eventBus: EventBusService);
    getRolePermissions(role: Role): Promise<({
        permission: {
            module: string;
            id: string;
            name: string;
            action: string;
            description: string | null;
        };
    } & {
        id: string;
        role: import("@prisma/client").$Enums.Role;
        permissionId: string;
    })[]>;
    assignPermissionToRole(role: Role, permissionId: string): Promise<{
        permission: {
            module: string;
            id: string;
            name: string;
            action: string;
            description: string | null;
        };
    } & {
        id: string;
        role: import("@prisma/client").$Enums.Role;
        permissionId: string;
    }>;
    removePermissionFromRole(role: Role, permissionId: string): Promise<void>;
}
