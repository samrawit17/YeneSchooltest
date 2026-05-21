"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimetableSlotModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const prisma_module_1 = require("../prisma/prisma.module");
const timetable_slot_controller_1 = require("./timetable-slot.controller");
const timetable_slot_service_1 = require("./timetable-slot.service");
let TimetableSlotModule = class TimetableSlotModule {
};
exports.TimetableSlotModule = TimetableSlotModule;
exports.TimetableSlotModule = TimetableSlotModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [timetable_slot_controller_1.TimetableSlotController],
        providers: [timetable_slot_service_1.TimetableSlotService, jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard],
        exports: [timetable_slot_service_1.TimetableSlotService],
    })
], TimetableSlotModule);
//# sourceMappingURL=timetable-slot.module.js.map