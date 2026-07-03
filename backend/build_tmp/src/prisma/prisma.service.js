"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const client_2 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
require("dotenv/config");
function parsePositiveInt(value, fallback) {
    if (!value)
        return fallback;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
let PrismaService = class PrismaService extends client_2.PrismaClient {
    pool;
    constructor() {
        const connectionString = process.env.DATABASE_POOL_URL || process.env.DATABASE_URL;
        if (!connectionString) {
            throw new Error('DATABASE_POOL_URL or DATABASE_URL is not set');
        }
        const poolMax = parsePositiveInt(process.env.DATABASE_POOL_MAX, 25);
        const connectionTimeoutMillis = parsePositiveInt(process.env.DATABASE_POOL_CONNECTION_TIMEOUT_MS, 5000);
        const idleTimeoutMillis = parsePositiveInt(process.env.DATABASE_POOL_IDLE_TIMEOUT_MS, 30000);
        const pool = new pg_1.Pool({
            connectionString,
            max: poolMax,
            connectionTimeoutMillis,
            idleTimeoutMillis,
            allowExitOnIdle: process.env.NODE_ENV !== 'production',
        });
        const adapter = new adapter_pg_1.PrismaPg(pool);
        super({ adapter });
        this.pool = pool;
    }
    async onModuleInit() {
        await this.$connect();
        await this.ensureRoleEnumValues();
    }
    async onModuleDestroy() {
        await this.$disconnect();
        await this.pool.end();
    }
    async ensureRoleEnumValues() {
        await this.$executeRaw(client_1.Prisma.sql `ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'IT_MANAGER'`);
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map