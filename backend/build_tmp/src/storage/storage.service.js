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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var StorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const local_storage_provider_1 = require("./providers/local-storage.provider");
const platform_settings_service_1 = require("../platform-settings/platform-settings.service");
let StorageService = StorageService_1 = class StorageService {
    configService;
    platformSettingsService;
    logger = new common_1.Logger(StorageService_1.name);
    provider = null;
    initPromise = null;
    constructor(configService, platformSettingsService) {
        this.configService = configService;
        this.platformSettingsService = platformSettingsService;
    }
    async getProvider() {
        if (this.provider)
            return this.provider;
        if (this.initPromise)
            await this.initPromise;
        else
            this.initPromise = this.initializeProvider();
        await this.initPromise;
        return this.provider;
    }
    async initializeProvider() {
        let storageType = this.configService.get('STORAGE_TYPE', 'local');
        let config = {};
        if (this.platformSettingsService) {
            try {
                const dbType = await this.platformSettingsService.getSetting('STORAGE_TYPE');
                if (dbType && typeof dbType === 'string') {
                    storageType = dbType;
                }
                const dbConfig = await this.platformSettingsService.getSetting('STORAGE_CONFIG');
                if (dbConfig && typeof dbConfig === 'object' && !Array.isArray(dbConfig)) {
                    config = dbConfig;
                }
            }
            catch (err) {
                this.logger.warn('Could not read storage config from platform settings, falling back to env');
            }
        }
        this.provider = this.createProvider(storageType, config);
    }
    createProvider(storageType, config) {
        switch (storageType) {
            case 's3':
            case 'minio':
                this.logger.warn(`Storage type "${storageType}" not yet implemented, falling back to local`);
                return this.createLocalProvider(config);
            case 'local':
            default:
                return this.createLocalProvider(config);
        }
    }
    createLocalProvider(config) {
        const rootPath = config.rootPath
            || this.configService.get('STORAGE_LOCAL_ROOT_PATH', 'public/uploads');
        return new local_storage_provider_1.LocalStorageProvider(rootPath);
    }
    async refreshConfig() {
        this.provider = null;
        this.initPromise = null;
        await this.getProvider();
        this.logger.log('Storage provider re-initialized from platform settings');
    }
    async upload(file, filename, mimeType, options = {}) {
        const provider = await this.getProvider();
        return provider.upload(file, filename, mimeType, options);
    }
    async delete(key) {
        const provider = await this.getProvider();
        await provider.delete(key);
    }
    async getUrl(key) {
        const provider = await this.getProvider();
        return provider.getUrl(key);
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = StorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [config_1.ConfigService,
        platform_settings_service_1.PlatformSettingsService])
], StorageService);
//# sourceMappingURL=storage.service.js.map