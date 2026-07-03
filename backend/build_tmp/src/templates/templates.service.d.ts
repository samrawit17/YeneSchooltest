import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
export declare class TemplatesService {
    private readonly prisma;
    private readonly storageService;
    private schemaReady;
    private schemaInitPromise;
    constructor(prisma: PrismaService, storageService: StorageService);
    private ensureTemplateSchema;
    list(schoolId: string, type?: 'CERTIFICATE' | 'ID_CARD'): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        type: import("@prisma/client").$Enums.DocumentTemplateType;
        createdById: string | null;
        backgroundUrl: string;
        fieldMapJson: string | null;
    }[]>;
    upload(schoolId: string, createdById: string | undefined, input: {
        name: string;
        type: 'CERTIFICATE' | 'ID_CARD';
    }, file: Express.Multer.File): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        type: import("@prisma/client").$Enums.DocumentTemplateType;
        createdById: string | null;
        backgroundUrl: string;
        fieldMapJson: string | null;
    }>;
    activate(schoolId: string, templateId: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        type: import("@prisma/client").$Enums.DocumentTemplateType;
        createdById: string | null;
        backgroundUrl: string;
        fieldMapJson: string | null;
    } | null>;
    saveFieldMap(schoolId: string, templateId: string, fields: Array<Record<string, any>>): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        type: import("@prisma/client").$Enums.DocumentTemplateType;
        createdById: string | null;
        backgroundUrl: string;
        fieldMapJson: string | null;
    } | null>;
    getActiveTemplate(schoolId: string, type: 'CERTIFICATE' | 'ID_CARD'): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        type: import("@prisma/client").$Enums.DocumentTemplateType;
        createdById: string | null;
        backgroundUrl: string;
        fieldMapJson: string | null;
    } | null>;
}
