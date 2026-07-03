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
var LocaleMiddleware_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocaleMiddleware = void 0;
const common_1 = require("@nestjs/common");
const locale_resolver_service_1 = require("../services/locale-resolver.service");
let LocaleMiddleware = LocaleMiddleware_1 = class LocaleMiddleware {
    localeResolver;
    logger = new common_1.Logger(LocaleMiddleware_1.name);
    constructor(localeResolver) {
        this.localeResolver = localeResolver;
    }
    async use(request, _response, next) {
        try {
            const userId = request.user?.id;
            const schoolId = request.user?.schoolId || request.schoolId;
            const locale = await this.localeResolver.resolveFromRequest(request, schoolId, userId);
            request.locale = locale;
        }
        catch {
            request.locale = 'en';
        }
        next();
    }
};
exports.LocaleMiddleware = LocaleMiddleware;
exports.LocaleMiddleware = LocaleMiddleware = LocaleMiddleware_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [locale_resolver_service_1.LocaleResolver])
], LocaleMiddleware);
//# sourceMappingURL=locale.middleware.js.map