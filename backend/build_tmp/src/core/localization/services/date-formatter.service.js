"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DateFormatter = void 0;
const common_1 = require("@nestjs/common");
const DATE_FORMATS = {
    en: {
        short: { year: 'numeric', month: '2-digit', day: '2-digit' },
        medium: { year: 'numeric', month: 'short', day: 'numeric' },
        long: { year: 'numeric', month: 'long', day: 'numeric' },
        time: { hour: '2-digit', minute: '2-digit' },
        datetime: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
    },
    am: {
        short: { year: 'numeric', month: '2-digit', day: '2-digit' },
        medium: { year: 'numeric', month: 'short', day: 'numeric' },
        long: { year: 'numeric', month: 'long', day: 'numeric' },
        time: { hour: '2-digit', minute: '2-digit' },
        datetime: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
    },
    om: {
        short: { year: 'numeric', month: '2-digit', day: '2-digit' },
        medium: { year: 'numeric', month: 'short', day: 'numeric' },
        long: { year: 'numeric', month: 'long', day: 'numeric' },
        time: { hour: '2-digit', minute: '2-digit' },
        datetime: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
    },
    ti: {
        short: { year: 'numeric', month: '2-digit', day: '2-digit' },
        medium: { year: 'numeric', month: 'short', day: 'numeric' },
        long: { year: 'numeric', month: 'long', day: 'numeric' },
        time: { hour: '2-digit', minute: '2-digit' },
        datetime: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
    },
};
let DateFormatter = class DateFormatter {
    localeMap = {
        en: 'en-US',
        am: 'am-ET',
        om: 'om-ET',
        ti: 'ti-ET',
    };
    format(date, formatType = 'medium', locale = 'en', calendar = 'gregorian') {
        const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
        const localeStr = this.localeMap[locale] || 'en-US';
        const options = {
            ...DATE_FORMATS[locale]?.[formatType] || DATE_FORMATS.en[formatType],
            calendar,
        };
        try {
            return new Intl.DateTimeFormat(localeStr, options).format(d);
        }
        catch {
            return d.toLocaleDateString('en-US', DATE_FORMATS.en[formatType]);
        }
    }
    formatRelative(date, locale = 'en') {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        if (diffSec < 60)
            return 'just now';
        if (diffMin < 60)
            return `${diffMin}m ago`;
        if (diffHour < 24)
            return `${diffHour}h ago`;
        if (diffDay < 7)
            return `${diffDay}d ago`;
        return this.format(date, 'short', locale);
    }
};
exports.DateFormatter = DateFormatter;
exports.DateFormatter = DateFormatter = __decorate([
    (0, common_1.Injectable)()
], DateFormatter);
//# sourceMappingURL=date-formatter.service.js.map