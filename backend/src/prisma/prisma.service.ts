import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    super({ adapter } as any);
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
