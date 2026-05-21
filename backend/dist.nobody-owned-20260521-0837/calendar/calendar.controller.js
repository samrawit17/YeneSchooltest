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
exports.CalendarController = void 0;
const common_1 = require("@nestjs/common");
const calendar_service_1 = require("./calendar.service");
const school_settings_service_1 = require("../school-settings/school-settings.service");
let CalendarController = class CalendarController {
    calendarService;
    schoolSettingsService;
    constructor(calendarService, schoolSettingsService) {
        this.calendarService = calendarService;
        this.schoolSettingsService = schoolSettingsService;
    }
    getCurrentEthiopianYear() {
        const year = this.calendarService.getCurrentEthiopianYear();
        return {
            year,
            description: 'Current Ethiopian year',
        };
    }
    getCurrentDate() {
        return this.calendarService.getCurrentDateInfo();
    }
    convertDate(date) {
        try {
            const parsedDate = new Date(date);
            if (isNaN(parsedDate.getTime())) {
                return { error: 'Invalid date format. Use ISO format (YYYY-MM-DD)' };
            }
            return this.calendarService.getCalendarConversion(parsedDate);
        }
        catch (error) {
            return { error: 'Invalid date format. Use ISO format (YYYY-MM-DD)' };
        }
    }
    convertToGregorian(year, month, day) {
        try {
            const ethYear = parseInt(year, 10);
            const ethMonth = parseInt(month, 10);
            const ethDay = parseInt(day, 10);
            if (isNaN(ethYear) || isNaN(ethMonth) || isNaN(ethDay)) {
                return {
                    error: 'Invalid parameters. Provide year, month, and day as numbers',
                };
            }
            const gregorianDate = this.calendarService.convertEthiopianToGregorian(ethYear, ethMonth, ethDay);
            return {
                ethiopian: { year: ethYear, month: ethMonth, day: ethDay },
                gregorian: gregorianDate.toISOString().split('T')[0],
            };
        }
        catch (error) {
            return { error: 'Invalid Ethiopian date' };
        }
    }
    async getSchoolCalendarMode(schoolId) {
        const calendarType = await this.schoolSettingsService.getSetting(schoolId, school_settings_service_1.SCHOOL_SETTING_KEYS.CALENDAR_TYPE);
        return {
            schoolId,
            calendarType: calendarType || 'ETHIOPIAN',
        };
    }
    checkNewYear(date) {
        const checkDate = date ? new Date(date) : new Date();
        const isNewYearPeriod = this.calendarService.isEthiopianNewYearPeriod(checkDate);
        const ethiopianYear = this.calendarService.getEthiopianYear(checkDate);
        return {
            date: checkDate.toISOString().split('T')[0],
            isNewYearPeriod,
            ethiopianYear,
            message: isNewYearPeriod
                ? 'Ethiopian New Year (Enkutatash) period'
                : 'Not in Ethiopian New Year period',
        };
    }
};
exports.CalendarController = CalendarController;
__decorate([
    (0, common_1.Get)('ethiopian-year'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CalendarController.prototype, "getCurrentEthiopianYear", null);
__decorate([
    (0, common_1.Get)('current'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CalendarController.prototype, "getCurrentDate", null);
__decorate([
    (0, common_1.Get)('convert'),
    __param(0, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CalendarController.prototype, "convertDate", null);
__decorate([
    (0, common_1.Get)('convert-to-gregorian'),
    __param(0, (0, common_1.Query)('year')),
    __param(1, (0, common_1.Query)('month')),
    __param(2, (0, common_1.Query)('day')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], CalendarController.prototype, "convertToGregorian", null);
__decorate([
    (0, common_1.Get)('school/:schoolId/mode'),
    __param(0, (0, common_1.Param)('schoolId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "getSchoolCalendarMode", null);
__decorate([
    (0, common_1.Get)('new-year-check'),
    __param(0, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CalendarController.prototype, "checkNewYear", null);
exports.CalendarController = CalendarController = __decorate([
    (0, common_1.Controller)('calendar'),
    __metadata("design:paramtypes", [calendar_service_1.CalendarService,
        school_settings_service_1.SchoolSettingsService])
], CalendarController);
//# sourceMappingURL=calendar.controller.js.map