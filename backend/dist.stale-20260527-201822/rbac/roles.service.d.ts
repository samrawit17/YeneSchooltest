import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../auth/types/role.enum';
export declare class RolesService {
    private prismaService;
    constructor(prismaService: PrismaService);
    getRolePermissions(role: Role): Promise<({
        permission: {
            id: string;
            name: string;
            module: string;
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
            id: string;
            name: string;
            module: string;
            action: string;
            description: string | null;
        };
    } & {
        id: string;
        role: import("@prisma/client").$Enums.Role;
        permissionId: string;
    }>;
    removePermissionFromRole(role: Role, permissionId: string): Promise<{
        id: string;
        role: import("@prisma/client").$Enums.Role;
        permissionId: string;
    }>;
}
