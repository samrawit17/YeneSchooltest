"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ETHIOPIAN_MONTH_NAMES = void 0;
exports.toEthiopianDate = toEthiopianDate;
exports.toGregorianDate = toGregorianDate;
exports.formatSchoolDate = formatSchoolDate;
exports.formatAcademicYear = formatAcademicYear;
const ethiopian_calendar_new_1 = require("ethiopian-calendar-new");
exports.ETHIOPIAN_MONTH_NAMES = [
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
function toEthiopianDate(date) {
    return (0, ethiopian_calendar_new_1.toEthiopian)(date.getFullYear(), date.getMonth() + 1, date.getDate());
}
function toGregorianDate(ethDate) {
    const result = (0, ethiopian_calendar_new_1.toGregorian)(ethDate.year, ethDate.month, ethDate.day);
    return new Date(result.year, result.month - 1, result.day);
}
function formatSchoolDate(date, schoolSettings) {
    if (!date)
        return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (schoolSettings.calendarType === 'ETHIOPIAN') {
        const etDate = toEthiopianDate(d);
        const monthName = exports.ETHIOPIAN_MONTH_NAMES[etDate.month - 1] || '';
        return `${monthName} ${etDate.day}, ${etDate.year} E.C.`;
    }
    return d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
}
function formatAcademicYear(academicYear, schoolSettings) {
    if (!academicYear)
        return '';
    if (schoolSettings.calendarType === 'ETHIOPIAN' &&
        academicYear.ethiopianYear) {
        return `${academicYear.ethiopianYear} E.C.`;
    }
    if (academicYear.label && academicYear.label !== '') {
        return academicYear.label;
    }
    const start = new Date(academicYear.startDate).getFullYear();
    const end = new Date(academicYear.endDate).getFullYear();
    return `${start}-${end}`;
}
//# sourceMappingURL=date.util.js.map