"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var InMemoryTranslationCache_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryTranslationCache = void 0;
const common_1 = require("@nestjs/common");
let InMemoryTranslationCache = InMemoryTranslationCache_1 = class InMemoryTranslationCache {
    logger = new common_1.Logger(InMemoryTranslationCache_1.name);
    store = new Map();
    hits = 0;
    misses = 0;
    key(locale, domain, key) {
        return `${locale}:${domain}:${key}`;
    }
    async get(locale, domain, key) {
        const k = this.key(locale, domain, key);
        const value = this.store.get(k);
        if (value !== undefined) {
            this.hits++;
            return value;
        }
        this.misses++;
        return null;
    }
    async set(locale, domain, key, value) {
        this.store.set(this.key(locale, domain, key), value);
    }
    async clear(locale, domain) {
        if (locale && domain) {
            const prefix = `${locale}:${domain}:`;
            for (const key of this.store.keys()) {
                if (key.startsWith(prefix))
                    this.store.delete(key);
            }
        }
        else if (locale) {
            const prefix = `${locale}:`;
            for (const key of this.store.keys()) {
                if (key.startsWith(prefix))
                    this.store.delete(key);
            }
        }
        else {
            this.store.clear();
        }
        this.logger.log(`Translation cache cleared (locale: ${locale || 'all'}, domain: ${domain || 'all'})`);
    }
    getStats() {
        const total = this.hits + this.misses;
        return {
            size: this.store.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? this.hits / total : 0,
        };
    }
};
exports.InMemoryTranslationCache = InMemoryTranslationCache;
exports.InMemoryTranslationCache = InMemoryTranslationCache = InMemoryTranslationCache_1 = __decorate([
    (0, common_1.Injectable)()
], InMemoryTranslationCache);
//# sourceMappingURL=translation-cache.service.js.map