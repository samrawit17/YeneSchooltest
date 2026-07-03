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
exports.ListAssessmentsFilterDto = exports.UpdateAssessmentWeightsDto = exports.AssessmentWeightDto = exports.SaveAssessmentScoresDto = exports.UpsertStudentAssessmentScoreDto = exports.AddAssessmentSubjectsDto = exports.UpdateAssessmentDto = exports.CreateAssessmentDto = exports.CreateAssessmentSubjectDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const client_1 = require("@prisma/client");
class CreateAssessmentSubjectDto {
    subjectId;
    classId;
    sectionId;
    gradeLevelId;
    teacherId;
    maxScore;
    passMark;
}
exports.CreateAssessmentSubjectDto = CreateAssessmentSubjectDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateAssessmentSubjectDto.prototype, "subjectId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateAssessmentSubjectDto.prototype, "classId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAssessmentSubjectDto.prototype, "sectionId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAssessmentSubjectDto.prototype, "gradeLevelId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAssessmentSubjectDto.prototype, "teacherId", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateAssessmentSubjectDto.prototype, "maxScore", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateAssessmentSubjectDto.prototype, "passMark", void 0);
class CreateAssessmentDto {
    title;
    type;
    academicYearId;
    termId;
    startDate;
    endDate;
    addToCalendar;
    subjects;
}
exports.CreateAssessmentDto = CreateAssessmentDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateAssessmentDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateAssessmentDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateAssessmentDto.prototype, "academicYearId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAssessmentDto.prototype, "termId", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateAssessmentDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateAssessmentDto.prototype, "endDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateAssessmentDto.prototype, "addToCalendar", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CreateAssessmentSubjectDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CreateAssessmentDto.prototype, "subjects", void 0);
class UpdateAssessmentDto {
    title;
    startDate;
    endDate;
    addToCalendar;
}
exports.UpdateAssessmentDto = UpdateAssessmentDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateAssessmentDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateAssessmentDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateAssessmentDto.prototype, "endDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateAssessmentDto.prototype, "addToCalendar", void 0);
class AddAssessmentSubjectsDto {
    subjects;
}
exports.AddAssessmentSubjectsDto = AddAssessmentSubjectsDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CreateAssessmentSubjectDto),
    __metadata("design:type", Array)
], AddAssessmentSubjectsDto.prototype, "subjects", void 0);
class UpsertStudentAssessmentScoreDto {
    studentId;
    score;
    isAbsent;
    remarks;
}
exports.UpsertStudentAssessmentScoreDto = UpsertStudentAssessmentScoreDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpsertStudentAssessmentScoreDto.prototype, "studentId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], UpsertStudentAssessmentScoreDto.prototype, "score", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpsertStudentAssessmentScoreDto.prototype, "isAbsent", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertStudentAssessmentScoreDto.prototype, "remarks", void 0);
class SaveAssessmentScoresDto {
    scores;
    status;
    registrarOverride;
}
exports.SaveAssessmentScoresDto = SaveAssessmentScoresDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => UpsertStudentAssessmentScoreDto),
    __metadata("design:type", Array)
], SaveAssessmentScoresDto.prototype, "scores", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.AssessmentScoreStatus),
    __metadata("design:type", String)
], SaveAssessmentScoresDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SaveAssessmentScoresDto.prototype, "registrarOverride", void 0);
class AssessmentWeightDto {
    type;
    percentage;
}
exports.AssessmentWeightDto = AssessmentWeightDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AssessmentWeightDto.prototype, "type", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], AssessmentWeightDto.prototype, "percentage", void 0);
class UpdateAssessmentWeightsDto {
    weights;
}
exports.UpdateAssessmentWeightsDto = UpdateAssessmentWeightsDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => AssessmentWeightDto),
    __metadata("design:type", Array)
], UpdateAssessmentWeightsDto.prototype, "weights", void 0);
class ListAssessmentsFilterDto {
    academicYearId;
    termId;
    type;
    status;
    page;
    limit;
}
exports.ListAssessmentsFilterDto = ListAssessmentsFilterDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ListAssessmentsFilterDto.prototype, "academicYearId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ListAssessmentsFilterDto.prototype, "termId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ListAssessmentsFilterDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.AssessmentStatus),
    __metadata("design:type", String)
], ListAssessmentsFilterDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], ListAssessmentsFilterDto.prototype, "page", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], ListAssessmentsFilterDto.prototype, "limit", void 0);
//# sourceMappingURL=assessments.dto.js.map