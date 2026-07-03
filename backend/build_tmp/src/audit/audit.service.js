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
var AuditService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
let AuditService = AuditService_1 = class AuditService {
    prisma;
    logger = new common_1.Logger(AuditService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async log(input) {
        try {
            const metadata = input.metadata
                ? JSON.stringify(this.redactSensitiveMetadata(input.metadata))
                : null;
            await this.prisma.$executeRaw(client_1.Prisma.sql `
          INSERT INTO "SystemAuditLog" (
            "id",
            "schoolId",
            "userId",
            "actorRole",
            "action",
            "entityType",
            "entityId",
            "ipAddress",
            "userAgent",
            "metadata"
          )
          VALUES (
            ${(0, crypto_1.randomUUID)()},
            ${input.schoolId || input.actor?.schoolId || null},
            ${input.actor?.id || null},
            ${input.actor?.role || null},
            ${input.action},
            ${input.entityType},
            ${input.entityId || null},
            ${input.request?.ip || null},
            ${input.request?.userAgent || null},
            ${metadata}
          )
        `);
        }
        catch (error) {
            this.logger.warn(`Failed to write audit log for ${input.action}/${input.entityType}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async findLogs(query) {
        const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 500);
        const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
        SELECT
          "id",
          "schoolId",
          "userId",
          "actorRole",
          "action",
          "entityType",
          "entityId",
          "ipAddress",
          "userAgent",
          "metadata",
          "createdAt"
        FROM "SystemAuditLog"
        WHERE (${query.schoolId || null}::text IS NULL OR "schoolId" = ${query.schoolId || null})
          AND (${query.action || null}::text IS NULL OR "action" = ${query.action || null})
          AND (${query.entityType || null}::text IS NULL OR "entityType" = ${query.entityType || null})
        ORDER BY "createdAt" DESC
        LIMIT ${limit}
      `);
        return rows.map((row) => ({
            ...row,
            metadata: row.metadata ? JSON.parse(row.metadata) : null,
        }));
    }
    fromRequest(req) {
        return {
            ip: req?.ip ||
                req?.headers?.['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
                req?.socket?.remoteAddress ||
                null,
            userAgent: req?.headers?.['user-agent'] || null,
        };
    }
    redactSensitiveMetadata(value) {
        const sensitiveKeys = new Set([
            'password',
            'temporaryPassword',
            'token',
            'access_token',
            'refresh_token',
            'authorization',
            'cookie',
        ]);
        const redact = (item) => {
            if (Array.isArray(item))
                return item.map(redact);
            if (!item || typeof item !== 'object')
                return item;
            return Object.fromEntries(Object.entries(item).map(([key, val]) => [
                key,
                sensitiveKeys.has(key) ? '[REDACTED]' : redact(val),
            ]));
        };
        return redact(value);
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = AuditService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditService);
//# sourceMappingURL=audit.service.js.map