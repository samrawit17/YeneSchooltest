import { PrismaClient, PlanTier } from '@prisma/client';

const prisma = new PrismaClient();

const defaultPlans = [
  {
    name: 'Core Plan',
    tier: PlanTier.CORE,
    description: 'Essential features for basic school management',
    features: [
      'USER_MANAGEMENT',
      'BASIC_REPORTS',
      'NOTIFICATIONS',
      'SCHOOL_PROFILE',
    ],
  },
  {
    name: 'Standard Plan',
    tier: PlanTier.STANDARD,
    description: 'Complete school management with essential integrations',
    features: [
      'USER_MANAGEMENT',
      'BASIC_REPORTS',
      'NOTIFICATIONS',
      'SCHOOL_PROFILE',
      'ATTENDANCE_TRACKING',
      'GRADE_MANAGEMENT',
      'TIMETABLE_MANAGEMENT',
      'EXAM_MANAGEMENT',
      'FINANCE_MANAGEMENT',
      'HR_MANAGEMENT',
      'PARENT_PORTAL',
      'MESSAGING',
      'ANNOUNCEMENTS',
      'DOCUMENT_MANAGEMENT',
    ],
  },
  {
    name: 'Ultimate Plan',
    tier: PlanTier.ULTIMATE,
    description: 'Full-featured platform with advanced capabilities',
    features: [
      'USER_MANAGEMENT',
      'BASIC_REPORTS',
      'NOTIFICATIONS',
      'SCHOOL_PROFILE',
      'ATTENDANCE_TRACKING',
      'GRADE_MANAGEMENT',
      'TIMETABLE_MANAGEMENT',
      'EXAM_MANAGEMENT',
      'FINANCE_MANAGEMENT',
      'HR_MANAGEMENT',
      'PARENT_PORTAL',
      'MESSAGING',
      'ANNOUNCEMENTS',
      'DOCUMENT_MANAGEMENT',
      'ADVANCED_ANALYTICS',
      'CUSTOM_BRANDING',
      'API_ACCESS',
      'BULK_OPERATIONS',
      'PRIORITY_SUPPORT',
      'CUSTOM_INTEGRATIONS',
      'ADVANCED_REPORTING',
      'DATA_EXPORT',
    ],
  },
];

async function main() {
  console.log('Starting subscription seed...');

  for (const plan of defaultPlans) {
    const existingPlan = await prisma.plan.findUnique({
      where: { tier: plan.tier },
    });

    if (existingPlan) {
      console.log(`Plan ${plan.tier} already exists, updating...`);
      await prisma.plan.update({
        where: { id: existingPlan.id },
        data: {
          name: plan.name,
          description: plan.description,
          features: plan.features,
        },
      });
    } else {
      console.log(`Creating plan ${plan.tier}...`);
      await prisma.plan.create({
        data: plan,
      });
    }
  }

  console.log('Assigning ULTIMATE plan to school-001...');
  const ultimatePlan = await prisma.plan.findUnique({
    where: { tier: PlanTier.ULTIMATE },
  });

  if (ultimatePlan) {
    await prisma.school.update({
      where: { id: 'school-001' },
      data: {
        planId: ultimatePlan.id,
        planAssignedAt: new Date(),
      },
    });
    console.log('Successfully assigned ULTIMATE plan to school-001.');
  }

  console.log('Subscription seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding subscription data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
