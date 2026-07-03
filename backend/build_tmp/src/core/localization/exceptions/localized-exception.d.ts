import { HttpException, HttpStatus } from '@nestjs/common';
import { TranslationParams } from '../interfaces/localization.interface';
export declare class LocalizedException extends HttpException {
    readonly fallbackMessage?: string | undefined;
    readonly localizationKey: string;
    readonly localizationParams?: TranslationParams;
    constructor(localizationKey: string, params?: TranslationParams, status?: HttpStatus, fallbackMessage?: string | undefined);
    getKey(): string;
    getParams(): TranslationParams | undefined;
}
