"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const bcrypt = __importStar(require("bcrypt"));
const default_permissions_constant_1 = require("../src/auth/constants/default-permissions.constant");
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
}
const pool = new pg_1.Pool({
    connectionString,
    max: Number.parseInt(process.env.DATABASE_SEED_POOL_MAX || '2', 10),
    connectionTimeoutMillis: Number.parseInt(process.env.DATABASE_POOL_CONNECTION_TIMEOUT_MS || '5000', 10),
    idleTimeoutMillis: Number.parseInt(process.env.DATABASE_POOL_IDLE_TIMEOUT_MS || '30000', 10),
    allowExitOnIdle: true,
});
const prisma = new client_1.PrismaClient({ adapter: new adapter_pg_1.PrismaPg(pool) });
const SUPERADMIN_EMAIL = 'lemari1121@gmail.com';
const SUPERADMIN_PASSWORD = process.env.SEED_SUPERADMIN_PASSWORD;
if (!SUPERADMIN_PASSWORD) {
    throw new Error('SEED_SUPERADMIN_PASSWORD is required for seeding');
}
function permissionMeta(name) {
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
    const permissionNames = Array.from(new Set(Object.values(default_permissions_constant_1.DEFAULT_ROLE_PERMISSIONS).flat())).sort();
    console.log(`Seeding ${permissionNames.length} permissions...`);
    for (const permissionName of permissionNames) {
        await prisma.permission.upsert({
            where: { name: permissionName },
            update: permissionMeta(permissionName),
            create: permissionMeta(permissionName),
        });
    }
    console.log('Seeding role permissions...');
    for (const [role, permissions] of Object.entries(default_permissions_constant_1.DEFAULT_ROLE_PERMISSIONS)) {
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
                        role: role,
                        permissionId: permission.id,
                    },
                },
                update: {},
                create: {
                    role: role,
                    permissionId: permission.id,
                },
            });
        }
    }
    const password = await bcrypt.hash(SUPERADMIN_PASSWORD, 12);
    const user = await prisma.user.upsert({
        where: { email: SUPERADMIN_EMAIL },
        update: {
            name: 'YeneSchool Superadmin',
            role: client_1.Role.SUPER_ADMIN,
            isActive: true,
            schoolId: null,
            password,
            mustChangePassword: false,
            username: SUPERADMIN_EMAIL,
        },
        create: {
            email: SUPERADMIN_EMAIL,
            username: SUPERADMIN_EMAIL,
            name: 'YeneSchool Superadmin',
            role: client_1.Role.SUPER_ADMIN,
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
    console.log('Seeded superadmin password from SEED_SUPERADMIN_PASSWORD');
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
//# sourceMappingURL=seed.js.map