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
exports.TranslationController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../auth/types/role.enum");
const translate_text_dto_1 = require("./dto/translate-text.dto");
const translation_service_1 = require("./translation.service");
let TranslationController = class TranslationController {
    translationService;
    constructor(translationService) {
        this.translationService = translationService;
    }
    getConfig() {
        return this.translationService.getClientConfig();
    }
    translate(req, dto) {
        return this.translationService.translateText(this.getContext(req), dto);
    }
    translateBatch(req, dto) {
        return this.translationService.translateBatch(this.getContext(req), dto);
    }
    getContext(req) {
        const user = req.user;
        if (!user?.id) {
            throw new common_1.ForbiddenException('Authenticated user is required');
        }
        return {
            userId: user.id,
            role: user.role,
            schoolId: user.schoolId || null,
        };
    }
};
exports.TranslationController = TranslationController;
__decorate([
    (0, common_1.Get)('config'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TranslationController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, translate_text_dto_1.TranslateTextDto]),
    __metadata("design:returntype", void 0)
], TranslationController.prototype, "translate", null);
__decorate([
    (0, common_1.Post)('batch'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, translate_text_dto_1.TranslateBatchDto]),
    __metadata("design:returntype", void 0)
], TranslationController.prototype, "translateBatch", null);
exports.TranslationController = TranslationController = __decorate([
    (0, common_1.Controller)('translations'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.TEACHER, role_enum_1.Role.STUDENT, role_enum_1.Role.PARENT, role_enum_1.Role.FINANCE),
    __metadata("design:paramtypes", [translation_service_1.TranslationService])
], TranslationController);
//# sourceMappingURL=translation.controller.js.map