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
exports.UpdatePeriodTimeDto = exports.CreatePeriodTimeDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
class CreatePeriodTimeDto {
    periodNumber;
    startTime;
    endTime;
}
exports.CreatePeriodTimeDto = CreatePeriodTimeDto;
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(12),
    __metadata("design:type", Number)
], CreatePeriodTimeDto.prototype, "periodNumber", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(TIME_PATTERN, { message: 'startTime must be in HH:mm format' }),
    __metadata("design:type", String)
], CreatePeriodTimeDto.prototype, "startTime", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(TIME_PATTERN, { message: 'endTime must be in HH:mm format' }),
    __metadata("design:type", String)
], CreatePeriodTimeDto.prototype, "endTime", void 0);
class UpdatePeriodTimeDto {
    periodNumber;
    startTime;
    endTime;
}
exports.UpdatePeriodTimeDto = UpdatePeriodTimeDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(12),
    __metadata("design:type", Number)
], UpdatePeriodTimeDto.prototype, "periodNumber", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(TIME_PATTERN, { message: 'startTime must be in HH:mm format' }),
    __metadata("design:type", String)
], UpdatePeriodTimeDto.prototype, "startTime", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(TIME_PATTERN, { message: 'endTime must be in HH:mm format' }),
    __metadata("design:type", String)
], UpdatePeriodTimeDto.prototype, "endTime", void 0);
//# sourceMappingURL=period-time.dto.js.map