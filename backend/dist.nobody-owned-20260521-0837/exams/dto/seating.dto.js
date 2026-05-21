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
exports.StudentInSectionDto = exports.SectionWithStudentsDto = exports.SeatingOverviewResponseDto = exports.StudentAssignmentResponseDto = exports.SectionAssignmentResponseDto = exports.GenerateSeatingDto = exports.SeatingPlanResponseDto = exports.CreateSeatingPlanDto = exports.SeatingMode = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const client_1 = require("@prisma/client");
Object.defineProperty(exports, "SeatingMode", { enumerable: true, get: function () { return client_1.SeatingMode; } });
class CreateSeatingPlanDto {
    mode;
    fromGrade;
    toGrade;
    examCapacity;
    shuffle;
    useScoreThresholdFilter;
    scoreThreshold;
}
exports.CreateSeatingPlanDto = CreateSeatingPlanDto;
__decorate([
    (0, class_validator_1.IsEnum)(client_1.SeatingMode),
    __metadata("design:type", String)
], CreateSeatingPlanDto.prototype, "mode", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(12),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateSeatingPlanDto.prototype, "fromGrade", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(12),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateSeatingPlanDto.prototype, "toGrade", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateSeatingPlanDto.prototype, "examCapacity", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateSeatingPlanDto.prototype, "shuffle", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateSeatingPlanDto.prototype, "useScoreThresholdFilter", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateSeatingPlanDto.prototype, "scoreThreshold", void 0);
class SeatingPlanResponseDto {
    id;
    examId;
    examType;
    schoolId;
    mode;
    fromGrade;
    toGrade;
    examCapacity;
    shuffle;
    useScoreThresholdFilter;
    scoreThreshold;
    createdBy;
    createdAt;
    updatedAt;
    exam;
    assignments;
}
exports.SeatingPlanResponseDto = SeatingPlanResponseDto;
class GenerateSeatingDto {
    planId;
}
exports.GenerateSeatingDto = GenerateSeatingDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateSeatingDto.prototype, "planId", void 0);
class SectionAssignmentResponseDto {
    id;
    seatingPlanId;
    sectionId;
    section;
    students;
}
exports.SectionAssignmentResponseDto = SectionAssignmentResponseDto;
class StudentAssignmentResponseDto {
    id;
    assignmentId;
    studentId;
    orderIndex;
    student;
}
exports.StudentAssignmentResponseDto = StudentAssignmentResponseDto;
class SeatingOverviewResponseDto {
    plan;
    totalStudents;
    totalSections;
    totalCapacity;
    sections;
}
exports.SeatingOverviewResponseDto = SeatingOverviewResponseDto;
class SectionWithStudentsDto {
    sectionId;
    sectionName;
    className;
    grade;
    capacity;
    examCapacity;
    assignedStudents;
    students;
}
exports.SectionWithStudentsDto = SectionWithStudentsDto;
class StudentInSectionDto {
    orderIndex;
    studentId;
    studentName;
    studentEmail;
    originalSection;
    originalGrade;
}
exports.StudentInSectionDto = StudentInSectionDto;
//# sourceMappingURL=seating.dto.js.map