import { PrismaService } from '../prisma/prisma.service';
import { SupportedTranslationLanguage, TranslateBatchDto, TranslateTextDto } from './dto/translate-text.dto';
type TranslationProvider = 'azure' | 'google' | 'disabled';
interface TranslationContext {
    userId: string;
    role?: string;
    schoolId: string | null;
}
export interface TranslationResult {
    translatedText: string;
    provider: TranslationProvider;
    sourceLanguage: string;
    targetLanguage: SupportedTranslationLanguage;
    fromCache: boolean;
    translated: boolean;
    reason?: 'disabled' | 'same_language' | 'unsupported_language' | 'protected_text' | 'provider_error';
}
export declare class TranslationService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getClientConfig(): {
        provider: TranslationProvider;
        enabled: boolean;
        supportedLanguages: readonly ["en", "am", "ar", "om", "so"];
    };
    translateBatch(context: TranslationContext, dto: TranslateBatchDto): Promise<{
        results: (TranslationResult & {
            key?: string;
        })[];
    }>;
    translateText(context: TranslationContext, dto: TranslateTextDto): Promise<TranslationResult>;
    private getProvider;
    private hasProviderCredentials;
    private providerSupportsLanguage;
    private staticResult;
    private hashText;
    private findCachedTranslation;
    private createCachedTranslation;
    private protectSegments;
    private restoreSegments;
    private isOnlyProtectedText;
    private translateWithAzure;
    private translateWithGoogle;
    private decodeHtmlEntities;
}
export {};
