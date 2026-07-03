"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageFormatter = void 0;
const common_1 = require("@nestjs/common");
let MessageFormatter = class MessageFormatter {
    format(template, params) {
        if (!params || Object.keys(params).length === 0)
            return template;
        let result = template;
        for (const [key, value] of Object.entries(params)) {
            if (value === null || value === undefined)
                continue;
            const pattern = new RegExp(`\\{\\{\\s*${escapeRegExp(key)}\\s*\\}\\}`, 'g');
            result = result.replace(pattern, String(value));
        }
        return result;
    }
    hasUnresolvedParams(template) {
        return /\{\{.+?\}\}/.test(template);
    }
    extractParams(template) {
        const params = [];
        const regex = /\{\{\s*(\w+)\s*\}\}/g;
        let match;
        while ((match = regex.exec(template)) !== null) {
            params.push(match[1]);
        }
        return [...new Set(params)];
    }
    buildKey(...parts) {
        return parts.filter(Boolean).join('.');
    }
};
exports.MessageFormatter = MessageFormatter;
exports.MessageFormatter = MessageFormatter = __decorate([
    (0, common_1.Injectable)()
], MessageFormatter);
function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
//# sourceMappingURL=message-formatter.service.js.map