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
  console.log(`Seeded permissions: ${permissionNames.length}`);
  console.log(`Temporary password: ${SUPERADMIN_PASSWORD}`);
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
