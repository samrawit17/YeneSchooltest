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
  const userCount = await prisma.user.count();
  const classes = await prisma.class.findMany({
    select: { id: true, name: true, grade: true }
  });
  const sections = await prisma.section.findMany({
    select: { id: true, name: true, classId: true }
  });
  const students = await prisma.studentClass.count();

  console.log('Database Stats:');
  console.log('Total Users:', userCount);
  console.log('Total StudentClasses:', students);
  console.log('Classes:', classes);
  console.log('Sections:', sections);

  if (userCount > 0) {
    const roles = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true }
    });
    console.log('Users by role:', roles);

    const firstFewUsers = await prisma.user.findMany({
      take: 10,
      select: { id: true, email: true, username: true, role: true }
    });
    console.log('First 10 users:', firstFewUsers);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
