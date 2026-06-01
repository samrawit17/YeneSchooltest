import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_POOL_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const activeYear = await prisma.academicYear.findFirst({
    where: { isActive: true },
    include: { terms: true }
  });
  console.log('Active Academic Year:', JSON.stringify(activeYear, null, 2));

  const now = new Date();
  const currentTerm = await prisma.term.findFirst({
    where: {
      startDate: { lte: now },
      endDate: { gte: now },
    },
    include: { academicYear: true }
  });
  console.log('Current Term by Date:', JSON.stringify(currentTerm, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
