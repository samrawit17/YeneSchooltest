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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorageProvider = exports.UPLOAD_ROOT_PATH = void 0;
const common_1 = require("@nestjs/common");
exports.UPLOAD_ROOT_PATH = 'UPLOAD_ROOT_PATH';
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const school_info_service_1 = require("../../school-info.service");
let LocalStorageProvider = class LocalStorageProvider {
    schoolInfoService;
    rootPath;
    constructor(rootPath = 'public/uploads', schoolInfoService) {
        this.schoolInfoService = schoolInfoService;
        this.rootPath = path.isAbsolute(rootPath) ? rootPath : path.join(process.cwd(), rootPath);
    }
    async upload(file, filename, mimeType, options) {
        const folder = options.folder || 'files';
        const schoolPath = await this.getSchoolPath(options.schoolId, folder);
        const publicDir = schoolPath.publicDir;
        const schoolIdForKey = schoolPath.schoolIdForKey;
        const extension = this.getExtension(mimeType, filename);
        const key = options.generateName
            ? `${Date.now()}-${Math.random().toString(36).substring(2, 10)}${extension}`
            : filename;
        const filePath = path.join(publicDir, key);
        await fs.mkdir(publicDir, { recursive: true });
        await fs.writeFile(filePath, file);
        const url = `/${path.join(schoolIdForKey, key).split(path.sep).join('/')}`;
        return {
            key,
            url,
            size: file.length,
            mimeType,
        };
    }
    async delete(key) {
        const filePath = path.join(this.rootPath, key);
        try {
            await fs.unlink(filePath);
        }
        catch {
        }
    }
    async getSchoolPath(schoolId, folder) {
        const school = schoolId && this.schoolInfoService
            ? await this.schoolInfoService.getSchoolById(schoolId)
            : null;
        const basePath = schoolId ? `${schoolId}-${(school?.publicUrlSlug || schoolId)}` : 'platform';
        const relativeDir = path.join('uploads', basePath, folder || 'files');
        const publicDir = path.join(this.rootPath, relativeDir);
        return { publicDir, schoolIdForKey: basePath };
    }
    getUrl(key) {
        return `/${key.split(path.sep).join('/')}`;
    }
    getExtension(mimeType, filename) {
        if (mimeType === 'image/jpeg')
            return '.jpg';
        if (mimeType === 'image/png')
            return '.png';
        if (mimeType === 'image/webp')
            return '.webp';
        if (mimeType === 'application/pdf')
            return '.pdf';
        const ext = path.extname(filename);
        return ext || '';
    }
};
exports.LocalStorageProvider = LocalStorageProvider;
exports.LocalStorageProvider = LocalStorageProvider = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __param(0, (0, common_1.Inject)(exports.UPLOAD_ROOT_PATH)),
    __param(1, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [String, school_info_service_1.SchoolInfoService])
], LocalStorageProvider);
//# sourceMappingURL=local-storage.provider.js.map