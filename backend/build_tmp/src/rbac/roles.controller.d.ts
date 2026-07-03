import { Role } from '../auth/types/role.enum';
import { RolesService } from './roles.service';
export declare class RolesController {
    private rolesService;
    constructor(rolesService: RolesService);
    getAllRoles(): Promise<{
        role: Role;
        permissions: {
            module: string;
            id: string;
            name: string;
            action: string;
            description: string | null;
        }[];
    }[]>;
    getRolePermissions(role: Role): Promise<{
        module: string;
        id: string;
        name: string;
        action: string;
        description: string | null;
    }[]>;
    assignPermissionToRole(role: Role, body: {
        permissionId: string;
    }): Promise<{
        role: import("@prisma/client").$Enums.Role;
        permission: {
            module: string;
            id: string;
            name: string;
            action: string;
            description: string | null;
        };
    }>;
    removePermissionFromRole(role: Role, permissionId: string): Promise<{
        message: string;
    }>;
}
