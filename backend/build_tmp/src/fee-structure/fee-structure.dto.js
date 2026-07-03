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
exports.CurriculumType = exports.FeeCollectionMode = exports.GenerateInstallmentFeesDto = exports.CalculateInstallmentFeesDto = exports.UpdateFeeStructureDto = exports.CreateFeeStructureDto = void 0;
const class_validator_1 = require("class-validator");
class CreateFeeStructureDto {
    schoolId;
    academicYearId;
    termId;
    feeType;
    amount;
    grade;
    semester;
    description;
}
exports.CreateFeeStructureDto = CreateFeeStructureDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateFeeStructureDto.prototype, "schoolId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateFeeStructureDto.prototype, "academicYearId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateFeeStructureDto.prototype, "termId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateFeeStructureDto.prototype, "feeType", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateFeeStructureDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(12),
    __metadata("design:type", Number)
], CreateFeeStructureDto.prototype, "grade", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(3),
    __metadata("design:type", Number)
], CreateFeeStructureDto.prototype, "semester", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateFeeStructureDto.prototype, "description", void 0);
class UpdateFeeStructureDto {
    feeType;
    amount;
    grade;
    semester;
    description;
    isActive;
}
exports.UpdateFeeStructureDto = UpdateFeeStructureDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateFeeStructureDto.prototype, "feeType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateFeeStructureDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(12),
    __metadata("design:type", Object)
], UpdateFeeStructureDto.prototype, "grade", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(3),
    __metadata("design:type", Object)
], UpdateFeeStructureDto.prototype, "semester", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpdateFeeStructureDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateFeeStructureDto.prototype, "isActive", void 0);
class CalculateInstallmentFeesDto {
    schoolId;
    academicYearId;
    feeType;
    annualAmount;
    grade;
    description;
}
exports.CalculateInstallmentFeesDto = CalculateInstallmentFeesDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CalculateInstallmentFeesDto.prototype, "schoolId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CalculateInstallmentFeesDto.prototype, "academicYearId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CalculateInstallmentFeesDto.prototype, "feeType", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CalculateInstallmentFeesDto.prototype, "annualAmount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(12),
    __metadata("design:type", Number)
], CalculateInstallmentFeesDto.prototype, "grade", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CalculateInstallmentFeesDto.prototype, "description", void 0);
class GenerateInstallmentFeesDto {
    schoolId;
    academicYearId;
    feeType;
    annualAmount;
    description;
    grade;
}
exports.GenerateInstallmentFeesDto = GenerateInstallmentFeesDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateInstallmentFeesDto.prototype, "schoolId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateInstallmentFeesDto.prototype, "academicYearId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateInstallmentFeesDto.prototype, "feeType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], GenerateInstallmentFeesDto.prototype, "annualAmount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateInstallmentFeesDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(12),
    __metadata("design:type", Number)
], GenerateInstallmentFeesDto.prototype, "grade", void 0);
var FeeCollectionMode;
(function (FeeCollectionMode) {
    FeeCollectionMode["MONTHLY"] = "MONTHLY";
    FeeCollectionMode["QUARTERLY"] = "QUARTERLY";
    FeeCollectionMode["SEMESTERLY"] = "SEMESTERLY";
    FeeCollectionMode["TERMLY"] = "TERMLY";
    FeeCollectionMode["YEARLY"] = "YEARLY";
})(FeeCollectionMode || (exports.FeeCollectionMode = FeeCollectionMode = {}));
var CurriculumType;
(function (CurriculumType) {
    CurriculumType["TERM"] = "TERM";
    CurriculumType["QUARTER"] = "QUARTER";
    CurriculumType["SEMESTER"] = "SEMESTER";
})(CurriculumType || (exports.CurriculumType = CurriculumType = {}));
//# sourceMappingURL=fee-structure.dto.js.map