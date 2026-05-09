import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const pooledDatabaseUrl = process.env.DATABASE_POOL_URL;

    super(
      pooledDatabaseUrl
        ? {
            datasources: {
              db: {
                url: pooledDatabaseUrl,
              },
            },
          }
        : undefined,
    );
  }

  async onModuleInit() {
    await this.$connect();
    await this.ensureRoleEnumValues();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async ensureRoleEnumValues() {
    await this.$executeRaw(
      Prisma.sql`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'IT_MANAGER'`,
    );
  }
}
