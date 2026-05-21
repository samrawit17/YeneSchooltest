"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarService = void 0;
const common_1 = require("@nestjs/common");
const ethiopian_calendar_new_1 = require("ethiopian-calendar-new");
let CalendarService = class CalendarService {
    ethiopianMonthNames = [
        'Meskerem',
        'Tikemet',
        'Hidar',
        'Tahsas',
        'Ter',
        'Yekatit',
        'Megabit',
        'Miyazia',
        'Ginbot',
        'Sene',
        'Hamle',
        'Nehase',
        'Pagume',
    ];
    getCurrentEthiopianYear() {
        const today = new Date();
        return this.getEthiopianYear(today);
    }
    getEthiopianYear(gregorianDate) {
        const ethiopianDate = this.convertGregorianToEthiopian(gregorianDate);
        return ethiopianDate.year;
    }
    convertGregorianToEthiopian(gregorianDate) {
        const date = typeof gregorianDate === 'string'
            ? new Date(gregorianDate)
            : gregorianDate;
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const gregorianYear = date.getFullYear();
        let ethiopianYear;
        if (month >= 9) {
            ethiopianYear = gregorianYear - 7;
        }
        else {
            ethiopianYear = gregorianYear - 8;
        }
        const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        let dayOfYear = 0;
        for (let i = 0; i < month - 1; i++) {
            dayOfYear += daysInMonth[i];
        }
        dayOfYear += day;
        let ethiopianMonth;
        let ethiopianDay;
        if (month >= 9) {
            const adjustedDay = dayOfYear - 254;
            ethiopianMonth = Math.ceil(adjustedDay / 30);
            ethiopianDay = adjustedDay - (ethiopianMonth - 1) * 30;
            if (ethiopianMonth > 13) {
                ethiopianMonth = 13;
                ethiopianDay = adjustedDay - 360 + 30;
            }
        }
        else {
            const adjustedDay = dayOfYear + 111;
            ethiopianMonth = Math.ceil(adjustedDay / 30);
            ethiopianDay = adjustedDay - (ethiopianMonth - 1) * 30;
        }
        if (ethiopianMonth < 1)
            ethiopianMonth = 1;
        if (ethiopianDay < 1)
            ethiopianDay = 1;
        if (ethiopianMonth > 13)
            ethiopianMonth = 13;
        return {
            year: ethiopianYear,
            month: ethiopianMonth,
            day: ethiopianDay,
            monthName: this.ethiopianMonthNames[ethiopianMonth - 1] || '',
        };
    }
    convertEthiopianToGregorian(ethiopianYear, ethiopianMonth, ethiopianDay) {
        const gregorian = (0, ethiopian_calendar_new_1.toGregorian)(ethiopianYear, ethiopianMonth, ethiopianDay);
        return new Date(gregorian.year, gregorian.month - 1, gregorian.day);
    }
    getCalendarConversion(gregorianDate) {
        const date = typeof gregorianDate === 'string'
            ? new Date(gregorianDate)
            : gregorianDate;
        const ethiopianDate = this.convertGregorianToEthiopian(date);
        return {
            gregorianDate: date.toISOString().split('T')[0],
            ethiopianDate,
        };
    }
    formatEthiopianDate(gregorianDate) {
        const ethiopianDate = this.convertGregorianToEthiopian(gregorianDate);
        return `${ethiopianDate.monthName} ${ethiopianDate.day}, ${ethiopianDate.year} E.C.`;
    }
    getCurrentDateInfo() {
        const now = new Date();
        const ethiopianYear = this.getCurrentEthiopianYear();
        const ethiopianDate = this.convertGregorianToEthiopian(now);
        return {
            gregorian: {
                date: now.toISOString().split('T')[0],
                fullDate: now.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                }),
            },
            ethiopian: {
                year: ethiopianYear,
                date: ethiopianDate,
                formatted: this.formatEthiopianDate(now),
            },
        };
    }
    isEthiopianNewYearPeriod(gregorianDate) {
        const month = gregorianDate.getMonth() + 1;
        const day = gregorianDate.getDate();
        return (month === 9 && day >= 11) || (month === 9 && day <= 12);
    }
    getEthiopianYearWithTransition(gregorianDate) {
        const date = new Date(gregorianDate);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const baseYear = date.getFullYear() - 7;
        if (month < 9 || (month === 9 && day < 11)) {
            return baseYear;
        }
        return baseYear + 1;
    }
    checkLeapYear(year) {
        return (0, ethiopian_calendar_new_1.isEthiopianLeapYear)(year);
    }
};
exports.CalendarService = CalendarService;
exports.CalendarService = CalendarService = __decorate([
    (0, common_1.Injectable)()
], CalendarService);
//# sourceMappingURL=calendar.service.js.map