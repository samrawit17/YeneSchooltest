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
exports.CommunicationQueryDto = exports.UpdateCommunicationStatusDto = exports.CreateCommunicationReplyDto = exports.CreateCommunicationDto = exports.CommunicationCategory = exports.CommunicationStatus = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var CommunicationStatus;
(function (CommunicationStatus) {
    CommunicationStatus["OPEN"] = "OPEN";
    CommunicationStatus["ACKNOWLEDGED"] = "ACKNOWLEDGED";
    CommunicationStatus["CLOSED"] = "CLOSED";
})(CommunicationStatus || (exports.CommunicationStatus = CommunicationStatus = {}));
var CommunicationCategory;
(function (CommunicationCategory) {
    CommunicationCategory["ACADEMIC"] = "ACADEMIC";
    CommunicationCategory["ATTENDANCE"] = "ATTENDANCE";
    CommunicationCategory["DISCIPLINE"] = "DISCIPLINE";
    CommunicationCategory["HEALTH"] = "HEALTH";
    CommunicationCategory["GENERAL"] = "GENERAL";
})(CommunicationCategory || (exports.CommunicationCategory = CommunicationCategory = {}));
class CreateCommunicationDto {
    studentId;
    classId;
    subject;
    message;
    category;
}
exports.CreateCommunicationDto = CreateCommunicationDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateCommunicationDto.prototype, "studentId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCommunicationDto.prototype, "classId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateCommunicationDto.prototype, "subject", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(5000),
    __metadata("design:type", String)
], CreateCommunicationDto.prototype, "message", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(CommunicationCategory),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCommunicationDto.prototype, "category", void 0);
class CreateCommunicationReplyDto {
    message;
}
exports.CreateCommunicationReplyDto = CreateCommunicationReplyDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], CreateCommunicationReplyDto.prototype, "message", void 0);
class UpdateCommunicationStatusDto {
    status;
    notes;
}
exports.UpdateCommunicationStatusDto = UpdateCommunicationStatusDto;
__decorate([
    (0, class_validator_1.IsEnum)(CommunicationStatus),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateCommunicationStatusDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], UpdateCommunicationStatusDto.prototype, "notes", void 0);
class CommunicationQueryDto {
    studentId;
    classId;
    status;
    category;
    search;
    createdById;
    page;
    limit;
    sortBy;
    sortOrder;
}
exports.CommunicationQueryDto = CommunicationQueryDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CommunicationQueryDto.prototype, "studentId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CommunicationQueryDto.prototype, "classId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(CommunicationStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CommunicationQueryDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(CommunicationCategory),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CommunicationQueryDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CommunicationQueryDto.prototype, "search", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CommunicationQueryDto.prototype, "createdById", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CommunicationQueryDto.prototype, "page", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CommunicationQueryDto.prototype, "limit", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CommunicationQueryDto.prototype, "sortBy", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CommunicationQueryDto.prototype, "sortOrder", void 0);
//# sourceMappingURL=create-communication.dto.js.map