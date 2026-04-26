import { PrismaClient, PlanTier } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Assigning ULTIMATE plan to Springfield High School (school-001)...');

  const ultimatePlan = await prisma.plan.findUnique({
    where: { tier: PlanTier.ULTIMATE },
  });

  if (!ultimatePlan) {
    console.error('ULTIMATE plan not found. Please run seed-subscription first.');
    return;
  }

  await prisma.school.update({
    where: { id: 'school-001' },
    data: {
      planId: ultimatePlan.id,
      planAssignedAt: new Date(),
    },
  });

  console.log('Successfully assigned ULTIMATE plan to school-001.');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
