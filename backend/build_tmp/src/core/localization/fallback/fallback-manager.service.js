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
var FallbackManager_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FallbackManager = void 0;
const common_1 = require("@nestjs/common");
const localization_interface_1 = require("../interfaces/localization.interface");
let FallbackManager = FallbackManager_1 = class FallbackManager {
    logger = new common_1.Logger(FallbackManager_1.name);
    fallbackChain = {};
    constructor() {
        for (const locale of localization_interface_1.SUPPORTED_LANGUAGES) {
            const chain = [localization_interface_1.DEFAULT_LANGUAGE];
            this.fallbackChain[locale] = [locale, ...chain.filter((l) => l !== locale)];
        }
    }
    async resolve(locale, _domain, key, _params) {
        const chain = this.fallbackChain[locale] || [locale, localization_interface_1.DEFAULT_LANGUAGE];
        this.logger.debug(`Fallback chain for ${locale}: [${chain.join(', ')}]`);
        return key;
    }
    getAvailableLocales(locale) {
        return this.fallbackChain[locale] || [locale, localization_interface_1.DEFAULT_LANGUAGE];
    }
    getFallbackChain(locale) {
        return this.getAvailableLocales(locale);
    }
};
exports.FallbackManager = FallbackManager;
exports.FallbackManager = FallbackManager = FallbackManager_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], FallbackManager);
//# sourceMappingURL=fallback-manager.service.js.map