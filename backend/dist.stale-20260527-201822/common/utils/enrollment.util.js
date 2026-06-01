"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEnrollmentKey = generateEnrollmentKey;
function generateEnrollmentKey(schoolName) {
    const currentYear = new Date().getFullYear();
    const randomPart = generateRandomString(8);
    const sanitizedName = schoolName
        ? schoolName
            .replace(/[^a-zA-Z0-9]/g, '')
            .toUpperCase()
            .slice(0, 4) + '_'
        : '';
    return `SCH_${sanitizedName}${randomPart}_${currentYear}`;
}
function generateRandomString(length) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    const randomValues = new Uint32Array(length);
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
        result += chars[randomValues[i] % chars.length];
    }
    return result;
}
//# sourceMappingURL=enrollment.util.js.map