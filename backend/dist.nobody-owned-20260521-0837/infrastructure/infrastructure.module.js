"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InfrastructureModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const cache_service_1 = require("./cache/cache.service");
const redis_service_1 = require("./cache/redis.service");
const rate_limit_guard_1 = require("./rate-limit/rate-limit.guard");
let InfrastructureModule = class InfrastructureModule {
};
exports.InfrastructureModule = InfrastructureModule;
exports.InfrastructureModule = InfrastructureModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [
            cache_service_1.CacheService,
            redis_service_1.RedisService,
            {
                provide: core_1.APP_GUARD,
                useClass: rate_limit_guard_1.RateLimitGuard,
            },
        ],
        exports: [cache_service_1.CacheService, redis_service_1.RedisService],
    })
], InfrastructureModule);
//# sourceMappingURL=infrastructure.module.js.map