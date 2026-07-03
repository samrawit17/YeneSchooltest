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
exports.MessagingController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../auth/types/role.enum");
const messaging_service_1 = require("./messaging.service");
const create_conversation_dto_1 = require("./dto/create-conversation.dto");
const send_message_dto_1 = require("./dto/send-message.dto");
const subscription_decorator_1 = require("../subscription/decorators/subscription.decorator");
const subscription_guard_1 = require("../subscription/guards/subscription.guard");
let MessagingController = class MessagingController {
    messagingService;
    constructor(messagingService) {
        this.messagingService = messagingService;
    }
    async listStaff(req, search) {
        return this.messagingService.listStaff(req.user, search);
    }
    async createConversation(req, dto) {
        return this.messagingService.createConversation(req.user, dto);
    }
    async listConversations(req, academicYearId) {
        return this.messagingService.listConversations(req.user, academicYearId);
    }
    async getConversationMessages(req, conversationId, academicYearId) {
        return this.messagingService.getConversationMessages(req.user, conversationId, academicYearId);
    }
    async sendMessage(req, conversationId, dto) {
        return this.messagingService.sendMessage(req.user, conversationId, dto);
    }
    async markRead(req, messageId) {
        return this.messagingService.markMessageRead(req.user, messageId);
    }
};
exports.MessagingController = MessagingController;
__decorate([
    (0, common_1.Get)('staff'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.TEACHER, role_enum_1.Role.FINANCE),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], MessagingController.prototype, "listStaff", null);
__decorate([
    (0, common_1.Post)('conversation'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.TEACHER, role_enum_1.Role.FINANCE),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_conversation_dto_1.CreateConversationDto]),
    __metadata("design:returntype", Promise)
], MessagingController.prototype, "createConversation", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.TEACHER, role_enum_1.Role.FINANCE),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('academicYearId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], MessagingController.prototype, "listConversations", null);
__decorate([
    (0, common_1.Get)(':conversationId'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.TEACHER, role_enum_1.Role.FINANCE),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('conversationId')),
    __param(2, (0, common_1.Query)('academicYearId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], MessagingController.prototype, "getConversationMessages", null);
__decorate([
    (0, common_1.Post)(':conversationId'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.TEACHER, role_enum_1.Role.FINANCE),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('conversationId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, send_message_dto_1.SendMessageDto]),
    __metadata("design:returntype", Promise)
], MessagingController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Patch)('read/:messageId'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.TEACHER, role_enum_1.Role.FINANCE),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('messageId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], MessagingController.prototype, "markRead", null);
exports.MessagingController = MessagingController = __decorate([
    (0, common_1.Controller)('messages'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, subscription_guard_1.SubscriptionGuard),
    (0, subscription_decorator_1.RequiresFeature)('MESSAGING'),
    __metadata("design:paramtypes", [messaging_service_1.MessagingService])
], MessagingController);
//# sourceMappingURL=messaging.controller.js.map