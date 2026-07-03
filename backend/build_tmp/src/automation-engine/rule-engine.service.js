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
var RuleEngineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleEngineService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let RuleEngineService = RuleEngineService_1 = class RuleEngineService {
    prisma;
    logger = new common_1.Logger(RuleEngineService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async evaluateEvent(event) {
        const rules = await this.prisma.automationRule.findMany({
            where: {
                schoolId: event.schoolId,
                eventTrigger: event.eventType,
                isActive: true,
            },
        });
        const matched = [];
        for (const rule of rules) {
            try {
                const conditions = rule.conditions;
                const passed = conditions ? this.evaluateConditions(conditions, event.payload) : true;
                if (passed) {
                    matched.push(rule);
                }
            }
            catch (err) {
                this.logger.error(`Error evaluating rule ${rule.id}: ${err.message}`);
            }
        }
        return matched;
    }
    evaluateConditions(conditionGroup, payload) {
        if (!conditionGroup || !conditionGroup.conditions || conditionGroup.conditions.length === 0) {
            return true;
        }
        const operator = conditionGroup.operator || 'AND';
        const results = conditionGroup.conditions.map((condition) => {
            if ('operator' in condition && 'conditions' in condition) {
                return this.evaluateConditions(condition, payload);
            }
            return this.evaluateSingleCondition(condition, payload);
        });
        return operator === 'AND' ? results.every(Boolean) : results.some(Boolean);
    }
    evaluateSingleCondition(condition, payload) {
        const actualValue = this.resolveField(condition.field, payload);
        switch (condition.operator) {
            case 'eq':
                return actualValue == condition.value;
            case 'neq':
                return actualValue != condition.value;
            case 'gt':
                return Number(actualValue) > Number(condition.value);
            case 'gte':
                return Number(actualValue) >= Number(condition.value);
            case 'lt':
                return Number(actualValue) < Number(condition.value);
            case 'lte':
                return Number(actualValue) <= Number(condition.value);
            case 'contains':
                return String(actualValue).toLowerCase().includes(String(condition.value).toLowerCase());
            case 'not_contains':
                return !String(actualValue).toLowerCase().includes(String(condition.value).toLowerCase());
            default:
                return false;
        }
    }
    resolveField(field, payload) {
        return field.split('.').reduce((obj, key) => (obj != null ? obj[key] : undefined), payload);
    }
};
exports.RuleEngineService = RuleEngineService;
exports.RuleEngineService = RuleEngineService = RuleEngineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RuleEngineService);
//# sourceMappingURL=rule-engine.service.js.map