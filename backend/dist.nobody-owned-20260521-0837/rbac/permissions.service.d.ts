import { PrismaService } from '../prisma/prisma.service';
export declare class PermissionsService {
    private prismaService;
    constructor(prismaService: PrismaService);
    createPermission(data: {
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
    } | null>;
    getPermissionByName(name: string): Promise<{
        id: string;
        name: string;
        module: string;
        action: string;
        description: string | null;
    } | null>;
    updatePermission(id: string, data: {
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
}
