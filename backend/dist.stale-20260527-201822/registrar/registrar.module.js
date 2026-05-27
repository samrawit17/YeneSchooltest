"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistrarModule = void 0;
const common_1 = require("@nestjs/common");
const registrar_controller_1 = require("./registrar.controller");
const registrar_service_1 = require("./registrar.service");
const prisma_service_1 = require("../prisma/prisma.service");
const auto_assignment_module_1 = require("../auto-assignment/auto-assignment.module");
const credential_module_1 = require("../credential/credential.module");
let RegistrarModule = class RegistrarModule {
};
exports.RegistrarModule = RegistrarModule;
exports.RegistrarModule = RegistrarModule = __decorate([
    (0, common_1.Module)({
        imports: [auto_assignment_module_1.AutoAssignmentModule, credential_module_1.CredentialModule],
        controllers: [registrar_controller_1.RegistrarController],
        providers: [registrar_service_1.RegistrarService, prisma_service_1.PrismaService],
        exports: [registrar_service_1.RegistrarService],
    })
], RegistrarModule);
//# sourceMappingURL=registrar.module.js.map