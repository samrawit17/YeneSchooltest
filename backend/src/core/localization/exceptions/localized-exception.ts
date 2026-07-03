import { HttpException, HttpStatus } from '@nestjs/common';
import { TranslationParams } from '../interfaces/localization.interface';

export class LocalizedException extends HttpException {
  public readonly localizationKey: string;
  public readonly localizationParams?: TranslationParams;

  constructor(
    localizationKey: string,
    params?: TranslationParams,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly fallbackMessage?: string,
  ) {
    const response: Record<string, unknown> = {
      key: localizationKey,
      message: fallbackMessage || localizationKey,
      params,
      statusCode: status,
    };

    super(response, status);

    this.localizationKey = localizationKey;
    this.localizationParams = params;
    this.name = 'LocalizedException';
  }

  getKey(): string {
    return this.localizationKey;
  }

  getParams(): TranslationParams | undefined {
    return this.localizationParams;
  }
}
