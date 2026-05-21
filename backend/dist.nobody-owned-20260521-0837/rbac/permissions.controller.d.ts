import { PermissionsService } from './permissions.service';
export declare class PermissionsController {
    private permissionsService;
    constructor(permissionsService: PermissionsService);
    createPermission(body: {
        name: string;
        description: string;
        module: string;
        action: string;
    }): Promise<{
        id: string;
        name: string;
        module: string;
        action: string;
        description: string | null;
    }>;
    getPermissions(): Promise<{
        id: string;
        name: string;
        module: string;
        action: string;
        description: string | null;
    }[]>;
    getPermissionById(id: string): Promise<{
        id: string;
        name: string;
        module: string;
        action: string;
        description: string | null;
    }>;
    getPermissionsByModule(module: string): Promise<{
        id: string;
        name: string;
        module: string;
        action: string;
        description: string | null;
    }[]>;
    updatePermission(id: string, body: {
        name?: string;
        description?: string;
        module?: string;
        action?: string;
    }): Promise<{
        id: string;
        name: string;
        module: string;
        action: string;
        description: string | null;
    }>;
    deletePermission(id: string): Promise<{
        message: string;
    }>;
}
