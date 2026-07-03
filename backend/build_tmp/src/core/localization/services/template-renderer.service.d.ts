import { Language, TranslationParams } from '../interfaces/localization.interface';
import { TranslationService } from './translation.service';
import { MessageFormatter } from './message-formatter.service';
export interface RenderedTemplate {
    subject: string;
    body: string;
    locale: Language;
}
export interface EmailTemplate {
    subjectKey: string;
    bodyKey: string;
}
export interface SMSTemplate {
    bodyKey: string;
}
export declare class TemplateRenderer {
    private readonly translationService;
    private readonly formatter;
    constructor(translationService: TranslationService, formatter: MessageFormatter);
    renderEmail(template: EmailTemplate, locale: Language, params?: TranslationParams): Promise<RenderedTemplate>;
    renderSMS(template: SMSTemplate, locale: Language, params?: TranslationParams): Promise<{
        body: string;
        locale: Language;
    }>;
    renderRaw(templateKey: string, locale: Language, params?: TranslationParams): Promise<string>;
    extractVariables(template: string): string[];
}
