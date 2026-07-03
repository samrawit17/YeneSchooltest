import { TranslateBatchDto, TranslateTextDto } from './dto/translate-text.dto';
import { TranslationService } from './translation.service';
export declare class TranslationController {
    private readonly translationService;
    constructor(translationService: TranslationService);
    getConfig(): {
        provider: "azure" | "google" | "disabled";
        enabled: boolean;
        supportedLanguages: readonly ["en", "am", "ar", "om", "so"];
    };
    translate(req: any, dto: TranslateTextDto): Promise<import("./translation.service").TranslationResult>;
    translateBatch(req: any, dto: TranslateBatchDto): Promise<{
        results: (import("./translation.service").TranslationResult & {
            key?: string;
        })[];
    }>;
    private getContext;
}
