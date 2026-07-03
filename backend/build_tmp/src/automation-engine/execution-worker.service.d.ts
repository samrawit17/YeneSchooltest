import { OnModuleInit } from '@nestjs/common';
import { EventBusService, AppEvent } from '../core/events';
import { RuleEngineService } from './rule-engine.service';
import { ActionExecutorService } from './action-executor.service';
import { ExecutionLoggerService } from './execution-logger.service';
export declare class ExecutionWorkerService implements OnModuleInit {
    private readonly eventBus;
    private readonly ruleEngine;
    private readonly actionExecutor;
    private readonly loggerService;
    private readonly logger;
    constructor(eventBus: EventBusService, ruleEngine: RuleEngineService, actionExecutor: ActionExecutorService, loggerService: ExecutionLoggerService);
    onModuleInit(): void;
    processEvent(event: AppEvent): Promise<void>;
}
