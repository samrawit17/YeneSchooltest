import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { DEFAULT_ROLE_PERMISSIONS } from '../src/auth/constants/default-permissions.constant';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({
  connectionString,
  max: Number.parseInt(process.env.DATABASE_SEED_POOL_MAX || '2', 10),
  connectionTimeoutMillis: Number.parseInt(
    process.env.DATABASE_POOL_CONNECTION_TIMEOUT_MS || '5000',
    10,
  ),
  idleTimeoutMillis: Number.parseInt(
    process.env.DATABASE_POOL_IDLE_TIMEOUT_MS || '30000',
    10,
  ),
  allowExitOnIdle: true,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) } as any);

const SUPERADMIN_EMAIL = 'lemari1121@gmail.com';
const SUPERADMIN_PASSWORD = process.env.SEED_SUPERADMIN_PASSWORD || '12345678';
const DEMO_ADMIN_EMAIL = process.env.SEED_DEMO_ADMIN_EMAIL || 'hh11@gmail.com';
const DEMO_ADMIN_PASSWORD = process.env.SEED_DEMO_ADMIN_PASSWORD || 'admin123';

function permissionMeta(name: string) {
  const [module, ...actionParts] = name.split(':');
  const action = actionParts.join(':') || name;
  return {
    name,
    module,
    action,
    description: `${action.replace(/_/g, ' ')} ${module.replace(/_/g, ' ')}`,
  };
}

async function main() {
  const permissionNames = Array.from(
    new Set(Object.values(DEFAULT_ROLE_PERMISSIONS).flat()),
  ).sort();

  console.log(`Seeding ${permissionNames.length} permissions...`);
  for (const permissionName of permissionNames) {
    await prisma.permission.upsert({
      where: { name: permissionName },
      update: permissionMeta(permissionName),
      create: permissionMeta(permissionName),
    });
  }

  console.log('Seeding role permissions...');
  for (const [role, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    for (const permissionName of permissions) {
      const permission = await prisma.permission.findUnique({
        where: { name: permissionName },
        select: { id: true },
      });

      if (!permission) {
        throw new Error(`Permission ${permissionName} was not seeded`);
      }

      await prisma.rolePermission.upsert({
        where: {
          role_permissionId: {
            role: role as Role,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          role: role as Role,
          permissionId: permission.id,
        },
      });
    }
  }

  const password = await bcrypt.hash(SUPERADMIN_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: SUPERADMIN_EMAIL },
    update: {
      name: 'Lemari Superadmin',
      role: Role.SUPER_ADMIN,
      isActive: true,
      schoolId: null,
      password,
      mustChangePassword: false,
      username: SUPERADMIN_EMAIL,
    },
    create: {
      email: SUPERADMIN_EMAIL,
      username: SUPERADMIN_EMAIL,
      name: 'Lemari Superadmin',
      role: Role.SUPER_ADMIN,
      isActive: true,
      schoolId: null,
      password,
      mustChangePassword: false,
    },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      isActive: true,
      schoolId: true,
    },
  });

  console.log('Seeded superadmin:', user);

  const demoSchool = await prisma.school.upsert({
    where: { email: 'demo-school@lemarisms.local' },
    update: {
      name: 'Demo School',
      isActive: true,
      timezone: 'Africa/Addis_Ababa',
    },
    create: {
      name: 'Demo School',
      email: 'demo-school@lemarisms.local',
      phone: '+251900000000',
      address: 'Addis Ababa',
      timezone: 'Africa/Addis_Ababa',
      isActive: true,
      code: 'DEMO',
      enrollmentKey: 'demo-school',
    },
    select: { id: true, name: true, email: true },
  });

  const demoAdminPassword = await bcrypt.hash(DEMO_ADMIN_PASSWORD, 12);
  const demoAdmin = await prisma.user.upsert({
    where: { email: DEMO_ADMIN_EMAIL },
    update: {
      username: DEMO_ADMIN_EMAIL,
      name: 'Demo School Admin',
      role: Role.ADMIN,
      schoolId: demoSchool.id,
      password: demoAdminPassword,
      isActive: true,
      mustChangePassword: false,
    },
    create: {
      email: DEMO_ADMIN_EMAIL,
      username: DEMO_ADMIN_EMAIL,
      name: 'Demo School Admin',
      role: Role.ADMIN,
      schoolId: demoSchool.id,
      password: demoAdminPassword,
      isActive: true,
      mustChangePassword: false,
    },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      isActive: true,
      schoolId: true,
    },
  });

  console.log('Seeded demo school:', demoSchool);
  console.log('Seeded demo admin:', demoAdmin);
  console.log(`Seeded permissions: ${permissionNames.length}`);
  console.log(`Temporary password: ${SUPERADMIN_PASSWORD}`);
  console.log(`Demo admin password: ${DEMO_ADMIN_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
