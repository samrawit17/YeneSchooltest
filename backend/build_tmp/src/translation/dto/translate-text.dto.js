"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslateBatchDto = exports.TranslateBatchItemDto = exports.TranslateTextDto = exports.SUPPORTED_TRANSLATION_LANGUAGES = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
exports.SUPPORTED_TRANSLATION_LANGUAGES = ['en', 'am', 'ar', 'om', 'so'];
class TranslateTextDto {
    text;
    sourceLanguage;
    targetLanguage;
    forceRefresh;
}
exports.TranslateTextDto = TranslateTextDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(5000),
    __metadata("design:type", String)
], TranslateTextDto.prototype, "text", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(exports.SUPPORTED_TRANSLATION_LANGUAGES),
    __metadata("design:type", String)
], TranslateTextDto.prototype, "sourceLanguage", void 0);
__decorate([
    (0, class_validator_1.IsIn)(exports.SUPPORTED_TRANSLATION_LANGUAGES),
    __metadata("design:type", String)
], TranslateTextDto.prototype, "targetLanguage", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], TranslateTextDto.prototype, "forceRefresh", void 0);
class TranslateBatchItemDto {
    text;
    key;
}
exports.TranslateBatchItemDto = TranslateBatchItemDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(5000),
    __metadata("design:type", String)
], TranslateBatchItemDto.prototype, "text", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TranslateBatchItemDto.prototype, "key", void 0);
class TranslateBatchDto {
    items;
    sourceLanguage;
    targetLanguage;
    forceRefresh;
}
exports.TranslateBatchDto = TranslateBatchDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => TranslateBatchItemDto),
    __metadata("design:type", Array)
], TranslateBatchDto.prototype, "items", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(exports.SUPPORTED_TRANSLATION_LANGUAGES),
    __metadata("design:type", String)
], TranslateBatchDto.prototype, "sourceLanguage", void 0);
__decorate([
    (0, class_validator_1.IsIn)(exports.SUPPORTED_TRANSLATION_LANGUAGES),
    __metadata("design:type", String)
], TranslateBatchDto.prototype, "targetLanguage", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], TranslateBatchDto.prototype, "forceRefresh", void 0);
//# sourceMappingURL=translate-text.dto.js.map