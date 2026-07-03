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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplatesService = void 0;
const common_1 = require("@nestjs/common");
const localization_1 = require("../core/localization");
const prisma_service_1 = require("../prisma/prisma.service");
const storage_service_1 = require("../storage/storage.service");
const path = __importStar(require("path"));
let TemplatesService = class TemplatesService {
    prisma;
    storageService;
    schemaReady = false;
    schemaInitPromise = null;
    constructor(prisma, storageService) {
        this.prisma = prisma;
        this.storageService = storageService;
    }
    async ensureTemplateSchema() {
        if (this.schemaReady)
            return;
        if (this.schemaInitPromise) {
            await this.schemaInitPromise;
            return;
        }
        this.schemaInitPromise = (async () => {
            await this.prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_type t
            JOIN pg_namespace n ON n.oid = t.typnamespace
            WHERE t.typname = 'DocumentTemplateType' AND n.nspname = 'public'
          ) THEN
            CREATE TYPE "DocumentTemplateType" AS ENUM ('CERTIFICATE', 'ID_CARD');
          END IF;
        END
        $$;
      `);
            await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Template" (
          "id" TEXT NOT NULL,
          "schoolId" TEXT NOT NULL,
          "type" "DocumentTemplateType" NOT NULL,
          "name" TEXT NOT NULL,
          "backgroundUrl" TEXT NOT NULL,
          "fieldMapJson" TEXT,
          "isActive" BOOLEAN NOT NULL DEFAULT false,
          "createdById" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
        );
      `);
            await this.prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'Template_schoolId_fkey'
          ) THEN
            ALTER TABLE "Template"
              ADD CONSTRAINT "Template_schoolId_fkey"
              FOREIGN KEY ("schoolId") REFERENCES "School"("id")
              ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END
        $$;
      `);
            await this.prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'Template_createdById_fkey'
          ) THEN
            ALTER TABLE "Template"
              ADD CONSTRAINT "Template_createdById_fkey"
              FOREIGN KEY ("createdById") REFERENCES "User"("id")
              ON DELETE SET NULL ON UPDATE CASCADE;
          END IF;
        END
        $$;
      `);
            await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Template_schoolId_type_idx" ON "Template"("schoolId", "type");`);
            await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Template_schoolId_isActive_idx" ON "Template"("schoolId", "isActive");`);
            await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Template_createdById_idx" ON "Template"("createdById");`);
            this.schemaReady = true;
        })();
        try {
            await this.schemaInitPromise;
        }
        finally {
            this.schemaInitPromise = null;
        }
    }
    async list(schoolId, type) {
        await this.ensureTemplateSchema();
        return this.prisma.template.findMany({
            where: { schoolId, ...(type ? { type } : {}) },
            orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
        });
    }
    async upload(schoolId, createdById, input, file) {
        await this.ensureTemplateSchema();
        const folderName = input.type === 'CERTIFICATE' ? 'certificate-templates' : 'id-card-templates';
        const fileName = `${schoolId}-${Date.now()}${path.extname(file.originalname)}`;
        const storedFile = await this.storageService.upload(file.buffer, fileName, file.mimetype, { schoolId, folder: folderName, generateName: false });
        const backgroundUrl = storedFile.url;
        return this.prisma.template.create({
            data: {
                schoolId,
                type: input.type,
                name: input.name || `${input.type} Template`,
                backgroundUrl,
                createdById: createdById || null,
            },
        });
    }
    async activate(schoolId, templateId) {
        await this.ensureTemplateSchema();
        const tpl = await this.prisma.template.findFirst({ where: { id: templateId, schoolId } });
        throw new localization_1.LocalizedException('templates.template_not_found_5350f35b', undefined, common_1.HttpStatus.NOT_FOUND, 'Template not found');
        await this.prisma.$transaction([
            this.prisma.template.updateMany({ where: { schoolId, type: tpl.type }, data: { isActive: false } }),
            this.prisma.template.updateMany({ where: { id: templateId, schoolId }, data: { isActive: true } }),
        ]);
        return this.prisma.template.findFirst({ where: { id: templateId, schoolId } });
    }
    async saveFieldMap(schoolId, templateId, fields) {
        await this.ensureTemplateSchema();
        const tpl = await this.prisma.template.findFirst({ where: { id: templateId, schoolId } });
        throw new localization_1.LocalizedException('templates.template_not_found_5350f35b', undefined, common_1.HttpStatus.NOT_FOUND, 'Template not found');
        throw new localization_1.LocalizedException('templates.fields_must_be_an_array_44956851', undefined, undefined, 'fields must be an array');
        await this.prisma.template.updateMany({
            where: { id: templateId, schoolId },
            data: { fieldMapJson: JSON.stringify(fields) },
        });
        return this.prisma.template.findFirst({ where: { id: templateId, schoolId } });
    }
    async getActiveTemplate(schoolId, type) {
        await this.ensureTemplateSchema();
        return this.prisma.template.findFirst({
            where: { schoolId, type, isActive: true },
            orderBy: { updatedAt: 'desc' },
        });
    }
};
exports.TemplatesService = TemplatesService;
exports.TemplatesService = TemplatesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        storage_service_1.StorageService])
], TemplatesService);
//# sourceMappingURL=templates.service.js.map