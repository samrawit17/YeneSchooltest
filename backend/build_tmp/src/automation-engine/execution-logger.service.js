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
exports.ExecutionLoggerService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ExecutionLoggerService = class ExecutionLoggerService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async logExecution(params) {
        const allSucceeded = params.results.every((r) => r.success);
        await this.prisma.automationExecutionLog.create({
            data: {
                schoolId: params.schoolId,
                ruleId: params.ruleId,
                ruleName: params.ruleName,
                eventType: params.event.eventType,
                eventPayload: params.event.payload,
                status: allSucceeded ? 'success' : 'failed',
                executedActions: params.results,
                errorMessage: allSucceeded
                    ? null
                    : params.results
                        .filter((r) => !r.success)
                        .map((r) => r.message)
                        .join('; '),
                executionTimeMs: params.executionTimeMs,
            },
        });
    }
};
exports.ExecutionLoggerService = ExecutionLoggerService;
exports.ExecutionLoggerService = ExecutionLoggerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ExecutionLoggerService);
//# sourceMappingURL=execution-logger.service.js.map