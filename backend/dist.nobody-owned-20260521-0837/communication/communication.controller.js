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
exports.CommunicationController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../auth/types/role.enum");
const communication_service_1 = require("./communication.service");
const create_communication_dto_1 = require("./dto/create-communication.dto");
let CommunicationController = class CommunicationController {
    communicationService;
    constructor(communicationService) {
        this.communicationService = communicationService;
    }
    async createCommunication(req, dto) {
        return this.communicationService.createCommunication(req.user.schoolId, req.user.id, req.user.role, dto);
    }
    async getCommunications(req, query) {
        return this.communicationService.getCommunications(req.user.schoolId, req.user.id, req.user.role, query);
    }
    async getUnreadCount(req) {
        return this.communicationService.getUnreadCount(req.user.schoolId, req.user.id, req.user.role);
    }
    async getMyCount(req, status) {
        return this.communicationService.getMyCommunicationsCount(req.user.schoolId, req.user.id, req.user.role, status);
    }
    async getCommunicationById(req, id) {
        return this.communicationService.getCommunicationById(req.user.schoolId, req.user.id, req.user.role, id);
    }
    async updateStatus(req, id, dto) {
        return this.communicationService.updateStatus(req.user.schoolId, req.user.id, req.user.role, id, dto);
    }
    async deleteCommunication(req, id) {
        return this.communicationService.deleteCommunication(req.user.schoolId, req.user.id, req.user.role, id);
    }
    async addReply(req, id, dto) {
        return this.communicationService.addReply(req.user.schoolId, req.user.id, req.user.role, id, dto);
    }
    async deleteReply(req, replyId) {
        return this.communicationService.deleteReply(req.user.schoolId, req.user.id, req.user.role, replyId);
    }
};
exports.CommunicationController = CommunicationController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.TEACHER, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.PARENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_communication_dto_1.CreateCommunicationDto]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "createCommunication", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_communication_dto_1.CommunicationQueryDto]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "getCommunications", null);
__decorate([
    (0, common_1.Get)('unread-count'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "getUnreadCount", null);
__decorate([
    (0, common_1.Get)('my-count'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "getMyCount", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "getCommunicationById", null);
__decorate([
    (0, common_1.Put)(':id/status'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_communication_dto_1.UpdateCommunicationStatusDto]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "deleteCommunication", null);
__decorate([
    (0, common_1.Post)(':id/replies'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_communication_dto_1.CreateCommunicationReplyDto]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "addReply", null);
__decorate([
    (0, common_1.Delete)('replies/:replyId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('replyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "deleteReply", null);
exports.CommunicationController = CommunicationController = __decorate([
    (0, common_1.Controller)('communications'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [communication_service_1.CommunicationService])
], CommunicationController);
//# sourceMappingURL=communication.controller.js.map