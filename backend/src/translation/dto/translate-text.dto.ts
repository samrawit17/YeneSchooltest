import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export const SUPPORTED_TRANSLATION_LANGUAGES = ['en', 'am', 'ar', 'om', 'so'] as const;
export type SupportedTranslationLanguage = (typeof SUPPORTED_TRANSLATION_LANGUAGES)[number];

export class TranslateTextDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  text: string;

  @IsOptional()
  @IsIn(SUPPORTED_TRANSLATION_LANGUAGES)
  sourceLanguage?: SupportedTranslationLanguage;

  @IsIn(SUPPORTED_TRANSLATION_LANGUAGES)
  targetLanguage: SupportedTranslationLanguage;

  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean;
}

export class TranslateBatchItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  text: string;

  @IsOptional()
  @IsString()
  key?: string;
}

export class TranslateBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranslateBatchItemDto)
  items: TranslateBatchItemDto[];

  @IsOptional()
  @IsIn(SUPPORTED_TRANSLATION_LANGUAGES)
  sourceLanguage?: SupportedTranslationLanguage;

  @IsIn(SUPPORTED_TRANSLATION_LANGUAGES)
  targetLanguage: SupportedTranslationLanguage;

  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean;
}
