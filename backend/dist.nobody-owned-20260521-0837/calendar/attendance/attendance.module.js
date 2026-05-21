"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceModule = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const attendance_controller_1 = require("./attendance.controller");
const attendance_service_1 = require("./attendance.service");
const prisma_module_1 = require("../../prisma/prisma.module");
const notification_module_1 = require("../../notification/notification.module");
const platform_settings_module_1 = require("../../platform-settings/platform-settings.module");
const school_settings_module_1 = require("../../school-settings/school-settings.module");
let AttendanceModule = class AttendanceModule {
};
exports.AttendanceModule = AttendanceModule;
exports.AttendanceModule = AttendanceModule = __decorate([
    (0, common_1.Module)({
        imports: [
            schedule_1.ScheduleModule,
            prisma_module_1.PrismaModule,
            notification_module_1.NotificationModule,
            platform_settings_module_1.PlatformSettingsModule,
            school_settings_module_1.SchoolSettingsModule,
        ],
        controllers: [attendance_controller_1.AttendanceController],
        providers: [attendance_service_1.AttendanceService],
        exports: [attendance_service_1.AttendanceService],
    })
], AttendanceModule);
//# sourceMappingURL=attendance.module.js.map