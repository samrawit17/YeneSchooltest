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
exports.ImportNationalExamResultsDto = exports.NationalExamResultImportRowDto = exports.NationalExamSubjectResultDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const client_1 = require("@prisma/client");
class NationalExamSubjectResultDto {
    subjectName;
    score;
    gradeLetter;
}
exports.NationalExamSubjectResultDto = NationalExamSubjectResultDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], NationalExamSubjectResultDto.prototype, "subjectName", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], NationalExamSubjectResultDto.prototype, "score", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], NationalExamSubjectResultDto.prototype, "gradeLetter", void 0);
class NationalExamResultImportRowDto {
    candidateNumber;
    studentName;
    grade;
    stream;
    totalScore;
    status;
    remarks;
    subjects;
}
exports.NationalExamResultImportRowDto = NationalExamResultImportRowDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], NationalExamResultImportRowDto.prototype, "candidateNumber", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], NationalExamResultImportRowDto.prototype, "studentName", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], NationalExamResultImportRowDto.prototype, "grade", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], NationalExamResultImportRowDto.prototype, "stream", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], NationalExamResultImportRowDto.prototype, "totalScore", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], NationalExamResultImportRowDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], NationalExamResultImportRowDto.prototype, "remarks", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => NationalExamSubjectResultDto),
    __metadata("design:type", Array)
], NationalExamResultImportRowDto.prototype, "subjects", void 0);
class ImportNationalExamResultsDto {
    examType;
    examYear;
    academicYearId;
    source;
    fileName;
    cutoffScore;
    rows;
}
exports.ImportNationalExamResultsDto = ImportNationalExamResultsDto;
__decorate([
    (0, class_validator_1.IsEnum)(client_1.NationalExamType),
    __metadata("design:type", String)
], ImportNationalExamResultsDto.prototype, "examType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ImportNationalExamResultsDto.prototype, "examYear", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ImportNationalExamResultsDto.prototype, "academicYearId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.NationalExamSource),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ImportNationalExamResultsDto.prototype, "source", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ImportNationalExamResultsDto.prototype, "fileName", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], ImportNationalExamResultsDto.prototype, "cutoffScore", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => NationalExamResultImportRowDto),
    __metadata("design:type", Array)
], ImportNationalExamResultsDto.prototype, "rows", void 0);
//# sourceMappingURL=national-exam-results.dto.js.map