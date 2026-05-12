import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const pooledDatabaseUrl = process.env.DATABASE_POOL_URL;
    const url = pooledDatabaseUrl || process.env.DATABASE_URL;
    const adapter = new PrismaPg(url || 'postgresql://hanania:Han271619.@localhost:5432/sms_db');

    super({ adapter });
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
