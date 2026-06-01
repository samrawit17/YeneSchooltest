import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditActor {
  id?: string | null;
  role?: string | null;
  schoolId?: string | null;
}

export interface AuditRequestContext {
  ip?: string | null;
  userAgent?: string | null;
}

export interface AuditLogInput {
  actor?: AuditActor | null;
  schoolId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  request?: AuditRequestContext | null;
}

export interface AuditLogQuery {
  schoolId?: string | null;
  action?: string | null;
  entityType?: string | null;
  limit?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput): Promise<void> {
    try {
      const metadata = input.metadata
        ? JSON.stringify(this.redactSensitiveMetadata(input.metadata))
        : null;

      await this.prisma.$executeRaw(
        Prisma.sql`
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
            ${randomUUID()},
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
        `,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to write audit log for ${input.action}/${input.entityType}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async findLogs(query: AuditLogQuery) {
    const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 500);
    const rows = await this.prisma.$queryRaw<Array<{
      id: string;
      schoolId: string | null;
      userId: string | null;
      actorRole: string | null;
      action: string;
      entityType: string;
      entityId: string | null;
      ipAddress: string | null;
      userAgent: string | null;
      metadata: string | null;
      createdAt: Date;
    }>>(
      Prisma.sql`
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
      `,
    );

    return rows.map((row) => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
    }));
  }

  fromRequest(req: any): AuditRequestContext {
    return {
      ip:
        req?.ip ||
        req?.headers?.['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
        req?.socket?.remoteAddress ||
        null,
      userAgent: req?.headers?.['user-agent'] || null,
    };
  }

  private redactSensitiveMetadata(value: Record<string, unknown>) {
    const sensitiveKeys = new Set([
      'password',
      'temporaryPassword',
      'token',
      'access_token',
      'refresh_token',
      'authorization',
      'cookie',
    ]);

    const redact = (item: unknown): unknown => {
      if (Array.isArray(item)) return item.map(redact);
      if (!item || typeof item !== 'object') return item;
      return Object.fromEntries(
        Object.entries(item as Record<string, unknown>).map(([key, val]) => [
          key,
          sensitiveKeys.has(key) ? '[REDACTED]' : redact(val),
        ]),
      );
    };

    return redact(value);
  }
}
