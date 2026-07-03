"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const jwt_strategy_1 = require("./strategies/jwt.strategy");
const local_strategy_1 = require("./strategies/local.strategy");
const roles_guard_1 = require("./guards/roles.guard");
const permissions_guard_1 = require("./guards/permissions.guard");
const prisma_service_1 = require("../prisma/prisma.service");
const auth_controller_1 = require("./auth.controller");
const auth_service_1 = require("./auth.service");
const credential_service_1 = require("../credential/credential.service");
const notification_module_1 = require("../notification/notification.module");
const storage_module_1 = require("../storage/storage.module");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            passport_1.PassportModule,
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: async (configService) => ({
                    secret: configService.get('JWT_SECRET'),
                    signOptions: { expiresIn: (configService.get('JWT_EXPIRES_IN') || '8h') },
                }),
                inject: [config_1.ConfigService],
            }),
            notification_module_1.NotificationModule,
            storage_module_1.StorageModule,
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [
            prisma_service_1.PrismaService,
            credential_service_1.CredentialService,
            auth_service_1.AuthService,
            jwt_strategy_1.JwtStrategy,
            local_strategy_1.LocalStrategy,
            roles_guard_1.RolesGuard,
            permissions_guard_1.PermissionsGuard,
        ],
        exports: [auth_service_1.AuthService],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map