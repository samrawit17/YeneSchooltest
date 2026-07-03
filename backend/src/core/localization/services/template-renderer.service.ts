import { Injectable } from '@nestjs/common';
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

@Injectable()
export class TemplateRenderer {
  constructor(
    private readonly translationService: TranslationService,
    private readonly formatter: MessageFormatter,
  ) {}

  async renderEmail(
    template: EmailTemplate,
    locale: Language,
    params?: TranslationParams,
  ): Promise<RenderedTemplate> {
    const [subject, body] = await Promise.all([
      this.translationService.translate(template.subjectKey, locale, params),
      this.translationService.translate(template.bodyKey, locale, params),
    ]);

    return { subject, body, locale };
  }

  async renderSMS(
    template: SMSTemplate,
    locale: Language,
    params?: TranslationParams,
  ): Promise<{ body: string; locale: Language }> {
    const body = await this.translationService.translate(template.bodyKey, locale, params);
    return { body, locale };
  }

  async renderRaw(
    templateKey: string,
    locale: Language,
    params?: TranslationParams,
  ): Promise<string> {
    return this.translationService.translate(templateKey, locale, params);
  }

  extractVariables(template: string): string[] {
    return this.formatter.extractParams(template);
  }
}
