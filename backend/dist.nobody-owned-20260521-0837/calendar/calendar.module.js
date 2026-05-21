"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarModule = void 0;
const common_1 = require("@nestjs/common");
const calendar_service_1 = require("./calendar.service");
const calendar_controller_1 = require("./calendar.controller");
const school_settings_module_1 = require("../school-settings/school-settings.module");
const attendance_module_1 = require("./attendance/attendance.module");
let CalendarModule = class CalendarModule {
};
exports.CalendarModule = CalendarModule;
exports.CalendarModule = CalendarModule = __decorate([
    (0, common_1.Module)({
        imports: [school_settings_module_1.SchoolSettingsModule, attendance_module_1.AttendanceModule],
        providers: [calendar_service_1.CalendarService],
        controllers: [calendar_controller_1.CalendarController],
        exports: [calendar_service_1.CalendarService, attendance_module_1.AttendanceModule],
    })
], CalendarModule);
//# sourceMappingURL=calendar.module.js.map