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
exports.LessonCoverageQueryDto = exports.GradeHomeworkDto = exports.SubmitHomeworkDto = exports.UpdateLessonBundleDto = exports.CreateLessonBundleDto = exports.CreateResourceDto = exports.CreateHomeworkDto = exports.SubmissionStatus = exports.ResourceType = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const client_1 = require("@prisma/client");
var ResourceType;
(function (ResourceType) {
    ResourceType["WORKSHEET"] = "WORKSHEET";
    ResourceType["READING_MATERIAL"] = "READING_MATERIAL";
    ResourceType["HANDOUT"] = "HANDOUT";
    ResourceType["EXAM_PREP"] = "EXAM_PREP";
    ResourceType["OTHER"] = "OTHER";
})(ResourceType || (exports.ResourceType = ResourceType = {}));
var SubmissionStatus;
(function (SubmissionStatus) {
    SubmissionStatus["PENDING"] = "PENDING";
    SubmissionStatus["SUBMITTED"] = "SUBMITTED";
    SubmissionStatus["GRADED"] = "GRADED";
    SubmissionStatus["LATE"] = "LATE";
    SubmissionStatus["MISSING"] = "MISSING";
})(SubmissionStatus || (exports.SubmissionStatus = SubmissionStatus = {}));
class CreateHomeworkDto {
    title;
    description;
    instructions;
    dueDate;
    totalPoints;
    isExamPrep;
    isLocked;
}
exports.CreateHomeworkDto = CreateHomeworkDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateHomeworkDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateHomeworkDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateHomeworkDto.prototype, "instructions", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateHomeworkDto.prototype, "dueDate", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateHomeworkDto.prototype, "totalPoints", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateHomeworkDto.prototype, "isExamPrep", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateHomeworkDto.prototype, "isLocked", void 0);
class CreateResourceDto {
    title;
    description;
    resourceType;
    fileUrl;
    fileName;
    fileSize;
    mimeType;
    isLocked;
}
exports.CreateResourceDto = CreateResourceDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateResourceDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateResourceDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(ResourceType),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateResourceDto.prototype, "resourceType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateResourceDto.prototype, "fileUrl", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateResourceDto.prototype, "fileName", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateResourceDto.prototype, "fileSize", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateResourceDto.prototype, "mimeType", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateResourceDto.prototype, "isLocked", void 0);
class CreateLessonBundleDto {
    title;
    objective;
    lessonContent;
    grade;
    section;
    stream;
    academicYearId;
    semesterId;
    subjectId;
    lessonDate;
    periodNumber;
    homework;
    unitNumber;
    topicName;
    competency;
    status;
    isExamPrep;
    syllabusMappingId;
    resources;
}
exports.CreateLessonBundleDto = CreateLessonBundleDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateLessonBundleDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateLessonBundleDto.prototype, "objective", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateLessonBundleDto.prototype, "lessonContent", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateLessonBundleDto.prototype, "grade", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateLessonBundleDto.prototype, "section", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateLessonBundleDto.prototype, "stream", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateLessonBundleDto.prototype, "academicYearId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateLessonBundleDto.prototype, "semesterId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateLessonBundleDto.prototype, "subjectId", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateLessonBundleDto.prototype, "lessonDate", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(8),
    __metadata("design:type", Number)
], CreateLessonBundleDto.prototype, "periodNumber", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => CreateHomeworkDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", CreateHomeworkDto)
], CreateLessonBundleDto.prototype, "homework", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateLessonBundleDto.prototype, "unitNumber", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateLessonBundleDto.prototype, "topicName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateLessonBundleDto.prototype, "competency", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.LessonStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateLessonBundleDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateLessonBundleDto.prototype, "isExamPrep", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateLessonBundleDto.prototype, "syllabusMappingId", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CreateResourceDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CreateLessonBundleDto.prototype, "resources", void 0);
class UpdateLessonBundleDto {
    title;
    titleAmharic;
    objective;
    objectiveAmharic;
    lessonContent;
    lessonContentAmharic;
    periodNumber;
    unitNumber;
    topicName;
    topicId;
    competency;
    homework;
    status;
    isExamPrep;
    syllabusMappingId;
}
exports.UpdateLessonBundleDto = UpdateLessonBundleDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateLessonBundleDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateLessonBundleDto.prototype, "titleAmharic", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateLessonBundleDto.prototype, "objective", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateLessonBundleDto.prototype, "objectiveAmharic", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateLessonBundleDto.prototype, "lessonContent", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateLessonBundleDto.prototype, "lessonContentAmharic", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(8),
    __metadata("design:type", Number)
], UpdateLessonBundleDto.prototype, "periodNumber", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateLessonBundleDto.prototype, "unitNumber", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateLessonBundleDto.prototype, "topicName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateLessonBundleDto.prototype, "topicId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateLessonBundleDto.prototype, "competency", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => CreateHomeworkDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", CreateHomeworkDto)
], UpdateLessonBundleDto.prototype, "homework", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.LessonStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateLessonBundleDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateLessonBundleDto.prototype, "isExamPrep", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateLessonBundleDto.prototype, "syllabusMappingId", void 0);
class SubmitHomeworkDto {
    submissionUrl;
    submissionText;
}
exports.SubmitHomeworkDto = SubmitHomeworkDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SubmitHomeworkDto.prototype, "submissionUrl", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SubmitHomeworkDto.prototype, "submissionText", void 0);
class GradeHomeworkDto {
    grade;
    feedback;
}
exports.GradeHomeworkDto = GradeHomeworkDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], GradeHomeworkDto.prototype, "grade", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GradeHomeworkDto.prototype, "feedback", void 0);
class LessonCoverageQueryDto {
    grade;
    subjectId;
    academicYearId;
    unitNumber;
}
exports.LessonCoverageQueryDto = LessonCoverageQueryDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], LessonCoverageQueryDto.prototype, "grade", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], LessonCoverageQueryDto.prototype, "subjectId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], LessonCoverageQueryDto.prototype, "academicYearId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], LessonCoverageQueryDto.prototype, "unitNumber", void 0);
//# sourceMappingURL=create-lesson-bundle.dto.js.map