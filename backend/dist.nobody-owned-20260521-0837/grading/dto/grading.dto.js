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
exports.TeacherAssignmentDto = exports.GradeScaleDto = exports.GradingComponentDto = exports.ApproveGradeDto = exports.GradeFilterDto = exports.GradeComponentScoreDto = exports.BulkGradeEntryDto = exports.UpdateGradeDto = exports.CreateGradeDto = exports.GradeStatus = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var GradeStatus;
(function (GradeStatus) {
    GradeStatus["DRAFT"] = "DRAFT";
    GradeStatus["SUBMITTED"] = "SUBMITTED";
    GradeStatus["APPROVED"] = "APPROVED";
    GradeStatus["REJECTED"] = "REJECTED";
})(GradeStatus || (exports.GradeStatus = GradeStatus = {}));
class CreateGradeDto {
    studentId;
    subjectId;
    classId;
    sectionId;
    academicYear;
    termId;
    caScore;
    midScore;
    finalScore;
    remark;
    componentScores;
}
exports.CreateGradeDto = CreateGradeDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateGradeDto.prototype, "studentId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateGradeDto.prototype, "subjectId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateGradeDto.prototype, "classId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateGradeDto.prototype, "sectionId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateGradeDto.prototype, "academicYear", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateGradeDto.prototype, "termId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateGradeDto.prototype, "caScore", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateGradeDto.prototype, "midScore", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateGradeDto.prototype, "finalScore", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateGradeDto.prototype, "remark", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => GradeComponentScoreDto),
    __metadata("design:type", Array)
], CreateGradeDto.prototype, "componentScores", void 0);
class UpdateGradeDto {
    caScore;
    midScore;
    finalScore;
    remark;
}
exports.UpdateGradeDto = UpdateGradeDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], UpdateGradeDto.prototype, "caScore", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], UpdateGradeDto.prototype, "midScore", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], UpdateGradeDto.prototype, "finalScore", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateGradeDto.prototype, "remark", void 0);
class BulkGradeEntryDto {
    grades;
}
exports.BulkGradeEntryDto = BulkGradeEntryDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CreateGradeDto),
    __metadata("design:type", Array)
], BulkGradeEntryDto.prototype, "grades", void 0);
class GradeComponentScoreDto {
    code;
    assessmentSubjectId;
    score;
}
exports.GradeComponentScoreDto = GradeComponentScoreDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GradeComponentScoreDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GradeComponentScoreDto.prototype, "assessmentSubjectId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Object)
], GradeComponentScoreDto.prototype, "score", void 0);
class GradeFilterDto {
    academicYear;
    termId;
    classId;
    sectionId;
    subjectId;
    teacherId;
    status;
    studentId;
}
exports.GradeFilterDto = GradeFilterDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GradeFilterDto.prototype, "academicYear", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GradeFilterDto.prototype, "termId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GradeFilterDto.prototype, "classId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GradeFilterDto.prototype, "sectionId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GradeFilterDto.prototype, "subjectId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GradeFilterDto.prototype, "teacherId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GradeFilterDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GradeFilterDto.prototype, "studentId", void 0);
class ApproveGradeDto {
    status;
    registrarComment;
}
exports.ApproveGradeDto = ApproveGradeDto;
__decorate([
    (0, class_validator_1.IsEnum)(GradeStatus),
    __metadata("design:type", String)
], ApproveGradeDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ApproveGradeDto.prototype, "registrarComment", void 0);
class GradingComponentDto {
    name;
    code;
    percentage;
}
exports.GradingComponentDto = GradingComponentDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GradingComponentDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GradingComponentDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], GradingComponentDto.prototype, "percentage", void 0);
class GradeScaleDto {
    gradeLetter;
    minScore;
    maxScore;
    gradePoint;
    description;
}
exports.GradeScaleDto = GradeScaleDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GradeScaleDto.prototype, "gradeLetter", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], GradeScaleDto.prototype, "minScore", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], GradeScaleDto.prototype, "maxScore", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], GradeScaleDto.prototype, "gradePoint", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GradeScaleDto.prototype, "description", void 0);
class TeacherAssignmentDto {
    teacherId;
    subjectId;
    classId;
    sectionId;
    academicYear;
}
exports.TeacherAssignmentDto = TeacherAssignmentDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TeacherAssignmentDto.prototype, "teacherId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TeacherAssignmentDto.prototype, "subjectId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TeacherAssignmentDto.prototype, "classId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TeacherAssignmentDto.prototype, "sectionId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TeacherAssignmentDto.prototype, "academicYear", void 0);
//# sourceMappingURL=grading.dto.js.map