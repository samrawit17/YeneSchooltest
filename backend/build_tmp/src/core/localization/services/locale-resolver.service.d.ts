import { Request } from 'express';
import { Language } from '../interfaces/localization.interface';
import { PrismaService } from '../../../prisma/prisma.service';
export declare class LocaleResolver {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    resolveFromRequest(request: Request, schoolId?: string, userId?: string): Promise<Language>;
    resolve(schoolId?: string, userId?: string): Promise<Language>;
    private fromHeader;
    private fromUser;
    fromSchool(schoolId: string): Promise<Language | null>;
    validateLocale(locale: string): locale is Language;
    normalizeLocale(locale: string): Language;
}
