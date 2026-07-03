import { PrismaService } from './prisma/prisma.service';
export declare class SchoolInfoService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getSchoolById(id: string): Promise<{
        id: string;
        name: string;
        code: string | null;
        publicUrlSlug: string;
    } | null>;
}
