import { TemplatesService } from './templates.service';
export declare class TemplatesController {
    private readonly templatesService;
    constructor(templatesService: TemplatesService);
    list(req: any, type?: 'CERTIFICATE' | 'ID_CARD'): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        type: import("@prisma/client").$Enums.DocumentTemplateType;
        createdById: string | null;
        backgroundUrl: string;
        fieldMapJson: string | null;
    }[]>;
    upload(req: any, file: Express.Multer.File, body: {
        name: string;
        type: 'CERTIFICATE' | 'ID_CARD';
    }): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        type: import("@prisma/client").$Enums.DocumentTemplateType;
        createdById: string | null;
        backgroundUrl: string;
        fieldMapJson: string | null;
    }>;
    activate(req: any, id: string): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        type: import("@prisma/client").$Enums.DocumentTemplateType;
        createdById: string | null;
        backgroundUrl: string;
        fieldMapJson: string | null;
    } | null>;
    saveFields(req: any, body: {
        template_id: string;
        fields: Array<Record<string, any>>;
    }): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        type: import("@prisma/client").$Enums.DocumentTemplateType;
        createdById: string | null;
        backgroundUrl: string;
        fieldMapJson: string | null;
    } | null>;
}
