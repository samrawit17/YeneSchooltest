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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NationalExamResultsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../auth/types/role.enum");
const national_exam_results_dto_1 = require("./dto/national-exam-results.dto");
const national_exam_results_service_1 = require("./national-exam-results.service");
let NationalExamResultsController = class NationalExamResultsController {
    service;
    constructor(service) {
        this.service = service;
    }
    listBatches(req) {
        return this.service.listBatches(req.user.schoolId);
    }
    getBatch(req, id) {
        return this.service.getBatch(req.user.schoolId, id);
    }
    importResults(req, dto) {
        return this.service.importResults(req.user.schoolId, req.user.id, dto);
    }
    publishBatch(req, id) {
        return this.service.publishBatch(req.user.schoolId, id);
    }
    getMyResults(req) {
        return this.service.getPublishedForStudent(req.user.schoolId, req.user.id);
    }
    getParentChildResults(req, childId) {
        return this.service.getParentChildResults(req.user.id, req.user.schoolId, childId);
    }
};
exports.NationalExamResultsController = NationalExamResultsController;
__decorate([
    (0, common_1.Get)('batches'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.REGISTRAR, role_enum_1.Role.ADMIN),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NationalExamResultsController.prototype, "listBatches", null);
__decorate([
    (0, common_1.Get)('batches/:id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.REGISTRAR, role_enum_1.Role.ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], NationalExamResultsController.prototype, "getBatch", null);
__decorate([
    (0, common_1.Post)('import'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.REGISTRAR, role_enum_1.Role.ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, national_exam_results_dto_1.ImportNationalExamResultsDto]),
    __metadata("design:returntype", void 0)
], NationalExamResultsController.prototype, "importResults", null);
__decorate([
    (0, common_1.Post)('batches/:id/publish'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.REGISTRAR, role_enum_1.Role.ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], NationalExamResultsController.prototype, "publishBatch", null);
__decorate([
    (0, common_1.Get)('student/me'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STUDENT),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NationalExamResultsController.prototype, "getMyResults", null);
__decorate([
    (0, common_1.Get)('parent/child/:childId'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.PARENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('childId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], NationalExamResultsController.prototype, "getParentChildResults", null);
exports.NationalExamResultsController = NationalExamResultsController = __decorate([
    (0, common_1.Controller)('national-exam-results'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [national_exam_results_service_1.NationalExamResultsService])
], NationalExamResultsController);
//# sourceMappingURL=national-exam-results.controller.js.map