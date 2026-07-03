"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NumberFormatter = void 0;
const common_1 = require("@nestjs/common");
let NumberFormatter = class NumberFormatter {
    localeMap = {
        en: 'en-US',
        am: 'am-ET',
        om: 'om-ET',
        ti: 'ti-ET',
    };
    format(value, locale = 'en') {
        const localeStr = this.localeMap[locale] || 'en-US';
        try {
            return new Intl.NumberFormat(localeStr).format(value);
        }
        catch {
            return value.toLocaleString('en-US');
        }
    }
    formatCurrency(value, currency = 'ETB', locale = 'en') {
        const localeStr = this.localeMap[locale] || 'en-US';
        try {
            return new Intl.NumberFormat(localeStr, {
                style: 'currency',
                currency,
            }).format(value);
        }
        catch {
            return `${currency} ${value.toFixed(2)}`;
        }
    }
    formatPercent(value, locale = 'en') {
        const localeStr = this.localeMap[locale] || 'en-US';
        try {
            return new Intl.NumberFormat(localeStr, {
                style: 'percent',
                minimumFractionDigits: 1,
                maximumFractionDigits: 2,
            }).format(value / 100);
        }
        catch {
            return `${value.toFixed(1)}%`;
        }
    }
    formatOrdinal(value, locale = 'en') {
        if (locale === 'en') {
            const suffixes = ['th', 'st', 'nd', 'rd'];
            const v = value % 100;
            const suffix = suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
            return `${value}${suffix}`;
        }
        return String(value);
    }
};
exports.NumberFormatter = NumberFormatter;
exports.NumberFormatter = NumberFormatter = __decorate([
    (0, common_1.Injectable)()
], NumberFormatter);
//# sourceMappingURL=number-formatter.service.js.map