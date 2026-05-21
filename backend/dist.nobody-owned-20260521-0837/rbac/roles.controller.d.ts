import { Role } from '../auth/types/role.enum';
import { RolesService } from './roles.service';
export declare class RolesController {
    private rolesService;
    constructor(rolesService: RolesService);
    getAllRoles(): Promise<{
        role: Role;
        permissions: {
            id: string;
            name: string;
            module: string;
            action: string;
            description: string | null;
        }[];
    }[]>;
    getRolePermissions(role: Role): Promise<{
        id: string;
        name: string;
        module: string;
        action: string;
        description: string | null;
    }[]>;
    assignPermissionToRole(role: Role, body: {
        permissionId: string;
    }): Promise<{
        role: import("@prisma/client").$Enums.Role;
        permission: {
            id: string;
            name: string;
            module: string;
            action: string;
            description: string | null;
        };
    }>;
    removePermissionFromRole(role: Role, permissionId: string): Promise<{
        message: string;
    }>;
}
