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
var ExecutionWorkerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionWorkerService = void 0;
const common_1 = require("@nestjs/common");
const events_1 = require("../core/events");
const rule_engine_service_1 = require("./rule-engine.service");
const action_executor_service_1 = require("./action-executor.service");
const execution_logger_service_1 = require("./execution-logger.service");
let ExecutionWorkerService = ExecutionWorkerService_1 = class ExecutionWorkerService {
    eventBus;
    ruleEngine;
    actionExecutor;
    loggerService;
    logger = new common_1.Logger(ExecutionWorkerService_1.name);
    constructor(eventBus, ruleEngine, actionExecutor, loggerService) {
        this.eventBus = eventBus;
        this.ruleEngine = ruleEngine;
        this.actionExecutor = actionExecutor;
        this.loggerService = loggerService;
    }
    onModuleInit() {
        this.eventBus.on('*', (event) => this.processEvent(event));
        this.logger.log('Execution worker initialized and listening for automation events');
    }
    async processEvent(event) {
        const startTime = Date.now();
        const schoolId = event.payload?.schoolId;
        if (!schoolId) {
            this.logger.debug(`Event "${event.eventType}" has no schoolId in payload, skipping`);
            return;
        }
        try {
            const matchedRules = await this.ruleEngine.evaluateEvent({
                eventType: event.eventType,
                payload: event.payload,
                schoolId,
                timestamp: event.timestamp,
            });
            for (const rule of matchedRules) {
                const ruleStartTime = Date.now();
                try {
                    const actions = rule.actions;
                    const results = await this.actionExecutor.executeActions(actions, {
                        ...event,
                        schoolId,
                    });
                    await this.loggerService.logExecution({
                        schoolId,
                        ruleId: rule.id,
                        ruleName: rule.name,
                        event: { ...event, schoolId },
                        results,
                        executionTimeMs: Date.now() - ruleStartTime,
                    });
                    this.logger.log(`Rule "${rule.name}" processed for event ${event.eventType}: ${results.filter((r) => r.success).length}/${results.length} actions succeeded`);
                }
                catch (err) {
                    this.logger.error(`Rule ${rule.id} execution failed: ${err.message}`);
                    await this.loggerService.logExecution({
                        schoolId,
                        ruleId: rule.id,
                        ruleName: rule.name,
                        event: { ...event, schoolId },
                        results: [],
                        executionTimeMs: Date.now() - ruleStartTime,
                    });
                }
            }
        }
        catch (err) {
            this.logger.error(`Event processing failed for ${event.eventType}: ${err.message}`);
        }
    }
};
exports.ExecutionWorkerService = ExecutionWorkerService;
exports.ExecutionWorkerService = ExecutionWorkerService = ExecutionWorkerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [events_1.EventBusService,
        rule_engine_service_1.RuleEngineService,
        action_executor_service_1.ActionExecutorService,
        execution_logger_service_1.ExecutionLoggerService])
], ExecutionWorkerService);
//# sourceMappingURL=execution-worker.service.js.map