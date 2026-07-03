"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var FileTranslationLoader_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileTranslationLoader = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const localization_interface_1 = require("../interfaces/localization.interface");
let FileTranslationLoader = FileTranslationLoader_1 = class FileTranslationLoader {
    logger = new common_1.Logger(FileTranslationLoader_1.name);
    translationsDir;
    cache = new Map();
    constructor() {
        this.translationsDir = path.join(__dirname, '..', 'translations');
    }
    async load(locale, domain) {
        const cacheKey = `${locale}:${domain}`;
        const cached = this.cache.get(cacheKey);
        if (cached)
            return cached;
        try {
            const filePath = path.join(this.translationsDir, locale, `${domain}.json`);
            if (!fs.existsSync(filePath)) {
                this.logger.warn(`Translation file not found: ${filePath}`);
                return null;
            }
            const content = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(content);
            this.cache.set(cacheKey, data);
            return data;
        }
        catch (error) {
            this.logger.error(`Failed to load translation file for ${locale}/${domain}: ${error.message}`);
            return null;
        }
    }
    async loadAll(locale) {
        const localeDir = path.join(this.translationsDir, locale);
        if (!fs.existsSync(localeDir))
            return {};
        const result = {};
        const files = fs.readdirSync(localeDir).filter((f) => f.endsWith('.json'));
        for (const file of files) {
            const domain = file.replace('.json', '');
            const data = await this.load(locale, domain);
            if (data)
                result[domain] = data;
        }
        return result;
    }
    async getSupportedLocales() {
        const locales = [];
        for (const locale of localization_interface_1.SUPPORTED_LANGUAGES) {
            const dir = path.join(this.translationsDir, locale);
            if (fs.existsSync(dir))
                locales.push(locale);
        }
        return locales.length > 0 ? locales : [localization_interface_1.DEFAULT_LANGUAGE];
    }
    clearCache(locale, domain) {
        if (locale && domain) {
            this.cache.delete(`${locale}:${domain}`);
        }
        else if (locale) {
            for (const key of this.cache.keys()) {
                if (key.startsWith(`${locale}:`))
                    this.cache.delete(key);
            }
        }
        else {
            this.cache.clear();
        }
    }
};
exports.FileTranslationLoader = FileTranslationLoader;
exports.FileTranslationLoader = FileTranslationLoader = FileTranslationLoader_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], FileTranslationLoader);
//# sourceMappingURL=file-loader.service.js.map