"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ETHIOPIAN_MONTHS = exports.DEFAULT_TIMEZONE = void 0;
exports.getEthiopianDate = getEthiopianDate;
exports.formatEthiopianDate = formatEthiopianDate;
exports.getEthiopianYear = getEthiopianYear;
exports.getStartOfDay = getStartOfDay;
exports.getEndOfDay = getEndOfDay;
exports.formatDateForDisplay = formatDateForDisplay;
exports.getLocalMidnight = getLocalMidnight;
exports.getTodayDateString = getTodayDateString;
exports.DEFAULT_TIMEZONE = 'Africa/Addis_Ababa';
exports.ETHIOPIAN_MONTHS = [
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
function getEthiopianDate(gregorianDate) {
    const date = new Date(gregorianDate);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const gregorianYear = date.getFullYear();
    let ethiopianYear;
    if (month >= 9) {
        ethiopianYear = gregorianYear - 8;
    }
    else {
        ethiopianYear = gregorianYear - 9;
    }
    const getDayOfYear = (m, d) => {
        const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        let dayOfYear = 0;
        for (let i = 0; i < m - 1; i++) {
            dayOfYear += daysInMonth[i];
        }
        return dayOfYear + d;
    };
    const dayOfYear = getDayOfYear(month, day);
    const ethiopianDayOfYear = dayOfYear + (month >= 9 ? 0 : -1);
    let ethiopianMonth;
    let ethiopianDay;
    if (dayOfYear >= 255) {
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
        monthName: exports.ETHIOPIAN_MONTHS[ethiopianMonth - 1] || '',
    };
}
function formatEthiopianDate(gregorianDate) {
    const ethiopian = getEthiopianDate(gregorianDate);
    return `${ethiopian.monthName} ${ethiopian.day}, ${ethiopian.year} E.C.`;
}
function getEthiopianYear(gregorianDate) {
    const ethiopian = getEthiopianDate(gregorianDate);
    return ethiopian.year;
}
function getStartOfDay(dateString, timezone = exports.DEFAULT_TIMEZONE) {
    if (typeof dateString === 'string') {
        const [year, month, day] = dateString.split('-').map(Number);
        const offset = getTimezoneOffset(timezone);
        const localDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
        return new Date(localDate.getTime() - offset * 60 * 60 * 1000);
    }
    const year = dateString.getFullYear();
    const month = dateString.getMonth();
    const day = dateString.getDate();
    const offset = getTimezoneOffset(timezone);
    const localDate = new Date(Date.UTC(year, month, day, 0, 0, 0));
    return new Date(localDate.getTime() - offset * 60 * 60 * 1000);
}
function getEndOfDay(dateString, timezone = exports.DEFAULT_TIMEZONE) {
    if (typeof dateString === 'string') {
        const [year, month, day] = dateString.split('-').map(Number);
        const offset = getTimezoneOffset(timezone);
        const localDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
        return new Date(localDate.getTime() - offset * 60 * 60 * 1000);
    }
    const year = dateString.getFullYear();
    const month = dateString.getMonth();
    const day = dateString.getDate();
    const offset = getTimezoneOffset(timezone);
    const localDate = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
    return new Date(localDate.getTime() - offset * 60 * 60 * 1000);
}
function getTimezoneOffset(timezone) {
    const timezoneOffsets = {
        'Africa/Addis_Ababa': 3,
        'Africa/Nairobi': 3,
        'Africa/Dar_es_Salaam': 3,
        UTC: 0,
        GMT: 0,
    };
    return timezoneOffsets[timezone] ?? 3;
}
function formatDateForDisplay(date, timezone = exports.DEFAULT_TIMEZONE) {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    return `${year}-${month}-${day}`;
}
function getLocalMidnight(dateString) {
    const date = dateString ? new Date(dateString) : new Date();
    date.setHours(0, 0, 0, 0);
    return date;
}
function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
//# sourceMappingURL=date.utils.js.map