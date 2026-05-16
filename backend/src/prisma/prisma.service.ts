import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;

  constructor() {
    const connectionString =
      process.env.DATABASE_POOL_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_POOL_URL or DATABASE_URL is not set');
    }

    const poolMax = parsePositiveInt(process.env.DATABASE_POOL_MAX, 25);
    const connectionTimeoutMillis = parsePositiveInt(
      process.env.DATABASE_POOL_CONNECTION_TIMEOUT_MS,
      5000,
    );
    const idleTimeoutMillis = parsePositiveInt(
      process.env.DATABASE_POOL_IDLE_TIMEOUT_MS,
      30000,
    );

    const pool = new Pool({
      connectionString,
      max: poolMax,
      connectionTimeoutMillis,
      idleTimeoutMillis,
      allowExitOnIdle: process.env.NODE_ENV !== 'production',
    });

    const adapter = new PrismaPg(pool);
    super({ adapter } as any);
    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
    await this.ensureRoleEnumValues();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }

  private async ensureRoleEnumValues() {
    await this.$executeRaw(
      Prisma.sql`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'IT_MANAGER'`,
    );
  }
}
