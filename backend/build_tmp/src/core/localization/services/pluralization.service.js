"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluralizationService = void 0;
const common_1 = require("@nestjs/common");
let PluralizationService = class PluralizationService {
    pluralRules = {
        en: (n) => {
            if (n === 1)
                return 'one';
            return 'other';
        },
        am: (n) => {
            if (n === 0 || n === 1)
                return 'one';
            return 'other';
        },
        om: (n) => {
            if (n === 1)
                return 'one';
            return 'other';
        },
        ti: (n) => {
            if (n === 0 || n === 1)
                return 'one';
            return 'other';
        },
    };
    pluralize(locale, count, forms) {
        const rule = this.pluralRules[locale] || this.pluralRules.en;
        const category = rule(count);
        return forms[category] || forms.other || String(count);
    }
    resolveKey(locale, count, baseKey, translator) {
        const rule = this.pluralRules[locale] || this.pluralRules.en;
        const category = rule(count);
        const pluralKey = `${baseKey}.${category}`;
        const translation = translator(pluralKey);
        if (translation !== pluralKey)
            return translation;
        return translator(`${baseKey}.other`);
    }
};
exports.PluralizationService = PluralizationService;
exports.PluralizationService = PluralizationService = __decorate([
    (0, common_1.Injectable)()
], PluralizationService);
//# sourceMappingURL=pluralization.service.js.map